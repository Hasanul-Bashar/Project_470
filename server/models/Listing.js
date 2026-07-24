const mongoose = require('mongoose');

/**
 * Listing schema — property listings created by Landlords.
 *
 * Team merge note:
 *   Defensive export prevents "Cannot overwrite model" errors when
 *   multiple team files import this module.
 */
const ListingSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    location:    { type: String, required: true, trim: true },
    description: { type: String, required: true },
    amenities:   [{ type: String }],
    price:       { type: Number, required: true },
    photos:      [{ type: String }],

    /** Admin controls this — starts at 'pending' after landlord submits */
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },

    landlordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Defensive export — safe to import across merged team branches
module.exports = mongoose.models.Listing || mongoose.model('Listing', ListingSchema);
