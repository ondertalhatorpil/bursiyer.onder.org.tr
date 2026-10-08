/**
 * Backend uç noktaları. Bileşenler doğrudan fetch yazmaz, buradaki fonksiyonları kullanır.
 */
import { api } from './client';

export const publicApi = {
  program: () => api.get('/public/program'),
  consent: (type) => api.get(`/public/consents/${type}`),
  content: (key) => api.get(`/public/content/${key}`),
  cities: () => api.get('/public/cities'),
  districts: (cityId) => api.get(`/public/cities/${cityId}/districts`),
  schools: (params) => api.get(`/public/schools?${new URLSearchParams(clean(params))}`),
  universities: (params) => api.get(`/public/universities?${new URLSearchParams(clean(params))}`),
  faculties: (universityId) => api.get(`/public/universities/${universityId}/faculties`),
  countries: () => api.get('/public/countries'),
  dormitories: () => api.get('/public/dormitories'),
  channels: (category) => api.get(`/public/channels?category=${category}`),
};

export const authApi = {
  registerStart: (body) => api.post('/auth/register/start', body),
  registerResend: (registrationToken) => api.post('/auth/register/resend', { registrationToken }),
  registerVerify: (registrationToken, code) => api.post('/auth/register/verify', { registrationToken, code }),
  loginStart: (idNumber) => api.post('/auth/login/start', { idNumber }),
  loginResend: (loginToken) => api.post('/auth/login/resend', { loginToken }),
  loginVerify: (loginToken, code) => api.post('/auth/login/verify', { loginToken, code }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout', {}),
};

export const applicationApi = {
  get: () => api.get('/application'),
  setCategory: (category) => api.put('/application/category', { category }),
  setChannel: (body) => api.put('/application/channel', body),
  acceptRequirements: () => api.post('/application/requirements', { accepted: true }),
  saveGuardian: (body) => api.put('/application/guardian', body),
  resendGuardian: () => api.post('/application/guardian/resend', {}),
  verifyGuardian: (code) => api.post('/application/guardian/verify', { code, consent: true }),
  setEducation: (body) => api.put('/application/education', body),
  // Yurt Konaklama Bursu
  setYurtFamily: (body) => api.put('/application/yurt/family', body),
  setYurtScholarship: (body) => api.put('/application/yurt/scholarship', body),
  summary: () => api.get('/application/summary'),
  submit: () => api.post('/application/submit', { confirm: true }),
};

export const documentsApi = {
  list: () => api.get('/documents'),
  upload: (typeCode, file, { consent } = {}) => {
    const fd = new FormData();
    fd.append('file', file);
    if (consent) fd.append('consent', 'true');
    return api.upload(`/documents/${typeCode}`, fd);
  },
  remove: (id) => api.del(`/documents/${id}`),
  fileUrl: (id) => `/api/documents/${id}/file`,
};

function clean(params = {}) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
}

/** Adım 8: IBAN */
export const ibanApi = {
  get: () => api.get('/iban'),
  submit: ({ iban, file }) => {
    const fd = new FormData();
    fd.append('iban', iban);
    fd.append('confirm', 'true');
    fd.append('file', file);
    return api.upload('/iban', fd);
  },
  fileUrl: '/api/iban/file',
};
