/**
 * Express uygulaması (sunucuyu başlatmaz; testler bu dosyayı doğrudan kullanır).
 */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const pinoHttp = require('pino-http');
const crypto = require('crypto');

const config = require('./config');
const logger = require('./lib/logger');
const routes = require('./routes');
const { apiLimiter } = require('./middlewares/rate-limit');
const { originGuard } = require('./middlewares/origin-guard');
const { notFoundHandler, errorHandler } = require('./middlewares/error-handler');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);

app.use(pinoHttp({
  logger,
  genReqId: (req, res) => {
    const id = crypto.randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
  autoLogging: { ignore: (req) => req.url === '/api/health' },
}));

app.use(helmet());
app.use(cors({
  origin: config.corsOrigins,
  credentials: true, // oturum cookie'si için
}));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.use('/api', apiLimiter, originGuard, routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
