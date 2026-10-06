/**
 * Kategori -> kanal -> alt birim ağacı (Adım 4). 04_channels seed'i ve kanal güncelleme migration'ları kullanır.
 *
 * extra_fields: kanal/alt birim seçilince açılan alanlar. Frontend formu ve backend
 * doğrulaması bu tanımdan üretilir.
 *   type: text | radio | select | country | city | district | school | dormitory
 *   showIf: { <diğerAlan>: <değer> }  -> sadece koşul sağlanınca gösterilir/zorunlu olur
 *   filter: school listesi filtresi, cityId / excludeCityIds: il-ilçe kısıtı
 *   cityField: okul, formdaki bu il alanında seçilen ile ait olmalı
 *   prefill: başka yerden otomatik dolan değer (aday değiştirebilir)
 * Veriler application_details.data içinde `key` adıyla saklanır.
 * Lisede school_id ve grade Adım 4'te seçilirse Adım 5'te kilitli gelir.
 */
const { sportBranchField } = require('../../src/lib/sport-branches');

const ISTANBUL = 34;
const referenceField = { key: 'reference_name', type: 'text', label: 'Referans Adı Soyadı', required: true, maxLength: 128 };
const GRADE_OPTIONS = [
  { value: 'hazirlik', label: 'Hazırlık' },
  ...['9', '10', '11', '12'].map((g) => ({ value: g, label: `${g}. Sınıf` })),
];
const gradeField = (label, extra = {}) => ({ key: 'grade', type: 'select', label, required: true, options: GRADE_OPTIONS, ...extra });

const CHANNELS = [
  // ---------------- LİSE ----------------
  {
    category: 'lise', code: 'lise_teskilat', name: 'Teşkilat (Mezun Dernekleri)', sort: 1,
    extra_fields: [
      { key: 'region', type: 'radio', label: 'Bölge', required: true,
        options: [{ value: 'istanbul', label: 'İstanbul' }, { value: 'anadolu', label: 'Anadolu' }] },
      { key: 'district_id', type: 'district', label: 'İlçe', required: true, cityId: ISTANBUL, showIf: { region: 'istanbul' } },
      { key: 'city_id', type: 'city', label: 'İl', required: true, excludeCityIds: [ISTANBUL], showIf: { region: 'anadolu' } },
      referenceField,
      { key: 'school_id', type: 'school', label: 'Okul Adı', required: true, cityField: 'city_id', showIf: { region: 'anadolu' } },
      gradeField('Sınıf Seviyesi', { showIf: { region: 'anadolu' } }),
    ],
  },
  {
    category: 'lise', code: 'lise_spor', name: 'Spor Liseleri', sort: 2,
    extra_fields: [
      { key: 'school_id', type: 'school', label: 'Öğrenim Görülen Spor Lisesi', required: true, filter: { is_sports: true } },
      sportBranchField,
      gradeField('Sınıf Düzeyi'),
    ],
  },
  {
    category: 'lise', code: 'lise_uluslararasi', name: 'Uluslararası AİHL Kontenjanı', sort: 3,
    extra_fields: [
      { key: 'school_id', type: 'school', label: 'Okul Adı', required: true, filter: { is_international: true } },
      { key: 'nationality', type: 'country', label: 'Vatandaşlık / Uyruk', required: true, prefill: 'applicant.nationality' },
      gradeField('Sınıf Düzeyi'),
    ],
  },
  {
    category: 'lise', code: 'lise_egitim_destek', name: 'Eğitim Destek Lise Bursu (Genel Merkez)', sort: 4,
    extra_fields: [referenceField],
  },

  // ---------------- ÜNİVERSİTE ----------------
  {
    category: 'universite', code: 'uni_onder_genclik', name: 'ÖNDER Gençlik', sort: 1,
    sub_units: [
      'Kılavuz Gemisi', 'Finans Genç', 'Ticaret Genç', 'Diplomat Genç', 'Cevher Genç', 'Hukuk Genç',
      'Tekno Genç', "Türkiye'nin Önderleri", 'Şampiyonlar Turnede', 'MARS', 'ROTA', 'Yönetim',
      'Mezun Ofisi', { code: 'tanitim_medya_koordinatorlugu', name: 'Tanıtım ve Medya Koordinatörlüğü' },
      'Sade Soda', 'Teşkilatlanma',
    ].map((u) => (typeof u === 'string' ? { name: u } : u)),
  },
  {
    category: 'universite', code: 'uni_gm_komisyonlari', name: 'ÖNDER Genel Merkez Komisyonları', sort: 2,
    sub_units: [
      { name: 'Projeler Birimi' },
      { name: 'Kurumsal İletişim' },
      { name: 'Dış İlişkiler' },
      { name: 'Teşkilatlanma' },
      { name: 'Üye ve Mezun İlişkileri' },
      { code: 'yurtlar', name: 'ÖNDER Öğrenci Yurtları',
        extra_fields: [{ key: 'dormitory_id', type: 'dormitory', label: 'İkamet Edilen ÖNDER Yurdu', required: true }] },
      { code: 'oncu_spor', name: 'Öncü Spor Kulübü (Lisanslı Sporcu / Yönetici)',
        extra_fields: [
          { key: 'club_license_no', type: 'text', label: 'Kulüp Lisans No', required: true, maxLength: 32 },
          sportBranchField,
        ] },
    ],
  },
  {
    category: 'universite', code: 'uni_wonder', name: 'WONDER', sort: 3,
  },
  {
    category: 'universite', code: 'uni_egitime_destek', name: 'Eğitime Destek Üniversite Bursu (Genel Merkez)', sort: 4,
  },
  // Yüksek lisans ve doktorada kanal yoktur (applications.channel_id = NULL).
];

const slug = (s) => s
  .toLocaleLowerCase('tr-TR')
  .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
  .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const json = (v) => (v == null ? null : JSON.stringify(v));

/** Alt birimin DB satırı (kod verilmezse addan üretilir) */
const subUnitRow = (channelId, u, i) => ({
  channel_id: channelId,
  code: u.code || slug(u.name),
  name: u.name,
  extra_fields: json(u.extra_fields),
  sort: i + 1,
});

module.exports = { CHANNELS, subUnitRow, json };
