/**
 * /api/admin/applications  (admin oturumu gerekli, kapsamla sınırlı)
 *   GET   /                                  liste (filtre + arama + sayfalama)
 *   GET   /export                            aynı filtrelerle Excel
 *   GET   /meta                              kullanıcıya göre filtre seçenekleri + hızlı sekmeler (sayılarıyla)
 *   GET   /:id                               detay
 *   GET   /:id/documents/:documentId/file    belge görüntüleme
 *   PATCH /:id/documents/:documentId         belge inceleme (kabul / revize / beklemede)
 *   POST  /:id/status                        statü değiştir (yurtta onay: finalAmount = Burs Komisyonunun Kararı)
 *   PUT   /:id/yurt-review/:stage            Yurt Konaklama Bursu önerisi: dorm (yurt müdürü) | hq (yurtlar birimi)
 *   POST  /:id/notes                         iç not
 *   POST  /:id/reference                     referans teyidi
 *   POST  /:id/qualified                     nitelikli bursiyer işareti (sadece kesinleşmiş)
 *   PUT   /:id/sponsors                      burs veren firmalar (sadece kesinleşmiş; boş = Genel Merkez)
 *   GET   /payments-export                   ödeme listesi (kesinleşmiş bursiyerler, tam IBAN)
 *   GET   /:id/iban/:accountId/file          IBAN hesap belgesi
 *   POST  /:id/iban/review                   IBAN kontrolü: uygun (kesinleşir) / red (aday yeniden girer)
 */
const { Router } = require('express');
const { validate } = require('../../../middlewares/validate');
const { requirePermission } = require('../../../middlewares/auth-admin');
const schema = require('./applications.schema');
const c = require('./applications.controller');

const router = Router();

router.get('/', validate({ query: schema.filters }), c.list);
router.get('/payments-export', requirePermission('export'), requirePermission('view_full_id'), validate({ query: schema.payments }), c.paymentsExport);
router.get('/export', requirePermission('export'), validate({ query: schema.filters.omit({ page: true, pageSize: true }) }), c.exportXlsx);
router.get('/meta', validate({ query: schema.meta }), c.meta);
router.get('/:id', validate({ params: schema.appParams }), c.detail);
router.put('/:id/yurt-review/:stage', validate({ params: schema.yurtReviewParams, body: schema.yurtReview }), c.setYurtReview);
router.get('/:id/documents/:documentId/file', validate({ params: schema.docParams }), c.file);
router.patch('/:id/documents/:documentId', requirePermission('review'), validate({ params: schema.docParams, body: schema.documentReview }), c.reviewDocument);
router.post('/:id/status', validate({ params: schema.appParams, body: schema.status }), c.setStatus);
router.post('/:id/notes', requirePermission('review'), validate({ params: schema.appParams, body: schema.note }), c.addNote);
router.get('/:id/iban/:accountId/file', validate({ params: schema.ibanParams }), c.ibanFile);
router.post('/:id/iban/review', requirePermission('decide'), validate({ params: schema.appParams, body: schema.ibanReview }), c.reviewIban);
router.post('/:id/reference', requirePermission('review'), validate({ params: schema.appParams, body: schema.reference }), c.setReference);
router.post('/:id/qualified', requirePermission('decide'), validate({ params: schema.appParams, body: schema.qualified }), c.setQualified);
router.put('/:id/sponsors', requirePermission('review'), validate({ params: schema.appParams, body: schema.sponsors }), c.setSponsors);

module.exports = router;
