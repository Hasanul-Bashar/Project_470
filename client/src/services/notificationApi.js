import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mock_token') || '';
  const userProfile = localStorage.getItem('user_profile') || '';
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  if (userProfile) config.headers['X-User-Data'] = userProfile;
  return config;
});

export const getNotifications = (params = {}) =>
  api.get('/notifications', { params });

export const markNotificationRead = (id) =>
  api.patch(`/notifications/${id}/read`);

export const markAllNotificationsRead = () =>
  api.patch('/notifications/mark-all');

export const deleteNotification = (id) =>
  api.delete(`/notifications/${id}`);

export const clearReadNotifications = () =>
  api.delete('/notifications/clear-read');
