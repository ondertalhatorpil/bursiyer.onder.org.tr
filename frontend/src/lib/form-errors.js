/**
 * Backend'in alan hatalarını ({ "consents.kvkk": "..." }) react-hook-form alanlarına yazar.
 * Eşleşen alan yoksa hata genel mesaj olarak "root" altına düşer.
 *
 * @param {Error} err            ApiError
 * @param {Function} setError    react-hook-form setError
 * @param {string[]} knownFields formdaki alan adları (bilinmeyen alanlar genel hataya düşer)
 * @param {object} fieldMap      backend alan adı -> form alan adı (farklıysa)
 */
export function applyApiErrors(err, setError, knownFields = [], fieldMap = {}) {
  const details = err?.details && typeof err.details === 'object' ? err.details : {};
  const unmatched = [];
  let applied = false;

  for (const [key, message] of Object.entries(details)) {
    if (typeof message !== 'string') continue;
    const field = fieldMap[key] || key;
    if (knownFields.includes(field)) {
      setError(field, { type: 'server', message });
      applied = true;
    } else {
      unmatched.push(message);
    }
  }

  if (!applied || unmatched.length) {
    setError('root', { type: 'server', message: unmatched[0] || err?.message || 'Beklenmeyen bir hata oluştu' });
  }
}
