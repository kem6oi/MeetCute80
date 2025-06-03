import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ProfileSetup from './pages/ProfileSetup';
import Dashboard from './pages/Dashboard';
import Discover from './pages/Discover';
import Messages from './pages/Messages';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';
import Matches from './pages/Matches';
import Gifts from './pages/Gifts';
import Premium from './pages/Premium';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Suspended from './pages/Suspended';
import Pricing from './pages/Pricing';
import SubscriptionConfirmation from './pages/SubscriptionConfirmation';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/suspended" element={<Suspended />} />
          <Route path="/profile-setup" element={<ProfileSetup />} />
          <Route path="/subscription/confirmation" element={
            <PrivateRoute>
              <SubscriptionConfirmation />
            </PrivateRoute>
          } />
          <Route element={<Layout />}>
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
          </Route>

          <Route path="/admin" element={
            <PrivateRoute>
              <AdminDashboard />
            </PrivateRoute>
          } />
          
          {/* Fallback routes */}
          <Route path="/" element={<Login />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;