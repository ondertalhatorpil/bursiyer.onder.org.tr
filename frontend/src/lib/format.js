/** Görüntüleme yardımcıları */

/** 125 -> "02:05" */
export function mmss(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** "2005-04-15" -> "15.04.2005" */
export function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

/** ISO tarih-saat -> "25.09.2026 14:05" (Türkiye saati) */
export function formatDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('tr-TR', {
    timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** ISO tarih-saat -> { date: "31 Ekim 2026", time: "23.59" } (Türkiye saati) */
export function formatLongDateTime(iso) {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  const opts = { timeZone: 'Europe/Istanbul' };
  return {
    date: d.toLocaleDateString('tr-TR', { ...opts, day: 'numeric', month: 'long', year: 'numeric' }),
    time: d.toLocaleTimeString('tr-TR', { ...opts, hour: '2-digit', minute: '2-digit' }).replace(':', '.'),
  };
}

export function formatBytes(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

/** Sadece rakamlar */
export const digits = (v) => String(v ?? '').replace(/\D/g, '');
