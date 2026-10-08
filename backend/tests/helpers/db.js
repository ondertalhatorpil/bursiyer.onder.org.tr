/**
 * Test yardımcıları (sadece test veritabanında çalışır).
 */
const db = require('../../src/db/knex');

if (!db.client.config.connection.database.endsWith('_test')) {
  throw new Error('Test yardımcıları sadece *_test veritabanında çalıştırılabilir');
}

/** Başvuru verilerini temizler (lookup tablolarına dokunmaz) */
async function resetApplications() {
  for (const t of ['consents', 'status_history', 'application_notes', 'documents', 'yurt_details', 'education',
    'application_details', 'guardians', 'bank_accounts', 'sms_logs', 'applications', 'sessions', 'applicants', 'otp_codes']) {
    await db(t).del();
  }
}

/** Dönemi açar ve KVKK/paylaşım metinlerini yayınlar */
async function openProgram() {
  await db('programs').update({ is_open: true, opens_at: null, closes_at: null });
  await db('consent_texts').whereIn('type', ['kvkk', 'sharing', 'guardian', 'criminal_record'])
    .update({ body: 'Test metni', is_active: true });
}

async function closePrograms() {
  await db('programs').update({ is_open: false });
}

module.exports = { db, resetApplications, openProgram, closePrograms };
