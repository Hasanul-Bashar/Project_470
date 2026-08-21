import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mock_token') || '';
  config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

export const getTenantTrustScore = (tenantId = '') =>
  api.get(`/trust-score/${tenantId}`);

export const flagTenant = (flagData) =>
  api.post('/trust-score/flag', flagData);

export const appealFlag = (appealData) =>
  api.post('/trust-score/appeal', appealData);

export const reviewAppeal = (reviewData) =>
  api.patch('/trust-score/review-appeal', reviewData);

export const getAdminTrustScoreQueue = () =>
  api.get('/trust-score/admin/queue');
