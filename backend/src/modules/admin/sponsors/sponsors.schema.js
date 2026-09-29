const { z } = require('zod');

const opt = (max) => z.union([z.string().trim().max(max, `En fazla ${max} karakter`), z.null()])
  .optional().transform((v) => (v === '' ? null : v));
const date = z.union([z.iso.date({ error: 'Geçersiz tarih' }), z.literal(''), z.null()])
  .optional().transform((v) => (v === '' ? null : v));

const fields = {
  name: z.string({ error: 'Firma adı zorunlu' }).trim().min(2, 'Firma adı en az 2 karakter').max(160),
  startedAt: date,
  endedAt: date,
  isActive: z.boolean().optional(),
  contactName: opt(120),
  contactPhone: opt(20),
  contactEmail: z.union([z.email({ error: 'Geçersiz e-posta' }), z.literal(''), z.null()]).optional().transform((v) => (v === '' ? null : v)),
  website: opt(255),
  notes: opt(2000),
};

const endAfterStart = (b) => !b.startedAt || !b.endedAt || b.endedAt >= b.startedAt;
const endMsg = { message: 'Bitiş tarihi başlangıçtan önce olamaz', path: ['endedAt'] };

const create = z.object(fields).refine(endAfterStart, endMsg);
const update = z.object(fields).partial().refine(endAfterStart, endMsg);
const params = z.object({ id: z.coerce.number().int().positive() });

module.exports = { create, update, params };
