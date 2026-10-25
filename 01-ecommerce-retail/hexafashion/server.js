#!/usr/bin/env node
/*
 * HexaFashion — INTENTIONALLY VULNERABLE fashion e-commerce practice lab.
 * LAB 2 of the HexaCyberLab lab series.
 *
 * WARNING: This application is deliberately insecure. It exists ONLY for
 * local, authorised security training. Synthetic data only. Never deploy
 * it on a public network. See README.md and VULNERABILITIES.md.
 *
 * Zero-dependency: Node.js built-ins only (http, fs, path, crypto).
 * Business data lives in memory and is seeded at startup. LAB PROGRESS
 * (tests passed, attempts, unlock state) persists in progress.json so a
 * tester can leave and resume where they stopped.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3010;
const HOST = process.env.HOST || '127.0.0.1'; // local-only by default

const LAB_NUMBER = 2;
const LAB_NAME = 'HexaFashion';
const PREV_LAB_NAME = 'Lab 1 (HexaShop)';

/* A few encoded fragments (see the key assembler near the lab-system
 * section). Nothing here is a usable credential on its own. */
const _fragA = ['TWFmZXM=', 'b2YtdGhl'];
const _fragB = ['c2hvcHM=', 'aW4tdGhl'];

/* ------------------------------------------------------------------ */
/* Seed data (all synthetic)                                           */
/* ------------------------------------------------------------------ */

function seed() {
  const sizes = (s, m, l, xl) => ({
    S: { stock: s }, M: { stock: m }, L: { stock: l }, XL: { stock: xl },
  });
  return {
    users: [
      { id: 1, email: 'admin@hexafashion.local', password: 'Admin@123', name: 'Store Admin',
        role: 'admin', isAdmin: true, loyaltyTier: 'STAFF', address: 'HexaFashion HQ, Dhaka', phone: '+8801000000001', wishlist: [], avatar: '' },
      { id: 2, email: 'aisha@hexafashion.local', password: 'User@123', name: 'Aisha Rahman',
        role: 'customer', isAdmin: false, loyaltyTier: 'SILVER', address: 'House 12, Road 5, Dhanmondi, Dhaka', phone: '+8801000000002', wishlist: [3], avatar: '' },
      { id: 3, email: 'karim@hexafashion.local', password: 'User@123', name: 'Karim Hossain',
        role: 'customer', isAdmin: false, loyaltyTier: 'BRONZE', address: 'Flat 7B, Gulshan Avenue, Dhaka', phone: '+8801000000003', wishlist: [], avatar: '' },
    ],
    products: [
      { id: 1,  name: 'Classic Cotton T-Shirt',   price: 24.99,  xlSurcharge: 2,  category: 'Basics',    sizes: sizes(40, 55, 38, 20), hidden: false, desc: 'Soft 100% cotton crew-neck tee.' },
      { id: 2,  name: 'Slim-Fit Denim Jacket',    price: 79.99,  xlSurcharge: 5,  category: 'Jackets',   sizes: sizes(12, 18, 15, 8),  hidden: false, desc: 'Stretch denim trucker jacket, indigo wash.' },
      { id: 3,  name: 'Floral Summer Dress',      price: 59.99,  xlSurcharge: 4,  category: 'Dresses',   sizes: sizes(20, 25, 18, 10), hidden: false, desc: 'Lightweight floral midi dress.' },
      { id: 4,  name: 'Wool Blend Overcoat',      price: 149.99, xlSurcharge: 8,  category: 'Coats',     sizes: sizes(6, 9, 7, 4),     hidden: false, desc: 'Warm wool-blend tailored overcoat.' },
      { id: 5,  name: 'Graphic Print Hoodie',     price: 49.99,  xlSurcharge: 3,  category: 'Hoodies',   sizes: sizes(30, 42, 35, 16), hidden: false, desc: 'Brushed-fleece hoodie with chest graphic.' },
      { id: 6,  name: 'Linen Casual Shirt',       price: 39.99,  xlSurcharge: 3,  category: 'Shirts',    sizes: sizes(22, 28, 24, 12), hidden: false, desc: 'Breathable linen button-up shirt.' },
      { id: 7,  name: 'High-Waist Skinny Jeans',  price: 54.99,  xlSurcharge: 4,  category: 'Denim',     sizes: sizes(18, 26, 20, 9),  hidden: false, desc: 'High-rise stretch skinny jeans.' },
      { id: 8,  name: 'Leather Biker Jacket',     price: 199.99, xlSurcharge: 10, category: 'Jackets',   sizes: sizes(5, 7, 6, 3),     hidden: false, desc: 'Genuine leather biker jacket, quilted lining.' },
      { id: 9,  name: 'Chunky Knit Sweater',      price: 44.99,  xlSurcharge: 3,  category: 'Knitwear',  sizes: sizes(16, 21, 17, 8),  hidden: false, desc: 'Chunky-knit crew sweater.' },
      { id: 10, name: 'Pleated Midi Skirt',       price: 42.99,  xlSurcharge: 3,  category: 'Skirts',    sizes: sizes(14, 19, 15, 7),  hidden: false, desc: 'Accordion-pleat midi skirt.' },
      { id: 11, name: 'Court Running Sneakers',   price: 89.99,  xlSurcharge: 5,  category: 'Shoes',     sizes: sizes(11, 14, 12, 6),  hidden: false, desc: 'Cushioned everyday running sneakers.' },
      { id: 12, name: 'Silk Evening Scarf',       price: 29.99,  xlSurcharge: 0,  category: 'Accessories', sizes: sizes(50, 50, 50, 50), hidden: false, desc: 'Pure silk scarf, hand-rolled edges.' },
      // Draft / unreleased products — must never appear in the public catalogue.
      { id: 13, name: 'Prototype Smart Jacket (DRAFT)', price: 299.99, xlSurcharge: 12, category: 'Internal', sizes: sizes(2, 2, 2, 2), hidden: true, costPrice: 120.00, desc: 'UNRELEASED. Internal wholesale cost: $120.00.' },
      { id: 14, name: 'Unreleased Designer Gown (DRAFT)', price: 499.99, xlSurcharge: 15, category: 'Internal', sizes: sizes(1, 1, 1, 1), hidden: true, costPrice: 210.00, desc: 'UNRELEASED. Internal wholesale cost: $210.00.' },
    ],
    reviews: [
      { id: 1, productId: 1, userId: 2, author: 'Aisha Rahman', rating: 5, text: 'Great fit, fabric feels premium.' },
      { id: 2, productId: 5, userId: 3, author: 'Karim Hossain', rating: 4, text: 'Warm and comfortable. Runs slightly large.' },
    ],
    orders: [
      { id: 1001, userId: 2, items: [
          { productId: 1, name: 'Classic Cotton T-Shirt', size: 'M', qty: 2, priceCharged: 24.99, surchargeCharged: 0 },
          { productId: 12, name: 'Silk Evening Scarf', size: 'M', qty: 1, priceCharged: 29.99, surchargeCharged: 0 },
        ], total: 79.97, coupons: [], status: 'Delivered', address: 'House 12, Road 5, Dhanmondi, Dhaka', date: '2026-10-18' },
      { id: 1002, userId: 3, items: [
          { productId: 5, name: 'Graphic Print Hoodie', size: 'L', qty: 1, priceCharged: 49.99, surchargeCharged: 0 },
        ], total: 49.99, coupons: [], status: 'Delivered', address: 'Flat 7B, Gulshan Avenue, Dhaka', date: '2026-10-19' },
    ],
    returns: [
      { id: 501, orderId: 1002, userId: 3, reason: 'Size too large, want to exchange', refundAmount: 49.99, status: 'Pending', date: '2026-10-21' },
    ],
    coupons: { 'WELCOME10': 10, 'FASHION20': 20, 'VIP50': 50 },
    couponUse: {},      // userId -> [codes already redeemed] (detection ledger only — the flaw below ignores it)
    giftCards: (() => {
      const cards = {};
      for (let i = 0; i <= 9; i++) cards['HF-100' + i] = { balance: 25 + i * 10, used: false };
      return cards;
    })(),
    carts: {},          // userId -> [{productId, size, qty}]
    uploads: {},        // filename -> {data: Buffer, type: string}
    nextUserId: 4,
    nextOrderId: 1003,
    nextReturnId: 502,
    nextReviewId: 3,
  };
}

let db = seed();

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function money(n) { return '$' + Number(n || 0).toFixed(2); }
function findUser(id) { return db.users.find(u => u.id === Number(id)); }
function findProduct(id) { return db.products.find(p => p.id === Number(id)); }

/* Payload shape used by the XSS detection hooks. */
const XSS_PAT = /<\s*script|<\s*svg|<\s*iframe|<\s*img[^>]*\son\w+\s*=|\son\w+\s*=\s*["']?\s*(alert|prompt|confirm)|javascript\s*:/i;

/* Short-window attack-pattern trackers (in-memory, per lab run). */
const _failLogins = new Map();   // email -> failed login count
const _enumProbes = new Map();   // ip -> {existing:bool, missing:bool}
const _gcProbes = new Map();     // ip -> {codes:Set, t0:timestamp}
function noteEnumProbe(req, exists) {
  const ip = (req.socket && req.socket.remoteAddress) || 'local';
  const rec = _enumProbes.get(ip) || { existing: false, missing: false };
  if (exists) rec.existing = true; else rec.missing = true;
  _enumProbes.set(ip, rec);
  if (rec.existing && rec.missing) pass('user-enumeration');
}

function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  raw.split(';').forEach(part => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

/*
 * VULN (role tampering): the session is a client-side cookie holding
 * base64url(JSON{uid, role, email, mk}) and the server TRUSTS the role
 * inside it. Anyone can decode, edit role -> "admin", re-encode, and
 * become admin. (mk is a benign per-login marker echoed into the
 * profile form; the server never verifies it on POST — see CSRF.)
 */
function getSession(req) {
  const c = parseCookies(req);
  if (!c.hf_session) return null;
  try {
    const obj = JSON.parse(Buffer.from(c.hf_session, 'base64url').toString('utf8'));
    if (!obj || !obj.uid) return null;
    return obj;
  } catch (e) { return null; }
}
function sessionCookie(user) {
  const payload = Buffer.from(JSON.stringify({ uid: user.id, role: user.role, email: user.email, mk: crypto.randomBytes(8).toString('hex') }), 'utf8').toString('base64url');
  return 'hf_session=' + payload + '; Path=/; HttpOnly';
}
function currentUser(req) {
  const s = getSession(req);
  if (!s) return null;
  return findUser(s.uid) || null;
}
function isAdmin(req) {
  const s = getSession(req);
  if (!s) return false;
  if (s.role === 'admin') return true;               // trusts the cookie (role tampering)
  const u = findUser(s.uid);
  return !!(u && u.isAdmin === true);                 // mass-assignment path
}
function isRealAdmin(req) {
  const u = currentUser(req);
  return !!(u && u.role === 'admin');
}
/* Detection: a client-forged session claims admin while the account is not. */
function noteCookieTamper(req) {
  const s = getSession(req);
  if (!s) return;
  const u = findUser(s.uid);
  if (s.role === 'admin' && u && u.role !== 'admin') pass('cookie-role-tamper');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', ch => {
      size += ch.length;
      if (size > 5 * 1024 * 1024) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(ch);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
function parseUrlEncoded(buf) {
  const out = {};
  const str = buf.toString('utf8');
  if (!str) return out;
  for (const pair of str.split('&')) {
    if (!pair) continue;
    const i = pair.indexOf('=');
    const k = decodeURIComponent((i < 0 ? pair : pair.slice(0, i)).replace(/\+/g, ' '));
    const v = decodeURIComponent((i < 0 ? '' : pair.slice(i + 1)).replace(/\+/g, ' '));
    if (Object.prototype.hasOwnProperty.call(out, k)) {
      if (Array.isArray(out[k])) out[k].push(v); else out[k] = [out[k], v];
    } else out[k] = v;
  }
  return out;
}
function asArray(v) { if (v === undefined) return []; return Array.isArray(v) ? v : [v]; }

/* Minimal multipart parser for the avatar upload (no validation by design). */
function parseMultipart(req, buf) {
  const ct = req.headers['content-type'] || '';
  const m = ct.match(/boundary=(.+)$/);
  if (!m) return null;
  const boundary = Buffer.from('--' + m[1].trim());
  const parts = [];
  let start = 0;
  while (true) {
    const idx = buf.indexOf(boundary, start);
    if (idx < 0) break;
    const next = buf.indexOf(boundary, idx + boundary.length);
    if (next < 0) break;
    let part = buf.slice(idx + boundary.length, next);
    if (part.slice(0, 2).toString() === '\r\n') part = part.slice(2);
    if (part.slice(-2).toString() === '\r\n') part = part.slice(0, part.length - 2);
    const headEnd = part.indexOf('\r\n\r\n');
    if (headEnd >= 0) {
      const head = part.slice(0, headEnd).toString('utf8');
      const data = part.slice(headEnd + 4);
      const nameM = head.match(/name="([^"]+)"/);
      const fileM = head.match(/filename="([^"]*)"/);
      parts.push({ name: nameM ? nameM[1] : '', filename: fileM ? fileM[1] : '', data });
    }
    start = next;
  }
  return parts;
}

/* ------------------------------------------------------------------ */
/* LAB SYSTEM — TESTS registry                                         */
/* Every intentional vulnerability is a scored test. Tests complete    */
/* only when the server observes the exploit actually succeed.         */
/* ------------------------------------------------------------------ */

const F_AUTH = 'Login & Authentication';
const F_PROF = 'Registration & Profile';
const F_CAT  = 'Catalogue, Search & Reviews';
const F_CART = 'Cart & Checkout';
const F_ORD  = 'Orders & Invoices';
const F_RET  = 'Returns & Refunds';
const F_GIFT = 'Gift Cards';
const F_FILE = 'File Upload & Download';
const F_ADM  = 'Admin Panel';
const F_API  = 'Platform & API';

const TESTS = [
  /* ----- Login & Authentication ----- */
  { id: 'sqli-login', feature: F_AUTH, name: 'SQL Injection Login Bypass', owasp: 'A03 Injection (CWE-89)', difficulty: 'Intermediate',
    hints: ['The login was rebuilt on a legacy query path that still builds its query as a string.', "Try the classic: closing the quote and adding a condition that is always true, like ' OR '1'='1.", "Use the email field: admin@hexafashion.local' OR '1'='1 — the password is never really checked when the injected condition is true."],
    lesson: 'When user input becomes part of a query string, an attacker can change the query\u2019s logic instead of just supplying data — here it turns "check this password" into "log in unconditionally".',
    impact: 'On a real store this means anyone can sign in as the admin (or any customer) with no password at all — full account takeover, order data, and a straight path to defrauding customers.',
    report: { title: 'SQL Injection in Login Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries everywhere and never build SQL with string concatenation of user input.' } },
  { id: 'brute-force', feature: F_AUTH, name: 'No Brute-Force Protection on Login', owasp: 'A07 Authentication Failures (CWE-307)', difficulty: 'Beginner',
    hints: ['Nothing slows you down on the login form — no lockout, no delay, no CAPTCHA.', 'Script 10 or more wrong-password attempts against one account, e.g. with a curl loop.', 'Watch them all get processed one after another. The flaw is proven by the attempts being accepted, not by guessing right.'],
    lesson: 'An unthrottled login form lets an attacker try thousands of passwords per hour. Rate limits, lockouts and delays are what make password guessing impractical.',
    impact: 'Weak or reused customer passwords get cracked in bulk, leading to account takeovers, fraudulent orders charged to saved cards, and a support nightmare for the client.',
    report: { title: 'Missing Rate Limiting / Lockout on Login Endpoint', severity: 'High', remediation: 'Add per-account and per-IP rate limiting, progressive delays and lockout/alerting after repeated failures.' } },
  { id: 'user-enumeration', feature: F_AUTH, name: 'Account Enumeration via Login & Reset Responses', owasp: 'A07 Authentication Failures (CWE-204)', difficulty: 'Beginner',
    hints: ['Compare the failure message for a real email with the message for an email that does not exist.', 'Try the same comparison on the Forgot password form.', 'When the two answers differ, the site itself is telling you which emails have accounts.'],
    lesson: 'Different error messages for "no such account" and "wrong password" hand attackers a free list of valid accounts to target with phishing and password attacks.',
    impact: 'An attacker harvests the client\u2019s real customer emails, then aims credential-stuffing and phishing at exactly the people who shop there — a privacy leak and a fraud enabler.',
    report: { title: 'Account Enumeration Through Differential Authentication Responses', severity: 'Medium', remediation: 'Return one identical generic message ("invalid credentials" / "if the account exists…") for every login and reset outcome.' } },
  { id: 'predictable-reset-token', feature: F_AUTH, name: 'Predictable Password-Reset Token', owasp: 'A07 Authentication Failures (CWE-337)', difficulty: 'Intermediate',
    hints: ['Trigger a reset for an account, then think about what the token could be built from.', 'The token is derived from things you already know about the victim — their email and a small number.', 'base64(email) + "." + userId. You can compute the admin\u2019s token offline and never touch their inbox.'],
    lesson: 'A reset token is a temporary password. If it is predictable, the "forgot password" feature becomes a universal account-takeover key.',
    impact: 'Anyone who knows a customer\u2019s (or the admin\u2019s) email can reset their password and own the account — orders, addresses and stored payment behaviour all exposed.',
    report: { title: 'Password Reset Token Is Deterministic and Guessable', severity: 'Critical', remediation: 'Generate reset tokens with a CSPRNG, store only a hash, expire within 30 minutes, single-use.' } },
  { id: 'cookie-role-tamper', feature: F_AUTH, name: 'Session Cookie Role Tampering', owasp: 'A01 Broken Access Control (CWE-565)', difficulty: 'Intermediate',
    hints: ['Look at what your session cookie actually contains — it is only encoded, not signed.', 'Decode it. One of the fields describes your role, and the server believes it.', 'Change "customer" to "admin", re-encode, and visit /admin.'],
    lesson: 'Data the client can edit, the client controls. Roles and privileges must live server-side or be cryptographically signed — never trusted from a cookie.',
    impact: 'Every registered customer can promote themselves to admin in seconds: changing prices, reading all orders and issuing refunds — total loss of store control.',
    report: { title: 'Unsigned Session Cookie Allows Privilege Escalation to Admin', severity: 'Critical', remediation: 'Keep sessions server-side behind an opaque random ID, or sign tokens (HMAC) and verify; read roles from the database per request.' } },

  /* ----- Registration & Profile ----- */
  { id: 'weak-password-policy', feature: F_PROF, name: 'Weak Password Policy at Registration', owasp: 'A07 Authentication Failures (CWE-521)', difficulty: 'Beginner',
    hints: ['The registration form asks for a password but never judges it.', 'Try creating an account with a 1-character password.', 'It is accepted. Accounts this weak fall to the first guessing attempt.'],
    lesson: 'If the site accepts any password, users will choose terrible ones — and the site, not the user, is responsible for the resulting takeovers.',
    impact: 'Customers register with passwords like "a" or "1234"; attackers walk straight in, place fraudulent orders and harvest personal details.',
    report: { title: 'No Minimum Password Strength Enforced at Registration', severity: 'Medium', remediation: 'Enforce a minimum length (12+) and check passwords against common/breached password lists.' } },
  { id: 'mass-assignment', feature: F_PROF, name: 'Mass Assignment on Profile Update', owasp: 'A01 Broken Access Control (CWE-915)', difficulty: 'Intermediate',
    hints: ['The profile form shows three fields. The endpoint saves far more than three.', 'Intercept the profile save and add fields the form never offered.', 'Try isAdmin=true, role=admin, loyaltyTier=PLATINUM — then reload your profile and visit /admin.'],
    lesson: 'Blindly copying request fields onto a record copies the attacker\u2019s fields too. Whitelists — not blacklists — define what a user may change about themselves.',
    impact: 'Customers make themselves admins or top-tier loyalty members through a routine settings form — privilege escalation and loyalty fraud with no exploit tooling at all.',
    report: { title: 'Mass Assignment Allows Privilege and Loyalty-Tier Escalation', severity: 'High', remediation: 'Whitelist assignable profile fields explicitly; change privileged fields only via authorised admin endpoints.' } },
  { id: 'csrf-profile', feature: F_PROF, name: 'CSRF on Profile Change', owasp: 'A01 Broken Access Control (CWE-352)', difficulty: 'Intermediate',
    hints: ['The profile form carries a marker field — but check whether the server actually verifies it.', 'A cross-site auto-submitting form cannot know your marker value, yet the request still works.', 'Send the profile POST without the hx_marker field (or from another origin) while logged in: the address changes anyway.'],
    lesson: 'Browsers attach cookies automatically, so any site can submit forms as the victim. Anti-CSRF tokens exist so the server can prove a request was intentional.',
    impact: 'A customer who merely views a malicious page gets their delivery address silently changed — the next order ships to the attacker — and chained with mass assignment it can even grant admin.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'High', remediation: 'Issue per-session CSRF tokens, verify them on every state change, and set SameSite=Lax/Strict on session cookies.' } },

  /* ----- Catalogue, Search & Reviews ----- */
  { id: 'sqli-search', feature: F_CAT, name: 'SQL-Injection-Style Search Bypass', owasp: 'A03 Injection (CWE-89)', difficulty: 'Intermediate',
    hints: ['The search builds its query like: ... LIKE \'%<input>%\' AND hidden = 0.', "Close the quote and make the condition always true: ' OR '1'='1 — suddenly the hidden filter is meaningless.", "Go further with a UNION SELECT and the result page will happily print rows from the users table."],
    lesson: 'Injection is data becoming code. The moment a search term can rewrite the query, the attacker decides what the database returns — including data that was never meant to be searchable.',
    impact: 'Unreleased products and their internal wholesale costs leak to competitors, and the customer table (emails, roles, tiers) is exposed — fuel for targeted attacks on every shopper.',
    report: { title: 'SQL Injection in Product Search Exposes Hidden Products and User Data', severity: 'Critical', remediation: 'Parameterise all queries; treat search input strictly as data and enforce visibility filters in code.' } },
  { id: 'reflected-xss', feature: F_CAT, name: 'Reflected XSS in Search Results', owasp: 'A03 Injection (CWE-79)', difficulty: 'Beginner',
    hints: ['Look closely at the search page: one place prints your search term back to you without encoding it.', 'Search for a script payload instead of a product.', 'Your input comes back as live HTML in the "Showing results for:" line — that is reflected XSS.'],
    lesson: 'Reflected XSS turns a trusted link into a weapon: the site itself delivers the attacker\u2019s script to the victim\u2019s browser under the site\u2019s own origin.',
    impact: 'Attackers send customers crafted search links whose scripts steal sessions or fake a checkout page on the real store domain — phishing that passes every "check the URL" test.',
    report: { title: 'Reflected Cross-Site Scripting via Search Query', severity: 'High', remediation: 'HTML-encode all reflected input on output and add a restrictive Content-Security-Policy.' } },
  { id: 'stored-xss-review', feature: F_CAT, name: 'Stored XSS in Product Reviews', owasp: 'A03 Injection (CWE-79)', difficulty: 'Intermediate',
    hints: ['Write a review. Then compare how your name is rendered next to it versus how your review text is rendered.', 'One of them is escaped. The other is stored and printed raw.', 'Post <script>alert(document.cookie)</script> as a review — it executes for every later visitor of that product.'],
    lesson: 'Stored XSS is the persistent cousin: one malicious input poisons a page for every future viewer, including admins. Output encoding at render time — not input filtering — is the reliable fix.',
    impact: 'A single fake review can steal the session of every shopper (and the admin) who views a best-selling product — account takeovers served from the client\u2019s own trusted pages.',
    report: { title: 'Stored Cross-Site Scripting in Product Reviews', severity: 'High', remediation: 'HTML-encode all user content on output; add CSP as defence in depth.' } },

  /* ----- Cart & Checkout ----- */
  { id: 'price-tampering', feature: F_CART, name: 'Price Tampering at Checkout', owasp: 'A04 Insecure Design (CWE-472)', difficulty: 'Beginner',
    hints: ['Go to checkout and inspect the form — the prices travel with the request as hidden fields.', 'The server builds your total from the numbers you send it. So send different numbers.', 'Change the Leather Biker Jacket\u2019s price field to 0.01 and place the order. You just bought it for a cent.'],
    lesson: 'Anything the client sends — prices, totals, discounts — is a claim, not a fact. Money values must be recomputed server-side from the catalogue on every order.',
    impact: 'The store ships real goods for whatever an attacker chooses to pay. This is direct, silent revenue loss on every single order until someone reconciles the books.',
    report: { title: 'Checkout Trusts Client-Supplied Prices (Price Tampering)', severity: 'Critical', remediation: 'Accept only product/size/quantity from the client; look up prices server-side when creating the order.' } },
  { id: 'surcharge-tampering', feature: F_CART, name: 'Size-Variant Surcharge Manipulation', owasp: 'A04 Insecure Design (CWE-472)', difficulty: 'Intermediate',
    hints: ['XL sizes carry an extra charge. That charge also travels as a hidden checkout field.', 'A field the server adds can be edited — and nothing says it must stay positive.', 'Set surcharge to -50 on an XL item: the "extra charge" becomes a discount below the base price.'],
    lesson: 'Variant pricing (sizes, options, add-ons) is part of the product record. Every component of a price must be derived server-side, per variant.',
    impact: 'Premium variants get sold below base price; margins quietly erode and sales reporting becomes fiction — the kind of leak that runs for months before finance notices.',
    report: { title: 'Client-Controlled Variant Surcharge Allows Negative Pricing', severity: 'High', remediation: 'Compute variant adjustments server-side from the product record keyed by the requested size.' } },
  { id: 'negative-quantity', feature: F_CART, name: 'Negative Quantity at Checkout', owasp: 'A04 Insecure Design (CWE-837)', difficulty: 'Intermediate',
    hints: ['The cart form clamps quantity to at least 1 — but checkout reads its own qty fields straight from the request.', 'Intercept the checkout POST and set one qty to a negative number.', 'The line total goes negative: the store starts paying you to take items.'],
    lesson: 'Client-side validation is decoration. Quantities, like prices, must be validated server-side (positive integers, sane bounds) before they touch money.',
    impact: 'Negative lines cancel out real purchases — attackers check out carts of goods for $0 or less, and inventory/refund figures stop meaning anything.',
    report: { title: 'Checkout Accepts Negative Quantities', severity: 'High', remediation: 'Validate quantity server-side as a positive integer within stock limits; reject anything else.' } },
  { id: 'oversell-stock', feature: F_CART, name: 'Overselling Beyond Stock (No Inventory Check)', owasp: 'A04 Insecure Design (CWE-770)', difficulty: 'Intermediate',
    hints: ['Each size shows a small stock number. Checkout never asks whether that number can cover your order.', 'Order far more of a size than exists — e.g. 999 of a size with 3 in stock.', 'The order is placed in full. The shop has sold stock it does not have.'],
    lesson: 'Inventory is a server-side invariant. If checkout never checks stock atomically, the business sells promises it cannot keep.',
    impact: 'Oversold limited items mean cancelled orders, refunds and angry customers — or a competitor deliberately draining a launch to sabotage it.',
    report: { title: 'Checkout Does Not Validate or Reserve Inventory', severity: 'Medium', remediation: 'Check and decrement stock server-side in the same transaction that creates the order; reject quantities above availability.' } },
  { id: 'coupon-stacking', feature: F_CART, name: 'Coupon Stacking & Unlimited Reuse', owasp: 'A04 Insecure Design (CWE-837)', difficulty: 'Beginner',
    hints: ['The coupon box accepts a comma-separated list. Try more than one code.', 'Nothing deduplicates the list. Nothing remembers you used a code before, either.', 'VIP50,VIP50,VIP50 takes 87.5% off — and the same codes work again on your next order, forever.'],
    lesson: 'Promotions are financial policy. Without a redemption ledger and stacking rules, a "one-time 50% treat" becomes a permanent near-total discount for anyone who hears about it.',
    impact: 'Promo abuse destroys margin at scale: one leaked code combination circulates online and every order is discounted 80%+ until the campaign is killed.',
    report: { title: 'Coupons Can Be Stacked and Reused Without Limit', severity: 'High', remediation: 'Enforce one redemption per customer per code (usage ledger), at most one coupon per order unless explicitly allowed, with expiry.' } },

  /* ----- Orders & Invoices ----- */
  { id: 'order-idor', feature: F_ORD, name: 'IDOR — Other Customers\u2019 Orders & Invoices', owasp: 'A01 Broken Access Control (CWE-639)', difficulty: 'Beginner',
    hints: ['Your order is #1001. Order IDs are just numbers in the URL.', 'Change the number. What stops you from reading #1002?', 'Nothing does — and the invoice page has the same hole, email and address included.'],
    lesson: 'Being logged in proves who you are, not what you may see. Every object access needs an ownership check against the session — sequential IDs make the missing check trivially exploitable.',
    impact: 'Every customer\u2019s name, address and full purchase history is readable by anyone with an account — a reportable data breach and a gift to stalkers and competitors.',
    report: { title: 'Insecure Direct Object References Expose All Orders and Invoices', severity: 'High', remediation: 'Authorise every object access (order.userId must equal the session user or an admin); prefer 404 for non-owned objects.' } },

  /* ----- Returns & Refunds ----- */
  { id: 'returns-idor', feature: F_RET, name: 'IDOR — View & Approve Other Customers\u2019 Returns', owasp: 'A01 Broken Access Control (CWE-862)', difficulty: 'Beginner',
    hints: ['Browse the Returns section while logged in as a normal customer. Whose requests are listed?', 'Open one that is not yours. The Approve button is right there.', 'A customer can approve refunds — including their own — because nobody checks who is clicking.'],
    lesson: 'Workflow actions that move money are privileged operations. Hiding them behind a link is not authorisation — the server must verify the role on every action.',
    impact: 'Refund fraud at scale: any customer authorises refunds for themselves or accomplices, bypassing the finance team entirely.',
    report: { title: 'Missing Authorisation on Returns Queue and Refund Approval', severity: 'Critical', remediation: 'Scope return listings to the owner (admins see all) and require a server-side admin role for approve/reject.' } },
  { id: 'refund-tampering', feature: F_RET, name: 'Refund-Amount Tampering', owasp: 'A04 Insecure Design (CWE-472)', difficulty: 'Intermediate',
    hints: ['The return form pre-fills the refund amount with the order total. Pre-filled is not enforced.', 'Edit the amount to 9999 on a $29.99 order and submit.', 'Approve it (see the returns flaw) — the system records a $9,999 refund on a $29.99 purchase.'],
    lesson: 'Refunds must be computed from the payment record, never accepted from the request. A refund is money leaving the business — it deserves the same rigour as a charge.',
    impact: 'Direct financial theft: refunds decoupled from money actually received, limited only by the attacker\u2019s imagination.',
    report: { title: 'Refund Amount Taken From Client Request', severity: 'Critical', remediation: 'Derive refunds server-side from the charged amounts of the returned items and cap them at the amount paid.' } },

  /* ----- Gift Cards ----- */
  { id: 'giftcard-enumeration', feature: F_GIFT, name: 'Gift-Card Code Enumeration (No Rate Limit)', owasp: 'A07 Authentication Failures (CWE-307)', difficulty: 'Beginner',
    hints: ['The balance checker answers anyone, instantly, with the exact balance.', 'The shop itself hints the codes live in the HF-100x range — codes are sequential.', 'Script the range: five or more balance lookups in a row and every card\u2019s value is yours to spend.'],
    lesson: 'A balance oracle plus sequential identifiers is a cash machine. Unguessable codes and throttling are both required — each removes half of the attack.',
    impact: 'All outstanding gift-card value can be discovered and drained in seconds — direct monetary theft plus a refund/support burden when real recipients find empty cards.',
    report: { title: 'Enumerable Gift-Card Codes With Unthrottled Balance Oracle', severity: 'High', remediation: 'Use long random codes, require login, disclose balances only to the owner, and rate-limit checks with lockout.' } },

  /* ----- File Upload & Download ----- */
  { id: 'avatar-upload', feature: F_FILE, name: 'Unrestricted Avatar Upload (Stored Active Content)', owasp: 'A08 / CWE-434 Unrestricted File Upload', difficulty: 'Advanced',
    hints: ['The profile-photo uploader never asks what kind of file you gave it.', 'Upload a file named avatar.html containing a script payload.', 'It is served back from /uploads/ as text/html — script running in the shop\u2019s own origin.'],
    lesson: 'An upload is hostile input with a filename. Type must be proven from content, dangerous types refused, and files served inertly — otherwise the store hosts the attacker\u2019s pages.',
    impact: 'Attackers host phishing pages and script under the client\u2019s trusted domain, stealing sessions of anyone who opens the link — and in stacks that execute uploads, this becomes full server compromise.',
    report: { title: 'Unrestricted File Upload Allows Stored HTML/SVG With Script', severity: 'Critical', remediation: 'Allow-list image types, verify/re-encode content, random filenames, serve uploads as attachments from a separate static context.' } },
  { id: 'path-traversal', feature: F_FILE, name: 'Path Traversal in File Download', owasp: 'A01 Broken Access Control (CWE-22)', difficulty: 'Intermediate',
    hints: ['The /download endpoint is meant to serve exactly one file: logo.png.', 'It joins your name parameter into a path without checking where that path ends up.', 'Try name=server.js — or walk up with ../ and read files that were never meant to be downloads.'],
    lesson: 'User-controlled file paths must be resolved and confined to an intended directory. "Join and serve" is an arbitrary-file-read waiting for its first ../.',
    impact: 'Source code, configuration and lab progress data leak; on a real stack this class exposes credentials and customer data files — often the first step to full compromise.',
    report: { title: 'Path Traversal Allows Arbitrary File Read', severity: 'High', remediation: 'Resolve the requested path and require it to stay inside the allowed directory; address downloads by ID, not filename.' } },

  /* ----- Admin Panel ----- */
  { id: 'stored-xss-admin', feature: F_ADM, name: 'Stored XSS Reaching the Admin Panel', owasp: 'A03 Injection (CWE-79)', difficulty: 'Advanced',
    hints: ['Admins have a Customers page. Customer display names are rendered there exactly as stored.', 'Set your profile (or registration) name to a script payload.', 'When an admin opens the Customers page, your name executes in their browser — session theft at the highest privilege level.'],
    lesson: 'Stored XSS aimed at back-office views is the dangerous kind: the victim is an admin, and one page view hands over the keys. Encode user data in admin views too — everywhere, without exception.',
    impact: 'One crafted customer name can hijack the store admin\u2019s session the moment they review customers — complete store takeover from a mere registration.',
    report: { title: 'Stored XSS in Customer Names Executed in the Admin Panel', severity: 'Critical', remediation: 'HTML-encode all user-supplied data in every view including admin tooling; deploy CSP.' } },

  /* ----- Platform & API ----- */
  { id: 'api-user-exposure', feature: F_API, name: 'Unauthenticated Customer Data Exposure API', owasp: 'A01 / A05 Sensitive Data Exposure (CWE-200)', difficulty: 'Beginner',
    hints: ['Not everything lives behind the login. Some endpoints answer with no session at all.', 'Probe the API namespace: /api/users.', 'The whole customer table — emails, roles, even plaintext passwords — is returned to anyone who asks.'],
    lesson: 'Debug and convenience endpoints ship to production and forget to require auth. Every endpoint needs an explicit access decision, and password material must never be serialised.',
    impact: 'The entire customer database, including passwords, is public. That is an instant, reportable breach and an account-takeover kit for every customer who reuses passwords.',
    report: { title: 'Unauthenticated API Exposes Full Customer Records Including Passwords', severity: 'Critical', remediation: 'Require authentication and authorisation on all API endpoints; never return password fields; remove debug/export surfaces.' } },
];

const TEST_BY_ID = {};
for (const t of TESTS) TEST_BY_ID[t.id] = t;
const FEATURES = [];
for (const t of TESTS) if (!FEATURES.includes(t.feature)) FEATURES.push(t.feature);

/* More encoded fragments (assembler below uses all of them). */
const _fragC = ['Z2l2ZW4=', 'dGhlLWtleQ=='];

/* ------------------------------------------------------------------ */
/* LAB SYSTEM — persistent progress                                    */
/* ------------------------------------------------------------------ */

const PROGRESS_PATH = path.join(__dirname, 'progress.json');
function defaultProgress() {
  return { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
}
function loadProgress() {
  try {
    const p = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
    return Object.assign(defaultProgress(), p || {});
  } catch (e) { return defaultProgress(); }
}
let progress = loadProgress();
function saveProgress() {
  try { fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2)); } catch (e) { /* read-only fs: progress lives for the session */ }
}
function pass(id) {
  if (!TEST_BY_ID[id] || progress.tests[id]) { if (TEST_BY_ID[id]) saveProgress(); return; }
  progress.tests[id] = true;
  if (TESTS.every(t => progress.tests[t.id])) {
    if (!progress.completedAt) progress.completedAt = new Date().toISOString();
    progress.keyRevealed = true;
  }
  saveProgress();
}
function attempt(feature) {
  progress.attempts[feature] = (progress.attempts[feature] || 0) + 1;
  saveProgress();
}
function doneCount() { return TESTS.filter(t => progress.tests[t.id]).length; }
function isComplete() { return doneCount() === TESTS.length; }
function progressSummary() {
  const done = doneCount();
  const features = {};
  for (const f of FEATURES) {
    const ts = TESTS.filter(t => t.feature === f);
    features[f] = { total: ts.length, done: ts.filter(t => progress.tests[t.id]).length, attempts: progress.attempts[f] || 0 };
  }
  return { lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done,
    pct: TESTS.length ? Math.floor(done / TESTS.length * 100) : 0,
    features, complete: done === TESTS.length, unlocked: progress.unlocked };
}

/* ------------------------------------------------------------------ */
/* LAB SYSTEM — key fragments & assembler                              */
/* The unlock/completion keys exist in this file ONLY as small         */
/* transformed fragments scattered across different sections. The      */
/* assembler runs at request time: the entry key inside /unlock, the   */
/* completion key only once the lab is 100% complete.                  */
/* ------------------------------------------------------------------ */


const _complShards1 = ['MEwtWEg=', 'RFQ5LTM='];
function _unshard(parts) {
  return parts.map(s => [...Buffer.from(s, 'base64').toString('utf8')].reverse().join('')).join('');
}
const ENTRY_KEY_SHA256 = '9a89a61d7aff1388fdd1440babd91fa42e10ca93f9e73937241d736b8d5fb066';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */
function completionKey() { return _unshard(_complShards1.concat(_complShards2)); }

/* ------------------------------------------------------------------ */
/* HTML layout (with lab identity, progress bar, assistant widget)     */
/* ------------------------------------------------------------------ */

function layout(req, title, body) {
  const u = currentUser(req);
  const sum = progressSummary();
  const nav = u
    ? `<span>Hi, ${esc(u.name)}</span>
       <a href="/orders">My Orders</a><a href="/returns">Returns</a>
       <a href="/wishlist">Wishlist</a><a href="/cart">Cart</a>
       <a href="/giftcard">Gift Cards</a><a href="/profile">Profile</a>
       ${isAdmin(req) ? '<a href="/admin">Admin</a>' : ''}
       <a href="/logout">Logout</a>`
    : `<a href="/login">Login</a><a href="/register">Register</a><a href="/giftcard">Gift Cards</a>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)} — HexaFashion</title>
<style>
*{box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;margin:0;background:#faf7f4;color:#222}
header{background:#1c1c28;color:#fff;padding:14px 24px;display:flex;flex-wrap:wrap;gap:14px;align-items:center}
header .logo{font-size:22px;font-weight:700;color:#e8b4b8;text-decoration:none}
header a{color:#ddd;text-decoration:none;font-size:14px}header a:hover{color:#fff}
.labtag{display:flex;align-items:center;gap:10px;margin-right:auto}
.labtag img{width:34px;height:34px;border-radius:6px}
.labtag .lt{line-height:1.15}.labtag .lt b{color:#fff;font-size:15px}.labtag .lt span{display:block;color:#b9b9c9;font-size:11px}
.pbar{background:#2c2c3e;border-radius:6px;height:10px;min-width:150px;flex:1;max-width:280px;overflow:hidden}
.pbar i{display:block;height:100%;background:linear-gradient(90deg,#7b5cff,#e84e8a)}
.pct{font-size:12px;color:#cfcfe0;white-space:nowrap}
main{max-width:1050px;margin:0 auto;padding:24px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:18px}
.card{background:#fff;border:1px solid #e6ddd5;border-radius:10px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,.05)}
.card h3{margin:6px 0}.price{font-size:19px;font-weight:700;color:#9c3848}
.btn{background:#9c3848;color:#fff;border:0;padding:9px 16px;border-radius:6px;cursor:pointer;font-size:14px;text-decoration:none;display:inline-block}
.btn.sec{background:#555}.btn.sm{padding:5px 10px;font-size:13px}
input,select,textarea{padding:8px;border:1px solid #ccc;border-radius:6px;font-size:14px;width:100%;margin:4px 0 12px}
table{width:100%;border-collapse:collapse;background:#fff}th,td{border:1px solid #e6ddd5;padding:8px 10px;text-align:left;font-size:14px}
.flash{background:#fdecea;border:1px solid #e5a49c;padding:10px 14px;border-radius:6px;margin-bottom:16px}
.ok{background:#e8f6ec;border-color:#9ccfae}.warn{background:#fff7e0;border:1px solid #d9b64a;padding:12px 14px;border-radius:6px}
label{font-size:13px;font-weight:600;color:#444}.muted{color:#777;font-size:13px}
.review{border-top:1px solid #eee;padding:10px 0}
.testrow{border:1px solid #e6ddd5;background:#fff;border-radius:8px;padding:12px 14px;margin:8px 0}
.hintbox{background:#f4f0ff;border:1px solid #d5c9f5;border-radius:6px;padding:8px 12px;margin:6px 0;font-size:14px}
.done{color:#1e7e3c;font-weight:700}.open{color:#9c3848;font-weight:700}
#hxchat{position:fixed;right:16px;bottom:16px;width:320px;max-width:92vw;z-index:50;font-size:14px}
#hxchat .hd{background:#1c1c28;color:#fff;padding:10px 14px;border-radius:10px 10px 0 0;cursor:pointer;display:flex;justify-content:space-between}
#hxchat .bd{display:none;background:#fff;border:1px solid #ddd;border-top:0;border-radius:0 0 10px 10px;padding:10px;box-shadow:0 6px 24px rgba(0,0,0,.18)}
#hxchat.open .bd{display:block}
#hxlog{height:220px;overflow-y:auto;margin-bottom:8px}
#hxlog .m{margin:6px 0;padding:7px 10px;border-radius:8px;background:#f2f0fa}
#hxlog .me{background:#ffeef3;text-align:right}
#hxchat form{display:flex;gap:6px}#hxchat input{margin:0;flex:1}
</style></head><body>
<header><div class="labtag"><img src="/logo.png" alt="HexaCyberLab"><div class="lt"><b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b><span>HexaCyberLab practice lab series</span></div></div>
<form action="/search" method="get" style="display:flex;gap:6px"><input name="q" placeholder="Search products..." style="margin:0;width:170px"><button class="btn sm">Search</button></form>
<a href="/tests">🎯 Tests</a><a href="/complete">🏁 Complete</a>
${nav}</header>
<div style="background:#23232f;color:#fff;padding:7px 24px;display:flex;gap:12px;align-items:center">
<span class="pct">LAB ${LAB_NUMBER} · ${sum.done}/${sum.total} tests · ${sum.pct}%</span><div class="pbar"><i style="width:${sum.pct}%"></i></div>
${sum.complete ? '<span class="pct">✅ Lab complete — see the completion page for your key &amp; certificate</span>' : `<span class="pct">${sum.total - sum.done} tests remaining</span>`}
</div>
<main>${body}</main>
<footer style="text-align:center;color:#999;font-size:12px;padding:22px">HexaFashion practice lab — intentionally vulnerable, local use only. Synthetic data. Built by Md. Jony Hassain, Founder of HexaCyberLab.</footer>
<div id="hxchat"><div class="hd" onclick="document.getElementById('hxchat').classList.toggle('open')"><span>💬 Lab Assistant</span><span>▾</span></div>
<div class="bd"><div id="hxlog"><div class="m">Hi! I am the ${LAB_NAME} lab assistant. Ask me about the features, the tests, your progress — or how to approach a test (help unlocks after 3 real tries on that feature).</div></div>
<form id="hxform"><input id="hxinput" placeholder="Ask the assistant..." autocomplete="off"><button class="btn sm">Send</button></form></div></div>
<script>
document.getElementById('hxform').addEventListener('submit', async function(e){ e.preventDefault();
  var inp = document.getElementById('hxinput'); var msg = inp.value.trim(); if(!msg) return; inp.value='';
  var log = document.getElementById('hxlog');
  log.innerHTML += '<div class="m me"></div>'; log.lastChild.textContent = msg;
  try { var r = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ message: msg }) });
    var j = await r.json(); log.innerHTML += '<div class="m"></div>'; log.lastChild.textContent = j.reply || '...'; }
  catch(err){ log.innerHTML += '<div class="m">Assistant unavailable right now.</div>'; }
  log.scrollTop = log.scrollHeight;
});
</script>
</body></html>`;
}
function send(res, code, html, headers) {
  res.writeHead(code, Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, headers || {}));
  res.end(html);
}
function redirect(res, loc, headers) {
  res.writeHead(302, Object.assign({ Location: loc }, headers || {}));
  res.end();
}
function needLogin(req, res) {
  if (!currentUser(req)) { redirect(res, '/login'); return true; }
  return false;
}

/* The lock gate — the only thing shown until the entry key is pasted. */
function gatePage(err) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ${LAB_NUMBER} — ${LAB_NAME} · Locked</title>
<style>body{font-family:'Segoe UI',Arial,sans-serif;background:#14141d;color:#eee;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center}
.box{background:#1e1e2a;border:1px solid #34344a;border-radius:14px;padding:36px;max-width:460px;width:92vw;text-align:center}
.box img{width:84px;height:84px;border-radius:12px}
input{padding:11px;border:1px solid #444;border-radius:6px;width:100%;margin:12px 0;background:#12121c;color:#fff;font-size:15px}
button{background:linear-gradient(90deg,#7b5cff,#e84e8a);color:#fff;border:0;padding:11px 22px;border-radius:6px;cursor:pointer;font-size:15px;width:100%}
.err{background:#4a1f28;border:1px solid #e5a49c;color:#ffd9d4;padding:9px;border-radius:6px;margin-bottom:10px}
.mut{color:#9a9ab0;font-size:13px}</style></head><body>
<div class="box"><img src="/logo.png" alt="HexaCyberLab">
<h1>🔒 LAB ${LAB_NUMBER} — ${LAB_NAME}</h1>
<p>This lab is locked. Paste the completion key from ${esc(PREV_LAB_NAME)} to start.</p>
${err ? `<div class="err">${esc(err)}</div>` : ''}
<form method="post" action="/unlock"><input name="key" placeholder="Paste the key from the previous lab" autocomplete="off" required><button>Unlock Lab ${LAB_NUMBER}</button></form>
<p class="mut">HexaCyberLab practice lab series — the labs run in order, each one opening the next.<br>Built by Md. Jony Hassain, Founder of HexaCyberLab.</p>
</div></body></html>`;
}

/* ------------------------------------------------------------------ */
/* LAB SYSTEM — the chatbot brain (rule-based, in-lab, no calls out)   */
/* ------------------------------------------------------------------ */

const FEATURE_KEYS = {
  [F_AUTH]: ['login', 'auth', 'password', 'reset', 'brute', 'session', 'cookie', 'enumerat', 'sign in'],
  [F_PROF]: ['profile', 'register', 'registration', 'sign up', 'mass', 'csrf', 'account settings'],
  [F_CAT]: ['search', 'catalogue', 'catalog', 'review', 'product'],
  [F_CART]: ['cart', 'checkout', 'coupon', 'price', 'quantity', 'stock', 'surcharge', 'size'],
  [F_ORD]: ['order', 'invoice'],
  [F_RET]: ['return', 'refund'],
  [F_GIFT]: ['gift'],
  [F_FILE]: ['upload', 'avatar', 'file', 'download', 'traversal', 'photo'],
  [F_ADM]: ['admin'],
  [F_API]: ['api', 'endpoint', 'platform'],
};
function matchFeature(msg) {
  for (const f of FEATURES) if (msg.includes(f.toLowerCase())) return f;
  for (const f of FEATURES) if ((FEATURE_KEYS[f] || []).some(k => msg.includes(k))) return f;
  return null;
}
function matchTest(msg) {
  let best = null, bestScore = 0;
  for (const t of TESTS) {
    const words = t.name.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 3);
    let score = 0;
    for (const w of words) if (msg.includes(w)) score++;
    if (t.id.split('-').some(w => w.length > 3 && msg.includes(w))) score += 2;
    if (score > bestScore) { bestScore = score; best = t; }
  }
  return bestScore >= 1 ? best : null;
}
function chatReply(raw) {
  const msg = String(raw || '').toLowerCase();
  const sum = progressSummary();
  if (/(who\s+(built|made|created|developed)|founder|built\s+by|created\s+by|jony|whose\s+lab|your\s+creator)/.test(msg)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (/\bkey\b/.test(msg) || /unlock\s+(code|lab)|next\s+lab/.test(msg)) {
    if (progress.keyRevealed && isComplete()) {
      return 'You completed LAB ' + LAB_NUMBER + ' at 100%, so the completion key was released to me. Your key for the next lab is: ' + completionKey() + ' — paste it on the next lab\u2019s start screen. It is also shown on the completion page.';
    }
    return 'I don\u2019t have the completion key yet — it is only released to me when this lab reaches 100% complete, and it is never hidden anywhere I can peek at before then. Finish all ' + sum.total + ' tests (you are at ' + sum.pct + '%) and the key will appear on the completion page.';
  }
  if (/(progress|status|score|percent|how\s+am\s+i\s+doing)/.test(msg)) {
    const next = TESTS.find(t => !progress.tests[t.id]);
    return 'Your progress: ' + sum.done + ' of ' + sum.total + ' tests complete (' + sum.pct + '%). ' +
      (next ? 'Next open test: "' + next.name + '" in ' + next.feature + '. Open the Tests page (🎯 Tests) to see everything with hints.' : 'The lab is complete! Visit the completion page for your summary, key and certificate.');
  }
  const feature = matchFeature(msg);
  if (/how\s+many|list|which\s+(tests|vulnerab|features)|what\s+(tests|vulnerab|features)/.test(msg)) {
    if (feature) {
      const ts = TESTS.filter(t => t.feature === feature);
      return feature + ' has ' + ts.length + ' tests: ' + ts.map(t => '"' + t.name + '"' + (progress.tests[t.id] ? ' ✓ done' : '')).join(', ') + '. Ask me "how do I do the ' + ts[0].name + '" for step-by-step help (after 3 tries on this feature).';
    }
    return 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + FEATURES.length + ' features and ' + sum.total + ' tests in total: ' +
      FEATURES.map(f => f + ' (' + sum.features[f].done + '/' + sum.features[f].total + ')').join(' · ') + '.';
  }
  if (/(how|help|guide|solve|walkthrough|steps|stuck|hint)/.test(msg)) {
    const t = matchTest(msg) || (feature ? TESTS.find(x => x.feature === feature && !progress.tests[x.id]) || TESTS.find(x => x.feature === feature) : null);
    if (!t) return 'Tell me which feature or test you are stuck on — for example "how do I do the price tampering test?" I can guide you once you have tried that feature at least 3 times yourself.';
    const tried = progress.attempts[t.feature] || 0;
    if (progress.tests[t.id]) return 'You already completed "' + t.name + '" ✓. Core idea: ' + t.lesson;
    if (tried >= 3) {
      return 'Step by step for "' + t.name + '" (' + t.feature + '):\n1) ' + t.hints[0] + '\n2) ' + t.hints[1] + '\n3) ' + t.hints[2] + '\nWhy it matters: ' + t.lesson + ' The test completes automatically when the server sees the exploit succeed — check the 🎯 Tests page.';
    }
    return 'That feature is locked for help. First try the ' + t.feature + ' tests yourself at least 3 times — I can see you have tried ' + tried + ' time(s) so far. After 3 real tries, ask me again and I\u2019ll guide you step by step.';
  }
  if (/(next|start|begin|where)/.test(msg)) {
    const next = TESTS.find(t => !progress.tests[t.id]);
    if (!next) return 'Everything is done — the lab is at 100%. Head to the completion page for your summary, the next lab\u2019s key, and your certificate.';
    return 'A good next step: "' + next.name + '" in ' + next.feature + ' (' + next.difficulty + '). Open the 🎯 Tests page for the full list — every test shows hints there.';
  }
  if (/^(hi|hello|hey|yo)\b/.test(msg)) {
    return 'Hello! This is LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ': ' + FEATURES.length + ' features, ' + sum.total + ' security tests, and you are at ' + sum.pct + '%. Ask me what the features are, how a test works (after 3 tries on its feature), or how you are doing.';
  }
  return 'I can help with: the feature/test map ("how many tests in checkout?"), your progress, and step-by-step guidance for a test once you have tried its feature at least 3 times. Hints for every test are also on the 🎯 Tests page.';
}

/* Further key fragments — the assembler in the lab-system section
 * joins these with the ones defined earlier. */

const _complShards2 = ['WkhWQ1Y=', 'OEtOVS0=', 'S1ZKTQ=='];

/* ------------------------------------------------------------------ */
/* VULN: naive "SQL-style" search. The app builds a query STRING from  */
/* raw user input and interprets it naively, so a tautology            */
/* (' OR '1'='1) dumps every row — including hidden draft products —   */
/* and a UNION-style input appends the users table to the results.     */
/* ------------------------------------------------------------------ */
function runNaiveSearch(q) {
  const raw = String(q || '');
  const builtQuery = `SELECT * FROM products WHERE name LIKE '%${raw}%' AND hidden = 0`; // never do this
  void builtQuery;
  if (/'\s*or\s*'1'\s*=\s*'1'/i.test(raw) || /'\s*or\s*1\s*=\s*1/i.test(raw) || /'\s*or\s*'[^']*'\s*=\s*'/i.test(raw)) {
    return { products: db.products.slice(), unionUsers: null }; // tautology: WHERE clause always true
  }
  if (/union\s+(all\s+)?select/i.test(raw)) {
    return { products: db.products.slice(), unionUsers: db.users.slice() }; // UNION dumps users
  }
  const needle = raw.toLowerCase();
  return { products: db.products.filter(p => !p.hidden && (p.name + ' ' + p.category).toLowerCase().includes(needle)), unionUsers: null };
}

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */

async function route(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  const method = req.method;
  let m;

  /* ---------- lab plumbing: logo, unlock, gate ---------- */
  if (method === 'GET' && p === '/logo.png') {
    try {
      const data = fs.readFileSync(path.join(__dirname, 'logo.png'));
      res.writeHead(200, { 'Content-Type': 'image/png' });
      return res.end(data);
    } catch (e) { return send(res, 404, 'logo not found'); }
  }
  if (method === 'POST' && p === '/unlock') {
    const raw = await readBody(req);
    let key = '';
    if ((req.headers['content-type'] || '').includes('application/json')) {
      try { key = String(JSON.parse(raw.toString('utf8')).key || ''); } catch (e) { key = ''; }
    } else key = String(parseUrlEncoded(raw).key || '');
    if (entryKeyMatches(key.trim())) {
      progress.unlocked = true;
      saveProgress();
      return redirect(res, '/');
    }
    return send(res, 403, gatePage('That key was not accepted. Check it and try again.'));
  }
  if (!progress.unlocked) {
    if (method === 'GET' && p === '/api/progress') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ lab: LAB_NAME, number: LAB_NUMBER, locked: true, unlocked: false }));
    }
    return send(res, 200, gatePage(null));
  }

  /* ---------- public catalogue ---------- */
  if (method === 'GET' && p === '/') {
    const cards = db.products.filter(x => !x.hidden).map(x => `
      <div class="card"><div class="muted">${esc(x.category)}</div>
      <h3><a href="/products/${x.id}">${esc(x.name)}</a></h3>
      <p>${esc(x.desc)}</p><div class="price">${money(x.price)}</div>
      <p class="muted">Sizes S / M / L / XL${x.xlSurcharge ? ` · XL +${money(x.xlSurcharge)}` : ''}</p>
      <a class="btn sm" href="/products/${x.id}">View</a></div>`).join('');
    return send(res, 200, layout(req, 'Home', `<h1>New Season Collection</h1><div class="grid">${cards}</div>`));
  }

  if (method === 'GET' && (m = p.match(/^\/products\/(\d+)$/))) {
    attempt(F_CAT);
    const prod = findProduct(m[1]);
    if (!prod || prod.hidden) return send(res, 404, layout(req, '404', '<h1>Product not found</h1>'));
    const sizeOpts = Object.keys(prod.sizes).map(s =>
      `<option value="${s}">${s} — ${prod.sizes[s].stock > 0 ? prod.sizes[s].stock + ' in stock' : 'out of stock'}${s === 'XL' && prod.xlSurcharge ? ` (+${money(prod.xlSurcharge)})` : ''}</option>`).join('');
    const reviews = db.reviews.filter(r => r.productId === prod.id).map(r =>
      /* VULN: review text rendered WITHOUT escaping -> stored XSS */
      `<div class="review"><strong>${esc(r.author)}</strong> · ${'★'.repeat(r.rating)}<br>${r.text}</div>`).join('');
    const u = currentUser(req);
    return send(res, 200, layout(req, prod.name, `
      <h1>${esc(prod.name)}</h1><p class="muted">${esc(prod.category)}</p>
      <p>${esc(prod.desc)}</p><div class="price">${money(prod.price)}</div>
      <form method="post" action="/cart/add" style="max-width:320px">
        <input type="hidden" name="productId" value="${prod.id}">
        <label>Size</label><select name="size">${sizeOpts}</select>
        <label>Quantity</label><input type="number" name="qty" value="1" min="1" max="99">
        <button class="btn">Add to Cart</button></form>
      <form method="post" action="/wishlist/add"><input type="hidden" name="productId" value="${prod.id}">
        <button class="btn sec sm">♥ Add to Wishlist</button></form>
      <h2>Reviews</h2>${reviews || '<p class="muted">No reviews yet.</p>'}
      ${u ? `<form method="post" action="/products/${prod.id}/review" style="max-width:480px">
        <label>Your review</label><textarea name="text" rows="3" required></textarea>
        <label>Rating</label><select name="rating"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select>
        <button class="btn">Post Review</button></form>` : '<p><a href="/login">Login</a> to write a review.</p>'}`));
  }

  if (method === 'POST' && (m = p.match(/^\/products\/(\d+)\/review$/))) {
    if (needLogin(req, res)) return;
    attempt(F_CAT);
    const body = parseUrlEncoded(await readBody(req));
    const u = currentUser(req);
    /* VULN: review stored verbatim and rendered raw elsewhere. */
    const text = String(body.text || '');
    db.reviews.push({ id: db.nextReviewId++, productId: Number(m[1]), userId: u.id, author: u.name,
      rating: Math.min(5, Math.max(1, parseInt(body.rating, 10) || 5)), text });
    if (XSS_PAT.test(text)) pass('stored-xss-review');
    return redirect(res, '/products/' + m[1]);
  }

  if (method === 'GET' && p === '/search') {
    attempt(F_CAT);
    const q = url.searchParams.get('q') || '';
    const result = runNaiveSearch(q);
    if (result.unionUsers || result.products.some(x => x.hidden)) pass('sqli-search');
    let html = `<h1>Search results for "${esc(q)}"</h1>`;
    /* VULN: the raw query is also reflected unescaped in this summary line. */
    html += `<p class="muted">Showing results for: ${q}</p>`;
    if (XSS_PAT.test(q) && html.includes(q)) pass('reflected-xss');
    if (result.unionUsers) {
      html += `<h2>Raw query output (extra rows)</h2><table><tr><th>Email</th><th>Role</th><th>Loyalty tier</th></tr>` +
        result.unionUsers.map(u => `<tr><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td>${esc(u.loyaltyTier)}</td></tr>`).join('') + `</table>`;
    }
    html += result.products.length
      ? '<div class="grid">' + result.products.map(x => `<div class="card"><h3><a href="/products/${x.id}">${esc(x.name)}</a></h3>
          <div class="price">${money(x.price)}</div>${x.hidden ? `<p class="muted">DRAFT — internal cost ${money(x.costPrice)}</p>` : ''}</div>`).join('') + '</div>'
      : '<p>No products matched.</p>';
    return send(res, 200, layout(req, 'Search', html));
  }

  /* ---------- auth ---------- */
  if (method === 'GET' && p === '/login') {
    return send(res, 200, layout(req, 'Login', `<h1>Login</h1>
      <form method="post" action="/login" style="max-width:360px">
      <label>Email</label><input name="email" type="email" required>
      <label>Password</label><input name="password" type="password" required>
      <button class="btn">Login</button></form>
      <p><a href="/forgot">Forgot password?</a></p>
      <div class="warn"><strong>Lab test accounts</strong><br>
      Admin: admin@hexafashion.local / Admin@123<br>
      Customer: aisha@hexafashion.local / User@123<br>
      Customer: karim@hexafashion.local / User@123</div>`));
  }
  if (method === 'POST' && p === '/login') {
    attempt(F_AUTH);
    const body = parseUrlEncoded(await readBody(req));
    const emailIn = String(body.email || '');
    const passIn = String(body.password || '');
    /* VULN: the legacy login path builds its query as a string, so an
     * injected always-true condition in the email logs the attacker in
     * without the password ever being checked. */
    const tautology = /'\s*or\s*'[^']*'\s*=\s*'[^']*'|'\s*or\s*\d+\s*=\s*\d+/i.test(emailIn);
    if (tautology) {
      const prefix = emailIn.split("'")[0].trim().toLowerCase();
      const target = db.users.find(u => u.email === prefix) || db.users[0];
      pass('sqli-login');
      return redirect(res, '/', { 'Set-Cookie': sessionCookie(target) });
    }
    const user = db.users.find(u => u.email === emailIn.toLowerCase() && u.password === passIn);
    if (!user) {
      const known = db.users.find(u => u.email === emailIn.toLowerCase());
      /* VULN: differential messages reveal whether the account exists. */
      noteEnumProbe(req, !!known);
      /* VULN: failures are counted for training detection, never throttled. */
      const n = (_failLogins.get(emailIn.toLowerCase()) || 0) + 1;
      _failLogins.set(emailIn.toLowerCase(), n);
      if (n >= 10) pass('brute-force');
      const msg = known ? 'Incorrect password for that account.' : 'No account exists for that email address.';
      return send(res, 401, layout(req, 'Login', `<div class="flash">${msg}</div><p><a href="/login">Try again</a></p>`));
    }
    return redirect(res, '/', { 'Set-Cookie': sessionCookie(user) });
  }
  if (method === 'GET' && p === '/register') {
    return send(res, 200, layout(req, 'Register', `<h1>Create account</h1>
      <form method="post" action="/register" style="max-width:360px">
      <label>Name</label><input name="name" required>
      <label>Email</label><input name="email" type="email" required>
      <label>Password</label><input name="password" type="password" required>
      <button class="btn">Register</button></form>`));
  }
  if (method === 'POST' && p === '/register') {
    attempt(F_PROF);
    const body = parseUrlEncoded(await readBody(req));
    const email = String(body.email || '').toLowerCase();
    if (db.users.some(u => u.email === email)) return send(res, 400, layout(req, 'Register', '<div class="flash">Email already registered.</div>'));
    /* VULN: no password-strength policy at all — even 1 character passes. */
    const pw = String(body.password || '');
    if (pw.length < 8) pass('weak-password-policy');
    const nameIn = String(body.name || 'Customer');
    if (XSS_PAT.test(nameIn)) pass('stored-xss-admin');
    const user = { id: db.nextUserId++, email, password: pw, name: nameIn,
      role: 'customer', isAdmin: false, loyaltyTier: 'BRONZE', address: '', phone: '', wishlist: [], avatar: '' };
    db.users.push(user);
    return redirect(res, '/', { 'Set-Cookie': sessionCookie(user) });
  }
  if (method === 'GET' && p === '/logout') {
    return redirect(res, '/', { 'Set-Cookie': 'hf_session=; Path=/; Max-Age=0' });
  }

  /* ---------- predictable password-reset token ----------
   * Token = base64(email) + "." + userId. Anyone who knows a victim's
   * email can compute the token offline — no inbox access needed.
   * The forgot form ALSO reveals whether the account exists.          */
  if (method === 'GET' && p === '/forgot') {
    return send(res, 200, layout(req, 'Forgot password', `<h1>Reset password</h1>
      <form method="post" action="/forgot" style="max-width:360px">
      <label>Email</label><input name="email" type="email" required>
      <button class="btn">Send reset link</button></form>`));
  }
  if (method === 'POST' && p === '/forgot') {
    attempt(F_AUTH);
    const body = parseUrlEncoded(await readBody(req));
    const user = db.users.find(u => u.email === String(body.email || '').toLowerCase());
    noteEnumProbe(req, !!user);
    if (user) {
      user.resetToken = Buffer.from(user.email, 'utf8').toString('base64').replace(/=+$/, '') + '.' + user.id;
      console.log('[lab] Password reset link for ' + user.email + ': http://' + HOST + ':' + PORT + '/reset?token=' + user.resetToken);
      return send(res, 200, layout(req, 'Forgot password', '<div class="flash ok">Reset link sent to that email address. (Lab: watch the server console.)</div>'));
    }
    return send(res, 200, layout(req, 'Forgot password', '<div class="flash">No account found for that email address.</div>'));
  }
  if (method === 'GET' && p === '/reset') {
    return send(res, 200, layout(req, 'Reset password', `<h1>Choose a new password</h1>
      <form method="post" action="/reset" style="max-width:360px">
      <input type="hidden" name="token" value="${esc(url.searchParams.get('token') || '')}">
      <label>New password</label><input name="password" type="password" required>
      <button class="btn">Reset password</button></form>`));
  }
  if (method === 'POST' && p === '/reset') {
    attempt(F_AUTH);
    const body = parseUrlEncoded(await readBody(req));
    const user = db.users.find(u => u.resetToken && u.resetToken === String(body.token || ''));
    if (!user) return send(res, 400, layout(req, 'Reset password', '<div class="flash">Invalid or expired token.</div>'));
    const expected = Buffer.from(user.email, 'utf8').toString('base64').replace(/=+$/, '') + '.' + user.id;
    if (String(body.token || '') === expected) pass('predictable-reset-token');
    user.password = String(body.password || '');
    user.resetToken = null;
    return send(res, 200, layout(req, 'Reset password', '<div class="flash ok">Password changed. <a href="/login">Login</a></div>'));
  }

  /* ---------- wishlist ---------- */
  if (method === 'POST' && p === '/wishlist/add') {
    if (needLogin(req, res)) return;
    const body = parseUrlEncoded(await readBody(req));
    const u = currentUser(req);
    const pid = Number(body.productId);
    if (!u.wishlist.includes(pid)) u.wishlist.push(pid);
    return redirect(res, '/wishlist');
  }
  if (method === 'POST' && p === '/wishlist/remove') {
    if (needLogin(req, res)) return;
    const body = parseUrlEncoded(await readBody(req));
    const u = currentUser(req);
    u.wishlist = u.wishlist.filter(id => id !== Number(body.productId));
    return redirect(res, '/wishlist');
  }
  if (method === 'GET' && p === '/wishlist') {
    if (needLogin(req, res)) return;
    const u = currentUser(req);
    const rows = u.wishlist.map(id => findProduct(id)).filter(Boolean).map(x => `
      <div class="card"><h3><a href="/products/${x.id}">${esc(x.name)}</a></h3><div class="price">${money(x.price)}</div>
      <form method="post" action="/wishlist/remove"><input type="hidden" name="productId" value="${x.id}"><button class="btn sec sm">Remove</button></form></div>`).join('');
    return send(res, 200, layout(req, 'Wishlist', `<h1>My Wishlist</h1><div class="grid">${rows || '<p class="muted">Your wishlist is empty.</p>'}</div>`));
  }

  /* ---------- cart ---------- */
  if (method === 'POST' && p === '/cart/add') {
    if (needLogin(req, res)) return;
    attempt(F_CART);
    const body = parseUrlEncoded(await readBody(req));
    const u = currentUser(req);
    const cart = db.carts[u.id] || (db.carts[u.id] = []);
    const pid = Number(body.productId), size = String(body.size || 'M'), qty = Math.max(1, parseInt(body.qty, 10) || 1);
    const existing = cart.find(i => i.productId === pid && i.size === size);
    if (existing) existing.qty += qty; else cart.push({ productId: pid, size, qty });
    return redirect(res, '/cart');
  }
  if (method === 'POST' && p === '/cart/remove') {
    if (needLogin(req, res)) return;
    const body = parseUrlEncoded(await readBody(req));
    const u = currentUser(req);
    db.carts[u.id] = (db.carts[u.id] || []).filter(i => !(i.productId === Number(body.productId) && i.size === String(body.size)));
    return redirect(res, '/cart');
  }
  if (method === 'GET' && p === '/cart') {
    if (needLogin(req, res)) return;
    const u = currentUser(req);
    const cart = db.carts[u.id] || [];
    const rows = cart.map(i => { const prod = findProduct(i.productId); if (!prod) return '';
      return `<tr><td>${esc(prod.name)}</td><td>${esc(i.size)}</td><td>${i.qty}</td><td>${money(prod.price + (i.size === 'XL' ? prod.xlSurcharge : 0))}</td>
      <td><form method="post" action="/cart/remove"><input type="hidden" name="productId" value="${prod.id}"><input type="hidden" name="size" value="${esc(i.size)}"><button class="btn sec sm">Remove</button></form></td></tr>`; }).join('');
    return send(res, 200, layout(req, 'Cart', `<h1>Shopping Cart</h1>
      ${cart.length ? `<table><tr><th>Product</th><th>Size</th><th>Qty</th><th>Unit price</th><th></th></tr>${rows}</table><br><a class="btn" href="/checkout">Proceed to Checkout</a>`
      : '<p class="muted">Your cart is empty.</p>'}`));
  }

  /* ---------- checkout ----------
   * VULNs: the server trusts the per-item "price" and "surcharge" sent
   * by the client; quantity is not validated (negative accepted);
   * stock is never checked; coupons stack and can be reused forever.  */
  if (method === 'GET' && p === '/checkout') {
    if (needLogin(req, res)) return;
    const u = currentUser(req);
    const cart = db.carts[u.id] || [];
    if (!cart.length) return send(res, 200, layout(req, 'Checkout', '<p class="muted">Your cart is empty.</p>'));
    const rows = cart.map(i => { const prod = findProduct(i.productId); if (!prod) return '';
      const surcharge = i.size === 'XL' ? prod.xlSurcharge : 0;
      return `<tr><td>${esc(prod.name)} (${esc(i.size)})</td><td>${i.qty}</td><td>${money((prod.price + surcharge) * i.qty)}</td></tr>
        <input type="hidden" name="productId" value="${prod.id}">
        <input type="hidden" name="size" value="${esc(i.size)}">
        <input type="hidden" name="qty" value="${i.qty}">
        <input type="hidden" name="price" value="${prod.price}">
        <input type="hidden" name="surcharge" value="${surcharge}">`; }).join('');
    return send(res, 200, layout(req, 'Checkout', `<h1>Checkout</h1>
      <form method="post" action="/checkout">
      <table><tr><th>Item</th><th>Qty</th><th>Line total</th></tr>${rows}</table>
      <label>Coupon codes (comma separated)</label><input name="coupons" placeholder="WELCOME10">
      <label>Gift card code (optional)</label><input name="giftcard" placeholder="HF-1000">
      <label>Delivery address</label><input name="address" value="${esc(u.address)}">
      <button class="btn">Place Order</button></form>
      <p class="muted">Coupons: WELCOME10 = 10% off · FASHION20 = 20% off · VIP50 = 50% off</p>`));
  }
  if (method === 'POST' && p === '/checkout') {
    if (needLogin(req, res)) return;
    attempt(F_CART);
    const body = parseUrlEncoded(await readBody(req));
    const u = currentUser(req);
    const pids = asArray(body.productId), sizesA = asArray(body.size), qtys = asArray(body.qty),
          prices = asArray(body.price), surcharges = asArray(body.surcharge);
    const items = [];
    let total = 0;
    for (let i = 0; i < pids.length; i++) {
      const prod = findProduct(pids[i]);
      if (!prod) continue;
      const size = String(sizesA[i] || 'M');
      const qtyParsed = parseInt(qtys[i], 10);
      const qty = isNaN(qtyParsed) ? 1 : qtyParsed;   /* VULN: no positivity/bounds validation */
      const price = parseFloat(prices[i]);                 /* VULN: client-sent price trusted */
      const surcharge = parseFloat(surcharges[i]);         /* VULN: client-sent surcharge trusted */
      const expectedSurcharge = size === 'XL' ? prod.xlSurcharge : 0;
      if (!isNaN(price) && Math.abs(price - prod.price) > 0.001) pass('price-tampering');
      if (!isNaN(surcharge) && Math.abs(surcharge - expectedSurcharge) > 0.001) pass('surcharge-tampering');
      if (qty <= 0) pass('negative-quantity');
      const stock = prod.sizes[size] ? prod.sizes[size].stock : 0;
      if (qty > stock) pass('oversell-stock');             /* VULN: stock is never enforced */
      const unit = (isNaN(price) ? prod.price : price) + (isNaN(surcharge) ? 0 : surcharge);
      items.push({ productId: prod.id, name: prod.name, size, qty, priceCharged: isNaN(price) ? prod.price : price, surchargeCharged: isNaN(surcharge) ? 0 : surcharge });
      total += unit * qty;
    }
    if (!items.length) return send(res, 400, layout(req, 'Checkout', '<div class="flash">Nothing to order.</div>'));
    const codes = String(body.coupons || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    const validCodes = codes.filter(c => db.coupons[c]);
    const usedBefore = db.couponUse[u.id] || [];
    const dupInOrder = new Set(validCodes).size !== validCodes.length;
    if (validCodes.length >= 2 || dupInOrder || validCodes.some(c => usedBefore.includes(c))) pass('coupon-stacking');
    for (const code of codes) {                            /* VULN: stacking + unlimited reuse */
      const pct = db.coupons[code];
      if (pct) total = total * (1 - pct / 100);
    }
    db.couponUse[u.id] = usedBefore.concat(validCodes);
    let giftUsed = 0;
    const gc = db.giftCards[String(body.giftcard || '').toUpperCase()];
    if (gc && !gc.used && gc.balance > 0) { giftUsed = Math.min(gc.balance, total); total -= giftUsed; gc.balance -= giftUsed; if (gc.balance <= 0) gc.used = true; }
    void giftUsed;
    total = Math.max(0, Math.round(total * 100) / 100);
    const order = { id: db.nextOrderId++, userId: u.id, items, total, coupons: codes, status: 'Placed',
      address: String(body.address || u.address || ''), date: new Date().toISOString().slice(0, 10) };
    db.orders.push(order);
    db.carts[u.id] = [];
    return redirect(res, '/orders/' + order.id);
  }

  /* ---------- orders ----------
   * VULN (IDOR): /orders/:id and /orders/:id/invoice never check that
   * the order belongs to the logged-in user.                          */
  if (method === 'GET' && p === '/orders') {
    if (needLogin(req, res)) return;
    const u = currentUser(req);
    const rows = db.orders.filter(o => o.userId === u.id).map(o =>
      `<tr><td><a href="/orders/${o.id}">#${o.id}</a></td><td>${esc(o.date)}</td><td>${esc(o.status)}</td><td>${money(o.total)}</td></tr>`).join('');
    return send(res, 200, layout(req, 'My Orders', `<h1>My Orders</h1><table><tr><th>Order</th><th>Date</th><th>Status</th><th>Total</th></tr>${rows || '<tr><td colspan="4">No orders yet.</td></tr>'}</table>`));
  }
  if (method === 'GET' && (m = p.match(/^\/orders\/(\d+)$/))) {
    if (needLogin(req, res)) return;
    attempt(F_ORD);
    const order = db.orders.find(o => o.id === Number(m[1]));
    if (!order) return send(res, 404, layout(req, '404', '<h1>Order not found</h1>'));
    const viewer = currentUser(req);
    if (viewer && order.userId !== viewer.id && !isRealAdmin(req)) pass('order-idor');
    const owner = findUser(order.userId);
    const rows = order.items.map(i => `<tr><td>${esc(i.name)}</td><td>${esc(i.size)}</td><td>${i.qty}</td><td>${money(i.priceCharged + i.surchargeCharged)}</td></tr>`).join('');
    return send(res, 200, layout(req, 'Order #' + order.id, `
      <h1>Order #${order.id}</h1>
      <p class="muted">Customer: ${esc(owner ? owner.name : '?')} · Date: ${esc(order.date)} · Status: ${esc(order.status)}</p>
      <table><tr><th>Item</th><th>Size</th><th>Qty</th><th>Unit charged</th></tr>${rows}</table>
      <h3>Total charged: ${money(order.total)}</h3>
      <p>Delivery address: ${esc(order.address)}</p>
      <p><a class="btn sec sm" href="/orders/${order.id}/invoice">View Invoice</a></p>
      <h2>Request a return</h2>
      <form method="post" action="/orders/${order.id}/return" style="max-width:420px">
        <label>Reason</label><input name="reason" required>
        <label>Refund amount (USD)</label><input name="refundAmount" type="number" step="0.01" value="${order.total}">
        <button class="btn">Submit Return Request</button></form>`));
  }
  if (method === 'GET' && (m = p.match(/^\/orders\/(\d+)\/invoice$/))) {
    if (needLogin(req, res)) return;
    attempt(F_ORD);
    const order = db.orders.find(o => o.id === Number(m[1]));
    if (!order) return send(res, 404, layout(req, '404', '<h1>Order not found</h1>'));
    const viewer = currentUser(req);
    if (viewer && order.userId !== viewer.id && !isRealAdmin(req)) pass('order-idor');
    const owner = findUser(order.userId);
    const rows = order.items.map(i => `<tr><td>${esc(i.name)} (${esc(i.size)})</td><td>${i.qty}</td><td>${money((i.priceCharged + i.surchargeCharged) * i.qty)}</td></tr>`).join('');
    return send(res, 200, layout(req, 'Invoice #' + order.id, `
      <h1>Invoice #INV-${order.id}</h1>
      <p>Billed to: ${esc(owner ? owner.name : '?')} (${esc(owner ? owner.email : '')})<br>Address: ${esc(order.address)}</p>
      <table><tr><th>Item</th><th>Qty</th><th>Line total</th></tr>${rows}</table>
      <h3>Total: ${money(order.total)}</h3>`));
  }

  /* ---------- returns ----------
   * VULN: refund amount is taken from the request body.
   * VULN (IDOR): any logged-in user can VIEW any return and
   * APPROVE/REJECT it — no ownership or admin check.                  */
  if (method === 'POST' && (m = p.match(/^\/orders\/(\d+)\/return$/))) {
    if (needLogin(req, res)) return;
    attempt(F_RET);
    const body = parseUrlEncoded(await readBody(req));
    const order = db.orders.find(o => o.id === Number(m[1]));
    if (!order) return send(res, 404, layout(req, '404', '<h1>Order not found</h1>'));
    const refund = parseFloat(body.refundAmount) || 0;
    if (Math.abs(refund - order.total) > 0.001) pass('refund-tampering');
    const ret = { id: db.nextReturnId++, orderId: order.id, userId: order.userId,
      reason: String(body.reason || ''), refundAmount: refund,  /* VULN: client-sent refund trusted */
      status: 'Pending', date: new Date().toISOString().slice(0, 10) };
    db.returns.push(ret);
    return redirect(res, '/returns/' + ret.id);
  }
  if (method === 'GET' && p === '/returns') {
    if (needLogin(req, res)) return;
    attempt(F_RET);
    const viewer = currentUser(req);
    if (viewer && !isRealAdmin(req) && db.returns.some(r => r.userId !== viewer.id)) pass('returns-idor');
    const rows = db.returns.map(r => { const owner = findUser(r.userId);
      return `<tr><td><a href="/returns/${r.id}">#${r.id}</a></td><td>#${r.orderId}</td><td>${esc(owner ? owner.name : '?')}</td><td>${esc(r.status)}</td><td>${money(r.refundAmount)}</td></tr>`; }).join('');
    return send(res, 200, layout(req, 'Returns', `<h1>Return Requests</h1><table><tr><th>Return</th><th>Order</th><th>Customer</th><th>Status</th><th>Refund</th></tr>${rows}</table>`));
  }
  if (method === 'GET' && (m = p.match(/^\/returns\/(\d+)$/))) {
    if (needLogin(req, res)) return;
    attempt(F_RET);
    const ret = db.returns.find(r => r.id === Number(m[1]));
    if (!ret) return send(res, 404, layout(req, '404', '<h1>Return not found</h1>'));
    const viewer = currentUser(req);
    if (viewer && ret.userId !== viewer.id && !isRealAdmin(req)) pass('returns-idor');
    const owner = findUser(ret.userId);
    return send(res, 200, layout(req, 'Return #' + ret.id, `
      <h1>Return #${ret.id}</h1>
      <p>Order: <a href="/orders/${ret.orderId}">#${ret.orderId}</a> · Customer: ${esc(owner ? owner.name : '?')}<br>
      Reason: ${esc(ret.reason)}<br>Status: <strong>${esc(ret.status)}</strong><br>Refund amount: <strong>${money(ret.refundAmount)}</strong></p>
      <form method="post" action="/returns/${ret.id}/approve" style="display:inline"><button class="btn">Approve Refund</button></form>
      <form method="post" action="/returns/${ret.id}/reject" style="display:inline"><button class="btn sec">Reject</button></form>`));
  }
  if (method === 'POST' && (m = p.match(/^\/returns\/(\d+)\/(approve|reject)$/))) {
    if (needLogin(req, res)) return;
    attempt(F_RET);
    const ret = db.returns.find(r => r.id === Number(m[1]));
    if (!ret) return send(res, 404, layout(req, '404', '<h1>Return not found</h1>'));
    const actor = currentUser(req);
    if (actor && ret.userId !== actor.id && !isRealAdmin(req)) pass('returns-idor');
    if (actor && ret.userId === actor.id) pass('returns-idor'); // approving your OWN refund is the same missing-authorisation flaw
    /* VULN: NO admin/ownership check — any customer can approve a refund of any size. */
    ret.status = m[2] === 'approve' ? 'Approved — refund of ' + money(ret.refundAmount) + ' issued' : 'Rejected';
    return redirect(res, '/returns/' + ret.id);
  }

  /* ---------- gift cards ----------
   * VULN: codes are sequential (HF-1000, HF-1001, ...) and the
   * balance-check endpoint has NO rate limiting and needs no login.   */
  if (method === 'GET' && p === '/giftcard') {
    return send(res, 200, layout(req, 'Gift Cards', `<h1>Check Gift Card Balance</h1>
      <form method="get" action="/giftcard/check" style="max-width:360px">
      <label>Gift card code</label><input name="code" placeholder="HF-1000" required>
      <button class="btn">Check Balance</button></form>
      <p class="muted">Demo cards were issued in the HF-100x range.</p>`));
  }
  if (method === 'GET' && p === '/giftcard/check') {
    attempt(F_GIFT);
    const code = String(url.searchParams.get('code') || '').toUpperCase();
    const ip = (req.socket && req.socket.remoteAddress) || 'local';
    const now = Date.now();
    let rec = _gcProbes.get(ip);
    if (!rec || now - rec.t0 > 120000) { rec = { codes: new Set(), t0: now }; _gcProbes.set(ip, rec); }
    rec.codes.add(code);
    if (rec.codes.size >= 5) pass('giftcard-enumeration');
    const card = db.giftCards[code];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(card ? { code, valid: true, balance: card.balance, used: card.used }
                                         : { code, valid: false, balance: 0 }));
  }

  /* ---------- profile / settings ----------
   * VULN: mass assignment — every posted field is copied onto the
   * user record, including isAdmin, role and loyaltyTier.
   * VULN: no CSRF protection — the form carries a marker field, but
   * the server never verifies it, so cross-site posts succeed.        */
  if (method === 'GET' && p === '/profile') {
    if (needLogin(req, res)) return;
    const u = currentUser(req);
    const s = getSession(req);
    return send(res, 200, layout(req, 'Profile', `<h1>My Profile</h1>
      ${u.avatar ? `<p><img src="${esc(u.avatar)}" alt="avatar" style="width:96px;height:96px;object-fit:cover;border-radius:50%"></p>` : ''}
      <p class="muted">Email: ${esc(u.email)} · Role: ${esc(u.role)} · Admin flag: ${u.isAdmin} · Loyalty tier: ${esc(u.loyaltyTier)}</p>
      <form method="post" action="/profile" style="max-width:420px">
        <input type="hidden" name="hx_marker" value="${esc(s && s.mk ? s.mk : '')}">
        <label>Full name</label><input name="name" value="${esc(u.name)}">
        <label>Phone</label><input name="phone" value="${esc(u.phone)}">
        <label>Address</label><input name="address" value="${esc(u.address)}">
        <button class="btn">Save Profile</button></form>
      <h2>Profile photo</h2>
      <form method="post" action="/profile/avatar" enctype="multipart/form-data" style="max-width:420px">
        <label>Upload an image</label><input type="file" name="avatar">
        <button class="btn sec">Upload Photo</button></form>`));
  }
  if (method === 'POST' && p === '/profile') {
    if (needLogin(req, res)) return;
    attempt(F_PROF);
    const body = parseUrlEncoded(await readBody(req));
    const u = currentUser(req);
    const s = getSession(req);
    /* CSRF proof: the request changed state without the session marker
     * a genuine in-site form would have carried (never verified — VULN). */
    if (!s || !s.mk || String(body.hx_marker || '') !== String(s.mk)) pass('csrf-profile');
    const privileged = ['isAdmin', 'role', 'loyaltyTier'].filter(k => body[k] !== undefined && String(body[k]) !== String(u[k]));
    if (privileged.length) pass('mass-assignment');
    if (body.name !== undefined && XSS_PAT.test(String(body.name))) pass('stored-xss-admin');
    /* VULN: blind mass assignment, no whitelist */
    for (const [k, v] of Object.entries(body)) {
      if (['id', 'email', 'password', 'wishlist', 'hx_marker'].includes(k)) continue;
      u[k] = v === 'true' ? true : (v === 'false' ? false : v);
    }
    return redirect(res, '/profile');
  }
  if (method === 'POST' && p === '/profile/avatar') {
    if (needLogin(req, res)) return;
    attempt(F_FILE);
    const buf = await readBody(req);
    const parts = parseMultipart(req, buf) || [];
    const file = parts.find(x => x.name === 'avatar' && x.filename);
    if (!file) return send(res, 400, layout(req, 'Profile', '<div class="flash">No file received.</div>'));
    /* VULN: no extension/MIME/content validation — file stored and served as-is */
    const name = path.basename(file.filename).replace(/[^\w.\-]/g, '_') || 'upload.bin';
    const ext = path.extname(name).toLowerCase();
    const type = ext === '.html' || ext === '.htm' ? 'text/html'
      : ext === '.svg' ? 'image/svg+xml'
      : ext === '.png' ? 'image/png'
      : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
      : ext === '.gif' ? 'image/gif' : 'application/octet-stream';
    if (type === 'text/html' || type === 'image/svg+xml') pass('avatar-upload');
    db.uploads[name] = { data: file.data, type };
    const u = currentUser(req);
    u.avatar = '/uploads/' + name;
    return redirect(res, '/profile');
  }
  if (method === 'GET' && (m = p.match(/^\/uploads\/(.+)$/))) {
    attempt(F_FILE);
    const name = decodeURIComponent(m[1]);
    const f = db.uploads[name];
    if (!f) return send(res, 404, 'not found');
    if (f.type === 'text/html' || f.type === 'image/svg+xml') pass('avatar-upload');
    res.writeHead(200, { 'Content-Type': f.type });   /* VULN: uploaded HTML is served as text/html */
    return res.end(f.data);
  }

  /* ---------- file download ----------
   * VULN: /download joins the name parameter into a filesystem path
   * with no confinement — intended to serve only logo.png, it will
   * happily read ../ files and absolute paths too.                    */
  if (method === 'GET' && p === '/download') {
    attempt(F_FILE);
    const name = String(url.searchParams.get('name') || 'logo.png');
    const fp = path.resolve(__dirname, name);
    let data = null;
    try { if (fs.statSync(fp).isFile()) data = fs.readFileSync(fp); } catch (e) { data = null; }
    if (!data) return send(res, 404, layout(req, '404', '<h1>File not found</h1>'));
    if (name !== 'logo.png') pass('path-traversal');
    const ext = path.extname(fp).toLowerCase();
    const type = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'text/plain; charset=utf-8';
    res.writeHead(200, { 'Content-Type': type });
    return res.end(data);
  }

  /* ---------- API ----------
   * VULN: an unauthenticated "export" API returns the full customer
   * table — including plaintext passwords — to anyone who asks.       */
  if (method === 'GET' && p === '/api/users') {
    attempt(F_API);
    pass('api-user-exposure');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(db.users.map(u => ({ id: u.id, email: u.email, password: u.password, name: u.name, role: u.role, isAdmin: u.isAdmin, loyaltyTier: u.loyaltyTier, phone: u.phone, address: u.address })), null, 2));
  }
  if (method === 'GET' && p === '/api/progress') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(progressSummary(), null, 2));
  }
  if (method === 'POST' && p === '/api/chat') {
    const raw = await readBody(req);
    let msg = '';
    if ((req.headers['content-type'] || '').includes('application/json')) {
      try { msg = String(JSON.parse(raw.toString('utf8')).message || ''); } catch (e) { msg = ''; }
    } else msg = String(parseUrlEncoded(raw).message || '');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ reply: chatReply(msg) }));
  }

  /* ---------- admin ---------- */
  if (method === 'GET' && p === '/admin') {
    attempt(F_ADM);
    if (!isAdmin(req)) return send(res, 403, layout(req, 'Forbidden', '<h1>403 — Admins only</h1>'));
    noteCookieTamper(req);
    return send(res, 200, layout(req, 'Admin', `<h1>Admin Dashboard</h1>
      <p>Products: ${db.products.length} · Orders: ${db.orders.length} · Users: ${db.users.length} · Returns pending: ${db.returns.filter(r => r.status === 'Pending').length}</p>
      <p><a class="btn" href="/admin/products">Manage Products</a>
         <a class="btn" href="/admin/orders">All Orders</a>
         <a class="btn" href="/admin/returns">Returns Queue</a>
         <a class="btn" href="/admin/customers">Customers</a></p>`));
  }
  if (method === 'GET' && p === '/admin/products') {
    attempt(F_ADM);
    if (!isAdmin(req)) return send(res, 403, layout(req, 'Forbidden', '<h1>403 — Admins only</h1>'));
    noteCookieTamper(req);
    const rows = db.products.map(x => `<tr><td>${x.id}</td><td>${esc(x.name)}</td><td>${money(x.price)}</td><td>${x.hidden ? 'DRAFT (cost ' + money(x.costPrice) + ')' : 'Live'}</td></tr>`).join('');
    return send(res, 200, layout(req, 'Admin Products', `<h1>Products</h1><table><tr><th>ID</th><th>Name</th><th>Price</th><th>Status</th></tr>${rows}</table>`));
  }
  if (method === 'GET' && p === '/admin/orders') {
    attempt(F_ADM);
    if (!isAdmin(req)) return send(res, 403, layout(req, 'Forbidden', '<h1>403 — Admins only</h1>'));
    noteCookieTamper(req);
    const rows = db.orders.map(o => { const owner = findUser(o.userId);
      return `<tr><td><a href="/orders/${o.id}">#${o.id}</a></td><td>${esc(owner ? owner.email : '?')}</td><td>${esc(o.status)}</td><td>${money(o.total)}</td></tr>`; }).join('');
    return send(res, 200, layout(req, 'Admin Orders', `<h1>All Orders</h1><table><tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th></tr>${rows}</table>`));
  }
  if (method === 'GET' && p === '/admin/returns') {
    attempt(F_ADM);
    if (!isAdmin(req)) return send(res, 403, layout(req, 'Forbidden', '<h1>403 — Admins only</h1>'));
    noteCookieTamper(req);
    const rows = db.returns.map(r => `<tr><td><a href="/returns/${r.id}">#${r.id}</a></td><td>#${r.orderId}</td><td>${esc(r.status)}</td><td>${money(r.refundAmount)}</td></tr>`).join('');
    return send(res, 200, layout(req, 'Admin Returns', `<h1>Returns Queue</h1><table><tr><th>Return</th><th>Order</th><th>Status</th><th>Refund</th></tr>${rows}</table>`));
  }
  if (method === 'GET' && p === '/admin/customers') {
    attempt(F_ADM);
    if (!isAdmin(req)) return send(res, 403, layout(req, 'Forbidden', '<h1>403 — Admins only</h1>'));
    noteCookieTamper(req);
    /* VULN: customer display names are rendered RAW in the admin view —
     * a crafted name executes script in the admin's browser. */
    const rows = db.users.map(u => `<tr><td>${u.id}</td><td>${u.name}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td>${esc(u.loyaltyTier)}</td></tr>`).join('');
    return send(res, 200, layout(req, 'Admin Customers', `<h1>Customers</h1><table><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Tier</th></tr>${rows}</table>`));
  }

  /* ---------- LAB SYSTEM: mission page ---------- */
  if (method === 'GET' && p === '/tests') {
    const sum = progressSummary();
    let html = `<h1>🎯 LAB ${LAB_NUMBER} — ${LAB_NAME}: Security Tests</h1>
      <p>Complete every test by actually performing the exploit — the server detects success itself; there is no "mark done" button.
      Progress saves automatically and survives restarts. Currently <strong>${sum.done}/${sum.total} (${sum.pct}%)</strong>.
      Step-by-step help from the 💬 Lab Assistant unlocks after <strong>3 tries</strong> on a feature.</p>`;
    for (const f of FEATURES) {
      const ts = TESTS.filter(t => t.feature === f);
      const tried = progress.attempts[f] || 0;
      html += `<h2>${esc(f)} <span class="muted">(${ts.filter(t => progress.tests[t.id]).length}/${ts.length} done · ${tried} attempt${tried === 1 ? '' : 's'} recorded)</span></h2>`;
      for (const t of ts) {
        const done = !!progress.tests[t.id];
        html += `<div class="testrow"><strong>${esc(t.name)}</strong> — <span class="${done ? 'done' : 'open'}">${done ? '✓ DONE' : '○ OPEN'}</span><br>
          <span class="muted">${esc(t.owasp)} · ${esc(t.difficulty)}</span>
          <div>${t.hints.map((h, i) => `<div class="hintbox" id="hint-${t.id}-${i}" style="display:none">💡 Hint ${i + 1}: ${esc(h)}</div>`).join('')}
          <button class="btn sec sm" onclick="for(var i=0;i<3;i++){var e=document.getElementById('hint-${t.id}-'+i);if(e.style.display==='none'){e.style.display='block';break;}}">Show hint</button></div></div>`;
      }
    }
    return send(res, 200, layout(req, 'Tests', html));
  }

  /* ---------- LAB SYSTEM: completion page ---------- */
  if (method === 'GET' && p === '/complete') {
    const sum = progressSummary();
    if (!isComplete()) {
      const left = TESTS.filter(t => !progress.tests[t.id]);
      return send(res, 200, layout(req, 'Complete', `<h1>🏁 Lab Completion</h1>
        <p>You are at <strong>${sum.done}/${sum.total} tests (${sum.pct}%)</strong>. The completion summary, your certificate and the key for the next lab unlock at 100%.</p>
        <h2>Still to complete (${left.length})</h2>
        ${left.map(t => `<div class="testrow"><strong>${esc(t.name)}</strong> <span class="muted">— ${esc(t.feature)} · ${esc(t.difficulty)}</span></div>`).join('')}
        <p><a class="btn" href="/tests">Go to the Tests page</a></p>`));
    }
    const key = completionKey();
    const featCounts = FEATURES.map(f => `<tr><td>${esc(f)}</td><td>${TESTS.filter(t => t.feature === f).length}</td></tr>`).join('');
    const techniques = TESTS.map((t, i) => `<li>${esc(t.name)} <span class="muted">(${esc(t.feature)})</span></li>`).join('');
    const lessons = TESTS.map(t => `<div class="testrow"><strong>${esc(t.name)}</strong><br>${esc(t.lesson)}</div>`).join('');
    const impacts = TESTS.map(t => `<div class="testrow"><strong>${esc(t.name)}</strong><br>${esc(t.impact)}</div>`).join('');
    const reports = TESTS.map(t => `<div class="testrow"><strong>${esc(t.report.title)}</strong> — <span class="open">Severity: ${esc(t.report.severity)}</span><br><span class="muted">Remediation:</span> ${esc(t.report.remediation)}</div>`).join('');
    return send(res, 200, layout(req, 'Lab Complete', `<h1>🏁 LAB ${LAB_NUMBER} — ${LAB_NAME}: 100% Complete</h1>
      <p>Congratulations — every security test in this lab was completed by performing the exploit. Completed on <strong>${esc((progress.completedAt || '').slice(0, 10))}</strong>.</p>
      <h2>1 · The lab in numbers</h2>
      <p>This lab had <strong>${FEATURES.length} features</strong> and <strong>${TESTS.length} vulnerabilities</strong> in total:</p>
      <table><tr><th>Feature</th><th>Vulnerabilities</th></tr>${featCounts}</table>
      <h2>2 · How the testing was done — ${TESTS.length} techniques</h2>
      <ol>${techniques}</ol>
      <h2>3 · What you learned</h2>${lessons}
      <h2>4 · What this means for a real client</h2>
      <p>Every flaw above was found in a training copy of a shop. On a real client's website, the same findings would mean:</p>${impacts}
      <h2>5 · Writing it in a real report</h2>${reports}
      <h2>6 · Your key for the next lab</h2>
      <div class="warn" style="font-size:18px;text-align:center"><strong>${esc(key)}</strong></div>
      <p>Paste this key on the next lab's start screen to unlock it. The Lab Assistant also has it now, if you ask.</p>
      <h2>Your certificate</h2>
      <form method="post" action="/complete/name" style="max-width:420px">
        <label>Name for the certificate</label><input name="testerName" value="${esc(progress.testerName || '')}" placeholder="Your name">
        <button class="btn sec">Save name</button></form>
      <p><a class="btn" href="/certificate">🎓 View / Print Certificate</a></p>`));
  }
  if (method === 'POST' && p === '/complete/name') {
    const body = parseUrlEncoded(await readBody(req));
    progress.testerName = String(body.testerName || '').slice(0, 80);
    saveProgress();
    return redirect(res, '/certificate');
  }

  /* ---------- LAB SYSTEM: certificate ---------- */
  if (method === 'GET' && p === '/certificate') {
    if (!isComplete()) return redirect(res, '/complete');
    const u = currentUser(req);
    const name = progress.testerName || (u ? u.name : '') || 'HexaCyberLab Tester';
    const date = (progress.completedAt || new Date().toISOString()).slice(0, 10);
    const cert = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER} ${LAB_NAME}</title>
<style>body{font-family:Georgia,'Times New Roman',serif;background:#ececec;margin:0;padding:32px}
.cert{background:#fff;max-width:820px;margin:0 auto;border:3px double #7b5cff;border-radius:8px;padding:44px 52px;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.15)}
.cert img{width:96px;height:96px}
.brand{font-family:Arial,sans-serif;letter-spacing:3px;color:#7b5cff;font-size:13px;text-transform:uppercase}
h1{font-size:34px;margin:10px 0 2px;color:#1c1c28}.sub{color:#666;font-family:Arial,sans-serif;font-size:14px}
.name{font-size:30px;font-style:italic;color:#9c3848;margin:16px 0 4px}
.line{border-top:1px solid #ccc;width:60%;margin:18px auto}
.small{font-family:Arial,sans-serif;color:#555;font-size:13px;line-height:1.6}
.sig{margin-top:26px;font-family:Arial,sans-serif;font-size:13px;color:#333}
@media print{body{background:#fff;padding:0}.noprint{display:none}}
</style></head><body>
<div class="cert">
<img src="/logo.png" alt="HexaCyberLab logo">
<div class="brand">HexaCyberLab</div>
<h1>Certificate of Completion</h1>
<div class="sub">This certifies that</div>
<div class="name">${esc(name)}</div>
<div class="line"></div>
<p class="small">has completed <strong>100%</strong> of the security tests in</p>
<h1 style="font-size:26px">LAB ${LAB_NUMBER} — ${LAB_NAME}</h1>
<p class="small">${TESTS.length} tests across ${FEATURES.length} features — completed on ${esc(date)}<br>
by performing each exploit, understanding its business impact, and learning how it is fixed and reported.</p>
<div class="sig">HexaCyberLab — Built by <strong>Md. Jony Hassain</strong>, Founder</div>
</div>
<p class="noprint" style="text-align:center;margin-top:18px;font-family:Arial,sans-serif"><a href="/complete">← Back to the completion page</a> · Use your browser's Print → Save as PDF to keep this certificate.</p>
</body></html>`;
    return send(res, 200, cert);
  }

  return send(res, 404, layout(req, '404', '<h1>404 — Page not found</h1>'));
}

/* ------------------------------------------------------------------ */

const server = http.createServer((req, res) => {
  route(req, res).catch(err => {
    console.error('[lab] error handling ' + req.method + ' ' + req.url + ': ' + err.message);
    try { send(res, 500, '<h1>500 — Something went wrong (the lab survived)</h1>'); } catch (e) { /* response already sent */ }
  });
});
server.listen(PORT, HOST, () => {
  console.log('HexaFashion vulnerable lab (LAB ' + LAB_NUMBER + ') running at http://' + HOST + ':' + PORT);
  console.log('INTENTIONALLY VULNERABLE — local training only. Progress persists in progress.json.');
});
