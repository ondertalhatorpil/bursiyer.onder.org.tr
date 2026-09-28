const { AppError } = require('../lib/errors');
const logger = require('../lib/logger');

/** Tanımsız route'lar */
function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Adres bulunamadı' } });
}

/** Tüm hatalar buraya düşer (Express 5 async hataları da otomatik iletir). */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.details && { details: err.details }) },
    });
  }

  // Bozuk JSON gövdesi
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_JSON', message: 'İstek gövdesi geçerli JSON değil' } });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'İstek çok büyük' } });
  }

  (req.log || logger).error({ err }, 'Beklenmeyen hata');
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Beklenmeyen bir hata oluştu' } });
}

module.exports = { notFoundHandler, errorHandler };
