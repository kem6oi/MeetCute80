import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCheck, FaTimes, FaCrown } from 'react-icons/fa'; // FaTimes for '✘'
import api from '../utils/api'; // Using the global api instance
import { useAuth } from '../context/AuthContext'; // To potentially pass token if needed by api instance

// Stripe is not directly used in this display component for payment processing initiation here
// but kept if handleSubscribe was to be more complex later.
// For now, handleSubscribe will just navigate or call a context method.

const Pricing = () => {
  const [rawPackages, setRawPackages] = useState([]);
  const [displayTiers, setDisplayTiers] = useState({}); // { Basic: pkg, Premium: pkg, Elite: pkg }
  const [allUniqueFeatures, setAllUniqueFeatures] = useState([]); // [{name, description}, ...]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { authState } = useAuth();

  useEffect(() => {
    const fetchPackagesData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get('/subscription/packages'); // Using global api
        const fetchedPackages = response.data || [];
        setRawPackages(fetchedPackages);

        // Process packages for display
        const tiers = {};
        const featuresMap = new Map();

        fetchedPackages.forEach(pkg => {
          if (!pkg.tier_level) return; // Skip packages without a tier_level

          // Prioritize monthly packages for display in the main column for a tier
          // Or just take the first one if no monthly/annual distinction is made or needed for features
          if (!tiers[pkg.tier_level] || pkg.billing_interval === 'monthly') {
            tiers[pkg.tier_level] = {
              ...pkg, // Includes id, name, price, billing_interval, tier_level, description, duration_months
              // features array is already on pkg from backend
            };
          }

          pkg.features.forEach(feature => {
            if (!featuresMap.has(feature.name)) {
              featuresMap.set(feature.name, feature.description || 'No description available.');
            }
          });
        });

        // Ensure specific order: Basic, Premium, Elite
        const orderedTiers = {};
        if (tiers.Basic) orderedTiers.Basic = tiers.Basic;
        if (tiers.Premium) orderedTiers.Premium = tiers.Premium;
        if (tiers.Elite) orderedTiers.Elite = tiers.Elite;
        // Add any other tiers that might exist, though the design implies these three
        Object.keys(tiers).forEach(tierKey => {
            if (!orderedTiers[tierKey]) orderedTiers[tierKey] = tiers[tierKey];
        });


        setDisplayTiers(orderedTiers);
        setAllUniqueFeatures(Array.from(featuresMap, ([name, description]) => ({ name, description })));

      } catch (err) {
        console.error('Error fetching packages:', err);
        setError(err.response?.data?.message || 'Failed to load subscription packages');
      } finally {
        setLoading(false);
      }
    };

    fetchPackagesData();
  }, []);

  const handleChoosePlan = (packageId) => {
    // For V1, this might navigate to a dedicated subscription page or trigger a modal.
    // The actual subscription creation with Stripe Elements would be on that page/modal.
    // This simplifies Pricing.jsx to be mostly display.
    // If user is not authenticated, redirect to login/register first.
    if (!authState.isAuthenticated) {
      navigate('/login', { state: { from: '/pricing', packageId } });
    } else {
      // User is authenticated, proceed to a checkout or confirmation step
      // For now, let's assume there's a /subscribe page that takes packageId
      navigate(`/subscribe/${packageId}`);
      // Or directly call a subscription creation function if using a modal here
      console.log(`User chose package ID: ${packageId}`);
    }
  };

  const tierOrder = ['Basic', 'Premium', 'Elite'];

  const orderedDisplayTiers = useMemo(() => {
    const result = [];
    for (const tierName of tierOrder) {
      if (displayTiers[tierName]) {
        result.push(displayTiers[tierName]);
      }
    }
    // Add any other tiers not in the predefined order (though typically there'd be only these)
    for (const tier of Object.values(displayTiers)) {
        if (!result.some(t => t.tier_level === tier.tier_level)) {
            result.push(tier);
        }
    }
    return result;
  }, [displayTiers]);


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-red-600 p-8 bg-white shadow-lg rounded-lg text-center">
          <h2 className="text-2xl font-semibold mb-4">Error Loading Packages</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (orderedDisplayTiers.length === 0 && !loading) { // Added !loading to prevent flash of this message
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-gray-600 p-8 bg-white shadow-lg rounded-lg text-center">
          <h2 className="text-2xl font-semibold mb-4">No Subscription Packages Available</h2>
          <p>Please check back later or contact support.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 bg-gradient-to-br from-slate-900 to-slate-800 min-h-screen text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-extrabold mb-4 tracking-tight">
            Find Your Perfect Match, Faster.
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Choose a plan that suits your journey. Unlock exclusive features and connect on a deeper level.
          </p>
        </div>

        <div className="overflow-x-auto bg-slate-800 shadow-2xl rounded-xl p-px">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-700/50">
              <tr>
                <th scope="col" className="py-5 px-6 text-left text-xs font-medium uppercase tracking-wider w-1/3">
                  Features
                </th>
                {orderedDisplayTiers.map((pkg) => (
                  <th key={pkg.tier_level} scope="col" className="py-5 px-6 text-center text-xs font-medium uppercase tracking-wider relative w-1/4">
                    <div className="flex flex-col items-center">
                        {pkg.tier_level === 'Premium' && (
                        <span className="absolute -top-3 bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md">
                            Most Popular
                        </span>
                        )}
                        <FaCrown className={`text-3xl mb-2 ${
                            pkg.tier_level === 'Elite' ? 'text-yellow-400' :
                            pkg.tier_level === 'Premium' ? 'text-indigo-400' :
                            'text-slate-400'
                        }`} />
                        <span className="text-lg font-semibold">{pkg.tier_level}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {allUniqueFeatures.map((feature, featureIdx) => (
                <tr key={feature.name} className={featureIdx % 2 === 0 ? 'bg-slate-800' : 'bg-slate-800/50'}>
                  <td
                    className="py-4 px-6 text-sm font-medium text-slate-300 whitespace-nowrap"
                    title={feature.description} // Tooltip for feature description
                  >
                    {feature.name}
                  </td>
                  {orderedDisplayTiers.map((pkg) => {
                    const hasFeature = pkg.features.some(f => f.name === feature.name);
                    return (
                      <td key={`${pkg.tier_level}-${feature.name}`} className="py-4 px-6 text-center whitespace-nowrap">
                        {hasFeature ? (
                          <FaCheck className="text-green-400 mx-auto text-xl" />
                        ) : (
                          <FaTimes className="text-slate-500 mx-auto text-xl" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Price Row */}
              <tr className="bg-slate-800/50">
                <td className="py-5 px-6 text-sm font-semibold text-slate-300">Price</td>
                {orderedDisplayTiers.map(pkg => (
                  <td key={`${pkg.tier_level}-price`} className="py-5 px-6 text-center">
                    <span className="text-3xl font-extrabold">${pkg.price}</span>
                    <span className="text-sm text-slate-400">/{pkg.billing_interval === 'monthly' ? 'mo' : pkg.billing_interval}</span>
                  </td>
                ))}
              </tr>
              {/* Duration Row (if applicable) */}
              <tr className="bg-slate-800">
                <td className="py-3 px-6 text-sm font-medium text-slate-300">Billed</td>
                {orderedDisplayTiers.map(pkg => (
                  <td key={`${pkg.tier_level}-duration`} className="py-3 px-6 text-center text-sm text-slate-400">
                    {pkg.duration_months ? `${pkg.duration_months} month${pkg.duration_months > 1 ? 's' : ''}` : pkg.billing_interval}
                  </td>
                ))}
              </tr>
              {/* Subscribe Button Row */}
              <tr className="bg-slate-800/50">
                <td className="py-6 px-6"></td>
                {orderedDisplayTiers.map(pkg => (
                  <td key={`${pkg.tier_level}-action`} className="py-6 px-6 text-center">
                    <button
                      onClick={() => handleChoosePlan(pkg.id)}
                      className={`w-full max-w-xs mx-auto py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-150 ease-in-out shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                        pkg.tier_level === 'Premium'
                        ? 'bg-indigo-500 hover:bg-indigo-400 text-white focus:ring-indigo-500'
                        : pkg.tier_level === 'Elite'
                        ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-900 focus:ring-yellow-500'
                        : 'bg-slate-600 hover:bg-slate-500 text-white focus:ring-slate-500'
                      }`}
                    >
                      Choose {pkg.tier_level}
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
         <div className="text-center mt-12 text-sm text-slate-500">
            <p>Prices and features are subject to change. Subscriptions auto-renew unless cancelled.</p>
            <p>For more details, please review our Terms of Service.</p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;