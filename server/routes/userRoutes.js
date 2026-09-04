const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const userController = require('../controllers/userController');

router.get('/saved', authenticate, userController.getSavedListings);
router.post('/saved/:listingId/toggle', authenticate, userController.toggleSavedListing);


module.exports = router;
