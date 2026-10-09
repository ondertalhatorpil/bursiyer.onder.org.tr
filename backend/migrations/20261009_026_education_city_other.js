/**
 * Yüksek lisans / doktora eğitim bilgileri serbest metinle girilir (üniversite, enstitü, bölüm, şehir).
 * Yazılan şehir illerden biriyle eşleşirse city_id, eşleşmezse (ör. yurt dışı) city_other dolar.
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('education', (t) => {
    t.string('city_other', 64).nullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('education', (t) => {
    t.dropColumn('city_other');
  });
};
