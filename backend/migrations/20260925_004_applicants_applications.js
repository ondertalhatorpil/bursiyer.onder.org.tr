/**
 * Aday (kişi, dönemden bağımsız) ve başvuru (dönem bazlı) tabloları.
 */
const STATUSES = [
  'draft',              // Taslak
  'submitted',          // Başvuru Tamamlandı
  'in_review',          // İncelemede
  'revision_requested', // Revize İstendi
  'rejected',           // Reddedildi
  'approved',           // Onaylandı
  'iban_pending',       // IBAN Bekleniyor  (faz 2)
  'finalized',          // Kesinleşti - Aktif Bursiyer (faz 2)
];

exports.up = async (knex) => {
  await knex.schema.createTable('applicants', (t) => {
    t.bigIncrements('id').unsigned();
    t.enu('id_type', ['TC', 'YKN']).notNullable(); // 99 ile başlıyorsa YKN
    t.string('id_number_enc', 255).notNullable(); // AES-256-GCM
    t.specificType('id_number_hash', 'char(64)').notNullable().unique(); // HMAC-SHA256, arama + tekillik
    t.string('first_name', 64).notNullable();
    t.string('last_name', 64).notNullable();
    t.date('birth_date').notNullable();
    t.string('nationality', 64).nullable(); // YKN'de zorunlu
    t.string('phone', 12).notNullable(); // 905XXXXXXXXX
    t.string('email', 191).notNullable();
    t.datetime('phone_verified_at').nullable();
    t.datetime('nvi_verified_at').nullable(); // KPSPublic doğrulaması
    t.timestamps(true, true);
    t.index(['phone']);
    t.index(['last_name', 'first_name']);
  });

  await knex.schema.createTable('applications', (t) => {
    t.bigIncrements('id').unsigned();
    t.uuid('public_id').notNullable().unique(); // URL/API'de kullanılan kimlik
    t.integer('program_id').unsigned().notNullable().references('programs.id');
    t.bigInteger('applicant_id').unsigned().notNullable().references('applicants.id');
    t.string('tracking_no', 24).nullable().unique(); // OND-2026-XXXXX, gönderimde üretilir
    t.enu('category', ['lise', 'universite', 'yuksek_lisans', 'doktora']).nullable();
    t.integer('channel_id').unsigned().nullable().references('channels.id');
    t.integer('sub_unit_id').unsigned().nullable().references('sub_units.id');
    t.enu('status', STATUSES).notNullable().defaultTo('draft');
    t.tinyint('current_step').unsigned().notNullable().defaultTo(3); // OTP sonrası Adım 3
    t.boolean('is_minor').nullable(); // başvuru anındaki yaşa göre, backend hesaplar
    t.tinyint('age_at_submit').unsigned().nullable();
    t.json('flags').nullable(); // ör. ["birth_year_out_of_range","school_not_in_list"]
    t.datetime('reference_verified_at').nullable(); // manuel referans teyidi
    t.integer('reference_verified_by').unsigned().nullable().references('admin_users.id');
    t.string('rejection_reason', 1000).nullable();
    t.datetime('submitted_at').nullable();
    t.datetime('decided_at').nullable();
    t.timestamps(true, true);
    t.unique(['program_id', 'applicant_id']); // dönem başına tek başvuru
    t.index(['program_id', 'status']);
    t.index(['program_id', 'category', 'channel_id', 'sub_unit_id']);
  });

  // Kanal/alt birime özel alanlar (referans adı, branş, yurt, bölge, lisans no ...)
  // Şema channels.extra_fields / sub_units.extra_fields'tan gelir, backend zod ile doğrular.
  await knex.schema.createTable('application_details', (t) => {
    t.bigInteger('application_id').unsigned().primary().references('applications.id').onDelete('CASCADE');
    t.json('data').notNullable();
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // 18 yaş altı adaylar (kategori fark etmeksizin)
  await knex.schema.createTable('guardians', (t) => {
    t.bigIncrements('id').unsigned();
    t.bigInteger('application_id').unsigned().notNullable().unique().references('applications.id').onDelete('CASCADE');
    t.string('full_name', 128).notNullable();
    t.enu('id_type', ['TC', 'YKN', 'PASAPORT']).notNullable();
    t.string('id_number_enc', 255).notNullable();
    t.string('phone', 12).notNullable(); // adayın numarasıyla aynı olamaz (backend kontrolü)
    t.datetime('phone_verified_at').nullable();
    t.timestamps(true, true);
  });

  // Adım 5
  await knex.schema.createTable('education', (t) => {
    t.bigInteger('application_id').unsigned().primary().references('applications.id').onDelete('CASCADE');
    t.tinyint('city_id').unsigned().nullable().references('cities.id');
    t.integer('district_id').unsigned().nullable().references('districts.id'); // lise
    t.integer('school_id').unsigned().nullable().references('schools.id'); // lise, listeden
    t.string('school_other', 255).nullable(); // lise, "Diğer"
    t.integer('university_id').unsigned().nullable().references('universities.id');
    t.string('university_other', 255).nullable(); // üniversite, "Diğer"
    t.enu('university_type', ['devlet', 'vakif']).nullable(); // listeden otomatik, "Diğer"de aday seçer
    t.string('faculty', 255).nullable();
    t.string('department', 255).nullable();
    // lise: hazirlik,9,10,11,12 | üni: hazirlik,1..6 | yl | dr
    t.enu('grade', ['hazirlik', '1', '2', '3', '4', '5', '6', '9', '10', '11', '12', 'yl', 'dr']).nullable();
    t.enu('fall_registration', ['completed', 'pending']).nullable(); // sadece vakıf
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    t.index(['school_id']);
    t.index(['university_id']);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('education');
  await knex.schema.dropTableIfExists('guardians');
  await knex.schema.dropTableIfExists('application_details');
  await knex.schema.dropTableIfExists('applications');
  await knex.schema.dropTableIfExists('applicants');
};

