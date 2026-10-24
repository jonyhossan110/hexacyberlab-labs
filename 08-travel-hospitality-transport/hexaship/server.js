'use strict';
/*
 * HexaShip — LAB 76 of 110 (Category 8: Travel, Hospitality & Transport)
 * A deliberately vulnerable parcel-shipping platform for local security training.
 * Zero-dependency Node.js. Binds 127.0.0.1:3085 ONLY. All data is fake seed data.
 * LOCAL USE ONLY — never deploy this app anywhere public.
 *
 * Lab system: entry-key gate, per-test progress with persistence, mission board,
 * Lab Coach chatbot with the 3-try help lock, completion debrief + certificate.
 * Keys are stored ONLY as scattered base64-of-reversed shards (see §7 of the
 * engine spec) and assembled at runtime; no key ever appears whole in this file.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB_NUMBER = 76;
const LAB_NAME = 'HexaShip';
const PORT = 3085;
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const LOGO_FILE = path.join(DIR, 'logo.png');

/* ------------------------------------------------------------------ *
 * Key shards. Each key was split into pieces; every piece was reversed
 * and base64-encoded, and the two arrays live in different regions of
 * this file. assemble() rebuilds a key at runtime, only where needed.
 * ------------------------------------------------------------------ */
const ENTRY_SHARDS = ["TC1YSA==","Qy02Nw==","Q0xVWg==","LVBRUQ==","RFdCNg==","UE9UWQ=="];
const COMPLETION_SHARDS = ["TC1YSA==","Vi03Nw==","WTRXRw==","LURQOQ==","NVRWSA==","UUwxSQ=="];
function assemble(shards) {
  return shards.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}
function entryKey() { return assemble(ENTRY_SHARDS); }
function completionKey() { return assemble(COMPLETION_SHARDS); }

/* ============================ TESTS registry ============================ */
const TESTS = [
  /* ---- Login & Authentication ---- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['The login form builds its database query by gluing your input straight into the SQL string.', 'A quote character lets you step out of the value and add your own logic to the WHERE clause.', "Try email: ' OR '1'='1 with any password — a true condition makes the first matching row (the admin) log in."],
    lesson: 'String-built SQL queries let attacker input change the query itself; parameterised queries keep data and code separate.',
    impact: 'On a real shipping portal this means instant admin takeover: every customer address, parcel and invoice exposed, from one login form.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries/prepared statements everywhere; never concatenate user input into SQL.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limiting or Lockout', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['Nothing slows you down when a password guess is wrong.', 'There is no CAPTCHA, no delay and no account lockout — count the failures.', 'Submit 10 wrong passwords for one account; the 10th is still processed like the 1st.'],
    lesson: 'Without throttling, an attacker can try unlimited passwords until one works; rate limits and lockouts make guessing impractical.',
    impact: 'Customer accounts fall to password guessing and credential stuffing — the attacker then ships parcels on the victim\u2019s account and reads their addresses.',
    report: { title: 'Missing Rate Limiting on Login Allows Brute-Force Attacks', severity: 'High', remediation: 'Add per-account and per-IP rate limiting, progressive delays and lockout/alerting after repeated failures.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User Enumeration via Login & Password Reset', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the answers for an email that exists with one that does not.', 'The forgot-password page is especially talkative about which accounts are real.', 'Probe at least 5 different emails and note how the responses differ.'],
    lesson: 'Different error messages for real vs. fake accounts hand attackers a verified target list for phishing and password attacks.',
    impact: 'Attackers harvest the portal\u2019s real customer emails, then aim phishing and credential stuffing only at accounts that exist.',
    report: { title: 'User Enumeration via Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message for all login/reset outcomes, regardless of whether the account exists.' } },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Published Demo Credentials', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['Read the login page carefully — it tries to be helpful to new users.', 'A demo account is advertised right on the page, password included.', 'Log in with the demo credentials printed on the login page.'],
    lesson: 'Demo and default accounts with known passwords are real accounts — attackers try them first on every deployment.',
    impact: 'Anyone on the internet can walk into a live customer account with credentials the site itself published; support/demo accounts are a classic breach entry point.',
    report: { title: 'Demo Account with Published Password Left Active', severity: 'High', remediation: 'Remove demo/default accounts from production, or force a unique password and disable them after onboarding.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07:2021 Authentication Failures', difficulty: 'Intermediate',
    hints: ['Reset tokens here are not random — they are computed from something public about the account.', 'The token format mentions the user id. What simple arithmetic could produce the rest?', 'For user id N the token is SHP-N-(N*137+42). Compute Bob\u2019s (id 4) and reset his password without ever requesting a reset.'],
    lesson: 'Reset tokens must be long, random and single-use; anything derivable from a user id is an account-takeover formula.',
    impact: 'Anyone who knows a customer\u2019s user id can reset their password and take over the account — no mailbox access needed.',
    report: { title: 'Predictable Password-Reset Tokens Allow Account Takeover', severity: 'Critical', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), store only a hash, expire them quickly and make them single-use.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Role Cookie Tampering', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The app trusts a cookie to tell it what role you have.', 'Your browser lets you edit cookies. One of them is named after a role.', 'Set the hx_role cookie to admin, then visit /admin — the server believes the cookie, not your account.'],
    lesson: 'Authorization data must live server-side; any role the client can edit, the client can choose.',
    impact: 'A plain customer becomes admin by editing a cookie — full control of users, parcels and money from a free account.',
    report: { title: 'Client-Controlled Role Cookie Allows Privilege Escalation', severity: 'Critical', remediation: 'Store roles only in the server-side session record; ignore any role claims sent by the client.' } },

  /* ---- Registration & Profile ---- */
  { id: 'reg-weak', feature: 'Registration & Profile', name: 'Weak Password Policy', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['How short a password will the registration form accept?', 'There is no minimum length check at all.', 'Register a new account with the single-character password "x".'],
    lesson: 'A password policy is the first brute-force defence; accepting 1-character passwords makes accounts trivially guessable.',
    impact: 'Customers who pick weak passwords (and many will, if allowed) get their accounts — and stored home addresses — cracked in seconds.',
    report: { title: 'Registration Accepts Single-Character Passwords', severity: 'Medium', remediation: 'Enforce a minimum length (≥10) and check passwords against known-breached lists.' } },
  { id: 'reg-mass', feature: 'Registration & Profile', name: 'Mass Assignment — Role & Credit at Registration', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration handler copies more of your form than it shows you.', 'What fields does a user record have that the form never displays — role? credit balance?', 'Register while adding extra form fields role=staff and credit=5000; the new account keeps both.'],
    lesson: 'Binding request data directly onto a data model lets attackers set fields the UI never offered; whitelist the fields a form may set.',
    impact: 'Attackers self-register as staff with a fat credit balance — free shipping and insider access from a public form.',
    report: { title: 'Mass Assignment in Registration Allows Role and Balance Forgery', severity: 'High', remediation: 'Whitelist bindable fields per endpoint; set role/credit server-side only.' } },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is shown back on pages without being cleaned.', 'HTML typed into the name field is stored and rendered as-is.', 'Register (or rename yourself) with the name <script>alert(1)</script> and look at any page that shows it.'],
    lesson: 'Stored user input must be output-encoded everywhere it renders; one unescaped name field poisons every viewer, including staff.',
    impact: 'An attacker plants a script in their profile name; when staff open the console, the script runs in the staff browser — session theft and actions as staff.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Output-encode all user data at render time and validate input; add a Content-Security-Policy as defence in depth.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Profile changes are accepted from a bare POST — no anti-CSRF token is verified.', 'The app\u2019s own forms carry a hidden hx_origin marker; the server never checks it.', 'Submit the profile form without the hx_origin marker (e.g. with curl) and the change still applies.'],
    lesson: 'State-changing requests need an unforgeable token tied to the session; a cookie alone rides along on cross-site requests.',
    impact: 'A malicious page visited by a logged-in customer silently changes their profile — name, email or delivery details — without them knowing.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require a per-session CSRF token on every state-changing request and verify Origin/Referer.' } },

  /* ---- Parcels & Pricing ---- */
  { id: 'parcel-weight', feature: 'Parcels & Pricing', name: 'Weight/Price Tampering — 20 kg at the 1 kg Price', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The create-parcel form computes the price in the browser and posts it along.', 'The server trusts the price it is sent instead of pricing the parcel itself.', 'Create a 20 kg standard parcel but post the 1 kg price ($5.50). The server truth for 20 kg standard is $34 — you pay $5.50.'],
    lesson: 'Prices must be computed server-side from server data; any price arriving from the client is a suggestion an attacker will edit.',
    impact: 'Customers ship heavy parcels for the price of a letter — direct revenue loss on every order, at scale, with no hacking skill needed.',
    report: { title: 'Client-Supplied Price Trusted in Parcel Creation', severity: 'High', remediation: 'Compute all prices server-side from weight and service; ignore client-posted amounts.' } },
  { id: 'parcel-service', feature: 'Parcels & Pricing', name: 'Service-Level Upgrade Forgery', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Express costs more than Standard — but who checks that you paid the express price?', 'The service level and the price travel together in one form post.', 'Create a 2 kg EXPRESS parcel but post the standard price for 2 kg ($7). You get express service at the standard rate.'],
    lesson: 'Every priced attribute must be re-derived server-side; a premium option sold at the basic price is the same bug as a wrong total.',
    impact: 'Every customer can upgrade to express for free — the premium tier stops earning money while costing the company express handling.',
    report: { title: 'Service Level Not Re-Priced Server-Side Allows Free Express Upgrades', severity: 'High', remediation: 'Price the parcel server-side from the chosen service level and weight at order time.' } },
  { id: 'parcel-negative', feature: 'Parcels & Pricing', name: 'Negative Weight — Negative Total', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Does the server ever check that a weight is a sensible, positive number?', 'Negative inputs turn totals negative — and a negative bill is a credit.', 'Create a parcel with weight -5 and its matching negative price; it is accepted and the total goes below zero.'],
    lesson: 'Numeric inputs need range validation (positive, sane bounds) on the server; arithmetic alone will happily produce money from nothing.',
    impact: 'Negative-weight parcels create negative invoices — in a real system that is credit/refunds minted by the customer, plus corrupt logistics data.',
    report: { title: 'Missing Range Validation Allows Negative-Weight Parcels and Negative Totals', severity: 'Medium', remediation: 'Validate weight/quantity as positive numbers within sane bounds on the server.' } },

  /* ---- Tracking & Delivery ---- */
  { id: 'track-idor', feature: 'Tracking & Delivery', name: 'Tracking IDOR — Sequential Tracking Numbers', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Tracking numbers here are just counters: SHP1001, SHP1002, …', 'The tracking page shows the full journey — and the delivery address — to anyone who asks.', 'Track a parcel that is not yours, e.g. SHP1002 (Bob\u2019s), while logged in as Alice.'],
    lesson: 'Predictable identifiers plus no ownership check turn every tracking page into a public address book; check authorization on every object.',
    impact: 'Anyone can enumerate every shipment — who sent what to which home address, and when the house is expecting a delivery. A privacy and physical-safety problem.',
    report: { title: 'Insecure Direct Object Reference on Tracking Page Exposes All Shipments', severity: 'High', remediation: 'Use unguessable tracking tokens and verify the requester owns (or is the recipient of) the parcel.' } },
  { id: 'track-forge', feature: 'Tracking & Delivery', name: 'Forged "Delivered" Tracking Event by a Customer', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Tracking events are added through an endpoint meant for courier staff.', 'Nothing checks that the person posting an event actually is staff.', 'As a customer, POST a tracking event with status Delivered to /parcels/<your parcel id>/events — the parcel is suddenly "delivered".'],
    lesson: 'Write endpoints need the same role checks as the pages behind them; a hidden URL is not an authorization check.',
    impact: 'Customers mark their own parcels delivered (refund/insurance fraud: "it never arrived" — or the opposite, closing disputes early) and corrupt the tracking record the business relies on.',
    report: { title: 'Missing Authorization on Tracking-Event Endpoint Allows Forged Delivery Status', severity: 'High', remediation: 'Restrict tracking-event creation to verified staff roles and audit every status change.' } },
  { id: 'track-address', feature: 'Tracking & Delivery', name: 'Destination Change on an In-Transit Parcel', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Business rule: once a parcel is out for delivery, its destination is locked.', 'The change-address endpoint never asks what state the parcel is in.', 'Take Bob\u2019s "Out for delivery" parcel (as Bob) — or your own in-transit one — and POST a new destination to /parcels/<id>/address. It changes.'],
    lesson: 'Business rules are security rules: state transitions (and what may still change in each state) must be enforced server-side.',
    impact: 'Parcels get rerouted mid-delivery — interception fraud and theft of goods in transit, with the audit trail showing a "customer request".',
    report: { title: 'Delivery Address Changeable After Dispatch', severity: 'High', remediation: 'Lock destination changes once a parcel leaves the depot; route exceptions through staff approval.' } },

  /* ---- Labels & Invoices ---- */
  { id: 'label-idor', feature: 'Labels & Invoices', name: 'Shipping Label IDOR', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Labels carry both the sender and the recipient address in full.', 'The label URL is just the parcel id — /parcels/<id>/label.', 'Open the label of a parcel that belongs to someone else (e.g. parcel 2, Bob\u2019s).'],
    lesson: 'Documents generated per-object need the same ownership checks as the object pages; a "print view" is still data exposure.',
    impact: 'Full names and home addresses of every sender and recipient leak — a ready-made list for phishing, stalking or burglary timing.',
    report: { title: 'Shipping Labels Accessible Without Ownership Check (IDOR)', severity: 'High', remediation: 'Verify parcel ownership before serving labels; use signed, expiring document URLs.' } },
  { id: 'inv-idor', feature: 'Labels & Invoices', name: 'Invoice IDOR', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Invoices are numbered in order and the page never asks whose invoice it is.', 'Try /invoices/2 while logged in as Alice — that one is Bob\u2019s.', 'Any invoice id you can guess, you can read: amounts, addresses, parcel details.'],
    lesson: 'Financial documents are prime IDOR targets; sequential ids plus missing ownership checks expose the whole billing history.',
    impact: 'Competitors or snoops read every customer\u2019s billing — prices paid, addresses, shipping habits — straight off the invoice pages.',
    report: { title: 'Invoice Pages Lack Ownership Verification (IDOR)', severity: 'High', remediation: 'Scope every invoice query to the authenticated owner; use non-sequential public references.' } },
  { id: 'inv-tamper', feature: 'Labels & Invoices', name: 'Invoice Payment Amount Tampering', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The pay-invoice form lets the client say how much they paid — and whether it settles the bill.', 'A "settle in full" flag from the client is taken at face value.', 'Pay your $7 invoice with amount=1 and settle=full: the invoice flips to PAID for $1.'],
    lesson: 'The server must reconcile payment amount against the amount due; a client flag can never declare a debt settled.',
    impact: 'Every invoice can be "paid" for a dollar — total revenue leakage dressed up as completed payments in the ledger.',
    report: { title: 'Client-Controlled Payment Amount and Settlement Flag on Invoices', severity: 'Critical', remediation: 'Verify paid amount server-side against the invoice total via the payment provider webhook; never accept client settlement claims.' } },

  /* ---- Address Book ---- */
  { id: 'addr-idor', feature: 'Address Book', name: 'Address Book IDOR — Edit Another Customer\u2019s Address', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Saved addresses have simple ids too — and the edit form trusts them.', 'Your address book shows your entries; the edit URL takes any id.', 'Open /addresses/2/edit as Alice (that address is Bob\u2019s) and save a change. It sticks.'],
    lesson: 'Ownership checks belong on the write path, not just the read path; an edit form is an attack surface.',
    impact: 'An attacker rewrites a victim\u2019s saved delivery address — the victim\u2019s next orders quietly ship to the attacker\u2019s door.',
    report: { title: 'Address Book Entries Editable by Any Customer (IDOR)', severity: 'High', remediation: 'Check entry ownership on view and edit; scope all address queries to the session user.' } },

  /* ---- Search ---- */
  { id: 'search-sqli', feature: 'Search', name: 'SQL Injection in Parcel Search', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Search glues your query text into SQL the same way the login form does.', 'A tautology in the WHERE clause makes every row match.', "Search for ' OR '1'='1 and the results include everyone\u2019s parcels, not just yours."],
    lesson: 'Every input that reaches SQL needs parameterisation — search boxes are the most-tried injection point on any site.',
    impact: 'One search dumps the entire shipment database — customers, addresses, contents — the full breach in a single request.',
    report: { title: 'SQL Injection in Parcel Search Returns All Customers\u2019 Shipments', severity: 'Critical', remediation: 'Parameterise search queries and scope results to the authenticated user.' } },
  { id: 'search-xss', feature: 'Search', name: 'Reflected XSS in Search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The results page repeats your search term back to you — uncleaned.', 'Put markup in the query and view the page source.', 'Search for <script>alert(1)</script> and it is reflected verbatim into the page.'],
    lesson: 'Reflected input must be encoded at output; a search page that echoes queries is a script-delivery service for attackers.',
    impact: 'Attackers send victims a crafted search link; the script runs on the real site in the victim\u2019s browser — session theft from a trusted URL.',
    report: { title: 'Reflected Cross-Site Scripting in Search Results', severity: 'Medium', remediation: 'HTML-encode all reflected values; validate search input and deploy a CSP.' } },

  /* ---- Staff & Admin Panel ---- */
  { id: 'admin-bac', feature: 'Staff & Admin Panel', name: 'Staff Console Broken Access Control', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The staff console URL is /staff. Who does it actually let in?', 'It checks that you are logged in — not that you are staff.', 'Log in as a normal customer and simply visit /staff.'],
    lesson: 'Every privileged page must verify the role server-side on every request; "hidden in the menu" is not protection.',
    impact: 'Any free customer account opens the staff console — all parcels, all customers, staff tooling — the keys to the warehouse on a public URL.',
    report: { title: 'Staff Console Accessible to Regular Customers', severity: 'Critical', remediation: 'Enforce staff-role checks server-side on every staff route.' } },
  { id: 'admin-csrf', feature: 'Staff & Admin Panel', name: 'CSRF on Admin User Deactivation', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Admin actions ride on the admin\u2019s cookies, with no token check — the same missing-marker flaw as the profile form, one level up.', 'The deactivate button form carries an hx_origin marker that nobody verifies.', 'As admin, POST /admin/users/5/deactivate without the hx_origin marker; the user is deactivated anyway.'],
    lesson: 'Privileged actions need CSRF tokens most of all; the more powerful the action, the more attractive the forged request.',
    impact: 'A booby-trapped page visited by an admin deactivates users — lock out staff or customers at scale without ever learning a password.',
    report: { title: 'Missing CSRF Protection on Admin User Deactivation', severity: 'High', remediation: 'Require per-session CSRF tokens on all admin actions and re-confirm destructive operations.' } },

  /* ---- Platform & API ---- */
  { id: 'api-token', feature: 'Platform & API', name: 'Weak API Token — base64 of the Email Address', owasp: 'A07:2021 Authentication Failures', difficulty: 'Intermediate',
    hints: ['The API authenticates with an X-API-Key header. The key is derived from something public.', 'Try reversible encodings of your own email address.', "The token is shp_ + base64(email). Forge Alice\u2019s and call GET /api/parcels with no session cookie at all."],
    lesson: 'API keys must be random secrets; anything computed from public data (an email) can be computed by anyone.',
    impact: 'Anyone who knows a customer\u2019s email — public information — owns their API identity: parcels, addresses and invoices via script.',
    report: { title: 'API Tokens Are Deterministic (base64 of Email) and Forgeable', severity: 'High', remediation: 'Issue random, high-entropy API keys, store hashes, and support rotation/revocation.' } },
  { id: 'api-debug', feature: 'Platform & API', name: 'Unauthenticated Debug Data Dump', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Developers leave helpers behind. This one answers at /api/debug.', 'No login, no token, no questions asked.', 'Fetch /api/debug in a fresh browser (or curl) and read the entire user table — passwords included.'],
    lesson: 'Debug endpoints must never reach production; if they must exist, they need the strongest authentication in the system, not none.',
    impact: 'Total breach in one request: every account with its password, every parcel and address — the endpoint attackers dream about.',
    report: { title: 'Unauthenticated Debug Endpoint Dumps Users and Passwords', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; gate diagnostics behind admin auth and network restrictions.' } }
];
const TEST_BY_ID = Object.fromEntries(TESTS.map(t => [t.id, t]));
const FEATURES = [...new Set(TESTS.map(t => t.feature))];

/* ============================ Progress state ============================ */
let state = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadState() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      state = Object.assign(state, raw);
    }
  } catch (e) { /* corrupt state file: start fresh rather than crash */ }
}
function saveState() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2)); } catch (e) { /* disk issue: keep serving */ }
}
function doneCount() { return TESTS.filter(t => state.tests[t.id]).length; }
function isComplete() { return doneCount() === TESTS.length; }
function pass(id) {
  if (!TEST_BY_ID[id] || state.tests[id]) return;
  state.tests[id] = true;
  if (isComplete() && !state.completedAt) { state.completedAt = new Date().toISOString(); state.keyRevealed = true; }
  saveState();
}
function attempt(feature) {
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  saveState();
}
loadState();

/* ============================ Seed data (all fake) ============================ */
const RATES = { standard: { base: 4, perKg: 1.5, label: 'Standard' }, express: { base: 9, perKg: 3, label: 'Express' } };
function priceTruth(weight, service) {
  const r = RATES[service] || RATES.standard;
  return Math.round((r.base + r.perKg * weight) * 100) / 100;
}
let users = [
  { id: 1, email: 'admin@hexaship.local', password: 'admin123', name: 'Ship Admin', role: 'admin', credit: 0, active: true },
  { id: 2, email: 'staff@hexaship.local', password: 'staff123', name: 'Staff Sam', role: 'staff', credit: 0, active: true },
  { id: 3, email: 'alice@test.local', password: 'alice123', name: 'Alice Sender', role: 'customer', credit: 0, active: true },
  { id: 4, email: 'bob@test.local', password: 'bob123', name: 'Bob Receiver', role: 'customer', credit: 0, active: true },
  { id: 5, email: 'demo@hexaship.local', password: 'demo123', name: 'Demo User', role: 'customer', credit: 0, active: true }
];
let nextUserId = 6;
let parcels = [
  { id: 1, tracking: 'SHP1001', owner: 3, sender: 'Alice Sender', recipient: 'Charlie Home', address: '12 Lake Road, Dhaka', weight: 2, service: 'standard', price: 7, status: 'In transit',
    events: [ { status: 'Created', note: 'Label created', at: '2026-10-20 09:12', by: 'system' }, { status: 'Picked up', note: 'Collected from sender', at: '2026-10-20 14:40', by: 'staff' }, { status: 'In transit', note: 'Departed Dhaka hub', at: '2026-10-21 08:05', by: 'staff' } ] },
  { id: 2, tracking: 'SHP1002', owner: 4, sender: 'Bob Receiver', recipient: 'Dana Office', address: '9 Hill Street, Chattogram', weight: 5, service: 'express', price: 24, status: 'Out for delivery',
    events: [ { status: 'Created', note: 'Label created', at: '2026-10-21 10:02', by: 'system' }, { status: 'In transit', note: 'Arrived Chattogram hub', at: '2026-10-22 07:31', by: 'staff' }, { status: 'Out for delivery', note: 'With courier', at: '2026-10-22 09:15', by: 'staff' } ] },
  { id: 3, tracking: 'SHP1003', owner: 4, sender: 'Bob Receiver', recipient: 'Eve Point', address: '3 Palm Avenue, Sylhet', weight: 1, service: 'standard', price: 5.5, status: 'Delivered',
    events: [ { status: 'Created', note: 'Label created', at: '2026-10-18 11:20', by: 'system' }, { status: 'Delivered', note: 'Signed by recipient', at: '2026-10-19 13:44', by: 'staff' } ] }
];
let nextParcelId = 4;
let nextTracking = 1004;
let invoices = [
  { id: 1, owner: 3, parcelId: 1, total: 7, status: 'Unpaid', paidAmount: 0 },
  { id: 2, owner: 4, parcelId: 2, total: 24, status: 'Unpaid', paidAmount: 0 }
];
let nextInvoiceId = 3;
let addresses = [
  { id: 1, owner: 3, label: 'Home', name: 'Alice Sender', address: '12 Lake Road, Dhaka' },
  { id: 2, owner: 4, label: 'Office', name: 'Bob Receiver', address: '9 Hill Street, Chattogram' }
];
let nextAddressId = 3;

/* ============================ Sessions & auth ============================ */
const sessions = new Map(); // sid -> userId
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}
function currentUser(req) {
  const sid = parseCookies(req).hx_session;
  if (!sid || !sessions.has(sid)) return null;
  return users.find(u => u.id === sessions.get(sid)) || null;
}
/* VULN (by design): the role is taken from a client-editable cookie when present. */
function effectiveRole(req, user) {
  const c = parseCookies(req).hx_role;
  return c ? String(c) : (user ? user.role : 'customer');
}
function resetTokenFor(user) { return 'SHP-' + user.id + '-' + (user.id * 137 + 42); }
const issuedResetTokens = new Set();
const loginFailures = new Map();  // email -> count
const enumProbes = new Map();     // ip -> Set of emails

/* ============================ Detection predicates ============================ */
function sqliPat(s) {
  if (!s) return false;
  const t = String(s);
  return /'\s*(or|and)\s+'?\w+'?\s*=\s*'?\w+/i.test(t)
      || /'\s*(or|and)\s+\d+\s*=\s*\d+/i.test(t)
      || /union\s+(all\s+)?select/i.test(t)
      || /'\s*--/.test(t)
      || /'\s*or\s+1\s*=\s*1/i.test(t);
}
function xssPat(s) {
  if (!s) return false;
  return /<script|onerror\s*=|onload\s*=|<svg|<img[^>]*\son\w+\s*=|<iframe/i.test(String(s));
}

/* ============================ HTTP helpers ============================ */
function send(res, code, body, headers) {
  const h = Object.assign({ 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': 'hx_origin=1; Path=/' }, headers || {});
  res.writeHead(code, h);
  res.end(body);
}
function redirect(res, to, extraCookies) {
  const cookies = ['hx_origin=1; Path=/'].concat(extraCookies || []);
  res.writeHead(302, { Location: to, 'Set-Cookie': cookies });
  res.end();
}
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) { try { return resolve(JSON.parse(data || '{}')); } catch (e) { return resolve({ __malformed: true }); } }
      const out = {};
      new URLSearchParams(data).forEach((v, k) => { out[k] = v; });
      resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function userById(id) { return users.find(u => u.id === Number(id)); }
function parcelById(id) { return parcels.find(p => p.id === Number(id)); }

/* ============================ Page layout ============================ */
function progressBar() {
  const done = doneCount(), total = TESTS.length, pct = Math.floor(done / total * 100);
  return `<div style="background:#1d1d2b;border-radius:8px;padding:8px 14px;margin:10px 0">
    <div style="font-size:13px;color:#cfcfe0">LAB ${LAB_NUMBER} — ${LAB_NAME} · ${done}/${total} tests · ${pct}%</div>
    <div style="background:#33334a;border-radius:5px;height:10px;margin-top:5px"><div style="background:#7c5cff;height:10px;border-radius:5px;width:${pct}%"></div></div></div>`;
}
function chatWidget() {
  return `<div id="hxchat" style="position:fixed;right:16px;bottom:16px;width:320px;font-family:Arial,sans-serif;z-index:50">
  <button onclick="document.getElementById('hxchatbody').style.display=document.getElementById('hxchatbody').style.display==='none'?'block':'none'" style="width:100%;padding:9px;background:#7c5cff;color:#fff;border:0;border-radius:8px;cursor:pointer">Lab Coach</button>
  <div id="hxchatbody" style="display:none;background:#fff;border:1px solid #ccd;border-radius:8px;margin-top:6px;padding:10px;max-height:340px;overflow:auto">
    <div id="hxchatlog" style="font-size:13px;color:#222;min-height:60px"></div>
    <div style="display:flex;gap:6px;margin-top:8px"><input id="hxchatin" style="flex:1;padding:7px" placeholder="Ask the Lab Coach…">
    <button onclick="hxSend()" style="padding:7px 12px;background:#7c5cff;color:#fff;border:0;border-radius:6px;cursor:pointer">Send</button></div>
  </div></div>
  <script>
  function hxSend(){var i=document.getElementById('hxchatin');var m=i.value.trim();if(!m)return;i.value='';
    var log=document.getElementById('hxchatlog');log.innerHTML+='<p style="margin:4px 0"><b>You:</b> '+m.replace(/</g,'&lt;')+'</p>';
    fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})})
    .then(function(r){return r.json()}).then(function(d){log.innerHTML+='<p style="margin:4px 0"><b>Coach:</b> '+String(d.reply).replace(/</g,'&lt;')+'</p>';log.scrollTop=1e6;})
    .catch(function(){log.innerHTML+='<p style="margin:4px 0"><b>Coach:</b> I could not answer just now.</p>';});}
  </script>`;
}
function page(req, title, body, user) {
  const nav = user
    ? `<div style="font-size:13px;margin:6px 0">Logged in as <b>${esc(user.name)}</b> (${esc(user.role)}) · <a href="/">Dashboard</a> · <a href="/parcels">My Parcels</a> · <a href="/parcels/new">Send a Parcel</a> · <a href="/track">Track</a> · <a href="/invoices">Invoices</a> · <a href="/addresses">Address Book</a> · <a href="/search">Search</a> · <a href="/profile">Profile</a> · <a href="/tests">Mission Board</a> · <a href="/logout">Log out</a></div>`
    : `<div style="font-size:13px;margin:6px 0"><a href="/login">Log in</a> · <a href="/register">Register</a> · <a href="/tests">Mission Board</a></div>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)} — LAB ${LAB_NUMBER} ${LAB_NAME}</title></head>
  <body style="margin:0;background:#14141d;font-family:Arial,sans-serif;color:#191924">
  <div style="max-width:880px;margin:0 auto;padding:16px">
    <div style="background:#fff;border-radius:12px;padding:18px 22px">
      <div style="display:flex;align-items:center;gap:12px"><img src="/logo.png" style="height:44px"><h2 style="margin:0">LAB ${LAB_NUMBER} — ${LAB_NAME}</h2></div>
      ${progressBar()}${nav}<hr style="border:0;border-top:1px solid #e3e3ee">${body}
    </div></div>${chatWidget()}</body></html>`;
}
function gatePage() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ${LAB_NUMBER} — ${LAB_NAME} · Locked</title></head>
  <body style="margin:0;background:#14141d;font-family:Arial,sans-serif">
  <div style="max-width:520px;margin:60px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:28px;text-align:center">
    <img src="/logo.png" style="height:56px"><h2>LAB ${LAB_NUMBER} — ${LAB_NAME}</h2>
    <p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
    <form method="POST" action="/unlock"><input name="key" style="padding:9px;width:80%" placeholder="Completion key from Lab ${LAB_NUMBER - 1}"><br><br>
    <button style="padding:10px 22px">Unlock LAB ${LAB_NUMBER}</button></form></div>${chatWidget()}</body></html>`;
}

/* ============================ Lab Coach chatbot ============================ */
const FEATURE_KEYWORDS = [
  ['Login & Authentication', /login|auth|password|brute|reset token|enumerat|cookie|session/i],
  ['Registration & Profile', /regist|profile|sign ?up|mass assign|weak password/i],
  ['Parcels & Pricing', /parcel|pric|weight|service level|express|ship/i],
  ['Tracking & Delivery', /track|deliver|in transit|destination/i],
  ['Labels & Invoices', /label|invoice|bill|pay/i],
  ['Address Book', /address book|saved address/i],
  ['Search', /search/i],
  ['Staff & Admin Panel', /staff|admin|console|deactivat/i],
  ['Platform & API', /api|debug|token|platform/i]
];
function featureFromMessage(msg) {
  for (const [f, re] of FEATURE_KEYWORDS) if (re.test(msg)) return f;
  return null;
}
function chatReply(rawMsg) {
  const msg = String(rawMsg || '').slice(0, 500);
  const done = doneCount(), total = TESTS.length, pct = Math.floor(done / total * 100);
  if (/who (built|made|created)|founder|who is (jony|the maker)|built (this|these|the labs)/i.test(msg)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (/\bkey\b/i.test(msg) && /(completion|next|unlock|give|share|tell|what)/i.test(msg)) {
    if (isComplete() && state.keyRevealed) return 'You completed LAB ' + LAB_NUMBER + ' — well done. The completion key for the next lab is: ' + completionKey();
    return 'I do not have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at ' + pct + '% (' + done + '/' + total + ' tests). Finish every test on the Mission Board (/tests) and the key will be revealed on the completion page.';
  }
  const feature = featureFromMessage(msg);
  if (/(how many|list|which|what).*(test|vulnerab|feature)/i.test(msg) || /^features/i.test(msg)) {
    if (feature) {
      const list = TESTS.filter(t => t.feature === feature);
      return feature + ' has ' + list.length + ' tests: ' + list.map(t => t.name).join('; ') + '. I can explain what they are freely — but step-by-step help unlocks after 3 genuine attempts on that feature.';
    }
    return 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + total + ' tests across ' + FEATURES.length + ' features: ' + FEATURES.map(f => f + ' (' + TESTS.filter(t => t.feature === f).length + ')').join(', ') + '. See the Mission Board at /tests.';
  }
  if (/(progress|score|how am i|status)/i.test(msg)) {
    const next = TESTS.find(t => !state.tests[t.id]);
    return 'Your progress: ' + done + '/' + total + ' tests (' + pct + '%).' + (next ? ' Next open test: "' + next.name + '" in ' + next.feature + '.' : ' The lab is complete!');
  }
  if (/(how|step|guide|help me|solve|exploit|bypass|walk ?through)/i.test(msg)) {
    if (!feature) return 'Tell me which feature you want help with — for example "how do I solve the Tracking & Delivery tests?" Help for a feature unlocks after 3 genuine attempts on it.';
    const att = state.attempts[feature] || 0;
    const open = TESTS.filter(t => t.feature === feature && !state.tests[t.id]);
    if (att >= 3 || open.length === 0) {
      if (open.length === 0) return 'You have already completed every test in ' + feature + '. Well done!';
      return 'Step by step for ' + feature + ':\n' + open.map(t => '• ' + t.name + ' — ' + t.hints[2] + ' (' + t.lesson + ')').join('\n');
    }
    return 'That feature is locked for help. First try the ' + feature + ' tests yourself at least 3 times — I can see you\u2019ve tried ' + att + ' time(s) so far. After 3 real tries, ask me again and I\u2019ll guide you step by step.';
  }
  if (/(next|what should|where|start)/i.test(msg)) {
    const next = TESTS.find(t => !state.tests[t.id]);
    if (!next) return 'Everything is done — open /complete for your debrief and certificate.';
    return 'Start with "' + next.name + '" (' + next.feature + ', ' + next.difficulty + '). Open /tests for its hints, try it at least 3 times, then ask me for step-by-step help.';
  }
  if (/^(hi|hello|hey|help)/i.test(msg)) {
    return 'Hello! I am the Lab Coach for LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' (' + total + ' tests, ' + FEATURES.length + ' features). You are at ' + pct + '%. Ask me what tests a feature has, how to solve them (after 3 tries on that feature), or what to do next.';
  }
  return 'I can help with the tests in this lab: ask me how many tests a feature has, say "progress" for your score, or ask how to solve a feature\u2019s tests (help unlocks after 3 genuine attempts on that feature). The Mission Board is at /tests.';
}

/* ============================ Routes: auth ============================ */
function loginPage(err) {
  return `<h3>Log in to HexaShip</h3>${err ? `<p style="color:#b00">${esc(err)}</p>` : ''}
  <form method="POST" action="/login">
    <p><input name="email" type="email" placeholder="Email" style="padding:8px;width:70%" required></p>
    <p><input name="password" type="password" placeholder="Password" style="padding:8px;width:70%" required></p>
    <button style="padding:9px 20px">Log in</button></form>
  <p style="font-size:13px">New here? <a href="/register">Create an account</a> · <a href="/forgot">Forgot password?</a></p>
  <div style="background:#fff8e1;border:1px solid #e6cf7a;border-radius:8px;padding:10px 14px;font-size:13px">
    <b>Try our demo account:</b> email <code>demo@hexaship.local</code> · password <code>demo123</code></div>`;
}
async function handleLogin(req, res) {
  const b = await readBody(req);
  attempt('Login & Authentication');
  const email = String(b.email || ''), password = String(b.password || '');
  const ip = req.socket.remoteAddress || 'local';
  if (!enumProbes.has(ip)) enumProbes.set(ip, new Set());
  enumProbes.get(ip).add(email.toLowerCase());
  if (enumProbes.get(ip).size >= 5) pass('auth-enum');
  /* VULN (by design): the query is string-built, so an injection pattern bypasses the password check. */
  const query = "SELECT * FROM users WHERE email = '" + email + "' AND password = '" + password + "'";
  if (sqliPat(email) || sqliPat(password)) {
    void query;
    const admin = users[0];
    const sid = crypto.randomBytes(16).toString('hex');
    sessions.set(sid, admin.id);
    pass('auth-sqli');
    return redirect(res, '/', ['hx_session=' + sid + '; Path=/; HttpOnly']);
  }
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (user && user.active && user.password === password) {
    if (user.email === 'demo@hexaship.local') pass('auth-default');
    const sid = crypto.randomBytes(16).toString('hex');
    sessions.set(sid, user.id);
    return redirect(res, '/', ['hx_session=' + sid + '; Path=/; HttpOnly']);
  }
  const n = (loginFailures.get(email.toLowerCase()) || 0) + 1;
  loginFailures.set(email.toLowerCase(), n);
  if (n >= 10) pass('auth-brute');
  /* VULN (by design): the error reveals whether the account exists. */
  const err = user ? 'Wrong password for this account.' : 'No account found for that email.';
  return send(res, 200, page(req, 'Log in', loginPage(err), null));
}
function registerPage() {
  return `<h3>Create your HexaShip account</h3>
  <form method="POST" action="/register">
    <p><input name="name" placeholder="Full name" style="padding:8px;width:70%" required></p>
    <p><input name="email" type="email" placeholder="Email" style="padding:8px;width:70%" required></p>
    <p><input name="password" type="password" placeholder="Password" style="padding:8px;width:70%" required></p>
    <button style="padding:9px 20px">Register</button></form>
  <p style="font-size:13px">Already registered? <a href="/login">Log in</a></p>`;
}
async function handleRegister(req, res) {
  const b = await readBody(req);
  attempt('Registration & Profile');
  const email = String(b.email || '');
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return send(res, 200, page(req, 'Register', '<p style="color:#b00">That email is already registered.</p>' + registerPage(), null));
  }
  const user = { id: nextUserId++, email, password: String(b.password || ''), name: String(b.name || 'New User'), role: 'customer', credit: 0, active: true };
  if (String(b.password || '').length < 4) pass('reg-weak');
  /* VULN (by design): extra posted fields are copied straight onto the record. */
  if (b.role !== undefined) user.role = String(b.role);
  if (b.credit !== undefined) user.credit = parseFloat(b.credit) || 0;
  if (user.role !== 'customer' || user.credit > 0) pass('reg-mass');
  if (xssPat(user.name)) pass('reg-xss');
  users.push(user);
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, user.id);
  return redirect(res, '/', ['hx_session=' + sid + '; Path=/; HttpOnly']);
}
async function handleForgot(req, res) {
  const b = await readBody(req);
  attempt('Login & Authentication');
  const email = String(b.email || '');
  const ip = req.socket.remoteAddress || 'local';
  if (!enumProbes.has(ip)) enumProbes.set(ip, new Set());
  enumProbes.get(ip).add(email.toLowerCase());
  if (enumProbes.get(ip).size >= 5) pass('auth-enum');
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  let msg;
  /* VULN (by design): the response confirms whether the account exists. */
  if (user) { issuedResetTokens.add(resetTokenFor(user)); msg = 'Reset link sent to ' + esc(email) + '.'; }
  else msg = 'No account uses that email address.';
  return send(res, 200, page(req, 'Forgot password', `<h3>Forgot password</h3><p>${msg}</p>
    <form method="POST" action="/forgot"><p><input name="email" type="email" placeholder="Email" style="padding:8px;width:70%"></p>
    <button style="padding:9px 20px">Send reset link</button></form>
    <p style="font-size:13px">Have a token? <a href="/reset">Reset your password</a></p>`, null));
}
async function handleReset(req, res) {
  const b = await readBody(req);
  attempt('Login & Authentication');
  const token = String(b.token || '');
  const user = users.find(u => resetTokenFor(u) === token);
  if (user) {
    /* VULN (by design): the token is a formula of the user id — it works even if never issued. */
    if (!issuedResetTokens.has(token)) pass('auth-reset');
    user.password = String(b.newpassword || 'changed123');
    return send(res, 200, page(req, 'Password reset', '<h3>Password updated</h3><p>You can now <a href="/login">log in</a> with your new password.</p>', null));
  }
  return send(res, 200, page(req, 'Reset password', `<h3>Reset password</h3><p style="color:#b00">That token is not valid.</p>
    <form method="POST" action="/reset"><p><input name="token" placeholder="Reset token" style="padding:8px;width:70%"></p>
    <p><input name="newpassword" type="password" placeholder="New password" style="padding:8px;width:70%"></p>
    <button style="padding:9px 20px">Set new password</button></form>`, null));
}
async function handleProfilePost(req, res, user) {
  const b = await readBody(req);
  attempt('Registration & Profile');
  if (b.name !== undefined) user.name = String(b.name);
  if (b.email !== undefined && String(b.email)) user.email = String(b.email);
  if (xssPat(user.name)) pass('reg-xss');
  /* VULN (by design): the hx_origin marker the forms carry is never verified. */
  if (b.hx_origin !== '1') pass('reg-csrf');
  return redirect(res, '/profile');
}

/* ============================ Routes: parcels & tracking ============================ */
function parcelForm() {
  return `<h3>Send a parcel</h3>
  <form method="POST" action="/parcels">
    <p><input name="recipient" placeholder="Recipient name" style="padding:8px;width:70%" required></p>
    <p><input name="address" placeholder="Delivery address" style="padding:8px;width:70%" required></p>
    <p>Weight (kg): <input name="weight" type="number" step="0.1" value="1" style="padding:8px;width:120px" required>
    Service: <select name="service" style="padding:8px"><option value="standard">Standard — $4 + $1.50/kg</option><option value="express">Express — $9 + $3.00/kg</option></select></p>
    <p>Price ($): <input name="price" type="number" step="0.01" value="5.50" style="padding:8px;width:120px" required>
    <span style="font-size:12px;color:#666">(calculated for you — 1 kg standard shown)</span></p>
    <button style="padding:9px 20px">Create parcel &amp; label</button></form>`;
}
async function handleCreateParcel(req, res, user) {
  const b = await readBody(req);
  attempt('Parcels & Pricing');
  const weight = parseFloat(b.weight), service = String(b.service || 'standard'), price = parseFloat(b.price);
  const parcel = { id: nextParcelId++, tracking: 'SHP' + (nextTracking++), owner: user.id, sender: user.name,
    recipient: String(b.recipient || 'Recipient'), address: String(b.address || ''), weight, service,
    price, status: 'Created', events: [{ status: 'Created', note: 'Label created', at: new Date().toISOString().slice(0, 16).replace('T', ' '), by: 'system' }] };
  parcels.push(parcel);
  invoices.push({ id: nextInvoiceId++, owner: user.id, parcelId: parcel.id, total: price, status: 'Unpaid', paidAmount: 0 });
  /* VULN (by design): the client-posted price is trusted; the server never re-prices. */
  if (weight <= 0 || price < 0) pass('parcel-negative');
  else if (price < priceTruth(weight, service)) {
    if (service === 'express' && price <= priceTruth(weight, 'standard')) pass('parcel-service');
    else pass('parcel-weight');
  }
  return redirect(res, '/parcels');
}
function parcelRow(p) {
  return `<tr><td>${esc(p.tracking)}</td><td>${esc(p.recipient)}</td><td>${esc(p.address)}</td><td>${p.weight} kg</td><td>${esc(p.service)}</td><td>$${Number(p.price).toFixed(2)}</td><td>${esc(p.status)}</td>
  <td><a href="/track?tid=${esc(p.tracking)}">Track</a> · <a href="/parcels/${p.id}/label">Label</a></td></tr>`;
}
async function handleTrack(req, res, user, url) {
  attempt('Tracking & Delivery');
  const tid = url.searchParams.get('tid') || '';
  const id = url.searchParams.get('id') || '';
  const p = parcels.find(x => x.tracking === tid) || parcelById(id);
  if (!p) return send(res, 404, page(req, 'Track', '<h3>Track a parcel</h3><p>No parcel found for that tracking number.</p><form method="GET" action="/track"><input name="tid" placeholder="Tracking number e.g. SHP1001" style="padding:8px;width:60%"><button style="padding:8px 16px">Track</button></form>', user));
  /* VULN (by design): tracking shows the full journey + address to any logged-in user. */
  if (user && p.owner !== user.id) pass('track-idor');
  const events = p.events.map(e => `<li><b>${esc(e.status)}</b> — ${esc(e.note)} <span style="color:#777">(${esc(e.at)})</span></li>`).join('');
  return send(res, 200, page(req, 'Tracking ' + p.tracking, `<h3>Tracking ${esc(p.tracking)}</h3>
    <p>Status: <b>${esc(p.status)}</b><br>From: ${esc(p.sender)}<br>To: <b>${esc(p.recipient)}</b>, ${esc(p.address)}<br>Weight: ${p.weight} kg · Service: ${esc(p.service)}</p>
    <ul>${events}</ul>
    <form method="GET" action="/track"><input name="tid" placeholder="Tracking number" style="padding:8px;width:50%"><button style="padding:8px 16px">Track another</button></form>`, user));
}
async function handleAddEvent(req, res, user, parcelId) {
  const b = await readBody(req);
  attempt('Tracking & Delivery');
  const p = parcelById(parcelId);
  if (!p) return send(res, 404, page(req, 'Not found', '<h3>Parcel not found.</h3>', user));
  const status = String(b.status || 'In transit');
  p.events.push({ status, note: String(b.note || 'Status update'), at: new Date().toISOString().slice(0, 16).replace('T', ' '), by: user.role });
  p.status = status;
  /* VULN (by design): courier-staff endpoint, but no staff role is checked. */
  if (user.role === 'customer') pass('track-forge');
  return redirect(res, '/track?tid=' + p.tracking);
}
async function handleChangeAddress(req, res, user, parcelId) {
  const b = await readBody(req);
  attempt('Tracking & Delivery');
  const p = parcelById(parcelId);
  if (!p) return send(res, 404, page(req, 'Not found', '<h3>Parcel not found.</h3>', user));
  if (p.owner !== user.id) return send(res, 403, page(req, 'Forbidden', '<h3>That parcel is not yours.</h3>', user));
  const newAddr = String(b.address || '');
  /* VULN (by design): the destination lock after dispatch is never enforced. */
  if (newAddr && newAddr !== p.address && ['In transit', 'Out for delivery', 'Delivered'].includes(p.status)) pass('track-address');
  if (newAddr) p.address = newAddr;
  return redirect(res, '/track?tid=' + p.tracking);
}

/* ============================ Routes: labels, invoices, addresses, search ============================ */
async function handleLabel(req, res, user, parcelId) {
  attempt('Labels & Invoices');
  const p = parcelById(parcelId);
  if (!p) return send(res, 404, page(req, 'Not found', '<h3>Parcel not found.</h3>', user));
  /* VULN (by design): labels are served without an ownership check. */
  if (p.owner !== user.id) pass('label-idor');
  return send(res, 200, page(req, 'Label ' + p.tracking, `<h3>Shipping label</h3>
    <div style="border:2px dashed #888;border-radius:8px;padding:16px;max-width:420px">
      <img src="/logo.png" style="height:30px"><p style="font-size:20px;margin:6px 0"><b>${esc(p.tracking)}</b></p>
      <p>FROM: <b>${esc(p.sender)}</b><br>TO: <b>${esc(p.recipient)}</b><br>${esc(p.address)}<br>
      Weight: ${p.weight} kg · Service: ${esc(p.service)} · Status: ${esc(p.status)}</p></div>
    <p><a href="/parcels">Back to my parcels</a></p>`, user));
}
async function handleInvoiceView(req, res, user, invoiceId) {
  attempt('Labels & Invoices');
  const inv = invoices.find(i => i.id === Number(invoiceId));
  if (!inv) return send(res, 404, page(req, 'Not found', '<h3>Invoice not found.</h3>', user));
  /* VULN (by design): invoices are served without an ownership check. */
  if (inv.owner !== user.id) pass('inv-idor');
  const p = parcelById(inv.parcelId);
  return send(res, 200, page(req, 'Invoice #' + inv.id, `<h3>Invoice #${inv.id}</h3>
    <p>Parcel: ${p ? esc(p.tracking) : '—'} (${p ? esc(p.recipient) : ''}, ${p ? esc(p.address) : ''})<br>
    Total due: <b>$${Number(inv.total).toFixed(2)}</b><br>Status: <b>${esc(inv.status)}</b> · Paid so far: $${Number(inv.paidAmount).toFixed(2)}</p>
    ${inv.status !== 'Paid' ? `<form method="POST" action="/invoices/${inv.id}/pay">
      <input type="hidden" name="hx_origin" value="1">
      <p>Amount ($): <input name="amount" type="number" step="0.01" value="${Number(inv.total).toFixed(2)}" style="padding:8px;width:120px">
      <label><input type="checkbox" name="settle" value="full"> Settle in full</label></p>
      <button style="padding:9px 20px">Pay invoice</button></form>` : '<p>This invoice is settled.</p>'}`, user));
}
async function handleInvoicePay(req, res, user, invoiceId) {
  const b = await readBody(req);
  attempt('Labels & Invoices');
  const inv = invoices.find(i => i.id === Number(invoiceId));
  if (!inv) return send(res, 404, page(req, 'Not found', '<h3>Invoice not found.</h3>', user));
  if (inv.owner !== user.id) return send(res, 403, page(req, 'Forbidden', '<h3>That invoice is not yours.</h3>', user));
  const amount = parseFloat(b.amount) || 0;
  /* VULN (by design): the client-declared settlement flag is trusted over the amount due. */
  if (b.settle === 'full' && amount < inv.total) { inv.status = 'Paid'; inv.paidAmount = amount; pass('inv-tamper'); }
  else { inv.paidAmount += amount; if (inv.paidAmount >= inv.total) inv.status = 'Paid'; }
  return redirect(res, '/invoices/' + inv.id);
}
async function handleAddressEditPost(req, res, user, addressId) {
  const b = await readBody(req);
  attempt('Address Book');
  const a = addresses.find(x => x.id === Number(addressId));
  if (!a) return send(res, 404, page(req, 'Not found', '<h3>Address not found.</h3>', user));
  /* VULN (by design): the edit path never checks that the address belongs to the caller. */
  if (a.owner !== user.id) pass('addr-idor');
  if (b.label !== undefined) a.label = String(b.label);
  if (b.name !== undefined) a.name = String(b.name);
  if (b.address !== undefined) a.address = String(b.address);
  return redirect(res, '/addresses');
}
async function handleSearch(req, res, user, url) {
  attempt('Search');
  const q = url.searchParams.get('q') || '';
  let results = parcels.filter(p => p.owner === user.id && (p.recipient.toLowerCase().includes(q.toLowerCase()) || p.tracking.toLowerCase().includes(q.toLowerCase())));
  /* VULN (by design): the search query is glued into SQL; a tautology dumps every parcel. */
  if (sqliPat(q)) {
    results = parcels.slice();
    if (results.some(p => p.owner !== user.id)) pass('search-sqli');
  }
  /* VULN (by design): the query is reflected into the page unencoded. */
  if (xssPat(q)) pass('search-xss');
  const rows = results.map(parcelRow).join('') || '<tr><td colspan="8">No parcels matched.</td></tr>';
  return send(res, 200, page(req, 'Search', `<h3>Search your parcels</h3>
    <form method="GET" action="/search"><input name="q" value="${esc(q)}" placeholder="Recipient or tracking number" style="padding:8px;width:60%"><button style="padding:8px 16px">Search</button></form>
    <p>Results for: ${q}</p>
    <table border="1" cellpadding="6" style="border-collapse:collapse;font-size:13px"><tr><th>Tracking</th><th>Recipient</th><th>Address</th><th>Weight</th><th>Service</th><th>Price</th><th>Status</th><th></th></tr>${rows}</table>`, user));
}

/* ============================ Routes: staff & admin ============================ */
async function handleStaff(req, res, user) {
  attempt('Staff & Admin Panel');
  /* VULN (by design): the staff console checks only that someone is logged in. */
  const cookies = parseCookies(req);
  if (user.role === 'customer') { if (cookies.hx_role) pass('auth-cookie'); else pass('admin-bac'); }
  const rows = parcels.map(p => { const o = userById(p.owner); return `<tr><td>${esc(p.tracking)}</td><td>${o ? esc(o.email) : ''}</td><td>${esc(p.recipient)}</td><td>${esc(p.status)}</td></tr>`; }).join('');
  const urows = users.map(u => `<tr><td>${u.id}</td><td>${u.name}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td>${u.active ? 'active' : 'deactivated'}</td></tr>`).join('');
  return send(res, 200, page(req, 'Staff Console', `<h3>Staff Console — all shipments</h3>
    <table border="1" cellpadding="6" style="border-collapse:collapse;font-size:13px"><tr><th>Tracking</th><th>Customer</th><th>Recipient</th><th>Status</th></tr>${rows}</table>
    <h4>Customers</h4><table border="1" cellpadding="6" style="border-collapse:collapse;font-size:13px"><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr>${urows}</table>`, user));
}
async function handleAdmin(req, res, user) {
  attempt('Staff & Admin Panel');
  const role = effectiveRole(req, user);
  if (role !== 'admin') return send(res, 403, page(req, 'Forbidden', '<h3>Admins only.</h3>', user));
  /* VULN (by design): admin gating trusts the client-editable hx_role cookie. */
  if (user.role !== 'admin') pass('auth-cookie');
  const urows = users.map(u => `<tr><td>${u.id}</td><td>${u.name}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td>${u.active ? 'active' : 'deactivated'}</td>
    <td>${u.active ? `<form method="POST" action="/admin/users/${u.id}/deactivate" style="margin:0"><input type="hidden" name="hx_origin" value="1"><button>Deactivate</button></form>` : ''}</td></tr>`).join('');
  return send(res, 200, page(req, 'Admin Panel', `<h3>Admin Panel — users</h3>
    <table border="1" cellpadding="6" style="border-collapse:collapse;font-size:13px"><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr>${urows}</table>`, user));
}
async function handleDeactivate(req, res, user, targetId) {
  const b = await readBody(req);
  attempt('Staff & Admin Panel');
  if (effectiveRole(req, user) !== 'admin') return send(res, 403, page(req, 'Forbidden', '<h3>Admins only.</h3>', user));
  /* VULN (by design): the hx_origin marker is carried by the form but never verified. */
  if (b.hx_origin !== '1') pass('admin-csrf');
  const target = userById(targetId);
  if (target) target.active = false;
  return redirect(res, '/admin');
}

/* ============================ Routes: lab system pages ============================ */
function testsPage(req, user) {
  const sections = FEATURES.map(f => {
    const list = TESTS.filter(t => t.feature === f);
    const att = state.attempts[f] || 0;
    const items = list.map(t => {
      const done = !!state.tests[t.id];
      const hints = t.hints.map((h, i) => `<div style="font-size:12px;color:#555;margin:2px 0">Hint ${i + 1}: ${esc(h)}</div>`).join('');
      return `<div style="border:1px solid #e0e0ec;border-radius:8px;padding:10px 12px;margin:8px 0">
        <b>${done ? '✓' : '○'} ${esc(t.name)}</b> <span style="font-size:12px;color:#777">${esc(t.owasp)} · ${esc(t.difficulty)}</span>
        <details style="margin-top:4px"><summary style="font-size:12px;cursor:pointer">Hints</summary>${hints}</details></div>`;
    }).join('');
    return `<h4 style="margin-bottom:2px">${esc(f)} — ${list.filter(t => state.tests[t.id]).length}/${list.length} done · attempts: ${att}</h4>${items}`;
  }).join('');
  return page(req, 'Mission Board', `<h3>Mission Board — LAB ${LAB_NUMBER} ${LAB_NAME}</h3>
    <p style="font-size:13px">Solve tests by actually performing the attack on the live app — there is no "mark done" button. Feature help from the Lab Coach unlocks after 3 genuine attempts on that feature.</p>${sections}`, user);
}
function completePage(req, user) {
  if (!isComplete()) {
    const left = TESTS.filter(t => !state.tests[t.id]);
    return page(req, 'Completion', `<h3>Not complete yet</h3><p>Progress: ${doneCount()}/${TESTS.length} (${Math.floor(doneCount() / TESTS.length * 100)}%). Still open:</p>
      <ul>${left.map(t => `<li>${esc(t.name)} — ${esc(t.feature)}</li>`).join('')}</ul><p><a href="/tests">Back to the Mission Board</a></p>`, user);
  }
  const perFeature = FEATURES.map(f => `<li><b>${esc(f)}</b>: ${TESTS.filter(t => t.feature === f).length} vulnerabilities</li>`).join('');
  const ways = TESTS.map(t => `<li>${esc(t.name)} (${esc(t.owasp)})</li>`).join('');
  const lessons = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('');
  const impacts = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('');
  const reports = TESTS.map(t => `<li><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)}. Remediation: ${esc(t.report.remediation)}</li>`).join('');
  return page(req, 'Lab Complete', `<h3>LAB ${LAB_NUMBER} — ${LAB_NAME} complete!</h3>
    <h4>1 · Total features</h4><p>${FEATURES.length} features: ${FEATURES.map(esc).join(', ')}</p>
    <h4>2 · Vulnerabilities per feature</h4><ul>${perFeature}</ul>
    <h4>3 · Ways testing was done (${TESTS.length} tests)</h4><ul>${ways}</ul>
    <h4>4 · What you learned</h4><ul>${lessons}</ul>
    <h4>5 · What this means for a real client</h4><ul>${impacts}</ul>
    <h4>6 · Writing it in a real report</h4><ul>${reports}</ul>
    <div style="background:#eef7ee;border:1px solid #9c9;border-radius:8px;padding:14px;margin:14px 0">
      <b>Your completion key for the next lab:</b><br><code style="font-size:17px">${completionKey()}</code></div>
    <form method="POST" action="/complete"><p>Your name for the certificate:
      <input name="testerName" value="${esc(state.testerName)}" style="padding:8px;width:50%">
      <button style="padding:8px 16px">Save name</button></p></form>
    <p><a href="/certificate"><b>View your certificate</b></a></p>`, user);
}
function certificatePage(req, user) {
  const name = state.testerName || (user ? user.name : 'HexaShip Tester');
  const date = state.completedAt ? state.completedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER} ${LAB_NAME}</title>
  <style>@media print{body{background:#fff}}</style></head>
  <body style="margin:0;background:#14141d;font-family:Georgia,serif">
  <div style="max-width:720px;margin:50px auto;background:#fff;border:3px solid #7c5cff;border-radius:14px;padding:40px;text-align:center">
    <img src="/logo.png" style="height:64px">
    <h1 style="margin:14px 0 4px">Certificate of Completion</h1>
    <p style="color:#555">This certifies that</p>
    <h2 style="margin:6px 0">${esc(name)}</h2>
    <p>has completed 100% of the security tests in<br><b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b><br>(${TESTS.length} tests across ${FEATURES.length} features)</p>
    <p style="color:#555">Completed on ${esc(date)}</p>
    <hr style="border:0;border-top:1px solid #ddd;margin:22px 0">
    <p style="font-size:14px"><b>HexaCyberLab</b> — Built by Md. Jony Hassain, Founder</p>
  </div></body></html>`;
}

/* ============================ Router ============================ */
const server = http.createServer(async (req, res) => {
  req.__res = res;
  try {
    const url = new URL(req.url, 'http://127.0.0.1:' + PORT);
    const p = url.pathname;
    if (p === '/logo.png') {
      try { const img = fs.readFileSync(LOGO_FILE); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(img); }
      catch (e) { res.writeHead(404); return res.end('no logo'); }
    }
    if (p === '/unlock' && req.method === 'POST') {
      const b = await readBody(req);
      if (String(b.key || '') === entryKey()) { state.unlocked = true; saveState(); return redirect(res, '/'); }
      res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(gatePage().replace('</form>', '</form><p style="color:#b00">That key was not accepted.</p>'));
    }
    if (p === '/api/chat' && req.method === 'POST') {
      const b = await readBody(req);
      const reply = b && b.__malformed ? 'I could not read that message — please send plain text and try again.' : chatReply(b && b.message);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ reply }));
    }
    if (!state.unlocked) { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(gatePage()); }

    const user = currentUser(req);
    const needLogin = () => redirect(res, '/login');

    if (p === '/login') { if (req.method === 'POST') return handleLogin(req, res); return send(res, 200, page(req, 'Log in', loginPage(''), user)); }
    if (p === '/logout') { const sid = parseCookies(req).hx_session; if (sid) sessions.delete(sid); return redirect(res, '/login', ['hx_session=; Path=/; Max-Age=0']); }
    if (p === '/register') { if (req.method === 'POST') return handleRegister(req, res); return send(res, 200, page(req, 'Register', registerPage(), user)); }
    if (p === '/forgot') {
      if (req.method === 'POST') return handleForgot(req, res);
      return send(res, 200, page(req, 'Forgot password', `<h3>Forgot password</h3>
        <form method="POST" action="/forgot"><p><input name="email" type="email" placeholder="Email" style="padding:8px;width:70%"></p>
        <button style="padding:9px 20px">Send reset link</button></form>
        <p style="font-size:13px">Have a token? <a href="/reset">Reset your password</a></p>`, user));
    }
    if (p === '/reset') {
      if (req.method === 'POST') return handleReset(req, res);
      return send(res, 200, page(req, 'Reset password', `<h3>Reset password</h3>
        <form method="POST" action="/reset"><p><input name="token" placeholder="Reset token" style="padding:8px;width:70%"></p>
        <p><input name="newpassword" type="password" placeholder="New password" style="padding:8px;width:70%"></p>
        <button style="padding:9px 20px">Set new password</button></form>`, user));
    }
    if (p === '/tests') return send(res, 200, testsPage(req, user));
    if (p === '/api/progress') {
      const features = {};
      for (const f of FEATURES) features[f] = { total: TESTS.filter(t => t.feature === f).length, done: TESTS.filter(t => t.feature === f && state.tests[t.id]).length, attempts: state.attempts[f] || 0 };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done: doneCount(), pct: Math.floor(doneCount() / TESTS.length * 100), features, complete: isComplete() }, null, 2));
    }
    if (p === '/api/debug') {
      attempt('Platform & API');
      pass('api-debug');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ debug: true, users, parcels, invoices }, null, 2));
    }
    if (p === '/api/parcels') {
      attempt('Platform & API');
      if (user) { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(parcels.filter(x => x.owner === user.id))); }
      const key = req.headers['x-api-key'] || '';
      /* VULN (by design): the API key is just shp_ + base64(email) — forgeable by anyone. */
      const owner = users.find(u => key === 'shp_' + Buffer.from(u.email).toString('base64'));
      if (owner) { pass('api-token'); res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(parcels.filter(x => x.owner === owner.id))); }
      res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'invalid api key' }));
    }
    if (p === '/api/me') {
      if (!user) { res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'not logged in' })); }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ id: user.id, email: user.email, name: user.name, role: user.role, credit: user.credit, active: user.active }));
    }
    if (p === '/complete') {
      if (req.method === 'POST') { const b = await readBody(req); if (b.testerName !== undefined) { state.testerName = String(b.testerName).slice(0, 80); saveState(); } return redirect(res, '/complete'); }
      return send(res, 200, completePage(req, user));
    }
    if (p === '/certificate') {
      if (!isComplete()) return redirect(res, '/complete');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(certificatePage(req, user));
    }

    if (!user) return needLogin();
    if (p === '/') {
      const mine = parcels.filter(x => x.owner === user.id);
      const due = invoices.filter(i => i.owner === user.id && i.status !== 'Paid');
      /* NOTE: the greeting renders the stored name raw — the stored-XSS flaw lives here and in /staff. */
      return send(res, 200, page(req, 'Dashboard', `<h3>Welcome, ${user.name}</h3>
        <p>Role: <b>${esc(user.role)}</b> · Credit balance: <b>$${Number(user.credit).toFixed(2)}</b></p>
        <p>You have <b>${mine.length}</b> parcel(s) and <b>${due.length}</b> unpaid invoice(s).</p>
        <p><a href="/parcels/new">Send a new parcel</a> · <a href="/track">Track a parcel</a> · <a href="/tests">Open the Mission Board</a></p>`, user));
    }
    if (p === '/profile') {
      if (req.method === 'POST') return handleProfilePost(req, res, user);
      return send(res, 200, page(req, 'Profile', `<h3>Your profile</h3>
        <form method="POST" action="/profile"><input type="hidden" name="hx_origin" value="1">
          <p>Name: <input name="name" value="${esc(user.name)}" style="padding:8px;width:60%"></p>
          <p>Email: <input name="email" value="${esc(user.email)}" style="padding:8px;width:60%"></p>
          <button style="padding:9px 20px">Save changes</button></form>`, user));
    }
    if (p === '/parcels' && req.method === 'POST') return handleCreateParcel(req, res, user);
    if (p === '/parcels') {
      const mine = user.role === 'customer' ? parcels.filter(x => x.owner === user.id) : parcels;
      const rows = mine.map(parcelRow).join('') || '<tr><td colspan="8">No parcels yet.</td></tr>';
      return send(res, 200, page(req, 'My Parcels', `<h3>Parcels</h3>
        <table border="1" cellpadding="6" style="border-collapse:collapse;font-size:13px"><tr><th>Tracking</th><th>Recipient</th><th>Address</th><th>Weight</th><th>Service</th><th>Price</th><th>Status</th><th></th></tr>${rows}</table>`, user));
    }
    if (p === '/parcels/new') return send(res, 200, page(req, 'Send a Parcel', parcelForm(), user));
    let m;
    if ((m = p.match(/^\/parcels\/(\d+)\/label$/)) && req.method === 'GET') return handleLabel(req, res, user, m[1]);
    if ((m = p.match(/^\/parcels\/(\d+)\/events$/)) && req.method === 'POST') return handleAddEvent(req, res, user, m[1]);
    if ((m = p.match(/^\/parcels\/(\d+)\/address$/)) && req.method === 'POST') return handleChangeAddress(req, res, user, m[1]);
    if (p === '/track') return handleTrack(req, res, user, url);
    if (p === '/invoices') {
      const mine = invoices.filter(i => i.owner === user.id);
      const rows = mine.map(i => `<tr><td>#${i.id}</td><td>${esc((parcelById(i.parcelId) || {}).tracking || '')}</td><td>$${Number(i.total).toFixed(2)}</td><td>${esc(i.status)}</td><td><a href="/invoices/${i.id}">View / Pay</a></td></tr>`).join('') || '<tr><td colspan="5">No invoices.</td></tr>';
      return send(res, 200, page(req, 'Invoices', `<h3>Your invoices</h3>
        <table border="1" cellpadding="6" style="border-collapse:collapse;font-size:13px"><tr><th>Invoice</th><th>Parcel</th><th>Total</th><th>Status</th><th></th></tr>${rows}</table>`, user));
    }
    if ((m = p.match(/^\/invoices\/(\d+)$/)) && req.method === 'GET') return handleInvoiceView(req, res, user, m[1]);
    if ((m = p.match(/^\/invoices\/(\d+)\/pay$/)) && req.method === 'POST') return handleInvoicePay(req, res, user, m[1]);
    if (p === '/addresses') {
      if (req.method === 'POST') {
        const b = await readBody(req);
        attempt('Address Book');
        addresses.push({ id: nextAddressId++, owner: user.id, label: String(b.label || 'Address'), name: String(b.name || user.name), address: String(b.address || '') });
        return redirect(res, '/addresses');
      }
      attempt('Address Book');
      const mine = addresses.filter(a => a.owner === user.id);
      const rows = mine.map(a => `<tr><td>${esc(a.label)}</td><td>${esc(a.name)}</td><td>${esc(a.address)}</td><td><a href="/addresses/${a.id}/edit">Edit</a></td></tr>`).join('') || '<tr><td colspan="4">No saved addresses.</td></tr>';
      return send(res, 200, page(req, 'Address Book', `<h3>Address book</h3>
        <table border="1" cellpadding="6" style="border-collapse:collapse;font-size:13px"><tr><th>Label</th><th>Name</th><th>Address</th><th></th></tr>${rows}</table>
        <h4>Add an address</h4><form method="POST" action="/addresses">
          <p><input name="label" placeholder="Label (Home, Office…)" style="padding:8px;width:50%"></p>
          <p><input name="name" placeholder="Recipient name" style="padding:8px;width:50%"></p>
          <p><input name="address" placeholder="Full address" style="padding:8px;width:70%"></p>
          <button style="padding:9px 20px">Save address</button></form>`, user));
    }
    if ((m = p.match(/^\/addresses\/(\d+)\/edit$/))) {
      const a = addresses.find(x => x.id === Number(m[1]));
      if (!a) return send(res, 404, page(req, 'Not found', '<h3>Address not found.</h3>', user));
      if (req.method === 'POST') return handleAddressEditPost(req, res, user, m[1]);
      attempt('Address Book');
      if (a.owner !== user.id) pass('addr-idor');
      return send(res, 200, page(req, 'Edit Address', `<h3>Edit address</h3>
        <form method="POST" action="/addresses/${a.id}/edit">
          <p>Label: <input name="label" value="${esc(a.label)}" style="padding:8px;width:50%"></p>
          <p>Name: <input name="name" value="${esc(a.name)}" style="padding:8px;width:50%"></p>
          <p>Address: <input name="address" value="${esc(a.address)}" style="padding:8px;width:70%"></p>
          <button style="padding:9px 20px">Save changes</button></form>`, user));
    }
    if (p === '/search') return handleSearch(req, res, user, url);
    if (p === '/staff') return handleStaff(req, res, user);
    if (p === '/admin') return handleAdmin(req, res, user);
    if ((m = p.match(/^\/admin\/users\/(\d+)\/deactivate$/)) && req.method === 'POST') return handleDeactivate(req, res, user, m[1]);

    return send(res, 404, page(req, 'Not found', '<h3>404 — page not found.</h3>', user));
  } catch (e) {
    try { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('Internal error — the lab is still running.'); } catch (e2) { /* socket gone */ }
  }
});

/* ============================ Doc generation (from the registry) ============================ */
function genDocs() {
  const byFeature = FEATURES.map(f => ({ f, list: TESTS.filter(t => t.feature === f) }));
  const vuln = ['# HexaShip — Vulnerability Map (LAB 76)', '',
    'Every scored test in the lab, grouped by feature. Each entry is a real, working flaw in the app, detectable server-side only when the exploit actually succeeds.', '',
    '**Total: ' + TESTS.length + ' tests across ' + FEATURES.length + ' features.**', '']
    .concat(byFeature.flatMap(({ f, list }) => ['## ' + f, ''].concat(list.flatMap(t => [
      '### ' + t.name, '- OWASP: ' + t.owasp + ' · Difficulty: ' + t.difficulty + ' · Severity (report): ' + t.report.severity,
      '- Exploitation outline: ' + t.hints[2], '- Impact: ' + t.impact, ''])))).join('\n');
  const guide = ['# HexaShip — Practice Guide (LAB 76)', '',
    'Challenges grouped by feature, then difficulty. Each challenge mirrors the Mission Board at /tests. Hints are graded: 1 = nudge, 2 = stronger, 3 = near-answer. A challenge is complete only when the exploit really works against the app.', '']
    .concat(byFeature.flatMap(({ f, list }) => ['## ' + f, ''].concat(list
      .slice().sort((a, b) => a.difficulty.localeCompare(b.difficulty))
      .flatMap(t => ['### ' + t.name + ' (' + t.difficulty + ')', '- Objective: perform the attack so its real effect happens in the app (the Mission Board flips to done automatically).',
        '- Hint 1: ' + t.hints[0], '- Hint 2: ' + t.hints[1], '- Hint 3: ' + t.hints[2], ''])))).join('\n');
  const fix = ['# HexaShip — Fix & Retest Guide (LAB 76)', '',
    'For every test: the secure implementation and the regression check that proves the fix.', '']
    .concat(byFeature.flatMap(({ f, list }) => ['## ' + f, ''].concat(list.flatMap(t => [
      '### ' + t.report.title, '- Severity: ' + t.report.severity, '- Fix: ' + t.report.remediation,
      '- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session, no data, no state change), while the normal user flow still works.', ''])))).join('\n');
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'), vuln);
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'), guide);
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'), fix);
  console.log('docs generated: ' + TESTS.length + ' tests, ' + FEATURES.length + ' features');
}

if (process.argv.includes('--gen-docs')) { genDocs(); process.exit(0); }
server.listen(PORT, '127.0.0.1', () => { console.log('LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ' listening on http://127.0.0.1:' + PORT); });
