/**
 * Aday ve başvuru işlemleri (Adım 1-5). Belgeler (Adım 6) document.service'te, gönderim (Adım 7) Aşama 7'de.
 */
const crypto = require('crypto');
const db = require('../db/knex');
const { encrypt, decrypt, hmac } = require('../lib/crypto');
const { maskIdNumber } = require('../lib/identity');
const { maskTrMobile } = require('../lib/phone');
const { ageOn, todayTR } = require('../lib/age');
const { validateExtraFields, parseJson } = require('../lib/rules');
const { AppError, notFound, validationError } = require('../lib/errors');
const { changeStatus, STATUS_LABELS } = require('./status.service');
const { checkRefs } = require('./lookup.service');

const CATEGORY_LABELS = {
  lise: 'Lise Bursu',
  universite: 'Üniversite Bursu',
  yuksek_lisans: 'Yüksek Lisans Bursu',
  doktora: 'Doktora Bursu',
};
const LISANSUSTU = ['yuksek_lisans', 'doktora'];
const MIN_BIRTH_YEAR = { yuksek_lisans: 1999, doktora: 1991 };
const REQUIREMENTS_CONSENT = { yuksek_lisans: 'requirements_yl', doktora: 'requirements_dr' };
const ISTANBUL = 34;

const idNumberHash = (idNumber) => hmac(`idno|${idNumber}`);

// ---------------------------------------------------------------------------
// Program ve metinler
// ---------------------------------------------------------------------------

/** Şu an başvuruya açık dönem (yoksa null) */
async function getOpenProgram() {
  const now = new Date();
  return db('programs')
    .where({ is_open: true })
    .andWhere((q) => q.whereNull('opens_at').orWhere('opens_at', '<=', now))
    .andWhere((q) => q.whereNull('closes_at').orWhere('closes_at', '>=', now))
    .orderBy('id', 'desc')
    .first();
}

async function requireOpenProgram() {
  const program = await getOpenProgram();
  if (!program) throw new AppError(403, 'APPLICATIONS_CLOSED', 'Başvurular şu an kapalıdır');
  return program;
}

/** Tipinin yayındaki (aktif ve metni girilmiş) en son versiyonu */
async function getActiveConsentText(type) {
  return db('consent_texts')
    .where({ type, is_active: true })
    .whereNotNull('body')
    .orderBy('version', 'desc')
    .first();
}

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

function getFlags(app) {
  return parseJson(app.flags) || [];
}

/** Bayrak ekler/kaldırır, değiştiyse yazar */
async function setFlag(trx, app, flag, on) {
  const flags = new Set(getFlags(app));
  const had = flags.has(flag);
  if (on === had) return;
  if (on) flags.add(flag); else flags.delete(flag);
  const value = flags.size ? JSON.stringify([...flags]) : null;
  await trx('applications').where({ id: app.id }).update({ flags: value });
  app.flags = value; // aynı istek içindeki sonraki setFlag çağrıları için
}

/** Yaş işlem gününe göre (Türkiye saati) hesaplanır */
function ageInfo(applicant) {
  const age = ageOn(applicant.birth_date, todayTR());
  return { age, isMinor: age < 18 };
}

const advanceStep = (trx, app, step) => (app.current_step < step
  ? trx('applications').where({ id: app.id }).update({ current_step: step })
  : null);

// ---------------------------------------------------------------------------
// Kayıt (Adım 1-2)
// ---------------------------------------------------------------------------

async function findApplicantByIdNumber(idNumber) {
  return db('applicants').where({ id_number_hash: idNumberHash(idNumber) }).first();
}

/**
 * OTP doğrulandıktan sonra aday + taslak başvuru + KVKK onayları tek transaction'da oluşturulur.
 * @param {object} p { reg (Adım 1 verisi), program, consentTextIds, ip, userAgent }
 */
async function createRegistration({ reg, program, consentTextIds, ip, userAgent }) {
  return db.transaction(async (trx) => {
    const hash = idNumberHash(reg.idNumber);
    if (await trx('applicants').where({ id_number_hash: hash }).first()) {
      throw new AppError(409, 'ALREADY_REGISTERED', 'Bu kimlik numarasıyla kayıt zaten var, lütfen giriş yapın');
    }

    const now = new Date();
    const [applicantId] = await trx('applicants').insert({
      id_type: reg.idType,
      id_number_enc: encrypt(reg.idNumber),
      id_number_hash: hash,
      first_name: reg.firstName,
      last_name: reg.lastName,
      birth_date: reg.birthDate,
      nationality: reg.idType === 'YKN' ? reg.nationality : 'T.C.',
      phone: reg.phone,
      email: reg.email,
      phone_verified_at: now,
    });

    const flags = [];

    const age = ageOn(reg.birthDate, todayTR());
    const [applicationId] = await trx('applications').insert({
      public_id: crypto.randomUUID(),
      program_id: program.id,
      applicant_id: applicantId,
      status: 'draft',
      current_step: 3,
      is_minor: age < 18,
      flags: flags.length ? JSON.stringify(flags) : null,
    });

    await changeStatus(trx, { applicationId, from: null, to: 'draft', actorType: 'applicant' });

    await trx('consents').insert(consentTextIds.map((consentTextId) => ({
      applicant_id: applicantId,
      application_id: applicationId,
      consent_text_id: consentTextId,
      accepted_at: now,
      ip: ip || '',
      user_agent: userAgent ? String(userAgent).slice(0, 512) : null,
    })));

    return { applicantId, applicationId };
  });
}

// ---------------------------------------------------------------------------
// Başvuru okuma
// ---------------------------------------------------------------------------

/** Adayın açık dönemdeki başvurusu; açık dönem yoksa en son başvurusu */
async function getApplicationRow(applicantId) {
  const program = await getOpenProgram();
  const q = db('applications as a')
    .join('programs as p', 'p.id', 'a.program_id')
    .where('a.applicant_id', applicantId)
    .select('a.*', 'p.name as program_name', 'p.title as program_title', 'p.is_open as program_is_open');
  if (program) q.andWhere('a.program_id', program.id);
  return q.orderBy('a.id', 'desc').first();
}

function serializeApplicant(a) {
  return {
    firstName: a.first_name,
    lastName: a.last_name,
    idType: a.id_type,
    idNumberMasked: maskIdNumber(decrypt(a.id_number_enc)),
    birthDate: a.birth_date,
    nationality: a.nationality,
    phoneMasked: maskTrMobile(a.phone),
    email: a.email,
  };
}

function serializeApplication(app) {
  if (!app) return null;
  return {
    id: app.public_id,
    program: { name: app.program_name, title: app.program_title },
    status: app.status,
    statusLabel: STATUS_LABELS[app.status],
    category: app.category,
    categoryLabel: CATEGORY_LABELS[app.category] || null,
    currentStep: app.current_step,
    isMinor: !!app.is_minor,
    editable: app.status === 'draft',
    trackingNo: app.tracking_no,
    submittedAt: app.submitted_at,
  };
}

async function getMe(applicantId) {
  const applicant = await db('applicants').where({ id: applicantId }).first();
  if (!applicant) throw notFound('Aday bulunamadı');
  const app = await getApplicationRow(applicantId);
  return { applicant: serializeApplicant(applicant), application: serializeApplication(app) };
}

/** Düzenlenebilir (taslak, dönemi açık) başvuru + aday */
async function requireEditableApplication(applicantId) {
  const app = await getApplicationRow(applicantId);
  if (!app) throw notFound('Başvuru bulunamadı');
  if (!app.program_is_open) throw new AppError(403, 'APPLICATIONS_CLOSED', 'Başvuru dönemi kapanmıştır');
  if (app.status !== 'draft') {
    throw new AppError(409, 'APPLICATION_LOCKED', 'Gönderilmiş başvuru değiştirilemez');
  }
  const applicant = await db('applicants').where({ id: applicantId }).first();
  return { app, applicant };
}

function requireCategory(app, allowed) {
  if (!app.category) throw new AppError(409, 'STEP_ORDER', 'Önce burs kategorisini seçin (Adım 3)');
  if (allowed && !allowed.includes(app.category)) {
    throw new AppError(409, 'WRONG_CATEGORY', 'Bu işlem seçtiğiniz kategori için geçerli değil');
  }
}

// ---------------------------------------------------------------------------
// Adım 3: kategori
// ---------------------------------------------------------------------------

/**
 * Kategori değişirse kategoriye bağlı veriler (kanal, ek alanlar, eğitim bilgisi, şart beyanı)
 * silinir. Veli bilgisi yaşa bağlı olduğu için korunur.
 */
async function setCategory(applicantId, category) {
  const { app } = await requireEditableApplication(applicantId);
  const changed = app.category && app.category !== category;

  await db.transaction(async (trx) => {
    if (changed) {
      await trx('application_details').where({ application_id: app.id }).del();
      await trx('education').where({ application_id: app.id }).del();
      await trx('applications').where({ id: app.id }).update({ requirements_accepted_at: null });
      await setFlag(trx, app, 'birth_year_out_of_range', false);
      await setFlag(trx, app, 'school_not_in_list', false);
      // Kategori değişince istenen belgeler de değişir: mevcut belgeler arşivlenir
      await trx('documents').where({ application_id: app.id, is_current: true }).update({ is_current: false });
    }
    await trx('applications').where({ id: app.id }).update({
      category,
      ...(changed || !app.category ? { channel_id: null, sub_unit_id: null, current_step: 4 } : {}),
    });
  });

  return { changed: !!changed, application: serializeApplication(await getApplicationRow(applicantId)) };
}

// ---------------------------------------------------------------------------
// Adım 4: kanal + ek alanlar (lise, üniversite)
// ---------------------------------------------------------------------------

async function setChannel(applicantId, { channelId, subUnitId, fields }) {
  const { app, applicant } = await requireEditableApplication(applicantId);
  requireCategory(app, ['lise', 'universite']);

  const channel = await db('channels').where({ id: channelId, category: app.category, is_active: true }).first();
  if (!channel) throw validationError({ channelId: 'Listeden bir başvuru kanalı seçin' });

  const subUnits = await db('sub_units').where({ channel_id: channel.id, is_active: true });
  let subUnit = null;
  if (subUnits.length) {
    subUnit = subUnits.find((u) => u.id === subUnitId);
    if (!subUnit) throw validationError({ subUnitId: 'Listeden bir birim seçin' });
  }

  const defs = [...(parseJson(channel.extra_fields) || []), ...(parseJson(subUnit?.extra_fields) || [])];
  const input = { ...(fields || {}) };
  // Uluslararası AİHL: uyruk boş bırakılırsa adayın uyruğu kullanılır
  for (const f of defs) {
    if (f.prefill === 'applicant.nationality' && !input[f.key]) input[f.key] = applicant.nationality;
  }

  const { data, errors, refs } = validateExtraFields(defs, input);
  const labels = Object.fromEntries(defs.map((f) => [f.key, f.label]));
  Object.assign(errors, await checkRefs(refs, labels));
  if (Object.keys(errors).length) {
    throw validationError(Object.fromEntries(Object.entries(errors).map(([k, v]) => [`fields.${k}`, v])));
  }

  const previousChannel = app.channel_id;
  let educationCleared = false;

  await db.transaction(async (trx) => {
    await trx('applications').where({ id: app.id }).update({ channel_id: channel.id, sub_unit_id: subUnit?.id || null });
    await trx('application_details')
      .insert({ application_id: app.id, data: JSON.stringify(data), updated_at: new Date() })
      .onConflict('application_id').merge();

    // Lisede okul/il kanala bağlı olabilir (spor, uluslararası, teşkilat bölgesi): kanal değişince eğitim bilgisi sıfırlanır
    if (app.category === 'lise' && previousChannel && previousChannel !== channel.id) {
      educationCleared = (await trx('education').where({ application_id: app.id }).del()) > 0;
    }
    if (!ageInfo(applicant).isMinor) await advanceStep(trx, app, 5);
  });

  return { educationCleared, application: await getApplicationDetail(applicantId) };
}

// ---------------------------------------------------------------------------
// Adım 4: YL / Doktora şart beyanı
// ---------------------------------------------------------------------------

async function acceptRequirements(applicantId, { ip, userAgent }) {
  const { app, applicant } = await requireEditableApplication(applicantId);
  requireCategory(app, LISANSUSTU);

  const text = await getActiveConsentText(REQUIREMENTS_CONSENT[app.category]);
  if (!text) throw new AppError(503, 'CONSENT_TEXT_MISSING', 'Başvuru şartları metni henüz yayınlanmadı');

  const birthYear = Number(applicant.birth_date.slice(0, 4));
  const outOfRange = birthYear < MIN_BIRTH_YEAR[app.category];

  await db.transaction(async (trx) => {
    await trx('consents').insert({
      applicant_id: applicant.id,
      application_id: app.id,
      consent_text_id: text.id,
      accepted_at: new Date(),
      ip: ip || '',
      user_agent: userAgent ? String(userAgent).slice(0, 512) : null,
    });
    await trx('applications').where({ id: app.id }).update({ requirements_accepted_at: new Date() });
    // Şart dışı doğum yılı başvuruyu engellemez, admin panelinde işaretli görünür
    await setFlag(trx, app, 'birth_year_out_of_range', outOfRange);
    if (!ageInfo(applicant).isMinor) await advanceStep(trx, app, 5);
  });

  return {
    birthYearWarning: outOfRange
      ? `Doğum yılınız (${birthYear}) başvuru şartındaki ${MIN_BIRTH_YEAR[app.category]} ve sonrası koşulunu sağlamıyor. Başvurunuz yine de alınacak ve değerlendirmede dikkate alınacaktır.`
      : null,
    application: await getApplicationDetail(applicantId),
  };
}

// ---------------------------------------------------------------------------
// Adım 5: eğitim bilgileri
// ---------------------------------------------------------------------------

/**
 * Kategoriye göre farklı alanlar. Bazı değerler kanaldan kilitli gelir:
 *   - Spor / Uluslararası AİHL: okul Adım 4'te seçildi -> il, ilçe, okul oradan
 *   - Teşkilat İstanbul: il İstanbul | Teşkilat Anadolu: il Adım 4'te seçilen il
 */
async function setEducation(applicantId, body) {
  const { app } = await requireEditableApplication(applicantId);
  requireCategory(app);
  const errors = {};
  const row = {
    application_id: app.id,
    city_id: null, district_id: null, school_id: null, school_other: null,
    university_id: null, university_other: null, university_type: null,
    faculty: null, department: null, grade: null, fall_registration: null,
    updated_at: new Date(),
  };

  if (app.category === 'lise') {
    const channel = app.channel_id ? await db('channels').where({ id: app.channel_id }).first() : null;
    if (!channel) throw new AppError(409, 'STEP_ORDER', 'Önce başvuru kanalını seçin (Adım 4)');
    const details = parseJson((await db('application_details').where({ application_id: app.id }).first())?.data) || {};

    let lockedSchool = null;
    if (['lise_spor', 'lise_uluslararasi'].includes(channel.code) && details.school_id) {
      lockedSchool = await db('schools').where({ id: details.school_id }).first();
    }

    if (lockedSchool) {
      Object.assign(row, { city_id: lockedSchool.city_id, district_id: lockedSchool.district_id, school_id: lockedSchool.id });
    } else {
      let cityId = body.cityId;
      if (channel.code === 'lise_teskilat') {
        cityId = details.region === 'istanbul' ? ISTANBUL : details.city_id;
      }
      if (!cityId) errors.cityId = 'İl seçin';
      if (!body.districtId) errors.districtId = 'İlçe seçin';

      if (cityId && body.districtId) {
        const district = await db('districts').where({ id: body.districtId, city_id: cityId }).first();
        if (!district) errors.districtId = 'Seçilen ile ait bir ilçe seçin';
      }
      if (body.schoolId) {
        const school = await db('schools').where({ id: body.schoolId, is_active: true }).first();
        if (!school || school.city_id !== cityId || school.district_id !== body.districtId) {
          errors.schoolId = 'Seçilen il ve ilçedeki okullardan birini seçin';
        }
        row.school_id = body.schoolId;
      } else if (body.schoolOther) {
        row.school_other = body.schoolOther;
      } else {
        errors.schoolId = 'Okulunuzu seçin veya "Diğer" ile okul adını yazın';
      }
      Object.assign(row, { city_id: cityId || null, district_id: body.districtId || null });
    }

    if (!['hazirlik', '9', '10', '11', '12'].includes(body.grade)) errors.grade = 'Sınıf seçin';
    row.grade = body.grade;
  } else {
    // Üniversite ve lisansüstü
    if (!body.cityId) errors.cityId = 'Kurumun bulunduğu ili seçin';
    else if (!(await db('cities').where({ id: body.cityId }).first())) errors.cityId = 'Geçerli bir il seçin';
    row.city_id = body.cityId || null;

    if (body.universityId) {
      const uni = await db('universities').where({ id: body.universityId, is_active: true }).first();
      if (!uni) errors.universityId = 'Listeden bir üniversite seçin';
      else Object.assign(row, { university_id: uni.id, university_type: uni.type });
    } else if (body.universityOther) {
      if (!['devlet', 'vakif'].includes(body.universityType)) errors.universityType = 'Üniversite türünü seçin';
      Object.assign(row, { university_other: body.universityOther, university_type: body.universityType || null });
    } else {
      errors.universityId = 'Üniversitenizi seçin veya "Diğer" ile adını yazın';
    }

    if (!body.faculty) errors.faculty = LISANSUSTU.includes(app.category) ? 'Enstitü adını yazın' : 'Fakülte adını yazın';
    if (!body.department) errors.department = LISANSUSTU.includes(app.category) ? 'Program / anabilim dalı adını yazın' : 'Bölüm adını yazın';
    Object.assign(row, { faculty: body.faculty || null, department: body.department || null });

    if (app.category === 'universite') {
      if (!['hazirlik', '1', '2', '3', '4', '5', '6'].includes(body.grade)) errors.grade = 'Sınıf seçin';
      row.grade = body.grade;
    } else {
      row.grade = app.category === 'yuksek_lisans' ? 'yl' : 'dr';
    }

    if (row.university_type === 'vakif') {
      if (!['completed', 'pending'].includes(body.fallRegistration)) {
        errors.fallRegistration = 'Güz dönemi kayıt yenileme durumunuzu seçin';
      }
      row.fall_registration = body.fallRegistration || null;
    }
  }

  if (Object.keys(errors).length) throw validationError(errors);

  await db.transaction(async (trx) => {
    await trx('education').insert(row).onConflict('application_id').merge();
    await setFlag(trx, app, 'school_not_in_list', Boolean(row.school_other || row.university_other));
    await advanceStep(trx, app, 6);
  });

  return { application: await getApplicationDetail(applicantId) };
}

// ---------------------------------------------------------------------------
// Tam başvuru görünümü + adım durumları
// ---------------------------------------------------------------------------

async function getApplicationDetail(applicantId) {
  const applicant = await db('applicants').where({ id: applicantId }).first();
  const app = await getApplicationRow(applicantId);
  if (!app) throw notFound('Başvuru bulunamadı');

  const [detailsRow, guardian, education, channel, subUnit] = await Promise.all([
    db('application_details').where({ application_id: app.id }).first(),
    db('guardians').where({ application_id: app.id }).first(),
    db('education as e')
      .leftJoin('cities as c', 'c.id', 'e.city_id')
      .leftJoin('districts as d', 'd.id', 'e.district_id')
      .leftJoin('schools as s', 's.id', 'e.school_id')
      .leftJoin('universities as u', 'u.id', 'e.university_id')
      .where('e.application_id', app.id)
      .select('e.*', 'c.name as city_name', 'd.name as district_name', 's.name as school_name', 'u.name as university_name')
      .first(),
    app.channel_id ? db('channels').where({ id: app.channel_id }).first() : null,
    app.sub_unit_id ? db('sub_units').where({ id: app.sub_unit_id }).first() : null,
  ]);

  const { isMinor } = ageInfo(applicant);
  const isGrad = LISANSUSTU.includes(app.category);

  const channelDone = isGrad ? !!app.requirements_accepted_at : !!channel;
  const guardianDone = !isMinor || !!guardian?.phone_verified_at;
  const steps = {
    1: true,
    2: true,
    3: !!app.category,
    4: !!app.category && channelDone && guardianDone,
    5: !!education,
    6: !!education && (await require('./document.service').listDocuments(applicantId)).complete,
    7: app.status !== 'draft',
  };

  return {
    ...serializeApplication(app),
    isMinor,
    guardianRequired: isMinor,
    flags: getFlags(app),
    steps,
    channel: channel ? {
      id: channel.id,
      code: channel.code,
      name: channel.name,
      subUnit: subUnit ? { id: subUnit.id, code: subUnit.code, name: subUnit.name } : null,
      fields: parseJson(detailsRow?.data) || {},
    } : null,
    requirementsAcceptedAt: app.requirements_accepted_at || null,
    guardian: guardian ? {
      fullName: guardian.full_name,
      idType: guardian.id_type,
      idNumberMasked: guardian.id_type === 'PASAPORT' ? '********' : maskIdNumber(decrypt(guardian.id_number_enc)),
      phoneMasked: maskTrMobile(guardian.phone),
      verified: !!guardian.phone_verified_at,
    } : null,
    education: education ? {
      cityId: education.city_id,
      cityName: education.city_name,
      districtId: education.district_id,
      districtName: education.district_name,
      schoolId: education.school_id,
      schoolName: education.school_name || education.school_other,
      schoolOther: education.school_other,
      universityId: education.university_id,
      universityName: education.university_name || education.university_other,
      universityOther: education.university_other,
      universityType: education.university_type,
      faculty: education.faculty,
      department: education.department,
      grade: education.grade,
      fallRegistration: education.fall_registration,
    } : null,
  };
}

module.exports = {
  CATEGORY_LABELS,
  LISANSUSTU,
  idNumberHash,
  getOpenProgram,
  requireOpenProgram,
  getActiveConsentText,
  findApplicantByIdNumber,
  createRegistration,
  getApplicationRow,
  serializeApplication,
  getMe,
  requireEditableApplication,
  ageInfo,
  advanceStep,
  setFlag,
  setCategory,
  setChannel,
  acceptRequirements,
  setEducation,
  getApplicationDetail,
};
