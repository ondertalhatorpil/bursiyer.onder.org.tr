/**
 * Lise yurdu -> bağlı lise. Bu yurtlarda konaklayan öğrenci Yurt Konaklama Bursu'nda okul seçmez:
 * il, ilçe ve okul yurdun lisesinden otomatik gelir (sadece sınıf seçilir).
 * Okul MEB kurum koduyla eşlenir (seeds/03_dormitories.js'te de tanımlı).
 */
const SCHOOLS = {
  'Beşiktaş Kız Öğrenci Yurdu': 760904, // Beşiktaş Kız Anadolu İmam Hatip Lisesi
  'Cevizlibağ Kız Öğrenci Yurdu': 762761, // İstanbul Kız Anadolu İmam Hatip Lisesi (Cevizlibağ)
  'Haki Aras Kız Öğrenci Yurdu': 762182, // Şehit Haki Aras Kız Anadolu İmam Hatip Lisesi
};

exports.up = async (knex) => {
  await knex.schema.alterTable('dormitories', (t) => {
    t.integer('school_id').unsigned().nullable().references('schools.id');
  });
  for (const [name, mebCode] of Object.entries(SCHOOLS)) {
    const school = await knex('schools').where({ meb_code: mebCode }).first('id');
    if (school) await knex('dormitories').where({ name }).update({ school_id: school.id });
  }
};

exports.down = async (knex) => {
  await knex.schema.alterTable('dormitories', (t) => {
    t.dropForeign(['school_id']);
    t.dropColumn('school_id');
  });
};
