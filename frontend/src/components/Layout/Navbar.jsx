import { FaSearch, FaBell, FaEnvelope, FaMoneyBillWave } from 'react-icons/fa'; // Added FaMoneyBillWave
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Import Link
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import UserBalanceDisplay from '../UserBalanceDisplay'; // Import UserBalanceDisplay

const Navbar = () => {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/api/user/profile/me');
        setProfile(response.data);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }
    };

    if (currentUser?.token) {
      fetchProfile();
    }
  }, [currentUser]);

  const getInitial = () => {
    if (profile?.first_name) {
      return profile.first_name[0].toUpperCase();
    }
    return '?';
  };

  return (
    <div className="bg-white shadow-sm py-4 px-6 flex items-center justify-between">
      <h2 className="text-2xl font-bold text-[var(--dark)]">Dashboard</h2>

      <div className="flex items-center space-x-6">
        <div className="relative">
          <FaSearch className="text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary-light)]"
          />
        </div>

        <div className="flex space-x-4 items-center"> {/* Added items-center */}
          <Link to="/withdrawals" className="relative p-2 rounded-full hover:bg-[var(--light)] transition-colors" title="Withdrawals">
            <FaMoneyBillWave className="text-xl text-green-600" />
          </Link>
          <button className="relative p-2 rounded-full hover:bg-[var(--light)] transition-colors" title="Notifications">
            <FaBell className="text-xl text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--primary)] rounded-full"></span>
          </button>
          <button className="relative p-2 rounded-full hover:bg-[var(--light)] transition-colors" title="Messages">
            <FaEnvelope className="text-xl text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--primary)] rounded-full"></span>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] flex items-center justify-center text-white font-semibold">
            {getInitial()}
          </div>
          <div>
            <p className="font-medium text-sm">
              {profile ? `${profile.first_name} ${profile.last_name}` : 'Loading...'}
            </p>
            {/* <p className="text-xs text-gray-500">Member</p> */}
            <UserBalanceDisplay className="text-xs text-gray-500" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;