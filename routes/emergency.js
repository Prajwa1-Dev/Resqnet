// routes/emergency.js

const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const multer = require("multer");
const path = require("path");

const emergencyController = require("../controllers/emergencyController");

// Middleware (optional)
const { authenticateUser, authorizeRole } = require("../middleware/authMiddleware");

// -----------------------------
// 📦 Multer (for optional media)
// -----------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/emergencies/"),
  filename: (req, file, cb) => {
    const unique =
      `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|mp4/;
    const ext = path.extname(file.originalname).toLowerCase();
    allowed.test(ext) ? cb(null, true) : cb(new Error("Invalid file type"));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

// -----------------------------
// 🚨 Citizen Emergency Report
// -----------------------------
router.post(
  "/report",
  upload.single("media"),
  [
    body("description").notEmpty(),
    body("latitude").notEmpty(),
    body("longitude").notEmpty(),
    body("guestContact").notEmpty(),
  ],
  emergencyController.createEmergency
);

// -----------------------------
// 🛰️ Tracking Page (via Tracking Token)
// -----------------------------
router.get("/track/:token", emergencyController.showTrackingPage);

// -----------------------------
// 🧠 AI Summary Update
// -----------------------------
router.post(
  "/ai/update",
  authenticateUser,
  authorizeRole(["admin", "ai"]),
  emergencyController.updateAISummaryAndPriority
);

// -----------------------------
// 📋 Admin: Get All Emergencies
// -----------------------------
router.get(
  "/all",
  authenticateUser,
  authorizeRole(["admin", "control"]),
  emergencyController.getAllEmergencies
);

module.exports = router;
