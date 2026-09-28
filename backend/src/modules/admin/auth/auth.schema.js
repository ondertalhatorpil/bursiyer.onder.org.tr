const { z } = require('zod');

const login = z.object({
  email: z.string({ error: 'E-posta zorunludur' }).trim().toLowerCase().pipe(z.email({ error: 'Geçerli bir e-posta girin' })),
  password: z.string({ error: 'Şifre zorunludur' }).min(1, 'Şifre zorunludur').max(200),
});

const verify = z.object({
  loginToken: z.string().min(10).max(4000),
  code: z.string().regex(/^\d{6}$/, 'Doğrulama kodu 6 haneli olmalı'),
});

const resend = z.object({ loginToken: z.string().min(10).max(4000) });

// En az 10 karakter, harf ve rakam
const changePassword = z.object({
  currentPassword: z.string().min(1, 'Mevcut şifre zorunludur'),
  newPassword: z.string()
    .min(10, 'Yeni şifre en az 10 karakter olmalı')
    .max(200)
    .regex(/[A-Za-zÇĞİÖŞÜçğıöşü]/, 'Yeni şifre en az bir harf içermeli')
    .regex(/\d/, 'Yeni şifre en az bir rakam içermeli'),
}).refine((v) => v.currentPassword !== v.newPassword, { path: ['newPassword'], message: 'Yeni şifre mevcut şifreden farklı olmalı' });

module.exports = { login, verify, resend, changePassword };
