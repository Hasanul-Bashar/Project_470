const mongoose = require('mongoose');

const ListingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    amenities: [{ type: String }],
    price: { type: Number, required: true },
    size: { type: Number, default: 1000 }, // square footage (sqft)
    photos: [{ type: String }],

    // Manually Added Nearby Facilities (Schools, Hospitals, Transit, Shopping)
    nearbyFacilities: [
      {
        name: { type: String, required: true },
        category: { type: String, enum: ['Schools', 'Hospitals', 'Transport', 'Shopping', 'Other'], default: 'Schools' },
        distance: { type: String, default: 'Nearby' },
      },
    ],
    
    propertyType: {
      type: String,
      enum: ['Apartment', 'House', 'Sublet', 'Studio', 'Villa', 'Commercial'],
      default: 'Apartment',
    },
    furnishedStatus: {
      type: String,
      enum: ['Furnished', 'Unfurnished', 'Semi-Furnished'],
      default: 'Furnished',
    },

    // Geospatial Coordinates & Neighborhood Polygon Area Tagging
    coordinates: {
      lat: { type: Number, default: 23.777176 },
      lng: { type: Number, default: 90.399452 },
    },
    polygon: [
      {
        lat: { type: Number },
        lng: { type: Number },
      },
    ],
    
    // Spatial Indexing (Geohash & Grid Bucket)
    geohash: { type: String, default: '' },
    gridKey: { type: String, default: '' },

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

