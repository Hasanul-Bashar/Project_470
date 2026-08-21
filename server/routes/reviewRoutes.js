const express = require('express');
const router  = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticate } = require('../middleware/auth.middleware');

// All review routes require authentication
router.use(authenticate);

// POST   /api/reviews              — submit a new review
router.post('/', reviewController.createReview);

// GET    /api/reviews/mine         — reviews authored by current user
router.get('/mine', reviewController.getMyReviews);

// GET    /api/reviews/listing/:listingId — all property reviews for a listing
router.get('/listing/:listingId', reviewController.getReviewsByListing);

// GET    /api/reviews/tenant/:tenantId   — all tenant reviews for a tenant
router.get('/tenant/:tenantId', reviewController.getReviewsByTenant);

module.exports = router;
