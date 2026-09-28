const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db/knex');

afterAll(() => db.destroy());

describe('Temel altyapı', () => {
  test('GET /api/health veritabanı ile birlikte ok döner', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'ok' });
  });

  test('Tanımsız adres 404 ve standart hata biçimi döner', async () => {
    const res = await request(app).get('/api/olmayan-adres');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('Bozuk JSON 400 döner', async () => {
    const res = await request(app).post('/api/health').set('Content-Type', 'application/json').send('{bozuk');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_JSON');
  });

  test('Güvenlik başlıkları ve istek kimliği eklenir', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
