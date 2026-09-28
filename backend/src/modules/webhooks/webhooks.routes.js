/**
 * Ekomesaj teslim raporu (pushSettings.url).
 * Adres: POST /api/webhooks/ekomesaj/:token  (token = EKOMESAJ_WEBHOOK_TOKEN)
 *
 * Ekomesaj'ın gönderdiği JSON biçimi dokümanda yok. Bilinen olası alanlar denenir,
 * ham gövde loglanır. İlk canlı testten sonra biçime göre sadeleştirilecek.
 */
const { Router } = require('express');
const crypto = require('crypto');
const config = require('../../config');
const db = require('../../db/knex');
const { extractRef } = require('../../services/sms/ekomesaj');

const router = Router();

const DELIVERED = /deliver|iletildi|success|basarili|başarılı/i;
const FAILED = /fail|error|hata|undeliver|iletilemedi|reject|expired/i;

function tokenOk(given) {
  const expected = config.sms.webhookToken;
  if (!expected || !given || given.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

router.post('/ekomesaj/:token', async (req, res) => {
  if (!tokenOk(req.params.token)) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Adres bulunamadı' } });

  const items = Array.isArray(req.body) ? req.body : [req.body];
  for (const item of items) {
    req.log.info({ webhook: 'ekomesaj', body: item }, 'SMS teslim raporu');
    const ref = extractRef(item) ?? (item?.pkgID != null ? String(item.pkgID) : null);
    if (!ref) continue;

    const stateText = String(item.state ?? item.status ?? item.result ?? '');
    let status = null;
    if (DELIVERED.test(stateText)) status = 'delivered';
    else if (FAILED.test(stateText)) status = 'failed';

    await db('sms_logs').where({ provider_ref: ref }).update({
      ...(status && { status }),
      ...(status === 'delivered' && { delivered_at: new Date() }),
      status_detail: JSON.stringify(item).slice(0, 250),
    });
  }

  // Sağlayıcı tekrar denemesin diye her zaman 200
  res.json({ ok: true });
});

module.exports = router;
