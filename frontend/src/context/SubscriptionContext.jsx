import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api'; // Assuming api.js is in utils
import { useAuth } from './AuthContext'; // Assuming useAuth hook from AuthContext

const SubscriptionContext = createContext(null);

export const SubscriptionProvider = ({ children }) => {
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { authState } = useAuth(); // Get authentication state

  const fetchSubscription = useCallback(async () => {
    if (!authState.isAuthenticated || !authState.user) {
      setSubscription(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Endpoint should match what's defined in backend/routes/subscriptionRoutes.js for getUserSubscription
      const response = await api.get('/subscription/user');
      if (response.data) {
        setSubscription(response.data);
      } else {
        setSubscription(null); // No active subscription
      }
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
      setError(err.response ? err.response.data.message : 'Error fetching subscription data');
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  }, [authState.isAuthenticated, authState.user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  /**
   * Checks if the current user's subscription has access to a given feature.
   * For V1: This checks if a feature *name* (descriptive, from subscription.features array)
   * loosely matches the featureKey. This is a simplification.
   * A more robust solution would involve feature_keys from the backend.
   * @param {string} featureKey - A key/name representing the feature.
   * @returns {boolean} True if access is granted, false otherwise.
   */
  const hasFeatureAccess = useCallback((featureKey) => {
    if (!subscription || !subscription.features || !featureKey) {
      return false;
    }
    // V1: Loose check based on feature name.
    // Assumes featureKey is a simple string that might be part of a feature's name.
    // e.g., featureKey 'whoLikesYou' might match a feature named "See Who Likes You".
    // This requires careful naming alignment or a more robust backend-driven permission list.
    const keyLower = featureKey.toLowerCase();
    return subscription.features.some(feature =>
      feature.name && feature.name.toLowerCase().includes(keyLower)
    );
  }, [subscription]);

  const contextValue = {
    subscription,
    isLoading,
    error,
    fetchSubscription, // To allow manual refetch if needed elsewhere
    hasFeatureAccess
  };

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === null) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
