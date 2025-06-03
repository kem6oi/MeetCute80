const express = require('express');
const router = express.Router();
const { isAuthenticated, isUser } = require('../middleware/auth'); // Added isUser
const matchController = require('../controllers/matchController');
const { searchRateLimiter } = require('../middleware/rateLimiter');

// Protected routes (require authentication)
router.get('/suggestions', isAuthenticated, isUser, searchRateLimiter, matchController.getPotentialMatches);
router.post('/like/:id', isAuthenticated, isUser, matchController.likeProfile);
router.get('/', isAuthenticated, isUser, matchController.getMatches);
router.post('/', isAuthenticated, isUser, matchController.checkAndCreateMatch);
router.delete('/:matchId', isAuthenticated, isUser, matchController.unmatch);

module.exports = router;