/**
 * NVİ doğrulaması ve belgelerin otomatik PDF ön kontrolü kaldırıldı; kontrolleri personel yapar.
 *   - applicants.nvi_verified_at sütunu silinir
 *   - başvurulardaki "nvi_unverified" işareti temizlenir
 *   - belgelerdeki otomatik uyarılar (auto_flags, barkod, tarih) ve belge tiplerindeki kontrol ayarları temizlenir
 */
exports.up = async (knex) => {
  if (await knex.schema.hasColumn('applicants', 'nvi_verified_at')) {
    await knex.schema.alterTable('applicants', (t) => t.dropColumn('nvi_verified_at'));
  }

  const rows = await knex('applications').whereNotNull('flags').select('id', 'flags');
  for (const r of rows) {
    const flags = (typeof r.flags === 'string' ? JSON.parse(r.flags) : r.flags) || [];
    if (!flags.includes('nvi_unverified')) continue;
    const rest = flags.filter((f) => f !== 'nvi_unverified');
    await knex('applications').where({ id: r.id }).update({ flags: rest.length ? JSON.stringify(rest) : null });
  }

  await knex('documents').update({ auto_flags: null, barcode_no: null, doc_date: null });
  await knex('document_types').update({ checks: null });
};

exports.down = async (knex) => {
  if (!(await knex.schema.hasColumn('applicants', 'nvi_verified_at'))) {
    await knex.schema.alterTable('applicants', (t) => t.datetime('nvi_verified_at').nullable());
  }
};
