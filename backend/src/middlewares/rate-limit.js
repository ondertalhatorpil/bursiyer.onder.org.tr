/**
 * IP bazlı genel hız sınırları. Numara bazlı OTP sınırları 3. aşamada otp servisinde (DB üzerinden).
 * Not: Tek sunucu için bellekte tutulur. Birden fazla backend container'ı olursa Redis store gerekir.
 */
const { rateLimit } = require('express-rate-limit');
const config = require('../config');

// Testlerde bellek içi sınırlar kapalı (her test aynı IP'den çok istek atar)
const skip = () => config.isTest;

const json = (message) => ({ error: { code: 'TOO_MANY_REQUESTS', message } });

// Tüm API: IP başına dakikada 120 istek
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip,
  message: json('Çok fazla istek gönderdiniz, lütfen biraz bekleyiniz'),
});

const { normalizeTrMobile } = require('../lib/phone');
const otpSendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) => config.isTest || config.testOtp.phones.includes(normalizeTrMobile(req.body?.phone)),
  message: json('Çok fazla doğrulama kodu istediniz, lütfen daha sonra tekrar deneyiniz'),
});



// Giriş denemeleri (admin şifre, OTP doğrulama): IP başına 15 dakikada 20
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip,
  message: json('Çok fazla deneme yaptınız, lütfen 15 dakika sonra tekrar deneyiniz'),
});

module.exports = { apiLimiter, otpSendLimiter, authLimiter };
