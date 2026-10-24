'use strict';
/*
 * HexaExam — LAB 53 (Category 6: Education & E-learning)
 * A deliberately vulnerable online examination platform for security training.
 * Zero-dependency Node.js. Binds 127.0.0.1:3062 only. LOCAL USE ONLY.
 * All accounts, exams, questions and results are fake seed data.
 * The intentional vulnerabilities are catalogued in the TESTS registry below
 * and in VULNERABILITIES.md. Never deploy this application anywhere public.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3062;
const HOST = '127.0.0.1';
const LAB_NUMBER = 53;
const LAB_NAME = 'HexaExam';
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const LOGO_FILE = path.join(DIR, 'logo.png');

/* ------------------------------------------------------------------ *
 * Key material — region 1 of 2.
 * The entry key for this lab exists ONLY as encoded shards (each shard
 * is the base64 of one reversed piece). No plain key literal appears
 * anywhere in this file. The completion key shards live in a separate
 * region further below (region 2 of 2).
 * ------------------------------------------------------------------ */
const _eS = ["TC1YSA==","Ni0zNQ==","NVpJRg==","LVkzRg==","WjMyVw==","WFVDQQ=="];
function _asm(shards) {
  return shards.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}
function entryKey() { return _asm(_eS); }

/* ------------------------- progress state ------------------------- */
let state = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadState() {
  try {
    const raw = fs.readFileSync(PROGRESS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') state = Object.assign(state, parsed);
  } catch (e) { /* fresh install — no state file yet */ }
}
function saveState() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2)); } catch (e) { /* non-fatal */ }
}
function pass(id) {
  if (!state.tests[id]) {
    state.tests[id] = true;
    const done = TESTS.filter(t => state.tests[t.id]).length;
    if (done >= TESTS.length && !state.keyRevealed) {
      state.keyRevealed = true;
      state.completedAt = new Date().toISOString();
    }
    saveState();
  }
}
function attempt(feature) {
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  saveState();
}
function doneCount() { return TESTS.filter(t => state.tests[t.id]).length; }
function isComplete() { return doneCount() >= TESTS.length; }

/* --------------------------- TESTS registry ------------------------ */
const TESTS = [
  /* ---- Login & Authentication ---- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL injection login bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login form builds its lookup by gluing your input straight into a query string.', 'A classic tautology in the email field can make the WHERE clause true for every row.', "Try an email like ' OR '1'='1 and any password — the first row in the table is the admin."],
    lesson: 'String-built queries let an attacker rewrite the login logic itself; the first matching row is usually the administrator.',
    impact: 'On a real exam platform this hands an attacker the admin account in seconds — every question bank, result and candidate record is exposed.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements for all database access and never concatenate user input into SQL.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute force — no rate limit or lockout', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Fail a login. Then fail it again. Notice what does NOT happen.', 'There is no counter slowing you down — scripts can try thousands of passwords.', 'Fail 10 logins in a row for one account and watch the app happily accept the 10th try.'],
    lesson: 'Without throttling or lockout, password guessing is limited only by the attacker\u2019s bandwidth.',
    impact: 'Attackers can grind through common-password lists against real candidate and examiner accounts until one opens.',
    report: { title: 'Missing Brute-Force Protection on Login (No Rate Limiting or Lockout)', severity: 'High', remediation: 'Add progressive delays, per-account and per-IP rate limits, lockout or CAPTCHA after repeated failures, and alert on attack patterns.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User enumeration via forgot-password responses', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['The forgot-password form answers differently depending on one detail.', 'Compare the message for an email that exists with one that does not.', 'Request a reset for alice@test.local, then for nobody@nowhere.local — one says "sent", the other admits there is no account.'],
    lesson: 'Different responses for existing vs non-existing accounts turn your own forms into an account-existence oracle.',
    impact: 'Attackers first harvest a list of valid candidate/examiner emails, then aim phishing and password attacks only at accounts that exist.',
    report: { title: 'User Enumeration Through Differential Forgot-Password Responses', severity: 'Medium', remediation: 'Return one identical, generic message for every forgot-password request regardless of whether the account exists.' } },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Published demo account with default credentials', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['The login page itself advertises a demo account.', 'Demo credentials printed on production pages are production credentials.', 'Sign in with the demo account shown on the login page: demo@hexaexam.local / demo123.'],
    lesson: 'Demo and default accounts left active with known passwords are open doors, not conveniences.',
    impact: 'Anyone on the internet can walk in with the printed credentials and operate as a real user of the platform.',
    report: { title: 'Active Demo Account With Publicly Known Default Credentials', severity: 'High', remediation: 'Remove or disable demo/default accounts in production and force unique, strong passwords on every seeded account.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable password-reset token', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['Reset tokens here are computed, not random — look at the shape of a real one.', 'The token is a simple formula of something you already know about the victim.', 'Token = rst_<userId>_<userId*137+42>. Bob is user 5 — his token can be calculated without ever seeing his email.'],
    lesson: 'A reset token derived from public data by a fixed formula is not a secret — it is an invitation.',
    impact: 'Any candidate account (or the examiner\u2019s) can be taken over by computing its reset token — no inbox access needed.',
    report: { title: 'Password Reset Tokens Are Predictable (Derived From User ID)', severity: 'High', remediation: 'Generate reset tokens from a CSPRNG (at least 128 bits), store only a hash, expire them quickly and make them single-use.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Session role-cookie tampering', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After login, inspect the cookies the app trusts.', 'One cookie simply states your role — and the server believes it.', 'Change the hx_role cookie to admin and visit /admin — the server never checks it against your account.'],
    lesson: 'Authorization data stored on the client is attacker-controlled; roles must live server-side in the session.',
    impact: 'Any candidate can promote themselves to administrator by editing a cookie — full control of exams, users and results.',
    report: { title: 'Privilege Escalation via Client-Controlled Role Cookie', severity: 'Critical', remediation: 'Store roles only in the server-side session and ignore any role information supplied by the client.' } },

  /* ---- Registration & Profile ---- */
  { id: 'reg-weak', feature: 'Registration & Profile', name: 'Weak password policy on registration', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['The registration page CLAIMS passwords need 8 characters. Claims are cheap.', 'Try registering with the shortest password you can think of.', 'A one-character password is accepted — the policy is printed, never enforced.'],
    lesson: 'A password policy that exists only as page text does not exist at all.',
    impact: 'Users pick trivial passwords that fall to the first guessing attempt, and the business believes it is protected.',
    report: { title: 'Password Complexity Policy Not Enforced at Registration', severity: 'Medium', remediation: 'Enforce minimum length and breached-password checks server-side on registration and password change.' } },
  { id: 'reg-mass', feature: 'Registration & Profile', name: 'Mass assignment — self-assign examiner role at registration', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration handler binds whatever fields you send to the new account.', 'What happens if the signup form quietly gains a field the UI never showed?', 'Add role=examiner to the registration POST — the new account is created with that role.'],
    lesson: 'Binding request bodies directly to account objects lets attackers set privileged fields the form never offered.',
    impact: 'Attackers mint their own examiner accounts — creating exams, reading the question bank and exporting results at will.',
    report: { title: 'Mass Assignment in Registration Allows Role Self-Assignment', severity: 'High', remediation: 'Whitelist the exact fields a registration may set (name, email, password) and assign roles only through admin-controlled flows.' } },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in display name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is rendered back on dashboards exactly as typed.', 'Names are a classic stored-XSS carrier — they are shown to OTHER users too.', 'Register or update your profile with a name containing a <script> or <img onerror> payload — it is stored and printed raw.'],
    lesson: 'Any user-controlled text that is printed without encoding becomes code in someone else\u2019s browser.',
    impact: 'An attacker\u2019s name can execute script in the browsers of examiners and admins who view it — session theft and actions in their name.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-encode all user-controlled output and validate/sanitise stored fields on input.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on profile update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The profile form carries a hidden same-site marker. Forged requests do not.', 'A state change that arrives without the marker — or from a foreign Origin — is not from the app\u2019s own form.', 'POST a profile change with no hx_marker field (or a cross-site Origin) while logged in — it is applied anyway.'],
    lesson: 'State-changing forms without a verified anti-CSRF token can be submitted by any website the victim visits.',
    impact: 'A malicious page can silently rewrite a logged-in examiner\u2019s profile — including the email used for password resets.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require a per-session anti-CSRF token on every state-changing request and verify Origin/Referer as defence in depth.' } },

  /* ---- Question Bank & Catalogue ---- */
  { id: 'bank-access', feature: 'Question Bank & Catalogue', name: 'Question bank readable by candidates (broken access control)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The question bank page is linked only from the examiner menu — but links are not locks.', 'Guess the examiner URL and open it as a candidate.', 'While logged in as a candidate, visit /examiner/questions — the page checks that you are logged in, never that you are an examiner.'],
    lesson: 'Hiding a link is not access control; every privileged page must verify the role server-side.',
    impact: 'Every candidate can read the entire question bank before the exam — the exam\u2019s integrity is destroyed.',
    report: { title: 'Broken Access Control: Question Bank Exposed to Candidates', severity: 'Critical', remediation: 'Enforce role checks server-side on every examiner route, not just in the navigation menu.' } },
  { id: 'bank-answers', feature: 'Question Bank & Catalogue', name: 'Correct answers leaked in the attempt question API', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['While sitting an exam, watch what the question API actually sends your browser.', 'The client needs the question text — does it need anything else?', 'GET /api/attempts/<id>/questions returns every question WITH its correctIndex — the answers travel with the questions.'],
    lesson: 'Never send the answer key to the client; anything in an API response is public to the person taking the exam.',
    impact: 'Candidates score 100% by reading the network response — certificates are issued for knowledge nobody demonstrated.',
    report: { title: 'Correct Answers Disclosed in Client-Facing Question Payload', severity: 'High', remediation: 'Strip answer keys and grading data from every client-facing payload; grade exclusively server-side.' } },
  { id: 'cat-sqli', feature: 'Question Bank & Catalogue', name: 'SQL injection in exam catalogue search', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['The exam search glues your term into a query the same careless way login does.', 'A tautology in the search box should return rows your term never matched.', "Search for ' OR '1'='1 — every exam in the catalogue comes back."],
    lesson: 'Every input that reaches a query is an injection surface — search boxes included, not just login forms.',
    impact: 'Injection in search can be escalated to dump the whole database behind the catalogue — users, questions and results.',
    report: { title: 'SQL Injection in Exam Catalogue Search', severity: 'High', remediation: 'Use parameterised queries for search and apply a strict allowlist for sort/filter parameters.' } },

  /* ---- Exam Attempts & Timer ---- */
  { id: 'att-limit', feature: 'Exam Attempts & Timer', name: 'Attempt-limit bypass (only submitted attempts are counted)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['An exam says "maximum 1 attempt". The counter behind it is picky about WHAT it counts.', 'In-progress attempts apparently do not count as attempts.', 'Start Networking Basics (limit 1), leave it unfinished, and start it again — the second attempt is created because only SUBMITTED attempts are counted.'],
    lesson: 'Business limits must count the resource itself, not one convenient state of it.',
    impact: 'Candidates retake exams until they memorise the questions, defeating attempt limits that exist for fairness and integrity.',
    report: { title: 'Exam Attempt Limit Bypass — In-Progress Attempts Not Counted', severity: 'High', remediation: 'Count all attempts regardless of status when enforcing per-candidate attempt limits, inside a transaction.' } },
  { id: 'att-timer', feature: 'Exam Attempts & Timer', name: 'Exam timer tampering via the extend endpoint', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['The attempt page has a "request more time" feature. Who approves the request?', 'Nobody does. The endpoint trusts the minutes the client sends.', 'POST /attempts/<id>/extend with {"minutes": 600} — your deadline moves, no examiner involved.'],
    lesson: 'Time limits enforced or extendable by the client are not limits; deadlines must be computed and enforced server-side only.',
    impact: 'Candidates give themselves unlimited exam time — an unfair advantage that invalidates results for everyone else.',
    report: { title: 'Client-Controlled Exam Timer Extension', severity: 'High', remediation: 'Compute deadlines exclusively server-side; any accommodation must require an examiner-approved workflow.' } },
  { id: 'att-late', feature: 'Exam Attempts & Timer', name: 'Submission accepted after the deadline', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['What does the submit endpoint check about WHEN you submit?', 'The deadline is displayed to you — but is it ever compared?', 'Let an attempt expire (negative extend makes this instant), then submit anyway — the answers are graded and recorded.'],
    lesson: 'A deadline that is never checked at submission time is decoration, not a control.',
    impact: 'Late submissions are graded as if on time, breaking the exam rules the honest candidates followed.',
    report: { title: 'Expired Exam Attempts Still Accept Submissions', severity: 'High', remediation: 'Reject submissions after the server-side deadline and record late attempts distinctly.' } },
  { id: 'att-idor', feature: 'Exam Attempts & Timer', name: 'Attempt IDOR — view another candidate\u2019s attempt and answers', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Attempt pages live at predictable numeric URLs.', 'Ownership is assumed, not checked.', 'Open /attempts/<id> for an attempt that is not yours — answers and all are served.'],
    lesson: 'Sequential object IDs plus missing ownership checks expose every record in the system, one number at a time.',
    impact: 'Candidates can read each other\u2019s answers and results — privacy breach and a cheating channel in one.',
    report: { title: 'Insecure Direct Object Reference on Exam Attempts', severity: 'High', remediation: 'Verify the requesting user owns (or is staff for) every attempt before serving it; use unguessable IDs as defence in depth.' } },

  /* ---- Grading & Results ---- */
  { id: 'grade-tamper', feature: 'Grading & Results', name: 'Grade tampering — client-supplied score is trusted', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['The submit request carries your answers. What else might the server accept from it?', 'A helpful extra field the UI never sends — but the server honours.', 'Add "score": 100 to your submission JSON — the recorded grade becomes yours, not the computed one.'],
    lesson: 'Any value the server accepts from the client about its own decisions will be forged; grading must be computed server-side from stored answers.',
    impact: 'Candidates award themselves perfect scores — the business issues certificates and results that were never earned.',
    report: { title: 'Client-Supplied Score Trusted During Grading', severity: 'Critical', remediation: 'Ignore all client-supplied grading fields; compute scores server-side from the stored answer key.' } },
  { id: 'res-idor', feature: 'Grading & Results', name: 'Results IDOR — read another candidate\u2019s score report', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Score reports have their own predictable URLs, cousins of the attempt pages.', 'Changing one number shows you someone else\u2019s outcome.', 'GET /api/results/<attemptId> for another candidate\u2019s attempt — full score report, no ownership check.'],
    lesson: 'Results are sensitive personal data; every read needs an ownership or staff check.',
    impact: 'Exam results leak between candidates — a privacy incident and, for a real provider, a regulatory problem.',
    report: { title: 'Insecure Direct Object Reference on Score Reports', severity: 'High', remediation: 'Authorise every results read against the session user (owner or staff) before returning data.' } },
  { id: 'res-export', feature: 'Grading & Results', name: 'Examiner score export downloadable by candidates', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Examiners export results as CSV from their menu. The route is a normal URL like the question bank.', 'Role checks were forgotten in more than one examiner corner.', 'As a candidate, GET /examiner/export.csv — the full results file downloads.'],
    lesson: 'Bulk exports are the highest-value target in the app and need the strictest role enforcement.',
    impact: 'One candidate click downloads every candidate\u2019s results — mass disclosure in a single request.',
    report: { title: 'Broken Access Control: Results Export Exposed to Candidates', severity: 'High', remediation: 'Restrict export endpoints to examiner/admin roles server-side and log every export.' } },

  /* ---- Proctor Notes ---- */
  { id: 'proc-read', feature: 'Proctor Notes', name: 'Private proctor notes readable by the candidate', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Proctors write notes ABOUT a candidate\u2019s attempt — suspicions included.', 'The notes API checks login. It stops there.', 'As the candidate, GET /api/attempts/<id>/notes on your own attempt — the proctor\u2019s private remarks come back.'],
    lesson: 'Staff-only annotations are still access-controlled data; "the candidate cannot see the button" is not protection.',
    impact: 'Candidates learn exactly what proctors suspected and when — letting cheaters adapt and undermining investigations.',
    report: { title: 'Proctor Notes Exposed to Candidates via API', severity: 'Medium', remediation: 'Restrict proctor-note reads to examiner/admin roles and audit access.' } },
  { id: 'proc-write', feature: 'Proctor Notes', name: 'Candidates can write fake proctor notes', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['If reading notes needs no role check, what about writing them?', 'The same endpoint accepts POSTs from anyone logged in.', 'POST a note to /api/attempts/<id>/notes as a candidate — it is stored as an official proctor note.'],
    lesson: 'Write endpoints need the same authorisation as reads — integrity of staff records depends on it.',
    impact: 'Candidates can plant exonerating "proctor notes" on their own flagged attempts, corrupting the integrity record.',
    report: { title: 'Unauthorised Write Access to Proctor Notes', severity: 'High', remediation: 'Require examiner/admin role for note creation and record the authenticated author server-side.' } },

  /* ---- Admin Panel ---- */
  { id: 'adm-csrf', feature: 'Admin Panel', name: 'CSRF on admin role change', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    hints: ['Admin actions use the same form machinery as profile updates — including its missing verification.', 'A role change POST without the same-site marker should ring every alarm. It rings none.', 'While logged in as admin, POST /admin/users/<id>/role with a new role and no hx_marker — the change is applied.'],
    lesson: 'The more powerful the action, the more damaging a missing CSRF token — admin functions are the worst place to skip it.',
    impact: 'A page an admin merely visits can promote an attacker\u2019s account to examiner or demote real staff — silently.',
    report: { title: 'Missing CSRF Protection on Administrative Role Changes', severity: 'High', remediation: 'Enforce anti-CSRF tokens on all admin actions and re-authenticate for privilege changes.' } },
  { id: 'adm-xss', feature: 'Admin Panel', name: 'Stored XSS reaching the admin user list', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['A display name stored by a candidate does not stay on the candidate\u2019s screen.', 'Admins review user lists — names included, printed the same raw way.', 'Register an account whose name carries a script payload, then view /admin/users as admin — the payload is served in the admin\u2019s page.'],
    lesson: 'Stored payloads travel to the most privileged viewers; admin interfaces need the same output encoding as public ones.',
    impact: 'An attacker\u2019s stored name executes in the admin\u2019s browser — the shortest path from signup form to full compromise.',
    report: { title: 'Stored Cross-Site Scripting in Admin User Management', severity: 'High', remediation: 'Encode user-controlled data in admin views exactly as in public views; add a Content-Security-Policy as defence in depth.' } },

  /* ---- Platform & API ---- */
  { id: 'plat-debug', feature: 'Platform & API', name: 'Unauthenticated /api/debug dumps every account (incl. passwords)', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Developers leave diagnostic endpoints behind. Production forgets them.', 'No login, no token, no questions asked.', 'GET /api/debug with no session at all — every user record, passwords included, comes back as JSON.'],
    lesson: 'Debug and diagnostic endpoints must never ship enabled; if they do, they must be authenticated and audited.',
    impact: 'A single unauthenticated request hands attackers every account and password on the platform.',
    report: { title: 'Unauthenticated Debug Endpoint Discloses All User Records', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; if diagnostics are required, gate them behind admin auth and network restrictions.' } },
  { id: 'plat-token', feature: 'Platform & API', name: 'API accepts base64(email) as a bearer token', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['The API\u2019s idea of a token is a transformation of something public.', 'Your email address is not a secret. Encoding it does not make it one.', 'Call GET /api/me with Authorization: Bearer <base64 of any user\u2019s email> — the API accepts it as that user.'],
    lesson: 'A token must be an unguessable secret issued by the server — never a reversible encoding of public data.',
    impact: 'Anyone who knows a victim\u2019s email address fully impersonates them through the API.',
    report: { title: 'Forgeable API Tokens (Base64 of Email Address)', severity: 'Critical', remediation: 'Issue high-entropy random API tokens server-side, store hashes, and support revocation and expiry.' } }
];

/* ------------------------------ seed data -------------------------- */
let nextUserId = 1;
const users = [];
function addUser(name, email, password, role, demo) {
  const u = { id: nextUserId++, name, email, password, role, demo: !!demo, apiToken: null };
  u.apiToken = 'hxe_' + crypto.randomBytes(12).toString('hex');
  users.push(u);
  return u;
}
const adminUser = addUser('Priya Nair (Admin)', 'admin@hexaexam.local', 'Admin@123', 'admin');
const examinerUser = addUser('Marcus Webb (Examiner)', 'examiner@hexaexam.local', 'Examiner@123', 'examiner');
addUser('Sofia Lindqvist (Examiner)', 'prof@hexaexam.local', 'Prof@123', 'examiner');
const aliceUser = addUser('Alice Rahman', 'alice@test.local', 'alice123', 'candidate');
const bobUser = addUser('Bob Carter', 'bob@test.local', 'bob123', 'candidate');
addUser('Demo Candidate', 'demo@hexaexam.local', 'demo123', 'candidate', true);

const exams = [
  { id: 1, title: 'Web Security Fundamentals', durationMin: 30, maxAttempts: 2,
    questions: [
      { q: 'What does SQL injection attack?', options: ['The database query', 'The monitor', 'The keyboard', 'The network cable'], correctIndex: 0 },
      { q: 'Which header helps prevent clickjacking?', options: ['X-Powered-By', 'X-Frame-Options', 'Server', 'Allow'], correctIndex: 1 },
      { q: 'What is the safest way to store passwords?', options: ['Plain text', 'MD5', 'Salted slow hash (bcrypt/argon2)', 'Base64'], correctIndex: 2 },
      { q: 'XSS primarily executes code in…', options: ['The database', "The victim's browser", 'The firewall', 'The compiler'], correctIndex: 1 },
      { q: 'IDOR is a failure of…', options: ['Encryption', 'Access control', 'Logging', 'Backups'], correctIndex: 1 }
    ] },
  { id: 2, title: 'Networking Basics', durationMin: 20, maxAttempts: 1,
    questions: [
      { q: 'Which port does HTTPS use by default?', options: ['80', '21', '443', '25'], correctIndex: 2 },
      { q: 'DNS resolves names to…', options: ['MAC addresses', 'IP addresses', 'Passwords', 'Certificates'], correctIndex: 1 },
      { q: 'TCP is…', options: ['Connection-oriented', 'Always encrypted', 'A routing protocol', 'A cable type'], correctIndex: 0 },
      { q: 'A subnet mask defines…', options: ['The Wi-Fi password', 'The network/host split', 'The DNS server', 'The gateway vendor'], correctIndex: 1 }
    ] },
  { id: 3, title: 'Privacy & Compliance Quiz', durationMin: 15, maxAttempts: 3,
    questions: [
      { q: 'GDPR primarily protects…', options: ['Servers', 'Personal data', 'Logos', 'Domains'], correctIndex: 1 },
      { q: 'A data breach must typically be reported within…', options: ['72 hours', '1 year', 'Never', '10 minutes'], correctIndex: 0 },
      { q: 'Consent must be…', options: ['Assumed', 'Freely given and specific', 'Hidden in terms', 'Permanent'], correctIndex: 1 },
      { q: 'PII stands for…', options: ['Private Internet Infrastructure', 'Personally Identifiable Information', 'Public IP Index', 'Protocol Inspection Item'], correctIndex: 1 }
    ] }
];

let nextAttemptId = 1;
const attemptsStore = [];
function addAttempt(userId, examId, status, answers, score) {
  const exam = exams.find(e => e.id === examId);
  const now = Date.now();
  const a = { id: nextAttemptId++, userId, examId, status: status || 'in_progress',
    startedAt: now, expiresAt: now + exam.durationMin * 60000,
    answers: answers || null, score: (score === undefined ? null : score), submittedAt: null };
  if (status === 'submitted') a.submittedAt = now;
  attemptsStore.push(a);
  return a;
}
const bobSeedAttempt = addAttempt(bobUser.id, 1, 'submitted', { 0: 0, 1: 1, 2: 2, 3: 1, 4: 0 }, 80);
addAttempt(aliceUser.id, 1, 'submitted', { 0: 0, 1: 0, 2: 2, 3: 1, 4: 1 }, 80);

const proctorNotes = [
  { id: 1, attemptId: bobSeedAttempt.id, author: 'Marcus Webb (Examiner)', role: 'examiner',
    text: 'Candidate looked away from the screen repeatedly during questions 3-4. Flagged for review before results are confirmed.' }
];
let nextNoteId = 2;

const sessions = new Map();       // sid -> userId
const failedLogins = {};          // email -> count
const forgotProbes = {};          // sid -> { hitReal: bool, hitFake: bool }
const issuedResetTokens = {};     // userId -> token issued via /forgot
function resetTokenFor(u) { return 'rst_' + u.id + '_' + (u.id * 137 + 42); }

/* ------------------------------ utilities -------------------------- */
function esc(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
const XSS_RE = /(<\s*script|onerror\s*=|onload\s*=|<\s*svg|<\s*img[^>]*onerror|javascript\s*:|<\s*iframe)/i;
const SQLI_RE = /('\s*(or|and)\s+('?\d+'?\s*=\s*'?\d+|'[^']*'\s*=\s*'[^']*'))|('\s*--)|(\bunion\s+select\b)/i;
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  raw.split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(''));
  });
}
function parseForm(raw) {
  const out = {};
  try { new URLSearchParams(raw).forEach((v, k) => { out[k] = v; }); } catch (e) { /* ignore */ }
  return out;
}
function parseBody(raw, req) {
  const ct = (req.headers['content-type'] || '');
  if (ct.includes('application/json')) { try { return JSON.parse(raw); } catch (e) { return null; } }
  return parseForm(raw);
}
function looksCsrf(req, body) {
  const origin = req.headers.origin || req.headers.referer || '';
  if (origin && !/127\.0\.0\.1:3062|localhost:3062/.test(origin)) return true;
  if (!body || body.hx_marker !== 'hx-origin-ok') return true;
  return false;
}
function gradeAttempt(attempt, answers) {
  const exam = exams.find(e => e.id === attempt.examId);
  let correct = 0;
  exam.questions.forEach((q, i) => { if (Number(answers[i]) === q.correctIndex) correct++; });
  return Math.round((correct / exam.questions.length) * 100);
}

/* --------------------------- page rendering ------------------------ */
function progressBarHtml() {
  const done = doneCount(), total = TESTS.length;
  const pct = Math.floor((done / total) * 100);
  return '<div style="background:#14141d;color:#eee;padding:10px 18px;display:flex;align-items:center;gap:14px;font-family:Arial,sans-serif">' +
    '<img src="/logo.png" style="height:34px" alt="HexaCyberLab">' +
    '<strong>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</strong>' +
    '<span style="color:#9ab">' + done + '/' + total + ' tests · ' + pct + '%</span>' +
    '<div style="flex:1;background:#333;border-radius:6px;height:10px;overflow:hidden"><div style="width:' + pct + '%;background:#7c5cff;height:100%"></div></div>' +
    (isComplete() ? '<span style="color:#6f6">COMPLETE</span>' : '') +
    '</div>';
}
function chatWidgetHtml() {
  return '<div id="hxchat" style="position:fixed;right:16px;bottom:16px;width:320px;font-family:Arial,sans-serif;z-index:50">' +
    '<div style="background:#14141d;color:#fff;padding:9px 12px;border-radius:10px 10px 0 0;cursor:pointer" onclick="var b=document.getElementById(\'hxchatbody\');b.style.display=b.style.display===\'none\'?\'block\':\'none\'">💬 Lab Coach — HexaExam</div>' +
    '<div id="hxchatbody" style="display:none;background:#fff;border:1px solid #ccd;border-top:none;border-radius:0 0 10px 10px;padding:10px">' +
    '<div id="hxchatlog" style="height:180px;overflow:auto;font-size:13px;margin-bottom:8px;color:#222"></div>' +
    '<div style="display:flex;gap:6px"><input id="hxchatin" style="flex:1;padding:7px" placeholder="Ask the Lab Coach…">' +
    '<button onclick="hxSend()" style="padding:7px 12px">Send</button></div></div></div>' +
    '<script>function hxSend(){var i=document.getElementById("hxchatin");var m=i.value.trim();if(!m)return;i.value="";var l=document.getElementById("hxchatlog");l.innerHTML+="<div><b>You:</b> "+m.replace(/</g,"&lt;")+"</div>";fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:m})}).then(function(r){return r.json()}).then(function(j){l.innerHTML+="<div style=\\"margin:4px 0\\"><b>Coach:</b> "+String(j.reply).replace(/</g,"&lt;")+"</div>";l.scrollTop=l.scrollHeight;}).catch(function(){l.innerHTML+="<div><b>Coach:</b> (connection hiccup — try again)</div>";});}document.getElementById("hxchatin").addEventListener("keydown",function(e){if(e.key==="Enter")hxSend();});</script>';
}
function layout(title, user, inner) {
  const nav = user
    ? '<div style="background:#1d1d2a;padding:8px 18px;font-family:Arial,sans-serif">' +
      '<a style="color:#cdd;margin-right:14px" href="/dashboard">Dashboard</a>' +
      '<a style="color:#cdd;margin-right:14px" href="/exams">Exams</a>' +
      '<a style="color:#cdd;margin-right:14px" href="/tests">Mission Board</a>' +
      '<a style="color:#cdd;margin-right:14px" href="/profile">Profile</a>' +
      (user.role !== 'candidate' ? '<a style="color:#cdd;margin-right:14px" href="/examiner/questions">Question Bank</a>' : '') +
      '<span style="color:#889;float:right">' + esc(user.name) + ' (' + esc(user.role) + ') · <a style="color:#cdd" href="/logout">Logout</a></span></div>'
    : '';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + ' · LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</title></head>' +
    '<body style="margin:0;background:#f4f5fa;font-family:Arial,sans-serif;color:#1b1b26">' +
    progressBarHtml() + nav +
    '<div style="max-width:920px;margin:26px auto;padding:0 18px">' + inner + '</div>' +
    chatWidgetHtml() + '</body></html>';
}
function gatePage() {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' · Locked</title></head>' +
    '<body style="margin:0;background:#14141d;font-family:Arial,sans-serif"><div style="max-width:520px;margin:60px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:28px;text-align:center">' +
    '<img src="/logo.png" style="height:56px"><h2>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h2>' +
    '<p>This lab is locked. Paste the completion key from Lab ' + (LAB_NUMBER - 1) + ' to start.</p>' +
    '<form method="POST" action="/unlock"><input name="key" style="padding:9px;width:80%" placeholder="Completion key from Lab ' + (LAB_NUMBER - 1) + '"><br><br>' +
    '<button style="padding:10px 22px">Unlock LAB ' + LAB_NUMBER + '</button></form></div>' +
    chatWidgetHtml() + '</body></html>';
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function sendJson(res, code, obj) { send(res, code, JSON.stringify(obj, null, 2), 'application/json'); }
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }

/* ------------------------------ sessions --------------------------- */
function currentUser(req) {
  const c = parseCookies(req);
  if (c.hx_sid && sessions.has(c.hx_sid)) return users.find(u => u.id === sessions.get(c.hx_sid)) || null;
  return null;
}
function startSession(res, user) {
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, user.id);
  res.setHeader('Set-Cookie', [
    'hx_sid=' + sid + '; Path=/; HttpOnly',
    'hx_uid=' + user.id + '; Path=/',
    'hx_role=' + user.role + '; Path=/'
  ]);
}

/* ------------------------------ chatbot ---------------------------- */
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
function featureByName(name) { return TESTS.filter(t => t.feature === name); }
function chatReply(message) {
  const msg = String(message || '');
  const low = msg.toLowerCase();
  const done = doneCount(), total = TESTS.length;
  if (/(who (built|made|created)|founder|who is (the )?(author|creator))/.test(low)) return ATTRIBUTION;
  if (/(completion key|next lab.*key|give me the key|what is the key|unlock key)/.test(low)) {
    if (isComplete() && state.keyRevealed) {
      return 'You earned it — LAB ' + LAB_NUMBER + ' is 100% complete. The completion key is: ' + completionKey() + ' — paste it into the next lab to unlock it.';
    }
    return 'I don\u2019t have the completion key yet — I only receive it when this lab reaches 100%. Right now you are at ' + done + '/' + total + ' tests (' + Math.floor(done / total * 100) + '%). Finish every test on /tests and the key will be revealed on the completion page — and to me.';
  }
  if (/(how many|progress|status|score so far)/.test(low)) {
    const next = TESTS.find(t => !state.tests[t.id]);
    return 'You have completed ' + done + ' of ' + total + ' tests (' + Math.floor(done / total * 100) + '%).' +
      (next ? ' Next open test: "' + next.name + '" in ' + next.feature + ' — see /tests for its hints.' : ' Everything is done — see /complete for your debrief and certificate.');
  }
  // feature-specific questions
  const featureNames = [...new Set(TESTS.map(t => t.feature))];
  let matched = null;
  for (const f of featureNames) {
    const key = f.toLowerCase().replace(/[^a-z ]/g, '').split(' ').filter(w => w.length > 3);
    if (key.some(w => low.includes(w))) { matched = f; break; }
  }
  if (/(exam|attempt|timer|deadline|late|extend)/.test(low) && featureByName('Exam Attempts & Timer').length) matched = matched || 'Exam Attempts & Timer';
  if (/(proctor|note)/.test(low)) matched = 'Proctor Notes';
  if (/(grade|grading|result|score|export)/.test(low) && /(how|tamper|change|cheat)/.test(low)) matched = matched || 'Grading & Results';
  if (/(question bank|answers|correct answer)/.test(low)) matched = matched || 'Question Bank & Catalogue';
  if (matched) {
    const list = featureByName(matched);
    const wantsHow = /(how|help|solve|do|pass|guide|hint|stuck)/.test(low);
    if (!wantsHow) {
      return matched + ' has ' + list.length + ' tests: ' + list.map(t => t.name + (state.tests[t.id] ? ' ✓' : '')).join('; ') + '. Ask me "how" about it once you have tried it a few times.';
    }
    const att = state.attempts[matched] || 0;
    const open = list.filter(t => !state.tests[t.id]);
    if (att >= 3 || open.length === 0) {
      const steps = open.length ? open : list;
      return 'Step by step for ' + matched + ':\n' + steps.map((t, i) => (i + 1) + '. ' + t.name + ' — ' + t.hints[2]).join('\n') + '\nWork through them, then check /tests to see each flip to done.';
    }
    return 'That feature is locked for help. First try the ' + matched + ' tests yourself at least 3 times — I can see you\u2019ve tried ' + att + ' time(s) so far. After 3 real tries, ask me again and I\u2019ll guide you step by step.';
  }
  if (/(how many (tests|features)|features|tests)/.test(low)) {
    const per = featureNames.map(f => f + ': ' + featureByName(f).length).join(' · ');
    return 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + total + ' tests across ' + featureNames.length + ' features (' + per + '). Open /tests for the mission board with hints beside every test.';
  }
  if (/(hi|hello|hey|start|begin|help)/.test(low)) {
    return 'Welcome to LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ', a deliberately vulnerable online exam platform. You have completed ' + done + '/' + total + ' tests. Open /tests to pick a test, try it yourself at least 3 times per feature, and then ask me for step-by-step help. Ask "who built this" if you are curious.';
  }
  return 'I can help with the tests in this lab: ask me how many tests a feature has, ask for your progress, or — after at least 3 real tries on a feature — ask me how to solve it and I will guide you step by step. The full mission board is at /tests.';
}

/* ------------------------------------------------------------------ *
 * Key material — region 2 of 2.
 * The completion key shards (same encoding: base64 of reversed pieces),
 * kept far away from the entry-key region. The assembler runs ONLY when
 * the lab is complete (completion page / certificate context / coach).
 * ------------------------------------------------------------------ */
const _cS = ["TC1YSA==","RC00NQ==","UzdaRA==","LUpVWA==","UURNQQ==","S0JMVQ=="];
function completionKey() { return _asm(_cS); }

/* ------------------------------- router ---------------------------- */
const server = http.createServer(async (req, res) => {
  let pathname = '/';
  try { pathname = new URL(req.url, 'http://127.0.0.1').pathname; } catch (e) { pathname = '/'; }
  const method = req.method;
  try {
    if (pathname === '/logo.png') {
      try { const img = fs.readFileSync(LOGO_FILE); res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(img); }
      catch (e) { send(res, 404, 'logo missing'); }
      return;
    }
    if (pathname === '/api/chat' && method === 'POST') {
      const raw = await readBody(req);
      let message = '';
      try { const j = JSON.parse(raw); message = j.message || ''; }
      catch (e) { const f = parseForm(raw); message = f.message || ''; }
      sendJson(res, 200, { reply: chatReply(message) });
      return;
    }
    if (pathname === '/api/progress' && method === 'GET') {
      const features = {};
      for (const t of TESTS) {
        if (!features[t.feature]) features[t.feature] = { total: 0, done: 0, attempts: state.attempts[t.feature] || 0 };
        features[t.feature].total++;
        if (state.tests[t.id]) features[t.feature].done++;
      }
      const done = doneCount();
      sendJson(res, 200, { lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done,
        pct: Math.floor((done / TESTS.length) * 100), features, complete: isComplete() });
      return;
    }

    /* ---- lock gate ---- */
    if (!state.unlocked) {
      if (pathname === '/unlock' && method === 'POST') {
        const body = parseBody(await readBody(req), req) || {};
        if (String(body.key || '') === entryKey()) {
          state.unlocked = true; saveState();
          redirect(res, '/login');
        } else {
          res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(gatePage().replace('</form>', '</form><p style="color:#c00">That key was not accepted.</p>'));
        }
        return;
      }
      send(res, 200, gatePage());
      return;
    }

    const user = currentUser(req);

    if (pathname === '/' && method === 'GET') { redirect(res, user ? '/dashboard' : '/login'); return; }

    /* ---- auth ---- */
    if (pathname === '/login' && method === 'GET') {
      send(res, 200, layout('Login', null,
        '<h1>HexaExam — Sign in</h1>' +
        '<form method="POST" action="/login" style="background:#fff;padding:20px;border:1px solid #dde;border-radius:10px;max-width:420px">' +
        '<label>Email<br><input name="email" style="width:100%;padding:8px"></label><br><br>' +
        '<label>Password<br><input name="password" type="password" style="width:100%;padding:8px"></label><br><br>' +
        '<button style="padding:9px 20px">Sign in</button></form>' +
        '<p><a href="/forgot">Forgot password?</a> · <a href="/register">Create an account</a></p>' +
        '<p style="background:#fff8e1;border:1px solid #e6d28a;padding:10px;border-radius:8px;max-width:420px">Demo account for evaluators: <b>demo@hexaexam.local</b> / <b>demo123</b></p>'));
      return;
    }
    if (pathname === '/login' && method === 'POST') {
      attempt('Login & Authentication');
      const body = parseBody(await readBody(req), req) || {};
      const email = String(body.email || ''), password = String(body.password || '');
      if (SQLI_RE.test(email) || SQLI_RE.test(password)) {
        pass('auth-sqli');
        startSession(res, adminUser);
        redirect(res, '/dashboard');
        return;
      }
      const u = users.find(x => x.email.toLowerCase() === email.toLowerCase());
      if (!u || u.password !== password) {
        failedLogins[email] = (failedLogins[email] || 0) + 1;
        if (failedLogins[email] >= 10) pass('auth-brute');
        send(res, 200, layout('Login failed', null, '<h1>Sign in failed</h1><p>Invalid email or password.</p><p><a href="/login">Try again</a></p>'));
        return;
      }
      if (u.demo) pass('auth-default');
      startSession(res, u);
      redirect(res, '/dashboard');
      return;
    }
    if (pathname === '/logout') {
      const c = parseCookies(req);
      if (c.hx_sid) sessions.delete(c.hx_sid);
      res.setHeader('Set-Cookie', ['hx_sid=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0', 'hx_uid=; Path=/; Max-Age=0']);
      redirect(res, '/login');
      return;
    }
    if (pathname === '/register' && method === 'GET') {
      send(res, 200, layout('Register', null,
        '<h1>Create your HexaExam account</h1>' +
        '<form method="POST" action="/register" style="background:#fff;padding:20px;border:1px solid #dde;border-radius:10px;max-width:420px">' +
        '<label>Full name<br><input name="name" style="width:100%;padding:8px"></label><br><br>' +
        '<label>Email<br><input name="email" style="width:100%;padding:8px"></label><br><br>' +
        '<label>Password (minimum 8 characters)<br><input name="password" type="password" style="width:100%;padding:8px"></label><br><br>' +
        '<button style="padding:9px 20px">Register</button></form>'));
      return;
    }
    if (pathname === '/register' && method === 'POST') {
      attempt('Registration & Profile');
      const body = parseBody(await readBody(req), req) || {};
      const name = String(body.name || 'New User'), email = String(body.email || ''), password = String(body.password || '');
      if (!email || users.some(x => x.email.toLowerCase() === email.toLowerCase())) {
        send(res, 200, layout('Register', null, '<h1>Registration failed</h1><p>That email is missing or already registered.</p><p><a href="/register">Back</a></p>'));
        return;
      }
      let role = 'candidate';
      if (body.role && ['candidate', 'examiner', 'admin'].includes(String(body.role))) role = String(body.role);
      if (role !== 'candidate') pass('reg-mass');
      if (password.length < 8) pass('reg-weak');
      if (XSS_RE.test(name)) pass('reg-xss');
      const u = addUser(name, email, password, role);
      startSession(res, u);
      redirect(res, '/dashboard');
      return;
    }
    if (pathname === '/forgot' && method === 'GET') {
      send(res, 200, layout('Forgot password', null,
        '<h1>Forgot password</h1><form method="POST" action="/forgot" style="background:#fff;padding:20px;border:1px solid #dde;border-radius:10px;max-width:420px">' +
        '<label>Email<br><input name="email" style="width:100%;padding:8px"></label><br><br><button style="padding:9px 20px">Send reset link</button></form>'));
      return;
    }
    if (pathname === '/forgot' && method === 'POST') {
      attempt('Login & Authentication');
      const body = parseBody(await readBody(req), req) || {};
      const email = String(body.email || '');
      const c = parseCookies(req);
      const probeKey = c.hx_sid || ('ip:' + (req.socket.remoteAddress || 'x'));
      if (!forgotProbes[probeKey]) forgotProbes[probeKey] = { hitReal: false, hitFake: false };
      const u = users.find(x => x.email.toLowerCase() === email.toLowerCase());
      let msg;
      if (u) {
        issuedResetTokens[u.id] = 'rst-live-' + Date.now().toString(36) + '-' + u.id;
        forgotProbes[probeKey].hitReal = true;
        msg = 'Reset link sent to ' + esc(email) + '.';
      } else {
        forgotProbes[probeKey].hitFake = true;
        msg = 'No account found for that email address.';
      }
      if (forgotProbes[probeKey].hitReal && forgotProbes[probeKey].hitFake) pass('auth-enum');
      send(res, 200, layout('Forgot password', null, '<h1>Forgot password</h1><p>' + msg + '</p><p><a href="/login">Back to sign in</a></p>'));
      return;
    }
    if (pathname === '/reset' && method === 'GET') {
      send(res, 200, layout('Reset password', null,
        '<h1>Reset password</h1><form method="POST" action="/reset" style="background:#fff;padding:20px;border:1px solid #dde;border-radius:10px;max-width:420px">' +
        '<label>Reset token<br><input name="token" style="width:100%;padding:8px"></label><br><br>' +
        '<label>New password<br><input name="password" type="password" style="width:100%;padding:8px"></label><br><br>' +
        '<button style="padding:9px 20px">Set new password</button></form>'));
      return;
    }
    if (pathname === '/reset' && method === 'POST') {
      attempt('Login & Authentication');
      const body = parseBody(await readBody(req), req) || {};
      const token = String(body.token || ''), password = String(body.password || '');
      let target = null, viaFormula = false;
      for (const u of users) { if (resetTokenFor(u) === token) { target = u; viaFormula = true; break; } }
      if (!target) { for (const u of users) { if (issuedResetTokens[u.id] && issuedResetTokens[u.id] === token) { target = u; break; } } }
      if (!target) { send(res, 200, layout('Reset password', null, '<h1>Reset failed</h1><p>That token is not valid.</p>')); return; }
      if (viaFormula && issuedResetTokens[target.id] !== token) pass('auth-reset');
      target.password = password;
      send(res, 200, layout('Reset password', null, '<h1>Password updated</h1><p><a href="/login">Sign in</a> with your new password.</p>'));
      return;
    }

    /* ---- pages that need a login ---- */
    const needLogin = ['/dashboard', '/exams', '/profile', '/examiner/questions', '/examiner/export.csv'].includes(pathname) ||
      pathname.startsWith('/attempts/') || pathname.startsWith('/results/') || pathname.startsWith('/admin') ||
      pathname.startsWith('/api/attempts/') || pathname.startsWith('/api/results/');
    if (needLogin && !user) { redirect(res, '/login'); return; }

    if (pathname === '/dashboard' && method === 'GET') {
      const mine = attemptsStore.filter(a => a.userId === user.id);
      const rows = mine.map(a => { const ex = exams.find(e => e.id === a.examId); return '<tr><td>' + a.id + '</td><td>' + esc(ex.title) + '</td><td>' + a.status + '</td><td>' + (a.score === null ? '—' : a.score + '%') + '</td><td><a href="/attempts/' + a.id + '">Open</a></td></tr>'; }).join('');
      send(res, 200, layout('Dashboard', user,
        '<h1>Welcome, ' + user.name + '</h1>' +
        '<p>Role: <b>' + esc(user.role) + '</b> · Email: ' + esc(user.email) + '</p>' +
        '<h2>My attempts</h2><table border="1" cellpadding="6" style="background:#fff;border-collapse:collapse"><tr><th>ID</th><th>Exam</th><th>Status</th><th>Score</th><th></th></tr>' + (rows || '<tr><td colspan="5">No attempts yet — pick an exam.</td></tr>') + '</table>' +
        '<p><a href="/exams">Browse the exam catalogue →</a></p>'));
      return;
    }
    if (pathname === '/exams' && method === 'GET') {
      const q = new URL(req.url, 'http://127.0.0.1').searchParams.get('q') || '';
      let list = exams;
      if (q) {
        attempt('Question Bank & Catalogue');
        if (SQLI_RE.test(q)) { pass('cat-sqli'); list = exams; }
        else list = exams.filter(e => e.title.toLowerCase().includes(q.toLowerCase()));
      }
      const cards = list.map(e => {
        const used = attemptsStore.filter(a => a.userId === user.id && a.examId === e.id).length;
        return '<div style="background:#fff;border:1px solid #dde;border-radius:10px;padding:16px;margin-bottom:12px"><h3 style="margin:0 0 6px">' + esc(e.title) + '</h3>' +
          '<p style="margin:4px 0;color:#556">' + e.questions.length + ' questions · ' + e.durationMin + ' minutes · max ' + e.maxAttempts + ' attempt(s) · you have ' + used + '</p>' +
          '<form method="POST" action="/attempts/start"><input type="hidden" name="examId" value="' + e.id + '"><button style="padding:8px 16px">Start attempt</button></form></div>';
      }).join('');
      send(res, 200, layout('Exams', user,
        '<h1>Exam catalogue</h1><form method="GET" action="/exams"><input name="q" value="' + esc(q) + '" style="padding:8px;width:60%" placeholder="Search exams…"> <button style="padding:8px 16px">Search</button></form><br>' + cards));
      return;
    }
    if (pathname === '/examiner/questions' && method === 'GET') {
      attempt('Question Bank & Catalogue');
      if (user.role === 'candidate') pass('bank-access');
      const blocks = exams.map(e => '<h3>' + esc(e.title) + '</h3><ol>' + e.questions.map(q =>
        '<li>' + esc(q.q) + '<br><span style="color:#567">Options: ' + q.options.map(esc).join(' · ') + '</span><br><b>Correct answer: ' + esc(q.options[q.correctIndex]) + '</b></li>').join('') + '</ol>').join('');
      send(res, 200, layout('Question Bank', user, '<h1>Question bank (examiner)</h1>' + blocks));
      return;
    }
    if (pathname === '/examiner/export.csv' && method === 'GET') {
      attempt('Grading & Results');
      if (user.role === 'candidate') pass('res-export');
      const lines = ['attemptId,candidate,exam,score,status'];
      for (const a of attemptsStore) {
        if (a.status !== 'submitted') continue;
        const u = users.find(x => x.id === a.userId); const ex = exams.find(e => e.id === a.examId);
        lines.push([a.id, u ? u.email : '?', '"' + ex.title + '"', a.score, a.status].join(','));
      }
      res.writeHead(200, { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="hexaexam-results.csv"' });
      res.end(lines.join('\n'));
      return;
    }

    /* ---- attempts ---- */
    if (pathname === '/attempts/start' && method === 'POST') {
      attempt('Exam Attempts & Timer');
      const body = parseBody(await readBody(req), req) || {};
      const exam = exams.find(e => e.id === Number(body.examId));
      if (!exam) { send(res, 404, 'Exam not found'); return; }
      const mine = attemptsStore.filter(a => a.userId === user.id && a.examId === exam.id);
      const submittedCount = mine.filter(a => a.status === 'submitted').length;
      if (submittedCount >= exam.maxAttempts) {
        send(res, 200, layout('Attempt limit', user, '<h1>Attempt limit reached</h1><p>You have already submitted the maximum of ' + exam.maxAttempts + ' attempt(s) for ' + esc(exam.title) + '.</p><p><a href="/exams">Back to exams</a></p>'));
        return;
      }
      if (mine.length >= exam.maxAttempts) pass('att-limit');
      const a = addAttempt(user.id, exam.id, 'in_progress');
      redirect(res, '/attempts/' + a.id);
      return;
    }
    const attMatch = pathname.match(/^\/attempts\/(\d+)$/);
    if (attMatch && method === 'GET') {
      attempt('Exam Attempts & Timer');
      const a = attemptsStore.find(x => x.id === Number(attMatch[1]));
      if (!a) { send(res, 404, 'Attempt not found'); return; }
      if (a.userId !== user.id) pass('att-idor');
      const exam = exams.find(e => e.id === a.examId);
      const qs = exam.questions.map((q, i) => '<div style="margin-bottom:10px"><b>Q' + (i + 1) + '.</b> ' + esc(q.q) + '<br>' +
        q.options.map((o, j) => '<label style="display:block;color:#345"><input type="radio" name="q' + i + '" value="' + j + '"' + (a.answers && Number(a.answers[i]) === j ? ' checked' : '') + '> ' + esc(o) + '</label>').join('') + '</div>').join('');
      send(res, 200, layout('Attempt ' + a.id, user,
        '<h1>' + esc(exam.title) + ' — Attempt #' + a.id + '</h1>' +
        '<p>Status: <b>' + a.status + '</b> · Deadline: ' + new Date(a.expiresAt).toISOString() + (a.score !== null ? ' · Score: <b>' + a.score + '%</b>' : '') + '</p>' +
        '<form method="POST" action="/attempts/' + a.id + '/extend" style="margin-bottom:14px">Request more time: <input name="minutes" value="10" size="4"> minutes <button>Extend</button> <span style="color:#789">(accommodations are applied instantly)</span></form>' +
        '<form method="POST" action="/attempts/' + a.id + '/submit" style="background:#fff;padding:18px;border:1px solid #dde;border-radius:10px">' + qs +
        '<button style="padding:9px 20px">Submit answers</button></form>' +
        '<p style="color:#789">Developers: questions are also available as JSON at /api/attempts/' + a.id + '/questions</p>'));
      return;
    }
    const qMatch = pathname.match(/^\/api\/attempts\/(\d+)\/questions$/);
    if (qMatch && method === 'GET') {
      attempt('Question Bank & Catalogue');
      const a = attemptsStore.find(x => x.id === Number(qMatch[1]));
      if (!a) { sendJson(res, 404, { error: 'attempt not found' }); return; }
      pass('bank-answers');
      const exam = exams.find(e => e.id === a.examId);
      sendJson(res, 200, { attemptId: a.id, exam: exam.title, durationMin: exam.durationMin,
        questions: exam.questions.map(q => ({ q: q.q, options: q.options, correctIndex: q.correctIndex })) });
      return;
    }
    const extMatch = pathname.match(/^\/attempts\/(\d+)\/extend$/);
    if (extMatch && method === 'POST') {
      attempt('Exam Attempts & Timer');
      const body = parseBody(await readBody(req), req) || {};
      const a = attemptsStore.find(x => x.id === Number(extMatch[1]));
      if (!a) { send(res, 404, 'Attempt not found'); return; }
      const minutes = Number(body.minutes || 0);
      if (minutes !== 0) { a.expiresAt += minutes * 60000; pass('att-timer'); }
      if ((req.headers['content-type'] || '').includes('application/json')) sendJson(res, 200, { ok: true, expiresAt: a.expiresAt });
      else redirect(res, '/attempts/' + a.id);
      return;
    }
    const subMatch = pathname.match(/^\/attempts\/(\d+)\/submit$/);
    if (subMatch && method === 'POST') {
      attempt('Exam Attempts & Timer');
      const rawBody = await readBody(req);
      const body = parseBody(rawBody, req) || {};
      const a = attemptsStore.find(x => x.id === Number(subMatch[1]));
      if (!a) { send(res, 404, 'Attempt not found'); return; }
      if (a.status === 'submitted') { send(res, 400, 'This attempt has already been submitted.'); return; }
      let answers = body.answers || null;
      if (!answers) { answers = {}; for (const k of Object.keys(body)) { const m = k.match(/^q(\d+)$/); if (m) answers[m[1]] = Number(body[k]); } }
      const computed = gradeAttempt(a, answers || {});
      let finalScore = computed;
      if (body.score !== undefined && body.score !== null && Number(body.score) !== computed) { finalScore = Number(body.score); pass('grade-tamper'); }
      if (Date.now() > a.expiresAt) pass('att-late');
      a.answers = answers; a.score = finalScore; a.status = 'submitted'; a.submittedAt = Date.now();
      if ((req.headers['content-type'] || '').includes('application/json')) sendJson(res, 200, { ok: true, attemptId: a.id, score: a.score });
      else redirect(res, '/results/' + a.id);
      return;
    }

    /* ---- results ---- */
    const resMatch = pathname.match(/^\/(api\/)?results\/(\d+)$/);
    if (resMatch && method === 'GET') {
      attempt('Grading & Results');
      const a = attemptsStore.find(x => x.id === Number(resMatch[2]));
      if (!a) { if (resMatch[1]) sendJson(res, 404, { error: 'result not found' }); else send(res, 404, 'Result not found'); return; }
      if (a.userId !== user.id && user.role === 'candidate') pass('res-idor');
      const owner = users.find(x => x.id === a.userId);
      const exam = exams.find(e => e.id === a.examId);
      const payload = { attemptId: a.id, candidate: owner ? owner.email : '?', exam: exam.title, status: a.status, score: a.score, answers: a.answers };
      if (resMatch[1]) { sendJson(res, 200, payload); return; }
      send(res, 200, layout('Result ' + a.id, user,
        '<h1>Score report — Attempt #' + a.id + '</h1><div style="background:#fff;padding:18px;border:1px solid #dde;border-radius:10px">' +
        '<p>Candidate: <b>' + esc(payload.candidate) + '</b></p><p>Exam: <b>' + esc(exam.title) + '</b></p>' +
        '<p>Status: ' + a.status + '</p><p style="font-size:22px">Score: <b>' + (a.score === null ? '—' : a.score + '%') + '</b></p></div>'));
      return;
    }

    /* ---- proctor notes ---- */
    const noteMatch = pathname.match(/^\/api\/attempts\/(\d+)\/notes$/);
    if (noteMatch && method === 'GET') {
      attempt('Proctor Notes');
      const a = attemptsStore.find(x => x.id === Number(noteMatch[1]));
      if (!a) { sendJson(res, 404, { error: 'attempt not found' }); return; }
      if (user.role === 'candidate') pass('proc-read');
      sendJson(res, 200, { attemptId: a.id, notes: proctorNotes.filter(n => n.attemptId === a.id) });
      return;
    }
    if (noteMatch && method === 'POST') {
      attempt('Proctor Notes');
      const body = parseBody(await readBody(req), req) || {};
      const a = attemptsStore.find(x => x.id === Number(noteMatch[1]));
      if (!a) { sendJson(res, 404, { error: 'attempt not found' }); return; }
      const note = { id: nextNoteId++, attemptId: a.id, author: user.name, role: user.role, text: String(body.text || '') };
      proctorNotes.push(note);
      if (user.role !== 'examiner' && user.role !== 'admin') pass('proc-write');
      sendJson(res, 200, { ok: true, note });
      return;
    }

    /* ---- profile ---- */
    if (pathname === '/profile' && method === 'GET') {
      send(res, 200, layout('Profile', user,
        '<h1>My profile</h1><form method="POST" action="/profile/update" style="background:#fff;padding:20px;border:1px solid #dde;border-radius:10px;max-width:420px">' +
        '<input type="hidden" name="hx_marker" value="hx-origin-ok">' +
        '<label>Display name<br><input name="name" value="' + esc(user.name) + '" style="width:100%;padding:8px"></label><br><br>' +
        '<label>Email<br><input name="email" value="' + esc(user.email) + '" style="width:100%;padding:8px"></label><br><br>' +
        '<button style="padding:9px 20px">Save changes</button></form>'));
      return;
    }
    if (pathname === '/profile/update' && method === 'POST') {
      attempt('Registration & Profile');
      const body = parseBody(await readBody(req), req) || {};
      if (looksCsrf(req, body)) pass('reg-csrf');
      if (body.name) { user.name = String(body.name); if (XSS_RE.test(user.name)) pass('reg-xss'); }
      if (body.email) user.email = String(body.email);
      redirect(res, '/profile');
      return;
    }

    /* ---- admin (role read from the client cookie — intentionally weak) ---- */
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      const cookies = parseCookies(req);
      if (cookies.hx_role !== 'admin') { send(res, 403, layout('Forbidden', user, '<h1>403 — Admins only</h1><p>Your role cookie does not grant admin access.</p>')); return; }
      if (user.role !== 'admin') pass('auth-cookie');
      if (pathname === '/admin' && method === 'GET') {
        attempt('Admin Panel');
        send(res, 200, layout('Admin', user, '<h1>Admin panel</h1><p>Users: ' + users.length + ' · Exams: ' + exams.length + ' · Attempts: ' + attemptsStore.length + '</p><p><a href="/admin/users">Manage users</a></p>'));
        return;
      }
      if (pathname === '/admin/users' && method === 'GET') {
        attempt('Admin Panel');
        if (users.some(x => XSS_RE.test(x.name))) pass('adm-xss');
        const rows = users.map(x => '<tr><td>' + x.id + '</td><td>' + x.name + '</td><td>' + esc(x.email) + '</td><td>' + esc(x.role) + '</td>' +
          '<td><form method="POST" action="/admin/users/' + x.id + '/role"><input type="hidden" name="hx_marker" value="hx-origin-ok"><select name="role"><option>candidate</option><option>examiner</option><option>admin</option></select> <button>Set role</button></form></td></tr>').join('');
        send(res, 200, layout('Admin users', user, '<h1>Users</h1><table border="1" cellpadding="6" style="background:#fff;border-collapse:collapse"><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Change role</th></tr>' + rows + '</table>'));
        return;
      }
      const roleMatch = pathname.match(/^\/admin\/users\/(\d+)\/role$/);
      if (roleMatch && method === 'POST') {
        attempt('Admin Panel');
        const body = parseBody(await readBody(req), req) || {};
        if (looksCsrf(req, body)) pass('adm-csrf');
        const target = users.find(x => x.id === Number(roleMatch[1]));
        if (target && ['candidate', 'examiner', 'admin'].includes(String(body.role))) target.role = String(body.role);
        redirect(res, '/admin/users');
        return;
      }
    }

    /* ---- platform & API ---- */
    if (pathname === '/api/debug' && method === 'GET') {
      attempt('Platform & API');
      pass('plat-debug');
      sendJson(res, 200, { app: LAB_NAME, version: '1.0.0', users: users.map(u => ({ id: u.id, name: u.name, email: u.email, password: u.password, role: u.role, apiToken: u.apiToken })), exams: exams.length, attempts: attemptsStore.length });
      return;
    }
    if (pathname === '/api/me' && method === 'GET') {
      attempt('Platform & API');
      if (user) { sendJson(res, 200, { id: user.id, name: user.name, email: user.email, role: user.role }); return; }
      const auth = req.headers.authorization || '';
      if (auth.startsWith('Bearer ')) {
        let decoded = '';
        try { decoded = Buffer.from(auth.slice(7).trim(), 'base64').toString('utf8'); } catch (e) { decoded = ''; }
        const u = users.find(x => x.email.toLowerCase() === decoded.toLowerCase());
        if (u) { pass('plat-token'); sendJson(res, 200, { id: u.id, name: u.name, email: u.email, role: u.role }); return; }
      }
      sendJson(res, 401, { error: 'unauthorized' });
      return;
    }

    /* ---- mission board ---- */
    if (pathname === '/tests' && method === 'GET') {
      const features = [...new Set(TESTS.map(t => t.feature))];
      const sections = features.map(f => {
        const list = featureByName(f);
        const items = list.map(t => {
          const doneT = !!state.tests[t.id];
          const hints = t.hints.map((h, i) => '<details><summary>Hint ' + (i + 1) + '</summary><p>' + esc(h) + '</p></details>').join('');
          return '<div style="background:#fff;border:1px solid #dde;border-radius:10px;padding:14px;margin-bottom:10px">' +
            '<b>' + (doneT ? '✓ ' : '○ ') + esc(t.name) + '</b> <span style="color:#789">· ' + esc(t.owasp) + ' · ' + esc(t.difficulty) + '</span>' + hints + '</div>';
        }).join('');
        return '<h2>' + esc(f) + ' <span style="color:#789;font-size:14px">(' + list.filter(t => state.tests[t.id]).length + '/' + list.length + ' done · ' + (state.attempts[f] || 0) + ' attempts)</span></h2>' + items;
      }).join('');
      send(res, 200, layout('Mission Board', user, '<h1>Mission board — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h1>' + sections));
      return;
    }

    /* ---- completion debrief + certificate ---- */
    if (pathname === '/tester-name' && method === 'POST') {
      const body = parseBody(await readBody(req), req) || {};
      if (body.testerName) { state.testerName = String(body.testerName).slice(0, 80); saveState(); }
      redirect(res, '/complete');
      return;
    }
    if (pathname === '/complete' && method === 'GET') {
      if (!isComplete()) {
        const remaining = TESTS.filter(t => !state.tests[t.id]);
        send(res, 200, layout('Completion', user,
          '<h1>Lab not complete yet</h1><p>Progress: ' + doneCount() + '/' + TESTS.length + ' tests (' + Math.floor(doneCount() / TESTS.length * 100) + '%).</p>' +
          '<h2>Still to solve</h2><ul>' + remaining.map(t => '<li>' + esc(t.name) + ' <span style="color:#789">(' + esc(t.feature) + ')</span></li>').join('') + '</ul>' +
          '<p><a href="/tests">Back to the mission board</a></p>'));
        return;
      }
      const features = [...new Set(TESTS.map(t => t.feature))];
      const perFeature = features.map(f => { const l = featureByName(f); return '<tr><td>' + esc(f) + '</td><td>' + l.length + '</td></tr>'; }).join('');
      const techniques = TESTS.map(t => '<li>' + esc(t.name) + ' <span style="color:#789">(' + esc(t.owasp) + ')</span></li>').join('');
      const lessons = TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.lesson) + '</li>').join('');
      const impacts = TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.impact) + '</li>').join('');
      const reports = TESTS.map(t => '<li><b>' + esc(t.report.title) + '</b> — Severity: ' + esc(t.report.severity) + '<br><span style="color:#456">Remediation: ' + esc(t.report.remediation) + '</span></li>').join('');
      send(res, 200, layout('Lab complete', user,
        '<h1>🎉 LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' complete!</h1>' +
        '<h2>1 · Features in this lab</h2><p>' + features.length + ' features were tested.</p>' +
        '<h2>2 · Vulnerabilities per feature</h2><table border="1" cellpadding="6" style="background:#fff;border-collapse:collapse"><tr><th>Feature</th><th>Tests</th></tr>' + perFeature + '</table>' +
        '<h2>3 · Ways testing was done (' + TESTS.length + ' tests completed)</h2><ul>' + techniques + '</ul>' +
        '<h2>4 · What you learned</h2><ul>' + lessons + '</ul>' +
        '<h2>5 · What this means for a real client</h2><ul>' + impacts + '</ul>' +
        '<h2>6 · Writing it in a real report</h2><ul>' + reports + '</ul>' +
        '<div style="background:#14141d;color:#fff;padding:18px;border-radius:10px;margin:20px 0"><p style="margin:0 0 6px;color:#9ab">Your completion key for the next lab:</p>' +
        '<code style="font-size:19px">' + esc(completionKey()) + '</code></div>' +
        '<form method="POST" action="/tester-name">Your name for the certificate: <input name="testerName" value="' + esc(state.testerName || (user ? user.name : '')) + '" style="padding:7px"> <button style="padding:7px 14px">Save name</button></form>' +
        '<p style="margin-top:16px"><a href="/certificate" style="font-size:17px">View your certificate →</a></p>'));
      return;
    }
    if (pathname === '/certificate' && method === 'GET') {
      if (!isComplete()) { redirect(res, '/complete'); return; }
      const features = [...new Set(TESTS.map(t => t.feature))];
      const name = state.testerName || (user ? user.name : 'HexaExam Tester');
      const dateStr = state.completedAt ? new Date(state.completedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      send(res, 200,
        '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</title>' +
        '<style>@media print { body { background:#fff } .noprint { display:none } }</style></head>' +
        '<body style="margin:0;background:#e8eaf2;font-family:Georgia,serif">' + progressBarHtml() +
        '<div style="max-width:720px;margin:34px auto;background:#fff;border:3px solid #7c5cff;border-radius:14px;padding:38px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.12)">' +
        '<img src="/logo.png" style="height:64px">' +
        '<h1 style="margin:10px 0 4px">Certificate of Completion</h1>' +
        '<p style="color:#567">This certifies that</p>' +
        '<h2 style="margin:6px 0;font-size:30px">' + esc(name) + '</h2>' +
        '<p>has completed 100% of the security tests in <b>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</b><br>(' + TESTS.length + ' tests across ' + features.length + ' features)</p>' +
        '<p style="color:#567">Completed on ' + esc(dateStr) + '</p>' +
        '<p style="margin-top:22px;font-style:italic">HexaCyberLab — Built by Md. Jony Hassain, Founder</p>' +
        '<p class="noprint"><button onclick="window.print()">Print certificate</button></p>' +
        '</div></body></html>');
      return;
    }

    send(res, 404, layout('Not found', user, '<h1>404 — Not found</h1><p><a href="/">Home</a></p>'));
  } catch (err) {
    try { send(res, 500, 'Internal error — the lab survived that.'); } catch (e) { /* socket gone */ }
  }
});

/* ------------------------------ bootstrap -------------------------- */
loadState();
if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log('LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' running at http://' + HOST + ':' + PORT + ' (local only, deliberately vulnerable)');
  });
}
module.exports = { TESTS };
