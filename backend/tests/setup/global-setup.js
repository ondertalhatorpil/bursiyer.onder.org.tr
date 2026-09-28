/**
 * Jest başlamadan önce bir kez çalışır: test veritabanını oluşturur, migration + seed uygular.
 * Veritabanı adı knexfile'daki test ayarından gelir (<DB_NAME>_test).
 */
process.env.NODE_ENV = 'test';
const knex = require('knex');
const knexfile = require('../../knexfile');

module.exports = async () => {
  const cfg = knexfile.test;
  const { database } = cfg.connection;

  const admin = knex({ ...cfg, connection: { ...cfg.connection, database: undefined } });
  await admin.raw(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_turkish_ci`);
  await admin.destroy();

  const db = knex(cfg);
  await db.migrate.latest();
  await db.seed.run();
  await db.destroy();
};
