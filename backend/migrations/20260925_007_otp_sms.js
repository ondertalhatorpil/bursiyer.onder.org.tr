/**
 * OTP kodları ve SMS gönderim kayıtları (Ekomesaj).
 * OTP kodu düz metin saklanmaz; SMS içeriği de loglanmaz (sadece şablon kodu).
 */
exports.up = async (knex) => {
  await knex.schema.createTable('otp_codes', (t) => {
    t.bigIncrements('id').unsigned();
    t.string('phone', 12).notNullable();
    t.enu('purpose', ['applicant', 'guardian', 'login', 'admin_2fa']).notNullable();
    t.string('subject_ref', 64).nullable(); // ör. applicant id_number_hash / guardian id / admin id
    t.specificType('code_hash', 'char(64)').notNullable(); // HMAC-SHA256(kod)
    t.tinyint('attempts').unsigned().notNullable().defaultTo(0);
    t.tinyint('max_attempts').unsigned().notNullable().defaultTo(3);
    t.datetime('expires_at').notNullable();
    t.datetime('consumed_at').nullable();
    t.string('ip', 45).nullable();
    t.bigInteger('sms_log_id').unsigned().nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['phone', 'purpose', 'created_at']); // rate limit sorguları
    t.index(['ip', 'created_at']);
  });

  await knex.schema.createTable('sms_logs', (t) => {
    t.bigIncrements('id').unsigned();
    t.bigInteger('application_id').unsigned().nullable().references('applications.id').onDelete('SET NULL');
    t.string('phone', 12).notNullable();
    t.string('template_code', 64).notNullable();
    t.string('provider_ref', 64).nullable(); // Ekomesaj paket/mesaj id
    t.enu('status', ['queued', 'sent', 'delivered', 'failed']).notNullable().defaultTo('queued');
    t.string('status_detail', 255).nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.datetime('delivered_at').nullable();
    t.index(['application_id']);
    t.index(['provider_ref']);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('sms_logs');
  await knex.schema.dropTableIfExists('otp_codes');
};
