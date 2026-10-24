'use strict';
/*
 * HexaMentalWell — LAB 69 (Category 7: Healthcare & Wellness)
 * A deliberately vulnerable mental-wellness platform for local, authorised
 * security training. Zero-dependency Node.js. Binds 127.0.0.1:3078 ONLY.
 * All people, journals and clinical content are FAKE seed data.
 * Part of the HexaCyberLab 110-lab programme by Md. Jony Hassain.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3078;
const HOST = '127.0.0.1';
const LAB_NUMBER = 69;
const LAB_NAME = 'HexaMentalWell';
const PROGRESS_FILE = path.join(__dirname, 'progress.json');
const LOGO_FILE = path.join(__dirname, 'logo.png');

/* ------------------------------------------------------------------ *
 * Key material region A (see ENGINE SPEC §7): keys exist ONLY as
 * base64-of-reversed shards, scattered across this file. No plain key
 * literal appears anywhere in this lab.
 * ------------------------------------------------------------------ */
const _ka1 = ['TC1YSA==', 'UC05Ng==', 'T1dWMw=='];
const _kb1 = ['TC1YSA==', 'MC0wNw==', 'QUhFMA=='];

function unshard(s) {
  return [...Buffer.from(s, 'base64').toString('utf8')].reverse().join('');
}
function assemble(partsA, partsB) {
  return partsA.concat(partsB).map(unshard).join('');
}

/* ------------------------- seed data (all FAKE) ------------------------- */
const users = [
  { id: 1, name: 'Site Admin', email: 'admin@mentalwell.local', pass: 'admin123', role: 'admin', therapistId: null, plan: 'staff', apiToken: 'tok_admin_9f2' },
  { id: 2, name: 'Dr. Sara Reyes', email: 'dr.reyes@mentalwell.local', pass: 'therapist123', role: 'therapist', therapistId: null, plan: 'staff', specialty: 'Anxiety & stress', bio: 'Licensed counsellor, 10 years of practice.', apiToken: 'tok_reyes_41a' },
  { id: 3, name: 'Dr. David Okafor', email: 'dr.okafor@mentalwell.local', pass: 'therapist123', role: 'therapist', therapistId: null, plan: 'staff', specialty: 'Sleep & habits', bio: 'Clinical psychologist focusing on sleep and routine.', apiToken: 'tok_okafor_77b' },
  { id: 4, name: 'Emma Wilson', email: 'emma@client.local', pass: 'emma123', role: 'client', therapistId: 2, plan: 'premium', apiToken: 'tok_emma_12c' },
  { id: 5, name: 'Liam Carter', email: 'liam@client.local', pass: 'liam123', role: 'client', therapistId: 3, plan: 'free', apiToken: 'tok_liam_55d' },
  { id: 6, name: 'Noah Brooks', email: 'noah@client.local', pass: 'noah123', role: 'client', therapistId: 2, plan: 'premium', apiToken: 'tok_noah_83e' },
  { id: 7, name: 'Ava Mitchell', email: 'ava@client.local', pass: 'ava123', role: 'client', therapistId: 3, plan: 'free', apiToken: 'tok_ava_29f' },
];
let nextUserId = 8;

const journals = [
  { id: 1, clientId: 4, date: '2026-10-18', title: 'Morning walk', text: 'Took a slow walk before work. Felt a little calmer than yesterday. Want to keep this routine.', mood: 6 },
  { id: 2, clientId: 4, date: '2026-10-20', title: 'Busy week', text: 'Work deadlines piled up. Breathing exercise from my session helped at night.', mood: 5 },
  { id: 3, clientId: 5, date: '2026-10-19', title: 'Sleep notes', text: 'Woke up twice in the night. Trying the no-screens rule before bed this week.', mood: 4 },
  { id: 4, clientId: 6, date: '2026-10-21', title: 'Small win', text: 'Finished a project I had been avoiding. Felt proud and lighter afterwards.', mood: 7 },
  { id: 5, clientId: 5, date: '2026-10-22', title: 'Family call', text: 'Long call with family. Mixed feelings, but glad we talked honestly.', mood: 5 },
];
let nextJournalId = 6;

const moods = [
  { id: 1, clientId: 4, date: '2026-10-20', score: 5, note: 'Tired but okay' },
  { id: 2, clientId: 4, date: '2026-10-21', score: 6, note: 'Better after walk' },
  { id: 3, clientId: 5, date: '2026-10-20', score: 4, note: 'Poor sleep' },
  { id: 4, clientId: 6, date: '2026-10-21', score: 7, note: 'Good day' },
];
let nextMoodId = 5;

const sessions = [
  { id: 1, clientId: 4, therapistId: 2, when: '2026-10-15 10:00', price: 60, status: 'completed', paid: true },
  { id: 2, clientId: 5, therapistId: 3, when: '2026-10-24 11:00', price: 60, status: 'booked', paid: false },
  { id: 3, clientId: 6, therapistId: 2, when: '2026-10-25 09:00', price: 60, status: 'booked', paid: false },
  { id: 4, clientId: 4, therapistId: 2, when: '2026-10-26 10:00', price: 60, status: 'booked', paid: false },
];
let nextSessionId = 5;

const sessionNotes = [
  { id: 1, sessionId: 1, therapistId: 2, clientId: 4, text: 'Emma responded well to the breathing routine; agreed to practise daily.' },
  { id: 2, sessionId: 2, therapistId: 3, clientId: 5, text: 'Liam discussed work stress; plan a wind-down routine before bed.' },
];
let nextNoteId = 3;

const payments = [
  { id: 1, clientId: 4, sessionId: 1, amount: 60, status: 'paid' },
];
let nextPaymentId = 2;

const tickets = [
  { id: 1, clientId: 5, topic: 'App login trouble', message: 'I was logged out twice today on my phone.', reply: '' },
];
let nextTicketId = 2;

/* ------------------------- progress state ------------------------- */
let state = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
try {
  if (fs.existsSync(PROGRESS_FILE)) state = Object.assign(state, JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')));
} catch (e) { /* corrupted state file -> start fresh */ }
function save() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 1)); } catch (e) { /* ignore */ }
}

/* ============================ TESTS registry ============================ */
const TESTS = [
  /* ---- Login & Authentication ---- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL injection login bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login form builds its query by gluing your input straight into the SQL string.', "Try a classic always-true condition in the email field, e.g. ' OR '1'='1 with any password.", "Submit email: ' OR '1'='1' -- and any password; you should land in an account you do not own."],
    lesson: 'String-built queries let an attacker rewrite the login logic itself; parameterised queries make input data, never code.',
    impact: 'On a real wellness platform this is full account takeover of the most sensitive accounts a company holds — journals, therapy notes and mood history — without knowing any password.',
    loc: 'POST /login', exploit: "Submit an always-true SQL condition as the email; the string-built query returns a user row and a session is issued.",
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.' },
    fix: 'Replace the string-built login query with a parameterised lookup and compare a salted password hash.' },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute force — no rate limit or lockout', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Nothing slows you down when a password guess fails.', 'Write down one real account email and just keep guessing passwords.', 'Fail 10 logins in a row for the same account — the 10th is still processed normally, with no CAPTCHA or lockout.'],
    lesson: 'Without throttling, lockout or MFA, passwords fall to automated guessing — especially reused ones.',
    impact: 'Attackers can grind through password lists against a client\u2019s therapy account at full speed; the client only finds out after private journals are read.',
    loc: 'POST /login', exploit: 'Submit 10+ failed logins for one account; every attempt is processed with no throttle, CAPTCHA or lockout.',
    report: { title: 'No Brute-Force Protection on Login (No Rate Limiting or Lockout)', severity: 'High', remediation: 'Add progressive delays, account lockout, CAPTCHA and MFA; alert on credential-stuffing patterns.' },
    fix: 'Throttle attempts per account/IP, lock after repeated failures and offer MFA.' },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User enumeration via login & reset responses', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the error wording for a real email versus an invented one, on login AND on forgot-password.', 'The two flows answer differently depending on whether the account exists.', 'Probe at least 5 different emails across /login and /forgot; the responses tell you exactly which are registered.'],
    lesson: 'Differential error messages turn your login page into a free directory of registered users — here, a list of people using a mental-health service.',
    impact: 'Simply being a user of a wellness platform is sensitive. Enumeration lets an attacker build a target list of real clients for phishing and password attacks.',
    loc: 'POST /login, POST /forgot', exploit: 'Probe 5+ distinct emails; existing and non-existing accounts produce visibly different responses.',
    report: { title: 'User Enumeration via Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message for all login/reset outcomes regardless of account existence.' },
    fix: 'Use identical, generic responses for success/failure and for existing/non-existing accounts.' },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Published demo credentials still active', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Read the demo-accounts box on the login page carefully.', 'One of those accounts is a staff (therapist) account, not a client.', 'Log in as dr.reyes@mentalwell.local / therapist123 — demo credentials that were never disabled in production.'],
    lesson: 'Demo and default credentials shipped for convenience are the first thing an attacker tries — and here they open a staff account.',
    impact: 'Anyone on the internet can sign in as a therapist and reach real client data. Demo accounts must never survive into a live service.',
    loc: 'Login page demo box / POST /login', exploit: 'Use the published demo therapist credentials to sign in; a full staff session is issued.',
    report: { title: 'Active Default/Demo Credentials on a Staff Account', severity: 'High', remediation: 'Remove all demo accounts before launch; force unique, strong passwords for staff.' },
    fix: 'Delete demo accounts, rotate any shared passwords and enforce unique staff credentials.' },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable password-reset token', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    hints: ['Reset tokens here are not random — they are computed from something you already know about the victim.', 'Request a reset for your OWN account and study the token format: MW-<id>-<a number derived from the id>.', 'The suffix is id*331+77. Compute it for another user\u2019s id and POST /reset with that token — without ever requesting a reset for them.'],
    lesson: 'A reset token derived from a public identifier is not a secret; tokens must be long, random, single-use and short-lived.',
    impact: 'Anyone who knows a client\u2019s user id can reset their password and take over the account — journals, notes and all.',
    loc: 'POST /reset', exploit: 'Derive the token MW-<id>-<id*331+77> for a victim id and reset their password without any email being sent.',
    report: { title: 'Predictable Password Reset Token Allows Account Takeover', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), store hashed, expire quickly, single use.' },
    fix: 'Issue cryptographically random, hashed, expiring, single-use reset tokens.' },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Role cookie tampering (hx_role)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After login, look at the cookies the app sets — one of them carries your role.', 'The server trusts that cookie when deciding who may open /admin.', 'Set hx_role=admin in your browser while logged in as a normal client, then open /admin.'],
    lesson: 'Authorisation data must live server-side in the session; anything the client sends can be edited by the client.',
    impact: 'Any client can promote themselves to admin of a healthcare platform by editing one cookie — the entire client base is exposed.',
    loc: 'Cookie hx_role / GET /admin', exploit: 'Change the hx_role cookie to admin as a normal client and load the admin console.',
    report: { title: 'Privilege Escalation via Client-Controlled Role Cookie', severity: 'Critical', remediation: 'Store roles server-side in the session record; never trust client-supplied role claims.' },
    fix: 'Remove role decisions from cookies; resolve the role from the server-side session on every request.' },

  /* ---- Registration & Profile ---- */
  { id: 'reg-weak', feature: 'Registration & Profile', name: 'Weak password policy (1-character passwords)', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Try registering with the shortest password the form will accept.', 'There is no length or complexity check at all.', 'Register a new account with password "x" — it is accepted.'],
    lesson: 'Password policy is a security control: accounts guarding health data need length and breached-password checks.',
    impact: 'Clients who pick "x" as a password hand attackers a one-guess login to their private journals.',
    loc: 'POST /register', exploit: 'Register with a 1-character password; the account is created.',
    report: { title: 'Weak Password Policy Allows Single-Character Passwords', severity: 'Medium', remediation: 'Require ≥10 characters and screen against known breached-password lists.' },
    fix: 'Enforce a minimum length and breached-password screening at registration and reset.' },
  { id: 'reg-mass', feature: 'Registration & Profile', name: 'Mass assignment — self-assign therapist role', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration handler copies more form fields into the new account than the form shows.', 'Add fields the form never offered, such as role, to your registration POST.', 'Register with role=therapist added to the POST body; your new account is staff.'],
    lesson: 'Bind only whitelisted fields from requests; extra client-supplied fields must be ignored, especially role/plan.',
    impact: 'Anyone can mint themselves a therapist account and be treated as staff by the platform — instant insider access to client records.',
    loc: 'POST /register', exploit: 'Add role=therapist to the registration POST; the created account carries the staff role.',
    report: { title: 'Mass Assignment in Registration Allows Privilege Escalation', severity: 'High', remediation: 'Whitelist bindable fields per endpoint; set role/plan server-side only.' },
    fix: 'Explicitly whitelist registration fields and assign roles server-side.' },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in display name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is rendered back on pages without escaping — including pages staff see.', 'Put an HTML/JS payload in the name field instead of a name.', 'Register or update your profile with name <script>alert(1)</script> (or an <svg onload> payload) and view a page that prints it.'],
    lesson: 'Every user-controlled string is untrusted output; encode on render, everywhere, including admin views.',
    impact: 'A malicious "client" can run script in a therapist\u2019s or admin\u2019s browser — session theft against the very staff who hold the keys to all records.',
    loc: 'POST /register, POST /profile → dashboards', exploit: 'Store a script payload as the display name; it is rendered unescaped to other users.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-encode all user data on output; add a Content-Security-Policy.' },
    fix: 'HTML-encode the display name at every render point and deploy a CSP.' },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on profile update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The profile form has no anti-CSRF token; the app only leaves a benign marker cookie (hx_origin) on its own pages.', 'A state-changing POST that arrives WITHOUT that marker did not come from the app\u2019s own form.', 'POST /profile with your session cookie but without the hx_origin cookie (e.g. a raw curl) — the change is accepted.'],
    lesson: 'State-changing endpoints need unforgeable tokens; cookies alone ride along with cross-site requests.',
    impact: 'A booby-trapped page visited by a logged-in therapist can silently rewrite their profile — the first step in social-engineering clients.',
    loc: 'POST /profile', exploit: 'Submit a profile change with the session cookie but no hx_origin marker; it is applied.',
    report: { title: 'Cross-Site Request Forgery on Profile Update', severity: 'Medium', remediation: 'Require per-session CSRF tokens on all state-changing requests; verify Origin/Referer as defence in depth.' },
    fix: 'Add synchroniser CSRF tokens to forms and verify them server-side.' },

  /* ---- Journals & Privacy ---- */
  { id: 'journal-idor', feature: 'Journals & Privacy', name: 'Read another client\u2019s journal (IDOR)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Journal entries live at /journals/<id> with small sequential ids.', 'The page checks that you are logged in — not that the journal is yours.', 'As one client, open /journals/3 — an entry written by a different client.'],
    lesson: 'Every object access needs an ownership check; authentication is not authorisation. For journals this is the headline control.',
    impact: 'The most private text a person writes — their therapy journal — is readable by any other client by changing one number. This single flaw destroys a wellness platform\u2019s trust.',
    loc: 'GET /journals/:id', exploit: 'Request a journal whose clientId differs from the session user; the full private entry is served.',
    report: { title: 'Insecure Direct Object Reference Exposes Private Journals', severity: 'Critical', remediation: 'Enforce per-object ownership/assignment checks on every journal read.' },
    fix: 'Check journal.clientId against the session user (or their assigned therapist) before serving.' },
  { id: 'journal-therapist', feature: 'Journals & Privacy', name: 'Therapist reads journals of unassigned clients', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Therapists are meant to see only THEIR clients\u2019 journals (user.therapistId).', 'The journal page never compares the client\u2019s assigned therapist with the reader.', 'As Dr. Reyes, open the journal of Liam (id 3) — he is Dr. Okafor\u2019s client, not hers.'],
    lesson: 'Role checks are not enough: relationship checks (assigned therapist) must gate each record.',
    impact: 'Any staff member can browse every client\u2019s journal, including people they have never treated — an insider-privacy failure regulators take very seriously.',
    loc: 'GET /journals/:id', exploit: 'As a therapist, read a journal whose client is assigned to a different therapist; it is served.',
    report: { title: 'Missing Assignment Check Lets Therapists Read Any Client Journal', severity: 'High', remediation: 'Verify the client is assigned to the requesting therapist before serving journal content.' },
    fix: 'Gate therapist journal access on client.therapistId === therapist.id.' },
  { id: 'journal-export', feature: 'Journals & Privacy', name: 'Journal export of another client', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The export feature takes a client parameter: /journals/export?client=<id>.', 'It never checks that the requested client is you.', 'As Emma, export client=5 and download Liam\u2019s complete journal history as text.'],
    lesson: 'Export/bulk endpoints need the same per-object authorisation as single reads — they are the highest-value target.',
    impact: 'One request downloads a client\u2019s entire journal history. Bulk export flaws turn a privacy bug into a full data breach.',
    loc: 'GET /journals/export', exploit: 'Request the export for another client id; their full journal text is returned.',
    report: { title: 'Broken Access Control on Journal Export (Bulk IDOR)', severity: 'Critical', remediation: 'Authorise export requests against the session user; log and rate-limit exports.' },
    fix: 'Restrict export to the owner (or assigned therapist) and audit every export.' },
  { id: 'journal-support-leak', feature: 'Journals & Privacy', name: 'Support context tool leaks journal text to any user', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    hints: ['Support staff use /support/context/<clientId> to see "recent journal excerpts" beside a ticket.', 'That endpoint checks only that you are signed in.', 'As any client, call /support/context/5 — you receive Liam\u2019s journal excerpts in JSON.'],
    lesson: 'Internal tools and helper endpoints are part of the attack surface; "staff-only by convention" is not a control.',
    impact: 'A convenience feature for support quietly hands every signed-in user a window into any client\u2019s diary.',
    loc: 'GET /support/context/:clientId', exploit: 'As a non-admin user, fetch the support context for another client; journal excerpts are returned.',
    report: { title: 'Support Tool Exposes Journal Content Without Authorisation', severity: 'High', remediation: 'Restrict support-context endpoints to verified support roles and minimise the data returned.' },
    fix: 'Require a support/admin role for the context endpoint and return only ticket-relevant metadata.' },

  /* ---- Mood Tracking ---- */
  { id: 'mood-idor', feature: 'Mood Tracking', name: 'Another client\u2019s mood history (IDOR)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The mood page accepts a client parameter: /moods?client=<id>.', 'It happily renders anyone\u2019s history.', 'As Emma, open /moods?client=5 to see Liam\u2019s day-by-day mood scores and notes.'],
    lesson: 'Query parameters are user input; scoping data to the session user must happen server-side on every read.',
    impact: 'Mood history reveals a person\u2019s mental-health trajectory — exactly the data wellness users expect to stay private.',
    loc: 'GET /moods?client=', exploit: 'Request the mood list for another client id; their scores and notes are served.',
    report: { title: 'Insecure Direct Object Reference in Mood History', severity: 'High', remediation: 'Default all mood queries to the session user; verify assignment for staff views.' },
    fix: 'Scope mood reads to the owner or their assigned therapist.' },
  { id: 'mood-forge', feature: 'Mood Tracking', name: 'Forge mood entries in another client\u2019s record', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The mood check-in POST trusts a clientId field from the request body.', 'Add clientId of someone else to your check-in.', 'POST /moods with clientId=5 and a score; a fake entry appears in Liam\u2019s health record.'],
    lesson: 'Write paths need ownership checks too — the author of a record must come from the session, never the request.',
    impact: 'Attackers can falsify a client\u2019s health record, misleading their therapist and corrupting care decisions.',
    loc: 'POST /moods', exploit: 'Submit a mood entry carrying another client\u2019s id; it is stored in their record.',
    report: { title: 'Broken Access Control Allows Forging Mood Entries for Other Clients', severity: 'High', remediation: 'Derive record ownership from the session; ignore client-supplied owner ids.' },
    fix: 'Always write moods under the session user\u2019s id.' },

  /* ---- Sessions & Booking ---- */
  { id: 'session-notes-idor', feature: 'Sessions & Booking', name: 'Session notes visible to the wrong party', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Therapist notes for a session are served at /sessions/<id>/notes.', 'Neither the session\u2019s client nor its therapist is checked.', 'As Emma, open /sessions/2/notes — private notes about Liam\u2019s therapy, written by his therapist.'],
    lesson: 'Clinical notes are the crown jewels of a therapy platform; every related-party check must be explicit.',
    impact: 'A client reading another client\u2019s therapy notes is a reportable privacy breach on its own.',
    loc: 'GET /sessions/:id/notes', exploit: 'Fetch notes for a session you are not a party to; the therapist\u2019s private notes are returned.',
    report: { title: 'Broken Access Control Exposes Therapy Session Notes', severity: 'Critical', remediation: 'Serve notes only to the session\u2019s therapist (and never the raw note text to unrelated users).' },
    fix: 'Restrict note reads to the session\u2019s own therapist/admin with an explicit party check.' },
  { id: 'session-book-other', feature: 'Sessions & Booking', name: 'Book a session in another client\u2019s name', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The booking form posts a clientId along with therapist and time.', 'The server books whoever the form says.', 'POST /sessions/book with clientId=5; a session appears in Liam\u2019s account that he never booked.'],
    lesson: 'The actor in any transaction is the session user; client-supplied identity fields must be ignored or verified.',
    impact: 'Attackers can fill a victim\u2019s calendar with fake therapy sessions, causing missed real care and billing chaos.',
    loc: 'POST /sessions/book', exploit: 'Book with a clientId different from the session user; the session is created under the victim.',
    report: { title: 'Booking Endpoint Trusts Client-Supplied Client ID', severity: 'Medium', remediation: 'Create bookings only for the authenticated user; staff booking on behalf needs a role check.' },
    fix: 'Take the booking client from the session; require staff role for on-behalf bookings.' },
  { id: 'session-cancel-other', feature: 'Sessions & Booking', name: 'Cancel another client\u2019s session', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Cancelling is a POST to /sessions/<id>/cancel with no ownership check.', 'Session ids are sequential.', 'As Emma, cancel session 2 — Liam\u2019s booked therapy session is cancelled.'],
    lesson: 'Destructive actions need the strictest ownership checks; "logged in" is never sufficient.',
    impact: 'A malicious user can cancel real therapy appointments for vulnerable clients — a safety issue, not just an inconvenience.',
    loc: 'POST /sessions/:id/cancel', exploit: 'Cancel a session owned by another client; its status becomes cancelled.',
    report: { title: 'Missing Authorisation on Session Cancellation', severity: 'High', remediation: 'Verify the requester owns the session (or is its therapist/admin) before cancelling.' },
    fix: 'Add an ownership/party check to the cancel handler.' },

  /* ---- Payments ---- */
  { id: 'pay-tamper', feature: 'Payments', name: 'Session payment amount tampering ($1 for a $60 session)', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['The payment form posts the amount back to the server.', 'The server believes whatever amount arrives.', 'Pay for your booked session with amount=1; it is marked fully paid.'],
    lesson: 'Prices and amounts must be recomputed server-side from the booking, never accepted from the client.',
    impact: 'Every client can settle $60 therapy sessions for $1 — direct revenue loss that scales with one shared trick.',
    loc: 'POST /sessions/:id/pay', exploit: 'Submit a payment far below the session price; the session is recorded as paid in full.',
    report: { title: 'Payment Amount Tampering — Client-Supplied Price Trusted', severity: 'High', remediation: 'Compute payable amounts server-side; reconcile with the payment provider before marking paid.' },
    fix: 'Ignore posted amounts; charge the session\u2019s stored price via the provider and verify the webhook.' },
  { id: 'pay-bypass', feature: 'Payments', name: 'Free session via unverified mark-paid endpoint', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['A leftover endpoint /sessions/<id>/mark-paid simulates the payment webhook.', 'It performs no signature or secret check at all.', 'POST to /sessions/<your id>/mark-paid with an empty body; the unpaid session flips to paid.'],
    lesson: 'Payment-confirmation endpoints must verify provider signatures; an unsigned "paid" signal is an open cash register.',
    impact: 'Anyone can mark every session paid without a cent changing hands — total billing bypass.',
    loc: 'POST /sessions/:id/mark-paid', exploit: 'Call the mark-paid endpoint directly; the session becomes paid with no payment.',
    report: { title: 'Unauthenticated Payment Confirmation Allows Billing Bypass', severity: 'High', remediation: 'Verify signed webhooks from the payment provider; never expose manual mark-paid routes.' },
    fix: 'Remove the endpoint or require a valid provider signature before marking paid.' },

  /* ---- Therapist Directory ---- */
  { id: 'search-sqli', feature: 'Therapist Directory', name: 'SQL injection in therapist search dumps user table', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Directory search builds its query by string concatenation, like the login did.', 'An always-true condition makes the "therapist search" return every user row.', "Search for ' OR '1'='1 and inspect the results table — clients, emails and passwords appear."],
    lesson: 'Injection anywhere is a full-database event; every query in the app must be parameterised, not just login.',
    impact: 'One search discloses the whole user database of a health platform — names, emails and passwords of every client.',
    loc: 'GET /therapists?q=', exploit: 'Inject an always-true condition into the search; all user rows are returned.',
    report: { title: 'SQL Injection in Search Returns Entire User Table', severity: 'Critical', remediation: 'Parameterise all queries; apply least-privilege DB accounts and output minimisation.' },
    fix: 'Parameterise the search query and never select password columns for display.' },
  { id: 'search-xss', feature: 'Therapist Directory', name: 'Reflected XSS in therapist search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your search term is echoed in the results heading — unescaped.', 'Put markup in the query and view the page source.', 'Search for <svg onload=alert(1)> and watch it land in the page as live HTML.'],
    lesson: 'Reflected input must be encoded for the context it lands in; search pages are a classic XSS sink.',
    impact: 'A crafted link sent to a therapist runs script in their browser — a stepping stone to staff session theft.',
    loc: 'GET /therapists?q=', exploit: 'Submit a script payload as the search term; it is reflected unescaped in the response.',
    report: { title: 'Reflected Cross-Site Scripting in Search', severity: 'Medium', remediation: 'Encode reflected values; add CSP and X-Content-Type-Options headers.' },
    fix: 'HTML-encode the search term on reflection.' },

  /* ---- Support & Admin ---- */
  { id: 'admin-csrf', feature: 'Support & Admin', name: 'CSRF on admin account deactivation', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    hints: ['Admins deactivate accounts through a plain GET link: /admin/users/<id>/deactivate.', 'A GET that changes state can be triggered cross-site by an <img> tag — no token can protect it.', 'While logged in as admin, visit that URL with a foreign Referer (e.g. from another origin) — the account is deactivated.'],
    lesson: 'State changes must never ride on GET, and admin actions need CSRF tokens plus re-authentication for destructive steps.',
    impact: 'One malicious page view by an admin can deactivate client or therapist accounts — sabotage of a live care service.',
    loc: 'GET /admin/users/:id/deactivate', exploit: 'Trigger the deactivation GET with a cross-site Referer under an admin session; the target account is deactivated.',
    report: { title: 'Cross-Site Request Forgery on Admin Deactivation (State-Changing GET)', severity: 'High', remediation: 'Make admin actions POST-only with CSRF tokens; require step-up auth for deactivation.' },
    fix: 'Convert deactivation to a token-protected POST and verify Origin/Referer.' },

  /* ---- Platform & API ---- */
  { id: 'platform-debug', feature: 'Platform & API', name: 'Unauthenticated /api/debug dumps all accounts', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Developers left a debug endpoint in the build.', 'It needs no login at all.', 'Open /api/debug in a fresh browser — every user, email, role and password in JSON.'],
    lesson: 'Debug surface must never ship: if it exists in production, it is the breach.',
    impact: 'The complete credential list of a healthcare platform, public. Every account — clients, therapists, admin — is compromised at once.',
    loc: 'GET /api/debug', exploit: 'Fetch /api/debug without any session; full user records including passwords are returned.',
    report: { title: 'Debug Endpoint Exposes All User Credentials Without Authentication', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; gate diagnostics behind admin auth and network restrictions.' },
    fix: 'Delete the debug endpoint from the production build.' },
  { id: 'platform-token', feature: 'Platform & API', name: 'Forgeable API token (base64 of email)', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    hints: ['The API accepts a Bearer token at /api/me.', 'Tokens are not random — they are derived from something public about the user.', 'The token is mhw_ followed by the base64 of the user\u2019s email. Forge one for the admin and call /api/me.'],
    lesson: 'API tokens must be unguessable random secrets, stored hashed and revocable — never a transform of a public identifier.',
    impact: 'Anyone who knows a therapist\u2019s email address owns their API identity — and emails are printed in the public directory.',
    loc: 'GET /api/me (Authorization: Bearer)', exploit: 'Present mhw_+base64(victim email) as the Bearer token; the API authenticates as the victim.',
    report: { title: 'Predictable API Tokens Derived from Email Addresses', severity: 'High', remediation: 'Issue random API tokens, store only hashes, support revocation and rotation.' },
    fix: 'Replace derived tokens with random, hashed, revocable API keys.' },
];
const TOTAL_TESTS = TESTS.length;
const FEATURES = [...new Set(TESTS.map(t => t.feature))];
function testById(id) { return TESTS.find(t => t.id === id); }

/* ------------------------- engine helpers ------------------------- */
function pass(id) {
  if (!state.tests[id]) {
    state.tests[id] = true;
    const done = Object.keys(state.tests).length;
    if (done >= TOTAL_TESTS && !state.completedAt) {
      state.completedAt = new Date().toISOString();
      state.keyRevealed = true;
    }
    save();
  }
}
function attempt(feature) {
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  save();
}
function doneCount() { return Object.keys(state.tests).filter(k => state.tests[k]).length; }
function pct() { return Math.floor(doneCount() / TOTAL_TESTS * 100); }

const xssPat = s => /<script|<svg|onerror\s*=|onload\s*=|<img[^>]*onerror|<iframe|<body[^>]*onload/i.test(String(s || ''));
const sqliPat = s => /('|")\s*(or|and)\s+[^&]*=|union\s+select|'\s*--|"\s*--|'\s*or\s*'|'\s*or\s*\d/i.test(String(s || ''));

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function parseCookies(req) {
  const out = {};
  const h = req.headers.cookie || '';
  h.split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}
const sessionsMap = new Map(); // sid -> userId
function currentUser(req) {
  const c = parseCookies(req);
  if (!c.hx_sess) return null;
  const uid = sessionsMap.get(c.hx_sess);
  return users.find(u => u.id === uid) || null;
}
function makeSession(res, user) {
  const sid = crypto.randomBytes(16).toString('hex');
  sessionsMap.set(sid, user.id);
  res.setHeader('Set-Cookie', [
    'hx_sess=' + sid + '; Path=/; HttpOnly',
    'hx_role=' + user.role + '; Path=/',
    'hx_origin=1; Path=/',
  ]);
}
const failedLogins = {};       // email -> count
const probeSet = new Set();    // distinct emails probed (login + forgot)
const issuedResetTokens = new Set();
function probe(email) {
  if (email) {
    probeSet.add(String(email).toLowerCase());
    if (probeSet.size >= 5) pass('auth-enum');
  }
}
function resetTokenFor(u) { return 'MW-' + u.id + '-' + (u.id * 331 + 77); }
function csrfSuspect(req, cookies) {
  if (!cookies.hx_origin) return true;
  const o = req.headers.origin || '';
  if (o && !o.includes('127.0.0.1:' + PORT)) return true;
  return false;
}

/* ------------- key material region B (scattered shards) ------------- */
const _ka2 = ['LVhFOA==', 'VkZGVg==', 'Tk41Rw=='];
const _kb2 = ['LVpRTQ==', 'UlFKMA==', 'M1FVRA=='];
function entryKey() { return assemble(_ka1, _ka2); }
function completionKey() { return assemble(_kb1, _kb2); }

/* ------------------------- HTML scaffolding ------------------------- */
function progressBar() {
  const d = doneCount(), p = pct();
  return '<div style="background:#1d1d2b;color:#eee;padding:8px 14px;font-family:Arial;font-size:13px">' +
    '<img src="/logo.png" style="height:26px;vertical-align:middle;margin-right:8px">' +
    '<b>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</b> · ' + d + '/' + TOTAL_TESTS + ' tests · ' + p + '%' +
    '<div style="background:#333;height:8px;border-radius:4px;margin-top:5px"><div style="background:#7c5cff;height:8px;border-radius:4px;width:' + p + '%"></div></div></div>';
}
function chatWidget() {
  return '<div id="hxchat" style="position:fixed;right:14px;bottom:14px;width:300px;font-family:Arial;z-index:50">' +
    '<div style="background:#1d1d2b;color:#fff;padding:8px 12px;border-radius:10px 10px 0 0;cursor:pointer" onclick="var b=document.getElementById(\'hxchatbody\');b.style.display=b.style.display==\'none\'?\'block\':\'none\'">💬 Lab Coach</div>' +
    '<div id="hxchatbody" style="display:none;background:#fff;border:1px solid #ccd;padding:10px;border-radius:0 0 10px 10px">' +
    '<div id="hxchatlog" style="height:180px;overflow:auto;font-size:13px;margin-bottom:8px"></div>' +
    '<input id="hxchatin" style="width:72%;padding:6px" placeholder="Ask the coach…"><button style="padding:6px 10px" onclick="hxSend()">Send</button></div></div>' +
    '<script>async function hxSend(){var i=document.getElementById("hxchatin"),l=document.getElementById("hxchatlog");var m=i.value;i.value="";l.innerHTML+="<div><b>You:</b> "+m+"</div>";var r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:m})});var j=await r.json();l.innerHTML+="<div><b>Coach:</b> "+j.reply+"</div>";l.scrollTop=l.scrollHeight;}</script>';
}
function layout(req, title, body) {
  const u = currentUser(req);
  const nav = u ? '<div style="background:#fff;border-bottom:1px solid #dde;padding:8px 14px;font-family:Arial;font-size:13px">' +
    'Hello, <b>' + u.name + '</b> (' + esc(u.role) + ') · <a href="/">Home</a> · <a href="/journals">Journals</a> · <a href="/moods">Mood</a> · <a href="/sessions">Sessions</a> · <a href="/therapists">Therapists</a> · <a href="/support">Support</a> · <a href="/tests">Mission Board</a> · <a href="/logout">Logout</a></div>' : '';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + ' · LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</title></head>' +
    '<body style="margin:0;background:#f4f4f8;font-family:Arial,sans-serif">' + progressBar() + nav +
    '<div style="max-width:860px;margin:22px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:24px">' + body + '</div>' +
    chatWidget() + '</body></html>';
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

/* ------------------------- Lab Coach chatbot ------------------------- */
const FEATURE_KEYWORDS = [
  ['Login & Authentication', ['login', 'auth', 'password', 'brute', 'reset token', 'enumeration']],
  ['Registration & Profile', ['register', 'registration', 'profile', 'sign up', 'signup', 'mass assignment']],
  ['Journals & Privacy', ['journal', 'diary', 'privacy', 'export']],
  ['Mood Tracking', ['mood', 'check-in', 'checkin']],
  ['Sessions & Booking', ['session', 'booking', 'book', 'cancel', 'notes']],
  ['Payments', ['pay', 'payment', 'billing', 'mark-paid', 'mark paid']],
  ['Therapist Directory', ['therapist', 'directory', 'search']],
  ['Support & Admin', ['admin', 'support', 'deactivate']],
  ['Platform & API', ['api', 'platform', 'debug', 'token']],
];
function featureFromMessage(m) {
  for (const [f, kws] of FEATURE_KEYWORDS) if (kws.some(k => m.includes(k))) return f;
  return null;
}
function chatReply(rawMsg) {
  const m = String(rawMsg || '').toLowerCase();
  const d = doneCount();
  if (/\b(who|founder|built|made|created|creator|author)\b/.test(m) && /(built|made|created|founder|lab|this)/.test(m)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (m.includes('key')) {
    if (state.keyRevealed && d >= TOTAL_TESTS) {
      return 'You completed the lab — well done! The completion key for the next lab is: ' + completionKey();
    }
    return 'I do not have the completion key yet — I only receive it when this lab is 100% complete. You are at ' + pct() + '% (' + d + '/' + TOTAL_TESTS + '). Finish every test and I will share it.';
  }
  if (m.includes('progress') || m.includes('how am i') || m.includes('status')) {
    return 'You have completed ' + d + ' of ' + TOTAL_TESTS + ' tests (' + pct() + '%). Open the Mission Board at /tests to see what is left.';
  }
  const f = featureFromMessage(m);
  if ((m.includes('how') || m.includes('help') || m.includes('solve') || m.includes('guide') || m.includes('stuck') || m.includes('hint')) ) {
    if (f) {
      const tests = TESTS.filter(t => t.feature === f);
      const open = tests.filter(t => !state.tests[t.id]);
      const att = state.attempts[f] || 0;
      if (!open.length) return 'You have already completed every test in ' + f + '. Nice work!';
      if (att >= 3 || open.length === 0) {
        return 'Step by step for ' + f + ' — ' + open.map(t => '• ' + t.name + ': ' + t.hints[2]).join(' ');
      }
      return 'That feature is locked for help. First try the ' + f + ' tests yourself at least 3 times — I can see you have tried ' + att + ' time(s) so far. After 3 real tries, ask me again and I will guide you step by step.';
    }
    return 'Tell me which feature you are working on (for example Journals, Sessions or Login) and I will check whether you have tried it enough for step-by-step help.';
  }
  if (m.includes('how many') || m.includes('features') || m.includes('vulnerabilities') || m.includes('tests')) {
    if (f) {
      const tests = TESTS.filter(t => t.feature === f);
      return f + ' has ' + tests.length + ' tests: ' + tests.map(t => t.name).join('; ') + '.';
    }
    return LAB_NAME + ' has ' + FEATURES.length + ' features and ' + TOTAL_TESTS + ' tests in total: ' + FEATURES.map(x => x + ' (' + TESTS.filter(t => t.feature === x).length + ')').join(', ') + '.';
  }
  if (m.includes('next') || m.includes('start') || m.includes('what should')) {
    const next = TESTS.find(t => !state.tests[t.id]);
    if (!next) return 'Everything is complete — visit /complete for your debrief and certificate.';
    return 'Next open test: "' + next.name + '" in ' + next.feature + ' (' + next.difficulty + '). See /tests for its hints, and remember: after 3 genuine tries on a feature I can guide you step by step.';
  }
  if (m.includes('hello') || m.includes('hi')) {
    return 'Hello! I am the Lab Coach for LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '. This lab has ' + TOTAL_TESTS + ' tests across ' + FEATURES.length + ' features. You are at ' + pct() + '%. Ask me how many tests a feature has, or try a feature 3 times and ask me how to solve it.';
  }
  return 'I can help with: how many tests/features this lab has, your progress, what to try next, and step-by-step help for a feature once you have tried it at least 3 times. The Mission Board at /tests tracks everything.';
}

/* ------------------------- request routing ------------------------- */
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://127.0.0.1:' + PORT);
    const p = u.pathname;
    const cookies = parseCookies(req);

    if (p === '/logo.png') {
      try { const img = fs.readFileSync(LOGO_FILE); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(img); }
      catch (e) { return send(res, 404, 'not found'); }
    }
    if (p === '/api/progress') {
      const feats = {};
      for (const f of FEATURES) {
        const ts = TESTS.filter(t => t.feature === f);
        feats[f] = { total: ts.length, done: ts.filter(t => state.tests[t.id]).length, attempts: state.attempts[f] || 0 };
      }
      return send(res, 200, JSON.stringify({ lab: LAB_NAME, number: LAB_NUMBER, total: TOTAL_TESTS, done: doneCount(), pct: pct(), features: feats, complete: doneCount() >= TOTAL_TESTS }, null, 2), 'application/json');
    }
    if (p === '/api/chat' && req.method === 'POST') {
      const b = await readBody(req);
      return send(res, 200, JSON.stringify({ reply: chatReply(b.message) }), 'application/json');
    }
    if (p === '/unlock' && req.method === 'POST') {
      const b = await readBody(req);
      if (String(b.key || '') === entryKey()) {
        state.unlocked = true; save();
        return redirect(res, '/');
      }
      return send(res, 403, gatePage());
    }

    /* gate: everything else requires unlock */
    if (!state.unlocked) return send(res, 200, gatePage());

    const user = currentUser(req);

    /* ---------- platform: debug + API ---------- */
    if (p === '/api/debug') {
      pass('platform-debug');
      return send(res, 200, JSON.stringify({ users: users.map(x => ({ id: x.id, name: x.name, email: x.email, pass: x.pass, role: x.role, plan: x.plan })) }, null, 2), 'application/json');
    }
    if (p === '/api/me') {
      const auth = req.headers.authorization || '';
      const tok = auth.replace(/^Bearer\s+/i, '');
      let au = users.find(x => 'mhw_' + Buffer.from(x.email).toString('base64') === tok);
      if (au) pass('platform-token');
      if (!au) au = users.find(x => x.apiToken === tok);
      if (!au && user) au = user;
      if (!au) return send(res, 401, JSON.stringify({ error: 'unauthorized' }), 'application/json');
      return send(res, 200, JSON.stringify({ id: au.id, name: au.name, email: au.email, role: au.role, plan: au.plan }), 'application/json');
    }

    /* ---------- auth pages ---------- */
    if (p === '/login' && req.method === 'GET') {
      return send(res, 200, layout(req, 'Login', '<h2>Welcome back</h2>' +
        '<form method="POST" action="/login">Email <input name="email" style="width:60%"><br><br>Password <input name="pass" type="password" style="width:60%"><br><br><button>Log in</button></form>' +
        '<p><a href="/forgot">Forgot password?</a> · <a href="/register">Create account</a></p>' +
        '<div style="background:#fff8e1;border:1px solid #e6d9a8;padding:12px;border-radius:8px"><b>Demo accounts</b><br>Client: emma@client.local / emma123<br>Therapist: dr.reyes@mentalwell.local / therapist123<br>Admin: admin@mentalwell.local / admin123</div>'));
    }
    if (p === '/login' && req.method === 'POST') {
      const b = await readBody(req);
      attempt('Login & Authentication');
      probe(b.email);
      const email = String(b.email || ''), passw = String(b.pass || '');
      const fakeQuery = "SELECT * FROM users WHERE email='" + email + "' AND pass='" + passw + "'";
      if (sqliPat(email) || sqliPat(passw)) {
        const before = email.split("'")[0];
        const victim = users.find(x => x.email === before) || users[0];
        void fakeQuery;
        makeSession(res, victim);
        pass('auth-sqli');
        return redirect(res, '/');
      }
      const found = users.find(x => x.email.toLowerCase() === email.toLowerCase());
      if (!found) return send(res, 200, layout(req, 'Login', '<p style="color:#b00">No account with that email address.</p><p><a href="/login">Try again</a></p>'));
      if (found.pass !== passw) {
        failedLogins[email.toLowerCase()] = (failedLogins[email.toLowerCase()] || 0) + 1;
        if (failedLogins[email.toLowerCase()] >= 10) pass('auth-brute');
        return send(res, 200, layout(req, 'Login', '<p style="color:#b00">Wrong password for that account.</p><p><a href="/login">Try again</a></p>'));
      }
      if (found.email === 'dr.reyes@mentalwell.local' && passw === 'therapist123') pass('auth-default');
      if (found.deactivated) return send(res, 403, layout(req, 'Login', '<p>Your account has been deactivated. Please contact support.</p>'));
      makeSession(res, found);
      return redirect(res, '/');
    }
    if (p === '/logout') { res.setHeader('Set-Cookie', ['hx_sess=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0']); return redirect(res, '/login'); }
    if (p === '/register' && req.method === 'GET') {
      return send(res, 200, layout(req, 'Register', '<h2>Create your account</h2><form method="POST" action="/register">Name <input name="name"><br><br>Email <input name="email"><br><br>Password <input name="pass" type="password"><br><br><button>Register</button></form>'));
    }
    if (p === '/register' && req.method === 'POST') {
      const b = await readBody(req);
      attempt('Registration & Profile');
      if (String(b.pass || '').length < 8) pass('reg-weak');
      if (b.role && String(b.role) !== 'client') pass('reg-mass');
      if (xssPat(String(b.name || ''))) pass('reg-xss');
      const nu = {
        id: nextUserId++, name: String(b.name || 'New User'), email: String(b.email || 'user' + nextUserId + '@client.local'),
        pass: String(b.pass || ''), role: b.role ? String(b.role) : 'client', therapistId: b.therapistId ? Number(b.therapistId) : 2,
        plan: b.plan ? String(b.plan) : 'free', apiToken: 'tok_' + crypto.randomBytes(4).toString('hex'),
      };
      users.push(nu);
      makeSession(res, nu);
      return redirect(res, '/');
    }
    if (p === '/forgot' && req.method === 'GET') {
      return send(res, 200, layout(req, 'Forgot password', '<h2>Reset your password</h2><form method="POST" action="/forgot">Email <input name="email"><br><br><button>Send reset link</button></form>'));
    }
    if (p === '/forgot' && req.method === 'POST') {
      const b = await readBody(req);
      attempt('Login & Authentication');
      probe(b.email);
      const found = users.find(x => x.email.toLowerCase() === String(b.email || '').toLowerCase());
      if (!found) return send(res, 200, layout(req, 'Forgot password', '<p style="color:#b00">That email is not registered with us.</p>'));
      issuedResetTokens.add(resetTokenFor(found));
      return send(res, 200, layout(req, 'Forgot password', '<p>A reset link has been sent to ' + esc(found.email) + '. (Training lab: the token format is MW-&lt;id&gt;-&lt;derived number&gt;.)</p>'));
    }
    if (p === '/reset' && req.method === 'GET') {
      return send(res, 200, layout(req, 'Reset password', '<h2>Set a new password</h2><form method="POST" action="/reset">Reset token <input name="token"><br><br>New password <input name="newpass" type="password"><br><br><button>Reset password</button></form>'));
    }
    if (p === '/reset' && req.method === 'POST') {
      const b = await readBody(req);
      attempt('Login & Authentication');
      const victim = users.find(x => resetTokenFor(x) === String(b.token || ''));
      if (!victim) return send(res, 400, layout(req, 'Reset password', '<p style="color:#b00">Invalid reset token.</p>'));
      if (!issuedResetTokens.has(String(b.token))) pass('auth-reset');
      victim.pass = String(b.newpass || 'changed123');
      return send(res, 200, layout(req, 'Reset password', '<p>Password updated for ' + esc(victim.email) + '. <a href="/login">Log in</a></p>'));
    }

    /* ---------- dashboard & profile ---------- */
    if (p === '/') {
      if (!user) return redirect(res, '/login');
      let extra = '';
      if (user.role === 'client') {
        const myJ = journals.filter(j => j.clientId === user.id).length;
        const myS = sessions.filter(s => s.clientId === user.id && s.status === 'booked').length;
        extra = '<p>Your journal entries: <b>' + myJ + '</b> · Upcoming sessions: <b>' + myS + '</b></p>';
      } else if (user.role === 'therapist') {
        const mine = users.filter(x => x.therapistId === user.id);
        extra = '<p>Your clients: <b>' + mine.length + '</b> (' + mine.map(x => esc(x.name)).join(', ') + ')</p>';
      } else if (user.role === 'admin') {
        extra = '<p>Total users: <b>' + users.length + '</b> · <a href="/admin">Open admin console</a></p>';
      }
      return send(res, 200, layout(req, 'Home', '<h2>' + LAB_NAME + '</h2><p>A calmer mind, one day at a time. Journal privately, track your mood, and meet your therapist.</p>' + extra +
        '<form method="POST" action="/profile">Display name <input name="name" value="' + esc(user.name) + '"> <button>Update profile</button></form>'));
    }
    if (p === '/profile' && req.method === 'POST') {
      if (!user) return redirect(res, '/login');
      const b = await readBody(req);
      attempt('Registration & Profile');
      if (csrfSuspect(req, cookies)) pass('reg-csrf');
      if (xssPat(String(b.name || ''))) pass('reg-xss');
      if (b.name) user.name = String(b.name);
      if (b.role) user.role = String(b.role);
      if (b.plan) user.plan = String(b.plan);
      return redirect(res, '/');
    }

    /* ---------- journals ---------- */
    if (p === '/journals' && req.method === 'GET') {
      if (!user) return redirect(res, '/login');
      let list = [];
      if (user.role === 'admin') list = journals;
      else if (user.role === 'therapist') list = journals.filter(j => { const c = users.find(x => x.id === j.clientId); return c && c.therapistId === user.id; });
      else list = journals.filter(j => j.clientId === user.id);
      const rows = list.map(j => { const c = users.find(x => x.id === j.clientId); return '<li><a href="/journals/' + j.id + '">' + esc(j.date) + ' — ' + esc(j.title) + '</a> <span style="color:#777">by ' + esc(c ? c.name : '?') + '</span></li>'; }).join('');
      return send(res, 200, layout(req, 'Journals', '<h2>Journal</h2><p>Your private space. Only you and your therapist should ever read these.</p><ul>' + rows + '</ul>' +
        '<h3>New entry</h3><form method="POST" action="/journals">Title <input name="title"><br><br><textarea name="text" rows="4" cols="50"></textarea><br><br><button>Save entry</button></form>' +
        '<p><a href="/journals/export?client=' + user.id + '">Export my journal</a></p>'));
    }
    if (p === '/journals' && req.method === 'POST') {
      if (!user) return redirect(res, '/login');
      const b = await readBody(req);
      attempt('Journals & Privacy');
      journals.push({ id: nextJournalId++, clientId: user.id, date: new Date().toISOString().slice(0, 10), title: String(b.title || 'Entry'), text: String(b.text || ''), mood: 5 });
      return redirect(res, '/journals');
    }
    if (p === '/journals/export') {
      if (!user) return redirect(res, '/login');
      attempt('Journals & Privacy');
      const cid = Number(u.searchParams.get('client') || user.id);
      if (cid !== user.id && user.role === 'client') pass('journal-export');
      const list = journals.filter(j => j.clientId === cid);
      const txt = list.map(j => j.date + ' — ' + j.title + '\n' + j.text).join('\n\n');
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': 'attachment; filename="journal-export.txt"' });
      return res.end(txt || 'No entries.');
    }
    const jm = p.match(/^\/journals\/(\d+)$/);
    if (jm && req.method === 'GET') {
      if (!user) return redirect(res, '/login');
      attempt('Journals & Privacy');
      const j = journals.find(x => x.id === Number(jm[1]));
      if (!j) return send(res, 404, layout(req, 'Not found', '<h2>Journal entry not found</h2>'));
      const owner = users.find(x => x.id === j.clientId);
      if (user.role === 'client' && j.clientId !== user.id) pass('journal-idor');
      if (user.role === 'therapist' && (!owner || owner.therapistId !== user.id)) pass('journal-therapist');
      return send(res, 200, layout(req, 'Journal entry', '<h2>' + esc(j.title) + '</h2><p style="color:#777">' + esc(j.date) + ' · by ' + esc(owner ? owner.name : '?') + ' · mood ' + j.mood + '/10</p><p>' + esc(j.text) + '</p><p><a href="/journals">Back to journal</a></p>'));
    }

    /* ---------- moods ---------- */
    if (p === '/moods' && req.method === 'GET') {
      if (!user) return redirect(res, '/login');
      attempt('Mood Tracking');
      const cid = Number(u.searchParams.get('client') || user.id);
      const owner = users.find(x => x.id === cid);
      if (cid !== user.id) {
        if (user.role === 'client') pass('mood-idor');
        if (user.role === 'therapist' && (!owner || owner.therapistId !== user.id)) pass('mood-idor');
      }
      const list = moods.filter(mo => mo.clientId === cid);
      const rows = list.map(mo => '<li>' + esc(mo.date) + ' — <b>' + mo.score + '/10</b> · ' + esc(mo.note) + '</li>').join('');
      return send(res, 200, layout(req, 'Mood', '<h2>Mood history — ' + esc(owner ? owner.name : '') + '</h2><ul>' + rows + '</ul>' +
        '<h3>Check in</h3><form method="POST" action="/moods">Score (1–10) <input name="score" size="3"> Note <input name="note"> <button>Save</button></form>'));
    }
    if (p === '/moods' && req.method === 'POST') {
      if (!user) return redirect(res, '/login');
      const b = await readBody(req);
      attempt('Mood Tracking');
      const cid = b.clientId ? Number(b.clientId) : user.id;
      if (cid !== user.id) pass('mood-forge');
      moods.push({ id: nextMoodId++, clientId: cid, date: new Date().toISOString().slice(0, 10), score: Number(b.score || 5), note: String(b.note || '') });
      return redirect(res, '/moods?client=' + cid);
    }

    /* ---------- sessions & payments ---------- */
    if (p === '/sessions' && req.method === 'GET') {
      if (!user) return redirect(res, '/login');
      let list = [];
      if (user.role === 'admin') list = sessions;
      else if (user.role === 'therapist') list = sessions.filter(s => s.therapistId === user.id);
      else list = sessions.filter(s => s.clientId === user.id);
      const rows = list.map(s => { const c = users.find(x => x.id === s.clientId); const t = users.find(x => x.id === s.therapistId); return '<li><a href="/sessions/' + s.id + '">Session #' + s.id + '</a> — ' + esc(s.when) + ' · client ' + esc(c ? c.name : '?') + ' · therapist ' + esc(t ? t.name : '?') + ' · $' + s.price + ' · ' + esc(s.status) + (s.paid ? ' · paid' : ' · <b>unpaid</b>') + '</li>'; }).join('');
      const thOpts = users.filter(x => x.role === 'therapist').map(t => '<option value="' + t.id + '">' + esc(t.name) + '</option>').join('');
      return send(res, 200, layout(req, 'Sessions', '<h2>Your sessions</h2><ul>' + rows + '</ul>' +
        '<h3>Book a session</h3><form method="POST" action="/sessions/book">Therapist <select name="therapistId">' + thOpts + '</select> When <input name="when" value="2026-10-27 10:00"> <button>Book ($60)</button></form>'));
    }
    if (p === '/sessions/book' && req.method === 'POST') {
      if (!user) return redirect(res, '/login');
      const b = await readBody(req);
      attempt('Sessions & Booking');
      const cid = b.clientId ? Number(b.clientId) : user.id;
      if (cid !== user.id) pass('session-book-other');
      sessions.push({ id: nextSessionId++, clientId: cid, therapistId: Number(b.therapistId || 2), when: String(b.when || '2026-10-27 10:00'), price: 60, status: 'booked', paid: false });
      return redirect(res, '/sessions');
    }
    const sm = p.match(/^\/sessions\/(\d+)$/);
    if (sm && req.method === 'GET') {
      if (!user) return redirect(res, '/login');
      const s = sessions.find(x => x.id === Number(sm[1]));
      if (!s) return send(res, 404, layout(req, 'Not found', '<h2>Session not found</h2>'));
      const c = users.find(x => x.id === s.clientId); const t = users.find(x => x.id === s.therapistId);
      return send(res, 200, layout(req, 'Session', '<h2>Session #' + s.id + '</h2><p>' + esc(s.when) + ' · client ' + esc(c ? c.name : '?') + ' · therapist ' + esc(t ? t.name : '?') + '</p><p>Price $' + s.price + ' · status ' + esc(s.status) + ' · ' + (s.paid ? 'paid' : 'unpaid') + '</p>' +
        '<p><a href="/sessions/' + s.id + '/notes">Therapist notes</a></p>' +
        (s.paid ? '' : '<h3>Pay for this session</h3><form method="POST" action="/sessions/' + s.id + '/pay">Amount $ <input name="amount" value="' + s.price + '"> <button>Pay</button></form>') +
        '<form method="POST" action="/sessions/' + s.id + '/cancel"><button>Cancel session</button></form>'));
    }
    const nm = p.match(/^\/sessions\/(\d+)\/notes$/);
    if (nm && req.method === 'GET') {
      if (!user) return redirect(res, '/login');
      attempt('Sessions & Booking');
      const s = sessions.find(x => x.id === Number(nm[1]));
      if (!s) return send(res, 404, layout(req, 'Not found', '<h2>Session not found</h2>'));
      const isParty = user.role === 'admin' || s.clientId === user.id || s.therapistId === user.id;
      if (!isParty) pass('session-notes-idor');
      const list = sessionNotes.filter(n => n.sessionId === s.id);
      const rows = list.map(n => '<li>' + esc(n.text) + '</li>').join('') || '<li>No notes yet.</li>';
      return send(res, 200, layout(req, 'Session notes', '<h2>Notes for session #' + s.id + '</h2><ul>' + rows + '</ul>' +
        '<h3>Add a note (therapists)</h3><form method="POST" action="/sessions/' + s.id + '/notes"><input name="text" style="width:70%"> <button>Add</button></form>'));
    }
    if (nm && req.method === 'POST') {
      if (!user) return redirect(res, '/login');
      const b = await readBody(req);
      attempt('Sessions & Booking');
      const s = sessions.find(x => x.id === Number(nm[1]));
      if (!s) return send(res, 404, 'not found');
      sessionNotes.push({ id: nextNoteId++, sessionId: s.id, therapistId: user.id, clientId: s.clientId, text: String(b.text || '') });
      return redirect(res, '/sessions/' + s.id + '/notes');
    }
    const cm = p.match(/^\/sessions\/(\d+)\/cancel$/);
    if (cm && req.method === 'POST') {
      if (!user) return redirect(res, '/login');
      attempt('Sessions & Booking');
      const s = sessions.find(x => x.id === Number(cm[1]));
      if (!s) return send(res, 404, 'not found');
      if (user.role === 'client' && s.clientId !== user.id) pass('session-cancel-other');
      s.status = 'cancelled';
      return redirect(res, '/sessions');
    }
    const pm = p.match(/^\/sessions\/(\d+)\/pay$/);
    if (pm && req.method === 'POST') {
      if (!user) return redirect(res, '/login');
      const b = await readBody(req);
      attempt('Payments');
      const s = sessions.find(x => x.id === Number(pm[1]));
      if (!s) return send(res, 404, 'not found');
      const amount = Number(b.amount || 0);
      payments.push({ id: nextPaymentId++, clientId: user.id, sessionId: s.id, amount, status: 'paid' });
      s.paid = true;
      if (amount > 0 && amount < s.price) pass('pay-tamper');
      return redirect(res, '/sessions/' + s.id);
    }
    const mm = p.match(/^\/sessions\/(\d+)\/mark-paid$/);
    if (mm && req.method === 'POST') {
      if (!user) return redirect(res, '/login');
      attempt('Payments');
      const s = sessions.find(x => x.id === Number(mm[1]));
      if (!s) return send(res, 404, 'not found');
      s.paid = true;
      pass('pay-bypass');
      return redirect(res, '/sessions/' + s.id);
    }

    /* ---------- therapist directory / search ---------- */
    if (p === '/therapists' && req.method === 'GET') {
      attempt('Therapist Directory');
      const q = u.searchParams.get('q') || '';
      let body = '<h2>Find a therapist</h2><form method="GET" action="/therapists">Search <input name="q" value=""> <button>Search</button></form>';
      if (q) {
        body += '<p>Results for: ' + q + '</p>';
        if (sqliPat(q)) {
          pass('search-sqli');
          body += '<table border="1" cellpadding="5"><tr><th>id</th><th>name</th><th>email</th><th>pass</th><th>role</th></tr>' +
            users.map(x => '<tr><td>' + x.id + '</td><td>' + esc(x.name) + '</td><td>' + esc(x.email) + '</td><td>' + esc(x.pass) + '</td><td>' + esc(x.role) + '</td></tr>').join('') + '</table>';
        } else {
          if (xssPat(q)) pass('search-xss');
          const list = users.filter(x => x.role === 'therapist' && x.name.toLowerCase().includes(q.toLowerCase()));
          body += list.length ? '<ul>' + list.map(t => '<li><b>' + esc(t.name) + '</b> — ' + esc(t.specialty || '') + '<br>' + esc(t.bio || '') + '</li>').join('') + '</ul>' : '<p>No therapists matched.</p>';
        }
      } else {
        const list = users.filter(x => x.role === 'therapist');
        body += '<ul>' + list.map(t => '<li><b>' + esc(t.name) + '</b> — ' + esc(t.specialty || '') + '<br>' + esc(t.bio || '') + '</li>').join('') + '</ul>';
      }
      return send(res, 200, layout(req, 'Therapists', body));
    }

    /* ---------- support ---------- */
    if (p === '/support' && req.method === 'GET') {
      if (!user) return redirect(res, '/login');
      const mine = tickets.filter(t => t.clientId === user.id || user.role === 'admin');
      const rows = mine.map(t => '<li>#' + t.id + ' ' + esc(t.topic) + ' — ' + esc(t.message) + '</li>').join('');
      return send(res, 200, layout(req, 'Support', '<h2>Support</h2><ul>' + rows + '</ul><h3>New ticket</h3><form method="POST" action="/support">Topic <input name="topic"><br><br><textarea name="message" rows="3" cols="50"></textarea><br><br><button>Send</button></form>'));
    }
    if (p === '/support' && req.method === 'POST') {
      if (!user) return redirect(res, '/login');
      const b = await readBody(req);
      attempt('Support & Admin');
      tickets.push({ id: nextTicketId++, clientId: user.id, topic: String(b.topic || 'Help'), message: String(b.message || ''), reply: '' });
      return redirect(res, '/support');
    }
    const cxm = p.match(/^\/support\/context\/(\d+)$/);
    if (cxm && req.method === 'GET') {
      if (!user) return redirect(res, '/login');
      attempt('Journals & Privacy');
      const cid = Number(cxm[1]);
      if (user.role !== 'admin' && cid !== user.id) pass('journal-support-leak');
      const c = users.find(x => x.id === cid);
      const recent = journals.filter(j => j.clientId === cid).slice(-3).map(j => ({ date: j.date, title: j.title, text: j.text }));
      return send(res, 200, JSON.stringify({ client: c ? { id: c.id, name: c.name, email: c.email } : null, recentJournals: recent }, null, 2), 'application/json');
    }

    /* ---------- admin ---------- */
    if (p === '/admin' && req.method === 'GET') {
      if (!user) return redirect(res, '/login');
      if (cookies.hx_role !== 'admin') return send(res, 403, layout(req, 'Admin', '<h2>Admins only</h2>'));
      if (user.role !== 'admin') pass('auth-cookie');
      const rows = users.map(x => '<li>' + x.id + ' · ' + esc(x.name) + ' · ' + esc(x.email) + ' · ' + esc(x.role) + (x.deactivated ? ' · <b>deactivated</b>' : ' · <a href="/admin/users/' + x.id + '/deactivate">deactivate</a>') + '</li>').join('');
      return send(res, 200, layout(req, 'Admin', '<h2>Admin console</h2><ul>' + rows + '</ul>'));
    }
    const dm = p.match(/^\/admin\/users\/(\d+)\/deactivate$/);
    if (dm && req.method === 'GET') {
      if (!user) return redirect(res, '/login');
      if (cookies.hx_role !== 'admin' && user.role !== 'admin') return send(res, 403, 'forbidden');
      const target = users.find(x => x.id === Number(dm[1]));
      const ref = req.headers.referer || '';
      if (target) {
        target.deactivated = true;
        if (ref && !ref.includes('127.0.0.1:' + PORT)) pass('admin-csrf');
      }
      return redirect(res, '/admin');
    }

    /* ---------- mission board / complete / certificate ---------- */
    if (p === '/tests' && req.method === 'GET') {
      let body = '<h2>Mission Board — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h2><p>' + doneCount() + '/' + TOTAL_TESTS + ' tests complete · ' + pct() + '%</p>';
      for (const f of FEATURES) {
        body += '<h3>' + esc(f) + ' <span style="color:#777">(attempts: ' + (state.attempts[f] || 0) + ')</span></h3>';
        for (const t of TESTS.filter(x => x.feature === f)) {
          body += '<div style="border:1px solid #e2e2ee;border-radius:8px;padding:10px;margin:8px 0">' +
            (state.tests[t.id] ? '✅' : '○') + ' <b>' + esc(t.name) + '</b> · ' + esc(t.owasp) + ' · ' + esc(t.difficulty) +
            t.hints.map((h, i) => '<details><summary>Hint ' + (i + 1) + '</summary><p>' + esc(h) + '</p></details>').join('') + '</div>';
        }
      }
      return send(res, 200, layout(req, 'Mission Board', body));
    }
    if (p === '/complete' && req.method === 'GET') {
      if (doneCount() < TOTAL_TESTS) {
        const left = TESTS.filter(t => !state.tests[t.id]).map(t => '<li>' + esc(t.feature) + ' — ' + esc(t.name) + '</li>').join('');
        return send(res, 200, layout(req, 'Complete', '<h2>Not yet complete</h2><p>You are at ' + pct() + '% (' + doneCount() + '/' + TOTAL_TESTS + '). Still open:</p><ul>' + left + '</ul>'));
      }
      let body = '<h2>🎉 Lab complete — 100%</h2>';
      body += '<h3>1) Total features in this lab</h3><p>' + FEATURES.length + ' features: ' + FEATURES.map(esc).join(', ') + '</p>';
      body += '<h3>2) Vulnerabilities per feature</h3><ul>' + FEATURES.map(f => '<li>' + esc(f) + ': ' + TESTS.filter(t => t.feature === f).length + '</li>').join('') + '</ul>';
      body += '<h3>3) How testing was done (' + TOTAL_TESTS + ' techniques)</h3><ul>' + TESTS.map(t => '<li>' + esc(t.name) + ' — ' + esc(t.exploit) + '</li>').join('') + '</ul>';
      body += '<h3>4) What you learned</h3><ul>' + TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.lesson) + '</li>').join('') + '</ul>';
      body += '<h3>5) What this means for a real client</h3><ul>' + TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.impact) + '</li>').join('') + '</ul>';
      body += '<h3>6) Writing it in a real report</h3><ul>' + TESTS.map(t => '<li><b>' + esc(t.report.title) + '</b> (' + esc(t.report.severity) + ') — ' + esc(t.report.remediation) + '</li>').join('') + '</ul>';
      body += '<h3>Your completion key (unlocks Lab ' + (LAB_NUMBER + 1) + ')</h3><p style="font-size:18px"><code>' + esc(completionKey()) + '</code></p>';
      body += '<form method="POST" action="/complete/name">Your name for the certificate <input name="name" value="' + esc(state.testerName || '') + '"> <button>Save name</button></form>';
      body += '<p><a href="/certificate">View your certificate</a></p>';
      return send(res, 200, layout(req, 'Complete', body));
    }
    if (p === '/complete/name' && req.method === 'POST') {
      const b = await readBody(req);
      state.testerName = String(b.name || '').slice(0, 60); save();
      return redirect(res, '/complete');
    }
    if (p === '/certificate' && req.method === 'GET') {
      if (doneCount() < TOTAL_TESTS) return redirect(res, '/complete');
      const name = state.testerName || (user ? user.name : 'HexaCyberLab Tester');
      const date = state.completedAt ? state.completedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
      const card = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ' + LAB_NUMBER + '</title></head><body style="background:#e9e9f2;font-family:Georgia,serif">' +
        '<div style="max-width:680px;margin:50px auto;background:#fff;border:3px solid #7c5cff;border-radius:14px;padding:36px;text-align:center">' +
        '<img src="/logo.png" style="height:64px"><h1 style="margin:10px 0">Certificate of Completion</h1>' +
        '<p>This certifies that</p><h2 style="margin:6px 0">' + esc(name) + '</h2>' +
        '<p>has completed 100% of the security tests in<br><b>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</b><br>(' + TOTAL_TESTS + ' tests across ' + FEATURES.length + ' features)</p>' +
        '<p>Completed on ' + esc(date) + '</p><hr><p style="font-family:Arial;font-size:13px">HexaCyberLab — Built by Md. Jony Hassain, Founder</p></div>' +
        '<style>@media print{body{background:#fff}}</style></body></html>';
      return send(res, 200, card);
    }

    return send(res, 404, layout(req, 'Not found', '<h2>404 — page not found</h2>'));
  } catch (e) {
    console.error('request error:', e && e.stack || e);
    try { send(res, 500, 'Internal error'); } catch (e2) { /* socket gone */ }
  }
});

if (require.main === module) {
  server.listen(PORT, HOST, () => console.log(LAB_NAME + ' (LAB ' + LAB_NUMBER + ') listening on http://' + HOST + ':' + PORT));
}
module.exports = { TESTS, FEATURES, TOTAL_TESTS };
