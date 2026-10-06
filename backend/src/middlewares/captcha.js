/**
 * Cloudflare Turnstile doğrulaması (SMS gönderen uç noktaların önünde).
 * TURNSTILE_SECRET boşsa kontrol atlanır (geliştirme/test).
 * Frontend token'ı body.captchaToken olarak gönderir.
 */
const config = require('../config');
const { AppError } = require('../lib/errors');

async function requireCaptcha(req, res, next) {
  if (!config.turnstileSecret) return next();

  const token = req.body?.captchaToken;
  if (!token || typeof token !== 'string') {
    return next(new AppError(400, 'CAPTCHA_REQUIRED', 'Lütfen güvenlik doğrulamasını tamamlayınız'));
  }

  try {
    const res2 = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: config.turnstileSecret, response: token, remoteip: req.ip }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await res2.json();
    if (!data.success) {
      return next(new AppError(400, 'CAPTCHA_FAILED', 'Güvenlik doğrulaması başarısız, lütfen tekrar deneyiniz'));
    }
  } catch (err) {
    req.log.error({ err: err.message }, 'Turnstile doğrulaması yapılamadı');
    return next(new AppError(503, 'CAPTCHA_UNAVAILABLE', 'Güvenlik doğrulaması şu an yapılamıyor, lütfen tekrar deneyiniz'));
  }
  return next();
}

module.exports = { requireCaptcha };
