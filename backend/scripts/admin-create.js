/**
 * Admin kullanıcısı oluşturur (ilk süper admin için; sonrası panelden).
 *   npm run admin:create -- <e-posta> "<Ad Soyad>" <cep telefonu> [rol]
 *   rol: super_admin (varsayılan) | gm_reviewer | coordinator | viewer
 * Geçici şifre üretip ekrana yazar; ilk girişte değiştirilmesi zorunludur.
 * Giriş ikinci adımda telefona SMS kodu ister (SMS_DRIVER=log iken kod konsola yazılır).
 */
const argon2 = require('argon2');
const db = require('../src/db/knex');
const { normalizeTrMobile } = require('../src/lib/phone');
const { tempPassword } = require('../src/lib/password');

(async () => {
  const [email, fullName, phoneRaw, roleCode = 'super_admin'] = process.argv.slice(2);
  const phone = normalizeTrMobile(phoneRaw);
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !fullName || !phone) {
    console.error('Kullanım: npm run admin:create -- <e-posta> "<Ad Soyad>" <05XXXXXXXXX> [rol]');
    process.exit(1);
  }
  const role = await db('admin_roles').where({ code: roleCode }).first();
  if (!role) {
    console.error(`Bilinmeyen rol: ${roleCode}. Seçenekler: super_admin, gm_reviewer, coordinator, viewer`);
    process.exit(1);
  }
  if (await db('admin_users').where({ email: email.toLowerCase() }).first()) {
    console.error('Bu e-posta ile kullanıcı zaten var.');
    process.exit(1);
  }

  const temp = tempPassword();

  await db('admin_users').insert({
    email: email.toLowerCase(),
    password_hash: await argon2.hash(temp, { type: argon2.argon2id }),
    full_name: fullName,
    phone,
    role_id: role.id,
    must_change_password: true,
  });

  console.log(`\nAdmin oluşturuldu: ${email} (${role.name})`);
  console.log(`Geçici şifre: ${temp}`);
  console.log('İlk girişte şifre değiştirilmesi istenecek.\n');
  await db.destroy();
})().catch(async (err) => {
  console.error(err.message);
  await db.destroy();
  process.exit(1);
});
