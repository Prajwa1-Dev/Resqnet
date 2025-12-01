const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,    // ⭐ Guest reporting enabled
      default: null,
    },

    // ----------------------------
    // 📍 Location
    // ----------------------------
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],     // [longitude, latitude]
        required: true,
      },
    },

    address: {
      type: String,
      default: "Guest Report",
    },

    // ----------------------------
    // 🔥 Emergency Details
    // ----------------------------
    emergencyType: {
      type: String,
      default: "general",   // ⭐ FIXED REQUIRED ERROR
    },

    description: {
      type: String,
      required: true,        // ⭐ Frontend always sends this
    },

    severity: {
      type: String,
      enum: ["low", "moderate", "high", "critical"],
      default: "moderate",
    },

    guestContact: {
      type: String,
      default: null,
    },

    // ----------------------------
    // 📸 Media
    // ----------------------------
    images: {
      type: [String],
      default: [],
    },

    video: {
      type: String,
      default: null,
    },

    // ----------------------------
    // 🚑 Assignments
    // ----------------------------
    assignedAmbulance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ambulance",
      default: null,
    },

    assignedHospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      default: null,
    },

    nearestHospitalDistances: [
      {
        hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital" },
        distance: Number,
      }
    ],

    nearestAmbulanceDistances: [
      {
        ambulanceId: { type: mongoose.Schema.Types.ObjectId, ref: "Ambulance" },
        distance: Number,
      }
    ],

    // ----------------------------
    // 🛡️ Verification
    // ----------------------------
    isVerified: { type: Boolean, default: false },
    verificationScore: { type: Number, default: 0 },

    // ----------------------------
    // 📌 Status
    // ----------------------------
    status: {
      type: String,
      enum: [
        "pending",
        "assigned",
        "enroute",
        "arrived",
        "transporting",
        "completed",
        "cancelled"
      ],
      default: "pending",
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Geo index
ReportSchema.index({ location: "2dsphere" });

// Auto timestamp update
ReportSchema.pre("save", function (next) {
  this.lastUpdated = Date.now();
  next();
});

module.exports = mongoose.model("Report", ReportSchema);
