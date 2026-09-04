const express = require('express');
const router = express.Router();
const rentController = require('../controllers/rentController');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/', authenticate, rentController.createRentPayment);
router.get('/', authenticate, rentController.getRentPayments);
router.post('/bulk-generate', authenticate, rentController.bulkGenerateRent);
router.patch('/:id/status', authenticate, rentController.updateRentStatus);
router.delete('/:id', authenticate, rentController.deleteRentPayment);

module.exports = router;
