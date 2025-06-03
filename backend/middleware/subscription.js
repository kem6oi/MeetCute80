const Subscription = require('../models/Subscription');

const checkSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.getUserSubscription(req.user.id);
    
    if (!subscription) {
      return res.status(403).json({
        message: 'Subscription required',
        redirect: '/pricing'
      });
    }

    // Add subscription info to request
    req.subscription = subscription;
    next();
  } catch (err) {
    console.error('Error checking subscription:', err);
    res.status(500).json({ message: 'Failed to check subscription status' });
  }
};

const checkPremiumFeature = (feature) => {
  return async (req, res, next) => {
    try {
      const subscription = await Subscription.getUserSubscription(req.user.id);
      
      if (!subscription) {
        return res.status(403).json({
          message: 'Premium feature',
          redirect: '/pricing'
        });
      }

      // Check if the subscription package includes the feature
      const package = await Subscription.getPackageById(subscription.package_id);
      const hasFeature = package.features.some(f => 
        f.name.toLowerCase().includes(feature.toLowerCase())
      );

      if (!hasFeature) {
        return res.status(403).json({
          message: 'Feature not available in your subscription',
          redirect: '/pricing'
        });
      }

      next();
    } catch (err) {
      console.error('Error checking feature access:', err);
      res.status(500).json({ message: 'Failed to check feature access' });
    }
  };
};

module.exports = {
  checkSubscription,
  checkPremiumFeature
}; 