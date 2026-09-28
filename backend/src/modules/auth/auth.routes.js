/**
 * /api/auth
 *   POST /register/start    Adım 1: bilgiler + onaylar -> SMS kodu
 *   POST /register/resend   kodu tekrar gönder
 *   POST /register/verify   Adım 2: kod -> hesap + taslak başvuru + oturum
 *   POST /login/start       kimlik no -> kayıtlı numaraya SMS kodu
 *   POST /login/resend
 *   POST /login/verify      kod -> oturum
 *   GET  /me                oturumdaki aday + başvuru özeti
 *   POST /logout
 */
const { Router } = require('express');
const { validate } = require('../../middlewares/validate');
const { otpSendLimiter, authLimiter } = require('../../middlewares/rate-limit');
const { requireCaptcha } = require('../../middlewares/captcha');
const { requireApplicant } = require('../../middlewares/auth-applicant');
const schema = require('./auth.schema');
const c = require('./auth.controller');

const router = Router();

router.post('/register/start', otpSendLimiter, validate({ body: schema.registerStart }), requireCaptcha, c.registerStart);
router.post('/register/resend', otpSendLimiter, validate({ body: schema.registerResend }), requireCaptcha, c.registerResend);
router.post('/register/verify', authLimiter, validate({ body: schema.registerVerify }), c.registerVerify);

router.post('/login/start', otpSendLimiter, validate({ body: schema.loginStart }), requireCaptcha, c.loginStart);
router.post('/login/resend', otpSendLimiter, validate({ body: schema.loginResend }), requireCaptcha, c.loginResend);
router.post('/login/verify', authLimiter, validate({ body: schema.loginVerify }), c.loginVerify);

router.get('/me', requireApplicant, c.me);
router.post('/logout', c.logout);

module.exports = router;
