'use strict';
/*
 * HexaFitness — LAB 67 (Category 7: Healthcare & Wellness)
 * A deliberately vulnerable fitness-club platform for authorised security training.
 * Zero-dependency Node.js. Binds 127.0.0.1:3076 only. All data is fake seed data.
 * LOCAL USE ONLY — never deploy this application anywhere public.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const LAB_NUMBER = 67;
const LAB_NAME = 'HexaFitness';
const PORT = 3076;
const HOST = '127.0.0.1';
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');

/* ------------------------------------------------------------------ *
 *  Runtime configuration fragments (assembled only when needed).   *
 * ------------------------------------------------------------------ */
const _cfgA = ["TC1YSA==", "WS03Ng==", "R1IyWQ==", "LTdPMg==", "VEYwTg==", "OVM5OQ=="];
function _joinParts(parts) {
  return parts.map(p => Buffer.from(p, 'base64').toString('utf8').split('').reverse().join('')).join('');
}

/* ------------------------- progress state ------------------------- */
let state = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadState() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      state = Object.assign(state, raw);
    }
  } catch (e) { /* corrupted state file -> start fresh, never crash */ }
}
function saveState() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2)); } catch (e) { /* ignore */ }
}
loadState();
if (!fs.existsSync(PROGRESS_FILE)) saveState();

/* --------------------------- seed data ---------------------------- */
const PLANS = {
  Free:    { price: 0,  label: 'Free' },
  Basic:   { price: 20, label: 'Basic' },
  Premium: { price: 49, label: 'Premium' }
};
const PT_PRICE = 60;

const users = [
  { id: 1, email: 'admin@hexafitness.local', password: 'admin123',   name: 'Gym Admin',  role: 'admin',   plan: 'Premium', credits: 0, memberUntil: '2027-12-31', memberStatus: 'active' },
  { id: 2, email: 'alice@test.local',        password: 'alice123',   name: 'Alice Reed', role: 'member',  plan: 'Premium', credits: 5, memberUntil: '2027-06-30', memberStatus: 'active' },
  { id: 3, email: 'bob@test.local',          password: 'bob123',     name: 'Bob Carter', role: 'member',  plan: 'Free',    credits: 0, memberUntil: '2026-01-31', memberStatus: 'active' },
  { id: 4, email: 'carol@test.local',        password: 'carol123',   name: 'Carol Diaz', role: 'member',  plan: 'Premium', credits: 2, memberUntil: '2027-03-31', memberStatus: 'active' },
  { id: 5, email: 'tom@hexafitness.local',   password: 'trainer123', name: 'Tom Wells',  role: 'trainer', plan: 'Premium', credits: 0, memberUntil: '2027-12-31', memberStatus: 'active' },
  { id: 6, email: 'tina@hexafitness.local',  password: 'trainer123', name: 'Tina Fox',   role: 'trainer', plan: 'Premium', credits: 0, memberUntil: '2027-12-31', memberStatus: 'active' }
];
let nextUserId = 7;

const classes = [
  { id: 1, name: 'Yoga Flow',     trainerId: 5, time: 'Mon 07:00', capacity: 20, premiumOnly: false },
  { id: 2, name: 'HIIT Blast',    trainerId: 6, time: 'Tue 18:00', capacity: 2,  premiumOnly: false },
  { id: 3, name: 'Spin Pro',      trainerId: 5, time: 'Wed 06:30', capacity: 15, premiumOnly: true },
  { id: 4, name: 'Boxing Basics', trainerId: 6, time: 'Thu 19:00', capacity: 10, premiumOnly: false }
];
let bookings = [
  { id: 1, classId: 1, userId: 2 }, { id: 2, classId: 1, userId: 4 },
  { id: 3, classId: 2, userId: 2 }, { id: 4, classId: 2, userId: 4 },
  { id: 5, classId: 3, userId: 2 }
];
let nextBookingId = 6;

let ptSessions = [ { id: 1, userId: 2, trainerId: 5, price: 60 } ];
let nextPtId = 2;

let progressEntries = [
  { id: 1, userId: 2, date: '2026-10-01', weight: 72, note: 'Alice: steady cardio progress.' },
  { id: 2, userId: 3, date: '2026-10-02', weight: 85, note: 'Bob: starting weight recorded.' },
  { id: 3, userId: 4, date: '2026-10-03', weight: 64, note: 'Carol: marathon prep on track.' }
];
let nextProgressId = 4;

let trainerNotes = [
  { id: 1, memberId: 3, trainerId: 5, text: 'PRIVATE — Bob: knee rehab, avoid heavy squats. Medical note for staff only.' },
  { id: 2, memberId: 2, trainerId: 6, text: 'PRIVATE — Alice: prefers morning sessions, shoulder mobility work.' }
];
let nextNoteId = 3;

let guestPasses = [
  { code: 'GP-2-1', ownerId: 2, used: false },
  { code: 'GP-2-2', ownerId: 2, used: true },
  { code: 'GP-4-1', ownerId: 4, used: false }
];

/* more runtime fragments, kept apart from the first set */
const _cfgB = ["TC1YSA==", "Qy04Ng==", "U1RPNg=="];

/* ============================ TESTS registry ============================ */
const TESTS = [
  /* ---- Login & Authentication ---- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL injection login bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login form builds its database query by gluing your input straight into the query string.', "Try a classic tautology in the email field, e.g. ' OR '1'='1.", "Use admin@hexafitness.local' OR '1'='1' -- as the email and any password."],
    lesson: 'String-built queries let an attacker rewrite the login logic itself; parameterised queries make input data, never code.',
    impact: 'On a real gym platform this hands an attacker the admin account — every member record, payment detail and health note behind it.',
    report: { title: 'SQL Injection in Login Form Allows Full Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute force — no rate limit or lockout', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Keep guessing Bobs password — does anything slow you down or lock the account?', 'There is no counter anywhere: 10 wrong passwords are processed exactly like the first.', 'Fail 10 logins for bob@test.local in a row and watch every one get a normal response.'],
    lesson: 'Without throttling, lockout or MFA, a password is only as strong as the attacker is patient.',
    impact: 'Member accounts fall to automated guessing; the club faces account takeovers and a personal-data breach.',
    report: { title: 'Missing Brute-Force Protection on Login', severity: 'High', remediation: 'Add progressive rate limiting, account lockout and MFA; alert on repeated failures.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User enumeration via login & forgot-password', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the error for an email that exists with one that does not — on login AND on forgot-password.', 'The two flows answer differently: "No account with that email" vs "Incorrect password".', 'Probe at least 5 different emails across login/forgot-password and catalogue which ones are real members.'],
    lesson: 'Different error messages for "no such user" and "wrong password" turn your login page into a member directory.',
    impact: 'Attackers harvest a verified member email list for phishing and credential stuffing against the club.',
    report: { title: 'Account Enumeration via Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message for all failed logins and password-reset requests.' } },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Published demo credentials (incl. admin)', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Read the login page carefully — the site itself tells you working credentials.', 'The demo box lists every seeded account, including the administrators.', 'Log in as admin@hexafitness.local / admin123 straight from the login page.'],
    lesson: 'Demo and default credentials left in production are an open door with the key taped to it.',
    impact: 'Anyone on the internet can sign in as staff — full control of members, plans and payments.',
    report: { title: 'Default / Demo Credentials Active in Production (Administrator)', severity: 'Critical', remediation: 'Remove demo accounts, force unique strong passwords, and rotate any credential ever published.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable password-reset token', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a reset, then look at the token format — it is computed from something public.', 'The token is HF-<user id>-<a simple arithmetic function of the id>. User ids are sequential.', 'For Bob (id 3) the token is HF-3-(3*137+42) = HF-3-453. POST it to /reset with a new password — no email needed.'],
    lesson: 'Reset tokens must be long, random and single-use; anything derivable from a user id is public knowledge.',
    impact: 'Any member account — including staff — can be taken over by guessing an id, no inbox access required.',
    report: { title: 'Predictable Password-Reset Tokens Allow Account Takeover', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (>=128 bits), store hashed, expire quickly, single use.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Session/role cookie tampering', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After login, inspect your cookies — one of them repeats your role back to the server.', 'The server trusts the hx_role cookie more than its own database.', 'As a plain member, set the cookie hx_role=trainer and open /trainer.'],
    lesson: 'Role and privilege data must live server-side in the session; anything the client sends can be edited by the client.',
    impact: 'Any member becomes "staff" by editing a cookie — trainer dashboards, member notes and schedules all exposed.',
    report: { title: 'Privilege Escalation via Client-Controlled Role Cookie', severity: 'High', remediation: 'Keep roles in the server-side session record only; ignore role claims from cookies or request bodies.' } },

  /* ---- Registration & Profile ---- */
  { id: 'reg-weak', feature: 'Registration & Profile', name: 'Weak password policy (1-character passwords)', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a new account and shrink the password as far as it will go.', 'There is no length or complexity check at all.', 'Register with the password "x" — it is accepted.'],
    lesson: 'A password policy is the cheapest control in the building; without one, brute force and guessing get trivial.',
    impact: 'Members pick guessable passwords, and the club owns the resulting account-takeover incidents.',
    report: { title: 'No Password Policy on Registration', severity: 'Medium', remediation: 'Enforce >=10 characters, screen against breached-password lists, and offer MFA.' } },
  { id: 'reg-mass', feature: 'Registration & Profile', name: 'Mass assignment — role / plan / credits at signup', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The signup form shows name/email/password — the handler copies far more than that.', 'The server assigns the whole request body onto the new account object.', 'POST /register with extra fields role=admin, plan=Premium and credits=999 and check your new powers.'],
    lesson: 'Bind only an explicit allow-list of fields on signup and profile updates; never Object.assign the request body.',
    impact: 'Attackers self-register as administrators with premium plans and free PT credits — total platform compromise at signup.',
    report: { title: 'Mass Assignment in Registration Allows Privilege & Plan Escalation', severity: 'Critical', remediation: 'Allow-list bindable fields server-side; set role, plan and balances only through privileged flows.' } },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in display name', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Your display name is printed back on member lists and the admin screen — is it encoded?', 'Register with an HTML/JS payload as your name.', 'Use a name like <script>alert(1)</script> or <img src=x onerror=alert(1)> and view the member directory.'],
    lesson: 'User-controlled text must be output-encoded on every render; one stored payload fires for every viewer, including admins.',
    impact: 'An attacker plants script that runs in staff browsers — session theft and actions performed as the club admin.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-encode all user output; add a Content-Security-Policy; sanitise stored rich text.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on profile update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Your own forms carry a hidden hx_marker field backed by a cookie. What happens if a POST arrives without it?', 'The profile handler never checks the marker or the Origin.', 'POST /profile/update from curl (no marker, foreign Origin) and change your email — it just works.'],
    lesson: 'State-changing forms need an unguessable anti-CSRF token verified server-side; cookies alone ride along automatically.',
    impact: 'A malicious page visited by a logged-in member silently rewrites their profile and contact email.',
    report: { title: 'Cross-Site Request Forgery on Profile Update', severity: 'Medium', remediation: 'Issue and verify per-session CSRF tokens on every state-changing request; check Origin as defence in depth.' } },

  /* ---- Membership & Payments ---- */
  { id: 'mem-price', feature: 'Membership & Payments', name: 'Premium membership activated at a tampered price', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['The upgrade form posts the plan AND its price. Only one of those should come from you.', 'The server charges — and honours — whatever price the request claims.', 'As Bob (Free), POST /membership/buy with plan=Premium and price=0.'],
    lesson: 'Prices are server-side truth. Anything priced by the client will be repriced by the client — to zero.',
    impact: 'The club gives away its premium tier for free; at scale this is direct revenue loss and fraud.',
    report: { title: 'Client-Side Price Tampering in Membership Purchase', severity: 'High', remediation: 'Look up prices server-side by plan id; ignore any price sent by the client; reconcile with the payment provider.' } },
  { id: 'mem-extend', feature: 'Membership & Payments', name: 'Membership expiry forged via freeze/extend field', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['The membership freeze form has a legitimate days field — and accepts a second, hidden one.', 'An extendDays parameter is added straight onto your expiry date, unchecked.', 'POST /membership/freeze with days=7 and extendDays=365 and watch memberUntil jump a year.'],
    lesson: 'Every numeric field a client can send is a negotiation; durations and dates that carry money must be bounded server-side.',
    impact: 'Members extend paid membership indefinitely for free — silent, compounding revenue leakage.',
    report: { title: 'Unbounded Client-Supplied Membership Extension', severity: 'High', remediation: 'Compute freeze/extension effects server-side from policy; cap durations; ignore client-supplied date math.' } },
  { id: 'mem-freeze-idor', feature: 'Membership & Payments', name: 'Freeze another member\u2019s membership (IDOR)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The freeze endpoint accepts a userId. Whose did you think it checks?', 'It never compares the target id with your session.', "POST /membership/freeze with userId=4 (Carol) from your own account and check her status."],
    lesson: 'Every object reference in a request must be authorised against the session — "they sent the id" is not permission.',
    impact: 'Members sabotage each other: rivals freeze competitors\u2019 memberships before a competition or billing run.',
    report: { title: 'Insecure Direct Object Reference — Cross-Member Membership Freeze', severity: 'High', remediation: 'Authorise every object access against the session user (or an explicit staff role) before applying changes.' } },

  /* ---- Class Bookings ---- */
  { id: 'class-full', feature: 'Class Bookings', name: 'Booking into a full class (capacity not enforced)', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['HIIT Blast seats 2 and both seats are taken. What does the booking endpoint think?', 'Capacity is displayed in the UI but never checked on the server.', 'POST /classes/2/book as Bob — a third seat appears.'],
    lesson: 'Business invariants (capacity, stock, seats) must be enforced where the state changes — on the server, transactionally.',
    impact: 'Classes overbook beyond safe capacity: fire-code and injury risk, refunds and angry members at the door.',
    report: { title: 'Class Capacity Limit Not Enforced Server-Side', severity: 'Medium', remediation: 'Check capacity atomically at booking time; reject when full and offer a waitlist.' } },
  { id: 'class-cancel-idor', feature: 'Class Bookings', name: 'Cancel another member\u2019s booking (IDOR)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Bookings have small sequential ids and a cancel endpoint that trusts them.', 'Ownership is never compared with your session.', "Cancel booking id 2 — that seat belongs to Carol."],
    lesson: 'Cancel/modify endpoints are IDOR magnets: always verify the record belongs to the caller.',
    impact: 'Harassment and denial of service between members — booked spots vanish minutes before class.',
    report: { title: 'Insecure Direct Object Reference — Cancel Any Booking', severity: 'Medium', remediation: 'Scope all booking operations to the session user; verify ownership before mutation.' } },

  /* ---- Personal Training ---- */
  { id: 'pt-nocredit', feature: 'Personal Training', name: 'PT session booked with zero credits', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['PT sessions are paid from a credit balance. Bob has 0 credits — try booking anyway.', 'The booking handler never looks at the balance.', 'As Bob, POST /pt/book with trainerId=5 and watch the session appear.'],
    lesson: 'Paid actions must check entitlement at the moment of the transaction, server-side, every time.',
    impact: 'Unlimited free personal training — the club\u2019s highest-margin product given away by a missing if-statement.',
    report: { title: 'Personal-Training Booking Without Credit/Balance Check', severity: 'High', remediation: 'Verify and decrement credits atomically in the booking transaction; reject insufficient balance.' } },
  { id: 'pt-price', feature: 'Personal Training', name: 'PT session price tampering', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['A PT session costs $60 — according to a field in the booking request.', 'The server stores and charges the price you send.', 'As Alice, POST /pt/book with trainerId=6 and price=1.'],
    lesson: 'Like membership prices, service prices must be resolved server-side from the catalogue, never from the request.',
    impact: 'Members buy premium coaching for $1; trainers\u2019 earnings and reports are corrupted downstream.',
    report: { title: 'Client-Side Price Tampering in PT Booking', severity: 'High', remediation: 'Resolve PT pricing server-side by trainer/service id; reject client-supplied amounts.' } },

  /* ---- Progress & Trainer Notes ---- */
  { id: 'prog-idor', feature: 'Progress & Trainer Notes', name: 'View another member\u2019s progress (IDOR)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Your progress page lives at /progress/<your id>. The ids are sequential.', 'The page never checks that the id is yours.', 'Open /progress/4 as Alice and read Carol\u2019s weight history.'],
    lesson: 'Health-adjacent data (weight, measurements) is sensitive personal data — object-level authorisation is mandatory.',
    impact: 'Members\u2019 body data leaks between members: embarrassment, stalking risk and a data-protection breach for the club.',
    report: { title: 'Insecure Direct Object Reference — Cross-Member Progress Data', severity: 'High', remediation: 'Authorise progress records against the session user or assigned trainer before serving.' } },
  { id: 'notes-idor', feature: 'Progress & Trainer Notes', name: 'Read another member\u2019s private trainer notes (IDOR)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Trainer notes are labelled staff-only — including a medical rehab note about Bob.', 'The notes page takes a member id and checks nothing.', 'Open /notes/3 as any member and read Bob\u2019s private rehab note.'],
    lesson: '"Private" in the UI copy is not access control. Notes about health need the strictest object checks in the app.',
    impact: 'Medical and rehab notes exposed to all members — a serious privacy breach with regulatory consequences.',
    report: { title: 'Private Trainer Notes Exposed via IDOR', severity: 'High', remediation: 'Restrict note reads to the member themselves and staff roles; verify per-record ownership.' } },
  { id: 'notes-xss', feature: 'Progress & Trainer Notes', name: 'Stored XSS in trainer notes', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Trainers write free-text notes that members and admins read back — rendered raw.', 'A payload planted by a trainer fires in the browsers of everyone who opens the notes.', 'As Tom, POST /trainer/notes for member 2 with text containing <script>alert(1)</script>, then open /notes/2.'],
    lesson: 'Free-text staff fields are stored-XSS carriers too; encode on output no matter who typed it.',
    impact: 'A rogue or compromised trainer account attacks members and admins through a trusted internal feature.',
    report: { title: 'Stored Cross-Site Scripting in Trainer Notes', severity: 'High', remediation: 'Output-encode note text everywhere it renders; deploy a restrictive CSP.' } },

  /* ---- Guest Passes ---- */
  { id: 'guest-reuse', feature: 'Guest Passes', name: 'Guest pass redeemed twice (no single-use check)', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['Alice has pass GP-2-1, unused. Redeem it — then redeem it again.', 'The used flag is written but never read.', 'POST /guest/redeem with code GP-2-1 twice; both succeed.'],
    lesson: 'Single-use tokens must be consumed atomically and checked on every redemption.',
    impact: 'One pass admits an endless stream of guests — lost day-pass revenue and unknown people in the facility.',
    report: { title: 'Guest Pass Reuse — Single-Use Not Enforced', severity: 'Medium', remediation: 'Mark passes used in the same transaction as redemption and reject already-used codes.' } },
  { id: 'guest-forge', feature: 'Guest Passes', name: 'Forged / predictable guest pass accepted', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['Pass codes look like GP-<member id>-<number>. What does the desk actually verify?', 'Only the format and that the member exists — never that the pass was issued.', 'Redeem GP-3-99: Bob never issued a pass 99, yet it is accepted.'],
    lesson: 'Identifiers that double as secrets must be unguessable and verified against issued records.',
    impact: 'Anyone who knows a member id mints valid guest passes — unauthorised access to the premises.',
    report: { title: 'Predictable Guest Pass Codes Accepted Without Issuance Check', severity: 'Medium', remediation: 'Issue passes with random codes stored server-side; redeem only codes that exist and are unused.' } },

  /* ---- Search ---- */
  { id: 'search-sqli', feature: 'Search', name: 'SQL injection in search dumps all members', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Search builds its member query the same sloppy way login does.', "A tautology in q turns a name search into a full member list.", "Search for ' OR '1'='1 and read every member\u2019s email and plan."],
    lesson: 'Every input that reaches a query needs parameterisation — search boxes are the most-tested input on any site.',
    impact: 'The entire member directory (names, emails, plans) is exfiltrated through the public search box.',
    report: { title: 'SQL Injection in Search Exposes Full Member Directory', severity: 'High', remediation: 'Parameterise search queries; return only the fields the UI needs; log injection attempts.' } },
  { id: 'search-xss', feature: 'Search', name: 'Reflected XSS in search results', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The results page repeats your query back to you — unencoded.', 'Put markup in q and view the page source.', 'Search for <script>alert(1)</script> and watch it land raw in the heading.'],
    lesson: 'Reflected input must be encoded in the response; search pages are the classic delivery vehicle for phishing links.',
    impact: 'Attackers send members crafted links that run script in the club\u2019s own site, stealing sessions.',
    report: { title: 'Reflected Cross-Site Scripting in Search', severity: 'Medium', remediation: 'Encode reflected query text in HTML context; add CSP; validate input length and type.' } },

  /* ---- Admin Panel ---- */
  { id: 'admin-bac', feature: 'Admin Panel', name: 'Admin panel open to any logged-in member', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The admin console is "hidden" — there is no link in the member UI. Hidden is not protected.', 'No role check runs on /admin at all.', 'Log in as Bob and open /admin directly.'],
    lesson: 'Every privileged route needs a server-side role check on every request; obscurity is not a control.',
    impact: 'Every member can view the full member list with emails, plans and account data — mass personal-data exposure.',
    report: { title: 'Broken Access Control — Admin Console Reachable by Members', severity: 'Critical', remediation: 'Enforce role checks in middleware for all admin routes; deny by default.' } },

  /* ---- Platform & API ---- */
  { id: 'api-token', feature: 'Platform & API', name: 'Weak API token (base64 of email) reads any member', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    hints: ['The JSON API authenticates with a Bearer token. It is derived from something you know about every user.', 'The token is simply base64(email) — and the endpoint never checks the token owner against the record requested.', "Send GET /api/members/4 with Authorization: Bearer <base64 of alice@test.local> and read Carol\u2019s record."],
    lesson: 'API tokens must be random, secret and scoped; an identifier is not a credential, and tokens never replace per-object authorisation.',
    impact: 'The full member database is readable by anyone who can guess an email — which the search flaw happily provides.',
    report: { title: 'Predictable API Tokens & Missing Object Authorisation', severity: 'High', remediation: 'Issue random opaque tokens, scope them to the owner, and authorise every object access.' } }
];

const FEATURES = [...new Set(TESTS.map(t => t.feature))];
const TOTAL = TESTS.length;
const _cfgC = ["LTJOVw==", "M01DSQ==", "VkM5WA=="];
function testById(id) { return TESTS.find(t => t.id === id); }

/* ============================ engine helpers ============================ */
function pass(id) {
  if (!state.tests[id]) {
    state.tests[id] = true;
    if (Object.keys(state.tests).length >= TOTAL && !state.completedAt) {
      state.completedAt = new Date().toISOString();
      state.keyRevealed = true;
    }
    saveState();
  }
}
function bump(feature) {
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  saveState();
}
function doneCount() { return Object.keys(state.tests).filter(k => state.tests[k]).length; }
function pct() { return Math.floor(doneCount() * 100 / TOTAL); }
function isComplete() { return doneCount() >= TOTAL; }
function completionKey() { return _joinParts(_cfgB.concat(_cfgC)); }

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const XSS_RE = /<script|onerror\s*=|onload\s*=|<svg|<img[^>]*>|<iframe|javascript:/i;
const SQLI_RE = /'\s*or\s*'?[\w]+'?\s*=\s*'?[\w]+'?|'\s*or\s*1\s*=\s*1|--|\bunion\b\s+\bselect\b/i;

/* ------------------------------ sessions ------------------------------ */
const sessions = new Map(); // sid -> userId
let sidSeq = 1;
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function currentUser(req) {
  const c = parseCookies(req);
  if (!c.hx_session) return null;
  const uid = sessions.get(c.hx_session);
  if (!uid) return null;
  return users.find(u => u.id === uid) || null;
}
function effectiveRole(req, user) {
  const c = parseCookies(req);
  return c.hx_role || (user ? user.role : null); // FLAW (by design): client cookie trusted
}
function startSession(res, user) {
  const sid = 's' + (sidSeq++) + 'x' + Date.now().toString(36);
  sessions.set(sid, user.id);
  res.setHeader('Set-Cookie', [
    'hx_session=' + sid + '; Path=/; HttpOnly',
    'hx_role=' + user.role + '; Path=/',
    'hx_origin=site; Path=/'
  ]);
}

/* in-memory detection counters (brute force / enumeration) */
const failCount = {};
const probeSets = {};
function probe(req, email) {
  const key = req.socket.remoteAddress || 'x';
  probeSets[key] = probeSets[key] || new Set();
  probeSets[key].add(String(email || '').toLowerCase());
  if (probeSets[key].size >= 5) pass('auth-enum');
}

/* ------------------------------- layout ------------------------------- */
function header() {
  const d = doneCount(), p = pct();
  return '<div style="background:#101828;color:#fff;padding:10px 16px;display:flex;align-items:center;gap:14px;font-family:Arial,sans-serif">' +
    '<img src="/logo.png" style="height:34px">' +
    '<strong>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</strong>' +
    '<span>' + d + '/' + TOTAL + ' tests · ' + p + '%</span>' +
    '<span style="flex:1;background:#344054;border-radius:6px;height:10px;overflow:hidden"><span style="display:block;height:100%;width:' + p + '%;background:#7c5cff"></span></span>' +
    '<a style="color:#fff" href="/tests">Mission Board</a></div>';
}
function page(req, title, body, user) {
  const nav = user
    ? '<div style="font-family:Arial,sans-serif;padding:8px 16px;background:#f2f4f7;border-bottom:1px solid #ddd">Logged in as <b>' + esc(user.name) + '</b> (' + esc(user.role) + ' · ' + esc(user.plan) + ') · ' +
      '<a href="/">Home</a> · <a href="/classes">Classes</a> · <a href="/my/bookings">My bookings</a> · <a href="/progress/' + user.id + '">My progress</a> · <a href="/notes/' + user.id + '">Trainer notes</a> · <a href="/pt">Personal training</a> · <a href="/guest">Guest passes</a> · <a href="/search">Search</a> · <a href="/profile">Profile</a> · <a href="/logout">Logout</a></div>'
    : '<div style="font-family:Arial,sans-serif;padding:8px 16px;background:#f2f4f7;border-bottom:1px solid #ddd"><a href="/login">Login</a> · <a href="/register">Register</a> · <a href="/search">Search</a></div>';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + ' · LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</title></head>' +
    '<body style="margin:0;font-family:Arial,sans-serif;background:#f8f9fb">' + header() + nav +
    '<div style="max-width:900px;margin:22px auto;background:#fff;border:1px solid #e4e7ec;border-radius:10px;padding:24px">' + body + '</div>' +
    chatWidget() + '</body></html>';
}
function chatWidget() {
  return '<div id="hxchat" style="position:fixed;right:16px;bottom:16px;width:300px;font-family:Arial,sans-serif;z-index:50">' +
    '<div style="background:#101828;color:#fff;padding:8px 12px;border-radius:10px 10px 0 0;cursor:pointer" onclick="var b=document.getElementById(\'hxchatbody\');b.style.display=b.style.display==\'none\'?\'block\':\'none\'">💬 Lab Coach</div>' +
    '<div id="hxchatbody" style="display:none;background:#fff;border:1px solid #ccc;border-top:none;border-radius:0 0 10px 10px;padding:10px">' +
    '<div id="hxlog" style="height:170px;overflow:auto;font-size:13px;margin-bottom:8px"></div>' +
    '<input id="hxmsg" placeholder="Ask the coach…" style="width:72%;padding:6px"><button onclick="hxSend()" style="padding:6px 10px">Send</button></div></div>' +
    '<script>async function hxSend(){var m=document.getElementById("hxmsg");var log=document.getElementById("hxlog");var t=m.value;if(!t)return;m.value="";log.innerHTML+="<div><b>You:</b> "+t.replace(/</g,"&lt;")+"</div>";try{var r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:t})});var j=await r.json();log.innerHTML+="<div style=\\"margin:4px 0\\"><b>Coach:</b> "+String(j.reply).replace(/</g,"&lt;")+"</div>";}catch(e){log.innerHTML+="<div><b>Coach:</b> (unavailable)</div>";}log.scrollTop=log.scrollHeight;}</script>';
}
function gatePage() {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' · Locked</title></head>' +
    '<body style="margin:0;background:#14141d;font-family:Arial,sans-serif"><div style="max-width:520px;margin:60px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:28px;text-align:center">' +
    '<img src="/logo.png" style="height:56px"><h2>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h2>' +
    '<p>This lab is locked. Paste the completion key from Lab ' + (LAB_NUMBER - 1) + ' to start.</p>' +
    '<form method="POST" action="/unlock"><input name="key" style="padding:9px;width:80%" placeholder="Completion key from Lab ' + (LAB_NUMBER - 1) + '"><br><br>' +
    '<button style="padding:10px 22px">Unlock LAB ' + LAB_NUMBER + '</button></form></div>' + chatWidget() + '</body></html>';
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) { try { return resolve(JSON.parse(data || '{}')); } catch (e) { return resolve({}); } }
      const out = {};
      new URLSearchParams(data).forEach((v, k) => { out[k] = v; });
      resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}

/* ================================ routes ================================ */
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://' + HOST + ':' + PORT);
    const p = u.pathname;
    const method = req.method;

    if (p === '/logo.png') {
      try { const img = fs.readFileSync(path.join(DIR, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(img); }
      catch (e) { return send(res, 404, 'not found'); }
    }
    if (p === '/api/progress') {
      const feats = {};
      FEATURES.forEach(f => {
        feats[f] = { total: TESTS.filter(t => t.feature === f).length, done: TESTS.filter(t => t.feature === f && state.tests[t.id]).length, attempts: state.attempts[f] || 0 };
      });
      return send(res, 200, JSON.stringify({ lab: LAB_NAME, number: LAB_NUMBER, total: TOTAL, done: doneCount(), pct: pct(), features: feats, complete: isComplete() }, null, 2), 'application/json');
    }
    if (p === '/api/chat' && method === 'POST') {
      const b = await readBody(req);
      return send(res, 200, JSON.stringify({ reply: chatReply(String(b.message || '')) }), 'application/json');
    }
    if (p === '/unlock' && method === 'POST') {
      const b = await readBody(req);
      const expected = _joinParts(_cfgA);
      if (String(b.key || '').trim() === expected) {
        state.unlocked = true; saveState();
        return redirect(res, '/');
      }
      return send(res, 403, gatePage());
    }

    /* ---- lock gate ---- */
    if (!state.unlocked) return send(res, 200, gatePage());

    const user = currentUser(req);

    /* ------------------------------ auth ------------------------------ */
    if (p === '/login' && method === 'GET') {
      const msg = u.searchParams.get('e') ? '<p style="color:#b42318">' + esc(u.searchParams.get('e')) + '</p>' : '';
      return send(res, 200, page(req, 'Login',
        '<h2>Member login</h2>' + msg +
        '<form method="POST" action="/login"><input name="email" placeholder="Email" style="padding:8px;width:60%"><br><br>' +
        '<input name="password" type="password" placeholder="Password" style="padding:8px;width:60%"><br><br>' +
        '<button style="padding:9px 20px">Log in</button></form>' +
        '<p><a href="/forgot">Forgot password?</a></p>' +
        '<div style="background:#fffaeb;border:1px solid #f5d98b;padding:10px;border-radius:8px"><b>Demo accounts (for the open day):</b><br>' +
        'Admin — admin@hexafitness.local / admin123<br>Member (Premium) — alice@test.local / alice123<br>Member (Free) — bob@test.local / bob123<br>Trainer — tom@hexafitness.local / trainer123</div>', user));
    }
    if (p === '/login' && method === 'POST') {
      const b = await readBody(req);
      bump('Login & Authentication');
      const email = String(b.email || ''), pw = String(b.password || '');
      probe(req, email);
      // Legacy string-built query path (deliberately vulnerable):
      const query = "SELECT * FROM users WHERE email='" + email + "' AND password='" + pw + "'";
      let found = null;
      if (SQLI_RE.test(email) || SQLI_RE.test(pw)) {
        found = users[0]; // injection rewrites the WHERE clause -> first row (admin)
        if (found) pass('auth-sqli');
      } else {
        found = users.find(x => x.email.toLowerCase() === email.toLowerCase()) || null;
        if (!found) return redirect(res, '/login?e=' + encodeURIComponent('No account with that email'));
        if (found.password !== pw) {
          failCount[found.email] = (failCount[found.email] || 0) + 1;
          if (failCount[found.email] >= 10) pass('auth-brute');
          return redirect(res, '/login?e=' + encodeURIComponent('Incorrect password'));
        }
      }
      if (found.email === 'admin@hexafitness.local' && pw === 'admin123') pass('auth-default');
      startSession(res, found);
      return redirect(res, '/');
    }
    if (p === '/logout') {
      const c = parseCookies(req);
      if (c.hx_session) sessions.delete(c.hx_session);
      res.setHeader('Set-Cookie', ['hx_session=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0']);
      return redirect(res, '/login');
    }
    if (p === '/forgot' && method === 'GET') {
      const m = u.searchParams.get('m') ? '<p>' + esc(u.searchParams.get('m')) + '</p>' : '';
      return send(res, 200, page(req, 'Forgot password', '<h2>Password reset</h2>' + m +
        '<form method="POST" action="/forgot"><input name="email" placeholder="Email" style="padding:8px;width:60%"><br><br><button style="padding:9px 20px">Send reset link</button></form>', user));
    }
    if (p === '/forgot' && method === 'POST') {
      const b = await readBody(req);
      bump('Login & Authentication');
      probe(req, b.email);
      const found = users.find(x => x.email.toLowerCase() === String(b.email || '').toLowerCase());
      // FLAW: response reveals whether the account exists; token is never stored (see /reset).
      if (!found) return redirect(res, '/forgot?m=' + encodeURIComponent('Email not registered'));
      return redirect(res, '/forgot?m=' + encodeURIComponent('Reset link sent — check your inbox'));
    }
    if (p === '/reset' && method === 'POST') {
      const b = await readBody(req);
      bump('Login & Authentication');
      const found = users.find(x => x.email.toLowerCase() === String(b.email || '').toLowerCase());
      if (!found) return send(res, 404, page(req, 'Reset', '<p>No such account.</p>', user));
      // FLAW: token is a public formula of the user id — HF-<id>-<id*137+42>
      const expected = 'HF-' + found.id + '-' + (found.id * 137 + 42);
      if (String(b.token || '') === expected) {
        found.password = String(b.newpassword || 'pwned123');
        pass('auth-reset');
        return send(res, 200, page(req, 'Reset', '<p>Password updated. <a href="/login">Log in</a></p>', user));
      }
      return send(res, 403, page(req, 'Reset', '<p>Invalid token.</p>', user));
    }

    /* --------------------------- registration --------------------------- */
    if (p === '/register' && method === 'GET') {
      return send(res, 200, page(req, 'Register', '<h2>Join HexaFitness</h2>' +
        '<form method="POST" action="/register"><input name="name" placeholder="Full name" style="padding:8px;width:60%"><br><br>' +
        '<input name="email" placeholder="Email" style="padding:8px;width:60%"><br><br>' +
        '<input name="password" type="password" placeholder="Password" style="padding:8px;width:60%"><br><br>' +
        '<button style="padding:9px 20px">Create account</button></form>', user));
    }
    if (p === '/register' && method === 'POST') {
      const b = await readBody(req);
      bump('Registration & Profile');
      if (users.find(x => x.email.toLowerCase() === String(b.email || '').toLowerCase()))
        return send(res, 400, page(req, 'Register', '<p>Email already registered.</p>', user));
      // FLAW: no password policy; FLAW: whole body mass-assigned onto the account.
      const nu = { id: nextUserId++, email: String(b.email || ''), password: String(b.password || ''), name: String(b.name || 'Member'),
        role: 'member', plan: 'Free', credits: 0, memberUntil: '2026-12-31', memberStatus: 'active' };
      Object.keys(b).forEach(k => { if (k !== 'id') nu[k] = (k === 'credits') ? Number(b[k]) || 0 : b[k]; });
      users.push(nu);
      if (String(b.password || '').length < 4) pass('reg-weak');
      if (nu.role !== 'member' || nu.plan === 'Premium' || nu.credits > 0) pass('reg-mass');
      if (XSS_RE.test(nu.name)) pass('reg-xss');
      startSession(res, nu);
      return redirect(res, '/');
    }
    if (p === '/profile' && method === 'GET') {
      if (!user) return redirect(res, '/login');
      return send(res, 200, page(req, 'Profile', '<h2>Your profile</h2>' +
        '<form method="POST" action="/profile/update"><input type="hidden" name="hx_marker" value="site">' +
        '<label>Name <input name="name" value="' + esc(user.name) + '" style="padding:8px;width:55%"></label><br><br>' +
        '<label>Email <input name="email" value="' + esc(user.email) + '" style="padding:8px;width:55%"></label><br><br>' +
        '<button style="padding:9px 20px">Save</button></form>' +
        '<p>Plan: <b>' + esc(user.plan) + '</b> · PT credits: <b>' + user.credits + '</b> · Member until: <b>' + esc(user.memberUntil) + '</b> · Status: <b>' + esc(user.memberStatus) + '</b></p>', user));
    }
    if (p === '/profile/update' && method === 'POST') {
      if (!user) return redirect(res, '/login');
      const b = await readBody(req);
      bump('Registration & Profile');
      const cookies = parseCookies(req);
      const markerOk = b.hx_marker && cookies.hx_origin;
      if (b.name) { user.name = String(b.name); if (XSS_RE.test(user.name)) pass('reg-xss'); }
      if (b.email) user.email = String(b.email);
      // FLAW: update applied even with no marker / foreign Origin.
      if (!markerOk) pass('reg-csrf');
      return redirect(res, '/profile');
    }

    /* ------------------------------ home ------------------------------ */
    if (p === '/' && method === 'GET') {
      const body = '<h2>Train hard. Stay strong.</h2><p>HexaFitness members: book classes, track progress, train with our coaches.</p>' +
        '<p><a href="/classes">Browse classes</a> · <a href="/search">Search classes & members</a></p>' +
        (user ? '<p>Welcome back, <b>' + esc(user.name) + '</b>. Plan: <b>' + esc(user.plan) + '</b> · PT credits: <b>' + user.credits + '</b></p>'
              : '<p><a href="/login">Log in</a> or <a href="/register">join today</a>.</p>');
      return send(res, 200, page(req, 'Home', body, user));
    }

    /* ---------------------------- membership ---------------------------- */
    if (p === '/membership' && method === 'GET') {
      if (!user) return redirect(res, '/login');
      const plans = Object.keys(PLANS).map(k => '<form method="POST" action="/membership/buy" style="display:inline-block;margin:6px;padding:12px;border:1px solid #ddd;border-radius:8px">' +
        '<b>' + k + '</b> — $' + PLANS[k].price + '/mo<input type="hidden" name="plan" value="' + k + '"><input type="hidden" name="price" value="' + PLANS[k].price + '"><br><br><button>Buy ' + k + '</button></form>').join('');
      return send(res, 200, page(req, 'Membership', '<h2>Membership</h2><p>Current plan: <b>' + esc(user.plan) + '</b> · until <b>' + esc(user.memberUntil) + '</b> · status <b>' + esc(user.memberStatus) + '</b></p>' + plans +
        '<h3>Freeze membership</h3><form method="POST" action="/membership/freeze"><input type="hidden" name="userId" value="' + user.id + '">' +
        '<label>Days <input name="days" value="7" style="padding:6px;width:70px"></label> <button>Freeze</button></form>', user));
    }
    if (p === '/membership/buy' && method === 'POST') {
      if (!user) return redirect(res, '/login');
      const b = await readBody(req);
      bump('Membership & Payments');
      const plan = String(b.plan || 'Free');
      const price = Number(b.price);
      if (PLANS[plan] && !isNaN(price) && price < PLANS[plan].price) pass('mem-price'); // FLAW: client price honoured
      if (PLANS[plan]) { user.plan = plan; user.memberStatus = 'active'; user.memberUntil = '2027-12-31'; }
      return redirect(res, '/membership');
    }
    if (p === '/membership/freeze' && method === 'POST') {
      if (!user) return redirect(res, '/login');
      const b = await readBody(req);
      bump('Membership & Payments');
      const target = users.find(x => x.id === Number(b.userId || user.id)) || user;
      const ext = Number(b.extendDays || 0);
      // FLAW: no ownership check on userId.
      if (target.id !== user.id && user.role !== 'admin') pass('mem-freeze-idor');
      target.memberStatus = 'frozen';
      // FLAW: client-supplied extendDays added straight onto the expiry date.
      if (ext > 0) {
        const d = new Date(target.memberUntil + 'T00:00:00');
        d.setDate(d.getDate() + ext);
        target.memberUntil = d.toISOString().slice(0, 10);
        if (ext > 31) pass('mem-extend');
      }
      return redirect(res, '/membership');
    }

    /* ----------------------------- classes ----------------------------- */
    if (p === '/classes' && method === 'GET') {
      const rows = classes.map(c => {
        const booked = bookings.filter(bk => bk.classId === c.id).length;
        const t = users.find(x => x.id === c.trainerId);
        return '<tr><td>' + esc(c.name) + '</td><td>' + esc(t ? t.name : '') + '</td><td>' + esc(c.time) + '</td><td>' + booked + '/' + c.capacity + (booked >= c.capacity ? ' <b>FULL</b>' : '') + '</td><td>' + (c.premiumOnly ? 'Premium only' : 'All plans') + '</td>' +
          '<td><form method="POST" action="/classes/' + c.id + '/book"><button>Book</button></form></td></tr>';
      }).join('');
      return send(res, 200, page(req, 'Classes', '<h2>Class schedule</h2><table border="1" cellpadding="7" style="border-collapse:collapse"><tr><th>Class</th><th>Trainer</th><th>Time</th><th>Seats</th><th>Access</th><th></th></tr>' + rows + '</table>', user));
    }
    const bookM = p.match(/^\/classes\/(\d+)\/book$/);
    if (bookM && method === 'POST') {
      if (!user) return redirect(res, '/login');
      bump('Class Bookings');
      const c = classes.find(x => x.id === Number(bookM[1]));
      if (!c) return send(res, 404, page(req, 'Not found', '<p>No such class.</p>', user));
      const before = bookings.filter(bk => bk.classId === c.id).length;
      // FLAW: capacity and plan restrictions never checked server-side.
      bookings.push({ id: nextBookingId++, classId: c.id, userId: user.id });
      if (before >= c.capacity) pass('class-full');
      return redirect(res, '/my/bookings');
    }
    if (p === '/my/bookings' && method === 'GET') {
      if (!user) return redirect(res, '/login');
      const mine = bookings.filter(bk => bk.userId === user.id);
      const rows = mine.map(bk => { const c = classes.find(x => x.id === bk.classId); return '<li>Booking #' + bk.id + ' — ' + esc(c ? c.name : '?') + ' (' + esc(c ? c.time : '') + ') <form method="POST" action="/bookings/' + bk.id + '/cancel" style="display:inline"><button>Cancel</button></form></li>'; }).join('');
      return send(res, 200, page(req, 'My bookings', '<h2>My bookings</h2><ul>' + (rows || '<li>No bookings yet.</li>') + '</ul>', user));
    }
    const cancelM = p.match(/^\/bookings\/(\d+)\/cancel$/);
    if (cancelM && method === 'POST') {
      if (!user) return redirect(res, '/login');
      bump('Class Bookings');
      const bk = bookings.find(x => x.id === Number(cancelM[1]));
      if (bk) {
        // FLAW: ownership never checked.
        if (bk.userId !== user.id) pass('class-cancel-idor');
        bookings = bookings.filter(x => x.id !== bk.id);
      }
      return redirect(res, '/my/bookings');
    }

    /* ------------------------ personal training ------------------------ */
    if (p === '/pt' && method === 'GET') {
      if (!user) return redirect(res, '/login');
      const trainers = users.filter(x => x.role === 'trainer').map(t => '<option value="' + t.id + '">' + esc(t.name) + '</option>').join('');
      const mine = ptSessions.filter(s => s.userId === user.id).map(s => { const t = users.find(x => x.id === s.trainerId); return '<li>Session #' + s.id + ' with ' + esc(t ? t.name : '') + ' — $' + s.price + '</li>'; }).join('');
      return send(res, 200, page(req, 'Personal training', '<h2>Personal training</h2><p>Your PT credits: <b>' + user.credits + '</b> · Standard price: <b>$' + PT_PRICE + '</b> per session</p>' +
        '<form method="POST" action="/pt/book"><label>Trainer <select name="trainerId">' + trainers + '</select></label> ' +
        '<input type="hidden" name="price" value="' + PT_PRICE + '"><button>Book session</button></form>' +
        '<h3>Your sessions</h3><ul>' + (mine || '<li>None yet.</li>') + '</ul>', user));
    }
    if (p === '/pt/book' && method === 'POST') {
      if (!user) return redirect(res, '/login');
      const b = await readBody(req);
      bump('Personal Training');
      const price = (b.price !== undefined && b.price !== '') ? Number(b.price) : PT_PRICE;
      // FLAW: credit balance never checked; FLAW: client-supplied price honoured.
      if (user.credits <= 0) pass('pt-nocredit');
      if (!isNaN(price) && price < PT_PRICE) pass('pt-price');
      if (user.credits > 0) user.credits -= 1;
      ptSessions.push({ id: nextPtId++, userId: user.id, trainerId: Number(b.trainerId || 5), price: isNaN(price) ? PT_PRICE : price });
      return redirect(res, '/pt');
    }

    /* --------------------- progress & trainer notes --------------------- */
    const progM = p.match(/^\/progress\/(\d+)$/);
    if (progM && method === 'GET') {
      if (!user) return redirect(res, '/login');
      bump('Progress & Trainer Notes');
      const target = users.find(x => x.id === Number(progM[1]));
      if (!target) return send(res, 404, page(req, 'Not found', '<p>No such member.</p>', user));
      // FLAW: any member can open any member's progress by id.
      if (target.id !== user.id && user.role === 'member') pass('prog-idor');
      const rows = progressEntries.filter(e => e.userId === target.id).map(e => '<li>' + esc(e.date) + ' — <b>' + e.weight + ' kg</b> — ' + esc(e.note) + '</li>').join('');
      return send(res, 200, page(req, 'Progress', '<h2>Progress — ' + esc(target.name) + '</h2><ul>' + (rows || '<li>No entries.</li>') + '</ul>', user));
    }
    const notesM = p.match(/^\/notes\/(\d+)$/);
    if (notesM && method === 'GET') {
      if (!user) return redirect(res, '/login');
      bump('Progress & Trainer Notes');
      const target = users.find(x => x.id === Number(notesM[1]));
      if (!target) return send(res, 404, page(req, 'Not found', '<p>No such member.</p>', user));
      // FLAW: private staff notes served to anyone who guesses the id.
      if (target.id !== user.id && user.role === 'member') pass('notes-idor');
      const rows = trainerNotes.filter(n => n.memberId === target.id).map(n => '<li>' + n.text + '</li>').join(''); // rendered raw (stored-XSS delivery)
      return send(res, 200, page(req, 'Trainer notes', '<h2>Trainer notes — ' + esc(target.name) + '</h2><ul>' + (rows || '<li>No notes.</li>') + '</ul>', user));
    }
    if (p === '/trainer' && method === 'GET') {
      if (!user) return redirect(res, '/login');
      const role = effectiveRole(req, user);
      if (role !== 'trainer' && role !== 'admin') return send(res, 403, page(req, 'Forbidden', '<p>Trainers only.</p>', user));
      if (user.role !== 'trainer' && user.role !== 'admin') pass('auth-cookie'); // reached only via forged role cookie
      const memberOpts = users.filter(x => x.role === 'member').map(m => '<option value="' + m.id + '">' + esc(m.name) + '</option>').join('');
      return send(res, 200, page(req, 'Trainer dashboard', '<h2>Trainer dashboard</h2>' +
        '<form method="POST" action="/trainer/notes"><label>Member <select name="memberId">' + memberOpts + '</select></label><br><br>' +
        '<textarea name="text" rows="3" style="width:70%" placeholder="Private note about this member"></textarea><br><br><button>Add note</button></form>', user));
    }
    if (p === '/trainer/notes' && method === 'POST') {
      if (!user) return redirect(res, '/login');
      const role = effectiveRole(req, user);
      if (role !== 'trainer' && role !== 'admin') return send(res, 403, page(req, 'Forbidden', '<p>Trainers only.</p>', user));
      const b = await readBody(req);
      bump('Progress & Trainer Notes');
      const text = String(b.text || '');
      trainerNotes.push({ id: nextNoteId++, memberId: Number(b.memberId || user.id), trainerId: user.id, text });
      if (XSS_RE.test(text)) pass('notes-xss'); // stored raw; delivered on /notes/<id>
      return redirect(res, '/trainer');
    }

    /* ---------------------------- guest passes ---------------------------- */
    if (p === '/guest' && method === 'GET') {
      if (!user) return redirect(res, '/login');
      const mine = guestPasses.filter(g => g.ownerId === user.id).map(g => '<li>' + esc(g.code) + ' — ' + (g.used ? 'used' : 'unused') + '</li>').join('');
      return send(res, 200, page(req, 'Guest passes', '<h2>Guest passes</h2><h3>Your passes</h3><ul>' + (mine || '<li>None.</li>') + '</ul>' +
        '<h3>Front desk — redeem a pass</h3><form method="POST" action="/guest/redeem"><input name="code" placeholder="GP-…" style="padding:8px"><button>Redeem</button></form>', user));
    }
    if (p === '/guest/redeem' && method === 'POST') {
      if (!user) return redirect(res, '/login');
      const b = await readBody(req);
      bump('Guest Passes');
      const code = String(b.code || '').trim();
      const m = code.match(/^GP-(\d+)-(\d+)$/);
      if (!m) return send(res, 400, page(req, 'Guest passes', '<p>Invalid pass format.</p>', user));
      const owner = users.find(x => x.id === Number(m[1]));
      if (!owner) return send(res, 400, page(req, 'Guest passes', '<p>Unknown member on pass.</p>', user));
      const existing = guestPasses.find(g => g.code === code);
      if (existing) {
        // FLAW: the used flag is written but never checked.
        if (existing.used) pass('guest-reuse');
        existing.used = true;
        return send(res, 200, page(req, 'Guest passes', '<p>Pass ' + esc(code) + ' redeemed — guest admitted for ' + esc(owner.name) + '.</p>', user));
      }
      // FLAW: plausible format + real member id is enough — issuance never verified.
      pass('guest-forge');
      guestPasses.push({ code, ownerId: owner.id, used: true });
      return send(res, 200, page(req, 'Guest passes', '<p>Pass ' + esc(code) + ' redeemed — guest admitted for ' + esc(owner.name) + '.</p>', user));
    }

    /* ------------------------------- search ------------------------------- */
    if (p === '/search' && method === 'GET') {
      const q = u.searchParams.get('q');
      let body = '<h2>Search classes & members</h2><form method="GET" action="/search"><input name="q" value="' + esc(q || '') + '" style="padding:8px;width:55%"><button>Search</button></form>';
      if (q !== null) {
        bump('Search');
        let cls = classes.filter(c => c.name.toLowerCase().includes(q.toLowerCase()));
        let mem = users.filter(x => x.role === 'member' && (x.name.toLowerCase().includes(q.toLowerCase()) || x.email.toLowerCase().includes(q.toLowerCase())));
        if (SQLI_RE.test(q)) { cls = classes; mem = users.filter(x => x.role === 'member'); pass('search-sqli'); } // string-built query returns everything
        if (XSS_RE.test(q)) pass('search-xss');
        body += '<h3>Results for "' + q + '"</h3>'; // FLAW: query reflected unescaped
        body += '<h4>Classes</h4><ul>' + (cls.map(c => '<li>' + esc(c.name) + ' — ' + esc(c.time) + '</li>').join('') || '<li>None</li>') + '</ul>';
        body += '<h4>Members</h4><ul>' + (mem.map(mm => '<li>' + mm.name + ' — ' + esc(mm.email) + ' — ' + esc(mm.plan) + '</li>').join('') || '<li>None</li>') + '</ul>'; // member names rendered raw (stored-XSS delivery)
      }
      return send(res, 200, page(req, 'Search', body, user));
    }

    /* ------------------------------- admin ------------------------------- */
    if (p === '/admin' && method === 'GET') {
      if (!user) return redirect(res, '/login');
      bump('Admin Panel');
      // FLAW: no role check at all — any logged-in account reaches the console.
      if (user.role !== 'admin') pass('admin-bac');
      const rows = users.map(x => '<tr><td>' + x.id + '</td><td>' + x.name + '</td><td>' + esc(x.email) + '</td><td>' + esc(x.role) + '</td><td>' + esc(x.plan) + '</td><td>' + esc(x.memberStatus) + '</td></tr>').join('');
      return send(res, 200, page(req, 'Admin console', '<h2>Admin console — all accounts</h2><table border="1" cellpadding="7" style="border-collapse:collapse"><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Plan</th><th>Status</th></tr>' + rows + '</table>', user));
    }

    /* -------------------------------- API -------------------------------- */
    const apiM = p.match(/^\/api\/members\/(\d+)$/);
    if (apiM && method === 'GET') {
      bump('Platform & API');
      const auth = req.headers.authorization || '';
      const token = auth.replace(/^Bearer\s+/i, '');
      let tokenUser = null;
      try { tokenUser = users.find(x => x.email.toLowerCase() === Buffer.from(token, 'base64').toString('utf8').toLowerCase()) || null; } catch (e) { tokenUser = null; }
      if (!tokenUser) return send(res, 401, JSON.stringify({ error: 'invalid token' }), 'application/json');
      const target = users.find(x => x.id === Number(apiM[1]));
      if (!target) return send(res, 404, JSON.stringify({ error: 'not found' }), 'application/json');
      // FLAW: token is just base64(email), and ownership is never checked.
      if (tokenUser.id !== target.id) pass('api-token');
      return send(res, 200, JSON.stringify({ id: target.id, name: target.name, email: target.email, role: target.role, plan: target.plan, credits: target.credits, memberUntil: target.memberUntil }), 'application/json');
    }

    /* ------------------------------ /tests ------------------------------ */
    if (p === '/tests' && method === 'GET') {
      let body = '<h2>Mission Board — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h2><p>' + doneCount() + '/' + TOTAL + ' tests complete · ' + pct() + '%</p>';
      FEATURES.forEach(f => {
        body += '<h3>' + esc(f) + ' <small>(attempts: ' + (state.attempts[f] || 0) + ')</small></h3>';
        TESTS.filter(t => t.feature === f).forEach(t => {
          const done = state.tests[t.id];
          const hints = t.hints.map((h, i) => '<details><summary>Hint ' + (i + 1) + '</summary><p>' + esc(h) + '</p></details>').join('');
          body += '<div style="border:1px solid #e4e7ec;border-radius:8px;padding:10px;margin:8px 0"><b>' + (done ? '✓' : '○') + ' ' + esc(t.name) + '</b> · ' + esc(t.owasp) + ' · ' + esc(t.difficulty) + (done ? ' · <b style="color:green">DONE</b>' : '') + hints + '</div>';
        });
      });
      return send(res, 200, page(req, 'Mission Board', body, user));
    }

    /* ----------------------------- /set-name ----------------------------- */
    if (p === '/set-name' && method === 'POST') {
      const b = await readBody(req);
      if (b.name) { state.testerName = String(b.name).slice(0, 60); saveState(); }
      return redirect(res, '/complete');
    }

    /* ----------------------------- /complete ----------------------------- */
    if (p === '/complete' && method === 'GET') {
      if (!isComplete()) {
        const left = TESTS.filter(t => !state.tests[t.id]).map(t => '<li>' + esc(t.name) + ' (' + esc(t.feature) + ')</li>').join('');
        return send(res, 200, page(req, 'Completion', '<h2>Not complete yet — ' + pct() + '%</h2><p>' + doneCount() + '/' + TOTAL + ' tests done. Still to solve:</p><ul>' + left + '</ul>', user));
      }
      const perFeature = FEATURES.map(f => '<li><b>' + esc(f) + '</b>: ' + TESTS.filter(t => t.feature === f).length + ' vulnerabilities</li>').join('');
      const ways = TESTS.map(t => '<li>' + esc(t.name) + ' — ' + esc(t.owasp) + '</li>').join('');
      const learned = TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.lesson) + '</li>').join('');
      const client = TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.impact) + '</li>').join('');
      const reports = TESTS.map(t => '<li><b>' + esc(t.report.title) + '</b> [' + esc(t.report.severity) + '] — Fix: ' + esc(t.report.remediation) + '</li>').join('');
      const body = '<h2>🎉 Lab complete — 100%</h2>' +
        '<h3>1) Features in this lab</h3><p>' + FEATURES.length + ' features: ' + FEATURES.map(esc).join(', ') + '</p>' +
        '<h3>2) Vulnerabilities per feature</h3><ul>' + perFeature + '</ul>' +
        '<h3>3) Ways testing was done (' + TOTAL + ' tests)</h3><ul>' + ways + '</ul>' +
        '<h3>4) What you learned</h3><ul>' + learned + '</ul>' +
        '<h3>5) What this means for a real client</h3><ul>' + client + '</ul>' +
        '<h3>6) Writing it in a real report</h3><ul>' + reports + '</ul>' +
        '<h3>Your completion key (unlocks Lab ' + (LAB_NUMBER + 1) + ')</h3>' +
        '<p style="font-size:20px;background:#eef;border:1px dashed #7c5cff;padding:12px;text-align:center"><b>' + esc(completionKey()) + '</b></p>' +
        '<form method="POST" action="/set-name"><label>Your name for the certificate <input name="name" value="' + esc(state.testerName) + '" style="padding:7px"></label> <button>Save name</button></form>' +
        '<p><a href="/certificate">View your certificate →</a></p>';
      return send(res, 200, page(req, 'Lab complete', body, user));
    }

    /* ---------------------------- /certificate ---------------------------- */
    if (p === '/certificate' && method === 'GET') {
      if (!isComplete()) return redirect(res, '/complete');
      const name = state.testerName || (user ? user.name : 'HexaCyberLab Tester');
      const date = state.completedAt ? state.completedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
      const body = '<div style="border:3px solid #7c5cff;border-radius:14px;padding:34px;text-align:center;background:#fff">' +
        '<img src="/logo.png" style="height:70px"><h1 style="margin:10px 0">Certificate of Completion</h1>' +
        '<p>This certifies that</p><h2 style="margin:6px 0">' + esc(name) + '</h2>' +
        '<p>has completed 100% of the security tests in</p><h3>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h3>' +
        '<p>' + TOTAL + ' tests across ' + FEATURES.length + ' features</p><p>Completed on ' + esc(date) + '</p>' +
        '<p style="margin-top:18px"><b>HexaCyberLab</b> — Built by Md. Jony Hassain, Founder</p></div>' +
        '<p style="text-align:center"><button onclick="window.print()">Print certificate</button></p>';
      return send(res, 200, page(req, 'Certificate', body, user));
    }

    return send(res, 404, page(req, 'Not found', '<h2>404 — page not found</h2>', user));
  } catch (e) {
    try { send(res, 500, 'Internal error'); } catch (e2) { /* socket gone */ }
  }
});

/* ================================ chatbot ================================ */
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
const CHAT_FEATURES = [
  ['Login & Authentication', ['login', 'auth', 'password', 'sign in', 'reset token', 'brute']],
  ['Registration & Profile', ['register', 'registration', 'sign up', 'profile', 'mass assignment']],
  ['Membership & Payments', ['membership', 'plan', 'premium', 'price', 'freeze', 'payment']],
  ['Class Bookings', ['class', 'booking', 'book', 'cancel']],
  ['Personal Training', ['personal training', 'pt session', 'pt ', 'credits', 'coach session']],
  ['Progress & Trainer Notes', ['progress', 'note', 'trainer note']],
  ['Guest Passes', ['guest', 'pass']],
  ['Search', ['search']],
  ['Admin Panel', ['admin']],
  ['Platform & API', ['api', 'token', 'endpoint']]
];
function chatReply(raw) {
  const msg = ' ' + String(raw || '').toLowerCase() + ' ';
  if (/who (built|made|created)|founder|who is jony|who is md/.test(msg)) return ATTRIBUTION;
  if (msg.includes('key')) {
    if (isComplete()) return 'You completed LAB ' + LAB_NUMBER + ' — here is your completion key: ' + completionKey() + ' — use it to unlock Lab ' + (LAB_NUMBER + 1) + '.';
    return 'I don\u2019t have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at ' + pct() + '%. Finish every test on the Mission Board (/tests) and the key is yours.';
  }
  const howTo = /how|solve|guide|step|help me|exploit|bypass|beat|do the|attack/.test(msg);
  let feature = null;
  for (const [f, keys] of CHAT_FEATURES) { if (keys.some(k => msg.includes(k))) { feature = f; break; } }
  if (howTo && feature) {
    const tests = TESTS.filter(t => t.feature === feature);
    const open = tests.filter(t => !state.tests[t.id]);
    const attempts = state.attempts[feature] || 0;
    if (!open.length) return 'You have already solved every ' + feature + ' test — nice work. Pick another feature from /tests.';
    if (attempts >= 3) {
      return 'Step by step for ' + feature + ':\n' + open.map(t => '• ' + t.name + ' — ' + t.hints[2]).join('\n') + '\nWork through those and your progress bar will move.';
    }
    return 'That feature is locked for help. First try the ' + feature + ' tests yourself at least 3 times — I can see you\u2019ve tried ' + attempts + ' time(s) so far. After 3 real tries, ask me again and I\u2019ll guide you step by step.';
  }
  if (/how many|features|vulnerabilit|tests|list|what.*(in|does)/.test(msg) || feature) {
    if (feature) {
      const tests = TESTS.filter(t => t.feature === feature);
      return feature + ' has ' + tests.length + ' tests: ' + tests.map(t => t.name).join('; ') + '. (Attempts so far: ' + (state.attempts[feature] || 0) + ' — how-to help unlocks at 3 attempts.)';
    }
    return 'LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ' has ' + FEATURES.length + ' features and ' + TOTAL + ' tests: ' + FEATURES.map(f => f + ' (' + TESTS.filter(t => t.feature === f).length + ')').join(', ') + '. You have completed ' + doneCount() + '/' + TOTAL + ' (' + pct() + '%). Full map: /tests.';
  }
  if (/progress|how am i|score/.test(msg)) {
    const next = TESTS.find(t => !state.tests[t.id]);
    return 'You are at ' + pct() + '% (' + doneCount() + '/' + TOTAL + ').' + (next ? ' Next open test: "' + next.name + '" in ' + next.feature + ' — see /tests for its hints.' : ' Everything is solved — open /complete for your key and certificate.');
  }
  if (/hi|hello|hey/.test(msg)) return 'Hello! I am the Lab Coach for LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ' (' + TOTAL + ' tests across ' + FEATURES.length + ' features). You are at ' + pct() + '%. Ask me about a feature, or try its tests 3 times and I will guide you step by step.';
  return 'I can help with LAB ' + LAB_NUMBER + ' facts: ask "how many tests", name a feature to see its tests, or ask how to solve a feature (help unlocks after you have tried that feature at least 3 times — attempts so far are tracked honestly). Your progress: ' + pct() + '%. The full map is on /tests.';
}

/* ============================ docs generation ============================ */
function genDocs() {
  const byFeature = f => TESTS.filter(t => t.feature === f);
  let vuln = '# ' + LAB_NAME + ' — Vulnerabilities (full test map)\n\nLAB ' + LAB_NUMBER + ' · Category 7: Healthcare & Wellness · ' + TOTAL + ' scored tests across ' + FEATURES.length + ' features.\nEvery entry below is a real, working vulnerability in this app, detected server-side when the exploit succeeds.\n';
  FEATURES.forEach(f => {
    vuln += '\n## ' + f + '\n';
    byFeature(f).forEach(t => { vuln += '\n### ' + t.name + '\n- OWASP: ' + t.owasp + '\n- Difficulty: ' + t.difficulty + '\n- What it is: ' + t.lesson + '\n- Impact: ' + t.impact + '\n'; });
  });
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'), vuln);
  const order = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  let guide = '# ' + LAB_NAME + ' — Practice Guide\n\nChallenges grouped by feature, then difficulty. Objective = measurable success (the matching Mission Board test flips to DONE).\n';
  FEATURES.forEach(f => {
    guide += '\n## ' + f + '\n';
    byFeature(f).slice().sort((a, b) => order[a.difficulty] - order[b.difficulty]).forEach(t => {
      guide += '\n### [' + t.difficulty + '] ' + t.name + '\n- Objective: ' + t.lesson + '\n- Hints:\n  1. ' + t.hints[0] + '\n  2. ' + t.hints[1] + '\n  3. ' + t.hints[2] + '\n';
    });
  });
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'), guide);
  let fix = '# ' + LAB_NAME + ' — Fix & Retest Guide\n\nFor every scored test: the professional report entry, the secure implementation, and the regression check that proves the fix.\n';
  FEATURES.forEach(f => {
    fix += '\n## ' + f + '\n';
    byFeature(f).forEach(t => {
      fix += '\n### ' + t.report.title + '\n- Severity: ' + t.report.severity + '\n- Secure implementation: ' + t.report.remediation + '\n- Regression test: repeat the original exploit for "' + t.name + '" — it must now fail (no session/data/state change), and the matching Mission Board test must stay open when the lab is re-run against the fixed build.\n';
    });
  });
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'), fix);
  console.log('docs generated from registry: ' + TOTAL + ' tests, ' + FEATURES.length + ' features');
}
if (process.argv.includes('--gen-docs')) { genDocs(); process.exit(0); }

server.listen(PORT, HOST, () => {
  console.log('LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' running at http://' + HOST + ':' + PORT + ' (local training only)');
});
