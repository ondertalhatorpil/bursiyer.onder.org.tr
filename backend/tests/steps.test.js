/**
 * Adım 4-5: kanal, ek alanlar, YL/DR şartları, veli, eğitim bilgileri.
 */
process.env.SMS_DRIVER = 'log';

const { db, resetApplications, openProgram } = require('./helpers/db');
const { registerApplicant, lastCode, outbox } = require('./helpers/applicant');

let ch; let sub; let sportsSchool; let intlSchool; let istDistrict; let otherIstDistrict; let normalSchool; let dorm; let uni;

beforeAll(async () => {
  ch = Object.fromEntries((await db('channels').select('id', 'code')).map((c) => [c.code, c.id]));
  sub = Object.fromEntries((await db('sub_units').select('id', 'code')).map((u) => [u.code, u.id]));
  sportsSchool = await db('schools').where({ is_sports: true }).first();
  intlSchool = await db('schools').where({ is_international: true }).first();
  istDistrict = await db('districts').where({ city_id: 34, name: 'Üsküdar' }).first();
  otherIstDistrict = await db('districts').where({ city_id: 34, name: 'Fatih' }).first();
  normalSchool = await db('schools').where({ city_id: 34, district_id: istDistrict.id, is_sports: false }).first();
  dorm = await db('dormitories').first();
  await db('universities').insert([
    { name: 'Test Devlet Üniversitesi', city_id: 34, type: 'devlet' },
    { name: 'Test Vakıf Üniversitesi', city_id: 34, type: 'vakif' },
  ]).onConflict('name').merge({ is_active: true }); // seed listede olmayanları pasife alır
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

describe('Adım 4: kanal', () => {
  test('kategori seçilmeden kanal seçilemez', async () => {
    const agent = await registerApplicant();
    const res = await agent.put('/api/application/channel').send({ channelId: ch.lise_teskilat });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('STEP_ORDER');
  });

  test('Teşkilat / İstanbul: ilçe + referans kaydedilir, adım 5 açılır', async () => {
    const agent = await registerApplicant();
    await agent.put('/api/application/category').send({ category: 'lise' }).expect(200);
    const res = await agent.put('/api/application/channel').send({
      channelId: ch.lise_teskilat,
      fields: { region: 'istanbul', district_id: istDistrict.id, reference_name: 'Mehmet Kaya' },
    }).expect(200);
    expect(res.body.application.channel).toMatchObject({
      code: 'lise_teskilat',
      fields: { region: 'istanbul', district_id: istDistrict.id, reference_name: 'Mehmet Kaya' },
    });
    expect(res.body.application.steps[4]).toBe(true);
    expect(res.body.application.currentStep).toBe(5);
  });

  test('Teşkilat: İstanbul dışı ilçe ve eksik referans reddedilir', async () => {
    const agent = await registerApplicant();
    await agent.put('/api/application/category').send({ category: 'lise' });
    const ankaraDistrict = await db('districts').where({ city_id: 6 }).first();
    const res = await agent.put('/api/application/channel').send({
      channelId: ch.lise_teskilat, fields: { region: 'istanbul', district_id: ankaraDistrict.id },
    });
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.error.details).sort()).toEqual(['fields.district_id', 'fields.reference_name']);
  });

  test('Teşkilat / Anadolu: İstanbul seçilemez', async () => {
    const agent = await registerApplicant();
    await agent.put('/api/application/category').send({ category: 'lise' });
    const res = await agent.put('/api/application/channel').send({
      channelId: ch.lise_teskilat, fields: { region: 'anadolu', city_id: 34, reference_name: 'X Y' },
    });
    expect(res.status).toBe(422);
    expect(res.body.error.details['fields.city_id']).toBeDefined();
  });

  test('Spor lisesi kanalında spor lisesi olmayan okul seçilemez', async () => {
    const agent = await registerApplicant();
    await agent.put('/api/application/category').send({ category: 'lise' });
    const res = await agent.put('/api/application/channel').send({
      channelId: ch.lise_spor, fields: { school_id: normalSchool.id, sport_branch: 'Güreş', grade: '10' },
    });
    expect(res.status).toBe(422);
    await agent.put('/api/application/channel').send({
      channelId: ch.lise_spor, fields: { school_id: sportsSchool.id, sport_branch: 'Güreş', grade: '10' },
    }).expect(200);
  });

  test('Uluslararası AİHL: uyruk boşsa adayın uyruğu gelir, sınıf zorunlu', async () => {
    const agent = await registerApplicant();
    await agent.put('/api/application/category').send({ category: 'lise' });
    const noGrade = await agent.put('/api/application/channel').send({
      channelId: ch.lise_uluslararasi, fields: { school_id: intlSchool.id },
    });
    expect(Object.keys(noGrade.body.error.details)).toEqual(['fields.grade']);
    const res = await agent.put('/api/application/channel').send({
      channelId: ch.lise_uluslararasi, fields: { school_id: intlSchool.id, grade: '9' },
    }).expect(200);
    expect(res.body.application.channel.fields.nationality).toBe('Türkiye');
  });

  test('Teşkilat / Anadolu: okul seçilen ilden olmalı', async () => {
    const agent = await registerApplicant();
    await agent.put('/api/application/category').send({ category: 'lise' });
    const base = { region: 'anadolu', city_id: 6, reference_name: 'X Y', grade: '11' };
    const wrong = await agent.put('/api/application/channel').send({
      channelId: ch.lise_teskilat, fields: { ...base, school_id: normalSchool.id }, // İstanbul'daki okul
    });
    expect(wrong.status).toBe(422);
    expect(wrong.body.error.details['fields.school_id']).toBeDefined();
    const ankaraSchool = await db('schools').where({ city_id: 6, is_active: true }).first();
    await agent.put('/api/application/channel').send({
      channelId: ch.lise_teskilat, fields: { ...base, school_id: ankaraSchool.id },
    }).expect(200);
  });

  test('Üniversite: alt birim zorunlu, yurt seçimi kontrol edilir', async () => {
    const agent = await registerApplicant();
    await agent.put('/api/application/category').send({ category: 'universite' });
    let res = await agent.put('/api/application/channel').send({ channelId: ch.uni_gm_komisyonlari });
    expect(res.body.error.details.subUnitId).toBeDefined();
    res = await agent.put('/api/application/channel').send({
      channelId: ch.uni_gm_komisyonlari, subUnitId: sub.yurtlar, fields: { dormitory_id: 9999 },
    });
    expect(res.body.error.details['fields.dormitory_id']).toBeDefined();
    res = await agent.put('/api/application/channel').send({
      channelId: ch.uni_gm_komisyonlari, subUnitId: sub.yurtlar, fields: { dormitory_id: dorm.id },
    }).expect(200);
    expect(res.body.application.channel.subUnit.code).toBe('yurtlar');
  });

  test('başka kategorinin kanalı seçilemez; WONDER ek alansız', async () => {
    const agent = await registerApplicant();
    await agent.put('/api/application/category').send({ category: 'universite' });
    await agent.put('/api/application/channel').send({ channelId: ch.lise_teskilat }).expect(422);
    await agent.put('/api/application/channel').send({ channelId: ch.uni_wonder }).expect(200);
  });
});

describe('Adım 4: YL / Doktora şartları', () => {
  test('şart beyanı kaydedilir; doğum yılı şart dışıysa uyarı + işaret', async () => {
    const agent = await registerApplicant({ birthDate: '01/01/1995' });
    await agent.put('/api/application/category').send({ category: 'yuksek_lisans' });
    await agent.put('/api/application/channel').send({ channelId: ch.uni_wonder }).expect(409);
    await agent.post('/api/application/requirements').send({ accepted: false }).expect(422);
    const res = await agent.post('/api/application/requirements').send({ accepted: true }).expect(200);
    expect(res.body.birthYearWarning).toMatch(/1999/);
    expect(res.body.application.flags).toContain('birth_year_out_of_range');
    expect(res.body.application.steps[4]).toBe(true);
    expect(await db('consents').count({ n: '*' }).first()).toEqual({ n: 2 }); // kvkk + şart
  });

  test('doktora 1991 sonrası: uyarı yok', async () => {
    const agent = await registerApplicant({ birthDate: '01/01/1995' });
    await agent.put('/api/application/category').send({ category: 'doktora' });
    const res = await agent.post('/api/application/requirements').send({ accepted: true }).expect(200);
    expect(res.body.birthYearWarning).toBeNull();
    expect(res.body.application.flags).not.toContain('birth_year_out_of_range');
  });
});

describe('Adım 4: veli (18 yaş altı)', () => {
  const guardianBody = { fullName: 'Hasan Yılmaz', idType: 'TC', idNumber: '12345678950', phone: '05339998877' };

  test('18 yaş üstünden veli istenmez', async () => {
    const agent = await registerApplicant();
    const res = await agent.put('/api/application/guardian').send(guardianBody);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('GUARDIAN_NOT_REQUIRED');
  });

  test('veli telefonu aday telefonuyla aynı olamaz', async () => {
    const agent = await registerApplicant({ birthDate: '01/01/2011' });
    const res = await agent.put('/api/application/guardian').send({ ...guardianBody, phone: '05321112233' });
    expect(res.status).toBe(422);
    expect(res.body.error.details.phone).toMatch(/farklı/);
  });

  test('veli kodu veliye gider, kodla doğrulanınca adım 4 tamamlanır (ayrı rıza kutusu yok)', async () => {
    const agent = await registerApplicant({ birthDate: '01/01/2011' });
    await agent.put('/api/application/category').send({ category: 'lise' });
    await agent.put('/api/application/channel').send({
      channelId: ch.lise_egitim_destek, fields: { reference_name: 'Ref Kişi' },
    }).expect(200);

    let d = await detail(agent);
    expect(d.guardianRequired).toBe(true);
    expect(d.steps[4]).toBe(false); // veli olmadan adım 4 bitmez
    expect(d.currentStep).toBe(4);

    const save = await agent.put('/api/application/guardian').send(guardianBody).expect(200);
    expect(save.body.maskedPhone).toBe('0 (533) *** ** 77');
    expect(outbox.at(-1).phone).toBe('905339998877');
    expect(outbox.at(-1).text).toContain('Ahmet Yılmaz');

    const v = await agent.post('/api/application/guardian/verify').send({ code: lastCode() }).expect(200);
    expect(v.body.application.guardian).toMatchObject({ fullName: 'Hasan Yılmaz', idType: 'TC', idNumberMasked: '123******50', verified: true });
    expect(v.body.application.steps[4]).toBe(true);
    expect(v.body.application.currentStep).toBe(5);

    expect(await db('consents').whereNotNull('guardian_id').first()).toBeUndefined();
  });

  test('veli bilgisi değişirse doğrulama sıfırlanır; pasaport kabul edilir', async () => {
    const agent = await registerApplicant({ birthDate: '01/01/2011' });
    await agent.put('/api/application/guardian').send(guardianBody).expect(200);
    await agent.post('/api/application/guardian/verify').send({ code: lastCode(), consent: true }).expect(200);
    await db('otp_codes').update({ created_at: new Date(Date.now() - 120 * 1000) });

    await agent.put('/api/application/guardian').send({ ...guardianBody, idType: 'PASAPORT', idNumber: 'u1234567' }).expect(200);
    const d = await detail(agent);
    expect(d.guardian).toMatchObject({ idType: 'PASAPORT', verified: false });
  });

  test('geçersiz veli kimlik no', async () => {
    const agent = await registerApplicant({ birthDate: '01/01/2011' });
    const res = await agent.put('/api/application/guardian').send({ ...guardianBody, idNumber: '12345678901' });
    expect(res.status).toBe(422);
    expect(res.body.error.details.idNumber).toBeDefined();
  });
});

describe('Adım 5: eğitim', () => {
  test('lise + Teşkilat İstanbul: il İstanbul kilitli, okul seçilen ilçeden olmalı', async () => {
    const agent = await registerApplicant();
    await agent.put('/api/application/category').send({ category: 'lise' });
    await agent.put('/api/application/channel').send({
      channelId: ch.lise_teskilat, fields: { region: 'istanbul', district_id: istDistrict.id, reference_name: 'R K' },
    }).expect(200);

    const wrong = await agent.put('/api/application/education').send({
      cityId: 6, districtId: otherIstDistrict.id, schoolId: normalSchool.id, grade: '10',
    });
    expect(wrong.status).toBe(422);
    expect(wrong.body.error.details.schoolId).toBeDefined();

    const res = await agent.put('/api/application/education').send({
      cityId: 6, districtId: istDistrict.id, schoolId: normalSchool.id, grade: '10',
    }).expect(200);
    expect(res.body.application.education).toMatchObject({ cityId: 34, cityName: 'İstanbul', schoolName: normalSchool.name, grade: '10' });
    expect(res.body.application.steps[5]).toBe(true);
    expect(res.body.application.currentStep).toBe(6);
  });

  test('lise + spor: okul ve sınıf Adım 4\'ten kilitli gelir', async () => {
    const agent = await registerApplicant();
    await agent.put('/api/application/category').send({ category: 'lise' });
    await agent.put('/api/application/channel').send({
      channelId: ch.lise_spor, fields: { school_id: sportsSchool.id, sport_branch: 'Judo', grade: '10' },
    }).expect(200);
    const res = await agent.put('/api/application/education').send({ schoolId: normalSchool.id, grade: '11' }).expect(200);
    expect(res.body.application.education.schoolId).toBe(sportsSchool.id);
    expect(res.body.application.education.cityId).toBe(sportsSchool.city_id);
    expect(res.body.application.education.grade).toBe('10');

    // Aynı kanalda sınıf değişince eğitim bilgisi sıfırlanır
    const changed = await agent.put('/api/application/channel').send({
      channelId: ch.lise_spor, fields: { school_id: sportsSchool.id, sport_branch: 'Judo', grade: '11' },
    }).expect(200);
    expect(changed.body.educationCleared).toBe(true);
  });

  test('lise + "Diğer" okul: serbest metin, işaretlenir', async () => {
    const agent = await registerApplicant();
    await agent.put('/api/application/category').send({ category: 'lise' });
    await agent.put('/api/application/channel').send({ channelId: ch.lise_egitim_destek, fields: { reference_name: 'R K' } });
    const res = await agent.put('/api/application/education').send({
      cityId: 34, districtId: istDistrict.id, schoolOther: 'Üsküdar Fen Lisesi', grade: 'hazirlik',
    }).expect(200);
    expect(res.body.application.education.schoolName).toBe('Üsküdar Fen Lisesi');
    expect(res.body.application.flags).toContain('school_not_in_list');
  });

  test('lise kanalı değişince eğitim bilgisi sıfırlanır', async () => {
    const agent = await registerApplicant();
    await agent.put('/api/application/category').send({ category: 'lise' });
    await agent.put('/api/application/channel').send({ channelId: ch.lise_egitim_destek, fields: { reference_name: 'R K' } });
    await agent.put('/api/application/education').send({ cityId: 34, districtId: istDistrict.id, schoolId: normalSchool.id, grade: '9' }).expect(200);
    const res = await agent.put('/api/application/channel').send({
      channelId: ch.lise_spor, fields: { school_id: sportsSchool.id, sport_branch: 'Judo', grade: '10' },
    }).expect(200);
    expect(res.body.educationCleared).toBe(true);
    expect(res.body.application.education).toBeNull();
  });

  test('üniversite: tür listeden gelir', async () => {
    const agent = await registerApplicant();
    await agent.put('/api/application/category').send({ category: 'universite' });
    await agent.put('/api/application/channel').send({ channelId: ch.uni_wonder });

    const base = { cityId: 34, faculty: 'Mühendislik Fakültesi', department: 'Bilgisayar Mühendisliği', grade: '2' };
    const vakif = await agent.put('/api/application/education').send({ ...base, universityId: uni.vakif.id }).expect(200);
    expect(vakif.body.application.education).toMatchObject({ universityType: 'vakif', universityName: 'Test Vakıf Üniversitesi' });

    const devlet = await agent.put('/api/application/education').send({ ...base, universityId: uni.devlet.id }).expect(200);
    expect(devlet.body.application.education).toMatchObject({ universityType: 'devlet' });
  });

  test('üniversite "Diğer": tür adaydan alınır; eksik alanlar', async () => {
    const agent = await registerApplicant();
    await agent.put('/api/application/category').send({ category: 'universite' });
    await agent.put('/api/application/channel').send({ channelId: ch.uni_wonder });
    const missing = await agent.put('/api/application/education').send({ cityId: 34, universityOther: 'Yeni Üniversite' });
    expect(Object.keys(missing.body.error.details).sort()).toEqual(['department', 'faculty', 'grade', 'universityType']);
  });

  test('üniversite: listesi olan üniversitede fakülte ve bölüm listeden seçilir', async () => {
    const agent = await registerApplicant();
    await agent.put('/api/application/category').send({ category: 'universite' });
    await agent.put('/api/application/channel').send({ channelId: ch.uni_wonder });
    const agu = await db('universities').where({ name: 'Abdullah Gül Üniversitesi' }).first();
    const base = { cityId: 38, universityId: agu.id, grade: '2' };

    const wrong = await agent.put('/api/application/education')
      .send({ ...base, faculty: 'Mühendislik Fakültesi', department: 'Psikoloji' });
    expect(wrong.status).toBe(422);
    expect(Object.keys(wrong.body.error.details)).toEqual(['department']);

    const unknown = await agent.put('/api/application/education')
      .send({ ...base, faculty: 'Olmayan Fakülte', department: 'Bilgisayar Mühendisliği' });
    expect(Object.keys(unknown.body.error.details).sort()).toEqual(['department', 'faculty']);

    const ok = await agent.put('/api/application/education')
      .send({ ...base, faculty: 'Mühendislik Fakültesi', department: 'Bilgisayar Mühendisliği' }).expect(200);
    expect(ok.body.application.education).toMatchObject({ faculty: 'Mühendislik Fakültesi', department: 'Bilgisayar Mühendisliği' });
  });

  test('yüksek lisans: üniversite, enstitü, bölüm, şehir yazılır; sınıf otomatik', async () => {
    const agent = await registerApplicant({ birthDate: '01/01/2001' });
    await agent.put('/api/application/category').send({ category: 'yuksek_lisans' });
    await agent.post('/api/application/requirements').send({ accepted: true });

    const missing = await agent.put('/api/application/education').send({ universityId: uni.devlet.id, cityId: 34 });
    expect(missing.status).toBe(422);
    expect(Object.keys(missing.body.error.details).sort()).toEqual(['cityName', 'department', 'faculty', 'universityName']);

    // Listedeki üniversite ve il yazılırsa (büyük-küçük harf farkı önemsiz) kayda bağlanır
    let res = await agent.put('/api/application/education').send({
      universityName: 'test devlet üniversitesi', faculty: 'Sosyal Bilimler Enstitüsü', department: 'Sosyoloji', cityName: 'istanbul',
    }).expect(200);
    expect(res.body.application.education).toMatchObject({
      universityId: uni.devlet.id, universityType: 'devlet', cityId: 34, cityName: 'İstanbul', grade: 'yl',
      faculty: 'Sosyal Bilimler Enstitüsü', department: 'Sosyoloji',
    });

    // Listede olmayan üniversite / şehir yazıldığı gibi saklanır, "listede yok" işareti konmaz
    res = await agent.put('/api/application/education').send({
      universityName: 'University of Oxford', faculty: 'Graduate School', department: 'Sociology', cityName: 'Oxford',
    }).expect(200);
    expect(res.body.application.education).toMatchObject({
      universityId: null, universityName: 'University of Oxford', universityType: null, cityId: null, cityName: 'Oxford',
    });
    expect(res.body.application.flags).not.toContain('school_not_in_list');
  });

  test('kategori değişince kanal, eğitim ve işaretler temizlenir', async () => {
    const agent = await registerApplicant({ birthDate: '01/01/1995' });
    await agent.put('/api/application/category').send({ category: 'yuksek_lisans' });
    await agent.post('/api/application/requirements').send({ accepted: true });
    const res = await agent.put('/api/application/category').send({ category: 'universite' }).expect(200);
    expect(res.body.changed).toBe(true);
    expect(res.body.application.requirementsAcceptedAt).toBeNull();
    expect(res.body.application.flags).not.toContain('birth_year_out_of_range');
    expect(res.body.application.steps[4]).toBe(false);
  });
});
