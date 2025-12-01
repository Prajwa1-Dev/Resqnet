const express = require("express");
const router = express.Router();

const Hospital = require("../models/Hospital");
const hospitalController = require("../controllers/hospitalController");

// ----------------------------------
// 🏥 Register hospital
// ----------------------------------
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      address,
      contactNumber,
      email,
      latitude,
      longitude,
      totalBeds,
      availableBeds,
      totalICUBeds,
      availableICUBeds,
      adminUser,
    } = req.body;

    const hospital = new Hospital({
      name,
      address,
      contactNumber,
      email,
      totalBeds,
      availableBeds,
      totalICUBeds,
      availableICUBeds,
      adminUser,
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
    });

    await hospital.save();

    res.json({
      msg: "Hospital registered successfully",
      hospital,
    });
  } catch (err) {
    console.error("Hospital creation error:", err);
    res.status(500).json({ msg: "Server Error" });
  }
});

// ----------------------------------
// 🛏️ Update bed/ICU capacity
// ----------------------------------
router.put("/update-capacity/:id", async (req, res) => {
  try {
    const {
      totalBeds,
      availableBeds,
      totalICUBeds,
      availableICUBeds,
    } = req.body;

    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      {
        totalBeds,
        availableBeds,
        totalICUBeds,
        availableICUBeds,
      },
      { new: true }
    );

    res.json({
      msg: "Capacity updated",
      hospital,
    });
  } catch (err) {
    console.error("Capacity update error:", err);
    res.status(500).json({ msg: "Server Error" });
  }
});

// ----------------------------------
// 📍 Update hospital location
// ----------------------------------
router.put("/update-location/:id", async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      {
        location: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
      },
      { new: true }
    );

    res.json({
      msg: "Location updated",
      hospital,
    });
  } catch (err) {
    console.error("Location update error:", err);
    res.status(500).json({ msg: "Server Error" });
  }
});

// ----------------------------------
// 🟢 Update hospital status (online/offline)
// ----------------------------------
router.put("/update-status/:id", async (req, res) => {
  try {
    const { status } = req.body;

    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    res.json({
      msg: "Hospital status updated",
      hospital,
    });
  } catch (err) {
    console.error("Status update error:", err);
    res.status(500).json({ msg: "Server Error" });
  }
});

// ----------------------------------
// ⭐ Add feedback / rating
// ----------------------------------
router.post("/feedback/:id", async (req, res) => {
  try {
    const { userId, rating, comment } = req.body;

    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return res.status(404).json({ msg: "Hospital not found" });
    }

    // Add feedback entry
    hospital.feedbacks.push({
      userId,
      rating,
      comment,
    });

    // Recalculate average rating
    hospital.totalRatings += 1;
    hospital.averageRating =
      hospital.feedbacks.reduce((sum, x) => sum + x.rating, 0) /
      hospital.totalRatings;

    await hospital.save();

    res.json({
      msg: "Feedback added successfully",
      hospital,
    });
  } catch (err) {
    console.error("Feedback error:", err);
    res.status(500).json({ msg: "Server Error" });
  }
});

// ----------------------------------
// 🏥 Get all hospitals
// ----------------------------------
router.get("/all", async (req, res) => {
  try {
    const hospitals = await Hospital.find();
    res.json(hospitals);
  } catch (err) {
    console.error("Fetch hospitals error:", err);
    res.status(500).json({ msg: "Server Error" });
  }
});

// ----------------------------------
// 🏥 Hospital Dashboard View
// ----------------------------------
router.get("/dashboard/:id", hospitalController.getDashboard);

// ----------------------------------
// 🛏️ Update bed availability (numeric)
// ----------------------------------
router.post("/update-bed-status/:id", hospitalController.updateBedStatus);

// ----------------------------------
// 🏥 Get single hospital
// ----------------------------------
router.get("/:id", async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital)
      return res.status(404).json({ msg: "Hospital not found" });

    res.json(hospital);
  } catch (err) {
    console.error("Fetch hospital error:", err);
    res.status(500).json({ msg: "Server Error" });
  }
});

module.exports = router;
