const TenantTrust = require('../models/TenantTrust');
const Listing = require('../models/Listing');
const User = require('../models/User');
const { calculateAndSaveTrustScore } = require('../services/trustScoreService');

/**
 * Get Trust Score Profile for logged-in tenant or queried tenant
 */
exports.getTenantTrustScore = async (req, res) => {
  try {
    const requesterRole = req.user?.role;
    const requesterId = req.user?.id;

    let targetTenantId = req.params.tenantId || req.query.tenantId || requesterId;

    let profile = await calculateAndSaveTrustScore(targetTenantId);
    return res.json({
      success: true,
      profile,
      score: profile.trustScore,
      scoreBand: profile.scoreBand,
      isBlacklisted: profile.isBlacklisted,
      flags: profile.flags,
      auditTrail: profile.auditTrail,
    });
  } catch (err) {
    console.error('❌ Get Trust Score Error:', err);
    return res.status(500).json({ message: 'Server error retrieving trust score profile' });
  }
};

/**
 * Landlord flags a tenant for an infraction
 */
exports.flagTenant = async (req, res) => {
  try {
    const landlordId = req.user.id;
    const landlordName =
      req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Landlord';

    const { tenantId, listingId, category, severity, description, reason } = req.body;
    const descText = description?.trim() || reason?.trim();

    if (!tenantId || !category || !descText) {
      return res.status(400).json({ message: 'tenantId, category, and description are required.' });
    }

    // Optional listing lookup
    let listingTitle = 'Rental Property';
    if (listingId) {
      const listing = await Listing.findById(listingId);
      if (listing) listingTitle = listing.title;
    }

    let profile = await TenantTrust.findOne({ tenantId });
    if (!profile) {
      profile = await calculateAndSaveTrustScore(tenantId);
    }

    const newFlag = {
      landlordId,
      landlordName,
      listingId: listingId || null,
      listingTitle,
      category,
      severity: severity || 'moderate',
      description: descText,
      status: 'active',
      appeal: { status: 'none' },
      createdAt: new Date(),
    };

    profile.flags.push(newFlag);
    await profile.save();

    // Recalculate score with new flag
    const updated = await calculateAndSaveTrustScore(tenantId);

    return res.status(201).json({
      success: true,
      message: 'Infraction flag successfully recorded. Tenant trust score recalculated.',
      profile: updated,
      score: updated.trustScore,
      scoreBand: updated.scoreBand,
      isBlacklisted: updated.isBlacklisted,
      flags: updated.flags,
      auditTrail: updated.auditTrail,
    });
  } catch (err) {
    console.error('❌ Flag Tenant Error:', err);
    return res.status(500).json({ message: 'Server error recording tenant flag' });
  }
};

/**
 * Tenant submits an appeal/dispute against a flag
 * Provisionally excludes the flag from the trust score pending admin review!
 */
exports.submitAppeal = async (req, res) => {
  try {
    const tenantId = req.body.tenantId || req.user?.id;
    const { flagId, reason, explanation } = req.body;
    const appealReason = (reason?.trim() || explanation?.trim() || '');

    if (!flagId || !appealReason) {
      return res.status(400).json({ message: 'flagId and appeal explanation reason are required.' });
    }

    const profile = await TenantTrust.findOne({ tenantId });
    if (!profile) {
      return res.status(404).json({ message: 'Tenant trust profile not found' });
    }

    const flag = profile.flags.id(flagId);
    if (!flag) {
      return res.status(404).json({ message: 'Flag not found on tenant profile' });
    }

    // Update appeal state to pending
    flag.status = 'appealed';
    flag.appeal = {
      status: 'pending',
      reason: appealReason,
      submittedAt: new Date(),
      reviewedAt: null,
      adminNotes: '',
    };

    profile.markModified('flags');
    await profile.save();

    // Recalculate score with flag provisionally excluded!
    const updated = await calculateAndSaveTrustScore(tenantId);

    return res.json({
      success: true,
      message:
        'Appeal submitted successfully! The infraction penalty has been provisionally excluded from your Trust Score pending Admin review.',
      profile: updated,
      score: updated.trustScore,
      scoreBand: updated.scoreBand,
      isBlacklisted: updated.isBlacklisted,
      flags: updated.flags,
      auditTrail: updated.auditTrail,
    });
  } catch (err) {
    console.error('❌ Submit Appeal Error:', err);
    return res.status(500).json({ message: 'Server error submitting appeal' });
  }
};

/**
 * Admin reviews a tenant's appeal (Approve = Dismiss flag, Reject = Reinstate penalty)
 */
exports.adminReviewAppeal = async (req, res) => {
  try {
    const { tenantId, flagId, decision, adminNotes } = req.body;
    const normDecision = (decision || '').toLowerCase();
    const isApprove = normDecision === 'approve' || normDecision === 'approved';
    const isReject = normDecision === 'reject' || normDecision === 'rejected';

    if (!tenantId || !flagId || (!isApprove && !isReject)) {
      return res.status(400).json({ message: 'tenantId, flagId, and valid decision ("approve" or "reject") are required.' });
    }

    const profile = await TenantTrust.findOne({ tenantId });
    if (!profile) {
      return res.status(404).json({ message: 'Tenant trust profile not found' });
    }

    const flag = profile.flags.id(flagId);
    if (!flag) {
      return res.status(404).json({ message: 'Flag not found' });
    }

    if (isApprove) {
      flag.status = 'dismissed_by_admin';
      flag.appeal.status = 'approved';
    } else {
      flag.status = 'upheld_by_admin';
      flag.appeal.status = 'rejected';
    }

    flag.appeal.reviewedAt = new Date();
    flag.appeal.adminNotes = adminNotes?.trim() || '';
    profile.markModified('flags');
    await profile.save();

    // Recalculate score reflecting admin's decision
    const updated = await calculateAndSaveTrustScore(tenantId);

    return res.json({
      success: true,
      message: `Appeal successfully ${isApprove ? 'approved (flag dismissed)' : 'rejected (penalty reinstated)'}.`,
      profile: updated,
      score: updated.trustScore,
      scoreBand: updated.scoreBand,
      isBlacklisted: updated.isBlacklisted,
      flags: updated.flags,
      auditTrail: updated.auditTrail,
    });
  } catch (err) {
    console.error('❌ Admin Review Appeal Error:', err);
    return res.status(500).json({ message: 'Server error reviewing appeal' });
  }
};

/**
 * Admin manually blacklists or restores a tenant
 */
exports.adminSetBlacklist = async (req, res) => {
  try {
    const { tenantId, isBlacklisted, reason } = req.body;

    if (!tenantId || isBlacklisted === undefined) {
      return res.status(400).json({ message: 'tenantId and isBlacklisted boolean are required.' });
    }

    let profile = await TenantTrust.findOne({ tenantId });
    if (!profile) {
      profile = await calculateAndSaveTrustScore(tenantId);
    }

    profile.isBlacklisted = Boolean(isBlacklisted);
    profile.blacklistReason = isBlacklisted ? reason?.trim() || 'Direct administrative action' : '';
    await profile.save();

    const updated = await calculateAndSaveTrustScore(tenantId);

    return res.json({
      success: true,
      message: `Tenant has been ${isBlacklisted ? 'blacklisted' : 'restored from blacklist'}.`,
      profile: updated,
      score: updated.trustScore,
      scoreBand: updated.scoreBand,
      isBlacklisted: updated.isBlacklisted,
      flags: updated.flags,
      auditTrail: updated.auditTrail,
    });
  } catch (err) {
    console.error('❌ Admin Set Blacklist Error:', err);
    return res.status(500).json({ message: 'Server error updating blacklist status' });
  }
};

/**
 * Admin overview: all pending appeals and blacklisted tenants
 */
exports.getAdminTrustOverview = async (_req, res) => {
  try {
    const allProfiles = await TenantTrust.find().sort({ updatedAt: -1 });

    const pendingAppeals = [];
    const blacklistedTenants = [];
    const recentFlags = [];

    for (const profile of allProfiles) {
      if (profile.isBlacklisted) {
        blacklistedTenants.push({
          tenantId: profile.tenantId,
          tenantName: profile.tenantName,
          tenantEmail: profile.tenantEmail,
          trustScore: profile.trustScore,
          scoreBand: profile.scoreBand,
          reason: profile.blacklistReason,
          updatedAt: profile.updatedAt,
        });
      }

      for (const flag of profile.flags || []) {
        if (flag.appeal && flag.appeal.status === 'pending') {
          pendingAppeals.push({
            tenantId: profile.tenantId,
            tenantName: profile.tenantName,
            tenantEmail: profile.tenantEmail,
            currentScore: profile.trustScore,
            scoreBand: profile.scoreBand,
            flagId: flag._id,
            category: flag.category,
            severity: flag.severity,
            description: flag.description,
            landlordName: flag.landlordName,
            flagDate: flag.createdAt,
            appealReason: flag.appeal.reason,
            submittedAt: flag.appeal.submittedAt,
          });
        }

        recentFlags.push({
          tenantId: profile.tenantId,
          tenantName: profile.tenantName,
          category: flag.category,
          severity: flag.severity,
          status: flag.status,
          createdAt: flag.createdAt,
        });
      }
    }

    return res.json({
      success: true,
      pendingAppeals,
      blacklistedTenants,
      totalTrackedTenants: allProfiles.length,
      recentFlags: recentFlags.slice(0, 15),
    });
  } catch (err) {
    console.error('❌ Get Admin Trust Overview Error:', err);
    return res.status(500).json({ message: 'Server error retrieving admin trust overview' });
  }
};
