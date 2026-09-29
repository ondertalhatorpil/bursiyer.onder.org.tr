const ExcelJS = require('exceljs');
const svc = require('../../../services/admin-applications.service');
const storage = require('../../../services/storage.service');
const { audit } = require('../../../services/audit.service');
const { notFound } = require('../../../lib/errors');
const { GRADE_LABELS } = require('./labels');
const ibanSvc = require('../../../services/iban.service');
const sponsorSvc = require('../../../services/sponsor.service');

async function list(req, res) {
  res.json(await svc.list(req.admin, req.valid.query));
}

async function detail(req, res) {
  const data = await svc.detail(req.admin, req.valid.params.id);
  await audit(req, 'application.view', { targetType: 'application', meta: { id: data.id, trackingNo: data.trackingNo } });
  res.json({ application: data });
}

async function file(req, res) {
  const { app, doc } = await svc.getDocumentForAdmin(req.admin, req.valid.params.id, req.valid.params.documentId);
  if (!(await storage.exists(doc.storage_key))) throw notFound('Dosya bulunamadı');
  await audit(req, 'document.view', { targetType: 'document', targetId: doc.id, meta: { application: app.public_id } });
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

async function reviewDocument(req, res) {
  const { id, documentId } = req.valid.params;
  await svc.reviewDocument(req.admin, id, documentId, req.valid.body);
  await audit(req, 'document.review', { targetType: 'document', meta: { application: id, document: documentId, ...req.valid.body } });
  res.json({ application: await svc.detail(req.admin, id) });
}

async function setStatus(req, res) {
  const { id } = req.valid.params;
  await svc.setStatus(req.admin, id, req.valid.body);
  await audit(req, 'application.status', { targetType: 'application', meta: { id, to: req.valid.body.to } });
  res.json({ application: await svc.detail(req.admin, id) });
}

async function addNote(req, res) {
  const { id } = req.valid.params;
  await svc.addNote(req.admin, id, req.valid.body);
  await audit(req, 'application.note', { targetType: 'application', meta: { id, kind: req.valid.body.kind } });
  res.status(201).json({ application: await svc.detail(req.admin, id) });
}

async function setReference(req, res) {
  const { id } = req.valid.params;
  await svc.setReference(req.admin, id, req.valid.body.verified);
  await audit(req, 'application.reference', { targetType: 'application', meta: { id, verified: req.valid.body.verified } });
  res.json({ application: await svc.detail(req.admin, id) });
}

async function setQualified(req, res) {
  const { id } = req.valid.params;
  const { qualified } = req.valid.body;
  const app = await svc.setQualified(req.admin, id, qualified);
  await audit(req, qualified ? 'application.qualified_set' : 'application.qualified_unset', {
    targetType: 'application', meta: { id, trackingNo: app.tracking_no },
  });
  res.json({ application: await svc.detail(req.admin, id) });
}

async function setSponsors(req, res) {
  const { id } = req.valid.params;
  const app = await svc.findScoped(req.admin, id);
  const { added, removed } = await sponsorSvc.setForApplication(req.admin, app, req.valid.body.sponsorIds);
  if (added.length || removed.length) {
    await audit(req, 'application.sponsors', { targetType: 'application', meta: { id, trackingNo: app.tracking_no, added, removed } });
  }
  res.json({ application: await svc.detail(req.admin, id) });
}

/** Filtrelere uyan başvuruları Excel olarak indirir */
async function exportXlsx(req, res) {
  const rows = await svc.exportRows(req.admin, req.valid.query);
  await audit(req, 'export.xlsx', { meta: { count: rows.length, filters: req.valid.query } });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'ÖNDER Burs Sistemi';
  const ws = wb.addWorksheet('Başvurular', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = [
    { header: 'Takip No', key: 'trackingNo', width: 16 },
    { header: 'Durum', key: 'statusLabel', width: 20 },
    { header: 'Ad Soyad', key: 'fullName', width: 26 },
    { header: 'Kimlik No', key: 'idNumber', width: 14 },
    { header: 'Doğum Tarihi', key: 'birthDate', width: 13 },
    { header: 'Telefon', key: 'phone', width: 18 },
    { header: 'E-posta', key: 'email', width: 28 },
    { header: 'Kategori', key: 'categoryLabel', width: 20 },
    { header: 'Kanal', key: 'channel', width: 28 },
    { header: 'Birim', key: 'subUnit', width: 24 },
    { header: 'İl', key: 'city', width: 14 },
    { header: 'Okul / Üniversite', key: 'institution', width: 40 },
    { header: 'Tür', key: 'universityType', width: 8 },
    { header: 'Fakülte / Enstitü', key: 'faculty', width: 26 },
    { header: 'Bölüm / Program', key: 'department', width: 26 },
    { header: 'Sınıf', key: 'grade', width: 12 },
    { header: '18 Yaş Altı', key: 'minor', width: 10 },
    { header: 'Referans Teyidi', key: 'reference', width: 14 },
    { header: 'Burs Türü', key: 'scholarshipType', width: 12 },
    { header: 'Burs Veren', key: 'sponsorText', width: 30 },
    { header: 'İşaretler', key: 'flagText', width: 30 },
    { header: 'Gönderim', key: 'submittedAt', width: 18 },
  ];
  for (const r of rows) {
    ws.addRow({
      ...r,
      universityType: r.universityType === 'vakif' ? 'Vakıf' : r.universityType === 'devlet' ? 'Devlet' : '',
      grade: GRADE_LABELS[r.grade] || '',
      minor: r.isMinor ? 'Evet' : 'Hayır',
      reference: r.referenceVerified ? 'Teyitli' : '',
      scholarshipType: r.status === 'finalized' ? (r.qualified ? 'Nitelikli' : 'Normal') : '',
      sponsorText: r.sponsorLabel || '',
      flagText: r.flags.map((f) => f.label).join(', '),
      submittedAt: r.submittedAt ? new Date(r.submittedAt).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }) : '',
    });
  }
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF173B6E' } };
  ws.autoFilter = { from: 'A1', to: { row: 1, column: ws.columns.length } };

  const stamp = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="basvurular-${stamp}.xlsx"`,
    'Cache-Control': 'no-store',
  });
  await wb.xlsx.write(res);
  res.end();
}

async function ibanFile(req, res) {
  const app = await svc.findScoped(req.admin, req.valid.params.id);
  const acc = await ibanSvc.getFileForAdmin(app, req.valid.params.accountId);
  if (!(await storage.exists(acc.storage_key))) throw notFound('Dosya bulunamadı');
  await audit(req, 'iban.document_view', { targetType: 'application', meta: { id: app.public_id, trackingNo: app.tracking_no } });
  res.set({
    'Content-Type': acc.mime,
    'Content-Length': acc.size_bytes,
    'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(acc.original_name)}`,
    'Cache-Control': 'private, no-store',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'X-Content-Type-Options': 'nosniff',
  });
  storage.createReadStream(acc.storage_key).pipe(res);
}

async function reviewIban(req, res) {
  const { id } = req.valid.params;
  const app = await svc.findScoped(req.admin, id);
  await ibanSvc.review(req.admin, app, req.valid.body);
  await audit(req, 'iban.review', { targetType: 'application', meta: { id, trackingNo: app.tracking_no, decision: req.valid.body.decision } });
  res.json({ application: await svc.detail(req.admin, id) });
}

/** Ödeme listesi Excel: kesinleşmiş bursiyerler ve onaylı IBAN'ları */
async function paymentsExport(req, res) {
  const rows = await svc.paymentRows(req.admin, req.valid.query.programId);
  await audit(req, 'export.payments', { meta: { count: rows.length } });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'ÖNDER Burs Sistemi';
  const ws = wb.addWorksheet('Ödeme Listesi', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = [
    { header: 'Takip No', key: 'trackingNo', width: 16 },
    { header: 'Ad Soyad', key: 'fullName', width: 26 },
    { header: 'Kimlik No', key: 'idNumber', width: 14 },
    { header: 'Telefon', key: 'phone', width: 18 },
    { header: 'Kategori', key: 'category', width: 18 },
    { header: 'Burs Türü', key: 'scholarshipType', width: 12 },
    { header: 'Burs Veren', key: 'sponsor', width: 30 },
    { header: 'Kanal / Birim', key: 'channel', width: 30 },
    { header: 'Hesap Sahibi', key: 'holderName', width: 26 },
    { header: 'IBAN', key: 'iban', width: 36 },
    { header: 'Banka', key: 'bank', width: 30 },
    { header: 'IBAN Onay Tarihi', key: 'verifiedAt', width: 18 },
  ];
  for (const r of rows) {
    ws.addRow({ ...r, verifiedAt: r.verifiedAt ? new Date(r.verifiedAt).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }) : '' });
  }
  ws.getColumn('idNumber').numFmt = '@';
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF173B6E' } };
  ws.autoFilter = { from: 'A1', to: { row: 1, column: ws.columns.length } };

  const stamp = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="odeme-listesi-${stamp}.xlsx"`,
    'Cache-Control': 'no-store',
  });
  await wb.xlsx.write(res);
  res.end();
}

module.exports = { list, detail, file, reviewDocument, setStatus, addNote, setReference, setQualified, setSponsors, exportXlsx, ibanFile, reviewIban, paymentsExport };
