/**
 * SMS servisi: şablonu DB'den okur, değişkenleri doldurur, sms_logs'a yazar ve sürücüyle gönderir.
 * Mesaj içeriği loglanmaz (OTP kodu içerebilir); sadece şablon kodu ve durum tutulur.
 */
const db = require('../../db/knex');
const logger = require('../../lib/logger');
const { AppError } = require('../../lib/errors');
const { driver } = require('./ekomesaj');

function render(body, vars = {}) {
  return body.replace(/\{(\w+)\}/g, (m, key) => (vars[key] != null ? String(vars[key]) : m));
}

/**
 * @param {string} templateCode  sms_templates.code
 * @param {string} phone         905XXXXXXXXX
 * @param {object} vars          şablon değişkenleri ({code}, {tracking_no} ...)
 * @param {object} opts          { applicationId?, kind?: 'otp'|'info', trx? }
 * @returns {Promise<{ smsLogId: number|null, skipped?: boolean }>}
 */
async function sendTemplate(templateCode, phone, vars = {}, opts = {}) {
  const template = await db('sms_templates').where({ code: templateCode }).first();
  if (!template) throw new Error(`SMS şablonu bulunamadı: ${templateCode}`);
  const kind = opts.kind || (templateCode.startsWith('otp_') ? 'otp' : 'info');
  // Bilgilendirme SMS'leri panelden kapatılabilir; doğrulama kodları her zaman gönderilir
  if (!template.is_active && kind !== 'otp') return { smsLogId: null, skipped: true };

  const text = render(template.body, vars);

  const [smsLogId] = await db('sms_logs').insert({
    application_id: opts.applicationId || null,
    phone,
    template_code: templateCode,
    status: 'queued',
  });

  try {
    const { providerRef, raw } = await driver.send({ phone, text, kind, title: template.name });
    await db('sms_logs').where({ id: smsLogId }).update({
      status: 'sent', provider_ref: providerRef, status_detail: raw || null,
    });
    return { smsLogId };
  } catch (err) {
    logger.error({ err: err.message, meta: err.meta, templateCode }, 'SMS gönderilemedi');
    await db('sms_logs').where({ id: smsLogId }).update({ status: 'failed', status_detail: String(err.message).slice(0, 250) });
    throw new AppError(502, 'SMS_FAILED', 'SMS gönderilemedi, lütfen biraz sonra tekrar deneyin');
  }
}

async function getCredit() {
  try {
    return await driver.getCredit();
  } catch (err) {
    logger.warn({ err: err.message }, 'SMS kredisi alınamadı');
    return null;
  }
}

module.exports = { sendTemplate, getCredit, render };
