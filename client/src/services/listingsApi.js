import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mock_token') || '';
  config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

export const getListings = () =>
  api.get('/listings');

export const createListing = (listingData) =>
  api.post('/listings', listingData);

export const updateListingAvailability = (id, bookedDates) =>
  api.patch(`/listings/${id}/availability`, { bookedDates });
