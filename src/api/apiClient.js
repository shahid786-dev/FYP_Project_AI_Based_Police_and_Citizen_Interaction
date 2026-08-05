import axios from 'axios';

// Django backend runs on port 8000
export const API = axios.create({
  baseURL: 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
});

// FastAPI AI microservice runs on port 8001
export const AI_API = axios.create({ baseURL: 'http://localhost:8001' });

// Attach JWT token automatically from localStorage
API.interceptors.request.use((config) => {
  const stored = JSON.parse(localStorage.getItem('pakverify_auth') || 'null');
  if (stored?.token) config.headers.Authorization = `Bearer ${stored.token}`;
  return config;
});

// Handle 401 by clearing stored credentials
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('pakverify_auth');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ──────────────────────────────────────────────────────
export const authAPI = {
  register:     (data) => API.post('/api/auth/register/', data),
  login:        (data) => API.post('/api/auth/login/', data),
  verifyOtp:    (data) => API.post('/api/auth/verify-otp/', data),
  requestReset: (data) => API.post('/api/auth/request-reset/', data),
  confirmReset: (data) => API.post('/api/auth/confirm-reset/', data),
};

// ─── Citizen Applications ──────────────────────────────────────
export const applicationAPI = {
  list:        ()        => API.get('/api/citizen/applications/'),
  create:      (data)    => API.post('/api/citizen/applications/', data),
  detail:      (id)      => API.get(`/api/citizen/applications/${id}/`),
  uploadDoc:   (id, fd)  => API.post(`/api/citizen/applications/${id}/upload/`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  faceVerify:  (id, fd)  => API.post(`/api/citizen/applications/${id}/face-verify/`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  pay:         (id, data) => API.post(`/api/citizen/applications/${id}/pay/`, data),
  downloadCert:(id)       => API.get(`/api/citizen/applications/${id}/download-certificate/`, {
    responseType: 'blob',
  }),
};

// ─── Police Staff ──────────────────────────────────────────────
export const policeAPI = {
  allApplications: ()         => API.get('/api/citizen/applications/'),
  review:          (id, data) => API.post(`/api/police/applications/${id}/review/`, data),
  staffRemark:     (id, data) => API.post(`/api/staff/applications/${id}/remark/`, data),
  criminalSearch:  (data, fd) => fd
    ? API.post('/api/criminals/search/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    : API.post('/api/criminals/search/', data),
  analytics:       ()         => API.get('/api/police/analytics/'),
};

// ─── Police Authority ──────────────────────────────────────────
export const authorityAPI = {
  decide:        (id, data) => API.post(`/api/authority/applications/${id}/decide/`, data),
  issueCert:     (id)       => API.post(`/api/authority/applications/${id}/issue-cert/`),
  // Staff management
  listStaff:     ()         => API.get('/api/authority/staff/'),
  createStaff:   (data)     => API.post('/api/authority/staff/', data),
  updateStaff:   (id, data) => API.put(`/api/authority/staff/${id}/`, data),
  deleteStaff:   (id)       => API.delete(`/api/authority/staff/${id}/`),
  toggleStaff:   (id)       => API.post(`/api/authority/staff/${id}/toggle-active/`),
  resetStaffPwd: (id, data) => API.post(`/api/authority/staff/${id}/reset-password/`, data),
};

// ─── Admin ─────────────────────────────────────────────────────
export const adminAPI = {
  users:     (role) => API.get('/api/auth/admin/users/', { params: { role } }),
  deleteUser:(id)   => API.delete(`/api/auth/admin/users/${id}/`),
  auditLogs: ()     => API.get('/api/audit/logs/'),
};

// ─── Blockchain ────────────────────────────────────────────────
export const blockchainAPI = {
  blocks:        () => API.get('/api/blockchain/blocks/'),
  verify:        () => API.get('/api/blockchain/verify/'),
  recordHistory: (id) => API.get(`/api/blockchain/record/${id}/`),
};

// ─── Notifications ─────────────────────────────────────────────
export const notificationsAPI = {
  list:        () => API.get('/api/notifications/'),
  markRead:    (id) => API.post(`/api/notifications/${id}/read/`),
  markAllRead: ()   => API.post('/api/notifications/read-all/'),
  unreadCount: ()   => API.get('/api/notifications/unread-count/'),
};

// ─── Chatbot ───────────────────────────────────────────────────
export const chatbotAPI = {
  chat: (message) => API.post('/api/chatbot/chat/', { message }),
};

// ─── Public Certificate Verification ──────────────────────────
export const certAPI = {
  verify: (qrHash) => API.get(`/api/certificates/verify/${qrHash}/`),
};
