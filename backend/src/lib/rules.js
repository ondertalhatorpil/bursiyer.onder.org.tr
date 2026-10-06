/**
 * Kural motoru. Veritabanındaki tanımlardan (document_types.rules, channels/sub_units.extra_fields)
 * hangi belgenin kime gösterileceğini ve kanal ek alanlarının nasıl doğrulanacağını hesaplar.
 * Saf fonksiyonlardır (DB'ye erişmez); DB kontrolleri servis katmanında yapılır.
 */
const { COUNTRY_SET } = require('./countries');

// ---------------------------------------------------------------------------
// Belge kuralları
// ---------------------------------------------------------------------------

/**
 * @param {object} when  { category?, idType?, grade?, gradeNot?, minAge?, maxAge? }
 * @param {object} ctx   { category, idType, grade, age }
 */
function matchesWhen(when = {}, ctx = {}) {
  if (when.category && !when.category.includes(ctx.category)) return false;
  if (when.idType && !when.idType.includes(ctx.idType)) return false;
  if (when.grade && !when.grade.includes(ctx.grade)) return false;
  if (when.gradeNot && when.gradeNot.includes(ctx.grade)) return false;
  if (when.minAge != null && !(ctx.age >= when.minAge)) return false;
  if (when.maxAge != null && !(ctx.age <= when.maxAge)) return false;
  return true;
}

/**
 * Adaya gösterilecek belgeleri döndürür. İlk eşleşen kural geçerlidir; hiçbiri eşleşmezse belge gösterilmez.
 * @param {Array} documentTypes  document_types satırları (rules parse edilmiş olmalı)
 * @returns {Array} [{ ...documentType, required }]
 */
function resolveDocuments(documentTypes, ctx) {
  const out = [];
  for (const type of documentTypes) {
    if (type.is_active === false || type.is_active === 0) continue;
    const rules = parseJson(type.rules) || [];
    const rule = rules.find((r) => matchesWhen(r.when, ctx));
    if (rule) out.push({ ...type, required: !!rule.required });
  }
  return out.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
}

// ---------------------------------------------------------------------------
// Kanal / alt birim ek alanları
// ---------------------------------------------------------------------------

const ID_TYPES = new Set(['city', 'district', 'school', 'dormitory']);

function isVisible(field, data) {
  if (!field.showIf) return true;
  return Object.entries(field.showIf).every(([k, v]) => data[k] === v);
}

/**
 * Ek alanları tanıma göre doğrular.
 * - Görünmeyen (showIf sağlanmayan) ve tanımda olmayan alanlar atılır.
 * - Metinler kırpılır; id alanları pozitif tam sayıya çevrilir.
 * @returns {{ data: object, errors: object, refs: Array }}
 *   refs: DB'de varlığı/kısıtı kontrol edilecek referanslar
 *         [{ key, type: 'school'|'district'|'city'|'dormitory', id, filter?, cityId?, excludeCityIds? }]
 * Alan tipleri: text | radio | select | country | city | district | school | dormitory
 */
function validateExtraFields(fields = [], input = {}) {
  const src = input && typeof input === 'object' ? input : {};
  const data = {};
  const errors = {};
  const refs = [];

  // Önce seçim alanları (radio/select) işlenir ki showIf onlara göre değerlendirilebilsin
  const ordered = [...fields].sort((a, b) => rank(a) - rank(b));

  for (const field of ordered) {
    if (!isVisible(field, data)) continue;
    const raw = src[field.key];
    const empty = raw == null || (typeof raw === 'string' && raw.trim() === '');

    if (empty) {
      if (field.required) errors[field.key] = `${field.label} zorunludur`;
      continue;
    }

    if (field.type === 'text') {
      const value = String(raw).trim().replace(/\s+/g, ' ');
      const max = field.maxLength || 255;
      if (value.length > max) errors[field.key] = `${field.label} en fazla ${max} karakter olabilir`;
      else data[field.key] = value;
    } else if (field.type === 'radio' || field.type === 'select') {
      const allowed = (field.options || []).map((o) => (typeof o === 'object' ? o.value : o));
      if (!allowed.includes(raw)) errors[field.key] = `${field.label} için geçersiz seçim`;
      else data[field.key] = raw;
    } else if (field.type === 'country') {
      if (!COUNTRY_SET.has(raw)) errors[field.key] = `${field.label}: listeden bir ülke seçiniz`;
      else data[field.key] = raw;
    } else if (ID_TYPES.has(field.type)) {
      const id = Number(raw);
      if (!Number.isInteger(id) || id <= 0) {
        errors[field.key] = `${field.label} için geçersiz seçim`;
      } else {
        data[field.key] = id;
        refs.push({
          key: field.key,
          type: field.type,
          id,
          ...(field.filter && { filter: field.filter }),
          ...(field.cityId && { cityId: field.cityId }),
          // cityField: okul, formdaki başka bir il alanında seçilen ile ait olmalı
          ...(field.cityField && { cityId: data[field.cityField] }),
          ...(field.excludeCityIds && { excludeCityIds: field.excludeCityIds }),
        });
      }
    } else {
      errors[field.key] = `${field.label}: bilinmeyen alan tipi (${field.type})`;
    }
  }

  return { data, errors, refs };
}

function rank(field) {
  if (field.type === 'radio' || field.type === 'select') return 0;
  return field.cityField ? 2 : 1; // il alanına bağlı okul, il işlendikten sonra
}

function parseJson(v) {
  if (v == null) return null;
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return null; }
  }
  return v;
}

module.exports = { matchesWhen, resolveDocuments, validateExtraFields, parseJson };
