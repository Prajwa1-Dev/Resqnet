const mongoose = require("mongoose");

const HospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    address: { type: String, required: true },
    contactNumber: { type: String, required: true },

    status: {
      type: String,
      enum: ["online", "offline"],
      default: "online",
    },

    availableBeds: {
      type: Number,
      default: 10,
    },

    maxAmbulanceCapacity: {
      type: Number,
      default: 5,
    },

    currentlyAssignedAmbulances: {
      type: Number,
      default: 0,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },
  },
  { timestamps: true }
);

// Geo index
HospitalSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Hospital", HospitalSchema);
