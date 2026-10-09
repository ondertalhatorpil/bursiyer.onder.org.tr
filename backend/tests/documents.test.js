/**
 * Adım 6: belge yükleme.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');

process.env.SMS_DRIVER = 'log';
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'burs-uploads-'));

const request = require('supertest');
const app = require('../src/app');
const { db, resetApplications, openProgram } = require('./helpers/db');
const { registerApplicant, outbox } = require('./helpers/applicant');
const { makePdf, PNG } = require('./helpers/pdf');
const { todayTR } = require('../src/lib/age');
const { detectType } = require('../src/lib/file-type');

const fmt = (iso) => iso.split('-').reverse().join('.');

const ogrenciPdf = (date = todayTR()) => makePdf([
  'T.C. YUKSEKOGRETIM KURULU', 'OGRENCI BELGESI', 'Ogrenim Durumu: Aktif Ogrenci',
  `Barkod No: YOK1A2B3C4D5E6`, `Belge Tarihi: ${fmt(date)}`,
]);
const adliPdf = () => makePdf([
  'ADLI SICIL KAYDI', 'Resmi Kuruma Verilmek Üzere', 'Barkod: ADL98765432XYZ', `Tarih: ${fmt(todayTR())}`,
]);

let ch; let uni;

beforeAll(async () => {
  ch = Object.fromEntries((await db('channels').select('id', 'code')).map((c) => [c.code, c.id]));
  await db('universities').insert({ name: 'Test Devlet Üniversitesi', city_id: 34, type: 'devlet' }).onConflict('name').merge({ is_active: true }); // seed listede olmayanları pasife alır
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

/** Üniversite 1. sınıf, 21 yaş: öğrenci belgesi + YKS + adli sicil istenir */
async function universityApplicant(over = {}, grade = '1') {
  const agent = await registerApplicant(over);
  await agent.put('/api/application/category').send({ category: 'universite' }).expect(200);
  await agent.put('/api/application/channel').send({ channelId: ch.uni_wonder }).expect(200);
  await agent.put('/api/application/education').send({
    cityId: 34, universityId: uni.id, faculty: 'Mühendislik', department: 'Bilgisayar', grade,
  }).expect(200);
  return agent;
}

const up = (agent, code, buf, name = 'belge.pdf', consent) => {
  const r = agent.post(`/api/documents/${code}`).attach('file', buf, name);
  return consent ? r.field('consent', 'true') : r;
};

describe('dosya türü', () => {
  test('dosya türü içerikten bulunur', () => {
    expect(detectType(makePdf(['x']))).toEqual({ ext: 'pdf', mime: 'application/pdf' });
    expect(detectType(PNG).ext).toBe('png');
    expect(detectType(Buffer.from('%PNG sahte'))).toBeNull();
  });
});

describe('belge listesi', () => {
  test('eğitim bilgisi olmadan liste boş', async () => {
    const agent = await registerApplicant();
    const res = await agent.get('/api/documents').expect(200);
    expect(res.body).toMatchObject({ items: [], canUpload: false });
  });

  test('üniversite 1. sınıf, 21 yaş', async () => {
    const agent = await universityApplicant();
    const res = await agent.get('/api/documents').expect(200);
    expect(res.body.items.map((i) => [i.code, i.required])).toEqual([
      ['ogrenci_belgesi', true], ['yks_yerlestirme', true], ['adli_sicil', true],
    ]);
    expect(res.body.items.find((i) => i.code === 'adli_sicil')).toMatchObject({ consentType: null, consentGiven: true });
    expect(res.body.complete).toBe(false);
  });
});

describe('yükleme', () => {
  test('geçerli öğrenci belgesi kaydedilir', async () => {
    const agent = await universityApplicant();
    const res = await up(agent, 'ogrenci_belgesi', ogrenciPdf(), 'Öğrenci Belgesi.pdf').expect(201);
    const item = res.body.items.find((i) => i.code === 'ogrenci_belgesi');
    expect(item.upload).toMatchObject({ originalName: 'Öğrenci Belgesi.pdf', mime: 'application/pdf' });
    expect(item.upload).not.toHaveProperty('warnings');

    const row = await db('documents').first();
    expect(fs.existsSync(path.join(process.env.UPLOAD_DIR, row.storage_key))).toBe(true);
    expect(row.sha256).toHaveLength(64);
  });

  test('belge içeriği otomatik kontrol edilmez: eski tarihli / metinsiz belge uyarısız kaydedilir', async () => {
    const agent = await universityApplicant();
    await up(agent, 'ogrenci_belgesi', makePdf([])).expect(201);
    const row = await db('documents').first();
    expect(row).toMatchObject({ auto_flags: null, barcode_no: null, doc_date: null });
  });

  test('yanlış format, uzantısı değiştirilmiş dosya, büyük dosya', async () => {
    const agent = await universityApplicant();
    let res = await up(agent, 'ogrenci_belgesi', PNG, 'resim.png');
    expect(res.status).toBe(422);
    expect(res.body.error.details.file).toMatch(/PDF/);

    res = await up(agent, 'ogrenci_belgesi', Buffer.from('bu bir pdf degil'), 'sahte.pdf');
    expect(res.status).toBe(422);

    res = await up(agent, 'ogrenci_belgesi', Buffer.concat([makePdf(['x']), Buffer.alloc(5 * 1024 * 1024)]), 'buyuk.pdf');
    expect(res.status).toBe(413);

    res = await agent.post('/api/documents/ogrenci_belgesi').expect(422);
    expect(res.body.error.details.file).toBeDefined();
  });

  test('istenmeyen belge tipi reddedilir', async () => {
    const agent = await universityApplicant(); // 1. sınıf: transkript istenmez
    await up(agent, 'transkript', ogrenciPdf()).expect(404);
    await up(agent, 'olmayan_tip', ogrenciPdf()).expect(404);
  });

  test('adli sicil: ek rıza istenmeden yüklenir', async () => {
    const agent = await universityApplicant();
    await up(agent, 'adli_sicil', adliPdf()).expect(201);
    expect(await db('consents as c').join('consent_texts as t', 't.id', 'c.consent_text_id')
      .where('t.type', 'criminal_record').count({ n: '*' }).first()).toEqual({ n: 0 });
  });

  test('aynı tipe yeni yükleme eskisini arşivler', async () => {
    const agent = await universityApplicant();
    await up(agent, 'ogrenci_belgesi', ogrenciPdf()).expect(201);
    await up(agent, 'ogrenci_belgesi', ogrenciPdf()).expect(201);
    const rows = await db('documents').orderBy('id');
    expect(rows.map((r) => r.is_current)).toEqual([0, 1]);
  });

  test('tüm zorunlu belgeler yüklenince Adım 6 tamamlanır', async () => {
    const agent = await universityApplicant();
    await up(agent, 'ogrenci_belgesi', ogrenciPdf()).expect(201);
    await up(agent, 'yks_yerlestirme', makePdf(['OSYM YKS Yerlestirme Sonuc Belgesi', 'Dogrulama Kodu: ABC123DEF456'])).expect(201);
    const res = await up(agent, 'adli_sicil', adliPdf(), 'adli.pdf', true).expect(201);
    expect(res.body.complete).toBe(true);
    const d = (await agent.get('/api/application').expect(200)).body.application;
    expect(d.steps[6]).toBe(true);
    expect(d.currentStep).toBe(7);
  });

  test('YL T.C.: vesikalık sadece görsel', async () => {
    const agent = await registerApplicant({ birthDate: '01/01/2001' });
    await agent.put('/api/application/category').send({ category: 'yuksek_lisans' });
    await agent.post('/api/application/requirements').send({ accepted: true });
    await agent.put('/api/application/education').send({ universityName: uni.name, faculty: 'SBE', department: 'Sosyoloji', cityName: 'İstanbul' }).expect(200);
    await up(agent, 'vesikalik', makePdf(['foto'])).expect(422);
    await up(agent, 'vesikalik', PNG, 'foto.png').expect(201);
    await up(agent, 'kimlik_fotokopisi', PNG, 'kimlik.png').expect(201);

    // Akademik referans mektubu zorunlu, niyet mektubu (doktora) istenmez
    const list = (await agent.get('/api/documents').expect(200)).body.items;
    expect(list.find((i) => i.code === 'akademik_referans')).toMatchObject({ name: 'Akademik Referans Mektubu', required: true });
    expect(list.find((i) => i.code === 'akademik_niyet')).toBeUndefined();
    await up(agent, 'akademik_niyet', makePdf(['niyet'])).expect(404);
    await up(agent, 'akademik_referans', makePdf(['referans'])).expect(201);
  });
});

describe('görüntüleme, silme, kilit', () => {
  test('kendi dosyasını görür, başkası göremez', async () => {
    const agent = await universityApplicant();
    const res = await up(agent, 'ogrenci_belgesi', ogrenciPdf()).expect(201);
    const { id } = res.body.items[0].upload;

    const file = await agent.get(`/api/documents/${id}/file`).expect(200);
    expect(file.headers['content-type']).toBe('application/pdf');
    expect(file.headers['content-security-policy']).toMatch(/sandbox/);
    expect(file.body.subarray(0, 5).toString()).toBe('%PDF-');

    await db('otp_codes').del();
    const other = await registerApplicant({ idNumber: '12345678950', phone: '05339990000' });
    await other.get(`/api/documents/${id}/file`).expect(404);
    await request(app).get(`/api/documents/${id}/file`).expect(401);
  });

  test('taslakta silinir, gönderilmiş başvuruda silinemez/yüklenemez', async () => {
    const agent = await universityApplicant();
    const res = await up(agent, 'ogrenci_belgesi', ogrenciPdf()).expect(201);
    const { id } = res.body.items[0].upload;
    const del = await agent.delete(`/api/documents/${id}`).expect(200);
    expect(del.body.items[0].upload).toBeNull();

    await up(agent, 'ogrenci_belgesi', ogrenciPdf()).expect(201);
    await db('applications').update({ status: 'submitted' });
    await up(agent, 'ogrenci_belgesi', ogrenciPdf()).expect(409);
  });

  test('revize isteminde sadece işaretli belge yeniden yüklenebilir', async () => {
    const agent = await universityApplicant();
    await up(agent, 'ogrenci_belgesi', ogrenciPdf()).expect(201);
    await up(agent, 'yks_yerlestirme', makePdf(['YKS belgesi metni uzun uzun', 'Dogrulama Kodu: ABC123DEF456'])).expect(201);
    await db('applications').update({ status: 'revision_requested' });
    await db('documents').where({ document_type_id: db('document_types').select('id').where({ code: 'ogrenci_belgesi' }) })
      .update({ review_status: 'revision_requested', review_note: 'Belge 15 günden eski' });

    await up(agent, 'yks_yerlestirme', ogrenciPdf()).expect(409);
    const res = await up(agent, 'ogrenci_belgesi', ogrenciPdf()).expect(201);
    expect(res.body.items.find((i) => i.code === 'ogrenci_belgesi').upload.reviewStatus).toBe('pending');
  });

  test('kategori değişince belgeler arşivlenir', async () => {
    const agent = await universityApplicant();
    await up(agent, 'ogrenci_belgesi', ogrenciPdf()).expect(201);
    await agent.put('/api/application/category').send({ category: 'lise' }).expect(200);
    expect(await db('documents').where({ is_current: true }).count({ n: '*' }).first()).toEqual({ n: 0 });
  });
});
