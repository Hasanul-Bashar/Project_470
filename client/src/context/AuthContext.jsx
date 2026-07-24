import { createContext, useContext, useState, useEffect } from 'react';

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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

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

  /** Flip between User ↔ Admin and persist the new token */
  const toggleRole = () => {
    const next = user?.role === 'admin' ? DEMO_USER : DEMO_ADMIN;
    localStorage.setItem('mock_token', encodeToken(next));
    setUser(next);
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
