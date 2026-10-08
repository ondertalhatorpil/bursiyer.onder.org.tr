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
  { value: 'yurt', label: 'Yurt Konaklama Bursu', description: 'ÖNDER öğrenci yurtlarında konaklayan üniversite öğrencileri' },
];

/** Yurt Konaklama Bursu'nun akışı farklıdır: kanal ve belge adımı yoktur */
export const isYurt = (category) => category === 'yurt';

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

/** Yurt Konaklama Bursu adımları: kanal yerine doğrudan eğitim, belgeler yerine aile ve burs bilgileri */
export const YURT_APPLICATION_STEPS = [
  { step: 1, title: 'Kişisel Bilgiler' },
  { step: 2, title: 'SMS Doğrulama' },
  { step: 3, title: 'Burs Kategorisi' },
  { step: 4, title: 'Eğitim Bilgileri' },
  { step: 5, title: 'Aile ve Gelir Bilgileri' },
  { step: 6, title: 'Burs Bilgileri' },
  { step: 7, title: 'Özet ve Gönderim' },
];

export const YURT_STEP_ROUTES = {
  3: '/basvuru/kategori',
  4: '/basvuru/egitim',
  5: '/basvuru/aile',
  6: '/basvuru/burs-bilgileri',
  7: '/basvuru/ozet',
};

export const stepsFor = (category) => (isYurt(category) ? YURT_APPLICATION_STEPS : APPLICATION_STEPS);
export const stepRoutesFor = (category) => (isYurt(category) ? YURT_STEP_ROUTES : STEP_ROUTES);

/** Yurt Konaklama Bursu seçenekleri (başvuru formu, özet ve admin detayı ortak kullanır) */
export const TUITION_RATES = [100, 75, 50, 25].map((r) => ({ value: r, label: `%${r}` }));
export const GUARDIAN_HOUSING = [
  { value: 'kira', label: 'Kira' },
  { value: 'ev_sahibi', label: 'Ev Sahibi' },
  { value: 'lojman', label: 'Lojman' },
  { value: 'diger', label: 'Diğer' },
];
export const PARENT_STATUS = [{ value: 'sag', label: 'Sağ' }, { value: 'vefat', label: 'Vefat Etti' }];
export const PARENTS_LIVING = [{ value: 'birlikte', label: 'Birlikte Yaşıyor' }, { value: 'ayri', label: 'Ayrı Yaşıyor' }];
export const KYK_SUPPORT = [
  { value: 'yok', label: 'Almıyorum' },
  { value: 'burs', label: 'KYK Bursu' },
  { value: 'kredi', label: 'Öğrenim Kredisi' },
];
export const YES_NO = [{ value: true, label: 'Evet' }, { value: false, label: 'Hayır' }];
export const optionLabel = (options, value) => options.find((o) => o.value === value)?.label;

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
