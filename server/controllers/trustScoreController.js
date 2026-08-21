const TrustScore = require('../models/TrustScore');

/**
 * Calculate Trust Score with weighted severity & time-decay recency
 */
const calculateScoreAndBand = (doc) => {
  let score = 100; // Base score
  const now = new Date();

  // 1. Process Flags (deduct points with severity & time-decay recency)
  if (doc.flags && doc.flags.length > 0) {
    doc.flags.forEach((flag) => {
      // Provisionally excluded or dismissed flags have 0 impact!
      if (flag.isProvisionallyExcluded || flag.status === 'dismissed') {
        return;
      }

      // Severity base penalty
      let basePenalty = 10;
      if (flag.severity === 'critical') basePenalty = 30;
      else if (flag.severity === 'high') basePenalty = 20;
      else if (flag.severity === 'medium') basePenalty = 10;
      else if (flag.severity === 'low') basePenalty = 5;

      // Recency time-decay calculation
      const flagDate = new Date(flag.date || now);
      const diffDays = Math.max(0, (now - flagDate) / (1000 * 60 * 60 * 24));

      let decayFactor = 1.0; // <= 30 days
      if (diffDays > 180) decayFactor = 0.25;
      else if (diffDays > 90) decayFactor = 0.5;
      else if (diffDays > 30) decayFactor = 0.75;

      const penalty = basePenalty * decayFactor;
      score -= penalty;
    });
  }

  // 2. Process Payments
  if (doc.payments && doc.payments.length > 0) {
    doc.payments.forEach((p) => {
      if (p.status === 'on_time') score += 2;
      else if (p.status === 'late') score -= 5;
      else if (p.status === 'unpaid') score -= 15;
    });
  }

  // 3. Process Ratings
  if (doc.ratings && doc.ratings.length > 0) {
    const avgRating = doc.ratings.reduce((acc, r) => acc + r.rating, 0) / doc.ratings.length;
    if (avgRating < 3.0) {
      score -= (3.0 - avgRating) * 10;
    } else if (avgRating >= 4.5) {
      score += 5;
    }
  }

  // Normalize score into 0 - 100 range
  score = Math.min(100, Math.max(0, Math.round(score)));

  // Determine normalized score band
  let band = 'Excellent';
  let isBlacklisted = doc.isBlacklisted || false;

  if (score < 40) {
    band = 'Blacklisted';
    isBlacklisted = true;
  } else if (score < 60) {
    band = 'At Risk';
  } else if (score < 75) {
    band = 'Fair';
  } else if (score < 90) {
    band = 'Good';
  }

  return { score, band, isBlacklisted };
};

/**
 * Helper to ensure a tenant trust score document exists
 */
const getOrCreateTrustScore = async (tenantId, tenantName, tenantEmail) => {
  let doc = await TrustScore.findOne({ tenantId });
  if (!doc) {
    doc = await TrustScore.create({
      tenantId,
      tenantName: tenantName || 'Tenant User',
      tenantEmail: tenantEmail || 'tenant@example.com',
      score: 100,
      band: 'Excellent',
      isBlacklisted: false,
      flags: [],
      payments: [
        { amount: 15000, status: 'on_time', date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
        { amount: 15000, status: 'on_time', date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      ],
      ratings: [],
      auditTrail: [
        { action: 'INITIAL_SCORE', deltaScore: 0, newScore: 100, reason: 'Initial account activation baseline score.' },
      ],
    });
  }
  return doc;
};

/**
 * GET /api/trust-score/:tenantId
 * Retrieve tenant trust score, audit trail, and flags
 */
exports.getTenantTrustScore = async (req, res) => {
  try {
    const tenantId = req.params.tenantId || req.user.id;
    const doc = await getOrCreateTrustScore(tenantId, req.user.name, req.user.email);

    // Recalculate score on read
    const { score, band, isBlacklisted } = calculateScoreAndBand(doc);
    doc.score = score;
    doc.band = band;
    doc.isBlacklisted = isBlacklisted;
    await doc.save();

    return res.json(doc);
  } catch (err) {
    console.error('❌ Get Trust Score Error:', err);
    return res.status(500).json({ message: 'Server error fetching trust score' });
  }
};

/**
 * POST /api/trust-score/flag
 * Landlord flags a tenant for property damage, unpaid rent, etc.
 */
exports.flagTenant = async (req, res) => {
  try {
    const { tenantId, tenantName, tenantEmail, reason, severity } = req.body;

    if (!tenantId || !reason) {
      return res.status(400).json({ message: 'tenantId and reason are required' });
    }

    const doc = await getOrCreateTrustScore(tenantId, tenantName, tenantEmail);
    const landlordName = req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Landlord';

    const newFlag = {
      landlordId: req.user.id,
      landlordName,
      reason,
      severity: severity || 'medium',
      date: new Date(),
      isAppealed: false,
      isProvisionallyExcluded: false,
      status: 'active',
    };

    doc.flags.push(newFlag);

    // Recalculate score
    const oldScore = doc.score;
    const { score, band, isBlacklisted } = calculateScoreAndBand(doc);
    const delta = score - oldScore;

    doc.score = score;
    doc.band = band;
    doc.isBlacklisted = isBlacklisted;

    doc.auditTrail.push({
      action: 'FLAG_ADDED',
      deltaScore: delta,
      newScore: score,
      reason: `Flagged by ${landlordName} (${severity || 'medium'} severity): "${reason}"`,
      timestamp: new Date(),
    });

    await doc.save();

    return res.status(201).json({
      success: true,
      message: 'Tenant flagged successfully.',
      trustScore: doc,
    });
  } catch (err) {
    console.error('❌ Flag Tenant Error:', err);
    return res.status(500).json({ message: 'Server error flagging tenant' });
  }
};

/**
 * POST /api/trust-score/appeal
 * Tenant submits appeal for a flag -> provisionally excludes flag pending admin review!
 */
exports.appealFlag = async (req, res) => {
  try {
    const { tenantId, flagId, appealReason } = req.body;

    if (!flagId || !appealReason) {
      return res.status(400).json({ message: 'flagId and appealReason are required' });
    }

    const targetTenantId = tenantId || req.user.id;
    const doc = await TrustScore.findOne({ tenantId: targetTenantId });
    if (!doc) return res.status(404).json({ message: 'Trust score record not found' });

    const flag = doc.flags.id(flagId);
    if (!flag) return res.status(404).json({ message: 'Flag entry not found' });

    if (flag.isAppealed) {
      return res.status(400).json({ message: 'This flag has already been appealed.' });
    }

    flag.isAppealed = true;
    flag.appealReason = appealReason;
    flag.isProvisionallyExcluded = true; // Provisional Exclusion!
    flag.status = 'appealed';

    // Recalculate score with flag provisionally excluded
    const oldScore = doc.score;
    const { score, band, isBlacklisted } = calculateScoreAndBand(doc);
    const delta = score - oldScore;

    doc.score = score;
    doc.band = band;
    doc.isBlacklisted = isBlacklisted;

    doc.auditTrail.push({
      action: 'APPEAL_SUBMITTED',
      deltaScore: delta,
      newScore: score,
      reason: `Appeal submitted by tenant for flag "${flag.reason}". Flag provisionally excluded pending admin review.`,
      timestamp: new Date(),
    });

    await doc.save();

    return res.json({
      success: true,
      message: 'Appeal submitted! Flag is provisionally excluded and score restored pending admin review.',
      trustScore: doc,
    });
  } catch (err) {
    console.error('❌ Appeal Flag Error:', err);
    return res.status(500).json({ message: 'Server error processing appeal' });
  }
};

/**
 * PATCH /api/trust-score/review-appeal
 * Admin reviews tenant appeal (approve -> dismiss flag, reject -> uphold flag)
 */
exports.reviewAppeal = async (req, res) => {
  try {
    const { tenantId, flagId, decision, adminNotes } = req.body; // decision: 'approve' | 'reject'

    if (!tenantId || !flagId || !decision) {
      return res.status(400).json({ message: 'tenantId, flagId, and decision are required' });
    }

    const doc = await TrustScore.findOne({ tenantId });
    if (!doc) return res.status(404).json({ message: 'Trust score record not found' });

    const flag = doc.flags.id(flagId);
    if (!flag) return res.status(404).json({ message: 'Flag entry not found' });

    flag.appealReviewedAt = new Date();
    flag.adminNotes = adminNotes || '';

    const oldScore = doc.score;

    if (decision === 'approve') {
      // Appeal Approved -> Flag permanently dismissed
      flag.status = 'dismissed';
      flag.isProvisionallyExcluded = true;
    } else {
      // Appeal Rejected -> Flag upheld and penalty reinstated
      flag.status = 'upheld';
      flag.isProvisionallyExcluded = false;
    }

    const { score, band, isBlacklisted } = calculateScoreAndBand(doc);
    const delta = score - oldScore;

    doc.score = score;
    doc.band = band;
    doc.isBlacklisted = isBlacklisted;

    doc.auditTrail.push({
      action: decision === 'approve' ? 'APPEAL_APPROVED' : 'APPEAL_REJECTED',
      deltaScore: delta,
      newScore: score,
      reason: decision === 'approve'
        ? `Admin APPROVED appeal. Flag dismissed: "${flag.reason}"`
        : `Admin REJECTED appeal. Flag reinstated: "${flag.reason}"`,
      timestamp: new Date(),
    });

    await doc.save();

    return res.json({
      success: true,
      message: `Appeal review decision (${decision}) processed successfully.`,
      trustScore: doc,
    });
  } catch (err) {
    console.error('❌ Review Appeal Error:', err);
    return res.status(500).json({ message: 'Server error reviewing appeal' });
  }
};

/**
 * GET /api/trust-score/admin/queue
 * Admin overview of all tenant trust scores, active flags, and pending appeals
 */
exports.getAdminTrustScoreQueue = async (_req, res) => {
  try {
    const records = await TrustScore.find().sort({ updatedAt: -1 });
    return res.json(records);
  } catch (err) {
    console.error('❌ Admin Trust Score Queue Error:', err);
    return res.status(500).json({ message: 'Server error fetching trust score queue' });
  }
};
