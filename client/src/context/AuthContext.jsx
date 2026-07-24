import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

/** Encode a JS object as a base64 mock token */
const encodeToken = (payload) => btoa(JSON.stringify(payload));

/** Decode a base64 mock token back to a JS object */
const decodeToken = (token) => {
  try { return JSON.parse(atob(token)); }
  catch { return null; }
};

// Default personas — used when role is toggled
const DEMO_USER = {
  id:    'demo-user-001',
  name:  'Demo User',
  email: 'demo.user@rentease.com',
  role:  'user',
};

const DEMO_ADMIN = {
  id:    'demo-admin-001',
  name:  'Super Admin',
  email: 'admin@rentease.com',
  role:  'admin',
};

const DEMO_LANDLORD = {
  id:    'demo-landlord-001',
  name:  'Alice Landlord',
  email: 'alice.rahman@landlord.com',
  role:  'landlord',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // On mount: restore role from localStorage, or default to User
  useEffect(() => {
    const stored = localStorage.getItem('mock_token');
    if (stored) {
      const decoded = decodeToken(stored);
      if (decoded?.role) { setUser(decoded); return; }
    }
    // First visit — default to standard user
    localStorage.setItem('mock_token', encodeToken(DEMO_USER));
    setUser(DEMO_USER);
  }, []);

  /** Flip between User ↔ Landlord ↔ Admin and persist the new token */
  const toggleRole = () => {
    let next;
    let nextPath;
    if (user?.role === 'user') {
      next = DEMO_LANDLORD;
      nextPath = '/listings';
    } else if (user?.role === 'landlord') {
      next = DEMO_ADMIN;
      nextPath = '/admin';
    } else {
      next = DEMO_USER;
      nextPath = '/complaints';
    }
    localStorage.setItem('mock_token', encodeToken(next));
    setUser(next);
    navigate(nextPath);
  };


  /** Returns the raw base64 token string (used by Axios interceptors) */
  const getToken = () => localStorage.getItem('mock_token') || '';

  // Don't render children until auth state is resolved (avoids flash)
  if (!user) return null;

  return (
    <AuthContext.Provider value={{ user, toggleRole, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
