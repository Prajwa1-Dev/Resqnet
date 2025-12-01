const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['citizen', 'volunteer', 'hospital', 'ambulance', 'admin'],
      default: 'citizen',
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// 🔐 Pre-save hook to hash password before saving
UserSchema.pre('save', async function (next) {
  try {
    // Only hash if password is modified or new
    if (!this.isModified('password')) return next();

    // Generate salt and hash
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

    next();
  } catch (error) {
    next(error);
  }
});

// ✅ Custom method for password validation
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
