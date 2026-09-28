/** Sitede tekrar eden kurumsal bilgiler */
export const SITE = {
  orgName: 'ÖNDER İmam Hatipliler Derneği',
  shortName: 'ÖNDER',
  programTitle: 'Çift Kanatlı Nesil Burs Programı',
  website: 'https://onder.org.tr',
  // Destek iletişim bilgileri (gerekirse güncelleyin)
  supportEmail: 'burs@onder.org.tr',
  logoSrc: '/logo.png',
};

export const CATEGORIES = [
  { value: 'lise', label: 'Lise Bursu', description: 'İmam hatip lisesi öğrencileri' },
  { value: 'universite', label: 'Üniversite Bursu', description: 'Lisans öğrencileri' },
  { value: 'yuksek_lisans', label: 'Yüksek Lisans Bursu', description: 'Tezli yüksek lisans öğrencileri' },
  { value: 'doktora', label: 'Doktora Bursu', description: 'Doktora öğrencileri' },
];

export const APPLICATION_STEPS = [
  { step: 1, title: 'Kişisel Bilgiler' },
  { step: 2, title: 'SMS Doğrulama' },
  { step: 3, title: 'Burs Kategorisi' },
  { step: 4, title: 'Başvuru Kanalı' },
  { step: 5, title: 'Eğitim Bilgileri' },
  { step: 6, title: 'Belgeler' },
  { step: 7, title: 'Özet ve Gönderim' },
];

/** Başvuru adımlarının adresleri (Adım 3-7) */
export const STEP_ROUTES = {
  3: '/basvuru/kategori',
  4: '/basvuru/kanal',
  5: '/basvuru/egitim',
  6: '/basvuru/belgeler',
  7: '/basvuru/ozet',
};

export const GRADES = {
  lise: [
    { value: 'hazirlik', label: 'Hazırlık' },
    { value: '9', label: '9. Sınıf' },
    { value: '10', label: '10. Sınıf' },
    { value: '11', label: '11. Sınıf' },
    { value: '12', label: '12. Sınıf' },
  ],
  universite: [
    { value: 'hazirlik', label: 'Hazırlık' },
    ...[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `${n}. Sınıf` })),
  ],
};

export const GRADE_LABELS = {
  hazirlik: 'Hazırlık', yl: 'Yüksek Lisans', dr: 'Doktora',
  ...Object.fromEntries(['1', '2', '3', '4', '5', '6', '9', '10', '11', '12'].map((g) => [g, `${g}. Sınıf`])),
};

export const STATUS_TONES = {
  draft: 'warning',
  submitted: 'brand',
  in_review: 'brand',
  revision_requested: 'danger',
  rejected: 'danger',
  approved: 'success',
  iban_pending: 'success',
  finalized: 'success',
};
