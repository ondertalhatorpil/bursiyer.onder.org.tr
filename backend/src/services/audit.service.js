/**
 * Admin işlem kaydı (KVKK: kim, hangi başvuruyu, ne zaman görüntüledi/indirdi/değiştirdi).
 * Kayıt başarısız olursa işlem durdurulmaz, sadece loglanır.
 */
const db = require('../db/knex');
const logger = require('../lib/logger');

async function audit(req, action, { targetType = null, targetId = null, meta = null } = {}) {
  try {
    await db('audit_logs').insert({
      admin_user_id: req.admin?.id || null,
      action,
      target_type: targetType,
      target_id: targetId,
      meta: meta ? JSON.stringify(meta) : null,
      ip: req.ip || null,
      created_at: new Date(),
    });
  } catch (err) {
    logger.error({ err: err.message, action }, 'Audit kaydı yazılamadı');
  }
}

module.exports = { audit };
