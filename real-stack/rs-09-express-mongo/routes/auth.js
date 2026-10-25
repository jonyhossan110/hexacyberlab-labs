const express = require('express');
const auth = require('../app/auth');
const progress = require('../app/progress');
const { logEvent } = require('../app/log');
const layout = require('../app/layout');
const views = require('../app/views');
const { collection, hasOperator } = require('../lib/mongo');
const router = express.Router();

const users = () => collection('users');
const posts = () => collection('posts');

router.get('/login', (req, res) => {
  res.send(layout.head('Login', null) + views.login('/', '') + layout.foot());
});
/* Login, written the way it ships in a thousand MEAN-stack tutorials:
   the request fields are dropped straight into a findOne(). With a form
   post they are strings and everything looks fine. With a JSON body they
   can be OBJECTS — and the query engine reads objects as operators. */
router.post('/login', (req, res) => {
  const body = req.body || {};
  const user = users().findOne({ email: body.email, password: body.password });
  if (user) {
    if (hasOperator(body.email) || hasOperator(body.password)) {
      progress.pass('nosql-auth'); // a query operator, not a password, opened this account
      logEvent(req, 'NOSQL-LOGIN operator injection logged in as ' + user.email);
    } else {
      logEvent(req, 'LOGIN ok ' + user.email);
    }
    auth.issueCookie(req, res, user);
    return res.redirect('/');
  }
  const key = 'login:' + (typeof body.email === 'string' ? body.email.toLowerCase() : 'operator');
  const n = progress.attempt(key);
  logEvent(req, `LOGIN fail (attempt ${n})`);
  if (n >= 10) progress.pass('brute-force'); // ten failures and the door is still wide open
  res.send(layout.head('Login', null) + views.login('/', 'Invalid email or password.') + layout.foot());
});
router.get('/register', (req, res) => {
  res.send(layout.head('Register', null) + views.register('') + layout.foot());
});
router.post('/register', (req, res) => {
  const { name, handle, email, password } = req.body || {};
  if (!name || !handle || !email || !password) {
    return res.send(layout.head('Register', null) + views.register('All fields are required.') + layout.foot());
  }
  if (users().findOne({ email: String(email) })) {
    return res.send(layout.head('Register', null) + views.register('That email is already registered.') + layout.foot());
  }
  const doc = {
    _id: 'u' + Date.now().toString(36), name: String(name), handle: String(handle),
    email: String(email), password: String(password), role: 'user', bio: '', location: '',
    website: '', avatar: '', prefs: { theme: 'light', notifications: true }, joined: new Date().toISOString().slice(0, 10),
  };
  users().insertOne(doc);
  auth.issueCookie(req, res, doc);
  res.redirect('/');
});
router.get('/logout', (req, res) => { auth.clearCookie(req, res); res.redirect('/login'); });

/* Home = the feed: every public post, plus your own (including private). */
router.get('/', auth.requireLogin, (req, res) => { renderFeed(req, res, null); });
function renderFeed(req, res, preview) {
  const all = posts().find({});
  const visible = all.filter(p => p.visibility === 'public' || p.authorId === req.user._id);
  const byId = {};
  for (const u of users().find({})) byId[u._id] = u;
  // stored-XSS detection: another member's post carrying markup is being rendered raw to this viewer
  for (const p of visible) {
    if (p.authorId !== req.user._id && /<script|<svg|onerror\s*=|<img[^>]+on\w+\s*=/i.test(p.body)) { progress.pass('xss-stored'); break; }
  }
  res.send(layout.head('Feed', req.user) + views.feed(req.user, visible, byId, preview) + layout.foot());
}

/* Who am I — the API twin of the cookie. Handy for checking what a token buys. */
router.get('/api/me', auth.requireLogin, (req, res) => {
  const { _id, name, handle, email, role } = req.user;
  res.json({ _id, name, handle, email, role });
});

/* An "internal only" status endpoint — internal by intention, not by enforcement.
   The SSRF test is about reaching it through the preview fetcher, from the server itself. */
router.get('/internal/metrics', (req, res) => {
  if (req.get('x-hexasocial-fetcher')) progress.pass('ssrf-preview'); // reached via the preview fetcher
  res.type('text/plain').send('HEXASOCIAL-INTERNAL metrics: feed workers 3, queue depth 0, cache hit 98%. This page assumes only the office network can see it.');
});
module.exports = router;
module.exports.renderFeed = renderFeed;
