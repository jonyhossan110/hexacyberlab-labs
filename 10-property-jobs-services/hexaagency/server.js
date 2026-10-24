'use strict';
/*
 * HexaAgency — LAB 96 of the HexaCyberLab practice-lab programme.
 * A deliberately vulnerable agency management platform for AUTHORISED,
 * LOCAL-ONLY security training. Zero dependencies; Node built-ins only.
 * Binds 127.0.0.1:3105. All data is fake and lives in memory.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB_NUMBER = 96;
const LAB_NAME = 'HexaAgency';
const PORT = 3105;
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');

/* ------- scattered key material, region 1 of 6 (do not reorder) ------- */
const _e1 = ['TC1YSA=='];
const _c1 = ['TC1YSA=='];

/* ------------------------------ state ------------------------------ */
let state = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadState() {
  try {
    const raw = fs.readFileSync(PROGRESS_FILE, 'utf8');
    const s = JSON.parse(raw);
    if (s && typeof s === 'object') state = Object.assign(state, s);
  } catch (e) { /* fresh install */ }
}
function saveState() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2)); } catch (e) { /* ignore */ }
}
loadState();

/* ------------------------------ seed ------------------------------ */
const users = [
  { id: 1, email: 'admin@hexaagency.local',  password: 'admin123',  name: 'Ada Admin',    role: 'admin',   clientId: 0 },
  { id: 2, email: 'pm@hexaagency.local',     password: 'pm12345',   name: 'Peter Manager', role: 'manager', clientId: 0 },
  { id: 3, email: 'dev@hexaagency.local',    password: 'dev12345',  name: 'Dana Dev',      role: 'staff',   clientId: 0 },
  { id: 4, email: 'alice@acme.local',        password: 'alice123',  name: 'Alice Acme',    role: 'client',  clientId: 1 },
  { id: 5, email: 'bob@globex.local',        password: 'bob12345',   name: 'Bob Globex',    role: 'client',  clientId: 2 },
  { id: 6, email: 'demo@hexaagency.local',   password: 'demo1234',  name: 'Demo Dave',     role: 'staff',   clientId: 0 }
];
const clients = [
  { id: 1, name: 'Acme Corp',    contact: 'alice@acme.local',   notes: 'Retail rebrand account. CONFIDENTIAL retainer terms.' },
  { id: 2, name: 'Globex Ltd',   contact: 'bob@globex.local',   notes: 'SaaS launch account.' },
  { id: 3, name: 'Initech',      contact: 'ivy@initech.local',  notes: 'Prospect — contract not yet signed.' }
];
const projects = [
  { id: 1, clientId: 1, name: 'Acme Website Redesign', status: 'active',   budget: 12000 },
  { id: 2, clientId: 1, name: 'Acme SEO Retainer',     status: 'active',   budget: 3000 },
  { id: 3, clientId: 2, name: 'Globex Product Launch', status: 'active',   budget: 20000 },
  { id: 4, clientId: 3, name: 'Initech Internal Pitch', status: 'internal', budget: 0 }
];
const contracts = [
  { id: 1, clientId: 1, projectId: 1, title: 'Acme Master Services Agreement', value: 15000, status: 'active' },
  { id: 2, clientId: 2, projectId: 3, title: 'Globex Launch SOW',              value: 20000, status: 'active' }
];
const invoices = [
  { id: 1, clientId: 1, projectId: 1, number: 'INV-1001', amount: 2400, status: 'unpaid' },
  { id: 2, clientId: 2, projectId: 3, number: 'INV-1002', amount: 5000, status: 'unpaid' },
  { id: 3, clientId: 1, projectId: 2, number: 'INV-1003', amount: 750,  status: 'paid' }
];
const deliverables = [
  { id: 1, projectId: 1, clientId: 1, name: 'Acme Brand Guidelines v2', file: 'acme-brand-guidelines.txt' },
  { id: 2, projectId: 3, clientId: 2, name: 'Globex Launch Plan',       file: 'globex-launch-plan.txt' },
  { id: 3, projectId: 1, clientId: 1, name: 'Acme Homepage Mockup Notes', file: 'acme-mockup-notes.txt' }
];
const timesheets = [
  { id: 1, userId: 3, projectId: 1, hours: 6, note: 'Homepage build' },
  { id: 2, userId: 3, projectId: 3, hours: 4, note: 'Launch page QA' },
  { id: 3, userId: 2, projectId: 1, hours: 2, note: 'Client call' }
];
let sessions = {};          // sid -> { userId, role }   (role is the server-side session role)
let resetTokens = {};       // email -> token most recently "issued" by /forgot
let userSeq = 100, loginFails = {};
function probeEnum(req, email) {
  const ip = (req.socket && req.socket.remoteAddress) || 'local';
  if (!state.enumSeen || typeof state.enumSeen !== 'object') state.enumSeen = {};
  const seen = state.enumSeen[ip] || (state.enumSeen[ip] = []);
  const e = String(email || '').toLowerCase();
  if (e && !seen.includes(e)) { seen.push(e); saveState(); }
  if (seen.length >= 5) pass('auth-enum');
}

/* ------- scattered key material, region 2 of 6 (do not reorder) ------- */
const _e2 = ['Wi02OQ=='];
const _c2 = ['VS03OQ=='];

/* ------------------------------ TESTS registry ------------------------------ */
const TESTS = [
  /* ---- Login & Authentication (6) ---- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL injection login bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login form builds its account lookup by gluing your input straight into a query string.', "Try a classic tautology in the email field, e.g. something with ' OR '1'='1 in it.", "Use email: ' OR '1'='1' -- with any password — you are logged in as the first account (the admin)."],
    lesson: 'String-built queries let an attacker rewrite the logic of the lookup itself; a login is only as strong as its query construction.',
    impact: 'On a real agency platform this hands an attacker the admin account in seconds — every client, contract and invoice behind it is exposed.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute force — no rate limit or lockout', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Keep guessing the same account\'s password — does anything ever slow you down or lock the account?', 'Script 10+ wrong passwords for one account and watch the responses stay identical.', 'After 10 failed attempts for one account the app still processes attempt 11 exactly the same — that missing throttle is the flaw.'],
    lesson: 'Without throttling or lockout, password guessing is free and unlimited; online brute force only needs time.',
    impact: 'A client-facing portal with no throttling lets attackers grind through password lists against staff accounts until one opens.',
    report: { title: 'No Rate Limiting or Account Lockout on Login Endpoint', severity: 'High', remediation: 'Add progressive delays, lockout after repeated failures, and alerting on credential-stuffing patterns.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User enumeration via differing responses', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the login error for an email that exists with one that does not.', 'Also compare the forgot-password message for real vs fake emails.', 'Probe 5+ different emails — the app says "account exists" in one path and "no such account" in the other, building you a valid user list.'],
    lesson: 'Different error messages for "user exists" vs "no such user" turn your login and reset forms into a user-directory oracle.',
    impact: 'Attackers harvest the valid staff/client email list first, then aim phishing and password attacks only at accounts that exist.',
    report: { title: 'User Enumeration via Login and Password-Reset Responses', severity: 'Medium', remediation: 'Return one generic message for all credential and reset outcomes, regardless of whether the account exists.' } },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Demo / default credentials accepted', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['The login page itself hints at a demo account — read it carefully.', 'Demo accounts shipped for sales demos almost never get removed.', 'Log in with the demo credentials printed on the login page (demo@hexaagency.local / demo1234).'],
    lesson: 'Demo and default accounts are production accounts with published passwords; attackers try them before anything clever.',
    impact: 'A forgotten demo login on a real agency portal is a standing invitation into live client work.',
    report: { title: 'Active Demo Account with Published Credentials', severity: 'High', remediation: 'Remove demo/default accounts from production, or gate them behind the same controls as real accounts with unique secrets.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable password-reset token', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a reset for your own account and study the token format in the URL you are given.', 'The token looks structured — part of it clearly relates to the account.', 'Tokens are HA<userId>-<userId*137+42>. Compute another user\'s token (e.g. the admin, id 1) and reset their password without any email.'],
    lesson: 'A reset token derived from public data (the user id) is not a secret at all — anyone can mint one for any account.',
    impact: 'Predictable reset tokens mean instant takeover of the agency admin account and every client relationship behind it.',
    report: { title: 'Password Reset Tokens Are Predictable (Derived from User ID)', severity: 'Critical', remediation: 'Generate reset tokens from a CSPRNG, store only a hash, expire them quickly and make them single-use.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Role cookie tampering (hx_role)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After logging in, inspect your cookies — one of them mirrors your role.', 'The server trusts that cookie for the admin area instead of its own session record.', 'Set the hx_role cookie to "admin" in your browser, then visit /admin — the gate opens on your word alone.'],
    lesson: 'Authorisation data must live server-side; a role stored in a client cookie is a role the client chooses.',
    impact: 'Any low-privilege client login becomes an admin by editing a cookie — full control of the agency\'s clients, contracts and team.',
    report: { title: 'Authorisation Role Taken from a Client-Controlled Cookie', severity: 'Critical', remediation: 'Derive roles only from the server-side session record; never trust role claims supplied by the client.' } },
  /* ---- Registration & Profile (4) ---- */
  { id: 'reg-weakpw', feature: 'Registration & Profile', name: 'Weak password policy (1 character)', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a new account and shrink the password down — how short can it go?', 'The form never checks length or complexity.', 'Create an account with the password "x" — it is accepted, and that account can be brute-forced instantly.'],
    lesson: 'A password policy that accepts one character guarantees some accounts will have guessable passwords.',
    impact: 'Weak-password accounts on a client portal are the soft underbelly attackers probe first.',
    report: { title: 'Password Policy Accepts Single-Character Passwords', severity: 'Medium', remediation: 'Enforce a minimum length (12+) and screen against known-breached password lists at registration.' } },
  { id: 'reg-massassign', feature: 'Registration & Profile', name: 'Mass assignment — role via registration', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration handler binds every submitted field onto the new user object.', 'What fields does a user record have that the form never shows? Think role.', 'Submit the registration form with an extra field role=admin — your new account is created as an administrator.'],
    lesson: 'Binding request bodies straight onto models lets attackers set fields the UI never offered — including privilege fields.',
    impact: 'Self-registration straight into an admin account means total compromise of the agency platform from the public sign-up page.',
    report: { title: 'Mass Assignment Allows Privilege Escalation at Registration', severity: 'Critical', remediation: 'Whitelist bindable fields per endpoint; never accept role/privilege fields from the client.' } },
  { id: 'reg-storedxss', feature: 'Registration & Profile', name: 'Stored XSS in display name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is rendered on team and admin pages exactly as typed.', 'Names are not encoded on output anywhere in the app.', 'Register (or rename yourself) with a name like <script>alert(1)</script> — it is stored and rendered raw to other users.'],
    lesson: 'Any field that is stored and later displayed is an XSS carrier if output is not encoded — names are the classic carrier.',
    impact: 'A poisoned display name fires in the admin\'s browser, enabling session theft and actions taken as the agency admin.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-encode all user-supplied output and validate input on the server side.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on profile update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The profile form posts without any anti-CSRF token; the app only checks a same-site marker it sets itself.', 'A cross-site form post will not carry that marker cookie\'s form field.', 'Submit a profile change with no hx_origin marker (e.g. via curl) — the change is accepted, proving no CSRF defence exists.'],
    lesson: 'State-changing forms without anti-CSRF tokens can be submitted by any website the victim visits while logged in.',
    impact: 'An attacker page could silently rewrite a staff member\'s profile — or their email — while they browse the web logged in.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require per-session anti-CSRF tokens on all state-changing requests and verify Origin/Referer.' } }
];

TESTS.push(
  /* ---- Search (2) ---- */
  { id: 'search-sqli', feature: 'Search', name: 'SQL injection in global search', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Search builds its WHERE clause by string concatenation, just like login.', 'A tautology in the query makes the filter match every row in the table.', "Search for ' OR '1'='1 — the results dump every client and project, including ones outside your access."],
    lesson: 'Injection flaws rarely live in just one form — an unsafe query pattern repeated across the app multiplies the exposure.',
    impact: 'One search box can dump the agency\'s entire client list and project pipeline to any logged-in user.',
    report: { title: 'SQL Injection in Global Search Returns All Records', severity: 'High', remediation: 'Parameterise every query; apply the same fix pattern consistently across all search endpoints.' } },
  { id: 'search-xss', feature: 'Search', name: 'Reflected XSS in search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your search term is echoed back in the results heading.', 'It is echoed without any encoding.', 'Search for <script>alert(1)</script> — the payload is reflected raw into the page.'],
    lesson: 'Echoing user input into a page without encoding is reflected XSS, a delivery vehicle for session theft.',
    impact: 'A crafted search link sent to an agency admin runs script in their session when clicked.',
    report: { title: 'Reflected Cross-Site Scripting in Search Results', severity: 'Medium', remediation: 'HTML-encode all reflected user input; add a Content-Security-Policy as defence in depth.' } },
  /* ---- Clients & Client Portal (3) ---- */
  { id: 'client-idor', feature: 'Clients & Client Portal', name: 'Client record IDOR (cross-client data leak)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Log in as a client (alice@acme.local) and open your client record from the portal.', 'The URL carries a sequential id, and the server never checks that it is yours.', 'Visit /clients/2 while logged in as client 1 — you see the other client\'s record, including confidential notes.'],
    lesson: 'Checking that a user is logged in is not the same as checking the object belongs to them — that gap is IDOR.',
    impact: 'Every client of the agency can read every other client\'s confidential commercial notes by changing a number in the URL.',
    report: { title: 'Insecure Direct Object Reference Exposes Other Clients\' Records', severity: 'High', remediation: 'Enforce per-object ownership checks on every request, server-side, before serving any record.' } },
  { id: 'portal-notes', feature: 'Clients & Client Portal', name: 'Editing another client\'s internal notes', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The client-notes update endpoint trusts the id in the form body.', 'It never compares the record\'s owner with your session.', 'As client 1, POST a notes change for clientId 2 — the other client\'s internal notes are overwritten.'],
    lesson: 'Read-only IDOR is bad; write IDOR lets attackers corrupt business records, not just read them.',
    impact: 'A malicious client could vandalise or falsify the agency\'s internal notes about competitors — data-integrity damage, not just leakage.',
    report: { title: 'Broken Access Control Allows Editing Other Clients\' Notes', severity: 'High', remediation: 'Authorise every write against the object owner on the server; ignore client-supplied ownership claims.' } },
  { id: 'portal-list', feature: 'Clients & Client Portal', name: 'Full client directory exposed to client accounts', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The /clients index was built for staff — but who actually gets blocked?', 'Client accounts are authenticated, and that is the only check the page makes.', 'Log in as any client and open /clients — the entire client directory is listed.'],
    lesson: 'Pages protected only by "must be logged in" leak to the lowest-privilege accounts on the system.',
    impact: 'The agency\'s whole client roster — a trade secret in itself — is visible to any single client login.',
    report: { title: 'Client Directory Accessible to Client-Role Accounts', severity: 'Medium', remediation: 'Apply role-based authorisation per route, not just authentication.' } },
  /* ---- Projects (3) ---- */
  { id: 'project-idor', feature: 'Projects', name: 'Project IDOR (other clients\' projects)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Project pages follow the same sequential-id pattern as client records.', 'Open one of your projects, then change the id.', 'As Acme\'s user, open /projects/3 — Globex\'s launch project, with its budget, is served to you.'],
    lesson: 'IDOR patterns repeat across every resource type; finding one means auditing them all.',
    impact: 'Competitors who are also agency clients can read each other\'s project scopes and budgets — a serious commercial leak.',
    report: { title: 'Project Records Accessible Across Client Boundaries (IDOR)', severity: 'High', remediation: 'Scope every project query to the session user\'s client (or staff role) on the server.' } },
  { id: 'project-budget', feature: 'Projects', name: 'Budget tampering via project update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The project update endpoint accepts the fields it is given — including money fields.', 'The form shows status only, but the handler binds more than the form shows.', 'POST a status update for your project with an extra budget field set to 1 — the stored budget changes.'],
    lesson: 'Over-posting / mass assignment on update endpoints lets users rewrite financial fields they were only meant to view.',
    impact: 'A client could rewrite a project budget to $1 and dispute every later invoice on that basis.',
    report: { title: 'Mass Assignment on Project Update Allows Budget Tampering', severity: 'High', remediation: 'Whitelist updatable fields per role; recompute financial values server-side.' } },
  { id: 'project-internal', feature: 'Projects', name: 'Internal project visible to clients', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['One seeded project is marked internal — it should never appear for client accounts.', 'Direct URLs bypass the listing filters entirely.', 'Open /projects/4 as a client — the internal pitch project is served even though it is hidden from your list.'],
    lesson: 'Hiding a record from a listing is not access control; direct object access must check visibility too.',
    impact: 'Internal pitch and strategy work leaking to a client can burn deals and expose the agency\'s playbook.',
    report: { title: 'Internal-Only Project Accessible by Direct URL', severity: 'Medium', remediation: 'Enforce visibility/ownership checks in the object handler itself, not only in list queries.' } },
  /* ---- Contracts & Invoices (4) ---- */
  { id: 'contract-idor', feature: 'Contracts & Invoices', name: 'Contract IDOR', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Contracts use sequential ids and the same missing ownership check.', 'Find your own contract, then increment the id.', 'As client 1 open /contracts/2 — the other client\'s agreement and its value are fully readable.'],
    lesson: 'Contracts concentrate commercial sensitivity; they deserve the strictest object-level checks.',
    impact: 'Clients reading each other\'s signed agreement values destroys negotiating confidentiality across the whole roster.',
    report: { title: 'Contract Records Exposed via IDOR', severity: 'High', remediation: 'Check contract ownership against the session on every read; log cross-account access attempts.' } },
  { id: 'invoice-idor', feature: 'Contracts & Invoices', name: 'Invoice IDOR', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Invoices follow the same pattern: sequential ids, login-only check.', 'Open your invoice, then change the id in the URL.', 'As client 1 open /invoices/2 — another client\'s $5,000 invoice is displayed.'],
    lesson: 'Financial documents are prime IDOR targets because ids are predictable and the data is immediately useful.',
    impact: 'Invoice leakage reveals what every other client pays — pricing intelligence competitors would pay for.',
    report: { title: 'Invoice Records Exposed via IDOR', severity: 'High', remediation: 'Server-side ownership check on every invoice read and download.' } },
  { id: 'invoice-amount', feature: 'Contracts & Invoices', name: 'Invoice amount tampering at payment', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['The pay form submits the amount back to the server — and the server believes it.', 'The stored invoice amount is never compared with what you submit.', 'Pay invoice INV-1001 but submit amount=1 — the $2,400 invoice is marked PAID IN FULL for $1.'],
    lesson: 'Money values must be recomputed or verified server-side; a client-supplied amount is a suggestion, not a fact.',
    impact: 'Any client can settle any invoice for $1 — direct, immediate revenue loss for the agency.',
    report: { title: 'Client-Supplied Payment Amount Trusted — Invoices Settled for $1', severity: 'Critical', remediation: 'Take amounts only from the server-side invoice record; reject payments that do not match the stored total.' } },
  { id: 'invoice-status', feature: 'Contracts & Invoices', name: 'Marking your own invoice paid (status endpoint)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['There is a staff endpoint that flips invoice status — look at what authorisation it performs.', 'It checks that you are logged in. Nothing more.', 'POST to /invoices/<id>/status with status=paid as a client — your unpaid invoice becomes PAID without any payment.'],
    lesson: 'Privileged state transitions must verify role, not just session presence — a status flip is a financial action.',
    impact: 'Clients can zero their own bills with a single request, no payment involved at all.',
    report: { title: 'Invoice Status Transition Missing Role Authorisation', severity: 'Critical', remediation: 'Restrict status transitions to finance/staff roles and record an audit trail for every change.' } },
  /* ---- Deliverables & Files (2) ---- */
  { id: 'file-download-idor', feature: 'Deliverables & Files', name: 'Deliverable download IDOR', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Deliverable downloads are keyed by sequential id like everything else here.', 'Download your own deliverable, then change the id.', 'As client 1, download deliverable 2 — the other client\'s launch plan file is served to you.'],
    lesson: 'File downloads need the same ownership checks as pages; the file itself is the crown jewel.',
    impact: 'Finished client work — brand guidelines, launch plans — can be stolen by any other client with a login.',
    report: { title: 'Deliverable Files Downloadable Across Client Boundaries', severity: 'High', remediation: 'Authorise downloads against the deliverable\'s owning project/client before streaming any file.' } },
  { id: 'file-traversal', feature: 'Deliverables & Files', name: 'Path traversal on file download', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The /download endpoint joins the file parameter straight onto the files directory.', 'Dot-dot segments are never stripped or checked.', 'Request /download?file=../server.js — the application\'s own source code is returned.'],
    lesson: 'Unsanitised path joins turn a download feature into a read-anything primitive on the server filesystem.',
    impact: 'Source code disclosure exposes every other flaw in the app and can cascade into full server compromise.',
    report: { title: 'Path Traversal in File Download Allows Arbitrary File Read', severity: 'Critical', remediation: 'Resolve and whitelist paths inside the intended directory; reject any path that escapes it.' } },
  /* ---- Admin Panel (2) ---- */
  { id: 'admin-bac', feature: 'Admin Panel', name: 'Admin panel open to any logged-in user', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The /admin page checks for a session — and trusts the hx_role cookie for the rest.', 'Actually, look closer: any authenticated session reaches further than it should.', 'Log in as an ordinary staff or client account and open /admin/users — the full user table with password hashes is listed.'],
    lesson: 'Admin surfaces must check the role from the server-side session on every single request, without exception.',
    impact: 'The entire staff credential list exposed to any login is one step from full platform takeover.',
    report: { title: 'Admin User List Accessible Without Admin Role', severity: 'Critical', remediation: 'Enforce admin role checks server-side on all admin routes; never expose password material in any view.' } },
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'CSRF on admin user deactivation', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    hints: ['Admin actions are plain POSTs with no anti-CSRF token.', 'The app\'s own marker check is missing on the admin deactivate endpoint entirely.', 'POST /admin/users/<id>/deactivate with no hx_origin marker — the user is deactivated anyway.'],
    lesson: 'CSRF on an admin action turns any page an admin views into a weapon against their own platform.',
    impact: 'An attacker could deactivate the agency\'s staff accounts through a booby-trapped link the admin clicks.',
    report: { title: 'Missing CSRF Protection on Admin User Deactivation', severity: 'High', remediation: 'Require anti-CSRF tokens on all admin actions and verify the request origin.' } }
);

/* ------- scattered key material, region 3 of 6 (do not reorder) ------- */
const _e3 = ['RklaNQ=='];
const _c3 = ['NlQ0OA=='];

/* ------------------------------ progress engine ------------------------------ */
const TOTAL = TESTS.length;
const FEATURES = [];
for (const t of TESTS) if (!FEATURES.includes(t.feature)) FEATURES.push(t.feature);
function attempt(feature) {
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  saveState();
}
function pass(id) {
  if (!state.tests[id]) {
    state.tests[id] = true;
    if (TESTS.every(t => state.tests[t.id])) {
      state.completedAt = new Date().toISOString();
      state.keyRevealed = true;
    }
    saveState();
  }
}
function doneCount() { return TESTS.filter(t => state.tests[t.id]).length; }
function pct() { return Math.floor(doneCount() / TOTAL * 100); }
function isComplete() { return doneCount() === TOTAL; }
function featureStats() {
  const out = {};
  for (const f of FEATURES) {
    const list = TESTS.filter(t => t.feature === f);
    out[f] = { total: list.length, done: list.filter(t => state.tests[t.id]).length, attempts: state.attempts[f] || 0 };
  }
  return out;
}

/* ------------------------------ helpers ------------------------------ */
function esc(s) { return String(s == null ? '' : s); } // deliberately NO encoding — the labs' XSS flaws live here
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function readBody(req) {
  return new Promise(res => {
    let b = '';
    req.on('data', c => { b += c; if (b.length > 1e6) req.destroy(); });
    req.on('end', () => res(b));
    req.on('error', () => res(''));
  });
}
function parseForm(body) {
  const out = {};
  for (const pair of body.split('&')) {
    if (!pair) continue;
    const i = pair.indexOf('=');
    const k = decodeURIComponent((i < 0 ? pair : pair.slice(0, i)).replace(/\+/g, ' '));
    const v = decodeURIComponent((i < 0 ? '' : pair.slice(i + 1)).replace(/\+/g, ' '));
    out[k] = v;
  }
  return out;
}
function sessionOf(req) {
  const c = parseCookies(req);
  return (c.hx_session && sessions[c.hx_session]) ? sessions[c.hx_session] : null;
  // NOTE: hx_role cookie is deliberately NOT part of the authoritative session —
  // the vulnerable admin gate below trusts it anyway.
}
function newSession(user) {
  const sid = crypto.randomBytes(12).toString('hex');
  sessions[sid] = { userId: user.id, role: user.role };
  return sid;
}

/* Tiny evaluator for the string-built "queries" this app pretends to run.
   Supports:  field = 'literal'  combined with AND / OR and -- comments.
   It exists so injection payloads genuinely change the lookup logic. */
function evalQuery(query, row) {
  let q = query;
  const ci = q.indexOf('--');
  if (ci >= 0) q = q.slice(0, ci);
  const wi = q.toUpperCase().indexOf(' WHERE ');
  if (wi >= 0) q = q.slice(wi + 7);
  const orTerms = q.split(/\s+OR\s+/i);
  return orTerms.some(term => {
    const andTerms = term.split(/\s+AND\s+/i);
    return andTerms.every(cond => {
      const t = cond.trim();
      const lit = t.match(/^'([^']*)'\s*=\s*'([^']*)'$/);
      if (lit) return lit[1] === lit[2];
      const m = t.match(/^([A-Za-z0-9_]+)\s*=\s*'([^']*)'$/);
      if (!m) return false;
      return String(row[m[1]] == null ? '' : row[m[1]]) === m[2];
    });
  });
}
function hasXss(s) { return /<script|onerror=|onload=|<svg|<img[^>]*on/i.test(String(s || '')); }

/* ------- scattered key material, region 4 of 6 (do not reorder) ------- */
const _e4 = ['LTdFNw=='];
const _c4 = ['LU82VA=='];

function unshard(parts) { return parts.map(p => [...Buffer.from(p, 'base64').toString('utf8')].reverse().join('')).join(''); }
function entryKey() { return unshard([..._e1, ..._e2, ..._e3, ..._e4, ..._e5, ..._e6]); }
function completionKey() { return unshard([..._c1, ..._c2, ..._c3, ..._c4, ..._c5, ..._c6]); }

/* ------------------------------ layout ------------------------------ */
function header(title) {
  const d = doneCount(), p = pct();
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} — ${LAB_NAME}</title>
<style>body{font-family:system-ui,Arial,sans-serif;margin:0;background:#f6f7f9;color:#1c2333}
.top{background:#10182b;color:#fff;padding:10px 18px;display:flex;gap:14px;align-items:center}
.top img{height:30px}.top a{color:#9fd0ff;text-decoration:none;margin-right:10px}
.bar{height:8px;background:#2a3350;border-radius:4px;flex:1;min-width:120px}.bar>i{display:block;height:8px;background:#37c978;border-radius:4px}
main{max-width:920px;margin:22px auto;padding:0 16px} .card{background:#fff;border:1px solid #dde2ec;border-radius:10px;padding:16px 18px;margin:12px 0}
button,.btn{background:#2456d6;color:#fff;border:0;border-radius:6px;padding:8px 14px;cursor:pointer;text-decoration:none;display:inline-block}
input,select,textarea{padding:7px;border:1px solid #c4cbda;border-radius:6px;margin:3px 0;width:100%;box-sizing:border-box}
table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #e4e8f0;padding:6px 8px;text-align:left;vertical-align:top}
.hintbox{background:#fffbe6;border:1px solid #e8d48b;padding:8px;border-radius:6px;margin:6px 0}
#chatbtn{position:fixed;right:16px;bottom:16px;z-index:9}
#chatpanel{position:fixed;right:16px;bottom:64px;width:330px;background:#fff;border:1px solid #c4cbda;border-radius:10px;padding:10px;z-index:9;box-shadow:0 8px 30px rgba(0,0,0,.2)}
#chatlog{height:190px;overflow:auto;font-size:13px;margin-bottom:8px}.small{color:#5a6680;font-size:12px}
</style></head><body>
<div class="top"><img src="/logo.png" alt="HexaCyberLab"><strong>LAB ${LAB_NUMBER} — ${LAB_NAME}</strong>
<span>${d}/${TOTAL} tests · ${p}%</span><span class="bar"><i style="width:${p}%"></i></span>
<nav><a href="/">Home</a><a href="/tests">Mission Board</a><a href="/search">Search</a><a href="/clients">Clients</a><a href="/projects">Projects</a><a href="/admin/users">Admin</a></nav></div>
<main>`;
}
function footer() {
  return `</main>
<button id="chatbtn" onclick="var p=document.getElementById('chatpanel');p.style.display=p.style.display=='none'?'block':'none'">Lab Coach</button>
<div id="chatpanel" style="display:none"><div id="chatlog"></div>
<input id="chatmsg" placeholder="Ask the Lab Coach…" onkeydown="if(event.key=='Enter')sendChat()">
<button onclick="sendChat()">Send</button></div>
<script>
function sendChat(){var m=document.getElementById('chatmsg');var log=document.getElementById('chatlog');
log.innerHTML+='<div><b>You:</b> '+m.value+'</div>';
fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m.value})})
.then(r=>r.json()).then(j=>{log.innerHTML+='<div><b>Coach:</b> '+j.reply+'</div>';log.scrollTop=1e6;});m.value='';}
</script></body></html>`;
}
function page(res, status, html, extraHeaders) {
  res.writeHead(status, Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, extraHeaders || {}));
  res.end(html);
}
function redirect(res, to, extraHeaders) {
  res.writeHead(302, Object.assign({ Location: to }, extraHeaders || {}));
  res.end();
}
function gatePage() {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Locked — LAB ${LAB_NUMBER}</title></head>
<body style="font-family:system-ui;max-width:560px;margin:60px auto;padding:0 16px">
<img src="/logo.png" style="height:44px">
<h1>LAB ${LAB_NUMBER} — ${LAB_NAME}</h1>
<p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
<form method="POST" action="/unlock"><input name="key" placeholder="Completion key from Lab ${LAB_NUMBER - 1}" style="width:100%;padding:9px">
<p><button type="submit">Unlock Lab ${LAB_NUMBER}</button></p></form>
${footer()}</body></html>`;
}

/* ------------------------------ routes ------------------------------ */
async function handle(req, res) {
  const u = new URL(req.url, 'http://127.0.0.1');
  const p = u.pathname;
  const method = req.method;

  if (p === '/logo.png') {
    try { const img = fs.readFileSync(path.join(DIR, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(img); }
    catch (e) { res.writeHead(404); res.end('no logo'); }
    return;
  }
  if (p === '/api/progress') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ lab: LAB_NAME, number: LAB_NUMBER, total: TOTAL, done: doneCount(), pct: pct(), features: featureStats(), complete: isComplete() }));
    return;
  }
  if (p === '/api/chat' && method === 'POST') { /* handled after the gate below */ }
  else if (!state.unlocked) {
    if (p === '/unlock' && method === 'POST') {
      const raw = await readBody(req);
      let key = '';
      try { key = (JSON.parse(raw) || {}).key || ''; } catch (e) { key = parseForm(raw).key || ''; }
      if (String(key).trim() === entryKey()) {
        state.unlocked = true; saveState();
        redirect(res, '/');
      } else { res.writeHead(403, { 'Content-Type': 'text/html' }); res.end(gatePage()); }
      return;
    }
    if (p === '/api/chat' && method === 'POST') { /* coach works while locked */ }
    else { page(res, 200, gatePage()); return; }
  }

  if (p === '/api/chat' && method === 'POST') {
    let msg = '';
    try { msg = (JSON.parse(await readBody(req)) || {}).message || ''; } catch (e) { msg = ''; }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ reply: coachReply(String(msg)) }));
    return;
  }

  /* ---------- public auth pages ---------- */
  if (p === '/login') {
    if (method === 'POST') {
      const f = parseForm(await readBody(req));
      attempt('Login & Authentication');
      const email = f.email || '', pw = f.password || '';
      const query = "SELECT * FROM users WHERE email = '" + email + "' AND password = '" + pw + "'";
      let user = users.find(x => evalQuery(query, x));
      if (user && !users.some(x => x.email === email && x.password === pw)) pass('auth-sqli'); // query matched without an exact credential row
      if (!user) {
        probeEnum(req, email);
        loginFails[email] = (loginFails[email] || 0) + 1;
        if (loginFails[email] >= 10) pass('auth-brute');
        const exists = users.some(x => x.email === email);
        return page(res, 200, header('Login') + `<div class="card"><h2>Login failed</h2><p>${exists ? 'Wrong password for that account.' : 'No such account.'}</p><p><a href="/login">Try again</a></p></div>` + footer());
      }
      const sid = newSession(user);
      if (user.email === 'demo@hexaagency.local') pass('auth-default');
      return redirect(res, '/', { 'Set-Cookie': [`hx_session=${sid}; Path=/; HttpOnly`, `hx_role=${user.role}; Path=/`, `hx_origin=1; Path=/`] });
    }
    return page(res, 200, header('Login') + `<div class="card"><h2>Sign in to ${LAB_NAME}</h2>
<form method="POST"><label>Email</label><input name="email"><label>Password</label><input name="password" type="password">
<p><button>Sign in</button></p></form>
<p class="small">Demo account for evaluators: demo@hexaagency.local / demo1234</p>
<p><a href="/forgot">Forgot password?</a> · <a href="/register">Create an account</a></p></div>` + footer());
  }
  if (p === '/register') {
    if (method === 'POST') {
      const f = parseForm(await readBody(req));
      attempt('Registration & Profile');
      if ((f.password || '').length < 8) pass('reg-weakpw');
      const nu = { id: ++userSeq, email: f.email || '', password: f.password || '', name: f.name || '', role: 'client', clientId: 0 };
      if (f.role && f.role !== 'client') { nu.role = f.role; pass('reg-massassign'); }
      Object.assign(nu, {}); // (binding above is the mass-assignment flaw: extra fields land on the record)
      if (f.clientId) nu.clientId = Number(f.clientId) || 0;
      if (hasXss(nu.name)) pass('reg-storedxss');
      users.push(nu);
      const sid = newSession(nu);
      return redirect(res, '/', { 'Set-Cookie': [`hx_session=${sid}; Path=/; HttpOnly`, `hx_role=${nu.role}; Path=/`, `hx_origin=1; Path=/`] });
    }
    return page(res, 200, header('Register') + `<div class="card"><h2>Create your account</h2>
<form method="POST"><label>Name</label><input name="name"><label>Email</label><input name="email"><label>Password</label><input name="password" type="password">
<p><button>Create account</button></p></form></div>` + footer());
  }
  if (p === '/forgot') {
    if (method === 'POST') {
      const f = parseForm(await readBody(req));
      attempt('Login & Authentication');
      probeEnum(req, f.email || '');
      const user = users.find(x => x.email === (f.email || ''));
      if (user) {
        const token = 'HA' + user.id + '-' + (user.id * 137 + 42);
        resetTokens[user.email] = token;
        return page(res, 200, header('Forgot') + `<div class="card"><h2>Check your inbox</h2><p>Account exists — a reset link was sent to ${esc(user.email)}.</p><p class="small">(Lab note: the link would be /reset?email=${encodeURIComponent(user.email)}&amp;token=${token})</p></div>` + footer());
      }
      return page(res, 200, header('Forgot') + `<div class="card"><h2>Check your inbox</h2><p>No such account.</p></div>` + footer());
    }
    return page(res, 200, header('Forgot') + `<div class="card"><h2>Reset your password</h2>
<form method="POST"><label>Email</label><input name="email"><p><button>Send reset link</button></p></form></div>` + footer());
  }
  if (p === '/reset') {
    if (method === 'POST') {
      const f = parseForm(await readBody(req));
      attempt('Login & Authentication');
      const user = users.find(x => x.email === (f.email || ''));
      if (!user) return page(res, 200, header('Reset') + `<div class="card"><p>No such account.</p></div>` + footer());
      const expected = 'HA' + user.id + '-' + (user.id * 137 + 42); // VULN: token is derived from the user id, not random
      if ((f.token || '') === expected) {
        if (!resetTokens[user.email]) pass('auth-reset'); // accepted a token that was never issued
        user.password = f.password || user.password;
        delete resetTokens[user.email];
        return page(res, 200, header('Reset') + `<div class="card"><h2>Password changed</h2><p><a href="/login">Sign in</a></p></div>` + footer());
      }
      return page(res, 200, header('Reset') + `<div class="card"><p>Invalid or expired token.</p></div>` + footer());
    }
    const email = u.searchParams.get('email') || '', token = u.searchParams.get('token') || '';
    return page(res, 200, header('Reset') + `<div class="card"><h2>Choose a new password</h2>
<form method="POST"><input type="hidden" name="email" value="${esc(email)}"><input type="hidden" name="token" value="${esc(token)}">
<label>New password</label><input name="password" type="password"><p><button>Change password</button></p></form></div>` + footer());
  }

  const sess = sessionOf(req);
  if (!sess) return redirect(res, '/login');
  const me = users.find(x => x.id === sess.userId) || users[0];
  const cookies = parseCookies(req);

  /* ---------- home ---------- */
  if (p === '/') {
    const myProjects = me.role === 'client' ? projects.filter(x => x.clientId === me.clientId) : projects;
    return page(res, 200, header('Home') + `<div class="card"><h2>Welcome, ${esc(me.name)}</h2>
<p>Role: ${esc(me.role)}${me.clientId ? ' · Client #' + me.clientId : ''} · <a href="/profile">My profile</a> · <a href="/timesheets">Timesheets</a></p>
<h3>Projects</h3>${myProjects.map(x => `<p><a href="/projects/${x.id}">${esc(x.name)}</a> — $${x.budget} (${esc(x.status)})</p>`).join('')}</div>` + footer());
  }
  /* ---------- profile ---------- */
  if (p === '/profile') {
    if (method === 'POST') {
      const f = parseForm(await readBody(req));
      attempt('Registration & Profile');
      const marker = f.hx_origin || cookies.hx_origin_form;
      if (!marker) pass('reg-csrf'); // state change with no same-site marker at all
      if (typeof f.name === 'string' && f.name) { me.name = f.name; if (hasXss(me.name)) pass('reg-storedxss'); }
      if (typeof f.email === 'string' && f.email) me.email = f.email;
      return redirect(res, '/profile');
    }
    return page(res, 200, header('Profile') + `<div class="card"><h2>My profile</h2>
<form method="POST"><input type="hidden" name="hx_origin" value="1"><label>Name</label><input name="name" value="${esc(me.name)}">
<label>Email</label><input name="email" value="${esc(me.email)}"><p><button>Save</button></p></form></div>` + footer());
  }
  /* ---------- search ---------- */
  if (p === '/search') {
    const q = u.searchParams.get('q') || '';
    attempt('Search');
    let results = [];
    if (q) {
      const query = "SELECT * FROM clients WHERE name = '" + q + "'";
      const matchedClients = clients.filter(c => evalQuery(query, Object.assign({}, c, { name: c.name })));
      const ql = q.toLowerCase();
      const matchedProjects = projects.filter(x => x.name.toLowerCase().includes(ql));
      if (/'\s*or\s*'1'\s*=\s*'1/i.test(q)) pass('search-sqli');
      results = matchedClients.map(c => `<p>Client: <a href="/clients/${c.id}">${esc(c.name)}</a></p>`).join('') +
                matchedProjects.map(x => `<p>Project: <a href="/projects/${x.id}">${esc(x.name)}</a></p>`).join('');
      if (hasXss(q)) pass('search-xss');
    }
    return page(res, 200, header('Search') + `<div class="card"><h2>Search</h2>
<form method="GET"><input name="q" value="${esc(q)}"><p><button>Search</button></p></form>
${q ? `<h3>Results for ${esc(q)}</h3>` + (results || '<p>No matches.</p>') : ''}</div>` + footer());
  }

  /* ---------- clients & portal ---------- */
  if (p === '/clients') {
    if (me.role === 'client') pass('portal-list'); // directory served to a client-role account
    return page(res, 200, header('Clients') + `<div class="card"><h2>Clients</h2>
<table><tr><th>ID</th><th>Name</th><th>Contact</th></tr>
${clients.map(c => `<tr><td>${c.id}</td><td><a href="/clients/${c.id}">${esc(c.name)}</a></td><td>${esc(c.contact)}</td></tr>`).join('')}</table></div>` + footer());
  }
  let m;
  if ((m = p.match(/^\/clients\/(\d+)$/))) {
    const c = clients.find(x => x.id === Number(m[1]));
    if (!c) return page(res, 404, header('404') + '<div class="card"><p>No such client.</p></div>' + footer());
    attempt('Clients & Client Portal');
    if (method === 'POST') {
      const f = parseForm(await readBody(req));
      if (typeof f.notes === 'string') {
        if (me.role === 'client' && me.clientId !== c.id) pass('portal-notes');
        c.notes = f.notes;
      }
      return redirect(res, '/clients/' + c.id);
    }
    if (me.role === 'client' && me.clientId !== c.id) pass('client-idor');
    return page(res, 200, header('Client') + `<div class="card"><h2>${esc(c.name)}</h2>
<p>Contact: ${esc(c.contact)}</p><h3>Internal notes</h3><p>${esc(c.notes)}</p>
<form method="POST"><label>Update notes</label><textarea name="notes" rows="3">${esc(c.notes)}</textarea><p><button>Save notes</button></p></form></div>` + footer());
  }
  /* ---------- projects ---------- */
  if (p === '/projects') {
    const list = me.role === 'client' ? projects.filter(x => x.clientId === me.clientId && x.status !== 'internal') : projects;
    return page(res, 200, header('Projects') + `<div class="card"><h2>Projects</h2>
${list.map(x => `<p><a href="/projects/${x.id}">${esc(x.name)}</a> — $${x.budget} (${esc(x.status)})</p>`).join('')}</div>` + footer());
  }
  if ((m = p.match(/^\/projects\/(\d+)$/))) {
    const pr = projects.find(x => x.id === Number(m[1]));
    if (!pr) return page(res, 404, header('404') + '<div class="card"><p>No such project.</p></div>' + footer());
    attempt('Projects');
    if (method === 'POST') {
      const f = parseForm(await readBody(req));
      if (typeof f.status === 'string' && f.status) pr.status = f.status;
      if (f.budget !== undefined && Number(f.budget) !== pr.budget) { pr.budget = Number(f.budget); pass('project-budget'); }
      return redirect(res, '/projects/' + pr.id);
    }
    if (me.role === 'client' && me.clientId !== pr.clientId) pass('project-idor');
    if (pr.status === 'internal' && me.role === 'client') pass('project-internal');
    const inv = invoices.filter(i => i.projectId === pr.id);
    const del = deliverables.filter(d => d.projectId === pr.id);
    return page(res, 200, header('Project') + `<div class="card"><h2>${esc(pr.name)}</h2>
<p>Status: ${esc(pr.status)} · Budget: $${pr.budget} · Client #${pr.clientId}</p>
<form method="POST"><label>Status</label><input name="status" value="${esc(pr.status)}"><p><button>Update status</button></p></form>
<h3>Invoices</h3>${inv.map(i => `<p><a href="/invoices/${i.id}">${esc(i.number)}</a> — $${i.amount} (${esc(i.status)})</p>`).join('') || '<p>None.</p>'}
<h3>Deliverables</h3>${del.map(d => `<p>${esc(d.name)} — <a href="/download?id=${d.id}">download</a></p>`).join('') || '<p>None.</p>'}</div>` + footer());
  }
  /* ---------- contracts ---------- */
  if ((m = p.match(/^\/contracts\/(\d+)$/))) {
    const ct = contracts.find(x => x.id === Number(m[1]));
    if (!ct) return page(res, 404, header('404') + '<div class="card"><p>No such contract.</p></div>' + footer());
    attempt('Contracts & Invoices');
    if (me.role === 'client' && me.clientId !== ct.clientId) pass('contract-idor');
    return page(res, 200, header('Contract') + `<div class="card"><h2>${esc(ct.title)}</h2>
<p>Client #${ct.clientId} · Value: $${ct.value} · Status: ${esc(ct.status)}</p></div>` + footer());
  }
  /* ---------- invoices ---------- */
  if ((m = p.match(/^\/invoices\/(\d+)$/))) {
    const inv = invoices.find(x => x.id === Number(m[1]));
    if (!inv) return page(res, 404, header('404') + '<div class="card"><p>No such invoice.</p></div>' + footer());
    attempt('Contracts & Invoices');
    if (me.role === 'client' && me.clientId !== inv.clientId) pass('invoice-idor');
    return page(res, 200, header('Invoice') + `<div class="card"><h2>${esc(inv.number)}</h2>
<p>Amount due: $${inv.amount} · Status: ${esc(inv.status)}</p>
${inv.status !== 'paid' ? `<form method="POST" action="/invoices/${inv.id}/pay"><label>Amount</label><input name="amount" value="${inv.amount}">
<input type="hidden" name="hx_origin" value="1"><p><button>Pay now</button></p></form>
<form method="POST" action="/invoices/${inv.id}/status"><input type="hidden" name="status" value="paid"><p><button>Mark as paid (staff)</button></p></form>` : ''}</div>` + footer());
  }
  if ((m = p.match(/^\/invoices\/(\d+)\/pay$/)) && method === 'POST') {
    const inv = invoices.find(x => x.id === Number(m[1]));
    if (!inv) return page(res, 404, 'not found');
    attempt('Contracts & Invoices');
    const f = parseForm(await readBody(req));
    const paid = Number(f.amount);
    // VULN: the client-supplied amount is trusted as full settlement
    if (!isNaN(paid) && paid < inv.amount && inv.status !== 'paid') pass('invoice-amount');
    inv.status = 'paid';
    return redirect(res, '/invoices/' + inv.id);
  }
  if ((m = p.match(/^\/invoices\/(\d+)\/status$/)) && method === 'POST') {
    const inv = invoices.find(x => x.id === Number(m[1]));
    if (!inv) return page(res, 404, 'not found');
    attempt('Contracts & Invoices');
    const f = parseForm(await readBody(req));
    // VULN: any logged-in user may flip the status — no role check at all
    if (f.status) { if (f.status === 'paid' && inv.status !== 'paid') pass('invoice-status'); inv.status = f.status; }
    return redirect(res, '/invoices/' + inv.id);
  }
  /* ---------- deliverable downloads ---------- */
  if (p === '/download') {
    attempt('Deliverables & Files');
    const fileParam = u.searchParams.get('file');
    if (fileParam) {
      // VULN: path joined unsanitised — ../ escapes the files directory
      const target = path.normalize(path.join(DIR, 'files', fileParam));
      try {
        const data = fs.readFileSync(target);
        if (!target.startsWith(path.join(DIR, 'files'))) pass('file-traversal');
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(data);
      } catch (e) { page(res, 404, header('404') + '<div class="card"><p>File not found.</p></div>' + footer()); }
      return;
    }
    const d = deliverables.find(x => x.id === Number(u.searchParams.get('id')));
    if (!d) return page(res, 404, header('404') + '<div class="card"><p>No such deliverable.</p></div>' + footer());
    if (me.role === 'client' && me.clientId !== d.clientId) pass('file-download-idor');
    try {
      const data = fs.readFileSync(path.join(DIR, 'files', d.file));
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(data);
    } catch (e) { page(res, 404, header('404') + '<div class="card"><p>File missing.</p></div>' + footer()); }
    return;
  }
  /* ---------- timesheets ---------- */
  if (p === '/timesheets') {
    if (method === 'POST') {
      const f = parseForm(await readBody(req));
      timesheets.push({ id: timesheets.length + 1, userId: me.id, projectId: Number(f.projectId) || 1, hours: Number(f.hours) || 0, note: f.note || '' });
      return redirect(res, '/timesheets');
    }
    const mine = timesheets.filter(t => t.userId === me.id);
    return page(res, 200, header('Timesheets') + `<div class="card"><h2>My timesheets</h2>
${mine.map(t => `<p>Project #${t.projectId} — ${t.hours}h — ${esc(t.note)}</p>`).join('') || '<p>None yet.</p>'}
<form method="POST"><label>Project ID</label><input name="projectId" value="1"><label>Hours</label><input name="hours" value="1"><label>Note</label><input name="note"><p><button>Log time</button></p></form></div>` + footer());
  }
  /* ---------- admin ---------- */
  if (p === '/admin' || p === '/admin/users') {
    attempt('Admin Panel');
    // VULN 1: the gate trusts the client-supplied hx_role cookie instead of the session role
    if (cookies.hx_role === 'admin' && sess.role !== 'admin') pass('auth-cookie');
    if (sess.role === 'admin' || cookies.hx_role === 'admin') {
      return page(res, 200, header('Admin') + `<div class="card"><h2>Admin — users</h2>
<table><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Password</th><th></th></tr>
${users.map(x => `<tr><td>${x.id}</td><td>${esc(x.name)}</td><td>${esc(x.email)}</td><td>${esc(x.role)}</td><td>${esc(x.password)}</td>
<td><form method="POST" action="/admin/users/${x.id}/deactivate"><button>Deactivate</button></form></td></tr>`).join('')}</table></div>` + footer());
    }
    // VULN 2: the plain /admin/users list performs no role check at all (login only)
    if (p === '/admin/users') {
      pass('admin-bac');
      return page(res, 200, header('Admin') + `<div class="card"><h2>Admin — users</h2>
<table><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Password</th><th></th></tr>
${users.map(x => `<tr><td>${x.id}</td><td>${esc(x.name)}</td><td>${esc(x.email)}</td><td>${esc(x.role)}</td><td>${esc(x.password)}</td>
<td><form method="POST" action="/admin/users/${x.id}/deactivate"><button>Deactivate</button></form></td></tr>`).join('')}</table></div>` + footer());
    }
    return page(res, 403, header('Admin') + '<div class="card"><p>Admins only.</p></div>' + footer());
  }
  if ((m = p.match(/^\/admin\/users\/(\d+)\/deactivate$/)) && method === 'POST') {
    attempt('Admin Panel');
    const f = parseForm(await readBody(req));
    const target = users.find(x => x.id === Number(m[1]));
    // VULN: no anti-CSRF marker required on this admin action
    if (!f.hx_origin) pass('admin-csrf');
    if (target) target.role = 'deactivated';
    return redirect(res, '/admin/users');
  }

  /* ---------- mission board ---------- */
  if (p === '/tests') {
    const fs2 = featureStats();
    let body = `<div class="card"><h2>Mission Board — LAB ${LAB_NUMBER} ${LAB_NAME}</h2>
<p>${doneCount()}/${TOTAL} tests complete · ${pct()}% · Attempts are counted per feature; the Lab Coach unlocks step-by-step help for a feature after 3 genuine tries.</p></div>`;
    for (const f of FEATURES) {
      body += `<div class="card"><h3>${esc(f)} <span class="small">(${fs2[f].done}/${fs2[f].total} done · ${fs2[f].attempts} attempts)</span></h3>`;
      for (const t of TESTS.filter(x => x.feature === f)) {
        const done = state.tests[t.id];
        body += `<p>${done ? '✓' : '○'} <b>${esc(t.name)}</b> — ${esc(t.owasp)} · ${esc(t.difficulty)}
<details><summary>Hints</summary>
<div class="hintbox">Hint 1: ${esc(t.hints[0])}</div>
<div class="hintbox">Hint 2: ${esc(t.hints[1])}</div>
<div class="hintbox">Hint 3: ${esc(t.hints[2])}</div></details></p>`;
      }
      body += '</div>';
    }
    return page(res, 200, header('Mission Board') + body + footer());
  }
  /* ---------- completion ---------- */
  if (p === '/complete') {
    if (!isComplete()) {
      const left = TESTS.filter(t => !state.tests[t.id]);
      return page(res, 200, header('Complete') + `<div class="card"><h2>Not complete yet — ${pct()}%</h2>
<p>${doneCount()} of ${TOTAL} tests done. Still open:</p>${left.map(t => `<p>○ ${esc(t.name)} (${esc(t.feature)})</p>`).join('')}</div>` + footer());
    }
    const fs2 = featureStats();
    const key = completionKey();
    const body = `<div class="card"><h2>Lab ${LAB_NUMBER} — ${LAB_NAME}: COMPLETE</h2>
<h3>1 · Features in this lab</h3><p>${FEATURES.length} features: ${FEATURES.map(esc).join(', ')}</p>
<h3>2 · Vulnerabilities per feature</h3>${FEATURES.map(f => `<p>${esc(f)}: ${fs2[f].total}</p>`).join('')}
<h3>3 · Ways testing was done (${TOTAL} tests)</h3>${TESTS.map(t => `<p>✓ ${esc(t.name)} — ${esc(t.owasp)}</p>`).join('')}
<h3>4 · What you learned</h3>${TESTS.map(t => `<p><b>${esc(t.name)}:</b> ${esc(t.lesson)}</p>`).join('')}
<h3>5 · What this means for a real client</h3>${TESTS.map(t => `<p><b>${esc(t.name)}:</b> ${esc(t.impact)}</p>`).join('')}
<h3>6 · Writing it in a real report</h3>${TESTS.map(t => `<p><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)} — Remediation: ${esc(t.report.remediation)}</p>`).join('')}
<h3>Your completion key for Lab ${LAB_NUMBER + 1}</h3>
<p style="font-size:20px"><code>${key}</code></p>
<form method="POST" action="/set-name"><label>Your name for the certificate</label>
<input name="testerName" value="${esc(state.testerName || me.name)}"><p><button>Save name</button></p></form>
<p><a class="btn" href="/certificate">View your certificate</a></p></div>`;
    return page(res, 200, header('Complete') + body + footer());
  }
  if (p === '/set-name' && method === 'POST') {
    const f = parseForm(await readBody(req));
    if (f.testerName) { state.testerName = String(f.testerName).slice(0, 80); saveState(); }
    return redirect(res, '/complete');
  }
  if (p === '/certificate') {
    if (!isComplete()) return redirect(res, '/complete');
    const name = state.testerName || me.name;
    const date = state.completedAt ? new Date(state.completedAt).toDateString() : new Date().toDateString();
    return page(res, 200, `<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER}</title>
<style>body{font-family:Georgia,serif;background:#eef1f6}.cert{max-width:680px;margin:40px auto;background:#fff;border:3px solid #2456d6;border-radius:14px;padding:36px;text-align:center}
@media print{body{background:#fff}.cert{border-width:2px}}</style></head><body>
<div class="cert"><img src="/logo.png" style="height:56px">
<h1>Certificate of Completion</h1>
<p>This certifies that</p><h2>${esc(name)}</h2>
<p>has completed 100% of the security tests in LAB ${LAB_NUMBER} — ${LAB_NAME} (${TOTAL} tests across ${FEATURES.length} features)</p>
<p>${date}</p><p><i>HexaCyberLab — Built by Md. Jony Hassain, Founder</i></p></div></body></html>`);
  }

  return page(res, 404, header('404') + '<div class="card"><h2>404</h2><p>Page not found.</p></div>' + footer());
}

/* ------- scattered key material, region 5 of 6 (do not reorder) ------- */
const _e5 = ['V0o2VA=='];
const _c5 = ['OUhBMw=='];

/* ------------------------------ Lab Coach ------------------------------ */
function coachReply(rawMsg) {
  const msg = String(rawMsg || '').toLowerCase();
  const ATTRIB = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  if (/(who (built|made|created)|founder|who is (md\.? )?jony)/.test(msg)) return ATTRIB;
  if (/(key|unlock|next lab)/.test(msg) && !isComplete()) {
    return `I don't have the completion key yet — I only receive it when this lab is completed. You are at ${pct()}% (${doneCount()}/${TOTAL} tests). Finish every test and I will share it here, and it will also appear on the /complete page.`;
  }
  if (/(key|unlock|next lab)/.test(msg) && isComplete()) {
    return `You completed LAB ${LAB_NUMBER}! Your completion key for Lab ${LAB_NUMBER + 1} is: ${completionKey()} — paste it into Lab ${LAB_NUMBER + 1} to unlock it.`;
  }
  // feature match
  const f = FEATURES.find(x => msg.includes(x.toLowerCase())) ||
            FEATURES.find(x => x.toLowerCase().split(' ')[0].length > 3 && msg.includes(x.toLowerCase().split(' ')[0]));
  if (f) {
    const list = TESTS.filter(t => t.feature === f);
    if (/(how|solve|do|help|guide|bypass|exploit)/.test(msg)) {
      const att = state.attempts[f] || 0;
      const allDone = list.every(t => state.tests[t.id]);
      if (att >= 3 || allDone) {
        const open = list.filter(t => !state.tests[t.id]);
        if (!open.length) return `Every ${f} test is already complete — nice work. Pick another feature from the Mission Board (/tests).`;
        const t = open[0];
        return `Step by step for "${t.name}": ${t.hints[2]} Work through the ${f} tests in order on /tests — ${list.filter(x => state.tests[x.id]).length}/${list.length} done so far.`;
      }
      return `That feature is locked for help. First try the ${f} tests yourself at least 3 times — I can see you've tried ${att} time(s) so far. After 3 real tries, ask me again and I'll guide you step by step.`;
    }
    return `${f} has ${list.length} tests: ${list.map(t => t.name).join('; ')}. Attempts so far on this feature: ${state.attempts[f] || 0}. Ask me "how do I solve ${f}" after at least 3 genuine tries and I will guide you.`;
  }
  if (/(how many|features|tests|progress|status)/.test(msg)) {
    const fs2 = featureStats();
    return `LAB ${LAB_NUMBER} — ${LAB_NAME} has ${TOTAL} tests across ${FEATURES.length} features: ${FEATURES.map(x => `${x} (${fs2[x].done}/${fs2[x].total})`).join(', ')}. You are at ${pct()}%. Next: open the Mission Board at /tests and pick the first open test.`;
  }
  if (/(hi|hello|hey|start)/.test(msg)) {
    return `Welcome to LAB ${LAB_NUMBER} — ${LAB_NAME}. This lab has ${TOTAL} tests across ${FEATURES.length} features and you are at ${pct()}%. Open /tests for the Mission Board. Ask me about a feature by name (e.g. "how many tests in Projects") — step-by-step help unlocks after 3 genuine tries on that feature.`;
  }
  return `I can help with LAB ${LAB_NUMBER} — ${LAB_NAME}: ask me how many tests a feature has, or how to solve a feature (help unlocks after 3 genuine tries on it). Current progress: ${pct()}% (${doneCount()}/${TOTAL}). The Mission Board at /tests lists everything with graded hints.`;
}

/* ------- scattered key material, region 6 of 6 (do not reorder) ------- */
const _e6 = ['Q1FVVQ=='];
const _c6 = ['UTM1Vw=='];

/* ------------------------------ doc generation ------------------------------ */
function genDocs() {
  const byFeature = f => TESTS.filter(t => t.feature === f);
  let vuln = `# ${LAB_NAME} — Vulnerability Map (LAB ${LAB_NUMBER})\n\nEvery scored test in this lab, grouped by feature. ${TOTAL} tests across ${FEATURES.length} features.\n`;
  for (const f of FEATURES) {
    vuln += `\n## ${f}\n`;
    for (const t of byFeature(f)) {
      vuln += `\n### ${t.name}\n- OWASP: ${t.owasp}\n- Difficulty: ${t.difficulty}\n- Location: the ${f} flows of the ${LAB_NAME} app (see PRACTICE-GUIDE.md for the challenge).\n- Exploitation outline: ${t.hints[2]}\n- Impact: ${t.impact}\n`;
    }
  }
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'), vuln);

  let guide = `# ${LAB_NAME} — Practice Guide (LAB ${LAB_NUMBER})\n\nChallenges grouped by feature, then difficulty. Each challenge mirrors the Mission Board at /tests.\n`;
  const rank = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  for (const f of FEATURES) {
    guide += `\n## ${f}\n`;
    for (const t of byFeature(f).slice().sort((a, b) => rank[a.difficulty] - rank[b.difficulty])) {
      guide += `\n### [${t.difficulty}] ${t.name}\n- Objective: make the "${t.name}" test flip to done on /tests by performing the real exploit against the running app.\n- Hint 1: ${t.hints[0]}\n- Hint 2: ${t.hints[1]}\n- Hint 3: ${t.hints[2]}\n`;
    }
  }
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'), guide);

  let fix = `# ${LAB_NAME} — Fix & Retest (LAB ${LAB_NUMBER})\n\nFor every test: the secure implementation and the regression check that proves the flaw is gone.\n`;
  for (const f of FEATURES) {
    fix += `\n## ${f}\n`;
    for (const t of byFeature(f)) {
      fix += `\n### ${t.report.title} (${t.report.severity})\n- Secure implementation: ${t.report.remediation}\n- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("${t.name}"); it must now fail (no session granted, no foreign object served, no state changed) and the test must stay open on a fresh progress file.\n`;
    }
  }
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'), fix);
  console.log('docs generated: ' + TOTAL + ' tests');
}

/* ------------------------------ boot ------------------------------ */
if (process.argv.includes('--gen-docs')) { genDocs(); process.exit(0); }
const server = http.createServer((req, res) => {
  handle(req, res).catch(() => { try { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('error'); } catch (e) { /* socket gone */ } });
});
server.listen(PORT, '127.0.0.1', () => console.log(`LAB ${LAB_NUMBER} ${LAB_NAME} listening on 127.0.0.1:${PORT}`));
