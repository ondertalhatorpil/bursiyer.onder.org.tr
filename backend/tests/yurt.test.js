/**
 * Yurt Konaklama Bursu: kanal ve belge yok.
 *   Adım 4 eğitim (+ yurt, özel üniversitede burs oranı) -> Adım 5 aile ve gelir -> Adım 6 burs bilgileri -> Adım 7 gönderim
 */
process.env.SMS_DRIVER = 'log';

const { db, resetApplications, openProgram } = require('./helpers/db');
const { registerApplicant, lastCode, outbox } = require('./helpers/applicant');
const { createAdmin, adminAgent } = require('./helpers/admin');

let dorm; let uni;

beforeAll(async () => {
  dorm = await db('dormitories').where({ is_active: true }).first();
  await db('universities').insert([
    { name: 'Test Devlet Üniversitesi', city_id: 34, type: 'devlet' },
    { name: 'Test Vakıf Üniversitesi', city_id: 34, type: 'vakif' },
  ]).onConflict('name').merge({ is_active: true });
  uni = {
    devlet: await db('universities').where({ name: 'Test Devlet Üniversitesi' }).first(),
    vakif: await db('universities').where({ name: 'Test Vakıf Üniversitesi' }).first(),
  };
});

beforeEach(async () => {
  await resetApplications();
  await openProgram();
  outbox.length = 0;
});
afterAll(() => db.destroy());

const detail = async (agent) => (await agent.get('/api/application').expect(200)).body.application;

const education = (over = {}) => ({
  cityId: 34, universityId: uni.devlet.id, faculty: 'İlahiyat Fakültesi', department: 'İlahiyat', grade: '2',
  dormitoryId: dorm.id, ...over,
});

const family = (over = {}) => ({
  siblingCount: 4,
  studyingSiblingCount: 2,
  guardianHousing: 'kira',
  mother: { status: 'sag', fullName: 'Ayşe Yılmaz', job: 'Ev hanımı', location: 'Konya / Meram', income: 0 },
  father: { status: 'sag', fullName: 'Ali Yılmaz', job: 'Memur', location: 'Konya / Meram', income: 30000, extraIncome: 2000 },
  parentsLiving: 'birlikte',
  ...over,
});

const scholarship = (over = {}) => ({
  otherScholarship: false, gsbSupport: false, kykSupport: 'burs', requestedAmount: 3000, ...over,
});

async function yurtApplicant(over) {
  const agent = await registerApplicant(over);
  await agent.put('/api/application/category').send({ category: 'yurt' }).expect(200);
  return agent;
}

describe('Yurt Konaklama Bursu', () => {
  test('kategori seçilince kanal adımı atlanır, Adım 4 eğitimdir', async () => {
    const agent = await registerApplicant();
    const res = await agent.put('/api/application/category').send({ category: 'yurt' }).expect(200);
    expect(res.body.application).toMatchObject({ category: 'yurt', categoryLabel: 'Yurt Konaklama Bursu', currentStep: 4 });

    const channel = await agent.put('/api/application/channel').send({ channelId: 1 });
    expect(channel.status).toBe(409);
    expect(channel.body.error.code).toBe('WRONG_CATEGORY');
    expect((await agent.get('/api/public/channels?category=yurt').expect(200)).body).toEqual([]);
  });

  test('eğitim: yurt zorunlu; devlet üniversitesinde burs oranı istenmez', async () => {
    const agent = await yurtApplicant();
    const missing = await agent.put('/api/application/education').send(education({ dormitoryId: undefined }));
    expect(missing.status).toBe(422);
    expect(missing.body.error.details.dormitoryId).toBeDefined();

    const res = await agent.put('/api/application/education')
      .send(education({ tuitionScholarshipRate: 50, annualTuitionFee: 1000 })).expect(200);
    expect(res.body.application.education).toMatchObject({
      dormitoryId: dorm.id, dormitoryName: dorm.name, universityType: 'devlet', tuitionScholarshipRate: null, annualTuitionFee: null,
    });
    expect(res.body.application.steps[4]).toBe(true);
    expect(res.body.application.currentStep).toBe(5);
  });

  test('özel üniversite: oran zorunlu, %100 değilse yıllık ücret zorunlu', async () => {
    const agent = await yurtApplicant();
    let res = await agent.put('/api/application/education').send(education({ universityId: uni.vakif.id }));
    expect(res.status).toBe(422);
    expect(res.body.error.details.tuitionScholarshipRate).toBeDefined();

    res = await agent.put('/api/application/education').send(education({ universityId: uni.vakif.id, tuitionScholarshipRate: 60 }));
    expect(res.status).toBe(422);

    res = await agent.put('/api/application/education').send(education({ universityId: uni.vakif.id, tuitionScholarshipRate: 75 }));
    expect(res.status).toBe(422);
    expect(res.body.error.details.annualTuitionFee).toBeDefined();

    res = await agent.put('/api/application/education')
      .send(education({ universityId: uni.vakif.id, tuitionScholarshipRate: 75, annualTuitionFee: '120000' })).expect(200);
    expect(res.body.application.education).toMatchObject({ tuitionScholarshipRate: 75, annualTuitionFee: 120000 });

    res = await agent.put('/api/application/education')
      .send(education({ universityId: uni.vakif.id, tuitionScholarshipRate: 100, annualTuitionFee: 5 })).expect(200);
    expect(res.body.application.education).toMatchObject({ tuitionScholarshipRate: 100, annualTuitionFee: null });
  });

  test('okulu tanımlı olmayan lise yurdu: üniversite değil lise bilgileri (il, ilçe, okul, sınıf) istenir', async () => {
    const liseDorm = await db('dormitories').where({ name: 'Cevizlibağ Kız Öğrenci Yurdu' }).first();
    expect(liseDorm.level).toBe('lise');
    await db('dormitories').where({ id: liseDorm.id }).update({ school_id: null }); // bağlı lisesi yokmuş gibi
    const agent = await yurtApplicant();

    // Üniversite bilgileri lise yurdunda geçmez
    let res = await agent.put('/api/application/education').send(education({ dormitoryId: liseDorm.id }));
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.error.details).sort()).toEqual(['districtId', 'grade', 'schoolId']);

    const district = await db('districts').where({ city_id: 34, name: 'Fatih' }).first();
    res = await agent.put('/api/application/education').send({
      dormitoryId: liseDorm.id, cityId: 34, districtId: district.id, schoolOther: 'Fatih Kız Anadolu Lisesi', grade: '10',
    }).expect(200);
    expect(res.body.application.education).toMatchObject({
      dormitoryId: liseDorm.id, schoolName: 'Fatih Kız Anadolu Lisesi', districtName: 'Fatih', grade: '10',
      universityId: null, universityType: null, tuitionScholarshipRate: null,
    });
    expect(res.body.application.currentStep).toBe(5);

    const dorms = (await agent.get('/api/public/dormitories').expect(200)).body;
    expect(dorms.find((d) => d.id === liseDorm.id)).toMatchObject({ level: 'lise', school: null });
    await db('dormitories').where({ id: liseDorm.id }).update({ school_id: liseDorm.school_id });
  });

  test('okulu bağlı lise yurdu: okul, il, ilçe yurdun lisesinden gelir; sadece sınıf seçilir', async () => {
    const besiktas = await db('dormitories').where({ name: 'Beşiktaş Kız Öğrenci Yurdu' }).first();
    const school = await db('schools').where({ meb_code: 760904 }).first();
    expect(besiktas).toMatchObject({ level: 'lise', school_id: school.id });
    const agent = await yurtApplicant();

    let res = await agent.put('/api/application/education').send({ dormitoryId: besiktas.id });
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.error.details)).toEqual(['grade']);

    // Gönderilen başka okul / il yok sayılır
    res = await agent.put('/api/application/education')
      .send({ dormitoryId: besiktas.id, cityId: 6, schoolOther: 'Başka Lise', grade: '11' }).expect(200);
    expect(res.body.application.education).toMatchObject({
      schoolId: school.id, schoolName: 'Beşiktaş Kız Anadolu İmam Hatip Lisesi', cityName: 'İstanbul', districtName: 'Beşiktaş',
      schoolOther: null, grade: '11',
    });
    expect(res.body.application.flags).not.toContain('school_not_in_list');

    const dorms = (await agent.get('/api/public/dormitories').expect(200)).body;
    expect(dorms.find((d) => d.id === besiktas.id).school).toMatchObject({ id: school.id, cityName: 'İstanbul', districtName: 'Beşiktaş' });
  });

  test('"Diğer" üniversitede tür adaydan alınır, vakıfsa oran sorulur', async () => {
    const agent = await yurtApplicant();
    const res = await agent.put('/api/application/education').send(education({
      universityId: undefined, universityOther: 'Listede Olmayan Üniversite', universityType: 'vakif',
    }));
    expect(res.status).toBe(422);
    expect(res.body.error.details.tuitionScholarshipRate).toBeDefined();
  });

  test('aile ve burs bilgileri sırayla; eksiksizse gönderilir (belge istenmez)', async () => {
    const agent = await yurtApplicant();
    // Sıra dışı
    expect((await agent.put('/api/application/yurt/family').send(family())).status).toBe(409);

    await agent.put('/api/application/education').send(education()).expect(200);
    expect((await agent.put('/api/application/yurt/scholarship').send(scholarship())).status).toBe(409);

    let summary = (await agent.get('/api/application/summary').expect(200)).body;
    expect(summary.documents).toEqual([]);
    expect(summary.missing.map((m) => [m.step, m.field])).toEqual([[5, 'family'], [6, 'scholarship']]);

    const f = await agent.put('/api/application/yurt/family').send(family()).expect(200);
    expect(f.body.application.yurt.family).toMatchObject({
      siblingCount: 4, studyingSiblingCount: 2, guardianHousing: 'kira', parentsLiving: 'birlikte',
      father: { status: 'sag', fullName: 'Ali Yılmaz', income: 30000, extraIncome: 2000 },
    });
    expect(f.body.application.currentStep).toBe(6);

    const s = await agent.put('/api/application/yurt/scholarship')
      .send(scholarship({ otherScholarship: true, otherScholarshipOrg: 'X Vakfı', otherScholarshipAmount: 1500 })).expect(200);
    expect(s.body.application.yurt.scholarship).toMatchObject({
      otherScholarship: true, otherScholarshipOrg: 'X Vakfı', otherScholarshipAmount: 1500, kykSupport: 'burs', requestedAmount: 3000,
    });
    expect(s.body.application.steps).toMatchObject({ 4: true, 5: true, 6: true, 7: false });
    expect(s.body.application.currentStep).toBe(7);

    summary = (await agent.get('/api/application/summary').expect(200)).body;
    expect(summary).toMatchObject({ missing: [], canSubmit: true, documents: [] });

    const res = await agent.post('/api/application/submit').send({ confirm: true }).expect(200);
    expect(res.body.application).toMatchObject({ status: 'submitted', category: 'yurt' });

    // Admin detayı: yurt, aile ve burs bilgileri; belge yok, revize istenemez
    const old = await db('admin_users').where({ email: 'yurt-gm@onder.org.tr' }).first('id');
    if (old) {
      await db('audit_logs').where({ admin_user_id: old.id }).del();
      await db('admin_users').where({ id: old.id }).del();
    }
    await createAdmin('yurt-gm@onder.org.tr', 'gm_reviewer');
    const admin = await adminAgent('yurt-gm@onder.org.tr');
    await admin.post(`/api/admin/applications/${res.body.application.id}/status`).send({ to: 'in_review' }).expect(200);
    const d = (await admin.get(`/api/admin/applications/${res.body.application.id}`).expect(200)).body.application;
    expect(d).toMatchObject({
      categoryLabel: 'Yurt Konaklama Bursu',
      channel: null,
      documents: [],
      education: { dormitory: dorm.name, university: 'Test Devlet Üniversitesi' },
      yurt: { family: { siblingCount: 4 }, scholarship: { requestedAmount: 3000, otherScholarshipOrg: 'X Vakfı' } },
    });
    expect(d.allowedTransitions.map((t) => t.to)).not.toContain('revision_requested');
  });

  test('aile: kurallar (okuyan kardeş, Diğer açıklaması, sağ ebeveyn bilgileri, birlikte/ayrı)', async () => {
    const agent = await yurtApplicant();
    await agent.put('/api/application/education').send(education()).expect(200);

    const res = await agent.put('/api/application/yurt/family').send(family({
      siblingCount: 2,
      studyingSiblingCount: 3,
      guardianHousing: 'diger',
      mother: { status: 'sag', fullName: 'Ayşe Yılmaz' },
      parentsLiving: undefined,
    }));
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.error.details).sort()).toEqual([
      'guardianHousingNote', 'mother.income', 'mother.job', 'mother.location', 'parentsLiving', 'studyingSiblingCount',
    ]);

    // Vefat eden ebeveynde sadece ad tutulur, birlikte/ayrı sorulmaz
    const ok = await agent.put('/api/application/yurt/family').send(family({
      guardianHousing: 'diger', guardianHousingNote: 'Akraba yanında',
      father: { status: 'vefat', fullName: 'Ali Yılmaz', job: 'Memur', income: 100 },
      parentsLiving: 'ayri',
    })).expect(200);
    expect(ok.body.application.yurt.family).toMatchObject({
      guardianHousingNote: 'Akraba yanında', parentsLiving: null,
      father: { status: 'vefat', fullName: 'Ali Yılmaz', job: null, income: null },
    });
  });

  test('burs bilgileri: başka burs alınıyorsa kurum ve miktar zorunlu, talep tutarı zorunlu', async () => {
    const agent = await yurtApplicant();
    await agent.put('/api/application/education').send(education()).expect(200);
    await agent.put('/api/application/yurt/family').send(family()).expect(200);

    const res = await agent.put('/api/application/yurt/scholarship')
      .send(scholarship({ otherScholarship: true, requestedAmount: '' }));
    expect(res.status).toBe(422);
    expect(res.body.error.details.requestedAmount).toBeDefined();

    const res2 = await agent.put('/api/application/yurt/scholarship').send(scholarship({ otherScholarship: true }));
    expect(res2.status).toBe(422);
    expect(Object.keys(res2.body.error.details).sort()).toEqual(['otherScholarshipAmount', 'otherScholarshipOrg']);
  });

  test('burs bilgileri: GSB ve KYK üniversite yurdunda zorunlu, lise yurdunda sorulmaz', async () => {
    const besiktas = await db('dormitories').where({ name: 'Beşiktaş Kız Öğrenci Yurdu' }).first();
    const agent = await yurtApplicant();
    await agent.put('/api/application/education').send(education()).expect(200);
    await agent.put('/api/application/yurt/family').send(family()).expect(200);

    // Üniversite yurdu: GSB / KYK eksikse hata
    const res = await agent.put('/api/application/yurt/scholarship')
      .send(scholarship({ gsbSupport: undefined, kykSupport: undefined }));
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.error.details).sort()).toEqual(['gsbSupport', 'kykSupport']);
    await agent.put('/api/application/yurt/scholarship').send(scholarship({ gsbSupport: true })).expect(200);

    // Lise yurduna geçilince GSB / KYK cevapları silinir, burs bilgileri geçerli kalır
    let d = (await agent.put('/api/application/education').send({ dormitoryId: besiktas.id, grade: '9' }).expect(200)).body.application;
    expect(d.education.dormitoryLevel).toBe('lise');
    expect(d.yurt.scholarship).toMatchObject({ gsbSupport: null, kykSupport: null, requestedAmount: 3000 });
    expect(d.steps[6]).toBe(true);

    // Lise yurdunda GSB / KYK gönderilse de tutulmaz
    d = (await agent.put('/api/application/yurt/scholarship')
      .send({ otherScholarship: false, requestedAmount: 2000, gsbSupport: true, kykSupport: 'kredi' }).expect(200)).body.application;
    expect(d.yurt.scholarship).toMatchObject({ gsbSupport: null, kykSupport: null, requestedAmount: 2000 });

    // Tekrar üniversite yurduna geçilince burs bilgileri yeniden istenir
    d = (await agent.put('/api/application/education').send(education()).expect(200)).body.application;
    expect(d.yurt.scholarship).toBeNull();
    expect(d.steps[6]).toBe(false);
    const summary = (await agent.get('/api/application/summary').expect(200)).body;
    expect(summary.missing.map((m) => m.field)).toEqual(['scholarship']);
  });

  test('kategori değişince yurt bilgileri silinir', async () => {
    const agent = await yurtApplicant();
    await agent.put('/api/application/education').send(education()).expect(200);
    await agent.put('/api/application/yurt/family').send(family()).expect(200);

    const res = await agent.put('/api/application/category').send({ category: 'universite' }).expect(200);
    expect(res.body).toMatchObject({ changed: true });
    expect(res.body.application).toMatchObject({ currentStep: 4, education: null, yurt: null });
    expect(await db('yurt_details').count({ n: '*' }).first()).toMatchObject({ n: 0 });
  });

  test('18 yaş altı: veli onayı olmadan Adım 5 açılmaz; onaylanınca açılır', async () => {
    const agent = await yurtApplicant({ birthDate: '01/01/2011' });
    let res = await agent.put('/api/application/education').send(education()).expect(200);
    expect(res.body.application.steps[4]).toBe(false);
    expect(res.body.application.currentStep).toBe(4);
    expect((await agent.put('/api/application/yurt/family').send(family())).status).toBe(409);

    await agent.put('/api/application/guardian')
      .send({ fullName: 'Hasan Yılmaz', idType: 'TC', idNumber: '12345678950', phone: '05339998877' }).expect(200);
    res = await agent.post('/api/application/guardian/verify').send({ code: lastCode(), consent: true }).expect(200);
    expect(res.body.application.steps[4]).toBe(true);
    expect(res.body.application.currentStep).toBe(5);

    const d = await detail(agent);
    expect(d.guardian.verified).toBe(true);
  });
});
