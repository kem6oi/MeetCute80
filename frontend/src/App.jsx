import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SubscriptionProvider } from './context/SubscriptionContext'; // Added
import Layout from './components/Layout/Layout';
import LandingPage from './pages/LandingPage'; // Import LandingPage
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmailPage from './pages/VerifyEmailPage'; // Added
import ProfileSetup from './pages/ProfileSetup';
import WithdrawalPage from './pages/WithdrawalPage'; // Import WithdrawalPage
import Dashboard from './pages/Dashboard';
import Discover from './pages/Discover';
import Messages from './pages/Messages';
import AdminDashboard from './pages/AdminDashboard';
import AdminWithdrawalsPage from './pages/Admin/AdminWithdrawalsPage'; // Import AdminWithdrawalsPage
import NotFound from './pages/NotFound';
import Matches from './pages/Matches';
import Gifts from './pages/Gifts';
import Premium from './pages/Premium';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Suspended from './pages/Suspended';
import Pricing from './pages/Pricing';
import SubscriptionConfirmation from './pages/SubscriptionConfirmation';
import ConfirmSubscriptionPage from './pages/ConfirmSubscriptionPage'; // Added
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <SubscriptionProvider> {/* Wrapped with SubscriptionProvider */}
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} /> {/* Added */}
            <Route path="/suspended" element={<Suspended />} />
            <Route path="/profile-setup" element={
              <PrivateRoute>
                <ProfileSetup />
              </PrivateRoute>
            } />
            <Route path="/subscription/confirmation" element={
              <PrivateRoute>
                <SubscriptionConfirmation />
              </PrivateRoute>
            } />
            <Route path="/subscribe/:packageId" element={ // Added route
              <PrivateRoute>
                <ConfirmSubscriptionPage />
              </PrivateRoute>
            } />
            <Route element={<Layout />}> {/* Layout and its children will have context */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/discover" element={<Discover />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:userId" element={<Messages />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/gifts" element={<Gifts />} />
            <Route path="/premium" element={<Premium />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/withdrawals" element={<PrivateRoute><WithdrawalPage /></PrivateRoute>} /> {/* Added WithdrawalPage route */}
          </Route>

          <Route path="/admin" element={
            <PrivateRoute adminOnly={true}> {/* Assuming PrivateRoute can take adminOnly */}
              <AdminDashboard />
            </PrivateRoute>
          } />
          <Route path="/admin/withdrawals" element={
            <PrivateRoute adminOnly={true}> {/* Assuming PrivateRoute can take adminOnly */}
              <AdminWithdrawalsPage />
            </PrivateRoute>
          } />
          
          {/* Fallback routes */}
          <Route path="/" element={<LandingPage />} /> {/* Changed root path to LandingPage */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </SubscriptionProvider> {/* Closed SubscriptionProvider */}
      </AuthProvider>
    </Router>
  );
}

export default App;