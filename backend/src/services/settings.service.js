/**
 * Aşama 9: panelden yönetilen ayarlar.
 *   - Dönem: aç / kapat, başlangıç-bitiş tarihi, başlık, takip no ön eki, yeni dönem
 *   - Onay metinleri: sürümlü. Onaylanmış bir metin değişirse yeni sürüm açılır; eski onaylar eski sürüme bağlı kalır.
 *   - Ekran metinleri (content_blocks)
 *   - SMS şablonları: izinli değişkenler kontrol edilir, doğrulama kodu şablonları kapatılamaz
 */
const db = require('../db/knex');
const { AppError, notFound, validationError } = require('../lib/errors');
const sms = require('./sms');

// ---------------------------------------------------------------------------
// Onay metni tipleri
// ---------------------------------------------------------------------------

const CONSENT_TYPES = {
  kvkk: { name: 'KVKK Aydınlatma Metni ve Açık Rıza', usedIn: 'Adım 1: tüm adaylar' },
  sharing: { name: 'Protokol kurumlarıyla paylaşım rızası', usedIn: 'Adım 1: tüm adaylar' },
  guardian: { name: 'Veli / vasi açık rızası', usedIn: 'Adım 4: 18 yaş altı adayların velisi' },
  criminal_record: { name: 'Adli sicil açık rızası', usedIn: 'Adım 6: adli sicil belgesi yüklenirken' },
  requirements_yl: { name: 'Yüksek lisans şartları', usedIn: 'Adım 4: yüksek lisans adayları' },
  requirements_dr: { name: 'Doktora şartları', usedIn: 'Adım 4: doktora adayları' },
};

const CONTENT_BLOCKS = {
  applications_closed: { usedIn: 'Açılış sayfası: başvurular kapalıyken', placeholders: [] },
  submit_success: { usedIn: 'Başvuru gönderildikten sonra', placeholders: ['tracking_no', 'program_name'] },
  iban_warning: { usedIn: 'Adım 8: IBAN formunun üstündeki uyarı', placeholders: [] },
  finalize_success: { usedIn: 'IBAN onaylanıp kayıt kesinleşince aday sayfası', placeholders: [] },
};

const SMS_TEMPLATES = {
  otp_applicant: { placeholders: ['code'], required: ['code'], otp: true, usedIn: 'Kayıt olurken adaya' },
  otp_guardian: { placeholders: ['code', 'applicant_name'], required: ['code'], otp: true, usedIn: 'Veli onayı' },
  otp_login: { placeholders: ['code'], required: ['code'], otp: true, usedIn: 'Aday ve admin girişi' },
  application_submitted: { placeholders: ['tracking_no'], required: [], usedIn: 'Başvuru gönderilince' },
  revision_requested: { placeholders: ['tracking_no'], required: [], usedIn: 'Statü "Revize İstendi" olunca' },
  application_approved: { placeholders: ['tracking_no'], required: [], usedIn: 'Başvuru onaylanınca (IBAN girişine davet)' },
  iban_rejected: { placeholders: ['tracking_no'], required: [], usedIn: 'Personel IBAN\'ı reddedince' },
  bursiyer_finalized: { placeholders: ['tracking_no'], required: [], usedIn: 'IBAN onaylanıp kayıt kesinleşince' },
};

const SAMPLE_VARS = { code: '123456', applicant_name: 'Ahmet Yılmaz', tracking_no: 'OND-2026-12345' };

// ---------------------------------------------------------------------------
// Dönem
// ---------------------------------------------------------------------------

/** Dönemin başvuruya açılabilmesi için eksikler */
async function readiness() {
  const issues = [];
  for (const [type, meta] of Object.entries(CONSENT_TYPES)) {
    const row = await db('consent_texts').where({ type, is_active: true }).whereNotNull('body').first('id');
    if (!row) issues.push({ code: `consent_missing:${type}`, message: `"${meta.name}" metni yayında değil` });
  }
  const docTypes = await db('document_types').where({ is_active: true }).count({ n: '*' }).first();
  if (!Number(docTypes.n)) issues.push({ code: 'no_document_types', message: 'Aktif belge tipi yok' });
  return issues;
}

function serializeProgram(p, extra = {}) {
  return {
    id: p.id,
    name: p.name,
    title: p.title,
    trackingPrefix: p.tracking_prefix,
    isOpen: !!p.is_open,
    opensAt: p.opens_at,
    closesAt: p.closes_at,
    updatedAt: p.updated_at,
    ...extra,
  };
}

/** Kapalı / tarihi gelmemiş / süresi dolmuş / açık */
function effectiveState(p, now = new Date()) {
  if (!p.is_open) return 'closed';
  if (p.opens_at && new Date(p.opens_at) > now) return 'scheduled';
  if (p.closes_at && new Date(p.closes_at) < now) return 'ended';
  return 'open';
}

async function listPrograms() {
  const rows = await db('programs').orderBy('id', 'desc');
  const counts = await db('applications').select('program_id')
    .count({ total: '*' })
    .sum({ submitted: db.raw("CASE WHEN status <> 'draft' THEN 1 ELSE 0 END") })
    .groupBy('program_id');
  const issues = await readiness();
  return {
    readiness: issues,
    programs: rows.map((p) => {
      const c = counts.find((x) => x.program_id === p.id);
      return serializeProgram(p, {
        state: effectiveState(p),
        applicationCount: Number(c?.total || 0),
        submittedCount: Number(c?.submitted || 0),
      });
    }),
  };
}

async function updateProgram(id, input) {
  const program = await db('programs').where({ id }).first();
  if (!program) throw notFound('Dönem bulunamadı');

  const patch = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.opensAt !== undefined) patch.opens_at = input.opensAt ? new Date(input.opensAt) : null;
  if (input.closesAt !== undefined) patch.closes_at = input.closesAt ? new Date(input.closesAt) : null;

  const opensAt = patch.opens_at !== undefined ? patch.opens_at : program.opens_at;
  const closesAt = patch.closes_at !== undefined ? patch.closes_at : program.closes_at;
  if (opensAt && closesAt && new Date(opensAt) >= new Date(closesAt)) {
    throw validationError({ closesAt: 'Bitiş tarihi başlangıçtan sonra olmalı' });
  }

  if (input.trackingPrefix !== undefined && input.trackingPrefix !== program.tracking_prefix) {
    const used = await db('applications').where({ program_id: id }).whereNotNull('tracking_no').first('id');
    if (used) throw validationError({ trackingPrefix: 'Takip numarası verilmiş başvuru varken ön ek değiştirilemez' });
    patch.tracking_prefix = input.trackingPrefix;
  }

  if (input.isOpen !== undefined) {
    if (input.isOpen) {
      const issues = await readiness();
      if (issues.length) {
        throw new AppError(422, 'PROGRAM_NOT_READY', 'Dönem açılamaz, önce eksikleri tamamlayın', { isOpen: issues.map((i) => i.message).join(' · ') });
      }
      if (closesAt && new Date(closesAt) < new Date()) {
        throw validationError({ closesAt: 'Bitiş tarihi geçmiş; dönemi açmak için tarihi güncelleyin' });
      }
    }
    patch.is_open = input.isOpen;
  }

  if (!Object.keys(patch).length) return;
  await db.transaction(async (trx) => {
    // Aynı anda tek dönem başvuruya açık olur
    if (patch.is_open) await trx('programs').whereNot({ id }).update({ is_open: false });
    await trx('programs').where({ id }).update({ ...patch, updated_at: new Date() });
  });
}

async function createProgram({ name, title, trackingPrefix }) {
  if (await db('programs').where({ name }).first()) throw validationError({ name: 'Bu isimde dönem zaten var' });
  if (await db('programs').where({ tracking_prefix: trackingPrefix }).first()) {
    throw validationError({ trackingPrefix: 'Bu ön ek başka bir dönemde kullanılıyor' });
  }
  const [id] = await db('programs').insert({ name, title, tracking_prefix: trackingPrefix, is_open: false });
  return id;
}

// ---------------------------------------------------------------------------
// Onay metinleri
// ---------------------------------------------------------------------------

async function listConsents() {
  const rows = await db('consent_texts as t')
    .leftJoin('admin_users as u', 'u.id', 't.updated_by')
    .select('t.*', 'u.full_name as updated_by_name')
    .select(db.raw('(SELECT COUNT(*) FROM consents c WHERE c.consent_text_id = t.id) AS accepted_count'))
    .orderBy([{ column: 't.type' }, { column: 't.version', order: 'desc' }]);

  return Object.entries(CONSENT_TYPES).map(([type, meta]) => {
    const versions = rows.filter((r) => r.type === type).map((r) => ({
      id: r.id,
      version: r.version,
      title: r.title,
      label: r.label,
      body: r.body,
      isActive: !!r.is_active,
      acceptedCount: Number(r.accepted_count),
      updatedAt: r.updated_at,
      updatedBy: r.updated_by_name,
    }));
    const published = versions.find((v) => v.isActive && v.body);
    return { type, name: meta.name, usedIn: meta.usedIn, published: published?.version || null, versions };
  });
}

/**
 * Metni kaydeder ve yayına alır.
 * En son sürüm henüz kimse tarafından onaylanmadıysa o sürüm güncellenir; onaylandıysa yeni sürüm açılır.
 * Yayındaki sürüm her zaman tektir.
 * @returns {{ version: number, created: boolean }}
 */
async function publishConsent(type, { title, label, body }, adminId) {
  if (!CONSENT_TYPES[type]) throw notFound('Metin tipi bulunamadı');
  return db.transaction(async (trx) => {
    const latest = await trx('consent_texts').where({ type }).orderBy('version', 'desc').forUpdate().first();
    const accepted = latest
      ? Number((await trx('consents').where({ consent_text_id: latest.id }).count({ n: '*' }).first()).n)
      : 0;
    const same = latest && latest.title === title && latest.label === label && latest.body === body;

    await trx('consent_texts').where({ type }).update({ is_active: false });
    let version;
    let created = false;
    if (latest && (accepted === 0 || same)) {
      version = latest.version;
      await trx('consent_texts').where({ id: latest.id }).update({
        title, label, body, is_active: true, updated_by: adminId, updated_at: new Date(),
      });
    } else {
      version = (latest?.version || 0) + 1;
      created = true;
      await trx('consent_texts').insert({
        type, version, title, label, body, is_active: true, updated_by: adminId,
      });
    }
    return { version, created };
  });
}

// ---------------------------------------------------------------------------
// Ekran metinleri
// ---------------------------------------------------------------------------

async function listContent() {
  const rows = await db('content_blocks').orderBy('key');
  return rows.map((r) => ({
    key: r.key,
    title: r.title,
    body: r.body,
    updatedAt: r.updated_at,
    usedIn: CONTENT_BLOCKS[r.key]?.usedIn || null,
    placeholders: CONTENT_BLOCKS[r.key]?.placeholders || [],
  }));
}

async function updateContent(key, { title, body }) {
  const n = await db('content_blocks').where({ key }).update({ title, body, updated_at: new Date() });
  if (!n) throw notFound('Metin bulunamadı');
}

// ---------------------------------------------------------------------------
// SMS şablonları
// ---------------------------------------------------------------------------

/** GSM-7 dışı karakter varsa SMS 70, yoksa 160 karakter (çok parçalıda 67 / 153) */
function smsParts(text) {
  // eslint-disable-next-line no-control-regex
  const gsm = /^[\n\r -_a-zA-Z0-9@£$¥èéùìòÇØøÅåΔΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà^{}\\[~\]|€]*$/.test(text);
  const len = text.length;
  const [single, multi] = gsm ? [160, 153] : [70, 67];
  return { length: len, unicode: !gsm, parts: len <= single ? 1 : Math.ceil(len / multi) };
}

function serializeTemplate(r) {
  const meta = SMS_TEMPLATES[r.code] || { placeholders: [], required: [] };
  const preview = sms.render(r.body, SAMPLE_VARS);
  return {
    code: r.code,
    name: r.name,
    body: r.body,
    isActive: !!r.is_active,
    isOtp: !!meta.otp,
    usedIn: meta.usedIn || null,
    placeholders: meta.placeholders,
    required: meta.required,
    preview,
    ...smsParts(preview),
    updatedAt: r.updated_at,
  };
}

async function listSmsTemplates() {
  const rows = await db('sms_templates').orderBy('code');
  return rows.map(serializeTemplate);
}

async function updateSmsTemplate(code, { body, isActive }) {
  const row = await db('sms_templates').where({ code }).first();
  if (!row) throw notFound('Şablon bulunamadı');
  const meta = SMS_TEMPLATES[code] || { placeholders: [], required: [] };

  const used = [...body.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  const unknown = used.filter((u) => !meta.placeholders.includes(u));
  if (unknown.length) {
    throw validationError({ body: `Bu şablonda kullanılamayan değişken: ${[...new Set(unknown)].map((u) => `{${u}}`).join(', ')}` });
  }
  const missing = meta.required.filter((r) => !used.includes(r));
  if (missing.length) throw validationError({ body: `Şu değişken zorunlu: ${missing.map((m) => `{${m}}`).join(', ')}` });
  if (meta.otp && isActive === false) throw validationError({ isActive: 'Doğrulama kodu SMS\'i kapatılamaz' });
  if (smsParts(sms.render(body, SAMPLE_VARS)).parts > 4) throw validationError({ body: 'Mesaj en fazla 4 SMS uzunluğunda olabilir' });

  await db('sms_templates').where({ code }).update({
    body,
    ...(isActive !== undefined ? { is_active: isActive } : {}),
    updated_at: new Date(),
  });
  return serializeTemplate(await db('sms_templates').where({ code }).first());
}

/** Şablonu örnek değerlerle adminin kendi telefonuna gönderir */
async function sendTestSms(code, phone) {
  const row = await db('sms_templates').where({ code }).first();
  if (!row) throw notFound('Şablon bulunamadı');
  if (!row.is_active) throw new AppError(409, 'TEMPLATE_INACTIVE', 'Şablon kapalı; test için önce açın');
  if (!phone) throw new AppError(422, 'NO_PHONE', 'Hesabınızda telefon numarası yok');
  await sms.sendTemplate(code, phone, SAMPLE_VARS, { kind: 'info' });
}

module.exports = {
  CONSENT_TYPES,
  readiness,
  listPrograms,
  updateProgram,
  createProgram,
  listConsents,
  publishConsent,
  listContent,
  updateContent,
  listSmsTemplates,
  updateSmsTemplate,
  sendTestSms,
  smsParts,
};
