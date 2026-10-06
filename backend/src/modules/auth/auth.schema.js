const { z } = require('zod');
const { parseIdNumber } = require('../../lib/identity');
const { normalizeTrMobile } = require('../../lib/phone');
const { parseDate, isPlausibleBirthDate } = require('../../lib/age');
const { COUNTRY_SET } = require('../../lib/countries');

const name = (label) => z.string({ error: `${label} zorunludur` })
  .transform((s) => s.trim().replace(/\s+/g, ' '))
  .pipe(z.string()
    .min(2, `${label} en az 2 karakter olmalı`)
    .max(64, `${label} en fazla 64 karakter olabilir`)
    .regex(/^[\p{L}\s.'-]+$/u, `${label} sadece harf içerebilir`));

const idNumber = z.string({ error: 'Kimlik numarası zorunludur' })
  .transform((v, ctx) => {
    const parsed = parseIdNumber(v);
    if (!parsed.valid) {
      ctx.addIssue({ code: 'custom', message: 'Geçerli bir T.C. Kimlik No veya Yabancı Kimlik No giriniz' });
      return z.NEVER;
    }
    return parsed;
  });

const phone = z.string({ error: 'Cep telefonu zorunludur' }).transform((v, ctx) => {
  const p = normalizeTrMobile(v);
  if (!p) {
    ctx.addIssue({ code: 'custom', message: 'Geçerli bir cep telefonu giriniz: 0 (5XX) XXX XX XX' });
    return z.NEVER;
  }
  return p;
});

const birthDate = z.string({ error: 'Doğum tarihi zorunludur' }).transform((v, ctx) => {
  const d = parseDate(v);
  if (!d || !isPlausibleBirthDate(d)) {
    ctx.addIssue({ code: 'custom', message: 'Geçerli bir doğum tarihi giriniz (GG/AA/YYYY)' });
    return z.NEVER;
  }
  return d;
});

const mustAccept = (message) => z.literal(true, { error: message });

const registerStart = z.object({
  firstName: name('Ad'),
  lastName: name('Soyad'),
  idNumber,
  birthDate,
  nationality: z.string().trim().max(64).optional(),
  phone,
  email: z.string({ error: 'E-posta zorunludur' }).trim().toLowerCase()
    .pipe(z.email({ error: 'Geçerli bir e-posta adresi giriniz' }).max(191)),
  consents: z.object({
    kvkk: mustAccept('KVKK Aydınlatma Metni ve Açık Rıza Beyanı onaylanmalıdır'),
    sharing: mustAccept('Protokol kurumlarıyla paylaşım rızası onaylanmalıdır'),
  }, { error: 'Onaylar zorunludur' }),
  captchaToken: z.string().optional(),
}).superRefine((v, ctx) => {
  if (v.idNumber?.type === 'YKN' && !v.nationality) {
    ctx.addIssue({ code: 'custom', path: ['nationality'], message: 'Uyruk zorunludur' });
  } else if (v.idNumber?.type === 'YKN' && !COUNTRY_SET.has(v.nationality)) {
    ctx.addIssue({ code: 'custom', path: ['nationality'], message: 'Listeden bir ülke seçiniz' });
  }
});

const token = z.string({ error: 'Oturum bilgisi eksik, lütfen baştan başlayınız' }).min(10).max(4000);
const code = z.string({ error: 'Doğrulama kodu zorunludur' }).regex(/^\d{6}$/, 'Doğrulama kodu 6 haneli olmalı');

const registerVerify = z.object({ registrationToken: token, code });
const registerResend = z.object({ registrationToken: token, captchaToken: z.string().optional() });
const loginStart = z.object({ idNumber, captchaToken: z.string().optional() });
const loginVerify = z.object({ loginToken: token, code });
const loginResend = z.object({ loginToken: token, captchaToken: z.string().optional() });

module.exports = { registerStart, registerVerify, registerResend, loginStart, loginVerify, loginResend };
