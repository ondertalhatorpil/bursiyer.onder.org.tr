/**
 * Testlerde kayıtlı ve oturum açmış aday oluşturur.
 */
const request = require('supertest');
const app = require('../../src/app');
const { outbox } = require('../../src/services/sms/ekomesaj');

const lastCode = () => outbox.at(-1).text.match(/\b(\d{6})\b/)[1];

async function registerApplicant(over = {}) {
  const agent = request.agent(app);
  const start = await agent.post('/api/auth/register/start').send({
    firstName: 'Ahmet',
    lastName: 'Yılmaz',
    idNumber: '10000000146',
    birthDate: '15/04/2005',
    phone: '05321112233',
    email: 'ahmet@ornek.com',
    consents: { kvkk: true, sharing: true },
    ...over,
  });
  if (start.status !== 200) throw new Error(`register/start ${start.status}: ${JSON.stringify(start.body)}`);
  const verify = await agent.post('/api/auth/register/verify')
    .send({ registrationToken: start.body.registrationToken, code: lastCode() });
  if (verify.status !== 201) throw new Error(`register/verify ${verify.status}: ${JSON.stringify(verify.body)}`);
  return agent;
}

module.exports = { registerApplicant, lastCode, outbox };
