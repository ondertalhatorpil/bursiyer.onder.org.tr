/**
 * Belge matrisi (şartname Bölüm 4). Kurallar sırayla değerlendirilir, ilk eşleşen geçerlidir;
 * hiçbiri eşleşmezse belge adaya gösterilmez.
 */
const PDF = ['pdf'];
const PDF_IMG = ['pdf', 'jpg', 'png'];
const IMG = ['jpg', 'png'];
const LISANSUSTU = ['yuksek_lisans', 'doktora'];

const DOCUMENT_TYPES = [
  {
    code: 'ogrenci_belgesi', name: 'Öğrenci Belgesi', formats: PDF,
    description: 'Son 15 gün içinde e-Devlet kapısından barkodlu alınmış ve üzerinde "Aktif Öğrenci" yazan güncel belge. Doktora adayları kaydı tamamlanmamışsa kabul aldığını gösteren belgeyi yükleyebilir.',
    rules: [{ when: {}, required: true }],
  },
  {
    code: 'transkript', name: 'Transkript / Not Döküm Belgesi', formats: PDF,
    rules: [
      { when: { category: ['lise', ...LISANSUSTU] }, required: true },
      { when: { category: ['universite'], gradeNot: ['hazirlik', '1'] }, required: true },
    ],
  },
  {
    code: 'yks_yerlestirme', name: 'YKS Yerleştirme Belgesi', formats: PDF,
    description: 'Henüz transkripti oluşmamış hazırlık ve 1. sınıf öğrencileri için ÖSYM sonuç doğrulama kodlu belge.',
    rules: [{ when: { category: ['universite'], grade: ['hazirlik', '1'] }, required: true }],
  },
  {
    code: 'adli_sicil', name: 'Adli Sicil Kaydı', formats: PDF, consent_type: 'criminal_record',
    description: 'Son 30 gün içinde e-Devlet\'ten "Resmi Kuruma Verilmek Üzere" alınmış barkodlu PDF.',
    rules: [
      { when: { category: ['universite'], minAge: 18 }, required: true },
      { when: { category: LISANSUSTU }, required: true },
    ],
  },
  {
    code: 'kimlik_fotokopisi', name: 'Kimlik Belgesi Fotokopisi', formats: PDF_IMG,
    rules: [{ when: { category: LISANSUSTU, idType: ['TC'] }, required: true }],
  },
  {
    code: 'pasaport_ikamet', name: 'Pasaport veya Oturum İzni Fotokopisi', formats: PDF_IMG,
    description: 'Pasaport bilgilerini gösteren sayfalar veya oturum izni kartı.',
    rules: [{ when: { category: LISANSUSTU, idType: ['YKN'] }, required: true }],
  },
  {
    code: 'vesikalik', name: 'Vesikalık Fotoğraf', formats: IMG,
    description: 'Son altı ayda çekilmiş.',
    rules: [{ when: { category: LISANSUSTU }, required: true }],
  },
  {
    code: 'ales', name: 'ALES Sonuç Belgesi', formats: PDF,
    rules: [{ when: { category: LISANSUSTU, idType: ['TC'] }, required: true }],
  },
  {
    code: 'ales_gre_gmat', name: 'ALES / GRE / GMAT Sonuç Belgesi', formats: PDF,
    rules: [{ when: { category: LISANSUSTU, idType: ['YKN'] }, required: false }],
  },
  {
    code: 'yabanci_dil', name: 'Yabancı Dil Sınavı Sonuç Belgesi', formats: PDF,
    description: 'YDS / YÖKDİL (uluslararası öğrenciler için TOEFL da kabul edilir).',
    rules: [{ when: { category: LISANSUSTU }, required: false }],
  },
  {
    code: 'hizmet_dokumu', name: 'Gelir Beyanı - SGK Hizmet Dökümü (4A/4B/4C)', formats: PDF,
    description: 'e-Devlet\'ten alınmış hizmet dökümü.',
    rules: [{ when: { category: LISANSUSTU, idType: ['TC'] }, required: true }],
  },
  {
    code: 'gelir_ek_belge', name: 'Maaş Bordrosu / Burs Dekontu', formats: PDF,
    description: 'Varsa maaş bordrosu, başka yerden burs alıyorsanız dekont vb.',
    rules: [{ when: { category: LISANSUSTU }, required: false }],
  },
];

exports.seed = async (knex) => {
  await knex('document_types').insert(DOCUMENT_TYPES.map((d, i) => ({
    code: d.code,
    name: d.name,
    description: d.description || null,
    formats: JSON.stringify(d.formats),
    max_mb: 5,
    rules: JSON.stringify(d.rules),
    consent_type: d.consent_type || null,
    sort: i + 1,
  }))).onConflict('code').ignore(); // panelden düzenlenir, seed ezmez
};
