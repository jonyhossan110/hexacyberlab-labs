'use strict';
/*
 * HexaElectro — INTENTIONALLY VULNERABLE electronics-shop practice lab.
 * LAB 3 of the HexaCyberLab lab series (see README.md).
 * Zero-dependency Node.js (built-ins only). Business data is in-memory
 * (reset = restart); LAB PROGRESS persists in progress.json (see below).
 * LOCAL ONLY. Bind: 127.0.0.1:3011. Never deploy publicly.
 * See VULNERABILITIES.md for the deliberate flaws (do not "fix" them here).
 */
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = 3011;
const HOST = '127.0.0.1';
const LAB_NAME = 'HexaElectro';
const LAB_NUMBER = 3;

/* static asset digests (build metadata) */
const _kA = 'MEwtWEg=';

/* ----------------------------- seed data ----------------------------- */
const users = [
  { id: 1, name: 'Store Admin', email: 'admin@hexaelectro.local', password: 'Admin@123', role: 'admin', address: '1 Hexa Plaza, Dhaka', resetToken: 'reset-1', tradeInCredit: 0, tradeInDevice: '' },
  { id: 2, name: 'Nadia Rahman', email: 'nadia@hexaelectro.local', password: 'User@123', role: 'customer', address: 'House 12, Banani, Dhaka', resetToken: 'reset-2', tradeInCredit: 0, tradeInDevice: '' },
  { id: 3, name: 'Tanvir Ahmed', email: 'tanvir@hexaelectro.local', password: 'User@123', role: 'customer', address: 'Flat 5B, Uttara, Dhaka', resetToken: 'reset-3', tradeInCredit: 0, tradeInDevice: '' },
  { id: 4, name: 'Rahim Uddin', email: 'rahim@hexaelectro.local', password: 'User@123', role: 'customer', address: 'Road 3, Chattogram', resetToken: 'reset-4', tradeInCredit: 0, tradeInDevice: '' },
];
let nextUserId = 5;

const _xA = 'MEwtWEg=';

const products = [
  { id: 1, name: 'Aurora X5 Phone', cat: 'Phones', price: 699, stock: 25, blurb: '6.5" OLED, 256GB, 5G' },
  { id: 2, name: 'Aurora X5 Pro Phone', cat: 'Phones', price: 899, stock: 18, blurb: '6.8" OLED, 512GB, 200MP camera' },
  { id: 3, name: 'VoltBook Air 13 Laptop', cat: 'Laptops', price: 1099, stock: 12, blurb: '13" 2.8K, 16GB RAM, 1TB SSD' },
  { id: 4, name: 'VoltBook Pro 16 Laptop', cat: 'Laptops', price: 1799, stock: 8, blurb: '16" 4K, 32GB RAM, RTX-class GPU' },
  { id: 5, name: 'CineView 55" 4K TV', cat: 'TVs', price: 749, stock: 14, blurb: '55" 4K UHD, HDR10+, smart TV' },
  { id: 6, name: 'CineView 65" OLED TV', cat: 'TVs', price: 1499, stock: 6, blurb: '65" OLED evo, 120Hz' },
  { id: 7, name: 'PulseTab 11 Tablet', cat: 'Tablets', price: 399, stock: 30, blurb: '11" 120Hz, stylus included' },
  { id: 8, name: 'SoundMax Headphones', cat: 'Audio', price: 199, stock: 40, blurb: 'ANC, 60h battery' },
  { id: 9, name: 'HexaWatch S2', cat: 'Wearables', price: 249, stock: 35, blurb: 'AMOLED, ECG, GPS' },
  { id: 10, name: 'VoltCharger 140W GaN', cat: 'Accessories', price: 59, stock: 100, blurb: '3-port fast charger' },
  { id: 11, name: 'MechKeys K87 Keyboard', cat: 'Accessories', price: 129, stock: 45, blurb: 'Hot-swap mechanical' },
  { id: 12, name: 'UltraCam Mirrorless Camera', cat: 'Cameras', price: 1249, stock: 7, blurb: '24MP, 4K60 video' },
  { id: 13, name: 'FLASH DEAL: HexaBuds Pro', cat: 'Audio', price: 49, stock: 2, blurb: 'Flash sale — only 2 left!', flash: true },
  { id: 14, name: 'GameStation Console', cat: 'Gaming', price: 499, stock: 10, blurb: '1TB, 4K gaming' },
];

const _xB = 'UjlBLTQ=';

/* Device registry: serial -> device. Serials are SEQUENTIAL (HE + 6 digits). */
let serialCounter = 100005;
const devices = [
  { serial: 'HE100001', productId: 1, ownerId: 2, purchased: '2025-03-01', warrantyEnd: '2027-03-01' },
  { serial: 'HE100002', productId: 3, ownerId: 3, purchased: '2024-01-15', warrantyEnd: '2026-01-15' },
  { serial: 'HE100003', productId: 5, ownerId: 4, purchased: '2025-06-30', warrantyEnd: '2027-06-30' },
  { serial: 'HE100004', productId: 8, ownerId: 2, purchased: '2023-12-01', warrantyEnd: '2025-12-01' },
  { serial: 'HE100010', productId: 7, ownerId: null, purchased: null, warrantyEnd: null },
  { serial: 'HE100011', productId: 9, ownerId: null, purchased: null, warrantyEnd: null },
];

const orders = [
  { id: 5001, userId: 2, items: [{ productId: 1, qty: 1, price: 699, serial: 'HE100001' }], total: 699, coupon: '', tradeIn: 0, status: 'Delivered', date: '2025-03-01' },
];
let nextOrderId = 5002;

const claims = [
  { id: 'CLM-1001', serial: 'HE100001', userId: 2, issue: 'Screen flickers intermittently', status: 'In Review', date: '2026-10-10' },
];
let claimCounter = 1002;

const _xC = 'M1VVR0U=';

const tickets = [
  { id: 1, userId: 3, subject: 'Delivery delay', body: 'My order is 3 days late, please check.', status: 'Open', date: '2026-10-20' },
];
let nextTicketId = 2;

const invoices = [
  { id: 1, userId: 2, title: 'Aurora X5 purchase invoice', content: '<h1>Invoice</h1><p>Aurora X5 Phone — $699</p>' },
];
let nextInvoiceId = 2;

const _xD = 'RVhDRS0=';

const coupons = { ELECTRO10: 10, WELCOME15: 15 }; // code -> percent off

const _kB = 'RFQ5LTM=';

const sessions = new Map(); // sid -> userId
const carts = new Map();    // userId -> [{productId, qty}]

/* In-memory detection bookkeeping (not progress — resets with the process). */
const loginFailures = new Map();  // email -> consecutive-ish failure count
const enumSightings = new Map();  // clientKey -> Set('real'|'fake'|'noacct'|'badpass')
const forgotGiven = new Map();    // clientKey -> Set(email) the reset flow actually revealed
const couponUses = new Map();     // userId -> Map(code -> times successfully used)
const lookupLog = new Map();      // clientKey -> [{serial, t}]

/* =====================================================================
 * LAB SYSTEM — progress, tests, chatbot, keys (HexaCyberLab series)
 * ===================================================================== */
const PROGRESS_PATH = path.join(__dirname, 'progress.json');
let LOGO = null;
try { LOGO = fs.readFileSync(path.join(__dirname, 'logo.png')); } catch (e) { LOGO = null; }

const FEATURES = ['Authentication', 'Registration & Profile', 'Catalogue & Search', 'Cart & Checkout',
  'Orders', 'Trade-In', 'Warranty Centre', 'Support Tickets', 'Invoices', 'Admin Panel', 'APIs & Platform'];

const TESTS = [
  /* ---------------- Authentication ---------------- */
  { id: 'auth-sqli', feature: 'Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03 Injection (SQLi)', difficulty: 'Intermediate',
    hints: ['The login also accepts a legacy string-built query path. What happens if your input contains a single quote?',
      "Try a classic always-true condition in the email field, e.g. ' OR '1'='1 — or comment out the password check with -- .",
      "POST /login with email = admin@hexaelectro.local' -- and any password: the query's password condition is commented out and you are logged in as admin."],
    lesson: 'String-built SQL queries let attacker input change the query itself. Parameterised queries make input data, never code.',
    impact: 'On a real client shop this is instant admin takeover — every order, customer record and refund is exposed in one request.',
    report: { title: 'SQL Injection in Authentication (Login Bypass)', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements for all database access; never build queries by string concatenation.' } },
  { id: 'auth-enum', feature: 'Authentication', name: 'User Enumeration via Auth Responses', owasp: 'A07 Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the login error for an email that exists with one that does not. Are they identical?',
      'Do the same comparison on the Forgot Password flow — one path reveals a reset link, the other stays vague.',
      'Once you have SEEN both variants (e.g. forgot for nadia@hexaelectro.local and for nobody@hexaelectro.local), enumeration is proven.'],
    lesson: 'Different error messages for "no such account" vs "wrong password" hand attackers a valid-account list for targeted attacks.',
    impact: 'Attackers harvest your client\'s real customer emails, then aim password-spraying and phishing only at accounts that exist.',
    report: { title: 'Username Enumeration via Authentication Error Messages', severity: 'Medium', remediation: 'Return one generic message ("if the account exists…") for login and reset flows, with identical timing and wording.' } },
  { id: 'auth-brute', feature: 'Authentication', name: 'Brute Force — No Rate Limiting on Login', owasp: 'A07 Authentication Failures', difficulty: 'Beginner',
    hints: ['How many wrong passwords can you try for one account in a row? Does anything slow you down or lock the account?',
      'Script it: 10+ failed logins for nadia@hexaelectro.local — watch for any lockout, CAPTCHA or delay.',
      'There is no throttle at all: the 10th (and 100th) failure is processed exactly like the first.'],
    lesson: 'Without rate limiting or lockout, a password is only as strong as the attacker\'s patience and wordlist.',
    impact: 'Credential stuffing against a real store turns leaked password lists into account takeovers — loyalty points, saved cards and orders follow.',
    report: { title: 'Missing Brute-Force Protection on Login', severity: 'High', remediation: 'Add per-account and per-IP rate limiting, progressive delays / lockout, and alerting on repeated failures.' } },
  { id: 'auth-default', feature: 'Authentication', name: 'Default Administrator Credentials', owasp: 'A07 Authentication Failures', difficulty: 'Beginner',
    hints: ['The README documents the seeded admin account. Are its credentials the sort an installer would leave unchanged?',
      'Admin@123 follows the same predictable pattern as the lab documentation shows.',
      'Log in as admin@hexaelectro.local with the documented default password Admin@123 — that is the finding: shipped defaults still work.'],
    lesson: 'Default credentials are public knowledge. Any system reachable with its factory password is already compromised.',
    impact: 'A real client who never changed the installer password hands attackers the admin panel on day one — the most common breach path of all.',
    report: { title: 'Default Credentials in Use (Admin Account)', severity: 'Critical', remediation: 'Force a unique, strong admin password at first setup; disable or rename default accounts; audit for shipped credentials.' } },
  { id: 'auth-reset', feature: 'Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07 Authentication Failures', difficulty: 'Intermediate',
    hints: ['Use Forgot Password once and look at the shape of the reset link you are shown. What varies between users?',
      'Tokens look like reset-<number>. Whose number is 1?',
      'Without requesting anything, browse to /reset?token=reset-1 and set a new password for the admin account.'],
    lesson: 'Reset tokens must be unguessable secrets. A token derived from a sequential user id is an open door labelled "reset".',
    impact: 'Anyone can reset the shop owner\'s password in seconds — full takeover with no email access and no trace in the victim\'s inbox routine.',
    report: { title: 'Predictable Password Reset Tokens Allow Account Takeover', severity: 'Critical', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), expire them quickly, make them single-use, and never derive them from user ids.' } },
  { id: 'auth-cookie', feature: 'Authentication', name: 'Role Tampering via Unsigned Cookie', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After login, inspect your cookies. One of them states your role in plain text. Who signs it? (Nobody.)',
      'The admin gate reads that client-controlled cookie instead of the server-side account.',
      'Set the role cookie to admin in your browser (DevTools → Application → Cookies) and reload /admin.'],
    lesson: 'Authorisation data must live server-side or be cryptographically signed. Anything the client can edit, the client controls.',
    impact: 'Every customer becomes an admin by editing one cookie — prices, orders, customer data and support tickets are all exposed.',
    report: { title: 'Broken Access Control — Privilege Escalation via Unsigned Role Cookie', severity: 'Critical', remediation: 'Keep roles in the server-side session only; if a cookie must carry claims, sign it (HMAC) and verify on every request.' } },

  /* ---------------- Registration & Profile ---------------- */
  { id: 'reg-weak', feature: 'Registration & Profile', name: 'Weak Password Policy at Registration', owasp: 'A07 Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a new account. How short can the password be before the form complains?',
      'It never complains — try a single character.',
      'Create an account with password "a": the lab accepts it, proving there is no password policy at all.'],
    lesson: 'A password policy is the cheapest control there is. Without one, users pick passwords that fall to the first guessing attempt.',
    impact: 'Your client\'s customers protect their accounts (and saved payment details) with "1" or "abc" — and blame the shop when accounts are drained.',
    report: { title: 'No Password Policy Enforced at Registration', severity: 'Medium', remediation: 'Enforce a minimum length (12+ recommended) and screen against common/breached password lists at registration and reset.' } },
  { id: 'profile-xss', feature: 'Registration & Profile', name: 'Stored XSS via Display Name', owasp: 'A03 Injection (Stored XSS)', difficulty: 'Beginner',
    hints: ['Your display name is shown in the top navigation of every page. Is it encoded there?',
      'Set your profile name (or register) with a name like <script>alert(1)</script> and look at the header.',
      'The navigation renders the name RAW — the payload is stored and fires on every page you view, and would fire for anyone shown your name.'],
    lesson: 'Any user-controlled string rendered without output encoding is a stored XSS waiting for a viewer — ideally, for the victim, an admin.',
    impact: 'Attackers plant scripts in profiles that execute in staff browsers — session theft and actions performed as the support team follow.',
    report: { title: 'Stored Cross-Site Scripting via Profile Display Name', severity: 'High', remediation: 'Contextually encode all user-controlled output; treat names as untrusted text, never HTML.' } },
  { id: 'profile-mass', feature: 'Registration & Profile', name: 'Mass Assignment — Self-Promotion via Profile Update', owasp: 'A01 Broken Access Control (Mass Assignment)', difficulty: 'Intermediate',
    hints: ['The profile form shows name, address, email. What other fields does the account object have that the form does not show?',
      'The update handler copies fields straight from your POST. Try adding a role field.',
      'POST /profile with role=admin added: your account\'s role is overwritten server-side — real admin, no cookie tricks.'],
    lesson: 'Binding request parameters directly to model objects lets attackers write fields the UI never offered. Allow-list updatable fields.',
    impact: 'Customers promote themselves to admin (or rewrite their balances/credits) — the shop\'s entire permission model collapses from one form.',
    report: { title: 'Mass Assignment in Profile Update Allows Privilege Escalation', severity: 'Critical', remediation: 'Allow-list the exact fields each endpoint may update; never bind request bodies directly to persistent objects.' } },
  { id: 'profile-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01 Broken Access Control (CSRF)', difficulty: 'Intermediate',
    hints: ['The profile form carries no anti-CSRF token. What would stop a malicious page from submitting it for a logged-in victim?',
      'Nothing checks Origin/Referer either, and the session cookie has no SameSite attribute.',
      'POST /profile from a cross-site context (e.g. curl with Origin: https://evil.example) while logged in — the change is accepted.'],
    lesson: 'State-changing requests need an unguessable token (or strict SameSite cookies). Ambient cookie authority alone is forgeable.',
    impact: 'A victim who merely visits a booby-trapped page gets their email changed — and the password-reset flow then hands the account to the attacker.',
    report: { title: 'Cross-Site Request Forgery on Profile Update', severity: 'High', remediation: 'Add per-session anti-CSRF tokens to all state-changing forms and set SameSite=Lax/Strict on session cookies.' } },

  /* ---------------- Catalogue & Search ---------------- */
  { id: 'search-sqli', feature: 'Catalogue & Search', name: 'SQL Injection in Product Search', owasp: 'A03 Injection (SQLi)', difficulty: 'Intermediate',
    hints: ['The Search page echoes the exact query it "ran". How is your input placed into it?',
      'A quote in the search term lands inside a string literal in that query. What does a \' OR \'1\'=\'1 do to the WHERE clause?',
      "Search for: ' OR '1'='1 — the condition becomes always true and the full catalogue is returned."],
    lesson: 'Search boxes are database inputs. Concatenating them into queries is the same critical flaw whether the page is login or search.',
    impact: 'On a real store this is the first step to dumping the whole database — products today, customer password hashes tomorrow.',
    report: { title: 'SQL Injection in Product Search', severity: 'Critical', remediation: 'Parameterise all queries; validate and allow-list sort/filter parameters; return generic errors.' } },
  { id: 'search-xss', feature: 'Catalogue & Search', name: 'Reflected XSS in Search', owasp: 'A03 Injection (Reflected XSS)', difficulty: 'Beginner',
    hints: ['The search term is printed back on the results page ("Results for: …"). Encoded, or raw?',
      'Search for a harmless tag first and view the page source.',
      'Search for <script>alert(1)</script> — it is reflected unescaped into the page (and into the echoed query).'],
    lesson: 'Reflected input must be encoded for the context it lands in. "It\'s only a search box" is how phishing-grade XSS ships.',
    impact: 'Attackers send victims crafted search links on the shop\'s own domain — the script runs as the trusted store, stealing sessions or pushing fake payment pages.',
    report: { title: 'Reflected Cross-Site Scripting in Search', severity: 'High', remediation: 'HTML-encode all reflected values; deploy a Content-Security-Policy as defence in depth.' } },

  /* ---------------- Cart & Checkout ---------------- */
  { id: 'checkout-price', feature: 'Cart & Checkout', name: 'Price Tampering at Checkout', owasp: 'A04 Insecure Design / Business Logic', difficulty: 'Beginner',
    hints: ['Look at the Cart page form closely — the unit prices are editable form fields, not just text.',
      'What does the server do with the price you submit — or does it look the price up itself?',
      'Change price_8 to 1 in DevTools/Burp and place the order: you pay $1 for $199 headphones.'],
    lesson: 'Prices are server-side facts. Anything the client submits about money must be recomputed, never trusted.',
    impact: 'Customers set their own prices — direct, silent revenue loss on every single order until someone audits the books.',
    report: { title: 'Client-Side Price Tampering at Checkout', severity: 'Critical', remediation: 'Recompute all prices and totals server-side from the catalogue; ignore any client-submitted amounts.' } },
  { id: 'checkout-qty', feature: 'Cart & Checkout', name: 'Negative Quantity Tampering', owasp: 'A04 Insecure Design / Business Logic', difficulty: 'Intermediate',
    hints: ['Quantity is a number the server believes. Does anything insist it be positive?',
      'The Add-to-Cart form has min="1" — but that is only a browser hint. Post the request yourself.',
      'POST /cart/add with qty=-3, then check out: the negative line REDUCES your order total.'],
    lesson: 'Quantities, like prices, are money. Validate ranges server-side: qty must be a positive integer within stock.',
    impact: 'Attackers offset expensive items with negative lines — checking out a TV for the price of a cable, or even generating credit.',
    report: { title: 'Missing Quantity Validation Allows Negative-Line Checkout', severity: 'High', remediation: 'Validate quantity server-side (integer, 1..stock); reject zero/negative values; recompute totals from validated lines.' } },
  { id: 'checkout-coupon', feature: 'Cart & Checkout', name: 'Coupon Reuse Without Limit', owasp: 'A04 Insecure Design / Business Logic', difficulty: 'Beginner',
    hints: ['ELECTRO10 gives 10% off. What records that YOU have already used it?',
      'Nothing does. Place one order with it — then simply place another.',
      'Use the same coupon on two separate orders: it applies in full both times.'],
    lesson: 'Promotions need a redemption ledger: per-code, per-user usage state enforced at checkout, not display logic.',
    impact: '"One-time" launch codes become permanent public discounts — margin erosion that scales with every leaked code.',
    report: { title: 'Coupon Codes Can Be Reused Unlimited Times', severity: 'Medium', remediation: 'Track redemptions per code and per account in the database; enforce single-use (or defined limits) atomically at checkout.' } },
  { id: 'checkout-race', feature: 'Cart & Checkout', name: 'Flash-Sale Race Condition (Overselling)', owasp: 'A04 Insecure Design (Race Condition)', difficulty: 'Advanced',
    hints: ['The FLASH DEAL has stock 2. Checkout checks stock, pauses ("payment processing"), then decrements. What fits inside that pause?',
      'Two buyers, two carts, each with 2× HexaBuds Pro. Timing is everything.',
      'Fire both checkouts in parallel (two cookie jars, background curl): both pass the stock check before either decrements — stock ends at −2.'],
    lesson: 'Check-then-act without a lock or transaction is a race. Stock, balances and coupons all need atomic reservation.',
    impact: 'Limited drops oversell instantly: cancelled orders, refunds, and angry customers — while bots walk away with the stock.',
    report: { title: 'Race Condition in Checkout Allows Overselling Limited Stock', severity: 'High', remediation: 'Decrement stock atomically inside a transaction (or reserve on add-to-cart); re-validate at commit and reject oversell.' } },

  /* ---------------- Orders ---------------- */
  { id: 'orders-idor', feature: 'Orders', name: 'Order IDOR — Reading Other Customers\' Orders', owasp: 'A01 Broken Access Control (IDOR)', difficulty: 'Beginner',
    hints: ['Order URLs are /order/<id> with sequential ids. The page checks you are logged in — but does it check the order is YOURS?',
      'Order #5001 already exists and is not yours (unless you are Nadia).',
      'Log in as Tanvir and open /order/5001: another customer\'s full order, serials included, is served.'],
    lesson: 'Authentication is not authorisation. Every object access must verify the object belongs to the requester.',
    impact: 'Anyone can read every customer\'s purchases and device serials — a privacy breach and a parts list for warranty fraud.',
    report: { title: 'Insecure Direct Object Reference on Order Details', severity: 'High', remediation: 'Enforce per-object ownership checks on every read (order.userId must equal the session user), and use unguessable references as defence in depth.' } },

  /* ---------------- Trade-In ---------------- */
  { id: 'tradein-value', feature: 'Trade-In', name: 'Trade-In Value Tampering', owasp: 'A04 Insecure Design / Business Logic', difficulty: 'Beginner',
    hints: ['The trade-in form "estimates" your device value with a bit of JavaScript. Where does the number that becomes credit actually come from?',
      'The server stores whatever value arrives in the POST — the JS is just a suggestion.',
      'POST /tradein with grade=D and value=5000: $5,000 credit is applied to your next checkout.'],
    lesson: 'Valuations are server decisions. Client-side estimates are UX, not controls — credit must be computed and capped server-side.',
    impact: 'Unlimited store credit from a text field: attackers mint money and drain the catalogue at zero cost.',
    report: { title: 'Client-Controlled Trade-In Valuation Creates Unlimited Credit', severity: 'Critical', remediation: 'Compute trade-in value server-side from device + grade tables; cap credit; require verification before it is spendable.' } },

  /* ---------------- Warranty Centre ---------------- */
  { id: 'warranty-lookup', feature: 'Warranty Centre', name: 'Serial Lookup Leaks Owner PII (Unauthenticated)', owasp: 'A01 Broken Access Control / Data Exposure', difficulty: 'Beginner',
    hints: ['The warranty lookup endpoint answers JSON. Does it ask who you are first?',
      'Try it with NO cookies at all for a serial you know exists, like HE100001.',
      'curl /warranty/lookup?serial=HE100001 returns the product AND the owner\'s name and email — anonymously.'],
    lesson: 'Support tooling often leaks the most data. "Just a lookup" still needs authentication and minimal fields.',
    impact: 'A public, anonymous window into who owns what — names and emails ready-made for phishing and warranty fraud.',
    report: { title: 'Unauthenticated Warranty Lookup Discloses Customer PII', severity: 'High', remediation: 'Require authentication and ownership for serial lookups; return only the fields the requester is entitled to see.' } },
  { id: 'warranty-enum', feature: 'Warranty Centre', name: 'Serial-Number Enumeration', owasp: 'A01 Broken Access Control (Predictable IDs)', difficulty: 'Intermediate',
    hints: ['Serials follow a pattern: HE plus six digits, counting up. What happens when you walk the number line?',
      'Probe five or more different serials through the lookup — each answers fully.',
      'HE100001…HE100005 and beyond each return a device record: the whole customer device registry is enumerable in minutes.'],
    lesson: 'Sequential identifiers plus a verbose lookup equals a bulk-export API. Unguessable references and rate limits break the chain.',
    impact: 'Attackers harvest the entire installed base — every customer, device and warranty date — for resale, fraud and targeted scams.',
    report: { title: 'Predictable Serial Numbers Enable Full Registry Enumeration', severity: 'High', remediation: 'Use non-sequential, unguessable serials/references; rate-limit lookups; never return owner PII from enumeration-prone endpoints.' } },
  { id: 'warranty-claim', feature: 'Warranty Centre', name: 'Warranty Claim IDOR (File & Read)', owasp: 'A01 Broken Access Control (IDOR)', difficulty: 'Intermediate',
    hints: ['Filing a claim asks for a serial. Does the server check the device belongs to you?',
      'Reading a claim (/warranty/claim/CLM-xxxx) — is ownership checked there either?',
      'As Tanvir, file a claim on Nadia\'s HE100001, then open her seeded claim CLM-1001: her name and email are shown.'],
    lesson: 'Both halves of an object flow need ownership checks — creation (write) and retrieval (read). One missing check is enough.',
    impact: 'Fraudulent claims on strangers\' devices tie up support, leak claim contents and PII, and can hijack legitimate repairs.',
    report: { title: 'Missing Ownership Checks on Warranty Claims (IDOR)', severity: 'High', remediation: 'Verify device ownership before accepting a claim and claim ownership before displaying it; deny by default.' } },
  { id: 'warranty-extend', feature: 'Warranty Centre', name: 'Warranty Extension via Parameter Tampering', owasp: 'A04 Insecure Design / Business Logic', difficulty: 'Beginner',
    hints: ['The register form carries a hidden warranty_months field. Hidden from sight — but whose value is it?',
      'The server builds your warranty end date from that parameter.',
      'Register HE100010 with warranty_months=1200: cover until the year 2126 — a century of free warranty.'],
    lesson: 'Hidden fields are still client input. Durations, tiers and entitlements must come from server-side policy, never the request.',
    impact: 'Lifetime warranties self-issued by customers: unbounded repair liability the business never agreed to.',
    report: { title: 'Client-Controlled Warranty Duration Parameter', severity: 'High', remediation: 'Determine warranty length server-side from product/policy; ignore any client-supplied duration.' } },

  /* ---------------- Support Tickets ---------------- */
  { id: 'support-xss', feature: 'Support Tickets', name: 'Stored XSS in Support Tickets', owasp: 'A03 Injection (Stored XSS)', difficulty: 'Beginner',
    hints: ['Ticket subjects and bodies are printed back on the ticket page — and listed for staff. Encoded?',
      'Create a ticket whose body is a script payload and open the ticket.',
      'A body of <script>alert(1)</script> is stored and served raw — it fires for any viewer, including admins via /admin/tickets.'],
    lesson: 'Support queues are prime XSS targets because staff MUST open them. Everything user-supplied is hostile until encoded.',
    impact: 'One ticket executes script in the support team\'s browsers — session theft and actions taken as staff, from a form anyone can submit.',
    report: { title: 'Stored Cross-Site Scripting in Support Tickets', severity: 'High', remediation: 'Encode all ticket content on output; sanitise rich text if allowed; add a CSP.' } },

  /* ---------------- Invoices ---------------- */
  { id: 'invoice-upload', feature: 'Invoices', name: 'Unrestricted Invoice Upload → Stored HTML Hosting', owasp: 'A03 Injection / Unrestricted Upload', difficulty: 'Intermediate',
    hints: ['The invoice upload accepts "file contents" as text. What types are rejected? (None.) And how is it served back?',
      'Uploaded content is returned with Content-Type: text/html from the shop\'s own origin.',
      'Upload invoice content containing <script>alert(2)</script> and open /invoice/<id> — your HTML/JS is hosted and executed.'],
    lesson: 'Uploads need type allow-lists, content checks, and safe serving (download headers, separate domain). Raw user HTML on your origin is stored XSS as a feature.',
    impact: 'Attackers host phishing pages and malware lures on the shop\'s trusted domain — customers trust the URL and fall for it.',
    report: { title: 'Unrestricted File Upload Allows Stored HTML/JS Hosting', severity: 'High', remediation: 'Allow-list file types with content sniffing, store outside the web root, serve with Content-Disposition: attachment and a safe content type.' } },
  { id: 'invoice-idor', feature: 'Invoices', name: 'Invoice Access Without Authorisation (IDOR)', owasp: 'A01 Broken Access Control (IDOR)', difficulty: 'Beginner',
    hints: ['Invoices live at /invoice/<id> with small sequential ids. Who is allowed to open one? Apparently: anyone.',
      'Invoice #1 belongs to Nadia. You do not need to be Nadia — or even logged in.',
      'Open /invoice/1 as another user (or anonymously): her invoice document is served.'],
    lesson: 'Uploaded documents are private objects. Serving them by guessable id without an ownership check leaks financial documents.',
    impact: 'Every customer\'s invoices — names, purchases, prices — are public by URL, ready for invoice fraud and social engineering.',
    report: { title: 'Missing Authorisation on Invoice Retrieval (IDOR)', severity: 'High', remediation: 'Require login and verify invoice ownership before serving; use unguessable file references.' } },

  /* ---------------- Admin Panel ---------------- */
  { id: 'admin-bac', feature: 'Admin Panel', name: 'Admin Pages Open to Any Customer (Broken Access Control)', owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    hints: ['/admin itself at least checks something. Do ALL admin pages? Compare /admin with /admin/inventory.',
      'Two admin pages check only that *someone* is logged in — never their role.',
      'As a plain customer, open /admin/inventory and /admin/claims: stock values and every customer\'s claims, no tampering needed.'],
    lesson: 'Authorisation must be enforced on every route, server-side, by default. One unguarded page undoes the whole model.',
    impact: 'Competitors read stock and valuation data; every warranty claim (with customer emails) is exposed to any registered account.',
    report: { title: 'Missing Authorisation on Admin Inventory & Claims Pages', severity: 'High', remediation: 'Apply a single server-side role check (deny-by-default middleware) to the entire admin route group.' } },

  /* ---------------- APIs & Platform ---------------- */
  { id: 'api-export', feature: 'APIs & Platform', name: 'Customer Export API — Excess Data Exposure', owasp: 'A03 / API3 Excess Data Exposure', difficulty: 'Beginner',
    hints: ['Somewhere there is an API endpoint meant for internal tooling. It returns customers — all of them. Does it authenticate?',
      'Try /api/customers/export with no cookies at all.',
      'One anonymous GET returns every customer\'s name, email and device serials as JSON.'],
    lesson: 'APIs must authenticate and minimise: return only the fields the caller needs, only for callers allowed to have them.',
    impact: 'A one-request full customer-list breach — the exact dataset phishing and warranty-fraud campaigns are built from.',
    report: { title: 'Unauthenticated API Exposes Full Customer Dataset', severity: 'Critical', remediation: 'Require authentication + authorisation on all API endpoints; minimise response fields; log and alert on bulk reads.' } },
];

const TEST_BY_ID = Object.fromEntries(TESTS.map(t => [t.id, t]));
const XSS_RE = /(<\s*(script|svg|iframe|img|body|details|marquee|input|form)[^>]*>)|(on\w+\s*=)|(javascript\s*:)/i;

/* ---------------- progress state (persisted) ---------------- */
function defaultState() {
  return { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
}
function loadState() {
  try {
    const raw = fs.readFileSync(PROGRESS_PATH, 'utf8');
    const s = Object.assign(defaultState(), JSON.parse(raw));
    s.tests = s.tests || {}; s.attempts = s.attempts || {};
    return s;
  } catch (e) { return defaultState(); }
}
let state = loadState();
function saveState() {
  try { fs.writeFileSync(PROGRESS_PATH, JSON.stringify(state, null, 2)); } catch (e) { /* disk issue — lab keeps running */ }
}
function pass(testId) {
  if (!TEST_BY_ID[testId] || state.tests[testId]) return;
  state.tests[testId] = true;
  if (TESTS.every(t => state.tests[t.id]) && !state.completedAt) {
    state.completedAt = new Date().toISOString();
    state.keyRevealed = true;
  }
  saveState();
}
function bumpAttempt(feature) {
  if (!feature || !FEATURES.includes(feature)) return;
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  saveState();
}
function progressSummary() {
  const total = TESTS.length;
  const done = TESTS.filter(t => state.tests[t.id]).length;
  const pct = total ? Math.floor(done * 100 / total) : 0;
  const features = {};
  for (const f of FEATURES) {
    const list = TESTS.filter(t => t.feature === f);
    features[f] = { total: list.length, done: list.filter(t => state.tests[t.id]).length, attempts: state.attempts[f] || 0 };
  }
  return { lab: LAB_NAME, number: LAB_NUMBER, total, done, pct, features, complete: done === total };
}
function attemptFor(m, p) {
  if (m === 'POST' && (p === '/login' || p === '/forgot' || p === '/reset')) return 'Authentication';
  if (p === '/register' || p === '/profile') return 'Registration & Profile';
  if (p === '/search' || /^\/product\//.test(p)) return 'Catalogue & Search';
  if (p === '/cart' || p === '/cart/add' || p === '/checkout') return 'Cart & Checkout';
  if (p === '/orders' || /^\/order\//.test(p)) return 'Orders';
  if (p === '/tradein') return 'Trade-In';
  if (p.startsWith('/warranty')) return 'Warranty Centre';
  if (p === '/support' || /^\/support\//.test(p)) return 'Support Tickets';
  if (p === '/invoices' || p === '/invoices/upload' || /^\/invoice\//.test(p)) return 'Invoices';
  if (p.startsWith('/admin')) return 'Admin Panel';
  if (p === '/api/customers/export') return 'APIs & Platform';
  return null;
}

/* ---------------- keys: assembled at runtime from scattered shards ---------------- */
function _assemble(shards) {
  return shards.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}
function entryKey() { return _assemble([_kA, _kB, _kC, _kD, _kE]); }
function completionKey() { return _assemble([_xA, _xB, _xC, _xD, _xE]); }

/* ----------------------------- helpers ----------------------------- */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function clientKey(req) {
  return (req.socket && req.socket.remoteAddress) || 'local';
}
function getUser(req) {
  const sid = parseCookies(req).sid;
  if (!sid || !sessions.has(sid)) return null;
  return users.find(u => u.id === sessions.get(sid)) || null;
}
/* VULN-T05: admin gate trusts the unsigned, client-controlled `role` cookie. */
function isAdmin(req) {
  const c = parseCookies(req);
  if (c.role) return c.role === 'admin';
  const u = getUser(req);
  return !!(u && u.role === 'admin');
}
function money(n) { return '$' + Number(n).toFixed(2); }
function prod(id) { return products.find(p => p.id === Number(id)); }
function userById(id) { return users.find(u => u.id === Number(id)); }
function today() { return new Date().toISOString().slice(0, 10); }
function addMonths(iso, m) { const d = new Date(iso + 'T00:00:00'); d.setMonth(d.getMonth() + m); return d.toISOString().slice(0, 10); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

const CHAT_WIDGET = `
<div id="hxchat" style="position:fixed;right:18px;bottom:18px;width:330px;z-index:60;font-size:14px">
  <div id="hxchatlog" style="display:none;background:#fff;border:1px solid #c6cde0;border-radius:12px;height:300px;overflow:auto;padding:10px;box-shadow:0 4px 18px rgba(0,0,0,.25);white-space:pre-wrap"></div>
  <div style="display:flex;gap:6px;margin-top:6px">
    <input id="hxchatin" placeholder="Ask the lab assistant…" style="flex:1;margin:0;padding:9px;border:1px solid #c6cde0;border-radius:8px">
    <button id="hxchatbtn" type="button" style="background:#2b59ff;color:#fff;border:0;padding:9px 16px;border-radius:8px;cursor:pointer">Chat</button>
  </div>
</div>
<script>
(function(){var log=document.getElementById('hxchatlog'),inp=document.getElementById('hxchatin'),btn=document.getElementById('hxchatbtn');
function add(who,txt){log.style.display='block';var d=document.createElement('div');d.style.margin='6px 0';var b=document.createElement('b');b.textContent=who+' ';d.appendChild(b);d.appendChild(document.createTextNode(txt));log.appendChild(d);log.scrollTop=log.scrollHeight;}
async function ask(){var v=inp.value.trim();if(!v)return;inp.value='';add('You:',v);try{var r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:v})});var j=await r.json();add('HexaBot:',j.reply||'…');}catch(e){add('HexaBot:','(assistant unreachable)');}}
btn.addEventListener('click',ask);inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();ask();}});})();
</script>`;

function layout(req, title, body) {
  const u = getUser(req);
  const admin = isAdmin(req);
  const pr = progressSummary();
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)} — HexaElectro</title>
<style>
body{font-family:system-ui,Segoe UI,Arial,sans-serif;margin:0;background:#f4f6fb;color:#1c2333}
header{background:#101d42;color:#fff;padding:14px 26px;display:flex;justify-content:space-between;align-items:center}
header a{color:#cdd8ff;text-decoration:none;margin-left:16px} header b a{color:#fff;margin:0;font-size:20px}
.labbar{background:#16265c;color:#dbe4ff;padding:7px 26px;font-size:13px;display:flex;gap:14px;align-items:center}
.labbar a{color:#cdd8ff}
.pbar{flex:1;background:#2c3d75;border-radius:99px;height:8px;overflow:hidden}
.pbar>span{display:block;height:100%;background:#43e97b}
.wrap{max-width:1080px;margin:26px auto;padding:0 18px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px}
.card{background:#fff;border-radius:12px;padding:18px;box-shadow:0 1px 4px rgba(16,29,66,.10)}
.btn{background:#2b59ff;color:#fff;border:0;padding:9px 16px;border-radius:8px;cursor:pointer;text-decoration:none;display:inline-block}
.btn.alt{background:#e8ecf7;color:#101d42}.btn.danger{background:#d92d20}
input,select,textarea{padding:9px;border:1px solid #c6cde0;border-radius:8px;width:100%;box-sizing:border-box;margin:5px 0 12px}
table{width:100%;border-collapse:collapse;background:#fff} th,td{padding:9px;border-bottom:1px solid #e6e9f2;text-align:left}
.tag{background:#fff3cd;padding:2px 8px;border-radius:99px;font-size:12px}.ok{color:#067647}.bad{color:#d92d20}
.mut{color:#667085;font-size:13px}.flash{background:#fff1f3;border:1px solid #ffb3ba}
details{margin:4px 0} summary{cursor:pointer;color:#2b59ff;font-size:13px}
</style></head><body>
<header><b><a href="/">⚡ HexaElectro</a></b><nav>
<a href="/">Shop</a><a href="/search">Search</a><a href="/tests">Missions</a><a href="/warranty">Warranty Centre</a><a href="/tradein">Trade-In</a>
${u ? `<a href="/cart">Cart</a><a href="/orders">My Orders</a><a href="/support">Support</a><a href="/invoices">Invoices</a><a href="/profile">Profile (${u.name})</a>${admin ? '<a href="/admin">Admin</a>' : ''}<a href="/logout">Logout</a>`
    : '<a href="/login">Login</a><a href="/register">Register</a>'}
</nav></header>
<div class="labbar"><img src="/logo.png" alt="HexaCyberLab" style="height:22px"><b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b><span>${pr.done}/${pr.total} tests · ${pr.pct}%</span><span class="pbar"><span style="width:${pr.pct}%"></span></span><a href="/tests">Missions</a><a href="/complete">Completion</a></div>
<div class="wrap">${body}</div>${CHAT_WIDGET}</body></html>`;
}
function send(res, code, html, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(html);
}
function redirect(res, to, extraHeaders) {
  res.writeHead(302, Object.assign({ Location: to }, extraHeaders || {}));
  res.end();
}
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', ch => { data += ch; if (data.length > 2e6) req.destroy(); });
    req.on('end', () => {
      const t = data.trim();
      if (t.startsWith('{')) { try { return resolve(JSON.parse(t)); } catch (e) { /* fall through to form parsing */ } }
      const out = {};
      try {
        for (const [k, v] of new URLSearchParams(data)) {
          if (out[k] === undefined) out[k] = v;
          else if (Array.isArray(out[k])) out[k].push(v);
          else out[k] = [out[k], v];
        }
      } catch (e) { /* bad body -> empty params, stay stable */ }
      resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}
function requireLogin(req, res) {
  const u = getUser(req);
  if (!u) { redirect(res, '/login'); return null; }
  return u;
}
function seenVariant(req, kind) {
  const k = clientKey(req);
  if (!enumSightings.has(k)) enumSightings.set(k, new Set());
  const s = enumSightings.get(k);
  s.add(kind);
  if ((s.has('real') && s.has('fake')) || (s.has('noacct') && s.has('badpass'))) pass('auth-enum');
}

/* ----------------------------- shop ----------------------------- */
function homePage(req, res) {
  const cards = products.map(p => `
    <div class="card ${p.flash ? 'flash' : ''}">
      <div class="mut">${esc(p.cat)}${p.flash ? ' · <span class="bad"><b>FLASH SALE</b></span>' : ''}</div>
      <h3>${esc(p.name)}</h3><p>${esc(p.blurb)}</p>
      <p><b>${money(p.price)}</b> · Stock: ${p.stock}</p>
      <a class="btn" href="/product/${p.id}">View</a>
    </div>`).join('');
  send(res, 200, layout(req, 'Shop', `<h1>Electronics, done right.</h1><div class="grid">${cards}</div>`));
}
function productPage(req, res, id) {
  const p = prod(id);
  if (!p) return send(res, 404, layout(req, 'Not found', '<h1>Product not found</h1>'));
  send(res, 200, layout(req, p.name, `
    <div class="card"><div class="mut">${esc(p.cat)}</div><h1>${esc(p.name)}</h1>
    <p>${esc(p.blurb)}</p><p><b>${money(p.price)}</b> · Stock: ${p.stock}</p>
    <p class="mut">Serial number is assigned at purchase and shown on your order &amp; warranty registration.</p>
    <form method="POST" action="/cart/add">
      <input type="hidden" name="productId" value="${p.id}">
      <label>Quantity</label><input type="number" name="qty" value="1" min="1">
      <button class="btn">Add to cart</button></form></div>`));
}
/* ----------------------------- search (legacy query layer) ----------------------------- */
function evalSearch(q) {
  /* The legacy catalogue search builds its query by string concatenation… */
  const query = `SELECT * FROM products WHERE name LIKE '%${q}%' OR cat LIKE '%${q}%' OR blurb LIKE '%${q}%'`;
  const tautology = /'\s*or\s*'?\d+'?\s*=\s*'?\d+'?/i.test(q) || /'\s*or\s+'[^']*'\s*=\s*'[^']*'/i.test(q) || /\bor\s+1\s*=\s*1\b/i.test(q);
  if (tautology) return { rows: products, query, injected: true };
  const term = String(q || '').toLowerCase();
  const rows = products.filter(p => (p.name + ' ' + p.cat + ' ' + p.blurb).toLowerCase().includes(term));
  return { rows, query, injected: false };
}
function searchPage(req, res, url) {
  const u = getUser(req);
  const q = url.searchParams.get('q');
  let results = '';
  if (q !== null) {
    const r = evalSearch(q);
    if (r.injected) pass('search-sqli');
    if (XSS_RE.test(q)) pass('search-xss');
    const rows = r.rows.map(p => `<tr><td><a href="/product/${p.id}">${esc(p.name)}</a></td><td>${esc(p.cat)}</td><td>${money(p.price)}</td><td>${p.stock}</td></tr>`).join('');
    /* VULN-T11/T12: the term and the built query are reflected UNESCAPED. */
    results = `<div class="card"><h3>Results for: ${q}</h3>
      <p class="mut">Query executed: <code>${r.query}</code></p>
      <table><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th></tr>${rows || '<tr><td colspan="4">No matches</td></tr>'}</table></div>`;
  }
  send(res, 200, layout(req, 'Search', `<h1>Search the catalogue</h1>
    <div class="card"><form method="GET" action="/search">
    <label>Search term</label><input name="q" value="${q ? esc(q) : ''}" placeholder="e.g. Aurora">
    <button class="btn">Search</button></form></div>${results}`));
}

/* ----------------------------- auth ----------------------------- */
function loginPage(req, res, msg) {
  send(res, 200, layout(req, 'Login', `<div class="card" style="max-width:420px;margin:auto">
    <h1>Login</h1>${msg ? `<p class="bad">${esc(msg)}</p>` : ''}
    <form method="POST" action="/login"><label>Email</label><input name="email" type="email" required>
    <label>Password</label><input name="password" type="password" required>
    <button class="btn">Login</button></form>
    <p class="mut"><a href="/forgot">Forgot password?</a> · <a href="/register">Create account</a></p></div>`));
}
/* The legacy query path: credentials are dropped into a string-built query. */
function sqliLoginTarget(email, password) {
  const inj = /('|")\s*(or|and)\s+('?\d+'?\s*=\s*'?\d+'?|'[^']*'\s*=\s*'[^']*')/i;
  const comment = /--(\s|$)|#/.test(email);
  if (inj.test(email) || comment) {
    const prefix = String(email).split(/['"]/)[0].trim().toLowerCase();
    const named = users.find(x => x.email === prefix);
    return named || users[0]; /* classic ' OR '1'='1 lands on the first row: the admin */
  }
  if (inj.test(password)) return users.find(x => x.email === String(email).toLowerCase()) || null;
  return null;
}
async function loginPost(req, res) {
  const b = await readBody(req);
  const email = String(b.email || '').toLowerCase();
  const password = String(b.password || '');
  const u = users.find(x => x.email === email && x.password === password);
  if (u) {
    loginFailures.delete(email);
    if (u.email === 'admin@hexaelectro.local' && password === 'Admin@123') pass('auth-default');
    const sid = crypto.randomBytes(16).toString('hex');
    sessions.set(sid, u.id);
    /* role is stored in a plain, unsigned cookie (see auth-cookie test). */
    return redirect(res, '/', { 'Set-Cookie': [`sid=${sid}; Path=/; HttpOnly`, `role=${u.role}; Path=/`] });
  }
  /* legacy injection path — a "successful" query match logs you in without the password */
  const target = sqliLoginTarget(String(b.email || ''), password);
  if (target) {
    pass('auth-sqli');
    const sid = crypto.randomBytes(16).toString('hex');
    sessions.set(sid, target.id);
    return redirect(res, '/', { 'Set-Cookie': [`sid=${sid}; Path=/; HttpOnly`, `role=${target.role}; Path=/`] });
  }
  /* VULN-T02: distinct messages reveal whether the account exists (enumeration),
     and VULN-T03: failures are never throttled or locked (brute force). */
  const exists = users.some(x => x.email === email);
  const fails = (loginFailures.get(email) || 0) + 1;
  loginFailures.set(email, fails);
  if (fails >= 10) pass('auth-brute');
  seenVariant(req, exists ? 'badpass' : 'noacct');
  return loginPage(req, res, exists ? 'Incorrect password for that account.' : 'No account found for that email.');
}
function registerPage(req, res, msg) {
  send(res, 200, layout(req, 'Register', `<div class="card" style="max-width:420px;margin:auto">
    <h1>Create account</h1>${msg ? `<p class="bad">${esc(msg)}</p>` : ''}
    <form method="POST" action="/register"><label>Name</label><input name="name" required>
    <label>Email</label><input name="email" type="email" required>
    <label>Password</label><input name="password" type="password" required>
    <button class="btn">Register</button></form></div>`));
}
async function registerPost(req, res) {
  const b = await readBody(req);
  const email = String(b.email || '').toLowerCase();
  if (users.some(x => x.email === email)) return registerPage(req, res, 'Email already registered.');
  /* VULN-T10: no password policy at all — a 1-character password is accepted. */
  if (String(b.password || '').length < 4) pass('reg-weak');
  if (XSS_RE.test(String(b.name || ''))) pass('profile-xss');
  const u = { id: nextUserId, name: String(b.name || 'Customer'), email, password: String(b.password || ''), role: 'customer', address: '', resetToken: 'reset-' + nextUserId, tradeInCredit: 0, tradeInDevice: '' };
  nextUserId++;
  users.push(u);
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, u.id);
  redirect(res, '/', { 'Set-Cookie': [`sid=${sid}; Path=/; HttpOnly`, `role=customer; Path=/`] });
}
function logout(req, res) {
  const sid = parseCookies(req).sid;
  if (sid) sessions.delete(sid);
  redirect(res, '/', { 'Set-Cookie': ['sid=; Path=/; Max-Age=0', 'role=; Path=/; Max-Age=0'] });
}
/* VULN-T04: password-reset tokens are predictable: "reset-" + sequential user id. */
function forgotPage(req, res, msg) {
  send(res, 200, layout(req, 'Forgot password', `<div class="card" style="max-width:420px;margin:auto">
    <h1>Forgot password</h1>${msg ? `<p>${esc(msg)}</p>` : ''}
    <form method="POST" action="/forgot"><label>Email</label><input name="email" type="email" required>
    <button class="btn">Send reset link</button></form>
    <p class="mut">Demo lab: the "emailed" link is shown on screen after submitting.</p></div>`));
}
async function forgotPost(req, res) {
  const b = await readBody(req);
  const email = String(b.email || '').toLowerCase();
  const u = users.find(x => x.email === email);
  seenVariant(req, u ? 'real' : 'fake');
  if (!u) return forgotPage(req, res, 'If that account exists, a reset link was sent.');
  const k = clientKey(req);
  if (!forgotGiven.has(k)) forgotGiven.set(k, new Set());
  forgotGiven.get(k).add(email);
  u.resetToken = 'reset-' + u.id;
  return forgotPage(req, res, `Reset link (demo): /reset?token=${u.resetToken}`);
}
function resetPage(req, res, url, msg) {
  const token = url.searchParams.get('token') || '';
  send(res, 200, layout(req, 'Reset password', `<div class="card" style="max-width:420px;margin:auto">
    <h1>Reset password</h1>${msg ? `<p class="bad">${esc(msg)}</p>` : ''}
    <form method="POST" action="/reset"><input type="hidden" name="token" value="${esc(token)}">
    <label>New password</label><input name="password" type="password" required>
    <button class="btn">Set new password</button></form></div>`));
}
async function resetPost(req, res) {
  const b = await readBody(req);
  const u = users.find(x => x.resetToken && x.resetToken === String(b.token || ''));
  if (!u) return resetPage(req, res, new URL(req.url, 'http://x'), 'Invalid or expired token.');
  /* detection: a token this client was never given was guessed correctly */
  const given = forgotGiven.get(clientKey(req));
  if (!given || !given.has(u.email)) pass('auth-reset');
  u.password = String(b.password || '');
  u.resetToken = '';
  redirect(res, '/login');
}

/* ----------------------------- cart & checkout ----------------------------- */
function cartOf(u) { if (!carts.has(u.id)) carts.set(u.id, []); return carts.get(u.id); }
async function cartAdd(req, res) {
  const u = requireLogin(req, res); if (!u) return;
  const b = await readBody(req);
  const p = prod(b.productId);
  if (!p) return redirect(res, '/');
  /* VULN-T14: quantity is believed as-is — zero and NEGATIVE quantities are accepted. */
  const qty = parseInt(b.qty, 10);
  const lineQty = Number.isFinite(qty) ? qty : 1;
  const cart = cartOf(u);
  const line = cart.find(l => l.productId === p.id);
  if (line) line.qty += lineQty; else cart.push({ productId: p.id, qty: lineQty });
  redirect(res, '/cart');
}
function cartPage(req, res) {
  const u = requireLogin(req, res); if (!u) return;
  const cart = cartOf(u);
  if (!cart.length) return send(res, 200, layout(req, 'Cart', '<h1>Your cart is empty</h1>'));
  /* VULN-T13: unit prices are round-tripped through hidden form fields and trusted at checkout. */
  const rows = cart.map(l => {
    const p = prod(l.productId);
    return `<tr><td>${esc(p.name)}</td><td>${l.qty}</td>
      <td><input type="text" name="price_${p.id}" value="${p.price}" style="width:90px"></td>
      <td>${money(p.price * l.qty)}</td></tr>`;
  }).join('');
  send(res, 200, layout(req, 'Cart', `<h1>Cart &amp; Checkout</h1>
    <form method="POST" action="/checkout"><table>
    <tr><th>Product</th><th>Qty</th><th>Unit price ($)</th><th>Line total</th></tr>${rows}</table>
    <p>Trade-in credit available: <b>${money(u.tradeInCredit)}</b>${u.tradeInDevice ? ` (for ${esc(u.tradeInDevice)})` : ''} — applied automatically.</p>
    <label>Coupon code</label><input name="coupon" placeholder="Try ELECTRO10">
    <button class="btn">Place order</button></form>`));
}
async function checkout(req, res) {
  const u = requireLogin(req, res); if (!u) return;
  const b = await readBody(req);
  const cart = cartOf(u);
  if (!cart.length) return redirect(res, '/cart');
  /* stock validation happens FIRST... */
  for (const l of cart) {
    const p = prod(l.productId);
    if (!p || p.stock < l.qty) return send(res, 400, layout(req, 'Out of stock', `<h1>Not enough stock for ${esc(p ? p.name : 'item')}</h1><p><a href="/cart">Back to cart</a></p>`));
  }
  /* VULN-T16: ...then a slow "payment processing" pause, THEN decrement.
     Check-then-act with no lock: parallel checkouts oversell limited stock. */
  if (cart.some(l => { const p = prod(l.productId); return p && p.flash; })) await sleep(500);
  let subtotal = 0;
  let priceTampered = false, badQty = false;
  const items = [];
  for (const l of cart) {
    const p = prod(l.productId);
    const submitted = parseFloat(b['price_' + p.id]);           /* VULN-T13: client price trusted */
    const unit = Number.isFinite(submitted) ? submitted : p.price;
    if (Number.isFinite(submitted) && submitted !== p.price) priceTampered = true;
    if (l.qty < 1) badQty = true;
    subtotal += unit * l.qty;
    p.stock -= l.qty;
    if (l.qty < 1) items.push({ productId: p.id, qty: l.qty, price: unit, serial: '' });
    for (let i = 0; i < l.qty; i++) {
      const serial = 'HE' + (serialCounter++);
      devices.push({ serial, productId: p.id, ownerId: u.id, purchased: today(), warrantyEnd: addMonths(today(), 24) });
      items.push({ productId: p.id, qty: 1, price: unit, serial });
    }
  }
  if (priceTampered) pass('checkout-price');
  if (badQty) pass('checkout-qty');
  if (products.some(p => p.stock < 0)) pass('checkout-race');
  /* VULN-T15: coupon reuse — usage IS counted here, but never ENFORCED. */
  let discount = 0;
  const code = String(b.coupon || '').toUpperCase().trim();
  if (code && coupons[code]) {
    discount = subtotal * coupons[code] / 100;
    if (!couponUses.has(u.id)) couponUses.set(u.id, new Map());
    const uses = couponUses.get(u.id);
    const n = (uses.get(code) || 0) + 1;
    uses.set(code, n);
    if (n >= 2) pass('checkout-coupon');
  }
  const tradeIn = u.tradeInCredit || 0;                          /* credit set from client value — tradein-value test */
  const total = Math.max(0, subtotal - discount - tradeIn);
  const order = { id: nextOrderId++, userId: u.id, items, total, coupon: code || '', tradeIn, status: 'Processing', date: today() };
  orders.push(order);
  u.tradeInCredit = 0; u.tradeInDevice = '';
  carts.set(u.id, []);
  redirect(res, '/order/' + order.id);
}
function ordersPage(req, res) {
  const u = requireLogin(req, res); if (!u) return;
  const mine = orders.filter(o => o.userId === u.id);
  const rows = mine.map(o => `<tr><td><a href="/order/${o.id}">#${o.id}</a></td><td>${o.date}</td><td>${money(o.total)}</td><td>${esc(o.status)}</td></tr>`).join('');
  send(res, 200, layout(req, 'My Orders', `<h1>My Orders</h1><table><tr><th>Order</th><th>Date</th><th>Total</th><th>Status</th></tr>${rows || '<tr><td colspan="4">No orders yet</td></tr>'}</table>`));
}
function orderPage(req, res, id) {
  const u = requireLogin(req, res); if (!u) return;
  const o = orders.find(x => x.id === Number(id));
  if (!o) return send(res, 404, layout(req, 'Not found', '<h1>Order not found</h1>'));
  /* VULN-T17: no ownership check — any logged-in user can read any order (IDOR). */
  if (o.userId !== u.id) pass('orders-idor');
  const rows = o.items.map(it => {
    const p = prod(it.productId);
    return `<tr><td>${esc(p ? p.name : '?')}</td><td>${esc(it.serial || '')}</td><td>${money(it.price)}</td></tr>`;
  }).join('');
  send(res, 200, layout(req, 'Order #' + o.id, `<h1>Order #${o.id}</h1>
    <p class="mut">${o.date} · Status: ${esc(o.status)}${o.coupon ? ` · Coupon: ${esc(o.coupon)}` : ''}${o.tradeIn ? ` · Trade-in credit: ${money(o.tradeIn)}` : ''}</p>
    <table><tr><th>Product</th><th>Serial number</th><th>Price paid</th></tr>${rows}</table>
    <p><b>Total paid: ${money(o.total)}</b></p>
    <p class="mut">Keep your serial numbers — you need them in the <a href="/warranty">Warranty Centre</a>.</p>`));
}

const _kC = 'WkhWQ1Y=';

/* ----------------------------- trade-in ----------------------------- */
const GRADE_VALUES = { A: 300, B: 180, C: 90, D: 30 }; /* the server's own valuation table */
function tradeInPage(req, res, msg) {
  const u = requireLogin(req, res); if (!u) return;
  send(res, 200, layout(req, 'Trade-In', `<div class="card" style="max-width:560px;margin:auto">
    <h1>Trade in your old device</h1>${msg ? `<p class="ok">${esc(msg)}</p>` : ''}
    <p class="mut">Tell us the device and its condition — we estimate the value instantly and apply it as checkout credit.</p>
    <form method="POST" action="/tradein" id="tiForm">
      <label>Old device model</label><input name="device" required placeholder="e.g. Aurora X3 Phone">
      <label>Condition grade</label>
      <select name="grade" id="tiGrade">
        <option value="A">A — Like new</option><option value="B">B — Good</option>
        <option value="C">C — Fair</option><option value="D">D — Damaged</option>
      </select>
      <label>Estimated value (USD)</label>
      <input name="value" id="tiValue" value="180">
      <button class="btn">Apply trade-in credit</button></form>
    <script>
      var base={A:300,B:180,C:90,D:30};
      document.getElementById('tiGrade').addEventListener('change',function(){
        document.getElementById('tiValue').value=base[this.value];});
    </script></div>`));
}
async function tradeInPost(req, res) {
  const u = requireLogin(req, res); if (!u) return;
  const b = await readBody(req);
  /* VULN-T18: the trade-in VALUE is taken from the client submission, never recomputed server-side. */
  const value = parseFloat(b.value);
  u.tradeInCredit = Number.isFinite(value) ? value : 0;
  u.tradeInDevice = String(b.device || 'device') + ' (Grade ' + String(b.grade || '?') + ')';
  const expected = GRADE_VALUES[String(b.grade || '').toUpperCase()];
  if (expected !== undefined && Number.isFinite(value) && value !== expected) pass('tradein-value');
  return tradeInPage(req, res, `Trade-in credit of ${money(u.tradeInCredit)} applied to your account. It will be deducted at checkout.`);
}

/* ----------------------------- warranty centre ----------------------------- */
function warrantyPage(req, res, msg) {
  const u = requireLogin(req, res); if (!u) return;
  const mine = devices.filter(d => d.ownerId === u.id);
  const rows = mine.map(dv => {
    const p = prod(dv.productId);
    return `<tr><td>${esc(dv.serial)}</td><td>${esc(p ? p.name : '?')}</td><td>${esc(dv.warrantyEnd || '-')}</td></tr>`;
  }).join('');
  const myClaims = claims.filter(c => c.userId === u.id).map(c =>
    `<tr><td><a href="/warranty/claim/${c.id}">${c.id}</a></td><td>${esc(c.serial)}</td><td>${esc(c.status)}</td></tr>`).join('');
  send(res, 200, layout(req, 'Warranty Centre', `<h1>Warranty Centre</h1>${msg ? `<p class="ok">${esc(msg)}</p>` : ''}
    <div class="card"><h3>My registered devices</h3><table><tr><th>Serial</th><th>Product</th><th>Warranty until</th></tr>${rows || '<tr><td colspan="3">None yet</td></tr>'}</table></div>
    <div class="card"><h3>Register a product serial</h3>
      <form method="POST" action="/warranty/register">
      <label>Serial number</label><input name="serial" required placeholder="HE100010">
      <input type="hidden" name="warranty_months" value="12">
      <button class="btn">Register</button></form></div>
    <div class="card"><h3>Check a serial (warranty lookup)</h3>
      <form method="GET" action="/warranty/lookup"><label>Serial number</label>
      <input name="serial" required placeholder="HE100001"><button class="btn alt">Look up</button></form></div>
    <div class="card"><h3>File a warranty claim</h3>
      <form method="POST" action="/warranty/claim">
      <label>Serial number</label><input name="serial" required>
      <label>Describe the issue</label><textarea name="issue" required></textarea>
      <button class="btn">File claim</button></form>
      <table><tr><th>Claim</th><th>Serial</th><th>Status</th></tr>${myClaims || '<tr><td colspan="3">No claims yet</td></tr>'}</table></div>`));
}
async function warrantyRegister(req, res) {
  const u = requireLogin(req, res); if (!u) return;
  const b = await readBody(req);
  const dv = devices.find(d => d.serial === String(b.serial || '').trim().toUpperCase());
  if (!dv) return warrantyPage(req, res, 'Unknown serial number.');
  /* VULN-T21: warranty length comes from a client parameter (warranty_months) — tamper it to extend cover. */
  const months = parseInt(b.warranty_months, 10);
  if (b.warranty_months !== undefined && Number.isFinite(months) && months !== 12) pass('warranty-extend');
  dv.ownerId = u.id;
  dv.purchased = today();
  dv.warrantyEnd = addMonths(today(), Number.isFinite(months) ? months : 12);
  return warrantyPage(req, res, `Registered ${dv.serial}. Warranty valid until ${dv.warrantyEnd}.`);
}
/* VULN-T19/T20: unauthenticated serial lookup leaks product + owner identity; serials are sequential. */
function warrantyLookup(req, res, url) {
  const serial = (url.searchParams.get('serial') || '').trim().toUpperCase();
  const k = clientKey(req);
  if (!lookupLog.has(k)) lookupLog.set(k, []);
  const log = lookupLog.get(k);
  const now = Date.now();
  while (log.length && now - log[0].t > 10 * 60 * 1000) log.shift();
  log.push({ serial, t: now });
  if (new Set(log.map(e => e.serial)).size >= 5) pass('warranty-enum');
  const dv = devices.find(d => d.serial === serial);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  if (!dv) return res.end(JSON.stringify({ found: false, serial }));
  if (dv.ownerId) {
    const viewer = getUser(req);
    if (!viewer || viewer.id !== dv.ownerId) pass('warranty-lookup');
  }
  const p = prod(dv.productId);
  const owner = dv.ownerId ? userById(dv.ownerId) : null;
  res.end(JSON.stringify({
    found: true, serial: dv.serial, product: p ? p.name : null,
    owner: owner ? owner.name : 'Unregistered', ownerEmail: owner ? owner.email : null,
    purchased: dv.purchased, warrantyEnd: dv.warrantyEnd,
    underWarranty: dv.warrantyEnd ? dv.warrantyEnd >= today() : false,
  }, null, 2));
}
async function claimPost(req, res) {
  const u = requireLogin(req, res); if (!u) return;
  const b = await readBody(req);
  /* VULN-T22 (write): no check that the serial belongs to the claimant. */
  const serial = String(b.serial || '').trim().toUpperCase();
  const dv = devices.find(d => d.serial === serial);
  if (dv && dv.ownerId && dv.ownerId !== u.id) pass('warranty-claim');
  const claim = { id: 'CLM-' + (claimCounter++), serial, userId: u.id, issue: String(b.issue || ''), status: 'Open', date: today() };
  claims.push(claim);
  redirect(res, '/warranty/claim/' + claim.id);
}
function claimPage(req, res, id) {
  const u = requireLogin(req, res); if (!u) return;
  const c = claims.find(x => x.id === id);
  if (!c) return send(res, 404, layout(req, 'Not found', '<h1>Claim not found</h1>'));
  /* VULN-T22 (read): any logged-in user can open any claim by id — no ownership check. */
  if (c.userId !== u.id) pass('warranty-claim');
  const owner = userById(c.userId);
  send(res, 200, layout(req, 'Claim ' + c.id, `<div class="card"><h1>Claim ${esc(c.id)}</h1>
    <p>Serial: <b>${esc(c.serial)}</b></p><p>Filed by: ${esc(owner ? owner.name : '?')} (${esc(owner ? owner.email : '')})</p>
    <p>Issue: ${esc(c.issue)}</p><p>Status: <span class="tag">${esc(c.status)}</span></p><p class="mut">${esc(c.date)}</p></div>`));
}

const _xE = 'SDZIMg==';

/* ----------------------------- support (stored XSS) ----------------------------- */
function supportPage(req, res) {
  const u = requireLogin(req, res); if (!u) return;
  const mine = tickets.filter(t => t.userId === u.id);
  const rows = mine.map(t => `<tr><td><a href="/support/${t.id}">#${t.id}</a></td><td>${t.subject}</td><td>${esc(t.status)}</td></tr>`).join('');
  send(res, 200, layout(req, 'Support', `<h1>Support</h1>
    <div class="card"><h3>New ticket</h3><form method="POST" action="/support">
    <label>Subject</label><input name="subject" required>
    <label>Message</label><textarea name="body" required></textarea>
    <button class="btn">Submit ticket</button></form></div>
    <table><tr><th>Ticket</th><th>Subject</th><th>Status</th></tr>${rows || '<tr><td colspan="3">No tickets yet</td></tr>'}</table>`));
}
async function supportPost(req, res) {
  const u = requireLogin(req, res); if (!u) return;
  const b = await readBody(req);
  if (XSS_RE.test(String(b.subject || '')) || XSS_RE.test(String(b.body || ''))) pass('support-xss');
  const t = { id: nextTicketId++, userId: u.id, subject: String(b.subject || ''), body: String(b.body || ''), status: 'Open', date: today() };
  tickets.push(t);
  redirect(res, '/support/' + t.id);
}
function ticketPage(req, res, id) {
  const u = requireLogin(req, res); if (!u) return;
  const t = tickets.find(x => x.id === Number(id));
  if (!t) return send(res, 404, layout(req, 'Not found', '<h1>Ticket not found</h1>'));
  /* VULN-T23: subject & body rendered UNESCAPED (stored XSS — fires for support staff/admins too). */
  send(res, 200, layout(req, 'Ticket #' + t.id, `<div class="card"><h1>Ticket #${t.id}: ${t.subject}</h1>
    <p>${t.body}</p><p class="mut">Status: ${esc(t.status)} · ${esc(t.date)}</p></div>`));
}

/* ----------------------------- invoices (unrestricted upload) ----------------------------- */
function invoicesPage(req, res) {
  const u = requireLogin(req, res); if (!u) return;
  const mine = invoices.filter(i => i.userId === u.id);
  const rows = mine.map(i => `<tr><td><a href="/invoice/${i.id}">${esc(i.title)}</a></td></tr>`).join('');
  send(res, 200, layout(req, 'Invoices', `<h1>My Invoices</h1>
    <div class="card"><h3>Upload an invoice</h3>
    <form method="POST" action="/invoices/upload">
    <label>Title</label><input name="title" required>
    <label>Invoice file contents (HTML/text)</label><textarea name="content" rows="6" required placeholder="Paste the invoice document here"></textarea>
    <button class="btn">Upload</button></form></div>
    <table><tr><th>Invoice</th></tr>${rows || '<tr><td>No invoices yet</td></tr>'}</table>`));
}
async function invoiceUpload(req, res) {
  const u = requireLogin(req, res); if (!u) return;
  const b = await readBody(req);
  /* VULN-T24: any content accepted, no type/size validation, stored verbatim... */
  if (/<\s*(script|html|svg|iframe)|on\w+\s*=/i.test(String(b.content || ''))) pass('invoice-upload');
  const inv = { id: nextInvoiceId++, userId: u.id, title: String(b.title || 'Invoice'), content: String(b.content || '') };
  invoices.push(inv);
  redirect(res, '/invoices');
}
function invoiceServe(req, res, id) {
  const inv = invoices.find(i => i.id === Number(id));
  if (!inv) return send(res, 404, 'Not found', 'text/plain');
  /* VULN-T25: ...served back as text/html to anyone, logged in or not — no ownership check (IDOR). */
  const viewer = getUser(req);
  if (!viewer || viewer.id !== inv.userId) pass('invoice-idor');
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(inv.content);
}

/* ----------------------------- profile (CSRF + mass assignment) ----------------------------- */
function profilePage(req, res, msg) {
  const u = requireLogin(req, res); if (!u) return;
  /* VULN-T09: this state-changing form carries NO CSRF token, and the POST accepts cross-site requests. */
  send(res, 200, layout(req, 'Profile', `<div class="card" style="max-width:520px;margin:auto">
    <h1>Profile &amp; Settings</h1>${msg ? `<p class="ok">${esc(msg)}</p>` : ''}
    <form method="POST" action="/profile">
    <label>Full name</label><input name="name" value="${esc(u.name)}">
    <label>Delivery address</label><input name="address" value="${esc(u.address)}">
    <label>Email</label><input name="email" value="${esc(u.email)}">
    <button class="btn">Save changes</button></form>
    <p class="mut">Role: ${esc(u.role)} · Trade-in credit: ${money(u.tradeInCredit)}</p></div>`));
}
async function profilePost(req, res) {
  const u = requireLogin(req, res); if (!u) return;
  const b = await readBody(req);
  /* CSRF proof: a state change arrives cross-site (foreign Origin) or without the lab's own marker cookie. */
  const origin = req.headers.origin || '';
  const marker = parseCookies(req).hx_origin;
  let crossSite = false;
  if (origin) { try { if (new URL(origin).host !== req.headers.host) crossSite = true; } catch (e) { crossSite = true; } }
  else if (!marker) crossSite = true;
  if (crossSite) pass('profile-csrf');
  if (b.name) { if (XSS_RE.test(String(b.name))) pass('profile-xss'); u.name = String(b.name); }
  if (b.address) u.address = String(b.address);
  if (b.email) u.email = String(b.email).toLowerCase();
  /* VULN-T07: mass assignment — the handler also honours fields the form never shows. */
  if (b.role !== undefined && String(b.role)) {
    const before = u.role;
    u.role = String(b.role);
    if (u.role === 'admin' && before !== 'admin') pass('profile-mass');
  }
  if (b.tradeInCredit !== undefined) {
    const v = parseFloat(b.tradeInCredit);
    if (Number.isFinite(v)) { u.tradeInCredit = v; pass('profile-mass'); }
  }
  return profilePage(req, res, 'Profile updated.');
}

/* ----------------------------- API: excess data exposure ----------------------------- */
/* VULN-T27: no authentication at all; returns every customer's email + device serials. */
function apiExport(req, res) {
  pass('api-export');
  const data = users.filter(u => u.role === 'customer').map(u => ({
    id: u.id, name: u.name, email: u.email,
    serials: devices.filter(d => d.ownerId === u.id).map(d => d.serial),
  }));
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ customers: data }, null, 2));
}

const _kD = 'OEtOVS0=';

/* ----------------------------- admin ----------------------------- */
function adminGate(req, res) {
  const u = requireLogin(req, res); if (!u) return null;
  if (!isAdmin(req)) { send(res, 403, layout(req, 'Forbidden', '<h1>403 — Admins only</h1>')); return null; }
  /* reached the gate: was it the account's real role, or the forged cookie? */
  if (u.role !== 'admin') pass('auth-cookie');
  return u;
}
function adminHome(req, res) {
  if (!adminGate(req, res)) return;
  send(res, 200, layout(req, 'Admin', `<h1>Admin Dashboard</h1><div class="grid">
    <div class="card"><h3>Catalogue</h3><p>${products.length} products</p><a class="btn" href="/admin/products">Products</a></div>
    <div class="card"><h3>Orders</h3><p>${orders.length} orders</p><a class="btn" href="/admin/orders">Orders</a></div>
    <div class="card"><h3>Inventory</h3><p>Stock control</p><a class="btn" href="/admin/inventory">Inventory</a></div>
    <div class="card"><h3>Warranty Claims</h3><p>${claims.length} claims</p><a class="btn" href="/admin/claims">Claims</a></div>
    <div class="card"><h3>Support Tickets</h3><p>${tickets.length} tickets</p><a class="btn" href="/admin/tickets">Tickets</a></div>
    </div>`));
}
function adminProducts(req, res) {
  if (!adminGate(req, res)) return;
  const rows = products.map(p => `<tr><td>${p.id}</td><td>${esc(p.name)}</td><td>${money(p.price)}</td><td>${p.stock}</td></tr>`).join('');
  send(res, 200, layout(req, 'Admin Products', `<h1>Products</h1><table><tr><th>ID</th><th>Name</th><th>Price</th><th>Stock</th></tr>${rows}</table>`));
}
function adminOrders(req, res) {
  if (!adminGate(req, res)) return;
  const rows = orders.map(o => { const c = userById(o.userId); return `<tr><td>#${o.id}</td><td>${esc(c ? c.name : '?')} (${esc(c ? c.email : '')})</td><td>${money(o.total)}</td><td>${esc(o.status)}</td></tr>`; }).join('');
  send(res, 200, layout(req, 'Admin Orders', `<h1>Orders</h1><table><tr><th>ID</th><th>Customer</th><th>Total</th><th>Status</th></tr>${rows}</table>`));
}
function adminTickets(req, res) {
  if (!adminGate(req, res)) return;
  const rows = tickets.map(t => { const c = userById(t.userId); return `<tr><td><a href="/support/${t.id}">#${t.id}</a></td><td>${esc(c ? c.email : '')}</td><td>${t.subject}</td><td>${esc(t.status)}</td></tr>`; }).join('');
  send(res, 200, layout(req, 'Admin Tickets', `<h1>Support Tickets</h1><table><tr><th>ID</th><th>Customer</th><th>Subject</th><th>Status</th></tr>${rows}</table><p class="mut">Click a ticket to read it.</p>`));
}
/* VULN-T26: these two "admin" pages check only that you are logged in — never the role. */
function adminInventory(req, res) {
  const u = requireLogin(req, res); if (!u) return;
  if (u.role !== 'admin') pass('admin-bac');
  const rows = products.map(p => `<tr><td>${p.id}</td><td>${esc(p.name)}</td><td>${p.stock}</td><td>${money(p.price * p.stock)}</td></tr>`).join('');
  send(res, 200, layout(req, 'Admin Inventory', `<h1>Inventory (Admin)</h1><table><tr><th>ID</th><th>Product</th><th>Stock</th><th>Stock value</th></tr>${rows}</table>`));
}
function adminClaims(req, res) {
  const u = requireLogin(req, res); if (!u) return;
  if (u.role !== 'admin') pass('admin-bac');
  const rows = claims.map(c => { const o = userById(c.userId); return `<tr><td><a href="/warranty/claim/${c.id}">${c.id}</a></td><td>${esc(c.serial)}</td><td>${esc(o ? o.email : '')}</td><td>${esc(c.issue)}</td><td>${esc(c.status)}</td></tr>`; }).join('');
  send(res, 200, layout(req, 'Admin Claims', `<h1>Warranty Claims (Admin)</h1><table><tr><th>Claim</th><th>Serial</th><th>Customer</th><th>Issue</th><th>Status</th></tr>${rows}</table>`));
}

const _kE = 'S1ZKTQ==';

/* ----------------------------- lab gate (Labs 2–10 start locked) ----------------------------- */
function gatePage(req, res, msg, code) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ${LAB_NUMBER} — ${LAB_NAME} (Locked)</title>
<style>body{font-family:system-ui,Segoe UI,Arial,sans-serif;margin:0;background:#0d1730;color:#e6ecff}
.box{max-width:520px;margin:60px auto;background:#16265c;border:1px solid #2c3d75;border-radius:14px;padding:28px}
input{padding:10px;border:1px solid #41538c;border-radius:8px;width:100%;box-sizing:border-box;margin:6px 0 14px;background:#0d1730;color:#fff}
button{background:#2b59ff;color:#fff;border:0;padding:10px 18px;border-radius:8px;cursor:pointer}
.bad{color:#ff9d94}.mut{color:#9fb0dd;font-size:13px}</style></head><body>
<div class="box"><img src="/logo.png" alt="HexaCyberLab" style="height:44px">
<h1>LAB ${LAB_NUMBER} — ${LAB_NAME}</h1>
<p>🔒 This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
${msg ? `<p class="bad">${esc(msg)}</p>` : ''}
<form method="POST" action="/unlock"><label>Completion key from Lab ${LAB_NUMBER - 1}</label>
<input name="key" placeholder="HX-…" autocomplete="off" required>
<button>Unlock Lab ${LAB_NUMBER}</button></form>
<p class="mut">Keys are earned: finish the previous lab at 100% and its completion page reveals the key. There is no other way in — guessing won't work.</p>
</div>${CHAT_WIDGET}</body></html>`;
  send(res, code || 200, html);
}
async function unlockPost(req, res) {
  const b = await readBody(req);
  const given = String((b && b.key) || '').trim();
  const expected = entryKey();
  let diff = given.length ^ expected.length;
  const len = Math.max(given.length, expected.length);
  for (let i = 0; i < len; i++) diff |= (given.charCodeAt(i) || 0) ^ (expected.charCodeAt(i) || 0);
  if (diff === 0) {
    state.unlocked = true;
    saveState();
    return redirect(res, '/');
  }
  return gatePage(req, res, 'That key was not accepted. Check it and try again.', 403);
}

/* ----------------------------- missions page ----------------------------- */
function testsPage(req, res) {
  const pr = progressSummary();
  const groups = FEATURES.map(f => {
    const list = TESTS.filter(t => t.feature === f);
    const att = state.attempts[f] || 0;
    const cards = list.map(t => {
      const done = !!state.tests[t.id];
      return `<div class="card" style="margin-bottom:10px">
        <b>${done ? '✅' : '⬜'} ${esc(t.name)}</b> <span class="tag">${esc(t.difficulty)}</span> <span class="mut">${esc(t.owasp)}</span>
        <div class="mut">Status: ${done ? '<span class="ok">Completed</span>' : 'Open'} · Attempts on this feature: ${att} · Chatbot guidance unlocks at 3 attempts</div>
        ${t.hints.map((h, i) => `<details><summary>Hint ${i + 1}</summary><p>${esc(h)}</p></details>`).join('')}
      </div>`;
    }).join('');
    return `<h2>${esc(f)} <span class="mut">(${list.filter(t => state.tests[t.id]).length}/${list.length} tests)</span></h2>${cards}`;
  }).join('');
  send(res, 200, layout(req, 'Missions', `<h1>🎯 Missions — LAB ${LAB_NUMBER} · ${LAB_NAME}</h1>
    <p><b>${pr.done}/${pr.total} tests complete · ${pr.pct}%</b> — progress is saved automatically and survives restarts. Tests complete by DOING the exploit; there is no "mark done" button.</p>${groups}`));
}

/* ----------------------------- completion & certificate ----------------------------- */
function completePage(req, res) {
  const pr = progressSummary();
  if (!pr.complete) {
    const open = TESTS.filter(t => !state.tests[t.id]);
    const rows = open.map(t => `<tr><td>${esc(t.feature)}</td><td>${esc(t.name)}</td><td>${esc(t.difficulty)}</td></tr>`).join('');
    return send(res, 200, layout(req, 'Completion', `<h1>Completion — LAB ${LAB_NUMBER} · ${LAB_NAME}</h1>
      <p>You are at <b>${pr.pct}%</b> (${pr.done}/${pr.total} tests). The completion summary, your key and your certificate unlock at 100%.</p>
      <h2>Still to solve (${open.length})</h2><table><tr><th>Feature</th><th>Test</th><th>Level</th></tr>${rows}</table>
      <p><a class="btn" href="/tests">Go to Missions</a></p>`));
  }
  const key = completionKey();
  const perFeature = FEATURES.map(f => {
    const l = TESTS.filter(t => t.feature === f);
    return `<tr><td>${esc(f)}</td><td>${l.length}</td><td>${l.filter(t => state.tests[t.id]).length} completed</td></tr>`;
  }).join('');
  const ways = TESTS.map((t, i) => `<tr><td>${i + 1}</td><td>${esc(t.feature)}</td><td>${esc(t.name)}</td><td>${esc(t.owasp)}</td></tr>`).join('');
  const learned = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('');
  const impacts = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('');
  const reports = TESTS.map(t => `<li><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)}<br><span class="mut">Remediation: ${esc(t.report.remediation)}</span></li>`).join('');
  send(res, 200, layout(req, 'Lab Complete', `<h1>🏁 LAB ${LAB_NUMBER} · ${LAB_NAME} — 100% Complete</h1>
    <div class="card"><h2>1 · What this lab contained</h2>
      <p>This lab had <b>${FEATURES.length} features</b> and <b>${TESTS.length} vulnerability tests</b> in total.</p>
      <table><tr><th>Feature</th><th>Vulnerabilities</th><th>Your result</th></tr>${perFeature}</table></div>
    <div class="card"><h2>2 · How the testing was done — ${TESTS.length} ways</h2>
      <table><tr><th>#</th><th>Feature</th><th>Technique / test</th><th>Class</th></tr>${ways}</table></div>
    <div class="card"><h2>3 · What you learned</h2><ul>${learned}</ul></div>
    <div class="card"><h2>4 · What this means for a real client</h2><ul>${impacts}</ul></div>
    <div class="card"><h2>5 · Writing it in a real report</h2><ul>${reports}</ul></div>
    <div class="card"><h2>6 · Your completion key</h2>
      <p>Lab ${LAB_NUMBER + 1} starts locked. Paste this key into its gate to begin:</p>
      <p style="font-size:20px"><code><b>${esc(key)}</b></code></p>
      <form method="POST" action="/complete/name"><label>Your name (printed on the certificate)</label>
      <input name="name" value="${esc(state.testerName)}" placeholder="e.g. Your Name">
      <button class="btn">Save name &amp; view certificate</button></form>
      <p><a class="btn alt" href="/certificate">View certificate</a></p></div>`));
}
async function completeNamePost(req, res) {
  const b = await readBody(req);
  if (b && b.name) state.testerName = String(b.name).slice(0, 80);
  saveState();
  redirect(res, '/certificate');
}
function certificatePage(req, res) {
  const pr = progressSummary();
  if (!pr.complete) return redirect(res, '/complete');
  const name = state.testerName || 'Dedicated Security Tester';
  const date = state.completedAt ? state.completedAt.slice(0, 10) : today();
  const featCount = FEATURES.length;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER} ${LAB_NAME}</title>
<style>body{font-family:Georgia,serif;background:#e9edf6;margin:0;padding:30px}
.cert{max-width:760px;margin:20px auto;background:#fff;border:3px solid #101d42;border-radius:8px;padding:44px;text-align:center;box-shadow:0 6px 30px rgba(16,29,66,.25)}
.cert h1{color:#101d42;margin:10px 0 4px}.cert h2{color:#2b59ff;font-weight:normal}
.name{font-size:30px;border-bottom:2px solid #c6cde0;display:inline-block;padding:4px 30px;margin:14px 0}
.mut{color:#667085;font-family:system-ui,sans-serif;font-size:13px}
@media print{body{background:#fff;padding:0}.cert{box-shadow:none}}</style></head><body>
<div class="cert">
<img src="/logo.png" alt="HexaCyberLab" style="height:64px">
<h1>Certificate of Completion</h1>
<h2>HexaCyberLab Security Labs</h2>
<p>This certifies that</p>
<p class="name">${esc(name)}</p>
<p>has completed <b>100%</b> of the security tests in</p>
<p style="font-size:20px"><b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b></p>
<p>${TESTS.length} vulnerability tests across ${featCount} features — found, exploited and understood.</p>
<p class="mut">Completed: ${esc(date)} · Verify approach: every test was completed by performing the real exploit in the lab.</p>
<p class="mut"><b>HexaCyberLab</b> — Built by Md. Jony Hassain, Founder</p>
</div></body></html>`;
  send(res, 200, html);
}
function apiProgress(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(progressSummary(), null, 2));
}

/* ----------------------------- chatbot ----------------------------- */
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
const FEATURE_KEYWORDS = [
  ['Authentication', ['login', 'log in', 'sign in', 'password', 'brute', 'reset token', 'forgot', 'cookie', 'session', 'enumeration', 'enumerate', 'default credential']],
  ['Registration & Profile', ['register', 'registration', 'sign up', 'signup', 'profile', 'csrf', 'mass assignment', 'password policy']],
  ['Catalogue & Search', ['search', 'catalogue', 'catalog']],
  ['Cart & Checkout', ['cart', 'checkout', 'coupon', 'flash', 'race', 'quantity', 'price']],
  ['Orders', ['order idor', 'orders', 'order']],
  ['Trade-In', ['trade-in', 'tradein', 'trade in', 'trade']],
  ['Warranty Centre', ['warranty', 'serial', 'claim']],
  ['Support Tickets', ['support', 'ticket', 'stored xss']],
  ['Invoices', ['invoice', 'upload']],
  ['Admin Panel', ['admin', 'inventory', 'access control']],
  ['APIs & Platform', ['api', 'export', 'platform', 'data exposure']],
];
function findFeature(m) {
  for (const f of FEATURES) if (m.includes(f.toLowerCase())) return f;
  let best = null, bestLen = 0;
  for (const [f, kws] of FEATURE_KEYWORDS) for (const kw of kws) {
    if (kw.length > bestLen && m.includes(kw)) { best = f; bestLen = kw.length; }
  }
  return best;
}
function chatReply(raw) {
  const m = ' ' + String(raw == null ? '' : raw).toLowerCase().replace(/\s+/g, ' ') + ' ';
  if (/(who (built|made|created|developed)|founder|jony hassain|author|who is behind)/.test(m)) return ATTRIBUTION;
  if (!state.unlocked) {
    return 'This lab is still locked. Paste the completion key from Lab ' + (LAB_NUMBER - 1) + ' into the gate to start — then I can help you train. (Want to know who built these labs? Just ask.)';
  }
  const pr = progressSummary();
  if (m.includes('key')) {
    if (pr.complete) return 'You earned it — the completion key for the next lab is: ' + completionKey() + ' — paste it into the next lab\'s gate to unlock it.';
    return 'I don\'t have the completion key yet — nobody does. It is only revealed when this lab reaches 100%, and it only comes to me at that same moment. Finish all ' + pr.total + ' tests and we will both see it.';
  }
  const feat = findFeature(m);
  const asksCount = /(how many|which|list|count|tests (are|in)|vulnerabilit)/.test(m);
  const asksHow = /(how|guide|guidance|help me|stuck|solve|bypass|exploit|step|hint|walkthrough|way to)/.test(m);
  if (feat && (asksCount || !asksHow)) {
    const info = pr.features[feat];
    const names = TESTS.filter(t => t.feature === feat).map(t => (state.tests[t.id] ? '✓ ' : '○ ') + t.name).join('\n');
    return feat + ': ' + info.total + ' tests, ' + info.done + ' done, ' + info.attempts + ' attempt(s) logged.\n' + names +
      '\nThe HOW is earned: try this feature at least 3 times yourself, then ask me "how do I test ' + feat + '" and I\'ll guide you step by step.';
  }
  if (feat && asksHow) {
    const att = state.attempts[feat] || 0;
    const open = TESTS.filter(t => t.feature === feat && !state.tests[t.id]);
    if (!open.length) return 'You have already completed every ' + feat + ' test — nothing left to guide there. Progress: ' + pr.done + '/' + pr.total + ' (' + pr.pct + '%).';
    if (att < 3) {
      return 'That feature is locked for help. First try the ' + feat + ' tests yourself at least 3 times — I can see you\'ve tried ' + att + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
    }
    return 'Here is step-by-step guidance for ' + feat + ' (' + att + ' attempts logged):\n' + open.map(t => '• ' + t.name + ' — ' + t.hints[2]).join('\n');
  }
  if (/(progress|score|percent|how far|status|remaining|left)/.test(m)) {
    const next = TESTS.find(t => !state.tests[t.id]);
    return 'Progress: ' + pr.done + '/' + pr.total + ' tests (' + pr.pct + '%).' + (next ? ' Next open test: "' + next.name + '" (' + next.feature + ').' : ' Lab complete — open /complete for your key and certificate.');
  }
  if (/(feature|tests|vulnerabilit|vuln|mission|what.*(can i|to) (test|do))/.test(m)) {
    return 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + FEATURES.length + ' features and ' + pr.total + ' tests:\n' +
      FEATURES.map(f => '• ' + f + ': ' + pr.features[f].total + ' tests (' + pr.features[f].done + ' done)').join('\n') +
      '\nThe full map is on the Missions page (/tests) — every test has hints beside it.';
  }
  return 'I\'m the ' + LAB_NAME + ' lab assistant. You\'re at ' + pr.done + '/' + pr.total + ' tests (' + pr.pct + '%). ' +
    'Ask me about any feature (e.g. "how many tests in Warranty Centre?"), your progress, or — after you\'ve tried a feature at least 3 times — "how do I test <feature>" and I\'ll guide you step by step. The Missions page (/tests) has the full map with hints.';
}
async function apiChat(req, res) {
  const b = await readBody(req);
  const reply = chatReply(b && b.message !== undefined ? b.message : '');
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ reply }));
}

/* ----------------------------- router ----------------------------- */
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const p = url.pathname;
    const m = req.method;
    if (p === '/logo.png') {
      if (LOGO) { res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(LOGO); }
      return send(res, 404, 'logo missing', 'text/plain');
    }
    /* lock gate: until unlocked, only the gate, the unlock POST and the chatbot exist */
    if (!state.unlocked) {
      if (m === 'POST' && p === '/unlock') return unlockPost(req, res);
      if (m === 'POST' && p === '/api/chat') return apiChat(req, res);
      return gatePage(req, res);
    }
    if (m === 'GET' && !parseCookies(req).hx_origin) res.setHeader('Set-Cookie', 'hx_origin=1; Path=/');
    const feat = attemptFor(m, p);
    if (feat) bumpAttempt(feat);
    if (m === 'POST' && p === '/unlock') return redirect(res, '/');
    if (m === 'GET' && p === '/') return homePage(req, res);
    let match;
    if (m === 'GET' && (match = p.match(/^\/product\/(\d+)$/))) return productPage(req, res, match[1]);
    if (m === 'GET' && p === '/search') return searchPage(req, res, url);
    if (m === 'GET' && p === '/tests') return testsPage(req, res);
    if (m === 'GET' && p === '/complete') return completePage(req, res);
    if (m === 'POST' && p === '/complete/name') return completeNamePost(req, res);
    if (m === 'GET' && p === '/certificate') return certificatePage(req, res);
    if (m === 'GET' && p === '/api/progress') return apiProgress(req, res);
    if (m === 'POST' && p === '/api/chat') return apiChat(req, res);
    if (m === 'GET' && p === '/login') return loginPage(req, res);
    if (m === 'POST' && p === '/login') return loginPost(req, res);
    if (m === 'GET' && p === '/register') return registerPage(req, res);
    if (m === 'POST' && p === '/register') return registerPost(req, res);
    if (m === 'GET' && p === '/logout') return logout(req, res);
    if (m === 'GET' && p === '/forgot') return forgotPage(req, res);
    if (m === 'POST' && p === '/forgot') return forgotPost(req, res);
    if (m === 'GET' && p === '/reset') return resetPage(req, res, url);
    if (m === 'POST' && p === '/reset') return resetPost(req, res);
    if (m === 'POST' && p === '/cart/add') return cartAdd(req, res);
    if (m === 'GET' && p === '/cart') return cartPage(req, res);
    if (m === 'POST' && p === '/checkout') return checkout(req, res);
    if (m === 'GET' && p === '/orders') return ordersPage(req, res);
    if (m === 'GET' && (match = p.match(/^\/order\/(\d+)$/))) return orderPage(req, res, match[1]);
    if (m === 'GET' && p === '/tradein') return tradeInPage(req, res);
    if (m === 'POST' && p === '/tradein') return tradeInPost(req, res);
    if (m === 'GET' && p === '/warranty') return warrantyPage(req, res);
    if (m === 'POST' && p === '/warranty/register') return warrantyRegister(req, res);
    if (m === 'GET' && p === '/warranty/lookup') return warrantyLookup(req, res, url);
    if (m === 'POST' && p === '/warranty/claim') return claimPost(req, res);
    if (m === 'GET' && (match = p.match(/^\/warranty\/claim\/(.+)$/))) return claimPage(req, res, match[1]);
    if (m === 'GET' && p === '/support') return supportPage(req, res);
    if (m === 'POST' && p === '/support') return supportPost(req, res);
    if (m === 'GET' && (match = p.match(/^\/support\/(\d+)$/))) return ticketPage(req, res, match[1]);
    if (m === 'GET' && p === '/invoices') return invoicesPage(req, res);
    if (m === 'POST' && p === '/invoices/upload') return invoiceUpload(req, res);
    if (m === 'GET' && (match = p.match(/^\/invoice\/(\d+)$/))) return invoiceServe(req, res, match[1]);
    if (m === 'GET' && p === '/profile') return profilePage(req, res);
    if (m === 'POST' && p === '/profile') return profilePost(req, res);
    if (m === 'GET' && p === '/api/customers/export') return apiExport(req, res);
    if (m === 'GET' && p === '/admin') return adminHome(req, res);
    if (m === 'GET' && p === '/admin/products') return adminProducts(req, res);
    if (m === 'GET' && p === '/admin/orders') return adminOrders(req, res);
    if (m === 'GET' && p === '/admin/tickets') return adminTickets(req, res);
    if (m === 'GET' && p === '/admin/inventory') return adminInventory(req, res);
    if (m === 'GET' && p === '/admin/claims') return adminClaims(req, res);
    send(res, 404, layout(req, 'Not found', '<h1>404 — page not found</h1>'));
  } catch (err) {
    /* stay stable on bad input */
    try { send(res, 500, 'Internal error (lab stayed up).'); } catch (e) { /* socket gone */ }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`HexaElectro — LAB ${LAB_NUMBER} of the HexaCyberLab series (INTENTIONALLY VULNERABLE) at http://${HOST}:${PORT}`);
  console.log('Local use only. Business data resets on restart; lab progress persists in progress.json.');
});
