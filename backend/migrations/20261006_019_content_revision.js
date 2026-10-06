/**
 * Arayüz revizyonu: kanal alanları, belge açıklamaları/kuralları, YL/DR şartları ve başvuru tamamlandı metni.
 *   - Kanal ve belge tanımları panelden düzenlenmediği için seeds/lib'deki güncel tanımla eşitlenir
 *     (kanal adlarına dokunulmaz; alt birim adları ve tüm ek alanlar güncellenir).
 *   - Şartlar sürümlüdür: onaylanmış sürüm varsa yeni sürüm açılır, eski onaylar eski sürüme bağlı kalır.
 *   - Başvuru tamamlandı metni panelden düzenlenebilir: sadece hâlâ ilk kurulumdaki haliyse güncellenir.
 * Boş veritabanında (ilk kurulum) bir şey yapmaz; içerikleri seed ekler.
 */
const { CHANNELS, json } = require('../seeds/lib/channels');
const { DOCUMENT_TYPES } = require('../seeds/lib/document-types');
const { YL_SARTLAR, DR_SARTLAR, REQUIREMENTS_LABEL, SUBMIT_SUCCESS } = require('../seeds/lib/program-texts');

const OLD_SUBMIT_SUCCESS_BODY = 'Başvuru Takip Numaranız: {tracking_no}\nBaşvurunuz ilgili dernek/birim koordinatörlüğü ve Genel Merkez tarafından incelemeye alınmıştır. Değerlendirme sonucunuz SMS ile tarafınıza bildirilecektir. Başvurusu onaylanan adaylardan bir sonraki adımda IBAN bilgileri talep edilecektir.';

const slug = (s) => s
  .toLocaleLowerCase('tr-TR')
  .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
  .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

async function publishConsent(knex, type, { label, body }) {
  const latest = await knex('consent_texts').where({ type }).orderBy('version', 'desc').first();
  if (!latest || (latest.label === label && latest.body === body)) return;
  const accepted = Number((await knex('consents').where({ consent_text_id: latest.id }).count({ n: '*' }).first()).n);
  if (accepted === 0) {
    await knex('consent_texts').where({ id: latest.id }).update({ label, body, updated_at: new Date() });
  } else {
    await knex('consent_texts').where({ type }).update({ is_active: false });
    await knex('consent_texts').insert({
      type, version: latest.version + 1, title: latest.title, label, body, is_active: latest.is_active,
    });
  }
}

exports.up = async (knex) => {
  for (const ch of CHANNELS) {
    const row = await knex('channels').where({ code: ch.code }).first();
    if (!row) continue;
    await knex('channels').where({ id: row.id }).update({ extra_fields: json(ch.extra_fields) });
    for (const u of ch.sub_units || []) {
      await knex('sub_units').where({ channel_id: row.id, code: u.code || slug(u.name) })
        .update({ name: u.name, extra_fields: json(u.extra_fields) });
    }
  }

  for (const d of DOCUMENT_TYPES) {
    await knex('document_types').where({ code: d.code }).update({
      name: d.name,
      description: d.description || null,
      formats: JSON.stringify(d.formats),
      rules: JSON.stringify(d.rules),
      consent_type: d.consent_type || null,
    });
  }

  await publishConsent(knex, 'requirements_yl', { label: REQUIREMENTS_LABEL, body: YL_SARTLAR });
  await publishConsent(knex, 'requirements_dr', { label: REQUIREMENTS_LABEL, body: DR_SARTLAR });

  await knex('content_blocks').where({ key: 'submit_success', body: OLD_SUBMIT_SUCCESS_BODY })
    .update({ ...SUBMIT_SUCCESS, updated_at: new Date() });
};

// İçerik revizyonu; onaylar yeni sürümlere bağlanmış olabileceği için geri alınmaz
exports.down = async () => {};
