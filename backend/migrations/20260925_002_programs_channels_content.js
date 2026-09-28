/**
 * Dönem, kategori -> kanal -> alt birim ağacı ve admin panelinden düzenlenen metinler.
 */
const CATEGORIES = ['lise', 'universite', 'yuksek_lisans', 'doktora'];

exports.up = async (knex) => {
  await knex.schema.createTable('programs', (t) => {
    t.increments('id').unsigned();
    t.string('name', 64).notNullable().unique(); // "2026-2027"
    t.string('title', 255).notNullable();
    t.string('tracking_prefix', 16).notNullable(); // "OND-2026"
    t.boolean('is_open').notNullable().defaultTo(false);
    t.datetime('opens_at').nullable();
    t.datetime('closes_at').nullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('channels', (t) => {
    t.increments('id').unsigned();
    t.enu('category', CATEGORIES).notNullable();
    t.string('code', 64).notNullable().unique();
    t.string('name', 255).notNullable();
    t.text('description').nullable(); // ör. WONDER açıklaması
    // Kanal seçilince açılan alanların tanımı (form ve backend doğrulaması buradan üretilir)
    t.json('extra_fields').nullable();
    t.smallint('sort').unsigned().notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.index(['category', 'is_active']);
  });

  await knex.schema.createTable('sub_units', (t) => {
    t.increments('id').unsigned();
    t.integer('channel_id').unsigned().notNullable().references('channels.id');
    t.string('code', 64).notNullable();
    t.string('name', 255).notNullable();
    t.json('extra_fields').nullable(); // ör. yurt seçimi, kulüp lisans no
    t.smallint('sort').unsigned().notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.unique(['channel_id', 'code']);
  });

  // Onay gerektiren, versiyonlu metinler (KVKK, rızalar, YL/Doktora şart beyanı)
  await knex.schema.createTable('consent_texts', (t) => {
    t.increments('id').unsigned();
    t.enu('type', [
      'kvkk',            // KVKK aydınlatma metni + açık rıza
      'sharing',         // protokol kurumları/vakıf/sponsorlarla paylaşım rızası
      'guardian',        // veli açık rızası (18 yaş altı)
      'criminal_record', // adli sicil - özel nitelikli veri açık rızası
      'requirements_yl', // yüksek lisans şartları beyanı
      'requirements_dr', // doktora şartları beyanı
    ]).notNullable();
    t.smallint('version').unsigned().notNullable();
    t.string('label', 500).notNullable(); // onay kutusunun yanındaki cümle
    t.string('title', 255).notNullable();
    t.text('body', 'longtext').nullable(); // metin sonradan girilecek; boşken başvuru açılamaz
    t.boolean('is_active').notNullable().defaultTo(false);
    t.integer('updated_by').unsigned().nullable();
    t.timestamps(true, true);
    t.unique(['type', 'version']);
  });

  // Onay gerektirmeyen ekran metinleri (başarı mesajı, IBAN uyarısı vb.)
  await knex.schema.createTable('content_blocks', (t) => {
    t.string('key', 64).primary();
    t.string('title', 255).notNullable();
    t.text('body', 'longtext').nullable();
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('sms_templates', (t) => {
    t.string('code', 64).primary();
    t.string('name', 255).notNullable();
    t.string('body', 612).notNullable(); // {placeholder} destekli, en fazla 4 SMS boyu
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('sms_templates');
  await knex.schema.dropTableIfExists('content_blocks');
  await knex.schema.dropTableIfExists('consent_texts');
  await knex.schema.dropTableIfExists('sub_units');
  await knex.schema.dropTableIfExists('channels');
  await knex.schema.dropTableIfExists('programs');
};
