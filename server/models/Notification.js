const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    // Who this notification is for
    recipientId:    { type: String, required: true, index: true },
    recipientEmail: { type: String, required: true },
    recipientRole:  { type: String, enum: ['user', 'landlord', 'admin'], default: 'user' },

    // Notification content
    type: {
      type: String,
      enum: [
        'rent_due',
        'rent_overdue',
        'rent_paid',
        'maintenance_submitted',
        'maintenance_updated',
        'maintenance_resolved',
        'booking_approved',
        'booking_rejected',
        'booking_request',
        'complaint_updated',
        'system',
      ],
      required: true,
    },

    title:   { type: String, required: true },
    message: { type: String, required: true },

    // Optional deep-link to relevant page
    link: { type: String, default: '' },

    // Read state
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },

    // Optional email tracking
    emailSent:   { type: Boolean, default: false },
    emailSentAt: { type: Date, default: null },

    // Source reference (optional)
    sourceId:   { type: String, default: '' },
    sourceType: { type: String, default: '' }, // 'RentPayment' | 'MaintenanceRequest' | 'Booking'
  },
  { timestamps: true }
);

// Compound index for fast per-user queries
NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

module.exports =
  mongoose.models.Notification ||
  mongoose.model('Notification', NotificationSchema);
