const { z } = require('zod');

const id = z.coerce.number().int().positive();
const CATEGORIES = ['lise', 'universite', 'yuksek_lisans', 'doktora'];
const CONSENT_TYPES = ['kvkk', 'sharing', 'guardian', 'criminal_record', 'requirements_yl', 'requirements_dr'];

module.exports = {
  cityParams: z.object({ cityId: id }),
  universityParams: z.object({ universityId: id }),
  consentParams: z.object({ type: z.enum(CONSENT_TYPES, { error: 'Bilinmeyen metin tipi' }) }),
  contentParams: z.object({ key: z.string().regex(/^[a-z0-9_]{1,64}$/) }),
  schoolsQuery: z.object({
    cityId: id.optional(),
    districtId: id.optional(),
    type: z.enum(['sports', 'international']).optional(),
    q: z.string().trim().max(100).optional(),
  }),
  universitiesQuery: z.object({
    cityId: id.optional(),
    q: z.string().trim().max(100).optional(),
  }),
  channelsQuery: z.object({ category: z.enum(CATEGORIES, { error: 'Geçersiz kategori' }) }),
};
