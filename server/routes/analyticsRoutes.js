const express = require('express');
const router  = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth.middleware');

// All analytics routes require authentication
router.use(authenticate);

// GET  /api/analytics/landlord      — full analytics for the authenticated landlord
router.get('/landlord', analyticsController.getMyAnalytics);

// POST /api/analytics/view/:listingId — record an anonymous view event
router.post('/view/:listingId', analyticsController.recordView);

module.exports = router;
