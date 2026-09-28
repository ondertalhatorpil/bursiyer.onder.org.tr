/**
 * Oturum gerektirmeyen okuma uç noktaları: dönem durumu, metinler ve form listeleri.
 */
const db = require('../../db/knex');
const { notFound } = require('../../lib/errors');
const { parseJson } = require('../../lib/rules');
const svc = require('../../services/application.service');

async function program(req, res) {
  const p = await svc.getOpenProgram();
  if (p) {
    return res.json({ open: true, name: p.name, title: p.title, opensAt: p.opens_at, closesAt: p.closes_at });
  }
  const latest = await db('programs').orderBy('id', 'desc').first();
  const closed = await db('content_blocks').where({ key: 'applications_closed' }).first();
  return res.json({
    open: false,
    name: latest?.name || null,
    title: latest?.title || null,
    // Tarihler sadece dönem açık işaretliyken anlamlı (başlangıç tarihi bekleniyorsa gösterilir)
    opensAt: latest?.is_open ? latest.opens_at : null,
    closesAt: latest?.is_open ? latest.closes_at : null,
    message: closed?.body || 'Başvurular şu an kapalıdır.',
  });
}

async function consent(req, res) {
  const text = await svc.getActiveConsentText(req.valid.params.type);
  if (!text) throw notFound('Metin henüz yayınlanmadı');
  res.json({ id: text.id, type: text.type, version: text.version, title: text.title, label: text.label, body: text.body });
}

async function content(req, res) {
  const block = await db('content_blocks').where({ key: req.valid.params.key }).first();
  if (!block) throw notFound();
  res.json({ key: block.key, title: block.title, body: block.body });
}

async function cities(req, res) {
  res.json(await db('cities').select('id', 'name').orderBy('name'));
}

async function districts(req, res) {
  res.json(await db('districts').where({ city_id: req.valid.params.cityId }).select('id', 'name').orderBy('name'));
}

async function schools(req, res) {
  const { cityId, districtId, type, q } = req.valid.query;
  const query = db('schools as s')
    .join('cities as c', 'c.id', 's.city_id')
    .join('districts as d', 'd.id', 's.district_id')
    .where('s.is_active', true)
    .select('s.id', 's.name', 's.city_id as cityId', 'c.name as cityName', 's.district_id as districtId', 'd.name as districtName')
    .orderBy(['c.name', 'd.name', 's.name'])
    .limit(500);
  if (cityId) query.andWhere('s.city_id', cityId);
  if (districtId) query.andWhere('s.district_id', districtId);
  if (type === 'sports') query.andWhere('s.is_sports', true);
  if (type === 'international') query.andWhere('s.is_international', true);
  if (q) query.andWhere('s.name', 'like', `%${q.replace(/[%_\\]/g, '\\$&')}%`);
  res.json(await query);
}

async function universities(req, res) {
  const { cityId, q } = req.valid.query;
  const query = db('universities as u')
    .leftJoin('cities as c', 'c.id', 'u.city_id')
    .where('u.is_active', true)
    .select('u.id', 'u.name', 'u.type', 'u.city_id as cityId', 'c.name as cityName')
    .orderBy('u.name')
    .limit(300);
  if (cityId) query.andWhere('u.city_id', cityId);
  if (q) query.andWhere('u.name', 'like', `%${q.replace(/[%_\\]/g, '\\$&')}%`);
  res.json(await query);
}

async function dormitories(req, res) {
  res.json(await db('dormitories').where({ is_active: true }).select('id', 'name').orderBy('sort'));
}

async function channels(req, res) {
  const rows = await db('channels')
    .where({ category: req.valid.query.category, is_active: true })
    .orderBy('sort');
  const subUnits = rows.length
    ? await db('sub_units').whereIn('channel_id', rows.map((r) => r.id)).where({ is_active: true }).orderBy('sort')
    : [];

  res.json(rows.map((ch) => ({
    id: ch.id,
    code: ch.code,
    name: ch.name,
    description: ch.description,
    extraFields: parseJson(ch.extra_fields) || [],
    subUnits: subUnits.filter((u) => u.channel_id === ch.id).map((u) => ({
      id: u.id, code: u.code, name: u.name, extraFields: parseJson(u.extra_fields) || [],
    })),
  })));
}

module.exports = { program, consent, content, cities, districts, schools, universities, dormitories, channels };
