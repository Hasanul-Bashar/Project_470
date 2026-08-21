const mongoose = require('mongoose');

const FlagSchema = new mongoose.Schema(
  {
    landlordId: { type: String, required: true },
    landlordName: { type: String, required: true },
    reason: { type: String, required: true, trim: true },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    date: { type: Date, default: Date.now },

    // Appeal & Provisional Exclusion
    isAppealed: { type: Boolean, default: false },
    appealReason: { type: String, default: '' },
    isProvisionallyExcluded: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['active', 'appealed', 'dismissed', 'upheld'],
      default: 'active',
    },
    appealReviewedAt: { type: Date },
    adminNotes: { type: String, default: '' },
  },
  { _id: true }
);

const PaymentRecordSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['on_time', 'late', 'unpaid'],
      default: 'on_time',
    },
  },
  { _id: true }
);

const ReviewRatingSchema = new mongoose.Schema(
  {
    landlordId: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, default: '' },
    date: { type: Date, default: Date.now },
  },
  { _id: true }
);

const AuditTrailSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    deltaScore: { type: Number, required: true },
    newScore: { type: Number, required: true },
    reason: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

const TrustScoreSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, unique: true },
    tenantName: { type: String, required: true },
    tenantEmail: { type: String, required: true },

    score: { type: Number, default: 100, min: 0, max: 100 },
    band: {
      type: String,
      enum: ['Excellent', 'Good', 'Fair', 'At Risk', 'Blacklisted'],
      default: 'Excellent',
    },
    isBlacklisted: { type: Boolean, default: false },

    flags: [FlagSchema],
    payments: [PaymentRecordSchema],
    ratings: [ReviewRatingSchema],
    auditTrail: [AuditTrailSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.models.TrustScore || mongoose.model('TrustScore', TrustScoreSchema);
