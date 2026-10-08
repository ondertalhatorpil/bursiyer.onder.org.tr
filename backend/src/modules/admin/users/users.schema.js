const { z } = require('zod');
const { normalizeTrMobile } = require('../../../lib/phone');

const id = z.coerce.number().int().positive();
const email = z.string().trim().toLowerCase().email('Geçerli bir e-posta girin').max(191);
const fullName = z.string().trim().min(3, 'Ad soyad en az 3 karakter').max(128);
const phone = z.string().trim().transform((v, ctx) => {
  const n = normalizeTrMobile(v);
  if (!n) { ctx.addIssue({ code: 'custom', message: 'Geçerli bir cep telefonu girin (05XX XXX XX XX)' }); return z.NEVER; }
  return n;
});
const role = z.enum(['super_admin', 'gm_reviewer', 'coordinator', 'viewer'], { error: 'Rol seçin' });

const params = z.object({ id });
const create = z.object({ email, fullName, phone, role });
const update = z.object({
  email: email.optional(), fullName: fullName.optional(), phone: phone.optional(), role: role.optional(), isActive: z.boolean().optional(),
});

const scope = z.object({
  category: z.enum(['lise', 'universite', 'yuksek_lisans', 'doktora', 'yurt']).nullable().optional(),
  channelId: id.nullable().optional(),
  subUnitId: id.nullable().optional(),
  dormitoryId: id.nullable().optional(), // sadece Yurt Konaklama Bursu
  cityId: id.nullable().optional(),
});
const scopes = z.object({ scopes: z.array(scope).max(50) });
// Genel Merkez Değerlendirici ek yetkileri
const grants = z.object({ yurtHq: z.boolean({ error: 'Yetki seçimi geçersiz' }) });

const auditQuery = z.object({
  adminId: id.optional(),
  action: z.string().trim().max(64).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

module.exports = { params, create, update, scopes, grants, auditQuery };
