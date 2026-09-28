/**
 * Türkiye IBAN'ı: TR + 2 kontrol hanesi + 5 hane banka kodu + 1 hane rezerv (0) + 16 hane hesap = 26 karakter.
 * Kontrol: ISO 13616 mod-97. Banka kodu IBAN'ın 5-9. haneleridir.
 */

/** Boşluk, tire ve küçük harfleri temizler: "tr12 0006 ..." -> "TR120006..." */
function normalizeIban(input) {
  return String(input ?? '').replace(/[\s-]/g, '').toUpperCase();
}

function mod97(iban) {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const v = /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of v) remainder = (remainder * 10 + Number(d)) % 97;
  }
  return remainder;
}

/**
 * @returns {{ valid: true, value: string, bankCode: string } | { valid: false, reason: string }}
 */
function parseTrIban(input) {
  const iban = normalizeIban(input);
  if (!iban) return { valid: false, reason: 'IBAN girin' };
  if (!iban.startsWith('TR')) return { valid: false, reason: 'Türkiye\'deki bir banka hesabının IBAN\'ını girin (TR ile başlar)' };
  if (!/^TR\d{24}$/.test(iban)) return { valid: false, reason: 'IBAN TR ile başlayan 26 karakter olmalı' };
  if (mod97(iban) !== 1) return { valid: false, reason: 'IBAN hatalı, lütfen kontrol edin' };
  return { valid: true, value: iban, bankCode: iban.slice(4, 9) };
}

/** "TR120006400000112345678901" -> "TR12 0006 4000 0011 2345 6789 01" */
function formatIban(iban) {
  return String(iban).replace(/(.{4})/g, '$1 ').trim();
}

/** "TR12 **** **** **** **** **89 01" */
function maskIban(iban) {
  const s = String(iban);
  return formatIban(s.slice(0, 4) + '*'.repeat(s.length - 8) + s.slice(-4));
}

module.exports = { normalizeIban, parseTrIban, formatIban, maskIban };
