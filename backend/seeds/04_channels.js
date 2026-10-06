/**
 * Kategori -> kanal -> alt birim ağacı (Adım 4). Tanımlar seeds/lib/channels.js'tedir.
 * Sadece eksikleri ekler, mevcut kayıtları ezmez; tanım değişiklikleri mevcut veritabanına migration ile taşınır.
 */
const { CHANNELS, subUnitRow, json } = require('./lib/channels');

exports.seed = async (knex) => {
  for (const ch of CHANNELS) {
    await knex('channels').insert({
      category: ch.category,
      code: ch.code,
      name: ch.name,
      description: ch.description || null,
      extra_fields: json(ch.extra_fields),
      sort: ch.sort,
    }).onConflict('code').ignore();

    if (!ch.sub_units) continue;
    const { id: channelId } = await knex('channels').where({ code: ch.code }).first('id');
    await knex('sub_units').insert(ch.sub_units.map((u, i) => subUnitRow(channelId, u, i)))
      .onConflict(['channel_id', 'code']).ignore();
  }
};
