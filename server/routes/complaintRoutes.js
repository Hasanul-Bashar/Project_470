const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

router.post('/', authenticate, complaintController.createComplaint);
router.get('/', authenticate, requireAdmin, complaintController.getComplaints);
router.get('/:id', authenticate, requireAdmin, complaintController.getComplaintById);
router.patch('/:id/status', authenticate, requireAdmin, complaintController.updateComplaintStatus);

module.exports = router;
