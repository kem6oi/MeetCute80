import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaHeart, FaComment, FaTimes } from 'react-icons/fa';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

const Matches = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const response = await api.get('/api/matches');
      setMatches(response.data);
    } catch (err) {
      console.error('Error fetching matches:', err);
      setError(err.response?.data?.error || 'Failed to fetch matches');
    } finally {
      setLoading(false);
    }
  };

  const handleUnmatch = async (matchId) => {
    if (!window.confirm('Are you sure you want to unmatch?')) return;

    try {
      await api.delete(`/api/matches/${matchId}`);
      setMatches(matches.filter(match => match.id !== matchId));
    } catch (err) {
      console.error('Error unmatching:', err);
      setError(err.response?.data?.error || 'Failed to unmatch');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Your Matches</h1>
      
      {matches.length === 0 ? (
        <div className="text-center py-10">
          <div className="text-6xl mb-4">💝</div>
          <h2 className="text-xl font-semibold mb-2">No matches yet</h2>
          <p className="text-gray-600">Keep swiping to find your perfect match!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {console.log('Rendering matches:', matches)}
          {matches.map(match => (
            <div key={match.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="relative h-48">
                {match.matchedUser.profilePic ? (
                  <>
                    <img 
                      src={`${import.meta.env.VITE_API_URL}${match.matchedUser.profilePic}`} 
                      alt={`${match.matchedUser.firstName}'s profile`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.log('Image failed to load:', e.target.src);
                        e.target.onerror = null; // Prevent infinite error loop
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'flex';
                      }}
                    />
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white text-4xl font-bold hidden">
                      {match.matchedUser.firstName ? match.matchedUser.firstName[0] : '?'}
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white text-4xl font-bold">
                    {match.matchedUser.firstName ? match.matchedUser.firstName[0] : '?'}
                  </div>
                )}
              </div>
              
              <div className="p-4">
                <h3 className="text-xl font-semibold mb-2">
                  {match.matchedUser.firstName} {match.matchedUser.lastName}
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Matched {new Date(match.createdAt).toLocaleDateString()}
                </p>
                
                <div className="flex justify-between items-center">
                  <button 
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-full hover:bg-[var(--primary-dark)] transition-colors"
                    onClick={() => {
                      // Store match data in sessionStorage before navigating
                      sessionStorage.setItem(
                        `match_user_${match.matchedUser.id}`, 
                        JSON.stringify(match.matchedUser)
                      );
                      navigate(`/messages/${match.matchedUser.id}`);
                    }}
                  >
                    <FaComment /> Chat
                  </button>
                  
                  <button 
                    className="flex items-center gap-2 px-4 py-2 text-red-500 hover:text-red-700 transition-colors"
                    onClick={() => handleUnmatch(match.id)}
                  >
                    <FaTimes /> Unmatch
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Matches; 