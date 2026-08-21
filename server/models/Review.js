const mongoose = require('mongoose');

/**
 * Model (M) — Review
 * Handles two review directions:
 *   'property' — tenant reviews a listing after an approved booking
 *   'tenant'   — landlord reviews a tenant after an approved booking
 */
const ReviewSchema = new mongoose.Schema(
  {
    reviewType: {
      type: String,
      enum: ['property', 'tenant'],
      required: true,
    },

    // The user who wrote the review
    authorId:   { type: String, required: true },
    authorName: { type: String, required: true },

    // The subject being reviewed
    // For 'property': targetId = listingId
    // For 'tenant':   targetId = tenantId
    targetId: { type: String, required: true },

    // Optional direct reference to listing (used for property reviews & analytics joins)
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      default: null,
    },

    // The approved booking that qualifies the author to review
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },

    rating:  { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

// Prevent duplicate reviews: one review per (author, booking, reviewType)
ReviewSchema.index({ authorId: 1, bookingId: 1, reviewType: 1 }, { unique: true });

module.exports = mongoose.models.Review || mongoose.model('Review', ReviewSchema);
