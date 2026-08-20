const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

router.post('/', authenticate, bookingController.createBooking);
router.get('/', authenticate, bookingController.getBookings);
router.patch('/:id/landlord-approve', authenticate, bookingController.landlordApprove);
router.patch('/:id/admin-approve', authenticate, requireAdmin, bookingController.adminApprove);
router.patch('/:id/reject', authenticate, bookingController.rejectBooking);

module.exports = router;
