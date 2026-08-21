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

export const submitComplaint = (data) =>
  api.post('/complaints', data);

export const getAllComplaints = (status) =>
  api.get('/complaints', { params: status ? { status } : {} });

export const getComplaintById = (id) =>
  api.get(`/complaints/${id}`);

export const updateComplaintStatus = (id, data) =>
  api.patch(`/complaints/${id}/status`, data);
