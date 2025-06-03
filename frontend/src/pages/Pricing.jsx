import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCheck, FaCrown } from 'react-icons/fa';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';

// Only initialize Stripe if we have a valid key (not just placeholder)
const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';
const isValidStripeKey = stripeKey && stripeKey.startsWith('pk_') && stripeKey.length > 10;

// Initialize Stripe only if we have a valid key
let stripePromise = null;
if (isValidStripeKey) {
  try {
    stripePromise = loadStripe(stripeKey);
  } catch (err) {
    console.error('Error initializing Stripe:', err);
  }
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Pricing = () => {
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/subscription/packages`);
      setPackages(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching packages:', err);
      setError('Failed to load subscription packages');
      setLoading(false);
    }
  };

  const handleSubscribe = async (packageId) => {
    try {
      if (!stripePromise) {
        setError('Payment system is not configured');
        return;
      }

      const stripe = await stripePromise;
      
      // Create payment method
      const { paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: {
          number: '4242424242424242', // Test card number
          exp_month: 12,
          exp_year: 2024,
          cvc: '123',
        },
      });

      // Create subscription
      const response = await axios.post(`${API_URL}/api/subscription/subscribe`, {
        packageId,
        paymentMethodId: paymentMethod.id
      });

      if (response.data.subscription) {
        navigate('/subscription/confirmation', {
          state: { subscription: response.data.subscription }
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process subscription');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-[var(--primary)] mb-4">
            Choose Your Perfect Plan
          </h1>
          <p className="text-lg text-[var(--text)] mb-12">
            Unlock premium features and enhance your dating experience
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative rounded-2xl shadow-xl overflow-hidden transition-transform hover:scale-105 ${
                pkg.name === 'Premium' ? 'border-2 border-[var(--primary)]' : 'border border-gray-200'
              }`}
            >
              {pkg.name === 'Premium' && (
                <div className="absolute top-0 right-0 bg-[var(--primary)] text-white px-4 py-1 rounded-bl-lg">
                  Popular
                </div>
              )}

              <div className="p-8 bg-white">
                <div className="flex items-center justify-center mb-4">
                  <FaCrown className={`text-4xl ${
                    pkg.name === 'VIP' ? 'text-[var(--primary-dark)]' :
                    pkg.name === 'Premium' ? 'text-[var(--primary)]' :
                    'text-[var(--primary-light)]'
                  }`} />
                </div>

                <h2 className="text-2xl font-bold text-center mb-2">{pkg.name}</h2>
                <div className="text-center mb-6">
                  <span className="text-4xl font-bold">${pkg.price}</span>
                  <span className="text-[var(--text-light)]">/month</span>
                </div>

                <ul className="space-y-4 mb-8">
                  {pkg.features.map((feature) => (
                    <li key={feature.id} className="flex items-start">
                      <FaCheck className="text-green-500 mt-1 mr-2" />
                      <span className="text-[var(--text)]">{feature.name}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(pkg.id)}
                  className={`w-full py-3 px-6 rounded-full font-medium transition-colors ${
                    pkg.name === 'VIP'
                      ? 'bg-gradient-to-r from-[var(--primary-dark)] to-[var(--primary)] text-white hover:opacity-90'
                      : pkg.name === 'Premium'
                      ? 'bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]'
                      : 'bg-[var(--light)] text-[var(--primary)] hover:bg-[var(--primary-light)]'
                  }`}
                >
                  Get Started
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Pricing; 