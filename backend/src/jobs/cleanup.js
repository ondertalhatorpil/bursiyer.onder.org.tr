/**
 * Periyodik temizlik: süresi 24 saatten önce dolmuş OTP kayıtlarını ve süresi dolmuş oturumları siler.
 * (Saatlik sınırlar son 1 saate baktığı için eski kayıtlara ihtiyaç yok.)
 * index.js içinde saatte bir çalıştırılır.
 */
const db = require('../db/knex');
const logger = require('../lib/logger');
const { cleanupSessions } = require('../services/session.service');

async function cleanupOtps() {
  const cutoff = new Date(Date.now() - 24 * 3600 * 1000);
  const deleted = await db('otp_codes').where('expires_at', '<', cutoff).del();
  if (deleted) logger.info(`Temizlik: ${deleted} eski OTP kaydı silindi`);
  return deleted;
}

function startJobs() {
  const run = () => Promise.all([
    cleanupOtps(),
    cleanupSessions().then((n) => n && logger.info(`Temizlik: ${n} süresi dolmuş oturum silindi`)),
  ]).catch((err) => logger.error({ err }, 'Periyodik temizlik başarısız'));
  run();
  return setInterval(run, 60 * 60 * 1000).unref();
}

module.exports = { cleanupOtps, startJobs };
