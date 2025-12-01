const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 🔐 Verify JWT token and authenticate user
exports.authenticateUser = (req, res, next) => {
  try {
    const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'resqnet-secret');
    req.user = decoded;
    next();
  } catch (error) {
    console.error('❌ Authentication error:', error);
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

// 🧠 Role-based access control middleware
exports.authorizeRole = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied: insufficient permissions.' });
      }
      next();
    } catch (error) {
      console.error('❌ Authorization error:', error);
      res.status(500).json({ message: 'Internal authorization error.' });
    }
  };
};
