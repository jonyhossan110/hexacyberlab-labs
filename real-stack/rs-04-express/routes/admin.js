const express = require('express');
const { getDb } = require('../app/db');
const auth = require('../app/auth');
const jwt = require('../app/jwt');
const progress = require('../app/progress');
const config = require('../app/config');
const router = express.Router();

function bearer(req) {
  const h = req.get('authorization') || '';
  if (h.startsWith('Bearer ')) return h.slice(7);
  return req.cookies ? req.cookies[config.jwtCookie] : null;
}
function apiAuth(req, res, next) {
  const token = bearer(req);
  if (!token) { res.status(401).json({ error: 'missing token' }); return; }
  try { req.apiUser = jwt.verify(token); next(); }
  catch (e) { res.status(401).json({ error: 'invalid token: ' + e.message }); }
}
router.get('/api/me', apiAuth, (req, res) => { res.json({ user: req.apiUser }); });
router.get('/api/token', auth.requireLogin, (req, res) => { res.json({ token: auth.issueToken(req.user) }); });
/* The admin API trusts the role inside the JWT. A token the server never
   issued — alg=none, or signed by anyone who guesses the secret — that
   carries role "admin" is accepted exactly like a real one. */
router.get('/api/admin/users', apiAuth, (req, res) => {
  if (req.apiUser.role !== 'admin') { res.status(403).json({ error: 'admin role required' }); return; }
  const token = bearer(req);
  if (!auth.issuedTokens.has(token)) progress.pass('jwt-weak'); // verified, admin — but never minted by this server
  const users = getDb().prepare('SELECT id, workspace_id, name, email, role, plan, credits FROM users ORDER BY id').all();
  res.json({ count: users.length, users });
});
module.exports = router;
