/**
 * Yurt Konaklama Bursu değerlendirme zinciri:
 *   yurt müdürü = koordinatör + yurt kapsamı (sadece kendi yurdu)
 *   yurtlar birimi = Genel Merkez Değerlendirici + Yurt Konaklama Bursu yetkisi
 *   süper admin: nihai tutar + onay
 */
process.env.SMS_DRIVER = 'log';

const { db, resetApplications, openProgram } = require('./helpers/db');
const { registerApplicant, outbox } = require('./helpers/applicant');
const { createAdmin, adminAgent } = require('./helpers/admin');

let dorms; let uni;

beforeAll(async () => {
  dorms = await db('dormitories').where({ is_active: true }).orderBy('sort').limit(2);
  await db('universities').insert({ name: 'Test Devlet Üniversitesi', city_id: 34, type: 'devlet' })
    .onConflict('name').merge({ is_active: true });
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
afterAll(() => db.destroy());

/** Gönderilmiş yurt başvurusu; public id döner */
async function submittedYurt(dormitoryId, over) {
  const agent = await registerApplicant(over);
  await agent.put('/api/application/category').send({ category: 'yurt' }).expect(200);
  await agent.put('/api/application/education').send({
    cityId: 34, universityId: uni.id, faculty: 'İlahiyat Fakültesi', department: 'İlahiyat', grade: '2', dormitoryId,
  }).expect(200);
  await agent.put('/api/application/yurt/family').send({
    siblingCount: 3, studyingSiblingCount: 1, guardianHousing: 'ev_sahibi',
    mother: { status: 'vefat', fullName: 'Ayşe Yılmaz' },
    father: { status: 'sag', fullName: 'Ali Yılmaz', job: 'Memur', location: 'Konya', income: 30000 },
  }).expect(200);
  await agent.put('/api/application/yurt/scholarship')
    .send({ otherScholarship: false, gsbSupport: false, kykSupport: 'yok', requestedAmount: 4000 }).expect(200);
  return (await agent.post('/api/application/submit').send({ confirm: true }).expect(200)).body.application.id;
}

async function staff() {
  const managerId = await createAdmin('mudur@onder.org.tr', 'coordinator', { phone: '905550000011' });
  const hqId = await createAdmin('yurtlar@onder.org.tr', 'gm_reviewer', { phone: '905550000012' });
  await createAdmin('super@onder.org.tr', 'super_admin', { phone: '905550000013' });
  await createAdmin('gm@onder.org.tr', 'gm_reviewer', { phone: '905550000014' });
  const sup = await adminAgent('super@onder.org.tr');
  await sup.put(`/api/admin/users/${hqId}/grants`).send({ yurtHq: true }).expect(200);
  return { managerId, hqId, sup };
}

describe('Yurt müdürü kapsamı', () => {
  test('Yurt Konaklama Bursu kuralında yurt zorunlu, il tutulmaz; yetki sadece Genel Merkez Değerlendiriciye verilir', async () => {
    const { managerId, hqId, sup } = await staff();
    let res = await sup.put(`/api/admin/users/${managerId}/scopes`).send({ scopes: [{ category: 'yurt' }] });
    expect(res.status).toBe(422);
    expect(res.body.error.details['scopes.0.dormitoryId']).toBeDefined();
    res = await sup.put(`/api/admin/users/${managerId}/scopes`).send({ scopes: [{ category: 'universite', dormitoryId: dorms[0].id }] });
    expect(res.status).toBe(422);

    res = await sup.put(`/api/admin/users/${managerId}/scopes`)
      .send({ scopes: [{ category: 'yurt', dormitoryId: dorms[0].id, cityId: 34 }] }).expect(200);
    expect(res.body.scopes[0]).toMatchObject({ category: 'yurt', dormitoryId: dorms[0].id, cityId: null, label: `Yurt Konaklama · ${dorms[0].name}` });

    const roles = (await sup.get('/api/admin/users/roles').expect(200)).body;
    expect(roles.map((r) => r.code)).not.toContain('dorm_manager');
    expect(roles.find((r) => r.code === 'gm_reviewer')).toMatchObject({ usesScopes: false, usesGrants: true });
    expect((await sup.get('/api/admin/users').expect(200)).body.items.find((u) => u.id === hqId).yurtHq).toBe(true);
    expect((await sup.put(`/api/admin/users/${managerId}/grants`).send({ yurtHq: true })).status).toBe(422);

    // Rol değişince ek yetki düşer
    await sup.patch(`/api/admin/users/${hqId}`).send({ role: 'viewer' }).expect(200);
    expect((await sup.get('/api/admin/users').expect(200)).body.items.find((u) => u.id === hqId).yurtHq).toBe(false);
  });

  test('yurt müdürü sadece kendi yurdunu, Genel Merkez tüm yurt başvurularını görür', async () => {
    const { managerId, sup } = await staff();
    await sup.put(`/api/admin/users/${managerId}/scopes`).send({ scopes: [{ dormitoryId: dorms[0].id }] }).expect(200);
    const mine = await submittedYurt(dorms[0].id);
    const other = await submittedYurt(dorms[1].id, { idNumber: '12345678950', phone: '05339990000' });

    const manager = await adminAgent('mudur@onder.org.tr');
    const list = (await manager.get('/api/admin/applications').expect(200)).body.items;
    expect(list.map((a) => a.id)).toEqual([mine]);
    await manager.get(`/api/admin/applications/${other}`).expect(404);

    // Yurt dışı kategoride bir başvuru: yetkisiz Genel Merkez görür, yurt yetkili Genel Merkez görmez
    const lisans = await registerApplicant({ idNumber: '10000000078', phone: '05337770000' });
    await lisans.put('/api/application/category').send({ category: 'universite' }).expect(200);

    const hq = await adminAgent('yurtlar@onder.org.tr');
    const all = (await hq.get('/api/admin/applications').expect(200)).body.items;
    expect(all.map((a) => a.id).sort()).toEqual([mine, other].sort());
    const me = (await hq.get('/api/admin/auth/me').expect(200)).body.admin;
    expect(me.permissions).toEqual(expect.arrayContaining(['view_yurt', 'yurt_hq_review']));
    expect(me.permissions).not.toContain('view_all');

    const gm = await adminAgent('gm@onder.org.tr');
    expect((await gm.get('/api/admin/applications').expect(200)).body.items).toHaveLength(3);
  });
});

describe('Öneri zinciri ve karar', () => {
  test('yurt müdürü -> yurtlar birimi -> süper admin', async () => {
    const { managerId, sup } = await staff();
    await sup.put(`/api/admin/users/${managerId}/scopes`).send({ scopes: [{ dormitoryId: dorms[0].id }] }).expect(200);
    const id = await submittedYurt(dorms[0].id);

    // Yurt müdürü: metin zorunlu, karar veremez, yurtlar birimi önerisini yazamaz
    const manager = await adminAgent('mudur@onder.org.tr');
    let d = (await manager.get(`/api/admin/applications/${id}`).expect(200)).body.application;
    expect(d.yurtReview).toMatchObject({ dorm: null, requestedAmount: 4000, canDorm: true, canHq: false, canDecide: false });
    expect(d.allowedTransitions.map((t) => t.to)).toEqual(['in_review']);
    expect((await manager.put(`/api/admin/applications/${id}/yurt-review/dorm`).send({ amount: 3000 })).status).toBe(422);
    expect((await manager.put(`/api/admin/applications/${id}/yurt-review/hq`).send({ amount: 3000, note: 'x' })).status).toBe(403);
    d = (await manager.put(`/api/admin/applications/${id}/yurt-review/dorm`)
      .send({ amount: '3000', note: 'Düzenli, ihtiyaç sahibi öğrenci' }).expect(200)).body.application;
    expect(d.status).toBe('in_review'); // ilk öneriyle incelemeye alınır
    expect(d.yurtReview.dorm).toMatchObject({ amount: 3000, note: 'Düzenli, ihtiyaç sahibi öğrenci', by: 'coordinator Kullanıcı' });

    // Yurtlar birimi: yurt önerisini görür, kendi önerisini (not isteğe bağlı) gönderir, karar veremez
    const hq = await adminAgent('yurtlar@onder.org.tr');
    d = (await hq.get(`/api/admin/applications/${id}`).expect(200)).body.application;
    expect(d.yurtReview).toMatchObject({ dorm: { amount: 3000 }, hq: null, canDorm: false, canHq: true, canDecide: false });
    d = (await hq.put(`/api/admin/applications/${id}/yurt-review/hq`).send({ amount: 3500 }).expect(200)).body.application;
    expect(d.yurtReview.hq).toMatchObject({ amount: 3500, note: null });
    expect((await hq.post(`/api/admin/applications/${id}/status`).send({ to: 'approved', finalAmount: 3500 })).status).toBe(403);

    // Yurt müdürü yurtlar birimi önerisini görmez
    d = (await manager.get(`/api/admin/applications/${id}`).expect(200)).body.application;
    expect(d.yurtReview.hq).toBeNull();

    // Yetkisiz Genel Merkez değerlendiricisi öneri veremez; hiçbir değerlendirici yurtta karar veremez
    const gm = await adminAgent('gm@onder.org.tr');
    d = (await gm.get(`/api/admin/applications/${id}`).expect(200)).body.application;
    expect(d.yurtReview).toMatchObject({ hq: { amount: 3500 }, canHq: false });
    expect(d.allowedTransitions.map((t) => t.to)).not.toContain('approved');
    expect((await gm.put(`/api/admin/applications/${id}/yurt-review/hq`).send({ amount: 1 })).status).toBe(403);

    // Süper admin: tutarsız onay olmaz, tutarla onaylar
    d = (await sup.get(`/api/admin/applications/${id}`).expect(200)).body.application;
    expect(d.yurtReview).toMatchObject({ dorm: { amount: 3000 }, hq: { amount: 3500 }, canDecide: true });
    expect(d.allowedTransitions.map((t) => t.to)).toEqual(expect.arrayContaining(['approved', 'rejected']));
    expect((await sup.post(`/api/admin/applications/${id}/status`).send({ to: 'approved' })).status).toBe(422);
    d = (await sup.post(`/api/admin/applications/${id}/status`).send({ to: 'approved', finalAmount: 3250 }).expect(200)).body.application;
    expect(d.status).toBe('approved');
    expect(d.yurtReview.final).toMatchObject({ amount: 3250, by: 'super_admin Kullanıcı' });

    // Karardan sonra öneri değiştirilemez; liste aşamaları gösterir
    expect((await manager.put(`/api/admin/applications/${id}/yurt-review/dorm`).send({ amount: 1, note: 'x' })).status).toBe(409);
    const row = (await sup.get('/api/admin/applications').expect(200)).body.items.find((a) => a.id === id);
    expect(row.yurtReview).toEqual({ dorm: true, hq: true, finalAmount: 3250 });

    // Yurt bursunda nitelikli bursiyer, burs veren ve referans teyidi yok
    expect(d).toMatchObject({ reference: null, qualified: null, sponsors: null });
    for (const [method, path, body] of [
      ['post', 'reference', { verified: true }], ['post', 'qualified', { qualified: true }], ['put', 'sponsors', { sponsorIds: [] }],
    ]) {
      const r = await sup[method](`/api/admin/applications/${id}/${path}`).send(body);
      expect([r.status, r.body.error.code]).toEqual([409, 'NOT_APPLICABLE']);
    }
    expect((await sup.get('/api/admin/applications?reference=0').expect(200)).body.items).toEqual([]);

    // Onay geri alınırsa karar tutarı silinir
    d = (await sup.post(`/api/admin/applications/${id}/status`).send({ to: 'in_review' }).expect(200)).body.application;
    expect(d.yurtReview.final).toBeNull();
  });
});

describe('Liste filtreleri ve hızlı sekmeler', () => {
  test('role göre kategoriler, yurtlar, sekmeler; yurt / aşama / tarih / arama / sıralama filtreleri', async () => {
    const { managerId, sup } = await staff();
    await sup.put(`/api/admin/users/${managerId}/scopes`).send({ scopes: [{ dormitoryId: dorms[0].id }] }).expect(200);
    const a = await submittedYurt(dorms[0].id);
    const b = await submittedYurt(dorms[1].id, { idNumber: '12345678950', phone: '05339990000', lastName: 'Aksoy' });

    // Yurt müdürü: tek kategori, tek yurt, il yok, kendi sırası
    const manager = await adminAgent('mudur@onder.org.tr');
    let meta = (await manager.get('/api/admin/applications/meta').expect(200)).body;
    expect(meta).toMatchObject({ categories: ['yurt'], showCity: false });
    expect(meta.dormitories.map((d) => d.id)).toEqual([dorms[0].id]);
    expect(meta.queues.find((q) => q.mine)).toMatchObject({ key: 'yurt_dorm', count: 1 });

    await manager.put(`/api/admin/applications/${a}/yurt-review/dorm`).send({ amount: 3000, note: 'Uygun' }).expect(200);

    // Yurtlar birimi: tüm yurtlar, sırasında yurdun önerdiği başvuru
    const hq = await adminAgent('yurtlar@onder.org.tr');
    meta = (await hq.get('/api/admin/applications/meta').expect(200)).body;
    expect(meta.categories).toEqual(['yurt']);
    expect(meta.dormitories.length).toBeGreaterThan(1);
    expect(Object.fromEntries(meta.queues.map((q) => [q.key, q.count]))).toMatchObject({ all: 2, yurt_hq: 1, yurt_dorm_wait: 1, submitted: 1, in_review: 1 });
    expect(meta.queues.map((q) => q.key)).not.toContain('revision_requested');

    const ids = async (agent, qs) => (await agent.get(`/api/admin/applications?${qs}`).expect(200)).body.items.map((x) => x.id);
    expect(await ids(hq, 'yurtStage=hq_pending')).toEqual([a]);
    expect(await ids(hq, 'yurtStage=dorm_pending')).toEqual([b]);
    expect(await ids(hq, `dormitoryId=${dorms[1].id}`)).toEqual([b]);
    expect(await ids(hq, 'universityType=vakif')).toEqual([]);
    expect(await ids(hq, 'q=Test Devlet')).toHaveLength(2); // üniversite adıyla arama
    expect(await ids(hq, 'sort=name')).toEqual([b, a]); // Aksoy, Yılmaz
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
    expect(await ids(hq, `from=${today}&to=${today}`)).toHaveLength(2);
    expect(await ids(hq, 'to=2020-01-01')).toEqual([]);

    // Süper admin: tüm kategoriler, karar sırası
    meta = (await sup.get('/api/admin/applications/meta').expect(200)).body;
    expect(meta.categories).toEqual(['lise', 'universite', 'yuksek_lisans', 'doktora', 'yurt']);
    expect(meta.queues.find((q) => q.key === 'yurt_decision')).toMatchObject({ mine: true, count: 0 });
  });
});
