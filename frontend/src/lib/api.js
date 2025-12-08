import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dctip_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('dctip_token');
      localStorage.removeItem('dctip_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Dashboard APIs
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

// Threat APIs
export const threatAPI = {
  getAll: (params) => api.get('/threats', { params }),
  getById: (id) => api.get(`/threats/${id}`),
  create: (data) => api.post('/threats', data),
  updateStatus: (id, status) => api.put(`/threats/${id}/status`, null, { params: { status } }),
  simulate: (count = 10) => api.post(`/simulate/threats?count=${count}`),
};

// Alert APIs
export const alertAPI = {
  getAll: (params) => api.get('/alerts', { params }),
  markRead: (id) => api.put(`/alerts/${id}/read`),
  markAllRead: () => api.put('/alerts/read-all'),
  getConfigs: () => api.get('/alert-configs'),
  createConfig: (data) => api.post('/alert-configs', data),
};

// Incident APIs
export const incidentAPI = {
  getAll: (params) => api.get('/incidents', { params }),
  create: (data) => api.post('/incidents', data),
  simulateAutonomous: () => api.post('/simulate/autonomous-response'),
};

// Federated Learning APIs
export const federatedAPI = {
  getModels: () => api.get('/federated/models'),
  getContributions: (limit = 50) => api.get(`/federated/contributions?limit=${limit}`),
};

// Blockchain APIs
export const blockchainAPI = {
  getTransactions: (limit = 100) => api.get(`/blockchain/transactions?limit=${limit}`),
  verify: (hash) => api.get(`/blockchain/verify/${hash}`),
};

// Collaboration APIs
export const collaborationAPI = {
  getShared: (params) => api.get('/collaboration/shared', { params }),
  share: (data) => api.post('/collaboration/share', data),
  upvote: (id) => api.post(`/collaboration/${id}/upvote`),
};

// Compliance APIs
export const complianceAPI = {
  getTemplates: () => api.get('/compliance/templates'),
};

export default api;
