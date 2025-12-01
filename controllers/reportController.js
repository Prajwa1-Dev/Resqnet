// controllers/reportController.js

const crypto = require("crypto");
const Emergency = require("../models/Emergency");
const Hospital = require("../models/Hospital");
const Ambulance = require("../models/Ambulance");
const notifier = require("../utils/notifier");

// -------- Haversine Distance --------
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

exports.createEmergencyReport = async (req, res) => {
  try {
    const { description, latitude, longitude, guestContact } = req.body;

    if (!description || !latitude || !longitude || !guestContact) {
      return res.status(400).json({ message: "All fields required" });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    const trackingToken = crypto.randomBytes(10).toString("hex");

    // ----------------------------- //
    // 1️⃣ Find Nearest OR ANY Hospital
    // ----------------------------- //
    let nearestHospital =
      (await Hospital.findOne({
        location: {
          $nearSphere: {
            $geometry: { type: "Point", coordinates: [lon, lat] },
            $maxDistance: 50_000,
          },
        },
      })) || (await Hospital.findOne());

    // ----------------------------- //
    // 2️⃣ Find Nearest Ambulance (ALWAYS assign at least one)
    // Priority: 1) Available within range, 2) Any available, 3) Nearest regardless of status, 4) Any ambulance
    // ----------------------------- //
    let nearestAmbulance =
      (await Ambulance.findOne({
        status: "available",
        location: {
          $nearSphere: {
            $geometry: { type: "Point", coordinates: [lon, lat] },
            $maxDistance: 50_000,
          },
        },
      })) || (await Ambulance.findOne({ status: "available" }));

    // If no available ambulance, assign nearest ambulance regardless of status
    if (!nearestAmbulance) {
      nearestAmbulance =
        (await Ambulance.findOne({
          location: {
            $nearSphere: {
              $geometry: { type: "Point", coordinates: [lon, lat] },
              $maxDistance: 50_000,
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

    // ----------------------------- //
    // 3️⃣ Create Emergency Record
    // ----------------------------- //
    const emergency = new Emergency({
      description,
      severity: "Medium",
      guestContact,
      trackingToken,
      location: { type: "Point", coordinates: [lon, lat] },
      assignedHospital: nearestHospital?._id || null,
      assignedAmbulance: nearestAmbulance?._id || null,
      // Always set to Dispatched if ambulance is assigned (which should always be true now)
      status: nearestAmbulance ? "Dispatched" : "Pending",
      createdAt: new Date(),
    });

    // ----------------------------- //
    // 4️⃣ Calculate ETA
    // ----------------------------- //
    if (nearestAmbulance && nearestAmbulance.location) {
      const ambLat = nearestAmbulance.location.coordinates[1];
      const ambLon = nearestAmbulance.location.coordinates[0];

      const dist = getDistanceKm(lat, lon, ambLat, ambLon);
      const avgSpeed = 40; // km/h

      emergency.eta = Math.max(1, Math.round((dist / avgSpeed) * 60)) + " min";

      // Mark that this ambulance is now busy with this emergency
      nearestAmbulance.status = "busy";
      // We reuse "assignedReport" to keep track of the current emergency id
      nearestAmbulance.assignedReport = emergency._id;
      await nearestAmbulance.save();
    }

    await emergency.save();

    const populated = await Emergency.findById(emergency._id)
      .populate("assignedHospital")
      .populate("assignedAmbulance");

    // ----------------------------- //
    // 5️⃣ Socket Notifications
    // ----------------------------- //
    notifier.broadcastToRoom("control-center", "new-emergency", populated);

    if (nearestHospital)
      notifier.broadcastToRoom(nearestHospital._id.toString(), "new-alert", populated);

    if (nearestAmbulance)
      notifier.broadcastToRoom(nearestAmbulance._id.toString(), "new-dispatch", populated);

    res.status(200).json({
      message: "Emergency auto-assigned successfully!",
      emergency: populated,
      redirectUrl: `/emergency/track/${trackingToken}`,
    });
  } catch (err) {
    console.error("❌ Error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};
