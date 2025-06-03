const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const matchController = require('../controllers/matchController');

// Protected routes (require authentication)
router.get('/suggestions', isAuthenticated, matchController.getPotentialMatches);
router.post('/like/:id', isAuthenticated, matchController.likeProfile);
router.get('/', isAuthenticated, matchController.getMatches);
router.post('/', isAuthenticated, matchController.checkAndCreateMatch);
router.delete('/:matchId', isAuthenticated, matchController.unmatch);

module.exports = router;