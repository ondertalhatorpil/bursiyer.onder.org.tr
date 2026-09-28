/**
 * Aday oturumu zorunlu route'lar için. req.applicantId ve req.session doldurulur.
 */
const { readSession } = require('../services/session.service');
const { unauthorized } = require('../lib/errors');

async function requireApplicant(req, res, next) {
  const session = await readSession(req, 'applicant');
  if (!session) return next(unauthorized('Oturumunuz sona erdi, lütfen tekrar giriş yapın'));
  req.session = session;
  req.applicantId = session.subject_id;
  return next();
}

module.exports = { requireApplicant };
