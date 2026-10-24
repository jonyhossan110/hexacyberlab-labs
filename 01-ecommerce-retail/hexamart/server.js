#!/usr/bin/env node
/*
 * HexaMart — Intentionally Vulnerable Supermarket Practice Lab (LAB 4)
 * ------------------------------------------------------------------
 * WARNING: This application is DELIBERATELY INSECURE. It exists for
 * local, authorised security practice only. Bind: 127.0.0.1 only.
 * Zero dependencies: Node.js built-ins only. Business data is
 * in-memory (restart resets the shop); LAB PROGRESS persists in
 * progress.json so a tester can leave and resume where they stopped.
 *
 * Lab system (HexaCyberLab): numbered lab with a sequential unlock
 * gate, a TESTS registry with server-side detection, per-feature
 * attempt tracking, hints, an in-lab assistant whose step-by-step
 * help unlocks after 3 genuine attempts per feature, a completion
 * summary, a certificate, and a completion key for the next lab.
 * Keys are stored ONLY as encoded shards scattered through this
 * file and assembled at runtime — never as plain literals.
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const HOST = '127.0.0.1';
const PORT = 3012;
const LAB_NUMBER = 4;
const LAB_NAME = 'HexaMart';

/* ============================== SEED DATA ============================== */

let nextUserId = 100;
let nextOrderId = 100;
let nextReviewId = 100;
let resetCounter = 0;

const users = [
  { id: 1, name: 'Ayesha Manager', email: 'admin@hexamart.local',    pass: 'Admin@123',  role: 'admin',    loyaltyPoints: 500,  storeCredit: 0, phone: '01700000001', address: 'HexaMart HQ, Dhaka' },
  { id: 2, name: 'Shipon Supplier', email: 'supplier@hexamart.local', pass: 'Supply@123', role: 'supplier', loyaltyPoints: 50,   storeCredit: 0, phone: '01700000002', address: 'Supplier Warehouse 4' },
  { id: 3, name: 'Rahim Uddin',    email: 'rahim@example.com',       pass: 'User@123',   role: 'customer', loyaltyPoints: 240,  storeCredit: 0, phone: '01700000003', address: 'House 12, Uttara, Dhaka' },
  { id: 4, name: 'Sara Khan',      email: 'sara@example.com',        pass: 'User@123',   role: 'customer', loyaltyPoints: 1320, storeCredit: 0, phone: '01700000004', address: 'Flat 7B, Banani, Dhaka' },
  { id: 5, name: 'Tanvir Ahmed',   email: 'tanvir@example.com',      pass: 'User@123',   role: 'customer', loyaltyPoints: 75,   storeCredit: 0, phone: '01700000005', address: 'Road 3, Mirpur, Dhaka' },
];

// supplierId: which supplier "owns" the product (supplier 2 owns only some).
const products = [
  { id: 1,  name: 'Basmati Rice 5kg',          aisle: 'Grains & Rice',    price: 6.49,  stock: 240, unit: 'bag',    supplierId: 2 },
  { id: 2,  name: 'Red Lentils (Masoor) 1kg',  aisle: 'Grains & Rice',    price: 1.89,  stock: 500, unit: 'pack',   supplierId: 2 },
  { id: 3,  name: 'Whole Chicken 1.2kg',       aisle: 'Meat & Fish',      price: 5.99,  stock: 85,  unit: 'piece',  supplierId: 9 },
  { id: 4,  name: 'Rui Fish 1kg',              aisle: 'Meat & Fish',      price: 7.25,  stock: 60,  unit: 'kg',     supplierId: 9 },
  { id: 5,  name: 'Ground Beef 500g',          aisle: 'Meat & Fish',      price: 6.75,  stock: 120, unit: 'pack',   supplierId: 9 },
  { id: 6,  name: 'Full Cream Milk 1L',        aisle: 'Dairy & Eggs',     price: 1.29,  stock: 800, unit: 'bottle', supplierId: 2 },
  { id: 7,  name: 'Farm Eggs (12)',            aisle: 'Dairy & Eggs',     price: 2.49,  stock: 450, unit: 'dozen',  supplierId: 2 },
  { id: 8,  name: 'Cheddar Cheese 400g',       aisle: 'Dairy & Eggs',     price: 4.99,  stock: 150, unit: 'pack',   supplierId: 9 },
  { id: 9,  name: 'Sourdough Loaf',            aisle: 'Bakery',           price: 2.99,  stock: 90,  unit: 'loaf',   supplierId: 9 },
  { id: 10, name: 'Butter Croissant (4)',      aisle: 'Bakery',           price: 3.49,  stock: 110, unit: 'pack',   supplierId: 9 },
  { id: 11, name: 'Fresh Tomatoes 1kg',        aisle: 'Fruits & Veg',     price: 1.59,  stock: 600, unit: 'kg',     supplierId: 2 },
  { id: 12, name: 'Bananas (bunch of 6)',      aisle: 'Fruits & Veg',     price: 1.19,  stock: 700, unit: 'bunch',  supplierId: 2 },
  { id: 13, name: 'Broccoli 500g',             aisle: 'Fruits & Veg',     price: 1.79,  stock: 320, unit: 'pack',   supplierId: 2 },
  { id: 14, name: 'Orange Juice 1.5L',         aisle: 'Beverages',        price: 2.79,  stock: 260, unit: 'bottle', supplierId: 9 },
  { id: 15, name: 'Green Tea (50 bags)',       aisle: 'Beverages',        price: 3.99,  stock: 200, unit: 'box',    supplierId: 9 },
  { id: 16, name: 'Instant Coffee 200g',       aisle: 'Beverages',        price: 5.49,  stock: 175, unit: 'jar',    supplierId: 9 },
  { id: 17, name: 'Potato Chips Party Pack',   aisle: 'Snacks',           price: 2.29,  stock: 540, unit: 'pack',   supplierId: 2 },
  { id: 18, name: 'Dark Chocolate 70% 100g',   aisle: 'Snacks',           price: 1.99,  stock: 480, unit: 'bar',    supplierId: 2 },
  { id: 19, name: 'Laundry Detergent 3kg',     aisle: 'Household',        price: 8.99,  stock: 140, unit: 'bag',    supplierId: 9 },
  { id: 20, name: 'Dish Soap 750ml',           aisle: 'Household',        price: 1.99,  stock: 390, unit: 'bottle', supplierId: 9 },
  { id: 21, name: 'Frozen Peas 1kg',           aisle: 'Frozen',           price: 1.69,  stock: 430, unit: 'bag',    supplierId: 2 },
  { id: 22, name: 'Vanilla Ice Cream 1L',      aisle: 'Frozen',           price: 4.29,  stock: 210, unit: 'tub',    supplierId: 2 },
  { id: 23, name: 'Soybean Oil 5L',            aisle: 'Grains & Rice',    price: 9.89,  stock: 160, unit: 'bottle', supplierId: 9 },
  { id: 24, name: 'Toilet Paper (12 rolls)',   aisle: 'Household',        price: 5.99,  stock: 300, unit: 'pack',   supplierId: 9 },
];

const coupons = [
  { code: 'SAVE10', percent: 10 },
  { code: 'FRESH5', percent: 5 },
  { code: 'BULK20', percent: 20 },
];

// Carts: userId -> [{productId, qty}]
const carts = {};

// Orders seeded so IDOR can be practised immediately.
const orders = [
  { id: 1, userId: 4, items: [{ productId: 1, name: 'Basmati Rice 5kg', qty: 2, price: 6.49 }, { productId: 6, name: 'Full Cream Milk 1L', qty: 6, price: 1.29 }],
    subtotal: 20.72, discount: 0, pointsRedeemed: 0, total: 20.72, status: 'Delivered', address: 'Flat 7B, Banani, Dhaka', date: '2026-10-20' },
  { id: 2, userId: 3, items: [{ productId: 3, name: 'Whole Chicken 1.2kg', qty: 1, price: 5.99 }, { productId: 11, name: 'Fresh Tomatoes 1kg', qty: 3, price: 1.59 }],
    subtotal: 10.76, discount: 0, pointsRedeemed: 0, total: 10.76, status: 'Shipped', address: 'House 12, Uttara, Dhaka', date: '2026-10-21' },
  { id: 3, userId: 4, items: [{ productId: 19, name: 'Laundry Detergent 3kg', qty: 12, price: 8.99 }],
    subtotal: 107.88, discount: 10.79, pointsRedeemed: 0, total: 97.09, status: 'Processing', address: 'Flat 7B, Banani, Dhaka', date: '2026-10-22' },
];

const reviews = [
  { id: 1, productId: 1, userId: 3, author: 'Rahim Uddin', text: 'Good quality rice, cooks fast.', rating: 5 },
  { id: 2, productId: 6, userId: 4, author: 'Sara Khan', text: 'Fresh milk, kids love it.', rating: 4 },
];

const resetTokens = {};        // token -> userId
const issuedResetTokens = new Set(); // tokens genuinely issued via /forgot this run
const failedLogins = {};       // email -> consecutive failure count (nobody ever throttles it)
const enumTrack = {};          // client ip -> {noUser, wrongPass, forgotHit, forgotMiss}
const couponLedger = {};       // userId -> { CODE: timesUsed } — recorded, never enforced

/* ============================== HELPERS ============================== */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function money(n) { return '$' + Number(n || 0).toFixed(2); }
function findUser(id) { return users.find(u => u.id === Number(id)); }
function findUserByEmail(email) { return users.find(u => u.email === String(email || '').toLowerCase()); }
function findProduct(id) { return products.find(p => p.id === Number(id)); }

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(part => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

/*
 * VULN (role tampering): the session cookie is an UNSIGNED string
 * "userId.role" and the server blindly trusts the role inside it.
 * Edit the cookie in the browser -> become admin.
 */
function currentUser(req) {
  const c = parseCookies(req);
  const raw = c.hm_session || '';
  const [idPart, rolePart] = raw.split('.');
  const u = findUser(idPart);
  if (!u) return null;
  return { ...u, role: rolePart || u.role, _cookieRole: rolePart || null }; // role taken from the cookie, not the DB!
}

function setSession(res, user) {
  const val = `${user.id}.${user.role}`;
  res.setHeader('Set-Cookie', `hm_session=${encodeURIComponent(val)}; Path=/; HttpOnly`);
}

function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', ch => { data += ch; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = String(req.headers['content-type'] || '');
      if (ct.includes('application/json')) {
        try { return resolve(JSON.parse(data || '{}')); } catch (_) { return resolve({}); }
      }
      const params = new URLSearchParams(data);
      const obj = {};
      for (const [k, v] of params.entries()) obj[k] = v;
      resolve(obj);
    });
    req.on('error', () => resolve({}));
  });
}

/* Key material — shard set A (fragments only; assembled at runtime, §7). */
const _shA = ['TC1YSA==', 'QjVQRg=='];

/* ============================== TESTS REGISTRY ==============================
 * One entry per vulnerability test. Tests complete ONLY when the server
 * observes the exploit actually succeed (see the pass() hooks in the
 * routes) — never by self-declaration. */

const TESTS = [
  { id: 'auth-sqli-login', feature: 'Login & Authentication', name: 'SQL injection — login bypass', owasp: 'A03 Injection', difficulty: 'Intermediate',
    hints: ["The login still builds its query by gluing your input into a string.", "A single quote in the email field changes the meaning of that query.", "Try admin@hexamart.local' OR '1'='1' -- as the email, with any password."],
    guide: "POST /login with email = admin@hexamart.local' OR '1'='1' -- and any password. The string-built query treats everything after the quote as logic, the password check is commented out, and you are logged in as the store manager.",
    lesson: "A login form is a database query wearing a UI. If input is concatenated into the query, the attacker writes the query.",
    impact: "On a real store this is instant admin takeover: the attacker logs in as the manager without any password, sees every order and customer, and can change prices or export data.",
    report: { title: 'SQL Injection in Authentication (Login Bypass)', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements for all database access; never concatenate user input into SQL.' } },
  { id: 'auth-brute-force', feature: 'Login & Authentication', name: 'Brute force — no rate limiting or lockout', owasp: 'A07 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ["How many wrong passwords can you try in a row before anything stops you?", "Nothing stops you. Count to ten failures on one account.", "Send 10+ failed logins for tanvir@example.com — the 10th is processed exactly like the 1st."],
    guide: "Send 10 or more POST /login requests with a wrong password for the same account (e.g. tanvir@example.com). Every attempt is processed normally — no delay, lockout or CAPTCHA — so an attacker can try thousands.",
    lesson: "An unlimited login form is an invitation to credential stuffing and password guessing; throttling is a control, not a courtesy.",
    impact: "Attackers can grind through password lists against real customer accounts; one reused weak password hands over the account, its points and its order history.",
    report: { title: 'Missing Rate Limiting on Login (Brute Force)', severity: 'Medium', remediation: 'Add progressive delays / lockout and rate limits per account and IP; alert on bursts of failures.' } },
  { id: 'auth-enumeration', feature: 'Login & Authentication', name: 'User enumeration via differing responses', owasp: 'A07 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ["Compare the exact wording when the email doesn't exist vs when only the password is wrong.", "The login and forgot-password flows answer differently for registered and unregistered emails.", "Probe one real email (sara@example.com, wrong password) and one fake email on /login and /forgot and diff the messages."],
    guide: "POST /login with a registered email + wrong password, then with an unregistered email: the messages differ ('Incorrect password for that account.' vs 'No account is registered with that email.'). /forgot reveals existence too. An attacker can harvest the store's real customer list before attacking anyone.",
    lesson: "Error messages are an oracle. If the system confirms which emails exist, attackers build target lists for phishing and credential stuffing.",
    impact: "The store's customer emails can be enumerated at scale, feeding targeted phishing that quotes real shopping details and drives account-takeover fraud.",
    report: { title: 'User Enumeration via Authentication Responses', severity: 'Medium', remediation: 'Return identical, generic responses for all authentication failures and reset requests regardless of account existence.' } },
  { id: 'auth-reset-token', feature: 'Login & Authentication', name: 'Predictable password-reset token', owasp: 'A07 Identification & Authentication Failures', difficulty: 'Advanced',
    hints: ["Request a reset for your own account and study the token's anatomy.", "The token contains a user ID and a counter that only moves one way.", "Admin is user 1. After your own reset (HM-3-1001), guess HM-1-1001 — or trigger the counter forward and iterate it."],
    guide: "Tokens are HM-<userId>-<1000+counter>. Request a reset for yourself, note the counter, then forge the admin's token: POST /reset with token HM-1-<counter> and a new password — you now own the manager account, no mailbox needed.",
    lesson: "A reset token is a temporary password. If it is predictable, it is not a secret — it is a schedule anyone can read.",
    impact: "Any account — including the store manager's — can be taken over by guessing, with no access to the victim's mailbox: full store compromise from a single form.",
    report: { title: 'Predictable Password Reset Token', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (>= 128 bits), store hashed, expire in 15-30 minutes, single use.' } },
  { id: 'profile-mass-assignment', feature: 'Registration & Profile', name: 'Mass assignment on profile update', owasp: 'A04 Insecure Design / A08 Integrity Failures', difficulty: 'Intermediate',
    hints: ["The settings form shows three fields. The handler is less picky than the form.", "What other fields exist on your user record? You saw them on the loyalty page.", "Add loyaltyPoints=50000 (or storeCredit, or role) to the POST /profile/update request."],
    guide: "Intercept POST /profile/update and add fields that are not on the form: loyaltyPoints=50000, storeCredit=5000, even role=admin. The handler copies every submitted field onto your user record.",
    lesson: "Binding request data straight onto a record turns every form into an admin panel. Allowlist what a user may change.",
    impact: "Customers mint themselves loyalty balances, store credit and even staff roles — direct financial loss and privilege escalation from a settings page.",
    report: { title: 'Mass Assignment in Profile Update', severity: 'High', remediation: 'Allowlist updatable fields explicitly; change privileged fields only via dedicated authorised endpoints.' } },
  { id: 'profile-weak-password', feature: 'Registration & Profile', name: 'No password policy at registration', owasp: 'A07 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ["How short can a new account's password be?", "There is no length or complexity check anywhere in registration.", "Register a new account with the password 'a' — it is accepted."],
    guide: "POST /register with any email and the password 'a' (one character). The account is created and you are logged in. The same absence of policy applies anywhere a password is set.",
    lesson: "If users may choose one-character passwords, brute force and credential stuffing stop being attacks and become certainties.",
    impact: "Weak customer passwords are guessed at scale; each cracked account exposes order history, addresses and stored loyalty value.",
    report: { title: 'Missing Password Policy', severity: 'Medium', remediation: 'Enforce a minimum length (>= 10) and block common / breached passwords at registration and reset.' } },
  { id: 'profile-stored-xss', feature: 'Registration & Profile', name: 'Stored XSS via profile name', owasp: 'A03 Injection', difficulty: 'Intermediate',
    hints: ["Your display name appears in more places than the settings form.", "One greeting on the profile page prints your name exactly as stored.", "Set your name to <script>alert(document.cookie)</script> and open /profile."],
    guide: "POST /profile/update with name=<script>alert(document.cookie)</script>. The profile page greets you with the raw stored name — the script executes in the browser of anyone who views it.",
    lesson: "Output encoding must be applied at every render point, not most of them; one raw template slot is a stored XSS.",
    impact: "Payloads stored in profile fields fire for staff who view the account, enabling session theft and actions performed as the store manager.",
    report: { title: 'Stored Cross-Site Scripting in Profile Name', severity: 'High', remediation: 'Contextually output-encode all user-controlled data at render; add a restrictive Content-Security-Policy.' } },
  { id: 'search-sqli', feature: 'Product Search', name: 'SQL-injection-style search bypass', owasp: 'A03 Injection', difficulty: 'Intermediate',
    hints: ["The search page politely shows you the 'query' it built from your input.", "Your input becomes part of that query's logic, not just its data.", "Search for ' OR '1'='1 and watch the whole catalogue come back."],
    guide: "GET /?q=' OR '1'='1 — the naive string query's WHERE clause becomes always-true and all 24 products return, with the constructed query echoed on the page.",
    lesson: "Concatenating input into a query hands the attacker the query. Parameterisation keeps data as data.",
    impact: "In a production store this pattern leads to extraction of the whole database — customers, orders and password hashes.",
    report: { title: 'SQL Injection in Product Search', severity: 'High', remediation: 'Use parameterised queries; treat search input strictly as a literal value and never echo built queries.' } },
  { id: 'search-reflected-xss', feature: 'Product Search', name: 'Reflected XSS in search', owasp: 'A03 Injection', difficulty: 'Beginner',
    hints: ["After searching, the page repeats your search term back to you.", "Check the page source: is your term encoded everywhere it appears?", "Search for <script>alert(1)</script> and view the 'Showing results for' line."],
    guide: "GET /?q=<script>alert(1)</script> — the results heading prints your term unescaped, so the script runs in the browser of anyone who opens a crafted search link.",
    lesson: "Reflected input is still code if you print it raw. Encoding on output is what turns data back into text.",
    impact: "Attackers send shoppers links that run script in the store's own pages — stealing sessions and hijacking checkouts under the store's trusted name.",
    report: { title: 'Reflected Cross-Site Scripting in Search', severity: 'Medium', remediation: 'HTML-encode all reflected user input on output; validate and length-limit search terms.' } },
  { id: 'reviews-stored-xss', feature: 'Reviews', name: 'Stored XSS in product reviews', owasp: 'A03 Injection', difficulty: 'Intermediate',
    hints: ["Reviews are shown to every shopper — and to the manager.", "The review text is printed exactly as it was stored.", "Post <script>alert(document.cookie)</script> as a review, then visit the product as another user."],
    guide: "Login, open any product, POST a review containing <script>alert(document.cookie)</script>. It is stored and executed for every visitor of that product page, including staff.",
    lesson: "Any field a user can store and others can view is a stored-XSS candidate; encode on render, every time.",
    impact: "A single review can hijack the sessions of shoppers and the store manager, turning the store's own pages into the attack delivery vehicle.",
    report: { title: 'Stored Cross-Site Scripting in Product Reviews', severity: 'High', remediation: 'Output-encode review text and author at render; add CSP as defence in depth.' } },
  { id: 'cart-negative-qty', feature: 'Cart', name: 'Negative-quantity cart bug', owasp: 'A04 Insecure Design', difficulty: 'Beginner',
    hints: ["Quantity inputs accept more than positive numbers.", "What does a line with quantity -50 do to the cart total?", "Add one item normally, then set another line's qty to -50 in /cart/update."],
    guide: "POST /cart/add or /cart/update with qty=-50. The negative line subtracts its value from the total, and at checkout the stock of that product increases.",
    lesson: "Quantities are money. Validate type and range server-side on every mutation, not just in the browser widget.",
    impact: "Customers check out below cost — or with the store owing them — and inventory counts are corrupted by negative stock movements.",
    report: { title: 'Missing Quantity Validation in Cart (Negative Quantities)', severity: 'High', remediation: 'Validate quantities as positive integers bounded by stock at every entry point; recompute totals server-side.' } },
  { id: 'checkout-price-tamper', feature: 'Checkout & Payments', name: 'Price tampering at checkout', owasp: 'A04 Insecure Design / A08 Integrity Failures', difficulty: 'Beginner',
    hints: ["The checkout form very helpfully pre-fills the unit prices for you.", "Editable fields are trusted fields — check what the POST actually sends.", "Change price_23 to 0.10 on the Soybean Oil and place the order."],
    guide: "Add Soybean Oil 5L ($9.89) to the cart, open /checkout, edit the price_23 field to 0.10 and submit. The order and its receipt record your price, not the catalogue price.",
    lesson: "Anything rendered into a form is a suggestion, not a fact. Prices must be recomputed from the server's catalogue at order time.",
    impact: "Arbitrary self-pricing of the whole catalogue; receipts legitimise the fake prices, so the loss is invisible in normal reporting.",
    report: { title: 'Client-Side Price Tampering at Checkout', severity: 'Critical', remediation: 'Recompute all prices and totals server-side from the catalogue; ignore client-submitted monetary fields.' } },
  { id: 'checkout-bulk-tier', feature: 'Checkout & Payments', name: 'Bulk-discount tier manipulation', owasp: 'A04 Insecure Design', difficulty: 'Beginner',
    hints: ["Bulk tiers are meant to reward quantity. Who verifies the quantity?", "The tier travels to the server as a form value.", "Buy one item and submit bulkDiscountPercent=90."],
    guide: "Put a single cheap item in the cart and POST /checkout with bulkDiscountPercent=90 (the 'Partner tier'). The server applies 90% off without ever counting your units.",
    lesson: "Discount rules are business logic — and business logic must be enforced where the client cannot rewrite it: on the server.",
    impact: "Margin destruction at scale: anyone buys the entire store at wholesale-or-below prices whenever they like.",
    report: { title: 'Bulk Discount Tier Manipulation', severity: 'High', remediation: 'Derive the discount tier server-side from the actual cart contents; never accept a percent from the client.' } },
  { id: 'checkout-coupon-abuse', feature: 'Checkout & Payments', name: 'Coupon stacking and unlimited reuse', owasp: 'A04 Insecure Design', difficulty: 'Intermediate',
    hints: ["The coupon field is free text that accepts a list.", "What happens if a code appears twice in that list — or on every order you place?", "Submit coupons=SAVE10,SAVE10,SAVE10 and watch one code pay out three times."],
    guide: "At checkout, enter SAVE10,SAVE10,SAVE10 (or SAVE10,FRESH5,BULK20). Every instance applies, and the same code works again on your next order — no redemption is ever recorded or enforced.",
    lesson: "Promotions are financial instruments. Without a redemption ledger, a coupon is an unlimited discount generator.",
    impact: "Discount abuse compounds with the other checkout flaws; marketing promotions become an unbounded liability instead of a capped cost.",
    report: { title: 'Coupon Stacking and Unlimited Reuse', severity: 'Medium', remediation: 'Enforce one-coupon (or explicit capped stacking) rules server-side and record every redemption per customer.' } },
  { id: 'checkout-oversell', feature: 'Checkout & Payments', name: 'Overselling — no stock check at checkout', owasp: 'A04 Insecure Design', difficulty: 'Intermediate',
    hints: ["The shelf says 85 chickens. The cart does not care.", "Nothing compares your quantity to the stock count before the order is accepted.", "Order 500 Whole Chickens and read the stock level afterwards."],
    guide: "Add Whole Chicken (stock 85) with qty=500 and check out. The order is accepted in full and the product's stock drops below zero: the store has sold groceries it does not have.",
    lesson: "Inventory is a promise. If checkout never checks availability, the shop sells air and discovers it at the warehouse.",
    impact: "Mass overselling means cancelled orders, refunds, compensation and reputational damage — and corrupted stock data for every downstream decision.",
    report: { title: 'Missing Stock Availability Check at Checkout (Oversell)', severity: 'Medium', remediation: 'Check and decrement stock atomically at order placement; reject quantities above available stock.' } },
  { id: 'orders-idor', feature: 'Orders & Receipts', name: "IDOR — read any customer's order", owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    hints: ["Your order history has a pattern in its URLs.", "Order IDs are small sequential numbers.", "Logged in as Rahim, open /orders/1 and /orders/3 — they belong to Sara."],
    guide: "Login as any customer and GET /orders/<id> for IDs that are not yours. No ownership check is performed; the full order renders.",
    lesson: "Authentication is not authorisation. Every object access must ask: does this user own this object?",
    impact: "Every customer's purchases become visible to every other customer — a privacy breach and raw material for convincing phishing.",
    report: { title: 'Insecure Direct Object Reference — Orders', severity: 'High', remediation: 'Authorise every object access against the session user (or an admin role) before serving it.' } },
  { id: 'receipt-idor', feature: 'Orders & Receipts', name: "IDOR — read any customer's receipt", owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    hints: ["Receipts live at a guessable address of their own.", "A receipt shows more than an order: name, email, delivery address.", "Open /receipt/1 while logged in as Rahim."],
    guide: "GET /receipt/<id> for another customer's order. The receipt prints their full name, email, delivery address and purchases — no ownership check.",
    lesson: "Printable views are part of the attack surface and need the same authorisation as the object itself.",
    impact: "Bulk harvesting of customer PII (names, emails, home addresses) — a reportable data breach and a phishing goldmine.",
    report: { title: 'Insecure Direct Object Reference — Receipts (PII Exposure)', severity: 'High', remediation: 'Apply the same ownership authorisation to receipts as to orders; minimise PII on printed views.' } },
  { id: 'loyalty-redeem-overdraw', feature: 'Loyalty Programme', name: "Redeem points you don't have", owasp: 'A04 Insecure Design / A01 Broken Access Control', difficulty: 'Beginner',
    hints: ["The redeem form asks how many points. It never asks how many you HAVE.", "Your balance is checked by the page display, not by the server.", "Redeem 1000000 points and read your new store credit."],
    guide: "POST /loyalty/redeem with points=1000000. Your balance plunges negative and you are still credited $10,000 of store credit, which checkout happily spends. The same missing check exists for points redeemed at checkout.",
    lesson: "Balances are server-side facts. Every debit must be validated against the real balance in the same operation.",
    impact: "Direct financial loss: unlimited free groceries paid for with invented points, and a meaningless loyalty liability on the books.",
    report: { title: 'Loyalty Points Redemption Without Balance Validation', severity: 'Critical', remediation: 'Validate points <= balance server-side, transactionally, for both the redeem endpoint and checkout redemption.' } },
  { id: 'loyalty-transfer-forgery', feature: 'Loyalty Programme', name: 'Transfer points out of any account', owasp: 'A01 Broken Access Control / A07 Identification & Authentication Failures', difficulty: 'Intermediate',
    hints: ["The transfer form asks who the points come FROM.", "Why would the sender be a form field — and who checks it?", "Set fromEmail=sara@example.com, toEmail=your own, points=1300."],
    guide: "POST /loyalty/transfer naming Sara as the source and yourself as the destination. The server moves her points without any proof you own her account.",
    lesson: "The actor in a transaction is the authenticated session — never a parameter. Parameters are claims; sessions are identity.",
    impact: "Theft of every customer's loyalty balance at scale: fraud, support chaos and destroyed trust in the programme.",
    report: { title: 'Broken Access Control in Loyalty Transfer (Arbitrary Source Account)', severity: 'Critical', remediation: 'Fix the source account to the authenticated session user; validate recipient, amount and balance; log transfers.' } },
  { id: 'loyalty-csrf', feature: 'Loyalty Programme', name: 'CSRF — silent loyalty & profile actions', owasp: 'A01 Broken Access Control', difficulty: 'Advanced',
    hints: ["No state-changing form in this app carries an anti-CSRF token of its own.", "A victim's browser will happily POST to the store while they visit another site.", "Host an auto-submitting form to /loyalty/transfer and open it while logged in as the victim."],
    guide: "Build a page with a hidden auto-submitting form POSTing to http://127.0.0.1:3012/loyalty/transfer (or /profile/update). A logged-in victim who merely opens the page executes the action with their session. The lab registers a state-changing request that arrives without the app's own form marker — or with a cross-site Origin — as proof.",
    lesson: "Cookies ride along automatically — that is precisely why state changes need a token the attacker's page cannot know.",
    impact: "Silent theft of points and profile changes under victims' identities, triggered by nothing more than opening a web page.",
    report: { title: 'Cross-Site Request Forgery on State-Changing Actions', severity: 'High', remediation: 'Issue and verify per-session anti-CSRF tokens on all state-changing forms; set SameSite=Lax on session cookies.' } },
  { id: 'supplier-bac', feature: 'Supplier Console', name: "Supplier edits competitors' products", owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ["The supplier console lists more products than the supplier owns.", "Products marked with another supplier's ID still come with a Save button.", "As supplier, set a Supplier-9 product's price to 0.01 and check the public catalogue."],
    guide: "Login as supplier@hexamart.local. GET /supplier lists all 24 products. POST /supplier/product/<id> for a product owned by Supplier 9 with a new price or stock — it applies instantly, with no ownership check.",
    lesson: "Multi-tenant data must be scoped by ownership in every query and every update — a list filter is not an authorisation boundary.",
    impact: "One supplier account can sabotage every competitor: zeroed prices, wiped stock, and a marketplace no honest supplier will trust.",
    report: { title: "Broken Access Control in Supplier Console (Cross-Supplier Modification)", severity: 'High', remediation: "Scope all supplier reads and writes by supplierId ownership; return 403/404 for others' products." } },
  { id: 'admin-cookie-role', feature: 'Admin Panel', name: 'Role tampering via session cookie → admin', owasp: 'A07 Identification & Authentication Failures / A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ["Your session cookie is readable — and writable — by you.", "Its value looks like '3.customer'. What is the server trusting there?", "Change it to 3.admin and reload /admin."],
    guide: "The hm_session cookie is an unsigned 'userId.role' string and the server trusts the role inside it. Login as a customer, edit the cookie to <yourId>.admin, and /admin opens with revenue and the full user table.",
    lesson: "Client-held state is client-controlled state. Roles must come from server-side session records or signed tokens.",
    impact: "Complete privilege escalation for any registered user: the store's revenue, customers and orders are fully exposed.",
    report: { title: 'Privilege Escalation via Unsigned Session Cookie (Role Tampering)', severity: 'Critical', remediation: 'Use opaque server-side sessions or HMAC-signed cookies; always read the role from the server-side record.' } },
  { id: 'platform-api-exposure', feature: 'Platform & Data Exposure', name: 'Unauthenticated customer data API', owasp: 'A01 Broken Access Control / A05 Security Misconfiguration', difficulty: 'Beginner',
    hints: ["Not every door is in the navigation. Integrations leave doors too.", "A 'partner API' endpoint answers without asking who you are.", "Open /api/customers in a private window — no login at all."],
    guide: "GET /api/customers returns JSON for every user — names, emails, phones, addresses, loyalty balances — with no authentication. It is a leftover partner-integration endpoint that was never locked down.",
    lesson: "Every endpoint is production attack surface, including the ones nobody linked. Inventory and authenticate all of them.",
    impact: "One unauthenticated request exfiltrates the entire customer database — a reportable breach and a ready-made phishing list.",
    report: { title: 'Unauthenticated API Exposing Full Customer Data', severity: 'Critical', remediation: 'Require authentication and authorisation on every API endpoint; return only the minimum fields each consumer needs.' } },
];

const FEATURES = [...new Set(TESTS.map(t => t.feature))];

const FEATURE_KEYS = {
  'Login & Authentication': ['login', 'log in', 'auth', 'password', 'brute', 'enumerat', 'reset', 'token', 'sign in'],
  'Registration & Profile': ['register', 'registration', 'profile', 'sign up', 'signup', 'mass assignment', 'settings'],
  'Product Search': ['search', 'find', 'catalogue', 'catalog'],
  'Reviews': ['review'],
  'Cart': ['cart', 'quantity', 'qty'],
  'Checkout & Payments': ['checkout', 'price', 'coupon', 'bulk', 'tier', 'discount', 'oversell', 'stock', 'pay'],
  'Orders & Receipts': ['order', 'receipt', 'invoice', 'idor'],
  'Loyalty Programme': ['loyalty', 'point', 'redeem', 'transfer', 'csrf'],
  'Supplier Console': ['supplier', 'inventory'],
  'Admin Panel': ['admin', 'cookie', 'role', 'dashboard'],
  'Platform & Data Exposure': ['api', 'exposure', 'data', 'platform', 'customers'],
};
const TEST_KEYS = {
  'auth-sqli-login': ['sql', 'injection', 'bypass'],
  'auth-brute-force': ['brute', 'rate limit', 'lockout', 'guess'],
  'auth-enumeration': ['enumerat', 'exist'],
  'auth-reset-token': ['reset token', 'predictable', 'forgot'],
  'profile-mass-assignment': ['mass', 'assignment'],
  'profile-weak-password': ['weak password', 'password policy'],
  'profile-stored-xss': ['profile xss', 'name xss'],
  'search-sqli': ['search sql', 'search injection'],
  'search-reflected-xss': ['reflected'],
  'reviews-stored-xss': ['review xss', 'stored xss'],
  'cart-negative-qty': ['negative'],
  'checkout-price-tamper': ['price tamper', 'tamper', 'own price'],
  'checkout-bulk-tier': ['bulk', 'tier'],
  'checkout-coupon-abuse': ['coupon', 'stack'],
  'checkout-oversell': ['oversell', 'over sell', 'stock check'],
  'orders-idor': ['order idor'],
  'receipt-idor': ['receipt idor', 'receipt'],
  'loyalty-redeem-overdraw': ['redeem', 'overdraw', 'balance'],
  'loyalty-transfer-forgery': ['transfer'],
  'loyalty-csrf': ['csrf', 'cross-site', 'cross site'],
  'supplier-bac': ['supplier', 'competitor'],
  'admin-cookie-role': ['cookie', 'role tamper', 'become admin'],
  'platform-api-exposure': ['api', 'customers', 'exposure'],
};

/* Key material — shard set B (fragments only). */
const _shB = ['QS00MA==', 'RS01MA=='];

/* ============================== PROGRESS ENGINE ============================== */

const STATE_PATH = path.join(__dirname, 'progress.json');
let state = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
try {
  if (fs.existsSync(STATE_PATH)) {
    const loaded = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    state = { ...state, ...loaded };
    // Ignore any test ids that no longer exist in the registry.
    const clean = {};
    for (const t of TESTS) if (state.tests[t.id]) clean[t.id] = true;
    state.tests = clean;
  }
} catch (_) { /* corrupt state file -> start fresh rather than crash */ }

function saveState() { try { fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2)); } catch (_) {} }
function doneCount() { return TESTS.filter(t => state.tests[t.id]).length; }
function labPct() { return Math.floor((doneCount() / TESTS.length) * 100); }
function isComplete() { return doneCount() === TESTS.length; }
function attempt(feature) {
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  saveState();
}
function pass(testId) {
  if (!TESTS.some(t => t.id === testId)) return;
  if (state.tests[testId]) return; // idempotent
  state.tests[testId] = true;
  if (isComplete() && !state.completedAt) {
    state.completedAt = new Date().toISOString();
    state.keyRevealed = true;
  }
  saveState();
}

/* Key material — shard set C (fragments only). */
const _shC = ['R0VSOQ==', 'QjVQRg==', 'RVhDRQ==', 'Q05FNQ=='];

/*
 * Key assembly (§7 of the engine spec): each key lives in this file ONLY
 * as >= 5 base64-encoded, reversed fragments scattered across separate
 * regions. The fragments are joined and un-transformed here, at runtime,
 * and only at the moments the spec allows (unlock verification for the
 * entry key; 100% completion for the completion key).
 */
function _unshard(list) {
  return list.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}
/* Fragment sets are scattered: _shA (helpers), _shB (registry), _shC (above), _shD (routes). */
function entryKey() { return _unshard([_shA[0], _shB[0], _shC[0], _shD[0], _shC[2], _shD[2]]); }
function completionKey() { return _unshard([_shA[0], _shB[1], _shC[1], _shD[1], _shC[3], _shD[3]]); }

/* Detection patterns shared by several hooks. */
const XSS_RE = /<\s*(script|svg|img|iframe|details|body|input|a)\b|on\w+\s*=\s*["']?[^"'\s>]*\(|javascript\s*:/i;
function looksInjected(s) {
  const v = String(s || '');
  return /'\s*(or|and)\b/i.test(v) || /\bor\s+1\s*=\s*1/i.test(v) || /'\s*--/.test(v)
    || /'\s*or\s*'[^']*'\s*=\s*'[^']*'/i.test(v) || /union\s+select/i.test(v);
}
/*
 * CSRF proof (lab model): the app's own forms carry a hidden hx_origin
 * marker. A state-changing POST that arrives WITHOUT that marker — or
 * with a cross-site Origin/Referer — is treated as a successful CSRF,
 * because nothing else in the app stops it either (deliberate flaw).
 */
function csrfProof(req, body) {
  const origin = String(req.headers.origin || req.headers.referer || '');
  const crossSite = origin && !origin.includes(`${HOST}:${PORT}`) && !origin.includes(`localhost:${PORT}`);
  if (!body.hx_origin || crossSite) pass('loyalty-csrf');
}

/* ============================== LAYOUT & WIDGETS ============================== */

function chatWidget() {
  return `<div id="hxchat" style="position:fixed;right:16px;bottom:16px;width:330px;max-width:94vw;z-index:60;font-size:14px">
  <div id="hxbox" style="display:none;background:#fff;border:2px solid #2e7d32;border-radius:12px;box-shadow:0 6px 22px rgba(0,0,0,.28);overflow:hidden">
    <div style="background:#2e7d32;color:#fff;padding:9px 12px;font-weight:700">🤖 Hexa — LAB ${LAB_NUMBER} Assistant</div>
    <div id="hxlog" style="height:230px;overflow-y:auto;padding:10px;white-space:pre-wrap"></div>
    <div style="display:flex;border-top:1px solid #ddd">
      <input id="hxin" placeholder="Ask about tests, features, progress…" style="flex:1;border:0;padding:10px;margin:0" onkeydown="if(event.key==='Enter')hxSend()">
      <button onclick="hxSend()" style="border-radius:0">Send</button>
    </div>
  </div>
  <button onclick="hxToggle()" style="float:right;border-radius:22px;box-shadow:0 3px 10px rgba(0,0,0,.35);margin-top:8px">🤖 Ask Hexa</button>
</div>
<script>
var hxOpen=false;
function hxToggle(){ hxOpen=!hxOpen; document.getElementById('hxbox').style.display=hxOpen?'block':'none'; if(hxOpen) hxSay('bot','Hi! I am Hexa, your LAB ${LAB_NUMBER} assistant. Ask me about features, tests, your progress — or what to try next.'); }
function hxSay(who,text){ var log=document.getElementById('hxlog'); var d=document.createElement('div'); d.style.margin='6px 0'; d.style.padding='7px 9px'; d.style.borderRadius='8px'; d.style.background=who==='me'?'#e8f5e9':'#f1f4ee'; d.textContent=(who==='me'?'You: ':'Hexa: ')+text; log.appendChild(d); log.scrollTop=log.scrollHeight; }
function hxSend(){ var inp=document.getElementById('hxin'); var m=inp.value.trim(); if(!m) return; inp.value=''; hxSay('me',m);
  fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})})
    .then(function(r){ return r.json(); }).then(function(j){ hxSay('bot', j.reply || '…'); })
    .catch(function(){ hxSay('bot','(connection hiccup — try again)'); }); }
</script>`;
}

function progressStrip() {
  const done = doneCount(), total = TESTS.length, pct = labPct();
  return `<div style="background:#1b2e1a;color:#cfe8cc;padding:7px 26px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
    <img src="/logo.png" alt="HexaCyberLab" style="height:26px;background:#fff;border-radius:5px;padding:2px">
    <b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b>
    <span>${done}/${total} tests · ${pct}%</span>
    <span style="flex:1;min-width:120px;background:#33502f;border-radius:6px;height:12px;overflow:hidden"><span style="display:block;height:100%;width:${pct}%;background:linear-gradient(90deg,#66bb6a,#a5d6a7)"></span></span>
    <a href="/tests" style="color:#a5d6a7;font-weight:700;text-decoration:none">🧪 Mission / Tests</a>
    ${isComplete() ? '<a href="/complete" style="color:#ffe082;font-weight:700;text-decoration:none">🏆 Completion</a>' : ''}
  </div>`;
}

function layout(req, title, content) {
  const me = currentUser(req);
  const cartCount = me && carts[me.id] ? carts[me.id].reduce((a, i) => a + i.qty, 0) : 0;
  const nav = me
    ? `<span>👤 ${esc(me.name)} (${esc(me.role)}) · ⭐ ${me.loyaltyPoints} pts · 💰 ${money(me.storeCredit)}</span>
       <a href="/cart">🛒 Cart (${cartCount})</a><a href="/orders">My Orders</a><a href="/loyalty">Loyalty</a>
       <a href="/tests">Tests</a>
       <a href="/profile">Profile</a>${me.role === 'supplier' || me.role === 'admin' ? '<a href="/supplier">Supplier</a>' : ''}${me.role === 'admin' ? '<a href="/admin">Admin</a>' : ''}
       <a href="/logout">Logout</a>`
    : `<a href="/login">Login</a><a href="/register">Register</a><a href="/tests">Tests</a>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)} — HexaMart</title>
<style>
body{font-family:'Segoe UI',Arial,sans-serif;margin:0;background:#f4f7f2;color:#21301d}
header{background:linear-gradient(90deg,#2e7d32,#66bb6a);color:#fff;padding:14px 26px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px}
header a{color:#fff;margin-left:14px;text-decoration:none;font-weight:600}
header .logo{font-size:26px;font-weight:800;color:#fff;text-decoration:none}
main{max-width:1050px;margin:24px auto;padding:0 18px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
.card{background:#fff;border-radius:10px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.08)}
.card h3{margin:6px 0}.price{color:#2e7d32;font-weight:800;font-size:18px}
.aisle{background:#e8f5e9;border-radius:6px;padding:2px 8px;font-size:12px;color:#2e7d32}
button,.btn{background:#2e7d32;color:#fff;border:0;padding:9px 16px;border-radius:6px;cursor:pointer;font-weight:600;text-decoration:none;display:inline-block}
button:hover,.btn:hover{background:#256528}
input,select,textarea{padding:8px;border:1px solid #c5d6c0;border-radius:6px;margin:4px 0 10px;width:100%;box-sizing:border-box}
table{width:100%;border-collapse:collapse;background:#fff}th,td{border-bottom:1px solid #e3eee0;padding:9px;text-align:left}
.warn{background:#fff3e0;border:1px solid #ffb74d;padding:12px;border-radius:8px}
.ok{background:#e8f5e9;border:1px solid #81c784;padding:12px;border-radius:8px}
small{color:#607d5a} .right{text-align:right}
.cert{border:3px double #2e7d32;border-radius:14px;padding:28px;text-align:center;background:#fffef7}
@media print{ #hxchat, header, footer, .noprint{ display:none !important; } }
</style></head><body>
${progressStrip()}
<header><a class="logo" href="/">🥦 HexaMart</a><nav>${nav}</nav></header>
<main>${content}</main>
<footer style="text-align:center;color:#8aa583;padding:22px"><small>HexaMart practice lab — intentionally vulnerable. Local use only. All data is synthetic.<br>HexaCyberLab — Built by Md. Jony Hassain, Founder.</small></footer>
${chatWidget()}
</body></html>`;
}

function gatePage(error) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ${LAB_NUMBER} locked — HexaMart</title>
<style>body{font-family:'Segoe UI',Arial,sans-serif;margin:0;background:#10220f;color:#e6f2e2}
main{max-width:560px;margin:60px auto;padding:0 18px}.card{background:#fff;color:#21301d;border-radius:12px;padding:26px;box-shadow:0 4px 18px rgba(0,0,0,.4)}
input{padding:10px;border:1px solid #c5d6c0;border-radius:6px;margin:6px 0 12px;width:100%;box-sizing:border-box}
button{background:#2e7d32;color:#fff;border:0;padding:10px 18px;border-radius:6px;cursor:pointer;font-weight:700}
.warn{background:#fff3e0;border:1px solid #ffb74d;padding:12px;border-radius:8px}</style></head><body>
<main><div style="text-align:center;margin-bottom:16px"><img src="/logo.png" alt="HexaCyberLab" style="height:64px;background:#fff;border-radius:10px;padding:6px">
<h1 style="margin:10px 0 2px">LAB ${LAB_NUMBER} — ${LAB_NAME}</h1><p style="color:#a9cba4;margin:2px 0">HexaCyberLab Lab Programme · Category 1 — E-commerce &amp; Retail</p></div>
<div class="card"><h2 style="margin-top:0">🔒 This lab is locked</h2>
<p>Labs run in order. Finish <b>Lab ${LAB_NUMBER - 1}</b> at 100% and it will give you a completion key.
Paste that key here to start LAB ${LAB_NUMBER}.</p>
${error ? '<div class="warn">That key was not accepted. Check it and try again.</div>' : ''}
<form method="POST" action="/unlock"><label>Completion key from Lab ${LAB_NUMBER - 1}<input name="key" placeholder="Paste the key…" autocomplete="off"></label>
<button>🔓 Unlock LAB ${LAB_NUMBER}</button></form>
<p><small>Once unlocked, this lab stays unlocked on this machine, and your test progress is saved — you can leave and resume any time.</small></p></div>
<p style="text-align:center;color:#7fa377"><small>HexaCyberLab — Built by Md. Jony Hassain, Founder.</small></p></main>
${chatWidget()}
</body></html>`;
}

function send(res, code, html, headers) {
  res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', ...(headers || {}) });
  res.end(html);
}
function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }
function requireLogin(req, res) {
  const me = currentUser(req);
  if (!me) { redirect(res, '/login'); return null; }
  return me;
}

/* ============================== CHATBOT ==============================
 * Rule-based, in-lab, zero external calls. Knowledge = the TESTS
 * registry + live progress state. Step-by-step help for a feature is
 * locked until that feature has >= 3 recorded attempts (or its tests
 * are already passed). The completion key is only known to the bot
 * after the lab reaches 100%. */

function featureStats(feature) {
  const ts = TESTS.filter(t => t.feature === feature);
  return { total: ts.length, done: ts.filter(t => state.tests[t.id]).length, attempts: state.attempts[feature] || 0, tests: ts };
}
function findFeature(msg) {
  for (const f of FEATURES) {
    if ((FEATURE_KEYS[f] || []).some(k => msg.includes(k))) return f;
  }
  return null;
}
function findTest(msg) {
  for (const t of TESTS) {
    if ((TEST_KEYS[t.id] || []).some(k => msg.includes(k))) return t;
  }
  return null;
}
function nextOpenTest() { return TESTS.find(t => !state.tests[t.id]); }

function chatReply(raw) {
  const msg = String(raw || '').toLowerCase().trim();
  const done = doneCount(), pct = labPct();
  if (!msg) return "Ask me about this lab's features, its tests, your progress — or what to try next.";

  // Attribution (always available).
  if (/(who (built|made|created|developed)|who is (the )?founder|founder|jony|hassain|hexacyberlab|your (creator|author|maker))/.test(msg))
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";

  // The completion key — secrecy before 100%, shared after.
  if (/(key|unlock|next lab|lab 5|password for)/.test(msg)) {
    if (!state.unlocked)
      return "This lab is still locked, and I can't give you its entry key — nobody can. That key is the completion reward of Lab 3 (HexaElectro): finish Lab 3 at 100% and its completion page will show you the key to paste here.";
    if (isComplete() && state.keyRevealed)
      return `You've completed LAB ${LAB_NUMBER} at 100% — so I can share it now. The completion key (it unlocks Lab ${LAB_NUMBER + 1}) is: ${completionKey()}\nYou'll also find it on the /complete page, together with your certificate.`;
    return `I don't have the completion key yet — not even me. The key only exists once this lab reaches 100%; it is then shown on the /complete page and handed to me. You're at ${pct}% (${done}/${TESTS.length} tests). Keep going!`;
  }

  // Progress.
  if (/(progress|status|score|percent|how am i|my %)/.test(msg)) {
    const lines = FEATURES.map(f => { const s = featureStats(f); return `• ${f}: ${s.done}/${s.total} tests (${s.attempts} attempts)`; });
    return `Your LAB ${LAB_NUMBER} progress: ${done}/${TESTS.length} tests — ${pct}%.\n${lines.join('\n')}`;
  }

  // Feature / test counts and names (the map is public; the HOW is locked).
  const feature = findFeature(msg);
  const test = findTest(msg);
  const wantsHow = /(how|guide|steps|step by step|bypass|exploit|solve|do it|help|stuck|hint me through|walkthrough)/.test(msg);
  if (feature && !wantsHow) {
    const s = featureStats(feature);
    return `${feature} has ${s.total} test(s): ${s.tests.map(t => `'${t.name}' (${t.difficulty}${state.tests[t.id] ? ', ✓ done' : ''})`).join('; ')}. You've tried this feature ${s.attempts} time(s). Every test's hints are on /tests — and my step-by-step help for this feature unlocks after 3 genuine tries.`;
  }
  if (!feature && !test && /(features|how many|list|what tests|which tests|tests are)/.test(msg)) {
    return `LAB ${LAB_NUMBER} — ${LAB_NAME} has ${FEATURES.length} features and ${TESTS.length} tests:\n` + FEATURES.map(f => { const s = featureStats(f); return `• ${f}: ${s.total} tests (${s.done} done)`; }).join('\n');
  }

  // Step-by-step help — the 3-try lock.
  if (wantsHow || test) {
    const f = feature || (test && test.feature) || null;
    if (!f) {
      const nx = nextOpenTest();
      return nx ? `Tell me which feature you want help with (e.g. 'how do I do the loyalty tests?'). A good next target: '${nx.name}' in ${nx.feature}. Remember: my step-by-step help for a feature unlocks after you've tried that feature at least 3 times — hints on /tests are always free.`
                 : "Everything is complete — see /complete for your summary, key and certificate!";
    }
    const s = featureStats(f);
    const allPassed = s.done === s.total;
    if (s.attempts >= 3 || allPassed) {
      const targets = test && test.feature === f ? [test] : s.tests.filter(t => !state.tests[t.id]);
      const list = (targets.length ? targets : s.tests).map(t => `▸ ${t.name}: ${t.guide}`).join('\n');
      return `You've put in ${s.attempts} attempt(s) on ${f}, so here's the step-by-step:\n${list}`;
    }
    return `That feature is locked for help. First try the ${f} tests yourself at least 3 times — I can see you've tried ${s.attempts} time(s) so far. After 3 real tries, ask me again and I'll guide you step by step. (The hints on /tests are always available.)`;
  }

  // What next.
  if (/(next|start|begin|what (should|to)|suggest)/.test(msg)) {
    const nx = nextOpenTest();
    if (!nx) return "Nothing left — you're at 100%! Open /complete for the summary, your completion key and your certificate.";
    return `Next up: '${nx.name}' (${nx.feature}, ${nx.difficulty}). Open /tests for its hints. My step-by-step help for ${nx.feature} unlocks after 3 tries on that feature — you've made ${state.attempts[nx.feature] || 0} so far.`;
  }
  if (/(hint)/.test(msg))
    return "Hints live right beside every test on the /tests page — three per test, from a nudge to a near-answer. My own step-by-step guidance is stricter: it unlocks for a feature after you've tried it at least 3 times.";

  if (/^(hi|hello|hey|yo|salut)\b/.test(msg))
    return `Hi! I'm Hexa, the LAB ${LAB_NUMBER} — ${LAB_NAME} assistant. This lab has ${FEATURES.length} features and ${TESTS.length} security tests; you're at ${pct}%. Ask me about a feature (e.g. 'loyalty'), your progress, or what to try next.`;

  return "I can help with: this lab's features and test counts, your progress, what to try next, and step-by-step guidance for any feature you've tried at least 3 times. Try asking 'how do I do the loyalty tests?' or 'what's my progress?'";
}

/* Key material — shard set D (fragments only). */
const _shD = ['LTNVVQ==', 'LUozVw==', 'SDZIMg==', 'N1NQSg=='];

/* ============================== SYSTEM PAGES ============================== */

function testsPage(req) {
  const groups = FEATURES.map(f => {
    const s = featureStats(f);
    const cards = s.tests.map(t => {
      const doneIt = !!state.tests[t.id];
      const hintBtns = t.hints.map((h, i) => `
        <span style="display:inline-block;margin:2px 0">
          <button class="noprint" style="background:#607d5a;padding:4px 10px;font-size:12px" onclick="var s=this.parentNode.querySelector('span');s.style.display='inline';this.remove()">💡 Hint ${i + 1}</button>
          <span style="display:none;background:#fffde7;border:1px solid #ffe082;border-radius:6px;padding:3px 8px">${esc(h)}</span>
        </span>`).join(' ');
      return `<div class="card" style="margin:10px 0">
        <h3 style="margin:2px 0">${doneIt ? '✅' : '○'} ${esc(t.name)} ${doneIt ? '<small style="color:#2e7d32">— COMPLETE</small>' : ''}</h3>
        <small>${esc(t.owasp)} · ${esc(t.difficulty)}</small>
        <div style="margin-top:6px">${hintBtns}</div>
      </div>`;
    }).join('');
    return `<h2 style="margin-top:26px">${esc(f)} <small>(${s.done}/${s.total} done · ${s.attempts} attempts on this feature)</small></h2>${cards}`;
  }).join('');
  return layout(req, 'Mission — Tests', `
    <h1>🧪 LAB ${LAB_NUMBER} Mission — all ${TESTS.length} tests</h1>
    <p>Tests complete <b>by doing</b>: the lab watches for each exploit actually succeeding. Your progress
    (${doneCount()}/${TESTS.length} · ${labPct()}%) is saved automatically and survives restarts.
    Every test has three hints. The assistant (bottom-right) gives step-by-step help for a feature only after
    you've genuinely tried that feature at least <b>3 times</b>.</p>${groups}`);
}

function completePage(req) {
  if (!isComplete()) {
    const left = TESTS.filter(t => !state.tests[t.id]);
    return layout(req, 'Completion', `<h1>🏆 LAB ${LAB_NUMBER} completion</h1>
      <div class="warn">Not yet — you're at ${labPct()}% (${doneCount()}/${TESTS.length} tests).
      Still to complete:</div>
      <ul>${left.map(t => `<li>${esc(t.name)} <small>(${esc(t.feature)}, ${esc(t.difficulty)})</small></li>`).join('')}</ul>
      <p><a class="btn" href="/tests">Back to the mission</a></p>`);
  }
  const totalFeatures = FEATURES.length;
  const perFeature = FEATURES.map(f => { const s = featureStats(f); return `<tr><td>${esc(f)}</td><td>${s.total} vulnerabilities</td><td>${s.attempts} attempts recorded</td></tr>`; }).join('');
  const ways = TESTS.map((t, i) => `<li><b>${esc(t.name)}</b> — ${esc(t.owasp)} (${esc(t.feature)})</li>`).join('');
  const learned = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('');
  const client = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('');
  const reporting = TESTS.map(t => `<li><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)}. Remediation: ${esc(t.report.remediation)}</li>`).join('');
  const dateStr = state.completedAt ? state.completedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
  return layout(req, 'Lab complete!', `
    <h1>🏆 LAB ${LAB_NUMBER} — ${LAB_NAME}: 100% COMPLETE</h1>
    <div class="ok"><b>Congratulations.</b> You completed all ${TESTS.length} security tests on ${dateStr}. Your certificate and your next-lab key are below.</div>
    <h2>1 · What this lab contained</h2>
    <p>This lab had <b>${totalFeatures} features</b> and <b>${TESTS.length} vulnerabilities</b> in total:</p>
    <table><tr><th>Feature</th><th>Vulnerabilities</th><th>Your effort</th></tr>${perFeature}</table>
    <h2>2 · How the testing was done — ${TESTS.length} techniques</h2><ol>${ways}</ol>
    <h2>3 · What you learned</h2><ul>${learned}</ul>
    <h2>4 · What this means for a real client</h2>
    <p>If this were a paying client's live supermarket, these are the findings you would be handing them — and the harm you just protected them from:</p><ul>${client}</ul>
    <h2>5 · Writing it in a real report</h2>
    <p>Each finding above is written up like this in a professional penetration-test report:</p><ul>${reporting}</ul>
    <h2>6 · Your completion key</h2>
    <div class="card" style="text-align:center"><p>Use this key to unlock <b>Lab ${LAB_NUMBER + 1}</b>:</p>
    <p style="font-size:24px;letter-spacing:1px"><b>${esc(completionKey())}</b></p>
    <p><small>Guard it like a password — it is your proof of completing LAB ${LAB_NUMBER}.</small></p></div>
    <h2>Your certificate</h2>
    <form method="POST" action="/complete/name"><label>Name for the certificate
      <input name="testerName" value="${esc(state.testerName || '')}" placeholder="Your name"></label>
      <button>Save name</button> <a class="btn" href="/certificate">🎓 View certificate</a></form>`);
}

function certificatePage(req) {
  if (!isComplete()) return null;
  const name = state.testerName || (currentUser(req) ? currentUser(req).name : '') || 'HexaCyberLab Tester';
  const dateStr = state.completedAt ? state.completedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
  return layout(req, 'Certificate', `
    <div class="cert">
      <img src="/logo.png" alt="HexaCyberLab" style="height:84px">
      <h1 style="margin:8px 0">Certificate of Completion</h1>
      <p>This certifies that</p>
      <h2 style="margin:4px 0;color:#2e7d32">${esc(name)}</h2>
      <p>has completed <b>100%</b> of the security tests in</p>
      <h3 style="margin:4px 0">LAB ${LAB_NUMBER} — ${LAB_NAME}</h3>
      <p>${TESTS.length} tests across ${FEATURES.length} features · Completed ${dateStr}</p>
      <p style="margin-top:18px"><small>HexaCyberLab — Built by Md. Jony Hassain, Founder</small></p>
    </div>
    <p class="noprint" style="text-align:center;margin-top:14px"><button onclick="window.print()">🖨️ Print / save as PDF</button>
    <a class="btn" href="/complete">Back to completion summary</a></p>`);
}

/* ============================== ROUTES ============================== */

async function route(req, res) {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const path = url.pathname;
  const method = req.method;

  try {
    /* ---------- Always-available system endpoints ---------- */
    if (path === '/logo.png' && method === 'GET') {
      try {
        const data = fs.readFileSync(require('path').join(__dirname, 'logo.png'));
        res.writeHead(200, { 'Content-Type': 'image/png' });
        return res.end(data);
      } catch (_) { return send(res, 404, 'logo missing'); }
    }
    if (path === '/api/progress' && method === 'GET') {
      const features = {};
      for (const f of FEATURES) { const s = featureStats(f); features[f] = { total: s.total, done: s.done, attempts: s.attempts }; }
      return sendJson(res, 200, { lab: LAB_NAME, number: LAB_NUMBER, unlocked: state.unlocked, total: TESTS.length, done: doneCount(), pct: labPct(), features, complete: isComplete() });
    }
    if (path === '/api/chat' && method === 'POST') {
      const body = await readBody(req);
      return sendJson(res, 200, { reply: chatReply(body.message) });
    }
    if (path === '/unlock' && method === 'POST') {
      const body = await readBody(req);
      const given = String(body.key || '').trim();
      if (given && given === entryKey()) {
        state.unlocked = true; saveState();
        return redirect(res, '/');
      }
      return send(res, 401, gatePage(true));
    }

    /* ---------- The gate: until unlocked, ONLY the gate exists ---------- */
    if (!state.unlocked) return send(res, 200, gatePage(false));

    /* ---------- System pages ---------- */
    if (path === '/tests' && method === 'GET') return send(res, 200, testsPage(req));
    if (path === '/complete' && method === 'GET') return send(res, 200, completePage(req));
    if (path === '/complete/name' && method === 'POST') {
      const body = await readBody(req);
      state.testerName = String(body.testerName || '').slice(0, 80); saveState();
      return redirect(res, '/certificate');
    }
    if (path === '/certificate' && method === 'GET') {
      const page = certificatePage(req);
      if (!page) return redirect(res, '/complete');
      return send(res, 200, page);
    }

    /* ---------- Public data API (deliberate flaw: no authentication) ---------- */
    if (path === '/api/customers' && method === 'GET') {
      attempt('Platform & Data Exposure');
      pass('platform-api-exposure');
      // Leftover "partner integration" endpoint: dumps every customer record.
      return sendJson(res, 200, users.map(u => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, address: u.address, role: u.role, loyaltyPoints: u.loyaltyPoints, storeCredit: u.storeCredit })));
    }

    /* ---------- Home / catalogue / search ---------- */
    if (path === '/' && method === 'GET') {
      const q = url.searchParams.get('q');
      let list = products;
      let note = '';
      if (q) {
        attempt('Product Search');
        /*
         * VULN (SQL-injection-style search): the search builds a naive
         * string "query" and evaluates fragments. Classic payloads such as
         *   ' OR '1'='1      or      rice' OR 1=1 --
         * bypass the intended filter and return EVERY product.
         */
        const fakeQuery = `SELECT * FROM products WHERE name LIKE '%${q}%'`;
        const lowered = q.toLowerCase();
        if (lowered.includes("' or '") || lowered.includes('or 1=1') || lowered.includes("' or 1=1") || lowered.includes('" or "')) {
          pass('search-sqli');
          note = `<div class="warn">⚠️ Query executed: <code>${esc(fakeQuery)}</code> — filter bypassed, returning all rows.</div>`;
          list = products;
        } else {
          list = products.filter(p => p.name.toLowerCase().includes(lowered) || p.aisle.toLowerCase().includes(lowered));
        }
        // VULN (reflected XSS): the search term is printed back UNESCAPED in the results line.
        if (XSS_RE.test(q)) pass('search-reflected-xss');
        note += `<p>Showing results for: <b>${q}</b></p>`;
      }
      const aisles = [...new Set(list.map(p => p.aisle))];
      const sections = aisles.map(a => `
        <h2>${esc(a)}</h2><div class="grid">
        ${list.filter(p => p.aisle === a).map(p => `
          <div class="card"><span class="aisle">${esc(p.aisle)}</span>
            <h3><a href="/product/${p.id}">${esc(p.name)}</a></h3>
            <div class="price">${money(p.price)}</div>
            <small>per ${esc(p.unit)} · Stock: ${p.stock}${p.stock < 100 ? ' · ⚠️ low stock' : ''}</small>
            <form method="POST" action="/cart/add">
              <input type="hidden" name="productId" value="${p.id}">
              <label>Qty <input type="number" name="qty" value="1" style="width:80px"></label>
              <button type="submit">Add to cart</button>
            </form>
            <small>Bulk: 10+ units = 5% off · 25+ = 10% off · 50+ = 15% off</small>
          </div>`).join('')}
        </div>`).join('');
      return send(res, 200, layout(req, 'Home', `
        <h1>Fresh groceries, bulk savings 🛒</h1>
        <form method="GET" action="/"><input name="q" placeholder="Search products… (try a search payload)" value="${esc(q || '')}"><button>Search</button></form>
        ${note}${sections || '<p>No products found.</p>'}`));
    }

    /* ---------- Product detail + reviews ---------- */
    const prodMatch = path.match(/^\/product\/(\d+)$/);
    if (prodMatch && method === 'GET') {
      const p = findProduct(prodMatch[1]);
      if (!p) return send(res, 404, layout(req, '404', '<h1>Product not found</h1>'));
      const rs = reviews.filter(r => r.productId === p.id);
      return send(res, 200, layout(req, p.name, `
        <div class="card"><span class="aisle">${esc(p.aisle)}</span><h1>${esc(p.name)}</h1>
        <div class="price">${money(p.price)}</div><p>per ${esc(p.unit)} · Stock: ${p.stock}</p>
        <form method="POST" action="/cart/add"><input type="hidden" name="productId" value="${p.id}">
        <label>Qty <input type="number" name="qty" value="1" style="width:90px"></label><button>Add to cart</button></form></div>
        <h2>Reviews</h2>
        ${rs.map(r => `<div class="card"><b>${esc(r.author)}</b> — ${'⭐'.repeat(Math.max(1, Math.min(5, r.rating || 5)))}<p>${r.text}</p></div>`).join('') || '<p>No reviews yet.</p>'}
        <h3>Write a review</h3>
        <form method="POST" action="/product/${p.id}/review">
          <label>Rating <select name="rating"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></label>
          <label>Review <textarea name="text" rows="3" required></textarea></label>
          <button>Post review</button></form>`));
      // NOTE: r.text is rendered UNESCAPED above -> stored XSS in reviews.
    }
    const reviewMatch = path.match(/^\/product\/(\d+)\/review$/);
    if (reviewMatch && method === 'POST') {
      const me = requireLogin(req, res); if (!me) return;
      const body = await readBody(req);
      attempt('Reviews');
      const p = findProduct(reviewMatch[1]);
      if (!p) return redirect(res, '/');
      // Stored XSS: review text is stored and later rendered without encoding.
      if (XSS_RE.test(String(body.text || ''))) pass('reviews-stored-xss');
      reviews.push({ id: nextReviewId++, productId: p.id, userId: me.id, author: me.name, text: String(body.text || ''), rating: Number(body.rating) || 5 });
      return redirect(res, `/product/${p.id}`);
    }

    /* ---------- Auth ---------- */
    if (path === '/register' && method === 'GET')
      return send(res, 200, layout(req, 'Register', `<h1>Create account</h1>
        <form method="POST" action="/register"><label>Name <input name="name" required></label>
        <label>Email <input name="email" type="email" required></label>
        <label>Password <input name="password" type="password" required></label>
        <button>Register</button></form>`));
    if (path === '/register' && method === 'POST') {
      const body = await readBody(req);
      attempt('Registration & Profile');
      if (findUserByEmail(body.email)) return send(res, 400, layout(req, 'Register', '<div class="warn">Email already registered.</div>'));
      // VULN: no password policy at all — even a 1-character password is accepted.
      if (String(body.password || '').length < 4) pass('profile-weak-password');
      const u = { id: nextUserId++, name: String(body.name || 'Customer'), email: String(body.email).toLowerCase(),
        pass: String(body.password || ''), role: 'customer', loyaltyPoints: 100, storeCredit: 0, phone: '', address: '' };
      users.push(u); setSession(res, u); return redirect(res, '/');
    }
    if (path === '/login' && method === 'GET')
      return send(res, 200, layout(req, 'Login', `<h1>Login</h1>
        <form method="POST" action="/login"><label>Email <input name="email" type="email" required></label>
        <label>Password <input name="password" type="password" required></label>
        <button>Login</button></form><p><a href="/forgot">Forgot password?</a></p>
        <div class="card"><b>Test accounts</b><br>admin@hexamart.local / Admin@123<br>supplier@hexamart.local / Supply@123<br>rahim@example.com / User@123 · sara@example.com / User@123</div>`));
    if (path === '/login' && method === 'POST') {
      const body = await readBody(req);
      attempt('Login & Authentication');
      const ip = req.socket.remoteAddress || 'local';
      enumTrack[ip] = enumTrack[ip] || { noUser: false, wrongPass: false, forgotHit: false, forgotMiss: false };
      /*
       * VULN (SQLi login bypass): a legacy path still builds the login
       * "query" by string concatenation. An injected email makes the
       * WHERE clause true and the password check is commented out —
       * the attacker is logged in as the user named before the quote
       * (or the first account, the manager, if none matches).
       */
      if (looksInjected(body.email) || looksInjected(body.password)) {
        const prefix = String(body.email || '').split("'")[0].trim().toLowerCase();
        const victim = findUserByEmail(prefix) || users[0];
        pass('auth-sqli-login');
        setSession(res, victim); return redirect(res, '/');
      }
      const u = findUserByEmail(body.email);
      if (!u) {
        // VULN (enumeration): the message confirms the account does NOT exist.
        enumTrack[ip].noUser = true;
        if (enumTrack[ip].wrongPass) pass('auth-enumeration');
        return send(res, 401, layout(req, 'Login', '<div class="warn">No account is registered with that email.</div>'));
      }
      if (u.pass !== String(body.password)) {
        // VULN (enumeration): a different message confirms the account DOES exist.
        enumTrack[ip].wrongPass = true;
        if (enumTrack[ip].noUser) pass('auth-enumeration');
        // VULN (brute force): failures are counted for the lab's detection,
        // but NOTHING ever throttles, delays or locks — the 10th failure is
        // processed exactly like the 1st.
        failedLogins[u.email] = (failedLogins[u.email] || 0) + 1;
        if (failedLogins[u.email] >= 10) pass('auth-brute-force');
        return send(res, 401, layout(req, 'Login', '<div class="warn">Incorrect password for that account.</div>'));
      }
      failedLogins[u.email] = 0;
      setSession(res, u); return redirect(res, '/');
    }
    if (path === '/logout') { res.setHeader('Set-Cookie', 'hm_session=; Path=/; Max-Age=0'); return redirect(res, '/'); }

    /* ---------- Password reset (predictable token) ---------- */
    if (path === '/forgot' && method === 'GET')
      return send(res, 200, layout(req, 'Forgot password', `<h1>Forgot password</h1>
        <form method="POST" action="/forgot"><label>Email <input name="email" type="email" required></label><button>Send reset link</button></form>`));
    if (path === '/forgot' && method === 'POST') {
      const body = await readBody(req);
      attempt('Login & Authentication');
      const ip = req.socket.remoteAddress || 'local';
      enumTrack[ip] = enumTrack[ip] || { noUser: false, wrongPass: false, forgotHit: false, forgotMiss: false };
      const u = findUserByEmail(body.email);
      if (!u) {
        // VULN (enumeration): a visibly different outcome for unknown emails.
        enumTrack[ip].forgotMiss = true;
        if (enumTrack[ip].forgotHit) pass('auth-enumeration');
        return send(res, 200, layout(req, 'Forgot password', '<div class="warn">No account is registered with that email, so no reset link was created.</div>'));
      }
      enumTrack[ip].forgotHit = true;
      if (enumTrack[ip].forgotMiss) pass('auth-enumeration');
      // VULN: token is fully predictable: HM-<userId>-<sequential counter>.
      resetCounter += 1;
      const token = `HM-${u.id}-${1000 + resetCounter}`;
      resetTokens[token] = u.id;
      issuedResetTokens.add(token);
      // Lab convenience: the "email" is simulated on-screen.
      return send(res, 200, layout(req, 'Forgot password',
        `<div class="ok">📧 Simulated email: reset your password here — <a href="/reset?token=${token}">/reset?token=${token}</a></div>`));
    }
    if (path === '/reset' && method === 'GET') {
      const token = url.searchParams.get('token') || '';
      return send(res, 200, layout(req, 'Reset password', `<h1>Reset password</h1>
        <form method="POST" action="/reset"><input type="hidden" name="token" value="${esc(token)}">
        <label>New password <input name="password" type="password" required></label><button>Set new password</button></form>`));
    }
    if (path === '/reset' && method === 'POST') {
      const body = await readBody(req);
      attempt('Login & Authentication');
      const token = String(body.token || '');
      const uid = resetTokens[token];
      const u = uid && findUser(uid);
      if (!u) return send(res, 400, layout(req, 'Reset password', '<div class="warn">Invalid or expired token.</div>'));
      // Detection: a reset that succeeds with a token nobody was issued
      // (pure prediction), or any successful reset of the manager account.
      if (/^HM-\d+-\d+$/.test(token) && (!issuedResetTokens.has(token) || u.id === 1)) pass('auth-reset-token');
      u.pass = String(body.password || '');
      delete resetTokens[token];
      return send(res, 200, layout(req, 'Reset password', '<div class="ok">Password updated. <a href="/login">Login</a></div>'));
    }

    /* ---------- Cart ---------- */
    if (path === '/cart/add' && method === 'POST') {
      const me = requireLogin(req, res); if (!me) return;
      const body = await readBody(req);
      attempt('Cart');
      const p = findProduct(body.productId);
      if (!p) return redirect(res, '/');
      const qty = parseInt(body.qty, 10); // no validation: 0, negative, huge — all accepted
      if (!isNaN(qty) && qty < 0) pass('cart-negative-qty');
      carts[me.id] = carts[me.id] || [];
      const line = carts[me.id].find(i => i.productId === p.id);
      if (line) line.qty += isNaN(qty) ? 1 : qty; else carts[me.id].push({ productId: p.id, qty: isNaN(qty) ? 1 : qty });
      return redirect(res, '/cart');
    }
    if (path === '/cart' && method === 'GET') {
      const me = requireLogin(req, res); if (!me) return;
      const items = (carts[me.id] || []).map(i => ({ ...i, product: findProduct(i.productId) })).filter(i => i.product);
      const total = items.reduce((a, i) => a + i.product.price * i.qty, 0);
      return send(res, 200, layout(req, 'Cart', `<h1>Your cart</h1>
        <table><tr><th>Product</th><th>Price</th><th>Qty</th><th class="right">Line total</th></tr>
        ${items.map(i => `<tr><td>${esc(i.product.name)}</td><td>${money(i.product.price)}</td>
          <td><form method="POST" action="/cart/update" style="display:flex;gap:6px"><input type="hidden" name="productId" value="${i.product.id}">
          <input type="number" name="qty" value="${i.qty}" style="width:80px"><button>Update</button></form></td>
          <td class="right">${money(i.product.price * i.qty)}</td></tr>`).join('')}
        </table><h3 class="right">Cart total: ${money(total)}</h3>
        <p class="right"><a class="btn" href="/checkout">Go to checkout →</a></p>`));
    }
    if (path === '/cart/update' && method === 'POST') {
      const me = requireLogin(req, res); if (!me) return;
      const body = await readBody(req);
      attempt('Cart');
      const q2 = parseInt(body.qty, 10);
      if (!isNaN(q2) && q2 < 0) pass('cart-negative-qty');
      const line = (carts[me.id] || []).find(i => i.productId === Number(body.productId));
      if (line) line.qty = isNaN(q2) ? 0 : q2; // negative stays negative
      return redirect(res, '/cart');
    }

    /* ---------- Checkout ---------- */
    if (path === '/checkout' && method === 'GET') {
      const me = requireLogin(req, res); if (!me) return;
      const items = (carts[me.id] || []).map(i => ({ ...i, product: findProduct(i.productId) })).filter(i => i.product);
      const subtotal = items.reduce((a, i) => a + i.product.price * i.qty, 0);
      // Prices and bulk tier are rendered into the FORM and trusted on POST.
      return send(res, 200, layout(req, 'Checkout', `<h1>Checkout</h1>
        <form method="POST" action="/checkout">
        <table><tr><th>Product</th><th>Qty</th><th>Unit price (editable!)</th><th class="right">Line</th></tr>
        ${items.map((i) => `<tr><td>${esc(i.product.name)}</td><td>${i.qty}</td>
          <td><input name="price_${i.product.id}" value="${i.product.price}" style="width:100px"></td>
          <td class="right">${money(i.product.price * i.qty)}</td></tr>`).join('')}
        </table>
        <label>Delivery address <input name="address" value="${esc(me.address || '')}"></label>
        <label>Bulk discount tier (the server trusts this value!)
          <select name="bulkDiscountPercent"><option value="0">None</option><option value="5">10+ units — 5%</option><option value="10">25+ units — 10%</option><option value="15">50+ units — 15%</option><option value="90">Partner tier — 90%</option></select></label>
        <label>Coupon codes (comma-separated, stackable) <input name="coupons" placeholder="SAVE10,FRESH5"></label>
        <label>Redeem loyalty points at checkout (1 pt = $0.01) <input type="number" name="redeemPoints" value="0"></label>
        <p>Subtotal: <b>${money(subtotal)}</b> · Your store credit: <b>${money(me.storeCredit)}</b> (applied automatically)</p>
        <button>Place order</button></form>`));
    }
    if (path === '/checkout' && method === 'POST') {
      const me = requireLogin(req, res); if (!me) return;
      const body = await readBody(req);
      attempt('Checkout & Payments');
      const cart = carts[me.id] || [];
      const fresh = findUser(me.id);
      let subtotal = 0;
      const totalQty = cart.reduce((a, i) => a + i.qty, 0);
      const orderItems = cart.map(i => {
        const p = findProduct(i.productId);
        // VULN: unit price taken from the CLIENT-submitted field.
        const clientPrice = parseFloat(body[`price_${i.productId}`]);
        if (!isNaN(clientPrice) && clientPrice !== p.price) pass('checkout-price-tamper');
        const price = isNaN(clientPrice) ? p.price : clientPrice;
        // Detection (oversell): an accepted line whose quantity exceeds real stock.
        if (i.qty > p.stock) pass('checkout-oversell');
        subtotal += price * i.qty;
        return { productId: p.id, name: p.name, qty: i.qty, price };
      });
      // VULN: bulk discount percent taken from the client, no tier/quantity check.
      const bulkPct = Math.min(100, Math.max(0, parseFloat(body.bulkDiscountPercent) || 0));
      const qualifiedPct = totalQty >= 50 ? 15 : totalQty >= 25 ? 10 : totalQty >= 10 ? 5 : 0;
      if (bulkPct > qualifiedPct) pass('checkout-bulk-tier');
      let discount = subtotal * (bulkPct / 100);
      // VULN: coupons stack and can be reused unlimited times (even repeated).
      const codes = String(body.coupons || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      couponLedger[me.id] = couponLedger[me.id] || {};
      const applied = [];
      for (const code of codes) {
        const c = coupons.find(x => x.code === code);
        if (c) { applied.push(code); discount += (subtotal - discount) * (c.percent / 100); }
      }
      const seen = new Set();
      let abuse = applied.length > 1; // stacking distinct codes
      for (const code of applied) {
        if (seen.has(code)) abuse = true; // repeated in one request
        if (couponLedger[me.id][code]) abuse = true; // reused across orders
        seen.add(code);
        couponLedger[me.id][code] = (couponLedger[me.id][code] || 0) + 1;
      }
      if (abuse) pass('checkout-coupon-abuse');
      // Loyalty redemption at checkout — also without a balance check.
      const redeem = Math.max(0, parseInt(body.redeemPoints, 10) || 0);
      const balanceBefore = fresh.loyaltyPoints;
      if (redeem > balanceBefore) pass('loyalty-redeem-overdraw');
      fresh.loyaltyPoints -= redeem; // can go negative — no server-side check
      let total = subtotal - discount - redeem * 0.01;
      // Store credit applied (can push the total below zero -> store owes the customer).
      total -= fresh.storeCredit; fresh.storeCredit = 0;
      // Earn points on what was (supposedly) paid.
      if (total > 0) fresh.loyaltyPoints += Math.floor(total);
      cart.forEach(i => { const p = findProduct(i.productId); if (p) p.stock -= i.qty; });
      const order = { id: nextOrderId++, userId: me.id, items: orderItems, subtotal: +subtotal.toFixed(2),
        discount: +discount.toFixed(2), pointsRedeemed: redeem, total: +total.toFixed(2),
        status: 'Processing', address: String(body.address || ''), date: new Date().toISOString().slice(0, 10) };
      orders.push(order);
      carts[me.id] = [];
      return redirect(res, `/receipt/${order.id}`);
    }

    /* ---------- Orders + receipts (IDOR) ---------- */
    if (path === '/orders' && method === 'GET') {
      const me = requireLogin(req, res); if (!me) return;
      const mine = orders.filter(o => o.userId === me.id);
      return send(res, 200, layout(req, 'My orders', `<h1>My orders</h1>
        <table><tr><th>#</th><th>Date</th><th>Status</th><th class="right">Total</th><th></th></tr>
        ${mine.map(o => `<tr><td>${o.id}</td><td>${o.date}</td><td>${esc(o.status)}</td><td class="right">${money(o.total)}</td>
        <td><a href="/orders/${o.id}">View</a> · <a href="/receipt/${o.id}">Receipt</a></td></tr>`).join('')}
        </table>`));
    }
    const orderMatch = path.match(/^\/(orders|receipt)\/(\d+)$/);
    if (orderMatch && method === 'GET') {
      const me = requireLogin(req, res); if (!me) return;
      attempt('Orders & Receipts');
      const o = orders.find(x => x.id === Number(orderMatch[2]));
      if (!o) return send(res, 404, layout(req, '404', '<h1>Order not found</h1>'));
      // VULN (IDOR): NO ownership check — any logged-in user can open any order/receipt.
      const real = findUser(me.id);
      if (o.userId !== me.id && real && real.role !== 'admin')
        pass(orderMatch[1] === 'receipt' ? 'receipt-idor' : 'orders-idor');
      const owner = findUser(o.userId);
      const rows = o.items.map(i => `<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td>${money(i.price)}</td><td class="right">${money(i.price * i.qty)}</td></tr>`).join('');
      const bodyHtml = orderMatch[1] === 'receipt'
        ? `<div class="card"><h1>🧾 Receipt #${o.id}</h1><p>Customer: ${esc(owner ? owner.name : '?')} (${esc(owner ? owner.email : '')})<br>
           Ship to: ${esc(o.address)}<br>Date: ${o.date} · Status: ${esc(o.status)}</p>
           <table><tr><th>Item</th><th>Qty</th><th>Price</th><th class="right">Line</th></tr>${rows}
           <tr><td colspan="3">Subtotal</td><td class="right">${money(o.subtotal)}</td></tr>
           <tr><td colspan="3">Discounts</td><td class="right">−${money(o.discount)}</td></tr>
           <tr><td colspan="3">Points redeemed</td><td class="right">${o.pointsRedeemed}</td></tr>
           <tr><td colspan="3"><b>Total</b></td><td class="right"><b>${money(o.total)}</b></td></tr></table></div>`
        : `<h1>Order #${o.id}</h1><p>Placed by ${esc(owner ? owner.name : '?')} · ${o.date} · ${esc(o.status)}</p>
           <table><tr><th>Item</th><th>Qty</th><th>Price</th><th class="right">Line</th></tr>${rows}</table>
           <p class="right"><b>Total: ${money(o.total)}</b></p><a class="btn" href="/receipt/${o.id}">View receipt</a>`;
      return send(res, 200, layout(req, `Order ${o.id}`, bodyHtml));
    }

    /* ---------- Loyalty ---------- */
    if (path === '/loyalty' && method === 'GET') {
      const me = requireLogin(req, res); if (!me) return;
      const fresh = findUser(me.id);
      return send(res, 200, layout(req, 'Loyalty', `<h1>⭐ HexaMart Loyalty</h1>
        <div class="card"><p>Your balance: <b>${fresh.loyaltyPoints} points</b> · Store credit: <b>${money(fresh.storeCredit)}</b></p>
        <p><small>Earn 1 point per $1 spent. 100 points = $1 store credit.</small></p></div>
        <h2>Redeem points → store credit</h2>
        <form method="POST" action="/loyalty/redeem"><input type="hidden" name="hx_origin" value="hexamart-form"><label>Points to redeem <input type="number" name="points" value="100"></label><button>Redeem</button></form>
        <h2>Transfer points</h2>
        <form method="POST" action="/loyalty/transfer">
          <input type="hidden" name="hx_origin" value="hexamart-form">
          <label>From account (email) <input name="fromEmail" value="${esc(fresh.email)}"></label>
          <label>To account (email) <input name="toEmail" placeholder="friend@example.com"></label>
          <label>Points <input type="number" name="points" value="50"></label>
          <button>Transfer</button></form>`));
    }
    if (path === '/loyalty/redeem' && method === 'POST') {
      const me = requireLogin(req, res); if (!me) return;
      const body = await readBody(req);
      attempt('Loyalty Programme');
      csrfProof(req, body);
      const pts = parseInt(body.points, 10) || 0;
      const fresh = findUser(me.id);
      // VULN: NO balance check — redeem 1,000,000 points with a balance of 240.
      if (pts > fresh.loyaltyPoints) pass('loyalty-redeem-overdraw');
      fresh.loyaltyPoints -= pts;
      fresh.storeCredit += pts * 0.01;
      return send(res, 200, layout(req, 'Loyalty', `<div class="ok">Redeemed ${pts} points → ${money(pts * 0.01)} store credit.<br>
        New balance: ${fresh.loyaltyPoints} pts · Store credit: ${money(fresh.storeCredit)}</div><p><a href="/loyalty">Back to loyalty</a></p>`));
    }
    if (path === '/loyalty/transfer' && method === 'POST') {
      const me = requireLogin(req, res); if (!me) return;
      const body = await readBody(req);
      attempt('Loyalty Programme');
      csrfProof(req, body);
      // VULN: "from" account is taken from the FORM — drain anyone's points, no ownership proof.
      const from = findUserByEmail(body.fromEmail);
      const to = findUserByEmail(body.toEmail);
      const pts = parseInt(body.points, 10) || 0;
      if (!from || !to) return send(res, 400, layout(req, 'Loyalty', '<div class="warn">Account not found.</div>'));
      if (from.id !== me.id) pass('loyalty-transfer-forgery');
      from.loyaltyPoints -= pts;
      to.loyaltyPoints += pts;
      return send(res, 200, layout(req, 'Loyalty', `<div class="ok">Transferred ${pts} points from ${esc(from.email)} to ${esc(to.email)}.</div><p><a href="/loyalty">Back</a></p>`));
    }

    /* ---------- Supplier inventory ---------- */
    if (path === '/supplier' && method === 'GET') {
      const me = requireLogin(req, res); if (!me) return;
      if (me.role !== 'supplier' && me.role !== 'admin') return send(res, 403, layout(req, 'Supplier', '<div class="warn">Suppliers only.</div>'));
      // VULN: supplier sees and edits EVERY product — including competitors' (supplierId 9).
      return send(res, 200, layout(req, 'Supplier inventory', `<h1>📦 Supplier inventory</h1>
        <p><small>Your supplier ID is ${me.id === 2 ? 2 : '—'}. Products marked ★ are yours; the rest belong to other suppliers.</small></p>
        <table><tr><th>Product</th><th>Owner</th><th>Price</th><th>Stock</th><th>Update</th></tr>
        ${products.map(p => `<tr><td>${esc(p.name)}</td><td>${p.supplierId === 2 ? '★ You' : 'Supplier ' + p.supplierId}</td>
          <td>${money(p.price)}</td><td>${p.stock}</td>
          <td><form method="POST" action="/supplier/product/${p.id}" style="display:flex;gap:5px">
            <input type="hidden" name="hx_origin" value="hexamart-form">
            <input name="price" value="${p.price}" style="width:80px"><input name="stock" value="${p.stock}" style="width:80px">
            <button>Save</button></form></td></tr>`).join('')}
        </table>`));
    }
    const supMatch = path.match(/^\/supplier\/product\/(\d+)$/);
    if (supMatch && method === 'POST') {
      const me = requireLogin(req, res); if (!me) return;
      if (me.role !== 'supplier' && me.role !== 'admin') return send(res, 403, layout(req, 'Supplier', '<div class="warn">Suppliers only.</div>'));
      const body = await readBody(req);
      attempt('Supplier Console');
      csrfProof(req, body);
      const p = findProduct(supMatch[1]);
      // VULN (broken access control): no check that this supplier owns the product.
      const real = findUser(me.id);
      if (p && real && real.role === 'supplier' && p.supplierId !== 2) pass('supplier-bac');
      if (p) { const pr = parseFloat(body.price); const st = parseInt(body.stock, 10); if (!isNaN(pr)) p.price = pr; if (!isNaN(st)) p.stock = st; }
      return redirect(res, '/supplier');
    }

    /* ---------- Profile ---------- */
    if (path === '/profile' && method === 'GET') {
      const me = requireLogin(req, res); if (!me) return;
      const fresh = findUser(me.id);
      return send(res, 200, layout(req, 'Profile', `<h1>Profile & settings</h1>
        <p>Welcome back, ${fresh.name}!</p>
        <form method="POST" action="/profile/update">
          <input type="hidden" name="hx_origin" value="hexamart-form">
          <label>Name <input name="name" value="${esc(fresh.name)}"></label>
          <label>Phone <input name="phone" value="${esc(fresh.phone || '')}"></label>
          <label>Address <input name="address" value="${esc(fresh.address || '')}"></label>
          <button>Save changes</button></form>
        <p><small>No anti-CSRF token protects this app's forms (the lab uses a simple form marker for detection only). The update handler also accepts fields that are not on this form.</small></p>`));
      // NOTE: the greeting above prints fresh.name UNESCAPED -> stored XSS via profile name.
    }
    if (path === '/profile/update' && method === 'POST') {
      const me = requireLogin(req, res); if (!me) return;
      const body = await readBody(req);
      attempt('Registration & Profile');
      csrfProof(req, body);
      const fresh = findUser(me.id);
      if ('loyaltyPoints' in body || 'storeCredit' in body || 'role' in body) pass('profile-mass-assignment');
      if (XSS_RE.test(String(body.name || ''))) pass('profile-stored-xss');
      // VULN (mass assignment): EVERY submitted field is copied onto the user
      // record — including loyaltyPoints, storeCredit and role.
      for (const k of Object.keys(body)) {
        if (k === 'hx_origin') continue;
        if (k === 'loyaltyPoints' || k === 'storeCredit') fresh[k] = Number(body[k]) || 0;
        else fresh[k] = body[k];
      }
      return redirect(res, '/profile');
    }

    /* ---------- Admin ---------- */
    if (path === '/admin' && method === 'GET') {
      const me = requireLogin(req, res); if (!me) return;
      attempt('Admin Panel');
      // Detection: the cookie claims a role the account does not really have.
      const real = findUser(me.id);
      if (real && me._cookieRole && me._cookieRole !== real.role && me.role === 'admin' && real.role !== 'admin') pass('admin-cookie-role');
      if (me.role !== 'admin') return send(res, 403, layout(req, 'Admin', '<div class="warn">Admins only.</div>'));
      const revenue = orders.reduce((a, o) => a + o.total, 0);
      return send(res, 200, layout(req, 'Admin', `<h1>🛠️ Store Manager Dashboard</h1>
        <div class="grid">
          <div class="card"><h3>Revenue</h3><div class="price">${money(revenue)}</div></div>
          <div class="card"><h3>Orders</h3><div class="price">${orders.length}</div></div>
          <div class="card"><h3>Customers</h3><div class="price">${users.length}</div></div>
          <div class="card"><h3>Products</h3><div class="price">${products.length}</div></div>
        </div>
        <h2>All orders</h2><table><tr><th>#</th><th>Customer</th><th>Status</th><th class="right">Total</th></tr>
        ${orders.map(o => { const ow = findUser(o.userId); return `<tr><td><a href="/orders/${o.id}">${o.id}</a></td><td>${esc(ow ? ow.email : '?')}</td><td>${esc(o.status)}</td><td class="right">${money(o.total)}</td></tr>`; }).join('')}</table>
        <h2>All users</h2><table><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Points</th></tr>
        ${users.map(u => `<tr><td>${u.id}</td><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td>${u.loyaltyPoints}</td></tr>`).join('')}</table>`));
    }

    return send(res, 404, layout(req, '404', '<h1>404 — page not found</h1><p><a href="/">Home</a></p>'));
  } catch (err) {
    // Stability: never crash on bad input.
    try { send(res, 500, layout(req, 'Error', `<div class="warn">Something went wrong: ${esc(err.message)}</div>`)); } catch (_) {}
  }
}

const server = http.createServer((req, res) => { route(req, res); });
server.listen(PORT, HOST, () => {
  console.log(`HexaMart lab running at http://${HOST}:${PORT}  (LAB ${LAB_NUMBER} — INTENTIONALLY VULNERABLE — local only)`);
});
