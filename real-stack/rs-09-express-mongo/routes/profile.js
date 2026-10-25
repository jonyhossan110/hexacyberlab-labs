const express = require('express');
const fs = require('fs');
const path = require('path');
const auth = require('../app/auth');
const progress = require('../app/progress');
const config = require('../app/config');
const { logEvent } = require('../app/log');
const layout = require('../app/layout');
const views = require('../app/views');
const { collection, hasOperator } = require('../lib/mongo');
const router = express.Router();

const users = () => collection('users');
const posts = () => collection('posts');

/* A deep-merge helper from the settings sprint: nested preference objects
   are merged recursively so the mobile app can send partial prefs. It
   walks whatever keys it is given — including "__proto__". */
function deepMerge(target, src) {
  for (const k of Object.keys(src || {})) {
    const v = src[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const base = target[k] && typeof target[k] === 'object' ? target[k] : {};
      target[k] = deepMerge(base, v);
    } else {
      target[k] = v;
    }
  }
  return target;
}

router.get('/profile', auth.requireLogin, (req, res) => {
  res.send(layout.head('Edit profile', req.user) + views.profileForm(req.user, '') + layout.foot());
});
/* Profile update. Scalar fields are saved directly; prefs go through the
   deep merge. There is no anti-CSRF token anywhere — with cookie auth,
   that is an invitation. */
router.post('/profile', auth.requireLogin, (req, res) => {
  const u = req.user;
  for (const f of ['name', 'bio', 'location', 'website']) {
    if (typeof req.body[f] === 'string') u[f] = req.body[f];
  }
  if (req.body.prefs && typeof req.body.prefs === 'object') {
    u.prefs = deepMerge(u.prefs || {}, req.body.prefs);
  }
  users().save(u);
  /* Prototype pollution, verified server-side: if a fresh empty object now
     carries properties nobody set on it, Object.prototype itself was hit.
     The lab notes it, then cleans up so the other tests keep running. */
  if (({}).isAdmin !== undefined || ({}).polluted !== undefined || Object.prototype.isAdmin !== undefined) {
    progress.pass('prototype-pollution');
    logEvent(req, 'PROTO-POLLUTION Object.prototype gained a property via profile prefs merge');
    delete Object.prototype.isAdmin;
    delete Object.prototype.polluted;
  }
  /* No anti-CSRF token exists anywhere in this app — a tokenless POST that
     arrives without our own Referer is a cross-site forgery. */
  const hasToken = !!(req.body && req.body.csrf_token);
  const ref = req.get('referer') || '';
  let refHost = '';
  try { refHost = ref ? new URL(ref).host : ''; } catch (e) { refHost = 'unparseable'; }
  if (!hasToken && (ref === '' || refHost !== req.get('host'))) progress.pass('csrf-profile');
  logEvent(req, 'PROFILE saved');
  res.send(layout.head('Edit profile', req.user) + views.profileForm(req.user, 'Profile saved.') + layout.foot());
});
/* Avatar upload — the mobile client's JSON API. The filename and bytes are
   trusted completely: no extension check, no content sniffing, nothing.
   The file lands in uploads/ and is served back from this same origin. */
router.post('/profile/avatar', auth.requireLogin, (req, res) => {
  const { filename, data } = req.body || {};
  if (!filename || !data) return res.status(400).json({ error: 'filename and data (base64) are required' });
  const name = path.basename(String(filename));
  const buf = Buffer.from(String(data), 'base64');
  fs.mkdirSync(config.uploadsDir, { recursive: true });
  fs.writeFileSync(path.join(config.uploadsDir, name), buf);
  req.user.avatar = '/uploads/' + name;
  users().save(req.user);
  logEvent(req, 'AVATAR uploaded ' + name + ' (' + buf.length + ' bytes)');
  res.json({ ok: true, avatar: req.user.avatar });
});
/* Serving uploads: the content type is guessed from the extension, so an
   SVG (or an HTML file) is served as ACTIVE content on the app's origin. */
const MIME = { '.svg': 'image/svg+xml', '.html': 'text/html', '.htm': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.txt': 'text/plain' };
router.get('/uploads/:name', (req, res) => {
  const name = path.basename(req.params.name);
  const file = path.join(config.uploadsDir, name);
  if (!fs.existsSync(file)) return res.status(404).send('Not found');
  const ext = path.extname(name).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const body = fs.readFileSync(file);
  if ((type === 'image/svg+xml' || type === 'text/html') && /<script|on\w+\s*=/i.test(body.toString('utf8'))) {
    progress.pass('upload-avatar'); // active content the user planted is being served
    logEvent(req, 'UPLOAD-SERVED active content ' + name + ' as ' + type);
  }
  res.type(type).send(body);
});
/* A member's public profile. Their private posts are listed as locked —
   their ids ride along in the links. */
router.get('/user/:id', auth.requireLogin, (req, res) => {
  const u = users().findOne({ _id: req.params.id });
  if (!u) { res.status(404).send(layout.head('Not found', req.user) + '<h1>Member not found</h1>' + layout.foot()); return; }
  const theirs = posts().find({ authorId: u._id });
  res.send(layout.head(u.name, req.user) + views.publicProfile(u, theirs, req.user) + layout.foot());
});
/* Find people — the directory. The query the visitor types is handed to
   the store almost as-is: extra parameters become extra conditions, and
   OBJECT parameters become query operators. The full member documents —
   email and password included — come back. That is two flaws in one. */
function runFind(req) {
  return users().find(req.query || {});
}
function noteExtraction(req, results) {
  const other = results.some(u => u._id !== req.user._id);
  if (hasOperator(req.query) && other && results.length) {
    progress.pass('nosql-extract'); // an operator probe pulled back another member's full record
    logEvent(req, 'NOSQL-EXTRACT operator query returned ' + results.length + ' full member record(s)');
  }
}
router.get('/find', auth.requireLogin, (req, res) => {
  const has = Object.keys(req.query || {}).length > 0;
  const results = has ? runFind(req) : null;
  if (results) noteExtraction(req, results);
  res.send(layout.head('Find people', req.user) + views.findPage(results, req.query.name) + layout.foot());
});
router.get('/api/users/find', auth.requireLogin, (req, res) => {
  const results = runFind(req);
  noteExtraction(req, results);
  res.json(results);
});
module.exports = router;
