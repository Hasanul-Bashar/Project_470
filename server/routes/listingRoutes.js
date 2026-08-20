const express = require('express');
const router = express.Router();
const listingController = require('../controllers/listingController');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/', authenticate, listingController.getListings);
router.post('/', authenticate, listingController.createListing);
router.patch('/:id/availability', authenticate, listingController.updateAvailability);

module.exports = router;
