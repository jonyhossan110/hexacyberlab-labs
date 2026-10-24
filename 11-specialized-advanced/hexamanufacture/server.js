'use strict';
/* HexaManufacture — LAB 104 — HexaCyberLab vulnerable practice lab.
   A manufacturing ERP (production lines, work orders, inventory, quality
   checks, maintenance, suppliers) with INTENTIONAL vulnerabilities for
   authorised training. Zero-dependency Node.js. LOCAL USE ONLY. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB = { name: 'HexaManufacture', number: 104, port: 3113 };
const DIR = __dirname;
const STATE_FILE = path.join(DIR, 'progress.json');

// --- build constants (fragment set A) ---
const _eA = ['TC1YSA==', 'LTQwMQ==', 'TTM2Rw==', 'UUJUOA=='];

/* ---------------- seed data (all fake) ---------------- */
const users = [
  { id: 1, name: 'Ada Admin',       email: 'admin@hexamanufacture.local',    password: 'admin123',    role: 'admin',      active: true,  resetIssued: false },
  { id: 2, name: 'Manny Manager',   email: 'manager@hexamanufacture.local',  password: 'manager123',  role: 'manager',    active: true,  resetIssued: false },
  { id: 3, name: 'Quinn Quality',   email: 'qc@hexamanufacture.local',       password: 'qc123',       role: 'qc',         active: true,  resetIssued: false },
  { id: 4, name: 'Olivia Operator', email: 'operator@hexamanufacture.local', password: 'operator123', role: 'operator',   active: true,  resetIssued: false },
  { id: 5, name: 'Bob Builder',     email: 'bob@hexamanufacture.local',      password: 'bob123',      role: 'operator',   active: true,  resetIssued: false },
  { id: 6, name: 'Tom Technician',  email: 'tech@hexamanufacture.local',     password: 'tech123',     role: 'technician', active: true,  resetIssued: false },
];
let nextUserId = 7;

const workOrders = [
  { id: 101, owner: 4, line: 'Line A — Assembly',  product: 'Steel Bracket',         planned: 500,  produced: 120,  status: 'In Progress', internal: false },
  { id: 102, owner: 5, line: 'Line B — Packaging', product: 'Gear Housing',          planned: 200,  produced: 45,   status: 'In Progress', internal: false },
  { id: 103, owner: 2, line: 'Line C — Welding',   product: 'Prototype X Drive Unit', planned: 10,   produced: 2,    status: 'In Progress', internal: true },
  { id: 104, owner: 4, line: 'Line A — Assembly',  product: 'Mounting Plate',         planned: 1000, produced: 1000, status: 'Completed',   internal: false },
];

const inventory = [
  { id: 1, sku: 'RM-001', name: 'Steel Sheet',  stock: 1200, unit: 'sheets', cost: 4.20 },
  { id: 2, sku: 'RM-002', name: 'M6 Bolts',     stock: 5000, unit: 'pcs',    cost: 0.05 },
  { id: 3, sku: 'RM-003', name: 'Drive Motor',  stock: 40,   unit: 'pcs',    cost: 85.00 },
  { id: 4, sku: 'RM-004', name: 'Titanium Rod', stock: 15,   unit: 'pcs',    cost: 210.00 },
];

const purchaseOrders = [
  { id: 1, itemId: 3, qty: 20, unitPrice: 85.00, status: 'Open', by: 2 },
];
let nextPoId = 2;

const qualityChecks = [
  { id: 1, wo: 101, inspector: 4, result: 'Pending', note: 'First-article inspection — bracket dimensions' },
  { id: 2, wo: 102, inspector: 5, result: 'Fail',    note: 'Torque out of tolerance on gear housing' },
];

const maintenance = [
  { id: 1, machine: 'Press M-01', assignee: 6, status: 'Open', desc: 'Hydraulic leak — line A press', cost: 0 },
  { id: 2, machine: 'Lathe M-02', assignee: 6, status: 'Open', desc: 'Spindle vibration under load',   cost: 0 },
];

const suppliers = [
  { name: 'SteelCorp Ltd',     contact: 'sales@steelcorp.example',   terms: 'Net 30 — confidential framework pricing, do not share outside the plant' },
  { name: 'BoltWorks GmbH',    contact: 'orders@boltworks.example',  terms: 'Net 14 — volume rebate tier 3 (confidential)' },
  { name: 'MotorDynamics Inc', contact: 'supply@motordyn.example',   terms: 'Net 45 — confidential unit pricing agreed Q3' },
];

/* ---------------- TESTS registry ---------------- */
const FEATURES = ['Login & Authentication', 'Registration & Profile', 'Search & Catalogue', 'Work Orders', 'Inventory & Materials', 'Quality Control', 'Maintenance', 'Admin Panel', 'Platform & API'];
const TESTS = [
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03:2021 — Injection', difficulty: 'Beginner',
    hints: ['The login query is built by gluing your input straight into SQL text.', 'Try a quote character in the email field and watch how the query breaks.', "Use admin@hexamanufacture.local' OR '1'='1' -- as the email with any password."],
    lesson: 'String-built SQL queries let attackers rewrite the query logic and log in without a password.',
    impact: 'On a real factory system this hands an attacker the first foothold — often an admin session — without stealing any password.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements for all database access and validate input server-side.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'No Brute-Force Protection on Login', owasp: 'A07:2021 — Authentication Failures', difficulty: 'Beginner',
    hints: ['Nothing slows you down — no lockout, no delay, no CAPTCHA.', 'Script 10 wrong passwords for one account and watch what does NOT happen.', 'Submit at least 10 failed logins for operator@hexamanufacture.local; the 10th is still processed normally.'],
    lesson: 'Without throttling, online password guessing is free and unlimited.',
    impact: 'Attackers can guess weak staff passwords all day; one success can expose production schedules and supplier pricing.',
    report: { title: 'Missing Brute-Force Protection on Authentication Endpoint', severity: 'High', remediation: 'Add rate limiting, progressive delays and account lockout/alerting after repeated failures.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User Enumeration via Login & Forgot-Password Responses', owasp: 'A07:2021 — Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the error for an email that exists with one that does not.', 'The login and forgot-password forms answer differently for real accounts.', 'Probe at least 5 different emails across login/forgot and note which ones are confirmed as real.'],
    lesson: 'Different error messages for real vs fake accounts hand attackers a verified target list.',
    impact: 'Attackers confirm which staff emails are valid, then aim phishing and password attacks only at real accounts.',
    report: { title: 'Account Enumeration Through Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic response for all login and password-reset outcomes.' } },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Published Demo / Default Credentials', owasp: 'A07:2021 — Authentication Failures', difficulty: 'Beginner',
    hints: ['Read the login page carefully — it is more helpful than it should be.', 'Demo accounts are printed right on the login screen.', 'Sign in with the published admin demo credentials.'],
    lesson: 'Default and demo credentials left visible are the first thing attackers try.',
    impact: 'Anyone can try the printed admin password; if it works on the real system, the whole plant is exposed.',
    report: { title: 'Default/Demo Credentials Published and Active', severity: 'High', remediation: 'Remove demo accounts and published credentials; enforce unique strong passwords at setup.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07:2021 — Authentication Failures', difficulty: 'Intermediate',
    hints: ['Reset tokens here are not random — they are computed from something public.', 'Request a reset for one account and study the token pattern, then look at user IDs.', 'The token is HM followed by the user id, a dash, and id×137+42. Compute it for a user who never requested a reset and use it.'],
    lesson: 'Reset tokens must be unguessable random values; a formula based on the user ID is public knowledge.',
    impact: 'Anyone can reset the plant manager\u2019s password knowing only their user ID — full account takeover with no email access.',
    report: { title: 'Predictable Password Reset Token Enables Account Takeover', severity: 'Critical', remediation: 'Generate reset tokens with a CSPRNG, store only a hash, expire them quickly and make them single-use.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Role Cookie Tampering (Client-Side Role Trust)', owasp: 'A01:2021 — Broken Access Control', difficulty: 'Intermediate',
    hints: ['After login, inspect the cookies the app sets — one of them repeats your role.', 'The server trusts a cookie your browser can edit.', 'Set the hx_role cookie to admin and open /admin.'],
    lesson: 'Authorization data must live server-side; a role stored in a client cookie is just a suggestion attackers can rewrite.',
    impact: 'A floor operator can promote themselves to admin in seconds and reach user management and plant settings.',
    report: { title: 'Broken Access Control — Role Trusted From Client Cookie', severity: 'High', remediation: 'Derive roles only from the server-side session; never trust client-supplied role values.' } },

  { id: 'reg-weak', feature: 'Registration & Profile', name: 'Weak Password Policy (1-Character Passwords)', owasp: 'A07:2021 — Authentication Failures', difficulty: 'Beginner',
    hints: ['Try registering with the shortest password you can think of.', 'There is effectively no minimum length.', 'Register an account with a 1-character password.'],
    lesson: 'Password policy is a server-side control; without it users pick passwords that fall instantly.',
    impact: 'Staff accounts with trivial passwords are guessed in seconds, especially combined with no brute-force protection.',
    report: { title: 'Weak Password Policy on Registration', severity: 'Medium', remediation: 'Enforce a minimum length of 12+ characters and block common/breached passwords.' } },
  { id: 'reg-mass', feature: 'Registration & Profile', name: 'Mass Assignment — Self-Assign Admin Role at Registration', owasp: 'A01:2021 — Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration form only shows a few fields, but the server reads more from the POST body.', 'What happens if you add a field the form never offered?', 'POST /register with an extra role=admin field.'],
    lesson: 'Binding request bodies directly to user records lets attackers set privileged fields the UI never shows.',
    impact: 'Anyone can register themselves as an administrator — complete control of users, production data and pricing.',
    report: { title: 'Mass Assignment Allows Privilege Escalation at Registration', severity: 'Critical', remediation: 'Whitelist assignable fields server-side; never accept role or balance fields from clients.' } },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03:2021 — Injection', difficulty: 'Beginner',
    hints: ['Your display name is rendered on pages other people read — including the admin user list.', 'Names are printed without escaping.', 'Register or update your profile with a name containing a script payload.'],
    lesson: 'Any user-controlled text rendered unescaped becomes stored XSS that fires in other users\u2019 browsers.',
    impact: 'A malicious name can steal the session of the admin who opens the user list, compromising the whole system.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-encode all user output and apply a strict Content-Security-Policy.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 — Broken Access Control', difficulty: 'Intermediate',
    hints: ['The profile form performs no origin check at all.', 'The app\u2019s own forms carry a hidden hx_origin marker; a forged request would not.', 'Submit a profile update POST without the hx_origin marker — it is accepted.'],
    lesson: 'State-changing endpoints must verify the request really came from your own site (token or origin check).',
    impact: 'A booby-trapped page an employee visits can silently change their profile — a classic stepping stone to account misuse.',
    report: { title: 'Cross-Site Request Forgery on Profile Update', severity: 'Medium', remediation: 'Require a per-session CSRF token on all state-changing requests and set SameSite cookies.' } },

  { id: 'search-sqli', feature: 'Search & Catalogue', name: 'SQL Injection in Search Leaks Confidential Work Orders', owasp: 'A03:2021 — Injection', difficulty: 'Intermediate',
    hints: ['Search is glued into a SQL LIKE query, just like login.', 'A comment sequence can cut off the part of the query that hides internal records.', "Search for ' OR '1'='1' -- and see what confidential rows appear."],
    lesson: 'Every input that reaches a query is an injection surface — search boxes included.',
    impact: 'Confidential prototype production runs and internal orders leak to any user, exposing trade secrets to competitors.',
    report: { title: 'SQL Injection in Search Exposes Confidential Records', severity: 'High', remediation: 'Parameterise search queries and enforce record visibility in the data layer.' } },
  { id: 'search-xss', feature: 'Search & Catalogue', name: 'Reflected XSS in Search', owasp: 'A03:2021 — Injection', difficulty: 'Beginner',
    hints: ['The results page repeats your search text back to you.', 'It repeats it without escaping.', 'Search for a script payload and view the page source.'],
    lesson: 'Reflected input must be encoded; a search box that echoes raw HTML is an XSS delivery channel.',
    impact: 'Attackers send staff a crafted search link that runs script in their session — phishing and session theft follow.',
    report: { title: 'Reflected Cross-Site Scripting in Search Results', severity: 'Medium', remediation: 'Encode reflected values and validate input; add a Content-Security-Policy.' } },

  { id: 'wo-idor', feature: 'Work Orders', name: 'Work Order IDOR — View Another Operator\u2019s Work Order', owasp: 'A01:2021 — Broken Access Control', difficulty: 'Beginner',
    hints: ['Work order URLs carry a simple numeric ID.', 'Nothing checks that the order belongs to you.', 'Open a work order owned by another operator by changing the ID.'],
    lesson: 'Every object access must be checked against the caller\u2019s ownership or role — hiding links is not protection.',
    impact: 'Operators (or an attacker in one account) can read every production order, including quantities and schedules of other lines.',
    report: { title: 'Insecure Direct Object Reference on Work Order Details', severity: 'High', remediation: 'Enforce per-object authorization checks on every record access.' } },
  { id: 'wo-qty', feature: 'Work Orders', name: 'Work Order Quantity Tampering by Non-Owner', owasp: 'A01:2021 — Broken Access Control', difficulty: 'Intermediate',
    hints: ['The update endpoint trusts the numbers in the POST body.', 'It also forgets to ask whether the order is yours.', 'POST new planned/produced quantities to another operator\u2019s work order.'],
    lesson: 'Business numbers must be validated and authorized server-side; client-supplied quantities are fiction until checked.',
    impact: 'Production figures can be falsified — output overstated, scrap hidden, and planning/inventory decisions poisoned.',
    report: { title: 'Unauthorised Modification of Work Order Quantities', severity: 'High', remediation: 'Authorize updates per record and validate quantities against business rules server-side.' } },
  { id: 'wo-complete', feature: 'Work Orders', name: 'Work Order Completion Without Manager/QC Authority', owasp: 'A01:2021 — Broken Access Control', difficulty: 'Intermediate',
    hints: ['Completing an order should need authority — the endpoint never asks for it.', 'Any signed-in user can call the complete action.', 'As an operator, complete a work order that is still in progress.'],
    lesson: 'Workflow state transitions are authorization decisions; skipping them breaks quality gates.',
    impact: 'Unfinished or failed production can be marked complete, shipping bad product and falsifying delivery records.',
    report: { title: 'Missing Authorization on Work Order Completion', severity: 'High', remediation: 'Restrict completion to manager role and require a passed QC check first.' } },
  { id: 'wo-internal', feature: 'Work Orders', name: 'Confidential Internal Work Order Exposed by Direct URL', owasp: 'A01:2021 — Broken Access Control', difficulty: 'Beginner',
    hints: ['One work order never appears in any list — but its ID still works.', 'Internal records are only hidden, not protected.', 'Guess the ID after the visible orders and open the internal prototype order directly.'],
    lesson: 'Unlisted is not the same as unauthorized — direct object access must be denied, not just unlinked.',
    impact: 'The secret prototype run — product, quantities, schedule — is readable by any account, a direct trade-secret leak.',
    report: { title: 'Confidential Work Order Accessible by Direct URL (IDOR)', severity: 'High', remediation: 'Apply the same visibility/authorization checks to direct access as to listings.' } },

  { id: 'inv-adjust', feature: 'Inventory & Materials', name: 'Stock Adjustment by Non-Manager (Broken Access Control)', owasp: 'A01:2021 — Broken Access Control', difficulty: 'Intermediate',
    hints: ['Adjusting stock levels is supposed to be a manager job.', 'The adjust endpoint never checks your role.', 'As an operator, POST a stock adjustment to any material.'],
    lesson: 'Sensitive mutations need server-side role checks on the endpoint itself, not just a hidden button.',
    impact: 'Anyone can inflate or erase stock records — theft becomes invisible and production planning collapses.',
    report: { title: 'Missing Role Check on Inventory Adjustment', severity: 'High', remediation: 'Enforce manager-only authorization on stock adjustments and log all changes.' } },
  { id: 'inv-negative', feature: 'Inventory & Materials', name: 'Material Issue Drives Stock Negative (Missing Validation)', owasp: 'A04:2021 — Insecure Design', difficulty: 'Intermediate',
    hints: ['Issuing material only checks that you asked — not that it exists.', 'Ask for more than the shelf holds.', 'Issue more units of a material than are in stock and watch the stock go below zero.'],
    lesson: 'Quantities must be validated against server-side truth; negative stock means the invariant was never enforced.',
    impact: 'The ERP reports phantom inventory; lines stop mid-run and emergency purchases follow — real money lost to a data bug.',
    report: { title: 'Insufficient Validation Allows Negative Inventory', severity: 'Medium', remediation: 'Validate issue quantities against current stock in a transaction and reject over-issues.' } },
  { id: 'inv-po', feature: 'Inventory & Materials', name: 'Purchase Order Price Tampering', owasp: 'A04:2021 — Insecure Design', difficulty: 'Intermediate',
    hints: ['The PO form lets the browser state the unit price.', 'The server believes the browser.', 'Create a purchase order with a unit price far below the catalogue cost.'],
    lesson: 'Prices must come from server-side catalogue data; a client-supplied price is an offer, not a fact.',
    impact: 'Staff or attackers can order materials at invented prices — direct financial loss and corrupted accounting.',
    report: { title: 'Client-Side Price Tampering on Purchase Orders', severity: 'High', remediation: 'Compute prices server-side from the item catalogue; ignore client-supplied prices.' } },

  { id: 'qc-self', feature: 'Quality Control', name: 'QC Self-Approval (Inspector Approves Own Check)', owasp: 'A01:2021 — Broken Access Control', difficulty: 'Intermediate',
    hints: ['A QC check should be approved by someone other than its inspector.', 'The approve endpoint never compares the two people.', 'Approve the quality check that you inspected yourself.'],
    lesson: 'Separation of duties is a security control: creators must never approve their own work.',
    impact: 'Failed production can be waved through by the person who made it — defective goods ship under a forged quality stamp.',
    report: { title: 'Missing Separation of Duties — QC Self-Approval', severity: 'High', remediation: 'Require a different QC-role user to approve checks and enforce it server-side.' } },
  { id: 'qc-tamper', feature: 'Quality Control', name: 'QC Result Tampering — Fail Changed to Pass by Operator', owasp: 'A01:2021 — Broken Access Control', difficulty: 'Intermediate',
    hints: ['The result endpoint trusts whoever calls it.', 'A failed check is one POST away from passing.', 'As an operator, set the failed QC check\u2019s result to Pass.'],
    lesson: 'Quality results are records of truth; write access must be limited to the QC role.',
    impact: 'Known-bad batches get a passing record — product recalls, liability and customer harm become a matter of time.',
    report: { title: 'Unauthorised Modification of Quality Check Results', severity: 'Critical', remediation: 'Restrict result changes to the QC role and keep an immutable audit history.' } },

  { id: 'maint-close', feature: 'Maintenance', name: 'Close Another Technician\u2019s Maintenance Ticket', owasp: 'A01:2021 — Broken Access Control', difficulty: 'Beginner',
    hints: ['Tickets belong to an assigned technician — the close action does not check.', 'Anyone signed in can close any ticket.', 'Close a maintenance ticket assigned to another technician.'],
    lesson: 'Ownership checks apply to actions, not just views; closing work you do not own breaks accountability.',
    impact: 'Safety maintenance can be silently marked done while the machine was never touched — an accident and audit risk.',
    report: { title: 'Missing Ownership Check on Maintenance Ticket Closure', severity: 'Medium', remediation: 'Allow closure only by the assignee or a manager, and log who closed each ticket.' } },

  { id: 'admin-panel', feature: 'Admin Panel', name: 'Admin User List (With Passwords) Open to Any User', owasp: 'A01:2021 — Broken Access Control', difficulty: 'Beginner',
    hints: ['Some admin URLs were never actually protected.', 'Try the user-management page as a plain operator.', 'Open /admin/users while signed in as a non-admin.'],
    lesson: 'Admin endpoints must verify role on the server for every request — obscurity is not a control.',
    impact: 'Every staff password is exposed to any account — instant full compromise of the entire ERP.',
    report: { title: 'Broken Access Control Exposes User List With Passwords', severity: 'Critical', remediation: 'Enforce admin-role checks on all admin endpoints and never render stored passwords.' } },
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'CSRF on Admin User Deactivation', owasp: 'A01:2021 — Broken Access Control', difficulty: 'Intermediate',
    hints: ['The deactivation action changes state with no token or origin check.', 'The real admin form carries a marker a forged request lacks.', 'POST to the deactivate endpoint without the hx_origin marker.'],
    lesson: 'Privileged actions need CSRF tokens most of all — they are the highest-value forged requests.',
    impact: 'A malicious page visited by the admin can deactivate accounts, locking staff out of the plant system.',
    report: { title: 'Cross-Site Request Forgery on User Deactivation', severity: 'Medium', remediation: 'Require CSRF tokens on all admin actions and re-check authorization server-side.' } },

  { id: 'plat-debug', feature: 'Platform & API', name: 'Unauthenticated Debug Endpoint Dumps All Data', owasp: 'A05:2021 — Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Developers leave souvenirs in production.', 'This one needs no login at all.', 'Fetch /api/debug with no session.'],
    lesson: 'Debug endpoints must never ship to production; if they exist, they are unauthenticated data breaches waiting to be found.',
    impact: 'The entire user table — passwords included — plus production data is downloadable by anyone who guesses one URL.',
    report: { title: 'Sensitive Data Exposure via Unauthenticated Debug Endpoint', severity: 'Critical', remediation: 'Remove debug endpoints from production builds and require auth + role checks on diagnostics.' } },
  { id: 'plat-apitoken', feature: 'Platform & API', name: 'API Token Is Just Base64 of the User\u2019s Email', owasp: 'A07:2021 — Authentication Failures', difficulty: 'Intermediate',
    hints: ['The API accepts a token header instead of a session.', 'The token looks like harmless base64 — decode the idea, not just the string.', 'Call /api/workorders with X-Api-Token set to the base64 of another user\u2019s email, with no session.'],
    lesson: 'A token that anyone can compute from public data (an email address) is not authentication.',
    impact: 'Knowing any staff email — printed on every quote — grants full API access to their production data with no password.',
    report: { title: 'Weak API Authentication — Token Derived From Email', severity: 'High', remediation: 'Issue random, server-stored API tokens per user and verify them server-side on every call.' } },
];
const TEST_BY_ID = Object.fromEntries(TESTS.map(t => [t.id, t]));

// --- build constants (fragment set B) ---
const _eB = ['Q1gt', 'V1dW', 'NU9V'];

/* ---------------- progress engine + persistence ---------------- */
function defaultState() {
  return { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false, _probes: [], _fails: {} };
}
let state = defaultState();
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      state = Object.assign(defaultState(), raw);
    } else { saveState(); }
  } catch (e) { state = defaultState(); }
}
function saveState() {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2)); } catch (e) { /* keep serving */ }
}
function doneCount() { return TESTS.filter(t => state.tests[t.id]).length; }
function isComplete() { return doneCount() === TESTS.length; }
function pass(id) {
  if (!TEST_BY_ID[id] || state.tests[id]) return;
  state.tests[id] = true;
  if (isComplete() && !state.completedAt) { state.completedAt = new Date().toISOString(); state.keyRevealed = true; }
  saveState();
}
function attempt(feature) { state.attempts[feature] = (state.attempts[feature] || 0) + 1; saveState(); }
function featureStats() {
  const out = {};
  for (const f of FEATURES) {
    const list = TESTS.filter(t => t.feature === f);
    out[f] = { total: list.length, done: list.filter(t => state.tests[t.id]).length, attempts: state.attempts[f] || 0 };
  }
  return out;
}

/* ---------------- small helpers ---------------- */
const sessions = new Map(); // sid -> userId
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) { const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); }
  return out;
}
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) { try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); } }
      else {
        const out = {};
        for (const pair of data.split('&')) { if (!pair) continue; const i = pair.indexOf('='); const k = decodeURIComponent(pair.slice(0, i).replace(/\+/g, ' ')); const v = decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' ')); out[k] = v; }
        resolve(out);
      }
    });
    req.on('error', () => resolve({}));
  });
}
const XSS_RE = /<script|onerror\s*=|onload\s*=|<svg|<img[^>]*onerror|<iframe/i;
function userById(id) { return users.find(u => u.id === Number(id)); }
function currentUser(req) {
  const c = parseCookies(req);
  const uid = sessions.get(c.hx_session);
  return uid ? userById(uid) : null;
}

/* -------- tiny string-built-SQL evaluator (the planted flaw, faithfully simulated) -------- */
function evalTerm(term, row) {
  const m = term.trim().match(/^(.+?)\s*(=|LIKE)\s*'([^']*)'$/i);
  if (!m) return false;
  let lhs = m[1].trim(); const op = m[2].toUpperCase(); const rhs = m[3];
  let lv;
  if (lhs.startsWith("'") && lhs.endsWith("'")) lv = lhs.slice(1, -1);
  else lv = String(row[lhs] == null ? '' : row[lhs]);
  if (op === 'LIKE') {
    const re = new RegExp('^' + rhs.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$', 'i');
    return re.test(lv);
  }
  return lv === rhs;
}
function evalWhere(where, row) {
  const clean = where.split('--')[0];
  return clean.split(/\s+OR\s+/i).some(orTerm => orTerm.split(/\s+AND\s+/i).every(t => evalTerm(t, row)));
}
function runQuery(sql, rows) {
  const w = sql.split(/WHERE\s+/i)[1] || '';
  return rows.filter(r => evalWhere(w, r));
}

// --- release constants (fragment set C) ---
const _cA = ['TC1YSA==', 'LTUwMQ==', 'MlA1NQ==', 'VVFZRg=='];

/* ---------------- page rendering ---------------- */
const CSS = `
body{font-family:Segoe UI,Arial,sans-serif;background:#10151d;color:#e8edf4;margin:0}
a{color:#7cc4ff} header{background:#171f2b;border-bottom:3px solid #f59e0b;padding:10px 18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
header img{height:38px} header .brand{font-weight:700;font-size:18px}
.bar{background:#2a3547;height:12px;border-radius:6px;min-width:180px;flex:1;max-width:420px;overflow:hidden}
.bar i{display:block;height:100%;background:linear-gradient(90deg,#3b82f6,#8b5cf6)}
main{max-width:980px;margin:22px auto;padding:0 16px}
.card{background:#171f2b;border:1px solid #2a3547;border-radius:10px;padding:16px 18px;margin:14px 0}
table{width:100%;border-collapse:collapse} th,td{border-bottom:1px solid #2a3547;padding:7px 8px;text-align:left;font-size:14px}
input,select{padding:7px 9px;border-radius:6px;border:1px solid #3a4a61;background:#0d1219;color:#e8edf4;margin:3px 0}
button,.btn{background:#f59e0b;color:#111;border:0;padding:8px 14px;border-radius:6px;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block}
.msg{background:#3b2f12;border:1px solid #f59e0b;padding:9px 12px;border-radius:8px;margin:10px 0}
.err{background:#3d1620;border:1px solid #ef4444;padding:9px 12px;border-radius:8px;margin:10px 0}
.ok{background:#14301d;border:1px solid #22c55e;padding:9px 12px;border-radius:8px;margin:10px 0}
nav a{margin-right:12px;font-size:14px}
details{background:#0d1219;border:1px solid #2a3547;border-radius:6px;padding:6px 10px;margin:5px 0}
summary{cursor:pointer;color:#fbbf24}
#chatbtn{position:fixed;right:18px;bottom:18px;background:#f59e0b;color:#111;border-radius:24px;padding:11px 16px;font-weight:700;cursor:pointer;z-index:50;box-shadow:0 4px 14px rgba(0,0,0,.5)}
#chatbox{position:fixed;right:18px;bottom:66px;width:330px;max-width:92vw;background:#171f2b;border:1px solid #3a4a61;border-radius:10px;z-index:50;display:none;flex-direction:column}
#chatlog{height:260px;overflow:auto;padding:10px;font-size:13px}
#chatlog div{margin:6px 0}
#chatbox form{display:flex;border-top:1px solid #2a3547}
#chatbox input{flex:1;border:0;background:#0d1219;color:#e8edf4;padding:9px}
.cert{border:3px solid #f59e0b;text-align:center;padding:34px;background:#171f2b;border-radius:12px}
@media print{#chatbtn,#chatbox,header nav{display:none}}
`;
const CHAT_JS = `
<div id="chatbtn" onclick="var b=document.getElementById('chatbox');b.style.display=b.style.display==='flex'?'none':'flex'">💬 Lab Coach</div>
<div id="chatbox"><div id="chatlog"><div><b>Coach:</b> Hi! I am the HexaManufacture Lab Coach. Ask me how many tests a feature has, or how to solve one — but I only coach a feature after you have tried it at least 3 times yourself.</div></div>
<form onsubmit="event.preventDefault();var i=document.getElementById('chatin');var m=i.value;i.value='';fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})}).then(r=>r.json()).then(d=>{var l=document.getElementById('chatlog');l.innerHTML+='<div><b>You:</b> '+m.replace(/</g,'&lt;')+'</div><div><b>Coach:</b> '+d.reply+'</div>';l.scrollTop=l.scrollHeight;});"><input id="chatin" placeholder="Ask the coach…" autocomplete="off"><button type="submit">Send</button></form></div>`;

function headerHTML(user) {
  const done = doneCount(); const pct = Math.floor(done / TESTS.length * 100);
  return `<header><img src="/logo.png" alt="HexaCyberLab"><span class="brand">LAB ${LAB.number} — ${LAB.name}</span>
  <div class="bar"><i style="width:${pct}%"></i></div><span>LAB ${LAB.number} · ${done}/${TESTS.length} tests · ${pct}%</span>
  ${user ? `<nav><a href="/">Dashboard</a><a href="/workorders">Work Orders</a><a href="/inventory">Inventory</a><a href="/quality">Quality</a><a href="/maintenance">Maintenance</a><a href="/suppliers">Suppliers</a><a href="/profile">Profile</a><a href="/tests">Missions</a><a href="/complete">Complete</a><a href="/logout">Logout (${esc(user.email)})</a></nav>` : `<nav><a href="/tests">Missions</a><a href="/complete">Complete</a></nav>`}
  </header>`;
}
function page(user, title, body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)} — LAB ${LAB.number} ${LAB.name}</title><style>${CSS}</style></head><body>${headerHTML(user)}<main>${body}</main>${CHAT_JS}</body></html>`;
}
function gatePage() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Locked — LAB ${LAB.number} ${LAB.name}</title><style>${CSS}</style></head><body><main>
  <div class="card" style="text-align:center"><img src="/logo.png" style="height:64px"><h1>LAB ${LAB.number} — ${LAB.name}</h1>
  <p>This lab is locked. Paste the completion key from Lab ${LAB.number - 1} to start.</p>
  <form method="POST" action="/unlock"><input name="key" placeholder="Completion key from Lab ${LAB.number - 1}" size="34" autocomplete="off"> <button type="submit">Unlock</button></form>
  </div></main>${CHAT_JS}</body></html>`;
}

function loginPage(msg, err) {
  return page(null, 'Login', `<div class="card"><h2>🏭 HexaManufacture ERP — Staff Login</h2>
  ${err ? `<div class="err">${esc(err)}</div>` : ''}${msg ? `<div class="msg">${esc(msg)}</div>` : ''}
  <form method="POST" action="/login"><label>Email</label><br><input name="email" size="36"><br><label>Password</label><br><input name="password" type="password" size="36"><br><button type="submit">Sign in</button></form>
  <p><a href="/forgot">Forgot password?</a> · <a href="/register">Register a staff account</a></p>
  <div class="msg"><b>Demo accounts (training plant):</b><br>admin@hexamanufacture.local / admin123<br>operator@hexamanufacture.local / operator123</div></div>`);
}
function registerPage(err) {
  return page(null, 'Register', `<div class="card"><h2>Register a staff account</h2>${err ? `<div class="err">${esc(err)}</div>` : ''}
  <form method="POST" action="/register"><label>Display name</label><br><input name="name" size="36"><br><label>Email</label><br><input name="email" size="36"><br><label>Password</label><br><input name="password" type="password" size="36"><br><button type="submit">Register</button></form></div>`);
}
function forgotPage(msg) {
  return page(null, 'Forgot password', `<div class="card"><h2>Forgot password</h2>${msg ? `<div class="msg">${esc(msg)}</div>` : ''}
  <form method="POST" action="/forgot"><label>Email</label><br><input name="email" size="36"><br><button type="submit">Send reset token</button></form>
  <form method="POST" action="/reset"><h3>Use a reset token</h3><label>Email</label><br><input name="email" size="36"><br><label>Token</label><br><input name="token" size="36"><br><label>New password</label><br><input name="newpassword" type="password" size="36"><br><button type="submit">Reset password</button></form></div>`);
}

function dashboardPage(user) {
  const mine = workOrders.filter(w => w.owner === user.id && !w.internal);
  const low = inventory.filter(i => i.stock < 100);
  return page(user, 'Dashboard', `<div class="card"><h2>Welcome, ${user.name}</h2>
  <p>Role: <b>${esc(user.role)}</b> · Plant status: <b>Running</b></p>
  <h3>My work orders</h3><table><tr><th>ID</th><th>Product</th><th>Line</th><th>Progress</th><th>Status</th></tr>
  ${mine.map(w => `<tr><td><a href="/workorder/${w.id}">WO-${w.id}</a></td><td>${esc(w.product)}</td><td>${esc(w.line)}</td><td>${w.produced}/${w.planned}</td><td>${esc(w.status)}</td></tr>`).join('') || '<tr><td colspan="5">None assigned</td></tr>'}</table>
  <h3>Low stock alerts</h3><p>${low.map(i => `${esc(i.name)}: ${i.stock} ${esc(i.unit)}`).join(' · ') || 'None'}</p></div>`);
}
function workOrdersPage(user) {
  const list = workOrders.filter(w => !w.internal);
  return page(user, 'Work Orders', `<div class="card"><h2>Production Work Orders</h2>
  <form method="GET" action="/search"><input name="q" placeholder="Search work orders & materials…" size="34"> <button>Search</button></form>
  <table><tr><th>ID</th><th>Product</th><th>Line</th><th>Owner</th><th>Progress</th><th>Status</th></tr>
  ${list.map(w => { const o = userById(w.owner); return `<tr><td><a href="/workorder/${w.id}">WO-${w.id}</a></td><td>${esc(w.product)}</td><td>${esc(w.line)}</td><td>${o ? esc(o.name) : '?'}</td><td>${w.produced}/${w.planned}</td><td>${esc(w.status)}</td></tr>`; }).join('')}</table></div>`);
}
function workOrderDetail(user, w) {
  const o = userById(w.owner);
  return page(user, 'Work Order ' + w.id, `<div class="card"><h2>WO-${w.id} — ${esc(w.product)} ${w.internal ? '🔒 INTERNAL' : ''}</h2>
  <p>Line: ${esc(w.line)} · Owner: ${o ? o.name : '?'} · Status: <b>${esc(w.status)}</b></p>
  <p>Planned quantity: <b>${w.planned}</b> · Produced: <b>${w.produced}</b></p>
  <h3>Update quantities (line terminal)</h3>
  <form method="POST" action="/workorder/${w.id}/update"><input type="hidden" name="hx_origin" value="1">
  Planned <input name="planned" type="number" value="${w.planned}"> Produced <input name="produced" type="number" value="${w.produced}"> <button>Save</button></form>
  <h3>Complete work order</h3>
  <form method="POST" action="/workorder/${w.id}/complete"><input type="hidden" name="hx_origin" value="1"><button>Mark COMPLETE</button></form></div>`);
}
function inventoryPage(user, msg) {
  return page(user, 'Inventory', `<div class="card"><h2>Raw Materials Inventory</h2>${msg ? `<div class="ok">${esc(msg)}</div>` : ''}
  <table><tr><th>SKU</th><th>Material</th><th>Stock</th><th>Unit cost</th><th>Adjust stock (manager)</th><th>Issue to production</th></tr>
  ${inventory.map(i => `<tr><td>${esc(i.sku)}</td><td>${esc(i.name)}</td><td><b>${i.stock}</b> ${esc(i.unit)}</td><td>$${i.cost.toFixed(2)}</td>
  <td><form method="POST" action="/inventory/${i.id}/adjust"><input type="hidden" name="hx_origin" value="1"><input name="delta" type="number" value="0" size="5"> <button>Adjust</button></form></td>
  <td><form method="POST" action="/inventory/${i.id}/issue"><input type="hidden" name="hx_origin" value="1"><input name="qty" type="number" value="1" size="5"> <button>Issue</button></form></td></tr>`).join('')}</table>
  <h3>Purchase orders</h3>
  <table><tr><th>PO</th><th>Material</th><th>Qty</th><th>Unit price</th><th>Total</th><th>Status</th></tr>
  ${purchaseOrders.map(p => { const it = inventory.find(x => x.id === p.itemId); return `<tr><td>PO-${p.id}</td><td>${it ? esc(it.name) : '?'}</td><td>${p.qty}</td><td>$${Number(p.unitPrice).toFixed(2)}</td><td>$${(p.qty * p.unitPrice).toFixed(2)}</td><td>${esc(p.status)}</td></tr>`; }).join('')}</table>
  <h4>New purchase order</h4>
  <form method="POST" action="/purchaseorders"><input type="hidden" name="hx_origin" value="1">
  <select name="itemId">${inventory.map(i => `<option value="${i.id}">${esc(i.name)} (catalogue $${i.cost.toFixed(2)})</option>`).join('')}</select>
  Qty <input name="qty" type="number" value="10"> Unit price <input name="unitPrice" type="number" step="0.01" value="${inventory[0].cost}"> <button>Create PO</button></form></div>`);
}
function qualityPage(user) {
  return page(user, 'Quality Control', `<div class="card"><h2>Quality Checks</h2>
  <table><tr><th>Check</th><th>Work order</th><th>Inspector</th><th>Result</th><th>Note</th><th>Approve (QC)</th><th>Set result (QC)</th></tr>
  ${qualityChecks.map(q => { const ins = userById(q.inspector); return `<tr><td>QC-${q.id}</td><td>WO-${q.wo}</td><td>${ins ? esc(ins.name) : '?'}</td><td><b>${esc(q.result)}</b></td><td>${esc(q.note)}</td>
  <td><form method="POST" action="/quality/${q.id}/approve"><input type="hidden" name="hx_origin" value="1"><button>Approve</button></form></td>
  <td><form method="POST" action="/quality/${q.id}/result"><input type="hidden" name="hx_origin" value="1"><select name="result"><option>Pass</option><option>Fail</option></select> <button>Set</button></form></td></tr>`; }).join('')}</table></div>`);
}
function maintenancePage(user) {
  return page(user, 'Maintenance', `<div class="card"><h2>Maintenance Tickets</h2>
  <table><tr><th>Ticket</th><th>Machine</th><th>Assigned to</th><th>Description</th><th>Status</th><th>Cost</th><th>Close ticket</th></tr>
  ${maintenance.map(t => { const a = userById(t.assignee); return `<tr><td>MT-${t.id}</td><td>${esc(t.machine)}</td><td>${a ? esc(a.name) : '?'}</td><td>${esc(t.desc)}</td><td>${esc(t.status)}</td><td>$${Number(t.cost).toFixed(2)}</td>
  <td><form method="POST" action="/maintenance/${t.id}/close"><input type="hidden" name="hx_origin" value="1">Cost <input name="cost" type="number" value="0" size="5"> <button>Close</button></form></td></tr>`; }).join('')}</table></div>`);
}
function suppliersPage(user) {
  return page(user, 'Suppliers', `<div class="card"><h2>Suppliers</h2>
  ${suppliers.map(s => `<p><b>${esc(s.name)}</b> — ${esc(s.contact)}<br><small>${esc(s.terms)}</small></p>`).join('')}</div>`);
}
function profilePage(user, msg) {
  return page(user, 'Profile', `<div class="card"><h2>My profile</h2>${msg ? `<div class="ok">${esc(msg)}</div>` : ''}
  <p>Email: ${esc(user.email)} · Role: <b>${esc(user.role)}</b> · Active: ${user.active}</p>
  <form method="POST" action="/profile/update"><input type="hidden" name="hx_origin" value="1">
  <label>Display name</label><br><input name="name" value="${esc(user.name)}" size="36"><br>
  <label>Email</label><br><input name="email" value="${esc(user.email)}" size="36"><br><button>Save profile</button></form></div>`);
}
function adminPage(user) {
  return page(user, 'Admin Console', `<div class="card"><h2>Plant Admin Console</h2>
  <p><a href="/admin/users">User management (full list)</a></p>
  <h3>Deactivate a user</h3>
  <form method="POST" action="/admin/deactivate"><input type="hidden" name="hx_origin" value="1">
  <select name="userId">${users.map(u => `<option value="${u.id}">${esc(u.name)} (${esc(u.role)})</option>`).join('')}</select> <button>Deactivate</button></form></div>`);
}
function adminUsersPage(user) {
  return page(user, 'User Management', `<div class="card"><h2>All staff accounts</h2>
  <table><tr><th>ID</th><th>Name</th><th>Email</th><th>Password</th><th>Role</th><th>Active</th></tr>
  ${users.map(u => `<tr><td>${u.id}</td><td>${u.name}</td><td>${esc(u.email)}</td><td>${esc(u.password)}</td><td>${esc(u.role)}</td><td>${u.active}</td></tr>`).join('')}</table></div>`);
}
function testsPage(user) {
  const st = featureStats();
  let h = `<div class="card"><h2>🎯 Mission Board — LAB ${LAB.number} ${LAB.name}</h2><p>${doneCount()}/${TESTS.length} tests complete. Tests flip only when the real exploit succeeds server-side. Hints unlock one at a time.</p></div>`;
  for (const f of FEATURES) {
    h += `<div class="card"><h3>${esc(f)} — ${st[f].done}/${st[f].total} done · ${st[f].attempts} attempt(s) on this feature</h3>`;
    for (const t of TESTS.filter(x => x.feature === f)) {
      const done = !!state.tests[t.id];
      h += `<p>${done ? '✅' : '⬜'} <b>${esc(t.name)}</b> <small>(${esc(t.owasp)} · ${esc(t.difficulty)})</small></p>
      <details><summary>Hint 1</summary><p>${esc(t.hints[0])}</p><details><summary>Hint 2</summary><p>${esc(t.hints[1])}</p><details><summary>Hint 3</summary><p>${esc(t.hints[2])}</p></details></details></details>`;
    }
    h += `</div>`;
  }
  return page(user, 'Missions', h);
}

// --- release constants (fragment set D) ---
const _cB = ['Vk8t', 'U0VB', 'WEcz'];
const _asm = parts => parts.map(x => Buffer.from(x, 'base64').toString('utf8').split('').reverse().join('')).join('');
// entry key assembled ONLY inside /unlock verification:
function entryKey() { return _asm(_eA.concat(_eB)); }
// completion key assembled ONLY in completion contexts (100%):
function completionKey() { return _asm(_cA.concat(_cB)); }

function completePage(user) {
  if (!isComplete()) {
    const open = TESTS.filter(t => !state.tests[t.id]);
    return page(user, 'Complete', `<div class="card"><h2>Completion — ${doneCount()}/${TESTS.length} tests (${Math.floor(doneCount() / TESTS.length * 100)}%)</h2>
    <p>The completion summary, your completion key and your certificate unlock at 100%. Still open:</p>
    <ul>${open.map(t => `<li>${esc(t.name)} <small>(${esc(t.feature)})</small></li>`).join('')}</ul>
    <p>Track everything on the <a href="/tests">Mission Board</a>.</p></div>`);
  }
  const st = featureStats();
  return page(user, 'Complete', `<div class="card"><h2>🏆 LAB ${LAB.number} — ${LAB.name}: 100% Complete!</h2>
  <h3>1) Total features in this lab</h3><p>${FEATURES.length} features: ${FEATURES.map(esc).join(' · ')}</p>
  <h3>2) Vulnerabilities per feature</h3><table><tr><th>Feature</th><th>Tests</th></tr>${FEATURES.map(f => `<tr><td>${esc(f)}</td><td>${st[f].total}</td></tr>`).join('')}</table>
  <h3>3) How testing was done — ${TESTS.length} techniques</h3><ul>${TESTS.map(t => `<li>${esc(t.name)}</li>`).join('')}</ul>
  <h3>4) What you learned</h3><ul>${TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('')}</ul>
  <h3>5) What this means for a real client</h3><ul>${TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('')}</ul>
  <h3>6) Writing it in a real report</h3><table><tr><th>Finding</th><th>Severity</th><th>Remediation</th></tr>${TESTS.map(t => `<tr><td>${esc(t.report.title)}</td><td>${esc(t.report.severity)}</td><td>${esc(t.report.remediation)}</td></tr>`).join('')}</table>
  <div class="ok"><h3>🔑 Your completion key (unlocks Lab ${LAB.number + 1})</h3><p style="font-size:20px"><b>${esc(completionKey())}</b></p></div>
  <h3>Your certificate</h3>
  <form method="POST" action="/complete/name"><label>Your name for the certificate</label><br><input name="name" value="${esc(state.testerName)}" size="36"> <button>Save name</button></form>
  <p><a class="btn" href="/certificate">View certificate</a></p></div>`);
}
function certificatePage(user) {
  if (!isComplete()) return page(user, 'Certificate', `<div class="card"><h2>Certificate locked</h2><p>Complete 100% of the tests to earn your certificate. Current progress: ${doneCount()}/${TESTS.length}.</p></div>`);
  const date = state.completedAt ? new Date(state.completedAt).toISOString().slice(0, 10) : '';
  const name = state.testerName || 'Valued Tester';
  return page(user, 'Certificate', `<div class="cert"><img src="/logo.png" style="height:70px">
  <h1>Certificate of Completion</h1><p>This certifies that</p><h2>${esc(name)}</h2>
  <p>has completed 100% of the security tests in <b>LAB ${LAB.number} — ${LAB.name}</b><br>(${TESTS.length} tests across ${FEATURES.length} features)</p>
  <p>Completed on ${esc(date)}</p><p><b>HexaCyberLab — Built by Md. Jony Hassain, Founder</b></p></div>
  <p style="text-align:center"><small>Use your browser\u2019s Print function to save this card as a PDF.</small></p>`);
}

/* ---------------- Lab Coach (rule-based, in-lab, zero external calls) ---------------- */
const FEATURE_KEYS = [
  ['Work Orders', ['work order', 'workorder']],
  ['Quality Control', ['quality', 'qc ', 'qc)', 'inspection']],
  ['Inventory & Materials', ['inventory', 'material', 'purchase', 'stock', 'supplier']],
  ['Maintenance', ['maintenance', 'ticket', 'machine']],
  ['Admin Panel', ['admin']],
  ['Platform & API', ['api', 'debug', 'platform']],
  ['Login & Authentication', ['login', 'auth', 'password', 'brute', 'enumerat', 'reset', 'cookie', 'forgot']],
  ['Registration & Profile', ['register', 'registration', 'profile', 'sign up', 'signup', 'mass assignment', 'csrf']],
  ['Search & Catalogue', ['search']],
];
function coachReply(raw) {
  const m = ' ' + String(raw || '').toLowerCase() + ' ';
  const done = doneCount(); const pct = Math.floor(done / TESTS.length * 100);
  if (/who (built|made|created|developed)|founder|jony/.test(m)) {
    return 'These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for \'Who is Md. Jony Hassain\', or ask ChatGPT.';
  }
  if (/\bkey\b/.test(m)) {
    if (isComplete()) return `You completed LAB ${LAB.number} at 100% — congratulations! Your completion key (it unlocks Lab ${LAB.number + 1}) is: ${completionKey()}`;
    return `I don't have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at ${pct}% (${done}/${TESTS.length} tests). Finish every test and ask me again.`;
  }
  let feature = null;
  for (const [f, keys] of FEATURE_KEYS) { if (keys.some(k => m.includes(k))) { feature = f; break; } }
  if (feature) {
    const list = TESTS.filter(t => t.feature === feature);
    const open = list.filter(t => !state.tests[t.id]);
    const st = featureStats()[feature];
    if (/how many|which|list|count|what tests|vulnerabilit|names/.test(m)) {
      return `${feature} has ${list.length} tests: ${list.map(t => t.name + (state.tests[t.id] ? ' (done)' : '')).join('; ')}. ${st.done}/${list.length} complete.`;
    }
    if (/how|help|solve|guide|step|hint|exploit|do it|bypass/.test(m)) {
      if (!open.length) return `Every test in ${feature} is already complete — nice work. Pick another feature and I will coach you through it once you have tried it 3 times.`;
      const n = state.attempts[feature] || 0;
      if (n >= 3) {
        return `Step by step for ${feature}:\n` + open.map(t => `• ${t.name}: ${t.hints[2]}`).join('\n');
      }
      return `That feature is locked for help. First try the ${feature} tests yourself at least 3 times — I can see you've tried ${n} time(s) so far. After 3 real tries, ask me again and I'll guide you step by step.`;
    }
    return `${feature}: ${st.done}/${list.length} tests done, ${st.attempts} attempt(s) so far. Tests: ${list.map(t => t.name).join('; ')}.`;
  }
  if (/progress|how am i|status|next/.test(m) || /^( hi | hello | hey )/.test(m)) {
    const next = TESTS.find(t => !state.tests[t.id]);
    return `This lab has ${TESTS.length} tests across ${FEATURES.length} features. You have completed ${done}/${TESTS.length} (${pct}%).` + (next ? ` Next up: "${next.name}" in ${next.feature}. Open the Mission Board at /tests, try the feature at least 3 times, then ask me how to solve it.` : ' Everything is complete — see /complete for your key and certificate!');
  }
  return `I can tell you the map (feature names, test names and counts) freely, and I coach you step by step on any feature you have genuinely tried at least 3 times. See the Mission Board at /tests for hints. Current progress: ${done}/${TESTS.length} tests (${pct}%).`;
}

/* ---------------- docs generation (from the registry — counts cannot drift) ---------------- */
function genDocs() {
  const byF = f => TESTS.filter(t => t.feature === f);
  let vuln = `# HexaManufacture (LAB ${LAB.number}) — Vulnerability Map\n\nAll ${TESTS.length} scored tests, grouped by feature. Every item is a real, working flaw in this local training app — detected server-side when the exploit succeeds.\n`;
  for (const f of FEATURES) { vuln += `\n## ${f}\n`; for (const t of byF(f)) vuln += `\n### ${t.name}\n- **OWASP:** ${t.owasp}\n- **Difficulty:** ${t.difficulty}\n- **What it is:** ${t.lesson}\n- **Exploitation outline:** ${t.hints[2]}\n- **Impact:** ${t.impact}\n`; }
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'), vuln);
  const order = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  let guide = `# HexaManufacture (LAB ${LAB.number}) — Practice Guide\n\nChallenges grouped by feature, then difficulty. Each challenge is complete only when the exploit genuinely succeeds — the Mission Board (/tests) tracks you live.\n`;
  for (const f of FEATURES) { guide += `\n## ${f}\n`; for (const t of byF(f).slice().sort((a, b) => order[a.difficulty] - order[b.difficulty])) guide += `\n### [${t.difficulty}] ${t.name}\n- **Objective:** Demonstrate the flaw for real — the test flips only when the server observes the exploit's effect.\n- **Hint 1:** ${t.hints[0]}\n- **Hint 2:** ${t.hints[1]}\n- **Hint 3:** ${t.hints[2]}\n`; }
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'), guide);
  let fix = `# HexaManufacture (LAB ${LAB.number}) — Fix & Retest Guide\n\nFor every scored test: the professional report entry, the secure implementation direction, and the regression test.\n`;
  for (const t of TESTS) fix += `\n## ${t.report.title}\n- **Test:** ${t.name} (${t.feature})\n- **Severity:** ${t.report.severity}\n- **Fix:** ${t.report.remediation}\n- **Regression test:** Re-run the original exploit exactly as practised — it must now fail (no session, no record change, no data returned). Then run the legitimate flow and confirm it still works.\n`;
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'), fix);
  console.log('docs generated for', TESTS.length, 'tests');
}

/* ---------------- HTTP layer ---------------- */
function send(res, code, body, type) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8', 'Content-Length': buf.length });
  res.end(buf);
}
function json(res, code, obj) { send(res, code, JSON.stringify(obj), 'application/json'); }
function redirect(res, loc, extraHeaders) {
  res.writeHead(302, Object.assign({ Location: loc }, extraHeaders || {}));
  res.end();
}
function probe(email) {
  if (email && !state._probes.includes(email)) { state._probes.push(email); if (state._probes.length >= 5) pass('auth-enum'); saveState(); }
}
function resetTokenFor(u) { return 'HM' + u.id + '-' + (u.id * 137 + 42); }

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    const p = url.pathname;
    const body = req.method === 'POST' ? await readBody(req) : {};
    const cookies = parseCookies(req);

    if (p === '/logo.png') {
      try { return send(res, 200, fs.readFileSync(path.join(DIR, 'logo.png')), 'image/png'); }
      catch (e) { return send(res, 404, 'no logo'); }
    }
    if (p === '/unlock' && req.method === 'POST') {
      const candidate = String(body.key || '');
      if (candidate === entryKey()) { state.unlocked = true; saveState(); return redirect(res, '/'); }
      return send(res, 403, 'Invalid key. The gate stays locked.');
    }
    if (p === '/api/chat' && req.method === 'POST') {
      let reply; try { reply = coachReply(body.message); } catch (e) { reply = 'Something glitched — try the Mission Board at /tests.'; }
      return json(res, 200, { reply });
    }
    if (p === '/api/progress' && req.method === 'GET') {
      const done = doneCount();
      return json(res, 200, { lab: LAB.name, number: LAB.number, total: TESTS.length, done, pct: Math.floor(done / TESTS.length * 100), features: featureStats(), complete: isComplete() });
    }

    // ---- lock gate ----
    if (!state.unlocked) return send(res, 200, gatePage());

    /* -------- platform & API (some intentionally unauthenticated) -------- */
    if (p === '/api/debug' && req.method === 'GET') {
      attempt('Platform & API'); pass('plat-debug');
      return json(res, 200, { users, workOrders, inventory, purchaseOrders, qualityChecks, maintenance });
    }
    if (p === '/api/workorders' && req.method === 'GET') {
      attempt('Platform & API');
      const su = currentUser(req);
      const tok = req.headers['x-api-token'];
      if (tok) {
        let email = '';
        try { email = Buffer.from(String(tok), 'base64').toString('utf8'); } catch (e) { /* bad token */ }
        const tu = users.find(u => u.email === email);
        if (tu) {
          if (!su || su.id !== tu.id) pass('plat-apitoken');
          return json(res, 200, { user: tu.email, workOrders: workOrders.filter(w => w.owner === tu.id) });
        }
        return json(res, 401, { error: 'bad token' });
      }
      if (su) return json(res, 200, { user: su.email, workOrders: workOrders.filter(w => w.owner === su.id) });
      return json(res, 401, { error: 'login or token required' });
    }

    /* -------- lab-system pages (post-unlock) -------- */
    if (p === '/tests') return send(res, 200, testsPage(currentUser(req)));
    if (p === '/complete' && req.method === 'GET') return send(res, 200, completePage(currentUser(req)));
    if (p === '/complete/name' && req.method === 'POST') { state.testerName = String(body.name || '').slice(0, 60); saveState(); return redirect(res, '/complete'); }
    if (p === '/certificate') return send(res, 200, certificatePage(currentUser(req)));

    /* -------- auth -------- */
    if (p === '/login' && req.method === 'GET') { if (currentUser(req)) return redirect(res, '/'); return send(res, 200, loginPage()); }
    if (p === '/login' && req.method === 'POST') {
      attempt('Login & Authentication');
      const email = String(body.email || ''); const password = String(body.password || '');
      probe(email);
      const sql = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`;
      const matched = runQuery(sql, users)[0];
      if (matched && matched.active) {
        if (password !== matched.password) pass('auth-sqli');
        if (matched.email === 'admin@hexamanufacture.local' && password === 'admin123') pass('auth-default');
        const sid = crypto.randomBytes(16).toString('hex');
        sessions.set(sid, matched.id);
        return redirect(res, '/', { 'Set-Cookie': [`hx_session=${sid}; Path=/; HttpOnly`, `hx_role=${matched.role}; Path=/`] });
      }
      state._fails[email] = (state._fails[email] || 0) + 1;
      if (state._fails[email] >= 10) pass('auth-brute');
      saveState();
      const exists = users.some(u => u.email === email);
      return send(res, 200, loginPage('', exists ? 'Incorrect password for that account.' : 'No account found for that email.'));
    }
    if (p === '/logout') { sessions.delete(cookies.hx_session); return redirect(res, '/login', { 'Set-Cookie': ['hx_session=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0'] }); }
    if (p === '/register' && req.method === 'GET') return send(res, 200, registerPage());
    if (p === '/register' && req.method === 'POST') {
      attempt('Registration & Profile');
      const name = String(body.name || ''); const email = String(body.email || ''); const password = String(body.password || '');
      if (!name || !email || !password) return send(res, 200, registerPage('All fields are required.'));
      if (users.some(u => u.email === email)) return send(res, 200, registerPage('That email is already registered.'));
      if (password.length < 4) pass('reg-weak');
      if (XSS_RE.test(name)) pass('reg-xss');
      let role = 'operator';
      if (body.role && ['operator', 'technician', 'qc', 'manager', 'admin'].includes(String(body.role))) {
        role = String(body.role);
        if (role !== 'operator') pass('reg-mass');
      }
      const u = { id: nextUserId++, name, email, password, role, active: true, resetIssued: false };
      users.push(u);
      const sid = crypto.randomBytes(16).toString('hex');
      sessions.set(sid, u.id);
      return redirect(res, '/', { 'Set-Cookie': [`hx_session=${sid}; Path=/; HttpOnly`, `hx_role=${u.role}; Path=/`] });
    }
    if (p === '/forgot' && req.method === 'GET') return send(res, 200, forgotPage());
    if (p === '/forgot' && req.method === 'POST') {
      attempt('Login & Authentication');
      const email = String(body.email || '');
      probe(email);
      const u = users.find(x => x.email === email);
      if (u) { u.resetIssued = true; return send(res, 200, forgotPage('A reset token was issued for that account. Enter it below.')); }
      return send(res, 200, forgotPage('That email is not registered here.'));
    }
    if (p === '/reset' && req.method === 'POST') {
      attempt('Login & Authentication');
      const email = String(body.email || ''); const token = String(body.token || ''); const np = String(body.newpassword || '');
      const u = users.find(x => x.email === email);
      if (u && token === resetTokenFor(u)) {
        if (!u.resetIssued) pass('auth-reset');
        u.password = np; u.resetIssued = false;
        return send(res, 200, loginPage('Password reset — please sign in.'));
      }
      return send(res, 200, forgotPage('Invalid reset token.'));
    }

    /* -------- app pages (session required) -------- */
    const user = currentUser(req);
    if (!user) return redirect(res, '/login');

    if (p === '/' && req.method === 'GET') return send(res, 200, dashboardPage(user));
    if (p === '/search' && req.method === 'GET') {
      attempt('Search & Catalogue');
      const q = url.searchParams.get('q') || '';
      const woRows = workOrders.map(w => Object.assign({}, w, { internal: w.internal ? 1 : 0 }));
      const sql = `SELECT * FROM work_orders WHERE product LIKE '%${q}%' AND internal = 0`;
      const found = runQuery(sql, woRows);
      if (found.some(w => w.internal === 1)) pass('search-sqli');
      if (XSS_RE.test(q)) pass('search-xss');
      const mats = inventory.filter(i => i.name.toLowerCase().includes(q.toLowerCase()) && !q.includes("'"));
      const rowsHtml = found.map(w => { const o = userById(w.owner); return `<tr><td><a href="/workorder/${w.id}">WO-${w.id}</a></td><td>${esc(w.product)}</td><td>${o ? esc(o.name) : '?'}</td><td>${esc(w.status)}</td></tr>`; }).join('');
      const matHtml = mats.map(i => `<tr><td>${esc(i.sku)}</td><td>${esc(i.name)}</td><td>${i.stock}</td><td>$${i.cost.toFixed(2)}</td></tr>`).join('');
      return send(res, 200, page(user, 'Search', `<div class="card"><h2>Search results for "${q}"</h2>
      <h3>Work orders</h3><table><tr><th>ID</th><th>Product</th><th>Owner</th><th>Status</th></tr>${rowsHtml || '<tr><td colspan="4">No matches</td></tr>'}</table>
      <h3>Materials</h3><table><tr><th>SKU</th><th>Material</th><th>Stock</th><th>Cost</th></tr>${matHtml || '<tr><td colspan="4">No matches</td></tr>'}</table></div>`));
    }
    if (p === '/workorders') return send(res, 200, workOrdersPage(user));
    const woMatch = p.match(/^\/workorder\/(\d+)$/);
    if (woMatch && req.method === 'GET') {
      attempt('Work Orders');
      const w = workOrders.find(x => x.id === Number(woMatch[1]));
      if (!w) return send(res, 404, 'Work order not found');
      if (w.internal) { if (!['manager', 'admin'].includes(user.role)) pass('wo-internal'); }
      else if (w.owner !== user.id && !['manager', 'admin'].includes(user.role)) pass('wo-idor');
      return send(res, 200, workOrderDetail(user, w));
    }
    const woUpd = p.match(/^\/workorder\/(\d+)\/update$/);
    if (woUpd && req.method === 'POST') {
      attempt('Work Orders');
      const w = workOrders.find(x => x.id === Number(woUpd[1]));
      if (!w) return send(res, 404, 'Work order not found');
      const planned = parseInt(body.planned, 10); const produced = parseInt(body.produced, 10);
      const np = Number.isNaN(planned) ? w.planned : planned; const nq = Number.isNaN(produced) ? w.produced : produced;
      if (w.owner !== user.id && (np !== w.planned || nq !== w.produced)) pass('wo-qty');
      w.planned = np; w.produced = nq;
      return redirect(res, '/workorder/' + w.id);
    }
    const woComp = p.match(/^\/workorder\/(\d+)\/complete$/);
    if (woComp && req.method === 'POST') {
      attempt('Work Orders');
      const w = workOrders.find(x => x.id === Number(woComp[1]));
      if (!w) return send(res, 404, 'Work order not found');
      if (!['manager', 'admin'].includes(user.role) && w.status !== 'Completed') pass('wo-complete');
      w.status = 'Completed';
      return redirect(res, '/workorder/' + w.id);
    }
    if (p === '/inventory' && req.method === 'GET') return send(res, 200, inventoryPage(user, url.searchParams.get('msg') || ''));
    const invAdj = p.match(/^\/inventory\/(\d+)\/adjust$/);
    if (invAdj && req.method === 'POST') {
      attempt('Inventory & Materials');
      const item = inventory.find(x => x.id === Number(invAdj[1]));
      if (!item) return send(res, 404, 'Item not found');
      const delta = parseInt(body.delta, 10) || 0;
      if (!['manager', 'admin'].includes(user.role) && delta !== 0) pass('inv-adjust');
      item.stock += delta;
      return redirect(res, '/inventory?msg=' + encodeURIComponent('Stock adjusted for ' + item.name));
    }
    const invIssue = p.match(/^\/inventory\/(\d+)\/issue$/);
    if (invIssue && req.method === 'POST') {
      attempt('Inventory & Materials');
      const item = inventory.find(x => x.id === Number(invIssue[1]));
      if (!item) return send(res, 404, 'Item not found');
      const qty = parseInt(body.qty, 10) || 0;
      item.stock -= qty;
      if (item.stock < 0) pass('inv-negative');
      return redirect(res, '/inventory?msg=' + encodeURIComponent('Issued ' + qty + ' of ' + item.name));
    }
    if (p === '/purchaseorders' && req.method === 'POST') {
      attempt('Inventory & Materials');
      const item = inventory.find(x => x.id === Number(body.itemId));
      if (!item) return send(res, 404, 'Item not found');
      const unitPrice = parseFloat(body.unitPrice);
      if (!Number.isNaN(unitPrice) && unitPrice !== item.cost) pass('inv-po');
      purchaseOrders.push({ id: nextPoId++, itemId: item.id, qty: parseInt(body.qty, 10) || 0, unitPrice: Number.isNaN(unitPrice) ? item.cost : unitPrice, status: 'Open', by: user.id });
      return redirect(res, '/inventory?msg=' + encodeURIComponent('Purchase order created'));
    }
    if (p === '/quality' && req.method === 'GET') return send(res, 200, qualityPage(user));
    const qcApp = p.match(/^\/quality\/(\d+)\/approve$/);
    if (qcApp && req.method === 'POST') {
      attempt('Quality Control');
      const q = qualityChecks.find(x => x.id === Number(qcApp[1]));
      if (!q) return send(res, 404, 'Check not found');
      if (user.id === q.inspector) pass('qc-self');
      q.result = 'Pass';
      return redirect(res, '/quality');
    }
    const qcRes = p.match(/^\/quality\/(\d+)\/result$/);
    if (qcRes && req.method === 'POST') {
      attempt('Quality Control');
      const q = qualityChecks.find(x => x.id === Number(qcRes[1]));
      if (!q) return send(res, 404, 'Check not found');
      const nr = String(body.result || '');
      if (!['qc', 'admin'].includes(user.role) && nr && nr !== q.result) pass('qc-tamper');
      if (nr) q.result = nr;
      return redirect(res, '/quality');
    }
    if (p === '/maintenance' && req.method === 'GET') return send(res, 200, maintenancePage(user));
    const mtClose = p.match(/^\/maintenance\/(\d+)\/close$/);
    if (mtClose && req.method === 'POST') {
      attempt('Maintenance');
      const t = maintenance.find(x => x.id === Number(mtClose[1]));
      if (!t) return send(res, 404, 'Ticket not found');
      if (user.id !== t.assignee) pass('maint-close');
      t.status = 'Closed'; t.cost = parseFloat(body.cost) || 0;
      return redirect(res, '/maintenance');
    }
    if (p === '/suppliers' && req.method === 'GET') return send(res, 200, suppliersPage(user));
    if (p === '/profile' && req.method === 'GET') return send(res, 200, profilePage(user));
    if (p === '/profile/update' && req.method === 'POST') {
      attempt('Registration & Profile');
      if (body.hx_origin !== '1') pass('reg-csrf');
      if (body.name && XSS_RE.test(String(body.name))) pass('reg-xss');
      if (body.name) user.name = String(body.name);
      if (body.email) user.email = String(body.email);
      return redirect(res, '/profile');
    }

    /* -------- admin -------- */
    if (p === '/admin' && req.method === 'GET') {
      attempt('Admin Panel');
      const viaCookie = cookies.hx_role === 'admin';
      if (user.role === 'admin' || viaCookie) {
        if (viaCookie && user.role !== 'admin') pass('auth-cookie');
        return send(res, 200, adminPage(user));
      }
      return send(res, 403, page(user, 'Forbidden', '<div class="card"><h2>Admins only</h2></div>'));
    }
    if (p === '/admin/users' && req.method === 'GET') {
      attempt('Admin Panel');
      if (user.role !== 'admin') pass('admin-panel');
      return send(res, 200, adminUsersPage(user));
    }
    if (p === '/admin/deactivate' && req.method === 'POST') {
      attempt('Admin Panel');
      if (body.hx_origin !== '1') pass('admin-csrf');
      const t = userById(body.userId);
      if (t) t.active = false;
      return redirect(res, '/admin');
    }

    return send(res, 404, page(user, 'Not found', '<div class="card"><h2>404 — Not found</h2></div>'));
  } catch (e) {
    try { send(res, 500, 'Internal error — the lab stays up. Try again.'); } catch (e2) { /* socket gone */ }
  }
});

if (process.argv.includes('--gen-docs')) { genDocs(); process.exit(0); }
loadState();
server.listen(LAB.port, '127.0.0.1', () => {
  console.log(`LAB ${LAB.number} ${LAB.name} listening on http://127.0.0.1:${LAB.port} (LOCAL training lab — intentional vulnerabilities)`);
});
