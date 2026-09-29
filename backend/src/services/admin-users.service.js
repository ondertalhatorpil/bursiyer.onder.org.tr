/**
 * Aşama 9: admin kullanıcıları, yetki alanları (koordinatör kapsamı) ve işlem kayıtları.
 *
 * Kurallar:
 *   - Kişi kendi rolünü değiştiremez, kendini pasife alamaz
 *   - En az bir aktif süper admin kalmalı
 *   - Rol değişince / pasife alınınca / şifre sıfırlanınca kullanıcının açık oturumları kapanır
 *   - Yeni kullanıcı ve şifre sıfırlamada geçici şifre bir kez gösterilir, ilk girişte değiştirilmesi zorunludur
 */
const argon2 = require('argon2');
const db = require('../db/knex');
const { AppError, notFound, validationError } = require('../lib/errors');
const { formatTrMobile } = require('../lib/phone');
const { tempPassword } = require('../lib/password');
const { PERMISSIONS } = require('../middlewares/auth-admin');
const { destroyAllFor } = require('./session.service');

const CATEGORY_LABELS = { lise: 'Lise', universite: 'Üniversite', yuksek_lisans: 'Yüksek Lisans', doktora: 'Doktora' };

const ROLE_DESCRIPTIONS = {
  super_admin: 'Tüm başvurular, kararlar, ayarlar ve kullanıcı yönetimi',
  gm_reviewer: 'Tüm başvuruları görür, onay / red kararı verir',
  coordinator: 'Sadece yetki alanındaki başvurular: belge inceleme, not, referans, revize',
  viewer: 'Sadece yetki alanındaki başvuruları görüntüler',
};

const hash = (pwd) => argon2.hash(pwd, { type: argon2.argon2id });

async function roles() {
  const rows = await db('admin_roles').orderBy('id');
  return rows.map((r) => ({
    code: r.code,
    name: r.name,
    description: ROLE_DESCRIPTIONS[r.code] || null,
    usesScopes: !(PERMISSIONS[r.code] || []).includes('view_all'),
  }));
}

/** Kapsam satırlarını okunur hale getirir: "Üniversite · ÖNDER Gençlik · Tekno Genç · İstanbul" */
async function describeScopes(rows) {
  if (!rows.length) return [];
  const channelIds = [...new Set(rows.map((r) => r.channel_id).filter(Boolean))];
  const subIds = [...new Set(rows.map((r) => r.sub_unit_id).filter(Boolean))];
  const cityIds = [...new Set(rows.map((r) => r.city_id).filter(Boolean))];
  const [channels, subs, cities] = await Promise.all([
    channelIds.length ? db('channels').whereIn('id', channelIds) : [],
    subIds.length ? db('sub_units').whereIn('id', subIds) : [],
    cityIds.length ? db('cities').whereIn('id', cityIds) : [],
  ]);
  return rows.map((r) => ({
    id: r.id,
    adminUserId: r.admin_user_id,
    category: r.category,
    channelId: r.channel_id,
    subUnitId: r.sub_unit_id,
    cityId: r.city_id,
    label: [
      CATEGORY_LABELS[r.category],
      channels.find((c) => c.id === r.channel_id)?.name,
      subs.find((s) => s.id === r.sub_unit_id)?.name,
      cities.find((c) => c.id === r.city_id)?.name,
    ].filter(Boolean).join(' · ') || 'Tüm başvurular',
  }));
}

function serializeUser(u, scopes = []) {
  const locked = u.locked_until && new Date(u.locked_until) > new Date();
  return {
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    phone: formatTrMobile(u.phone),
    role: u.role_code,
    roleName: u.role_name,
    isActive: !!u.is_active,
    mustChangePassword: !!u.must_change_password,
    lockedUntil: locked ? u.locked_until : null,
    lastLoginAt: u.last_login_at,
    createdAt: u.created_at,
    scopes: scopes.filter((s) => s.adminUserId === u.id),
  };
}

const baseQuery = () => db('admin_users as u')
  .join('admin_roles as r', 'r.id', 'u.role_id')
  .select('u.*', 'r.code as role_code', 'r.name as role_name');

async function list() {
  const users = await baseQuery().orderBy([{ column: 'u.is_active', order: 'desc' }, { column: 'u.full_name' }]);
  const scopes = await describeScopes(await db('admin_scopes').orderBy('id'));
  return users.map((u) => serializeUser(u, scopes));
}

async function get(id) {
  const u = await baseQuery().where('u.id', id).first();
  if (!u) throw notFound('Kullanıcı bulunamadı');
  return serializeUser(u, await describeScopes(await db('admin_scopes').where({ admin_user_id: id })));
}

async function roleByCode(code) {
  const role = await db('admin_roles').where({ code }).first();
  if (!role) throw validationError({ role: 'Geçersiz rol' });
  return role;
}

async function activeSuperAdminCount(trx = db) {
  const r = await trx('admin_users as u').join('admin_roles as r', 'r.id', 'u.role_id')
    .where({ 'r.code': 'super_admin', 'u.is_active': true }).count({ n: '*' }).first();
  return Number(r.n);
}

async function create({ email, fullName, phone, role }) {
  if (await db('admin_users').where({ email }).first()) throw validationError({ email: 'Bu e-posta ile kullanıcı zaten var' });
  const r = await roleByCode(role);
  const password = tempPassword();
  const [id] = await db('admin_users').insert({
    email,
    full_name: fullName,
    phone,
    role_id: r.id,
    password_hash: await hash(password),
    must_change_password: true,
  });
  return { user: await get(id), tempPassword: password };
}

async function update(actor, id, input) {
  const user = await baseQuery().where('u.id', id).first();
  if (!user) throw notFound('Kullanıcı bulunamadı');
  const self = actor.id === id;

  const patch = {};
  if (input.fullName !== undefined) patch.full_name = input.fullName;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.email !== undefined && input.email !== user.email) {
    if (await db('admin_users').where({ email: input.email }).whereNot({ id }).first()) {
      throw validationError({ email: 'Bu e-posta ile kullanıcı zaten var' });
    }
    patch.email = input.email;
  }
  let roleChanged = false;
  if (input.role !== undefined && input.role !== user.role_code) {
    if (self) throw validationError({ role: 'Kendi rolünüzü değiştiremezsiniz' });
    patch.role_id = (await roleByCode(input.role)).id;
    roleChanged = true;
  }
  let deactivated = false;
  if (input.isActive !== undefined && input.isActive !== !!user.is_active) {
    if (self && !input.isActive) throw validationError({ isActive: 'Kendi hesabınızı pasife alamazsınız' });
    patch.is_active = input.isActive;
    deactivated = !input.isActive;
  }

  const losesSuper = user.role_code === 'super_admin' && user.is_active && (roleChanged || deactivated);
  await db.transaction(async (trx) => {
    if (losesSuper && (await activeSuperAdminCount(trx)) <= 1) {
      throw new AppError(409, 'LAST_SUPER_ADMIN', 'En az bir aktif süper admin kalmalı');
    }
    if (Object.keys(patch).length) await trx('admin_users').where({ id }).update({ ...patch, updated_at: new Date() });
  });
  if (roleChanged || deactivated) await destroyAllFor('admin', id);
  return get(id);
}

async function resetPassword(actor, id) {
  const user = await db('admin_users').where({ id }).first();
  if (!user) throw notFound('Kullanıcı bulunamadı');
  if (actor.id === id) throw new AppError(409, 'SELF_RESET', 'Kendi şifrenizi "Şifre değiştir" ekranından değiştirin');
  const password = tempPassword();
  await db('admin_users').where({ id }).update({
    password_hash: await hash(password),
    must_change_password: true,
    failed_logins: 0,
    locked_until: null,
    updated_at: new Date(),
  });
  await destroyAllFor('admin', id);
  return { tempPassword: password };
}

/**
 * Kapsam satırlarını değiştirir (tümünü siler, yenilerini yazar).
 * Kanal seçilince kategori kanaldan alınır; alt birim o kanala ait olmalı.
 */
async function setScopes(id, scopes) {
  if (!(await db('admin_users').where({ id }).first())) throw notFound('Kullanıcı bulunamadı');
  const rows = [];
  for (const [i, s] of scopes.entries()) {
    const row = { admin_user_id: id, category: s.category || null, channel_id: s.channelId || null, sub_unit_id: s.subUnitId || null, city_id: s.cityId || null };
    if (row.channel_id) {
      const ch = await db('channels').where({ id: row.channel_id }).first();
      if (!ch) throw validationError({ [`scopes.${i}.channelId`]: 'Kanal bulunamadı' });
      if (row.category && row.category !== ch.category) throw validationError({ [`scopes.${i}.channelId`]: 'Kanal seçilen kategoriye ait değil' });
      row.category = ch.category;
    }
    if (row.sub_unit_id) {
      const su = await db('sub_units').where({ id: row.sub_unit_id }).first();
      if (!su || su.channel_id !== row.channel_id) throw validationError({ [`scopes.${i}.subUnitId`]: 'Birim seçilen kanala ait değil' });
    }
    if (row.city_id && !(await db('cities').where({ id: row.city_id }).first())) {
      throw validationError({ [`scopes.${i}.cityId`]: 'İl bulunamadı' });
    }
    if (!row.category && !row.city_id) throw validationError({ [`scopes.${i}`]: 'En az kategori veya il seçin' });
    rows.push(row);
  }
  await db.transaction(async (trx) => {
    await trx('admin_scopes').where({ admin_user_id: id }).del();
    if (rows.length) await trx('admin_scopes').insert(rows);
  });
  return get(id);
}

// ---------------------------------------------------------------------------
// İşlem kayıtları
// ---------------------------------------------------------------------------

const ACTION_LABELS = {
  'admin.login': 'Giriş yaptı',
  'admin.password_changed': 'Şifresini değiştirdi',
  'application.view': 'Başvuru görüntüledi',
  'application.status': 'Statü değiştirdi',
  'application.note': 'Not ekledi',
  'application.reference': 'Referans işaretledi',
  'application.qualified_set': 'Nitelikli bursiyer olarak işaretledi',
  'application.qualified_unset': 'Nitelikli bursiyer işaretini kaldırdı',
  'document.view': 'Belge açtı',
  'document.review': 'Belge değerlendirdi',
  'export.xlsx': 'Excel indirdi',
  'export.payments': 'Ödeme listesi indirdi',
  'iban.review': 'IBAN kontrol etti',
  'iban.document_view': 'Hesap belgesi açtı',
  'settings.program': 'Dönem ayarını değiştirdi',
  'settings.program_create': 'Yeni dönem oluşturdu',
  'settings.consent': 'Onay metni yayınladı',
  'settings.content': 'Ekran metnini değiştirdi',
  'settings.sms': 'SMS şablonunu değiştirdi',
  'settings.sms_test': 'Test SMS\'i gönderdi',
  'user.create': 'Kullanıcı ekledi',
  'user.update': 'Kullanıcıyı düzenledi',
  'user.reset_password': 'Şifre sıfırladı',
  'user.scopes': 'Yetki alanını değiştirdi',
};

async function auditLogs({ adminId, action, from, to, page = 1, pageSize = 50 }) {
  const q = db('audit_logs as l').leftJoin('admin_users as u', 'u.id', 'l.admin_user_id');
  if (adminId) q.where('l.admin_user_id', adminId);
  if (action) q.where('l.action', 'like', `${action.replace(/[%_\\]/g, '\\$&')}%`);
  if (from) q.where('l.created_at', '>=', new Date(from));
  if (to) q.where('l.created_at', '<', new Date(new Date(to).getTime() + 86400000));

  const [{ total }] = await q.clone().count({ total: '*' });
  const rows = await q.clone()
    .select('l.*', 'u.full_name as admin_name', 'u.email as admin_email')
    .orderBy('l.id', 'desc')
    .limit(pageSize).offset((page - 1) * pageSize);

  return {
    items: rows.map((r) => {
      const meta = typeof r.meta === 'string' ? JSON.parse(r.meta) : r.meta;
      return {
        id: Number(r.id),
        at: r.created_at,
        admin: r.admin_name || null,
        adminEmail: r.admin_email || null,
        action: r.action,
        actionLabel: ACTION_LABELS[r.action] || r.action,
        targetType: r.target_type,
        meta: meta || null,
        ip: r.ip,
      };
    }),
    page,
    pageSize,
    total: Number(total),
    totalPages: Math.max(1, Math.ceil(Number(total) / pageSize)),
    actions: Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label })),
  };
}

module.exports = { roles, list, get, create, update, resetPassword, setScopes, auditLogs };
