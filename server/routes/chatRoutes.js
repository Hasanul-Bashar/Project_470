const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/', authenticate, chatController.getChats);
router.get('/listing/:listingId', authenticate, chatController.getOrCreateChatByListing);
router.get('/:chatId', authenticate, chatController.getChatById);
router.post('/:chatId/messages', authenticate, chatController.sendMessage);

module.exports = router;
