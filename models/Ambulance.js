const mongoose = require("mongoose");

const AmbulanceSchema = new mongoose.Schema(
  {
    driverName: {
      type: String,
      required: true,
    },

    driverPhone: {
      type: String,
      required: true,
    },

    vehicleNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    driverUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },

    lastUpdatedLocation: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["available", "busy", "offline"],
      default: "available",
    },

    assignedHospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      default: null,
    },

    // NOTE:
    // Historically named "assignedReport" but we now store the
    // currently assigned EMERGENCY id here for quick lookup.
    // (ref kept as Report for backward compatibility; we don't
    // rely on populate for this field in the new flow.)
    assignedReport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Report",
      default: null,
    },

    lastCalculatedDistance: {
      type: Number,
      default: 0,
    },

    isVerified: {
      type: Boolean,
      default: true,
    },

    onlineStatus: {
      type: Boolean,
      default: true,
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

AmbulanceSchema.index({ location: "2dsphere" });

AmbulanceSchema.pre("save", function (next) {
  this.lastUpdated = Date.now();
  next();
});

module.exports = mongoose.model("Ambulance", AmbulanceSchema);
