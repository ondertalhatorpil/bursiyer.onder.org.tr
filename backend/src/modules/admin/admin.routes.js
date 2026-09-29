/**
 * /api/admin
 *   /auth           giriş, 2FA, şifre (auth/auth.routes.js)
 *   /dashboard      özet
 *   /programs       dönemler
 *   /applications   başvuru değerlendirme
 *   /settings       dönem, onay metinleri, ekran metinleri, SMS şablonları
 *   /users          admin kullanıcıları, yetki alanları, işlem kayıtları
 *   /sponsors       burs veren firmalar
 */
const { Router } = require('express');
const { requireAdmin } = require('../../middlewares/auth-admin');

const router = Router();

router.use('/auth', require('./auth/auth.routes'));
router.use(requireAdmin());
router.use('/', require('./reports/reports.routes'));
router.use('/applications', require('./applications/applications.routes'));
router.use('/settings', require('./settings/settings.routes'));
router.use('/users', require('./users/users.routes'));
router.use('/sponsors', require('./sponsors/sponsors.routes'));

module.exports = router;
