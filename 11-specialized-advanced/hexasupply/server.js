'use strict';
/* HexaSupply — LAB 103 — HexaCyberLab vulnerable practice lab (LOCAL ONLY).
   Supply chain management platform with intentionally vulnerable flows.
   Zero-dependency Node.js. Binds 127.0.0.1:3112. All data is fake seed data. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB_NAME = 'HexaSupply';
const LAB_NUMBER = 103;
const PORT = 3112;
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const LOGO_FILE = path.join(DIR, 'logo.png');

/* ------------------------------------------------------------------ *
 * Assembler for protected values (see README "Completion key" note). *
 * ------------------------------------------------------------------ */
function _asm(parts) {
  return parts.map(p => Buffer.from(p, 'base64').toString('utf8').split('').reverse().join('')).join('');
}


/* ------------------------- TESTS registry ------------------------- */
const TESTS = [
  // Login & Authentication
  { id:'auth-sqli', feature:'Login & Authentication', name:'SQL injection login bypass', owasp:'A03:2021 Injection', difficulty:'Beginner',
    hints:['The login form builds its query by pasting your input straight into the SQL string.','Try closing the email string early and commenting out the rest of the query.','Use an email like admin@hexasupply.local\' -- with any password.'],
    lesson:'String-built SQL queries let an attacker rewrite the query logic and log in as anyone without a password.',
    impact:'On a real client platform this means full account takeover of admin accounts — the attacker walks in through the front door.',
    report:{ title:'SQL Injection in Login (Authentication Bypass)', severity:'Critical', remediation:'Use parameterised queries / prepared statements for all database access; never concatenate user input into SQL.' } },
  { id:'auth-brute', feature:'Login & Authentication', name:'Brute force — no rate limit or lockout', owasp:'A07:2021 Identification and Authentication Failures', difficulty:'Beginner',
    hints:['Keep guessing passwords for one account — nothing slows you down.','There is no CAPTCHA, delay or lockout after failed attempts.','Fail 10 times in a row for the same account and watch the app accept every attempt.'],
    lesson:'Without throttling, attackers can guess passwords indefinitely until one works.',
    impact:'A client\u2019s accounts can be cracked with automated password guessing, especially where users reuse weak passwords.',
    report:{ title:'Missing Brute-Force Protection on Login', severity:'High', remediation:'Add rate limiting, progressive delays and account lockout/alerting after repeated failed logins.' } },
  { id:'auth-enum', feature:'Login & Authentication', name:'User enumeration via login & forgot-password', owasp:'A07:2021 Identification and Authentication Failures', difficulty:'Beginner',
    hints:['Compare the messages for a real email vs an invented one — on login and on forgot-password.','The app helpfully confirms which accounts exist.','Probe at least 5 different emails and collect the differing responses.'],
    lesson:'Different error messages for real vs fake accounts hand attackers a verified target list for phishing and brute force.',
    impact:'Attackers learn exactly which employee emails have accounts, making every later attack cheaper and more convincing.',
    report:{ title:'Account Enumeration via Differential Responses', severity:'Medium', remediation:'Return identical, generic responses for existing and non-existing accounts on login and password reset.' } },
  { id:'auth-default', feature:'Login & Authentication', name:'Published demo credentials grant a real account', owasp:'A07:2021 Identification and Authentication Failures', difficulty:'Beginner',
    hints:['Read the login page carefully — it tells you more than it should.','A demo account is advertised right on the sign-in form.','Sign in with the demo credentials printed on the login page.'],
    lesson:'Demo/default accounts left active in production are a standing invitation — attackers try them first.',
    impact:'Anyone on the internet can sign in with the published demo account and explore the client\u2019s platform from the inside.',
    report:{ title:'Active Demo Account with Published Credentials', severity:'High', remediation:'Remove demo/default accounts from production and force unique credentials for every user.' } },
  { id:'auth-reset', feature:'Login & Authentication', name:'Predictable password-reset token', owasp:'A07:2021 Identification and Authentication Failures', difficulty:'Intermediate',
    hints:['Request a reset and study the token format — then look at a user id.','The token is computed from data you already know, not random.','Token = SUP-<id>-<id times 137 plus 42>. Compute one for a user who never requested a reset.'],
    lesson:'Reset tokens must be unguessable random values; a formula based on the user id can be computed by anyone.',
    impact:'An attacker can reset any account\u2019s password — including the admin\u2019s — without ever seeing an email.',
    report:{ title:'Predictable Password Reset Token', severity:'Critical', remediation:'Generate reset tokens with a CSPRNG (at least 128 bits), expire them quickly and invalidate after use.' } },
  { id:'auth-cookie', feature:'Login & Authentication', name:'Role cookie tampering (hx_role)', owasp:'A01:2021 Broken Access Control', difficulty:'Intermediate',
    hints:['After login, inspect the cookies the app sets.','One cookie carries your role — and the server believes it blindly.','Set hx_role to approver and open the approvals page.'],
    lesson:'Authorisation decisions must come from server-side session data, never from values the client can edit.',
    impact:'Any low-privilege user can promote themselves to approver or admin just by editing a cookie.',
    report:{ title:'Client-Side Role Cookie Trusted for Authorisation', severity:'High', remediation:'Store roles server-side in the session; ignore any role claim sent by the client.' } },
  // Registration & Profile
  { id:'reg-weak', feature:'Registration & Profile', name:'Weak password policy (1 character)', owasp:'A07:2021 Identification and Authentication Failures', difficulty:'Beginner',
    hints:['Register a new account and try the shortest password the form will take.','There is effectively no minimum length or complexity.','A single character password is accepted.'],
    lesson:'Weak password policies make brute force and credential stuffing trivially effective.',
    impact:'Client users end up with guessable passwords, and the business carries the breach risk.',
    report:{ title:'Weak Password Policy', severity:'Medium', remediation:'Enforce a minimum length (12+) and screen new passwords against known breached-password lists.' } },
  { id:'reg-mass', feature:'Registration & Profile', name:'Mass assignment — role & balance at registration', owasp:'A01:2021 Broken Access Control', difficulty:'Intermediate',
    hints:['The registration form only shows a few fields, but the server accepts more.','Add extra form fields the UI never offered.','POST role=admin (or a big creditBalance) along with the normal registration fields.'],
    lesson:'Binding request data directly to the user record lets attackers set privileged fields the form never showed.',
    impact:'Attackers register straight into an admin account — complete platform compromise in one request.',
    report:{ title:'Mass Assignment in Registration', severity:'Critical', remediation:'Whitelist bindable fields per endpoint; never accept role/privilege fields from the client.' } },
  { id:'reg-xss', feature:'Registration & Profile', name:'Stored XSS in display name', owasp:'A03:2021 Injection', difficulty:'Beginner',
    hints:['Names are rendered on dashboards and admin lists without escaping.','Put an HTML/JS payload where your name goes.','Register with a display name containing <script>alert(1)</script> or an <img onerror> payload.'],
    lesson:'User-controlled data stored and rendered unescaped executes in other users\u2019 browsers.',
    impact:'An attacker\u2019s payload runs in the admin\u2019s browser, enabling session theft and actions taken as the admin.',
    report:{ title:'Stored Cross-Site Scripting via Display Name', severity:'High', remediation:'Context-encode all user data on output and validate input; add a Content-Security-Policy.' } },
  { id:'reg-csrf', feature:'Registration & Profile', name:'CSRF on profile update', owasp:'A01:2021 Broken Access Control', difficulty:'Intermediate',
    hints:['The profile form changes your name/email with a plain POST.','Notice the app sets an hx_origin marker cookie on its own pages — forged requests will not have it.','Submit a profile update with no hx_origin marker (e.g. from a cross-site form).'],
    lesson:'State-changing forms without anti-CSRF tokens can be triggered by any website the victim visits while logged in.',
    impact:'A client\u2019s users can be silently modified — contact details changed, accounts prepared for takeover.',
    report:{ title:'Cross-Site Request Forgery on Profile Update', severity:'Medium', remediation:'Require per-session anti-CSRF tokens on all state-changing requests and SameSite cookies.' } },
  // Search & Suppliers
  { id:'search-sqli', feature:'Search & Suppliers', name:'SQL injection in search leaks internal supplier', owasp:'A03:2021 Injection', difficulty:'Intermediate',
    hints:['Search filters suppliers and items with another string-built query.','A normal search never shows the internal-only supplier.','Inject an OR condition (e.g. \' OR \'1\'=\'1) to dump every supplier including the hidden one.'],
    lesson:'Search boxes are SQL injection points too; a successful injection can expose data the UI is designed to hide.',
    impact:'Confidential supplier relationships and pricing — commercially sensitive data — leak to any logged-in user.',
    report:{ title:'SQL Injection in Search', severity:'High', remediation:'Parameterise search queries and enforce visibility rules server-side, not just in the UI.' } },
  { id:'search-xss', feature:'Search & Suppliers', name:'Reflected XSS in search results', owasp:'A03:2021 Injection', difficulty:'Beginner',
    hints:['The results page repeats your search term back to you.','It does so without escaping HTML.','Search for <script>alert(1)</script> and view the page source.'],
    lesson:'Reflected input must be encoded; otherwise a crafted link executes script in a victim\u2019s session.',
    impact:'Attackers send the client\u2019s staff a poisoned search link and hijack their sessions.',
    report:{ title:'Reflected Cross-Site Scripting in Search', severity:'Medium', remediation:'HTML-encode reflected values and deploy a restrictive Content-Security-Policy.' } },
  // Purchase Orders
  { id:'po-price', feature:'Purchase Orders', name:'Unit-price tampering on purchase order', owasp:'A01:2021 Broken Access Control', difficulty:'Beginner',
    hints:['The PO form suggests a catalogue price — but the server trusts what you send.','Intercept the create-PO request and change unitPrice.','Create a PO with unitPrice=1 for an item that costs far more.'],
    lesson:'Prices must be taken from the server-side catalogue at order time, never from the request.',
    impact:'The business buys (or sells) at attacker-chosen prices — direct financial loss on every order.',
    report:{ title:'Price Tampering in Purchase Order Creation', severity:'High', remediation:'Ignore client-supplied prices; always price orders from the server-side catalogue.' } },
  { id:'po-negative', feature:'Purchase Orders', name:'Negative quantity creates a negative-total PO', owasp:'A03:2021 Injection', difficulty:'Beginner',
    hints:['Quantity is validated only in the browser, if at all.','Try a quantity below zero when creating a PO.','Create a PO with qty=-5 and check the total the server accepts.'],
    lesson:'Numeric inputs need server-side range validation; negative quantities invert the money flow.',
    impact:'Negative orders can generate credits/refunds out of thin air and corrupt inventory and accounts.',
    report:{ title:'Missing Quantity Validation (Negative Quantities Accepted)', severity:'High', remediation:'Validate quantities server-side (positive integers within sane bounds) before pricing any order.' } },
  { id:'po-selfapprove', feature:'Purchase Orders', name:'Creator approves their own purchase order', owasp:'A01:2021 Broken Access Control', difficulty:'Intermediate',
    hints:['Segregation of duties is a business rule — check whether the app enforces it.','The approve endpoint never asks WHO created the PO.','Create a PO, then approve it yourself via POST /pos/<id>/approve.'],
    lesson:'Approval workflows must enforce separation of duties server-side: the requester can never be the approver.',
    impact:'One rogue or compromised account can raise and approve fraudulent orders — a classic procurement-fraud path.',
    report:{ title:'Missing Segregation of Duties in PO Approval', severity:'High', remediation:'Enforce approver != creator and the approver role server-side on every approval action.' } },
  { id:'po-idor', feature:'Purchase Orders', name:'Purchase order IDOR across suppliers', owasp:'A01:2021 Broken Access Control', difficulty:'Beginner',
    hints:['PO pages live at predictable /pos/<id> URLs.','Ownership is not checked when the page is served.','As one supplier, open the other supplier\u2019s PO by changing the id.'],
    lesson:'Every object fetch must verify the requester owns (or may see) that object.',
    impact:'Competitors/suppliers read each other\u2019s orders, prices and volumes — commercial espionage built into the app.',
    report:{ title:'Insecure Direct Object Reference on Purchase Orders', severity:'High', remediation:'Check ownership/role on every object access; use unguessable references as defence in depth.' } },
  { id:'po-supplier', feature:'Purchase Orders', name:'Create a PO under another supplier\u2019s identity', owasp:'A01:2021 Broken Access Control', difficulty:'Intermediate',
    hints:['The create-PO form carries a supplierId — whose is used?','A supplier account should only ever order as itself.','As supplier A, create a PO with supplierId set to supplier B.'],
    lesson:'Server-side identity must come from the session; client-supplied owner ids let users act as someone else.',
    impact:'Orders, debts and deliveries can be planted on another supplier, poisoning trust and billing.',
    report:{ title:'Client-Supplied Supplier Identity Trusted on PO Creation', severity:'High', remediation:'Derive the owning supplier from the authenticated session; ignore client-supplied owner ids.' } },
  // Shipments
  { id:'ship-idor', feature:'Shipments', name:'Shipment IDOR exposes other suppliers\u2019 deliveries', owasp:'A01:2021 Broken Access Control', difficulty:'Beginner',
    hints:['Shipment pages are at /shipments/<id> with sequential ids.','Try viewing a shipment that belongs to the other supplier.','As one supplier, open the other supplier\u2019s shipment by id.'],
    lesson:'Delivery data is sensitive operational data; object-level authorisation is required on every read.',
    impact:'Rivals learn delivery routes, dates and contents — enabling theft targeting and competitive harm.',
    report:{ title:'Insecure Direct Object Reference on Shipments', severity:'Medium', remediation:'Authorise every shipment read against the session\u2019s supplier/role.' } },
  // Inventory & Warehouses
  { id:'inv-adjust', feature:'Inventory & Warehouses', name:'Arbitrary stock adjustment (negative stock)', owasp:'A01:2021 Broken Access Control', difficulty:'Intermediate',
    hints:['The stock-adjust endpoint trusts both the caller and the number.','No warehouse role is required, and negative values are accepted.','POST /inventory/adjust with a negative stock value and watch inventory break.'],
    lesson:'Inventory mutations need role checks and invariant validation (stock can never go below zero).',
    impact:'Attackers zero out or negate stock — operations halt, orders fail, and the books stop matching reality.',
    report:{ title:'Unauthorised Inventory Adjustment / Negative Stock', severity:'High', remediation:'Restrict adjustments to warehouse roles and validate stock invariants server-side.' } },
  { id:'inv-restricted', feature:'Inventory & Warehouses', name:'Restricted internal item exposed to suppliers', owasp:'A01:2021 Broken Access Control', difficulty:'Beginner',
    hints:['One inventory item is flagged internal/restricted and hidden from lists.','Direct URLs are not protected the same way.','Open /inventory/9 (the restricted QA item) directly as a supplier.'],
    lesson:'Hiding an item in the UI is not access control; the object endpoint must enforce the restriction.',
    impact:'Internal QA/prototype stock and notes leak to external suppliers who were never meant to see them.',
    report:{ title:'Restricted Inventory Item Accessible by Direct URL', severity:'Medium', remediation:'Enforce item visibility/role checks on the detail endpoint, not only on listing pages.' } },
  // Supplier Invoices
  { id:'invoice-idor', feature:'Supplier Invoices', name:'Supplier invoice IDOR', owasp:'A01:2021 Broken Access Control', difficulty:'Beginner',
    hints:['Invoices live at /invoices/<id>.','Try reading an invoice issued to the other supplier.','As one supplier, open the other supplier\u2019s invoice by id.'],
    lesson:'Financial documents need the strictest object-level authorisation.',
    impact:'Invoice amounts, bank details and payment terms of other suppliers are exposed — fraud and social-engineering fuel.',
    report:{ title:'Insecure Direct Object Reference on Supplier Invoices', severity:'High', remediation:'Authorise invoice reads against the owning supplier or finance/admin roles only.' } },
  { id:'invoice-paid', feature:'Supplier Invoices', name:'Supplier marks own invoice PAID with a wrong amount', owasp:'A01:2021 Broken Access Control', difficulty:'Intermediate',
    hints:['The pay endpoint accepts an amount and a status from the caller.','It never compares the amount with the invoice total, nor checks who may pay.','As the supplier, POST /invoices/<id>/pay with amount=1 for a much larger invoice.'],
    lesson:'Payment state transitions must be server-controlled and reconciled against the real amount.',
    impact:'Invoices get marked settled for pennies — the business loses the full amount while its books show "paid".',
    report:{ title:'Payment Amount / Status Tampering on Invoices', severity:'Critical', remediation:'Only finance roles may settle invoices; require the settled amount to equal the invoice total, verified server-side.' } },
  // Admin Panel
  { id:'admin-bac', feature:'Admin Panel', name:'Admin panel open to any logged-in user', owasp:'A01:2021 Broken Access Control', difficulty:'Beginner',
    hints:['Try the /admin URL while signed in as a low-privilege user.','The page checks that you are logged in — nothing more.','Open /admin as the buyer or a supplier.'],
    lesson:'Authentication is not authorisation; admin surfaces must verify the admin role on every request.',
    impact:'Every user can see the full user list including passwords — instant total compromise.',
    report:{ title:'Broken Access Control on Admin Panel', severity:'Critical', remediation:'Enforce admin-role checks server-side on all admin routes; never render credentials.' } },
  { id:'admin-csrf', feature:'Admin Panel', name:'CSRF on admin user deletion', owasp:'A01:2021 Broken Access Control', difficulty:'Intermediate',
    hints:['Admin actions are plain POSTs without tokens.','A forged cross-site request carries the admin\u2019s cookies but no hx_origin marker.','As admin, POST /admin/users/<id>/delete without the hx_origin marker.'],
    lesson:'Privileged state changes need anti-CSRF tokens; otherwise any site can wield the admin\u2019s session.',
    impact:'An attacker can delete the client\u2019s user accounts by luring an admin to a malicious page.',
    report:{ title:'Cross-Site Request Forgery on Admin User Deletion', severity:'High', remediation:'Require anti-CSRF tokens on all admin actions and SameSite session cookies.' } },
  // Platform & API
  { id:'api-debug', feature:'Platform & API', name:'Unauthenticated /api/debug dumps all data', owasp:'A01:2021 Broken Access Control', difficulty:'Beginner',
    hints:['Debug endpoints often survive into production.','This one needs no login at all.','Fetch /api/debug with no session cookie.'],
    lesson:'Debug/diagnostic endpoints must never ship to production — they bypass every other control.',
    impact:'One URL hands an attacker every user, password, order and invoice — the whole business in a single request.',
    report:{ title:'Unauthenticated Debug Endpoint Exposes All Data', severity:'Critical', remediation:'Remove debug endpoints from production builds; require admin auth and audit access to diagnostics.' } },
  { id:'api-token', feature:'Platform & API', name:'Weak API token = base64(email)', owasp:'A07:2021 Identification and Authentication Failures', difficulty:'Intermediate',
    hints:['The API accepts an X-Api-Key header instead of a session.','Look at what the "key" really is for your own account — it decodes to something familiar.','Send X-Api-Key = base64 of another user\u2019s email to /api/invoices, with no session.'],
    lesson:'API credentials must be random secrets; a reversible encoding of a public identifier is not a credential.',
    impact:'Anyone who knows an email address — public information — can read that supplier\u2019s invoices through the API.',
    report:{ title:'Weak API Authentication (Base64 Email Token)', severity:'High', remediation:'Issue random, revocable API keys, store only their hashes, and scope them per account.' } },
];
const TOTAL = TESTS.length;
const FEATURES = [...new Set(TESTS.map(t => t.feature))];

/* --------------------------- Seed data ---------------------------- */
const users = [
  { id:1, name:'Ava Admin',    email:'admin@hexasupply.local',    password:'admin123',    role:'admin',    supplierId:0, credit:0 },
  { id:2, name:'Ben Buyer',    email:'buyer@hexasupply.local',    password:'buyer123',    role:'buyer',    supplierId:0, credit:500 },
  { id:3, name:'Amy Approver', email:'approver@hexasupply.local', password:'approve123',  role:'approver', supplierId:0, credit:0 },
  { id:4, name:'Sam Supplier', email:'sam@acme-supply.test',      password:'supplier123', role:'supplier', supplierId:1, credit:120 },
  { id:5, name:'Gina Globex',  email:'gina@globex.test',          password:'supplier123', role:'supplier', supplierId:2, credit:120 },
  { id:6, name:'Demo User',    email:'demo@hexasupply.local',     password:'demo123',     role:'buyer',    supplierId:0, credit:50 },
];
const suppliers = [
  { id:1, name:'Acme Industrial Ltd',  contact:'sam@acme-supply.test',  terms:'Net 30', internal:false },
  { id:2, name:'Globex Parts GmbH',    contact:'gina@globex.test',      terms:'Net 45', internal:false },
  { id:3, name:'Stealth Components (INTERNAL)', contact:'stealth@internal.test', terms:'CONFIDENTIAL — direct pricing, do not disclose', internal:true },
];
const warehouses = [
  { id:1, name:'Dhaka Central Warehouse', note:'Gate code 4471 — internal only' },
  { id:2, name:'Chattogram Port Depot',   note:'Night guard rota B — internal only' },
];
const items = [
  { id:1, sku:'STL-BEAM-10', name:'Steel Beam 10ft',      price:12.50, stock:400, warehouseId:1, restricted:false },
  { id:2, sku:'BLT-M8-100',  name:'Bolts M8 (box 100)',   price:4.25,  stock:2500, warehouseId:1, restricted:false },
  { id:3, sku:'MTR-IND-3P',  name:'Industrial Motor 3P',  price:40.00, stock:85,  warehouseId:2, restricted:false },
  { id:4, sku:'PMP-HYD-2',   name:'Hydraulic Pump v2',    price:120.00, stock:40, warehouseId:2, restricted:false },
  { id:9, sku:'QA-CAL-X',    name:'QA Calibration Unit — INTERNAL', price:999.00, stock:3, warehouseId:1, restricted:true },
];
const pos = [
  { id:1, supplierId:1, itemId:1, qty:100, unitPrice:12.50, total:1250.00, status:'approved', createdBy:2 },
  { id:2, supplierId:2, itemId:3, qty:50,  unitPrice:40.00, total:2000.00, status:'pending',  createdBy:2 },
];
const shipments = [
  { id:1, poId:1, supplierId:1, status:'in_transit', detail:'Truck DAC-2211, ETA Fri' },
  { id:2, poId:2, supplierId:2, status:'preparing',  detail:'Container GEX-88, port hold' },
];
const invoices = [
  { id:1, supplierId:1, poId:1, amount:1250.00, status:'unpaid', paidAmount:0 },
  { id:2, supplierId:2, poId:2, amount:2000.00, status:'unpaid', paidAmount:0 },
];
let nextUserId = 7, nextPoId = 3;

/* ------------------------- Progress state ------------------------- */
let state = { unlocked:false, testerName:'', tests:{}, attempts:{}, completedAt:null, keyRevealed:false,
              counters:{ fails:{}, enumEmails:[], resetIssued:{} } };
function loadState() {
  try { const raw = fs.readFileSync(PROGRESS_FILE, 'utf8'); const s = JSON.parse(raw);
    if (s && typeof s === 'object') state = Object.assign(state, s); } catch (e) { /* fresh */ }
  if (!state.counters) state.counters = { fails:{}, enumEmails:[], resetIssued:{} };
}
function saveState() { try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2)); } catch (e) {} }
function pass(id) { if (!state.tests[id]) { state.tests[id] = true;
  const done = Object.keys(state.tests).length;
  if (done >= TOTAL && !state.completedAt) { state.completedAt = new Date().toISOString(); state.keyRevealed = true; }
  saveState(); } }
function attempt(feature) { state.attempts[feature] = (state.attempts[feature] || 0) + 1; saveState(); }
function doneCount() { return Object.keys(state.tests).length; }
function pct() { return Math.floor(doneCount() * 100 / TOTAL); }
function isComplete() { return doneCount() >= TOTAL; }

const ENTRY_KEY_SHA256 = 'c1def86b769393148fe2a948fc79f160adaf61de44de0fc543c1a51a6a54fc43';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */

/* --------------------------- Sessions ----------------------------- */
const sessions = new Map();
function newSession(userId) { const sid = crypto.randomBytes(16).toString('hex'); sessions.set(sid, userId); return sid; }
function parseCookies(req) { const out = {}; const c = req.headers.cookie || '';
  c.split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); }); return out; }
function sessionUser(req) { const ck = parseCookies(req); if (!ck.hx_session) return null;
  const uid = sessions.get(ck.hx_session); return users.find(u => u.id === uid) || null; }
function roleOf(req) { const ck = parseCookies(req); const u = sessionUser(req);
  if (ck.hx_role) return ck.hx_role; return u ? u.role : null; } // flaw: trusts client cookie

/* --------------------------- Helpers ------------------------------ */
function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function raw(s) { return String(s == null ? '' : s); } // deliberately unescaped (vulnerable rendering)
function looksLikePayload(s) { return /<script|onerror\s*=|onload\s*=|<svg|<img[^>]*onerror|<iframe|<svg/i.test(String(s || '')); }
function readBody(req) { return new Promise(res => { let b = ''; req.on('data', d => { b += d; if (b.length > 1e6) req.destroy(); });
  req.on('end', () => res(b)); req.on('error', () => res('')); }); }
function parseForm(body) { const out = {}; new URLSearchParams(body).forEach((v, k) => { out[k] = v; }); return out; }
function hasMarker(req) { const ck = parseCookies(req); return ck.hx_origin === 'hexasupply'; }
function resetTokenFor(u) { return 'SUP-' + u.id + '-' + (u.id * 137 + 42); }

/* Mini string-built SQL evaluator (deliberately vulnerable login path). */
function evalWhere(where, user) {
  const ci = where.indexOf('--'); if (ci >= 0) where = where.slice(0, ci);
  const ors = where.split(/ OR /i);
  for (const orTerm of ors) {
    const ands = orTerm.split(/ AND /i); let ok = true;
    for (const c0 of ands) {
      const c = c0.trim(); const m = c.match(/^(.+?)=(.+)$/); if (!m) { ok = false; break; }
      const unq = s => { s = s.trim(); return (s.startsWith("'") && s.endsWith("'")) ? s.slice(1, -1) : s; };
      const L = m[1].trim(), R = unq(m[2]);
      const lv = (L === 'email') ? user.email : (L === 'password') ? user.password : unq(L);
      if (lv !== R) { ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}
function sqlLogin(email, pass) {
  const where = "email = '" + email + "' AND password = '" + pass + "'";
  return users.find(u => evalWhere(where, u)) || null;
}

/* ------------------------- Page furniture ------------------------- */
const _CA = ["MUwtWEg=","NkctNDA=","QlQ4TTM="];
function progressBar() {
  const d = doneCount(), p = pct();
  return `<div style="background:#111827;color:#e5e7eb;padding:8px 14px;border-radius:8px;margin:10px 0">
    <img src="/logo.png" alt="HexaCyberLab" style="height:26px;vertical-align:middle">
    <strong style="margin-left:8px">LAB ${LAB_NUMBER} — ${LAB_NAME}</strong>
    <span style="float:right">${d}/${TOTAL} tests · ${p}%</span>
    <div style="background:#374151;height:10px;border-radius:5px;margin-top:6px">
      <div style="background:#38bdf8;height:10px;border-radius:5px;width:${p}%"></div></div></div>`;
}
function chatWidget() {
  return `<div id="hxchat" style="position:fixed;right:14px;bottom:14px;width:320px;background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:10px;font-family:system-ui;z-index:99">
    <div style="padding:8px 10px;border-bottom:1px solid #334155"><strong>HexaSupply Lab Coach</strong></div>
    <div id="hxlog" style="height:180px;overflow:auto;padding:8px 10px;font-size:13px"></div>
    <div style="display:flex;gap:6px;padding:8px 10px">
      <input id="hxmsg" style="flex:1;padding:6px;border-radius:6px;border:1px solid #475569;background:#1e293b;color:#fff" placeholder="Ask the coach...">
      <button onclick="hxSend()" style="padding:6px 10px;border-radius:6px;background:#0284c7;color:#fff;border:0">Send</button></div></div>
  <script>async function hxSend(){const m=document.getElementById('hxmsg');const log=document.getElementById('hxlog');
    log.innerHTML+='<div><b>You:</b> '+m.value.replace(/</g,'&lt;')+'</div>';
    const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m.value})});
    const j=await r.json(); log.innerHTML+='<div><b>Coach:</b> '+j.reply.replace(/</g,'&lt;')+'</div>'; log.scrollTop=1e6; m.value='';}</script>`;
}
function layout(title, user, body) {
  const nav = user ? `<nav style="margin:8px 0">
    <a href="/">Dashboard</a> · <a href="/suppliers">Suppliers</a> · <a href="/pos">Purchase Orders</a> ·
    <a href="/shipments">Shipments</a> · <a href="/inventory">Inventory</a> · <a href="/invoices">Invoices</a> ·
    <a href="/approvals">Approvals</a> · <a href="/profile">Profile</a> · <a href="/tests">Mission Board</a> ·
    <a href="/admin">Admin</a> · <span>Signed in: ${raw(user.name)} (${esc(user.role)})</span></nav>` :
    `<nav style="margin:8px 0"><a href="/login">Login</a> · <a href="/register">Register</a> · <a href="/tests">Mission Board</a></nav>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} — HexaSupply (LAB ${LAB_NUMBER})</title></head>
  <body style="font-family:system-ui;max-width:960px;margin:0 auto;padding:0 14px 90px">${progressBar()}${nav}<h1>${esc(title)}</h1>${body}${chatWidget()}</body></html>`;
}
function gatePage() {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Locked — LAB ${LAB_NUMBER} ${LAB_NAME}</title></head>
  <body style="font-family:system-ui;max-width:640px;margin:40px auto;padding:0 14px 90px">${progressBar()}
  <h1>LAB ${LAB_NUMBER} — ${LAB_NAME} is locked</h1>
  <p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
  <form method="POST" action="/unlock"><input name="key" size="44" placeholder="Completion key from Lab ${LAB_NUMBER - 1}">
  <button type="submit">Unlock</button></form>${chatWidget()}</body></html>`;
}
function send(res, code, html, headers) {
  const h = Object.assign({ 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': 'hx_origin=hexasupply; Path=/' }, headers || {});
  res.writeHead(code, h); res.end(html);
}
function redirect(res, to, headers) { send(res, 302, `<p>Redirecting to <a href="${to}">${to}</a></p>`,
  Object.assign({ Location: to }, headers || {})); }
function json(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); }

/* --------------------------- Auth routes -------------------------- */
function loginPage(msg) {
  return layout('Login', null, `${msg ? `<p style="color:#b91c1c">${esc(msg)}</p>` : ''}
  <form method="POST" action="/login">
    <p><label>Email <input name="email" size="34"></label></p>
    <p><label>Password <input name="password" type="password" size="34"></label></p>
    <button type="submit">Sign in</button></form>
  <p><a href="/forgot">Forgot password?</a></p>
  <p style="background:#fef9c3;padding:8px">Demo account for evaluators — email: <b>demo@hexasupply.local</b> · password: <b>demo123</b></p>`);
}
async function handleLogin(req, res) {
  const f = parseForm(await readBody(req));
  attempt('Login & Authentication');
  const email = f.email || '', passw = f.password || '';
  state.counters.enumEmails = state.counters.enumEmails || [];
  if (!state.counters.enumEmails.includes(email)) { state.counters.enumEmails.push(email); saveState(); }
  if (state.counters.enumEmails.length >= 5) pass('auth-enum');
  const user = sqlLogin(email, passw);
  if (user) {
    if (!(email === user.email && passw === user.password)) pass('auth-sqli'); // session without exact credentials = injection
    if (user.email === 'demo@hexasupply.local' && passw === 'demo123') pass('auth-default');
    const sid = newSession(user.id);
    redirect(res, '/', { 'Set-Cookie': [`hx_session=${sid}; Path=/; HttpOnly`, `hx_role=${user.role}; Path=/`, 'hx_origin=hexasupply; Path=/'] });
    return;
  }
  state.counters.fails[email] = (state.counters.fails[email] || 0) + 1; saveState();
  if (state.counters.fails[email] >= 10) pass('auth-brute');
  send(res, 200, loginPage(users.some(u => u.email === email) ? 'Incorrect password.' : 'No account exists for that email.'));
}
function forgotPage(msg) {
  return layout('Forgot password', null, `${msg ? `<p>${esc(msg)}</p>` : ''}
  <form method="POST" action="/forgot"><p><label>Email <input name="email" size="34"></label></p>
  <button type="submit">Send reset link</button></form>
  <form method="POST" action="/reset"><p><label>Reset token <input name="token" size="34"></label>
  <label>New password <input name="password" size="20"></label></p><button type="submit">Reset password</button></form>`);
}
async function handleForgot(req, res) {
  const f = parseForm(await readBody(req));
  attempt('Login & Authentication');
  const email = f.email || '';
  state.counters.enumEmails = state.counters.enumEmails || [];
  if (!state.counters.enumEmails.includes(email)) { state.counters.enumEmails.push(email); saveState(); }
  if (state.counters.enumEmails.length >= 5) pass('auth-enum');
  const u = users.find(x => x.email === email);
  if (u) { state.counters.resetIssued[u.id] = true; saveState();
    send(res, 200, forgotPage('Reset link sent. Your token is: ' + resetTokenFor(u))); }
  else send(res, 200, forgotPage('No account exists for that email address.'));
}
async function handleReset(req, res) {
  const f = parseForm(await readBody(req));
  attempt('Login & Authentication');
  const u = users.find(x => resetTokenFor(x) === (f.token || ''));
  if (u) {
    if (!state.counters.resetIssued[u.id]) pass('auth-reset'); // token worked although never requested
    u.password = f.password || 'changed123';
    send(res, 200, forgotPage('Password updated for ' + esc(u.email) + '. You can now log in.'));
  } else send(res, 200, forgotPage('Invalid reset token.'));
}
function registerPage(msg) {
  return layout('Register', null, `${msg ? `<p style="color:#b91c1c">${esc(msg)}</p>` : ''}
  <form method="POST" action="/register">
    <p><label>Name <input name="name" size="30"></label></p>
    <p><label>Email <input name="email" size="30"></label></p>
    <p><label>Password <input name="password" type="password" size="30"></label></p>
    <button type="submit">Create account</button></form>`);
}
async function handleRegister(req, res) {
  const f = parseForm(await readBody(req));
  attempt('Registration & Profile');
  const pw = f.password || '';
  if (pw.length <= 1) pass('reg-weak');
  const u = { id: nextUserId++, name: f.name || 'New User', email: f.email || ('user' + nextUserId + '@test.local'),
              password: pw, role: 'buyer', supplierId: 0, credit: 0 };
  if (typeof f.role === 'string' && f.role && f.role !== 'buyer') { u.role = f.role; pass('reg-mass'); }
  if (f.credit !== undefined && Number(f.credit) > 0) { u.credit = Number(f.credit); pass('reg-mass'); }
  if (f.supplierId !== undefined && Number(f.supplierId) > 0) { u.supplierId = Number(f.supplierId); pass('reg-mass'); }
  if (looksLikePayload(u.name)) pass('reg-xss');
  users.push(u);
  const sid = newSession(u.id);
  redirect(res, '/', { 'Set-Cookie': [`hx_session=${sid}; Path=/; HttpOnly`, `hx_role=${u.role}; Path=/`, 'hx_origin=hexasupply; Path=/'] });
}
function profilePage(user, msg) {
  return layout('Profile', user, `${msg ? `<p>${esc(msg)}</p>` : ''}
  <p>Name: ${raw(user.name)}</p><p>Email: ${esc(user.email)}</p><p>Role: ${esc(user.role)}</p><p>Credit: $${esc(user.credit)}</p>
  <form method="POST" action="/profile">
    <input type="hidden" name="hx_origin" value="hexasupply">
    <p><label>Display name <input name="name" size="30" value="${esc(user.name)}"></label></p>
    <button type="submit">Update profile</button></form>`);
}
async function handleProfile(req, res, user) {
  const f = parseForm(await readBody(req));
  attempt('Registration & Profile');
  if (!hasMarker(req) && f.hx_origin !== 'hexasupply') pass('reg-csrf');
  if (f.name) { user.name = f.name; if (looksLikePayload(f.name)) pass('reg-xss'); }
  send(res, 200, profilePage(user, 'Profile updated.'));
}

/* --------------------------- App pages ---------------------------- */
function homePage(user) {
  const myPos = user.role === 'supplier' ? pos.filter(p => p.supplierId === user.supplierId) : pos;
  return layout('Dashboard', user, `<p>Welcome to HexaSupply, ${raw(user.name)}.</p>
  <p>Open purchase orders: ${myPos.length} · Items in catalogue: ${items.filter(i => !i.restricted).length} · Suppliers: ${suppliers.filter(s => !s.internal).length}</p>
  <p>Use the <a href="/tests">Mission Board</a> to track the security tests for this lab.</p>
  <form method="GET" action="/search"><input name="q" size="36" placeholder="Search suppliers & items"><button>Search</button></form>`);
}
function suppliersPage(user) {
  const rows = suppliers.filter(s => !s.internal).map(s =>
    `<tr><td>${s.id}</td><td>${esc(s.name)}</td><td>${esc(s.contact)}</td><td>${esc(s.terms)}</td></tr>`).join('');
  return layout('Suppliers', user, `<table border="1" cellpadding="6"><tr><th>ID</th><th>Name</th><th>Contact</th><th>Terms</th></tr>${rows}</table>`);
}
function searchPage(user, q) {
  attempt('Search & Suppliers');
  let foundSuppliers, foundItems;
  const injected = /'\s*(OR|AND)\s+/i.test(q) || /--/.test(q);
  if (injected) {
    foundSuppliers = suppliers; foundItems = items; // injection dumps everything, incl. internal/restricted
    if (suppliers.some(s => s.internal)) pass('search-sqli');
  } else {
    const needle = String(q || '').toLowerCase();
    foundSuppliers = suppliers.filter(s => !s.internal && s.name.toLowerCase().includes(needle));
    foundItems = items.filter(i => !i.restricted && (i.name.toLowerCase().includes(needle) || i.sku.toLowerCase().includes(needle)));
  }
  if (looksLikePayload(q)) pass('search-xss');
  const sRows = foundSuppliers.map(s => `<li>${esc(s.name)} — ${esc(s.contact)} — ${esc(s.terms)}</li>`).join('');
  const iRows = foundItems.map(i => `<li>${esc(i.sku)} ${esc(i.name)} — $${i.price}</li>`).join('');
  return layout('Search', user, `<p>Results for: ${raw(q)}</p><h3>Suppliers</h3><ul>${sRows}</ul><h3>Items</h3><ul>${iRows}</ul>`);
}
function posPage(user) {
  const rows = pos.map(p => { const it = items.find(i => i.id === p.itemId);
    return `<tr><td><a href="/pos/${p.id}">PO-${p.id}</a></td><td>Supplier ${p.supplierId}</td><td>${esc(it ? it.name : '?')}</td>
    <td>${p.qty}</td><td>$${p.unitPrice}</td><td>$${p.total}</td><td>${esc(p.status)}</td></tr>`; }).join('');
  return layout('Purchase Orders', user, `<table border="1" cellpadding="6">
  <tr><th>PO</th><th>Supplier</th><th>Item</th><th>Qty</th><th>Unit price</th><th>Total</th><th>Status</th></tr>${rows}</table>
  <h3>Create purchase order</h3>
  <form method="POST" action="/pos">
    <p><label>Item ID <input name="itemId" size="6"></label>
    <label>Supplier ID <input name="supplierId" size="6"></label>
    <label>Qty <input name="qty" size="6"></label>
    <label>Unit price <input name="unitPrice" size="8"></label></p>
    <button type="submit">Create PO</button></form>`);
}
function poDetailPage(user, p) {
  const it = items.find(i => i.id === p.itemId);
  return layout('Purchase Order ' + p.id, user, `
  <p>Supplier: ${p.supplierId} · Item: ${esc(it ? it.name : '?')} · Qty: ${p.qty} · Unit price: $${p.unitPrice} · Total: $${p.total} · Status: <b>${esc(p.status)}</b></p>
  <form method="POST" action="/pos/${p.id}/approve"><button type="submit">Approve this PO</button></form>`);
}
async function handleCreatePo(req, res, user) {
  const f = parseForm(await readBody(req));
  attempt('Purchase Orders');
  const item = items.find(i => i.id === Number(f.itemId)) || items[0];
  const qty = Number(f.qty || 1);
  const unitPrice = f.unitPrice !== undefined && f.unitPrice !== '' ? Number(f.unitPrice) : item.price;
  let supplierId = f.supplierId !== undefined && f.supplierId !== '' ? Number(f.supplierId) : (user.supplierId || 1);
  if (unitPrice !== item.price) pass('po-price');
  if (qty < 0) pass('po-negative');
  if (user.role === 'supplier' && supplierId !== user.supplierId) pass('po-supplier');
  const p = { id: nextPoId++, supplierId, itemId: item.id, qty, unitPrice, total: qty * unitPrice, status: 'pending', createdBy: user.id };
  pos.push(p);
  redirect(res, '/pos/' + p.id);
}
async function handleApprovePo(req, res, user, p) {
  await readBody(req);
  attempt('Purchase Orders');
  if (p.createdBy === user.id || !['approver', 'admin'].includes(roleOf(req))) pass('po-selfapprove');
  p.status = 'approved';
  redirect(res, '/pos/' + p.id);
}
function shipmentsPage(user) {
  const rows = shipments.map(s => `<tr><td><a href="/shipments/${s.id}">SH-${s.id}</a></td><td>PO-${s.poId}</td><td>Supplier ${s.supplierId}</td><td>${esc(s.status)}</td><td>${esc(s.detail)}</td></tr>`).join('');
  return layout('Shipments', user, `<table border="1" cellpadding="6"><tr><th>Shipment</th><th>PO</th><th>Supplier</th><th>Status</th><th>Detail</th></tr>${rows}</table>`);
}
function inventoryPage(user) {
  const rows = items.filter(i => !i.restricted).map(i => { const w = warehouses.find(x => x.id === i.warehouseId);
    return `<tr><td><a href="/inventory/${i.id}">${esc(i.sku)}</a></td><td>${esc(i.name)}</td><td>$${i.price}</td><td>${i.stock}</td><td>${esc(w ? w.name : '')}</td></tr>`; }).join('');
  return layout('Inventory', user, `<table border="1" cellpadding="6"><tr><th>SKU</th><th>Item</th><th>Price</th><th>Stock</th><th>Warehouse</th></tr>${rows}</table>
  <h3>Adjust stock</h3><form method="POST" action="/inventory/adjust">
  <p><label>Item ID <input name="itemId" size="6"></label><label>New stock <input name="stock" size="8"></label></p>
  <button type="submit">Set stock</button></form>`);
}
function itemDetailPage(user, i) {
  const w = warehouses.find(x => x.id === i.warehouseId);
  return layout('Item ' + i.sku, user, `<p>${esc(i.name)} — $${i.price} — stock ${i.stock}</p>
  <p>Warehouse: ${esc(w ? w.name : '')}</p><p>Warehouse note: ${esc(w ? w.note : '')}</p>
  ${i.restricted ? '<p><b>INTERNAL / RESTRICTED ITEM</b></p>' : ''}`);
}
async function handleAdjust(req, res, user) {
  const f = parseForm(await readBody(req));
  attempt('Inventory & Warehouses');
  const it = items.find(i => i.id === Number(f.itemId));
  if (it) { it.stock = Number(f.stock); if (it.stock < 0) pass('inv-adjust'); }
  redirect(res, '/inventory');
}
function invoicesPage(user) {
  const rows = invoices.map(v => `<tr><td><a href="/invoices/${v.id}">INV-${v.id}</a></td><td>Supplier ${v.supplierId}</td><td>PO-${v.poId}</td><td>$${v.amount}</td><td>${esc(v.status)}</td></tr>`).join('');
  return layout('Supplier Invoices', user, `<table border="1" cellpadding="6"><tr><th>Invoice</th><th>Supplier</th><th>PO</th><th>Amount</th><th>Status</th></tr>${rows}</table>`);
}
function invoiceDetailPage(user, v) {
  return layout('Invoice ' + v.id, user, `<p>Supplier: ${v.supplierId} · PO: ${v.poId} · Amount: $${v.amount} · Status: <b>${esc(v.status)}</b> · Paid: $${v.paidAmount}</p>
  <form method="POST" action="/invoices/${v.id}/pay"><label>Pay amount <input name="amount" size="8"></label>
  <button type="submit">Mark paid</button></form>`);
}
async function handlePayInvoice(req, res, user, v) {
  const f = parseForm(await readBody(req));
  attempt('Supplier Invoices');
  const amount = Number(f.amount || 0);
  v.paidAmount = amount; v.status = 'paid'; // flaw: no amount reconciliation, no role check
  if (amount !== v.amount || user.role === 'supplier') pass('invoice-paid');
  redirect(res, '/invoices/' + v.id);
}
function approvalsPage(user, req) {
  const rows = pos.filter(p => p.status === 'pending').map(p =>
    `<tr><td><a href="/pos/${p.id}">PO-${p.id}</a></td><td>Supplier ${p.supplierId}</td><td>$${p.total}</td></tr>`).join('');
  return layout('Approvals', user, `<p>Approvals console — role seen by server: <b>${esc(roleOf(req) || '')}</b></p>
  <table border="1" cellpadding="6"><tr><th>PO</th><th>Supplier</th><th>Total</th></tr>${rows}</table>`);
}
function adminPage(user) {
  const rows = users.map(u => `<tr><td>${u.id}</td><td>${raw(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.password)}</td><td>${esc(u.role)}</td>
    <td><form method="POST" action="/admin/users/${u.id}/delete"><button>Delete</button></form></td></tr>`).join('');
  return layout('Admin Panel', user, `<table border="1" cellpadding="6"><tr><th>ID</th><th>Name</th><th>Email</th><th>Password</th><th>Role</th><th></th></tr>${rows}</table>`);
}

/* --------------------- Mission board / coach ---------------------- */
function testsPage(user) {
  const groups = FEATURES.map(f => {
    const ts = TESTS.filter(t => t.feature === f);
    const att = state.attempts[f] || 0;
    const itemsHtml = ts.map(t => { const done = !!state.tests[t.id];
      const hints = t.hints.map((h, i) => `<div class="hint" data-t="${t.id}" data-i="${i}" style="display:none;color:#92400e">Hint ${i + 1}: ${esc(h)}</div>`).join('');
      return `<li>${done ? '✓' : '○'} <b>${esc(t.name)}</b> <small>(${esc(t.owasp)} · ${esc(t.difficulty)} · ${done ? 'done' : 'open'})</small>
      <button type="button" onclick="hxHint('${t.id}',this)">Hints</button>${hints}</li>`; }).join('');
    return `<h3>${esc(f)} — attempts: ${att}</h3><ul>${itemsHtml}</ul>`;
  }).join('');
  return layout('Mission Board', user, `<p>LAB ${LAB_NUMBER} · ${doneCount()}/${TOTAL} tests · ${pct()}% complete</p>${groups}
  <script>function hxHint(id,btn){const hs=[...document.querySelectorAll('.hint[data-t="'+id+'"]')];
  const nxt=hs.find(h=>h.style.display==='none'); if(nxt){nxt.style.display='block';} else {btn.disabled=true;}}</script>`);
}
const _CB = ["VkNYLVE=","NU9VV1c=",""];
function completionKey() { return _asm(_CA.concat(_CB)); }
function coachReply(msgRaw) {
  const msg = String(msgRaw || ''); const low = msg.toLowerCase();
  if (/who (built|made|created)|founder|who is md|who is jony/.test(low))
    return 'These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for \'Who is Md. Jony Hassain\', or ask ChatGPT.';
  if (/(completion key|the key|next lab|unlock key|give me the key)/.test(low)) {
    if (isComplete() && state.keyRevealed) return 'You completed LAB ' + LAB_NUMBER + ' at 100% — well earned. The completion key for the next lab is: ' + completionKey();
    return 'I do not have the completion key yet — I only receive it when this lab is completed at 100%. Right now you are at ' + pct() + '%. Finish all ' + TOTAL + ' tests and ask me again.';
  }
  // feature matching: longest feature-name / keyword match
  const kw = { 'Login & Authentication':['login','auth','password','brute','reset token','enumerat','cookie'],
    'Registration & Profile':['register','registration','profile','mass assignment','sign up','signup'],
    'Search & Suppliers':['search','supplier'],
    'Purchase Orders':['purchase order','po ','orders','approve','approval'],
    'Shipments':['shipment','delivery'],
    'Inventory & Warehouses':['inventory','stock','warehouse'],
    'Supplier Invoices':['invoice','pay','payment'],
    'Admin Panel':['admin'],
    'Platform & API':['api','debug','token'] };
  let feat = null;
  for (const f of FEATURES) { if (low.includes(f.toLowerCase())) { feat = f; break; } }
  if (!feat) for (const f of FEATURES) { if ((kw[f] || []).some(k => low.includes(k))) { feat = f; break; } }
  if (/how many|which features|what features|list|features|tests|vulnerabilit/.test(low) && !/how|solve|do|exploit|bypass/.test(low)) {
    if (feat) { const ts = TESTS.filter(t => t.feature === feat);
      return feat + ' has ' + ts.length + ' tests: ' + ts.map(t => t.name).join('; ') + '. Attempts so far on this feature: ' + (state.attempts[feat] || 0) + '.'; }
    return 'This lab has ' + FEATURES.length + ' features and ' + TOTAL + ' tests: ' + FEATURES.map(f => f + ' (' + TESTS.filter(t => t.feature === f).length + ')').join(', ') +
      '. Current progress: ' + doneCount() + '/' + TOTAL + ' (' + pct() + '%). Open /tests for the full Mission Board.';
  }
  if (feat) {
    const ts = TESTS.filter(t => t.feature === feat);
    const open = ts.filter(t => !state.tests[t.id]);
    const att = state.attempts[feat] || 0;
    if (!open.length) return 'You have already completed every test in ' + feat + '. Pick another feature from the Mission Board.';
    if (/how|solve|do|exploit|bypass|help|guide|step/.test(low) || true) {
      if (att >= 3) {
        return 'Step by step for ' + feat + ' — start with "' + open[0].name + '": ' + open[0].hints[2] +
          (open[1] ? ' Next, "' + open[1].name + '": ' + open[1].hints[2] : '');
      }
      return 'That feature is locked for help. First try the ' + feat + ' tests yourself at least 3 times — I can see you\'ve tried ' + att +
        ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
    }
  }
  if (/progress|status|next|start|hello|hi\b/.test(low)) {
    const open = TESTS.find(t => !state.tests[t.id]);
    return 'You are at ' + doneCount() + '/' + TOTAL + ' tests (' + pct() + '%).' +
      (open ? ' Next open test: "' + open.name + '" in ' + open.feature + '. Attempts on that feature: ' + (state.attempts[open.feature] || 0) + ' — after 3 tries I can guide you step by step.' : ' Everything is done — visit /complete for your key and certificate.');
  }
  return 'I can explain the features and test counts, guide you step by step on a feature after you have tried it at least 3 times, and share the completion key once you reach 100%. See /tests for the Mission Board and per-test hints.';
}
async function handleChat(req, res) {
  let body = await readBody(req); let msg = '';
  try { msg = JSON.parse(body).message || ''; } catch (e) { msg = ''; }
  json(res, 200, { reply: coachReply(msg) });
}

/* --------------------- Complete / certificate --------------------- */
function completePage(user) {
  if (!isComplete()) {
    const left = TESTS.filter(t => !state.tests[t.id]).map(t => `<li>${esc(t.name)} (${esc(t.feature)})</li>`).join('');
    return layout('Not complete yet', user, `<p>You are at ${doneCount()}/${TOTAL} tests (${pct()}%). Still open:</p><ul>${left}</ul>`);
  }
  const perFeature = FEATURES.map(f => { const ts = TESTS.filter(t => t.feature === f);
    return `<li><b>${esc(f)}</b>: ${ts.length} vulnerabilities — ${ts.map(t => esc(t.name)).join('; ')}</li>`; }).join('');
  const lessons = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('');
  const impacts = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('');
  const reports = TESTS.map(t => `<li><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)} — Remediation: ${esc(t.report.remediation)}</li>`).join('');
  return layout('Lab complete — debrief', user, `
  <h2>1) Features in this lab</h2><p>Total features: ${FEATURES.length}</p>
  <h2>2) Vulnerabilities per feature</h2><ul>${perFeature}</ul>
  <h2>3) Ways testing was done</h2><p>${doneCount()} tests completed, one per technique listed in section 2.</p>
  <h2>4) What you learned</h2><ul>${lessons}</ul>
  <h2>5) What this means for a real client</h2><ul>${impacts}</ul>
  <h2>6) Writing it in a real report</h2><ul>${reports}</ul>
  <h2>Your completion key</h2>
  <p style="font-size:20px;background:#ecfdf5;padding:10px"><b>${esc(completionKey())}</b></p>
  <p>Paste this key into Lab ${LAB_NUMBER + 1} to unlock it.</p>
  <form method="POST" action="/set-name"><label>Your name for the certificate
  <input name="name" size="30" value="${esc(state.testerName || '')}"></label> <button type="submit">Save name</button></form>
  <p><a href="/certificate">Open your certificate</a></p>`);
}
function certificatePage(user) {
  if (!isComplete()) return layout('Certificate', user, '<p>Certificate unlocks at 100%. Current progress: ' + pct() + '%.</p>');
  const name = state.testerName || (user ? user.name : 'Valued Tester');
  const date = state.completedAt ? state.completedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
  return `<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER}</title>
  <style>@media print{body{margin:0}} .card{border:3px double #0ea5e9;border-radius:14px;padding:34px;text-align:center;font-family:Georgia,serif;max-width:720px;margin:30px auto}</style></head>
  <body><div class="card"><img src="/logo.png" alt="HexaCyberLab logo" style="height:64px">
  <h1>Certificate of Completion</h1><p>This certifies that</p><h2>${esc(name)}</h2>
  <p>has completed 100% of the security tests in LAB ${LAB_NUMBER} — ${LAB_NAME} (${TOTAL} tests across ${FEATURES.length} features)</p>
  <p>Completed on ${esc(date)}</p><p><i>HexaCyberLab — Built by Md. Jony Hassain, Founder</i></p></div></body></html>`;
}

/* ------------------------------ API ------------------------------- */
function apiProgress(res) {
  const features = {};
  for (const f of FEATURES) { const ts = TESTS.filter(t => t.feature === f);
    features[f] = { total: ts.length, done: ts.filter(t => state.tests[t.id]).length, attempts: state.attempts[f] || 0 }; }
  json(res, 200, { lab: LAB_NAME, number: LAB_NUMBER, total: TOTAL, done: doneCount(), pct: pct(), features, complete: isComplete() });
}
function apiDebug(res) {
  pass('api-debug');
  json(res, 200, { users, suppliers, items, pos, shipments, invoices });
}
function apiInvoices(req, res) {
  const key = req.headers['x-api-key'] || '';
  let email = '';
  try { email = Buffer.from(key, 'base64').toString('utf8'); } catch (e) {}
  const u = users.find(x => x.email === email);
  const ck = parseCookies(req);
  if (u && !ck.hx_session) { pass('api-token'); json(res, 200, { invoices: invoices.filter(v => v.supplierId === u.supplierId || u.role === 'admin') }); return; }
  if (u) { json(res, 200, { invoices: invoices.filter(v => v.supplierId === u.supplierId || u.role === 'admin') }); return; }
  json(res, 401, { error: 'invalid api key' });
}

/* ----------------------------- Router ----------------------------- */
async function route(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1');
  const p = url.pathname; const m = req.method;
  try {
    if (p === '/logo.png') { try { const buf = fs.readFileSync(LOGO_FILE);
      res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(buf); } catch (e) { send(res, 404, 'no logo'); } return; }
    if (p === '/api/progress') { apiProgress(res); return; }
    if (p === '/api/debug') { apiDebug(res); return; }
    if (p === '/api/invoices') { apiInvoices(req, res); return; }
    if (p === '/api/chat' && m === 'POST') { await handleChat(req, res); return; }
    if (p === '/unlock' && m === 'POST') {
      const f = parseForm(await readBody(req));
      if (entryKeyMatches(String(f.key || ''))) { state.unlocked = true; saveState(); redirect(res, '/'); }
      else send(res, 403, gatePage().replace('</body>', '<p style="color:#b91c1c">Incorrect key.</p></body>'));
      return;
    }
    if (!state.unlocked) { send(res, 200, gatePage()); return; }
    // public auth routes (after unlock)
    if (p === '/login' && m === 'GET') { send(res, 200, loginPage()); return; }
    if (p === '/login' && m === 'POST') { await handleLogin(req, res); return; }
    if (p === '/forgot' && m === 'GET') { send(res, 200, forgotPage()); return; }
    if (p === '/forgot' && m === 'POST') { await handleForgot(req, res); return; }
    if (p === '/reset' && m === 'POST') { await handleReset(req, res); return; }
    if (p === '/register' && m === 'GET') { send(res, 200, registerPage()); return; }
    if (p === '/register' && m === 'POST') { await handleRegister(req, res); return; }
    const user = sessionUser(req);
    if (p === '/tests') { send(res, 200, testsPage(user)); return; }
    if (p === '/complete') { send(res, 200, completePage(user)); return; }
    if (p === '/certificate') { send(res, 200, certificatePage(user)); return; }
    if (p === '/set-name' && m === 'POST') { const f = parseForm(await readBody(req));
      state.testerName = String(f.name || '').slice(0, 60); saveState(); redirect(res, '/complete'); return; }
    if (!user) { redirect(res, '/login'); return; }
    // app routes
    if (p === '/' && m === 'GET') { send(res, 200, homePage(user)); return; }
    if (p === '/suppliers') { send(res, 200, suppliersPage(user)); return; }
    if (p === '/search') { send(res, 200, searchPage(user, url.searchParams.get('q') || '')); return; }
    if (p === '/profile' && m === 'GET') { send(res, 200, profilePage(user)); return; }
    if (p === '/profile' && m === 'POST') { await handleProfile(req, res, user); return; }
    if (p === '/pos' && m === 'GET') { send(res, 200, posPage(user)); return; }
    if (p === '/pos' && m === 'POST') { await handleCreatePo(req, res, user); return; }
    const poMatch = p.match(/^\/pos\/(\d+)$/);
    if (poMatch && m === 'GET') { const po = pos.find(x => x.id === Number(poMatch[1]));
      if (!po) { send(res, 404, 'PO not found'); return; }
      attempt('Purchase Orders');
      if (user.role === 'supplier' && po.supplierId !== user.supplierId) pass('po-idor');
      send(res, 200, poDetailPage(user, po)); return; }
    const apMatch = p.match(/^\/pos\/(\d+)\/approve$/);
    if (apMatch && m === 'POST') { const po = pos.find(x => x.id === Number(apMatch[1]));
      if (!po) { send(res, 404, 'PO not found'); return; }
      await handleApprovePo(req, res, user, po); return; }
    if (p === '/approvals') { attempt('Purchase Orders');
      const cookieRole = roleOf(req);
      // flaw: access is granted by the client-supplied hx_role cookie; if the
      // session account itself lacks the role, the cookie alone opened the gate.
      if (['approver', 'admin'].includes(cookieRole) && !['approver', 'admin'].includes(user.role)) pass('auth-cookie');
      if (!['approver', 'admin'].includes(cookieRole)) { send(res, 403, layout('Forbidden', user, '<p>Approvers only.</p>')); return; }
      send(res, 200, approvalsPage(user, req)); return; }
    if (p === '/shipments') { send(res, 200, shipmentsPage(user)); return; }
    const shMatch = p.match(/^\/shipments\/(\d+)$/);
    if (shMatch && m === 'GET') { const sh = shipments.find(x => x.id === Number(shMatch[1]));
      if (!sh) { send(res, 404, 'Shipment not found'); return; }
      attempt('Shipments');
      if (user.role === 'supplier' && sh.supplierId !== user.supplierId) pass('ship-idor');
      send(res, 200, layout('Shipment ' + sh.id, user, `<p>PO-${sh.poId} · Supplier ${sh.supplierId} · Status: ${esc(sh.status)} · ${esc(sh.detail)}</p>`)); return; }
    if (p === '/inventory' && m === 'GET') { send(res, 200, inventoryPage(user)); return; }
    if (p === '/inventory/adjust' && m === 'POST') { await handleAdjust(req, res, user); return; }
    const itMatch = p.match(/^\/inventory\/(\d+)$/);
    if (itMatch && m === 'GET') { const it = items.find(x => x.id === Number(itMatch[1]));
      if (!it) { send(res, 404, 'Item not found'); return; }
      attempt('Inventory & Warehouses');
      if (it.restricted) pass('inv-restricted');
      send(res, 200, itemDetailPage(user, it)); return; }
    if (p === '/invoices' && m === 'GET') { send(res, 200, invoicesPage(user)); return; }
    const invMatch = p.match(/^\/invoices\/(\d+)$/);
    if (invMatch && m === 'GET') { const v = invoices.find(x => x.id === Number(invMatch[1]));
      if (!v) { send(res, 404, 'Invoice not found'); return; }
      attempt('Supplier Invoices');
      if (user.role === 'supplier' && v.supplierId !== user.supplierId) pass('invoice-idor');
      send(res, 200, invoiceDetailPage(user, v)); return; }
    const payMatch = p.match(/^\/invoices\/(\d+)\/pay$/);
    if (payMatch && m === 'POST') { const v = invoices.find(x => x.id === Number(payMatch[1]));
      if (!v) { send(res, 404, 'Invoice not found'); return; }
      await handlePayInvoice(req, res, user, v); return; }
    if (p === '/admin' && m === 'GET') { attempt('Admin Panel');
      if (user.role !== 'admin') pass('admin-bac');
      send(res, 200, adminPage(user)); return; }
    const delMatch = p.match(/^\/admin\/users\/(\d+)\/delete$/);
    if (delMatch && m === 'POST') { await readBody(req); attempt('Admin Panel');
      if (!hasMarker(req)) pass('admin-csrf');
      const idx = users.findIndex(x => x.id === Number(delMatch[1]));
      if (idx >= 0) users.splice(idx, 1);
      redirect(res, '/admin'); return; }
    send(res, 404, layout('Not found', user, '<p>404 — page not found.</p>'));
  } catch (e) {
    try { send(res, 200, layout('Error', null, '<p>Something went wrong, but the lab is still running.</p>')); } catch (e2) {}
  }
}

/* ------------------------- Doc generation ------------------------- */
function genDocs() {
  const byFeature = FEATURES.map(f => {
    const ts = TESTS.filter(t => t.feature === f);
    return '## ' + f + ' (' + ts.length + ' tests)\n\n' + ts.map(t =>
      '### ' + t.name + '\n- OWASP: ' + t.owasp + '\n- Difficulty: ' + t.difficulty + '\n- Impact: ' + t.impact + '\n- Lesson: ' + t.lesson).join('\n\n');
  }).join('\n\n');
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'),
    '# HexaSupply (LAB ' + LAB_NUMBER + ') — Vulnerability Map\n\n' + TOTAL + ' scored tests across ' + FEATURES.length + ' features.\n\n' + byFeature + '\n');
  const guide = FEATURES.map(f => {
    const ts = TESTS.filter(t => t.feature === f);
    return '## ' + f + '\n\n' + ts.map(t =>
      '### ' + t.name + ' (' + t.difficulty + ')\n- Objective: complete the test so the Mission Board flips it to done (server-side detection).\n- Hint 1: ' + t.hints[0] + '\n- Hint 2: ' + t.hints[1] + '\n- Hint 3: ' + t.hints[2]).join('\n\n');
  }).join('\n\n');
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'),
    '# HexaSupply (LAB ' + LAB_NUMBER + ') — Practice Guide\n\nChallenges grouped by feature. Each challenge mirrors the /tests Mission Board.\n\n' + guide + '\n');
  const fix = TESTS.map(t =>
    '### ' + t.report.title + '\n- Severity: ' + t.report.severity + '\n- Secure implementation: ' + t.report.remediation + '\n- Regression test: repeat the original exploit after the fix and confirm it no longer succeeds (test stays red / request is rejected), then re-run the normal business flow to confirm it still works.').join('\n\n');
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'),
    '# HexaSupply (LAB ' + LAB_NUMBER + ') — Fix & Retest\n\nFor every finding: apply the secure implementation, then retest the original exploit and the legitimate flow.\n\n' + fix + '\n');
  console.log('Docs generated from registry: ' + TOTAL + ' tests, ' + FEATURES.length + ' features.');
}

/* ------------------------------ Boot ------------------------------ */
loadState();
if (process.argv.includes('--gen-docs')) { genDocs(); process.exit(0); }
const server = http.createServer((req, res) => { route(req, res); });
server.listen(PORT, '127.0.0.1', () => { console.log('HexaSupply LAB ' + LAB_NUMBER + ' listening on http://127.0.0.1:' + PORT); });
