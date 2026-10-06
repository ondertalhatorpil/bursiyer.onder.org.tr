/**
 * Üniversite -> fakülte -> bölüm listesi (seeds/data/universite-fakulte-bolum.json).
 * Üniversiteler 07_universities ile eklenir; burada ada göre eşleşir, eşleşmeyen olursa hata verir.
 * Eksikleri ekler; dosyada artık bulunmayan fakülte/bölümler pasife alınır (silinmez).
 */
const universities = require('./lib/university-data');
// Tablolar utf8mb4_turkish_ci: büyük/küçük harf farkı aynı kayıt sayılır
const key = (universityId, name) => `${universityId}|${name.toLocaleLowerCase('tr-TR')}`;

async function insertChunks(knex, table, rows, keys) {
  for (let i = 0; i < rows.length; i += 500) {
    await knex(table).insert(rows.slice(i, i + 500)).onConflict(keys).merge(['is_active']);
  }
}

exports.seed = async (knex) => {
  const universityId = new Map((await knex('universities').select('id', 'name')).map((u) => [u.name, u.id]));
  const missing = universities.map((u) => u.name).filter((name) => !universityId.has(name));
  if (missing.length) throw new Error(`Üniversite bulunamadı (universities.json ile aynı ad olmalı): ${missing.join(', ')}`);

  await knex.transaction(async (trx) => {
    await trx('departments').update({ is_active: false });
    await trx('faculties').update({ is_active: false });

    await insertChunks(trx, 'faculties', universities.flatMap((u) => u.faculties.map((f) => ({
      university_id: universityId.get(u.name),
      name: f.name,
      is_active: true,
    }))), ['university_id', 'name']);

    const facultyId = new Map((await trx('faculties').select('id', 'university_id', 'name'))
      .map((f) => [key(f.university_id, f.name), f.id]));

    await insertChunks(trx, 'departments', universities.flatMap((u) => u.faculties.flatMap((f) => {
      const id = facultyId.get(key(universityId.get(u.name), f.name));
      if (!id) throw new Error(`Fakülte eklenemedi: ${u.name} / ${f.name}`);
      return f.departments.map((name) => ({ faculty_id: id, name, is_active: true }));
    })), ['faculty_id', 'name']);
  });
};
