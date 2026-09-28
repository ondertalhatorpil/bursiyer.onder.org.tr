const { encrypt, decrypt, hmac, safeEqualHex, randomDigits } = require('../src/lib/crypto');
const { parseIdNumber, maskIdNumber } = require('../src/lib/identity');
const { normalizeTrMobile, formatTrMobile, maskTrMobile } = require('../src/lib/phone');
const { parseDate, ageOn, isMinor, todayTR, isPlausibleBirthDate } = require('../src/lib/age');

describe('crypto', () => {
  test('şifrele / çöz', () => {
    const enc = encrypt('10000000146');
    expect(enc).toMatch(/^v1\./);
    expect(enc).not.toContain('10000000146');
    expect(decrypt(enc)).toBe('10000000146');
  });
  test('aynı değer her seferinde farklı şifrelenir', () => {
    expect(encrypt('x')).not.toBe(encrypt('x'));
  });
  test('değiştirilmiş şifreli veri reddedilir', () => {
    const parts = encrypt('gizli').split('.');
    parts[3] = Buffer.from('baska').toString('base64url');
    expect(() => decrypt(parts.join('.'))).toThrow();
  });
  test('hmac sabittir ve karşılaştırılabilir', () => {
    expect(hmac('123')).toBe(hmac('123'));
    expect(hmac('123')).toHaveLength(64);
    expect(safeEqualHex(hmac('123'), hmac('123'))).toBe(true);
    expect(safeEqualHex(hmac('123'), hmac('124'))).toBe(false);
  });
  test('OTP 6 haneli sayı', () => {
    for (let i = 0; i < 50; i++) expect(randomDigits(6)).toMatch(/^\d{6}$/);
  });
});

describe('kimlik no', () => {
  test('geçerli T.C.', () => {
    expect(parseIdNumber('10000000146')).toEqual({ valid: true, type: 'TC', value: '10000000146' });
    expect(parseIdNumber(' 100 000 001 46 ').valid).toBe(true);
  });
  test('geçerli YKN (99 ile başlar)', () => {
    expect(parseIdNumber('99123456740').type).toBe('YKN');
  });
  test('geçersizler', () => {
    for (const v of ['10000000147', '00000000146', '1000000014', '', null, 'abcdefghijk', '11111111111']) {
      expect(parseIdNumber(v).valid).toBe(false);
    }
  });
  test('maskeleme', () => {
    expect(maskIdNumber('10000000146')).toBe('100******46');
  });
});

describe('telefon', () => {
  test.each([
    ['0 (532) 123 45 67'], ['05321234567'], ['5321234567'], ['+90 532 123 45 67'], ['905321234567'],
  ])('%s -> 905321234567', (input) => {
    expect(normalizeTrMobile(input)).toBe('905321234567');
  });
  test('geçersizler', () => {
    for (const v of ['02121234567', '532123456', '4321234567', '', null, '+49 151 1234567']) {
      expect(normalizeTrMobile(v)).toBeNull();
    }
  });
  test('biçimlendirme ve maske', () => {
    expect(formatTrMobile('905321234567')).toBe('0 (532) 123 45 67');
    expect(maskTrMobile('905321234567')).toBe('0 (532) *** ** 67');
  });
});

describe('tarih / yaş', () => {
  test('tarih biçimleri', () => {
    expect(parseDate('05/03/2008')).toBe('2008-03-05');
    expect(parseDate('05.03.2008')).toBe('2008-03-05');
    expect(parseDate('2008-03-05')).toBe('2008-03-05');
    expect(parseDate('31/02/2008')).toBeNull();
    expect(parseDate('2008/03/05')).toBeNull();
  });
  test('yaş, doğum gününe göre', () => {
    expect(ageOn('2008-09-25', '2026-09-24')).toBe(17);
    expect(ageOn('2008-09-25', '2026-09-25')).toBe(18);
    expect(isMinor('2008-09-26', '2026-09-25')).toBe(true);
    expect(ageOn('2008-02-29', '2026-02-28')).toBe(17);
    expect(ageOn('2008-02-29', '2026-03-01')).toBe(18);
  });
  test('bugün Türkiye saatine göre', () => {
    // 2026-09-25 22:30 UTC = 2026-09-26 01:30 İstanbul
    expect(todayTR(new Date('2026-09-25T22:30:00Z'))).toBe('2026-09-26');
  });
  test('makul doğum tarihi', () => {
    expect(isPlausibleBirthDate('2010-01-01', '2026-09-25')).toBe(true);
    expect(isPlausibleBirthDate('2020-01-01', '2026-09-25')).toBe(false);
    expect(isPlausibleBirthDate('2030-01-01', '2026-09-25')).toBe(false);
  });
});
