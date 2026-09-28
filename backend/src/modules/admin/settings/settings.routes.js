/**
 * /api/admin/settings  (manage_settings yetkisi)
 *   GET   /programs                   dönemler + açılış için eksikler
 *   POST  /programs                   yeni dönem
 *   PATCH /programs/:id               aç / kapat, tarihler, başlık, ön ek
 *   GET   /consents                   onay metinleri (tip başına sürümler)
 *   PUT   /consents/:type             metni kaydet ve yayınla (gerekirse yeni sürüm)
 *   GET   /content                    ekran metinleri
 *   PUT   /content/:key
 *   GET   /sms                        SMS şablonları + kredi
 *   PUT   /sms/:code
 *   POST  /sms/:code/test             kendi telefonuna örnek SMS
 */
const { Router } = require('express');
const { validate } = require('../../../middlewares/validate');
const { requirePermission } = require('../../../middlewares/auth-admin');
const { audit } = require('../../../services/audit.service');
const svc = require('../../../services/settings.service');
const sms = require('../../../services/sms');
const s = require('./settings.schema');

const router = Router();
router.use(requirePermission('manage_settings'));

router.get('/programs', async (req, res) => {
  res.json(await svc.listPrograms());
});

router.post('/programs', validate({ body: s.programCreate }), async (req, res) => {
  const id = await svc.createProgram(req.valid.body);
  await audit(req, 'settings.program_create', { targetType: 'program', targetId: id, meta: req.valid.body });
  res.status(201).json(await svc.listPrograms());
});

router.patch('/programs/:id', validate({ params: s.programParams, body: s.programUpdate }), async (req, res) => {
  await svc.updateProgram(req.valid.params.id, req.valid.body);
  await audit(req, 'settings.program', { targetType: 'program', targetId: req.valid.params.id, meta: req.valid.body });
  res.json(await svc.listPrograms());
});

router.get('/consents', async (req, res) => {
  res.json(await svc.listConsents());
});

router.put('/consents/:type', validate({ params: s.consentParams, body: s.consentPublish }), async (req, res) => {
  const { type } = req.valid.params;
  const result = await svc.publishConsent(type, req.valid.body, req.admin.id);
  await audit(req, 'settings.consent', { targetType: 'consent', meta: { type, ...result } });
  res.json({ ...result, items: await svc.listConsents() });
});

router.get('/content', async (req, res) => {
  res.json(await svc.listContent());
});

router.put('/content/:key', validate({ params: s.contentParams, body: s.contentUpdate }), async (req, res) => {
  await svc.updateContent(req.valid.params.key, req.valid.body);
  await audit(req, 'settings.content', { targetType: 'content', meta: { key: req.valid.params.key } });
  res.json(await svc.listContent());
});

router.get('/sms', async (req, res) => {
  const [templates, credit] = await Promise.all([svc.listSmsTemplates(), sms.getCredit()]);
  res.json({ templates, credit });
});

router.put('/sms/:code', validate({ params: s.smsParams, body: s.smsUpdate }), async (req, res) => {
  const template = await svc.updateSmsTemplate(req.valid.params.code, req.valid.body);
  await audit(req, 'settings.sms', { targetType: 'sms_template', meta: { code: req.valid.params.code, isActive: req.valid.body.isActive } });
  res.json(template);
});

router.post('/sms/:code/test', validate({ params: s.smsParams }), async (req, res) => {
  await svc.sendTestSms(req.valid.params.code, req.admin.phone);
  await audit(req, 'settings.sms_test', { targetType: 'sms_template', meta: { code: req.valid.params.code } });
  res.json({ ok: true });
});

module.exports = router;
