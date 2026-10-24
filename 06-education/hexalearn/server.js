'use strict';
/*
 * HexaLearn — LAB 51 (Category 6: Education & E-learning)
 * A deliberately vulnerable online learning platform for authorised,
 * local-only security training. Zero-dependency Node.js.
 * Built by Md. Jony Hassain, Founder of HexaCyberLab.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = 3060;
const HOST = '127.0.0.1';
const LAB_NUMBER = 51;
const LAB_NAME = 'HexaLearn';
const ROOT = __dirname;
const STATE_FILE = path.join(ROOT, 'progress.json');

/* ------------------------------------------------------------------ *
 * Completion/entry keys live ONLY as scattered, transformed shards.
 * Each shard is base64(reverse(piece)); the assembler below rebuilds
 * a key at runtime, only at the moment it is legitimately needed.
 * ------------------------------------------------------------------ */
const ENTRY_SHARDS_A = ["TC1YSA==","UC0xNQ==","TUdTNQ=="];
const COMP_SHARDS_A = ["TC1YSA==","Ry0yNQ==","MU4xNg=="];
const ENTRY_SHARDS_B = ["LUhGUw==","WlNIMA==","WFlMUw=="];
const COMP_SHARDS_B = ["LVFNSA==","UkI5Vw==","SU02UQ=="];
function unshard(shards) {
  return shards.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}
function entryKey() { return unshard(ENTRY_SHARDS_A.concat(ENTRY_SHARDS_B)); }
function completionKey() { return unshard(COMP_SHARDS_A.concat(COMP_SHARDS_B)); }

/* ------------------------------ state ------------------------------ */
let state = null;
function defaultState() {
  return { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
}
function loadState() {
  if (state) return state;
  try { state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch (e) { state = defaultState(); }
  if (!state.tests) state.tests = {};
  if (!state.attempts) state.attempts = {};
  return state;
}
function saveState() {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2)); } catch (e) {}
}
function attempt(feature) {
  const st = loadState();
  st.attempts[feature] = (st.attempts[feature] || 0) + 1;
  saveState();
}
function pass(id) {
  const st = loadState();
  if (!st.tests[id]) {
    st.tests[id] = true;
    const total = TESTS.length;
    const done = TESTS.filter(t => st.tests[t.id]).length;
    if (done >= total && !st.keyRevealed) {
      st.keyRevealed = true;
      st.completedAt = new Date().toISOString();
    }
    saveState();
  }
}
function doneCount() { const st = loadState(); return TESTS.filter(t => st.tests[t.id]).length; }
function isComplete() { return doneCount() >= TESTS.length; }

/* --------------------------- seed data ----------------------------- */
const users = [
  { id: 1, name: 'Platform Admin', email: 'admin@hexalearn.local', password: 'admin123', role: 'admin', credit: 0 },
  { id: 2, name: 'Irene Instructor', email: 'irene@hexalearn.local', password: 'teach123', role: 'instructor', credit: 0, earnings: 480 },
  { id: 3, name: 'Henry Instructor', email: 'henry@hexalearn.local', password: 'teach456', role: 'instructor', credit: 0, earnings: 150 },
  { id: 4, name: 'Alice Student', email: 'alice@hexalearn.local', password: 'alice123', role: 'student', credit: 20 },
  { id: 5, name: 'Bob Student', email: 'bob@hexalearn.local', password: 'bob123', role: 'student', credit: 0 },
  { id: 6, name: 'Demo Learner', email: 'demo@hexalearn.local', password: 'demo1234', role: 'student', credit: 5 }
];
let nextUserId = 7;
const courses = [
  { id: 1, title: 'Web Security Basics', category: 'Security', price: 50, instructorId: 2,
    lessons: [{ id: 11, title: 'How the web works' }, { id: 12, title: 'Common web flaws' }, { id: 13, title: 'Safe testing habits' }],
    quiz: [{ q: 'What does XSS stand for?', options: ['Cross-Site Scripting', 'Extra Secure Server', 'XML Style Sheet'], answer: 0 },
           { q: 'Which header helps prevent clickjacking?', options: ['X-Frame-Options', 'Server', 'ETag'], answer: 0 }] },
  { id: 2, title: 'Python for Beginners', category: 'Programming', price: 0, instructorId: 2,
    lessons: [{ id: 21, title: 'Installing Python' }, { id: 22, title: 'Variables and loops' }],
    quiz: [{ q: 'Which keyword defines a function?', options: ['def', 'fun', 'proc'], answer: 0 }] },
  { id: 3, title: 'Advanced Pentesting', category: 'Security', price: 120, instructorId: 3,
    lessons: [{ id: 31, title: 'Recon methodology' }, { id: 32, title: 'Exploitation workflow' }, { id: 33, title: 'Reporting like a pro' }],
    quiz: [{ q: 'First phase of a pentest engagement?', options: ['Scoping & recon', 'Exploitation', 'Cover tracks'], answer: 0 }] },
  { id: 4, title: 'Data Science Intro', category: 'Data', price: 80, instructorId: 3,
    lessons: [{ id: 41, title: 'Data cleaning' }, { id: 42, title: 'Charts that lie' }],
    quiz: [{ q: 'Which library is used for dataframes?', options: ['pandas', 'requests', 'flask'], answer: 0 }] },
  { id: 5, title: 'Digital Marketing 101', category: 'Marketing', price: 40, instructorId: 2,
    lessons: [{ id: 51, title: 'Funnels' }, { id: 52, title: 'Email basics' }],
    quiz: [{ q: 'CTR stands for?', options: ['Click-Through Rate', 'Cost To Run', 'Customer Trust Rank'], answer: 0 }] },
  { id: 6, title: 'Legacy Systems Workshop', category: 'Programming', price: 60, instructorId: 3,
    lessons: [{ id: 61, title: 'Reading old code' }],
    quiz: [{ q: 'First step with legacy code?', options: ['Understand before changing', 'Rewrite everything', 'Delete tests'], answer: 0 }] }
];
const enrollments = [
  { id: 1, userId: 5, courseId: 1, paidAmount: 50, coupon: null },
  { id: 2, userId: 4, courseId: 2, paidAmount: 0, coupon: null }
];
let nextEnrollId = 3;
const lessonDone = { '5:1': [11] };           // "userId:courseId" -> [lessonIds]
const quizAttempts = [];                        // {userId, courseId, score, passed}
const reviews = [ { id: 1, courseId: 1, userId: 5, text: 'Great intro course, clear lessons.' } ];
let nextReviewId = 2;
const certificates = [];                        // {id, userId, courseId, code}
let nextCertId = 1;
const payouts = [];                             // {id, instructorId, amount, status}
let nextPayoutId = 1;
const couponUses = [];                          // {userId, code}
const COUPONS = { WELCOME50: 50 };              // intended: single-use per student
const issuedResetTokens = new Set();
const failedLogins = {};                        // email -> count
const forgotProbes = {};                        // anonId -> Set of emails
const sessions = new Map();                     // sid -> userId
let nextSid = 1;

function resetTokenFor(user) { return 'HL-' + ((user.id * 9973 + 12345).toString(36)).toUpperCase(); }
function userById(id) { return users.find(u => u.id === id); }
function courseById(id) { return courses.find(c => c.id === id); }
function isEnrolled(userId, courseId) { return enrollments.some(e => e.userId === userId && e.courseId === courseId); }
function courseProgress(userId, course) {
  const done = (lessonDone[userId + ':' + course.id] || []).length;
  return { done, total: course.lessons.length, pct: course.lessons.length ? Math.floor(done / course.lessons.length * 100) : 0 };
}
function quizPassed(userId, courseId) { return quizAttempts.some(a => a.userId === userId && a.courseId === courseId && a.passed); }

/* ------------- tiny string-built "SQL" evaluator ------------------- *
 * The app builds SQL by string concatenation (the flaw). This mini
 * evaluator executes just enough SQL to make the injection real.     */
function tokenizeSql(sql) {
  const toks = []; let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    if (ch === ' ' || ch === '\t' || ch === '\n') { i++; continue; }
    if (ch === '-' && sql[i + 1] === '-') { break; } // -- comment to end
    if (ch === "'") { let j = i + 1, s = ''; while (j < sql.length && sql[j] !== "'") { s += sql[j]; j++; } toks.push({ t: 'str', v: s }); i = j + 1; continue; }
    if (/[0-9]/.test(ch)) { let j = i, s = ''; while (j < sql.length && /[0-9]/.test(sql[j])) { s += sql[j]; j++; } toks.push({ t: 'num', v: parseInt(s, 10) }); i = j; continue; }
    if (ch === '=') { toks.push({ t: 'op', v: '=' }); i++; continue; }
    if (/[A-Za-z_]/.test(ch)) { let j = i, s = ''; while (j < sql.length && /[A-Za-z0-9_]/.test(sql[j])) { s += sql[j]; j++; } const up = s.toUpperCase(); if (up === 'AND' || up === 'OR' || up === 'LIKE') toks.push({ t: 'kw', v: up }); else toks.push({ t: 'ident', v: s }); i = j; continue; }
    i++;
  }
  return toks;
}
function evalWhere(row, where) {
  const toks = tokenizeSql(where); let pos = 0;
  function peek() { return toks[pos]; }
  function operand() {
    const tk = toks[pos++];
    if (!tk) return '';
    if (tk.t === 'str') return tk.v;
    if (tk.t === 'num') return tk.v;
    if (tk.t === 'ident') return row[tk.v] !== undefined ? row[tk.v] : '';
    return '';
  }
  function likeMatch(value, pattern) {
    const re = new RegExp('^' + String(pattern).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i');
    return re.test(String(value));
  }
  function cmp() {
    const left = operand();
    const tk = peek();
    if (tk && (tk.t === 'op' || (tk.t === 'kw' && tk.v === 'LIKE'))) {
      pos++; const right = operand();
      if (tk.t === 'kw') return likeMatch(left, right);
      return String(left) === String(right);
    }
    return !!left;
  }
  function andExpr() { let v = cmp(); while (peek() && peek().t === 'kw' && peek().v === 'AND') { pos++; const r = cmp(); v = v && r; } return v; }
  function orExpr() { let v = andExpr(); while (peek() && peek().t === 'kw' && peek().v === 'OR') { pos++; const r = andExpr(); v = v || r; } return v; }
  try { return orExpr(); } catch (e) { return false; }
}
function runQuery(rows, where) { return rows.filter(r => evalWhere(r, where)); }
function looksInjected(s) { return /('|--|;|\bOR\b|\bAND\b|\bUNION\b)/i.test(String(s || '')); }
function looksXss(s) { return /(<script|<svg|<img[^>]*onerror|onerror\s*=|onload\s*=|<iframe|javascript:)/i.test(String(s || '')); }

/* --------------------------- TESTS registry ------------------------ */
const TESTS = [
  /* ---- Login & Authentication ---- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL injection login bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login builds its query by gluing your input into a string.', "Try a quote in the email field and see how the error/behaviour changes.", "Email: ' OR '1'='1' OR '1'='2 with any password logs you in as the first account."],
    lesson: 'String-built SQL lets attacker input change the query logic itself — authentication falls without knowing any password.',
    impact: 'On a real client site this means full account takeover, including admin, from the public login form — the most damaging class of finding a login page can have.',
    report: { title: 'SQL Injection in Login Form (Authentication Bypass)', severity: 'Critical', remediation: 'Use parameterised queries/prepared statements everywhere; never concatenate user input into SQL.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute force — no rate limit or lockout', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Keep guessing the same account\'s password. Does anything ever slow you down?', 'Try 10 wrong passwords in a row for alice@hexalearn.local.', 'The 10th failure is processed exactly like the 1st — no throttle, no lockout, no CAPTCHA.'],
    lesson: 'Without throttling, an attacker can try unlimited passwords against any account; weak passwords fall quickly.',
    impact: 'A client\'s customers get credential-stuffed or brute-forced silently — account takeovers, fraud and support chaos follow.',
    report: { title: 'Missing Brute-Force Protection on Login', severity: 'High', remediation: 'Add progressive rate limiting, lockout/backoff and breached-password checks on authentication endpoints.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User enumeration via login & forgot-password', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the message for an email that exists vs one that does not.', 'The forgot-password form answers differently too.', 'Probe 5+ different emails on /forgot — the app happily confirms which ones are real accounts.'],
    lesson: 'Different responses for real vs fake accounts hand attackers a verified target list for phishing and password attacks.',
    impact: 'Attackers harvest the client\'s real user list and focus credential attacks only on accounts that exist — far higher success rate.',
    report: { title: 'Account Enumeration via Differential Responses', severity: 'Medium', remediation: 'Return identical, generic messages for existing and non-existing accounts on login and password-reset flows.' } },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Published demo account with default credentials', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Read the login page carefully — it advertises a way in.', 'The demo credentials are printed right on the page.', 'Log in as demo@hexalearn.local with the password shown on the login page.'],
    lesson: 'Demo/default accounts ship with known passwords and are the first thing an attacker tries.',
    impact: 'A known-credential account is a free foothold inside the client\'s platform — attackers use it to explore everything an insider can see.',
    report: { title: 'Default/Demo Credentials Accepted', severity: 'High', remediation: 'Remove demo accounts from production or force unique strong passwords; never publish credentials on the login page.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable password-reset token', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a reset for your own account and look at the token format.', 'The token is derived from something public about the account.', 'Token = HL- + base36(user id × 9973 + 12345). Compute Bob\'s (id 5) and reset his password without any email.'],
    lesson: 'Reset tokens must be long, random and single-use; a token computed from a user id is an account-takeover formula.',
    impact: 'Anyone can reset any customer\'s password — including staff — with zero access to their inbox. Total account compromise at scale.',
    report: { title: 'Predictable Password Reset Token', severity: 'Critical', remediation: 'Generate reset tokens from a CSPRNG (≥128 bits), store hashed, expire quickly and invalidate after use.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Session/role cookie tampering', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['After logging in, look at the cookies the app trusts.', 'One cookie carries your role — and the server believes the browser.', 'Set the hx_role cookie to admin and visit /admin as a student.'],
    lesson: 'Authorisation data stored client-side is attacker-controlled; roles must live in the server-side session.',
    impact: 'Any student becomes an admin by editing a cookie — full platform control, every customer record exposed.',
    report: { title: 'Role Stored in Client-Side Cookie (Privilege Escalation)', severity: 'Critical', remediation: 'Keep roles in the server-side session only; never trust client-supplied role claims.' } },
  /* ---- Registration & Profile ---- */
  { id: 'reg-weakpw', feature: 'Registration & Profile', name: 'Weak password policy (1-character passwords)', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a new account with the shortest password you can.', 'Does the form demand length, numbers, anything?', 'A 1-character password is accepted — register with password "x".'],
    lesson: 'A password policy that accepts anything guarantees weak passwords across the whole user base.',
    impact: 'Customers pick trivial passwords that fall to the first dictionary an attacker tries — mass account takeover.',
    report: { title: 'No Minimum Password Strength Enforced', severity: 'Medium', remediation: 'Enforce ≥10–12 character passwords and screen against known-breached password lists.' } },
  { id: 'reg-mass', feature: 'Registration & Profile', name: 'Mass assignment — role & credit via registration', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The register form only shows name/email/password. The server may accept more.', 'What happens if you POST extra fields the form never offered?', 'POST /register with role=admin and credit=5000 — the account is created with both.'],
    lesson: 'Binding request bodies straight onto data models lets attackers set fields that were never meant to be user-controlled.',
    impact: 'Attackers mint themselves admin accounts or free credit balances at signup — privilege escalation and direct financial loss.',
    report: { title: 'Mass Assignment in Registration (Role/Credit)', severity: 'Critical', remediation: 'Whitelist bindable fields per endpoint; set role and balances server-side only.' } },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in display name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is shown back on many pages. Is it escaped?', 'Register with a name that is not really a name.', 'Use <script>alert(1)</script> as the display name — it is stored and rendered raw, including in the admin user list.'],
    lesson: 'Any user-supplied text rendered without encoding becomes stored XSS that fires in other users\' browsers.',
    impact: 'An attacker\'s payload runs in the admin\'s browser — session theft and actions performed as the admin.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-encode all user output and validate input; add a Content-Security-Policy as defence in depth.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on profile update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Profile update is a plain POST with no token. What proves the request came from this site?', 'The app sets an hx_origin marker cookie on its own pages — updates never check it.', 'POST /profile/update from a foreign Origin — the name change is accepted anyway.'],
    lesson: 'State-changing endpoints without anti-CSRF tokens can be triggered by any website the victim visits while logged in.',
    impact: 'A malicious page silently rewrites a victim\'s profile — the first step in social-engineering and account-recovery attacks.',
    report: { title: 'Cross-Site Request Forgery on Profile Update', severity: 'Medium', remediation: 'Require per-session anti-CSRF tokens on all state-changing requests and validate Origin/Referer.' } },
  /* ---- Search & Catalog ---- */
  { id: 'search-sqli', feature: 'Search & Catalog', name: 'SQL injection in course search', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Search also builds a string query — this time with LIKE patterns.', 'A quote breaks out of the pattern; a comment can end the query.', "Search for: %' OR 1=1 --  and every course in the catalogue comes back."],
    lesson: 'Every string-built query is injectable, not just login forms — search is a classic entry point.',
    impact: 'Attackers dump the client\'s entire catalogue/database through the search box, or bypass its logic entirely.',
    report: { title: 'SQL Injection in Course Search', severity: 'High', remediation: 'Parameterise all queries including LIKE searches; escape wildcards in user search terms.' } },
  { id: 'search-xss', feature: 'Search & Catalog', name: 'Reflected XSS in search results', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The results page repeats your search term back to you.', 'Is the echo encoded?', 'Search for <script>alert(1)</script> — it is reflected into the page unescaped.'],
    lesson: 'Reflecting input without encoding lets attackers craft links that run script in a victim\'s session.',
    impact: 'Phishing links on the client\'s own domain execute script as the victim — trusted-domain attacks convert extremely well.',
    report: { title: 'Reflected Cross-Site Scripting in Search', severity: 'Medium', remediation: 'Encode all reflected values on output; validate input length/character set.' } },
  /* ---- Enrollment & Payments ---- */
  { id: 'enroll-price', feature: 'Enrollment & Payments', name: 'Price tampering — enrol in a paid course for $0', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The enrol form posts a price field along with the course id.', 'Who decides what a course costs — the catalogue or your browser?', 'POST /enroll for a paid course with price=0 — you are enrolled, charged nothing.'],
    lesson: 'Prices must be looked up server-side at purchase time; a client-sent price is an invitation to pay nothing.',
    impact: 'Every paying customer can take the client\'s courses for free — direct, total revenue loss on digital products.',
    report: { title: 'Client-Side Price Tampering in Enrollment', severity: 'Critical', remediation: 'Ignore client-supplied prices; always price from the server-side catalogue at checkout.' } },
  { id: 'enroll-negative', feature: 'Enrollment & Payments', name: 'Negative price — buying a course pays YOU credit', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['If the server trusts the price for charging, what does a negative price do to your credit?', 'Watch your credit balance before and after.', 'POST /enroll with price=-50 — enrolment succeeds and your credit balance grows by 50.'],
    lesson: 'Missing server-side validation of amounts lets attackers invert a payment flow and mint value from nothing.',
    impact: 'Attackers generate unlimited store credit from the checkout itself — fraud that compounds with every other purchase flow.',
    report: { title: 'Negative Amount Accepted in Enrollment (Credit Minting)', severity: 'Critical', remediation: 'Validate amounts server-side (> 0, equals catalogue price) before applying balance changes.' } },
  { id: 'enroll-coupon', feature: 'Enrollment & Payments', name: 'Single-use coupon can be reused forever', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['WELCOME50 is meant to be used once per student. Is that checked anywhere?', 'Use it on one course. Then use it again on another.', 'The code keeps applying 50% off on every enrolment — redemption is recorded but never enforced.'],
    lesson: 'Promotions are business rules; if the server never checks redemption state, "single-use" is fiction.',
    impact: 'One leaked coupon code becomes a permanent 50% discount for everyone — margin destroyed across the whole catalogue.',
    report: { title: 'Coupon Reuse — Single-Use Restriction Not Enforced', severity: 'High', remediation: 'Check and record coupon redemption per user atomically before applying any discount.' } }
];

TESTS.push(
  /* ---- Lessons & Progress ---- */
  { id: 'progress-forge', feature: 'Lessons & Progress', name: 'Forge lesson completion without enrolling', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The progress endpoint marks lessons complete. What does it check first?', 'Does it verify you are enrolled — or even that you paid?', 'POST /api/progress/complete for a course you never enrolled in — the completion is recorded.'],
    lesson: 'Progress writes must verify enrollment and ownership server-side; otherwise course completion is whatever the client claims.',
    impact: 'Students skip paid content entirely and unlock certificates/credentials they never earned — the product\'s core value evaporates.',
    report: { title: 'Lesson Completion Forgery (No Enrollment Check)', severity: 'High', remediation: 'Verify an active enrollment and lesson sequence server-side before recording progress.' } },
  { id: 'progress-idor', feature: 'Lessons & Progress', name: 'IDOR — view any student\'s progress', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Student progress lives at /students/<id>/progress. Whose id can you put there?', 'Bob is user 5. You are not Bob.', 'Open /students/5/progress while logged in as Alice — his courses and completion are fully visible.'],
    lesson: 'Object URLs must check the requester owns (or may see) the object; sequential ids make guessing trivial.',
    impact: 'Every learner\'s record is exposed to every other learner — a privacy breach and a GDPR problem for the client.',
    report: { title: 'Insecure Direct Object Reference on Student Progress', severity: 'High', remediation: 'Authorise every object access against the session user; use unguessable identifiers as defence in depth.' } },
  /* ---- Quizzes & Scores ---- */
  { id: 'quiz-answers', feature: 'Quizzes & Scores', name: 'Quiz answers shipped to the browser', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The quiz is loaded from /api/quiz/<courseId> as JSON. Read the raw response.', 'The client needs questions. Does it need the answers too?', 'Every question object includes its correct answer index — fetch the API and read them.'],
    lesson: 'Anything sent to the client is public. Answer keys belong on the server; grading must happen server-side.',
    impact: 'Every student aces every quiz — certificates and course credentials become meaningless to employers.',
    report: { title: 'Quiz Answer Key Exposed in API Response', severity: 'High', remediation: 'Never include correct answers in client payloads; grade submissions server-side.' } },
  { id: 'quiz-score', feature: 'Quizzes & Scores', name: 'Client-submitted quiz score trusted', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Submitting a quiz posts a score. Where was that score computed?', 'What if you skip the questions and send the result directly?', 'POST /api/quiz/submit with score=100 — the attempt is recorded as passed, no questions answered.'],
    lesson: 'Scores, like prices, are server truth. A client-reported score is not a result; it is a request.',
    impact: 'Anyone can "pass" any assessment instantly — paid certifications and compliance training records are falsified.',
    report: { title: 'Client-Side Quiz Score Trusted by Server', severity: 'High', remediation: 'Compute scores server-side from submitted answers; ignore client-supplied result fields.' } },
  /* ---- Course Certificates ---- */
  { id: 'cert-issue', feature: 'Course Certificates', name: 'Certificate issued without completing the course', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Certificates are issued by POST /api/certificates/issue. What completion does it verify?', 'Try it on a course where you have done zero lessons.', 'The certificate is generated immediately — progress and quiz results are never checked.'],
    lesson: 'Credential issuance must re-verify every precondition server-side at issue time.',
    impact: 'Fraudulent certificates with the client\'s brand get sold/shared — reputational damage and worthless credentials.',
    report: { title: 'Certificate Issuance Without Completion Verification', severity: 'High', remediation: 'Verify 100% lesson completion and a passing quiz server-side before issuing any certificate.' } },
  { id: 'cert-idor', feature: 'Course Certificates', name: 'IDOR — view another student\'s certificate', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Certificates live at /certificates/<id> with small sequential ids.', 'Whose certificate is id 1? Probably not yours.', 'Open another student\'s certificate id while logged in as someone else — it renders in full.'],
    lesson: 'Credential documents are sensitive objects; serving them by guessable id without an ownership check exposes them to everyone.',
    impact: 'Strangers harvest certificates bearing real names — identity fraud material and a privacy breach.',
    report: { title: 'Insecure Direct Object Reference on Certificates', severity: 'Medium', remediation: 'Check certificate ownership (or a signed share token) before rendering; avoid sequential ids.' } },
  /* ---- Reviews ---- */
  { id: 'review-xss', feature: 'Reviews', name: 'Stored XSS in course reviews', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Reviews are printed on the course page for everyone — including the instructor.', 'Post a review that is more than text.', 'A review containing <script>alert(1)</script> is stored and rendered raw on the course page.'],
    lesson: 'UGC rendered without encoding is stored XSS aimed at everyone who views the page — instructors and admins included.',
    impact: 'Attack script runs for every visitor of a popular course page — session theft at the client\'s most trusted surface.',
    report: { title: 'Stored Cross-Site Scripting in Course Reviews', severity: 'High', remediation: 'Encode review text on output; sanitise/stop HTML in user content; deploy CSP.' } },
  /* ---- Instructor Payouts ---- */
  { id: 'payout-tamper', feature: 'Instructor Payouts', name: 'Payout amount tampering — request more than earned', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Instructors request payouts of their earnings. The amount comes from a form field.', 'Irene has earned a fixed amount. What if she asks for much more?', 'POST /instructor/payout with amount=99999 — it is accepted and queued despite earnings of only 480.'],
    lesson: 'Payout/withdrawal amounts must be validated against the server-side balance, every time.',
    impact: 'Instructors (or anyone who hijacks an instructor account) drain the platform — direct theft from the client.',
    report: { title: 'Payout Amount Not Validated Against Earnings', severity: 'Critical', remediation: 'Validate payout requests against the server-side earnings balance and hold amounts atomically.' } },
  { id: 'payout-idor', feature: 'Instructor Payouts', name: 'IDOR — view another instructor\'s payout summary', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Payout summaries live at /instructors/<id>/payouts.', 'You do not need to be that instructor to open the page.', 'As any logged-in user, open Irene\'s (id 2) payout page — her earnings and payouts are fully visible.'],
    lesson: 'Financial summaries are private objects; role alone is not authorisation — ownership is.',
    impact: 'Competitors and curious users read every instructor\'s income — sensitive commercial data leaked.',
    report: { title: 'Insecure Direct Object Reference on Instructor Payouts', severity: 'Medium', remediation: 'Restrict payout pages to the owning instructor (or admins) with a server-side ownership check.' } },
  /* ---- Admin & Platform ---- */
  { id: 'admin-csrf', feature: 'Admin & Platform', name: 'CSRF on admin course deletion', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Admins can delete courses with a plain POST. No token rides along.', 'The hx_origin marker the app sets is never checked on admin actions either.', 'POST /admin/courses/delete from a foreign Origin while an admin is "visiting" — the course is gone.'],
    lesson: 'Admin actions are the highest-value CSRF targets; they need tokens and origin checks most of all.',
    impact: 'One malicious page view by an admin deletes catalogue content — vandalism with the admin\'s own authority.',
    report: { title: 'Cross-Site Request Forgery on Admin Course Deletion', severity: 'High', remediation: 'Anti-CSRF tokens on all admin actions; validate Origin/Referer; re-authenticate for destructive actions.' } },
  { id: 'api-token', feature: 'Admin & Platform', name: 'Weak API token — base64(email) accepted', owasp: 'A02:2021 Cryptographic Failures', difficulty: 'Intermediate',
    hints: ['/api/me accepts an X-Api-Token header as an alternative to logging in.', 'The token scheme is not random — it is derived from something you know about any user.', 'Send X-Api-Token as base64 of bob@hexalearn.local — the API returns Bob\'s full profile.'],
    lesson: 'Tokens must be unguessable secrets. Encoding is not encryption, and a public identifier is not a credential.',
    impact: 'Anyone who knows a customer\'s email address owns their API identity — full impersonation of every user.',
    report: { title: 'Predictable API Token (Base64 of Email)', severity: 'Critical', remediation: 'Issue random, high-entropy API tokens server-side; store hashed; allow revocation.' } }
);
const FEATURES = [...new Set(TESTS.map(t => t.feature))];

/* --------------------------- http helpers -------------------------- */
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function parseCookies(req) {
  const out = {}; const h = req.headers.cookie || '';
  h.split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
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
  try { const p = new URLSearchParams(raw); for (const [k, v] of p) out[k] = v; } catch (e) {}
  return out;
}
function sessionUser(req) {
  const c = parseCookies(req);
  if (c.hx_session && sessions.has(c.hx_session)) return userById(sessions.get(c.hx_session));
  return null;
}
function anonId(req, res) {
  const c = parseCookies(req);
  if (c.hx_anon) return c.hx_anon;
  const id = 'a' + Math.random().toString(36).slice(2, 10);
  res.setHeader('Set-Cookie', appendCookie(res, 'hx_anon=' + id + '; Path=/; HttpOnly'));
  return id;
}
function appendCookie(res, cookie) {
  const prev = res.getHeader('Set-Cookie');
  if (!prev) return cookie;
  return (Array.isArray(prev) ? prev : [prev]).concat(cookie);
}
function setSessionCookie(res, user) {
  const sid = 's' + (nextSid++) + Math.random().toString(36).slice(2, 8);
  sessions.set(sid, user.id);
  res.setHeader('Set-Cookie', [
    'hx_session=' + sid + '; Path=/; HttpOnly',
    'hx_role=' + user.role + '; Path=/',
    'hx_origin=local; Path=/'
  ]);
  return sid;
}
function isForeignOrigin(req) {
  const o = req.headers.origin || req.headers.referer || '';
  if (!o) return false;
  return !/127\.0\.0\.1:3060|localhost:3060/.test(o);
}
const XSS_RE = /(<script|<svg|<img[^>]*onerror|onerror\s*=|onload\s*=|<iframe|javascript:)/i;

/* --------------------------- page chrome --------------------------- */
function header(user) {
  const st = loadState();
  const done = doneCount(), total = TESTS.length, pct = total ? Math.floor(done / total * 100) : 0;
  return '<div style="background:#14141d;color:#fff;padding:10px 18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">' +
    '<img src="/logo.png" style="height:34px"> ' +
    '<strong>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</strong>' +
    '<span style="background:#262633;border-radius:8px;padding:4px 10px">' + done + '/' + total + ' tests · ' + pct + '%</span>' +
    '<span style="flex:1;background:#262633;border-radius:6px;height:10px;min-width:120px"><span style="display:block;background:#7c5cff;height:10px;border-radius:6px;width:' + pct + '%"></span></span>' +
    '<nav style="display:flex;gap:12px">' +
    '<a style="color:#cdd" href="/">Home</a><a style="color:#cdd" href="/courses">Courses</a><a style="color:#cdd" href="/tests">Tests</a>' +
    (user ? '<a style="color:#cdd" href="/dashboard">Dashboard</a><a style="color:#cdd" href="/admin">Admin</a><a style="color:#cdd" href="/logout">Logout (' + esc(user.name.split(' ')[0]) + ')</a>'
          : '<a style="color:#cdd" href="/login">Login</a><a style="color:#cdd" href="/register">Register</a>') +
    '</nav></div>' + chatWidget();
}
function chatWidget() {
  return '<div id="hxchat" style="position:fixed;right:16px;bottom:16px;width:320px;background:#fff;border:1px solid #ccd;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.25);font-family:Arial;z-index:50">' +
    '<div style="background:#14141d;color:#fff;padding:9px 12px;border-radius:12px 12px 0 0"><strong>Lab Coach</strong> — ask me about the tests</div>' +
    '<div id="hxlog" style="height:180px;overflow:auto;padding:10px;font-size:13px"></div>' +
    '<div style="display:flex;border-top:1px solid #eee"><input id="hxin" style="flex:1;padding:9px;border:0" placeholder="Ask the coach…">' +
    '<button onclick="hxSend()" style="padding:9px 14px;background:#7c5cff;color:#fff;border:0">Send</button></div></div>' +
    '<script>async function hxSend(){var i=document.getElementById("hxin"),l=document.getElementById("hxlog");var m=i.value;i.value="";if(!m)return;l.innerHTML+="<div><b>You:</b> "+m.replace(/</g,"&lt;")+"</div>";try{var r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:m})});var j=await r.json();l.innerHTML+="<div style=\\"margin:6px 0\\"><b>Coach:</b> "+(j.reply||"").replace(/</g,"&lt;")+"</div>";}catch(e){l.innerHTML+="<div>Coach unreachable.</div>";}l.scrollTop=l.scrollHeight;}</script>';
}
function page(res, status, title, body, user) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + ' · ' + LAB_NAME + '</title></head>' +
    '<body style="margin:0;font-family:Arial,sans-serif;background:#f4f4f8;color:#222">' + header(user || null) +
    '<div style="max-width:980px;margin:24px auto;padding:0 16px">' + body + '</div></body></html>');
}
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }
function json(res, status, obj) { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj, null, 2)); }

/* ------------------------------ gate ------------------------------- */
function gatePage(res) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' · Locked</title></head>' +
    '<body style="margin:0;background:#14141d;font-family:Arial,sans-serif">' +
    '<div style="max-width:520px;margin:60px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:28px;text-align:center">' +
    '<img src="/logo.png" style="height:56px"><h2>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h2>' +
    '<p>This lab is locked. Paste the completion key from Lab ' + (LAB_NUMBER - 1) + ' to start.</p>' +
    '<form method="POST" action="/unlock"><input name="key" style="padding:9px;width:80%" placeholder="Completion key from Lab ' + (LAB_NUMBER - 1) + '"><br><br>' +
    '<button style="padding:10px 22px">Unlock LAB ' + LAB_NUMBER + '</button></form></div>' +
    '<div style="max-width:520px;margin:0 auto">' + chatWidget() + '</div></body></html>');
}

/* ------------------------------ auth ------------------------------- */
function loginPage(res, msg) {
  page(res, 200, 'Login',
    '<h2>Login to HexaLearn</h2>' + (msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/login" style="background:#fff;padding:18px;border-radius:10px;max-width:420px">' +
    'Email<br><input name="email" style="width:95%;padding:8px"><br><br>Password<br><input type="password" name="password" style="width:95%;padding:8px"><br><br>' +
    '<button style="padding:9px 20px">Login</button> <a href="/forgot">Forgot password?</a></form>' +
    '<p style="background:#fff8e1;border:1px solid #e6cf7a;padding:10px;border-radius:8px;max-width:420px">🎓 <strong>Try the demo account:</strong> demo@hexalearn.local / demo1234</p>' +
    '<p>Test accounts: alice@hexalearn.local / alice123 · bob@hexalearn.local / bob123 · irene@hexalearn.local / teach123 (instructor)</p>', null);
}
async function handleLogin(req, res) {
  const f = parseForm(await readBody(req));
  attempt('Login & Authentication');
  const email = f.email || '', password = f.password || '';
  const where = "email = '" + email + "' AND password = '" + password + "'";
  const rows = runQuery(users, where);
  const matched = rows[0];
  if (matched) {
    if (looksInjected(email) || looksInjected(password)) {
      if (matched.password !== password) pass('auth-sqli');
    }
    if (matched.id === 6) pass('auth-default');
    setSessionCookie(res, matched);
    return redirect(res, '/dashboard');
  }
  failedLogins[email] = (failedLogins[email] || 0) + 1;
  if (failedLogins[email] >= 10) pass('auth-brute');
  const exists = users.some(u => u.email === email);
  loginPage(res, exists ? 'Wrong password for that account.' : 'No account found for that email.');
}
function registerPage(res, msg) {
  page(res, 200, 'Register',
    '<h2>Create your HexaLearn account</h2>' + (msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/register" style="background:#fff;padding:18px;border-radius:10px;max-width:420px">' +
    'Display name<br><input name="name" style="width:95%;padding:8px"><br><br>Email<br><input name="email" style="width:95%;padding:8px"><br><br>' +
    'Password<br><input type="password" name="password" style="width:95%;padding:8px"><br><br><button style="padding:9px 20px">Register</button></form>', null);
}
async function handleRegister(req, res) {
  const f = parseForm(await readBody(req));
  attempt('Registration & Profile');
  if (!f.email || !f.password || !f.name) return registerPage(res, 'All fields are required.');
  if (users.some(u => u.email === f.email)) return registerPage(res, 'That email is already registered.');
  const user = { id: nextUserId++, name: f.name, email: f.email, password: f.password, role: 'student', credit: 0, earnings: 0 };
  // FLAW: mass assignment — extra submitted fields are copied straight onto the account.
  if (f.role) user.role = f.role;
  if (f.credit !== undefined && f.credit !== '') user.credit = parseInt(f.credit, 10) || 0;
  if (f.earnings !== undefined && f.earnings !== '') user.earnings = parseInt(f.earnings, 10) || 0;
  users.push(user);
  if (user.password.length < 8) pass('reg-weakpw');
  if (user.role !== 'student' || user.credit > 0) pass('reg-mass');
  if (XSS_RE.test(user.name)) pass('reg-xss');
  setSessionCookie(res, user);
  redirect(res, '/dashboard');
}
async function handleForgot(req, res) {
  const f = parseForm(await readBody(req));
  attempt('Login & Authentication');
  const aid = anonId(req, res);
  if (!forgotProbes[aid]) forgotProbes[aid] = new Set();
  if (f.email) forgotProbes[aid].add(f.email);
  if (forgotProbes[aid].size >= 5) {
    const emails = [...forgotProbes[aid]];
    if (emails.some(e => users.some(u => u.email === e)) && emails.some(e => !users.some(u => u.email === e))) pass('auth-enum');
  }
  const user = users.find(u => u.email === f.email);
  let msg;
  if (user) { const tok = resetTokenFor(user); issuedResetTokens.add(tok); msg = 'Reset link sent. (Lab shortcut: /reset?token=' + tok + ')'; }
  else msg = 'No account exists for that email address.';
  page(res, 200, 'Forgot password', '<h2>Forgot password</h2><p>' + esc(msg) + '</p><p><a href="/login">Back to login</a></p>', null);
}
async function handleReset(req, res, url) {
  if (req.method === 'GET') {
    return page(res, 200, 'Reset password', '<h2>Reset password</h2><form method="POST" action="/reset" style="background:#fff;padding:18px;border-radius:10px;max-width:420px">Token<br><input name="token" value="' + esc(url.searchParams.get('token') || '') + '" style="width:95%;padding:8px"><br><br>New password<br><input type="password" name="password" style="width:95%;padding:8px"><br><br><button style="padding:9px 20px">Reset</button></form>', null);
  }
  const f = parseForm(await readBody(req));
  attempt('Login & Authentication');
  const user = users.find(u => resetTokenFor(u) === (f.token || ''));
  if (!user) return page(res, 200, 'Reset password', '<h2>Reset password</h2><p style="color:#b00">Invalid token.</p>', null);
  if (!issuedResetTokens.has(f.token)) pass('auth-reset');
  user.password = f.password || user.password;
  page(res, 200, 'Reset password', '<h2>Password updated</h2><p>You can now <a href="/login">log in</a> with your new password.</p>', null);
}
async function handleProfile(req, res, user) {
  const f = parseForm(await readBody(req));
  attempt('Registration & Profile');
  if (f.name) user.name = f.name;
  if (XSS_RE.test(user.name)) pass('reg-xss');
  if (isForeignOrigin(req)) pass('reg-csrf');
  redirect(res, '/dashboard');
}

/* ---------------------------- app pages ---------------------------- */
function homePage(res, user) {
  const list = courses.map(c => '<div style="background:#fff;border:1px solid #e2e2ea;border-radius:10px;padding:14px;margin:10px 0"><strong>' + esc(c.title) + '</strong> · ' + esc(c.category) + ' · ' + (c.price === 0 ? 'FREE' : '$' + c.price) + ' · ' + c.lessons.length + ' lessons<br><a href="/courses/' + c.id + '">View course</a></div>').join('');
  page(res, 200, 'Home', '<h2>Learn anything. (Local training lab — deliberately vulnerable.)</h2>' + list, user);
}
function dashboardPage(res, user) {
  const mine = enrollments.filter(e => e.userId === user.id);
  const rows = mine.map(e => { const c = courseById(e.courseId); if (!c) return ''; const p = courseProgress(user.id, c); return '<li>' + esc(c.title) + ' — ' + p.done + '/' + p.total + ' lessons (' + p.pct + '%) — quiz ' + (quizPassed(user.id, c.id) ? 'passed' : 'not passed') + ' · <a href="/courses/' + c.id + '">Open</a></li>'; }).join('');
  const myCerts = certificates.filter(x => x.userId === user.id).map(x => '<li><a href="/certificates/' + x.id + '">Certificate #' + x.id + ' — ' + esc((courseById(x.courseId) || {}).title || '') + '</a></li>').join('');
  let instructor = '';
  if (user.role === 'instructor' || user.role === 'admin') {
    instructor = '<h3>Instructor</h3><p>Earnings balance: $' + (user.earnings || 0) + '</p>' +
      '<form method="POST" action="/instructor/payout" style="background:#fff;padding:12px;border-radius:10px;max-width:420px">Request payout $<input name="amount" size="8"> <button>Request</button></form>' +
      '<p><a href="/instructors/' + user.id + '/payouts">My payout summary</a></p>';
  }
  page(res, 200, 'Dashboard',
    '<h2>Welcome, ' + user.name + '</h2><p>Role: ' + esc(user.role) + ' · Credit balance: $' + user.credit + '</p>' +
    '<h3>Profile</h3><form method="POST" action="/profile/update" style="background:#fff;padding:12px;border-radius:10px;max-width:420px">Display name<br><input name="name" value="' + esc(user.name) + '" style="width:95%;padding:8px"><br><br><button>Save</button></form>' +
    '<h3>My courses</h3><ul>' + (rows || '<li>Not enrolled yet — browse the <a href="/courses">catalogue</a>.</li>') + '</ul>' +
    '<h3>My certificates</h3><ul>' + (myCerts || '<li>None yet.</li>') + '</ul>' + instructor, user);
}
function coursePage(res, user, course) {
  const enrolled = user && isEnrolled(user.id, course.id);
  const done = user ? (lessonDone[user.id + ':' + course.id] || []) : [];
  const lessons = course.lessons.map(l => '<li>' + esc(l.title) + (done.includes(l.id) ? ' ✓ complete' : '') +
    (user ? ' <button onclick="fetch(\'/api/progress/complete\',{method:\'POST\',headers:{\'Content-Type\':\'application/json\'},body:JSON.stringify({courseId:' + course.id + ',lessonId:' + l.id + '})}).then(()=>location.reload())">Mark complete</button>' : '') + '</li>').join('');
  const revs = reviews.filter(r => r.courseId === course.id).map(r => { const a = userById(r.userId); return '<div style="background:#fff;border:1px solid #e2e2ea;border-radius:8px;padding:10px;margin:8px 0"><strong>' + (a ? a.name : 'User') + ':</strong> ' + r.text + '</div>'; }).join('');
  page(res, 200, course.title,
    '<h2>' + esc(course.title) + '</h2><p>' + esc(course.category) + ' · ' + (course.price === 0 ? 'FREE' : '$' + course.price) + ' · Instructor: ' + esc((userById(course.instructorId) || {}).name || '') + '</p>' +
    (user ? (enrolled ? '<p>✅ You are enrolled.</p>' :
      '<form method="POST" action="/enroll" style="background:#fff;padding:12px;border-radius:10px;max-width:460px">Price $<input name="price" value="' + course.price + '" size="6"> Coupon <input name="coupon" size="10" placeholder="WELCOME50"><input type="hidden" name="courseId" value="' + course.id + '"> <button>Enrol now</button></form>') : '<p><a href="/login">Log in</a> to enrol.</p>') +
    '<h3>Lessons</h3><ul>' + lessons + '</ul>' +
    (user ? '<p><button onclick="fetch(\'/api/quiz/' + course.id + '\').then(r=>r.json()).then(j=>{document.getElementById(\'qz\').textContent=JSON.stringify(j,null,1)})">Load quiz</button> ' +
      'Score <input id="sc" size="4" value="100"> <button onclick="fetch(\'/api/quiz/submit\',{method:\'POST\',headers:{\'Content-Type\':\'application/json\'},body:JSON.stringify({courseId:' + course.id + ',score:parseInt(document.getElementById(\'sc\').value)})}).then(()=>location.reload())">Submit score</button></p><pre id="qz" style="background:#fff;padding:10px;border-radius:8px"></pre>' +
      '<p><button onclick="fetch(\'/api/certificates/issue\',{method:\'POST\',headers:{\'Content-Type\':\'application/json\'},body:JSON.stringify({courseId:' + course.id + '})}).then(()=>location.href=\'/dashboard\')">Issue my certificate</button></p>' : '') +
    '<h3>Reviews</h3>' + revs +
    (user ? '<form method="POST" action="/courses/' + course.id + '/reviews" style="background:#fff;padding:12px;border-radius:10px;max-width:460px"><textarea name="text" rows="3" style="width:95%"></textarea><br><button>Post review</button></form>' : ''), user);
}
function searchPage(res, user, q) {
  attempt('Search & Catalog');
  let rows;
  if (!q) rows = courses;
  else {
    const where = "title LIKE '%" + q + "%' OR category LIKE '%" + q + "%'";
    rows = runQuery(courses, where);
    if (looksInjected(q) && rows.some(c => !c.title.includes(q) && !c.category.includes(q))) pass('search-sqli');
  }
  let reflectedNote = '';
  if (q) {
    reflectedNote = '<p>Results for "' + q + '":</p>'; // FLAW: q reflected unescaped
    if (XSS_RE.test(q)) pass('search-xss');
  }
  const list = rows.map(c => '<div style="background:#fff;border:1px solid #e2e2ea;border-radius:10px;padding:12px;margin:8px 0"><strong>' + esc(c.title) + '</strong> · ' + esc(c.category) + ' · ' + (c.price === 0 ? 'FREE' : '$' + c.price) + ' · <a href="/courses/' + c.id + '">View</a></div>').join('');
  page(res, 200, 'Search', '<h2>Search courses</h2><form method="GET" action="/search"><input name="q" value="' + esc(q || '') + '" style="padding:8px;width:60%"> <button>Search</button></form>' + reflectedNote + list, user);
}

/* --------------------------- app actions --------------------------- */
async function handleEnroll(req, res, user) {
  const f = parseForm(await readBody(req));
  attempt('Enrollment & Payments');
  const course = courseById(parseInt(f.courseId, 10));
  if (!course) return page(res, 404, 'Not found', '<h2>Course not found.</h2>', user);
  if (isEnrolled(user.id, course.id)) return redirect(res, '/courses/' + course.id);
  let expected = course.price;
  let couponApplied = false;
  if (f.coupon && COUPONS[String(f.coupon).toUpperCase()]) {
    const code = String(f.coupon).toUpperCase();
    expected = Math.round(course.price * (100 - COUPONS[code]) / 100);
    couponApplied = true;
    // FLAW: redemption is recorded but never checked — the "single-use" code works forever.
    if (couponUses.some(u => u.userId === user.id && u.code === code)) pass('enroll-coupon');
    couponUses.push({ userId: user.id, code });
  }
  let paid = parseInt(f.price, 10);
  if (isNaN(paid)) paid = expected;
  if (paid < 0) { user.credit += (-paid); pass('enroll-negative'); }
  else if (paid < expected) pass('enroll-price');
  enrollments.push({ id: nextEnrollId++, userId: user.id, courseId: course.id, paidAmount: paid, coupon: couponApplied ? String(f.coupon).toUpperCase() : null });
  if (course.instructorId && userById(course.instructorId) && paid > 0) userById(course.instructorId).earnings = (userById(course.instructorId).earnings || 0) + paid;
  redirect(res, '/courses/' + course.id);
}
async function handleProgressComplete(req, res, user, body) {
  attempt('Lessons & Progress');
  const course = courseById(parseInt(body.courseId, 10));
  if (!course) return json(res, 404, { error: 'course not found' });
  const lessonId = parseInt(body.lessonId, 10);
  if (!course.lessons.some(l => l.id === lessonId)) return json(res, 404, { error: 'lesson not found' });
  // FLAW: no enrollment check — anyone logged in can forge completion for any course.
  if (!isEnrolled(user.id, course.id)) pass('progress-forge');
  const key = user.id + ':' + course.id;
  if (!lessonDone[key]) lessonDone[key] = [];
  if (!lessonDone[key].includes(lessonId)) lessonDone[key].push(lessonId);
  json(res, 200, { ok: true, progress: courseProgress(user.id, course) });
}
function studentProgressPage(res, user, targetId) {
  attempt('Lessons & Progress');
  const target = userById(targetId);
  if (!target) return page(res, 404, 'Not found', '<h2>Student not found.</h2>', user);
  // FLAW: no ownership check — any logged-in user can read any student's progress.
  if (target.id !== user.id && user.role !== 'admin') pass('progress-idor');
  const rows = enrollments.filter(e => e.userId === target.id).map(e => { const c = courseById(e.courseId); if (!c) return ''; const p = courseProgress(target.id, c); return '<li>' + esc(c.title) + ' — ' + p.done + '/' + p.total + ' lessons (' + p.pct + '%) — quiz ' + (quizPassed(target.id, c.id) ? 'passed' : 'not passed') + '</li>'; }).join('');
  page(res, 200, 'Student progress', '<h2>Progress of ' + esc(target.name) + ' (' + esc(target.email) + ')</h2><ul>' + (rows || '<li>No enrollments.</li>') + '</ul>', user);
}
function handleQuizGet(res, user, courseId) {
  attempt('Quizzes & Scores');
  const course = courseById(courseId);
  if (!course) return json(res, 404, { error: 'course not found' });
  // FLAW: the answer key is shipped to the client with the questions.
  pass('quiz-answers');
  json(res, 200, { courseId: course.id, title: course.title, questions: course.quiz.map(q => ({ q: q.q, options: q.options, correctAnswer: q.answer })) });
}
function handleQuizSubmit(res, user, body) {
  attempt('Quizzes & Scores');
  const course = courseById(parseInt(body.courseId, 10));
  if (!course) return json(res, 404, { error: 'course not found' });
  const score = parseInt(body.score, 10);
  if (isNaN(score)) return json(res, 400, { error: 'score required' });
  // FLAW: the client-reported score is trusted as the result.
  quizAttempts.push({ userId: user.id, courseId: course.id, score, passed: score >= 70 });
  pass('quiz-score');
  json(res, 200, { ok: true, score, passed: score >= 70 });
}
function handleCertIssue(res, user, body) {
  attempt('Course Certificates');
  const course = courseById(parseInt(body.courseId, 10));
  if (!course) return json(res, 404, { error: 'course not found' });
  const p = courseProgress(user.id, course);
  const complete = p.total > 0 && p.done >= p.total && quizPassed(user.id, course.id);
  // FLAW: certificate issued without verifying completion.
  if (!complete) pass('cert-issue');
  const cert = { id: nextCertId++, userId: user.id, courseId: course.id, code: 'HXL-CERT-' + (1000 + nextCertId) };
  certificates.push(cert);
  json(res, 200, { ok: true, certificate: cert });
}
function courseCertPage(res, user, certId) {
  attempt('Course Certificates');
  const cert = certificates.find(c => c.id === certId);
  if (!cert) return page(res, 404, 'Not found', '<h2>Certificate not found.</h2>', user);
  // FLAW: any logged-in user can view any certificate by id.
  if (cert.userId !== user.id && user.role !== 'admin') pass('cert-idor');
  const owner = userById(cert.userId); const course = courseById(cert.courseId);
  page(res, 200, 'Course certificate',
    '<div style="background:#fff;border:2px solid #7c5cff;border-radius:14px;padding:28px;text-align:center">' +
    '<img src="/logo.png" style="height:48px"><h2>Certificate of Achievement</h2>' +
    '<p>This certifies that</p><h3>' + esc(owner ? owner.name : '') + '</h3>' +
    '<p>has completed the course</p><h3>' + esc(course ? course.title : '') + '</h3>' +
    '<p>Certificate code: ' + esc(cert.code) + ' · HexaLearn</p></div>', user);
}
async function handleReview(req, res, user, courseId) {
  const f = parseForm(await readBody(req));
  attempt('Reviews');
  const course = courseById(courseId);
  if (!course) return page(res, 404, 'Not found', '<h2>Course not found.</h2>', user);
  const text = f.text || '';
  reviews.push({ id: nextReviewId++, courseId: course.id, userId: user.id, text });
  // FLAW: review text is stored raw and rendered unescaped on the course page.
  if (XSS_RE.test(text)) pass('review-xss');
  redirect(res, '/courses/' + course.id);
}
async function handlePayout(req, res, user) {
  const f = parseForm(await readBody(req));
  attempt('Instructor Payouts');
  const amount = parseInt(f.amount, 10);
  if (isNaN(amount) || amount <= 0) return redirect(res, '/dashboard');
  // FLAW: requested amount is never checked against the earnings balance.
  if (amount > (user.earnings || 0)) pass('payout-tamper');
  payouts.push({ id: nextPayoutId++, instructorId: user.id, amount, status: 'queued' });
  redirect(res, '/instructors/' + user.id + '/payouts');
}
function payoutPage(res, user, instructorId) {
  attempt('Instructor Payouts');
  const inst = userById(instructorId);
  if (!inst) return page(res, 404, 'Not found', '<h2>Instructor not found.</h2>', user);
  // FLAW: payout summary served to any logged-in user, not just the owner.
  if (inst.id !== user.id && user.role !== 'admin') pass('payout-idor');
  const rows = payouts.filter(p => p.instructorId === inst.id).map(p => '<li>$' + p.amount + ' — ' + esc(p.status) + '</li>').join('');
  page(res, 200, 'Payouts', '<h2>Payout summary — ' + esc(inst.name) + '</h2><p>Earnings balance: $' + (inst.earnings || 0) + '</p><ul>' + (rows || '<li>No payouts yet.</li>') + '</ul>', user);
}
function adminPage(res, user, cookies) {
  // FLAW: the admin gate trusts the client-side hx_role cookie, not the server session.
  if ((cookies.hx_role || '') !== 'admin') return page(res, 403, 'Forbidden', '<h2>Admins only.</h2>', user);
  if (user && user.role !== 'admin') pass('auth-cookie');
  const ulist = users.map(u => '<li>' + u.name + ' — ' + esc(u.email) + ' — ' + esc(u.role) + ' — credit $' + u.credit + '</li>').join('');
  const clist = courses.map(c => '<li>' + esc(c.title) + ' <form method="POST" action="/admin/courses/delete" style="display:inline"><input type="hidden" name="courseId" value="' + c.id + '"><button>Delete</button></form></li>').join('');
  page(res, 200, 'Admin', '<h2>Admin panel</h2><h3>Users</h3><ul>' + ulist + '</ul><h3>Courses</h3><ul>' + clist + '</ul>', user);
}
async function handleAdminDelete(req, res, user) {
  const f = parseForm(await readBody(req));
  attempt('Admin & Platform');
  const idx = courses.findIndex(c => c.id === parseInt(f.courseId, 10));
  if (idx >= 0) {
    courses.splice(idx, 1);
    // FLAW: destructive admin action with no CSRF token / origin check.
    if (isForeignOrigin(req)) pass('admin-csrf');
  }
  redirect(res, '/admin');
}
function handleApiMe(req, res, user) {
  attempt('Admin & Platform');
  const token = req.headers['x-api-token'] || '';
  if (token) {
    const email = Buffer.from(token, 'base64').toString('utf8');
    const target = users.find(u => u.email === email);
    if (target) {
      // FLAW: the "token" is just base64(email) — public knowledge, zero secrecy.
      if (!user || user.id !== target.id) pass('api-token');
      return json(res, 200, { id: target.id, name: target.name, email: target.email, role: target.role, credit: target.credit });
    }
  }
  if (user) return json(res, 200, { id: user.id, name: user.name, email: user.email, role: user.role, credit: user.credit });
  json(res, 401, { error: 'authentication required' });
}

/* ------------------------- tests / complete ------------------------ */
function testsPage(res, user, url) {
  const st = loadState();
  const hParam = url.searchParams.get('h') || '';
  const hm = hParam.match(/^([a-z0-9-]+):(\d)$/);
  const hintFor = hm ? hm[1] : null, hintLvl = hm ? parseInt(hm[2], 10) : 0;
  let body = '<h2>Mission board — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h2><p>' + doneCount() + '/' + TESTS.length + ' tests complete. Hints unlock one at a time. The Lab Coach gives step-by-step help for a feature after you have genuinely tried that feature at least 3 times.</p>';
  for (const f of FEATURES) {
    const list = TESTS.filter(t => t.feature === f);
    const fDone = list.filter(t => st.tests[t.id]).length;
    body += '<h3>' + esc(f) + ' — ' + fDone + '/' + list.length + ' · attempts: ' + (st.attempts[f] || 0) + '</h3>';
    for (const t of list) {
      const done = !!st.tests[t.id];
      body += '<div style="background:#fff;border:1px solid #e2e2ea;border-radius:10px;padding:12px;margin:8px 0">' +
        '<strong>' + (done ? '✓' : '○') + ' ' + esc(t.name) + '</strong> · ' + esc(t.owasp) + ' · ' + esc(t.difficulty) + (done ? ' · <span style="color:#187a18">done</span>' : '') +
        '<br><span style="color:#555">' + esc(t.lesson) + '</span>';
      if (hintFor === t.id && hintLvl > 0) {
        for (let i = 0; i < Math.min(hintLvl, 3); i++) body += '<div style="background:#fff8e1;border-radius:6px;padding:6px 9px;margin-top:6px">💡 Hint ' + (i + 1) + ': ' + esc(t.hints[i]) + '</div>';
        if (hintLvl < 3) body += '<br><a href="/tests?h=' + t.id + ':' + (hintLvl + 1) + '">Next hint</a>';
      } else {
        body += '<br><a href="/tests?h=' + t.id + ':1">Show hint 1</a>';
      }
      body += '</div>';
    }
  }
  page(res, 200, 'Tests', body, user);
}
async function handleCompleteName(req, res) {
  const f = parseForm(await readBody(req));
  const st = loadState();
  if (f.name) { st.testerName = f.name; saveState(); }
  redirect(res, '/complete');
}
function completePage(res, user) {
  const st = loadState();
  const total = TESTS.length, done = doneCount();
  if (!isComplete()) {
    const left = TESTS.filter(t => !st.tests[t.id]).map(t => '<li>' + esc(t.feature) + ' — ' + esc(t.name) + '</li>').join('');
    return page(res, 200, 'Complete', '<h2>Not yet — ' + done + '/' + total + ' tests done (' + Math.floor(done / total * 100) + '%)</h2><p>Still to solve:</p><ul>' + left + '</ul><p><a href="/tests">Back to the mission board</a></p>', user);
  }
  const featCounts = FEATURES.map(f => '<li><strong>' + esc(f) + '</strong>: ' + TESTS.filter(t => t.feature === f).length + ' vulnerabilities</li>').join('');
  const ways = TESTS.map(t => '<li>' + esc(t.name) + ' (' + esc(t.feature) + ')</li>').join('');
  const lessons = TESTS.map(t => '<li><strong>' + esc(t.name) + ':</strong> ' + esc(t.lesson) + '</li>').join('');
  const impacts = TESTS.map(t => '<li><strong>' + esc(t.name) + ':</strong> ' + esc(t.impact) + '</li>').join('');
  const reports = TESTS.map(t => '<li><strong>' + esc(t.report.title) + '</strong> — Severity: ' + esc(t.report.severity) + ' — Fix: ' + esc(t.report.remediation) + '</li>').join('');
  page(res, 200, 'Lab complete',
    '<h2>🎉 LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' complete: ' + done + '/' + total + ' tests (100%)</h2>' +
    '<h3>1) Features in this lab</h3><p>' + FEATURES.length + ' features:</p><ul>' + featCounts + '</ul>' +
    '<h3>2) Vulnerabilities per feature</h3><p>See the counts above — ' + total + ' scored tests in total.</p>' +
    '<h3>3) Ways testing was done</h3><ul>' + ways + '</ul>' +
    '<h3>4) What you learned</h3><ul>' + lessons + '</ul>' +
    '<h3>5) What this means for a real client</h3><ul>' + impacts + '</ul>' +
    '<h3>6) Writing it in a real report</h3><ul>' + reports + '</ul>' +
    '<h3>Your completion key (unlocks Lab ' + (LAB_NUMBER + 1) + ')</h3>' +
    '<div style="background:#14141d;color:#8dff9a;padding:14px;border-radius:10px;font-family:monospace;font-size:18px;text-align:center">' + esc(completionKey()) + '</div>' +
    '<h3>Your certificate</h3><form method="POST" action="/complete/name"><input name="name" value="' + esc(st.testerName || '') + '" placeholder="Your name for the certificate" style="padding:8px;width:60%"> <button>Save name</button></form>' +
    '<p><a href="/certificate">View your certificate</a></p>', user);
}
function certificatePage(res, user) {
  const st = loadState();
  if (!isComplete()) return redirect(res, '/complete');
  const name = st.testerName || (user ? user.name : 'HexaLearn Tester');
  const date = st.completedAt ? new Date(st.completedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ' + LAB_NUMBER + '</title>' +
    '<style>@media print{button{display:none}}</style></head><body style="font-family:Georgia,serif;background:#ececf2;margin:0;padding:30px">' +
    '<div style="max-width:760px;margin:0 auto;background:#fff;border:3px solid #7c5cff;border-radius:16px;padding:40px;text-align:center">' +
    '<img src="/logo.png" style="height:64px"><h1 style="margin:10px 0">Certificate of Completion</h1>' +
    '<p>This is to certify that</p><h2 style="margin:6px 0">' + esc(name) + '</h2>' +
    '<p>has completed 100% of the security tests in</p><h3>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h3>' +
    '<p>' + TESTS.length + ' tests across ' + FEATURES.length + ' features</p>' +
    '<p>Completed on ' + esc(date) + '</p>' +
    '<p style="margin-top:26px;color:#555">HexaCyberLab — Built by Md. Jony Hassain, Founder</p>' +
    '<button onclick="window.print()">Print</button></div></body></html>');
}

/* ----------------------------- chatbot ----------------------------- */
const FEATURE_KEYS = [
  ['Login & Authentication', ['login', 'auth', 'password', 'brute', 'reset token', 'sign in']],
  ['Registration & Profile', ['register', 'registration', 'profile', 'sign up', 'signup']],
  ['Search & Catalog', ['search', 'catalog', 'catalogue']],
  ['Enrollment & Payments', ['enrol', 'enroll', 'payment', 'price', 'coupon', 'pay']],
  ['Lessons & Progress', ['lesson', 'progress']],
  ['Quizzes & Scores', ['quiz', 'score', 'exam']],
  ['Course Certificates', ['certificate']],
  ['Reviews', ['review']],
  ['Instructor Payouts', ['payout', 'instructor']],
  ['Admin & Platform', ['admin', 'api', 'token', 'platform']]
];
function matchFeature(msg) {
  let best = null, bestLen = 0;
  for (const f of FEATURES) if (msg.includes(f.toLowerCase()) && f.length > bestLen) { best = f; bestLen = f.length; }
  if (best) return best;
  for (const [f, keys] of FEATURE_KEYS) for (const k of keys) if (msg.includes(k)) return f;
  return null;
}
function chatReply(raw) {
  const st = loadState();
  const msg = String(raw || '').toLowerCase();
  const total = TESTS.length, done = doneCount(), pct = total ? Math.floor(done / total * 100) : 0;
  if (/(who (built|made|created)|founder|jony|hassain)/.test(msg)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (msg.includes('key')) {
    if (isComplete() && st.keyRevealed) return 'You completed LAB ' + LAB_NUMBER + ' — your completion key (it unlocks the next lab) is: ' + completionKey();
    return 'I don\'t have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at ' + pct + '% (' + done + '/' + total + '). Finish every test and ask me again.';
  }
  const feature = matchFeature(msg);
  const wantsHow = /(how|help|guide|solve|hint|exploit|stuck|step)/.test(msg);
  const wantsCount = /(how many|count|list|which|what tests|vulnerabilit)/.test(msg);
  if (feature && wantsCount && !wantsHow) {
    const list = TESTS.filter(t => t.feature === feature);
    return feature + ' has ' + list.length + ' tests: ' + list.map(t => t.name + (st.tests[t.id] ? ' ✓' : '')).join(' · ') + '. Attempts so far on this feature: ' + (st.attempts[feature] || 0) + '.';
  }
  if (wantsHow) {
    if (!feature) return 'Tell me which feature you are working on — ' + FEATURES.join(', ') + ' — and I\'ll help once you have tried that feature at least 3 times. Your progress: ' + done + '/' + total + ' (' + pct + '%).';
    const tries = st.attempts[feature] || 0;
    const open = TESTS.filter(t => t.feature === feature && !st.tests[t.id]);
    if (tries < 3 && open.length) {
      return "That feature is locked for help. First try the " + feature + " tests yourself at least 3 times — I can see you've tried " + tries + " time(s) so far. After 3 real tries, ask me again and I'll guide you step by step.";
    }
    if (!open.length) return 'You have already completed every test in ' + feature + '. Nice work — pick another feature from /tests.';
    return 'Step by step for ' + feature + ':\n' + open.map(t => '• ' + t.name + ' — ' + t.hints[2]).join('\n');
  }
  if (/(progress|status|score so far|my %)/.test(msg) || wantsCount) {
    return 'Your progress: ' + done + '/' + total + ' tests (' + pct + '%). Features: ' + FEATURES.map(f => f + ' ' + TESTS.filter(t => t.feature === f && st.tests[t.id]).length + '/' + TESTS.filter(t => t.feature === f).length).join(' · ') + '. Next open test: ' + (TESTS.find(t => !st.tests[t.id]) ? TESTS.find(t => !st.tests[t.id]).name : 'none — lab complete!');
  }
  if (/(hi|hello|hey|start|begin)/.test(msg)) {
    return 'Welcome to LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '! This lab has ' + FEATURES.length + ' features and ' + total + ' scored tests. You are at ' + pct + '%. Open /tests for the mission board, use the hints, and ask me for step-by-step help after 3 genuine attempts on a feature.';
  }
  return 'I can tell you the map (features and test names are public), your progress and attempt counts — and step-by-step guidance for a feature once you have tried it at least 3 times. Try asking: "how many tests in Quizzes & Scores", "what is my progress", or "how do I solve Enrollment & Payments".';
}
async function handleChat(req, res) {
  const raw = await readBody(req);
  let msg = '';
  try { msg = JSON.parse(raw).message || ''; } catch (e) { msg = ''; }
  if (!msg) return json(res, 200, { reply: 'Ask me about the tests, your progress, a feature — or who built these labs.' });
  json(res, 200, { reply: chatReply(msg) });
}

/* ------------------------------ router ----------------------------- */
const server = http.createServer(async (req, res) => {
  try {
    loadState();
    const url = new URL(req.url, 'http://127.0.0.1:3060');
    const pathName = url.pathname;
    const method = req.method;
    if (pathName === '/logo.png') {
      try { const data = fs.readFileSync(path.join(ROOT, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(data); }
      catch (e) { res.writeHead(404); return res.end('no logo'); }
    }
    if (pathName === '/unlock' && method === 'POST') {
      const f = parseForm(await readBody(req));
      if ((f.key || '') === entryKey()) { const st = loadState(); st.unlocked = true; saveState(); return redirect(res, '/'); }
      res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end('<h2>403 — wrong key.</h2><p><a href="/">Back</a></p>');
    }
    if (pathName === '/api/chat' && method === 'POST') return handleChat(req, res);
    const st = loadState();
    if (!st.unlocked) return gatePage(res);

    const user = sessionUser(req);
    const cookies = parseCookies(req);
    const needLogin = () => { if (!user) { redirect(res, '/login'); return true; } return false; };

    if (pathName === '/' && method === 'GET') return homePage(res, user);
    if (pathName === '/login' && method === 'GET') return loginPage(res);
    if (pathName === '/login' && method === 'POST') return handleLogin(req, res);
    if (pathName === '/register' && method === 'GET') return registerPage(res);
    if (pathName === '/register' && method === 'POST') return handleRegister(req, res);
    if (pathName === '/forgot' && method === 'GET') return page(res, 200, 'Forgot password', '<h2>Forgot password</h2><form method="POST" action="/forgot" style="background:#fff;padding:18px;border-radius:10px;max-width:420px">Email<br><input name="email" style="width:95%;padding:8px"><br><br><button>Send reset link</button></form>', user);
    if (pathName === '/forgot' && method === 'POST') return handleForgot(req, res);
    if (pathName === '/reset') return handleReset(req, res, url);
    if (pathName === '/logout') { const c = parseCookies(req); if (c.hx_session) sessions.delete(c.hx_session); res.setHeader('Set-Cookie', ['hx_session=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0']); return redirect(res, '/'); }
    if (pathName === '/dashboard' && method === 'GET') { if (needLogin()) return; return dashboardPage(res, user); }
    if (pathName === '/profile/update' && method === 'POST') { if (needLogin()) return; return handleProfile(req, res, user); }
    if (pathName === '/courses' && method === 'GET') return homePage(res, user);
    const cm = pathName.match(/^\/courses\/(\d+)$/);
    if (cm && method === 'GET') { const c = courseById(parseInt(cm[1], 10)); if (!c) return page(res, 404, 'Not found', '<h2>Course not found.</h2>', user); return coursePage(res, user, c); }
    const rm = pathName.match(/^\/courses\/(\d+)\/reviews$/);
    if (rm && method === 'POST') { if (needLogin()) return; return handleReview(req, res, user, parseInt(rm[1], 10)); }
    if (pathName === '/search' && method === 'GET') return searchPage(res, user, url.searchParams.get('q') || '');
    if (pathName === '/enroll' && method === 'POST') { if (needLogin()) return; return handleEnroll(req, res, user); }
    if (pathName === '/api/progress/complete' && method === 'POST') { if (needLogin()) return; let b = {}; try { b = JSON.parse(await readBody(req)); } catch (e) {} return handleProgressComplete(req, res, user, b); }
    const sm = pathName.match(/^\/students\/(\d+)\/progress$/);
    if (sm && method === 'GET') { if (needLogin()) return; return studentProgressPage(res, user, parseInt(sm[1], 10)); }
    const qm = pathName.match(/^\/api\/quiz\/(\d+)$/);
    if (qm && method === 'GET') { if (needLogin()) return; return handleQuizGet(res, user, parseInt(qm[1], 10)); }
    if (pathName === '/api/quiz/submit' && method === 'POST') { if (needLogin()) return; let b = {}; try { b = JSON.parse(await readBody(req)); } catch (e) {} return handleQuizSubmit(res, user, b); }
    if (pathName === '/api/certificates/issue' && method === 'POST') { if (needLogin()) return; let b = {}; try { b = JSON.parse(await readBody(req)); } catch (e) {} return handleCertIssue(res, user, b); }
    const km = pathName.match(/^\/certificates\/(\d+)$/);
    if (km && method === 'GET') { if (needLogin()) return; return courseCertPage(res, user, parseInt(km[1], 10)); }
    if (pathName === '/instructor/payout' && method === 'POST') { if (needLogin()) return; return handlePayout(req, res, user); }
    const pm = pathName.match(/^\/instructors\/(\d+)\/payouts$/);
    if (pm && method === 'GET') { if (needLogin()) return; return payoutPage(res, user, parseInt(pm[1], 10)); }
    if (pathName === '/admin' && method === 'GET') { if (needLogin()) return; return adminPage(res, user, cookies); }
    if (pathName === '/admin/courses/delete' && method === 'POST') { if (needLogin()) return; if ((cookies.hx_role || '') !== 'admin') return page(res, 403, 'Forbidden', '<h2>Admins only.</h2>', user); return handleAdminDelete(req, res, user); }
    if (pathName === '/api/me' && method === 'GET') return handleApiMe(req, res, user);
    if (pathName === '/api/progress' && method === 'GET') {
      const s2 = loadState(); const total = TESTS.length; const done = doneCount();
      const features = {};
      for (const f of FEATURES) { const l = TESTS.filter(t => t.feature === f); features[f] = { total: l.length, done: l.filter(t => s2.tests[t.id]).length, attempts: s2.attempts[f] || 0 }; }
      return json(res, 200, { lab: LAB_NAME, number: LAB_NUMBER, total, done, pct: total ? Math.floor(done / total * 100) : 0, features, complete: done >= total });
    }
    if (pathName === '/tests' && method === 'GET') return testsPage(res, user, url);
    if (pathName === '/complete' && method === 'GET') return completePage(res, user);
    if (pathName === '/complete/name' && method === 'POST') return handleCompleteName(req, res);
    if (pathName === '/certificate' && method === 'GET') return certificatePage(res, user);
    return page(res, 404, 'Not found', '<h2>404 — page not found.</h2>', user);
  } catch (e) {
    try { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('Internal error'); } catch (e2) {}
  }
});

if (require.main === module) {
  server.listen(PORT, HOST, () => { console.log('LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' running at http://' + HOST + ':' + PORT + ' (local training lab — deliberately vulnerable)'); });
}
module.exports = { TESTS, FEATURES };
