import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token   = localStorage.getItem('mock_token') || '';
  const profile = localStorage.getItem('user_profile') || '';
  config.headers['Authorization'] = `Bearer ${token}`;
  if (profile) config.headers['x-user-data'] = profile;
  return config;
});

/** POST /api/reviews — submit a new review */
export const createReview = (data) => api.post('/reviews', data);

/** GET /api/reviews/listing/:id — property reviews for a listing */
export const getReviewsByListing = (listingId) => api.get(`/reviews/listing/${listingId}`);

/** GET /api/reviews/tenant/:id — tenant reviews for a tenant user */
export const getReviewsByTenant = (tenantId) => api.get(`/reviews/tenant/${tenantId}`);

/** GET /api/reviews/mine — reviews authored by the current user */
export const getMyReviews = () => api.get('/reviews/mine');
