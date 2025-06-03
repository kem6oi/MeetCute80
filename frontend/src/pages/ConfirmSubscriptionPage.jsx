import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSubscription } from '../context/SubscriptionContext';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
// import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js'; // Conceptual import

const ConfirmSubscriptionPage = () => {
  const { packageId } = useParams();
  const navigate = useNavigate();
  const { authState } = useAuth();
  const { subscription: currentSubscription, fetchSubscription, isLoading: isSubscriptionLoading } = useSubscription();

  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isLoadingPackage, setIsLoadingPackage] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [actionType, setActionType] = useState('Subscribe'); // Subscribe, Upgrade, Downgrade, Switch Plan, Re-subscribe
  const [gainedFeatures, setGainedFeatures] = useState([]);
  const [lostFeatures, setLostFeatures] = useState([]);

  // Placeholder for Stripe Elements integration
  // const stripe = useStripe();
  // const elements = useElements();

  useEffect(() => {
    const loadPackageDetails = async () => {
      if (!packageId) {
        setError('No package ID provided.');
        setIsLoadingPackage(false);
        return;
      }
      setIsLoadingPackage(true);
      try {
        const response = await api.get(`/subscription/packages/${packageId}`);
        setSelectedPackage(response.data);
      } catch (err) {
        console.error('Error fetching package details:', err);
        setError(err.response?.data?.message || 'Failed to load package details.');
      } finally {
        setIsLoadingPackage(false);
      }
    };
    loadPackageDetails();
  }, [packageId]);

  useEffect(() => {
    if (currentSubscription && selectedPackage) {
      if (currentSubscription.status === 'active') {
        // Basic logic: if new package price is higher, it's an upgrade.
        // A more robust check would use tier_level hierarchy.
        if (parseFloat(selectedPackage.price) > parseFloat(currentSubscription.price)) {
          setActionType('Upgrade');
        } else if (parseFloat(selectedPackage.price) < parseFloat(currentSubscription.price)) {
          setActionType('Downgrade');
        } else if (selectedPackage.id !== currentSubscription.package_id) {
          // Same price, different package - could be "Switch" or "Update"
          // For V1, let's treat it as a type of upgrade/downgrade path if IDs differ
          setActionType('Switch Plan');
        } else {
          setActionType('Re-subscribe'); // Same package, maybe re-activating or error
        }
      } else {
        setActionType('Subscribe'); // No active sub, or inactive sub
      }
    } else {
        setActionType('Subscribe');
    }
  }, [currentSubscription, selectedPackage]);

  // Helper function to calculate feature differences
  const getFeatureDifferences = (currentFeatures = [], selectedFeatures = []) => {
    const currentFeatureNames = new Set(currentFeatures.map(f => f.name));
    const selectedFeatureNames = new Set(selectedFeatures.map(f => f.name));

    const gained = selectedFeatures.filter(f => !currentFeatureNames.has(f.name));
    const lost = currentFeatures.filter(f => !selectedFeatureNames.has(f.name));
    return { gained, lost };
  };

  useEffect(() => {
    if (currentSubscription && currentSubscription.features && selectedPackage && selectedPackage.features) {
      const { gained, lost } = getFeatureDifferences(currentSubscription.features, selectedPackage.features);
      if (actionType === 'Upgrade' || actionType === 'Switch Plan') { // Treat Switch Plan as gaining some, losing some, or both
        setGainedFeatures(gained);
        setLostFeatures(lost); // For a pure upgrade, lost might be empty. For switch, both could have items.
      } else if (actionType === 'Downgrade') {
        setLostFeatures(lost);
        setGainedFeatures(gained); // For a pure downgrade, gained might be empty.
      } else {
        setGainedFeatures([]);
        setLostFeatures([]);
      }
    } else {
      setGainedFeatures([]);
      setLostFeatures([]);
    }
  }, [currentSubscription, selectedPackage, actionType]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsProcessing(true);
    setError(null);

    // --- Conceptual Stripe Payment Method Creation ---
    // if (!stripe || !elements) {
    //   setError('Stripe has not loaded yet.');
    //   setIsProcessing(false);
    //   return;
    // }
    // const cardElement = elements.getElement(CardElement);
    // const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
    //   type: 'card',
    //   card: cardElement,
    // });

    // if (stripeError) {
    //   setError(stripeError.message);
    //   setIsProcessing(false);
    //   return;
    // }
    // const paymentMethodId = paymentMethod.id;
    // --- End Conceptual Stripe ---

    // For V1 without full Stripe Elements, we'll simulate a paymentMethodId
    // In a real app, the above Stripe code would be active.
    const simulatedPaymentMethodId = 'pm_card_visa'; // Replace with actual Stripe tokenization

    try {
      let response;
      const payload = {
        newPackageId: packageId, // For upgrade/downgrade
        packageId: packageId,    // For new subscription
        paymentMethodId: simulatedPaymentMethodId,
      };

      if (actionType === 'Upgrade') {
        response = await api.post('/subscription/upgrade', { newPackageId: packageId, paymentMethodId: simulatedPaymentMethodId });
      } else if (actionType === 'Downgrade' || actionType === 'Switch Plan') {
        // V1 uses cancel & new for downgrade/switch, which also requires payment for new term
        response = await api.post('/subscription/downgrade', { newPackageId: packageId, paymentMethodId: simulatedPaymentMethodId });
      } else { // New subscription or Re-subscribe
        response = await api.post('/subscription/subscribe', { packageId, paymentMethodId: simulatedPaymentMethodId });
      }

      if (response.data.subscription || response.data.message?.includes('successfully')) {
        await fetchSubscription(); // Refresh global subscription state
        navigate('/subscription/confirmation', {
            state: {
                message: response.data.message || `${actionType} successful!`,
                subscriptionDetails: response.data.subscription
            }
        });
      } else {
        throw new Error(response.data.message || `Failed to ${actionType.toLowerCase()} subscription.`);
      }
    } catch (err) {
      console.error(`Error during ${actionType} subscription:`, err);
      setError(err.response?.data?.message || err.message || `Failed to process your ${actionType.toLowerCase()}.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getActionVerb = () => {
    if (actionType === 'Switch Plan') return 'Switch to';
    return actionType;
  }

  if (isLoadingPackage || isSubscriptionLoading) {
    return <div className="flex justify-center items-center min-h-screen"><div className="loader">Loading...</div></div>;
  }

  if (error && !selectedPackage) { // Critical error like package not found
    return <div className="text-center py-10 text-red-500">Error: {error} <Link to="/pricing" className="text-blue-500 underline">Go to Pricing</Link></div>;
  }

  if (!selectedPackage) {
    return <div className="text-center py-10">Package not found. <Link to="/pricing" className="text-blue-500 underline">Return to Pricing</Link></div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto bg-slate-800 shadow-xl rounded-lg overflow-hidden">
        <div className="p-6 md:p-8">
          <h2 className="text-3xl font-extrabold text-center mb-2">
            {getActionVerb()} {selectedPackage.name}
          </h2>
          <p className="text-center text-slate-400 mb-6 text-lg">
            Confirm your plan details and complete your payment.
          </p>

          <div className="bg-slate-700 p-6 rounded-lg mb-6">
            <h3 className="text-xl font-semibold mb-3">{selectedPackage.tier_level} Tier Features:</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-300 mb-4">
              {selectedPackage.features?.map(feature => (
                <li key={feature.name || feature.id}>{feature.name}</li>
              ))}
            </ul>
            <div className="text-right">
              <span className="text-4xl font-bold">${selectedPackage.price}</span>
              <span className="text-slate-400">/{selectedPackage.billing_interval === 'monthly' ? 'mo' : selectedPackage.billing_interval}</span>
            </div>
          </div>

          {/* Display Gained/Lost Features */}
          {actionType === 'Upgrade' && gainedFeatures.length > 0 && (
            <div className="mb-6 p-4 bg-green-900/30 border border-green-700 rounded-lg text-sm">
              <h4 className="font-semibold text-green-400 mb-2">Features you'll gain:</h4>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                {gainedFeatures.map(f => <li key={`gained-${f.name}`}>{f.name}</li>)}
              </ul>
            </div>
          )}
          {actionType === 'Downgrade' && lostFeatures.length > 0 && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-sm">
              <h4 className="font-semibold text-red-400 mb-2">Features you'll lose access to:</h4>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                {lostFeatures.map(f => <li key={`lost-${f.name}`}>{f.name}</li>)}
              </ul>
            </div>
          )}
           {actionType === 'Switch Plan' && (gainedFeatures.length > 0 || lostFeatures.length > 0) && (
            <div className="mb-6 space-y-3">
              {gainedFeatures.length > 0 && (
                <div className="p-4 bg-green-900/30 border border-green-700 rounded-lg text-sm">
                  <h4 className="font-semibold text-green-400 mb-2">New features you'll get:</h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {gainedFeatures.map(f => <li key={`gained-switch-${f.name}`}>{f.name}</li>)}
                  </ul>
                </div>
              )}
              {lostFeatures.length > 0 && (
                 <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-sm">
                  <h4 className="font-semibold text-red-400 mb-2">Features you'll no longer have:</h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {lostFeatures.map(f => <li key={`lost-switch-${f.name}`}>{f.name}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}


          {currentSubscription && currentSubscription.status === 'active' && (
            <div className="mb-6 p-4 bg-slate-700/50 rounded-lg text-sm">
              <p className="font-semibold">Current Plan: {currentSubscription.package_name} (${currentSubscription.price}/{currentSubscription.billing_interval})</p>
              <p className="text-slate-400">Your current billing cycle ends on: {new Date(currentSubscription.end_date).toLocaleDateString()}.</p>
              {actionType === 'Upgrade' && <p className="text-green-400 mt-1">You are upgrading your plan.</p>}
              {actionType === 'Downgrade' && <p className="text-yellow-400 mt-1">You are downgrading your plan. Changes will apply as per new term.</p>}
              {actionType === 'Switch Plan' && <p className="text-blue-400 mt-1">You are switching your plan.</p>}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="card-element" className="block text-sm font-medium text-slate-300 mb-2">
                Payment Details (Card information)
              </label>
              {/*
                Placeholder for Stripe CardElement.
                In a real app, you'd wrap this page or a parent with <Elements stripe={stripePromise}>
                and then use <CardElement options={CARD_ELEMENT_OPTIONS} /> here.
              */}
              <div id="card-element" className="p-3 bg-slate-700 rounded border border-slate-600 focus-within:border-indigo-500">
                 {/* <CardElement /> */}
                 <p className="text-slate-500 text-xs">Stripe CardElement would be here. Using simulated payment for V1.</p>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}

            <button
              type="submit"
              disabled={isProcessing || !selectedPackage}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : `${getActionVerb()} Plan & Pay $${selectedPackage.price}`}
            </button>
          </form>
           <p className="text-xs text-slate-500 mt-6 text-center">
            By clicking "{getActionVerb()} Plan & Pay", you agree to our Terms of Service and acknowledge our Privacy Policy. Your subscription will auto-renew.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConfirmSubscriptionPage;
