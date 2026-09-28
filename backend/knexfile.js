require('dotenv').config({ quiet: true });
const path = require('path');

// Testler ayrı veritabanında çalışır (varsayılan: <DB_NAME>_test), geliştirme verisine dokunmaz.
const database = process.env.NODE_ENV === 'test'
  ? (process.env.DB_NAME_TEST || `${process.env.DB_NAME}_test`)
  : process.env.DB_NAME;

const base = {
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database,
    // charset verilmez: tablolar veritabanının varsayılanını (utf8mb4_turkish_ci) devralır
    timezone: 'Z', // tarihler DB'de UTC tutulur
    dateStrings: ['DATE'], // doğum tarihi gibi DATE alanları string gelir (saat dilimi kayması olmaz)
  },
  pool: { min: 0, max: 10 },
  migrations: { directory: path.join(__dirname, 'migrations'), tableName: 'knex_migrations' },
  seeds: { directory: path.join(__dirname, 'seeds') },
};

module.exports = {
  development: base,
  test: base,
  production: { ...base, pool: { min: 2, max: 20 } },
};
