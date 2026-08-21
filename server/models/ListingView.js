const mongoose = require('mongoose');

/**
 * Model (M) — ListingView
 * Lightweight event log for anonymous per-listing view tracking.
 * Records are created when a tenant opens a listing's availability calendar.
 */
const ListingViewSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
      index: true,
    },
    viewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

module.exports = mongoose.models.ListingView || mongoose.model('ListingView', ListingViewSchema);
