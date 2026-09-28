/**
 * Tek dosya yükleme (multipart/form-data, alan adı: "file").
 * Dosya belleğe alınır (en fazla 5 MB), diske ancak tüm kontrollerden sonra yazılır.
 * Belge tipine özel boyut/format kontrolü document.service'te yapılır.
 */
const multer = require('multer');
const { AppError } = require('../lib/errors');

const MAX_BYTES = 5 * 1024 * 1024;

const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1, fields: 5, fieldSize: 1024 },
}).single('file');

function uploadSingle(req, res, next) {
  parser(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return next(new AppError(413, 'FILE_TOO_LARGE', 'Dosya en fazla 5 MB olabilir'));
    if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
      return next(new AppError(400, 'BAD_UPLOAD', 'Tek dosya, "file" alanıyla gönderilmeli'));
    }
    return next(new AppError(400, 'BAD_UPLOAD', 'Dosya yüklenemedi'));
  });
}

module.exports = { uploadSingle, MAX_BYTES };
