const express = require("express");
const router = express.Router();

const ambulanceController = require("../controllers/ambulanceController");
const Ambulance = require("../models/Ambulance");
const Emergency = require("../models/Emergency");

// ----------------------------------------------------
// 🚑 SHOW DASHBOARD (IMPORTANT ROUTE)
// ----------------------------------------------------
router.get("/dashboard/:id", ambulanceController.showDashboard);

// ----------------------------------------------------
// 🔄 UPDATE STATUS
// ----------------------------------------------------
router.post("/update-status", ambulanceController.updateStatus);

// ----------------------------------------------------
// 📡 SEND LIVE LOCATION
// ----------------------------------------------------
router.post("/send-location", ambulanceController.sendLiveLocation);

// ----------------------------------------------------
// (OTHER API ROUTES BELOW)
// ----------------------------------------------------

// Register new ambulance
router.post("/register", async (req, res) => {
  try {
    const { driverName, driverPhone, vehicleNumber, latitude, longitude } = req.body;

    const ambulance = new Ambulance({
      driverName,
      driverPhone,
      vehicleNumber,
      location: { type: "Point", coordinates: [longitude, latitude] },
    });

    await ambulance.save();

    res.json({ msg: "Ambulance registered", ambulance });

  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ msg: "Server Error" });
  }
});

// Get all ambulances
router.get("/all", async (req, res) => {
  const ambulances = await Ambulance.find();
  res.json(ambulances);
});

// Get by ID
router.get("/:id", async (req, res) => {
  const amb = await Ambulance.findById(req.params.id);
  res.json(amb);
});

module.exports = router;
