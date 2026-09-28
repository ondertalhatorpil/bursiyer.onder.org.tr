const { z } = require('zod');

const id = z.coerce.number().int().positive();
const STATUSES = ['draft', 'submitted', 'in_review', 'revision_requested', 'rejected', 'approved', 'iban_pending', 'finalized'];

const filters = z.object({
  programId: id.optional(),
  status: z.string().optional()
    .transform((v) => (v ? v.split(',').filter(Boolean) : []))
    .pipe(z.array(z.enum(STATUSES))),
  category: z.enum(['lise', 'universite', 'yuksek_lisans', 'doktora']).optional(),
  channelId: id.optional(),
  subUnitId: id.optional(),
  cityId: id.optional(),
  flag: z.enum(['birth_year_out_of_range', 'school_not_in_list']).optional(),
  minor: z.enum(['0', '1']).optional().transform((v) => (v === undefined ? undefined : v === '1')),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const appParams = z.object({ id: z.uuid({ error: 'Geçersiz başvuru' }) });
const docParams = z.object({ id: z.uuid(), documentId: z.uuid() });

const status = z.object({
  to: z.enum(STATUSES, { error: 'Geçersiz statü' }),
  note: z.string().trim().max(1000).optional(),
  reason: z.string().trim().max(1000).optional(),
});

const documentReview = z.object({
  reviewStatus: z.enum(['accepted', 'revision_requested', 'pending'], { error: 'Geçersiz inceleme sonucu' }),
  note: z.string().trim().max(1000).optional(),
});

const note = z.object({
  kind: z.enum(['note', 'recommend_approve', 'recommend_reject']).default('note'),
  body: z.string().trim().min(2, 'Not boş olamaz').max(4000),
});

const reference = z.object({ verified: z.boolean() });

const ibanParams = z.object({ id: z.uuid(), accountId: id });
const ibanReview = z.object({
  decision: z.enum(['accepted', 'rejected'], { error: 'Karar seçin' }),
  note: z.string().trim().max(1000).optional(),
});
const payments = z.object({ programId: id.optional() });

module.exports = { filters, appParams, docParams, status, documentReview, note, reference, ibanParams, ibanReview, payments };
