/**
 * zod şemasıyla istek doğrulama.
 *   router.post('/x', validate({ body: schema }), controller)
 * Doğrulanmış (ve dönüştürülmüş) veri req.valid.body / req.valid.query / req.valid.params içine konur.
 * Hata detayı: { alan: 'mesaj' } biçiminde, frontend doğrudan form alanına yazabilir.
 */
const { validationError } = require('../lib/errors');

function toDetails(issues) {
  const details = {};
  for (const issue of issues) {
    const key = issue.path.join('.') || '_';
    if (!details[key]) details[key] = issue.message;
  }
  return details;
}

function validate(schemas) {
  return (req, res, next) => {
    req.valid = req.valid || {};
    for (const part of ['params', 'query', 'body']) {
      if (!schemas[part]) continue;
      const result = schemas[part].safeParse(req[part] ?? {});
      if (!result.success) return next(validationError(toDetails(result.error.issues)));
      req.valid[part] = result.data;
    }
    return next();
  };
}

module.exports = { validate, toDetails };
