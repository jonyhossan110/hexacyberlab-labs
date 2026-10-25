// HexaLuxury — INTENTIONALLY VULNERABLE luxury goods store (practice lab)
// LAB 5 of the HexaCyberLab lab programme.
// Zero-dependency Node.js. LOCAL USE ONLY. Never deploy publicly.
// Business data lives in memory (restart resets it); LAB PROGRESS persists in
// progress.json next to this file (delete it to reset the lab system).
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = 3013;
const HOST = '127.0.0.1';
const LAB_NUMBER = 5;
const LAB_NAME = 'HexaLuxury';

/* ============================== SEED DATA ============================== */

const TIERS = ['Member', 'Gold', 'Platinum'];
const TIER_DISCOUNT = { Member: 0, Gold: 5, Platinum: 10 }; // % — informational; checkout trusts the client anyway (vuln)

let users = [
  { id: 1, name: 'House Administrator', email: 'admin@hexaluxury.local', password: 'Admin@123', role: 'admin',    tier: 'Platinum', phone: '+8801700000001', photo: null },
  { id: 2, name: 'Arif Rahman',         email: 'arif@hexaluxury.local',  password: 'User@123',  role: 'customer', tier: 'Platinum', phone: '+8801711111111', photo: null },
  { id: 3, name: 'Lena Fischer',        email: 'lena@hexaluxury.local',  password: 'User@123',  role: 'customer', tier: 'Member',   phone: '+4915111111111', photo: null },
  { id: 4, name: 'Sofia Marchetti',     email: 'sofia@hexaluxury.local', password: 'User@123',  role: 'customer', tier: 'Gold',     phone: '+393331111111', photo: null },
  { id: 5, name: 'Kenji Watanabe',      email: 'kenji@hexaluxury.local', password: 'User@123',  role: 'customer', tier: 'Platinum', phone: '+819011111111', photo: null },
  { id: 6, name: 'Amara Okafor',        email: 'amara@hexaluxury.local', password: 'User@123',  role: 'customer', tier: 'Gold',     phone: '+2348011111111', photo: null },
  { id: 7, name: 'Lucas Moreau',        email: 'lucas@hexaluxury.local', password: 'User@123',  role: 'customer', tier: 'Member',   phone: '+33611111111',  photo: null },
];
let nextUserId = 8;

const products = [
  { id: 1,  name: 'Aurum Chronograph 41mm',        cat: 'Watches',    price: 18500, vipOnly: false, blurb: 'Hand-finished automatic movement, 18k gold case, alligator strap.' },
  { id: 2,  name: 'Celeste Diamond Necklace',      cat: 'Jewellery',  price: 12750, vipOnly: false, blurb: '2.4ct brilliant-cut diamonds set in platinum, numbered edition.' },
  { id: 3,  name: 'Milano Crocodile Handbag',      cat: 'Bags',       price: 9800,  vipOnly: false, blurb: 'Matte alligator leather, suede interior, gold-plated hardware.' },
  { id: 4,  name: 'Heritage Tourbillon — Private', cat: 'Watches',    price: 64000, vipOnly: true,  blurb: 'Private sale only. One of twelve tourbillons, museum-grade finishing.' },
  { id: 5,  name: 'Riviera Sapphire Ring',         cat: 'Jewellery',  price: 15200, vipOnly: false, blurb: 'Ceylon sapphire 3.1ct with pavé diamond halo.' },
  { id: 6,  name: 'Voyageur Leather Trunk',        cat: 'Bags',       price: 7400,  vipOnly: false, blurb: 'Full-grain vachetta trunk with brass fittings and monogram lining.' },
  { id: 7,  name: 'Noir Alligator Tote — Private', cat: 'Bags',       price: 21900, vipOnly: true,  blurb: 'Private sale only. Single-piece noir alligator, hand-stitched in Florence.' },
  { id: 8,  name: 'Imperial Emerald Earrings',     cat: 'Jewellery',  price: 19800, vipOnly: false, blurb: 'Colombian emeralds, certificated origin, 18k white gold.' },
  { id: 9,  name: 'Sovereign Gold Cufflinks',      cat: 'Jewellery',  price: 3400,  vipOnly: false, blurb: 'Solid 18k gold, engine-turned by a single master craftsman.' },
  { id: 10, name: 'Meridian GMT Watch 40mm',       cat: 'Watches',    price: 16900, vipOnly: false, blurb: 'Dual-time automatic, ceramic bezel, 100m water resistance.' },
  { id: 11, name: 'Platinum Reserve Bracelet — Private', cat: 'Jewellery', price: 28750, vipOnly: true, blurb: 'Private sale only. Platinum and black diamond bracelet, atelier reserve.' },
  { id: 12, name: 'Atelier Silk & Cashmere Coat',  cat: 'Bags',       price: 5600,  vipOnly: false, blurb: 'Double-faced cashmere with silk lining, tailored in Milan.' },
];

// Authenticity certificates. Serials are SEQUENTIAL (HLX-1001, HLX-1002, ...) — predictable (vuln).
let certificates = products.map((p, i) => ({
  id: i + 1,
  serial: 'HLX-' + (1001 + i),
  productId: p.id,
  productName: p.name,
  ownerId: null, // house/showcase certificate until sold
  ownerEmail: 'house@hexaluxury.local',
  issued: '2026-01-15',
}));
let nextCertId = certificates.length + 1;
let nextSerial = 1001 + certificates.length;

let orders = [
  { id: 1, userId: 2, items: [{ productId: 1, name: 'Aurum Chronograph 41mm', qty: 1, price: 18500 }], total: 16650, coupon: null, date: '2026-09-28' },
  { id: 2, userId: 2, items: [{ productId: 5, name: 'Riviera Sapphire Ring', qty: 1, price: 15200 }], total: 13680, coupon: 'LUXE10', date: '2026-10-05' },
  { id: 3, userId: 4, items: [{ productId: 3, name: 'Milano Crocodile Handbag', qty: 1, price: 9800 }], total: 9310, coupon: null, date: '2026-10-11' },
  { id: 4, userId: 5, items: [{ productId: 10, name: 'Meridian GMT Watch 40mm', qty: 1, price: 16900 }], total: 15210, coupon: null, date: '2026-10-14' },
  { id: 5, userId: 6, items: [{ productId: 9, name: 'Sovereign Gold Cufflinks', qty: 2, price: 3400 }], total: 6460, coupon: null, date: '2026-10-18' },
];
let nextOrderId = orders.length + 1;

let conciergeMessages = [
  { id: 1, name: 'Sofia Marchetti', email: 'sofia@hexaluxury.local', message: 'Could the concierge source a second Heritage Tourbillon for my husband?', date: '2026-10-20' },
];
let nextMsgId = 2;

const COUPONS = { LUXE10: 10, BIENVENUE15: 15 }; // no per-user usage tracking in the shop (vuln: unlimited reuse)
// Lab-system bookkeeping ONLY (used to DETECT coupon reuse, never to block it):
const couponUse = new Map([[2, new Set(['LUXE10'])]]); // user 2 already redeemed LUXE10 on seeded order #2
const loginFails = new Map();   // email -> consecutive failed login count (detection only; nothing ever throttles — that IS the flaw)
const verifyProbes = new Map(); // probe key -> [{serial, t}] (detection only)

const sessions = new Map(); // sid -> { userId, cart: [{productId, qty}] }
const uploads = new Map();  // filename -> { contentType, data: Buffer }

/* ====================== LAB SYSTEM — KEY SHARDS (A) ======================
   The lab keys are NEVER stored as plain literals. Each key exists only as
   encoded shards scattered through this file and assembled at runtime.     */

const _c1 = ['TC1YSA==', 'Ni02MA==', 'OFhENQ=='];
const _unshard = (s) => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('');

/* ====================== LAB SYSTEM — PROGRESS STATE ====================== */

const PROGRESS_PATH = path.join(__dirname, 'progress.json');
function loadProgress() {
  try {
    const j = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
    return { unlocked: !!j.unlocked, testerName: j.testerName || '', tests: j.tests || {}, attempts: j.attempts || {}, completedAt: j.completedAt || null, keyRevealed: !!j.keyRevealed };
  } catch { return { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false }; }
}
const P = loadProgress();
function saveProgress() { try { fs.writeFileSync(PROGRESS_PATH, JSON.stringify(P, null, 2)); } catch {} }
function doneCount() { return TESTS.filter((t) => P.tests[t.id]).length; }
function progressPct() { return TESTS.length ? Math.floor((doneCount() / TESTS.length) * 100) : 0; }
function isComplete() { return doneCount() >= TESTS.length; }
function afterProgressChange() {
  if (isComplete() && !P.completedAt) { P.completedAt = new Date().toISOString(); P.keyRevealed = true; }
  saveProgress();
}
function pass(id) { if (!P.tests[id]) { P.tests[id] = true; afterProgressChange(); } }
function attempt(feature) { P.attempts[feature] = (P.attempts[feature] || 0) + 1; saveProgress(); }
function featureStats() {
  const out = {};
  for (const t of TESTS) {
    out[t.feature] = out[t.feature] || { total: 0, done: 0, attempts: P.attempts[t.feature] || 0 };
    out[t.feature].total++;
    if (P.tests[t.id]) out[t.feature].done++;
  }
  return out;
}
const XSS_RE = /<\s*script|on\w+\s*=|<\s*svg|<\s*img|<\s*iframe|javascript:/i;

/* ====================== LAB SYSTEM — TESTS REGISTRY ====================== */

const TESTS = [
  /* ---------- Login & Authentication ---------- */
  { id: 'sqli-login', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03 Injection', difficulty: 'Intermediate',
    hints: ['The login still runs through a legacy query builder that concatenates strings.', "What happens if your email contains a quote, the word OR, and a comment marker?", "Try email: ' OR '1'='1' -- (trailing space) with any password."],
    lesson: 'String-built queries let attacker input change the query itself — the database ends up authenticating the attacker\'s logic instead of the user\'s credentials.',
    impact: 'On a real client store, this is instant account takeover — including the admin account — with no password at all. Every customer account, order and payment detail behind that login is exposed.',
    report: { title: 'SQL Injection in Authentication (Login Bypass)', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.' },
    howto: "Go to /login. In the Email field enter: ' OR '1'='1' -- (note the trailing space) and type anything as the password. The legacy query builder concatenates your input into the query, the WHERE clause becomes always-true, and you are logged in as the first account in the table — the admin. Variants that work: ' OR 1=1-- as the email, or admin@hexaluxury.local' -- with any password." },
  { id: 'brute-force', feature: 'Login & Authentication', name: 'No Brute-Force Protection on Login', owasp: 'A07 Authentication Failures', difficulty: 'Beginner',
    hints: ['How many wrong passwords can you try in a row?', 'Nothing slows down, locks, or challenges you — count to ten failures.', 'Script it: ten failed logins for kenji@hexaluxury.local.'],
    lesson: 'A login form without rate limiting or lockout is an open invitation to credential guessing — the only cost to the attacker is time.',
    impact: 'Attackers can grind through password lists against your clients\' accounts at full speed. Weak or reused passwords fall first, and luxury clients are high-value targets for exactly this.',
    report: { title: 'Missing Rate Limiting / Account Lockout on Login', severity: 'High', remediation: 'Throttle and progressively lock accounts after repeated failures; add CAPTCHA and alerting.' },
    howto: 'Pick a victim, e.g. kenji@hexaluxury.local. Submit 10 wrong passwords at /login (a curl loop or Burp Intruder is fastest). Nothing slows down, locks, or CAPTCHAs you — the 10th failure is processed exactly like the first, and the lab marks this test passed at that point. On a real store the attacker simply keeps going until the password falls.' },
  { id: 'user-enumeration', feature: 'Login & Authentication', name: 'Account Enumeration via Password Reset', owasp: 'A07 Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the forgot-password answer for a real email and an invented one.', 'The page answers the two cases very differently.', 'Try ghost@nowhere.local at /forgot.'],
    lesson: 'Different responses for "account exists" vs "no such account" hand attackers a free validator for email lists.',
    impact: 'An attacker can confirm exactly which of your customers hold accounts before phishing or credential-stuffing them — turning a generic spam list into a precision target list.',
    report: { title: 'User Enumeration via Forgot-Password Responses', severity: 'Medium', remediation: 'Return one identical, generic response whether or not the account exists.' },
    howto: 'Open /forgot and submit an email that does not exist, e.g. ghost@nowhere.local — the page plainly says no account exists for it. Submit lena@hexaluxury.local and the answer is completely different. That difference is the oracle: it validates any email address against the member registry.' },
  { id: 'reset-token', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07 Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a reset and study the token\'s structure.', 'It is built from two pieces of public information: who you are, and what day it is.', 'Token format: rst-<userId>-<dayOfMonth>. The admin is user id 1.'],
    lesson: 'A reset token is a bearer credential. If it is a guessable function of public data, the forgot-password flow becomes a master key.',
    impact: 'Anyone can reset any client\'s password — including the store admin\'s — without touching their inbox. That is full account takeover of the most privileged accounts you have.',
    report: { title: 'Predictable Password Reset Token', severity: 'Critical', remediation: 'Generate reset tokens from a CSPRNG (≥128 bits), store hashed, single-use, expiring within 30 minutes.' },
    howto: "Tokens are rst-<userId>-<dayOfMonth>. Register a throwaway account, or use the pattern directly: for user id N, today's token is rst-N-<today's day number> (e.g. rst-1-23 for the admin on the 23rd). POST that token with a new password to /reset — no access to any inbox is needed. User ids are sequential and the admin is id 1." },
  { id: 'cookie-role', feature: 'Login & Authentication', name: 'Role Tampering via Session Cookie', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Your identity travels in the hlx cookie. What format is it?', 'It decodes to JSON — and the server believes what it says about your role.', 'Decode (base64), change "role" to "admin", re-encode, open /admin.'],
    lesson: 'Identity and privilege must live server-side. Anything the client stores, the client can edit.',
    impact: 'Any registered customer can promote themselves to admin in under a minute: full access to orders, revenue, member data and the concierge inbox — the whole back office of the business.',
    report: { title: 'Client-Side Role Storage Allows Privilege Escalation', severity: 'Critical', remediation: 'Store only an opaque session id client-side; read role and tier from the server-side record on every request.' },
    howto: 'Log in normally and copy your hlx cookie. It is base64-encoded JSON: decode it, change "role":"customer" to "role":"admin", re-encode it, replace the cookie in your browser, and open /admin. The server reads your role from the cookie instead of from its own user records, so the dashboard and inbox open for you.' },
  { id: 'weak-password', feature: 'Login & Authentication', name: 'No Password Policy at Registration', owasp: 'A07 Authentication Failures', difficulty: 'Beginner',
    hints: ['What is the shortest password the register form accepts?', 'Try registering with a two-character password.', 'There is no length or complexity check at all.'],
    lesson: 'Password policy is set at the server, or it does not exist. Client-side hints and placeholder text enforce nothing.',
    impact: 'Clients end up with accounts protected by passwords like "ab" that fall to the first guessing attempt — and the business owns the breach that follows.',
    report: { title: 'Missing Password Complexity Policy', severity: 'Medium', remediation: 'Enforce a server-side password policy (length + breach-list screening) at registration and reset.' },
    howto: "Register a new account at /register with a password like 'ab'. It is accepted — there is no minimum length or complexity policy anywhere in the flow, so accounts can be created with trivially guessable passwords." },

  /* ---------- Search & Catalogue ---------- */
  { id: 'search-sqli', feature: 'Search & Catalogue', name: 'SQL Injection in Product Search', owasp: 'A03 Injection', difficulty: 'Intermediate',
    hints: ['The search filter is built by string concatenation, just like the old login.', "A classic tautology makes the filter always true.", "Search for: ' OR '1'='1 — then look at which pieces appear."],
    lesson: 'Injection is rarely just a login problem: any place user input is glued into a query becomes a data-exfiltration channel.',
    impact: 'On a real store this dumps the whole catalogue — and with UNION-style payloads, the tables behind it: customers, orders, credentials. Here it also breaks the Private Sale wall, leaking members-only inventory to the public.',
    report: { title: 'SQL Injection in Product Search', severity: 'High', remediation: 'Parameterise all queries; treat search input as data, never as query structure.' },
    howto: "Open /search and search for: ' OR '1'='1 — the search builds its filter by string concatenation, so the condition is always true and the result set becomes the entire catalogue, including the Private Sale pieces you are not entitled to see as a Member (or while logged out)." },
  { id: 'search-xss', feature: 'Search & Catalogue', name: 'Reflected XSS in Search', owasp: 'A03 Injection', difficulty: 'Beginner',
    hints: ['Your search term is echoed back onto the results page.', 'Is it echoed as text, or as HTML?', 'Search for an <img onerror> payload and view the page source.'],
    lesson: 'Reflected input must be output-encoded for the context it lands in — search pages are one of the most common XSS homes on the web.',
    impact: 'An attacker crafts a search link that runs script in a victim\'s browser when opened — session theft and actions performed as the victim, under your brand\'s own domain.',
    report: { title: 'Reflected Cross-Site Scripting in Search', severity: 'High', remediation: 'Contextually output-encode all reflected user input; deploy a restrictive Content-Security-Policy.' },
    howto: 'Search for <script>alert(1)</script> or <img src=x onerror=alert(1)> at /search. The term is reflected into the results page without any encoding, so the script executes in the browser of whoever runs — or is sent — that search link.' },
  { id: 'private-sale', feature: 'Search & Catalogue', name: 'Private-Sale Broken Access Control', owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    hints: ['The catalogue hides Private Sale pieces from you. Hiding is not checking.', 'Pieces have predictable numeric URLs.', 'Open /product/4 directly while logged in as Lena (or logged out).'],
    lesson: 'Access control must be enforced on the server for every object — a hidden link is not a control, it is a rumour.',
    impact: 'Members-only inventory — the entire point of the VIP programme — can be bought by anyone who guesses an ID. Exclusivity, waitlists and premium pricing collapse overnight.',
    report: { title: 'Missing Authorisation on Private-Sale Products', severity: 'High', remediation: 'Check membership on the server for the product page, add-to-cart and checkout; return 403 for non-VIP users.' },
    howto: 'As Lena (Member tier) or even logged out, open /product/4 directly — the Heritage Tourbillon — Private. The catalogue hides Private Sale pieces, but the product page and add-to-cart never check your tier. View it, add it, and check out like any other piece.' },

  /* ---------- VIP Membership ---------- */
  { id: 'tier-mass-assignment', feature: 'VIP Membership', name: 'VIP Tier Bypass via Mass Assignment', owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    hints: ['Your tier is shown on /profile in a field the team "sets".', 'Readonly in the browser is not readonly on the server.', 'Intercept POST /profile and add tier=Platinum.'],
    lesson: 'When a server blindly applies every posted field to a record, any field the developer forgot about becomes attacker-writable — including privilege fields.',
    impact: 'Every customer can self-upgrade to Platinum instantly: Private Sale access, top-tier discounts, and a VIP programme that is suddenly worthless — with the change looking legitimate in your own database.',
    report: { title: 'Mass Assignment Allows Membership Tier Escalation', severity: 'High', remediation: 'Whitelist user-editable fields server-side (name, email, phone only); tier/role change only via admin code paths.' },
    howto: "On /profile, your tier is a 'readonly' field — readonly is a browser courtesy, not a server rule. Intercept the POST /profile (Burp, or curl with your session cookie) and add tier=Platinum. The server applies every posted field to your user record and refreshes your session cookie: you are Platinum immediately — Private Sale visible, 10% tier pricing active." },
  { id: 'tier-discount', feature: 'VIP Membership', name: 'Tier-Price Manipulation (Client-Supplied Discount %)', owasp: 'A04 Insecure Design', difficulty: 'Intermediate',
    hints: ['At checkout, look at how your tier discount is submitted.', 'Your discount % travels as an editable form field.', 'Set tierDiscount to 95 at checkout.'],
    lesson: 'Entitlements — who gets which discount — are server-side facts. The moment the buyer\'s browser states the discount, the discount is whatever the buyer says it is.',
    impact: 'Near-free purchases that look like legitimate VIP transactions in the order book. Finance sees a valid order, a valid customer, and a margin that quietly evaporated.',
    report: { title: 'Client-Controlled Tier Discount Percentage', severity: 'High', remediation: 'Compute the discount server-side from the stored tier at checkout; remove the field from the form entirely.' },
    howto: "At /checkout, your tier discount % is an editable field (tierDiscount). Set it to 95 — Lena's real value is 0 — and place the order. The server applies the percentage you sent instead of computing it from your stored tier. It stacks with coupons and with tampered unit prices." },

  /* ---------- Cart & Checkout ---------- */
  { id: 'price-tamper', feature: 'Cart & Checkout', name: 'Price Tampering at Checkout', owasp: 'A04 Insecure Design', difficulty: 'Beginner',
    hints: ['Inspect the checkout form fields before submitting.', 'Unit prices are input fields, not facts.', 'Change price_0 from 18500 to 1 and place the order.'],
    lesson: 'Money values must be recomputed server-side from the catalogue at the moment of purchase. A price that travels through the client is a price the client chooses.',
    impact: 'A $64,000 tourbillon bought for $1. This is direct, trivial revenue theft — the single most expensive line item a pentest of an e-commerce client can find.',
    report: { title: 'Client-Side Price Tampering at Checkout', severity: 'Critical', remediation: 'Recompute all prices and totals server-side from the catalogue; accept only product ids and quantities from the client.' },
    howto: "Add any piece to the cart and go to /checkout. Each line's unit price is an input field (price_0, price_1, …). Change 18500 to 1 and place the order — the charged total is calculated from your numbers, not the catalogue's. Check the order page to confirm what you were charged." },
  { id: 'line-forgery', feature: 'Cart & Checkout', name: 'Checkout Line Forgery (Cart Never Verified)', owasp: 'A04 Insecure Design', difficulty: 'Intermediate',
    hints: ['The checkout posts pid and qty fields for each line.', 'Does the server ever compare them with your actual cart?', 'Put 1 item in the cart, then check out with qty_0=5 — or a pid that was never in the cart.'],
    lesson: 'Server-side state (your cart) and client-submitted state (the checkout form) are different things. Trusting the second while displaying the first is a forgery primitive.',
    impact: 'Attackers order quantities and items that were never in their cart — bypassing stock checks, purchase limits and per-customer restrictions that the business thinks it enforces.',
    report: { title: 'Checkout Trusts Client-Submitted Cart Contents', severity: 'High', remediation: 'Build the order exclusively from the server-side cart; ignore client-submitted product ids and quantities.' },
    howto: 'The checkout form posts pid_<i> and qty_<i> fields that the server trusts completely — it never compares them with your server-side cart. Put one item in your cart, then submit the checkout with qty_0=5 (or with a pid that was never in your cart at all). The order is created exactly as you posted it.' },
  { id: 'coupon-reuse', feature: 'Cart & Checkout', name: 'Coupon Reuse Without Limit', owasp: 'A04 Insecure Design', difficulty: 'Beginner',
    hints: ['What state does the server keep about who redeemed a code?', 'None. Use the same code on two different orders.', 'BIENVENUE15 twice, on two completed orders.'],
    lesson: 'A discount code is a stateful entitlement. Without a redemption ledger, "one-time" is just a hope written in the marketing copy.',
    impact: 'A leaked "one-time welcome" code becomes a permanent 10–15% margin leak across the entire store, stacking with every other discount — invisible until someone reconciles the margin.',
    report: { title: 'Unlimited Coupon Reuse (No Redemption Tracking)', severity: 'Medium', remediation: 'Keep a redemption ledger with per-user and global limits and expiry, enforced transactionally at checkout.' },
    howto: 'Coupons have no redemption ledger at all. Complete an order using BIENVENUE15 (or LUXE10), then use the same code again on a second order — it discounts again, in full, and would keep working forever, stacked on top of your tier discount.' },

  /* ---------- Orders & Certificates ---------- */
  { id: 'order-idor', feature: 'Orders & Certificates', name: 'Order IDOR', owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    hints: ['Orders live behind predictable numeric URLs.', 'My Account shows your orders — but the URL does not care whose they are.', 'As Lena, open /order/1.'],
    lesson: 'Authorise the object, not just the route. Being logged in proves who you are; it must never be treated as proof that a record is yours.',
    impact: 'The complete purchase history of your clientele leaks — who bought what, when, and for how much. For a luxury house, that list is both a privacy breach and a targeting list for thieves.',
    report: { title: 'Insecure Direct Object Reference on Orders', severity: 'High', remediation: 'Check order.userId against the session user (or admin role) on every read; prefer 404 over 403 to avoid confirming existence.' },
    howto: "Log in as Lena and open /order/1 — that is Arif's order, complete with his name, email, items and prices. Increment the id to read every order in the store. Nothing ever checks that the order belongs to the person asking." },
  { id: 'cert-idor', feature: 'Orders & Certificates', name: 'Certificate IDOR', owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    hints: ['Certificates live at /certificate/<id> with sequential ids.', 'Buying a piece issues a certificate to the buyer — ids keep counting up.', "Open another customer's certificate id while logged in as Lena."],
    lesson: 'Ownership records are sensitive data. Sequential ids plus a missing ownership check turn a registry into a public directory.',
    impact: 'Ownership records of high-value pieces leak — who owns which watch, which necklace, and their email address. That is a shopping list for burglars and a serious privacy breach for VIP clients.',
    report: { title: 'Insecure Direct Object Reference on Certificates', severity: 'High', remediation: 'Enforce cert.ownerId === session user (or admin) on every certificate read.' },
    howto: "Certificates are served from /certificate/<id> with sequential ids and no ownership check. When Arif buys a piece, a certificate is issued to him (see the ids counting up on his account page). While logged in as Lena, open that certificate's id — the page happily shows the piece and Arif's email, the registered owner." },
  { id: 'cert-forgery', feature: 'Orders & Certificates', name: 'Certificate Forgery — Format-Trusting Verifier', owasp: 'A04 Insecure Design', difficulty: 'Intermediate',
    hints: ['Look at a real serial\'s format on any product page.', 'What does /verify actually check — existence, or shape?', 'Verify a serial that was never issued, e.g. HLX-1742.'],
    lesson: 'Verification must be a registry lookup over unguessable identifiers. A verifier that trusts the format authenticates counterfeits with a straight face.',
    impact: 'Counterfeiters can "authenticate" fake goods with plausible serials that pass the brand\'s own verification page. The core trust promise of a luxury house — provenance — is broken.',
    report: { title: 'Certificate Verification Trusts Serial Format (Forgery)', severity: 'High', remediation: 'Issue unguessable serials (≥128-bit random) and verify existence + status in the registry; rate-limit verification.' },
    howto: 'Open /verify?cert=HLX-1742. That serial was never issued to anyone, but the verifier only checks the format — HLX- plus four digits in an accepted range — and proudly declares it GENUINE. Because serials are sequential, every valid-looking number is guessable.' },
  { id: 'cert-enumeration', feature: 'Orders & Certificates', name: 'Certificate Registry Enumeration', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Serials are sequential and /verify has no rate limit.', 'Probe several different serials in a row and watch the answers.', 'Five distinct serials within a minute is enough for this lab to call it enumeration.'],
    lesson: 'Sequential identifiers plus an unlimited public oracle equal a full registry dump — enumeration is a vulnerability class of its own, not a footnote.',
    impact: 'An attacker maps the entire certificate registry from their sofa: which serials exist, which pieces they belong to, and who owns them — reconnaissance for theft, fraud and targeted phishing.',
    report: { title: 'Unrestricted Enumeration of Certificate Serials', severity: 'Medium', remediation: 'Rate-limit and monitor verification; use unguessable serials so enumeration yields nothing.' },
    howto: 'The /verify page has no rate limit and serials are sequential. Probe five or more different serials in quick succession (HLX-1001, HLX-1002, …) and you can walk the whole registry — the lab detects and marks this once you have probed five distinct serials inside a minute.' },

  /* ---------- Profile & Settings ---------- */
  { id: 'csrf-profile', feature: 'Profile & Settings', name: 'CSRF on Profile Change', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['What is missing from the profile form that a bank\'s form would have?', 'The session cookie has no SameSite attribute, and forms can POST cross-origin.', 'For this lab, the state change must arrive carrying a cross-site Origin/Referer — like a real attack page sends.'],
    lesson: 'Same-origin policy stops sites reading each other\'s data — it does not stop them sending requests. State changes need a token the attacker\'s page cannot know.',
    impact: 'A victim who visits the wrong page while logged in gets their profile silently rewritten — and combined with mass assignment, their membership tier too. It is an account-tampering primitive that needs no password.',
    report: { title: 'Cross-Site Request Forgery on Profile Update', severity: 'High', remediation: 'Per-session anti-CSRF tokens on every state-changing form; SameSite=Lax/Strict on the session cookie.' },
    howto: 'There is no anti-CSRF token on POST /profile and the session cookie carries no SameSite attribute. Host a page on any other origin containing an auto-submitting form that POSTs to http://127.0.0.1:3013/profile (fields: name, email — even tier). When a logged-in victim opens your page, their profile changes silently. In this lab the detection fires when the profile change arrives with a cross-site Origin/Referer, exactly as a real attack sends it.' },
  { id: 'file-upload', feature: 'Profile & Settings', name: 'Unrestricted File Upload (Profile Photo)', owasp: 'A04 Insecure Design', difficulty: 'Intermediate',
    hints: ['The form says "photo". What does the server actually check about the file?', 'Try a file whose extension is not an image at all.', 'Upload x.html and then open /uploads/x.html.'],
    lesson: 'An upload is hostile until type, content and serving context are all pinned down. Serving user files as HTML on your own origin hands attackers your domain\'s trust.',
    impact: 'Attackers host phishing pages and script content under the brand\'s own domain — indistinguishable from the real store for victims, and a beachhead for stored XSS against customers and staff.',
    report: { title: 'Unrestricted File Upload of Dangerous Types', severity: 'High', remediation: 'Allowlist image types, verify content, re-encode, store under random names, and never serve uploads as HTML.' },
    howto: "At /profile, upload a file named x.html containing your own HTML/JS as your 'photo'. It is accepted with no type, size or content checks and is served back from /uploads/x.html as text/html — your page now lives on the store's own origin. A scripted SVG 'photo' works the same way." },

  /* ---------- Concierge ---------- */
  { id: 'concierge-xss', feature: 'Concierge', name: 'Stored XSS in Concierge Message', owasp: 'A03 Injection', difficulty: 'Intermediate',
    hints: ['Your message is stored, then read by someone powerful.', 'Compare how your name renders in My Account (escaped) with how inbox messages render.', 'Send <script>alert(document.cookie)</script> as a concierge message, then think about who opens /admin/inbox.'],
    lesson: 'Admin and support screens are the highest-value XSS targets in any business — the people reading them hold the keys. Output encoding matters most exactly there.',
    impact: 'The support channel becomes the attack vector against the house itself: script running in the admin\'s browser means session theft and actions performed as admin — from a simple contact form.',
    report: { title: 'Stored Cross-Site Scripting in Concierge Messages', severity: 'High', remediation: 'Output-encode all user content at render time in every view, including admin; add a restrictive CSP.' },
    howto: 'Send a concierge message whose text is <script>alert(document.cookie)</script> (an <img onerror> payload works too). The message is stored and later rendered UNESCAPED in the admin inbox at /admin/inbox, so the script fires in the admin\'s browser the moment they read their messages. The lab marks this passed when the payload is stored, because from that point delivery to the admin is guaranteed by the app\'s own design.' },

  /* ---------- Admin Panel ---------- */
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'CSRF on Admin Action (State-Changing GET)', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The concierge inbox has a delete action. Look at how it is triggered.', 'It is a plain GET link — no token, no confirmation.', 'An <img> tag on any page an admin views can fire it: /admin/inbox/delete?id=1.'],
    lesson: 'GET requests must never change state. Browsers preload, prefetch and embed images from everywhere — any of those can carry a state-changing URL into an admin\'s session.',
    impact: 'An attacker deletes the concierge evidence trail (or worse, in richer admin panels) simply by getting an admin to view a page containing an image tag. No click, no warning, no trace in the victim\'s own actions.',
    report: { title: 'State-Changing GET with No CSRF Protection (Admin Inbox Delete)', severity: 'Medium', remediation: 'Make deletions POST-only with an anti-CSRF token and a confirmation step.' },
    howto: 'The concierge inbox deletes messages through a plain GET link: /admin/inbox/delete?id=<id> — no token, no confirmation, no POST. Put <img src="http://127.0.0.1:3013/admin/inbox/delete?id=1"> on any page an admin views and the message is gone. The lab detects the deletion when it arrives without a same-site inbox Referer — precisely how the image-tag attack arrives.' },

  /* ---------- Platform & Data ---------- */
  { id: 'members-exposure', feature: 'Platform & Data', name: 'Excess Data Exposure — Full VIP Member List', owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    hints: ['Stores often expose helper APIs. Where might a "members" API live?', 'Try /api/members — in a private window, without logging in.', 'Names, emails, phones, tiers, lifetime spend: all of it, for everyone.'],
    lesson: 'Every endpoint needs an authentication decision and a data-minimisation pass. "Nobody knows about that URL" is not a security control.',
    impact: 'A ready-made spear-phishing and burglary target list of wealthy clients — names, emails, phone numbers and exactly how much each has spent — plus a reportable privacy breach.',
    report: { title: 'Unauthenticated Excessive Data Exposure via /api/members', severity: 'High', remediation: 'Require authentication and admin role; return only the fields the caller needs; remove the endpoint if unused.' },
    howto: 'Open /api/members without logging in at all. The endpoint returns every member\'s name, email, phone, role, tier and lifetime spend as JSON — the complete clientele, protected by nothing. The lab marks this passed the moment the endpoint is served.' },
];

/* ====================== LAB SYSTEM — KEY SHARDS (B) ====================== */

const _c2 = ['LUhGUw==', 'U0hYVw==', 'N0I3VQ=='];
const ENTRY_KEY_SHA256 = 'a8efe4887652ed000cfe716af5ade43c33a32e969534be92715b6b4f51e191f8';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */
function completionKey() { return _c1.concat(_c2).map(_unshard).join(''); }
function keyEq(a, b) { // fixed-work comparison, no partial hints
  let d = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}

/* ============================== HELPERS ============================== */

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

// VULN (by design): identity, ROLE and TIER are trusted straight from a base64 cookie.
// Anyone can decode, edit (e.g. role -> "admin") and re-encode it.
function currentUser(req) {
  const c = parseCookies(req);
  if (!c.hlx) return null;
  try {
    const sess = JSON.parse(Buffer.from(c.hlx, 'base64').toString('utf8'));
    const u = users.find((x) => x.id === sess.uid);
    if (!u) return null;
    return { ...u, role: sess.role, tier: sess.tier, sid: sess.sid };
  } catch { return null; }
}

function setSessionCookie(res, user) {
  let sid = null;
  for (const [k, v] of sessions) if (v.userId === user.id) { sid = k; break; }
  if (!sid) { sid = Math.random().toString(36).slice(2) + Date.now().toString(36); sessions.set(sid, { userId: user.id, cart: [] }); }
  const payload = Buffer.from(JSON.stringify({ uid: user.id, role: user.role, tier: user.tier, sid })).toString('base64');
  res.setHeader('Set-Cookie', `hlx=${payload}; Path=/; HttpOnly`);
  return sid;
}
function getSid(req, user) {
  if (user && user.sid && sessions.has(user.sid)) return user.sid;
  const sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
  sessions.set(sid, { userId: user ? user.id : null, cart: [] });
  return sid;
}
function cartOf(req, user) {
  const sid = getSid(req, user);
  return sessions.get(sid).cart;
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', () => resolve(Buffer.alloc(0)));
  });
}
function formBody(buf) {
  const out = {};
  for (const [k, v] of new URLSearchParams(buf.toString('utf8'))) out[k] = v;
  return out;
}

// Minimal multipart parser for the photo upload (lab-grade, intentionally permissive).
function parseMultipart(buf, contentType) {
  const m = /boundary=(.+)$/.exec(contentType || '');
  if (!m) return {};
  const boundary = Buffer.from('--' + m[1].trim());
  const parts = {};
  let start = 0;
  while (true) {
    const idx = buf.indexOf(boundary, start);
    if (idx < 0) break;
    let pStart = idx + boundary.length;
    if (buf[pStart] === 45 && buf[pStart + 1] === 45) break; // closing --
    if (buf[pStart] === 13 && buf[pStart + 1] === 10) pStart += 2;
    const headerEnd = buf.indexOf('\r\n\r\n', pStart);
    if (headerEnd < 0) break;
    const headers = buf.slice(pStart, headerEnd).toString('utf8');
    const next = buf.indexOf(boundary, headerEnd + 4);
    if (next < 0) break;
    let dataEnd = next - 2; // strip trailing CRLF
    const data = buf.slice(headerEnd + 4, dataEnd);
    const nameM = /name="([^"]+)"/.exec(headers);
    const fileM = /filename="([^"]*)"/.exec(headers);
    if (nameM) parts[nameM[1]] = { filename: fileM ? fileM[1] : null, data };
    start = next;
  }
  return parts;
}

/* ---------- Legacy query simulation (VULN: string-built "SQL") ----------
   The old login and the catalogue search glue user input into a query string
   and evaluate it naively — the classic injection pattern, simulated so the
   lab needs no database. Returns the matched user/product rows.           */
function evalAtom(atom, row) {
  const m = /^\s*([A-Za-z_][\w]*|'[^']*'|\d+)\s*=\s*('[^']*'|[A-Za-z_][\w]*|\d+)\s*$/.exec(atom);
  if (!m) return null;
  const val = (tok) => {
    if (tok.startsWith("'")) return tok.slice(1, -1);
    if (/^\d+$/.test(tok)) return Number(tok);
    return row[tok];
  };
  const a = val(m[1]), b = val(m[2]);
  if (a === undefined || b === undefined) return null;
  return String(a) === String(b);
}
function evalWhere(where, row) {
  const clean = String(where).split('--')[0].split('#')[0];
  for (const term of clean.split(/\s+OR\s+/i)) {
    let ok = true, valid = true;
    for (const atom of term.split(/\s+AND\s+/i)) {
      const r = evalAtom(atom, row);
      if (r === null) { valid = false; break; }
      if (!r) { ok = false; break; }
    }
    if (valid && ok) return true;
  }
  return false;
}
function legacyLogin(email, password) {
  const query = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`;
  const where = query.split(' WHERE ')[1];
  for (const row of users) { try { if (evalWhere(where, row)) return row; } catch { /* fall through */ } }
  return null;
}
function searchInjection(q) { return /'\s*or\s/i.test(q) || /'\s*or\s*'[^']*'\s*=\s*'[^']*'/i.test(q); }

let LOGO = null;
try { LOGO = fs.readFileSync(path.join(__dirname, 'logo.png')); } catch { LOGO = null; }

/* ============================== LAYOUT ============================== */

function chatWidget() {
  return `<div id="hxchat" style="position:fixed;right:18px;bottom:18px;z-index:60;font-family:inherit">
  <button id="hxchatBtn" style="border-radius:24px;padding:12px 18px;box-shadow:0 4px 18px rgba(0,0,0,.5)">💬 Lab Assistant</button>
  <div id="hxchatPanel" style="display:none;width:330px;max-width:92vw;height:430px;background:#171310;border:1px solid #d4af37;border-radius:10px;margin-bottom:10px;flex-direction:column;overflow:hidden">
    <div style="background:#14100b;color:#d4af37;padding:10px 14px;letter-spacing:1px;font-size:14px">HEXA LAB ASSISTANT — LAB ${LAB_NUMBER}</div>
    <div id="hxchatLog" style="flex:1;overflow-y:auto;padding:10px;font-size:13px;line-height:1.5"></div>
    <div style="display:flex;border-top:1px solid #3a2f1a">
      <input id="hxchatIn" placeholder="Ask about tests, features…" style="flex:1;border:0;margin:0;background:#0c0a08;color:#e9e2d0;padding:10px">
      <button id="hxchatSend" style="padding:10px 14px">Send</button>
    </div>
  </div></div>
<script>
(function(){
  var panel=document.getElementById('hxchatPanel'),log=document.getElementById('hxchatLog'),inp=document.getElementById('hxchatIn');
  function add(txt,me){var d=document.createElement('div');d.style.margin='6px 0';d.style.padding='8px 10px';d.style.borderRadius='8px';d.style.whiteSpace='pre-wrap';d.style.background=me?'#3a2f1a':'#0c0a08';d.style.border='1px solid #3a2f1a';d.textContent=txt;log.appendChild(d);log.scrollTop=log.scrollHeight;}
  document.getElementById('hxchatBtn').onclick=function(){panel.style.display=panel.style.display==='none'?'flex':'none';if(panel.style.display==='flex'&&!log.children.length)add('Hello — I am the HexaLuxury lab assistant. Ask me what tests exist, how many vulnerabilities a feature has, or how a test works (help for a feature unlocks after you have genuinely tried it 3 times).');};
  function send(){var v=inp.value.trim();if(!v)return;inp.value='';add(v,true);fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:v})}).then(function(r){return r.json();}).then(function(j){add(j.reply||'…');}).catch(function(){add('Assistant unreachable — is the lab still running?');});}
  document.getElementById('hxchatSend').onclick=send;
  inp.addEventListener('keydown',function(e){if(e.key==='Enter')send();});
})();
</script>`;
}

function layout(user, title, body) {
  const done = doneCount(), total = TESTS.length, pct = progressPct();
  const nav = user
    ? `<span class="who">${esc(user.name)} · ${esc(user.tier)}${user.role === 'admin' ? ' · ADMIN' : ''}</span>
       <a href="/account">My Account</a> <a href="/cart">Cart</a> <a href="/concierge">Concierge</a>
       ${user.role === 'admin' ? '<a href="/admin">Admin</a>' : ''} <a href="/logout">Logout</a>`
    : `<a href="/login">Login</a> <a href="/register">Register</a> <a href="/concierge">Concierge</a>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} — HexaLuxury</title>
<style>
  body{background:#0c0a08;color:#e9e2d0;font-family:Georgia,'Times New Roman',serif;margin:0}
  header{background:#14100b;border-bottom:1px solid #8a6d2f;padding:16px 28px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
  .brand{color:#d4af37;font-size:26px;letter-spacing:3px;text-decoration:none}
  nav a{color:#cdb872;margin-left:14px;text-decoration:none;font-size:14px;letter-spacing:1px}
  nav a:hover{color:#fff}.who{color:#9c8c60;font-size:13px}
  .labbar{background:#1d1710;border-bottom:1px solid #d4af37;padding:8px 28px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;font-size:13px;letter-spacing:1px}
  .labbar img{height:30px;width:30px;border-radius:6px}
  .labbar .bar{flex:1;min-width:140px;height:10px;background:#0c0a08;border:1px solid #55451f;border-radius:6px;overflow:hidden}
  .labbar .fill{height:100%;background:linear-gradient(90deg,#8a6d2f,#d4af37)}
  .labbar a{color:#d4af37}
  main{max-width:1060px;margin:0 auto;padding:28px 20px}
  h1,h2{color:#d4af37;font-weight:normal;letter-spacing:1px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px}
  .card{background:#171310;border:1px solid #3a2f1a;border-radius:8px;padding:18px}
  .card h3{margin:0 0 6px;color:#f0e6c8}.price{color:#d4af37;font-size:19px}
  .vip{border-color:#d4af37;box-shadow:0 0 12px rgba(212,175,55,.25)}
  .tag{display:inline-block;background:#8a6d2f;color:#0c0a08;padding:1px 8px;border-radius:10px;font-size:11px;letter-spacing:1px}
  .tag.vip{background:#d4af37}
  input,select,textarea{background:#0c0a08;border:1px solid #55451f;color:#e9e2d0;padding:8px;width:100%;box-sizing:border-box;margin:4px 0 12px;font-family:inherit}
  button,.btn{background:#d4af37;color:#0c0a08;border:0;padding:10px 18px;cursor:pointer;font-family:inherit;letter-spacing:1px;text-decoration:none;display:inline-block}
  button:hover,.btn:hover{background:#e8c95c}
  table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #33291a;padding:8px;text-align:left;font-size:14px}
  .muted{color:#9c8c60;font-size:13px}.cert{border:1px solid #d4af37;padding:22px;background:#12100c;text-align:center}
  .ok{color:#7ec97e}.bad{color:#e07a7a}a{color:#d4af37}
  .hintbox{margin:8px 0}.hintitem{background:#0c0a08;border-left:3px solid #d4af37;padding:6px 10px;margin:5px 0;font-size:13px}
  footer{text-align:center;color:#6d5f3d;padding:26px;font-size:12px;letter-spacing:1px}
</style></head><body>
<header><a class="brand" href="/">HEXA&nbsp;LUXURY</a><nav><a href="/search">Search</a>${nav}</nav></header>
<div class="labbar"><img src="/logo.png" alt="HexaCyberLab"><span>LAB ${LAB_NUMBER} — ${LAB_NAME}</span><span>${done}/${total} tests · ${pct}%</span><span class="bar"><span class="fill" style="display:block;width:${pct}%"></span></span><a href="/tests">Mission / Tests</a><a href="/complete">Completion</a></div>
<main>${body}</main>
<footer>HEXA LUXURY — PRACTICE LAB · INTENTIONALLY VULNERABLE · LOCAL ONLY · A HexaCyberLab lab by Md. Jony Hassain</footer>
${chatWidget()}
</body></html>`;
}
function send(res, code, html) { res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); }
function sendJson(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); }
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }

function gatePage(err) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Lab ${LAB_NUMBER} locked — HexaLuxury</title>
<style>body{background:#0c0a08;color:#e9e2d0;font-family:Georgia,serif;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center}
.card{background:#171310;border:1px solid #d4af37;border-radius:10px;padding:36px;max-width:520px;text-align:center}
h1{color:#d4af37;font-weight:normal;letter-spacing:2px}input{background:#0c0a08;border:1px solid #55451f;color:#e9e2d0;padding:10px;width:100%;box-sizing:border-box;margin:10px 0;font-family:inherit}
button{background:#d4af37;color:#0c0a08;border:0;padding:11px 22px;cursor:pointer;letter-spacing:1px;font-family:inherit}
.muted{color:#9c8c60;font-size:13px}.bad{color:#e07a7a}img{height:64px}</style></head><body>
<div class="card"><img src="/logo.png" alt="HexaCyberLab">
<h1>LAB ${LAB_NUMBER} — HEXA LUXURY</h1>
<p>🔒 This lab is locked.</p>
<p class="muted">Labs in this programme open in order. Paste the completion key from Lab ${LAB_NUMBER - 1} to start Lab ${LAB_NUMBER}.</p>
${err ? '<p class="bad">That key was not accepted. Check it and try again.</p>' : ''}
<form method="post" action="/unlock"><input name="key" placeholder="Completion key from Lab ${LAB_NUMBER - 1}" autocomplete="off"><button type="submit">Unlock Lab ${LAB_NUMBER}</button></form>
<p class="muted">A HexaCyberLab lab — built by Md. Jony Hassain, Founder of HexaCyberLab.</p></div>
</body></html>`;
}

/* ====================== SYSTEM PAGE RENDERERS ====================== */

function testsPage(user) {
  const stats = featureStats();
  const feats = [...new Set(TESTS.map((t) => t.feature))];
  const sections = feats.map((f) => {
    const rows = TESTS.filter((t) => t.feature === f).map((t) => {
      const done = !!P.tests[t.id];
      const hints = t.hints.map((h, i) => `<div class="hintitem" data-hint="${t.id}" style="display:none">💡 Hint ${i + 1}: ${esc(h)}</div>`).join('');
      return `<div class="card" style="margin-bottom:12px">
        <h3>${done ? '✓' : '○'} ${esc(t.name)} ${done ? '<span class="ok">(completed)</span>' : ''}</h3>
        <p class="muted">${esc(t.owasp)} · ${esc(t.difficulty)} · Feature attempts so far: ${P.attempts[f] || 0}
        ${done ? '' : ` · Assistant help for this feature ${((P.attempts[f] || 0) >= 3 || done) ? '<span class="ok">unlocked</span>' : 'unlocks after 3 attempts'}`}</p>
        <div class="hintbox"><button type="button" onclick="revealHint('${t.id}',this)">Show hint</button>${hints}</div>
      </div>`;
    }).join('');
    return `<h2>${esc(f)} — ${stats[f].done}/${stats[f].total} tests · ${stats[f].attempts} attempt(s)</h2>${rows}`;
  }).join('');
  return `<h1>Mission — Lab ${LAB_NUMBER} Tests</h1>
  <p class="muted">${doneCount()} of ${TESTS.length} tests completed (${progressPct()}%). Tests complete automatically when the exploit actually succeeds — there is no "mark done" button. Hints unlock one at a time. The Lab Assistant (bottom-right) explains a feature step-by-step only after you have genuinely tried that feature at least 3 times. Progress is saved and survives restarts.</p>
  ${sections}
  <script>function revealHint(id,btn){var items=document.querySelectorAll('[data-hint="'+id+'"]');for(var i=0;i<items.length;i++){if(items[i].style.display==='none'){items[i].style.display='block';if(i===items.length-1)btn.style.display='none';return;}}}</script>`;
}

function completePage(user) {
  if (!isComplete()) {
    const left = TESTS.filter((t) => !P.tests[t.id]);
    return `<h1>Completion — not yet</h1>
    <p>You have completed <b>${doneCount()} of ${TESTS.length}</b> tests (${progressPct()}%). The completion summary, your certificate and the key for Lab ${LAB_NUMBER + 1} appear here at 100%.</p>
    <h2>Still open (${left.length})</h2>
    ${left.map((t) => `<p>○ <b>${esc(t.name)}</b> <span class="muted">(${esc(t.feature)} · ${esc(t.difficulty)})</span></p>`).join('')}
    <p><a class="btn" href="/tests">Go to the Mission page</a></p>`;
  }
  const feats = [...new Set(TESTS.map((t) => t.feature))];
  const perFeature = feats.map((f) => { const ts = TESTS.filter((t) => t.feature === f); return `<tr><td>${esc(f)}</td><td>${ts.length}</td><td>${ts.map((t) => esc(t.name)).join('<br>')}</td></tr>`; }).join('');
  const lessons = TESTS.map((t) => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('');
  const impacts = TESTS.map((t) => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('');
  const reports = TESTS.map((t) => `<tr><td>${esc(t.report.title)}</td><td>${esc(t.report.severity)}</td><td>${esc(t.report.remediation)}</td></tr>`).join('');
  const name = P.testerName || (user ? user.name : '');
  return `<h1>🎉 Lab ${LAB_NUMBER} — 100% Complete</h1>
  <p class="ok">Every test in HexaLuxury has been passed. Here is what that means.</p>
  <h2>1 · The lab in numbers</h2>
  <p>This lab has <b>${feats.length} features</b> and <b>${TESTS.length} vulnerability tests</b>:</p>
  <table><tr><th>Feature</th><th>Vulnerabilities</th><th>Tests</th></tr>${perFeature}</table>
  <h2>2 · How the testing was done</h2>
  <p>${TESTS.length} distinct techniques were executed against the live application — one per test, each detected by the application itself when the exploit genuinely succeeded (injection, IDOR, tampering, forgery, enumeration, CSRF, upload abuse, stored/reflected XSS, exposure). The full technique list is the test list above; step-by-step write-ups live in <a href="/tests">the Mission page</a> assistant guidance and in VULNERABILITIES.md.</p>
  <h2>3 · What you learned</h2><ul>${lessons}</ul>
  <h2>4 · What this means for a real client</h2>
  <p>Had these exact flaws been found on a paying client's live store, this is the damage each one represents — and the harm the client is protected from once the findings are reported and fixed:</p><ul>${impacts}</ul>
  <h2>5 · Writing it in a real report</h2>
  <table><tr><th>Report title</th><th>Severity</th><th>Remediation</th></tr>${reports}</table>
  <h2>6 · Your key for Lab ${LAB_NUMBER + 1}</h2>
  <div class="cert"><p class="muted">Completion key — paste it at the start of Lab ${LAB_NUMBER + 1} to unlock it. Keep it safe.</p>
  <p style="font-size:24px;color:#d4af37;letter-spacing:2px">${esc(completionKey())}</p></div>
  <h2>Your certificate</h2>
  <form method="post" action="/complete/name"><label>Name for the certificate <input name="name" value="${esc(name)}" style="max-width:340px"></label>
  <button type="submit">Save name</button></form>
  <p><a class="btn" href="/certificate">View / print your certificate</a></p>`;
}

function certificatePage(user) {
  const name = P.testerName || (user ? user.name : 'HexaCyberLab Tester');
  const feats = new Set(TESTS.map((t) => t.feature)).size;
  const date = P.completedAt ? P.completedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
  return `<!doctype html><html><head><meta charset="utf-8"><title>Certificate — Lab ${LAB_NUMBER} HexaLuxury</title>
<style>body{background:#0c0a08;font-family:Georgia,serif;margin:0;padding:30px}
.card{max-width:760px;margin:20px auto;background:#12100c;border:2px solid #d4af37;border-radius:12px;padding:44px;text-align:center;color:#e9e2d0}
h1{color:#d4af37;font-weight:normal;letter-spacing:3px}.name{font-size:32px;color:#f0e6c8;margin:14px 0}
.muted{color:#9c8c60}img{height:84px}@media print{body{background:#fff}.noprint{display:none}}</style></head><body>
<div class="card"><img src="/logo.png" alt="HexaCyberLab logo">
<h1>CERTIFICATE OF COMPLETION</h1>
<p class="muted">This certifies that</p><p class="name">${esc(name)}</p>
<p>has completed <b>100%</b> of the security tests in</p>
<p style="font-size:22px;color:#d4af37">LAB ${LAB_NUMBER} — HEXA LUXURY</p>
<p class="muted">${TESTS.length} tests across ${feats} features · Completed ${esc(date)}</p>
<p style="margin-top:26px">HexaCyberLab — Built by <b>Md. Jony Hassain</b>, Founder</p></div>
<p class="noprint" style="text-align:center"><a href="/complete" style="color:#d4af37">← Back to completion summary</a> · Use your browser's Print to save as PDF</p>
</body></html>`;
}

/* ====================== LAB ASSISTANT (CHATBOT) ====================== */

function chatReply(raw) {
  const msg = String(raw || '').slice(0, 500);
  const t = msg.toLowerCase();
  const done = doneCount(), total = TESTS.length, pct = progressPct();
  const stats = featureStats();
  const feats = [...new Set(TESTS.map((x) => x.feature))];

  if (/(who (built|made|created|designed)|founder|jony|creator|author)/.test(t)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (t.includes('key')) {
    if (P.keyRevealed && isComplete()) return `You completed Lab ${LAB_NUMBER} at 100%, so I can share it now. The key for Lab ${LAB_NUMBER + 1} is: ${completionKey()} — paste it at that lab's start to unlock it.`;
    return `I don't have the completion key yet — it is only revealed (to you, and to me) when this lab reaches 100%. Right now you are at ${pct}% (${done}/${total} tests). Finish every test and the key will appear on the Completion page.`;
  }
  const matchedFeature = feats.find((f) => t.includes(f.toLowerCase())) || feats.find((f) => f.toLowerCase().split(' ')[0].length > 3 && t.includes(f.toLowerCase().split(' ')[0]));
  const matchedTest = TESTS.find((x) => t.includes(x.id.replace(/-/g, ' '))) ||
    TESTS.slice().sort((a, b) => b.name.length - a.name.length).find((x) => {
      const words = x.name.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter((w) => w.length >= 4);
      return words.length && words.filter((w) => t.includes(w)).length >= Math.min(2, words.length);
    });
  const howIntent = /(how|help|guide|step|exploit|bypass|hack|solve|pass|do i|does|work)/.test(t);

  if ((matchedTest || matchedFeature) && howIntent) {
    const f = matchedTest ? matchedTest.feature : matchedFeature;
    const tries = P.attempts[f] || 0;
    const unlocked = tries >= 3 || (matchedTest && P.tests[matchedTest.id]);
    if (!unlocked) {
      return `That feature is locked for help. First try the ${f} tests yourself at least 3 times — I can see you've tried ${tries} time(s) so far. After 3 real tries, ask me again and I'll guide you step by step. (The hints on the Mission page /tests are always available.)`;
    }
    if (matchedTest) return `**${matchedTest.name}** (${matchedTest.feature} · ${matchedTest.owasp} · ${matchedTest.difficulty})\n${matchedTest.howto}`;
    const list = TESTS.filter((x) => x.feature === f);
    return `Here is the step-by-step guidance for ${f} (you've tried it ${tries} times, so help is unlocked):\n\n` + list.map((x) => `**${x.name}**\n${x.howto}`).join('\n\n');
  }
  if (/(progress|status|score|percent|how am i|how far)/.test(t)) {
    const next = TESTS.find((x) => !P.tests[x.id]);
    return `Your progress: ${done} of ${total} tests completed (${pct}%).\n` + feats.map((f) => `• ${f}: ${stats[f].done}/${stats[f].total} tests · ${stats[f].attempts} attempt(s)`).join('\n') + (next ? `\nNext open test: ${next.name} (${next.feature}, ${next.difficulty}).` : '\nLab complete — see /complete for your summary, certificate and next-lab key.');
  }
  if (matchedFeature && /(how many|count|vulnerabilit|tests|list|which|what)/.test(t)) {
    const list = TESTS.filter((x) => x.feature === matchedFeature);
    return `${matchedFeature} has ${list.length} vulnerabilities/tests:\n` + list.map((x) => `• ${x.name} — ${x.owasp} (${x.difficulty})${P.tests[x.id] ? ' ✓ done' : ''}`).join('\n') + `\nAttempts on this feature so far: ${P.attempts[matchedFeature] || 0}. Ask me "how do I…" about it once you've tried it 3 times and I'll walk you through each one.`;
  }
  if (matchedTest && !howIntent) {
    return `${matchedTest.name}: ${matchedTest.owasp} · ${matchedTest.difficulty} · Feature: ${matchedTest.feature}. Status: ${P.tests[matchedTest.id] ? 'completed ✓' : 'not yet completed'}. Attempts on ${matchedTest.feature}: ${P.attempts[matchedTest.feature] || 0} (step-by-step help unlocks at 3).`;
  }
  if (/(how many|features|vulnerabilit|tests|list|map|overview)/.test(t)) {
    return `Lab ${LAB_NUMBER} — HexaLuxury has ${feats.length} features and ${total} vulnerability tests:\n` + feats.map((f) => `• ${f}: ${stats[f].total} tests`).join('\n') + `\nProgress: ${done}/${total} (${pct}%). The full map with hints is on /tests. I can explain any test by name, and give step-by-step help for a feature after you've tried it at least 3 times.`;
  }
  if (/(next|start|begin|what should)/.test(t)) {
    const next = TESTS.find((x) => !P.tests[x.id]);
    if (!next) return 'You have completed every test — open /complete for your summary, certificate and the Lab ' + (LAB_NUMBER + 1) + ' key.';
    return `Start with: ${next.name} (${next.feature} · ${next.difficulty}). Its hints are on /tests, and after 3 genuine attempts on ${next.feature} I'll guide you step by step.`;
  }
  if (/^(hi|hello|hey|hola)\b/.test(t)) {
    return `Hello! I'm the HexaLuxury lab assistant. This lab has ${total} tests across ${feats.length} features; you're at ${pct}%. Ask me what tests exist, how many vulnerabilities a feature has, or — after 3 genuine tries on a feature — how a test is done.`;
  }
  return `I can help with: the test map (ask "what features are there?"), counts per feature (ask "how many vulnerabilities in Cart & Checkout?"), your progress (ask "progress"), and step-by-step guidance for a feature once you've tried it at least 3 times (you've tried: ${feats.map((f) => `${f}: ${P.attempts[f] || 0}`).join(' · ')}). What would you like?`;
}

/* ============================== ROUTES ============================== */

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    const p = url.pathname;
    const buf = (req.method === 'POST') ? await readBody(req) : Buffer.alloc(0);
    const form = (req.method === 'POST' && (req.headers['content-type'] || '').includes('urlencoded')) ? formBody(buf) : {};
    const PM = (re) => { const m = re.exec(p); return m ? m[1] : null; };
    let id;

    /* ---------- logo (needed by the gate page too) ---------- */
    if (req.method === 'GET' && p === '/logo.png') {
      if (!LOGO) return send(res, 404, 'no logo');
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' });
      return res.end(LOGO);
    }

    /* ---------- progress API (state only; no app content) ---------- */
    if (req.method === 'GET' && p === '/api/progress') {
      return sendJson(res, 200, { lab: LAB_NAME, number: LAB_NUMBER, locked: !P.unlocked, total: TESTS.length, done: doneCount(), pct: progressPct(), features: featureStats(), complete: isComplete() });
    }

    /* ---------- LAB GATE (Labs 2–10 start locked) ---------- */
    if (!P.unlocked) {
      if (req.method === 'POST' && p === '/unlock') {
        let key = form.key || '';
        if (!key && buf.length) { try { key = JSON.parse(buf.toString('utf8')).key || ''; } catch {} }
        if (entryKeyMatches(String(key).trim())) { P.unlocked = true; saveProgress(); return redirect(res, '/'); }
        res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(gatePage(true));
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(gatePage(false));
    }

    const user = currentUser(req);

    /* ---------- lab system pages ---------- */
    if (req.method === 'GET' && p === '/tests') {
      return send(res, 200, layout(user, 'Mission — Tests', testsPage(user)));
    }
    if (req.method === 'GET' && p === '/complete') {
      return send(res, 200, layout(user, 'Completion', completePage(user)));
    }
    if (req.method === 'POST' && p === '/complete/name') {
      P.testerName = String(form.name || '').slice(0, 60);
      saveProgress();
      return redirect(res, '/complete');
    }
    if (req.method === 'GET' && p === '/certificate') {
      if (!isComplete()) return redirect(res, '/complete');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(certificatePage(user));
    }
    if (req.method === 'POST' && p === '/api/chat') {
      let message = form.message || '';
      if (!message && buf.length) { try { message = JSON.parse(buf.toString('utf8')).message || ''; } catch {} }
      return sendJson(res, 200, { reply: chatReply(message) });
    }

    /* ---------- public catalogue ---------- */
    if (req.method === 'GET' && p === '/') {
      const isVip = user && user.tier !== 'Member';
      const visible = products.filter((x) => !x.vipOnly || isVip);
      const cards = visible.map((x) => `
        <div class="card ${x.vipOnly ? 'vip' : ''}">
          <span class="tag">${esc(x.cat)}</span>${x.vipOnly ? ' <span class="tag vip">PRIVATE SALE</span>' : ''}
          <h3>${esc(x.name)}</h3><p class="muted">${esc(x.blurb)}</p>
          <p class="price">${money(x.price)}</p>
          <a class="btn" href="/product/${x.id}">View</a>
        </div>`).join('');
      return send(res, 200, layout(user, 'Collection', `
        <h1>The Collection</h1>
        <p class="muted">Authenticated luxury, certificated provenance. ${isVip ? 'Your ' + esc(user.tier) + ' membership unlocks the Private Sale collection and tier pricing.' : 'Gold and Platinum members see the Private Sale collection and tier pricing.'}</p>
        <form method="get" action="/search" style="max-width:420px"><label>Search the collection <input name="q" placeholder="e.g. watch"></label><button type="submit">Search</button></form>
        <div class="grid">${cards}</div>
        ${!isVip ? '<p class="muted" style="margin-top:18px">Private Sale pieces are reserved for VIP members.</p>' : ''}`));
    }

    /* ---------- search — VULN: string-built query (SQLi-style) + reflected XSS ---------- */
    if (req.method === 'GET' && p === '/search') {
      const q = url.searchParams.get('q') || '';
      const hasQ = url.searchParams.has('q');
      if (hasQ) attempt('Search & Catalogue');
      const isVip = user && user.tier !== 'Member';
      let results;
      if (hasQ && searchInjection(q)) {
        // the concatenated "query" condition becomes always-true → full catalogue, filters gone
        results = products.slice();
        if (results.some((x) => x.vipOnly) && !isVip) pass('search-sqli');
      } else {
        results = products.filter((x) => (x.name + ' ' + x.cat + ' ' + x.blurb).toLowerCase().includes(q.toLowerCase()));
        if (!isVip) results = results.filter((x) => !x.vipOnly);
      }
      if (hasQ && XSS_RE.test(q)) pass('search-xss'); // the term below is reflected unescaped — that IS the flaw firing
      const cards = results.map((x) => `
        <div class="card ${x.vipOnly ? 'vip' : ''}">
          <span class="tag">${esc(x.cat)}</span>${x.vipOnly ? ' <span class="tag vip">PRIVATE SALE</span>' : ''}
          <h3>${esc(x.name)}</h3><p class="muted">${esc(x.blurb)}</p>
          <p class="price">${money(x.price)}</p>
          <a class="btn" href="/product/${x.id}">View</a>
        </div>`).join('');
      return send(res, 200, layout(user, 'Search', `
        <h1>Search the Collection</h1>
        <form method="get" action="/search"><label>Search <input name="q" value="${esc(q)}"></label><button type="submit">Search</button></form>
        ${hasQ ? `<p class="muted">Results for: ${q}</p>` : ''}
        <div class="grid">${cards || '<p class="muted">No pieces match.</p>'}</div>`));
    }

    // VULN: private-sale broken access control — the listing hides VIP pieces,
    // but the product page (and add-to-cart) never check membership.
    if (req.method === 'GET' && (id = PM(/^\/product\/(\d+)$/))) {
      const prod = products.find((x) => x.id === Number(id));
      if (!prod) return send(res, 404, layout(user, 'Not found', '<h1>Not found</h1>'));
      attempt('Search & Catalogue');
      const isVip = user && user.tier !== 'Member';
      if (prod.vipOnly && !isVip) pass('private-sale'); // served to a non-VIP — the access-control failure itself
      const cert = certificates.find((c) => c.productId === prod.id && c.ownerId === null) || certificates.find((c) => c.productId === prod.id);
      return send(res, 200, layout(user, prod.name, `
        <span class="tag">${esc(prod.cat)}</span>${prod.vipOnly ? ' <span class="tag vip">PRIVATE SALE</span>' : ''}
        <h1>${esc(prod.name)}</h1><p>${esc(prod.blurb)}</p>
        <p class="price">${money(prod.price)}</p>
        ${cert ? `<p class="muted">Authenticity certificate: <b>${esc(cert.serial)}</b> — <a href="/verify?cert=${esc(cert.serial)}">verify</a> · <a href="/certificate/${cert.id}">view certificate</a></p>` : ''}
        <form method="post" action="/cart/add">
          <input type="hidden" name="productId" value="${prod.id}">
          <label>Quantity <input type="number" name="qty" value="1" min="1" style="width:90px"></label>
          <button type="submit">Add to Cart</button>
        </form>`));
    }

    /* ---------- auth ---------- */
    if (req.method === 'GET' && p === '/register') {
      return send(res, 200, layout(user, 'Register', `<h1>Join HexaLuxury</h1>
        <form method="post" action="/register">
          <label>Name <input name="name" required></label>
          <label>Email <input name="email" type="email" required></label>
          <label>Password <input name="password" type="password" required></label>
          <button type="submit">Create account</button></form>`));
    }
    if (req.method === 'POST' && p === '/register') {
      attempt('Login & Authentication');
      if (users.some((u) => u.email === form.email)) return send(res, 400, layout(user, 'Register', '<p class="bad">Email already registered.</p>'));
      if (String(form.password || '').length <= 3) pass('weak-password'); // VULN detection: no password policy at all
      const nu = { id: nextUserId++, name: form.name || 'Guest', email: form.email, password: form.password, role: 'customer', tier: 'Member', phone: '', photo: null };
      users.push(nu); setSessionCookie(res, nu);
      return redirect(res, '/account');
    }
    if (req.method === 'GET' && p === '/login') {
      return send(res, 200, layout(user, 'Login', `<h1>Welcome back</h1>
        <form method="post" action="/login">
          <label>Email <input name="email" type="email" required></label>
          <label>Password <input name="password" type="password" required></label>
          <button type="submit">Login</button></form>
        <p class="muted"><a href="/forgot">Forgot your password?</a></p>`));
    }
    if (req.method === 'POST' && p === '/login') {
      attempt('Login & Authentication');
      const direct = users.find((x) => x.email === form.email && x.password === form.password);
      const u = direct || legacyLogin(form.email || '', form.password || '');
      if (!u) {
        const n = (loginFails.get(form.email) || 0) + 1;
        loginFails.set(form.email, n);
        if (n >= 10) pass('brute-force'); // the 10th failure is still processed — nothing throttles, ever
        return send(res, 401, layout(user, 'Login', '<p class="bad">Invalid email or password.</p>'));
      }
      if (!direct) pass('sqli-login'); // authenticated although the real password check failed → injection bypass
      loginFails.delete(form.email);
      setSessionCookie(res, u);
      return redirect(res, '/account');
    }
    if (req.method === 'GET' && p === '/logout') {
      res.setHeader('Set-Cookie', 'hlx=; Path=/; Max-Age=0');
      return redirect(res, '/');
    }

    /* ---------- password reset — VULN: predictable token + enumeration ---------- */
    if (req.method === 'GET' && p === '/forgot') {
      return send(res, 200, layout(user, 'Forgot password', `<h1>Reset your password</h1>
        <form method="post" action="/forgot"><label>Email <input name="email" type="email" required></label>
        <button type="submit">Send reset link</button></form>`));
    }
    if (req.method === 'POST' && p === '/forgot') {
      attempt('Login & Authentication');
      const u = users.find((x) => x.email === form.email);
      if (!u) { // VULN: the response reveals that the account does not exist (enumeration oracle)
        pass('user-enumeration');
        return send(res, 200, layout(user, 'Forgot password', '<p class="bad">No account exists for that email address.</p>'));
      }
      // VULN: token is a trivial function of the user id and the day of the month.
      const token = `rst-${u.id}-${new Date().getDate()}`;
      return send(res, 200, layout(user, 'Forgot password', `<p>A reset link has been sent to ${esc(u.email)}.</p>
        <p class="muted">(Lab shortcut — in a real breach this link is what the attacker forges: <a href="/reset?token=${token}">/reset?token=${token}</a>)</p>`));
    }
    if (req.method === 'GET' && p === '/reset') {
      return send(res, 200, layout(user, 'Reset password', `<h1>Choose a new password</h1>
        <form method="post" action="/reset">
          <input type="hidden" name="token" value="${esc(url.searchParams.get('token') || '')}">
          <label>New password <input name="password" type="password" required></label>
          <button type="submit">Reset password</button></form>`));
    }
    if (req.method === 'POST' && p === '/reset') {
      attempt('Login & Authentication');
      const m = /^rst-(\d+)-\d+$/.exec(form.token || '');
      const u = m && users.find((x) => x.id === Number(m[1]));
      if (!u) return send(res, 400, layout(user, 'Reset', '<p class="bad">Invalid or expired token.</p>'));
      u.password = form.password;
      pass('reset-token'); // a token anyone can compute from public data just reset a password
      return send(res, 200, layout(user, 'Reset', '<p class="ok">Password changed. <a href="/login">Login</a></p>'));
    }

    /* ---------- cart & checkout ---------- */
    if (req.method === 'POST' && p === '/cart/add') {
      if (!user) return redirect(res, '/login');
      attempt('Cart & Checkout');
      const prod = products.find((x) => x.id === Number(form.productId));
      if (prod) { // VULN: no vipOnly check here either — non-VIP can buy Private Sale pieces.
        const cart = cartOf(req, user);
        const line = cart.find((l) => l.productId === prod.id);
        const qty = Math.max(1, parseInt(form.qty, 10) || 1);
        if (line) line.qty += qty; else cart.push({ productId: prod.id, qty });
      }
      return redirect(res, '/cart');
    }
    if (req.method === 'GET' && p === '/cart') {
      if (!user) return redirect(res, '/login');
      const cart = cartOf(req, user);
      const rows = cart.map((l) => { const pr = products.find((x) => x.id === l.productId); return pr ? `<tr><td>${esc(pr.name)}</td><td>${l.qty}</td><td>${money(pr.price * l.qty)}</td></tr>` : ''; }).join('');
      return send(res, 200, layout(user, 'Cart', `<h1>Your Cart</h1>
        ${cart.length ? `<table><tr><th>Piece</th><th>Qty</th><th>Subtotal</th></tr>${rows}</table>
        <p style="margin-top:16px"><a class="btn" href="/checkout">Proceed to Checkout</a></p>` : '<p class="muted">Your cart is empty.</p>'}`));
    }
    if (req.method === 'GET' && p === '/checkout') {
      if (!user) return redirect(res, '/login');
      const cart = cartOf(req, user);
      if (!cart.length) return redirect(res, '/cart');
      // VULN: unit prices and the tier-discount % are rendered as editable (hidden) fields
      // and the server trusts whatever comes back — price tampering + tier manipulation.
      const rows = cart.map((l, i) => { const pr = products.find((x) => x.id === l.productId); return `
        <tr><td>${esc(pr.name)} × ${l.qty}
          <input type="hidden" name="pid_${i}" value="${pr.id}">
          <input type="hidden" name="qty_${i}" value="${l.qty}"></td>
        <td><input name="price_${i}" value="${pr.price}" style="width:110px"></td></tr>`; }).join('');
      return send(res, 200, layout(user, 'Checkout', `<h1>Checkout</h1>
        <form method="post" action="/checkout">
        <table><tr><th>Piece</th><th>Unit price (USD)</th></tr>${rows}</table>
        <input type="hidden" name="lines" value="${cart.length}">
        <label>Coupon code <input name="coupon" placeholder="LUXE10"></label>
        <label>Your tier discount % <input name="tierDiscount" value="${TIER_DISCOUNT[user.tier] || 0}" style="width:90px"></label>
        <p class="muted">Tier pricing is applied from the value above.</p>
        <button type="submit">Place Order</button></form>`));
    }
    if (req.method === 'POST' && p === '/checkout') {
      if (!user) return redirect(res, '/login');
      const cart = cartOf(req, user);
      if (!cart.length) return redirect(res, '/cart');
      attempt('Cart & Checkout');
      if (form.tierDiscount !== undefined) attempt('VIP Membership');
      const dbUser = users.find((x) => x.id === user.id);
      const cartSnapshot = cart.map((l) => ({ ...l }));
      const n = parseInt(form.lines, 10) || 0;
      const items = [];
      let subtotal = 0;
      let forged = false, priceTampered = false;
      for (let i = 0; i < n; i++) {
        const pr = products.find((x) => x.id === Number(form[`pid_${i}`]));
        if (!pr) continue;
        const qty = Math.max(1, parseInt(form[`qty_${i}`], 10) || 1);
        const price = parseFloat(form[`price_${i}`]); // VULN: client-supplied price trusted
        const unit = Number.isFinite(price) ? price : pr.price;
        const cartLine = cartSnapshot.find((l) => l.productId === pr.id);
        if (!cartLine || cartLine.qty !== qty) forged = true;      // posted lines were never checked against the cart
        if (unit !== pr.price) priceTampered = true;               // accepted price differs from the catalogue truth
        items.push({ productId: pr.id, name: pr.name, qty, price: unit });
        subtotal += unit * qty;
      }
      if (priceTampered) pass('price-tamper');
      if (forged) pass('line-forgery');
      const tierPct = Math.min(100, Math.max(0, parseFloat(form.tierDiscount) || 0)); // VULN: client-supplied tier % trusted
      if (Number.isFinite(parseFloat(form.tierDiscount)) && tierPct !== (TIER_DISCOUNT[dbUser.tier] || 0)) pass('tier-discount');
      let total = subtotal * (1 - tierPct / 100);
      const coupon = (form.coupon || '').trim().toUpperCase();
      if (coupon && COUPONS[coupon]) {
        // VULN: same code reusable forever, stacks — the ledger below only DETECTS reuse for the lab system; it never blocks it.
        const used = couponUse.get(user.id) || new Set();
        if (used.has(coupon)) pass('coupon-reuse');
        used.add(coupon); couponUse.set(user.id, used);
        total = total * (1 - COUPONS[coupon] / 100);
      }
      total = Math.max(0, Math.round(total * 100) / 100);
      const order = { id: nextOrderId++, userId: user.id, items, total, coupon: coupon || null, date: new Date().toISOString().slice(0, 10) };
      orders.push(order);
      // issue authenticity certificates for purchased pieces (sequential serials)
      for (const it of items) {
        certificates.push({ id: nextCertId++, serial: 'HLX-' + (nextSerial++), productId: it.productId, productName: it.name, ownerId: user.id, ownerEmail: user.email, issued: order.date });
      }
      cart.length = 0;
      return redirect(res, '/order/' + order.id);
    }

    /* ---------- account, orders, certificates ---------- */
    if (req.method === 'GET' && p === '/account') {
      if (!user) return redirect(res, '/login');
      const mine = orders.filter((o) => o.userId === user.id);
      const myCerts = certificates.filter((c) => c.ownerId === user.id);
      return send(res, 200, layout(user, 'My Account', `<h1>My Account</h1>
        <p>${esc(user.name)} — <b>${esc(user.tier)}</b> member · ${esc(user.email)}</p>
        <p><a href="/profile">Profile &amp; settings</a></p>
        <h2>My Orders</h2>
        ${mine.length ? `<table><tr><th>#</th><th>Date</th><th>Total</th><th></th></tr>${mine.map((o) => `<tr><td>${o.id}</td><td>${o.date}</td><td>${money(o.total)}</td><td><a href="/order/${o.id}">view</a></td></tr>`).join('')}</table>` : '<p class="muted">No orders yet.</p>'}
        <h2>My Certificates</h2>
        ${myCerts.length ? `<table><tr><th>Serial</th><th>Piece</th><th></th></tr>${myCerts.map((c) => `<tr><td>${esc(c.serial)}</td><td>${esc(c.productName)}</td><td><a href="/certificate/${c.id}">view</a></td></tr>`).join('')}</table>` : '<p class="muted">No certificates yet — they are issued with each purchase.</p>'}`));
    }
    // VULN: order IDOR — no ownership check.
    if (req.method === 'GET' && (id = PM(/^\/order\/(\d+)$/))) {
      if (!user) return redirect(res, '/login');
      attempt('Orders & Certificates');
      const o = orders.find((x) => x.id === Number(id));
      if (!o) return send(res, 404, layout(user, 'Order', '<h1>Order not found</h1>'));
      if (o.userId !== user.id) pass('order-idor'); // someone else's order was just served
      const buyer = users.find((u) => u.id === o.userId);
      return send(res, 200, layout(user, 'Order ' + o.id, `<h1>Order #${o.id}</h1>
        <p class="muted">Placed ${o.date} by ${esc(buyer ? buyer.name : '')} (${esc(buyer ? buyer.email : '')})${o.coupon ? ' · coupon ' + esc(o.coupon) : ''}</p>
        <table><tr><th>Piece</th><th>Qty</th><th>Unit</th></tr>
        ${o.items.map((i) => `<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td>${money(i.price)}</td></tr>`).join('')}</table>
        <p class="price">Total: ${money(o.total)}</p>`));
    }
    // VULN: certificate IDOR — any logged-in user can view any certificate by numeric id.
    if (req.method === 'GET' && (id = PM(/^\/certificate\/(\d+)$/))) {
      if (!user) return redirect(res, '/login');
      attempt('Orders & Certificates');
      const c = certificates.find((x) => x.id === Number(id));
      if (!c) return send(res, 404, layout(user, 'Certificate', '<h1>Certificate not found</h1>'));
      if (c.ownerId && c.ownerId !== user.id) pass('cert-idor'); // another customer's ownership record was just served
      return send(res, 200, layout(user, 'Certificate ' + c.serial, `
        <div class="cert"><h1>Certificate of Authenticity</h1>
        <p style="font-size:22px;color:#d4af37">${esc(c.serial)}</p>
        <p>${esc(c.productName)}</p>
        <p class="muted">Issued ${esc(c.issued)} to ${esc(c.ownerEmail)}</p>
        <p class="muted">HexaLuxury Atelier — Geneva · Florence · Dhaka</p></div>
        <p style="text-align:center"><a href="/verify?cert=${esc(c.serial)}">Verify this certificate</a></p>`));
    }
    // VULN: certificate forgery — the verifier trusts the serial FORMAT, not the registry:
    // any well-formed HLX-#### serial in range is declared GENUINE, issued or not.
    if (req.method === 'GET' && p === '/verify') {
      const serial = (url.searchParams.get('cert') || '').trim().toUpperCase();
      let result = '';
      if (serial) {
        attempt('Orders & Certificates');
        // enumeration watch (detection only): ≥5 distinct serials probed inside a minute
        const probeKey = user ? 'u' + user.id : 'ip' + (req.socket.remoteAddress || '');
        const now = Date.now();
        const list = (verifyProbes.get(probeKey) || []).filter((e) => now - e.t < 60000);
        list.push({ serial, t: now });
        verifyProbes.set(probeKey, list);
        if (new Set(list.map((e) => e.serial)).size >= 5) pass('cert-enumeration');
        const m = /^HLX-(\d{4})$/.exec(serial);
        const real = certificates.find((c) => c.serial === serial);
        if (m && Number(m[1]) >= 1000 && Number(m[1]) <= 2999) {
          if (!real) pass('cert-forgery'); // an unissued serial was just declared genuine
          result = `<div class="cert"><p class="ok" style="font-size:22px">✔ GENUINE</p>
            <p>Certificate <b>${esc(serial)}</b> is authentic.</p>
            <p class="muted">${real ? esc(real.productName) + ' — issued to ' + esc(real.ownerEmail) : 'HexaLuxury authenticated piece (registry match)'}</p></div>`;
        } else {
          result = '<p class="bad">✘ This serial is not recognised as a HexaLuxury certificate.</p>';
        }
      }
      return send(res, 200, layout(user, 'Verify certificate', `<h1>Verify Authenticity</h1>
        <form method="get" action="/verify"><label>Certificate serial <input name="cert" value="${esc(serial)}" placeholder="HLX-1001"></label>
        <button type="submit">Verify</button></form>${result}`));
    }

    /* ---------- profile — VULN: mass assignment + no CSRF ---------- */
    if (req.method === 'GET' && p === '/profile') {
      if (!user) return redirect(res, '/login');
      return send(res, 200, layout(user, 'Profile', `<h1>Profile &amp; Settings</h1>
        ${user.photo ? `<p class="muted">Profile photo: <a href="${esc(user.photo)}">${esc(user.photo)}</a></p>` : ''}
        <form method="post" action="/profile">
          <label>Name <input name="name" value="${esc(user.name)}"></label>
          <label>Email <input name="email" value="${esc(user.email)}"></label>
          <label>Phone <input name="phone" value="${esc(user.phone || '')}"></label>
          <label>Membership tier (set by our team) <input name="tier" value="${esc(user.tier)}" readonly></label>
          <button type="submit">Save changes</button></form>
        <h2>Profile photo</h2>
        <form method="post" action="/profile/photo" enctype="multipart/form-data">
          <input type="file" name="photo"><button type="submit">Upload photo</button></form>
        <p class="muted">Note: this form intentionally carries no anti-CSRF token.</p>`));
    }
    if (req.method === 'POST' && p === '/profile') {
      if (!user) return redirect(res, '/login');
      attempt('Profile & Settings');
      if (form.tier !== undefined) attempt('VIP Membership');
      // CSRF detection: the state change arrived carrying a cross-site Origin/Referer — as a real attack sends it.
      const originHost = (req.headers.origin || req.headers.referer || '').replace(/^https?:\/\//, '').split('/')[0];
      if (originHost && originHost !== req.headers.host) pass('csrf-profile');
      const u = users.find((x) => x.id === user.id);
      const tierBefore = u.tier;
      // VULN: mass assignment — every posted field is applied, including tier (and role).
      for (const k of ['name', 'email', 'phone', 'tier', 'role']) {
        if (form[k] !== undefined && form[k] !== '') u[k] = form[k];
      }
      if (u.tier !== tierBefore) pass('tier-mass-assignment'); // the client just rewrote their own membership tier
      setSessionCookie(res, u); // refresh cookie so the new tier/role take effect
      return redirect(res, '/profile');
    }
    // VULN: unrestricted file upload — any file type accepted, stored and served back as-is.
    if (req.method === 'POST' && p === '/profile/photo') {
      if (!user) return redirect(res, '/login');
      attempt('Profile & Settings');
      const parts = parseMultipart(buf, req.headers['content-type']);
      const file = parts.photo;
      if (!file || !file.filename) return send(res, 400, layout(user, 'Upload', '<p class="bad">No file received.</p>'));
      const safeName = file.filename.replace(/[^A-Za-z0-9._-]/g, '_');
      const ext = (path.extname(safeName) || '').toLowerCase();
      const ct = ext === '.html' || ext === '.htm' ? 'text/html'
        : ext === '.svg' ? 'image/svg+xml'
        : ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream';
      if (!['.png', '.jpg', '.jpeg', '.gif'].includes(ext)) pass('file-upload'); // a dangerous/non-image type was accepted & stored
      uploads.set(safeName, { contentType: ct, data: file.data });
      const u = users.find((x) => x.id === user.id);
      u.photo = '/uploads/' + safeName;
      return redirect(res, '/profile');
    }
    if (req.method === 'GET' && p.startsWith('/uploads/')) {
      const name = decodeURIComponent(p.slice('/uploads/'.length));
      const f = uploads.get(name);
      if (!f) return send(res, 404, layout(user, 'Not found', '<h1>Not found</h1>'));
      res.writeHead(200, { 'Content-Type': f.contentType });
      return res.end(f.data);
    }

    /* ---------- concierge — VULN: stored XSS (rendered raw in the admin inbox) ---------- */
    if (req.method === 'GET' && p === '/concierge') {
      return send(res, 200, layout(user, 'Concierge', `<h1>Private Concierge</h1>
        <p class="muted">Our concierge replies within one business day.</p>
        <form method="post" action="/concierge">
          <label>Name <input name="name" value="${user ? esc(user.name) : ''}"></label>
          <label>Email <input name="email" value="${user ? esc(user.email) : ''}"></label>
          <label>Message <textarea name="message" rows="4"></textarea></label>
          <button type="submit">Send message</button></form>`));
    }
    if (req.method === 'POST' && p === '/concierge') {
      attempt('Concierge');
      if (XSS_RE.test(form.message || '') || XSS_RE.test(form.name || '')) pass('concierge-xss'); // payload stored → delivery to the admin inbox is by design
      conciergeMessages.push({ id: nextMsgId++, name: form.name || '', email: form.email || '', message: form.message || '', date: new Date().toISOString().slice(0, 10) });
      return send(res, 200, layout(user, 'Concierge', '<p class="ok">Thank you — your message is with our concierge.</p>'));
    }

    /* ---------- VULN: excess data exposure — full VIP member list, no auth ---------- */
    if (req.method === 'GET' && p === '/api/members') {
      attempt('Platform & Data');
      pass('members-exposure'); // the full clientele was just served, no questions asked
      const data = users.map((u) => ({
        id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, tier: u.tier,
        totalSpend: orders.filter((o) => o.userId === u.id).reduce((s, o) => s + o.total, 0),
      }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(data, null, 2));
    }

    /* ---------- admin ---------- */
    if (req.method === 'GET' && p === '/admin') {
      if (!user || user.role !== 'admin') return send(res, 403, layout(user, 'Admin', '<h1>403 — Admins only</h1>'));
      const dbSelf = users.find((x) => x.id === user.id);
      if (dbSelf && dbSelf.role !== 'admin') pass('cookie-role'); // the COOKIE says admin; the database disagrees
      const revenue = orders.reduce((s, o) => s + o.total, 0);
      return send(res, 200, layout(user, 'Admin', `<h1>Admin Dashboard</h1>
        <p>Members: ${users.length} · Orders: ${orders.length} · Revenue: ${money(revenue)}</p>
        <p><a href="/admin/inbox">Concierge inbox (${conciergeMessages.length})</a> · <a href="/api/members">Member data (JSON)</a></p>
        <h2>Recent orders</h2>
        <table><tr><th>#</th><th>Buyer</th><th>Total</th></tr>
        ${orders.map((o) => { const b = users.find((x) => x.id === o.userId); return `<tr><td>${o.id}</td><td>${esc(b ? b.email : '')}</td><td>${money(o.total)}</td></tr>`; }).join('')}</table>`));
    }
    if (req.method === 'GET' && p === '/admin/inbox') {
      if (!user || user.role !== 'admin') return send(res, 403, layout(user, 'Inbox', '<h1>403 — Admins only</h1>'));
      const dbSelf = users.find((x) => x.id === user.id);
      if (dbSelf && dbSelf.role !== 'admin') pass('cookie-role');
      // VULN: messages rendered UNESCAPED — stored XSS fires in the admin's browser.
      const rows = conciergeMessages.map((m) => `<div class="card"><b>${m.name}</b> <span class="muted">${m.email} · ${m.date}</span> <a href="/admin/inbox/delete?id=${m.id}" class="muted">[delete]</a><p>${m.message}</p></div>`).join('');
      return send(res, 200, layout(user, 'Concierge inbox', `<h1>Concierge Inbox</h1>${rows}`));
    }
    // VULN: state-changing GET with no token — an <img> on any page an admin views deletes a message (admin CSRF).
    if (req.method === 'GET' && p === '/admin/inbox/delete') {
      if (!user || user.role !== 'admin') return send(res, 403, layout(user, 'Inbox', '<h1>403 — Admins only</h1>'));
      attempt('Admin Panel');
      const mid = Number(url.searchParams.get('id'));
      const before = conciergeMessages.length;
      conciergeMessages = conciergeMessages.filter((m) => m.id !== mid);
      const referer = req.headers.referer || '';
      if (conciergeMessages.length !== before && !referer.includes('/admin/inbox')) pass('admin-csrf'); // deleted without arriving from the inbox itself
      return redirect(res, '/admin/inbox');
    }

    return send(res, 404, layout(user, 'Not found', '<h1>404 — Page not found</h1>'));
  } catch (err) {
    // Stay stable on bad input: log and return a plain 500, never crash.
    console.error('Request error:', err && err.message);
    try { send(res, 500, '<h1>Something went wrong</h1>'); } catch {}
  }
});

server.listen(PORT, HOST, () => {
  console.log(`HexaLuxury (INTENTIONALLY VULNERABLE lab) listening on http://${HOST}:${PORT}`);
});
