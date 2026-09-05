const mongoose = require('mongoose');

/**
 * StripeEvent — Idempotency tracking for Stripe webhook events.
 * Stores the event ID of every processed webhook so duplicate
 * deliveries (retries) are silently skipped.
 */
const StripeEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: { type: String, default: '' },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.StripeEvent || mongoose.model('StripeEvent', StripeEventSchema);
