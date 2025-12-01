
const express = require('express');
const router = express.Router();

// GET /dashboard
router.get('/dashboard', (req, res) => {
  res.render('user/dashboard', {
    title: 'User Dashboard',   // <== Fixes main.ejs 500 error
    pageTitle: 'User Dashboard',
    totalEmergencies: 12,
    activeVolunteers: 5,
    nearbyHospitals: 3
  });
});


module.exports = router;

