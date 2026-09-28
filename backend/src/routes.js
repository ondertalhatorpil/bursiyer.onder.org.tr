/**
 * Tüm API route'ları /api altında buradan bağlanır.
 * Modüller aşama aşama eklenecek (yorum satırlarını açarak).
 */
const { Router } = require('express');
const db = require('./db/knex');

const router = Router();

// Sağlık kontrolü: uygulama + veritabanı
router.get('/health', async (req, res) => {
  let database = 'ok';
  try {
    await db.raw('SELECT 1');
  } catch {
    database = 'down';
  }
  res.status(database === 'ok' ? 200 : 503).json({ status: database === 'ok' ? 'ok' : 'degraded', database });
});

router.use('/public', require('./modules/public/public.routes'));
router.use('/auth', require('./modules/auth/auth.routes'));
router.use('/application', require('./modules/application/application.routes')); // Adım 4-7: Aşama 5-7
router.use('/documents', require('./modules/documents/documents.routes'));
router.use('/iban', require('./modules/iban/iban.routes')); // Adım 8
router.use('/webhooks', require('./modules/webhooks/webhooks.routes'));
router.use('/admin', require('./modules/admin/admin.routes'));

module.exports = router;
