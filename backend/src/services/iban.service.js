/**
 * Adım 8: IBAN.
 *
 * Akış:
 *   Onaylandı (approved)  -> aday IBAN + hesap belgesi girer          -> IBAN Kontrolünde (iban_pending)
 *   IBAN Kontrolünde      -> personel uygun bulur                     -> Kesinleşti (finalized), SMS
 *                         -> personel reddeder (gerekçe zorunlu)      -> Onaylandı (aday yeniden girer), SMS
 *
 * Hesap bursiyerin kendi adına, vadesiz TL hesabı olmalı. Hesap sahibinin adı sistemden gelir, aday değiştiremez.
 * IBAN şifreli saklanır; aynı IBAN başka bir bursiyerde bekliyor / onaylıysa kabul edilmez.
 * Her giriş ayrı satırdır (geçmiş korunur); güncel kayıt valid_to boş olan satırdır.
 */
const db = require('../db/knex');
const { encrypt, decrypt, hmac, sha256File } = require('../lib/crypto');
const { parseTrIban, formatIban, maskIban } = require('../lib/iban');
const { detectType } = require('../lib/file-type');
const { todayTR } = require('../lib/age');
const { AppError, notFound, validationError } = require('../lib/errors');
const { changeStatus, STATUS_LABELS } = require('./status.service');
const storage = require('./storage.service');
const sms = require('./sms');
const logger = require('../lib/logger');

const FORMATS = ['pdf', 'jpg', 'png'];
const MAX_BYTES = 5 * 1024 * 1024;
const ibanHash = (iban) => hmac(`iban|${iban}`);

const STATUS_TEXT = { pending: 'Kontrol ediliyor', accepted: 'Onaylandı', rejected: 'Reddedildi' };

async function bankName(code) {
  if (!code) return null;
  return (await db('banks').where({ code }).first('name'))?.name || null;
}

async function latestApplication(applicantId) {
  const app = await db('applications').where({ applicant_id: applicantId }).orderBy('id', 'desc').first();
  if (!app) throw notFound('Başvuru bulunamadı');
  return app;
}

const currentAccount = (applicationId) => db('bank_accounts')
  .where({ application_id: applicationId }).orderBy('id', 'desc').first();

async function content(key) {
  const b = await db('content_blocks').where({ key }).first();
  return b ? { title: b.title, body: b.body } : null;
}

// ---------------------------------------------------------------------------
// Aday
// ---------------------------------------------------------------------------

async function getForApplicant(applicantId) {
  const app = await latestApplication(applicantId);
  const applicant = await db('applicants').where({ id: applicantId }).first();
  const acc = ['approved', 'iban_pending', 'finalized'].includes(app.status) ? await currentAccount(app.id) : null;

  return {
    status: app.status,
    statusLabel: STATUS_LABELS[app.status],
    trackingNo: app.tracking_no,
    // Onaylanmamış başvuruda Adım 8 kapalıdır
    available: ['approved', 'iban_pending', 'finalized'].includes(app.status),
    canSubmit: app.status === 'approved',
    holderName: `${applicant.first_name} ${applicant.last_name}`,
    account: acc ? {
      ibanMasked: maskIban(decrypt(acc.iban_enc)),
      bankName: (await bankName(acc.bank_code)) || null,
      status: acc.status,
      statusLabel: STATUS_TEXT[acc.status],
      reviewNote: acc.status === 'rejected' ? acc.review_note : null,
      submittedAt: acc.created_at,
      documentName: acc.original_name,
    } : null,
    // Formda IBAN yazılırken banka adını göstermek için
    banks: app.status === 'approved' ? await db('banks').where({ is_active: true }).select('code', 'name') : [],
    warning: await content('iban_warning'),
    finalized: app.status === 'finalized' ? await content('finalize_success') : null,
  };
}

async function submit(applicantId, { iban, confirm }, file) {
  const app = await latestApplication(applicantId);
  if (app.status !== 'approved') {
    throw new AppError(409, 'IBAN_NOT_ALLOWED', app.status === 'iban_pending'
      ? 'IBAN bilgileriniz kontrol ediliyor; sonuç SMS ile bildirilecek'
      : 'IBAN bilgisi sadece onaylanmış başvurular için girilebilir');
  }

  const errors = {};
  const parsed = parseTrIban(iban);
  if (!parsed.valid) errors.iban = parsed.reason;
  if (confirm !== true) errors.confirm = 'Hesabın size ait vadesiz TL hesabı olduğunu onaylayın';
  if (!file) errors.file = 'Hesap belgesini yükleyin';
  let detected = null;
  if (file) {
    detected = detectType(file.buffer);
    if (!detected || !FORMATS.includes(detected.ext)) errors.file = 'Kabul edilen formatlar: PDF, JPG, PNG';
    else if (file.size > MAX_BYTES) errors.file = 'Dosya en fazla 5 MB olabilir';
  }
  if (Object.keys(errors).length) throw validationError(errors);

  const hash = ibanHash(parsed.value);
  const usedElsewhere = await db('bank_accounts')
    .where({ iban_hash: hash }).whereNot({ application_id: app.id }).whereIn('status', ['pending', 'accepted']).whereNull('valid_to')
    .first('id');
  if (usedElsewhere) throw validationError({ iban: 'Bu IBAN başka bir bursiyer için kayıtlı. Kendi adınıza açılmış hesabın IBAN\'ını girin' });

  const applicant = await db('applicants').where({ id: applicantId }).first();
  const known = await db('banks').where({ code: parsed.bankCode }).first('code');
  const key = await storage.save(file.buffer, detected.ext);
  const now = new Date();
  try {
    await db.transaction(async (trx) => {
      await trx('bank_accounts').where({ application_id: app.id }).whereNull('valid_to').update({ valid_to: todayTR(), updated_at: now });
      await trx('bank_accounts').insert({
        applicant_id: applicantId,
        application_id: app.id,
        iban_enc: encrypt(parsed.value),
        iban_last4: parsed.value.slice(-4),
        iban_hash: hash,
        bank_code: known ? parsed.bankCode : null,
        bank_code_raw: parsed.bankCode,
        holder_name: `${applicant.first_name} ${applicant.last_name}`,
        is_guardian_account: false,
        valid_from: todayTR(),
        storage_key: key,
        original_name: sanitizeName(file.originalname),
        mime: detected.mime,
        size_bytes: file.size,
        sha256: sha256File(file.buffer),
        status: 'pending',
        declared_at: now,
      });
      await changeStatus(trx, { applicationId: app.id, from: 'approved', to: 'iban_pending', actorType: 'applicant', note: 'Aday IBAN bilgilerini girdi' });
    });
  } catch (err) {
    await storage.remove(key).catch(() => {});
    throw err;
  }
  return getForApplicant(applicantId);
}

async function getOwnFile(applicantId) {
  const app = await latestApplication(applicantId);
  const acc = await currentAccount(app.id);
  if (!acc?.storage_key) throw notFound('Belge bulunamadı');
  return acc;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

/** Başvuru detayına eklenen IBAN geçmişi (en yeni önce) */
async function forAdmin(app, admin) {
  const rows = await db('bank_accounts as b')
    .leftJoin('banks as k', 'k.code', 'b.bank_code')
    .leftJoin('admin_users as u', 'u.id', 'b.reviewed_by')
    .where('b.application_id', app.id)
    .orderBy('b.id', 'desc')
    .select('b.*', 'k.name as bank_name', 'u.full_name as reviewer_name');
  const full = admin.can('decide') || admin.can('view_full_id');
  return Promise.all(rows.map(async (r) => {
    const iban = decrypt(r.iban_enc);
    const shared = await db('bank_accounts').where({ iban_hash: r.iban_hash }).whereNot({ application_id: app.id }).count({ n: '*' }).first();
    return {
      id: Number(r.id),
      isCurrent: !r.valid_to,
      iban: full ? formatIban(iban) : maskIban(iban),
      bankCode: r.bank_code_raw,
      bankName: r.bank_name,
      bankKnown: !!r.bank_name,
      holderName: r.holder_name,
      status: r.status,
      statusLabel: STATUS_TEXT[r.status],
      reviewNote: r.review_note,
      reviewedBy: r.reviewer_name,
      reviewedAt: r.reviewed_at,
      submittedAt: r.created_at,
      declaredAt: r.declared_at,
      usedByOthers: Number(shared.n) > 0,
      document: r.storage_key ? { name: r.original_name, mime: r.mime, size: r.size_bytes } : null,
    };
  }));
}

async function getFileForAdmin(app, accountId) {
  const acc = await db('bank_accounts').where({ id: accountId, application_id: app.id }).first();
  if (!acc?.storage_key) throw notFound('Belge bulunamadı');
  return acc;
}

/**
 * @param {'accepted'|'rejected'} decision
 */
async function review(admin, app, { decision, note }) {
  if (app.status !== 'iban_pending') throw new AppError(409, 'NOT_IBAN_PENDING', 'Bu başvuruda kontrol bekleyen IBAN yok');
  const acc = await currentAccount(app.id);
  if (!acc || acc.status !== 'pending') throw new AppError(409, 'NOT_IBAN_PENDING', 'Bu başvuruda kontrol bekleyen IBAN yok');
  if (decision === 'rejected' && !note) throw validationError({ note: 'Adaya gösterilecek red gerekçesini yazın' });

  const now = new Date();
  await db.transaction(async (trx) => {
    await trx('bank_accounts').where({ id: acc.id }).update({
      status: decision,
      review_note: note || null,
      reviewed_by: admin.id,
      reviewed_at: now,
      verified_at: decision === 'accepted' ? now : null,
      updated_at: now,
    });
    await changeStatus(trx, {
      applicationId: app.id,
      from: 'iban_pending',
      to: decision === 'accepted' ? 'finalized' : 'approved',
      actorType: 'admin',
      adminId: admin.id,
      note: decision === 'accepted' ? 'IBAN onaylandı' : `IBAN reddedildi: ${note}`,
    });
  });

  const applicant = await db('applicants').where({ id: app.applicant_id }).first('phone');
  const template = decision === 'accepted' ? 'bursiyer_finalized' : 'iban_rejected';
  try {
    await sms.sendTemplate(template, applicant.phone, { tracking_no: app.tracking_no }, { applicationId: app.id });
  } catch (err) {
    logger.error({ err: err.message, applicationId: app.id, template }, 'IBAN SMS\'i gönderilemedi');
  }
}

/** Ödeme listesi: kesinleşmiş bursiyerler ve onaylı IBAN'ları */
function paymentQuery() {
  return db('applications as a')
    .join('applicants as p', 'p.id', 'a.applicant_id')
    .join('bank_accounts as b', function joinCurrent() {
      this.on('b.application_id', 'a.id').andOnNull('b.valid_to').andOnVal('b.status', 'accepted');
    })
    .leftJoin('banks as k', 'k.code', 'b.bank_code')
    .where('a.status', 'finalized');
}

function sanitizeName(name) {
  let n = String(name || 'hesap-belgesi');
  try {
    const utf8 = Buffer.from(n, 'latin1').toString('utf8');
    if (!utf8.includes('�')) n = utf8;
  } catch { /* olduğu gibi */ }
  // eslint-disable-next-line no-control-regex
  return n.replace(/[\u0000-\u001f\\/]/g, '_').slice(0, 255);
}

module.exports = { getForApplicant, submit, getOwnFile, forAdmin, getFileForAdmin, review, paymentQuery, ibanHash };
