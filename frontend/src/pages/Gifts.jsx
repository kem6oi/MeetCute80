import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Added useMemo
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import api from '../utils/api';
import { FaGift, FaPaperPlane, FaInbox, FaLock, FaCrown, FaRedeem, FaCheckCircle } from 'react-icons/fa'; // Added FaRedeem, FaCheckCircle
import { balanceEventEmitter } from '../components/UserBalanceDisplay'; // Import the event emitter

const TIER_VALUE = { 'Basic': 1, 'Premium': 2, 'Elite': 3 };

const Gifts = () => {
  const [activeTab, setActiveTab] = useState('available');
  const [giftItems, setGiftItems] = useState([]);
  const [receivedGifts, setReceivedGifts] = useState([]);
  const [sentGifts, setSentGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // General error for page
  const [selectedGift, setSelectedGift] = useState(null);
  const [recipientId, setRecipientId] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // State for redemption
  const [redeemLoading, setRedeemLoading] = useState(null); // Store ID of gift being redeemed
  const [redeemError, setRedeemError] = useState(null);
  // Confirmation modal could be more complex, for now, not adding specific state for it, will use window.confirm
  const [currentBalance, setCurrentBalance] = useState(null);
  const [useSiteBalanceForGift, setUseSiteBalanceForGift] = useState(true); // Default to true if possible
  const [sendGiftLoading, setSendGiftLoading] = useState(false); // Specific loading for sending gift
  const [sendGiftError, setSendGiftError] = useState(null);


  const { currentUser } = useAuth();
  const { subscription: userSubscription, isLoading: isSubscriptionLoading } = useSubscription();

  const userTierValue = useMemo(() =>
    TIER_VALUE[userSubscription?.tier_level || 'Basic'] || 0,
    [userSubscription]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      if (activeTab === 'available') {
        response = await api.get('/gifts/items');
        setGiftItems(response.data || []);
      } else if (activeTab === 'received') {
        response = await api.get('/gifts/received');
        setReceivedGifts(response.data || []);
      } else if (activeTab === 'sent') {
        response = await api.get('/gifts/sent');
        setSentGifts(response.data || []);
      }
    } catch (err) {
      console.error(`Error fetching ${activeTab} gifts:`, err);
      setError(err.response?.data?.error || `Failed to load ${activeTab} gifts.`);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const fetchCurrentBalance = useCallback(async () => {
    try {
        const response = await api.get('/api/balance');
        setCurrentBalance(parseFloat(response.data.balance));
    } catch (err) {
        console.error("Error fetching current balance for gift modal:", err);
        // Not setting a page-level error for this, UserBalanceDisplay handles its own errors
    }
  }, []);

  useEffect(() => {
    if (currentUser) { // Only fetch if authenticated
      fetchData();
      fetchCurrentBalance(); // Fetch balance when component mounts or user changes

      // Listen to balance changes to update local balance for gift modal
      const unsubscribe = balanceEventEmitter.subscribe(fetchCurrentBalance);
      return unsubscribe;
    } else {
      setLoading(false);
      setGiftItems([]);
      setReceivedGifts([]);
      setSentGifts([]);
    }
  }, [activeTab, currentUser, fetchData]); // Using currentUser from useAuth


  const handleSelectGift = (gift) => {
    const requiredTierValue = TIER_VALUE[gift.required_tier_level || 'Basic'] || 0;
    const canSend = userTierValue >= requiredTierValue;
    if (canSend) {
      setSelectedGift(gift);
      setSendGiftError(null); // Clear previous send errors
      // Check if balance is sufficient and set default for checkbox
      if (currentBalance !== null && selectedGift && parseFloat(currentBalance) >= parseFloat(gift.price)) {
        setUseSiteBalanceForGift(true);
      } else {
        setUseSiteBalanceForGift(false);
      }
    } else {
      setSelectedGift(null);
      setError(`You need to be ${gift.required_tier_level} tier or higher to select this gift.`);
    }
  };

  const handleSendGift = async () => {
    if (!selectedGift || !recipientId) {
      setSendGiftError('Please select a gift and specify a recipient user ID.');
      return;
    }

    const requiredTierValue = TIER_VALUE[selectedGift.required_tier_level || 'Basic'] || 0;
    if (userTierValue < requiredTierValue) {
      setSendGiftError(`Your current subscription tier (${userSubscription?.tier_level || 'Basic'}) does not allow sending this ${selectedGift.required_tier_level || 'Basic'} gift. Please upgrade your subscription.`);
      return;
    }

    if (useSiteBalanceForGift && (currentBalance === null || parseFloat(currentBalance) < parseFloat(selectedGift.price))) {
      setSendGiftError('Insufficient balance to send this gift using site balance. Please uncheck the option or add funds (if applicable).');
      return;
    }

    setSendGiftLoading(true);
    setSendGiftError(null);
    try {
      await api.post('/gifts/send', {
        recipientId,
        giftItemId: selectedGift.id,
        message,
        isAnonymous,
        useSiteBalance: useSiteBalanceForGift // Pass the flag
      });

      if (useSiteBalanceForGift) {
        balanceEventEmitter.emit(); // Refresh balance if used
      }

      setSelectedGift(null);
      setRecipientId('');
      setMessage('');
      setIsAnonymous(false);
      setUseSiteBalanceForGift(true); // Reset for next time
      alert('Gift sent successfully!');
      if (activeTab === 'sent') {
        fetchData(); // Refresh sent gifts tab
      }
    } catch (err) {
      console.error('Error sending gift:', err);
      setSendGiftError(err.response?.data?.error || 'Failed to send gift.');
    } finally {
      setSendGiftLoading(false);
    }
  };

  const getTierColor = (tierLevel) => {
    if (tierLevel === 'Elite') return 'border-purple-500';
    if (tierLevel === 'Premium') return 'border-yellow-500';
    return 'border-gray-300'; // For Basic or unspecified
  };

  const getTierBadgeColor = (tierLevel) => {
    if (tierLevel === 'Elite') return 'bg-purple-500 text-white';
    if (tierLevel === 'Premium') return 'bg-yellow-500 text-black';
    return 'bg-gray-400 text-white';
  }

  const handleRedeemGift = async (userGiftId, potentialValue) => {
    if (!window.confirm(`Are you sure you want to redeem this gift for $${potentialValue}? This action cannot be undone.`)) {
      return;
    }

    setRedeemLoading(userGiftId);
    setRedeemError(null);
    try {
      const response = await api.post(`/api/gifts/received/${userGiftId}/redeem`);
      // Update the specific gift in the receivedGifts state
      setReceivedGifts(prevGifts =>
        prevGifts.map(gift =>
          gift.id === userGiftId
            ? { ...gift,
                is_redeemed: true,
                redeemed_value: response.data.redeemedAmount,
                redeemed_at: new Date().toISOString() // Or use response.data.redeemedGift.redeemed_at if available
              }
            : gift
        )
      );
      balanceEventEmitter.emit(); // Notify balance display to refresh
      alert(response.data.message || 'Gift redeemed successfully!'); // Or use a more sophisticated notification
    } catch (err) {
      console.error('Error redeeming gift:', err);
      setRedeemError(err.response?.data?.error || 'Failed to redeem gift.');
      // Display this error near the specific gift or as a general notification
    } finally {
      setRedeemLoading(null);
    }
  };


  if (loading || (currentUser && isSubscriptionLoading)) { // Check currentUser for auth state
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  if (!currentUser) { // Check currentUser for auth state
      return <div className="p-6 text-center text-gray-600">Please log in to view gifts.</div>
  }


  return (
    <div className="p-4 md:p-8 bg-slate-900 min-h-screen text-slate-100">
      <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
        Virtual Gifts
      </h1>

      {/* Tabs */}
      <div className="flex flex-wrap justify-center space-x-2 sm:space-x-4 mb-8">
        {['available', 'received', 'sent'].map(tabName => (
          <button
            key={tabName}
            className={`flex items-center gap-2 px-4 py-2 my-1 rounded-full text-sm sm:text-base font-medium transition-all duration-150 ease-in-out
              ${activeTab === tabName
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-105'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            onClick={() => setActiveTab(tabName)}
          >
            {tabName === 'available' && <FaGift />}
            {tabName === 'received' && <FaInbox />}
            {tabName === 'sent' && <FaPaperPlane />}
            {tabName.charAt(0).toUpperCase() + tabName.slice(1)} Gifts
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-700/30 border border-red-600 text-red-300 p-4 rounded-lg mb-6 max-w-2xl mx-auto text-center">
          {error}
        </div>
      )}

      {/* Available Gifts */}
      {activeTab === 'available' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {giftItems.map(giftItem => { // Renamed to giftItem for clarity
            const requiredTierValue = TIER_VALUE[giftItem.required_tier_level || 'Basic'] || 0;
            const canSend = userTierValue >= requiredTierValue;
            const isSelected = selectedGift?.id === giftItem.id;

            return (
              <div
                key={giftItem.id}
                className={`bg-slate-800 rounded-xl shadow-xl overflow-hidden transition-all duration-200 ease-in-out
                  ${canSend ? 'cursor-pointer hover:shadow-purple-500/30' : 'opacity-60 cursor-not-allowed'}
                  ${isSelected && canSend ? 'ring-2 ring-purple-500 scale-105 shadow-purple-500/50' : 'hover:scale-105'}
                `}
                onClick={() => handleSelectGift(giftItem)}
              >
                <div className="relative h-56">
                  {giftItem.image_url ? (
                    <img src={giftItem.image_url} alt={giftItem.name} className="w-full h-full object-cover"/>
                  ) : (
                    <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                      <FaGift className="text-5xl text-slate-500" />
                    </div>
                  )}
                  {!canSend && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center p-4">
                      <FaLock className="text-4xl text-yellow-400 mb-2" />
                      <p className="text-yellow-300 text-center text-sm">
                        Requires {giftItem.required_tier_level || 'Basic'} Tier
                      </p>
                    </div>
                  )}
                   {giftItem.required_tier_level && giftItem.required_tier_level !== 'Basic' && canSend && (
                     <span className={`absolute top-2 right-2 text-xs font-semibold px-2 py-1 rounded-full shadow-md ${getTierBadgeColor(giftItem.required_tier_level)}`}>
                        {giftItem.required_tier_level} Tier Gift
                     </span>
                   )}
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-2 truncate" title={giftItem.name}>{giftItem.name}</h3>
                  <p className="text-slate-400 text-sm mb-3 h-10 overflow-hidden" title={giftItem.description}>{giftItem.description || 'A wonderful gift.'}</p>
                  <p className="text-2xl font-semibold text-green-400">${giftItem.price}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
            const requiredTierValue = TIER_VALUE[gift.required_tier_level || 'Basic'] || 0;
            const canSend = userTierValue >= requiredTierValue;
            const isSelected = selectedGift?.id === gift.id;

            return (
              <div
                key={gift.id}
                className={`bg-slate-800 rounded-xl shadow-xl overflow-hidden transition-all duration-200 ease-in-out
                  ${canSend ? 'cursor-pointer hover:shadow-purple-500/30' : 'opacity-60 cursor-not-allowed'}
                  ${isSelected && canSend ? 'ring-2 ring-purple-500 scale-105 shadow-purple-500/50' : 'hover:scale-105'}
                `}
                onClick={() => handleSelectGift(gift)}
              >
                <div className="relative h-56">
                  {gift.image_url ? (
                    <img src={gift.image_url} alt={gift.name} className="w-full h-full object-cover"/>
                  ) : (
                    <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                      <FaGift className="text-5xl text-slate-500" />
                    </div>
                  )}
                  {!canSend && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center p-4">
                      <FaLock className="text-4xl text-yellow-400 mb-2" />
                      <p className="text-yellow-300 text-center text-sm">
                        Requires {gift.required_tier_level || 'Basic'} Tier
                      </p>
                    </div>
                  )}
                   {gift.required_tier_level && gift.required_tier_level !== 'Basic' && canSend && (
                     <span className={`absolute top-2 right-2 text-xs font-semibold px-2 py-1 rounded-full shadow-md ${getTierBadgeColor(gift.required_tier_level)}`}>
                        {gift.required_tier_level} Tier Gift
                     </span>
                   )}
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-2 truncate" title={gift.name}>{gift.name}</h3>
                  <p className="text-slate-400 text-sm mb-3 h-10 overflow-hidden" title={gift.description}>{gift.description || 'A wonderful gift.'}</p>
                  <p className="text-2xl font-semibold text-green-400">${gift.price}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Send Gift Form - Modal or Collapsible Section would be better */}
      {activeTab === 'available' && selectedGift && (
         <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => {setSelectedGift(null); setSendGiftError(null);}}>
          <div className="bg-slate-800 p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-md mx-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Send "{selectedGift.name}"</h3>
                <button onClick={() => {setSelectedGift(null); setSendGiftError(null);}} className="text-slate-400 hover:text-slate-200 text-2xl">&times;</button>
            </div>
            {sendGiftError && <p className="bg-red-700/30 text-red-300 p-3 rounded-md mb-4 text-sm">{sendGiftError}</p>}
            <div className="space-y-4">
              <div className="text-center mb-2">
                <p className="text-slate-300">Gift Price: <span className="font-semibold text-green-400">${selectedGift.price}</span></p>
                {currentBalance !== null && (
                  <p className="text-xs text-slate-400">Your Balance: ${currentBalance.toFixed(2)}</p>
                )}
              </div>
              <input
                type="text"
                placeholder="Recipient User ID (temp)"
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              />
              <textarea
                placeholder="Add a message (optional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows="3"
                className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              />
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="anonymous"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="h-4 w-4 bg-slate-700 border-slate-600 text-purple-500 focus:ring-purple-500 rounded mr-2"
                />
                <label htmlFor="anonymous" className="text-sm text-slate-300">Send anonymously</label>
              </div>

              {currentBalance !== null && parseFloat(currentBalance) >= parseFloat(selectedGift.price) && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="useSiteBalance"
                    checked={useSiteBalanceForGift}
                    onChange={(e) => setUseSiteBalanceForGift(e.target.checked)}
                    className="h-4 w-4 bg-slate-700 border-slate-600 text-purple-500 focus:ring-purple-500 rounded mr-2"
                  />
                  <label htmlFor="useSiteBalance" className="text-sm text-slate-300">Use my site balance (${currentBalance.toFixed(2)}) for this purchase</label>
                </div>
              )}

              <button
                onClick={handleSendGift}
                disabled={sendGiftLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-150 ease-in-out disabled:opacity-70"
              >
                {sendGiftLoading ? 'Sending...' :
                  (useSiteBalanceForGift && parseFloat(currentBalance) >= parseFloat(selectedGift.price)
                    ? `Send Gift (from Balance: $${selectedGift.price})`
                    : `Send Gift ($${selectedGift.price})`)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Received Gifts */}
      {activeTab === 'received' && (
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {receivedGifts.map(gift => {
            const potentialValue = gift.original_purchase_price
              ? (parseFloat(gift.original_purchase_price) * 0.73).toFixed(2)
              : null;
            return (
              <div key={gift.id} className={`bg-slate-800 rounded-xl shadow-xl overflow-hidden border-2 ${getTierColor(gift.required_tier_level)}`}>
                <div className="relative h-56">
                  {gift.image_url ? (
                    <img src={gift.image_url} alt={gift.name} className="w-full h-full object-cover"/>
                  ) : (
                    <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                      <FaGift className="text-5xl text-slate-500" />
                    </div>
                  )}
                  {gift.required_tier_level && gift.required_tier_level !== 'Basic' && (
                       <span className={`absolute top-2 right-2 text-xs font-semibold px-2 py-1 rounded-full shadow-md ${getTierBadgeColor(gift.required_tier_level)}`}>
                          {gift.required_tier_level} Tier
                       </span>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-2 truncate" title={gift.name}>{gift.name}</h3>
                  <p className="text-sm text-slate-400 mb-1">From: {gift.is_anonymous ? 'Anonymous' : gift.sender_name || 'Unknown User'}</p>
                  {gift.message && <p className="text-slate-300 italic text-sm mb-2 h-10 overflow-y-auto">"{gift.message}"</p>}
                  <p className="text-xs text-slate-500 mb-3">
                    Received {new Date(gift.created_at).toLocaleDateString()}
                  </p>

                  {gift.is_redeemed ? (
                    <div className="flex items-center text-green-400 text-sm p-2 bg-green-900/30 rounded-md">
                      <FaCheckCircle className="mr-2" />
                      Redeemed for ${gift.redeemed_value} on {new Date(gift.redeemed_at).toLocaleDateString()}
                    </div>
                  ) : potentialValue !== null ? (
                    <div>
                      <button
                        onClick={() => handleRedeemGift(gift.id, potentialValue)}
                        disabled={redeemLoading === gift.id}
                        className="w-full flex items-center justify-center bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white px-4 py-2 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-150 ease-in-out disabled:opacity-70"
                      >
                        <FaRedeem className="mr-2" />
                        {redeemLoading === gift.id ? 'Redeeming...' : `Redeem for $${potentialValue}`}
                      </button>
                      {redeemError && redeemLoading !== gift.id && gift.id === (receivedGifts.find(g => g.id === redeemLoading)?.id || null) && ( // Show error specific to this gift if it was the one attempted
                        <p className="text-red-400 text-xs mt-1 text-center">{redeemError}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">This gift cannot be redeemed (no purchase price recorded).</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sent Gifts */}
      {activeTab === 'sent' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sentGifts.map(gift => (
             <div key={gift.id} className={`bg-slate-800 rounded-xl shadow-xl overflow-hidden border-2 ${getTierColor(gift.required_tier_level)}`}>
             <div className="relative h-56">
               {gift.image_url ? (
                 <img src={gift.image_url} alt={gift.name} className="w-full h-full object-cover"/>
               ) : (
                 <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                   <FaGift className="text-5xl text-slate-500" />
                 </div>
               )}
               {gift.required_tier_level && gift.required_tier_level !== 'Basic' && (
                    <span className={`absolute top-2 right-2 text-xs font-semibold px-2 py-1 rounded-full shadow-md ${getTierBadgeColor(gift.required_tier_level)}`}>
                       {gift.required_tier_level} Tier
                    </span>
               )}
             </div>
             <div className="p-5">
               <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-2 truncate" title={gift.name}>{gift.name}</h3>
               <p className="text-sm text-slate-400 mb-1">To: {gift.recipient_name || 'Unknown User'}</p>
               {gift.message && <p className="text-slate-300 italic text-sm mb-2 h-10 overflow-y-auto">"{gift.message}"</p>}
               <p className="text-xs text-slate-500">
                 Sent {new Date(gift.created_at).toLocaleDateString()}
               </p>
             </div>
           </div>
          ))}
        </div>
      )}
       { (activeTab !== 'available' && (activeTab === 'received' ? receivedGifts : sentGifts).length === 0) && (
            <p className="text-center text-slate-400 py-10 text-lg">No gifts to display in this tab.</p>
        )}
    </div>
  );
};

export default Gifts;