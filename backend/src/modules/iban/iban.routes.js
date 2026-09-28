/**
 * /api/iban  (aday oturumu gerekli) - Adım 8
 *   GET  /        durum: IBAN girilebilir mi, güncel kayıt, uyarı metni
 *   POST /        multipart/form-data: iban, confirm=true, file (hesap belgesi: PDF/JPG/PNG, 5 MB)
 *   GET  /file    kendi yüklediği hesap belgesi
 */
const { Router } = require('express');
const { requireApplicant } = require('../../middlewares/auth-applicant');
const { uploadSingle } = require('../../middlewares/upload');
const { authLimiter } = require('../../middlewares/rate-limit');
const storage = require('../../services/storage.service');
const svc = require('../../services/iban.service');
const { notFound } = require('../../lib/errors');

const router = Router();
router.use(requireApplicant);

router.get('/', async (req, res) => {
  res.json(await svc.getForApplicant(req.applicantId));
});

router.post('/', authLimiter, uploadSingle, async (req, res) => {
  const body = req.body || {};
  const result = await svc.submit(req.applicantId, {
    iban: typeof body.iban === 'string' ? body.iban : '',
    confirm: body.confirm === 'true' || body.confirm === true,
  }, req.file);
  res.status(201).json(result);
});

router.get('/file', async (req, res) => {
  const acc = await svc.getOwnFile(req.applicantId);
  if (!(await storage.exists(acc.storage_key))) throw notFound('Dosya bulunamadı');
  res.set({
    'Content-Type': acc.mime,
    'Content-Length': acc.size_bytes,
    'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(acc.original_name)}`,
    'Cache-Control': 'private, no-store',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'X-Content-Type-Options': 'nosniff',
  });
  storage.createReadStream(acc.storage_key).pipe(res);
});

module.exports = router;
