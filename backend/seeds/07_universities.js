/**
 * Üniversite listesi (başlangıç verisi).
 * Kaynak: github.com/erhanfirat/turkiye_univertise_listesi_json (YÖK listesinden derlenmiş, 2021).
 * DİKKAT: 2021 sonrası kurulan / adı değişen üniversiteler eksik olabilir. Liste admin panelinden
 * güncellenebilir; listede olmayan üniversite için adaylar "Diğer" seçeneğini kullanır.
 * Sadece eksik olanları ekler, mevcut kayıtları ezmez.
 */
const universities = require('./data/universities.json');

exports.seed = async (knex) => {
  const cities = await knex('cities').select('id', 'name');
  const cityId = new Map(cities.map((c) => [c.name, c.id]));
  await knex('universities').insert(universities.map((u) => ({
    name: u.name,
    city_id: cityId.get(u.city) || null,
    type: u.type,
  }))).onConflict('name').ignore();
};
