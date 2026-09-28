/**
 * Adım 8: IBAN.
 *   - bank_accounts: hesap belgesi, personel kontrolü (bekliyor / uygun / reddedildi), aynı IBAN'ın tekrarını bulmak için özet
 *   - banks: EFT kodlu banka listesi (listede olmayan kod da kabul edilir, panelde işaretlenir)
 *   - SMS şablonları: onay mesajı IBAN davetini içerir; IBAN reddi ve kesinleşme mesajları
 */
const BANKS = [
  ['00010', 'T.C. Ziraat Bankası'], ['00012', 'Türkiye Halk Bankası'], ['00015', 'Türkiye Vakıflar Bankası'],
  ['00032', 'Türk Ekonomi Bankası'], ['00046', 'Akbank'], ['00059', 'Şekerbank'], ['00062', 'Türkiye Garanti Bankası'],
  ['00064', 'Türkiye İş Bankası'], ['00067', 'Yapı ve Kredi Bankası'], ['00092', 'Citibank'], ['00096', 'Turkish Bank'],
  ['00099', 'ING Bank'], ['00103', 'Fibabanka'], ['00109', 'ICBC Turkey Bank'], ['00111', 'QNB Bank'],
  ['00123', 'HSBC Bank'], ['00124', 'Alternatifbank'], ['00125', 'Burgan Bank'], ['00134', 'Denizbank'],
  ['00135', 'Anadolubank'], ['00143', 'Aktif Yatırım Bankası'], ['00146', 'Odea Bank'],
  ['00203', 'Albaraka Türk Katılım Bankası'], ['00205', 'Kuveyt Türk Katılım Bankası'],
  ['00206', 'Türkiye Finans Katılım Bankası'], ['00209', 'Ziraat Katılım Bankası'], ['00210', 'Vakıf Katılım Bankası'],
  ['00211', 'Türkiye Emlak Katılım Bankası'],
];

const OLD_APPROVED = 'Tebrikler, ONDER burs basvurunuz onaylanmistir. Takip no: {tracking_no}. Sonraki adim icin bilgilendirme yapilacaktir.';
const NEW_APPROVED = 'Tebrikler, ONDER burs basvurunuz onaylanmistir. Takip no: {tracking_no}. Burs odemesi icin sisteme giris yaparak IBAN bilgilerinizi giriniz.';

exports.up = async (knex) => {
  await knex.schema.alterTable('bank_accounts', (t) => {
    t.string('iban_hash', 64).nullable(); // HMAC; aynı IBAN'ın başka bursiyerde kullanılıp kullanılmadığını bulmak için
    t.specificType('bank_code_raw', 'char(5)').nullable(); // listede olmasa da IBAN'daki kod
    t.string('storage_key', 64).nullable(); // hesap belgesi
    t.string('original_name', 255).nullable();
    t.string('mime', 64).nullable();
    t.integer('size_bytes').unsigned().nullable();
    t.specificType('sha256', 'char(64)').nullable();
    t.enu('status', ['pending', 'accepted', 'rejected']).notNullable().defaultTo('pending');
    t.string('review_note', 1000).nullable();
    t.integer('reviewed_by').unsigned().nullable().references('admin_users.id');
    t.datetime('reviewed_at').nullable();
    t.datetime('declared_at').nullable(); // "hesap bana ait, vadesiz TL" beyanı
    t.index(['iban_hash']);
  });

  await knex('banks').insert(BANKS.map(([code, name]) => ({ code, name }))).onConflict('code').ignore();

  await knex('sms_templates').where({ code: 'application_approved', body: OLD_APPROVED }).update({ body: NEW_APPROVED });
  await knex('sms_templates').insert([
    { code: 'iban_rejected', name: 'IBAN reddedildi', body: 'ONDER burs: girdiginiz IBAN bilgisi kabul edilmedi. Lutfen sisteme giris yaparak aciklamayi okuyun ve bilgilerinizi yeniden girin. Takip no: {tracking_no}' },
    { code: 'bursiyer_finalized', name: 'Bursiyer kaydı kesinleşti', body: 'ONDER burs: IBAN bilgileriniz onaylandi, bursiyer kaydiniz kesinlesmistir. Takip no: {tracking_no}' },
  ]).onConflict('code').ignore();
};

exports.down = async (knex) => {
  await knex('sms_templates').whereIn('code', ['iban_rejected', 'bursiyer_finalized']).del();
  await knex('sms_templates').where({ code: 'application_approved', body: NEW_APPROVED }).update({ body: OLD_APPROVED });
  await knex.schema.alterTable('bank_accounts', (t) => {
    t.dropForeign(['reviewed_by']);
    t.dropIndex(['iban_hash']);
    t.dropColumns('iban_hash', 'bank_code_raw', 'storage_key', 'original_name', 'mime', 'size_bytes', 'sha256',
      'status', 'review_note', 'reviewed_by', 'reviewed_at', 'declared_at');
  });
};
