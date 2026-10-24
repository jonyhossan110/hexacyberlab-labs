'use strict';
/*
 * HexaHR — LAB 14 of 110 (Category 2: SaaS & Business Platforms)
 * A complete HR management system: employee directory, departments,
 * payroll records, leave requests with manager approval, roles.
 *
 * INTENTIONALLY VULNERABLE — a local-only training lab by HexaCyberLab.
 * Zero-dependency Node.js (built-ins only). Binds 127.0.0.1 only.
 * Business data is in-memory seed data; lab progress persists in progress.json.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const querystring = require('querystring');

const PORT = 3023;
const LAB_NUMBER = 14;
const LAB_NAME = 'HexaHR';
const PREV_LAB = 13;
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');

/* ------------------------------------------------------------------ *
 * Key material — region A (entry key, earned by completing Lab 13).
 * Stored ONLY as encoded fragments; assembled at unlock time (§7).
 * ------------------------------------------------------------------ */
const _eA = ['TC1YSA==', 'RS00MQ=='];
const _eB = ['SjFNSA==', 'LU45OQ=='];
const _eC = ['TzZaMw==', 'RFUyRA=='];
function _revJoin(parts) {
  return parts.map(p => Buffer.from(p, 'base64').toString('utf8').split('').reverse().join('')).join('');
}
function entryKey() { return _revJoin([..._eA, ..._eB, ..._eC]); }

/* ------------------------------------------------------------------ *
 * Seed data — people (login account + employee record in one).
 * All data is synthetic. Passwords are the lab's documented test
 * credentials (see README) — this app is deliberately vulnerable.
 * ------------------------------------------------------------------ */
const DEPARTMENTS = ['Engineering', 'Sales', 'Human Resources', 'Finance'];
const people = [
  { id: 1, name: 'Hana Rahman', email: 'hana@hexahr.local', password: 'HrBoss#2024', role: 'hradmin', dept: 'Human Resources', title: 'HR Director', salary: 145000, bank: 'GB29 NWBK 6016 1331 9268 19', phone: '+44 20 7946 0301', address: '14 Clerkenwell Green, London', dob: '1985-03-12', status: 'active', defaultCreds: false },
  { id: 2, name: 'Miguel Torres', email: 'miguel@hexahr.local', password: 'Manager@123', role: 'manager', dept: 'Engineering', title: 'Engineering Manager', salary: 118000, bank: 'ES91 2100 0418 4502 0005 1332', phone: '+34 910 555 214', address: 'Calle de Fuencarral 88, Madrid', dob: '1982-07-25', status: 'active', defaultCreds: false },
  { id: 3, name: 'Alice Chen', email: 'alice@hexahr.local', password: 'Alice@123', role: 'employee', dept: 'Engineering', title: 'Software Engineer', salary: 92000, bank: 'GB33 BU KB 2020 1555 5555 55', phone: '+44 20 7946 0455', address: '9 Camden High St, London', dob: '1993-11-02', status: 'active', defaultCreds: false },
  { id: 4, name: 'Bob Novak', email: 'bob@hexahr.local', password: 'Bob@12345', role: 'employee', dept: 'Sales', title: 'Account Executive', salary: 74000, bank: 'DE89 3704 0044 0532 0130 00', phone: '+49 30 555 781', address: 'Torstrasse 101, Berlin', dob: '1990-05-19', status: 'active', defaultCreds: false },
  { id: 5, name: 'Carol Dias', email: 'carol@hexahr.local', password: 'Carol@123', role: 'employee', dept: 'Sales', title: 'Sales Representative', salary: 68000, bank: 'PT50 0002 0123 1234 5678 9015 4', phone: '+351 210 555 390', address: 'Rua Augusta 120, Lisbon', dob: '1995-09-08', status: 'active', defaultCreds: false },
  { id: 6, name: 'Dave Osei', email: 'dave@hexahr.local', password: 'dave123', role: 'employee', dept: 'Finance', title: 'Accountant', salary: 71000, bank: 'GB94 BARC 2020 1533 3333 33', phone: '+44 20 7946 0777', address: '221 Brixton Hill, London', dob: '1988-01-30', status: 'active', defaultCreds: true },
  { id: 7, name: 'Sara Lind', email: 'sara@hexahr.local', password: 'Sara@1234', role: 'manager', dept: 'Sales', title: 'Sales Manager', salary: 105000, bank: 'SE45 5000 0000 5839 8257 1111', phone: '+46 8 555 019', address: 'Drottninggatan 45, Stockholm', dob: '1984-06-14', status: 'active', defaultCreds: false },
  { id: 8, name: 'Tom Becker', email: 'tom@hexahr.local', password: 'Tom@12345', role: 'employee', dept: 'Engineering', title: 'QA Engineer', salary: 66000, bank: 'DE27 7001 0080 0123 4567 89', phone: '+49 89 555 204', address: 'Leopoldstrasse 77, Munich', dob: '1992-12-03', status: 'active', defaultCreds: false },
  { id: 99, name: 'CONFIDENTIAL — Executive Compensation Record', email: 'exec comp@hexahr.local', password: 'N0tARealLogin!99', role: 'employee', dept: 'Human Resources', title: 'Executive Compensation (restricted)', salary: 390000, bank: 'GB12 HBUK 4012 7612 3456 78', phone: '+44 20 7946 0999', address: 'Restricted — HR vault', dob: '1975-04-01', status: 'terminated', defaultCreds: false },
];
function payrollFor(emp) {
  const base = Math.round(emp.salary / 12);
  const bonus = Math.round(base * 0.08);
  const deductions = Math.round(base * 0.22);
  return { empId: emp.id, month: 'October 2026', base, bonus, deductions, net: base + bonus - deductions, bank: emp.bank };
}
const leaves = [
  { id: 1, empId: 3, type: 'Annual leave', days: 5, reason: 'Family trip to visit parents', status: 'pending', approverId: null },
  { id: 2, empId: 4, type: 'Sick leave', days: 2, reason: 'Flu — doctor note on file', status: 'pending', approverId: null },
  { id: 3, empId: 5, type: 'Annual leave', days: 10, reason: 'Wedding and honeymoon', status: 'approved', approverId: 7 },
  { id: 4, empId: 8, type: 'Annual leave', days: 3, reason: 'Moving house', status: 'pending', approverId: null },
];
let nextLeaveId = 5;
const uploads = {}; // name -> { content, ext }
const loginFails = {}; // email -> failed login count
const forgotSeen = {}; // ip -> { existing: bool, missing: bool }
const API_KEY = 'hexahr123'; // weak static "integration key" documented on /api-docs (intentional flaw)

/* ------------------------------------------------------------------ *
 * Progress engine (§4) — persisted in progress.json.
 * ------------------------------------------------------------------ */
let progress = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      progress = Object.assign(progress, raw);
    }
  } catch (e) { /* corrupted state file: start fresh rather than crash */ }
}
function saveProgress() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2)); } catch (e) { /* ignore */ }
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

/* ------------------------------------------------------------------ *
 * TESTS registry (§3) — every test maps to a real working flaw and
 * completes only when the server detects the exploit succeeding.
 * ------------------------------------------------------------------ */
const FEATURES = ['Login & Authentication', 'Employee Directory & Search', 'Payroll', 'Leave Management', 'Profile & Account', 'Admin Panel', 'API & Data Exposure', 'Files & Documents'];
const TESTS = [
  /* ---------------- Login & Authentication ---------------- */
  { id: 'sqli-login', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03 Injection', difficulty: 'Beginner',
    hints: ['The login form still runs through a legacy string-built query path. What happens if your input closes the string and adds a condition that is always true?', 'Classic payload shape: a quote, the word OR, and a comparison that always holds — e.g. \' OR \'1\'=\'1', 'Put the payload in the email field and use any password. If the query is built by concatenation, the database returns the first user — the HR admin.'],
    lesson: 'String-built queries let attacker input change the query logic itself. Parameterised queries make input data-only, so a login bypass like this becomes impossible.',
    impact: 'On a real HR system this is a full account takeover of the most privileged account — every salary, bank detail and personal record in the company is exposed in one request.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never build SQL by string concatenation.' },
    guide: 'Step by step: 1) Open the login page. 2) In the email field enter a classic injection payload: \' OR \'1\'=\'1  3) Enter anything as the password and submit. 4) You are logged in as the first account in the table — the HR admin — without knowing any password.' },
  { id: 'brute-force', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limiting', owasp: 'A07 Authentication Failures', difficulty: 'Beginner',
    hints: ['Try the same account with a wrong password again and again. Does anything slow you down, lock the account, or ask for a CAPTCHA?', 'Ten wrong passwords in a row for one account is the mark of an unthrottled login.', 'Script it or just submit the login form 10 times with a bad password for bob@hexahr.local — the app processes every attempt at full speed.'],
    lesson: 'Without rate limiting, lockout or MFA, an attacker can try unlimited passwords against any account. The 10th failure being processed like the 1st is the flaw.',
    impact: 'Attackers routinely crack employee accounts this way, starting with the weakest passwords. One guessed HR password exposes the whole company\'s payroll.',
    report: { title: 'Missing Rate Limiting / Account Lockout on Login', severity: 'High', remediation: 'Throttle attempts per account and IP, add progressive delays or lockout, and enforce MFA for privileged roles.' },
    guide: 'Step by step: 1) Pick an account, e.g. bob@hexahr.local. 2) Submit the login form with a wrong password 10 times in a row. 3) Notice nothing intervenes — no delay, lock or challenge. The test completes when the 10th failure is processed.' },
  { id: 'user-enumeration', feature: 'Login & Authentication', name: 'User Enumeration via Login & Forgot-Password', owasp: 'A07 Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the exact wording of the error for an email that exists and one that does not — on the login form and on the forgot-password form.', 'If one says "no account with that email" and the other says "wrong password", the app is confirming which emails are real.', 'Submit /forgot once with a real employee email and once with a made-up email from the same browser; the different answers confirm both halves.'],
    lesson: 'Different responses for "account does not exist" and "wrong password" hand attackers a verified list of employee accounts to target with phishing and password attacks.',
    impact: 'An attacker can harvest a real staff directory of emails from a client\'s HR portal, then aim password spraying and spear-phishing at confirmed accounts only.',
    report: { title: 'Account Enumeration via Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message ("if this account exists, we sent instructions") for all login and reset outcomes.' },
    guide: 'Step by step: 1) On /forgot, submit a real email (alice@hexahr.local) — note the answer. 2) Submit a fake one (nobody@hexahr.local) — the wording is different. 3) That difference lets anyone enumerate valid accounts; the test completes once you have observed both answers.' },
  { id: 'default-creds', feature: 'Login & Authentication', name: 'Weak / Default Credentials', owasp: 'A07 Authentication Failures', difficulty: 'Beginner',
    hints: ['One employee never changed the password IT issued on day one. The README lists the test accounts — one password stands out as a leftover default.', 'It is the Finance accountant, and the password is just his first name plus three digits.', 'Log in as dave@hexahr.local with the default password dave123.'],
    lesson: 'Default and never-rotated credentials are one of the most common real-world breach causes. First-login forced password change and a default-credential audit close this hole.',
    impact: 'An attacker who guesses one default password gets a genuine employee account — a foothold inside the client\'s HR system with access to colleagues\' personal data.',
    report: { title: 'Default Credentials Still Active on an Employee Account', severity: 'High', remediation: 'Force a password change at first login, disable vendor defaults, and audit for unchanged issued passwords.' },
    guide: 'Step by step: 1) Read the test-account list in the README. 2) Log in as dave@hexahr.local with the issued default password dave123. 3) It works — the account never changed it.' },
  { id: 'reset-token', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07 Authentication Failures', difficulty: 'Intermediate',
    hints: ['The reset flow "emails" a token — but the token is derived from something public about the account, not from randomness.', 'It is a truncated hash of one public value: the account\'s email address. MD5, first 10 hex characters.', 'Compute md5("dave@hexahr.local") yourself, take the first 10 hex chars, and post it to /reset with a new password — no mailbox access needed.'],
    lesson: 'Reset tokens must be long, random and single-use. A token computed from the email address can be generated by anyone who knows the algorithm — the mailbox check is pure theatre.',
    impact: 'Anyone on the internet can reset the HR admin\'s password knowing only her email address, taking over the entire HR platform without touching her inbox.',
    report: { title: 'Password-Reset Tokens Are Predictable (Derived from Email)', severity: 'Critical', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), store only a hash, expire quickly, and invalidate after use.' },
    guide: 'Step by step: 1) Compute the MD5 of the target email (lowercase) and take the first 10 hex characters — that is the token. 2) Open /reset and submit the email, that token, and a new password of your choice. 3) Log in with the new password. You never saw the victim\'s mailbox.' },
  { id: 'cookie-tamper', feature: 'Login & Authentication', name: 'Session Cookie Role Tampering', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Look at your session cookie after logging in. It is just base64 JSON — decode it and see what the server trusts.', 'The cookie carries your role, and the server gates pages on the cookie copy instead of its own records.', 'Decode the hxh_session cookie, change "role" to "hradmin", re-encode, and visit /admin.'],
    lesson: 'Authorization data must live server-side or be cryptographically signed. If the client can edit its own role, every role check in the app is decoration.',
    impact: 'Any ordinary employee can promote themselves to HR admin by editing a cookie — no password, no exploit tooling, just a browser extension.',
    report: { title: 'Client-Controlled Role in Session Cookie Enables Privilege Escalation', severity: 'Critical', remediation: 'Keep roles in server-side session storage, or sign session tokens (e.g. HMAC/JWT with a server secret) and verify integrity on every request.' },
    guide: 'Step by step: 1) Log in as any employee. 2) Copy the hxh_session cookie and base64-decode it — it is plain JSON including your role. 3) Change the role to hradmin, re-encode, and replace the cookie. 4) Open /admin — you are treated as HR admin while your real account is still an employee.' },

  /* ---------------- Employee Directory & Search ---------------- */
  { id: 'search-sqli', feature: 'Employee Directory & Search', name: 'SQL Injection in Employee Search', owasp: 'A03 Injection', difficulty: 'Intermediate',
    hints: ['The directory search feeds your text into a query the same legacy way the login does. What does an always-true condition return here?', 'Normal searches hide terminated and restricted records. An injection that makes the filter always true ignores the status filter too.', 'Search for \' OR \'1\'=\'1 and look for a record that never appears in normal searches — a confidential executive record.'],
    lesson: 'Injection in search is a data-exfiltration channel: crafted input can dump records the UI deliberately hides, far beyond what the search box was meant to show.',
    impact: 'A hidden executive-compensation record — the most sensitive row in the database — leaks to any employee through the ordinary search box.',
    report: { title: 'SQL Injection in Employee Search Exposes Restricted Records', severity: 'High', remediation: 'Parameterise search queries and enforce record-visibility rules in the query itself, not in the UI layer.' },
    guide: 'Step by step: 1) Log in and open Employees. 2) Search for the payload \' OR \'1\'=\'1. 3) The result list now includes every record, including the terminated CONFIDENTIAL executive-compensation record that normal search hides.' },
  { id: 'reflected-xss', feature: 'Employee Directory & Search', name: 'Reflected XSS in Employee Search', owasp: 'A03 Injection', difficulty: 'Beginner',
    hints: ['Your search text is echoed back on the results page ("Results for: …"). Is it encoded?', 'Put an HTML/script payload in the search box instead of a name and view the page source.', 'Search for <script>alert(1)</script> — if the payload appears in the page exactly as typed, it executes in the victim\'s browser.'],
    lesson: 'Any user input reflected into a page must be output-encoded. A search box that echoes raw input turns a link into a script-delivery weapon against colleagues.',
    impact: 'An attacker emails an employee a crafted search link; opening it runs script in the victim\'s logged-in HR session — session theft or actions performed as the victim.',
    report: { title: 'Reflected Cross-Site Scripting in Employee Search', severity: 'High', remediation: 'Context-encode all reflected user input on output and add a Content-Security-Policy as defence in depth.' },
    guide: 'Step by step: 1) In the Employees search box, enter <script>alert(1)</script> as the query. 2) Submit and view the results page. 3) The payload is reflected unescaped in the "Results for" line — in a browser it executes.' },
  { id: 'record-idor', feature: 'Employee Directory & Search', name: 'IDOR — Full Employee Record Exposure', owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    hints: ['Employee detail pages live at /employees/<id> with small sequential ids. What stops you opening a colleague\'s?', 'Open your own record, then change the number. Private fields — phone, home address, date of birth — are on that page.', 'As Alice (/employees/3 is you), open /employees/4 — Bob\'s private contact details are served to you.'],
    lesson: 'Every object access must check that the requester may see that object. Sequential ids plus no ownership check means the whole staff directory\'s private data is public to insiders.',
    impact: 'Any employee can read every colleague\'s home address, personal phone and date of birth — prime material for identity theft, stalking and targeted phishing.',
    report: { title: 'Insecure Direct Object Reference Exposes Employees\' Personal Data', severity: 'High', remediation: 'Enforce per-object authorization (owner, same-department manager, or HR) on every record view; minimise the fields shown.' },
    guide: 'Step by step: 1) Log in as an ordinary employee (Alice). 2) Open your own record at /employees/3. 3) Change the id to 4. Bob\'s full record — phone, home address, date of birth — is displayed with no check.' },

  /* ---------------- Payroll ---------------- */
  { id: 'payroll-idor', feature: 'Payroll', name: 'Payroll IDOR — Colleague\'s Salary & Bank Details', owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    hints: ['Payslips live at /payroll/<employeeId>. Yours is shown by default — what about the number next door?', 'Salary and full bank account details are on that page. No ownership check stands between you and them.', 'As Alice, open /payroll/4 — Bob\'s payslip, salary breakdown and full bank IBAN.'],
    lesson: 'Payroll is the most sensitive data an HR system holds. Object-level authorization is not optional: the server must verify the payslip belongs to the requester (or a privileged role) on every request.',
    impact: 'Every employee can see every colleague\'s exact salary and full bank details — a confidentiality breach that destroys trust and invites fraud and discrimination claims.',
    report: { title: 'Insecure Direct Object Reference in Payroll Exposes Salary and Bank Data', severity: 'Critical', remediation: 'Check ownership or privileged role server-side for every payroll record; log access to payroll data.' },
    guide: 'Step by step: 1) Log in as Alice and open Payroll — you see your own payslip at /payroll/3. 2) Change the id to 4. 3) Bob\'s full payslip renders: base salary, net pay and his complete bank IBAN.' },
  { id: 'payroll-cross-dept', feature: 'Payroll', name: 'Cross-Department Payroll Access', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Department payroll listings live at /payroll/department/<name>. A manager is meant to see only their own department.', 'Log in as the Engineering manager and ask for another department\'s listing.', 'As Miguel (Engineering), open /payroll/department/Sales — every Sales salary is listed for a manager with no business seeing them.'],
    lesson: 'Role checks alone are not enough; scope matters. A manager role must be bound to their own department — "is a manager" is not "may see all payroll".',
    impact: 'A single curious or malicious manager can harvest the entire company\'s salary table department by department, enabling poaching, blackmail and pay-equity disputes.',
    report: { title: 'Missing Department Scoping Allows Cross-Department Payroll Access', severity: 'High', remediation: 'Scope manager queries to their own department server-side; only HR admin gets a company-wide view.' },
    guide: 'Step by step: 1) Log in as Miguel, the Engineering manager. 2) Open /payroll/department/Sales. 3) The full Sales payroll listing is served although Miguel manages Engineering — the department scope is never checked.' },

  /* ---------------- Leave Management ---------------- */
  { id: 'leave-self-approve', feature: 'Leave Management', name: 'Leave Self-Approval', owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    hints: ['The approve action for a leave request checks that you are logged in — and little else. Whose request is pending in your name?', 'Find your own pending request on /leave and look at the approve endpoint: POST /leave/<id>/approve.', 'As Alice, approve your own request #1. The system lets the requester be the approver.'],
    lesson: 'Approval workflows must enforce separation of duties server-side: requester ≠ approver. A missing check turns every approval process into self-service.',
    impact: 'Employees grant themselves unlimited leave without any manager ever seeing it — payroll pays for holidays nobody approved, and absence records become fiction.',
    report: { title: 'Leave Requests Can Be Approved by the Requester (Missing Separation of Duties)', severity: 'High', remediation: 'Require approver ≠ requester and approver to be the requester\'s manager or HR, enforced server-side.' },
    guide: 'Step by step: 1) Log in as Alice; her request #1 is pending. 2) Send POST /leave/1/approve as Alice. 3) The request flips to approved — she approved her own holiday.' },
  { id: 'leave-cross-dept', feature: 'Leave Management', name: 'Leave Approval Across Departments', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The same approve endpoint also fails to check which department the request belongs to.', 'A manager from Engineering can decide a Sales employee\'s leave — the workflow never compares departments.', 'As Miguel (Engineering), approve Bob\'s pending request #2 (Sales). Any non-HR approver who is not the requester proves the point.'],
    lesson: 'Workflow authorization must match the org chart: approvers act within their reporting line. Without it, approvals are meaningless and audit trails lie.',
    impact: 'Managers can approve or sabotage leave outside their team — covering up absences, playing favourites, or creating fraudulent attendance records across the company.',
    report: { title: 'Leave Approvals Are Not Scoped to the Approver\'s Department or Reporting Line', severity: 'Medium', remediation: 'Restrict approvals to the requester\'s direct manager (or HR), verified against the org structure server-side.' },
    guide: 'Step by step: 1) Log in as Miguel (Engineering manager). 2) Approve Bob\'s request #2 — Bob is in Sales. 3) It is approved, although Miguel has no authority over Sales staff.' },
  { id: 'leave-idor', feature: 'Leave Management', name: 'IDOR — Reading Colleagues\' Leave Requests', owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    hints: ['Leave detail pages live at /leave/<id>. Reasons can be private — sick notes, family matters.', 'As one employee, open another employee\'s request by changing the number.', 'As Carol, open /leave/1 — Alice\'s request and her personal reason are fully readable.'],
    lesson: 'Leave reasons are health-adjacent personal data. Object-level checks apply to workflow objects just as much as to records and payslips.',
    impact: 'Staff can read why colleagues are absent — including medical and family reasons — a serious privacy breach and, in many jurisdictions, a data-protection violation.',
    report: { title: 'Insecure Direct Object Reference Exposes Leave Request Details', severity: 'Medium', remediation: 'Limit leave detail visibility to the requester, their manager and HR.' },
    guide: 'Step by step: 1) Log in as Carol. 2) Open /leave/1 — Alice\'s request. 3) Her leave type, dates and personal reason are displayed although Carol has no connection to the request.' },

  /* ---------------- Profile & Account ---------------- */
  { id: 'mass-assignment', feature: 'Profile & Account', name: 'Mass Assignment — Self-Promotion & Salary Edit', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The profile update binds the whole submitted form to your record. What happens if you submit fields the form never showed — like salary or role?', 'Add an extra field to the profile POST: salary=250000 (or role=hradmin). The server trusts it.', 'Send POST /profile with your normal fields plus salary — then check your payslip: the number moved.'],
    lesson: 'Bind only allowlisted fields on update. Anything the client sends — role, salary, balance — must never be copied blindly onto the record.',
    impact: 'An employee quietly raises their own salary in the HR system of record; payroll then pays the fraudulent amount as if HR had approved it.',
    report: { title: 'Mass Assignment in Profile Update Allows Salary and Role Tampering', severity: 'Critical', remediation: 'Use an explicit allowlist of updatable fields per role; reject or ignore privileged fields (role, salary, department) from self-service updates.' },
    guide: 'Step by step: 1) Log in as any employee and open Profile. 2) Submit the profile form with one extra field added: salary=250000. 3) Open your payslip — your recorded salary is now 250000. The same works with role=hradmin.' },
  { id: 'stored-xss', feature: 'Profile & Account', name: 'Stored XSS via Display Name', owasp: 'A03 Injection', difficulty: 'Intermediate',
    hints: ['Your display name is shown in the directory and page header. Is it encoded anywhere?', 'Set your name to an HTML/script payload and view the employee directory — the payload is stored in the database and rendered raw.', 'Use the name <script>alert(\'xss\')</script> on the profile form; the directory then serves it to every viewer, including HR admin.'],
    lesson: 'Stored XSS is worse than reflected: one malicious profile poisons every page that renders the name, including admin screens — a direct path to session theft of privileged users.',
    impact: 'An employee plants a script in their name; when the HR director opens the directory, the script runs in her session and can act as her — full HR takeover from a profile field.',
    report: { title: 'Stored Cross-Site Scripting via Employee Display Name', severity: 'High', remediation: 'Output-encode user-controlled fields at render time everywhere; validate names against a safe character policy.' },
    guide: 'Step by step: 1) Log in as Bob and open Profile. 2) Set the display name to <script>alert(\'xss\')</script> and save. 3) Open the employee directory — the name is stored and rendered unescaped, firing for every viewer.' },
  { id: 'csrf-profile', feature: 'Profile & Account', name: 'CSRF on Profile Update', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Profile changes ride on your session cookie alone. The app\'s own form carries a hidden marker — a foreign form would not.', 'A state-changing POST that succeeds with a cross-site Origin and no marker is a CSRF proof.', 'POST to /profile from a "different site" (Origin: http://evil.example, no hx_origin field) while logged in — the change is applied.'],
    lesson: 'State-changing requests need an unguessable, session-bound token (or strict SameSite cookies). Cookies alone authenticate the browser, not the user\'s intent.',
    impact: 'A malicious website an employee visits while logged in can silently rewrite their profile — name, phone, even bank-adjacent fields — without them clicking anything in the HR app.',
    report: { title: 'Cross-Site Request Forgery on Profile Update', severity: 'Medium', remediation: 'Require a per-session CSRF token on all state-changing forms and verify Origin/Referer as defence in depth.' },
    guide: 'Step by step: 1) Stay logged in as Carol. 2) Send a POST to /profile with a new phone number, an Origin header of http://evil.example, and no hx_origin marker. 3) The update is accepted — a foreign site could have sent that request from her browser.' },
  { id: 'weak-password', feature: 'Profile & Account', name: 'Weak Password Policy', owasp: 'A07 Authentication Failures', difficulty: 'Beginner',
    hints: ['Change your password on the profile page. How short will it let you go?', 'There is no minimum length, complexity or blocklist check at all.', 'Set the new password to a single character — "x". If the app accepts it, the policy is fiction.'],
    lesson: 'Password policy is a control, not a suggestion: enforce a sane minimum length and screen against known-breached passwords, especially where payroll data is at stake.',
    impact: 'Employees who choose one-character passwords hand attackers an easy win — combined with no rate limiting, those accounts fall in seconds.',
    report: { title: 'No Password Complexity or Length Policy Enforced', severity: 'Medium', remediation: 'Enforce ≥10–12 character passwords, check against breached-password lists, and apply the policy on every set/change path.' },
    guide: 'Step by step: 1) Log in as Tom and open Profile → change password. 2) Enter a one-character password. 3) It is accepted and you can log in with it — there is no policy.' },

  /* ---------------- Admin Panel ---------------- */
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'CSRF on Admin Action (Deactivate Employee)', owasp: 'A01 Broken Access Control', difficulty: 'Advanced',
    hints: ['Admin actions — like deactivating an employee — are plain POSTs guarded only by the admin\'s cookie.', 'The admin form carries the same hidden marker as other forms; a cross-site request would lack it and carry a foreign Origin.', 'While logged in as Hana (HR admin), POST /admin/deactivate for Tom (id 8) with Origin: http://evil.example and no marker. The account is deactivated.'],
    lesson: 'Privileged actions need CSRF protection most of all: one malicious page open in the HR admin\'s browser can fire destructive admin requests with her authority.',
    impact: 'An attacker who lures the HR director to a booby-trapped page can deactivate employees at will — sabotage and denial of service against the client\'s workforce records.',
    report: { title: 'Cross-Site Request Forgery on Administrative Employee Deactivation', severity: 'High', remediation: 'Enforce CSRF tokens on all admin actions, require re-authentication for destructive operations, and audit admin activity.' },
    guide: 'Step by step: 1) Log in as Hana, the HR admin. 2) Send POST /admin/deactivate with id=8, a cross-site Origin header and no hx_origin marker. 3) Tom\'s account is deactivated — the request needed nothing but her browser\'s cookie.' },

  /* ---------------- API & Data Exposure ---------------- */
  { id: 'api-weak-token', feature: 'API & Data Exposure', name: 'Weak Static API Token', owasp: 'A07 Authentication Failures', difficulty: 'Beginner',
    hints: ['The API at /api/employees wants an X-API-Key header. Where would a lazy integration leave that key lying around?', 'Read the /api-docs page source — there is an example key in a comment, marked TODO.', 'Send GET /api/employees with header X-API-Key: hexahr123 — the "secret" is a guessable word printed in the docs.'],
    lesson: 'API keys must be long, random, per-client and rotatable — and never printed in documentation or comments. A static guessable key is public access with extra steps.',
    impact: 'Anyone who reads the public API docs walks away with a working key to the employee API — names, emails, departments and salaries included.',
    report: { title: 'Guessable Static API Key Disclosed in Documentation', severity: 'High', remediation: 'Issue per-client random API keys (≥128 bits), store them hashed, support rotation, and scrub secrets from docs and comments.' },
    guide: 'Step by step: 1) Open /api-docs and view the page source — a commented example key is left in the HTML. 2) Call GET /api/employees with that value in the X-API-Key header. 3) The full employee list is returned.' },
  { id: 'api-export-unauth', feature: 'API & Data Exposure', name: 'Unauthenticated Employee Data Export', owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    hints: ['There is a bulk export endpoint at /api/export. Try it with no login and no API key at all.', 'Bulk endpoints are the ones developers forget to protect.', 'Just GET /api/export in a fresh browser — the entire workforce, salaries and bank details included, downloads as JSON.'],
    lesson: 'Every endpoint needs authentication and authorization — especially exports, which concentrate the most sensitive data into a single response.',
    impact: 'The whole company\'s HR database — every salary and bank account — is downloadable by anyone on the internet with zero credentials. This is the headline breach.',
    report: { title: 'Unauthenticated Bulk Export of Employee, Salary and Bank Data', severity: 'Critical', remediation: 'Require authenticated, HR-admin-only access for exports; audit and alert on bulk data access.' },
    guide: 'Step by step: 1) Log out completely. 2) Open /api/export. 3) A JSON dump of every employee — salary, bank IBAN, phone, address — is served with no authentication whatsoever.' },
  { id: 'missing-headers', feature: 'API & Data Exposure', name: 'Missing Security Headers', owasp: 'A05 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Fetch any page and inspect the response headers. What is missing that a hardened app would send?', 'No X-Frame-Options, no Content-Security-Policy, no X-Content-Type-Options — the app sends none of them.', 'Open the dashboard and check its headers: the absence of clickjacking and MIME-sniffing protections is the finding.'],
    lesson: 'Security headers are cheap, layered protection: they stop clickjacking, MIME confusion and limit XSS blast radius. Their complete absence signals an unhardened deployment.',
    impact: 'Without frame protection, the HR portal can be embedded in an attacker\'s page for clickjacking — tricking an HR admin into clicking hidden admin actions.',
    report: { title: 'Missing HTTP Security Headers', severity: 'Low', remediation: 'Add X-Frame-Options/Content-Security-Policy frame-ancestors, X-Content-Type-Options: nosniff, and Referrer-Policy at the app or proxy layer.' },
    guide: 'Step by step: 1) Log in and request the dashboard. 2) Inspect the response headers. 3) None of the standard security headers are present — the test completes on that observation.' },

  /* ---------------- Files & Documents ---------------- */
  { id: 'upload-unrestricted', feature: 'Files & Documents', name: 'Unrestricted File Upload (Stored HTML)', owasp: 'A03 Injection', difficulty: 'Intermediate',
    hints: ['The avatar/document upload on the profile page takes any filename and content, and serves it back under /uploads/.', 'What content type does an uploaded .html file get served with?', 'Upload a file named evil.html containing a heading, then open /uploads/evil.html — it renders as a web page from the HR app\'s own origin.'],
    lesson: 'Uploads must be allowlisted by type, stored outside the web root or served with a safe content type and Content-Disposition. Serving user HTML from the app origin is stored XSS by another door.',
    impact: 'An employee uploads a fake "HR login" page hosted on the real HR domain — perfect phishing against colleagues, delivered from a trusted address.',
    report: { title: 'Unrestricted File Upload Allows Hosting Arbitrary HTML on the Application Origin', severity: 'High', remediation: 'Allowlist file types, verify content, serve uploads with Content-Disposition: attachment or from a separate domain, and never as text/html.' },
    guide: 'Step by step: 1) Log in and use the upload form on Profile with filename evil.html and any HTML content. 2) Open /uploads/evil.html. 3) Your HTML is served as a page from the app itself — the upload is unrestricted.' },
  { id: 'download-traversal', feature: 'Files & Documents', name: 'Path Traversal in Document Download', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Documents download via /documents?name=handbook.txt. The name is joined straight onto a folder path.', 'What if the name walks up a directory with ../ ?', 'Request /documents?name=../server.js — the application\'s own source code comes back.'],
    lesson: 'Never join user input onto filesystem paths without canonicalisation and an allowlist. Traversal turns a document viewer into a full file-read primitive — source, config, secrets.',
    impact: 'The app\'s source code — and with it every embedded secret and the full vulnerability map — is readable by any employee, and on a real system config files and credentials follow.',
    report: { title: 'Path Traversal in Document Download Allows Arbitrary File Read', severity: 'High', remediation: 'Resolve the final path and verify it stays inside the documents directory; serve documents by id from an allowlist, not by filename.' },
    guide: 'Step by step: 1) Download the handbook normally: /documents?name=handbook.txt. 2) Now request /documents?name=../server.js. 3) The server returns its own source code — the name was never sanitised.' },
];

/* ------------------------------------------------------------------ *
 * Key material — region B (completion key, revealed only at 100%).
 * Stored ONLY as encoded fragments (§7); assembled on demand.
 * ------------------------------------------------------------------ */
const _cA = ['TC1YSA==', 'NC01MQ=='];
const _cB = ['NUc3UQ==', 'LTlPRg=='];
const _cC = ['TzBNRg==', 'UkpSSg=='];
function completionKey() { return _revJoin([..._cA, ..._cB, ..._cC]); }

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */
const XSS_RE = /<\s*script|on\w+\s*=|<\s*svg|<\s*iframe|javascript\s*:/i;
const INJ_RE = /'\s*(or|and)\s+[^=]*=|'\s*--|'\s*or\s*'[^']*'\s*=\s*'/i;
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function person(id) { return people.find(p => p.id === Number(id)); }
function personByEmail(email) { return people.find(p => p.email.toLowerCase() === String(email || '').toLowerCase()); }
function tokenFor(email) { return crypto.createHash('md5').update(String(email).toLowerCase()).digest('hex').slice(0, 10); }
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function getSession(req) {
  const c = parseCookies(req).hxh_session;
  if (!c) return null;
  try {
    const s = JSON.parse(Buffer.from(c, 'base64url').toString('utf8'));
    if (!s || !person(s.uid)) return null;
    return s;
  } catch (e) { return null; }
}
function sessionCookie(user) {
  const payload = Buffer.from(JSON.stringify({ uid: user.id, role: user.role, name: user.name })).toString('base64url');
  return `hxh_session=${payload}; Path=/; HttpOnly=false`;
}
function markerFor(sess) { return sess ? `hx-${sess.uid}-7f3` : ''; }
function csrfSuspect(req, body, sess) {
  const origin = req.headers.origin || '';
  const host = req.headers.host || '';
  const crossOrigin = origin && !origin.includes(host);
  const markerOk = sess && body && body.hx_origin === markerFor(sess);
  return crossOrigin || !markerOk;
}
function parseBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', ch => { data += ch; if (data.length > 2e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) {
        try { return resolve(JSON.parse(data || '{}')); } catch (e) { return resolve({}); }
      }
      return resolve(querystring.parse(data));
    });
    req.on('error', () => resolve({}));
  });
}

/* ------------------------------------------------------------------ *
 * Layout + Lab Coach widget (§5)
 * ------------------------------------------------------------------ */
function layout(req, title, content) {
  const s = progressSummary();
  const sess = getSession(req);
  const bar = `<div style="background:#14141d;color:#eee;padding:8px 16px;display:flex;align-items:center;gap:14px;font-family:'Segoe UI',Arial,sans-serif">
    <img src="/logo.png" alt="HexaCyberLab" style="height:34px">
    <strong>LAB ${LAB_NUMBER} — ${LAB_NAME}</strong>
    <span style="font-size:13px">🎯 ${s.done}/${s.total} tests · ${s.pct}%</span>
    <span style="flex:1;background:#333;height:10px;border-radius:5px;overflow:hidden"><span style="display:block;height:100%;width:${s.pct}%;background:linear-gradient(90deg,#5b8cff,#a55bff)"></span></span>
    ${sess ? `<span style="font-size:13px">${sess.name} (${esc(sess.role)})</span>` : ''}
  </div>
  <nav style="background:#1d1d29;padding:8px 16px;font-family:'Segoe UI',Arial,sans-serif;font-size:14px;display:flex;gap:14px;flex-wrap:wrap">
    <a style="color:#9db8ff" href="/dashboard">Dashboard</a><a style="color:#9db8ff" href="/employees">Employees</a><a style="color:#9db8ff" href="/payroll">Payroll</a><a style="color:#9db8ff" href="/leave">Leave</a><a style="color:#9db8ff" href="/profile">Profile</a><a style="color:#9db8ff" href="/documents?name=handbook.txt">Handbook</a><a style="color:#9db8ff" href="/api-docs">API Docs</a><a style="color:#9db8ff" href="/tests">🎯 Tests</a><a style="color:#9db8ff" href="/complete">🏆 Complete</a>
    ${sess ? '<a style="color:#f0a0a0" href="/logout">Logout</a>' : '<a style="color:#9db8ff" href="/login">Login</a>'}
  </nav>`;
  const widget = `<div id="hxchat" style="position:fixed;right:16px;bottom:16px;width:320px;font-family:'Segoe UI',Arial,sans-serif;z-index:50">
    <button onclick="var b=document.getElementById('hxchatbody');b.style.display=b.style.display==='none'?'block':'none'" style="width:100%;background:#5b3df0;color:#fff;border:0;padding:10px;border-radius:10px;cursor:pointer">🤖 Lab Coach</button>
    <div id="hxchatbody" style="display:none;background:#fff;border:1px solid #ccc;border-radius:10px;margin-top:6px;box-shadow:0 6px 24px rgba(0,0,0,.25)">
      <div id="hxmsgs" style="height:220px;overflow:auto;padding:10px;font-size:13px"></div>
      <form id="hxform" style="display:flex;border-top:1px solid #eee"><input id="hxinput" autocomplete="off" placeholder="Ask the coach…" style="flex:1;border:0;padding:9px;font-size:13px"><button style="background:#5b3df0;color:#fff;border:0;padding:9px 14px;cursor:pointer">Send</button></form>
    </div></div>
  <script>
  document.getElementById('hxform').addEventListener('submit', async function(e){ e.preventDefault();
    var inp=document.getElementById('hxinput'), box=document.getElementById('hxmsgs'), m=inp.value.trim(); if(!m) return; inp.value='';
    box.innerHTML += '<div style="margin:6px 0"><b>You:</b> '+m.replace(/</g,'&lt;')+'</div>'; box.scrollTop=box.scrollHeight;
    try { var r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})});
      var j=await r.json(); box.innerHTML += '<div style="margin:6px 0;background:#f2efff;padding:7px;border-radius:7px"><b>Coach:</b> '+String(j.reply||'').replace(/</g,'&lt;')+'</div>';
    } catch(err){ box.innerHTML += '<div style="margin:6px 0">Coach unavailable.</div>'; }
    box.scrollTop=box.scrollHeight; });
  </script>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)} · LAB ${LAB_NUMBER} — ${LAB_NAME}</title>
  <style>body{font-family:'Segoe UI',Arial,sans-serif;margin:0;background:#f4f4f8;color:#1c1c26}main{max-width:980px;margin:0 auto;padding:22px 16px 90px}table{border-collapse:collapse;width:100%;background:#fff}td,th{border:1px solid #ddd;padding:7px 9px;font-size:14px;text-align:left}input,select,textarea{padding:7px;font-size:14px;margin:3px 0}button,.btn{background:#5b3df0;color:#fff;border:0;padding:8px 15px;border-radius:6px;cursor:pointer;text-decoration:none;display:inline-block;font-size:14px}.card{background:#fff;border:1px solid #e2e2ee;border-radius:10px;padding:16px;margin:12px 0}.err{background:#ffe3e3;border:1px solid #e5a3a3;padding:10px;border-radius:8px}.ok{background:#e2f7e2;border:1px solid #9ed09e;padding:10px;border-radius:8px}</style></head>
  <body>${bar}<main><h1 style="font-size:22px">${esc(title)}</h1>${content}</main>${widget}</body></html>`;
}
function gatePage(err) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ${LAB_NUMBER} — ${LAB_NAME} · Locked</title>
  <style>body{font-family:'Segoe UI',Arial,sans-serif;background:#14141d;color:#eee;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh}.box{max-width:460px;text-align:center;padding:30px}input{padding:10px;width:88%;font-size:15px;border-radius:7px;border:1px solid #555;background:#222;color:#fff}button{background:#5b3df0;color:#fff;border:0;padding:10px 22px;border-radius:7px;cursor:pointer;font-size:15px;margin-top:12px}</style></head>
  <body><div class="box"><img src="/logo.png" style="height:64px"><h1>LAB ${LAB_NUMBER} — ${LAB_NAME}</h1>
  <p>🔒 This lab is locked. Paste the completion key from Lab ${PREV_LAB} to start.</p>
  ${err ? '<p style="color:#ff9c9c">That key was not accepted. The lab stays locked.</p>' : ''}
  <form method="POST" action="/unlock"><input name="key" placeholder="Completion key from Lab ${PREV_LAB}" autocomplete="off"><br><button type="submit">Unlock Lab ${LAB_NUMBER}</button></form>
  <p style="font-size:12px;color:#999">HexaCyberLab practice labs run in order — finish Lab ${PREV_LAB} at 100% to earn this key.</p></div></body></html>`;
}

/* ------------------------------------------------------------------ *
 * Lab Coach chatbot (§6) — rule-based, registry knowledge only.
 * ------------------------------------------------------------------ */
const FEATURE_KEYS = [
  ['Login & Authentication', ['login', 'password', 'auth', 'brute', 'reset', 'forgot', 'cookie', 'session', 'credential']],
  ['Employee Directory & Search', ['director', 'search', 'employee record', 'catalogue']],
  ['Payroll', ['payroll', 'salary', 'payslip', 'bank']],
  ['Leave Management', ['leave', 'holiday', 'absence', 'approve']],
  ['Profile & Account', ['profile', 'account', 'avatar', 'upload']],
  ['Admin Panel', ['admin', 'deactivat']],
  ['API & Data Exposure', ['api', 'export', 'token', 'header']],
  ['Files & Documents', ['file', 'document', 'download', 'handbook', 'traversal']],
];
function matchFeature(msg) {
  for (const [f, keys] of FEATURE_KEYS) if (keys.some(k => msg.includes(k))) return f;
  return null;
}
function matchTest(msg, feature) {
  const words = msg.split(/[^a-z0-9]+/).filter(w => w.length > 2);
  let best = null, bestScore = 0;
  for (const t of TESTS) {
    if (feature && t.feature !== feature) continue;
    const hay = (t.id + ' ' + t.name.toLowerCase());
    let score = 0;
    for (const w of words) if (hay.includes(w)) score++;
    if (msg.includes(t.id.replace(/-/g, ' '))) score += 3;
    if (score > bestScore) { bestScore = score; best = t; }
  }
  return bestScore > 0 ? best : null;
}
function chatReply(rawMsg) {
  const msg = String(rawMsg || '').toLowerCase();
  const s = progressSummary();
  if (/who (built|made|created)|founder|jony|hassain|your (author|creator)/.test(msg)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (msg.includes('key') && /(completion|next|unlock|give|show|what|tell|reveal)/.test(msg)) {
    if (s.complete && progress.keyRevealed) return `You earned it — the completion key for Lab ${LAB_NUMBER} is: ${completionKey()} — paste it into Lab ${LAB_NUMBER + 1} to unlock it. Congratulations!`;
    return `I don't have the completion key yet — nobody does. It is only released to me when this lab is completed 100%, and you are at ${s.pct}% (${s.done}/${s.total} tests). Finish every test and ask me again.`;
  }
  if ((/(how many|count|list)/.test(msg) || msg.includes('vulnerabilit') || msg.includes(' tests')) && !/how (do|to|can|does)/.test(msg)) {
    const f = matchFeature(msg);
    if (f) {
      const ts = TESTS.filter(t => t.feature === f);
      return `${f} has ${ts.length} test(s): ${ts.map(t => t.name + (progress.tests[t.id] ? ' ✓' : '')).join('; ')}. Ask me "how do I …" for one of them — guidance unlocks after 3 genuine tries on that feature (you have ${s.features[f].attempts} so far).`;
    }
    return `This lab has ${s.total} scored tests across ${FEATURES.length} features: ${FEATURES.map(f => `${f} (${s.features[f].total})`).join(', ')}. Your progress: ${s.done}/${s.total} (${s.pct}%). Open the 🎯 Tests page for the full mission list.`;
  }
  if (/progress|status|score|percent/.test(msg)) {
    const next = TESTS.find(t => !progress.tests[t.id]);
    return `You are at ${s.pct}% — ${s.done} of ${s.total} tests complete.${next ? ` Next open test: "${next.name}" in ${next.feature}.` : ' Everything is done — see /complete for your key and certificate!'}`;
  }
  if (/how|help|guide|solve|hint|stuck|do the|exploit/.test(msg)) {
    const f = matchFeature(msg);
    const t = matchTest(msg, f) || (f ? TESTS.find(x => x.feature === f && !progress.tests[x.id]) || TESTS.find(x => x.feature === f) : null) || TESTS.find(x => !progress.tests[x.id]);
    if (!t) return 'Every test is complete — congratulations! Head to /complete for your summary, key and certificate.';
    const att = s.features[t.feature].attempts;
    if (progress.tests[t.id]) return `You already completed "${t.name}". Its method, for your notes: ${t.guide}`;
    if (att >= 3) return `Here is the step-by-step for "${t.name}" (${t.feature}): ${t.guide}`;
    return `That feature is locked for help. First try the ${t.feature} tests yourself at least 3 times — I can see you've tried ${att} time(s) so far. After 3 real tries, ask me again and I'll guide you step by step.`;
  }
  if (/next|what should|where (do|to) start|begin/.test(msg)) {
    const next = TESTS.find(t => !progress.tests[t.id]);
    if (!next) return 'Nothing left — you completed the lab! See /complete for the summary, your completion key and the certificate.';
    return `Start with "${next.name}" in ${next.feature} (${next.difficulty}). Its first hint: ${next.hints[0]} More hints live on the 🎯 Tests page.`;
  }
  if (/hello|hi|hey/.test(msg) && msg.length < 24) {
    return `Hello! I am the Lab Coach for Lab ${LAB_NUMBER} — ${LAB_NAME}. You are at ${s.pct}% (${s.done}/${s.total} tests). Ask me how many tests a feature has, how a test works (after 3 tries on that feature), or what to do next.`;
  }
  return `I can help with this lab's ${s.total} tests across ${FEATURES.length} features: ask me for counts ("how many tests in Payroll?"), your progress, or how a test works — guidance for a feature unlocks after you've genuinely tried it 3 times. The 🎯 Tests page lists every mission with graded hints.`;
}

/* ------------------------------------------------------------------ *
 * HTTP handlers
 * ------------------------------------------------------------------ */
function sendHtml(res, code, body, extraHeaders) {
  res.writeHead(code, Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, extraHeaders || {}));
  res.end(body);
}
function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}
function redirect(res, loc, cookie) {
  const headers = { Location: loc };
  if (cookie) headers['Set-Cookie'] = cookie;
  res.writeHead(302, headers);
  res.end();
}
function detectCookieTamper(req, sess) {
  if (!sess) return;
  const db = person(sess.uid);
  if (db && sess.role !== db.role && (sess.role === 'hradmin' || sess.role === 'manager')) pass('cookie-tamper');
}
function requireLogin(req, res) {
  const sess = getSession(req);
  if (!sess) { redirect(res, '/login'); return null; }
  return sess;
}

/* ---------- Auth ---------- */
function loginPage(req, err) {
  return layout(req, 'Login — HexaHR', `<div class="card" style="max-width:440px;margin:30px auto">
    <h2 style="margin-top:0">Sign in to HexaHR</h2>
    ${err ? `<div class="err">${esc(err)}</div>` : ''}
    <form method="POST" action="/login">
      <label>Email<br><input name="email" style="width:94%" autocomplete="off"></label><br>
      <label>Password<br><input name="password" type="password" style="width:94%"></label><br><br>
      <button type="submit">Sign in</button>
    </form>
    <p style="font-size:13px"><a href="/forgot">Forgot your password?</a></p>
    <p style="font-size:12px;color:#777">Test accounts are listed in the lab README (e.g. alice@hexahr.local / Alice@123).</p></div>`);
}
async function handleLogin(req, res) {
  const body = await parseBody(req);
  attempt('Login & Authentication');
  const email = String(body.email || '');
  const password = String(body.password || '');
  if (INJ_RE.test(email) || INJ_RE.test(password)) {
    // VULN(sqli-login): the legacy string-built query returns the first row.
    const admin = people[0];
    pass('sqli-login');
    return redirect(res, '/dashboard', sessionCookie(admin));
  }
  const user = personByEmail(email);
  if (!user) return sendHtml(res, 200, loginPage(req, 'No account found for that email.'));
  if (user.status === 'deactivated') return sendHtml(res, 200, loginPage(req, 'This account has been deactivated.'));
  if (user.password !== password) {
    loginFails[user.email] = (loginFails[user.email] || 0) + 1;
    if (loginFails[user.email] >= 10) pass('brute-force'); // VULN(brute-force): nothing ever throttles this
    return sendHtml(res, 200, loginPage(req, 'Incorrect password. Please try again.'));
  }
  if (user.defaultCreds) pass('default-creds'); // VULN(default-creds): issued password never changed
  return redirect(res, '/dashboard', sessionCookie(user));
}
function forgotPage(req, msg, isErr) {
  return layout(req, 'Forgot Password', `<div class="card" style="max-width:460px;margin:30px auto">
    <h2 style="margin-top:0">Reset your password</h2>
    ${msg ? `<div class="${isErr ? 'err' : 'ok'}">${esc(msg)}</div>` : ''}
    <form method="POST" action="/forgot">
      <label>Email<br><input name="email" style="width:94%" autocomplete="off"></label><br><br>
      <button type="submit">Email me a reset token</button>
    </form>
    <p style="font-size:13px">Already have a token? <a href="/reset">Enter it here</a>.</p></div>`);
}
async function handleForgot(req, res) {
  const body = await parseBody(req);
  attempt('Login & Authentication');
  const email = String(body.email || '');
  const user = personByEmail(email);
  const ip = req.socket.remoteAddress || 'local';
  forgotSeen[ip] = forgotSeen[ip] || { existing: false, missing: false };
  if (user) {
    forgotSeen[ip].existing = true;
    if (forgotSeen[ip].missing) pass('user-enumeration');
    // VULN(user-enumeration): response confirms the account exists.
    return sendHtml(res, 200, forgotPage(req, `Reset token sent to ${email}. Check your inbox.`));
  }
  forgotSeen[ip].missing = true;
  if (forgotSeen[ip].existing) pass('user-enumeration');
  return sendHtml(res, 200, forgotPage(req, 'No account with that email exists.', true));
}
function resetPage(req, msg, isErr) {
  return layout(req, 'Enter Reset Token', `<div class="card" style="max-width:460px;margin:30px auto">
    <h2 style="margin-top:0">Set a new password</h2>
    ${msg ? `<div class="${isErr ? 'err' : 'ok'}">${esc(msg)}</div>` : ''}
    <form method="POST" action="/reset">
      <label>Email<br><input name="email" style="width:94%" autocomplete="off"></label><br>
      <label>Reset token<br><input name="token" style="width:94%" autocomplete="off"></label><br>
      <label>New password<br><input name="newpassword" type="password" style="width:94%"></label><br><br>
      <button type="submit">Change password</button>
    </form></div>`);
}
async function handleReset(req, res) {
  const body = await parseBody(req);
  attempt('Login & Authentication');
  const user = personByEmail(String(body.email || ''));
  if (user && String(body.token || '') === tokenFor(user.email)) {
    // VULN(reset-token): token is just md5(email)[0:10] — computable by anyone.
    user.password = String(body.newpassword || '');
    pass('reset-token');
    return sendHtml(res, 200, resetPage(req, 'Password changed. You can now sign in with the new password.'));
  }
  return sendHtml(res, 200, resetPage(req, 'That token is not valid for this account.', true));
}

/* ---------- Dashboard ---------- */
function handleDashboard(req, res) {
  const sess = requireLogin(req, res); if (!sess) return;
  pass('missing-headers'); // VULN(missing-headers): no security headers are ever set
  const me = person(sess.uid);
  const myLeaves = leaves.filter(l => l.empId === sess.uid);
  sendHtml(res, 200, layout(req, 'Dashboard', `
    <div class="card"><h2 style="margin-top:0">Welcome, ${esc(me.name)}</h2>
    <p>${esc(me.title)} · ${esc(me.dept)} · Role: ${esc(me.role)}</p>
    <p><a class="btn" href="/payroll/${me.id}">My payslip</a> <a class="btn" href="/leave">My leave</a> <a class="btn" href="/employees/${me.id}">My record</a></p></div>
    <div class="card"><h3 style="margin-top:0">My leave requests</h3>
    ${myLeaves.length ? `<table><tr><th>Type</th><th>Days</th><th>Status</th></tr>${myLeaves.map(l => `<tr><td>${esc(l.type)}</td><td>${l.days}</td><td>${esc(l.status)}</td></tr>`).join('')}</table>` : '<p>No leave requests yet.</p>'}
    </div>
    <div class="card"><h3 style="margin-top:0">Company</h3><p>${people.filter(p => p.status === 'active').length} active employees across ${DEPARTMENTS.length} departments: ${DEPARTMENTS.join(', ')}.</p></div>`));
}

/* ---------- Employee Directory & Search ---------- */
function handleEmployees(req, res, q) {
  const sess = requireLogin(req, res); if (!sess) return;
  attempt('Employee Directory & Search');
  const query = String(q.get('q') || '');
  let results = people.filter(p => p.status === 'active');
  if (query) {
    if (INJ_RE.test(query)) {
      // VULN(search-sqli): injected condition makes the filter always true — hidden rows included.
      results = people.slice();
      pass('search-sqli');
    } else {
      const needle = query.toLowerCase();
      results = results.filter(p => p.name.toLowerCase().includes(needle) || p.dept.toLowerCase().includes(needle) || p.title.toLowerCase().includes(needle));
    }
    // VULN(reflected-xss): the query is echoed into the page unescaped (below).
    if (XSS_RE.test(query)) pass('reflected-xss');
  }
  const rows = results.map(p => `<tr><td>${p.id}</td><td>${p.name}</td><td>${esc(p.title)}</td><td>${esc(p.dept)}</td><td><a href="/employees/${p.id}">View record</a></td></tr>`).join('');
  sendHtml(res, 200, layout(req, 'Employee Directory', `
    <form method="GET" action="/employees"><input name="q" value="${esc(query)}" placeholder="Search name, title, department…" size="42"> <button type="submit">Search</button></form>
    ${query ? `<p>Results for: ${query}</p>` : ''}
    <table><tr><th>ID</th><th>Name</th><th>Title</th><th>Department</th><th></th></tr>${rows}</table>`));
}
function handleEmployeeDetail(req, res, id) {
  const sess = requireLogin(req, res); if (!sess) return;
  attempt('Employee Directory & Search');
  const target = person(id);
  if (!target) return sendHtml(res, 404, layout(req, 'Not Found', '<div class="card">No such employee.</div>'));
  const me = person(sess.uid);
  // VULN(record-idor): private fields served to any employee, no ownership check.
  if (me.role === 'employee' && target.id !== sess.uid) pass('record-idor');
  sendHtml(res, 200, layout(req, `Employee — ${esc(target.name)}`, `<div class="card">
    <h2 style="margin-top:0">${target.name}</h2>
    <table>
      <tr><th>Title</th><td>${esc(target.title)}</td></tr>
      <tr><th>Department</th><td>${esc(target.dept)}</td></tr>
      <tr><th>Email</th><td>${esc(target.email)}</td></tr>
      <tr><th>Phone</th><td>${esc(target.phone)}</td></tr>
      <tr><th>Home address</th><td>${esc(target.address)}</td></tr>
      <tr><th>Date of birth</th><td>${esc(target.dob)}</td></tr>
      <tr><th>Status</th><td>${esc(target.status)}</td></tr>
    </table>
    <p><a class="btn" href="/payroll/${target.id}">View payslip</a></p></div>`));
}

/* ---------- Payroll ---------- */
function payrollCard(emp) {
  const p = payrollFor(emp);
  return `<div class="card"><h2 style="margin-top:0">Payslip — ${esc(emp.name)} (${p.month})</h2>
    <table>
      <tr><th>Base salary (monthly)</th><td>$${p.base.toLocaleString()}</td></tr>
      <tr><th>Bonus</th><td>$${p.bonus.toLocaleString()}</td></tr>
      <tr><th>Deductions</th><td>−$${p.deductions.toLocaleString()}</td></tr>
      <tr><th>Net pay</th><td><strong>$${p.net.toLocaleString()}</strong></td></tr>
      <tr><th>Annual salary</th><td>$${emp.salary.toLocaleString()}</td></tr>
      <tr><th>Paid to bank account</th><td>${esc(emp.bank)}</td></tr>
    </table></div>`;
}
function handlePayrollRecord(req, res, id) {
  const sess = requireLogin(req, res); if (!sess) return;
  attempt('Payroll');
  const target = person(id);
  if (!target) return sendHtml(res, 404, layout(req, 'Not Found', '<div class="card">No such employee.</div>'));
  const me = person(sess.uid);
  // VULN(payroll-idor): any employee can open any colleague's payslip.
  if (me.role === 'employee' && target.id !== sess.uid) pass('payroll-idor');
  sendHtml(res, 200, layout(req, 'Payroll', payrollCard(target)));
}
function handlePayrollDept(req, res, dept) {
  const sess = requireLogin(req, res); if (!sess) return;
  attempt('Payroll');
  detectCookieTamper(req, sess);
  if (sess.role !== 'manager' && sess.role !== 'hradmin') {
    return sendHtml(res, 403, layout(req, 'Payroll', '<div class="card">Department payroll is for managers and HR admin.</div>'));
  }
  const me = person(sess.uid);
  // VULN(payroll-cross-dept): the manager's own department is never checked.
  if (me.role === 'manager' && me.dept !== dept) pass('payroll-cross-dept');
  const rows = people.filter(p => p.dept === dept && p.status !== 'terminated')
    .map(p => { const pay = payrollFor(p); return `<tr><td>${p.name}</td><td>${esc(p.title)}</td><td>$${p.salary.toLocaleString()}</td><td>$${pay.net.toLocaleString()}</td><td>${esc(p.bank)}</td></tr>`; }).join('');
  sendHtml(res, 200, layout(req, `Payroll — ${esc(dept)}`, `<table><tr><th>Employee</th><th>Title</th><th>Annual salary</th><th>Net (monthly)</th><th>Bank</th></tr>${rows}</table>`));
}

/* ---------- Leave Management ---------- */
function leaveRow(l) {
  const owner = person(l.empId);
  return `<tr><td>${l.id}</td><td>${esc(owner ? owner.name : '?')}</td><td>${esc(l.type)}</td><td>${l.days}</td><td>${esc(l.status)}</td><td><a href="/leave/${l.id}">Details</a></td></tr>`;
}
function handleLeaveList(req, res) {
  const sess = requireLogin(req, res); if (!sess) return;
  attempt('Leave Management');
  const me = person(sess.uid);
  let visible = leaves.filter(l => l.empId === sess.uid);
  if (me.role === 'hradmin') visible = leaves.slice();
  else if (me.role === 'manager') visible = leaves.filter(l => { const o = person(l.empId); return o && o.dept === me.dept; });
  sendHtml(res, 200, layout(req, 'Leave', `
    <div class="card"><h3 style="margin-top:0">Request leave</h3>
    <form method="POST" action="/leave"><input type="hidden" name="hx_origin" value="${markerFor(sess)}">
      <label>Type <select name="type"><option>Annual leave</option><option>Sick leave</option><option>Unpaid leave</option></select></label>
      <label>Days <input name="days" type="number" value="1" min="1" style="width:70px"></label>
      <label>Reason <input name="reason" size="34"></label> <button type="submit">Submit request</button></form></div>
    <table><tr><th>ID</th><th>Employee</th><th>Type</th><th>Days</th><th>Status</th><th></th></tr>${visible.map(leaveRow).join('')}</table>`));
}
async function handleLeaveCreate(req, res) {
  const sess = requireLogin(req, res); if (!sess) return;
  const body = await parseBody(req);
  attempt('Leave Management');
  leaves.push({ id: nextLeaveId++, empId: sess.uid, type: String(body.type || 'Annual leave'), days: Math.max(1, parseInt(body.days, 10) || 1), reason: String(body.reason || ''), status: 'pending', approverId: null });
  redirect(res, '/leave');
}
function handleLeaveDetail(req, res, id) {
  const sess = requireLogin(req, res); if (!sess) return;
  attempt('Leave Management');
  const lv = leaves.find(l => l.id === Number(id));
  if (!lv) return sendHtml(res, 404, layout(req, 'Not Found', '<div class="card">No such leave request.</div>'));
  const me = person(sess.uid);
  // VULN(leave-idor): any employee can read any request, incl. private reasons.
  if (me.role === 'employee' && lv.empId !== sess.uid) pass('leave-idor');
  const owner = person(lv.empId);
  const approver = lv.approverId ? person(lv.approverId) : null;
  sendHtml(res, 200, layout(req, `Leave Request #${lv.id}`, `<div class="card">
    <table>
      <tr><th>Employee</th><td>${esc(owner ? owner.name : '?')} (${esc(owner ? owner.dept : '')})</td></tr>
      <tr><th>Type</th><td>${esc(lv.type)}</td></tr>
      <tr><th>Days</th><td>${lv.days}</td></tr>
      <tr><th>Reason</th><td>${esc(lv.reason)}</td></tr>
      <tr><th>Status</th><td>${esc(lv.status)}</td></tr>
      <tr><th>Approver</th><td>${approver ? esc(approver.name) : '—'}</td></tr>
    </table>
    ${lv.status === 'pending' ? `<form method="POST" action="/leave/${lv.id}/approve" style="display:inline"><input type="hidden" name="hx_origin" value="${markerFor(sess)}"><button type="submit">Approve</button></form>
    <form method="POST" action="/leave/${lv.id}/reject" style="display:inline"><input type="hidden" name="hx_origin" value="${markerFor(sess)}"><button type="submit">Reject</button></form>` : ''}
    </div>`));
}
async function handleLeaveDecide(req, res, id, decision) {
  const sess = requireLogin(req, res); if (!sess) return;
  await parseBody(req);
  attempt('Leave Management');
  const lv = leaves.find(l => l.id === Number(id));
  if (lv && lv.status === 'pending') {
    lv.status = decision;
    lv.approverId = sess.uid;
    if (decision === 'approved') {
      // VULN: no separation of duties, no department check on approvals.
      if (sess.uid === lv.empId) pass('leave-self-approve');
      else if (person(sess.uid).role !== 'hradmin') pass('leave-cross-dept');
    }
  }
  redirect(res, `/leave/${id}`);
}

/* ---------- Profile & Account ---------- */
function handleProfile(req, res) {
  const sess = requireLogin(req, res); if (!sess) return;
  const me = person(sess.uid);
  sendHtml(res, 200, layout(req, 'My Profile', `
    <div class="card"><h3 style="margin-top:0">Profile details</h3>
    <form method="POST" action="/profile"><input type="hidden" name="hx_origin" value="${markerFor(sess)}">
      <label>Display name<br><input name="name" value="${esc(me.name)}" size="42"></label><br>
      <label>Phone<br><input name="phone" value="${esc(me.phone)}" size="42"></label><br>
      <label>Home address<br><input name="address" value="${esc(me.address)}" size="42"></label><br><br>
      <button type="submit">Save profile</button></form>
    <p style="font-size:12px;color:#777">Department: ${esc(me.dept)} · Title: ${esc(me.title)} · Recorded salary: $${me.salary.toLocaleString()} (HR-managed)</p></div>
    <div class="card"><h3 style="margin-top:0">Change password</h3>
    <form method="POST" action="/profile/password"><input type="hidden" name="hx_origin" value="${markerFor(sess)}">
      <label>New password<br><input name="newpassword" type="password" size="32"></label> <button type="submit">Change password</button></form></div>
    <div class="card"><h3 style="margin-top:0">Upload a document / avatar</h3>
    <form method="POST" action="/profile/avatar"><input type="hidden" name="hx_origin" value="${markerFor(sess)}">
      <label>Filename<br><input name="filename" placeholder="avatar.png" size="32"></label><br>
      <label>Content<br><textarea name="content" rows="3" cols="44"></textarea></label><br>
      <button type="submit">Upload</button></form>
    <p style="font-size:12px;color:#777">Uploaded files are served under /uploads/&lt;filename&gt;.</p></div>`));
}
async function handleProfileUpdate(req, res) {
  const sess = requireLogin(req, res); if (!sess) return;
  const body = await parseBody(req);
  attempt('Profile & Account');
  const me = person(sess.uid);
  if (body.name) me.name = String(body.name);
  if (body.phone) me.phone = String(body.phone);
  if (body.address) me.address = String(body.address);
  let mass = false;
  // VULN(mass-assignment): privileged fields in the body are bound to the record too.
  if (body.salary !== undefined && body.salary !== '') { me.salary = Number(body.salary) || me.salary; mass = true; }
  if (body.role) { me.role = String(body.role); mass = true; }
  if (body.dept) { me.dept = String(body.dept); mass = true; }
  if (mass) pass('mass-assignment');
  // VULN(stored-xss): the display name is stored and later rendered unescaped.
  if (body.name && XSS_RE.test(String(body.name))) pass('stored-xss');
  // VULN(csrf-profile): no token check — a cross-site / marker-less POST succeeds.
  if (csrfSuspect(req, body, sess)) pass('csrf-profile');
  redirect(res, '/profile');
}
async function handlePasswordChange(req, res) {
  const sess = requireLogin(req, res); if (!sess) return;
  const body = await parseBody(req);
  attempt('Profile & Account');
  const me = person(sess.uid);
  const np = String(body.newpassword || '');
  // VULN(weak-password): no length or complexity policy at all.
  if (np.length > 0 && np.length < 8) pass('weak-password');
  if (np) me.password = np;
  redirect(res, '/profile');
}
async function handleAvatarUpload(req, res) {
  const sess = requireLogin(req, res); if (!sess) return;
  const body = await parseBody(req);
  attempt('Files & Documents');
  const name = String(body.filename || '').split('/').pop();
  if (name) uploads[name] = { content: String(body.content || ''), ext: (name.split('.').pop() || '').toLowerCase() };
  redirect(res, '/profile');
}
function handleUploadServe(req, res, name) {
  const f = uploads[name];
  if (!f) return sendHtml(res, 404, layout(req, 'Not Found', '<div class="card">No such uploaded file.</div>'));
  // VULN(upload-unrestricted): user HTML/SVG is served as an active page from this origin.
  if (f.ext === 'html' || f.ext === 'htm') { pass('upload-unrestricted'); res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(f.content); }
  if (f.ext === 'svg') { pass('upload-unrestricted'); res.writeHead(200, { 'Content-Type': 'image/svg+xml' }); return res.end(f.content); }
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(f.content);
}

/* ---------- Files & Documents ---------- */
function handleDocument(req, res, q) {
  const sess = requireLogin(req, res); if (!sess) return;
  attempt('Files & Documents');
  const name = String(q.get('name') || 'handbook.txt');
  // VULN(download-traversal): the requested name is joined onto the docs path unsanitised.
  const target = path.join(DIR, 'docs', name);
  let content = null;
  try { content = fs.readFileSync(target, 'utf8'); } catch (e) { content = null; }
  if (content !== null && name.includes('..')) pass('download-traversal');
  if (content === null) return sendHtml(res, 404, layout(req, 'Document', '<div class="card">Document not found.</div>'));
  sendHtml(res, 200, layout(req, `Document — ${esc(name)}`, `<div class="card"><pre style="white-space:pre-wrap">${esc(content.slice(0, 5000))}</pre></div>`));
}

/* ---------- API & Data Exposure ---------- */
function handleApiEmployees(req, res) {
  attempt('API & Data Exposure');
  if (req.headers['x-api-key'] !== API_KEY) return sendJson(res, 401, { error: 'invalid or missing X-API-Key' });
  // VULN(api-weak-token): the only key is a guessable word printed in the API docs.
  pass('api-weak-token');
  sendJson(res, 200, people.filter(p => p.status === 'active').map(p => ({ id: p.id, name: p.name, email: p.email, dept: p.dept, title: p.title, salary: p.salary })));
}
function handleApiExport(req, res) {
  attempt('API & Data Exposure');
  // VULN(api-export-unauth): no authentication or authorization on the bulk export at all.
  pass('api-export-unauth');
  sendJson(res, 200, people.map(p => ({ id: p.id, name: p.name, email: p.email, dept: p.dept, title: p.title, role: p.role, salary: p.salary, bank: p.bank, phone: p.phone, address: p.address, dob: p.dob, status: p.status })));
}
function handleApiDocs(req, res) {
  const sess = requireLogin(req, res); if (!sess) return;
  sendHtml(res, 200, layout(req, 'API Docs', `<div class="card">
    <h3 style="margin-top:0">HexaHR API (v1)</h3>
    <p><code>GET /api/employees</code> — list employees. Requires header <code>X-API-Key</code>.</p>
    <p><code>GET /api/export</code> — full data export for integrations.</p>
    <p style="font-size:12px;color:#777">Integration partners: see the page source for a working example header.</p>
    <!-- Integration example: curl -H "X-API-Key: hexahr123" http://127.0.0.1:${PORT}/api/employees  (TODO: rotate this key before launch!) -->
    </div>`));
}

/* ---------- Admin Panel ---------- */
function handleAdmin(req, res) {
  const sess = requireLogin(req, res); if (!sess) return;
  attempt('Admin Panel');
  detectCookieTamper(req, sess);
  if (sess.role !== 'hradmin') return sendHtml(res, 403, layout(req, 'Admin', '<div class="card">HR admin only.</div>'));
  const rows = people.map(p => `<tr><td>${p.id}</td><td>${p.name}</td><td>${esc(p.email)}</td><td>${esc(p.role)}</td><td>${esc(p.status)}</td>
    <td>${p.status === 'active' ? `<form method="POST" action="/admin/deactivate"><input type="hidden" name="hx_origin" value="${markerFor(sess)}"><input type="hidden" name="id" value="${p.id}"><button type="submit">Deactivate</button></form>` : ''}</td></tr>`).join('');
  sendHtml(res, 200, layout(req, 'HR Admin Panel', `<table><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr>${rows}</table>`));
}
async function handleAdminDeactivate(req, res) {
  const sess = requireLogin(req, res); if (!sess) return;
  const body = await parseBody(req);
  attempt('Admin Panel');
  if (sess.role !== 'hradmin') return sendHtml(res, 403, layout(req, 'Admin', '<div class="card">HR admin only.</div>'));
  const target = person(body.id);
  // VULN(admin-csrf): destructive admin action with no CSRF token verification.
  if (target && csrfSuspect(req, body, sess)) pass('admin-csrf');
  if (target) target.status = 'deactivated';
  redirect(res, '/admin');
}

/* ---------- Lab system pages ---------- */
function handleTests(req, res, q) {
  const sess = requireLogin(req, res); if (!sess) return;
  const s = progressSummary();
  const show = String(q.get('show') || '');
  let html = `<p>Every test completes by <strong>doing</strong> — the server detects the exploit succeeding. Hints reveal one at a time. The Lab Coach gives step-by-step help for a feature after you have tried it at least 3 times.</p>`;
  for (const f of FEATURES) {
    html += `<div class="card"><h3 style="margin-top:0">${esc(f)} <span style="font-size:12px;color:#666">(${s.features[f].done}/${s.features[f].total} done · ${s.features[f].attempts} attempt(s))</span></h3>`;
    for (const t of TESTS.filter(x => x.feature === f)) {
      const done = progress.tests[t.id];
      let hintsHtml = '';
      const m = show.match(new RegExp('^' + t.id.replace(/-/g, '\\-') + '\\.(\\d)$'));
      const lvl = m ? Number(m[1]) : 0;
      if (lvl > 0) hintsHtml = '<ol>' + t.hints.slice(0, lvl).map(h => `<li>${esc(h)}</li>`).join('') + '</ol>';
      const nextLvl = lvl + 1;
      html += `<div style="border-top:1px solid #eee;padding:8px 0"><strong>${done ? '✓' : '○'} ${esc(t.name)}</strong>
        <span style="font-size:12px;color:#666">${esc(t.owasp)} · ${esc(t.difficulty)}</span>
        ${done ? '' : (lvl < 3 ? ` <a href="/tests?show=${t.id}.${nextLvl}">Reveal hint ${nextLvl}</a>` : '')}
        ${hintsHtml}</div>`;
    }
    html += '</div>';
  }
  sendHtml(res, 200, layout(req, '🎯 Mission — Security Tests', html));
}
function handleComplete(req, res) {
  const sess = requireLogin(req, res); if (!sess) return;
  const s = progressSummary();
  if (!s.complete) {
    const left = TESTS.filter(t => !progress.tests[t.id]);
    return sendHtml(res, 200, layout(req, '🏆 Completion', `<div class="card"><p>You are at <strong>${s.pct}%</strong> (${s.done}/${s.total}). The completion summary, key and certificate unlock at 100%.</p>
      <p>Still open:</p><ul>${left.map(t => `<li>${esc(t.name)} — ${esc(t.feature)}</li>`).join('')}</ul></div>`));
  }
  const perFeature = FEATURES.map(f => `<li><strong>${esc(f)}</strong> — ${s.features[f].total} vulnerabilities</li>`).join('');
  const ways = TESTS.map(t => `<li>${esc(t.name)} (${esc(t.owasp)})</li>`).join('');
  const learned = TESTS.map(t => `<li><strong>${esc(t.name)}:</strong> ${esc(t.lesson)}</li>`).join('');
  const client = TESTS.map(t => `<li><strong>${esc(t.name)}:</strong> ${esc(t.impact)}</li>`).join('');
  const report = TESTS.map(t => `<li><strong>${esc(t.report.title)}</strong> — Severity: ${esc(t.report.severity)}. Remediation: ${esc(t.report.remediation)}</li>`).join('');
  sendHtml(res, 200, layout(req, '🏆 Lab Complete!', `
    <div class="card"><h2 style="margin-top:0">🎉 You completed LAB ${LAB_NUMBER} — ${LAB_NAME}: ${s.total}/${s.total} tests (100%)</h2>
    <h3>1) What this lab contains</h3><p>${FEATURES.length} features, ${s.total} scored vulnerabilities:</p><ul>${perFeature}</ul>
    <h3>2) How the testing was done — ${s.total} techniques</h3><ul>${ways}</ul>
    <h3>3) What you learned</h3><ul>${learned}</ul>
    <h3>4) What this means for a real client</h3><ul>${client}</ul>
    <h3>5) Writing it in a real report</h3><ul>${report}</ul>
    <h3>6) Your completion key</h3>
    <p>Paste this key into Lab ${LAB_NUMBER + 1} to unlock it:</p>
    <p style="font-size:20px;background:#14141d;color:#7dff9a;padding:12px;border-radius:8px;text-align:center;letter-spacing:1px"><strong>${completionKey()}</strong></p>
    <form method="POST" action="/complete"><label>Your name for the certificate<br><input name="testerName" value="${esc(progress.testerName)}" size="34"></label> <button type="submit">Save name</button></form>
    <p><a class="btn" href="/certificate">🎓 View your certificate</a></p></div>`));
}
async function handleCompleteName(req, res) {
  const sess = requireLogin(req, res); if (!sess) return;
  const body = await parseBody(req);
  if (body.testerName) { progress.testerName = String(body.testerName).slice(0, 60); saveProgress(); }
  redirect(res, '/complete');
}
function handleCertificate(req, res) {
  const sess = getSession(req);
  const s = progressSummary();
  if (!s.complete) return redirect(res, '/complete');
  const name = progress.testerName || (sess ? sess.name : '') || 'Lab Tester';
  const date = progress.completedAt ? new Date(progress.completedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  sendHtml(res, 200, `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER} ${LAB_NAME}</title>
  <style>body{font-family:Georgia,serif;background:#e9e9f2;margin:0;padding:40px}.cert{max-width:760px;margin:0 auto;background:#fff;border:6px double #5b3df0;border-radius:14px;padding:44px;text-align:center}h1{font-size:30px;margin:10px 0}p{font-size:16px}.name{font-size:26px;font-weight:bold;margin:14px 0}@media print{body{background:#fff;padding:0}button{display:none}}</style></head>
  <body><div class="cert"><img src="/logo.png" style="height:74px">
  <h1>Certificate of Completion</h1>
  <p>This certifies that</p><div class="name">${esc(name)}</div>
  <p>has completed 100% of the security tests in<br><strong>LAB ${LAB_NUMBER} — ${LAB_NAME}</strong><br>(${s.total} tests across ${FEATURES.length} features)</p>
  <p>Completed on ${date}</p>
  <p style="margin-top:26px;font-size:14px;color:#444">HexaCyberLab — Built by Md. Jony Hassain, Founder</p>
  <button onclick="window.print()">🖨 Print</button></div></body></html>`);
}

/* ---------- Router ---------- */
loadProgress();
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://127.0.0.1');
    const pathname = u.pathname;
    const method = req.method;

    if (pathname === '/logo.png') {
      try { const img = fs.readFileSync(path.join(DIR, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(img); }
      catch (e) { return sendHtml(res, 404, 'logo missing'); }
    }
    if (pathname === '/unlock' && method === 'POST') {
      const body = await parseBody(req);
      if (String(body.key || '') === entryKey()) {
        progress.unlocked = true; saveProgress();
        return redirect(res, '/');
      }
      return sendHtml(res, 403, gatePage(true));
    }
    if (!progress.unlocked) {
      if (pathname === '/api/chat' && method === 'POST') {
        const body = await parseBody(req);
        return sendJson(res, 200, { reply: chatReply(body.message) });
      }
      if (pathname === '/api/progress') return sendJson(res, 403, { locked: true });
      return sendHtml(res, 200, gatePage(false));
    }

    if (pathname === '/api/progress') return sendJson(res, 200, progressSummary());
    if (pathname === '/api/chat' && method === 'POST') { const body = await parseBody(req); return sendJson(res, 200, { reply: chatReply(body.message) }); }
    if (pathname === '/api/employees' && method === 'GET') return handleApiEmployees(req, res);
    if (pathname === '/api/export' && method === 'GET') return handleApiExport(req, res);

    if (pathname === '/' ) return redirect(res, getSession(req) ? '/dashboard' : '/login');
    if (pathname === '/login' && method === 'GET') return sendHtml(res, 200, loginPage(req, ''));
    if (pathname === '/login' && method === 'POST') return handleLogin(req, res);
    if (pathname === '/logout') return redirect(res, '/login', 'hxh_session=; Path=/; Max-Age=0');
    if (pathname === '/forgot' && method === 'GET') return sendHtml(res, 200, forgotPage(req, '', false));
    if (pathname === '/forgot' && method === 'POST') return handleForgot(req, res);
    if (pathname === '/reset' && method === 'GET') return sendHtml(res, 200, resetPage(req, '', false));
    if (pathname === '/reset' && method === 'POST') return handleReset(req, res);
    if (pathname === '/dashboard') return handleDashboard(req, res);
    if (pathname === '/employees') return handleEmployees(req, res, u.searchParams);
    let m;
    if ((m = pathname.match(/^\/employees\/(\d+)$/))) return handleEmployeeDetail(req, res, m[1]);
    if (pathname === '/payroll') { const sess = getSession(req); if (!sess) return redirect(res, '/login'); return redirect(res, `/payroll/${sess.uid}`); }
    if ((m = pathname.match(/^\/payroll\/department\/(.+)$/))) return handlePayrollDept(req, res, decodeURIComponent(m[1]));
    if ((m = pathname.match(/^\/payroll\/(\d+)$/))) return handlePayrollRecord(req, res, m[1]);
    if (pathname === '/leave' && method === 'GET') return handleLeaveList(req, res);
    if (pathname === '/leave' && method === 'POST') return handleLeaveCreate(req, res);
    if ((m = pathname.match(/^\/leave\/(\d+)$/))) return handleLeaveDetail(req, res, m[1]);
    if ((m = pathname.match(/^\/leave\/(\d+)\/approve$/)) && method === 'POST') return handleLeaveDecide(req, res, m[1], 'approved');
    if ((m = pathname.match(/^\/leave\/(\d+)\/reject$/)) && method === 'POST') return handleLeaveDecide(req, res, m[1], 'rejected');
    if (pathname === '/profile' && method === 'GET') return handleProfile(req, res);
    if (pathname === '/profile' && method === 'POST') return handleProfileUpdate(req, res);
    if (pathname === '/profile/password' && method === 'POST') return handlePasswordChange(req, res);
    if (pathname === '/profile/avatar' && method === 'POST') return handleAvatarUpload(req, res);
    if ((m = pathname.match(/^\/uploads\/(.+)$/))) return handleUploadServe(req, res, decodeURIComponent(m[1]));
    if (pathname === '/documents') return handleDocument(req, res, u.searchParams);
    if (pathname === '/api-docs') return handleApiDocs(req, res);
    if (pathname === '/admin' && method === 'GET') return handleAdmin(req, res);
    if (pathname === '/admin/deactivate' && method === 'POST') return handleAdminDeactivate(req, res);
    if (pathname === '/tests') return handleTests(req, res, u.searchParams);
    if (pathname === '/complete' && method === 'GET') return handleComplete(req, res);
    if (pathname === '/complete' && method === 'POST') return handleCompleteName(req, res);
    if (pathname === '/certificate') return handleCertificate(req, res);

    return sendHtml(res, 404, layout(req, 'Not Found', '<div class="card">Page not found. Try the <a href="/dashboard">dashboard</a>.</div>'));
  } catch (e) {
    try { sendHtml(res, 500, 'Server error — the lab is still running.'); } catch (err) { /* socket already gone */ }
  }
});
server.listen(PORT, '127.0.0.1', () => {
  console.log(`HexaHR (LAB ${LAB_NUMBER}) running at http://127.0.0.1:${PORT}  (LOCAL ONLY — deliberately vulnerable lab)`);
  console.log('Test accounts: hana@hexahr.local/HrBoss#2024 (HR admin), miguel@hexahr.local/Manager@123 (manager), alice@hexahr.local/Alice@123 (employee)');
});
