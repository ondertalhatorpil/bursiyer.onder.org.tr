/**
 * İmam hatip okul listesini (xlsx) seeds/data/schools.json dosyasına dönüştürür.
 *
 *   npm run import:schools -- ./tam_liste.xlsx
 *
 * Beklenen sütun sırası: Kod | İl | İlçe | Okul Adı | Tür (iho/aihl/aihlo) | Program/Proje
 * - Sadece liseler (aihl, aihlo) alınır, ortaokullar (iho) atlanır.
 * - Geçersiz satırlar (il/ilçe/okul adı boş, il bulunamadı) atlanır ve raporlanır.
 * - Aynı kurum kodu birden fazla satırda geçerse ilki alınır, diğerleri raporlanır.
 * Sonra `npm run db:seed` ile veritabanına aktarılır (mevcut okullar güncellenir).
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const cityList = require('../seeds/data/cityList.json');
const districtsByCity = require('../seeds/data/districtsByCityCode.json');

// Okul listesindeki yazım -> il/ilçe listesindeki yazım
const DISTRICT_ALIASES = {
  'Isparta|Şarkıkaraağaç': 'Şarkikaraağaç',
  'Samsun|Ondokuzmayıs': '19 Mayıs',
  'Tekirdağ|Marmara Ereğlisi': 'Marmaraereğlisi',
};

const file = process.argv[2];
if (!file) {
  console.error('Kullanım: npm run import:schools -- <dosya.xlsx>');
  process.exit(1);
}

const wb = XLSX.readFile(file);
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null }).slice(1);

const cityCodeByName = Object.fromEntries(cityList.map((c) => [c.name, c.code]));
const clean = (v) => (v == null ? '' : String(v).trim().replace(/\s+/g, ' '));

const schools = [];
const seenCodes = new Map();
const report = { skippedNotHighSchool: 0, inferredType: [], invalid: [], duplicateCode: [], unknownDistrict: [] };

rows.forEach((r, i) => {
  const excelRow = i + 2;
  const [kod, il, ilce, ad, rawTur, program] = r.map(clean);
  let tur = rawTur;
  // Tür boş ama adı "... Lisesi" ise lise kabul edilir
  if (!tur && /Lisesi$/.test(ad)) {
    tur = 'aihl';
    report.inferredType.push({ row: excelRow, ad });
  }

  if (tur === 'iho') { report.skippedNotHighSchool++; return; }
  if (!['aihl', 'aihlo'].includes(tur)) { report.invalid.push({ row: excelRow, reason: `tür: "${tur}"` }); return; }
  if (!/^\d+$/.test(kod) || !il || !ilce || !ad) { report.invalid.push({ row: excelRow, reason: 'kod/il/ilçe/okul adı eksik' }); return; }

  const cityCode = cityCodeByName[il];
  if (!cityCode) { report.invalid.push({ row: excelRow, reason: `il bulunamadı: "${il}"` }); return; }

  const district = DISTRICT_ALIASES[`${il}|${ilce}`] || ilce;
  if (!districtsByCity[cityCode].includes(district)) {
    report.unknownDistrict.push({ row: excelRow, il, ilce });
    return;
  }

  const mebCode = Number(kod);
  if (seenCodes.has(mebCode)) {
    report.duplicateCode.push({ row: excelRow, kod: mebCode, ad, firstRow: seenCodes.get(mebCode) });
    return;
  }
  seenCodes.set(mebCode, excelRow);

  schools.push({
    meb_code: mebCode,
    city_code: Number(cityCode),
    district,
    name: ad,
    type: tur,
    program_codes: program || null,
    is_sports: /SPO/.test(program),
    // ULU kodu olmayan ama adı "Uluslararası" ile başlayan okullar da dahil
    is_international: /ULU/.test(program) || /^Uluslararası /.test(ad),
  });
});

const out = path.join(__dirname, '../seeds/data/schools.json');
fs.writeFileSync(out, JSON.stringify(schools, null, 1));

console.log(`Yazıldı: ${out}`);
console.log(`Lise: ${schools.length} | spor (SPO): ${schools.filter((s) => s.is_sports).length} | uluslararası (ULU): ${schools.filter((s) => s.is_international).length}`);
console.log(`Atlanan ortaokul: ${report.skippedNotHighSchool}`);
if (report.inferredType.length) console.log('Türü boş, lise kabul edilenler:', report.inferredType);
if (report.invalid.length) console.log('Geçersiz satırlar:', report.invalid);
if (report.unknownDistrict.length) console.log('İlçesi eşleşmeyenler (DISTRICT_ALIASES\'a ekleyin):', report.unknownDistrict);
if (report.duplicateCode.length) console.log('Mükerrer kurum kodu (ilki alındı):', report.duplicateCode);
