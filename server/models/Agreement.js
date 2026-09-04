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

    // Landlord Details
    landlordId:    { type: String, required: true },
    landlordName:  { type: String, required: true },
    landlordEmail: { type: String, required: true },
    landlordPhone: { type: String, default: '+880 1711-000000' },

    // Tenant Details
    tenantId:    { type: String, required: true },
    tenantName:  { type: String, required: true },
    tenantEmail: { type: String, required: true },
    tenantPhone: { type: String, default: '+880 1819-111222' },

    // Property Details
    listingId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
    listingTitle:    { type: String, required: true },
    propertyAddress: { type: String, required: true },
    city:            { type: String, default: 'Dhaka' },

    // Lease & Payment Terms
    rentAmount:       { type: Number, required: true },
    depositAmount:    { type: Number, required: true },
    paymentDueDate:   { type: Number, default: 5 }, // e.g. 5th of each month
    startDate:        { type: Date, required: true },
    endDate:          { type: Date, required: true },
    leaseTermMonths:  { type: Number, default: 12 },

    // Clauses & Special Terms
    clauses: [ClauseSchema],

    // State & Security
    status: {
      type: String,
      enum: ['Draft', 'Finalized', 'Signed', 'Terminated'],
      default: 'Draft',
    },

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
