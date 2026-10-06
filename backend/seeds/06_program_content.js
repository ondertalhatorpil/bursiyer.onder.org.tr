/**
 * Dönem, onay metinleri, ekran metinleri, SMS şablonları, admin rolleri.
 * Bunlar admin panelinden düzenlenir: seed sadece ilk kurulumda ekler, mevcut kaydı ezmez.
 * KVKK/rıza metinlerinin gövdesi (body) boş bırakılır; panelden girilmeden başvuru açılamaz.
 */
const { YL_SARTLAR, DR_SARTLAR, REQUIREMENTS_LABEL, SUBMIT_SUCCESS } = require('./lib/program-texts');

const CONSENT_TEXTS = [
  { type: 'kvkk', title: 'KVKK Aydınlatma Metni ve Açık Rıza Beyanı',
    label: "KVKK Aydınlatma Metni'ni okudum, anladım ve Açık Rıza Beyanı kapsamında kişisel verilerimin işlenmesini onaylıyorum." },
  { type: 'sharing', title: 'Protokol Kurumlarıyla Paylaşım Açık Rızası',
    label: "Burs başvuru, değerlendirme ve burs tahsis süreçlerinin yürütülmesi amacıyla; kimlik, iletişim ve eğitim bilgilerimin ÖNDER'in iş birliği içinde bulunduğu protokol kurumları, vakıflar ve sponsor kuruluşlar ile paylaşılmasına açık rıza gösteriyorum." },
  { type: 'guardian', title: 'Veli / Vasi Açık Rıza Beyanı',
    label: 'Velisi / vasisi olduğum adayın kişisel verilerinin burs süreçleri kapsamında işlenmesine ve paylaşılmasına açık rıza veriyorum.' },
  { type: 'criminal_record', title: 'Adli Sicil Kaydı - Özel Nitelikli Kişisel Veri Açık Rızası',
    label: 'Adli sicil kaydımın burs değerlendirmesi amacıyla işlenmesine açık rıza veriyorum.' },
  { type: 'requirements_yl', title: 'Yüksek Lisans Başvuru Şartları', body: YL_SARTLAR, is_active: true,
    label: REQUIREMENTS_LABEL },
  { type: 'requirements_dr', title: 'Doktora Başvuru Şartları', body: DR_SARTLAR, is_active: true,
    label: REQUIREMENTS_LABEL },
];

const CONTENT_BLOCKS = [
  { key: 'applications_closed', title: 'Başvurular kapalı',
    body: 'Başvurular şu an kapalıdır. Başvuru tarihleri duyurulduğunda bu sayfadan başvurabilirsiniz.' },
  { key: 'submit_success', ...SUBMIT_SUCCESS },
  // Faz 2
  { key: 'iban_warning', title: 'ÖNEMLİ UYARI',
    body: 'Burs ödemeleri yalnızca bursiyerin kendi adına açılmış vadesiz Türk Lirası hesabına yapılabilir. Anne, baba veya üçüncü şahıslara ait IBAN numaraları sistem tarafından reddedilecektir.' },
  { key: 'finalize_success', title: 'Bursiyer Kaydınız Başarıyla Kesinleştirilmiştir.',
    body: 'Burs Ödeme Durumu: Aktif Bursiyer\nIBAN Doğrulama Durumu: Başarılı\nÖdemeleriniz ve süreç bildirimleriniz sistem üzerinden takip edilebilecektir.' },
];

const SMS_TEMPLATES = [
  { code: 'otp_applicant', name: 'Aday doğrulama kodu', body: 'ONDER burs basvurusu dogrulama kodunuz: {code}. Kodu kimseyle paylasmayin.' },
  { code: 'otp_guardian', name: 'Veli doğrulama kodu', body: '{applicant_name} adina yapilan ONDER burs basvurusu icin veli onay kodunuz: {code}. Kodu kimseyle paylasmayin.' },
  { code: 'otp_login', name: 'Giriş kodu', body: 'ONDER burs sistemi giris kodunuz: {code}. Kodu kimseyle paylasmayin.' },
  { code: 'application_submitted', name: 'Başvuru alındı', body: 'ONDER burs basvurunuz alinmistir. Takip numaraniz: {tracking_no}. Sonuc SMS ile bildirilecektir.' },
  { code: 'revision_requested', name: 'Revize istendi', body: 'ONDER burs basvurunuzda duzeltilmesi gereken belgeler var. Lutfen sisteme giris yaparak belgelerinizi guncelleyin. Takip no: {tracking_no}' },
  { code: 'application_approved', name: 'Başvuru onaylandı', body: 'Tebrikler, ONDER burs basvurunuz onaylanmistir. Takip no: {tracking_no}. Burs odemesi icin sisteme giris yaparak IBAN bilgilerinizi giriniz.' },
  { code: 'iban_rejected', name: 'IBAN reddedildi', body: 'ONDER burs: girdiginiz IBAN bilgisi kabul edilmedi. Lutfen sisteme giris yaparak aciklamayi okuyun ve bilgilerinizi yeniden girin. Takip no: {tracking_no}' },
  { code: 'bursiyer_finalized', name: 'Bursiyer kaydı kesinleşti', body: 'ONDER burs: IBAN bilgileriniz onaylandi, bursiyer kaydiniz kesinlesmistir. Takip no: {tracking_no}' },
];

const ADMIN_ROLES = [
  { code: 'super_admin', name: 'Süper Admin' },
  { code: 'gm_reviewer', name: 'Genel Merkez Değerlendirici' },
  { code: 'coordinator', name: 'Birim / Dernek Koordinatörü' },
  { code: 'viewer', name: 'Görüntüleyici' },
];

exports.seed = async (knex) => {
  await knex('programs').insert({
    name: '2026-2027',
    title: '',
    tracking_prefix: 'OND-2026',
    is_open: false,
  }).onConflict('name').ignore();

  await knex('consent_texts').insert(CONSENT_TEXTS.map((c) => ({
    type: c.type, version: 1, title: c.title, label: c.label, body: c.body || null, is_active: !!c.is_active,
  }))).onConflict(['type', 'version']).ignore();

  await knex('content_blocks').insert(CONTENT_BLOCKS).onConflict('key').ignore();
  await knex('sms_templates').insert(SMS_TEMPLATES).onConflict('code').ignore();
  await knex('admin_roles').insert(ADMIN_ROLES).onConflict('code').ignore();
};
