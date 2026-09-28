/**
 * /api/admin/users  (manage_users yetkisi)
 *   GET   /                     kullanıcılar (kapsamlarıyla)
 *   GET   /roles                roller
 *   GET   /channels             kapsam seçimi için tüm kanal / birimler
 *   GET   /audit-logs           işlem kayıtları
 *   POST  /                     yeni kullanıcı (geçici şifre döner)
 *   PATCH /:id                  düzenle / rol / aktif-pasif
 *   POST  /:id/reset-password   geçici şifre üret
 *   PUT   /:id/scopes           yetki alanları
 */
const { Router } = require('express');
const db = require('../../../db/knex');
const { validate } = require('../../../middlewares/validate');
const { requirePermission } = require('../../../middlewares/auth-admin');
const { audit } = require('../../../services/audit.service');
const svc = require('../../../services/admin-users.service');
const s = require('./users.schema');

const router = Router();
router.use(requirePermission('manage_users'));

router.get('/', async (req, res) => {
  res.json({ items: await svc.list(), roles: await svc.roles() });
});

router.get('/roles', async (req, res) => {
  res.json(await svc.roles());
});

router.get('/channels', async (req, res) => {
  const [channels, subs] = await Promise.all([
    db('channels').orderBy(['category', 'sort']),
    db('sub_units').orderBy(['channel_id', 'sort']),
  ]);
  res.json(channels.map((c) => ({
    id: c.id,
    category: c.category,
    name: c.name,
    isActive: !!c.is_active,
    subUnits: subs.filter((u) => u.channel_id === c.id).map((u) => ({ id: u.id, name: u.name, isActive: !!u.is_active })),
  })));
});

router.get('/audit-logs', validate({ query: s.auditQuery }), async (req, res) => {
  res.json(await svc.auditLogs(req.valid.query));
});

router.post('/', validate({ body: s.create }), async (req, res) => {
  const result = await svc.create(req.valid.body);
  await audit(req, 'user.create', { targetType: 'admin_user', targetId: result.user.id, meta: { email: result.user.email, role: result.user.role } });
  res.status(201).json(result);
});

router.patch('/:id', validate({ params: s.params, body: s.update }), async (req, res) => {
  const user = await svc.update(req.admin, req.valid.params.id, req.valid.body);
  const { phone, ...meta } = req.valid.body; // eslint-disable-line no-unused-vars
  await audit(req, 'user.update', { targetType: 'admin_user', targetId: user.id, meta: { email: user.email, ...meta } });
  res.json(user);
});

router.post('/:id/reset-password', validate({ params: s.params }), async (req, res) => {
  const result = await svc.resetPassword(req.admin, req.valid.params.id);
  const user = await svc.get(req.valid.params.id);
  await audit(req, 'user.reset_password', { targetType: 'admin_user', targetId: user.id, meta: { email: user.email } });
  res.json({ ...result, user });
});

router.put('/:id/scopes', validate({ params: s.params, body: s.scopes }), async (req, res) => {
  const user = await svc.setScopes(req.valid.params.id, req.valid.body.scopes);
  await audit(req, 'user.scopes', { targetType: 'admin_user', targetId: user.id, meta: { email: user.email, scopes: user.scopes.map((x) => x.label) } });
  res.json(user);
});

module.exports = router;
