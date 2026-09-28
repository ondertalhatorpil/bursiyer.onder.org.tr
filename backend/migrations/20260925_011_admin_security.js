/**
 * Admin hesap güvenliği: hatalı giriş sayacı, geçici kilit, ilk girişte şifre değiştirme zorunluluğu.
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('admin_users', (t) => {
    t.tinyint('failed_logins').unsigned().notNullable().defaultTo(0).after('totp_secret_enc');
    t.datetime('locked_until').nullable().after('failed_logins');
    t.boolean('must_change_password').notNullable().defaultTo(true).after('locked_until');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('admin_users', (t) => {
    t.dropColumn('must_change_password');
    t.dropColumn('locked_until');
    t.dropColumn('failed_logins');
  });
};
