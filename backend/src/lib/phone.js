/**
 * Türk GSM numarası. Veritabanında ve Ekomesaj'a "905XXXXXXXXX" (12 hane) biçiminde gider.
 * Kabul edilen girişler: "0 (532) 123 45 67", "05321234567", "5321234567", "+90 532 123 45 67", "905321234567"
 */

function normalizeTrMobile(input) {
  let d = String(input ?? '').replace(/\D/g, '');
  if (d.startsWith('90') && d.length === 12) d = d.slice(2);
  else if (d.startsWith('0') && d.length === 11) d = d.slice(1);
  if (!/^5\d{9}$/.test(d)) return null;
  return `90${d}`;
}

/** 905321234567 -> 0 (532) 123 45 67 */
function formatTrMobile(normalized) {
  const d = String(normalized ?? '').replace(/^90/, '');
  if (d.length !== 10) return normalized;
  return `0 (${d.slice(0, 3)}) ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
}

/** 905321234567 -> 0 (532) *** ** 67  (SMS gönderildi ekranı için) */
function maskTrMobile(normalized) {
  const d = String(normalized ?? '').replace(/^90/, '');
  if (d.length !== 10) return '***';
  return `0 (${d.slice(0, 3)}) *** ** ${d.slice(8)}`;
}

module.exports = { normalizeTrMobile, formatTrMobile, maskTrMobile };
