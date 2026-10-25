const express = require('express');
const { getDb } = require('../app/db');
const auth = require('../app/auth');
const progress = require('../app/progress');
const { logEvent } = require('../app/log');
const layout = require('../app/layout');
const views = require('../app/views');
const router = express.Router();

const USER_COLUMNS = ['name', 'title', 'role', 'plan', 'credits', 'workspace_id'];
router.get('/profile', auth.requireLogin, (req, res) => {
  res.send(layout.head('Profile', req.user) + views.profile(req.user, '') + layout.foot());
});
router.post('/profile', auth.requireLogin, (req, res) => {
  const db = getDb();
  const before = { ...req.user };
  /* The developer "saved a loop": every submitted field that matches a user
     column is written back. The form shows name + title — the model also has
     plan, role, credits and workspace_id. That gap is the mass assignment. */
  const updates = {};
  for (const key of Object.keys(req.body || {})) {
    if (USER_COLUMNS.includes(key)) updates[key] = req.body[key];
  }
  const keys = Object.keys(updates);
  if (keys.length) {
    db.prepare(`UPDATE users SET ${keys.map(k => k + ' = ?').join(', ')} WHERE id = ?`)
      .run(...keys.map(k => updates[k]), req.user.id);
  }
  const after = auth.userById(req.user.id);
  if (('plan' in updates && String(before.plan) !== String(after.plan)) ||
      ('role' in updates && String(before.role) !== String(after.role))) {
    progress.pass('mass-assignment');
  }
  logEvent(req, 'PROFILE updated fields: ' + (keys.join(', ') || 'none'));
  req.user = after;
  res.send(layout.head('Profile', req.user) + views.profile(after, 'Profile saved.') + layout.foot());
});
module.exports = router;
