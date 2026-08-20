const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['maintenance', 'noise', 'payment', 'lease_terms', 'safety', 'other'],
      default: 'other',
    },
    description: { type: String, required: true },
    submittedBy: {
      userId: { type: String, default: 'anonymous' },
      email: { type: String, default: 'anonymous@rentease.com' },
      name: { type: String, default: 'Anonymous User' },
      role: { type: String, default: 'user' },
    },
    targetId: { type: String },
    targetType: { type: String, enum: ['landlord', 'listing', 'tenant', 'platform'], default: 'platform' },
    status: {
      type: String,
      enum: ['Pending', 'In Review', 'Resolved', 'Dismissed'],
      default: 'Pending',
    },
    resolutionNotes: { type: String, default: '' },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Complaint || mongoose.model('Complaint', ComplaintSchema);
