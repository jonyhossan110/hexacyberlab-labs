'use strict';
/* HexaAgri — LAB 105 (Category 11: Specialized & Advanced Business Systems)
   Agriculture management platform — INTENTIONALLY VULNERABLE training lab.
   Zero-dependency Node.js. LOCAL USE ONLY. All data is fake seed data. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB_NUMBER = 105;
const LAB_NAME = 'HexaAgri';
const PORT = 3114;
const HOST = process.env.HOST || '127.0.0.1';
const DIR = __dirname;
const STATE_FILE = path.join(DIR, 'progress.json');

// ---- key material, segment A (shards are base64 of reversed pieces) ----

const _cA = ["TC1YSA==", "LTYwMQ=="];
function _un(s) { return [...Buffer.from(s, 'base64').toString('utf8')].reverse().join(''); }

// ---------------- progress state ----------------
let state = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false, brute: {}, enumProbes: [] };
try {
  if (fs.existsSync(STATE_FILE)) {
    const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    state = Object.assign(state, s);
  }
} catch (e) { /* fresh state */ }
function save() { try { fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2)); } catch (e) {} }

// ---------------- fake seed database (in-memory) ----------------
const DB = {
  users: [
    { id: 1, name: 'Ada Admin', email: 'admin@hexaagri.local', password: 'AgriAdmin#1', role: 'admin', farmId: null, balance: 0, active: true },
    { id: 2, name: 'Alice Rahman', email: 'alice@greenvalley.local', password: 'alice123', role: 'owner', farmId: 1, balance: 250, active: true },
    { id: 3, name: 'Bob Karim', email: 'bob@sunridge.local', password: 'bob123', role: 'owner', farmId: 2, balance: 180, active: true },
    { id: 4, name: 'Wally Hasan', email: 'wally@greenvalley.local', password: 'wally123', role: 'worker', farmId: 1, balance: 40, active: true },
    { id: 5, name: 'Nursery Demo', email: 'nursery@greenvalley.local', password: 'sprout123', role: 'owner', farmId: 3, balance: 60, active: true },
    { id: 6, name: 'Mira Manager', email: 'mira@hexaagri.local', password: 'mira123', role: 'manager', farmId: null, balance: 0, active: true }
  ],
  farms: [
    { id: 1, name: 'Green Valley Farm', ownerId: 2, location: 'Natore', published: true, notes: 'Rice and mango. Buyer contracts renew in November.' },
    { id: 2, name: 'Sunridge Acres', ownerId: 3, location: 'Rajshahi', published: true, notes: 'Wheat specialist. Minimum export price $30/kg agreed with buyers.' },
    { id: 3, name: 'Little Sprout Nursery', ownerId: 5, location: 'Gazipur', published: true, notes: 'Seedling nursery (demo farm).' },
    { id: 4, name: 'Whispering Pines Agro', ownerId: 3, location: 'Sylhet', published: false, notes: 'UNLISTED — land deal pending, do not publish.' }
  ],
  crops: [
    { id: 1, farmId: 1, fieldId: 1, name: 'Rice (Aman)', expectedYield: 8000 },
    { id: 2, farmId: 1, fieldId: 2, name: 'Mango (Himsagar)', expectedYield: 3000 },
    { id: 3, farmId: 2, fieldId: 3, name: 'Wheat (BARI-33)', expectedYield: 6000 },
    { id: 4, farmId: 3, fieldId: 4, name: 'Tomato Seedlings', expectedYield: 1200 }
  ],
  fields: [
    { id: 1, farmId: 1, cropId: 1, name: 'Field F1 — North Paddy', harvested: false },
    { id: 2, farmId: 1, cropId: 2, name: 'Field F2 — Orchard Block', harvested: false },
    { id: 3, farmId: 2, cropId: 3, name: 'Field F3 — River Wheat', harvested: false },
    { id: 4, farmId: 3, cropId: 4, name: 'Field F4 — Nursery Beds', harvested: false }
  ],
  lots: [
    { id: 1, farmId: 1, cropId: 1, label: 'Aman Rice — Lot R1', qty: 400, pricePerKg: 32 },
    { id: 2, farmId: 2, cropId: 3, label: 'Wheat — Lot W1', qty: 900, pricePerKg: 28 },
    { id: 3, farmId: 1, cropId: 2, label: 'Mango — Lot M1', qty: 150, pricePerKg: 120 },
    { id: 4, farmId: 3, cropId: 4, label: 'Seedlings — Lot S1', qty: 60, pricePerKg: 45 }
  ],
  orders: [
    { id: 1, buyerId: 3, lotId: 1, qty: 10, price: 32, total: 320 }
  ],
  invoices: [
    { id: 1, orderId: 1, buyerId: 3, amount: 320 }
  ],
  equipment: [
    { id: 1, farmId: 1, name: 'Tractor — Sonali 35DI' },
    { id: 2, farmId: 2, name: 'Combine Harvester — Sunridge CH-2' }
  ],
  maintRequests: [
    { id: 1, equipId: 1, requesterId: 4, note: 'Hydraulic leak on the lift arm.', status: 'pending' }
  ],
  subsidies: [
    { id: 1, applicantId: 3, program: 'Fertilizer Support 2026', amount: 15000, status: 'pending' }
  ]
};
let nextId = { user: 7, order: 2, invoice: 2, lot: 5, maint: 2, subsidy: 2 };
const sessions = new Map(); // sid -> userId

// ---- key material, segment B ----

const _cB = ["S1FIRw==", "OFNaUw=="];

// ---------------- helpers ----------------
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
const XSS_RE = /(<script|<svg|<img|onerror\s*=|onload\s*=|javascript:)/i;
function parseCookies(req) {
  const out = {};
  const h = req.headers.cookie || '';
  h.split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}
function parseBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) { try { return resolve(JSON.parse(data || '{}')); } catch (e) { return resolve({}); } }
      const obj = {};
      try { new URLSearchParams(data).forEach((v, k) => { obj[k] = v; }); } catch (e) {}
      resolve(obj);
    });
    req.on('error', () => resolve({}));
  });
}
function sendHtml(res, status, body, cookies) {
  const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': ['hx_origin=same; Path=/'] };
  if (cookies) headers['Set-Cookie'] = headers['Set-Cookie'].concat(cookies);
  res.writeHead(status, headers); res.end(body);
}
function sendJson(res, status, obj) { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); }
function redirect(res, loc, cookies) {
  const headers = { Location: loc };
  if (cookies) headers['Set-Cookie'] = cookies;
  res.writeHead(302, headers); res.end();
}
function currentUser(req) {
  const sid = parseCookies(req).hx_session;
  if (!sid || !sessions.has(sid)) return null;
  return DB.users.find(u => u.id === sessions.get(sid)) || null;
}
function newSession(res, userId) {
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, userId);
  return ['hx_session=' + sid + '; Path=/; HttpOnly', 'hx_origin=same; Path=/'];
}
// Tiny string-built-query evaluator — deliberately mimics a real SQL engine
// closely enough that classic injection payloads behave like real SQL.
function splitTop(s, kw) {
  const parts = []; let cur = '', inQ = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "'") { inQ = !inQ; cur += ch; continue; }
    if (!inQ) {
      const m = s.slice(i).match(new RegExp('^\\s+' + kw + '\\s+', 'i'));
      if (m) { parts.push(cur); cur = ''; i += m[0].length - 1; continue; }
    }
    cur += ch;
  }
  parts.push(cur);
  return parts.map(x => x.trim()).filter(x => x.length);
}
function operand(tok, row) {
  tok = tok.trim();
  if (/^'.*'$/.test(tok)) return tok.slice(1, -1);
  if (/^-?\d+$/.test(tok)) return Number(tok);
  const col = tok.toLowerCase();
  if (col === 'email') return row.email;
  if (col === 'password') return row.password;
  if (col === 'role') return row.role;
  if (col === 'id') return row.id;
  return tok;
}
function evalCond(c, row) {
  c = c.replace(/^\(+|\)+$/g, '').trim();
  const m = c.match(/^(.+?)\s*=\s*(.+)$/);
  if (!m) return false;
  return String(operand(m[1], row)) === String(operand(m[2], row));
}
function evalUserQuery(q) {
  let s = q;
  const ci = s.indexOf('--');
  if (ci >= 0) s = s.slice(0, ci);
  const wi = s.toUpperCase().indexOf('WHERE');
  if (wi < 0) return null;
  const cond = s.slice(wi + 5).trim().replace(/;$/, '');
  const orParts = splitTop(cond, 'OR');
  for (const row of DB.users) {
    for (const part of orParts) {
      const andParts = splitTop(part, 'AND');
      if (andParts.length && andParts.every(c => evalCond(c, row))) return row;
    }
  }
  return null;
}
function resetTokenFor(id) { return 'AG' + id + '-' + (id * 137 + 42); }

// ---------------- TESTS registry ----------------
const TESTS = [
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ["The login form builds its database query by gluing your input straight into the query string.", "Try a quote in the email field, then close the quote and add a condition that is always true.", "Use email: ' OR '1'='1' -- (with any password) — the -- comments out the password check."],
    lesson: 'String-built queries let attacker input change the query logic; parameterised queries keep data and code separate.',
    impact: 'An attacker can sign in as any user — including the admin — without knowing a password, taking over accounts and everything they control.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements for all database access and validate input server-side.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'No Brute-Force Protection on Login', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ["Notice what happens after many wrong passwords — nothing slows down or locks.", "The app never counts failures per account.", "Submit 10+ wrong passwords for alice@greenvalley.local; the 10th is still processed normally."],
    lesson: 'Without throttling or lockout, automated tools can try thousands of passwords until one works.',
    impact: 'Attackers can crack weak farm-account passwords at machine speed, gaining access to business records and payments.',
    report: { title: 'Missing Brute-Force Protection on Authentication', severity: 'High', remediation: 'Add per-account rate limiting, progressive delays and lockout/alerting after repeated failures.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User Enumeration via Login & Password Reset', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ["Compare the error message for an email that exists with one that does not.", "The forgot-password flow answers differently too — try both.", "Probe at least 5 different emails across login/forgot; the responses tell you which accounts are real."],
    lesson: 'Different responses for real vs fake accounts let attackers build a target list before attacking.',
    impact: 'Attackers learn exactly which email addresses have accounts, focusing phishing and password attacks on real users.',
    report: { title: 'Account Enumeration Through Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message for all login and reset outcomes regardless of account existence.' } },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Published Demo Account With Default Password', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ["Read the login page carefully — it advertises a demo account.", "Demo accounts in production keep their factory password.", "Sign in with the nursery demo credentials printed on the login page."],
    lesson: 'Demo and default accounts are the first thing attackers try; they must never survive into production.',
    impact: "Anyone on the internet can walk into the demo farm's account and see or change real operational data.",
    report: { title: 'Active Demo Account With Widely Known Default Credentials', severity: 'High', remediation: 'Remove demo accounts from production and force unique strong passwords at first sign-in.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07:2021 Authentication Failures', difficulty: 'Intermediate',
    hints: ["Request a reset and study the token's shape — it is built from something guessable.", "The token contains the user id and a number derived from it by simple arithmetic.", "Tokens look like AG<id>-<id x 137 + 42>; compute one for another user and use it without ever requesting a reset."],
    lesson: 'Reset tokens must be random and server-issued; a formula an attacker can compute is no secret at all.',
    impact: "Anyone can reset any user's password — including the admin's — and take over the account in minutes.",
    report: { title: 'Predictable Password Reset Tokens Allow Account Takeover', severity: 'Critical', remediation: 'Issue single-use, time-limited reset tokens from a CSPRNG and store only a hash server-side.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Role Cookie Trusted for Manager Access', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ["The manager console checks something your browser sends — and you control it.", "Look at the cookies the app uses; one of them can name a role.", "Set the hx_role cookie to manager (or admin) and visit /manager with a low-privilege account."],
    lesson: 'Authorization decisions must come from server-side session data, never from client-controlled cookies.',
    impact: "Any signed-in user can open the manager console, seeing every farm's data and pending subsidy approvals.",
    report: { title: 'Broken Access Control — Privilege Escalation via Client-Side Role Cookie', severity: 'High', remediation: 'Derive roles exclusively from the server-side session; ignore role claims from the client.' } },
  { id: 'reg-weakpass', feature: 'Registration & Profile', name: 'Weak Password Policy at Registration', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ["Try registering with a one-character password.", "The form accepts almost anything as a password.", "Create an account with the password 'a' — it is accepted."],
    lesson: 'A password policy is the cheapest defence against credential guessing and stuffing.',
    impact: 'Users pick trivial passwords that attackers crack in seconds, exposing their farms and orders.',
    report: { title: 'Weak Password Policy Allows Trivial Passwords', severity: 'Medium', remediation: 'Enforce a minimum length of 10+ characters and screen against common-password lists.' } },
  { id: 'reg-mass', feature: 'Registration & Profile', name: 'Mass Assignment at Registration (Role & Balance)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ["The registration handler trusts every field in the form post — even ones the form never shows.", "Add fields the form does not display, like role or balance.", "POST /register with extra fields role=admin and balance=5000 — both are stored."],
    lesson: 'Bind only whitelisted fields from requests; auto-binding whole objects invites privilege escalation.',
    impact: 'Attackers register straight into admin accounts or gift themselves wallet balance, bypassing every business rule.',
    report: { title: 'Mass Assignment in Registration Allows Privilege Escalation', severity: 'High', remediation: 'Whitelist assignable fields per endpoint and set roles/balances only in server-side logic.' } },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ["Your display name is printed back on pages other users read — unescaped.", "Put an HTML event-handler payload in the name field.", "Register or update your profile with the name <img src=x onerror=alert(1)> and view a page that lists users."],
    lesson: "Any user-controlled text rendered without encoding becomes code in other users' browsers.",
    impact: 'An attacker can run scripts in the browsers of staff and customers, stealing sessions and approvals.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Contextually encode all user output and apply a Content Security Policy.' } },
  { id: 'farm-idor', feature: 'Farms & Search', name: "Farm Record IDOR (Another Owner's Farm)", owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ["Farms are numbered in the URL, and the page never checks whose farm it is.", "Sign in as one owner and change the farm id in the address bar.", "As Alice, open /farms/2 — Sunridge Acres is served in full, including its internal notes."],
    lesson: 'Every object access must verify the requester owns (or may view) that object, not just that they are logged in.',
    impact: "Competitors can read each other's yields, buyers and prices — commercially sensitive farming data leaks freely.",
    report: { title: 'Insecure Direct Object Reference on Farm Records', severity: 'High', remediation: 'Check object ownership/authorization on every request server-side.' } },
  { id: 'search-sqli', feature: 'Farms & Search', name: 'SQL Injection in Farm Search', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ["Search glues your text into a query the same way login does.", "A quote plus an always-true condition widens the result set.", "Search for ' OR '1'='1 — every farm appears, including the unlisted Whispering Pines Agro."],
    lesson: 'Injection flaws hide in every input that reaches a query, not just login forms.',
    impact: 'Attackers can dump the entire catalogue — including unlisted farms and their data — through the search box.',
    report: { title: 'SQL Injection in Search Function', severity: 'High', remediation: 'Use parameterised queries for search and encode LIKE wildcards in user input.' } },
  { id: 'search-xss', feature: 'Farms & Search', name: 'Reflected XSS in Search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ["The results page repeats your search text back to you — raw.", "Put a script payload in the search box and view the page source.", "Search for <script>alert(1)</script> and watch it land unescaped in the results heading."],
    lesson: "Reflected input must be encoded on output even when it 'only' echoes the user's own text.",
    impact: "Attackers craft links that run scripts in a victim's browser under the site's trusted domain.",
    report: { title: 'Reflected Cross-Site Scripting in Search Results', severity: 'Medium', remediation: 'Encode all reflected values in HTML context and validate input.' } },
  { id: 'crop-idor', feature: 'Crops & Fields', name: "Edit Another Farm's Crop (IDOR)", owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ["The crop edit form posts to a numbered URL with no ownership check.", "Find a crop that belongs to another farm and submit its edit form.", "As Alice, POST a new name to /crops/3/edit — Bob's wheat crop is renamed."],
    lesson: 'Write endpoints need the same ownership checks as read endpoints — often more.',
    impact: "Rivals can sabotage each other's crop records, corrupting planning and sales data.",
    report: { title: 'Missing Authorization on Crop Edit Endpoint', severity: 'High', remediation: "Verify the session user owns the parent farm before applying any crop change." } },
  { id: 'crop-yield', feature: 'Crops & Fields', name: 'Yield Figure Tampering', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ["Expected yield is just a number the server accepts from the form.", "Nothing sanity-checks the harvest a field could plausibly produce.", "Set a crop's expected yield to 999999 — the inflated figure is stored and used for planning."],
    lesson: 'Business numbers need server-side plausibility limits, not just type checks.',
    impact: 'Inflated yields distort inventory promises, subsidy claims and buyer contracts, creating real financial loss.',
    report: { title: 'Missing Validation Allows Yield Figure Manipulation', severity: 'Medium', remediation: 'Enforce server-side plausibility ranges per crop/field and audit large changes.' } },
  { id: 'field-harvest', feature: 'Crops & Fields', name: "Harvesting Another Farm's Field", owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ["The harvest button posts a field id — the server never asks whose field it is.", "Call the harvest endpoint for a field on someone else's farm.", "As Alice, POST /fields/3/harvest — Bob's field is harvested by a stranger."],
    lesson: 'State-changing business actions must verify both identity and ownership of the target object.',
    impact: 'Attackers can trigger harvests on other farms, corrupting stock records and operations.',
    report: { title: 'Broken Access Control on Field Harvest Action', severity: 'High', remediation: "Authorize the actor against the field's farm before processing a harvest." } },
  { id: 'inv-inflate', feature: 'Harvest Inventory', name: 'Harvest Inventory Inflation', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ["The stock adjust form lets you type the new quantity directly.", "There is no comparison with harvest records or reasonableness.", "Raise a lot from 400 kg to 5000 kg in one adjust — the phantom stock is now sellable."],
    lesson: 'Inventory must change only through audited business events (harvest, sale, waste), never free-form edits.',
    impact: 'Phantom stock gets sold to buyers the farm cannot supply — refunds, penalties and lost contracts follow.',
    report: { title: 'Unrestricted Inventory Adjustment Allows Stock Inflation', severity: 'High', remediation: 'Restrict adjustments by role, require reasons, cap deltas and keep an immutable audit log.' } },
  { id: 'inv-negative', feature: 'Harvest Inventory', name: 'Negative Inventory Accepted', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ["The adjust form does not check the sign of the number you enter.", "Quantities are trusted exactly as typed.", "Set a lot's quantity to -50 — the negative stock is stored."],
    lesson: 'Never trust client-supplied quantities; validate sign and range server-side.',
    impact: 'Negative stock breaks sales math and reporting, and can be combined with orders to create money from nothing.',
    report: { title: 'Missing Input Validation Allows Negative Inventory', severity: 'Medium', remediation: 'Validate quantities as positive numbers within business limits on the server.' } },
  { id: 'order-price', feature: 'Sales & Orders', name: 'Order Price Tampering', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ["The order form sends the price along with the lot and quantity.", "The server totals the order using the price you sent.", "Order lot 1 with price=1 — your invoice is computed at $1/kg instead of $32/kg."],
    lesson: 'Prices must always be recomputed server-side from the catalogue; client-sent prices are fiction.',
    impact: 'Buyers pay almost nothing for produce while invoices look legitimate — direct revenue theft.',
    report: { title: 'Price Tampering in Order Placement', severity: 'Critical', remediation: 'Ignore client-supplied prices; compute totals from server-side catalogue data.' } },
  { id: 'order-oversell', feature: 'Sales & Orders', name: 'Overselling Beyond Available Stock', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ["The order flow never compares your quantity with what the lot actually holds.", "Stock is decremented without a floor check.", "Order 100000 kg from a 400 kg lot — the order is accepted and stock goes negative."],
    lesson: 'Check invariants (quantity <= available) inside the transaction, every time.',
    impact: 'The platform promises produce that does not exist, causing failed deliveries and compensation claims.',
    report: { title: 'Missing Stock Check Allows Overselling', severity: 'High', remediation: 'Validate ordered quantity against available stock atomically before confirming.' } },
  { id: 'order-idor', feature: 'Sales & Orders', name: 'Sales Order IDOR', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ["Order pages are numbered and served to any signed-in user.", "Change the order id in the URL.", "As Alice, open /orders/1 — Bob's order details are shown."],
    lesson: 'Ownership checks belong on every object read, including receipts and orders.',
    impact: "Buyers' and farmers' deal terms, quantities and prices leak to competitors.",
    report: { title: 'Insecure Direct Object Reference on Sales Orders', severity: 'Medium', remediation: 'Restrict order visibility to the buyer, the selling farm and admins.' } },
  { id: 'invoice-idor', feature: 'Sales & Orders', name: 'Invoice IDOR', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ["Invoices live at numbered URLs with no ownership check.", "Open an invoice that belongs to another buyer.", "As Alice, open /invoices/1 — Bob's invoice is rendered in full."],
    lesson: 'Financial documents need the strictest ownership checks — they are prime fraud material.',
    impact: 'Invoices leak pricing and counterparty details and can be reused for invoice fraud.',
    report: { title: 'Insecure Direct Object Reference on Invoices', severity: 'Medium', remediation: 'Authorize invoice access to the paying buyer and issuing farm only.' } },
  { id: 'equip-maint-approve', feature: 'Equipment & Maintenance', name: 'Self-Approved Equipment Maintenance', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ["Maintenance requests are approved through an endpoint that never checks your role.", "The worker who filed a request can also approve it.", "As Wally (worker), POST approve on your own maintenance request — it is approved."],
    lesson: 'Approval actions must require a role different from the requester (separation of duties).',
    impact: 'Workers can approve their own repair spending, enabling fraudulent service claims.',
    report: { title: 'Missing Role Check Allows Self-Approval of Maintenance Requests', severity: 'High', remediation: 'Require manager role for approvals and prevent requesters approving their own requests.' } },
  { id: 'worker-role', feature: 'Workers & Subsidies', name: 'Worker Self-Promotes to Manager', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ["The team page's role-change endpoint trusts whoever calls it.", "A worker's session is enough to rewrite roles.", "As Wally, POST /workers/4/role with role=manager — you are now a manager."],
    lesson: 'Role management is an admin-only capability; the server must enforce it, not the UI.',
    impact: 'Any worker can grant themselves manager powers — the keys to approvals, data and payouts.',
    report: { title: 'Privilege Escalation via Unprotected Role-Change Endpoint', severity: 'Critical', remediation: 'Restrict role changes to admins and log every change.' } },
  { id: 'subsidy-approve', feature: 'Workers & Subsidies', name: 'Self-Approved Subsidy Application', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ["Subsidy approval is a plain POST with no role check.", "Apply for a subsidy, then call the approve endpoint yourself.", "As Bob, apply for a subsidy and POST /subsidies/<id>/approve — public money approved by the applicant."],
    lesson: 'Money-out approvals demand strict role checks and separation of duties.',
    impact: 'Applicants can approve their own subsidy claims, diverting support funds fraudulently.',
    report: { title: 'Missing Authorization Allows Self-Approval of Subsidies', severity: 'Critical', remediation: 'Require manager/admin approval from a different user than the applicant.' } },
  { id: 'admin-csrf', feature: 'Admin & Platform', name: 'CSRF on Admin User Deactivation', owasp: 'A01:2021 Broken Access Control (CSRF)', difficulty: 'Intermediate',
    hints: ["Admin actions accept POSTs with no anti-CSRF token.", "The app marks its own pages with an hx_origin cookie — forged requests will not have it.", "Send the deactivate POST for a user with an admin session but without the hx_origin marker — the account is deactivated."],
    lesson: 'State-changing requests need unforgeable tokens; cookies alone are sent by the browser automatically.',
    impact: "An attacker can trick an admin's browser into deactivating accounts, disrupting the whole platform.",
    report: { title: 'Cross-Site Request Forgery on Admin User Deactivation', severity: 'High', remediation: 'Require per-session CSRF tokens on all state-changing endpoints and verify Origin/Referer.' } },
  { id: 'api-debug', feature: 'Admin & Platform', name: 'Unauthenticated Debug Endpoint Exposes All Data', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ["Developers often leave a debug route in production builds.", "Try common debug paths under /api.", "GET /api/debug with no login at all — every user, password and order is returned."],
    lesson: 'Debug and diagnostics endpoints must never ship to production, or must sit behind strong auth.',
    impact: 'The entire database — including plaintext passwords — is downloadable by anyone, no account needed.',
    report: { title: 'Unauthenticated Debug Endpoint Discloses Full Database', severity: 'Critical', remediation: 'Remove debug endpoints from production and protect diagnostics with admin auth.' } }
];
const FEATURES = [...new Set(TESTS.map(t => t.feature))];
function pass(id) {
  if (!state.tests[id]) {
    state.tests[id] = true;
    if (TESTS.every(t => state.tests[t.id])) {
      state.completedAt = new Date().toISOString();
      state.keyRevealed = true;
    }
    save();
  }
}
function attempt(feature) { state.attempts[feature] = (state.attempts[feature] || 0) + 1; save(); }
function progress() {
  const done = TESTS.filter(t => state.tests[t.id]).length;
  const features = {};
  for (const f of FEATURES) {
    const ft = TESTS.filter(t => t.feature === f);
    features[f] = { total: ft.length, done: ft.filter(t => state.tests[t.id]).length, attempts: state.attempts[f] || 0 };
  }
  return { lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done, pct: Math.floor(done / TESTS.length * 100), features, complete: done === TESTS.length };
}
const GUIDE = {
  'Login & Authentication': "Step by step for Login & Authentication: (1) In the email field use ' OR '1'='1' -- with any password to bypass the query. (2) Send 10+ wrong passwords for one account — nothing ever locks. (3) Compare error messages for real vs fake emails and probe 5+ emails across login/forgot to enumerate accounts. (4) Sign in with the demo nursery credentials printed on the login page. (5) Reset tokens follow AG<id>-<id x 137 + 42> — compute one for a user who never requested a reset and use it. (6) Set the hx_role cookie to manager and open /manager.",
  'Registration & Profile': "Step by step for Registration & Profile: (1) Register with a 1-character password — it is accepted. (2) Add hidden fields role=admin and balance=5000 to the registration POST; both are stored (mass assignment). (3) Register or update your profile with the display name <img src=x onerror=alert(1)> — it is stored and rendered raw.",
  'Farms & Search': "Step by step for Farms & Search: (1) Open another owner's farm by changing the id in /farms/<id>. (2) Search for ' OR '1'='1 to dump every farm, including the unlisted Whispering Pines Agro. (3) Search for <script>alert(1)</script> and see it reflected unescaped in the results heading.",
  'Crops & Fields': "Step by step for Crops & Fields: (1) Edit a crop on another farm by posting to /crops/<id>/edit. (2) Set a crop's expected yield to 999999 via /crops/<id>/yield. (3) POST /fields/<id>/harvest for a field that belongs to another farm.",
  'Harvest Inventory': "Step by step for Harvest Inventory: (1) Raise a lot's quantity far beyond its harvest with /inventory/<id>/adjust (e.g. 400 -> 5000). (2) Set a lot's quantity to a negative number the same way.",
  'Sales & Orders': "Step by step for Sales & Orders: (1) Place an order with price=1 and watch the invoice use your price. (2) Order far more kg than the lot holds — it is accepted. (3) Open /orders/<id> and /invoices/<id> that belong to another user.",
  'Equipment & Maintenance': "Step by step for Equipment & Maintenance: (1) As worker Wally, open /equipment and POST the approve endpoint for your own maintenance request — no role check stops you.",
  'Workers & Subsidies': "Step by step for Workers & Subsidies: (1) As Wally, POST /workers/4/role with role=manager to promote yourself. (2) Apply for a subsidy, then POST /subsidies/<id>/approve yourself — the applicant approves the money.",
  'Admin & Platform': "Step by step for Admin & Platform: (1) As admin, send the user-deactivation POST with the session cookie but WITHOUT the hx_origin cookie — the forged request succeeds (CSRF). (2) GET /api/debug with no session at all — the whole database, passwords included, is returned."
};
const FEATURE_KEYS = {
  'Login & Authentication': ['login', 'password', 'reset', 'brute', 'enumerat', 'cookie', 'sign in', 'auth'],
  'Registration & Profile': ['regist', 'sign up', 'profile', 'mass assignment', 'display name', 'weak password'],
  'Farms & Search': ['farm', 'search'],
  'Crops & Fields': ['crop', 'field', 'yield'],
  'Harvest Inventory': ['inventory', 'stock', 'lot', 'harvest'],
  'Sales & Orders': ['order', 'invoice', 'price', 'sale', 'oversell', 'buy'],
  'Equipment & Maintenance': ['equipment', 'maintenance', 'tractor'],
  'Workers & Subsidies': ['worker', 'subsid', 'team', 'role'],
  'Admin & Platform': ['admin', 'csrf', 'debug', 'api', 'platform']
};

// ---- key material, segment C ----

const _cC = ["OEI5LQ==", "S05DTg==", "Qw=="];
const ENTRY_KEY_SHA256 = '977f301e0d557c0acc51c0e82f45af6bad738a1df63f2b541aa953e78d7356a3';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */
function completionKey() { return [..._cA, ..._cB, ..._cC].map(_un).join(''); }
function keyEquals(given, expected) {
  const a = Buffer.from(String(given || '')), b = Buffer.from(String(expected || ''));
  if (a.length !== b.length) { crypto.timingSafeEqual(b, b); return false; }
  return crypto.timingSafeEqual(a, b);
}

// ---------------- generated docs (--gen-docs) ----------------
if (process.argv.includes('--gen-docs')) {
  const byFeature = f => TESTS.filter(t => t.feature === f);
  let vuln = '# HexaAgri — Vulnerability Map (LAB 105)\n\nEvery scored test in the lab, grouped by feature. Each flaw is a real, working vulnerability in the app — tests complete only when the exploit\'s real effect happens server-side.\n';
  for (const f of FEATURES) {
    vuln += '\n## ' + f + '\n';
    for (const t of byFeature(f)) {
      vuln += '\n### ' + t.name + '\n- **OWASP:** ' + t.owasp + '\n- **Difficulty:** ' + t.difficulty + '\n- **Where:** ' + f + ' flows in server.js\n- **Exploitation outline:** ' + t.hints[2] + '\n- **Impact:** ' + t.impact + '\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'), vuln);
  const rank = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  let guide = '# HexaAgri — Practice Guide (LAB 105)\n\nChallenges grouped by feature, then difficulty. A challenge is complete when the app records the exploit\'s real effect — watch your progress on /tests.\n';
  for (const f of FEATURES) {
    guide += '\n## ' + f + '\n';
    for (const t of byFeature(f).sort((a, b) => rank[a.difficulty] - rank[b.difficulty])) {
      guide += '\n### [' + t.difficulty + '] ' + t.name + '\n- **Objective:** Demonstrate the flaw — ' + t.name + ' — so its real effect happens in the app.\n- **Hint 1:** ' + t.hints[0] + '\n- **Hint 2:** ' + t.hints[1] + '\n- **Hint 3:** ' + t.hints[2] + '\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'), guide);
  let fix = '# HexaAgri — Fix & Retest Notes (LAB 105)\n\nFor every scored test: how it is written in a real client report, the secure implementation, and a regression retest.\n';
  for (const t of TESTS) {
    fix += '\n## ' + t.report.title + '\n- **Severity:** ' + t.report.severity + '\n- **Feature:** ' + t.feature + '\n- **Secure implementation / remediation:** ' + t.report.remediation + '\n- **Regression retest:** Re-run the original exploit after the fix — it must fail (no session created, no foreign object served, no state changed) — then confirm the legitimate flow still works for an authorized user.\n';
  }
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'), fix);
  console.log('docs generated for ' + TESTS.length + ' tests');
  process.exit(0);
}

// ---------------- UI ----------------
const CSS = 'body{font-family:system-ui,Arial,sans-serif;margin:0;background:#f4f7f0;color:#20301c}header{background:#2e5d23;color:#fff;padding:10px 18px;display:flex;align-items:center;gap:14px}header img{height:38px}header .ttl{font-weight:700;font-size:18px}header .barwrap{flex:1;max-width:420px}.bar{background:#ffffff33;border-radius:6px;height:10px;overflow:hidden}.bar>div{background:#ffd34d;height:100%}main{max-width:960px;margin:18px auto;padding:0 16px}nav a{color:#d9f2c9;margin-right:12px;text-decoration:none;font-size:14px}.card{background:#fff;border:1px solid #d8e2cf;border-radius:10px;padding:16px;margin:12px 0}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #e3ead9;padding:6px 8px;text-align:left;font-size:14px}input,select,textarea{padding:7px;border:1px solid #b9c8ab;border-radius:6px;margin:3px 0}button{background:#2e5d23;color:#fff;border:0;padding:8px 14px;border-radius:6px;cursor:pointer}.muted{color:#6b7a63;font-size:13px}.done{color:#2e7d32;font-weight:700}.open{color:#a66a00}#chatbox{position:fixed;right:14px;bottom:14px;width:320px;background:#fff;border:1px solid #b9c8ab;border-radius:10px;box-shadow:0 4px 18px #0002;z-index:50}#chatbox .hd{background:#2e5d23;color:#fff;padding:8px 12px;border-radius:10px 10px 0 0;font-weight:700}#chatlog{height:180px;overflow:auto;padding:10px;font-size:13px}#chatlog div{margin:6px 0}#chatbox form{display:flex;border-top:1px solid #e3ead9}#chatbox input{flex:1;border:0;padding:9px}#cert{max-width:640px;margin:30px auto;background:#fff;border:3px double #2e5d23;border-radius:12px;padding:30px;text-align:center}@media print{#chatbox{display:none}}';
const CHAT_WIDGET = '<div id="chatbox"><div class="hd">🌱 Lab Coach — HexaAgri</div><div id="chatlog"><div><b>Coach:</b> Hi! I am the HexaAgri Lab Coach. Ask me about features, test counts, or — after 3 real tries on a feature — step-by-step help.</div></div><form id="chatform"><input id="chatin" placeholder="Ask the coach..." autocomplete="off"><button type="submit">Send</button></form></div><script>document.getElementById("chatform").addEventListener("submit",async function(e){e.preventDefault();var inp=document.getElementById("chatin");var log=document.getElementById("chatlog");var m=inp.value.trim();if(!m)return;log.innerHTML+="<div><b>You:</b> "+m.replace(/</g,"&lt;")+"</div>";inp.value="";try{var r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:m})});var j=await r.json();log.innerHTML+="<div><b>Coach:</b> "+String(j.reply).replace(/</g,"&lt;")+"</div>";}catch(err){log.innerHTML+="<div><b>Coach:</b> (connection hiccup — try again)</div>";}log.scrollTop=log.scrollHeight;});</script>';
function layout(user, title, content) {
  const p = progress();
  const nav = user ? '<nav><a href="/">Home</a><a href="/farms">Farms</a><a href="/search">Search</a><a href="/inventory">Inventory</a><a href="/market">Market</a><a href="/equipment">Equipment</a><a href="/team">Team</a><a href="/subsidies">Subsidies</a><a href="/tests">Tests</a><a href="/profile">Profile</a><a href="/logout">Logout (' + esc(user.name) + ')</a></nav>' : '<nav><a href="/tests">Tests</a></nav>';
  return '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(title) + ' — HexaAgri (LAB 105)</title><style>' + CSS + '</style></head><body><header><img src="/logo.png" alt="HexaCyberLab"><div><div class="ttl">LAB 105 — HexaAgri</div>' + nav + '</div><div class="barwrap"><div style="font-size:12px">LAB 105 · ' + p.done + '/' + p.total + ' tests · ' + p.pct + '%</div><div class="bar"><div style="width:' + p.pct + '%"></div></div></div></header><main>' + content + '</main>' + CHAT_WIDGET + '</body></html>';
}
function gatePage(err) {
  return '<!doctype html><html><head><meta charset="utf-8"><title>Locked — LAB 105 HexaAgri</title><style>' + CSS + '</style></head><body><main><div class="card" style="text-align:center;margin-top:60px"><img src="/logo.png" style="height:64px"><h2>Locked — LAB 105 · HexaAgri</h2><p>This lab is locked. Paste the completion key from Lab 104 to start.</p>' + (err ? '<p style="color:#b00">' + esc(err) + '</p>' : '') + '<form method="POST" action="/unlock"><input name="key" size="42" placeholder="Completion key from Lab 104" autocomplete="off"> <button type="submit">Unlock</button></form><p class="muted">HexaCyberLab practice labs run locally only, with fake data.</p></div></main>' + CHAT_WIDGET + '</body></html>';
}

// ---------------- Lab Coach ----------------
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
function coach(rawMsg) {
  const msg = String(rawMsg || '').toLowerCase();
  const p = progress();
  if (/who (built|made|created)|who is (md|jony)|founder|hexacyberlab/.test(msg)) return ATTRIBUTION;
  if (/(completion key|the key|next lab|unlock next)/.test(msg)) {
    if (p.complete && state.keyRevealed) return 'You completed LAB 105 — congratulations! Your completion key is: ' + completionKey() + ' — use it to unlock Lab 106.';
    return "I don't have the completion key yet — I only receive it when the lab is completed 100%. Right now you are at " + p.pct + '% (' + p.done + '/' + p.total + ' tests). Finish every test and ask me again.';
  }
  let feature = null;
  for (const f of FEATURES) { if (FEATURE_KEYS[f].some(k => msg.includes(k))) { feature = f; break; } }
  if (/how many|how much|count|list|features|tests|vulnerab/.test(msg) && !/how (do|to|can)/.test(msg)) {
    if (feature) {
      const ft = TESTS.filter(t => t.feature === feature);
      return feature + ' has ' + ft.length + ' tests: ' + ft.map(t => t.name + (state.tests[t.id] ? ' (done)' : '')).join('; ') + '. You have tried this feature ' + (state.attempts[feature] || 0) + ' time(s).';
    }
    return 'HexaAgri has ' + FEATURES.length + ' features and ' + TESTS.length + ' scored tests: ' + FEATURES.map(f => f + ' (' + TESTS.filter(t => t.feature === f).length + ')').join(', ') + '. Your progress: ' + p.done + '/' + p.total + ' (' + p.pct + '%). See /tests for the full Mission Board.';
  }
  if (feature) {
    const att = state.attempts[feature] || 0;
    const ft = TESTS.filter(t => t.feature === feature);
    const allDone = ft.every(t => state.tests[t.id]);
    if (allDone) return 'You have already completed every test in ' + feature + ' — nice work! Pick another feature from /tests.';
    if (att >= 3) return GUIDE[feature];
    return "That feature is locked for help. First try the " + feature + " tests yourself at least 3 times — I can see you've tried " + att + " time(s) so far. After 3 real tries, ask me again and I'll guide you step by step.";
  }
  if (/^(hi|hello|hey|help|start)/.test(msg) || msg.length < 3) {
    const next = TESTS.find(t => !state.tests[t.id]);
    return 'Welcome to LAB 105 — HexaAgri, an agriculture management platform (farms, crops, harvest inventory, sales, equipment, workers, subsidies). Progress: ' + p.done + '/' + p.total + ' tests (' + p.pct + '%).' + (next ? ' Next open test: "' + next.name + '" in ' + next.feature + ' — see /tests, try it at least 3 times, then ask me how.' : ' Everything is complete — visit /complete for your key and certificate!');
  }
  return 'I can help with the HexaAgri tests: ask me how many tests a feature has, or ask "how" about a feature after you have tried it at least 3 times (the 3-try rule). The /tests page lists every challenge with graded hints. I only discuss vulnerabilities that are in this lab\'s registry.';
}

// ---------------- pages ----------------
function loginPage(err) {
  return layout(null, 'Login', '<div class="card"><h2>Sign in to HexaAgri</h2>' + (err ? '<p style="color:#b00">' + esc(err) + '</p>' : '') +
    '<form method="POST" action="/login"><label>Email<br><input name="email" size="34"></label><br><label>Password<br><input name="password" type="password" size="34"></label><br><button type="submit">Sign in</button></form>' +
    '<p class="muted">Demo nursery account (published for training): nursery@greenvalley.local / sprout123</p>' +
    '<p><a href="/register">Create an account</a> · <a href="/forgot">Forgot password?</a></p></div>');
}
function registerPage(err) {
  return layout(null, 'Register', '<div class="card"><h2>Create your HexaAgri account</h2>' + (err ? '<p style="color:#b00">' + esc(err) + '</p>' : '') +
    '<form method="POST" action="/register"><label>Display name<br><input name="name" size="34"></label><br><label>Email<br><input name="email" size="34"></label><br><label>Password<br><input name="password" type="password" size="34"></label><br><button type="submit">Register</button></form></div>');
}

// ---------------- server ----------------
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://127.0.0.1');
    const pth = u.pathname;
    const method = req.method;
    const cookies = parseCookies(req);

    if (pth === '/logo.png') {
      try { const img = fs.readFileSync(path.join(DIR, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(img); }
      catch (e) { res.writeHead(404); return res.end('no logo'); }
    }
    if (pth === '/api/progress') return sendJson(res, 200, progress());
    if (pth === '/api/chat' && method === 'POST') {
      const b = await parseBody(req);
      return sendJson(res, 200, { reply: coach(b.message) });
    }
    if (pth === '/unlock' && method === 'POST') {
      const b = await parseBody(req);
      if (entryKeyMatches(b.key)) { state.unlocked = true; save(); return redirect(res, '/'); }
      res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(gatePage('That key was not accepted.'));
    }
    if (pth === '/api/debug') {
      attempt('Admin & Platform'); pass('api-debug');
      return sendJson(res, 200, { users: DB.users, farms: DB.farms, crops: DB.crops, lots: DB.lots, orders: DB.orders, invoices: DB.invoices, subsidies: DB.subsidies });
    }

    // lock gate
    if (!state.unlocked) { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(gatePage()); }

    const user = currentUser(req);

    // ----- auth routes -----
    if (pth === '/login' && method === 'GET') return sendHtml(res, 200, loginPage());
    if (pth === '/login' && method === 'POST') {
      const b = await parseBody(req);
      attempt('Login & Authentication');
      const email = String(b.email || ''), password = String(b.password || '');
      const exists = DB.users.find(x => x.email === email);
      if (!exists) {
        if (!state.enumProbes.includes(email)) { state.enumProbes.push(email); save(); }
        if (state.enumProbes.length >= 5) pass('auth-enum');
      }
      const query = "SELECT * FROM users WHERE email = '" + email + "' AND password = '" + password + "'";
      const matched = evalUserQuery(query);
      if (matched && matched.active !== false) {
        if (password !== matched.password) pass('auth-sqli');
        if (matched.email === 'nursery@greenvalley.local' && password === 'sprout123') pass('auth-default');
        return redirect(res, '/', newSession(res, matched.id));
      }
      if (exists) {
        state.brute[email] = (state.brute[email] || 0) + 1; save();
        if (state.brute[email] >= 10) pass('auth-brute');
        return sendHtml(res, 200, loginPage('Incorrect password for this account.'));
      }
      return sendHtml(res, 200, loginPage('No account found for that email address.'));
    }
    if (pth === '/logout') {
      const sid = cookies.hx_session; if (sid) sessions.delete(sid);
      return redirect(res, '/login');
    }
    if (pth === '/register' && method === 'GET') return sendHtml(res, 200, registerPage());
    if (pth === '/register' && method === 'POST') {
      const b = await parseBody(req);
      attempt('Registration & Profile');
      const name = String(b.name || 'New Farmer'), email = String(b.email || ''), password = String(b.password || '');
      if (!email || DB.users.some(x => x.email === email)) return sendHtml(res, 200, registerPage('That email is unavailable.'));
      if (password.length < 4) pass('reg-weakpass');
      let role = 'owner';
      if (b.role && ['owner', 'worker', 'manager', 'admin'].includes(String(b.role))) role = String(b.role);
      let balance = 0;
      if (b.balance !== undefined && !isNaN(Number(b.balance))) balance = Number(b.balance);
      if ((b.role && String(b.role) !== 'owner') || balance > 0) pass('reg-mass');
      if (XSS_RE.test(name)) pass('reg-xss');
      const nu = { id: nextId.user++, name, email, password, role, farmId: b.farmId ? Number(b.farmId) : null, balance, active: true };
      DB.users.push(nu);
      return redirect(res, '/', newSession(res, nu.id));
    }
    if (pth === '/forgot' && method === 'GET') {
      return sendHtml(res, 200, layout(null, 'Forgot password', '<div class="card"><h2>Forgot password</h2><form method="POST" action="/forgot"><label>Email<br><input name="email" size="34"></label><br><button type="submit">Issue reset token</button></form><p class="muted">Then set a new password on the <a href="/reset">reset page</a>.</p></div>'));
    }
    if (pth === '/forgot' && method === 'POST') {
      const b = await parseBody(req);
      attempt('Login & Authentication');
      const email = String(b.email || '');
      const t = DB.users.find(x => x.email === email);
      if (t) {
        t.resetToken = resetTokenFor(t.id);
        return sendHtml(res, 200, layout(null, 'Forgot password', '<div class="card"><h2>Reset token issued</h2><p>A reset token was issued for that account (simulated email): <b>' + esc(t.resetToken) + '</b></p><p>Use it on the <a href="/reset">reset page</a>.</p></div>'));
      }
      if (!state.enumProbes.includes(email)) { state.enumProbes.push(email); save(); }
      if (state.enumProbes.length >= 5) pass('auth-enum');
      return sendHtml(res, 200, layout(null, 'Forgot password', '<div class="card"><h2>No account with that email</h2><p>There is no HexaAgri account for that email address.</p></div>'));
    }
    if (pth === '/reset' && method === 'GET') {
      return sendHtml(res, 200, layout(null, 'Reset password', '<div class="card"><h2>Reset password</h2><form method="POST" action="/reset"><label>Email<br><input name="email" size="34"></label><br><label>Reset token<br><input name="token" size="34"></label><br><label>New password<br><input name="password" type="password" size="34"></label><br><button type="submit">Set new password</button></form></div>'));
    }
    if (pth === '/reset' && method === 'POST') {
      const b = await parseBody(req);
      attempt('Login & Authentication');
      const t = DB.users.find(x => x.email === String(b.email || ''));
      if (t && String(b.token || '') === resetTokenFor(t.id)) {
        if (t.resetToken !== String(b.token)) pass('auth-reset');
        t.password = String(b.password || 'changed123'); t.resetToken = null;
        return redirect(res, '/login');
      }
      return sendHtml(res, 200, layout(null, 'Reset password', '<div class="card"><p style="color:#b00">That token was not accepted.</p><p><a href="/reset">Try again</a></p></div>'));
    }

    // ----- mission board / completion (no login needed, still gated) -----
    if (pth === '/tests') {
      let h = '<h2>Mission Board — LAB 105 HexaAgri</h2>';
      for (const f of FEATURES) {
        const ft = TESTS.filter(t => t.feature === f);
        h += '<div class="card"><h3>' + esc(f) + ' <span class="muted">(' + ft.filter(t => state.tests[t.id]).length + '/' + ft.length + ' done · ' + (state.attempts[f] || 0) + ' attempts)</span></h3>';
        for (const t of ft) {
          h += '<div style="margin:10px 0"><span class="' + (state.tests[t.id] ? 'done' : 'open') + '">' + (state.tests[t.id] ? '✓' : '○') + '</span> <b>' + esc(t.name) + '</b> <span class="muted">' + esc(t.owasp) + ' · ' + esc(t.difficulty) + '</span>' +
            '<details><summary>Hint 1</summary><p>' + esc(t.hints[0]) + '</p><details><summary>Hint 2</summary><p>' + esc(t.hints[1]) + '</p><details><summary>Hint 3</summary><p>' + esc(t.hints[2]) + '</p></details></details></details></div>';
        }
        h += '</div>';
      }
      return sendHtml(res, 200, layout(user, 'Tests', h));
    }
    if (pth === '/complete' && method === 'POST') {
      const b = await parseBody(req);
      if (b.testerName) { state.testerName = String(b.testerName).slice(0, 60); save(); }
      return redirect(res, '/complete');
    }
    if (pth === '/complete') {
      const p = progress();
      if (!p.complete) {
        const left = TESTS.filter(t => !state.tests[t.id]);
        return sendHtml(res, 200, layout(user, 'Progress', '<div class="card"><h2>Lab not complete yet — ' + p.done + '/' + p.total + ' (' + p.pct + '%)</h2><p>Still open:</p><ul>' + left.map(t => '<li>' + esc(t.name) + ' <span class="muted">(' + esc(t.feature) + ')</span></li>').join('') + '</ul><p><a href="/tests">Open the Mission Board</a></p></div>'));
      }
      let h = '<div class="card"><h2>🎉 LAB 105 — HexaAgri complete!</h2>';
      h += '<h3>1) Total features in this lab</h3><p>' + FEATURES.length + ' features, ' + TESTS.length + ' scored tests.</p>';
      h += '<h3>2) Vulnerabilities per feature</h3><table>' + FEATURES.map(f => '<tr><td>' + esc(f) + '</td><td>' + TESTS.filter(t => t.feature === f).length + '</td></tr>').join('') + '</table>';
      h += '<h3>3) How testing was done — ' + TESTS.length + ' techniques</h3><ul>' + TESTS.map(t => '<li>' + esc(t.name) + '</li>').join('') + '</ul>';
      h += '<h3>4) What you learned</h3><ul>' + TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.lesson) + '</li>').join('') + '</ul>';
      h += '<h3>5) What this means for a real client</h3><ul>' + TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.impact) + '</li>').join('') + '</ul>';
      h += '<h3>6) Writing it in a real report</h3><table><tr><th>Finding</th><th>Severity</th><th>Remediation</th></tr>' + TESTS.map(t => '<tr><td>' + esc(t.report.title) + '</td><td>' + esc(t.report.severity) + '</td><td>' + esc(t.report.remediation) + '</td></tr>').join('') + '</table>';
      h += '<h3>Your completion key (unlocks Lab 106)</h3><p style="font-size:20px"><code>' + esc(completionKey()) + '</code></p>';
      h += '<form method="POST" action="/complete"><label>Your name for the certificate<br><input name="testerName" size="34" value="' + esc(state.testerName || '') + '"></label> <button type="submit">Save name</button></form>';
      h += '<p><a href="/certificate">View your certificate</a></p></div>';
      return sendHtml(res, 200, layout(user, 'Complete', h));
    }
    if (pth === '/certificate') {
      const p = progress();
      if (!p.complete) return redirect(res, '/complete');
      const name = state.testerName || (user ? user.name : 'HexaAgri Tester');
      const date = state.completedAt ? new Date(state.completedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      const body = '<div id="cert"><img src="/logo.png" style="height:70px"><h2>Certificate of Completion</h2><p>This certifies that</p><h3>' + esc(name) + '</h3><p>has completed 100% of the security tests in<br><b>LAB 105 — HexaAgri</b> (' + TESTS.length + ' tests across ' + FEATURES.length + ' features)</p><p class="muted">Completed on ' + esc(date) + '</p><p><b>HexaCyberLab — Built by Md. Jony Hassain, Founder</b></p></div>';
      return sendHtml(res, 200, layout(user, 'Certificate', body));
    }

    // ----- everything below needs a session -----
    if (!user) return redirect(res, '/login');

    if (pth === '/') {
      const myFarm = DB.farms.find(f => f.id === user.farmId);
      return sendHtml(res, 200, layout(user, 'Home', '<div class="card"><h2>Welcome, ' + esc(user.name) + '</h2><p>Role: <b>' + esc(user.role) + '</b>' + (myFarm ? ' · Farm: <b>' + esc(myFarm.name) + '</b>' : '') + ' · Wallet balance: $' + user.balance + '</p><p>Manage your farm, crops, harvest inventory and sales — and hunt the ' + TESTS.length + ' security tests on the <a href="/tests">Mission Board</a>.</p></div>'));
    }
    if (pth === '/profile' && method === 'GET') {
      return sendHtml(res, 200, layout(user, 'Profile', '<div class="card"><h2>Profile</h2><p>' + esc(user.name) + ' (' + esc(user.email) + ') — role <b>' + esc(user.role) + '</b></p><form method="POST" action="/profile"><label>Display name<br><input name="name" size="34" value="' + esc(user.name) + '"></label><br><button type="submit">Update profile</button></form></div>'));
    }
    if (pth === '/profile' && method === 'POST') {
      const b = await parseBody(req);
      attempt('Registration & Profile');
      const name = String(b.name || user.name);
      if (XSS_RE.test(name)) pass('reg-xss');
      user.name = name;
      return redirect(res, '/profile');
    }
    if (pth === '/farms') {
      const rows = DB.farms.filter(f => f.published || f.ownerId === user.id || user.role === 'admin' || user.role === 'manager')
        .map(f => '<tr><td><a href="/farms/' + f.id + '">' + esc(f.name) + '</a></td><td>' + esc(f.location) + '</td><td>' + (f.published ? 'Published' : 'Unlisted') + '</td></tr>').join('');
      return sendHtml(res, 200, layout(user, 'Farms', '<div class="card"><h2>Farms</h2><table><tr><th>Farm</th><th>Location</th><th>Status</th></tr>' + rows + '</table></div>'));
    }
    const mFarm = pth.match(/^\/farms\/(\d+)$/);
    if (mFarm && method === 'GET') {
      attempt('Farms & Search');
      const farm = DB.farms.find(f => f.id === Number(mFarm[1]));
      if (!farm) { res.writeHead(404); return res.end('not found'); }
      if (farm.ownerId !== user.id && user.role !== 'admin' && user.role !== 'manager') pass('farm-idor');
      const owner = DB.users.find(x => x.id === farm.ownerId);
      const crops = DB.crops.filter(c => c.farmId === farm.id).map(c => '<li><a href="/crops/' + c.id + '">' + esc(c.name) + '</a> — expected yield ' + c.expectedYield + ' kg</li>').join('');
      const lots = DB.lots.filter(l => l.farmId === farm.id).map(l => '<li>' + esc(l.label) + ' — ' + l.qty + ' kg @ $' + l.pricePerKg + '/kg</li>').join('');
      return sendHtml(res, 200, layout(user, 'Farm', '<div class="card"><h2>' + farm.name + '</h2><p>Owner: ' + (owner ? owner.name : '?') + ' · ' + esc(farm.location) + ' · ' + (farm.published ? 'Published' : 'Unlisted') + '</p><p><i>Internal notes: ' + esc(farm.notes) + '</i></p><h3>Crops</h3><ul>' + crops + '</ul><h3>Harvest lots</h3><ul>' + lots + '</ul></div>'));
    }
    if (pth === '/search') {
      attempt('Farms & Search');
      const q = u.searchParams.get('q') || '';
      let results;
      if (/'\s*(or|and)\s/i.test(q) || q.includes('--') || /'\s*=\s*'/.test(q)) {
        results = DB.farms; pass('search-sqli');
      } else {
        const ql = q.toLowerCase();
        results = DB.farms.filter(f => f.published && (f.name.toLowerCase().includes(ql) || f.location.toLowerCase().includes(ql) || DB.crops.some(c => c.farmId === f.id && c.name.toLowerCase().includes(ql))));
      }
      if (XSS_RE.test(q)) pass('search-xss');
      const rows = results.map(f => '<tr><td><a href="/farms/' + f.id + '">' + esc(f.name) + '</a></td><td>' + esc(f.location) + '</td><td>' + (f.published ? 'Published' : 'Unlisted') + '</td></tr>').join('');
      // NOTE: the raw query is reflected unescaped on purpose (reflected-XSS test).
      return sendHtml(res, 200, layout(user, 'Search', '<div class="card"><h2>Search farms</h2><form method="GET" action="/search"><input name="q" size="34" value="' + esc(q) + '"> <button type="submit">Search</button></form><p>Results for: ' + q + '</p><table><tr><th>Farm</th><th>Location</th><th>Status</th></tr>' + rows + '</table></div>'));
    }
    const mCrop = pth.match(/^\/crops\/(\d+)$/);
    if (mCrop && method === 'GET') {
      attempt('Crops & Fields');
      const crop = DB.crops.find(c => c.id === Number(mCrop[1]));
      if (!crop) { res.writeHead(404); return res.end('not found'); }
      const field = DB.fields.find(f => f.id === crop.fieldId);
      return sendHtml(res, 200, layout(user, 'Crop', '<div class="card"><h2>' + esc(crop.name) + '</h2><p>Farm #' + crop.farmId + ' · Field: ' + (field ? esc(field.name) : '?') + ' · Expected yield: ' + crop.expectedYield + ' kg · Harvested: ' + (field && field.harvested ? 'yes' : 'no') + '</p>' +
        '<form method="POST" action="/crops/' + crop.id + '/edit"><label>Crop name<br><input name="name" size="30" value="' + esc(crop.name) + '"></label> <button type="submit">Save name</button></form>' +
        '<form method="POST" action="/crops/' + crop.id + '/yield"><label>Expected yield (kg)<br><input name="expectedYield" size="12" value="' + crop.expectedYield + '"></label> <button type="submit">Update yield</button></form>' +
        (field ? '<form method="POST" action="/fields/' + field.id + '/harvest"><button type="submit">Harvest this field</button></form>' : '') + '</div>'));
    }
    const mCropEdit = pth.match(/^\/crops\/(\d+)\/edit$/);
    if (mCropEdit && method === 'POST') {
      const b = await parseBody(req);
      attempt('Crops & Fields');
      const crop = DB.crops.find(c => c.id === Number(mCropEdit[1]));
      if (!crop) { res.writeHead(404); return res.end('not found'); }
      if (crop.farmId !== user.farmId && user.role !== 'admin') pass('crop-idor');
      crop.name = String(b.name || crop.name);
      return redirect(res, '/crops/' + crop.id);
    }
    const mCropYield = pth.match(/^\/crops\/(\d+)\/yield$/);
    if (mCropYield && method === 'POST') {
      const b = await parseBody(req);
      attempt('Crops & Fields');
      const crop = DB.crops.find(c => c.id === Number(mCropYield[1]));
      if (!crop) { res.writeHead(404); return res.end('not found'); }
      const y = Number(b.expectedYield);
      if (!isNaN(y)) { if (y > 20000) pass('crop-yield'); crop.expectedYield = y; }
      return redirect(res, '/crops/' + crop.id);
    }
    const mHarvest = pth.match(/^\/fields\/(\d+)\/harvest$/);
    if (mHarvest && method === 'POST') {
      await parseBody(req);
      attempt('Crops & Fields');
      const field = DB.fields.find(f => f.id === Number(mHarvest[1]));
      if (!field) { res.writeHead(404); return res.end('not found'); }
      if (field.farmId !== user.farmId && user.role !== 'admin') pass('field-harvest');
      field.harvested = true;
      const crop = DB.crops.find(c => c.id === field.cropId);
      DB.lots.push({ id: nextId.lot++, farmId: field.farmId, cropId: field.cropId, label: (crop ? crop.name : 'Harvest') + ' — fresh lot', qty: 500, pricePerKg: 30 });
      return redirect(res, '/inventory');
    }
    if (pth === '/inventory') {
      attempt('Harvest Inventory');
      const mine = (user.role === 'admin' || user.role === 'manager') ? DB.lots : DB.lots.filter(l => l.farmId === user.farmId);
      const rows = mine.map(l => '<tr><td>' + esc(l.label) + '</td><td>' + l.qty + ' kg</td><td>$' + l.pricePerKg + '/kg</td><td><form method="POST" action="/inventory/' + l.id + '/adjust"><input name="qty" size="8" value="' + l.qty + '"> <button type="submit">Adjust</button></form></td></tr>').join('');
      return sendHtml(res, 200, layout(user, 'Inventory', '<div class="card"><h2>Harvest inventory (your farm)</h2><table><tr><th>Lot</th><th>Quantity</th><th>Price</th><th>Adjust stock</th></tr>' + rows + '</table></div>'));
    }
    const mAdj = pth.match(/^\/inventory\/(\d+)\/adjust$/);
    if (mAdj && method === 'POST') {
      const b = await parseBody(req);
      attempt('Harvest Inventory');
      const lot = DB.lots.find(l => l.id === Number(mAdj[1]));
      if (!lot) { res.writeHead(404); return res.end('not found'); }
      const nq = Number(b.qty);
      if (!isNaN(nq)) {
        if (nq < 0) pass('inv-negative');
        if (nq > lot.qty + 50) pass('inv-inflate');
        lot.qty = nq;
      }
      return redirect(res, '/inventory');
    }
    if (pth === '/market') {
      const rows = DB.lots.map(l => '<tr><td>' + esc(l.label) + '</td><td>' + l.qty + ' kg</td><td>$' + l.pricePerKg + '/kg</td><td><form method="POST" action="/orders"><input type="hidden" name="lotId" value="' + l.id + '"><input name="qty" size="6" value="10"> kg @ <input name="price" size="6" value="' + l.pricePerKg + '"> <button type="submit">Buy</button></form></td></tr>').join('');
      return sendHtml(res, 200, layout(user, 'Market', '<div class="card"><h2>Produce market</h2><table><tr><th>Lot</th><th>Available</th><th>Price</th><th>Order</th></tr>' + rows + '</table><p><a href="/orders">My orders</a></p></div>'));
    }
    if (pth === '/orders' && method === 'POST') {
      const b = await parseBody(req);
      attempt('Sales & Orders');
      const lot = DB.lots.find(l => l.id === Number(b.lotId));
      if (!lot) { res.writeHead(404); return res.end('not found'); }
      const qty = Number(b.qty) || 0;
      const usedPrice = (b.price !== undefined && b.price !== '' && !isNaN(Number(b.price))) ? Number(b.price) : lot.pricePerKg;
      if (usedPrice !== lot.pricePerKg) pass('order-price');
      if (qty > lot.qty) pass('order-oversell');
      lot.qty -= qty;
      const order = { id: nextId.order++, buyerId: user.id, lotId: lot.id, qty, price: usedPrice, total: usedPrice * qty };
      DB.orders.push(order);
      DB.invoices.push({ id: nextId.invoice++, orderId: order.id, buyerId: user.id, amount: order.total });
      return redirect(res, '/orders/' + order.id);
    }
    if (pth === '/orders') {
      const rows = DB.orders.filter(o => o.buyerId === user.id).map(o => '<tr><td><a href="/orders/' + o.id + '">Order #' + o.id + '</a></td><td>' + o.qty + ' kg</td><td>$' + o.total + '</td></tr>').join('');
      return sendHtml(res, 200, layout(user, 'Orders', '<div class="card"><h2>My orders</h2><table>' + rows + '</table></div>'));
    }
    const mOrder = pth.match(/^\/orders\/(\d+)$/);
    if (mOrder && method === 'GET') {
      attempt('Sales & Orders');
      const o = DB.orders.find(x => x.id === Number(mOrder[1]));
      if (!o) { res.writeHead(404); return res.end('not found'); }
      if (o.buyerId !== user.id && user.role !== 'admin') pass('order-idor');
      const inv = DB.invoices.find(i => i.orderId === o.id);
      return sendHtml(res, 200, layout(user, 'Order', '<div class="card"><h2>Order #' + o.id + '</h2><p>Buyer #' + o.buyerId + ' · Lot #' + o.lotId + ' · ' + o.qty + ' kg @ $' + o.price + '/kg · Total $' + o.total + '</p>' + (inv ? '<p><a href="/invoices/' + inv.id + '">View invoice #' + inv.id + '</a></p>' : '') + '</div>'));
    }
    const mInv = pth.match(/^\/invoices\/(\d+)$/);
    if (mInv && method === 'GET') {
      attempt('Sales & Orders');
      const inv = DB.invoices.find(i => i.id === Number(mInv[1]));
      if (!inv) { res.writeHead(404); return res.end('not found'); }
      if (inv.buyerId !== user.id && user.role !== 'admin') pass('invoice-idor');
      return sendHtml(res, 200, layout(user, 'Invoice', '<div class="card"><h2>Invoice #' + inv.id + '</h2><p>Order #' + inv.orderId + ' · Buyer #' + inv.buyerId + ' · Amount due: <b>$' + inv.amount + '</b></p></div>'));
    }
    if (pth === '/equipment') {
      const eq = DB.equipment.filter(e => e.farmId === user.farmId || user.role === 'admin' || user.role === 'manager');
      const reqs = DB.maintRequests.map(r => {
        const e = DB.equipment.find(x => x.id === r.equipId);
        return '<tr><td>' + (e ? esc(e.name) : '?') + '</td><td>' + esc(r.note) + '</td><td>' + esc(r.status) + '</td><td>' + (r.status === 'pending' ? '<form method="POST" action="/equipment/requests/' + r.id + '/approve"><button type="submit">Approve</button></form>' : '') + '</td></tr>';
      }).join('');
      const opts = eq.map(e => '<option value="' + e.id + '">' + esc(e.name) + '</option>').join('');
      return sendHtml(res, 200, layout(user, 'Equipment', '<div class="card"><h2>Equipment</h2><ul>' + eq.map(e => '<li>' + esc(e.name) + '</li>').join('') + '</ul><h3>Maintenance requests</h3><table><tr><th>Equipment</th><th>Note</th><th>Status</th><th></th></tr>' + reqs + '</table><h3>New maintenance request</h3><form method="POST" action="/equipment/requests"><select name="equipId">' + opts + '</select> <input name="note" size="30" placeholder="Describe the problem"> <button type="submit">File request</button></form></div>'));
    }
    if (pth === '/equipment/requests' && method === 'POST') {
      const b = await parseBody(req);
      attempt('Equipment & Maintenance');
      DB.maintRequests.push({ id: nextId.maint++, equipId: Number(b.equipId) || 1, requesterId: user.id, note: String(b.note || ''), status: 'pending' });
      return redirect(res, '/equipment');
    }
    const mApprove = pth.match(/^\/equipment\/requests\/(\d+)\/approve$/);
    if (mApprove && method === 'POST') {
      await parseBody(req);
      attempt('Equipment & Maintenance');
      const r = DB.maintRequests.find(x => x.id === Number(mApprove[1]));
      if (!r) { res.writeHead(404); return res.end('not found'); }
      if (user.role !== 'manager' && user.role !== 'admin') pass('equip-maint-approve');
      r.status = 'approved';
      return redirect(res, '/equipment');
    }
    if (pth === '/team') {
      const mates = DB.users.filter(x => x.farmId === user.farmId || user.role === 'admin');
      const rows = mates.map(x => '<tr><td>' + x.name + '</td><td>' + esc(x.email) + '</td><td>' + esc(x.role) + '</td><td><form method="POST" action="/workers/' + x.id + '/role"><select name="role"><option>worker</option><option>owner</option><option>manager</option><option>admin</option></select> <button type="submit">Set role</button></form></td></tr>').join('');
      return sendHtml(res, 200, layout(user, 'Team', '<div class="card"><h2>Farm team</h2><table><tr><th>Name</th><th>Email</th><th>Role</th><th>Change role</th></tr>' + rows + '</table></div>'));
    }
    const mRole = pth.match(/^\/workers\/(\d+)\/role$/);
    if (mRole && method === 'POST') {
      const b = await parseBody(req);
      attempt('Workers & Subsidies');
      const t = DB.users.find(x => x.id === Number(mRole[1]));
      if (!t) { res.writeHead(404); return res.end('not found'); }
      if (user.role !== 'manager' && user.role !== 'admin') pass('worker-role');
      if (['worker', 'owner', 'manager', 'admin'].includes(String(b.role))) t.role = String(b.role);
      return redirect(res, '/team');
    }
    if (pth === '/subsidies' && method === 'GET') {
      const rows = DB.subsidies.filter(s => s.applicantId === user.id || user.role === 'admin' || user.role === 'manager').map(s => '<tr><td>' + esc(s.program) + '</td><td>$' + s.amount + '</td><td>' + esc(s.status) + '</td><td>' + (s.status === 'pending' ? '<form method="POST" action="/subsidies/' + s.id + '/approve"><button type="submit">Approve</button></form>' : '') + '</td></tr>').join('');
      return sendHtml(res, 200, layout(user, 'Subsidies', '<div class="card"><h2>Subsidy applications</h2><table><tr><th>Program</th><th>Amount</th><th>Status</th><th></th></tr>' + rows + '</table><h3>Apply for a subsidy</h3><form method="POST" action="/subsidies"><input name="program" size="26" placeholder="Program name"> <input name="amount" size="10" placeholder="Amount"> <button type="submit">Apply</button></form></div>'));
    }
    if (pth === '/subsidies' && method === 'POST') {
      const b = await parseBody(req);
      attempt('Workers & Subsidies');
      DB.subsidies.push({ id: nextId.subsidy++, applicantId: user.id, program: String(b.program || 'General Support'), amount: Number(b.amount) || 0, status: 'pending' });
      return redirect(res, '/subsidies');
    }
    const mSubApprove = pth.match(/^\/subsidies\/(\d+)\/approve$/);
    if (mSubApprove && method === 'POST') {
      await parseBody(req);
      attempt('Workers & Subsidies');
      const s = DB.subsidies.find(x => x.id === Number(mSubApprove[1]));
      if (!s) { res.writeHead(404); return res.end('not found'); }
      if (user.role !== 'manager' && user.role !== 'admin') pass('subsidy-approve');
      s.status = 'approved';
      return redirect(res, '/subsidies');
    }
    if (pth === '/manager') {
      const cookieRole = cookies.hx_role;
      const realOk = user.role === 'manager' || user.role === 'admin';
      const cookieOk = cookieRole === 'manager' || cookieRole === 'admin';
      if (!realOk && !cookieOk) { res.writeHead(403); return res.end(layout(user, 'Manager', '<div class="card"><h2>Manager console</h2><p>Managers only.</p></div>')); }
      if (!realOk && cookieOk) pass('auth-cookie');
      const rows = DB.farms.map(f => '<tr><td>' + esc(f.name) + '</td><td>' + esc(f.location) + '</td><td>' + (f.published ? 'Published' : 'Unlisted') + '</td></tr>').join('');
      const subs = DB.subsidies.map(s => '<tr><td>' + esc(s.program) + '</td><td>$' + s.amount + '</td><td>' + esc(s.status) + '</td></tr>').join('');
      return sendHtml(res, 200, layout(user, 'Manager', '<div class="card"><h2>Manager console — all farms</h2><table>' + rows + '</table><h3>Subsidies</h3><table>' + subs + '</table></div>'));
    }
    if (pth === '/admin') {
      if (user.role !== 'admin') { res.writeHead(403); return res.end(layout(user, 'Admin', '<div class="card"><h2>Admin panel</h2><p>Admins only.</p></div>')); }
      const rows = DB.users.map(x => '<tr><td>' + x.name + '</td><td>' + esc(x.email) + '</td><td>' + esc(x.password) + '</td><td>' + esc(x.role) + '</td><td>' + (x.active === false ? 'deactivated' : '<form method="POST" action="/admin/users/' + x.id + '/deactivate"><button type="submit">Deactivate</button></form>') + '</td></tr>').join('');
      return sendHtml(res, 200, layout(user, 'Admin', '<div class="card"><h2>Admin panel — all users</h2><table><tr><th>Name</th><th>Email</th><th>Password</th><th>Role</th><th></th></tr>' + rows + '</table></div>'));
    }
    const mDeact = pth.match(/^\/admin\/users\/(\d+)\/deactivate$/);
    if (mDeact && method === 'POST') {
      await parseBody(req);
      attempt('Admin & Platform');
      if (user.role !== 'admin') { res.writeHead(403); return res.end('admins only'); }
      const t = DB.users.find(x => x.id === Number(mDeact[1]));
      if (!t) { res.writeHead(404); return res.end('not found'); }
      if (!cookies.hx_origin) pass('admin-csrf');
      t.active = false;
      return redirect(res, '/admin');
    }

    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(layout(user, 'Not found', '<div class="card"><h2>404 — page not found</h2></div>'));
  } catch (err) {
    try { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ reply: 'The lab hit a snag but is still running — try again.' })); } catch (e) {}
  }
});
server.listen(PORT, HOST, () => { console.log('HexaAgri (LAB 105) listening on http://' + HOST + ':' + PORT); });
