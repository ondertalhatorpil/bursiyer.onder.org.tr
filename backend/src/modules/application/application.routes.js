/**
 * /api/application  (aday oturumu gerekli, sadece taslak başvuruda değişiklik yapılabilir)
 *   GET  /                      başvurunun tüm adımları + adım durumları (steps)
 *   PUT  /category              Adım 3: kategori (değişirse kategoriye bağlı veriler silinir)
 *   PUT  /channel               Adım 4: kanal + alt birim + ek alanlar (lise, üniversite)
 *   POST /requirements          Adım 4: YL / Doktora şart beyanı
 *   PUT  /guardian              Adım 4: veli bilgisi -> velinin telefonuna SMS kodu (18 yaş altı)
 *   POST /guardian/resend
 *   POST /guardian/verify       kod + veli açık rızası
 *   PUT  /education             Adım 5: eğitim ve okul bilgileri
 *   GET  /summary               Adım 7: özet + eksikler + gönderilebilir mi
 *   POST /submit                Adım 7: incelemeye gönder -> takip no + SMS
 * Belgeler (Adım 6): /api/documents
 */
const { Router } = require('express');
const { validate } = require('../../middlewares/validate');
const { requireApplicant } = require('../../middlewares/auth-applicant');
const { otpSendLimiter, authLimiter } = require('../../middlewares/rate-limit');
const schema = require('./application.schema');
const c = require('./application.controller');

const router = Router();
router.use(requireApplicant);

router.get('/', c.get);
router.put('/category', validate({ body: schema.category }), c.setCategory);
router.put('/channel', validate({ body: schema.channel }), c.setChannel);
router.post('/requirements', validate({ body: schema.requirements }), c.acceptRequirements);
router.put('/guardian', otpSendLimiter, validate({ body: schema.guardian }), c.saveGuardian);
router.post('/guardian/resend', otpSendLimiter, c.resendGuardian);
router.post('/guardian/verify', authLimiter, validate({ body: schema.guardianVerify }), c.verifyGuardian);
router.put('/education', validate({ body: schema.education }), c.setEducation);
router.get('/summary', c.summary);
router.post('/submit', authLimiter, validate({ body: schema.submit }), c.submit);

module.exports = router;
