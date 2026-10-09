/**
 * Onay kutusu sadece KVKK'da kalır: adli sicil belgesi artık ek rıza istemez.
 * (Paylaşım ve veli rızası kod tarafında kaldırıldı; eski onay kayıtları ve metin sürümleri silinmez.)
 */
exports.up = async (knex) => {
  await knex('document_types').where({ code: 'adli_sicil' }).update({ consent_type: null });
};

exports.down = async (knex) => {
  await knex('document_types').where({ code: 'adli_sicil' }).update({ consent_type: 'criminal_record' });
};
