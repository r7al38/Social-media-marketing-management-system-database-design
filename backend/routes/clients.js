import axios from 'axios';

// In production: frontend is served from Express on :5000, so /api = same origin.
// In development: Vite proxy forwards /api → :5000, so /api still works.
// We never hardcode a hostname — this works on Replit automatically.
const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global 401 handler
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ─────────────────────────────────────────────────────
export const authApi = {
  login:          (data) => api.post('/auth/login', data),
  me:             ()     => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// ── Clients ──────────────────────────────────────────────────
export const clientsApi = {
  list:    (params) => api.get('/clients', { params }),
  get:     (id)     => api.get(`/clients/${id}`),
  profile: (id)     => api.get(`/clients/${id}/profile`),
  create:  (data)   => api.post('/clients', data),
  update:  (id, d)  => api.put(`/clients/${id}`, d),
  remove:  (id)     => api.delete(`/clients/${id}`),
};

// ── Services ─────────────────────────────────────────────────
export const servicesApi = {
  list:   (params) => api.get('/services', { params }),
  get:    (id)     => api.get(`/services/${id}`),
  create: (data)   => api.post('/services', data),
  update: (id, d)  => api.put(`/services/${id}`, d),
  toggle: (id)     => api.patch(`/services/${id}/toggle`),
  remove: (id)     => api.delete(`/services/${id}`),
};

// ── Subscriptions ────────────────────────────────────────────
export const subscriptionsApi = {
  list:   (params) => api.get('/subscriptions', { params }),
  create: (data)   => api.post('/subscriptions', data),
  update: (id, d)  => api.patch(`/subscriptions/${id}`, d),
  remove: (id)     => api.delete(`/subscriptions/${id}`),
};

// ── Social Accounts ──────────────────────────────────────────
export const socialApi = {
  list:     (params) => api.get('/social-accounts', { params }),
  get:      (id)     => api.get(`/social-accounts/${id}`),
  password: (id)     => api.get(`/social-accounts/${id}/password`),
  create:   (data)   => api.post('/social-accounts', data),
  update:   (id, d)  => api.put(`/social-accounts/${id}`, d),
  remove:   (id)     => api.delete(`/social-accounts/${id}`),
};

// ── Orders ───────────────────────────────────────────────────
export const ordersApi = {
  list:      (params) => api.get('/orders', { params }),
  get:       (id)     => api.get(`/orders/${id}`),
  create:    (data)   => api.post('/orders', data),
  update:    (id, d)  => api.put(`/orders/${id}`, d),
  setStatus: (id, d)  => api.patch(`/orders/${id}/status`, d),
  remove:    (id)     => api.delete(`/orders/${id}`),
};

// ── Tasks ────────────────────────────────────────────────────
export const tasksApi = {
  list:      (params) => api.get('/tasks', { params }),
  board:     (params) => api.get('/tasks/board', { params }),
  get:       (id)     => api.get(`/tasks/${id}`),
  create:    (data)   => api.post('/tasks', data),
  update:    (id, d)  => api.put(`/tasks/${id}`, d),
  setStatus: (id, d)  => api.patch(`/tasks/${id}/status`, d),
  remove:    (id)     => api.delete(`/tasks/${id}`),
};

// ── Invoices ─────────────────────────────────────────────────
export const invoicesApi = {
  list:    (params) => api.get('/invoices', { params }),
  get:     (id)     => api.get(`/invoices/${id}`),
  create:  (data)   => api.post('/invoices', data),
  update:  (id, d)  => api.put(`/invoices/${id}`, d),
  addItem: (id, d)  => api.post(`/invoices/${id}/items`, d),
  remove:  (id)     => api.delete(`/invoices/${id}`),
};

// ── Admin ────────────────────────────────────────────────────
export const adminApi = {
  reportPreview: ()     => api.get('/admin/report/preview'),
  reportSend:    ()     => api.post('/admin/report/send'),
  backupNow:     ()     => api.post('/admin/backup'),
  backupList:    ()     => api.get('/admin/backups'),
  backupDelete:  (name) => api.delete(`/admin/backups/${name}`),
};

export default api;