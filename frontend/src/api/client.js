/**
 * API istemcisi. Tüm istekler /api altına gider (geliştirmede Vite, canlıda Nginx yönlendirir).
 * Oturum httpOnly cookie ile taşınır; token saklamaya gerek yok.
 *
 * Hata biçimi (backend): { error: { code, message, details? } } -> ApiError
 */
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const NETWORK_MESSAGE = 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.';

export async function request(path, { method = 'GET', body, formData, signal } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : formData,
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', NETWORK_MESSAGE);
  }

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }

  if (!res.ok) {
    const e = data?.error || {};
    throw new ApiError(res.status, e.code || 'HTTP_ERROR', e.message || 'Beklenmeyen bir hata oluştu', e.details);
  }
  return data;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
  upload: (path, formData, opts) => request(path, { ...opts, method: 'POST', formData }),
};
