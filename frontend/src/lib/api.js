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

// Edge Device APIs
export const edgeDeviceAPI = {
  getAll: (params) => api.get('/edge-devices', { params }),
  getById: (id) => api.get(`/edge-devices/${id}`),
  create: (data) => api.post('/edge-devices', data),
  getMetrics: () => api.get('/edge-devices/metrics/summary'),
};

// AI Suggestions APIs
export const aiAPI = {
  getSuggestions: (params) => api.get('/ai/suggestions', { params }),
  analyzeThreat: (threatId) => api.post(`/ai/analyze-threat?threat_id=${threatId}`),
  updateSuggestionStatus: (id, status) => api.put(`/ai/suggestions/${id}/status`, null, { params: { status } }),
};

// Reputation System APIs
export const reputationAPI = {
  getLeaderboard: (limit = 20) => api.get(`/reputation/leaderboard?limit=${limit}`),
  getOrganization: (orgId) => api.get(`/reputation/${orgId}`),
  contribute: (type) => api.post(`/reputation/contribute?contribution_type=${type}`),
};

// Network Topology APIs
export const networkAPI = {
  getTopology: () => api.get('/network/topology'),
  getNodes: (params) => api.get('/network/nodes', { params }),
};

// Threat Feed APIs
export const threatFeedAPI = {
  getLive: (params) => api.get('/threat-feed/live', { params }),
  generate: (count = 5) => api.post(`/threat-feed/generate?count=${count}`),
};

// Threat Correlation APIs
export const correlationAPI = {
  getPatterns: (params) => api.get('/correlation/patterns', { params }),
  getClusters: () => api.get('/correlation/clusters'),
  analyze: (threatIds) => api.post('/correlation/analyze', threatIds),
};

// Geographic Threat APIs
export const geoAPI = {
  getThreats: () => api.get('/geo/threats'),
  getHeatmap: () => api.get('/geo/heatmap'),
  getCountryDetails: (countryCode) => api.get(`/geo/country/${countryCode}`),
};

// Risk Analysis APIs
export const riskAPI = {
  getScore: () => api.get('/risk/score'),
  getAnalysis: () => api.get('/risk/analysis'),
  getTrends: (days = 30) => api.get(`/risk/trends?days=${days}`),
};

export default api;
