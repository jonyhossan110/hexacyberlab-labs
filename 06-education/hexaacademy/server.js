'use strict';
/*
 * HexaAcademy — LAB 52 of 110 (Category 6: Education & E-learning)
 * A deliberately vulnerable online course academy for hands-on web pentesting practice.
 * LOCAL USE ONLY. Zero-dependency Node.js (built-ins only). Binds 127.0.0.1:3061.
 * All students, instructors, courses, payments and certificates are FAKE seed data —
 * nothing here connects to any real school, payment processor or person.
 * Built by Md. Jony Hassain, Founder of HexaCyberLab.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3061;
const LAB_NUMBER = 52;
const LAB_NAME = 'HexaAcademy';
const PREV_LAB = 51;
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');

/* ------------------------------------------------------------------ *
 * Key material lives ONLY as encoded fragments, scattered through    *
 * this file and reassembled in memory at the moment of use.          *
 * ------------------------------------------------------------------ */

const _cA = ['TC1YSA==', 'Ni0zNQ==', 'NVpJRg=='];
function _un(a) {
  return a.map(s => [...Buffer.from(s, 'base64').toString('utf8')].reverse().join('')).join('');
}

/* ============================ seed data ============================ */
/* Academy users. Roles: admin / instructor / student. */
const users = [
  { id: 1, email: 'admin@hexaacademy.local', password: 'admin123', name: 'Platform Admin', role: 'admin', bio: 'Runs the HexaAcademy platform.', active: true },
  { id: 2, email: 'prof@hexaacademy.local', password: 'Prof@123', name: 'Dr. Maya Chen', role: 'instructor', bio: 'Security researcher teaching web security and JavaScript.', active: true },
  { id: 3, email: 'diego@hexaacademy.local', password: 'Diego@123', name: 'Diego Alvarez', role: 'instructor', bio: 'API engineer teaching Python and API security.', active: true },
  { id: 4, email: 'alice@hexaacademy.local', password: 'Alice@123', name: 'Alice Rahman', role: 'student', bio: '', active: true },
  { id: 5, email: 'bob@hexaacademy.local', password: 'Bob@1234', name: 'Bob Hossain', role: 'student', bio: '', active: true },
  { id: 6, email: 'carol@hexaacademy.local', password: 'Carol@123', name: 'Carol Dsouza', role: 'student', bio: '', active: true }
];
/* Courses — records only, all simulated. published=false means a draft nobody should see yet. */
const courses = [
  { id: 1, title: 'Web Security Fundamentals', instructorId: 2, price: 199, lessons: 10, published: true, category: 'Security' },
  { id: 2, title: 'JavaScript for Beginners', instructorId: 2, price: 89, lessons: 8, published: true, category: 'Development' },
  { id: 3, title: 'Python API Bootcamp', instructorId: 3, price: 149, lessons: 12, published: true, category: 'Development' },
  { id: 4, title: 'Advanced Burp Suite Mastery', instructorId: 3, price: 249, lessons: 9, published: true, category: 'Security' },
  { id: 5, title: 'Secret Launch: AI Pentesting', instructorId: 2, price: 299, lessons: 6, published: false, category: 'Security' }
];
/* Bundles — a priced set of courses. */
const bundles = [
  { id: 1, title: 'Full-Stack Security Bundle', courseIds: [1, 4], price: 349 },
  { id: 2, title: 'Developer Starter Bundle', courseIds: [2, 3], price: 179 }
];
/* Enrollments — who is learning what, how far they got, what they paid. */
let enrollments = [
  { id: 1, userId: 4, courseId: 1, amountPaid: 199, lessonsDone: 4, watched: [1, 2, 3, 4], refunded: false, certIssued: false },
  { id: 2, userId: 5, courseId: 3, amountPaid: 149, lessonsDone: 12, watched: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], refunded: false, certIssued: true },
  { id: 3, userId: 6, courseId: 2, amountPaid: 89, lessonsDone: 0, watched: [], refunded: false, certIssued: false }
];
/* Coupons — WELCOME50/STUDENT20 are multi-use; VIP100 was the single-use launch code. */
const coupons = [
  { code: 'WELCOME50', pct: 50, singleUse: false, usedBy: null },
  { code: 'STUDENT20', pct: 20, singleUse: false, usedBy: null },
  { code: 'VIP100', pct: 100, singleUse: true, usedBy: null }
];
let payouts = [];
let nextUserId = 7, nextEnrollmentId = 4, nextPayoutId = 1;
function userById(id) { return users.find(u => u.id === id); }
function courseById(id) { return courses.find(c => c.id === id); }
function bundleById(id) { return bundles.find(b => b.id === id); }
function enrollmentById(id) { return enrollments.find(e => e.id === id); }
function money(n) { return '$' + Number(n).toFixed(2); }
function earningsOf(instructorId) {
  const mine = courses.filter(c => c.instructorId === instructorId).map(c => c.id);
  const gross = enrollments.filter(e => mine.includes(e.courseId) && !e.refunded).reduce((s, e) => s + e.amountPaid, 0);
  const earned = Math.round(gross * 0.7 * 100) / 100;
  const paidOut = payouts.filter(p => p.instructorId === instructorId).reduce((s, p) => s + p.amount, 0);
  return { gross, earned, paidOut, balance: Math.round((earned - paidOut) * 100) / 100 };
}

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
  'Course Catalogue & Search',
  'Enrollments & Payments',
  'Learning & Certificates',
  'Instructor Dashboard',
  'Admin Panel',
  'Platform & API'
];
const TESTS = [
  /* ---------------- Login & Authentication ---------------- */
  { id: 'sqli-login', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03 Injection', difficulty: 'Beginner',
    hints: ['The academy login still routes through a legacy sign-on service that builds its query by gluing your email into a string.', 'A tautology in the email field makes the WHERE clause true for the very first row in the user table — who sits in row 1 of an academy\'s user table?', "Log in with the email: ' OR '1'='1' --  and any password."],
    lesson: 'String-built queries let attacker input change the meaning of the query itself; the first matching row (here the platform admin) is returned with no password check at all.',
    impact: 'On a real learning platform this is total compromise: one crafted login reaches the admin account — every student record, payment record and certificate behind it.',
    report: { title: 'SQL Injection in Academy Login (Authentication Bypass)', severity: 'Critical', remediation: 'Use parameterised queries everywhere; never build SQL by string concatenation; add regression tests with injection payloads on all auth endpoints.' },
    guide: "Step by step: 1) Open the login page. 2) Enter the email ' OR '1'='1' --  with any password. 3) The legacy query becomes true for the first user row and a session is issued — as the platform admin. 4) The test completes when that bypass session is created." },
  { id: 'brute-force', feature: 'Login & Authentication', name: 'Brute Force — No Lockout or Throttle', owasp: 'A07 Authentication Failures', difficulty: 'Beginner',
    hints: ['Pick one student account and keep guessing its password. Does anything slow down, CAPTCHA, or lock after repeated failures?', 'A learning platform should lock or throttle after a handful of failures. Count how many this one accepts.', 'Submit 10 wrong-password logins for alice@hexaacademy.local — the 10th is still processed normally.'],
    lesson: 'Without rate limiting or lockout, online password guessing is only a matter of time — students reuse passwords, so credential lists work well here.',
    impact: 'An attacker can grind through password lists against student and instructor logins undisturbed; every weak password becomes a hijacked account with paid courses attached.',
    report: { title: 'Missing Brute-Force Protection on Academy Login', severity: 'High', remediation: 'Add progressive delays, per-account and per-IP throttling, lockout with safe unlock, and alerting on credential-stuffing patterns.' },
    guide: 'Step by step: 1) Choose alice@hexaacademy.local. 2) Submit 10 login attempts with wrong passwords (a small curl loop works). 3) Every attempt is processed at full speed — nothing locks or slows. 4) The test completes at the 10th processed failure.' },
  { id: 'user-enumeration', feature: 'Login & Authentication', name: 'Account Enumeration via Password Reset', owasp: 'A07 Authentication Failures', difficulty: 'Beginner',
    hints: ['Use "Forgot password" twice: once with an email that has an account, once with one that does not. Compare the two answers word for word.', 'A safe reset flow answers identically either way. This one does not.', 'Request a reset for alice@hexaacademy.local, then for nobody@nowhere.local — the different messages confirm which emails are registered.'],
    lesson: 'Different responses for existing vs non-existing accounts hand attackers a verified list of registered students and instructors to aim phishing and password attacks at.',
    impact: 'Attackers harvest the academy\'s real user emails from the reset form, then target exactly those people with phishing and credential stuffing.',
    report: { title: 'Account Enumeration via Password-Reset Responses', severity: 'Medium', remediation: 'Return one identical, generic message for every reset request regardless of whether the account exists.' },
    guide: 'Step by step: 1) POST /forgot with alice@hexaacademy.local — note the "reset link sent" message. 2) POST /forgot with a made-up email — note the different "no account" message. 3) Observing both answers completes the test: the difference is the leak.' },
  { id: 'default-creds', feature: 'Login & Authentication', name: 'Default Admin Credentials', owasp: 'A07 Authentication Failures', difficulty: 'Beginner',
    hints: ['Somewhere in this academy there is an administrative account that was never given a real password.', 'Try the most common admin password in the world against the admin mailbox.', 'Log in as admin@hexaacademy.local with the password admin123.'],
    lesson: 'Default and vendor-supplied credentials are public knowledge; any privileged account still using one is an open door with a welcome mat.',
    impact: 'The platform admin account — able to deactivate users and see everything — is protected by the first password every attacker tries.',
    report: { title: 'Default Credentials on Platform Admin Account', severity: 'Critical', remediation: 'Force unique, strong passwords at first setup; scan all privileged accounts for known default passwords and rotate them.' },
    guide: 'Step by step: 1) Go to the login page. 2) Sign in as admin@hexaacademy.local / admin123. 3) You are in as Platform Admin. The test completes on that login.' },
  { id: 'reset-token', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07 Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a reset for your own account and study the token format — it is computed, not random.', 'The token is a simple arithmetic function of the user\'s numeric ID.', 'Token = ACA-(userId × 167 + 41). Dr. Maya Chen is user 2 — compute her token and reset her password without ever requesting a reset for her.'],
    lesson: 'Reset tokens must be high-entropy random values; a token derived from a public identifier (user ID) lets anyone reset anyone\'s password.',
    impact: 'An attacker who knows a victim\'s user ID — visible in instructor profile URLs all over the site — can take over their account in one request, no email access needed.',
    report: { title: 'Predictable Password-Reset Tokens Allow Account Takeover', severity: 'Critical', remediation: 'Generate reset tokens from a CSPRNG (≥128 bits), store only a hash, expire them quickly and make them single-use.' },
    guide: 'Step by step: 1) Request a reset for your own account and note the token shape ACA-<number>. 2) Reverse the formula: number = userId × 167 + 41. 3) POST /reset for prof@hexaacademy.local (user 2) with the computed token and a new password — never having requested it. 4) The change is accepted; the test completes.' },
  { id: 'cookie-role', feature: 'Login & Authentication', name: 'Session Cookie Role Tampering', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Your session cookie is just base64 JSON — decode it and read what it claims about you.', 'The admin panel trusts the role written inside the cookie instead of the role stored on your account.', 'Decode hx_sess, change "role" to "admin", re-encode, and open /admin as an ordinary student.'],
    lesson: 'Authorisation data must live server-side; anything the client can edit — including a role inside their own cookie — will be edited.',
    impact: 'Every student can promote themselves to admin by editing a cookie, reaching the panel that can deactivate accounts and list every user.',
    report: { title: 'Client-Controlled Role in Session Cookie Enables Privilege Escalation', severity: 'Critical', remediation: 'Keep roles server-side in the session store; if claims travel in a cookie, sign them (HMAC) and verify before trusting any field.' },
    guide: 'Step by step: 1) Log in as any student and copy the hx_sess cookie. 2) Base64-decode it — it is plain JSON with your role. 3) Change role to admin, re-encode, replace the cookie. 4) Open /admin — the panel opens for a student account. The test completes.' },

  /* ---------------- Registration & Profile ---------------- */
  { id: 'weak-password', feature: 'Registration & Profile', name: 'Weak Password Policy at Registration', owasp: 'A07 Authentication Failures', difficulty: 'Beginner',
    hints: ['Open a new academy account and try the shortest, simplest password the form will accept.', 'A platform holding payment data should demand length and complexity. This one demands almost nothing.', 'Register with the password "abc" — it is accepted.'],
    lesson: 'Password policy is set at registration; if 3-character passwords are allowed, brute force and guessing become trivial against those accounts.',
    impact: 'Students who choose weak passwords (many will) get accounts that fall to the first guessing attempt — with their paid courses and certificates attached.',
    report: { title: 'No Minimum Password Strength for New Academy Accounts', severity: 'Medium', remediation: 'Enforce a modern password policy (length ≥ 12, breached-password screening) at registration and password change.' },
    guide: 'Step by step: 1) Open /register. 2) Create an account with a 3-character password such as abc. 3) The account is created without complaint. The test completes.' },
  { id: 'mass-assignment', feature: 'Registration & Profile', name: 'Mass Assignment — Self-Appointed Instructor or Admin', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration handler copies every submitted field onto the new account record — including fields the form never shows.', 'What field on an account record decides what the user is allowed to do? Think role.', 'Register while adding the extra form field role=instructor (or role=admin) — the new account is created with it.'],
    lesson: 'Binding request bodies directly to data models lets attackers set privileged fields (here the account role) that the UI never offered.',
    impact: 'Attackers mint themselves instructor or admin accounts at will — they can publish courses, reach the earnings tooling, or walk straight into administration.',
    report: { title: 'Mass Assignment in Registration Allows Role Escalation', severity: 'High', remediation: 'Whitelist assignable fields explicitly on registration; set the account role server-side only.' },
    guide: 'Step by step: 1) Submit the registration form with the extra field role=instructor added to the POST body. 2) Log in with the new account. 3) It carries the instructor role you assigned yourself. The test completes.' },
  { id: 'stored-xss-profile', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03 Injection', difficulty: 'Beginner',
    hints: ['Your display name is printed back on pages other people see — including instructors and admins. Is it escaped anywhere?', 'Set your name to something that is not just text.', 'Save your profile with the display name <script>alert(1)</script> — it is stored and reflected raw.'],
    lesson: 'User-controlled names must be output-encoded everywhere they render; a name field is a classic stored-XSS carrier because it is shown to staff and other users.',
    impact: 'A student plants script in their own name; when an instructor or admin opens a user list, the script runs in the academy\'s origin with their session.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Output-encode all user data at render time and validate name fields against a strict character whitelist.' },
    guide: 'Step by step: 1) Log in and open /profile. 2) Set your display name to <script>alert(1)</script> and save. 3) The payload is stored and rendered unescaped. The test completes on save.' },
  { id: 'csrf-profile', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The profile form carries a hidden _origin marker that ties the submit to this site. What happens if a POST arrives without it?', 'Nothing checks the marker on the server.', 'POST /profile with a new name and NO _origin field — the change is applied anyway.'],
    lesson: 'State-changing forms need server-verified anti-CSRF tokens; a hidden field that is never checked is decoration, not protection.',
    impact: 'Any website a logged-in user visits can silently rewrite their profile (name, bio) — the first step in social-engineering the academy\'s support desk.',
    report: { title: 'Missing CSRF Validation on Profile Update', severity: 'Medium', remediation: 'Verify a per-session anti-CSRF token server-side on every state-changing request; reject requests that lack it.' },
    guide: 'Step by step: 1) While logged in, POST /profile directly (curl) with a new name and no _origin field. 2) The profile changes. 3) The test completes when a marker-less update is applied.' },

  /* ---------------- Course Catalogue & Search ---------------- */
  { id: 'search-sqli', feature: 'Course Catalogue & Search', name: 'SQL Injection in Course Search Reveals Draft Courses', owasp: 'A03 Injection', difficulty: 'Intermediate',
    hints: ['The course search still builds its filter by gluing your query into a string — and the catalogue table holds more than published courses.', 'An injection in the search makes the filter true for every row, including the ones students must never see.', "Search for: ' OR '1'='1 — the unpublished draft course appears in the results."],
    lesson: 'Search filters built by string concatenation are injectable like any other query; here the injection bypasses the published-only filter and leaks unreleased content.',
    impact: 'Attackers (and competitors) enumerate the academy\'s entire catalogue — including unreleased courses, their pricing and their instructors — before launch.',
    report: { title: 'SQL Injection in Course Search Exposes Unpublished Courses', severity: 'High', remediation: 'Use parameterised queries for search filters; enforce the published-only condition server-side regardless of the search term.' },
    guide: "Step by step: 1) Open /search. 2) Search for ' OR '1'='1. 3) The results include the unpublished draft course 'Secret Launch: AI Pentesting'. 4) The test completes when a draft course is served by the injected search." },
  { id: 'search-xss', feature: 'Course Catalogue & Search', name: 'Reflected XSS in Course Search', owasp: 'A03 Injection', difficulty: 'Beginner',
    hints: ['The search page echoes your query into the results heading: "Results for …".', 'Echoed input that is not encoded is reflected XSS.', 'Search for <script>alert(1)</script> — the payload comes back raw in the page.'],
    lesson: 'Reflected input must be output-encoded; search boxes are a reliable way to fire script inside another user\'s session when the link is shared.',
    impact: 'An attacker sends a student or instructor a crafted search link; the script runs in their browser, inside the academy origin, with their session attached.',
    report: { title: 'Reflected Cross-Site Scripting in Course Search', severity: 'High', remediation: 'Output-encode the reflected query and all result fields; add a Content-Security-Policy as defence in depth.' },
    guide: 'Step by step: 1) Open /search?q=<script>alert(1)</script>. 2) The page reflects the payload unescaped. 3) The test completes when the payload is reflected.' },

  /* ---------------- Enrollments & Payments ---------------- */
  { id: 'price-tamper', feature: 'Enrollments & Payments', name: 'Checkout Price Tampering', owasp: 'A04 Insecure Design', difficulty: 'Beginner',
    hints: ['The checkout form carries the course price in a hidden field — and the server believes whatever comes back.', 'Hidden fields are visible, editable text to anyone with dev tools or curl.', 'Enroll in the $199 course while posting price=1 — you are enrolled for one dollar.'],
    lesson: 'Prices must always be recomputed server-side from the catalogue; a price that travels through the client is a price the client chooses.',
    impact: 'Every paid course on the platform can be bought for a dollar (or a cent) — the academy\'s entire revenue model collapses while the enrolments look legitimate.',
    report: { title: 'Client-Supplied Price Trusted at Checkout (Price Tampering)', severity: 'Critical', remediation: 'Recompute the price server-side from the catalogue at checkout; ignore any client-supplied amount; reconcile payments against catalogue prices.' },
    guide: 'Step by step: 1) Log in as a student and open a paid course. 2) POST /checkout with type=course, the course id, and price=1 instead of the catalogue price. 3) The enrolment is created and $1 is recorded as paid. The test completes.' },
  { id: 'coupon-stacking', feature: 'Enrollments & Payments', name: 'Coupon Stacking Beyond the Intended Discount', owasp: 'A04 Insecure Design', difficulty: 'Intermediate',
    hints: ['The checkout accepts TWO coupon fields. The marketing team intended one coupon per order.', 'What happens when a 50% coupon and a 20% coupon are applied to the same enrolment, one after the other?', 'Check out with coupon1=WELCOME50 and coupon2=STUDENT20 — both discounts apply.'],
    lesson: 'Discount rules are business logic and must be enforced server-side; if the client can present two coupons and the server applies both, the intended maximum discount is fiction.',
    impact: 'Students combine every promotion the academy has ever issued, driving course prices toward zero — a slow, quiet revenue bleed that looks like normal sales.',
    report: { title: 'Multiple Coupons Stacked in a Single Order', severity: 'High', remediation: 'Allow at most one coupon per order server-side; validate coupon combinations against the promotion\'s terms before applying any discount.' },
    guide: 'Step by step: 1) Check out a course. 2) Submit coupon1=WELCOME50 and coupon2=STUDENT20 together. 3) Both discounts are applied to the enrolment amount. The test completes when two coupons land on one order.' },
  { id: 'coupon-reuse', feature: 'Enrollments & Payments', name: 'Single-Use Coupon Reused', owasp: 'A04 Insecure Design', difficulty: 'Intermediate',
    hints: ['The VIP100 launch coupon was meant to be used exactly once — ever. The system notes who used it…', '…but on the second presentation, does anything actually stop it?', 'Use VIP100 on one enrolment. Then use it again on another — it works again.'],
    lesson: 'Single-use promotions need an atomic server-side check at redemption time; recording usage without enforcing it is bookkeeping, not control.',
    impact: 'A one-off 100%-off launch coupon becomes an unlimited free-courses code shared across the internet — every course free, forever.',
    report: { title: 'Single-Use Coupon Accepted Multiple Times', severity: 'High', remediation: 'Enforce redemption limits server-side with an atomic check-and-mark at checkout; reject already-redeemed single-use codes.' },
    guide: 'Step by step: 1) Check out any course with coupon1=VIP100 — it applies (first, legitimate use). 2) Check out another course with coupon1=VIP100 again. 3) It applies a second time. The test completes on the second redemption.' },
  { id: 'bundle-tamper', feature: 'Enrollments & Payments', name: 'Bundle Total Tampering', owasp: 'A04 Insecure Design', difficulty: 'Intermediate',
    hints: ['The bundle checkout sends a "total" field computed in the browser from the bundle\'s parts.', 'The server charges the total it is given instead of summing the catalogue itself.', 'Buy the $349 bundle while posting total=10 — the whole bundle is yours for ten dollars.'],
    lesson: 'Any total computed client-side — bundle sums, shipping, taxes — must be recomputed server-side; otherwise the checkout is an honour system.',
    impact: 'Curated bundles, the academy\'s highest-value products, sell for whatever the buyer types — premium content at pocket-change prices.',
    report: { title: 'Client-Supplied Bundle Total Trusted at Checkout', severity: 'High', remediation: 'Compute bundle prices server-side from the bundle definition; never accept a client-computed total.' },
    guide: 'Step by step: 1) Open a bundle page. 2) POST /checkout with type=bundle, the bundle id, and total=10. 3) Enrolments for every course in the bundle are created at the tampered total. The test completes.' },
  { id: 'refund-abuse', feature: 'Enrollments & Payments', name: 'Refund Kept After Certificate Issued', owasp: 'A04 Insecure Design', difficulty: 'Advanced',
    hints: ['Policy says: no refunds once a certificate has been issued for a course. Policies printed in text are not controls.', 'The refund endpoint never asks whether a certificate exists for the enrolment.', 'Get a certificate issued for an enrolment (see the Learning & Certificates feature), then POST a refund for that same enrolment — the money comes back AND the certificate stays.'],
    lesson: 'Refund logic must check the fulfilment state (certificate issued, course consumed) before returning money; otherwise buyers keep the credential and the cash.',
    impact: 'Students harvest certificates for free: claim a course, take the certificate, refund in full. The academy pays out and the credential keeps circulating.',
    report: { title: 'Refunds Processed After Certificate Issuance', severity: 'High', remediation: 'Block refunds server-side once a certificate is issued (or revoke the certificate atomically with the refund); log refund-after-issue attempts.' },
    guide: 'Step by step: 1) Have a certificate issued for one of your enrolments. 2) POST /enrollments/<id>/refund for that enrolment. 3) The refund is recorded while the certificate remains issued. The test completes.' },

  /* ---------------- Learning & Certificates ---------------- */
  { id: 'enrollment-idor', feature: 'Learning & Certificates', name: 'Enrollment IDOR — Another Student\'s Progress', owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    hints: ['Your enrolment pages live at /enrollments/<id> with small sequential ids.', 'The page checks that you are logged in — but does it check the enrolment is yours?', 'Log in as Alice (enrolment 1) and open /enrollments/2 — Bob\'s course progress, in full.'],
    lesson: 'Every object reference needs an ownership check; sequential IDs plus login-only checks expose every student\'s learning record to every other student.',
    impact: 'Students browse each other\'s progress, completions and certificates — and harvest the enrolment ids that feed the refund and certificate flaws.',
    report: { title: 'Insecure Direct Object Reference on Enrollment Records', severity: 'High', remediation: 'Authorise every enrolment read against the session user (the owner, or the course\'s instructor); return 404 for foreign enrolment ids.' },
    guide: 'Step by step: 1) Log in as Alice. 2) Open /enrollments/2. 3) Bob\'s enrolment and progress render for you. The test completes when a foreign enrolment is served.' },
  { id: 'progress-tamper', feature: 'Learning & Certificates', name: 'Progress Tampering — Completion Without Watching', owasp: 'A04 Insecure Design', difficulty: 'Intermediate',
    hints: ['The progress form posts a "lessons completed" number. The server stores whatever number arrives.', 'Watching lessons is one path to progress. Posting the number directly is another.', 'POST /enrollments/<your id>/progress with lessons set to the course\'s full lesson count — progress jumps to 100% with zero lessons watched.'],
    lesson: 'Learning progress must be derived from server-tracked events (lessons actually served and completed); a client-supplied counter is fiction waiting to be typed.',
    impact: 'Students "complete" courses in one request, unlocking certificates without learning anything — the credential stops meaning anything.',
    report: { title: 'Client-Supplied Progress Counter Trusted (Completion Forgery)', severity: 'High', remediation: 'Derive progress server-side from per-lesson completion records; ignore client-supplied progress values.' },
    guide: 'Step by step: 1) Pick one of your enrolments with 0 lessons watched. 2) POST /enrollments/<id>/progress with lessons equal to the course\'s lesson count. 3) Progress shows 100%. The test completes when full progress is recorded with no lessons watched.' },
  { id: 'certificate-forgery', feature: 'Learning & Certificates', name: 'Certificate Issued Without Completing the Course', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Course certificates live at /certificates/<enrolmentId>. The issuer is supposed to check the course was completed.', 'It checks that an enrolment exists — and stops checking there.', 'Enrol in a course (0% progress) and open its certificate URL — a certificate is issued in your name.'],
    lesson: 'Credential issuance must verify the earning condition (here: genuine 100% progress) at issue time; the existence of a related record is not proof of achievement.',
    impact: 'Anyone can mint genuine-looking academy certificates for courses they never took — employers trust the credential, and the academy\'s name carries the fraud.',
    report: { title: 'Certificates Issued Without Course Completion', severity: 'Critical', remediation: 'Verify completion server-side at issuance (progress derived from lesson records); bind each certificate to the earner and let verifiers check issuance state.' },
    guide: 'Step by step: 1) Enrol in a course and watch nothing (0% progress). 2) Open /certificates/<enrolmentId>. 3) A certificate is issued in your name despite the incomplete course. The test completes.' },

  /* ---------------- Instructor Dashboard ---------------- */
  { id: 'earnings-idor', feature: 'Instructor Dashboard', name: 'Instructor Earnings IDOR', owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    hints: ['Earnings dashboards live at /instructor/<userId>/earnings. Instructor ids are the small user ids you see in profile URLs.', 'The dashboard checks that someone is logged in — not that the earnings are theirs.', 'As any student, open /instructor/2/earnings — Dr. Chen\'s revenue, course by course.'],
    lesson: 'Financial dashboards are objects like any other: they need ownership checks, or every user can read every instructor\'s income.',
    impact: 'Instructors\' earnings — commercially sensitive numbers — are visible to every registered user, poisoning trust and inviting targeted social engineering.',
    report: { title: 'Insecure Direct Object Reference on Instructor Earnings', severity: 'High', remediation: 'Authorise earnings views to the owning instructor (or finance admins); return 404 for foreign instructor ids.' },
    guide: 'Step by step: 1) Log in as any student. 2) Open /instructor/2/earnings. 3) Dr. Chen\'s earnings dashboard renders for you. The test completes when foreign earnings are served.' },
  { id: 'payout-tamper', feature: 'Instructor Dashboard', name: 'Payout Request Exceeds Earnings Balance', owasp: 'A04 Insecure Design', difficulty: 'Advanced',
    hints: ['The payout form asks the instructor how much to pay out. The server records the request…', '…without ever comparing it to what the instructor actually earned.', 'As an instructor, POST /instructor/payout with an amount far above your earnings balance — the payout is recorded in full.'],
    lesson: 'Money-out requests must be validated against the server-side balance at request time; otherwise a payout form is a cheque the user writes to themselves.',
    impact: 'Instructors drain the platform: request payouts larger than their earnings and the academy pays out money that was never earned.',
    report: { title: 'Payouts Accepted Above the Instructor\'s Earnings Balance', severity: 'Critical', remediation: 'Validate payout amounts server-side against the available balance; hold payouts for finance review above a threshold.' },
    guide: 'Step by step: 1) Log in as an instructor and note your earnings balance on your dashboard. 2) POST /instructor/payout with amount=99999. 3) The payout is recorded despite exceeding the balance. The test completes.' },
  { id: 'instructor-impersonation', feature: 'Instructor Dashboard', name: 'Edit Another Instructor\'s Public Profile', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Instructor profile edits post to /instructors/<id>/profile — the same id you see on their public page.', 'The handler updates whichever profile the id names. It never asks whose session this is.', 'As a student (or a rival instructor), POST a new name and bio for instructor 3 — Diego\'s public page now says what you wrote.'],
    lesson: 'Profile mutations must be scoped to the session user; an id in the URL is an address, not a permission.',
    impact: 'Rivals or trolls rewrite instructors\' public names and bios — defamation, fake endorsements and course links planted under a trusted name.',
    report: { title: 'Missing Ownership Check on Instructor Profile Editing (Impersonation)', severity: 'High', remediation: 'Require the session user to be the profile owner (or an admin) on every profile mutation; audit profile changes.' },
    guide: 'Step by step: 1) Log in as anyone who is not instructor 3. 2) POST /instructors/3/profile with a new name and bio. 3) Instructor 3\'s public profile changes. The test completes when a foreign profile is modified.' },

  /* ---------------- Admin Panel ---------------- */
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'CSRF on Admin User Deactivation', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The admin panel can deactivate a user account with one POST. The form\'s _origin marker is, once again, never verified.', 'If you hold an admin session (see the cookie test), a marker-less POST will still deactivate the account.', 'As admin, POST /admin/users/5/deactivate with no _origin — Bob is locked out of the academy.'],
    lesson: 'High-impact admin actions need verified anti-CSRF tokens (and ideally re-authentication); otherwise any page an admin views can weaponise their session.',
    impact: 'A booby-trapped page deactivates students and instructors en masse while the admin browses — a denial-of-service against the whole academy.',
    report: { title: 'Cross-Site Request Forgery on Admin User Deactivation', severity: 'High', remediation: 'Verify anti-CSRF tokens on all admin mutations; require step-up re-authentication for account deactivation.' },
    guide: 'Step by step: 1) Hold an admin session (the real admin login, or the forged cookie from the cookie-role test). 2) POST /admin/users/5/deactivate with no _origin field. 3) Bob\'s account is deactivated. The test completes when the marker-less deactivation is applied.' },

  /* ---------------- Platform & API ---------------- */
  { id: 'api-token', feature: 'Platform & API', name: 'Predictable API Token & Unscoped Enrollment API', owasp: 'A07 Authentication Failures', difficulty: 'Advanced',
    hints: ['Your profile page shows your API token. Look at its shape: ha_ plus base64 of something you already know.', 'If tokens are derived from email addresses, every user\'s token is public knowledge. And the API does not scope its answer.', 'Compute the token for bob@hexaacademy.local and call GET /api/enrollments with header X-API-Key — enrolments from every student come back.'],
    lesson: 'API credentials must be high-entropy and random, and every API response must be scoped to the authenticated user; a derived token plus an unscoped query is total exposure.',
    impact: 'Anyone who knows a user\'s email (public) owns their API access — and the API hands over every student\'s enrolments, amounts paid and certificate status.',
    report: { title: 'Predictable API Tokens and Missing User Scoping in Enrollment API', severity: 'Critical', remediation: 'Issue random, revocable API keys (hashed at rest); enforce per-user scoping on every API query.' },
    guide: 'Step by step: 1) See your own token pattern on /profile: ha_ + base64(your email). 2) Derive Bob\'s token from bob@hexaacademy.local the same way. 3) GET /api/enrollments with that X-API-Key. 4) Enrolments belonging to other students are included. The test completes.' },
  { id: 'debug-exposure', feature: 'Platform & API', name: 'Debug Endpoint Dumps User Passwords', owasp: 'A05 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['A leftover /debug endpoint answers any logged-in user with the academy\'s internal state.', 'Internal state here includes the full user table — passwords in plain text.', 'Log in as any student and open /debug.'],
    lesson: 'Debug and diagnostic endpoints must never ship to production; when they expose credential material, one request compromises every account at once.',
    impact: 'One click hands an attacker every student\'s, instructor\'s and the admin\'s password in clear text — total academy-wide account takeover.',
    report: { title: 'Debug Endpoint Exposes All User Credentials', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; never store or display plaintext passwords; audit for other diagnostic routes.' },
    guide: 'Step by step: 1) Log in as any ordinary student. 2) Open /debug. 3) The JSON dump includes every user with their plaintext password. The test completes when a non-admin receives the dump.' }
];

/* --------- remaining key fragments (see note at top of file) --------- */

const _cB = ['LVkzRg==', 'WjMyVw==', 'WFVDQQ=='];
const ENTRY_KEY_SHA256 = '8760f42c673a48932562433884b87e1b2c02b25b5073143296649138b2a2b97d';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */
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
function apiTokenFor(user) { return 'ha_' + Buffer.from(user.email, 'utf8').toString('base64'); }
function resetTokenFor(user) { return 'ACA-' + (user.id * 167 + 41); }
const issuedResetTokens = new Set();
const loginFails = {};
const forgotOutcomes = {};

/* ============================ chatbot (§6) ============================ */
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
const FEATURE_WORDS = [
  ['Login & Authentication', ['login', 'auth', 'password', 'brute', 'reset', 'session', 'cookie', 'sqli', 'enumerat']],
  ['Registration & Profile', ['register', 'registration', 'signup', 'sign up', 'profile', 'mass assignment']],
  ['Instructor Dashboard', ['instructor', 'earnings', 'payout', 'dashboard']],
  ['Enrollments & Payments', ['enroll', 'payment', 'checkout', 'coupon', 'price', 'bundle', 'refund']],
  ['Learning & Certificates', ['learn', 'progress', 'certificate', 'lesson']],
  ['Admin Panel', ['admin', 'deactivate', 'panel']],
  ['Platform & API', ['api', 'token', 'debug', 'platform']],
  ['Course Catalogue & Search', ['course', 'catalogue', 'catalog', 'search', 'draft']]
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
  return 'I can explain this lab\'s features and test counts, report your progress, and — after you have tried a feature at least 3 times — guide you through its tests step by step. Try asking: "how many tests in Enrollments & Payments?" or "what is my progress?"';
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
    '<a href="/">Courses</a> · <a href="/search">Search</a> · <a href="/my-learning">My Learning</a> · <a href="/instructors">Instructors</a> · <a href="/profile">Profile</a> · <a href="/admin">Admin</a>' +
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

    /* The coach and the progress API answer even while the lab is locked —
       the gate blocks the app pages, and the coach never holds the key before 100%. */
    if (p === '/api/progress') {
      return sendJson(res, 200, progressSummary());
    }
    if (p === '/api/chat' && method === 'POST') {
      let msg = '';
      try { msg = JSON.parse(await readRaw(req)).message || ''; } catch (e) {}
      return sendJson(res, 200, { reply: chatReply(msg) });
    }

    if (p === '/unlock' && method === 'POST') {
      const b = await parseBody(req);
      if (entryKeyMatches((b.key || '').trim())) {
        progress.unlocked = true; saveProgress();
        return redirect(res, '/');
      }
      return send(res, 403, gatePage(req, 'That key was not accepted.'));
    }
    if (!progress.unlocked) return send(res, 200, gatePage(req));

    /* ---------- JSON API (token auth, deliberately unscoped) ---------- */
    if (p === '/api/enrollments') {
      attempt('Platform & API');
      const key = req.headers['x-api-key'] || '';
      const apiUser = users.find(x => apiTokenFor(x) === key && x.active);
      if (!apiUser) return sendJson(res, 401, { error: 'invalid API key' });
      /* VULN: response is not scoped to the token owner — every student's enrollments */
      const data = enrollments.map(e => ({ id: e.id, student: (userById(e.userId) || {}).email, course: (courseById(e.courseId) || {}).title, amountPaid: e.amountPaid, lessonsDone: e.lessonsDone, refunded: e.refunded, certIssued: e.certIssued }));
      if (data.some(d => d.student !== apiUser.email)) pass('api-token');
      return sendJson(res, 200, { requestedBy: apiUser.email, enrollments: data });
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
          return send(res, 200, layout(req, 'Login', '<h2>🎓 HexaAcademy</h2><p style="color:#c0392b">Invalid email or password.</p>' + loginForm(), null));
        }
        if (user.email === 'admin@hexaacademy.local' && password === 'admin123') pass('default-creds');
        return redirect(res, '/', loginHeaders(user));
      }
      if (sess) return redirect(res, '/');
      return send(res, 200, layout(req, 'Login', '<h2>🎓 HexaAcademy</h2><p>Welcome to HexaAcademy — the simulated online academy for security practice. All courses, payments and certificates here are fake.</p>' + loginForm() + '<p>No account yet? <a href="/register">Create an account</a> · <a href="/forgot">Forgot password</a></p>', null));
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
          return send(res, 200, layout(req, 'Register', '<h2>Create an account</h2><p style="color:#c0392b">That email is already registered (or empty).</p>' + registerForm(), null));
        }
        /* VULN: every submitted field is copied onto the record — role included */
        const nu = { id: nextUserId++, email, password: b.password || '', name: b.name || 'New Student', role: 'student', bio: '', active: true };
        if (b.role) nu.role = String(b.role);
        if (b.bio) nu.bio = String(b.bio);
        if (nu.role !== 'student') pass('mass-assignment');
        if ((nu.password || '').length < 8) pass('weak-password'); /* VULN: no password policy */
        users.push(nu);
        return redirect(res, '/', loginHeaders(nu));
      }
      return send(res, 200, layout(req, 'Register', '<h2>Create a HexaAcademy account</h2>' + registerForm(), null));
    }
    function registerForm() {
      return '<form method="POST" action="/register" style="background:#fff;border:1px solid #dde;border-radius:10px;padding:18px;max-width:420px">' +
        'Full name<br><input name="name" style="padding:8px;width:95%"><br><br>Email<br><input name="email" style="padding:8px;width:95%"><br><br>Password<br><input name="password" type="password" style="padding:8px;width:95%"><br><br>' +
        '<button style="padding:10px 22px">Create account</button></form>';
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

    /* ---------- catalogue: home, course, bundle, search ---------- */
    if (p === '/' && method === 'GET') {
      let body = '<h2>🎓 Courses</h2><p>Learn something new today. All courses and prices are simulated.</p>';
      for (const c of courses.filter(x => x.published)) {
        const ins = userById(c.instructorId) || {};
        body += '<div style="background:#fff;border:1px solid #dde;border-radius:10px;padding:14px 18px;margin:10px 0">' +
          '<b>' + esc(c.title) + '</b> — ' + esc(c.category) + ' · ' + c.lessons + ' lessons · by <a href="/instructors/' + c.instructorId + '">' + esc(ins.name || '?') + '</a><br>' +
          'Price: <b>' + money(c.price) + '</b> · <a href="/courses/' + c.id + '">View course</a></div>';
      }
      body += '<h2>📦 Bundles</h2>';
      for (const bnd of bundles) {
        body += '<div style="background:#fff;border:1px solid #dde;border-radius:10px;padding:14px 18px;margin:10px 0">' +
          '<b>' + esc(bnd.title) + '</b> — includes ' + bnd.courseIds.map(id => esc((courseById(id) || {}).title || '?')).join(' + ') + '<br>' +
          'Bundle price: <b>' + money(bnd.price) + '</b> · <a href="/bundles/' + bnd.id + '">View bundle</a></div>';
      }
      return send(res, 200, layout(req, 'Courses', body, sess));
    }
    const courseMatch = p.match(/^\/courses\/(\d+)$/);
    if (courseMatch && method === 'GET') {
      attempt('Course Catalogue & Search');
      const course = courseById(parseInt(courseMatch[1], 10));
      if (!course) return send(res, 404, layout(req, 'Not found', '<h2>Course not found</h2>', sess));
      const ins = userById(course.instructorId) || {};
      const mine = enrollments.find(e => e.userId === sess.user.id && e.courseId === course.id && !e.refunded);
      let body = '<h2>' + esc(course.title) + '</h2><p>' + esc(course.category) + ' · ' + course.lessons + ' lessons · Instructor: <a href="/instructors/' + course.instructorId + '">' + esc(ins.name || '?') + '</a>' + (course.published ? '' : ' · <b style="color:#c0392b">DRAFT — not yet published</b>') + '</p>' +
        '<p style="font-size:20px">Price: <b>' + money(course.price) + '</b></p>';
      if (mine) {
        body += '<p style="color:#1a7f37">You are enrolled. <a href="/enrollments/' + mine.id + '">Go to your course</a></p>';
      } else {
        body += '<h3>Enroll now (simulated checkout)</h3><form method="POST" action="/checkout" style="background:#fff;border:1px solid #dde;border-radius:10px;padding:18px;max-width:460px">' +
          '<input type="hidden" name="type" value="course"><input type="hidden" name="id" value="' + course.id + '">' +
          '<input type="hidden" name="price" value="' + course.price + '">' +
          'Coupon code<br><input name="coupon1" style="padding:8px;width:95%"><br><br>' +
          'Second coupon code<br><input name="coupon2" style="padding:8px;width:95%"><br><br>' +
          '<button style="padding:10px 22px">Pay ' + money(course.price) + ' &amp; enroll</button></form>' +
          '<p style="color:#667;font-size:13px">Simulated checkout — no real payment is taken.</p>';
      }
      return send(res, 200, layout(req, course.title, body, sess));
    }
    const bundleMatch = p.match(/^\/bundles\/(\d+)$/);
    if (bundleMatch && method === 'GET') {
      attempt('Course Catalogue & Search');
      const bnd = bundleById(parseInt(bundleMatch[1], 10));
      if (!bnd) return send(res, 404, layout(req, 'Not found', '<h2>Bundle not found</h2>', sess));
      const parts = bnd.courseIds.map(id => courseById(id)).filter(Boolean);
      const sum = parts.reduce((s, c) => s + c.price, 0);
      let body = '<h2>📦 ' + esc(bnd.title) + '</h2><ul>' + parts.map(c => '<li>' + esc(c.title) + ' — ' + money(c.price) + '</li>').join('') + '</ul>' +
        '<p>Bought separately: ' + money(sum) + ' · Bundle price: <b>' + money(bnd.price) + '</b></p>' +
        '<h3>Buy the bundle (simulated checkout)</h3><form method="POST" action="/checkout" style="background:#fff;border:1px solid #dde;border-radius:10px;padding:18px;max-width:460px">' +
        '<input type="hidden" name="type" value="bundle"><input type="hidden" name="id" value="' + bnd.id + '">' +
        '<input type="hidden" name="total" value="' + bnd.price + '">' +
        'Coupon code<br><input name="coupon1" style="padding:8px;width:95%"><br><br>' +
        'Second coupon code<br><input name="coupon2" style="padding:8px;width:95%"><br><br>' +
        '<button style="padding:10px 22px">Pay ' + money(bnd.price) + ' &amp; enroll all</button></form>';
      return send(res, 200, layout(req, bnd.title, body, sess));
    }
    if (p === '/search' && method === 'GET') {
      attempt('Course Catalogue & Search');
      const q = u.searchParams.get('q') || '';
      let results;
      if (SQLI_RE.test(q)) {
        /* VULN: injected filter matches every row — drafts included */
        results = courses.slice();
        if (results.some(c => !c.published)) pass('search-sqli');
      } else {
        const needle = q.toLowerCase();
        results = courses.filter(c => c.published && (c.title.toLowerCase().includes(needle) || c.category.toLowerCase().includes(needle)));
      }
      if (XSS_RE.test(q)) pass('search-xss'); /* VULN: query reflected unescaped below */
      let body = '<h2>🔎 Search courses</h2><form method="GET" action="/search"><input name="q" value="' + esc(q) + '" style="padding:8px;width:60%"> <button style="padding:8px 18px">Search</button></form>' +
        '<p>Results for: ' + q + '</p>';
      if (!results.length) body += '<p>No courses found.</p>';
      for (const c of results) {
        body += '<div style="background:#fff;border:1px solid #dde;border-radius:10px;padding:12px 16px;margin:8px 0"><b>' + esc(c.title) + '</b> — ' + esc(c.category) + ' · ' + money(c.price) + (c.published ? '' : ' · <b style="color:#c0392b">DRAFT</b>') + ' · <a href="/courses/' + c.id + '">View</a></div>';
      }
      return send(res, 200, layout(req, 'Search', body, sess));
    }

    /* ---------- checkout (deliberately trusting) ---------- */
    if (p === '/checkout' && method === 'POST') {
      const b = await parseBody(req);
      attempt('Enrollments & Payments');
      const type = b.type === 'bundle' ? 'bundle' : 'course';
      const item = type === 'bundle' ? bundleById(parseInt(b.id || '0', 10)) : courseById(parseInt(b.id || '0', 10));
      if (!item) return send(res, 404, layout(req, 'Not found', '<h2>That item does not exist</h2>', sess));
      const catalogue = item.price;
      /* VULN: the amount is taken from the client (hidden "price" / "total" field) instead of the catalogue */
      const submitted = type === 'bundle' ? b.total : b.price;
      let charged = catalogue;
      if (submitted !== undefined && submitted !== '' && !isNaN(Number(submitted))) {
        charged = Number(submitted);
        if (charged !== catalogue) pass(type === 'bundle' ? 'bundle-tamper' : 'price-tamper');
      }
      let applied = 0;
      for (const raw of [b.coupon1, b.coupon2]) {
        const code = (raw || '').trim().toUpperCase();
        if (!code) continue;
        const cpn = coupons.find(c => c.code === code);
        if (!cpn) continue;
        if (cpn.singleUse && cpn.usedBy !== null) pass('coupon-reuse'); /* VULN: already redeemed — applied anyway */
        if (cpn.singleUse && cpn.usedBy === null) cpn.usedBy = sess.user.id;
        charged = Math.round(charged * (1 - cpn.pct / 100) * 100) / 100;
        applied++;
      }
      if (applied >= 2) pass('coupon-stacking'); /* VULN: two coupons on one order */
      const courseIds = type === 'bundle' ? item.courseIds : [item.id];
      const created = [];
      for (const cid of courseIds) {
        const existing = enrollments.find(e => e.userId === sess.user.id && e.courseId === cid && !e.refunded);
        if (existing) continue;
        const enr = { id: nextEnrollmentId++, userId: sess.user.id, courseId: cid, amountPaid: Math.round(charged / courseIds.length * 100) / 100, lessonsDone: 0, watched: [], refunded: false, certIssued: false };
        enrollments.push(enr);
        created.push(enr);
      }
      let body = '<h2>✅ Enrolled!</h2><p>Simulated payment of <b>' + money(charged) + '</b> recorded.</p>';
      if (created.length) body += '<ul>' + created.map(e => '<li>' + esc((courseById(e.courseId) || {}).title || '?') + ' — <a href="/enrollments/' + e.id + '">enrollment #' + e.id + '</a> (paid ' + money(e.amountPaid) + ')</li>').join('') + '</ul>';
      else body += '<p>You were already enrolled in everything in this order.</p>';
      body += '<p><a href="/my-learning">Go to My Learning</a></p>';
      return send(res, 200, layout(req, 'Enrolled', body, sess));
    }

    /* ---------- learning: enrollments, progress, refunds, certificates ---------- */
    if (p === '/my-learning' && method === 'GET') {
      const mine = enrollments.filter(e => e.userId === sess.user.id);
      let body = '<h2>📚 My Learning</h2>';
      if (!mine.length) body += '<p>No enrolments yet — <a href="/">browse courses</a>.</p>';
      for (const e of mine) {
        const c = courseById(e.courseId) || {};
        const pct = c.lessons ? Math.min(100, Math.floor(e.lessonsDone / c.lessons * 100)) : 0;
        body += '<div style="background:#fff;border:1px solid #dde;border-radius:10px;padding:12px 16px;margin:8px 0"><b>' + esc(c.title || '?') + '</b> — progress ' + pct + '% (' + e.lessonsDone + '/' + (c.lessons || '?') + ' lessons)' +
          (e.refunded ? ' · <b style="color:#c0392b">refunded</b>' : '') + (e.certIssued ? ' · 🎓 certificate issued' : '') +
          '<br><a href="/enrollments/' + e.id + '">Open enrollment #' + e.id + '</a></div>';
      }
      return send(res, 200, layout(req, 'My Learning', body, sess));
    }
    const enrMatch = p.match(/^\/enrollments\/(\d+)$/);
    if (enrMatch && method === 'GET') {
      attempt('Learning & Certificates');
      const enr = enrollmentById(parseInt(enrMatch[1], 10));
      if (!enr) return send(res, 404, layout(req, 'Not found', '<h2>Enrollment not found</h2>', sess));
      if (enr.userId !== sess.user.id) pass('enrollment-idor'); /* VULN: served anyway */
      const c = courseById(enr.courseId) || {};
      const student = userById(enr.userId) || {};
      const pct = c.lessons ? Math.min(100, Math.floor(enr.lessonsDone / c.lessons * 100)) : 0;
      let body = '<h2>Enrollment #' + enr.id + ' — ' + esc(c.title || '?') + '</h2>' +
        '<p>Student: ' + esc(student.name || '?') + ' (' + esc(student.email || '') + ') · Paid: ' + money(enr.amountPaid) + (enr.refunded ? ' · <b style="color:#c0392b">REFUNDED</b>' : '') + '</p>' +
        '<p>Progress: <b>' + pct + '%</b> — ' + enr.lessonsDone + ' of ' + (c.lessons || '?') + ' lessons done · watched: ' + (enr.watched.length ? enr.watched.join(', ') : 'none') + '</p>' +
        '<h3>Lessons</h3><p>' + Array.from({ length: c.lessons || 0 }, (_, i) => '<a href="/enrollments/' + enr.id + '/lesson/' + (i + 1) + '">Lesson ' + (i + 1) + '</a>').join(' · ') + '</p>' +
        '<h3>Update my progress</h3><form method="POST" action="/enrollments/' + enr.id + '/progress" style="background:#fff;border:1px solid #dde;border-radius:10px;padding:14px;max-width:360px">' +
        'Lessons completed<br><input name="lessons" style="padding:8px;width:90%"><br><br><button>Save progress</button></form>' +
        '<h3>Certificate</h3><p>' + (enr.certIssued ? '🎓 Certificate issued — ' : '') + '<a href="/certificates/' + enr.id + '">View / get certificate</a></p>' +
        (enr.refunded ? '' : '<h3>Refund</h3><p style="color:#667;font-size:13px">Academy policy: refunds are not available once a certificate has been issued.</p>' +
        '<form method="POST" action="/enrollments/' + enr.id + '/refund"><button>Request refund of ' + money(enr.amountPaid) + '</button></form>');
      return send(res, 200, layout(req, 'Enrollment', body, sess));
    }
    const lessonMatch = p.match(/^\/enrollments\/(\d+)\/lesson\/(\d+)$/);
    if (lessonMatch && method === 'GET') {
      const enr = enrollmentById(parseInt(lessonMatch[1], 10));
      if (enr) {
        const n = parseInt(lessonMatch[2], 10);
        if (!enr.watched.includes(n)) enr.watched.push(n);
        enr.lessonsDone = enr.watched.length; /* the legitimate path: progress derives from watched lessons */
      }
      return redirect(res, '/enrollments/' + lessonMatch[1]);
    }
    const progMatch = p.match(/^\/enrollments\/(\d+)\/progress$/);
    if (progMatch && method === 'POST') {
      const b = await parseBody(req);
      attempt('Learning & Certificates');
      const enr = enrollmentById(parseInt(progMatch[1], 10));
      const n = parseInt(b.lessons || '', 10);
      if (enr && !isNaN(n)) {
        enr.lessonsDone = n; /* VULN: client-supplied counter stored as truth */
        const c = courseById(enr.courseId) || {};
        if (n >= (c.lessons || Infinity) && enr.watched.length < (c.lessons || 0)) pass('progress-tamper');
      }
      return redirect(res, '/enrollments/' + progMatch[1]);
    }
    const refundMatch = p.match(/^\/enrollments\/(\d+)\/refund$/);
    if (refundMatch && method === 'POST') {
      await parseBody(req);
      attempt('Enrollments & Payments');
      const enr = enrollmentById(parseInt(refundMatch[1], 10));
      if (enr && !enr.refunded) {
        if (enr.certIssued) pass('refund-abuse'); /* VULN: refunded anyway — certificate kept */
        enr.refunded = true;
      }
      return redirect(res, '/enrollments/' + refundMatch[1]);
    }
    const certMatch = p.match(/^\/certificates\/(\d+)$/);
    if (certMatch && method === 'GET') {
      attempt('Learning & Certificates');
      const enr = enrollmentById(parseInt(certMatch[1], 10));
      if (!enr) return send(res, 404, layout(req, 'Not found', '<h2>Enrollment not found</h2>', sess));
      const c = courseById(enr.courseId) || {};
      const student = userById(enr.userId) || {};
      if (!enr.certIssued) {
        enr.certIssued = true; /* VULN: issued with no completion check at all */
        if (enr.lessonsDone < (c.lessons || 0)) pass('certificate-forgery');
      }
      const card = '<div style="max-width:640px;margin:30px auto;background:#fff;border:3px solid #9b5cff;border-radius:16px;padding:36px;text-align:center">' +
        '<img src="/logo.png" style="height:56px"><h2 style="margin:8px 0">Certificate of Achievement</h2>' +
        '<p>This certifies that</p><h3 style="font-size:24px;margin:6px 0">' + esc(student.name || '?') + '</h3>' +
        '<p>has completed the course</p><h3>' + esc(c.title || '?') + '</h3>' +
        '<p style="color:#555;margin-top:18px">HexaAcademy — Instructor: ' + esc((userById(c.instructorId) || {}).name || '?') + '</p></div>' +
        '<p style="text-align:center"><button onclick="window.print()">Print certificate</button></p>';
      return send(res, 200, layout(req, 'Course Certificate', card, sess));
    }

    /* ---------- instructors ---------- */
    if (p === '/instructors' && method === 'GET') {
      let body = '<h2>👩‍🏫 Our Instructors</h2><ul>' +
        users.filter(x => x.role === 'instructor').map(x => '<li><a href="/instructors/' + x.id + '">' + esc(x.name) + '</a> — ' + esc(x.bio) + '</li>').join('') + '</ul>';
      return send(res, 200, layout(req, 'Instructors', body, sess));
    }
    const insMatch = p.match(/^\/instructors\/(\d+)$/);
    if (insMatch && method === 'GET') {
      const ins = userById(parseInt(insMatch[1], 10));
      if (!ins || ins.role !== 'instructor') return send(res, 404, layout(req, 'Not found', '<h2>Instructor not found</h2>', sess));
      let body = '<h2>' + esc(ins.name) + '</h2><p>' + esc(ins.bio) + '</p><h3>Courses by this instructor</h3><ul>' +
        courses.filter(c => c.instructorId === ins.id && c.published).map(c => '<li><a href="/courses/' + c.id + '">' + esc(c.title) + '</a> — ' + money(c.price) + '</li>').join('') + '</ul>' +
        '<h3>Edit this instructor\'s public profile</h3><form method="POST" action="/instructors/' + ins.id + '/profile" style="background:#fff;border:1px solid #dde;border-radius:10px;padding:14px;max-width:420px">' +
        'Name<br><input name="name" value="' + esc(ins.name) + '" style="padding:8px;width:95%"><br><br>Bio<br><input name="bio" value="' + esc(ins.bio) + '" style="padding:8px;width:95%"><br><br><button>Save profile</button></form>' +
        '<p><a href="/instructor/' + ins.id + '/earnings">Earnings dashboard</a></p>';
      return send(res, 200, layout(req, ins.name, body, sess));
    }
    const insEdit = p.match(/^\/instructors\/(\d+)\/profile$/);
    if (insEdit && method === 'POST') {
      const b = await parseBody(req);
      attempt('Instructor Dashboard');
      const target = userById(parseInt(insEdit[1], 10));
      if (target) {
        if (sess.user.id !== target.id) pass('instructor-impersonation'); /* VULN: changed anyway */
        if (typeof b.name === 'string' && b.name.trim()) target.name = b.name.trim();
        if (typeof b.bio === 'string') target.bio = b.bio;
      }
      return redirect(res, '/instructors/' + insEdit[1]);
    }
    if (p === '/instructor/earnings' && method === 'GET') {
      return redirect(res, '/instructor/' + sess.user.id + '/earnings');
    }
    const earnMatch = p.match(/^\/instructor\/(\d+)\/earnings$/);
    if (earnMatch && method === 'GET') {
      attempt('Instructor Dashboard');
      const target = userById(parseInt(earnMatch[1], 10));
      if (!target) return send(res, 404, layout(req, 'Not found', '<h2>Instructor not found</h2>', sess));
      if (sess.user.id !== target.id) pass('earnings-idor'); /* VULN: served anyway */
      const e = earningsOf(target.id);
      let body = '<h2>💰 Earnings — ' + esc(target.name) + '</h2>' +
        '<table style="background:#fff;border:1px solid #dde"><tr><td style="padding:6px">Gross course sales</td><td style="padding:6px"><b>' + money(e.gross) + '</b></td></tr>' +
        '<tr><td style="padding:6px">Your share (70%)</td><td style="padding:6px"><b>' + money(e.earned) + '</b></td></tr>' +
        '<tr><td style="padding:6px">Already paid out</td><td style="padding:6px">' + money(e.paidOut) + '</td></tr>' +
        '<tr><td style="padding:6px">Available balance</td><td style="padding:6px"><b>' + money(e.balance) + '</b></td></tr></table>' +
        '<h3>Request a payout</h3><form method="POST" action="/instructor/payout" style="background:#fff;border:1px solid #dde;border-radius:10px;padding:14px;max-width:360px">' +
        'Amount ($)<br><input name="amount" style="padding:8px;width:90%"><br><br><button>Request payout</button></form>';
      return send(res, 200, layout(req, 'Earnings', body, sess));
    }
    if (p === '/instructor/payout' && method === 'POST') {
      const b = await parseBody(req);
      attempt('Instructor Dashboard');
      const amount = parseFloat(b.amount);
      if (!isNaN(amount) && amount > 0) {
        const bal = earningsOf(sess.user.id).balance;
        if (amount > bal) pass('payout-tamper'); /* VULN: recorded anyway — no balance check */
        payouts.push({ id: nextPayoutId++, instructorId: sess.user.id, amount });
      }
      return redirect(res, '/instructor/' + sess.user.id + '/earnings');
    }

    /* ---------- profile ---------- */
    if (p === '/profile') {
      if (method === 'POST') {
        const b = await parseBody(req);
        attempt('Registration & Profile');
        if (!originOk(req, b)) pass('csrf-profile'); /* VULN: update applies with no origin check */
        if (typeof b.name === 'string' && b.name.trim()) sess.user.name = b.name.trim();
        if (typeof b.bio === 'string') sess.user.bio = b.bio;
        if (XSS_RE.test(sess.user.name)) pass('stored-xss-profile');
        return redirect(res, '/profile');
      }
      /* display name rendered RAW on purpose below (stored-xss test) */
      let body = '<h2>👤 Profile</h2><p>Signed in as <b>' + sess.user.name + '</b> (' + esc(sess.user.email) + ') · Role: ' + esc(sess.user.role) + '</p>' +
        '<form method="POST" action="/profile" style="background:#fff;border:1px solid #dde;border-radius:10px;padding:18px;max-width:420px">' + originField(req) +
        'Display name<br><input name="name" value="' + esc(sess.user.name) + '" style="padding:8px;width:95%"><br><br>Bio<br><input name="bio" value="' + esc(sess.user.bio || '') + '" style="padding:8px;width:95%"><br><br><button style="padding:10px 22px">Save profile</button></form>' +
        '<h3>Developer API</h3><p style="font-size:14px">Your API token: <code>' + esc(apiTokenFor(sess.user)) + '</code><br><span style="color:#667">Use it as the X-API-Key header on GET /api/enrollments.</span></p>';
      return send(res, 200, layout(req, 'Profile', body, sess));
    }

    /* ---------- admin panel (trusts the cookie role — broken on purpose) ---------- */
    if (p === '/admin' && method === 'GET') {
      attempt('Admin Panel');
      if (sess.cookieRole !== 'admin') {
        return send(res, 403, layout(req, 'Forbidden', '<h2>403 — Admins only</h2><p>The admin panel requires the admin role.</p>', sess));
      }
      if (sess.user.role !== 'admin') pass('cookie-role'); /* forged cookie role reached the gated page */
      let body = '<h2>🛠 Admin Panel</h2><p>User account controls.</p>';
      for (const x of users) {
        body += '<div style="background:#fff;border:1px solid #dde;border-radius:10px;padding:10px 14px;margin:8px 0"><b>' + esc(x.name) + '</b> (' + esc(x.email) + ') — ' + esc(x.role) + ' — ' + (x.active ? 'active' : '<b style="color:#c0392b">deactivated</b>') +
          (x.active ? ' <form method="POST" action="/admin/users/' + x.id + '/deactivate" style="display:inline"><button>Deactivate account</button></form>' : '') + '</div>';
      }
      return send(res, 200, layout(req, 'Admin', body, sess));
    }
    const deactMatch = p.match(/^\/admin\/users\/(\d+)\/deactivate$/);
    if (deactMatch && method === 'POST') {
      const b = await parseBody(req);
      attempt('Admin Panel');
      if (sess.cookieRole === 'admin') {
        if (!originOk(req, b)) pass('admin-csrf'); /* VULN: deactivation applies with no origin check */
        const target = userById(parseInt(deactMatch[1], 10));
        if (target) target.active = false;
      }
      return redirect(res, '/admin');
    }

    /* ---------- debug dump (leftover — broken on purpose) ---------- */
    if (p === '/debug' && method === 'GET') {
      attempt('Platform & API');
      if (sess.user.role !== 'admin') pass('debug-exposure');
      return sendJson(res, 200, { note: 'HexaAcademy internal debug — do not ship', users, courses, enrollments, payouts });
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
