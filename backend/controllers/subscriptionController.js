const Subscription = require('../models/Subscription');
const UserBalance = require('../models/UserBalance'); // Added UserBalance
const pool = require('../config/db'); // Added pool for transaction client
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

  /*
  // @DEPRECATED: Replaced by the new transaction flow.
  // To subscribe, initiate a transaction via POST /api/transactions/initiate
  // with itemCategory: 'subscription' and the relevant itemId (packageId).
  createSubscription: async (req, res) => {
    try {
      const { packageId, paymentMethodId } = req.body;
      
      const pkg = await Subscription.getPackageById(packageId);
      if (!pkg) {
        return res.status(404).json({ message: 'Package not found' });
      }

      // This old method created 'pending_verification' user_subscriptions.
      // The new flow creates user_subscriptions only upon successful transaction verification.
      // const newSubscription = await Subscription.createUserSubscription({
      //   userId: req.user.id,
      //   packageId,
      //   paymentMethodId
      // });

      // res.status(201).json({
      //   message: 'Subscription initiated, pending verification.', // This message is no longer accurate for this old endpoint.
      //   subscription: newSubscription
      // });
      return res.status(410).json({ message: 'This endpoint is deprecated. Please use the new transaction flow.' });
    } catch (err) {
      console.error('Error in deprecated createSubscription:', err);
      res.status(500).json({
        message: 'Failed to create subscription (deprecated endpoint)',
        error: err.message
      });
    }
  },
  */

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

  /*
  // @DEPRECATED: Replaced by the new transaction flow.
  // To upgrade/downgrade, user initiates a transaction for the new package.
  // If successful, Transaction.verify will call Subscription._activateSubscriptionWorkflow.
  // The logic to cancel the old subscription upon new one's activation needs to be
  // robustly handled, possibly within _activateSubscriptionWorkflow or a service layer.
  upgradeSubscription: async (req, res) => {
    // const { newPackageId } = req.body;
    // const userId = req.user.id;
    // ... (original implementation commented out) ...
    return res.status(410).json({ message: 'This endpoint is deprecated. Please use the new transaction flow for new packages.' });
  },
  */

  /*
  // @DEPRECATED: Replaced by the new transaction flow.
  // See comments for upgradeSubscription.
  downgradeSubscription: async (req, res) => {
    // const { newPackageId } = req.body;
    // const userId = req.user.id;
    // ... (original implementation commented out) ...
    return res.status(410).json({ message: 'This endpoint is deprecated. Please use the new transaction flow for new packages.' });
  }
  */,

  purchaseWithBalance: async (req, res) => {
    const { packageId } = req.body;
    const userId = req.user.id;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Fetch package details
      const pkg = await Subscription.getPackageById(packageId); // Using existing method, assumes it doesn't need client
      if (!pkg) {
        await client.query('ROLLBACK'); // Ensure rollback if package not found early
        client.release();
        return res.status(404).json({ error: 'Subscription package not found.' });
      }
      const packagePrice = parseFloat(pkg.price);

      // 2. Debit user's balance
      await UserBalance.debit(userId, packagePrice, client);

      // 3. Create a transaction record
      const transactionResult = await client.query(
        `INSERT INTO transactions (user_id, type, amount, status, item_category, payable_item_id, payment_method_details)
         VALUES ($1, $2, $3, 'completed', 'subscription', $4, $5) RETURNING id`,
        [userId, 'subscription_site_balance', packagePrice, packageId, 'Paid with site balance']
      );
      const newTransactionId = transactionResult.rows[0].id;

      // 4. Activate subscription using the internal workflow
      // This method handles deactivating old subscriptions and setting user role
      await Subscription._activateSubscriptionWorkflow(client, {
        userId,
        packageId,
        originalTransactionId: newTransactionId,
        paymentMethodNameForLog: 'Site Balance'
      });

      await client.query('COMMIT');

      // Fetch the newly activated subscription details to return
      const newSubscriptionDetails = await Subscription.getUserSubscription(userId); // This fetches the active one

      res.status(200).json({
        message: 'Subscription purchased successfully with site balance.',
        subscription: newSubscriptionDetails
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error purchasing subscription with balance:', error.message, error.stack);
      if (error.message.includes('Insufficient balance')) {
        return res.status(400).json({ error: error.message });
      }
      if (error.message.includes('Package with ID') && error.message.includes('not found')) {
        return res.status(404).json({ error: error.message }); // From _activateSubscriptionWorkflow if somehow fails there
      }
      res.status(500).json({ error: 'Failed to purchase subscription with balance.' });
    } finally {
      client.release();
    }
  }
};

module.exports = subscriptionController; 