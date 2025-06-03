const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

// Get dashboard stats
router.get('/stats', isAuthenticated, dashboardController.getUserStats);

// Get recent activity
router.get('/activity', isAuthenticated, dashboardController.getRecentActivity);

module.exports = router;
