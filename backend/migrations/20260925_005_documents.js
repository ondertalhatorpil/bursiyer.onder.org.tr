/**
 * Belge tipleri (kural tabanlı, panelden yönetilir) ve yüklenen belgeler.
 *
 * document_types.rules: sırayla değerlendirilir, ilk eşleşen kural geçerlidir,
 * hiçbiri eşleşmezse belge o adaya gösterilmez.
 *   [{ "when": { "category": [...], "idType": ["TC"|"YKN"], "grade": [...],
 *                "gradeNot": [...], "minAge": 18 }, "required": true|false }]
 */
exports.up = async (knex) => {
  await knex.schema.createTable('document_types', (t) => {
    t.increments('id').unsigned();
    t.string('code', 64).notNullable().unique();
    t.string('name', 255).notNullable();
    t.string('description', 1000).nullable(); // adaya gösterilen kriter metni
    t.json('formats').notNullable(); // ["pdf"] | ["pdf","jpg","png"] | ["jpg","png"]
    t.tinyint('max_mb').unsigned().notNullable().defaultTo(5);
    t.json('rules').notNullable();
    t.json('checks').nullable(); // otomatik ön kontrol: {"maxAgeDays":15,"mustContain":["Aktif"]}
    t.string('consent_type', 32).nullable(); // yüklemeden önce istenecek ek rıza (criminal_record)
    t.smallint('sort').unsigned().notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
  });

  await knex.schema.createTable('documents', (t) => {
    t.bigIncrements('id').unsigned();
    t.uuid('public_id').notNullable().unique();
    t.bigInteger('application_id').unsigned().notNullable().references('applications.id').onDelete('CASCADE');
    t.integer('document_type_id').unsigned().notNullable().references('document_types.id');
    t.string('storage_key', 255).notNullable(); // UPLOAD_DIR altındaki göreli yol (<yıl>/<uuid>.pdf)
    t.string('original_name', 255).notNullable();
    t.string('mime', 64).notNullable();
    t.integer('size_bytes').unsigned().notNullable();
    t.specificType('sha256', 'char(64)').notNullable();
    t.string('barcode_no', 64).nullable(); // PDF'ten okunan e-Devlet barkodu
    t.date('doc_date').nullable(); // PDF'ten okunan belge tarihi
    t.json('auto_flags').nullable(); // ["older_than_15_days","missing_active_text"]
    t.enu('review_status', ['pending', 'accepted', 'revision_requested', 'rejected']).notNullable().defaultTo('pending');
    t.string('review_note', 1000).nullable(); // revize gerekçesi (adaya gösterilir)
    t.integer('reviewed_by').unsigned().nullable().references('admin_users.id');
    t.datetime('reviewed_at').nullable();
    t.boolean('is_current').notNullable().defaultTo(true); // yeni yükleme eskiyi arşivler
    t.timestamp('uploaded_at').notNullable().defaultTo(knex.fn.now());
    t.index(['application_id', 'document_type_id', 'is_current']);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('documents');
  await knex.schema.dropTableIfExists('document_types');
};
