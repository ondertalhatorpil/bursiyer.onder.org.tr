/**
 * Yurt öğrenim düzeyi: lise (ortaöğretim) yurtlarında konaklayanlar Yurt Konaklama Bursu'nda
 * eğitim bilgisi olarak üniversite değil lise bilgilerini (il, ilçe, okul, sınıf) girer.
 * Lise yurtları seeds/03_dormitories.js'te de işaretlidir (seed level'ı günceller).
 */
const LISE = ['Beşiktaş Kız Öğrenci Yurdu', 'Cevizlibağ Kız Öğrenci Yurdu', 'Haki Aras Kız Öğrenci Yurdu'];

exports.up = async (knex) => {
  await knex.schema.alterTable('dormitories', (t) => {
    t.enu('level', ['lise', 'universite']).notNullable().defaultTo('universite');
  });
  await knex('dormitories').whereIn('name', LISE).update({ level: 'lise' });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('dormitories', (t) => {
    t.dropColumn('level');
  });
};
