const mongoose = require('mongoose');

const RentPaymentSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true },
    tenantName: { type: String, required: true, trim: true },
    tenantEmail: { type: String, required: true, lowercase: true, trim: true },

    landlordId: { type: String, required: true },
    landlordName: { type: String, default: '' },

    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: false,
    },
    listingTitle: { type: String, required: true, trim: true },

    month: { type: String, required: true }, // e.g. "2026-09" or "September 2026"
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },

    status: {
      type: String,
      enum: ['paid', 'due', 'overdue'],
      default: 'due',
    },

    paidDate: { type: Date, default: null },
    paymentMethod: { type: String, default: 'Cash' }, // e.g. Cash, Bank Transfer, bKash, Online
    notes: { type: String, default: '' },

    overdueFlagged: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Helper method to automatically check and flag overdue status
RentPaymentSchema.methods.checkOverdue = function () {
  if (this.status === 'due' && new Date(this.dueDate) < new Date()) {
    this.status = 'overdue';
    this.overdueFlagged = true;
  } else if (this.status === 'overdue') {
    this.overdueFlagged = true;
  } else if (this.status === 'paid') {
    this.overdueFlagged = false;
  }
  return this;
};

module.exports = mongoose.models.RentPayment || mongoose.model('RentPayment', RentPaymentSchema);
