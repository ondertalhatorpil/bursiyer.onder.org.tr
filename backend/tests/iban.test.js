/**
 * Adım 8: IBAN girişi, personel kontrolü, kesinleşme, ödeme listesi.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');

process.env.SMS_DRIVER = 'log';
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'burs-iban-'));

const XLSX = require('xlsx');
const app = require('../src/app');
const { db, resetApplications, openProgram } = require('./helpers/db');
const { registerApplicant, outbox } = require('./helpers/applicant');
const { createAdmin, adminAgent } = require('./helpers/admin');
const { makePdf, PNG } = require('./helpers/pdf');
const { parseTrIban, maskIban } = require('../src/lib/iban');

/** Geçerli kontrol haneli TR IBAN üretir */
function makeIban(bank = '00064', account = '0000112345678901') {
  const bban = `${bank}0${account}`;
  const num = `${bban}292700`; // T=29 R=27 + 00
  let r = 0;
  for (const d of num) r = (r * 10 + Number(d)) % 97;
  return `TR${String(98 - r).padStart(2, '0')}${bban}`;
}

let ch; let uni; let gm;
const pdf = (t) => makePdf([`${t} belge metni`]);

async function approvedApplication(over = {}) {
  const agent = await registerApplicant(over);
  await agent.put('/api/application/category').send({ category: 'universite' }).expect(200);
  await agent.put('/api/application/channel').send({ channelId: ch.uni_wonder }).expect(200);
  await agent.put('/api/application/education').send({ cityId: 34, universityId: uni.id, faculty: 'Fen Fakültesi', department: 'Biyoloji', grade: '3' }).expect(200);
  await agent.post('/api/documents/ogrenci_belgesi').attach('file', pdf('Ogrenci'), 'ogrenci.pdf').expect(201);
  await agent.post('/api/documents/transkript').attach('file', pdf('Transkript'), 'transkript.pdf').expect(201);
  await agent.post('/api/documents/adli_sicil').field('consent', 'true').attach('file', pdf('Adli'), 'adli.pdf').expect(201);
  const res = await agent.post('/api/application/submit').send({ confirm: true }).expect(200);
  const id = res.body.application.id;
  await gm.post(`/api/admin/applications/${id}/status`).send({ to: 'in_review' }).expect(200);
  await gm.post(`/api/admin/applications/${id}/status`).send({ to: 'approved' }).expect(200);
  await db('otp_codes').del();
  return { agent, id, trackingNo: res.body.trackingNo };
}

const sendIban = (agent, { iban = makeIban(), confirm = true, file = pdf('Hesap'), name = 'hesap.pdf' } = {}) => {
  const r = agent.post('/api/iban').field('iban', iban);
  if (confirm) r.field('confirm', 'true');
  return file ? r.attach('file', file, name) : r;
};

beforeAll(async () => {
  ch = Object.fromEntries((await db('channels').select('id', 'code')).map((c) => [c.code, c.id]));
  await db('universities').insert({ name: 'Test Devlet Üniversitesi', city_id: 34, type: 'devlet' }).onConflict('name').ignore();
  uni = await db('universities').where({ name: 'Test Devlet Üniversitesi' }).first();
});
beforeEach(async () => {
  await resetApplications();
  await db('bank_accounts').del();
  await db('audit_logs').del();
  await db('admin_scopes').del();
  await db('application_notes').del();
  await db('admin_users').del();
  await openProgram();
  outbox.length = 0;
  await createAdmin('gm@onder.org.tr', 'gm_reviewer', { phone: '905550000009' });
  gm = await adminAgent('gm@onder.org.tr');
});
afterAll(async () => {
  await resetApplications();
  await db('bank_accounts').del();
  await db('audit_logs').del();
  await db('admin_users').del();
  await db.destroy();
  fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
});

describe('IBAN doğrulama', () => {
  test('mod-97, TR ve uzunluk kontrolü', () => {
    const iban = makeIban();
    expect(parseTrIban(iban.replace(/(.{4})/g, '$1 ').toLowerCase())).toMatchObject({ valid: true, value: iban, bankCode: '00064' });
    expect(parseTrIban(`${iban.slice(0, -1)}${(Number(iban.at(-1)) + 1) % 10}`).valid).toBe(false);
    expect(parseTrIban('DE89370400440532013000').reason).toMatch(/TR ile başlar/);
    expect(parseTrIban('TR12').reason).toMatch(/26 karakter/);
    expect(maskIban(iban)).toMatch(/^TR\d\d \*{4} .* \d{2}$/);
  });
});

describe('Adım 8', () => {
  test('onaylanmamış başvuruda IBAN girilemez', async () => {
    const agent = await registerApplicant();
    const s = await agent.get('/api/iban').expect(200);
    expect(s.body).toMatchObject({ available: false, canSubmit: false });
    await sendIban(agent).expect(409);
  });

  test('onay SMS\'i IBAN davetini içerir; eksik/hatalı girişler reddedilir', async () => {
    const { agent } = await approvedApplication();
    expect(outbox.at(-1).text).toMatch(/IBAN/);
    const s = await agent.get('/api/iban').expect(200);
    expect(s.body).toMatchObject({ available: true, canSubmit: true, holderName: 'Ahmet Yılmaz', account: null });
    expect(s.body.warning.title).toBeTruthy();

    let res = await sendIban(agent, { iban: 'TR00 1234', confirm: false, file: null }).expect(422);
    expect(Object.keys(res.body.error.details).sort()).toEqual(['confirm', 'file', 'iban']);
    res = await sendIban(agent, { file: Buffer.from('sahte'), name: 'x.pdf' }).expect(422);
    expect(res.body.error.details.file).toMatch(/PDF, JPG, PNG/);
  });

  test('IBAN girilir -> kontrol -> red -> yeniden giriş -> onay -> kesinleşir', async () => {
    const { agent, id, trackingNo } = await approvedApplication();
    const res = await sendIban(agent, { file: PNG, name: 'ekran.png' }).expect(201);
    expect(res.body).toMatchObject({ status: 'iban_pending', canSubmit: false, account: { status: 'pending', bankName: 'Türkiye İş Bankası' } });
    expect(res.body.account.ibanMasked).toContain('*');
    await sendIban(agent).expect(409);
    await agent.get('/api/iban/file').expect(200).expect('Content-Type', 'image/png');

    // Admin: detayda tam IBAN, belge, genel statü butonlarında IBAN adımı yok
    let d = await gm.get(`/api/admin/applications/${id}`).expect(200);
    expect(d.body.application.status).toBe('iban_pending');
    expect(d.body.application.allowedTransitions).toEqual([]);
    const acc = d.body.application.bankAccounts[0];
    expect(acc).toMatchObject({ isCurrent: true, status: 'pending', holderName: 'Ahmet Yılmaz', bankKnown: true, usedByOthers: false });
    expect(acc.iban.replace(/ /g, '')).toBe(makeIban());
    await gm.get(`/api/admin/applications/${id}/iban/${acc.id}/file`).expect(200);

    // Red: gerekçe zorunlu, aday yeniden girer
    await gm.post(`/api/admin/applications/${id}/iban/review`).send({ decision: 'rejected' }).expect(422);
    outbox.length = 0;
    d = await gm.post(`/api/admin/applications/${id}/iban/review`).send({ decision: 'rejected', note: 'Hesap belgesinde ad görünmüyor' }).expect(200);
    expect(d.body.application.status).toBe('approved');
    expect(outbox.at(-1).text).toMatch(/kabul edilmedi/);
    let s = await agent.get('/api/iban').expect(200);
    expect(s.body).toMatchObject({ canSubmit: true, account: { status: 'rejected', reviewNote: 'Hesap belgesinde ad görünmüyor' } });

    const second = makeIban('00062', '0000999988887777');
    await sendIban(agent, { iban: second }).expect(201);
    d = await gm.get(`/api/admin/applications/${id}`).expect(200);
    expect(d.body.application.bankAccounts.map((a) => [a.isCurrent, a.status])).toEqual([[true, 'pending'], [false, 'rejected']]);

    outbox.length = 0;
    d = await gm.post(`/api/admin/applications/${id}/iban/review`).send({ decision: 'accepted' }).expect(200);
    expect(d.body.application.status).toBe('finalized');
    expect(d.body.application.statusLabel).toMatch(/Kesinleşti/);
    expect(outbox.at(-1).text).toMatch(/kesinlesmistir/);
    s = await agent.get('/api/iban').expect(200);
    expect(s.body.finalized.title).toMatch(/Kesinleştirilmiştir/);
    await gm.post(`/api/admin/applications/${id}/iban/review`).send({ decision: 'accepted' }).expect(409);

    // Ödeme listesi
    const x = await gm.get('/api/admin/applications/payments-export').buffer(true)
      .parse((r, cb) => { const chunks = []; r.on('data', (c) => chunks.push(c)); r.on('end', () => cb(null, Buffer.concat(chunks))); }).expect(200);
    const rows = XLSX.utils.sheet_to_json(XLSX.read(x.body).Sheets['Ödeme Listesi']);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ 'Takip No': trackingNo, 'Ad Soyad': 'Ahmet Yılmaz', Banka: 'Türkiye Garanti Bankası' });
    expect(rows[0].IBAN.replace(/ /g, '')).toBe(second);
  });

  test('aynı IBAN başka bursiyerde kullanılamaz; bilinmeyen banka kodu kabul edilir ama işaretlenir', async () => {
    const a = await approvedApplication();
    await sendIban(a.agent).expect(201);
    await db('otp_codes').del();
    const b = await approvedApplication({ idNumber: '10000000214', phone: '05321112299' });
    const res = await sendIban(b.agent).expect(422);
    expect(res.body.error.details.iban).toMatch(/başka bir bursiyer/);
    await sendIban(b.agent, { iban: makeIban('00777', '0000123412341234') }).expect(201);
    const d = await gm.get(`/api/admin/applications/${b.id}`).expect(200);
    expect(d.body.application.bankAccounts[0]).toMatchObject({ bankKnown: false, bankCode: '00777' });
  });

  test('yetki: koordinatör IBAN kararı veremez, ödeme listesini indiremez', async () => {
    const { agent, id } = await approvedApplication();
    await sendIban(agent).expect(201);
    await createAdmin('k@onder.org.tr', 'coordinator', { phone: '905550000010' });
    await db('admin_scopes').insert({ admin_user_id: (await db('admin_users').where({ email: 'k@onder.org.tr' }).first()).id, category: 'universite' });
    const k = await adminAgent('k@onder.org.tr');
    const d = await k.get(`/api/admin/applications/${id}`).expect(200);
    expect(d.body.application.bankAccounts[0].iban).toContain('*');
    await k.post(`/api/admin/applications/${id}/iban/review`).send({ decision: 'accepted' }).expect(403);
    await k.get('/api/admin/applications/payments-export').expect(403);
  });
});

describe('Nitelikli bursiyer', () => {
  const listOf = async (query) => (await gm.get(`/api/admin/applications?status=finalized${query}`).expect(200)).body.items;

  test('sadece kesinleşmişte işaretlenir; kaldırılır, yeniden konur; filtre ve exportlarda görünür', async () => {
    const { agent, id, trackingNo } = await approvedApplication();
    await gm.post(`/api/admin/applications/${id}/qualified`).send({ qualified: true }).expect(409);
    await sendIban(agent).expect(201);
    await gm.post(`/api/admin/applications/${id}/qualified`).send({ qualified: true }).expect(409);
    await gm.post(`/api/admin/applications/${id}/iban/review`).send({ decision: 'accepted' }).expect(200);

    let d = await gm.get(`/api/admin/applications/${id}`).expect(200);
    expect(d.body.application.qualified).toMatchObject({ value: false, editable: true });
    await gm.post(`/api/admin/applications/${id}/qualified`).send({ qualified: 'evet' }).expect(422);

    d = await gm.post(`/api/admin/applications/${id}/qualified`).send({ qualified: true }).expect(200);
    expect(d.body.application.qualified).toMatchObject({ value: true, changedBy: 'gm_reviewer Kullanıcı' });
    expect((await listOf('&qualified=1')).map((i) => i.id)).toEqual([id]);
    expect(await listOf('&qualified=0')).toHaveLength(0);
    expect((await listOf(''))[0].qualified).toBe(true);

    const xlsx = async (url, sheet) => {
      const x = await gm.get(url).buffer(true)
        .parse((r, cb) => { const c = []; r.on('data', (b) => c.push(b)); r.on('end', () => cb(null, Buffer.concat(c))); }).expect(200);
      return XLSX.utils.sheet_to_json(XLSX.read(x.body).Sheets[sheet]);
    };
    expect((await xlsx('/api/admin/applications/payments-export', 'Ödeme Listesi'))[0]).toMatchObject({ 'Takip No': trackingNo, 'Burs Türü': 'Nitelikli' });
    expect((await xlsx('/api/admin/applications/export?status=finalized', 'Başvurular'))[0]['Burs Türü']).toBe('Nitelikli');

    d = await gm.post(`/api/admin/applications/${id}/qualified`).send({ qualified: false }).expect(200);
    expect(d.body.application.qualified.value).toBe(false);
    expect(await listOf('&qualified=1')).toHaveLength(0);
    await gm.post(`/api/admin/applications/${id}/qualified`).send({ qualified: true }).expect(200);

    const logs = await db('audit_logs').whereIn('action', ['application.qualified_set', 'application.qualified_unset']).orderBy('id');
    expect(logs.map((l) => l.action)).toEqual(['application.qualified_set', 'application.qualified_unset', 'application.qualified_set']);

    // Aday bu bilgiyi hiçbir yerde görmez
    const me = await agent.get('/api/application').expect(200);
    expect(JSON.stringify(me.body)).not.toMatch(/qualif|nitelikli/i);
    const ib = await agent.get('/api/iban').expect(200);
    expect(JSON.stringify(ib.body)).not.toMatch(/qualif|nitelikli/i);
  });

  test('yetki: karar yetkisi olmayan işaretleyemez', async () => {
    const { agent, id } = await approvedApplication();
    await sendIban(agent).expect(201);
    await gm.post(`/api/admin/applications/${id}/iban/review`).send({ decision: 'accepted' }).expect(200);
    await createAdmin('k@onder.org.tr', 'coordinator', { phone: '905550000010' });
    await db('admin_scopes').insert({ admin_user_id: (await db('admin_users').where({ email: 'k@onder.org.tr' }).first()).id, category: 'universite' });
    const k = await adminAgent('k@onder.org.tr');
    await k.post(`/api/admin/applications/${id}/qualified`).send({ qualified: true }).expect(403);
  });
});
