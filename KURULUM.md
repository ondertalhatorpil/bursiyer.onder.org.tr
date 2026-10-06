# Canlıya Alma (Sunucu Kurulumu)

Sistem Docker ile çalışır: veritabanı (MariaDB), backend (API), frontend (site) ve phpMyAdmin ayrı konteynerlerdir.
Veritabanı tabloları backend her açıldığında **otomatik** kurulur/güncellenir (migration). Başlangıç verileri
(iller, okullar, üniversite/fakülte/bölüm listesi, kanallar, belge tipleri, metinler) ilk kurulumda **bir komutla** yüklenir.

> Geliştirme bilgisayarındaki veritabanı canlıya **taşınmaz**. İçinde deneme başvuruları var ve farklı
> şifreleme anahtarıyla şifrelenmiş. Canlı veritabanı boş başlar, aşağıdaki adımlarla dolar.

## Gerekenler

- Docker ve Docker Compose kurulu bir Linux sunucu
- Alan adı sunucuya yönlendirilmiş olmalı (ör. `bursiyer.onder.org.tr`)
- Sunucuda Nginx + Let's Encrypt (HTTPS sunucu Nginx'inde yapılır)
- Ekomesaj SMS hesabı (kullanıcı adı / şifre)

## İlk kurulum

### 1. Kodu indirin ve ayarları girin

```bash
git clone https://github.com/ondertalhatorpil/bursiyer.onder.org.tr.git
cd bursiyer.onder.org.tr
cp .env.example .env
nano .env
```

`.env` içinde doldurulacaklar:

| Ayar | Ne yazılır |
| --- | --- |
| `DB_ROOT_PASSWORD`, `DB_PASSWORD` | Güçlü şifreler (`openssl rand -base64 24`) |
| `ENCRYPTION_KEY`, `HASH_KEY` | Her biri için ayrı `openssl rand -base64 32` çıktısı |
| `CORS_ORIGINS`, `PMA_ABSOLUTE_URI` | Sitenin gerçek adresi |
| `EKOMESAJ_USERNAME`, `EKOMESAJ_PASSWORD` | Ekomesaj hesap bilgileri |

> ⚠️ `ENCRYPTION_KEY` ve `HASH_KEY` değerlerini güvenli bir yerde **yedekleyin**. Kaybolursa veya değişirse
> kayıtlı kimlik numaraları ve IBAN'lar bir daha okunamaz.

### 2. Sistemi başlatın

```bash
docker compose up -d --build
docker compose ps          # hepsi "healthy" olana kadar bekleyin (1-2 dk)
```

Bu adımda veritabanı oluşturulur ve tüm tablolar otomatik kurulur.

### 3. Başlangıç verilerini yükleyin (sadece ilk kurulumda, bir kez)

```bash
docker compose exec backend npx knex seed:run
```

### 4. İlk yönetici hesabını açın

```bash
docker compose exec backend npm run admin:create -- eposta@onder.org.tr "Ad Soyad" 05XXXXXXXXX
```

Ekrana yazılan **geçici şifreyi** not edin. Girişte telefona SMS kodu gelir, ilk girişte şifre değiştirilir.
Diğer yöneticiler panelden eklenir.

### 5. Sunucu Nginx'ini ayarlayın (HTTPS)

Site, sunucuda sadece `127.0.0.1:8090` adresinde açılır (`.env` → `WEB_PORT`). Sunucu Nginx'i buraya yönlendirir:

```nginx
server {
    server_name bursiyer.onder.org.tr;
    client_max_body_size 6m;

    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Sonra: `sudo certbot --nginx -d bursiyer.onder.org.tr`

### 6. Yönetici panelinden yapılacaklar (başvuruları açmadan önce)

- **Ayarlar → Onay metinleri:** KVKK, paylaşım, veli ve adli sicil metinlerinin gerçek içeriklerini girip yayınlayın
  (metinler boşken başvuru açılamaz).
- **Ayarlar → Dönem:** başlangıç/bitiş tarihlerini girin (bitiş saati sitede "Saat: 23.59" gibi görünür), dönemi açın.

## Güncelleme (sonraki sürümler)

```bash
git pull
docker compose up -d --build
```

Yeni migration'lar backend açılırken otomatik çalışır, ayrıca bir şey yapmaya gerek yoktur.
Üniversite/fakülte/bölüm listesi değiştiyse ek olarak:

```bash
docker compose exec backend npx knex seed:run --specific=07_universities.js
docker compose exec backend npx knex seed:run --specific=08_faculties_departments.js
```

## Faydalı komutlar

```bash
docker compose logs -f backend                                   # backend kayıtları
docker compose exec db mariadb-dump -u root -p burs_kayit > yedek.sql   # veritabanı yedeği
```

- Veritabanı yönetimi: `https://<site>/phpmyadmin/` (`.env`'deki `DB_USER` / `DB_PASSWORD` ile)
- Veriler `db_data`, yüklenen belgeler `uploads` Docker volume'larında durur;
  `docker compose down -v` **kullanmayın** (volume'ları siler).
