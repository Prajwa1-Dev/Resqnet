const mongoose = require('mongoose');

const VolunteerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contactNumber: { type: String },
  email: { type: String },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  }
}, { timestamps: true });

VolunteerSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Volunteer', VolunteerSchema);
