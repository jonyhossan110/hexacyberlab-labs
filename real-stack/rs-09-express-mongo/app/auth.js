/* Cookie auth built on the hand-rolled JWT. The cookie IS the session.
   The issued-token set lets the lab tell a token the server really minted
   from one a client built for itself — if a token verifies but was never
   issued here, somebody forged it, and the lab says so. */
const config = require('./config');
const jwt = require('./jwt');
const progress = require('./progress');
const { logEvent } = require('./log');
const { collection } = require('../lib/mongo');

const issuedTokens = new Set(); // JWT strings this server actually minted

function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function userById(id) { return collection('users').findOne({ _id: id }); }
function attachUser(req, res, next) {
  req.cookies = parseCookies(req);
  req.user = null;
  const token = req.cookies[config.jwtCookie];
  if (token) {
    try {
      const payload = jwt.verify(token);
      const user = userById(payload.sub);
      if (user) {
        req.user = user;
        if (!issuedTokens.has(token)) {
          progress.pass('jwt-weak'); // a token we never minted was accepted
          logEvent(req, 'FORGED-TOKEN accepted for ' + user.email + ' (kid/secret weakness)');
        }
      }
    } catch (e) { /* an unverifiable token is simply a logged-out visitor */ }
  }
  next();
}
function issueCookie(req, res, user) {
  const token = jwt.sign({ sub: user._id, email: user.email, role: user.role });
  issuedTokens.add(token);
  res.setHeader('Set-Cookie', `${config.jwtCookie}=${token}; Path=/; HttpOnly`);
  req.user = user;
}
function clearCookie(req, res) {
  res.setHeader('Set-Cookie', `${config.jwtCookie}=; Path=/; Max-Age=0`);
}
function requireLogin(req, res, next) {
  if (!req.user) return res.redirect('/login');
  next();
}
module.exports = { attachUser, issueCookie, clearCookie, requireLogin, issuedTokens, userById };
