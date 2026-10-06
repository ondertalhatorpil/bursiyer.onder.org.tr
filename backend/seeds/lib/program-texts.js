/**
 * Başvuru şartları (YL/DR) ve başvuru tamamlandı metni. 06_program_content seed'i ve metin güncelleme
 * migration'ları kullanır.
 */
const requirements = ({ level, program, birthYear, both, single, direct }) => `Türkiye'deki üniversitelerde başta İlahiyat, İslami İlimler, Psikoloji, Sosyoloji, Felsefe ve Eğitim Bilimleri olmak üzere Sosyal Bilimler alanında ${program} kayıtlı olup normal öğrenim süresi içinde bulunmak,
Hâlihazırda 'İmam Hatip Modeli' veya 'İmam Hatipler' üzerine tez konusu belirlemiş olmak ya da bu alanda akademik çalışmalar yürütmek,
${birthYear} yılı ve sonrasında doğmuş olmak,
Kayıt dönemi şartı:
- Bilimsel hazırlık ve yabancı dil hazırlığı alanlar için ${both} Güz dönemi ve sonrasında,
- Yalnızca bir hazırlık alanlar için ${single} Güz dönemi ve sonrasında,
- Hazırlık muafiyetiyle doğrudan ders aşamasına başlayanlar için ${direct} Güz dönemi ve sonrasında
${level} kayıt yaptırmış olmak,
Taksirli suçlar hariç olmak üzere; affa uğramış olsa dahi kasıtlı bir suçtan veya yüz kızartıcı bir fiilden dolayı kesinleşmiş mahkûmiyeti bulunmamak.

Önemli Not: Başvuru esnasında talep edilen belgelerin e-Devlet veya ilgili kurumlardan karekodlu/onaylı resmi PDF formatında yüklenmesi zorunludur.`;

const YL_SARTLAR = requirements({
  level: 'yüksek lisans programına', program: 'tezli yüksek lisans programına', birthYear: 1999, both: 2023, single: 2024, direct: 2025,
});

const DR_SARTLAR = requirements({
  level: 'doktora programına', program: 'bir doktora programına', birthYear: 1991, both: 2021, single: 2022, direct: 2023,
});

const REQUIREMENTS_LABEL = 'Yukarıda belirtilen başvuru şartlarını okudum, anladım ve bu koşulları taşıdığımı taahhüt ederim.';

// {program_name}: dönem adı (ör. 2026-2027), {tracking_no}: takip numarası
const SUBMIT_SUCCESS = {
  title: 'Burs Başvurunuz Başarıyla Alınmıştır',
  body: '{program_name} Dönemi ÖNDER Çift Kanatlı Nesil Burs Programı başvurunuz sistemimize kaydedilmiştir. Başvurunuz ilgili komisyon ve birimler tarafından incelemeye alınmıştır.\nDeğerlendirme sonuçları, başvuru takvimi doğrultusunda sistemde kayıtlı cep telefonunuza SMS ile bildirilecek ve e-posta adresinize iletilecektir. Başvurusu olumlu sonuçlanan adaylardan bir sonraki aşamada IBAN bilgileri talep edilecektir.',
};

module.exports = { YL_SARTLAR, DR_SARTLAR, REQUIREMENTS_LABEL, SUBMIT_SUCCESS };
