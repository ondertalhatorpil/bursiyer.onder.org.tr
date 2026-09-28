/**
 * Admin paneli: başvuru listesi, detay, değerlendirme işlemleri, dashboard ve export.
 * Tüm sorgular admin'in kapsamıyla (applyScope) sınırlandırılır.
 */
const db = require('../db/knex');
const logger = require('../lib/logger');
const { decrypt, hmac } = require('../lib/crypto');
const { maskIdNumber, parseIdNumber } = require('../lib/identity');
const { formatTrMobile, normalizeTrMobile } = require('../lib/phone');
const { ageOn, todayTR } = require('../lib/age');
const { parseJson } = require('../lib/rules');
const { AppError, notFound, forbidden, validationError } = require('../lib/errors');
const { applyScope } = require('../middlewares/auth-admin');
const { changeStatus, canTransition, STATUS_LABELS, TRANSITIONS } = require('./status.service');
const { CATEGORY_LABELS } = require('./application.service');
const sms = require('./sms');
const iban = require('./iban.service');

const FLAG_LABELS = {
  birth_year_out_of_range: 'Doğum yılı şart dışında',
  school_not_in_list: 'Okul / üniversite listede yok',
};

const idHash = (idNumber) => hmac(`idno|${idNumber}`);
const escapeLike = (s) => s.replace(/[%_\\]/g, '\\$&');

// ---------------------------------------------------------------------------
// Ortak sorgu
// ---------------------------------------------------------------------------

async function resolveProgramId(programId) {
  if (programId) return programId;
  const latest = await db('programs').orderBy('id', 'desc').first('id');
  return latest?.id || 0;
}

function baseQuery() {
  return db('applications as a')
    .join('applicants as p', 'p.id', 'a.applicant_id')
    .leftJoin('education as e', 'e.application_id', 'a.id')
    .leftJoin('channels as ch', 'ch.id', 'a.channel_id')
    .leftJoin('sub_units as su', 'su.id', 'a.sub_unit_id')
    .leftJoin('cities as c', 'c.id', 'e.city_id')
    .leftJoin('schools as s', 's.id', 'e.school_id')
    .leftJoin('universities as u', 'u.id', 'e.university_id');
}

/** Liste ve export için filtreler */
function applyFilters(q, f) {
  if (f.status?.length) q.whereIn('a.status', f.status);
  if (f.category) q.where('a.category', f.category);
  if (f.channelId) q.where('a.channel_id', f.channelId);
  if (f.subUnitId) q.where('a.sub_unit_id', f.subUnitId);
  if (f.cityId) q.where('e.city_id', f.cityId);
  if (f.flag) q.whereRaw('JSON_CONTAINS(a.flags, ?)', [JSON.stringify(f.flag)]);
  if (f.minor !== undefined) q.where('a.is_minor', f.minor);

  const term = f.q?.trim();
  if (term) {
    const digits = term.replace(/\D/g, '');
    const id = parseIdNumber(digits);
    if (id.valid) q.where('p.id_number_hash', idHash(id.value));
    else if (/^OND-/i.test(term)) q.where('a.tracking_no', 'like', `${escapeLike(term.toUpperCase())}%`);
    else if (digits.length >= 10 && normalizeTrMobile(digits)) q.where('p.phone', normalizeTrMobile(digits));
    else {
      const like = `%${escapeLike(term)}%`;
      q.where((w) => w.whereRaw("CONCAT(p.first_name, ' ', p.last_name) LIKE ?", [like]).orWhere('p.email', 'like', like));
    }
  }
  return q;
}

function institution(row) {
  return row.school_name || row.school_other || row.university_name || row.university_other || null;
}

function listRow(r, admin) {
  const idNumber = decrypt(r.id_number_enc);
  return {
    id: r.public_id,
    trackingNo: r.tracking_no,
    fullName: `${r.first_name} ${r.last_name}`,
    idNumber: admin.can('view_full_id') ? idNumber : maskIdNumber(idNumber),
    category: r.category,
    categoryLabel: CATEGORY_LABELS[r.category] || null,
    channel: r.channel_name,
    subUnit: r.sub_unit_name,
    institution: institution(r),
    city: r.city_name,
    status: r.status,
    statusLabel: STATUS_LABELS[r.status],
    flags: (parseJson(r.flags) || []).map((f) => ({ code: f, label: FLAG_LABELS[f] || f })),
    revisionDocs: Number(r.revision_docs || 0),
    isMinor: !!r.is_minor,
    referenceVerified: !!r.reference_verified_at,
    submittedAt: r.submitted_at,
    createdAt: r.created_at,
  };
}

const LIST_COLUMNS = [
  'a.id', 'a.public_id', 'a.tracking_no', 'a.category', 'a.status', 'a.flags', 'a.is_minor', 'a.submitted_at',
  'a.created_at', 'a.reference_verified_at', 'p.first_name', 'p.last_name', 'p.id_number_enc', 'p.phone', 'p.email',
  'p.birth_date', 'ch.name as channel_name', 'su.name as sub_unit_name', 'c.name as city_name',
  's.name as school_name', 'e.school_other', 'u.name as university_name', 'e.university_other', 'e.university_type',
  'e.faculty', 'e.department', 'e.grade',
];

function withDocCounts(q) {
  return q.select(
    db.raw("(SELECT COUNT(*) FROM documents d WHERE d.application_id = a.id AND d.is_current = 1 AND d.review_status = 'revision_requested') AS revision_docs"),
  );
}

// ---------------------------------------------------------------------------
// Liste
// ---------------------------------------------------------------------------

async function list(admin, f) {
  const programId = await resolveProgramId(f.programId);
  const q = applyFilters(applyScope(baseQuery().where('a.program_id', programId), admin), f);

  const [{ total }] = await q.clone().clearSelect().count({ total: '*' });
  const rows = await withDocCounts(q.clone().select(LIST_COLUMNS))
    .orderByRaw('a.submitted_at IS NULL, a.submitted_at DESC, a.created_at DESC')
    .limit(f.pageSize)
    .offset((f.page - 1) * f.pageSize);

  return {
    items: rows.map((r) => listRow(r, admin)),
    page: f.page,
    pageSize: f.pageSize,
    total: Number(total),
    totalPages: Math.max(1, Math.ceil(Number(total) / f.pageSize)),
  };
}

// ---------------------------------------------------------------------------
// Detay
// ---------------------------------------------------------------------------

/** public_id + kapsam kontrolüyle başvuru satırı (kapsam dışıysa 404) */
async function findScoped(admin, publicId) {
  const row = await applyScope(baseQuery().where('a.public_id', publicId), admin).first('a.*');
  if (!row) throw notFound('Başvuru bulunamadı');
  return row;
}

async function resolveChannelFields(app) {
  const channel = app.channel_id ? await db('channels').where({ id: app.channel_id }).first() : null;
  const sub = app.sub_unit_id ? await db('sub_units').where({ id: app.sub_unit_id }).first() : null;
  const data = parseJson((await db('application_details').where({ application_id: app.id }).first())?.data) || {};
  const defs = [...(parseJson(channel?.extra_fields) || []), ...(parseJson(sub?.extra_fields) || [])];

  const fields = [];
  for (const d of defs) {
    const v = data[d.key];
    if (v === undefined || v === null || v === '') continue;
    let display = v;
    const table = { city: 'cities', district: 'districts', school: 'schools', dormitory: 'dormitories' }[d.type];
    if (table) display = (await db(table).where({ id: v }).first('name'))?.name || v;
    if (d.type === 'radio' || d.type === 'select') {
      const opt = (d.options || []).find((o) => (typeof o === 'object' ? o.value : o) === v);
      display = typeof opt === 'object' ? opt.label : opt || v;
    }
    fields.push({ key: d.key, label: d.label, value: display });
  }
  return { channel, sub, fields };
}

function allowedTransitions(admin, status) {
  return (TRANSITIONS[status] || [])
    // IBAN adımını aday başlatır, personel IBAN kontrolüyle bitirir (genel statü butonlarında yok)
    .filter((to) => !['iban_pending', 'finalized'].includes(to))
    .filter((to) => !(status === 'iban_pending' && to === 'approved'))
    .filter((to) => (['approved', 'rejected'].includes(to) || status === 'rejected' || status === 'approved'
      ? admin.can('decide') : admin.can('review')))
    .map((to) => ({ to, label: STATUS_LABELS[to] }));
}

async function detail(admin, publicId) {
  const app = await findScoped(admin, publicId);
  const applicant = await db('applicants').where({ id: app.applicant_id }).first();
  const fullId = admin.can('view_full_id');
  const idNumber = decrypt(applicant.id_number_enc);

  const [{ channel, sub, fields }, guardian, education, documents, notes, history, smsLogs, consents, refAdmin, program] = await Promise.all([
    resolveChannelFields(app),
    db('guardians').where({ application_id: app.id }).first(),
    db('education as e')
      .leftJoin('cities as c', 'c.id', 'e.city_id')
      .leftJoin('districts as d', 'd.id', 'e.district_id')
      .leftJoin('schools as s', 's.id', 'e.school_id')
      .leftJoin('universities as u', 'u.id', 'e.university_id')
      .where('e.application_id', app.id)
      .first('e.*', 'c.name as city_name', 'd.name as district_name', 's.name as school_name', 's.meb_code', 'u.name as university_name'),
    db('documents as d')
      .join('document_types as t', 't.id', 'd.document_type_id')
      .leftJoin('admin_users as r', 'r.id', 'd.reviewed_by')
      .where('d.application_id', app.id)
      .orderBy([{ column: 't.sort' }, { column: 'd.is_current', order: 'desc' }, { column: 'd.uploaded_at', order: 'desc' }])
      .select('d.*', 't.code as type_code', 't.name as type_name', 'r.full_name as reviewer_name'),
    db('application_notes as n').join('admin_users as u', 'u.id', 'n.admin_user_id')
      .where('n.application_id', app.id).orderBy('n.created_at', 'desc')
      .select('n.id', 'n.kind', 'n.body', 'n.created_at', 'u.full_name as author'),
    db('status_history as h').leftJoin('admin_users as u', 'u.id', 'h.actor_admin_id')
      .where('h.application_id', app.id).orderBy('h.id', 'asc')
      .select('h.*', 'u.full_name as admin_name'),
    db('sms_logs').where({ application_id: app.id }).orderBy('id', 'desc'),
    db('consents as c').join('consent_texts as t', 't.id', 'c.consent_text_id')
      .where('c.applicant_id', applicant.id).orderBy('c.accepted_at')
      .select('t.type', 't.title', 't.version', 'c.accepted_at', 'c.guardian_id'),
    app.reference_verified_by ? db('admin_users').where({ id: app.reference_verified_by }).first('full_name') : null,
    db('programs').where({ id: app.program_id }).first(),
  ]);

  return {
    id: app.public_id,
    trackingNo: app.tracking_no,
    program: { name: program.name, title: program.title },
    status: app.status,
    statusLabel: STATUS_LABELS[app.status],
    allowedTransitions: allowedTransitions(admin, app.status),
    category: app.category,
    categoryLabel: CATEGORY_LABELS[app.category] || null,
    flags: (parseJson(app.flags) || []).map((f) => ({ code: f, label: FLAG_LABELS[f] || f })),
    isMinor: !!app.is_minor,
    ageAtSubmit: app.age_at_submit,
    currentStep: app.current_step,
    submittedAt: app.submitted_at,
    decidedAt: app.decided_at,
    createdAt: app.created_at,
    rejectionReason: app.rejection_reason,
    reference: {
      verified: !!app.reference_verified_at,
      verifiedAt: app.reference_verified_at,
      verifiedBy: refAdmin?.full_name || null,
    },
    applicant: {
      firstName: applicant.first_name,
      lastName: applicant.last_name,
      idType: applicant.id_type,
      idNumber: fullId ? idNumber : maskIdNumber(idNumber),
      birthDate: applicant.birth_date,
      age: ageOn(applicant.birth_date, todayTR()),
      nationality: applicant.nationality,
      phone: formatTrMobile(applicant.phone),
      email: applicant.email,
    },
    channel: channel ? { name: channel.name, code: channel.code, subUnit: sub?.name || null, fields } : null,
    requirementsAcceptedAt: app.requirements_accepted_at,
    guardian: guardian ? {
      fullName: guardian.full_name,
      idType: guardian.id_type,
      idNumber: fullId ? decrypt(guardian.id_number_enc) : (guardian.id_type === 'PASAPORT' ? '********' : maskIdNumber(decrypt(guardian.id_number_enc))),
      phone: formatTrMobile(guardian.phone),
      verified: !!guardian.phone_verified_at,
      verifiedAt: guardian.phone_verified_at,
    } : null,
    education: education ? {
      city: education.city_name,
      district: education.district_name,
      school: education.school_name || education.school_other,
      schoolMebCode: education.meb_code || null,
      schoolNotInList: !!education.school_other,
      university: education.university_name || education.university_other,
      universityNotInList: !!education.university_other,
      universityType: education.university_type,
      faculty: education.faculty,
      department: education.department,
      grade: education.grade,
      fallRegistration: education.fall_registration,
    } : null,
    documents: documents.map((d) => ({
      id: d.public_id,
      typeCode: d.type_code,
      typeName: d.type_name,
      isCurrent: !!d.is_current,
      originalName: d.original_name,
      mime: d.mime,
      size: d.size_bytes,
      reviewStatus: d.review_status,
      reviewNote: d.review_note,
      reviewedBy: d.reviewer_name,
      reviewedAt: d.reviewed_at,
      uploadedAt: d.uploaded_at,
    })),
    notes: notes.map((n) => ({ id: n.id, kind: n.kind, body: n.body, author: n.author, createdAt: n.created_at })),
    history: history.map((h) => ({
      from: h.from_status,
      to: h.to_status,
      toLabel: STATUS_LABELS[h.to_status],
      actor: h.actor_type === 'admin' ? h.admin_name : h.actor_type === 'applicant' ? 'Aday' : 'Sistem',
      note: h.note,
      at: h.created_at,
    })),
    sms: smsLogs.map((s) => ({ template: s.template_code, status: s.status, at: s.created_at, deliveredAt: s.delivered_at })),
    consents: consents.map((c) => ({ type: c.type, title: c.title, version: c.version, acceptedAt: c.accepted_at, byGuardian: !!c.guardian_id })),
    bankAccounts: await iban.forAdmin(app, admin),
  };
}

async function getDocumentForAdmin(admin, publicId, documentId) {
  const app = await findScoped(admin, publicId);
  const doc = await db('documents').where({ application_id: app.id, public_id: documentId }).first();
  if (!doc) throw notFound('Belge bulunamadı');
  return { app, doc };
}

// ---------------------------------------------------------------------------
// İşlemler
// ---------------------------------------------------------------------------

const REVIEWABLE = ['submitted', 'in_review', 'revision_requested'];

async function reviewDocument(admin, publicId, documentId, { reviewStatus, note }) {
  const { app, doc } = await getDocumentForAdmin(admin, publicId, documentId);
  if (!REVIEWABLE.includes(app.status)) throw new AppError(409, 'NOT_REVIEWABLE', 'Bu durumdaki başvurunun belgeleri incelenemez');
  if (!doc.is_current) throw new AppError(409, 'ARCHIVED_DOCUMENT', 'Arşivlenmiş belge incelenemez');
  if (reviewStatus === 'revision_requested' && !note) {
    throw validationError({ note: 'Adaya gösterilecek revize gerekçesini yazın' });
  }
  await db('documents').where({ id: doc.id }).update({
    review_status: reviewStatus,
    review_note: note || null,
    reviewed_by: admin.id,
    reviewed_at: new Date(),
  });
}

async function setStatus(admin, publicId, { to, note, reason }) {
  const app = await findScoped(admin, publicId);
  if (!allowedTransitions(admin, app.status).some((t) => t.to === to)) {
    if (canTransition(app.status, to)) throw forbidden('Bu karar için yetkiniz yok');
    throw new AppError(409, 'INVALID_STATUS_TRANSITION', `"${STATUS_LABELS[app.status]}" durumundaki başvuru "${STATUS_LABELS[to] || to}" durumuna alınamaz`);
  }

  if (to === 'revision_requested') {
    const marked = await db('documents').where({ application_id: app.id, is_current: true, review_status: 'revision_requested' }).count({ n: '*' }).first();
    if (!Number(marked.n)) throw new AppError(422, 'NO_REVISION_DOCUMENTS', 'Önce yeniden yüklenmesi gereken belgeleri işaretleyin');
  }
  if (to === 'rejected' && !reason) throw validationError({ reason: 'Red gerekçesini yazın' });

  await db.transaction(async (trx) => {
    await changeStatus(trx, { applicationId: app.id, from: app.status, to, actorType: 'admin', adminId: admin.id, note: note || reason || null });
    const patch = {
      ...(to === 'approved' || to === 'rejected' ? { decided_at: new Date() } : {}),
      ...(to === 'rejected' ? { rejection_reason: reason } : {}),
      ...(to === 'in_review' && ['rejected', 'approved'].includes(app.status) ? { rejection_reason: null, decided_at: null } : {}),
    };
    if (Object.keys(patch).length) await trx('applications').where({ id: app.id }).update(patch);
  });

  // Adaya bildirim (spec: sadece onayda SMS; revize de adayın işlem yapması gerektiği için bildirilir)
  const template = { approved: 'application_approved', revision_requested: 'revision_requested' }[to];
  if (template) {
    const applicant = await db('applicants').where({ id: app.applicant_id }).first('phone');
    try {
      await sms.sendTemplate(template, applicant.phone, { tracking_no: app.tracking_no }, { applicationId: app.id });
    } catch (err) {
      logger.error({ err: err.message, applicationId: app.id, template }, 'Statü SMS\'i gönderilemedi');
    }
  }
}

async function addNote(admin, publicId, { kind, body }) {
  const app = await findScoped(admin, publicId);
  await db('application_notes').insert({ application_id: app.id, admin_user_id: admin.id, kind, body, created_at: new Date() });
}

async function setReference(admin, publicId, verified) {
  const app = await findScoped(admin, publicId);
  await db('applications').where({ id: app.id }).update({
    reference_verified_at: verified ? new Date() : null,
    reference_verified_by: verified ? admin.id : null,
  });
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

async function dashboard(admin, programId) {
  const pid = await resolveProgramId(programId);
  const scoped = () => applyScope(baseQuery().where('a.program_id', pid), admin);

  const [byStatus, byCategory, byChannel, daily, flags] = await Promise.all([
    scoped().clearSelect().select('a.status').count({ n: '*' }).groupBy('a.status'),
    scoped().whereNot('a.status', 'draft').clearSelect().select('a.category').count({ n: '*' }).groupBy('a.category'),
    scoped().whereNot('a.status', 'draft').whereNotNull('a.channel_id').clearSelect()
      .select('ch.name as channel', 'su.name as subUnit').count({ n: '*' })
      .groupBy('ch.name', 'su.name').orderBy('n', 'desc').limit(15),
    scoped().whereNotNull('a.submitted_at')
      .where('a.submitted_at', '>=', new Date(Date.now() - 30 * 86400000))
      .clearSelect()
      .select(db.raw("DATE(CONVERT_TZ(a.submitted_at, '+00:00', '+03:00')) AS day"))
      .count({ n: '*' })
      .groupByRaw("DATE(CONVERT_TZ(a.submitted_at, '+00:00', '+03:00'))")
      .orderBy('day'),
    scoped().whereNotNull('a.flags').whereNot('a.status', 'draft').clearSelect().select('a.flags'),
  ]);

  const statusCounts = Object.fromEntries(Object.keys(STATUS_LABELS).map((k) => [k, 0]));
  for (const r of byStatus) statusCounts[r.status] = Number(r.n);

  const flagCounts = {};
  for (const r of flags) for (const f of parseJson(r.flags) || []) flagCounts[f] = (flagCounts[f] || 0) + 1;

  const credit = admin.can('manage_settings') ? await sms.getCredit() : null;

  return {
    status: Object.entries(statusCounts).map(([code, count]) => ({ code, label: STATUS_LABELS[code], count })),
    totalSubmitted: Object.entries(statusCounts).filter(([k]) => k !== 'draft').reduce((a, [, v]) => a + v, 0),
    byCategory: byCategory.map((r) => ({ code: r.category, label: CATEGORY_LABELS[r.category] || 'Seçilmedi', count: Number(r.n) })),
    byChannel: byChannel.map((r) => ({ channel: r.channel, subUnit: r.subUnit, count: Number(r.n) })),
    daily: daily.map((r) => ({ day: typeof r.day === 'string' ? r.day : new Date(r.day).toISOString().slice(0, 10), count: Number(r.n) })),
    flags: Object.entries(flagCounts).map(([code, count]) => ({ code, label: FLAG_LABELS[code] || code, count })),
    smsCredit: credit,
  };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

async function exportRows(admin, f) {
  const programId = await resolveProgramId(f.programId);
  const q = applyFilters(applyScope(baseQuery().where('a.program_id', programId), admin), f);
  const rows = await withDocCounts(q.select(LIST_COLUMNS)).orderByRaw('a.submitted_at IS NULL, a.submitted_at ASC');
  return rows.map((r) => ({ ...listRow(r, admin), phone: formatTrMobile(r.phone), email: r.email, birthDate: r.birth_date, universityType: r.university_type, faculty: r.faculty, department: r.department, grade: r.grade }));
}

/** Ödeme listesi (kesinleşmiş bursiyerler, tam IBAN). Kapsamla sınırlı. */
async function paymentRows(admin, programId) {
  const pid = await resolveProgramId(programId);
  const q = iban.paymentQuery().where('a.program_id', pid)
    .leftJoin('education as e', 'e.application_id', 'a.id')
    .leftJoin('channels as ch', 'ch.id', 'a.channel_id')
    .leftJoin('sub_units as su', 'su.id', 'a.sub_unit_id')
    .select('a.tracking_no', 'a.category', 'p.first_name', 'p.last_name', 'p.id_number_enc', 'p.phone',
      'b.iban_enc', 'b.bank_code_raw', 'k.name as bank_name', 'b.holder_name', 'b.verified_at',
      'ch.name as channel_name', 'su.name as sub_unit_name')
    .orderBy(['p.last_name', 'p.first_name']);
  const rows = await applyScope(q, admin);
  const { formatIban } = require('../lib/iban');
  return rows.map((r) => ({
    trackingNo: r.tracking_no,
    fullName: `${r.first_name} ${r.last_name}`,
    idNumber: decrypt(r.id_number_enc),
    phone: formatTrMobile(r.phone),
    category: CATEGORY_LABELS[r.category] || '',
    channel: [r.channel_name, r.sub_unit_name].filter(Boolean).join(' · '),
    holderName: r.holder_name,
    iban: formatIban(decrypt(r.iban_enc)),
    bank: r.bank_name || `Banka kodu ${r.bank_code_raw}`,
    verifiedAt: r.verified_at,
  }));
}

module.exports = {
  paymentRows, findScoped,
  FLAG_LABELS, list, detail, getDocumentForAdmin, reviewDocument, setStatus, addNote, setReference, dashboard, exportRows,
};
