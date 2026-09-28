/**
 * T.C. Kimlik No ve Yabancı Kimlik No (YKN) doğrulama.
 * İkisi de 11 hanedir ve aynı kontrol algoritmasını kullanır; YKN 99 ile başlar.
 *
 * Algoritma:
 *   - 11 hane, ilk hane 0 olamaz
 *   - 10. hane = ((1+3+5+7+9. haneler) * 7 - (2+4+6+8. haneler)) mod 10
 *   - 11. hane = (ilk 10 hanenin toplamı) mod 10
 */

function normalizeIdNumber(input) {
  return String(input ?? '').replace(/\D/g, '');
}

function isValidChecksum(id) {
  if (!/^[1-9]\d{10}$/.test(id)) return false;
  const d = id.split('').map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  const d10 = (((odd * 7 - even) % 10) + 10) % 10;
  if (d10 !== d[9]) return false;
  const d11 = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return d11 === d[10];
}

/**
 * @returns {{ valid: boolean, type: 'TC'|'YKN'|null, value: string }}
 */
function parseIdNumber(input) {
  const value = normalizeIdNumber(input);
  if (!isValidChecksum(value)) return { valid: false, type: null, value };
  return { valid: true, type: value.startsWith('99') ? 'YKN' : 'TC', value };
}

/** Panelde/exportta maskeli gösterim: 123******01 */
function maskIdNumber(id) {
  const v = normalizeIdNumber(id);
  if (v.length !== 11) return '***********';
  return `${v.slice(0, 3)}******${v.slice(9)}`;
}

module.exports = { normalizeIdNumber, isValidChecksum, parseIdNumber, maskIdNumber };
