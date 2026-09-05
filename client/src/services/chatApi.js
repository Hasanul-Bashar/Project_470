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

export const getChats = () => api.get('/chats');

export const getChatById = (chatId) => api.get(`/chats/${chatId}`);

export const getOrCreateChatByListing = (listingId) =>
  api.get(`/chats/listing/${listingId}`);

export const sendMessage = (chatId, text) =>
  api.post(`/chats/${chatId}/messages`, { text });
