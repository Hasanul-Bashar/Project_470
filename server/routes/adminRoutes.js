const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

router.use(authenticate, requireAdmin);

router.get('/stats', adminController.getStats);
router.get('/landlords/pending', adminController.getPendingLandlords);
router.patch('/landlords/:id/verify', adminController.verifyLandlord);
router.get('/listings/pending', adminController.getPendingListings);
router.patch('/listings/:id/status', adminController.updateListingStatus);

module.exports = router;
