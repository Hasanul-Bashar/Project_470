import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mock_token') || '';
  const userProfile = localStorage.getItem('user_profile') || localStorage.getItem('user_data');
  config.headers['Authorization'] = `Bearer ${token}`;
  if (userProfile) {
    config.headers['x-user-profile'] = userProfile;
    config.headers['x-user-data'] = userProfile;
  }
  return config;
});

export const getStats = () =>
  api.get('/admin/stats');

export const getPendingLandlords = () =>
  api.get('/admin/landlords/pending');

export const verifyLandlord = (id, action) =>
  api.patch(`/admin/landlords/${id}/verify`, { action });

export const getPendingListings = () =>
  api.get('/admin/listings/pending');

export const updateListingStatus = (id, status) =>
  api.patch(`/admin/listings/${id}/status`, { status });
