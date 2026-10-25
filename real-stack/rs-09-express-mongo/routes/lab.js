const express = require('express');
const fs = require('fs');
const path = require('path');
const progress = require('../app/progress');
const layout = require('../app/layout');
const { esc, head, foot } = layout;
const router = express.Router();

/* The 12 scored tests of RS-09, with a field hint for each. */
const TESTS = [
  { id: 'nosql-auth',          name: 'NoSQL operator injection — login bypass',   hint: 'The login hands your fields to the query engine as they arrive. The web form sends text — but the same endpoint speaks JSON, and JSON values do not have to be strings. An object where a password should be is read as a query, not a password.' },
  { id: 'nosql-extract',       name: 'NoSQL injection — regex data extraction',   hint: 'The people directory passes your query parameters to the store nearly untouched, and full member records come back. If a field can be matched by pattern instead of equality, you can ask yes/no questions about its contents — one character at a time.' },
  { id: 'prototype-pollution', name: 'Prototype pollution via profile merge',     hint: 'Profile preferences are deep-merged, recursively, key by key. JSON objects can carry keys that are not ordinary data — keys that name the prototype every object inherits from. Merge one of those and every object in the process changes.' },
  { id: 'idor-post',           name: "IDOR — private post of another user",       hint: 'Profiles politely hide private post bodies — but look at what the links still carry. The post page itself fetches by id alone and never asks who the post belongs to.' },
  { id: 'xss-stored',          name: 'Stored XSS in a post',                      hint: 'Post bodies are printed exactly as written, for every reader. Publish one that carries markup and let somebody else open their feed.' },
  { id: 'jwt-weak',            name: 'JWT — kid/secret weakness',                 hint: 'Your session is a JWT in a cookie. Decode it and read the header: the verifier loads the signing key from the file the header names, and the keys folder holds more than the live key. The default secret is also embarrassingly guessable.' },
  { id: 'ssrf-preview',        name: 'SSRF — link preview fetcher',               hint: 'The link-preview feature fetches any URL from the server itself. Ask it to fetch something only the server can reach — this app keeps internal endpoints.' },
  { id: 'upload-avatar',       name: 'Avatar upload without validation',          hint: 'The avatar API writes whatever filename and bytes it receives into uploads/, and the app serves them back under types guessed from the extension. "Images" that are actually active content are the interesting uploads.' },
  { id: 'csrf-profile',        name: 'CSRF — profile change (cookie auth)',       hint: 'Profile saves ride on the cookie alone — no anti-CSRF token anywhere. Fire the POST from another origin (or with no Referer) while the victim is logged in.' },
  { id: 'brute-force',         name: 'Login brute force, no throttling',          hint: 'Fail a login ten times for one account. Nothing slows down, nothing locks.' },
  { id: 'race-like',           name: 'Race condition — inflate like counter',     hint: 'Liking reads the counter, pauses to "notify the author", then writes back. Fire the same member\'s like many times in parallel inside that pause — more likes can land than there are likers.' },
  { id: 'report',              name: 'Mini report — one professional finding',    hint: 'On the Complete page, write up one flaw like you would for a client: title, severity, evidence, impact, fix.' },
];

router.get('/lab/brief', (req, res) => {
  res.send(head('Client Brief', req.user) +
    `<h1>📋 Engagement brief — HexaSocial</h1>` +
    `<p><b>Client:</b> HexaSocial, a (fictional) small social network built by a three-person startup on the classic JavaScript stack: Express on Node.js, and a document database in the MongoDB style. Growth arrived before any security review did; you are the first assessor they have hired.</p>` +
    `<p><b>Scope:</b> this application only — every route on this host and port. Eight member accounts are seeded, including private posts and one administrator, precisely so you can test whether members can reach each other's data and the admin's. Other ports and other labs are <b>out of scope</b>.</p>` +
    `<p><b>Rules of engagement:</b> no denial of service, no deleting other members' content beyond what a test needs to prove, and everything you do is logged (see the Logs page — the blue team is watching, like real life).</p>` +
    `<p><b>How scoring works:</b> twelve tests are scored server-side the moment your action is detected — for example, the server notices when a self-made session token is actually accepted, not before. Work black-box first; open the Code Review only for your second pass.</p>` +
    `<p><b>Deliverable:</b> at 100% you will write one mini finding in professional format on the Complete page.</p>` + foot());
});

router.get('/lab/tests', (req, res) => {
  const done = progress.load().tests;
  const n = TESTS.filter(t => done[t.id]).length;
  let h = `<h1>🎯 RS-09 tests — ${n}/${TESTS.length} passed</h1>` +
    `<p class="muted">Detected server-side, the moment the action really happens. Hints point at the area, never the payload.</p>`;
  for (const t of TESTS) h += `<div class="review"><b>${done[t.id] ? '✅' : '⬜'} ${esc(t.name)}</b><p class="muted">${esc(t.hint)}</p></div>`;
  res.send(head('Tests', req.user) + h + foot());
});

router.get('/lab/guide', (req, res) => {
  res.send(head('Real Website Guide', req.user) +
    `<h1>📖 Real Website Guide — recognising Express + MongoDB apps</h1>` +
    `<h2>Fingerprint drill — prove the stack before you test</h2>` +
    `<ul><li><b>Header:</b> <code>X-Powered-By: Express</code> — Express announces itself unless removed.</li>` +
    `<li><b>Ids:</b> 24-character hex strings (<code>ObjectId</code>) in URLs and JSON responses are MongoDB's fingerprints — relational apps use small integers.</li>` +
    `<li><b>JSON shape:</b> documents with nested objects and fields like <code>__v</code>, plus <code>_id</code> instead of <code>id</code>, say Mongoose.</li>` +
    `<li><b>Errors:</b> Express defaults answer <code>Cannot GET /nope</code>; Mongoose errors name models and cast failures (<code>CastError</code>).</li>` +
    `<li><b>Cookies:</b> a JWT in a cookie or an <code>Authorization</code> header — decode it in Burp and read the header claims (<code>alg</code>, <code>kid</code>) before anything else.</li>` +
    `<li><b>WhatWeb:</b> <code>whatweb http://localhost:3209</code> from the gateway terminal names the stack in seconds.</li></ul>` +
    `<h2>What to test first on a real Express + Mongo app</h2>` +
    `<ol><li><b>Every JSON body that reaches a query</b> — send an object where a string is expected. If <code>{"$ne": …}</code>-shaped values change behaviour, the query is injectable.</li>` +
    `<li><b>Pattern-matchable fields</b> — a <code>$regex</code> condition turns any searchable field into a yes/no oracle for its stored value: extraction is patience, not luck.</li>` +
    `<li><b>Deep merges and settings updates</b> — anything that copies request JSON into objects key-by-key is a prototype-pollution candidate; probe with a harmless canary key and check a fresh object.</li>` +
    `<li><b>The JWT</b> — decode it, read <code>kid</code> and <code>alg</code>, try the dictionary secrets, and see whether the verifier trusts the token's own header.</li>` +
    `<li><b>Object ids in URLs</b> — posts, profiles, files: swap the id and check the owner is verified server-side (BOLA/IDOR).</li>` +
    `<li><b>Server-side fetchers and uploads</b> — link previews are SSRF; file uploads served from the app's own origin are stored-content attacks.</li></ol>` +
    `<h2>Burp workflow for this lab</h2>` +
    `<p>Proxy the app and log in with the web form first, then replay <code>POST /login</code> in <b>Repeater</b> as JSON and reshape the password field from a string into an object. Use <b>Intruder</b> on the directory's regex condition to extract a stored password character by character — the response length is your oracle. Forge tokens offline, paste them into the cookie in Repeater, and watch <code>/api/me</code> answer as someone else. Two parallel Repeater tabs (or Turbo Intruder) on the like button land inside the notification pause.</p>` +
    `<h2>The professional habit</h2>` +
    `<p>Note every flaw as: what, where, proof, impact. The Complete page will ask you to write one up properly — that write-up is what a client actually pays for.</p>` + foot());
});

const REVIEW_NOTES = {
  'app/config.js':    'The JWT secret is the product\'s own name, and debug mode is on. Both shipped.',
  'app/jwt.js':       'verify() loads the signing key from the file the token\'s own kid header names (path.join on an attacker-controlled name), and keys/legacy.key is a retired key file that was emptied and left in place — a token signed with an empty key verifies. Every self-made token is then trusted as that identity.',
  'lib/mongo.js':     'The query engine itself is honest — it evaluates operator objects because that is its job, like MongoDB. The flaw is upstream: routes hand it raw request JSON and query strings, so client-supplied objects become query operators.',
  'routes/auth.js':   'Login passes req.body.email and req.body.password straight into findOne() (NoSQL operator injection), and failed logins are never throttled or locked (brute force). Passwords are compared in plaintext in the store.',
  'routes/posts.js':  'Three flaws: the post detail fetches by id alone and never checks visibility against the reader (IDOR on private posts); liking is read-modify-write across a slow notification await (race); the link preview fetches any URL from the server with no internal-address refusal (SSRF).',
  'app/views.js':     'postCard() inserts post bodies into the page raw while every other field is escaped — one forgotten escape, applied to the most user-controlled string in the app (stored XSS).',
  'routes/profile.js':'Four flaws in one router: prefs are deep-merged key-by-key, __proto__ included (prototype pollution); the profile POST has no anti-CSRF token under cookie auth (CSRF); the avatar API writes any filename/bytes and /uploads serves them back with active content types (stored active content); the directory hands req.query to the store and returns full member documents, passwords included (regex extraction + excessive exposure).',
  'server.js':        'Entry point: note the error handler that prints full stack traces because config.debug is on.',
};
router.get('/lab/review', (req, res) => {
  const f = req.query.f || '';
  let h = `<h1>🔍 Code Review — second pass</h1><p class="muted">On a real engagement you often get the source after (or instead of) black-box testing. Read each file, find the flaw yourself first — the note under each file confirms what was there.</p>`;
  for (const [file, note] of Object.entries(REVIEW_NOTES)) {
    if (f === file) {
      const code = fs.readFileSync(path.join(progress.LAB_ROOT, file), 'utf8');
      h += `<h2>${esc(file)}</h2><div class="src"><pre>${esc(code)}</pre></div><p><b>What was wrong:</b> ${esc(note)}</p>`;
    } else {
      h += `<div class="review"><a href="/lab/review?f=${encodeURIComponent(file)}"><b>${esc(file)}</b></a><p class="muted">${esc(note)}</p></div>`;
    }
  }
  res.send(head('Code Review', req.user) + h + foot());
});

router.get('/lab/logs', (req, res) => {
  const logFile = path.join(progress.LAB_ROOT, 'logs', 'app.log');
  let lines = [];
  try { lines = fs.readFileSync(logFile, 'utf8').split('\n').slice(-120); } catch (e) { /* no log yet */ }
  res.send(head('Blue-Team Corner', req.user) +
    `<h1>🛡 Blue-team corner — what the defence sees</h1>` +
    `<p class="muted">This is the application's own log. After an attack, read your trail: which lines expose you, which look like ordinary scrolling? Real engagements are won and lost in this file.</p><pre class="log">${esc(lines.join('\n'))}</pre>` + foot());
});

router.get('/lab/complete', (req, res) => { renderComplete(req, res, ''); });
router.post('/lab/complete', (req, res) => {
  if (!req.body || req.body.do !== 'report') return renderComplete(req, res, '');
  const title = String(req.body.title || '').trim(), sev = String(req.body.severity || '');
  const ev = String(req.body.evidence || '').trim(), imp = String(req.body.impact || '').trim(), fix = String(req.body.fix || '').trim();
  if (title.length >= 8 && sev !== '' && ev.length >= 30 && imp.length >= 20 && fix.length >= 20) {
    const p = progress.load();
    p.report = { title, severity: sev, evidence: ev, impact: imp, fix, at: new Date().toISOString() };
    progress.save(p);
    progress.pass('report');
    renderComplete(req, res, '✅ Finding recorded — that is the report test passed.');
  } else {
    renderComplete(req, res, 'The finding needs more substance: a clear title, a severity, real evidence (30+ characters), the business impact (20+) and a concrete fix (20+).');
  }
});
function renderComplete(req, res, reportMsg) {
  const done = progress.load().tests;
  const total = TESTS.length, n = TESTS.filter(t => done[t.id]).length;
  let h = `<h1>🏁 RS-09 — ${n}/${total} tests</h1>`;
  if (n < total) {
    h += `<p>Not complete yet. Still open:</p><ul>`;
    for (const t of TESTS) if (!done[t.id]) h += `<li>${esc(t.name)}</li>`;
    h += `</ul><p><a href="/lab/tests">Open the test list with hints</a></p>`;
  } else {
    h += `<div class="cert"><h2>🎓 Real Stack Milestone RS-09 — Complete</h2>` +
      `<p>An Express + Mongo-style social app, tested like a professional: black-box first, code review second, one finding written up.</p>` +
      `<p>Completion code: <b>${progress.completionCode()}</b></p></div>` +
      `<h2>Fix-the-code debrief</h2>` +
      `<div class="fix"><b>NoSQL operator injection (auth + extraction)</b><pre>Vulnerable:  users.findOne({ email: req.body.email, password: req.body.password })
Fixed:       validate types first — both must be strings — and reject objects
             outright; disable operator passthrough on user-controlled queries
             (e.g. mongo-sanitize), and never return password fields in results.</pre></div>` +
      `<div class="fix"><b>Prototype pollution</b><pre>Vulnerable:  deepMerge(user.prefs, req.body.prefs) — "__proto__" walks to the root.
Fixed:       refuse the keys __proto__, constructor and prototype at every depth;
             merge into Object.create(null) targets, freeze Object.prototype in
             production, and validate payloads against a schema.</pre></div>` +
      `<div class="fix"><b>IDOR on private posts</b><pre>Vulnerable:  posts.findOne({ _id: id }) — visibility never checked on read.
Fixed:       posts.findOne({ _id: id, $or: [{ visibility: 'public' }, { authorId: me }] })
             — the ownership/visibility rule lives in the query, not the list view.</pre></div>` +
      `<div class="fix"><b>Stored XSS</b><pre>Vulnerable:  post bodies concatenated into HTML raw.
Fixed:       escape every user value on output, no exceptions for "rich" fields;
             add a Content-Security-Policy as a second wall.</pre></div>` +
      `<div class="fix"><b>JWT kid / weak secret</b><pre>Vulnerable:  the verifier loads the key file the token's kid names; an empty
             retired key and a dictionary-word secret both verify.
Fixed:       never let the token choose its key — pin keys server-side by an
             allow-listed kid map, use a long random secret from the environment,
             delete retired key files, and use a maintained JWT library.</pre></div>` +
      `<div class="fix"><b>SSRF / upload / CSRF / brute force / race</b><pre>Fixed:       preview fetcher: allow-list hosts, resolve and reject private or
             loopback addresses, short timeouts. Uploads: extension + content
             allow-list, random names, serve from a separate cookieless domain
             with Content-Disposition. CSRF: synchroniser tokens + SameSite=Lax
             cookies. Login: rate limiting, lockout and alerting. Likes: make it
             atomic — one conditional update ($addToSet semantics), count derived
             from the liker set, never a stale read-modify-write.</pre></div>` +
      `<h2>Business impact — what HexaSocial was risking</h2>` +
      `<p>One JSON object logs in as the founder. One pattern-matched query reads out every member's password, a character at a time, through the friendly people directory. Private posts — the feature members trust most — open for anyone who copies a link. In business language: a social app sells exactly one thing, the feeling that your circle is yours; every flaw here spends that trust, and the forged-token flaw hands the whole shop to a stranger.</p>`;
  }
  h += `<h2>✍ Mini report — one professional finding</h2>${reportMsg ? `<p class="ok">${esc(reportMsg)}</p>` : ''}` +
    `<form method="post" class="form"><input type="hidden" name="do" value="report">` +
    `<label>Finding title<input name="title" placeholder="e.g. NoSQL operator injection in login allows authentication as any member, including admin" required></label>` +
    `<label>Severity<select name="severity"><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label>` +
    `<label>Evidence — what you sent and what came back<textarea name="evidence" required></textarea></label>` +
    `<label>Business impact — money, customers, trust<textarea name="impact" required></textarea></label>` +
    `<label>Recommended fix<textarea name="fix" required></textarea></label><button>Submit finding</button></form>`;
  res.send(head('Complete', req.user) + h + foot());
}
module.exports = router;
