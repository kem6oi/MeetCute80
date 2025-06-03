import React from 'react';
import { FaUsers, FaUserCheck, FaCrown, FaDollarSign, FaChartLine } from 'react-icons/fa';

const StatCard = ({ title, value, icon: Icon, trend }) => (
  <div className="bg-white rounded-xl shadow-md p-6">
    <div className="flex items-center justify-between mb-4">
      <div className="w-12 h-12 rounded-full bg-[var(--primary-light)] flex items-center justify-center">
        <Icon className="text-[var(--primary)] text-xl" />
      </div>
      {trend && (
        <span className={`text-sm font-medium ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <h3 className="text-[var(--text-light)] text-sm font-medium mb-1">{title}</h3>
    <div className="text-2xl font-bold text-[var(--dark)]">
      {typeof value === 'number' && title.toLowerCase().includes('revenue') 
        ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
        : value.toLocaleString()}
    </div>
  </div>
);

const AdminStats = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
      <StatCard
        title="Total Users"
        value={stats.totalUsers}
        icon={FaUsers}
      />
      <StatCard
        title="Active Users"
        value={stats.activeUsers}
        icon={FaUserCheck}
      />
      <StatCard
        title="Premium Users"
        value={stats.premiumUsers}
        icon={FaCrown}
      />
      <StatCard
        title="Monthly Revenue"
        value={stats.monthlyRevenue}
        icon={FaDollarSign}
      />
      <StatCard
        title="Paying Users"
        value={stats.payingUsers}
        icon={FaChartLine}
      />
    </div>
  );
};

export default AdminStats;