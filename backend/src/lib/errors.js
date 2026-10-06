/**
 * Uygulama hataları. Controller/servisler bunları fırlatır, error-handler JSON'a çevirir.
 * Yanıt biçimi: { error: { code, message, details? } }
 */
class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const badRequest = (message = 'Geçersiz istek', details) => new AppError(400, 'BAD_REQUEST', message, details);
const validationError = (details) => new AppError(422, 'VALIDATION_ERROR', 'Girilen bilgileri kontrol ediniz', details);
const unauthorized = (message = 'Oturum açmanız gerekiyor') => new AppError(401, 'UNAUTHORIZED', message);
const forbidden = (message = 'Bu işlem için yetkiniz yok') => new AppError(403, 'FORBIDDEN', message);
const notFound = (message = 'Kayıt bulunamadı') => new AppError(404, 'NOT_FOUND', message);
const conflict = (message, code = 'CONFLICT') => new AppError(409, code, message);
const tooMany = (message = 'Çok fazla deneme yaptınız, lütfen biraz bekleyiniz') => new AppError(429, 'TOO_MANY_REQUESTS', message);

module.exports = { AppError, badRequest, validationError, unauthorized, forbidden, notFound, conflict, tooMany };
