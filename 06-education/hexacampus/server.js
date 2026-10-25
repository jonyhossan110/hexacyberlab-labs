'use strict';
/*
 * HexaCampus — LAB 55 (Category 6: Education & E-learning)
 * A deliberately vulnerable university student portal for authorised
 * security training. LOCAL ONLY. Zero-dependency Node.js.
 * All people, grades, fees and documents are fake seed data.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB_NUMBER = 55;
const LAB_NAME = 'HexaCampus';
const PREV_LAB = 54;
const PORT = 3064;
const HOST = '127.0.0.1';
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const LOGO_BUF = (() => { try { return fs.readFileSync(path.join(DIR, 'logo.png')); } catch (e) { return null; } })();

// --- lab-system key material: encoded fragments, scattered (spec §7) ---
const _eA = ['TC1YSA==', 'Ni01NQ==', 'NzdTSA=='];
const _cA = ['TC1YSA==', 'Ti02NQ==', 'UzdPMw=='];
function _asm(a, b) {
  return a.concat(b).map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}

/* ---------------- progress engine + persistence (spec §4) ---------------- */
let progress = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadProgress() {
  try {
    const p = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    if (p && typeof p === 'object') progress = Object.assign(progress, p);
  } catch (e) { /* fresh install */ }
}
function saveProgress() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2)); } catch (e) { /* ignore */ }
}
function totalTests() { return TESTS.length; }
function doneCount() { return TESTS.filter(t => progress.tests[t.id]).length; }
function isComplete() { return doneCount() === totalTests(); }
function pass(id) {
  if (progress.tests[id]) return;
  progress.tests[id] = true;
  if (isComplete() && !progress.completedAt) {
    progress.completedAt = new Date().toISOString();
    progress.keyRevealed = true;
  }
  saveProgress();
}
function attempt(feature) {
  progress.attempts[feature] = (progress.attempts[feature] || 0) + 1;
  saveProgress();
}
function attemptsOf(feature) { return progress.attempts[feature] || 0; }

/* ---------------- seed data (all fake) ---------------- */
const USERS = [
  { id: 1, email: 'admin@hexacampus.edu', pass: 'admin123', name: 'Ada Admin', role: 'admin', isDefault: true },
  { id: 2, email: 'prof.reyes@hexacampus.edu', pass: 'faculty123', name: 'Prof. Daniel Reyes', role: 'faculty' },
  { id: 3, email: 'alice@student.hexacampus.edu', pass: 'alice123', name: 'Alice Student', role: 'student' },
  { id: 4, email: 'bob@student.hexacampus.edu', pass: 'bob123', name: 'Bob Student', role: 'student' },
  { id: 5, email: 'carol@student.hexacampus.edu', pass: 'carol123', name: 'Carol Student', role: 'student' },
  { id: 6, email: 'demo@hexacampus.edu', pass: 'demo', name: 'Demo User', role: 'student', isDefault: true }
];
let nextUserId = 7;

const COURSES = [
  { id: 101, code: 'CS101', title: 'Intro to Computing', capacity: 30, enrolled: 12, status: 'open', prereq: null },
  { id: 102, code: 'CS201', title: 'Data Structures', capacity: 2, enrolled: 2, status: 'open', prereq: 101 },
  { id: 103, code: 'CS301', title: 'Operating Systems', capacity: 25, enrolled: 20, status: 'closed', prereq: 102 },
  { id: 104, code: 'CS401', title: 'Advanced Web Security', capacity: 20, enrolled: 5, status: 'open', prereq: 103 },
  { id: 105, code: 'MATH101', title: 'Calculus I', capacity: 40, enrolled: 22, status: 'open', prereq: null },
  { id: 199, code: 'CS999', title: 'Draft Seminar — Unpublished', capacity: 10, enrolled: 0, status: 'open', prereq: null, hidden: true }
];
const ENROLLMENTS = [
  { id: 1, studentId: 3, courseId: 101 },
  { id: 2, studentId: 3, courseId: 105 },
  { id: 3, studentId: 4, courseId: 101 },
  { id: 4, studentId: 5, courseId: 101 },
  { id: 5, studentId: 5, courseId: 102 }
];
let nextEnrollmentId = 6;

const GRADE_POINTS = { 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'D': 1.0, 'F': 0.0 };
const GRADES = [
  { id: 1, studentId: 3, courseId: 101, grade: 'A' },
  { id: 2, studentId: 3, courseId: 105, grade: 'B+' },
  { id: 3, studentId: 4, courseId: 101, grade: 'C' },
  { id: 4, studentId: 4, courseId: 105, grade: 'B' },
  { id: 5, studentId: 5, courseId: 101, grade: 'A' },
  { id: 6, studentId: 5, courseId: 102, grade: 'A-' }
];
let nextGradeId = 7;

const STATEMENTS = [
  { id: 501, studentId: 3, term: 'Fall 2026', total: 5000, paid: 1200, status: 'partial', waivers: 0 },
  { id: 502, studentId: 4, term: 'Fall 2026', total: 4500, paid: 0, status: 'unpaid', waivers: 0 },
  { id: 503, studentId: 5, term: 'Fall 2026', total: 5200, paid: 5200, status: 'paid', waivers: 0 }
];

/* Virtual document store. Downloads are supposed to stay inside docs/. */
const VFILES = {
  'docs/syllabus.txt': 'HexaCampus — Fall 2026 course syllabus (public document).',
  'docs/calendar.txt': 'HexaCampus academic calendar — Fall 2026 (public document).',
  'private/all-transcripts-backup.txt': 'CONFIDENTIAL — REGISTRAR BACKUP\nalice@student.hexacampus.edu, national-id BD-992-113, gpa 3.65\nbob@student.hexacampus.edu, national-id BD-441-908, gpa 2.50\ncarol@student.hexacampus.edu, national-id BD-730-221, gpa 3.85'
};
const UPLOADS = {}; // filename -> { content, storedBy }

/* ---------------- sessions & runtime trackers ---------------- */
const sessions = new Map(); // sid -> { userId, originToken }
const FAILS = {};           // email -> consecutive failed logins
const ENUM = { loginMissing: false, loginWrong: false, forgotHit: false, forgotMiss: false };
const ISSUED_TOKENS = new Set(); // `${userId}:${token}` issued via /forgot

function resetTokenFor(user) { return 'HXRESET-' + (user.id * 137 + 42); }
function computeGpa(studentId) {
  const rows = GRADES.filter(g => g.studentId === studentId);
  if (!rows.length) return null;
  const sum = rows.reduce((a, g) => a + (GRADE_POINTS[g.grade] || 0), 0);
  return Math.round((sum / rows.length) * 100) / 100;
}

/* ---------------- TESTS registry (spec §3) ---------------- */
const F_AUTH = 'Login & Authentication';
const F_REG = 'Registration & Profile';
const F_COURSE = 'Courses & Registration';
const F_GRADE = 'Grades & Transcripts';
const F_FEE = 'Tuition & Payments';
const F_DOC = 'Documents & Uploads';
const F_SEARCH = 'Search';
const F_ADMIN = 'Admin Panel';

const TESTS = [
  // ---- Login & Authentication (6) ----
  { id: 'auth-sqli', feature: F_AUTH, name: 'SQL Injection Login Bypass', owasp: 'A03:2021 – Injection', difficulty: 'Beginner', route: 'POST /login',
    hints: ['The login form builds its query by gluing your input straight into the SQL string.', "Try an email that closes the quote and makes the WHERE clause always true.", "Email: ' OR '1'='1 — any password. You should land in the first account in the table."],
    lesson: 'String-built queries let an attacker rewrite the login logic itself — no valid password is needed when the query can be bent.',
    impact: 'On a real campus portal this hands an attacker an administrator session in seconds: every student record, grade and fee behind that login is exposed.',
    report: { title: 'SQL Injection in Login Form (Authentication Bypass)', severity: 'Critical', remediation: 'Use parameterised queries everywhere; never concatenate user input into SQL.' },
    steps: "On /login, enter the email ' OR '1'='1 and any password, then submit. The string-built query returns the first user (the admin) and a session is created without a real password." },
  { id: 'auth-brute', feature: F_AUTH, name: 'Brute Force — No Rate Limit or Lockout', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner', route: 'POST /login',
    hints: ['How many wrong passwords can you try in a row for one account?', 'Nothing slows you down — no counter, no CAPTCHA, no lockout.', 'Submit 10+ wrong passwords for bob@student.hexacampus.edu and watch them all be processed.'],
    lesson: 'Without throttling, a login form is an unlimited password-guessing machine; weak student passwords fall quickly.',
    impact: 'Attackers routinely credential-stuff university portals. No lockout means one guessed password equals one compromised student account.',
    report: { title: 'Missing Brute-Force Protection on Login', severity: 'High', remediation: 'Add progressive delays, lockout after repeated failures, and CAPTCHA or MFA on the login form.' },
    steps: 'Submit 10 or more wrong passwords for the same account (e.g. bob@student.hexacampus.edu). Every attempt is processed with no delay, lockout or challenge — the 10th failure completes this test.' },
  { id: 'auth-enum', feature: F_AUTH, name: 'User Enumeration via Login & Password Reset', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner', route: 'POST /login · POST /forgot',
    hints: ['Compare the error for an email that exists with one that does not.', 'The login and forgot-password pages answer differently — that difference is the leak.', 'Try a real student email with a wrong password, then a made-up email. Repeat the comparison on /forgot.'],
    lesson: 'Different error messages for "no such account" vs "wrong password" confirm which email addresses are registered.',
    impact: 'Enumeration gives attackers a verified target list of student emails — the starting point for phishing and password spraying against the university.',
    report: { title: 'Account Enumeration via Differential Error Messages', severity: 'Medium', remediation: 'Return one generic message ("invalid credentials" / "if the account exists…") for login and reset flows.' },
    steps: 'On /login, submit an existing email with a wrong password ("Incorrect password") and a non-existent email ("No account with that email"). The different answers confirm which accounts exist. The same difference exists on /forgot.' },
  { id: 'auth-default', feature: F_AUTH, name: 'Default / Demo Credentials Still Active', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner', route: 'POST /login',
    hints: ['Fresh installs ship with demo accounts — and this one was never cleaned up.', 'The login page itself lists the demo accounts.', 'Sign in as the seeded demo or admin account with its original password.'],
    lesson: 'Default credentials are public knowledge; any account that keeps them is effectively unlocked.',
    impact: 'The seeded admin account still uses its factory password — a real deployment would give the first visitor full administrative control.',
    report: { title: 'Default Credentials in Production', severity: 'Critical', remediation: 'Force password change on first login, remove demo accounts, and audit for vendor defaults.' },
    steps: 'Use one of the demo accounts printed on the login page (the admin account still has its factory password admin123, and demo@hexacampus.edu uses demo). A successful sign-in completes this test.' },
  { id: 'auth-reset', feature: F_AUTH, name: 'Predictable Password-Reset Token', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Intermediate', route: 'POST /reset',
    hints: ['Request a reset for your own account and study the token format in the demo inbox note.', 'The token is pure arithmetic on something you can see in profile URLs.', 'Token = HXRESET-(userId × 137 + 42). Compute it for another user and reset their password without ever using /forgot for them.'],
    lesson: 'Reset tokens must be unguessable random values; a formula based on the user id lets anyone take over any account.',
    impact: 'Anyone who can see a student id — shown all over the portal — can reset that student\u2019s password and own the account, grades and fee records included.',
    report: { title: 'Predictable Password Reset Token Allows Account Takeover', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), store them hashed, expire them quickly, and use them once.' },
    steps: 'Use /forgot on your OWN account and read the demo-inbox token to learn the pattern HXRESET-(id×137+42). Then POST /reset for a different user with the token you computed for their id — never request a reset for them first. A forged token that changes their password completes this test.' },
  { id: 'auth-cookie', feature: F_AUTH, name: 'Role Cookie Tampering Opens Faculty Area', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate', route: 'GET /faculty/grades',
    hints: ['After login, look at the cookies the portal sets — one of them carries your role.', 'The faculty grade-entry page trusts that cookie instead of the server-side account.', 'Set the hx_role cookie to faculty in your browser and open /faculty/grades as a student.'],
    lesson: 'Authorization data stored on the client can be edited by the client; roles must be checked server-side from the session.',
    impact: 'Any student can promote themselves to faculty in one cookie edit and open the grade-entry console of a real university portal.',
    report: { title: 'Client-Side Role Cookie Trusted for Authorization', severity: 'High', remediation: 'Derive roles from the server-side session only; never trust role claims in cookies or form fields.' },
    steps: 'Sign in as a student, then edit the hx_role cookie to the value faculty and visit /faculty/grades. The page is served because the portal trusts the cookie over the real account role.' },

  // ---- Registration & Profile (4) ----
  { id: 'reg-weakpass', feature: F_REG, name: 'Weak Password Policy at Registration', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner', route: 'POST /register',
    hints: ['How short a password will the sign-up form accept?', 'There is effectively no minimum length or complexity rule.', 'Register a new account with a 1-character password.'],
    lesson: 'A password policy that accepts anything trains users into weak passwords and makes every other control weaker.',
    impact: 'Students reuse short passwords everywhere; accepting them means the portal\u2019s accounts fall to trivial guessing and credential stuffing.',
    report: { title: 'No Minimum Password Strength at Registration', severity: 'Medium', remediation: 'Enforce a minimum length (≥10) and screen against common/breached password lists.' },
    steps: 'Register a new account with a password shorter than 6 characters (even 1 character works). The account is created — the policy accepts anything.' },
  { id: 'reg-massassign', feature: F_REG, name: 'Mass Assignment — Role & GPA at Registration', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate', route: 'POST /register',
    hints: ['The sign-up handler binds every submitted field onto the new account object.', 'What fields does a user record have that the form never shows? Think role… and gpa.', 'Submit the registration with extra fields role=admin and gpa=4.0 and check your new account.'],
    lesson: 'Binding request bodies directly to data models lets attackers set fields the UI never offered — roles, balances, GPAs.',
    impact: 'A self-registered "student" who is secretly an admin — or carries a forged 4.0 GPA — defeats every trust decision the university makes from this data.',
    report: { title: 'Mass Assignment in Registration Allows Privilege Escalation', severity: 'High', remediation: 'Whitelist bindable fields per endpoint; set role/GPA server-side only.' },
    steps: 'Register with extra form fields the UI never shows: role=admin (or faculty) and/or gpa=4.0. The handler binds them onto the new account, so you start with an elevated role or a forged GPA.' },
  { id: 'reg-xss', feature: F_REG, name: 'Stored XSS in Display Name', owasp: 'A03:2021 – Injection', difficulty: 'Intermediate', route: 'POST /register · POST /profile',
    hints: ['Your display name is printed on the dashboard and the faculty roster…', '…and it is printed without any output encoding.', 'Put an HTML/JS payload in your name at registration or on /profile and view a page that renders it.'],
    lesson: 'Any user-controlled text rendered unescaped becomes stored XSS that fires in other users\u2019 browsers — including staff.',
    impact: 'A payload in a student name executes in the faculty roster view, letting an attacker act inside a lecturer\u2019s session — grade changes included.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-encode all user data on output and add a strict Content-Security-Policy.' },
    steps: 'Set your display name (register or /profile) to an HTML payload such as <script>alert(1)</script> or an <img onerror> tag. It is stored and rendered unescaped on the dashboard and roster.' },
  { id: 'reg-csrf', feature: F_REG, name: 'CSRF on Profile Update', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate', route: 'POST /profile',
    hints: ['The profile form changes your email/name with a plain POST.', 'The portal issues an hx_origin marker cookie on its own pages — the profile endpoint never checks it.', 'Send the profile POST from a raw client (no hx_origin cookie, foreign Origin) and watch the change go through.'],
    lesson: 'State-changing forms without anti-CSRF tokens can be submitted by any website the victim visits while logged in.',
    impact: 'A malicious page could silently change a student\u2019s contact email — the first step to locking them out via password reset.',
    report: { title: 'Cross-Site Request Forgery on Profile Update', severity: 'Medium', remediation: 'Require per-session anti-CSRF tokens on every state-changing form and verify Origin/Referer.' },
    steps: 'POST to /profile with your session cookie but WITHOUT the hx_origin marker cookie (or with a foreign Origin header). The name/email change is applied anyway — no CSRF defence exists.' },

  // ---- Courses & Registration (3) ----
  { id: 'course-full', feature: F_COURSE, name: 'Enroll in a Full or Closed Course', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner', route: 'POST /courses/:id/enroll',
    hints: ['CS201 already has 2 of 2 seats. CS301 is closed for registration.', 'The enroll endpoint never checks capacity or course status.', 'Just POST enroll for CS201 or CS301 and check /my-courses.'],
    lesson: 'Business rules that live only in the UI (greyed-out buttons) are not rules — the server must enforce capacity and status.',
    impact: 'Students could force their way into full classes or closed courses, breaking class-size limits the university is accredited for.',
    report: { title: 'Missing Capacity/Status Check on Course Enrollment', severity: 'Medium', remediation: 'Enforce capacity and registration status server-side inside a transaction.' },
    steps: 'POST /courses/102/enroll (CS201 is full at 2/2) or /courses/103/enroll (CS301 is closed). The enrollment is created anyway.' },
  { id: 'course-prereq', feature: F_COURSE, name: 'Prerequisite Bypass on Enrollment', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner', route: 'POST /courses/:id/enroll',
    hints: ['CS401 needs CS301 first. A brand-new account has passed nothing.', 'The enroll endpoint never looks at what you have completed.', 'Enroll a fresh account straight into CS401.'],
    lesson: 'Prerequisite chains are server-side business logic; skipping the check lets users jump sequences the institution designed deliberately.',
    impact: 'Unprepared students land in advanced courses, and prerequisite-gated programmes (a compliance requirement) become meaningless.',
    report: { title: 'Prerequisite Rules Not Enforced on Enrollment', severity: 'Medium', remediation: 'Verify prerequisite completion server-side before creating an enrollment.' },
    steps: 'With an account that has not taken CS301, POST /courses/104/enroll (CS401, prereq CS301). The enrollment succeeds without the prerequisite.' },
  { id: 'course-drop-idor', feature: F_COURSE, name: 'Drop Another Student\u2019s Enrollment (IDOR)', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate', route: 'POST /enrollments/:id/drop',
    hints: ['Your enrollment ids on /my-courses are small sequential numbers.', 'The drop endpoint never asks whose enrollment it is.', 'POST a drop for an enrollment id that belongs to someone else (try the ids around yours).'],
    lesson: 'Object references must be authorised per request: owning the session does not mean owning every id in the URL.',
    impact: 'A malicious student could unenroll classmates from courses right before a deadline — real academic harm from one missing check.',
    report: { title: 'Insecure Direct Object Reference on Enrollment Drop', severity: 'High', remediation: 'Check that the enrollment belongs to the session user (or a privileged role) before deleting.' },
    steps: 'Find an enrollment id that is not yours (ids are sequential; yours are on /my-courses) and POST /enrollments/<id>/drop. The other student\u2019s enrollment is deleted.' },

  // ---- Grades & Transcripts (4) ----
  { id: 'grade-idor', feature: F_GRADE, name: 'View Another Student\u2019s Grades (IDOR)', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner', route: 'GET /students/:id/grades',
    hints: ['Your own grades live at /students/<your id>/grades.', 'Student ids are small and shown around the portal.', 'Change the id to another student (try 4 or 5) and open the page.'],
    lesson: 'Grades are among the most sensitive records a school holds; a missing ownership check exposes all of them.',
    impact: 'Every student\u2019s grades become readable by every other student — a serious privacy breach (FERPA/GDPR territory) for a real university.',
    report: { title: 'IDOR Exposes Other Students\u2019 Grade Records', severity: 'High', remediation: 'Authorise every record access against the session user and role.' },
    steps: 'Sign in as one student and open /students/4/grades (or 5). The other student\u2019s full grade list is served with no ownership check.' },
  { id: 'grade-change', feature: F_GRADE, name: 'Student Changes a Grade via the Faculty Endpoint', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate', route: 'POST /faculty/grades',
    hints: ['The grade-entry form is only LINKED for faculty — but who checks the POST?', 'The endpoint checks that you are logged in. Nothing more.', 'As a student, POST studentId, courseId and grade straight to /faculty/grades.'],
    lesson: 'Hiding a link is not access control. Every privileged action must re-verify the caller\u2019s role on the server.',
    impact: 'A student awarding themselves an A destroys the integrity of the entire grading system — the one asset a university cannot afford to lose.',
    report: { title: 'Missing Authorization on Grade-Entry Endpoint', severity: 'Critical', remediation: 'Enforce faculty/admin role server-side on the grade-entry endpoint and log all grade changes.' },
    steps: 'While signed in as a student, POST /faculty/grades with studentId=<your id>, courseId=<a course> and grade=A. The grade is written although you are not faculty.' },
  { id: 'transcript-idor', feature: F_GRADE, name: 'Download Another Student\u2019s Transcript (IDOR)', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner', route: 'GET /transcripts/:studentId',
    hints: ['Your transcript download is at /transcripts/<your id>.', 'It includes grades, GPA — even a national id number.', 'Swap the id for another student and download theirs.'],
    lesson: 'Document endpoints are record endpoints: the same ownership rules apply to generated files as to pages.',
    impact: 'Transcripts bundle identity data and academic history; leaking them enables identity fraud against every student on the portal.',
    report: { title: 'IDOR on Transcript Download Leaks Identity Data', severity: 'High', remediation: 'Authorise transcript generation against the requester; serve only their own document.' },
    steps: 'Open /transcripts/4 while signed in as a different student. A full transcript — grades, GPA and national id — is generated for someone else.' },
  { id: 'grade-roster', feature: F_GRADE, name: 'Faculty Roster Leaks All Students\u2019 Emails & GPAs', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner', route: 'GET /faculty/roster',
    hints: ['There is a roster page meant for lecturers at /faculty/roster.', 'It checks that you are logged in — not what you are.', 'Open it as a student.'],
    lesson: 'Internal directories concentrate sensitive data; "logged in" is not an authorization policy.',
    impact: 'One URL hands any student a full directory of names, emails and GPAs — perfect raw material for targeted phishing of the whole cohort.',
    report: { title: 'Faculty Roster Accessible to Any Authenticated User', severity: 'High', remediation: 'Restrict the roster to faculty/admin roles and minimise the fields shown.' },
    steps: 'Sign in as a student and open /faculty/roster. The complete student directory with emails and GPAs is served.' },

  // ---- Tuition & Payments (3) ----
  { id: 'fee-stmt-idor', feature: F_FEE, name: 'View Another Student\u2019s Fee Statement (IDOR)', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner', route: 'GET /statements/:id',
    hints: ['Your statement link is on /billing — the ids are sequential (501, 502, 503…).', 'The statement page never checks the statement\u2019s owner.', 'Open /statements/502 as a different student.'],
    lesson: 'Financial records need the same per-object authorization as everything else; sequential ids make guessing trivial.',
    impact: 'Students\u2019 tuition balances and payment history — sensitive financial data — become public inside the portal.',
    report: { title: 'IDOR Exposes Other Students\u2019 Fee Statements', severity: 'High', remediation: 'Scope statement queries to the session user; use non-sequential identifiers as defence in depth.' },
    steps: 'Sign in as one student and open /statements/502 (Bob\u2019s). His full fee statement is shown.' },
  { id: 'fee-tamper', feature: F_FEE, name: 'Statement Settled as Paid for $1', owasp: 'A04:2021 – Insecure Design', difficulty: 'Intermediate', route: 'POST /payments',
    hints: ['The payment form has a "pay in full" flag the server trusts blindly.', 'The server never compares the amount sent with the amount owed.', 'POST a $1 payment for your statement with settle=full.'],
    lesson: 'Payment state must be derived server-side from real amounts; a client-supplied "settled" flag is an invitation to free tuition.',
    impact: 'A student wipes a $5,000 tuition bill with a $1 payment — direct revenue loss that also corrupts the university\u2019s accounts.',
    report: { title: 'Client-Controlled Settlement Flag Marks Statements Paid', severity: 'Critical', remediation: 'Compute paid status server-side from verified payment amounts only.' },
    steps: 'On your statement, POST /payments with statementId=<yours>, amount=1 and settle=full. The statement flips to PAID although only $1 was paid.' },
  { id: 'fee-waiver', feature: F_FEE, name: 'Single-Use Merit Waiver Can Be Reused', owasp: 'A04:2021 – Insecure Design', difficulty: 'Beginner', route: 'POST /waivers/apply',
    hints: ['The merit waiver code HEXAMERIT50 halves a statement — once, in theory.', 'Nothing records that your statement already used it.', 'Apply the same code to the same statement a second time.'],
    lesson: 'One-time benefits need server-side usage records; a code without a redemption ledger is an unlimited discount.',
    impact: 'Repeated 50% waivers shrink a tuition bill to almost nothing — the same bug class as reusable coupon codes in e-commerce.',
    report: { title: 'Waiver Code Reusable Without Redemption Tracking', severity: 'High', remediation: 'Record redemptions per student/statement and reject repeats server-side.' },
    steps: 'Apply the waiver code HEXAMERIT50 to your statement twice via POST /waivers/apply. The second application halves the (already reduced) total again.' },

  // ---- Documents & Uploads (2) ----
  { id: 'upload-html', feature: F_DOC, name: 'Unrestricted Upload — HTML Served from the Portal Origin', owasp: 'A08:2021 – Software and Data Integrity Failures', difficulty: 'Intermediate', route: 'POST /upload · GET /uploads/:name',
    hints: ['The document upload accepts any file name and content.', 'Uploaded files are served back — with a content type guessed from the extension.', 'Upload an .html file containing a script and open its /uploads/ URL.'],
    lesson: 'If user uploads are served as active content from the app origin, upload becomes stored XSS with the portal\u2019s full trust.',
    impact: 'An attacker hosts a fake "re-login" page on the real university domain and harvests student passwords with perfect credibility.',
    report: { title: 'Unrestricted File Upload Served as Active Content', severity: 'High', remediation: 'Whitelist file types, store uploads outside the web root, serve with Content-Disposition: attachment and a safe Content-Type.' },
    steps: 'POST /upload with filename=evil.html and an HTML/script body, then open /uploads/evil.html. It is served as text/html from the portal origin.' },
  { id: 'doc-traversal', feature: F_DOC, name: 'Path Traversal in Document Download', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate', route: 'GET /documents/download?name=',
    hints: ['Downloads take a name and join it onto the docs folder.', 'The join honours ../ segments.', 'Ask for name=../private/all-transcripts-backup.txt.'],
    lesson: 'User-controlled file paths must be canonicalised and constrained to the intended directory.',
    impact: 'Traversal out of the document folder reaches registrar backups — a full export of student identity data in one request.',
    report: { title: 'Path Traversal in Document Download', severity: 'High', remediation: 'Resolve the final path and verify it stays inside the allowed directory; reject .. segments.' },
    steps: 'GET /documents/download?name=../private/all-transcripts-backup.txt. The confidential registrar backup outside docs/ is returned.' },

  // ---- Search (2) ----
  { id: 'search-sqli', feature: F_SEARCH, name: 'SQL Injection in Course Search Leaks Hidden Courses', owasp: 'A03:2021 – Injection', difficulty: 'Intermediate', route: 'GET /search?q=',
    hints: ['Search builds its query the same sloppy way login does.', 'A classic always-true condition changes what the query returns.', "Search for ' OR '1'='1 and look for a course that never appears in /courses."],
    lesson: 'Injection in a "harmless" search box still rewrites the query — here it exposes unpublished data.',
    impact: 'Unpublished draft courses (and anything else the query touches) leak; the same flaw usually reaches far more sensitive tables.',
    report: { title: 'SQL Injection in Course Search', severity: 'High', remediation: 'Parameterise the search query and filter hidden records server-side regardless of input.' },
    steps: "Search with q=' OR '1'='1. The result set includes the hidden draft course CS999, which never appears in the normal catalogue." },
  { id: 'search-xss', feature: F_SEARCH, name: 'Reflected XSS in Course Search', owasp: 'A03:2021 – Injection', difficulty: 'Beginner', route: 'GET /search?q=',
    hints: ['The results page prints "Results for: …" with your query.', 'It prints it raw.', 'Put an HTML payload in q and view the page source.'],
    lesson: 'Reflected input is still user content: echoing a query unescaped executes in the victim\u2019s browser.',
    impact: 'A crafted search link sent to a lecturer runs script in their session — a clean path to grade tampering via their browser.',
    report: { title: 'Reflected Cross-Site Scripting in Search', severity: 'Medium', remediation: 'HTML-encode all reflected values and deploy a Content-Security-Policy.' },
    steps: 'Open /search?q=<script>alert(1)</script>. The payload is reflected unescaped into the results page.' },

  // ---- Admin Panel (2) ----
  { id: 'admin-access', feature: F_ADMIN, name: 'Admin Console Reachable by Any Student', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner', route: 'GET /admin',
    hints: ['The console lives at the obvious address: /admin.', 'It checks only that somebody is logged in.', 'Open it as a student.'],
    lesson: 'Admin surfaces must verify the admin role on every request, not just hide their links from menus.',
    impact: 'The console lists every account including passwords — one student visit equals a full credential dump of the university.',
    report: { title: 'Broken Access Control on Admin Console', severity: 'Critical', remediation: 'Enforce admin role server-side on all /admin routes; never display stored passwords.' },
    steps: 'Sign in as a student and open /admin. The full console — user list with passwords and role management — is served.' },
  { id: 'admin-csrf', feature: F_ADMIN, name: 'CSRF on Admin Role Change', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Advanced', route: 'POST /admin/adjust-role',
    hints: ['The role-change POST trusts the session cookie alone.', 'No anti-CSRF token, and the hx_origin marker is never verified here either.', 'Submit the role change from a raw client without the hx_origin marker and see it applied.'],
    lesson: 'Privileged state changes need CSRF tokens most of all — they are the highest-value forgery targets.',
    impact: 'A page an admin merely visits could promote an attacker\u2019s account to admin — full portal takeover without stealing any password.',
    report: { title: 'Cross-Site Request Forgery on Admin Role Management', severity: 'High', remediation: 'Require anti-CSRF tokens on admin actions and re-confirm sensitive changes.' },
    steps: 'POST /admin/adjust-role (userId + role=admin) with a session cookie but WITHOUT the hx_origin marker (or with a foreign Origin). The role change is applied with no CSRF defence.' }
];

/* ---------------- more encoded fragments (spec §7) ---------------- */
const _eB = ['LVVEVg==', 'OUEwUA==', 'R1ZZMQ=='];
function entryKey() { return _asm(_eA, _eB); }

/* ---------------- helpers ---------------- */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const XSS_RE = /<script|onerror\s*=|onload\s*=|<svg|<img[^>]*\son\w+\s*=|<iframe|javascript\s*:/i;
const INJ_RE = /('|")\s*(or|and)\s+[^=]*=|'\s*--|'\s*or\s*'[^']*'\s*=\s*'|or\s+1\s*=\s*1|union\s+select/i;
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  raw.split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function parseBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) {
        try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({ __bad: true }); }
      } else {
        const o = {};
        try { new URLSearchParams(data).forEach((v, k) => { o[k] = v; }); } catch (e) { /* ignore */ }
        resolve(o);
      }
    });
    req.on('error', () => resolve({}));
  });
}
function currentSession(req) {
  const c = parseCookies(req);
  if (c.hx_session && sessions.has(c.hx_session)) return { sid: c.hx_session, ...sessions.get(c.hx_session) };
  return null;
}
function currentUser(req) {
  const s = currentSession(req);
  if (!s) return null;
  return USERS.find(u => u.id === s.userId) || null;
}
function effectiveRole(req, user) {
  const c = parseCookies(req);
  return c.hx_role || (user ? user.role : null);
}
function csrfOk(req) {
  const s = currentSession(req);
  if (!s) return false;
  const c = parseCookies(req);
  const origin = req.headers.origin || '';
  if (origin && !origin.includes(HOST + ':' + PORT)) return false;
  return !!c.hx_origin && c.hx_origin === s.originToken;
}
function userName(u) { return u ? u.name : ''; }

/* ---------------- page shell (header + progress + chat widget) ---------------- */
function chatWidget() {
  return `<div id="hxchat" style="position:fixed;right:16px;bottom:16px;width:320px;max-width:92vw;background:#fff;border:1px solid #ccd;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.25);font-family:Arial,sans-serif;z-index:50">
  <div style="background:#283593;color:#fff;padding:10px 14px;border-radius:12px 12px 0 0;font-weight:bold">HexaCampus Lab Coach</div>
  <div id="hxlog" style="height:180px;overflow:auto;padding:10px;font-size:13px;line-height:1.45"></div>
  <div style="display:flex;border-top:1px solid #eee">
    <input id="hxmsg" placeholder="Ask the coach…" style="flex:1;border:0;padding:10px;font-size:13px" onkeydown="if(event.key==='Enter')hxSend()">
    <button onclick="hxSend()" style="border:0;background:#283593;color:#fff;padding:10px 14px;cursor:pointer">Send</button>
  </div></div>
<script>
async function hxSend(){var i=document.getElementById('hxmsg');var m=i.value.trim();if(!m)return;i.value='';var log=document.getElementById('hxlog');log.innerHTML+='<div><b>You:</b> '+m.replace(/</g,'&lt;')+'</div>';try{var r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})});var j=await r.json();log.innerHTML+='<div style="margin:6px 0"><b>Coach:</b> '+(j.reply||'').replace(/</g,'&lt;').replace(/\\n/g,'<br>')+'</div>';}catch(e){log.innerHTML+='<div><b>Coach:</b> I could not answer just now — try /tests.</div>';}log.scrollTop=log.scrollHeight;}
</script>`;
}
function shell(title, body, user) {
  const done = doneCount(), total = totalTests(), pct = total ? Math.floor(done * 100 / total) : 0;
  const nav = user ? `<div style="margin:8px 0;font-size:14px">
    <a href="/">Dashboard</a> · <a href="/courses">Courses</a> · <a href="/my-courses">My Courses</a> ·
    <a href="/search">Search</a> · <a href="/billing">Billing</a> · <a href="/students/${user.id}/grades">My Grades</a> ·
    <a href="/upload">Documents</a> · <a href="/profile">Profile</a> · <a href="/tests">Mission (/tests)</a> ·
    <a href="/complete">Completion</a> · <span>${esc(user.name)} (${esc(user.role)})</span> ·
    <form method="POST" action="/logout" style="display:inline"><button style="cursor:pointer">Log out</button></form></div>` :
    `<div style="margin:8px 0;font-size:14px"><a href="/login">Log in</a> · <a href="/register">Register</a> · <a href="/tests">Mission (/tests)</a></div>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)} — LAB ${LAB_NUMBER} ${LAB_NAME}</title></head>
<body style="margin:0;background:#eef1f8;font-family:Arial,sans-serif;color:#1c2333">
<div style="max-width:980px;margin:0 auto;padding:18px">
  <div style="background:#fff;border:1px solid #dde;border-radius:12px;padding:16px 20px">
    <div style="display:flex;align-items:center;gap:12px">
      <img src="/logo.png" style="height:44px" alt="HexaCyberLab">
      <div>
        <div style="font-size:20px;font-weight:bold">LAB ${LAB_NUMBER} — ${LAB_NAME}</div>
        <div style="font-size:13px;color:#555">University Student Portal · HexaCyberLab practice lab (local only, fake data)</div>
      </div>
    </div>
    <div style="margin-top:10px;font-size:13px">Progress: <b>${done}/${total} tests · ${pct}%</b></div>
    <div style="height:10px;background:#e3e7f5;border-radius:6px;overflow:hidden;margin-top:4px"><div style="height:100%;width:${pct}%;background:#283593"></div></div>
    ${nav}
  </div>
  <div style="background:#fff;border:1px solid #dde;border-radius:12px;padding:20px;margin-top:14px">${body}</div>
  <div style="font-size:12px;color:#777;margin-top:10px">HexaCyberLab — Built by Md. Jony Hassain, Founder. Authorised practice only.</div>
</div>
${chatWidget()}
</body></html>`;
}
function gatePage(msg) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ${LAB_NUMBER} — ${LAB_NAME} · Locked</title></head>
<body style="margin:0;background:#14141d;font-family:Arial,sans-serif">
<div style="max-width:520px;margin:60px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:28px;text-align:center">
<img src="/logo.png" style="height:56px"><h2>LAB ${LAB_NUMBER} — ${LAB_NAME}</h2>
<p>This lab is locked. Paste the completion key from Lab ${PREV_LAB} to start.</p>
${msg ? `<p style="color:#b00">${esc(msg)}</p>` : ''}
<form method="POST" action="/unlock"><input name="key" style="padding:9px;width:80%" placeholder="Completion key from Lab ${PREV_LAB}"><br><br>
<button style="padding:10px 22px;cursor:pointer">Unlock LAB ${LAB_NUMBER}</button></form></div>
${chatWidget()}
</body></html>`;
}
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }
function sendHtml(res, code, html) { res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); }
function sendJson(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj, null, 2)); }

/* ---------------- Lab Coach chatbot (spec §6) ---------------- */
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
const FEATURE_KEYS = [
  [F_AUTH, ['login', 'password', 'auth', 'reset token', 'brute', 'sign in']],
  [F_GRADE, ['grade', 'transcript', 'roster']],
  [F_COURSE, ['course', 'enroll', 'enrol', 'class']],
  [F_FEE, ['tuition', 'fee', 'payment', 'pay', 'waiver', 'billing', 'statement']],
  [F_DOC, ['upload', 'document', 'file', 'download']],
  [F_SEARCH, ['search']],
  [F_ADMIN, ['admin']],
  [F_REG, ['register', 'registration', 'profile', 'sign up', 'signup']]
];
function featureFromMessage(m) {
  for (const [f, keys] of FEATURE_KEYS) if (keys.some(k => m.includes(k))) return f;
  return null;
}
function coachReply(message) {
  const m = String(message || '').toLowerCase();
  const done = doneCount(), total = totalTests(), pct = total ? Math.floor(done * 100 / total) : 0;
  if (/who (built|made|created|developed)|founder|who is behind/.test(m)) return ATTRIBUTION;
  if (m.includes('key')) {
    if (isComplete() && progress.keyRevealed) return 'You completed LAB ' + LAB_NUMBER + ' — well done. Your completion key is: ' + completionKey() + ' — paste it into the next lab to unlock it.';
    return 'I don\u2019t have the completion key yet — it is only given to me when this lab is completed 100%. Right now you are at ' + pct + '% (' + done + '/' + total + ' tests). Finish every test on /tests and the key is yours.';
  }
  const feature = featureFromMessage(m);
  const howTo = /how|solve|exploit|hack|bypass|do i|help|guide|step/.test(m);
  if (feature && howTo) {
    const fTests = TESTS.filter(t => t.feature === feature);
    const att = attemptsOf(feature);
    const allPassed = fTests.every(t => progress.tests[t.id]);
    if (att >= 3 || allPassed) {
      const open = fTests.filter(t => !progress.tests[t.id]);
      if (!open.length) return 'You have already completed every ' + feature + ' test. Nice work — check /tests for what remains.';
      return 'Step by step for ' + feature + ':\n' + open.map(t => '• ' + t.name + ': ' + t.steps).join('\n');
    }
    return 'That feature is locked for help. First try the ' + feature + ' tests yourself at least 3 times — I can see you\u2019ve tried ' + att + ' time(s) so far. After 3 real tries, ask me again and I\u2019ll guide you step by step.';
  }
  if (feature) {
    const fTests = TESTS.filter(t => t.feature === feature);
    const fDone = fTests.filter(t => progress.tests[t.id]).length;
    return feature + ' has ' + fTests.length + ' tests (' + fDone + ' done, ' + attemptsOf(feature) + ' attempt(s) so far):\n' + fTests.map(t => (progress.tests[t.id] ? '✓ ' : '○ ') + t.name).join('\n') + '\nAsk me "how do I solve the ' + feature + ' tests" once you have tried a feature at least 3 times.';
  }
  if (m.includes('progress') || m.includes('how am i') || m.includes('score')) {
    const next = TESTS.find(t => !progress.tests[t.id]);
    return 'You are at ' + pct + '% — ' + done + ' of ' + total + ' tests complete across ' + new Set(TESTS.map(t => t.feature)).size + ' features.' + (next ? ' Next open test: "' + next.name + '" (' + next.feature + ').' : ' Everything is done — see /complete for your key and certificate.');
  }
  if (m.includes('feature') || m.includes('how many') || m.includes('what') && m.includes('test')) {
    const byF = {};
    TESTS.forEach(t => { byF[t.feature] = (byF[t.feature] || 0) + 1; });
    return 'LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ' has ' + total + ' tests in ' + Object.keys(byF).length + ' features:\n' + Object.entries(byF).map(([f, n]) => '• ' + f + ': ' + n).join('\n') + '\nFull map with hints: /tests.';
  }
  if (/^(hi|hello|hey|salut)\b/.test(m) || m.includes('hello')) {
    return 'Hello! I am the Lab Coach for LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '. There are ' + total + ' security tests here; you are at ' + pct + '%. Open /tests for the mission board and hints — and try each feature at least 3 times before asking me how to solve it.';
  }
  return 'I can tell you the map (features, test names, counts), your progress, and — after you have tried a feature at least 3 times — step-by-step guidance. Try: "how many tests in Grades & Transcripts", "what is my progress", or "how do I solve the Search tests". Details and hints live on /tests.';
}

/* ---------------- router ---------------- */
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://' + HOST + ':' + PORT);
    const p = u.pathname;
    const method = req.method;

    if (p === '/logo.png') {
      if (!LOGO_BUF) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': 'image/png' });
      return res.end(LOGO_BUF);
    }
    if (p === '/api/progress') {
      const features = {};
      TESTS.forEach(t => {
        features[t.feature] = features[t.feature] || { total: 0, done: 0, attempts: attemptsOf(t.feature) };
        features[t.feature].total++;
        if (progress.tests[t.id]) features[t.feature].done++;
      });
      return sendJson(res, 200, { lab: LAB_NAME, number: LAB_NUMBER, total: totalTests(), done: doneCount(),
        pct: Math.floor(doneCount() * 100 / totalTests()), features, complete: isComplete() });
    }
    if (p === '/api/chat' && method === 'POST') {
      const body = await parseBody(req);
      if (body.__bad) return sendJson(res, 200, { reply: 'I could not read that message. Ask me about features, your progress, or how a test works.' });
      return sendJson(res, 200, { reply: coachReply(body.message) });
    }
    if (p === '/unlock' && method === 'POST') {
      const body = await parseBody(req);
      if (String(body.key || '') === entryKey()) {
        progress.unlocked = true; saveProgress();
        return redirect(res, '/');
      }
      res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(gatePage('That key is not correct.'));
    }

    /* lock gate: everything below needs the lab unlocked */
    if (!progress.unlocked) return sendHtml(res, 200, gatePage());

    const user = currentUser(req);
    const sess = currentSession(req);

    /* ---------- dashboard ---------- */
    if (p === '/' && method === 'GET') {
      if (!user) return redirect(res, '/login');
      const myEnroll = ENROLLMENTS.filter(e => e.studentId === user.id);
      const body = `<h2>Welcome, ${user.name}</h2>
      <p>Role: <b>${esc(user.role)}</b> · Student id: <b>${user.id}</b> · GPA: <b>${user.gpaOverride != null ? user.gpaOverride : (computeGpa(user.id) == null ? '—' : computeGpa(user.id))}</b></p>
      <h3>My enrollments</h3><ul>${myEnroll.map(e => { const c = COURSES.find(x => x.id === e.courseId); return `<li>${esc(c.code)} — ${esc(c.title)}</li>`; }).join('') || '<li>None yet</li>'}</ul>
      <p><a href="/courses">Browse courses</a> · <a href="/billing">My fee statements</a> · <a href="/transcripts/${user.id}">Download my transcript</a></p>
      <p style="color:#555">Demo accounts are listed on the login page. This portal is intentionally vulnerable — practise only here.</p>`;
      return sendHtml(res, 200, shell('Dashboard', body, user));
    }

    /* ---------- auth ---------- */
    if (p === '/login' && method === 'GET') {
      const body = `<h2>Log in</h2>
      <form method="POST" action="/login">
        <p><label>Email<br><input name="email" style="width:320px;padding:8px"></label></p>
        <p><label>Password<br><input name="pass" type="password" style="width:320px;padding:8px"></label></p>
        <button style="padding:9px 20px;cursor:pointer">Log in</button>
      </form>
      <p><a href="/forgot">Forgot password?</a> · <a href="/register">Create an account</a></p>
      <div style="background:#f4f6ff;border:1px solid #dde;border-radius:8px;padding:10px;font-size:13px">
        <b>Demo accounts (seeded, for practice):</b><br>
        admin@hexacampus.edu / admin123 (administrator — default password never changed)<br>
        prof.reyes@hexacampus.edu / faculty123 (faculty)<br>
        alice@student.hexacampus.edu / alice123 · bob@student.hexacampus.edu / bob123 · carol@student.hexacampus.edu / carol123<br>
        demo@hexacampus.edu / demo (demo account)
      </div>`;
      return sendHtml(res, 200, shell('Log in', body, user));
    }
    if (p === '/login' && method === 'POST') {
      const body = await parseBody(req);
      attempt(F_AUTH);
      const email = String(body.email || ''), passw = String(body.pass || '');
      // Deliberately vulnerable: string-built "query" semantics.
      if (INJ_RE.test(email) || INJ_RE.test(passw)) {
        const asUser = USERS[0];
        const sid = crypto.randomBytes(16).toString('hex');
        const ot = crypto.randomBytes(12).toString('hex');
        sessions.set(sid, { userId: asUser.id, originToken: ot });
        pass('auth-sqli');
        res.writeHead(302, { Location: '/', 'Set-Cookie': [`hx_session=${sid}; Path=/; HttpOnly`, `hx_role=${asUser.role}; Path=/`, `hx_origin=${ot}; Path=/`] });
        return res.end();
      }
      const found = USERS.find(x => x.email.toLowerCase() === email.toLowerCase());
      if (!found) {
        ENUM.loginMissing = true;
        if (ENUM.loginWrong || (ENUM.forgotHit && ENUM.forgotMiss)) pass('auth-enum');
        return sendHtml(res, 200, shell('Log in', '<h2>Log in</h2><p style="color:#b00">No account with that email.</p><p><a href="/login">Try again</a></p>', user));
      }
      if (found.pass !== passw) {
        ENUM.loginWrong = true;
        FAILS[found.email] = (FAILS[found.email] || 0) + 1;
        if (FAILS[found.email] >= 10) pass('auth-brute');
        if (ENUM.loginMissing) pass('auth-enum');
        return sendHtml(res, 200, shell('Log in', '<h2>Log in</h2><p style="color:#b00">Incorrect password.</p><p><a href="/login">Try again</a></p>', user));
      }
      FAILS[found.email] = 0;
      if (found.isDefault) pass('auth-default');
      const sid = crypto.randomBytes(16).toString('hex');
      const ot = crypto.randomBytes(12).toString('hex');
      sessions.set(sid, { userId: found.id, originToken: ot });
      res.writeHead(302, { Location: '/', 'Set-Cookie': [`hx_session=${sid}; Path=/; HttpOnly`, `hx_role=${found.role}; Path=/`, `hx_origin=${ot}; Path=/`] });
      return res.end();
    }
    if (p === '/logout' && method === 'POST') {
      if (sess) sessions.delete(sess.sid);
      res.writeHead(302, { Location: '/login', 'Set-Cookie': ['hx_session=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0', 'hx_origin=; Path=/; Max-Age=0'] });
      return res.end();
    }
    if (p === '/forgot' && method === 'GET') {
      const body = `<h2>Forgot password</h2>
      <form method="POST" action="/forgot"><p><label>Email<br><input name="email" style="width:320px;padding:8px"></label></p>
      <button style="padding:9px 20px;cursor:pointer">Send reset link</button></form>`;
      return sendHtml(res, 200, shell('Forgot password', body, user));
    }
    if (p === '/forgot' && method === 'POST') {
      const body = await parseBody(req);
      attempt(F_AUTH);
      const found = USERS.find(x => x.email.toLowerCase() === String(body.email || '').toLowerCase());
      if (!found) {
        ENUM.forgotMiss = true;
        if (ENUM.forgotHit || (ENUM.loginMissing && ENUM.loginWrong)) pass('auth-enum');
        return sendHtml(res, 200, shell('Forgot password', '<h2>Forgot password</h2><p style="color:#b00">No account found for that email.</p>', user));
      }
      ENUM.forgotHit = true;
      if (ENUM.forgotMiss || (ENUM.loginMissing && ENUM.loginWrong)) pass('auth-enum');
      const tok = resetTokenFor(found);
      ISSUED_TOKENS.add(found.id + ':' + tok);
      // Simulated inbox: a real system would email this; the demo shows it.
      const body2 = `<h2>Forgot password</h2><p>Reset link sent to ${esc(found.email)}.</p>
      <div style="background:#fffbe6;border:1px solid #e6d98c;border-radius:8px;padding:10px;font-size:13px"><b>Demo inbox (simulated email):</b><br>
      Reset your password here: <a href="/reset?email=${encodeURIComponent(found.email)}&token=${esc(tok)}">/reset?email=…&amp;token=${esc(tok)}</a></div>`;
      return sendHtml(res, 200, shell('Forgot password', body2, user));
    }
    if (p === '/reset' && method === 'GET') {
      const body = `<h2>Reset password</h2>
      <form method="POST" action="/reset">
        <p><label>Email<br><input name="email" value="${esc(u.searchParams.get('email') || '')}" style="width:320px;padding:8px"></label></p>
        <p><label>Reset token<br><input name="token" value="${esc(u.searchParams.get('token') || '')}" style="width:320px;padding:8px"></label></p>
        <p><label>New password<br><input name="newpass" type="password" style="width:320px;padding:8px"></label></p>
        <button style="padding:9px 20px;cursor:pointer">Set new password</button></form>`;
      return sendHtml(res, 200, shell('Reset password', body, user));
    }
    if (p === '/reset' && method === 'POST') {
      const body = await parseBody(req);
      attempt(F_AUTH);
      const found = USERS.find(x => x.email.toLowerCase() === String(body.email || '').toLowerCase());
      if (!found) return sendHtml(res, 200, shell('Reset password', '<p style="color:#b00">No account found for that email.</p>', user));
      const expected = resetTokenFor(found);
      if (String(body.token || '') !== expected) {
        return sendHtml(res, 200, shell('Reset password', '<p style="color:#b00">Invalid reset token.</p>', user));
      }
      if (!ISSUED_TOKENS.has(found.id + ':' + expected)) pass('auth-reset'); // forged (never requested) token accepted
      ISSUED_TOKENS.delete(found.id + ':' + expected);
      found.pass = String(body.newpass || 'changed123');
      return sendHtml(res, 200, shell('Reset password', '<p>Password updated. <a href="/login">Log in</a></p>', user));
    }

    /* ---------- registration & profile ---------- */
    if (p === '/register' && method === 'GET') {
      const body = `<h2>Create an account</h2>
      <form method="POST" action="/register">
        <p><label>Full name<br><input name="name" style="width:320px;padding:8px"></label></p>
        <p><label>Email<br><input name="email" style="width:320px;padding:8px"></label></p>
        <p><label>Password<br><input name="pass" type="password" style="width:320px;padding:8px"></label></p>
        <button style="padding:9px 20px;cursor:pointer">Register</button></form>`;
      return sendHtml(res, 200, shell('Register', body, user));
    }
    if (p === '/register' && method === 'POST') {
      const body = await parseBody(req);
      attempt(F_REG);
      const name = String(body.name || 'New Student');
      const email = String(body.email || '');
      const pw = String(body.pass || '');
      if (!email || USERS.some(x => x.email.toLowerCase() === email.toLowerCase())) {
        return sendHtml(res, 200, shell('Register', '<p style="color:#b00">That email is missing or already registered.</p>', user));
      }
      // Deliberately vulnerable: binds every submitted field onto the record.
      const nu = { id: nextUserId++, email, pass: pw, name, role: 'student' };
      let escalated = false;
      if (body.role && ['faculty', 'admin'].includes(String(body.role))) { nu.role = String(body.role); escalated = true; }
      if (body.gpa !== undefined && body.gpa !== '') { nu.gpaOverride = parseFloat(body.gpa); escalated = true; }
      if (body.balance !== undefined && body.balance !== '') { nu.balance = parseFloat(body.balance); escalated = true; }
      USERS.push(nu);
      if (pw.length < 6) pass('reg-weakpass');
      if (escalated) pass('reg-massassign');
      if (XSS_RE.test(name)) pass('reg-xss');
      const sid = crypto.randomBytes(16).toString('hex');
      const ot = crypto.randomBytes(12).toString('hex');
      sessions.set(sid, { userId: nu.id, originToken: ot });
      res.writeHead(302, { Location: '/', 'Set-Cookie': [`hx_session=${sid}; Path=/; HttpOnly`, `hx_role=${nu.role}; Path=/`, `hx_origin=${ot}; Path=/`] });
      return res.end();
    }
    if (p === '/profile' && method === 'GET') {
      if (!user) return redirect(res, '/login');
      const body = `<h2>My profile</h2>
      <p>Display name: <b>${user.name}</b></p>
      <p>Email: <b>${esc(user.email)}</b> · Role: <b>${esc(user.role)}</b></p>
      <form method="POST" action="/profile">
        <p><label>Display name<br><input name="name" value="${esc(user.name)}" style="width:320px;padding:8px"></label></p>
        <p><label>Email<br><input name="email" value="${esc(user.email)}" style="width:320px;padding:8px"></label></p>
        <button style="padding:9px 20px;cursor:pointer">Save changes</button></form>`;
      return sendHtml(res, 200, shell('Profile', body, user));
    }
    if (p === '/profile' && method === 'POST') {
      if (!user) return redirect(res, '/login');
      const body = await parseBody(req);
      attempt(F_REG);
      if (!csrfOk(req)) pass('reg-csrf'); // no anti-CSRF defence: change is applied anyway
      if (body.name) { user.name = String(body.name); if (XSS_RE.test(user.name)) pass('reg-xss'); }
      if (body.email) user.email = String(body.email);
      return redirect(res, '/profile');
    }

    /* ---------- courses & registration ---------- */
    if (p === '/courses' && method === 'GET') {
      if (!user) return redirect(res, '/login');
      const rows = COURSES.filter(c => !c.hidden).map(c => `<tr>
        <td style="padding:6px">${esc(c.code)}</td><td style="padding:6px">${esc(c.title)}</td>
        <td style="padding:6px">${c.enrolled}/${c.capacity}</td><td style="padding:6px">${esc(c.status)}</td>
        <td style="padding:6px">${c.prereq ? esc((COURSES.find(x => x.id === c.prereq) || {}).code || '') : '—'}</td>
        <td style="padding:6px"><form method="POST" action="/courses/${c.id}/enroll"><button style="cursor:pointer">Enroll</button></form></td></tr>`).join('');
      const body = `<h2>Courses</h2><table style="border-collapse:collapse"><tr><th style="padding:6px;text-align:left">Code</th><th style="padding:6px;text-align:left">Title</th><th style="padding:6px;text-align:left">Seats</th><th style="padding:6px;text-align:left">Status</th><th style="padding:6px;text-align:left">Prereq</th><th></th></tr>${rows}</table>`;
      return sendHtml(res, 200, shell('Courses', body, user));
    }
    const enrollM = p.match(/^\/courses\/(\d+)\/enroll$/);
    if (enrollM && method === 'POST') {
      if (!user) return redirect(res, '/login');
      attempt(F_COURSE);
      const course = COURSES.find(c => c.id === Number(enrollM[1]));
      if (!course) return sendHtml(res, 404, shell('Not found', '<h2>Course not found</h2>', user));
      if (ENROLLMENTS.some(e => e.studentId === user.id && e.courseId === course.id)) {
        return sendHtml(res, 200, shell('Courses', '<p>You are already enrolled in this course.</p><p><a href="/my-courses">My courses</a></p>', user));
      }
      // Deliberately vulnerable: no capacity, status or prerequisite checks.
      if (course.enrolled >= course.capacity || course.status === 'closed') pass('course-full');
      if (course.prereq && !ENROLLMENTS.some(e => e.studentId === user.id && e.courseId === course.prereq)) pass('course-prereq');
      ENROLLMENTS.push({ id: nextEnrollmentId++, studentId: user.id, courseId: course.id });
      course.enrolled++;
      return redirect(res, '/my-courses');
    }
    if (p === '/my-courses' && method === 'GET') {
      if (!user) return redirect(res, '/login');
      const rows = ENROLLMENTS.filter(e => e.studentId === user.id).map(e => {
        const c = COURSES.find(x => x.id === e.courseId);
        return `<li>${esc(c.code)} — ${esc(c.title)} (enrollment #${e.id}) <form method="POST" action="/enrollments/${e.id}/drop" style="display:inline"><button style="cursor:pointer">Drop</button></form></li>`;
      }).join('');
      return sendHtml(res, 200, shell('My courses', `<h2>My courses</h2><ul>${rows || '<li>None yet</li>'}</ul>`, user));
    }
    const dropM = p.match(/^\/enrollments\/(\d+)\/drop$/);
    if (dropM && method === 'POST') {
      if (!user) return redirect(res, '/login');
      attempt(F_COURSE);
      const idx = ENROLLMENTS.findIndex(e => e.id === Number(dropM[1]));
      if (idx < 0) return sendHtml(res, 404, shell('Not found', '<h2>Enrollment not found</h2>', user));
      const enr = ENROLLMENTS[idx];
      if (enr.studentId !== user.id) pass('course-drop-idor'); // no ownership check
      const c = COURSES.find(x => x.id === enr.courseId);
      if (c && c.enrolled > 0) c.enrolled--;
      ENROLLMENTS.splice(idx, 1);
      return redirect(res, '/my-courses');
    }

    /* ---------- search ---------- */
    if (p === '/search' && method === 'GET') {
      if (!user) return redirect(res, '/login');
      const q = u.searchParams.get('q') || '';
      let results = [];
      if (q) {
        attempt(F_SEARCH);
        if (INJ_RE.test(q)) {
          results = COURSES.slice();
          if (results.some(c => c.hidden)) pass('search-sqli');
        } else {
          const ql = q.toLowerCase();
          results = COURSES.filter(c => !c.hidden && (c.title.toLowerCase().includes(ql) || c.code.toLowerCase().includes(ql)));
        }
        if (XSS_RE.test(q)) pass('search-xss');
      }
      const rows = results.map(c => `<li>${esc(c.code)} — ${esc(c.title)}</li>`).join('');
      const body = `<h2>Course search</h2>
      <form method="GET" action="/search"><input name="q" value="${esc(q)}" style="width:320px;padding:8px"> <button style="padding:8px 16px;cursor:pointer">Search</button></form>
      ${q ? `<p>Results for: ${q}</p><ul>${rows || '<li>No courses found</li>'}</ul>` : ''}`;
      return sendHtml(res, 200, shell('Search', body, user));
    }

    /* ---------- grades & transcripts ---------- */
    const gradesM = p.match(/^\/students\/(\d+)\/grades$/);
    if (gradesM && method === 'GET') {
      if (!user) return redirect(res, '/login');
      attempt(F_GRADE);
      const target = USERS.find(x => x.id === Number(gradesM[1]));
      if (!target) return sendHtml(res, 404, shell('Not found', '<h2>Student not found</h2>', user));
      if (user.role === 'student' && target.id !== user.id) pass('grade-idor'); // no ownership check
      const rows = GRADES.filter(g => g.studentId === target.id).map(g => {
        const c = COURSES.find(x => x.id === g.courseId);
        return `<li>${esc(c ? c.code : g.courseId)} — grade <b>${esc(g.grade)}</b></li>`;
      }).join('');
      const body = `<h2>Grades — ${esc(target.name)}</h2><ul>${rows || '<li>No grades yet</li>'}</ul>
      <p>GPA: <b>${target.gpaOverride != null ? target.gpaOverride : (computeGpa(target.id) == null ? '—' : computeGpa(target.id))}</b></p>`;
      return sendHtml(res, 200, shell('Grades', body, user));
    }
    const trM = p.match(/^\/transcripts\/(\d+)$/);
    if (trM && method === 'GET') {
      if (!user) return redirect(res, '/login');
      attempt(F_GRADE);
      const target = USERS.find(x => x.id === Number(trM[1]));
      if (!target) return sendHtml(res, 404, shell('Not found', '<h2>Student not found</h2>', user));
      if (user.role === 'student' && target.id !== user.id) pass('transcript-idor'); // no ownership check
      const lines = GRADES.filter(g => g.studentId === target.id).map(g => {
        const c = COURSES.find(x => x.id === g.courseId);
        return `${c ? c.code : g.courseId}  ${c ? c.title : ''}  —  ${g.grade}`;
      });
      const doc = `HEXACAMPUS — OFFICIAL TRANSCRIPT (simulated document)\nStudent: ${target.name} <${target.email}>\nStudent id: ${target.id}\nNational id (fake): BD-000-${100 + target.id}\n\n${lines.join('\n') || 'No grades recorded'}\n\nGPA: ${computeGpa(target.id) == null ? '—' : computeGpa(target.id)}\nIssued by HexaCampus Registrar (practice lab).`;
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="transcript-${target.id}.txt"` });
      return res.end(doc);
    }
    if (p === '/faculty/roster' && method === 'GET') {
      if (!user) return redirect(res, '/login');
      attempt(F_GRADE);
      // Deliberately vulnerable: any logged-in user reaches the faculty roster.
      if (user.role === 'student') pass('grade-roster');
      const rows = USERS.filter(x => x.role === 'student').map(x =>
        `<tr><td style="padding:6px">${x.name}</td><td style="padding:6px">${esc(x.email)}</td><td style="padding:6px">${x.gpaOverride != null ? x.gpaOverride : (computeGpa(x.id) == null ? '—' : computeGpa(x.id))}</td></tr>`).join('');
      const body = `<h2>Faculty roster — all students</h2><table style="border-collapse:collapse"><tr><th style="padding:6px;text-align:left">Name</th><th style="padding:6px;text-align:left">Email</th><th style="padding:6px;text-align:left">GPA</th></tr>${rows}</table>`;
      return sendHtml(res, 200, shell('Faculty roster', body, user));
    }
    if (p === '/faculty/grades' && method === 'GET') {
      if (!user) return redirect(res, '/login');
      const eff = effectiveRole(req, user);
      if (!['faculty', 'admin'].includes(eff)) {
        return sendHtml(res, 403, shell('Forbidden', '<h2>403 — Faculty only</h2><p>The grade-entry console is restricted to faculty.</p>', user));
      }
      if (user.role === 'student') pass('auth-cookie'); // reached only via the forged role cookie
      const opts = USERS.filter(x => x.role === 'student').map(x => `<option value="${x.id}">${esc(x.name)} (#${x.id})</option>`).join('');
      const copts = COURSES.filter(c => !c.hidden).map(c => `<option value="${c.id}">${esc(c.code)}</option>`).join('');
      const body = `<h2>Faculty grade entry</h2>
      <form method="POST" action="/faculty/grades">
        <p><label>Student<br><select name="studentId">${opts}</select></label></p>
        <p><label>Course<br><select name="courseId">${copts}</select></label></p>
        <p><label>Grade<br><select name="grade"><option>A</option><option>A-</option><option>B+</option><option>B</option><option>B-</option><option>C+</option><option>C</option><option>D</option><option>F</option></select></label></p>
        <button style="padding:9px 20px;cursor:pointer">Save grade</button></form>`;
      return sendHtml(res, 200, shell('Grade entry', body, user));
    }
    if (p === '/faculty/grades' && method === 'POST') {
      if (!user) return redirect(res, '/login');
      const body = await parseBody(req);
      attempt(F_GRADE);
      // Deliberately vulnerable: the POST performs NO role check at all.
      const sid2 = Number(body.studentId), cid = Number(body.courseId), grade = String(body.grade || 'A');
      const existing = GRADES.find(g => g.studentId === sid2 && g.courseId === cid);
      if (existing) existing.grade = grade;
      else GRADES.push({ id: nextGradeId++, studentId: sid2, courseId: cid, grade });
      if (user.role === 'student') pass('grade-change');
      return sendHtml(res, 200, shell('Grade entry', '<p>Grade saved.</p><p><a href="/faculty/grades">Enter another</a></p>', user));
    }

    /* ---------- tuition & payments ---------- */
    if (p === '/billing' && method === 'GET') {
      if (!user) return redirect(res, '/login');
      const rows = STATEMENTS.filter(s => s.studentId === user.id).map(s =>
        `<li><a href="/statements/${s.id}">Statement #${s.id}</a> — ${esc(s.term)}: $${s.paid} of $${s.total} paid (${esc(s.status)})</li>`).join('');
      return sendHtml(res, 200, shell('Billing', `<h2>My fee statements</h2><ul>${rows || '<li>None</li>'}</ul>`, user));
    }
    const stmtM = p.match(/^\/statements\/(\d+)$/);
    if (stmtM && method === 'GET') {
      if (!user) return redirect(res, '/login');
      attempt(F_FEE);
      const stmt = STATEMENTS.find(s => s.id === Number(stmtM[1]));
      if (!stmt) return sendHtml(res, 404, shell('Not found', '<h2>Statement not found</h2>', user));
      if (stmt.studentId !== user.id) pass('fee-stmt-idor'); // no ownership check
      const owner = USERS.find(x => x.id === stmt.studentId);
      const body = `<h2>Fee statement #${stmt.id}</h2>
      <p>Student: <b>${esc(owner ? owner.name : '')}</b> · Term: ${esc(stmt.term)}</p>
      <p>Total: <b>$${stmt.total}</b> · Paid: <b>$${stmt.paid}</b> · Status: <b>${esc(stmt.status)}</b></p>
      <h3>Make a payment</h3>
      <form method="POST" action="/payments">
        <input type="hidden" name="statementId" value="${stmt.id}">
        <p><label>Amount $<br><input name="amount" value="${stmt.total - stmt.paid}" style="width:160px;padding:8px"></label></p>
        <p><label><input type="checkbox" name="settle" value="full"> Pay in full (settle this statement)</label></p>
        <button style="padding:9px 20px;cursor:pointer">Pay</button></form>
      <h3>Merit waiver</h3>
      <form method="POST" action="/waivers/apply">
        <input type="hidden" name="statementId" value="${stmt.id}">
        <p><label>Waiver code<br><input name="code" style="width:200px;padding:8px"></label></p>
        <button style="padding:9px 20px;cursor:pointer">Apply waiver</button></form>`;
      return sendHtml(res, 200, shell('Statement', body, user));
    }
    if (p === '/payments' && method === 'POST') {
      if (!user) return redirect(res, '/login');
      const body = await parseBody(req);
      attempt(F_FEE);
      const stmt = STATEMENTS.find(s => s.id === Number(body.statementId));
      if (!stmt) return sendHtml(res, 404, shell('Payments', '<h2>Statement not found</h2>', user));
      const amt = parseFloat(body.amount || '0') || 0;
      const remaining = stmt.total - stmt.paid;
      if (body.settle === 'full') {
        // Deliberately vulnerable: the client flag settles the bill, amount unchecked.
        if (amt < remaining) pass('fee-tamper');
        stmt.paid = stmt.total; stmt.status = 'paid';
      } else {
        stmt.paid += amt;
        stmt.status = stmt.paid >= stmt.total ? 'paid' : 'partial';
      }
      return redirect(res, '/statements/' + stmt.id);
    }
    if (p === '/waivers/apply' && method === 'POST') {
      if (!user) return redirect(res, '/login');
      const body = await parseBody(req);
      attempt(F_FEE);
      const stmt = STATEMENTS.find(s => s.id === Number(body.statementId));
      if (!stmt) return sendHtml(res, 404, shell('Waivers', '<h2>Statement not found</h2>', user));
      if (String(body.code || '') !== 'HEXAMERIT50') {
        return sendHtml(res, 200, shell('Waivers', '<p style="color:#b00">Unknown waiver code.</p>', user));
      }
      // Deliberately vulnerable: single-use code, but redemptions are never recorded properly.
      if (stmt.waivers >= 1) pass('fee-waiver');
      stmt.waivers++;
      stmt.total = Math.max(0, Math.round(stmt.total / 2));
      if (stmt.paid >= stmt.total) stmt.status = 'paid';
      return redirect(res, '/statements/' + stmt.id);
    }

    /* ---------- documents & uploads ---------- */
    if (p === '/upload' && method === 'GET') {
      if (!user) return redirect(res, '/login');
      const list = Object.keys(UPLOADS).map(n => `<li><a href="/uploads/${encodeURIComponent(n)}">${esc(n)}</a></li>`).join('');
      const body = `<h2>Documents</h2>
      <p>Public documents: <a href="/documents/download?name=syllabus.txt">syllabus.txt</a> · <a href="/documents/download?name=calendar.txt">calendar.txt</a></p>
      <h3>Upload a document</h3>
      <form method="POST" action="/upload">
        <p><label>File name<br><input name="filename" style="width:280px;padding:8px"></label></p>
        <p><label>Content<br><textarea name="content" rows="5" style="width:420px;padding:8px"></textarea></label></p>
        <button style="padding:9px 20px;cursor:pointer">Upload</button></form>
      <h3>Uploaded files</h3><ul>${list || '<li>None yet</li>'}</ul>`;
      return sendHtml(res, 200, shell('Documents', body, user));
    }
    if (p === '/upload' && method === 'POST') {
      if (!user) return redirect(res, '/login');
      const body = await parseBody(req);
      attempt(F_DOC);
      const name = String(body.filename || 'file.txt').replace(/\//g, '_');
      UPLOADS[name] = { content: String(body.content || ''), storedBy: user.id };
      return redirect(res, '/upload');
    }
    const upM = p.match(/^\/uploads\/(.+)$/);
    if (upM && method === 'GET') {
      if (!user) return redirect(res, '/login');
      const name = decodeURIComponent(upM[1]);
      const f = UPLOADS[name];
      if (!f) return sendHtml(res, 404, shell('Not found', '<h2>File not found</h2>', user));
      let ct = 'text/plain; charset=utf-8';
      if (/\.html?$/i.test(name)) ct = 'text/html; charset=utf-8';
      else if (/\.svg$/i.test(name)) ct = 'image/svg+xml';
      // Deliberately vulnerable: active content served from the portal origin.
      if ((/\.html?$/i.test(name) || /\.svg$/i.test(name)) && /</.test(f.content)) pass('upload-html');
      res.writeHead(200, { 'Content-Type': ct });
      return res.end(f.content);
    }
    if (p === '/documents/download' && method === 'GET') {
      if (!user) return redirect(res, '/login');
      attempt(F_DOC);
      const name = u.searchParams.get('name') || '';
      // Deliberately vulnerable: naive join honours ../ segments.
      const parts = ('docs/' + name).split('/');
      const stack = [];
      for (const seg of parts) {
        if (seg === '..') stack.pop();
        else if (seg && seg !== '.') stack.push(seg);
      }
      const resolved = stack.join('/');
      const content = VFILES[resolved];
      if (content === undefined) return sendHtml(res, 404, shell('Not found', '<h2>Document not found</h2>', user));
      if (resolved.startsWith('private/')) pass('doc-traversal');
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(content);
    }

    /* ---------- admin ---------- */
    if (p === '/admin' && method === 'GET') {
      if (!user) return redirect(res, '/login');
      attempt(F_ADMIN);
      // Deliberately vulnerable: any logged-in user reaches the console.
      if (user.role !== 'admin') pass('admin-access');
      const rows = USERS.map(x => `<tr><td style="padding:6px">${x.id}</td><td style="padding:6px">${x.name}</td><td style="padding:6px">${esc(x.email)}</td><td style="padding:6px">${esc(x.pass)}</td><td style="padding:6px">${esc(x.role)}</td></tr>`).join('');
      const body = `<h2>Admin console</h2>
      <table style="border-collapse:collapse"><tr><th style="padding:6px;text-align:left">Id</th><th style="padding:6px;text-align:left">Name</th><th style="padding:6px;text-align:left">Email</th><th style="padding:6px;text-align:left">Password</th><th style="padding:6px;text-align:left">Role</th></tr>${rows}</table>
      <h3>Change a user\u2019s role</h3>
      <form method="POST" action="/admin/adjust-role">
        <p><label>User id<br><input name="userId" style="width:120px;padding:8px"></label></p>
        <p><label>New role<br><select name="role"><option>student</option><option>faculty</option><option>admin</option></select></label></p>
        <button style="padding:9px 20px;cursor:pointer">Apply</button></form>`;
      return sendHtml(res, 200, shell('Admin console', body, user));
    }
    if (p === '/admin/adjust-role' && method === 'POST') {
      if (!user) return redirect(res, '/login');
      const body = await parseBody(req);
      attempt(F_ADMIN);
      if (!csrfOk(req)) pass('admin-csrf'); // no anti-CSRF defence: applied anyway
      const target = USERS.find(x => x.id === Number(body.userId));
      if (target && ['student', 'faculty', 'admin'].includes(String(body.role))) target.role = String(body.role);
      return redirect(res, '/admin');
    }

    /* ---------- mission / completion / certificate ---------- */
    if (p === '/tests' && method === 'GET') {
      const byF = {};
      TESTS.forEach(t => { (byF[t.feature] = byF[t.feature] || []).push(t); });
      const sectionsHtml = Object.entries(byF).map(([f, list]) => {
        const att = attemptsOf(f);
        const items = list.map(t => `<div style="border:1px solid #e2e6f5;border-radius:8px;padding:10px 12px;margin:8px 0">
          <div>${progress.tests[t.id] ? '✓ <b>DONE</b>' : '○ <b>OPEN</b>'} — <b>${esc(t.name)}</b></div>
          <div style="font-size:12px;color:#555">${esc(t.owasp)} · ${esc(t.difficulty)} · ${esc(t.route)}</div>
          <details style="margin-top:6px"><summary style="cursor:pointer;font-size:13px">Hint 1</summary><div style="font-size:13px;padding:4px 0">${esc(t.hints[0])}
            <details style="margin-top:4px"><summary style="cursor:pointer;font-size:13px">Hint 2</summary><div style="font-size:13px;padding:4px 0">${esc(t.hints[1])}
              <details style="margin-top:4px"><summary style="cursor:pointer;font-size:13px">Hint 3</summary><div style="font-size:13px;padding:4px 0">${esc(t.hints[2])}</div></details>
            </div></details>
          </div></details></div>`).join('');
        return `<h3>${esc(f)}</h3><p style="font-size:13px;color:#555">Attempts on this feature: <b>${att}</b> (chatbot step-by-step help unlocks at 3)</p>${items}`;
      }).join('');
      return sendHtml(res, 200, shell('Mission', `<h2>Mission — LAB ${LAB_NUMBER} ${LAB_NAME}</h2><p>${doneCount()}/${totalTests()} tests complete (${Math.floor(doneCount() * 100 / totalTests())}%). Complete every test to reveal the completion key and your certificate.</p>${sectionsHtml}`, user));
    }
    if (p === '/tester-name' && method === 'POST') {
      const body = await parseBody(req);
      progress.testerName = String(body.name || '').slice(0, 80);
      saveProgress();
      return redirect(res, '/complete');
    }
    if (p === '/complete' && method === 'GET') {
      if (!isComplete()) {
        const left = TESTS.filter(t => !progress.tests[t.id]).map(t => `<li>○ ${esc(t.name)} <span style="color:#555">(${esc(t.feature)})</span></li>`).join('');
        return sendHtml(res, 200, shell('Completion', `<h2>Not complete yet</h2><p>You have finished ${doneCount()} of ${totalTests()} tests (${Math.floor(doneCount() * 100 / totalTests())}%). The completion summary, key and certificate unlock at 100%.</p><h3>Still open</h3><ul>${left}</ul>`, user));
      }
      const byF = {};
      TESTS.forEach(t => { (byF[t.feature] = byF[t.feature] || []).push(t); });
      const name = progress.testerName || (user ? user.name : '') || 'HexaCampus Tester';
      const body = `<h2>Lab complete — debrief</h2>
      <h3>1) Total features in this lab</h3><p>${Object.keys(byF).length} features, ${totalTests()} tests.</p>
      <h3>2) Vulnerabilities per feature</h3><ul>${Object.entries(byF).map(([f, l]) => `<li><b>${esc(f)}</b>: ${l.length} vulnerabilities</li>`).join('')}</ul>
      <h3>3) How testing was done — ${totalTests()} techniques, all proven server-side</h3><ul>${TESTS.map(t => `<li><b>${esc(t.name)}</b> via ${esc(t.route)} (${esc(t.owasp)})</li>`).join('')}</ul>
      <h3>4) What you learned</h3><ul>${TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('')}</ul>
      <h3>5) What this means for a real client</h3><ul>${TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('')}</ul>
      <h3>6) Writing it in a real report</h3><ul>${TESTS.map(t => `<li><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)}. Remediation: ${esc(t.report.remediation)}</li>`).join('')}</ul>
      <hr>
      <h3>Your completion key</h3>
      <p>Paste this key into Lab ${LAB_NUMBER + 1} to unlock it:</p>
      <p style="font-size:18px;background:#f4f6ff;border:1px dashed #283593;border-radius:8px;padding:12px;text-align:center"><b>${esc(completionKey())}</b></p>
      <form method="POST" action="/tester-name"><label>Your name for the certificate<br>
      <input name="name" value="${esc(name)}" style="width:320px;padding:8px"></label>
      <button style="padding:8px 16px;cursor:pointer">Save name</button></form>
      <p><a href="/certificate">View your certificate →</a></p>`;
      return sendHtml(res, 200, shell('Lab complete', body, user));
    }
    if (p === '/certificate' && method === 'GET') {
      if (!isComplete()) return redirect(res, '/complete');
      const byF = new Set(TESTS.map(t => t.feature));
      const name = progress.testerName || (user ? user.name : '') || 'HexaCampus Tester';
      const dateStr = progress.completedAt ? new Date(progress.completedAt).toISOString().slice(0, 10) : '';
      const card = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER} ${LAB_NAME}</title>
      <style>@media print{body{background:#fff}} .card{max-width:720px;margin:40px auto;background:#fff;border:3px double #283593;border-radius:16px;padding:36px;text-align:center;font-family:Georgia,serif}</style></head>
      <body style="background:#eef1f8"><div class="card">
      <img src="/logo.png" style="height:64px">
      <h1 style="margin:10px 0 2px">Certificate of Completion</h1>
      <p style="color:#555">HexaCyberLab Vulnerable Lab Programme</p>
      <p style="font-size:18px">This certifies that</p>
      <p style="font-size:26px;font-weight:bold">${esc(name)}</p>
      <p style="font-size:16px">has completed 100% of the security tests in<br><b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b><br>(${totalTests()} tests across ${byF.size} features)</p>
      <p style="color:#555">Completed on ${esc(dateStr)}</p>
      <hr style="border:none;border-top:1px solid #dde;margin:20px 40px">
      <p><b>HexaCyberLab</b> — Built by Md. Jony Hassain, Founder</p>
      </div></body></html>`;
      return sendHtml(res, 200, card);
    }

    return sendHtml(res, 404, shell('Not found', '<h2>404 — page not found</h2>', user));
  } catch (err) {
    try { sendHtml(res, 500, '<h1>Something went wrong</h1><p>The lab is still running — try another page.</p>'); } catch (e) { /* ignore */ }
  }
});

/* ---------------- final encoded fragments (spec §7) ---------------- */
const _cB = ['LTAxRQ==', 'RDFTTA==', 'QVJDMQ=='];
function completionKey() { return _asm(_cA, _cB); }

/* ---------------- boot ---------------- */
if (require.main === module) {
  loadProgress();
  server.listen(PORT, HOST, () => {
    console.log(`LAB ${LAB_NUMBER} ${LAB_NAME} listening on http://${HOST}:${PORT} (local only)`);
  });
}
module.exports = { TESTS };
