/* Hand-rolled JSON Web Tokens (HS256). Read verify() carefully: it loads
   the signing key from the file the TOKEN names in its "kid" header —
   keys/main.key for honest tokens, but the name is attacker-controlled,
   and keys/legacy.key is a retired key file somebody emptied and left
   behind. The default secret is also the product's own name. */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const config = require('./config');

function b64uEncode(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64uDecode(str) {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}
function sign(payload) {
  const header = { alg: 'HS256', typ: 'JWT', kid: 'main.key' };
  const data = b64uEncode(JSON.stringify(header)) + '.' + b64uEncode(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', config.jwtSecret).update(data).digest();
  return data + '.' + b64uEncode(sig);
}
function keyFor(header) {
  if (header.kid) {
    // the token chooses its own key file — traversal and all
    return fs.readFileSync(path.join(config.keysDir, String(header.kid)), 'utf8').trim();
  }
  return config.jwtSecret;
}
function verify(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('malformed token');
  const header = JSON.parse(b64uDecode(parts[0]));
  const payload = JSON.parse(b64uDecode(parts[1]));
  if (header.alg !== 'HS256') throw new Error('unsupported alg');
  const data = parts[0] + '.' + parts[1];
  const expected = b64uEncode(crypto.createHmac('sha256', keyFor(header)).update(data).digest());
  if (expected !== parts[2]) throw new Error('bad signature');
  return payload;
}
module.exports = { sign, verify };
