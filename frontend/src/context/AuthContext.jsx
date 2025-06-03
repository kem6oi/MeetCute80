import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const updateUserState = (token) => {
    if (token) {
      const decoded = jwtDecode(token);
      setCurrentUser({
        token,
        id: decoded.id,
        role: decoded.role
      });
      localStorage.setItem('token', token);
    } else {
      setCurrentUser(null);
      localStorage.removeItem('token');
    }
  };

  const register = async (email, password, additionalData = {}) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email, 
        password,
        phone: additionalData.phone || '',
        countryId: additionalData.countryId || null
      })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }
    updateUserState(data.token);
    return data;
  };

  const login = async (email, password) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    
    if (!res.ok) {
      // Check if the error is due to suspension
      if (res.status === 403 && data.status === 'suspended') {
        navigate('/suspended', { 
          state: { 
            reason: data.reason,
            suspendedAt: data.suspended_at 
          }
        });
        throw new Error('Account suspended');
      }
      throw new Error(data.error || 'Login failed');
    }
    
    updateUserState(data.token);
    
    // Check if user has completed their profile
    if (data.profile_complete === false) {
      // Redirect to profile setup page
      navigate('/profile-setup');
    }
    
    return data;
  };

  const logout = () => {
    updateUserState(null);
    navigate('/login');
  };

  // Check if user needs to complete their profile
  const checkProfileComplete = async () => {
    if (!currentUser) return;
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      const data = await res.json();
      
      if (res.ok && data.profile_complete === false) {
        // Don't redirect from profile setup or login pages
        const currentPath = window.location.pathname;
        if (currentPath !== '/profile-setup' && currentPath !== '/login' && currentPath !== '/register') {
          navigate('/profile-setup');
        }
      }
    } catch (error) {
      console.error('Error checking profile status:', error);
    }
  };
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        updateUserState(token);
      } catch (e) {
        localStorage.removeItem('token');
        setCurrentUser(null);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (currentUser) {
      checkProfileComplete();
    }
  }, [currentUser]);

  const value = {
    currentUser,
    loading,
    register,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}