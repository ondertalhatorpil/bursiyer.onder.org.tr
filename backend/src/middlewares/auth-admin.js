/**
 * Admin oturumu ve yetkiler.
 *
 * Roller:
 *   super_admin  her şey + kullanıcı ve ayar yönetimi
 *   gm_reviewer  tüm başvurular, tüm statü kararları (onay / red)
 *   coordinator  sadece kapsamındaki başvurular; not, referans teyidi, belge inceleme, revize isteme
 *   viewer       sadece kapsamındaki başvuruları görüntüleme
 *
 * req.admin = { id, email, fullName, role, scopes, can(permission) }
 */
const db = require('../db/knex');
const { readSession } = require('../services/session.service');
const { unauthorized, forbidden } = require('../lib/errors');

const PERMISSIONS = {
  super_admin: ['view_all', 'review', 'decide', 'export', 'view_full_id', 'manage_users', 'manage_settings'],
  gm_reviewer: ['view_all', 'review', 'decide', 'export', 'view_full_id'],
  coordinator: ['review', 'export'],
  viewer: [],
};

async function loadAdmin(adminId) {
  const admin = await db('admin_users as u')
    .join('admin_roles as r', 'r.id', 'u.role_id')
    .where('u.id', adminId)
    .first('u.*', 'r.code as role_code', 'r.name as role_name');
  if (!admin || !admin.is_active) return null;
  const scopes = await db('admin_scopes').where({ admin_user_id: admin.id });
  const perms = PERMISSIONS[admin.role_code] || [];
  return {
    id: admin.id,
    email: admin.email,
    fullName: admin.full_name,
    phone: admin.phone,
    role: admin.role_code,
    roleName: admin.role_name,
    mustChangePassword: !!admin.must_change_password,
    scopes,
    permissions: perms,
    can: (p) => perms.includes(p),
  };
}

/** Oturum zorunlu. allowPasswordChange: şifre değiştirme zorunluluğu varken de geçsin mi */
function requireAdmin({ allowPasswordChange = false } = {}) {
  return async (req, res, next) => {
    const session = await readSession(req, 'admin');
    if (!session) return next(unauthorized('Oturumunuz sona erdi, lütfen tekrar giriş yapın'));
    const admin = await loadAdmin(session.subject_id);
    if (!admin) return next(unauthorized('Hesabınız pasif durumda'));
    if (admin.mustChangePassword && !allowPasswordChange) {
      return next(forbidden('Devam etmeden önce şifrenizi değiştirmeniz gerekiyor'));
    }
    req.admin = admin;
    req.session = session;
    return next();
  };
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.admin?.can(permission)) return next(forbidden());
    return next();
  };
}

/**
 * Başvuru sorgusuna admin kapsamını uygular. view_all yetkisi varsa filtre yok.
 * Kapsam satırları OR ile birleşir; satır içindeki alanlar AND. Kapsamı olmayan koordinatör hiçbir şey görmez.
 * Sorguda applications "a", education "e" takma adıyla olmalı.
 */
function applyScope(query, admin) {
  if (admin.can('view_all')) return query;
  if (!admin.scopes.length) return query.whereRaw('1 = 0');
  return query.where((outer) => {
    for (const s of admin.scopes) {
      outer.orWhere((w) => {
        if (s.category) w.where('a.category', s.category);
        if (s.channel_id) w.where('a.channel_id', s.channel_id);
        if (s.sub_unit_id) w.where('a.sub_unit_id', s.sub_unit_id);
        if (s.city_id) w.where('e.city_id', s.city_id);
        if (!s.category && !s.channel_id && !s.sub_unit_id && !s.city_id) w.whereRaw('1 = 1');
      });
    }
  });
}

module.exports = { requireAdmin, requirePermission, applyScope, loadAdmin, PERMISSIONS };
