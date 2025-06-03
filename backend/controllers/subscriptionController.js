const Subscription = require('../models/Subscription');
const env = require('../config/env');
const stripe = require('stripe')(env.STRIPE_SECRET_KEY);

const subscriptionController = {
  getPackages: async (req, res) => {
    try {
      const packages = await Subscription.getAllPackages();
      res.json(packages);
    } catch (err) {
      console.error('Error getting subscription packages:', err);
      res.status(500).json({ message: 'Failed to get subscription packages' });
    }
  },

  getPackage: async (req, res) => {
    try {
      const pkg = await Subscription.getPackageById(req.params.id);
      if (!pkg) {
        return res.status(404).json({ message: 'Package not found' });
      }
      res.json(pkg);
    } catch (err) {
      console.error('Error getting subscription package:', err);
      res.status(500).json({ message: 'Failed to get subscription package' });
    }
  },

  createPackage: async (req, res) => {
    try {
      const { name, price, billing_interval, features } = req.body;
      const pkg = await Subscription.createPackage({
        name,
        price,
        billing_interval,
        features
      });
      res.status(201).json(pkg);
    } catch (err) {
      console.error('Error creating subscription package:', err);
      res.status(500).json({ message: 'Failed to create subscription package' });
    }
  },

  updatePackage: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, price, billing_interval, is_active, features } = req.body;
      const pkg = await Subscription.updatePackage(id, {
        name,
        price,
        billing_interval,
        is_active,
        features
      });
      res.json(pkg);
    } catch (err) {
      console.error('Error updating subscription package:', err);
      res.status(500).json({ message: 'Failed to update subscription package' });
    }
  },

  getUserSubscription: async (req, res) => {
    try {
      const subscription = await Subscription.getUserSubscription(req.user.id);
      res.json(subscription || null);
    } catch (err) {
      console.error('Error getting user subscription:', err);
      res.status(500).json({ message: 'Failed to get user subscription' });
    }
  },

  createSubscription: async (req, res) => {
    try {
      const { packageId, paymentMethodId } = req.body;
      
      // Get the package details
      const pkg = await Subscription.getPackageById(packageId);
      if (!pkg) {
        return res.status(404).json({ message: 'Package not found' });
      }

      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(pkg.price * 100), // Convert to cents
        currency: 'usd',
        payment_method: paymentMethodId,
        confirm: true,
        return_url: `${env.FRONTEND_URL}/subscription/confirmation`
      });

      if (paymentIntent.status === 'succeeded') {
        // Create subscription
        const subscription = await Subscription.createUserSubscription({
          userId: req.user.id,
          packageId,
          paymentMethodId
        });

        res.json({
          subscription,
          message: 'Subscription created successfully'
        });
      } else {
        res.status(400).json({
          message: 'Payment failed',
          status: paymentIntent.status
        });
      }
    } catch (err) {
      console.error('Error creating subscription:', err);
      res.status(500).json({ 
        message: 'Failed to create subscription',
        error: err.message
      });
    }
  },

  cancelSubscription: async (req, res) => {
    try {
      const { subscriptionId } = req.params;
      const subscription = await Subscription.cancelSubscription(subscriptionId);
      res.json({
        subscription,
        message: 'Subscription cancelled successfully'
      });
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      res.status(500).json({ message: 'Failed to cancel subscription' });
    }
  }
};

module.exports = subscriptionController; 