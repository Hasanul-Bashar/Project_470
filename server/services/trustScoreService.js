const TenantTrust = require('../models/TenantTrust');
const RentPayment = require('../models/RentPayment');
const Review = require('../models/Review');
const User = require('../models/User');

// Half-life decay constant in days (180 days = 6 months)
const HALF_LIFE_DAYS = 180;
const MIN_DECAY_FLOOR = 0.25;

/**
 * Calculates exponential time-decay factor: 2^(-deltaDays / 180)
 * Min floor of 0.25 ensures historical flags don't vanish entirely.
 */
function calculateTimeDecay(date) {
  if (!date) return 1.0;
  const elapsedMs = Math.max(0, Date.now() - new Date(date).getTime());
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
  const factor = Math.pow(2, -elapsedDays / HALF_LIFE_DAYS);
  return Math.max(MIN_DECAY_FLOOR, Math.min(1.0, parseFloat(factor.toFixed(3))));
}

/**
 * Normalizes numerical score (0 - 100) into a single score band
 */
function determineScoreBand(score, isBlacklisted) {
  if (isBlacklisted || score < 30) return 'Blacklisted';
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Low';
}

/**
 * Calculates and updates the full trust profile for a tenant
 * @param {string} tenantId - User ID of the tenant
 * @returns {Promise<Object>} Updated TenantTrust document
 */
async function calculateAndSaveTrustScore(tenantId) {
  let profile = await TenantTrust.findOne({ tenantId });

  // If no profile, create or find user details
  if (!profile) {
    let tenantName = 'Tenant User';
    let tenantEmail = '';
    try {
      const user = await User.findById(tenantId);
      if (user) {
        tenantName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
        tenantEmail = user.email || '';
      }
    } catch (e) {}

    profile = new TenantTrust({
      tenantId: tenantId.toString(),
      tenantName,
      tenantEmail,
      flags: [],
      auditTrail: [],
      trustScore: 85,
      scoreBand: 'Excellent',
    });
  }

  const auditTrail = [];
  let runningScore = 85; // Starting baseline

  auditTrail.push({
    timestamp: new Date(),
    factor: 'baseline',
    pointsChange: 85,
    reason: 'Initial baseline tenant trust score',
    decayFactor: 1.0,
    effectiveWeight: 85,
  });

  // ── 1. Payment History Evaluation ──────────────────────────────────────────
  try {
    const payments = await RentPayment.find({
      $or: [{ tenantId }, { tenantEmail: profile.tenantEmail }],
    }).sort({ createdAt: -1 });

    let onTimeCount = 0;
    let overdueCount = 0;
    let partialCount = 0;

    for (const payment of payments) {
      const decay = calculateTimeDecay(payment.createdAt || payment.dueDate);

      if (payment.status === 'paid') {
        const isPaidOnTime = payment.paidDate && payment.dueDate
          ? new Date(payment.paidDate) <= new Date(payment.dueDate)
          : true;

        if (isPaidOnTime && onTimeCount < 5) {
          onTimeCount++;
          const pts = 4;
          runningScore += pts;
          auditTrail.push({
            timestamp: new Date(),
            factor: 'payment_history',
            pointsChange: pts,
            reason: `On-time rent payment for "${payment.listingTitle}" (${payment.month})`,
            decayFactor: 1.0,
            effectiveWeight: pts,
          });
        }
      } else if (payment.status === 'overdue' || payment.overdueFlagged) {
        overdueCount++;
        const basePenalty = -12;
        const effectivePenalty = Math.round(basePenalty * decay);
        runningScore += effectivePenalty;
        auditTrail.push({
          timestamp: new Date(),
          factor: 'payment_history',
          pointsChange: effectivePenalty,
          reason: `Overdue rent for "${payment.listingTitle}" (${payment.month}) - Due: ${new Date(payment.dueDate).toLocaleDateString()}`,
          decayFactor: decay,
          effectiveWeight: effectivePenalty,
        });
      } else if (payment.status === 'partial') {
        partialCount++;
        const basePenalty = -4;
        const effectivePenalty = Math.round(basePenalty * decay);
        runningScore += effectivePenalty;
        auditTrail.push({
          timestamp: new Date(),
          factor: 'payment_history',
          pointsChange: effectivePenalty,
          reason: `Partial rent unpaid balance for "${payment.listingTitle}" (${payment.month})`,
          decayFactor: decay,
          effectiveWeight: effectivePenalty,
        });
      }
    }
  } catch (payErr) {
    console.warn('⚠️ Error evaluating payment history in trust score:', payErr.message);
  }

  // ── 2. Landlord Reviews Evaluation ─────────────────────────────────────────
  try {
    const tenantReviews = await Review.find({
      reviewType: 'tenant',
      targetId: tenantId,
    }).sort({ createdAt: -1 });

    if (tenantReviews.length > 0) {
      const avgRating =
        tenantReviews.reduce((sum, r) => sum + r.rating, 0) / tenantReviews.length;

      // Weight review rating by recency of newest review
      const newestReviewDate = tenantReviews[0].createdAt;
      const decay = calculateTimeDecay(newestReviewDate);

      let reviewPts = 0;
      let reviewReason = '';

      if (avgRating >= 4.5) {
        reviewPts = 15;
        reviewReason = `Exceptional landlord ratings (${avgRating.toFixed(1)}★ across ${tenantReviews.length} review(s))`;
      } else if (avgRating >= 4.0) {
        reviewPts = 10;
        reviewReason = `Strong landlord ratings (${avgRating.toFixed(1)}★ across ${tenantReviews.length} review(s))`;
      } else if (avgRating >= 3.0) {
        reviewPts = 3;
        reviewReason = `Satisfactory landlord ratings (${avgRating.toFixed(1)}★ across ${tenantReviews.length} review(s))`;
      } else if (avgRating >= 2.0) {
        reviewPts = Math.round(-12 * decay);
        reviewReason = `Low landlord ratings (${avgRating.toFixed(1)}★ across ${tenantReviews.length} review(s))`;
      } else {
        reviewPts = Math.round(-25 * decay);
        reviewReason = `Critical negative landlord ratings (${avgRating.toFixed(1)}★ across ${tenantReviews.length} review(s))`;
      }

      runningScore += reviewPts;
      auditTrail.push({
        timestamp: new Date(),
        factor: 'reviews',
        pointsChange: reviewPts,
        reason: reviewReason,
        decayFactor: decay,
        effectiveWeight: reviewPts,
      });
    }
  } catch (revErr) {
    console.warn('⚠️ Error evaluating reviews in trust score:', revErr.message);
  }

  // ── 3. Landlord Flags & Dispute / Appeal Evaluation ─────────────────────────
  let hasCriticalActiveFlag = false;

  const SEVERITY_BASE_PENALTIES = {
    minor: -6,
    moderate: -15,
    severe: -30,
    critical: -50,
  };

  for (const flag of profile.flags || []) {
    const decay = calculateTimeDecay(flag.createdAt);
    const basePenalty = SEVERITY_BASE_PENALTIES[flag.severity] || -15;

    // CASE A: Appeal is PENDING admin review -> PROVISIONALLY EXCLUDE
    if (flag.appeal && flag.appeal.status === 'pending') {
      auditTrail.push({
        timestamp: new Date(),
        factor: 'appeal_exclusion',
        pointsChange: 0,
        reason: `[PROVISIONALLY EXCLUDED] Flag for "${flag.category.replace('_', ' ')}" (${flag.severity.toUpperCase()}) is suspended pending admin review of tenant appeal.`,
        decayFactor: decay,
        effectiveWeight: 0,
        details: { flagId: flag._id, appealReason: flag.appeal.reason },
      });
      continue;
    }

    // CASE B: Appeal was APPROVED by admin or dismissed -> PERMANENTLY EXCLUDE
    if (
      (flag.appeal && flag.appeal.status === 'approved') ||
      flag.status === 'dismissed_by_admin'
    ) {
      auditTrail.push({
        timestamp: new Date(),
        factor: 'appeal_exclusion',
        pointsChange: 0,
        reason: `[DISMISSED] Flag for "${flag.category.replace('_', ' ')}" was dismissed by admin upon successful appeal.`,
        decayFactor: decay,
        effectiveWeight: 0,
        details: { flagId: flag._id, adminNotes: flag.appeal?.adminNotes },
      });
      continue;
    }

    // CASE C: Active flag (or rejected appeal) -> APPLY PENALTY WITH TIME DECAY
    const effectivePenalty = Math.round(basePenalty * decay);
    runningScore += effectivePenalty;

    if (flag.severity === 'critical') {
      hasCriticalActiveFlag = true;
    }

    const appealStatusNote =
      flag.appeal && flag.appeal.status === 'rejected' ? ' (Appeal rejected by admin)' : '';

    auditTrail.push({
      timestamp: new Date(),
      factor: 'landlord_flag',
      pointsChange: effectivePenalty,
      reason: `Landlord flag: "${flag.category.replace('_', ' ')}" (${flag.severity.toUpperCase()}) on "${flag.listingTitle}" by ${flag.landlordName}. Time decay: ${(decay * 100).toFixed(0)}%${appealStatusNote}.`,
      decayFactor: decay,
      effectiveWeight: effectivePenalty,
      details: { flagId: flag._id, description: flag.description },
    });
  }

  // ── 4. Normalization & Blacklist Verification ──────────────────────────────
  const normalizedScore = Math.max(0, Math.min(100, Math.round(runningScore)));
  const isBlacklisted = profile.isBlacklisted || hasCriticalActiveFlag || normalizedScore < 30;
  const scoreBand = determineScoreBand(normalizedScore, isBlacklisted);

  auditTrail.push({
    timestamp: new Date(),
    factor: 'normalization',
    pointsChange: normalizedScore - runningScore,
    reason: `Final score normalized to ${normalizedScore}/100. Classification: Band [${scoreBand}]${isBlacklisted ? ' - Blacklist Active' : ''}`,
    decayFactor: 1.0,
    effectiveWeight: normalizedScore,
  });

  // Update profile
  profile.trustScore = normalizedScore;
  profile.scoreBand = scoreBand;
  profile.isBlacklisted = isBlacklisted;
  if (hasCriticalActiveFlag && !profile.blacklistReason) {
    profile.blacklistReason = 'Critical landlord infraction flag active.';
  }
  profile.auditTrail = auditTrail;
  profile.lastCalculatedAt = new Date();

  await profile.save();
  return profile;
}

module.exports = {
  calculateTimeDecay,
  determineScoreBand,
  calculateAndSaveTrustScore,
};
