/**
 * Şifreleme ve özetleme yardımcıları.
 *
 * encrypt/decrypt: AES-256-GCM. Çıktı biçimi "v1.<iv>.<tag>.<şifreli>" (base64url).
 *   T.C./YKN, veli kimlik no, IBAN gibi geri okunması gereken alanlar için.
 * hmac: HMAC-SHA256 (hex). Geri okunmayan ama aranan alanlar için (id_number_hash, OTP kodu).
 *   Aynı girdi her zaman aynı çıktıyı verir; anahtar bilinmeden tersine çevrilemez.
 */
const crypto = require('crypto');
const config = require('../config');

const VERSION = 'v1';

function encrypt(plain) {
  if (plain == null) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', config.keys.encryption, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), enc.toString('base64url')].join('.');
}

function decrypt(payload) {
  if (payload == null) return null;
  const [version, iv, tag, enc] = String(payload).split('.');
  if (version !== VERSION || !iv || !tag || !enc) throw new Error('Şifreli veri biçimi tanınmadı');
  const decipher = crypto.createDecipheriv('aes-256-gcm', config.keys.encryption, Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(enc, 'base64url')), decipher.final()]).toString('utf8');
}

function hmac(value) {
  return crypto.createHmac('sha256', config.keys.hash).update(String(value)).digest('hex');
}

/** İki hex özeti zamanlama saldırısına karşı güvenli karşılaştırır. */
function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

/** Kriptografik olarak güvenli, sabit uzunlukta sayısal kod (OTP). */
function randomDigits(length = 6) {
  let out = '';
  for (let i = 0; i < length; i++) out += crypto.randomInt(0, 10);
  return out;
}

/** Oturum token'ı vb. için rastgele dize. */
function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function sha256File(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

module.exports = { encrypt, decrypt, hmac, safeEqualHex, randomDigits, randomToken, sha256File };
