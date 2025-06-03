const Subscription = require('../models/Subscription');
const env = require('../config/env');

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
      const { name, price, billing_interval, tier_level, description, duration_months } = req.body;
      const pkg = await Subscription.createPackage({
        name,
        price,
        billing_interval,
        tier_level,
        description,
        duration_months
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
      const { name, price, billing_interval, is_active, tier_level, description, duration_months } = req.body;
      const pkg = await Subscription.updatePackage(id, {
        name,
        price,
        billing_interval,
        is_active,
        tier_level,
        description,
        duration_months
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

      // Create subscription (status will be pending_verification)
      const newSubscription = await Subscription.createUserSubscription({
        userId: req.user.id,
        packageId,
        paymentMethodId // This ID will be used for internal linking later
      });

      res.status(201).json({
        message: 'Subscription initiated, pending verification.',
        subscription: newSubscription
      });
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
  },

  upgradeSubscription: async (req, res) => {
    const { newPackageId } = req.body;
    const userId = req.user.id;

    try {
      const currentSubscription = await Subscription.getUserSubscription(userId);
      if (!currentSubscription) {
        return res.status(404).json({ message: 'No active subscription found to upgrade.' });
      }

      if (currentSubscription.package_id === newPackageId) {
        return res.status(400).json({ message: 'Cannot upgrade to the same package.' });
      }

      const newPackage = await Subscription.getPackageById(newPackageId);
      if (!newPackage) {
        return res.status(404).json({ message: 'New package not found.' });
      }

      // Optional: Add more sophisticated upgrade logic (e.g., check price or tier_level hierarchy)
      // For V1, any different package is considered an upgrade via this endpoint.

      // Create Stripe payment intent for the new package
      // Assuming paymentMethodId is re-used or a new one is provided by frontend if necessary.
      // For simplicity, this example assumes the frontend handles collecting a new paymentMethodId if needed
      // and passes it. If not, we might need to use a saved payment method.
      // This example proceeds as if a new payment intent is made for the full price of the new package.
      const paymentMethodIdFromBody = req.body.paymentMethodId;
      if (!paymentMethodIdFromBody) {
          // Attempt to use existing payment method from current subscription if available and appropriate
          // This part is complex and depends on how payment methods are stored and managed.
          // For V1, requiring paymentMethodId for upgrade is simpler.
          return res.status(400).json({ message: 'Payment method ID is required for upgrade.' });
      }

      // Cancel the old subscription - This might need to be conditional based on new subscription success
      // For now, proceed with cancellation then creation.
      // Consider if cancellation should only happen *after* new one is 'active' (future step).
      await Subscription.cancelSubscription(currentSubscription.id);

      // Create the new subscription (status will be pending_verification)
      const newSubscriptionData = await Subscription.createUserSubscription({
        userId,
        packageId: newPackageId,
        paymentMethodId: paymentMethodIdFromBody // This ID will be used for internal linking later
      });

      res.status(201).json({
        message: 'Subscription upgrade initiated, pending verification.',
        subscription: newSubscriptionData
      });

    } catch (err) {
      console.error('Error upgrading subscription:', err);
      res.status(500).json({ message: 'Failed to upgrade subscription.', error: err.message });
    }
  },

  downgradeSubscription: async (req, res) => {
    const { newPackageId } = req.body;
    const userId = req.user.id;

    try {
      const currentSubscription = await Subscription.getUserSubscription(userId);
      if (!currentSubscription) {
        return res.status(404).json({ message: 'No active subscription found to downgrade.' });
      }

      if (currentSubscription.package_id === newPackageId) {
        return res.status(400).json({ message: 'Cannot downgrade to the same package.' });
      }

      const newPackage = await Subscription.getPackageById(newPackageId);
      if (!newPackage) {
        return res.status(404).json({ message: 'New package not found.' });
      }

      // Optional: Add more sophisticated downgrade logic (e.g., check price or tier_level hierarchy)
      // For V1, using "cancel old, create new". This means user is charged for the new (lower) tier
      // and starts a new term. No refunds/proration for V1.

      const paymentMethodIdFromBody = req.body.paymentMethodId;
      if (!paymentMethodIdFromBody) {
           return res.status(400).json({ message: 'Payment method ID is required for downgrade.' });
      }
      // const paymentMethodToUse = paymentMethodIdFromBody; // Simplified for V1

      // Cancel the old subscription - Similar to upgrade, consider if this should be conditional.
      await Subscription.cancelSubscription(currentSubscription.id);

      // Create the new subscription (status will be pending_verification)
      const newSubscriptionData = await Subscription.createUserSubscription({
        userId,
        packageId: newPackageId,
        paymentMethodId: paymentMethodIdFromBody // This ID will be used for internal linking later
      });

      res.status(201).json({
        message: 'Subscription downgrade initiated, pending verification. New term will start upon verification.',
        subscription: newSubscriptionData
      });

    } catch (err) {
      console.error('Error downgrading subscription:', err);
      res.status(500).json({ message: 'Failed to downgrade subscription.', error: err.message });
    }
  }
};

module.exports = subscriptionController; 