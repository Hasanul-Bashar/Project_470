const express = require('express');
const router = express.Router();
const nc = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/',              authenticate, nc.getNotifications);
router.patch('/:id/read',   authenticate, nc.markRead);
router.patch('/mark-all',   authenticate, nc.markAllRead);
router.delete('/clear-read',authenticate, nc.clearRead);
router.delete('/:id',       authenticate, nc.deleteNotification);
router.post('/',            authenticate, nc.createManual);

module.exports = router;
