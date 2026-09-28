/**
 * Sunucuyu başlatır. Açılışta veritabanı bağlantısını kontrol eder,
 * kapanışta (Ctrl+C / docker stop) açık istekleri bitirip bağlantıları kapatır.
 */
const config = require('./config');
const logger = require('./lib/logger');
const db = require('./db/knex');
const app = require('./app');
const { startJobs } = require('./jobs/cleanup');

async function start() {
  try {
    await db.raw('SELECT 1');
  } catch (err) {
    logger.fatal({ err: err.message }, 'Veritabanına bağlanılamadı, .env içindeki DB_* ayarlarını kontrol edin');
    process.exit(1);
  }

  const [, pending] = await db.migrate.list(); // [tamamlanan, bekleyen]
  if (pending.length) {
    logger.warn(`${pending.length} migration çalıştırılmamış: npm run db:migrate`);
  }

  startJobs();

  const server = app.listen(config.port, () => {
    logger.info(`API hazır: http://localhost:${config.port}/api (ortam: ${config.env}, SMS: ${config.sms.driver})`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} alındı, kapatılıyor...`);
    server.close(async () => {
      await db.destroy();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

process.on('unhandledRejection', (err) => {
  logger.error({ err }, 'unhandledRejection');
});

start();
