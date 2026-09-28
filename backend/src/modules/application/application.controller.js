const svc = require('../../services/application.service');
const guardian = require('../../services/guardian.service');
const submission = require('../../services/submission.service');

const client = (req) => ({ ip: req.ip, userAgent: req.get('user-agent') });

/** Başvurunun tüm adımları + adım durumları */
async function get(req, res) {
  res.json({ application: await svc.getApplicationDetail(req.applicantId) });
}

/** Adım 3: kategori */
async function setCategory(req, res) {
  const result = await svc.setCategory(req.applicantId, req.valid.body.category);
  res.json({ changed: result.changed, application: await svc.getApplicationDetail(req.applicantId) });
}

/** Adım 4: kanal + ek alanlar (lise, üniversite) */
async function setChannel(req, res) {
  res.json(await svc.setChannel(req.applicantId, req.valid.body));
}

/** Adım 4: YL / Doktora şart beyanı */
async function acceptRequirements(req, res) {
  res.json(await svc.acceptRequirements(req.applicantId, client(req)));
}

/** Adım 4: veli bilgisi -> velinin telefonuna kod */
async function saveGuardian(req, res) {
  res.json(await guardian.saveGuardian(req.applicantId, req.valid.body, client(req)));
}

async function resendGuardian(req, res) {
  res.json(await guardian.resend(req.applicantId, client(req)));
}

async function verifyGuardian(req, res) {
  res.json(await guardian.verify(req.applicantId, req.valid.body, client(req)));
}

/** Adım 5: eğitim bilgileri */
async function setEducation(req, res) {
  res.json(await svc.setEducation(req.applicantId, req.valid.body));
}

/** Adım 7: özet (tüm bilgiler, belgeler, eksikler) */
async function summary(req, res) {
  res.json(await submission.getSummary(req.applicantId));
}

/** Adım 7: incelemeye gönder */
async function submit(req, res) {
  res.json(await submission.submit(req.applicantId));
}

module.exports = {
  summary, submit,
  get, setCategory, setChannel, acceptRequirements, saveGuardian, resendGuardian, verifyGuardian, setEducation,
};
