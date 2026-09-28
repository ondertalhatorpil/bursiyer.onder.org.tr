/**
 * CSRF koruması: veri değiştiren isteklerde (POST/PUT/PATCH/DELETE) Origin başlığı
 * izinli adreslerden biri değilse istek reddedilir. Cookie SameSite=Lax ile birlikte çalışır.
 * Origin gelmeyen istekler (curl, sunucudan sunucuya, webhook) geçer; tarayıcılar her zaman gönderir.
 */
const config = require('../config');

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

function originGuard(req, res, next) {
  if (SAFE.has(req.method)) return next();
  const origin = req.get('origin');
  if (!origin) return next();

  const self = `${req.protocol}://${req.get('host')}`;
  if (origin === self || config.corsOrigins.includes(origin)) return next();

  return res.status(403).json({ error: { code: 'BAD_ORIGIN', message: 'İzin verilmeyen kaynak' } });
}

module.exports = { originGuard };
