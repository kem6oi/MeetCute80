const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const matchController = require('../controllers/matchController');
const { searchRateLimiter } = require('../middleware/rateLimiter'); // Added

// Protected routes (require authentication)
router.get('/suggestions', isAuthenticated, searchRateLimiter, matchController.getPotentialMatches); // Added searchRateLimiter
router.post('/like/:id', isAuthenticated, matchController.likeProfile);
router.get('/', isAuthenticated, matchController.getMatches);
router.post('/', isAuthenticated, matchController.checkAndCreateMatch);
router.delete('/:matchId', isAuthenticated, matchController.unmatch);

module.exports = router;