const express = require('express');
const { getDb } = require('../app/db');
const auth = require('../app/auth');
const progress = require('../app/progress');
const { logEvent } = require('../app/log');
const layout = require('../app/layout');
const views = require('../app/views');
const router = express.Router();

function ownTicket(req) {
  const t = getDb().prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  return t && t.workspace_id === req.user.workspace_id ? t : null;
}
function renderTicket(req, res, t, preview) {
  const comments = getDb().prepare(
    'SELECT c.*, u.name AS author FROM comments c JOIN users u ON u.id = c.author_id WHERE c.ticket_id = ? ORDER BY c.id').all(t.id);
  // stored-XSS detection: a comment carrying markup has been rendered raw into this page
  for (const c of comments) {
    if (/<script|<svg|onerror\s*=|<img[^>]+on\w+\s*=/i.test(c.body)) { progress.pass('xss-stored'); break; }
  }
  res.send(layout.head('Ticket', req.user) + views.ticket(t, comments, preview) + layout.foot());
}
router.get('/tickets', auth.requireLogin, (req, res) => {
  const list = getDb().prepare('SELECT * FROM tickets WHERE workspace_id = ? ORDER BY id').all(req.user.workspace_id);
  res.send(layout.head('Tickets', req.user) + views.tickets(list) + layout.foot());
});
router.get('/tickets/:id', auth.requireLogin, (req, res) => {
  const t = ownTicket(req);
  if (!t) { res.status(404).send(layout.head('Not found', req.user) + '<h1>Ticket not found</h1>' + layout.foot()); return; }
  renderTicket(req, res, t, null);
});
router.post('/tickets/:id/comments', auth.requireLogin, (req, res) => {
  const t = ownTicket(req);
  if (!t) { res.status(404).send('Ticket not found'); return; }
  getDb().prepare("INSERT INTO comments (ticket_id,author_id,body,created) VALUES (?,?,?,datetime('now'))")
    .run(t.id, req.user.id, req.body.body || '');
  logEvent(req, `COMMENT on ticket ${t.id}`);
  res.redirect('/tickets/' + t.id);
});
/* Link preview — the server fetches whatever URL you hand it, from itself.
   Internal addresses are not refused; that is the SSRF flaw. */
router.post('/tickets/:id/preview', auth.requireLogin, async (req, res) => {
  const t = ownTicket(req);
  if (!t) { res.status(404).send('Ticket not found'); return; }
  const url = String(req.body.url || '');
  let preview;
  try {
    const target = new URL(url);
    const r = await fetch(url, { headers: { 'User-Agent': 'HexaDesk-PreviewBot/1.0', 'X-HexaDesk-Fetcher': 'preview' }, signal: AbortSignal.timeout(4000), redirect: 'follow' });
    const text = await r.text();
    const loopback = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(target.hostname);
    if (r.ok && (loopback || target.pathname.startsWith('/internal'))) progress.pass('ssrf-fetcher');
    const m = text.match(/<title[^>]*>([^<]*)<\/title>/i);
    preview = { ok: true, url, title: m ? m[1] : '(no title)', snippet: text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300) };
    logEvent(req, `PREVIEW fetched ${url} -> ${r.status}`);
  } catch (e) {
    preview = { ok: false, url, error: e.message };
  }
  renderTicket(req, res, t, preview);
});
module.exports = router;
