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

export const createBooking = (bookingData) =>
  api.post('/bookings', bookingData);

export const getBookings = (params = {}) =>
  api.get('/bookings', { params });

export const landlordApproveBooking = (id) =>
  api.patch(`/bookings/${id}/landlord-approve`);

export const adminApproveBooking = (id) =>
  api.patch(`/bookings/${id}/admin-approve`);

export const rejectBooking = (id) =>
  api.patch(`/bookings/${id}/reject`);
