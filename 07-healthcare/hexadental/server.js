'use strict';
/*
 * HexaDental — LAB 65 of the HexaCyberLab 110-lab programme.
 * Category 7: Healthcare & Wellness.
 * A deliberately vulnerable dental clinic platform for local, authorised
 * security training. Zero-dependency Node.js, in-memory seed data,
 * binds 127.0.0.1 only. ALL patients and data are invented.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3074;
const LAB_NUMBER = 65;
const LAB_NAME = 'HexaDental';
const ROOT = __dirname;
const RECORDS_DIR = path.join(ROOT, 'records');

// --- key material, shard set alpha (see assembler far below; never literal) ---
const _ka = ['TC1YSA==', 'OC01Ng==', 'TlpWMQ=='];

/* ============================ seed data (all fake) ============================ */
const CATALOG = [
  { name: 'Cleaning & Polish', price: 60 },
  { name: 'Filling', price: 120 },
  { name: 'Extraction', price: 150 },
  { name: 'Whitening', price: 300 },
  { name: 'Crown', price: 450 },
  { name: 'Root Canal', price: 650 },
  { name: 'Implant', price: 1800 },
  { name: 'Braces Consult', price: 80 }
];

const users = [
  { id: 1, email: 'admin@hexadental.local', password: 'admin123', name: 'Clinic Admin', role: 'admin' },
  { id: 2, email: 'dr.rahman@hexadental.local', password: 'Rahman#2024', name: 'Dr. Rahman', role: 'dentist' },
  { id: 3, email: 'sara@hexadental.local', password: 'Sara#2024', name: 'Sara Khan', role: 'hygienist' },
  { id: 4, email: 'alice@test.local', password: 'alice123', name: 'Alice Karim', role: 'patient' },
  { id: 5, email: 'bob@test.local', password: 'bob123', name: 'Bob Hossain', role: 'patient' }
];
let nextUserId = 6;

const appointments = [
  { id: 1, patientId: 4, dentistId: 2, date: '2026-11-02', time: '10:00', reason: 'Root canal review', status: 'booked' },
  { id: 2, patientId: 5, dentistId: 2, date: '2026-11-02', time: '11:00', reason: 'Filling check', status: 'booked' },
  { id: 3, patientId: 4, dentistId: 3, date: '2026-11-05', time: '09:30', reason: 'Cleaning', status: 'booked' }
];
let nextApptId = 4;

const plans = [
  { id: 1, patientId: 4, dentistId: 2, title: 'Root canal + crown', status: 'proposed',
    items: [ { name: 'Root Canal', price: 650 }, { name: 'Crown', price: 450 } ] },
  { id: 2, patientId: 5, dentistId: 2, title: 'Braces assessment', status: 'draft',
    items: [ { name: 'Braces Consult', price: 80 } ] }
];
let nextPlanId = 3;

const records = [
  { id: 1, patientId: 4, name: 'Panoramic X-ray', file: 'xray-alice-1.txt', date: '2026-10-12' },
  { id: 2, patientId: 5, name: 'Bitewing X-ray', file: 'xray-bob-1.txt', date: '2026-10-15' },
  { id: 3, patientId: 4, name: 'Clinical notes — cleaning visit', file: 'notes-alice-1.txt', date: '2026-10-12' }
];
let nextRecordId = 4;

const invoices = [
  { id: 1, patientId: 4, planId: 1, total: 1100, paid: 0, status: 'unpaid' },
  { id: 2, patientId: 5, planId: 2, total: 80, paid: 80, status: 'paid' }
];
let nextInvoiceId = 3;

const paymentPlans = [
  { id: 1, patientId: 5, invoiceId: 2, months: 3, apr: 5, status: 'active' }
];
let nextPPId = 2;

const sessions = new Map(); // sid -> userId
const issuedResetTokens = new Set();
const failedLogins = {};    // email -> count
const probedEmails = new Set();

function userById(id) { return users.find(u => u.id === id); }
function userByEmail(email) { return users.find(u => u.email === String(email || '').toLowerCase()); }
function planTotal(plan) { return plan.items.reduce((s, i) => s + Number(i.price || 0), 0); }

/* ============================ TESTS registry ============================ */
const F_AUTH = 'Login & Authentication';
const F_REG = 'Registration & Profile';
const F_APPT = 'Appointments';
const F_PLAN = 'Treatment Plans';
const F_REC = 'Records & X-rays';
const F_INV = 'Invoices & Payment Plans';
const F_ADMIN = 'Admin Panel';
const F_API = 'Platform & API';

const TESTS = [
  /* ---- Login & Authentication ---- */
  { id: 'auth-sqli', feature: F_AUTH, name: 'SQL injection login bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login form builds its lookup from your raw input — what happens with a quote in the email?',
            'Try a classic tautology payload in the email field, with any password.',
            "Use alice' OR '1'='1 as the email and any password — you should land in an account that is not yours."],
    lesson: 'String-built queries let an attacker rewrite the login logic itself; parameterised queries make input data, never code.',
    impact: 'On a real clinic site this hands an attacker the first account in the database — usually an admin — and with it every patient record the clinic holds.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere and validate input server-side.' } },
  { id: 'auth-brute', feature: F_AUTH, name: 'Brute force — no rate limit or lockout', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Pick one account and keep guessing its password.',
            'Nothing slows you down — no CAPTCHA, no delay, no lockout after many failures.',
            'Send at least 10 wrong passwords for bob@test.local in a row; every one is processed at full speed.'],
    lesson: 'Without throttling, lockout or MFA, a login form is an unlimited password-guessing machine.',
    impact: 'Attackers run password lists against patient and staff accounts until one opens; dental records and billing details sit behind a single guessed password.',
    report: { title: 'Missing Brute-Force Protection on Login', severity: 'High', remediation: 'Add rate limiting, progressive delays, account lockout and MFA for staff accounts.' } },
  { id: 'auth-enum', feature: F_AUTH, name: 'User enumeration via differing responses', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare what the site says for an email that exists vs one that does not.',
            'Try both the login form and the forgot-password form — one of them is chatty.',
            'Probe at least 5 different emails on /forgot: real accounts get "reset link sent", unknown ones get a different message.'],
    lesson: 'Different answers for "no such user" and "wrong password" confirm which emails are registered — free targeting data for attackers.',
    impact: 'An attacker builds a verified list of patient and staff emails, then aims phishing and password attacks only at real accounts.',
    report: { title: 'Account Enumeration via Authentication Responses', severity: 'Medium', remediation: 'Return one generic message for all login and reset outcomes, regardless of account existence.' } },
  { id: 'auth-default', feature: F_AUTH, name: 'Default administrator credentials', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Installs often ship with a well-known admin password that nobody changed.',
            'The admin email is admin@hexadental.local. What is the most common default password in the world?',
            'Sign in as admin@hexadental.local with the password admin123.'],
    lesson: 'Default credentials are public knowledge; any unchanged default is an open door with a welcome mat.',
    impact: 'Full clinic takeover in seconds: patient records, invoices and staff accounts — from a password printed in every attacker wordlist.',
    report: { title: 'Default Credentials on Administrator Account', severity: 'Critical', remediation: 'Force a unique strong password at first setup and disable or rename default accounts.' } },
  { id: 'auth-reset', feature: F_AUTH, name: 'Predictable password-reset token', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['Ask for a reset email and study the token format for two different accounts.',
            'The token looks like letters plus a number derived from something stable about the account.',
            'Tokens are HD-<userId x 271 + 13>. Bob is user 5, so compute his token and reset his password without ever requesting a reset for him.'],
    lesson: 'Reset tokens must be long, random and single-use; a token you can compute is a password you can choose for anyone.',
    impact: 'Anyone can take over any patient or staff account — including the admin — with nothing but the victim\'s user id.',
    report: { title: 'Predictable Password Reset Tokens Allow Account Takeover', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), expire them quickly and make them single-use.' } },
  { id: 'auth-cookie', feature: F_AUTH, name: 'Session role cookie tampering', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After login, inspect your cookies — your role travels with your browser.',
            'One cookie repeats your role back to the server, and the dentist area trusts it.',
            'As a patient, set the hx_role cookie to dentist and open /dentist — the server believes the cookie, not the account.'],
    lesson: 'Authorization data must live server-side in the session; anything stored in a cookie is edited by its owner.',
    impact: 'Any patient becomes "staff" by editing a cookie, reaching schedules, plans and patient data meant for clinicians only.',
    report: { title: 'Client-Controlled Role Cookie Used for Authorization', severity: 'High', remediation: 'Store roles only in server-side session state and re-check them on every privileged request.' } },

  /* ---- Registration & Profile ---- */
  { id: 'reg-weakpw', feature: F_REG, name: 'Weak password policy on registration', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a new account and see how short a password the form accepts.',
            'There is no minimum length or complexity check at all.',
            'Register with a 1-character password such as "x" — it is accepted.'],
    lesson: 'A password policy is the cheapest defence there is; without one, users pick passwords that fall in seconds.',
    impact: 'Patient accounts protected by one-character passwords are harvested wholesale in any credential attack.',
    report: { title: 'No Minimum Password Requirements on Registration', severity: 'Medium', remediation: 'Enforce a minimum length (12+), block known-breached passwords and encourage passphrases.' } },
  { id: 'reg-mass', feature: F_REG, name: 'Mass assignment — self-assigned staff role', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration handler copies form fields straight into the new account record.',
            'What extra field could you add to the form that a normal browser never sends?',
            'Add role=dentist to the registration POST — the new account is created as a dentist.'],
    lesson: 'Bind only whitelisted fields on signup and profile updates; trusting the whole request body invites privilege escalation.',
    impact: 'Anyone on the internet can mint themselves a staff account and browse the clinic\'s patients, plans and billing.',
    report: { title: 'Mass Assignment Allows Privilege Escalation at Registration', severity: 'High', remediation: 'Whitelist assignable fields per endpoint; set role and account flags server-side only.' } },
  { id: 'reg-xss', feature: F_REG, name: 'Stored XSS in display name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Names are shown on dashboards and staff views. Are they escaped?',
            'Put an HTML payload where a name goes — registration or profile.',
            'Register with the display name <script>alert(1)</script> — it is stored and rendered raw to viewers.'],
    lesson: 'Every user-controlled string that reaches a page must be output-encoded; stored XSS fires in other people\'s browsers, including admins\'.',
    impact: 'A malicious "patient name" runs script in the receptionist\'s or dentist\'s browser — session theft and actions performed as staff.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Output-encode all user data in templates and deploy a restrictive Content-Security-Policy.' } },
  { id: 'prof-csrf', feature: F_REG, name: 'CSRF on profile update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Legit profile forms carry a hidden hx_origin marker field. What if a request leaves it out?',
            'The server never actually verifies the marker on profile updates.',
            'POST to /profile/update as a logged-in user WITHOUT the hx_origin field — the change is accepted anyway.'],
    lesson: 'State-changing forms need a verified anti-CSRF token; an unchecked marker is decoration, not defence.',
    impact: 'A booby-trapped page a patient visits can silently rewrite their profile — or a staff member\'s — using their own session.',
    report: { title: 'Missing CSRF Validation on Profile Update', severity: 'Medium', remediation: 'Issue per-session CSRF tokens and verify them on every state-changing request.' } },

  /* ---- Appointments ---- */
  { id: 'appt-idor', feature: F_APPT, name: 'Appointment IDOR — view another patient\'s booking', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Your appointment page has an id in the URL. IDs are small numbers.',
            'The server checks that you are logged in — but not that the booking is yours.',
            'As Alice, open /appointments/2 — that is Bob\'s appointment, served to you in full.'],
    lesson: 'Every object access must verify ownership, not just login state.',
    impact: 'Patients can browse each other\'s visits — who is being treated, when, and for what — a direct privacy breach for a clinic.',
    report: { title: 'Insecure Direct Object Reference on Appointment Records', severity: 'High', remediation: 'Check object ownership server-side on every read and write.' } },
  { id: 'appt-double', feature: F_APPT, name: 'Double-booking a taken slot', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['Dr. Rahman already has a patient at 2026-11-02 10:00. What stops a second booking for the same slot?',
            'Nothing checks for an existing confirmed booking for that dentist, date and time.',
            'Book Dr. Rahman at 2026-11-02 10:00 for yourself — it is accepted alongside Alice\'s existing booking.'],
    lesson: 'Capacity and uniqueness rules are security-relevant invariants; if the server never enforces them, the UI\'s greyed-out slots mean nothing.',
    impact: 'Attackers (or a rival) can flood a dentist\'s diary with clashing bookings, wrecking the clinic\'s schedule and turning real patients away.',
    report: { title: 'Missing Slot-Conflict Check Allows Double Booking', severity: 'Medium', remediation: 'Enforce slot uniqueness transactionally on the server at booking time.' } },
  { id: 'appt-cancel-idor', feature: F_APPT, name: 'Cancel another patient\'s appointment', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Cancelling posts to an appointment id. Whose id can you put there?',
            'Like the view page, the cancel action skips the ownership check.',
            'As Alice, POST /appointments/2/cancel — Bob\'s appointment is cancelled.'],
    lesson: 'Write actions need the same ownership checks as reads — a destructive IDOR is worse than a reading one.',
    impact: 'Any patient can sabotage any other patient\'s care by cancelling their appointments — missed treatment, chaos at reception.',
    report: { title: 'Insecure Direct Object Reference on Appointment Cancellation', severity: 'High', remediation: 'Verify the session user owns (or staff-manages) the appointment before cancelling.' } },

  /* ---- Treatment Plans ---- */
  { id: 'plan-idor', feature: F_PLAN, name: 'Treatment plan IDOR — another patient\'s plan and costs', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Treatment plans live at /plans/<id> with small sequential ids.',
            'No ownership check stands between you and another patient\'s plan.',
            'As Bob, open /plans/1 — Alice\'s root-canal plan, items and total, all visible.'],
    lesson: 'Medical treatment details are among the most sensitive data a business holds; IDOR here is a confidentiality breach, not a glitch.',
    impact: 'Competitors or snoops harvest patients\' treatments and the prices they were quoted — privacy damage and commercial harm in one.',
    report: { title: 'Insecure Direct Object Reference on Treatment Plans', severity: 'High', remediation: 'Scope every plan query to the session user (or their treating clinician).' } },
  { id: 'plan-cost', feature: F_PLAN, name: 'Treatment cost tampering via client-supplied item price', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['When a plan item is added, the price travels in the request. Does the server look up the real price?',
            'The catalogue has fixed prices — but the add-item form accepts any price you send.',
            'Add a Crown to a plan with price=1 instead of 450; the plan total drops to your price.'],
    lesson: 'Prices must come from the server-side catalogue at the moment of the transaction; a client-sent price is a suggestion the attacker controls.',
    impact: 'Treatment sold for pennies: patients (or a bent insider) rewrite quotes, and the clinic\'s invoicing inherits the fake totals.',
    report: { title: 'Client-Supplied Prices Trusted for Treatment Plan Items', severity: 'High', remediation: 'Resolve prices from the server-side catalogue by item id; ignore client-sent amounts.' } },
  { id: 'plan-approve', feature: F_PLAN, name: 'Patient approves their own treatment plan', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Approval is a dentist action in the UI. Is it a dentist action on the server?',
            'The approve endpoint checks the plan exists — not who is asking.',
            'As Alice, POST /plans/1/approve on your own proposed plan — it becomes approved without any dentist.'],
    lesson: 'Workflow roles must be enforced server-side per transition; hiding a button is not authorization.',
    impact: 'Patients self-approve treatment (and the quotes and insurance paperwork built on it) that no clinician ever reviewed.',
    report: { title: 'Missing Role Check on Treatment Plan Approval', severity: 'High', remediation: 'Require the dentist role server-side for plan approval transitions.' } },
  { id: 'plan-complete', feature: F_PLAN, name: 'Patient marks their own treatment complete', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Completing a plan is what triggers final billing. Who can POST to the complete endpoint?',
            'Like approval, completion trusts any logged-in caller.',
            'As the plan\'s patient, POST /plans/<id>/complete — the treatment is recorded as done and ready to bill.'],
    lesson: 'State machines are part of the attack surface: every transition needs an authorized actor and valid preconditions.',
    impact: 'Fake "completed" treatments feed invoices and insurance claims for work never done — textbook healthcare billing fraud, enabled by one missing check.',
    report: { title: 'Missing Role Check on Treatment Completion', severity: 'High', remediation: 'Restrict completion to treating clinicians and verify plan state before transitioning.' } }
];

TESTS.push(
  /* ---- Records & X-rays ---- */
  { id: 'rec-idor', feature: F_REC, name: 'Clinical record IDOR — another patient\'s X-ray record', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Record pages live at /records/<id>. Try a neighbour\'s id.',
            'Imaging and notes are served to any signed-in user who guesses the id.',
            'As Alice, open /records/2 — Bob\'s bitewing X-ray record and findings.'],
    lesson: 'Health records demand per-object authorization; sequential ids plus no checks equal a public archive.',
    impact: 'A clinic\'s entire imaging history — every patient\'s X-rays and clinical notes — readable by anyone with a free account.',
    report: { title: 'Insecure Direct Object Reference on Clinical Records', severity: 'Critical', remediation: 'Enforce patient/clinician ownership checks on every record access.' } },
  { id: 'rec-traversal', feature: F_REC, name: 'Path traversal on record download', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The download endpoint takes a file name. What happens with ../ in it?',
            'The name is joined straight onto the records folder without sanitising.',
            'Request /download?file=../server.js — the application source code comes back.'],
    lesson: 'Never build filesystem paths from raw user input; whitelist files or map ids to paths server-side.',
    impact: 'Attackers walk out of the records folder into configuration, source code and any file the server can read — the foothold for a full breach.',
    report: { title: 'Path Traversal in File Download', severity: 'High', remediation: 'Resolve and confine paths to the records directory; reject separators and dot segments.' } },

  /* ---- Invoices & Payment Plans ---- */
  { id: 'inv-idor', feature: F_INV, name: 'Invoice IDOR — another patient\'s bill', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Invoices live at /invoices/<id>, numbered from 1.',
            'Billing pages repeat the same missing ownership check.',
            'As Alice, open /invoices/2 — Bob\'s invoice, totals and payment state.'],
    lesson: 'Financial documents need the same per-object checks as medical ones.',
    impact: 'Patients see each other\'s bills — treatment costs are health information too, and invoice data feeds convincing invoice-fraud scams.',
    report: { title: 'Insecure Direct Object Reference on Invoices', severity: 'High', remediation: 'Scope invoice access to the owning patient or billing staff.' } },
  { id: 'inv-pay-tamper', feature: F_INV, name: 'Invoice settled for $1 via payment amount tampering', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['The pay form sends an amount. The invoice total is $1,100 — must the amount match it?',
            'The endpoint marks the invoice PAID for whatever amount arrives.',
            'POST /invoices/1/pay with amount=1 — a $1,100 invoice becomes PAID with $1 recorded.'],
    lesson: 'Payment state must derive from verified amounts server-side; "paid" is a conclusion the server draws, not a parameter the client sends.',
    impact: 'Patients clear four-figure treatment bills for a dollar; the clinic\'s ledger says paid, so nobody chases the difference.',
    report: { title: 'Payment Amount Tampering Settles Invoices Below Total', severity: 'Critical', remediation: 'Only mark an invoice paid when cumulative verified payments reach the server-side total.' } },
  { id: 'pp-terms', feature: F_INV, name: 'Payment plan terms forgery — 60 months at 0% APR', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['Clinic policy: plans run at most 12 months at minimum 5% APR. Where is that policy enforced?',
            'Only in the form\'s dropdowns. The endpoint accepts any months and APR.',
            'Create a payment plan with months=60 and apr=0 — the forbidden terms are stored as agreed.'],
    lesson: 'Business rules stated in the UI must be re-validated on the server; dropdown limits are not controls.',
    impact: 'Interest-free five-year plans appear from nowhere, quietly rewriting what patients owe and when — finance finds out at audit, if ever.',
    report: { title: 'Server Fails to Enforce Payment Plan Terms Policy', severity: 'Medium', remediation: 'Validate months/APR against policy server-side on plan creation.' } },

  /* ---- Admin Panel ---- */
  { id: 'admin-bac', feature: F_ADMIN, name: 'Broken access control — all-invoices admin report open to any user', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Admins have a finance report of every invoice. Guess its URL under /admin.',
            'That one page was wired up without the role check the rest of the panel has.',
            'As any patient, open /admin/invoices — every patient\'s invoices are listed.'],
    lesson: 'Authorization must be applied route by route; one forgotten check exposes the whole dataset it serves.',
    impact: 'The clinic\'s complete billing ledger — every patient, every treatment price — exposed to any account holder.',
    report: { title: 'Missing Authorization on Admin Invoices Report', severity: 'High', remediation: 'Apply a central admin-role middleware to all /admin routes.' } },
  { id: 'admin-csrf', feature: F_ADMIN, name: 'CSRF on admin user deactivation', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    hints: ['The deactivate action is a POST the admin panel makes with an hx_origin marker — which is never checked.',
            'Reach /admin first (the role cookie decides who is "admin"), then look at the user actions.',
            'POST /admin/users/5/deactivate with no hx_origin field — Bob\'s account is deactivated by your request.'],
    lesson: 'Privileged actions are the highest-value CSRF targets; unverified markers give a false sense of safety.',
    impact: 'Trick an admin into opening a page and their own browser deactivates staff or patient accounts — denial of service with the admin\'s authority.',
    report: { title: 'Missing CSRF Validation on Admin User Deactivation', severity: 'Medium', remediation: 'Verify per-session CSRF tokens on all admin state-changing endpoints.' } },

  /* ---- Platform & API ---- */
  { id: 'api-debug', feature: F_API, name: 'Unauthenticated debug endpoint dumps all accounts', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Developers love leaving a status endpoint behind. Try the obvious API paths.',
            'One endpoint returns the whole user table — passwords included — with no login at all.',
            'Open /api/debug in a private window: every account and its plaintext password.'],
    lesson: 'Debug and diagnostic endpoints are production vulnerabilities the day they ship; remove them or lock them down.',
    impact: 'Total compromise in one request: every patient and staff password, ready for credential stuffing against their email and banking too.',
    report: { title: 'Unauthenticated Debug Endpoint Exposes All Credentials', severity: 'Critical', remediation: 'Remove debug endpoints from production; require admin auth and never return passwords.' } },
  { id: 'api-token', feature: F_API, name: 'Forgeable API token — base64 of email', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['The API takes a Bearer token. Legit tokens look suspiciously readable.',
            'Decode one: it is just a prefix plus the account email, encoded.',
            'Send Authorization: Bearer hd_<base64 of bob@test.local> to /api/me — you are Bob, no password needed.'],
    lesson: 'Tokens must be unguessable secrets issued by the server, never a reversible encoding of public identifiers.',
    impact: 'Anyone who knows a victim\'s email address — printed on every invoice — owns their API identity and everything it can reach.',
    report: { title: 'Predictable API Tokens Derived from Email Address', severity: 'High', remediation: 'Issue random opaque tokens server-side, store hashes, and support revocation.' } }
);

/* --- key material, shard set beta (scattered) --- */
const _kb = ['LTJSSA==', 'TDBWUg==', 'V0pCUw=='];
const _kc = ['TC1YSA==', 'RS02Ng==', 'TTBVVg=='];
function _un(shards) { return shards.map(s => [...Buffer.from(s, 'base64').toString('utf8')].reverse().join('')).join(''); }
/* --- key material, shard set gamma --- */
const _kd = ['LTVPTw==', 'REFERQ==', 'SUJNRQ=='];
function entryKey() { return _un(_ka.concat(_kb)); }
function completionKey() { return _un(_kc.concat(_kd)); }

/* ============================ progress engine ============================ */
const PROGRESS_FILE = path.join(ROOT, 'progress.json');
let state;
function freshState() { return { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false }; }
function loadState() {
  try { state = Object.assign(freshState(), JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'))); }
  catch (e) { state = freshState(); }
}
function saveState() { try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 1)); } catch (e) {} }
loadState();

function pass(id) { if (!state.tests[id]) { state.tests[id] = true; saveState(); } }
function attempt(feature) { state.attempts[feature] = (state.attempts[feature] || 0) + 1; saveState(); }
function doneCount() { return TESTS.filter(t => state.tests[t.id]).length; }
function pct() { return Math.floor(doneCount() / TESTS.length * 100); }
function isComplete() { return doneCount() === TESTS.length; }
function featureStats() {
  const out = {};
  for (const t of TESTS) {
    out[t.feature] = out[t.feature] || { total: 0, done: 0, attempts: state.attempts[t.feature] || 0 };
    out[t.feature].total++; if (state.tests[t.id]) out[t.feature].done++;
  }
  return out;
}

/* ============================ http helpers ============================ */
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}
function readBody(req) {
  return new Promise(res => {
    let b = ''; req.on('data', c => { b += c; if (b.length > 1e6) req.destroy(); });
    req.on('end', () => res(b)); req.on('error', () => res(''));
  });
}
function parseForm(body) {
  const out = {};
  for (const pair of String(body || '').split('&')) {
    if (!pair) continue;
    const i = pair.indexOf('=');
    const k = decodeURIComponent((i < 0 ? pair : pair.slice(0, i)).replace(/\+/g, ' '));
    const v = decodeURIComponent((i < 0 ? '' : pair.slice(i + 1)).replace(/\+/g, ' '));
    out[k] = v;
  }
  return out;
}
const XSS_RE = /<script|<svg|<img[^>]*onerror|onerror\s*=|onload\s*=|<iframe|<body[^>]*onload/i;
const SQLI_RE = /'\s*or\s*'?\d+\s*'?\s*=\s*'?\d+|'\s*or\s*'[^']*'\s*=\s*'[^']*'|--\s|'\s*or\s*1\s*=\s*1|union\s+select/i;

/* ============================ auth helpers ============================ */
function getSessionUser(req) {
  const c = parseCookies(req);
  const sid = c.hx_session;
  if (sid && sessions.has(sid)) return userById(sessions.get(sid)) || null;
  return null;
}
function resetTokenFor(u) { return 'HD-' + (u.id * 271 + 13); }
function hasMarker(body, req) {
  // The lab's own forms carry a hidden hx_origin field; the server (incorrectly)
  // treats its mere presence as proof — and two endpoints forget to check at all.
  return !!(body && body.hx_origin);
}

/* ============================ Lab Coach chatbot ============================ */
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
function matchFeature(msg) {
  const m = msg.toLowerCase();
  if (/payment|invoice|bill/.test(m)) return F_INV;
  if (/login|auth|password|brute|reset token|enumeration/.test(m)) return F_AUTH;
  if (/regist|sign ?up|profile/.test(m)) return F_REG;
  if (/appointment|booking|slot|cancel/.test(m)) return F_APPT;
  if (/treatment|plan/.test(m)) return F_PLAN;
  if (/record|x-?ray|download|traversal/.test(m)) return F_REC;
  if (/admin|deactivat/.test(m)) return F_ADMIN;
  if (/api|debug|token/.test(m)) return F_API;
  return null;
}
function chatReply(rawMsg) {
  const msg = String(rawMsg || '');
  const m = msg.toLowerCase();
  const fs2 = featureStats();
  if (/who (built|made|created)|founder|who is (the )?(founder|builder|author)/.test(m) || /built this|made this|created this/.test(m)) return ATTRIBUTION;
  if (/key|unlock next|next lab/.test(m)) {
    if (isComplete()) return 'You completed LAB ' + LAB_NUMBER + ' — well done! The completion key for the next lab is: ' + completionKey() + ' — paste it into the next lab to unlock it.';
    return 'I do not have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at ' + pct() + '% (' + doneCount() + '/' + TESTS.length + ' tests). Finish every test and I will be able to share it.';
  }
  const feat = matchFeature(m);
  const wantsHow = /how|solve|guide|step|help me|exploit|bypass|do the|walkthrough/.test(m);
  if (feat && wantsHow) {
    const open = TESTS.filter(t => t.feature === feat && !state.tests[t.id]);
    const tries = state.attempts[feat] || 0;
    if (!open.length) return 'You have already completed every test in ' + feat + '. Nice work!';
    if (tries >= 3) {
      let r = 'Step by step for ' + feat + ' — you have earned guidance with ' + tries + ' tries:';
      for (const t of open) r += '\n• ' + t.name + ': ' + t.hints[2];
      return r;
    }
    return 'That feature is locked for help. First try the ' + feat + ' tests yourself at least 3 times — I can see you\'ve tried ' + tries + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  if (feat && /how many|which|what tests|vulnerab|count|list/.test(m)) {
    const list = TESTS.filter(t => t.feature === feat);
    return feat + ' has ' + list.length + ' tests: ' + list.map(t => t.name + (state.tests[t.id] ? ' (done)' : '')).join('; ') + '. Attempts so far on this feature: ' + (state.attempts[feat] || 0) + '.';
  }
  if (/how many|features|progress|status|next|start|hello|hi\b|help/.test(m)) {
    const names = Object.keys(fs2);
    const next = TESTS.find(t => !state.tests[t.id]);
    let r = 'Welcome to LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '. This lab has ' + names.length + ' features and ' + TESTS.length + ' tests: ' +
      names.map(f => f + ' (' + fs2[f].total + ')').join(', ') + '. Your progress: ' + doneCount() + '/' + TESTS.length + ' (' + pct() + '%).';
    if (next) r += ' Next open test: "' + next.name + '" in ' + next.feature + '. See /tests for the mission board and hints. Ask me how to solve a feature after you have tried it at least 3 times.';
    else r += ' Everything is complete — visit /complete for your summary and certificate.';
    return r;
  }
  return 'I can help with this lab: ask me which features and tests exist, your progress, or — after at least 3 tries on a feature — step-by-step guidance for it. The mission board at /tests lists every test with graded hints.';
}

/* ============================ page rendering ============================ */
function chatWidget() {
  return '<div id="hxchat" style="position:fixed;right:16px;bottom:16px;width:320px;max-width:92vw;background:#fff;border:1px solid #ccd;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.25);font-family:Arial,sans-serif;z-index:99">' +
    '<div style="background:#0d6e6e;color:#fff;padding:10px 12px;border-radius:12px 12px 0 0;font-weight:bold">Lab Coach</div>' +
    '<div id="hxlog" style="height:180px;overflow:auto;padding:10px;font-size:13px"></div>' +
    '<form id="hxform" style="display:flex;border-top:1px solid #eee"><input id="hxinput" autocomplete="off" placeholder="Ask the coach…" style="flex:1;border:0;padding:10px;font-size:13px"><button style="background:#0d6e6e;color:#fff;border:0;padding:0 14px">Send</button></form></div>' +
    '<script>var log=document.getElementById("hxlog");function add(w,t){var d=document.createElement("div");d.style.margin="6px 0";d.innerHTML="<b>"+w+":</b> ";d.appendChild(document.createTextNode(t));log.appendChild(d);log.scrollTop=log.scrollHeight;}' +
    'document.getElementById("hxform").addEventListener("submit",function(e){e.preventDefault();var v=document.getElementById("hxinput").value;if(!v)return;add("You",v);document.getElementById("hxinput").value="";fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:v})}).then(function(r){return r.json()}).then(function(j){add("Coach",j.reply)}).catch(function(){add("Coach","Sorry, I could not answer just now.")});});</script>';
}
function layout(user, title, body) {
  const d = doneCount(), p = pct();
  const nav = user ? '<nav style="margin:10px 0"><a href="/dashboard">Dashboard</a> · <a href="/appointments">Appointments</a> · <a href="/plans">Treatment Plans</a> · <a href="/records">Records</a> · <a href="/invoices">Invoices</a> · <a href="/tests">Mission Board</a> · <a href="/profile">Profile</a> · <a href="/logout">Logout (' + user.name + ')</a></nav>' : '';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + ' · LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</title></head>' +
    '<body style="margin:0;background:#eef4f4;font-family:Arial,sans-serif;color:#123">' +
    '<div style="max-width:960px;margin:0 auto;padding:18px">' +
    '<header style="background:#fff;border:1px solid #dde;border-radius:12px;padding:14px 18px">' +
    '<img src="/logo.png" style="height:44px;vertical-align:middle"> <b style="font-size:19px">LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</b>' +
    '<div style="margin-top:8px;font-size:13px">Progress: ' + d + '/' + TESTS.length + ' tests · ' + p + '%</div>' +
    '<div style="background:#dde;height:10px;border-radius:5px;margin-top:4px"><div style="background:#0d6e6e;height:10px;border-radius:5px;width:' + p + '%"></div></div>' + nav + '</header>' +
    '<main style="background:#fff;border:1px solid #dde;border-radius:12px;padding:18px;margin-top:14px">' + body + '</main>' +
    '<footer style="text-align:center;font-size:12px;color:#678;margin:14px">HexaDental training lab — local use only · HexaCyberLab</footer></div>' +
    chatWidget() + '</body></html>';
}
function gatePage() {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' · Locked</title></head>' +
    '<body style="margin:0;background:#141d1d;font-family:Arial,sans-serif"><div style="max-width:520px;margin:60px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:28px;text-align:center">' +
    '<img src="/logo.png" style="height:56px"><h2>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h2>' +
    '<p>This lab is locked. Paste the completion key from Lab ' + (LAB_NUMBER - 1) + ' to start.</p>' +
    '<form method="POST" action="/unlock"><input name="key" style="padding:9px;width:80%" placeholder="Completion key from Lab ' + (LAB_NUMBER - 1) + '"><br><br><button style="padding:10px 22px">Unlock LAB ' + LAB_NUMBER + '</button></form></div>' +
    chatWidget() + '</body></html>';
}
function loginPage(msg) {
  return layout(null, 'Login', '<h2>Sign in to HexaDental</h2>' + (msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/login">Email<br><input name="email" style="padding:8px;width:70%"><br><br>Password<br><input type="password" name="password" style="padding:8px;width:70%"><br><br><button style="padding:9px 20px">Sign in</button></form>' +
    '<p><a href="/forgot">Forgot your password?</a> · <a href="/register">Create a patient account</a></p><p style="font-size:12px;color:#678">Demo accounts are listed in the lab README.</p>');
}
function registerPage(msg) {
  return layout(null, 'Register', '<h2>Create a patient account</h2>' + (msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/register">Full name<br><input name="name" style="padding:8px;width:70%"><br><br>Email<br><input name="email" style="padding:8px;width:70%"><br><br>Password<br><input type="password" name="password" style="padding:8px;width:70%"><br><br><button style="padding:9px 20px">Register</button></form>' +
    '<p><a href="/login">Back to sign in</a></p>');
}
function forgotPage(msg) {
  return layout(null, 'Forgot password', '<h2>Reset your password</h2>' + (msg ? '<p>' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/forgot">Email<br><input name="email" style="padding:8px;width:70%"><br><br><button style="padding:9px 20px">Send reset link</button></form>' +
    '<h3>Have a token?</h3><form method="POST" action="/reset">Email<br><input name="email" style="padding:8px;width:70%"><br><br>Reset token<br><input name="token" style="padding:8px;width:70%"><br><br>New password<br><input type="password" name="newpassword" style="padding:8px;width:70%"><br><br><button style="padding:9px 20px">Set new password</button></form>' +
    '<p><a href="/login">Back to sign in</a></p>');
}

function dashboardPage(user) {
  const myAppts = appointments.filter(a => a.patientId === user.id);
  const myPlans = plans.filter(p => p.patientId === user.id);
  // NOTE (intentional flaw): the greeting renders the display name RAW (stored-XSS sink).
  let body = '<h2>Welcome, ' + user.name + '</h2><p>Role: ' + esc(user.role) + ' · Email: ' + esc(user.email) + '</p>';
  body += '<h3>Your appointments</h3>' + (myAppts.length ? '<ul>' + myAppts.map(a => '<li><a href="/appointments/' + a.id + '">' + esc(a.date) + ' ' + esc(a.time) + ' — ' + esc(a.reason) + '</a> (' + esc(a.status) + ')</li>').join('') + '</ul>' : '<p>None yet. <a href="/appointments/new">Book one</a>.</p>');
  body += '<h3>Your treatment plans</h3>' + (myPlans.length ? '<ul>' + myPlans.map(p => '<li><a href="/plans/' + p.id + '">' + esc(p.title) + '</a> — $' + planTotal(p) + ' (' + esc(p.status) + ')</li>').join('') + '</ul>' : '<p>None yet.</p>');
  if (user.role === 'dentist' || user.role === 'hygienist') body += '<p><a href="/dentist">Open the dentist console</a></p>';
  if (user.role === 'admin') body += '<p><a href="/admin">Open the admin panel</a></p>';
  return layout(user, 'Dashboard', body);
}
function profilePage(user, msg) {
  return layout(user, 'Profile', '<h2>Your profile</h2>' + (msg ? '<p>' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/profile/update"><input type="hidden" name="hx_origin" value="lab65">Display name<br><input name="name" value="' + esc(user.name) + '" style="padding:8px;width:70%"><br><br>Email<br><input name="email" value="' + esc(user.email) + '" style="padding:8px;width:70%"><br><br><button style="padding:9px 20px">Save changes</button></form>');
}
function appointmentsPage(user) {
  const staff = ['dentist', 'hygienist', 'admin'].includes(user.role);
  const list = staff ? appointments : appointments.filter(a => a.patientId === user.id);
  let body = '<h2>Appointments</h2><p><a href="/appointments/new">Book an appointment</a></p><ul>';
  for (const a of list) {
    const pat = userById(a.patientId), den = userById(a.dentistId);
    body += '<li><a href="/appointments/' + a.id + '">' + esc(a.date) + ' ' + esc(a.time) + '</a> — ' + esc(a.reason) + ' · Patient: ' + esc(pat ? pat.name : '?') + ' · With: ' + esc(den ? den.name : '?') + ' · ' + esc(a.status) + '</li>';
  }
  return layout(user, 'Appointments', body + '</ul>');
}
function appointmentNewPage(user, msg) {
  const staff = users.filter(u => ['dentist', 'hygienist'].includes(u.role));
  return layout(user, 'Book appointment', '<h2>Book an appointment</h2>' + (msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/appointments">Clinician<br><select name="dentistId">' + staff.map(s => '<option value="' + s.id + '">' + esc(s.name) + ' (' + esc(s.role) + ')</option>').join('') + '</select><br><br>Date<br><input name="date" value="2026-11-02" style="padding:8px"><br><br>Time<br><input name="time" value="10:00" style="padding:8px"><br><br>Reason<br><input name="reason" style="padding:8px;width:70%"><br><br><button style="padding:9px 20px">Book</button></form>');
}
function appointmentPage(user, a) {
  const pat = userById(a.patientId), den = userById(a.dentistId);
  return layout(user, 'Appointment', '<h2>Appointment #' + a.id + '</h2><p>Date: ' + esc(a.date) + ' ' + esc(a.time) + '<br>Reason: ' + esc(a.reason) + '<br>Patient: ' + esc(pat ? pat.name : '?') + ' (' + esc(pat ? pat.email : '') + ')<br>Clinician: ' + esc(den ? den.name : '?') + '<br>Status: ' + esc(a.status) + '</p>' +
    (a.status === 'booked' ? '<form method="POST" action="/appointments/' + a.id + '/cancel"><button style="padding:8px 18px">Cancel this appointment</button></form>' : '') +
    '<p><a href="/appointments">Back to appointments</a></p>');
}
function plansPage(user) {
  const staff = ['dentist', 'hygienist', 'admin'].includes(user.role);
  const list = staff ? plans : plans.filter(p => p.patientId === user.id);
  let body = '<h2>Treatment plans</h2><ul>';
  for (const p of list) {
    const pat = userById(p.patientId);
    body += '<li><a href="/plans/' + p.id + '">' + esc(p.title) + '</a> — Patient: ' + esc(pat ? pat.name : '?') + ' · Total $' + planTotal(p) + ' · ' + esc(p.status) + '</li>';
  }
  return layout(user, 'Treatment plans', body + '</ul>');
}
function planPage(user, p) {
  const pat = userById(p.patientId), den = userById(p.dentistId);
  let body = '<h2>' + esc(p.title) + '</h2><p>Patient: ' + esc(pat ? pat.name : '?') + '<br>Dentist: ' + esc(den ? den.name : '?') + '<br>Status: ' + esc(p.status) + '</p><h3>Items</h3><ul>';
  for (const it of p.items) body += '<li>' + esc(it.name) + ' — $' + esc(it.price) + '</li>';
  body += '</ul><p><b>Total: $' + planTotal(p) + '</b></p>';
  body += '<h3>Add a treatment item</h3><form method="POST" action="/plans/' + p.id + '/items"><select name="name">' + CATALOG.map(c => '<option>' + esc(c.name) + '</option>').join('') + '</select> <input name="price" placeholder="Price" style="padding:6px;width:90px"> <button>Add item</button></form>';
  body += '<h3>Plan actions</h3><form method="POST" action="/plans/' + p.id + '/approve" style="display:inline"><button>Approve plan (dentist)</button></form> ' +
          '<form method="POST" action="/plans/' + p.id + '/complete" style="display:inline"><button>Mark treatment complete</button></form>';
  body += '<p><a href="/plans">Back to plans</a></p>';
  return layout(user, 'Treatment plan', body);
}
function recordsPage(user) {
  const staff = ['dentist', 'hygienist', 'admin'].includes(user.role);
  const list = staff ? records : records.filter(r => r.patientId === user.id);
  let body = '<h2>Clinical records &amp; X-rays</h2><ul>';
  for (const r of list) {
    const pat = userById(r.patientId);
    body += '<li><a href="/records/' + r.id + '">' + esc(r.name) + '</a> — Patient: ' + esc(pat ? pat.name : '?') + ' · ' + esc(r.date) + '</li>';
  }
  return layout(user, 'Records', body + '</ul>');
}
function recordPage(user, r) {
  const pat = userById(r.patientId);
  let content = '';
  try { content = fs.readFileSync(path.join(RECORDS_DIR, r.file), 'utf8'); } catch (e) { content = '(file missing)'; }
  return layout(user, 'Record', '<h2>' + esc(r.name) + '</h2><p>Patient: ' + esc(pat ? pat.name : '?') + ' · Date: ' + esc(r.date) + '</p><pre style="background:#f4f8f8;padding:12px;border-radius:8px">' + esc(content) + '</pre>' +
    '<p><a href="/download?file=' + encodeURIComponent(r.file) + '">Download record file</a></p><p><a href="/records">Back to records</a></p>');
}
function invoicesPage(user) {
  const staff = ['dentist', 'hygienist', 'admin'].includes(user.role);
  const list = staff ? invoices : invoices.filter(i => i.patientId === user.id);
  let body = '<h2>Invoices</h2><ul>';
  for (const inv of list) {
    const pat = userById(inv.patientId);
    body += '<li><a href="/invoices/' + inv.id + '">Invoice #' + inv.id + '</a> — Patient: ' + esc(pat ? pat.name : '?') + ' · Total $' + inv.total + ' · Paid $' + inv.paid + ' · ' + esc(inv.status) + '</li>';
  }
  body += '</ul><h3>Start a payment plan</h3><p style="font-size:13px">Clinic policy: at most 12 months, minimum 5% APR.</p>' +
    '<form method="POST" action="/payment-plans">Invoice id<br><input name="invoiceId" style="padding:8px;width:120px"><br><br>Months (max 12)<br><select name="months"><option>3</option><option>6</option><option>12</option></select><br><br>APR (min 5)<br><select name="apr"><option>5</option><option>8</option><option>12</option></select><br><br><button style="padding:9px 20px">Create payment plan</button></form>';
  return layout(user, 'Invoices', body);
}
function invoicePage(user, inv) {
  const pat = userById(inv.patientId);
  return layout(user, 'Invoice', '<h2>Invoice #' + inv.id + '</h2><p>Patient: ' + esc(pat ? pat.name : '?') + '<br>Total: $' + inv.total + '<br>Paid: $' + inv.paid + '<br>Status: ' + esc(inv.status) + '</p>' +
    (inv.status !== 'paid' ? '<form method="POST" action="/invoices/' + inv.id + '/pay">Amount<br><input name="amount" style="padding:8px;width:120px"><br><br><button style="padding:9px 20px">Pay now</button></form>' : '<p>This invoice is settled.</p>') +
    '<p><a href="/invoices">Back to invoices</a></p>');
}
function dentistPage(user) {
  let body = '<h2>Dentist console</h2><h3>Clinic schedule</h3><ul>';
  for (const a of appointments) {
    const pat = userById(a.patientId);
    body += '<li>' + esc(a.date) + ' ' + esc(a.time) + ' — ' + esc(pat ? pat.name : '?') + ': ' + esc(a.reason) + ' (' + esc(a.status) + ')</li>';
  }
  body += '</ul><h3>All treatment plans</h3><ul>';
  for (const p of plans) body += '<li><a href="/plans/' + p.id + '">' + esc(p.title) + '</a> — $' + planTotal(p) + ' · ' + esc(p.status) + '</li>';
  return layout(user, 'Dentist console', body + '</ul>');
}
function adminPage(user) {
  let body = '<h2>Admin panel</h2><p><a href="/admin/invoices">Finance report — all invoices</a></p><h3>Users</h3><table border="0" cellpadding="6">';
  for (const u of users) {
    body += '<tr><td>' + u.id + '</td><td>' + esc(u.name) + '</td><td>' + esc(u.email) + '</td><td>' + esc(u.role) + '</td><td>' + (u.active === false ? 'deactivated' : 'active') + '</td>' +
      '<td><form method="POST" action="/admin/users/' + u.id + '/deactivate"><input type="hidden" name="hx_origin" value="lab65"><button>Deactivate</button></form></td></tr>';
  }
  return layout(user, 'Admin panel', body + '</table>');
}
function adminInvoicesPage(user) {
  let body = '<h2>Finance report — all invoices</h2><ul>';
  for (const inv of invoices) {
    const pat = userById(inv.patientId);
    body += '<li>Invoice #' + inv.id + ' — ' + esc(pat ? pat.name : '?') + ' (' + esc(pat ? pat.email : '') + ') · Total $' + inv.total + ' · Paid $' + inv.paid + ' · ' + esc(inv.status) + '</li>';
  }
  return layout(user, 'Admin invoices', body + '</ul>');
}
function testsPage(user) {
  const fs2 = featureStats();
  let body = '<h2>Mission Board — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h2><p>' + doneCount() + '/' + TESTS.length + ' tests complete (' + pct() + '%). Tests complete by DOING the exploit — there is no "mark done" button. Hints reveal one at a time.</p>';
  for (const fname of Object.keys(fs2)) {
    body += '<h3>' + esc(fname) + ' — ' + fs2[fname].done + '/' + fs2[fname].total + ' · attempts: ' + fs2[fname].attempts + '</h3>';
    for (const t of TESTS.filter(x => x.feature === fname)) {
      body += '<div style="border:1px solid #dde;border-radius:8px;padding:10px;margin:8px 0"><b>' + (state.tests[t.id] ? '✓' : '○') + ' ' + esc(t.name) + '</b> <span style="color:#678;font-size:12px">' + esc(t.owasp) + ' · ' + esc(t.difficulty) + (state.tests[t.id] ? ' · DONE' : ' · open') + '</span>' +
        '<details style="margin-top:6px"><summary>Hints</summary><ol>' + t.hints.map(h => '<li>' + esc(h) + '</li>').join('') + '</ol></details></div>';
    }
  }
  return layout(user, 'Mission Board', body);
}
function completePage(user) {
  if (!isComplete()) {
    return layout(user, 'Not yet complete', '<h2>Lab not complete yet</h2><p>You have solved ' + doneCount() + '/' + TESTS.length + ' tests (' + pct() + '%). The completion summary, key and certificate unlock at 100%. See the <a href="/tests">Mission Board</a> for what is left.</p>');
  }
  if (!state.completedAt) { state.completedAt = new Date().toISOString(); state.keyRevealed = true; saveState(); }
  const fs2 = featureStats();
  const names = Object.keys(fs2);
  let body = '<h2>Lab complete — 100%</h2>';
  body += '<h3>1) Features in this lab</h3><p>' + names.length + ' features: ' + names.map(esc).join(', ') + '.</p>';
  body += '<h3>2) Vulnerabilities per feature</h3><ul>' + names.map(f => '<li>' + esc(f) + ': ' + fs2[f].total + ' tests</li>').join('') + '</ul>';
  body += '<h3>3) Ways testing was done (' + TESTS.length + ' techniques)</h3><ul>' + TESTS.map(t => '<li>' + esc(t.name) + ' (' + esc(t.owasp) + ')</li>').join('') + '</ul>';
  body += '<h3>4) What you learned</h3><ul>' + TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.lesson) + '</li>').join('') + '</ul>';
  body += '<h3>5) What this means for a real client</h3><ul>' + TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.impact) + '</li>').join('') + '</ul>';
  body += '<h3>6) Writing it in a real report</h3><ul>' + TESTS.map(t => '<li><b>' + esc(t.report.title) + '</b> — Severity: ' + esc(t.report.severity) + ' · Remediation: ' + esc(t.report.remediation) + '</li>').join('') + '</ul>';
  body += '<h3>Your completion key</h3><p style="font-size:18px"><code>' + esc(completionKey()) + '</code></p><p>Paste this key into Lab ' + (LAB_NUMBER + 1) + ' to unlock it.</p>';
  body += '<h3>Certificate</h3><form method="POST" action="/complete/name">Your name for the certificate<br><input name="name" value="' + esc(state.testerName || (user ? user.name : '')) + '" style="padding:8px;width:60%"><br><br><button style="padding:9px 20px">Save name</button></form><p><a href="/certificate">View your certificate</a></p>';
  return layout(user, 'Lab complete', body);
}
function certificatePage(user) {
  if (!isComplete()) return layout(user, 'Certificate', '<h2>Certificate locked</h2><p>Complete 100% of the tests to earn the certificate. Current progress: ' + pct() + '%.</p>');
  const name = state.testerName || (user ? user.name : 'Tester');
  const when = state.completedAt ? String(state.completedAt).slice(0, 10) : new Date().toISOString().slice(0, 10);
  const fcount = Object.keys(featureStats()).length;
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ' + LAB_NUMBER + '</title></head><body style="margin:0;background:#eef4f4;font-family:Georgia,serif">' +
    '<div style="max-width:720px;margin:40px auto;background:#fff;border:3px solid #0d6e6e;border-radius:8px;padding:36px;text-align:center">' +
    '<img src="/logo.png" style="height:64px"><h1 style="margin:10px 0">Certificate of Completion</h1>' +
    '<p>This certifies that</p><h2 style="margin:6px 0">' + esc(name) + '</h2>' +
    '<p>has completed 100% of the security tests in <b>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</b><br>(' + TESTS.length + ' tests across ' + fcount + ' features)</p>' +
    '<p>Completed on ' + esc(when) + '</p><p style="margin-top:22px"><b>HexaCyberLab</b> — Built by Md. Jony Hassain, Founder</p></div>' +
    '<p style="text-align:center"><a href="/complete">Back to completion summary</a></p></body></html>';
}

/* ============================ router ============================ */
function send(res, code, body, type, cookies) {
  const headers = { 'Content-Type': type || 'text/html; charset=utf-8' };
  if (cookies && cookies.length) headers['Set-Cookie'] = cookies;
  res.writeHead(code, headers); res.end(body);
}
function redirect(res, loc, cookies) {
  const headers = { Location: loc };
  if (cookies && cookies.length) headers['Set-Cookie'] = cookies;
  res.writeHead(302, headers); res.end();
}
function startSession(res, u) {
  const sid = crypto.randomBytes(12).toString('hex');
  sessions.set(sid, u.id);
  redirect(res, '/dashboard', ['hx_session=' + sid + '; Path=/; HttpOnly', 'hx_role=' + u.role + '; Path=/', 'hx_origin=lab65; Path=/']);
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://127.0.0.1:' + PORT);
    const pathname = u.pathname;
    const method = req.method;
    let body = {};
    let rawBody = '';
    if (method === 'POST') {
      rawBody = await readBody(req);
      if ((req.headers['content-type'] || '').includes('application/json')) { try { body = JSON.parse(rawBody || '{}'); } catch (e) { body = {}; } }
      else body = parseForm(rawBody);
    }

    if (pathname === '/logo.png') {
      try { const img = fs.readFileSync(path.join(ROOT, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(img); }
      catch (e) { return send(res, 404, 'no logo'); }
    }
    if (pathname === '/unlock' && method === 'POST') {
      if (String(body.key || '') === entryKey()) { state.unlocked = true; saveState(); return redirect(res, '/'); }
      return send(res, 403, 'Invalid key — this lab stays locked.');
    }
    if (pathname === '/api/chat' && method === 'POST') {
      let msg = body.message;
      if (msg === undefined && rawBody) { try { msg = JSON.parse(rawBody).message; } catch (e) { msg = parseForm(rawBody).message; } }
      return send(res, 200, JSON.stringify({ reply: chatReply(msg || '') }), 'application/json');
    }
    if (pathname === '/api/progress' && method === 'GET') {
      return send(res, 200, JSON.stringify({ lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done: doneCount(), pct: pct(), features: featureStats(), complete: isComplete() }, null, 1), 'application/json');
    }
    if (!state.unlocked) return send(res, 200, gatePage());

    const user = getSessionUser(req);
    const cookies = parseCookies(req);

    /* ---- public auth routes ---- */
    if (pathname === '/login' && method === 'GET') return send(res, 200, loginPage(u.searchParams.get('msg') || ''));
    if (pathname === '/register' && method === 'GET') return send(res, 200, registerPage());
    if (pathname === '/forgot' && method === 'GET') return send(res, 200, forgotPage());
    if (pathname === '/login' && method === 'POST') {
      attempt(F_AUTH);
      const email = String(body.email || '').toLowerCase(), pw = String(body.password || '');
      if (email) { probedEmails.add(email); if (probedEmails.size >= 5) pass('auth-enum'); }
      if (SQLI_RE.test(email) || SQLI_RE.test(pw)) { pass('auth-sqli'); return startSession(res, users[0]); }
      const usr = userByEmail(email);
      if (!usr) return send(res, 200, loginPage('No account found for that email address.'));
      if (usr.active === false) return send(res, 200, loginPage('This account has been deactivated.'));
      if (usr.password !== pw) {
        failedLogins[email] = (failedLogins[email] || 0) + 1;
        if (failedLogins[email] >= 10) pass('auth-brute');
        return send(res, 200, loginPage('Incorrect password for this account.'));
      }
      if (email === 'admin@hexadental.local' && pw === 'admin123') pass('auth-default');
      return startSession(res, usr);
    }
    if (pathname === '/register' && method === 'POST') {
      attempt(F_REG);
      const email = String(body.email || '').toLowerCase();
      if (!email || !body.password) return send(res, 200, registerPage('Email and password are required.'));
      if (userByEmail(email)) return send(res, 200, registerPage('That email is already registered.'));
      const role = String(body.role || 'patient');
      const nu = { id: nextUserId++, email, password: String(body.password), name: String(body.name || 'New Patient'), role, active: true };
      users.push(nu);
      if (String(body.password).length < 4) pass('reg-weakpw');
      if (role !== 'patient') pass('reg-mass');
      if (XSS_RE.test(nu.name)) pass('reg-xss');
      return redirect(res, '/login');
    }
    if (pathname === '/forgot' && method === 'POST') {
      attempt(F_AUTH);
      const email = String(body.email || '').toLowerCase();
      if (email) { probedEmails.add(email); if (probedEmails.size >= 5) pass('auth-enum'); }
      const usr = userByEmail(email);
      if (!usr) return send(res, 200, forgotPage('No account found for that email address.'));
      issuedResetTokens.add(resetTokenFor(usr));
      return send(res, 200, forgotPage('A reset link has been sent to that address. (Training build: paste the token into the form below.)'));
    }
    if (pathname === '/reset' && method === 'POST') {
      attempt(F_AUTH);
      const usr = userByEmail(String(body.email || '').toLowerCase());
      const token = String(body.token || '');
      if (usr && token && token === resetTokenFor(usr)) {
        if (!issuedResetTokens.has(token)) pass('auth-reset');
        usr.password = String(body.newpassword || 'changed123');
        return send(res, 200, forgotPage('Password updated — you can sign in with the new password.'));
      }
      return send(res, 200, forgotPage('That reset token is not valid.'));
    }
    if (pathname === '/logout') {
      const sid = cookies.hx_session; if (sid) sessions.delete(sid);
      return redirect(res, '/login', ['hx_session=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0']);
    }

    /* ---- platform API (token / debug) ---- */
    if (pathname === '/api/debug' && method === 'GET') {
      attempt(F_API); pass('api-debug');
      return send(res, 200, JSON.stringify({ lab: LAB_NAME, users: users.map(x => ({ id: x.id, email: x.email, password: x.password, name: x.name, role: x.role, active: x.active !== false })) }, null, 1), 'application/json');
    }
    if (pathname === '/api/me' && method === 'GET') {
      attempt(F_API);
      const h = String(req.headers.authorization || '');
      if (h.startsWith('Bearer hd_')) {
        const email = Buffer.from(h.slice(10), 'base64').toString('utf8');
        const usr = userByEmail(email);
        if (usr) { pass('api-token'); return send(res, 200, JSON.stringify({ id: usr.id, email: usr.email, name: usr.name, role: usr.role }), 'application/json'); }
      }
      return send(res, 401, JSON.stringify({ error: 'unauthorized' }), 'application/json');
    }

    /* ---- everything below needs a session ---- */
    if (!user) return redirect(res, '/login');
    if (pathname === '/' || pathname === '/dashboard') return send(res, 200, dashboardPage(user));

    if (pathname === '/profile' && method === 'GET') return send(res, 200, profilePage(user));
    if (pathname === '/profile/update' && method === 'POST') {
      attempt(F_REG);
      if (!hasMarker(body, req)) pass('prof-csrf');
      if (body.name) { if (XSS_RE.test(String(body.name))) pass('reg-xss'); user.name = String(body.name); }
      if (body.email) user.email = String(body.email).toLowerCase();
      return send(res, 200, profilePage(user, 'Profile saved.'));
    }

    if (pathname === '/appointments' && method === 'GET') return send(res, 200, appointmentsPage(user));
    if (pathname === '/appointments/new' && method === 'GET') return send(res, 200, appointmentNewPage(user));
    if (pathname === '/appointments' && method === 'POST') {
      attempt(F_APPT);
      const dentistId = Number(body.dentistId);
      const overlap = appointments.some(x => x.dentistId === dentistId && x.date === body.date && x.time === body.time && x.status === 'booked');
      appointments.push({ id: nextApptId++, patientId: user.id, dentistId, date: String(body.date || ''), time: String(body.time || ''), reason: String(body.reason || 'Checkup'), status: 'booked' });
      if (overlap) pass('appt-double');
      return redirect(res, '/appointments');
    }
    let m;
    if ((m = pathname.match(/^\/appointments\/(\d+)$/)) && method === 'GET') {
      attempt(F_APPT);
      const a = appointments.find(x => x.id === Number(m[1]));
      if (!a) return send(res, 404, 'Appointment not found');
      if (user.id !== a.patientId && user.role === 'patient') pass('appt-idor');
      return send(res, 200, appointmentPage(user, a));
    }
    if ((m = pathname.match(/^\/appointments\/(\d+)\/cancel$/)) && method === 'POST') {
      attempt(F_APPT);
      const a = appointments.find(x => x.id === Number(m[1]));
      if (!a) return send(res, 404, 'Appointment not found');
      if (user.id !== a.patientId && user.role === 'patient') pass('appt-cancel-idor');
      a.status = 'cancelled';
      return redirect(res, '/appointments');
    }

    if (pathname === '/plans' && method === 'GET') return send(res, 200, plansPage(user));
    if ((m = pathname.match(/^\/plans\/(\d+)$/)) && method === 'GET') {
      attempt(F_PLAN);
      const p = plans.find(x => x.id === Number(m[1]));
      if (!p) return send(res, 404, 'Plan not found');
      if (user.id !== p.patientId && user.role === 'patient') pass('plan-idor');
      return send(res, 200, planPage(user, p));
    }
    if ((m = pathname.match(/^\/plans\/(\d+)\/items$/)) && method === 'POST') {
      attempt(F_PLAN);
      const p = plans.find(x => x.id === Number(m[1]));
      if (!p) return send(res, 404, 'Plan not found');
      const item = CATALOG.find(c => c.name === body.name);
      const price = Number(body.price);
      const finalPrice = isNaN(price) ? (item ? item.price : 0) : price;
      if (item && !isNaN(price) && price !== item.price) pass('plan-cost');
      p.items.push({ name: String(body.name || 'Item'), price: finalPrice });
      return redirect(res, '/plans/' + p.id);
    }
    if ((m = pathname.match(/^\/plans\/(\d+)\/approve$/)) && method === 'POST') {
      attempt(F_PLAN);
      const p = plans.find(x => x.id === Number(m[1]));
      if (!p) return send(res, 404, 'Plan not found');
      const before = p.status; p.status = 'approved';
      if (user.role === 'patient' && before !== 'approved') pass('plan-approve');
      return redirect(res, '/plans/' + p.id);
    }
    if ((m = pathname.match(/^\/plans\/(\d+)\/complete$/)) && method === 'POST') {
      attempt(F_PLAN);
      const p = plans.find(x => x.id === Number(m[1]));
      if (!p) return send(res, 404, 'Plan not found');
      const before = p.status; p.status = 'completed';
      if (user.role === 'patient' && before !== 'completed') pass('plan-complete');
      return redirect(res, '/plans/' + p.id);
    }

    if (pathname === '/records' && method === 'GET') return send(res, 200, recordsPage(user));
    if ((m = pathname.match(/^\/records\/(\d+)$/)) && method === 'GET') {
      attempt(F_REC);
      const r = records.find(x => x.id === Number(m[1]));
      if (!r) return send(res, 404, 'Record not found');
      if (user.id !== r.patientId && user.role === 'patient') pass('rec-idor');
      return send(res, 200, recordPage(user, r));
    }
    if (pathname === '/download' && method === 'GET') {
      attempt(F_REC);
      const name = u.searchParams.get('file') || '';
      const resolved = path.resolve(RECORDS_DIR, name);
      try {
        const data = fs.readFileSync(resolved, 'utf8');
        if (!resolved.startsWith(RECORDS_DIR + path.sep)) pass('rec-traversal');
        return send(res, 200, data, 'text/plain; charset=utf-8');
      } catch (e) { return send(res, 404, 'File not found'); }
    }

    if (pathname === '/invoices' && method === 'GET') return send(res, 200, invoicesPage(user));
    if ((m = pathname.match(/^\/invoices\/(\d+)$/)) && method === 'GET') {
      attempt(F_INV);
      const inv = invoices.find(x => x.id === Number(m[1]));
      if (!inv) return send(res, 404, 'Invoice not found');
      if (user.id !== inv.patientId && user.role === 'patient') pass('inv-idor');
      return send(res, 200, invoicePage(user, inv));
    }
    if ((m = pathname.match(/^\/invoices\/(\d+)\/pay$/)) && method === 'POST') {
      attempt(F_INV);
      const inv = invoices.find(x => x.id === Number(m[1]));
      if (!inv) return send(res, 404, 'Invoice not found');
      const amount = Number(body.amount) || 0;
      if (amount > 0 && inv.status !== 'paid') {
        inv.paid += amount;
        if (inv.paid >= inv.total) inv.status = 'paid';
        else { inv.status = 'paid'; pass('inv-pay-tamper'); }
      }
      return redirect(res, '/invoices/' + inv.id);
    }
    if (pathname === '/payment-plans' && method === 'POST') {
      attempt(F_INV);
      const months = Number(body.months) || 3;
      const apr = Number(body.apr);
      paymentPlans.push({ id: nextPPId++, patientId: user.id, invoiceId: Number(body.invoiceId) || 0, months, apr: isNaN(apr) ? 5 : apr, status: 'active' });
      if (months > 12 || (!isNaN(apr) && apr < 5)) pass('pp-terms');
      return redirect(res, '/invoices');
    }

    if (pathname === '/dentist' && method === 'GET') {
      attempt(F_PLAN);
      if (['dentist', 'hygienist', 'admin'].includes(user.role)) return send(res, 200, dentistPage(user));
      if (['dentist', 'hygienist', 'admin'].includes(String(cookies.hx_role || ''))) { pass('auth-cookie'); return send(res, 200, dentistPage(user)); }
      return send(res, 403, 'Dentists only.');
    }
    if (pathname === '/admin' && method === 'GET') {
      attempt(F_ADMIN);
      if (user.role === 'admin') return send(res, 200, adminPage(user));
      if (String(cookies.hx_role || '') === 'admin') { pass('auth-cookie'); return send(res, 200, adminPage(user)); }
      return send(res, 403, 'Admins only.');
    }
    if (pathname === '/admin/invoices' && method === 'GET') {
      attempt(F_ADMIN);
      if (user.role !== 'admin') pass('admin-bac');
      return send(res, 200, adminInvoicesPage(user));
    }
    if ((m = pathname.match(/^\/admin\/users\/(\d+)\/deactivate$/)) && method === 'POST') {
      const isAdmin = user.role === 'admin' || String(cookies.hx_role || '') === 'admin';
      if (!isAdmin) return send(res, 403, 'Admins only.');
      attempt(F_ADMIN);
      const target = userById(Number(m[1]));
      if (target) {
        if (!hasMarker(body, req)) pass('admin-csrf');
        target.active = false;
      }
      return redirect(res, '/admin');
    }

    if (pathname === '/tests' && method === 'GET') return send(res, 200, testsPage(user));
    if (pathname === '/complete' && method === 'GET') return send(res, 200, completePage(user));
    if (pathname === '/complete/name' && method === 'POST') {
      state.testerName = String(body.name || ''); saveState();
      return redirect(res, '/complete');
    }
    if (pathname === '/certificate' && method === 'GET') return send(res, 200, certificatePage(user));

    return send(res, 404, 'Not found');
  } catch (err) {
    try { send(res, 200, 'Something went wrong, but the lab is still running.'); } catch (e) {}
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' listening on http://127.0.0.1:' + PORT);
});
