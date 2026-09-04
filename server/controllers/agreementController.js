const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Agreement = require('../models/Agreement');
const { generateAgreementPdf, STORAGE_DIR } = require('../services/agreementPdfService');
const { createNotification } = require('../services/notificationService');

// ── Helper to generate unique Agreement ID ───────────────────
function generateAgreementId() {
  const prefix = 'AGR-2026-';
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}${randomHex}`;
}

// ── 1. Create Rental Agreement Draft ─────────────────────────
exports.createAgreement = async (req, res) => {
  try {
    const {
      landlordId,
      landlordName,
      landlordEmail,
      landlordPhone,
      tenantId,
      tenantName,
      tenantEmail,
      tenantPhone,
      listingId,
      listingTitle,
      propertyAddress,
      city,
      rentAmount,
      depositAmount,
      paymentDueDate,
      startDate,
      endDate,
      clauses,
    } = req.body;

    if (!tenantEmail || !listingTitle || !propertyAddress || !rentAmount || !startDate || !endDate) {
      return res.status(400).json({
        message: 'Missing required fields: tenantEmail, listingTitle, propertyAddress, rentAmount, startDate, endDate',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24 * 30.4375)));

    const agreementId = generateAgreementId();

    const agreement = new Agreement({
      agreementId,
      landlordId: landlordId || req.user?.id || 'demo-landlord',
      landlordName: landlordName || req.user?.name || 'Alice Rahman',
      landlordEmail: landlordEmail || req.user?.email || 'alice.rahman@landlord.com',
      landlordPhone: landlordPhone || '+880 1711-000000',

      tenantId: tenantId || tenantEmail,
      tenantName: tenantName || tenantEmail.split('@')[0],
      tenantEmail,
      tenantPhone: tenantPhone || '+880 1819-111222',

      listingId: listingId || null,
      listingTitle,
      propertyAddress,
      city: city || 'Dhaka',

      rentAmount: Number(rentAmount),
      depositAmount: Number(depositAmount || rentAmount * 2),
      paymentDueDate: Number(paymentDueDate || 5),
      startDate: start,
      endDate: end,
      leaseTermMonths: months,

      clauses: clauses || [],
      status: 'Draft',
      createdBy: req.user?.id || 'system',
    });

    // Auto-generate PDF & Cryptographic Hash immediately upon creation
    const pdfData = await generateAgreementPdf(agreement);
    agreement.sha256Hash = pdfData.sha256Hash;
    agreement.pdfFilename = pdfData.filename;
    agreement.pdfGeneratedAt = new Date();
    agreement.status = 'Finalized';

    await agreement.save();

    // ── Send Notifications ───────────────────────────────────
    await createNotification({
      recipientId: agreement.tenantId,
      recipientEmail: agreement.tenantEmail,
      recipientRole: 'user',
      type: 'system',
      title: `📄 New Rental Agreement Generated: ${agreement.agreementId}`,
      message: `A digital rental contract for ${listingTitle} has been generated with SHA-256 tamper protection.`,
      link: '/agreements',
      sourceId: agreement._id.toString(),
      sourceType: 'Agreement',
    });

    res.status(201).json({
      message: 'Rental agreement created & PDF generated with SHA-256 tamper proof',
      agreement,
    });
  } catch (err) {
    console.error('❌ createAgreement error:', err);
    res.status(500).json({ message: 'Failed to create rental agreement', error: err.message });
  }
};

// ── 2. Get Rental Agreements List ───────────────────────────
exports.getAgreements = async (req, res) => {
  try {
    const { role, id, email } = req.user || {};
    const { status, search } = req.query;

    let filter = {};

    if (role === 'landlord') {
      filter.$or = [{ landlordId: id }, { landlordEmail: email }];
    } else if (role === 'user') {
      filter.$or = [{ tenantEmail: email }, { tenantId: id }];
    } // Admin sees all

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$and = [
        filter.$and ? { ...filter.$and } : {},
        {
          $or: [
            { agreementId: searchRegex },
            { listingTitle: searchRegex },
            { tenantName: searchRegex },
            { landlordName: searchRegex },
          ],
        },
      ];
    }

    const agreements = await Agreement.find(filter).sort({ createdAt: -1 });

    res.json({ agreements });
  } catch (err) {
    console.error('❌ getAgreements error:', err);
    res.status(500).json({ message: 'Failed to fetch agreements', error: err.message });
  }
};

// ── 3. Get Single Agreement ─────────────────────────────────
exports.getAgreementById = async (req, res) => {
  try {
    const { id } = req.params;
    const agreement = await Agreement.findById(id);
    if (!agreement) {
      return res.status(404).json({ message: 'Rental agreement not found' });
    }
    res.json({ agreement });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch agreement' });
  }
};

// ── 4. Generate/Re-generate PDF ─────────────────────────────
exports.generatePdf = async (req, res) => {
  try {
    const { id } = req.params;
    const agreement = await Agreement.findById(id);
    if (!agreement) {
      return res.status(404).json({ message: 'Rental agreement not found' });
    }

    const pdfData = await generateAgreementPdf(agreement);

    agreement.sha256Hash = pdfData.sha256Hash;
    agreement.pdfFilename = pdfData.filename;
    agreement.pdfGeneratedAt = new Date();
    agreement.status = 'Finalized';
    agreement.isVerified = true;
    agreement.lastVerifiedAt = new Date();

    await agreement.save();

    res.json({
      message: 'PDF regenerated & SHA-256 hash updated',
      sha256Hash: pdfData.sha256Hash,
      filename: pdfData.filename,
      agreement,
    });
  } catch (err) {
    console.error('❌ generatePdf error:', err);
    res.status(500).json({ message: 'Failed to generate PDF', error: err.message });
  }
};

// ── 5. Download PDF File ────────────────────────────────────
exports.downloadPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const agreement = await Agreement.findById(id);
    if (!agreement) {
      return res.status(404).json({ message: 'Agreement not found' });
    }

    const filename = agreement.pdfFilename || `${agreement.agreementId}.pdf`;
    const filePath = path.join(STORAGE_DIR, filename);

    if (!fs.existsSync(filePath)) {
      // Re-generate if missing
      const pdfData = await generateAgreementPdf(agreement);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${pdfData.filename}"`);
      return res.send(pdfData.pdfBuffer);
    }

    const pdfBuffer = fs.readFileSync(filePath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('❌ downloadPdf error:', err);
    res.status(500).json({ message: 'Failed to download PDF' });
  }
};

// ── 6. SHA-256 Tamper-Evident Verification Endpoint ─────────
exports.verifyAgreement = async (req, res) => {
  try {
    const { id } = req.params;
    const agreement = await Agreement.findById(id);
    if (!agreement) {
      return res.status(404).json({ message: 'Agreement not found' });
    }

    const filename = agreement.pdfFilename || `${agreement.agreementId}.pdf`;
    const filePath = path.join(STORAGE_DIR, filename);

    let currentHash = '';
    let pdfExists = fs.existsSync(filePath);

    if (pdfExists) {
      const pdfBuffer = fs.readFileSync(filePath);
      currentHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
    } else {
      // Re-generate to verify
      const pdfData = await generateAgreementPdf(agreement);
      currentHash = pdfData.sha256Hash;
    }

    const isMatch = agreement.sha256Hash && currentHash === agreement.sha256Hash;

    agreement.isVerified = isMatch;
    agreement.lastVerifiedAt = new Date();
    await agreement.save();

    res.json({
      verified: isMatch,
      tamperDetected: !isMatch,
      agreementId: agreement.agreementId,
      storedHash: agreement.sha256Hash,
      computedHash: currentHash,
      verifiedAt: new Date(),
      statusMessage: isMatch
        ? '🔒 SHA-256 Verification PASSED. Document is authentic and unmodified.'
        : '⚠️ SHA-256 Hash MISMATCH! Document content has been tampered with or modified.',
    });
  } catch (err) {
    console.error('❌ verifyAgreement error:', err);
    res.status(500).json({ message: 'Failed to verify agreement hash', error: err.message });
  }
};
