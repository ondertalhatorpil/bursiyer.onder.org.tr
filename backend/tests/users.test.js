/**
 * Aşama 9: admin kullanıcıları, yetki alanları, işlem kayıtları.
 */
process.env.SMS_DRIVER = 'log';

const request = require('supertest');
const app = require('../src/app');
const { db, resetApplications } = require('./helpers/db');
const { lastCode } = require('./helpers/applicant');
const { createAdmin, adminAgent } = require('./helpers/admin');

let admin;
let superId;
let ch;
let closedBlock;

beforeAll(async () => {
  closedBlock = await db('content_blocks').where({ key: 'applications_closed' }).first();
  ch = Object.fromEntries((await db('channels').select('id', 'code')).map((c) => [c.code, c.id]));
});
beforeEach(async () => {
  await resetApplications();
  await db('audit_logs').del();
  await db('admin_scopes').del();
  await db('application_notes').del();
  await db('admin_users').del();
  superId = await createAdmin('super@onder.org.tr', 'super_admin');
  admin = await adminAgent('super@onder.org.tr');
});
afterAll(async () => {
  await db('content_blocks').where({ key: 'applications_closed' }).update(closedBlock);
  await db('audit_logs').del();
  await db('admin_scopes').del();
  await db('admin_users').del();
  await db.destroy();
});

async function loginWithTemp(email, password) {
  const agent = request.agent(app);
  const login = await agent.post('/api/admin/auth/login').send({ email, password }).expect(200);
  const v = await agent.post('/api/admin/auth/verify').send({ loginToken: login.body.loginToken, code: lastCode() }).expect(200);
  await db('otp_codes').update({ created_at: new Date(Date.now() - 120000) });
  return { agent, admin: v.body.admin };
}

describe('kullanıcılar', () => {
  test('ekleme: geçici şifre bir kez döner, ilk girişte şifre değişimi zorunlu', async () => {
    const res = await admin.post('/api/admin/users')
      .send({ email: 'Koord@Onder.org.tr', fullName: 'Ayşe Koordinatör', phone: '0 (532) 111 22 33', role: 'coordinator' }).expect(201);
    expect(res.body.user).toMatchObject({ email: 'koord@onder.org.tr', role: 'coordinator', phone: '0 (532) 111 22 33', mustChangePassword: true });
    expect(res.body.tempPassword).toHaveLength(12);

    const { agent, admin: me } = await loginWithTemp('koord@onder.org.tr', res.body.tempPassword);
    expect(me.mustChangePassword).toBe(true);
    await agent.get('/api/admin/applications').expect(403);

    await admin.post('/api/admin/users').send({ email: 'koord@onder.org.tr', fullName: 'Tekrar', phone: '05321112233', role: 'viewer' }).expect(422);
    const bad = await admin.post('/api/admin/users').send({ email: 'x', fullName: 'A', phone: '123', role: 'boss' }).expect(422);
    expect(Object.keys(bad.body.error.details)).toEqual(expect.arrayContaining(['email', 'fullName', 'phone', 'role']));

    const list = await admin.get('/api/admin/users').expect(200);
    expect(list.body.items).toHaveLength(2);
    expect(list.body.roles.find((r) => r.code === 'coordinator').usesScopes).toBe(true);
  });

  test('pasife alma ve rol değişimi oturumu kapatır; kendi hesabına ve son süper admine dokunulamaz', async () => {
    const gmId = await createAdmin('gm@onder.org.tr', 'gm_reviewer', { phone: '905550000002' });
    const gm = await adminAgent('gm@onder.org.tr');
    await gm.get('/api/admin/applications').expect(200);

    await admin.patch(`/api/admin/users/${gmId}`).send({ isActive: false }).expect(200);
    await gm.get('/api/admin/applications').expect(401);

    const self = await admin.patch(`/api/admin/users/${superId}`).send({ isActive: false }).expect(422);
    expect(self.body.error.details.isActive).toBeTruthy();
    await admin.patch(`/api/admin/users/${superId}`).send({ role: 'viewer' }).expect(422);

    // İkinci süper admin, ilkini düşürmeye çalışır: ilki son aktif süper admin değilse olur
    await db('admin_users').where({ id: gmId }).update({ is_active: true });
    await admin.patch(`/api/admin/users/${gmId}`).send({ role: 'super_admin' }).expect(200);
    const second = await adminAgent('gm@onder.org.tr');
    await second.patch(`/api/admin/users/${superId}`).send({ role: 'gm_reviewer' }).expect(200);
    const last = await second.patch(`/api/admin/users/${gmId}`).send({ isActive: false }).expect(422);
    expect(last.body.error.details.isActive).toBeTruthy(); // kendini pasife alamaz
    await db('admin_users').where({ id: superId }).update({ is_active: false });
    // Artık tek süper admin gm; başkası (yoksa) onu düşüremez: servis kuralı
    const svc = require('../src/services/admin-users.service');
    await expect(svc.update({ id: 999 }, gmId, { role: 'viewer' })).rejects.toMatchObject({ code: 'LAST_SUPER_ADMIN' });
  });

  test('şifre sıfırlama: kilidi açar, eski şifre geçmez, oturumlar kapanır', async () => {
    const id = await createAdmin('v@onder.org.tr', 'viewer', { phone: '905550000003' });
    const v = await adminAgent('v@onder.org.tr');
    await db('admin_users').where({ id }).update({ locked_until: new Date(Date.now() + 600000), failed_logins: 3 });

    const res = await admin.post(`/api/admin/users/${id}/reset-password`).expect(200);
    expect(res.body.user).toMatchObject({ mustChangePassword: true, lockedUntil: null });
    await v.get('/api/admin/auth/me').expect(401);
    await request(app).post('/api/admin/auth/login').send({ email: 'v@onder.org.tr', password: 'GucluSifre123' }).expect(401);
    await loginWithTemp('v@onder.org.tr', res.body.tempPassword);

    await admin.post(`/api/admin/users/${superId}/reset-password`).expect(409);
  });
});

describe('yetki alanları', () => {
  test('kanal kategoriyi belirler, birim kanala ait olmalı, okunur etiket döner', async () => {
    const id = await createAdmin('k@onder.org.tr', 'coordinator', { phone: '905550000004' });
    const channels = await admin.get('/api/admin/users/channels').expect(200);
    const genclik = channels.body.find((c) => c.id === ch.uni_onder_genclik) || channels.body.find((c) => c.subUnits.length);
    const sub = genclik.subUnits[0];
    const other = channels.body.find((c) => c.id !== genclik.id && c.subUnits.length);

    await admin.put(`/api/admin/users/${id}/scopes`).send({ scopes: [{ channelId: genclik.id, subUnitId: other.subUnits[0].id }] }).expect(422);
    await admin.put(`/api/admin/users/${id}/scopes`).send({ scopes: [{}] }).expect(422);

    const res = await admin.put(`/api/admin/users/${id}/scopes`)
      .send({ scopes: [{ channelId: genclik.id, subUnitId: sub.id }, { category: 'lise', cityId: 34 }] }).expect(200);
    expect(res.body.scopes.map((s) => s.label)).toEqual([
      expect.stringContaining(`${genclik.name} · ${sub.name}`),
      'Lise · İstanbul',
    ]);
    expect(res.body.scopes[0].category).toBe(genclik.category);

    await admin.put(`/api/admin/users/${id}/scopes`).send({ scopes: [] }).expect(200);
    expect(await db('admin_scopes').where({ admin_user_id: id })).toHaveLength(0);
  });
});

describe('işlem kayıtları', () => {
  test('ayar ve kullanıcı işlemleri kaydedilir, filtrelenir', async () => {
    await admin.post('/api/admin/users').send({ email: 'n@onder.org.tr', fullName: 'Yeni Kişi', phone: '05321112244', role: 'viewer' }).expect(201);
    await admin.put('/api/admin/settings/content/applications_closed').send({ title: 'Kapalı', body: 'Kapalı.' }).expect(200);

    const all = await admin.get('/api/admin/users/audit-logs').expect(200);
    expect(all.body.items.map((i) => i.action)).toEqual(expect.arrayContaining(['admin.login', 'user.create', 'settings.content']));
    expect(all.body.items.find((i) => i.action === 'user.create')).toMatchObject({ admin: 'super_admin Kullanıcı', actionLabel: 'Kullanıcı ekledi' });

    const onlyUsers = await admin.get('/api/admin/users/audit-logs?action=user.').expect(200);
    expect(onlyUsers.body.items.every((i) => i.action.startsWith('user.'))).toBe(true);
    expect(onlyUsers.body.total).toBe(1);
  });
});
