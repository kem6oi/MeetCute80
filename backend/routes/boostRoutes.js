const express = require('express');
const router = express.Router();
const boostController = require('../controllers/boostController');
const { isAuthenticated } = require('../middleware/auth');
const { checkSubscription, checkFeatureAccess } = require('../middleware/subscription'); // checkSubscription might not be needed if checkFeatureAccess implies it or handles subscription loading

// Activate a profile boost
// Assuming 'profileBoost' is the feature_key in feature_permissions table
router.post(
  '/activate',
  isAuthenticated,
  checkSubscription, // Ensures req.subscription is populated for checkFeatureAccess
  checkFeatureAccess('profileBoost'),
  boostController.activateBoost
);

// Get current boost status
router.get(
  '/status',
  isAuthenticated,
  boostController.getBoostStatus
);

module.exports = router;
