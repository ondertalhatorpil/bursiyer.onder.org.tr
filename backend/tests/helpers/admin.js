/** Admin testleri için: kullanıcı oluşturma ve giriş yapmış agent */
const request = require('supertest');
const argon2 = require('argon2');
const app = require('../../src/app');
const db = require('../../src/db/knex');
const { lastCode } = require('./applicant');

const PASSWORD = 'GucluSifre123';

async function createAdmin(email, role, { mustChange = false, phone = '905550000001' } = {}) {
  const r = await db('admin_roles').where({ code: role }).first();
  const [id] = await db('admin_users').insert({
    email, full_name: `${role} Kullanıcı`, phone, role_id: r.id,
    password_hash: await argon2.hash(PASSWORD, { type: argon2.argon2id }), must_change_password: mustChange,
  });
  return id;
}

async function adminAgent(email, password = PASSWORD) {
  const agent = request.agent(app);
  const login = await agent.post('/api/admin/auth/login').send({ email, password }).expect(200);
  await agent.post('/api/admin/auth/verify').send({ loginToken: login.body.loginToken, code: lastCode() }).expect(200);
  await db('otp_codes').update({ created_at: new Date(Date.now() - 120000) }); // sonraki girişler bekleme süresine takılmasın
  return agent;
}

module.exports = { PASSWORD, createAdmin, adminAgent };
