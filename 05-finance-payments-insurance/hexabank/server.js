'use strict';
/*
 * HexaBank — LAB 43 of 110 (Category 5: Finance, Payments & Insurance)
 * A deliberately vulnerable banking simulator for hands-on web pentesting practice.
 * LOCAL USE ONLY. Zero-dependency Node.js (built-ins only). Binds 127.0.0.1:3052.
 * All customers, accounts, balances and loans are FAKE seed data — nothing here
 * connects to any real bank or real money.
 * Built by Md. Jony Hassain, Founder of HexaCyberLab.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3052;
const LAB_NUMBER = 43;
const LAB_NAME = 'HexaBank';
const PREV_LAB = 42;
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');

/* ------------------------------------------------------------------ *
 * Key material lives ONLY as encoded fragments, scattered through    *
 * this file and reassembled in memory at the moment of use.          *
 * ------------------------------------------------------------------ */
const _eA = ['TC1YSA==', 'SS0zNA==', 'U05BTQ=='];
const _cA = ['TC1YSA==', 'NC00NA==', 'VUVXQw=='];
function _un(a) {
  return a.map(s => [...Buffer.from(s, 'base64').toString('utf8')].reverse().join('')).join('');
}

/* ============================ seed data ============================ */
/* Simulated bank customers (bank "users"). Roles: admin / staff / customer. */
const users = [
  { id: 1, email: 'admin@hexabank.local', password: 'admin123', name: 'Platform Admin', role: 'admin', tier: 'internal', active: true },
  { id: 2, email: 'teller@hexabank.local', password: 'Teller@123', name: 'Priya Nair', role: 'staff', tier: 'internal', active: true },
  { id: 3, email: 'alice@hexabank.local', password: 'Alice@123', name: 'Alice Rahman', role: 'customer', tier: 'standard', active: true },
  { id: 4, email: 'bob@hexabank.local', password: 'Bob@1234', name: 'Bob Hossain', role: 'customer', tier: 'standard', active: true },
  { id: 5, email: 'carol@hexabank.local', password: 'Carol@123', name: 'Carol Dsouza', role: 'customer', tier: 'premium', active: true },
  { id: 6, email: 'dave@hexabank.local', password: 'Dave@123', name: 'Dave Karim', role: 'customer', tier: 'standard', active: true }
];
/* Simulated bank accounts — records only, no real money anywhere. */
let bankAccounts = [
  { id: 101, accNo: 'HB-100101', ownerId: 3, type: 'Savings', balance: 8450.00, status: 'active' },
  { id: 102, accNo: 'HB-100102', ownerId: 3, type: 'Current', balance: 1230.50, status: 'active' },
  { id: 201, accNo: 'HB-100201', ownerId: 4, type: 'Savings', balance: 15230.75, status: 'active' },
  { id: 301, accNo: 'HB-100301', ownerId: 5, type: 'Current', balance: 3120.00, status: 'active' },
  { id: 302, accNo: 'HB-100302', ownerId: 5, type: 'Savings', balance: 22140.20, status: 'active' },
  { id: 401, accNo: 'HB-100401', ownerId: 6, type: 'Current', balance: 640.00, status: 'active' }
];
let ledger = [
  { id: 1, accountId: 101, date: '2026-10-01', desc: 'Salary — TechNova Ltd', amount: 3200.00 },
  { id: 2, accountId: 101, date: '2026-10-05', desc: 'Transfer to HB-100102', amount: -250.00 },
  { id: 3, accountId: 101, date: '2026-10-12', desc: 'ATM withdrawal', amount: -120.00 },
  { id: 4, accountId: 102, date: '2026-10-05', desc: 'Transfer from HB-100101', amount: 250.00 },
  { id: 5, accountId: 102, date: '2026-10-09', desc: 'Card payment — grocery', amount: -64.50 },
  { id: 6, accountId: 201, date: '2026-10-02', desc: 'Salary — OrbitSoft', amount: 4100.00 },
  { id: 7, accountId: 201, date: '2026-10-11', desc: 'Interest credit', amount: 18.75 },
  { id: 8, accountId: 301, date: '2026-10-03', desc: 'Business receipts', amount: 1875.00 },
  { id: 9, accountId: 301, date: '2026-10-10', desc: 'Supplier payment', amount: -430.00 },
  { id: 10, accountId: 302, date: '2026-10-06', desc: 'Deposit — branch', amount: 5000.00 },
  { id: 11, accountId: 401, date: '2026-10-08', desc: 'Freelance payment', amount: 640.00 }
];
let payees = [
  { id: 1, ownerId: 3, name: 'Bob Hossain', bank: 'HexaBank', accNo: 'HB-100201' },
  { id: 2, ownerId: 3, name: 'City Electric Ltd', bank: 'OtherBank', accNo: 'EXT-88123' },
  { id: 3, ownerId: 4, name: 'Alice Rahman', bank: 'HexaBank', accNo: 'HB-100101' },
  { id: 4, ownerId: 5, name: 'Sunrise Properties', bank: 'OtherBank', accNo: 'EXT-55210' }
];
let loans = [
  { id: 1, ownerId: 3, type: 'Home Loan', principal: 45000, rate: 8.5, monthly: 552, status: 'Active' },
  { id: 2, ownerId: 4, type: 'Personal Loan', principal: 8000, rate: 11.9, monthly: 210, status: 'Active' },
  { id: 3, ownerId: 5, type: 'Auto Loan', principal: 18500, rate: 9.4, monthly: 385, status: 'Active' }
];
let nextUserId = 7, nextPayeeId = 5, nextLedgerId = 12;
const DAILY_LIMIT = 5000; /* published policy on the transfer page — see if the server enforces it */
function accountById(id) { return bankAccounts.find(a => a.id === id); }
function accountByNo(no) { return bankAccounts.find(a => a.accNo === no); }
function userById(id) { return users.find(u => u.id === id); }
function money(n) { return '$' + Number(n).toFixed(2); }

/* ====================== progress engine (§4) ====================== */
let progress = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const p = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      progress = Object.assign(progress, p);
    }
  } catch (e) { /* corrupted state file -> start fresh, never crash */ }
}
function saveProgress() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2)); } catch (e) {}
}
function pass(id) {
  if (!progress.tests[id]) {
    progress.tests[id] = true;
    if (TESTS.every(t => progress.tests[t.id])) {
      if (!progress.completedAt) progress.completedAt = new Date().toISOString();
      progress.keyRevealed = true;
    }
    saveProgress();
  }
}
function attempt(feature) {
  progress.attempts[feature] = (progress.attempts[feature] || 0) + 1;
  saveProgress();
}
function progressSummary() {
  const total = TESTS.length;
  const done = TESTS.filter(t => progress.tests[t.id]).length;
  const features = {};
  for (const f of FEATURES) {
    const ts = TESTS.filter(t => t.feature === f);
    features[f] = { total: ts.length, done: ts.filter(t => progress.tests[t.id]).length, attempts: progress.attempts[f] || 0 };
  }
  return { lab: LAB_NAME, number: LAB_NUMBER, total, done, pct: total ? Math.floor(done / total * 100) : 0, features, complete: done === total };
}

/* ===================== TESTS registry (§3) ===================== */
const FEATURES = [
  'Login & Authentication',
  'Registration & Profile',
  'Accounts & Statements',
  'Transfers',
  'Payees',
  'Loans',
  'Staff & Admin Panel',
  'Platform & API'
];
const TESTS = [
  /* ---------------- Login & Authentication ---------------- */
  { id: 'sqli-login', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03 Injection', difficulty: 'Beginner',
    hints: ['The online-banking login still talks to a legacy sign-on service that builds its query by gluing your email into a string.', 'A tautology in the email field makes the WHERE clause true for the very first row in the user table — who sits in row 1 of a bank\'s user table?', "Log in with the email: ' OR '1'='1' --  and any password."],
    lesson: 'String-built queries let attacker input change the meaning of the query itself; the first matching row (here the platform admin) is returned with no password check at all.',
    impact: 'On a real bank this is catastrophic: one crafted login reaches the most privileged account in the system — every customer balance, statement and transfer function behind it.',
    report: { title: 'SQL Injection in Online Banking Login (Authentication Bypass)', severity: 'Critical', remediation: 'Use parameterised queries everywhere; never build SQL by string concatenation; add regression tests with injection payloads on all auth endpoints.' },
    guide: 'Step by step: 1) Open the login page. 2) Enter the email \' OR \'1\'=\'1\' --  with any password. 3) The legacy query becomes true for the first user row and a session is issued — as the platform admin. 4) The test completes when that bypass session is created.' },
  { id: 'brute-force', feature: 'Login & Authentication', name: 'Brute Force — No Lockout or Throttle', owasp: 'A07 Authentication Failures', difficulty: 'Beginner',
    hints: ['Pick one customer account and keep guessing its password. Does anything slow down, CAPTCHA, or lock after repeated failures?', 'Banks are supposed to lock or throttle after a handful of failures. Count how many this one accepts.', 'Submit 10 wrong-password logins for alice@hexabank.local — the 10th is still processed normally.'],
    lesson: 'Without rate limiting or lockout, online password guessing is only a matter of time — credential lists make banking logins a prime target.',
    impact: 'A real attacker can grind through password lists against customer logins undisturbed; every weak customer password becomes a drained account.',
    report: { title: 'Missing Brute-Force Protection on Customer Login', severity: 'High', remediation: 'Add progressive delays, per-account and per-IP throttling, lockout with safe unlock, and alerting on credential-stuffing patterns.' },
    guide: 'Step by step: 1) Choose alice@hexabank.local. 2) Submit 10 login attempts with wrong passwords (a small curl loop works). 3) Every attempt is processed at full speed — nothing locks or slows. 4) The test completes at the 10th processed failure.' },
  { id: 'user-enumeration', feature: 'Login & Authentication', name: 'Customer Enumeration via Password Reset', owasp: 'A07 Authentication Failures', difficulty: 'Beginner',
    hints: ['Use "Forgot password" twice: once with an email that has an account, once with one that does not. Compare the two answers word for word.', 'A safe reset flow answers identically either way. This one does not.', 'Request a reset for alice@hexabank.local, then for nobody@nowhere.local — the different messages confirm which emails are real bank customers.'],
    lesson: 'Different responses for existing vs non-existing accounts hand attackers a verified customer list to aim phishing and password attacks at.',
    impact: 'Attackers harvest the bank\'s real customer emails from the reset form, then target exactly those people with phishing and credential stuffing.',
    report: { title: 'Account Enumeration via Password-Reset Responses', severity: 'Medium', remediation: 'Return one identical, generic message for every reset request regardless of whether the account exists.' },
    guide: 'Step by step: 1) POST /forgot with alice@hexabank.local — note the "reset link sent" message. 2) POST /forgot with a made-up email — note the different "no account" message. 3) Observing both answers completes the test: the difference is the leak.' },
  { id: 'default-creds', feature: 'Login & Authentication', name: 'Default Admin Credentials', owasp: 'A07 Authentication Failures', difficulty: 'Beginner',
    hints: ['Somewhere in this bank there is an administrative account that was never given a real password.', 'Try the most common admin password in the world against the admin mailbox.', 'Log in as admin@hexabank.local with the password admin123.'],
    lesson: 'Default and vendor-supplied credentials are public knowledge; any privileged account still using one is an open door with a welcome mat.',
    impact: 'The platform admin account — able to freeze customers and see everything — is protected by the first password every attacker tries.',
    report: { title: 'Default Credentials on Platform Admin Account', severity: 'Critical', remediation: 'Force unique, strong passwords at first setup; scan all privileged accounts for known default passwords and rotate them.' },
    guide: 'Step by step: 1) Go to the login page. 2) Sign in as admin@hexabank.local / admin123. 3) You are in as Platform Admin. The test completes on that login.' },
  { id: 'reset-token', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07 Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a reset for your own account and study the token format — it is computed, not random.', 'The token is a simple arithmetic function of the customer\'s numeric user ID.', 'Token = BNK-(userId × 211 + 17). The teller is user 2 — compute their token and reset their password without ever requesting a reset for them.'],
    lesson: 'Reset tokens must be high-entropy random values; a token derived from a public identifier (user ID) lets anyone reset anyone\'s password.',
    impact: 'An attacker who knows a victim\'s user ID — visible all over the app — can take over their bank account in one request, no email access needed.',
    report: { title: 'Predictable Password-Reset Tokens Allow Account Takeover', severity: 'Critical', remediation: 'Generate reset tokens from a CSPRNG (≥128 bits), store only a hash, expire them quickly and make them single-use.' },
    guide: 'Step by step: 1) Request a reset for your own account and note the token shape BNK-<number>. 2) Reverse the formula: number = userId × 211 + 17. 3) POST /reset for teller@hexabank.local (user 2) with the computed token and a new password — never having requested it. 4) The change is accepted; the test completes.' },
  { id: 'cookie-role', feature: 'Login & Authentication', name: 'Session Cookie Role Tampering', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Your session cookie is just base64 JSON — decode it and read what it claims about you.', 'The admin panel trusts the role written inside the cookie instead of the role stored on your account.', 'Decode hx_sess, change "role" to "admin", re-encode, and open /admin as an ordinary customer.'],
    lesson: 'Authorisation data must live server-side; anything the client can edit — including a role inside their own cookie — will be edited.',
    impact: 'Every customer can promote themselves to admin by editing a cookie, reaching the panel that can freeze accounts and list every customer.',
    report: { title: 'Client-Controlled Role in Session Cookie Enables Privilege Escalation', severity: 'Critical', remediation: 'Keep roles server-side in the session store; if claims travel in a cookie, sign them (HMAC) and verify before trusting any field.' },
    guide: 'Step by step: 1) Log in as any customer and copy the hx_sess cookie. 2) Base64-decode it — it is plain JSON with your role. 3) Change role to admin, re-encode, replace the cookie. 4) Open /admin — the panel opens for a customer account. The test completes.' },

  /* ---------------- Registration & Profile ---------------- */
  { id: 'weak-password', feature: 'Registration & Profile', name: 'Weak Password Policy at Registration', owasp: 'A07 Authentication Failures', difficulty: 'Beginner',
    hints: ['Open a new online-banking account and try the shortest, simplest password the form will accept.', 'A bank should demand length and complexity. This one demands almost nothing.', 'Register with the password "abc" — it is accepted.'],
    lesson: 'Password policy is set at registration; if 3-character passwords are allowed, brute force and guessing become trivial against those accounts.',
    impact: 'Customers who choose weak passwords (many will) get accounts that fall to the first guessing attempt — and the bank wears the fraud losses.',
    report: { title: 'No Minimum Password Strength for New Banking Accounts', severity: 'Medium', remediation: 'Enforce a modern password policy (length ≥ 12, breached-password screening) at registration and password change.' },
    guide: 'Step by step: 1) Open /register. 2) Create an account with a 3-character password such as abc. 3) The account is created without complaint. The test completes.' },
  { id: 'mass-assignment', feature: 'Registration & Profile', name: 'Mass Assignment — Self-Appointed Staff / Premium Tier', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration handler copies every submitted field onto the new account record — including fields the form never shows.', 'What fields does a bank account record have that you should never control? Think role and tier.', 'Register while adding the extra form fields role=staff (or tier=premium) — the new account is created with them.'],
    lesson: 'Binding request bodies directly to data models lets attackers set privileged fields (role, tier, balance) that the UI never offered.',
    impact: 'Attackers mint themselves staff accounts or premium-tier accounts at will — insider access and fee-free premium banking without any approval.',
    report: { title: 'Mass Assignment in Registration Allows Role/Tier Escalation', severity: 'High', remediation: 'Whitelist assignable fields explicitly on registration; set role and tier server-side only.' },
    guide: 'Step by step: 1) Submit the registration form with extra fields role=staff or tier=premium added to the POST body. 2) Log in with the new account. 3) It carries the staff role / premium tier you assigned yourself. The test completes.' },
  { id: 'stored-xss-profile', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03 Injection', difficulty: 'Beginner',
    hints: ['Your display name is printed back on pages other people see — including staff. Is it escaped anywhere?', 'Set your name to something that is not just text.', 'Save your profile with the display name <script>alert(1)</script> — it is stored and reflected raw.'],
    lesson: 'User-controlled names must be output-encoded everywhere they render; a name field is a classic stored-XSS carrier because it is shown to staff and other users.',
    impact: 'A customer plants script in their own name; when a teller or admin opens the customer list, the script runs in the bank\'s origin with their session.',
    report: { title: 'Stored Cross-Site Scripting via Customer Display Name', severity: 'High', remediation: 'Output-encode all user data at render time and validate name fields against a strict character whitelist.' },
    guide: 'Step by step: 1) Log in and open /profile. 2) Set your display name to <script>alert(1)</script> and save. 3) The payload is stored and rendered unescaped. The test completes on save.' },
  { id: 'csrf-profile', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The profile form carries a hidden _origin marker that ties the submit to this site. What happens if a POST arrives without it?', 'Nothing checks the marker on the server.', 'POST /profile with a new name and NO _origin field — the change is applied anyway.'],
    lesson: 'State-changing forms need server-verified anti-CSRF tokens; a hidden field that is never checked is decoration, not protection.',
    impact: 'Any website a logged-in customer visits can silently rewrite their profile (name, phone) — the first step in social-engineering the bank\'s own support desk.',
    report: { title: 'Missing CSRF Validation on Profile Update', severity: 'Medium', remediation: 'Verify a per-session anti-CSRF token server-side on every state-changing request; reject requests that lack it.' },
    guide: 'Step by step: 1) While logged in, POST /profile directly (curl) with a new name and no _origin field. 2) The profile changes. 3) The test completes when a marker-less update is applied.' },

  /* ---------------- Accounts & Statements ---------------- */
  { id: 'account-idor', feature: 'Accounts & Statements', name: 'Account Details IDOR', owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    hints: ['Your account pages live at /accounts/<id>. The ids are small sequential numbers.', 'The page checks that you are logged in — but does it check the account is yours?', 'Log in as Alice (accounts 101/102) and open /accounts/201 — Bob\'s savings account, balance and all.'],
    lesson: 'Every object reference needs an ownership check; sequential IDs plus login-only checks expose every customer\'s accounts to every other customer.',
    impact: 'Any customer can browse every other customer\'s balances — a full map of who holds what money at the bank, ready for targeted fraud.',
    report: { title: 'Insecure Direct Object Reference on Account Details', severity: 'High', remediation: 'Authorise every account read against the session customer (owner, joint holder, or staff with a business need); log cross-customer access attempts.' },
    guide: 'Step by step: 1) Log in as Alice. 2) Open /accounts/201. 3) Bob\'s account details render for you. The test completes when a foreign account is served.' },
  { id: 'statement-idor', feature: 'Accounts & Statements', name: 'Statement IDOR — Read Another Customer\'s Statement', owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    hints: ['Statements live at /statement/<accountId> and follow the same pattern as the account pages.', 'A statement is far richer than a balance: every transaction, salary credit and payment.', 'As Alice, open /statement/201 — Bob\'s full transaction history.'],
    lesson: 'Statements are among the most sensitive documents a bank holds; they need the same ownership enforcement as the account itself, on every route that produces them.',
    impact: 'Attackers harvest full transaction histories — employers, income, spending habits — perfect raw material for identity theft and convincing phishing.',
    report: { title: 'Insecure Direct Object Reference on Account Statements', severity: 'High', remediation: 'Enforce account ownership on statement generation exactly as on account reads; audit statement access.' },
    guide: 'Step by step: 1) Log in as Alice. 2) Open /statement/201. 3) Bob\'s statement renders. The test completes when a foreign statement is served.' },
  { id: 'statement-export', feature: 'Accounts & Statements', name: 'Statement CSV Export of Another Customer', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The CSV export at /export/statement.csv?account=<id> was built for staff convenience and forgotten.', 'It takes the account id straight from the query string.', 'As any customer, request /export/statement.csv?account=301 — Carol\'s statement downloads as CSV.'],
    lesson: 'Export endpoints are high-value targets: they package sensitive data for bulk theft, and they are frequently left without the checks the UI pages got.',
    impact: 'One request per account id downloads the bank\'s entire customer statement history in machine-readable form — bulk data theft, scripted in minutes.',
    report: { title: 'Unauthorised Statement Export (CSV) for Arbitrary Accounts', severity: 'High', remediation: 'Apply the same ownership authorisation to export/download endpoints as to on-screen views; rate-limit and log exports.' },
    guide: 'Step by step: 1) Log in as any customer. 2) GET /export/statement.csv?account=301. 3) A CSV of Carol\'s transactions downloads. The test completes when a foreign statement is exported.' },

  /* ---------------- Transfers ---------------- */
  { id: 'transfer-limit', feature: 'Transfers', name: 'Daily Transfer Limit Not Enforced', owasp: 'A04 Insecure Design', difficulty: 'Beginner',
    hints: ['The transfer page proudly states a $5,000 daily online limit. Policies printed in HTML are not controls.', 'Try sending more than the limit in a single transfer between your own accounts.', 'As Alice, transfer $6,000 from HB-100101 to HB-100102 — it goes through.'],
    lesson: 'Business limits must be enforced server-side at the moment of the transaction; a limit that exists only in page copy protects nothing.',
    impact: 'A compromised customer account can be emptied in one transfer instead of being slowed by the daily cap — the limit was the bank\'s last line of defence.',
    report: { title: 'Server-Side Transfer Limit Missing (Policy Stated, Not Enforced)', severity: 'High', remediation: 'Enforce per-customer daily transfer limits server-side, calculated across all channels, before any funds move.' },
    guide: 'Step by step: 1) Log in as Alice. 2) POST /transfer moving $6,000 from account 101 to account 102 (both hers). 3) The transfer completes despite the stated $5,000 daily limit. The test completes.' },
  { id: 'transfer-negative', feature: 'Transfers', name: 'Negative-Amount Transfer Creates Money', owasp: 'A04 Insecure Design', difficulty: 'Intermediate',
    hints: ['The amount field is trusted arithmetic. What does "transfer -$500" do to each side of the ledger?', 'Nobody validates that the amount is positive.', 'POST /transfer with amount -500 between your own accounts — the source balance goes UP.'],
    lesson: 'Financial inputs need strict validation (positive, within balance, within limits) before any ledger arithmetic runs; signed amounts invert the flow of money.',
    impact: 'Customers mint money from nothing: a negative transfer credits the sender. At scale this is direct theft from the bank\'s own ledger.',
    report: { title: 'Negative Transfer Amounts Reverse Fund Flow (Money Creation)', severity: 'Critical', remediation: 'Reject non-positive amounts server-side; re-verify source balance and limits inside the transfer transaction.' },
    guide: 'Step by step: 1) Log in as Alice. 2) POST /transfer with amount -500 from 101 to 102. 3) Account 101\'s balance increases by $500. The test completes when the negative transfer is applied.' },
  { id: 'transfer-idor-source', feature: 'Transfers', name: 'Transfer Out of Another Customer\'s Account', owasp: 'A01 Broken Access Control', difficulty: 'Advanced',
    hints: ['The transfer form only OFFERS your own accounts in the dropdown — but the server accepts whatever "from" id is posted.', 'The server never checks that the source account belongs to the logged-in customer.', 'As Alice, POST /transfer with from=201 (Bob\'s account) to=101 amount=100 — Bob pays.'],
    lesson: 'Ownership must be verified on the SOURCE of funds, not just the destination; form dropdowns are not authorisation.',
    impact: 'Any customer can move money out of any other customer\'s account into their own. This is the single most direct theft a banking app can allow.',
    report: { title: 'Missing Ownership Check on Transfer Source Account', severity: 'Critical', remediation: 'Verify the authenticated customer owns (or is mandated on) the source account inside the transfer handler; reject and alert otherwise.' },
    guide: 'Step by step: 1) Log in as Alice. 2) POST /transfer with from=201, to=101, amount=100, including the _origin marker from the form. 3) $100 leaves Bob\'s account for Alice\'s. The test completes.' },
  { id: 'transfer-csrf', feature: 'Transfers', name: 'CSRF on Fund Transfer', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The transfer form carries the _origin marker — but does the money-moving endpoint actually verify it?', 'A transfer is the most sensitive POST in the app. Test it the same way as the profile.', 'POST /transfer (small amount, your own accounts) with NO _origin field — the money still moves.'],
    lesson: 'If transfers can be triggered cross-site, any page a customer visits while logged in can move their money; anti-CSRF verification must be strictest on financial actions.',
    impact: 'A malicious link or ad silently transfers funds out of a logged-in customer\'s account — no password, no interaction beyond a page view.',
    report: { title: 'Missing CSRF Validation on Fund Transfers', severity: 'Critical', remediation: 'Require and verify anti-CSRF tokens on all money-movement endpoints; consider step-up confirmation for new payees and large amounts.' },
    guide: 'Step by step: 1) While logged in as Alice, POST /transfer directly with curl — own accounts, $10, and no _origin field. 2) The transfer is applied. 3) The test completes when a marker-less transfer moves money.' },

  /* ---------------- Payees ---------------- */
  { id: 'payee-idor', feature: 'Payees', name: 'Delete Another Customer\'s Payee', owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    hints: ['Payee delete posts to /payees/<id>/delete. Payee ids are sequential, starting at 1.', 'The handler deletes first and never asks whose payee it was.', 'As Bob, delete payee 1 — Alice\'s payee "Bob Hossain" disappears from HER list.'],
    lesson: 'Destructive actions on user-owned objects need the same ownership check as reads; otherwise attackers vandalise or sabotage other customers\' banking setup.',
    impact: 'Attackers wipe a victim\'s saved payees — rent, salary and supplier payments fail, and a fake replacement payee can be planted in the confusion.',
    report: { title: 'Insecure Direct Object Reference on Payee Deletion', severity: 'Medium', remediation: 'Scope every payee read/write/delete to the owning customer; return 404 for foreign payee ids.' },
    guide: 'Step by step: 1) Log in as Bob. 2) POST /payees/1/delete. 3) Payee 1 (owned by Alice) is deleted. The test completes when a foreign payee is removed.' },
  { id: 'payee-xss', feature: 'Payees', name: 'Stored XSS in Payee Name', owasp: 'A03 Injection', difficulty: 'Beginner',
    hints: ['Payee names render in your payee list and in staff views. They are stored exactly as typed.', 'A payee name does not have to be a name.', 'Add a payee named <script>alert(1)</script> — it is stored and rendered raw.'],
    lesson: 'Any free-text field that is displayed later is a stored-XSS candidate; payee names are shown to the owner and to staff reviewing payments.',
    impact: 'A scripted payee name fires in the browser of anyone reviewing the payments — including tellers — inside the bank\'s trusted origin.',
    report: { title: 'Stored Cross-Site Scripting via Payee Name', severity: 'High', remediation: 'Output-encode payee names at render; restrict payee names to a safe character set at input.' },
    guide: 'Step by step: 1) Log in and open /payees. 2) Add a payee with the name <script>alert(1)</script>. 3) It is stored and reflected unescaped in the list. The test completes.' },

  /* ---------------- Loans ---------------- */
  { id: 'loan-idor', feature: 'Loans', name: 'Loan Summary IDOR', owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    hints: ['Loan pages live at /loans/<id> with the usual small sequential ids.', 'Your loan summary shows principal, rate and repayments — would you want another customer reading yours?', 'As Alice (loan 1), open /loans/2 — Bob\'s personal loan in full.'],
    lesson: 'Loan records reveal income stress, debts and assets; they require the same per-object ownership checks as accounts and statements.',
    impact: 'Customers can map each other\'s debts — who is over-extended, who just borrowed — prime material for scams and extortion.',
    report: { title: 'Insecure Direct Object Reference on Loan Summaries', severity: 'High', remediation: 'Authorise loan reads against the borrowing customer or mandated staff; log cross-customer access.' },
    guide: 'Step by step: 1) Log in as Alice. 2) Open /loans/2. 3) Bob\'s loan summary renders for you. The test completes when a foreign loan is served.' },
  { id: 'loan-tamper', feature: 'Loans', name: 'Customer Rewrites Own Loan Interest Rate', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The loan page carries a "staff adjustment" form for the interest rate. The form is visible on the page — but who is allowed to USE it?', 'The endpoint never checks that the caller is staff.', 'As Alice, POST /loans/1/rate with rate=0.1 — your home loan now costs almost nothing.'],
    lesson: 'Hiding a control in the UI is not authorisation; privileged mutations must check the caller\'s role server-side on every request.',
    impact: 'Borrowers set their own interest rate to near zero — direct revenue theft from the bank, hidden inside a legitimate-looking staff function.',
    report: { title: 'Missing Role Check on Loan Rate Adjustment (Staff Function)', severity: 'Critical', remediation: 'Require staff role server-side for all loan-term mutations; dual-approve rate changes and audit them.' },
    guide: 'Step by step: 1) Log in as Alice (a customer). 2) POST /loans/1/rate with rate=0.1. 3) The rate on her home loan changes. The test completes when a customer successfully adjusts a loan rate.' },

  /* ---------------- Staff & Admin Panel ---------------- */
  { id: 'staff-access', feature: 'Staff & Admin Panel', name: 'Customers Reach the Staff Console', owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    hints: ['There is a staff console at /staff listing every customer and account. It checks that SOMEONE is logged in.', 'It never checks that the someone is staff.', 'Log in as any customer and open /staff — the full customer list renders.'],
    lesson: 'Role checks must be explicit on every restricted route; "logged in" is not "authorised", especially on staff tooling.',
    impact: 'Every customer can open the staff console and browse the bank\'s entire customer and account list — the reconnaissance jackpot for fraud.',
    report: { title: 'Broken Access Control on Staff Console (Any Customer Can Enter)', severity: 'Critical', remediation: 'Enforce staff/admin role server-side on all staff routes; deny by default and test each role against each route.' },
    guide: 'Step by step: 1) Log in as an ordinary customer (Alice). 2) Open /staff. 3) The staff console renders with all customers and accounts. The test completes.' },
  { id: 'staff-search-xss', feature: 'Staff & Admin Panel', name: 'Reflected XSS in Staff Customer Search', owasp: 'A03 Injection', difficulty: 'Beginner',
    hints: ['The staff customer search echoes your query into the results page: "Results for …".', 'Echoed input that is not encoded is reflected XSS.', 'Open /staff/search?q=<script>alert(1)</script> — the payload comes back raw in the page.'],
    lesson: 'Reflected input must be output-encoded; search boxes on internal tools are a reliable way to fire script inside a staff member\'s session.',
    impact: 'An attacker sends a teller a crafted search link; the script runs as the teller, inside the staff console, with staff powers attached.',
    report: { title: 'Reflected Cross-Site Scripting in Staff Customer Search', severity: 'High', remediation: 'Output-encode the reflected query and all result fields; add a Content-Security-Policy as defence in depth.' },
    guide: 'Step by step: 1) While logged in, open /staff/search?q=<script>alert(1)</script>. 2) The page reflects the payload unescaped. 3) The test completes when the payload is reflected.' },
  { id: 'admin-csrf', feature: 'Staff & Admin Panel', name: 'CSRF on Admin Account Freeze', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The admin panel can freeze a customer\'s login with one POST. The form\'s _origin marker is, again, never verified.', 'If you hold an admin session (see the cookie test), a marker-less POST will still freeze the account.', 'As admin, POST /admin/users/4/freeze with no _origin — Bob is frozen out of his account.'],
    lesson: 'High-impact admin actions need verified anti-CSRF tokens (and ideally re-authentication); otherwise any page an admin views can weaponise their session.',
    impact: 'A booby-trapped page freezes customers en masse while the admin browses — a denial-of-service against the bank\'s whole customer base.',
    report: { title: 'Cross-Site Request Forgery on Admin Account Freeze', severity: 'High', remediation: 'Verify anti-CSRF tokens on all admin mutations; require step-up re-authentication for account freeze/unfreeze.' },
    guide: 'Step by step: 1) Hold an admin session (real admin login, or the forged cookie from the cookie-role test). 2) POST /admin/users/4/freeze with no _origin field. 3) Bob\'s account is frozen. The test completes when the marker-less freeze is applied.' },

  /* ---------------- Platform & API ---------------- */
  { id: 'api-token', feature: 'Platform & API', name: 'Predictable API Token & Unscoped Account API', owasp: 'A07 Authentication Failures', difficulty: 'Advanced',
    hints: ['Your profile page shows your API token. Look at its shape: hb_ plus base64 of something you already know.', 'If tokens are derived from email addresses, every customer\'s token is public knowledge. And the API does not scope its answer.', 'Compute the token for carol@hexabank.local and call GET /api/accounts with header X-API-Key — accounts from every customer come back.'],
    lesson: 'API credentials must be high-entropy and random, and every API response must be scoped to the authenticated customer; a derived token plus an unscoped query is total exposure.',
    impact: 'Anyone who knows a customer\'s email (public) owns their API access — and the API hands over every customer\'s accounts and balances, not just theirs.',
    report: { title: 'Predictable API Tokens and Missing Customer Scoping in Account API', severity: 'Critical', remediation: 'Issue random, revocable API keys (hashed at rest); enforce per-customer scoping on every API query.' },
    guide: 'Step by step: 1) See your own token pattern on /profile: hb_ + base64(your email). 2) Derive Carol\'s token from carol@hexabank.local the same way. 3) GET /api/accounts with that X-API-Key. 4) Accounts belonging to other customers are included. The test completes.' },
  { id: 'debug-exposure', feature: 'Platform & API', name: 'Debug Endpoint Dumps Customer Passwords', owasp: 'A05 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['A leftover /debug endpoint answers any logged-in user with the bank\'s internal state.', 'Internal state here includes the full user table — passwords in plain text.', 'Log in as any customer and open /debug.'],
    lesson: 'Debug and diagnostic endpoints must never ship to production; when they expose credential material, one request compromises every account at once.',
    impact: 'One click hands an attacker every customer\'s and staff member\'s password in clear text — total bank-wide account takeover.',
    report: { title: 'Debug Endpoint Exposes All User Credentials', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; never store or display plaintext passwords; audit for other diagnostic routes.' },
    guide: 'Step by step: 1) Log in as any ordinary customer. 2) Open /debug. 3) The JSON dump includes every user with their plaintext password. The test completes when a non-admin receives the dump.' }
];

/* --------- remaining key fragments (see note at top of file) --------- */
const _eB = ['LVlVUg==', 'OFJGRg==', 'TVREUQ=='];
const _cB = ['LTUyNQ==', 'UlNHNg==', 'SFZVUQ=='];
function entryKey() { return _un(_eA.concat(_eB)); }
function completionKey() { return _un(_cA.concat(_cB)); }

/* ============================ helpers ============================ */
const XSS_RE = /<\s*script|on\w+\s*=|<\s*svg|<\s*iframe|javascript\s*:/i;
const SQLI_RE = /'\s*(or|and)\s+('?\d+'?\s*=\s*'?\d+|true)|'\s*or\s*'[^']*'\s*=\s*'|union\s+select/i;
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function parseBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) { req.destroy(); } });
    req.on('end', () => {
      const out = {};
      try {
        for (const pair of data.split('&')) {
          if (!pair) continue;
          const i = pair.indexOf('=');
          const k = decodeURIComponent(pair.slice(0, i).replace(/\+/g, ' '));
          const v = decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' '));
          out[k] = v;
        }
      } catch (e) {}
      resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}
function readRaw(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) { req.destroy(); } });
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(''));
  });
}
function cookies(req) {
  const out = {};
  const h = req.headers.cookie || '';
  for (const part of h.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
/* Session = base64 JSON cookie the client can read (and rewrite — see cookie-role test). */
function makeSession(user) {
  return Buffer.from(JSON.stringify({ uid: user.id, role: user.role }), 'utf8').toString('base64');
}
function originMarkerFor(user) { return 'org' + user.id + 'x7k'; }
function loginHeaders(user) {
  return { 'Set-Cookie': [
    'hx_sess=' + makeSession(user) + '; Path=/; HttpOnly',
    'hx_origin=' + originMarkerFor(user) + '; Path=/'
  ] };
}
function getSession(req) {
  const c = cookies(req);
  if (!c.hx_sess) return null;
  try {
    const s = JSON.parse(Buffer.from(c.hx_sess, 'base64').toString('utf8'));
    const dbUser = users.find(u => u.id === s.uid && u.active);
    if (!dbUser) return null;
    return { user: dbUser, cookieRole: s.role };
  } catch (e) { return null; }
}
function apiTokenFor(user) { return 'hb_' + Buffer.from(user.email, 'utf8').toString('base64'); }
function resetTokenFor(user) { return 'BNK-' + (user.id * 211 + 17); }
const issuedResetTokens = new Set();
const loginFails = {};
const forgotOutcomes = {};

/* ============================ chatbot (§6) ============================ */
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
const FEATURE_WORDS = [
  ['Login & Authentication', ['login', 'auth', 'password', 'brute', 'reset', 'session', 'cookie', 'sqli', 'enumerat']],
  ['Registration & Profile', ['register', 'registration', 'signup', 'sign up', 'profile', 'mass assignment', 'tier']],
  ['Accounts & Statements', ['account', 'statement', 'balance', 'export', 'csv']],
  ['Transfers', ['transfer', 'limit', 'negative', 'move money', 'send money']],
  ['Payees', ['payee', 'beneficiar']],
  ['Loans', ['loan', 'interest', 'rate', 'borrow']],
  ['Staff & Admin Panel', ['staff', 'admin', 'console', 'freeze', 'search']],
  ['Platform & API', ['api', 'token', 'debug', 'platform']]
];
function chatReply(raw) {
  const msg = String(raw || '').toLowerCase();
  const sum = progressSummary();
  if (/(who built|who made|who created|founder|who is jony|built this|made this)/.test(msg)) return ATTRIBUTION;
  if (/(key|unlock|next lab)/.test(msg)) {
    if (sum.complete && progress.keyRevealed) {
      return 'You completed LAB ' + LAB_NUMBER + ' 100% — well earned. The completion key is: ' + completionKey() + ' — paste it into the next lab to unlock it.';
    }
    return "I don't have the completion key yet — nobody does. It is only given to me when this lab is completed 100%. Right now you are at " + sum.pct + '% (' + sum.done + '/' + sum.total + ' tests). Finish every test and the key will be revealed on the completion page — and I will be able to share it too.';
  }
  let feature = null;
  for (const [f, words] of FEATURE_WORDS) {
    if (words.some(w => msg.includes(w))) { feature = f; break; }
  }
  const wantsHow = /(how|guide|help|solve|do|bypass|exploit|walkthrough|steps)/.test(msg);
  if (feature && /(how many|count|list|which|what tests|vulnerabilit)/.test(msg) && !wantsHow) {
    const ts = TESTS.filter(t => t.feature === feature);
    return feature + ' has ' + ts.length + ' tests: ' + ts.map(t => t.name + (progress.tests[t.id] ? ' ✓' : '')).join('; ') + '. Attempts so far on this feature: ' + (progress.attempts[feature] || 0) + '.';
  }
  if (feature && wantsHow) {
    const att = progress.attempts[feature] || 0;
    const ts = TESTS.filter(t => t.feature === feature);
    const open = ts.filter(t => !progress.tests[t.id]);
    if (att >= 3 || open.length === 0) {
      if (open.length === 0) return 'You have already completed every test in ' + feature + '. ' + sum.pct + '% overall — ' + (sum.complete ? 'lab complete!' : 'keep going with the remaining features on /tests.');
      return 'Here is the guided help for ' + feature + ':\n' + open.map(t => '• ' + t.name + ': ' + t.guide).join('\n');
    }
    return 'That feature is locked for help. First try the ' + feature + " tests yourself at least 3 times — I can see you've tried " + att + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  if (/(progress|status|score|percent|left|remaining)/.test(msg)) {
    const next = TESTS.find(t => !progress.tests[t.id]);
    return 'Current progress: ' + sum.done + '/' + sum.total + ' tests (' + sum.pct + '%). ' + (next ? 'Next open test: "' + next.name + '" in ' + next.feature + ' — see /tests for hints.' : 'Lab complete! Open /complete for your debrief and key.');
  }
  if (/(hi|hello|hey|help|start)/.test(msg)) {
    return 'Hello — I am the Lab Coach for LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '. This lab has ' + TESTS.length + ' tests across ' + FEATURES.length + ' features, and you are at ' + sum.pct + '%. Ask me how many tests a feature has (free), or try a feature at least 3 times and then ask me how to solve it. The map lives on /tests.';
  }
  return 'I can explain this lab\'s features and test counts, report your progress, and — after you have tried a feature at least 3 times — guide you through its tests step by step. Try asking: "how many tests in Transfers?" or "what is my progress?"';
}

/* ============================ UI shell (§5) ============================ */
function layout(req, title, body, sess) {
  const sum = progressSummary();
  const bar = '<div style="background:#1d2333;color:#e8ebf4;padding:8px 16px;display:flex;align-items:center;gap:14px;font-family:Arial,sans-serif">' +
    '<img src="/logo.png" alt="HexaCyberLab" style="height:30px">' +
    '<strong>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</strong>' +
    '<span>' + sum.done + '/' + sum.total + ' tests · ' + sum.pct + '%</span>' +
    '<span style="flex:1;background:#333a52;border-radius:6px;height:10px;overflow:hidden"><span style="display:block;height:100%;width:' + sum.pct + '%;background:linear-gradient(90deg,#4f7cff,#9b5cff)"></span></span>' +
    '<a style="color:#9fc1ff" href="/tests">🎯 Tests</a>' +
    (sess ? '<a style="color:#9fc1ff" href="/complete">🏁 Complete</a><a style="color:#9fc1ff" href="/logout">Logout</a>' : '') +
    '</div>';
  const nav = sess ? '<div style="background:#eef1f8;padding:8px 16px;font-family:Arial,sans-serif;font-size:14px">' +
    '<a href="/">My Accounts</a> · <a href="/transfer">Transfer</a> · <a href="/payees">Payees</a> · <a href="/loans">Loans</a> · <a href="/profile">Profile</a> · <a href="/staff">Staff Console</a> · <a href="/admin">Admin</a>' +
    ' <span style="color:#667">(' + esc(sess.user.email) + ' — ' + esc(sess.user.role) + ')</span></div>' : '';
  const chat = '<div id="hxchat" style="position:fixed;right:16px;bottom:16px;width:330px;font-family:Arial,sans-serif;z-index:99">' +
    '<div style="background:#1d2333;color:#fff;padding:8px 12px;border-radius:10px 10px 0 0;cursor:pointer" onclick="var b=document.getElementById(\'hxchatbody\');b.style.display=b.style.display===\'none\'?\'block\':\'none\'">🤖 Lab Coach — click to chat</div>' +
    '<div id="hxchatbody" style="display:none;background:#fff;border:1px solid #ccd;border-radius:0 0 10px 10px;padding:10px;box-shadow:0 6px 24px rgba(0,0,0,.25)">' +
    '<div id="hxlog" style="height:190px;overflow:auto;font-size:13px;margin-bottom:8px"></div>' +
    '<div style="display:flex;gap:6px"><input id="hxin" style="flex:1;padding:6px" placeholder="Ask the coach…"><button onclick="hxSend()">Send</button></div></div></div>' +
    '<script>async function hxSend(){var i=document.getElementById("hxin"),l=document.getElementById("hxlog");var m=i.value.trim();if(!m)return;i.value="";l.innerHTML+="<div><b>You:</b> "+m.replace(/</g,"&lt;")+"</div>";var r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:m})});var j=await r.json();l.innerHTML+="<div style=\\"margin:6px 0\\"><b>Coach:</b> "+j.reply.replace(/</g,"&lt;").replace(/\\n/g,"<br>")+"</div>";l.scrollTop=l.scrollHeight;}</script>';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + ' · LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</title></head>' +
    '<body style="margin:0;font-family:Arial,sans-serif;background:#f6f7fb;color:#1c2130">' + bar + nav +
    '<div style="max-width:980px;margin:0 auto;padding:20px 16px 90px">' + body + '</div>' + chat + '</body></html>';
}
function gatePage(req, err) {
  const body = '<div style="max-width:520px;margin:60px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:28px;text-align:center">' +
    '<img src="/logo.png" style="height:56px"><h2>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h2>' +
    '<p>This lab is locked. Paste the completion key from Lab ' + PREV_LAB + ' to start.</p>' +
    (err ? '<p style="color:#c0392b">' + esc(err) + '</p>' : '') +
    '<form method="POST" action="/unlock"><input name="key" style="padding:9px;width:80%" placeholder="Completion key from Lab ' + PREV_LAB + '"><br><br>' +
    '<button style="padding:10px 22px">Unlock LAB ' + LAB_NUMBER + '</button></form></div>';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' · Locked</title></head><body style="margin:0;background:#14141d;font-family:Arial,sans-serif">' + body + '</body></html>';
}
function send(res, code, html, headers) {
  res.writeHead(code, Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, headers || {}));
  res.end(html);
}
function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj, null, 2));
}
function redirect(res, to, headers) { res.writeHead(302, Object.assign({ Location: to }, headers || {})); res.end(); }
function originOk(req, body) {
  const c = cookies(req);
  return body && body._origin && c.hx_origin && body._origin === c.hx_origin;
}
function originField(req) {
  const c = cookies(req);
  return '<input type="hidden" name="_origin" value="' + esc(c.hx_origin || '') + '">';
}
function tsHints(t, lvl) {
  let out = '';
  for (let i = 0; i < 3; i++) {
    if (lvl > i) out += '<div style="color:#555;font-size:13px">💡 Hint ' + (i + 1) + ': ' + esc(t.hints[i]) + '</div>';
    else { out += '<div style="font-size:13px"><a href="/tests?h_' + t.id + '=' + (i + 1) + '">Reveal hint ' + (i + 1) + '</a></div>'; break; }
  }
  return out;
}

/* ============================ routes ============================ */
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://127.0.0.1');
    const p = u.pathname;
    const method = req.method;

    if (p === '/logo.png') {
      try {
        const img = fs.readFileSync(path.join(DIR, 'logo.png'));
        res.writeHead(200, { 'Content-Type': 'image/png' });
        return res.end(img);
      } catch (e) { return send(res, 404, 'no logo'); }
    }

    if (p === '/unlock' && method === 'POST') {
      const b = await parseBody(req);
      if ((b.key || '').trim() === entryKey()) {
        progress.unlocked = true; saveProgress();
        return redirect(res, '/');
      }
      return send(res, 403, gatePage(req, 'That key was not accepted.'));
    }
    if (!progress.unlocked) return send(res, 200, gatePage(req));

    if (p === '/api/progress') {
      return sendJson(res, 200, progressSummary());
    }
    if (p === '/api/chat' && method === 'POST') {
      let msg = '';
      try { msg = JSON.parse(await readRaw(req)).message || ''; } catch (e) {}
      return sendJson(res, 200, { reply: chatReply(msg) });
    }

    /* ---------- JSON API (token auth, deliberately unscoped) ---------- */
    if (p === '/api/accounts') {
      attempt('Platform & API');
      const key = req.headers['x-api-key'] || '';
      const apiUser = users.find(x => apiTokenFor(x) === key && x.active);
      if (!apiUser) return sendJson(res, 401, { error: 'invalid API key' });
      /* VULN: response is not scoped to the token owner — every customer's accounts */
      const data = bankAccounts.map(a => ({ id: a.id, accNo: a.accNo, owner: (userById(a.ownerId) || {}).email, type: a.type, balance: a.balance, status: a.status }));
      if (data.some(d => d.owner !== apiUser.email)) pass('api-token');
      return sendJson(res, 200, { requestedBy: apiUser.email, accounts: data });
    }

    const sess = getSession(req);
    const needLogin = () => redirect(res, '/login');

    /* ---------- auth pages ---------- */
    if (p === '/login') {
      if (method === 'POST') {
        const b = await parseBody(req);
        attempt('Login & Authentication');
        const email = (b.email || '').trim();
        const password = b.password || '';
        /* VULN: legacy sign-on builds its lookup by string concatenation */
        if (SQLI_RE.test(email)) {
          const first = users.find(x => x.active);
          if (first) { pass('sqli-login'); return redirect(res, '/', loginHeaders(first)); }
        }
        const user = users.find(x => x.email === email && x.active);
        if (!user || user.password !== password) {
          loginFails[email] = (loginFails[email] || 0) + 1;
          if (loginFails[email] >= 10) pass('brute-force'); /* VULN: 10th failure still processed — no lockout/throttle */
          return send(res, 200, layout(req, 'Login', '<h2>🏦 HexaBank Online Banking</h2><p style="color:#c0392b">Invalid email or password.</p>' + loginForm(), null));
        }
        if (user.email === 'admin@hexabank.local' && password === 'admin123') pass('default-creds');
        return redirect(res, '/', loginHeaders(user));
      }
      if (sess) return redirect(res, '/');
      return send(res, 200, layout(req, 'Login', '<h2>🏦 HexaBank Online Banking</h2><p>Welcome to HexaBank — the simulated bank for security practice. All accounts and money here are fake.</p>' + loginForm() + '<p>No account yet? <a href="/register">Open an account</a> · <a href="/forgot">Forgot password</a></p>', null));
    }
    function loginForm() {
      return '<form method="POST" action="/login" style="background:#fff;border:1px solid #dde;border-radius:10px;padding:18px;max-width:420px">' +
        'Email<br><input name="email" style="padding:8px;width:95%"><br><br>Password<br><input name="password" type="password" style="padding:8px;width:95%"><br><br>' +
        '<button style="padding:10px 22px">Sign in</button></form>';
    }
    if (p === '/logout') {
      return redirect(res, '/login', { 'Set-Cookie': ['hx_sess=; Path=/; Max-Age=0', 'hx_origin=; Path=/; Max-Age=0'] });
    }
    if (p === '/register') {
      if (method === 'POST') {
        const b = await parseBody(req);
        attempt('Registration & Profile');
        const email = (b.email || '').trim();
        if (!email || users.some(x => x.email === email)) {
          return send(res, 200, layout(req, 'Register', '<h2>Open an account</h2><p style="color:#c0392b">That email is already registered (or empty).</p>' + registerForm(), null));
        }
        /* VULN: every submitted field is copied onto the record — role/tier included */
        const nu = { id: nextUserId++, email, password: b.password || '', name: b.name || 'New Customer', role: 'customer', tier: 'standard', active: true };
        if (b.role) nu.role = String(b.role);
        if (b.tier) nu.tier = String(b.tier);
        if (nu.role !== 'customer' || nu.tier === 'premium') pass('mass-assignment');
        if ((nu.password || '').length < 8) pass('weak-password'); /* VULN: no password policy */
        users.push(nu);
        bankAccounts.push({ id: 900 + nu.id, accNo: 'HB-900' + nu.id, ownerId: nu.id, type: 'Current', balance: 100.00, status: 'active' });
        return redirect(res, '/', loginHeaders(nu));
      }
      return send(res, 200, layout(req, 'Register', '<h2>Open a HexaBank account</h2>' + registerForm(), null));
    }
    function registerForm() {
      return '<form method="POST" action="/register" style="background:#fff;border:1px solid #dde;border-radius:10px;padding:18px;max-width:420px">' +
        'Full name<br><input name="name" style="padding:8px;width:95%"><br><br>Email<br><input name="email" style="padding:8px;width:95%"><br><br>Password<br><input name="password" type="password" style="padding:8px;width:95%"><br><br>' +
        '<button style="padding:10px 22px">Open account</button></form><p style="color:#667;font-size:13px">New accounts receive a starter Current account with a simulated $100.00 balance.</p>';
    }
    if (p === '/forgot') {
      if (method === 'POST') {
        const b = await parseBody(req);
        attempt('Login & Authentication');
        const email = (b.email || '').trim();
        const user = users.find(x => x.email === email && x.active);
        const ip = req.socket.remoteAddress || 'local';
        forgotOutcomes[ip] = forgotOutcomes[ip] || new Set();
        let msgHtml;
        if (user) {
          const tok = resetTokenFor(user);
          issuedResetTokens.add(tok + ':' + user.id);
          forgotOutcomes[ip].add('exists');
          /* the "email" is simulated in-lab: the token is shown on screen for practice */
          msgHtml = '<p style="color:#1a7f37">Reset link sent. (Simulated email — your reset token is: <b>' + esc(tok) + '</b>)</p>';
        } else {
          forgotOutcomes[ip].add('missing');
          msgHtml = '<p style="color:#c0392b">No account exists for that email address.</p>'; /* VULN: different answer = enumeration */
        }
        if (forgotOutcomes[ip].has('exists') && forgotOutcomes[ip].has('missing')) pass('user-enumeration');
        return send(res, 200, layout(req, 'Forgot password', '<h2>Forgot password</h2>' + msgHtml + forgotForm(), null));
      }
      return send(res, 200, layout(req, 'Forgot password', '<h2>Forgot password</h2>' + forgotForm(), null));
    }
    function forgotForm() {
      return '<form method="POST" action="/forgot" style="background:#fff;border:1px solid #dde;border-radius:10px;padding:18px;max-width:420px">' +
        'Email<br><input name="email" style="padding:8px;width:95%"><br><br><button style="padding:10px 22px">Send reset link</button></form>' +
        '<p>Have a token? <a href="/reset">Reset your password</a></p>';
    }
    if (p === '/reset') {
      if (method === 'POST') {
        const b = await parseBody(req);
        attempt('Login & Authentication');
        const user = users.find(x => x.email === (b.email || '').trim() && x.active);
        if (user && (b.token || '') === resetTokenFor(user)) {
          if (!issuedResetTokens.has((b.token || '') + ':' + user.id)) pass('reset-token'); /* VULN: token was predicted, never issued */
          user.password = b.newpassword || user.password;
          return send(res, 200, layout(req, 'Reset', '<h2>Password updated</h2><p>Your password has been changed. <a href="/login">Sign in</a></p>', null));
        }
        return send(res, 200, layout(req, 'Reset', '<h2>Reset password</h2><p style="color:#c0392b">That token was not accepted.</p>' + resetForm(), null));
      }
      return send(res, 200, layout(req, 'Reset', '<h2>Reset password</h2>' + resetForm(), null));
    }
    function resetForm() {
      return '<form method="POST" action="/reset" style="background:#fff;border:1px solid #dde;border-radius:10px;padding:18px;max-width:420px">' +
        'Email<br><input name="email" style="padding:8px;width:95%"><br><br>Reset token<br><input name="token" style="padding:8px;width:95%"><br><br>New password<br><input name="newpassword" type="password" style="padding:8px;width:95%"><br><br>' +
        '<button style="padding:10px 22px">Set new password</button></form>';
    }

    /* ---------- everything below needs a login ---------- */
    if (!sess && p !== '/tests' && p !== '/complete' && p !== '/certificate') return needLogin();

    if (p === '/') {
      const mine = bankAccounts.filter(a => a.ownerId === sess.user.id);
      let body = '<h2>🏦 My Accounts</h2><p>Welcome back, ' + esc(sess.user.name) + ' (' + esc(sess.user.tier) + ' tier). All balances are simulated.</p>';
      if (!mine.length) body += '<p>No accounts yet.</p>';
      for (const a of mine) {
        body += '<div style="background:#fff;border:1px solid #dde;border-radius:10px;padding:14px 18px;margin:10px 0">' +
          '<b>' + esc(a.accNo) + '</b> — ' + esc(a.type) + ' · Balance: <b>' + money(a.balance) + '</b> · ' + esc(a.status) + '<br>' +
          '<a href="/accounts/' + a.id + '">Details</a> · <a href="/statement/' + a.id + '">Statement</a> · <a href="/export/statement.csv?account=' + a.id + '">Export CSV</a></div>';
      }
      body += '<p><a href="/transfer">Make a transfer</a> · <a href="/loans">My loans</a></p>';
      return send(res, 200, layout(req, 'My Accounts', body, sess));
    }

    const accMatch = p.match(/^\/accounts\/(\d+)$/);
    if (accMatch && method === 'GET') {
      attempt('Accounts & Statements');
      const acc = accountById(parseInt(accMatch[1], 10));
      if (!acc) return send(res, 404, layout(req, 'Not found', '<h2>Account not found</h2>', sess));
      if (acc.ownerId !== sess.user.id) pass('account-idor'); /* VULN: served anyway */
      const owner = userById(acc.ownerId) || {};
      const tx = ledger.filter(t => t.accountId === acc.id);
      let body = '<h2>Account ' + esc(acc.accNo) + '</h2><p>Owner: ' + esc(owner.name || '?') + ' · Type: ' + esc(acc.type) + ' · Status: ' + esc(acc.status) + '</p>' +
        '<p style="font-size:20px">Balance: <b>' + money(acc.balance) + '</b></p><h3>Recent transactions</h3><table style="width:100%;background:#fff;border:1px solid #dde;border-radius:8px">' +
        '<tr><th style="text-align:left;padding:6px">Date</th><th style="text-align:left;padding:6px">Description</th><th style="text-align:right;padding:6px">Amount</th></tr>' +
        tx.map(t => '<tr><td style="padding:6px">' + esc(t.date) + '</td><td style="padding:6px">' + esc(t.desc) + '</td><td style="padding:6px;text-align:right">' + money(t.amount) + '</td></tr>').join('') + '</table>' +
        '<p><a href="/statement/' + acc.id + '">Full statement</a></p>';
      return send(res, 200, layout(req, 'Account ' + acc.accNo, body, sess));
    }
    const stmtMatch = p.match(/^\/statement\/(\d+)$/);
    if (stmtMatch && method === 'GET') {
      attempt('Accounts & Statements');
      const acc = accountById(parseInt(stmtMatch[1], 10));
      if (!acc) return send(res, 404, layout(req, 'Not found', '<h2>Account not found</h2>', sess));
      if (acc.ownerId !== sess.user.id) pass('statement-idor'); /* VULN: served anyway */
      const owner = userById(acc.ownerId) || {};
      const tx = ledger.filter(t => t.accountId === acc.id);
      let body = '<h2>📄 Statement — ' + esc(acc.accNo) + '</h2><p>Customer: ' + esc(owner.name || '?') + ' (' + esc(owner.email || '') + ') · ' + esc(acc.type) + ' account</p>' +
        '<table style="width:100%;background:#fff;border:1px solid #dde"><tr><th style="text-align:left;padding:6px">Date</th><th style="text-align:left;padding:6px">Description</th><th style="text-align:right;padding:6px">Amount</th></tr>' +
        tx.map(t => '<tr><td style="padding:6px">' + esc(t.date) + '</td><td style="padding:6px">' + esc(t.desc) + '</td><td style="padding:6px;text-align:right">' + money(t.amount) + '</td></tr>').join('') + '</table>' +
        '<p>Closing balance: <b>' + money(acc.balance) + '</b> · <a href="/export/statement.csv?account=' + acc.id + '">Download CSV</a></p>';
      return send(res, 200, layout(req, 'Statement', body, sess));
    }
    if (p === '/export/statement.csv' && method === 'GET') {
      attempt('Accounts & Statements');
      const acc = accountById(parseInt(u.searchParams.get('account') || '0', 10));
      if (!acc) return send(res, 404, 'account not found');
      if (acc.ownerId !== sess.user.id) pass('statement-export'); /* VULN: export served anyway */
      const tx = ledger.filter(t => t.accountId === acc.id);
      const csv = 'date,description,amount\n' + tx.map(t => t.date + ',"' + t.desc.replace(/"/g, '""') + '",' + t.amount.toFixed(2)).join('\n');
      res.writeHead(200, { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="statement-' + acc.accNo + '.csv"' });
      return res.end(csv);
    }

    /* ---------- transfers ---------- */
    if (p === '/transfer') {
      if (method === 'POST') {
        const b = await parseBody(req);
        attempt('Transfers');
        const from = accountById(parseInt(b.from || '0', 10));
        const to = accountByNo((b.to || '').trim()) || accountById(parseInt(b.to || '0', 10));
        const amount = parseFloat(b.amount);
        if (!from || !to || isNaN(amount) || amount === 0) {
          return send(res, 200, layout(req, 'Transfer', '<h2>Transfer</h2><p style="color:#c0392b">Transfer could not be completed — check the accounts and amount.</p>' + transferForm(req, sess), sess));
        }
        const csrfMissing = !originOk(req, b);
        /* VULN set: no source-ownership check, no limit enforcement, negative amounts accepted, marker never required */
        if (from.ownerId !== sess.user.id) pass('transfer-idor-source');
        if (amount > DAILY_LIMIT) pass('transfer-limit');
        if (amount < 0) pass('transfer-negative');
        if (csrfMissing) pass('transfer-csrf');
        from.balance = Math.round((from.balance - amount) * 100) / 100;
        to.balance = Math.round((to.balance + amount) * 100) / 100;
        const today = new Date().toISOString().slice(0, 10);
        ledger.push({ id: nextLedgerId++, accountId: from.id, date: today, desc: 'Transfer to ' + to.accNo, amount: -amount });
        ledger.push({ id: nextLedgerId++, accountId: to.id, date: today, desc: 'Transfer from ' + from.accNo, amount: amount });
        return send(res, 200, layout(req, 'Transfer', '<h2>Transfer complete</h2><p>' + money(amount) + ' moved from ' + esc(from.accNo) + ' to ' + esc(to.accNo) + '.</p><p><a href="/">Back to my accounts</a></p>', sess));
      }
      return send(res, 200, layout(req, 'Transfer', '<h2>💸 Transfer money</h2><p style="color:#667">Bank policy: daily online transfer limit is <b>' + money(DAILY_LIMIT) + '</b> per customer.</p>' + transferForm(req, sess), sess));
    }
    function transferForm(req, sess) {
      const mine = bankAccounts.filter(a => a.ownerId === sess.user.id);
      return '<form method="POST" action="/transfer" style="background:#fff;border:1px solid #dde;border-radius:10px;padding:18px;max-width:460px">' + originField(req) +
        'From account<br><select name="from" style="padding:8px;width:97%">' + mine.map(a => '<option value="' + a.id + '">' + esc(a.accNo) + ' (' + esc(a.type) + ') — ' + money(a.balance) + '</option>').join('') + '</select><br><br>' +
        'To account number<br><input name="to" style="padding:8px;width:95%" placeholder="HB-100201"><br><br>' +
        'Amount ($)<br><input name="amount" style="padding:8px;width:95%" placeholder="100.00"><br><br>' +
        '<button style="padding:10px 22px">Send transfer</button></form>';
    }

    /* ---------- payees ---------- */
    if (p === '/payees') {
      if (method === 'POST') {
        const b = await parseBody(req);
        attempt('Payees');
        const np = { id: nextPayeeId++, ownerId: sess.user.id, name: b.name || 'Payee', bank: b.bank || 'HexaBank', accNo: b.accNo || '' };
        if (XSS_RE.test(np.name)) pass('payee-xss'); /* VULN: stored and rendered raw below */
        payees.push(np);
        return redirect(res, '/payees');
      }
      const mine = payees.filter(x => x.ownerId === sess.user.id);
      let body = '<h2>👥 My Payees</h2>';
      for (const x of mine) {
        /* payee name printed RAW on purpose (stored-xss test) */
        body += '<div style="background:#fff;border:1px solid #dde;border-radius:10px;padding:12px 16px;margin:8px 0"><b>' + x.name + '</b> — ' + esc(x.bank) + ' · ' + esc(x.accNo) +
          ' <form method="POST" action="/payees/' + x.id + '/delete" style="display:inline">' + originField(req) + '<button>Delete</button></form></div>';
      }
      body += '<h3>Add a payee</h3><form method="POST" action="/payees" style="background:#fff;border:1px solid #dde;border-radius:10px;padding:18px;max-width:460px">' + originField(req) +
        'Name<br><input name="name" style="padding:8px;width:95%"><br><br>Bank<br><input name="bank" style="padding:8px;width:95%"><br><br>Account number<br><input name="accNo" style="padding:8px;width:95%"><br><br>' +
        '<button style="padding:10px 22px">Add payee</button></form>';
      return send(res, 200, layout(req, 'Payees', body, sess));
    }
    const payeeDel = p.match(/^\/payees\/(\d+)\/delete$/);
    if (payeeDel && method === 'POST') {
      await parseBody(req);
      attempt('Payees');
      const idx = payees.findIndex(x => x.id === parseInt(payeeDel[1], 10));
      if (idx >= 0) {
        if (payees[idx].ownerId !== sess.user.id) pass('payee-idor'); /* VULN: deleted anyway */
        payees.splice(idx, 1);
      }
      return redirect(res, '/payees');
    }

    /* ---------- loans ---------- */
    if (p === '/loans' && method === 'GET') {
      const mine = loans.filter(l => l.ownerId === sess.user.id);
      let body = '<h2>🏠 My Loans</h2>';
      if (!mine.length) body += '<p>No loans.</p>';
      for (const l of mine) {
        body += '<div style="background:#fff;border:1px solid #dde;border-radius:10px;padding:12px 16px;margin:8px 0"><b>' + esc(l.type) + '</b> — Principal: ' + money(l.principal) + ' · Rate: ' + l.rate + '% · Monthly: ' + money(l.monthly) + ' · ' + esc(l.status) + '<br><a href="/loans/' + l.id + '">Loan summary</a></div>';
      }
      return send(res, 200, layout(req, 'Loans', body, sess));
    }
    const loanMatch = p.match(/^\/loans\/(\d+)$/);
    if (loanMatch && method === 'GET') {
      attempt('Loans');
      const loan = loans.find(l => l.id === parseInt(loanMatch[1], 10));
      if (!loan) return send(res, 404, layout(req, 'Not found', '<h2>Loan not found</h2>', sess));
      if (loan.ownerId !== sess.user.id) pass('loan-idor'); /* VULN: served anyway */
      const owner = userById(loan.ownerId) || {};
      let body = '<h2>Loan summary — ' + esc(loan.type) + '</h2><p>Borrower: ' + esc(owner.name || '?') + '</p>' +
        '<table style="background:#fff;border:1px solid #dde"><tr><td style="padding:6px">Principal</td><td style="padding:6px"><b>' + money(loan.principal) + '</b></td></tr>' +
        '<tr><td style="padding:6px">Interest rate</td><td style="padding:6px"><b>' + loan.rate + '%</b></td></tr>' +
        '<tr><td style="padding:6px">Monthly payment</td><td style="padding:6px">' + money(loan.monthly) + '</td></tr>' +
        '<tr><td style="padding:6px">Status</td><td style="padding:6px">' + esc(loan.status) + '</td></tr></table>' +
        '<h3>Staff adjustment</h3><p style="color:#667;font-size:13px">Branch staff only: adjust the interest rate on this loan.</p>' +
        '<form method="POST" action="/loans/' + loan.id + '/rate" style="background:#fff;border:1px solid #dde;border-radius:10px;padding:14px;max-width:360px">' + originField(req) +
        'New rate (%)<br><input name="rate" style="padding:8px;width:90%"><br><br><button>Apply rate</button></form>';
      return send(res, 200, layout(req, 'Loan', body, sess));
    }
    const loanRate = p.match(/^\/loans\/(\d+)\/rate$/);
    if (loanRate && method === 'POST') {
      const b = await parseBody(req);
      attempt('Loans');
      const loan = loans.find(l => l.id === parseInt(loanRate[1], 10));
      const rate = parseFloat(b.rate);
      if (loan && !isNaN(rate)) {
        loan.rate = rate; /* VULN: no staff-role check on a staff function */
        if (sess.user.role === 'customer') pass('loan-tamper');
      }
      return redirect(res, '/loans/' + loanRate[1]);
    }

    /* ---------- profile ---------- */
    if (p === '/profile') {
      if (method === 'POST') {
        const b = await parseBody(req);
        attempt('Registration & Profile');
        if (!originOk(req, b)) pass('csrf-profile'); /* VULN: update applies with no origin check */
        if (typeof b.name === 'string' && b.name.trim()) sess.user.name = b.name.trim();
        if (XSS_RE.test(sess.user.name)) pass('stored-xss-profile');
        return redirect(res, '/profile');
      }
      /* display name rendered RAW on purpose below (stored-xss test) */
      let body = '<h2>👤 Profile</h2><p>Signed in as <b>' + sess.user.name + '</b> (' + esc(sess.user.email) + ') · Role: ' + esc(sess.user.role) + ' · Tier: ' + esc(sess.user.tier) + '</p>' +
        '<form method="POST" action="/profile" style="background:#fff;border:1px solid #dde;border-radius:10px;padding:18px;max-width:420px">' + originField(req) +
        'Display name<br><input name="name" value="' + esc(sess.user.name) + '" style="padding:8px;width:95%"><br><br><button style="padding:10px 22px">Save profile</button></form>' +
        '<h3>Developer API</h3><p style="font-size:14px">Your API token: <code>' + esc(apiTokenFor(sess.user)) + '</code><br><span style="color:#667">Use it as the X-API-Key header on GET /api/accounts.</span></p>';
      return send(res, 200, layout(req, 'Profile', body, sess));
    }

    /* ---------- staff console (login-only check — broken on purpose) ---------- */
    if (p === '/staff' && method === 'GET') {
      attempt('Staff & Admin Panel');
      if (sess.user.role === 'customer') pass('staff-access'); /* VULN: no staff-role check at all */
      let body = '<h2>🧑‍💼 Staff Console</h2><p>All HexaBank customers and accounts. Staff use only.</p>' +
        '<form method="GET" action="/staff/search">Search customers: <input name="q" style="padding:7px"> <button>Search</button></form><h3>Customers</h3><ul>' +
        users.filter(x => x.role === 'customer').map(x => '<li>' + x.name + ' (' + esc(x.email) + ') — ' + esc(x.tier) + '</li>').join('') + '</ul><h3>Accounts</h3><ul>' +
        bankAccounts.map(a => '<li>' + esc(a.accNo) + ' — ' + esc((userById(a.ownerId) || {}).name || '?') + ' · ' + esc(a.type) + ' · ' + money(a.balance) + '</li>').join('') + '</ul>';
      return send(res, 200, layout(req, 'Staff Console', body, sess));
    }
    if (p === '/staff/search' && method === 'GET') {
      attempt('Staff & Admin Panel');
      const q = u.searchParams.get('q') || '';
      if (XSS_RE.test(q)) pass('staff-search-xss'); /* VULN: query reflected unescaped below */
      const hits = users.filter(x => x.role === 'customer' && (x.name.toLowerCase().includes(q.toLowerCase()) || x.email.toLowerCase().includes(q.toLowerCase())));
      let body = '<h2>Staff search</h2><p>Results for: ' + q + '</p><ul>' +
        hits.map(x => '<li>' + esc(x.name) + ' (' + esc(x.email) + ')</li>').join('') + '</ul><p><a href="/staff">Back to staff console</a></p>';
      return send(res, 200, layout(req, 'Staff Search', body, sess));
    }

    /* ---------- admin panel (trusts the cookie role — broken on purpose) ---------- */
    if (p === '/admin' && method === 'GET') {
      attempt('Staff & Admin Panel');
      if (sess.cookieRole !== 'admin') {
        return send(res, 403, layout(req, 'Forbidden', '<h2>403 — Admins only</h2><p>The admin panel requires the admin role.</p>', sess));
      }
      if (sess.user.role !== 'admin') pass('cookie-role'); /* forged cookie role reached the gated page */
      let body = '<h2>🛠 Admin Panel</h2><p>Customer account controls.</p>';
      for (const x of users.filter(x => x.role === 'customer')) {
        body += '<div style="background:#fff;border:1px solid #dde;border-radius:10px;padding:10px 14px;margin:8px 0"><b>' + esc(x.name) + '</b> (' + esc(x.email) + ') — ' + (x.active ? 'active' : '<b style="color:#c0392b">frozen</b>') +
          (x.active ? ' <form method="POST" action="/admin/users/' + x.id + '/freeze" style="display:inline"><button>Freeze account</button></form>' : '') + '</div>';
      }
      return send(res, 200, layout(req, 'Admin', body, sess));
    }
    const freezeMatch = p.match(/^\/admin\/users\/(\d+)\/freeze$/);
    if (freezeMatch && method === 'POST') {
      const b = await parseBody(req);
      attempt('Staff & Admin Panel');
      if (sess.cookieRole === 'admin') {
        if (!originOk(req, b)) pass('admin-csrf'); /* VULN: freeze applies with no origin check */
        const target = userById(parseInt(freezeMatch[1], 10));
        if (target) target.active = false;
      }
      return redirect(res, '/admin');
    }

    /* ---------- debug dump (leftover — broken on purpose) ---------- */
    if (p === '/debug' && method === 'GET') {
      attempt('Platform & API');
      if (sess.user.role !== 'admin') pass('debug-exposure');
      return sendJson(res, 200, { note: 'HexaBank internal debug — do not ship', users, bankAccounts, loans });
    }

    /* ---------- lab system pages ---------- */
    if (p === '/tests') {
      const sum = progressSummary();
      let body = '<h2>🎯 Mission — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h2><p>' + sum.done + '/' + sum.total + ' tests complete (' + sum.pct + '%). Tests complete by <b>doing</b> — the server detects each exploit itself. Hints reveal one at a time.</p>';
      for (const f of FEATURES) {
        const ts = TESTS.filter(t => t.feature === f);
        body += '<h3>' + f + ' <span style="color:#667">(' + ts.filter(t => progress.tests[t.id]).length + '/' + ts.length + ' · attempts: ' + (progress.attempts[f] || 0) + ')</span></h3>';
        for (const t of ts) {
          const done = !!progress.tests[t.id];
          const lvl = parseInt(u.searchParams.get('h_' + t.id) || '0', 10);
          body += '<div style="background:#fff;border:1px solid #dde;border-radius:10px;padding:12px 16px;margin:8px 0">' +
            '<b>' + (done ? '✓' : '○') + ' ' + esc(t.name) + '</b> <span style="color:#667">' + t.owasp + ' · ' + t.difficulty + (done ? ' · <b style="color:#1a7f37">done</b>' : '') + '</span><br>' +
            tsHints(t, lvl) + '</div>';
        }
      }
      return send(res, 200, layout(req, 'Tests', body, sess));
    }
    if (p === '/complete') {
      const sum = progressSummary();
      if (!sum.complete) {
        return send(res, 200, layout(req, 'Not yet', '<h2>🏁 Completion</h2><p>You are at <b>' + sum.pct + '%</b> (' + sum.done + '/' + sum.total + '). The debrief, key and certificate unlock at 100%. See <a href="/tests">/tests</a> for what remains.</p>', sess));
      }
      let nameForm = '<form method="POST" action="/complete">Name for your certificate: <input name="name" value="' + esc(progress.testerName || (sess ? sess.user.name : '')) + '" style="padding:7px"> <button>Save name</button></form>';
      if (method === 'POST') {
        const b = await parseBody(req);
        if (typeof b.name === 'string' && b.name.trim()) { progress.testerName = b.name.trim(); saveProgress(); }
        return redirect(res, '/complete');
      }
      let body = '<h2>🏁 LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' complete!</h2>' + nameForm +
        '<h3>1) The lab in numbers</h3><p>Total features: <b>' + FEATURES.length + '</b> · Total tests: <b>' + sum.total + '</b></p><ul>' +
        FEATURES.map(f => '<li>' + f + ': ' + TESTS.filter(t => t.feature === f).length + ' vulnerabilities</li>').join('') + '</ul>' +
        '<h3>2) How the testing was done</h3><p>' + sum.total + ' techniques, one per test:</p><ul>' +
        TESTS.map(t => '<li>' + esc(t.name) + ' (' + t.owasp + ')</li>').join('') + '</ul>' +
        '<h3>3) What you learned</h3><ul>' + TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.lesson) + '</li>').join('') + '</ul>' +
        '<h3>4) What this means for a real client</h3><ul>' + TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.impact) + '</li>').join('') + '</ul>' +
        '<h3>5) Writing it in a real report</h3><ul>' + TESTS.map(t => '<li><b>' + esc(t.report.title) + '</b> — Severity: ' + t.report.severity + '. Remediation: ' + esc(t.report.remediation) + '</li>').join('') + '</ul>' +
        '<h3>6) Your completion key</h3><p>Lab ' + (LAB_NUMBER + 1) + ' unlock key:</p>' +
        '<p style="font-size:20px;background:#111827;color:#7ef29d;padding:14px;border-radius:8px;text-align:center;letter-spacing:1px"><b>' + completionKey() + '</b></p>' +
        '<p><a href="/certificate">🎓 View your certificate</a></p>';
      return send(res, 200, layout(req, 'Complete', body, sess));
    }
    if (p === '/certificate') {
      const sum = progressSummary();
      if (!sum.complete) return redirect(res, '/complete');
      const name = progress.testerName || (sess ? sess.user.name : 'Tester');
      const date = progress.completedAt ? new Date(progress.completedAt).toISOString().slice(0, 10) : '';
      const card = '<div style="max-width:640px;margin:30px auto;background:#fff;border:3px solid #4f7cff;border-radius:16px;padding:36px;text-align:center">' +
        '<img src="/logo.png" style="height:64px"><h2 style="margin:8px 0">Certificate of Completion</h2>' +
        '<p>This certifies that</p><h3 style="font-size:24px;margin:6px 0">' + esc(name) + '</h3>' +
        '<p>has completed 100% of the security tests in</p><h3>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h3>' +
        '<p>' + sum.total + ' tests across ' + FEATURES.length + ' features · ' + date + '</p>' +
        '<p style="color:#555;margin-top:22px">HexaCyberLab — Built by Md. Jony Hassain, Founder</p></div>' +
        '<p style="text-align:center"><button onclick="window.print()">Print certificate</button></p>';
      return send(res, 200, layout(req, 'Certificate', card, sess));
    }

    return send(res, 404, layout(req, 'Not found', '<h2>404 — page not found</h2>', sess));
  } catch (e) {
    try { send(res, 500, 'Internal error'); } catch (e2) {}
  }
});
loadProgress();
server.listen(PORT, '127.0.0.1', () => {
  console.log(LAB_NAME + ' (LAB ' + LAB_NUMBER + ') running at http://127.0.0.1:' + PORT + '  (LOCAL ONLY — deliberately vulnerable lab)');
});
