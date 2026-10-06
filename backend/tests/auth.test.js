/**
 * Adım 1-3 uçtan uca: kayıt, giriş, oturum, kategori.
 */
process.env.SMS_DRIVER = 'log';

const request = require('supertest');
const app = require('../src/app');
const { outbox } = require('../src/services/sms/ekomesaj');
const { db, resetApplications, openProgram, closePrograms } = require('./helpers/db');

const TC = '10000000146';
const YKN = '99123456740';
const lastCode = () => outbox.at(-1).text.match(/\b(\d{6})\b/)[1];

const validBody = (over = {}) => ({
  firstName: 'Ahmet',
  lastName: 'Yılmaz',
  idNumber: TC,
  birthDate: '15/04/2005',
  phone: '0 (532) 111 22 33',
  email: 'Ahmet@Ornek.com',
  consents: { kvkk: true, sharing: true },
  ...over,
});

/** Kayıt olur, oturum cookie'si taşıyan agent döndürür */
async function register(over = {}) {
  const agent = request.agent(app);
  const start = await agent.post('/api/auth/register/start').send(validBody(over)).expect(200);
  const res = await agent.post('/api/auth/register/verify')
    .send({ registrationToken: start.body.registrationToken, code: lastCode() }).expect(201);
  return { agent, res };
}

beforeEach(async () => {
  await resetApplications();
  await openProgram();
  outbox.length = 0;
});
afterAll(() => db.destroy());

describe('kayıt (Adım 1-2)', () => {
  test('başvuru kapalıyken kayıt başlatılamaz', async () => {
    await closePrograms();
    const res = await request(app).post('/api/auth/register/start').send(validBody());
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('APPLICATIONS_CLOSED');
  });

  test('alan hataları alan bazında döner', async () => {
    const res = await request(app).post('/api/auth/register/start').send(validBody({
      idNumber: '12345678901', phone: '0212 111 22 33', birthDate: '31/02/2005', email: 'x', consents: { kvkk: true, sharing: false },
    }));
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.error.details).sort())
      .toEqual(['birthDate', 'consents.sharing', 'email', 'idNumber', 'phone']);
  });

  test('YKN ile uyruk zorunlu', async () => {
    const res = await request(app).post('/api/auth/register/start').send(validBody({ idNumber: YKN }));
    expect(res.status).toBe(422);
    expect(res.body.error.details.nationality).toBeDefined();
  });

  test('başarılı kayıt: aday, taslak başvuru, onaylar, oturum', async () => {
    const agent = request.agent(app);
    const start = await agent.post('/api/auth/register/start').send(validBody()).expect(200);
    expect(start.body).toMatchObject({ maskedPhone: '0 (532) *** ** 33', expiresIn: 180, resendIn: 60 });
    expect(start.body.registrationToken).not.toContain(TC);
    expect(await db('applicants').count({ n: '*' }).first()).toEqual({ n: 0 }); // henüz kayıt yok

    const verify = await agent.post('/api/auth/register/verify')
      .send({ registrationToken: start.body.registrationToken, code: lastCode() }).expect(201);
    expect(verify.headers['set-cookie'][0]).toMatch(/bk_sid=.+HttpOnly/);
    expect(verify.body.applicant).toMatchObject({
      firstName: 'Ahmet', lastName: 'Yılmaz', idType: 'TC', idNumberMasked: '100******46',
      birthDate: '2005-04-15', email: 'ahmet@ornek.com', nationality: 'T.C.',
    });
    expect(verify.body.application).toMatchObject({ status: 'draft', currentStep: 3, category: null, isMinor: false, editable: true });

    const applicant = await db('applicants').first();
    expect(applicant.id_number_enc).not.toContain(TC);
    expect(applicant.phone).toBe('905321112233');
    expect(await db('consents').count({ n: '*' }).first()).toEqual({ n: 2 });
    expect(await db('status_history').first()).toMatchObject({ from_status: null, to_status: 'draft', actor_type: 'applicant' });

    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body.application.id).toBe(verify.body.application.id);
  });

  test('18 yaş altı işaretlenir', async () => {
    const { res } = await register({ birthDate: '01/01/2012' });
    expect(res.body.application.isMinor).toBe(true);
  });

  test('aynı kimlik numarasıyla ikinci kayıt reddedilir', async () => {
    await register();
    const res = await request(app).post('/api/auth/register/start').send(validBody({ phone: '05329998877' }));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_REGISTERED');
  });

  test('yanlış kod kalan hakkı söyler, hesap açılmaz', async () => {
    const start = await request(app).post('/api/auth/register/start').send(validBody()).expect(200);
    const wrong = lastCode() === '000000' ? '111111' : '000000';
    const res = await request(app).post('/api/auth/register/verify').send({ registrationToken: start.body.registrationToken, code: wrong });
    expect(res.status).toBe(422);
    expect(res.body.error.details.remaining).toBe(2);
    expect(await db('applicants').count({ n: '*' }).first()).toEqual({ n: 0 });
  });

  test('bozuk token reddedilir', async () => {
    const res = await request(app).post('/api/auth/register/verify').send({ registrationToken: 'v1.aaa.bbb.cccccccc', code: '123456' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FLOW_EXPIRED');
  });

  test('KVKK metni yayınlanmadan kayıt başlamaz', async () => {
    await db('consent_texts').where({ type: 'kvkk' }).update({ body: null });
    const res = await request(app).post('/api/auth/register/start').send(validBody());
    expect(res.status).toBe(503);
  });
});

describe('giriş ve oturum', () => {
  test('kayıtsız kimlik no', async () => {
    const res = await request(app).post('/api/auth/login/start').send({ idNumber: TC });
    expect(res.status).toBe(404);
  });

  test('giriş: kayıtlı numaraya kod gider, doğrulanınca oturum açılır', async () => {
    await register();
    await db('otp_codes').update({ created_at: new Date(Date.now() - 120 * 1000) }); // bekleme süresini geç
    const agent = request.agent(app);
    const start = await agent.post('/api/auth/login/start').send({ idNumber: TC }).expect(200);
    expect(outbox.at(-1).phone).toBe('905321112233');
    const res = await agent.post('/api/auth/login/verify').send({ loginToken: start.body.loginToken, code: lastCode() }).expect(200);
    expect(res.body.applicant.firstName).toBe('Ahmet');
    await agent.get('/api/auth/me').expect(200);
  });

  test('oturumsuz /me 401, çıkıştan sonra 401', async () => {
    await request(app).get('/api/auth/me').expect(401);
    const { agent } = await register();
    await agent.post('/api/auth/logout').expect(200);
    await agent.get('/api/auth/me').expect(401);
    expect(await db('sessions').count({ n: '*' }).first()).toEqual({ n: 0 });
  });

  test('30 dk hareketsiz kalan oturum düşer', async () => {
    const { agent } = await register();
    await db('sessions').update({ last_seen_at: new Date(Date.now() - 31 * 60 * 1000) });
    await agent.get('/api/auth/me').expect(401);
  });

  test('izin verilmeyen Origin ile POST reddedilir', async () => {
    const res = await request(app).post('/api/auth/login/start').set('Origin', 'https://kotu-site.com').send({ idNumber: TC });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('BAD_ORIGIN');
  });
});

describe('Adım 3: kategori', () => {
  test('kategori seçilir, adım 4\'e geçilir', async () => {
    const { agent } = await register();
    const res = await agent.put('/api/application/category').send({ category: 'universite' }).expect(200);
    expect(res.body.application).toMatchObject({ category: 'universite', categoryLabel: 'Lisans Bursu', currentStep: 4 });
    expect(res.body.changed).toBe(false);
  });

  test('kategori değişince kategoriye bağlı veriler silinir', async () => {
    const { agent } = await register();
    await agent.put('/api/application/category').send({ category: 'lise' }).expect(200);
    const appRow = await db('applications').first();
    await db('application_details').insert({ application_id: appRow.id, data: JSON.stringify({ reference_name: 'X' }) });
    await db('education').insert({ application_id: appRow.id, grade: '10' });

    const res = await agent.put('/api/application/category').send({ category: 'universite' }).expect(200);
    expect(res.body.changed).toBe(true);
    expect(await db('application_details').count({ n: '*' }).first()).toEqual({ n: 0 });
    expect(await db('education').count({ n: '*' }).first()).toEqual({ n: 0 });
  });

  test('geçersiz kategori ve oturumsuz istek', async () => {
    const { agent } = await register();
    await agent.put('/api/application/category').send({ category: 'master' }).expect(422);
    await request(app).put('/api/application/category').send({ category: 'lise' }).expect(401);
  });

  test('gönderilmiş başvuruda kategori değişmez', async () => {
    const { agent } = await register();
    await db('applications').update({ status: 'submitted' });
    const res = await agent.put('/api/application/category').send({ category: 'lise' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('APPLICATION_LOCKED');
  });
});
