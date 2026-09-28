/** Tarayıcıda anında geri bildirim için TR IBAN kontrolü (asıl kontrol backend'de) */
export const normalizeIban = (v) => String(v ?? '').replace(/[\s-]/g, '').toUpperCase();

export function checkTrIban(value) {
  const iban = normalizeIban(value);
  if (iban.length < 26) return { complete: false, valid: false };
  if (!/^TR\d{24}$/.test(iban)) return { complete: true, valid: false };
  let r = 0;
  for (const ch of iban.slice(4) + iban.slice(0, 4)) {
    const v = /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of v) r = (r * 10 + Number(d)) % 97;
  }
  return { complete: true, valid: r === 1, bankCode: iban.slice(4, 9), value: iban };
}
