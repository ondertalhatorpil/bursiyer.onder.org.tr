/**
 * Veli / vasi (Adım 4, sadece 18 yaş altı adaylar - kategori fark etmeksizin; yurtta eğitim bilgileriyle birlikte).
 *
 *   saveGuardian  : bilgileri kaydeder ve velinin telefonuna SMS kodu gönderir
 *   resend        : kodu tekrar gönderir
 *   verify        : velinin telefonuna gelen kod -> veli doğrulandı
 *
 * Veli telefonu adayın telefonuyla aynı olamaz (aday kendi kodunu girip onay veremesin diye).
 * Veli bilgisi (ad, kimlik, telefon) değişirse doğrulama sıfırlanır.
 */
const db = require('../db/knex');
const { encrypt, decrypt } = require('../lib/crypto');
const { AppError, validationError } = require('../lib/errors');
const otp = require('./otp.service');
const app$ = require('./application.service');

const subjectRef = (guardianId) => `guardian:${guardianId}`;

async function requireMinorApplication(applicantId) {
  const { app, applicant } = await app$.requireEditableApplication(applicantId);
  if (!app$.ageInfo(applicant).isMinor) {
    throw new AppError(409, 'GUARDIAN_NOT_REQUIRED', '18 yaşından büyük adaylardan veli bilgisi istenmez');
  }
  return { app, applicant };
}

async function saveGuardian(applicantId, { fullName, idType, idNumber, phone }, { ip }) {
  const { app, applicant } = await requireMinorApplication(applicantId);
  if (phone === applicant.phone) {
    throw validationError({ phone: 'Veli telefonu adayın telefonundan farklı olmalı' });
  }

  const existing = await db('guardians').where({ application_id: app.id }).first();
  const unchanged = existing
    && existing.full_name === fullName
    && existing.id_type === idType
    && decrypt(existing.id_number_enc) === idNumber
    && existing.phone === phone;

  if (unchanged && existing.phone_verified_at) {
    return { alreadyVerified: true, application: await app$.getApplicationDetail(applicantId) };
  }

  let guardianId = existing?.id;
  const row = {
    full_name: fullName,
    id_type: idType,
    id_number_enc: encrypt(idNumber),
    phone,
    phone_verified_at: null,
    updated_at: new Date(),
  };
  if (existing) await db('guardians').where({ id: existing.id }).update(row);
  else [guardianId] = await db('guardians').insert({ application_id: app.id, ...row });

  const sent = await otp.sendOtp({
    phone,
    purpose: 'guardian',
    subjectRef: subjectRef(guardianId),
    ip,
    applicationId: app.id,
    vars: { applicant_name: `${applicant.first_name} ${applicant.last_name}` },
  });
  return { alreadyVerified: false, ...sent };
}

async function resend(applicantId, { ip }) {
  const { app, applicant } = await requireMinorApplication(applicantId);
  const guardian = await db('guardians').where({ application_id: app.id }).first();
  if (!guardian) throw new AppError(409, 'STEP_ORDER', 'Önce veli bilgilerini giriniz');
  if (guardian.phone_verified_at) throw new AppError(409, 'ALREADY_VERIFIED', 'Veli onayı zaten alındı');
  return otp.sendOtp({
    phone: guardian.phone,
    purpose: 'guardian',
    subjectRef: subjectRef(guardian.id),
    ip,
    applicationId: app.id,
    vars: { applicant_name: `${applicant.first_name} ${applicant.last_name}` },
  });
}

async function verify(applicantId, { code }) {
  const { app } = await requireMinorApplication(applicantId);
  const guardian = await db('guardians').where({ application_id: app.id }).first();
  if (!guardian) throw new AppError(409, 'STEP_ORDER', 'Önce veli bilgilerini giriniz');

  await otp.verifyOtp({ phone: guardian.phone, purpose: 'guardian', subjectRef: subjectRef(guardian.id), code });

  await db.transaction(async (trx) => {
    const now = new Date();
    await trx('guardians').where({ id: guardian.id }).update({ phone_verified_at: now, updated_at: now });
    if (app.category === app$.YURT) {
      // Yurtta veli onayı Adım 4'te (eğitim bilgileri) alınır
      if (await trx('education').where({ application_id: app.id }).first('application_id')) await app$.advanceStep(trx, app, 5);
    } else {
      const channelDone = app$.LISANSUSTU.includes(app.category) ? !!app.requirements_accepted_at : !!app.channel_id;
      if (channelDone) await app$.advanceStep(trx, app, 5);
    }
  });

  return { application: await app$.getApplicationDetail(applicantId) };
}

module.exports = { saveGuardian, resend, verify };
