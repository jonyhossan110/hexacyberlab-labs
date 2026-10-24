'use strict';
/*
 * HexaGrocery — LAB 6 of the HexaCyberLab lab programme.
 * INTENTIONALLY VULNERABLE grocery delivery practice lab, with the full
 * HexaCyberLab lab system built in: per-test progress tracking (persisted in
 * progress.json), hints, a lab chatbot with a 3-try help lock, a sequential
 * unlock gate, a completion summary page and a certificate.
 * LOCAL USE ONLY. Zero-dependency Node.js. Business data is in-memory
 * (restart = business reset); LAB PROGRESS persists across restarts.
 * DO NOT deploy. DO NOT expose to a network you do not fully control.
 */
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = 3014;
const HOST = '127.0.0.1';
const LAB_NUMBER = 6;
const LAB_NAME = 'HexaGrocery';
const PREV_LAB = 5;

/* ============================== SEED DATA ============================== */
function seed() {
  const users = [
    { id: 1, email: 'admin@hexagrocery.local', password: 'Admin@123', name: 'Ayesha Admin', role: 'admin', walletBalance: 0 },
    { id: 2, email: 'monir@hexagrocery.local', password: 'User@123', name: 'Monir Hossain', role: 'customer', walletBalance: 25 },
    { id: 3, email: 'ela@hexagrocery.local', password: 'User@123', name: 'Ela Rahman', role: 'customer', walletBalance: 40 },
    { id: 4, email: 'picker@hexagrocery.local', password: 'Picker@123', name: 'Pavel Picker', role: 'picker', walletBalance: 0 },
  ];
  const products = [
    { id: 1, name: 'Organic Bananas 1kg', cat: 'Fresh Food', price: 1.90, stock: 40 },
    { id: 2, name: 'Sourdough Loaf 800g', cat: 'Fresh Food', price: 3.40, stock: 25 },
    { id: 3, name: 'Free-Range Eggs 12pc', cat: 'Dairy & Eggs', price: 4.20, stock: 30 },
    { id: 4, name: 'Whole Milk 2L', cat: 'Dairy & Eggs', price: 2.60, stock: 50 },
    { id: 5, name: 'Greek Yogurt 500g', cat: 'Dairy & Eggs', price: 3.10, stock: 22 },
    { id: 6, name: 'Cheddar Block 400g', cat: 'Dairy & Eggs', price: 5.75, stock: 18 },
    { id: 7, name: 'Chicken Breast 1kg', cat: 'Fresh Food', price: 8.90, stock: 15 },
    { id: 8, name: 'Atlantic Salmon Fillet 500g', cat: 'Fresh Food', price: 12.50, stock: 10 },
    { id: 9, name: 'Baby Spinach 200g', cat: 'Fresh Food', price: 2.20, stock: 35 },
    { id: 10, name: 'Cherry Tomatoes 500g', cat: 'Fresh Food', price: 2.95, stock: 28 },
    { id: 11, name: 'Basmati Rice 5kg', cat: 'Pantry', price: 11.40, stock: 20 },
    { id: 12, name: 'Extra Virgin Olive Oil 750ml', cat: 'Pantry', price: 9.80, stock: 16 },
    { id: 13, name: 'Organic Honey 340g', cat: 'Pantry', price: 7.25, stock: 12 },
    { id: 14, name: 'Truffle Pasta Sauce 350g', cat: 'Pantry', price: 6.60, stock: 9 },
    { id: 15, name: 'Dish Soap 500ml', cat: 'Household', price: 2.45, stock: 45 },
    { id: 16, name: 'Laundry Detergent 3L', cat: 'Household', price: 10.90, stock: 14 },
    { id: 17, name: 'Paper Towels 6 Rolls', cat: 'Household', price: 5.30, stock: 26 },
    { id: 18, name: 'Hand Sanitizer 250ml', cat: 'Household', price: 3.85, stock: 33 },
    { id: 19, name: 'Premium Avocados 4pc', cat: 'Fresh Food', price: 6.40, stock: 0 }, // out of stock -> substitution demo
    { id: 20, name: 'Imported Belgian Chocolate 200g', cat: 'Pantry', price: 8.15, stock: 11 },
  ];
  // Slots for "today": hourly windows with limited picker/driver capacity.
  const slots = [
    { id: 1, label: '08:00 – 09:00', capacity: 4, booked: 1 },
    { id: 2, label: '09:00 – 10:00', capacity: 4, booked: 3 },
    { id: 3, label: '10:00 – 11:00', capacity: 2, booked: 2 }, // FULL — capacity-bypass target
    { id: 4, label: '11:00 – 12:00', capacity: 3, booked: 0 }, // race target
    { id: 5, label: '12:00 – 13:00', capacity: 3, booked: 1 },
    { id: 6, label: '17:00 – 18:00', capacity: 5, booked: 2 },
  ];
  const addresses = [
    { id: 1, userId: 2, label: 'Home', line: '14 Willow Lane, Flat 3B', city: 'Springfield', zip: '01101', phone: '+1 555 0102' },
    { id: 2, userId: 3, label: 'Home', line: '88 Harbor Road, Apt 12', city: 'Springfield', zip: '01103', phone: '+1 555 0119' },
  ];
  const coupons = [
    { code: 'FRESH10', pct: 10 },
    { code: 'GROCERY20', pct: 20 },
    { code: 'WELCOME15', pct: 15 },
  ];
  return { users, products, slots, addresses, coupons, orders: [], sessions: {}, resets: {}, nextOrderId: 1001, nextAddrId: 3 };
}
let DB = seed();

/* display fragments (assembled at runtime where needed) */
const _p1 = 'MEwtWEg=';
const _p2 = 'VEtUNzg=';

/* ============================== LAB PROGRESS ENGINE ============================== */
const PROG_PATH = path.join(__dirname, 'progress.json');
function loadProg() {
  try {
    const p = JSON.parse(fs.readFileSync(PROG_PATH, 'utf8'));
    if (p && typeof p === 'object') return { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false, ...p };
  } catch (e) { /* first run */ }
  return { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
}
let PROG = loadProg();
function saveProg() { try { fs.writeFileSync(PROG_PATH, JSON.stringify(PROG, null, 2)); } catch (e) { /* read-only fs: progress stays in memory */ } }
function doneCount() { return TESTS.reduce((n, t) => n + (PROG.tests[t.id] ? 1 : 0), 0); }
function isComplete() { return doneCount() >= TESTS.length; }
function pass(testId) {
  if (PROG.tests[testId]) return;
  PROG.tests[testId] = true;
  if (isComplete() && !PROG.completedAt) { PROG.completedAt = new Date().toISOString(); PROG.keyRevealed = true; }
  saveProg();
}
function attempt(feature) { PROG.attempts[feature] = (PROG.attempts[feature] || 0) + 1; saveProg(); }
function featureStats() {
  const out = {};
  for (const t of TESTS) {
    if (!out[t.feature]) out[t.feature] = { total: 0, done: 0, attempts: PROG.attempts[t.feature] || 0 };
    out[t.feature].total += 1;
    if (PROG.tests[t.id]) out[t.feature].done += 1;
  }
  return out;
}

/* more display fragments */
const _p5 = 'N0I3VQ==';
const _p6 = 'NUIzLTc=';

/* ============================== FEATURES ============================== */
const F_AUTH = 'Login & Authentication';
const F_SESS = 'Session & Access Control';
const F_REG = 'Registration & Profile';
const F_SEARCH = 'Search & Catalogue';
const F_CHECKOUT = 'Cart & Checkout';
const F_SLOTS = 'Delivery Slots';
const F_ORDERS = 'Orders';
const F_ADDR = 'Address Book';
const F_PICKER = 'Picker & Substitutions';
const F_PLATFORM = 'Platform & Data Exposure';

/* ============================== TESTS REGISTRY ============================== */
/* Every test completes only when the server observes the exploit actually
 * succeeding (see the detection hooks in the routes). There is no "mark done". */
const TESTS = [
  { id: 'sqli-login', feature: F_AUTH, name: 'SQL Injection — Login Bypass', owasp: 'A03 Injection', difficulty: 'Intermediate',
    hints: ["The login form's inputs end up inside a query string — punctuation is not escaped.", "Try a quote followed by a logical condition in the email field.", "Email: ' OR '1'='1' --  with any password makes the WHERE clause true and comments out the password check."],
    guide: "Enter email ' OR '1'='1' -- and any password. The string-built query becomes …WHERE email='' OR '1'='1' -- …, so the first user row (the admin) matches and you are logged in without knowing the password.",
    lesson: "String-built queries let attacker input change the query's logic — the classic route around authentication.",
    impact: "On a client site this is full account takeover, including admin, with no credentials — customer data, orders and the business's reputation all exposed.",
    report: { title: 'SQL Injection in Login Form (Authentication Bypass)', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never build SQL by string concatenation.' } },
  { id: 'brute-force', feature: F_AUTH, name: 'Brute Force — No Login Rate Limiting', owasp: 'A07 Authentication Failures', difficulty: 'Beginner',
    hints: ["Nothing slows you down or locks the account — count the failures.", "Script 10 wrong passwords for ela@hexagrocery.local and watch every one get processed.", "The flaw is proven when double-digit failures are all accepted with no throttle, CAPTCHA or lockout."],
    guide: "Submit 10 or more wrong passwords for one account (e.g. ela@hexagrocery.local). Every attempt is processed normally — no delay, lockout or CAPTCHA — so a real attacker would simply keep going with a wordlist.",
    lesson: "Authentication endpoints must throttle: without rate limits, password guessing is free and silent.",
    impact: "Attackers can guess customer and staff passwords at full speed; one weak password becomes an account takeover and a data-breach headline for the client.",
    report: { title: 'Missing Rate Limiting / Account Lockout on Login', severity: 'Medium', remediation: 'Add per-account and per-IP throttling, progressive delays or lockout, and alerting on failure spikes.' } },
  { id: 'user-enum', feature: F_AUTH, name: 'User Enumeration via Error Messages', owasp: 'A07 Authentication Failures', difficulty: 'Beginner',
    hints: ["Compare the login error for an email that exists with one that does not.", "Do the same comparison on the forgot-password form.", "When the two answers differ, an attacker can harvest valid accounts before attacking them."],
    guide: "Log in with a real email (ela@hexagrocery.local) and a wrong password — note the message. Then try a made-up email. The messages differ ('Incorrect password' vs 'No account found'), and /forgot behaves the same way, confirming which accounts exist.",
    lesson: "Different responses for 'no such user' and 'wrong password' turn your login form into an account directory.",
    impact: "Attackers build verified target lists from the client's own site, then focus phishing and password attacks only on real accounts.",
    report: { title: 'Account Enumeration via Distinct Authentication Responses', severity: 'Low', remediation: 'Return one generic message (e.g. "Invalid credentials") for all authentication failures and reset requests.' } },
  { id: 'reset-token', feature: F_AUTH, name: 'Predictable Password-Reset Token', owasp: 'A07 Authentication Failures', difficulty: 'Intermediate',
    hints: ["Request a reset and study what the token must look like — it is built from things you know plus the clock.", "Format: rst-<userId>-<yyyymmddhhmm>. The admin's userId is 1.", "Compute the token for the current minute (try neighbouring minutes for clock skew) and post it to /reset with your own new password."],
    guide: "POST /forgot for admin@hexagrocery.local, then immediately POST /reset with token rst-1-<current yyyymmddhhmm> and a new password. The token is just the user id plus the minute — anyone can mint one; the tokens are never actually emailed anywhere.",
    lesson: "A reset token is a temporary password; if it is predictable, the reset flow is an open door.",
    impact: "Any account — including the client's admin — can be taken over with zero inbox access; from there the whole store is the attacker's.",
    report: { title: 'Weak, Predictable Password-Reset Tokens', severity: 'High', remediation: 'Generate reset tokens from a CSPRNG (≥128 bits), store hashed, single-use, expiring within 30 minutes.' } },
  { id: 'role-cookie', feature: F_SESS, name: 'Privilege Escalation via Unsigned Role Cookie', owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    hints: ["Login sets two cookies. Only one of them is checked properly.", "Your browser lets you edit cookie values — no tools needed.", "Set the role cookie to admin and open /admin."],
    guide: "Log in as any customer, then edit the role cookie from customer to admin (browser dev tools → Application → Cookies) and visit /admin. The server trusts the unsigned cookie, so you get the full dashboard. The same trick with role=picker opens the Picker Desk.",
    lesson: "Authorization data held by the client must be signed or kept server-side — the client can rewrite anything it holds.",
    impact: "Every customer becomes an admin: full order history, customer emails, wallet balances — a complete compromise from one cookie edit.",
    report: { title: 'Client-Side Role Trust (Unsigned Cookie) Allows Privilege Escalation', severity: 'Critical', remediation: 'Keep roles in the server-side session record, or sign tokens (HMAC) and verify on every request.' } },
  { id: 'weak-password', feature: F_REG, name: 'Weak Password Policy at Registration', owasp: 'A07 Authentication Failures', difficulty: 'Beginner',
    hints: ["The registration form never comments on your password choice.", "Try a one-character password.", "If the account is created, the policy is 'anything goes' — evidence enough."],
    guide: "Register a new account with the password 'a'. The account is created without complaint — there is no length or complexity policy at all.",
    lesson: "If users may pick one-character passwords, credential attacks succeed trivially even with rate limiting.",
    impact: "Client customers will choose terrible passwords; the first credential-stuffing list that includes them owns those accounts.",
    report: { title: 'No Password Strength Policy on Registration', severity: 'Low', remediation: 'Enforce a minimum length (≥10 characters) and screen against known-breached password lists.' } },
  { id: 'mass-assign', feature: F_REG, name: 'Mass Assignment — Wallet & Role via Profile Update', owasp: 'A03 / A08 Mass Assignment', difficulty: 'Intermediate',
    hints: ["The profile form shows name and phone. The endpoint accepts more than the form shows.", "Add fields the form never offered — think about what a user record contains.", "POST /profile/update with walletBalance=100000 (and try role=admin while you are there)."],
    guide: "Send POST /profile/update with your session cookie and body name=Monir&walletBalance=100000. The handler assigns the whole body onto your user record, so your wallet becomes $100,000. The same trick with role=admin escalates privileges.",
    lesson: "Never bind request bodies directly onto records — every extra key is a field the attacker gets to write.",
    impact: "Attackers mint store credit out of thin air and can promote themselves to admin — direct financial loss plus full compromise.",
    report: { title: 'Mass Assignment in Profile Update (walletBalance, role)', severity: 'High', remediation: 'Allow-list updatable fields explicitly; change privileged fields only through dedicated authorised flows.' } },
  { id: 'profile-xss', feature: F_REG, name: 'Stored XSS in Display Name', owasp: 'A03 Injection — Stored XSS', difficulty: 'Intermediate',
    hints: ["Your display name is printed back on your profile page — check whether it is encoded there.", "Set your name to a script payload and revisit /profile.", "The payload is stored in the user record, so it fires on every view."],
    guide: "POST /profile/update with name=<script>alert(document.domain)</script>. Open /profile — the greeting renders the name unescaped and the script runs. Stored, so it fires on every view of that name.",
    lesson: "Any stored field that is rendered without encoding is a stored-XSS delivery vehicle.",
    impact: "Attacker scripts run in customers' and staff browsers — session theft, fake payment forms, and defacement under the client's own domain.",
    report: { title: 'Stored Cross-Site Scripting via Profile Display Name', severity: 'High', remediation: 'Output-encode all user-controlled data at render time; add a restrictive Content-Security-Policy.' } },
  { id: 'csrf', feature: F_REG, name: 'CSRF on Profile & Address Changes', owasp: 'A01 — Cross-Site Request Forgery', difficulty: 'Intermediate',
    hints: ["State-changing forms carry no token, and the session cookie has no SameSite attribute.", "A form on another origin will still be submitted with the victim's cookies.", "Host a page that auto-submits a POST to /profile/update and open it while logged in — or replay the POST with a foreign Origin header."],
    guide: "While logged in, have the browser submit a cross-site form to http://127.0.0.1:3014/profile/update (an auto-submitting HTML page works; equivalently, a POST whose Origin is a foreign site). The change is accepted — no token ever proved the request came from the app's own form.",
    lesson: "Cookies ride along on cross-site requests; without tokens the server cannot tell your form from an attacker's.",
    impact: "Victims' profiles, addresses and wallets can be changed silently by any website they visit while logged in — delivery theft and account manipulation.",
    report: { title: 'Cross-Site Request Forgery on State-Changing Forms', severity: 'Medium', remediation: 'Per-session CSRF tokens on all state-changing forms plus SameSite=Lax/Strict cookies; verify Origin as a second layer.' } },
  { id: 'search-sqli', feature: F_SEARCH, name: 'SQL Injection in Product Search', owasp: 'A03 Injection', difficulty: 'Beginner',
    hints: ["The search term is concatenated into a query string and interpreted, not bound as data.", "Speak to it in quotes: a quote, a condition, another quote.", "q = ' OR '1'='1 turns the filter into 'always true'."],
    guide: "Search for ' OR '1'='1. The naive query evaluation treats your input as logic, the WHERE clause becomes always-true, and all 20 products (with stock levels) come back instead of matches.",
    lesson: "Injection happens wherever input is interpreted as code — search boxes are query builders too.",
    impact: "Full catalogue and stock enumeration here; in a SQL-backed client site the same pattern reaches customer tables and credentials.",
    report: { title: 'SQL Injection in Product Search', severity: 'High', remediation: 'Use parameterised queries with bound parameters; treat search terms as opaque literals.' } },
  { id: 'search-xss', feature: F_SEARCH, name: 'Reflected XSS in Search Results', owasp: 'A03 Injection — Reflected XSS', difficulty: 'Beginner',
    hints: ["Your search term is echoed at the top of the results page.", "Check the page source: is your input encoded there?", "Put a script payload in q and watch it come back as code, not text."],
    guide: "Search for <script>alert(1)</script>. The results heading reflects your term without encoding and the payload executes — the classic reflected-XSS delivery via a crafted link.",
    lesson: "Reflected data is still attacker-controlled output; encoding is required at every sink, search results included.",
    impact: "A crafted search link sent to a client customer runs script in their session — phishing and session theft under the client's brand.",
    report: { title: 'Reflected Cross-Site Scripting in Search', severity: 'Medium', remediation: 'Contextually output-encode all reflected input; add CSP as defence in depth.' } },
  { id: 'price-tamper', feature: F_CHECKOUT, name: 'Price Tampering at Checkout', owasp: 'A04 Insecure Design', difficulty: 'Beginner',
    hints: ["The checkout page itself hands you editable price fields — ask why the server trusts them.", "Change the salmon's price_8 field before submitting. Burp or dev tools both work.", "The order is billed at YOUR price, not the catalogue price."],
    guide: "At checkout, edit the unit-price input for Atlantic Salmon (price_8) to 0.01 and place the order. The server bills the submitted value — a $12.50 item for one cent.",
    lesson: "Prices are server-side facts. The client may name products and quantities, never what they cost.",
    impact: "Arbitrary repricing of the whole basket — the oldest e-commerce loss scenario, and it works on every single order.",
    report: { title: 'Client-Side Price Trust at Checkout', severity: 'Critical', remediation: 'Recompute all prices server-side from the catalogue at checkout; ignore client-submitted prices entirely.' } },
  { id: 'neg-fee', feature: F_CHECKOUT, name: 'Negative Delivery-Fee Tampering', owasp: 'A04 Insecure Design', difficulty: 'Beginner',
    hints: ["The delivery fee is a number your browser sends.", "Numbers can be negative. Fees become discounts.", "Checkout with deliveryFee=-50 and compare the total with the basket subtotal."],
    guide: "Place an order with deliveryFee=-50 in the checkout POST. The server adds it without a lower bound, so the 'fee' subtracts $50 from your bill.",
    lesson: "Every client-supplied number needs server-side bounds and, better, a server-side source of truth.",
    impact: "A standing discount of any size on every order — quiet, repeatable revenue leakage for the client.",
    report: { title: 'Unvalidated Delivery Fee Allows Negative Totals', severity: 'High', remediation: 'Compute fees server-side from a tariff table; reject or clamp out-of-range values.' } },
  { id: 'coupon-stack', feature: F_CHECKOUT, name: 'Coupon Stacking & Unlimited Reuse', owasp: 'A04 Insecure Design', difficulty: 'Intermediate',
    hints: ["The coupon field is more flexible than it looks — think lists.", "Codes can be comma-separated, and nothing remembers that you used one.", "coupon=FRESH10,GROCERY20,WELCOME15,FRESH10 compounds the discounts — and works again on the next order."],
    guide: "Checkout with coupon=FRESH10,GROCERY20,WELCOME15,FRESH10. Each percentage is applied in sequence, repeats included, and no redemption is ever recorded, so the same stack works on every order.",
    lesson: "Promotion rules are money rules; they deserve transactional enforcement, not string parsing.",
    impact: "Promotion budgets drain fast: compounding discounts plus zero redemption tracking can take baskets below cost.",
    report: { title: 'Coupon Stacking and Unlimited Reuse', severity: 'Medium', remediation: 'One coupon per order (or an explicit combinable list), per-user redemption records checked transactionally, campaign end dates.' } },
  { id: 'qty-tamper', feature: F_CHECKOUT, name: 'Quantity Tampering (Negative Quantities)', owasp: 'A04 Insecure Design', difficulty: 'Beginner',
    hints: ["Quantities are accepted as sent — the server never asks if they make sense.", "What happens to a line total when qty is -5?", "Add an item with a negative quantity and watch the cart total."],
    guide: "POST /cart/add with productId=4 and qty=-5. The line is stored as sent, the cart total drops below the value of the other items, and checkout happily bills the negative line.",
    lesson: "Quantities are prices in disguise: a negative quantity is a discount the attacker chooses.",
    impact: "Baskets can be discounted or taken negative at will — combined with fee tampering, orders complete at $0 or less.",
    report: { title: 'Missing Quantity Validation (Negative Quantities Accepted)', severity: 'High', remediation: 'Validate quantity server-side as a positive integer within stock limits on every cart and checkout operation.' } },
  { id: 'slot-bypass', feature: F_SLOTS, name: 'Delivery-Slot Capacity Bypass', owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    hints: ["Full slots are only greyed out in the form — that is presentation, not enforcement.", "The checkout POST names the slot by id. Slot 3 (10:00–11:00) is FULL at 2/2.", "Post slotId=3 directly with curl and read /slots afterwards."],
    guide: "Add anything to the cart, then POST /checkout with slotId=3 — the slot the UI calls FULL. The server computes that it is full… and books it anyway. /slots then shows 3/2.",
    lesson: "A disabled option is not a control. Invariants must be enforced where state changes, on the server.",
    impact: "Oversold delivery windows: more orders than drivers, missed promises, refunds and churn on the busiest hour.",
    report: { title: 'Delivery-Slot Capacity Enforced Only in the UI', severity: 'High', remediation: 'Enforce capacity atomically on the server at booking time; reject full slots with 409.' } },
  { id: 'slot-race', feature: F_SLOTS, name: 'Slot Reservation Race Condition', owasp: 'A04 Insecure Design (Race Condition)', difficulty: 'Advanced',
    hints: ["Checkout checks capacity, waits ~120 ms (simulated payment/packing), then commits — with no lock.", "Your job is to get many requests inside that window, all seeing the same 'room available'.", "Fire several parallel checkouts at slot 4 (0/3) — one prepared session each; parallelism is the point."],
    guide: "Prepare several sessions, each with an item in the cart, then fire their /checkout POSTs for slot 4 simultaneously. All of them pass the capacity check before any commit lands, and the slot ends booked far past capacity — check-then-act without atomicity.",
    lesson: "A check followed by an await is not a guarantee. Under concurrency, check and commit must be one indivisible step.",
    impact: "The flagship grocery failure: the last seat sells many times over — late deliveries, broken cold chains, refunds across the whole hour.",
    report: { title: 'Race Condition in Slot Reservation (Check-Then-Act)', severity: 'High', remediation: 'Reserve atomically (guarded increment / per-slot lock) and re-validate at commit time.' } },
  { id: 'order-idor', feature: F_ORDERS, name: "IDOR — Another Customer's Order, Address & Phone", owasp: 'A01 Broken Access Control (IDOR)', difficulty: 'Beginner',
    hints: ["Order ids are sequential from 1001. Nothing checks whose order you open.", "Log in as Ela and open one of Monir's order ids.", "The page includes his delivery address and phone — data you were never meant to see."],
    guide: "As Ela, browse to /orders/<an order id that belongs to Monir>. The full order renders — items, live status, delivery address and phone — because the handler never checks ownership.",
    lesson: "Authentication says who you are; every object access still needs its own authorization check.",
    impact: "Customer PII at scale — names, addresses, phone numbers, purchase history — a privacy breach and stalking risk for every client customer.",
    report: { title: 'Insecure Direct Object Reference on Order Details', severity: 'High', remediation: 'Scope every object lookup by owner (WHERE userId = session user); return 404 for objects owned by other users.' } },
  { id: 'note-xss', feature: F_ORDERS, name: 'Stored XSS in Delivery Note (Hits Staff)', owasp: 'A03 Injection — Stored XSS', difficulty: 'Intermediate',
    hints: ["The delivery note is the one field every driver and admin must read.", "It is rendered without encoding on the order page, the Picker Desk and the Admin dashboard.", "Check out with a script payload as your note and open the Picker Desk."],
    guide: "Place an order with note=<script>alert(document.cookie)</script>. The note is stored and printed raw on /orders/<id>, /picker and /admin — it executes in the browser of every staff member who opens the order.",
    lesson: "Stored XSS aimed at staff views is a privilege-escalation weapon, not a prank.",
    impact: "One customer order can steal a driver's or admin's session — from there, the client's whole operation is exposed.",
    report: { title: 'Stored Cross-Site Scripting in Delivery Note (Staff Views)', severity: 'High', remediation: 'Output-encode the note at every render sink; add CSP as defence in depth.' } },
  { id: 'addr-idor', feature: F_ADDR, name: "IDOR — Edit Another Customer's Address", owasp: 'A01 Broken Access Control (IDOR)', difficulty: 'Intermediate',
    hints: ["Address ids are small and sequential — Monir's Home is id 1.", "/addresses/<id>/edit never asks whose address it is.", "As Ela, POST a new line/phone to /addresses/1/edit."],
    guide: "Logged in as Ela, POST to /addresses/1/edit with your own line and phone. Monir's saved Home address changes — his next delivery goes wherever you pointed it.",
    lesson: "Write paths need ownership checks even more than read paths — a silent edit redirects real goods.",
    impact: "Delivery theft and redirection, support fraud, and a stepping stone to fuller account takeover of the victim.",
    report: { title: 'Insecure Direct Object Reference on Address Edit (Write IDOR)', severity: 'High', remediation: 'Owner-scope address lookups for both read and write; return 404 for addresses owned by other users.' } },
  { id: 'sub-price', feature: F_PICKER, name: 'Substitution Price-Difference Fraud', owasp: 'A04 Insecure Design', difficulty: 'Intermediate',
    hints: ["The substitution form asks the client what to charge for the substitute. That is the bug.", "The picker proposes a product id AND a price — the server believes both.", "Substitute an item with the salmon (id 8) but set price to the original item's price."],
    guide: "As the picker, on any order POST /picker/orders/<id>/substitute with itemName=<the item's exact name>, substituteId=8 (Atlantic Salmon, $12.50) and price=<the original item's price, e.g. 2.60>. The customer is charged your price; the real difference never materialises.",
    lesson: "Substitutions are pricing events: the difference must be computed from server-side prices and shown to the customer.",
    impact: "The out-of-stock recovery flow becomes a discount channel for premium goods — steady margin loss on every affected order.",
    report: { title: 'Client-Supplied Substitution Pricing', severity: 'High', remediation: 'Price substitutes from the product table server-side; present the real difference for customer approval before charging.' } },
  { id: 'data-exposure', feature: F_PLATFORM, name: 'Sensitive Data Exposure via /api/users', owasp: 'A01 Broken Access Control / A05 Misconfiguration', difficulty: 'Beginner',
    hints: ["Not every route is linked. APIs often ship with debug endpoints nobody removed.", "Try the conventional path: /api/users.", "No login is needed — and look at which fields come back."],
    guide: "Open /api/users with no session at all. It returns every account as JSON — emails, roles, wallet balances and passwords — with no authentication whatsoever.",
    lesson: "Unlinked is not the same as protected; anything deployed is part of the attack surface.",
    impact: "One request hands an attacker the client's entire customer list with credentials — instant account takeovers and a reportable data breach.",
    report: { title: 'Unauthenticated API Endpoint Exposes All User Records', severity: 'Critical', remediation: 'Require authentication and authorization on every API route; return minimal fields; remove debug endpoints before release.' } },
];

/* ============================== HELPERS ============================== */
function esc(s) { // used ONLY in a few safe spots; many pages deliberately skip this
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function currentUser(req) {
  const c = parseCookies(req);
  const s = c.session && DB.sessions[c.session];
  if (!s) return null;
  return DB.users.find(u => u.id === s.userId) || null;
}
function roleOf(req) {
  // VULN (role-cookie): role is trusted from an UNSIGNED cookie the client controls.
  const c = parseCookies(req);
  if (c.role) return c.role;
  const u = currentUser(req);
  return u ? u.role : null;
}
function roleRank(r) { return r === 'admin' ? 3 : r === 'picker' ? 2 : r === 'customer' ? 1 : 0; }
function looksXSS(s) { return /<\s*script|<\s*svg|<\s*img[^>]*\son\w+|on\w+\s*=\s*["']?\s*\S/i.test(String(s || '')); }
function isCrossSite(req) {
  const o = req.headers.origin || req.headers.referer || '';
  return !!o && !/127\.0\.0\.1|localhost/.test(o);
}

/* more display fragments */
const _p3 = 'SEZTOFg=';
const _p4 = 'RTlWUQ==';

/* --- detection support state (in-memory; progress itself persists) --- */
const loginFails = {};   // email -> consecutive failure count
const enumProbes = {};   // source ip -> { existing, missing }
function noteEnumProbe(req, exists) {
  const ip = (req.socket && req.socket.remoteAddress) || 'x';
  const pr = enumProbes[ip] || (enumProbes[ip] = {});
  if (exists) pr.existing = true; else pr.missing = true;
  if (pr.existing && pr.missing) pass('user-enum');
}
function naiveInjectLogin(email, password) {
  // Simulates the string-built query: SELECT * FROM users WHERE email='<e>' AND password='<p>'
  // evaluated naively — quote logic in the input is interpreted, exactly like the search flaw.
  const eInj = /'\s*(or|and)\s+'[^']*'\s*=\s*'[^']*'/i.test(email) || /'\s*(or|and)\s+\d+\s*=\s*\d+/i.test(email) || email.includes("'--") || email.includes("' --");
  const pInj = /'\s*(or|and)\s/i.test(password) || password.includes("'--");
  if (eInj) return DB.users[0]; // WHERE email='' OR TRUE --… : first row wins (the admin)
  if (pInj) { const byEmail = DB.users.find(x => x.email === email); if (byEmail) return byEmail; }
  return null;
}
function readBody(req) {
  return new Promise(res => {
    let b = '';
    req.on('data', d => { b += d; if (b.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const o = {};
      try {
        new URLSearchParams(b).forEach((v, k) => { o[k] = v; });
      } catch (e) { /* bad body -> empty */ }
      res(o);
    });
    req.on('error', () => res({}));
  });
}
function readRawBody(req) {
  return new Promise(res => {
    let b = '';
    req.on('data', d => { b += d; if (b.length > 1e6) req.destroy(); });
    req.on('end', () => res(b));
    req.on('error', () => res(''));
  });
}
function money(n) { return '$' + Number(n || 0).toFixed(2); }

/* key assemblers — the pieces live scattered through this file and are only
 * combined at the moment they are legitimately needed. */
function _asm(parts) { return parts.map(x => Buffer.from(x, 'base64').toString('utf8').split('').reverse().join('')).join(''); }
function entryKey() { return _asm([_p1, _p7, _p3, _p9, _p5]); }
function completionKey() { return _asm([_p10, _p6, _p2, _p8, _p4]); }

/* ============================== PAGE LAYOUT ============================== */
const CHAT_WIDGET = `<div id="hxchat" style="position:fixed;right:16px;bottom:16px;z-index:50;font-family:system-ui,Arial,sans-serif">
  <button id="hxchatBtn" style="background:#2e7d32;color:#fff;border:0;border-radius:22px;padding:11px 16px;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.3)">💬 Lab Coach</button>
  <div id="hxchatPanel" style="display:none;width:330px;max-width:92vw;height:420px;background:#fff;border:1px solid #b9cbb2;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.35);flex-direction:column;overflow:hidden">
    <div style="background:#2e7d32;color:#fff;padding:10px 12px;font-weight:600">HexaGrocery Lab Coach</div>
    <div id="hxchatLog" style="flex:1;overflow-y:auto;padding:10px;font-size:13px;line-height:1.45"></div>
    <div style="display:flex;border-top:1px solid #d7e6d0"><input id="hxchatIn" placeholder="Ask about tests, features, your progress…" style="flex:1;border:0;padding:10px;font-size:13px"><button id="hxchatSend" style="background:#43a047;color:#fff;border:0;padding:0 14px;cursor:pointer">Send</button></div>
  </div></div>
<script>
(function(){
  var btn=document.getElementById('hxchatBtn'),panel=document.getElementById('hxchatPanel'),log=document.getElementById('hxchatLog'),inp=document.getElementById('hxchatIn'),snd=document.getElementById('hxchatSend');
  var opened=false;
  function add(who,text){var d=document.createElement('div');d.style.margin='6px 0';d.innerHTML='<b>'+who+':</b> ';d.appendChild(document.createTextNode(text));log.appendChild(d);log.scrollTop=log.scrollHeight;}
  btn.onclick=function(){var show=panel.style.display==='none';panel.style.display=show?'flex':'none';btn.style.display=show?'none':'block';if(show&&!opened){opened=true;add('Coach','Hi! I am the Lab '+${LAB_NUMBER}+' coach. Ask me about the tests, a feature, or your progress.');}};
  function send(){var m=inp.value.trim();if(!m)return;inp.value='';add('You',m);
    fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})}).then(function(r){return r.json();}).then(function(j){add('Coach',j.reply||'…');}).catch(function(){add('Coach','(connection hiccup — try again)');});}
  snd.onclick=send;inp.addEventListener('keydown',function(e){if(e.key==='Enter')send();});
})();
</script>`;
function page(req, title, body, status = 200) {
  const u = currentUser(req);
  const role = roleOf(req);
  const done = doneCount(), total = TESTS.length, pct = Math.floor(done * 100 / total);
  const nav = u
    ? `<a href="/">Shop</a> <a href="/slots">Delivery Slots</a> <a href="/cart">Cart</a> <a href="/orders">My Orders</a> <a href="/addresses">Addresses</a> <a href="/profile">Profile (${esc(u.name)})</a> ${role === 'picker' || role === 'admin' ? '<a href="/picker">Picker Desk</a>' : ''} ${role === 'admin' ? '<a href="/admin">Admin</a>' : ''} <a href="/logout">Logout</a>`
    : `<a href="/">Shop</a> <a href="/login">Login</a> <a href="/register">Register</a>`;
  return { status, html: `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} · HexaGrocery</title><style>
  body{font-family:system-ui,Arial,sans-serif;margin:0;background:#f4f8f1;color:#1d2b1a}
  header{background:#2e7d32;color:#fff;padding:14px 22px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
  header a{color:#dcedc8;margin-right:12px;text-decoration:none;font-size:14px}
  header b{font-size:20px}
  main{max-width:980px;margin:22px auto;padding:0 16px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px}
  .card{background:#fff;border:1px solid #d7e6d0;border-radius:10px;padding:14px}
  .btn{background:#43a047;color:#fff;border:0;border-radius:6px;padding:8px 14px;cursor:pointer;text-decoration:none;display:inline-block}
  .btn.alt{background:#6d4c41}.btn.grey{background:#78909c}
  input,select,textarea{padding:8px;border:1px solid #b9cbb2;border-radius:6px;width:100%;box-sizing:border-box;margin:4px 0 10px}
  table{width:100%;border-collapse:collapse;background:#fff}td,th{border:1px solid #d7e6d0;padding:8px;text-align:left;font-size:14px}
  .warn{background:#fff3e0;border:1px solid #ffb74d;padding:10px;border-radius:8px}
  .ok{background:#e8f5e9;border:1px solid #81c784;padding:10px;border-radius:8px}
  .badge{background:#c8e6c9;border-radius:10px;padding:2px 8px;font-size:12px}
  </style></head><body><header><span style="display:flex;align-items:center;gap:10px"><img src="/logo.png" alt="HexaCyberLab" style="height:36px"><b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b></span><nav>${nav}</nav></header>
  <div style="background:#e8f5e9;border-bottom:1px solid #c8e6c9;padding:7px 22px;font-size:13px">
    LAB ${LAB_NUMBER} · <b>${done}/${total} tests</b> · <b>${pct}%</b> complete
    <span style="display:inline-block;vertical-align:middle;width:180px;height:8px;background:#c8e6c9;border-radius:4px;margin:0 8px"><span style="display:block;height:8px;border-radius:4px;background:#2e7d32;width:${pct}%"></span></span>
    <a href="/tests">Mission / Tests</a> · <a href="/complete">Completion</a>
  </div><main>${body}</main>
  <footer style="text-align:center;color:#7a8a76;font-size:12px;padding:18px">HexaGrocery practice lab — intentionally vulnerable. Local use only.</footer>${CHAT_WIDGET}</body></html>` };
}
function send(res, out, headers = {}) {
  res.writeHead(out.status || 200, { 'Content-Type': 'text/html; charset=utf-8', ...headers });
  res.end(out.html || out);
}
function sendJson(res, obj, status = 200) { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); }
function redirect(res, to, headers = {}) { res.writeHead(302, { Location: to, ...headers }); res.end(); }
const delay = ms => new Promise(r => setTimeout(r, ms));

function gatePage(err) {
  return { status: 200, html: `<!doctype html><html><head><meta charset="utf-8"><title>Locked · LAB ${LAB_NUMBER} — ${LAB_NAME}</title><style>
  body{font-family:system-ui,Arial,sans-serif;margin:0;background:#10240f;color:#e8f5e9;display:flex;align-items:center;justify-content:center;min-height:100vh}
  .card{background:#1d2b1a;border:1px solid #2e7d32;border-radius:14px;padding:34px;max-width:440px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.5)}
  input{padding:11px;border:1px solid #2e7d32;border-radius:6px;width:100%;box-sizing:border-box;margin:12px 0;font-size:15px;text-align:center}
  button{background:#43a047;color:#fff;border:0;border-radius:6px;padding:11px 22px;cursor:pointer;font-size:15px}
  .err{background:#4a1f1f;border:1px solid #b71c1c;padding:9px;border-radius:8px}</style></head><body>
  <div class="card"><img src="/logo.png" alt="HexaCyberLab" style="height:64px">
  <h1>LAB ${LAB_NUMBER} — ${LAB_NAME}</h1>
  <p>🔒 This lab is locked. Paste the completion key from Lab ${PREV_LAB} to start.</p>
  ${err ? '<p class="err">' + esc(err) + '</p>' : ''}
  <form method="POST" action="/unlock"><input name="key" placeholder="Paste the Lab ' + PREV_LAB + ' completion key" autocomplete="off"><button>Unlock Lab ${LAB_NUMBER}</button></form>
  <p style="color:#9fb89b;font-size:12px">HexaCyberLab lab programme — labs unlock in order, one at a time.</p></div></body></html>` };
}

/* ============================== CHATBOT ============================== */
const CHAT_FEATURES = [
  [F_PLATFORM, ['api', 'exposure', 'users list', 'data exposure', 'endpoint']],
  [F_PICKER, ['substitut', 'picker']],
  [F_SLOTS, ['slot', 'capacity', 'race', 'delivery time']],
  [F_ADDR, ['address']],
  [F_ORDERS, ['order', 'note', 'track']],
  [F_CHECKOUT, ['checkout', 'cart', 'coupon', 'fee', 'quantity', 'qty', 'price']],
  [F_SEARCH, ['search', 'catalog']],
  [F_REG, ['register', 'registration', 'profile', 'wallet', 'sign up', 'mass assignment']],
  [F_SESS, ['cookie', 'role', 'session', 'privilege', 'admin']],
  [F_AUTH, ['login', 'log in', 'sign in', 'password', 'forgot', 'reset', 'brute', 'authentication', 'credential', 'enumerat']],
];
function chatReply(rawMsg) {
  const msg = String(rawMsg || '');
  const low = msg.toLowerCase();
  const stats = featureStats();
  const done = doneCount(), total = TESTS.length, pct = Math.floor(done * 100 / total);
  // Attribution — always answered.
  if (/who (built|made|created|developed)|founder|jony|hassain|built this|made this|created this|your creator/.test(low)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  // Completion key — secrecy until 100%.
  if (low.includes('key')) {
    if (isComplete() && PROG.keyRevealed) return 'You completed Lab ' + LAB_NUMBER + ' 100% — here is the completion key that unlocks the next lab: ' + completionKey();
    return "I don't have the completion key yet — it is only given to me when this lab is completed 100%. Finish all " + total + ' tests and I will be able to share it. (Current progress: ' + pct + '%, ' + done + '/' + total + '.)';
  }
  // Progress.
  if (/progress|how am i|score|percent|how many.*(done|complete|solved)|my status/.test(low)) {
    const next = TESTS.find(t => !PROG.tests[t.id]);
    return 'Your progress: ' + done + '/' + total + ' tests complete (' + pct + '%). ' + (next ? 'Next open test: "' + next.name + '" (' + next.feature + ', ' + next.difficulty + '). Full map with hints: /tests.' : 'Everything is done — see /complete for your summary, key and certificate.');
  }
  // Feature matching.
  let feature = null;
  for (const [f, kws] of CHAT_FEATURES) { if (kws.some(k => low.includes(k))) { feature = f; break; } }
  const countsIntent = /how many|list|which|what (tests|vulnerabilities|features|flaws)/.test(low);
  const howIntent = /\bhow\b|guide|steps?|teach|walkthrough|bypass|exploit|hack|help me|stuck/.test(low) && !countsIntent;
  if (feature) {
    const fTests = TESTS.filter(t => t.feature === feature);
    const fDone = fTests.filter(t => PROG.tests[t.id]).length;
    const tries = PROG.attempts[feature] || 0;
    if (howIntent) {
      if (tries >= 3 || fDone >= fTests.length) {
        return 'Here is the step-by-step for ' + feature + ' (your attempts on this feature: ' + tries + '):\n' + fTests.map(t => '• ' + t.name + ' — ' + t.guide).join('\n');
      }
      return 'That feature is locked for help. First try the ' + feature + ' tests yourself at least 3 times — I can see you\'ve tried ' + tries + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step. (The map and hints are on /tests.)';
    }
    return feature + ' has ' + fTests.length + ' test(s), ' + fDone + ' completed, and you have tried this feature ' + tries + ' time(s): ' + fTests.map(t => (PROG.tests[t.id] ? '✓ ' : '○ ') + t.name).join('; ') + '. Ask me "how do I test ' + feature + '" once you have tried it at least 3 times, and I will guide you.';
  }
  if (/features|list|map|tests|vulnerabilities|flaws|what is in|what's in/.test(low)) {
    return 'Lab ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + Object.keys(stats).length + ' features and ' + total + ' tests:\n' + Object.entries(stats).map(([f, s]) => '• ' + f + ': ' + s.total + ' test(s), ' + s.done + ' done, ' + s.attempts + ' attempt(s)').join('\n') + '\nFull map with hints: /tests.';
  }
  if (howIntent) {
    return 'Tell me which feature you are stuck on (for example: "' + TESTS[0].feature + '") and I will check whether you have tried it at least 3 times — that is the rule before I give step-by-step help. Meanwhile, every test on /tests carries 3 graded hints.';
  }
  if (/^(hi|hello|hey|salut|yo)\b/.test(low.trim())) {
    return 'Hi! I am the Lab ' + LAB_NUMBER + ' coach for ' + LAB_NAME + '. This lab has ' + total + ' security tests across ' + Object.keys(stats).length + ' features. You are at ' + pct + '% (' + done + '/' + total + '). Ask me about a feature, your progress, or type a feature name for its test list.';
  }
  return 'I can help with: the feature/test map (ask "list features"), your progress (ask "my progress"), and step-by-step guidance for a feature once you have tried it at least 3 times (ask "how do I test <feature>"). The completion key stays locked until the lab is at 100%.';
}

/* further display fragments */
const _p7 = 'RDU2LTY=';
const _p8 = 'MkVUNi0=';

/* ============================== ROUTES ============================== */
async function route(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  const m = req.method;
  const u = currentUser(req);
  const role = roleOf(req);

  /* ---------- always available: logo, unlock, progress status ---------- */
  if (p === '/logo.png' && m === 'GET') {
    try { const img = fs.readFileSync(path.join(__dirname, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(img); }
    catch (e) { res.writeHead(404); return res.end('no logo'); }
  }
  if (p === '/unlock' && m === 'POST') {
    const b = await readBody(req);
    const given = String(b.key || '').trim();
    if (given && given === entryKey()) { PROG.unlocked = true; saveProg(); return redirect(res, '/'); }
    return send(res, gatePage('That key did not work. Keys come from completing the previous lab.'));
  }
  if (p === '/api/progress' && m === 'GET') {
    const done = doneCount(), total = TESTS.length;
    return sendJson(res, { lab: LAB_NAME, number: LAB_NUMBER, locked: !PROG.unlocked, total, done, pct: Math.floor(done * 100 / total), features: featureStats(), complete: isComplete() });
  }
  if (p === '/api/chat' && m === 'POST') {
    if (!PROG.unlocked) return sendJson(res, { reply: 'This lab is locked. Unlock it with the completion key from Lab ' + PREV_LAB + ' first.' });
    const raw = await readRawBody(req);
    let message = '';
    try { message = JSON.parse(raw).message || ''; } catch (e) { message = new URLSearchParams(raw).get('message') || ''; }
    return sendJson(res, { reply: chatReply(message) });
  }

  /* ---------- sequential-unlock gate (Labs 2–10) ---------- */
  if (!PROG.unlocked) return send(res, gatePage());

  /* ---------- mission / tests page ---------- */
  if (p === '/tests' && m === 'GET') {
    const stats = featureStats();
    const showId = url.searchParams.get('show');
    const showN = Math.min(3, Math.max(0, Number(url.searchParams.get('n') || 0)));
    let html = `<h2>🎯 Mission — Lab ${LAB_NUMBER} tests</h2><p>${doneCount()}/${TESTS.length} complete. A test completes only when the server sees the exploit actually succeed — there is no "mark done". Hints are graded: reveal them one at a time.</p>`;
    for (const [f, s] of Object.entries(stats)) {
      html += `<h3>${esc(f)} — ${s.done}/${s.total} done · ${s.attempts} attempt(s) on this feature</h3>`;
      for (const t of TESTS.filter(t => t.feature === f)) {
        const doneT = !!PROG.tests[t.id];
        let hintsHtml = '';
        if (showId === t.id && showN > 0) {
          hintsHtml = '<ol>' + t.hints.slice(0, showN).map(h => `<li>${esc(h)}</li>`).join('') + '</ol>' +
            (showN < 3 ? `<a href="/tests?show=${t.id}&n=${showN + 1}">Reveal hint ${showN + 1}</a>` : '');
        } else {
          hintsHtml = `<a href="/tests?show=${t.id}&n=1">Show hint 1</a>`;
        }
        html += `<div class="card" style="margin:8px 0"><b>${doneT ? '✓' : '○'} ${esc(t.name)}</b> <span class="badge">${esc(t.difficulty)}</span><br>
          <small>${esc(t.owasp)} · Feature: ${esc(t.feature)} · Status: ${doneT ? '<b>completed</b>' : 'open'}</small><br>${hintsHtml}</div>`;
      }
    }
    return send(res, page(req, 'Mission', html));
  }

  /* ---------- completion page ---------- */
  if (p === '/complete' && m === 'GET') {
    if (!isComplete()) {
      const remaining = TESTS.filter(t => !PROG.tests[t.id]);
      return send(res, page(req, 'Completion', `<h2>Completion — not yet</h2>
        <p>You are at <b>${doneCount()}/${TESTS.length} tests (${Math.floor(doneCount() * 100 / TESTS.length)}%)</b>. The summary page, your completion key and your certificate unlock at 100%.</p>
        <h3>Still open (${remaining.length})</h3><ul>${remaining.map(t => `<li>${esc(t.name)} — ${esc(t.feature)}</li>`).join('')}</ul>
        <p><a href="/tests">Back to the mission page</a></p>`));
    }
    const stats = featureStats();
    const feats = Object.keys(stats);
    const learn = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('');
    const impacts = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('');
    const reports = TESTS.map(t => `<li><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)}. Remediation: ${esc(t.report.remediation)}</li>`).join('');
    return send(res, page(req, 'Lab Complete', `<h2>🎉 Lab ${LAB_NUMBER} — ${LAB_NAME}: 100% complete</h2>
      <div class="ok"><b>Your completion key for Lab ${LAB_NUMBER + 1}:</b><br><span style="font-size:20px;font-family:monospace">${completionKey()}</span><br>
      <small>Keep it safe — paste it into the next lab to unlock it. The Lab Coach can also give it to you now that the lab is complete.</small></div>
      <h3>1 · What this lab contained</h3><p>${feats.length} features, ${TESTS.length} security tests in total.</p>
      <h3>2 · Vulnerabilities per feature</h3><ul>${feats.map(f => `<li>${esc(f)}: ${stats[f].total} test(s)</li>`).join('')}</ul>
      <h3>3 · How the testing was done</h3><p>${TESTS.length} distinct techniques, one per test:</p><ul>${TESTS.map(t => `<li>${esc(t.name)} (${esc(t.owasp)})</li>`).join('')}</ul>
      <h3>4 · What you learned</h3><ul>${learn}</ul>
      <h3>5 · What this means for a real client</h3><ul>${impacts}</ul>
      <h3>6 · Writing it in a real report</h3><ul>${reports}</ul>
      <h3>Your certificate</h3>
      <form method="POST" action="/complete/name"><label>Your name for the certificate<input name="name" value="${esc(PROG.testerName || (u ? u.name : ''))}"></label><button class="btn">Save name</button></form>
      <p><a class="btn" href="/certificate">View / print your certificate →</a></p>`));
  }
  if (p === '/complete/name' && m === 'POST') {
    const b = await readBody(req);
    if (b.name) { PROG.testerName = String(b.name).slice(0, 80); saveProg(); }
    return redirect(res, '/complete');
  }
  if (p === '/certificate' && m === 'GET') {
    if (!isComplete()) return send(res, page(req, 'Certificate', '<p class="warn">The certificate unlocks at 100% completion.</p>'));
    const name = PROG.testerName || (u ? u.name : 'HexaCyberLab Tester');
    const when = PROG.completedAt ? new Date(PROG.completedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const feats = Object.keys(featureStats()).length;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Certificate — Lab ${LAB_NUMBER}</title><style>
    body{font-family:Georgia,serif;background:#eceff1;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh}
    .cert{background:#fff;border:3px double #2e7d32;border-radius:8px;max-width:720px;padding:44px 54px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.2)}
    h1{color:#2e7d32;margin:10px 0} .name{font-size:30px;font-weight:bold;border-bottom:2px solid #c8e6c9;display:inline-block;padding:0 26px 6px;margin:14px 0}
    @media print{body{background:#fff}.noPrint{display:none}}</style></head><body>
    <div class="cert"><img src="/logo.png" alt="HexaCyberLab" style="height:84px">
    <h1>Certificate of Completion</h1>
    <p>This certifies that</p><div class="name">${esc(name)}</div>
    <p>has completed <b>100%</b> of the security tests in</p>
    <p style="font-size:22px"><b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b></p>
    <p>${TESTS.length} tests across ${feats} features · Completed on ${when}</p>
    <p style="margin-top:26px;color:#555">HexaCyberLab — Built by Md. Jony Hassain, Founder</p>
    <p class="noPrint"><button onclick="window.print()">Print / save as PDF</button> · <a href="/complete">Back to summary</a></p></div></body></html>`;
    return send(res, { status: 200, html });
  }

  /* ---------- sensitive data exposure (data-exposure test lives here) ---------- */
  if (p === '/api/users' && m === 'GET') {
    attempt(F_PLATFORM);
    // VULN (data-exposure): unauthenticated dump of every account, passwords included.
    pass('data-exposure');
    return sendJson(res, DB.users.map(x => ({ id: x.id, email: x.email, name: x.name, role: x.role, walletBalance: x.walletBalance, password: x.password })));
  }

  /* ---------- public / catalogue ---------- */
  if (p === '/' && m === 'GET') {
    const cards = DB.products.map(pr => `<div class="card"><h3>${esc(pr.name)}</h3>
      <p>${esc(pr.cat)} · <b>${money(pr.price)}</b><br>Stock: ${pr.stock}${pr.stock === 0 ? ' <span class="badge">OUT OF STOCK</span>' : ''}</p>
      <form method="POST" action="/cart/add"><input type="hidden" name="productId" value="${pr.id}">
      <input type="number" name="qty" value="1"><button class="btn">Add to cart</button></form></div>`).join('');
    return send(res, page(req, 'Shop', `<h2>Fresh groceries, delivered in an hour</h2>
      <form method="GET" action="/search"><input name="q" placeholder="Search groceries… e.g. milk"><button class="btn">Search</button></form>
      <div class="grid">${cards}</div>`));
  }

  if (p === '/search' && m === 'GET') {
    attempt(F_SEARCH);
    const rawQ = url.searchParams.get('q') || '';
    const q = rawQ.toLowerCase();
    // VULN (search-sqli): "SQL-injection-style" search — the term is concatenated into a
    // fake SQL WHERE clause and evaluated naively, so ' OR '1'='1 dumps everything.
    let rows;
    if (q.includes("' or '") || q.includes("' or 1=1") || q.includes("'--")) {
      rows = DB.products.slice(); // injection: WHERE name LIKE '%' OR '1'='1' -> all rows
      pass('search-sqli');
    } else {
      const needle = q.replace(/'/g, '');
      rows = DB.products.filter(pr => (pr.name + ' ' + pr.cat).toLowerCase().includes(needle));
    }
    // DETECTION (search-xss): the term is reflected into the heading UNESCAPED below.
    if (looksXSS(rawQ)) pass('search-xss');
    const list = rows.map(pr => `<div class="card"><h3>${esc(pr.name)}</h3><p>${esc(pr.cat)} · <b>${money(pr.price)}</b> · Stock: ${pr.stock}</p></div>`).join('');
    return send(res, page(req, 'Search', `<h2>Results for "${rawQ}"</h2><div class="grid">${list || '<p>No matches.</p>'}</div>`));
  }

  /* ---------- auth ---------- */
  if (p === '/register' && m === 'GET') return send(res, page(req, 'Register', `<h2>Create account</h2>
    <form method="POST" action="/register"><label>Name<input name="name"></label><label>Email<input name="email"></label>
    <label>Password<input type="password" name="password"></label><button class="btn">Register</button></form>`));
  if (p === '/register' && m === 'POST') {
    attempt(F_REG);
    const b = await readBody(req);
    if (!b.email || !b.password || DB.users.some(x => x.email === b.email)) return send(res, page(req, 'Register', '<p class="warn">Email missing or already registered.</p>', 400));
    // VULN (weak-password): no length/complexity policy at all — a 1-character password is fine.
    const nu = { id: Math.max(...DB.users.map(x => x.id)) + 1, email: b.email, password: b.password, name: b.name || b.email, role: 'customer', walletBalance: 0 };
    DB.users.push(nu);
    if (String(b.password).length <= 3) pass('weak-password');
    return redirect(res, '/login');
  }
  if (p === '/login' && m === 'GET') return send(res, page(req, 'Login', `<h2>Login</h2>
    <form method="POST" action="/login"><label>Email<input name="email"></label><label>Password<input type="password" name="password"></label>
    <button class="btn">Login</button></form><p><a href="/forgot">Forgot password?</a></p>`));
  if (p === '/login' && m === 'POST') {
    attempt(F_AUTH);
    const b = await readBody(req);
    let user = DB.users.find(x => x.email === b.email && x.password === b.password);
    let viaInjection = false;
    if (!user) {
      const exists = DB.users.some(x => x.email === b.email);
      noteEnumProbe(req, exists); // VULN (user-enum): the two failure answers differ observably
      loginFails[b.email] = (loginFails[b.email] || 0) + 1;
      // VULN (brute-force): failures are processed forever — no throttle, lockout or CAPTCHA.
      if (loginFails[b.email] >= 10) pass('brute-force');
      // VULN (sqli-login): the legacy query path interprets quote logic in the input.
      const injUser = naiveInjectLogin(String(b.email || ''), String(b.password || ''));
      if (injUser) { user = injUser; viaInjection = true; }
      if (!user) {
        return send(res, page(req, 'Login', `<p class="warn">${exists ? 'Incorrect password for that account.' : 'No account found for that email.'}</p>`, 401));
      }
    }
    if (viaInjection) pass('sqli-login');
    const sid = crypto.randomBytes(12).toString('hex');
    DB.sessions[sid] = { userId: user.id };
    // NOTE: role cookie is unsigned & client-editable on purpose (role-cookie).
    return redirect(res, '/', { 'Set-Cookie': [`session=${sid}; Path=/; HttpOnly`, `role=${user.role}; Path=/`] });
  }
  if (p === '/logout') {
    const c = parseCookies(req); if (c.session) delete DB.sessions[c.session];
    return redirect(res, '/', { 'Set-Cookie': ['session=; Path=/; Max-Age=0', 'role=; Path=/; Max-Age=0'] });
  }

  /* ---------- password reset (reset-token: predictable token) ---------- */
  if (p === '/forgot' && m === 'GET') return send(res, page(req, 'Forgot', `<h2>Forgot password</h2>
    <form method="POST" action="/forgot"><label>Email<input name="email"></label><button class="btn">Send reset link</button></form>`));
  if (p === '/forgot' && m === 'POST') {
    attempt(F_AUTH);
    const b = await readBody(req);
    const user = DB.users.find(x => x.email === b.email);
    noteEnumProbe(req, !!user); // forgot answers differ too (user-enum)
    if (!user) return send(res, page(req, 'Forgot', '<p class="warn">No account with that email address.</p>'));
    // Token = userId + current minute, trivially guessable: rst-<id>-<yyyymmddhhmm>
    const d = new Date();
    const stamp = '' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0');
    DB.resets['rst-' + user.id + '-' + stamp] = user.id;
    return send(res, page(req, 'Forgot', `<p class="ok">Reset link sent to ${esc(user.email)} — check your inbox. (Lab: nothing actually leaves this box; the token format is the lesson.)</p>`));
  }
  if (p === '/reset' && m === 'GET') return send(res, page(req, 'Reset', `<h2>Reset password</h2>
    <form method="POST" action="/reset"><label>Token<input name="token" value="${esc(url.searchParams.get('token') || '')}"></label>
    <label>New password<input type="password" name="password"></label><button class="btn">Reset</button></form>`));
  if (p === '/reset' && m === 'POST') {
    attempt(F_AUTH);
    const b = await readBody(req);
    const uid = DB.resets[b.token];
    if (!uid) return send(res, page(req, 'Reset', '<p class="warn">Bad token.</p>', 400));
    const user = DB.users.find(x => x.id === uid);
    user.password = b.password; delete DB.resets[b.token];
    // DETECTION (reset-token): tokens are never delivered anywhere — a token that
    // works was necessarily predicted from the public format.
    pass('reset-token');
    return redirect(res, '/login');
  }

  /* ---------- cart (kept in the session) ---------- */
  function cartOf(req) {
    const c = parseCookies(req); const s = c.session && DB.sessions[c.session];
    if (!s) return null; if (!s.cart) s.cart = [];
    return s.cart;
  }
  if (p === '/cart/add' && m === 'POST') {
    if (!u) return redirect(res, '/login');
    attempt(F_CHECKOUT);
    const b = await readBody(req);
    const cart = cartOf(req);
    const pr = DB.products.find(x => x.id === Number(b.productId));
    if (pr) {
      // VULN (qty-tamper): quantity is stored exactly as sent — negative or absurd
      // quantities are never validated, so a line can subtract from the bill.
      const qty = Number.isFinite(Number(b.qty)) ? Number(b.qty) : 1;
      if (qty < 1 || qty > 100) pass('qty-tamper');
      const line = cart.find(l => l.productId === pr.id);
      if (line) line.qty += qty; else cart.push({ productId: pr.id, qty });
    }
    return redirect(res, '/cart');
  }
  if (p === '/cart' && m === 'GET') {
    if (!u) return redirect(res, '/login');
    const cart = cartOf(req);
    const rows = cart.map(l => { const pr = DB.products.find(x => x.id === l.productId); return `<tr><td>${esc(pr.name)}</td><td>${l.qty}</td><td>${money(pr.price * l.qty)}</td></tr>`; }).join('');
    const subtotal = cart.reduce((s, l) => s + DB.products.find(x => x.id === l.productId).price * l.qty, 0);
    return send(res, page(req, 'Cart', `<h2>Your cart</h2><table><tr><th>Item</th><th>Qty</th><th>Line total</th></tr>${rows || '<tr><td colspan=3>Empty</td></tr>'}</table>
      <p>Subtotal: <b>${money(subtotal)}</b></p><a class="btn" href="/slots">Choose a delivery slot →</a>`));
  }

  /* ---------- delivery slots ---------- */
  if (p === '/slots' && m === 'GET') {
    const rows = DB.slots.map(s => `<tr><td>${esc(s.label)}</td><td>${s.booked} / ${s.capacity}</td>
      <td>${s.booked >= s.capacity ? '<span class="badge">FULL (button disabled in UI)</span>' : 'Open'}</td></tr>`).join('');
    return send(res, page(req, 'Slots', `<h2>Today's delivery slots</h2><table><tr><th>Window</th><th>Booked</th><th>Status</th></tr>${rows}</table>
      <p>Pick your slot on the checkout page. Full slots are greyed out there — that is the only place capacity is "enforced".</p>`));
  }

  /* ---------- checkout ---------- */
  if (p === '/checkout' && m === 'GET') {
    if (!u) return redirect(res, '/login');
    const cart = cartOf(req);
    if (!cart.length) return redirect(res, '/cart');
    const slotOpts = DB.slots.map(s => `<option value="${s.id}" ${s.booked >= s.capacity ? 'disabled' : ''}>${esc(s.label)} (${s.booked}/${s.capacity})${s.booked >= s.capacity ? ' — FULL' : ''}</option>`).join('');
    const addrOpts = DB.addresses.filter(a => a.userId === u.id).map(a => `<option value="${a.id}">${esc(a.label)} — ${esc(a.line)}, ${esc(a.city)}</option>`).join('');
    // Client-editable price + fee fields are pre-filled "for convenience" (price-tamper, neg-fee).
    const lines = cart.map(l => { const pr = DB.products.find(x => x.id === l.productId);
      return `<tr><td>${esc(pr.name)}</td><td>${l.qty}</td><td><input style="width:90px" name="price_${pr.id}" value="${pr.price}"></td></tr>`; }).join('');
    return send(res, page(req, 'Checkout', `<h2>Checkout</h2>
      <form method="POST" action="/checkout">
      <table><tr><th>Item</th><th>Qty</th><th>Unit price (editable!)</th></tr>${lines}</table>
      <label>Delivery slot<select name="slotId">${slotOpts}</select></label>
      <label>Delivery address<select name="addressId">${addrOpts}</select></label>
      <label>Delivery fee (USD)<input name="deliveryFee" value="2.99"></label>
      <label>Coupon code<input name="coupon" placeholder="FRESH10"></label>
      <label>Delivery note for the driver<textarea name="note" placeholder="Leave at the door…"></textarea></label>
      <button class="btn">Place order</button></form>`));
  }
  if (p === '/checkout' && m === 'POST') {
    if (!u) return redirect(res, '/login');
    attempt(F_CHECKOUT); attempt(F_SLOTS);
    const b = await readBody(req);
    const cart = cartOf(req);
    if (!cart.length) return redirect(res, '/cart');
    const slot = DB.slots.find(s => s.id === Number(b.slotId));
    if (!slot) return send(res, page(req, 'Checkout', '<p class="warn">Unknown slot.</p>', 400));
    // VULN (slot-bypass / slot-race): capacity is evaluated here, then an async step
    // runs, then the booking is committed unconditionally — the "check" is advisory
    // (a full slot books anyway) and the check-then-act window has no lock (parallel
    // requests that each saw room all commit, overshooting capacity).
    const bookedAtCheck = slot.booked;
    const slotFull = bookedAtCheck >= slot.capacity; // computed… and ignored
    await delay(120); // simulated payment/packing step between CHECK and ACT
    slot.booked += 1;  // unconditional commit
    if (slotFull) pass('slot-bypass');
    else if (slot.booked > slot.capacity) pass('slot-race');
    // VULN (price-tamper): unit prices come from the request body.
    // VULN (neg-fee): delivery fee comes from the request body (negative values not rejected).
    let subtotal = 0; let tampered = false;
    const items = cart.map(l => {
      const pr = DB.products.find(x => x.id === l.productId);
      const unit = b['price_' + pr.id] !== undefined ? Number(b['price_' + pr.id]) : pr.price;
      if (b['price_' + pr.id] !== undefined && Number(b['price_' + pr.id]) !== pr.price) tampered = true;
      subtotal += unit * l.qty;
      return { productId: pr.id, name: pr.name, qty: l.qty, unitPrice: unit, status: pr.stock === 0 ? 'out-of-stock' : 'ok' };
    });
    if (tampered) pass('price-tamper');
    if (Number(b.deliveryFee) < 0) pass('neg-fee');
    let total = subtotal + (Number(b.deliveryFee) || 0);
    // VULN (coupon-stack): coupons stack and can repeat in one request (comma list), no per-user limit.
    let couponNote = ''; let applied = 0;
    if (b.coupon) {
      for (const code of String(b.coupon).split(',').map(s => s.trim()).filter(Boolean)) {
        const cp = DB.coupons.find(c => c.code === code.toUpperCase());
        if (cp) { total = total * (1 - cp.pct / 100); couponNote += code.toUpperCase() + ' '; applied += 1; }
      }
    }
    if (applied >= 2) pass('coupon-stack');
    // DETECTION (note-xss): a script payload stored in the delivery note — it is
    // rendered raw on the order page, the Picker Desk and the Admin dashboard.
    if (looksXSS(b.note)) pass('note-xss');
    const order = {
      id: DB.nextOrderId++, userId: u.id, email: u.email, items, slotId: slot.id, slotLabel: slot.label,
      addressId: Number(b.addressId) || null, deliveryFee: Number(b.deliveryFee) || 0,
      total: Math.round(total * 100) / 100, coupon: couponNote.trim(), note: b.note || '',
      status: 'placed', createdAt: new Date().toISOString(),
    };
    DB.orders.push(order);
    cart.length = 0;
    return redirect(res, '/orders/' + order.id);
  }

  /* ---------- orders ---------- */
  if (p === '/orders' && m === 'GET') {
    if (!u) return redirect(res, '/login');
    const mine = DB.orders.filter(o => o.userId === u.id);
    const rows = mine.map(o => `<tr><td><a href="/orders/${o.id}">#${o.id}</a></td><td>${esc(o.slotLabel)}</td><td>${money(o.total)}</td><td>${esc(o.status)}</td></tr>`).join('');
    return send(res, page(req, 'Orders', `<h2>My orders</h2><table><tr><th>ID</th><th>Slot</th><th>Total</th><th>Status</th></tr>${rows || '<tr><td colspan=4>None yet</td></tr>'}</table>`));
  }
  const orderMatch = p.match(/^\/orders\/(\d+)$/);
  if (orderMatch && m === 'GET') {
    if (!u) return redirect(res, '/login');
    attempt(F_ORDERS);
    const order = DB.orders.find(o => o.id === Number(orderMatch[1]));
    if (!order) return send(res, page(req, 'Order', '<p class="warn">No such order.</p>', 404));
    // VULN (order-idor): NO ownership check — any logged-in user can view/track ANY
    // order, including the delivery address and phone number attached to it.
    if (u.role === 'customer' && order.userId !== u.id) pass('order-idor');
    const addr = DB.addresses.find(a => a.id === order.addressId);
    const lines = order.items.map(i => `<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td>${money(i.unitPrice)}</td><td>${esc(i.status)}${i.substitute ? ' → sub: ' + esc(i.substitute.name) + ' @ ' + money(i.substitute.charged) : ''}</td></tr>`).join('');
    // VULN (note-xss): delivery note rendered UNESCAPED below (also on picker + admin views).
    return send(res, page(req, 'Order #' + order.id, `<h2>Order #${order.id} — live status: <span class="badge">${esc(order.status)}</span></h2>
      <p>Customer: ${esc(order.email)} · Slot: ${esc(order.slotLabel)} · Total: <b>${money(order.total)}</b>${order.coupon ? ' · Coupons: ' + esc(order.coupon) : ''}</p>
      <table><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Status</th></tr>${lines}</table>
      ${addr ? `<p>Deliver to: ${esc(addr.line)}, ${esc(addr.city)} ${esc(addr.zip)} · Phone: ${esc(addr.phone)}</p>` : ''}
      <p>Delivery note: ${order.note}</p>`));
  }

  /* ---------- picker desk: substitution flow ---------- */
  if (p === '/picker' && m === 'GET') {
    if (!u || (role !== 'picker' && role !== 'admin')) return send(res, page(req, 'Picker', '<p class="warn">Picker or admin only.</p>', 403));
    attempt(F_SESS);
    // DETECTION (role-cookie): a gated page reached through a client-forged role.
    { const cRole = parseCookies(req).role; if (cRole && roleRank(cRole) > roleRank(u.role)) pass('role-cookie'); }
    const rows = DB.orders.map(o => `<tr><td><a href="/orders/${o.id}">#${o.id}</a></td><td>${esc(o.email)}</td><td>${esc(o.status)}</td>
      <td>${o.note}</td>
      <td><form method="POST" action="/picker/orders/${o.id}/status"><select name="status"><option>placed</option><option>picking</option><option>out-for-delivery</option><option>delivered</option></select><button class="btn grey">Set</button></form>
      <form method="POST" action="/picker/orders/${o.id}/substitute">
      <input name="itemName" placeholder="original item name" style="width:130px">
      <input name="substituteId" placeholder="sub product id" style="width:90px">
      <input name="price" placeholder="charge price" style="width:90px">
      <button class="btn alt">Propose substitute</button></form></td></tr>`).join('');
    return send(res, page(req, 'Picker Desk', `<h2>Picker desk — live orders</h2>
      <p>Products: ${DB.products.map(pr => pr.id + '=' + esc(pr.name) + ' (' + money(pr.price) + ')').join(' · ')}</p>
      <table><tr><th>Order</th><th>Customer</th><th>Status</th><th>Note (raw)</th><th>Actions</th></tr>${rows || '<tr><td colspan=5>None</td></tr>'}</table>`));
  }
  const subMatch = p.match(/^\/picker\/orders\/(\d+)\/(status|substitute)$/);
  if (subMatch && m === 'POST') {
    if (!u || (role !== 'picker' && role !== 'admin')) return send(res, page(req, 'Picker', '<p class="warn">Picker or admin only.</p>', 403));
    attempt(F_PICKER);
    const order = DB.orders.find(o => o.id === Number(subMatch[1]));
    if (!order) return send(res, page(req, 'Picker', '<p class="warn">No such order.</p>', 404));
    const b = await readBody(req);
    if (subMatch[2] === 'status') { order.status = b.status || order.status; return redirect(res, '/picker'); }
    // VULN (sub-price): the charge for the substitute comes from the REQUEST
    // ("price"), so an expensive substitute can be billed at the cheap original's price.
    const item = order.items.find(i => i.name === b.itemName) || order.items[0];
    const sub = DB.products.find(x => x.id === Number(b.substituteId));
    if (item && sub) {
      const charged = b.price !== undefined && b.price !== '' ? Number(b.price) : sub.price;
      if (charged !== sub.price) pass('sub-price');
      const diff = charged - item.unitPrice;
      item.substitute = { productId: sub.id, name: sub.name, realPrice: sub.price, charged };
      item.status = 'substituted';
      order.total = Math.round((order.total + diff) * 100) / 100;
    }
    return redirect(res, '/orders/' + order.id);
  }

  /* ---------- addresses ---------- */
  if (p === '/addresses' && m === 'GET') {
    if (!u) return redirect(res, '/login');
    const mine = DB.addresses.filter(a => a.userId === u.id);
    const cards = mine.map(a => `<div class="card"><h3>${esc(a.label)}</h3><p>${esc(a.line)}, ${esc(a.city)} ${esc(a.zip)}<br>${esc(a.phone)}</p>
      <p><a href="/addresses/${a.id}/edit">Edit</a></p></div>`).join('');
    return send(res, page(req, 'Addresses', `<h2>Address book</h2><div class="grid">${cards}</div>
      <h3>Add address</h3><form method="POST" action="/addresses"><label>Label<input name="label"></label><label>Line<input name="line"></label>
      <label>City<input name="city"></label><label>ZIP<input name="zip"></label><label>Phone<input name="phone"></label><button class="btn">Save</button></form>`));
  }
  if (p === '/addresses' && m === 'POST') {
    if (!u) return redirect(res, '/login');
    attempt(F_ADDR);
    const b = await readBody(req); // VULN (csrf): no CSRF token anywhere in the app.
    if (isCrossSite(req)) pass('csrf');
    DB.addresses.push({ id: DB.nextAddrId++, userId: u.id, label: b.label || '', line: b.line || '', city: b.city || '', zip: b.zip || '', phone: b.phone || '' });
    return redirect(res, '/addresses');
  }
  const addrMatch = p.match(/^\/addresses\/(\d+)\/edit$/);
  if (addrMatch && m === 'GET') {
    if (!u) return redirect(res, '/login');
    attempt(F_ADDR);
    const a = DB.addresses.find(x => x.id === Number(addrMatch[1])); // VULN (addr-idor): no ownership check
    if (!a) return send(res, page(req, 'Address', '<p class="warn">No such address.</p>', 404));
    if (a.userId !== u.id) pass('addr-idor');
    return send(res, page(req, 'Edit address', `<h2>Edit address #${a.id}</h2>
      <form method="POST" action="/addresses/${a.id}/edit"><label>Label<input name="label" value="${esc(a.label)}"></label>
      <label>Line<input name="line" value="${esc(a.line)}"></label><label>City<input name="city" value="${esc(a.city)}"></label>
      <label>ZIP<input name="zip" value="${esc(a.zip)}"></label><label>Phone<input name="phone" value="${esc(a.phone)}"></label>
      <button class="btn">Save changes</button></form>`));
  }
  if (addrMatch && m === 'POST') {
    if (!u) return redirect(res, '/login');
    attempt(F_ADDR);
    const a = DB.addresses.find(x => x.id === Number(addrMatch[1])); // VULN (addr-idor + csrf)
    if (!a) return send(res, page(req, 'Address', '<p class="warn">No such address.</p>', 404));
    if (a.userId !== u.id) pass('addr-idor');
    const b = await readBody(req);
    if (isCrossSite(req)) pass('csrf');
    Object.assign(a, { label: b.label, line: b.line, city: b.city, zip: b.zip, phone: b.phone });
    return redirect(res, '/addresses');
  }

  /* ---------- profile ---------- */
  if (p === '/profile' && m === 'GET') {
    if (!u) return redirect(res, '/login');
    // NOTE: the greeting below prints the display name UNESCAPED (profile-xss sink).
    return send(res, page(req, 'Profile', `<h2>Profile & settings</h2>
      <p>Welcome back, ${u.name}!</p>
      <p>${esc(u.name)} · ${esc(u.email)} · Role: ${esc(u.role)} · Wallet balance: <b>${money(u.walletBalance)}</b></p>
      <form method="POST" action="/profile/update"><label>Display name<input name="name" value="${esc(u.name)}"></label>
      <label>Phone<input name="phone" value="${esc(u.phone || '')}"></label><button class="btn">Save profile</button></form>`));
  }
  if (p === '/profile/update' && m === 'POST') {
    if (!u) return redirect(res, '/login');
    attempt(F_REG);
    const b = await readBody(req);
    // VULN (csrf): no token — a cross-site form post changes the profile silently.
    if (isCrossSite(req)) pass('csrf');
    // DETECTION (profile-xss): a script payload saved into the display name.
    if (looksXSS(b.name)) pass('profile-xss');
    const prevWallet = u.walletBalance, prevRole = u.role;
    // VULN (mass-assign): the whole body is assigned onto the user record, so
    // extra fields like walletBalance (or role) in the POST are honoured.
    for (const k of Object.keys(b)) { if (k === 'walletBalance' || k === 'role') u[k] = k === 'walletBalance' ? Number(b[k]) : b[k]; else u[k] = b[k]; }
    if (u.walletBalance !== prevWallet || u.role !== prevRole) pass('mass-assign');
    return redirect(res, '/profile');
  }

  /* ---------- admin ---------- */
  if (p === '/admin' && m === 'GET') {
    if (!u || role !== 'admin') return send(res, page(req, 'Admin', '<p class="warn">Admins only.</p>', 403));
    attempt(F_SESS);
    // DETECTION (role-cookie): the dashboard was reached through a client-forged role.
    { const cRole = parseCookies(req).role; if (cRole && roleRank(cRole) > roleRank(u.role)) pass('role-cookie'); }
    const slotRows = DB.slots.map(s => `<tr><td>${esc(s.label)}</td><td>${s.booked}/${s.capacity}</td></tr>`).join('');
    const orderRows = DB.orders.map(o => `<tr><td><a href="/orders/${o.id}">#${o.id}</a></td><td>${esc(o.email)}</td><td>${money(o.total)}</td><td>${esc(o.status)}</td><td>${o.note}</td></tr>`).join('');
    const prodRows = DB.products.map(pr => `<tr><td>${pr.id}</td><td>${esc(pr.name)}</td><td>${money(pr.price)}</td><td>${pr.stock}</td></tr>`).join('');
    return send(res, page(req, 'Admin', `<h2>Admin dashboard</h2>
      <h3>Slots</h3><table><tr><th>Window</th><th>Booked</th></tr>${slotRows}</table>
      <h3>Orders</h3><table><tr><th>ID</th><th>Customer</th><th>Total</th><th>Status</th><th>Note (raw)</th></tr>${orderRows || '<tr><td colspan=5>None</td></tr>'}</table>
      <h3>Products</h3><table><tr><th>ID</th><th>Name</th><th>Price</th><th>Stock</th></tr>${prodRows}</table>
      <p>Users: ${DB.users.map(x => esc(x.email) + ' (' + esc(x.role) + ', wallet ' + money(x.walletBalance) + ')').join(' · ')}</p>`));
  }

  return send(res, page(req, '404', '<h2>404 — page not found</h2>', 404));
}

/* trailing display fragments */
const _p9 = 'U0hYVy0=';
const _p10 = 'MEwtWEg=';

http.createServer((req, res) => {
  route(req, res).catch(err => {
    // Stay stable on bad input: log and answer 500, never crash.
    console.error('handled error:', err && err.message);
    try { res.writeHead(500, { 'Content-Type': 'text/html' }); res.end('<h1>Something went wrong (lab stayed up)</h1>'); } catch (e) {}
  });
}).listen(PORT, HOST, () => console.log(`HexaGrocery (LAB ${LAB_NUMBER}) on http://${HOST}:${PORT} — INTENTIONALLY VULNERABLE, local only`));
