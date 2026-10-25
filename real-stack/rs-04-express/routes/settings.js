const express = require('express');
const { getDb } = require('../app/db');
const auth = require('../app/auth');
const progress = require('../app/progress');
const { logEvent } = require('../app/log');
const layout = require('../app/layout');
const views = require('../app/views');
const router = express.Router();

function myWorkspace(req) {
  return getDb().prepare('SELECT * FROM workspaces WHERE id = ?').get(req.user.workspace_id);
}
router.get('/settings', auth.requireLogin, (req, res) => {
  res.send(layout.head('Settings', req.user) + views.settings(myWorkspace(req), req.user, '') + layout.foot());
});
router.post('/settings', auth.requireLogin, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE workspaces SET name = ?, support_email = ?, timezone = ? WHERE id = ?')
    .run(req.body.name, req.body.support_email, req.body.timezone, req.user.workspace_id);
  /* No anti-CSRF token exists anywhere in this app — a tokenless POST that
     arrives without our own Referer is a cross-site forgery. */
  const hasToken = !!(req.body && req.body.csrf_token);
  const ref = req.get('referer') || '';
  let refHost = '';
  try { refHost = ref ? new URL(ref).host : ''; } catch (e) { refHost = 'unparseable'; }
  if (!hasToken && (ref === '' || refHost !== req.get('host'))) progress.pass('csrf-settings');
  logEvent(req, 'SETTINGS saved for workspace ' + req.user.workspace_id);
  res.send(layout.head('Settings', req.user) + views.settings(myWorkspace(req), req.user, 'Settings saved.') + layout.foot());
});
module.exports = router;
