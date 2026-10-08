/**
 * Yurt Konaklama Bursu (kategori: yurt). ÖNDER yurtlarında konaklayan öğrenciler başvurur.
 * Akışı diğer kategorilerden farklıdır: kanal ve belge adımı yoktur.
 *   Adım 4 eğitim (+ yurt, özel üniversitede burs oranı ve yıllık ücret) -> education tablosu
 *   Adım 5 aile ve gelir bilgileri, Adım 6 burs bilgileri                -> yurt_details tablosu
 */
const OLD = ['lise', 'universite', 'yuksek_lisans', 'doktora'];
const NEW = [...OLD, 'yurt'];
const PARENT_STATUS = ['sag', 'vefat'];

function parentColumns(t, prefix) {
  t.enu(`${prefix}_status`, PARENT_STATUS).nullable();
  t.string(`${prefix}_name`, 128).nullable();
  t.string(`${prefix}_job`, 128).nullable(); // sağ ise
  t.string(`${prefix}_location`, 128).nullable(); // yaşadığı il ve ilçe, sağ ise
  t.integer(`${prefix}_income`).unsigned().nullable(); // aylık gelir (TL), sağ ise
  t.integer(`${prefix}_extra_income`).unsigned().nullable(); // ek gelir (TL), varsa
}

exports.up = async (knex) => {
  await knex.schema.alterTable('applications', (t) => {
    t.enu('category', NEW).nullable().alter();
  });
  await knex.schema.alterTable('admin_scopes', (t) => {
    t.enu('category', NEW).nullable().alter();
  });

  await knex.schema.alterTable('education', (t) => {
    t.integer('dormitory_id').unsigned().nullable().references('dormitories.id');
    t.tinyint('tuition_scholarship_rate').unsigned().nullable(); // özel üniversite burs oranı: 100, 75, 50, 25
    t.integer('annual_tuition_fee').unsigned().nullable(); // oran %100 değilse ödenen yıllık ücret (TL)
  });

  await knex.schema.createTable('yurt_details', (t) => {
    t.bigInteger('application_id').unsigned().primary().references('applications.id').onDelete('CASCADE');

    // Adım 5: aile ve gelir bilgileri
    t.tinyint('sibling_count').unsigned().nullable(); // kendisi dahil
    t.tinyint('studying_sibling_count').unsigned().nullable(); // kendisi dahil
    t.enu('guardian_housing', ['kira', 'ev_sahibi', 'lojman', 'diger']).nullable(); // velinin yaşadığı yer
    t.string('guardian_housing_note', 255).nullable(); // "Diğer" ise açıklama
    parentColumns(t, 'mother');
    parentColumns(t, 'father');
    t.enu('parents_living', ['birlikte', 'ayri']).nullable(); // ikisi de sağ ise
    t.datetime('family_saved_at').nullable();

    // Adım 6: burs bilgileri
    t.boolean('other_scholarship').nullable();
    t.string('other_scholarship_org', 255).nullable();
    t.integer('other_scholarship_amount').unsigned().nullable();
    t.boolean('gsb_support').nullable(); // GSB beslenme barınma yardımı
    t.enu('kyk_support', ['yok', 'burs', 'kredi']).nullable();
    t.integer('requested_amount').unsigned().nullable(); // talep edilen aylık burs (TL)
    t.text('commission_note').nullable(); // Burs Komisyonuna açıklama
    t.datetime('scholarship_saved_at').nullable();

    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('yurt_details');
  await knex.schema.alterTable('education', (t) => {
    t.dropForeign(['dormitory_id']);
    t.dropColumn('dormitory_id');
    t.dropColumn('tuition_scholarship_rate');
    t.dropColumn('annual_tuition_fee');
  });
  // Yurt kategorisindeki kayıtlar eski enum'a sığmaz
  await knex('admin_scopes').where({ category: 'yurt' }).del();
  await knex('applications').where({ category: 'yurt' }).update({ category: null });
  await knex.schema.alterTable('admin_scopes', (t) => {
    t.enu('category', OLD).nullable().alter();
  });
  await knex.schema.alterTable('applications', (t) => {
    t.enu('category', OLD).nullable().alter();
  });
};
