/**
 * Nitelikli bursiyer: kesinleşen bursiyerler arasından personelin elle işaretlediği kişiler.
 * İşaret kaldırılıp yeniden konabilir; son işlemi yapan ve zamanı tutulur (geçmiş audit_logs'ta).
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('applications', (t) => {
    t.boolean('is_qualified').notNullable().defaultTo(false);
    t.datetime('qualified_at').nullable();
    t.integer('qualified_by').unsigned().nullable().references('admin_users.id');
    t.index(['program_id', 'is_qualified'], 'applications_program_qualified_idx');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('applications', (t) => {
    t.dropForeign(['qualified_by']);
    t.dropIndex(['program_id', 'is_qualified'], 'applications_program_qualified_idx');
    t.dropColumn('qualified_by');
    t.dropColumn('qualified_at');
    t.dropColumn('is_qualified');
  });
};
