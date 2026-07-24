const mongoose = require('mongoose');

/**
 * User schema — shared base for Tenant, Landlord, and Admin roles.
 *
 * Team merge note:
 *   Export uses the defensive pattern so teammates can safely require
 *   this file without triggering Mongoose's "Cannot overwrite model" error.
 */
const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName:  { type: String, required: true, trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:  { type: String, required: true },

    /** 'user' = Tenant, 'landlord' = Landlord, 'admin' = Admin */
    role: {
      type: String,
      enum: ['user', 'landlord', 'admin'],
      default: 'user',
    },

    /** True once an admin approves the landlord account */
    isVerified: { type: Boolean, default: false },

    /** Tracks the full lifecycle of landlord verification */
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// Defensive export — safe to import across merged team branches
module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
