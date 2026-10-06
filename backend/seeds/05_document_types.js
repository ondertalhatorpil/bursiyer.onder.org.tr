/**
 * Belge matrisi (şartname Bölüm 4). Tanımlar seeds/lib/document-types.js'tedir.
 * Sadece eksikleri ekler, mevcut kayıtları ezmez; tanım değişiklikleri mevcut veritabanına migration ile taşınır.
 */
const { DOCUMENT_TYPES, documentTypeRow } = require('./lib/document-types');

exports.seed = async (knex) => {
  await knex('document_types').insert(DOCUMENT_TYPES.map(documentTypeRow)).onConflict('code').ignore();
};
