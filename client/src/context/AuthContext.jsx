import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AuthContext = createContext(null);

/** Encode a JS object as a base64 token */
const encodeToken = (payload) => btoa(JSON.stringify(payload));

/** Decode a base64 token back to a JS object */
const decodeToken = (token) => {
  try { return JSON.parse(atob(token)); }
  catch { return null; }
};

// Standard Default User for initial cold visit
const DEFAULT_DEMO_USER = {
  id: 'demo-user-001',
  firstName: 'Demo',
  lastName: 'User',
  name: 'Demo User',
  email: 'demo.user@rentease.com',
  role: 'user',
  isVerified: true,
  isFirstLogin: false,
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const navigate = useNavigate();

  // On mount: restore user profile & role token from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('mock_token');
    const storedProfile = localStorage.getItem('user_profile');

    if (storedProfile) {
      try {
        const parsed = JSON.parse(storedProfile);
        setUser(parsed);
        return;
      } catch (e) {
        console.error('Failed to parse stored user profile', e);
      }
    }

    if (storedToken) {
      const decoded = decodeToken(storedToken);
      if (decoded?.role) {
        setUser(decoded);
        return;
      }
    }

    // Default to standard user on first cold boot
    localStorage.setItem('mock_token', encodeToken(DEFAULT_DEMO_USER));
    localStorage.setItem('user_profile', JSON.stringify(DEFAULT_DEMO_USER));
    setUser(DEFAULT_DEMO_USER);
  }, []);

  /** Open the Role Gateway Modal */
  const openRoleModal = (roleTarget = null) => {
    setSelectedRole(roleTarget);
    setIsRoleModalOpen(true);
  };

  /** Close the Role Gateway Modal */
  const closeRoleModal = () => {
    setIsRoleModalOpen(false);
    setSelectedRole(null);
  };

  /** Perform Signup API Call */
  const signup = async (formData) => {
    const res = await axios.post('/api/auth/signup', formData);
    return res.data;
  };

  /** Resend OTP API Call */
  const resendOtp = async (email) => {
    const res = await axios.post('/api/auth/resend-otp', { email });
    return res.data;
  };

  /** Perform OTP Verification API Call */
  const verifyOtp = async (email, otp) => {
    const res = await axios.post('/api/auth/verify-otp', { email, otp });
    const { token, user: userData } = res.data;

    if (token && userData) {
      localStorage.setItem('mock_token', token);
      localStorage.setItem('user_profile', JSON.stringify(userData));
      setUser(userData);
      closeRoleModal();

      // Navigate based on role
      if (userData.role === 'landlord') navigate('/landlord-dashboard');
      else if (userData.role === 'admin') navigate('/admin');
      else navigate('/user-dashboard');
    }

    return res.data;
  };

  /** Perform Login API Call */
  const login = async (credentials) => {
    const res = await axios.post('/api/auth/login', credentials);
    const { token, user: userData } = res.data;

    if (token && userData) {
      localStorage.setItem('mock_token', token);
      localStorage.setItem('user_profile', JSON.stringify(userData));
      setUser(userData);
      closeRoleModal();

      // Navigate based on role
      if (userData.role === 'landlord') navigate('/landlord-dashboard');
      else if (userData.role === 'admin') navigate('/admin');
      else navigate('/user-dashboard');
    }

    return res.data;
  };

  /** Logout current session */
  const logout = () => {
    localStorage.removeItem('mock_token');
    localStorage.removeItem('user_profile');
    setUser(null);
    openRoleModal();
  };

  /** Get active token */
  const getToken = () => localStorage.getItem('mock_token') || '';

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isRoleModalOpen,
        selectedRole,
        openRoleModal,
        closeRoleModal,
        signup,
        resendOtp,
        verifyOtp,
        login,
        logout,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
