const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },

    role: {
      type: String,
      enum: ['user', 'landlord', 'admin'],
      default: 'user',
    },

    isVerifiedLandlord: { type: Boolean, default: false },

    isOtpVerified: { type: Boolean, default: false },
    otpCode: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },

    isFirstLogin: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
