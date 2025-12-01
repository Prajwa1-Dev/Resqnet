// controllers/ambulanceController.js

const Emergency = require("../models/Emergency");
const Ambulance = require("../models/Ambulance");
const notifier = require("../utils/notifier");

// ----------------------------------------------------
// 🚑 AMBULANCE DASHBOARD — LIST ASSIGNED EMERGENCIES
// ----------------------------------------------------
exports.showDashboard = async (req, res) => {
  try {
    const ambulanceId = req.params.id;

    // Ensure location field is ALWAYS selected
    const emergencies = await Emergency.find(
      {
        assignedAmbulance: ambulanceId,
        status: { $ne: "Completed" }
      },
      "description status location assignedHospital assignedAmbulance updatedAt createdAt"
    )
      .populate("assignedHospital")
      .populate("assignedAmbulance")
      .lean();

    // Debug log
    console.log("🚑 Dashboard Emergencies:", JSON.stringify(emergencies, null, 2));

    res.render("ambulance/dashboard", {
      title: "Ambulance Dashboard",
      emergencies,
      ambulanceId,
      hospitalId: emergencies[0]?.assignedHospital?._id || null
    });

  } catch (err) {
    console.error("❌ Ambulance Dashboard Error:", err);
    res.status(500).send("Error loading ambulance dashboard");
  }
};

// ----------------------------------------------------
// 🔄 UPDATE STATUS (OnRoute / Arrived / Completed)
// ----------------------------------------------------
exports.updateStatus = async (req, res) => {
  try {
    const { emergencyId, status } = req.body;
    const emergency = await Emergency.findById(emergencyId)
      .populate("assignedHospital")
      .populate("assignedAmbulance");

    if (!emergency) {
      return res.status(404).json({ message: "Emergency not found" });
    }

    emergency.status = status;
    emergency.updatedAt = new Date();
    await emergency.save();

    // Broadcast normalized status-update to admin, hospital, ambulance, track
    notifier.broadcastStatusUpdate(emergency);

    res.json({ message: "Status updated", emergency });

  } catch (err) {
    console.error("❌ Status Update Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ----------------------------------------------------
// 📡 LIVE LOCATION BROADCAST
// ----------------------------------------------------
exports.sendLiveLocation = async (req, res) => {
  try {
    const { emergencyId, lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ message: "Missing coordinates" });
    }

    // Optionally update ambulance location in DB (best effort)
    const emergency = await Emergency.findById(emergencyId)
      .populate("assignedHospital")
      .populate("assignedAmbulance");

    if (emergency && emergency.assignedAmbulance) {
      await Ambulance.findByIdAndUpdate(
        emergency.assignedAmbulance._id,
        {
          location: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          lastUpdatedLocation: new Date(),
        },
        { new: true }
      );
    }

    const payload = {
      emergencyId,
      coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
    };

    // Admin dashboard
    notifier.broadcastToRoom(
      "control-center",
      "ambulance-location-update",
      payload
    );

    // Hospital room
    if (emergency && emergency.assignedHospital) {
      notifier.broadcastToRoom(
        emergency.assignedHospital._id.toString(),
        "ambulance-location-update",
        payload
      );
    }

    // Citizen tracking page
    if (emergency && emergency.trackingToken) {
      notifier.broadcastToRoom(
        emergency.trackingToken,
        "ambulance-location-update",
        payload
      );
    }

    console.log(`📍 LIVE LOCATION → E:${emergencyId} → ${lat}, ${lng}`);

    res.json({ message: "Location sent" });

  } catch (err) {
    console.error("❌ Location Send Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
