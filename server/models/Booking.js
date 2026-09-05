const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
    },
    listingTitle: { type: String, required: true },
    listingLocation: { type: String, required: true },

    tenantId:    { type: String, required: true },
    tenantName:  { type: String, required: true },
    tenantEmail: { type: String, required: true },

    landlordId:    { type: String, required: true },
    landlordName:  { type: String, default: '' },
    landlordEmail: { type: String, default: '' },

    dates: [{ type: String, required: true }],

    status: {
      type: String,
      enum: ['pending_landlord', 'pending_admin', 'approved', 'rejected'],
      default: 'pending_landlord',
    },

    // Who rejected and optional reason
    rejectedBy:      { type: String, enum: ['landlord', 'admin', ''], default: '' },
    rejectionReason: { type: String, default: '' },

    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);

