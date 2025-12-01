// -----------------------------
// 🌐 Core Dependencies
// -----------------------------
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
require('dotenv').config();
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const passport = require('passport');
const createError = require('http-errors');

// -----------------------------
// 🛣️ Route Imports
// -----------------------------
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const emergencyRouter = require('./routes/emergency');
const hospitalRouter = require('./routes/hospital');
const ambulanceRouter = require('./routes/ambulance');
const adminRouter = require('./routes/admin');
const reportRouter = require('./routes/reportRoutes'); // Citizen Emergency API

// -----------------------------
// ⚙️ Express App Initialization
// -----------------------------
const app = express();

// -----------------------------
// 🎨 View Engine Setup
// -----------------------------
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// -----------------------------
// ⚙️ Middleware
// -----------------------------
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// -----------------------------
// 🔐 Session Setup
// -----------------------------
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'resqnet-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: 1000 * 60 * 60 * 24,
  },
});
app.use(sessionMiddleware);

// -----------------------------
// 🔑 Passport Authentication
// -----------------------------
require('./config/passport')(passport);
app.use(passport.initialize());
app.use(passport.session());

// -----------------------------
// 🌍 Global Variables for Views
// -----------------------------
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.url = req.originalUrl;
  next();
});

// -----------------------------
// 🧭 ROUTES — ORDER MATTERS!
// -----------------------------
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/emergency', emergencyRouter);
app.use('/hospital', hospitalRouter);
app.use('/ambulance', ambulanceRouter);
app.use('/admin', adminRouter);

// ----------------------------------------------
// ⭐ FIXED: API Routes Mounted Using Clean Structure
// ----------------------------------------------
app.use('/api/report', reportRouter);
// Now your APIs become:
// POST /api/report/create
// POST /api/report/auto-assign/:id
// GET  /api/report/all
// GET  /api/report/:id

// -----------------------------
// 💾 MongoDB Connection
// -----------------------------
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

mongoose.connection.once("open", () => {
  console.log("📌 Ensuring indexes...");
  mongoose.connection.db.command({ ping: 1 });
});

// -----------------------------
// 🚨 404 Handler
// -----------------------------
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ message: 'API endpoint not found.' });
  }

  res.status(404);
  res.render('error', {
    title: '404 Not Found',
    message: 'Page not found.',
  });
});

// -----------------------------
// 🧩 Global Error Handler
// -----------------------------
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message);

  if (req.originalUrl.startsWith('/api/')) {
    return res.status(err.status || 500).json({
      message: err.message || 'Something went wrong.',
    });
  }

  res.status(err.status || 500);
  res.render('error', {
    title: 'Server Error',
    message: err.message,
    error: req.app.get('env') === 'development' ? err : {},
  });
});

// -----------------------------
// 🚀 Export App + Session
// -----------------------------
module.exports = { app, sessionMiddleware };
