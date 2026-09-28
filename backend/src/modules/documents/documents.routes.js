/**
 * /api/documents  (aday oturumu gerekli) - Adım 6
 *   GET    /                  istenen belgeler + mevcut yüklemeler + tamamlandı mı
 *   POST   /:typeCode         multipart/form-data: file (+ consent=true, adli sicil gibi rıza isteyen belgelerde)
 *   DELETE /:id               belgeyi kaldır (sadece taslakta)
 *   GET    /:id/file          kendi yüklediği dosyayı görüntüle
 */
const { Router } = require('express');
const { z } = require('zod');
const { validate } = require('../../middlewares/validate');
const { requireApplicant } = require('../../middlewares/auth-applicant');
const { uploadSingle } = require('../../middlewares/upload');
const c = require('./documents.controller');

const router = Router();
router.use(requireApplicant);

const typeParams = z.object({ typeCode: z.string().regex(/^[a-z0-9_]{2,64}$/, 'Geçersiz belge tipi') });
const idParams = z.object({ id: z.uuid({ error: 'Geçersiz belge' }) });

router.get('/', c.list);
router.post('/:typeCode', validate({ params: typeParams }), uploadSingle, c.upload);
router.delete('/:id', validate({ params: idParams }), c.remove);
router.get('/:id/file', validate({ params: idParams }), c.file);

module.exports = router;
