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

// 1. Get Trust Score (own profile or queried by tenantId)
export const getTrustScore = (tenantId = '') =>
  api.get(`/trust/score${tenantId ? `?tenantId=${tenantId}` : ''}`);

// 2. Landlord flags a tenant
export const flagTenant = ({ tenantId, listingId, category, severity, description }) =>
  api.post('/trust/flag', { tenantId, listingId, category, severity, description });

// 3. Tenant submits a dispute / appeal against an infraction flag
export const submitAppeal = (flagId, reason) =>
  api.post('/trust/appeal', { flagId, reason });

// 4. Admin reviews a tenant appeal
export const adminReviewAppeal = ({ tenantId, flagId, decision, adminNotes }) =>
  api.post('/trust/appeal/review', { tenantId, flagId, decision, adminNotes });

// 5. Admin directly manages blacklist status
export const adminSetBlacklist = ({ tenantId, isBlacklisted, reason }) =>
  api.post('/trust/blacklist', { tenantId, isBlacklisted, reason });

// 6. Admin overview for all trust scores, pending appeals, and blacklisted tenants
export const getAdminTrustOverview = () =>
  api.get('/trust/admin/overview');
