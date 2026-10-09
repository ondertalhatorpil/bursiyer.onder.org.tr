/**
 * Ortam değişkenleri tek yerden okunur ve açılışta doğrulanır.
 * Eksik/hatalı değer varsa uygulama hiç başlamaz (hata mesajı hangi değişken olduğunu söyler).
 */
require('dotenv').config({ quiet: true });
const { z } = require('zod');

const KEY_HINT = 'Üretmek için: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"';
const base64Key = z.string({ error: `eksik. ${KEY_HINT}` })
  .refine((v) => Buffer.from(v, 'base64').length === 32, { message: `32 byte base64 olmalı. ${KEY_HINT}` });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  // Frontend adres(ler)i, virgülle ayrılmış. CORS ve cookie için.
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  // Nginx arkasında gerçek IP'yi almak için (production'da 1)
  TRUST_PROXY: z.coerce.number().int().default(0),

  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().default(3306),
  DB_USER: z.string({ error: 'eksik' }).min(1, 'eksik'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string({ error: 'eksik' }).min(1, 'eksik'),

  ENCRYPTION_KEY: base64Key,
  HASH_KEY: base64Key,

  // log: SMS gönderilmez, kod konsola yazılır (geliştirme). ekomesaj: gerçek gönderim.
  SMS_DRIVER: z.enum(['log', 'ekomesaj']).default('log'),
  EKOMESAJ_BASE_URL: z.string().url().default('http://panel4.ekomesaj.com:9587'),
  EKOMESAJ_USERNAME: z.string().default(''),
  EKOMESAJ_PASSWORD: z.string().default(''),
  EKOMESAJ_SENDER: z.string().default('ONDER iHD'),
  EKOMESAJ_ENCODING: z.coerce.number().int().default(1),
  // OTP hangi uç noktadan gitsin: create = normal gönderim (varsayılan), otp = /sms/create-otp
  // (create-otp, hesapta OTP hizmeti/başlığı tanımlanınca açılabilir)
  EKOMESAJ_OTP_MODE: z.enum(['create', 'otp']).default('create'),
  EKOMESAJ_WEBHOOK_TOKEN: z.string().default(''),
  // Backend'in dışarıdan erişilen adresi (Ekomesaj teslim raporu webhook'u için). Boşsa webhook kullanılmaz.
  PUBLIC_API_URL: z.string().url().or(z.literal('')).default(''),

  UPLOAD_DIR: z.string().default('./storage/uploads'),

  // Test numaraları (virgülle): bu numaralara SMS gitmez, kod her zaman TEST_OTP_CODE olur,
  // bekleme süresi ve saatlik sınır uygulanmaz. Admin girişinde (2FA) GEÇERLİ DEĞİLDİR.
  TEST_OTP_PHONES: z.string().default(''),
  TEST_OTP_CODE: z.string().regex(/^\d{6}$/, '6 haneli olmalı').default('123456'),

  // Cloudflare Turnstile. İkisi birlikte verilir; boşsa captcha kontrolü yapılmaz (geliştirme).
  // Site anahtarı herkese açıktır (frontend /api/public/config'ten alır), gizli anahtar sadece backend'de.
  TURNSTILE_SECRET: z.string().default(''),
  TURNSTILE_SITE_KEY: z.string().default(''),
  // Aday oturumu: hareketsizlik ve mutlak süre (dakika)
  SESSION_IDLE_MIN: z.coerce.number().int().default(30),
  SESSION_MAX_MIN: z.coerce.number().int().default(720),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
}).superRefine((env, ctx) => {
  if (env.SMS_DRIVER === 'ekomesaj' && (!env.EKOMESAJ_USERNAME || !env.EKOMESAJ_PASSWORD)) {
    ctx.addIssue({ code: 'custom', path: ['EKOMESAJ_USERNAME'], message: 'SMS_DRIVER=ekomesaj iken kullanıcı adı ve şifre zorunlu' });
  }
  if (Boolean(env.TURNSTILE_SECRET) !== Boolean(env.TURNSTILE_SITE_KEY)) {
    ctx.addIssue({ code: 'custom', path: ['TURNSTILE_SITE_KEY'], message: 'TURNSTILE_SECRET ve TURNSTILE_SITE_KEY birlikte verilmeli' });
  }
  if (env.NODE_ENV === 'production' && env.SMS_DRIVER === 'log') {
    ctx.addIssue({ code: 'custom', path: ['SMS_DRIVER'], message: "production'da SMS_DRIVER=ekomesaj olmalı" });
  }
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('\n.env hatalı:\n');
  for (const issue of parsed.error.issues) console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  console.error('');
  process.exit(1);
}

const env = parsed.data;

module.exports = {
  env: env.NODE_ENV,
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  corsOrigins: env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
  trustProxy: env.TRUST_PROXY,
  logLevel: env.LOG_LEVEL,
  db: {
    host: env.DB_HOST, port: env.DB_PORT, user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME,
  },
  keys: {
    encryption: Buffer.from(env.ENCRYPTION_KEY, 'base64'),
    hash: Buffer.from(env.HASH_KEY, 'base64'),
  },
  sms: {
    driver: env.SMS_DRIVER,
    baseUrl: env.EKOMESAJ_BASE_URL,
    username: env.EKOMESAJ_USERNAME,
    password: env.EKOMESAJ_PASSWORD,
    sender: env.EKOMESAJ_SENDER,
    encoding: env.EKOMESAJ_ENCODING,
    otpMode: env.EKOMESAJ_OTP_MODE,
    webhookToken: env.EKOMESAJ_WEBHOOK_TOKEN,
    webhookUrl: env.PUBLIC_API_URL && env.EKOMESAJ_WEBHOOK_TOKEN
      ? `${env.PUBLIC_API_URL.replace(/\/$/, '')}/api/webhooks/ekomesaj/${env.EKOMESAJ_WEBHOOK_TOKEN}`
      : null,
  },
  uploadDir: env.UPLOAD_DIR,
  testOtp: {
    phones: env.TEST_OTP_PHONES.split(',').map((p) => require('../lib/phone').normalizeTrMobile(p)).filter(Boolean),
    code: env.TEST_OTP_CODE,
  },
  turnstileSecret: env.TURNSTILE_SECRET,
  turnstileSiteKey: env.TURNSTILE_SITE_KEY,
  session: {
    cookieName: 'bk_sid',
    idleMs: env.SESSION_IDLE_MIN * 60 * 1000,
    maxMs: env.SESSION_MAX_MIN * 60 * 1000,
    secureCookie: env.NODE_ENV === 'production',
  },
};
