const express = require('express');
const router = express.Router();
const anonymousBrowsingController = require('../controllers/anonymousBrowsingController');
const { isAuthenticated } = require('../middleware/auth');
const { checkSubscription, checkFeatureAccess } = require('../middleware/subscription');

// Start anonymous browsing session
// Assuming 'anonymousBrowsing' is the feature_key
router.post(
  '/start',
  isAuthenticated,
  checkSubscription, // Ensures req.subscription is populated
  checkFeatureAccess('anonymousBrowsing'),
  anonymousBrowsingController.startAnonymousBrowsing
);

// Stop anonymous browsing session
router.post(
  '/stop',
  isAuthenticated,
  anonymousBrowsingController.stopAnonymousBrowsing
);

// Get current anonymous browsing status
router.get(
  '/status',
  isAuthenticated,
  anonymousBrowsingController.getAnonymousBrowsingStatus
);

module.exports = router;
