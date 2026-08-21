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

export const getListings = () =>
  api.get('/listings');

export const createListing = (listingData) =>
  api.post('/listings', listingData);

export const updateListingAvailability = (id, bookedDates) =>
  api.patch(`/listings/${id}/availability`, { bookedDates });
