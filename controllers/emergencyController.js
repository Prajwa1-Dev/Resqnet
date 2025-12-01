// controllers/emergencyController.js

const { validationResult } = require("express-validator");
const crypto = require("crypto");
const Emergency = require("../models/Emergency");
const Ambulance = require("../models/Ambulance");
const Hospital = require("../models/Hospital");
const notifier = require("../utils/notifier");

// ----------------------------
// 🌍 Accurate distance calculator
// ----------------------------
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}


// =========================================================
// 🚨 CREATE EMERGENCY + AUTO-ASSIGN (FINAL FIXED VERSION)
// =========================================================
exports.createEmergency = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render("index", {
      title: "Report Emergency",
      errors: errors.array(),
      formData: req.body,
    });
  }

  try {
    const { description, longitude, latitude, guestContact } = req.body;

    const lon = parseFloat(longitude);
    const lat = parseFloat(latitude);

    const geoLocation = { type: "Point", coordinates: [lon, lat] };
    const trackingToken = crypto.randomBytes(16).toString("hex");

    // STEP 1 — Create emergency object
    let emergency = new Emergency({
      description,
      guestContact,
      trackingToken,
      location: geoLocation,
      severity: "Medium",
      status: "Pending",
      createdAt: new Date(),
    });

    // STEP 2 — Find nearest hospital
    const nearestHospital =
      (await Hospital.findOne({
        location: {
          $nearSphere: {
            $geometry: geoLocation,
            $maxDistance: 70000,
          },
        },
      })) || (await Hospital.findOne());

    // STEP 3 — Find nearest ambulance (ALWAYS assign at least one)
    // Priority: 1) Available within range, 2) Any available, 3) Nearest regardless of status, 4) Any ambulance
    let nearestAmbulance =
      (await Ambulance.findOne({
        status: "available",
        location: {
          $nearSphere: {
            $geometry: geoLocation,
            $maxDistance: 70000,
          },
        },
      })) || (await Ambulance.findOne({ status: "available" }));

    // If no available ambulance, assign nearest ambulance regardless of status
    if (!nearestAmbulance) {
      nearestAmbulance =
        (await Ambulance.findOne({
          location: {
            $nearSphere: {
              $geometry: geoLocation,
              $maxDistance: 70000,
            },
          },
        })) || (await Ambulance.findOne());
      
      if (nearestAmbulance) {
        console.log(`⚠️ No available ambulances found. Assigning ${nearestAmbulance.status} ambulance: ${nearestAmbulance.vehicleNumber || nearestAmbulance._id}`);
      }
    }
    
    // Final fallback: if still no ambulance, log error (shouldn't happen if DB has ambulances)
    if (!nearestAmbulance) {
      console.error("❌ CRITICAL: No ambulances found in database! Emergency created without ambulance assignment.");
    }

    // STEP 4 — Assign hospital + ambulance (guaranteed ambulance assignment)
    emergency.assignedHospital = nearestHospital?._id || null;
    emergency.assignedAmbulance = nearestAmbulance?._id || null;

    // Always set to Dispatched if ambulance is assigned (which should always be true now)
    emergency.status = nearestAmbulance ? "Dispatched" : "Pending";

    // STEP 5 — Compute ETA + update ambulance
    if (nearestAmbulance) {
      const ambLat = nearestAmbulance.location.coordinates[1];
      const ambLon = nearestAmbulance.location.coordinates[0];

      const distance = getDistanceKm(lat, lon, ambLat, ambLon);
      const eta = Math.max(1, Math.round((distance / 40) * 60));

      emergency.eta = `${eta} min`;

      // Update ambulance status → busy and link current emergency
      nearestAmbulance.status = "busy";
      // NOTE: "assignedReport" stores the currently assigned EMERGENCY id
      nearestAmbulance.assignedReport = emergency._id;
      await nearestAmbulance.save();
    }

    // STEP 6 — Save Emergency
    await emergency.save();

    // STEP 7 — Populate for dashboard
    emergency = await Emergency.findById(emergency._id)
      .populate("assignedHospital")
      .populate("assignedAmbulance");

    // STEP 8 — Real-time broadcasting (admin + hospital + ambulance)
    notifier.broadcastToRoom("control-center", "new-emergency", emergency);

    if (nearestHospital) {
      notifier.broadcastToRoom(
        nearestHospital._id.toString(),
        "new-alert",
        emergency
      );
    }

    if (nearestAmbulance) {
      notifier.broadcastToRoom(
        nearestAmbulance._id.toString(),
        "new-dispatch",
        emergency
      );
    }

    console.log("🚨 Emergency created:", emergency.trackingToken);

    // Redirect to tracking page
    return res.redirect(`/emergency/track/${trackingToken}`);

  } catch (e) {
    console.error("❌ Emergency creation error:", e);
    res.status(500).render("error", {
      message: "Unexpected server error.",
    });
  }
};


// =========================================================
// 🛰️ TRACKING PAGE
// =========================================================
exports.showTrackingPage = async (req, res) => {
  try {
    const emergency = await Emergency.findOne({
      trackingToken: req.params.token,
    })
      .populate("assignedHospital")
      .populate("assignedAmbulance");

    if (!emergency) {
      return res.status(404).render("error", {
        message: "Invalid or expired tracking link.",
      });
    }

    res.render("track", {
      title: "Live Emergency Tracking",
      emergency,
    });
  } catch (error) {
    console.error("❌ Tracking page load error:", error);
    res.status(500).render("error", {
      message: "Could not load tracking.",
    });
  }
};


// =========================================================
// 🧠 AI SUMMARY UPDATE
// =========================================================
exports.updateAISummaryAndPriority = async (req, res) => {
  try {
    const { emergencyId, aiSummary, priority } = req.body;

    const updated = await Emergency.findByIdAndUpdate(
      emergencyId,
      {
        aiSummary,
        priority,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ message: "Emergency not found" });

    res.json({
      message: "AI summary updated successfully",
      emergency: updated,
    });

  } catch (error) {
    console.error("❌ AI Update Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// =========================================================
// 📋 ADMIN - Get All Emergencies
// =========================================================
exports.getAllEmergencies = async (req, res) => {
  try {
    const emergencies = await Emergency.find()
      .populate("assignedHospital")
      .populate("assignedAmbulance")
      .sort({ createdAt: -1 });

    res.status(200).json(emergencies);

  } catch (error) {
    console.error("❌ Fetch all emergencies error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
