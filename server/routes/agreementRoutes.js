const express = require('express');
const router = express.Router();
const ac = require('../controllers/agreementController');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/',               authenticate, ac.createAgreement);
router.get('/',                authenticate, ac.getAgreements);
router.get('/:id',             authenticate, ac.getAgreementById);
router.post('/:id/generate-pdf', authenticate, ac.generatePdf);
router.get('/:id/download',     ac.downloadPdf); // direct browser view
router.post('/:id/verify',       authenticate, ac.verifyAgreement);

module.exports = router;
