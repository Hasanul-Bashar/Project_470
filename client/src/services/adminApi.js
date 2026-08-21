import axios from 'axios';

/**
 * adminApi.js
 * ───────────
 * Axios instance for /api/admin/* endpoints.
 * The Vite proxy (vite.config.js) forwards /api requests to http://localhost:5000,
 * so we use a relative base URL — no CORS issues during development.
 *
 * Every request automatically includes the mock JWT from localStorage.
 */
const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mock_token') || '';
  const userProfile = localStorage.getItem('user_profile') || '';
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  if (userProfile) config.headers['X-User-Data'] = userProfile;
  return config;
});

// ── Admin Stats ───────────────────────────────────────────────
export const getStats = () =>
  api.get('/admin/stats');

// ── Landlord Verification ─────────────────────────────────────
export const getPendingLandlords = () =>
  api.get('/admin/landlords/pending');

export const verifyLandlord = (id, action) =>
  api.patch(`/admin/landlords/${id}/verify`, { action });

// ── Listing Approval ──────────────────────────────────────────
export const getPendingListings = () =>
  api.get('/admin/listings/pending');

export const updateListingStatus = (id, status) =>
  api.patch(`/admin/listings/${id}/status`, { status });
