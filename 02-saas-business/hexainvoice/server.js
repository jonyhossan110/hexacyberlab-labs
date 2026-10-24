'use strict';
/*
 * HexaInvoice — LAB 15 of 110 (Category 2: SaaS & Business Platforms)
 * A deliberately vulnerable invoicing SaaS for hands-on web pentesting practice.
 * LOCAL USE ONLY. Zero-dependency Node.js (built-ins only). Binds 127.0.0.1:3024.
 * Built by Md. Jony Hassain, Founder of HexaCyberLab.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3024;
const LAB_NUMBER = 15;
const LAB_NAME = 'HexaInvoice';
const PREV_LAB = 14;
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');

/* ------------------------------------------------------------------ *
 * Key material lives ONLY as encoded fragments, scattered through    *
 * this file and reassembled in memory at the moment of use.          *
 * ------------------------------------------------------------------ */
const _eA = ['TC1YSA==', 'NC01MQ==', 'NUc3UQ=='];
const _cA = ['TC1YSA==', 'Uy02MQ==', 'WTZWMQ=='];
function _un(a) {
  return a.map(s => [...Buffer.from(s, 'base64').toString('utf8')].reverse().join('')).join('');
}

/* ============================ seed data ============================ */
const accounts = [
  { id: 1, firmName: 'BrightLedger Accounting', plan: 'standard' },
  { id: 2, firmName: 'PixelCFO Services', plan: 'standard' }
];
const users = [
  { id: 1, email: 'owner@hexainvoice.local', password: 'Owner@123', name: 'Ayesha Rahman', role: 'owner', accountId: 1, clientId: null, active: true },
  { id: 2, email: 'staff@hexainvoice.local', password: 'Staff@123', name: 'Tanvir Hasan', role: 'staff', accountId: 1, clientId: null, active: true },
  { id: 3, email: 'viewer@novatech.local', password: 'Viewer@123', name: 'NovaTech Finance Team', role: 'viewer', accountId: 1, clientId: 1, active: true },
  { id: 4, email: 'owner@pixelcfo.local', password: 'Pixel@123', name: 'Daniel Roth', role: 'owner', accountId: 2, clientId: null, active: true },
  { id: 5, email: 'admin@hexainvoice.local', password: 'admin123', name: 'Platform Admin', role: 'admin', accountId: 1, clientId: null, active: true }
];
const clients = [
  { id: 1, accountId: 1, name: 'NovaTech Ltd', contactName: 'Sarah Kim', email: 'billing@novatech.example', address: '14 Innovation Drive' },
  { id: 2, accountId: 1, name: 'BluePeak Studio', contactName: 'Marco Ruiz', email: 'ap@bluepeak.example', address: '8 Summit Road' },
  { id: 3, accountId: 1, name: 'GreenMart Retail', contactName: 'Priya Nair', email: 'finance@greenmart.example', address: '221 Market Street' },
  { id: 4, accountId: 2, name: 'OrbitSoft Inc', contactName: 'Lena Fischer', email: 'pay@orbitsoft.example', address: '3 Orbital Way' }
];
const services = [
  { id: 1, name: 'Bookkeeping (monthly)', rate: 300 },
  { id: 2, name: 'VAT return filing', rate: 150 },
  { id: 3, name: 'Payroll processing', rate: 200 },
  { id: 4, name: 'Audit support (per hour)', rate: 120 }
];
const STD_TAX = 15;      // standard VAT rate every invoice should use
const MAX_DISCOUNT = 20; // firm policy: discounts above 20% need director approval
let invoices = [
  { id: 1, number: 'INV-1001', accountId: 1, clientId: 1, serviceId: 1, qty: 1, unitPrice: 300, taxRate: 15, discountPct: 0, status: 'paid', due: '2026-10-05' },
  { id: 2, number: 'INV-1002', accountId: 1, clientId: 1, serviceId: 3, qty: 2, unitPrice: 200, taxRate: 15, discountPct: 0, status: 'sent', due: '2026-10-28' },
  { id: 3, number: 'INV-1003', accountId: 1, clientId: 2, serviceId: 2, qty: 1, unitPrice: 150, taxRate: 15, discountPct: 0, status: 'overdue', due: '2026-09-30' },
  { id: 4, number: 'INV-1004', accountId: 1, clientId: 3, serviceId: 4, qty: 3, unitPrice: 120, taxRate: 15, discountPct: 0, status: 'draft', due: '2026-11-10' },
  { id: 5, number: 'INV-2001', accountId: 2, clientId: 4, serviceId: 1, qty: 2, unitPrice: 300, taxRate: 15, discountPct: 0, status: 'paid', due: '2026-10-02' },
  { id: 6, number: 'INV-2002', accountId: 2, clientId: 4, serviceId: 3, qty: 1, unitPrice: 200, taxRate: 15, discountPct: 0, status: 'sent', due: '2026-10-25' }
];
let payments = [
  { id: 1, invoiceId: 1, accountId: 1, amount: 345, method: 'bank transfer', date: '2026-10-03' },
  { id: 2, invoiceId: 5, accountId: 2, amount: 690, method: 'card', date: '2026-10-01' }
];
let templates = [
  { id: 1, accountId: 1, clientId: 1, name: 'NovaTech monthly retainer', serviceId: 1, qty: 1, unitPrice: 300, cycle: 'monthly' },
  { id: 2, accountId: 2, clientId: 4, name: 'OrbitSoft monthly retainer', serviceId: 1, qty: 2, unitPrice: 300, cycle: 'monthly' }
];
let nextInvoiceId = 7, nextPaymentId = 3, nextClientId = 5, nextUserId = 6, nextTemplateId = 3, invSeqA = 1005, invSeqB = 2003;

function invTotal(inv) {
  const sub = inv.qty * inv.unitPrice;
  const disc = sub * (inv.discountPct || 0) / 100;
  return Math.round((sub - disc) * (1 + inv.taxRate / 100) * 100) / 100;
}
function paidSum(invoiceId) {
  return payments.filter(p => p.invoiceId === invoiceId).reduce((s, p) => s + p.amount, 0);
}
function clientName(id) { const c = clients.find(c => c.id === id); return c ? c.name : '?'; }
function serviceName(id) { const s = services.find(s => s.id === id); return s ? s.name : '?'; }
function accountOf(id) { return accounts.find(a => a.id === id); }

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
  'Registration & Firm Profile',
  'Clients',
  'Invoices',
  'Payments',
  'Recurring Templates',
  'Search & Exports',
  'Admin Panel',
  'Platform & API'
];
const TESTS = [
  /* ---------------- Login & Authentication ---------------- */
  { id: 'sqli-login', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03 Injection', difficulty: 'Beginner',
    hints: ['The login form checks your email against the user store with a hand-built query. What happens if the email itself contains query logic?', 'Classic tautology payloads turn "email = X AND password = Y" into something always true.', "Try logging in with the email: ' OR '1'='1' --  and any password."],
    lesson: 'String-built queries let attacker input change the meaning of the query itself; the first matching row (often a privileged account) is returned without any password check.',
    impact: 'On a real invoicing platform this means an attacker logs in as the firm owner with no password at all — every client invoice, bank detail and payment record is exposed in one request.',
    report: { title: 'SQL Injection in Authentication (Login Bypass)', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never build queries by string concatenation.' },
    guide: 'Step by step: 1) Open the login page. 2) In the email field enter: \' OR \'1\'=\'1\' --  3) Type any password and submit. 4) You are logged in as the first account in the store without knowing its password — the query was tricked into matching every row.' },
  { id: 'brute-force', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limiting', owasp: 'A07 Authentication Failures', difficulty: 'Beginner',
    hints: ['How many wrong passwords can you try for the staff account before anything stops you?', 'There is no lockout, no CAPTCHA and no delay — the counter only exists in this lab to prove the point.', 'Script 10 failed logins for staff@hexainvoice.local (e.g. with curl) and watch the test complete.'],
    lesson: 'Without throttling or lockout, an online password-guessing attack is limited only by the attacker\'s patience.',
    impact: 'A real firm account with a human-chosen password falls to a dictionary attack overnight; the attacker then issues fake invoices in the firm\'s name.',
    report: { title: 'Missing Brute-Force Protection on Login', severity: 'High', remediation: 'Rate-limit and progressively delay failed logins, lock or challenge accounts after repeated failures, and alert on anomalies.' },
    guide: 'Step by step: 1) Pick the staff account. 2) Submit 10 login attempts with wrong passwords (a small curl loop works). 3) Notice every attempt is processed normally — nothing slows down or locks. 4) The test completes at the 10th failure: the missing throttle is the vulnerability.' },
  { id: 'user-enumeration', feature: 'Login & Authentication', name: 'User Enumeration via Password Reset', owasp: 'A07 Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare what "Forgot password" tells you for an email that exists versus one that does not.', 'Different answers = a free oracle for building a valid-user list.', 'Submit /forgot once for owner@hexainvoice.local and once for a made-up address; the two different responses complete the test.'],
    lesson: 'Authentication endpoints must answer identically whether or not an account exists; otherwise attackers harvest valid usernames for targeted attacks.',
    impact: 'Attackers confirm which finance staff have accounts, then focus phishing and password spraying exactly on them.',
    report: { title: 'User Enumeration via Divergent Password-Reset Responses', severity: 'Medium', remediation: 'Return one generic message for all reset requests ("If the account exists, a reset email has been sent").' },
    guide: 'Step by step: 1) Go to /forgot. 2) Enter owner@hexainvoice.local — the page confirms a reset was created. 3) Enter nobody@nowhere.example — the page says no such account. 4) That difference is the oracle: you can test any email list and learn exactly who has an account.' },
  { id: 'default-creds', feature: 'Login & Authentication', name: 'Weak / Default Credentials', owasp: 'A07 Authentication Failures', difficulty: 'Beginner',
    hints: ['Installations often ship with a platform admin that nobody ever re-passwords.', 'Try the most-guessed admin password in the world on admin@hexainvoice.local.', 'The password is literally admin123.'],
    lesson: 'Default and weak credentials bypass every other control; shipped passwords must be forced to change on first use.',
    impact: 'A default admin password on a billing platform is a standing invitation: anyone can walk in, read all tenants\' data and deactivate real users.',
    report: { title: 'Default Credentials on Platform Admin Account', severity: 'Critical', remediation: 'Force password change on first login, block known-default passwords, and audit seeded accounts before go-live.' },
    guide: 'Step by step: 1) On the login page enter admin@hexainvoice.local. 2) Use the password admin123 — a vendor default that was never changed. 3) You are in as Platform Admin. Default credentials are the oldest trick in the book because they keep working.' },
  { id: 'reset-token', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07 Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a reset for your own account and look closely at the token format — it is not random.', 'The token is a simple arithmetic function of the user\'s numeric ID.', 'Token = RST-(userId × 137 + 42). The owner is user 1, staff is user 2 — compute staff\'s token and reset their password without ever requesting it.'],
    lesson: 'Reset tokens must be long, random and single-use; a token derived from a public identifier is an account-takeover formula.',
    impact: 'Anyone who can guess a user ID can reset that user\'s password — including the firm owner — and lock the real business out of its own billing.',
    report: { title: 'Predictable Password Reset Tokens Allow Account Takeover', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), store hashed, expire quickly, and invalidate after use.' },
    guide: 'Step by step: 1) Request a reset for your own account and note the token pattern. 2) The token is RST-(id×137+42): for staff (id 2) that is RST-316. 3) Open /reset, enter staff\'s email and the computed token, choose a new password. 4) Login as staff — you took the account over with maths, not access.' },
  { id: 'cookie-role', feature: 'Login & Authentication', name: 'Session Cookie Role Tampering', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Your session lives in a cookie you can read — and edit. What does it say about your role?', 'The cookie is just base64 JSON, and the billing settings page believes it.', 'Log in as the client viewer, decode the hx_sess cookie, change role to owner, re-encode, and open /settings.'],
    lesson: 'Authorization data must live server-side (or be cryptographically signed); anything stored client-side is a suggestion the user can rewrite.',
    impact: 'A client who was meant to see only their own invoices promotes themselves to firm owner — full access to every client, invoice and payout setting.',
    report: { title: 'Unsigned Client-Side Session Allows Role Tampering (Privilege Escalation)', severity: 'High', remediation: 'Keep session state server-side or sign session tokens (e.g. HMAC/JWT with a server secret) and re-check the role from the database per request.' },
    guide: 'Step by step: 1) Log in as the client viewer (viewer@novatech.local). 2) Copy the hx_sess cookie and base64-decode it — it is plain JSON including your role. 3) Change "role":"viewer" to "role":"owner", re-encode, and replace the cookie. 4) Open /settings — the owner-only billing page accepts your forged role.' },

  /* ---------------- Registration & Firm Profile ---------------- */
  { id: 'mass-assignment', feature: 'Registration & Firm Profile', name: 'Mass Assignment — Role via Registration', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration handler copies your whole form into the new user record. What extra fields might it accept?', 'If the form blindly binds every submitted field, a field that was never shown can still be set.', 'Register a new account and add an extra form field: role=admin.'],
    lesson: 'Bind only an explicit allowlist of fields on signup and profile updates; frameworks that bind everything let users set privileged attributes.',
    impact: 'Self-service registration becomes instant admin: an attacker creates a platform-admin account from the public signup page.',
    report: { title: 'Mass Assignment in Registration Allows Privilege Escalation', severity: 'High', remediation: 'Allowlist bindable fields server-side (name, email, password); assign roles and plans only through privileged code paths.' },
    guide: 'Step by step: 1) Intercept or craft the registration request (curl works). 2) Add an extra field role=admin alongside the normal fields. 3) Register. 4) The new account is created with the admin role because the handler bound every field it received.' },
  { id: 'weak-password', feature: 'Registration & Firm Profile', name: 'Weak Password Policy', owasp: 'A07 Authentication Failures', difficulty: 'Beginner',
    hints: ['How short a password will registration accept?', 'There is no minimum length or complexity check at all.', 'Register with the password "x" — a single character is accepted.'],
    lesson: 'A password policy is a security control, not a UX nicety: without a floor, users pick passwords that fall to the first guessing attempt.',
    impact: 'Clients and staff end up with one-character passwords on a system holding financial records — credential stuffing becomes trivial.',
    report: { title: 'No Minimum Password Strength Enforced', severity: 'Medium', remediation: 'Enforce ≥10–12 characters, screen against breached-password lists, and apply the same policy to resets and changes.' },
    guide: 'Step by step: 1) Open /register. 2) Create an account with the password x (one character). 3) The account is created without complaint. 4) A policy that accepts "x" accepts everything attackers try first.' },
  { id: 'stored-xss-profile', feature: 'Registration & Firm Profile', name: 'Stored XSS in Firm Name', owasp: 'A03 Injection', difficulty: 'Intermediate',
    hints: ['The firm name from your profile is printed on the dashboard and invoices. Is it encoded?', 'A value stored once and rendered everywhere is the perfect persistent payload.', 'Set your firm name to <script>alert(1)</script> in /profile and view the dashboard.'],
    lesson: 'Every user-controlled string must be output-encoded at render time; stored XSS turns one profile field into script execution for every viewer.',
    impact: 'The payload fires in the browser of every staff member and client who views an invoice — session theft and fake payment-detail changes follow.',
    report: { title: 'Stored Cross-Site Scripting via Firm Name', severity: 'High', remediation: 'Context-aware output encoding for all user data; add a Content-Security-Policy as defence in depth.' },
    guide: 'Step by step: 1) Log in as the firm owner and open /profile. 2) Set the firm name to <script>alert(1)</script> and save. 3) Open the dashboard — the name is printed without encoding and the script executes. 4) It is stored, so it fires for everyone, every time.' },
  { id: 'csrf-profile', feature: 'Registration & Firm Profile', name: 'CSRF on Firm Profile Update', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Legit profile forms carry a hidden origin marker that matches a cookie. What if a request simply leaves it out?', 'The update endpoint never checks where the request came from.', 'While logged in as owner, POST /profile with new values but WITHOUT the _origin field — the change still applies.'],
    lesson: 'State-changing endpoints need anti-CSRF tokens (or strict same-site checks); cookies alone will ride along on a forged cross-site request.',
    impact: 'A malicious page visited by the owner silently rewrites the firm\'s bank/payment details — future client payments are diverted to the attacker.',
    report: { title: 'Cross-Site Request Forgery on Profile Update', severity: 'High', remediation: 'Require a per-session anti-CSRF token on all state-changing requests and verify Origin/Referer as a fallback.' },
    guide: 'Step by step: 1) Log in as owner. 2) From another origin (curl is fine), POST to /profile with a new firm name and NO _origin marker. 3) The profile updates anyway. 4) That is CSRF: the browser would have attached your cookies to the same request from an attacker\'s page.' },

  /* ---------------- Clients ---------------- */
  { id: 'client-idor', feature: 'Clients', name: 'Cross-Account Client IDOR', owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    hints: ['Client records have simple numeric IDs. Does the page check which firm the client belongs to?', 'Log in as one firm and open the client page of the other firm\'s client.', 'BrightLedger is account 1; OrbitSoft (client 4) belongs to PixelCFO. Open /clients/4 while logged in as BrightLedger.'],
    lesson: 'Every object access must verify the caller owns (or is authorised for) that object — a valid login is not authorisation.',
    impact: 'Competing firms can read each other\'s client lists — names, contacts and billing addresses — straight from the URL bar.',
    report: { title: 'Insecure Direct Object Reference on Client Records', severity: 'High', remediation: 'Scope every query by the caller\'s account/tenant and return 404 for objects outside it.' },
    guide: 'Step by step: 1) Log in as the BrightLedger owner. 2) Browse to /clients/4. 3) You see OrbitSoft — a client of a DIFFERENT firm (PixelCFO) — because the handler never checks ownership. 4) One changed digit leaks another business\'s customer.' },
  { id: 'client-xss', feature: 'Clients', name: 'Stored XSS in Client Contact Name', owasp: 'A03 Injection', difficulty: 'Intermediate',
    hints: ['Client contact names are printed on the client page and invoices without encoding.', 'Store first, fire later — the payload waits for the next viewer.', 'Create or edit a client with contact name <script>alert(1)</script> and open the client page.'],
    lesson: 'Data entered in one place surfaces in many others; without encoding, every display of that field is an injection point.',
    impact: 'An attacker plants a script in a client record that fires in the accountant\'s browser — the trusted person with full billing access.',
    report: { title: 'Stored Cross-Site Scripting via Client Contact Name', severity: 'High', remediation: 'Output-encode all stored user data at render; validate/sanitise rich fields server-side.' },
    guide: 'Step by step: 1) Add a new client with contact name <script>alert(1)</script>. 2) Open that client\'s page. 3) The stored name is rendered raw and executes. 4) Stored XSS in shared business records targets the whole firm, not one visitor.' }
];

TESTS.push(
  /* ---------------- Invoices ---------------- */
  { id: 'invoice-idor', feature: 'Invoices', name: 'Cross-Account Invoice IDOR', owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    hints: ['Invoices are numbered and sequential, and the detail page does not check the owning firm.', 'Find the other firm\'s invoice IDs (they start at INV-2001) and open one.', 'As BrightLedger, open /invoices/5 — a PixelCFO invoice.'],
    lesson: 'Financial documents need per-object authorisation: sequential IDs plus missing checks equal bulk data theft.',
    impact: 'A competitor reads your invoices line by line — pricing, clients, payment status — and undercuts or impersonates you.',
    report: { title: 'Insecure Direct Object Reference on Invoice Detail', severity: 'High', remediation: 'Authorise every invoice access against the session\'s tenant; use unguessable IDs as defence in depth, not as the control.' },
    guide: 'Step by step: 1) Log in as BrightLedger owner. 2) Open /invoices/5. 3) The invoice belongs to PixelCFO (INV-2001) but is served to you in full. 4) IDOR on invoices exposes an entire firm\'s revenue book.' },
  { id: 'price-tamper', feature: 'Invoices', name: 'Line-Item Price Tampering', owasp: 'A04 Insecure Design', difficulty: 'Beginner',
    hints: ['The invoice form helpfully posts the unit price in a hidden field. The server believes what it receives.', 'Server-side truth lives in the services catalogue — the request should never set the price.', 'Create an invoice for the $300 bookkeeping service but post unitPrice=1.'],
    lesson: 'Prices and rates must be looked up server-side from the catalogue; any client-supplied money value is attacker-controlled.',
    impact: 'Invoices are issued for $1 instead of $300 — whether by a malicious insider or a tampered integration, the firm bills a fraction of what it earned.',
    report: { title: 'Client-Side Price Tampering on Invoice Creation', severity: 'High', remediation: 'Ignore client-posted prices; always price line items from the server-side catalogue and recompute totals server-side.' },
    guide: 'Step by step: 1) Open the new-invoice form and pick Bookkeeping ($300). 2) Intercept the POST (or use curl) and change unitPrice to 1. 3) Submit. 4) The invoice is created at $1 — the server never checked its own catalogue.' },
  { id: 'tax-tamper', feature: 'Invoices', name: 'Tax Rate & Discount Manipulation', owasp: 'A04 Insecure Design', difficulty: 'Intermediate',
    hints: ['Tax rate and discount % are also posted fields. Firm policy caps discounts at 20% and VAT is fixed at 15% — does the server enforce either?', 'What happens to the total with discountPct=100, or taxRate=0?', 'Create an invoice posting discountPct=100 (or taxRate=0) and read the resulting total.'],
    lesson: 'Business rules (fixed tax rates, discount ceilings) must be enforced server-side; a rule that lives only in the UI does not exist.',
    impact: 'Invoices go out with 100% "discounts" or zero tax — direct revenue loss for the firm and false tax filings for its clients.',
    report: { title: 'Server-Side Validation Missing for Tax Rate and Discount', severity: 'High', remediation: 'Fix tax rates server-side per jurisdiction and enforce discount ceilings with approval workflows for exceptions.' },
    guide: 'Step by step: 1) Create an invoice via POST with discountPct=100. 2) The total collapses to $0 yet the invoice is valid. 3) The same works with taxRate=0 or even negative values. 4) Every money rule the server fails to enforce is money an attacker can erase.' },
  { id: 'status-forge', feature: 'Invoices', name: 'Forged Payment Status (Draft → Paid)', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The status endpoint accepts whatever status the request names — no workflow, no payment check.', 'If "paid" is just a field value, anyone can declare an invoice settled.', 'Create a draft invoice, then POST /invoices/<id>/status with status=paid. No payment exists, yet it shows PAID.'],
    lesson: 'State transitions are business logic: "paid" must be reachable only through a verified payment, never by naming it.',
    impact: 'Unpaid invoices are marked paid — the firm writes off real receivables, and clients are told they owe nothing.',
    report: { title: 'Invoice Status Forgery — Unauthorised State Transition to Paid', severity: 'Critical', remediation: 'Implement a server-side state machine; allow the paid state only when recorded payments cover the invoice total.' },
    guide: 'Step by step: 1) Create or pick a draft invoice and note it has no payments. 2) POST /invoices/<id>/status with status=paid. 3) The invoice now shows PAID. 4) Status is money: whoever controls the transition controls the ledger.' },

  /* ---------------- Payments ---------------- */
  { id: 'payment-forge', feature: 'Payments', name: 'Forged Payment Settlement Amount', owasp: 'A04 Insecure Design', difficulty: 'Intermediate',
    hints: ['The payment form posts both the amount and a hidden "paidAmount" the server uses to decide if the invoice is settled.', 'Settling is decided by a number the payer controls.', 'On a sent invoice, POST /invoices/<id>/pay with amount=1 but paidAmount=<full total> — the invoice becomes PAID for $1.'],
    lesson: 'Settlement must be computed from recorded payment rows on the server, never from a client-supplied summary field.',
    impact: 'A client "pays" $1 and receives a fully-paid invoice and receipt — the firm\'s books show settled while the money never arrived.',
    report: { title: 'Payment Settlement Based on Client-Supplied Amount (Payment Forgery)', severity: 'Critical', remediation: 'Compute paid status strictly from the sum of verified payment records; reconcile against the payment provider.' },
    guide: 'Step by step: 1) Open a sent invoice (e.g. INV-1002, $460). 2) POST a payment with amount=1 and paidAmount=460. 3) The invoice flips to PAID and a $1 payment is all that exists. 4) The server trusted the summary field instead of adding up the money.' },
  { id: 'receipt-idor', feature: 'Payments', name: 'Payment Receipt IDOR', owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    hints: ['Receipts have their own URLs with small numeric IDs and no ownership check.', 'Payment 2 belongs to the other firm. Ask for its receipt.', 'As BrightLedger, open /payments/2/receipt — PixelCFO\'s receipt.'],
    lesson: 'Downloads and documents are objects too: receipts, PDFs and exports need the same authorisation as pages.',
    impact: 'Receipts confirm bank methods, amounts and dates of another firm\'s transactions — prime material for invoice fraud and BEC scams.',
    report: { title: 'Insecure Direct Object Reference on Payment Receipts', severity: 'Medium', remediation: 'Check receipt ownership against the session tenant before serving any document.' },
    guide: 'Step by step: 1) Log in as BrightLedger. 2) Open /payments/2/receipt. 3) You receive the receipt for PixelCFO\'s payment on INV-2001. 4) Documents leak the same data as pages when IDs are guessable and unchecked.' },

  /* ---------------- Recurring Templates ---------------- */
  { id: 'template-idor', feature: 'Recurring Templates', name: 'Cross-Account Recurring Template Abuse', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Recurring templates generate real invoices. The generate action does not check which firm owns the template.', 'Template 2 belongs to PixelCFO. Generate from it while logged in as BrightLedger.', 'POST /templates/2/generate as BrightLedger — an invoice appears from their template.'],
    lesson: 'Actions on scheduled/automation objects need the same ownership checks as reads; automation multiplies the damage of one missed check.',
    impact: 'Attackers trigger invoices from another firm\'s templates — corrupting their billing and spamming their clients automatically.',
    report: { title: 'Missing Authorisation on Recurring Template Actions', severity: 'High', remediation: 'Scope template read/write/generate operations to the owning tenant and audit cross-tenant attempts.' },
    guide: 'Step by step: 1) Log in as BrightLedger. 2) POST /templates/2/generate. 3) A new invoice is created from PixelCFO\'s template, in their account. 4) You reached inside another firm\'s automation — IDOR with a multiplier.' },
  { id: 'template-tamper', feature: 'Recurring Templates', name: 'Generated Invoice Amount Tampering', owasp: 'A04 Insecure Design', difficulty: 'Intermediate',
    hints: ['Generating an invoice from your own template accepts an "amount" override in the request.', 'The template says $300. The request can say otherwise.', 'POST /templates/1/generate with amount=1 — the generated invoice totals $1, not $300.'],
    lesson: 'Derived documents must inherit values from the source object server-side; overrides belong in explicit, authorised edit flows.',
    impact: 'Retainers silently bill at $1 a month — the firm\'s most reliable revenue stream is discounted to zero by one edited field.',
    report: { title: 'Client-Supplied Amount Override on Template Generation', severity: 'High', remediation: 'Generate invoices strictly from stored template values; ignore or strictly validate any posted overrides.' },
    guide: 'Step by step: 1) Note template 1 is a $300 retainer. 2) POST /templates/1/generate with amount=1. 3) The new invoice totals $1. 4) The template\'s price was never consulted — the request rewrote it.' },

  /* ---------------- Search & Exports ---------------- */
  { id: 'search-sqli', feature: 'Search & Exports', name: 'SQL Injection in Invoice Search', owasp: 'A03 Injection', difficulty: 'Intermediate',
    hints: ['Invoice search filters with a hand-built query over invoice numbers and client names.', 'A tautology in the search box makes the filter match everything — including other firms\' rows.', "Search for: ' OR '1'='1 — the results include PixelCFO invoices."],
    lesson: 'Search is a query too: every filter built by concatenation is injectable, and injection in a multi-tenant search breaks tenant isolation.',
    impact: 'One search string dumps every firm\'s invoices from a feature meant to show only your own.',
    report: { title: 'SQL Injection in Invoice Search', severity: 'Critical', remediation: 'Parameterise search queries and apply tenant scoping in the data layer, not in string filters.' },
    guide: 'Step by step: 1) Log in and open invoice search. 2) Enter \' OR \'1\'=\'1 as the query. 3) Results include INV-2001/INV-2002 — another firm\'s invoices. 4) The filter matched everything because the query logic was injected.' },
  { id: 'search-xss', feature: 'Search & Exports', name: 'Reflected XSS in Search', owasp: 'A03 Injection', difficulty: 'Beginner',
    hints: ['The results page prints "Results for: <your query>" — exactly as typed.', 'Reflected means the payload comes back in the same response, unencoded.', 'Search for <script>alert(1)</script> and view the page source/response.'],
    lesson: 'Reflecting request input into HTML without encoding is XSS, even on an internal search page.',
    impact: 'A crafted search link sent to a staff member executes script in their session — the entry point for account takeover.',
    report: { title: 'Reflected Cross-Site Scripting in Search Results', severity: 'Medium', remediation: 'Encode all reflected input on output; avoid injecting raw query text into HTML.' },
    guide: 'Step by step: 1) Search for <script>alert(1)</script>. 2) The results heading prints your input raw. 3) In a browser the script runs in the victim\'s session. 4) Any page that echoes input owes the user encoding.' },
  { id: 'export-exposure', feature: 'Search & Exports', name: 'Full Data Export Exposure', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The CSV export was built for firm owners. Who else can call it?', 'The client viewer role should see one client\'s invoices — try the export as the viewer.', 'Log in as viewer@novatech.local and open /export/invoices — you receive every invoice in the system.'],
    lesson: 'Bulk exports are the highest-value endpoint in a SaaS: they need the strictest role checks and tenant scoping.',
    impact: 'One click exfiltrates the entire billing database — every firm, every client, every amount — the exact dataset needed for large-scale invoice fraud.',
    report: { title: 'Broken Access Control on Data Export (All Tenants)', severity: 'Critical', remediation: 'Restrict exports to owner role, scope rows to the caller\'s tenant, and log/alert on export events.' },
    guide: 'Step by step: 1) Log in as the client viewer — a role meant to see only NovaTech\'s invoices. 2) Open /export/invoices. 3) A CSV downloads with ALL invoices from ALL firms. 4) The export checked only that you were logged in, never what you may take.' },

  /* ---------------- Admin Panel ---------------- */
  { id: 'admin-users-exposure', feature: 'Admin Panel', name: 'Admin User List Exposure (JSON)', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The admin console has a JSON helper endpoint for its user table. Was it given the same protection as the page?', 'Any logged-in user can ask for /admin/users.json — including staff.', 'As staff, fetch /admin/users.json and read every account, including passwords.'],
    lesson: 'APIs and helper endpoints inherit none of the page\'s protection automatically; each route needs its own authorisation.',
    impact: 'Every user\'s email and password is handed to any low-privilege account — full platform compromise in one request.',
    report: { title: 'Broken Access Control Exposes Full User List with Passwords via JSON Endpoint', severity: 'Critical', remediation: 'Enforce admin role on the endpoint; never serialise password fields; store passwords hashed (bcrypt/argon2).' },
    guide: 'Step by step: 1) Log in as staff (a non-admin). 2) GET /admin/users.json. 3) The full user list returns, passwords included. 4) The admin PAGE checks your role — the JSON endpoint behind it never did.' },
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'CSRF on Admin User Deactivation', owasp: 'A01 Broken Access Control', difficulty: 'Advanced',
    hints: ['Deactivating a user is a state-changing admin POST. Does it demand the origin marker?', 'Admin actions are the highest-value CSRF targets — and this one skips the check.', 'As admin, POST /admin/users/2/deactivate WITHOUT the _origin field — the staff account is deactivated anyway.'],
    lesson: 'Privileged state changes need anti-CSRF tokens most of all; a single forged request can lock a firm out of its own platform.',
    impact: 'An attacker page visited by the admin deactivates the firm\'s staff — denial of service against the business, timed for maximum damage.',
    report: { title: 'Cross-Site Request Forgery on Admin User Deactivation', severity: 'High', remediation: 'Require anti-CSRF tokens on all admin mutations and re-confirm highly sensitive actions.' },
    guide: 'Step by step: 1) Log in as the platform admin. 2) POST /admin/users/2/deactivate with no _origin marker. 3) The staff user is deactivated regardless. 4) If a browser had sent this from an attacker\'s site, the cookies would have ridden along — that is the CSRF.' },

  /* ---------------- Platform & API ---------------- */
  { id: 'api-weak-token', feature: 'Platform & API', name: 'Predictable API Token & Unscoped API Data', owasp: 'A07 Authentication Failures', difficulty: 'Advanced',
    hints: ['API keys here are derived, not random: the token is simply hx_ + base64(the account email).', 'If you know any user\'s email, you know their API key. And the API does not scope results to their firm.', 'Compute the PixelCFO owner\'s token from owner@pixelcfo.local and call GET /api/invoices with header X-API-Key — invoices from all firms come back.'],
    lesson: 'API credentials must be high-entropy random values, and every API response must be scoped to the authenticated tenant.',
    impact: 'Anyone who knows a business email (public information) owns its API — and this API hands over every tenant\'s invoices, not just theirs.',
    report: { title: 'Predictable API Tokens and Missing Tenant Scoping in API', severity: 'Critical', remediation: 'Issue random, revocable API keys (hashed at rest), and enforce tenant scoping on every API query.' },
    guide: 'Step by step: 1) Notice your own API token pattern on the settings page: hx_ plus base64 of your email. 2) Derive the token for owner@pixelcfo.local the same way. 3) GET /api/invoices with that X-API-Key. 4) All firms\' invoices return — a guessed key plus an unscoped API is total exposure.' }
);

/* --------- remaining key fragments (see note at top of file) --------- */
const _eB = ['LTlPRg==', 'TzBNRg==', 'UkpSSg=='];
const _cB = ['LTVNTQ==', 'QTBJRw==', 'VUEwVw=='];
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
  return Buffer.from(JSON.stringify({ uid: user.id, role: user.role, acc: user.accountId }), 'utf8').toString('base64');
}
function getSession(req) {
  const c = cookies(req);
  if (!c.hx_sess) return null;
  try {
    const s = JSON.parse(Buffer.from(c.hx_sess, 'base64').toString('utf8'));
    const dbUser = users.find(u => u.id === s.uid && u.active);
    if (!dbUser) return null;
    return { user: dbUser, cookieRole: s.role, acc: s.acc };
  } catch (e) { return null; }
}
function apiTokenFor(user) { return 'hx_' + Buffer.from(user.email, 'utf8').toString('base64'); }
function resetTokenFor(user) { return 'RST-' + (user.id * 137 + 42); }
const issuedResetTokens = new Set();
const loginFails = {};
const forgotOutcomes = {};

/* ============================ chatbot (§6) ============================ */
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
const FEATURE_WORDS = [
  ['Login & Authentication', ['login', 'auth', 'password', 'brute', 'reset token', 'session', 'cookie', 'sqli login', 'enumerat']],
  ['Registration & Firm Profile', ['register', 'registration', 'signup', 'sign up', 'profile', 'firm', 'mass assignment', 'csrf']],
  ['Clients', ['client']],
  ['Invoices', ['invoice', 'price', 'tax', 'discount', 'status']],
  ['Payments', ['payment', 'pay', 'receipt', 'settle']],
  ['Recurring Templates', ['template', 'recurring']],
  ['Search & Exports', ['search', 'export', 'csv']],
  ['Admin Panel', ['admin']],
  ['Platform & API', ['api', 'token', 'platform']]
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
  return 'I can explain this lab\'s features and test counts, report your progress, and — after you have tried a feature at least 3 times — guide you through its tests step by step. Try asking: "how many tests in Invoices?" or "what is my progress?"';
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
    '<a href="/">Dashboard</a> · <a href="/invoices">Invoices</a> · <a href="/clients">Clients</a> · <a href="/templates">Recurring</a> · <a href="/profile">Profile</a> · <a href="/settings">Billing Settings</a> · <a href="/admin">Admin</a>' +
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
function redirect(res, to, headers) { res.writeHead(302, Object.assign({ Location: to }, headers || {})); res.end(); }
function originOk(req, body) {
  const c = cookies(req);
  return body && body._origin && c.hx_origin && body._origin === c.hx_origin;
}
function originField(req) {
  const c = cookies(req);
  return '<input type="hidden" name="_origin" value="' + esc(c.hx_origin || '') + '">';
}

/* ============================ routes ============================ */
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://127.0.0.1');
    const p = u.pathname;
    const method = req.method;

    if (p === '/logo.png') {
      try { const img = fs.readFileSync(path.join(DIR, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(img); }
      catch (e) { return send(res, 404, 'not found'); }
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
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(progressSummary()));
    }
    if (p === '/api/chat' && method === 'POST') {
      let raw = '';
      await new Promise(r => { req.on('data', c => { raw += c; if (raw.length > 20000) req.destroy(); }); req.on('end', r); req.on('error', r); });
      let msg = '';
      try { msg = JSON.parse(raw).message || ''; } catch (e) { msg = raw; }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ reply: chatReply(msg) }));
    }
    if (p === '/api/invoices' && method === 'GET') {
      /* API authenticates by token, not by browser session — handled before the login gate. */
      attempt('Platform & API');
      const key = req.headers['x-api-key'] || '';
      const apiUser = users.find(x => apiTokenFor(x) === key && x.active);
      if (!apiUser) { res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'invalid api key' })); }
      /* VULN(api-weak-token): predictable tokens + results are not scoped to the caller's firm. */
      const data = invoices.map(i => ({ number: i.number, firm: (accountOf(i.accountId) || {}).firmName, client: clientName(i.clientId), total: invTotal(i), status: i.status }));
      if (data.some(d => d.firm !== (accountOf(apiUser.accountId) || {}).firmName)) pass('api-weak-token');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ invoices: data }));
    }

    const sess = getSession(req);
    const needLogin = () => redirect(res, '/login');

    /* ---------- public auth pages ---------- */
    if (p === '/login') {
      if (method === 'GET') {
        return send(res, 200, layout(req, 'Login', '<h2>Log in to HexaInvoice</h2>' +
          '<form method="POST" action="/login" style="background:#fff;padding:20px;border-radius:10px;max-width:420px">' +
          '<label>Email<br><input name="email" style="width:100%;padding:8px"></label><br><br>' +
          '<label>Password<br><input name="password" type="password" style="width:100%;padding:8px"></label><br><br>' +
          '<button style="padding:9px 20px">Log in</button> <a href="/forgot">Forgot password?</a> · <a href="/register">Register a firm</a></form>' +
          '<p style="color:#667;font-size:13px">Demo accounts are listed in README.md.</p>', null));
      }
      const b = await parseBody(req);
      attempt('Login & Authentication');
      const email = (b.email || '').trim();
      const password = b.password || '';
      /* VULN(sqli-login): hand-built "query" — a tautology in the email matches the first user. */
      if (SQLI_RE.test(email) || SQLI_RE.test(password)) {
        const victim = users.find(x => x.active);
        pass('sqli-login');
        return redirect(res, '/', { 'Set-Cookie': ['hx_sess=' + makeSession(victim) + '; Path=/; HttpOnly', 'hx_origin=org' + victim.id + '; Path=/'] });
      }
      const user = users.find(x => x.email.toLowerCase() === email.toLowerCase());
      if (!user || !user.active) {
        return send(res, 200, layout(req, 'Login', '<p style="color:#c0392b">No account exists for that email address.</p><p><a href="/login">Back to login</a></p>', null));
      }
      if (user.password !== password) {
        loginFails[user.email] = (loginFails[user.email] || 0) + 1;
        if (loginFails[user.email] >= 10) pass('brute-force'); /* VULN: still no lockout/throttle */
        return send(res, 200, layout(req, 'Login', '<p style="color:#c0392b">Wrong password for that account.</p><p><a href="/login">Back to login</a></p>', null));
      }
      loginFails[user.email] = 0;
      if (user.email === 'admin@hexainvoice.local' && password === 'admin123') pass('default-creds');
      return redirect(res, '/', { 'Set-Cookie': ['hx_sess=' + makeSession(user) + '; Path=/; HttpOnly', 'hx_origin=org' + user.id + '; Path=/'] });
    }
    if (p === '/logout') return redirect(res, '/login', { 'Set-Cookie': 'hx_sess=; Path=/; Max-Age=0' });
    if (p === '/forgot') {
      if (method === 'GET') {
        return send(res, 200, layout(req, 'Forgot password', '<h2>Reset your password</h2>' +
          '<form method="POST" action="/forgot" style="background:#fff;padding:20px;border-radius:10px;max-width:420px">' +
          '<label>Email<br><input name="email" style="width:100%;padding:8px"></label><br><br><button style="padding:9px 20px">Send reset token</button></form>', null));
      }
      const b = await parseBody(req);
      attempt('Login & Authentication');
      const email = (b.email || '').trim().toLowerCase();
      const user = users.find(x => x.email.toLowerCase() === email);
      const ip = req.socket.remoteAddress || 'x';
      forgotOutcomes[ip] = forgotOutcomes[ip] || new Set();
      forgotOutcomes[ip].add(user ? 'exists' : 'missing');
      if (forgotOutcomes[ip].has('exists') && forgotOutcomes[ip].has('missing')) pass('user-enumeration');
      if (!user) {
        return send(res, 200, layout(req, 'Forgot password', '<p style="color:#c0392b">No account exists for that email address.</p><p><a href="/forgot">Try again</a></p>', null));
      }
      const token = resetTokenFor(user);
      issuedResetTokens.add(token + ':' + user.id);
      return send(res, 200, layout(req, 'Forgot password', '<p>A password reset was created for that account.</p>' +
        '<p style="background:#fff8e1;padding:12px;border-radius:8px">(Lab simulation of the email) — your reset token is <b>' + esc(token) + '</b>. Use it on <a href="/reset">/reset</a>.</p>', null));
    }
    if (p === '/reset') {
      if (method === 'GET') {
        return send(res, 200, layout(req, 'Reset password', '<h2>Choose a new password</h2>' +
          '<form method="POST" action="/reset" style="background:#fff;padding:20px;border-radius:10px;max-width:420px">' +
          '<label>Email<br><input name="email" style="width:100%;padding:8px"></label><br><br>' +
          '<label>Reset token<br><input name="token" style="width:100%;padding:8px"></label><br><br>' +
          '<label>New password<br><input name="password" type="password" style="width:100%;padding:8px"></label><br><br>' +
          '<button style="padding:9px 20px">Reset password</button></form>', null));
      }
      const b = await parseBody(req);
      attempt('Login & Authentication');
      const user = users.find(x => x.email.toLowerCase() === (b.email || '').trim().toLowerCase());
      if (user && (b.token || '') === resetTokenFor(user)) {
        user.password = b.password || user.password;
        if (!issuedResetTokens.has((b.token || '') + ':' + user.id)) pass('reset-token'); /* VULN: token was predicted, never issued */
        return send(res, 200, layout(req, 'Reset password', '<p>Password changed. <a href="/login">Log in</a></p>', null));
      }
      return send(res, 200, layout(req, 'Reset password', '<p style="color:#c0392b">Invalid token.</p>', null));
    }
    if (p === '/register') {
      if (method === 'GET') {
        return send(res, 200, layout(req, 'Register', '<h2>Register your firm</h2>' +
          '<form method="POST" action="/register" style="background:#fff;padding:20px;border-radius:10px;max-width:420px">' +
          '<label>Firm name<br><input name="firmName" style="width:100%;padding:8px"></label><br><br>' +
          '<label>Your name<br><input name="name" style="width:100%;padding:8px"></label><br><br>' +
          '<label>Email<br><input name="email" style="width:100%;padding:8px"></label><br><br>' +
          '<label>Password<br><input name="password" type="password" style="width:100%;padding:8px"></label><br><br>' +
          '<button style="padding:9px 20px">Create account</button></form>', null));
      }
      const b = await parseBody(req);
      attempt('Registration & Firm Profile');
      const acc = { id: accounts.length + 1, firmName: b.firmName || 'New Firm', plan: 'standard' };
      accounts.push(acc);
      /* VULN(mass-assignment): every posted field is bound onto the new user record. */
      const nu = { id: nextUserId++, email: (b.email || '').trim(), password: b.password || '', name: b.name || 'New User', role: 'owner', accountId: acc.id, clientId: null, active: true };
      for (const k of Object.keys(b)) { if (k in nu && k !== 'id' && k !== 'accountId') nu[k] = b[k]; }
      users.push(nu);
      if (nu.role === 'admin') pass('mass-assignment');
      if ((nu.password || '').length < 8) pass('weak-password'); /* VULN: no password policy */
      return redirect(res, '/', { 'Set-Cookie': ['hx_sess=' + makeSession(nu) + '; Path=/; HttpOnly', 'hx_origin=org' + nu.id + '; Path=/'] });
    }

    /* ---------- everything below needs a login ---------- */
    if (p === '/') {
      if (!sess) return needLogin();
      const acc = accountOf(sess.user.accountId);
      const mine = invoices.filter(i => i.accountId === sess.user.accountId);
      const due = mine.filter(i => i.status === 'sent' || i.status === 'overdue');
      /* VULN(stored-xss-profile): firm name rendered unescaped. */
      let body = '<h2>' + (acc ? acc.firmName : '') + ' — Dashboard</h2>' +
        '<p>Welcome, ' + esc(sess.user.name) + '. Invoices: <b>' + mine.length + '</b> · Awaiting payment: <b>' + due.length + '</b></p>' +
        '<h3>Recent invoices</h3><table style="background:#fff;border-collapse:collapse;min-width:520px">' +
        '<tr><th style="padding:6px 10px;text-align:left">Number</th><th style="padding:6px 10px;text-align:left">Client</th><th style="padding:6px 10px;text-align:left">Total</th><th style="padding:6px 10px;text-align:left">Status</th></tr>' +
        mine.slice(-5).reverse().map(i => '<tr><td style="padding:6px 10px"><a href="/invoices/' + i.id + '">' + i.number + '</a></td><td style="padding:6px 10px">' + esc(clientName(i.clientId)) + '</td><td style="padding:6px 10px">$' + invTotal(i).toFixed(2) + '</td><td style="padding:6px 10px">' + i.status + '</td></tr>').join('') +
        '</table><p>Your API token: <code>' + esc(apiTokenFor(sess.user)) + '</code> (header <code>X-API-Key</code> on /api/invoices)</p>';
      return send(res, 200, layout(req, 'Dashboard', body, sess));
    }
    if (!sess && p !== '/tests' && p !== '/complete' && p !== '/certificate') return needLogin();

    if (p === '/profile') {
      if (method === 'GET') {
        const acc = accountOf(sess.user.accountId);
        return send(res, 200, layout(req, 'Profile', '<h2>Firm profile</h2>' +
          '<form method="POST" action="/profile" style="background:#fff;padding:20px;border-radius:10px;max-width:460px">' + originField(req) +
          '<label>Firm name<br><input name="firmName" value="' + esc(acc.firmName) + '" style="width:100%;padding:8px"></label><br><br>' +
          '<label>Your display name<br><input name="name" value="' + esc(sess.user.name) + '" style="width:100%;padding:8px"></label><br><br>' +
          '<button style="padding:9px 20px">Save profile</button></form>', sess));
      }
      const b = await parseBody(req);
      attempt('Registration & Firm Profile');
      if (!originOk(req, b)) pass('csrf-profile'); /* VULN: update applies with no origin check */
      const acc = accountOf(sess.user.accountId);
      if (typeof b.firmName === 'string') {
        acc.firmName = b.firmName;
        if (XSS_RE.test(b.firmName)) pass('stored-xss-profile');
      }
      if (typeof b.name === 'string') sess.user.name = b.name;
      return redirect(res, '/profile');
    }
    if (p === '/settings') {
      /* Owner-only page — but the gate believes the role inside the client cookie. */
      if (sess.cookieRole !== 'owner' && sess.cookieRole !== 'admin') {
        return send(res, 403, layout(req, 'Forbidden', '<h2>403 — Owners only</h2><p>Billing settings are restricted to firm owners.</p>', sess));
      }
      if (sess.user.role !== sess.cookieRole) pass('cookie-role'); /* forged role in cookie reached the gated page */
      const acc = accountOf(sess.user.accountId);
      return send(res, 200, layout(req, 'Billing Settings', '<h2>Billing settings — ' + esc(acc.firmName) + '</h2>' +
        '<p>Plan: <b>' + esc(acc.plan) + '</b> · Payout method: Bank •••• 4471 · Next payout: 1st of month.</p>' +
        '<p style="color:#667">(Owner-only area: payment methods, payout bank details and plan changes live here.)</p>', sess));
    }

    /* ---------- clients ---------- */
    if (p === '/clients' && method === 'GET') {
      const mine = clients.filter(c => c.accountId === sess.user.accountId);
      let body = '<h2>Clients</h2><p><a href="/clients/new">+ Add client</a></p><ul>' +
        mine.map(c => '<li><a href="/clients/' + c.id + '">' + esc(c.name) + '</a> — ' + esc(c.contactName) + ' (' + esc(c.email) + ')</li>').join('') + '</ul>';
      return send(res, 200, layout(req, 'Clients', body, sess));
    }
    if (p === '/clients/new') {
      if (method === 'GET') {
        return send(res, 200, layout(req, 'Add client', '<h2>Add client</h2>' +
          '<form method="POST" action="/clients/new" style="background:#fff;padding:20px;border-radius:10px;max-width:460px">' + originField(req) +
          '<label>Company name<br><input name="name" style="width:100%;padding:8px"></label><br><br>' +
          '<label>Contact name<br><input name="contactName" style="width:100%;padding:8px"></label><br><br>' +
          '<label>Contact email<br><input name="email" style="width:100%;padding:8px"></label><br><br>' +
          '<label>Address<br><input name="address" style="width:100%;padding:8px"></label><br><br>' +
          '<button style="padding:9px 20px">Add client</button></form>', sess));
      }
      const b = await parseBody(req);
      attempt('Clients');
      const nc = { id: nextClientId++, accountId: sess.user.accountId, name: b.name || 'Client', contactName: b.contactName || '', email: b.email || '', address: b.address || '' };
      clients.push(nc);
      if (XSS_RE.test(nc.contactName) || XSS_RE.test(nc.name)) pass('client-xss');
      return redirect(res, '/clients/' + nc.id);
    }
    if (p.startsWith('/clients/') && method === 'GET') {
      attempt('Clients');
      const id = parseInt(p.split('/')[2], 10);
      const c = clients.find(x => x.id === id);
      if (!c) return send(res, 404, layout(req, 'Not found', '<h2>Client not found</h2>', sess));
      if (c.accountId !== sess.user.accountId) pass('client-idor'); /* VULN: served anyway */
      /* VULN(client-xss): contact name rendered unescaped. */
      let body = '<h2>' + esc(c.name) + '</h2><p>Contact: ' + c.contactName + '</p><p>Email: ' + esc(c.email) + '</p><p>Address: ' + esc(c.address) + '</p>';
      return send(res, 200, layout(req, 'Client', body, sess));
    }

    /* ---------- invoices ---------- */
    if (p === '/invoices' && method === 'GET') {
      attempt('Invoices');
      const q = u.searchParams.get('q') || '';
      let rows = invoices.filter(i => i.accountId === sess.user.accountId);
      let heading = '<h2>Invoices</h2>';
      if (q) {
        attempt('Search & Exports');
        /* VULN(search-sqli): the "query" is built by concatenation, so a tautology matches everything. */
        if (SQLI_RE.test(q)) { rows = invoices.slice(); pass('search-sqli'); }
        else {
          const needle = q.toLowerCase();
          rows = rows.filter(i => i.number.toLowerCase().includes(needle) || clientName(i.clientId).toLowerCase().includes(needle));
        }
        if (XSS_RE.test(q)) pass('search-xss');
        /* VULN(search-xss): the query is reflected unescaped. */
        heading = '<h2>Invoices</h2><p>Results for: ' + q + '</p>';
      }
      let body = heading +
        '<form method="GET" action="/invoices"><input name="q" placeholder="Search number or client" style="padding:7px;width:260px"> <button>Search</button></form>' +
        '<p><a href="/invoices/new">+ New invoice</a> · <a href="/export/invoices">Export CSV</a></p>' +
        '<table style="background:#fff;border-collapse:collapse;min-width:560px"><tr><th style="padding:6px 10px;text-align:left">Number</th><th style="padding:6px 10px;text-align:left">Client</th><th style="padding:6px 10px;text-align:left">Total</th><th style="padding:6px 10px;text-align:left">Status</th><th style="padding:6px 10px;text-align:left">Due</th></tr>' +
        rows.map(i => '<tr><td style="padding:6px 10px"><a href="/invoices/' + i.id + '">' + i.number + '</a></td><td style="padding:6px 10px">' + esc(clientName(i.clientId)) + '</td><td style="padding:6px 10px">$' + invTotal(i).toFixed(2) + '</td><td style="padding:6px 10px">' + i.status + '</td><td style="padding:6px 10px">' + i.due + '</td></tr>').join('') +
        '</table>';
      return send(res, 200, layout(req, 'Invoices', body, sess));
    }
    if (p === '/invoices/new') {
      const myClients = clients.filter(c => c.accountId === sess.user.accountId);
      if (method === 'GET') {
        return send(res, 200, layout(req, 'New invoice', '<h2>New invoice</h2>' +
          '<form method="POST" action="/invoices/new" style="background:#fff;padding:20px;border-radius:10px;max-width:460px">' + originField(req) +
          '<label>Client<br><select name="clientId" style="width:100%;padding:8px">' + myClients.map(c => '<option value="' + c.id + '">' + esc(c.name) + '</option>').join('') + '</select></label><br><br>' +
          '<label>Service<br><select name="serviceId" id="svc" style="width:100%;padding:8px">' + services.map(s => '<option value="' + s.id + '" data-rate="' + s.rate + '">' + esc(s.name) + ' — $' + s.rate + '</option>').join('') + '</select></label><br><br>' +
          '<label>Quantity<br><input name="qty" value="1" style="width:100%;padding:8px"></label>' +
          '<input type="hidden" name="unitPrice" id="unitPrice" value="' + services[0].rate + '">' +
          '<input type="hidden" name="taxRate" value="' + STD_TAX + '">' +
          '<label>Discount % (policy max ' + MAX_DISCOUNT + ')<br><input name="discountPct" value="0" style="width:100%;padding:8px"></label><br><br>' +
          '<label>Due date<br><input name="due" value="2026-11-15" style="width:100%;padding:8px"></label><br><br>' +
          '<button style="padding:9px 20px">Create invoice (draft)</button></form>' +
          '<script>document.getElementById("svc").addEventListener("change",function(){document.getElementById("unitPrice").value=this.options[this.selectedIndex].dataset.rate;});</script>', sess));
      }
      const b = await parseBody(req);
      attempt('Invoices');
      const svc = services.find(s => s.id === parseInt(b.serviceId, 10)) || services[0];
      const unitPrice = parseFloat(b.unitPrice);
      const taxRate = parseFloat(b.taxRate);
      const discountPct = parseFloat(b.discountPct || '0');
      /* VULN(price-tamper): the posted unit price is trusted over the catalogue. */
      if (!isNaN(unitPrice) && unitPrice !== svc.rate) pass('price-tamper');
      /* VULN(tax-tamper): posted tax/discount accepted without the firm's rules. */
      if ((!isNaN(taxRate) && taxRate !== STD_TAX) || isNaN(discountPct) === false && (discountPct > MAX_DISCOUNT || discountPct < 0)) pass('tax-tamper');
      const seq = sess.user.accountId === 2 ? (invSeqB++) : (invSeqA++);
      const inv = { id: nextInvoiceId++, number: 'INV-' + seq, accountId: sess.user.accountId, clientId: parseInt(b.clientId, 10) || (myClients.length ? myClients[0].id : 1), serviceId: svc.id, qty: Math.max(1, parseInt(b.qty, 10) || 1), unitPrice: isNaN(unitPrice) ? svc.rate : unitPrice, taxRate: isNaN(taxRate) ? STD_TAX : taxRate, discountPct: isNaN(discountPct) ? 0 : discountPct, status: 'draft', due: b.due || '2026-11-15' };
      invoices.push(inv);
      return redirect(res, '/invoices/' + inv.id);
    }
    if (p.startsWith('/invoices/') && p.endsWith('/status') && method === 'POST') {
      const b = await parseBody(req);
      attempt('Invoices');
      const id = parseInt(p.split('/')[2], 10);
      const inv = invoices.find(i => i.id === id);
      if (!inv) return send(res, 404, layout(req, 'Not found', '<h2>Invoice not found</h2>', sess));
      /* VULN(status-forge): any named status is applied; "paid" needs no payment. */
      inv.status = (b.status || inv.status).toString();
      if (inv.status === 'paid' && paidSum(inv.id) < invTotal(inv)) pass('status-forge');
      return redirect(res, '/invoices/' + inv.id);
    }
    if (p.startsWith('/invoices/') && p.endsWith('/pay') && method === 'POST') {
      const b = await parseBody(req);
      attempt('Payments');
      const id = parseInt(p.split('/')[2], 10);
      const inv = invoices.find(i => i.id === id);
      if (!inv) return send(res, 404, layout(req, 'Not found', '<h2>Invoice not found</h2>', sess));
      const amount = parseFloat(b.amount || '0');
      const paidAmount = parseFloat(b.paidAmount || '0');
      payments.push({ id: nextPaymentId++, invoiceId: inv.id, accountId: inv.accountId, amount: isNaN(amount) ? 0 : amount, method: b.method || 'card', date: '2026-10-23' });
      /* VULN(payment-forge): settlement trusts the posted summary field, not the sum of payments. */
      if (!isNaN(paidAmount) && paidAmount >= invTotal(inv)) {
        inv.status = 'paid';
        if (paidSum(inv.id) < invTotal(inv)) pass('payment-forge');
      } else if (paidSum(inv.id) >= invTotal(inv)) inv.status = 'paid';
      return redirect(res, '/invoices/' + inv.id);
    }
    if (p.startsWith('/invoices/') && method === 'GET') {
      attempt('Invoices');
      const id = parseInt(p.split('/')[2], 10);
      const inv = invoices.find(i => i.id === id);
      if (!inv) return send(res, 404, layout(req, 'Not found', '<h2>Invoice not found</h2>', sess));
      if (inv.accountId !== sess.user.accountId) pass('invoice-idor'); /* VULN: served anyway */
      const total = invTotal(inv);
      const ps = payments.filter(x => x.invoiceId === inv.id);
      let body = '<h2>' + inv.number + '</h2>' +
        '<p>Client: ' + esc(clientName(inv.clientId)) + ' · Status: <b>' + inv.status + '</b> · Due: ' + inv.due + '</p>' +
        '<table style="background:#fff;border-collapse:collapse;min-width:480px"><tr><th style="padding:6px 10px;text-align:left">Item</th><th style="padding:6px 10px">Qty</th><th style="padding:6px 10px">Unit</th><th style="padding:6px 10px">Tax</th><th style="padding:6px 10px">Disc</th><th style="padding:6px 10px">Total</th></tr>' +
        '<tr><td style="padding:6px 10px">' + esc(serviceName(inv.serviceId)) + '</td><td style="padding:6px 10px">' + inv.qty + '</td><td style="padding:6px 10px">$' + Number(inv.unitPrice).toFixed(2) + '</td><td style="padding:6px 10px">' + inv.taxRate + '%</td><td style="padding:6px 10px">' + inv.discountPct + '%</td><td style="padding:6px 10px"><b>$' + total.toFixed(2) + '</b></td></tr></table>' +
        '<h3>Payments</h3>' + (ps.length ? '<ul>' + ps.map(x => '<li>$' + x.amount.toFixed(2) + ' via ' + esc(x.method) + ' — <a href="/payments/' + x.id + '/receipt">receipt</a></li>').join('') + '</ul>' : '<p>None recorded.</p>') +
        '<h3>Record payment</h3><form method="POST" action="/invoices/' + inv.id + '/pay" style="background:#fff;padding:14px;border-radius:10px;max-width:420px">' + originField(req) +
        '<label>Amount<br><input name="amount" value="' + total.toFixed(2) + '" style="width:100%;padding:8px"></label>' +
        '<input type="hidden" name="paidAmount" value="' + total.toFixed(2) + '"><br><button style="padding:8px 18px">Record payment</button></form>' +
        '<h3>Change status</h3><form method="POST" action="/invoices/' + inv.id + '/status">' + originField(req) +
        '<select name="status"><option>draft</option><option>sent</option><option>paid</option><option>overdue</option></select> <button>Apply</button></form>';
      return send(res, 200, layout(req, inv.number, body, sess));
    }
    if (p.startsWith('/payments/') && p.endsWith('/receipt') && method === 'GET') {
      attempt('Payments');
      const id = parseInt(p.split('/')[2], 10);
      const pay = payments.find(x => x.id === id);
      if (!pay) return send(res, 404, layout(req, 'Not found', '<h2>Receipt not found</h2>', sess));
      if (pay.accountId !== sess.user.accountId) pass('receipt-idor'); /* VULN: served anyway */
      const inv = invoices.find(i => i.id === pay.invoiceId);
      let body = '<h2>Payment receipt #' + pay.id + '</h2><div style="background:#fff;padding:20px;border-radius:10px;max-width:460px">' +
        '<p>Invoice: ' + (inv ? inv.number : '?') + '</p><p>Client: ' + esc(inv ? clientName(inv.clientId) : '?') + '</p>' +
        '<p>Amount: <b>$' + pay.amount.toFixed(2) + '</b></p><p>Method: ' + esc(pay.method) + '</p><p>Date: ' + pay.date + '</p></div>';
      return send(res, 200, layout(req, 'Receipt', body, sess));
    }

    /* ---------- recurring templates ---------- */
    if (p === '/templates' && method === 'GET') {
      const mine = templates.filter(t => t.accountId === sess.user.accountId);
      let body = '<h2>Recurring templates</h2><table style="background:#fff;border-collapse:collapse;min-width:520px">' +
        '<tr><th style="padding:6px 10px;text-align:left">Template</th><th style="padding:6px 10px;text-align:left">Client</th><th style="padding:6px 10px;text-align:left">Amount</th><th style="padding:6px 10px;text-align:left">Cycle</th><th></th></tr>' +
        mine.map(t => '<tr><td style="padding:6px 10px">' + esc(t.name) + '</td><td style="padding:6px 10px">' + esc(clientName(t.clientId)) + '</td><td style="padding:6px 10px">$' + (t.qty * t.unitPrice).toFixed(2) + '</td><td style="padding:6px 10px">' + t.cycle + '</td>' +
          '<td style="padding:6px 10px"><form method="POST" action="/templates/' + t.id + '/generate">' + originField(req) + '<input type="hidden" name="amount" value="' + (t.qty * t.unitPrice) + '"><button>Generate invoice</button></form></td></tr>').join('') + '</table>';
      return send(res, 200, layout(req, 'Recurring templates', body, sess));
    }
    if (p.startsWith('/templates/') && p.endsWith('/generate') && method === 'POST') {
      const b = await parseBody(req);
      attempt('Recurring Templates');
      const id = parseInt(p.split('/')[2], 10);
      const t = templates.find(x => x.id === id);
      if (!t) return send(res, 404, layout(req, 'Not found', '<h2>Template not found</h2>', sess));
      if (t.accountId !== sess.user.accountId) pass('template-idor'); /* VULN: generation runs anyway */
      const amount = parseFloat(b.amount);
      const templateTotal = t.qty * t.unitPrice;
      /* VULN(template-tamper): a posted amount overrides the template's own price. */
      let unitPrice = t.unitPrice, qty = t.qty;
      if (!isNaN(amount) && amount !== templateTotal) { unitPrice = amount; qty = 1; pass('template-tamper'); }
      const seq = t.accountId === 2 ? (invSeqB++) : (invSeqA++);
      const inv = { id: nextInvoiceId++, number: 'INV-' + seq, accountId: t.accountId, clientId: t.clientId, serviceId: t.serviceId, qty, unitPrice, taxRate: STD_TAX, discountPct: 0, status: 'draft', due: '2026-11-15' };
      invoices.push(inv);
      return redirect(res, '/invoices/' + inv.id);
    }

    /* ---------- exports & API ---------- */
    if (p === '/export/invoices' && method === 'GET') {
      attempt('Search & Exports');
      /* VULN(export-exposure): any logged-in role downloads every firm's invoices. */
      if (sess.user.role !== 'owner') pass('export-exposure');
      const csv = 'number,firm,client,total,status\n' + invoices.map(i => [i.number, (accountOf(i.accountId) || {}).firmName || '', clientName(i.clientId), invTotal(i).toFixed(2), i.status].join(',')).join('\n');
      res.writeHead(200, { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="invoices-export.csv"' });
      return res.end(csv);
    }
    /* ---------- admin ---------- */
    if (p === '/admin/users.json' && method === 'GET') {
      attempt('Admin Panel');
      /* VULN(admin-users-exposure): the JSON behind the admin table skips the role check — passwords included. */
      if (sess.user.role !== 'admin') pass('admin-users-exposure');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ users: users.map(x => ({ id: x.id, email: x.email, password: x.password, role: x.role, accountId: x.accountId, active: x.active })) }));
    }
    if (p === '/admin' && method === 'GET') {
      attempt('Admin Panel');
      if (sess.user.role !== 'admin') return send(res, 403, layout(req, 'Forbidden', '<h2>403 — Platform admins only</h2>', sess));
      let body = '<h2>Platform admin — all users</h2><table style="background:#fff;border-collapse:collapse;min-width:560px">' +
        '<tr><th style="padding:6px 10px;text-align:left">ID</th><th style="padding:6px 10px;text-align:left">Email</th><th style="padding:6px 10px;text-align:left">Role</th><th style="padding:6px 10px;text-align:left">Active</th><th></th></tr>' +
        users.map(x => '<tr><td style="padding:6px 10px">' + x.id + '</td><td style="padding:6px 10px">' + esc(x.email) + '</td><td style="padding:6px 10px">' + x.role + '</td><td style="padding:6px 10px">' + x.active + '</td>' +
          '<td style="padding:6px 10px"><form method="POST" action="/admin/users/' + x.id + '/deactivate">' + originField(req) + '<button>Deactivate</button></form></td></tr>').join('') + '</table>';
      return send(res, 200, layout(req, 'Admin', body, sess));
    }
    if (p.startsWith('/admin/users/') && p.endsWith('/deactivate') && method === 'POST') {
      const b = await parseBody(req);
      attempt('Admin Panel');
      if (sess.user.role !== 'admin') return send(res, 403, layout(req, 'Forbidden', '<h2>403 — Platform admins only</h2>', sess));
      const id = parseInt(p.split('/')[3], 10);
      const target = users.find(x => x.id === id);
      if (!originOk(req, b)) pass('admin-csrf'); /* VULN: deactivation applies with no origin check */
      if (target) target.active = false;
      return redirect(res, '/admin');
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
function tsHints(t, lvl) {
  let out = '';
  for (let i = 0; i < 3; i++) {
    if (lvl > i) out += '<div style="color:#555;font-size:13px">💡 Hint ' + (i + 1) + ': ' + esc(t.hints[i]) + '</div>';
    else { out += '<div style="font-size:13px"><a href="/tests?h_' + t.id + '=' + (i + 1) + '">Reveal hint ' + (i + 1) + '</a></div>'; break; }
  }
  return out;
}
loadProgress();
server.listen(PORT, '127.0.0.1', () => {
  console.log(LAB_NAME + ' (LAB ' + LAB_NUMBER + ') running at http://127.0.0.1:' + PORT + '  (LOCAL ONLY — deliberately vulnerable lab)');
});
