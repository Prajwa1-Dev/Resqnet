const express = require("express");
const router = express.Router();

const Report = require("../models/Report");
const { autoAssign } = require("../controllers/autoAssignController");

// ⭐ Multer to read multipart/form-data text fields
const multer = require("multer");
const upload = multer(); // memory storage

// ------------------------------------------------------
// 🆘 CREATE REPORT (Guest Friendly + Working req.body)
// ------------------------------------------------------
router.post("/create", upload.none(), async (req, res) => {
  try {
    const { latitude, longitude, description, guestContact } = req.body;

    if (!latitude || !longitude || !description) {
      return res.status(400).json({
        msg: "Latitude, longitude, and description are required.",
      });
    }

    const report = new Report({
      user: null,                
      emergencyType: "general",  
      severity: "moderate",

      description,
      guestContact: guestContact || null,

      location: {
        type: "Point",
        coordinates: [
          parseFloat(longitude),
          parseFloat(latitude),
        ],
      },

      address: "Guest Report",
      images: [],
      video: null,
    });

    await report.save();

    res.json({
      msg: "Report created successfully",
      report,
    });

  } catch (err) {
    console.error("Error creating report:", err);
    res.status(500).json({ msg: "Server Error" });
  }
});

// ------------------------------------------------------
// ⚡ AUTO ASSIGN
// ------------------------------------------------------
router.post("/auto-assign/:id", autoAssign);

// ------------------------------------------------------
// 📌 GET ALL
// ------------------------------------------------------
router.get("/all", async (req, res) => {
  try {
    const reports = await Report.find()
      .populate("assignedAmbulance")
      .populate("assignedHospital");

    res.json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server Error" });
  }
});

// ------------------------------------------------------
// 📌 GET BY ID
// ------------------------------------------------------
router.get("/:id", async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate("assignedAmbulance")
      .populate("assignedHospital");

    if (!report) {
      return res.status(404).json({ msg: "Report not found" });
    }

    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server Error" });
  }
});

// ------------------------------------------------------
// 📝 UPDATE STATUS
// ------------------------------------------------------
router.put("/update-status/:id", async (req, res) => {
  try {
    const { status } = req.body;

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    res.json({
      msg: "Status updated",
      report,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server Error" });
  }
});

module.exports = router;
