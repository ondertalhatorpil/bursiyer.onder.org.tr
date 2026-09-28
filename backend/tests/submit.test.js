/**
 * Adım 7: özet ve gönderim.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');

process.env.SMS_DRIVER = 'log';
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'burs-submit-'));

const { db, resetApplications, openProgram, closePrograms } = require('./helpers/db');
const { registerApplicant, lastCode, outbox } = require('./helpers/applicant');
const { makePdf } = require('./helpers/pdf');

let ch; let uni;
const pdf = (t = 'Belge') => makePdf([`${t} metni burada yer alir`, 'Aktif Ogrenci', 'Barkod No: ABCDEFGH1234']);

beforeAll(async () => {
  ch = Object.fromEntries((await db('channels').select('id', 'code')).map((c) => [c.code, c.id]));
  await db('universities').insert({ name: 'Test Devlet Üniversitesi', city_id: 34, type: 'devlet' }).onConflict('name').ignore();
  uni = await db('universities').where({ name: 'Test Devlet Üniversitesi' }).first();
});
beforeEach(async () => {
  await resetApplications();
  await openProgram();
  outbox.length = 0;
});
afterAll(async () => {
  await db.destroy();
  fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
});

/** Üniversite 3. sınıf, eksiksiz: öğrenci belgesi + transkript + adli sicil */
async function completeUniversity(over = {}) {
  const agent = await registerApplicant(over);
  await agent.put('/api/application/category').send({ category: 'universite' }).expect(200);
  await agent.put('/api/application/channel').send({ channelId: ch.uni_wonder }).expect(200);
  await agent.put('/api/application/education').send({
    cityId: 34, universityId: uni.id, faculty: 'Mühendislik', department: 'Bilgisayar', grade: '3',
  }).expect(200);
  await agent.post('/api/documents/ogrenci_belgesi').attach('file', pdf(), 'ogrenci.pdf').expect(201);
  await agent.post('/api/documents/transkript').attach('file', pdf('Transkript'), 'transkript.pdf').expect(201);
  await agent.post('/api/documents/adli_sicil').field('consent', 'true').attach('file', pdf('Adli sicil'), 'adli.pdf').expect(201);
  return agent;
}

describe('özet', () => {
  test('eksikler adım adım listelenir', async () => {
    const agent = await registerApplicant();
    let s = (await agent.get('/api/application/summary').expect(200)).body;
    expect(s.missing).toEqual([{ step: 3, field: 'category', message: 'Burs kategorisi seçilmedi' }]);
    expect(s.canSubmit).toBe(false);

    await agent.put('/api/application/category').send({ category: 'universite' });
    s = (await agent.get('/api/application/summary').expect(200)).body;
    expect(s.missing.map((m) => m.field)).toEqual(['channel', 'education']);

    await agent.put('/api/application/channel').send({ channelId: ch.uni_wonder });
    await agent.put('/api/application/education').send({ cityId: 34, universityId: uni.id, faculty: 'Fen Fakültesi', department: 'Biyoloji', grade: '3' });
    s = (await agent.get('/api/application/summary').expect(200)).body;
    expect(s.missing.map((m) => m.field)).toEqual(['document.ogrenci_belgesi', 'document.transkript', 'document.adli_sicil']);
  });

  test('eksiksiz başvuruda özet tüm bilgileri içerir', async () => {
    const agent = await completeUniversity();
    const s = (await agent.get('/api/application/summary').expect(200)).body;
    expect(s.canSubmit).toBe(true);
    expect(s.applicant.firstName).toBe('Ahmet');
    expect(s.application.channel.code).toBe('uni_wonder');
    expect(s.application.education.universityName).toBe('Test Devlet Üniversitesi');
    expect(s.documents.map((d) => d.code)).toEqual(['ogrenci_belgesi', 'transkript', 'adli_sicil']);
  });
});

describe('gönderim', () => {
  test('onay kutusu işaretlenmeden gönderilmez', async () => {
    const agent = await completeUniversity();
    await agent.post('/api/application/submit').send({}).expect(422);
  });

  test('eksik başvuru gönderilemez', async () => {
    const agent = await registerApplicant();
    const res = await agent.post('/api/application/submit').send({ confirm: true });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('APPLICATION_INCOMPLETE');
    expect(res.body.error.details.missing).toHaveLength(1);
  });

  test('başarılı gönderim: takip no, statü, geçmiş, SMS, kilit', async () => {
    const agent = await completeUniversity();
    const res = await agent.post('/api/application/submit').send({ confirm: true }).expect(200);

    expect(res.body.trackingNo).toMatch(/^OND-2026-\d{5}$/);
    expect(res.body.message.title).toBe('Başvurunuz ve Belgeleriniz Başarıyla Alınmıştır.');
    expect(res.body.message.body).toContain(res.body.trackingNo);
    expect(res.body.application).toMatchObject({ status: 'submitted', statusLabel: 'Başvuru Tamamlandı', editable: false });

    const row = await db('applications').first();
    expect(row).toMatchObject({ status: 'submitted', tracking_no: res.body.trackingNo, age_at_submit: expect.any(Number) });
    expect(row.submitted_at).toBeTruthy();

    const history = await db('status_history').orderBy('id');
    expect(history.map((h) => h.to_status)).toEqual(['draft', 'submitted']);

    expect(outbox.at(-1)).toMatchObject({ phone: '905321112233', kind: 'info' });
    expect(outbox.at(-1).text).toContain(res.body.trackingNo);
    expect(await db('sms_logs').where({ template_code: 'application_submitted' }).first()).toMatchObject({ status: 'sent' });

    // Kilit
    const again = await agent.post('/api/application/submit').send({ confirm: true });
    expect(again.status).toBe(409);
    await agent.put('/api/application/category').send({ category: 'lise' }).expect(409);
    await agent.post('/api/documents/ogrenci_belgesi').attach('file', pdf(), 'x.pdf').expect(409);

    const me = (await agent.get('/api/auth/me').expect(200)).body;
    expect(me.application.trackingNo).toBe(res.body.trackingNo);
  });

  test('artık istenmeyen belge gönderimde arşivlenir', async () => {
    const agent = await completeUniversity(); // 3. sınıf: transkript yüklü
    // 1. sınıfa düşür: transkript yerine YKS belgesi istenir
    await agent.put('/api/application/education').send({ cityId: 34, universityId: uni.id, faculty: 'Fen Fakültesi', department: 'Biyoloji', grade: '1' }).expect(200);
    await agent.post('/api/documents/yks_yerlestirme').attach('file', pdf('YKS'), 'yks.pdf').expect(201);
    await agent.post('/api/application/submit').send({ confirm: true }).expect(200);

    const current = await db('documents as d').join('document_types as t', 't.id', 'd.document_type_id')
      .where('d.is_current', true).pluck('t.code');
    expect(current.sort()).toEqual(['adli_sicil', 'ogrenci_belgesi', 'yks_yerlestirme']);
  });

  test('18 yaş altı: veli onayı olmadan gönderilmez', async () => {
    const agent = await registerApplicant({ birthDate: '01/01/2011' });
    await agent.put('/api/application/category').send({ category: 'lise' });
    await agent.put('/api/application/channel').send({ channelId: ch.lise_egitim_destek, fields: { reference_name: 'R K' } });
    const district = await db('districts').where({ city_id: 34, name: 'Üsküdar' }).first();
    await agent.put('/api/application/education').send({ cityId: 34, districtId: district.id, schoolOther: 'Test Lisesi', grade: '9' }).expect(200);
    await agent.post('/api/documents/ogrenci_belgesi').attach('file', pdf(), 'o.pdf').expect(201);
    await agent.post('/api/documents/transkript').attach('file', pdf('Transkript'), 't.pdf').expect(201);

    let res = await agent.post('/api/application/submit').send({ confirm: true });
    expect(res.body.error.details.missing.map((m) => m.field)).toEqual(['guardian']);

    await agent.put('/api/application/guardian').send({ fullName: 'Veli Kişi', idType: 'TC', idNumber: '12345678950', phone: '05339998877' }).expect(200);
    await agent.post('/api/application/guardian/verify').send({ code: lastCode(), consent: true }).expect(200);
    res = await agent.post('/api/application/submit').send({ confirm: true }).expect(200);
    expect(res.body.application.status).toBe('submitted');
    expect((await db('applications').first()).is_minor).toBe(1);
  });

  test('dönem kapanınca gönderilemez', async () => {
    const agent = await completeUniversity();
    await closePrograms();
    const res = await agent.post('/api/application/submit').send({ confirm: true });
    expect(res.status).toBe(403);
  });
});
