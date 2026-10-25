'use strict';
/*
 * HexaAnalytics — LAB 16 of 110 (Category 2: SaaS & Business Platforms)
 * A deliberately vulnerable analytics platform for hands-on pentest practice.
 * Complete business app: dashboards, datasets, report builder, saved reports,
 * share links, scheduled reports, CSV/JSON exports, roles admin/analyst/viewer.
 * Zero dependencies. Binds 127.0.0.1 only. LOCAL PRACTICE ONLY.
 * Built by Md. Jony Hassain, Founder of HexaCyberLab.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB_NUMBER = 16;
const LAB_NAME = 'HexaAnalytics';
const PREV_LAB = 15;
const PORT = process.env.PORT || 3025;
const HOST = process.env.HOST || '127.0.0.1';
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const LOGO_FILE = path.join(DIR, 'logo.png');

/* ---- key material, fragment set A (scattered; assembled only at runtime) ---- */


/* ============================== seed data ============================== */
const accounts = [
  { id: 1, name: 'Northwind Retail' },
  { id: 2, name: 'Globex Media' },
];
const users = [
  { id: 1, email: 'admin@hexaanalytics.local', name: 'Platform Admin', pass: 'Admin@123', role: 'admin',   accountId: 1, isDefault: false },
  { id: 2, email: 'nadia@hexaanalytics.local', name: 'Nadia Rahman',   pass: 'User@123',  role: 'analyst', accountId: 1, isDefault: false },
  { id: 3, email: 'vera@hexaanalytics.local',  name: 'Vera Lindt',     pass: 'User@123',  role: 'viewer',  accountId: 1, isDefault: false },
  { id: 4, email: 'omar@hexaanalytics.local',  name: 'Omar Farouk',    pass: 'User@123',  role: 'analyst', accountId: 2, isDefault: false },
  { id: 5, email: 'demo@hexaanalytics.local',  name: 'Demo Account',   pass: 'demo123',   role: 'analyst', accountId: 1, isDefault: true  },
];
let nextUserId = 6;

function mkRows(datasetId, accountId, seedRows) {
  return seedRows.map(r => ({ datasetId, accountId, date: r[0], region: r[1], channel: r[2], revenue: r[3], signups: r[4] }));
}
const datasets = [
  { id: 1, accountId: 1, name: 'Retail Sales Q3', rows: mkRows(1, 1, [
    ['2026-07-01','North','Online',  12400, 310], ['2026-07-02','South','Online',  9800, 244],
    ['2026-07-03','East', 'Retail',  15230, 289], ['2026-07-04','West', 'Retail',  11040, 201],
    ['2026-07-05','North','Partner',  7640, 132], ['2026-07-06','South','Partner',  6890, 118],
    ['2026-07-07','East', 'Online',  13980, 342], ['2026-07-08','West', 'Online',  12110, 296],
  ])},
  { id: 2, accountId: 2, name: 'Globex Campaign Metrics', rows: mkRows(2, 2, [
    ['2026-07-01','EU','Paid',     48200, 910], ['2026-07-02','EU','Organic', 22100, 640],
    ['2026-07-03','US','Paid',     51900, 988], ['2026-07-04','US','Organic', 24750, 702],
    ['2026-07-05','APAC','Paid',   39600, 845], ['2026-07-06','APAC','Organic', 19800, 590],
    ['2026-07-07','EU','Paid',     50120, 940], ['2026-07-08','US','Paid',    53400, 1015],
  ])},
  { id: 3, accountId: 1, name: 'Website Traffic', rows: mkRows(3, 1, [
    ['2026-07-01','North','Organic', 0, 5210], ['2026-07-02','South','Organic', 0, 4310],
    ['2026-07-03','East', 'Paid',    0, 6120], ['2026-07-04','West', 'Paid',    0, 5880],
  ])},
];
const dashboards = [
  { id: 1, accountId: 1, name: 'Retail Overview', datasetId: 1 },
  { id: 2, accountId: 2, name: 'Globex Executive KPIs', datasetId: 2 },
];
let reports = [
  { id: 1, accountId: 1, ownerId: 2, name: 'Q3 Sales by Region', datasetId: 1, filterDesc: 'all rows', private: false, rows: datasets[0].rows },
  { id: 2, accountId: 2, ownerId: 4, name: 'Globex Confidential Revenue', datasetId: 2, filterDesc: 'all rows', private: true, rows: datasets[1].rows },
];
let nextReportId = 3;
let shareLinks = [
  { id: 1, reportId: 2, token: 'shr_1001', revoked: false },
  { id: 2, reportId: 1, token: 'shr_1002', revoked: false },
];
let nextLinkId = 3;
let schedules = [
  { id: 1, accountId: 1, ownerId: 2, reportId: 1, freq: 'weekly' },
  { id: 2, accountId: 2, ownerId: 4, reportId: 2, freq: 'daily' },
];
let nextScheduleId = 3;
const issuedApiKeys = { 'ha_live_northwind_9f2': 1, 'ha_live_globex_7c1': 2 };

/* ============================== progress engine ============================== */
let progress = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const p = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      if (p && typeof p === 'object') progress = Object.assign(progress, p);
    }
  } catch (e) { /* start fresh on corrupt state */ }
}
function saveProgress() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2)); } catch (e) { /* non-fatal */ }
}
function pass(id) {
  if (!progress.tests[id]) {
    progress.tests[id] = true;
    if (TESTS.every(t => progress.tests[t.id])) {
      if (!progress.completedAt) progress.completedAt = new Date().toISOString();
      progress.keyRevealed = true;
    }
    saveProgress();
  }
}
function attempt(feature) { progress.attempts[feature] = (progress.attempts[feature] || 0) + 1; saveProgress(); }
function progressSummary() {
  const total = TESTS.length;
  const done = TESTS.filter(t => progress.tests[t.id]).length;
  const features = {};
  for (const f of FEATURES) {
    const ts = TESTS.filter(t => t.feature === f);
    features[f] = { total: ts.length, done: ts.filter(t => progress.tests[t.id]).length, attempts: progress.attempts[f] || 0 };
  }
  return { lab: LAB_NAME, number: LAB_NUMBER, total, done, pct: total ? Math.floor(done / total * 100) : 0, features, complete: done === total };
}

/* ============================== helpers ============================== */
const XSS_RE = /<\s*script|<\s*svg|<\s*iframe|<\s*img[^>]*\son\w+\s*=|on\w+\s*=|javascript\s*:/i;
function isSQLi(s) { return typeof s === 'string' && (/'\s*(or|and)\s+('?[\w]+'?\s*=|1|true)/i.test(s) || /'\s*--/.test(s) || /'\s*or\s*'[^']*'/.test(s)); }
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function parseBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) { try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); } }
      else {
        const out = {};
        for (const pair of data.split('&')) {
          if (!pair) continue;
          const i = pair.indexOf('=');
          const k = decodeURIComponent((i < 0 ? pair : pair.slice(0, i)).replace(/\+/g, ' '));
          const v = decodeURIComponent((i < 0 ? '' : pair.slice(i + 1)).replace(/\+/g, ' '));
          out[k] = v;
        }
        resolve(out);
      }
    });
    req.on('error', () => resolve({}));
  });
}
function cookiesOf(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function getSession(req) {
  const c = cookiesOf(req).ha_session;
  if (!c) return null;
  try { const s = JSON.parse(Buffer.from(c.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')); return s && s.uid ? s : null; } catch (e) { return null; }
}
function sessionCookie(user) {
  const s = { uid: user.id, email: user.email, name: user.name, role: user.role, accountId: user.accountId };
  return 'ha_session=' + Buffer.from(JSON.stringify(s), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_') + '; Path=/; HttpOnly=false';
}
function storedUser(sess) { return sess ? users.find(u => u.id === sess.uid) : null; }
function send(res, code, body, headers) {
  res.writeHead(code, Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, headers || {}));
  res.end(body);
}
function redirect(res, to, headers) { res.writeHead(302, Object.assign({ Location: to }, headers || {})); res.end(); }

/* ============================== TESTS registry ============================== */
const FEATURES = ['Login & Authentication', 'Registration & Profile', 'Dashboards', 'Datasets & Exports', 'Report Builder', 'Reports & Sharing', 'Scheduled Reports', 'Admin Panel', 'Platform & API'];
const TESTS = [
/* ---- Login & Authentication ---- */
{ id: 'sqli-login', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03 Injection', difficulty: 'Beginner', keys: ['sqli', 'sql injection', 'login bypass', 'injection login'],
  hints: ['The login form builds its query by gluing your input straight into a string. What happens if your "email" is not an email at all?', 'A classic tautology makes a WHERE clause true for every row: quote, OR, a comparison that is always true.', "Try email: ' OR '1'='1 — with any password. The query matches the first user in the table."],
  lesson: 'String-built queries let attacker input change the query logic itself. Parameterised queries keep data and code separate, always.',
  impact: 'An attacker logs in as the first account in the table — usually an administrator — with no password at all, taking over the whole analytics platform and every client dataset in it.',
  report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.' },
  guide: 'Step by step: 1) Open /login. 2) Enter the email \' OR \'1\'=\'1 and any password. 3) Submit — you are logged in as the platform admin, because the query became "WHERE email=\'\' OR \'1\'=\'1\'" and matched the first row.' },
{ id: 'brute-force', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limiting or Lockout', owasp: 'A07 Authentication Failures', difficulty: 'Beginner', keys: ['brute', 'rate limit', 'lockout', 'password guessing'],
  hints: ['Count how many wrong passwords the login accepts for one account. Does anything slow down or lock?', 'Ten wrong passwords in a row is a good probe — a protected login would have stopped you long before.', 'Script it: POST /login ten times with a wrong password for nadia@hexaanalytics.local. The 10th is still processed normally.'],
  lesson: 'Without throttling or lockout, an attacker can try unlimited passwords against any account at full speed.',
  impact: 'Attackers can grind through password lists against your clients\' accounts — one weak password anywhere becomes a full breach with all their business metrics.',
  report: { title: 'Missing Rate Limiting and Account Lockout on Login', severity: 'High', remediation: 'Throttle login attempts per account and IP, add progressive delays / lockout and alerting on password-spray patterns.' },
  guide: 'Step by step: 1) Pick a real account, e.g. nadia@hexaanalytics.local. 2) POST /login with a wrong password 10 times (curl in a loop). 3) Notice every attempt is processed with the same friendly error — no delay, no CAPTCHA, no lockout. The test passes at the 10th accepted failure.' },
{ id: 'user-enumeration', feature: 'Login & Authentication', name: 'User Enumeration via Login & Forgot-Password Responses', owasp: 'A07 Authentication Failures', difficulty: 'Beginner', keys: ['enumeration', 'enumerate', 'which emails', 'valid email'],
  hints: ['Compare the error for an email that exists with one that does not — on the login form first.', 'Now compare the forgot-password answers for the same two emails. Helpful, isn\'t it?', 'Probe both ways (real email + wrong password, and a made-up email) on /login or /forgot and read the difference: "No account found" vs "Incorrect password".'],
  lesson: 'Different error messages for "no such user" vs "wrong password" hand attackers a free list of valid accounts to target.',
  impact: 'An attacker first harvests which of your clients\' emails are registered, then focuses password attacks only on real accounts — far faster and quieter.',
  report: { title: 'Account Enumeration via Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message ("invalid credentials") for every failed login and forgot-password request.' },
  guide: 'Step by step: 1) POST /login with a made-up email — the answer names the problem: no such account. 2) POST /login with nadia@hexaanalytics.local and a wrong password — a different answer confirms the account exists. 3) /forgot behaves the same way. Doing both probes completes the test.' },
{ id: 'default-creds', feature: 'Login & Authentication', name: 'Weak / Default Credentials on a Seeded Account', owasp: 'A07 Authentication Failures', difficulty: 'Beginner', keys: ['default', 'weak credential', 'demo account', 'guess'],
  hints: ['SaaS products ship with trial and demo accounts. Vendors pick very guessable passwords for them.', 'The account demo@hexaanalytics.local exists. What would a vendor set as its password — the account name plus something short?', 'Try demo@hexaanalytics.local with the password demo123. It was never changed after installation.'],
  lesson: 'Default and demo credentials are public knowledge. Any account whose password is guessable from its name is an open door.',
  impact: 'An attacker walks in through the forgotten demo account and inherits its access to live customer dashboards and exports — no exploit needed, just a login.',
  report: { title: 'Default Credentials Active on Demo Account', severity: 'High', remediation: 'Force a password change on first use, disable or remove demo accounts in production, and scan for default passwords.' },
  guide: 'Step by step: 1) Go to /login. 2) Sign in as demo@hexaanalytics.local with password demo123. 3) You are in — the seeded demo account was never rotated.' },
{ id: 'reset-token', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07 Authentication Failures', difficulty: 'Intermediate', keys: ['reset', 'token', 'forgot', 'password reset'],
  hints: ['Ask for a password reset and study the flow. The emailed token has to come from somewhere — is it random, or computed?', 'The token is a simple encoding of something you already know about the victim. Think hex, not randomness.', 'The token is the hex encoding of the account email. Compute it for vera@hexaanalytics.local and POST it to /reset with a new password.'],
  lesson: 'Reset tokens must be long, random and single-use. A token derived from the email is just the email written differently — anyone can mint one.',
  impact: 'Anyone who knows a client\'s email address can reset their password and take the account — including the admin\'s — without ever seeing an inbox.',
  report: { title: 'Predictable Password Reset Token (Derived from Email)', severity: 'High', remediation: 'Generate reset tokens from a CSPRNG (≥128 bits), store only a hash, expire them quickly and make them single-use.' },
  guide: 'Step by step: 1) The reset token is hex(email). For vera@hexaanalytics.local compute the hex of the email string (e.g. printf \'vera@hexaanalytics.local\' | xxd -p). 2) POST /reset with that token and a new password. 3) Log in as Vera with the new password — full account takeover without email access.' },
{ id: 'cookie-tamper', feature: 'Login & Authentication', name: 'Session Cookie Tampering — Client-Side Role Trusted', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['cookie', 'session', 'tamper', 'role', 'base64'],
  hints: ['Look at the ha_session cookie after logging in. It is not signed — it is just encoded. What is inside?', 'Base64-decode it: your identity AND your role travel in the cookie and the server believes them.', 'Decode the cookie, change "role" to "admin", re-encode, and visit /admin. The server never checks the database.'],
  lesson: 'Anything the client sends can be edited by the client. Roles and identities must be verified server-side (signed tokens or server sessions).',
  impact: 'Every low-privilege user — even a read-only viewer — can promote themselves to platform admin by editing a cookie, then read or alter every customer\'s analytics.',
  report: { title: 'Broken Access Control: Unsigned Session Cookie Trusted for Role', severity: 'Critical', remediation: 'Use server-side sessions or signed/encrypted tokens, and always load the user\'s real role from the database per request.' },
  guide: 'Step by step: 1) Log in as vera@hexaanalytics.local (a viewer). 2) Copy the ha_session cookie and base64-decode it — it is plain JSON with your role. 3) Change "role":"viewer" to "role":"admin", re-encode base64url, replace the cookie. 4) Open /admin — you are treated as admin while your real account is still a viewer.' },
/* ---- Registration & Profile ---- */
{ id: 'weak-password', feature: 'Registration & Profile', name: 'No Password Policy at Registration', owasp: 'A07 Authentication Failures', difficulty: 'Beginner', keys: ['weak password', 'password policy', 'short password', 'register'],
  hints: ['Register a new account. What is the shortest password the form accepts?', 'There is no minimum at all. Even a single character works.', 'POST /register with password "a". The account is created and logged in.'],
  lesson: 'If the platform accepts any password, users will pick terrible ones — and the platform owns the consequences.',
  impact: 'Client accounts end up protected by passwords like "a" or "1234", which brute force and credential stuffing crack in seconds.',
  report: { title: 'Missing Password Complexity / Length Policy', severity: 'Medium', remediation: 'Enforce a minimum length (≥10) and screen against known-breached password lists at registration and reset.' },
  guide: 'Step by step: 1) Open /register. 2) Create an account with the password "a" (one character). 3) It is accepted — no policy exists.' },
{ id: 'mass-assignment', feature: 'Registration & Profile', name: 'Mass Assignment — Self-Promotion via Registration Fields', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['mass assignment', 'role field', 'register admin', 'extra field'],
  hints: ['The registration endpoint binds the whole request body to the new user object. What fields does a user normally never get to choose?', 'The form shows name/email/password — but the server reads more keys from the POST than the form sends.', 'POST /register with an extra field role=admin. Your new account is created as a platform admin.'],
  lesson: 'Bind explicitly-allowed fields only. Trusting the request body to build privileged objects lets users grant themselves anything.',
  impact: 'Anyone on the internet can register themselves as a platform admin in one request and take over every workspace, dashboard and dataset on the platform.',
  report: { title: 'Mass Assignment in Registration Allows Role Escalation', severity: 'Critical', remediation: 'Whitelist bindable fields on registration/profile endpoints; set role and tenant server-side only.' },
  guide: 'Step by step: 1) POST /register with name, email, password AND the extra field role=admin. 2) The server copies every field onto the new user — including the role. 3) Your brand-new account is a platform admin.' },
{ id: 'stored-xss', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03 Injection', difficulty: 'Intermediate', keys: ['stored xss', 'display name', 'persistent xss', 'profile name'],
  hints: ['Your display name is shown to teammates in the header and team list. Is it encoded anywhere?', 'Profile update saves the name exactly as typed — HTML included.', 'Set your profile name to <script>alert(1)</script> (or an <svg onload> payload) and save. It is stored and rendered raw to other users.'],
  lesson: 'User-controlled strings must be output-encoded at render time, everywhere — including "harmless" name fields.',
  impact: 'An attacker plants a script in their profile name; every teammate or admin who views a dashboard runs it — session theft and actions in the victim\'s name follow.',
  report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Contextually encode all user-supplied output; sanitise stored fields and deploy a restrictive Content-Security-Policy.' },
  guide: 'Step by step: 1) Log in and open /profile. 2) Set your display name to <script>alert(1)</script> and save (include the hx_tok field from the form). 3) The payload is stored and rendered unescaped in the header and team list — it fires for anyone who views it.' },
{ id: 'csrf-profile', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['csrf', 'profile update', 'cross-site', 'forgery'],
  hints: ['The profile form carries a hidden marker field — but does the server actually verify it?', 'A state-changing POST that arrives from another origin, or without the marker, should be rejected. Test whether it is.', 'While logged in, POST /profile from a foreign Origin (e.g. Origin: https://evil.example) with no hx_tok field and a new name. The change is applied anyway.'],
  lesson: 'State-changing endpoints need unforgeable, verified anti-CSRF tokens and origin checks — a hidden field nobody validates is decoration.',
  impact: 'A client admin visiting a malicious page while logged in silently gets their profile (name, contact data) rewritten by an attacker\'s site.',
  report: { title: 'Cross-Site Request Forgery on Profile Update', severity: 'Medium', remediation: 'Issue per-session CSRF tokens, verify them on every state change, and check Origin/Referer for sensitive posts.' },
  guide: 'Step by step: 1) Note the hx_tok hidden field in the /profile form. 2) Send POST /profile with a new name, a foreign Origin header and NO hx_tok. 3) The server applies the change — it never verified the marker. That is CSRF.' },
/* ---- Dashboards ---- */
{ id: 'dashboard-idor', feature: 'Dashboards', name: 'Cross-Account Dashboard IDOR', owasp: 'A01 Broken Access Control', difficulty: 'Beginner', keys: ['dashboard idor', 'other account dashboard', 'idor dashboard'],
  hints: ['Dashboards live at /dashboard/<id> with small sequential ids. Whose dashboards can you open?', 'Your workspace is account 1. Dashboard 2 belongs to another company — try the URL directly.', 'Log in as Nadia (account 1) and open /dashboard/2. The Globex executive KPIs render with no ownership check.'],
  lesson: 'Every object access must check that the object belongs to the caller\'s tenant. Sequential ids make guessing trivial.',
  impact: 'One client can open a competitor client\'s executive dashboard — revenue, growth, KPIs — just by changing a number in the URL.',
  report: { title: 'Insecure Direct Object Reference on Dashboard View', severity: 'High', remediation: 'Authorise every object load against the session tenant; use unguessable ids as defence in depth.' },
  guide: 'Step by step: 1) Log in as nadia@hexaanalytics.local (Northwind). 2) Open /dashboard/2. 3) Globex Media\'s executive dashboard is served — the handler never compares the dashboard\'s account with yours.' },
{ id: 'reflected-xss', feature: 'Dashboards', name: 'Reflected XSS in Dashboard Filter', owasp: 'A03 Injection', difficulty: 'Beginner', keys: ['reflected xss', 'dashboard filter', 'search xss', 'q parameter'],
  hints: ['The dashboard filter echoes your search text back into the page ("Filter: …"). Does it encode it?', 'Put HTML in the q parameter of a dashboard URL and view the source.', 'Open /dashboard/1?q=<script>alert(1)</script> — the payload lands in the page unescaped.'],
  lesson: 'Reflected input is as dangerous as stored input: encode everything echoed into a page, especially in "search/filter" UIs.',
  impact: 'An attacker emails a client a crafted dashboard link; opening it runs script in the client\'s session — a believable phishing-to-takeover path.',
  report: { title: 'Reflected Cross-Site Scripting in Dashboard Filter Parameter', severity: 'Medium', remediation: 'Output-encode all reflected parameters and add a Content-Security-Policy.' },
  guide: 'Step by step: 1) Log in. 2) Visit /dashboard/1?q=<script>alert(1)</script>. 3) The page reflects the q value raw — the script executes in your session.' },
/* ---- Datasets & Exports ---- */
{ id: 'dataset-idor', feature: 'Datasets & Exports', name: 'Cross-Account Dataset IDOR', owasp: 'A01 Broken Access Control', difficulty: 'Beginner', keys: ['dataset idor', 'other dataset', 'view dataset'],
  hints: ['Datasets are numbered like everything else here. Dataset 2 is not yours.', 'The dataset page loads by id only. Your account is never compared.', 'As Nadia (account 1), open /dataset/2 — Globex\'s raw campaign data is displayed.'],
  lesson: 'Raw data views need the same tenant authorisation as dashboards — the id in the URL is not a permission.',
  impact: 'A client can read another company\'s raw underlying data — not just the pretty charts — and learn their exact campaign performance.',
  report: { title: 'Insecure Direct Object Reference on Dataset View', severity: 'High', remediation: 'Scope every dataset query by the session account id.' },
  guide: 'Step by step: 1) Log in as Nadia (account 1). 2) Open /dataset/2. 3) Globex Media\'s dataset rows are served with no ownership check.' },
{ id: 'export-idor', feature: 'Datasets & Exports', name: 'Cross-Account Data Export IDOR', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['export idor', 'export other', 'csv export', 'download data'],
  hints: ['Viewing is bad; exporting is worse — it is the exfiltration path. The export route hangs off the dataset id.', 'Try /dataset/<id>/export?format=csv for a dataset that is not yours.', 'As Nadia, request /dataset/2/export?format=csv — Globex\'s full dataset downloads as a file.'],
  lesson: 'Export endpoints concentrate sensitive data into one response; they need the strictest authorisation checks, not the weakest.',
  impact: 'One click downloads a competitor client\'s entire dataset as CSV — quiet, complete data theft rather than screen-by-screen snooping.',
  report: { title: 'Insecure Direct Object Reference on Dataset Export (CSV/JSON)', severity: 'Critical', remediation: 'Authorise exports against the session tenant and role; log and alert on bulk exports.' },
  guide: 'Step by step: 1) Log in as Nadia (account 1). 2) GET /dataset/2/export?format=csv. 3) The full Globex dataset downloads — export checks neither owner nor anything else.' },
{ id: 'viewer-export', feature: 'Datasets & Exports', name: 'Viewer Role Can Export Data (Broken Function-Level Authorisation)', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['viewer export', 'role export', 'readonly', 'function level'],
  hints: ['Vera is a viewer: she may look, but exporting should be above her pay grade. Is it?', 'The export endpoint checks login — but does it check the role?', 'Log in as vera@hexaanalytics.local and export dataset 1 as CSV. It works.'],
  lesson: 'Read-only roles must be enforced on the server for every privileged function, especially export and download actions.',
  impact: 'A client\'s read-only guest or junior staffer can walk out with the full dataset — the "viewer" permission was only a UI suggestion.',
  report: { title: 'Missing Function-Level Authorisation: Viewers Can Export Datasets', severity: 'High', remediation: 'Enforce role checks server-side on export/download endpoints (deny viewer role explicitly).' },
  guide: 'Step by step: 1) Log in as vera@hexaanalytics.local (role: viewer). 2) GET /dataset/1/export?format=csv. 3) The file downloads — the endpoint never checks that viewers may not export.' },
/* ---- Report Builder ---- */
{ id: 'filter-injection', feature: 'Report Builder', name: 'Report Builder Filter Injection Leaks Cross-Account Data', owasp: 'A03 Injection', difficulty: 'Advanced', keys: ['filter injection', 'report builder injection', 'builder sqli', 'filter value'],
  hints: ['The builder glues your filter value into its internal query the same careless way the login does.', 'Your account filter is part of that same query string. Break out of the value and make the whole condition true.', "Build a report on dataset 1 with filter field 'region' and value ' OR '1'='1 — the results stop being only yours."],
  lesson: 'Injection flaws hide in "internal" query builders too — filters, sort keys and report definitions are user input and must be parameterised.',
  impact: 'A client analyst runs one "report" and pulls every other customer\'s metrics into it — a full cross-tenant data breach dressed as a feature.',
  report: { title: 'Injection in Report Builder Filter Bypasses Tenant Isolation', severity: 'Critical', remediation: 'Parameterise report-builder queries; validate filter fields against an allowlist and bind values as parameters.' },
  guide: 'Step by step: 1) Log in as Nadia. 2) Open /reports/new, choose dataset 1, filter field region, and value \' OR \'1\'=\'1. 3) Run it — the account condition is neutralised and the report contains Globex rows too. Cross-tenant injection, detected server-side.' },
{ id: 'report-account-tamper', feature: 'Report Builder', name: 'Report Saved into Another Account via accountId Tampering', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['account tamper', 'save report other account', 'accountid', 'builder account'],
  hints: ['The builder\'s save handler reads more of the POST than the form shows — including which account the report belongs to.', 'Your session says account 1. The request body can disagree.', 'POST /reports with the extra field accountId=2. The report is filed inside Globex\'s workspace.'],
  lesson: 'Tenant ownership of created objects must come from the session, never from the request body.',
  impact: 'An attacker plants reports inside a victim company\'s workspace — polluting their analytics, or staging content their team will trust and open.',
  report: { title: 'Tenant Tampering in Report Creation (accountId Mass Assignment)', severity: 'High', remediation: 'Derive the owning account from the authenticated session on every create; ignore client-supplied tenant ids.' },
  guide: 'Step by step: 1) Log in as Nadia (account 1). 2) POST /reports (the builder) with a name, datasetId 1, and accountId=2. 3) The saved report belongs to Globex — the server trusted the body over your session.' },
/* ---- Reports & Sharing ---- */
{ id: 'report-idor', feature: 'Reports & Sharing', name: 'Cross-Account Saved Report IDOR', owasp: 'A01 Broken Access Control', difficulty: 'Beginner', keys: ['report idor', 'other report', 'saved report'],
  hints: ['Saved reports have sequential ids too. Report 2 is Globex\'s confidential one.', 'Open it directly and see whether ownership is checked.', 'As Nadia, GET /report/2 — the confidential Globex revenue report renders in full.'],
  lesson: 'Reports concentrate a company\'s most sensitive conclusions; per-object tenant checks are mandatory.',
  impact: 'A client reads a competitor\'s confidential revenue report — the exact numbers they pay an analytics platform to keep private.',
  report: { title: 'Insecure Direct Object Reference on Saved Report View', severity: 'High', remediation: 'Scope report loads by session account; return 404 for objects outside the tenant.' },
  guide: 'Step by step: 1) Log in as Nadia. 2) Open /report/2. 3) Globex\'s confidential report is served — no ownership check on saved reports either.' },
{ id: 'share-guessable', feature: 'Reports & Sharing', name: 'Guessable Share-Link Token Exposes Private Report', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['share link', 'share token', 'guessable token', 'public link'],
  hints: ['Share links look like /share/shr_1001. What do you suppose shr_1001 is — random, or a counter?', 'It is a counter. The seeded link to Globex\'s PRIVATE report is one of the first ever issued.', 'Without logging in, open /share/shr_1001 — the private Globex report is served to the world.'],
  lesson: 'Share tokens are capabilities: they must be long and random. A sequential token is just an id with a costume on.',
  impact: 'Anyone can enumerate share links and read every "private" report clients ever shared — confidential numbers leak with no account and no trace.',
  report: { title: 'Predictable Share Tokens Expose Private Reports', severity: 'High', remediation: 'Generate share tokens with a CSPRNG (≥128 bits); rate-limit token lookups and log access.' },
  guide: 'Step by step: 1) Log out. 2) Guess the token format: shr_ plus a small number, starting at 1001. 3) GET /share/shr_1001 — Globex\'s private report renders for an anonymous visitor.' },
{ id: 'share-enumeration', feature: 'Reports & Sharing', name: 'Share-Link Enumeration (No Throttling on Token Lookups)', owasp: 'A04 Insecure Design', difficulty: 'Intermediate', keys: ['enumerat', 'share enumeration', 'token probing', 'brute share'],
  hints: ['Even without knowing the format, how fast can you probe tokens? Count your attempts — does anything resist?', 'Five different token guesses in a few seconds is a solid probe.', 'Request five distinct /share/<token> values in a row. All are answered instantly; nothing throttles or logs.'],
  lesson: 'Capability URLs need rate limiting and monitoring on misses, or enumeration turns a small token space into an open index.',
  impact: 'Attackers sweep the token space automatically and harvest every shared report on the platform in minutes.',
  report: { title: 'Unthrottled Share-Token Enumeration', severity: 'Medium', remediation: 'Rate-limit and alert on repeated invalid token lookups; use large random token spaces.' },
  guide: 'Step by step: 1) GET /share/shr_2001, shr_2002, shr_2003, shr_2004, shr_2005 in quick succession. 2) Every probe is answered at full speed — the 5th distinct probe completes this test.' },
{ id: 'share-revocation-bypass', feature: 'Reports & Sharing', name: 'Revoked Share Link Still Works via Embed Route', owasp: 'A01 Broken Access Control', difficulty: 'Advanced', keys: ['revok', 'embed', 'revocation bypass', 'unshare'],
  hints: ['Share a report, then revoke the link and confirm /share/<token> is dead. Is that the only door to it?', 'There is a second route built for embedding reports into other pages. Does it know about revocation?', 'Revoke report 1\'s link, then open /embed/shr_1002 — the "revoked" report still renders.'],
  lesson: 'Revocation must be enforced at every access path. A forgotten secondary route silently resurrects every revoked link.',
  impact: 'A client who discovers a leak and revokes the link believes the data is safe — while the embed route keeps serving it to anyone with the URL.',
  report: { title: 'Share Revocation Bypass via Embed Endpoint', severity: 'High', remediation: 'Check link revocation centrally in one authorisation helper used by every route that serves shared content.' },
  guide: 'Step by step: 1) Log in as Nadia; report 1 already has link shr_1002. 2) POST /report/1/revoke-share. 3) /share/shr_1002 now returns 410 — but GET /embed/shr_1002 still serves the full report. Revocation only covered one route.' },
/* ---- Scheduled Reports ---- */
{ id: 'schedule-idor', feature: 'Scheduled Reports', name: 'Cross-Account Schedule Deletion IDOR', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['schedule idor', 'delete schedule', 'scheduled report'],
  hints: ['Schedules are objects with ids, like everything else. Deletion is a POST to /schedule/<id>/delete.', 'Your schedules are yours. Schedule 2 belongs to Globex. Can you delete it anyway?', 'As Nadia, POST /schedule/2/delete. It is gone — no ownership check on a destructive action.'],
  lesson: 'Destructive actions need ownership checks most of all; "they would need to guess the id" is not a control.',
  impact: 'A malicious client silently deletes a competitor\'s scheduled reports — their board pack never arrives and nobody knows why.',
  report: { title: 'Insecure Direct Object Reference on Schedule Deletion', severity: 'High', remediation: 'Verify schedule ownership against the session account on every mutation; soft-delete with an audit trail.' },
  guide: 'Step by step: 1) Log in as Nadia (account 1). 2) POST /schedule/2/delete — schedule 2 belongs to Globex. 3) It is deleted. The handler never checks whose it is.' },
/* ---- Admin Panel ---- */
{ id: 'admin-authz', feature: 'Admin Panel', name: 'Admin User-List API Missing Authorisation', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['admin api', 'user list', 'admin authorisation', 'admin users'],
  hints: ['The admin console has a JSON endpoint that feeds its user table: /admin/api/users. Who is allowed to call it?', 'The page checks roles. The API behind it was never given the same check.', 'Log in as Nadia (a plain analyst) and GET /admin/api/users — every user, email and password hash comes back.'],
  lesson: 'Authorisation belongs on the API, not just the page that calls it. Attackers call the API directly.',
  impact: 'Any ordinary user downloads the full user directory of the platform — emails and password material for targeted attacks against every client.',
  report: { title: 'Missing Authorisation on Admin User-List API', severity: 'Critical', remediation: 'Enforce admin role checks server-side on every admin API route; never return password material.' },
  guide: 'Step by step: 1) Log in as Nadia (analyst, not admin). 2) GET /admin/api/users. 3) Full JSON of all users on the platform — the endpoint checks that you are logged in, never that you are an admin.' },
/* ---- Platform & API ---- */
{ id: 'debug-exposure', feature: 'Platform & API', name: 'Unauthenticated Debug Endpoint Leaks Users, Keys & Tokens', owasp: 'A05 Security Misconfiguration', difficulty: 'Beginner', keys: ['debug', 'exposure', 'api debug', 'sensitive data'],
  hints: ['Platforms ship diagnostics endpoints. Try the obvious one under /api.', 'No login is needed. That is the problem.', 'GET /api/debug as an anonymous visitor — users, password hashes, API keys and live share tokens come back as JSON.'],
  lesson: 'Debug/diagnostic endpoints must never reach production unauthenticated — they aggregate the keys to the kingdom.',
  impact: 'One anonymous request hands an attacker every user, the platform API keys and all live share links — total compromise in a single call.',
  report: { title: 'Sensitive Data Exposure via Unauthenticated Debug Endpoint', severity: 'Critical', remediation: 'Remove debug endpoints from production builds, or gate them behind admin auth and network allowlists.' },
  guide: 'Step by step: 1) Log out. 2) GET /api/debug. 3) The platform dumps its users, hashes, issued API keys and share tokens to an anonymous visitor.' },
{ id: 'api-token', feature: 'Platform & API', name: 'Predictable API Key Derived from Email', owasp: 'A07 Authentication Failures', difficulty: 'Advanced', keys: ['api key', 'api token', 'x-api-key', 'derived key'],
  hints: ['The JSON API at /api/datasets takes an x-api-key header. Issued keys are long — but the platform also honours a "legacy" key format.', 'The legacy key is a simple encoding of the account holder\'s email. Sound familiar?', 'Send x-api-key as the base64 of nadia@hexaanalytics.local. The API accepts it as Nadia\'s key.'],
  lesson: 'API keys must be random secrets, not encodings of public identifiers. If it can be computed, it is not a key.',
  impact: 'Anyone who knows a client\'s email — public information — can call the API as them and pull their datasets programmatically, at scale.',
  report: { title: 'Weak API Authentication: Key Derived from Email Address', severity: 'High', remediation: 'Issue high-entropy random API keys, store only hashes, and remove legacy derived-key acceptance.' },
  guide: 'Step by step: 1) Compute base64 of a user email: printf \'nadia@hexaanalytics.local\' | base64. 2) GET /api/datasets with header x-api-key set to that value. 3) The API returns Nadia\'s account datasets — the "key" was never a secret.' },
];

/* ---- key material, fragment sets B and C (scattered regions) ---- */

const _kc = ["TC1YSA==","WDY3Vg==","VEc0WA=="];
function _unshard(s) { return Buffer.from(s, 'base64').toString('utf8').split('').reverse().join(''); }
function _assemble(a, b) {
  const out = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) { if (a[i]) out.push(_unshard(a[i])); if (b[i]) out.push(_unshard(b[i])); }
  return out.join('');
}
const ENTRY_KEY_SHA256 = '34b6486dc0c351eb684e95f744d327c3eb949a6ff2d4a7c53548fca7069d1815';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */
const _kd = ["Ri03MQ==","LTlZNw==","S1FRTw=="];
function completionKey() { return _assemble(_kc, _kd); }

/* ============================== UI shell ============================== */
function progressBarHTML() {
  const s = progressSummary();
  return '<div style="background:#1d1d2b;border-radius:8px;padding:8px 12px;margin:10px 0;color:#eee;font-size:13px">' +
    '<img src="/logo.png" alt="HexaCyberLab" style="height:22px;vertical-align:middle;margin-right:8px">' +
    '<b>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</b> · ' + s.done + '/' + s.total + ' tests · ' + s.pct + '%' +
    '<div style="background:#33334a;border-radius:4px;height:8px;margin-top:6px"><div style="background:linear-gradient(90deg,#4f7cff,#a24fff);height:8px;border-radius:4px;width:' + s.pct + '%"></div></div></div>';
}
function chatWidget() {
  return '<div id="hxchat" style="position:fixed;right:16px;bottom:16px;width:320px;max-width:92vw;background:#17171f;border:1px solid #33334a;border-radius:12px;color:#eee;font-family:inherit;z-index:50;box-shadow:0 8px 30px rgba(0,0,0,.5)">' +
  '<div style="padding:10px 12px;border-bottom:1px solid #33334a"><b>🤖 Lab Coach</b> <span style="color:#9a9ab0;font-size:12px">HexaAnalytics</span></div>' +
  '<div id="hxlog" style="height:180px;overflow:auto;padding:10px 12px;font-size:13px;line-height:1.45"></div>' +
  '<div style="display:flex;border-top:1px solid #33334a"><input id="hxmsg" placeholder="Ask the coach…" style="flex:1;background:#101018;border:0;color:#eee;padding:10px" onkeydown="if(event.key===\'Enter\')hxSend()"><button onclick="hxSend()" style="background:#4f7cff;color:#fff;border:0;padding:0 14px;cursor:pointer">Send</button></div></div>' +
  '<script>async function hxSend(){var i=document.getElementById("hxmsg"),l=document.getElementById("hxlog");var m=i.value.trim();if(!m)return;i.value="";l.innerHTML+="<div><b>You:</b> "+m.replace(/</g,"&lt;")+"</div>";try{var r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:m})});var j=await r.json();l.innerHTML+="<div style=\\"margin:6px 0\\"><b>Coach:</b> "+(j.reply||"").replace(/</g,"&lt;")+"</div>";}catch(e){l.innerHTML+="<div><b>Coach:</b> (connection error)</div>";}l.scrollTop=l.scrollHeight;}</script>';
}
function layout(sess, title, body) {
  const nav = sess ? '<nav style="margin:8px 0;font-size:14px"><a href="/">Dashboards</a> · <a href="/datasets">Datasets</a> · <a href="/reports">Reports</a> · <a href="/reports/new">Report Builder</a> · <a href="/schedules">Schedules</a> · <a href="/tests">🎯 Tests</a> · <a href="/profile">Profile</a>' + (sess.role === 'admin' ? ' · <a href="/admin">Admin</a>' : '') + ' · <a href="/logout">Logout</a></nav>' +
    // NOTE (intentional flaw): the display name is rendered unescaped — stored XSS delivery point.
    '<div style="font-size:13px;color:#555">Signed in as <b>' + (sess ? sess.name : '') + '</b> (' + esc(sess ? sess.email : '') + ' · ' + esc(sess ? sess.role : '') + ' · ' + esc((accounts.find(a => a.id === (sess && sess.accountId)) || {}).name || '') + ')</div>' : '';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + ' · LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</title><style>body{font-family:\'Segoe UI\',Arial,sans-serif;margin:0;background:#f4f5fb;color:#1c1c28}a{color:#4f2fd6}main{max-width:980px;margin:0 auto;padding:18px}table{border-collapse:collapse;width:100%;background:#fff}th,td{border:1px solid #ddd;padding:6px 9px;text-align:left;font-size:14px}th{background:#eef}.card{background:#fff;border:1px solid #dde;border-radius:10px;padding:14px 16px;margin:12px 0}input,select,textarea{padding:7px;border:1px solid #bbb;border-radius:6px}button{background:#4f2fd6;color:#fff;border:0;padding:8px 14px;border-radius:6px;cursor:pointer}.err{background:#ffe3e3;border:1px solid #e5a3a3;padding:8px 12px;border-radius:6px}.ok{background:#e2f7e3;border:1px solid #9ed3a1;padding:8px 12px;border-radius:6px}</style></head><body><main>' +
    progressBarHTML() + nav + '<h1>' + esc(title) + '</h1>' + body + '</main>' + chatWidget() + '</body></html>';
}
function gatePage(err) {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' · Locked</title><style>body{font-family:\'Segoe UI\',Arial,sans-serif;background:#14141d;color:#eee;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}.box{background:#1d1d2b;padding:28px;border-radius:14px;max-width:440px;text-align:center}input{padding:9px;width:80%;border-radius:6px;border:1px solid #444;background:#101018;color:#eee}button{background:#4f7cff;color:#fff;border:0;padding:9px 18px;border-radius:6px;cursor:pointer;margin-top:10px}</style></head><body><div class="box">' +
  '<img src="/logo.png" alt="HexaCyberLab" style="height:54px"><h2>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h2>' +
  '<p>This lab is locked. Paste the completion key from Lab ' + PREV_LAB + ' to start.</p>' +
  (err ? '<p style="color:#ff9c9c">That key was not accepted.</p>' : '') +
  '<form method="POST" action="/unlock"><input type="text" name="key" placeholder="Completion key from Lab ' + PREV_LAB + '" autocomplete="off"><br><button type="submit">Unlock Lab ' + LAB_NUMBER + '</button></form>' +
  '<p style="color:#9a9ab0;font-size:12px">HexaCyberLab practice labs — local use only.</p></div>' + chatWidget() + '</body></html>';
}

/* ============================== tracking state ============================== */
const enumProbes = {};  // ip -> {known, unknown}
const failCount = {};   // email -> consecutive failures
const shareProbes = {}; // ip -> Set of tokens
function checkEnum(ip) { const p = enumProbes[ip]; if (p && p.known && p.unknown) pass('user-enumeration'); }
function rowsTable(rows) {
  if (!rows.length) return '<p>No rows.</p>';
  let t = '<table><tr><th>Date</th><th>Region</th><th>Channel</th><th>Revenue</th><th>Signups</th><th>Account</th></tr>';
  for (const r of rows.slice(0, 100)) t += '<tr><td>' + esc(r.date) + '</td><td>' + esc(r.region) + '</td><td>' + esc(r.channel) + '</td><td>$' + esc(r.revenue) + '</td><td>' + esc(r.signups) + '</td><td>' + esc((accounts.find(a => a.id === r.accountId) || {}).name || r.accountId) + '</td></tr>';
  return t + '</table>';
}

/* ============================== chatbot ============================== */
function chatReply(raw) {
  const msg = String(raw || '').toLowerCase();
  const sum = progressSummary();
  if (/(who (built|made|created)|founder|jony|built (this|these|the))/.test(msg)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (/key/.test(msg)) {
    if (sum.complete) return 'You completed LAB ' + LAB_NUMBER + ' — here is the completion key for Lab ' + (LAB_NUMBER + 1) + ': ' + completionKey();
    return "I don't have the completion key yet — nobody does. It is only given to me when this lab is completed 100%. You are at " + sum.pct + '% (' + sum.done + '/' + sum.total + ' tests). Finish every test and ask me again.';
  }
  const test = TESTS.find(t => t.keys.some(k => msg.includes(k)));
  const feature = test ? test.feature : FEATURES.find(f => msg.includes(f.toLowerCase()) || msg.includes(f.split(' ')[0].toLowerCase().replace(/&/g, '').trim()));
  if (/how many|count|list|which|what tests|features|vulnerabilit/.test(msg)) {
    if (feature) {
      const ts = TESTS.filter(t => t.feature === feature);
      return feature + ' has ' + ts.length + ' tests: ' + ts.map(t => t.name).join('; ') + '. Attempts so far on this feature: ' + (progress.attempts[feature] || 0) + '.';
    }
    return 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + FEATURES.length + ' features and ' + TESTS.length + ' tests: ' + FEATURES.map(f => f + ' (' + TESTS.filter(t => t.feature === f).length + ')').join(', ') + '. Your progress: ' + sum.done + '/' + sum.total + ' (' + sum.pct + '%).';
  }
  if (/(how|guide|step|solve|exploit|walkthrough|hint|help)/.test(msg) && (test || feature)) {
    const f = test ? test.feature : feature;
    const t = test || TESTS.find(x => x.feature === f && !progress.tests[x.id]) || TESTS.find(x => x.feature === f);
    if (progress.tests[t.id]) return 'You already completed "' + t.name + '". ' + t.guide;
    const n = progress.attempts[f] || 0;
    if (n >= 3) return 'Here is the step-by-step for "' + t.name + '": ' + t.guide;
    return 'That feature is locked for help. First try the ' + f + ' tests yourself at least 3 times — I can see you\'ve tried ' + n + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  if (/(progress|status|next|start|begin|hello|hi|hey)/.test(msg)) {
    const next = TESTS.find(t => !progress.tests[t.id]);
    return 'Welcome to LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '. Progress: ' + sum.done + '/' + sum.total + ' tests (' + sum.pct + '%). ' + (next ? 'Next open test: "' + next.name + '" (' + next.feature + '). Open /tests for the map and hints — and remember, I unlock step-by-step help for a feature after you have genuinely tried it at least 3 times.' : 'All tests complete — see /complete for your debrief and certificate.');
  }
  return 'I can share the map (features, test counts and names — see /tests), report your progress, and, after you have tried a feature at least 3 times, guide you step by step through its tests. What would you like to know?';
}

/* ============================== server ============================== */
function jsonRes(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); }

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://127.0.0.1');
    const pn = u.pathname;
    const method = req.method;
    const ip = req.socket.remoteAddress || 'local';
    const sess = getSession(req);
    let m;

    if (pn === '/logo.png') {
      try { const buf = fs.readFileSync(LOGO_FILE); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(buf); }
      catch (e) { return send(res, 404, 'logo missing'); }
    }
    if (pn === '/api/progress') return jsonRes(res, 200, progressSummary());
    if (pn === '/api/chat' && method === 'POST') { const b = await parseBody(req); return jsonRes(res, 200, { reply: chatReply(b.message) }); }
    if (pn === '/unlock' && method === 'POST') {
      const b = await parseBody(req);
      if (entryKeyMatches(b.key)) { progress.unlocked = true; saveProgress(); return redirect(res, '/'); }
      return send(res, 403, gatePage(true));
    }
    if (!progress.unlocked) return send(res, 200, gatePage(false));

    /* ---------- auth ---------- */
    if (pn === '/login' && method === 'GET') {
      return send(res, 200, layout(null, 'Sign in — HexaAnalytics',
        '<div class="card"><form method="POST" action="/login"><p><label>Email<br><input name="email" size="36" required></label></p><p><label>Password<br><input type="password" name="password" size="36" required></label></p><button>Sign in</button></form><p style="font-size:13px"><a href="/forgot">Forgot password?</a> · <a href="/register">Create an account</a></p></div>'));
    }
    if (pn === '/login' && method === 'POST') {
      attempt('Login & Authentication');
      const b = await parseBody(req);
      const email = String(b.email || ''), password = String(b.password || '');
      const loginErr = msg => send(res, 200, layout(null, 'Sign in — HexaAnalytics', '<div class="err">' + esc(msg) + '</div><div class="card"><form method="POST" action="/login"><p><label>Email<br><input name="email" size="36" required></label></p><p><label>Password<br><input type="password" name="password" size="36" required></label></p><button>Sign in</button></form><p style="font-size:13px"><a href="/forgot">Forgot password?</a> · <a href="/register">Create an account</a></p></div>'));
      if (isSQLi(email) || isSQLi(password)) {
        const user = users[0];
        pass('sqli-login');
        return redirect(res, '/', { 'Set-Cookie': [sessionCookie(user), 'hx_tok=' + crypto.randomBytes(6).toString('hex') + '; Path=/'] });
      }
      const user = users.find(x => x.email.toLowerCase() === email.toLowerCase());
      if (!user) { (enumProbes[ip] = enumProbes[ip] || { known: false, unknown: false }).unknown = true; checkEnum(ip); return loginErr('No account found for that email.'); }
      if (user.pass !== password) {
        failCount[user.email] = (failCount[user.email] || 0) + 1;
        if (failCount[user.email] >= 10) pass('brute-force');
        (enumProbes[ip] = enumProbes[ip] || { known: false, unknown: false }).known = true; checkEnum(ip);
        return loginErr('Incorrect password for that account.');
      }
      delete failCount[user.email];
      if (user.isDefault && password === 'demo123') pass('default-creds');
      return redirect(res, '/', { 'Set-Cookie': [sessionCookie(user), 'hx_tok=' + crypto.randomBytes(6).toString('hex') + '; Path=/'] });
    }
    if (pn === '/register' && method === 'GET') {
      return send(res, 200, layout(null, 'Create account — HexaAnalytics',
        '<div class="card"><form method="POST" action="/register"><p><label>Display name<br><input name="name" size="36"></label></p><p><label>Email<br><input name="email" size="36" required></label></p><p><label>Password<br><input type="password" name="password" size="36" required></label></p><button>Create account</button></form><p style="font-size:13px">New accounts start as <b>viewer</b> in Northwind Retail.</p></div>'));
    }
    if (pn === '/register' && method === 'POST') {
      attempt('Registration & Profile');
      const b = await parseBody(req);
      const email = String(b.email || '').trim(), password = String(b.password || '');
      if (!email || !password) return send(res, 400, layout(null, 'Create account', '<div class="err">Email and password are required.</div>'));
      if (users.some(x => x.email.toLowerCase() === email.toLowerCase())) return send(res, 200, layout(null, 'Create account', '<div class="err">That email is already registered.</div>'));
      // VULN: the whole body is bound onto the new user — role/accountId are client-controllable.
      const user = { id: nextUserId++, email, name: String(b.name || email), pass: password, role: 'viewer', accountId: 1, isDefault: false };
      if (typeof b.role === 'string' && b.role) user.role = b.role;
      if (b.accountId) user.accountId = Number(b.accountId) || 1;
      users.push(user);
      if (password.length < 4) pass('weak-password');
      if (typeof b.role === 'string' && b.role && user.role !== 'viewer') pass('mass-assignment');
      return redirect(res, '/', { 'Set-Cookie': [sessionCookie(user), 'hx_tok=' + crypto.randomBytes(6).toString('hex') + '; Path=/'] });
    }
    if (pn === '/forgot' && method === 'GET') {
      return send(res, 200, layout(null, 'Forgot password', '<div class="card"><form method="POST" action="/forgot"><p><label>Email<br><input name="email" size="36" required></label></p><button>Send reset email</button></form></div>'));
    }
    if (pn === '/forgot' && method === 'POST') {
      attempt('Login & Authentication');
      const b = await parseBody(req);
      const user = users.find(x => x.email.toLowerCase() === String(b.email || '').toLowerCase());
      if (user) { (enumProbes[ip] = enumProbes[ip] || { known: false, unknown: false }).known = true; checkEnum(ip); return send(res, 200, layout(null, 'Forgot password', '<div class="ok">Reset email sent to ' + esc(user.email) + '. Check your inbox for the token.</div>')); }
      (enumProbes[ip] = enumProbes[ip] || { known: false, unknown: false }).unknown = true; checkEnum(ip);
      return send(res, 200, layout(null, 'Forgot password', '<div class="err">No account found for that email.</div>'));
    }
    if (pn === '/reset' && method === 'GET') {
      return send(res, 200, layout(null, 'Reset password', '<div class="card"><form method="POST" action="/reset"><p><label>Reset token (from your email)<br><input name="token" size="52" required></label></p><p><label>New password<br><input type="password" name="password" size="36" required></label></p><button>Set new password</button></form></div>'));
    }
    if (pn === '/reset' && method === 'POST') {
      attempt('Login & Authentication');
      const b = await parseBody(req);
      const token = String(b.token || '');
      // VULN: the reset token is simply the hex encoding of the account email — anyone can compute it.
      const user = users.find(x => Buffer.from(x.email, 'utf8').toString('hex') === token);
      if (user && b.password) { user.pass = String(b.password); pass('reset-token'); return redirect(res, '/login'); }
      return send(res, 200, layout(null, 'Reset password', '<div class="err">That token is not valid.</div>'));
    }
    if (pn === '/logout') return redirect(res, '/login', { 'Set-Cookie': ['ha_session=; Path=/; Max-Age=0'] });

    /* ---------- public share routes ---------- */
    if ((m = pn.match(/^\/share\/(.+)$/)) && method === 'GET') {
      const token = decodeURIComponent(m[1]);
      (shareProbes[ip] = shareProbes[ip] || new Set()).add(token);
      if (shareProbes[ip].size >= 5) pass('share-enumeration');
      const link = shareLinks.find(l => l.token === token);
      if (!link) return send(res, 404, layout(null, 'Link not found', '<div class="err">That share link does not exist.</div>'));
      if (link.revoked) return send(res, 410, layout(null, 'Link revoked', '<div class="err">This share link has been revoked by its owner.</div>'));
      const rep = reports.find(r => r.id === link.reportId);
      if (!rep) return send(res, 404, 'Report gone');
      if (rep.private && (!sess || sess.uid !== rep.ownerId)) pass('share-guessable');
      return send(res, 200, layout(null, 'Shared report — ' + rep.name, '<div class="card"><h2>' + esc(rep.name) + '</h2><p style="color:#666">Shared publicly via link · dataset ' + rep.datasetId + ' · filter: ' + esc(rep.filterDesc) + '</p>' + rowsTable(rep.rows) + '</div>'));
    }
    if ((m = pn.match(/^\/embed\/(.+)$/)) && method === 'GET') {
      const token = decodeURIComponent(m[1]);
      (shareProbes[ip] = shareProbes[ip] || new Set()).add(token);
      if (shareProbes[ip].size >= 5) pass('share-enumeration');
      const link = shareLinks.find(l => l.token === token);
      if (!link) return send(res, 404, 'Not found');
      // VULN: the embed route never checks whether the link was revoked.
      if (link.revoked) pass('share-revocation-bypass');
      const rep = reports.find(r => r.id === link.reportId);
      if (!rep) return send(res, 404, 'Report gone');
      return send(res, 200, '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Embedded report</title><style>body{font-family:Arial,sans-serif;margin:12px}table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:5px 8px;font-size:13px}</style></head><body><h3>' + esc(rep.name) + '</h3>' + rowsTable(rep.rows) + '</body></html>');
    }

    /* ---------- platform APIs ---------- */
    if (pn === '/api/debug' && method === 'GET') {
      attempt('Platform & API');
      pass('debug-exposure');
      return jsonRes(res, 200, { env: 'production', version: '2.4.1', users: users.map(x => ({ id: x.id, email: x.email, role: x.role, accountId: x.accountId, password: x.pass, resetToken: Buffer.from(x.email, 'utf8').toString('hex') })), issuedApiKeys: Object.keys(issuedApiKeys), shareLinks: shareLinks });
    }
    if (pn === '/api/datasets' && method === 'GET') {
      attempt('Platform & API');
      const key = req.headers['x-api-key'] || '';
      let acct = issuedApiKeys[key];
      if (!acct) {
        const u = users.find(x => Buffer.from(x.email, 'utf8').toString('base64') === key);
        if (u) { pass('api-token'); acct = u.accountId; }
      }
      if (!acct) return jsonRes(res, 401, { error: 'invalid api key' });
      return jsonRes(res, 200, { account: acct, datasets: datasets.filter(d => d.accountId === acct).map(d => ({ id: d.id, name: d.name, rows: d.rows.length })) });
    }

    if (!sess && pn !== '/complete' && pn !== '/complete/name' && pn !== '/certificate') return redirect(res, '/login');
    const me = storedUser(sess);

    /* ---------- home ---------- */
    if (pn === '/' && method === 'GET') {
      const mine = dashboards.filter(d => d.accountId === sess.accountId);
      const team = users.filter(x => x.accountId === sess.accountId);
      return send(res, 200, layout(sess, 'Dashboards',
        mine.map(d => '<div class="card"><h3><a href="/dashboard/' + d.id + '">' + esc(d.name) + '</a></h3><p style="color:#666">Dataset ' + d.datasetId + ' · ' + esc((accounts.find(a => a.id === d.accountId) || {}).name || '') + '</p></div>').join('') +
        // NOTE (intentional flaw): team names rendered unescaped — stored XSS victim view.
        '<div class="card"><h3>Your team</h3><ul>' + team.map(x => '<li>' + x.name + ' — ' + esc(x.email) + ' (' + esc(x.role) + ')</li>').join('') + '</ul></div>'));
    }

    /* ---------- dashboards ---------- */
    if ((m = pn.match(/^\/dashboard\/(\d+)$/)) && method === 'GET') {
      attempt('Dashboards');
      const dash = dashboards.find(d => d.id === Number(m[1]));
      if (!dash) return send(res, 404, layout(sess, 'Not found', '<div class="err">No such dashboard.</div>'));
      if (dash.accountId !== sess.accountId) pass('dashboard-idor');
      const ds = datasets.find(d => d.id === dash.datasetId);
      const q = u.searchParams.get('q');
      if (q && XSS_RE.test(q)) pass('reflected-xss');
      const totalRev = ds.rows.reduce((a, r) => a + r.revenue, 0), totalSign = ds.rows.reduce((a, r) => a + r.signups, 0);
      return send(res, 200, layout(sess, dash.name,
        '<div class="card"><form method="GET"><label>Filter: <input name="q" value="' + esc(q || '') + '"></label> <button>Apply</button></form>' +
        // NOTE (intentional flaw): q reflected unescaped below.
        (q ? '<p>Showing results for: ' + q + '</p>' : '') +
        '<p><b>Total revenue:</b> $' + totalRev.toLocaleString() + ' · <b>Total signups:</b> ' + totalSign.toLocaleString() + '</p>' + rowsTable(ds.rows) + '</div>'));
    }

    /* ---------- datasets & exports ---------- */
    if (pn === '/datasets' && method === 'GET') {
      const mine = datasets.filter(d => d.accountId === sess.accountId);
      return send(res, 200, layout(sess, 'Datasets', mine.map(d => '<div class="card"><h3><a href="/dataset/' + d.id + '">' + esc(d.name) + '</a></h3><p style="color:#666">' + d.rows.length + ' rows · <a href="/dataset/' + d.id + '/export?format=csv">Export CSV</a> · <a href="/dataset/' + d.id + '/export?format=json">Export JSON</a></p></div>').join('')));
    }
    if ((m = pn.match(/^\/dataset\/(\d+)\/export$/)) && method === 'GET') {
      attempt('Datasets & Exports');
      const ds = datasets.find(d => d.id === Number(m[1]));
      if (!ds) return send(res, 404, 'No such dataset');
      if (ds.accountId !== sess.accountId) pass('export-idor');
      if (me && me.role === 'viewer') pass('viewer-export');
      if ((u.searchParams.get('format') || 'csv') === 'json') { res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="dataset-' + ds.id + '.json"' }); return res.end(JSON.stringify(ds.rows, null, 2)); }
      const csv = 'date,region,channel,revenue,signups\n' + ds.rows.map(r => [r.date, r.region, r.channel, r.revenue, r.signups].join(',')).join('\n');
      res.writeHead(200, { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="dataset-' + ds.id + '.csv"' });
      return res.end(csv);
    }
    if ((m = pn.match(/^\/dataset\/(\d+)$/)) && method === 'GET') {
      attempt('Datasets & Exports');
      const ds = datasets.find(d => d.id === Number(m[1]));
      if (!ds) return send(res, 404, layout(sess, 'Not found', '<div class="err">No such dataset.</div>'));
      if (ds.accountId !== sess.accountId) pass('dataset-idor');
      return send(res, 200, layout(sess, ds.name, '<div class="card"><p style="color:#666">Owner account: ' + esc((accounts.find(a => a.id === ds.accountId) || {}).name || '') + ' · <a href="/dataset/' + ds.id + '/export?format=csv">Export CSV</a></p>' + rowsTable(ds.rows) + '</div>'));
    }

    /* ---------- report builder & reports ---------- */
    if (pn === '/reports' && method === 'GET') {
      const mine = reports.filter(r => r.accountId === sess.accountId);
      return send(res, 200, layout(sess, 'Saved reports', mine.map(r => '<div class="card"><h3><a href="/report/' + r.id + '">' + esc(r.name) + '</a></h3><p style="color:#666">Dataset ' + r.datasetId + ' · filter: ' + esc(r.filterDesc) + (r.private ? ' · 🔒 private' : '') + '</p></div>').join('') || '<p>No reports yet.</p>'));
    }
    if (pn === '/reports/new' && method === 'GET') {
      const mine = datasets.filter(d => d.accountId === sess.accountId);
      return send(res, 200, layout(sess, 'Report Builder',
        '<div class="card"><form method="POST" action="/reports"><p><label>Report name<br><input name="name" size="40" required></label></p>' +
        '<p><label>Dataset<br><select name="datasetId">' + mine.map(d => '<option value="' + d.id + '">' + esc(d.name) + '</option>').join('') + '</select></label></p>' +
        '<p><label>Filter field<br><select name="field"><option>region</option><option>channel</option></select></label> <label>Value<br><input name="value" size="28" placeholder="e.g. North"></label></p>' +
        '<p><label>Group by<br><select name="group"><option>region</option><option>channel</option></select></label></p>' +
        '<p><label><input type="checkbox" name="private"> Private report</label></p><button>Build report</button></form></div>'));
    }
    if (pn === '/reports' && method === 'POST') {
      attempt('Report Builder');
      const b = await parseBody(req);
      const datasetId = Number(b.datasetId) || 1;
      const field = ['region', 'channel'].includes(b.field) ? b.field : 'region';
      const value = String(b.value || '');
      const allRows = datasets.reduce((a, d) => a.concat(d.rows), []);
      let rows;
      // VULN: the filter value is glued into the builder's internal query — a tautology drops the tenant filter entirely.
      if (isSQLi(value)) {
        rows = allRows;
        if (rows.some(r => r.accountId !== sess.accountId)) pass('filter-injection');
      } else {
        rows = allRows.filter(r => r.datasetId === datasetId && (value === '' || String(r[field]) === value));
      }
      let acct = sess.accountId;
      if (b.accountId) { acct = Number(b.accountId) || sess.accountId; if (acct !== sess.accountId) pass('report-account-tamper'); }
      const rep = { id: nextReportId++, accountId: acct, ownerId: sess.uid, name: String(b.name || 'Untitled report'), datasetId, filterDesc: field + ' = ' + value, private: b.private === 'on', rows };
      reports.push(rep);
      return redirect(res, '/report/' + rep.id);
    }
    if ((m = pn.match(/^\/report\/(\d+)$/)) && method === 'GET') {
      attempt('Reports & Sharing');
      const rep = reports.find(r => r.id === Number(m[1]));
      if (!rep) return send(res, 404, layout(sess, 'Not found', '<div class="err">No such report.</div>'));
      if (rep.accountId !== sess.accountId) pass('report-idor');
      const links = shareLinks.filter(l => l.reportId === rep.id);
      return send(res, 200, layout(sess, rep.name,
        '<div class="card"><p style="color:#666">Filter: ' + esc(rep.filterDesc) + (rep.private ? ' · 🔒 private' : '') + '</p>' + rowsTable(rep.rows) + '</div>' +
        '<div class="card"><h3>Sharing</h3>' + (links.length ? '<ul>' + links.map(l => '<li>/share/' + esc(l.token) + (l.revoked ? ' — <b>revoked</b>' : ' — active') + '</li>').join('') + '</ul>' : '<p>No share links yet.</p>') +
        '<form method="POST" action="/report/' + rep.id + '/share" style="display:inline"><button>Create share link</button></form> ' +
        '<form method="POST" action="/report/' + rep.id + '/revoke-share" style="display:inline"><button>Revoke all links</button></form></div>'));
    }
    if ((m = pn.match(/^\/report\/(\d+)\/share$/)) && method === 'POST') {
      attempt('Reports & Sharing');
      const rep = reports.find(r => r.id === Number(m[1]));
      if (rep) { shareLinks.push({ id: nextLinkId, reportId: rep.id, token: 'shr_' + (1000 + nextLinkId), revoked: false }); nextLinkId++; }
      return redirect(res, '/report/' + m[1]);
    }
    if ((m = pn.match(/^\/report\/(\d+)\/revoke-share$/)) && method === 'POST') {
      attempt('Reports & Sharing');
      for (const l of shareLinks.filter(x => x.reportId === Number(m[1]))) l.revoked = true;
      return redirect(res, '/report/' + m[1]);
    }

    /* ---------- schedules ---------- */
    if (pn === '/schedules' && method === 'GET') {
      const mine = schedules.filter(s => s.accountId === sess.accountId);
      const myReports = reports.filter(r => r.accountId === sess.accountId);
      return send(res, 200, layout(sess, 'Scheduled reports',
        mine.map(s => '<div class="card"><b>Schedule #' + s.id + '</b> — report ' + s.reportId + ' · ' + esc(s.freq) + ' <form method="POST" action="/schedule/' + s.id + '/delete" style="display:inline"><button>Delete</button></form></div>').join('') +
        '<div class="card"><h3>New schedule</h3><form method="POST" action="/schedules"><label>Report <select name="reportId">' + myReports.map(r => '<option value="' + r.id + '">' + esc(r.name) + '</option>').join('') + '</select></label> <label>Frequency <select name="freq"><option>daily</option><option>weekly</option><option>monthly</option></select></label> <button>Create</button></form></div>'));
    }
    if (pn === '/schedules' && method === 'POST') {
      attempt('Scheduled Reports');
      const b = await parseBody(req);
      schedules.push({ id: nextScheduleId++, accountId: sess.accountId, ownerId: sess.uid, reportId: Number(b.reportId) || 0, freq: String(b.freq || 'weekly') });
      return redirect(res, '/schedules');
    }
    if ((m = pn.match(/^\/schedule\/(\d+)\/delete$/)) && method === 'POST') {
      attempt('Scheduled Reports');
      const sch = schedules.find(s => s.id === Number(m[1]));
      // VULN: destructive action with no ownership check.
      if (sch && sch.accountId !== sess.accountId) pass('schedule-idor');
      schedules = schedules.filter(s => s.id !== Number(m[1]));
      return redirect(res, '/schedules');
    }

    /* ---------- profile ---------- */
    if (pn === '/profile' && method === 'GET') {
      const tok = cookiesOf(req).hx_tok || '';
      return send(res, 200, layout(sess, 'Profile',
        '<div class="card"><form method="POST" action="/profile"><input type="hidden" name="hx_tok" value="' + esc(tok) + '"><p><label>Display name<br><input name="name" size="40" value="' + esc(me ? me.name : '') + '"></label></p><p style="color:#666">Email: ' + esc(me ? me.email : '') + ' · Role: ' + esc(me ? me.role : '') + '</p><button>Save profile</button></form></div>'));
    }
    if (pn === '/profile' && method === 'POST') {
      attempt('Registration & Profile');
      const b = await parseBody(req);
      // VULN: the anti-CSRF marker is rendered into the form but never verified; foreign origins are accepted too.
      const tokOk = b.hx_tok && b.hx_tok === cookiesOf(req).hx_tok;
      const origin = req.headers.origin || '';
      const foreign = origin && !origin.includes('127.0.0.1') && !origin.includes('localhost');
      if (!tokOk || foreign) pass('csrf-profile');
      if (me && typeof b.name === 'string' && b.name) {
        if (XSS_RE.test(b.name)) pass('stored-xss');
        me.name = b.name;
        return redirect(res, '/profile', { 'Set-Cookie': [sessionCookie(me)] });
      }
      return redirect(res, '/profile');
    }

    /* ---------- admin ---------- */
    if (pn === '/admin' && method === 'GET') {
      attempt('Admin Panel');
      if (sess.role === 'admin' && me && me.role !== 'admin') pass('cookie-tamper');
      if (sess.role !== 'admin') return send(res, 403, layout(sess, 'Admins only', '<div class="err">This area is for platform administrators.</div>'));
      return send(res, 200, layout(sess, 'Admin console',
        '<div class="card"><h3>Platform</h3><p>' + users.length + ' users · ' + accounts.length + ' accounts · ' + reports.length + ' reports · ' + shareLinks.length + ' share links</p><p>User table API: <code>/admin/api/users</code></p><table><tr><th>Email</th><th>Role</th><th>Account</th></tr>' +
        users.map(x => '<tr><td>' + esc(x.email) + '</td><td>' + esc(x.role) + '</td><td>' + esc((accounts.find(a => a.id === x.accountId) || {}).name || '') + '</td></tr>').join('') + '</table></div>'));
    }
    if (pn === '/admin/api/users' && method === 'GET') {
      attempt('Admin Panel');
      // VULN: no role check at all — any signed-in user can enumerate the platform directory.
      if (me && me.role !== 'admin') pass('admin-authz');
      return jsonRes(res, 200, users.map(x => ({ id: x.id, email: x.email, name: x.name, role: x.role, accountId: x.accountId, passwordHash: crypto.createHash('sha256').update(x.pass).digest('hex'), resetToken: Buffer.from(x.email, 'utf8').toString('hex') })));
    }

    /* ---------- tests / complete / certificate ---------- */
    if (pn === '/tests' && method === 'GET') {
      const sum = progressSummary();
      let body = '<p>Tests complete by <b>doing</b> — the server detects each exploit succeeding. Hints reveal one at a time. The Lab Coach unlocks step-by-step help for a feature after <b>3 genuine attempts</b> on it.</p>';
      for (const f of FEATURES) {
        const fs2 = sum.features[f];
        body += '<div class="card"><h3>' + esc(f) + ' — ' + fs2.done + '/' + fs2.total + ' done · attempts: ' + fs2.attempts + '</h3>';
        for (const t of TESTS.filter(x => x.feature === f)) {
          const done = progress.tests[t.id];
          body += '<div style="border-top:1px solid #eee;padding:8px 0"><b>' + (done ? '✓' : '○') + ' ' + esc(t.name) + '</b> <span style="color:#777;font-size:12px">' + esc(t.owasp) + ' · ' + esc(t.difficulty) + '</span>' +
            t.hints.map((h, i) => '<details><summary>Hint ' + (i + 1) + '</summary><p>' + esc(h) + '</p></details>').join('') + '</div>';
        }
        body += '</div>';
      }
      return send(res, 200, layout(sess, '🎯 Mission — security tests', body));
    }
    if (pn === '/complete' && method === 'GET') {
      const sum = progressSummary();
      if (!sum.complete) {
        const left = TESTS.filter(t => !progress.tests[t.id]);
        return send(res, 200, layout(sess, 'Not yet complete', '<div class="card"><p>Progress: <b>' + sum.done + '/' + sum.total + ' (' + sum.pct + '%)</b>. Remaining tests:</p><ul>' + left.map(t => '<li>' + esc(t.name) + ' (' + esc(t.feature) + ')</li>').join('') + '</ul><p>See <a href="/tests">🎯 Tests</a>.</p></div>'));
      }
      let body = '<div class="card"><h3>1 · What this lab contains</h3><p>' + FEATURES.length + ' features, ' + TESTS.length + ' scored tests.</p></div>';
      body += '<div class="card"><h3>2 · Vulnerabilities per feature</h3><ul>' + FEATURES.map(f => '<li><b>' + esc(f) + ':</b> ' + TESTS.filter(t => t.feature === f).length + ' tests</li>').join('') + '</ul></div>';
      body += '<div class="card"><h3>3 · How testing was done</h3><p>' + TESTS.length + ' techniques, one per test:</p><ul>' + TESTS.map(t => '<li>' + esc(t.name) + ' — ' + esc(t.owasp) + '</li>').join('') + '</ul></div>';
      body += '<div class="card"><h3>4 · What you learned</h3><ul>' + TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.lesson) + '</li>').join('') + '</ul></div>';
      body += '<div class="card"><h3>5 · What this means for a real client</h3><ul>' + TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.impact) + '</li>').join('') + '</ul></div>';
      body += '<div class="card"><h3>6 · Writing it in a real report</h3><ul>' + TESTS.map(t => '<li><b>' + esc(t.report.title) + '</b> — Severity: ' + esc(t.report.severity) + ' · Remediation: ' + esc(t.report.remediation) + '</li>').join('') + '</ul></div>';
      body += '<div class="card" style="text-align:center"><h3>🔑 Completion key for Lab ' + (LAB_NUMBER + 1) + '</h3><p style="font-size:20px"><code>' + esc(completionKey()) + '</code></p>' +
        '<form method="POST" action="/complete"><label>Your name for the certificate: <input name="name" value="' + esc(progress.testerName || (sess ? sess.name : '')) + '"></label> <button>Save & view certificate</button></form>' +
        '<p><a href="/certificate">/certificate</a></p></div>';
      return send(res, 200, layout(sess, '🏆 Lab ' + LAB_NUMBER + ' complete!', body));
    }
    if (pn === '/complete' && method === 'POST') {
      const b = await parseBody(req);
      if (typeof b.name === 'string' && b.name.trim()) { progress.testerName = b.name.trim(); saveProgress(); }
      return redirect(res, '/certificate');
    }
    if (pn === '/certificate' && method === 'GET') {
      const sum = progressSummary();
      if (!sum.complete) return redirect(res, '/complete');
      const name = progress.testerName || (sess ? sess.name : 'Analyst');
      const date = progress.completedAt ? new Date(progress.completedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      return send(res, 200, '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ' + LAB_NUMBER + '</title><style>body{font-family:Georgia,serif;background:#eceaf4;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}.card{background:#fff;border:3px double #4f2fd6;border-radius:8px;padding:44px 54px;text-align:center;max-width:640px;box-shadow:0 10px 40px rgba(0,0,0,.15)}h1{color:#2b1a6e}@media print{body{background:#fff}}</style></head><body><div class="card">' +
        '<img src="/logo.png" alt="HexaCyberLab" style="height:64px"><h1>Certificate of Completion</h1>' +
        '<p>This certifies that</p><h2>' + esc(name) + '</h2>' +
        '<p>has completed 100% of the security tests in</p><h3>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h3>' +
        '<p>' + sum.total + ' tests across ' + FEATURES.length + ' features</p>' +
        '<p style="color:#666">' + date + '</p><p style="margin-top:26px"><b>HexaCyberLab</b> — Built by Md. Jony Hassain, Founder</p></div></body></html>');
    }

    return send(res, 404, layout(sess, 'Not found', '<div class="err">Page not found.</div>'));
  } catch (e) {
    try { send(res, 500, 'Server error'); } catch (e2) { /* socket gone */ }
  }
});

loadProgress();
server.listen(PORT, HOST, () => {
  console.log(LAB_NAME + ' running at http://' + HOST + ':' + PORT + '  (LOCAL ONLY — deliberately vulnerable lab)');
  console.log('Test accounts: admin@hexaanalytics.local/Admin@123, nadia@hexaanalytics.local/User@123, vera@hexaanalytics.local/User@123 (viewer), omar@hexaanalytics.local/User@123, demo@hexaanalytics.local/demo123');
});
