/** Admin geçici şifresi: karışmayan karakterlerle 12 hane (ilk girişte değiştirilmesi zorunlu) */
const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

function tempPassword(length = 12) {
  return Array.from({ length }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('');
}

module.exports = { tempPassword };
