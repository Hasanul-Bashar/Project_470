const express = require('express');
const router = express.Router();
const assistantController = require('../controllers/assistantController');

// Assistant conversational endpoint
router.post('/chat', assistantController.handleChat);

// Quick search suggestions
router.get('/suggestions', assistantController.getSuggestions);

// LLM provider status (checks configured keys without leaking secrets)
router.get('/status', assistantController.getStatus);

module.exports = router;
