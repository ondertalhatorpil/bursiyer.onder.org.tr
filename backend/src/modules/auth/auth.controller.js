/**
 * Aday kaydı (Adım 1-2) ve giriş.
 *
 * Kayıt: register/start (bilgiler + onaylar -> SMS) -> register/verify (kod -> hesap + taslak başvuru + oturum)
 * Giriş: login/start (kimlik no -> kayıtlı numaraya SMS) -> login/verify (kod -> oturum)
 *
 * start adımında veritabanına aday yazılmaz. Bilgiler şifreli, 15 dk geçerli bir token olarak
 * frontend'e verilir; verify adımında geri gelir. Böylece doğrulanmamış kayıtlar birikmez.
 */
const db = require('../../db/knex');
const { encrypt, decrypt } = require('../../lib/crypto');
const { AppError, badRequest } = require('../../lib/errors');
const otp = require('../../services/otp.service');
const session = require('../../services/session.service');
const svc = require('../../services/application.service');

const FLOW_TTL_MS = 15 * 60 * 1000;

function sealToken(type, payload) {
  return encrypt(JSON.stringify({ t: type, exp: Date.now() + FLOW_TTL_MS, ...payload }));
}

function openToken(type, tokenStr) {
  let data;
  try {
    data = JSON.parse(decrypt(tokenStr));
  } catch {
    data = null;
  }
  if (!data || data.t !== type || typeof data.exp !== 'number' || data.exp < Date.now()) {
    throw new AppError(400, 'FLOW_EXPIRED', 'İşlem süresi doldu, lütfen baştan başlayınız');
  }
  return data;
}

const clientInfo = (req) => ({ ip: req.ip, userAgent: req.get('user-agent') });

// ---------------------------------------------------------------------------
// Kayıt
// ---------------------------------------------------------------------------

async function registerStart(req, res) {
  const v = req.valid.body;
  const program = await svc.requireOpenProgram();

  const kvkk = await svc.getActiveConsentText('kvkk');
  if (!kvkk) {
    throw new AppError(503, 'CONSENT_TEXT_MISSING', 'Başvuru metinleri henüz yayınlanmadı, lütfen daha sonra tekrar deneyiniz');
  }

  if (await svc.findApplicantByIdNumber(v.idNumber.value)) {
    throw new AppError(409, 'ALREADY_REGISTERED', 'Bu kimlik numarasıyla kayıt zaten var, lütfen giriş yapınız');
  }

  const reg = {
    firstName: v.firstName,
    lastName: v.lastName,
    idType: v.idNumber.type,
    idNumber: v.idNumber.value,
    birthDate: v.birthDate,
    nationality: v.nationality || null,
    phone: v.phone,
    email: v.email,
  };

  const sent = await otp.sendOtp({
    phone: reg.phone,
    purpose: 'applicant',
    subjectRef: svc.idNumberHash(reg.idNumber),
    ip: req.ip,
  });

  const registrationToken = sealToken('reg', {
    reg, programId: program.id, consentTextIds: [kvkk.id],
  });
  res.json({ registrationToken, ...sent });
}

async function registerResend(req, res) {
  const data = openToken('reg', req.valid.body.registrationToken);
  const sent = await otp.sendOtp({
    phone: data.reg.phone,
    purpose: 'applicant',
    subjectRef: svc.idNumberHash(data.reg.idNumber),
    ip: req.ip,
  });
  res.json(sent);
}

async function registerVerify(req, res) {
  const { registrationToken, code } = req.valid.body;
  const data = openToken('reg', registrationToken);

  await otp.verifyOtp({
    phone: data.reg.phone,
    purpose: 'applicant',
    subjectRef: svc.idNumberHash(data.reg.idNumber),
    code,
  });

  const program = await svc.requireOpenProgram();
  if (program.id !== data.programId) throw badRequest('Başvuru dönemi değişti, lütfen baştan başlayınız');

  const { applicantId } = await svc.createRegistration({
    reg: data.reg,
    program,
    consentTextIds: data.consentTextIds,
    ...clientInfo(req),
  });

  await session.createSession(res, { subjectType: 'applicant', subjectId: applicantId, ...clientInfo(req) });
  res.status(201).json(await svc.getMe(applicantId));
}

// ---------------------------------------------------------------------------
// Giriş
// ---------------------------------------------------------------------------

async function loginStart(req, res) {
  const { idNumber } = req.valid.body;
  const applicant = await svc.findApplicantByIdNumber(idNumber.value);
  if (!applicant) {
    throw new AppError(404, 'NOT_REGISTERED', 'Bu kimlik numarasıyla kayıt bulunamadı. Yeni başvuru oluşturabilirsiniz');
  }

  const sent = await otp.sendOtp({
    phone: applicant.phone,
    purpose: 'login',
    subjectRef: applicant.id_number_hash,
    ip: req.ip,
  });
  res.json({ loginToken: sealToken('login', { applicantId: applicant.id }), ...sent });
}

async function loadLoginApplicant(tokenStr) {
  const data = openToken('login', tokenStr);
  const applicant = await db('applicants').where({ id: data.applicantId }).first();
  if (!applicant) throw new AppError(400, 'FLOW_EXPIRED', 'İşlem süresi doldu, lütfen baştan başlayınız');
  return applicant;
}

async function loginResend(req, res) {
  const applicant = await loadLoginApplicant(req.valid.body.loginToken);
  const sent = await otp.sendOtp({
    phone: applicant.phone, purpose: 'login', subjectRef: applicant.id_number_hash, ip: req.ip,
  });
  res.json(sent);
}

async function loginVerify(req, res) {
  const { loginToken, code } = req.valid.body;
  const applicant = await loadLoginApplicant(loginToken);
  await otp.verifyOtp({ phone: applicant.phone, purpose: 'login', subjectRef: applicant.id_number_hash, code });
  await session.createSession(res, { subjectType: 'applicant', subjectId: applicant.id, ...clientInfo(req) });
  res.json(await svc.getMe(applicant.id));
}

// ---------------------------------------------------------------------------
// Oturum
// ---------------------------------------------------------------------------

async function me(req, res) {
  res.json(await svc.getMe(req.applicantId));
}

async function logout(req, res) {
  await session.destroySession(req, res, 'applicant');
  res.json({ ok: true });
}

module.exports = {
  registerStart, registerResend, registerVerify, loginStart, loginResend, loginVerify, me, logout,
};
