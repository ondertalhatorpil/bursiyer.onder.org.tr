/**
 * YL / Doktora başvuru şartları beyanının zamanı (Adım 4). Beyanın kendisi consents tablosunda.
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('applications', (t) => {
    t.datetime('requirements_accepted_at').nullable().after('sub_unit_id');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('applications', (t) => {
    t.dropColumn('requirements_accepted_at');
  });
};
