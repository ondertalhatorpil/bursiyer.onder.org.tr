/**
 * Frontend doğrulamaları (backend ile aynı kurallar). Kullanıcıya hızlı geri bildirim içindir;
 * asıl doğrulama backend'dedir.
 */
import { digits } from './format';

/** T.C. Kimlik No / YKN kontrol algoritması */
export function isValidIdNumber(value) {
  const id = digits(value);
  if (!/^[1-9]\d{10}$/.test(id)) return false;
  const d = id.split('').map(Number);
  const d10 = ((((d[0] + d[2] + d[4] + d[6] + d[8]) * 7 - (d[1] + d[3] + d[5] + d[7])) % 10) + 10) % 10;
  if (d10 !== d[9]) return false;
  return d.slice(0, 10).reduce((a, b) => a + b, 0) % 10 === d[10];
}

export const isYkn = (value) => digits(value).startsWith('99');

/** 0 (5XX) XXX XX XX */
export function isValidMobile(value) {
  return /^0?5\d{9}$/.test(digits(value));
}

/** GG/AA/YYYY geçerli takvim tarihi mi */
export function isValidDate(value) {
  const m = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return false;
  const [, d, mo, y] = m.map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d && y > 1940 && dt <= new Date();
}

/** GG/AA/YYYY'ye göre bugünkü yaş */
export function ageFrom(value) {
  const m = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m.map(Number);
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < mo || (now.getMonth() + 1 === mo && now.getDate() < d)) age--;
  return age;
}
