const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const messageController = require('../controllers/messageController');

// Protected routes (require authentication)
router.get('/conversation', isAuthenticated, messageController.getConversation);
router.get('/conversations', isAuthenticated, messageController.getConversations);
router.post('/send', isAuthenticated, messageController.sendMessage);
router.put('/read', isAuthenticated, messageController.markAsRead);

module.exports = router;