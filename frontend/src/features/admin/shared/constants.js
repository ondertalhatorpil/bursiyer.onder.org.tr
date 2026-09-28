/** Admin paneli sabitleri */
export const SUBMITTED_STATUSES = ['submitted', 'in_review', 'revision_requested', 'approved', 'rejected', 'iban_pending', 'finalized'];

export const STATUS_FILTERS = [
  { value: '', label: 'Gönderilen tüm başvurular' },
  { value: 'submitted', label: 'Başvuru Tamamlandı (yeni)' },
  { value: 'in_review', label: 'İncelemede' },
  { value: 'revision_requested', label: 'Revize İstendi' },
  { value: 'approved', label: 'Onaylandı (IBAN bekleniyor)' },
  { value: 'iban_pending', label: 'IBAN Kontrolünde' },
  { value: 'finalized', label: 'Kesinleşti (aktif bursiyer)' },
  { value: 'rejected', label: 'Reddedildi' },
  { value: 'draft', label: 'Taslak (gönderilmemiş)' },
];

export const FLAG_FILTERS = [
  { value: 'birth_year_out_of_range', label: 'Doğum yılı şart dışında' },
  { value: 'school_not_in_list', label: 'Okul / üniversite listede yok' },
];

export const NOTE_KINDS = {
  note: { label: 'Not', tone: 'neutral' },
  recommend_approve: { label: 'Onay önerisi', tone: 'success' },
  recommend_reject: { label: 'Red önerisi', tone: 'danger' },
};

export const REVIEW_STATUS = {
  pending: { label: 'İncelenmedi', tone: 'neutral' },
  accepted: { label: 'Uygun', tone: 'success' },
  revision_requested: { label: 'Revize istendi', tone: 'danger' },
};

export const SMS_TEMPLATES = {
  otp_applicant: 'Doğrulama kodu (aday)',
  otp_guardian: 'Doğrulama kodu (veli)',
  otp_login: 'Giriş kodu',
  application_submitted: 'Başvuru alındı',
  revision_requested: 'Revize istendi',
  application_approved: 'Başvuru onaylandı',
  iban_rejected: 'IBAN reddedildi',
  bursiyer_finalized: 'Kayıt kesinleşti',
};
export const SMS_STATUS = { queued: 'kuyrukta', sent: 'gönderildi', delivered: 'iletildi', failed: 'gönderilemedi' };
