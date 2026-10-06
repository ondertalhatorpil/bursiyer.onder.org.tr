/**
 * Üniversiteye bağlı fakülte ve bölüm listeleri (seeds/data/universite-fakulte-bolum.json).
 * Başvuruda fakülte ve bölüm ad olarak (education.faculty / department) saklanır;
 * bu tablolar yalnızca seçim listesi ve doğrulama içindir.
 */
exports.up = async (knex) => {
  await knex.schema.createTable('faculties', (t) => {
    t.increments('id').unsigned();
    t.integer('university_id').unsigned().notNullable().references('universities.id').onDelete('CASCADE');
    t.string('name', 255).notNullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.unique(['university_id', 'name']);
  });

  await knex.schema.createTable('departments', (t) => {
    t.increments('id').unsigned();
    t.integer('faculty_id').unsigned().notNullable().references('faculties.id').onDelete('CASCADE');
    t.string('name', 255).notNullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.unique(['faculty_id', 'name']);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('departments');
  await knex.schema.dropTableIfExists('faculties');
};
