import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mock_token') || '';
  const userProfile = localStorage.getItem('user_profile') || '';
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  if (userProfile) config.headers['X-User-Data'] = userProfile;
  return config;
});

export const getListings = () =>
  api.get('/listings');

export const searchListings = (params) =>
  api.get('/listings/search', { params });

export const createListing = (listingData) =>
  api.post('/listings', listingData);

export const updateListingAvailability = (id, bookedDates) =>
  api.patch(`/listings/${id}/availability`, { bookedDates });

export const uploadPhotos = (formData) =>
  api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

