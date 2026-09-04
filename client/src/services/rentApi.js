import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mock_token') || '';
  const userProfile = localStorage.getItem('user_profile') || '';
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  if (userProfile) config.headers['X-User-Data'] = userProfile;
  return config;
});

export const getRentPayments = (params = {}) =>
  api.get('/rent', { params });

export const createRentPayment = (data) =>
  api.post('/rent', data);

export const updateRentStatus = (id, data) =>
  api.patch(`/rent/${id}/status`, data);

export const deleteRentPayment = (id) =>
  api.delete(`/rent/${id}`);

export const bulkGenerateRent = (data) =>
  api.post('/rent/bulk-generate', data);
