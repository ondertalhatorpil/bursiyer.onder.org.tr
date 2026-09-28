/**
 * Ekomesaj bağlantı testi (SMS_DRIVER ayarından bağımsız, gerçek gönderim yapar).
 *   npm run sms:test -- 05XXXXXXXXX          -> kredi sorgular + bilgilendirme SMS'i
 *   npm run sms:test -- 05XXXXXXXXX otp      -> kredi sorgular + OTP biçiminde test kodu (EKOMESAJ_OTP_MODE'a göre)
 * Ekomesaj'ın ham yanıtını ekrana basar (yanıt biçimini öğrenmek için).
 */
const config = require('../src/config');
const { normalizeTrMobile } = require('../src/lib/phone');
const { ekomesajDriver } = require('../src/services/sms/ekomesaj');

(async () => {
  const phone = normalizeTrMobile(process.argv[2]);
  const kind = process.argv[3] === 'otp' ? 'otp' : 'info';
  if (!phone) {
    console.error('Kullanım: npm run sms:test -- 05XXXXXXXXX [otp]');
    process.exit(1);
  }
  if (!config.sms.username || !config.sms.password) {
    console.error('.env içinde EKOMESAJ_USERNAME ve EKOMESAJ_PASSWORD dolu olmalı');
    process.exit(1);
  }

  if (kind === 'otp') console.log('OTP modu:', config.sms.otpMode === 'otp' ? '/sms/create-otp' : '/sms/create');
  try {
    console.log('Kredi:', await ekomesajDriver.getCredit());
  } catch (err) {
    console.error('Kredi sorgusu başarısız:', err.message, err.meta || '');
  }

  const text = kind === 'otp'
    ? 'ONDER burs basvurusu dogrulama kodunuz: 123456. (Test mesajidir)'
    : 'ONDER burs sistemi test mesajidir, dikkate almayiniz.';
  try {
    const result = await ekomesajDriver.send({ phone, text, kind, title: 'Sistem testi' });
    console.log('Gönderildi. providerRef:', result.providerRef);
    console.log('Ham yanıt:', result.raw);
  } catch (err) {
    console.error('Gönderim başarısız:', err.message, err.meta || '');
    process.exit(1);
  }
})();
