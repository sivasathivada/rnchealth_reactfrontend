import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});



// Attach access token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/token/refresh/`, { refresh });
          localStorage.setItem('access_token', data.access);
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ── AUTH ──────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register/', data),
  login: (data) => api.post('/auth/login/', data),
  logout: (refresh_token) => api.post('/auth/logout/', { refresh_token }),
  profile: () => api.get('/auth/profile/'),
  validateToken: () => api.get('/auth/validate/'),
  verifyEmail: (token) => api.post(`/auth/verify-email/${token}/`),
  resendVerification: (email) => api.post('/auth/resend_verification/', { email }),
};

// ── CONSULTANTS ───────────────────────────────────────
export const consultantsAPI = {
  list: (params) => api.get('/v1/consultants/', { params }),
  detail: (id) => api.get(`/v1/consultants/${id}/`),
  specialities: () => api.get('/v1/consultants/specialities/'),
  myProfile: () => api.get('/v1/consultants/profile/'),
  createProfile: (data) => api.post('/v1/consultants/profile/create/', data),
  updateProfile: (data) => api.put('/v1/consultants/profile/', data),
  updateAvatar: (formData) => api.post('/v1/consultants/profile/avatar/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getAvailability: () => api.get('/v1/consultants/profile/availability/'),
  setAvailability: (data) => {
    console.log('[API] setAvailability sending:', JSON.stringify(data));
    return api.post('/v1/consultants/profile/availability/', data, {
      headers: { 'Content-Type': 'application/json' }
    });
  },
  toggleAvailability: () => {
    console.log('[API] toggleAvailability PATCH called');
    return api.put('/v1/consultants/profile/toggle-availability/', { is_available: true }, {
      headers: { 'Content-Type': 'application/json' }
    });
  },
  addReview: (id, data) => api.post(`/v1/consultants/${id}/reviews/`, data),
};

// ── PATIENTS ──────────────────────────────────────────
export const patientsAPI = {
  me: () => api.get('/v1/patients/me/'),
  create: (data) => api.post('/v1/patients/', data),
  update: (id, data) => api.patch(`/v1/patients/${id}/`, data),
  summary: (id) => api.get(`/v1/patients/${id}/summary/`),
  medicalHistory: (id, params) => api.get(`/v1/patients/${id}/medical-history/`, { params }),
  myMedicalHistory: () => api.get('/v1/patients/medical-history/'),
  createMedicalRecord: (data) => api.post('/v1/patients/medical-history/', data),
  recentRecords: () => api.get('/v1/patients/medical-history/recent/'),
};

// ── APPOINTMENTS ───────────────────────────────────────
const B = '/v1/book-appointment';
export const appointmentsAPI = {
  // Consultant — list all their appointments
  list:    (params) => api.get(`${B}/appointments/`, { params }),
  // Patient — list THEIR OWN appointments
  myList:  (params) => api.get(`${B}/appointments/my/`, { params }),
  // Patient — book a new appointment
  book:    (data)   => api.post(`${B}/appointments/book/`, data),
  // Alias so existing components still work
  create:  (data)   => api.post(`${B}/appointments/book/`, data),
  detail:  (id)     => api.get(`${B}/appointments/${id}/`),
  update:  (id, data) => api.patch(`${B}/appointments/${id}/update/`, data),
  cancel:  (id, reason) => api.post(`${B}/appointments/${id}/cancel/`, { cancellation_reason: reason }),
  confirm: (id)     => api.post(`${B}/appointments/${id}/confirm/`),
  reject:  (id, reason) => api.post(`${B}/appointments/${id}/cancel/`, { cancellation_reason: reason || 'Rejected by consultant' }),
  availableSlots: (consultantId, date) =>
    api.get(`${B}/appointments/available-slots/`, { params: { consultant_id: consultantId, date } }),
};

// ── CALLS ──────────────────────────────────────────────
export const callsAPI = {
  list:     (params)     => api.get(`${B}/calls/`, { params }),
  detail:   (id)         => api.get(`${B}/calls/${id}/`),
  // initiate: creates a call session linked to an appointment
  initiate: (data)       => api.post(`${B}/initiate/`, data),
  // start/end take session_id (UUID string), NOT primary key
  start:    (sessionId)  => api.post(`${B}/sessions/${sessionId}/start/`, {}),
  end:      (sessionId, notes) => api.post(`${B}/sessions/${sessionId}/end/`, { consultant_notes: notes }),
};

// ── CALL SESSIONS (explicit session management) ────────
export const callSessionsAPI = {
  // Create a scheduled call session after appointment is confirmed
  create:  (data) => api.post(`${B}/initiate/`, data),
  list:    (params) => api.get(`${B}/calls/`, { params }),
  detail:  (sessionId) => api.get(`${B}/calls/${sessionId}/`),
  start:   (sessionId) => api.post(`${B}/sessions/${sessionId}/start/`, {}),
  end:     (sessionId, notes) => api.post(`${B}/sessions/${sessionId}/end/`, { consultant_notes: notes }),
};

// ── PRESCRIPTIONS ─────────────────────────────────────
export const prescriptionsAPI = {
  list: (params) => api.get('/v1/book-appointment/prescriptions/', { params }),
  detail: (id) => api.get(`/v1/book-appointment/prescriptions/${id}/`),
  create: (data) => api.post('/v1/book-appointment/prescriptions/', data),
  update: (id, data) => api.patch(`/v1/book-appointment/prescriptions/${id}/`, data),
};

// ── ADMIN ─────────────────────────────────────────────
export const adminAPI = {
  statistics: () => api.get('/v1/patients/statistics/'),
  searchPatients: (params) => api.get('/v1/patients/search/', { params }),
};

// ── PAYMENTS ──────────────────────────────────────────
export const paymentsAPI = {
  initiate: (data) => api.post('/v1/payments/initiate/', data),
  confirm: (data) => api.post('/v1/payments/confirm/', data),
  status: (id) => api.get(`/v1/payments/${id}/status/`),
  history: () => api.get('/v1/payments/history/'),
  summary: (appointmentId) => api.get(`/v1/payments/summary/${appointmentId}/`),
};
