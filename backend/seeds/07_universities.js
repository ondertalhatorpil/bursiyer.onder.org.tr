/**
 * Üniversite listesi. Ad ve il seeds/data/universite-fakulte-bolum.json'dan (seeds/lib/university-data.js),
 * tür (devlet/vakıf) seeds/data/universities.json'dan gelir.
 *   - Adı değişen üniversiteler (RENAMED) yerinde güncellenir, böylece bağlı başvuruların university_id'si korunur.
 *   - İl her çalıştırmada dosyadan güncellenir; mevcut kayıtların türü ezilmez.
 *   - Listede olmayan üniversiteler pasife alınır (silinmez, eski başvurular bağlı olabilir).
 *     Listede olmayan üniversite için adaylar "Diğer" seçeneğini kullanır.
 */
const universities = require('./lib/university-data');
const types = new Map(require('./data/universities.json').map((u) => [u.name, u.type]));

// eski ad -> yeni ad
const RENAMED = {
  'Abant İzzet Baysal Üniversitesi': 'Bolu Abant İzzet Baysal Üniversitesi',
  'Adana Bilim ve Teknoloji Üniversitesi': 'Adana Alparslan Türkeş Bilim ve Teknoloji Üniversitesi',
  'Adnan Menderes Üniversitesi': 'Aydın Adnan Menderes Üniversitesi',
  'Ahi Evran Üniversitesi': 'Kırşehir Ahi Evran Üniversitesi',
  'Akev Üniversitesi': 'Antalya Akev Üniversitesi',
  'Bezmiâlem Vakıf Üniversitesi': 'Bezm-i Alem Vakıf Üniversitesi',
  'Bozok Üniversitesi': 'Yozgat Bozok Üniversitesi',
  'Bülent Ecevit Üniversitesi': 'Zonguldak Bülent Ecevit Üniversitesi',
  'Celal Bayar Üniversitesi': 'Manisa Celal Bayar Üniversitesi',
  'Cumhuriyet Üniversitesi': 'Sivas Cumhuriyet Üniversitesi',
  'Dumlupınar Üniversitesi': 'Kütahya Dumlupınar Üniversitesi',
  'Erzincan Üniversitesi': 'Erzincan Binali Yıldırım Üniversitesi',
  'Fatih Sultan Mehmet Üniversitesi': 'Fatih Sultan Mehmet Vakıf Üniversitesi',
  'Gaziosmanpaşa Üniversitesi': 'Tokat Gaziosmanpaşa Üniversitesi',
  'Gedik Üniversitesi': 'İstanbul Gedik Üniversitesi',
  'İbn-u Haldun Üniversitesi': 'İbn Haldun Üniversitesi',
  'İstanbul Bilim Üniversitesi': 'Demiroğlu Bilim Üniversitesi',
  'İstanbul Kemerburgaz Üniversitesi': 'Altınbaş Üniversitesi',
  'İzmir Kâtip Çelebi Üniversitesi': 'İzmir Katip Çelebi Üniversitesi',
  'Karatay Üniversitesi': 'KTO Karatay Üniversitesi',
  'Konya Gıda Tarım Üniversitesi': 'Konya Gıda ve Tarım Üniversitesi',
  'Mehmet Akif Ersoy Üniversitesi': 'Burdur Mehmet Akif Ersoy Üniversitesi',
  'Mustafa Kemal Üniversitesi': 'Hatay Mustafa Kemal Üniversitesi',
  'Namık Kemal Üniversitesi': 'Tekirdağ Namık Kemal Üniversitesi',
  'Niğde Üniversitesi': 'Niğde Ömer Halisdemir Üniversitesi',
  'Okan Üniversitesi': 'İstanbul Okan Üniversitesi',
  'Tunceli Üniversitesi': 'Munzur Üniversitesi',
  'Türk Alman Üniversitesi': 'Türk-Alman Üniversitesi',
  'Uludağ Üniversitesi': 'Bursa Uludağ Üniversitesi',
  'Uluslararası Antalya Üniversitesi': 'Antalya Bilim Üniversitesi',
  'Yeni Yüzyıl Üniversitesi': 'İstanbul Yeni Yüzyıl Üniversitesi',
  'Yıldırım Beyazıt Üniversitesi': 'Ankara Yıldırım Beyazıt Üniversitesi',
  'Yüzüncü Yıl Üniversitesi': 'Van Yüzüncü Yıl Üniversitesi',
};

exports.seed = async (knex) => {
  const existing = new Set((await knex('universities').pluck('name')));
  for (const [from, to] of Object.entries(RENAMED)) {
    if (existing.has(from) && !existing.has(to)) await knex('universities').where({ name: from }).update({ name: to });
  }

  const cityId = new Map((await knex('cities').select('id', 'name')).map((c) => [c.name, c.id]));
  const problems = universities.flatMap((u) => [
    ...(cityId.has(u.city) ? [] : [`${u.name}: "${u.city}" ili bulunamadı`]),
    ...(types.has(u.name) ? [] : [`${u.name}: universities.json'da türü (devlet/vakif) yok`]),
  ]);
  if (problems.length) throw new Error(`Üniversite listesi:\n${problems.join('\n')}`);

  await knex('universities').insert(universities.map((u) => ({
    name: u.name,
    city_id: cityId.get(u.city),
    type: types.get(u.name),
  }))).onConflict('name').merge(['city_id']);

  const names = universities.map((u) => u.name);
  await knex('universities').whereNotIn('name', names).update({ is_active: false });
  await knex('universities').whereIn('name', names).update({ is_active: true });
};
