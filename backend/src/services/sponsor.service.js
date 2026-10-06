/**
 * Burs veren firmalar (yönetim: manage_settings) ve bursiyere firma atama (kesinleşmiş başvurular).
 */
const db = require('../db/knex');
const storage = require('./storage.service');
const { detectType } = require('../lib/file-type');
const { AppError, notFound, validationError } = require('../lib/errors');

const LOGO_MAX = 2 * 1024 * 1024;
const GENEL_MERKEZ = 'Genel Merkez';

function serialize(r) {
  return {
    id: r.id,
    name: r.name,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    isActive: !!r.is_active,
    contactName: r.contact_name,
    contactPhone: r.contact_phone,
    contactEmail: r.contact_email,
    website: r.website,
    notes: r.notes,
    hasLogo: !!r.logo_key,
    logoVersion: r.logo_key ? new Date(r.updated_at).getTime() : null,
    studentCount: Number(r.student_count || 0),
    createdAt: r.created_at,
  };
}

/** Tüm firmalar + kaç kesinleşmiş bursiyere burs verdiği */
async function list() {
  const rows = await db('sponsors as s')
    .select('s.*', db.raw(`(SELECT COUNT(*) FROM application_sponsors x
      JOIN applications a ON a.id = x.application_id AND a.status = 'finalized'
      WHERE x.sponsor_id = s.id) AS student_count`))
    .orderBy([{ column: 's.is_active', order: 'desc' }, { column: 's.name' }]);
  return rows.map(serialize);
}

async function get(id) {
  const row = await db('sponsors').where({ id }).first();
  if (!row) throw notFound('Firma bulunamadı');
  return row;
}

function toRow(b) {
  const row = {};
  const map = {
    name: 'name', startedAt: 'started_at', endedAt: 'ended_at', isActive: 'is_active', contactName: 'contact_name',
    contactPhone: 'contact_phone', contactEmail: 'contact_email', website: 'website', notes: 'notes',
  };
  for (const [k, col] of Object.entries(map)) if (b[k] !== undefined) row[col] = b[k];
  return row;
}

async function assertUniqueName(name, exceptId = null) {
  if (!name) return;
  const q = db('sponsors').where({ name });
  if (exceptId) q.whereNot({ id: exceptId });
  if (await q.first('id')) throw validationError({ name: 'Bu isimde bir firma zaten var' });
}

async function create(adminId, body) {
  await assertUniqueName(body.name);
  const [id] = await db('sponsors').insert({ ...toRow(body), created_by: adminId, created_at: new Date(), updated_at: new Date() });
  return id;
}

async function update(id, body) {
  await get(id);
  await assertUniqueName(body.name, id);
  await db('sponsors').where({ id }).update({ ...toRow(body), updated_at: new Date() });
}

/** Bursiyere atanmış firma silinemez (pasife alınmalı) */
async function remove(id) {
  const row = await get(id);
  const used = await db('application_sponsors').where({ sponsor_id: id }).first('application_id');
  if (used) throw new AppError(409, 'SPONSOR_IN_USE', 'Bu firma bursiyerlere atanmış. Silmek yerine pasife alın.');
  await db('sponsors').where({ id }).del();
  if (row.logo_key) await storage.remove(row.logo_key);
  return row;
}

async function setLogo(id, file) {
  const row = await get(id);
  if (!file) throw validationError({ file: 'Logo dosyası seçin' });
  if (file.size > LOGO_MAX) throw new AppError(413, 'FILE_TOO_LARGE', 'Logo en fazla 2 MB olabilir');
  const type = detectType(file.buffer);
  if (!type || type.ext === 'pdf') throw validationError({ file: 'Logo PNG veya JPG olmalı' });
  const key = await storage.save(file.buffer, type.ext);
  await db('sponsors').where({ id }).update({ logo_key: key, logo_mime: type.mime, updated_at: new Date() });
  if (row.logo_key) await storage.remove(row.logo_key);
}

async function removeLogo(id) {
  const row = await get(id);
  if (!row.logo_key) return;
  await db('sponsors').where({ id }).update({ logo_key: null, logo_mime: null, updated_at: new Date() });
  await storage.remove(row.logo_key);
}

async function getLogo(id) {
  const row = await get(id);
  if (!row.logo_key || !(await storage.exists(row.logo_key))) throw notFound('Logo yok');
  return row;
}

// ---------------------------------------------------------------------------
// Bursiyer - firma
// ---------------------------------------------------------------------------

async function forApplication(applicationId) {
  return db('application_sponsors as x')
    .join('sponsors as s', 's.id', 'x.sponsor_id')
    .leftJoin('admin_users as u', 'u.id', 'x.assigned_by')
    .where('x.application_id', applicationId)
    .orderBy('s.name')
    .select('s.id', 's.name', 's.is_active', 's.logo_key', 's.updated_at', 'x.assigned_at', 'u.full_name as assigned_by');
}

/** Detay sayfası için: atanmış firmalar (boşsa Genel Merkez) */
async function detailFor(app) {
  const rows = await forApplication(app.id);
  return {
    editable: app.status === 'finalized',
    items: rows.map((r) => ({
      id: r.id, name: r.name, isActive: !!r.is_active, hasLogo: !!r.logo_key,
      logoVersion: r.logo_key ? new Date(r.updated_at).getTime() : null,
      assignedAt: r.assigned_at, assignedBy: r.assigned_by,
    })),
    label: rows.length ? rows.map((r) => r.name).join(', ') : GENEL_MERKEZ,
  };
}

/**
 * Bursiyerin firmalarını verilen listeyle değiştirir. Boş liste = Genel Merkez.
 * Yeni eklenen firma aktif olmalı; önceden atanmış pasif firma listede kalabilir.
 */
async function setForApplication(admin, app, sponsorIds) {
  if (app.status !== 'finalized') {
    throw new AppError(409, 'NOT_FINALIZED', 'Burs veren firma yalnızca kaydı kesinleşmiş bursiyerlere atanabilir');
  }
  const ids = [...new Set(sponsorIds)];
  const current = (await db('application_sponsors').where({ application_id: app.id }).pluck('sponsor_id')).map(Number);
  const added = ids.filter((id) => !current.includes(id));
  const removed = current.filter((id) => !ids.includes(id));

  if (added.length) {
    const rows = await db('sponsors').whereIn('id', added).select('id', 'is_active');
    if (rows.length !== added.length) throw validationError({ sponsorIds: 'Seçilen firmalardan biri bulunamadı' });
    if (rows.some((r) => !r.is_active)) throw validationError({ sponsorIds: 'Pasif firma yeni atanamaz' });
  }

  await db.transaction(async (trx) => {
    if (removed.length) await trx('application_sponsors').where({ application_id: app.id }).whereIn('sponsor_id', removed).del();
    if (added.length) {
      await trx('application_sponsors').insert(added.map((sponsorId) => ({
        application_id: app.id, sponsor_id: sponsorId, assigned_by: admin.id, assigned_at: new Date(),
      })));
    }
  });
  return { added, removed };
}

/** Liste / export satırları için: başvuru id -> firmalar [{ id, name, hasLogo, logoVersion }] */
async function byApplication(applicationIds) {
  if (!applicationIds.length) return new Map();
  const rows = await db('application_sponsors as x').join('sponsors as s', 's.id', 'x.sponsor_id')
    .whereIn('x.application_id', applicationIds).orderBy('s.name')
    .select('x.application_id', 's.id', 's.name', 's.logo_key', 's.updated_at');
  const map = new Map();
  for (const r of rows) {
    const key = Number(r.application_id);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push({
      id: r.id,
      name: r.name,
      hasLogo: !!r.logo_key,
      logoVersion: r.logo_key ? new Date(r.updated_at).getTime() : null,
    });
  }
  return map;
}

/** Liste filtresi: sponsor = firma id veya 'gm' (firması olmayan kesinleşmiş bursiyerler) */
function applySponsorFilter(q, sponsor) {
  if (!sponsor) return q;
  q.where('a.status', 'finalized');
  const sub = db('application_sponsors as x').whereRaw('x.application_id = a.id');
  if (sponsor === 'gm') return q.whereNotExists(sub.select(db.raw('1')));
  return q.whereExists(sub.clone().where('x.sponsor_id', Number(sponsor)).select(db.raw('1')));
}

module.exports = {
  GENEL_MERKEZ, list, get, create, update, remove, setLogo, removeLogo, getLogo,
  detailFor, setForApplication, byApplication, applySponsorFilter,
};
