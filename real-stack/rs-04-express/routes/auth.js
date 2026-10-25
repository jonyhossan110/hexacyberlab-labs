const express = require('express');
const { getDb } = require('../app/db');
const auth = require('../app/auth');
const progress = require('../app/progress');
const { logEvent } = require('../app/log');
const layout = require('../app/layout');
const views = require('../app/views');
const router = express.Router();

router.get('/login', (req, res) => {
  res.send(layout.head('Login', null) + views.login(req.query.next || '/', '') + layout.foot());
});
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = getDb().prepare('SELECT * FROM users WHERE email = ? AND password = ?').get(email, password);
  if (user) {
    logEvent(req, 'LOGIN ok ' + user.email);
    auth.startSession(req, res, user);
    const next = req.body.next || '/';
    // the "next" parameter is trusted blindly — an off-site URL walks away with the user
    if (/^(https?:)?\/\//i.test(next)) progress.pass('open-redirect');
    return res.redirect(next);
  }
  const n = progress.attempt('login:' + String(email || '').toLowerCase());
  logEvent(req, `LOGIN fail ${email} (attempt ${n})`);
  if (n >= 10) progress.pass('brute-force'); // ten failures and the door is still wide open
  res.send(layout.head('Login', null) + views.login(req.body.next || '/', 'Invalid email or password.') + layout.foot());
});
router.get('/register', (req, res) => {
  res.send(layout.head('Register', null) + views.register('') + layout.foot());
});
router.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  try {
    const info = getDb().prepare("INSERT INTO users (workspace_id,name,email,password,role,title,plan,credits) VALUES (1,?,?,?,'agent','Support Agent','growth',100)").run(name, email, password);
    const user = auth.userById(info.lastInsertRowid);
    auth.startSession(req, res, user);
    res.redirect('/');
  } catch (e) {
    res.send(layout.head('Register', null) + views.register('Could not register: ' + e.message) + layout.foot());
  }
});
router.get('/logout', (req, res) => { auth.endSession(req, res); res.redirect('/'); });

/* Home = the workspace dashboard */
router.get('/', auth.requireLogin, (req, res) => {
  const db = getDb();
  const ws = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(req.user.workspace_id);
  const counts = {
    projects: db.prepare('SELECT COUNT(*) c FROM projects WHERE workspace_id = ?').get(req.user.workspace_id).c,
    tickets: db.prepare('SELECT COUNT(*) c FROM tickets WHERE workspace_id = ?').get(req.user.workspace_id).c,
  };
  res.send(layout.head('Dashboard', req.user) + views.dashboard(req.user, ws, counts, auth.issueToken(req.user)) + layout.foot());
});

/* An "internal only" status endpoint — internal by intention, not by enforcement.
   The SSRF test is about reaching it through the fetcher, from the server itself. */
router.get('/internal/metrics', (req, res) => {
  if (req.get('x-hexadesk-fetcher')) progress.pass('ssrf-fetcher'); // reached via the preview fetcher
  res.type('text/plain').send('HEXADESK-INTERNAL metrics: queues ok, workers 4, db latency 3ms. This page assumes only the office network can see it.');
});
module.exports = router;
