'use strict';
/*
  HexaWholesale — INTENTIONALLY VULNERABLE B2B wholesale practice lab.
  Zero-dependency Node.js (built-ins only). In-memory data — restart resets.
  LOCAL ONLY. Bind: 127.0.0.1:3018. Synthetic data only. Never deploy.
*/
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const HOST = '127.0.0.1';
const PORT = 3018;
const LAB_NUMBER = 10;
const LAB_NAME = 'HexaWholesale';

/* ---------------- Seed data ---------------- */
let companies = [
  { id: 1, name: 'Acme Distribution Ltd', country: 'United Kingdom', tier: 'Gold', creditLimit: 50000, creditUsed: 12000, contactEmail: 'ops@acme-distribution.example', address: '14 Dockside Way, London' },
  { id: 2, name: 'Baltic Wholesale GmbH', country: 'Germany', tier: 'Silver', creditLimit: 75000, creditUsed: 31000, contactEmail: 'einkauf@baltic-wholesale.example', address: '88 Hafenstrasse, Hamburg' },
  { id: 3, name: 'Crescent Trading Co', country: 'Netherlands', tier: 'Bronze', creditLimit: 30000, creditUsed: 4500, contactEmail: 'buy@crescent-trading.example', address: '9 Prinsengracht, Amsterdam' },
];

let users = [
  { id: 1, email: 'admin@hexawholesale.local', password: 'Admin@123', name: 'Platform Admin', role: 'admin', companyId: null },
  { id: 2, email: 'a-buyer@hexawholesale.local', password: 'User@123', name: 'Alice Buyer (A)', role: 'buyer', companyId: 1 },
  { id: 3, email: 'a-approver@hexawholesale.local', password: 'User@123', name: 'Aaron Approver (A)', role: 'approver', companyId: 1 },
  { id: 4, email: 'b-buyer@hexawholesale.local', password: 'User@123', name: 'Ben Buyer (B)', role: 'buyer', companyId: 2 },
  { id: 5, email: 'b-approver@hexawholesale.local', password: 'User@123', name: 'Berta Approver (B)', role: 'approver', companyId: 2 },
  { id: 6, email: 'c-buyer@hexawholesale.local', password: 'User@123', name: 'Carla Buyer (C)', role: 'buyer', companyId: 3 },
];

function tiers(base) {
  const r = n => Math.round(base * n * 100) / 100;
  return [ { minQty: 1, price: base }, { minQty: 10, price: r(0.92) }, { minQty: 50, price: r(0.85) }, { minQty: 200, price: r(0.76) } ];
}
let products = [
  { id: 1, sku: 'WS-1001', name: 'Wireless Barcode Scanner Pro', category: 'Electronics', basePrice: 89.99, stock: 1400, tiers: tiers(89.99), costPrice: 41.20, internal: false },
  { id: 2, sku: 'WS-1002', name: 'Industrial Label Printer X2', category: 'Electronics', basePrice: 219.00, stock: 620, tiers: tiers(219), costPrice: 118.50, internal: false },
  { id: 3, sku: 'WS-1003', name: 'Pallet Wrap Rolls (Pack of 6)', category: 'Packaging', basePrice: 34.50, stock: 5200, tiers: tiers(34.50), costPrice: 15.10, internal: false },
  { id: 4, sku: 'WS-1004', name: 'Heavy-Duty Shipping Boxes (50pc)', category: 'Packaging', basePrice: 27.99, stock: 8100, tiers: tiers(27.99), costPrice: 11.40, internal: false },
  { id: 5, sku: 'WS-1005', name: 'USB-C Docking Station 11-in-1', category: 'Electronics', basePrice: 64.75, stock: 2300, tiers: tiers(64.75), costPrice: 29.90, internal: false },
  { id: 6, sku: 'WS-1006', name: 'Ergonomic Office Chair Bulk', category: 'Furniture', basePrice: 149.99, stock: 480, tiers: tiers(149.99), costPrice: 72.00, internal: false },
  { id: 7, sku: 'WS-1007', name: 'LED Warehouse High-Bay Light', category: 'Lighting', basePrice: 58.20, stock: 1750, tiers: tiers(58.20), costPrice: 26.35, internal: false },
  { id: 8, sku: 'WS-1008', name: 'Commercial Coffee Beans 10kg', category: 'Food & Beverage', basePrice: 96.00, stock: 950, tiers: tiers(96), costPrice: 48.75, internal: false },
  { id: 9, sku: 'WS-1009', name: 'Nitrile Gloves (Case of 1000)', category: 'Safety', basePrice: 42.99, stock: 6600, tiers: tiers(42.99), costPrice: 18.20, internal: false },
  { id: 10, sku: 'WS-1010', name: 'Cordless Impact Driver Kit', category: 'Tools', basePrice: 119.50, stock: 890, tiers: tiers(119.50), costPrice: 57.60, internal: false },
  { id: 11, sku: 'WS-1011', name: 'Thermal Receipt Paper (20 Rolls)', category: 'Packaging', basePrice: 19.99, stock: 12000, tiers: tiers(19.99), costPrice: 7.85, internal: false },
  { id: 12, sku: 'WS-1012', name: 'Smart Inventory Tags (500pc)', category: 'Electronics', basePrice: 74.25, stock: 3100, tiers: tiers(74.25), costPrice: 33.10, internal: false },
  { id: 13, sku: 'WS-1013', name: 'Stainless Work Table 180cm', category: 'Furniture', basePrice: 264.00, stock: 260, tiers: tiers(264), costPrice: 139.00, internal: false },
  { id: 14, sku: 'WS-1099', name: '[INTERNAL] Supplier Cost Sheet — Do Not Sell', category: 'Internal', basePrice: 1.00, stock: 1, tiers: tiers(1), costPrice: 0.50, internal: true },
];

// Negotiated per-company prices (should be private per company — see Vuln 6)
let negotiatedPrices = [
  { companyId: 1, productId: 1, price: 79.99 }, { companyId: 1, productId: 6, price: 132.00 },
  { companyId: 2, productId: 2, price: 198.00 }, { companyId: 2, productId: 8, price: 88.50 },
  { companyId: 3, productId: 3, price: 30.90 }, { companyId: 3, productId: 12, price: 66.00 },
];

let pos = [
  { id: 1001, companyId: 1, buyerId: 2, status: 'approved', notes: 'Regular restock for London warehouse.', rebateCode: null, rebatePct: 0, createdAt: '2026-10-18',
    lines: [ { productId: 1, qty: 50, unitPrice: 76.49 }, { productId: 11, qty: 200, unitPrice: 15.19 } ] },
  { id: 1002, companyId: 2, buyerId: 4, status: 'approved', notes: 'Hamburg Q4 stock.', rebateCode: null, rebatePct: 0, createdAt: '2026-10-19',
    lines: [ { productId: 2, qty: 20, unitPrice: 201.48 }, { productId: 8, qty: 50, unitPrice: 81.60 } ] },
  { id: 1003, companyId: 1, buyerId: 2, status: 'pending', notes: 'Awaiting approval — packaging restock.', rebateCode: null, rebatePct: 0, createdAt: '2026-10-21',
    lines: [ { productId: 3, qty: 100, unitPrice: 29.33 } ] },
  { id: 1004, companyId: 3, buyerId: 6, status: 'draft', notes: '', rebateCode: null, rebatePct: 0, createdAt: '2026-10-22',
    lines: [ { productId: 12, qty: 10, unitPrice: 68.31 } ] },
];
let nextPoId = 1005;

function poTotal(po) {
  const sub = po.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  return Math.round(sub * (1 - (po.rebatePct || 0) / 100) * 100) / 100;
}
let invoices = [
  { id: 2001, poId: 1001, companyId: 1, total: poTotal(pos[0]), issued: '2026-10-18', due: '2026-11-17', status: 'open' },
  { id: 2002, poId: 1002, companyId: 2, total: poTotal(pos[1]), issued: '2026-10-19', due: '2026-11-18', status: 'open' },
];
let nextInvoiceId = 2003;

const rebateCodes = [ { code: 'WHOLESALE10', pct: 10 }, { code: 'BULK5', pct: 5 } ];

let sessions = new Map(); // sid -> userId
let resetCounter = 1000;   // Vuln 12: predictable sequential reset tokens
let resetTokens = new Map(); // token -> { uid, fp } (requester fingerprint)

/* ================= LAB SYSTEM (progress / tests / chatbot / keys) ================= */
/* Key material lives ONLY as encoded shards scattered through this file (spec §7).
   Each shard is base64 of a reversed fragment; a small assembler rebuilds a key at
   runtime, only at the moment the spec allows it to exist. */

const _cA = ["QU0tWEg=", "LVJFVFM=", "WFdKVzY="];
function _asm(parts) { return parts.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join(''); }
const ENTRY_KEY_SHA256 = 'a2d36cadc28648b7c49ed8f583b4afb8f83e1cf114befd9deb70e0830e060a99';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */
function completionKey() { return _asm([..._cA, ..._cB]); }

/* ---- Progress state (persisted to progress.json — spec §4) ---- */
const PROGRESS_PATH = path.join(__dirname, 'progress.json');
function loadProgress() {
  try {
    const p = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
    return { unlocked: !!p.unlocked, testerName: p.testerName || '', tests: p.tests || {}, attempts: p.attempts || {}, completedAt: p.completedAt || null, keyRevealed: !!p.keyRevealed };
  } catch (e) {
    return { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
  }
}
let PROG = loadProgress();
function saveProgress() { try { fs.writeFileSync(PROGRESS_PATH, JSON.stringify(PROG, null, 2)); } catch (e) {} }
function bumpAttempt(feature) { PROG.attempts[feature] = (PROG.attempts[feature] || 0) + 1; saveProgress(); }
function pass(id) {
  if (PROG.tests[id]) return;
  PROG.tests[id] = true;
  if (TESTS.every(t => PROG.tests[t.id])) {
    if (!PROG.completedAt) PROG.completedAt = new Date().toISOString().slice(0, 10);
    PROG.keyRevealed = true;
  }
  saveProgress();
}
function doneCount() { return TESTS.filter(t => PROG.tests[t.id]).length; }
function progressInfo() {
  const feats = {};
  for (const t of TESTS) {
    const f = feats[t.feature] || (feats[t.feature] = { total: 0, done: 0, attempts: PROG.attempts[t.feature] || 0 });
    f.total++; if (PROG.tests[t.id]) f.done++;
  }
  const done = doneCount();
  return { lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done, pct: TESTS.length ? Math.floor(done / TESTS.length * 100) : 0, features: feats, complete: done === TESTS.length, unlocked: PROG.unlocked };
}

/* ---- Detection helpers ---- */
const XSS_RE = /<\s*script|<\s*svg|<\s*img[^>]*\son\w+\s*=|\son\w+\s*=\s*['"]?[^'"\s>]*\(|javascript\s*:/i;
let loginFails = new Map(); // email -> [timestamps] (brute-force observation)
let enumSeen = { existing: false, missing: false };
function isCsrfStyle(req) {
  const ck = parseCookies(req);
  if (!ck.hx_origin) return true; // no marker the app's own pages always carry
  const o = req.headers.origin || req.headers.referer || '';
  if (o && !/127\.0\.0\.1:3018|localhost:3018/.test(o)) return true; // cross-site origin
  return false;
}
function startSession(res, u) {
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, u.id);
  // Role stored in a separate plain cookie (see Vuln 10).
  return redirect(res, '/dashboard', { 'Set-Cookie': [`sid=${sid}; HttpOnly; Path=/`, `role=${u.role}; Path=/`] });
}
function serveLogo(res) {
  try { const data = fs.readFileSync(path.join(__dirname, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'max-age=86400' }); return res.end(data); }
  catch (e) { return send(res, 404, 'logo missing'); }
}
function sendProgress(res) { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(progressInfo(), null, 2)); }

/* ---- TESTS registry (spec §3). Every entry maps to a REAL working flaw in this app. ---- */
const TESTS = [
  /* ---------- Login & Authentication ---------- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03 Injection', difficulty: 'Advanced',
    kw: ['sqli', 'sql injection', 'injection login', 'login bypass'],
    hints: ['The login form still contains a legacy string-built query path — think about how the email is pasted into the query.', "A quote in the email field changes the query's logic. What does a classic tautology or comment sequence do?", "Try the email: ' OR '1'='1' --  (with any password). The query comment swallows the password check and you land in the first matched account."],
    guide: "1) Open the login page. 2) In the Email field enter: ' OR '1'='1' --  3) Enter any password and submit. 4) The string-built query's password condition is commented out, so a session is created without knowing any password.",
    lesson: 'String-built queries let attacker input change the query itself. Parameterised queries are the only reliable defence — escaping by hand always misses a case.',
    impact: "On a real client's platform this is a full authentication bypass: an attacker logs in as the platform admin without any password, sees every tenant's orders, prices and credit limits, and can approve or alter anything.",
    report: { title: 'SQL Injection in Authentication (Login Bypass)', severity: 'Critical', remediation: 'Use parameterised queries/prepared statements everywhere; never concatenate user input into SQL.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limiting or Lockout', owasp: 'A07 Authentication Failures', difficulty: 'Intermediate',
    kw: ['brute', 'rate limit', 'lockout', 'password guessing'],
    hints: ['Count how many wrong passwords you can try for one account in a row. Does anything slow you down or lock the account?', 'Script it: 10 rapid failed logins for the same email (Burp Intruder or a curl loop).', 'There is no counter, delay or lockout at all — the 10th wrong password is processed exactly like the first.'],
    guide: '1) Pick one account (e.g. c-buyer@hexawholesale.local). 2) Submit 10 wrong passwords in a row, quickly. 3) Notice every attempt is processed normally — no lockout, no CAPTCHA, no delay. That missing throttle is the vulnerability.',
    lesson: 'A login form without throttling is an invitation to credential stuffing and password spraying. Rate limits, lockouts and MFA are what make guessing impractical.',
    impact: "Attackers can guess passwords against a client's staff accounts indefinitely and silently. Wholesale accounts guard credit lines and pricing, so one guessed password can mean fraudulent orders on company credit.",
    report: { title: 'Missing Rate Limiting on Authentication Endpoint', severity: 'Medium', remediation: 'Add per-account and per-IP throttling, progressive delays/lockout, and MFA for privileged accounts.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User Enumeration via Password Reset', owasp: 'A07 Authentication Failures', difficulty: 'Beginner',
    kw: ['enumeration', 'enumerate', 'user enumeration', 'forgot'],
    hints: ['Compare the forgot-password response for an email that exists with one that does not.', 'One of the two answers is noticeably more helpful than the other — it even shows you something.', 'Submit the forgot form once with a-buyer@hexawholesale.local and once with an address that does not exist. The different responses confirm which accounts are real.'],
    guide: '1) Go to Forgot password. 2) Submit a real account email — the app answers with a reset link. 3) Submit a made-up email — the answer is a vague generic message. 4) The difference lets anyone build a list of valid accounts to attack.',
    lesson: 'Authentication flows must answer identically whether or not an account exists. Any difference is a free directory of targets for the attacker.',
    impact: "A client leaks exactly which email addresses hold accounts, focusing phishing and password-guessing on real people instead of wasting effort on ghosts.",
    report: { title: 'Account Enumeration via Password Reset Responses', severity: 'Low', remediation: 'Return one identical generic message for all reset requests, regardless of account existence.' } },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Default / Demo Credentials in Use', owasp: 'A07 Authentication Failures', difficulty: 'Beginner',
    kw: ['default', 'demo credential', 'default password', 'weak credential'],
    hints: ['The README lists working accounts — and their passwords follow one obvious pattern.', 'Try logging in with the documented platform admin credentials.', 'admin@hexawholesale.local / Admin@123 (and User@123 for buyers) are live, documented, guessable passwords.'],
    guide: '1) Log in with the documented admin account (see README). 2) It works immediately — shared, published, pattern-based passwords protect the most powerful account on the platform.',
    lesson: 'Default and shared credentials are the first thing attackers try. Every account needs a unique, strong password, and demo accounts must never survive into a real deployment.',
    impact: "Anyone who reads the manual — or guesses the pattern — owns the client's admin account. In production this is how 'unhackable' platforms fall in the first five minutes.",
    report: { title: 'Default Credentials on Privileged Accounts', severity: 'Critical', remediation: 'Force unique strong passwords per account; remove demo accounts and documented passwords from production.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable Password-Reset Tokens', owasp: 'A07 Authentication Failures', difficulty: 'Intermediate',
    kw: ['reset token', 'predictable token', 'token guessing'],
    hints: ['Request a password reset and study the token you are shown. What kind of value is it?', 'Request resets for two different accounts and compare the tokens.', 'Tokens are sequential numbers (1001, 1002, ...). Trigger a reset for a victim, guess the token number it was issued, and use /reset?token=<that number> from a different browser to set their password.'],
    guide: "1) Request a reset for your own account and note the token — a small sequential number. 2) Trigger a reset for a victim account (e.g. from another browser). 3) From your browser, open /reset with the NEXT number and set a new password. 4) Log in as the victim — the token was never sent to you, just predicted.",
    lesson: 'A reset token is a temporary password: it must be long, random, single-use and short-lived. Predictable tokens turn the reset flow into an account-takeover machine.',
    impact: "Any account — including the platform admin — can be taken over by anyone who can count. On a client platform that means full compromise without ever touching a mailbox.",
    report: { title: 'Predictable Password Reset Tokens Allow Account Takeover', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (32+ bytes), hash them at rest, expire in ~30 minutes, single use.' } },

  /* ---------- Registration & Company Settings ---------- */
  { id: 'reg-weak', feature: 'Registration & Company Settings', name: 'Weak Password Policy at Registration', owasp: 'A07 Authentication Failures', difficulty: 'Beginner',
    kw: ['weak password', 'password policy', 'short password'],
    hints: ['Register a new account and see how short a password the form accepts.', 'Try a one-character password.', 'The register form performs no length or complexity check at all — a password of "x" creates a working account with its own company and credit line.'],
    guide: '1) Open Register. 2) Create an account with the password set to a single character, e.g. x. 3) Log in with it — the account works, despite a password anyone could guess instantly.',
    lesson: 'Password policy is set where passwords are created. If registration accepts anything, every other control inherits that weakness.',
    impact: "Client staff end up with trivially guessable passwords on accounts that can place orders against company credit — brute force becomes a formality.",
    report: { title: 'No Password Policy Enforced at Registration', severity: 'Medium', remediation: 'Enforce a minimum length (12+) and breached-password screening at registration and reset.' } },
  { id: 'reg-mass', feature: 'Registration & Company Settings', name: 'Mass Assignment at Registration (Credit Limit)', owasp: 'A01 Broken Access Control (Mass Assignment)', difficulty: 'Intermediate',
    kw: ['registration mass', 'mass assignment register', 'credit limit register'],
    hints: ['Registration quietly builds your new company record from the form. What if the form carried one extra field?', 'Intercept the register POST (Burp) or use curl, and add a field the form never showed.', 'Add creditLimit=777777 to the POST /register body. Your brand-new company is created with a $777,777 credit limit instead of the standard $10,000.'],
    guide: '1) Intercept or craft the POST /register request. 2) Add the field creditLimit=777777 alongside the normal fields. 3) Register, then log in and open the dashboard — your new company starts with the credit limit you chose.',
    lesson: 'Server code must whitelist exactly which fields a request may set. Binding a request body straight onto a model hands the client control of privileged fields.',
    impact: "A brand-new 'customer' grants themselves a huge credit line on day one — the client's own risk decision is rewritten by the person it was meant to restrain.",
    report: { title: 'Mass Assignment in Registration Allows Self-Granted Credit Limit', severity: 'High', remediation: 'Whitelist assignable registration fields; set credit limits only through an admin-controlled workflow.' } },
  { id: 'settings-mass', feature: 'Registration & Company Settings', name: 'Mass Assignment on Company Settings (Self-Raised Credit Limit)', owasp: 'A01 Broken Access Control (Mass Assignment)', difficulty: 'Intermediate',
    kw: ['mass assignment', 'settings tamper', 'raise credit'],
    hints: ['The settings form shows four fields. The server, however, saves more than it shows.', 'Intercept the settings save and add fields the form never offered.', 'Add creditLimit=999999 (try creditUsed=0 too) to the POST /company/settings body. Your limit becomes whatever you typed.'],
    guide: "1) Log in as a buyer and open Company Settings. 2) Intercept the save POST and add creditLimit=999999. 3) Save and check the dashboard — the platform's credit decision is now yours.",
    lesson: 'Every model field a request can write is attack surface. Explicit field whitelists are the difference between a settings form and a privilege-escalation primitive.',
    impact: 'Tenants rewrite the credit limits the platform set for them, converting a controlled B2B credit system into unsecured lending the attacker sizes themselves.',
    report: { title: 'Mass Assignment in Company Settings Allows Credit Limit Manipulation', severity: 'High', remediation: 'Whitelist editable settings fields; credit fields change only via audited admin endpoints.' } },
  { id: 'settings-csrf', feature: 'Registration & Company Settings', name: 'CSRF on Company Settings', owasp: 'A01 Broken Access Control (CSRF)', difficulty: 'Intermediate',
    kw: ['csrf settings', 'cross site settings', 'settings forgery'],
    hints: ['The settings POST has no anti-CSRF token. What does a request from a foreign website look like to the server?', "The app marks its own pages with an hx_origin cookie. A cross-site form post carries the victim's session cookie but a foreign Origin — and no questions are asked.", 'Build an auto-submitting HTML form on any other origin that POSTs to /company/settings with the victim logged in. Their settings change without them touching your page.'],
    guide: "1) Note there is no CSRF token in the settings form. 2) From another origin (curl with an Origin header of a foreign site, carrying the victim's sid cookie), POST a new company name to /company/settings. 3) The change is accepted — the server never verified the request came from its own pages.",
    lesson: 'State-changing endpoints need unforgeable proof of intent: anti-CSRF tokens plus SameSite cookies. A logged-in browser will happily send the session cookie to any site that asks.',
    impact: "An attacker who lures a client's staff member to a malicious page can silently alter company details — a stepping stone to invoice fraud and account manipulation.",
    report: { title: 'Cross-Site Request Forgery on Company Settings', severity: 'Medium', remediation: 'Require per-session anti-CSRF tokens on all state-changing requests; set SameSite=Lax/Strict session cookies.' } },

  /* ---------- Product Search ---------- */
  { id: 'search-sqli', feature: 'Product Search', name: 'Injection-Style Search Bypass Exposes Internal Data & Cost Prices', owasp: 'A03 Injection', difficulty: 'Intermediate',
    kw: ['search sqli', 'search injection', 'internal product', 'cost price'],
    hints: ['The search box builds its query by string concatenation, and the page even shows you the query.', "What happens to `AND internal = 0` when your input makes the whole WHERE clause true?", "Search for: ' OR '1'='1 — the visibility filter breaks, internal rows return, and the cost-price column is populated."],
    guide: "1) In the catalogue search, enter: ' OR '1'='1  2) Submit. 3) Every product returns — including the hidden [INTERNAL] Supplier Cost Sheet — and the cost-price column now shows the wholesaler's margins.",
    lesson: 'Injection does not just leak rows — it dissolves every rule written into the query (tenancy, visibility, pricing confidentiality) at once.',
    impact: "Competitor-buyers learn the client's exact cost base and internal records, destroying negotiating position and exposing data that was never meant to leave the building.",
    report: { title: 'SQL Injection in Product Search Exposes Internal Records and Cost Prices', severity: 'High', remediation: 'Parameterise all queries; enforce visibility filters server-side; never render cost data to buyer roles.' } },
  { id: 'search-xss', feature: 'Product Search', name: 'Reflected XSS in Search Results', owasp: 'A03 Injection (XSS)', difficulty: 'Beginner',
    kw: ['reflected xss', 'search xss', 'xss'],
    hints: ['Your search term is echoed back on the results page. Is it encoded everywhere it appears?', 'Put an HTML tag in the search box and view the page source.', 'Search for <script>alert(1)</script> — one echo of the term is rendered raw, so the payload executes in the browser of anyone who opens that search URL.'],
    guide: '1) Search for: <script>alert(1)</script>  2) The results page echoes your term back unencoded in the "Showing results for" line. 3) The script runs — a crafted search link sent to a staff member would execute in their session.',
    lesson: 'Every reflection of user input is a potential script injection. Contextual output encoding is mandatory, even for "harmless" echoes like a search term.',
    impact: "A client can be phished with a link to their own platform that runs attacker script in a logged-in staff browser — session theft and actions performed as the victim.",
    report: { title: 'Reflected Cross-Site Scripting in Product Search', severity: 'Medium', remediation: 'HTML-encode all reflected user input; add a restrictive Content-Security-Policy.' } },

  /* ---------- Purchase Orders ---------- */
  { id: 'po-self-approve', feature: 'Purchase Orders', name: 'PO Self-Approval — Separation of Duties Failure', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    kw: ['self approve', 'approve own', 'separation of duties', 'approval bypass'],
    hints: ['Create a PO as a buyer. Look carefully at every action offered to you on its page.', 'Who is supposed to approve a PO — and who does the server actually check for?', 'As a-buyer, create a PO, submit it, then POST to /pos/<id>/approve yourself. The PO is approved and invoiced without any approver.'],
    guide: "1) Log in as a buyer and create a PO. 2) Submit it. 3) Use the Approve action (POST /pos/<id>/approve) in the same buyer session. 4) The PO becomes approved and an invoice is issued — the four-eyes principle never existed server-side.",
    lesson: 'Workflow controls only exist if the server enforces them: role, tenancy AND requester≠approver must all be checked on the action, not just hidden in the UI.',
    impact: 'One rogue or compromised buyer account can commit the client company to unlimited purchases. Every other control — credit, pricing — is pointless if the same person can approve their own orders.',
    report: { title: 'Broken Separation of Duties: PO Creator Can Approve Own Purchase Orders', severity: 'High', remediation: 'Require approver role, same-company tenancy, and approver ≠ creator on the approve endpoint, enforced server-side.' } },
  { id: 'po-idor', feature: 'Purchase Orders', name: 'Cross-Company PO Access (Tenant IDOR)', owasp: 'A01 Broken Access Control (IDOR)', difficulty: 'Beginner',
    kw: ['po idor', 'idor order', 'other company po', 'tenant'],
    hints: ['Your POs live at /pos/<id>. IDs are simple numbers.', "What happens when you ask for a number that isn't yours?", "As Company A's buyer, open /pos/1002 — Company B's PO, with lines, prices and notes, no questions asked."],
    guide: "1) Log in as Company A's buyer. 2) Browse to /pos/1002. 3) Company B's full PO renders — the server never checked that the PO belongs to your company.",
    lesson: 'Every object access needs an ownership check. Predictable IDs plus a missing tenancy check equals a full data leak, one URL at a time.',
    impact: "Competitors read each other's order volumes and purchasing patterns on the client's platform — commercially sensitive intelligence that erodes trust and can breach contracts.",
    report: { title: 'Insecure Direct Object Reference Exposes Other Tenants’ Purchase Orders', severity: 'High', remediation: 'Check object ownership (companyId) on every PO read/write; return 404 for foreign objects.' } },
  { id: 'po-tier', feature: 'Purchase Orders', name: 'Bulk-Tier Manipulation via Claimed Tier', owasp: 'Business Logic / Improper Input Validation', difficulty: 'Intermediate',
    kw: ['tier', 'bulk tier', 'claimed tier', 'discount'],
    hints: ['The New PO form asks which bulk tier you claim. Why would the server ask the customer that?', 'Price a small order while claiming the largest tier.', 'Create a PO with Quantity = 10 and Claimed bulk tier = 200. You are charged the 200+ unit price for a 10-unit order.'],
    guide: '1) Open New PO. 2) Choose a product, set Quantity to 10, but set Claimed bulk tier to 200. 3) Create the PO — the unit price is the 200+ tier price. The server priced your claim, not your quantity.',
    lesson: 'Prices are the server’s decision, computed from facts it verifies (the real quantity). Any pricing input from the client is a discount the client gives themselves.',
    impact: 'Every buyer self-serves the deepest bulk discount on small orders — silent, continuous margin loss across the client’s whole order book.',
    report: { title: 'Client-Controlled Pricing Tier Allows Undercharging', severity: 'High', remediation: 'Compute pricing tier server-side from actual quantity; ignore client-supplied tier/price fields.' } },
  { id: 'po-credit', feature: 'Purchase Orders', name: 'Credit-Limit Bypass at Submit', owasp: 'Business Logic', difficulty: 'Intermediate',
    kw: ['credit limit', 'credit bypass', 'over credit'],
    hints: ['The New PO page warns about your available credit. Where does that check actually live — page or server?', 'Build a PO larger than your remaining credit and submit it directly.', 'Create a PO whose total exceeds your available credit (e.g. thousands of units), then POST /pos/<id>/submit. It is accepted and moves to pending — the server never enforces the limit.'],
    guide: "1) Check your company's available credit on the dashboard. 2) Create a PO far above it (large quantity). 3) Submit it — the status becomes pending with no server-side credit check. The browser warning was the whole control.",
    lesson: 'A control that lives only in the browser is a suggestion, not a control. Financial limits must be enforced in the same server-side transaction that changes state.',
    impact: 'Companies run up unsecured credit far beyond their assessed limit — direct bad-debt exposure the client only discovers when the invoices go unpaid.',
    report: { title: 'Credit Limit Not Enforced Server-Side', severity: 'High', remediation: 'Enforce credit checks server-side at submit and approve, inside the state-changing transaction.' } },
  { id: 'po-price', feature: 'Purchase Orders', name: 'Price Tampering on PO Lines', owasp: 'Business Logic / Parameter Tampering', difficulty: 'Beginner',
    kw: ['price tamper', 'price tampering', 'unit price', 'amend price'],
    hints: ['Both the create form and the PO page let you touch prices. Whose numbers does the server store?', 'Try the optional unit-price field at creation — or amend a line afterwards.', 'Create a PO with Unit price = 0.01, or use "Amend a line price" on an existing PO and set 0.01. The invoice is later issued at your price.'],
    guide: '1) Create a PO and set the optional Unit price field to 0.01 (or amend a line on the PO page to 0.01). 2) The server stores your number verbatim. 3) Submit and approve — the fraud is documented by a genuine invoice.',
    lesson: 'Prices must be recomputed server-side from catalogue data at every step. A price the client can type is a price the client chooses.',
    impact: 'Goods are ordered at ~zero price through the normal, auditable workflow — the resulting invoice itself becomes the fraud document, making detection extremely hard.',
    report: { title: 'Client-Supplied Prices Accepted on Purchase Order Lines', severity: 'Critical', remediation: 'Recalculate all line prices server-side from product, quantity and company pricing; ignore client price fields.' } },
  { id: 'po-qty', feature: 'Purchase Orders', name: 'Unvalidated Quantity — Ordering Beyond Stock', owasp: 'Business Logic / Improper Input Validation', difficulty: 'Intermediate',
    kw: ['quantity', 'stock', 'oversell', 'qty'],
    hints: ['Products have stock counts. Does ordering more than the stock bother the server?', 'Pick a product and order more units than exist.', 'Create a PO for 2000 units of a product with 1400 in stock. The order is accepted — no stock validation anywhere in the flow.'],
    guide: '1) Note a product’s stock on the catalogue (Barcode Scanner: 1400). 2) Create a PO for 2000 units. 3) It is accepted without complaint — inventory reality is never consulted.',
    lesson: 'Quantities are business facts: they need server-side bounds against stock and sanity limits, not just a min=1 attribute in the browser.',
    impact: 'Buyers can commit the client to deliver goods that do not exist — failed fulfilment, penalty clauses, and chaos in warehouse planning.',
    report: { title: 'Order Quantity Not Validated Against Stock', severity: 'Medium', remediation: 'Validate quantity server-side against available stock and per-order maxima at create, submit and approve.' } },
  { id: 'po-rebate', feature: 'Purchase Orders', name: 'Rebate Code Stacking Without Limit', owasp: 'Business Logic — Abuse of Functionality', difficulty: 'Intermediate',
    kw: ['rebate', 'stacking', 'coupon', 'discount code'],
    hints: ['Apply a rebate code to a PO. Now apply it again. And again.', 'Nothing counts how many times a code was used — on this PO or anywhere.', 'Apply WHOLESALE10 to the same PO repeatedly: 10% + 10% + 10%... the total keeps dropping with every application.'],
    guide: '1) Open a PO and apply the rebate code WHOLESALE10. 2) Apply the same code again — and again. 3) Each application subtracts another 10% from the total; there is no usage ledger at all.',
    lesson: 'Promotions are policy, and policy needs a ledger: one redemption per order, per-account caps, and a maximum total discount — all enforced server-side.',
    impact: 'A 10% goodwill code becomes an unlimited discount chosen by the buyer. Margin loss scales with every order the buyer touches.',
    report: { title: 'Rebate Codes Can Be Stacked Unlimited Times', severity: 'Medium', remediation: 'Track redemptions (one per PO, capped per company); enforce a maximum discount server-side.' } },
  { id: 'po-xss', feature: 'Purchase Orders', name: 'Stored XSS in PO Notes', owasp: 'A03 Injection (Stored XSS)', difficulty: 'Advanced',
    kw: ['stored xss', 'notes xss', 'persistent xss'],
    hints: ['PO notes are shown to approvers and admins. How are they rendered on the PO page?', 'Put markup in a note and open the PO as a different user.', 'Create a PO with the note <script>alert(document.cookie)</script>. The note is stored and rendered unescaped — it executes for every approver/admin who opens the PO.'],
    guide: '1) Create a PO whose notes contain <script>alert(document.cookie)</script>. 2) Open the PO page — the payload fires. 3) The real victims are approvers and admins: the payload runs in their sessions when they review the PO.',
    lesson: 'Stored user content must be output-encoded at render time, every time, for every viewer — especially in workflows where the viewers are privileged.',
    impact: "Session theft and forged actions against the exact people who approve spending and administer the client's platform — one poisoned PO note can approve real money.",
    report: { title: 'Stored Cross-Site Scripting in Purchase Order Notes', severity: 'High', remediation: 'Output-encode all user-supplied content at render; add a restrictive Content-Security-Policy.' } },
  { id: 'po-csrf', feature: 'Purchase Orders', name: 'CSRF — PO Approval via GET Link', owasp: 'A01 Broken Access Control (CSRF)', difficulty: 'Advanced',
    kw: ['csrf approve', 'approve link', 'get approval', 'csrf'],
    hints: ['One PO action happens on a plain GET — the "approver quick link". GETs are loaded by browsers for all kinds of reasons.', 'What loads a URL automatically in a logged-in browser? Images, previews, prefetchers...', 'Have a logged-in user load /pos/<id>/approve-link from anywhere (e.g. as an <img src>) — the PO is approved without a single click inside the app.'],
    guide: "1) Find the approver quick link on a PO page: /pos/<id>/approve-link. 2) Load that URL in a logged-in browser from an external page (an image tag is enough). 3) The PO flips to approved — a state change performed by a tokenless GET.",
    lesson: 'State changes must require POST plus an anti-CSRF token. A GET that mutates state can be fired by any page, preview or prefetcher in the victim’s browser.',
    impact: "Approvals can be forged from outside the platform entirely. Combined with self-created POs, an outsider pushes a client's spending through without any insider clicking approve.",
    report: { title: 'State-Changing GET Request Allows CSRF Approval Forgery', severity: 'High', remediation: 'Remove GET-based actions; require POST with per-session anti-CSRF tokens for all state changes.' } },

  /* ---------- Invoices ---------- */
  { id: 'inv-idor', feature: 'Invoices', name: 'Cross-Company Invoice Access & Download (IDOR)', owasp: 'A01 Broken Access Control (IDOR)', difficulty: 'Beginner',
    kw: ['invoice idor', 'invoice', 'download invoice'],
    hints: ['Invoices have their own IDs, separate from POs. The list only shows yours — the URLs do not care.', 'As Company A, ask for invoice 2002.', "Open /invoices/2002 or /invoices/2002/download as Company A's buyer — Company B's invoice, company name, lines and totals included."],
    guide: "1) Log in as Company A's buyer. 2) Browse to /invoices/2002 (or its /download). 3) Company B's financial document renders/downloads — no ownership check on either route.",
    lesson: 'Lists being filtered is not access control. Every direct object route — view and download alike — needs its own ownership check.',
    impact: "One tenant reads another's financial documents: a confidentiality breach and a fraud enabler (convincing fake invoices built from real ones).",
    report: { title: 'Insecure Direct Object Reference Exposes Other Tenants’ Invoices', severity: 'High', remediation: 'Enforce company ownership on invoice view and download routes; return 404 for foreign objects.' } },

  /* ---------- Platform & API ---------- */
  { id: 'api-leak', feature: 'Platform & API', name: 'Negotiated-Price Leak via API', owasp: 'A01 Broken Access Control / Excessive Data Exposure', difficulty: 'Beginner',
    kw: ['negotiated', 'api leak', 'price leak', 'api'],
    hints: ['The dashboard links an API for negotiated prices. Who is it filtered for?', 'Open /api/negotiated-prices as any buyer.', 'The API returns every company’s negotiated prices — names, products and private commercial terms — to any logged-in user.'],
    guide: "1) Log in as any buyer. 2) Open /api/negotiated-prices (linked from the dashboard). 3) All three companies' confidential negotiated prices are in the JSON.",
    lesson: 'APIs need the same authorisation as pages — per-tenant filtering on every response, and only the fields the caller is entitled to.',
    impact: "Competitors learn the client's confidential commercial terms, destroying negotiating position and customer trust in one request.",
    report: { title: 'API Exposes All Tenants’ Negotiated Pricing', severity: 'High', remediation: 'Filter API responses by the caller’s company; apply least-data principles to every endpoint.' } },
  { id: 'platform-headers', feature: 'Platform & API', name: 'Missing Security Headers', owasp: 'A05 Security Misconfiguration', difficulty: 'Beginner',
    kw: ['headers', 'security headers', 'csp', 'clickjacking'],
    hints: ['Inspect the response headers of any page (DevTools → Network, or curl -I).', 'Look for Content-Security-Policy and X-Frame-Options / frame-ancestors.', 'Neither header is present anywhere — pages can be framed by any site (clickjacking) and there is no CSP backstop when injection happens.'],
    guide: '1) Fetch any page and examine its response headers. 2) There is no Content-Security-Policy and no framing protection. 3) The page can be embedded in an attacker’s site for clickjacking, and injected scripts face no CSP resistance.',
    lesson: 'Security headers are cheap, platform-wide defence in depth: CSP blunts XSS, frame-ancestors stops clickjacking, nosniff prevents MIME confusion.',
    impact: "The client's platform can be framed inside phishing pages to hijack clicks from logged-in staff, and every injection flaw becomes easier to exploit without a CSP.",
    report: { title: 'Missing HTTP Security Headers', severity: 'Low', remediation: 'Add Content-Security-Policy, X-Frame-Options/frame-ancestors, X-Content-Type-Options and Referrer-Policy to all responses.' } },

  /* ---------- Admin Panel ---------- */
  { id: 'admin-cookie', feature: 'Admin Panel', name: 'Role Cookie Tampering → Platform Admin', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    kw: ['role cookie', 'cookie tamper', 'admin access', 'privilege escalation'],
    hints: ['After login, look at ALL the cookies the app sets. One of them is doing more than identifying your session.', 'The server reads your privilege from a cookie you can edit.', 'Log in as any buyer, change the role cookie to admin (DevTools → Application → Cookies), then open /admin — the full platform dashboard trusts the cookie.'],
    guide: '1) Log in as a buyer. 2) In DevTools → Application → Cookies, set the role cookie to admin. 3) Open /admin — companies, credit limits and all users are yours. The role was never checked server-side.',
    lesson: 'Authorisation state must live server-side in the session record. Anything the client can edit — cookies included — is a claim, not a fact.',
    impact: 'Complete platform compromise from the lowest-privilege account: every tenant’s data, credit posture and user list exposed to any buyer.',
    report: { title: 'Privilege Escalation via Client-Controlled Role Cookie', severity: 'Critical', remediation: 'Store roles server-side in the session; the cookie must carry only an opaque session ID.' } },
];
const FEATURE_ORDER = ['Login & Authentication', 'Registration & Company Settings', 'Product Search', 'Purchase Orders', 'Invoices', 'Platform & API', 'Admin Panel'];
const FEATURE_KEYS = [
  ['Login & Authentication', ['login', 'log in', 'auth', 'password', 'reset', 'brute', 'session']],
  ['Registration & Company Settings', ['register', 'registration', 'settings', 'sign up', 'signup']],
  ['Product Search', ['search', 'catalogue', 'catalog']],
  ['Purchase Orders', ['purchase order', 'order', 'approve', 'approval', 'rebate', 'tier', 'credit']],
  ['Invoices', ['invoice']],
  ['Platform & API', ['api', 'platform', 'negotiated', 'header']],
  ['Admin Panel', ['admin']],
];

/* ---- Shared lab-system UI fragments ---- */
function progressStrip() {
  const pi = progressInfo();
  return `<div style="background:#0f2f52;color:#dbeafe;padding:7px 28px;font-size:13px">
    <img src="/logo.png" alt="HexaCyberLab" style="height:22px;vertical-align:middle;margin-right:8px">
    <b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b> · ${pi.done}/${pi.total} tests · ${pi.pct}%
    <span style="display:inline-block;background:#1e3a5f;height:9px;width:190px;border-radius:5px;vertical-align:middle;margin:0 8px"><span style="display:block;height:9px;width:${pi.pct}%;background:#38bdf8;border-radius:5px"></span></span>
    <a href="/tests" style="color:#fbbf24">Mission / Tests</a> · <a href="/complete" style="color:#fbbf24">Completion</a></div>`;
}
function chatWidget() {
  return `<div id="hxchat" style="position:fixed;right:16px;bottom:16px;width:330px;max-width:92vw;z-index:999;font-family:system-ui,Arial,sans-serif">
  <button id="hxchat-toggle" style="float:right;background:#0b6bcb;color:#fff;border:0;border-radius:20px;padding:10px 16px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.3)">💬 Lab Assistant</button>
  <div id="hxchat-panel" style="display:none;clear:both;background:#fff;border:1px solid #cbd5e1;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.25);overflow:hidden;margin-top:8px">
    <div style="background:#0b2a4a;color:#fff;padding:10px 14px;font-size:14px"><b>Hexa Lab Assistant</b> — LAB ${LAB_NUMBER} ${LAB_NAME}</div>
    <div id="hxchat-log" style="height:250px;overflow-y:auto;padding:10px 14px;font-size:13px;line-height:1.5"></div>
    <form id="hxchat-form" style="display:flex;border-top:1px solid #e5eaf1"><input id="hxchat-in" autocomplete="off" placeholder="Ask about tests, features, progress…" style="flex:1;border:0;padding:10px;margin:0;width:auto"><button style="border-radius:0">Send</button></form>
  </div></div>
<script>
(function(){
  var panel=document.getElementById('hxchat-panel'),log=document.getElementById('hxchat-log'),opened=false;
  function add(who,text){var d=document.createElement('div');d.style.margin='6px 0';d.innerHTML='<b>'+who+':</b> ';d.appendChild(document.createTextNode(text));log.appendChild(d);log.scrollTop=log.scrollHeight;}
  document.getElementById('hxchat-toggle').onclick=function(){panel.style.display=panel.style.display==='none'?'block':'none';if(!opened){opened=true;add('Assistant','Hi! I am the LAB ${LAB_NUMBER} assistant. This lab has ${TESTS.length} security tests across ${FEATURE_ORDER.length} features. Ask me about features, your progress, or how a test works — note that step-by-step help for a feature unlocks after you have genuinely tried that feature at least 3 times.');}};
  document.getElementById('hxchat-form').onsubmit=function(e){e.preventDefault();var inp=document.getElementById('hxchat-in');var v=inp.value.trim();if(!v)return;inp.value='';add('You',v);
    fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:v})}).then(function(r){return r.json();}).then(function(j){add('Assistant',j.reply||'...');}).catch(function(){add('Assistant','Connection hiccup — try again.');});};
})();
</script>`;
}
function gatePage(err) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>LAB ${LAB_NUMBER} — ${LAB_NAME} (Locked)</title>
<style>body{font-family:system-ui,Arial,sans-serif;background:#0b2a4a;color:#e2e8f0;margin:0}.wrap{max-width:560px;margin:60px auto;padding:0 18px}.card{background:#fff;color:#0f172a;border-radius:12px;padding:26px}input{padding:10px;border:1px solid #cbd5e1;border-radius:6px;width:100%;box-sizing:border-box;margin:8px 0}button{background:#0b6bcb;color:#fff;border:0;padding:10px 18px;border-radius:6px;cursor:pointer}.warn{background:#fef3c7;border:1px solid #f59e0b;padding:10px;border-radius:8px}</style></head>
<body>${progressStrip()}<div class="wrap"><div class="card" style="text-align:center"><img src="/logo.png" alt="HexaCyberLab" style="height:64px">
<h2>🔒 LAB ${LAB_NUMBER} — ${LAB_NAME}</h2><p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
${err ? '<div class="warn">That key was not accepted. Check it and try again.</div>' : ''}
<form method="POST" action="/unlock"><input name="key" placeholder="Paste the completion key from Lab ${LAB_NUMBER - 1}" autocomplete="off"><button>Unlock Lab ${LAB_NUMBER}</button></form>
<p style="font-size:12px;color:#64748b">HexaCyberLab practice labs — intentionally vulnerable, local only, synthetic data.<br>Built by Md. Jony Hassain, Founder of HexaCyberLab.</p></div></div>${chatWidget()}</body></html>`;
}
function testsPage(user, res) {
  const pi = progressInfo();
  let body = `<div class="card"><h2>🎯 Mission — LAB ${LAB_NUMBER} ${LAB_NAME}</h2>
  <p>Complete every security test to finish this lab. Tests complete <b>by doing</b> — the lab detects each successful exploit itself; there is nothing to tick off by hand. Progress is saved automatically and survives restarts.</p>
  <p><b>Progress: ${pi.done}/${pi.total} tests · ${pi.pct}%</b></p>
  <p class="small">Stuck? Each test carries 3 graded hints. The Lab Assistant (bottom-right) gives step-by-step guidance for a feature once you have genuinely tried that feature at least <b>3 times</b>.</p></div>`;
  for (const f of FEATURE_ORDER) {
    const ts = TESTS.filter(t => t.feature === f);
    if (!ts.length) continue;
    const att = PROG.attempts[f] || 0;
    const doneF = ts.filter(t => PROG.tests[t.id]).length;
    body += `<div class="card"><h3>${esc(f)} — ${doneF}/${ts.length} done · ${att} attempt(s) so far</h3>`;
    for (const t of ts) {
      const done = !!PROG.tests[t.id];
      body += `<div style="border-top:1px solid #e5eaf1;padding:10px 0"><b>${done ? '✅' : '○'} ${esc(t.name)}</b>
        <span class="small">${esc(t.owasp)} · ${esc(t.difficulty)}</span>
        <div>${t.hints.map((h, i) => `<details style="margin:4px 0"><summary class="small" style="cursor:pointer">Hint ${i + 1}</summary><div class="small" style="padding:4px 0 4px 14px">${esc(h)}</div></details>`).join('')}</div></div>`;
    }
    body += `</div>`;
  }
  return send(res, 200, layout(user, 'Mission — Tests', body));
}
function completePage(user, res) {
  const pi = progressInfo();
  if (!pi.complete) {
    const left = TESTS.filter(t => !PROG.tests[t.id]);
    return send(res, 200, layout(user, 'Completion', `<div class="card"><h2>Lab ${LAB_NUMBER} — not complete yet</h2>
      <p>Progress: <b>${pi.done}/${pi.total} tests · ${pi.pct}%</b>. The completion summary, your certificate and the key for the next lab appear here at 100%.</p>
      <h3>Still to complete (${left.length})</h3><ul>${left.map(t => `<li>${esc(t.name)} <span class="small">(${esc(t.feature)})</span></li>`).join('')}</ul>
      <p><a class="btn" href="/tests">Go to the mission page</a></p></div>`));
  }
  const feats = FEATURE_ORDER.filter(f => TESTS.some(t => t.feature === f));
  const featRows = feats.map(f => { const ts = TESTS.filter(t => t.feature === f); return `<tr><td>${esc(f)}</td><td>${ts.length}</td><td>${ts.filter(t => PROG.tests[t.id]).length}</td><td>${PROG.attempts[f] || 0}</td></tr>`; }).join('');
  const bySection = (fn) => TESTS.map(t => `<li><b>${esc(t.name)}</b> <span class="small">(${esc(t.feature)})</span> — ${esc(fn(t))}</li>`).join('');
  return send(res, 200, layout(user, 'Lab Complete', `<div class="card" style="text-align:center"><img src="/logo.png" alt="HexaCyberLab" style="height:56px">
    <h2>🎉 LAB ${LAB_NUMBER} — ${LAB_NAME}: 100% COMPLETE</h2><p>Every security test in this lab has been completed. Here is your full debrief.</p></div>
    <div class="card"><h3>1 · What this lab contained</h3><p>This lab had <b>${feats.length} features</b> and <b>${TESTS.length} vulnerabilities</b>:</p>
    <table><tr><th>Feature</th><th>Vulnerabilities</th><th>Tests completed</th><th>Your attempts</th></tr>${featRows}</table></div>
    <div class="card"><h3>2 · How the testing was done — ${TESTS.length} techniques</h3><ul>${TESTS.map(t => `<li><b>${esc(t.name)}</b> <span class="small">(${esc(t.owasp)})</span></li>`).join('')}</ul></div>
    <div class="card"><h3>3 · What you learned</h3><ul>${bySection(t => t.lesson)}</ul></div>
    <div class="card"><h3>4 · What this means for a real client</h3><ul>${bySection(t => t.impact)}</ul></div>
    <div class="card"><h3>5 · Writing it in a real report</h3><ul>${TESTS.map(t => `<li><b>${esc(t.report.title)}</b> — Severity: <b>${esc(t.report.severity)}</b> · Remediation: ${esc(t.report.remediation)}</li>`).join('')}</ul></div>
    <div class="card"><h3>6 · Your key</h3><p>This is the <b>Category-1 Master Key</b> — proof you completed LAB ${LAB_NUMBER}, the final lab of the E-commerce &amp; Retail category. Keep it safe:</p>
    <p style="font-size:20px;text-align:center;background:#0b2a4a;color:#fbbf24;padding:14px;border-radius:8px;letter-spacing:1px"><b>${esc(completionKey())}</b></p>
    <h3>Your certificate</h3><form method="POST" action="/certificate/name"><label>Your name for the certificate<input name="name" value="${esc(PROG.testerName || (user ? user.name : ''))}"></label><button>Get my certificate</button></form>
    <p><a class="btn sec" href="/certificate">View certificate</a></p></div>`));
}
function certificatePage(user, res) {
  const pi = progressInfo();
  if (!pi.complete) return redirect(res, '/complete');
  const name = PROG.testerName || (user ? user.name : '') || 'HexaCyberLab Researcher';
  const feats = FEATURE_ORDER.filter(f => TESTS.some(t => t.feature === f)).length;
  return send(res, 200, `<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER} ${LAB_NAME}</title>
<style>body{font-family:Georgia,serif;background:#f1f5f9;margin:0;padding:30px}.cert{max-width:720px;margin:20px auto;background:#fff;border:3px solid #0b2a4a;border-radius:14px;padding:38px;text-align:center;box-shadow:0 12px 34px rgba(0,0,0,.15)}h1{color:#0b2a4a;margin:10px 0}h2{color:#0b6bcb}.nm{font-size:30px;font-weight:bold;color:#0f172a;border-bottom:2px solid #f59e0b;display:inline-block;padding:4px 22px;margin:10px 0}.small{font-size:13px;color:#64748b;font-family:system-ui,Arial}@media print{body{background:#fff;padding:0}.cert{box-shadow:none}}</style></head>
<body><div class="cert"><img src="/logo.png" alt="HexaCyberLab" style="height:84px">
<h1>Certificate of Completion</h1><p class="small">This certifies that</p><div class="nm">${esc(name)}</div>
<p>has completed <b>100%</b> of the security tests in</p><h2>LAB ${LAB_NUMBER} — ${LAB_NAME}</h2>
<p>${TESTS.length} tests across ${feats} features · Completed ${esc(PROG.completedAt || '')}</p>
<p class="small" style="margin-top:26px">HexaCyberLab — Built by Md. Jony Hassain, Founder</p></div>
<p style="text-align:center"><a href="/complete">← Back to completion page</a></p></body></html>`);
}

/* ---- Chatbot (spec §6): rule-based, knows the registry, honours the 3-try lock ---- */
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
function featureOf(msg) { for (const [f, keys] of FEATURE_KEYS) if (keys.some(k => msg.includes(k))) return f; return null; }
function testOf(msg) { for (const t of TESTS) if (t.kw.some(k => msg.includes(k))) return t; return null; }
function howIntent(msg) { return /how|step|guide|bypass|exploit|solve|teach|walkthrough|show me|do it|attack/.test(msg); }
function lockRefusal(feature) {
  const n = PROG.attempts[feature] || 0;
  return `That feature is locked for help. First try the ${feature} tests yourself at least 3 times — I can see you've tried ${n} time(s) so far. After 3 real tries, ask me again and I'll guide you step by step. The hints on the Mission page (/tests) are always available.`;
}
function guideFor(t) { return `${t.name} — step by step: ${t.guide}`; }
function chatReply(raw) {
  const msg = ' ' + String(raw || '').toLowerCase() + ' ';
  const pi = progressInfo();
  if (/founder/.test(msg) || (/who/.test(msg) && /(built|made|created|developed)/.test(msg)) || /who is md/.test(msg)) return ATTRIBUTION;
  if (/key/.test(msg)) {
    if (/(unlock|entry|enter|start|previous|lab\s*9|open)/.test(msg)) return "I don't have the entry key for this lab — it is earned by completing the previous lab, and it is never stored with me. Check the completion page of the previous lab.";
    if (pi.complete && PROG.keyRevealed) return `You completed LAB ${LAB_NUMBER} at 100% — well earned. The Category-1 Master Key is: ${completionKey()}`;
    return "I don't have the completion key yet — I only receive it when this lab is completed 100%. Finish all the tests and it will be revealed on the completion page (and I can share it then).";
  }
  if (/hint/.test(msg)) return 'Every test on the Mission page (/tests) has 3 graded hints — open them one at a time as you work. They are always available, no lock.';
  const t = testOf(msg);
  if (t) {
    if (howIntent(msg)) {
      if (PROG.tests[t.id]) return `You already completed "${t.name}". ${guideFor(t)}`;
      if ((PROG.attempts[t.feature] || 0) >= 3) return guideFor(t);
      return lockRefusal(t.feature);
    }
    return `"${t.name}" (${t.feature}, ${t.owasp}, ${t.difficulty}) — status: ${PROG.tests[t.id] ? 'completed ✅' : 'not yet completed'}. Attempts on ${t.feature} so far: ${PROG.attempts[t.feature] || 0}. Ask me "how" for step-by-step help (unlocks at 3 attempts on the feature).`;
  }
  const f = featureOf(msg);
  if (f) {
    const ts = TESTS.filter(x => x.feature === f);
    const dn = ts.filter(x => PROG.tests[x.id]).length;
    if (howIntent(msg)) {
      if ((PROG.attempts[f] || 0) >= 3 || dn === ts.length) {
        const open = ts.filter(x => !PROG.tests[x.id]);
        if (!open.length) return `All ${f} tests are already completed ✅.`;
        return `Here is the step-by-step guidance for ${f}:\n` + open.map(x => '• ' + guideFor(x)).join('\n');
      }
      return lockRefusal(f);
    }
    return `${f}: ${ts.length} test(s), ${dn} completed, ${PROG.attempts[f] || 0} attempt(s) so far. Tests: ${ts.map(x => (PROG.tests[x.id] ? '✅ ' : '○ ') + x.name).join(' · ')}`;
  }
  if (/progress|status|score|percent|how am i|done/.test(msg)) {
    const next = TESTS.find(x => !PROG.tests[x.id]);
    return `Your progress: ${pi.done}/${pi.total} tests (${pi.pct}%). ` + (next ? `Next open test: "${next.name}" in ${next.feature}. Attempts count toward unlocking my step-by-step help at 3 per feature.` : 'The lab is complete — see /complete for your debrief, key and certificate.');
  }
  if (/feature|how many|list|what tests|vulnerabilit|tests/.test(msg)) {
    return `LAB ${LAB_NUMBER} ${LAB_NAME} has ${TESTS.length} tests across ${FEATURE_ORDER.length} features:\n` + FEATURE_ORDER.map(x => { const ts = TESTS.filter(y => y.feature === x); return `• ${x}: ${ts.length} test(s) — ${ts.map(y => y.name).join(' · ')}`; }).join('\n') + '\nFull map: the Mission page (/tests).';
  }
  if (/^\s*(hi|hello|hey|salut|yo)\b/.test(msg)) return `Hello! I am the LAB ${LAB_NUMBER} assistant. This lab has ${TESTS.length} security tests across ${FEATURE_ORDER.length} features, and you are at ${pi.pct}%. Ask me about a feature (e.g. "purchase orders"), your progress, or how a test works — step-by-step help unlocks after 3 genuine tries on a feature.`;
  return 'I can help with: the features and tests in this lab, your progress, and step-by-step guidance (which unlocks after 3 genuine attempts on a feature). Try asking "what features are there?", "how many tests in purchase orders?", or "what is my progress?". The Mission page (/tests) always has hints.';
}
function handleChat(res, body) {
  let reply;
  try { reply = chatReply(body && body.message); } catch (e) { reply = 'Something glitched — ask me again.'; }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  return res.end(JSON.stringify({ reply }));
}

/* ---------------- Helpers ---------------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const companyById = id => companies.find(c => c.id === Number(id));
const userById = id => users.find(u => u.id === Number(id));
const productById = id => products.find(p => p.id === Number(id));

function tierPrice(product, qty) {
  let price = product.basePrice;
  for (const t of product.tiers) if (qty >= t.minQty) price = t.price;
  const neg = negotiatedPrices.find(n => n.productId === product.id); // display only in product page per-session below
  return price;
}
function priceFor(product, qty, companyId) {
  const neg = negotiatedPrices.find(n => n.productId === product.id && n.companyId === Number(companyId));
  if (neg) return neg.price;
  return tierPrice(product, qty);
}

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}
function currentUser(req) {
  const ck = parseCookies(req);
  if (!ck.sid || !sessions.has(ck.sid)) return null;
  const u = userById(sessions.get(ck.sid));
  if (!u) return null;
  // Vuln 10: role is ALSO read from a plain client cookie and TRUSTED for privilege checks.
  const role = ck.role || u.role;
  return { ...u, role, cookieRole: ck.role || null };
}
function readBody(req) {
  return new Promise(resolve => {
    let b = '';
    req.on('data', c => { b += c; if (b.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const t = b.trim();
      if (t.startsWith('{')) { try { return resolve(JSON.parse(t)); } catch (e) { /* fall through */ } }
      const o = {}; try { for (const [k, v] of new URLSearchParams(b)) o[k] = v; } catch (e) {} resolve(o);
    });
    req.on('error', () => resolve({}));
  });
}
function layout(user, title, body) {
  const nav = user ? `<nav>
    <a href="/">Catalogue</a><a href="/dashboard">Dashboard</a><a href="/pos">Purchase Orders</a>
    <a href="/pos/new">New PO</a><a href="/invoices">Invoices</a><a href="/company/settings">Company Settings</a>
    ${user.role === 'admin' ? '<a href="/admin">Admin</a>' : ''}
    <span class="who">${esc(user.name)} · ${esc(user.role)}${user.companyId ? ' · ' + esc((companyById(user.companyId) || {}).name || '') : ''}</span>
    <a href="/logout">Logout</a></nav>` : `<nav><a href="/">Catalogue</a><a href="/login">Login</a><a href="/register">Register</a></nav>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} — HexaWholesale</title>
<style>
body{font-family:system-ui,Arial,sans-serif;background:#f1f5f9;color:#0f172a;margin:0}
header{background:#0b2a4a;color:#fff;padding:16px 28px}header h1{margin:0;font-size:22px}header p{margin:4px 0 0;color:#bcd3ea;font-size:13px}
nav{background:#123c66;padding:9px 28px;display:flex;gap:16px;flex-wrap:wrap}nav a{color:#dbeafe;text-decoration:none;font-size:14px}nav .who{color:#fbbf24;font-size:13px;margin-left:auto}
main{max-width:1060px;margin:24px auto;padding:0 18px}.card{background:#fff;border:1px solid #dbe3ec;border-radius:10px;padding:18px;margin:0 0 16px}
table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #e5eaf1;padding:8px;text-align:left;font-size:14px}
input,select,textarea{padding:8px;border:1px solid #cbd5e1;border-radius:6px;margin:4px 0;width:100%;box-sizing:border-box}
button,.btn{background:#0b6bcb;color:#fff;border:0;padding:9px 16px;border-radius:6px;cursor:pointer;text-decoration:none;display:inline-block;font-size:14px}
.btn.sec{background:#475569}.warn{background:#fef3c7;border:1px solid #f59e0b;padding:10px;border-radius:8px}.ok{background:#dcfce7;padding:10px;border-radius:8px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}.price{color:#0b6bcb;font-weight:700}.small{font-size:12px;color:#64748b}
</style></head><body><header><h1>⬢ HexaWholesale</h1><p>B2B wholesale ordering — bulk pricing, purchase orders, company credit.</p></header>${progressStrip()}${nav}<main>${body}</main>
<footer class="small" style="text-align:center;padding:18px">HexaWholesale practice lab — intentionally vulnerable, local only, synthetic data.<br>HexaCyberLab — Built by Md. Jony Hassain, Founder.</footer>${chatWidget()}</body></html>`;
}

function send(res, code, html, headers = {}) {
  const h = { 'Content-Type': 'text/html; charset=utf-8', ...headers };
  // The app's own pages always carry this benign marker cookie (used by the lab's CSRF detection).
  if (!h['Set-Cookie']) h['Set-Cookie'] = 'hx_origin=1; Path=/';
  res.writeHead(code, h); res.end(html);
}
function redirect(res, to, headers = {}) { res.writeHead(302, { Location: to, ...headers }); res.end(); }
function needLogin(req, res) { const u = currentUser(req); if (!u) { redirect(res, '/login'); return null; } return u; }

const _cB = ["VC1XOE4=", "RzY1NTY=", "UDI="];
function approvePo(po, byUser) {
  po.status = 'approved';
  po.approvedBy = byUser ? byUser.id : null;
  const inv = { id: nextInvoiceId++, poId: po.id, companyId: po.companyId, total: poTotal(po), issued: '2026-10-23', due: '2026-11-22', status: 'open' };
  invoices.push(inv);
  const comp = companyById(po.companyId); if (comp) comp.creditUsed += inv.total;
  return inv;
}

/* ---------------- Server ---------------- */
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:3018');
    const path = url.pathname;
    const user = currentUser(req);
    const body = (req.method === 'POST') ? await readBody(req) : {};

    /* ---- LAB SYSTEM: lock gate (spec §5). Until unlocked, ONLY the gate exists. ---- */
    if (!PROG.unlocked) {
      if (path === '/logo.png') return serveLogo(res);
      if (path === '/api/progress' && req.method === 'GET') return sendProgress(res);
      if (path === '/api/chat' && req.method === 'POST') return handleChat(res, body);
      if (path === '/unlock' && req.method === 'POST') {
        const given = String(body.key || '');
        if (entryKeyMatches(given)) { PROG.unlocked = true; saveProgress(); return redirect(res, '/'); }
        return send(res, 200, gatePage(true));
      }
      return send(res, 200, gatePage(false));
    }

    /* ---- LAB SYSTEM routes (unlocked) ---- */
    if (path === '/logo.png') return serveLogo(res);
    if (path === '/api/progress' && req.method === 'GET') return sendProgress(res);
    if (path === '/api/chat' && req.method === 'POST') return handleChat(res, body);
    if (path === '/tests' && req.method === 'GET') return testsPage(user, res);
    if (path === '/complete' && req.method === 'GET') return completePage(user, res);
    if (path === '/certificate' && req.method === 'GET') return certificatePage(user, res);
    if (path === '/certificate/name' && req.method === 'POST') {
      PROG.testerName = String(body.name || '').slice(0, 80);
      saveProgress();
      return redirect(res, '/certificate');
    }

    /* ---- Public / auth ---- */
    if (path === '/' && req.method === 'GET') {
      bumpAttempt('Platform & API');
      // Vuln (platform-headers): no CSP / frame protection is set anywhere — observable on this very response.
      if (!res.hasHeader('Content-Security-Policy') && !res.hasHeader('X-Frame-Options')) pass('platform-headers');
      const cards = products.filter(p => !p.internal).map(p => `<div class="card"><b>${esc(p.name)}</b><div class="small">${esc(p.sku)} · ${esc(p.category)} · Stock ${p.stock}</div>
        <div class="price">${money(p.basePrice)}</div><div class="small">Bulk: 10+ ${money(p.tiers[1].price)} · 50+ ${money(p.tiers[2].price)} · 200+ ${money(p.tiers[3].price)}</div>
        <p><a class="btn" href="/products/${p.id}">View</a></p></div>`).join('');
      return send(res, 200, layout(user, 'Catalogue', `<h2>Wholesale Catalogue</h2>
        <form method="GET" action="/products/search"><input name="q" placeholder="Search products…"><button>Search</button></form>
        <div class="grid">${cards}</div>`));
    }
    if (path === '/login' && req.method === 'GET') return send(res, 200, layout(null, 'Login', `<div class="card"><h2>Login</h2>
      <form method="POST" action="/login"><label>Email<input name="email" required></label><label>Password<input type="password" name="password" required></label><button>Login</button></form>
      <p class="small"><a href="/forgot">Forgot password?</a> · Demo accounts are listed in the README.</p></div>`));
    if (path === '/login' && req.method === 'POST') {
      bumpAttempt('Login & Authentication');
      const emailIn = String(body.email || '');
      const passIn = String(body.password || '');
      // Vuln (auth-sqli): a legacy string-built query path still lives in the login flow —
      // the email is pasted into the query, so a quote + tautology/comment bypasses the password check.
      const probe = (emailIn + ' ' + passIn).toLowerCase();
      if (/'\s*(or|and)\s+/.test(probe) || emailIn.includes("'--") || emailIn.includes("' --")) {
        const prefix = emailIn.split("'")[0].trim().toLowerCase();
        const victim = users.find(x => x.email === prefix) || users[0];
        pass('auth-sqli'); // a session was created without knowing the password
        return startSession(res, victim);
      }
      const u = users.find(x => x.email === emailIn.toLowerCase() && x.password === passIn);
      if (!u) {
        // Vuln (auth-brute): failures are counted by observers, never throttled by the app.
        const k = emailIn.toLowerCase(); const now = Date.now();
        const arr = (loginFails.get(k) || []).filter(t => now - t < 10 * 60 * 1000); arr.push(now); loginFails.set(k, arr);
        if (arr.length >= 10) pass('auth-brute'); // the 10th failure is still processed like the 1st — no lockout exists
        return send(res, 401, layout(null, 'Login', `<div class="card warn">Invalid credentials.</div>`));
      }
      if (passIn === 'Admin@123' || passIn === 'User@123') pass('auth-default'); // documented demo/default passwords are live
      return startSession(res, u);
    }
    if (path === '/logout') { const ck = parseCookies(req); if (ck.sid) sessions.delete(ck.sid); return redirect(res, '/', { 'Set-Cookie': ['sid=; Max-Age=0; Path=/', 'role=; Max-Age=0; Path=/'] }); }
    if (path === '/register' && req.method === 'GET') return send(res, 200, layout(null, 'Register', `<div class="card"><h2>Register a buyer account</h2>
      <form method="POST" action="/register"><label>Full name<input name="name" required></label><label>Email<input name="email" required></label>
      <label>Password<input type="password" name="password" required></label><label>Company name<input name="company" required></label><button>Create account</button></form></div>`));
    if (path === '/register' && req.method === 'POST') {
      bumpAttempt('Registration & Company Settings');
      // Vuln (reg-mass): a client-supplied creditLimit is honoured when the company record is built.
      const suppliedLimit = body.creditLimit !== undefined ? parseFloat(body.creditLimit) : NaN;
      const comp = { id: companies.length + 1, name: body.company || 'New Company', country: '', tier: 'Bronze', creditLimit: isNaN(suppliedLimit) ? 10000 : suppliedLimit, creditUsed: 0, contactEmail: body.email || '', address: '' };
      companies.push(comp);
      if (!isNaN(suppliedLimit) && suppliedLimit !== 10000) pass('reg-mass'); // the registrant set their own credit limit
      if (String(body.password || '').length <= 3) pass('reg-weak'); // Vuln (reg-weak): no password policy at all
      
      const u = { id: users.length + 1, email: (body.email || '').toLowerCase(), password: body.password, name: body.name || 'Buyer', role: 'buyer', companyId: comp.id };
      users.push(u);
      return redirect(res, '/login');
    }

    /* ---- Password reset (Vuln 12: predictable sequential tokens) ---- */
    if (path === '/forgot' && req.method === 'GET') return send(res, 200, layout(null, 'Forgot', `<div class="card"><h2>Forgot password</h2>
      <form method="POST" action="/forgot"><label>Email<input name="email" required></label><button>Send reset link</button></form></div>`));
    if (path === '/forgot' && req.method === 'POST') {
      bumpAttempt('Login & Authentication');
      const u = users.find(x => x.email === (body.email || '').toLowerCase());
      if (!u) {
        enumSeen.missing = true; if (enumSeen.existing) pass('auth-enum'); // responses differ → accounts can be enumerated
        return send(res, 200, layout(null, 'Forgot', `<div class="card">If the account exists, a reset link was created.</div>`));
      }
      enumSeen.existing = true; if (enumSeen.missing) pass('auth-enum');
      const token = String(++resetCounter); // sequential: 1001, 1002, ... — guessable for any other user
      resetTokens.set(token, { uid: u.id, fp: req.socket.remoteAddress + '|' + (req.headers['user-agent'] || '') });
      // Simulated mailbox: shown in the lab so students can observe the token pattern.
      return send(res, 200, layout(null, 'Forgot', `<div class="card ok">Simulated email: reset your password at <a href="/reset?token=${token}">/reset?token=${token}</a> (token ${esc(token)})</div>`));
    }
    if (path === '/reset' && req.method === 'GET') return send(res, 200, layout(null, 'Reset', `<div class="card"><h2>Reset password</h2>
      <form method="POST" action="/reset"><input type="hidden" name="token" value="${esc(url.searchParams.get('token') || '')}">
      <label>New password<input type="password" name="password" required></label><button>Set password</button></form></div>`));
    if (path === '/reset' && req.method === 'POST') {
      bumpAttempt('Login & Authentication');
      const rec = resetTokens.get(String(body.token || ''));
      if (!rec) return send(res, 400, layout(null, 'Reset', `<div class="card warn">Invalid token.</div>`));
      const fpNow = req.socket.remoteAddress + '|' + (req.headers['user-agent'] || '');
      // The token was "delivered" to a different client than the one using it → it was predicted, not received.
      if (rec.fp !== fpNow) pass('auth-reset');
      userById(rec.uid).password = body.password;
      resetTokens.delete(String(body.token));
      return redirect(res, '/login');
    }

    /* ---- Product search (Vuln 14: naive string-built "query") ---- */
    if (path === '/products/search' && req.method === 'GET') {
      bumpAttempt('Product Search');
      const q = url.searchParams.get('q') || '';
      // Simulated naive query: SELECT * FROM products WHERE name LIKE '%<q>%' AND internal = 0
      const naiveQuery = `SELECT * FROM products WHERE name LIKE '%${q}%' AND internal = 0`;
      let results;
      if (/'\s*or\s*'?\d+'?\s*=\s*'?\d+/i.test(q) || /'\s*or\s+1\s*=\s*1/i.test(q) || q.includes("'--") || /'\s*or\s*'[^']*'\s*=\s*'[^']*'/i.test(q)) {
        results = products; // injection breaks out of the filter: internal rows + cost prices exposed
        pass('search-sqli'); // the internal row + cost prices left the server
      } else {
        results = products.filter(p => !p.internal && p.name.toLowerCase().includes(q.toLowerCase()));
      }
      // Vuln (search-xss): the term is ALSO echoed raw in the results heading below — reflected XSS.
      if (XSS_RE.test(q)) pass('search-xss'); // the payload is reflected unescaped in this very response
      const rows = results.map(p => `<tr><td>${esc(p.sku)}</td><td>${esc(p.name)}</td><td>${esc(p.category)}</td><td>${money(p.basePrice)}</td><td>${p.internal || /or/i.test(q) && results === products ? money(p.costPrice) : '—'}</td></tr>`).join('');
      return send(res, 200, layout(user, 'Search', `<div class="card"><h2>Search results</h2><p>Showing results for: ${q}</p><p class="small">Query: <code>${esc(naiveQuery)}</code></p>
        <table><tr><th>SKU</th><th>Name</th><th>Category</th><th>Price</th><th>Cost price</th></tr>${rows || '<tr><td colspan="5">No results</td></tr>'}</table></div>`));
    }
    const pm = path.match(/^\/products\/(\d+)$/);
    if (pm && req.method === 'GET') {
      const p = productById(pm[1]); if (!p) return send(res, 404, layout(user, '404', 'Not found'));
      const negRows = user && user.companyId ? negotiatedPrices.filter(n => n.productId === p.id && n.companyId === user.companyId).map(n => `<div class="ok">Your negotiated price: <b>${money(n.price)}</b></div>`).join('') : '';
      return send(res, 200, layout(user, p.name, `<div class="card"><h2>${esc(p.name)}</h2><p class="small">${esc(p.sku)} · ${esc(p.category)} · Stock ${p.stock}</p>
        <table><tr><th>Quantity</th><th>Unit price</th></tr>${p.tiers.map(t => `<tr><td>${t.minQty}+</td><td>${money(t.price)}</td></tr>`).join('')}</table>${negRows}
        <p><a class="btn" href="/pos/new?product=${p.id}">Order this product</a></p></div>`));
    }

    /* ---- Everything below needs login ---- */
    if (path.startsWith('/dashboard') || path.startsWith('/pos') || path.startsWith('/invoices') || path.startsWith('/company') || path.startsWith('/api') || path.startsWith('/admin')) {
      if (!needLogin(req, res)) return;
    } else if (!['/', '/login', '/logout', '/register', '/forgot', '/reset'].includes(path) && !pm && path !== '/products/search') {
      // unknown public path
      if (req.method === 'GET' && !user && path !== '/favicon.ico') { /* fall through to 404 below */ }
    }

    if (path === '/dashboard' && req.method === 'GET') {
      const comp = user.companyId ? companyById(user.companyId) : null;
      const myPos = user.role === 'admin' ? pos : pos.filter(p => p.companyId === user.companyId);
      return send(res, 200, layout(user, 'Dashboard', `<div class="card"><h2>Dashboard</h2>
        ${comp ? `<p>Company: <b>${esc(comp.name)}</b> (${esc(comp.tier)})<br>Credit limit: <b>${money(comp.creditLimit)}</b> · Used: ${money(comp.creditUsed)} · Available: <b>${money(comp.creditLimit - comp.creditUsed)}</b></p>` : '<p>Platform administration account.</p>'}
        <p>Purchase orders: ${myPos.length} · Pending approval: ${myPos.filter(p => p.status === 'pending').length}</p>
        <p><a class="btn" href="/pos/new">Create purchase order</a> <a class="btn sec" href="/api/negotiated-prices">Negotiated prices (API)</a></p></div>`));
    }

    /* ---- Negotiated prices API (Vuln 6: returns ALL companies) ---- */
    if (path === '/api/negotiated-prices' && req.method === 'GET') {
      bumpAttempt('Platform & API');
      const data = negotiatedPrices.map(n => ({ company: (companyById(n.companyId) || {}).name, companyId: n.companyId, product: (productById(n.productId) || {}).name, productId: n.productId, negotiatedPrice: n.price }));
      if (user.companyId && data.some(d => d.companyId !== user.companyId)) pass('api-leak'); // other tenants' terms left the server
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(data, null, 2));
    }

    /* ---- Purchase orders ---- */
    if (path === '/pos' && req.method === 'GET') {
      const list = user.role === 'admin' ? pos : pos.filter(p => p.companyId === user.companyId);
      const rows = list.map(p => `<tr><td><a href="/pos/${p.id}">PO-${p.id}</a></td><td>${esc((companyById(p.companyId) || {}).name || '')}</td><td>${esc(p.status)}</td><td>${money(poTotal(p))}</td></tr>`).join('');
      return send(res, 200, layout(user, 'Purchase Orders', `<div class="card"><h2>Purchase Orders</h2><table><tr><th>PO</th><th>Company</th><th>Status</th><th>Total</th></tr>${rows}</table></div>`));
    }
    if (path === '/pos/new' && req.method === 'GET') {
      const comp = user.companyId ? companyById(user.companyId) : null;
      const opts = products.filter(p => !p.internal).map(p => `<option value="${p.id}">${esc(p.name)} — from ${money(p.tiers[3].price)}</option>`).join('');
      return send(res, 200, layout(user, 'New PO', `<div class="card"><h2>New Purchase Order</h2>
        ${comp ? `<div class="warn" id="creditWarn">Available credit: ${money(comp.creditLimit - comp.creditUsed)}. The order form checks your credit in the browser before you continue.</div>` : ''}
        <form method="POST" action="/pos">
        <label>Product<select name="productId">${opts}</select></label>
        <label>Quantity<input type="number" name="qty" value="10" min="1"></label>
        <label>Claimed bulk tier (min qty)<input type="number" name="claimedTier" value="1"></label>
        <label>Unit price (optional override)<input name="unitPrice" placeholder="Leave blank for tier price"></label>
        <label>PO notes<textarea name="notes" rows="3" placeholder="Notes for your approver"></textarea></label>
        <button>Create PO (draft)</button></form></div>`));
    }
    if (path === '/pos' && req.method === 'POST') {
      bumpAttempt('Purchase Orders');
      const p = productById(body.productId); if (!p) return send(res, 400, layout(user, 'Error', 'Unknown product'));
      const qty = Math.max(1, parseInt(body.qty, 10) || 1);
      // Vuln 3: bulk tier taken from the CLIENT's claimedTier instead of the real quantity.
      const claimedTier = parseInt(body.claimedTier, 10) || qty;
      let unitPrice = priceFor(p, claimedTier, user.companyId);
      const honestPrice = priceFor(p, qty, user.companyId); // what the server should have charged
      if (!body.unitPrice && unitPrice < honestPrice) pass('po-tier'); // a claimed tier beat the real quantity
      // Vuln 11 (create path): a client-supplied unitPrice overrides everything.
      if (body.unitPrice) { const up = parseFloat(body.unitPrice); if (!isNaN(up) && up !== honestPrice) pass('po-price'); unitPrice = up || unitPrice; }
      if (qty > p.stock) pass('po-qty'); // Vuln (po-qty): quantity never validated against stock
      if (body.notes && XSS_RE.test(body.notes)) pass('po-xss'); // Vuln 8: payload stored, rendered raw on the PO page
      const po = { id: nextPoId++, companyId: user.companyId, buyerId: user.id, status: 'draft', notes: body.notes || '', rebateCode: null, rebatePct: 0, rebateCodes: [], createdAt: '2026-10-23',
        lines: [ { productId: p.id, qty, unitPrice } ] };
      pos.push(po);
      return redirect(res, `/pos/${po.id}`);
    }
    const pom = path.match(/^\/pos\/(\d+)$/);
    if (pom && req.method === 'GET') {
      bumpAttempt('Purchase Orders');
      const po = pos.find(p => p.id === Number(pom[1])); // Vuln 2: no company check — any logged-in user can open any PO
      if (!po) return send(res, 404, layout(user, '404', 'PO not found'));
      if (user.role !== 'admin' && po.companyId !== user.companyId) pass('po-idor'); // another tenant's PO was just served
      const lines = po.lines.map((l, i) => { const pr = productById(l.productId); return `<tr><td>${esc(pr ? pr.name : '?')}</td><td>${l.qty}</td><td>${money(l.unitPrice)}</td><td>${money(l.qty * l.unitPrice)}</td></tr>`; }).join('');
      return send(res, 200, layout(user, `PO-${po.id}`, `<div class="card"><h2>Purchase Order PO-${po.id}</h2>
        <p>Company: <b>${esc((companyById(po.companyId) || {}).name || '')}</b> · Buyer: ${esc((userById(po.buyerId) || {}).name || '')} · Status: <b>${esc(po.status)}</b>${po.approvedBy ? ' · Approved by user #' + po.approvedBy : ''}</p>
        <table><tr><th>Product</th><th>Qty</th><th>Unit price</th><th>Line total</th></tr>${lines}</table>
        ${po.rebatePct ? `<p>Rebate applied: ${po.rebatePct}% (${esc(po.rebateCode || '')})</p>` : ''}
        <p><b>Total: ${money(poTotal(po))}</b></p>
        <h3>Notes</h3><div class="card">${po.notes || '<span class="small">No notes.</span>'}</div>
        <form method="POST" action="/pos/${po.id}/submit" style="display:inline"><button>Submit for approval</button></form>
        <form method="POST" action="/pos/${po.id}/approve" style="display:inline"><button class="btn sec">Approve PO</button></form>
        <p class="small">Approver quick link (emailed to approvers): <a href="/pos/${po.id}/approve-link">/pos/${po.id}/approve-link</a></p>
        <h3>Amend a line price</h3><form method="POST" action="/pos/${po.id}/lines"><label>Line index<input name="lineIndex" value="0"></label><label>New unit price<input name="unitPrice"></label><button>Update line</button></form>
        <h3>Apply rebate code</h3><form method="POST" action="/pos/${po.id}/rebate"><label>Code<input name="code" placeholder="WHOLESALE10"></label><button>Apply rebate</button></form>
        </div>`));
      // NOTE: po.notes rendered UNESCAPED above — Vuln 8 (stored XSS to approver/admin viewers).
    }
    const act = path.match(/^\/pos\/(\d+)\/(submit|approve|approve-link|lines|rebate)$/);
    if (act) {
      bumpAttempt('Purchase Orders');
      const po = pos.find(p => p.id === Number(act[1]));
      if (!po) return send(res, 404, layout(user, '404', 'PO not found'));
      const action = act[2];
      if (action === 'submit' && req.method === 'POST') {
        // Vuln 4: credit limit is only "checked" in the browser form — the server never enforces it here.
        const comp = companyById(po.companyId);
        if (comp && poTotal(po) > comp.creditLimit - comp.creditUsed) pass('po-credit'); // accepted beyond the company's credit
        po.status = 'pending';
        return redirect(res, `/pos/${po.id}`);
      }
      if (action === 'approve' && req.method === 'POST') {
        // Vuln 1: ANY logged-in user can approve — including the PO's own creator. No role / separation-of-duties check.
        if (po.status !== 'approved') { approvePo(po, user); if (po.buyerId === user.id) pass('po-self-approve'); }
        return redirect(res, `/pos/${po.id}`);
      }
      if (action === 'approve-link' && req.method === 'GET') {
        // Vuln 9: state change on GET with no CSRF token — an emailed link (or an <img> tag) approves the PO.
        if (po.status !== 'approved') { approvePo(po, user); pass('po-csrf'); if (po.buyerId === user.id) pass('po-self-approve'); }
        return redirect(res, `/pos/${po.id}`);
      }
      if (action === 'lines' && req.method === 'POST') {
        // Vuln 11: line price tampering after creation.
        const idx = parseInt(body.lineIndex, 10) || 0;
        if (po.lines[idx] && body.unitPrice) { const np = parseFloat(body.unitPrice); if (!isNaN(np) && np !== po.lines[idx].unitPrice) pass('po-price'); po.lines[idx].unitPrice = np; }
        return redirect(res, `/pos/${po.id}`);
      }
      if (action === 'rebate' && req.method === 'POST') {
        // Vuln 13: rebate codes stack without any per-PO / per-company usage limit.
        const rc = rebateCodes.find(r => r.code === (body.code || '').toUpperCase());
        if (rc) { if ((po.rebatePct || 0) > 0) pass('po-rebate'); po.rebatePct = (po.rebatePct || 0) + rc.pct; po.rebateCode = rc.code; (po.rebateCodes || (po.rebateCodes = [])).push(rc.code); }
        return redirect(res, `/pos/${po.id}`);
      }
    }

    /* ---- Invoices (Vuln 7: IDOR) ---- */
    if (path === '/invoices' && req.method === 'GET') {
      const list = user.role === 'admin' ? invoices : invoices.filter(i => i.companyId === user.companyId);
      const rows = list.map(i => `<tr><td><a href="/invoices/${i.id}">INV-${i.id}</a></td><td>PO-${i.poId}</td><td>${esc((companyById(i.companyId) || {}).name || '')}</td><td>${money(i.total)}</td><td>${esc(i.status)}</td><td><a href="/invoices/${i.id}/download">Download</a></td></tr>`).join('');
      return send(res, 200, layout(user, 'Invoices', `<div class="card"><h2>Invoices</h2><table><tr><th>Invoice</th><th>PO</th><th>Company</th><th>Total</th><th>Status</th><th></th></tr>${rows}</table></div>`));
    }
    const invm = path.match(/^\/invoices\/(\d+)(\/download)?$/);
    if (invm && req.method === 'GET') {
      bumpAttempt('Invoices');
      const inv = invoices.find(i => i.id === Number(invm[1])); // Vuln 7: no company ownership check
      if (!inv) return send(res, 404, layout(user, '404', 'Invoice not found'));
      if (user.role !== 'admin' && inv.companyId !== user.companyId) pass('inv-idor'); // another tenant's invoice was just served
      const po = pos.find(p => p.id === inv.poId);
      const lines = po ? po.lines.map(l => { const pr = productById(l.productId); return `<tr><td>${esc(pr ? pr.name : '?')}</td><td>${l.qty}</td><td>${money(l.unitPrice)}</td><td>${money(l.qty * l.unitPrice)}</td></tr>`; }).join('') : '';
      const doc = `<div class="card"><h2>Invoice INV-${inv.id}</h2><p>Billed to: <b>${esc((companyById(inv.companyId) || {}).name || '')}</b><br>Issued ${esc(inv.issued)} · Due ${esc(inv.due)} · Status ${esc(inv.status)}</p>
        <table><tr><th>Product</th><th>Qty</th><th>Unit</th><th>Total</th></tr>${lines}</table><p><b>Amount due: ${money(inv.total)}</b></p></div>`;
      if (invm[2]) { res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Disposition': `attachment; filename="invoice-${inv.id}.html"` }); return res.end(layout(user, `INV-${inv.id}`, doc)); }
      return send(res, 200, layout(user, `INV-${inv.id}`, doc));
    }

    /* ---- Company settings (Vuln 5: mass assignment) ---- */
    if (path === '/company/settings' && req.method === 'GET') {
      const comp = companyById(user.companyId); if (!comp) return send(res, 200, layout(user, 'Settings', '<div class="card">No company attached to this account.</div>'));
      return send(res, 200, layout(user, 'Company Settings', `<div class="card"><h2>Company Settings — ${esc(comp.name)}</h2>
        <form method="POST" action="/company/settings">
        <label>Company name<input name="name" value="${esc(comp.name)}"></label>
        <label>Contact email<input name="contactEmail" value="${esc(comp.contactEmail)}"></label>
        <label>Address<input name="address" value="${esc(comp.address)}"></label>
        <label>Country<input name="country" value="${esc(comp.country)}"></label>
        <button>Save settings</button></form>
        <p class="small">Credit limit: ${money(comp.creditLimit)} (managed by the platform team).</p></div>`));
    }
    if (path === '/company/settings' && req.method === 'POST') {
      bumpAttempt('Registration & Company Settings');
      const comp = companyById(user.companyId); if (!comp) return send(res, 400, 'No company');
      const before = { creditLimit: comp.creditLimit, creditUsed: comp.creditUsed, tier: comp.tier };
      // Vuln 5: every submitted field is assigned — including creditLimit / creditUsed / tier if the client adds them.
      for (const [k, v] of Object.entries(body)) {
        if (k === 'id') continue;
        comp[k] = (k === 'creditLimit' || k === 'creditUsed') ? parseFloat(v) : v;
      }
      if (comp.creditLimit !== before.creditLimit || comp.creditUsed !== before.creditUsed || comp.tier !== before.tier) pass('settings-mass'); // a privileged field moved
      if (isCsrfStyle(req)) pass('settings-csrf'); // the change arrived with no same-site proof (Vuln: no CSRF token anywhere)
      return redirect(res, '/company/settings');
    }

    /* ---- Admin (privilege check trusts the role cookie — Vuln 10) ---- */
    if (path === '/admin' && req.method === 'GET') {
      bumpAttempt('Admin Panel');
      if (user.role !== 'admin') return send(res, 403, layout(user, 'Forbidden', '<div class="card warn">Admins only.</div>'));
      // Vuln 10: the gate just trusted the client-supplied role cookie.
      if (user.cookieRole === 'admin' && (userById(user.id) || {}).role !== 'admin') pass('admin-cookie');
      const urows = users.map(u => `<tr><td>${u.id}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td>${esc((companyById(u.companyId) || {}).name || '—')}</td></tr>`).join('');
      const crows = companies.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.tier)}</td><td>${money(c.creditLimit)}</td><td>${money(c.creditUsed)}</td></tr>`).join('');
      return send(res, 200, layout(user, 'Admin', `<div class="card"><h2>Platform Admin</h2><h3>Companies</h3><table><tr><th>Name</th><th>Tier</th><th>Credit limit</th><th>Used</th></tr>${crows}</table>
        <h3>Users</h3><table><tr><th>ID</th><th>Email</th><th>Role</th><th>Company</th></tr>${urows}</table>
        <p>Total POs: ${pos.length} · Total invoices: ${invoices.length} · Platform revenue (open invoices): ${money(invoices.reduce((s, i) => s + i.total, 0))}</p></div>`));
    }

    return send(res, 404, layout(user, '404', '<div class="card">Not found.</div>'));
  } catch (e) {
    // Stay stable on bad input.
    try { send(res, 500, '<h1>Server error</h1><p>The lab is still running — try again.</p>'); } catch (_) {}
  }
});

server.listen(PORT, HOST, () => console.log(`HexaWholesale lab listening on http://${HOST}:${PORT} (intentionally vulnerable — local only)`));
