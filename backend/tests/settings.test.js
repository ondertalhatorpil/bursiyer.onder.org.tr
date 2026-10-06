/**
 * Aşama 9: dönem, onay metinleri, ekran metinleri, SMS şablonları.
 */
process.env.SMS_DRIVER = 'log';

const request = require('supertest');
const app = require('../src/app');
const { db, resetApplications } = require('./helpers/db');
const { registerApplicant, outbox } = require('./helpers/applicant');
const { createAdmin, adminAgent } = require('./helpers/admin');

let snapshot;
let admin;

beforeAll(async () => {
  snapshot = {
    programs: await db('programs'),
    consent_texts: await db('consent_texts'),
    content_blocks: await db('content_blocks'),
    sms_templates: await db('sms_templates'),
  };
});

beforeEach(async () => {
  await resetApplications();
  await db('audit_logs').del();
  await db('admin_scopes').del();
  await db('application_notes').del();
  await db('admin_users').del();
  // Metinleri başlangıç haline getir
  await db('consent_texts').where('version', '>', 1).del();
  for (const c of snapshot.consent_texts) await db('consent_texts').where({ id: c.id }).update(c);
  for (const p of snapshot.programs) await db('programs').where({ id: p.id }).update(p);
  await db('programs').whereNotIn('id', snapshot.programs.map((p) => p.id)).del();
  outbox.length = 0;
  await createAdmin('super@onder.org.tr', 'super_admin');
  admin = await adminAgent('super@onder.org.tr');
});

afterAll(async () => {
  await resetApplications();
  await db('consent_texts').where('version', '>', 1).del();
  for (const [table, rows] of Object.entries(snapshot)) {
    const key = table === 'content_blocks' ? 'key' : table === 'sms_templates' ? 'code' : 'id';
    for (const r of rows) await db(table).where({ [key]: r[key] }).update(r);
  }
  await db('programs').whereNotIn('id', snapshot.programs.map((p) => p.id)).del();
  await db('audit_logs').del();
  await db('admin_users').del();
  await db.destroy();
});

const publishAll = async () => {
  for (const type of ['kvkk', 'sharing', 'guardian', 'criminal_record']) {
    await admin.put(`/api/admin/settings/consents/${type}`)
      .send({ title: `${type} başlık`, label: 'Okudum, onaylıyorum ve kabul ediyorum.', body: `${type} metni burada yer alır, uzun metin.` })
      .expect(200);
  }
};

describe('yetki', () => {
  test('ayarlar sadece manage_settings yetkisiyle', async () => {
    await createAdmin('gm@onder.org.tr', 'gm_reviewer', { phone: '905550000002' });
    const gm = await adminAgent('gm@onder.org.tr');
    await gm.get('/api/admin/settings/programs').expect(403);
    await gm.get('/api/admin/users').expect(403);
    await request(app).get('/api/admin/settings/programs').expect(401);
  });
});

describe('dönem', () => {
  test('metinler yayında değilken açılamaz; yayınlanınca açılır ve aday kayıt olabilir', async () => {
    await db('consent_texts').whereIn('type', ['kvkk', 'sharing', 'guardian', 'criminal_record']).update({ body: null, is_active: false });
    await db('programs').update({ is_open: false });
    const list = await admin.get('/api/admin/settings/programs').expect(200);
    expect(list.body.readiness.map((i) => i.code)).toEqual(expect.arrayContaining(['consent_missing:kvkk', 'consent_missing:guardian']));
    const pid = list.body.programs[0].id;

    const fail = await admin.patch(`/api/admin/settings/programs/${pid}`).send({ isOpen: true }).expect(422);
    expect(fail.body.error.code).toBe('PROGRAM_NOT_READY');

    await publishAll();
    const ok = await admin.patch(`/api/admin/settings/programs/${pid}`).send({ isOpen: true }).expect(200);
    expect(ok.body.readiness).toEqual([]);
    expect(ok.body.programs[0]).toMatchObject({ isOpen: true, state: 'open' });

    const pub = await request(app).get('/api/public/program').expect(200);
    expect(pub.body.open).toBe(true);
    await registerApplicant();
  });

  test('tarihler: bitiş başlangıçtan önce olamaz, gelecekteki başlangıç "planlandı" olur', async () => {
    await publishAll();
    const pid = (await db('programs').orderBy('id', 'desc').first()).id;
    const bad = await admin.patch(`/api/admin/settings/programs/${pid}`)
      .send({ opensAt: '2026-10-10T09:00:00+03:00', closesAt: '2026-10-01T09:00:00+03:00' }).expect(422);
    expect(bad.body.error.details.closesAt).toBeTruthy();

    const future = new Date(Date.now() + 86400000).toISOString();
    const res = await admin.patch(`/api/admin/settings/programs/${pid}`).send({ isOpen: true, opensAt: future, closesAt: null }).expect(200);
    expect(res.body.programs[0].state).toBe('scheduled');
    expect((await request(app).get('/api/public/program')).body.open).toBe(false);
  });

  test('takip no verildikten sonra ön ek değişmez; yeni dönem açılınca eskisi kapanır', async () => {
    await publishAll();
    const pid = (await db('programs').orderBy('id', 'desc').first()).id;
    await admin.patch(`/api/admin/settings/programs/${pid}`).send({ trackingPrefix: 'ond-2027' }).expect(200);
    expect((await db('programs').where({ id: pid }).first()).tracking_prefix).toBe('OND-2027');
    await admin.patch(`/api/admin/settings/programs/${pid}`).send({ trackingPrefix: 'OND-2026', isOpen: true }).expect(200);

    const created = await admin.post('/api/admin/settings/programs')
      .send({ name: '2027-2028', title: '2027-2028 ÖNDER Burs Programı', trackingPrefix: 'OND-2027' }).expect(201);
    const next = created.body.programs.find((p) => p.name === '2027-2028');
    expect(next.isOpen).toBe(false);
    await admin.post('/api/admin/settings/programs').send({ name: '2027-2028', title: 'Aynı isim tekrar', trackingPrefix: 'OND-2099' }).expect(422);

    await admin.patch(`/api/admin/settings/programs/${next.id}`).send({ isOpen: true }).expect(200);
    const open = await db('programs').where({ is_open: true });
    expect(open.map((p) => p.id)).toEqual([next.id]);
  });
});

describe('onay metinleri', () => {
  test('onaylanmamış sürüm yerinde güncellenir, onaylanmış metin değişince yeni sürüm açılır', async () => {
    await publishAll();
    let kvkk = await db('consent_texts').where({ type: 'kvkk', is_active: true }).first();
    expect(kvkk.version).toBe(1);

    // Aday v1'i onaylar
    await db('programs').update({ is_open: true });
    await registerApplicant();
    const accepted = await db('consents').where({ consent_text_id: kvkk.id }).count({ n: '*' }).first();
    expect(Number(accepted.n)).toBe(1);

    const res = await admin.put('/api/admin/settings/consents/kvkk')
      .send({ title: 'KVKK yeni', label: 'Okudum, onaylıyorum ve kabul ediyorum.', body: 'Yeni KVKK metni hukuk onaylı hali.' }).expect(200);
    expect(res.body).toMatchObject({ version: 2, created: true });
    const item = res.body.items.find((i) => i.type === 'kvkk');
    expect(item.published).toBe(2);
    expect(item.versions.map((v) => [v.version, v.isActive, v.acceptedCount])).toEqual([[2, true, 0], [1, false, 1]]);

    // v2 henüz onaylanmadı: tekrar kaydetmek yeni sürüm açmaz
    const again = await admin.put('/api/admin/settings/consents/kvkk')
      .send({ title: 'KVKK yeni', label: 'Okudum, onaylıyorum ve kabul ediyorum.', body: 'Yeni KVKK metni, düzeltilmiş hali.' }).expect(200);
    expect(again.body).toMatchObject({ version: 2, created: false });

    // Yeni aday yeni sürümü görür
    kvkk = await request(app).get('/api/public/consents/kvkk').expect(200);
    expect(kvkk.body.body).toBe('Yeni KVKK metni, düzeltilmiş hali.');
  });

  test('boş metin yayınlanamaz', async () => {
    const res = await admin.put('/api/admin/settings/consents/sharing').send({ title: 'x', label: 'kısa', body: '' }).expect(422);
    expect(Object.keys(res.body.error.details)).toEqual(expect.arrayContaining(['title', 'label', 'body']));
  });
});

describe('ekran metinleri', () => {
  test('güncellenir ve herkese açık uçta görünür', async () => {
    const list = await admin.get('/api/admin/settings/content').expect(200);
    expect(list.body.find((b) => b.key === 'submit_success').placeholders).toEqual(['tracking_no', 'program_name']);
    await admin.put('/api/admin/settings/content/applications_closed').send({ title: 'Kapalı', body: 'Başvurular 1 Ekim\'de açılacak.' }).expect(200);
    const pub = await request(app).get('/api/public/content/applications_closed').expect(200);
    expect(pub.body.body).toBe('Başvurular 1 Ekim\'de açılacak.');
    await admin.put('/api/admin/settings/content/yok_boyle').send({ title: 'x1', body: null }).expect(404);
  });
});

describe('SMS şablonları', () => {
  test('değişken kontrolü, uzunluk, doğrulama SMS\'i kapatılamaz', async () => {
    const list = await admin.get('/api/admin/settings/sms').expect(200);
    const otp = list.body.templates.find((t) => t.code === 'otp_applicant');
    expect(otp).toMatchObject({ isOtp: true, required: ['code'], parts: 1 });
    expect(otp.preview).toContain('123456');

    let res = await admin.put('/api/admin/settings/sms/otp_applicant').send({ body: 'Kodunuz geldi, lutfen girin.' }).expect(422);
    expect(res.body.error.details.body).toMatch(/\{code\}/);
    res = await admin.put('/api/admin/settings/sms/otp_applicant').send({ body: 'Kod: {code} {tracking_no}' }).expect(422);
    expect(res.body.error.details.body).toMatch(/tracking_no/);
    await admin.put('/api/admin/settings/sms/otp_applicant').send({ body: 'Kod: {code}', isActive: false }).expect(422);
    await admin.put('/api/admin/settings/sms/application_approved').send({ body: 'x'.repeat(700) }).expect(422);

    res = await admin.put('/api/admin/settings/sms/otp_applicant').send({ body: 'ÖNDER doğrulama kodunuz: {code}' }).expect(200);
    expect(res.body).toMatchObject({ unicode: true, parts: 1 });
  });

  test('bilgilendirme SMS\'i kapatılınca gönderilmez; test SMS\'i admin telefonuna gider', async () => {
    await admin.put('/api/admin/settings/sms/application_submitted').send({ body: 'Basvurunuz alindi: {tracking_no}', isActive: false }).expect(200);
    const sms = require('../src/services/sms');
    const r = await sms.sendTemplate('application_submitted', '905551112233', { tracking_no: 'X' });
    expect(r.skipped).toBe(true);
    await admin.post('/api/admin/settings/sms/application_submitted/test').expect(409);

    outbox.length = 0;
    await admin.post('/api/admin/settings/sms/application_approved/test').expect(200);
    expect(outbox.at(-1)).toMatchObject({ phone: '905550000001' });
    expect(outbox.at(-1).text).toContain('OND-2026-12345');
  });
});
