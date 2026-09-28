/**
 * İmam hatip liseleri. seeds/data/schools.json `npm run import:schools` ile üretilir.
 * Kurum koduna göre upsert yapar; listede olmayan mevcut okullar silinmez (başvurular bağlı olabilir).
 */
const schools = require('./data/schools.json');

exports.seed = async (knex) => {
  const districts = await knex('districts').select('id', 'city_id', 'name');
  const districtId = new Map(districts.map((d) => [`${d.city_id}|${d.name}`, d.id]));

  const rows = schools.map((s) => {
    const id = districtId.get(`${s.city_code}|${s.district}`);
    if (!id) throw new Error(`İlçe bulunamadı: ${s.city_code} ${s.district} (${s.name})`);
    return {
      meb_code: s.meb_code,
      city_id: s.city_code,
      district_id: id,
      name: s.name,
      type: s.type,
      program_codes: s.program_codes,
      is_sports: s.is_sports,
      is_international: s.is_international,
    };
  });

  for (let i = 0; i < rows.length; i += 500) {
    await knex('schools').insert(rows.slice(i, i + 500))
      .onConflict('meb_code')
      .merge(['city_id', 'district_id', 'name', 'type', 'program_codes', 'is_sports', 'is_international']);
  }
};
