const request = require('supertest');
const app = require('../src/app');
const { db, openProgram, closePrograms } = require('./helpers/db');

afterAll(() => db.destroy());

describe('public API', () => {
  test('dönem durumu', async () => {
    await closePrograms();
    let res = await request(app).get('/api/public/program').expect(200);
    expect(res.body.open).toBe(false);
    expect(res.body.message).toMatch(/kapalı/);
    await openProgram();
    res = await request(app).get('/api/public/program').expect(200);
    expect(res.body).toMatchObject({ open: true, name: '2026-2027' });
  });

  test('iller ve İstanbul ilçeleri', async () => {
    const cities = await request(app).get('/api/public/cities').expect(200);
    expect(cities.body).toHaveLength(81);
    expect(cities.headers['cache-control']).toMatch(/max-age=300/);
    const d = await request(app).get('/api/public/cities/34/districts').expect(200);
    expect(d.body).toHaveLength(39);
  });

  test('okul filtreleri', async () => {
    expect((await request(app).get('/api/public/schools?type=sports').expect(200)).body).toHaveLength(39);
    expect((await request(app).get('/api/public/schools?type=international').expect(200)).body).toHaveLength(18);
    const byDistrict = await request(app).get('/api/public/schools?cityId=34').expect(200);
    expect(byDistrict.body.every((s) => s.cityName === 'İstanbul')).toBe(true);
    const search = await request(app).get(`/api/public/schools?q=${encodeURIComponent('Hamidullah')}`).expect(200);
    expect(search.body[0].name).toMatch(/Hamidullah/);
  });

  test('kanallar ek alan tanımlarıyla gelir', async () => {
    const lise = await request(app).get('/api/public/channels?category=lise').expect(200);
    expect(lise.body.map((c) => c.code)).toEqual(['lise_teskilat', 'lise_spor', 'lise_uluslararasi', 'lise_egitim_destek']);
    expect(lise.body[0].extraFields.map((f) => f.key)).toEqual(['region', 'district_id', 'city_id', 'reference_name', 'school_id', 'grade']);

    const uni = await request(app).get('/api/public/channels?category=universite').expect(200);
    const gm = uni.body.find((c) => c.code === 'uni_gm_komisyonlari');
    expect(gm.subUnits.find((u) => u.code === 'yurtlar').extraFields[0].type).toBe('dormitory');

    await request(app).get('/api/public/channels?category=yok').expect(422);
  });

  test('metinler', async () => {
    await openProgram();
    const kvkk = await request(app).get('/api/public/consents/kvkk').expect(200);
    expect(kvkk.body).toMatchObject({ type: 'kvkk', version: 1 });
    const yl = await request(app).get('/api/public/consents/requirements_yl').expect(200);
    expect(yl.body.body).toMatch(/1999/);
    await request(app).get('/api/public/consents/bilinmeyen').expect(422);
  });

  test('yurtlar', async () => {
    const active = Number((await db('dormitories').where({ is_active: true }).count({ n: '*' }).first()).n);
    expect((await request(app).get('/api/public/dormitories').expect(200)).body).toHaveLength(active);
  });

  test('ülke listesi', async () => {
    const res = await request(app).get('/api/public/countries').expect(200);
    expect(res.body).toEqual(expect.arrayContaining(['Türkiye', 'Azerbaycan', 'Kuzey Kıbrıs Türk Cumhuriyeti']));
  });

  test('üniversite fakülteleri bölümleriyle gelir', async () => {
    const agu = await db('universities').where({ name: 'Abdullah Gül Üniversitesi' }).first();
    const res = await request(app).get(`/api/public/universities/${agu.id}/faculties`).expect(200);
    expect(res.body.map((f) => f.name)).toContain('Mühendislik Fakültesi');
    const muh = res.body.find((f) => f.name === 'Mühendislik Fakültesi');
    expect(muh.departments.map((d) => d.name)).toContain('Bilgisayar Mühendisliği');

    const renamed = await db('universities').where({ name: 'Bursa Uludağ Üniversitesi', is_active: true }).first();
    expect(renamed).toBeDefined();
  });
});
