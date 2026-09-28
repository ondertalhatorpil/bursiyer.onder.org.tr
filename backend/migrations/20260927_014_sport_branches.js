/**
 * Spor liseleri kanalında "Spor Branşı" serbest metin yerine listeden seçilir (aranabilir).
 * Daha önce yazılmış branşlar başvuru verisinde olduğu gibi kalır.
 */
const { sportBranchField } = require('../src/lib/sport-branches');

const OLD = { key: 'sport_branch', type: 'text', label: 'Spor Branşı', required: true, maxLength: 64 };

async function replaceField(knex, field) {
  const ch = await knex('channels').where({ code: 'lise_spor' }).first();
  if (!ch) return;
  const fields = (typeof ch.extra_fields === 'string' ? JSON.parse(ch.extra_fields) : ch.extra_fields) || [];
  const next = fields.map((f) => (f.key === 'sport_branch' ? field : f));
  await knex('channels').where({ id: ch.id }).update({ extra_fields: JSON.stringify(next) });
}

exports.up = (knex) => replaceField(knex, sportBranchField);
exports.down = (knex) => replaceField(knex, OLD);
