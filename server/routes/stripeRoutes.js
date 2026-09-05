const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripeController');
const { authenticate } = require('../middleware/auth.middleware');

// Authenticated routes — tenant creates checkout, downloads receipt
router.post('/create-checkout', authenticate, stripeController.createCheckoutSession);
router.get('/receipt/:paymentId', authenticate, stripeController.downloadReceipt);

// Webhook route — no auth (Stripe calls this directly)
// Raw body parsing is handled in server.js before mounting this router
router.post('/webhook', stripeController.handleWebhook);

module.exports = router;
