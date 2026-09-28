/**
 * Adım 6: belge yükleme.
 *
 * Hangi belgelerin isteneceği document_types.rules ile adayın durumuna göre hesaplanır
 * (kategori, T.C./YKN, sınıf, yaş). Yükleme sırası:
 *   tür kontrolü (dosyanın ilk byte'ları) -> format/boyut -> diske yaz -> DB
 * Belge içeriği otomatik kontrol edilmez; personel manuel inceler.
 * Aynı tipe yeni dosya yüklenince eskisi silinmez, arşivlenir (is_current = 0).
 *
 * Belge yüklemek için başvuru taslakta olmalı. İstisna: admin "revize" istediyse (Aşama 8)
 * sadece revize istenen belgeler yeniden yüklenebilir.
 */
const crypto = require('crypto');
const db = require('../db/knex');
const { sha256File } = require('../lib/crypto');
const { resolveDocuments, parseJson } = require('../lib/rules');
const { detectType } = require('../lib/file-type');
const { AppError, notFound, validationError } = require('../lib/errors');
const storage = require('./storage.service');
const app$ = require('./application.service');
const { changeStatus } = require('./status.service');

// ---------------------------------------------------------------------------
// Bağlam
// ---------------------------------------------------------------------------

async function loadContext(applicantId) {
  const app = await app$.getApplicationRow(applicantId);
  if (!app) throw notFound('Başvuru bulunamadı');
  const applicant = await db('applicants').where({ id: applicantId }).first();
  const education = await db('education').where({ application_id: app.id }).first();
  const ctx = {
    category: app.category,
    idType: applicant.id_type,
    grade: education?.grade,
    age: app$.ageInfo(applicant).age,
  };
  return { app, applicant, education, ctx };
}

async function applicableTypes(ctx) {
  const types = await db('document_types').where({ is_active: true });
  return resolveDocuments(types.map((t) => ({ ...t, rules: parseJson(t.rules) })), ctx);
}

async function consentGiven(appId, consentType) {
  if (!consentType) return true;
  const row = await db('consents as c')
    .join('consent_texts as t', 't.id', 'c.consent_text_id')
    .where({ 'c.application_id': appId, 't.type': consentType })
    .first('c.id');
  return !!row;
}

function serializeUpload(d) {
  if (!d) return null;
  return {
    id: d.public_id,
    originalName: d.original_name,
    mime: d.mime,
    size: d.size_bytes,
    uploadedAt: d.uploaded_at,
    reviewStatus: d.review_status,
    reviewNote: d.review_note,
  };
}

// ---------------------------------------------------------------------------
// Liste
// ---------------------------------------------------------------------------

/**
 * Adayın yüklemesi gereken belgeler + mevcut yüklemeleri.
 * @returns {{ items: [], complete: boolean, canUpload: boolean }}
 */
async function listDocuments(applicantId) {
  const { app, education, ctx } = await loadContext(applicantId);
  if (!app.category || !education) {
    return { items: [], complete: false, canUpload: false, reason: 'Önce eğitim bilgilerini tamamlayın (Adım 5)' };
  }

  const types = await applicableTypes(ctx);
  const uploads = await db('documents').where({ application_id: app.id, is_current: true });

  const items = [];
  for (const t of types) {
    const upload = uploads.find((u) => u.document_type_id === t.id);
    items.push({
      code: t.code,
      name: t.name,
      description: t.description,
      formats: parseJson(t.formats),
      maxMb: t.max_mb,
      required: t.required,
      consentType: t.consent_type,
      consentGiven: await consentGiven(app.id, t.consent_type),
      upload: serializeUpload(upload),
      // Revize isteminde sadece işaretli belgeler değiştirilebilir
      editable: app.status === 'draft'
        || (app.status === 'revision_requested' && upload?.review_status === 'revision_requested'),
    });
  }

  const complete = items.every((i) => !i.required || i.upload);
  return {
    items,
    complete,
    canUpload: app.status === 'draft' || app.status === 'revision_requested',
  };
}

// ---------------------------------------------------------------------------
// Yükleme
// ---------------------------------------------------------------------------

async function upload(applicantId, typeCode, file, { consent, ip, userAgent }) {
  const { app, applicant, education, ctx } = await loadContext(applicantId);
  if (!app.program_is_open && app.status === 'draft') {
    throw new AppError(403, 'APPLICATIONS_CLOSED', 'Başvuru dönemi kapanmıştır');
  }
  if (!app.category || !education) throw new AppError(409, 'STEP_ORDER', 'Önce eğitim bilgilerini tamamlayın (Adım 5)');

  const type = (await applicableTypes(ctx)).find((t) => t.code === typeCode);
  if (!type) throw notFound('Bu belge başvurunuz için istenmiyor');

  const current = await db('documents').where({ application_id: app.id, document_type_id: type.id, is_current: true }).first();
  const allowed = app.status === 'draft'
    || (app.status === 'revision_requested' && current?.review_status === 'revision_requested');
  if (!allowed) throw new AppError(409, 'APPLICATION_LOCKED', 'Bu belge şu an değiştirilemez');

  if (!file) throw validationError({ file: 'Dosya seçin' });

  // Gerçek tür, uzantıdan değil içerikten
  const detected = detectType(file.buffer);
  const formats = parseJson(type.formats);
  if (!detected || !formats.includes(detected.ext)) {
    throw validationError({ file: `Bu belge için kabul edilen formatlar: ${formats.map((f) => f.toUpperCase()).join(', ')}` });
  }
  if (file.size > type.max_mb * 1024 * 1024) {
    throw validationError({ file: `Dosya en fazla ${type.max_mb} MB olabilir` });
  }

  // Özel nitelikli veri (adli sicil) için ek açık rıza
  const needsConsent = type.consent_type && !(await consentGiven(app.id, type.consent_type));
  let consentText = null;
  if (needsConsent) {
    if (consent !== true) throw validationError({ consent: 'Bu belgeyi yüklemek için açık rıza onayı gerekiyor' });
    consentText = await app$.getActiveConsentText(type.consent_type);
    if (!consentText) throw new AppError(503, 'CONSENT_TEXT_MISSING', 'Onay metni henüz yayınlanmadı');
  }

  const key = await storage.save(file.buffer, detected.ext);
  try {
    await db.transaction(async (trx) => {
      if (consentText) {
        await trx('consents').insert({
          applicant_id: applicant.id,
          application_id: app.id,
          consent_text_id: consentText.id,
          accepted_at: new Date(),
          ip: ip || '',
          user_agent: userAgent ? String(userAgent).slice(0, 512) : null,
        });
      }
      await trx('documents')
        .where({ application_id: app.id, document_type_id: type.id, is_current: true })
        .update({ is_current: false });
      await trx('documents').insert({
        public_id: crypto.randomUUID(),
        application_id: app.id,
        document_type_id: type.id,
        storage_key: key,
        original_name: sanitizeName(file.originalname),
        mime: detected.mime,
        size_bytes: file.size,
        sha256: sha256File(file.buffer),
        review_status: 'pending',
        is_current: true,
        uploaded_at: new Date(),
      });
    });
  } catch (err) {
    await storage.remove(key).catch(() => {});
    throw err;
  }

  await refreshStep(app, applicantId);
  await resumeReviewIfRevised(app);
  return listDocuments(applicantId);
}

/**
 * Revize istenen belgelerin hepsi yeniden yüklendiyse başvuru otomatik olarak incelemeye döner.
 */
async function resumeReviewIfRevised(app) {
  if (app.status !== 'revision_requested') return;
  const { n } = await db('documents')
    .where({ application_id: app.id, is_current: true, review_status: 'revision_requested' })
    .count({ n: '*' }).first();
  if (Number(n) > 0) return;
  await db.transaction((trx) => changeStatus(trx, {
    applicationId: app.id,
    from: 'revision_requested',
    to: 'in_review',
    actorType: 'applicant',
    note: 'Aday istenen belgeleri yeniden yükledi',
  })).catch(() => {}); // aynı anda başka bir işlem statüyü değiştirdiyse sorun değil
}

/** Taslakta belgeyi kaldırır (dosya arşivde kalır) */
async function removeDocument(applicantId, publicId) {
  const { app } = await loadContext(applicantId);
  if (app.status !== 'draft') throw new AppError(409, 'APPLICATION_LOCKED', 'Gönderilmiş başvurudan belge kaldırılamaz');
  const updated = await db('documents')
    .where({ application_id: app.id, public_id: publicId, is_current: true })
    .update({ is_current: false });
  if (!updated) throw notFound('Belge bulunamadı');
  await refreshStep(app, applicantId);
  return listDocuments(applicantId);
}

/** Adayın kendi belgesini görüntülemesi için */
async function getOwnFile(applicantId, publicId) {
  const { app } = await loadContext(applicantId);
  const doc = await db('documents').where({ application_id: app.id, public_id: publicId, is_current: true }).first();
  if (!doc) throw notFound('Belge bulunamadı');
  return doc;
}

/** Zorunlu belgelerin hepsi yüklendiyse Adım 7'ye geçilir */
async function refreshStep(app, applicantId) {
  const { complete } = await listDocuments(applicantId);
  if (complete && app.current_step < 7) await db('applications').where({ id: app.id }).update({ current_step: 7 });
}

function sanitizeName(name) {
  // multer latin1 ile okur; Türkçe karakterli adları düzelt
  let n = String(name || 'belge');
  try {
    const utf8 = Buffer.from(n, 'latin1').toString('utf8');
    if (!utf8.includes('�')) n = utf8;
  } catch { /* olduğu gibi kalsın */ }
  // eslint-disable-next-line no-control-regex
  return n.replace(/[\u0000-\u001f\\/]/g, '_').slice(0, 255);
}

module.exports = { listDocuments, upload, removeDocument, getOwnFile, applicableTypes, loadContext };
