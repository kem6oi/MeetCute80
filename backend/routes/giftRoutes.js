const express = require('express');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const router = express.Router();
const giftController = require('../controllers/giftController');

// Gift Items Routes (Admin only)
router.get('/items', giftController.getAllGiftItems);
router.get('/items/:id', giftController.getGiftItemById);
router.post('/items', isAuthenticated, isAdmin, giftController.createGiftItem);
router.put('/items/:id', isAuthenticated, isAdmin, giftController.updateGiftItem);

// User Gifts Routes
router.post('/send', isAuthenticated, giftController.sendGift);
router.get('/received', isAuthenticated, giftController.getReceivedGifts);
router.get('/sent', isAuthenticated, giftController.getSentGifts);
router.put('/read/:id', isAuthenticated, giftController.markGiftAsRead);
router.get('/unread-count', isAuthenticated, giftController.getUnreadGiftCount);

module.exports = router; 