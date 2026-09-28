/**
 * Oturum yönetimi. Cookie'de 32 byte rastgele token, DB'de HMAC özeti (sessions.id) tutulur.
 * DB sızsa bile tokenlar kullanılamaz; çıkışta/süre dolunca satır silinir.
 *   - Hareketsizlik süresi (SESSION_IDLE_MIN) dolarsa oturum düşer
 *   - Mutlak süre (SESSION_MAX_MIN) dolarsa oturum düşer
 */
const db = require('../db/knex');
const config = require('../config');
const { hmac, randomToken } = require('../lib/crypto');

const TOUCH_EVERY_MS = 60 * 1000; // last_seen_at'i en fazla dakikada bir güncelle

// Aday ve admin ayrı cookie kullanır (aynı tarayıcıda ikisi birden açık olabilir)
const cookieNameFor = (subjectType) => (subjectType === 'admin' ? 'bk_admin' : config.session.cookieName);

function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.session.secureCookie,
    sameSite: 'lax',
    path: '/api',
  };
}

async function createSession(res, { subjectType, subjectId, ip, userAgent }) {
  const token = randomToken(32);
  const now = new Date();
  await db('sessions').insert({
    id: hmac(`session|${token}`),
    subject_type: subjectType,
    subject_id: subjectId,
    created_at: now,
    last_seen_at: now,
    expires_at: new Date(now.getTime() + config.session.maxMs),
    ip,
    user_agent: userAgent ? String(userAgent).slice(0, 512) : null,
  });
  res.cookie(cookieNameFor(subjectType), token, cookieOptions());
}

/** Cookie'deki token'a karşılık gelen geçerli oturumu döndürür (yoksa null). */
async function readSession(req, subjectType) {
  const token = req.cookies?.[cookieNameFor(subjectType)];
  if (!token || typeof token !== 'string' || token.length > 100) return null;

  const id = hmac(`session|${token}`);
  const session = await db('sessions').where({ id, subject_type: subjectType }).first();
  if (!session) return null;

  const now = Date.now();
  const idleExpired = now - new Date(session.last_seen_at).getTime() > config.session.idleMs;
  const hardExpired = now > new Date(session.expires_at).getTime();
  if (idleExpired || hardExpired) {
    await db('sessions').where({ id }).del();
    return null;
  }

  if (now - new Date(session.last_seen_at).getTime() > TOUCH_EVERY_MS) {
    await db('sessions').where({ id }).update({ last_seen_at: new Date(now) });
  }
  return session;
}

async function destroySession(req, res, subjectType = 'applicant') {
  const name = cookieNameFor(subjectType);
  const token = req.cookies?.[name];
  if (token && typeof token === 'string') {
    await db('sessions').where({ id: hmac(`session|${token}`), subject_type: subjectType }).del();
  }
  res.clearCookie(name, cookieOptions());
}

/** Bir kişinin tüm oturumlarını kapatır (ör. admin müdahalesi). */
async function destroyAllFor(subjectType, subjectId) {
  return db('sessions').where({ subject_type: subjectType, subject_id: subjectId }).del();
}

async function cleanupSessions() {
  const idleCutoff = new Date(Date.now() - config.session.idleMs);
  return db('sessions')
    .where('expires_at', '<', new Date())
    .orWhere('last_seen_at', '<', idleCutoff)
    .del();
}

module.exports = { createSession, readSession, destroySession, destroyAllFor, cleanupSessions };
