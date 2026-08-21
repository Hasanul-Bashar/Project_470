import axios from 'axios';

/**
 * complaintsApi.js
 * ────────────────
 * Axios instance for /api/complaints/* endpoints.
 * The Vite proxy (vite.config.js) forwards /api requests to http://localhost:5000.
 * Every request automatically includes the mock JWT from localStorage.
 */
const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mock_token') || '';
  const userProfile = localStorage.getItem('user_profile') || '';
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  if (userProfile) config.headers['X-User-Data'] = userProfile;
  return config;
});

// POST — any authenticated user submits a complaint
export const submitComplaint = (data) =>
  api.post('/complaints', data);

// GET  — admin lists all complaints, optional status filter
export const getAllComplaints = (status) =>
  api.get('/complaints', { params: status ? { status } : {} });

// GET  — admin fetches a single complaint by ID
export const getComplaintById = (id) =>
  api.get(`/complaints/${id}`);

// PATCH — admin updates status + appends resolution note
export const updateComplaintStatus = (id, data) =>
  api.patch(`/complaints/${id}/status`, data);
