/**
 * Ekomesaj sürücüsü: gerçek istek atılmaz, fetch taklit edilir.
 */
process.env.EKOMESAJ_USERNAME = 'kullanici';
process.env.EKOMESAJ_PASSWORD = 'sifre';

const { ekomesajDriver } = require('../src/services/sms/ekomesaj');

const reply = (status, body) => Promise.resolve({ ok: status < 400, status, text: () => Promise.resolve(JSON.stringify(body)) });

let calls;
beforeEach(() => {
  calls = [];
  global.fetch = jest.fn((url, opts) => {
    calls.push({ url, body: opts.body ? JSON.parse(opts.body) : null, auth: opts.headers.Authorization });
    return reply(200, { err: null, data: { pkgID: 252321859 } });
  });
});

test('başarılı gönderim: pkgID providerRef olur, Basic Auth gider', async () => {
  const r = await ekomesajDriver.send({ phone: '905321234567', text: 'x', kind: 'info' });
  expect(r.providerRef).toBe('252321859');
  expect(calls[0].url).toMatch(/\/sms\/create$/);
  expect(calls[0].auth).toBe(`Basic ${Buffer.from('kullanici:sifre').toString('base64')}`);
  expect(calls[0].body).toMatchObject({ number: '905321234567', sendingType: 0, commercial: false, validity: 60 });
});

test('OTP varsayılan olarak /sms/create ile gider', async () => {
  await ekomesajDriver.send({ phone: '905321234567', text: 'kod', kind: 'otp' });
  expect(calls[0].url).toMatch(/\/sms\/create$/);
  expect(calls[0].body.validity).toBe(60);
});

test('HTTP 200 içinde err dönerse hata fırlatır', async () => {
  global.fetch = jest.fn(() => reply(200, { err: { code: 'ERR_INVALID_SMS_SENDER', status: 417 } }));
  await expect(ekomesajDriver.send({ phone: '905321234567', text: 'x', kind: 'otp' }))
    .rejects.toThrow('ERR_INVALID_SMS_SENDER');
});

test('HTTP 403 hata fırlatır', async () => {
  global.fetch = jest.fn(() => reply(403, { err: { status: 401, code: 'ERR_UNAUTHORIZED_REQUEST' }, data: null }));
  await expect(ekomesajDriver.getCredit()).rejects.toThrow('403');
});

test('kredi sorgusu', async () => {
  global.fetch = jest.fn(() => reply(200, { err: null, data: 643764 }));
  expect(await ekomesajDriver.getCredit()).toBe(643764);
});
