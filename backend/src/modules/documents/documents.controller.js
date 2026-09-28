const svc = require('../../services/document.service');
const storage = require('../../services/storage.service');
const { notFound } = require('../../lib/errors');

async function list(req, res) {
  res.json(await svc.listDocuments(req.applicantId));
}

async function upload(req, res) {
  const consent = req.body?.consent === 'true' || req.body?.consent === true;
  res.status(201).json(await svc.upload(req.applicantId, req.valid.params.typeCode, req.file, {
    consent, ip: req.ip, userAgent: req.get('user-agent'),
  }));
}

async function remove(req, res) {
  res.json(await svc.removeDocument(req.applicantId, req.valid.params.id));
}

/** Dosyayı tarayıcıda görüntülenecek şekilde, güvenli başlıklarla gönderir */
async function file(req, res) {
  const doc = await svc.getOwnFile(req.applicantId, req.valid.params.id);
  if (!(await storage.exists(doc.storage_key))) throw notFound('Dosya bulunamadı');
  res.set({
    'Content-Type': doc.mime,
    'Content-Length': doc.size_bytes,
    'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(doc.original_name)}`,
    'Cache-Control': 'private, no-store',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'X-Content-Type-Options': 'nosniff',
  });
  storage.createReadStream(doc.storage_key).pipe(res);
}

module.exports = { list, upload, remove, file };
