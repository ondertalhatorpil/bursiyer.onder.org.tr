/**
 * Yüksek lisansta "Akademik Referans Mektubu", doktorada "Akademik Niyet Mektubu" belgeleri.
 * Tanımlar seeds/lib/document-types.js'tedir; seed mevcut veritabanında yeni tip eklemediği için burada eklenir
 * ve tüm tiplerin sırası tanımdaki sıraya göre güncellenir.
 * Boş veritabanında (ilk kurulum) bir şey yapmaz; tipleri seed ekler.
 */
const { DOCUMENT_TYPES, documentTypeRow } = require('../seeds/lib/document-types');

const CODES = ['akademik_referans', 'akademik_niyet'];

exports.up = async (knex) => {
  if (!(await knex('document_types').first('id'))) return;
  const rows = DOCUMENT_TYPES.map(documentTypeRow);
  await knex('document_types').insert(rows.filter((r) => CODES.includes(r.code))).onConflict('code').ignore();
  for (const r of rows) await knex('document_types').where({ code: r.code }).update({ sort: r.sort });
};

exports.down = async (knex) => {
  const ids = await knex('document_types').whereIn('code', CODES).pluck('id');
  if (ids.length && !(await knex('documents').whereIn('document_type_id', ids).first('id'))) {
    await knex('document_types').whereIn('id', ids).del();
  }
};
