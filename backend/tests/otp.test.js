process.env.EKOMESAJ_WEBHOOK_TOKEN = 'test-webhook-token-123';
process.env.SMS_DRIVER = 'log';

const request = require('supertest');
const db = require('../src/db/knex');
const app = require('../src/app');
const { sendOtp, verifyOtp, OTP } = require('../src/services/otp.service');
const { outbox } = require('../src/services/sms/ekomesaj');
const { cleanupOtps } = require('../src/jobs/cleanup');

const PHONE = '905321112233';
const lastCode = () => outbox.at(-1).text.match(/\b(\d{6})\b/)[1];
// Bekleme süresini beklemeden yeni kod gönderebilmek için kayıtları geriye tarihler
const ageAll = (sec) => db('otp_codes').update({ created_at: new Date(Date.now() - sec * 1000) });

beforeEach(async () => {
  await db('otp_codes').del();
  await db('sms_logs').del();
  outbox.length = 0;
});
afterAll(() => db.destroy());

describe('OTP gönderme', () => {
  test('kod gönderilir, DB\'de düz metin tutulmaz, sms_logs yazılır', async () => {
    const r = await sendOtp({ phone: PHONE, purpose: 'applicant', subjectRef: 'abc', ip: '1.1.1.1' });
    expect(r).toEqual({ maskedPhone: '0 (532) *** ** 33', expiresIn: 180, resendIn: 60 });
    const code = lastCode();
    const row = await db('otp_codes').first();
    expect(row.code_hash).not.toContain(code);
    expect(row.sms_log_id).toBeTruthy();
    const log = await db('sms_logs').first();
    expect(log).toMatchObject({ phone: PHONE, template_code: 'otp_applicant', status: 'sent' });
  });

  test('60 sn dolmadan yeniden gönderilemez', async () => {
    await sendOtp({ phone: PHONE, purpose: 'applicant' });
    await expect(sendOtp({ phone: PHONE, purpose: 'applicant' })).rejects.toMatchObject({ code: 'OTP_COOLDOWN' });
  });

  test('numara başına saatte en fazla 5', async () => {
    for (let i = 0; i < OTP.perPhonePerHour; i++) {
      await sendOtp({ phone: PHONE, purpose: 'applicant' });
      await ageAll(61);
    }
    await expect(sendOtp({ phone: PHONE, purpose: 'applicant' })).rejects.toMatchObject({ code: 'OTP_PHONE_LIMIT' });
  });

  test('IP başına saatte en fazla 10', async () => {
    for (let i = 0; i < OTP.perIpPerHour; i++) {
      await sendOtp({ phone: `90532000000${i}`.slice(0, 12), purpose: 'applicant', ip: '9.9.9.9' });
    }
    await expect(sendOtp({ phone: '905329999999', purpose: 'applicant', ip: '9.9.9.9' }))
      .rejects.toMatchObject({ code: 'OTP_IP_LIMIT' });
  });
});

describe('OTP doğrulama', () => {
  test('doğru kod kabul edilir ve bir daha kullanılamaz', async () => {
    await sendOtp({ phone: PHONE, purpose: 'applicant', subjectRef: 'abc' });
    const code = lastCode();
    await expect(verifyOtp({ phone: PHONE, purpose: 'applicant', subjectRef: 'abc', code })).resolves.toBe(true);
    await expect(verifyOtp({ phone: PHONE, purpose: 'applicant', subjectRef: 'abc', code }))
      .rejects.toMatchObject({ code: 'OTP_EXPIRED' });
  });

  test('3 hatalı denemede kilitlenir, doğru kod da artık işe yaramaz', async () => {
    await sendOtp({ phone: PHONE, purpose: 'applicant' });
    const code = lastCode();
    const wrong = code === '000000' ? '111111' : '000000';
    await expect(verifyOtp({ phone: PHONE, purpose: 'applicant', code: wrong }))
      .rejects.toMatchObject({ code: 'OTP_INVALID', details: { remaining: 2 } });
    await expect(verifyOtp({ phone: PHONE, purpose: 'applicant', code: wrong }))
      .rejects.toMatchObject({ details: { remaining: 1 } });
    await expect(verifyOtp({ phone: PHONE, purpose: 'applicant', code: wrong })).rejects.toMatchObject({ code: 'OTP_LOCKED' });
    await expect(verifyOtp({ phone: PHONE, purpose: 'applicant', code })).rejects.toMatchObject({ code: 'OTP_LOCKED' });
  });

  test('süresi dolan kod reddedilir', async () => {
    await sendOtp({ phone: PHONE, purpose: 'applicant' });
    const code = lastCode();
    await db('otp_codes').update({ expires_at: new Date(Date.now() - 1000) });
    await expect(verifyOtp({ phone: PHONE, purpose: 'applicant', code })).rejects.toMatchObject({ code: 'OTP_EXPIRED' });
  });

  test('veli kodu aday doğrulamasında geçmez', async () => {
    await sendOtp({ phone: PHONE, purpose: 'guardian', subjectRef: 'g1', vars: { applicant_name: 'Ali' } });
    const code = lastCode();
    expect(outbox.at(-1).text).toContain('Ali');
    await expect(verifyOtp({ phone: PHONE, purpose: 'applicant', subjectRef: 'g1', code }))
      .rejects.toMatchObject({ code: 'OTP_EXPIRED' });
  });

  test('yeni kod gelince eskisi geçersiz olur', async () => {
    await sendOtp({ phone: PHONE, purpose: 'applicant' });
    const oldCode = lastCode();
    await ageAll(61);
    await sendOtp({ phone: PHONE, purpose: 'applicant' });
    const newCode = lastCode();
    if (oldCode !== newCode) {
      await expect(verifyOtp({ phone: PHONE, purpose: 'applicant', code: oldCode }))
        .rejects.toMatchObject({ code: 'OTP_INVALID' });
    }
    await expect(verifyOtp({ phone: PHONE, purpose: 'applicant', code: newCode })).resolves.toBe(true);
  });

  test('biçimsiz kod', async () => {
    await expect(verifyOtp({ phone: PHONE, purpose: 'applicant', code: '12' })).rejects.toMatchObject({ code: 'OTP_INVALID' });
  });
});

describe('temizlik ve webhook', () => {
  test('24 saatten eski OTP kayıtları silinir', async () => {
    await sendOtp({ phone: PHONE, purpose: 'applicant' });
    await db('otp_codes').update({ expires_at: new Date(Date.now() - 25 * 3600 * 1000) });
    expect(await cleanupOtps()).toBe(1);
  });

  test('webhook: yanlış token 404, doğru token durumu günceller', async () => {
    const [id] = await db('sms_logs').insert({ phone: PHONE, template_code: 'otp_applicant', status: 'sent', provider_ref: '555' });
    await request(app).post('/api/webhooks/ekomesaj/yanlis').send({}).expect(404);
    await request(app).post('/api/webhooks/ekomesaj/test-webhook-token-123')
      .send({ pkgID: 555, state: 'DELIVERED' }).expect(200);
    const row = await db('sms_logs').where({ id }).first();
    expect(row.status).toBe('delivered');
    expect(row.delivered_at).toBeTruthy();
  });
});
