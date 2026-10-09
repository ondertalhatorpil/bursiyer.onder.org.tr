const { z } = require('zod');
const { parseIdNumber } = require('../../lib/identity');
const { normalizeTrMobile } = require('../../lib/phone');

const id = z.coerce.number().int().positive();
const text = (label, max = 255) => z.string()
  .transform((s) => s.trim().replace(/\s+/g, ' '))
  .pipe(z.string().min(2, `${label} en az 2 karakter olmalı`).max(max, `${label} en fazla ${max} karakter olabilir`));

const category = z.object({
  category: z.enum(['lise', 'universite', 'yuksek_lisans', 'doktora', 'yurt'], { error: 'Bir burs kategorisi seçiniz' }),
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
  // Veli onayı velinin telefonuna gelen kodla verilir; ayrı rıza kutusu yoktur
  consent: z.boolean().optional(),
});

// Adım 5 - eğitim. Hangi alanların zorunlu olduğu kategoriye göre serviste belirlenir.
const blankToUndefined = (v) => (v === null || (typeof v === 'string' && v.trim() === '') ? undefined : v);
const optionalText = (label, max = 255) => z.preprocess(blankToUndefined, text(label, max).optional());

// Tutarlar tam TL (kuruş yok)
const MAX_MONEY = 100_000_000;
const optionalMoney = (label) => z.preprocess(
  blankToUndefined,
  z.coerce.number({ error: `${label} geçerli bir tutar olmalı` }).int(`${label} tam TL olarak yazılmalı`)
    .min(0, `${label} negatif olamaz`).max(MAX_MONEY, `${label} geçerli bir tutar olmalı`).optional(),
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
  // Yüksek lisans / doktora: üniversite ve şehir serbest metin (enstitü = faculty, bölüm = department)
  universityName: optionalText('Üniversite adı'),
  cityName: optionalText('İl', 64),
  // Yurt Konaklama Bursu
  dormitoryId: id.optional(),
  tuitionScholarshipRate: z.preprocess(blankToUndefined, z.coerce.number().int().optional()),
  annualTuitionFee: optionalMoney('Yıllık ücret'),
});

// Adım 5 / 6 (yurt). Tutarlar tam TL.
const parent = (label) => z.object({
  status: z.enum(['sag', 'vefat'], { error: `${label} durumunu seçiniz (Sağ / Vefat Etti)` }),
  fullName: text(`${label} adı soyadı`, 128),
  job: optionalText('Meslek', 128),
  location: optionalText('Yaşadığı il ve ilçe', 128),
  income: optionalMoney('Aylık gelir'),
  extraIncome: optionalMoney('Ek gelir'),
}, { error: `${label} bilgilerini giriniz` });

const count = (label) => z.preprocess(
  blankToUndefined,
  z.coerce.number({ error: `${label} zorunludur` }).int(`${label} tam sayı olmalı`)
    .min(1, `${label} en az 1 olmalı (kendiniz dahil)`).max(30, `${label} en fazla 30 olabilir`),
);

const yurtFamily = z.object({
  siblingCount: count('Toplam kardeş sayısı'),
  studyingSiblingCount: count('Okuyan kardeş sayısı'),
  guardianHousing: z.enum(['kira', 'ev_sahibi', 'lojman', 'diger'], { error: 'Velinizin yaşadığı yerin durumunu seçiniz' }),
  guardianHousingNote: optionalText('Açıklama', 255),
  mother: parent('Anne'),
  father: parent('Baba'),
  parentsLiving: z.enum(['birlikte', 'ayri']).optional(),
});

const yesNo = (message) => z.boolean({ error: message });

const yurtScholarship = z.object({
  otherScholarship: yesNo('Başka bir kuruluştan/kişiden burs alıp almadığınızı seçiniz'),
  otherScholarshipOrg: optionalText('Burs aldığınız kurum', 255),
  otherScholarshipAmount: optionalMoney('Aldığınız burs miktarı'),
  // GSB ve KYK sadece üniversite yurtlarında sorulur (zorunluluk serviste, yurt türüne göre)
  gsbSupport: yesNo('GSB beslenme barınma yardımı alıp almadığınızı seçiniz').optional(),
  kykSupport: z.enum(['yok', 'burs', 'kredi'], { error: "KYK'dan destek alıp almadığınızı seçiniz" }).optional(),
  requestedAmount: z.preprocess(
    blankToUndefined,
    z.coerce.number({ error: 'Talep ettiğiniz aylık burs miktarını yazınız' }).int('Tutarı tam TL olarak yazınız')
      .min(1, 'Talep ettiğiniz aylık burs miktarını yazınız').max(MAX_MONEY, 'Geçerli bir tutar yazınız'),
  ),
  commissionNote: z.preprocess(
    blankToUndefined,
    z.string().trim().max(2000, 'Açıklama en fazla 2000 karakter olabilir').optional(),
  ),
});

// Adım 7
const submit = z.object({
  confirm: z.literal(true, { error: 'Bilgilerinizin doğruluğunu onaylamanız gerekiyor' }),
});

module.exports = { category, channel, requirements, guardian, guardianVerify, education, yurtFamily, yurtScholarship, submit };
