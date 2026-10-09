/**
 * Belge matrisi (şartname Bölüm 4). 05_document_types seed'i ve belge güncelleme migration'ları kullanır.
 * Kurallar sırayla değerlendirilir, ilk eşleşen geçerlidir; hiçbiri eşleşmezse belge adaya gösterilmez.
 */
const PDF = ['pdf'];
const PDF_IMG = ['pdf', 'jpg', 'png'];
const IMG = ['jpg', 'png'];
const LISANSUSTU = ['yuksek_lisans', 'doktora'];

const DOCUMENT_TYPES = [
  {
    code: 'ogrenci_belgesi', name: 'Öğrenci Belgesi', formats: PDF,
    description: "Son 15 gün içerisinde e-Devlet Kapısı üzerinden temin edilmiş, karekodlu ve üzerinde 'Aktif Öğrenci' ibaresi bulunan güncel belge. (Kayıt işlemlerini henüz tamamlayamamış adaylar, resmi kayıt hakkı/kabul yazısını yükleyebilir.)",
    rules: [{ when: {}, required: true }],
  },
  {
    code: 'transkript', name: 'Transkript / Not Döküm Belgesi', formats: PDF,
    description: 'Güncel genel not ortalamasını gösteren resmi onaylı transkript belgesi.',
    rules: [
      { when: { category: LISANSUSTU }, required: true },
      { when: { category: ['universite'], gradeNot: ['hazirlik', '1'] }, required: true },
    ],
  },
  {
    // Hazırlık ve 1. sınıf lisans öğrencileri transkript yerine bunu yükler
    code: 'yks_yerlestirme', name: 'YKS Yerleştirme Sonuç Belgesi', formats: PDF,
    description: 'Üniversiteye yeni kayıt yaptıran hazırlık veya 1. sınıf lisans öğrencileri için transkript yerine ÖSYM YKS Yerleştirme Sonuç Belgesi.',
    rules: [{ when: { category: ['universite'], grade: ['hazirlik', '1'] }, required: true }],
  },
  {
    code: 'adli_sicil', name: 'Adli Sicil Kaydı', formats: PDF,
    description: "Son 30 gün içerisinde e-Devlet üzerinden 'Resmî Kuruma Verilmek Üzere' düzenlenmiş, karekodlu Adli Sicil Kayıt Belgesi.",
    rules: [{ when: { category: ['universite', ...LISANSUSTU] }, required: true }],
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
    description: 'Son 6 ay içerisinde çekilmiş, yüz hatlarının net göründüğü biyometrik/vesikalık fotoğraf (JPG/PNG formatında).',
    rules: [{ when: { category: LISANSUSTU }, required: true }],
  },
  {
    code: 'ales', name: 'ALES Sonuç Belgesi', formats: PDF,
    description: 'ÖSYM Sonuç Belgesi Kontrol Kodu bulunan güncel ALES Sonuç Belgesi.',
    rules: [{ when: { category: LISANSUSTU, idType: ['TC'] }, required: true }],
  },
  {
    code: 'ales_gre_gmat', name: 'ALES / GRE / GMAT Sonuç Belgesi', formats: PDF,
    rules: [{ when: { category: LISANSUSTU, idType: ['YKN'] }, required: false }],
  },
  {
    code: 'yabanci_dil', name: 'Yabancı Dil Sınavı Sonuç Belgesi', formats: PDF,
    description: 'ÖSYM tarafından geçerliliği kabul edilen YDS, YÖKDİL veya eşdeğerliği bulunan uluslararası yabancı dil sınav sonuç belgesi (TOEFL vb.).',
    rules: [{ when: { category: LISANSUSTU }, required: false }],
  },
  {
    code: 'akademik_referans', name: 'Akademik Referans Mektubu', formats: PDF,
    description: 'Lisans döneminizde dersinizi almış veya çalışmalarınızı yakından tanıyan bir öğretim üyesinden alınmış, imzalı akademik referans mektubu.',
    rules: [{ when: { category: ['yuksek_lisans'] }, required: true }],
  },
  {
    code: 'akademik_niyet', name: 'Akademik Niyet Mektubu', formats: PDF,
    description: 'Doktora çalışmanızın konusu, amaçları ve akademik hedeflerinizi anlatan, tarafınızdan imzalanmış niyet mektubu.',
    rules: [{ when: { category: ['doktora'] }, required: true }],
  },
  {
    code: 'hizmet_dokumu', name: 'Gelir Beyanı - SGK Tescil ve Hizmet Dökümü (4A/4B/4C)', formats: PDF,
    description: "e-Devlet üzerinden 'Barkodlu Belge Oluştur' seçeneğiyle alınmış SGK Tescil ve Hizmet Dökümü.",
    rules: [{ when: { category: LISANSUSTU, idType: ['TC'] }, required: true }],
  },
  {
    code: 'gelir_ek_belge', name: 'Maaş Bordrosu / Burs Dekontu', formats: PDF,
    description: 'Çalışan adaylar için son aya ait onaylı Maaş Bordrosu; başka bir kurumdan burs alınıyorsa güncel Burs Dekontu veya burs tahsis belgesi.',
    rules: [{ when: { category: LISANSUSTU }, required: false }],
  },
];

/** document_types satırı (sort sıradan gelir) */
const documentTypeRow = (d, i) => ({
  code: d.code,
  name: d.name,
  description: d.description || null,
  formats: JSON.stringify(d.formats),
  max_mb: 5,
  rules: JSON.stringify(d.rules),
  consent_type: d.consent_type || null,
  sort: i + 1,
});

module.exports = { DOCUMENT_TYPES, documentTypeRow };
