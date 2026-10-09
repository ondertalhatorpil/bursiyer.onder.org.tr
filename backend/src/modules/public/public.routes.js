/**
 * /api/public  (oturum gerektirmez, 5 dk önbelleklenebilir)
 *   GET /config                       herkese açık ayarlar (Turnstile site anahtarı)
 *   GET /program                      dönem açık mı, başlık, tarihler
 *   GET /consents/:type               KVKK / rıza / şart metinleri (aktif versiyon)
 *   GET /content/:key                 ekran metinleri (ör. submit_success)
 *   GET /cities                       81 il
 *   GET /cities/:cityId/districts     ilçeler
 *   GET /schools?cityId&districtId&type=sports|international&q
 *   GET /universities?cityId&q
 *   GET /universities/:universityId/faculties   fakülteler + bölümleri
 *   GET /countries                    uyruk seçimi için ülke adları
 *   GET /dormitories
 *   GET /channels?category=lise|universite|yuksek_lisans|doktora   kanal + alt birim + ek alan tanımları
 */
const { Router } = require('express');
const { validate } = require('../../middlewares/validate');
const schema = require('./public.schema');
const c = require('./public.controller');

const router = Router();

router.use((req, res, next) => {
  res.set('Cache-Control', 'public, max-age=300');
  next();
});

router.get('/config', c.siteConfig);
router.get('/program', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); }, c.program);
// Panelden düzenlenen metinler: tarayıcı her seferinde güncelliğini sorar (değişiklik hemen yansır)
const revalidate = (req, res, next) => { res.set('Cache-Control', 'no-cache'); next(); };
router.get('/consents/:type', revalidate, validate({ params: schema.consentParams }), c.consent);
router.get('/content/:key', revalidate, validate({ params: schema.contentParams }), c.content);
router.get('/cities', c.cities);
router.get('/cities/:cityId/districts', validate({ params: schema.cityParams }), c.districts);
router.get('/schools', validate({ query: schema.schoolsQuery }), c.schools);
router.get('/universities', validate({ query: schema.universitiesQuery }), c.universities);
router.get('/universities/:universityId/faculties', validate({ params: schema.universityParams }), c.faculties);
router.get('/countries', c.countries);
router.get('/dormitories', c.dormitories);
router.get('/channels', validate({ query: schema.channelsQuery }), c.channels);

module.exports = router;
