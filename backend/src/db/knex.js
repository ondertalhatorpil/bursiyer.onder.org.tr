/** Uygulama genelinde tek knex örneği. Ayarlar knexfile.js ile aynıdır. */
const knex = require('knex');
const config = require('../config');
const knexfile = require('../../knexfile');

const db = knex(knexfile[config.env] || knexfile.development);

module.exports = db;
