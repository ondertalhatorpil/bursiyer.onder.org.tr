# Burs Kayıt Sistemi – Backend

ÖNDER Çift Kanatlı Nesil Burs Programı kayıt sistemi. Bu aşamada veritabanı migration'ları ve seed verileri hazırdır.

## Kurulum

```bash
npm install
cp .env.example .env   # DB bilgilerini doldurun
```

Veritabanı Türkçe sıralama/arama için şu ayarlarla oluşturulmalı:

```sql
CREATE DATABASE burs_kayit CHARACTER SET utf8mb4 COLLATE utf8mb4_turkish_ci;
```

```bash
npm run db:migrate   # tabloları oluşturur
npm run db:seed      # il/ilçe, okullar, yurtlar, kanallar, belge tipleri, metinler, roller
npm run db:reset     # geliştirmede: her şeyi silip baştan kurar
```

## Okul listesini güncellemek

```bash
npm run import:schools -- ./tam_liste.xlsx   # seeds/data/schools.json üretir + rapor
npm run db:seed                              # kurum koduna göre upsert
```

Script ortaokulları (iho) atlar; geçersiz satırları, eşleşmeyen ilçeleri ve mükerrer kurum kodlarını raporlar.
Spor liseleri `SPO`, uluslararası AİHL'ler `ULU` kodu (veya adı "Uluslararası" ile başlayan) ile işaretlenir.

## Seed davranışı

| Veri | Tekrar çalıştırınca |
| --- | --- |
| İl / ilçe, okullar | Güncellenir (kaynak: dosya) |
| Yurtlar, kanallar, alt birimler, belge tipleri, onay metinleri, ekran metinleri, SMS şablonları, roller, dönem | Sadece eksikse eklenir; admin panelinde yapılan değişiklikleri ezmez |

## Tablolar

| Grup | Tablolar |
| --- | --- |
| Referans | `cities`, `districts`, `schools`, `universities`, `dormitories` |
| Program & içerik | `programs`, `channels`, `sub_units`, `consent_texts`, `content_blocks`, `sms_templates` |
| Başvuru | `applicants`, `applications`, `application_details`, `guardians`, `education` |
| Belge | `document_types`, `documents` |
| Denetim | `consents`, `status_history`, `application_notes`, `audit_logs` |
| SMS | `otp_codes`, `sms_logs` |
| Admin | `admin_roles`, `admin_users`, `admin_scopes` |
| Faz 2 (IBAN) | `banks`, `bank_accounts` |

Notlar:
- T.C./YKN, veli kimlik no ve IBAN şifreli (`*_enc`) saklanır; arama/tekillik `id_number_hash` (HMAC) ile yapılır.
- `applications` üzerinde `UNIQUE(program_id, applicant_id)`: dönem başına tek başvuru.
- Kanal alt alanları `channels.extra_fields` / `sub_units.extra_fields` tanımından gelir, değerler `application_details.data` içinde tutulur.
- Belge gösterimi/zorunluluğu `document_types.rules` ile belirlenir (ilk eşleşen kural).
- `consent_texts` içindeki KVKK/rıza metinlerinin gövdesi boştur; admin panelinden girilecek.
- `universities` tablosu boş; üniversite listesi ayrıca aktarılacak.
