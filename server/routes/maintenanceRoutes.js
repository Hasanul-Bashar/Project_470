const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/', authenticate, maintenanceController.createRequest);
router.get('/', authenticate, maintenanceController.getRequests);
router.patch('/:id/stage', authenticate, maintenanceController.updateStage);
router.delete('/:id', authenticate, maintenanceController.deleteRequest);

module.exports = router;
