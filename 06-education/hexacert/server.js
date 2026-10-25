'use strict';
/*
 * HexaCert — LAB 59 (Category 6: Education & E-learning)
 * A deliberately vulnerable certification-body platform for local training.
 * Zero-dependency Node.js. Binds 127.0.0.1 only. ALL data is fake seed data.
 * Built by Md. Jony Hassain, Founder of HexaCyberLab.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = 3068;
const HOST = '127.0.0.1';
const LAB_NUMBER = 59;
const LAB_NAME = 'HexaCert';
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const LOGO_FILE = path.join(DIR, 'logo.png');

/* --- scattered shard region 1 --- */


/* ============================ SEED DATA (all fake) ============================ */
let users = [
  { id: 1, name: 'HexaCert Admin', email: 'admin@hexacert.local', pass: 'admin123', role: 'admin' },
  { id: 2, name: 'Priya Proctor', email: 'proctor@hexacert.local', pass: 'proctor123', role: 'proctor' },
  { id: 3, name: 'Alice Candidate', email: 'alice@test.local', pass: 'alice123', role: 'candidate' },
  { id: 4, name: 'Bob Candidate', email: 'bob@test.local', pass: 'bob123', role: 'candidate' },
  { id: 5, name: 'Carol Candidate', email: 'carol@test.local', pass: 'carol123', role: 'candidate' }
];
let nextUserId = 6;

let exams = [
  { id: 1, title: 'Web Security Fundamentals', code: 'WSF', passMark: 70, price: 199 },
  { id: 2, title: 'Network Defense Basics', code: 'NDB', passMark: 70, price: 249 },
  { id: 3, title: 'Cloud Security Associate', code: 'CSA', passMark: 75, price: 299 }
];

let bookings = [
  { id: 1, userId: 3, examId: 1, origExamId: 1, date: '2026-11-02', status: 'booked', score: null, released: false, voucher: null },
  { id: 2, userId: 4, examId: 1, origExamId: 1, date: '2026-11-03', status: 'booked', score: null, released: false, voucher: null },
  { id: 3, userId: 3, examId: 2, origExamId: 2, date: '2026-10-10', status: 'completed', score: 88, released: true, voucher: null },
  { id: 4, userId: 5, examId: 2, origExamId: 2, date: '2026-11-05', status: 'booked', score: null, released: false, voucher: null },
  { id: 5, userId: 5, examId: 1, origExamId: 1, date: '2026-10-18', status: 'completed', score: 91, released: false, voucher: null }
];
let nextBookingId = 6;

let certCounter = 1002; // last issued numeric suffix; next credential is HC-1003
let credentials = [
  { id: 1, certId: 'HC-1001', userId: 3, examId: 2, issued: '2025-10-15', expires: '2026-10-15', status: 'active' },
  { id: 2, certId: 'HC-1002', userId: 4, examId: 2, issued: '2025-09-01', expires: '2026-09-01', status: 'active' }
];
let nextCredId = 3;

let vouchers = [
  { code: 'PARTNER-2026-ALPHA', partner: 'SkillBridge Training', used: false, usedBy: null },
  { code: 'PARTNER-2026-BETA', partner: 'SkillBridge Training', used: false, usedBy: null }
];

let resets = {}; // email -> reset token (simulated mail store)
let sessions = {}; // sid -> userId
let nextSid = 1;

/* --- scattered shard region 2 --- */
const _c1 = ['TC1YSA==', 'Ti0wNg=='];

/* ============================ PROGRESS STATE ============================ */
function freshState() {
  return { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
}
let state = (() => {
  try { const s = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); return Object.assign(freshState(), s); }
  catch (e) { return freshState(); }
})();
function saveState() { try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 1)); } catch (e) {} }
function doneCount() { return TESTS.reduce((n, t) => n + (state.tests[t.id] ? 1 : 0), 0); }
function pass(id) {
  if (!state.tests[id]) {
    state.tests[id] = true;
    if (doneCount() === TESTS.length && !state.completedAt) {
      state.completedAt = new Date().toISOString();
      state.keyRevealed = true;
    }
    saveState();
  }
}
function attempt(feature) { state.attempts[feature] = (state.attempts[feature] || 0) + 1; saveState(); }

/* --- scattered shard region 3 --- */


/* ============================ TESTS REGISTRY ============================ */
const FEATURES = ['Login & Authentication', 'Registration & Profile', 'Exam Booking', 'Exam Taking & Results', 'Certificates & Verification', 'Vouchers & Partners', 'Renewals', 'Admin Panel', 'Platform & API'];

const TESTS = [
  /* ---------- Login & Authentication ---------- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03:2021 Injection', difficulty: 'Intermediate', where: 'POST /login (legacy string-built query path)',
    hints: ['The login form builds its account lookup by gluing your input straight into a query string.', 'Try a classic tautology in the email field, e.g. something that makes the WHERE clause always true.', "Use email: ' OR '1'='1 and any password — the glued query matches the first account (the admin)."],
    lesson: 'String-built queries let attacker input change the meaning of the query itself; parameterised queries keep data and code separate.',
    impact: 'On a real certification platform this hands an attacker the admin account with no password at all — every candidate record, exam and issued credential is exposed or forgeable.',
    report: { title: 'SQL Injection in Login Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limiting or Lockout', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner', where: 'POST /login',
    hints: ['Nothing slows you down when a password guess is wrong.', 'Script or manually repeat wrong passwords for one account and watch for any lockout, delay or CAPTCHA.', 'Make 10+ failed attempts against alice@test.local — every one is still processed instantly.'],
    lesson: 'Without throttling, lockout or MFA, online password guessing is only a matter of time against weak passwords.',
    impact: 'Attackers can grind through candidate and staff passwords overnight; one guessed proctor or admin password compromises the whole certification programme.',
    report: { title: 'Missing Brute-Force Protection on Login', severity: 'High', remediation: 'Add per-account and per-IP rate limiting, progressive delays/lockout and MFA for staff roles.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User Enumeration via Login & Reset Responses', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner', where: 'POST /login and POST /forgot',
    hints: ['Compare the error text for an email that exists with one that does not.', 'The forgot-password flow answers differently too.', 'Probe at least 5 different emails across login/forgot — real accounts say "Incorrect password" / show a reset preview, unknown ones say "No account found".'],
    lesson: 'Different responses for existing vs non-existing accounts turn your login page into a free directory of valid users for targeted attacks.',
    impact: 'An attacker first harvests which emails hold accounts, then focuses phishing and password guessing only on real candidates and staff.',
    report: { title: 'Account Enumeration Through Differential Auth Responses', severity: 'Medium', remediation: 'Return one generic message for all auth failures and reset requests, regardless of account existence.' } },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Default / Demo Administrator Credentials', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner', where: 'POST /login with the seeded admin account',
    hints: ['Seeded demo accounts often keep their factory passwords.', 'The README lists the demo accounts — one of them is an administrator.', 'Sign in as admin@hexacert.local with the password shown in the demo account list.'],
    lesson: 'Default credentials are public knowledge; any shipped demo or factory password must be changed or removed before go-live.',
    impact: 'Anyone who reads the manual owns the platform: full control over exams, results and certificate issuing.',
    report: { title: 'Default Credentials on the Administrator Account', severity: 'Critical', remediation: 'Force a unique strong password at first setup; remove or disable all demo accounts in production.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable Password Reset Token', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate', where: 'POST /forgot then POST /reset',
    hints: ['Request a reset for your own account and study the token format in the simulated email preview.', 'The token is derived from something public about the account — not random.', 'The token is simply HX followed by the numeric user id (e.g. the 4th account uses HX4) — compute it for another user and reset their password.'],
    lesson: 'Reset tokens must be long, random and single-use; anything derivable from a user id or email is an account-takeover shortcut.',
    impact: 'Any candidate (or staff) account can be taken over by anyone who knows the victim\'s email and guesses their sequential user id.',
    report: { title: 'Predictable Password Reset Tokens Allow Account Takeover', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (≥128-bit), expire them quickly and make them single-use.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Session Role Cookie Tampering', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate', where: 'hx_role cookie honoured by /admin and /proctor',
    hints: ['The app reads a role hint from a cookie instead of trusting only the server-side session.', 'Your browser stores cookies — and lets you edit them.', 'Sign in as a candidate, set the cookie hx_role=admin, then open /admin.'],
    lesson: 'Authorization data must live server-side; any role the client can edit will be edited.',
    impact: 'Every candidate becomes an administrator by changing one cookie — results, revocations and issuing are all exposed.',
    report: { title: 'Client-Controlled Role Cookie Grants Privilege Escalation', severity: 'High', remediation: 'Derive roles only from the server-side session record; ignore role claims in cookies or form fields.' } },

  /* ---------- Registration & Profile ---------- */
  { id: 'reg-weak', feature: 'Registration & Profile', name: 'Weak Password Policy', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner', where: 'POST /register',
    hints: ['How short a password will registration accept?', 'Try a single character.', 'Register a new account with the password "x" — it is accepted.'],
    lesson: 'A password policy is the cheapest defence you have; accepting 1-character passwords makes brute force and guessing trivial.',
    impact: 'Candidates protect exam bookings and certificates with passwords that fall to the first guesses an attacker tries.',
    report: { title: 'No Minimum Password Strength on Registration', severity: 'Medium', remediation: 'Enforce a minimum length (≥10) and block common/breached passwords at registration and reset.' } },
  { id: 'reg-mass', feature: 'Registration & Profile', name: 'Mass Assignment — Role Escalation at Registration', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate', where: 'POST /register (extra form fields are bound to the account)',
    hints: ['The registration handler copies submitted fields straight onto the new account object.', 'What fields does an account have that the form never shows?', 'Register with an extra field role=admin (add it to the form data) — the new account is created as an administrator.'],
    lesson: 'Binding request data directly to model objects lets attackers set fields they were never offered; whitelist what each form may set.',
    impact: 'Self-service admin creation: an attacker registers and immediately controls the certification platform.',
    report: { title: 'Mass Assignment in Registration Allows Role Escalation', severity: 'Critical', remediation: 'Whitelist assignable fields per endpoint; set role server-side only, never from request data.' } },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03:2021 Injection', difficulty: 'Beginner', where: 'POST /register and POST /profile (name rendered unescaped)',
    hints: ['Names are printed back on dashboards and admin lists exactly as typed.', 'Put an HTML/JS payload where your name goes.', 'Register or rename yourself to <script>alert(1)</script> — it is stored and rendered as code.'],
    lesson: 'Every user-controlled string that is rendered must be output-encoded; stored XSS fires in other users\' browsers, including admins\'.',
    impact: 'An attacker plants a script in their display name and steals the session of any staff member who views the candidate list.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Output-encode all user data in HTML and add a Content-Security-Policy header.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate', where: 'POST /profile (no anti-CSRF token; origin marker never verified)',
    hints: ['The app sets an hx_origin marker cookie on its own pages but never checks it on profile updates.', 'A state-changing POST from outside the app\'s own pages carries no marker.', 'While signed in, submit the profile form from a raw request that has only your session cookie (no hx_origin marker) — the name still changes.'],
    lesson: 'State-changing requests need an unguessable token tied to the session; cookies alone are sent by the browser on cross-site requests too.',
    impact: 'A malicious page a candidate visits while signed in can silently rewrite their profile — the same pattern reaches far worse actions elsewhere in the app.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require a per-session anti-CSRF token on every state-changing form and verify Origin/Referer.' } },

  /* ---------- Exam Booking ---------- */
  { id: 'book-idor', feature: 'Exam Booking', name: 'Booking IDOR — View Another Candidate\'s Booking', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner', where: 'GET /bookings/:id',
    hints: ['Booking detail pages are addressed by a simple numeric id.', 'Your own bookings are listed under /bookings — what happens if you change the number?', 'Open /bookings/2 while signed in as Alice — it is Bob\'s booking, served without any ownership check.'],
    lesson: 'Every object access must check that the object belongs to the requester; sequential ids make unprotected objects trivially enumerable.',
    impact: 'Candidates can read each other\'s exam schedules and personal booking data — a privacy breach and a map for further attacks.',
    report: { title: 'Insecure Direct Object Reference on Booking Details', severity: 'High', remediation: 'Enforce per-object ownership checks on the server for every booking read and write.' } },
  { id: 'book-swap', feature: 'Exam Booking', name: 'Exam Swap After Booking (Price Downgrade Fraud)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate', where: 'POST /bookings/:id/exam',
    hints: ['A booking remembers which exam it was created for — but the change-exam action trusts your new choice completely.', 'Book (or use) the cheapest exam, then change it.', 'Change a Web Security Fundamentals booking ($199) to Cloud Security Associate ($299) via the exam-swap action — no payment for the difference is ever requested.'],
    lesson: 'Price and entitlement must be recomputed server-side on every change; a paid-for cheap item must never silently become an expensive one.',
    impact: 'Candidates sit premium exams while paying entry-level fees — direct revenue loss on every swapped booking.',
    report: { title: 'Booking Exam Can Be Changed Without Re-Pricing', severity: 'High', remediation: 'Recompute price server-side on any exam change and require payment of the difference before confirming.' } },

  /* ---------- Exam Taking & Results ---------- */
  { id: 'exam-selfgrade', feature: 'Exam Taking & Results', name: 'Self-Graded Exam — Client-Supplied Score Trusted', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced', where: 'POST /exam/:bookingId/submit',
    hints: ['The exam submission accepts a finished score from the browser instead of grading answers server-side.', 'Look at what the submit request actually sends.', 'Submit your own exam with score=100 in the request — the platform records a perfect pass without grading a single answer.'],
    lesson: 'Scores, prices and verdicts must be computed on the server from raw inputs; anything the client states about outcomes is fiction.',
    impact: 'Every certificate the body issues becomes worthless: candidates award themselves perfect scores and employers lose trust in the credential.',
    report: { title: 'Exam Score Accepted From the Client Without Server-Side Grading', severity: 'Critical', remediation: 'Grade answers server-side from stored questions; never accept a score or pass/fail flag from the client.' } },
  { id: 'exam-release', feature: 'Exam Taking & Results', name: 'Candidate Releases Own Results (Proctor-Only Action)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate', where: 'POST /results/:bookingId/release',
    hints: ['Finished results stay unreleased until a proctor publishes them — that is the design.', 'The release action checks that you are signed in, but not who you are.', 'As a candidate, call the release action on an unreleased result — it publishes without any proctor involved.'],
    lesson: 'Workflow steps restricted by role must verify the role on the server for every single action, not hide the button.',
    impact: 'Candidates publish (and rely on) unverified results, defeating proctor review that exists to catch cheating and errors.',
    report: { title: 'Missing Role Check on Result Release Action', severity: 'High', remediation: 'Require the proctor role server-side for result release; log who released each result.' } },
  { id: 'exam-result-idor', feature: 'Exam Taking & Results', name: 'Exam Result IDOR — Read Another Candidate\'s Result', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner', where: 'GET /results/:bookingId',
    hints: ['Result pages use the same numeric booking ids as everything else.', 'Whose results can you open if you guess an id?', 'Open /results/5 as Alice — Carol\'s completed exam result, score included, is served to you.'],
    lesson: 'Results are personal data; object-level authorization must be checked on reads just as strictly as on writes.',
    impact: 'Candidates harvest competitors\' scores and exam history — a clear personal-data breach for the certification body.',
    report: { title: 'Insecure Direct Object Reference on Exam Results', severity: 'High', remediation: 'Check result ownership (or staff role) server-side before serving any result.' } },

  /* ---------- Certificates & Verification ---------- */
  { id: 'cert-self-issue', feature: 'Certificates & Verification', name: 'Self-Issued Credential Without Passing', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced', where: 'POST /certificates/issue',
    hints: ['Issuing is meant to be an admin action following a verified pass.', 'The issue endpoint only checks that someone is signed in.', 'As a plain candidate, POST an issue request for the Cloud Security Associate exam — a real, verifiable credential is created for you.'],
    lesson: 'High-value actions (issuing credentials, payments, refunds) need explicit server-side authorization and a verified precondition.',
    impact: 'Anyone can mint genuine-looking, publicly verifiable certificates in minutes — the certification brand is destroyed.',
    report: { title: 'Credential Issuing Endpoint Lacks Authorization and Pass Verification', severity: 'Critical', remediation: 'Restrict issuing to admins and require a completed, released, passing result before a credential can be created.' } },
  { id: 'cert-enum', feature: 'Certificates & Verification', name: 'Sequential Certificate ID Enumeration (Public)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner', where: 'GET /verify?certId=HC-####',
    hints: ['Certificate ids follow a simple pattern shown right on the verify page.', 'Employers can check any id without signing in — and so can you, repeatedly.', 'Probe HC-1001 through HC-1005 on the public verify page — each real one reveals its holder\'s name and credential.'],
    lesson: 'Public lookup endpoints need unguessable identifiers; sequential ids turn a verification tool into a full directory of credential holders.',
    impact: 'Attackers enumerate every certificate holder — names, credentials and validity — for phishing, forgery templates and privacy abuse.',
    report: { title: 'Enumerable Certificate IDs on the Public Verification Page', severity: 'Medium', remediation: 'Use long random certificate identifiers and rate-limit the public verification endpoint.' } },
  { id: 'cert-param', feature: 'Certificates & Verification', name: 'Verification Result Forgery via URL Parameters', owasp: 'A03:2021 Injection', difficulty: 'Intermediate', where: 'GET /verify?certId=...&status=valid&name=...',
    hints: ['The verify page helpfully reflects extra query parameters into its verdict.', 'What decides whether the page says VALID — the database, or the URL?', 'Open /verify?certId=HC-9999&status=valid&name=Forged+Name — a non-existent certificate is presented as VALID.'],
    lesson: 'Verdicts must come only from server-side records; trusting display parameters lets anyone fabricate proof of certification.',
    impact: 'Fake "verified" links can be sent to employers as proof of credentials that were never earned — fraud enabled by the official page itself.',
    report: { title: 'Certificate Verification Verdict Controlled by URL Parameters', severity: 'High', remediation: 'Compute the verification result solely from the stored credential record; ignore all display parameters.' } },

  /* ---------- Vouchers & Partners ---------- */
  { id: 'voucher-reuse', feature: 'Vouchers & Partners', name: 'Voucher Re-Redemption (Single-Use Not Enforced)', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate', where: 'POST /vouchers/redeem',
    hints: ['Partner vouchers are sold as single-use codes.', 'The redeem flow marks a voucher used — but does it ever check that flag first?', 'Redeem PARTNER-2026-ALPHA once, then redeem the very same code again (any account) — a second free booking is created.'],
    lesson: 'Single-use semantics must be enforced atomically on the server at redemption time; a "used" flag nobody reads is decoration.',
    impact: 'One leaked partner voucher becomes unlimited free exams — the partner programme bleeds revenue.',
    report: { title: 'Single-Use Vouchers Can Be Redeemed Repeatedly', severity: 'High', remediation: 'Check and consume the voucher atomically server-side; reject already-used codes.' } },
  { id: 'voucher-enum', feature: 'Vouchers & Partners', name: 'Voucher Code Enumeration / Guessing', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner', where: 'POST /vouchers/redeem (error oracle)',
    hints: ['The redeem form tells you clearly when a code does not exist.', 'Codes follow a readable pattern: PARTNER-YEAR-WORD.', 'Probe 5 or more different code guesses — nothing throttles you, and the responses confirm which guesses are wrong.'],
    lesson: 'Redemption endpoints are guessing targets: codes need real entropy and attempts need throttling, or valid codes will be found by patience.',
    impact: 'Attackers grind through the predictable code space until they hit live partner vouchers and redeem free exams.',
    report: { title: 'Voucher Codes Are Predictable and Redemption Is Unthrottled', severity: 'Medium', remediation: 'Use high-entropy voucher codes and rate-limit redemption attempts per account and IP.' } },

  /* ---------- Renewals ---------- */
  { id: 'renew-expired', feature: 'Renewals', name: 'Renew Expired Credential Without Re-Examination', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate', where: 'POST /renewals/:credId',
    hints: ['Credentials expire so holders must re-prove competence.', 'One of Alice\'s credentials is already past its expiry date.', 'Renew credential HC-1001 (expired 2026-10-15) — it becomes active again instantly, with no re-exam and no checks.'],
    lesson: 'Expiry is a business rule, not a display state; renewal paths must re-validate the conditions that made the credential lapse.',
    impact: 'Lapsed certificate holders stay "certified" forever — employers rely on credentials the body itself had retired.',
    report: { title: 'Expired Credentials Can Be Renewed Without Re-Examination', severity: 'High', remediation: 'Require a passed renewal exam (or block renewal) once a credential has expired; enforce the rule server-side.' } },
  { id: 'renew-idor', feature: 'Renewals', name: 'Renew Another Candidate\'s Credential', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner', where: 'POST /renewals/:credId',
    hints: ['The renew action is addressed by credential id and trusts the caller.', 'Your renewals page lists only your credentials — the endpoint does not.', 'Renew credential id 2 (Bob\'s HC-1002) while signed in as someone else — it renews without any ownership check.'],
    lesson: 'Ownership checks belong on every object action — renewals change another person\'s legal credential status.',
    impact: 'Strangers can renew, and thereby manipulate the validity of, other people\'s professional credentials.',
    report: { title: 'Missing Ownership Check on Credential Renewal', severity: 'Medium', remediation: 'Verify the credential belongs to the requester (or staff role) before renewing.' } },

  /* ---------- Admin Panel ---------- */
  { id: 'admin-bac', feature: 'Admin Panel', name: 'Broken Access Control — Admin Panel Open to Any Signed-In User', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner', where: 'GET /admin',
    hints: ['The admin panel is not linked from candidate pages — but hiding a link is not protection.', 'Guess the obvious path.', 'Sign in as any candidate and open /admin directly — the full panel, user list included, is served.'],
    lesson: 'Every privileged route must verify authorization on the server; unlinked URLs are found in seconds.',
    impact: 'The entire administration surface — users, credentials, revocation — is one URL away for every registered candidate.',
    report: { title: 'Admin Panel Accessible Without the Admin Role', severity: 'Critical', remediation: 'Enforce the admin role server-side on every admin route and action.' } },
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'CSRF on Admin Action (Revoke Certificate)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate', where: 'POST /admin/revoke (origin marker never verified)',
    hints: ['Admin actions change state with a bare POST and the session cookie.', 'The hx_origin marker the app sets on its own pages is never checked here either.', 'Submit the revoke action from a raw request carrying only the admin session cookie (no hx_origin marker) — the certificate is revoked.'],
    lesson: 'Privileged state changes are the highest-value CSRF targets; tokens and origin checks are mandatory there.',
    impact: 'A booby-trapped page visited by an admin silently revokes real certificates — sabotage with the admin\'s own authority.',
    report: { title: 'Missing CSRF Protection on Certificate Revocation', severity: 'High', remediation: 'Require per-session anti-CSRF tokens on all admin actions and verify Origin/Referer.' } },

  /* ---------- Platform & API ---------- */
  { id: 'api-weak', feature: 'Platform & API', name: 'Weak API Token (Base64 of Email)', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate', where: 'GET /api/me with Authorization: Bearer <token>',
    hints: ['The API token is not random — it is a reversible encoding of something public.', 'What does every user know about themselves that an API might lazily reuse?', 'Send Authorization: Bearer with the base64 encoding of any user\'s email (e.g. alice@test.local) — the API returns that user\'s account data.'],
    lesson: 'API tokens must be opaque random secrets; an encoding is not encryption and a public identifier is not a credential.',
    impact: 'Anyone who knows a victim\'s email address — public information — has full API access to their account.',
    report: { title: 'API Authentication Token Is a Base64 Encoding of the User Email', severity: 'High', remediation: 'Issue long random API tokens, store only their hashes, and support revocation.' } },
  { id: 'api-debug', feature: 'Platform & API', name: 'Sensitive Data Exposure — /api/debug Dumps All Accounts', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner', where: 'GET /api/debug',
    hints: ['Developers love leaving a debug endpoint behind.', 'Try the obvious diagnostic path under /api.', 'Open /api/debug — every account, including passwords, plus vouchers and credentials, is returned as JSON with no login at all.'],
    lesson: 'Debug and diagnostic endpoints must never reach production; if they do, they need the same authentication as the data they expose.',
    impact: 'One unauthenticated request steals every password in the system — total compromise in a single call.',
    report: { title: 'Unauthenticated Debug Endpoint Exposes All User Credentials', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; gate any diagnostics behind admin auth and never include passwords.' } }
];

/* --- scattered shard region 4 --- */
const _c2 = ['UFJWVg==', 'LVdMSg=='];

/* ============================ KEY ASSEMBLY ============================ */
function _asm(parts) { return parts.map(s => [...Buffer.from(s, 'base64').toString('utf8')].reverse().join('')).join(''); }
const ENTRY_KEY_SHA256 = '099f95dd88ac459e85da4f12a274ab00bea2f5d23a5fbec58cefe334e612ff2c';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */
function completionKey() { return _asm([..._c1, ..._c2, ..._c3]); }

/* --- scattered shard region 5 --- */


/* ============================ HELPERS ============================ */
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function renderName(s) { return String(s == null ? '' : s); } // deliberately unescaped (stored-XSS surface)
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}
function currentUser(req) { const c = parseCookies(req); const uid = sessions[c.sid]; return users.find(u => u.id === uid) || null; }
function effectiveRole(req, user) { const c = parseCookies(req); return c.hx_role || (user ? user.role : null); }
function userName(id) { const u = users.find(x => x.id === id); return u ? u.name : 'Unknown'; }
function examTitle(id) { const e = exams.find(x => x.id === id); return e ? e.title : 'Unknown exam'; }

function progressHeader() {
  const done = doneCount(), total = TESTS.length, pct = Math.floor(done / total * 100);
  return '<div style="background:#14141d;color:#eee;padding:10px 18px;display:flex;align-items:center;gap:14px">' +
    '<img src="/logo.png" style="height:34px"> <strong>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</strong>' +
    '<span>' + done + '/' + total + ' tests · ' + pct + '%</span>' +
    '<div style="flex:1;background:#333;border-radius:6px;height:10px;overflow:hidden"><div style="background:#7c5cff;height:10px;width:' + pct + '%"></div></div></div>';
}
function chatWidget() {
  return '<div id="hxchat" style="position:fixed;right:16px;bottom:16px;width:320px;background:#fff;border:1px solid #ccd;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.25);font-family:Arial,sans-serif;z-index:50">' +
    '<div style="background:#14141d;color:#fff;padding:9px 12px;border-radius:12px 12px 0 0"><strong>Lab Coach</strong> — HexaCert guide</div>' +
    '<div id="hxlog" style="height:190px;overflow-y:auto;padding:10px;font-size:13px"></div>' +
    '<div style="display:flex;border-top:1px solid #eee"><input id="hxin" style="flex:1;border:0;padding:9px" placeholder="Ask the coach..."><button id="hxsend" style="background:#7c5cff;color:#fff;border:0;padding:9px 14px">Send</button></div></div>' +
    '<script>(function(){var log=document.getElementById("hxlog"),inp=document.getElementById("hxin");function add(who,txt){var d=document.createElement("div");d.style.margin="6px 0";d.innerHTML="<strong>"+who+":</strong> ";d.appendChild(document.createTextNode(txt));log.appendChild(d);log.scrollTop=log.scrollHeight;}' +
    'function send(){var m=inp.value.trim();if(!m)return;inp.value="";add("You",m);fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:m})}).then(function(r){return r.json();}).then(function(j){add("Coach",j.reply);}).catch(function(){add("Coach","Sorry, I could not answer just now.");});}' +
    'document.getElementById("hxsend").onclick=send;inp.addEventListener("keydown",function(e){if(e.key==="Enter")send();});add("Coach","Hi! I am the Lab Coach for LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '. Ask me what to test, or how a feature works.");})();</script>';
}
function page(req, title, content) {
  const user = currentUser(req);
  const nav = user
    ? '<a href="/">Dashboard</a> · <a href="/exams">Exams</a> · <a href="/bookings">My Bookings</a> · <a href="/results">My Results</a> · <a href="/certificates">My Certificates</a> · <a href="/vouchers">Vouchers</a> · <a href="/renewals">Renewals</a> · <a href="/verify">Verify</a> · <a href="/profile">Profile</a> · <a href="/tests">Tests</a> · <a href="/logout">Logout (' + esc(user.name) + ')</a>'
    : '<a href="/login">Login</a> · <a href="/register">Register</a> · <a href="/verify">Verify a Certificate</a> · <a href="/tests">Tests</a>';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + ' · LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</title></head>' +
    '<body style="margin:0;background:#f4f5fa;font-family:Arial,sans-serif;color:#222">' + progressHeader() +
    '<div style="background:#fff;border-bottom:1px solid #dde;padding:9px 18px;font-size:14px">' + nav + '</div>' +
    '<div style="max-width:920px;margin:22px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:24px"><h2 style="margin-top:0">' + esc(title) + '</h2>' + content + '</div>' +
    chatWidget() + '</body></html>';
}
function gatePage(msg) {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' · Locked</title></head>' +
    '<body style="margin:0;background:#14141d;font-family:Arial,sans-serif"><div style="max-width:520px;margin:60px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:28px;text-align:center">' +
    '<img src="/logo.png" style="height:56px"><h2>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h2>' +
    '<p>This lab is locked. Paste the completion key from Lab ' + (LAB_NUMBER - 1) + ' to start.</p>' +
    (msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/unlock"><input name="key" style="padding:9px;width:80%" placeholder="Completion key from Lab ' + (LAB_NUMBER - 1) + '"><br><br><button style="padding:10px 22px">Unlock LAB ' + LAB_NUMBER + '</button></form></div>' +
    chatWidget() + '</body></html>';
}
function sendHtml(res, status, html, extraCookies) {
  const cookies = ['hx_origin=portal; Path=/'].concat(extraCookies || []);
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': cookies });
  res.end(html);
}
function sendJson(res, status, obj) { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj, null, 1)); }
function redirect(res, loc, extraCookies) {
  res.writeHead(302, { 'Location': loc, 'Set-Cookie': ['hx_origin=portal; Path=/'].concat(extraCookies || []) });
  res.end();
}

/* --- scattered shard region 6 --- */
const _c3 = ['QVgxMA==', 'TkVRTA=='];

/* ============================ PROBING TRACKERS (per client IP) ============================ */
const probedEmails = {};   // ip -> Map(email -> existsBool)
const probedCerts = {};    // ip -> Set(certId)
const probedVouchers = {}; // ip -> Set(code)
const loginFails = {};     // email -> failed count
function ipOf(req) { return req.socket.remoteAddress || 'local'; }
function probeEmail(req, email, exists) {
  const ip = ipOf(req);
  if (!probedEmails[ip]) probedEmails[ip] = new Map();
  probedEmails[ip].set(String(email).toLowerCase(), !!exists);
  const m = probedEmails[ip];
  if (m.size >= 5) { const vals = [...m.values()]; if (vals.includes(true) && vals.includes(false)) pass('auth-enum'); }
}
function probeCert(req, certId) {
  const ip = ipOf(req);
  if (!probedCerts[ip]) probedCerts[ip] = new Set();
  probedCerts[ip].add(certId);
  if (probedCerts[ip].size >= 5) pass('cert-enum');
}
function probeVoucher(req, code) {
  const ip = ipOf(req);
  if (!probedVouchers[ip]) probedVouchers[ip] = new Set();
  probedVouchers[ip].add(code);
  if (probedVouchers[ip].size >= 5) pass('voucher-enum');
}

/* ============================ CHATBOT ============================ */
const ATTRIBUTION = 'These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for "Who is Md. Jony Hassain", or ask ChatGPT.';
const ALIASES = {
  'Login & Authentication': ['login', 'log in', 'sign in', 'authentication', 'password'],
  'Registration & Profile': ['registration', 'register', 'sign up', 'profile'],
  'Exam Booking': ['booking', 'book'],
  'Exam Taking & Results': ['exam taking', 'results', 'result', 'take the exam', 'submit'],
  'Certificates & Verification': ['certificate', 'verification', 'verify', 'credential'],
  'Vouchers & Partners': ['voucher', 'partner'],
  'Renewals': ['renewal', 'renew'],
  'Admin Panel': ['admin'],
  'Platform & API': ['api', 'platform', 'debug', 'token']
};
function findFeature(m) {
  for (const f of FEATURES) if (m.includes(f.toLowerCase())) return f;
  for (const f of FEATURES) { for (const a of ALIASES[f]) if (m.includes(a)) return f; }
  return null;
}
function nextOpen() { return TESTS.find(t => !state.tests[t.id]) || null; }
function chatReply(message) {
  const m = String(message || '').toLowerCase();
  const total = TESTS.length, done = doneCount(), pct = Math.floor(done / total * 100);
  if ((/who/.test(m) && /(built|made|created|founder|build)/.test(m)) || /jony/.test(m) || /founder/.test(m)) return ATTRIBUTION;
  if (/(completion key|the key|next lab|unlock key)/.test(m)) {
    if (state.keyRevealed && done === total) return 'You completed LAB ' + LAB_NUMBER + ' — well done! The completion key for the next lab is: ' + completionKey();
    return 'I do not have the completion key yet — it is only revealed to me when this lab is completed 100%. You are at ' + pct + '% (' + done + '/' + total + ' tests). Keep going, and ask me again at 100%.';
  }
  const feat = findFeature(m);
  const wantsHow = /(how|help|solve|guide|hint|step|stuck|do i|pass)/.test(m);
  if (feat && wantsHow) {
    const open = TESTS.filter(t => t.feature === feat && !state.tests[t.id]);
    const att = state.attempts[feat] || 0;
    if (open.length === 0) return 'Every test in ' + feat + ' is already complete — nice work. Overall progress: ' + done + '/' + total + ' (' + pct + '%).';
    if (att >= 3) {
      return 'Step by step for ' + feat + ' — you have tried it ' + att + ' time(s), so help is unlocked:\n' + open.map(t => '• ' + t.name + ': ' + t.hints[2] + ' (' + t.lesson + ')').join('\n');
    }
    return 'That feature is locked for help. First try the ' + feat + ' tests yourself at least 3 times — I can see you\'ve tried ' + att + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  if (feat && /(how many|count|vulnerabilit|tests|what)/.test(m)) {
    const list = TESTS.filter(t => t.feature === feat);
    return feat + ' has ' + list.length + ' tests: ' + list.map(t => t.name + (state.tests[t.id] ? ' (done)' : '')).join('; ') + '. Attempts so far on this feature: ' + (state.attempts[feat] || 0) + '.';
  }
  if (/(how many|features|tests|vulnerabilit)/.test(m)) {
    return 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + FEATURES.length + ' features and ' + total + ' tests: ' + FEATURES.map(f => f + ' (' + TESTS.filter(t => t.feature === f).length + ')').join(', ') + '. Your progress: ' + done + '/' + total + ' (' + pct + '%). Open /tests to see every test with graded hints.';
  }
  if (/(progress|status|next|score)/.test(m)) {
    const n = nextOpen();
    return 'Your progress: ' + done + '/' + total + ' tests (' + pct + '%).' + (n ? ' Next open test: "' + n.name + '" in ' + n.feature + ' (' + n.difficulty + '). Attempts on that feature so far: ' + (state.attempts[n.feature] || 0) + '.' : ' Everything is complete!');
  }
  if (/(hello|hi|hey|help)/.test(m)) {
    return 'Hello! I coach LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ': ' + FEATURES.length + ' features, ' + total + ' tests, progress ' + done + '/' + total + ' (' + pct + '%). Ask me things like "how many tests in Exam Booking", "what is my progress", or — after at least 3 real tries on a feature — "how do I solve the ' + (nextOpen() ? nextOpen().feature : 'Admin Panel') + ' tests". Step-by-step help unlocks after 3 attempts on a feature.';
  }
  return 'I can help with LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' only. Try: "how many features are there", "what is my progress", or ask about a feature by name (for example "Certificates & Verification"). The /tests page lists every test with hints. Remember: step-by-step guidance for a feature unlocks after you have genuinely tried that feature at least 3 times (you are at ' + pct + '% overall).';
}

/* ============================ HANDLERS ============================ */
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(''));
  });
}
function startSession(res, user) {
  const sid = 's' + (++nextSid) + 'x' + Date.now().toString(36);
  sessions[sid] = user.id;
  return ['sid=' + sid + '; Path=/; HttpOnly'];
}

async function handle(req, res) {
  const u = new URL(req.url, 'http://127.0.0.1');
  const pathname = u.pathname;
  const q = u.searchParams;
  const cookies = parseCookies(req);

  /* Public assets + progress + chatbot work even while locked */
  if (pathname === '/logo.png') {
    try { const img = fs.readFileSync(LOGO_FILE); res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(img); }
    catch (e) { res.writeHead(404); res.end('no logo'); }
    return;
  }
  if (pathname === '/api/progress') {
    const features = {};
    for (const f of FEATURES) features[f] = { total: TESTS.filter(t => t.feature === f).length, done: TESTS.filter(t => t.feature === f && state.tests[t.id]).length, attempts: state.attempts[f] || 0 };
    return sendJson(res, 200, { lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done: doneCount(), pct: Math.floor(doneCount() / TESTS.length * 100), features, complete: doneCount() === TESTS.length });
  }
  if (pathname === '/api/chat' && req.method === 'POST') {
    const raw = await readBody(req);
    let message = '';
    try { message = JSON.parse(raw).message || ''; }
    catch (e) { try { message = new URLSearchParams(raw).get('message') || ''; } catch (e2) { message = ''; } }
    return sendJson(res, 200, { reply: chatReply(message) });
  }
  if (pathname === '/unlock' && req.method === 'POST') {
    const body = new URLSearchParams(await readBody(req));
    const key = (body.get('key') || '').trim();
    if (key && entryKeyMatches(key)) { state.unlocked = true; saveState(); return redirect(res, '/'); }
    res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(gatePage('That key is not correct.'));
  }

  /* Lock gate */
  if (!state.unlocked) { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(gatePage('')); }

  const user = currentUser(req);

  /* ---------- Dashboard ---------- */
  if (pathname === '/') {
    if (!user) return redirect(res, '/login');
    const myBookings = bookings.filter(b => b.userId === user.id);
    const myCreds = credentials.filter(c => c.userId === user.id);
    let h = '<p>Welcome, ' + renderName(user.name) + ' (' + esc(user.role) + '). HexaCert runs certification exams, issues verifiable credentials and sells partner exam vouchers.</p>';
    h += '<h3>Quick start</h3><ul><li><a href="/exams">Browse exams and book</a></li><li><a href="/bookings">My bookings (' + myBookings.length + ')</a></li><li><a href="/certificates">My certificates (' + myCreds.length + ')</a></li><li><a href="/tests">Mission board — all tests & hints</a></li></ul>';
    h += '<p style="color:#666;font-size:13px">Demo accounts: admin@hexacert.local / admin123 · proctor@hexacert.local / proctor123 · alice@test.local / alice123 · bob@test.local / bob123 · carol@test.local / carol123</p>';
    return sendHtml(res, 200, page(req, 'HexaCert Dashboard', h));
  }

  /* ---------- Login ---------- */
  if (pathname === '/login' && req.method === 'GET') {
    return sendHtml(res, 200, page(req, 'Login', '<form method="POST" action="/login">Email <input name="email" style="padding:7px;width:260px"><br><br>Password <input name="password" type="password" style="padding:7px;width:260px"><br><br><button style="padding:9px 20px">Sign in</button></form><p><a href="/forgot">Forgot your password?</a> · <a href="/register">Create an account</a></p>'));
  }
  if (pathname === '/login' && req.method === 'POST') {
    attempt('Login & Authentication');
    const body = new URLSearchParams(await readBody(req));
    const email = (body.get('email') || '').trim();
    const password = body.get('password') || '';
    const found = users.find(x => x.email.toLowerCase() === email.toLowerCase());
    probeEmail(req, email, !!found);
    const inj = /('|")\s*(or|and)\s+('|")?[\d']|--|\/\*|union\s+select/i;
    if (found && found.pass === password) {
      if (found.email === 'admin@hexacert.local' && password === 'admin123') pass('auth-default');
      return redirect(res, '/', startSession(res, found));
    }
    if (inj.test(email) || inj.test(password)) {
      const first = users[0]; // string-built query matches the first row: the admin
      pass('auth-sqli');
      return redirect(res, '/', startSession(res, first));
    }
    loginFails[email.toLowerCase()] = (loginFails[email.toLowerCase()] || 0) + 1;
    if (loginFails[email.toLowerCase()] >= 10) pass('auth-brute');
    const msg = found ? 'Incorrect password for this account.' : 'No account found with that email.';
    return sendHtml(res, 200, page(req, 'Login', '<p style="color:#b00">' + msg + '</p><form method="POST" action="/login">Email <input name="email" style="padding:7px;width:260px"><br><br>Password <input name="password" type="password" style="padding:7px;width:260px"><br><br><button style="padding:9px 20px">Sign in</button></form><p><a href="/forgot">Forgot your password?</a></p>'));
  }
  if (pathname === '/logout') {
    if (cookies.sid) delete sessions[cookies.sid];
    return redirect(res, '/login', ['sid=; Path=/; Max-Age=0']);
  }

  /* ---------- Forgot / reset ---------- */
  if (pathname === '/forgot' && req.method === 'GET') {
    return sendHtml(res, 200, page(req, 'Forgot Password', '<form method="POST" action="/forgot">Email <input name="email" style="padding:7px;width:280px"><br><br><button style="padding:9px 20px">Send reset link</button></form>'));
  }
  if (pathname === '/forgot' && req.method === 'POST') {
    attempt('Login & Authentication');
    const body = new URLSearchParams(await readBody(req));
    const email = (body.get('email') || '').trim();
    const found = users.find(x => x.email.toLowerCase() === email.toLowerCase());
    probeEmail(req, email, !!found);
    if (!found) return sendHtml(res, 200, page(req, 'Forgot Password', '<p style="color:#b00">No account found for that email.</p><p><a href="/forgot">Try again</a></p>'));
    const token = 'HX' + found.id; // predictable by design of the lab
    resets[found.email.toLowerCase()] = token;
    const preview = '<div style="background:#fffbe6;border:1px solid #e6d97c;padding:12px">[Simulated email preview] Hello ' + esc(found.name) + ', reset your HexaCert password here: /reset?email=' + encodeURIComponent(found.email) + '&amp;token=' + token + '</div>';
    return sendHtml(res, 200, page(req, 'Forgot Password', '<p>Reset link sent to your email.</p>' + preview + '<p><a href="/reset?email=' + encodeURIComponent(found.email) + '&amp;token=' + token + '">Open the reset form</a></p>'));
  }
  if (pathname === '/reset' && req.method === 'GET') {
    const email = q.get('email') || '', token = q.get('token') || '';
    return sendHtml(res, 200, page(req, 'Reset Password', '<form method="POST" action="/reset"><input type="hidden" name="email" value="' + esc(email) + '"><input type="hidden" name="token" value="' + esc(token) + '">New password <input name="newpass" type="password" style="padding:7px;width:240px"><br><br><button style="padding:9px 20px">Set new password</button></form>'));
  }
  if (pathname === '/reset' && req.method === 'POST') {
    attempt('Login & Authentication');
    const body = new URLSearchParams(await readBody(req));
    const email = (body.get('email') || '').trim().toLowerCase();
    const token = body.get('token') || '';
    const newpass = body.get('newpass') || '';
    const found = users.find(x => x.email.toLowerCase() === email);
    if (found && resets[email] && resets[email] === token && newpass) {
      found.pass = newpass;
      delete resets[email];
      if (token === 'HX' + found.id) pass('auth-reset');
      return sendHtml(res, 200, page(req, 'Reset Password', '<p>Password updated. <a href="/login">Sign in</a></p>'));
    }
    return sendHtml(res, 200, page(req, 'Reset Password', '<p style="color:#b00">That reset link is invalid or expired.</p>'));
  }

  /* ---------- Register ---------- */
  if (pathname === '/register' && req.method === 'GET') {
    return sendHtml(res, 200, page(req, 'Create Account', '<form method="POST" action="/register">Full name <input name="name" style="padding:7px;width:260px"><br><br>Email <input name="email" style="padding:7px;width:260px"><br><br>Password <input name="password" type="password" style="padding:7px;width:260px"><br><br><button style="padding:9px 20px">Register</button></form>'));
  }
  if (pathname === '/register' && req.method === 'POST') {
    attempt('Registration & Profile');
    const body = new URLSearchParams(await readBody(req));
    const name = body.get('name') || 'New Candidate';
    const email = (body.get('email') || '').trim();
    const password = body.get('password') || '';
    if (!email || users.some(x => x.email.toLowerCase() === email.toLowerCase())) {
      return sendHtml(res, 200, page(req, 'Create Account', '<p style="color:#b00">That email is already registered (or empty).</p><p><a href="/register">Try again</a></p>'));
    }
    const nu = { id: nextUserId++, name, email, pass: password, role: 'candidate' };
    // Mass assignment flaw: every extra submitted field is bound onto the account.
    for (const [k, v] of body.entries()) { if (!['name', 'email', 'password'].includes(k)) nu[k] = v; }
    users.push(nu);
    if ((password || '').length < 6) pass('reg-weak');
    if (/<script|onerror=|onload=|<svg|<img[^>]*onerror/i.test(name)) pass('reg-xss');
    if (nu.role !== 'candidate') pass('reg-mass');
    return redirect(res, '/', startSession(res, nu));
  }

  /* ---------- Profile ---------- */
  if (pathname === '/profile' && req.method === 'GET') {
    if (!user) return redirect(res, '/login');
    return sendHtml(res, 200, page(req, 'My Profile', '<p>Signed in as ' + renderName(user.name) + ' · ' + esc(user.email) + ' · role: ' + esc(user.role) + '</p><form method="POST" action="/profile">Display name <input name="name" value="' + esc(user.name) + '" style="padding:7px;width:280px"><br><br><button style="padding:9px 20px">Save profile</button></form>'));
  }
  if (pathname === '/profile' && req.method === 'POST') {
    if (!user) return redirect(res, '/login');
    attempt('Registration & Profile');
    const body = new URLSearchParams(await readBody(req));
    const name = body.get('name');
    if (name) {
      user.name = name;
      if (/<script|onerror=|onload=|<svg|<img[^>]*onerror/i.test(name)) pass('reg-xss');
      if (cookies.hx_origin !== 'portal') pass('reg-csrf');
    }
    return redirect(res, '/profile');
  }

  /* ---------- Exams & booking ---------- */
  if (pathname === '/exams') {
    if (!user) return redirect(res, '/login');
    let h = '<table style="width:100%;border-collapse:collapse">';
    for (const e of exams) {
      h += '<tr style="border-bottom:1px solid #eee"><td style="padding:10px"><strong>' + esc(e.title) + '</strong> (' + esc(e.code) + ')<br><span style="color:#666">Pass mark ' + e.passMark + '% · $' + e.price + '</span></td>' +
        '<td style="padding:10px;text-align:right"><form method="POST" action="/bookings"><input type="hidden" name="examId" value="' + e.id + '">Date <input name="date" value="2026-11-10" style="padding:6px;width:110px"> <button style="padding:7px 14px">Book exam</button></form></td></tr>';
    }
    h += '</table><p>Have a partner voucher? <a href="/vouchers">Redeem it instead</a>.</p>';
    return sendHtml(res, 200, page(req, 'Certification Exams', h));
  }
  if (pathname === '/bookings' && req.method === 'POST') {
    if (!user) return redirect(res, '/login');
    attempt('Exam Booking');
    const body = new URLSearchParams(await readBody(req));
    const examId = parseInt(body.get('examId') || '0', 10);
    const ex = exams.find(e => e.id === examId);
    if (!ex) { res.writeHead(404); return res.end('exam not found'); }
    bookings.push({ id: nextBookingId++, userId: user.id, examId: ex.id, origExamId: ex.id, date: body.get('date') || '2026-11-10', status: 'booked', score: null, released: false, voucher: null });
    return redirect(res, '/bookings');
  }
  if (pathname === '/bookings' && req.method === 'GET') {
    if (!user) return redirect(res, '/login');
    const mine = bookings.filter(b => b.userId === user.id);
    let h = mine.length ? '' : '<p>No bookings yet. <a href="/exams">Book an exam</a>.</p>';
    for (const b of mine) h += '<p style="border-bottom:1px solid #eee;padding:8px 0"><a href="/bookings/' + b.id + '">Booking #' + b.id + '</a> — ' + esc(examTitle(b.examId)) + ' · ' + esc(b.date) + ' · ' + esc(b.status) + (b.status === 'booked' ? ' · <a href="/exam/' + b.id + '">Take exam</a>' : '') + '</p>';
    return sendHtml(res, 200, page(req, 'My Bookings', h));
  }
  const mBook = pathname.match(/^\/bookings\/(\d+)$/);
  if (mBook && req.method === 'GET') {
    if (!user) return redirect(res, '/login');
    attempt('Exam Booking');
    const b = bookings.find(x => x.id === parseInt(mBook[1], 10));
    if (!b) { res.writeHead(404); return res.end('booking not found'); }
    if (b.userId !== user.id) pass('book-idor');
    let h = '<p><strong>Booking #' + b.id + '</strong></p><p>Candidate: ' + renderName(userName(b.userId)) + '</p><p>Exam: ' + esc(examTitle(b.examId)) + '</p><p>Date: ' + esc(b.date) + '</p><p>Status: ' + esc(b.status) + (b.score != null ? ' · Score: ' + b.score + '%' : '') + '</p>';
    h += '<h3>Change exam</h3><form method="POST" action="/bookings/' + b.id + '/exam"><select name="examId">' + exams.map(e => '<option value="' + e.id + '"' + (e.id === b.examId ? ' selected' : '') + '>' + esc(e.title) + ' — $' + e.price + '</option>').join('') + '</select> <button style="padding:7px 14px">Change exam</button></form>';
    if (b.status === 'booked') h += '<p><a href="/exam/' + b.id + '">Take this exam now</a></p>';
    return sendHtml(res, 200, page(req, 'Booking #' + b.id, h));
  }
  const mSwap = pathname.match(/^\/bookings\/(\d+)\/exam$/);
  if (mSwap && req.method === 'POST') {
    if (!user) return redirect(res, '/login');
    attempt('Exam Booking');
    const body = new URLSearchParams(await readBody(req));
    const b = bookings.find(x => x.id === parseInt(mSwap[1], 10));
    if (!b) { res.writeHead(404); return res.end('booking not found'); }
    const newExam = exams.find(e => e.id === parseInt(body.get('examId') || '0', 10));
    if (newExam && newExam.id !== b.examId) {
      const orig = exams.find(e => e.id === b.origExamId);
      if (orig && newExam.price > orig.price) pass('book-swap');
      b.examId = newExam.id;
    }
    return redirect(res, '/bookings/' + b.id);
  }

  /* ---------- Exam taking & results ---------- */
  const mTake = pathname.match(/^\/exam\/(\d+)$/);
  if (mTake && req.method === 'GET') {
    if (!user) return redirect(res, '/login');
    const b = bookings.find(x => x.id === parseInt(mTake[1], 10));
    if (!b) { res.writeHead(404); return res.end('booking not found'); }
    const h = '<p>You are taking <strong>' + esc(examTitle(b.examId)) + '</strong>. When you finish, your answers are sent for grading.</p>' +
      '<form method="POST" action="/exam/' + b.id + '/submit"><input type="hidden" name="score" value="0"><p>Q1. Which control prevents SQL injection?<br><label><input type="radio" name="q1"> Storing passwords in cookies</label><br><label><input type="radio" name="q1"> Parameterised queries</label></p><button style="padding:9px 20px">Submit exam</button></form>';
    return sendHtml(res, 200, page(req, 'Take Exam — ' + examTitle(b.examId), h));
  }
  const mSubmit = pathname.match(/^\/exam\/(\d+)\/submit$/);
  if (mSubmit && req.method === 'POST') {
    if (!user) return redirect(res, '/login');
    attempt('Exam Taking & Results');
    const body = new URLSearchParams(await readBody(req));
    const b = bookings.find(x => x.id === parseInt(mSubmit[1], 10));
    if (!b) { res.writeHead(404); return res.end('booking not found'); }
    const score = parseInt(body.get('score') || '0', 10) || 0;
    b.status = 'completed'; b.score = score; // client-supplied score trusted (the flaw)
    if (b.userId === user.id) pass('exam-selfgrade');
    return redirect(res, '/results');
  }
  if (pathname === '/results' && req.method === 'GET') {
    if (!user) return redirect(res, '/login');
    const mine = bookings.filter(b => b.userId === user.id && b.status === 'completed');
    let h = mine.length ? '' : '<p>No completed exams yet.</p>';
    for (const b of mine) h += '<p style="border-bottom:1px solid #eee;padding:8px 0"><a href="/results/' + b.id + '">Result #' + b.id + '</a> — ' + esc(examTitle(b.examId)) + ' · Score ' + b.score + '% · ' + (b.released ? 'Released' : 'Awaiting proctor release') + '</p>';
    return sendHtml(res, 200, page(req, 'My Results', h));
  }
  const mResult = pathname.match(/^\/results\/(\d+)$/);
  if (mResult && req.method === 'GET') {
    if (!user) return redirect(res, '/login');
    attempt('Exam Taking & Results');
    const b = bookings.find(x => x.id === parseInt(mResult[1], 10));
    if (!b || b.status !== 'completed') { res.writeHead(404); return res.end('result not found'); }
    if (b.userId !== user.id && user.role === 'candidate') pass('exam-result-idor');
    const ex = exams.find(e => e.id === b.examId);
    let h = '<p><strong>Result for booking #' + b.id + '</strong></p><p>Candidate: ' + renderName(userName(b.userId)) + '</p><p>Exam: ' + esc(examTitle(b.examId)) + '</p><p>Score: ' + b.score + '% (pass mark ' + (ex ? ex.passMark : '?') + '%) — ' + (b.score >= (ex ? ex.passMark : 999) ? 'PASS' : 'FAIL') + '</p><p>Release status: ' + (b.released ? 'Released' : 'Not released') + '</p>';
    h += '<form method="POST" action="/results/' + b.id + '/release"><button style="padding:8px 16px">Release result (proctor)</button></form>';
    return sendHtml(res, 200, page(req, 'Exam Result #' + b.id, h));
  }
  const mRelease = pathname.match(/^\/results\/(\d+)\/release$/);
  if (mRelease && req.method === 'POST') {
    if (!user) return redirect(res, '/login');
    attempt('Exam Taking & Results');
    const b = bookings.find(x => x.id === parseInt(mRelease[1], 10));
    if (!b) { res.writeHead(404); return res.end('booking not found'); }
    b.released = true; // no role check (the flaw)
    if (user.role === 'candidate') pass('exam-release');
    return redirect(res, '/results/' + b.id);
  }

  /* ---------- Certificates & verification ---------- */
  if (pathname === '/certificates' && req.method === 'GET') {
    if (!user) return redirect(res, '/login');
    const mine = credentials.filter(c => c.userId === user.id);
    let h = mine.length ? '' : '<p>You hold no certificates yet.</p>';
    for (const c of mine) h += '<p style="border-bottom:1px solid #eee;padding:8px 0"><strong>' + esc(c.certId) + '</strong> — ' + esc(examTitle(c.examId)) + ' · issued ' + esc(c.issued) + ' · expires ' + esc(c.expires) + ' · ' + esc(c.status) + ' · <a href="/verify?certId=' + esc(c.certId) + '">Public verify link</a></p>';
    h += '<h3>Issue a certificate</h3><form method="POST" action="/certificates/issue"><select name="examId">' + exams.map(e => '<option value="' + e.id + '">' + esc(e.title) + '</option>').join('') + '</select> <button style="padding:7px 14px">Issue certificate</button></form>';
    return sendHtml(res, 200, page(req, 'My Certificates', h));
  }
  if (pathname === '/certificates/issue' && req.method === 'POST') {
    if (!user) return redirect(res, '/login');
    attempt('Certificates & Verification');
    const body = new URLSearchParams(await readBody(req));
    const examId = parseInt(body.get('examId') || '0', 10);
    if (!exams.some(e => e.id === examId)) { res.writeHead(404); return res.end('exam not found'); }
    certCounter += 1;
    const today = new Date().toISOString().slice(0, 10);
    const exp = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    credentials.push({ id: nextCredId++, certId: 'HC-' + certCounter, userId: user.id, examId, issued: today, expires: exp, status: 'active' });
    if (user.role !== 'admin') pass('cert-self-issue');
    return redirect(res, '/certificates');
  }
  if (pathname === '/verify' && req.method === 'GET') {
    attempt('Certificates & Verification');
    const certId = (q.get('certId') || '').trim();
    const nameQ = q.get('name');
    const statusQ = q.get('status');
    let h = '<p>Employers: enter a certificate ID to check it is genuine. Example format: HC-1001.</p><form method="GET" action="/verify">Certificate ID <input name="certId" value="' + esc(certId) + '" style="padding:7px;width:200px"> <button style="padding:7px 14px">Verify</button></form>';
    if (certId) {
      probeCert(req, certId);
      const cert = credentials.find(c => c.certId === certId);
      const validCard = '<div style="background:#e8f8e8;border:1px solid #7c7;padding:14px;margin-top:14px"><strong>✓ VALID CERTIFICATE</strong><br>Certificate: ' + esc(certId) + '<br>Holder: ' + renderName(nameQ || (cert ? userName(cert.userId) : 'Unknown')) + (cert ? '<br>Credential: ' + esc(examTitle(cert.examId)) + '<br>Expires: ' + esc(cert.expires) : '') + '</div>';
      const invalidCard = reason => '<div style="background:#fdeaea;border:1px solid #c77;padding:14px;margin-top:14px"><strong>✗ NOT VALID</strong><br>' + esc(reason) + '</div>';
      if (statusQ) {
        h += validCard;
        if (!cert || cert.status !== 'active' || (nameQ && cert && nameQ !== userName(cert.userId))) pass('cert-param');
      } else if (cert && cert.status === 'active' && new Date(cert.expires) >= new Date()) {
        if (nameQ && nameQ !== userName(cert.userId)) h += invalidCard('The holder name does not match our records.');
        else h += validCard;
      } else if (cert) {
        h += invalidCard('This certificate is ' + cert.status + ' or expired.');
      } else {
        h += invalidCard('Certificate not found.');
      }
    }
    return sendHtml(res, 200, page(req, 'Verify a Certificate', h));
  }

  /* ---------- Vouchers ---------- */
  if (pathname === '/vouchers' && req.method === 'GET') {
    if (!user) return redirect(res, '/login');
    let h = '<p>Training partners sell single-use exam vouchers. Current partner codes (ask your partner for yours):</p><ul>';
    for (const v of vouchers) h += '<li>' + esc(v.code) + ' — ' + esc(v.partner) + ' · ' + (v.used ? 'used' : 'available') + '</li>';
    h += '</ul><h3>Redeem a voucher</h3><form method="POST" action="/vouchers/redeem">Code <input name="code" style="padding:7px;width:230px"> Exam <select name="examId">' + exams.map(e => '<option value="' + e.id + '">' + esc(e.title) + '</option>').join('') + '</select> <button style="padding:7px 14px">Redeem</button></form>';
    return sendHtml(res, 200, page(req, 'Exam Vouchers', h));
  }
  if (pathname === '/vouchers/redeem' && req.method === 'POST') {
    if (!user) return redirect(res, '/login');
    attempt('Vouchers & Partners');
    const body = new URLSearchParams(await readBody(req));
    const code = (body.get('code') || '').trim();
    const examId = parseInt(body.get('examId') || '1', 10);
    probeVoucher(req, code);
    const v = vouchers.find(x => x.code === code);
    if (!v) return sendHtml(res, 200, page(req, 'Exam Vouchers', '<p style="color:#b00">That voucher code does not exist.</p><p><a href="/vouchers">Try again</a></p>'));
    const alreadyUsed = v.used;
    bookings.push({ id: nextBookingId++, userId: user.id, examId: exams.some(e => e.id === examId) ? examId : 1, origExamId: exams.some(e => e.id === examId) ? examId : 1, date: '2026-11-12', status: 'booked', score: null, released: false, voucher: code });
    v.used = true; v.usedBy = user.id;
    if (alreadyUsed) pass('voucher-reuse');
    return redirect(res, '/bookings');
  }

  /* ---------- Renewals ---------- */
  if (pathname === '/renewals' && req.method === 'GET') {
    if (!user) return redirect(res, '/login');
    const mine = credentials.filter(c => c.userId === user.id);
    let h = mine.length ? '' : '<p>You hold no certificates to renew.</p>';
    for (const c of mine) h += '<p style="border-bottom:1px solid #eee;padding:8px 0"><strong>' + esc(c.certId) + '</strong> — ' + esc(examTitle(c.examId)) + ' · expires ' + esc(c.expires) + ' · ' + esc(c.status) + ' <form method="POST" action="/renewals/' + c.id + '" style="display:inline"><button style="padding:6px 12px">Renew for 1 year</button></form></p>';
    return sendHtml(res, 200, page(req, 'Renewals', h));
  }
  const mRenew = pathname.match(/^\/renewals\/(\d+)$/);
  if (mRenew && req.method === 'POST') {
    if (!user) return redirect(res, '/login');
    attempt('Renewals');
    const cred = credentials.find(c => c.id === parseInt(mRenew[1], 10));
    if (!cred) { res.writeHead(404); return res.end('credential not found'); }
    const wasExpired = new Date(cred.expires) < new Date();
    const base = wasExpired ? new Date() : new Date(cred.expires);
    base.setFullYear(base.getFullYear() + 1);
    cred.expires = base.toISOString().slice(0, 10);
    cred.status = 'active';
    if (cred.userId !== user.id) pass('renew-idor');
    if (wasExpired) pass('renew-expired');
    return redirect(res, '/renewals');
  }

  /* ---------- Proctor & admin ---------- */
  if (pathname === '/proctor' && req.method === 'GET') {
    if (!user) return redirect(res, '/login');
    if (effectiveRole(req, user) !== 'proctor' && effectiveRole(req, user) !== 'admin' && user.role !== 'proctor' && user.role !== 'admin') {
      if (cookies.hx_role) pass('auth-cookie');
      return sendHtml(res, 403, page(req, 'Proctor Area', '<p>Proctors only.</p>'));
    }
    if (user.role !== 'proctor' && user.role !== 'admin' && cookies.hx_role) pass('auth-cookie');
    let h = '<p>Completed exams awaiting or past release:</p>';
    for (const b of bookings.filter(x => x.status === 'completed')) h += '<p style="border-bottom:1px solid #eee;padding:7px 0">Booking #' + b.id + ' — ' + renderName(userName(b.userId)) + ' — ' + esc(examTitle(b.examId)) + ' — ' + b.score + '% — ' + (b.released ? 'Released' : 'Unreleased') + ' <form method="POST" action="/results/' + b.id + '/release" style="display:inline"><button style="padding:5px 10px">Release</button></form></p>';
    return sendHtml(res, 200, page(req, 'Proctor Queue', h));
  }
  if (pathname === '/admin' && req.method === 'GET') {
    if (!user) return redirect(res, '/login');
    attempt('Admin Panel');
    if (user.role !== 'admin') { if (cookies.hx_role === 'admin') pass('auth-cookie'); else pass('admin-bac'); }
    let h = '<h3>Users</h3>';
    for (const x of users) h += '<p style="border-bottom:1px solid #eee;padding:6px 0">#' + x.id + ' ' + renderName(x.name) + ' · ' + esc(x.email) + ' · ' + esc(x.role) + '</p>';
    h += '<h3>Credentials</h3>';
    for (const c of credentials) h += '<p style="border-bottom:1px solid #eee;padding:6px 0">' + esc(c.certId) + ' — ' + renderName(userName(c.userId)) + ' — ' + esc(examTitle(c.examId)) + ' — ' + esc(c.status) + ' <form method="POST" action="/admin/revoke" style="display:inline"><input type="hidden" name="credId" value="' + c.id + '"><button style="padding:5px 10px">Revoke</button></form></p>';
    h += '<p><a href="/proctor">Proctor queue</a></p>';
    return sendHtml(res, 200, page(req, 'Admin Panel', h));
  }
  if (pathname === '/admin/revoke' && req.method === 'POST') {
    if (!user) return redirect(res, '/login');
    attempt('Admin Panel');
    const body = new URLSearchParams(await readBody(req));
    const cred = credentials.find(c => c.id === parseInt(body.get('credId') || '0', 10));
    if (cred) {
      cred.status = 'revoked';
      if (cookies.hx_origin !== 'portal') pass('admin-csrf');
    }
    return redirect(res, '/admin');
  }

  /* ---------- API ---------- */
  if (pathname === '/api/me' && req.method === 'GET') {
    attempt('Platform & API');
    const auth = req.headers.authorization || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    let found = null;
    try { const dec = Buffer.from(token, 'base64').toString('utf8'); found = users.find(x => x.email.toLowerCase() === dec.toLowerCase()) || null; } catch (e) { found = null; }
    if (found) { pass('api-weak'); return sendJson(res, 200, { id: found.id, name: found.name, email: found.email, role: found.role }); }
    return sendJson(res, 401, { error: 'invalid token' });
  }
  if (pathname === '/api/debug' && req.method === 'GET') {
    attempt('Platform & API');
    pass('api-debug');
    return sendJson(res, 200, { users: users.map(x => ({ id: x.id, name: x.name, email: x.email, password: x.pass, role: x.role })), vouchers, credentials });
  }

  /* ---------- Tests / complete / certificate ---------- */
  if (pathname === '/tests' && req.method === 'GET') {
    let h = '<p>Every test below completes by <strong>doing</strong> the exploit — there is no "mark done" button. Hints open one at a time. The Lab Coach unlocks step-by-step help for a feature after you have genuinely tried that feature at least 3 times.</p>';
    for (const f of FEATURES) {
      const list = TESTS.filter(t => t.feature === f);
      h += '<h3>' + esc(f) + ' <span style="color:#666;font-size:13px">(' + list.filter(t => state.tests[t.id]).length + '/' + list.length + ' done · ' + (state.attempts[f] || 0) + ' attempts)</span></h3>';
      for (const t of list) {
        const doneMark = state.tests[t.id] ? '<span style="color:#1a7f1a">✓ done</span>' : '<span style="color:#999">○ open</span>';
        h += '<div style="border:1px solid #e3e3ee;border-radius:8px;padding:10px 12px;margin:8px 0"><strong>' + esc(t.name) + '</strong> ' + doneMark + '<br><span style="color:#666;font-size:13px">' + esc(t.owasp) + ' · ' + esc(t.difficulty) + ' · ' + esc(t.where) + '</span>' +
          '<details style="margin-top:6px"><summary>Hints</summary><ol>' + t.hints.map(x => '<li>' + esc(x) + '</li>').join('') + '</ol></details></div>';
      }
    }
    return sendHtml(res, 200, page(req, 'Mission Board — All Tests', h));
  }
  if (pathname === '/complete/name' && req.method === 'POST') {
    const body = new URLSearchParams(await readBody(req));
    state.testerName = (body.get('name') || '').slice(0, 80);
    saveState();
    return redirect(res, '/complete');
  }
  if (pathname === '/complete' && req.method === 'GET') {
    const done = doneCount(), total = TESTS.length;
    if (done < total) {
      const left = TESTS.filter(t => !state.tests[t.id]);
      let h = '<p>You have completed ' + done + ' of ' + total + ' tests (' + Math.floor(done / total * 100) + '%). The completion summary, key and certificate unlock at 100%.</p><h3>Still open</h3><ul>' + left.map(t => '<li>' + esc(t.name) + ' — ' + esc(t.feature) + '</li>').join('') + '</ul><p><a href="/tests">Back to the mission board</a></p>';
      return sendHtml(res, 200, page(req, 'Completion Summary', h));
    }
    let h = '<h3>1) Total features in this lab</h3><p>' + FEATURES.length + ' features: ' + FEATURES.map(esc).join(', ') + '.</p>';
    h += '<h3>2) Vulnerabilities per feature</h3><ul>' + FEATURES.map(f => '<li>' + esc(f) + ': ' + TESTS.filter(t => t.feature === f).length + ' tests</li>').join('') + '</ul>';
    h += '<h3>3) How testing was done — ' + total + ' techniques completed</h3><ul>' + TESTS.map(t => '<li>' + esc(t.name) + ' (' + esc(t.owasp) + ')</li>').join('') + '</ul>';
    h += '<h3>4) What you learned</h3><ul>' + TESTS.map(t => '<li><strong>' + esc(t.name) + ':</strong> ' + esc(t.lesson) + '</li>').join('') + '</ul>';
    h += '<h3>5) What this means for a real client</h3><ul>' + TESTS.map(t => '<li><strong>' + esc(t.name) + ':</strong> ' + esc(t.impact) + '</li>').join('') + '</ul>';
    h += '<h3>6) Writing it in a real report</h3><ul>' + TESTS.map(t => '<li><strong>' + esc(t.report.title) + '</strong> — Severity: ' + esc(t.report.severity) + ' — Remediation: ' + esc(t.report.remediation) + '</li>').join('') + '</ul>';
    h += '<div style="background:#eef;border:1px solid #99b;padding:14px;margin-top:16px"><strong>Your completion key for Lab ' + (LAB_NUMBER + 1) + ':</strong><br><span style="font-size:19px;letter-spacing:1px">' + esc(completionKey()) + '</span></div>';
    h += '<h3>Your certificate</h3><form method="POST" action="/complete/name">Name on certificate <input name="name" value="' + esc(state.testerName) + '" style="padding:7px;width:260px"> <button style="padding:7px 14px">Save name</button></form><p><a href="/certificate">View / print your certificate</a></p>';
    return sendHtml(res, 200, page(req, 'Lab Complete — Summary', h));
  }
  if (pathname === '/certificate' && req.method === 'GET') {
    if (doneCount() < TESTS.length) return sendHtml(res, 200, page(req, 'Certificate', '<p>The certificate unlocks when all ' + TESTS.length + ' tests are complete. Current progress: ' + doneCount() + '/' + TESTS.length + '.</p>'));
    const name = state.testerName || (user ? user.name : 'HexaCert Tester');
    const date = state.completedAt ? state.completedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
    const card = '<div style="border:3px double #7c5cff;border-radius:14px;padding:34px;text-align:center;background:#fff;max-width:640px;margin:10px auto">' +
      '<img src="/logo.png" style="height:64px"><h2 style="margin:8px 0">Certificate of Completion</h2>' +
      '<p>This certifies that</p><h3 style="font-size:24px;margin:6px 0">' + esc(name) + '</h3>' +
      '<p>has completed 100% of the security tests in <strong>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</strong><br>(' + TESTS.length + ' tests across ' + FEATURES.length + ' features)</p>' +
      '<p>Completed on ' + esc(date) + '</p><p style="color:#555">HexaCyberLab — Built by Md. Jony Hassain, Founder</p></div>' +
      '<p style="text-align:center"><button onclick="window.print()">Print certificate</button></p>';
    return sendHtml(res, 200, page(req, 'Certificate — LAB ' + LAB_NUMBER, card));
  }

  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(page(req, 'Not Found', '<p>That page does not exist.</p>'));
}

const server = http.createServer((req, res) => {
  handle(req, res).catch(() => {
    try { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('internal error'); } catch (e) {}
  });
});
server.listen(PORT, HOST, () => { console.log(LAB_NAME + ' LAB ' + LAB_NUMBER + ' listening on http://' + HOST + ':' + PORT); });
