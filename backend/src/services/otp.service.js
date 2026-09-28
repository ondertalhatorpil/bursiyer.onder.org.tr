/**
 * OTP (SMS doğrulama kodu) servisi.
 *
 * Kurallar (şartname Bölüm 7):
 *   - 6 haneli kod, 180 sn geçerli, kod başına 3 deneme
 *   - Aynı numara + amaç için yeniden gönderme 60 sn sonra
 *   - Numara başına saatte 5, IP başına saatte 10 gönderim
 *   - Yeni kod gönderilince aynı numara + amaç + konu için önceki kodlar geçersiz olur
 *   - Kod düz metin saklanmaz; amaç ve numarayla bağlanmış HMAC tutulur
 *     (veli kodu aday doğrulamasında kullanılamaz)
 */
const db = require('../db/knex');
const { hmac, safeEqualHex, randomDigits } = require('../lib/crypto');
const { AppError } = require('../lib/errors');
const { maskTrMobile } = require('../lib/phone');
const sms = require('./sms');

const OTP = {
  length: 6,
  ttlSec: 180,
  resendSec: 60,
  maxAttempts: 3,
  perPhonePerHour: 5,
  perIpPerHour: 10,
};

const TEMPLATE_BY_PURPOSE = {
  applicant: 'otp_applicant',
  guardian: 'otp_guardian',
  login: 'otp_login',
  admin_2fa: 'otp_login',
};

const codeHash = ({ purpose, phone, subjectRef, code }) => hmac(`${purpose}|${phone}|${subjectRef || ''}|${code}`);
const secondsAgo = (s) => new Date(Date.now() - s * 1000);

/**
 * Kod üretir ve SMS ile gönderir.
 * @param {object} p { phone, purpose, subjectRef?, ip?, vars?, applicationId? }
 * @returns {{ maskedPhone, expiresIn, resendIn }}
 */
async function sendOtp({ phone, purpose, subjectRef = null, ip = null, vars = {}, applicationId = null }) {
  const template = TEMPLATE_BY_PURPOSE[purpose];
  if (!template) throw new Error(`Bilinmeyen OTP amacı: ${purpose}`);

  // 1) Yeniden gönderme bekleme süresi
  const last = await db('otp_codes')
    .where({ phone, purpose })
    .andWhere('created_at', '>', secondsAgo(OTP.resendSec))
    .orderBy('id', 'desc')
    .first('created_at');
  if (last) {
    const wait = Math.ceil(OTP.resendSec - (Date.now() - new Date(last.created_at).getTime()) / 1000);
    throw new AppError(429, 'OTP_COOLDOWN', `Yeni kod için ${Math.max(wait, 1)} saniye bekleyin`, { retryAfter: Math.max(wait, 1) });
  }

  // 2) Saatlik sınırlar
  const hourAgo = secondsAgo(3600);
  const [{ n: phoneCount }] = await db('otp_codes').where({ phone }).andWhere('created_at', '>', hourAgo).count({ n: '*' });
  if (Number(phoneCount) >= OTP.perPhonePerHour) {
    throw new AppError(429, 'OTP_PHONE_LIMIT', 'Bu numaraya çok fazla kod gönderildi, lütfen 1 saat sonra tekrar deneyin');
  }
  if (ip) {
    const [{ n: ipCount }] = await db('otp_codes').where({ ip }).andWhere('created_at', '>', hourAgo).count({ n: '*' });
    if (Number(ipCount) >= OTP.perIpPerHour) {
      throw new AppError(429, 'OTP_IP_LIMIT', 'Çok fazla doğrulama kodu istediniz, lütfen 1 saat sonra tekrar deneyin');
    }
  }

  // 3) Önceki açık kodları geçersiz kıl, yenisini kaydet
  const now = new Date();
  const code = randomDigits(OTP.length);
  await db('otp_codes')
    .where({ phone, purpose, subject_ref: subjectRef })
    .whereNull('consumed_at')
    .andWhere('expires_at', '>', now)
    .update({ expires_at: now });

  const [otpId] = await db('otp_codes').insert({
    phone,
    purpose,
    subject_ref: subjectRef,
    code_hash: codeHash({ purpose, phone, subjectRef, code }),
    max_attempts: OTP.maxAttempts,
    expires_at: new Date(now.getTime() + OTP.ttlSec * 1000),
    ip,
    created_at: now,
  });

  // 4) Gönder. SMS başarısızsa kayıt silinir ki bekleme süresi/sınır boşa harcanmasın.
  try {
    const { smsLogId } = await sms.sendTemplate(template, phone, { ...vars, code }, { applicationId, kind: 'otp' });
    await db('otp_codes').where({ id: otpId }).update({ sms_log_id: smsLogId });
  } catch (err) {
    await db('otp_codes').where({ id: otpId }).del();
    throw err;
  }

  return { maskedPhone: maskTrMobile(phone), expiresIn: OTP.ttlSec, resendIn: OTP.resendSec };
}

/**
 * Kodu doğrular. Başarılıysa kod tüketilir (bir daha kullanılamaz).
 * Hatalıysa AppError fırlatır: OTP_INVALID (kalan hak ile), OTP_EXPIRED, OTP_LOCKED.
 */
async function verifyOtp({ phone, purpose, subjectRef = null, code }) {
  const input = String(code ?? '').replace(/\D/g, '');
  if (input.length !== OTP.length) {
    throw new AppError(422, 'OTP_INVALID', `Doğrulama kodu ${OTP.length} haneli olmalı`);
  }

  // Not: Hata transaction içinde fırlatılırsa deneme sayacı artışı da geri alınır.
  // Bu yüzden transaction sadece sonucu döndürür, hatalar commit'ten sonra fırlatılır.
  const result = await db.transaction(async (trx) => {
    const otp = await trx('otp_codes')
      .where({ phone, purpose, subject_ref: subjectRef })
      .whereNull('consumed_at')
      .orderBy('id', 'desc')
      .forUpdate()
      .first();

    if (!otp || new Date(otp.expires_at) <= new Date()) return { error: 'expired' };
    if (otp.attempts >= otp.max_attempts) return { error: 'locked' };

    const ok = safeEqualHex(otp.code_hash, codeHash({ purpose, phone, subjectRef, code: input }));
    if (!ok) {
      const attempts = otp.attempts + 1;
      await trx('otp_codes').where({ id: otp.id }).update({ attempts });
      const remaining = otp.max_attempts - attempts;
      return remaining <= 0 ? { error: 'locked' } : { error: 'invalid', remaining };
    }

    await trx('otp_codes').where({ id: otp.id }).update({ consumed_at: new Date() });
    return { ok: true };
  });

  if (result.ok) return true;
  if (result.error === 'expired') {
    throw new AppError(410, 'OTP_EXPIRED', 'Kodun süresi doldu, lütfen yeni kod isteyin');
  }
  if (result.error === 'locked') {
    throw new AppError(429, 'OTP_LOCKED', 'Çok fazla hatalı deneme yaptınız, lütfen yeni kod isteyin');
  }
  throw new AppError(422, 'OTP_INVALID', `Doğrulama kodu hatalı. Kalan deneme hakkı: ${result.remaining}`, { remaining: result.remaining });
}

module.exports = { sendOtp, verifyOtp, OTP };
