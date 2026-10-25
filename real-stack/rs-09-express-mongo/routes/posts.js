const express = require('express');
const auth = require('../app/auth');
const progress = require('../app/progress');
const { logEvent } = require('../app/log');
const layout = require('../app/layout');
const views = require('../app/views');
const { collection } = require('../lib/mongo');
const authRoutes = require('./auth');
const router = express.Router();
const sleep = ms => new Promise(r => setTimeout(r, ms));

const users = () => collection('users');
const posts = () => collection('posts');

router.post('/posts', auth.requireLogin, (req, res) => {
  const doc = {
    _id: 'p' + Date.now().toString(36) + Math.floor(Math.random() * 999),
    authorId: req.user._id,
    body: String(req.body.body || ''),
    visibility: req.body.visibility === 'private' ? 'private' : 'public',
    likes: 0, likedBy: [], created: new Date().toISOString().slice(0, 10),
  };
  posts().insertOne(doc);
  logEvent(req, 'POST created ' + doc._id + ' (' + doc.visibility + ')');
  res.redirect('/');
});
/* Post detail — fetched by id ALONE. The visibility flag is checked by the
   list views, never here: a private post opens for anyone with the link. */
router.get('/post/:id', auth.requireLogin, (req, res) => {
  const p = posts().findOne({ _id: req.params.id });
  if (!p) { res.status(404).send(layout.head('Not found', req.user) + '<h1>Post not found</h1>' + layout.foot()); return; }
  if (p.visibility === 'private' && p.authorId !== req.user._id) {
    progress.pass('idor-post'); // somebody else's private post was actually served
    logEvent(req, 'IDOR private post ' + p._id + ' of ' + p.authorId + ' served');
  }
  const author = users().findOne({ _id: p.authorId });
  if (p.authorId !== req.user._id && /<script|<svg|onerror\s*=|<img[^>]+on\w+\s*=/i.test(p.body)) progress.pass('xss-stored');
  res.send(layout.head('Post', req.user) + views.postPage(p, author, req.user) + layout.foot());
});
/* Liking, written the friendly way: read the post, check "already liked?",
   a slow notification call, then write the new count back. Read and write
   are not atomic — parallel likes from the same member all pass the check
   and all land, so the counter outruns the distinct likers. */
router.post('/post/:id/like', auth.requireLogin, async (req, res) => {
  const p = posts().findOne({ _id: req.params.id });
  if (!p) { res.status(404).send('Post not found'); return; }
  if (p.likedBy.includes(req.user._id)) return res.redirect('/post/' + p._id); // the check
  await sleep(150);                                // "notify the author" — the race window
  p.likedBy.push(req.user._id);                    // the act — nothing re-checks the check
  p.likes += 1;
  posts().save(p);
  if (p.likes > new Set(p.likedBy).size) {
    progress.pass('race-like'); // more likes than people who could have given them
    logEvent(req, 'RACE likes inflated on ' + p._id + ': ' + p.likes + ' likes, ' + new Set(p.likedBy).size + ' distinct likers');
  }
  res.redirect('/post/' + p._id);
});
/* Link preview — the server fetches whatever URL you hand it, from itself.
   Internal addresses are not refused; that is the SSRF flaw. */
router.post('/preview', auth.requireLogin, async (req, res) => {
  const url = String(req.body.url || '');
  let preview;
  try {
    const target = new URL(url);
    const r = await fetch(url, { headers: { 'User-Agent': 'HexaSocial-PreviewBot/1.0', 'X-HexaSocial-Fetcher': 'preview' }, signal: AbortSignal.timeout(4000), redirect: 'follow' });
    const text = await r.text();
    const loopback = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(target.hostname);
    if (r.ok && (loopback || target.pathname.startsWith('/internal'))) progress.pass('ssrf-preview');
    const m = text.match(/<title[^>]*>([^<]*)<\/title>/i);
    preview = { ok: true, url, title: m ? m[1] : '(no title)', snippet: text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300) };
    logEvent(req, `PREVIEW fetched ${url} -> ${r.status}`);
  } catch (e) {
    preview = { ok: false, url, error: e.message };
  }
  authRoutes.renderFeed(req, res, preview);
});
module.exports = router;
