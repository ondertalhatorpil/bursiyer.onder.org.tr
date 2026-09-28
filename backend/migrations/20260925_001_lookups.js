/**
 * Referans (lookup) tabloları: il, ilçe, okul, üniversite, yurt.
 * Hepsi admin panelinden yönetilebilir; koda gömülü liste yoktur.
 */
exports.up = async (knex) => {
  await knex.schema.createTable('cities', (t) => {
    t.tinyint('id').unsigned().primary(); // plaka kodu (1-81)
    t.string('name', 64).notNullable().unique();
  });

  await knex.schema.createTable('districts', (t) => {
    t.increments('id').unsigned();
    t.tinyint('city_id').unsigned().notNullable().references('cities.id');
    t.string('name', 64).notNullable();
    t.unique(['city_id', 'name']);
  });

  await knex.schema.createTable('schools', (t) => {
    t.increments('id').unsigned();
    t.integer('meb_code').unsigned().notNullable().unique(); // MEB kurum kodu
    t.tinyint('city_id').unsigned().notNullable().references('cities.id');
    t.integer('district_id').unsigned().notNullable().references('districts.id');
    t.string('name', 255).notNullable();
    t.enu('type', ['aihl', 'aihlo']).notNullable(); // aihlo: program uygulayan AİHL
    t.string('program_codes', 64).nullable(); // ham "Program/Proje" değeri, ör. FSBSPO
    t.boolean('is_sports').notNullable().defaultTo(false); // SPO
    t.boolean('is_international').notNullable().defaultTo(false); // ULU
    t.boolean('is_active').notNullable().defaultTo(true);
    t.index(['city_id', 'district_id']);
    t.index(['is_sports']);
    t.index(['is_international']);
  });

  await knex.schema.createTable('universities', (t) => {
    t.increments('id').unsigned();
    t.string('name', 255).notNullable().unique();
    t.tinyint('city_id').unsigned().nullable().references('cities.id');
    t.enu('type', ['devlet', 'vakif']).notNullable();
    t.boolean('is_active').notNullable().defaultTo(true);
  });

  await knex.schema.createTable('dormitories', (t) => {
    t.increments('id').unsigned();
    t.string('name', 128).notNullable().unique();
    t.smallint('sort').unsigned().notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('dormitories');
  await knex.schema.dropTableIfExists('universities');
  await knex.schema.dropTableIfExists('schools');
  await knex.schema.dropTableIfExists('districts');
  await knex.schema.dropTableIfExists('cities');
};
