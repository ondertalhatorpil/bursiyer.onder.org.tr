/**
 * /api/admin/dashboard  özet istatistikler (kapsamla sınırlı)
 * /api/admin/programs   dönem listesi (filtre için)
 */
const { Router } = require('express');
const { z } = require('zod');
const db = require('../../../db/knex');
const { validate } = require('../../../middlewares/validate');
const svc = require('../../../services/admin-applications.service');

const router = Router();

router.get('/dashboard', validate({ query: z.object({ programId: z.coerce.number().int().positive().optional() }) }), async (req, res) => {
  res.json(await svc.dashboard(req.admin, req.valid.query.programId));
});

router.get('/programs', async (req, res) => {
  const rows = await db('programs').orderBy('id', 'desc').select('id', 'name', 'title', 'is_open', 'opens_at', 'closes_at');
  res.json(rows.map((p) => ({ id: p.id, name: p.name, title: p.title, isOpen: !!p.is_open, opensAt: p.opens_at, closesAt: p.closes_at })));
});

module.exports = router;
