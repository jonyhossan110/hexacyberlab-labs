'use strict';
/*
 * HexaRentals — LAB 92 (Category 10: Property, Jobs & Professional Services)
 * A deliberately vulnerable rental property management platform for
 * authorised, local-only security training. Zero-dependency Node.js.
 * WARNING: intentional vulnerabilities throughout. Never deploy publicly.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB_NUMBER = 92;
const LAB_NAME = 'HexaRentals';
const PORT = 3101;
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const LOGO_FILE = path.join(DIR, 'logo.png');

/* ------------------------------------------------------------------ *
 * Site configuration block (presentation/theme values for the app).  *
 * ------------------------------------------------------------------ */
const SITE = {
  tagline: 'Rental property management — landlords, tenants, leases & rent.',
  currency: 'USD',
  theme: { accent: '#2b6cb0', panel: '#ffffff', page: '#f4f6f8' },
  motd: 'Welcome to HexaRentals. Manage units, leases, rent and repairs in one place.',
  buildTag: ["TC1YSA==","LTI5","Tk5PRA==","Vkw4"],
  supportEmail: 'support@hexarentals.local'
};

/* ------------------------------------------------------------------ *
 * Progress state (persisted to progress.json; survives restarts).    *
 * ------------------------------------------------------------------ */
let state = {
  unlocked: false,
  testerName: '',
  tests: {},
  attempts: {},
  completedAt: null,
  keyRevealed: false
};
function loadState() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      state = Object.assign(state, raw);
    }
  } catch (e) { /* corrupted state file -> start fresh, never crash */ }
}
function saveState() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2)); } catch (e) {}
}
loadState();

function pass(testId) {
  if (!state.tests[testId]) {
    state.tests[testId] = true;
    if (doneCount() === TESTS.length && !state.completedAt) {
      state.completedAt = new Date().toISOString();
      state.keyRevealed = true;
    }
    saveState();
  }
}
function attempt(feature) {
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  saveState();
}
function doneCount() { return TESTS.filter(t => state.tests[t.id]).length; }
function pct() { return Math.floor((doneCount() / TESTS.length) * 100); }
function isComplete() { return doneCount() === TESTS.length; }

/* ------------------------------------------------------------------ *
 * Seed data — all fake, in-memory only. Passwords are stored in      *
 * plain text ON PURPOSE: this is a training lab, not a real service. *
 * ------------------------------------------------------------------ */
const users = [
  { id: 1, email: 'admin@hexarentals.local', password: 'admin123', role: 'admin',    name: 'Ada Admin',      balance: 0 },
  { id: 2, email: 'larry@hexarentals.local', password: 'larry123', role: 'landlord', name: 'Larry Landlord', balance: 1200 },
  { id: 3, email: 'laura@hexarentals.local', password: 'laura123', role: 'landlord', name: 'Laura Landlord', balance: 800 },
  { id: 4, email: 'alice@test.local',        password: 'alice123', role: 'tenant',   name: 'Alice Tenant',   balance: 300 },
  { id: 5, email: 'bob@test.local',          password: 'bob123',   role: 'tenant',   name: 'Bob Tenant',     balance: 150 },
  { id: 6, email: 'carol@test.local',        password: 'carol123', role: 'tenant',   name: 'Carol Tenant',   balance: 90 }
];
let nextUserId = 7;

const properties = [
  { id: 1, title: 'Sunny 2BR Apartment in Dhanmondi', city: 'Dhaka',      rent: 1200, landlordId: 2, listed: true },
  { id: 2, title: 'Cozy Studio near the Lake',        city: 'Dhaka',      rent: 800,  landlordId: 3, listed: true },
  { id: 3, title: 'Family House with Garden',         city: 'Chattogram', rent: 1500, landlordId: 2, listed: true },
  { id: 4, title: 'Unlisted Luxury Penthouse (Internal)', city: 'Dhaka',  rent: 5000, landlordId: 2, listed: false }
];

const units = [
  { id: 1, propertyId: 1, unit: '1A', tenantId: 4, leaseId: 1 },
  { id: 2, propertyId: 2, unit: '2B', tenantId: 5, leaseId: 2 },
  { id: 3, propertyId: 1, unit: '1B', tenantId: 6, leaseId: 3 }
];

const leases = [
  { id: 1, propertyId: 1, unitId: 1, tenantId: 4, landlordId: 2, rent: 1200, start: '2026-01-01', end: '2026-12-31', status: 'active',  signedByTenant: true,  signedByLandlord: true,  paid: false },
  { id: 2, propertyId: 2, unitId: 2, tenantId: 5, landlordId: 3, rent: 800,  start: '2026-02-01', end: '2027-01-31', status: 'active',  signedByTenant: true,  signedByLandlord: true,  paid: false },
  { id: 3, propertyId: 1, unitId: 3, tenantId: 6, landlordId: 2, rent: 950,  start: '2026-03-01', end: '2027-02-28', status: 'pending', signedByTenant: false, signedByLandlord: false, paid: false }
];

const payments = [
  { id: 1, leaseId: 1, tenantId: 4, amount: 1200, status: 'paid', date: '2026-10-05' },
  { id: 2, leaseId: 2, tenantId: 5, amount: 800,  status: 'paid', date: '2026-10-06' }
];
let nextPaymentId = 3;

const deposits = [
  { id: 1, leaseId: 1, tenantId: 4, landlordId: 2, amount: 1200, status: 'held', refundedAmount: 0, refundedBy: null },
  { id: 2, leaseId: 2, tenantId: 5, landlordId: 3, amount: 800,  status: 'held', refundedAmount: 0, refundedBy: null }
];

const maintenanceRequests = [
  { id: 1, unitId: 1, tenantId: 4, landlordId: 2, title: 'Leaky faucet',  desc: 'Kitchen tap drips all night.', status: 'open' },
  { id: 2, unitId: 2, tenantId: 5, landlordId: 3, title: 'Broken heater', desc: 'No heating since Monday.',     status: 'open' }
];
let nextMaintId = 3;

const sessions = new Map();       // sid -> { uid }
const failedLogins = {};          // email -> consecutive failure count
const loginEnumProbes = new Set();   // distinct emails tried at login (short window)
const forgotEnumProbes = new Set();  // distinct emails tried at forgot-password
let enumWindowStart = Date.now();
const requestedResets = new Set();   // emails that genuinely requested a reset
const resetTokens = {};              // email -> token (predictable, see resetTokenFor)

function resetTokenFor(user) { return 'RT' + user.id + '-' + (user.id * 137 + 42); }
function userById(id) { return users.find(u => u.id === Number(id)); }
function userByEmail(email) { return users.find(u => u.email === String(email || '').toLowerCase()); }

/* ------------------------------------------------------------------ *
 * TESTS registry — the heart of the lab system. One entry per scored *
 * vulnerability test. Docs are generated from this array, and each   *
 * test flips ONLY when the server observes the real exploit effect.  *
 * ------------------------------------------------------------------ */
const TESTS = [
  /* ---------------- Login & Authentication (6) ---------------- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner', where: 'POST /login',
    hints: ['The login form builds its database query by gluing your input straight into the SQL string.', 'Try a classic tautology in the email field, e.g. something that makes the WHERE clause always true.', "Use admin@hexarentals.local' OR '1'='1' -- as the email and any password — the query comments out the password check."],
    lesson: 'String-built SQL queries let an attacker rewrite the login logic itself; the database cannot tell data from instructions.',
    impact: 'On a real rental platform this means instant takeover of the admin account — every lease, tenant record and bank detail exposed in one request.',
    report: { title: 'SQL Injection in Login Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements for all database access and never concatenate user input into SQL.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limiting or Lockout', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner', where: 'POST /login',
    hints: ['Nothing slows you down here — no CAPTCHA, no lockout, no delay.', 'Write down one real account email and just keep guessing passwords.', 'Send 10+ wrong passwords for alice@test.local in a row; the 10th is still processed normally.'],
    lesson: 'Without throttling, an online password guesser gets unlimited tries; weak human passwords fall quickly.',
    impact: 'Attackers can grind through common passwords against landlord accounts and walk away with rent payments and tenant personal data.',
    report: { title: 'Missing Brute-Force Protection on Login', severity: 'High', remediation: 'Add per-account and per-IP rate limiting, exponential backoff and lockout/alerting after repeated failures.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User Enumeration via Login & Forgot-Password Responses', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner', where: 'POST /login, POST /forgot',
    hints: ['Compare the error message for an email that exists with one that does not.', 'The forgot-password form is even more talkative than the login form.', 'Probe at least 5 different emails across login/forgot and note which ones say "No account" vs "Wrong password" / "Reset link sent".'],
    lesson: 'Different responses for "no such user" and "wrong password" hand attackers a free list of valid accounts to target.',
    impact: 'A scammer can harvest which landlords and tenants use the platform, then aim phishing and credential-stuffing precisely at them.',
    report: { title: 'Account Enumeration Through Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message for all authentication failures and forgot-password requests, regardless of account existence.' } },
  { id: 'auth-demo', feature: 'Login & Authentication', name: 'Published Demo / Default Credentials', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner', where: 'POST /login',
    hints: ['The login page itself tells you working usernames and passwords.', 'Scroll the login page — demo accounts are printed right on it.', 'Log in with the published admin demo account exactly as shown on the login page.'],
    lesson: 'Demo and default credentials that reach production are the first thing every scanner and attacker tries.',
    impact: 'Anyone on the internet could sign in as the platform admin using credentials the site itself advertises — total compromise, zero skill required.',
    report: { title: 'Default / Demo Credentials Active on Production Login', severity: 'Critical', remediation: 'Remove all demo accounts from production, force unique strong passwords, and rotate any credential that was ever published.' } },
  { id: 'auth-reset-token', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate', where: 'POST /reset',
    hints: ['Reset tokens here are not random — they are computed from something you already know about the account.', 'Request a reset for your own account and study the token pattern in the token formula the lab uses.', "Tokens look like RT<userId>-<userId*137+42>. Compute Bob's (id 5) token yourself and POST /reset for bob@test.local WITHOUT ever requesting a reset for him."],
    lesson: 'A reset token derived from public data (the user id) is not a secret at all — anyone can mint one for any account.',
    impact: 'An attacker can reset the password of any landlord and divert incoming rent to themselves, with no access to the victim\u2019s inbox.',
    report: { title: 'Password Reset Tokens Are Predictable', severity: 'High', remediation: 'Generate reset tokens from a CSPRNG (at least 128 bits), store only a hash, expire them quickly and make them single-use.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Role Cookie Tampering (hx_role)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate', where: 'GET /admin with forged cookie',
    hints: ['After login, look at the cookies the app sets — one of them carries your role.', 'The server trusts that cookie instead of checking the account\u2019s real role.', 'As a tenant, set the hx_role cookie to admin and visit /admin.'],
    lesson: 'Authorisation data stored on the client is attacker-controlled; roles must be read from server-side session state.',
    impact: 'Any tenant could promote themselves to admin in their browser and read every user\u2019s password and lease on the platform.',
    report: { title: 'Privilege Escalation via Client-Controlled Role Cookie', severity: 'High', remediation: 'Keep roles exclusively in server-side session data and ignore any role information supplied by the client.' } },

  /* ---------------- Registration & Profile (4) ---------------- */
  { id: 'reg-weakpw', feature: 'Registration & Profile', name: 'Weak Password Policy (1-Character Passwords)', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner', where: 'POST /register',
    hints: ['Try registering with the shortest password you can think of.', 'There is no minimum length or complexity check at all.', 'Register a new account with the password "x" — it is accepted.'],
    lesson: 'If the server accepts trivial passwords, credential security depends entirely on user discipline — which always fails somewhere.',
    impact: 'Tenants who pick one-character passwords can be guessed in seconds, exposing their lease, address and payment history.',
    report: { title: 'No Minimum Password Strength Enforced at Registration', severity: 'Medium', remediation: 'Enforce a minimum length (12+ characters) and screen new passwords against known-breached password lists.' } },
  { id: 'reg-massassign', feature: 'Registration & Profile', name: 'Mass Assignment — Role & Balance at Registration', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate', where: 'POST /register',
    hints: ['The registration handler copies more of your form than the visible fields.', 'What fields does a user record have? role, balance... What if you submit them yourself?', 'POST /register with extra fields role=admin (or balance=99999) alongside the normal fields.'],
    lesson: 'Binding request data directly onto model objects lets attackers set fields that were never offered in the UI.',
    impact: 'A stranger can register as an admin or with a huge wallet balance, then approve their own tenancy and drain deposit refunds.',
    report: { title: 'Mass Assignment Allows Setting Role and Balance at Registration', severity: 'High', remediation: 'Allow-list exactly the fields a request may set and assign roles/balances only through privileged server-side logic.' } },
  { id: 'reg-storedxss', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03:2021 Injection', difficulty: 'Beginner', where: 'POST /register or POST /profile, viewed on /tenants',
    hints: ['Names are rendered back to other users without encoding.', 'Put an HTML payload where your name goes and find a page where staff see it.', 'Register (or update your profile) with the name <script>alert(1)</script> — it is stored and served raw on the tenant directory.'],
    lesson: 'Any user-controlled string that is stored and later rendered unescaped becomes script execution in other users\u2019 browsers.',
    impact: 'A malicious tenant name could run script in a landlord\u2019s browser, stealing their session and hijacking rent and deposit actions.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Contextually output-encode all user data on render and add a restrictive Content-Security-Policy.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate', where: 'POST /profile',
    hints: ['State-changing forms here carry no anti-CSRF token; the app only sets a casual origin marker cookie on its own pages.', 'A POST that arrives WITHOUT the hx_origin marker cookie is treated exactly like a genuine one.', 'While logged in, POST /profile with a new name and no hx_origin cookie (e.g. curl with only the sid cookie) — the change is accepted.'],
    lesson: 'Cookies ride along on cross-site requests automatically; without a token or marker check, any website can act as the victim.',
    impact: 'A landlord visiting a malicious page could have their profile and payout details silently changed by a forged request.',
    report: { title: 'Cross-Site Request Forgery on Profile Update', severity: 'Medium', remediation: 'Require a per-session anti-CSRF token on all state-changing requests and set SameSite=Lax/Strict on session cookies.' } },

  /* ---------------- Properties & Search (2) ---------------- */
  { id: 'prop-sqli', feature: 'Properties & Search', name: 'SQL Injection in Property Search (Unlisted Listing Leak)', owasp: 'A03:2021 Injection', difficulty: 'Intermediate', where: 'GET /search?q=',
    hints: ['The search box feeds a string-built LIKE query, just like the login form.', 'A tautology here does not log you in — it changes WHICH rows come back.', "Search for: ' OR '1'='1 — every property comes back, including the unlisted penthouse that normal search hides."],
    lesson: 'Injection is not only an authentication problem; in search it becomes a data-exfiltration channel for rows that were never meant to be public.',
    impact: 'Unlisted and internal properties — addresses, rents, ownership — leak to anyone, enabling burglary targeting and competitor snooping.',
    report: { title: 'SQL Injection in Property Search Exposes Unlisted Listings', severity: 'High', remediation: 'Parameterise search queries and enforce listing visibility in the query itself, not by filtering results afterwards.' } },
  { id: 'prop-xss', feature: 'Properties & Search', name: 'Reflected XSS in Search', owasp: 'A03:2021 Injection', difficulty: 'Beginner', where: 'GET /search?q=',
    hints: ['Your search text is echoed into the results heading.', 'Try searching for an HTML tag and view the page source.', 'Search for <script>alert(1)</script> — the payload is reflected into the page unescaped.'],
    lesson: 'Echoing request parameters into HTML without encoding turns a harmless-looking search link into a script-delivery vehicle.',
    impact: 'Attackers can send landlords crafted search links that execute script in their browser and steal the session.',
    report: { title: 'Reflected Cross-Site Scripting in Property Search', severity: 'Medium', remediation: 'Output-encode all reflected request data and validate search input against an allow-list where possible.' } },

  /* ---------------- Units & Leases (5) ---------------- */
  { id: 'lease-unit-idor', feature: 'Units & Leases', name: 'Unit IDOR — Another Tenant\u2019s Unit & Lease Details', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner', where: 'GET /unit/:id',
    hints: ['Unit pages are numbered and nothing checks that the unit is yours.', 'Open your own unit, then change the number in the URL.', 'As Alice, open /unit/2 — Bob\u2019s unit and lease summary are served to you.'],
    lesson: 'Sequential object ids plus a missing ownership check equal a full read API for every customer\u2019s data.',
    impact: 'Tenants can map exactly who lives in which unit, their rent and lease dates — prime material for stalking, scams and social engineering.',
    report: { title: 'Insecure Direct Object Reference on Unit Pages', severity: 'High', remediation: 'Check on the server that the session user is a party to the unit/lease before serving any object by id.' } },
  { id: 'lease-idor', feature: 'Units & Leases', name: 'Lease Document IDOR', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner', where: 'GET /lease/:id',
    hints: ['The full lease page has the same numbering habit as the units.', 'You only need to be logged in — not a party to the lease.', 'As Alice, open /lease/2 and read Bob\u2019s complete lease terms.'],
    lesson: 'Sensitive legal documents need per-object authorisation; being logged in is not the same as being entitled.',
    impact: 'Complete lease contracts — names, rents, dates, unit addresses — are readable by any account holder on the platform.',
    report: { title: 'Insecure Direct Object Reference on Lease Documents', severity: 'High', remediation: 'Authorise every lease read against the lease\u2019s tenant and landlord ids on the server side.' } },
  { id: 'lease-sign-bac', feature: 'Units & Leases', name: 'Broken Access Control — Anyone Can Sign a Lease', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate', where: 'POST /lease/:id/sign',
    hints: ['The sign action checks that you are logged in — and nothing else.', 'You do not need to be the tenant OR the landlord named on the lease.', 'As Carol, POST /lease/1/sign — Alice\u2019s lease gets marked signed by you.'],
    lesson: 'Workflow actions must verify the actor\u2019s role IN THAT object, not just that some session exists.',
    impact: 'A random user can "sign" binding rental agreements in other people\u2019s names, creating legal chaos and fraudulent tenancies.',
    report: { title: 'Missing Authorisation on Lease Signing', severity: 'High', remediation: 'Verify the signer is the lease\u2019s tenant or landlord (as appropriate) before recording a signature.' } },
  { id: 'lease-edit-idor', feature: 'Units & Leases', name: 'Lease Terms Tampering by Non-Party (Rent Edit IDOR)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate', where: 'POST /lease/:id/edit',
    hints: ['The lease edit endpoint trusts whoever calls it.', 'The rent field is just a form value — and the server never asks who you are to that lease.', 'As Bob, POST /lease/1/edit with rent=1 — Alice\u2019s lease rent is rewritten.'],
    lesson: 'Write endpoints need the same ownership checks as reads; a missing check on edit is a direct financial-integrity failure.',
    impact: 'A malicious user could slash their own rent to $1 — or raise a victim\u2019s — by editing leases they have no connection to.',
    report: { title: 'Unauthorised Modification of Lease Terms', severity: 'High', remediation: 'Restrict lease edits to the lease\u2019s landlord, validate changes, and keep an audit trail of term changes.' } },
  { id: 'prop-idor-hidden', feature: 'Units & Leases', name: 'Unlisted Property Readable by Direct URL', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner', where: 'GET /property/:id',
    hints: ['Hidden from search is not the same as protected.', 'Property pages have predictable numbers; one listing is deliberately unlisted.', 'Open /property/4 directly — the unlisted internal penthouse is served to any logged-in user.'],
    lesson: '"Not linked anywhere" is not access control; if the URL works, the data is public to every account.',
    impact: 'Internal-only listings (staff housing, withheld properties, pricing notes) are exposed to all users by guessing one number.',
    report: { title: 'Unlisted Property Accessible via Direct Object Reference', severity: 'Medium', remediation: 'Enforce listing visibility on the object endpoint itself, not only in search results.' } },

  /* ---------------- Rent Payments (3) ---------------- */
  { id: 'pay-idor', feature: 'Rent Payments', name: 'Payment Record IDOR', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner', where: 'GET /payment/:id',
    hints: ['Payment receipts follow the same predictable numbering.', 'Receipts show amounts and dates for other people\u2019s rent.', 'As Alice, open /payment/2 — Bob\u2019s rent payment record is served to you.'],
    lesson: 'Financial records are objects too — every read by id needs an ownership decision behind it.',
    impact: 'Rent payment histories reveal income patterns and arrears, enabling targeted scams against both tenants and landlords.',
    report: { title: 'Insecure Direct Object Reference on Payment Records', severity: 'Medium', remediation: 'Authorise payment reads against the payment\u2019s lease parties on the server.' } },
  { id: 'pay-tamper', feature: 'Rent Payments', name: 'Rent Amount Tampering — Pay $1, Marked Paid in Full', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate', where: 'POST /payments/pay',
    hints: ['The pay form lets the client state the amount — and the server believes it.', 'What happens if the amount you submit is not the rent on the lease?', 'POST /payments/pay for your lease with amount=1 — the payment is recorded as PAID and the lease shows settled.'],
    lesson: 'Prices and amounts must be recomputed server-side from the authoritative record; a client-supplied amount is a suggestion, not a fact.',
    impact: 'Tenants can settle a $1,200 rent with $1 while the system reports the month fully paid — direct revenue loss that looks legitimate in the books.',
    report: { title: 'Client-Side Rent Amount Trusted by Payment Endpoint', severity: 'Critical', remediation: 'Derive the payable amount from the lease on the server, reject mismatches, and reconcile with the payment provider.' } },
  { id: 'pay-negative', feature: 'Rent Payments', name: 'Negative Payment Credits the Wallet', owasp: 'A08:2021 Software and Data Integrity Failures', difficulty: 'Intermediate', where: 'POST /payments/pay',
    hints: ['The amount is never checked for being positive.', 'What does a payment of minus fifty do to your balance arithmetic?', 'POST /payments/pay with amount=-50 — your wallet balance grows by $50 and the payment still counts.'],
    lesson: 'Every numeric input needs sign and range validation; money flows are where sloppy validation becomes free cash.',
    impact: 'Users can mint balance out of thin air with negative "payments" and then withdraw or offset real rent against fabricated credit.',
    report: { title: 'Negative Payment Amount Accepted and Credited', severity: 'High', remediation: 'Validate amounts as positive integers within expected bounds and reject any non-positive payment server-side.' } },

  /* ---------------- Deposits (2) ---------------- */
  { id: 'dep-idor', feature: 'Deposits', name: 'Deposit Record IDOR', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner', where: 'GET /deposit/:id',
    hints: ['Deposit pages are numbered like everything else here.', 'Amounts held, and for whom, are none of your business — but the page disagrees.', 'As Alice, open /deposit/2 — Bob\u2019s deposit record is fully visible.'],
    lesson: 'Deposit data is financial PII; predictable ids without ownership checks expose every tenant\u2019s held funds.',
    impact: 'Attackers learn exactly how much money is held per tenant — a shopping list for refund fraud and phishing.',
    report: { title: 'Insecure Direct Object Reference on Deposit Records', severity: 'Medium', remediation: 'Authorise deposit reads against the deposit\u2019s tenant and landlord on the server.' } },
  { id: 'dep-refund-abuse', feature: 'Deposits', name: 'Deposit Refund Abuse — Non-Landlord Refunds Any Amount', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced', where: 'POST /deposit/:id/refund',
    hints: ['The refund action is meant for the landlord at the end of a lease. The endpoint never checks.', 'It also trusts whatever refund amount the caller types.', 'As Bob, POST /deposit/1/refund with amount=5000 — a refund bigger than the deposit itself is recorded.'],
    lesson: 'Money-out actions need BOTH actor authorisation (the landlord of record) and amount validation against the held balance.',
    impact: 'Any user can trigger refunds of other tenants\u2019 deposits — for more than was ever held — straight out of the landlord\u2019s pocket.',
    report: { title: 'Unauthorised and Unbounded Deposit Refunds', severity: 'Critical', remediation: 'Restrict refunds to the deposit\u2019s landlord, cap the amount at the held balance, and require a second confirmation for payout actions.' } },

  /* ---------------- Maintenance Requests (2) ---------------- */
  { id: 'maint-idor', feature: 'Maintenance Requests', name: 'Maintenance Request Privacy IDOR', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner', where: 'GET /request/:id',
    hints: ['Repair requests describe what is broken inside someone\u2019s home.', 'The request pages are numbered; ownership is never checked.', 'As Alice, open /request/2 — Bob\u2019s maintenance request, with his unit details, is served.'],
    lesson: 'Even "boring" workflow records leak sensitive context — when a home is empty, what is broken, and how to get in.',
    impact: 'Burglars and scammers gain unit-level intelligence: broken locks, absent tenants, access notes — from a simple id change.',
    report: { title: 'Insecure Direct Object Reference on Maintenance Requests', severity: 'Medium', remediation: 'Authorise request reads against the request\u2019s tenant and landlord on the server.' } },
  { id: 'maint-status-bac', feature: 'Maintenance Requests', name: 'Tenant Can Close Own Request via Landlord-Only Status Action', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate', where: 'POST /request/:id/status',
    hints: ['Marking a job complete is the landlord\u2019s call. The endpoint does not agree.', 'The status form is only SHOWN to landlords, but the POST URL works for anyone.', 'As Alice, POST /request/1/status with status=completed — your own request closes without the landlord.'],
    lesson: 'Hiding a button in the UI is not authorisation; the server must enforce who may perform each workflow transition.',
    impact: 'Tenants can falsely close repair jobs (or landlords\u2019 tenants can sabotage records), breaking maintenance accountability and safety follow-ups.',
    report: { title: 'Missing Authorisation on Maintenance Status Changes', severity: 'Medium', remediation: 'Enforce per-transition role checks server-side (only the responsible landlord may complete a job) and log all status changes.' } },

  /* ---------------- Admin Panel (1) ---------------- */
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'CSRF on Admin User Deletion', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate', where: 'POST /admin/users/:id/delete',
    hints: ['Even the admin\u2019s destructive actions carry no CSRF token.', 'Like the profile form, the delete action ignores the missing hx_origin marker.', 'As the admin (demo login), POST /admin/users/6/delete with only the sid cookie and no hx_origin marker — the user is deleted.'],
    lesson: 'Admin actions are the highest-value CSRF targets; if they lack tokens, one malicious page can dismantle the platform.',
    impact: 'Tricking the admin into visiting a page could silently delete user accounts — tenants and landlords alike — with the admin\u2019s own session.',
    report: { title: 'Cross-Site Request Forgery on Administrative User Deletion', severity: 'High', remediation: 'Require anti-CSRF tokens on all admin actions, re-confirm destructive operations, and set SameSite cookies.' } },

  /* ---------------- Platform & API (1) ---------------- */
  { id: 'platform-debug', feature: 'Platform & API', name: 'Unauthenticated Debug Endpoint Dumps All Data', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner', where: 'GET /api/debug',
    hints: ['Developers leave themselves presents. Try the obvious debug path.', 'No login is needed for this one at all.', 'Open /api/debug in a fresh browser with no session — every user (with passwords), lease and payment is returned as JSON.'],
    lesson: 'Debug and diagnostic endpoints must never ship to production; they bypass every control the rest of the app enforces.',
    impact: 'One unauthenticated URL hands over the entire platform database — all credentials, leases and payments — no account needed.',
    report: { title: 'Unauthenticated Debug Endpoint Exposes Full Dataset', severity: 'Critical', remediation: 'Remove debug endpoints from production builds and gate any diagnostics behind admin auth, network restrictions and audit logging.' } }
];

/* ------------------------------------------------------------------ *
 * Report export constants (used by the completion debrief pack).     *
 * ------------------------------------------------------------------ */
const REPORT_META = {
  generatedBy: 'HexaRentals completion engine',
  format: 'six-section debrief',
  pack: ["TC1YSA==","LTM5","NURSUw==","WU5Y"],
  retention: 'local-only'
};

/* Completion-key assembler. The completion key exists in this file ONLY
 * as transformed shards split across two regions; it is reconstructed
 * solely when the lab reaches 100% (completion page, certificate and
 * the coach's post-completion knowledge). */
const _packTail = ["NVktTw==","SVNQ","SVlY"];
function completionKey() {
  const parts = REPORT_META.pack.concat(_packTail);
  return parts.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}

/* ------------------------------------------------------------------ *
 * Small helpers                                                      *
 * ------------------------------------------------------------------ */
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function xssLike(s) {
  return /<script|onerror\s*=|onload\s*=|<svg|<img|<iframe|javascript:/i.test(String(s || ''));
}
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  raw.split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 2e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) {
        try { return resolve(JSON.parse(data || '{}')); } catch (e) { return resolve({}); }
      }
      const out = {};
      new URLSearchParams(data).forEach((v, k) => { out[k] = v; });
      resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}
function sessionUser(req) {
  const c = parseCookies(req);
  if (!c.sid || !sessions.has(c.sid)) return null;
  const s = sessions.get(c.sid);
  return userById(s.uid) || null;
}
function effectiveRole(req, user) {
  const c = parseCookies(req);
  return c.hx_role || (user ? user.role : null);
}
function send(res, code, body, headers) {
  const h = Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, headers || {});
  res.writeHead(code, h);
  res.end(body);
}
function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}
function redirect(res, loc, extraHeaders) {
  const h = Object.assign({ Location: loc }, extraHeaders || {});
  res.writeHead(302, h);
  res.end('Redirecting to ' + loc);
}

/* Tiny string-built "SQL" evaluator. The login and search features of
 * this fictional platform build their queries by concatenation — this
 * evaluator honestly executes the resulting WHERE clause so injections
 * behave exactly as they would against a real string-built query. */
function stripSqlComments(q) {
  let out = '', inQ = false;
  for (let i = 0; i < q.length; i++) {
    const ch = q[i];
    if (ch === "'") inQ = !inQ;
    if (!inQ && (q.startsWith('--', i) || ch === '#')) break;
    out += ch;
  }
  return out;
}
function splitOutsideQuotes(s, sep) {
  const parts = []; let cur = '', inQ = false;
  const up = s.toUpperCase();
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "'") inQ = !inQ;
    if (!inQ && up.startsWith(sep, i)) { parts.push(cur); cur = ''; i += sep.length - 1; continue; }
    cur += s[i];
  }
  parts.push(cur);
  return parts;
}
function evalOperand(tok, row) {
  tok = tok.trim();
  if (/^'[^']*'$/.test(tok)) return tok.slice(1, -1);
  if (/^-?\d+$/.test(tok)) return tok;
  const field = tok.toLowerCase();
  if (row && Object.prototype.hasOwnProperty.call(row, field)) return String(row[field]);
  return tok;
}
function evalCondition(cond, row) {
  const like = cond.match(/^(.*?)\s+LIKE\s+(.*)$/i);
  if (like) {
    const left = evalOperand(like[1], row);
    let pat = evalOperand(like[2], row);
    const rx = new RegExp('^' + pat.split('%').map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$', 'i');
    return rx.test(left);
  }
  const eq = cond.split('=');
  if (eq.length === 2) return evalOperand(eq[0], row) === evalOperand(eq[1], row);
  return false;
}
function evalWhere(where, row) {
  return splitOutsideQuotes(where, ' OR ').some(branch =>
    splitOutsideQuotes(branch, ' AND ').every(cond => evalCondition(cond, row)));
}

/* ------------------------------------------------------------------ *
 * Page layout — header with logo, lab identity and the progress bar, *
 * plus the Lab Coach chat widget on every page.                      *
 * ------------------------------------------------------------------ */
function progressBarHtml() {
  const d = doneCount(), t = TESTS.length, p = pct();
  return `<div style="background:#e8eef4;border:1px solid #c9d6e2;border-radius:6px;padding:6px 10px;margin:8px 0;">
    <div style="font-size:13px;">LAB ${LAB_NUMBER} · ${d}/${t} tests · ${p}%</div>
    <div style="background:#cbd8e4;height:10px;border-radius:5px;margin-top:4px;">
      <div style="background:#2b6cb0;height:10px;border-radius:5px;width:${p}%;"></div>
    </div></div>`;
}
function chatWidget() {
  return `<div id="hxcoach" style="position:fixed;right:14px;bottom:14px;width:300px;background:#fff;border:1px solid #b9c9d8;border-radius:10px;box-shadow:0 4px 18px rgba(0,0,0,.18);font-size:13px;z-index:50;">
  <div style="background:#2b6cb0;color:#fff;padding:8px 10px;border-radius:10px 10px 0 0;"><b>Lab Coach</b> — ask me about the tests</div>
  <div id="hxlog" style="height:170px;overflow-y:auto;padding:8px 10px;"></div>
  <div style="display:flex;border-top:1px solid #dde6ee;">
    <input id="hxmsg" style="flex:1;border:0;padding:8px;" placeholder="Ask the coach...">
    <button onclick="hxSend()" style="background:#2b6cb0;color:#fff;border:0;padding:8px 12px;cursor:pointer;">Send</button>
  </div></div>
<script>
async function hxSend(){
  var inp=document.getElementById('hxmsg'); var log=document.getElementById('hxlog');
  var m=inp.value.trim(); if(!m) return; inp.value='';
  log.innerHTML+='<div><b>You:</b> '+m.replace(/</g,'&lt;')+'</div>';
  try{
    var r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})});
    var j=await r.json();
    log.innerHTML+='<div style="margin:6px 0;"><b>Coach:</b> '+String(j.reply||'').replace(/</g,'&lt;')+'</div>';
  }catch(e){ log.innerHTML+='<div><b>Coach:</b> (connection error)</div>'; }
  log.scrollTop=log.scrollHeight;
}
document.getElementById('hxmsg').addEventListener('keydown',function(e){ if(e.key==='Enter') hxSend(); });
</script>`;
}
function layout(req, title, content) {
  const u = sessionUser(req);
  const role = u ? effectiveRole(req, u) : null;
  const nav = u
    ? `<a href="/">Home</a> · <a href="/properties">Properties</a> · <a href="/my">My Rentals</a> · <a href="/maintenance">Maintenance</a> · <a href="/tenants">Tenant Directory</a> · <a href="/tests">Mission Board</a> · <a href="/profile">Profile (${u.name})</a>${role === 'admin' ? ' · <a href="/admin">Admin</a>' : ''} · <a href="/logout">Logout</a>`
    : `<a href="/login">Login</a> · <a href="/register">Register</a> · <a href="/tests">Mission Board</a>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title} — ${LAB_NAME}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f8;color:#1c2733;margin:0;">
<div style="max-width:960px;margin:0 auto;padding:14px;">
  <div style="display:flex;align-items:center;gap:10px;">
    <img src="/logo.png" alt="HexaCyberLab" style="height:40px;">
    <div><b style="font-size:19px;">LAB ${LAB_NUMBER} — ${LAB_NAME}</b><br><span style="font-size:12px;">${SITE.tagline}</span></div>
  </div>
  ${progressBarHtml()}
  <nav style="font-size:13px;margin-bottom:12px;">${nav}</nav>
  <div style="background:#fff;border:1px solid #d7e0e9;border-radius:8px;padding:16px;">${content}</div>
  <p style="font-size:11px;color:#5b6b7a;">Local training lab with intentional vulnerabilities. Never deploy publicly.</p>
</div>
${chatWidget()}
</body></html>`;
}
function gatePage() {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Locked — LAB ${LAB_NUMBER} ${LAB_NAME}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f8;color:#1c2733;">
<div style="max-width:560px;margin:60px auto;background:#fff;border:1px solid #d7e0e9;border-radius:8px;padding:22px;text-align:center;">
  <img src="/logo.png" alt="HexaCyberLab" style="height:54px;">
  <h2>LAB ${LAB_NUMBER} — ${LAB_NAME}</h2>
  <p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
  <form method="POST" action="/unlock">
    <input name="key" style="width:80%;padding:9px;" placeholder="Completion key from Lab ${LAB_NUMBER - 1}" autocomplete="off">
    <br><br><button style="background:#2b6cb0;color:#fff;border:0;padding:9px 20px;border-radius:5px;cursor:pointer;">Unlock Lab ${LAB_NUMBER}</button>
  </form>
</div>
${chatWidget()}
</body></html>`;
}

/* ------------------------------------------------------------------ *
 * Footer/branding fragments (rendered on the gate + error pages).   *
 * ------------------------------------------------------------------ */
const FOOTER_BITS = {
  brand: 'HexaCyberLab',
  line: 'Built by Md. Jony Hassain, Founder of HexaCyberLab.',
  frag: ["TVItUA==","NFVE","NUk2"]
};

/* Entry-key check material is assembled only inside the /unlock
 * handler, from fragments held in two different regions of this file. */
function entryKey() {
  const parts = SITE.buildTag.concat(FOOTER_BITS.frag);
  return parts.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}
function keyEquals(given, actual) {
  const a = String(given || ''), b = String(actual || '');
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/* ------------------------------------------------------------------ *
 * Lab Coach (POST /api/chat) — rule-based, in-lab, zero external     *
 * calls. Knowledge = the TESTS registry + live progress state.       *
 * ------------------------------------------------------------------ */
const FEATURE_KEYWORDS = [
  [/deposit|refund/i, 'Deposits'],
  [/maintenance|repair/i, 'Maintenance Requests'],
  [/lease|unit/i, 'Units & Leases'],
  [/payment|pay\b|rent/i, 'Rent Payments'],
  [/login|auth|brute|reset|sign.?in|password/i, 'Login & Authentication'],
  [/register|sign.?up|profile|mass assignment/i, 'Registration & Profile'],
  [/search|propert|listing/i, 'Properties & Search'],
  [/admin/i, 'Admin Panel'],
  [/debug|\bapi\b|platform/i, 'Platform & API']
];
function featureList() {
  const seen = [];
  TESTS.forEach(t => { if (!seen.includes(t.feature)) seen.push(t.feature); });
  return seen;
}
function findFeature(msg) {
  const low = ' ' + String(msg || '').toLowerCase() + ' ';
  for (const f of featureList()) if (low.includes(f.toLowerCase())) return f;
  for (const t of TESTS) if (low.includes(t.name.toLowerCase())) return t.feature;
  for (const [rx, f] of FEATURE_KEYWORDS) if (rx.test(msg)) return f;
  return null;
}
function coachReply(rawMsg) {
  const msg = String(rawMsg || '');
  const low = msg.toLowerCase();
  const total = TESTS.length, done = doneCount(), p = pct();

  if (/who (built|made|created)|founder|who is (the )?(author|creator)|your (author|creator)/.test(low)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (/\bkey\b|unlock (the )?next|next lab/.test(low)) {
    if (isComplete() && state.keyRevealed) {
      return 'You completed LAB ' + LAB_NUMBER + ' at 100% — here is the completion key for the next lab: ' + completionKey() + ' — paste it into the next lab\u2019s gate to unlock it.';
    }
    return 'I don\u2019t have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at ' + p + '% (' + done + '/' + total + '). Finish every test and the key will appear on the completion page, and I\u2019ll be able to share it then.';
  }
  const feature = findFeature(msg);
  const asksHow = /how|guide|help|solve|do i|step|exploit|attack|bypass|test/.test(low);
  if (feature && asksHow) {
    const att = state.attempts[feature] || 0;
    const fTests = TESTS.filter(t => t.feature === feature);
    const allDone = fTests.every(t => state.tests[t.id]);
    if (allDone) return 'Every test in ' + feature + ' is already complete — nice work. Pick another feature from the Mission Board (/tests).';
    if (att >= 3) {
      const lines = fTests.filter(t => !state.tests[t.id]).map(t => '• ' + t.name + ' — ' + t.hints[2]);
      return 'Step by step for ' + feature + ' (you have ' + att + ' real tries on this feature):\n' + lines.join('\n') + '\nWork through them, watch the Mission Board flip each test to done, and ask me if you get stuck.';
    }
    return 'That feature is locked for help. First try the ' + feature + ' tests yourself at least 3 times — I can see you\u2019ve tried ' + att + ' time(s) so far. After 3 real tries, ask me again and I\u2019ll guide you step by step.';
  }
  if (feature) {
    const fTests = TESTS.filter(t => t.feature === feature);
    const fd = fTests.filter(t => state.tests[t.id]).length;
    return feature + ' has ' + fTests.length + ' tests (' + fd + ' done): ' + fTests.map(t => t.name).join('; ') + '. Ask me "how do I solve the ' + feature + ' tests" once you have tried that feature at least 3 times.';
  }
  if (/how many|list|features|vulnerabilit|tests|what (is|are) (in|the)|contents|map/.test(low)) {
    return 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + featureList().length + ' features and ' + total + ' tests: ' +
      featureList().map(f => f + ' (' + TESTS.filter(t => t.feature === f).length + ')').join(' · ') +
      '. The full map is on the Mission Board at /tests — test names are public; the step-by-step help unlocks after 3 real tries on a feature.';
  }
  if (/progress|next|what should|stuck|start/.test(low)) {
    if (isComplete()) return 'You are at 100% — every test is done. Visit /complete for your debrief and completion key, and /certificate for your certificate.';
    const next = TESTS.find(t => !state.tests[t.id]);
    return 'You are at ' + p + '% (' + done + '/' + total + ' tests). A good next target: "' + next.name + '" in ' + next.feature + ' (' + next.difficulty + '). Its first hint: ' + next.hints[0] + ' Try it a few times, then ask me for the step-by-step.';
  }
  if (/^(hi|hello|hey|yo)\b/.test(low.trim())) {
    return 'Hello! I\u2019m the Lab Coach for LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '. This lab has ' + total + ' security tests across ' + featureList().length + ' features; you are at ' + p + '%. Ask me which features exist, how many tests a feature has, or — after 3 real tries on a feature — how to solve its tests.';
  }
  return 'I can help with this lab\u2019s map and method: ask me which features exist, how many tests a feature has, your progress, or (after 3 real tries on a feature) how to solve that feature\u2019s tests. The Mission Board at /tests tracks everything.';
}

/* ------------------------------------------------------------------ *
 * HTTP layer                                                         *
 * ------------------------------------------------------------------ */
function authCookies(user, sid) {
  return [
    'sid=' + sid + '; Path=/; HttpOnly',
    'hx_role=' + user.role + '; Path=/',
    'hx_origin=marker-92; Path=/'
  ];
}
function startSession(res, user, loc) {
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, { uid: user.id });
  redirect(res, loc, { 'Set-Cookie': authCookies(user, sid) });
}

async function handler(req, res) {
  try {
    const u = new URL(req.url, 'http://127.0.0.1:' + PORT);
    const p = u.pathname;
    const method = req.method;

    /* ---- always available, even while locked ---- */
    if (p === '/logo.png') {
      try {
        const img = fs.readFileSync(LOGO_FILE);
        res.writeHead(200, { 'Content-Type': 'image/png' });
        return res.end(img);
      } catch (e) { return send(res, 404, 'logo missing'); }
    }
    if (p === '/unlock' && method === 'POST') {
      const body = await readBody(req);
      if (keyEquals(body.key, entryKey())) {
        state.unlocked = true; saveState();
        return redirect(res, '/');
      }
      return send(res, 403, 'Invalid key.');
    }
    if (p === '/api/chat' && method === 'POST') {
      const body = await readBody(req);
      return sendJson(res, 200, { reply: coachReply(body.message) });
    }
    if (p === '/api/progress') {
      const features = {};
      for (const f of featureList()) {
        const ft = TESTS.filter(t => t.feature === f);
        features[f] = {
          total: ft.length,
          done: ft.filter(t => state.tests[t.id]).length,
          attempts: state.attempts[f] || 0
        };
      }
      return sendJson(res, 200, {
        lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length,
        done: doneCount(), pct: pct(), features, complete: isComplete()
      });
    }

    /* ---- lock gate ---- */
    if (!state.unlocked) return send(res, 200, gatePage());

    const user = sessionUser(req);
    const cookies = parseCookies(req);

    /* ---- public auth pages ---- */
    if (p === '/login' && method === 'GET') {
      const err = u.searchParams.get('e');
      return send(res, 200, layout(req, 'Login', `
        <h2>Login to HexaRentals</h2>
        ${err ? '<p style="color:#b00020;">' + err + '</p>' : ''}
        <form method="POST" action="/login">
          <p>Email<br><input name="email" style="width:320px;padding:7px;"></p>
          <p>Password<br><input name="password" type="password" style="width:320px;padding:7px;"></p>
          <button style="background:#2b6cb0;color:#fff;border:0;padding:8px 18px;border-radius:5px;">Login</button>
        </form>
        <p style="font-size:13px;"><a href="/forgot">Forgot password?</a> · <a href="/register">Create an account</a></p>
        <div style="background:#fdf6e3;border:1px solid #e3d9a8;padding:10px;font-size:13px;">
          <b>Demo accounts (for the training demo):</b><br>
          Admin — admin@hexarentals.local / admin123<br>
          Landlord — larry@hexarentals.local / larry123<br>
          Tenant — alice@test.local / alice123
        </div>`));
    }
    if (p === '/login' && method === 'POST') {
      const body = await readBody(req);
      attempt('Login & Authentication');
      const email = String(body.email || '').toLowerCase();
      const password = String(body.password || '');
      if (Date.now() - enumWindowStart > 10 * 60 * 1000) { loginEnumProbes.clear(); enumWindowStart = Date.now(); }
      loginEnumProbes.add(email);
      if (loginEnumProbes.size >= 5 || forgotEnumProbes.size >= 5) pass('auth-enum');
      const query = "SELECT * FROM users WHERE email = '" + email + "' AND password = '" + password + "'";
      const where = stripSqlComments(query.slice(query.indexOf('WHERE') + 5));
      const matched = users.find(row => evalWhere(where, { email: row.email, password: row.password, role: row.role, id: String(row.id) }));
      if (matched) {
        if (password !== matched.password) pass('auth-sqli');
        failedLogins[email] = 0;
        if (email === 'admin@hexarentals.local' && password === 'admin123') pass('auth-demo');
        return startSession(res, matched, '/');
      }
      failedLogins[email] = (failedLogins[email] || 0) + 1;
      if (failedLogins[email] >= 10 && userByEmail(email)) pass('auth-brute');
      const msg = userByEmail(email) ? 'Wrong password for that account.' : 'No account found for that email.';
      return redirect(res, '/login?e=' + encodeURIComponent(msg));
    }
    if (p === '/logout') {
      if (cookies.sid) sessions.delete(cookies.sid);
      return redirect(res, '/login', { 'Set-Cookie': ['sid=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0'] });
    }
    if (p === '/register' && method === 'GET') {
      return send(res, 200, layout(req, 'Register', `
        <h2>Create your HexaRentals account</h2>
        <form method="POST" action="/register">
          <p>Display name<br><input name="name" style="width:320px;padding:7px;"></p>
          <p>Email<br><input name="email" style="width:320px;padding:7px;"></p>
          <p>Password<br><input name="password" type="password" style="width:320px;padding:7px;"></p>
          <button style="background:#2b6cb0;color:#fff;border:0;padding:8px 18px;border-radius:5px;">Register</button>
        </form>`));
    }
    if (p === '/register' && method === 'POST') {
      const body = await readBody(req);
      attempt('Registration & Profile');
      const email = String(body.email || '').toLowerCase();
      if (!email || userByEmail(email)) return redirect(res, '/login?e=' + encodeURIComponent('Email missing or already registered.'));
      const nu = {
        id: nextUserId++,
        email,
        password: String(body.password || ''),
        role: 'tenant',
        name: String(body.name || 'New User'),
        balance: 0
      };
      /* Intentional mass assignment: extra submitted fields are copied. */
      if (body.role && ['tenant', 'landlord', 'admin'].includes(body.role)) nu.role = body.role;
      if (body.balance !== undefined && body.balance !== '') nu.balance = Number(body.balance) || 0;
      if (body.role && body.role !== 'tenant') pass('reg-massassign');
      if (body.balance !== undefined && Number(body.balance) !== 0) pass('reg-massassign');
      if (nu.password.length < 4) pass('reg-weakpw');
      if (xssLike(nu.name)) pass('reg-storedxss');
      users.push(nu);
      return startSession(res, nu, '/');
    }
    if (p === '/forgot' && method === 'GET') {
      const m = u.searchParams.get('m');
      return send(res, 200, layout(req, 'Forgot password', `
        <h2>Forgot password</h2>
        ${m ? '<p>' + m + '</p>' : ''}
        <form method="POST" action="/forgot">
          <p>Email<br><input name="email" style="width:320px;padding:7px;"></p>
          <button style="background:#2b6cb0;color:#fff;border:0;padding:8px 18px;border-radius:5px;">Send reset link</button>
        </form>`));
    }
    if (p === '/forgot' && method === 'POST') {
      const body = await readBody(req);
      attempt('Login & Authentication');
      const email = String(body.email || '').toLowerCase();
      if (Date.now() - enumWindowStart > 10 * 60 * 1000) { forgotEnumProbes.clear(); enumWindowStart = Date.now(); }
      forgotEnumProbes.add(email);
      if (loginEnumProbes.size >= 5 || forgotEnumProbes.size >= 5) pass('auth-enum');
      const target = userByEmail(email);
      let msg;
      if (target) {
        const tok = resetTokenFor(target);
        resetTokens[email] = tok;
        requestedResets.add(email);
        msg = 'Reset link sent to your email. (Demo: your link is /reset?email=' + encodeURIComponent(email) + '&amp;token=' + tok + ')';
      } else {
        msg = 'No account found for that email.';
      }
      return redirect(res, '/forgot?m=' + encodeURIComponent(msg));
    }
    if (p === '/reset' && method === 'GET') {
      return send(res, 200, layout(req, 'Reset password', `
        <h2>Reset password</h2>
        <form method="POST" action="/reset">
          <p>Email<br><input name="email" value="${esc(u.searchParams.get('email') || '')}" style="width:320px;padding:7px;"></p>
          <p>Token<br><input name="token" value="${esc(u.searchParams.get('token') || '')}" style="width:320px;padding:7px;"></p>
          <p>New password<br><input name="password" type="password" style="width:320px;padding:7px;"></p>
          <button style="background:#2b6cb0;color:#fff;border:0;padding:8px 18px;border-radius:5px;">Set new password</button>
        </form>`));
    }
    if (p === '/reset' && method === 'POST') {
      const body = await readBody(req);
      attempt('Login & Authentication');
      const email = String(body.email || '').toLowerCase();
      const target = userByEmail(email);
      const tok = String(body.token || '');
      if (target && (tok === resetTokens[email] || tok === resetTokenFor(target))) {
        if (!requestedResets.has(email)) pass('auth-reset-token');
        target.password = String(body.password || '');
        delete resetTokens[email];
        requestedResets.delete(email);
        return redirect(res, '/login?e=' + encodeURIComponent('Password updated — please log in.'));
      }
      return redirect(res, '/login?e=' + encodeURIComponent('Invalid reset token.'));
    }

    /* ---- lab system pages (visible without an app login) ---- */
    if (p === '/tests') return send(res, 200, testsPage(req));
    if (p === '/complete' && method === 'GET') return send(res, 200, completePage(req));
    if (p === '/complete/name' && method === 'POST') {
      const body = await readBody(req);
      state.testerName = String(body.name || '').slice(0, 80);
      saveState();
      return redirect(res, '/complete');
    }
    if (p === '/certificate') {
      if (!isComplete()) return redirect(res, '/complete');
      return send(res, 200, certificatePage(req));
    }
    if (p === '/api/debug') {
      attempt('Platform & API');
      pass('platform-debug');
      return sendJson(res, 200, { users, properties, leases, payments, deposits, maintenanceRequests });
    }

    /* ---- everything below needs an app login ---- */
    if (!user) return redirect(res, '/login');

    if (p === '/') {
      const myUnits = units.filter(x => x.tenantId === user.id || leases.find(l => l.id === x.leaseId && l.landlordId === user.id));
      return send(res, 200, layout(req, 'Home', `
        <h2>${SITE.motd}</h2>
        <p>Signed in as <b>${user.name}</b> (${user.role}) · Wallet balance: $${user.balance}</p>
        <p>You are connected to ${myUnits.length} unit(s). Browse <a href="/properties">properties</a>, manage <a href="/my">your rentals</a>, or report a <a href="/maintenance">maintenance issue</a>.</p>
        <p>Training progress lives on the <a href="/tests">Mission Board</a>.</p>`));
    }

    if (p === '/properties') {
      const cards = properties.filter(x => x.listed).map(x => propertyCard(x)).join('');
      return send(res, 200, layout(req, 'Properties', `
        <h2>Available properties</h2>
        <form method="GET" action="/search"><input name="q" placeholder="Search title or city..." style="width:320px;padding:7px;">
        <button style="padding:7px 14px;">Search</button></form>
        ${cards}`));
    }
    if (p === '/search') {
      attempt('Properties & Search');
      const q = u.searchParams.get('q') || '';
      let results;
      if (q.includes("'")) {
        const query = "SELECT * FROM properties WHERE title LIKE '%" + q + "%' OR city LIKE '%" + q + "%'";
        const where = stripSqlComments(query.slice(query.indexOf('WHERE') + 5));
        results = properties.filter(row => evalWhere(where, { title: row.title, city: row.city, id: String(row.id) }));
        if (results.some(x => !x.listed)) pass('prop-sqli');
      } else {
        const needle = q.toLowerCase();
        results = properties.filter(x => x.listed && (x.title.toLowerCase().includes(needle) || x.city.toLowerCase().includes(needle)));
      }
      if (xssLike(q)) pass('prop-xss');
      return send(res, 200, layout(req, 'Search', `
        <h2>Results for: ${q}</h2>
        ${results.length ? results.map(x => propertyCard(x)).join('') : '<p>No properties matched.</p>'}`));
    }
    if (p.startsWith('/property/')) {
      attempt('Units & Leases');
      const prop = properties.find(x => x.id === Number(p.split('/')[2]));
      if (!prop) return send(res, 404, 'Property not found.');
      if (!prop.listed && prop.landlordId !== user.id && user.role !== 'admin') pass('prop-idor-hidden');
      const propUnits = units.filter(x => x.propertyId === prop.id);
      return send(res, 200, layout(req, 'Property', `
        <h2>${prop.title}</h2>
        <p>City: ${prop.city} · Rent: $${prop.rent}/month · Landlord id: ${prop.landlordId} · Listed: ${prop.listed ? 'yes' : 'NO (internal)'}</p>
        <h3>Units</h3>
        ${propUnits.map(x => '<p>Unit ' + x.unit + ' — <a href="/unit/' + x.id + '">view unit</a></p>').join('') || '<p>No units registered.</p>'}`));
    }

    if (p === '/my') {
      const asTenant = leases.filter(l => l.tenantId === user.id);
      const asLandlord = leases.filter(l => l.landlordId === user.id);
      const row = l => `<p>Lease #${l.id} — Unit ${l.unitId} · Rent $${l.rent} · Status ${l.status} · <a href="/lease/${l.id}">open lease</a></p>`;
      return send(res, 200, layout(req, 'My Rentals', `
        <h2>My rentals</h2>
        <h3>As tenant</h3>${asTenant.map(row).join('') || '<p>None.</p>'}
        <h3>As landlord</h3>${asLandlord.map(row).join('') || '<p>None.</p>'}
        <p>Wallet balance: $${user.balance}</p>`));
    }
    if (p.startsWith('/unit/')) {
      attempt('Units & Leases');
      const unit = units.find(x => x.id === Number(p.split('/')[2]));
      if (!unit) return send(res, 404, 'Unit not found.');
      const lease = leases.find(l => l.id === unit.leaseId);
      const prop = properties.find(x => x.id === unit.propertyId);
      if (unit.tenantId !== user.id && (!lease || lease.landlordId !== user.id) && user.role !== 'admin') pass('lease-unit-idor');
      return send(res, 200, layout(req, 'Unit', `
        <h2>Unit ${unit.unit} — ${prop ? prop.title : ''}</h2>
        <p>Tenant id: ${unit.tenantId} · Lease: <a href="/lease/${unit.leaseId}">Lease #${unit.leaseId}</a></p>
        ${lease ? '<p>Rent: $' + lease.rent + ' · ' + lease.start + ' → ' + lease.end + ' · Status: ' + lease.status + '</p>' : ''}`));
    }
    if (p.startsWith('/lease/') && method === 'GET') {
      attempt('Units & Leases');
      const lease = leases.find(l => l.id === Number(p.split('/')[2]));
      if (!lease) return send(res, 404, 'Lease not found.');
      if (lease.tenantId !== user.id && lease.landlordId !== user.id && user.role !== 'admin') pass('lease-idor');
      const dep = deposits.find(d => d.leaseId === lease.id);
      const pays = payments.filter(x => x.leaseId === lease.id);
      return send(res, 200, layout(req, 'Lease', `
        <h2>Lease #${lease.id}</h2>
        <p>Property ${lease.propertyId} · Unit ${lease.unitId} · Tenant id ${lease.tenantId} · Landlord id ${lease.landlordId}</p>
        <p>Rent: $${lease.rent}/month · ${lease.start} → ${lease.end} · Status: ${lease.status} · Signed by tenant: ${lease.signedByTenant} · Signed by landlord: ${lease.signedByLandlord} · Current month paid: ${lease.paid}</p>
        <form method="POST" action="/lease/${lease.id}/sign"><button>Sign this lease</button></form>
        <h3>Edit lease terms</h3>
        <form method="POST" action="/lease/${lease.id}/edit">
          <p>Rent <input name="rent" type="number" value="${lease.rent}"> End date <input name="end" value="${lease.end}">
          <button>Save terms</button></p>
        </form>
        <h3>Pay rent</h3>
        <form method="POST" action="/payments/pay">
          <input type="hidden" name="leaseId" value="${lease.id}">
          <p>Amount <input name="amount" type="number" value="${lease.rent}"> <button>Pay now</button></p>
        </form>
        <h3>Payments</h3>
        ${pays.map(x => '<p>Payment #' + x.id + ' — $' + x.amount + ' · ' + x.status + ' · ' + x.date + ' · <a href="/payment/' + x.id + '">receipt</a></p>').join('') || '<p>No payments yet.</p>'}
        ${dep ? '<p>Deposit: <a href="/deposit/' + dep.id + '">Deposit #' + dep.id + '</a> — $' + dep.amount + ' (' + dep.status + ')</p>' : ''}`));
    }
    if (p.match(/^\/lease\/\d+\/sign$/) && method === 'POST') {
      await readBody(req);
      attempt('Units & Leases');
      const lease = leases.find(l => l.id === Number(p.split('/')[2]));
      if (!lease) return send(res, 404, 'Lease not found.');
      if (user.id === lease.tenantId) lease.signedByTenant = true;
      else if (user.id === lease.landlordId) lease.signedByLandlord = true;
      else {
        if (user.role !== 'admin') pass('lease-sign-bac');
        lease.signedByTenant = true;
        lease.status = 'active';
      }
      if (lease.signedByTenant && lease.signedByLandlord) lease.status = 'active';
      return redirect(res, '/lease/' + lease.id);
    }
    if (p.match(/^\/lease\/\d+\/edit$/) && method === 'POST') {
      const body = await readBody(req);
      attempt('Units & Leases');
      const lease = leases.find(l => l.id === Number(p.split('/')[2]));
      if (!lease) return send(res, 404, 'Lease not found.');
      if (lease.tenantId !== user.id && lease.landlordId !== user.id && user.role !== 'admin') pass('lease-edit-idor');
      if (body.rent !== undefined && body.rent !== '') lease.rent = Number(body.rent);
      if (body.end) lease.end = String(body.end);
      return redirect(res, '/lease/' + lease.id);
    }
    if (p.startsWith('/payment/')) {
      attempt('Rent Payments');
      const pay = payments.find(x => x.id === Number(p.split('/')[2]));
      if (!pay) return send(res, 404, 'Payment not found.');
      const lease = leases.find(l => l.id === pay.leaseId);
      if (pay.tenantId !== user.id && (!lease || lease.landlordId !== user.id) && user.role !== 'admin') pass('pay-idor');
      return send(res, 200, layout(req, 'Payment', `
        <h2>Payment #${pay.id}</h2>
        <p>Lease #${pay.leaseId} · Tenant id ${pay.tenantId} · Amount $${pay.amount} · Status ${pay.status} · Date ${pay.date}</p>`));
    }
    if (p === '/payments/pay' && method === 'POST') {
      const body = await readBody(req);
      attempt('Rent Payments');
      const lease = leases.find(l => l.id === Number(body.leaseId));
      if (!lease) return send(res, 404, 'Lease not found.');
      const amount = Number(body.amount);
      payments.push({ id: nextPaymentId++, leaseId: lease.id, tenantId: user.id, amount, status: 'paid', date: new Date().toISOString().slice(0, 10) });
      if (amount < 0) {
        user.balance += -amount;
        lease.paid = true;
        pass('pay-negative');
      } else if (amount !== lease.rent) {
        lease.paid = true;
        pass('pay-tamper');
      } else {
        lease.paid = true;
      }
      return redirect(res, '/lease/' + lease.id);
    }
    if (p.startsWith('/deposit/') && method === 'GET') {
      attempt('Deposits');
      const dep = deposits.find(d => d.id === Number(p.split('/')[2]));
      if (!dep) return send(res, 404, 'Deposit not found.');
      if (dep.tenantId !== user.id && dep.landlordId !== user.id && user.role !== 'admin') pass('dep-idor');
      return send(res, 200, layout(req, 'Deposit', `
        <h2>Deposit #${dep.id}</h2>
        <p>Lease #${dep.leaseId} · Tenant id ${dep.tenantId} · Landlord id ${dep.landlordId}</p>
        <p>Amount held: $${dep.amount} · Status: ${dep.status}${dep.status === 'refunded' ? ' · Refunded $' + dep.refundedAmount + ' by user id ' + dep.refundedBy : ''}</p>
        <h3>Refund this deposit</h3>
        <form method="POST" action="/deposit/${dep.id}/refund">
          <p>Refund amount <input name="amount" type="number" value="${dep.amount}"> <button>Refund</button></p>
        </form>`));
    }
    if (p.match(/^\/deposit\/\d+\/refund$/) && method === 'POST') {
      const body = await readBody(req);
      attempt('Deposits');
      const dep = deposits.find(d => d.id === Number(p.split('/')[2]));
      if (!dep) return send(res, 404, 'Deposit not found.');
      const amount = Number(body.amount);
      if ((user.id !== dep.landlordId && user.role !== 'admin') || amount > dep.amount) pass('dep-refund-abuse');
      dep.status = 'refunded';
      dep.refundedAmount = amount;
      dep.refundedBy = user.id;
      return redirect(res, '/deposit/' + dep.id);
    }
    if (p === '/maintenance' && method === 'GET') {
      attempt('Maintenance Requests');
      const visible = maintenanceRequests.filter(r => r.tenantId === user.id || r.landlordId === user.id || user.role === 'admin');
      return send(res, 200, layout(req, 'Maintenance', `
        <h2>Maintenance requests</h2>
        ${visible.map(r => '<p>#' + r.id + ' — ' + r.title + ' · Unit ' + r.unitId + ' · ' + r.status + ' · <a href="/request/' + r.id + '">open</a></p>').join('') || '<p>No requests.</p>'}
        <h3>New request</h3>
        <form method="POST" action="/maintenance">
          <p>Unit id <input name="unitId" type="number" value="1"></p>
          <p>Title <input name="title" style="width:320px;"></p>
          <p>Details <input name="desc" style="width:320px;"></p>
          <button>Submit request</button>
        </form>`));
    }
    if (p === '/maintenance' && method === 'POST') {
      const body = await readBody(req);
      attempt('Maintenance Requests');
      const unit = units.find(x => x.id === Number(body.unitId));
      const lease = unit ? leases.find(l => l.id === unit.leaseId) : null;
      maintenanceRequests.push({
        id: nextMaintId++, unitId: Number(body.unitId) || 0, tenantId: user.id,
        landlordId: lease ? lease.landlordId : user.id,
        title: String(body.title || ''), desc: String(body.desc || ''), status: 'open'
      });
      return redirect(res, '/maintenance');
    }
    if (p.startsWith('/request/') && method === 'GET') {
      attempt('Maintenance Requests');
      const r = maintenanceRequests.find(x => x.id === Number(p.split('/')[2]));
      if (!r) return send(res, 404, 'Request not found.');
      if (r.tenantId !== user.id && r.landlordId !== user.id && user.role !== 'admin') pass('maint-idor');
      return send(res, 200, layout(req, 'Request', `
        <h2>Request #${r.id} — ${r.title}</h2>
        <p>Unit ${r.unitId} · Tenant id ${r.tenantId} · Landlord id ${r.landlordId} · Status: ${r.status}</p>
        <p>${r.desc}</p>
        <form method="POST" action="/request/${r.id}/status">
          <p>Status <select name="status"><option>open</option><option>in-progress</option><option>completed</option></select>
          <button>Update status</button></p>
        </form>`));
    }
    if (p.match(/^\/request\/\d+\/status$/) && method === 'POST') {
      const body = await readBody(req);
      attempt('Maintenance Requests');
      const r = maintenanceRequests.find(x => x.id === Number(p.split('/')[2]));
      if (!r) return send(res, 404, 'Request not found.');
      if (user.id !== r.landlordId && user.role !== 'admin') pass('maint-status-bac');
      r.status = String(body.status || r.status);
      return redirect(res, '/request/' + r.id);
    }
    if (p === '/tenants') {
      attempt('Registration & Profile');
      return send(res, 200, layout(req, 'Tenant Directory', `
        <h2>Tenant &amp; landlord directory</h2>
        ${users.map(x => '<p>' + x.name + ' — ' + x.email + ' · ' + x.role + '</p>').join('')}`));
    }
    if (p === '/profile' && method === 'GET') {
      return send(res, 200, layout(req, 'Profile', `
        <h2>Your profile</h2>
        <form method="POST" action="/profile">
          <p>Display name<br><input name="name" value="${user.name}" style="width:320px;padding:7px;"></p>
          <p>Email<br><input name="email" value="${user.email}" style="width:320px;padding:7px;"></p>
          <p>Role: ${user.role} · Wallet balance: $${user.balance}</p>
          <button style="background:#2b6cb0;color:#fff;border:0;padding:8px 18px;border-radius:5px;">Save profile</button>
        </form>`));
    }
    if (p === '/profile' && method === 'POST') {
      const body = await readBody(req);
      attempt('Registration & Profile');
      if (!cookies.hx_origin) pass('reg-csrf');
      if (body.name) { user.name = String(body.name); if (xssLike(user.name)) pass('reg-storedxss'); }
      if (body.email) user.email = String(body.email).toLowerCase();
      return redirect(res, '/profile');
    }
    if (p === '/admin' && method === 'GET') {
      attempt('Admin Panel');
      const role = effectiveRole(req, user);
      if (role !== 'admin') return send(res, 403, layout(req, 'Forbidden', '<h2>403 — Admins only.</h2>'));
      if (user.role !== 'admin') pass('auth-cookie');
      return send(res, 200, layout(req, 'Admin', `
        <h2>Admin panel — all users</h2>
        ${users.map(x => '<p>#' + x.id + ' ' + x.name + ' — ' + x.email + ' · role ' + x.role + ' · password ' + x.password + ' · balance $' + x.balance +
          (x.id !== 1 ? ' <form method="POST" action="/admin/users/' + x.id + '/delete" style="display:inline;"><button>Delete user</button></form>' : '') + '</p>').join('')}`));
    }
    if (p.match(/^\/admin\/users\/\d+\/delete$/) && method === 'POST') {
      await readBody(req);
      attempt('Admin Panel');
      if (effectiveRole(req, user) !== 'admin') return send(res, 403, 'Admins only.');
      if (!cookies.hx_origin) pass('admin-csrf');
      const id = Number(p.split('/')[3]);
      const ix = users.findIndex(x => x.id === id);
      if (ix >= 0 && id !== 1) users.splice(ix, 1);
      return redirect(res, '/admin');
    }

    return send(res, 404, layout(req, 'Not found', '<h2>404 — Not found.</h2>'));
  } catch (e) {
    try { send(res, 500, 'Internal error — the lab survived your input.'); } catch (e2) {}
  }
}

function propertyCard(x) {
  return `<div style="border:1px solid #d7e0e9;border-radius:6px;padding:10px;margin:8px 0;">
    <b>${x.title}</b> — ${x.city} · $${x.rent}/month · <a href="/property/${x.id}">details</a></div>`;
}

function testsPage(req) {
  const groups = featureList().map(f => {
    const ft = TESTS.filter(t => t.feature === f);
    const att = state.attempts[f] || 0;
    const rows = ft.map(t => `
      <div style="border:1px solid #d7e0e9;border-radius:6px;padding:10px;margin:8px 0;">
        <b>${state.tests[t.id] ? '✓' : '○'} ${t.name}</b> — ${t.owasp} · ${t.difficulty} · Feature attempts: ${att}<br>
        <details><summary>Hint 1</summary>${t.hints[0]}
          <details><summary>Hint 2</summary>${t.hints[1]}
            <details><summary>Hint 3</summary>${t.hints[2]}</details>
          </details>
        </details>
      </div>`).join('');
    return `<h3>${f} (${ft.filter(t => state.tests[t.id]).length}/${ft.length})</h3>${rows}`;
  }).join('');
  return layout(req, 'Mission Board', `<h2>Mission Board — LAB ${LAB_NUMBER} ${LAB_NAME}</h2>
    <p>${doneCount()}/${TESTS.length} tests complete (${pct()}%). Tests flip to done only when the server sees the real exploit succeed — never by clicking.</p>${groups}`);
}

function completePage(req) {
  if (!isComplete()) {
    const left = TESTS.filter(t => !state.tests[t.id]);
    return layout(req, 'Completion', `<h2>Not complete yet — ${doneCount()}/${TESTS.length} (${pct()}%)</h2>
      <p>Finish every test on the <a href="/tests">Mission Board</a>. Still open:</p>
      ${left.map(t => '<p>○ ' + t.name + ' (' + t.feature + ')</p>').join('')}`);
  }
  if (!state.keyRevealed) { state.keyRevealed = true; saveState(); }
  const feats = featureList();
  const sec2 = feats.map(f => '<p>' + f + ': ' + TESTS.filter(t => t.feature === f).length + ' vulnerabilities</p>').join('');
  const sec3 = TESTS.map(t => '<p>✓ ' + t.name + ' — ' + t.where + '</p>').join('');
  const sec4 = TESTS.map(t => '<p><b>' + t.name + ':</b> ' + t.lesson + '</p>').join('');
  const sec5 = TESTS.map(t => '<p><b>' + t.name + ':</b> ' + t.impact + '</p>').join('');
  const sec6 = TESTS.map(t => '<p><b>' + t.report.title + '</b> — Severity: ' + t.report.severity + ' — Remediation: ' + t.report.remediation + '</p>').join('');
  return layout(req, 'Lab Complete', `
    <h2>LAB ${LAB_NUMBER} — ${LAB_NAME}: 100% complete</h2>
    <h3>1) Total features in this lab</h3><p>${feats.length} features: ${feats.join(' · ')}</p>
    <h3>2) Vulnerabilities per feature</h3>${sec2}
    <h3>3) How testing was done (${TESTS.length} techniques)</h3>${sec3}
    <h3>4) What you learned</h3>${sec4}
    <h3>5) What this means for a real client</h3>${sec5}
    <h3>6) Writing it in a real report</h3>${sec6}
    <h3>Your completion key (unlocks Lab ${LAB_NUMBER + 1})</h3>
    <p style="background:#eef6ee;border:1px solid #9dc79d;padding:12px;font-family:monospace;font-size:16px;">${completionKey()}</p>
    <form method="POST" action="/complete/name">
      <p>Your name for the certificate: <input name="name" value="${esc(state.testerName)}" style="padding:6px;width:260px;">
      <button>Save name</button></p>
    </form>
    <p><a href="/certificate">Open your certificate</a></p>`);
}

function certificatePage(req) {
  const name = state.testerName || 'HexaRentals Tester';
  const date = state.completedAt ? new Date(state.completedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  return `<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER}</title>
<style>@media print { body { background:#fff; } }</style></head>
<body style="font-family:Georgia,serif;background:#eceff2;">
<div style="max-width:720px;margin:40px auto;background:#fff;border:3px double #2b6cb0;border-radius:10px;padding:34px;text-align:center;">
  <img src="/logo.png" alt="HexaCyberLab" style="height:64px;">
  <h1 style="margin:10px 0;">Certificate of Completion</h1>
  <p>This certifies that</p>
  <h2 style="margin:6px 0;">${name}</h2>
  <p>has completed 100% of the security tests in LAB ${LAB_NUMBER} — ${LAB_NAME} (${TESTS.length} tests across ${featureList().length} features)</p>
  <p>Completed on ${date}</p>
  <p style="margin-top:22px;"><b>HexaCyberLab — Built by Md. Jony Hassain, Founder</b></p>
</div>
</body></html>`;
}

/* ------------------------------------------------------------------ *
 * Doc generation — VULNERABILITIES.md, PRACTICE-GUIDE.md and         *
 * FIX-AND-RETEST.md are generated from the TESTS registry so the     *
 * counts can never drift from the running lab.                       *
 * ------------------------------------------------------------------ */
function genDocs() {
  const feats = featureList();
  const byFeat = f => TESTS.filter(t => t.feature === f);
  let vuln = '# HexaRentals — Vulnerability Map (LAB ' + LAB_NUMBER + ')\n\n' +
    'Every scored test in this lab, grouped by feature. This is the complete map: ' +
    TESTS.length + ' tests across ' + feats.length + ' features. Each flaw is live in the running app and is ' +
    'detected server-side only when the real exploit succeeds.\n';
  for (const f of feats) {
    vuln += '\n## ' + f + ' (' + byFeat(f).length + ')\n';
    for (const t of byFeat(f)) {
      vuln += '\n### ' + t.name + '\n- OWASP: ' + t.owasp + '\n- Difficulty: ' + t.difficulty +
        '\n- Location: ' + t.where + '\n- Impact: ' + t.impact +
        '\n- Exploitation outline: ' + t.hints[2] + '\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'), vuln);

  const order = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  let guide = '# HexaRentals — Practice Guide (LAB ' + LAB_NUMBER + ')\n\n' +
    'Challenges grouped by feature, then difficulty. Each challenge has one measurable objective: make its test ' +
    'flip to done on the Mission Board (/tests) by performing the real exploit. Three graded hints per challenge.\n';
  for (const f of feats) {
    guide += '\n## ' + f + '\n';
    const sorted = byFeat(f).slice().sort((a, b) => order[a.difficulty] - order[b.difficulty]);
    for (const t of sorted) {
      guide += '\n### ' + t.name + ' (' + t.difficulty + ')\n- Objective: flip the "' + t.name + '" test to done on /tests by exploiting ' + t.where + '.\n- Hint 1: ' + t.hints[0] + '\n- Hint 2: ' + t.hints[1] + '\n- Hint 3: ' + t.hints[2] + '\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'), guide);

  let fix = '# HexaRentals — Fix & Retest (LAB ' + LAB_NUMBER + ')\n\n' +
    'For every test: the professional report entry, the secure implementation, and the regression retest that ' +
    'proves the fix. Work through this after completing the lab offensively.\n';
  for (const f of feats) {
    fix += '\n## ' + f + '\n';
    for (const t of byFeat(f)) {
      fix += '\n### ' + t.report.title + ' — Severity: ' + t.report.severity + '\n' +
        '- Finding: ' + t.name + ' (' + t.owasp + ') at ' + t.where + '.\n' +
        '- Secure implementation: ' + t.report.remediation + '\n' +
        '- Remediation: ' + t.report.remediation + '\n' +
        '- Regression test: on a FRESH lab state, repeat the original exploit against ' + t.where + '; it must fail (no access, no state change, no data leak) and the "' + t.name + '" test must stay open. Then confirm the legitimate workflow still works end-to-end.\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'), fix);
  console.log('Docs generated from registry: ' + TESTS.length + ' tests, ' + feats.length + ' features.');
}

if (process.argv.includes('--gen-docs')) {
  genDocs();
  process.exit(0);
}

const server = http.createServer(handler);
server.listen(PORT, '127.0.0.1', () => {
  console.log('LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' listening on http://127.0.0.1:' + PORT + ' (local-only training lab)');
});
