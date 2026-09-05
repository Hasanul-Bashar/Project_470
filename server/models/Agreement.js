const mongoose = require('mongoose');

const ClauseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  text:  { type: String, required: true },
});

const AgreementSchema = new mongoose.Schema(
  {
    agreementId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // ── Passkey (Tenant Access Code) ─────────────────────────
    passkey:          { type: String, default: '', index: true },
    passkeyClaimedBy: { type: String, default: '' },  // tenant user id
    passkeyClaimedAt: { type: Date,   default: null },
    isClaimed:        { type: Boolean, default: false },

    // Landlord Details
    landlordId:    { type: String, required: true },
    landlordName:  { type: String, required: true },
    landlordEmail: { type: String, required: true },
    landlordPhone: { type: String, default: '+880 1711-000000' },

    // Tenant Details (pre-filled by landlord; updated when tenant claims via passkey)
    tenantId:    { type: String, default: '' },
    tenantName:  { type: String, default: 'Pending Tenant' },
    tenantEmail: { type: String, default: '' },
    tenantPhone: { type: String, default: '+880 1819-111222' },

    // Property Details
    listingId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
    listingTitle:    { type: String, required: true },
    propertyAddress: { type: String, required: true },
    city:            { type: String, default: 'Dhaka' },

    // Lease & Payment Terms
    rentAmount:       { type: Number, required: true },
    depositAmount:    { type: Number, required: true },
    paymentDueDate:   { type: Number, default: 5 },
    startDate:        { type: Date, required: true },
    endDate:          { type: Date, required: true },
    leaseTermMonths:  { type: Number, default: 12 },

    // Clauses & Special Terms
    clauses: [ClauseSchema],

    // State & Security
    status: {
      type: String,
      enum: ['pending_claim', 'pending_tenant', 'pending_admin', 'approved', 'rejected', 'Draft', 'Finalized', 'Signed', 'Terminated'],
      default: 'pending_claim',
    },

    tenantAgreedAt:  { type: Date, default: null },
    adminApprovedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: '' },

    // Tamper-Evident SHA-256 Cryptographic Hash
    sha256Hash:     { type: String, default: '' },
    pdfFilename:    { type: String, default: '' },
    pdfGeneratedAt: { type: Date, default: null },
    isVerified:     { type: Boolean, default: false },
    lastVerifiedAt: { type: Date, default: null },

    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Agreement ||
  mongoose.model('Agreement', AgreementSchema);
