const express = require('express');
const chatController = require('../controllers/chatController');
const router = express.Router();

// ✅ DEBUG 14
console.log('🔷 DEBUG 14 [chatRoutes]: Chat routes file loaded');

// Send message
router.post('/message', (req, res) => {
  // ✅ DEBUG 15
  console.log('🔷 DEBUG 15 [chatRoutes]: POST /api/chat/message endpoint hit');
  chatController.sendMessage(req, res);
});

// Get history by session
router.get('/history/:sessionId', (req, res) => chatController.getChatHistory(req, res));

// NEW: Get FAQ categories
router.get('/faqs', (req, res) => chatController.getFAQCategories(req, res));

module.exports = router;
