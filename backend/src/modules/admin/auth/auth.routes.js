/**
 * /api/admin/auth
 *   POST /login      e-posta + şifre -> telefona kod
 *   POST /resend
 *   POST /verify     kod -> oturum (bk_admin cookie)
 *   GET  /me
 *   POST /password   şifre değiştir (ilk girişte zorunlu)
 *   POST /logout
 */
const { Router } = require('express');
const { validate } = require('../../../middlewares/validate');
const { authLimiter, otpSendLimiter } = require('../../../middlewares/rate-limit');
const { requireAdmin } = require('../../../middlewares/auth-admin');
const schema = require('./auth.schema');
const c = require('./auth.controller');

const router = Router();

router.post('/login', authLimiter, validate({ body: schema.login }), c.login);
router.post('/resend', otpSendLimiter, validate({ body: schema.resend }), c.resend);
router.post('/verify', authLimiter, validate({ body: schema.verify }), c.verify);
router.get('/me', requireAdmin({ allowPasswordChange: true }), c.me);
router.post('/password', requireAdmin({ allowPasswordChange: true }), validate({ body: schema.changePassword }), c.changePassword);
router.post('/logout', c.logout);

module.exports = router;
