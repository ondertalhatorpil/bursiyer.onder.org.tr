/**
 * Yüklenen dosyanın gerçek türü (uzantıya güvenilmez, ilk byte'lara bakılır).
 * Belge içeriği otomatik kontrol edilmez; barkod, tarih ve içerik kontrolünü personel yapar.
 */
function detectType(buffer) {
  if (!buffer || buffer.length < 4) return null;
  if (buffer.subarray(0, 5).toString('latin1') === '%PDF-') return { ext: 'pdf', mime: 'application/pdf' };
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { ext: 'png', mime: 'image/png' };
  }
  return null;
}

module.exports = { detectType };
