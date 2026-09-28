/**
 * KVKK onay kayıtları, statü geçmişi (denetim) ve admin iç notları.
 */
exports.up = async (knex) => {
  await knex.schema.createTable('consents', (t) => {
    t.bigIncrements('id').unsigned();
    t.bigInteger('applicant_id').unsigned().notNullable().references('applicants.id');
    t.bigInteger('application_id').unsigned().nullable().references('applications.id').onDelete('SET NULL');
    t.bigInteger('guardian_id').unsigned().nullable().references('guardians.id').onDelete('SET NULL'); // veli rızası
    t.integer('consent_text_id').unsigned().notNullable().references('consent_texts.id');
    t.datetime('accepted_at').notNullable();
    t.string('ip', 45).notNullable();
    t.string('user_agent', 512).nullable();
    t.index(['applicant_id']);
    t.index(['application_id']);
  });

  await knex.schema.createTable('status_history', (t) => {
    t.bigIncrements('id').unsigned();
    t.bigInteger('application_id').unsigned().notNullable().references('applications.id').onDelete('CASCADE');
    t.string('from_status', 32).nullable();
    t.string('to_status', 32).notNullable();
    t.enu('actor_type', ['system', 'applicant', 'admin']).notNullable();
    t.integer('actor_admin_id').unsigned().nullable().references('admin_users.id');
    t.string('note', 1000).nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['application_id', 'created_at']);
  });

  // Adaya görünmeyen değerlendirme notları (koordinatör -> Genel Merkez)
  await knex.schema.createTable('application_notes', (t) => {
    t.bigIncrements('id').unsigned();
    t.bigInteger('application_id').unsigned().notNullable().references('applications.id').onDelete('CASCADE');
    t.integer('admin_user_id').unsigned().notNullable().references('admin_users.id');
    t.enu('kind', ['note', 'recommend_approve', 'recommend_reject']).notNullable().defaultTo('note');
    t.text('body').notNullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['application_id']);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('application_notes');
  await knex.schema.dropTableIfExists('status_history');
  await knex.schema.dropTableIfExists('consents');
};
