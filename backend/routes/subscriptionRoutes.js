const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const subscriptionController = require('../controllers/subscriptionController');

// Public routes
router.get('/packages', subscriptionController.getPackages);
router.get('/packages/:id', subscriptionController.getPackage);

// Protected routes (require authentication)
router.get('/user', isAuthenticated, subscriptionController.getUserSubscription);
router.post('/subscribe', isAuthenticated, subscriptionController.createSubscription);
router.post('/cancel/:subscriptionId', isAuthenticated, subscriptionController.cancelSubscription);

// Admin routes
router.post('/packages', isAuthenticated, isAdmin, subscriptionController.createPackage);
router.put('/packages/:id', isAuthenticated, isAdmin, subscriptionController.updatePackage);

module.exports = router; 