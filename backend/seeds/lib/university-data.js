/**
 * seeds/data/universite-fakulte-bolum.json'u seed'lerin kullanacağı biçime getirir:
 * boşlukları toparlar ve kaynak dosyadaki yazım hatalı üniversite adlarını düzeltir.
 * (Bu klasör seed olarak çalıştırılmaz; knex seed klasörünü alt klasörsüz okur.)
 */
const source = require('../data/universite-fakulte-bolum.json');

// kaynak dosyadaki ad -> sistemde görünecek ad
const NAME_FIXES = {
  'İstanbul Sağlık Ve Teknoloji Üniversitesi': 'İstanbul Sağlık ve Teknoloji Üniversitesi',
  'İstanbul Üniversitesi-Cerrahpasa': 'İstanbul Üniversitesi-Cerrahpaşa',
  'Kto Karatay Üniversitesi': 'KTO Karatay Üniversitesi',
  'Mef Üniversitesi': 'MEF Üniversitesi',
  'Ted Üniversitesi': 'TED Üniversitesi',
  'Tobb Ekonomi ve Teknoloji Üniversitesi': 'TOBB Ekonomi ve Teknoloji Üniversitesi',
};

const clean = (s) => String(s).replace(/\s+/g, ' ').trim();

/** [{ name, city, faculties: [{ name, departments: [name] }] }] */
module.exports = source.map((u) => {
  const name = clean(u.universite);
  return {
    name: NAME_FIXES[name] || name,
    city: clean(u.sehir),
    faculties: u.fakulteler.map((f) => ({ name: clean(f.fakulte), departments: f.bolumler.map(clean) })),
  };
});
