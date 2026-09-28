/**
 * SMS sürücüleri.
 *   log      : Geliştirme. SMS gönderilmez, mesaj konsola yazılır ve bellekte tutulur (testler okur).
 *   ekomesaj : Gerçek gönderim (Ekomesaj REST API, Basic Auth).
 *              Yanıt biçimi: { err: null | { code, status, message }, data: { pkgID } }
 *
 * Her sürücü aynı arayüzü sağlar:
 *   send({ phone, text, kind: 'otp'|'info', title? }) -> { providerRef }
 *   getCredit() -> number|null
 */
const config = require('../../config');
const logger = require('../../lib/logger');

const TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// log sürücüsü
// ---------------------------------------------------------------------------
const outbox = []; // testler için: son gönderilen mesajlar

const logDriver = {
  async send({ phone, text, kind }) {
    outbox.push({ phone, text, kind, at: new Date() });
    if (outbox.length > 100) outbox.shift();
    logger.warn(`[SMS:log] ${phone} <- ${text}`);
    return { providerRef: `log-${Date.now()}` };
  },
  async getCredit() {
    return null;
  },
};

// ---------------------------------------------------------------------------
// Ekomesaj sürücüsü
// ---------------------------------------------------------------------------
class SmsProviderError extends Error {
  constructor(message, meta) {
    super(message);
    this.meta = meta;
  }
}

async function call(method, path, body) {
  const auth = Buffer.from(`${config.sms.username}:${config.sms.password}`).toString('base64');
  let res;
  try {
    res = await fetch(`${config.sms.baseUrl}${path}`, {
      method,
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new SmsProviderError(`Ekomesaj'a ulaşılamadı: ${err.name === 'TimeoutError' ? 'zaman aşımı' : err.message}`);
  }

  const raw = await res.text();
  let data;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }

  if (!res.ok) {
    throw new SmsProviderError(`Ekomesaj HTTP ${res.status}`, { status: res.status, body: truncate(raw) });
  }
  // Ekomesaj hataları HTTP 200 ile de dönebiliyor: { err: { code, status, message }, data }
  if (data && typeof data === 'object' && data.err) {
    const code = data.err.code || data.err.message || 'BILINMEYEN';
    throw new SmsProviderError(`Ekomesaj hatası: ${code}`, { status: data.err.status, code, body: truncate(raw) });
  }
  return data;
}

/**
 * Ekomesaj yanıt biçimi dokümanda yok; gönderim kimliği olabilecek alanları sırayla dener.
 * İlk canlı testte gelen yanıta göre sadeleştirilecek (sms_logs.status_detail'e ham yanıt yazılıyor).
 */
function extractRef(data) {
  if (data == null || typeof data !== 'object') return null;
  const d = data.data ?? data.result ?? data;
  const ref = d.pkgID ?? d.pkgId ?? d.id ?? d.packageId ?? d.uuid ?? null;
  return ref == null ? null : String(ref);
}

const ekomesajDriver = {
  async send({ phone, text, kind, title }) {
    const push = config.sms.webhookUrl ? { pushSettings: { url: config.sms.webhookUrl } } : {};
    let data;
    if (kind === 'otp' && config.sms.otpMode === 'otp') {
      data = await call('POST', '/sms/create-otp', {
        number: phone,
        sender: config.sms.sender,
        content: text,
        encoding: config.sms.encoding,
        ...push,
      });
    } else {
      data = await call('POST', '/sms/create', {
        type: 1,
        sendingType: 0, // tekil
        title: title || 'Burs bilgilendirme',
        content: text,
        number: phone,
        encoding: config.sms.encoding,
        sender: config.sms.sender,
        periodicSettings: null,
        sendingDate: null,
        validity: 60, // dakika. Ekomesaj alt sınırı 60 (5 reddedildi)
        commercial: false, // bilgilendirme mesajı (İYS kapsamı dışında)
        ...push,
      });
    }
    return { providerRef: extractRef(data), raw: truncate(JSON.stringify(data)) };
  },

  async getCredit() {
    const data = await call('GET', '/user/credit');
    const d = data?.data ?? data;
    const credit = typeof d === 'number' ? d : Number(d?.credit ?? d?.balance ?? d?.amount);
    return Number.isFinite(credit) ? credit : null;
  },
};

function truncate(s, n = 250) {
  if (s == null) return null;
  const str = String(s);
  return str.length > n ? `${str.slice(0, n)}…` : str;
}

const driver = config.sms.driver === 'ekomesaj' ? ekomesajDriver : logDriver;

module.exports = { driver, ekomesajDriver, outbox, SmsProviderError, extractRef };
