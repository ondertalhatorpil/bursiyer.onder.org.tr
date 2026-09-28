/** 81 il + 973 ilçe. Kaynak: turkey-neighbourhoods (MIT) paketinden alınan statik JSON. */
const cityList = require('./data/cityList.json');
const districtsByCity = require('./data/districtsByCityCode.json');

exports.seed = async (knex) => {
  await knex('cities')
    .insert(cityList.map((c) => ({ id: Number(c.code), name: c.name })))
    .onConflict('id').merge(['name']);

  const districts = Object.entries(districtsByCity).flatMap(([code, names]) =>
    names.map((name) => ({ city_id: Number(code), name })));

  for (let i = 0; i < districts.length; i += 500) {
    await knex('districts').insert(districts.slice(i, i + 500)).onConflict(['city_id', 'name']).ignore();
  }
};
