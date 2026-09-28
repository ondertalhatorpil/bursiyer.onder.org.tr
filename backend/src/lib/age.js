/**
 * Doğum tarihi ve yaş hesabı. Tarihler "YYYY-MM-DD" string olarak işlenir (saat dilimi kayması olmaz).
 * "Bugün" her zaman Türkiye saatine göre alınır; sunucu UTC'de çalışsa da gece yarısı hatası olmaz.
 * Yaş, işlemin yapıldığı güne göre hesaplanır (başvuru, IBAN girişi vb.).
 */
const TZ = 'Europe/Istanbul';

/** Türkiye saatine göre bugünün tarihi: "YYYY-MM-DD" */
function todayTR(now = new Date()) {
  return now.toLocaleDateString('en-CA', { timeZone: TZ });
}

/**
 * "GG/AA/YYYY", "GG.AA.YYYY" veya "YYYY-MM-DD" kabul eder; geçerli değilse null döner.
 * 31/02/2000 gibi takvimde olmayan tarihleri reddeder.
 */
function parseDate(input) {
  const s = String(input ?? '').trim();
  let y; let m; let d;
  let match = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) [, y, m, d] = match;
  else if ((match = s.match(/^(\d{2})[/.](\d{2})[/.](\d{4})$/))) [, d, m, y] = match;
  else return null;
  const date = new Date(Date.UTC(+y, +m - 1, +d));
  if (date.getUTCFullYear() !== +y || date.getUTCMonth() !== +m - 1 || date.getUTCDate() !== +d) return null;
  return `${y}-${m}-${d}`;
}

/** refDate ("YYYY-MM-DD", varsayılan bugün) itibarıyla tamamlanmış yaş */
function ageOn(birthDate, refDate = todayTR()) {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [ry, rm, rd] = refDate.split('-').map(Number);
  let age = ry - by;
  if (rm < bm || (rm === bm && rd < bd)) age--;
  return age;
}

function isMinor(birthDate, refDate = todayTR()) {
  return ageOn(birthDate, refDate) < 18;
}

/** Makul doğum tarihi aralığı: 10-70 yaş (form doğrulaması için) */
function isPlausibleBirthDate(birthDate, refDate = todayTR()) {
  if (birthDate > refDate) return false;
  const age = ageOn(birthDate, refDate);
  return age >= 10 && age <= 70;
}

module.exports = { todayTR, parseDate, ageOn, isMinor, isPlausibleBirthDate };
