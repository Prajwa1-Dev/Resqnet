// routes/admin.js

const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const Emergency = require('../models/Emergency');

// Auth disabled for Hackathon speed
// const { authenticateUser, authorizeRole } = require('../middleware/authMiddleware');


// -------------------------------------------------------
// 🛰️ ADMIN CONTROL CENTER DASHBOARD (UI PAGE)
// -------------------------------------------------------

router.get(
  '/dashboard',
  // authenticateUser,
  // authorizeRole(['admin', 'control']),
  adminController.showDashboard
);


// -------------------------------------------------------
// 📡 ORIGINAL DASHBOARD DATA ENDPOINT (still supported)
// -------------------------------------------------------

router.get(
  '/data',
  // authenticateUser,
  // authorizeRole(['admin', 'control']),
  adminController.fetchDashboardData
);


// -------------------------------------------------------
// 🆕 NEW ENDPOINT: RETURN ALL EMERGENCIES (FOR TABLE + MAP)
// -------------------------------------------------------

router.get(
  '/all-emergencies',
  // authenticateUser,
  // authorizeRole(['admin', 'control']),
  async (req, res) => {
    try {
      const emergencies = await Emergency.find({})
        .populate('assignedHospital')
        .populate('assignedAmbulance')
        .sort({ createdAt: -1 });

      return res.json(emergencies);
    } catch (err) {
      console.error("❌ Error fetching emergencies:", err);
      res.status(500).json({ error: 'Failed to fetch emergencies' });
    }
  }
);


// -------------------------------------------------------
// 🔁 ADMIN OVERRIDE: REASSIGN AMBULANCE/HOSPITAL
// -------------------------------------------------------

router.post(
  '/reassign',
  // authenticateUser,
  // authorizeRole(['admin', 'control']),
  adminController.reassignEmergency
);


// -------------------------------------------------------
// 🚑🏥 FETCH HOSPITALS + AMBULANCES FOR DROPDOWNS
// -------------------------------------------------------

router.get(
  '/options',
  // authenticateUser,
  // authorizeRole(['admin', 'control']),
  adminController.fetchAssignmentOptions
);


// -------------------------------------------------------
// 🔚 EXPORT ROUTER
// -------------------------------------------------------

module.exports = router;
