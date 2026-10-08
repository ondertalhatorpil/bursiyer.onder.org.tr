/**
 * seeds/data/universite-fakulte-bolum.json'u seed'lerin kullanacağı biçime getirir:
 * boşlukları toparlar, kaynak dosyadaki yazım hatalı üniversite adlarını düzeltir ve
 * türü ("tur": "Devlet" / "Özel (Vakıf)") devlet / vakif olarak çevirir.
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

/** "Devlet" -> devlet, "Özel (Vakıf)" -> vakif; tanınmayan değer null (seed hata verir) */
function toType(tur) {
  const t = clean(tur || '').toLocaleLowerCase('tr-TR');
  if (t === 'devlet') return 'devlet';
  if (t.includes('vakıf') || t.includes('özel')) return 'vakif';
  return null;
}

/** [{ name, city, type, faculties: [{ name, departments: [name] }] }] */
module.exports = source.map((u) => {
  const name = clean(u.universite);
  return {
    name: NAME_FIXES[name] || name,
    city: clean(u.sehir),
    type: toType(u.tur),
    faculties: u.fakulteler.map((f) => ({ name: clean(f.fakulte), departments: f.bolumler.map(clean) })),
  };
});
