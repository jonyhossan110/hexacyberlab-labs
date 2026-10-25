'use strict';
/* HexaLabTest — LAB 64 — diagnostic laboratory platform (intentionally vulnerable, LOCAL training only).
   Zero-dependency Node. All patients, results and data are FAKE seed data. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB_NUMBER = 64;
const LAB_NAME = 'HexaLabTest';
const PREV_LAB = 63;
const PORT = 3073;
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const FILES_DIR = path.join(DIR, 'files');

/* --- scattered fragments (region A) --- */

const _KC = ['TC1YSA==', 'OC01Ng==', 'TlpWMQ=='];

/* ============================ SEED DATA (all fake) ============================ */
let USERS = [
  { id: 1, name: 'Lab Admin',        email: 'admin@hexalabtest.local',    password: 'admin123', role: 'admin',      phone: '01700000001', active: true,  resetToken: null, resetRequested: false },
  { id: 2, name: 'Dr. Gregory House', email: 'dr.house@hexalabtest.local', password: 'house123', role: 'doctor',     phone: '01700000002', active: true,  resetToken: null, resetRequested: false },
  { id: 3, name: 'Dr. Ana Reyes',     email: 'dr.reyes@hexalabtest.local', password: 'reyes123', role: 'doctor',     phone: '01700000003', active: true,  resetToken: null, resetRequested: false },
  { id: 4, name: 'Tom Carter',        email: 'tech.tom@hexalabtest.local', password: 'tom123',   role: 'technician', phone: '01700000004', active: true,  resetToken: null, resetRequested: false },
  { id: 5, name: 'Tina Brooks',       email: 'tech.tina@hexalabtest.local', password: 'tina123',  role: 'technician', phone: '01700000005', active: true,  resetToken: null, resetRequested: false },
  { id: 6, name: 'Alice Rahman',      email: 'alice@test.local',          password: 'alice123', role: 'patient',    phone: '01700000006', active: true,  resetToken: null, resetRequested: false },
  { id: 7, name: 'Bob Karim',         email: 'bob@test.local',            password: 'bob123',   role: 'patient',    phone: '01700000007', active: true,  resetToken: null, resetRequested: false },
  { id: 8, name: 'Carol Das',         email: 'carol@test.local',          password: 'carol123', role: 'patient',    phone: '01700000008', active: true,  resetToken: null, resetRequested: false }
];
let nextUserId = 9;

const CATALOG = [
  { id: 'CBC',     name: 'Complete Blood Count (CBC)', price: 25 },
  { id: 'LIPID',   name: 'Lipid Panel',                price: 40 },
  { id: 'HBA1C',   name: 'HbA1c (Diabetes)',           price: 30 },
  { id: 'THYROID', name: 'Thyroid Panel',              price: 55 },
  { id: 'VITD',    name: 'Vitamin D Total',            price: 45 },
  { id: 'PCR',     name: 'COVID-19 RT-PCR',            price: 60 },
  { id: 'LFT',     name: 'Liver Function Test',        price: 50 },
  { id: 'KFT',     name: 'Kidney Function Test',       price: 48 },
  { id: 'QAINT',   name: 'Internal QA Verification Panel', price: 0, internal: true }
];
const catalogById = id => CATALOG.find(t => t.id === id);

let ORDERS = [
  { id: 1001, patientId: 6, doctorId: 2, items: [{ test: 'CBC', price: 25, qty: 1 }, { test: 'HBA1C', price: 30, qty: 1 }], total: 55, status: 'Reported',       results: { 'Hemoglobin': '13.2 g/dL', 'WBC': '6.1 x10^9/L', 'HbA1c': '5.4 %' }, reviewed: true,  reviewedBy: 2, home: false },
  { id: 1002, patientId: 6, doctorId: 3, items: [{ test: 'LIPID', price: 40, qty: 1 }],  total: 40, status: 'Results Ready', results: { 'Total Cholesterol': '212 mg/dL', 'LDL': '138 mg/dL' }, reviewed: false, reviewedBy: null, home: false },
  { id: 1003, patientId: 7, doctorId: 2, items: [{ test: 'THYROID', price: 55, qty: 1 }], total: 55, status: 'In Lab',        results: {}, reviewed: false, reviewedBy: null, home: true },
  { id: 1004, patientId: 7, doctorId: 2, items: [{ test: 'VITD', price: 45, qty: 1 }],    total: 45, status: 'Reported',      results: { 'Vitamin D': '22 ng/mL' }, reviewed: true, reviewedBy: 2, home: false },
  { id: 1005, patientId: 8, doctorId: 3, items: [{ test: 'CBC', price: 25, qty: 1 }],     total: 25, status: 'Sample Collected', results: {}, reviewed: false, reviewedBy: null, home: false },
  { id: 1006, patientId: 8, doctorId: 3, items: [{ test: 'PCR', price: 60, qty: 1 }],     total: 60, status: 'Ordered',       results: {}, reviewed: false, reviewedBy: null, home: true }
];
let nextOrderId = 1007;

let BOOKINGS = [
  { id: 501, patientId: 7, address: 'House 12, Road 5, Dhanmondi, Dhaka',   date: '2026-10-24', fee: 15 },
  { id: 502, patientId: 6, address: 'Flat 7B, Gulshan Avenue, Dhaka',      date: '2026-10-25', fee: 15 }
];
let nextBookingId = 503;
const HOME_FEE = 15;
const ORDER_FLOW = ['Ordered', 'Sample Collected', 'In Lab', 'Results Ready', 'Reported'];

/* ============================ PROGRESS ENGINE ============================ */
let progress = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const p = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      if (p && typeof p === 'object') progress = Object.assign(progress, p);
    }
  } catch (e) { /* corrupted state -> start fresh */ }
}
function saveProgress() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 1)); } catch (e) {}
}
loadProgress();

const sessions = new Map();       // sid -> { uid }
const loginFailures = {};         // email -> failed count
const enumProbes = new Map();     // ip -> Set of probed emails

function pass(id) {
  if (!progress.tests[id]) {
    progress.tests[id] = true;
    const s = summary();
    if (s.complete && !progress.keyRevealed) { progress.keyRevealed = true; progress.completedAt = new Date().toISOString(); }
    saveProgress();
  }
}
function attempt(feature) {
  progress.attempts[feature] = (progress.attempts[feature] || 0) + 1;
  saveProgress();
}
function summary() {
  const total = TESTS.length;
  const done = TESTS.filter(t => progress.tests[t.id]).length;
  const pct = total ? Math.floor(done * 100 / total) : 0;
  const features = {};
  for (const t of TESTS) {
    features[t.feature] = features[t.feature] || { total: 0, done: 0, attempts: progress.attempts[t.feature] || 0 };
    features[t.feature].total++;
    if (progress.tests[t.id]) features[t.feature].done++;
  }
  for (const f of Object.keys(features)) features[f].attempts = progress.attempts[f] || 0;
  return { lab: LAB_NAME, number: LAB_NUMBER, total, done, pct: done === total ? 100 : pct, features, complete: done === total };
}

/* ============================ TESTS REGISTRY ============================ */
const F_AUTH = 'Login & Authentication', F_REG = 'Registration & Profile', F_CAT = 'Test Catalog & Search',
      F_ORD = 'Test Orders', F_SMP = 'Sample Tracking', F_RES = 'Results & Reports',
      F_HOME = 'Home Collection', F_ADM = 'Admin Panel', F_API = 'Platform & API';
const TESTS = [
  /* ---- Login & Authentication ---- */
  { id: 'auth-sqli', feature: F_AUTH, name: 'SQL injection login bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login form builds its database query by gluing your input straight into the query string.', 'Try a quote character in the email field and see how the error/behaviour changes.', "Use email: ' OR '1'='1' -- with any password — the OR makes the row match and the comment eats the password check."],
    lesson: 'String-built queries let an attacker rewrite the login logic itself; parameterised queries make input data-only.',
    impact: 'On a real lab portal this hands an attacker the first account in the database — usually an admin — with no password at all.',
    report: { title: 'SQL Injection in login form allows authentication bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.' } },
  { id: 'auth-brute', feature: F_AUTH, name: 'Brute force — no rate limit or lockout', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Pick one account and keep guessing wrong passwords.', 'Notice nothing slows down, locks, or challenges you — count your failures.', 'After 10+ failed logins for the same account the app is still happily accepting guesses.'],
    lesson: 'Without throttling, lockout or MFA, password guessing is only a matter of time and a wordlist.',
    impact: 'Patient and doctor accounts on a real portal would fall to automated guessing, exposing medical data.',
    report: { title: 'No rate limiting or account lockout on login enables brute-force attacks', severity: 'High', remediation: 'Add progressive delays, lockout and alerting after repeated failures; offer MFA.' } },
  { id: 'auth-enum', feature: F_AUTH, name: 'User enumeration via login and forgot-password', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the login error for an email that exists vs one that does not.', 'Do the same comparison on the forgot-password form.', 'Probe at least 5 different emails — the responses tell you exactly which accounts exist.'],
    lesson: 'Different error messages for "no such user" and "wrong password" turn the login page into an account directory.',
    impact: 'Attackers harvest valid patient/doctor emails first, then aim phishing and password attacks only at real accounts.',
    report: { title: 'User enumeration through differential authentication responses', severity: 'Medium', remediation: 'Return one generic message ("invalid credentials" / "if the account exists…") for every case.' } },
  { id: 'auth-default', feature: F_AUTH, name: 'Default / demo admin credentials still active', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['The login page itself is generous with information.', 'Read the "demo accounts" note under the login form.', 'Sign in as the admin with the published demo password admin123.'],
    lesson: 'Shipped default and demo credentials are the first thing attackers try — and here they are even advertised.',
    impact: 'Anyone on the internet could administer a real diagnostic portal with a password printed on its own login page.',
    report: { title: 'Default/demo administrator credentials active and publicly disclosed', severity: 'Critical', remediation: 'Force credential change on first use; remove demo accounts and credential hints from production.' } },
  { id: 'auth-reset-token', feature: F_AUTH, name: 'Predictable password-reset token', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a reset for your own account and study the token format.', 'The token is derived from something predictable about the account — its numeric id.', 'Tokens follow LT-<id x 137 + 42>. Compute one for a user who never requested a reset and use it.'],
    lesson: 'Reset tokens must be long, random and single-use; a formula based on the user id is a master key for every account.',
    impact: 'Any patient or doctor account — including admins — can be taken over by arithmetic, no inbox access needed.',
    report: { title: 'Password reset tokens are predictable (derived from user ID)', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), expire them quickly and make them single-use.' } },
  { id: 'auth-cookie', feature: F_AUTH, name: 'Session role trusted from a client cookie', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Inspect the cookies the app sets after login — one of them describes who you are.', 'The server believes that cookie instead of checking the account.', 'Set hx_role=admin in your browser, then visit /admin.'],
    lesson: 'Authorization data must live server-side; anything stored on the client can be edited by the client.',
    impact: 'Any logged-in patient becomes an administrator by editing a cookie — full control of a medical platform.',
    report: { title: 'Privilege escalation via client-controlled role cookie', severity: 'Critical', remediation: 'Store roles in the server-side session only; ignore role claims from cookies or request data.' } },

  /* ---- Registration & Profile ---- */
  { id: 'reg-weakpass', feature: F_REG, name: 'Weak password policy (1 character accepted)', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a new account and be lazy with the password.', 'There is no length or complexity check at all.', 'A one-character password such as "x" is accepted.'],
    lesson: 'A password policy is the cheapest defence against guessing and credential stuffing.',
    impact: 'Patients will choose trivial passwords on a real portal and their medical reports become easy pickings.',
    report: { title: 'No minimum password strength enforced at registration', severity: 'Medium', remediation: 'Require ≥10 characters, check against breached-password lists, and encourage passphrases.' } },
  { id: 'reg-massassign', feature: F_REG, name: 'Mass assignment — self-assign a staff role', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration handler binds the whole submitted form to the new account.', 'Add a field the form never shows you: role.', 'POST /register with role=doctor (or technician/admin) and the account is created with that role.'],
    lesson: 'Binding request data directly to models lets attackers set fields the UI never offered — like their own role.',
    impact: 'Anyone can register as a "doctor" on a real lab platform and read or alter patient results.',
    report: { title: 'Mass assignment in registration allows role escalation', severity: 'High', remediation: 'Whitelist assignable fields server-side; set role explicitly in code, never from request data.' } },
  { id: 'reg-xss', feature: F_REG, name: 'Stored XSS in display name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is shown back on several pages — including staff pages.', 'It is written into the page without encoding.', 'Register (or rename yourself) with a name like <script>alert(1)</script> and it is stored and rendered raw.'],
    lesson: 'Any user-controlled text rendered without output encoding becomes JavaScript in other users\u2019 browsers.',
    impact: 'An attacker\u2019s "name" would execute in doctors\u2019 and admins\u2019 browsers, stealing sessions on a real portal.',
    report: { title: 'Stored cross-site scripting via display name', severity: 'High', remediation: 'Context-encode all user output; adopt a strict Content-Security-Policy as defence in depth.' } },
  { id: 'reg-csrf', feature: F_REG, name: 'CSRF on profile update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Legitimate forms carry a hidden _origin marker that matches a cookie.', 'The profile endpoint never actually verifies it.', 'Submit a profile change with no _origin field (e.g. from a cross-site form) and it is accepted.'],
    lesson: 'State-changing endpoints must verify an anti-CSRF token; a marker that is rendered but never checked is decoration.',
    impact: 'A malicious page could silently change a doctor\u2019s or patient\u2019s profile details while they are logged in.',
    report: { title: 'Missing CSRF protection on profile update', severity: 'Medium', remediation: 'Verify a per-session CSRF token on every state-changing request; use SameSite cookies.' } },

  /* ---- Test Catalog & Search ---- */
  { id: 'search-sqli', feature: F_CAT, name: 'SQL injection in catalog search dumps hidden tests', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Search filters tests by name using another hand-built query.', 'A quote in the search box changes the query logic.', "Search for ' OR '1'='1 and the result set grows beyond the public catalogue — including the internal QA panel."],
    lesson: 'Every input that reaches a query is an injection surface, not just the login form.',
    impact: 'On a real platform this leaks internal-only services and is the first step toward dumping the whole database.',
    report: { title: 'SQL injection in test-catalog search reveals non-public entries', severity: 'High', remediation: 'Parameterise search queries; return only public catalogue rows to unauthenticated roles.' } },
  { id: 'search-xss', feature: F_CAT, name: 'Reflected XSS in catalog search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your search term is echoed in the results heading.', 'It is echoed without encoding.', 'Search for <script>alert(1)</script> and the payload comes straight back in the page.'],
    lesson: 'Reflected input must be encoded; "it is only search" is how phishing links into trusted domains are born.',
    impact: 'Attackers send victims links to the real lab site that run attacker script in the victim\u2019s session.',
    report: { title: 'Reflected cross-site scripting in search results', severity: 'Medium', remediation: 'HTML-encode reflected values; validate input; add a Content-Security-Policy.' } },

  /* ---- Test Orders ---- */
  { id: 'order-price', feature: F_ORD, name: 'Price tampering on test orders', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['The order form carries each test\u2019s price in a hidden field.', 'The server trusts whatever price is submitted.', 'Order the $55 Thyroid Panel with price_THYROID=1 and the bill becomes $1.'],
    lesson: 'Prices are server-side truth. Anything priced by the browser will be repriced by the customer.',
    impact: 'A real lab would run expensive diagnostics for $1 — direct revenue loss on every order.',
    report: { title: 'Client-side price tampering in order placement', severity: 'High', remediation: 'Recompute all prices from the server-side catalogue at checkout; ignore submitted prices.' } },
  { id: 'order-qty', feature: F_ORD, name: 'Quantity tampering — negative quantities accepted', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['Each ordered test also carries a qty field.', 'Nothing checks that the quantity is sane.', 'Submit qty=-2 for a test and the order total goes negative — the lab would owe YOU money.'],
    lesson: 'Quantities, like prices, are business rules: validate range server-side (1..max) before doing arithmetic.',
    impact: 'Negative totals corrupt billing, accounting and refund flows on a real platform.',
    report: { title: 'Missing quantity validation allows negative order totals', severity: 'Medium', remediation: 'Validate quantity as an integer within an allowed range on the server before pricing.' } },
  { id: 'order-idor', feature: F_ORD, name: 'Order IDOR — read another patient\u2019s order', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Order pages live at predictable URLs: /orders/<id>.', 'The page checks that you are logged in — not that the order is yours.', 'As Alice, open Bob\u2019s order 1003 or 1004 directly.'],
    lesson: 'Every object access must check ownership; sequential ids make unauthorised browsing trivial.',
    impact: 'Any patient can browse every other patient\u2019s tests and medical history on a real portal — a serious privacy breach.',
    report: { title: 'Insecure direct object reference on order details', severity: 'High', remediation: 'Enforce per-object authorization: patients see only their own orders; staff only within their duties.' } },
  { id: 'order-status-forge', feature: F_ORD, name: 'Order status forged at creation (skip the lab workflow)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The order handler copies more of the form than it should.', 'Add a field the form never shows: status.', 'Create an order with status=Reported and it is born "Reported" — no sample, no lab, no doctor.'],
    lesson: 'Workflow state must be owned by the server; clients propose actions, the server decides the resulting state.',
    impact: 'Fraudulent "completed" medical reports could be manufactured without any test ever being performed.',
    report: { title: 'Client-controlled order status bypasses the diagnostic workflow', severity: 'High', remediation: 'Set initial status in code; allow only server-defined transitions by authorised roles.' } },

  /* ---- Sample Tracking ---- */
  { id: 'sample-forge', feature: F_SMP, name: 'Patient advances own sample status (missing role check)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Samples move Ordered → Sample Collected → In Lab → Results Ready → Reported.', 'The status endpoint only checks that someone is logged in.', 'As a patient, POST /orders/<your id>/status with the next status and it moves.'],
    lesson: 'Function-level authorization matters: an endpoint existing is not permission to use it.',
    impact: 'Patients could mark their own samples as processed/reported, corrupting lab operations and trust in results.',
    report: { title: 'Missing function-level authorization on sample status updates', severity: 'High', remediation: 'Restrict status transitions to technician/admin roles and validate the transition sequence.' } },
  { id: 'sample-queue-leak', feature: F_SMP, name: 'Technician work queue visible to patients', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Technicians have a queue page listing every sample in the lab.', 'Its URL is guessable: /tech/queue.', 'Open it while logged in as a patient — the whole queue, with patient names, is served.'],
    lesson: 'Staff tooling needs the same authorization discipline as admin panels; obscurity is not a control.',
    impact: 'A real queue leak exposes every patient currently being tested and what they are being tested for.',
    report: { title: 'Broken access control exposes technician work queue to patients', severity: 'High', remediation: 'Require technician/admin role for queue endpoints; audit staff URLs for role checks.' } },

  /* ---- Results & Reports ---- */
  { id: 'result-edit', feature: F_RES, name: 'Patient edits own results via the technician endpoint', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Technicians enter results at POST /tech/results.', 'The endpoint never checks the caller\u2019s role.', 'As Alice, POST results for your own order 1002 and change a value — it is stored.'],
    lesson: 'Result integrity is the core asset of a lab; write paths for results must be the most strictly guarded in the system.',
    impact: 'Patients could falsify their own medical results — insurance fraud, unsafe treatment decisions, total loss of trust.',
    report: { title: 'Missing authorization on result entry allows patients to alter medical results', severity: 'Critical', remediation: 'Restrict result entry to verified technician accounts; log and dual-review result changes.' } },
  { id: 'report-idor', feature: F_RES, name: 'Report IDOR — download another patient\u2019s report', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Reports live under the order: /orders/<id>/report.', 'Same story as the order page — login is checked, ownership is not.', 'As Alice, open the report for Bob\u2019s order 1004.'],
    lesson: 'Download endpoints are object accesses too; PDFs and reports need the same ownership checks as pages.',
    impact: 'Complete diagnostic reports of strangers downloadable by any patient — reportable data breach on a real platform.',
    report: { title: 'Insecure direct object reference on report download', severity: 'High', remediation: 'Check report ownership (or staff duty) on every download; use unguessable report links as defence in depth.' } },
  { id: 'report-prereview', feature: F_RES, name: 'Report downloadable before doctor review', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['Results pass two stages: technician entry, then doctor review. Only reviewed reports should reach patients.', 'The report endpoint only checks that results exist.', 'Your order 1002 is "Results Ready" but NOT reviewed — its report downloads anyway.'],
    lesson: 'Business workflow rules (review before release) are security controls; skipping them publishes unverified medical data.',
    impact: 'Patients could act on wrong, unreviewed results — a patient-safety incident, not just a data issue.',
    report: { title: 'Reports released before mandatory doctor review', severity: 'High', remediation: 'Serve reports only when reviewed=true and status=Reported; enforce the workflow server-side.' } },
  { id: 'report-traversal', feature: F_RES, name: 'Path traversal in report file download', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Report files are fetched through /files?name=…', 'The name is joined to the files folder without sanitising "..".', 'Request /files?name=../server.js and the application source code is served.'],
    lesson: 'User-controlled file paths must be canonicalised and confined to an allow-listed directory.',
    impact: 'Source code, configuration and other patients\u2019 files become downloadable — a foothold for deeper attacks.',
    report: { title: 'Directory traversal in file download exposes application source', severity: 'High', remediation: 'Resolve and validate paths against the intended directory; serve files by id, not by name.' } },

  /* ---- Home Collection ---- */
  { id: 'home-idor', feature: F_HOME, name: 'Home-collection booking IDOR — home address leak', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Home-collection bookings have their own pages: /collection/<id>.', 'Ownership is not checked there either.', 'As Alice, open booking 501 — Bob\u2019s home address is shown.'],
    lesson: 'Physical addresses are highly sensitive; every record type needs its own authorization check.',
    impact: 'Leaked home addresses of patients — a physical-safety and privacy incident on a real platform.',
    report: { title: 'Insecure direct object reference exposes patient home addresses', severity: 'High', remediation: 'Enforce ownership on booking records; minimise address exposure to assigned staff only.' } },
  { id: 'home-fee', feature: F_HOME, name: 'Home-collection fee tampering', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['Booking a home collection charges a standard $15 fee — carried in a hidden field.', 'The server accepts the submitted fee.', 'Book with fee=0 and the collection is free.'],
    lesson: 'Fees are server-side constants or catalogue lookups, never form fields.',
    impact: 'Every home visit\u2019s fee can be zeroed — steady, silent revenue leakage.',
    report: { title: 'Client-side fee tampering on home-collection booking', severity: 'Medium', remediation: 'Set fees server-side from configuration; ignore fee values in requests.' } },

  /* ---- Admin Panel ---- */
  { id: 'admin-csrf', feature: F_ADM, name: 'CSRF on admin user deactivation', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Admin actions are plain POSTs — and the _origin marker is never verified there either.', 'A deactivation request without the marker still succeeds.', 'POST /admin/deactivate for some user with no _origin field while signed in as admin.'],
    lesson: 'Admin actions are the highest-value CSRF targets; one malicious page can disable accounts.',
    impact: 'An attacker page could deactivate every staff account while an admin browses — operational shutdown.',
    report: { title: 'Missing CSRF protection on administrative user deactivation', severity: 'High', remediation: 'Verify CSRF tokens on all admin actions; require re-authentication for destructive operations.' } },

  /* ---- Platform & API ---- */
  { id: 'api-token', feature: F_API, name: 'Weak API token — base64(email) unlocks all orders', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['The JSON API at /api/orders expects an x-api-token header.', 'The token is not random — it is derived from something public about the user.', 'Send x-api-token = base64 of any user\u2019s email, with no session cookie at all.'],
    lesson: 'API tokens must be unguessable secrets; encoding is not encryption and an email address is not a secret.',
    impact: 'The entire order database of a real lab is one base64 encoding away from anyone who knows a staff email.',
    report: { title: 'Forgeable API token (base64 of email) exposes all orders', severity: 'Critical', remediation: 'Issue random, revocable API keys; store hashes; scope keys per account and role.' } }
];
const FEATURES = [...new Set(TESTS.map(t => t.feature))];
const testById = id => TESTS.find(t => t.id === id);

/* --- scattered fragments (region B) --- */

const _KD = ['LTJSSA==', 'TDBWUg==', 'V0pCUw=='];
function _asm(a) { return a.map(s => [...Buffer.from(s, 'base64').toString('utf8')].reverse().join('')).join(''); }
const ENTRY_KEY_SHA256 = '861d15b15b872c5fd39099302fa04ba0bdbf833bc66664f4aa197bf3bed5359d';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */
function completionKey() { return _asm(_KC.concat(_KD)); }

/* ============================ HTTP HELPERS ============================ */
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function redirect(res, loc, extra) {
  res.writeHead(302, Object.assign({ Location: loc }, extra || {}));
  res.end();
}
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function readBody(req) {
  return new Promise(resolve => {
    let b = '';
    req.on('data', c => { b += c; if (b.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) { try { return resolve(JSON.parse(b || '{}')); } catch (e) { return resolve({}); } }
      const o = {};
      new URLSearchParams(b).forEach((v, k) => { o[k] = v; });
      resolve(o);
    });
    req.on('error', () => resolve({}));
  });
}

/* ============================ AUTH / SESSION ============================ */
function currentUser(req) {
  const c = parseCookies(req);
  if (!c.hx_sess) return null;
  const s = sessions.get(c.hx_sess);
  if (!s) return null;
  return USERS.find(u => u.id === s.uid) || null;
}
/* The flaw: the effective role is read from the client-controlled hx_role cookie when present. */
function roleOf(req, user) {
  const c = parseCookies(req);
  return c.hx_role || (user ? user.role : null);
}
function originMarkerFor(user) { return 'hxm' + user.id + 'x' + crypto.createHash('md5').update(user.email).digest('hex').slice(0, 10); }
function originOk(req, body) {
  const c = parseCookies(req);
  return !!(body && body._origin && c.hx_origin && body._origin === c.hx_origin);
}
function originField(req) {
  const c = parseCookies(req);
  return '<input type="hidden" name="_origin" value="' + esc(c.hx_origin || '') + '">';
}
function startSession(res, user) {
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, { uid: user.id });
  return { 'Set-Cookie': [
    'hx_sess=' + sid + '; Path=/; HttpOnly',
    'hx_role=' + user.role + '; Path=/',
    'hx_origin=' + originMarkerFor(user) + '; Path=/'
  ] };
}

/* Tiny evaluator for the hand-built login query: email = '<e>' AND password = '<p>' */
function splitTop(s, sep) {
  const parts = []; let cur = '', inQ = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "'") inQ = !inQ;
    if (!inQ && s.slice(i, i + sep.length) === sep) { parts.push(cur); cur = ''; i += sep.length - 1; continue; }
    cur += ch;
  }
  parts.push(cur); return parts;
}
function evalCond(cond, row) {
  const m = cond.trim().match(/^([\s\S]+?)\s*=\s*([\s\S]+)$/);
  if (!m) return false;
  const val = s => {
    s = s.trim();
    if (s.startsWith("'") && s.endsWith("'") && s.length >= 2) return s.slice(1, -1);
    if (row && Object.prototype.hasOwnProperty.call(row, s)) return String(row[s]);
    return s;
  };
  return val(m[1]) === val(m[2]);
}
function runLoginQuery(email, password) {
  let clause = "email = '" + email + "' AND password = '" + password + "'";
  const ci = clause.indexOf('--');
  if (ci >= 0) clause = clause.slice(0, ci);
  for (const u of USERS) {
    const orParts = splitTop(clause, ' OR ');
    const ok = orParts.some(part => splitTop(part, ' AND ').every(c => evalCond(c, u)));
    if (ok) return u;
  }
  return null;
}
const INJ = /('|%27)\s*(or|and)\s+/i;
function hasInjection(s) { return /'/.test(s || '') && (INJ.test(s) || /'\s*=/.test(s) || /'\s*or\s*'/.test(s || '') || /'\s*--/.test(s || '')); }

/* ============================ LAYOUT / CHROME ============================ */
function layout(req, title, inner, user) {
  const s = summary();
  const bar = '<div style="background:#1d1d2b;color:#eee;padding:10px 16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">' +
    '<img src="/logo.png" style="height:34px"> <b>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</b>' +
    '<span style="font-size:13px">' + s.done + '/' + s.total + ' tests · ' + s.pct + '%</span>' +
    '<span style="flex:1;max-width:340px;background:#33334a;border-radius:6px;height:10px;overflow:hidden"><span style="display:block;height:10px;width:' + s.pct + '%;background:#7ac74f"></span></span>' +
    '<a style="color:#9fc1ff" href="/">🏠 Home</a><a style="color:#9fc1ff" href="/catalog">🧪 Tests</a>' +
    '<a style="color:#9fc1ff" href="/orders">📦 Orders</a><a style="color:#9fc1ff" href="/tests">🎯 Mission</a>' +
    (user ? '<a style="color:#9fc1ff" href="/complete">🏁 Complete</a><a style="color:#9fc1ff" href="/logout">Logout</a>' : '<a style="color:#9fc1ff" href="/login">Login</a>') +
    '</div>';
  const chat = '<div id="hxchat" style="position:fixed;right:14px;bottom:14px;width:320px;background:#fff;border:1px solid #ccd;border-radius:10px;box-shadow:0 4px 18px rgba(0,0,0,.25);font-size:13px;z-index:50">' +
    '<div style="background:#23233a;color:#fff;padding:8px 12px;border-radius:10px 10px 0 0"><b>🤖 Lab Coach</b></div>' +
    '<div id="hxlog" style="height:170px;overflow:auto;padding:8px 12px"></div>' +
    '<div style="display:flex;border-top:1px solid #eee"><input id="hxin" placeholder="Ask the coach…" style="flex:1;border:0;padding:9px" onkeydown="if(event.key===\'Enter\')hxSend()"><button onclick="hxSend()" style="padding:9px 12px">Send</button></div></div>' +
    '<script>async function hxSend(){var i=document.getElementById("hxin"),l=document.getElementById("hxlog");var m=i.value.trim();if(!m)return;i.value="";l.innerHTML+="<div><b>You:</b> "+m.replace(/</g,"&lt;")+"</div>";try{var r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:m})});var j=await r.json();l.innerHTML+="<div style=\\"margin:6px 0\\"><b>Coach:</b> "+String(j.reply||"").replace(/</g,"&lt;").replace(/\\n/g,"<br>")+"</div>";}catch(e){l.innerHTML+="<div>Coach unavailable.</div>";}l.scrollTop=l.scrollHeight;}</script>';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + ' · LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</title></head>' +
    '<body style="margin:0;background:#f4f5fa;font-family:Arial,sans-serif;color:#222">' + bar +
    '<div style="max-width:920px;margin:22px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:24px">' + inner + '</div>' + chat + '</body></html>';
}
function gatePage() {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' · Locked</title></head>' +
    '<body style="margin:0;background:#14141d;font-family:Arial,sans-serif"><div style="max-width:520px;margin:60px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:28px;text-align:center">' +
    '<img src="/logo.png" style="height:56px"><h2>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h2>' +
    '<p>This lab is locked. Paste the completion key from Lab ' + PREV_LAB + ' to start.</p>' +
    '<form method="POST" action="/unlock"><input name="key" style="padding:9px;width:80%" placeholder="Completion key from Lab ' + PREV_LAB + '"><br><br>' +
    '<button style="padding:10px 22px">Unlock LAB ' + LAB_NUMBER + '</button></form></div>' +
    '<div id="hxchat" style="position:fixed;right:14px;bottom:14px;width:320px;background:#fff;border:1px solid #ccd;border-radius:10px;font-size:13px"><div style="background:#23233a;color:#fff;padding:8px 12px;border-radius:10px 10px 0 0"><b>🤖 Lab Coach</b></div><div id="hxlog" style="height:150px;overflow:auto;padding:8px 12px"></div><div style="display:flex;border-top:1px solid #eee"><input id="hxin" placeholder="Ask the coach…" style="flex:1;border:0;padding:9px" onkeydown="if(event.key===\'Enter\')hxSend()"><button onclick="hxSend()" style="padding:9px 12px">Send</button></div></div>' +
    '<script>async function hxSend(){var i=document.getElementById("hxin"),l=document.getElementById("hxlog");var m=i.value.trim();if(!m)return;i.value="";l.innerHTML+="<div><b>You:</b> "+m.replace(/</g,"&lt;")+"</div>";try{var r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:m})});var j=await r.json();l.innerHTML+="<div style=\\"margin:6px 0\\"><b>Coach:</b> "+String(j.reply||"").replace(/</g,"&lt;").replace(/\\n/g,"<br>")+"</div>";}catch(e){}l.scrollTop=l.scrollHeight;}</script></body></html>';
}

/* ============================ CHATBOT ============================ */
function findFeature(msg) {
  const m = msg.toLowerCase();
  let best = null;
  for (const f of FEATURES) if (m.includes(f.toLowerCase()) && (!best || f.length > best.length)) best = f;
  if (!best) {
    const aliases = { login: F_AUTH, auth: F_AUTH, password: F_AUTH, register: F_REG, profile: F_REG, signup: F_REG, catalog: F_CAT, catalogue: F_CAT, search: F_CAT, order: F_ORD, sample: F_SMP, result: F_RES, report: F_RES, home: F_HOME, collection: F_HOME, admin: F_ADM, api: F_API, platform: F_API };
    for (const k of Object.keys(aliases)) if (m.includes(k)) { best = aliases[k]; break; }
  }
  return best;
}
function chatReply(message) {
  const msg = String(message || '');
  const m = msg.toLowerCase();
  const s = summary();
  if (/(who (built|made|created)|founder|hexacyberlab|jony)/.test(m)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (/(key|unlock next|next lab)/.test(m) && !s.complete) {
    return 'I do not have the completion key yet — I only receive it when this lab is completed 100%. You are at ' + s.pct + '% (' + s.done + '/' + s.total + '). Finish every test on /tests and the key will be revealed on /complete — and then I can share it too.';
  }
  if (/(key|unlock next|next lab)/.test(m) && s.complete) {
    return 'Lab complete — well done! The completion key for the next lab is: ' + completionKey() + ' — paste it into Lab ' + (LAB_NUMBER + 1) + ' to unlock it.';
  }
  const feat = findFeature(msg);
  if (/(how many|count|list|which|what tests|vulnerabilit)/.test(m) && feat) {
    const ts = TESTS.filter(t => t.feature === feat);
    return feat + ' has ' + ts.length + ' tests (' + ts.filter(t => progress.tests[t.id]).length + ' done): ' + ts.map(t => t.name).join('; ') + '.';
  }
  if (/(how|solve|help|guide|step|exploit|bypass|hint)/.test(m)) {
    const f2 = feat || (TESTS.find(t => !progress.tests[t.id]) || {}).feature;
    if (!f2) return 'You have completed every test — open /complete for your debrief, key and certificate.';
    const open = TESTS.filter(t => t.feature === f2 && !progress.tests[t.id]);
    if (open.length === 0) return 'You have already completed every test in ' + f2 + '. ' + s.pct + '% overall — ' + (s.complete ? 'lab complete!' : 'keep going with the remaining features on /tests.');
    const att = progress.attempts[f2] || 0;
    const allPassed = open.length === 0;
    if (att >= 3 || allPassed) {
      return 'Step by step for ' + f2 + ':\n' + open.map(t => '• ' + t.name + ' — ' + t.hints[2]).join('\n');
    }
    return 'That feature is locked for help. First try the ' + f2 + ' tests yourself at least 3 times — I can see you\u2019ve tried ' + att + ' time(s) so far. After 3 real tries, ask me again and I\u2019ll guide you step by step.';
  }
  if (/(progress|score|status|how am i|done)/.test(m)) {
    const next = TESTS.find(t => !progress.tests[t.id]);
    return 'Current progress: ' + s.done + '/' + s.total + ' tests (' + s.pct + '%). ' + (next ? 'Next open test: "' + next.name + '" in ' + next.feature + ' — see /tests for hints.' : 'Lab complete! Open /complete for your debrief and key.');
  }
  if (/(hi|hello|hey|start|begin)/.test(m)) {
    return 'Hello — I am the Lab Coach for LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '. This lab has ' + TESTS.length + ' tests across ' + FEATURES.length + ' features, and you are at ' + s.pct + '%. Ask me how many tests a feature has (free), or try a feature at least 3 times and then ask me how to solve it. The map lives on /tests.';
  }
  return 'I can help with this lab: ask me how many tests a feature has, ask about your progress, or — after 3 real attempts on a feature — ask me how to solve its tests. The full map is on /tests. You are at ' + s.pct + '%.';
}

/* ============================ APP ROUTES ============================ */
function userName(id) { const u = USERS.find(x => x.id === id); return u ? u.name : 'user ' + id; }
function probeEmail(req, email) {
  const ip = (req.socket && req.socket.remoteAddress) || 'local';
  if (!enumProbes.has(ip)) enumProbes.set(ip, new Set());
  const set = enumProbes.get(ip);
  if (email) set.add(String(email).toLowerCase());
  if (set.size >= 5) pass('auth-enum');
}

function pageLogin(req, err) {
  return layout(req, 'Login', '<h2>🔐 Login — HexaLabTest</h2>' +
    (err ? '<p style="color:#b00">' + esc(err) + '</p>' : '') +
    '<form method="POST" action="/login">Email: <input name="email" style="padding:7px;width:260px"><br><br>' +
    'Password: <input name="password" type="password" style="padding:7px;width:260px"><br><br>' +
    '<button style="padding:9px 20px">Login</button></form>' +
    '<p style="font-size:13px;color:#666">Demo accounts (training): admin@hexalabtest.local / admin123 · dr.house@hexalabtest.local / house123 · tech.tom@hexalabtest.local / tom123 · alice@test.local / alice123 · bob@test.local / bob123</p>' +
    '<p><a href="/register">Register</a> · <a href="/forgot">Forgot password?</a></p>', null);
}

async function route(req, res) {
  const u = new URL(req.url, 'http://127.0.0.1');
  const p = u.pathname;
  const q = Object.fromEntries(u.searchParams.entries());
  const method = req.method;

  if (p === '/logo.png') {
    try { const data = fs.readFileSync(path.join(DIR, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(data); }
    catch (e) { return send(res, 404, 'no logo'); }
  }
  if (p === '/unlock' && method === 'POST') {
    const body = await readBody(req);
    if (entryKeyMatches(String(body.key || ''))) { progress.unlocked = true; saveProgress(); return redirect(res, '/'); }
    return send(res, 403, gatePage());
  }
  if (p === '/api/progress') {
    return send(res, 200, JSON.stringify(summary(), null, 2), 'application/json');
  }
  if (p === '/api/chat' && method === 'POST') {
    const body = await readBody(req);
    let reply;
    try { reply = chatReply(body.message); } catch (e) { reply = 'I hit a snag — try asking about a feature on /tests, or about your progress.'; }
    return send(res, 200, JSON.stringify({ reply }), 'application/json');
  }

  if (!progress.unlocked) return send(res, 200, gatePage());

  /* ---------- API (token-authenticated; no web session required) ---------- */
  if (p === '/api/orders' && method === 'GET') {
    attempt(F_API);
    const token = String(req.headers['x-api-token'] || '');
    let decoded = '';
    try { decoded = Buffer.from(token, 'base64').toString('utf8'); } catch (e) {}
    if (decoded && USERS.some(x => x.email === decoded)) {
      if (!currentUser(req)) pass('api-token');
      return send(res, 200, JSON.stringify({ orders: ORDERS }, null, 2), 'application/json');
    }
    return send(res, 401, JSON.stringify({ error: 'invalid api token' }), 'application/json');
  }

  const user = currentUser(req);
  const needLogin = () => redirect(res, '/login');

  /* ---------- auth ---------- */
  if (p === '/login' && method === 'GET') return send(res, 200, pageLogin(req, q.err ? 'Login failed.' : ''));
  if (p === '/login' && method === 'POST') {
    attempt(F_AUTH);
    const body = await readBody(req);
    const email = String(body.email || ''), password = String(body.password || '');
    probeEmail(req, email);
    const found = runLoginQuery(email, password);
    if (found && found.active) {
      if (hasInjection(email) || hasInjection(password)) pass('auth-sqli');
      if (email === 'admin@hexalabtest.local' && password === 'admin123') pass('auth-default');
      return redirect(res, '/', startSession(res, found));
    }
    loginFailures[email] = (loginFailures[email] || 0) + 1;
    if (loginFailures[email] >= 10) pass('auth-brute');
    const exists = USERS.some(x => x.email === email.toLowerCase());
    return send(res, 200, pageLogin(req, exists ? 'Wrong password for that account.' : 'No account with that email exists.'));
  }
  if (p === '/logout') {
    const c = parseCookies(req);
    if (c.hx_sess) sessions.delete(c.hx_sess);
    return redirect(res, '/login', { 'Set-Cookie': ['hx_sess=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0', 'hx_origin=; Path=/; Max-Age=0'] });
  }
  if (p === '/register' && method === 'GET') {
    return send(res, 200, layout(req, 'Register', '<h2>📝 Register</h2><form method="POST" action="/register">' +
      'Name: <input name="name" style="padding:7px;width:260px"><br><br>Email: <input name="email" style="padding:7px;width:260px"><br><br>' +
      'Password: <input name="password" type="password" style="padding:7px;width:260px"><br><br>Phone: <input name="phone" style="padding:7px;width:260px"><br><br>' +
      '<button style="padding:9px 20px">Create account</button></form>', null));
  }
  if (p === '/register' && method === 'POST') {
    attempt(F_REG);
    const body = await readBody(req);
    const name = String(body.name || 'New Patient'), email = String(body.email || '').toLowerCase(), password = String(body.password || '');
    if (!email || USERS.some(x => x.email === email)) return send(res, 200, layout(req, 'Register', '<p style="color:#b00">Email missing or already registered.</p><p><a href="/register">Back</a></p>', null));
    if (password.length < 4) pass('reg-weakpass');
    let role = 'patient';
    if (body.role && ['patient', 'doctor', 'technician', 'admin'].includes(body.role)) {
      role = body.role;
      if (role !== 'patient') pass('reg-massassign');
    }
    if (/<script|onerror\s*=|onload\s*=|<svg|<img/i.test(name)) pass('reg-xss');
    const nu = { id: nextUserId++, name, email, password, role, phone: String(body.phone || ''), active: true, resetToken: null, resetRequested: false };
    USERS.push(nu);
    return redirect(res, '/', startSession(res, nu));
  }
  if (p === '/forgot' && method === 'GET') {
    return send(res, 200, layout(req, 'Forgot password', '<h2>🔑 Forgot password</h2><form method="POST" action="/forgot">Email: <input name="email" style="padding:7px;width:260px"> <button>Send reset link</button></form>', null));
  }
  if (p === '/forgot' && method === 'POST') {
    attempt(F_AUTH);
    const body = await readBody(req);
    const email = String(body.email || '').toLowerCase();
    probeEmail(req, email);
    const fu = USERS.find(x => x.email === email);
    if (fu) {
      fu.resetToken = 'LT-' + (fu.id * 137 + 42);
      fu.resetRequested = true;
      return send(res, 200, layout(req, 'Forgot password', '<p>Reset link sent to ' + esc(email) + '. (Training build: your token is <b>' + esc(fu.resetToken) + '</b> — open <a href="/reset">/reset</a>.)</p>', null));
    }
    return send(res, 200, layout(req, 'Forgot password', '<p style="color:#b00">No account with that email exists.</p>', null));
  }
  if (p === '/reset' && method === 'GET') {
    return send(res, 200, layout(req, 'Reset password', '<h2>🔑 Reset password</h2><form method="POST" action="/reset">Email: <input name="email" style="padding:7px;width:240px"><br><br>Token: <input name="token" style="padding:7px;width:240px"><br><br>New password: <input name="newPassword" type="password" style="padding:7px;width:240px"><br><br><button>Reset password</button></form>', null));
  }
  if (p === '/reset' && method === 'POST') {
    attempt(F_AUTH);
    const body = await readBody(req);
    const ru = USERS.find(x => x.email === String(body.email || '').toLowerCase());
    if (ru && String(body.token || '') === 'LT-' + (ru.id * 137 + 42)) {
      if (!ru.resetRequested) pass('auth-reset-token');
      ru.password = String(body.newPassword || 'changed123');
      ru.resetToken = null; ru.resetRequested = false;
      return send(res, 200, layout(req, 'Reset password', '<p>Password updated. <a href="/login">Login</a></p>', null));
    }
    return send(res, 200, layout(req, 'Reset password', '<p style="color:#b00">Invalid token.</p>', null));
  }

  if (!user && p !== '/tests' && p !== '/complete' && p !== '/certificate') return needLogin();

  if (p === '/profile' && method === 'GET') {
    return send(res, 200, layout(req, 'Profile', '<h2>👤 My profile</h2><form method="POST" action="/profile">' + originField(req) +
      'Name: <input name="name" value="' + esc(user.name) + '" style="padding:7px;width:260px"><br><br>' +
      'Phone: <input name="phone" value="' + esc(user.phone || '') + '" style="padding:7px;width:260px"><br><br>' +
      'Email: ' + esc(user.email) + ' · Role: ' + esc(user.role) + '<br><br><button style="padding:9px 20px">Save</button></form>', user));
  }
  if (p === '/profile' && method === 'POST') {
    attempt(F_REG);
    const body = await readBody(req);
    if (body.name) {
      user.name = String(body.name);
      if (/<script|onerror\s*=|onload\s*=|<svg|<img/i.test(user.name)) pass('reg-xss');
    }
    if (body.phone !== undefined) user.phone = String(body.phone);
    if (!originOk(req, body)) pass('reg-csrf');
    return redirect(res, '/profile');
  }

  /* ---------- catalog & search ---------- */
  if (p === '/catalog') {
    const rows = CATALOG.filter(t => !t.internal).map(t => '<tr><td>' + esc(t.name) + '</td><td>$' + t.price + '</td></tr>').join('');
    return send(res, 200, layout(req, 'Test catalog', '<h2>🧪 Test catalog</h2>' +
      '<form method="GET" action="/search">Search tests: <input name="q" style="padding:7px;width:280px"> <button>Search</button></form>' +
      '<table border="1" cellpadding="7" style="border-collapse:collapse;margin-top:14px"><tr><th>Test</th><th>Price</th></tr>' + rows + '</table>' +
      '<p><a href="/order/new">➕ Place an order</a></p>', user));
  }
  if (p === '/search') {
    attempt(F_CAT);
    const query = String(q.q || '');
    if (/<script|onerror\s*=|onload\s*=|<svg|<img/i.test(query)) pass('search-xss');
    let results;
    if (hasInjection(query)) { results = CATALOG.slice(); pass('search-sqli'); }
    else results = CATALOG.filter(t => !t.internal && t.name.toLowerCase().includes(query.toLowerCase()));
    const rows = results.map(t => '<tr><td>' + esc(t.name) + (t.internal ? ' <b>(internal)</b>' : '') + '</td><td>$' + t.price + '</td></tr>').join('');
    return send(res, 200, layout(req, 'Search', '<h2>🔎 Results for: ' + query + '</h2>' +
      '<table border="1" cellpadding="7" style="border-collapse:collapse"><tr><th>Test</th><th>Price</th></tr>' + rows + '</table><p><a href="/catalog">Back to catalog</a></p>', user));
  }

  /* ---------- orders ---------- */
  if (p === '/orders' && method === 'GET') {
    const mine = user.role === 'patient' ? ORDERS.filter(o => o.patientId === user.id) : ORDERS;
    const rows = mine.map(o => '<tr><td><a href="/orders/' + o.id + '">#' + o.id + '</a></td><td>' + esc(userName(o.patientId)) + '</td><td>' + o.items.map(i => esc(i.test)).join(', ') + '</td><td>$' + o.total + '</td><td>' + esc(o.status) + '</td></tr>').join('');
    return send(res, 200, layout(req, 'Orders', '<h2>📦 ' + (user.role === 'patient' ? 'My orders' : 'All orders') + '</h2>' +
      '<table border="1" cellpadding="7" style="border-collapse:collapse"><tr><th>Order</th><th>Patient</th><th>Tests</th><th>Total</th><th>Status</th></tr>' + rows + '</table>' +
      '<p><a href="/order/new">➕ New order</a></p>', user));
  }
  if (p === '/order/new' && method === 'GET') {
    const docs = USERS.filter(x => x.role === 'doctor').map(d => '<option value="' + d.id + '">' + esc(d.name) + '</option>').join('');
    const items = CATALOG.filter(t => !t.internal).map(t =>
      '<div style="margin:6px 0"><label><input type="checkbox" name="test_' + t.id + '" value="1"> ' + esc(t.name) + ' — $' + t.price + '</label>' +
      ' <input type="hidden" name="price_' + t.id + '" value="' + t.price + '"> qty <input name="qty_' + t.id + '" value="1" size="3"></div>').join('');
    return send(res, 200, layout(req, 'New order', '<h2>➕ New test order</h2><form method="POST" action="/orders">' + originField(req) + items +
      '<br>Ordering doctor: <select name="doctorId">' + docs + '</select><br><br>' +
      '<label><input type="checkbox" name="home" value="1"> Home sample collection</label><br><br>' +
      '<button style="padding:9px 20px">Place order</button></form>', user));
  }
  if (p === '/orders' && method === 'POST') {
    attempt(F_ORD);
    const body = await readBody(req);
    const items = [];
    for (const t of CATALOG) {
      if (body['test_' + t.id]) {
        let price = parseFloat(body['price_' + t.id]); if (isNaN(price)) price = t.price;
        let qty = parseInt(body['qty_' + t.id], 10); if (isNaN(qty)) qty = 1;
        items.push({ test: t.id, price, qty });
        if (!t.internal && price !== t.price) pass('order-price');
        if (qty < 1 || qty > 3) pass('order-qty');
      }
    }
    if (!items.length) return redirect(res, '/order/new');
    let status = 'Ordered';
    if (body.status && ORDER_FLOW.includes(body.status) && body.status !== 'Ordered') { status = body.status; pass('order-status-forge'); }
    const total = items.reduce((a, i) => a + i.price * i.qty, 0);
    const order = { id: nextOrderId++, patientId: user.id, doctorId: parseInt(body.doctorId, 10) || 2, items, total, status, results: {}, reviewed: false, reviewedBy: null, home: body.home === '1' };
    ORDERS.push(order);
    return redirect(res, '/orders/' + order.id);
  }
  const mOrder = p.match(/^\/orders\/(\d+)$/);
  if (mOrder && method === 'GET') {
    attempt(F_ORD);
    const o = ORDERS.find(x => x.id === +mOrder[1]);
    if (!o) return send(res, 404, layout(req, 'Not found', '<h2>Order not found</h2>', user));
    if (user.role === 'patient' && o.patientId !== user.id) pass('order-idor');
    const resRows = Object.keys(o.results).length ? Object.entries(o.results).map(([k, v]) => '<tr><td>' + esc(k) + '</td><td>' + esc(v) + '</td></tr>').join('') : '<tr><td colspan="2">No results yet</td></tr>';
    const statusOpts = ORDER_FLOW.map(s => '<option' + (s === o.status ? ' selected' : '') + '>' + s + '</option>').join('');
    let inner = '<h2>📦 Order #' + o.id + '</h2><p>Patient: ' + esc(userName(o.patientId)) + ' · Doctor: ' + esc(userName(o.doctorId)) + '<br>Tests: ' + o.items.map(i => esc(i.test) + ' ×' + i.qty + ' @ $' + i.price).join(', ') + '<br>Total: <b>$' + o.total + '</b> · Status: <b>' + esc(o.status) + '</b> · Doctor reviewed: ' + (o.reviewed ? 'yes' : 'no') + '</p>' +
      '<h3>Results</h3><table border="1" cellpadding="7" style="border-collapse:collapse"><tr><th>Parameter</th><th>Value</th></tr>' + resRows + '</table>' +
      (Object.keys(o.results).length ? '<p><a href="/orders/' + o.id + '/report">⬇ Download report</a> · <a href="/files?name=report-' + o.id + '.txt">Report file</a></p>' : '') +
      '<h3>Update sample status</h3><form method="POST" action="/orders/' + o.id + '/status">' + originField(req) + '<select name="status">' + statusOpts + '</select> <button>Update status</button></form>' +
      '<h3>Enter result (technicians)</h3><form method="POST" action="/tech/results">' + originField(req) + '<input type="hidden" name="orderId" value="' + o.id + '">Parameter: <input name="param" style="padding:6px"> Value: <input name="value" style="padding:6px"> <button>Save result</button></form>';
    if (user.role === 'doctor' || user.role === 'admin') {
      inner += '<h3>Doctor review</h3><form method="POST" action="/orders/' + o.id + '/review">' + originField(req) + '<button>✔ Mark reviewed &amp; report</button></form>';
    }
    return send(res, 200, layout(req, 'Order #' + o.id, inner, user));
  }
  const mStatus = p.match(/^\/orders\/(\d+)\/status$/);
  if (mStatus && method === 'POST') {
    attempt(F_SMP);
    const body = await readBody(req);
    const o = ORDERS.find(x => x.id === +mStatus[1]);
    if (o && ORDER_FLOW.includes(body.status)) {
      o.status = body.status;
      if (user.role === 'patient') pass('sample-forge');
    }
    return redirect(res, '/orders/' + mStatus[1]);
  }
  const mReview = p.match(/^\/orders\/(\d+)\/review$/);
  if (mReview && method === 'POST') {
    const o = ORDERS.find(x => x.id === +mReview[1]);
    if (o && (roleOf(req, user) === 'doctor' || roleOf(req, user) === 'admin')) {
      o.reviewed = true; o.reviewedBy = user.id;
      if (o.status === 'Results Ready') o.status = 'Reported';
    }
    return redirect(res, '/orders/' + mReview[1]);
  }
  const mReport = p.match(/^\/orders\/(\d+)\/report$/);
  if (mReport && method === 'GET') {
    attempt(F_RES);
    const o = ORDERS.find(x => x.id === +mReport[1]);
    if (!o) return send(res, 404, 'no such order');
    if (!Object.keys(o.results).length) return send(res, 200, layout(req, 'Report', '<p>Results are not ready yet for order #' + o.id + '.</p>', user));
    if (user.role === 'patient' && o.patientId !== user.id) pass('report-idor');
    if (!o.reviewed) pass('report-prereview');
    const lines = ['HexaLabTest — Diagnostic Report', 'Order #' + o.id, 'Patient: ' + userName(o.patientId), 'Doctor: ' + userName(o.doctorId), 'Status: ' + o.status, '---'];
    for (const [k, v] of Object.entries(o.results)) lines.push(k + ': ' + v);
    lines.push('---', o.reviewed ? 'Reviewed by ' + userName(o.reviewedBy) : 'NOT YET REVIEWED');
    return send(res, 200, lines.join('\n'), 'text/plain; charset=utf-8');
  }

  /* ---------- technician ---------- */
  if (p === '/tech/queue' && method === 'GET') {
    attempt(F_SMP);
    if (user.role === 'patient') pass('sample-queue-leak');
    const rows = ORDERS.map(o => '<tr><td><a href="/orders/' + o.id + '">#' + o.id + '</a></td><td>' + esc(userName(o.patientId)) + '</td><td>' + o.items.map(i => esc(i.test)).join(', ') + '</td><td>' + esc(o.status) + '</td><td>' + (o.home ? 'Home' : 'Lab') + '</td></tr>').join('');
    return send(res, 200, layout(req, 'Technician queue', '<h2>🧫 Technician work queue</h2><table border="1" cellpadding="7" style="border-collapse:collapse"><tr><th>Order</th><th>Patient</th><th>Tests</th><th>Status</th><th>Collection</th></tr>' + rows + '</table>', user));
  }
  if (p === '/tech/results' && method === 'POST') {
    attempt(F_RES);
    const body = await readBody(req);
    const o = ORDERS.find(x => x.id === parseInt(body.orderId, 10));
    if (o && body.param) {
      o.results[String(body.param)] = String(body.value || '');
      if (o.status === 'In Lab' || o.status === 'Sample Collected' || o.status === 'Ordered') o.status = 'Results Ready';
      if (user.role === 'patient') pass('result-edit');
    }
    return redirect(res, o ? '/orders/' + o.id : '/tech/queue');
  }

  /* ---------- files (report files + traversal flaw) ---------- */
  if (p === '/files' && method === 'GET') {
    attempt(F_RES);
    const name = String(q.name || '');
    const target = path.join(FILES_DIR, name);
    try {
      const data = fs.readFileSync(target, 'utf8');
      if (name.includes('..')) pass('report-traversal');
      return send(res, 200, data, 'text/plain; charset=utf-8');
    } catch (e) { return send(res, 404, 'file not found'); }
  }

  /* ---------- home collection ---------- */
  if (p === '/collection/new' && method === 'GET') {
    return send(res, 200, layout(req, 'Home collection', '<h2>🏠 Book home sample collection</h2><form method="POST" action="/collection">' + originField(req) +
      'Address: <input name="address" style="padding:7px;width:340px"><br><br>Date: <input name="date" value="2026-10-26" style="padding:7px">' +
      '<input type="hidden" name="fee" value="' + HOME_FEE + '"><br><br><button style="padding:9px 20px">Book (fee $' + HOME_FEE + ')</button></form>', user));
  }
  if (p === '/collection' && method === 'POST') {
    attempt(F_HOME);
    const body = await readBody(req);
    let fee = parseFloat(body.fee); if (isNaN(fee)) fee = HOME_FEE;
    if (fee !== HOME_FEE) pass('home-fee');
    const b = { id: nextBookingId++, patientId: user.id, address: String(body.address || ''), date: String(body.date || ''), fee };
    BOOKINGS.push(b);
    return redirect(res, '/collection/' + b.id);
  }
  const mColl = p.match(/^\/collection\/(\d+)$/);
  if (mColl && method === 'GET') {
    attempt(F_HOME);
    const b = BOOKINGS.find(x => x.id === +mColl[1]);
    if (!b) return send(res, 404, layout(req, 'Not found', '<h2>Booking not found</h2>', user));
    if (user.role === 'patient' && b.patientId !== user.id) pass('home-idor');
    return send(res, 200, layout(req, 'Booking #' + b.id, '<h2>🏠 Home collection #' + b.id + '</h2><p>Patient: ' + esc(userName(b.patientId)) + '<br>Address: ' + esc(b.address) + '<br>Date: ' + esc(b.date) + '<br>Fee charged: $' + b.fee + '</p>', user));
  }

  /* ---------- admin ---------- */
  if (p === '/admin' && method === 'GET') {
    attempt(F_ADM);
    if (roleOf(req, user) !== 'admin') return send(res, 403, layout(req, 'Forbidden', '<h2>403 — Admins only</h2>', user));
    if (user.role !== 'admin') pass('auth-cookie');
    const rows = USERS.map(x => '<tr><td>' + x.id + '</td><td>' + x.name + '</td><td>' + esc(x.email) + '</td><td>' + esc(x.role) + '</td><td>' + (x.active ? 'active' : 'DEACTIVATED') + '</td>' +
      '<td><form method="POST" action="/admin/deactivate" style="display:inline">' + originField(req) + '<input type="hidden" name="userId" value="' + x.id + '"><button>Deactivate</button></form></td></tr>').join('');
    return send(res, 200, layout(req, 'Admin', '<h2>🛠 Admin — users</h2><table border="1" cellpadding="7" style="border-collapse:collapse"><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr>' + rows + '</table>', user));
  }
  if (p === '/admin/deactivate' && method === 'POST') {
    attempt(F_ADM);
    const body = await readBody(req);
    if (roleOf(req, user) !== 'admin') return send(res, 403, 'admins only');
    const target = USERS.find(x => x.id === parseInt(body.userId, 10));
    if (target) {
      target.active = false;
      if (!originOk(req, body)) pass('admin-csrf');
    }
    return redirect(res, '/admin');
  }

  /* ---------- home dashboard ---------- */
  if (p === '/' && method === 'GET') {
    let inner = '<h2>Welcome, ' + user.name + '</h2><p>Role: <b>' + esc(user.role) + '</b> · <a href="/profile">My profile</a></p>';
    if (user.role === 'patient') {
      inner += '<p><a href="/catalog">🧪 Browse tests &amp; order</a> · <a href="/orders">📦 My orders</a> · <a href="/collection/new">🏠 Book home collection</a></p>' +
        '<h3>My recent orders</h3>' + ORDERS.filter(o => o.patientId === user.id).map(o => '<div>Order <a href="/orders/' + o.id + '">#' + o.id + '</a> — ' + esc(o.status) + ' — $' + o.total + '</div>').join('');
    } else if (user.role === 'doctor') {
      inner += '<h3>Orders under my care</h3>' + ORDERS.filter(o => o.doctorId === user.id).map(o => '<div>Order <a href="/orders/' + o.id + '">#' + o.id + '</a> — ' + esc(userName(o.patientId)) + ' — ' + esc(o.status) + (o.reviewed ? ' — reviewed' : '') + '</div>').join('');
    } else if (user.role === 'technician') {
      inner += '<p><a href="/tech/queue">🧫 Open the technician work queue</a></p>';
    } else if (user.role === 'admin') {
      inner += '<p><a href="/admin">🛠 Admin panel</a> · ' + USERS.length + ' users · ' + ORDERS.length + ' orders</p>';
    }
    return send(res, 200, layout(req, 'Home', inner, user));
  }

  /* ---------- mission page ---------- */
  if (p === '/tests') {
    const s = summary();
    let inner = '<h2>🎯 Mission — LAB ' + LAB_NUMBER + ' tests</h2><p>' + s.done + '/' + s.total + ' done (' + s.pct + '%). Tests complete by DOING the exploit — the server detects the real effect. Hints unlock one at a time.</p>';
    for (const f of FEATURES) {
      inner += '<h3>' + esc(f) + ' <span style="color:#777;font-size:13px">(attempts: ' + (progress.attempts[f] || 0) + ')</span></h3>';
      for (const t of TESTS.filter(x => x.feature === f)) {
        const shown = Math.min(3, parseInt(q['h_' + t.id], 10) || 0);
        inner += '<div style="border:1px solid #e2e2ee;border-radius:8px;padding:10px 14px;margin:8px 0">' +
          '<b>' + (progress.tests[t.id] ? '✓' : '○') + ' ' + esc(t.name) + '</b> <span style="color:#777;font-size:12px">' + esc(t.owasp) + ' · ' + esc(t.difficulty) + '</span>' +
          TESTS_HINTS(t, shown) + '</div>';
      }
    }
    return send(res, 200, layout(req, 'Mission', inner, user));
  }

  /* ---------- completion ---------- */
  if (p === '/complete') {
    const s = summary();
    if (method === 'POST') {
      const body = await readBody(req);
      if (body.name) { progress.testerName = String(body.name).slice(0, 80); saveProgress(); }
      return redirect(res, '/complete');
    }
    if (!s.complete) {
      return send(res, 200, layout(req, 'Not yet', '<h2>🏁 Completion</h2><p>You are at <b>' + s.pct + '%</b> (' + s.done + '/' + s.total + '). The debrief, key and certificate unlock at 100%. See <a href="/tests">/tests</a> for what remains.</p>', user));
    }
    const feats = FEATURES.map(f => { const ts = TESTS.filter(t => t.feature === f); return '<li><b>' + esc(f) + '</b> — ' + ts.length + ' vulnerabilities</li>'; }).join('');
    const ways = TESTS.map(t => '<li>' + esc(t.name) + ' <span style="color:#777">(' + esc(t.feature) + ')</span></li>').join('');
    const lessons = TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.lesson) + '</li>').join('');
    const impacts = TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.impact) + '</li>').join('');
    const reports = TESTS.map(t => '<li><b>' + esc(t.report.title) + '</b> — Severity: ' + esc(t.report.severity) + ' — Remediation: ' + esc(t.report.remediation) + '</li>').join('');
    const inner = '<h2>🏁 Lab complete — debrief</h2>' +
      '<h3>1) Features in this lab</h3><p>' + FEATURES.length + ' features:</p><ul>' + feats + '</ul>' +
      '<h3>2) Vulnerabilities per feature</h3><ul>' + feats + '</ul>' +
      '<h3>3) How testing was done — ' + s.total + ' techniques</h3><ul>' + ways + '</ul>' +
      '<h3>4) What you learned</h3><ul>' + lessons + '</ul>' +
      '<h3>5) What this means for a real client</h3><ul>' + impacts + '</ul>' +
      '<h3>6) Writing it in a real report</h3><ul>' + reports + '</ul>' +
      '<h3>🔑 Completion key for Lab ' + (LAB_NUMBER + 1) + '</h3><p style="font-size:18px;background:#eef7ee;border:1px solid #bdb;padding:12px;border-radius:8px"><b>' + esc(completionKey()) + '</b></p>' +
      '<form method="POST" action="/complete">Name for your certificate: <input name="name" value="' + esc(progress.testerName || (user ? user.name : '')) + '" style="padding:7px"> <button>Save name</button></form>' +
      '<p><a href="/certificate">🎓 View your certificate</a></p>';
    return send(res, 200, layout(req, 'Complete', inner, user));
  }
  if (p === '/certificate') {
    const s = summary();
    if (!s.complete) return redirect(res, '/complete');
    const name = progress.testerName || (user ? user.name : 'Tester');
    const date = progress.completedAt ? new Date(progress.completedAt).toDateString() : new Date().toDateString();
    const card = '<div style="max-width:640px;margin:30px auto;border:3px solid #23233a;border-radius:14px;padding:34px;text-align:center;background:#fff">' +
      '<img src="/logo.png" style="height:64px"><h1 style="margin:10px 0">Certificate of Completion</h1>' +
      '<p>This certifies that</p><h2 style="margin:6px 0">' + esc(name) + '</h2>' +
      '<p>has completed 100% of the security tests in<br><b>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</b><br>(' + s.total + ' tests across ' + FEATURES.length + ' features)</p>' +
      '<p style="color:#555">' + esc(date) + '</p><p><b>HexaCyberLab</b> — Built by Md. Jony Hassain, Founder</p></div>' +
      '<style>@media print{#hxchat{display:none}}</style>';
    return send(res, 200, layout(req, 'Certificate', card, user));
  }

  return send(res, 404, layout(req, 'Not found', '<h2>404 — page not found</h2>', user));
}
function TESTS_HINTS(t, shown) {
  let out = '';
  for (let i = 0; i < shown; i++) out += '<div style="font-size:13px;color:#444">💡 Hint ' + (i + 1) + ': ' + esc(t.hints[i]) + '</div>';
  if (shown < 3) out += '<div style="font-size:13px"><a href="/tests?h_' + t.id + '=' + (shown + 1) + '">Reveal hint ' + (shown + 1) + '</a></div>';
  return out;
}

/* ============================ BOOT ============================ */
try {
  fs.mkdirSync(FILES_DIR, { recursive: true });
  const r1 = path.join(FILES_DIR, 'report-1001.txt');
  if (!fs.existsSync(r1)) fs.writeFileSync(r1, 'HexaLabTest — Diagnostic Report\nOrder #1001\nPatient: Alice Rahman\nHemoglobin: 13.2 g/dL\nWBC: 6.1 x10^9/L\nHbA1c: 5.4 %\nReviewed by Dr. Gregory House\n');
  const r4 = path.join(FILES_DIR, 'report-1004.txt');
  if (!fs.existsSync(r4)) fs.writeFileSync(r4, 'HexaLabTest — Diagnostic Report\nOrder #1004\nPatient: Bob Karim\nVitamin D: 22 ng/mL\nReviewed by Dr. Gregory House\n');
} catch (e) {}

const server = http.createServer((req, res) => {
  route(req, res).catch(() => { try { send(res, 500, 'internal error'); } catch (e) {} });
});
server.listen(PORT, '127.0.0.1', () => console.log('LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' listening on http://127.0.0.1:' + PORT));
