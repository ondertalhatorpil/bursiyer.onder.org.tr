import { z } from 'zod';
import { isValidDate, isValidIdNumber, isValidMobile, isYkn } from '../../lib/validation';

const name = (label) => z.string().trim()
  .min(2, `${label} en az 2 karakter olmalı`)
  .max(64, `${label} en fazla 64 karakter olabilir`)
  .regex(/^[\p{L}\s.'-]+$/u, `${label} sadece harf içerebilir`);

export const registerSchema = z.object({
  firstName: name('Ad'),
  lastName: name('Soyad'),
  idNumber: z.string().refine(isValidIdNumber, 'Geçerli bir T.C. Kimlik No veya Yabancı Kimlik No giriniz'),
  nationality: z.string().trim().max(64).optional(),
  birthDate: z.string().refine(isValidDate, 'Geçerli bir doğum tarihi giriniz (GG/AA/YYYY)'),
  phone: z.string().refine(isValidMobile, 'Geçerli bir cep telefonu giriniz: 0 (5XX) XXX XX XX'),
  email: z.email('Geçerli bir e-posta adresi giriniz'),
  consents: z.object({
    kvkk: z.literal(true, { error: 'KVKK Aydınlatma Metni ve Açık Rıza Beyanı onaylanmalıdır' }),
  }),
}).superRefine((v, ctx) => {
  if (isYkn(v.idNumber) && !v.nationality) {
    ctx.addIssue({ code: 'custom', path: ['nationality'], message: 'Uyruğunuzu seçiniz' });
  }
});

export const REGISTER_FIELDS = [
  'firstName', 'lastName', 'idNumber', 'nationality', 'birthDate', 'phone', 'email', 'consents.kvkk',
];

export const registerDefaults = {
  firstName: '', lastName: '', idNumber: '', nationality: '', birthDate: '', phone: '', email: '',
  consents: { kvkk: false },
};
