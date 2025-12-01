// controllers/adminController.js

const Emergency = require("../models/Emergency");
const Hospital = require("../models/Hospital");
const Ambulance = require("../models/Ambulance");
const notifier = require("../utils/notifier");

// ============================================================
// 🛰️ CONTROL CENTER DASHBOARD (MAIN PAGE)
// ============================================================
exports.showDashboard = async (req, res) => {
  try {
    const emergencies = await Emergency.find()
      .sort({ createdAt: -1 })
      .populate("assignedHospital")
      .populate("assignedAmbulance");

    const hospitals = await Hospital.find();
    const ambulances = await Ambulance.find();

    res.render("admin/dashboard", {
      title: "Control Center",
      emergencies,
      hospitals,
      ambulances,
    });
  } catch (err) {
    console.error("❌ Error loading dashboard:", err);
    res.status(500).send("Server Error Loading Dashboard");
  }
};

// ============================================================
// 📡 REAL-TIME DASHBOARD DATA API
// ============================================================
exports.fetchDashboardData = async (req, res) => {
  try {
    const emergencies = await Emergency.find()
      .sort({ createdAt: -1 })
      .populate("assignedHospital")
      .populate("assignedAmbulance");

    const hospitals = await Hospital.find();
    const ambulances = await Ambulance.find();

    res.json({ emergencies, hospitals, ambulances });
  } catch (err) {
    console.error("❌ Error fetching dashboard data:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ============================================================
// 🔁 MANUAL REASSIGN EMERGENCY
// ============================================================
exports.reassignEmergency = async (req, res) => {
  try {
    const { emergencyId, hospitalId, ambulanceId } = req.body;

    const emergency = await Emergency.findById(emergencyId);

    if (!emergency) {
      return res.status(404).json({ message: "Emergency not found" });
    }

    if (hospitalId) emergency.assignedHospital = hospitalId;
    if (ambulanceId) emergency.assignedAmbulance = ambulanceId;

    emergency.status = "Dispatched";
    emergency.updatedAt = new Date();

    await emergency.save();

    const updated = await Emergency.findById(emergencyId)
      .populate("assignedHospital")
      .populate("assignedAmbulance");

    // 🔊 socket broadcast
    notifier.broadcastToRoom("control-center", "admin-reassign", updated);

    if (updated.assignedHospital)
      notifier.broadcastToRoom(
        updated.assignedHospital._id.toString(),
        "new-alert",
        updated
      );

    if (updated.assignedAmbulance)
      notifier.broadcastToRoom(
        updated.assignedAmbulance._id.toString(),
        "new-dispatch",
        updated
      );

    return res.json({ message: "Reassigned successfully", emergency: updated });
  } catch (err) {
    console.error("❌ Error in reassignEmergency:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ============================================================
// 📋 HOSPITAL + AMBULANCE OPTIONS
// ============================================================
exports.fetchAssignmentOptions = async (req, res) => {
  try {
    const hospitals = await Hospital.find();
    const ambulances = await Ambulance.find();

    res.json({ hospitals, ambulances });
  } catch (err) {
    console.error("❌ Error fetching options:", err);
    res.status(500).json({ message: "Server error" });
  }
};
