/**
 * Belge dosyaları: UPLOAD_DIR altında <yıl>/<uuid>.<uzantı> olarak saklanır.
 * Klasör web kökü dışında olmalı; dosyalar sadece yetki kontrolüyle backend üzerinden verilir.
 * Dosya adı kullanıcıdan alınmaz (path traversal olmaz); orijinal ad sadece DB'de tutulur.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');

const ROOT = path.resolve(config.uploadDir);

function resolveKey(key) {
  if (!/^\d{4}\/[0-9a-f-]{36}\.(pdf|jpg|png)$/.test(key)) throw new Error(`Geçersiz dosya anahtarı: ${key}`);
  return path.join(ROOT, key);
}

async function save(buffer, ext) {
  const key = `${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${ext}`;
  const full = resolveKey(key);
  await fs.promises.mkdir(path.dirname(full), { recursive: true, mode: 0o750 });
  await fs.promises.writeFile(full, buffer, { mode: 0o640, flag: 'wx' });
  return key;
}

function createReadStream(key) {
  return fs.createReadStream(resolveKey(key));
}

async function exists(key) {
  try {
    await fs.promises.access(resolveKey(key));
    return true;
  } catch {
    return false;
  }
}

async function remove(key) {
  await fs.promises.rm(resolveKey(key), { force: true });
}

module.exports = { ROOT, save, createReadStream, exists, remove };
