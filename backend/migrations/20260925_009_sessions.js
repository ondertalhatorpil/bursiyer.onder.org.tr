/**
 * Oturumlar (aday ve admin). Cookie'de rastgele token, DB'de sadece HMAC özeti tutulur.
 * Çıkış yapınca / süre dolunca satır silinir; admin bir adayın oturumunu kapatabilir.
 */
exports.up = async (knex) => {
  await knex.schema.createTable('sessions', (t) => {
    t.specificType('id', 'char(64)').primary(); // HMAC(token)
    t.enu('subject_type', ['applicant', 'admin']).notNullable();
    t.bigInteger('subject_id').unsigned().notNullable();
    t.datetime('created_at').notNullable();
    t.datetime('last_seen_at').notNullable();
    t.datetime('expires_at').notNullable(); // mutlak son geçerlilik
    t.string('ip', 45).nullable();
    t.string('user_agent', 512).nullable();
    t.index(['subject_type', 'subject_id']);
    t.index(['expires_at']);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('sessions');
};
