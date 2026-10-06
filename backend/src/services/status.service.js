/**
 * Başvuru statüleri ve geçmiş kaydı. Her statü değişikliği status_history'ye yazılır.
 * İzin verilen geçişler burada tanımlıdır; admin tarafı (Aşama 8) da bunu kullanacak.
 */
const { AppError } = require('../lib/errors');

const STATUS_LABELS = {
  draft: 'Başvuru Taslağı',
  submitted: 'Başvuru Tamamlandı',
  in_review: 'İncelemede',
  revision_requested: 'Revize İstendi',
  rejected: 'Reddedildi',
  approved: 'Onaylandı',
  iban_pending: 'IBAN Kontrolünde',
  finalized: 'Kesinleşti (Aktif Bursiyer)',
};

const TRANSITIONS = {
  null: ['draft'],
  draft: ['submitted'],
  submitted: ['in_review', 'rejected'],
  in_review: ['revision_requested', 'rejected', 'approved'],
  revision_requested: ['in_review'],
  approved: ['iban_pending', 'in_review'],
  iban_pending: ['finalized', 'approved'], // personel IBAN'ı onaylar / reddeder (reddedilirse aday yeniden girer)
  rejected: ['in_review'], // yanlışlıkla reddedileni geri alma (sadece Genel Merkez)
  finalized: [],
};

function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

/**
 * Statüyü değiştirir ve geçmişe yazar. trx zorunlu (çağıran transaction içinde olmalı).
 * @param {object} p { applicationId, from, to, actorType: 'system'|'applicant'|'admin', adminId?, note? }
 */
async function changeStatus(trx, { applicationId, from, to, actorType, adminId = null, note = null }) {
  if (!canTransition(from, to)) {
    throw new AppError(409, 'INVALID_STATUS_TRANSITION', `"${STATUS_LABELS[from] || from}" durumundaki başvuru "${STATUS_LABELS[to]}" durumuna alınamaz`);
  }
  if (from != null) {
    const updated = await trx('applications').where({ id: applicationId, status: from }).update({ status: to });
    if (!updated) throw new AppError(409, 'STATUS_CHANGED', 'Başvurunun durumu bu arada değişmiş, sayfayı yenileyin');
  }
  await trx('status_history').insert({
    application_id: applicationId,
    from_status: from,
    to_status: to,
    actor_type: actorType,
    actor_admin_id: adminId,
    note,
    created_at: new Date(),
  });
}

module.exports = { STATUS_LABELS, TRANSITIONS, canTransition, changeStatus };
