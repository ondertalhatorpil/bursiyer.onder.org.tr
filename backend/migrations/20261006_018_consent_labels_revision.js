/**
 * KVKK ve paylaşım onay cümleleri revize edildi (kayıt formundaki metinle aynı olmalı).
 * Panelden yayınlamayla aynı kural: en son sürüm onaylandıysa yeni sürüm açılır (başlık ve metin korunur),
 * onaylanmadıysa yerinde güncellenir. Eski onaylar eski sürüme bağlı kalır.
 * Boş veritabanında (ilk kurulum) bir şey yapmaz; metinleri seed ekler.
 */
const LABELS = {
  kvkk: "KVKK Aydınlatma Metni'ni okudum, anladım ve Açık Rıza Beyanı kapsamında kişisel verilerimin işlenmesini onaylıyorum.",
  sharing: "Burs başvuru, değerlendirme ve burs tahsis süreçlerinin yürütülmesi amacıyla; kimlik, iletişim ve eğitim bilgilerimin ÖNDER'in iş birliği içinde bulunduğu protokol kurumları, vakıflar ve sponsor kuruluşlar ile paylaşılmasına açık rıza gösteriyorum.",
};

exports.up = async (knex) => {
  for (const [type, label] of Object.entries(LABELS)) {
    const latest = await knex('consent_texts').where({ type }).orderBy('version', 'desc').first();
    if (!latest || latest.label === label) continue;

    const accepted = Number((await knex('consents').where({ consent_text_id: latest.id }).count({ n: '*' }).first()).n);
    if (accepted === 0) {
      await knex('consent_texts').where({ id: latest.id }).update({ label, updated_at: new Date() });
    } else {
      await knex('consent_texts').where({ type }).update({ is_active: false });
      await knex('consent_texts').insert({
        type, version: latest.version + 1, title: latest.title, label, body: latest.body, is_active: latest.is_active,
      });
    }
  }
};

// Onay kayıtları yeni sürüme bağlanmış olabileceği için geri alınmaz
exports.down = async () => {};
