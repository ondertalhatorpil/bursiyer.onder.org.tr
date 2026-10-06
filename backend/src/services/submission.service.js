/**
 * Adım 7: özet ve gönderim.
 *
 * Gönderimde:
 *   1. Eksik kontrolü (kategori, kanal/şart beyanı, veli onayı, eğitim, zorunlu belgeler)
 *   2. Başvuruya artık uymayan belgeler arşivlenir (ör. sınıf değiştiyse eski tipteki belge)
 *   3. Takip numarası üretilir (OND-2026-XXXXX), yaş ve 18 altı bilgisi o günkü haliyle sabitlenir
 *   4. Statü: Taslak -> Başvuru Tamamlandı (status_history'ye yazılır)
 *   5. Adaya takip numaralı SMS (SMS gönderilemezse başvuru yine tamamlanmış sayılır, loglanır)
 */
const crypto = require('crypto');
const db = require('../db/knex');
const logger = require('../lib/logger');
const { AppError } = require('../lib/errors');
const { changeStatus } = require('./status.service');
const sms = require('./sms');
const app$ = require('./application.service');
const docs = require('./document.service');

/** Eksikleri adım adım listeler. Boş dizi = gönderilebilir. */
async function findMissing(applicantId, detail, documents) {
  const missing = [];
  const add = (step, field, message) => missing.push({ step, field, message });

  if (!detail.category) {
    add(3, 'category', 'Burs kategorisi seçilmedi');
    return missing;
  }
  if (app$.LISANSUSTU.includes(detail.category)) {
    if (!detail.requirementsAcceptedAt) add(4, 'requirements', 'Başvuru şartları onaylanmadı');
  } else if (!detail.channel) {
    add(4, 'channel', 'Başvuru kanalı seçilmedi');
  }
  if (detail.guardianRequired && !detail.guardian?.verified) {
    add(4, 'guardian', 'Veli / vasi onayı alınmadı');
  }
  if (!detail.education) {
    add(5, 'education', 'Eğitim ve okul bilgileri girilmedi');
  } else {
    for (const item of documents.items) {
      if (item.required && !item.upload) add(6, `document.${item.code}`, `${item.name} yüklenmedi`);
    }
  }
  return missing;
}

/** Adım 7 ekranı: tüm bilgiler + belgeler + eksikler tek yanıtta */
async function getSummary(applicantId) {
  const [me, detail, documents] = await Promise.all([
    app$.getMe(applicantId),
    app$.getApplicationDetail(applicantId),
    docs.listDocuments(applicantId),
  ]);
  const missing = detail.status === 'draft' ? await findMissing(applicantId, detail, documents) : [];
  return {
    applicant: me.applicant,
    application: detail,
    documents: documents.items.filter((i) => i.upload || i.required),
    missing,
    canSubmit: detail.status === 'draft' && missing.length === 0,
  };
}

async function generateTrackingNo(trx, prefix) {
  for (let i = 0; i < 10; i++) {
    const candidate = `${prefix}-${crypto.randomInt(10000, 100000)}`;
    if (!(await trx('applications').where({ tracking_no: candidate }).first())) return candidate;
  }
  throw new Error('Takip numarası üretilemedi');
}

async function submit(applicantId) {
  const { app, applicant } = await app$.requireEditableApplication(applicantId);
  const detail = await app$.getApplicationDetail(applicantId);
  const documents = await docs.listDocuments(applicantId);

  const missing = await findMissing(applicantId, detail, documents);
  if (missing.length) {
    throw new AppError(422, 'APPLICATION_INCOMPLETE', 'Başvurunuzda eksikler var, lütfen tamamlayınız', { missing });
  }

  const program = await db('programs').where({ id: app.program_id }).first();
  const { age, isMinor } = app$.ageInfo(applicant);
  const applicableTypeIds = (await docs.applicableTypes({
    category: app.category, idType: applicant.id_type, grade: detail.education.grade, age,
  })).map((t) => t.id);

  let trackingNo;
  await db.transaction(async (trx) => {
    trackingNo = await generateTrackingNo(trx, program.tracking_prefix);

    // Artık istenmeyen belgeler başvuruya dahil edilmez
    await trx('documents')
      .where({ application_id: app.id, is_current: true })
      .whereNotIn('document_type_id', applicableTypeIds.length ? applicableTypeIds : [0])
      .update({ is_current: false });

    await trx('applications').where({ id: app.id }).update({
      tracking_no: trackingNo,
      submitted_at: new Date(),
      age_at_submit: age,
      is_minor: isMinor,
      current_step: 7,
    });
    await changeStatus(trx, { applicationId: app.id, from: 'draft', to: 'submitted', actorType: 'applicant' });
  });

  try {
    await sms.sendTemplate('application_submitted', applicant.phone, { tracking_no: trackingNo }, { applicationId: app.id });
  } catch (err) {
    logger.error({ err: err.message, applicationId: app.id }, 'Başvuru alındı SMS\'i gönderilemedi');
  }

  const block = await db('content_blocks').where({ key: 'submit_success' }).first();
  return {
    trackingNo,
    message: {
      title: block?.title || 'Başvurunuz alınmıştır.',
      body: (block?.body || 'Başvuru Takip Numaranız: {tracking_no}')
        .replace(/\{tracking_no\}/g, trackingNo)
        .replace(/\{program_name\}/g, program.name),
    },
    application: await app$.getApplicationDetail(applicantId),
  };
}

module.exports = { getSummary, submit, findMissing };
