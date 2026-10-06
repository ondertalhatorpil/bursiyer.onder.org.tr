/**
 * Referans kontrolleri: formdan gelen id'ler gerçekten var mı ve kısıtlara uyuyor mu?
 * (ör. spor lisesi kanalında seçilen okul gerçekten SPO kodlu mu, ilçe İstanbul'a mı ait)
 */
const db = require('../db/knex');

/**
 * rules.validateExtraFields'in döndürdüğü refs listesini DB'de kontrol eder.
 * @returns {object} hatalar { key: mesaj } (boşsa sorun yok)
 */
async function checkRefs(refs, labels = {}) {
  const errors = {};
  const label = (key) => labels[key] || 'Seçim';

  for (const ref of refs) {
    if (ref.type === 'school') {
      const school = await db('schools').where({ id: ref.id, is_active: true }).first();
      const filterOk = school && Object.entries(ref.filter || {}).every(([k, v]) => Boolean(school[k]) === v);
      if (!filterOk || (ref.cityId && school.city_id !== ref.cityId)) {
        errors[ref.key] = `${label(ref.key)}: listeden geçerli bir okul seçiniz`;
      }
    } else if (ref.type === 'district') {
      const d = await db('districts').where({ id: ref.id }).first();
      if (!d || (ref.cityId && d.city_id !== ref.cityId)) errors[ref.key] = `${label(ref.key)}: geçerli bir ilçe seçiniz`;
    } else if (ref.type === 'city') {
      const c = await db('cities').where({ id: ref.id }).first();
      if (!c || (ref.excludeCityIds || []).includes(c.id)) errors[ref.key] = `${label(ref.key)}: geçerli bir il seçiniz`;
    } else if (ref.type === 'dormitory') {
      const y = await db('dormitories').where({ id: ref.id, is_active: true }).first();
      if (!y) errors[ref.key] = `${label(ref.key)}: geçerli bir yurt seçiniz`;
    }
  }
  return errors;
}

module.exports = { checkRefs };
