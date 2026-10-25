const express = require('express');
const { getDb } = require('../app/db');
const auth = require('../app/auth');
const progress = require('../app/progress');
const layout = require('../app/layout');
const views = require('../app/views');
const router = express.Router();

router.get('/projects', auth.requireLogin, (req, res) => {
  const list = getDb().prepare('SELECT * FROM projects WHERE workspace_id = ? ORDER BY id').all(req.user.workspace_id);
  res.send(layout.head('Projects', req.user) + views.projects(list) + layout.foot());
});
router.get('/projects/:id', auth.requireLogin, (req, res) => {
  const db = getDb();
  // the project is loaded by id alone — its workspace is never compared to yours
  const p = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!p) { res.status(404).send(layout.head('Not found', req.user) + '<h1>Project not found</h1>' + layout.foot()); return; }
  if (p.workspace_id !== req.user.workspace_id) progress.pass('idor-project');
  const tickets = db.prepare('SELECT * FROM tickets WHERE project_id = ? ORDER BY id').all(p.id);
  res.send(layout.head('Project', req.user) + views.project(p, tickets) + layout.foot());
});
module.exports = router;
