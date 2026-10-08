/**
 * Yurt Konaklama Bursu değerlendirme zinciri (başvuru formundaki imza kutuları):
 *   Yurt İdaresinin Önerisi   -> yurt müdürü (koordinatör + yetki alanında yurt)
 *   Yurtlar Biriminin Önerisi -> Genel Merkez Değerlendirici + Yurt Konaklama Bursu yetkisi (022)
 *   Burs Komisyonunun Kararı  -> süper admin: nihai aylık burs + onay
 * Yetki alanına yurt eklenir (admin_scopes.dormitory_id).
 * (İlk sürümde burada eklenen ayrı yurt rolleri 022'de kaldırıldı; artık rol eklenmez.)
 */
const ROLES = ['dorm_manager', 'dorm_hq'];

exports.up = async (knex) => {
  await knex.schema.alterTable('admin_scopes', (t) => {
    t.integer('dormitory_id').unsigned().nullable().references('dormitories.id');
  });

  await knex.schema.createTable('yurt_reviews', (t) => {
    t.bigInteger('application_id').unsigned().primary().references('applications.id').onDelete('CASCADE');
    // Yurt idaresi
    t.integer('dorm_amount').unsigned().nullable(); // önerilen aylık burs (TL)
    t.text('dorm_note').nullable();
    t.integer('dorm_by').unsigned().nullable().references('admin_users.id');
    t.datetime('dorm_at').nullable();
    // Yurtlar birimi (Genel Merkez)
    t.integer('hq_amount').unsigned().nullable();
    t.text('hq_note').nullable();
    t.integer('hq_by').unsigned().nullable().references('admin_users.id');
    t.datetime('hq_at').nullable();
    // Süper admin kararı (onayda yazılır)
    t.integer('final_amount').unsigned().nullable();
    t.integer('final_by').unsigned().nullable().references('admin_users.id');
    t.datetime('final_at').nullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('yurt_reviews');
  await knex.schema.alterTable('admin_scopes', (t) => {
    t.dropForeign(['dormitory_id']);
    t.dropColumn('dormitory_id');
  });
  const ids = await knex('admin_roles').whereIn('code', ROLES).pluck('id');
  if (ids.length && !(await knex('admin_users').whereIn('role_id', ids).first())) {
    await knex('admin_roles').whereIn('id', ids).del();
  }
};
