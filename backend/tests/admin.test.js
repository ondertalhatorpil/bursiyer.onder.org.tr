/**
 * Admin paneli: giriş/2FA, yetki ve kapsam, liste/detay, değerlendirme akışı, export, dashboard.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');

process.env.SMS_DRIVER = 'log';
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'burs-admin-'));

const request = require('supertest');
const argon2 = require('argon2');
const app = require('../src/app');
const { db, resetApplications, openProgram } = require('./helpers/db');
const { registerApplicant, lastCode, outbox } = require('./helpers/applicant');
const { makePdf } = require('./helpers/pdf');

const PASSWORD = 'GucluSifre123';
let ch; let uni; let roles;

const pdf = (t) => makePdf([`${t} belge metni burada yer alir`, 'Aktif Ogrenci', 'Barkod No: ABCDEFGH1234']);

async function createAdmin(email, role, { mustChange = false, phone = '905550000001' } = {}) {
  const [id] = await db('admin_users').insert({
    email, full_name: `${role} Kullanıcı`, phone, role_id: roles[role],
    password_hash: await argon2.hash(PASSWORD, { type: argon2.argon2id }), must_change_password: mustChange,
  });
  return id;
}

async function adminAgent(email) {
  const agent = request.agent(app);
  const login = await agent.post('/api/admin/auth/login').send({ email, password: PASSWORD }).expect(200);
  await agent.post('/api/admin/auth/verify').send({ loginToken: login.body.loginToken, code: lastCode() }).expect(200);
  await db('otp_codes').update({ created_at: new Date(Date.now() - 120000) }); // sonraki girişler bekleme süresine takılmasın
  return agent;
}

/** Eksiksiz gönderilmiş üniversite başvurusu; { agent, trackingNo, publicId } */
async function submittedApplication(over = {}) {
  const agent = await registerApplicant(over);
  await agent.put('/api/application/category').send({ category: 'universite' }).expect(200);
  await agent.put('/api/application/channel').send({ channelId: ch.uni_wonder }).expect(200);
  await agent.put('/api/application/education').send({ cityId: 34, universityId: uni.id, faculty: 'Fen Fakültesi', department: 'Biyoloji', grade: '3' }).expect(200);
  await agent.post('/api/documents/ogrenci_belgesi').attach('file', pdf('Ogrenci'), 'ogrenci.pdf').expect(201);
  await agent.post('/api/documents/transkript').attach('file', pdf('Transkript'), 'transkript.pdf').expect(201);
  await agent.post('/api/documents/adli_sicil').field('consent', 'true').attach('file', pdf('Adli'), 'adli.pdf').expect(201);
  const res = await agent.post('/api/application/submit').send({ confirm: true }).expect(200);
  await db('otp_codes').del();
  return { agent, trackingNo: res.body.trackingNo, publicId: res.body.application.id };
}

beforeAll(async () => {
  ch = Object.fromEntries((await db('channels').select('id', 'code')).map((c) => [c.code, c.id]));
  roles = Object.fromEntries((await db('admin_roles').select('id', 'code')).map((r) => [r.code, r.id]));
  await db('universities').insert({ name: 'Test Devlet Üniversitesi', city_id: 34, type: 'devlet' }).onConflict('name').ignore();
  uni = await db('universities').where({ name: 'Test Devlet Üniversitesi' }).first();
});
beforeEach(async () => {
  await resetApplications();
  await db('audit_logs').del();
  await db('admin_scopes').del();
  await db('application_notes').del();
  await db('admin_users').del();
  await openProgram();
  outbox.length = 0;
});
afterAll(async () => {
  await db.destroy();
  fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
});

describe('admin girişi', () => {
  test('şifre + SMS kodu ile giriş, ayrı cookie', async () => {
    await createAdmin('gm@onder.org.tr', 'gm_reviewer');
    const agent = request.agent(app);
    await agent.post('/api/admin/auth/login').send({ email: 'gm@onder.org.tr', password: 'yanlis' }).expect(401);
    const login = await agent.post('/api/admin/auth/login').send({ email: 'GM@onder.org.tr', password: PASSWORD }).expect(200);
    expect(outbox.at(-1).phone).toBe('905550000001');
    const v = await agent.post('/api/admin/auth/verify').send({ loginToken: login.body.loginToken, code: lastCode() }).expect(200);
    expect(v.headers['set-cookie'][0]).toMatch(/^bk_admin=/);
    expect(v.body.admin).toMatchObject({ role: 'gm_reviewer', permissions: expect.arrayContaining(['decide']) });
    await agent.get('/api/admin/auth/me').expect(200);
    await agent.get('/api/auth/me').expect(401); // aday oturumu değil
  });

  test('olmayan kullanıcı ile yanlış şifre aynı cevap', async () => {
    const res = await request(app).post('/api/admin/auth/login').send({ email: 'yok@onder.org.tr', password: 'x' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('5 hatalı denemede hesap kilitlenir', async () => {
    await createAdmin('a@onder.org.tr', 'super_admin');
    for (let i = 0; i < 5; i++) await request(app).post('/api/admin/auth/login').send({ email: 'a@onder.org.tr', password: 'yanlis' });
    const res = await request(app).post('/api/admin/auth/login').send({ email: 'a@onder.org.tr', password: PASSWORD });
    expect(res.status).toBe(423);
  });

  test('ilk girişte şifre değiştirmeden işlem yapılamaz', async () => {
    await createAdmin('yeni@onder.org.tr', 'super_admin', { mustChange: true });
    const agent = await adminAgent('yeni@onder.org.tr');
    const me = await agent.get('/api/admin/auth/me').expect(200);
    expect(me.body.admin.mustChangePassword).toBe(true);
    await agent.get('/api/admin/applications').expect(403);

    await agent.post('/api/admin/auth/password').send({ currentPassword: PASSWORD, newPassword: 'kisa' }).expect(422);
    await agent.post('/api/admin/auth/password').send({ currentPassword: 'yanlis', newPassword: 'YeniSifre2026' }).expect(422);
    const ok = await agent.post('/api/admin/auth/password').send({ currentPassword: PASSWORD, newPassword: 'YeniSifre2026' }).expect(200);
    expect(ok.body.admin.mustChangePassword).toBe(false);
    await agent.get('/api/admin/applications').expect(200);
  });

  test('oturumsuz admin API 401', async () => {
    await request(app).get('/api/admin/applications').expect(401);
  });
});

describe('liste, arama, kapsam', () => {
  test('Genel Merkez tüm başvuruları görür; filtre ve arama', async () => {
    const { trackingNo } = await submittedApplication();
    await registerApplicant({ idNumber: '12345678950', phone: '05339990000', firstName: 'Zehra', lastName: 'Taslak' }); // taslak
    await createAdmin('gm@onder.org.tr', 'gm_reviewer');
    const gm = await adminAgent('gm@onder.org.tr');

    let res = await gm.get('/api/admin/applications').expect(200);
    expect(res.body.total).toBe(2);
    res = await gm.get('/api/admin/applications?status=submitted').expect(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      trackingNo, fullName: 'Ahmet Yılmaz', idNumber: '10000000146', categoryLabel: 'Üniversite Bursu',
      channel: 'WONDER', institution: 'Test Devlet Üniversitesi', city: 'İstanbul', statusLabel: 'Başvuru Tamamlandı',
    });

    for (const q of ['10000000146', trackingNo, 'ahmet yıl', '0532 111 22 33']) {
      res = await gm.get(`/api/admin/applications?q=${encodeURIComponent(q)}`).expect(200);
      expect(res.body.items.map((i) => i.trackingNo)).toEqual([trackingNo]);
    }
    res = await gm.get('/api/admin/applications?category=lise').expect(200);
    expect(res.body.total).toBe(0);
  });

  test('koordinatör sadece kapsamını görür, kimlik no maskeli', async () => {
    const { publicId } = await submittedApplication();
    const coordId = await createAdmin('koord@onder.org.tr', 'coordinator');
    const coord = await adminAgent('koord@onder.org.tr');

    expect((await coord.get('/api/admin/applications').expect(200)).body.total).toBe(0);
    await coord.get(`/api/admin/applications/${publicId}`).expect(404);

    await db('admin_scopes').insert({ admin_user_id: coordId, category: 'universite', channel_id: ch.uni_wonder });
    const list = await coord.get('/api/admin/applications').expect(200);
    expect(list.body.items[0].idNumber).toBe('100******46');
    const d = await coord.get(`/api/admin/applications/${publicId}`).expect(200);
    expect(d.body.application.applicant.idNumber).toBe('100******46');

    await db('admin_scopes').where({ admin_user_id: coordId }).update({ channel_id: ch.uni_onder_genclik });
    expect((await coord.get('/api/admin/applications').expect(200)).body.total).toBe(0);
  });
});

describe('detay ve belge', () => {
  test('detay tüm bölümleri içerir, görüntüleme loglanır', async () => {
    const { publicId } = await submittedApplication();
    await createAdmin('gm@onder.org.tr', 'gm_reviewer');
    const gm = await adminAgent('gm@onder.org.tr');
    const { body: { application: a } } = await gm.get(`/api/admin/applications/${publicId}`).expect(200);

    expect(a.applicant).toMatchObject({ idNumber: '10000000146', phone: '0 (532) 111 22 33' });
    expect(a.channel.name).toBe('WONDER');
    expect(a.education).toMatchObject({ university: 'Test Devlet Üniversitesi', grade: '3', universityType: 'devlet' });
    expect(a.documents.map((d) => d.typeCode)).toEqual(['ogrenci_belgesi', 'transkript', 'adli_sicil']);
    expect(a.history.map((h) => h.to)).toEqual(['draft', 'submitted']);
    expect(a.consents.map((c) => c.type)).toEqual(expect.arrayContaining(['kvkk', 'sharing', 'criminal_record']));
    expect(a.allowedTransitions.map((t) => t.to).sort()).toEqual(['in_review', 'rejected']);

    const file = await gm.get(`/api/admin/applications/${publicId}/documents/${a.documents[0].id}/file`).expect(200);
    expect(file.headers['content-type']).toBe('application/pdf');
    const logs = await db('audit_logs').pluck('action');
    expect(logs).toEqual(expect.arrayContaining(['admin.login', 'application.view', 'document.view']));
  });
});

describe('değerlendirme akışı', () => {
  test('inceleme -> revize -> aday yeniden yükler -> otomatik incelemeye döner -> onay', async () => {
    const { agent: applicant, publicId } = await submittedApplication();
    const coordId = await createAdmin('koord@onder.org.tr', 'coordinator', { phone: '905550000002' });
    await db('admin_scopes').insert({ admin_user_id: coordId, category: 'universite' });
    await createAdmin('gm@onder.org.tr', 'gm_reviewer');
    const coord = await adminAgent('koord@onder.org.tr');
    const gm = await adminAgent('gm@onder.org.tr');

    // Koordinatör incelemeye alır, onaylayamaz
    let res = await coord.post(`/api/admin/applications/${publicId}/status`).send({ to: 'in_review' }).expect(200);
    expect(res.body.application.status).toBe('in_review');
    await coord.post(`/api/admin/applications/${publicId}/status`).send({ to: 'approved' }).expect(403);

    // İşaretli belge olmadan revize istenemez
    res = await coord.post(`/api/admin/applications/${publicId}/status`).send({ to: 'revision_requested' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('NO_REVISION_DOCUMENTS');

    const docId = (await coord.get(`/api/admin/applications/${publicId}`)).body.application.documents[0].id;
    await coord.patch(`/api/admin/applications/${publicId}/documents/${docId}`).send({ reviewStatus: 'revision_requested' }).expect(422);
    await coord.patch(`/api/admin/applications/${publicId}/documents/${docId}`)
      .send({ reviewStatus: 'revision_requested', note: 'Belge 15 günden eski, güncelini yükleyin' }).expect(200);

    outbox.length = 0;
    res = await coord.post(`/api/admin/applications/${publicId}/status`).send({ to: 'revision_requested', note: 'Öğrenci belgesi eski' }).expect(200);
    expect(res.body.application.status).toBe('revision_requested');
    expect(outbox.at(-1).text).toMatch(/duzeltilmesi gereken/);

    // Aday: durum ve belge listesi; sadece işaretli belgeyi yükleyebilir
    const docs = (await applicant.get('/api/documents').expect(200)).body.items;
    expect(docs.find((d) => d.code === 'ogrenci_belgesi')).toMatchObject({ editable: true, upload: { reviewStatus: 'revision_requested', reviewNote: 'Belge 15 günden eski, güncelini yükleyin' } });
    await applicant.post('/api/documents/transkript').attach('file', pdf('T'), 't.pdf').expect(409);
    await applicant.post('/api/documents/ogrenci_belgesi').attach('file', pdf('Yeni ogrenci'), 'yeni.pdf').expect(201);
    expect((await applicant.get('/api/auth/me').expect(200)).body.application.status).toBe('in_review');

    // Genel Merkez onaylar -> SMS
    outbox.length = 0;
    res = await gm.post(`/api/admin/applications/${publicId}/status`).send({ to: 'approved' }).expect(200);
    expect(res.body.application.status).toBe('approved');
    expect(res.body.application.decidedAt).toBeTruthy();
    expect(outbox.at(-1).text).toMatch(/onaylanmistir/);
    expect(res.body.application.history.map((h) => h.to)).toEqual(['draft', 'submitted', 'in_review', 'revision_requested', 'in_review', 'approved']);
  });

  test('red gerekçe ister; geri alınabilir', async () => {
    const { publicId } = await submittedApplication();
    await createAdmin('gm@onder.org.tr', 'gm_reviewer');
    const gm = await adminAgent('gm@onder.org.tr');
    await gm.post(`/api/admin/applications/${publicId}/status`).send({ to: 'rejected' }).expect(422);
    let res = await gm.post(`/api/admin/applications/${publicId}/status`).send({ to: 'rejected', reason: 'Referans listesinde yok' }).expect(200);
    expect(res.body.application).toMatchObject({ status: 'rejected', rejectionReason: 'Referans listesinde yok' });
    res = await gm.post(`/api/admin/applications/${publicId}/status`).send({ to: 'in_review', note: 'Yanlışlıkla reddedildi' }).expect(200);
    expect(res.body.application.rejectionReason).toBeNull();
  });

  test('görüntüleyici işlem yapamaz; not ve referans teyidi', async () => {
    const { publicId } = await submittedApplication();
    await createAdmin('izle@onder.org.tr', 'viewer', { phone: '905550000003' });
    await db('admin_scopes').insert({ admin_user_id: (await db('admin_users').first('id')).id });
    await createAdmin('gm@onder.org.tr', 'gm_reviewer');
    const viewer = await adminAgent('izle@onder.org.tr');
    const gm = await adminAgent('gm@onder.org.tr');

    await viewer.get(`/api/admin/applications/${publicId}`).expect(200);
    await viewer.post(`/api/admin/applications/${publicId}/status`).send({ to: 'in_review' }).expect(403);
    await viewer.post(`/api/admin/applications/${publicId}/notes`).send({ body: 'deneme' }).expect(403);
    await viewer.get('/api/admin/applications/export').expect(403);

    let res = await gm.post(`/api/admin/applications/${publicId}/notes`).send({ kind: 'recommend_approve', body: 'Belgeler tam' }).expect(201);
    expect(res.body.application.notes[0]).toMatchObject({ kind: 'recommend_approve', body: 'Belgeler tam', author: 'gm_reviewer Kullanıcı' });
    res = await gm.post(`/api/admin/applications/${publicId}/reference`).send({ verified: true }).expect(200);
    expect(res.body.application.reference).toMatchObject({ verified: true, verifiedBy: 'gm_reviewer Kullanıcı' });
  });
});

describe('export ve dashboard', () => {
  test('Excel export', async () => {
    await submittedApplication();
    await createAdmin('gm@onder.org.tr', 'gm_reviewer');
    const gm = await adminAgent('gm@onder.org.tr');
    const res = await gm.get('/api/admin/applications/export?status=submitted').buffer(true)
      .parse((r, cb) => { const chunks = []; r.on('data', (c) => chunks.push(c)); r.on('end', () => cb(null, Buffer.concat(chunks))); })
      .expect(200);
    expect(res.headers['content-type']).toMatch(/spreadsheetml/);
    expect(res.body.subarray(0, 2).toString()).toBe('PK'); // xlsx = zip
  });

  test('dashboard sayıları', async () => {
    await submittedApplication();
    await createAdmin('gm@onder.org.tr', 'gm_reviewer');
    const gm = await adminAgent('gm@onder.org.tr');
    const { body } = await gm.get('/api/admin/dashboard').expect(200);
    expect(body.totalSubmitted).toBe(1);
    expect(body.status.find((s) => s.code === 'submitted').count).toBe(1);
    expect(body.byCategory).toEqual([{ code: 'universite', label: 'Üniversite Bursu', count: 1 }]);
    expect(body.daily).toHaveLength(1);
    const programs = await gm.get('/api/admin/programs').expect(200);
    expect(programs.body[0].name).toBe('2026-2027');
  });
});
