const mongoose = require('mongoose');

/**
 * Complaint schema — filed by users, managed by admins.
 *
 * Team merge note:
 *   Defensive export prevents "Cannot overwrite model" errors when
 *   multiple team files import this module.
 */
const ComplaintSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },

    /** Optional link to a specific listing involved in the dispute */
    relatedListingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      default: null,
    },

    description: { type: String, required: true },

    /** Complaint lifecycle — admin moves it through these stages */
    status: {
      type: String,
      enum: ['Pending', 'In Review', 'Resolved'],
      default: 'Pending',
    },

    /** The user who filed this complaint */
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    /** Admin appends notes here as they investigate */
    resolutionNote: { type: String, default: '' },

    /** Set automatically when status is changed to 'Resolved' */
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Defensive export — safe to import across merged team branches
module.exports = mongoose.models.Complaint || mongoose.model('Complaint', ComplaintSchema);
