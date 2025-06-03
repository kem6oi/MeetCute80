const express = require('express');
const router = express.Router();
const { isAuthenticated, isUser } = require('../middleware/auth'); // Added isUser
const messageController = require('../controllers/messageController');

// Protected routes (require authentication)
router.get('/conversation', isAuthenticated, isUser, messageController.getConversation); // Added isUser
router.get('/conversations', isAuthenticated, isUser, messageController.getConversations); // Added isUser
router.post('/send', isAuthenticated, isUser, messageController.sendMessage); // Added isUser
router.put('/read', isAuthenticated, isUser, messageController.markAsRead); // Added isUser

module.exports = router;