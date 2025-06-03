import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaGift, FaHeart, FaPaperPlane, FaInbox } from 'react-icons/fa';

const Gifts = () => {
  const [activeTab, setActiveTab] = useState('available');
  const [giftItems, setGiftItems] = useState([]);
  const [receivedGifts, setReceivedGifts] = useState([]);
  const [sentGifts, setSentGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGift, setSelectedGift] = useState(null);
  const [recipientId, setRecipientId] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'available') {
        const res = await fetch('http://localhost:5000/api/gifts/items', {
          headers: {
            'x-auth-token': currentUser.token
          }
        });
        const data = await res.json();
        if (res.ok) {
          setGiftItems(data);
        } else {
          throw new Error(data.error);
        }
      } else if (activeTab === 'received') {
        const res = await fetch('http://localhost:5000/api/gifts/received', {
          headers: {
            'x-auth-token': currentUser.token
          }
        });
        const data = await res.json();
        if (res.ok) {
          setReceivedGifts(data);
        } else {
          throw new Error(data.error);
        }
      } else if (activeTab === 'sent') {
        const res = await fetch('http://localhost:5000/api/gifts/sent', {
          headers: {
            'x-auth-token': currentUser.token
          }
        });
        const data = await res.json();
        if (res.ok) {
          setSentGifts(data);
        } else {
          throw new Error(data.error);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendGift = async () => {
    if (!selectedGift || !recipientId) {
      setError('Please select a gift and recipient');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/gifts/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': currentUser.token
        },
        body: JSON.stringify({
          recipientId,
          giftItemId: selectedGift.id,
          message,
          isAnonymous
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSelectedGift(null);
        setRecipientId('');
        setMessage('');
        setIsAnonymous(false);
        alert('Gift sent successfully!');
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Gifts</h1>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6">
        <button
          className={`flex items-center gap-2 px-4 py-2 rounded-full ${
            activeTab === 'available'
              ? 'bg-[var(--primary)] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          onClick={() => setActiveTab('available')}
        >
          <FaGift /> Available Gifts
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2 rounded-full ${
            activeTab === 'received'
              ? 'bg-[var(--primary)] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          onClick={() => setActiveTab('received')}
        >
          <FaInbox /> Received Gifts
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2 rounded-full ${
            activeTab === 'sent'
              ? 'bg-[var(--primary)] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          onClick={() => setActiveTab('sent')}
        >
          <FaPaperPlane /> Sent Gifts
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Available Gifts */}
      {activeTab === 'available' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {giftItems.map(gift => (
            <div
              key={gift.id}
              className={`bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transform transition-transform hover:scale-105 ${
                selectedGift?.id === gift.id ? 'ring-2 ring-[var(--primary)]' : ''
              }`}
              onClick={() => setSelectedGift(gift)}
            >
              <div className="relative h-48">
                {gift.image_url ? (
                  <img
                    src={gift.image_url}
                    alt={gift.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <FaGift className="text-4xl text-gray-400" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-xl font-semibold mb-2">{gift.name}</h3>
                <p className="text-gray-600 mb-2">{gift.description}</p>
                <p className="text-[var(--primary)] font-bold">${gift.price}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Send Gift Form */}
      {activeTab === 'available' && selectedGift && (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg p-6">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-lg font-semibold mb-4">Send Gift</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Recipient ID"
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                className="border rounded-lg px-4 py-2"
              />
              <input
                type="text"
                placeholder="Add a message (optional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="border rounded-lg px-4 py-2"
              />
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="anonymous"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="anonymous">Send anonymously</label>
              </div>
              <button
                onClick={handleSendGift}
                className="bg-[var(--primary)] text-white px-6 py-2 rounded-full hover:bg-[var(--primary-dark)] transition-colors"
              >
                Send Gift
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Received Gifts */}
      {activeTab === 'received' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {receivedGifts.map(gift => (
            <div key={gift.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="relative h-48">
                {gift.image_url ? (
                  <img
                    src={gift.image_url}
                    alt={gift.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <FaGift className="text-4xl text-gray-400" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-xl font-semibold mb-2">{gift.name}</h3>
                <p className="text-gray-600 mb-2">From: {gift.sender_name}</p>
                {gift.message && (
                  <p className="text-gray-600 italic mb-2">"{gift.message}"</p>
                )}
                <p className="text-sm text-gray-500">
                  Received {new Date(gift.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sent Gifts */}
      {activeTab === 'sent' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sentGifts.map(gift => (
            <div key={gift.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="relative h-48">
                {gift.image_url ? (
                  <img
                    src={gift.image_url}
                    alt={gift.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <FaGift className="text-4xl text-gray-400" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-xl font-semibold mb-2">{gift.name}</h3>
                <p className="text-gray-600 mb-2">To: {gift.recipient_name}</p>
                {gift.message && (
                  <p className="text-gray-600 italic mb-2">"{gift.message}"</p>
                )}
                <p className="text-sm text-gray-500">
                  Sent {new Date(gift.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Gifts;