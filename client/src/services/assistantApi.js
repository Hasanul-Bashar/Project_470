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

export const sendAssistantChat = (message, history = [], currentFilters = {}) =>
  api.post('/assistant/chat', { message, history, currentFilters });

export const getAssistantSuggestions = () =>
  api.get('/assistant/suggestions');

export const getAssistantStatus = () =>
  api.get('/assistant/status');
