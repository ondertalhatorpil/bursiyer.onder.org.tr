import { BookOpen, CircleHelp, House, Info, LayoutGrid } from 'lucide-react';

/** Üst menü: ikon + etiket + adres (http ile başlayan veya mailto: dış bağlantıdır) */
export const NAV = [
  { icon: House, label: 'Anasayfa', to: '/' },
  { icon: BookOpen, label: 'Yeni Başvuru', to: '/kayit' },
  { icon: LayoutGrid, label: 'Başvurum', to: '/basvuru' },
  { icon: CircleHelp, label: 'Yardım', to: 'mailto:burs@onder.org.tr' },
  { icon: Info, label: 'ÖNDER Hakkında', to: 'https://onder.org.tr' },
];

/** Sitede tekrar eden kurumsal bilgiler */
export const SITE = {
  orgName: 'ÖNDER İmam Hatipliler Derneği',
  shortName: '',
  programTitle: 'Çift Kanatlı Nesil Burs Programı',
  website: 'https://onder.org.tr',
  // Destek iletişim bilgileri (gerekirse güncelleyin)
  supportEmail: 'burs@onder.org.tr',
  logoSrc: '/onder-logo.svg',
  heroImage: '/hero.webp',
  social: {
    instagram: 'https://instagram.com/',
    x: 'https://x.com/',
    facebook: 'https://facebook.com/',
    youtube: 'https://youtube.com/',
    whatsapp: '',
  },
};



export const CATEGORIES = [
  { value: 'lise', label: 'Lise Bursu', description: 'Anadolu İmam Hatip Lisesi' },
  { value: 'universite', label: 'Lisans Bursu', description: 'Üniversitelerin lisans programlarında öğrenim gören öğrenciler' },
  { value: 'yuksek_lisans', label: 'Yüksek Lisans Bursu', description: 'Tezli yüksek lisans programlarında öğrenim gören öğrenciler' },
  { value: 'doktora', label: 'Doktora Bursu', description: 'Doktora programlarında öğrenim gören araştırmacı ve öğrenciler' },
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
