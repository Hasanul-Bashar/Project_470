import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mock_token') || '';
  const userProfile = localStorage.getItem('user_profile') || '';
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  if (userProfile) config.headers['X-User-Data'] = userProfile;
  return config;
});

export const getMaintenanceRequests = (params = {}) =>
  api.get('/maintenance', { params });

export const createMaintenanceRequest = (data) =>
  api.post('/maintenance', data);

export const updateMaintenanceStage = (id, data) =>
  api.patch(`/maintenance/${id}/stage`, data);

export const deleteMaintenanceRequest = (id) =>
  api.delete(`/maintenance/${id}`);
