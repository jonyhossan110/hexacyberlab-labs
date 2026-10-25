/* Session auth (server-side session map + cookie) and the API tokens the
   SPA uses. Login issues BOTH: a session cookie for the web UI and a JWT
   for the API. The issued-token set lets the lab tell a token the server
   really minted from one a client built for itself. */
const crypto = require('crypto');
const config = require('./config');
const { getDb } = require('./db');
const jwt = require('./jwt');

const sessions = new Map();      // sid -> userId
const issuedTokens = new Set();  // JWT strings this server actually minted

function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function userById(id) {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) || null;
}
function attachUser(req, res, next) {
  req.cookies = parseCookies(req);
  const sid = req.cookies[config.sessionCookie];
  req.user = sid && sessions.has(sid) ? userById(sessions.get(sid)) : null;
  next();
}
function startSession(req, res, user) {
  const sid = crypto.randomBytes(24).toString('hex');
  sessions.set(sid, user.id);
  res.setHeader('Set-Cookie', [
    `${config.sessionCookie}=${sid}; Path=/; HttpOnly`,
    `${config.jwtCookie}=${issueToken(user)}; Path=/`,
  ]);
  req.user = user;
}
function endSession(req, res) {
  const sid = req.cookies[config.sessionCookie];
  if (sid) sessions.delete(sid);
  res.setHeader('Set-Cookie', [
    `${config.sessionCookie}=; Path=/; Max-Age=0`,
    `${config.jwtCookie}=; Path=/; Max-Age=0`,
  ]);
}
function issueToken(user) {
  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role, ws: user.workspace_id });
  issuedTokens.add(token);
  return token;
}
function requireLogin(req, res, next) {
  if (!req.user) return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  next();
}
module.exports = { attachUser, startSession, endSession, issueToken, requireLogin, issuedTokens, userById };
