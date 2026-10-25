#!/usr/bin/env node
/*
 * HexaAutoParts — INTENTIONALLY VULNERABLE auto-parts store practice lab.
 * Zero-dependency Node.js (built-ins only). In-memory data (reset = restart).
 * Binds 127.0.0.1:3016 ONLY. LOCAL PRACTICE ONLY — never deploy.
 */
'use strict';
const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const HOST = '127.0.0.1';
const PORT = 3016;

/* ================= LAB SYSTEM (HexaCyberLab progress engine) =================
 * LAB 8 of the HexaCyberLab Category-1 lab chain. Adds: TESTS registry with
 * server-side detection, per-feature attempt tracking, persistent progress
 * (progress.json), a lock gate, an in-lab assistant, a completion page and a
 * certificate. The business app below is unchanged in behaviour.            */
const LAB_NUMBER = 8;
const LAB_NAME = 'HexaAutoParts';
const LAB_DIR = __dirname;
const PROGRESS_PATH = path.join(LAB_DIR, 'progress.json');

/* Opaque config fragments — assembled at runtime by _join() where needed.
   (No complete credential is stored as a single literal anywhere.) */
const _cfgA = ['TC1YSA==', 'OC04MA=='];
const _cfgB = ['WS05MA==', 'NVc1Qw=='];

/* ============================== SEED DATA ============================== */

let users = [
  { id: 1, email: 'admin@hexaautoparts.local',  pass: 'Admin@123', name: 'Lab Admin',        role: 'admin',  address: '1 Workshop Way, Dhaka',        phone: '+8801700000001' },
  { id: 2, email: 'garage@hexaautoparts.local', pass: 'Trade@123', name: 'SpeedWorks Garage', role: 'trade',  address: '44 Industrial Rd, Gazipur',    phone: '+8801700000002', business: 'SpeedWorks Auto Ltd' },
  { id: 3, email: 'dewan@hexaautoparts.local',  pass: 'User@123',  name: 'Dewan Rahman',      role: 'retail', address: '12 Lakeview Ave, Uttara',      phone: '+8801700000003' },
  { id: 4, email: 'sara@hexaautoparts.local',   pass: 'User@123',  name: 'Sara Ahmed',        role: 'retail', address: '8 Rosewood St, Banani',        phone: '+8801700000004' },
  { id: 5, email: 'omar@hexaautoparts.local',   pass: 'User@123',  name: 'Omar Faruk',        role: 'retail', address: '77 Station Rd, Chattogram',    phone: '+8801700000005' },
];
let nextUserId = 6;

/* fits: list of {make, model, from, to} — part is compatible if vehicle matches any entry */
let parts = [
  { id: 1,  sku: 'BRK-1001', name: 'Ceramic Brake Pads (Front)',      category: 'Brakes',     retail: 59.99,  trade: 41.99,  stock: 120, fits: [{make:'Toyota',model:'Corolla',from:2012,to:2019},{make:'Honda',model:'Civic',from:2016,to:2021}], desc: 'Low-dust ceramic pads, includes wear sensors.' },
  { id: 2,  sku: 'BRK-1002', name: 'Vented Brake Rotor (Front)',      category: 'Brakes',     retail: 84.50,  trade: 59.15,  stock: 60,  fits: [{make:'Ford',model:'F-150',from:2015,to:2020}], desc: 'Coated vented rotor, sold individually.' },
  { id: 3,  sku: 'FLT-2001', name: 'Oil Filter — Spin-On',            category: 'Filters',    retail: 12.99,  trade: 8.99,   stock: 500, fits: [{make:'Toyota',model:'Corolla',from:2009,to:2024},{make:'Honda',model:'Civic',from:2012,to:2024},{make:'Toyota',model:'Hilux',from:2016,to:2024}], desc: 'High-capacity synthetic media oil filter.' },
  { id: 4,  sku: 'FLT-2002', name: 'Engine Air Filter',               category: 'Filters',    retail: 19.99,  trade: 13.50,  stock: 340, fits: [{make:'Honda',model:'CR-V',from:2017,to:2022},{make:'Honda',model:'Civic',from:2016,to:2021}], desc: 'Panel air filter, 30k km service interval.' },
  { id: 5,  sku: 'BAT-3001', name: '12V Battery 70Ah — Heavy Duty',   category: 'Batteries',  retail: 119.00, trade: 88.00,  stock: 85,  fits: [{make:'Ford',model:'F-150',from:2011,to:2024},{make:'Toyota',model:'Hilux',from:2016,to:2024}], desc: '760 CCA, 36-month warranty. Core charge may apply.' },
  { id: 6,  sku: 'BAT-3002', name: '12V Battery 45Ah — Compact',      category: 'Batteries',  retail: 79.00,  trade: 58.50,  stock: 140, fits: [{make:'Honda',model:'Civic',from:2012,to:2024},{make:'Toyota',model:'Corolla',from:2012,to:2024}], desc: '450 CCA compact battery for small cars.' },
  { id: 7,  sku: 'SUS-4001', name: 'Rear Shock Absorber',             category: 'Suspension', retail: 96.75,  trade: 67.70,  stock: 48,  fits: [{make:'Toyota',model:'Hilux',from:2016,to:2023}], desc: 'Gas-charged twin-tube shock, sold individually.' },
  { id: 8,  sku: 'SUS-4002', name: 'Front Strut Assembly (Quick-Strut)', category: 'Suspension', retail: 154.20, trade: 108.00, stock: 30, fits: [{make:'Honda',model:'CR-V',from:2017,to:2022}], desc: 'Complete strut + spring assembly, no compressor needed.' },
  { id: 9,  sku: 'ENG-5001', name: 'Iridium Spark Plugs (Set of 4)',  category: 'Engine',     retail: 44.99,  trade: 31.99,  stock: 260, fits: [{make:'Toyota',model:'Corolla',from:2012,to:2022},{make:'Honda',model:'Civic',from:2016,to:2022}], desc: 'Iridium plugs, 100k km life.' },
  { id: 10, sku: 'ENG-5002', name: 'Alternator 130A',                 category: 'Engine',     retail: 229.00, trade: 165.00, stock: 18,  fits: [{make:'Ford',model:'F-150',from:2015,to:2020}], desc: 'Remanufactured 130A alternator, 24-month warranty.' },
  { id: 11, sku: 'ENG-5003', name: 'Water Pump with Gasket',          category: 'Engine',     retail: 88.40,  trade: 61.90,  stock: 42,  fits: [{make:'BMW',model:'3 Series',from:2012,to:2018}], desc: 'OEM-spec water pump, metal impeller.' },
  { id: 12, sku: 'ENG-5004', name: 'Timing Belt Kit',                 category: 'Engine',     retail: 132.00, trade: 94.00,  stock: 36,  fits: [{make:'Volkswagen',model:'Golf',from:2013,to:2020}], desc: 'Belt, tensioner and idler kit.' },
  { id: 13, sku: 'TRN-6001', name: 'Clutch Kit (3-piece)',            category: 'Transmission', retail: 268.00, trade: 192.00, stock: 14, fits: [{make:'Toyota',model:'Hilux',from:2016,to:2023}], desc: 'Disc, pressure plate and release bearing.' },
  { id: 14, sku: 'ELE-7001', name: 'Headlight Assembly (Left)',       category: 'Electrical', retail: 178.99, trade: 128.00, stock: 22,  fits: [{make:'Honda',model:'Civic',from:2016,to:2021}], desc: 'Halogen headlight assembly, driver side.' },
  { id: 15, sku: 'ENG-5005', name: 'Radiator — Aluminium Core',       category: 'Engine',     retail: 164.00, trade: 118.00, stock: 26,  fits: [{make:'Honda',model:'CR-V',from:2012,to:2016}], desc: 'Two-row aluminium radiator.' },
  { id: 16, sku: 'SUS-4003', name: 'Wheel Bearing Hub Assembly',      category: 'Suspension', retail: 72.30,  trade: 51.20,  stock: 58,  fits: [{make:'Volkswagen',model:'Golf',from:2013,to:2020}], desc: 'Front hub with ABS sensor ring.' },
  { id: 17, sku: 'ENG-5006', name: 'Electric Fuel Pump Module',       category: 'Engine',     retail: 141.60, trade: 101.00, stock: 20,  fits: [{make:'BMW',model:'3 Series',from:2012,to:2018}], desc: 'In-tank fuel pump module with level sender.' },
  { id: 18, sku: 'SUS-4004', name: 'Front Lower Control Arm',         category: 'Suspension', retail: 98.90,  trade: 69.90,  stock: 44,  fits: [{make:'Toyota',model:'Corolla',from:2014,to:2019}], desc: 'Control arm with ball joint and bushings.' },
  { id: 19, sku: 'BRK-1003', name: 'Brake Caliper (Rear Right)',      category: 'Brakes',     retail: 112.45, trade: 79.60,  stock: 33,  fits: [{make:'Ford',model:'F-150',from:2015,to:2020}], desc: 'Remanufactured rear caliper with bracket.' },
];

/* VIN registry — VINs follow a guessable sequential pattern: HAP2026 + 4-digit serial */
let vinRecords = [
  { vin: 'HAP20261001', make: 'Toyota',     model: 'Corolla',  year: 2016, ownerId: 3, owner: 'Dewan Rahman',      address: '12 Lakeview Ave, Uttara',      phone: '+8801700000003', history: ['2024-03-11: Oil change + filter', '2024-09-02: Front brake pads replaced', '2025-01-19: Battery test — OK'] },
  { vin: 'HAP20261002', make: 'Honda',      model: 'Civic',    year: 2019, ownerId: 4, owner: 'Sara Ahmed',        address: '8 Rosewood St, Banani',        phone: '+8801700000004', history: ['2024-05-22: Air filter replaced', '2025-02-14: Headlight assembly (left) replaced', '2025-06-30: Full inspection — pass'] },
  { vin: 'HAP20261003', make: 'Ford',       model: 'F-150',    year: 2018, ownerId: 5, owner: 'Omar Faruk',        address: '77 Station Rd, Chattogram',    phone: '+8801700000005', history: ['2023-11-05: Alternator replaced', '2024-08-17: Rear caliper serviced', '2025-03-09: Battery replaced'] },
  { vin: 'HAP20261004', make: 'Toyota',     model: 'Hilux',    year: 2020, ownerId: 2, owner: 'SpeedWorks Garage', address: '44 Industrial Rd, Gazipur',    phone: '+8801700000002', history: ['2024-01-25: Clutch kit fitted', '2025-04-12: Rear shocks replaced'] },
  { vin: 'HAP20261005', make: 'Honda',      model: 'CR-V',     year: 2018, ownerId: 4, owner: 'Sara Ahmed',        address: '8 Rosewood St, Banani',        phone: '+8801700000004', history: ['2024-07-19: Radiator flushed', '2025-05-01: Front struts replaced'] },
  { vin: 'HAP20261006', make: 'BMW',        model: '3 Series', year: 2015, ownerId: 5, owner: 'Omar Faruk',        address: '77 Station Rd, Chattogram',    phone: '+8801700000005', history: ['2023-09-14: Water pump replaced', '2024-12-02: Fuel pump module replaced'] },
  { vin: 'HAP20261007', make: 'Volkswagen', model: 'Golf',     year: 2017, ownerId: 3, owner: 'Dewan Rahman',      address: '12 Lakeview Ave, Uttara',      phone: '+8801700000003', history: ['2024-04-08: Timing belt kit fitted', '2025-02-27: Wheel bearing (front) replaced'] },
  { vin: 'HAP20261008', make: 'Toyota',     model: 'Corolla',  year: 2021, ownerId: 4, owner: 'Sara Ahmed',        address: '8 Rosewood St, Banani',        phone: '+8801700000004', history: ['2025-01-10: First service — oil + plugs'] },
  { vin: 'HAP20261009', make: 'Ford',       model: 'F-150',    year: 2016, ownerId: 2, owner: 'SpeedWorks Garage', address: '44 Industrial Rd, Gazipur',    phone: '+8801700000002', history: ['2024-06-21: Brake rotors replaced'] },
  { vin: 'HAP20261010', make: 'Honda',      model: 'Civic',    year: 2014, ownerId: 5, owner: 'Omar Faruk',        address: '77 Station Rd, Chattogram',    phone: '+8801700000005', history: ['2023-05-30: Battery replaced', '2024-10-11: Spark plugs replaced'] },
  { vin: 'HAP20261011', make: 'Toyota',     model: 'Hilux',    year: 2019, ownerId: 4, owner: 'Sara Ahmed',        address: '8 Rosewood St, Banani',        phone: '+8801700000004', history: ['2024-02-18: Oil change', '2025-03-22: Clutch inspection — OK'] },
  { vin: 'HAP20261012', make: 'BMW',        model: '3 Series', year: 2017, ownerId: 3, owner: 'Dewan Rahman',      address: '12 Lakeview Ave, Uttara',      phone: '+8801700000003', history: ['2025-07-15: Water pump + coolant service'] },
];

/* "My Vehicles" — per-user saved garage */
let userVehicles = [
  { id: 1, userId: 3, make: 'Toyota', model: 'Corolla', year: 2016, vin: 'HAP20261001', nickname: 'Daily driver' },
  { id: 2, userId: 3, make: 'Volkswagen', model: 'Golf', year: 2017, vin: 'HAP20261007', nickname: 'Weekend car' },
  { id: 3, userId: 4, make: 'Honda', model: 'Civic', year: 2019, vin: 'HAP20261002', nickname: 'Civic' },
  { id: 4, userId: 5, make: 'Ford', model: 'F-150', year: 2018, vin: 'HAP20261003', nickname: 'Work truck' },
  { id: 5, userId: 2, make: 'Toyota', model: 'Hilux', year: 2020, vin: 'HAP20261004', nickname: 'Shop Hilux' },
];
let nextVehicleId = 6;

let quotes = [
  { id: 501, userId: 4, partId: 10, qty: 1, offered: 198.00, status: 'open', note: 'Fleet discount offered' },
  { id: 502, userId: 5, partId: 13, qty: 2, offered: 235.00, status: 'open', note: 'Trade quote for Hilux clutch kits' },
  { id: 503, userId: 3, partId: 1,  qty: 1, offered: 52.00,  status: 'open', note: 'Loyalty quote' },
];
let nextQuoteId = 504;

let orders = [
  { id: 1001, userId: 4, items: [{ partId: 1, qty: 1, price: 59.99 }], total: 59.99, status: 'delivered', accountType: 'retail', vehicle: 'Honda Civic 2019', created: '2026-10-18' },
  { id: 1002, userId: 5, items: [{ partId: 2, qty: 2, price: 84.50 }], total: 169.00, status: 'shipped',   accountType: 'retail', vehicle: 'Ford F-150 2018', created: '2026-10-20' },
  { id: 1003, userId: 2, items: [{ partId: 7, qty: 4, price: 67.70 }], total: 270.80, status: 'delivered', accountType: 'trade',  vehicle: 'Toyota Hilux 2020', created: '2026-10-21' },
];
let nextOrderId = 1004;

let returns = [
  { id: 1, orderId: 1001, userId: 4, reason: 'Wrong side shipped', status: 'approved' },
];
let nextReturnId = 2;

let qa = [
  { id: 1, partId: 1, userId: 4, author: 'Sara Ahmed', text: 'Do these fit the 2018 Corolla too?', answer: 'Yes — fits Corolla 2012–2019.' },
];
let nextQaId = 2;

/* Coupons: valid codes. Vulnerability: no per-user usage tracking, stackable, reusable forever. */
const COUPONS = { 'PARTS15': 0.15, 'TRADE10': 0.10, 'GARAGE25': 0.25 };

const sessions = new Map();   // sid -> userId
const carts = new Map();      // sid -> [{partId, qty}]
const resetTokens = new Map();// email -> token

/* ==================== LAB SYSTEM: STATE + TESTS ==================== */

function _join(shards) {
  return shards.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}
/* Assembled only inside the unlock check (entry) and only at 100% (reward). */
const ENTRY_KEY_SHA256 = '9f5ce14c826d9a75efc161eb21e13e0cf02ac33dca89d3a4836b397666418982';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */
function rewardKey() { return _join([_cfgA[0], ..._cfgB, ..._cfgD, ..._cfgF]); }

function loadState() {
  const dflt = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
  try {
    const s = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
    if (s && typeof s === 'object') return { ...dflt, ...s, tests: s.tests || {}, attempts: s.attempts || {} };
  } catch (e) { /* first run */ }
  return dflt;
}
const state = loadState();
function saveState() {
  try {
    const tmp = PROGRESS_PATH + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, PROGRESS_PATH);
  } catch (e) { /* state is best-effort in a practice lab */ }
}

const FEATURE_ORDER = ['Login & Authentication', 'Registration & Profile', 'Fitment Search', 'VIN Lookup', 'Product Q&A', 'Cart & Checkout', 'Orders', 'Quotes', 'Returns', 'Profile & Garage', 'Admin & Platform'];

const TESTS = [
  { id: 'sqli-login-bypass', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03 Injection', difficulty: 'Intermediate',
    hints: ['The legacy login builds its query by gluing your input into a string — think about what a quote character does to it.', 'Try the email field: a valid email followed by a quote and a boolean condition.', "Email: admin@hexaautoparts.local' OR '1'='1 — any password. The glued-together query now matches the admin row."],
    lesson: "String-built queries let attacker input change the query's logic — the classic route to a full authentication bypass.",
    impact: "On a client site this means an attacker logs in as admin without any password — full account takeover of the business in one request.",
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.' },
    guide: "On the login form, put admin@hexaautoparts.local' OR '1'='1 into the email field and anything into the password field, then submit. The legacy query's condition becomes true for the admin row and a session is created without the real password." },
  { id: 'brute-force', feature: 'Login & Authentication', name: 'Brute Force — No Login Throttling', owasp: 'A07 Auth Failures', difficulty: 'Beginner',
    hints: ['Logins are answered one after another, forever — nothing slows you down or locks the account.', 'Script ten wrong passwords for dewan@hexaautoparts.local in a row and watch every one get processed.', 'After the 10th failed attempt is still accepted for processing, the lab counts the flaw as proven — there is no rate limit, CAPTCHA or lockout anywhere.'],
    lesson: 'Without throttling, lockout or MFA, password guessing is only a matter of time and a wordlist.',
    impact: "Attackers can grind through passwords against your client's accounts undisturbed — weak passwords fall first, then get reused everywhere else.",
    report: { title: 'No Rate Limiting or Lockout on Login (Brute Force)', severity: 'Medium', remediation: 'Add progressive rate limiting and lockout/backoff on failed logins, alert on spikes, and offer MFA.' },
    guide: 'Submit the login form with a wrong password for the same account (e.g. dewan@hexaautoparts.local) ten times in a row. Every attempt is processed normally — the 10th unthrottled failure proves there is no protection.' },
  { id: 'user-enumeration', feature: 'Login & Authentication', name: 'User Enumeration via Password Reset', owasp: 'A07 Auth Failures', difficulty: 'Beginner',
    hints: ['Ask the forgot-password page about two different emails and compare the answers word for word.', 'Try one email that exists (sara@hexaautoparts.local) and one that cannot (nobody@nowhere.test).', 'The two responses differ — one confirms the account exists. That difference is the enumeration oracle.'],
    lesson: 'Different responses for real vs fake accounts hand attackers a free list of valid targets.',
    impact: "Attackers harvest your client's real account emails, then aim phishing and password attacks only where they know they will land.",
    report: { title: 'Account Enumeration via Password-Reset Responses', severity: 'Low', remediation: 'Return one identical message whether or not the account exists ("If the account exists, we emailed a link").' },
    guide: 'POST the forgot-password form twice: once with an existing email (sara@hexaautoparts.local) and once with a made-up one. The existing account gets a "reset link sent" answer, the fake one gets "no account" — submitting both proves the enumeration.' },
  { id: 'predictable-reset-token', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07 Auth Failures', difficulty: 'Intermediate',
    hints: ['The reset token is not random — it is computed from something you already know about the victim.', 'Request a reset for Sara, then look at the token in the simulated inbox link and stare at the email address next to it.', 'Token = first 10 hex characters of the hex encoding of the email address. Compute it for any user — even the admin — and use /reset directly.'],
    lesson: 'A reset token derived from public data is not a secret — anyone can mint one for any account, including admins.',
    impact: "Anyone who knows a client's email address can reset their password and own the account — a direct route into admin accounts.",
    report: { title: 'Predictable Password-Reset Token Enables Account Takeover', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), store only a hash, expire within 30–60 minutes, single use.' },
    guide: 'Take any account email, hex-encode it (Buffer.from(email).toString("hex")) and keep the first 10 characters — that is the token. Open /reset?email=<email>&token=<computed> while logged out, set a new password, and log in as the victim.' },
  { id: 'mass-assignment', feature: 'Registration & Profile', name: 'Mass Assignment — Self-Service Role Upgrade', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration handler builds the new account from whatever fields you POST — not just the ones on the form.', 'Add a field the form never shows you. What field decides what kind of account you get?', 'POST /register with an extra role=admin field (Burp or curl). The server happily creates an admin.'],
    lesson: 'Binding request data straight onto an object lets attackers set fields that were never meant to be user-controlled.',
    impact: 'Attackers register themselves as admin or trade accounts on a client site — privilege escalation at the front door, no exploit chain needed.',
    report: { title: 'Mass Assignment in Registration Allows Role Escalation', severity: 'High', remediation: 'Allowlist assignable fields server-side; set role and other privileged attributes explicitly, never from request data.' },
    guide: 'Intercept a registration request (or use curl) and add the field role=admin to the POST body of /register. The new account is created with the admin role because the handler copies request fields onto the user object.' },
  { id: 'weak-password-policy', feature: 'Registration & Profile', name: 'No Password Policy at Registration', owasp: 'A07 Auth Failures', difficulty: 'Beginner',
    hints: ['Registration asks for a password — but does it ever say no?', 'Try the shortest password the form will accept.', 'Register a new account with the password "x" — one character. It succeeds: there is no length or complexity policy at all.'],
    lesson: 'If users can choose one-character passwords, accounts fall to the first guessing attempt.',
    impact: "Your client's users will pick terrible passwords when allowed — and attackers know exactly which ones to try first.",
    report: { title: 'No Password Policy at Registration', severity: 'Low', remediation: 'Enforce a minimum length (≥10–12) and screen against breached-password lists at registration and reset.' },
    guide: 'Register a new account with a one-character password such as "x". The account is created — proving no minimum length or complexity is enforced.' },
  { id: 'sqli-fitment-search', feature: 'Fitment Search', name: 'SQL-Injection-Style Fitment Search Bypass', owasp: 'A03 Injection', difficulty: 'Intermediate',
    hints: ['The legacy part finder glues your search term into a query string — and even shows you the query it built.', 'A quote followed by OR and a true condition changes what the query means.', "Search for: brake' OR '1'='1 — every one of the 19 parts comes back, whatever your vehicle."],
    lesson: 'Injection is not just for login forms — any input glued into a query (search, filters, sorts) can rewrite its logic.',
    impact: 'On a real client database this is the path from "weird search results" to dumping tables — customers, orders, password hashes.',
    report: { title: 'SQL Injection in Fitment Search (Legacy Query Builder)', severity: 'High', remediation: 'Parameterise all queries and allowlist sort/filter columns; treat the echoed query as an information leak to remove.' },
    guide: "In the part finder's legacy search box, enter brake' OR '1'='1. The naive evaluator treats the condition as always true and returns the entire catalogue, ignoring fitment. A variant, x' OR category='Brakes, extracts a whole category." },
  { id: 'reflected-xss', feature: 'Fitment Search', name: 'Reflected XSS in Part Finder', owasp: 'A03 Injection', difficulty: 'Beginner',
    hints: ['Search for something distinctive and look at how the results page repeats it back to you.', 'The results heading echoes your term without any encoding.', 'Search for <script>alert(1)</script> — it lands in the page as live markup, not text.'],
    lesson: 'Reflected input must be encoded for the context it lands in — otherwise the browser treats data as code.',
    impact: "Attackers send your client's customers a crafted link; the trusted site itself delivers the script that steals sessions or pushes fake payment pages.",
    report: { title: 'Reflected Cross-Site Scripting in Part Finder', severity: 'Medium', remediation: 'Contextually encode all reflected input on output and deploy a restrictive Content-Security-Policy.' },
    guide: 'Search the part finder for <script>alert(1)</script>. The "Results for:" heading prints your term raw, so the payload executes in the victim\u2019s browser.' },
  { id: 'vin-pii-exposure', feature: 'VIN Lookup', name: 'VIN Lookup Exposes Owner PII', owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    hints: ['The VIN lookup is free, public and very talkative.', 'You do not need an account. Try the first VIN you can guess: HAP20261001.', "One lookup hands you the owner's name, home address, phone and full service history."],
    lesson: 'A lookup feature should return the minimum data its job needs — "it was convenient" is how PII ends up public.',
    impact: "Every registered keeper's name, address and phone is exposed — raw material for stalking, targeted scams and social engineering against your client's customers.",
    report: { title: 'VIN Lookup Exposes Registered-Keeper PII Without Authentication', severity: 'High', remediation: 'Require authentication and ownership, and return only the vehicle data the feature needs — never owner PII.' },
    guide: "While logged out, open /vin and look up HAP20261002. You get Sara Ahmed's name, home address, phone number and service history with no credentials at all." },
  { id: 'vin-enumeration', feature: 'VIN Lookup', name: 'VIN Registry Enumeration', owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    hints: ['Look at the shape of a VIN: a fixed prefix and a short number that only goes one direction.', 'HAP20261001 exists. What about ...1002? ...1003? How high does it go?', 'Step through five or more sequential VINs — the whole 12-record registry can be harvested with a tiny loop.'],
    lesson: 'Predictable identifiers turn a one-record leak into a bulk data breach; enumeration must be expected and blunted.',
    impact: "Instead of one customer's data, attackers scrape your client's entire registry in seconds — a reportable mass breach, not an anecdote.",
    report: { title: 'Sequential VINs Allow Full Registry Enumeration', severity: 'Medium', remediation: 'Use unguessable identifiers, rate-limit lookups, monitor for enumeration patterns and require authorisation.' },
    guide: 'Look up five different sequential VINs (HAP20261001 → HAP20261005). Each resolves to a full owner record — the registry has no rate limit or authorisation, so the pattern itself is the exploit.' },
  { id: 'stored-xss-qa', feature: 'Product Q&A', name: 'Stored XSS in Product Q&A', owasp: 'A03 Injection', difficulty: 'Intermediate',
    hints: ['The Q&A box stores exactly what you type and shows it to everyone who opens the part — including admins.', 'Ask a "question" that is not really a question: something with angle brackets and an event handler.', 'Post <script>alert(document.cookie)</script> as a question on any part. It is stored raw and fires for every visitor.'],
    lesson: 'Stored content is rendered to other users — output encoding on render is what separates a comment from a worm.',
    impact: "A payload planted on your client's busiest product page runs in every visitor's browser — session theft, fake checkout overlays, admin takeover when staff read it.",
    report: { title: 'Stored Cross-Site Scripting in Product Q&A', severity: 'High', remediation: 'Encode all user content on output, sanitise rich text with an allowlist, and add a CSP as defence in depth.' },
    guide: 'Log in, open any part, and post a Q&A question containing <script>alert(document.cookie)</script>. It is stored unescaped and executed for every visitor of that product page — including the admin.' },
  { id: 'fitment-bypass', feature: 'Cart & Checkout', name: 'Fitment Check Bypass at Checkout', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The checkout page warns you about incompatible parts and hides the button. Ask yourself: who is doing the checking — your browser or the server?', 'The warning lives in the page. The order endpoint never re-checks compatibility.', "Put the F-150-only Vented Brake Rotor (part 2) in Dewan's cart, then POST /checkout directly with vehicleId=1 — or use the direct-buy partId=2&qty=1."],
    lesson: 'Client-side validation is a UX feature, not a security control — every rule that matters must be re-checked on the server.',
    impact: "Customers receive brake and suspension parts that cannot fit their car — returns, chargebacks, and a genuine safety hazard if a wrong part gets installed.",
    report: { title: 'Server Fails to Enforce Fitment at Checkout (Client-Side-Only Check)', severity: 'Medium', remediation: 'Re-validate fitment server-side for every ordered line against the selected vehicle before creating the order.' },
    guide: "As Dewan (Corolla 2016), send POST /checkout with partId=2&qty=1&vehicleId=1. The browser's fitment block is never re-checked on the server and the order is created for an F-150-only rotor." },
  { id: 'trade-pricing-bypass', feature: 'Cart & Checkout', name: 'Trade-Pricing Bypass via accountType', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Checkout decides your price tier from a field in the request — read the hidden inputs on the checkout page.', 'One of them names your account type. The server believes whatever it says.', 'POST /checkout as retail Dewan with accountType=trade — brake pads drop from $59.99 to the $41.99 trade price.'],
    lesson: 'Pricing tiers are an authorisation decision; if the client supplies the tier, the client sets the price.',
    impact: "Trade pricing is a vetted commercial privilege — when anyone can claim it, your client's margin structure quietly collapses on every order.",
    report: { title: 'Client-Controlled Pricing Tier (accountType) Grants Trade Prices to Retail Users', severity: 'High', remediation: 'Derive the pricing tier from the authenticated account on the server; ignore any tier supplied by the client.' },
    guide: 'As retail customer Dewan, POST /checkout (direct-buy partId=1) with accountType=trade added. The server prices the order from the request parameter, so you pay the $41.99 trade price instead of $59.99 retail.' },
  { id: 'price-tampering', feature: 'Cart & Checkout', name: 'Price Tampering at Checkout', owasp: 'A04 Insecure Design', difficulty: 'Beginner',
    hints: ['The checkout form renders each unit price as an editable input. Editable by whom?', 'The server totals the order from the prices you POST, not from the catalogue.', 'POST /checkout with price_1=0.01 for the brake pads — the order is created at your price.'],
    lesson: 'Prices are server-side facts. Anything the client sends about money must be treated as a claim, never as truth.',
    impact: "Attackers buy your client's stock for pennies while the paperwork looks like valid orders — direct, silent revenue loss.",
    report: { title: 'Price Tampering — Server Trusts Client-Supplied Unit Prices', severity: 'Critical', remediation: 'Recompute every line price and the total from the database at checkout; ignore client-supplied prices entirely.' },
    guide: 'At checkout (or via direct POST), set the field price_1 to 0.01 for the Ceramic Brake Pads and place the order. The server trusts the posted price and the pads are billed at a cent each.' },
  { id: 'quantity-tampering', feature: 'Cart & Checkout', name: 'Negative Quantity Tampering', owasp: 'A04 Insecure Design', difficulty: 'Intermediate',
    hints: ['Direct-buy checkout takes a quantity straight from the request. Quantities are numbers — and numbers can be negative.', 'What happens to the total when qty is below zero? And to the stock count?', 'POST /checkout with partId=3&qty=-5 — the order is created with a negative quantity and a negative total.'],
    lesson: 'Quantities, like prices, are server-side facts: validate range and sign, and compute totals from trusted data.',
    impact: "Negative-quantity orders can generate credit, corrupt stock counts and poison your client's accounting and fulfilment data.",
    report: { title: 'Negative Quantity Accepted at Checkout (Business-Logic Tampering)', severity: 'Medium', remediation: 'Validate quantity as a positive integer within stock limits server-side on every order path, including direct-buy.' },
    guide: 'Use the direct-buy checkout: POST /checkout with partId=3 and qty=-5. The server never validates the sign, so the order is created with quantity −5 and a negative total.' },
  { id: 'coupon-reuse', feature: 'Cart & Checkout', name: 'Unlimited Coupon Reuse', owasp: 'A04 Insecure Design', difficulty: 'Beginner',
    hints: ['The coupon box accepts codes like GARAGE25. The interesting question is what the server remembers about them.', 'Use the same code on one order. Then use it on the next. And the next.', 'There is no redemption ledger: GARAGE25 (25% off) applies on every order, forever. The lab counts the second successful use by the same account.'],
    lesson: 'A promotion without redemption accounting is not a promotion — it is a permanent, unauditable price cut.',
    impact: "A single leaked code becomes a forever-discount on your client's store; finance cannot cap it, expire it, or find out who used it.",
    report: { title: 'Coupon Codes Are Infinitely Reusable (No Redemption Tracking)', severity: 'Medium', remediation: 'Record redemptions per code and per account; enforce single-use/expiry server-side and reject repeats.' },
    guide: 'Place two separate orders as the same user, entering GARAGE25 at checkout both times. The 25% discount applies on both — there is no per-user redemption record.' },
  { id: 'order-idor', feature: 'Orders', name: "Order IDOR — Read Any Customer's Order", owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    hints: ['Order pages live at predictable addresses: /order?id=1001, 1002, … Whose orders are those?', 'Log in as Dewan and ask for an order number that is not yours.', "Open /order?id=1002 — Omar's order renders in full, because the page never checks ownership."],
    lesson: 'Every object access needs an ownership/authorisation check — "logged in" is not "allowed".',
    impact: "Any customer can read every other customer's purchases, vehicles and spending — a privacy breach and perfect raw material for targeted phishing.",
    report: { title: "Insecure Direct Object Reference — Any User Can Read Any Order", severity: 'High', remediation: 'Check object ownership (or an explicit grant) on every read; return 404 for objects the user may not see.' },
    guide: "Log in as Dewan and open /order?id=1002. Omar's order — items, prices, vehicle — is displayed because the handler never verifies the order belongs to you." },
  { id: 'quote-idor', feature: 'Quotes', name: "Quote IDOR — View & Accept Others' Quotes", owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Quotes have IDs too, and negotiated prices are supposed to be confidential.', "Sara's open quote is #501. What stops you from opening it — or accepting it?", 'Open /quote?id=501 as Dewan, then POST /quote/accept with quoteId=501 — her $198 alternator quote becomes your order.'],
    lesson: 'Authorisation checks belong on state-changing actions as much as on reads — accepting is more dangerous than viewing.',
    impact: 'Negotiated pricing leaks to competitors and the victim loses the quote they bargained for — commercial damage plus a trust incident.',
    report: { title: "Quote IDOR — View and Accept Another Customer's Negotiated Quote", severity: 'High', remediation: 'Enforce ownership on quote view and accept; accepting must also re-validate the quote state server-side.' },
    guide: "As Dewan, open /quote?id=501 to read Sara's negotiated quote, then accept it — the order is created on your account at her price and her quote is consumed." },
  { id: 'returns-idor', feature: 'Returns', name: "Returns IDOR — File Returns on Others' Orders", owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The return form asks for an order ID. It never asks whose order it is.', "You already know a stranger's order number from the Orders test.", "POST /returns with orderId=1002 (Omar's) and any reason — the refund workflow opens against his order."],
    lesson: 'Write actions need the same ownership checks as reads — a missing check on a POST turns curiosity into fraud.',
    impact: "Fraudulent refunds, victims' orders stuck in return workflows, and warehouse/support chaos — all from one unchecked number.",
    report: { title: "Returns IDOR — File Returns Against Other Customers' Orders", severity: 'Medium', remediation: 'Verify the order belongs to the caller before opening a return; log and alert on cross-account attempts.' },
    guide: "As Dewan, POST /returns with orderId=1002 and a reason. A return (and its refund workflow) is opened against Omar's order because ownership is never checked." },
  { id: 'csrf', feature: 'Profile & Garage', name: 'CSRF on Profile & Vehicle Changes', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Your browser sends your session cookie to this site automatically — even when a form on a different site asks it to.', 'The settings and vehicle forms have no anti-CSRF token, no SameSite cookie, no Origin check.', 'Host a page that auto-submits a POST to /settings (or /vehicles) with a foreign Origin while a victim is logged in — their profile changes silently. For the lab, send the same POST with header Origin: https://evil.example.'],
    lesson: 'Authentication cookies are ambient authority — without tokens or SameSite, any site can spend them.',
    impact: "Attackers silently rewrite your client's customers' profiles and garages — poisoned fitment data, changed addresses, support-desk confusion.",
    report: { title: 'Cross-Site Request Forgery on Profile, Settings and Vehicle Forms', severity: 'Medium', remediation: 'Add per-session anti-CSRF tokens to all state-changing forms, set SameSite=Lax/Strict cookies, and verify Origin/Referer.' },
    guide: 'While logged in as a victim, send POST /settings with a foreign Origin header (e.g. Origin: https://evil.example) and a new name — exactly what an auto-submitting form on an attacker page would do. The change is applied with no token check.' },
  { id: 'role-cookie-tamper', feature: 'Admin & Platform', name: 'Role Tampering via Cookie → Admin', owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    hints: ['After login, look at the cookies the site sets. One of them says what you are.', 'It is plain, unsigned, and the server trusts it more than its own database.', 'Change the role cookie from retail to admin and reload /admin — the full dashboard opens.'],
    lesson: 'Authorisation state must live on the server. Anything the client carries can be edited by the client.',
    impact: 'Total compromise of the back office — pricing sabotage, full customer data, every order — from one cookie edit.',
    report: { title: 'Client-Side Role Cookie Trusted for Admin Authorisation', severity: 'Critical', remediation: 'Store roles server-side in the session record; never derive authorisation from client-supplied cookies.' },
    guide: 'Log in as Dewan, then edit your role cookie to admin (browser dev-tools, or send the header Cookie: sid=<yours>; role=admin) and open /admin. The server trusts the cookie and serves the full admin dashboard.' },
  { id: 'customer-data-exposure', feature: 'Admin & Platform', name: 'Unauthenticated Customer Data Export', owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    hints: ['Not every sensitive page is linked in the nav. APIs and exports are easy to forget — and easier to find.', 'Try the customers export the admin tooling uses: /api/customers.', "It answers with every customer's name, email, address and phone — no login required at all."],
    lesson: 'Endpoints are attack surface even when unlinked; "nobody knows the URL" is not an access control.',
    impact: "Your client's entire customer list — names, emails, home addresses, phones — downloadable by anyone, fuelling phishing and identity fraud.",
    report: { title: 'Unauthenticated API Endpoint Exposes Full Customer PII', severity: 'High', remediation: 'Require authentication and admin authorisation on data exports; return the minimum fields and audit access.' },
    guide: 'Open /api/customers in a private window (no login). The JSON response lists every customer with email, address and phone — an export endpoint with no authentication or authorisation at all.' },
];

function testById(id) { return TESTS.find(t => t.id === id); }
function bump(feature) {
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  saveState();
}
function pass(testId) {
  if (state.tests[testId]) return;
  state.tests[testId] = true;
  if (TESTS.every(t => state.tests[t.id])) {
    if (!state.completedAt) state.completedAt = new Date().toISOString();
    state.keyRevealed = true;
  }
  saveState();
}
function isComplete() { return TESTS.every(t => state.tests[t.id]); }
function progressSummary() {
  const total = TESTS.length;
  const done = TESTS.filter(t => state.tests[t.id]).length;
  const features = {};
  for (const f of FEATURE_ORDER) {
    const ft = TESTS.filter(t => t.feature === f);
    features[f] = { total: ft.length, done: ft.filter(t => state.tests[t.id]).length, attempts: state.attempts[f] || 0 };
  }
  return { lab: LAB_NAME, number: LAB_NUMBER, total, done, pct: total ? Math.floor(done * 100 / total) : 0, features, complete: done === total };
}

/* Detection side-channels (in-memory trackers; only the pass is persisted). */
const failedLogins = new Map();  // email -> failed count
const enumClients = new Map();   // client ip -> { hit, miss }
const vinProbes = new Map();     // client ip -> Map(vin -> timestamp)
const couponUse = new Map();     // userId -> Map(code -> count)
const XSS_RE = /(<script|<svg|<iframe|<img[^>]*\son\w+\s*=|on\w+\s*=|javascript:)/i;
function isForgedRequest(req) {
  const origin = req.headers.origin || req.headers.referer || '';
  if (origin && !/127\.0\.0\.1:3016|localhost:3016/.test(origin)) return true;
  const c = parseCookies(req);
  if (!origin && !c.hx_origin) return true; /* no browser marker, no origin — a forged/raw post */
  return false;
}

/* ------------------------- Lab assistant (chat) ------------------------- */
const ATTRIBUTION_REPLY = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
const FEATURE_KEYS = [
  ['Login & Authentication', ['login', 'log in', 'password', 'reset', 'brute', 'forgot', 'auth', 'enumerat']],
  ['Registration & Profile', ['register', 'registration', 'sign up', 'signup', 'mass assignment', 'account creation']],
  ['Fitment Search', ['fitment search', 'part finder', 'reflected', 'search']],
  ['VIN Lookup', ['vin']],
  ['Product Q&A', ['q&a', 'question', 'stored xss', 'qa ']],
  ['Cart & Checkout', ['checkout', 'cart', 'coupon', 'trade price', 'trade pricing', 'price', 'quantity']],
  ['Orders', ['order']],
  ['Quotes', ['quote']],
  ['Returns', ['return']],
  ['Profile & Garage', ['csrf', 'profile', 'settings', 'vehicle', 'garage']],
  ['Admin & Platform', ['admin', 'role', 'cookie', 'export', 'customers']],
];
function matchFeature(m) {
  if (m.includes('vin')) return 'VIN Lookup';
  for (const [f, keys] of FEATURE_KEYS) if (keys.some(k => m.includes(k))) return f;
  return null;
}
function chatReply(rawMsg) {
  const m = String(rawMsg || '').toLowerCase().slice(0, 500);
  const sum = progressSummary();
  if (/(who (built|made|created|developed)|founder|jony|who is behind|who runs hexacyberlab)/.test(m)) return ATTRIBUTION_REPLY;
  if (m.includes('key') && /(completion|next|unlock|give|show|what|tell|need|get|lab 9|lab nine)/.test(m)) {
    if (sum.complete && state.keyRevealed) return 'You earned it — the completion key that unlocks Lab 9 is: ' + rewardKey() + ' — paste it on the Lab 9 gate to start. Well done!';
    return "I don't have the completion key yet — it isn't given to me until this lab is completed 100%. Finish all " + sum.total + ' tests and the key will be revealed on the completion page (and to me). You are at ' + sum.pct + '% — keep going.';
  }
  if (/^(hi|hello|hey|yo|hello there)\b/.test(m.trim())) {
    return 'Hi! I am the assistant for LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '. This lab has ' + sum.total + ' tests across ' + FEATURE_ORDER.length + ' features, and you are at ' + sum.pct + '% (' + sum.done + '/' + sum.total + '). Ask me what to try next, or open /tests for the mission list with hints.';
  }
  if (/(progress|score|how am i|status|how many.*(done|complete|left))/.test(m)) {
    const open = TESTS.find(t => !state.tests[t.id]);
    return 'You are at ' + sum.pct + '% — ' + sum.done + ' of ' + sum.total + ' tests complete.' + (open ? ' Next open test: "' + open.name + '" (' + open.feature + ', ' + open.difficulty + ').' : ' Everything is done — see /complete for your summary, key and certificate.');
  }
  const feat = matchFeature(m);
  const wantsHow = /(how|help|hint|guide|stuck|solve|bypass|exploit|pass|do the|walkthrough|steps)/.test(m);
  const wantsCounts = /(how many|list|which tests|what tests|what features|which features|show me)/.test(m);
  if (feat && wantsCounts) {
    const ft = TESTS.filter(t => t.feature === feat);
    const fd = ft.filter(t => state.tests[t.id]).length;
    return feat + ' has ' + ft.length + ' test(s), ' + fd + ' completed: ' + ft.map(t => (state.tests[t.id] ? '✓ ' : '○ ') + t.name).join('; ') + '. Attempts so far on this feature: ' + (state.attempts[feat] || 0) + '.';
  }
  if (!feat && wantsCounts && /(feature|test|vulnerab)/.test(m)) {
    return 'This lab has ' + sum.total + ' tests across ' + FEATURE_ORDER.length + ' features: ' + FEATURE_ORDER.map(f => f + ' (' + sum.features[f].done + '/' + sum.features[f].total + ')').join(' · ') + '. The full mission list with hints lives at /tests.';
  }
  if (feat && wantsHow) {
    const open = TESTS.filter(t => t.feature === feat && !state.tests[t.id]);
    if (!open.length) return 'You have already completed every test in ' + feat + ' — nice work. Pick another feature from /tests.';
    const att = state.attempts[feat] || 0;
    if (att >= 3) {
      return 'Here is how the ' + feat + ' tests work:\n' + open.map(t => '• ' + t.name + ': ' + t.guide).join('\n');
    }
    return 'That feature is locked for help. First try the ' + feat + ' tests yourself at least 3 times — I can see you\u2019ve tried ' + att + ' time(s) so far. After 3 real tries, ask me again and I\u2019ll guide you step by step.';
  }
  if (feat) {
    const ft = TESTS.filter(t => t.feature === feat);
    return feat + ': ' + ft.filter(t => state.tests[t.id]).length + '/' + ft.length + ' tests done, ' + (state.attempts[feat] || 0) + ' attempt(s) so far. Ask me "how do I do the ' + feat + ' tests" once you have tried them a few times — or check the graded hints on /tests.';
  }
  return "I'm the " + LAB_NAME + ' lab assistant. Ask me about: the features and test counts ("how many tests in Cart & Checkout?"), your progress, how to approach a feature (step-by-step help unlocks after 3 tries on that feature), or who built these labs. The mission page at /tests lists every test with hints.';
}

/* ============================== HELPERS ============================== */



function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function money(n) { return '$' + Number(n).toFixed(2); }
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function currentUser(req) {
  const c = parseCookies(req);
  if (!c.sid || !sessions.has(c.sid)) return null;
  return users.find(u => u.id === sessions.get(c.sid)) || null;
}
/* VULN #10: effective role is taken from a plain `role` cookie if present. */
function effectiveRole(req, user) {
  const c = parseCookies(req);
  if (c.role) return c.role;
  return user ? user.role : null;
}
function isAdmin(req, user) { return effectiveRole(req, user) === 'admin'; }

function fitsVehicle(part, v) {
  if (!v) return false;
  return part.fits.some(f => f.make === v.make && f.model === v.model && v.year >= f.from && v.year <= f.to);
}
function partById(id) { return parts.find(p => p.id === Number(id)); }
function userById(id) { return users.find(u => u.id === Number(id)); }

const CSS = `
:root{--ink:#1d2733;--steel:#2e4053;--accent:#e67e22;--bg:#eef1f4;--panel:#fff;--line:#c9d2da;--bad:#b03a2e;--ok:#1e8449}
*{box-sizing:border-box}body{margin:0;font-family:Verdana,Geneva,sans-serif;background:var(--bg);color:var(--ink)}
header{background:linear-gradient(90deg,#1d2733,#2e4053);color:#f5f6fa;padding:14px 22px;border-bottom:4px solid var(--accent)}
header .brand{font-size:24px;font-weight:bold;letter-spacing:1px}header .brand span{color:var(--accent)}
nav{margin-top:8px}nav a{color:#d6e5f3;text-decoration:none;margin-right:16px;font-size:13px}nav a:hover{color:#fff;text-decoration:underline}
main{max-width:1080px;margin:22px auto;padding:0 16px}
.card{background:var(--panel);border:1px solid var(--line);border-top:3px solid var(--steel);padding:18px;margin-bottom:18px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
h1{font-size:22px;margin:4px 0 12px}h2{font-size:17px;color:var(--steel)}h3{margin:6px 0}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{border:1px solid var(--line);padding:7px 9px;text-align:left}th{background:#e8edf1}
input,select,textarea{padding:8px;border:1px solid #9fb0bf;font:inherit;font-size:14px;width:100%;margin:4px 0 10px}
button,.btn{background:var(--accent);color:#fff;border:0;padding:9px 16px;font:inherit;font-size:14px;cursor:pointer;text-decoration:none;display:inline-block}
button:hover,.btn:hover{background:#ca6f1e}.btn.grey{background:var(--steel)}button:disabled{background:#aab7c4;cursor:not-allowed}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
.price{font-size:18px;font-weight:bold;color:var(--steel)}.trade{color:var(--ok);font-size:13px}
.warn{background:#fdedec;border:1px solid var(--bad);color:var(--bad);padding:10px;margin:10px 0}
.ok{background:#eafaf1;border:1px solid var(--ok);color:var(--ok);padding:10px;margin:10px 0}
.tag{display:inline-block;background:var(--steel);color:#fff;font-size:11px;padding:2px 8px;border-radius:8px;margin-right:5px}
.small{font-size:12px;color:#5d6d7e}.fit-ok{color:var(--ok);font-weight:bold}.fit-no{color:var(--bad);font-weight:bold}
footer{text-align:center;color:#5d6d7e;font-size:12px;padding:24px}
`;

const CHAT_WIDGET = `
<button onclick="hxToggle()" style="position:fixed;right:18px;bottom:18px;z-index:60;border-radius:24px;padding:12px 18px;box-shadow:0 2px 8px rgba(0,0,0,.3)">💬 Lab Assistant</button>
<div id="hxchat" style="display:none;position:fixed;right:18px;bottom:74px;z-index:60;width:350px;max-width:94vw;background:#fff;border:1px solid #2e4053;box-shadow:0 4px 18px rgba(0,0,0,.25)">
<div style="background:#2e4053;color:#fff;padding:10px 12px"><b>HexaAutoParts Lab Assistant</b><div style="font-size:11px;color:#aed6f1">I know this lab's tests. Step-by-step help unlocks after 3 tries on a feature.</div></div>
<div id="hxlog" style="height:250px;overflow-y:auto;padding:10px 12px;font-size:13px;white-space:pre-wrap"></div>
<div style="display:flex;border-top:1px solid #c9d2da"><input id="hxmsg" placeholder="Ask me anything…" style="flex:1;border:0;margin:0"><button onclick="hxSend()">Send</button></div>
</div>
<script>
var hxOpen=false;
function hxToggle(){var p=document.getElementById('hxchat');hxOpen=!hxOpen;p.style.display=hxOpen?'block':'none';if(hxOpen){var i=document.getElementById('hxmsg');if(i)i.focus();}}
function hxAdd(who,text){var log=document.getElementById('hxlog');var d=document.createElement('div');d.style.margin='6px 0';var b=document.createElement('b');b.textContent=who+': ';d.appendChild(b);d.appendChild(document.createTextNode(text));log.appendChild(d);log.scrollTop=log.scrollHeight;}
function hxSend(){var inp=document.getElementById('hxmsg');var v=inp.value.trim();if(!v)return;inp.value='';hxAdd('You',v);fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:v})}).then(function(r){return r.json();}).then(function(j){hxAdd('Assistant',j.reply||'…');}).catch(function(){hxAdd('Assistant','(connection error)');});}
document.addEventListener('keydown',function(e){if(e.key==='Enter'&&document.activeElement&&document.activeElement.id==='hxmsg'){hxSend();}});
</script>`;

function layout(req, title, body) {
  const user = currentUser(req);
  const role = effectiveRole(req, user);
  const cart = carts.get(parseCookies(req).sid) || [];
  const sum = progressSummary();
  const who = user ? `${esc(user.name)} (${esc(role)}) · <a href="/logout">Logout</a>` : '<a href="/login">Login</a> · <a href="/register">Register</a>';
  const strip = `<div style="background:#16222e;color:#d6e5f3;padding:8px 22px;font-size:13px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
<img src="/logo.png" alt="HexaCyberLab" style="height:30px;background:#fff;border-radius:4px;padding:2px">
<span><b>LAB ${LAB_NUMBER} — ${esc(LAB_NAME)}</b> · ${sum.done}/${sum.total} tests · ${sum.pct}%</span>
<span style="flex:1;min-width:120px;background:#34495e;height:10px;border-radius:5px;overflow:hidden"><span style="display:block;height:100%;width:${sum.pct}%;background:#e67e22"></span></span>
<a href="/tests" style="color:#f5b041">🎯 Mission / Tests</a><a href="/complete" style="color:#f5b041">🏁 Completion</a></div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} — HexaAutoParts</title><style>${CSS}</style></head>
<body>${strip}<header><div class="brand">HEXA<span>AUTOPARTS</span> 🔧</div>
<nav><a href="/">Home</a><a href="/parts">Parts Catalogue</a><a href="/fitment">Fitment Search</a><a href="/vin">VIN Lookup</a>
${user ? `<a href="/vehicles">My Vehicles</a><a href="/quotes">Quotes</a><a href="/orders">Orders</a><a href="/returns">Returns</a><a href="/cart">Cart (${cart.length})</a><a href="/profile">Profile</a>` : ''}
${role === 'admin' ? '<a href="/admin">Admin</a>' : ''}</nav>
<div class="small" style="margin-top:6px;color:#aed6f1">${who}</div></header>
<main>${body}</main><footer>HexaAutoParts — intentionally vulnerable practice lab. Local use only. All data is synthetic.</footer>${CHAT_WIDGET}</body></html>`;
}
function send(res, code, html, headers = {}) {
  res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', ...headers });
  res.end(html);
}
function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}
function readJsonBody(req) {
  return new Promise(resolve => {
    let b = '';
    req.on('data', c => { b += c; if (b.length > 1e5) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch (e) { resolve({}); } });
  });
}
function redirect(res, to, headers = {}) { res.writeHead(302, { Location: to, ...headers }); res.end(); }
function readBody(req) {
  return new Promise(resolve => {
    let b = '';
    req.on('data', c => { b += c; if (b.length > 1e6) req.destroy(); });
    req.on('end', () => resolve(new URLSearchParams(b)));
  });
}

/* ============================== ROUTES ============================== */

const LOGO_BUF = (() => { try { return fs.readFileSync(path.join(LAB_DIR, 'logo.png')); } catch (e) { return null; } })();

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const q = url.searchParams;
  const user = currentUser(req);
  const role = effectiveRole(req, user);
  const sid = parseCookies(req).sid;
  if (sid && !carts.has(sid)) carts.set(sid, []);

  /* ---------- HOME ---------- */
  if (path === '/' && req.method === 'GET') {
    const cats = [...new Set(parts.map(p => p.category))];
    const featured = parts.slice(0, 6).map(p => partCard(p, user)).join('');
    return send(res, 200, layout(req, 'Home', `
      <div class="card"><h1>Auto parts, fitted right.</h1>
      <p>Brakes, filters, batteries, suspension and more — with vehicle fitment checking, trade pricing for garages, and a free VIN lookup.</p>
      <form method="GET" action="/fitment"><label>Find parts for your vehicle</label>
      <select name="make"><option>Toyota</option><option>Honda</option><option>Ford</option><option>BMW</option><option>Volkswagen</option></select>
      <input name="model" placeholder="Model (e.g. Corolla)">
      <input name="year" placeholder="Year (e.g. 2016)" type="number">
      <button>Search fitment</button></form>
      <p class="small">Categories: ${cats.map(esc).join(' · ')}</p></div>
      <div class="card"><h2>Featured parts</h2><div class="grid">${featured}</div></div>`));
  }

  /* ---------- AUTH ---------- */
  if (path === '/register' && req.method === 'GET') {
    return send(res, 200, layout(req, 'Register', `<div class="card"><h1>Create a retail account</h1>
      <form method="POST" action="/register">
      <label>Name</label><input name="name" required>
      <label>Email</label><input name="email" type="email" required>
      <label>Password</label><input name="password" type="password" required>
      <label>Address</label><input name="address">
      <button>Register</button></form>
      <p class="small">Trade (garage) accounts are vetted manually — contact sales to upgrade.</p></div>`));
  }
  if (path === '/register' && req.method === 'POST') {
    bump('Registration & Profile');
    const f = await readBody(req);
    const email = (f.get('email') || '').toLowerCase();
    if (users.some(u => u.email === email)) return send(res, 400, layout(req, 'Register', '<div class="card warn">Email already registered.</div>'));
    /* NEW VULN: mass assignment — a role supplied in the request is copied onto the
       new account, so anyone can register as trade or even admin. */
    const postedRole = (f.get('role') || '').toLowerCase();
    const role = ['retail', 'trade', 'admin'].includes(postedRole) ? postedRole : 'retail';
    const nu = { id: nextUserId++, email, pass: f.get('password') || '', name: f.get('name') || 'Customer', role, address: f.get('address') || '', phone: '' };
    users.push(nu);
    if (role !== 'retail') pass('mass-assignment');
    /* NEW VULN (absence): no password policy — any length, even one character, is accepted. */
    if ((f.get('password') || '').length <= 3) pass('weak-password-policy');
    return redirect(res, '/login');
  }
  if (path === '/login' && req.method === 'GET') {
    return send(res, 200, layout(req, 'Login', `<div class="card"><h1>Login</h1>
      <form method="POST" action="/login">
      <label>Email</label><input name="email" type="email" required>
      <label>Password</label><input name="password" type="password" required>
      <button>Login</button></form>
      <p class="small"><a href="/forgot">Forgot password?</a></p>
      <p class="small">Demo accounts — admin@hexaautoparts.local / Admin@123 · garage@hexaautoparts.local / Trade@123 · dewan@hexaautoparts.local / User@123</p></div>`));
  }
  if (path === '/login' && req.method === 'POST') {
    bump('Login & Authentication');
    const f = await readBody(req);
    const rawEmail = f.get('email') || '';
    const rawPass = f.get('password') || '';
    const email = rawEmail.toLowerCase();
    const startSession = (u) => {
      const newsid = crypto.randomBytes(16).toString('hex');
      sessions.set(newsid, u.id);
      carts.set(newsid, []);
      /* The plain `role` cookie is trusted by effectiveRole() — see VULN #10. */
      return redirect(res, '/', { 'Set-Cookie': [`sid=${newsid}; Path=/; HttpOnly`, `role=${u.role}; Path=/`] });
    };
    /* NEW VULN: the legacy login path builds its query by string concatenation and
       "evaluates" it naively (same simulated data layer as the part finder). An
       injected boolean condition makes the WHERE clause true without a password. */
    const injRe = /'\s*(or|and)\s+('?\d+'?\s*=\s*'?\d+'?|'[^']*'\s*=\s*'[^']*')/i;
    let injectedUser = null;
    if (injRe.test(rawEmail) || /'\s*--/.test(rawEmail) || /'\s*or\s*1\s*=\s*1/i.test(rawEmail)) {
      injectedUser = users.find(x => email.startsWith(x.email)) || users[0];
    } else if (injRe.test(rawPass)) {
      injectedUser = users.find(x => x.email === email) || null;
    }
    if (injectedUser) { pass('sqli-login-bypass'); return startSession(injectedUser); }
    const u = users.find(x => x.email === email && x.pass === rawPass);
    if (!u) {
      /* NEW VULN (absence): no throttling/lockout — count unthrottled failures per account. */
      if (users.some(x => x.email === email)) {
        const n = (failedLogins.get(email) || 0) + 1;
        failedLogins.set(email, n);
        if (n >= 10) pass('brute-force');
      }
      return send(res, 401, layout(req, 'Login', '<div class="card warn">Invalid email or password.</div>'));
    }
    return startSession(u);
  }
  if (path === '/logout') {
    if (sid) { sessions.delete(sid); carts.delete(sid); }
    return redirect(res, '/', { 'Set-Cookie': ['sid=; Path=/; Max-Age=0', 'role=; Path=/; Max-Age=0'] });
  }

  /* ---------- PASSWORD RESET (VULN #12: predictable token) ---------- */
  if (path === '/forgot' && req.method === 'GET') {
    return send(res, 200, layout(req, 'Forgot password', `<div class="card"><h1>Reset password</h1>
      <form method="POST" action="/forgot"><label>Email</label><input name="email" type="email" required>
      <button>Send reset link</button></form></div>`));
  }
  if (path === '/forgot' && req.method === 'POST') {
    bump('Login & Authentication');
    const f = await readBody(req);
    const email = (f.get('email') || '').toLowerCase();
    const u = users.find(x => x.email === email);
    /* NEW VULN: the response differs for real vs unknown accounts — an enumeration
       oracle. (The differing answers themselves are the observable proof: a client
       that has seen both a "hit" and a "miss" has enumerated.) */
    const clientKey = req.socket.remoteAddress || 'local';
    const rec = enumClients.get(clientKey) || { hit: false, miss: false };
    let msg;
    if (u) {
      /* VULN #12: token is a deterministic function of the email — anyone can compute it. */
      const token = Buffer.from(email, 'utf8').toString('hex').slice(0, 10);
      resetTokens.set(email, token);
      rec.hit = true;
      msg = `Reset link sent to <b>${esc(email)}</b>. (Lab hint — simulated inbox: <a href="/reset?email=${encodeURIComponent(email)}&token=${token}">/reset?email=${email}&token=${token}</a>)`;
    } else {
      rec.miss = true;
      msg = `No account with the email <b>${esc(email)}</b> exists in our system. Check the address and try again.`;
    }
    enumClients.set(clientKey, rec);
    if (rec.hit && rec.miss) pass('user-enumeration');
    return send(res, 200, layout(req, 'Forgot password', `<div class="card"><p>${msg}</p></div>`));
  }
  if (path === '/reset' && req.method === 'GET') {
    const email = q.get('email') || '', token = q.get('token') || '';
    return send(res, 200, layout(req, 'Reset password', `<div class="card"><h1>Set a new password</h1>
      <form method="POST" action="/reset">
      <input type="hidden" name="email" value="${esc(email)}"><input type="hidden" name="token" value="${esc(token)}">
      <label>New password</label><input name="password" type="password" required>
      <button>Reset password</button></form></div>`));
  }
  if (path === '/reset' && req.method === 'POST') {
    bump('Login & Authentication');
    const f = await readBody(req);
    const email = (f.get('email') || '').toLowerCase();
    const u = users.find(x => x.email === email);
    if (u && resetTokens.get(email) && resetTokens.get(email) === f.get('token')) {
      u.pass = f.get('password') || '';
      resetTokens.delete(email);
      /* The token that just worked is a public function of the email — a successful
         unauthenticated reset is the observable effect of the predictable token. */
      if (!user || user.id !== u.id) pass('predictable-reset-token');
      return redirect(res, '/login');
    }
    return send(res, 400, layout(req, 'Reset password', '<div class="card warn">Invalid or expired reset token.</div>'));
  }

  /* ---------- CATALOGUE ---------- */
  if (path === '/parts' && req.method === 'GET') {
    const cat = q.get('category');
    const list = cat ? parts.filter(p => p.category === cat) : parts;
    return send(res, 200, layout(req, 'Parts Catalogue', `<div class="card"><h1>Parts catalogue</h1>
      <p class="small">Filter: ${['Brakes','Filters','Batteries','Suspension','Engine','Transmission','Electrical'].map(c => `<a href="/parts?category=${c}">${c}</a>`).join(' · ')} · <a href="/parts">All</a></p>
      <div class="grid">${list.map(p => partCard(p, user)).join('')}</div></div>`));
  }
  if (path === '/part' && req.method === 'GET') {
    const p = partById(q.get('id'));
    if (!p) return send(res, 404, layout(req, 'Not found', '<div class="card warn">Part not found.</div>'));
    const myVehicles = user ? userVehicles.filter(v => v.userId === user.id) : [];
    const fitRows = myVehicles.map(v => `<tr><td>${esc(v.make)} ${esc(v.model)} ${v.year}</td><td>${fitsVehicle(p, v) ? '<span class="fit-ok">✓ Fits</span>' : '<span class="fit-no">✗ Does not fit</span>'}</td></tr>`).join('');
    const partQa = qa.filter(x => x.partId === p.id);
    /* VULN #8: Q&A text is rendered WITHOUT escaping (stored XSS). */
    const qaHtml = partQa.map(x => `<div class="card" style="box-shadow:none"><b>${esc(x.author)}:</b> ${x.text}${x.answer ? `<p class="small"><b>Store answer:</b> ${x.answer}</p>` : ''}</div>`).join('');
    return send(res, 200, layout(req, p.name, `<div class="card">
      <h1>${esc(p.name)}</h1><span class="tag">${esc(p.category)}</span><span class="tag">${esc(p.sku)}</span>
      <p>${esc(p.desc)}</p>
      <p class="price">${money(p.retail)} <span class="small">retail</span></p>
      <p class="trade">Trade price: ${money(p.trade)}</p>
      <p class="small">Stock: ${p.stock} · Fits: ${p.fits.map(f => `${esc(f.make)} ${esc(f.model)} ${f.from}–${f.to}`).join('; ')}</p>
      ${myVehicles.length ? `<h3>Fitment against your vehicles</h3><table>${fitRows}</table>` : '<p class="small">Log in and save a vehicle to see fitment for your garage.</p>'}
      <form method="POST" action="/cart/add"><input type="hidden" name="partId" value="${p.id}">
      <label>Quantity</label><input name="qty" type="number" value="1" min="1" style="width:110px">
      <button>Add to cart</button></form>
      <form method="POST" action="/quotes/request"><input type="hidden" name="partId" value="${p.id}">
      <label>Quantity for quote</label><input name="qty" type="number" value="1" min="1" style="width:110px">
      <button class="btn grey">Request a quote</button></form></div>
      <div class="card"><h2>Questions &amp; answers</h2>${qaHtml || '<p class="small">No questions yet.</p>'}
      ${user ? `<form method="POST" action="/part/qa"><input type="hidden" name="partId" value="${p.id}">
      <label>Ask a question about this part</label><textarea name="text" rows="2" required></textarea>
      <button>Post question</button></form>` : '<p class="small">Log in to ask a question.</p>'}</div>`));
  }
  if (path === '/part/qa' && req.method === 'POST') {
    if (!user) return redirect(res, '/login');
    bump('Product Q&A');
    const f = await readBody(req);
    /* VULN #8: stored raw, rendered raw on the product page. */
    const text = f.get('text') || '';
    qa.push({ id: nextQaId++, partId: Number(f.get('partId')), userId: user.id, author: user.name, text, answer: '' });
    if (XSS_RE.test(text)) pass('stored-xss-qa');
    return redirect(res, `/part?id=${f.get('partId')}`);
  }

  /* ---------- FITMENT SEARCH (VULN #9: naive string-built "query") ---------- */
  if (path === '/fitment' && req.method === 'GET') {
    if (q.get('make') || q.get('model') || q.get('year') || q.get('q')) bump('Fitment Search');
    const make = q.get('make') || '', model = q.get('model') || '', year = Number(q.get('year')) || 0;
    const term = q.get('q') || '';
    let results = parts;
    if (make || model || year) {
      const veh = { make, model, year };
      results = results.filter(p => p.fits.some(ft =>
        (!make || ft.make === make) && (!model || ft.model === model) && (!year || (year >= ft.from && year <= ft.to))));
    }
    if (term) {
      /* Simulated legacy data layer: builds a SQL-ish string and "evaluates" it naively.
         VULN #9: an input like  ' OR '1'='1  makes the condition always true -> returns everything,
         and  ' OR category='Brakes  leaks a chosen category. */
      const fakeSql = `SELECT * FROM parts WHERE name LIKE '%${term}%'`;
      const t = term.toLowerCase();
      if (/'\s*or\s*'1'\s*=\s*'1/.test(t) || t.includes("' or 1=1")) {
        results = parts; // injected condition evaluates true for every row
        pass('sqli-fitment-search');
      } else {
        const catMatch = term.match(/'\s*or\s*category\s*=\s*'([^']+)/i);
        if (catMatch) { results = parts.filter(p => p.category.toLowerCase() === catMatch[1].toLowerCase()); pass('sqli-fitment-search'); }
        else results = results.filter(p => (p.name + ' ' + p.category + ' ' + p.sku).toLowerCase().includes(t));
      }
      /* NEW VULN: the results heading below echoes the term raw (reflected XSS),
         and the echo itself is the observable proof. */
      if (XSS_RE.test(term)) pass('reflected-xss');
      var sqlNote = `<p class="small">Legacy query executed: <code>${esc(fakeSql)}</code></p>`;
    }
    return send(res, 200, layout(req, 'Fitment Search', `<div class="card"><h1>Fitment search</h1>
      <form method="GET" action="/fitment">
      <label>Make</label><select name="make"><option value="">Any</option>${['Toyota','Honda','Ford','BMW','Volkswagen'].map(m => `<option ${m === make ? 'selected' : ''}>${m}</option>`).join('')}</select>
      <label>Model</label><input name="model" value="${esc(model)}">
      <label>Year</label><input name="year" type="number" value="${year || ''}">
      <label>Part finder (legacy search)</label><input name="q" value="${esc(term)}" placeholder="e.g. brake">
      <button>Search</button></form>${typeof sqlNote !== 'undefined' ? sqlNote : ''}
      ${term ? `<p class="small">Results for: ${term}</p>` : ''}
      <p class="small">${results.length} compatible part(s)</p>
      <div class="grid">${results.map(p => partCard(p, user)).join('') || '<p>No parts match.</p>'}</div></div>`));
  }

  /* ---------- VIN LOOKUP (VULN #2 excess data, #3 enumeration) ---------- */
  if (path === '/vin' && req.method === 'GET') {
    const vin = (q.get('vin') || '').toUpperCase();
    let out = '';
    if (vin) {
      bump('VIN Lookup');
      const rec = vinRecords.find(r => r.vin === vin);
      if (rec) {
        /* Observable proof of #2: a full PII record is served to someone who is not
           the registered keeper (including anonymous visitors). */
        if (!user || user.id !== rec.ownerId) pass('vin-pii-exposure');
        /* Observable proof of #3: one client resolving many distinct sequential VINs. */
        const ck = req.socket.remoteAddress || 'local';
        const probes = vinProbes.get(ck) || new Map();
        const now = Date.now();
        for (const [v, ts] of probes) if (now - ts > 10 * 60 * 1000) probes.delete(v);
        probes.set(rec.vin, now);
        vinProbes.set(ck, probes);
        if (probes.size >= 5) pass('vin-enumeration');
      }
      /* VULN #2/#3: no login required; ANY vin returns the owner's full PII + service history,
         and VINs are sequential (HAP20261001, ...1002, ...) so the whole registry can be enumerated. */
      out = rec ? `<div class="card"><h2>VIN ${esc(rec.vin)}</h2>
        <table>
        <tr><th>Vehicle</th><td>${esc(rec.make)} ${esc(rec.model)} (${rec.year})</td></tr>
        <tr><th>Registered owner</th><td>${esc(rec.owner)}</td></tr>
        <tr><th>Owner address</th><td>${esc(rec.address)}</td></tr>
        <tr><th>Owner phone</th><td>${esc(rec.phone)}</td></tr>
        <tr><th>Service history</th><td>${rec.history.map(esc).join('<br>')}</td></tr>
        </table>
        <p><a class="btn" href="/fitment?make=${encodeURIComponent(rec.make)}&model=${encodeURIComponent(rec.model)}&year=${rec.year}">Find parts for this vehicle</a></p></div>`
      : '<div class="card warn">No record for that VIN.</div>';
    }
    return send(res, 200, layout(req, 'VIN Lookup', `<div class="card"><h1>VIN lookup</h1>
      <p>Enter a VIN to see vehicle details and service information.</p>
      <form method="GET" action="/vin"><label>VIN</label><input name="vin" value="${esc(vin)}" placeholder="e.g. HAP20261001">
      <button>Look up</button></form></div>${out}`));
  }

  /* ==================== LAB SYSTEM ROUTES ==================== */
  if (path === '/logo.png' && req.method === 'GET') {
    if (!LOGO_BUF) return send(res, 404, 'logo missing');
    res.writeHead(200, { 'Content-Type': 'image/png' });
    return res.end(LOGO_BUF);
  }

  /* NEW VULN: unauthenticated customer data export used by "admin tooling". */
  if (path === '/api/customers' && req.method === 'GET') {
    bump('Admin & Platform');
    if (!user || user.role !== 'admin') pass('customer-data-exposure');
    return sendJson(res, 200, { customers: users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, address: u.address, phone: u.phone })) });
  }

  if (path === '/api/progress' && req.method === 'GET') {
    return sendJson(res, 200, progressSummary());
  }

  if (path === '/api/chat' && req.method === 'POST') {
    const b = await readJsonBody(req);
    return sendJson(res, 200, { reply: chatReply(b && b.message) });
  }

  if (path === '/tests' && req.method === 'GET') {
    const sum = progressSummary();
    const sections = FEATURE_ORDER.map(fname => {
      const ft = TESTS.filter(t => t.feature === fname);
      const att = state.attempts[fname] || 0;
      const rows = ft.map(t => {
        const done = !!state.tests[t.id];
        const hintHtml = t.hints.map((h, i) => `<div class="hh" style="display:none;background:#fef9e7;border:1px solid #f5cba7;padding:7px 9px;margin:5px 0"><b>Hint ${i + 1}:</b> ${esc(h)}</div>`).join('');
        return `<div style="border:1px solid var(--line);padding:10px 12px;margin:8px 0">
          <div style="font-size:16px">${done ? '✅' : '○'} <b>${esc(t.name)}</b></div>
          <div style="margin:5px 0"><span class="tag">${esc(t.owasp)}</span><span class="tag">${esc(t.difficulty)}</span><span class="tag">${done ? 'COMPLETED' : 'OPEN'}</span></div>
          <div>${hintHtml}<button class="btn grey" onclick="hxHint(this)">💡 Show hint</button></div></div>`;
      }).join('');
      return `<div class="card"><h2>${esc(fname)}</h2><p class="small">${ft.filter(t => state.tests[t.id]).length}/${ft.length} tests complete · ${att} attempt(s) on this feature · Assistant step-by-step help ${att >= 3 ? '<b class="fit-ok">UNLOCKED</b>' : 'unlocks after 3 tries'}</p>${rows}</div>`;
    }).join('');
    return send(res, 200, layout(req, 'Mission — Tests', `<div class="card"><h1>🎯 Mission — LAB ${LAB_NUMBER} ${esc(LAB_NAME)}</h1>
      <p>Complete every test by actually exploiting the flaw — progress is detected by the lab itself, never by self-report. Progress: <b>${sum.done}/${sum.total} (${sum.pct}%)</b>. Your progress is saved automatically and resumes where you left off, even after a restart.</p>
      <p class="small">Stuck? Each test has 3 graded hints. The Lab Assistant (bottom-right) gives full step-by-step guidance for a feature once you have genuinely tried that feature at least 3 times.</p></div>
      ${sections}
      <script>function hxHint(btn){var box=btn.parentNode;var hs=box.querySelectorAll('.hh');for(var i=0;i<hs.length;i++){if(hs[i].style.display==='none'){hs[i].style.display='block';if(i===hs.length-1)btn.style.display='none';return;}}}</script>`));
  }

  if (path === '/complete' && req.method === 'GET') {
    const sum = progressSummary();
    if (!sum.complete) {
      const left = FEATURE_ORDER.map(fname => {
        const open = TESTS.filter(t => t.feature === fname && !state.tests[t.id]);
        return open.length ? `<tr><td>${esc(fname)}</td><td>${open.map(t => esc(t.name)).join('<br>')}</td></tr>` : '';
      }).join('');
      return send(res, 200, layout(req, 'Completion', `<div class="card"><h1>🏁 Not quite there — ${sum.pct}%</h1>
        <p>You have completed <b>${sum.done} of ${sum.total}</b> tests. The completion summary, your certificate and the key for the next lab unlock at 100%.</p>
        <h2>Still open</h2><table><tr><th>Feature</th><th>Remaining tests</th></tr>${left}</table>
        <p><a class="btn" href="/tests">Back to the mission list</a></p></div>`));
    }
    const featRows = FEATURE_ORDER.map(fname => {
      const ft = TESTS.filter(t => t.feature === fname);
      return `<tr><td>${esc(fname)}</td><td>${ft.length}</td><td>${ft.map(t => esc(t.name)).join('<br>')}</td></tr>`;
    }).join('');
    const lessons = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('');
    const impacts = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('');
    const reports = TESTS.map(t => `<li><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)}<br><span class="small">Remediation: ${esc(t.report.remediation)}</span></li>`).join('');
    return send(res, 200, layout(req, 'Lab Complete', `<div class="card" style="border-top:4px solid var(--ok)"><h1>🏆 LAB ${LAB_NUMBER} — ${esc(LAB_NAME)}: 100% COMPLETE</h1>
      <p>You completed all <b>${sum.total} security tests</b> in this lab. Here is your full debrief.</p></div>
      <div class="card"><h2>1 · What this lab contained</h2>
      <p>This lab had <b>${FEATURE_ORDER.length} features</b> and <b>${sum.total} vulnerabilities</b> in total:</p>
      <table><tr><th>Feature</th><th>Vulnerabilities</th><th>Tests</th></tr>${featRows}</table></div>
      <div class="card"><h2>2 · How the testing was done</h2>
      <p>Every flaw was proven by exploiting it for real — <b>${sum.total} techniques</b> in total, one per test, listed in the table above by feature (injection, broken access control, business-logic tampering, cross-site scripting, request forgery, enumeration and more).</p></div>
      <div class="card"><h2>3 · What you learned</h2><ul>${lessons}</ul></div>
      <div class="card"><h2>4 · What this means for a real client</h2><ul>${impacts}</ul></div>
      <div class="card"><h2>5 · Writing it in a real report</h2><ul>${reports}</ul></div>
      <div class="card"><h2>6 · Your key for the next lab</h2>
      <p>Lab ${LAB_NUMBER + 1} is locked. Paste this key on its gate to start:</p>
      <p style="font-size:20px;background:#16222e;color:#f5b041;padding:14px;text-align:center;letter-spacing:1px"><b>${esc(rewardKey())}</b></p>
      <p class="small">This key existed nowhere in readable form before this moment — it was split into encoded pieces scattered across the application and is assembled only now, at 100%.</p></div>
      <div class="card"><h2>Your certificate</h2>
      <form method="POST" action="/complete/name"><label>Name to print on the certificate</label>
      <input name="name" value="${esc(state.testerName || '')}" placeholder="e.g. Your Name" required>
      <button>Save name &amp; view certificate</button></form>
      <p><a class="btn grey" href="/certificate">View certificate</a></p></div>`));
  }
  if (path === '/complete/name' && req.method === 'POST') {
    const f = await readBody(req);
    state.testerName = (f.get('name') || '').slice(0, 80);
    saveState();
    return redirect(res, '/certificate');
  }

  if (path === '/certificate' && req.method === 'GET') {
    if (!isComplete()) return redirect(res, '/complete');
    const sum = progressSummary();
    const name = state.testerName || (user ? user.name : '') || 'Security Tester';
    const dateStr = state.completedAt ? new Date(state.completedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    return send(res, 200, layout(req, 'Certificate', `<div class="card" style="max-width:720px;margin:26px auto;text-align:center;border:3px double var(--steel);padding:34px 26px">
      <img src="/logo.png" alt="HexaCyberLab" style="height:74px">
      <h1 style="font-size:27px;margin:12px 0 2px">Certificate of Completion</h1>
      <p class="small" style="letter-spacing:2px">HEXACYBERLAB SECURITY LABS</p>
      <p style="margin-top:20px">This certifies that</p>
      <p style="font-size:25px;font-weight:bold;color:var(--steel);margin:6px 0">${esc(name)}</p>
      <p>has completed <b>100%</b> of the security tests in</p>
      <p style="font-size:20px;font-weight:bold">LAB ${LAB_NUMBER} — ${esc(LAB_NAME)}</p>
      <p class="small">${sum.total} tests across ${FEATURE_ORDER.length} features · Completed on ${esc(dateStr)}</p>
      <p style="margin-top:22px" class="small">HexaCyberLab — Built by Md. Jony Hassain, Founder</p>
      <button onclick="window.print()">🖨 Print certificate</button></div>`));
  }

} /* end handle() — public routes */

const _cfgD = ['LUNGVw==', 'U0tKNw=='];

function partCard(p, user) {
  return `<div class="card" style="margin:0"><h3><a href="/part?id=${p.id}">${esc(p.name)}</a></h3>
  <span class="tag">${esc(p.category)}</span><span class="tag">${esc(p.sku)}</span>
  <p class="price">${money(p.retail)}</p><p class="trade">Trade: ${money(p.trade)}</p>
  <p class="small">Fits: ${p.fits.map(f => `${esc(f.make)} ${esc(f.model)} ${f.from}–${f.to}`).join('; ')}</p>
  <a class="btn grey" href="/part?id=${p.id}">Details</a></div>`;
}



async function handleAuthed(req, res, next) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const q = url.searchParams;
  const user = currentUser(req);
  const role = effectiveRole(req, user);
  const sid = parseCookies(req).sid;
  if (!user) return redirect(res, '/login');
  if (sid && !carts.has(sid)) carts.set(sid, []);
  const cart = carts.get(sid) || [];

  /* ---------- MY VEHICLES (garage) — VULN #11: no CSRF token on POST ---------- */
  if (path === '/vehicles' && req.method === 'GET') {
    const mine = userVehicles.filter(v => v.userId === user.id);
    const rows = mine.map(v => `<tr><td>${esc(v.nickname)}</td><td>${esc(v.make)} ${esc(v.model)}</td><td>${v.year}</td><td>${esc(v.vin)}</td></tr>`).join('');
    return send(res, 200, layout(req, 'My Vehicles', `<div class="card"><h1>My vehicles</h1>
      <table><tr><th>Nickname</th><th>Vehicle</th><th>Year</th><th>VIN</th></tr>${rows || '<tr><td colspan="4">No saved vehicles.</td></tr>'}</table>
      <h2>Add a vehicle</h2>
      <form method="POST" action="/vehicles">
      <label>Nickname</label><input name="nickname">
      <label>Make</label><input name="make" required>
      <label>Model</label><input name="model" required>
      <label>Year</label><input name="year" type="number" required>
      <label>VIN</label><input name="vin">
      <button>Save vehicle</button></form>
      <p class="small">Workshop tip: your vehicles drive the fitment check at checkout.</p></div>`));
  }
  if (path === '/vehicles' && req.method === 'POST') {
    bump('Profile & Garage');
    const f = await readBody(req);
    /* VULN #11: state-changing POST with no CSRF token — any site can submit this form with the victim's cookies. */
    userVehicles.push({ id: nextVehicleId++, userId: user.id, make: f.get('make') || '', model: f.get('model') || '', year: Number(f.get('year')) || 0, vin: (f.get('vin') || '').toUpperCase(), nickname: f.get('nickname') || 'Vehicle' });
    if (isForgedRequest(req)) pass('csrf');
    return redirect(res, '/vehicles');
  }

  /* ---------- CART ---------- */
  if (path === '/cart/add' && req.method === 'POST') {
    bump('Cart & Checkout');
    const f = await readBody(req);
    const p = partById(f.get('partId'));
    if (p) {
      const qty = Math.max(1, Number(f.get('qty')) || 1);
      const line = cart.find(l => l.partId === p.id);
      if (line) line.qty += qty; else cart.push({ partId: p.id, qty });
    }
    return redirect(res, '/cart');
  }
  if (path === '/cart/remove' && req.method === 'POST') {
    const f = await readBody(req);
    const i = cart.findIndex(l => l.partId === Number(f.get('partId')));
    if (i >= 0) cart.splice(i, 1);
    return redirect(res, '/cart');
  }
  if (path === '/cart' && req.method === 'GET') {
    const rows = cart.map(l => { const p = partById(l.partId); return p ? `<tr><td>${esc(p.name)}</td><td>${l.qty}</td><td>${money(p.retail)}</td><td>${money(p.retail * l.qty)}</td><td><form method="POST" action="/cart/remove"><input type="hidden" name="partId" value="${p.id}"><button>Remove</button></form></td></tr>` : ''; }).join('');
    const total = cart.reduce((s, l) => { const p = partById(l.partId); return s + (p ? p.retail * l.qty : 0); }, 0);
    return send(res, 200, layout(req, 'Cart', `<div class="card"><h1>Cart</h1>
      <table><tr><th>Part</th><th>Qty</th><th>Retail price</th><th>Line total</th><th></th></tr>${rows || '<tr><td colspan="5">Cart is empty.</td></tr>'}</table>
      <p class="price">Retail total: ${money(total)}</p>
      ${cart.length ? '<a class="btn" href="/checkout">Go to checkout</a>' : ''}</div>`));
  }

  /* ---------- CHECKOUT (VULN #1 fitment, #4 trade pricing, #7 price tamper, #14 coupon) ---------- */
  if (path === '/checkout' && req.method === 'GET') {
    const vehicles = userVehicles.filter(v => v.userId === user.id);
    const vehicleId = Number(q.get('vehicleId')) || (vehicles[0] && vehicles[0].id);
    const veh = vehicles.find(v => v.id === vehicleId);
    const incompatible = veh ? cart.filter(l => { const p = partById(l.partId); return p && !fitsVehicle(p, veh); }) : [];
    const rows = cart.map(l => { const p = partById(l.partId); if (!p) return '';
      const bad = veh && !fitsVehicle(p, veh);
      return `<tr><td>${esc(p.name)} ${bad ? '<span class="fit-no">(does not fit selected vehicle)</span>' : ''}</td><td>${l.qty}</td>
      <td><input name="price_${p.id}" value="${(role === 'trade' ? p.trade : p.retail).toFixed(2)}" style="width:100px"></td></tr>`; }).join('');
    const vehOptions = vehicles.map(v => `<option value="${v.id}" ${veh && v.id === veh.id ? 'selected' : ''}>${esc(v.make)} ${esc(v.model)} ${v.year} (${esc(v.nickname)})</option>`).join('');
    return send(res, 200, layout(req, 'Checkout', `<div class="card"><h1>Checkout</h1>
      <form method="GET" action="/checkout"><label>Vehicle this order is for</label>
      <select name="vehicleId">${vehOptions || '<option value="">No saved vehicles</option>'}</select><button class="btn grey">Check fitment</button></form>
      ${incompatible.length ? `<div class="warn">⚠ Fitment check: ${incompatible.map(l => esc(partById(l.partId).name)).join(', ')} do(es) not fit the selected vehicle. Checkout is blocked in the browser for safety.</div>` : (veh ? '<div class="ok">✓ All parts fit the selected vehicle.</div>' : '')}
      <form method="POST" action="/checkout">
      <input type="hidden" name="vehicleId" value="${veh ? veh.id : ''}">
      <table><tr><th>Part</th><th>Qty</th><th>Unit price (USD)</th></tr>${rows}</table>
      <label>Coupon code</label><input name="coupon" placeholder="e.g. PARTS15" style="width:220px">
      <input type="hidden" name="accountType" value="${esc(role)}">
      ${incompatible.length ? '<p class="fit-no">Checkout blocked: incompatible parts in cart.</p>' : '<button>Place order</button>'}
      </form>
      <p class="small">Prices shown are ${role === 'trade' ? 'trade' : 'retail'} prices. Final total is calculated on the server when you place the order.</p></div>`));
  }
  if (path === '/checkout' && req.method === 'POST') {
    bump('Cart & Checkout');
    const f = await readBody(req);
    /* Direct-buy support (also used by API-style clients): partId + qty bypass the cart entirely. */
    let lines = cart.slice();
    /* NEW VULN: direct-buy quantity is taken raw — zero or negative quantities are
       never validated, so the order (and its total) can go negative. */
    if (f.get('partId')) { const qv = parseInt(f.get('qty'), 10); lines = [{ partId: Number(f.get('partId')), qty: isNaN(qv) ? 1 : qv }]; }
    if (!lines.length) return send(res, 400, layout(req, 'Checkout', '<div class="card warn">Nothing to check out.</div>'));
    const vehicles = userVehicles.filter(v => v.userId === user.id);
    const veh = vehicles.find(v => v.id === Number(f.get('vehicleId'))) || vehicles[0];
    /* VULN #1: fitment is enforced ONLY in the browser (button hidden). The server never re-checks
       compatibility — a direct POST orders parts that do not fit the vehicle. */
    /* VULN #4: pricing tier comes from the request, not the account. accountType=trade gives any
       retail customer trade prices. */
    const accountType = f.get('accountType') || role;
    let total = 0;
    const items = [];
    for (const l of lines) {
      const p = partById(l.partId);
      if (!p) continue;
      let unit = accountType === 'trade' ? p.trade : p.retail;
      /* VULN #7: unit price is taken from the editable form field when present. */
      const posted = f.get(`price_${p.id}`);
      if (posted !== null && posted !== undefined && posted !== '' && !isNaN(Number(posted))) unit = Number(posted);
      total += unit * l.qty;
      items.push({ partId: p.id, qty: l.qty, price: unit });
      p.stock = Math.max(0, p.stock - l.qty);
    }
    /* VULN #14: coupon is applied with no per-user redemption record and no order-count limit —
       the same code works on every order, forever. */
    const coupon = (f.get('coupon') || '').toUpperCase();
    if (COUPONS[coupon]) total = total * (1 - COUPONS[coupon]);
    const order = { id: nextOrderId++, userId: user.id, items, total: Math.round(total * 100) / 100, status: 'placed', accountType, vehicle: veh ? `${veh.make} ${veh.model} ${veh.year}` : '—', created: '2026-10-23' };
    orders.push(order);
    /* Lab-system detection for the checkout family — each fires only when the
       vulnerable effect actually happened on this order. */
    if (accountType === 'trade' && user.role === 'retail') pass('trade-pricing-bypass');
    if (items.some(it => it.qty <= 0)) pass('quantity-tampering');
    if (items.some(it => { const p = partById(it.partId); if (!p) return false; const exp = accountType === 'trade' ? p.trade : p.retail; const posted = f.get(`price_${it.partId}`); return posted !== null && posted !== undefined && posted !== '' && !isNaN(Number(posted)) && Number(posted) !== exp; })) pass('price-tampering');
    if (veh && items.some(it => { const p = partById(it.partId); return p && !fitsVehicle(p, veh); })) pass('fitment-bypass');
    if (coupon && COUPONS[coupon]) {
      const byUser = couponUse.get(user.id) || new Map();
      const n = (byUser.get(coupon) || 0) + 1;
      byUser.set(coupon, n); couponUse.set(user.id, byUser);
      if (n >= 2) pass('coupon-reuse');
    }
    carts.set(sid, []);
    return redirect(res, `/order?id=${order.id}`);
  }

  /* ---------- ORDERS (VULN #6: IDOR) ---------- */
  if (path === '/orders' && req.method === 'GET') {
    const mine = orders.filter(o => o.userId === user.id);
    const rows = mine.map(o => `<tr><td><a href="/order?id=${o.id}">#${o.id}</a></td><td>${esc(o.created)}</td><td>${esc(o.vehicle)}</td><td>${money(o.total)}</td><td>${esc(o.status)}</td></tr>`).join('');
    return send(res, 200, layout(req, 'Orders', `<div class="card"><h1>My orders</h1>
      <table><tr><th>Order</th><th>Date</th><th>Vehicle</th><th>Total</th><th>Status</th></tr>${rows || '<tr><td colspan="5">No orders yet.</td></tr>'}</table></div>`));
  }
  if (path === '/order' && req.method === 'GET') {
    bump('Orders');
    const o = orders.find(x => x.id === Number(q.get('id')));
    if (!o) return send(res, 404, layout(req, 'Order', '<div class="card warn">Order not found.</div>'));
    /* VULN #6: no ownership check — any logged-in user can view any order by id. */
    if (o.userId !== user.id) pass('order-idor');
    const owner = userById(o.userId);
    const rows = o.items.map(it => { const p = partById(it.partId); return `<tr><td>${p ? esc(p.name) : 'Part #' + it.partId}</td><td>${it.qty}</td><td>${money(it.price)}</td></tr>`; }).join('');
    return send(res, 200, layout(req, `Order #${o.id}`, `<div class="card"><h1>Order #${o.id}</h1>
      <p class="small">Customer: ${owner ? esc(owner.name) : ''} · Vehicle: ${esc(o.vehicle)} · Tier: ${esc(o.accountType)} · Status: ${esc(o.status)} · Date: ${esc(o.created)}</p>
      <table><tr><th>Part</th><th>Qty</th><th>Unit price paid</th></tr>${rows}</table>
      <p class="price">Total: ${money(o.total)}</p>
      <form method="POST" action="/returns"><input type="hidden" name="orderId" value="${o.id}">
      <label>Return reason</label><input name="reason" required><button>Request return for this order</button></form></div>`));
  }

  /* ---------- QUOTES (VULN #5: IDOR on view + accept) ---------- */
  if (path === '/quotes/request' && req.method === 'POST') {
    bump('Quotes');
    const f = await readBody(req);
    const p = partById(f.get('partId'));
    if (!p) return redirect(res, '/parts');
    const base = role === 'trade' ? p.trade : p.retail;
    const quote = { id: nextQuoteId++, userId: user.id, partId: p.id, qty: Math.max(1, Number(f.get('qty')) || 1), offered: Math.round(base * 0.92 * 100) / 100, status: 'open', note: 'Standard quote — 8% under list' };
    quotes.push(quote);
    return redirect(res, `/quote?id=${quote.id}`);
  }
  if (path === '/quotes' && req.method === 'GET') {
    const mine = quotes.filter(x => x.userId === user.id);
    const rows = mine.map(x => { const p = partById(x.partId); return `<tr><td><a href="/quote?id=${x.id}">#${x.id}</a></td><td>${p ? esc(p.name) : ''}</td><td>${x.qty}</td><td>${money(x.offered)}</td><td>${esc(x.status)}</td></tr>`; }).join('');
    return send(res, 200, layout(req, 'Quotes', `<div class="card"><h1>My quotes</h1>
      <table><tr><th>Quote</th><th>Part</th><th>Qty</th><th>Offered price</th><th>Status</th></tr>${rows || '<tr><td colspan="5">No quotes yet.</td></tr>'}</table></div>`));
  }
  if (path === '/quote' && req.method === 'GET') {
    bump('Quotes');
    const quote = quotes.find(x => x.id === Number(q.get('id')));
    if (!quote) return send(res, 404, layout(req, 'Quote', '<div class="card warn">Quote not found.</div>'));
    /* VULN #5: no ownership check — anyone can view (and below, accept) anyone's quote. */
    if (quote.userId !== user.id) pass('quote-idor');
    const p = partById(quote.partId);
    const owner = userById(quote.userId);
    return send(res, 200, layout(req, `Quote #${quote.id}`, `<div class="card"><h1>Quote #${quote.id}</h1>
      <p>Part: ${p ? esc(p.name) : ''} · Qty: ${quote.qty} · Offered price: <b>${money(quote.offered)}</b> each</p>
      <p class="small">Customer: ${owner ? esc(owner.name) : ''} · Note: ${esc(quote.note)} · Status: ${esc(quote.status)}</p>
      ${quote.status === 'open' ? `<form method="POST" action="/quote/accept"><input type="hidden" name="quoteId" value="${quote.id}"><button>Accept quote &amp; place order</button></form>` : ''}
      </div>`));
  }
  if (path === '/quote/accept' && req.method === 'POST') {
    bump('Quotes');
    const f = await readBody(req);
    const quote = quotes.find(x => x.id === Number(f.get('quoteId')));
    /* VULN #5 (cont.): accepting someone else's quote creates an order on YOUR account at THEIR negotiated price. */
    if (quote && quote.status === 'open') {
      if (quote.userId !== user.id) pass('quote-idor');
      quote.status = 'accepted';
      const order = { id: nextOrderId++, userId: user.id, items: [{ partId: quote.partId, qty: quote.qty, price: quote.offered }], total: Math.round(quote.offered * quote.qty * 100) / 100, status: 'placed', accountType: role, vehicle: '—', created: '2026-10-23' };
      orders.push(order);
      return redirect(res, `/order?id=${order.id}`);
    }
    return redirect(res, '/quotes');
  }

  /* ---------- RETURNS (VULN #13: IDOR) ---------- */
  if (path === '/returns' && req.method === 'GET') {
    const mine = returns.filter(r => r.userId === user.id);
    const rows = mine.map(r => `<tr><td>#${r.id}</td><td><a href="/order?id=${r.orderId}">Order #${r.orderId}</a></td><td>${esc(r.reason)}</td><td>${esc(r.status)}</td></tr>`).join('');
    return send(res, 200, layout(req, 'Returns', `<div class="card"><h1>My returns</h1>
      <table><tr><th>Return</th><th>Order</th><th>Reason</th><th>Status</th></tr>${rows || '<tr><td colspan="4">No returns filed.</td></tr>'}</table></div>`));
  }
  if (path === '/returns' && req.method === 'POST') {
    bump('Returns');
    const f = await readBody(req);
    const order = orders.find(o => o.id === Number(f.get('orderId')));
    if (!order) return send(res, 404, layout(req, 'Returns', '<div class="card warn">Order not found.</div>'));
    if (order.userId !== user.id) pass('returns-idor');
    /* VULN #13: the order's owner is never checked — you can file a return (and trigger a refund
       workflow) against a stranger's order. */
    returns.push({ id: nextReturnId++, orderId: order.id, userId: user.id, reason: f.get('reason') || '', status: 'pending' });
    return redirect(res, '/returns');
  }

  /* ---------- PROFILE / SETTINGS — VULN #11: no CSRF token ---------- */
  if (path === '/profile' && req.method === 'GET') {
    return send(res, 200, layout(req, 'Profile', `<div class="card"><h1>Profile</h1>
      <table><tr><th>Name</th><td>${esc(user.name)}</td></tr><tr><th>Email</th><td>${esc(user.email)}</td></tr>
      <tr><th>Account type</th><td>${esc(user.role)}</td></tr><tr><th>Address</th><td>${esc(user.address)}</td></tr>
      <tr><th>Phone</th><td>${esc(user.phone)}</td></tr></table>
      <h2>Settings</h2>
      <form method="POST" action="/settings">
      <label>Display name</label><input name="name" value="${esc(user.name)}">
      <label>Address</label><input name="address" value="${esc(user.address)}">
      <label>Phone</label><input name="phone" value="${esc(user.phone)}">
      <button>Save settings</button></form></div>`));
  }
  if (path === '/settings' && req.method === 'POST') {
    bump('Profile & Garage');
    bump('Registration & Profile');
    const f = await readBody(req);
    /* VULN #11: no CSRF token — a malicious page can silently change a logged-in victim's settings. */
    if (f.get('name')) user.name = f.get('name');
    if (f.get('address') !== null) user.address = f.get('address');
    if (f.get('phone') !== null) user.phone = f.get('phone');
    if (isForgedRequest(req)) pass('csrf');
    return redirect(res, '/profile');
  }

  /* ---------- ADMIN (gated by effectiveRole — see VULN #10) ---------- */
  if (path === '/admin' && req.method === 'GET') {
    bump('Admin & Platform');
    if (!isAdmin(req, user)) return send(res, 403, layout(req, 'Admin', '<div class="card warn">Admins only.</div>'));
    if (user.role !== 'admin') pass('role-cookie-tamper');
    const orderRows = orders.map(o => { const ow = userById(o.userId); return `<tr><td>#${o.id}</td><td>${ow ? esc(ow.name) : ''}</td><td>${esc(o.vehicle)}</td><td>${money(o.total)}</td><td>${esc(o.status)}</td></tr>`; }).join('');
    const userRows = users.map(u => `<tr><td>${u.id}</td><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td></tr>`).join('');
    const partRows = parts.map(p => `<tr><td>${esc(p.sku)}</td><td>${esc(p.name)}</td><td>${p.stock}</td>
      <td><form method="POST" action="/admin/part" style="display:flex;gap:4px"><input type="hidden" name="partId" value="${p.id}">
      <input name="retail" value="${p.retail}" style="width:80px"><input name="trade" value="${p.trade}" style="width:80px"><button>Update prices</button></form></td></tr>`).join('');
    return send(res, 200, layout(req, 'Admin', `<div class="card"><h1>Admin dashboard</h1>
      <p class="small">Revenue (all orders): ${money(orders.reduce((s, o) => s + o.total, 0))} · Orders: ${orders.length} · Returns pending: ${returns.filter(r => r.status === 'pending').length} · VIN records: ${vinRecords.length}</p>
      <h2>All orders</h2><table><tr><th>Order</th><th>Customer</th><th>Vehicle</th><th>Total</th><th>Status</th></tr>${orderRows}</table>
      <h2>Users</h2><table><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th></tr>${userRows}</table>
      <h2>Parts &amp; pricing</h2><table><tr><th>SKU</th><th>Part</th><th>Stock</th><th>Retail / Trade</th></tr>${partRows}</table></div>`));
  }
  if (path === '/admin/part' && req.method === 'POST') {
    bump('Admin & Platform');
    if (!isAdmin(req, user)) return send(res, 403, layout(req, 'Admin', '<div class="card warn">Admins only.</div>'));
    if (user.role !== 'admin') pass('role-cookie-tamper');
    const f = await readBody(req);
    const p = partById(f.get('partId'));
    if (p) { if (!isNaN(Number(f.get('retail')))) p.retail = Number(f.get('retail')); if (!isNaN(Number(f.get('trade')))) p.trade = Number(f.get('trade')); }
    return redirect(res, '/admin');
  }

  return next();
}

/* ============================== SERVER ============================== */

const _cfgF = ['M0hSUg=='];

/* ------------------------------ LOCK GATE ------------------------------ */
function gatePage(err) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>LAB ${LAB_NUMBER} — ${esc(LAB_NAME)} (Locked)</title><style>${CSS}</style></head>
<body><main><div class="card" style="max-width:560px;margin:40px auto;text-align:center">
<img src="/logo.png" alt="HexaCyberLab" style="height:64px">
<h1>🔒 LAB ${LAB_NUMBER} — ${esc(LAB_NAME)}</h1>
<p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
${err ? `<div class="warn">${esc(err)}</div>` : ''}
<form method="POST" action="/unlock"><label>Completion key from Lab ${LAB_NUMBER - 1}</label>
<input name="key" placeholder="HX-…" autocomplete="off" required>
<button>Unlock &amp; start Lab ${LAB_NUMBER}</button></form>
<p class="small">HexaCyberLab labs run in order: finish the previous lab at 100% to earn its key.<br>Built by Md. Jony Hassain, Founder of HexaCyberLab.</p>
</div></main></body></html>`;
}
async function handleUnlock(req, res) {
  if (req.method === 'POST') {
    const f = await readBody(req);
    const given = (f.get('key') || '').trim();
    if (entryKeyMatches(given)) { state.unlocked = true; saveState(); return redirect(res, '/'); }
    return send(res, 403, gatePage('Invalid key — check the key from the previous lab\u2019s completion page and try again.'));
  }
  return send(res, 200, gatePage(''));
}

const server = http.createServer((req, res) => {
  (async () => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      /* Benign same-site marker: the app's own pages set hx_origin on every
         response; its absence on a state-changing POST (with no same-site
         Origin) is the CSRF proof signal used by the lab system. */
      const _wh = res.writeHead.bind(res);
      res.writeHead = (code, a, b) => {
        let headers = (a && typeof a === 'object') ? a : ((b && typeof b === 'object') ? b : null);
        try {
          if (!parseCookies(req).hx_origin) {
            const marker = 'hx_origin=local; Path=/';
            if (headers) {
              const ex = headers['Set-Cookie'];
              headers['Set-Cookie'] = ex ? [].concat(ex, marker) : marker;
              return (a && typeof a === 'object') ? _wh(code, headers) : _wh(code, a, headers);
            }
            res.setHeader('Set-Cookie', marker);
          }
        } catch (e) { /* never break a response over a marker cookie */ }
        return _wh(code, a, b);
      };
      /* Lock gate: until the entry key is pasted, ONLY the gate exists. */
      if (!state.unlocked) {
        if (url.pathname === '/logo.png' && LOGO_BUF) { res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(LOGO_BUF); }
        if (url.pathname === '/unlock') { await handleUnlock(req, res); return; }
        if (req.method === 'GET') return send(res, 200, gatePage(''));
        return redirect(res, '/');
      }
      const authedPaths = ['/vehicles', '/cart', '/checkout', '/orders', '/order', '/quotes', '/quote', '/returns', '/profile', '/settings', '/admin'];
      if (authedPaths.some(p => url.pathname === p || url.pathname.startsWith(p + '/'))) {
        let fellThrough = false;
        await handleAuthed(req, res, () => { fellThrough = true; });
        if (!fellThrough) return;
      }
      await handle(req, res);
      if (!res.writableEnded) send(res, 404, layout(req, 'Not found', '<div class="card warn">Page not found.</div>'));
    } catch (err) {
      /* Server stays stable on bad input: never crash on a malformed request. */
      if (!res.writableEnded) { try { send(res, 500, layout(req, 'Error', '<div class="card warn">Something went wrong — the lab is still running. Try again.</div>')); } catch (e) { /* socket gone */ } }
    }
  })();
});

server.listen(PORT, HOST, () => {
  console.log(`HexaAutoParts lab running at http://${HOST}:${PORT} (intentionally vulnerable — local only)`);
});
