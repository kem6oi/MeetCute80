import { useState, useEffect } from 'react';
import { FaHeart, FaComments, FaEye, FaArrowUp, FaBell, FaSpinner } from 'react-icons/fa';
import Card from '../components/UI/Card';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentUser || !currentUser.token) {
        console.log('No authenticated user or missing token');
        setError('Please log in to view your dashboard');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching dashboard data with token:', currentUser.token.substring(0, 10) + '...');
        
        // Fetch stats and activity in parallel
        const [statsResponse, activitiesResponse] = await Promise.all([
          api.get('/api/dashboard/stats'),
          api.get('/api/dashboard/activity')
        ]);
        
        setDashboardStats(statsResponse.data);
        setActivities(activitiesResponse.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        if (err.response?.status === 401) {
          setError('Authentication failed. Please log in again.');
        } else {
          setError('Failed to load dashboard data. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser]);
  
  // If we're still loading or don't have stats yet, use placeholders
  const stats = dashboardStats ? [
    { 
      title: 'Matches', 
      value: dashboardStats.matches.total.toString(), 
      icon: <FaHeart className="text-2xl" />,
      description: 'Your connections',
      metrics: [
        { label: 'Today', value: dashboardStats.matches.today.toString() },
        { label: 'This Week', value: dashboardStats.matches.week.toString() },
        { label: 'Total', value: dashboardStats.matches.total.toString() },
      ]
    },
    { 
      title: 'Messages', 
      value: dashboardStats.messages.unread.toString(), 
      icon: <FaComments className="text-2xl" />,
      description: 'Unread conversations',
      metrics: [
        { label: 'New Today', value: dashboardStats.messages.today.toString() },
        { label: 'This Week', value: dashboardStats.messages.week.toString() },
        { label: 'Total', value: dashboardStats.messages.total.toString() },
      ]
    },
    { 
      title: 'Profile Views', 
      value: dashboardStats.profileViews.total.toString(), 
      icon: <FaEye className="text-2xl" />,
      description: 'People viewed your profile',
      metrics: [
        { label: 'Today', value: dashboardStats.profileViews.today.toString() },
        { label: 'This Week', value: dashboardStats.profileViews.week.toString() },
        { label: 'Total', value: dashboardStats.profileViews.total.toString() },
      ]
    }
  ] : [
    { 
      title: 'Matches', 
      value: '...', 
      icon: <FaHeart className="text-2xl" />,
      description: 'Your connections',
      metrics: [
        { label: 'Today', value: '...' },
        { label: 'This Week', value: '...' },
        { label: 'Total', value: '...' },
      ]
    },
    { 
      title: 'Messages', 
      value: '...', 
      icon: <FaComments className="text-2xl" />,
      description: 'Unread conversations',
      metrics: [
        { label: 'New Today', value: '...' },
        { label: 'This Week', value: '...' },
        { label: 'Total', value: '...' },
      ]
    },
    { 
      title: 'Profile Views', 
      value: '...', 
      icon: <FaEye className="text-2xl" />,
      description: 'People viewed your profile',
      metrics: [
        { label: 'Today', value: '...' },
        { label: 'This Week', value: '...' },
        { label: 'Total', value: '...' },
      ]
    }
  ];
  
  // Get activity icon based on type
  const getActivityIcon = (type) => {
    switch (type) {
      case 'match':
        return <FaHeart className="text-xl" />;
      case 'message':
        return <FaComments className="text-xl" />;
      case 'view':
        return <FaEye className="text-xl" />;
      default:
        return <FaBell className="text-xl" />;
    }
  };
  
  // Handle navigation to a user's profile or messages
  const handleActivityAction = (activity) => {
    if (activity.type === 'message') {
      navigate(`/messages/${activity.userId}`);
    } else {
      navigate(`/profile/${activity.userId}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Display error message if there was an error */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-md">
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-[var(--dark)]">{stat.title}</h3>
              <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center text-[var(--primary)]">
                {loading ? <FaSpinner className="text-2xl animate-spin" /> : stat.icon}
              </div>
            </div>
            <div className="text-3xl font-bold text-[var(--dark)] mb-1">
              {loading ? <div className="w-16 h-8 bg-gray-200 animate-pulse rounded"></div> : stat.value}
            </div>
            <p className="text-sm text-[var(--text-light)] mb-4">{stat.description}</p>
            <div className="flex justify-between border-t border-gray-100 pt-4">
              {stat.metrics.map((metric, i) => (
                <div key={i} className="text-center">
                  <div className="text-xl font-bold">
                    {loading ? (
                      <div className="w-8 h-6 bg-gray-200 animate-pulse rounded mx-auto"></div>
                    ) : (
                      metric.value
                    )}
                  </div>
                  <div className="text-xs text-[var(--text-light)]">{metric.label}</div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="section-title">
          <FaBell className="mr-2 text-[var(--primary)]" />
          Recent Activity
        </h3>
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {loading ? (
            // Activity skeleton loaders
            Array(3).fill(0).map((_, index) => (
              <div key={index} className="p-5 border-b border-gray-100 last:border-0">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse mr-4"></div>
                  <div className="flex-1">
                    <div className="w-1/3 h-5 bg-gray-200 animate-pulse rounded mb-2"></div>
                    <div className="w-2/3 h-4 bg-gray-200 animate-pulse rounded mb-1"></div>
                    <div className="w-1/4 h-3 bg-gray-200 animate-pulse rounded"></div>
                  </div>
                </div>
              </div>
            ))
          ) : activities.length > 0 ? (
            activities.map((activity, index) => (
              <div 
                key={index} 
                className="p-5 border-b border-gray-100 last:border-0 hover:bg-[var(--light)] transition-colors cursor-pointer"
                onClick={() => handleActivityAction(activity)}
              >
                <div className="flex">
                  <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center text-[var(--primary)] mr-4">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div>
                    <h4 className="font-semibold">{activity.title}</h4>
                    <p className="text-sm text-[var(--text-light)]">{activity.description}</p>
                    <p className="text-xs text-[var(--text-light)] mt-1">{activity.relativeTime}</p>
                  </div>
                  <button className="ml-auto self-start text-[var(--primary)] hover:text-[var(--primary-dark)]">
                    <FaArrowUp className="rotate-45" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-5 text-center text-gray-500">
              <p>No recent activity to display</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;