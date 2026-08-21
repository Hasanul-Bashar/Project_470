import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token   = localStorage.getItem('mock_token') || '';
  const profile = localStorage.getItem('user_profile') || '';
  config.headers['Authorization'] = `Bearer ${token}`;
  if (profile) config.headers['x-user-data'] = profile;
  return config;
});

/** GET /api/analytics/landlord — full analytics for current landlord */
export const getMyAnalytics = () => api.get('/analytics/landlord');

/** POST /api/analytics/view/:listingId — fire a view event */
export const recordView = (listingId) => api.post(`/analytics/view/${listingId}`);
