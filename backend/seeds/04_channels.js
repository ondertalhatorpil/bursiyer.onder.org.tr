/**
 * Kategori -> kanal -> alt birim ağacı (Adım 4).
 *
 * extra_fields: kanal/alt birim seçilince açılan alanlar. Frontend formu ve backend
 * doğrulaması bu tanımdan üretilir.
 *   type: text | radio | select | city | district | school | dormitory
 *   showIf: { <diğerAlan>: <değer> }  -> sadece koşul sağlanınca gösterilir/zorunlu olur
 *   filter: school listesi filtresi, cityId / excludeCityIds: il-ilçe kısıtı
 *   prefill: başka yerden otomatik dolan değer (aday değiştirebilir)
 * Veriler application_details.data içinde `key` adıyla saklanır.
 */
const { sportBranchField } = require('../src/lib/sport-branches');
const ISTANBUL = 34;
const referenceField = { key: 'reference_name', type: 'text', label: 'Referans İsim Soyisim', required: true, maxLength: 128 };

const CHANNELS = [
  // ---------------- LİSE ----------------
  {
    category: 'lise', code: 'lise_teskilat', name: 'Teşkilat (Mezun Dernekleri)', sort: 1,
    extra_fields: [
      { key: 'region', type: 'radio', label: 'Teşkilat Bölgesi', required: true,
        options: [{ value: 'istanbul', label: 'İstanbul' }, { value: 'anadolu', label: 'Anadolu' }] },
      { key: 'district_id', type: 'district', label: 'İlçe', required: true, cityId: ISTANBUL, showIf: { region: 'istanbul' } },
      { key: 'city_id', type: 'city', label: 'İl', required: true, excludeCityIds: [ISTANBUL], showIf: { region: 'anadolu' } },
      referenceField,
    ],
  },
  {
    category: 'lise', code: 'lise_spor', name: 'Spor Liseleri', sort: 2,
    extra_fields: [
      { key: 'school_id', type: 'school', label: 'Spor Lisesi Okul Adı', required: true, filter: { is_sports: true } },
      sportBranchField,
    ],
  },
  {
    category: 'lise', code: 'lise_uluslararasi', name: 'Uluslararası AİHL Kontenjanı', sort: 3,
    extra_fields: [
      { key: 'school_id', type: 'school', label: 'Okul Adı', required: true, filter: { is_international: true } },
      { key: 'nationality', type: 'text', label: 'Uyruk / Vatandaşlık', required: true, maxLength: 64, prefill: 'applicant.nationality' },
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
      'Mezun Ofisi', 'Tanıtım & Medya Koordinatörlüğü', 'Sade Soda', 'Teşkilatlanma',
    ].map((name) => ({ name })),
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
        extra_fields: [{ key: 'dormitory_id', type: 'dormitory', label: 'Kaldığı ÖNDER Yurdu', required: true }] },
      { code: 'oncu_spor', name: 'Öncü Spor (Kulüp Sporcusu / Yönetici)',
        extra_fields: [
          { key: 'sport_role', type: 'radio', label: 'Rol', required: true,
            options: [{ value: 'sporcu', label: 'Kulüp Sporcusu' }, { value: 'yonetici', label: 'Yönetici' }] },
          { key: 'club_license_no', type: 'text', label: 'Kulüp Lisans No', required: true, maxLength: 32 },
          { key: 'sport_branch', type: 'text', label: 'Branş', required: true, maxLength: 64 },
        ] },
    ],
  },
  {
    category: 'universite', code: 'uni_wonder', name: 'WONDER', sort: 3,
    description: 'WONDER burs kontenjanı kapsamındaki lisans başvurusudur; ek alt soru açılmadan doğrudan eğitim bilgilerine geçilir.',
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

exports.seed = async (knex) => {
  for (const ch of CHANNELS) {
    await knex('channels').insert({
      category: ch.category,
      code: ch.code,
      name: ch.name,
      description: ch.description || null,
      extra_fields: json(ch.extra_fields),
      sort: ch.sort,
    }).onConflict('code').ignore(); // panelden düzenlenir, seed ezmez

    if (!ch.sub_units) continue;
    const { id: channelId } = await knex('channels').where({ code: ch.code }).first('id');
    await knex('sub_units').insert(ch.sub_units.map((u, i) => ({
      channel_id: channelId,
      code: u.code || slug(u.name),
      name: u.name,
      extra_fields: json(u.extra_fields),
      sort: i + 1,
    }))).onConflict(['channel_id', 'code']).ignore();
  }
};
