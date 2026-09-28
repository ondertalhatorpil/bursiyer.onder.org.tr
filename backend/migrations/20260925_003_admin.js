/**
 * Admin kullanıcıları, roller ve kapsam (koordinatörün hangi başvuruları göreceği).
 */
exports.up = async (knex) => {
  await knex.schema.createTable('admin_roles', (t) => {
    t.increments('id').unsigned();
    t.string('code', 32).notNullable().unique(); // super_admin, gm_reviewer, coordinator, viewer
    t.string('name', 128).notNullable();
  });

  await knex.schema.createTable('admin_users', (t) => {
    t.increments('id').unsigned();
    t.string('email', 191).notNullable().unique();
    t.string('password_hash', 255).notNullable(); // argon2id
    t.string('full_name', 128).notNullable();
    t.string('phone', 12).nullable(); // 905XXXXXXXXX (SMS ile 2. faktör)
    t.integer('role_id').unsigned().notNullable().references('admin_roles.id');
    t.string('totp_secret_enc', 255).nullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.datetime('last_login_at').nullable();
    t.timestamps(true, true);
  });

  // Boş alan = kısıt yok. Ör. {category:'universite', channel_id: ÖNDER Gençlik, sub_unit_id: Tekno Genç}
  // Bir kullanıcıya birden fazla kapsam satırı atanabilir (OR mantığı).
  await knex.schema.createTable('admin_scopes', (t) => {
    t.increments('id').unsigned();
    t.integer('admin_user_id').unsigned().notNullable().references('admin_users.id').onDelete('CASCADE');
    t.enu('category', ['lise', 'universite', 'yuksek_lisans', 'doktora']).nullable();
    t.integer('channel_id').unsigned().nullable().references('channels.id');
    t.integer('sub_unit_id').unsigned().nullable().references('sub_units.id');
    t.tinyint('city_id').unsigned().nullable().references('cities.id');
    t.index(['admin_user_id']);
  });

  // Görüntüleme, dosya indirme, statü değişikliği, export - hepsi loglanır
  await knex.schema.createTable('audit_logs', (t) => {
    t.bigIncrements('id').unsigned();
    t.integer('admin_user_id').unsigned().nullable().references('admin_users.id');
    t.string('action', 64).notNullable(); // application.view, document.download, export.xlsx ...
    t.string('target_type', 32).nullable();
    t.bigInteger('target_id').unsigned().nullable();
    t.json('meta').nullable();
    t.string('ip', 45).nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['target_type', 'target_id']);
    t.index(['admin_user_id', 'created_at']);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('admin_scopes');
  await knex.schema.dropTableIfExists('admin_users');
  await knex.schema.dropTableIfExists('admin_roles');
};
