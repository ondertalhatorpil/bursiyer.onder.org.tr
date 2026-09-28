const { z } = require('zod');

const id = z.coerce.number().int().positive();
const dateOrNull = z.union([z.iso.datetime({ offset: true, error: 'Geçersiz tarih' }), z.null()]);

const programParams = z.object({ id });

const programUpdate = z.object({
  title: z.string().trim().min(5, 'Başlık en az 5 karakter').max(255).optional(),
  trackingPrefix: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,6}-[0-9]{4}$/, 'Biçim: OND-2026').optional(),
  isOpen: z.boolean().optional(),
  opensAt: dateOrNull.optional(),
  closesAt: dateOrNull.optional(),
});

const programCreate = z.object({
  name: z.string().trim().regex(/^\d{4}-\d{4}$/, 'Biçim: 2027-2028'),
  title: z.string().trim().min(5, 'Başlık en az 5 karakter').max(255),
  trackingPrefix: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,6}-[0-9]{4}$/, 'Biçim: OND-2027'),
});

const consentParams = z.object({
  type: z.enum(['kvkk', 'sharing', 'guardian', 'criminal_record', 'requirements_yl', 'requirements_dr'], { error: 'Geçersiz metin tipi' }),
});

const consentPublish = z.object({
  title: z.string().trim().min(3, 'Başlık zorunlu').max(255),
  label: z.string().trim().min(10, 'Onay cümlesi en az 10 karakter').max(500),
  body: z.string().trim().min(20, 'Metin en az 20 karakter olmalı').max(200000),
});

const contentParams = z.object({ key: z.string().regex(/^[a-z_]{2,64}$/) });
const contentUpdate = z.object({
  title: z.string().trim().min(2, 'Başlık zorunlu').max(255),
  body: z.string().trim().max(20000).nullable(),
});

const smsParams = z.object({ code: z.string().regex(/^[a-z_]{2,64}$/) });
const smsUpdate = z.object({
  body: z.string().trim().min(10, 'Mesaj en az 10 karakter').max(612),
  isActive: z.boolean().optional(),
});

module.exports = {
  programParams, programUpdate, programCreate, consentParams, consentPublish, contentParams, contentUpdate, smsParams, smsUpdate,
};
