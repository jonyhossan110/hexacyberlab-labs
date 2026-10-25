const express = require('express');
const fs = require('fs');
const path = require('path');
const progress = require('../app/progress');
const layout = require('../app/layout');
const { esc, head, foot } = layout;
const router = express.Router();

/* The 12 scored tests of RS-04, with a field hint for each. */
const TESTS = [
  { id: 'jwt-weak',        name: 'JWT — weak secret / alg confusion',              hint: 'The API trusts a JSON Web Token. Look at how the token is verified: the signing secret is embarrassingly guessable, and the algorithm named in the token header is taken on faith.' },
  { id: 'idor-project',    name: "IDOR — another workspace's project",            hint: 'Projects are loaded by id alone. Your workspace is not the only tenant on this SaaS — walk the project ids while logged in.' },
  { id: 'xss-stored',      name: 'Stored XSS in a ticket comment',                hint: 'Ticket comments are printed exactly as written. Leave one that carries markup, then open the ticket.' },
  { id: 'ssrf-fetcher',    name: 'SSRF — URL preview fetcher',                    hint: 'The link-preview feature fetches any URL from the server itself. Ask it to fetch something only the server can reach — this app keeps internal endpoints.' },
  { id: 'mass-assignment', name: 'Mass assignment — plan/role on profile update', hint: 'The profile update saves whatever fields you send it. The form shows two fields; the user model has more — plan and role among them.' },
  { id: 'path-traversal',  name: 'Path traversal — static download',              hint: 'The download feature joins your filename straight onto its folder. Climb out with ../ and read the app\'s configuration secrets.' },
  { id: 'csrf-settings',   name: 'CSRF — workspace settings without a token',     hint: 'The settings form has no anti-CSRF token. Fire the POST from another origin (or with no Referer) while the victim is logged in.' },
  { id: 'open-redirect',   name: 'Open redirect after login',                     hint: 'After a successful login you are sent to the "next" parameter, unchecked. Point it at another site entirely.' },
  { id: 'debug-exposure',  name: '/debug config and stack trace exposure',        hint: 'Developers leave diagnostic pages behind after staging. Ask the server for the obvious one.' },
  { id: 'brute-force',     name: 'No login rate limiting',                        hint: 'Fail a login ten times for one account. Nothing slows down, nothing locks.' },
  { id: 'race-coupon',     name: 'Race condition — coupon redeemed twice',       hint: 'WELCOME50 checks "already redeemed?" and then credits you — with a slow payment-gateway gap in between. Two requests landing inside that gap both get paid.' },
  { id: 'report',          name: 'Mini report — one professional finding',        hint: 'On the Complete page, write up one flaw like you would for a client: title, severity, evidence, impact, fix.' },
];

router.get('/lab/brief', (req, res) => {
  res.send(head('Client Brief', req.user) +
    `<h1>📋 Engagement brief — HexaDesk Inc</h1>` +
    `<p><b>Client:</b> HexaDesk Inc, a (fictional) helpdesk SaaS startup. Their product launched six months ago, paying customers arrived faster than security reviews, and the founders have hired you for the first real assessment.</p>` +
    `<p><b>Scope:</b> this application only — every route on this host and port. Two customer workspaces are seeded (Northwind Traders and Globex Support Co) precisely so you can test tenant isolation: in a multi-tenant SaaS, the most expensive bug class is one tenant reaching another tenant's data. Other ports and other labs are <b>out of scope</b>.</p>` +
    `<p><b>Rules of engagement:</b> no denial of service, no destroying other tenants' data beyond what a test needs to prove, and everything you do is logged (see the Logs page — the blue team is watching, like real life).</p>` +
    `<p><b>How scoring works:</b> twelve tests are scored server-side the moment your action is detected — for example, the server notices when a forged API token is actually accepted, not before. Work black-box first; open the Code Review only for your second pass.</p>` +
    `<p><b>Deliverable:</b> at 100% you will write one mini finding in professional format on the Complete page.</p>` + foot());
});

router.get('/lab/tests', (req, res) => {
  const done = progress.load().tests;
  const n = TESTS.filter(t => done[t.id]).length;
  let h = `<h1>🎯 RS-04 tests — ${n}/${TESTS.length} passed</h1>` +
    `<p class="muted">Detected server-side, the moment the action really happens. Hints point at the area, never the payload.</p>`;
  for (const t of TESTS) h += `<div class="review"><b>${done[t.id] ? '✅' : '⬜'} ${esc(t.name)}</b><p class="muted">${esc(t.hint)}</p></div>`;
  res.send(head('Tests', req.user) + h + foot());
});

router.get('/lab/guide', (req, res) => {
  res.send(head('Real Website Guide', req.user) +
    `<h1>📖 Real Website Guide — recognising Express / Node.js</h1>` +
    `<h2>Fingerprint drill — prove it is Node + Express before you test</h2>` +
    `<ul><li><b>Header:</b> <code>X-Powered-By: Express</code> — Express announces itself unless removed.</li>` +
    `<li><b>Error pages:</b> ask for a route that does not exist — Express answers <code>Cannot GET /nope</code> in its unmistakable default style; stack traces name <code>node_modules</code> paths.</li>` +
    `<li><b>Cookies:</b> <code>connect.sid</code> is express-session's default; JWTs in cookies or local storage signal a hand-rolled or library auth layer worth reading closely.</li>` +
    `<li><b>Behaviour:</b> JSON APIs beside server-rendered pages, <code>/api/…</code> prefixes, and instant restarts of behaviour after deploys all smell of Node.</li>` +
    `<li><b>WhatWeb:</b> <code>whatweb http://localhost:3204</code> from the gateway terminal names the stack in seconds.</li></ul>` +
    `<h2>What to test first on a real Express SaaS</h2>` +
    `<ol><li><b>Tenant isolation on every id</b> — projects, tickets, files. Multi-tenant IDOR is the SaaS breach headline.</li>` +
    `<li><b>The JWT</b> — decode it, read the claims, test alg=none, and try the embarrassingly common secrets against the signature.</li>` +
    `<li><b>Profile/update endpoints</b> — send fields the form never offered (role, plan, credits) and see what sticks.</li>` +
    `<li><b>Server-side fetchers</b> — link previews, webhooks, avatar-by-URL: SSRF lives there.</li>` +
    `<li><b>Leftover diagnostics</b> — /debug, /metrics, /env, error pages that print config and stack traces.</li>` +
    `<li><b>Money-adjacent logic</b> — coupons, credits, one-time actions: check whether check-and-act is atomic.</li></ol>` +
    `<h2>Burp workflow for this lab</h2>` +
    `<p>Proxy the app and log in; your JWT lands in the <code>hd_jwt</code> cookie and on the dashboard. Send <code>/api/admin/users</code> to <b>Repeater</b> and work the token: edit the header, drop the signature, re-sign with a guessed secret. Walk project ids in Repeater for the tenant boundary. Use <b>Intruder</b> on the login form to feel the missing throttle, and two parallel Repeater tabs (or Turbo Intruder) on the coupon redeem to land inside the gateway's gap.</p>` +
    `<h2>The professional habit</h2>` +
    `<p>Note every flaw as: what, where, proof, impact. The Complete page will ask you to write one up properly — that write-up is what a client actually pays for.</p>` + foot());
});

const REVIEW_NOTES = {
  'app/config.js':       'The JWT secret is the literal word "secret", and debug mode is on. Both shipped.',
  'app/jwt.js':          'verify() honours the token\'s own alg header — "none" returns the payload with no signature at all — and HS256 is checked against the weak shared secret.',
  'routes/auth.js':      'After login the "next" parameter is redirected to without any host check (open redirect), and failed logins are never throttled or locked (brute force).',
  'routes/projects.js':  'The project is fetched by id alone; its workspace is never compared to the caller\'s workspace (cross-tenant IDOR).',
  'routes/tickets.js':   'Two flaws: comment bodies are rendered raw into the ticket page (stored XSS), and the link preview fetches any URL from the server with no internal-address refusal (SSRF).',
  'routes/profile.js':   'Every submitted field matching a user column is saved — plan, role, credits, workspace_id included (mass assignment).',
  'routes/settings.js':  'Workspace settings save on a POST with no anti-CSRF token and no origin check (CSRF).',
  'routes/billing.js':   'Coupon redemption is check-then-act with a slow awaited gateway call in between and no unique constraint (race condition).',
  'routes/files.js':     'The file parameter is joined directly onto files/ — ../ walks out to .env and the config (path traversal).',
  'routes/admin.js':     'The admin API trusts the role claim inside the JWT; the only thing standing between an agent and /api/admin/users is the token verification in app/jwt.js.',
  'routes/debug.js':     'The /debug route itself: config, the JWT secret and stack traces, served to anyone who asks (information disclosure).',
  'server.js':           'Entry point: note the error handler that prints full stack traces because config.debug is on.',
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
    `<p class="muted">This is the application's own log. After an attack, read your trail: which lines expose you, which look like ordinary support work? Real engagements are won and lost in this file.</p><pre class="log">${esc(lines.join('\n'))}</pre>` + foot());
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
  let h = `<h1>🏁 RS-04 — ${n}/${total} tests</h1>`;
  if (n < total) {
    h += `<p>Not complete yet. Still open:</p><ul>`;
    for (const t of TESTS) if (!done[t.id]) h += `<li>${esc(t.name)}</li>`;
    h += `</ul><p><a href="/lab/tests">Open the test list with hints</a></p>`;
  } else {
    h += `<div class="cert"><h2>🎓 Real Stack Milestone RS-04 — Complete</h2>` +
      `<p>An Express SaaS, tested like a professional: black-box first, code review second, one finding written up.</p>` +
      `<p>Completion code: <b>${progress.completionCode()}</b></p></div>` +
      `<h2>Fix-the-code debrief</h2>` +
      `<div class="fix"><b>JWT — weak secret / alg confusion</b><pre>Vulnerable:  verify() trusts the header's alg; secret is the word "secret".
Fixed:       pin the algorithm server-side (algorithms: ['HS256']), reject "none",
             use a long random secret from the environment, rotate it.</pre></div>` +
      `<div class="fix"><b>Cross-tenant IDOR</b><pre>Vulnerable:  SELECT * FROM projects WHERE id = ?
Fixed:       SELECT * FROM projects WHERE id = ? AND workspace_id = ?  (the caller's tenant, always)</pre></div>` +
      `<div class="fix"><b>Stored XSS</b><pre>Vulnerable:  comment bodies concatenated into HTML raw.
Fixed:       escape every user value on output (or use a templating engine that
             auto-escapes); add a Content-Security-Policy as a second wall.</pre></div>` +
      `<div class="fix"><b>SSRF</b><pre>Vulnerable:  fetch(userSuppliedUrl) from the server, any host allowed.
Fixed:       allow-list hosts, resolve and reject private/loopback addresses,
             disable redirects to unchecked targets, time out fast.</pre></div>` +
      `<div class="fix"><b>Mass assignment</b><pre>Vulnerable:  Object.keys(req.body) written straight onto the user row.
Fixed:       an explicit allow-list of updatable fields (name, title) — nothing else exists.</pre></div>` +
      `<div class="fix"><b>Race condition</b><pre>Vulnerable:  check "already redeemed?" — await gateway — insert + credit.
Fixed:       UNIQUE(user_id, code) on redemptions and a single atomic transaction;
             the second insert fails instead of paying twice.</pre></div>` +
      `<div class="fix"><b>CSRF / open redirect / debug / throttling</b><pre>Fixed:       synchroniser tokens on every state-changing form; redirect targets
             validated against a same-site allow-list; /debug removed and error
             pages stripped of config; login rate-limited with lockout + alerting.</pre></div>` +
      `<h2>Business impact — what HexaDesk was risking</h2>` +
      `<p>One forged token reads every user in every workspace; one walked id leaks a competitor-tenant's confidential project; the coupon flaw is direct revenue loss that scales with a script. In business language: a multi-tenant breach is the existential event for a SaaS — every customer learns their data sat one integer away from a stranger's, and churn follows the press release.</p>`;
  }
  h += `<h2>✍ Mini report — one professional finding</h2>${reportMsg ? `<p class="ok">${esc(reportMsg)}</p>` : ''}` +
    `<form method="post" class="form"><input type="hidden" name="do" value="report">` +
    `<label>Finding title<input name="title" placeholder="e.g. Forged JWT grants full admin API access to any authenticated agent" required></label>` +
    `<label>Severity<select name="severity"><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label>` +
    `<label>Evidence — what you sent and what came back<textarea name="evidence" required></textarea></label>` +
    `<label>Business impact — money, customers, trust<textarea name="impact" required></textarea></label>` +
    `<label>Recommended fix<textarea name="fix" required></textarea></label><button>Submit finding</button></form>`;
  res.send(head('Complete', req.user) + h + foot());
}
module.exports = router;
