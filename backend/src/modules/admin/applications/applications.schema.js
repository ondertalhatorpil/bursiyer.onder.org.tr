const { z } = require('zod');

const id = z.coerce.number().int().positive();
const STATUSES = ['draft', 'submitted', 'in_review', 'revision_requested', 'rejected', 'approved', 'iban_pending', 'finalized'];

const filters = z.object({
  programId: id.optional(),
  status: z.string().optional()
    .transform((v) => (v ? v.split(',').filter(Boolean) : []))
    .pipe(z.array(z.enum(STATUSES))),
  category: z.enum(['lise', 'universite', 'yuksek_lisans', 'doktora', 'yurt']).optional(),
  channelId: id.optional(),
  subUnitId: id.optional(),
  cityId: id.optional(),
  // Yurt Konaklama Bursu
  dormitoryId: id.optional(),
  yurtStage: z.enum(['dorm_pending', 'hq_pending', 'decision_pending', 'decided']).optional(),
  universityType: z.enum(['devlet', 'vakif']).optional(),
  reference: z.enum(['0', '1']).optional().transform((v) => (v === undefined ? undefined : v === '1')),
  // Gönderim tarihi aralığı (Türkiye günü, uçlar dahil)
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  sort: z.enum(['newest', 'oldest', 'name', 'requested']).default('newest'),
  flag: z.enum(['birth_year_out_of_range', 'school_not_in_list']).optional(),
  minor: z.enum(['0', '1']).optional().transform((v) => (v === undefined ? undefined : v === '1')),
  sponsor: z.union([z.literal('gm'), z.string().regex(/^\d+$/)]).optional(),
  qualified: z.enum(['0', '1']).optional().transform((v) => (v === undefined ? undefined : v === '1')),
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
  finalAmount: z.coerce.number().int('Tutarı tam TL olarak yazın').min(1, 'Aylık burs miktarını yazın').max(100_000_000).optional(),
});

// Yurt Konaklama Bursu: yurt idaresi / yurtlar birimi önerisi (aylık burs, tam TL)
const yurtReviewParams = z.object({ id: z.uuid({ error: 'Geçersiz başvuru' }), stage: z.enum(['dorm', 'hq']) });
const yurtReview = z.object({
  amount: z.coerce.number({ error: 'Önerdiğiniz aylık burs miktarını yazın' }).int('Tutarı tam TL olarak yazın')
    .min(1, 'Önerdiğiniz aylık burs miktarını yazın').max(100_000_000, 'Geçerli bir tutar yazın'),
  note: z.string().trim().max(4000, 'Metin en fazla 4000 karakter olabilir').optional()
    .transform((v) => v || undefined),
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
const sponsors = z.object({ sponsorIds: z.array(z.number().int().positive()).max(20, 'En fazla 20 firma') });
const qualified = z.object({ qualified: z.boolean({ error: 'Geçersiz değer' }) });

const ibanParams = z.object({ id: z.uuid(), accountId: id });
const ibanReview = z.object({
  decision: z.enum(['accepted', 'rejected'], { error: 'Karar seçin' }),
  note: z.string().trim().max(1000).optional(),
});
const payments = z.object({ programId: id.optional() });

const meta = z.object({ programId: id.optional() });

module.exports = { filters, meta, appParams, docParams, status, yurtReviewParams, yurtReview, documentReview, note, reference, qualified, sponsors, ibanParams, ibanReview, payments };
