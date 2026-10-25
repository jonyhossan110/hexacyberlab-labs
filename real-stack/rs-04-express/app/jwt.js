/* Hand-rolled JSON Web Tokens (HS256) — written by the founding engineer
   in a weekend. Study verify(): it trusts the token's own alg header,
   and the signing secret is one of the most common passwords on earth. */
const crypto = require('crypto');
const config = require('./config');

function b64uEncode(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64uDecode(str) {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}
function sign(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const data = b64uEncode(JSON.stringify(header)) + '.' + b64uEncode(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', config.jwtSecret).update(data).digest();
  return data + '.' + b64uEncode(sig);
}
function verify(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('malformed token');
  const header = JSON.parse(b64uDecode(parts[0]));
  const payload = JSON.parse(b64uDecode(parts[1]));
  if (header.alg === 'none') {
    // "some clients send unsigned tokens" — accepted, no signature at all
    return payload;
  }
  if (header.alg === 'HS256') {
    const data = parts[0] + '.' + parts[1];
    const expected = b64uEncode(crypto.createHmac('sha256', config.jwtSecret).update(data).digest());
    if (expected !== parts[2]) throw new Error('bad signature');
    return payload;
  }
  throw new Error('unsupported alg');
}
module.exports = { sign, verify };
