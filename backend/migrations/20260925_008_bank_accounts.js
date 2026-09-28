/**
 * FAZ 2 (Adım 8-9) - IBAN kaydı. Tablolar şimdiden oluşturulur, faz 1'de kullanılmaz.
 */
exports.up = async (knex) => {
  await knex.schema.createTable('banks', (t) => {
    t.specificType('code', 'char(5)').primary(); // IBAN 5-9. haneler (EFT kodu)
    t.string('name', 128).notNullable();
    t.boolean('is_active').notNullable().defaultTo(true);
  });

  await knex.schema.createTable('bank_accounts', (t) => {
    t.bigIncrements('id').unsigned();
    t.bigInteger('applicant_id').unsigned().notNullable().references('applicants.id');
    t.bigInteger('application_id').unsigned().notNullable().references('applications.id');
    t.string('iban_enc', 255).notNullable();
    t.specificType('iban_last4', 'char(4)').notNullable(); // panelde maskeli gösterim
    t.specificType('bank_code', 'char(5)').nullable().references('banks.code');
    t.string('holder_name', 128).notNullable(); // sistemden kilitli gelir
    t.boolean('is_guardian_account').notNullable().defaultTo(false);
    t.date('valid_from').notNullable();
    t.date('valid_to').nullable(); // 18'e giren bursiyer kendi IBAN'ını girince eski kayıt kapanır
    t.datetime('verified_at').nullable();
    t.timestamps(true, true);
    t.index(['application_id', 'valid_to']);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('bank_accounts');
  await knex.schema.dropTableIfExists('banks');
};
