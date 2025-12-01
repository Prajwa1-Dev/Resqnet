const mongoose = require("mongoose");

const EmergencySchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, "Description is required"],
    trim: true,
  },

  guestContact: {
    type: String,
    required: [true, "Contact information is required"],
    trim: true,
  },

  severity: {
    type: String,
    enum: ["Low", "Medium", "High"],
    default: "Low",
  },

  // Emergency workflow state
  status: {
    type: String,
    enum: [
      "Pending", // Report created, but no ambulance assigned
      "Dispatched", // Ambulance assigned
      "OnRoute", // Ambulance moving
      "Arrived", // Ambulance reached spot
      "Admitted", // Patient admitted to hospital
      "Resolved", // Legacy closed state
      "Completed", // Used by ambulance UI
      "Rejected", // Used by hospital reject flow
    ],
    default: "Pending",
  },

  trackingToken: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },

  assignedHospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hospital",
    default: null,
  },

  assignedAmbulance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ambulance",
    default: null,
  },

  aiSummary: {
    type: String,
    default: null,
  },

  eta: {
    type: String,
    default: null,
  },

  // This helps differentiate real assignment vs demo-force assignment
  forceAssigned: {
    type: Boolean,
    default: false,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Geospatial Index
EmergencySchema.index({ location: "2dsphere" });

// Auto-update timestamp
EmergencySchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Emergency", EmergencySchema);
