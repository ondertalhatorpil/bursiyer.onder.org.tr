/**
 * /api/admin/sponsors  burs veren firmalar
 *   GET    /             liste (tüm admin kullanıcıları: bursiyere atama için)
 *   GET    /:id/logo     logo görseli
 *   POST   /             yeni firma                (manage_settings)
 *   PATCH  /:id          düzenle / aktif-pasif     (manage_settings)
 *   DELETE /:id          sil (bursiyere atanmamışsa) (manage_settings)
 *   POST   /:id/logo     logo yükle: multipart "file", PNG/JPG, 2 MB (manage_settings)
 *   DELETE /:id/logo     logoyu kaldır             (manage_settings)
 */
const { Router } = require('express');
const { validate } = require('../../../middlewares/validate');
const { requirePermission } = require('../../../middlewares/auth-admin');
const { uploadSingle } = require('../../../middlewares/upload');
const { audit } = require('../../../services/audit.service');
const storage = require('../../../services/storage.service');
const svc = require('../../../services/sponsor.service');
const s = require('./sponsors.schema');

const router = Router();
const manage = requirePermission('manage_settings');

router.get('/', async (req, res) => {
  res.json({ items: await svc.list() });
});

router.get('/:id/logo', validate({ params: s.params }), async (req, res) => {
  const row = await svc.getLogo(req.valid.params.id);
  res.set({
    'Content-Type': row.logo_mime,
    'Cache-Control': 'private, max-age=86400',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'X-Content-Type-Options': 'nosniff',
  });
  storage.createReadStream(row.logo_key).pipe(res);
});

router.post('/', manage, validate({ body: s.create }), async (req, res) => {
  const id = await svc.create(req.admin.id, req.valid.body);
  await audit(req, 'sponsor.create', { targetType: 'sponsor', targetId: id, meta: { name: req.valid.body.name } });
  res.status(201).json({ id, items: await svc.list() });
});

router.patch('/:id', manage, validate({ params: s.params, body: s.update }), async (req, res) => {
  const { id } = req.valid.params;
  await svc.update(id, req.valid.body);
  await audit(req, 'sponsor.update', { targetType: 'sponsor', targetId: id, meta: req.valid.body });
  res.json({ items: await svc.list() });
});

router.delete('/:id', manage, validate({ params: s.params }), async (req, res) => {
  const { id } = req.valid.params;
  const row = await svc.remove(id);
  await audit(req, 'sponsor.delete', { targetType: 'sponsor', targetId: id, meta: { name: row.name } });
  res.json({ items: await svc.list() });
});

router.post('/:id/logo', manage, validate({ params: s.params }), uploadSingle, async (req, res) => {
  const { id } = req.valid.params;
  await svc.setLogo(id, req.file);
  await audit(req, 'sponsor.logo', { targetType: 'sponsor', targetId: id });
  res.json({ items: await svc.list() });
});

router.delete('/:id/logo', manage, validate({ params: s.params }), async (req, res) => {
  const { id } = req.valid.params;
  await svc.removeLogo(id);
  await audit(req, 'sponsor.logo_remove', { targetType: 'sponsor', targetId: id });
  res.json({ items: await svc.list() });
});

module.exports = router;
