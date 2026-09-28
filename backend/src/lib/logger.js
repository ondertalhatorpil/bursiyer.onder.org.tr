/**
 * pino logger. Kişisel veriler loga yazılmaz: aşağıdaki alanlar otomatik maskelenir.
 * Geliştirmede okunaklı çıktı için: npm run dev | npx pino-pretty
 */
const pino = require('pino');
const config = require('../config');

const logger = pino({
  level: config.isTest ? 'silent' : config.logLevel,
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'res.headers["set-cookie"]',
      '*.idNumber', '*.id_number', '*.phone', '*.code', '*.iban', '*.password',
    ],
    censor: '[gizli]',
  },
});

module.exports = logger;
