'use strict';
/* HexaConsult — LAB 98 (Category 10: Property, Jobs & Professional Services)
   A deliberately vulnerable consulting platform for HexaCyberLab training.
   Zero-dependency Node.js. LOCAL USE ONLY. All data is fake and in-memory. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = 3107;
const HOST = '127.0.0.1';
const LAB_NUMBER = 98;
const LAB_NAME = 'HexaConsult';
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const FILES_DIR = path.join(DIR, 'files');

/* ---------- key material: stored ONLY as base64-of-reversed shards, scattered ---------- */
const _eA = ["TC1YSA==","Ny04OQ=="];
const _cA = ["TC1YSA==","QS05OQ=="];

function _unshard(a) {
  return a.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}

/* ---------- progress state ---------- */
let state = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadState() {
  try {
    const raw = fs.readFileSync(PROGRESS_FILE, 'utf8');
    const p = JSON.parse(raw);
    if (p && typeof p === 'object') state = Object.assign(state, p);
  } catch (e) { /* fresh */ }
}
function saveState() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2)); } catch (e) {}
}
loadState();

const _eB = ["UEw0UA==","LTVJRg=="];
const _cB = ["T0o4RQ==","LTE4MQ=="];

/* ---------- TESTS registry ---------- */
const TESTS = [
  // Login & Authentication
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login form builds its query by gluing your input straight into a SQL string.', "Try a quote in the email field, then make the rest of the condition always true.", "Email: ' OR '1'='1' --  (with any password) comments out the password check entirely."],
    lesson: 'String-built SQL queries let an attacker rewrite the query logic itself and log in as anyone, including the admin, without a password.',
    impact: 'On a real consulting platform this hands an attacker the admin account on day one — every client engagement, report and invoice is exposed.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements for all database access; never concatenate user input into SQL.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limiting or Lockout', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['How many wrong passwords can you try for one account in a row?', 'Nothing slows you down — no counter, no lockout, no CAPTCHA.', 'Submit 10+ failed logins for alice@test.local and notice the 10th is still processed normally.'],
    lesson: 'Without throttling or lockout, password guessing is only a matter of time — credential stuffing lists do the rest.',
    impact: 'Attackers can grind through passwords for consultant and client accounts at full speed until one works.',
    report: { title: 'Missing Brute-Force Protection on Login', severity: 'High', remediation: 'Add per-account and per-IP rate limiting, progressive delays and lockout/alerting after repeated failures.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User Enumeration via Login & Forgot-Password Responses', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the error message for an email that exists vs one that does not.', 'The forgot-password form is just as talkative.', 'Probe at least 5 different emails across login/forgot and watch the wording change.'],
    lesson: 'Different responses for "no such account" and "wrong password" confirm which emails are registered — the first step of targeted attacks.',
    impact: 'An attacker can build a verified list of client and consultant emails for phishing and password spraying.',
    report: { title: 'Account Enumeration via Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message ("invalid credentials" / "if the account exists…") for all authentication failures.' } },
  { id: 'auth-demo', feature: 'Login & Authentication', name: 'Published Demo Credentials Are Live Admin Credentials', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Read the login page carefully — it is very "helpful".', 'The demo accounts listed are not sandboxed copies.', 'Log in with the published admin demo credentials and you are the real admin.'],
    lesson: 'Demo/default credentials printed on the login page are the first thing every scanner and attacker tries.',
    impact: 'Anyone on the internet can sign in as admin with credentials the site itself advertises.',
    report: { title: 'Live Administrative Account Uses Published Demo Credentials', severity: 'Critical', remediation: 'Remove demo accounts from production, force unique strong passwords, and never print credentials on the login page.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request one reset token and study its shape.', 'The token is built from something you already know about the account.', 'Token = HCN<userId>-<userId*137+42>. Compute it for Bob (id 6) — no email access needed.'],
    lesson: 'Reset tokens must be unguessable random values; a formula based on the user ID lets anyone reset anyone\'s password.',
    impact: 'An attacker who knows a victim\'s user ID can take over their account in one request — no inbox access required.',
    report: { title: 'Password Reset Token Is Predictable (Derived from User ID)', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), store only a hash, expire them quickly and make them single-use.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Role Cookie Tampering into the Consultant Hub', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After login, look at the cookies the app trusts.', 'One cookie repeats your role — and the server believes the cookie, not the database.', 'Set hx_role=consultant on a client account and open the Consultant Hub.'],
    lesson: 'Trusting a client-supplied role value is the same as having no access control at all — roles must come from server-side session data.',
    impact: 'Any client can promote themselves to consultant by editing a cookie, reaching consultant-only tools and data.',
    report: { title: 'Authorization Decisions Trust a Client-Controlled Role Cookie', severity: 'High', remediation: 'Derive roles from the server-side session record only; ignore role values supplied by the client.' } },
  // Registration & Profile
  { id: 'reg-weak', feature: 'Registration & Profile', name: 'Weak Password Policy (1 Character Accepted)', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a new account and be lazy with the password.', 'How short can you go before the form complains?', 'A one-character password is accepted.'],
    lesson: 'A password policy that accepts anything invites accounts that fall to the first guess.',
    impact: 'Client accounts protected by trivial passwords are harvested in bulk by credential stuffing.',
    report: { title: 'No Minimum Password Strength Enforced at Registration', severity: 'Medium', remediation: 'Enforce a minimum length (≥10) and screen new passwords against known-breached lists.' } },
  { id: 'reg-mass', feature: 'Registration & Profile', name: 'Mass Assignment — Role & Rate Set at Registration', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration handler binds every submitted field onto the new user record.', 'What happens if you submit fields the form never showed?', 'Add role=consultant and rate=999 to the registration POST — they are honoured.'],
    lesson: 'Blindly binding request fields to model objects lets attackers set privileged attributes the UI never offered.',
    impact: 'Attackers self-register as consultants (or admins) with fake rates and instantly gain trusted status on the platform.',
    report: { title: 'Mass Assignment in Registration Allows Privilege Escalation', severity: 'High', remediation: 'Whitelist the exact fields a request may set; assign roles and rates server-side only.' } },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is rendered on profile, directory and admin pages.', 'Is it escaped anywhere?', 'Register with a name like <script>alert(1)</script> and view your profile.'],
    lesson: 'User-controlled text stored and rendered without encoding executes in every viewer\'s browser — including admins.',
    impact: 'A booby-trapped name can steal session cookies or act on behalf of any staff member who views it.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Contextually output-encode all user data and deploy a Content-Security-Policy as defence in depth.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The app sets an hx_origin marker cookie on its own pages — but does the profile endpoint check it?', 'A profile update POST with no marker at all still succeeds.', 'POST to /profile from a bare request (no cookies except the session) and the name changes.'],
    lesson: 'State-changing endpoints without anti-CSRF tokens can be driven by any website the victim visits while logged in.',
    impact: 'A malicious page could silently rename or deface a consultant\'s public profile while they browse the web.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require a per-session anti-CSRF token on all state-changing requests and verify Origin/Referer.' } },
  // Consultants & Search
  { id: 'search-sqli', feature: 'Consultants & Search', name: 'SQL Injection in Consultant Search', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Search is glued into a query string just like the login form.', 'An always-true condition dumps rows the search normally hides.', "Search for ' OR '1'='1' --  and meet the unlisted consultant."],
    lesson: 'Injection in search leaks records outside the intended result set — here, a hidden consultant and his confidential expertise.',
    impact: 'Competitors or attackers can enumerate the full consultant roster, including people and specialisms the firm keeps private.',
    report: { title: 'SQL Injection in Consultant Search Leaks Unlisted Records', severity: 'High', remediation: 'Parameterise search queries and enforce the listed/unlisted filter server-side.' } },
  { id: 'search-xss', feature: 'Consultants & Search', name: 'Reflected XSS in Search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your search term is echoed in the results heading.', 'Try a term that is also HTML.', 'Search for <script>alert(1)</script> and view the page source.'],
    lesson: 'Reflecting input unescaped turns a harmless link into a script-delivery vehicle against staff and clients.',
    impact: 'Phishing links to the firm\'s own site can run script in a victim\'s session, undermining trust in the real domain.',
    report: { title: 'Reflected Cross-Site Scripting in Search Results', severity: 'Medium', remediation: 'Output-encode reflected data and validate search input.' } },
  { id: 'search-unlisted', feature: 'Consultants & Search', name: 'Unlisted Consultant Profile Accessible by Direct ID', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The directory hides one consultant — but hiding is not protecting.', 'Profile URLs use sequential IDs.', 'Open /consultant/4 directly and read the unlisted profile and internal notes.'],
    lesson: 'Removing a link is not access control; direct object URLs must check visibility for every request.',
    impact: 'A consultant engaged on a confidential mandate (and his internal notes) is exposed to anyone who guesses an ID.',
    report: { title: 'Unlisted Consultant Profile Exposed via Direct URL (Missing Visibility Check)', severity: 'Medium', remediation: 'Check the listed flag (or an authorisation rule) on every profile read, not only in listings.' } },
  // Appointments & Booking
  { id: 'appt-idor', feature: 'Appointments & Booking', name: 'Appointment IDOR — View Another Client\'s Booking', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Your appointment page has a tidy sequential URL.', 'Does it check the appointment belongs to you?', 'Log in as Alice and open /appointment/1 — it is Bob\'s booking with Sara.'],
    lesson: 'Object IDs in URLs must be paired with an ownership check, or every record is public to logged-in users.',
    impact: 'Clients can see each other\'s meeting schedules, consultants and topics — a confidentiality breach for a consultancy.',
    report: { title: 'Insecure Direct Object Reference on Appointment View', severity: 'High', remediation: 'Verify the requesting user owns (or is a party to) the appointment before serving it.' } },
  { id: 'appt-double', feature: 'Appointments & Booking', name: 'Double-Booking — Same Consultant, Same Slot, Twice', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['Sara already has a booking on 2026-11-02 at 10:00 (it is in the seed data).', 'The booking endpoint never checks for a clash.', 'Book Sara for 2026-11-02 10:00 as another client — both bookings stand.'],
    lesson: 'Availability is a business invariant the server must enforce; trusting the UI to hide taken slots guarantees double-bookings.',
    impact: 'Consultants get double-booked, clients show up to clashes, and the firm\'s calendar becomes unreliable.',
    report: { title: 'Missing Slot-Availability Check Allows Double-Booking', severity: 'Medium', remediation: 'Enforce a uniqueness check on (consultant, date, slot) server-side at booking time, inside a transaction.' } },
  { id: 'appt-rate', feature: 'Appointments & Booking', name: 'Consultant Rate Tampering at Booking', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The booking form helpfully pre-fills the consultant\'s hourly rate.', 'The server trusts whatever rate comes back.', 'Book Sara (rate 200) with rate=1 and the appointment total is $1.'],
    lesson: 'Prices live on the server. Any price, rate or total submitted by the client must be recomputed, never trusted.',
    impact: 'Clients can book senior consultants for $1 an hour — direct revenue loss on every booking.',
    report: { title: 'Client-Supplied Hourly Rate Trusted at Booking (Price Tampering)', severity: 'High', remediation: 'Look up the consultant\'s rate server-side at booking time and ignore client-supplied pricing.' } },
];
const TESTS2 = [
  // Engagements
  { id: 'eng-idor', feature: 'Engagements', name: 'Engagement IDOR — Read Another Client\'s Engagement', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Engagement pages use sequential IDs too.', 'No party check is performed on read.', 'As Alice, open /engagement/2 — Bob\'s finance review, fee and all.'],
    lesson: 'Engagements are the crown jewels of a consultancy: scope, fees and findings. Every read needs a party check.',
    impact: 'Clients can read competitors\' engagement scopes and fees — commercially devastating for the firm.',
    report: { title: 'Insecure Direct Object Reference on Engagement View', severity: 'High', remediation: 'Authorise every engagement read against the engagement\'s client and consultant parties.' } },
  { id: 'eng-approve', feature: 'Engagements', name: 'Client Approves Own Milestone via Consultant-Only Endpoint', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Milestone approval is a consultant action — in the UI.', 'The endpoint itself only checks that you are logged in.', 'As the client, POST to /engagement/1/milestone/approve and approve your own deliverable.'],
    lesson: 'Hiding a button is not authorisation; privileged workflow transitions must verify the actor\'s role and party server-side.',
    impact: 'Clients can self-approve milestones, triggering payments and closing work that was never reviewed.',
    report: { title: 'Missing Role Check on Milestone Approval Endpoint', severity: 'High', remediation: 'Require the assigned consultant (server-side role + party check) for milestone approval.' } },
  { id: 'eng-cancel', feature: 'Engagements', name: 'Cancel Another Party\'s Engagement', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The cancel endpoint is as trusting as the approve one.', 'You do not need to be a party to the engagement at all.', 'As Carol, POST /engagement/2/cancel to cancel Bob\'s engagement.'],
    lesson: 'Destructive actions need the strictest authorisation checks — anyone can otherwise sabotage live client work.',
    impact: 'A malicious user can cancel competitors\' engagements, halting billable work and damaging client relationships.',
    report: { title: 'Unauthorised Engagement Cancellation (Missing Party Check)', severity: 'High', remediation: 'Restrict cancellation to engagement parties with the appropriate role, and log the action.' } },
  // Reports & Deliverables
  { id: 'rep-idor', feature: 'Reports & Deliverables', name: 'Deliverable Download IDOR', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Deliverable files have predictable names tied to engagement numbers.', 'The download endpoint never asks whose engagement it is.', 'As Alice, download deliverable-2.txt — Bob\'s report.'],
    lesson: 'File downloads are object reads: the file-to-owner mapping must be enforced on every download.',
    impact: 'Confidential client reports — findings, weaknesses, strategy — leak to any other client who guesses a filename.',
    report: { title: 'Insecure Direct Object Reference on Deliverable Download', severity: 'High', remediation: 'Map each file to its engagement and authorise the downloader as a party before serving it.' } },
  { id: 'rep-traversal', feature: 'Reports & Deliverables', name: 'Path Traversal on Deliverable Download', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The file parameter is joined straight onto the files directory.', 'What escapes a directory? Two dots and a slash.', 'Request /download?file=../server.js and read the application source.'],
    lesson: 'User-controlled file paths must be canonicalised and confined to an allow-listed directory.',
    impact: 'Attackers can read source code and configuration from the server, exposing secrets and the full vulnerability map.',
    report: { title: 'Directory Traversal in File Download Allows Arbitrary File Read', severity: 'High', remediation: 'Resolve the requested path, verify it stays inside the files directory, and prefer ID-based file lookup.' } },
  // Invoices & Payments
  { id: 'inv-idor', feature: 'Invoices & Payments', name: 'Invoice IDOR — View Another Client\'s Invoice', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Invoices follow the same sequential pattern.', 'No ownership check on view.', 'As Alice, open /invoice/2 to see Bob\'s fee.'],
    lesson: 'Financial documents need the same party checks as the engagements they bill.',
    impact: 'Clients learn exactly what competitors pay — pricing intelligence the firm never intended to share.',
    report: { title: 'Insecure Direct Object Reference on Invoice View', severity: 'Medium', remediation: 'Authorise invoice reads against the invoice\'s client before serving.' } },
  { id: 'inv-tamper', feature: 'Invoices & Payments', name: 'Invoice Payment Amount Tampering ($1 Settles $4,000)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The pay form lets you type the amount — and the server believes you.', 'It marks the invoice PAID if your amount is "accepted".', 'Pay invoice 1 with amount=1 and watch a $4,000 invoice settle in full.'],
    lesson: 'Payment state must be derived from a verified payment of the full server-side amount, never from a client-typed figure.',
    impact: 'Clients can settle five-figure invoices for a dollar — catastrophic, silent revenue loss.',
    report: { title: 'Client-Supplied Payment Amount Trusted; Invoice Marked Paid in Full', severity: 'Critical', remediation: 'Compare the paid amount against the server-side invoice total in the payment callback; only then mark PAID.' } },
  // Admin Panel
  { id: 'admin-bac', feature: 'Admin Panel', name: 'Admin Panel Open to Any Logged-In User', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['There is an /admin page. The nav hides it from you.', 'Hiding is all that protects it.', 'Log in as any client and open /admin — full user list, passwords included.'],
    lesson: 'Admin surfaces must verify the admin role server-side on every request; a hidden link is not a control.',
    impact: 'Any registered user can open the admin panel and harvest every account\'s password.',
    report: { title: 'Broken Access Control: Admin Panel Served to Non-Admin Users', severity: 'Critical', remediation: 'Enforce an admin-role check in middleware for all /admin routes.' } },
  // Platform & API
  { id: 'api-token', feature: 'Platform & API', name: 'API Token Is Just base64(email)', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    hints: ['The JSON API accepts a Bearer token instead of a session.', 'The token format is an encoding, not a secret.', 'Send Authorization: Bearer <base64 of bob@test.local> to /api/engagements — no password needed.'],
    lesson: 'A token that anyone can construct from a public identifier is not authentication.',
    impact: 'Anyone who knows a client\'s email address can pull their engagements through the API.',
    report: { title: 'Forgeable API Token (base64 of Email) Allows Account Data Access', severity: 'High', remediation: 'Issue random, server-stored API tokens (hashed at rest) and verify them on every API call.' } },
  { id: 'api-debug', feature: 'Platform & API', name: 'Unauthenticated /api/debug Dumps All Accounts', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Developers leave presents. Try the obvious debug path.', 'No session is required at all.', 'GET /api/debug returns every user, including passwords, with no login.'],
    lesson: 'Debug endpoints must never ship to production; if they exist, they need the same auth as the data they expose.',
    impact: 'The entire user database — emails and passwords — is one unauthenticated request away.',
    report: { title: 'Unauthenticated Debug Endpoint Exposes Full User Table', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; gate any diagnostics behind admin auth.' } },
];
TESTS.push(...TESTS2);

const _eC = ["SzBQQw==","WUk0WQ=="];
const _cC = ["MUgxSg==","UlhJMA=="];
function entryKey() { return _unshard(_eA.concat(_eB, _eC)); }
function completionKey() { return _unshard(_cA.concat(_cB, _cC)); }

/* ---------- seed data (all fake) ---------- */
const users = [
  { id: 1, email: 'admin@hexaconsult.local', password: 'admin123', role: 'admin', name: 'Ada Admin' },
  { id: 2, email: 'sara@hexaconsult.local', password: 'sara123', role: 'consultant', name: 'Sara Consultant' },
  { id: 3, email: 'tom@hexaconsult.local', password: 'tom123', role: 'consultant', name: 'Tom Advisor' },
  { id: 4, email: 'ghost@hexaconsult.local', password: 'ghost123', role: 'consultant', name: 'Gideon Ghost' },
  { id: 5, email: 'alice@test.local', password: 'alice123', role: 'client', name: 'Alice Client' },
  { id: 6, email: 'bob@test.local', password: 'bob123', role: 'client', name: 'Bob Client' },
  { id: 7, email: 'carol@test.local', password: 'carol123', role: 'client', name: 'Carol Client' },
];
const consultantProfiles = {
  2: { userId: 2, rate: 200, expertise: 'Cloud Strategy', listed: true, bio: 'Cloud migration and platform strategy for growing firms.', notes: 'Public profile.' },
  3: { userId: 3, rate: 150, expertise: 'Finance Operations', listed: true, bio: 'Finance process reviews and controls.', notes: 'Public profile.' },
  4: { userId: 4, rate: 500, expertise: 'Internal M&A — CONFIDENTIAL', listed: false, bio: 'Unlisted: advises only on confidential mandates.', notes: 'INTERNAL: do not publish — engaged on a confidential acquisition.' },
};
const engagements = [
  { id: 1, clientId: 5, consultantId: 2, title: 'Cloud Migration Assessment', fee: 4000, status: 'active', milestone: 'Discovery report', milestoneApproved: false },
  { id: 2, clientId: 6, consultantId: 3, title: 'Q4 Finance Review', fee: 2500, status: 'active', milestone: 'Controls walkthrough', milestoneApproved: false },
  { id: 3, clientId: 7, consultantId: 2, title: 'Security Posture Review', fee: 6000, status: 'active', milestone: 'Interim findings', milestoneApproved: false },
];
const appointments = [
  { id: 1, consultantId: 2, clientId: 6, date: '2026-11-02', slot: '10:00', rate: 200, status: 'booked' },
  { id: 2, consultantId: 3, clientId: 5, date: '2026-11-03', slot: '14:00', rate: 150, status: 'booked' },
];
const invoices = [
  { id: 1, engagementId: 1, clientId: 5, amount: 4000, status: 'unpaid' },
  { id: 2, engagementId: 2, clientId: 6, amount: 2500, status: 'unpaid' },
  { id: 3, engagementId: 3, clientId: 7, amount: 6000, status: 'unpaid' },
];
const deliverableFiles = { 'deliverable-1.txt': 1, 'deliverable-2.txt': 2, 'deliverable-3.txt': 3 };
let nextUserId = 8, nextApptId = 3;
const sessions = new Map(); // sid -> userId
const issuedResetTokens = new Set(); // email|token
const failedLogins = {}; // email -> count
const enumProbes = {}; // ip -> Set of emails

function resetTokenFor(u) { return 'HCN' + u.id + '-' + (u.id * 137 + 42); }
function userById(id) { return users.find(u => u.id === id); }
function userByEmail(email) { return users.find(u => u.email === String(email || '').toLowerCase()); }

/* ---------- progress engine ---------- */
const FEATURES = [...new Set(TESTS.map(t => t.feature))];
function pass(id) {
  if (!state.tests[id]) {
    state.tests[id] = true;
    if (TESTS.every(t => state.tests[t.id])) {
      state.completedAt = state.completedAt || new Date().toISOString();
      state.keyRevealed = true;
    }
    saveState();
  }
}
function bump(feature) { state.attempts[feature] = (state.attempts[feature] || 0) + 1; saveState(); }
function doneCount() { return TESTS.filter(t => state.tests[t.id]).length; }
function isComplete() { return doneCount() === TESTS.length; }
function progressSummary() {
  const features = {};
  for (const f of FEATURES) {
    const ft = TESTS.filter(t => t.feature === f);
    features[f] = { total: ft.length, done: ft.filter(t => state.tests[t.id]).length, attempts: state.attempts[f] || 0 };
  }
  const done = doneCount();
  return { lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done, pct: Math.floor(done / TESTS.length * 100), features, complete: isComplete() };
}

/* ---------- http helpers ---------- */
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function parseCookies(req) {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}
function readBody(req) {
  return new Promise(resolve => {
    let b = '';
    req.on('data', c => { b += c; if (b.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = String(req.headers['content-type'] || '');
      if (ct.includes('application/json')) { try { return resolve(JSON.parse(b || '{}')); } catch (e) { return resolve({}); } }
      const out = {};
      new URLSearchParams(b).forEach((v, k) => { out[k] = v; });
      resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}
function send(res, code, body, type, extra) {
  const headers = Object.assign({ 'Content-Type': type || 'text/html; charset=utf-8' }, extra || {});
  res.writeHead(code, headers);
  res.end(body);
}
function redirect(res, to, extra) {
  const headers = Object.assign({ Location: to }, extra || {});
  res.writeHead(302, headers);
  res.end('');
}
function sessionUser(req) {
  const c = parseCookies(req);
  const uid = sessions.get(c.hx_session);
  return uid ? userById(uid) : null;
}
function startSession(res, user) {
  const sid = 's' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  sessions.set(sid, user.id);
  return { 'Set-Cookie': [`hx_session=${sid}; Path=/; HttpOnly`, `hx_role=${user.role}; Path=/`] };
}

/* ---------- mini SQL evaluator (the vulnerable string-built query path) ---------- */
function resolveOperand(tok, row) {
  tok = tok.trim();
  if (/^'[^']*'$/.test(tok)) return tok.slice(1, -1);
  if (/^-?\d+$/.test(tok)) return tok;
  if (/^[a-z_]+$/i.test(tok)) return String(row[tok.toLowerCase()] == null ? '' : row[tok.toLowerCase()]);
  return tok;
}
function evalTerm(term, row) {
  const m = term.trim().match(/^('[^']*'|-?\d+|[a-z_]+)\s*=\s*('[^']*'|-?\d+|[a-z_]+)$/i);
  if (!m) return false;
  return resolveOperand(m[1], row) === resolveOperand(m[2], row);
}
function evalWhere(where, row) {
  const clean = String(where).split('--')[0];
  return clean.split(/\s+OR\s+/i).some(group => group.split(/\s+AND\s+/i).every(term => evalTerm(term, row)));
}
function sqlLogin(email, password) {
  const where = `email = '${email}' AND password = '${password}'`;
  return users.find(u => evalWhere(where, { email: u.email, password: u.password })) || null;
}

/* ---------- page shell ---------- */
function progressBar() {
  const p = progressSummary();
  return `<div style="background:#111827;color:#e5e7eb;padding:8px 16px;font-family:monospace;font-size:13px">
    LAB ${LAB_NUMBER} — ${LAB_NAME} · ${p.done}/${p.total} tests · ${p.pct}%
    <div style="background:#374151;height:8px;border-radius:4px;margin-top:4px"><div style="background:#22c55e;height:8px;border-radius:4px;width:${p.pct}%"></div></div></div>`;
}
function chatWidget() {
  return `<div id="coach" style="position:fixed;right:16px;bottom:16px;width:320px;font-family:sans-serif;z-index:50">
  <div style="background:#1f2937;color:#fff;padding:8px 12px;border-radius:10px 10px 0 0;cursor:pointer" onclick="var b=document.getElementById('coachbody');b.style.display=b.style.display==='none'?'block':'none'">🤖 Lab Coach — HexaConsult</div>
  <div id="coachbody" style="display:none;background:#f9fafb;border:1px solid #d1d5db;border-radius:0 0 10px 10px;padding:10px">
    <div id="coachlog" style="height:180px;overflow:auto;font-size:13px;margin-bottom:8px"></div>
    <div style="display:flex;gap:6px"><input id="coachin" style="flex:1;padding:6px" placeholder="Ask the coach…"><button onclick="coachSend()" style="padding:6px 10px">Send</button></div>
  </div></div>
  <script>
  function coachAdd(who,txt){var l=document.getElementById('coachlog');var d=document.createElement('div');d.innerHTML='<b>'+who+':</b> ';d.appendChild(document.createTextNode(txt));l.appendChild(d);l.scrollTop=l.scrollHeight;}
  function coachSend(){var i=document.getElementById('coachin');var m=i.value.trim();if(!m)return;i.value='';coachAdd('You',m);
    fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})}).then(r=>r.json()).then(j=>coachAdd('Coach',j.reply)).catch(()=>coachAdd('Coach','Coach unavailable.'));}
  document.getElementById('coachin').addEventListener('keydown',function(e){if(e.key==='Enter')coachSend();});
  </script>`;
}
function page(req, title, body, user) {
  const nav = user
    ? `<a href="/">Consultants</a> · <a href="/search">Search</a> · <a href="/appointments">My Appointments</a> · <a href="/engagements">Engagements</a> · <a href="/invoices">Invoices</a> · <a href="/profile">Profile (${esc(user.name)} — ${esc(user.role)})</a> · <a href="/tests">Mission Board</a> · <a href="/logout">Logout</a>`
    : `<a href="/">Consultants</a> · <a href="/search">Search</a> · <a href="/login">Login</a> · <a href="/register">Register</a> · <a href="/tests">Mission Board</a>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)} — HexaConsult</title></head>
  <body style="font-family:sans-serif;margin:0;background:#f3f4f6">
  <header style="background:#fff;border-bottom:1px solid #e5e7eb;padding:10px 16px;display:flex;gap:14px;align-items:center">
    <img src="/logo.png" alt="HexaCyberLab" style="height:36px">
    <div><strong>HexaConsult</strong><div style="font-size:12px;color:#6b7280">Expert consulting, booked in minutes</div></div>
    <nav style="margin-left:auto;font-size:14px">${nav}</nav></header>
  ${progressBar()}
  <main style="max-width:900px;margin:24px auto;background:#fff;padding:24px;border-radius:10px">${body}</main>
  ${chatWidget()}
  </body></html>`;
}
function gatePage() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Locked — LAB ${LAB_NUMBER}</title></head>
  <body style="font-family:sans-serif;margin:0;background:#111827;color:#e5e7eb">
  ${progressBar()}
  <main style="max-width:560px;margin:60px auto;background:#1f2937;padding:32px;border-radius:12px;text-align:center">
    <img src="/logo.png" alt="HexaCyberLab" style="height:64px">
    <h1>🔒 LAB ${LAB_NUMBER} — ${LAB_NAME}</h1>
    <p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
    <form method="POST" action="/unlock"><input name="key" style="padding:10px;width:80%" placeholder="Completion key from Lab ${LAB_NUMBER - 1}"><br><br>
    <button style="padding:10px 22px">Unlock</button></form>
  </main>${chatWidget()}</body></html>`;
}
const XSS_RE = /<script|onerror\s*=|onload\s*=|<svg|<img[^>]*onerror|<iframe/i;

/* ---------- auth routes ---------- */
function loginPage(req, msg) {
  return page(req, 'Login', `<h1>Login</h1>${msg ? `<p style="color:#b91c1c">${esc(msg)}</p>` : ''}
  <form method="POST" action="/login"><label>Email <input name="email" style="display:block;padding:8px;width:320px"></label><br>
  <label>Password <input name="password" type="password" style="display:block;padding:8px;width:320px"></label><br>
  <button style="padding:8px 20px">Login</button></form>
  <p><a href="/forgot">Forgot password?</a> · <a href="/register">Create an account</a></p>
  <div style="background:#fef3c7;padding:12px;border-radius:8px"><strong>Demo accounts (try the platform):</strong><br>
  Admin — admin@hexaconsult.local / admin123<br>Client — alice@test.local / alice123</div>`, null);
}
function trackEnum(req, email) {
  const ip = req.socket.remoteAddress || 'x';
  enumProbes[ip] = enumProbes[ip] || new Set();
  enumProbes[ip].add(String(email || '').toLowerCase());
  if (enumProbes[ip].size >= 5) pass('auth-enum');
}
async function handleLogin(req, res) {
  const b = await readBody(req);
  bump('Login & Authentication');
  trackEnum(req, b.email);
  const email = String(b.email || ''), password = String(b.password || '');
  const injected = /'|--|\bOR\b/i.test(email + ' ' + password);
  let user = null;
  if (injected) { user = sqlLogin(email, password); if (user) pass('auth-sqli'); }
  if (!user) {
    const cand = userByEmail(email);
    if (cand && cand.password === password) user = cand;
    else {
      // differential errors (enumeration flaw), no throttling (brute-force flaw)
      if (cand) {
        failedLogins[cand.email] = (failedLogins[cand.email] || 0) + 1;
        if (failedLogins[cand.email] >= 10) pass('auth-brute');
      }
      const msg = !email ? 'Enter your email.' : (!cand ? 'No account found for that email.' : 'Incorrect password.');
      return send(res, 200, loginPage(req, msg));
    }
  }
  if (user.email === 'admin@hexaconsult.local' && password === 'admin123') pass('auth-demo');
  const hdr = startSession(res, user);
  hdr['Set-Cookie'].push('hx_origin=own; Path=/');
  return redirect(res, '/', hdr);
}
function registerPage(req, msg) {
  return page(req, 'Register', `<h1>Create your account</h1>${msg ? `<p style="color:#b91c1c">${esc(msg)}</p>` : ''}
  <form method="POST" action="/register"><label>Full name <input name="name" style="display:block;padding:8px;width:320px"></label><br>
  <label>Email <input name="email" style="display:block;padding:8px;width:320px"></label><br>
  <label>Password <input name="password" type="password" style="display:block;padding:8px;width:320px"></label><br>
  <button style="padding:8px 20px">Register</button></form>`, null);
}
async function handleRegister(req, res) {
  const b = await readBody(req);
  bump('Registration & Profile');
  const email = String(b.email || '').toLowerCase();
  if (!email || !b.password) return send(res, 200, registerPage(req, 'Email and password are required.'));
  if (userByEmail(email)) return send(res, 200, registerPage(req, 'That email is already registered.'));
  const user = { id: nextUserId++, email, password: String(b.password), role: 'client', name: String(b.name || 'New User') };
  // mass assignment: every extra field is honoured
  if (b.role) user.role = String(b.role);
  if (b.rate) user.rate = Number(b.rate);
  users.push(user);
  if (String(b.password).length < 4) pass('reg-weak');
  if (user.role !== 'client' || b.rate) pass('reg-mass');
  if (XSS_RE.test(user.name)) pass('reg-xss');
  if (user.role === 'consultant' && !consultantProfiles[user.id]) {
    consultantProfiles[user.id] = { userId: user.id, rate: Number(b.rate) || 100, expertise: 'General', listed: true, bio: '', notes: '' };
  }
  const hdr = startSession(res, user);
  hdr['Set-Cookie'].push('hx_origin=own; Path=/');
  return redirect(res, '/', hdr);
}
function forgotPage(req, msg) {
  return page(req, 'Forgot password', `<h1>Forgot password</h1>${msg ? `<p>${msg}</p>` : ''}
  <form method="POST" action="/forgot"><label>Email <input name="email" style="display:block;padding:8px;width:320px"></label><br>
  <button style="padding:8px 20px">Send reset link</button></form>`, null);
}
async function handleForgot(req, res) {
  const b = await readBody(req);
  bump('Login & Authentication');
  trackEnum(req, b.email);
  const u = userByEmail(b.email);
  if (!u) return send(res, 200, forgotPage(req, 'No account with that email.'));
  const token = resetTokenFor(u);
  issuedResetTokens.add(u.email + '|' + token);
  return send(res, 200, forgotPage(req, `Reset link sent. (Simulated inbox) Open: <a href="/reset?email=${encodeURIComponent(u.email)}&token=${esc(token)}">/reset?email=${esc(u.email)}&amp;token=${esc(token)}</a>`));
}
function resetPage(req, q, msg) {
  return page(req, 'Reset password', `<h1>Reset password</h1>${msg ? `<p style="color:#b91c1c">${esc(msg)}</p>` : ''}
  <form method="POST" action="/reset"><input type="hidden" name="email" value="${esc(q.email || '')}"><input type="hidden" name="token" value="${esc(q.token || '')}">
  <label>New password <input name="password" type="password" style="display:block;padding:8px;width:320px"></label><br>
  <button style="padding:8px 20px">Set new password</button></form>`, null);
}
async function handleReset(req, res) {
  const b = await readBody(req);
  bump('Login & Authentication');
  const u = userByEmail(b.email);
  if (!u) return send(res, 200, resetPage(req, b, 'Account not found.'));
  if (String(b.token || '') !== resetTokenFor(u)) return send(res, 200, resetPage(req, b, 'Invalid or expired reset token.'));
  if (!issuedResetTokens.has(u.email + '|' + String(b.token))) pass('auth-reset');
  issuedResetTokens.delete(u.email + '|' + String(b.token));
  u.password = String(b.password || 'changed123');
  return redirect(res, '/login');
}

/* ---------- consultants & search ---------- */
function consultantCard(p) {
  const u = userById(p.userId);
  return `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin:10px 0">
    <strong><a href="/consultant/${p.userId}">${u ? u.name : 'Consultant'}</a></strong> — ${esc(p.expertise)}<br>
    Rate: $${p.rate}/hour · <a href="/book/${p.userId}">Book</a></div>`;
}
function homePage(req, res, user) {
  const cards = Object.values(consultantProfiles).filter(p => p.listed).map(consultantCard).join('');
  return send(res, 200, page(req, 'Consultants', `<h1>Our consultants</h1>${cards}`, user));
}
function searchPage(req, res, user, q) {
  bump('Consultants & Search');
  const query = String(q || '');
  const injected = /'\s*(or|and)\s|--|'\s*or\s*'/i.test(query);
  let results;
  if (injected) {
    results = Object.values(consultantProfiles);
    if (results.some(p => !p.listed)) pass('search-sqli');
  } else {
    const needle = query.toLowerCase();
    results = Object.values(consultantProfiles).filter(p => p.listed && (userById(p.userId).name.toLowerCase().includes(needle) || p.expertise.toLowerCase().includes(needle)));
  }
  const body = `<h1>Search consultants</h1>
  <form method="GET" action="/search"><input name="q" value="${esc(query)}" style="padding:8px;width:320px"> <button style="padding:8px 16px">Search</button></form>
  <h2>Results for ${query}</h2>${results.length ? results.map(consultantCard).join('') : '<p>No matches.</p>'}`;
  if (XSS_RE.test(query)) pass('search-xss');
  return send(res, 200, page(req, 'Search', body, user));
}
function consultantPage(req, res, user, id) {
  bump('Consultants & Search');
  const p = consultantProfiles[id];
  if (!p) return send(res, 404, page(req, 'Not found', '<h1>Consultant not found</h1>', user));
  if (!p.listed) pass('search-unlisted');
  const u = userById(p.userId);
  return send(res, 200, page(req, 'Consultant', `<h1>${u.name}</h1><p><strong>Expertise:</strong> ${esc(p.expertise)}</p>
  <p><strong>Rate:</strong> $${p.rate}/hour</p><p>${esc(p.bio)}</p><p style="color:#6b7280">${esc(p.notes)}</p>
  <p><a href="/book/${p.userId}">Book ${esc(u.name)}</a></p>`, user));
}

/* ---------- appointments ---------- */
function bookPage(req, res, user, cid) {
  const p = consultantProfiles[cid];
  if (!p) return send(res, 404, page(req, 'Not found', '<h1>Consultant not found</h1>', user));
  const u = userById(p.userId);
  return send(res, 200, page(req, 'Book', `<h1>Book ${esc(u.name)}</h1>
  <form method="POST" action="/book"><input type="hidden" name="consultantId" value="${p.userId}">
  <label>Date <input name="date" value="2026-11-05" style="display:block;padding:8px"></label><br>
  <label>Slot <select name="slot" style="display:block;padding:8px"><option>09:00</option><option>10:00</option><option>11:00</option><option>14:00</option><option>15:00</option></select></label><br>
  <label>Hourly rate ($) <input name="rate" value="${p.rate}" style="display:block;padding:8px"></label><br>
  <button style="padding:8px 20px">Confirm booking</button></form>`, user));
}
async function handleBook(req, res, user) {
  const b = await readBody(req);
  bump('Appointments & Booking');
  const p = consultantProfiles[Number(b.consultantId)];
  if (!p) return send(res, 404, page(req, 'Not found', '<h1>Consultant not found</h1>', user));
  const rate = Number(b.rate);
  if (!isNaN(rate) && rate !== p.rate) pass('appt-rate');
  const clash = appointments.some(a => a.consultantId === p.userId && a.date === String(b.date) && a.slot === String(b.slot) && a.status === 'booked');
  const appt = { id: nextApptId++, consultantId: p.userId, clientId: user.id, date: String(b.date || ''), slot: String(b.slot || ''), rate: isNaN(rate) ? p.rate : rate, status: 'booked' };
  appointments.push(appt);
  if (clash) pass('appt-double');
  return redirect(res, '/appointment/' + appt.id);
}
function appointmentsPage(req, res, user) {
  const mine = appointments.filter(a => a.clientId === user.id || a.consultantId === user.id);
  const rows = mine.map(a => `<li><a href="/appointment/${a.id}">Appointment ${a.id}</a> — consultant ${esc(userById(a.consultantId).name)}, ${esc(a.date)} ${esc(a.slot)}, $${a.rate}, ${esc(a.status)}</li>`).join('');
  return send(res, 200, page(req, 'My Appointments', `<h1>My appointments</h1><ul>${rows || '<li>None yet.</li>'}</ul>`, user));
}
function appointmentPage(req, res, user, id) {
  bump('Appointments & Booking');
  const a = appointments.find(x => x.id === id);
  if (!a) return send(res, 404, page(req, 'Not found', '<h1>Appointment not found</h1>', user));
  if (a.clientId !== user.id && a.consultantId !== user.id) pass('appt-idor');
  return send(res, 200, page(req, 'Appointment', `<h1>Appointment ${a.id}</h1>
  <p>Consultant: ${esc(userById(a.consultantId).name)} · Client: ${esc(userById(a.clientId).name)}</p>
  <p>${esc(a.date)} at ${esc(a.slot)} — $${a.rate} — status: ${esc(a.status)}</p>`, user));
}

/* ---------- engagements ---------- */
function engagementsPage(req, res, user) {
  const mine = engagements.filter(e => e.clientId === user.id || e.consultantId === user.id || user.role === 'admin');
  const rows = mine.map(e => `<li><a href="/engagement/${e.id}">${esc(e.title)}</a> — $${e.fee} — ${esc(e.status)}</li>`).join('');
  return send(res, 200, page(req, 'Engagements', `<h1>Engagements</h1><ul>${rows || '<li>None.</li>'}</ul>`, user));
}
function engagementPage(req, res, user, id) {
  bump('Engagements');
  const e = engagements.find(x => x.id === id);
  if (!e) return send(res, 404, page(req, 'Not found', '<h1>Engagement not found</h1>', user));
  if (e.clientId !== user.id && e.consultantId !== user.id && user.role !== 'admin') pass('eng-idor');
  return send(res, 200, page(req, 'Engagement', `<h1>${esc(e.title)}</h1>
  <p>Client: ${esc(userById(e.clientId).name)} · Consultant: ${esc(userById(e.consultantId).name)}</p>
  <p>Fee: $${e.fee} · Status: ${esc(e.status)}</p>
  <p>Milestone: ${esc(e.milestone)} — ${e.milestoneApproved ? 'APPROVED' : 'pending approval'}</p>
  <p>Deliverable: <a href="/download?file=deliverable-${e.id}.txt">deliverable-${e.id}.txt</a></p>
  ${user.role === 'consultant' ? `<form method="POST" action="/engagement/${e.id}/milestone/approve"><button>Approve milestone (consultant)</button></form>` : ''}
  <form method="POST" action="/engagement/${e.id}/cancel"><button>Cancel engagement</button></form>`, user));
}
async function handleMilestoneApprove(req, res, user, id) {
  bump('Engagements');
  const e = engagements.find(x => x.id === id);
  if (!e) return send(res, 404, 'not found', 'text/plain');
  e.milestoneApproved = true;
  if (user.role !== 'consultant') pass('eng-approve');
  return redirect(res, '/engagement/' + e.id);
}
async function handleEngagementCancel(req, res, user, id) {
  bump('Engagements');
  const e = engagements.find(x => x.id === id);
  if (!e) return send(res, 404, 'not found', 'text/plain');
  const wasParty = e.clientId === user.id || e.consultantId === user.id;
  e.status = 'cancelled';
  if (!wasParty) pass('eng-cancel');
  return redirect(res, '/engagements');
}

/* ---------- deliverables ---------- */
function handleDownload(req, res, user, file) {
  bump('Reports & Deliverables');
  const name = String(file || '');
  if (name.includes('..')) {
    const target = path.normalize(path.join(DIR, name.replace(/^\.\.\//, '')));
    try {
      const data = fs.readFileSync(target);
      pass('rep-traversal');
      return send(res, 200, data, 'text/plain');
    } catch (e) { return send(res, 404, 'not found', 'text/plain'); }
  }
  const engId = deliverableFiles[name];
  if (!engId) return send(res, 404, 'not found', 'text/plain');
  const e = engagements.find(x => x.id === engId);
  if (e && e.clientId !== user.id && e.consultantId !== user.id && user.role !== 'admin') pass('rep-idor');
  try { return send(res, 200, fs.readFileSync(path.join(FILES_DIR, name)), 'text/plain'); }
  catch (err) { return send(res, 404, 'not found', 'text/plain'); }
}

/* ---------- invoices ---------- */
function invoicesPage(req, res, user) {
  const mine = invoices.filter(i => i.clientId === user.id || user.role === 'admin');
  const rows = mine.map(i => `<li><a href="/invoice/${i.id}">Invoice ${i.id}</a> — $${i.amount} — ${esc(i.status)}</li>`).join('');
  return send(res, 200, page(req, 'Invoices', `<h1>Invoices</h1><ul>${rows || '<li>None.</li>'}</ul>`, user));
}
function invoicePage(req, res, user, id) {
  bump('Invoices & Payments');
  const inv = invoices.find(x => x.id === id);
  if (!inv) return send(res, 404, page(req, 'Not found', '<h1>Invoice not found</h1>', user));
  if (inv.clientId !== user.id && user.role !== 'admin') pass('inv-idor');
  return send(res, 200, page(req, 'Invoice', `<h1>Invoice ${inv.id}</h1>
  <p>Engagement ${inv.engagementId} · Client: ${esc(userById(inv.clientId).name)}</p>
  <p>Amount due: $${inv.amount} · Status: ${esc(inv.status)}</p>
  ${inv.status !== 'paid' ? `<form method="POST" action="/invoice/${inv.id}/pay"><label>Amount ($) <input name="amount" value="${inv.amount}" style="padding:8px"></label> <button>Pay</button></form>` : '<p>✅ Paid</p>'}`, user));
}
async function handleInvoicePay(req, res, user, id) {
  const b = await readBody(req);
  bump('Invoices & Payments');
  const inv = invoices.find(x => x.id === id);
  if (!inv) return send(res, 404, 'not found', 'text/plain');
  const amount = Number(b.amount);
  inv.status = 'paid';
  inv.paidAmount = amount;
  if (!isNaN(amount) && amount < inv.amount) pass('inv-tamper');
  return redirect(res, '/invoice/' + inv.id);
}

/* ---------- profile / hub / admin / api ---------- */
function profilePage(req, res, user, msg) {
  return send(res, 200, page(req, 'Profile', `<h1>Your profile</h1>${msg ? `<p>${esc(msg)}</p>` : ''}
  <p>Name: ${user.name}</p><p>Email: ${esc(user.email)}</p><p>Role: ${esc(user.role)}</p>
  <form method="POST" action="/profile"><label>Display name <input name="name" value="${esc(user.name)}" style="display:block;padding:8px;width:320px"></label><br>
  <label>Bio <input name="bio" style="display:block;padding:8px;width:320px"></label><br>
  <button style="padding:8px 20px">Save profile</button></form>`, user));
}
async function handleProfile(req, res, user) {
  const b = await readBody(req);
  bump('Registration & Profile');
  const cookies = parseCookies(req);
  const newName = String(b.name || user.name);
  if (newName !== user.name && !cookies.hx_origin) pass('reg-csrf');
  user.name = newName;
  if (XSS_RE.test(user.name)) pass('reg-xss');
  return profilePage(req, res, user, 'Profile saved.');
}
function hubPage(req, res, user) {
  const cookies = parseCookies(req);
  const cookieRole = cookies.hx_role || user.role;
  if (cookieRole !== 'consultant' && cookieRole !== 'admin') return send(res, 403, page(req, 'Forbidden', '<h1>Consultants only</h1>', user));
  if (user.role !== 'consultant' && user.role !== 'admin') pass('auth-cookie');
  return send(res, 200, page(req, 'Consultant Hub', `<h1>Consultant Hub</h1><p>Pipeline, availability calendar and rate cards for consultants.</p>`, user));
}
function adminPage(req, res, user) {
  bump('Admin Panel');
  if (user.role !== 'admin') pass('admin-bac');
  const rows = users.map(u => `<tr><td>${u.id}</td><td>${u.name}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td>${esc(u.password)}</td></tr>`).join('');
  return send(res, 200, page(req, 'Admin', `<h1>Admin Panel — all users</h1><table border="1" cellpadding="6"><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Password</th></tr>${rows}</table>`, user));
}
function apiDebug(req, res) {
  bump('Platform & API');
  pass('api-debug');
  return send(res, 200, JSON.stringify({ users, engagements, invoices }, null, 2), 'application/json');
}
function apiEngagements(req, res) {
  bump('Platform & API');
  const auth = String(req.headers.authorization || '');
  let user = sessionUser(req);
  if (!user && auth.startsWith('Bearer ')) {
    try {
      const email = Buffer.from(auth.slice(7), 'base64').toString('utf8');
      const u = userByEmail(email);
      if (u) { user = u; pass('api-token'); }
    } catch (e) {}
  }
  if (!user) return send(res, 401, JSON.stringify({ error: 'unauthorized' }), 'application/json');
  const mine = engagements.filter(e => e.clientId === user.id || e.consultantId === user.id);
  return send(res, 200, JSON.stringify({ user: user.email, engagements: mine }, null, 2), 'application/json');
}

/* ---------- Lab Coach ---------- */
const FEATURE_KEYWORDS = {
  'Login & Authentication': ['login', 'authentication', 'password', 'brute', 'reset token', 'enumeration'],
  'Registration & Profile': ['register', 'registration', 'profile', 'sign up', 'signup'],
  'Consultants & Search': ['search', 'consultant', 'unlisted'],
  'Appointments & Booking': ['appointment', 'booking', 'book', 'slot', 'rate'],
  'Engagements': ['engagement', 'milestone'],
  'Reports & Deliverables': ['report', 'deliverable', 'download', 'file'],
  'Invoices & Payments': ['invoice', 'payment', 'pay', 'billing'],
  'Admin Panel': ['admin'],
  'Platform & API': ['api', 'token', 'debug'],
};
function matchFeature(msg) {
  for (const f of FEATURES) if (msg.includes(f.toLowerCase())) return f;
  for (const [f, kws] of Object.entries(FEATURE_KEYWORDS)) if (kws.some(k => msg.includes(k))) return f;
  return null;
}
function coachReply(rawMsg) {
  const msg = String(rawMsg || '').toLowerCase();
  const p = progressSummary();
  if (/who (built|made|created|is behind)|founder|who built|who made/.test(msg)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (msg.includes('key')) {
    if (isComplete()) return 'You completed LAB ' + LAB_NUMBER + '! Here is the completion key for Lab ' + (LAB_NUMBER + 1) + ': ' + completionKey();
    return 'I do not have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at ' + p.pct + '% (' + p.done + '/' + p.total + ' tests). Finish every test on the Mission Board (/tests) and the key will be revealed on the completion page.';
  }
  const feature = matchFeature(msg);
  const wantsHow = /how|solve|guide|help|bypass|exploit|do i|steps|walkthrough/.test(msg);
  if (feature && wantsHow) {
    const fTests = TESTS.filter(t => t.feature === feature);
    const open = fTests.filter(t => !state.tests[t.id]);
    const attempts = state.attempts[feature] || 0;
    if (!open.length) return 'You have already completed every test in ' + feature + '. Well done — pick another feature from the Mission Board (/tests).';
    if (attempts >= 3) {
      return 'Step by step for ' + feature + ' — your next open test is "' + open[0].name + '": ' + open[0].hints[2] + ' Work through the Mission Board (/tests) in order; each test flips only when the real effect happens on the server.';
    }
    return 'That feature is locked for help. First try the ' + feature + ' tests yourself at least 3 times — I can see you\'ve tried ' + attempts + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  if (feature && /how many|count|vulnerabilit|tests|what/.test(msg)) {
    const fTests = TESTS.filter(t => t.feature === feature);
    return feature + ' has ' + fTests.length + ' tests: ' + fTests.map(t => t.name + (state.tests[t.id] ? ' ✓' : '')).join('; ') + '.';
  }
  if (/how many|features|progress|status|tests/.test(msg)) {
    return 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + TESTS.length + ' tests across ' + FEATURES.length + ' features (' + FEATURES.join(', ') + '). Your progress: ' + p.done + '/' + p.total + ' (' + p.pct + '%). Open the Mission Board at /tests for the full map, hints included.';
  }
  if (/hi|hello|hey|start|begin/.test(msg)) {
    const next = TESTS.find(t => !state.tests[t.id]);
    return 'Welcome to LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '! You are at ' + p.pct + '% (' + p.done + '/' + p.total + ' tests). ' + (next ? 'A good next test: "' + next.name + '" (' + next.feature + '). ' : '') + 'Ask me how many tests a feature has, or try a feature\'s tests at least 3 times and I\'ll guide you step by step.';
  }
  const next = TESTS.find(t => !state.tests[t.id]);
  return 'I can help with LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' (' + p.done + '/' + p.total + ' tests done, ' + p.pct + '%). ' + (next ? 'Next open test: "' + next.name + '" in ' + next.feature + '. ' : '') + 'See /tests for the mission board and hints. Remember: how-to help for a feature unlocks after you have genuinely tried that feature at least 3 times.';
}
async function handleChat(req, res) {
  const b = await readBody(req);
  let reply;
  try { reply = coachReply(b.message); } catch (e) { reply = 'I hit a snag — try asking about a feature, your progress, or who built these labs.'; }
  return send(res, 200, JSON.stringify({ reply }), 'application/json');
}

/* ---------- lab system pages ---------- */
function testsPage(req, res, user) {
  const sections = FEATURES.map(f => {
    const rows = TESTS.filter(t => t.feature === f).map(t => `
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin:8px 0">
        <strong>${state.tests[t.id] ? '✓' : '○'} ${esc(t.name)}</strong> · ${esc(t.owasp)} · ${esc(t.difficulty)}
        <div style="font-size:12px;color:#6b7280">Attempts on this feature: ${state.attempts[f] || 0}</div>
        <details><summary>Hint 1</summary>${esc(t.hints[0])}</details>
        <details><summary>Hint 2</summary>${esc(t.hints[1])}</details>
        <details><summary>Hint 3</summary>${esc(t.hints[2])}</details>
      </div>`).join('');
    return `<h2>${esc(f)}</h2>${rows}`;
  }).join('');
  return send(res, 200, page(req, 'Mission Board', `<h1>🎯 Mission Board — LAB ${LAB_NUMBER} ${LAB_NAME}</h1>${sections}`, user));
}
function completePage(req, res, user) {
  const p = progressSummary();
  if (!isComplete()) {
    const left = TESTS.filter(t => !state.tests[t.id]).map(t => `<li>${esc(t.name)} (${esc(t.feature)})</li>`).join('');
    return send(res, 200, page(req, 'Not yet', `<h1>Not complete yet — ${p.pct}%</h1><p>${p.done}/${p.total} tests done. Still open:</p><ul>${left}</ul>`, user));
  }
  const perFeature = FEATURES.map(f => `<li><strong>${esc(f)}</strong>: ${TESTS.filter(t => t.feature === f).length} vulnerabilities</li>`).join('');
  const techniques = TESTS.map(t => `<li>${esc(t.name)}</li>`).join('');
  const lessons = TESTS.map(t => `<li><strong>${esc(t.name)}:</strong> ${esc(t.lesson)}</li>`).join('');
  const impacts = TESTS.map(t => `<li><strong>${esc(t.name)}:</strong> ${esc(t.impact)}</li>`).join('');
  const reports = TESTS.map(t => `<li><strong>${esc(t.report.title)}</strong> — Severity: ${esc(t.report.severity)} — Remediation: ${esc(t.report.remediation)}</li>`).join('');
  const body = `<h1>🎉 Lab Complete — LAB ${LAB_NUMBER} ${LAB_NAME}</h1>
  <h2>1) Features in this lab</h2><p>${FEATURES.length} features, ${TESTS.length} tests in total.</p>
  <h2>2) Vulnerabilities per feature</h2><ul>${perFeature}</ul>
  <h2>3) How testing was done (${TESTS.length} techniques)</h2><ul>${techniques}</ul>
  <h2>4) What you learned</h2><ul>${lessons}</ul>
  <h2>5) What this means for a real client</h2><ul>${impacts}</ul>
  <h2>6) Writing it in a real report</h2><ul>${reports}</ul>
  <h2>🔑 Completion key for Lab ${LAB_NUMBER + 1}</h2>
  <p style="font-family:monospace;font-size:18px;background:#ecfdf5;padding:12px;border-radius:8px">${esc(completionKey())}</p>
  <form method="POST" action="/set-name"><label>Your name for the certificate <input name="name" value="${esc(state.testerName)}" style="padding:8px;width:280px"></label> <button>Save name</button></form>
  <p><a href="/certificate">🎓 View your certificate</a></p>`;
  return send(res, 200, page(req, 'Complete', body, user));
}
async function handleSetName(req, res) {
  const b = await readBody(req);
  if (b.name) { state.testerName = String(b.name).slice(0, 80); saveState(); }
  return redirect(res, '/certificate');
}
function certificatePage(req, res, user) {
  if (!isComplete()) return send(res, 200, page(req, 'Not yet', '<h1>Certificate unlocks at 100%.</h1><p>Finish every test on the Mission Board first.</p>', user));
  const name = state.testerName || (user ? user.name : 'Dedicated Tester');
  const date = state.completedAt ? new Date(state.completedAt).toDateString() : new Date().toDateString();
  const body = `<div style="border:3px solid #b45309;border-radius:14px;padding:36px;text-align:center;background:#fffbeb">
    <img src="/logo.png" alt="HexaCyberLab" style="height:72px">
    <h1 style="margin:10px 0">Certificate of Completion</h1>
    <p>This certifies that</p><h2 style="margin:6px 0">${esc(name)}</h2>
    <p>has completed 100% of the security tests in <strong>LAB ${LAB_NUMBER} — ${LAB_NAME}</strong><br>(${TESTS.length} tests across ${FEATURES.length} features)</p>
    <p>${esc(date)}</p>
    <p style="color:#6b7280">HexaCyberLab — Built by Md. Jony Hassain, Founder</p></div>
    <p style="text-align:center"><button onclick="window.print()">🖨 Print certificate</button></p>`;
  return send(res, 200, page(req, 'Certificate', body, user));
}
async function handleUnlock(req, res) {
  const b = await readBody(req);
  const given = String((b && b.key) || '');
  if (given && given === entryKey()) {
    state.unlocked = true; saveState();
    return redirect(res, '/');
  }
  return send(res, 403, gatePage());
}

/* ---------- doc generation ---------- */
function genDocs() {
  const byFeature = f => TESTS.filter(t => t.feature === f);
  let vuln = `# ${LAB_NAME} — Vulnerabilities (LAB ${LAB_NUMBER})\n\nThe complete map: every scored test in this lab, grouped by feature.\n`;
  for (const f of FEATURES) {
    vuln += `\n## ${f}\n`;
    for (const t of byFeature(f)) vuln += `\n### ${t.name}\n- OWASP: ${t.owasp}\n- Difficulty: ${t.difficulty}\n- Exploitation outline: ${t.hints[2]}\n- Impact: ${t.impact}\n`;
  }
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'), vuln);
  const order = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  let guide = `# ${LAB_NAME} — Practice Guide (LAB ${LAB_NUMBER})\n\nChallenges grouped by feature, then difficulty. Each test flips only when the real exploit effect happens on the server.\n`;
  for (const f of FEATURES) {
    guide += `\n## ${f}\n`;
    for (const t of byFeature(f).slice().sort((a, b) => order[a.difficulty] - order[b.difficulty])) {
      guide += `\n### ${t.name} (${t.difficulty})\n- Objective: make the server register the real effect of "${t.name}" — observe it in the app and on /tests.\n- Hint 1: ${t.hints[0]}\n- Hint 2: ${t.hints[1]}\n- Hint 3: ${t.hints[2]}\n`;
    }
  }
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'), guide);
  let fix = `# ${LAB_NAME} — Fix & Retest (LAB ${LAB_NUMBER})\n\nFor every test: the professional report entry, the secure implementation, and a regression retest.\n`;
  for (const t of TESTS) {
    fix += `\n## ${t.report.title}\n- Severity: ${t.report.severity}\n- Feature: ${t.feature}\n- Secure implementation: ${t.report.remediation}\n- Regression test: re-run the original exploit for "${t.name}" — it must now fail (no effect recorded, test must not flip on a fresh instance), while the legitimate workflow still works.\n`;
  }
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'), fix);
  console.log('Docs generated for LAB ' + LAB_NUMBER + ' — ' + TESTS.length + ' tests.');
}

/* ---------- router ---------- */
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://localhost');
    const pathName = u.pathname;
    const method = req.method;
    if (method === 'GET' && !parseCookies(req).hx_origin) { try { res.setHeader('Set-Cookie', 'hx_origin=own; Path=/'); } catch (e) {} }
    if (pathName === '/logo.png') {
      try { return send(res, 200, fs.readFileSync(path.join(DIR, 'logo.png')), 'image/png'); } catch (e) { return send(res, 404, 'not found', 'text/plain'); }
    }
    if (pathName === '/unlock' && method === 'POST') return await handleUnlock(req, res);
    if (pathName === '/api/chat' && method === 'POST') return await handleChat(req, res);
    if (pathName === '/api/progress' && method === 'GET') return send(res, 200, JSON.stringify(progressSummary(), null, 2), 'application/json');
    if (!state.unlocked) return send(res, 200, gatePage());

    const user = sessionUser(req);
    const needLogin = () => { if (!user) { redirect(res, '/login'); return true; } return false; };
    let m;
    if (pathName === '/' && method === 'GET') return homePage(req, res, user);
    if (pathName === '/login' && method === 'GET') return send(res, 200, loginPage(req, ''));
    if (pathName === '/login' && method === 'POST') return await handleLogin(req, res);
    if (pathName === '/register' && method === 'GET') return send(res, 200, registerPage(req, ''));
    if (pathName === '/register' && method === 'POST') return await handleRegister(req, res);
    if (pathName === '/forgot' && method === 'GET') return send(res, 200, forgotPage(req, ''));
    if (pathName === '/forgot' && method === 'POST') return await handleForgot(req, res);
    if (pathName === '/reset' && method === 'GET') return send(res, 200, resetPage(req, Object.fromEntries(u.searchParams), ''));
    if (pathName === '/reset' && method === 'POST') return await handleReset(req, res);
    if (pathName === '/logout' && method === 'GET') {
      const c = parseCookies(req); sessions.delete(c.hx_session);
      return redirect(res, '/', { 'Set-Cookie': ['hx_session=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0'] });
    }
    if (pathName === '/search' && method === 'GET') return searchPage(req, res, user, u.searchParams.get('q') || '');
    if ((m = pathName.match(/^\/consultant\/(\d+)$/)) && method === 'GET') return consultantPage(req, res, user, Number(m[1]));
    if ((m = pathName.match(/^\/book\/(\d+)$/)) && method === 'GET') { if (needLogin()) return; return bookPage(req, res, user, Number(m[1])); }
    if (pathName === '/book' && method === 'POST') { if (needLogin()) return; return await handleBook(req, res, user); }
    if (pathName === '/appointments' && method === 'GET') { if (needLogin()) return; return appointmentsPage(req, res, user); }
    if ((m = pathName.match(/^\/appointment\/(\d+)$/)) && method === 'GET') { if (needLogin()) return; return appointmentPage(req, res, user, Number(m[1])); }
    if (pathName === '/engagements' && method === 'GET') { if (needLogin()) return; return engagementsPage(req, res, user); }
    if ((m = pathName.match(/^\/engagement\/(\d+)$/)) && method === 'GET') { if (needLogin()) return; return engagementPage(req, res, user, Number(m[1])); }
    if ((m = pathName.match(/^\/engagement\/(\d+)\/milestone\/approve$/)) && method === 'POST') { if (needLogin()) return; return await handleMilestoneApprove(req, res, user, Number(m[1])); }
    if ((m = pathName.match(/^\/engagement\/(\d+)\/cancel$/)) && method === 'POST') { if (needLogin()) return; return await handleEngagementCancel(req, res, user, Number(m[1])); }
    if (pathName === '/download' && method === 'GET') { if (needLogin()) return; return handleDownload(req, res, user, u.searchParams.get('file') || ''); }
    if (pathName === '/invoices' && method === 'GET') { if (needLogin()) return; return invoicesPage(req, res, user); }
    if ((m = pathName.match(/^\/invoice\/(\d+)$/)) && method === 'GET') { if (needLogin()) return; return invoicePage(req, res, user, Number(m[1])); }
    if ((m = pathName.match(/^\/invoice\/(\d+)\/pay$/)) && method === 'POST') { if (needLogin()) return; return await handleInvoicePay(req, res, user, Number(m[1])); }
    if (pathName === '/profile' && method === 'GET') { if (needLogin()) return; return profilePage(req, res, user, ''); }
    if (pathName === '/profile' && method === 'POST') { if (needLogin()) return; return await handleProfile(req, res, user); }
    if (pathName === '/consultant-hub' && method === 'GET') { if (needLogin()) return; return hubPage(req, res, user); }
    if (pathName === '/admin' && method === 'GET') { if (needLogin()) return; return adminPage(req, res, user); }
    if (pathName === '/api/debug' && method === 'GET') return apiDebug(req, res);
    if (pathName === '/api/engagements' && method === 'GET') return apiEngagements(req, res);
    if (pathName === '/tests' && method === 'GET') return testsPage(req, res, user);
    if (pathName === '/complete' && method === 'GET') return completePage(req, res, user);
    if (pathName === '/set-name' && method === 'POST') return await handleSetName(req, res);
    if (pathName === '/certificate' && method === 'GET') return certificatePage(req, res, user);
    return send(res, 404, page(req, 'Not found', '<h1>404 — page not found</h1>', user));
  } catch (err) {
    try { send(res, 500, 'Internal error — the lab survived your input. Try again.', 'text/plain'); } catch (e) {}
  }
});

if (process.argv.includes('--gen-docs')) { genDocs(); process.exit(0); }
server.listen(PORT, HOST, () => console.log(`LAB ${LAB_NUMBER} — ${LAB_NAME} listening on http://${HOST}:${PORT}`));
