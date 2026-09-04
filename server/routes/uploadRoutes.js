const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const uploadController = require('../controllers/uploadController');

router.post(
  '/',
  authenticate,
  uploadController.uploadMiddleware,
  uploadController.handleUpload
);


module.exports = router;
