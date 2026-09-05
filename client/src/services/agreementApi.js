import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mock_token') || '';
  const userProfile = localStorage.getItem('user_profile') || '';
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  if (userProfile) config.headers['X-User-Data'] = userProfile;
  return config;
});

export const getAgreements = (params = {}) =>
  api.get('/agreements', { params });

export const getAgreementById = (id) =>
  api.get(`/agreements/${id}`);

export const createAgreement = (data) =>
  api.post('/agreements', data);

export const generateAgreementPdf = (id) =>
  api.post(`/agreements/${id}/generate-pdf`);

export const verifyAgreementHash = (id) =>
  api.post(`/agreements/${id}/verify`);

export const getAgreementDownloadUrl = (id) =>
  `/api/agreements/${id}/download`;

export const claimAgreementByPasskey = (passkey) =>
  api.post('/agreements/claim', { passkey });

export const tenantAgreeToAgreement = (id) =>
  api.post(`/agreements/${id}/tenant-agree`);

export const adminApproveAgreement = (id) =>
  api.post(`/agreements/${id}/admin-approve`);

export const rejectAgreement = (id, reason = '') =>
  api.post(`/agreements/${id}/reject`, { reason });
