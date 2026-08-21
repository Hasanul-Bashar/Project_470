const mongoose = require('mongoose');

const ListingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    amenities: [{ type: String }],
    price: { type: Number, required: true },
    size:  { type: Number, default: null }, // optional: square footage (sqft) for comparison tool
    photos: [{ type: String }],

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

    bookedDates: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.models.Listing || mongoose.model('Listing', ListingSchema);
