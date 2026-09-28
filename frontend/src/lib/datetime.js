/**
 * <input type="datetime-local"> ile Türkiye saati arasında dönüşüm.
 * Tarayıcının saat diliminden bağımsız: girilen değer her zaman İstanbul saati kabul edilir.
 */

/** ISO -> "2026-10-01T09:00" (İstanbul saati) */
export function toLocalInput(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('sv-SE', { timeZone: 'Europe/Istanbul' }).replace(' ', 'T').slice(0, 16);
}

/** "2026-10-01T09:00" -> "2026-10-01T09:00:00+03:00" */
export function fromLocalInput(value) {
  return value ? `${value}:00+03:00` : null;
}
