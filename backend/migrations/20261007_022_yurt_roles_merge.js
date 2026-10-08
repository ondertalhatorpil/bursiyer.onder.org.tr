/**
 * Yurt rolleri mevcut rollerin altına alınır (ayrı rol yok):
 *   Yurt müdürü     = Birim / Dernek Koordinatörü + yetki alanında Yurt Konaklama Bursu > yurt
 *   Yurtlar birimi  = Genel Merkez Değerlendirici + "Yurt Konaklama Bursu" yetkisi (admin_users.yurt_hq)
 * 021'de eklenen dorm_manager / dorm_hq rolleri kaldırılır, bu rollerdeki kullanıcılar dönüştürülür.
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('admin_users', (t) => {
    // Genel Merkez Değerlendirici: tüm yurt başvurularında Yurtlar Biriminin Önerisi'ni verir
    t.boolean('yurt_hq').notNullable().defaultTo(false);
  });

  const role = async (code) => (await knex('admin_roles').where({ code }).first('id'))?.id;
  const [coordinator, gm, dormManager, dormHq] = await Promise.all(
    ['coordinator', 'gm_reviewer', 'dorm_manager', 'dorm_hq'].map(role),
  );
  // Boş veritabanında (ilk kurulum) roller henüz yoktur, seed ekler: dönüştürülecek kullanıcı da yoktur
  if (dormManager && coordinator) {
    await knex('admin_users').where({ role_id: dormManager }).update({ role_id: coordinator });
  }
  if (dormHq && gm) {
    const ids = await knex('admin_users').where({ role_id: dormHq }).pluck('id');
    if (ids.length) {
      await knex('admin_users').whereIn('id', ids).update({ role_id: gm, yurt_hq: true });
      await knex('admin_scopes').whereIn('admin_user_id', ids).del(); // view_all: kapsam kullanılmaz
    }
  }
  // Yurt kapsamında il seçilmez
  await knex('admin_scopes').whereNotNull('dormitory_id').update({ city_id: null, category: 'yurt', channel_id: null, sub_unit_id: null });
  await knex('admin_roles').whereIn('code', ['dorm_manager', 'dorm_hq']).del();
};

exports.down = async (knex) => {
  await knex('admin_roles')
    .insert([{ code: 'dorm_manager', name: 'Yurt Müdürü' }, { code: 'dorm_hq', name: 'Yurtlar Birimi (Genel Merkez)' }])
    .onConflict('code').ignore();
  const hq = await knex('admin_roles').where({ code: 'dorm_hq' }).first('id');
  if (hq) await knex('admin_users').where({ yurt_hq: true }).update({ role_id: hq.id });
  await knex.schema.alterTable('admin_users', (t) => {
    t.dropColumn('yurt_hq');
  });
};
