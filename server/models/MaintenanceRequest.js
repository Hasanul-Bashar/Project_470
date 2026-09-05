const mongoose = require('mongoose');

const StatusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String, default: 'Landlord' },
  note: { type: String, default: '' },
});

const MaintenanceRequestSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true },
    tenantName: { type: String, required: true },
    tenantEmail: { type: String, required: true },

    landlordId: { type: String, required: true },
    landlordName: { type: String, default: 'Landlord' },
    landlordEmail: { type: String, default: '' },

    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: false,
    },
    listingTitle: { type: String, required: true },

    category: {
      type: String,
      enum: ['Plumbing', 'Electrical', 'HVAC / AC', 'Appliance', 'Structural / Lock', 'Pest Control', 'General'],
      default: 'General',
      required: true,
    },

    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },

    urgency: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Emergency'],
      default: 'Medium',
    },

    photoUrl: { type: String, default: '' },

    status: {
      type: String,
      enum: ['Submitted', 'Acknowledged', 'In Progress', 'Scheduled', 'Resolved', 'Cancelled'],
      default: 'Submitted',
    },

    landlordNotes: { type: String, default: '' },
    scheduledDate: { type: Date, default: null },
    cost: { type: Number, default: 0 },

    statusHistory: [StatusHistorySchema],
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.MaintenanceRequest ||
  mongoose.model('MaintenanceRequest', MaintenanceRequestSchema);
