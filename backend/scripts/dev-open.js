/**
 * SADECE GELİŞTİRME: dönemi başvuruya açar ve boş KVKK/rıza metinlerine geçici metin koyar,
 * böylece form uçtan uca denenebilir. Canlıda bu işler admin panelinden yapılır.
 *   npm run dev:open
 */
const config = require('../src/config');
const db = require('../src/db/knex');

(async () => {
  if (config.isProd) {
    console.error('Bu script production ortamında çalıştırılamaz.');
    process.exit(1);
  }
  await db('programs').update({ is_open: true, opens_at: null, closes_at: null });
  const n = await db('consent_texts').whereNull('body')
    .update({ body: '[GELİŞTİRME] Bu metin admin panelinden girilecektir.', is_active: true });
  console.log(`Dönem açıldı. Geçici metin konan onay metni: ${n}`);
  await db.destroy();
})();
