const express = require('express');
const router = express.Router();
const trustScoreController = require('../controllers/trustScoreController');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

router.get('/admin/queue', authenticate, requireAdmin, trustScoreController.getAdminTrustScoreQueue);
router.get('/:tenantId', authenticate, trustScoreController.getTenantTrustScore);
router.get('/', authenticate, trustScoreController.getTenantTrustScore);
router.post('/flag', authenticate, trustScoreController.flagTenant);
router.post('/appeal', authenticate, trustScoreController.appealFlag);
router.patch('/review-appeal', authenticate, requireAdmin, trustScoreController.reviewAppeal);

module.exports = router;
