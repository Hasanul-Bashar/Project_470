const mongoose = require('mongoose');

const FlagSchema = new mongoose.Schema(
  {
    landlordId: { type: String, required: true },
    landlordName: { type: String, default: 'Landlord' },
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: false,
    },
    listingTitle: { type: String, default: 'Rental Property' },

    category: {
      type: String,
      enum: [
        'property_damage',
        'late_payment',
        'lease_violation',
        'noise_nuisance',
        'unauthorized_sublet',
        'illegal_activity',
        'other',
      ],
      required: true,
    },

    severity: {
      type: String,
      enum: ['minor', 'moderate', 'severe', 'critical'],
      default: 'moderate',
    },

    description: { type: String, required: true, trim: true },

    // Status: active, appealed, dismissed_by_admin, upheld_by_admin
    status: {
      type: String,
      enum: ['active', 'appealed', 'dismissed_by_admin', 'upheld_by_admin'],
      default: 'active',
    },

    // Dispute / Appeal Details
    appeal: {
      status: {
        type: String,
        enum: ['none', 'pending', 'approved', 'rejected'],
        default: 'none',
      },
      reason: { type: String, default: '' },
      submittedAt: { type: Date, default: null },
      reviewedAt: { type: Date, default: null },
      adminNotes: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

const AuditTrailSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, default: Date.now },
    factor: { type: String, required: true }, // 'baseline', 'payment_history', 'reviews', 'landlord_flag', 'appeal_exclusion', 'normalization'
    pointsChange: { type: Number, required: true },
    reason: { type: String, required: true },
    decayFactor: { type: Number, default: 1.0 },
    effectiveWeight: { type: Number, default: 0 },
    details: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: true }
);

const TenantTrustSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tenantName: { type: String, default: 'Tenant' },
    tenantEmail: { type: String, default: '' },

    trustScore: {
      type: Number,
      default: 85,
      min: 0,
      max: 100,
    },

    // Single Score Band: 'Excellent', 'Good', 'Fair', 'Low', 'Blacklisted'
    scoreBand: {
      type: String,
      enum: ['Excellent', 'Good', 'Fair', 'Low', 'Blacklisted'],
      default: 'Excellent',
    },

    isBlacklisted: {
      type: Boolean,
      default: false,
    },

    blacklistReason: {
      type: String,
      default: '',
    },

    flags: [FlagSchema],

    auditTrail: [AuditTrailSchema],

    lastCalculatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.TenantTrust || mongoose.model('TenantTrust', TenantTrustSchema);
