import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import UserManagement from '../components/Admin/UserManagement';
import RevenueReport from '../components/Admin/RevenueReport';
import ModerationPanel from '../components/Admin/ModerationPanel';
import SubscriptionManagement from '../components/Admin/SubscriptionManagement';
import AdminStats from '../components/Admin/AdminStats';
import GlobalPaymentMethodsManager from '../components/Admin/GlobalPaymentMethodsManager';
import CountryPaymentMethodsManager from '../components/Admin/CountryPaymentMethodsManager';
import AdminTransactionVerification from '../components/Admin/AdminTransactionVerification'; // Import new component
import api from '../utils/api';
import { FaUsers, FaChartLine, FaShieldAlt, FaTags, FaMoneyCheckAlt, FaTasks } from 'react-icons/fa'; // Added FaTasks

const AdminDashboard = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    premiumUsers: 0,
    monthlyRevenue: 0,
    payingUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const response = await api.get('/api/admin/stats');
        setStats(response.data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch dashboard stats');
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser?.token) {
      fetchDashboardStats();
    }
  }, [currentUser]);

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--light)] to-[var(--accent)] p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden text-center p-8">
          <div className="w-24 h-24 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>
          <h3 className="text-xl font-bold text-[var(--dark)] mb-2">Admin Access Required</h3>
          <p className="text-[var(--text-light)] mb-6">
            You don't have permission to access this page. Please contact an administrator.
          </p>
          <a 
            href="/dashboard" 
            className="btn-primary px-6 py-3 inline-block"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--light)] to-[var(--accent)] p-4">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--light)] to-[var(--accent)] p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden text-center p-8">
          <div className="w-24 h-24 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h3 className="text-xl font-bold text-[var(--dark)] mb-2">Error Loading Dashboard</h3>
          <p className="text-[var(--text-light)] mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="btn-primary px-6 py-3 inline-block"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--dark)]">Admin Dashboard</h1>
        <p className="text-[var(--text-light)]">Manage users, revenue, subscriptions, and platform moderation</p>
      </div>

      {/* Quick Stats */}
      <AdminStats stats={stats} />

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'users'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--text-light)] hover:text-[var(--primary)]'
          }`}
          onClick={() => setActiveTab('users')}
        >
          <span className="flex items-center">
            <FaUsers className="w-4 h-4 mr-2" />
            User Management
          </span>
        </button>
        <button
          className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'revenue'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--text-light)] hover:text-[var(--primary)]'
          }`}
          onClick={() => setActiveTab('revenue')}
        >
          <span className="flex items-center">
            <FaChartLine className="w-4 h-4 mr-2" />
            Revenue Reports
          </span>
        </button>
        <button
          className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'subscriptions'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--text-light)] hover:text-[var(--primary)]'
          }`}
          onClick={() => setActiveTab('subscriptions')}
        >
          <span className="flex items-center">
            <FaTags className="w-4 h-4 mr-2" />
            Subscription Plans
          </span>
        </button>
        <button
          className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'moderation'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--text-light)] hover:text-[var(--primary)]'
          }`}
          onClick={() => setActiveTab('moderation')}
        >
          <span className="flex items-center">
            <FaShieldAlt className="w-4 h-4 mr-2" />
            Moderation Tools
          </span>
        </button>
        <button
          className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'paymentMethods'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--text-light)] hover:text-[var(--primary)]'
          }`}
          onClick={() => setActiveTab('paymentMethods')}
        >
          <span className="flex items-center">
            <FaMoneyCheckAlt className="w-4 h-4 mr-2" />
            Payment Methods
          </span>
        </button>
        <button
          className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'verifyTransactions'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--text-light)] hover:text-[var(--primary)]'
          }`}
          onClick={() => setActiveTab('verifyTransactions')}
        >
          <span className="flex items-center">
            <FaTasks className="w-4 h-4 mr-2" />
            Verify Transactions
          </span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'revenue' && <RevenueReport />}
        {activeTab === 'subscriptions' && <SubscriptionManagement />}
        {activeTab === 'moderation' && <ModerationPanel />}
        {activeTab === 'paymentMethods' && (
          <div className="space-y-8 p-4 md:p-6">
            <GlobalPaymentMethodsManager />
            <CountryPaymentMethodsManager />
          </div>
        )}
        {activeTab === 'verifyTransactions' && (
          <div className="p-4 md:p-6"> {/* Added padding */}
            <AdminTransactionVerification />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;