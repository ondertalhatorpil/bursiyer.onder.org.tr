/**
 * Burs veren firmalar ve bursiyer-firma eşleşmesi.
 * Bir bursiyere 0..n firma atanabilir; hiç firma yoksa bursu Genel Merkez verir.
 * Bursu bırakan firma silinmez, pasife alınır (geçmiş eşleşmeler korunur).
 */
exports.up = async (knex) => {
  await knex.schema.createTable('sponsors', (t) => {
    t.increments('id').primary();
    t.string('name', 160).notNullable().unique();
    t.date('started_at').nullable();
    t.date('ended_at').nullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.string('contact_name', 120).nullable();
    t.string('contact_phone', 20).nullable();
    t.string('contact_email', 160).nullable();
    t.string('website', 255).nullable();
    t.text('notes').nullable();
    t.string('logo_key', 64).nullable();
    t.string('logo_mime', 32).nullable();
    t.integer('created_by').unsigned().nullable().references('admin_users.id');
    t.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    t.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('application_sponsors', (t) => {
    t.bigInteger('application_id').unsigned().notNullable().references('applications.id').onDelete('CASCADE');
    t.integer('sponsor_id').unsigned().notNullable().references('sponsors.id');
    t.integer('assigned_by').unsigned().nullable().references('admin_users.id');
    t.datetime('assigned_at').notNullable().defaultTo(knex.fn.now());
    t.primary(['application_id', 'sponsor_id']);
    t.index(['sponsor_id']);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('application_sponsors');
  await knex.schema.dropTableIfExists('sponsors');
};
