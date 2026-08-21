import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mock_token') || '';
  config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

export const getChats = () => api.get('/chats');

export const getOrCreateChatByListing = (listingId) =>
  api.get(`/chats/listing/${listingId}`);

export const sendMessage = (chatId, text) =>
  api.post(`/chats/${chatId}/messages`, { text });
