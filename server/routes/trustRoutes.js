const express = require('express');
const router = express.Router();
const trustScoreController = require('../controllers/trustScoreController');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

// 1. Get Trust Score (query by tenantId, route param :tenantId, or own profile)
router.get('/score', authenticate, trustScoreController.getTenantTrustScore);

// 2. Landlord flags a tenant for an infraction
router.post('/flag', authenticate, trustScoreController.flagTenant);

// 3. Tenant submits a dispute / appeal for an infraction flag
router.post('/appeal', authenticate, trustScoreController.submitAppeal);

// 4. Admin reviews a tenant appeal (Approve = Dismiss flag, Reject = Reinstate penalty)
router.post('/appeal/review', authenticate, requireAdmin, trustScoreController.adminReviewAppeal);
router.post('/admin/review-appeal', authenticate, requireAdmin, trustScoreController.adminReviewAppeal);

// 5. Admin directly sets or removes blacklisting
router.post('/blacklist', authenticate, requireAdmin, trustScoreController.adminSetBlacklist);
router.post('/admin/blacklist', authenticate, requireAdmin, trustScoreController.adminSetBlacklist);

// 6. Admin overview for all trust scores, pending appeals, and blacklisted tenants
router.get('/admin/overview', authenticate, requireAdmin, trustScoreController.getAdminTrustOverview);
router.get('/admin/appeals', authenticate, requireAdmin, trustScoreController.getAdminTrustOverview);

// 7. Direct parameterized route for tenant trust score by ID
router.get('/:tenantId', authenticate, trustScoreController.getTenantTrustScore);

module.exports = router;

