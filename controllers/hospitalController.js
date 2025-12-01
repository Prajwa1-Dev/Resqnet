// controllers/hospitalController.js

const Emergency = require("../models/Emergency");
const Hospital = require("../models/Hospital");
const Ambulance = require("../models/Ambulance");
const notifier = require("../utils/notifier");

// ============================================================
// 🏥 HOSPITAL DASHBOARD
// ============================================================
exports.getDashboard = async (req, res) => {
  try {
    const hospitalId = req.params.id;

    const emergencies = await Emergency.find({
      assignedHospital: hospitalId,
      status: { $in: ["Pending", "Dispatched", "OnRoute", "Arrived"] },
    })
      .populate("assignedHospital")
      .populate("assignedAmbulance")
      .sort({ createdAt: -1 });

    const hospital = await Hospital.findById(hospitalId);

    return res.render("hospital/dashboard", {
      title: "Hospital Dashboard",
      hospital,
      emergencies,
    });
  } catch (err) {
    console.error("❌ Error loading hospital dashboard:", err);
    return res.status(500).send("Server Error");
  }
};

// ============================================================
// ✅ ACCEPT EMERGENCY
// ============================================================
exports.acceptEmergency = async (req, res) => {
  try {
    const { id } = req.params;

    const emergency = await Emergency.findById(id)
      .populate("assignedAmbulance")
      .populate("assignedHospital");

    if (!emergency) return res.status(404).send("Emergency not found");

    emergency.status = "OnRoute";
    emergency.updatedAt = new Date();
    await emergency.save();

    // 🔊 Broadcast normalized status update everywhere
    notifier.broadcastStatusUpdate(emergency);

    return res.redirect(
      `/hospital/dashboard/${emergency.assignedHospital._id}`
    );
  } catch (err) {
    console.error("❌ Accept Emergency Error:", err);
    return res.status(500).send("Server Error");
  }
};

// ============================================================
// ❌ REJECT EMERGENCY (AUTO REASSIGN)
// ============================================================
exports.rejectEmergency = async (req, res) => {
  try {
    const { id } = req.params;

    let emergency = await Emergency.findById(id)
      .populate("assignedHospital")
      .populate("assignedAmbulance");

    if (!emergency) return res.status(404).send("Emergency not found");

    // Mark as rejected
    emergency.status = "Rejected";
    emergency.updatedAt = new Date();
    await emergency.save();

    // =============================
    // 🔁 AUTO-REASSIGN NEW HOSPITAL
    // =============================
    const newHospital = await Hospital.findOne({
      _id: { $ne: emergency.assignedHospital._id },
    });

    if (newHospital) {
      emergency.assignedHospital = newHospital._id;
      emergency.status = "Dispatched";
      await emergency.save();
    }

    // =============================
    // 🔊 SOCKET BROADCASTS
    // =============================

    // Notify the new hospital
    if (newHospital) {
      notifier.broadcastToRoom(
        newHospital._id.toString(),
        "new-alert",
        emergency
      );
    }

    // Broadcast normalized status update everywhere
    notifier.broadcastStatusUpdate(emergency);

    return res.redirect(
      `/hospital/dashboard/${
        newHospital ? newHospital._id : emergency.assignedHospital._id
      }`
    );
  } catch (err) {
    console.error("❌ Reject Emergency Error:", err);
    return res.status(500).send("Server Error");
  }
};

// ============================================================
// 🛏️ UPDATE BED STATUS
// ============================================================
exports.updateBedStatus = async (req, res) => {
  try {
    const hospitalId = req.params.id || req.body.hospitalId;
    const { availableBeds } = req.body;

    const hospital = await Hospital.findByIdAndUpdate(
      hospitalId,
      { availableBeds, updatedAt: new Date() },
      { new: true }
    );

    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    return res.json({
      message: "Bed availability updated",
      hospital,
    });
  } catch (err) {
    console.error("❌ Error updating bed status:", err);
    return res.status(500).json({ message: "Server Error" });
  }
};
