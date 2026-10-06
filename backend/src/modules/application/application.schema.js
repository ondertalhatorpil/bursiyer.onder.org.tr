const { z } = require('zod');
const { parseIdNumber } = require('../../lib/identity');
const { normalizeTrMobile } = require('../../lib/phone');

const id = z.coerce.number().int().positive();
const text = (label, max = 255) => z.string()
  .transform((s) => s.trim().replace(/\s+/g, ' '))
  .pipe(z.string().min(2, `${label} en az 2 karakter olmalı`).max(max, `${label} en fazla ${max} karakter olabilir`));

const category = z.object({
  category: z.enum(['lise', 'universite', 'yuksek_lisans', 'doktora'], { error: 'Bir burs kategorisi seçiniz' }),
});

// Adım 4 - kanal. Ek alanlar (fields) serbest nesne; tanıma göre serviste doğrulanır.
const channel = z.object({
  channelId: id.optional(),
  subUnitId: id.optional(),
  fields: z.record(z.string(), z.any()).optional(),
}).refine((v) => v.channelId, { path: ['channelId'], message: 'Listeden bir başvuru kanalı seçiniz' });

const requirements = z.object({
  accepted: z.literal(true, { error: 'Başvuru şartlarını okuyup onaylamanız gerekiyor' }),
});

// Adım 4 - veli
const guardian = z.object({
  fullName: text('Veli / vasi adı soyadı', 128)
    .pipe(z.string().regex(/^[\p{L}\s.'-]+$/u, 'Ad soyad sadece harf içerebilir')),
  idType: z.enum(['TC', 'YKN', 'PASAPORT'], { error: 'Kimlik türünü seçiniz' }),
  idNumber: z.string({ error: 'Kimlik / pasaport numarası zorunludur' }).trim().toUpperCase(),
  phone: z.string({ error: 'Veli cep telefonu zorunludur' }).transform((v, ctx) => {
    const p = normalizeTrMobile(v);
    if (!p) {
      ctx.addIssue({ code: 'custom', message: 'Geçerli bir cep telefonu giriniz: 0 (5XX) XXX XX XX' });
      return z.NEVER;
    }
    return p;
  }),
}).transform((v, ctx) => {
  if (v.idType === 'PASAPORT') {
    if (!/^[A-Z0-9]{5,20}$/.test(v.idNumber)) {
      ctx.addIssue({ code: 'custom', path: ['idNumber'], message: 'Geçerli bir pasaport numarası giriniz' });
      return z.NEVER;
    }
    return v;
  }
  const parsed = parseIdNumber(v.idNumber);
  if (!parsed.valid || parsed.type !== v.idType) {
    ctx.addIssue({
      code: 'custom',
      path: ['idNumber'],
      message: v.idType === 'TC' ? 'Geçerli bir T.C. Kimlik No giriniz' : 'Geçerli bir Yabancı Kimlik No giriniz (99 ile başlar)',
    });
    return z.NEVER;
  }
  return { ...v, idNumber: parsed.value };
});

const guardianVerify = z.object({
  code: z.string({ error: 'Doğrulama kodu zorunludur' }).regex(/^\d{6}$/, 'Doğrulama kodu 6 haneli olmalı'),
  consent: z.literal(true, { error: 'Veli açık rıza beyanı onaylanmalıdır' }),
});

// Adım 5 - eğitim. Hangi alanların zorunlu olduğu kategoriye göre serviste belirlenir.
const optionalText = (label, max = 255) => z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  text(label, max).optional(),
);

const education = z.object({
  cityId: id.optional(),
  districtId: id.optional(),
  schoolId: id.optional(),
  schoolOther: optionalText('Okul adı'),
  universityId: id.optional(),
  universityOther: optionalText('Üniversite adı'),
  universityType: z.enum(['devlet', 'vakif']).optional(),
  faculty: optionalText('Fakülte'),
  department: optionalText('Bölüm'),
  grade: z.string().optional(),
});

// Adım 7
const submit = z.object({
  confirm: z.literal(true, { error: 'Bilgilerinizin doğruluğunu onaylamanız gerekiyor' }),
});

module.exports = { category, channel, requirements, guardian, guardianVerify, education, submit };
