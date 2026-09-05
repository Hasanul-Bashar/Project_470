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

// ── Helper to generate Tenant Passkey ────────────────────────
function generatePasskey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let key = '';
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    key += chars[bytes[i] % chars.length];
  }
  // Format as XXXX-XXXX for readability
  return `${key.slice(0,4)}-${key.slice(4)}`;
}

// ── 1. Create Rental Agreement Draft ─────────────────────────
exports.createAgreement = async (req, res) => {
  try {
    // Only Landlords and Admins are authorized to create/issue rental agreements
    if (req.user && req.user.role === 'user') {
      return res.status(403).json({
        message: 'Access denied: Only Landlords and Admins are authorized to create and issue rental agreements. Tenants review and verify agreements.',
      });
    }

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

    if (!listingTitle || !propertyAddress || !rentAmount || !startDate || !endDate) {
      return res.status(400).json({
        message: 'Missing required fields: listingTitle, propertyAddress, rentAmount, startDate, endDate',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24 * 30.4375)));

    const agreementId = generateAgreementId();
    const passkey = generatePasskey(); // ── Unique tenant access passkey

    const agreement = new Agreement({
      agreementId,
      passkey,
      isClaimed: false,

      landlordId: landlordId || req.user?.id || 'demo-landlord',
      landlordName: landlordName || req.user?.name || 'Alice Rahman',
      landlordEmail: landlordEmail || req.user?.email || 'alice.rahman@landlord.com',
      landlordPhone: landlordPhone || '+880 1711-000000',

      // Tenant info pre-filled by landlord (optional — tenant identity confirmed on claim)
      tenantId:    tenantId    || tenantEmail || '',
      tenantName:  tenantName  || (tenantEmail ? tenantEmail.split('@')[0] : 'Pending Tenant'),
      tenantEmail: tenantEmail || '',
      tenantPhone: tenantPhone || '+880 1819-111222',

      listingId: listingId || null,
      listingTitle,
      propertyAddress,
      city: city || 'Dhaka',

      rentAmount:      Number(rentAmount),
      depositAmount:   Number(depositAmount || rentAmount * 2),
      paymentDueDate:  Number(paymentDueDate || 5),
      startDate: start,
      endDate: end,
      leaseTermMonths: months,

      clauses: clauses || [],
      status: 'pending_claim', // Waiting for tenant to claim with passkey
      createdBy: req.user?.id || 'system',
    });

    // Auto-generate PDF & SHA-256 Hash
    const pdfData = await generateAgreementPdf(agreement);
    agreement.sha256Hash = pdfData.sha256Hash;
    agreement.pdfFilename = pdfData.filename;
    agreement.pdfGeneratedAt = new Date();

    await agreement.save();

    res.status(201).json({
      message: 'Rental agreement created. Share the passkey with your tenant.',
      passkey,
      agreementId,
      agreement,
    });
  } catch (err) {
    console.error('❌ createAgreement error:', err);
    res.status(500).json({ message: 'Failed to create rental agreement', error: err.message });
  }
};

// ── 7b. Tenant Claims Agreement with Passkey ─────────────────
exports.claimAgreement = async (req, res) => {
  try {
    if (req.user?.role !== 'user') {
      return res.status(403).json({ message: 'Only tenants can claim agreements with a passkey.' });
    }

    const { passkey } = req.body;
    if (!passkey) return res.status(400).json({ message: 'Passkey is required.' });

    const raw = passkey.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!raw) return res.status(400).json({ message: 'Valid passkey is required.' });

    const formattedWithHyphen = raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
    const agreement = await Agreement.findOne({
      passkey: { $in: [raw, formattedWithHyphen, passkey.trim().toUpperCase()] },
      $expr: { $gt: [{ $strLenCP: '$passkey' }, 0] },
    });

    if (!agreement) {
      return res.status(404).json({ message: 'Invalid passkey. No agreement found with this code. Please verify and try again.' });
    }

    if (agreement.isClaimed) {
      if (agreement.passkeyClaimedBy === req.user.id || agreement.tenantEmail === req.user.email) {
        return res.json({ message: 'You have already claimed this agreement. You can review and agree to it below.', agreement });
      }
      return res.status(409).json({ message: 'This passkey has already been claimed by another user.' });
    }

    if (agreement.status !== 'pending_claim') {
      return res.status(400).json({ message: `Agreement is already in "${agreement.status}" stage and cannot be claimed.` });
    }

    // Bind this tenant to the agreement
    agreement.isClaimed        = true;
    agreement.passkeyClaimedBy = req.user.id;
    agreement.passkeyClaimedAt = new Date();
    agreement.tenantId         = req.user.id;
    agreement.tenantName       = req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Tenant';
    agreement.tenantEmail      = req.user.email;
    agreement.status           = 'pending_tenant'; // Move to review stage
    await agreement.save();

    // Notify landlord that the tenant has claimed the agreement
    await createNotification({
      recipientId:    agreement.landlordId,
      recipientEmail: agreement.landlordEmail,
      recipientRole:  'landlord',
      type: 'system',
      title: `🔑 Tenant Claimed Agreement: ${agreement.agreementId}`,
      message: `"${agreement.tenantName}" (${agreement.tenantEmail}) has claimed the rental agreement for "${agreement.listingTitle}" using the passkey. Awaiting their review.`,
      link: '/agreements',
      sourceId: agreement._id.toString(),
      sourceType: 'Agreement',
    });

    res.json({
      message: 'Agreement claimed successfully! Please review and agree to proceed.',
      agreement,
    });
  } catch (err) {
    console.error('❌ claimAgreement error:', err);
    res.status(500).json({ message: 'Failed to claim agreement', error: err.message });
  }
};

// ── 7. Tenant Agrees to Agreement ───────────────────────────
exports.tenantAgree = async (req, res) => {
  try {
    if (req.user?.role !== 'user') {
      return res.status(403).json({ message: 'Only tenants can approve agreements at this stage.' });
    }

    const agreement = await Agreement.findById(req.params.id);
    if (!agreement) return res.status(404).json({ message: 'Agreement not found' });

    if (agreement.status !== 'pending_tenant') {
      return res.status(400).json({ message: `Cannot approve: current status is "${agreement.status}". Agreement must be in "pending_tenant" status.` });
    }

    agreement.status = 'pending_admin';
    agreement.tenantAgreedAt = new Date();
    await agreement.save();

    // Notify admin(s)
    await createNotification({
      recipientRole: 'admin',
      type: 'system',
      title: `✅ Tenant Approved Agreement: ${agreement.agreementId}`,
      message: `Tenant "${agreement.tenantName}" has reviewed and agreed to the rental contract for "${agreement.listingTitle}". Admin approval is now required.`,
      link: '/agreements',
      sourceId: agreement._id.toString(),
      sourceType: 'Agreement',
    });

    res.json({ message: 'Agreement approved by tenant. Sent to admin for final approval.', agreement });
  } catch (err) {
    console.error('❌ tenantAgree error:', err);
    res.status(500).json({ message: 'Failed to process tenant agreement', error: err.message });
  }
};

// ── 8. Admin Final Approval ─────────────────────────────────
exports.adminApprove = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can give final approval to agreements.' });
    }

    const agreement = await Agreement.findById(req.params.id);
    if (!agreement) return res.status(404).json({ message: 'Agreement not found' });

    if (agreement.status !== 'pending_admin') {
      return res.status(400).json({ message: `Cannot approve: current status is "${agreement.status}". Agreement must be in "pending_admin" status.` });
    }

    agreement.status = 'approved';
    agreement.adminApprovedAt = new Date();
    await agreement.save();

    // Notify landlord
    await createNotification({
      recipientId: agreement.landlordId,
      recipientEmail: agreement.landlordEmail,
      recipientRole: 'landlord',
      type: 'system',
      title: `🎉 Rental Agreement Fully Approved: ${agreement.agreementId}`,
      message: `Admin has approved the rental agreement for "${agreement.listingTitle}". The contract is now fully active.`,
      link: '/agreements',
      sourceId: agreement._id.toString(),
      sourceType: 'Agreement',
    });

    // Notify tenant
    await createNotification({
      recipientId: agreement.tenantId,
      recipientEmail: agreement.tenantEmail,
      recipientRole: 'user',
      type: 'system',
      title: `🎉 Rental Agreement Fully Approved: ${agreement.agreementId}`,
      message: `Your rental agreement for "${agreement.listingTitle}" has been fully approved by admin. Welcome to your new home!`,
      link: '/agreements',
      sourceId: agreement._id.toString(),
      sourceType: 'Agreement',
    });

    res.json({ message: 'Agreement fully approved by admin. Both parties notified.', agreement });
  } catch (err) {
    console.error('❌ adminApprove error:', err);
    res.status(500).json({ message: 'Failed to approve agreement', error: err.message });
  }
};

// ── 9. Reject Agreement (Admin or Landlord) ─────────────────
exports.rejectAgreement = async (req, res) => {
  try {
    const { role } = req.user || {};
    if (role !== 'admin' && role !== 'landlord') {
      return res.status(403).json({ message: 'Only admins or landlords can reject agreements.' });
    }

    const agreement = await Agreement.findById(req.params.id);
    if (!agreement) return res.status(404).json({ message: 'Agreement not found' });

    const { reason = 'No reason provided.' } = req.body;

    agreement.status = 'rejected';
    agreement.rejectionReason = reason;
    await agreement.save();

    // Notify tenant of rejection
    await createNotification({
      recipientId: agreement.tenantId,
      recipientEmail: agreement.tenantEmail,
      recipientRole: 'user',
      type: 'system',
      title: `❌ Rental Agreement Rejected: ${agreement.agreementId}`,
      message: `The rental agreement for "${agreement.listingTitle}" has been rejected. Reason: ${reason}`,
      link: '/agreements',
      sourceId: agreement._id.toString(),
      sourceType: 'Agreement',
    });

    res.json({ message: 'Agreement rejected and tenant notified.', agreement });
  } catch (err) {
    console.error('❌ rejectAgreement error:', err);
    res.status(500).json({ message: 'Failed to reject agreement', error: err.message });
  }
};

// ── 2. Get Rental Agreements List ───────────────────────────
exports.getAgreements = async (req, res) => {
  try {
    const { role, id, email } = req.user || {};
    const { status, search } = req.query;

    let filter = {};

    if (role === 'landlord') {
      const emailRegex = new RegExp(`^${email}$`, 'i');
      filter.$or = [{ landlordId: id }, { landlordEmail: emailRegex }];
    } else if (role === 'user') {
      const emailRegex = new RegExp(`^${email}$`, 'i');
      // Match by email, tenantId, or passkey claim
      filter.$or = [
        { tenantEmail: emailRegex },
        { tenantId: id },
        { tenantId: email },
        { passkeyClaimedBy: id },
      ];
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
    if (req.user && req.user.role === 'user') {
      return res.status(403).json({
        message: 'Access denied: Only Landlords and Admins are authorized to regenerate agreement contracts.',
      });
    }

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
