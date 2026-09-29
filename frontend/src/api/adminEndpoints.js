/**
 * Admin API. 401 dönerse "admin-unauthorized" olayı yayınlanır; AdminShell girişe yönlendirir.
 */
import { api, request } from './client';

const guard = (promise) => promise.catch((err) => {
  if (err.status === 401) window.dispatchEvent(new Event('admin-unauthorized'));
  throw err;
});

const qs = (params = {}) => {
  const clean = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length));
  return clean.length ? `?${new URLSearchParams(clean.map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : String(v)]))}` : '';
};

export const adminAuthApi = {
  login: (email, password) => api.post('/admin/auth/login', { email, password }),
  resend: (loginToken) => api.post('/admin/auth/resend', { loginToken }),
  verify: (loginToken, code) => api.post('/admin/auth/verify', { loginToken, code }),
  me: () => api.get('/admin/auth/me'),
  changePassword: (currentPassword, newPassword) => api.post('/admin/auth/password', { currentPassword, newPassword }),
  logout: () => api.post('/admin/auth/logout', {}),
};

export const adminApi = {
  dashboard: (programId) => guard(api.get(`/admin/dashboard${qs({ programId })}`)),
  programs: () => guard(api.get('/admin/programs')),
  applications: (filters) => guard(api.get(`/admin/applications${qs(filters)}`)),
  exportUrl: (filters) => `/api/admin/applications/export${qs({ ...filters, page: undefined, pageSize: undefined })}`,
  application: (id) => guard(api.get(`/admin/applications/${id}`)),
  documentUrl: (id, documentId) => `/api/admin/applications/${id}/documents/${documentId}/file`,
  reviewDocument: (id, documentId, body) => guard(request(`/admin/applications/${id}/documents/${documentId}`, { method: 'PATCH', body })),
  setStatus: (id, body) => guard(api.post(`/admin/applications/${id}/status`, body)),
  addNote: (id, body) => guard(api.post(`/admin/applications/${id}/notes`, body)),
  setReference: (id, verified) => guard(api.post(`/admin/applications/${id}/reference`, { verified })),
  setSponsors: (id, sponsorIds) => guard(api.put(`/admin/applications/${id}/sponsors`, { sponsorIds })),
  setQualified: (id, qualified) => guard(api.post(`/admin/applications/${id}/qualified`, { qualified })),
  ibanFileUrl: (id, accountId) => `/api/admin/applications/${id}/iban/${accountId}/file`,
  reviewIban: (id, body) => guard(api.post(`/admin/applications/${id}/iban/review`, body)),
  paymentsExportUrl: () => '/api/admin/applications/payments-export',
};

/** Burs veren firmalar (liste herkes; yönetim manage_settings) */
export const sponsorsApi = {
  list: () => guard(api.get('/admin/sponsors')),
  create: (body) => guard(api.post('/admin/sponsors', body)),
  update: (id, body) => guard(request(`/admin/sponsors/${id}`, { method: 'PATCH', body })),
  remove: (id) => guard(api.del(`/admin/sponsors/${id}`)),
  uploadLogo: (id, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return guard(api.upload(`/admin/sponsors/${id}/logo`, fd));
  },
  removeLogo: (id) => guard(api.del(`/admin/sponsors/${id}/logo`)),
  logoUrl: (id, version) => `/api/admin/sponsors/${id}/logo?v=${version || 0}`,
};

/** Aşama 9: ayarlar (manage_settings) */
export const settingsApi = {
  programs: () => guard(api.get('/admin/settings/programs')),
  createProgram: (body) => guard(api.post('/admin/settings/programs', body)),
  updateProgram: (id, body) => guard(request(`/admin/settings/programs/${id}`, { method: 'PATCH', body })),
  consents: () => guard(api.get('/admin/settings/consents')),
  publishConsent: (type, body) => guard(api.put(`/admin/settings/consents/${type}`, body)),
  content: () => guard(api.get('/admin/settings/content')),
  updateContent: (key, body) => guard(api.put(`/admin/settings/content/${key}`, body)),
  sms: () => guard(api.get('/admin/settings/sms')),
  updateSms: (code, body) => guard(api.put(`/admin/settings/sms/${code}`, body)),
  testSms: (code) => guard(api.post(`/admin/settings/sms/${code}/test`, {})),
};

/** Aşama 9: kullanıcılar ve işlem kayıtları (manage_users) */
export const usersApi = {
  list: () => guard(api.get('/admin/users')),
  channels: () => guard(api.get('/admin/users/channels')),
  create: (body) => guard(api.post('/admin/users', body)),
  update: (id, body) => guard(request(`/admin/users/${id}`, { method: 'PATCH', body })),
  resetPassword: (id) => guard(api.post(`/admin/users/${id}/reset-password`, {})),
  setScopes: (id, scopes) => guard(api.put(`/admin/users/${id}/scopes`, { scopes })),
  auditLogs: (filters) => guard(api.get(`/admin/users/audit-logs${qs(filters)}`)),
};
