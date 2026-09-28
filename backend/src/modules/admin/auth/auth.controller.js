/**
 * Admin girişi: e-posta + şifre -> telefona SMS kodu (2FA) -> oturum.
 * 5 hatalı şifre denemesinde hesap 15 dakika kilitlenir.
 */
const argon2 = require('argon2');
const db = require('../../../db/knex');
const { encrypt, decrypt } = require('../../../lib/crypto');
const { AppError, badRequest } = require('../../../lib/errors');
const otp = require('../../../services/otp.service');
const session = require('../../../services/session.service');
const { loadAdmin } = require('../../../middlewares/auth-admin');
const { audit } = require('../../../services/audit.service');

const MAX_FAILED = 5;
const LOCK_MIN = 15;
const FLOW_TTL_MS = 10 * 60 * 1000;
// Kullanıcı yokken de aynı sürede cevap vermek için (e-posta tahminini zorlaştırır)
const DUMMY_HASH = '$argon2id$v=19$m=65536,p=4,t=3$rrfFM0hyRrjf8Y24hiweuA$Mon81T0mwGydCHKew1IdNKNNS1nJIsSkHteFNItJdnI';

const invalid = () => new AppError(401, 'INVALID_CREDENTIALS', 'E-posta veya şifre hatalı');

function openToken(token) {
  let data = null;
  try { data = JSON.parse(decrypt(token)); } catch { data = null; }
  if (!data || data.t !== 'admin' || data.exp < Date.now()) {
    throw new AppError(400, 'FLOW_EXPIRED', 'İşlem süresi doldu, lütfen tekrar giriş yapın');
  }
  return data;
}

async function login(req, res) {
  const { email, password } = req.valid.body;
  const user = await db('admin_users').where({ email }).first();

  if (!user) {
    await argon2.verify(DUMMY_HASH, password).catch(() => false);
    throw invalid();
  }
  if (!user.is_active) throw invalid();
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    throw new AppError(423, 'ACCOUNT_LOCKED', `Çok fazla hatalı deneme. Hesabınız ${LOCK_MIN} dakika kilitlendi.`);
  }

  const ok = await argon2.verify(user.password_hash, password).catch(() => false);
  if (!ok) {
    const failed = user.failed_logins + 1;
    await db('admin_users').where({ id: user.id }).update({
      failed_logins: failed >= MAX_FAILED ? 0 : failed,
      locked_until: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MIN * 60000) : null,
    });
    await audit({ ...req, admin: { id: user.id } }, 'admin.login_failed');
    throw invalid();
  }
  await db('admin_users').where({ id: user.id }).update({ failed_logins: 0, locked_until: null });

  if (!user.phone) throw new AppError(409, 'NO_PHONE', 'Hesabınıza telefon tanımlı değil, yöneticinize başvurun');

  const sent = await otp.sendOtp({ phone: user.phone, purpose: 'admin_2fa', subjectRef: `admin:${user.id}`, ip: req.ip });
  const loginToken = encrypt(JSON.stringify({ t: 'admin', id: user.id, exp: Date.now() + FLOW_TTL_MS }));
  res.json({ loginToken, ...sent });
}

async function resend(req, res) {
  const { id } = openToken(req.valid.body.loginToken);
  const user = await db('admin_users').where({ id, is_active: true }).first();
  if (!user) throw badRequest('Kullanıcı bulunamadı');
  res.json(await otp.sendOtp({ phone: user.phone, purpose: 'admin_2fa', subjectRef: `admin:${user.id}`, ip: req.ip }));
}

async function verify(req, res) {
  const { loginToken, code } = req.valid.body;
  const { id } = openToken(loginToken);
  const user = await db('admin_users').where({ id, is_active: true }).first();
  if (!user) throw badRequest('Kullanıcı bulunamadı');

  await otp.verifyOtp({ phone: user.phone, purpose: 'admin_2fa', subjectRef: `admin:${user.id}`, code });
  await session.createSession(res, { subjectType: 'admin', subjectId: user.id, ip: req.ip, userAgent: req.get('user-agent') });
  await db('admin_users').where({ id: user.id }).update({ last_login_at: new Date() });
  await audit({ admin: { id: user.id }, ip: req.ip }, 'admin.login');
  res.json({ admin: serialize(await loadAdmin(user.id)) });
}

function serialize(admin) {
  return {
    id: admin.id,
    email: admin.email,
    fullName: admin.fullName,
    role: admin.role,
    roleName: admin.roleName,
    permissions: admin.permissions,
    mustChangePassword: admin.mustChangePassword,
  };
}

async function me(req, res) {
  res.json({ admin: serialize(req.admin) });
}

async function logout(req, res) {
  await session.destroySession(req, res, 'admin');
  res.json({ ok: true });
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.valid.body;
  const user = await db('admin_users').where({ id: req.admin.id }).first();
  if (!(await argon2.verify(user.password_hash, currentPassword).catch(() => false))) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Girilen bilgileri kontrol edin', { currentPassword: 'Mevcut şifre hatalı' });
  }
  await db('admin_users').where({ id: user.id }).update({
    password_hash: await argon2.hash(newPassword, { type: argon2.argon2id }),
    must_change_password: false,
  });
  await audit(req, 'admin.password_changed');
  res.json({ admin: serialize(await loadAdmin(user.id)) });
}

module.exports = { login, resend, verify, me, logout, changePassword };
