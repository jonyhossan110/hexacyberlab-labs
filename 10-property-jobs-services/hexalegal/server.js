'use strict';
/*
 * HexaLegal — LAB 97 of 110 (Category 10: Property, Jobs & Professional Services)
 * A deliberately vulnerable legal-services portal for authorised, local-only
 * security training. Zero-dependency Node.js. ALL data is fake and simulated.
 * Binds 127.0.0.1:3106 only. NEVER deploy this publicly.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3106;
const LAB_NAME = 'HexaLegal';
const LAB_NUMBER = 97;
const PREV_LAB = 96;
const ROOT = __dirname;
const FILES_DIR = path.join(ROOT, 'files');
const PROGRESS_PATH = path.join(ROOT, 'progress.json');

/* ------------------------------------------------------------------ *
 * Key material — region A (of 4 scattered regions).
 * Keys are never stored as plain literals: each is split into pieces,
 * every piece reversed and base64-encoded, and the pieces are held in
 * separate regions of this file. One assembler rebuilds a key only at
 * the moment it is needed (unlock verification / 100% reveal).
 * ------------------------------------------------------------------ */
const _cfgA = ['TC1YSA==', 'VS03OQ==', 'NlQ0OA=='];           // entry key, pieces 1-3
const _cfgB = ['TC1YSA==', 'Ny04OQ==', 'UEw0UA=='];           // completion key, pieces 1-3

/* ------------------------- Seed data (all fake) ------------------------- */
const users = [
  { id: 1, name: 'Ada Admin',       email: 'admin@hexalegal.local',    password: 'admin123',  role: 'admin',    plan: 'firm' },
  { id: 2, name: 'Ava Attorney',    email: 'ava@hexalegal.local',      password: 'ava123',    role: 'attorney', plan: 'firm' },
  { id: 3, name: 'Liam Attorney',   email: 'liam@hexalegal.local',     password: 'liam123',   role: 'attorney', plan: 'firm' },
  { id: 4, name: 'Client One',      email: 'client.one@example.local', password: 'client123', role: 'client',   plan: 'standard' },
  { id: 5, name: 'Client Two',      email: 'client.two@example.local', password: 'client123', role: 'client',   plan: 'standard' },
  { id: 6, name: 'Demo Client',     email: 'demo@hexalegal.local',     password: 'demo123',   role: 'client',   plan: 'demo' }
];

const cases = [
  { id: 1, title: 'Contract Review — Northwind Sample', type: 'Contract',  clientId: 4, attorneyId: 2, status: 'open',
    description: 'Sample contract review matter for a fictional supplier agreement.',
    notes: 'ATTORNEY CONFIDENTIAL (sample): negotiation floor and fallback positions for the sample client. Never share outside the assigned team.' },
  { id: 2, title: 'Property Dispute — Sample Matter',   type: 'Property',  clientId: 4, attorneyId: 3, status: 'open',
    description: 'Sample boundary dispute between fictional neighbours.',
    notes: 'ATTORNEY CONFIDENTIAL (sample): witness list and draft statement strategy.' },
  { id: 3, title: 'Trademark Filing — Sample Brand',    type: 'Trademark', clientId: 5, attorneyId: 2, status: 'open',
    description: 'Sample trademark application for a fictional brand name.',
    notes: 'ATTORNEY CONFIDENTIAL (sample): filing strategy and known prior-art risks.' },
  { id: 4, title: 'DRAFT — Unfiled Merger Memo',        type: 'Corporate', clientId: 5, attorneyId: 3, status: 'draft',
    description: 'Unfiled draft memo. Not published, not visible in normal lists.',
    notes: 'ATTORNEY CONFIDENTIAL (sample): draft merger analysis — do not circulate.' },
  { id: 5, title: 'Demo Client Intake Matter',          type: 'General',   clientId: 6, attorneyId: 2, status: 'open',
    description: 'Sample intake matter for the demo client account.',
    notes: 'ATTORNEY CONFIDENTIAL (sample): intake observations.' }
];

const documents = [
  { id: 1, caseId: 1, file: 'engagement-letter.txt',  title: 'Engagement Letter' },
  { id: 2, caseId: 1, file: 'fee-agreement.txt',      title: 'Fee Agreement' },
  { id: 3, caseId: 3, file: 'case-notes-sample.txt',  title: 'Attorney Work Product — Sample Notes' }
];

const appointments = [
  { id: 1, caseId: 1, clientId: 4, attorneyId: 2, slot: '2026-11-02 10:00', status: 'booked', topic: 'Contract review call (sample)' },
  { id: 2, caseId: 3, clientId: 5, attorneyId: 2, slot: '2026-11-03 14:00', status: 'booked', topic: 'Trademark filing review (sample)' }
];

const invoices = [
  { id: 1, caseId: 1, clientId: 4, amount: 450, status: 'unpaid', label: 'Contract review — sample invoice' },
  { id: 2, caseId: 3, clientId: 5, amount: 900, status: 'unpaid', label: 'Trademark filing — sample invoice' },
  { id: 3, caseId: 2, clientId: 4, amount: 200, status: 'paid',   label: 'Property dispute — sample invoice' }
];

const uploads = new Map();       // name -> { content, by, caseId }
const sessions = new Map();      // sid -> { userId, origin }
const issuedResetTokens = new Set();
const failedLogins = new Map();  // email -> count (in-memory detection state)
const probedEmails = new Set();  // distinct emails probed (enumeration detection)

/* ------------------------------------------------------------------ *
 * Key material — region B (entry key, pieces 4-6).
 * ------------------------------------------------------------------ */
const _cfgC = ['LU82VA==', 'OUhBMw==', 'UTM1Vw=='];

function _unshard(pieces) {
  return pieces.map(p => p === '' ? '' : Buffer.from(p, 'base64').toString('utf8').split('').reverse().join('')).join('');
}
function entryKey() { return _unshard(_cfgA.concat(_cfgC)); }

/* ------------------------------ TESTS registry ------------------------------ */
const TESTS = [
  /* ---- Login & Authentication ---- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login form builds its database query by gluing your input straight into the query string.', 'What happens if your email contains a quote character followed by a logical operator?', "Try an email like ' OR '1'='1' -- with any password — the comment cuts the password check away."],
    lesson: 'String-built queries let attacker input change the meaning of the query itself; the database cannot tell data from code.',
    impact: 'On a real law-firm portal this hands an attacker the first account in the database — usually an administrator — with no password at all, exposing every client matter the firm holds.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements for all database access and never concatenate user input into SQL.' },
    where: 'POST /login', how: 'Submit an email containing a SQL fragment with a comment terminator and any password; a session is created without knowing a real password.',
    fix: 'Parameterise the login query, validate input types, and return a generic error for every failed login.' },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limiting or Lockout', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Keep guessing the same account\'s password. Does anything slow you down or lock the account?', 'Count your failed attempts — ten, twenty… the form never complains.', 'Submit 10 or more wrong passwords for one real account (e.g. ava@hexalegal.local) and notice every attempt is still processed.'],
    lesson: 'Without throttling or lockout, an online password form is an unlimited guessing machine — weak passwords fall quickly.',
    impact: 'Attackers can grind through common-password lists against attorney accounts overnight; one guessed password exposes confidential client files and billing.',
    report: { title: 'No Rate Limiting or Account Lockout on Login Endpoint', severity: 'High', remediation: 'Add progressive rate limiting, lockout or CAPTCHA after repeated failures, and alert on credential-stuffing patterns.' },
    where: 'POST /login', how: 'Submit at least 10 failed logins for one account; the application keeps accepting attempts with no throttle, delay, or lockout.',
    fix: 'Enforce per-account and per-IP throttling, temporary lockout after repeated failures, and monitoring/alerting.' },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User Enumeration via Different Error Messages', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the error for an email that exists with one that does not.', 'The forgot-password form leaks the same difference.', 'Probe at least 5 different emails across login / forgot-password and note which responses confirm an account exists.'],
    lesson: 'Different answers for "no such account" and "wrong password" turn the login page into a free directory of valid accounts.',
    impact: 'Attackers build a verified list of attorney and client emails from the firm\'s own pages, then aim phishing and password attacks only at accounts that definitely exist.',
    report: { title: 'Account Enumeration Through Divergent Authentication Responses', severity: 'Medium', remediation: 'Return one identical, generic message for every failed login and password-reset request regardless of account existence.' },
    where: 'POST /login and POST /forgot', how: 'Probe 5 or more distinct emails; responses differ depending on whether the account exists, confirming valid usernames.',
    fix: 'Use a single generic response and consistent timing for all authentication failures and reset requests.' },
  { id: 'auth-demo', feature: 'Login & Authentication', name: 'Published Demo Credentials', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Read the login page carefully — everything on it.', 'The page itself advertises a working account for "evaluators".', 'Use the demo email and password printed on the login page to sign in.'],
    lesson: 'Any credential printed in public is public forever; demo and default accounts are the first thing attackers try.',
    impact: 'Anyone on the internet can walk into the portal with the published demo login and browse whatever that account can reach — on a real firm that means real client matters.',
    report: { title: 'Working Demo Credentials Published on the Login Page', severity: 'High', remediation: 'Remove demo/default accounts from production, never publish credentials, and force unique passwords at first setup.' },
    where: 'Login page / POST /login', how: 'The login page prints a demo email and password; signing in with them succeeds.',
    fix: 'Delete demo accounts before go-live, scan for default credentials, and never print credentials in the UI.' },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a password reset and study the token format — then request another for a different account.', 'The token is built from something public about the account, combined with simple arithmetic.', 'Tokens look like HL<user id>-<user id times 149 plus 37>. Compute one for a user who never requested a reset and use it at /reset.'],
    lesson: 'A reset token is a temporary password; if it can be calculated from public data, account recovery becomes account takeover.',
    impact: 'Anyone who knows an attorney\'s user id can mint a valid reset token, set a new password, and read every confidential case that attorney handles.',
    report: { title: 'Password Reset Tokens Are Predictable and Not Tied to a Request', severity: 'Critical', remediation: 'Generate reset tokens with a CSPRNG (at least 128 bits), store only a hash, expire them quickly, and accept a token only if it was actually issued.' },
    where: 'POST /reset', how: 'Compute the token from the target\'s user id using the visible formula and submit it without any reset ever being requested; the password changes.',
    fix: 'Use random, single-use, short-lived tokens stored hashed server-side and bound to an actual reset request.' },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Role Cookie Tampering (Client-Supplied Role)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After logging in, inspect the cookies the app sets — one of them describes who you are.', 'The attorney console trusts that cookie instead of the server-side session.', 'Set the hx_role cookie to "attorney" while logged in as a client and open /attorney.'],
    lesson: 'Authorization decisions must come from server-side state; anything stored on the client can be edited by the client.',
    impact: 'A client can promote themselves to "attorney" by editing a cookie and open the firm\'s internal console — every other client\'s matters included.',
    report: { title: 'Authorization Based on a Client-Controlled Role Cookie', severity: 'High', remediation: 'Derive roles only from the server-side session record; never trust role or privilege data supplied by the client.' },
    where: 'GET /attorney (hx_role cookie)', how: 'Log in as a client, change the hx_role cookie to attorney, and load the attorney console; access is granted from the cookie alone.',
    fix: 'Store the role in the server-side session and ignore any client-supplied role values.' },

  /* ---- Registration & Profile ---- */
  { id: 'reg-weakpass', feature: 'Registration & Profile', name: 'Weak Password Policy (1-Character Passwords)', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a new account and try the shortest password the form will accept.', 'There is no minimum length, no complexity check, nothing.', 'Register with a 1-character password — the account is created.'],
    lesson: 'If the application accepts any password, users will choose terrible ones, and brute force becomes trivial.',
    impact: 'Client accounts protected by passwords like "a" or "1" can be guessed in seconds, exposing their legal matters to strangers.',
    report: { title: 'No Password Strength Policy on Registration', severity: 'Medium', remediation: 'Enforce a minimum length (12+ recommended), check against breached-password lists, and allow passphrases.' },
    where: 'POST /register', how: 'Create an account with a password shorter than 4 characters; registration succeeds.',
    fix: 'Server-side password policy: minimum length, breached-password screening, and no silent acceptance of trivial passwords.' },
  { id: 'reg-massassign', feature: 'Registration & Profile', name: 'Mass Assignment — Self-Assign Attorney/Admin Role', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration handler copies more of your submitted form than it should.', 'The form shows name, email, password — but the server accepts extra fields too.', 'Add a field named "role" with value "attorney" (or "admin") to the registration request and check your new account\'s role.'],
    lesson: 'Binding request data directly to a user record lets attackers set fields the UI never offered — including privilege fields.',
    impact: 'A stranger can register themselves as an attorney or administrator of the firm portal in one request, gaining access to all client matters.',
    report: { title: 'Mass Assignment in Registration Allows Privilege Escalation', severity: 'Critical', remediation: 'Whitelist the exact fields a request may set (name, email, password) and assign roles only through server-side logic.' },
    where: 'POST /register', how: 'Include an extra role field in the registration body; the new account is created with the attacker-chosen privileged role.',
    fix: 'Explicitly whitelist bindable fields per endpoint; ignore everything else and assign roles server-side.' },
  { id: 'reg-storedxss', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is shown back on pages other people read — including the admin user list.', 'The name is stored and printed without escaping.', 'Register with a display name containing an HTML/JS payload such as <script>alert(1)</script> and view it in /admin.'],
    lesson: 'Any user-controlled text that is rendered unescaped becomes code running in other users\' browsers — including administrators\'.',
    impact: 'An attacker plants a script in their profile name; when an admin opens the user list, the script runs with the admin\'s session and can hijack it.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Contextually escape all user-controlled output and apply a strict Content-Security-Policy as defence in depth.' },
    where: 'POST /register → rendered in /admin and profiles', how: 'Store a script payload in the display name; it is served unescaped to other users.',
    fix: 'Escape output by context everywhere user data is rendered; validate input and add a CSP header.' },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The app sets a benign hx_origin marker on its own pages — check whether the profile endpoint actually verifies it.', 'A state-changing POST that arrives without the marker should be rejected. It is not.', 'While logged in, POST /profile with a new name but WITHOUT the hx_origin field — the change is applied anyway.'],
    lesson: 'State-changing endpoints that never verify an anti-CSRF token can be triggered by any website the victim visits while logged in.',
    impact: 'A malicious page a client visits can silently rewrite their profile details on the firm portal — the first step in social-engineering and account-takeover chains.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require a per-session anti-CSRF token on every state-changing request and verify Origin/Referer as defence in depth.' },
    where: 'POST /profile', how: 'Submit a profile change without the session\'s hx_origin marker; the change is accepted, proving no CSRF verification exists.',
    fix: 'Issue a per-session token, embed it in forms, and reject state changes that lack a valid token.' },

  /* ---- Search & Discovery ---- */
  { id: 'search-sqli', feature: 'Search & Discovery', name: 'SQL Injection in Case Search Leaks Draft Matters', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['The search box queries cases with the same string-building habit as the login form.', 'Draft matters are excluded from normal lists — but are they excluded from the query itself?', "Search for ' OR '1'='1 and look for a matter that never appears in the case list (a DRAFT)."],
    lesson: 'Every input that reaches a query is an injection surface, not just the login form — and "hidden in the UI" is not the same as protected.',
    impact: 'An attacker dumps the firm\'s entire matter list — including unfiled draft matters the firm believes are invisible — learning who is suing whom before anything is public.',
    report: { title: 'SQL Injection in Search Exposes Unpublished Draft Matters', severity: 'High', remediation: 'Parameterise all queries and enforce visibility rules (status, ownership) inside the query itself, not in the UI.' },
    where: 'GET /search?q=', how: 'Inject a tautology into the search term; the results include the draft matter that normal lists hide.',
    fix: 'Use prepared statements and add server-side row-level filters for draft/published status and ownership.' },
  { id: 'search-xss', feature: 'Search & Discovery', name: 'Reflected XSS in Search Results', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The results page repeats your search term back to you in the heading.', 'It prints the term exactly as typed, with no escaping.', 'Search for a script payload and view the page source — your payload is there verbatim.'],
    lesson: 'Reflecting input into HTML without escaping turns a harmless search box into a script delivery mechanism via crafted links.',
    impact: 'Attackers send clients a "search link" to the firm\'s own portal that runs script in the client\'s browser under the firm\'s trusted domain.',
    report: { title: 'Reflected Cross-Site Scripting in Search', severity: 'Medium', remediation: 'Escape all reflected values for their output context and deploy a Content-Security-Policy.' },
    where: 'GET /search?q=', how: 'Put an HTML/JS payload in the q parameter; it is reflected unescaped in the results page.',
    fix: 'Contextual output encoding for every reflected value.' },

  /* ---- Cases & Matters ---- */
  { id: 'case-idor', feature: 'Cases & Matters', name: 'Case IDOR — Read Another Client\'s Matter', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Case URLs contain a simple sequential id.', 'Log in as one client and change the id in the URL.', 'Open /cases/3 while logged in as Client One — the matter belongs to Client Two, yet it opens.'],
    lesson: 'Checking that a user is logged in is not authorization — every object access must verify the user owns (or is assigned to) that object.',
    impact: 'Any client of the firm can read every other client\'s legal matters simply by changing a number — a devastating breach of legal confidentiality.',
    report: { title: 'Insecure Direct Object Reference on Case Records', severity: 'Critical', remediation: 'Enforce per-object authorization on every request: the session user must own, be assigned to, or administer the requested case.' },
    where: 'GET /cases/:id', how: 'Request a case that belongs to a different client; the full matter is served with no ownership check.',
    fix: 'Add an ownership/assignment check to every case read and write; return 404 for objects the user may not see.' },
  { id: 'case-notes', feature: 'Cases & Matters', name: 'Attorney Notes Leak to Non-Assigned Users', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Each case has an internal notes page meant only for the assigned attorney.', 'The notes URL follows the case URL — try it as a different user.', 'Open /cases/1/notes as Client Two (or any non-assigned account) and read the confidential strategy notes.'],
    lesson: 'Internal work product needs its own authorization check; hiding the link in the UI does not protect the endpoint.',
    impact: 'Attorney strategy notes — negotiation floors, witness plans — are the most sensitive text a firm holds; leaking them to opposing parties or other clients can lose cases.',
    report: { title: 'Confidential Attorney Notes Exposed Without Authorization', severity: 'High', remediation: 'Restrict notes endpoints to the assigned attorney and firm admins, and audit access to work-product records.' },
    where: 'GET /cases/:id/notes', how: 'Request the notes of a case you are not assigned to; the confidential notes are served.',
    fix: 'Check assignment/role on the notes endpoint specifically, not just on the case page.' },
  { id: 'case-edit', feature: 'Cases & Matters', name: 'Edit Another Client\'s Case (Write IDOR)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Reading a case is not the only thing missing an ownership check — look for the edit form endpoint.', 'The edit POST trusts whichever case id it is given.', 'As Client One, POST /cases/3/edit with a new title and watch Client Two\'s matter change.'],
    lesson: 'Write endpoints need the same per-object authorization as reads; a missing check on writes lets attackers tamper with records, not just view them.',
    impact: 'A malicious user can rename, re-status, or corrupt other clients\' matters — sabotaging active legal work and destroying trust in the firm\'s records.',
    report: { title: 'Missing Authorization on Case Update Allows Tampering', severity: 'High', remediation: 'Apply the same ownership/assignment authorization to all mutating case endpoints and log changes.' },
    where: 'POST /cases/:id/edit', how: 'Submit an edit for a case owned by another client; the change is saved.',
    fix: 'Authorize every mutation against the target object and keep an audit trail of edits.' }
];

TESTS.push(
  /* ---- Documents & Files ---- */
  { id: 'doc-idor', feature: 'Documents & Files', name: 'Document IDOR — Download Another Client\'s File', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Documents also live behind simple sequential ids.', 'Your own case has documents 1 and 2 — what is document 3?', 'Open /documents/3 as Client One: it is the confidential work product of Client Two\'s case.'],
    lesson: 'Files inherit the sensitivity of the matter they belong to; every file endpoint needs the same ownership check as the case itself.',
    impact: 'Confidential filings, agreements, and work product from every client can be downloaded by any other client by guessing numbers.',
    report: { title: 'Insecure Direct Object Reference on Case Documents', severity: 'Critical', remediation: 'Authorize document access through the parent case (owner, assigned attorney, or admin) on every file request.' },
    where: 'GET /documents/:id', how: 'Request a document belonging to another client\'s case; the file content is served.',
    fix: 'Resolve document → case → authorized users on every request; deny by default.' },
  { id: 'doc-traversal', feature: 'Documents & Files', name: 'Path Traversal in File Download', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The /download endpoint takes a file name and joins it to the documents folder.', 'Nothing stops you from walking up the directory tree.', 'Request /download?file=../server.js and read the application\'s own source code.'],
    lesson: 'Joining user input to a filesystem path without canonicalisation lets attackers escape the intended directory and read arbitrary files.',
    impact: 'Attackers read server source code, configuration, and any file the process can access — often including credentials — turning a download feature into full compromise.',
    report: { title: 'Directory Traversal in Download Endpoint', severity: 'High', remediation: 'Resolve the requested path, verify it stays inside the allowed directory, and serve files by id rather than by user-supplied path.' },
    where: 'GET /download?file=', how: 'Supply ../ sequences in the file parameter; a file outside the documents folder is returned.',
    fix: 'Canonicalise paths, enforce an allow-list directory prefix, and reject any traversal sequences.' },
  { id: 'doc-upload', feature: 'Documents & Files', name: 'Unrestricted File Upload — Stored HTML Served', owasp: 'A08:2021 Software and Data Integrity Failures', difficulty: 'Intermediate',
    hints: ['The case upload form accepts a file name and content — try a name ending in .html.', 'Uploaded files are served back from the app\'s own domain with a type guessed from the extension.', 'Upload "evil.html" containing a script payload to any case, then open /uploads/evil.html.'],
    lesson: 'Accepting arbitrary file types and serving them inline turns an upload feature into a stored-XSS (or worse) platform.',
    impact: 'An attacker uploads an HTML "document" to a case; when the attorney opens it, script runs in the attorney\'s session under the firm\'s domain.',
    report: { title: 'Unrestricted File Upload Allows Stored HTML/JS Execution', severity: 'High', remediation: 'Allow-list safe file types, store uploads outside the web root, serve them with Content-Disposition: attachment and a safe content type.' },
    where: 'POST /cases/:id/upload → GET /uploads/:name', how: 'Upload an .html file containing a script payload; it is stored and later served as text/html from the application origin.',
    fix: 'Validate types by content, rename uploads, serve with attachment disposition and nosniff, and isolate upload storage.' },

  /* ---- Appointments ---- */
  { id: 'appt-idor', feature: 'Appointments', name: 'Appointment IDOR — View Another Client\'s Booking', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Appointment pages use the same sequential id pattern.', 'Your appointments are listed for you — the detail page is the interesting part.', 'Open /appointments/2 as Client One: it is Client Two\'s consultation, with time and topic.'],
    lesson: 'Metadata is data too: who meets a lawyer, when, and about what can itself be highly sensitive.',
    impact: 'Rivals and opponents learn exactly when a client meets their attorney and the topic of the consultation — intelligence that can change negotiations and litigation.',
    report: { title: 'Insecure Direct Object Reference on Appointments', severity: 'High', remediation: 'Check that the session user is a party to the appointment (client, assigned attorney, or admin) before serving it.' },
    where: 'GET /appointments/:id', how: 'Request an appointment belonging to another client; its details are served.',
    fix: 'Per-object authorization on appointment reads and writes.' },
  { id: 'appt-double', feature: 'Appointments', name: 'Double-Booking the Same Attorney Slot', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['Booking checks that the case and attorney exist — does it check the attorney\'s calendar?', 'Attorney Ava already has a booking at 2026-11-03 14:00 (appointment 2).', 'Book another appointment with Ava at exactly 2026-11-03 14:00 — it is accepted too.'],
    lesson: 'Business invariants (one client per attorney per slot) must be enforced server-side at write time, ideally atomically.',
    impact: 'Conflicting consultations get booked for the same attorney at the same time — missed meetings, angry clients, and in real matters, missed legal deadlines.',
    report: { title: 'Missing Availability Check Allows Double-Booking', severity: 'Medium', remediation: 'Enforce a uniqueness/availability check on (attorney, slot) inside a transaction when creating appointments.' },
    where: 'POST /appointments', how: 'Create an appointment for an attorney at a slot that is already booked; the system accepts both bookings.',
    fix: 'Validate slot availability server-side at booking time with a uniqueness constraint.' },

  /* ---- Billing & Invoices ---- */
  { id: 'inv-idor', feature: 'Billing & Invoices', name: 'Invoice IDOR — View Another Client\'s Bill', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Invoices follow the same id pattern as everything else here.', 'Invoice 2 belongs to Client Two.', 'Open /invoices/2 as Client One and read another client\'s legal bill.'],
    lesson: 'Financial records need object-level authorization just like case files — a bill reveals the matter, the work, and the money.',
    impact: 'Clients can spy on what other clients are being charged and for what work, leaking both commercial terms and the existence of sensitive matters.',
    report: { title: 'Insecure Direct Object Reference on Invoices', severity: 'High', remediation: 'Authorize invoice access to the billed client, the case\'s assigned attorney, and firm admins only.' },
    where: 'GET /invoices/:id', how: 'Request an invoice issued to another client; the full bill is served.',
    fix: 'Per-object authorization on all billing reads and payment actions.' },
  { id: 'inv-pay', feature: 'Billing & Invoices', name: 'Payment Amount Tampering — Settle a Bill for $1', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['The pay form posts an amount — the server never compares it to the invoice total.', 'Invoice 1 is $450. What if you pay… less?', 'POST /invoices/1/pay with amount=1: the $450 invoice is marked PAID.'],
    lesson: 'Money amounts must come from server-side records; any amount the client sends is a suggestion, never the truth.',
    impact: 'Clients can settle hundreds or thousands in legal bills for a dollar, directly stealing revenue from the firm.',
    report: { title: 'Payment Endpoint Trusts Client-Supplied Amount', severity: 'Critical', remediation: 'Compute the payable amount from the server-side invoice, verify the payment against it, and only then mark the invoice paid.' },
    where: 'POST /invoices/:id/pay', how: 'Submit a payment far below the invoice total; the invoice is marked paid in full.',
    fix: 'Ignore client-supplied amounts for settlement decisions; reconcile against the stored invoice total.' },

  /* ---- Admin Panel ---- */
  { id: 'admin-bac', feature: 'Admin Panel', name: 'Admin Console Open to Any Logged-In User', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The admin panel is just a URL: /admin.', 'It checks that you are logged in — nothing more.', 'Log in as any client and open /admin: the full user list, passwords included, is served.'],
    lesson: 'Authentication is not authorization; sensitive consoles need an explicit role check on the server for every request.',
    impact: 'Every registered user — including any client — can open the firm\'s admin console and read all accounts and passwords, a complete compromise of the portal.',
    report: { title: 'Broken Access Control on Admin Console', severity: 'Critical', remediation: 'Require the admin role (from the server-side session) for every admin route and deny by default.' },
    where: 'GET /admin', how: 'Load the admin console with a non-admin session; the user table including passwords is rendered.',
    fix: 'Role-check middleware on all admin routes using server-side session data.' },
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'CSRF on Admin User Deactivation', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Admin actions are state-changing POSTs — do they verify the hx_origin marker either?', 'They do not. The same missing check as the profile form, with higher stakes.', 'As admin, POST /admin/users/6/deactivate WITHOUT the hx_origin field — the user is deactivated.'],
    lesson: 'CSRF on an admin action turns every site an admin visits into a potential admin-action trigger.',
    impact: 'A firm admin browsing the web can be tricked into deactivating accounts — or worse — without ever seeing the portal.',
    report: { title: 'Missing CSRF Protection on Admin Actions', severity: 'High', remediation: 'Require valid per-session CSRF tokens on all admin state-changing endpoints and re-check the admin role server-side.' },
    where: 'POST /admin/users/:id/deactivate', how: 'Submit the deactivation without the session\'s hx_origin marker; the account is deactivated.',
    fix: 'CSRF tokens on every state-changing route, verified server-side.' },

  /* ---- Platform & API ---- */
  { id: 'api-token', feature: 'Platform & API', name: 'Weak API Token — Base64 of Email', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['The JSON API authenticates with a token header instead of a session.', 'The token looks suspiciously readable — try decoding one.', 'The token for any user is just base64(their email). Call /api/cases with header X-Api-Token set to base64 of client.two@example.local — no session needed.'],
    lesson: 'An API token must be an unguessable secret; encoding a public identifier is not authentication.',
    impact: 'Anyone who knows or guesses a client\'s email address can pull their entire case list from the API — no password, no session, no trace.',
    report: { title: 'API Authentication Token Is a Predictable Encoding of the User Email', severity: 'High', remediation: 'Issue high-entropy random API tokens, store them hashed, scope them per user, and support revocation.' },
    where: 'GET /api/cases (X-Api-Token header)', how: 'Base64-encode a victim\'s email and present it as the API token; their cases are returned without any session.',
    fix: 'Random, hashed, revocable API credentials with per-token scopes and audit logging.' },
  { id: 'api-debug', feature: 'Platform & API', name: 'Unauthenticated Debug Endpoint Dumps All Accounts', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Developers love leaving themselves a back door for debugging…', 'Try the obvious path: /api/debug.', 'Open /api/debug with no login at all — every user, passwords included, comes back as JSON.'],
    lesson: 'Debug and diagnostic endpoints are production attack surface; if it ships, it must be authenticated or removed.',
    impact: 'A single unauthenticated URL hands out every account and password in the system — total compromise in one request.',
    report: { title: 'Unauthenticated Debug Endpoint Exposes All User Records', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; if diagnostics are required, gate them behind admin authentication and network restrictions.' },
    where: 'GET /api/debug', how: 'Fetch the debug endpoint with no credentials; the full user table including passwords is returned.',
    fix: 'Delete debug endpoints before release and add a release checklist item that fails the build if they exist.' }
);

/* ------------------------------------------------------------------ *
 * Key material — region C (completion key, pieces 4-6).
 * ------------------------------------------------------------------ */
const _cfgD = ['LTVJRg==', 'SzBQQw==', 'WUk0WQ=='];
function completionKey() { return _unshard(_cfgB.concat(_cfgD)); }

const FEATURES = [];
for (const t of TESTS) if (!FEATURES.includes(t.feature)) FEATURES.push(t.feature);
const TEST_BY_ID = {};
for (const t of TESTS) TEST_BY_ID[t.id] = t;

/* ------------------------- Progress engine ------------------------- */
let state = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadState() {
  try {
    if (fs.existsSync(PROGRESS_PATH)) {
      const raw = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
      state = Object.assign(state, raw);
    }
  } catch (e) { /* corrupted state file → start fresh rather than crash */ }
}
function saveState() {
  try { fs.writeFileSync(PROGRESS_PATH, JSON.stringify(state, null, 2)); } catch (e) { /* ignore */ }
}
function doneCount() { return TESTS.filter(t => state.tests[t.id]).length; }
function pct() { return Math.floor(doneCount() / TESTS.length * 100); }
function isComplete() { return doneCount() === TESTS.length; }
function pass(id) {
  if (!TEST_BY_ID[id] || state.tests[id]) return;
  state.tests[id] = true;
  if (isComplete() && !state.completedAt) { state.completedAt = new Date().toISOString(); state.keyRevealed = true; }
  saveState();
}
function attempt(feature) {
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  saveState();
}
function featureStats() {
  const out = {};
  for (const f of FEATURES) out[f] = { total: 0, done: 0, attempts: state.attempts[f] || 0 };
  for (const t of TESTS) { out[t.feature].total++; if (state.tests[t.id]) out[t.feature].done++; }
  return out;
}
loadState();

/* ------------------- Tiny string-built SQL evaluator -------------------
 * Simulates the classic vulnerable pattern: the app builds a query string
 * by concatenating raw input, and this evaluator "runs" it against a row.
 * Supports quoted strings, numbers, column names, =, AND, OR, -- and #
 * comments — enough for the classic bypass payloads to genuinely work. */
function tokenizeSql(s) {
  const toks = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ' || c === '\t' || c === '\n') { i++; continue; }
    if (c === '-' && s[i + 1] === '-') break;
    if (c === '#') break;
    if (c === "'") {
      let j = i + 1, out = '';
      while (j < s.length) {
        if (s[j] === "'") { if (s[j + 1] === "'") { out += "'"; j += 2; continue; } break; }
        out += s[j]; j++;
      }
      toks.push({ t: 'str', v: out }); i = j + 1; continue;
    }
    if (c === '=') { toks.push({ t: 'op', v: '=' }); i++; continue; }
    if (/[0-9]/.test(c)) { let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++; toks.push({ t: 'num', v: parseFloat(s.slice(i, j)) }); i = j; continue; }
    if (/[A-Za-z_]/.test(c)) {
      let j = i; while (j < s.length && /[A-Za-z0-9_.]/.test(s[j])) j++;
      const w = s.slice(i, j), up = w.toUpperCase();
      if (up === 'AND' || up === 'OR') toks.push({ t: up }); else toks.push({ t: 'col', v: w.toLowerCase() });
      i = j; continue;
    }
    i++;
  }
  return toks;
}
function evalSql(where, row) {
  const toks = tokenizeSql(where); let pos = 0;
  function operand() {
    const tk = toks[pos++];
    if (!tk) return '';
    if (tk.t === 'str') return tk.v;
    if (tk.t === 'num') return tk.v;
    if (tk.t === 'col') { const v = row[tk.v]; return v === undefined ? '' : v; }
    return '';
  }
  function cmp() {
    const a = operand();
    const op = toks[pos];
    if (op && op.t === 'op') { pos++; const b = operand(); return String(a) === String(b); }
    return !!a;
  }
  function andE() { let v = cmp(); while (toks[pos] && toks[pos].t === 'AND') { pos++; const r = cmp(); v = v && r; } return v; }
  function orE() { let v = andE(); while (toks[pos] && toks[pos].t === 'OR') { pos++; const r = andE(); v = v || r; } return v; }
  try { return !!orE(); } catch (e) { return false; }
}
const XSS_RE = /<script|onerror\s*=|onload\s*=|<svg|<img[^>]*onerror|<iframe|javascript:/i;
function resetTokenFor(u) { return 'HL' + u.id + '-' + (u.id * 149 + 37); }

/* --------------------------- HTTP helpers --------------------------- */
function esc(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 2e6) req.destroy(); });
    req.on('end', () => {
      const ct = (req.headers['content-type'] || '');
      if (ct.includes('application/json')) {
        try { resolve(JSON.parse(data || '{}')); return; } catch (e) { resolve({}); return; }
      }
      const out = {};
      for (const pair of data.split('&')) {
        if (!pair) continue;
        const i = pair.indexOf('=');
        const k = decodeURIComponent((i < 0 ? pair : pair.slice(0, i)).replace(/\+/g, ' '));
        const v = i < 0 ? '' : decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' '));
        out[k] = v;
      }
      resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}
function makeCtx(req, res) {
  const ctx = { req, res, setCookies: [], session: null, user: null, body: {} };
  ctx.cookie = (name, value) => ctx.setCookies.push(name + '=' + encodeURIComponent(value) + '; Path=/; HttpOnly; SameSite=Lax');
  ctx.send = (code, body, type) => {
    const headers = { 'Content-Type': (type || 'text/html') + '; charset=utf-8' };
    if (ctx.setCookies.length) headers['Set-Cookie'] = ctx.setCookies;
    res.writeHead(code, headers);
    res.end(body);
  };
  ctx.json = (code, obj) => ctx.send(code, JSON.stringify(obj), 'application/json');
  ctx.redirect = loc => {
    const headers = { Location: loc };
    if (ctx.setCookies.length) headers['Set-Cookie'] = ctx.setCookies;
    res.writeHead(302, headers);
    res.end();
  };
  return ctx;
}
function resolveSession(ctx) {
  const cookies = parseCookies(ctx.req);
  const sid = cookies.hx_session;
  if (sid && sessions.has(sid)) {
    ctx.session = sessions.get(sid);
    ctx.user = users.find(u => u.id === ctx.session.userId) || null;
    if (ctx.session && !ctx.session.origin) ctx.session.origin = crypto.randomBytes(8).toString('hex');
    if (ctx.session) ctx.cookie('hx_origin', ctx.session.origin);
  }
  ctx.cookies = cookies;
  return ctx;
}
function startSession(ctx, user) {
  const sid = crypto.randomBytes(16).toString('hex');
  const s = { userId: user.id, origin: crypto.randomBytes(8).toString('hex') };
  sessions.set(sid, s);
  ctx.session = s; ctx.user = user;
  ctx.cookie('hx_session', sid);
  ctx.cookie('hx_role', user.role);       // <-- the flaw: role mirrored into a client cookie
  ctx.cookie('hx_origin', s.origin);
}
function originField(ctx) {
  return ctx.session ? '<input type="hidden" name="hx_origin" value="' + ctx.session.origin + '">' : '';
}
function isCsrf(ctx) {
  if (!ctx.session) return false;
  return ctx.body.hx_origin !== ctx.session.origin;
}

/* ------------------------------ Layout ------------------------------ */
function progressHeader() {
  const d = doneCount(), p = pct();
  return '<header style="background:#14213d;color:#fff;padding:10px 16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">' +
    '<img src="/logo.png" alt="HexaCyberLab" style="height:34px">' +
    '<strong>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</strong>' +
    '<span>LAB ' + LAB_NUMBER + ' · ' + d + '/' + TESTS.length + ' tests · ' + p + '%</span>' +
    '<span style="flex:1;min-width:120px;background:#33415c;border-radius:6px;height:10px;overflow:hidden"><span style="display:block;height:100%;width:' + p + '%;background:#4cc9f0"></span></span>' +
    '</header>';
}
function chatWidget() {
  return '<div id="hxchat" style="position:fixed;right:14px;bottom:14px;width:330px;max-width:92vw;background:#fff;border:1px solid #999;border-radius:10px;box-shadow:0 4px 18px rgba(0,0,0,.25);font-family:inherit;z-index:50">' +
    '<div style="background:#14213d;color:#fff;padding:8px 12px;border-radius:10px 10px 0 0"><strong>Lab Coach</strong> — HexaLegal</div>' +
    '<div id="hxlog" style="height:200px;overflow-y:auto;padding:8px 12px;font-size:14px"></div>' +
    '<form id="hxform" style="display:flex;border-top:1px solid #ddd"><input id="hxin" autocomplete="off" placeholder="Ask the coach…" style="flex:1;border:0;padding:9px">' +
    '<button style="background:#14213d;color:#fff;border:0;padding:9px 14px">Send</button></form></div>' +
    '<script>(function(){var log=document.getElementById("hxlog"),form=document.getElementById("hxform"),inp=document.getElementById("hxin");' +
    'function add(who,text){var d=document.createElement("div");d.style.margin="6px 0";var b=document.createElement("strong");b.textContent=who+": ";d.appendChild(b);d.appendChild(document.createTextNode(text));log.appendChild(d);log.scrollTop=log.scrollHeight;}' +
    'add("Coach","Hi! I am the Lab Coach for LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '. Ask me how many tests a feature has, or how to approach one after you have tried it yourself at least 3 times.");' +
    'form.addEventListener("submit",function(e){e.preventDefault();var m=inp.value.trim();if(!m)return;inp.value="";add("You",m);' +
    'fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:m})}).then(function(r){return r.json();}).then(function(j){add("Coach",j.reply||"…");}).catch(function(){add("Coach","Sorry — I could not answer just now.");});});})();</script>';
}
function layout(ctx, title, bodyHtml, opts) {
  opts = opts || {};
  const nav = ctx.user && !opts.bare ?
    '<nav style="background:#e9edf5;padding:8px 16px;display:flex;gap:14px;flex-wrap:wrap">' +
    '<a href="/">Home</a><a href="/cases">Cases</a><a href="/search">Search</a><a href="/appointments">Appointments</a>' +
    '<a href="/attorney">Attorney Console</a><a href="/admin">Admin</a><a href="/tests">Mission Board</a><a href="/profile">Profile</a>' +
    '<span style="margin-left:auto">Signed in as ' + esc(ctx.user.name) + ' (' + esc(ctx.user.role) + ') · <a href="/logout">Log out</a></span></nav>' : '';
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + esc(title) + ' — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</title>' +
    '<style>body{font-family:system-ui,Arial,sans-serif;margin:0;background:#f5f6fa;color:#1c2333}main{max-width:960px;margin:0 auto;padding:18px}' +
    'a{color:#1d4ed8}table{border-collapse:collapse;width:100%}td,th{border:1px solid #c9cfdd;padding:6px 8px;text-align:left}' +
    'input,select,textarea{padding:7px;margin:3px 0;width:100%;box-sizing:border-box}button{padding:8px 14px;cursor:pointer}' +
    '.card{background:#fff;border:1px solid #d5dae6;border-radius:8px;padding:14px;margin:12px 0}.muted{color:#667}.done{color:#137333}.open{color:#b3261e}</style></head><body>' +
    progressHeader() + nav + '<main>' + bodyHtml + '</main>' + chatWidget() + '</body></html>';
}
function gatePage(ctx) {
  const body = '<div class="card" style="max-width:560px;margin:40px auto;text-align:center">' +
    '<img src="/logo.png" alt="HexaCyberLab" style="height:56px">' +
    '<h1>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h1>' +
    '<p>This lab is locked. Paste the completion key from Lab ' + PREV_LAB + ' to start.</p>' +
    '<form method="POST" action="/unlock"><input name="key" placeholder="Completion key from Lab ' + PREV_LAB + '" autocomplete="off">' +
    '<button type="submit">Unlock Lab ' + LAB_NUMBER + '</button></form>' +
    '<p class="muted">Local-only training lab. All data is fake. Never deploy publicly.</p></div>';
  return layout(ctx, 'Locked', body, { bare: true });
}

/* ------------------------------ Lab Coach ------------------------------ */
const FEATURE_KEYWORDS = [
  ['Login & Authentication', ['login', 'log in', 'authentication', 'auth', 'password', 'brute', 'reset token']],
  ['Registration & Profile', ['registration', 'register', 'sign up', 'signup', 'profile']],
  ['Search & Discovery', ['search']],
  ['Cases & Matters', ['case', 'cases', 'matter', 'matters', 'notes']],
  ['Documents & Files', ['document', 'documents', 'file', 'files', 'upload', 'download', 'traversal']],
  ['Appointments', ['appointment', 'appointments', 'booking', 'double-book']],
  ['Billing & Invoices', ['billing', 'invoice', 'invoices', 'payment', 'pay']],
  ['Admin Panel', ['admin']],
  ['Platform & API', ['api', 'platform', 'debug', 'token']]
];
function matchFeature(msg) {
  for (const pair of FEATURE_KEYWORDS) {
    for (const kw of pair[1]) if (msg.includes(kw)) return pair[0];
  }
  return null;
}
function coachReply(message) {
  const msg = String(message || '').toLowerCase();
  const stats = featureStats();
  // Attribution — exact text.
  if (/who (built|made|created|developed)|founder|built this|made this|your creator/.test(msg)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  // Completion key secrecy.
  if (msg.includes('key') && /(completion|next|give|what|show|tell|reveal|unlock)/.test(msg)) {
    if (state.keyRevealed && isComplete()) {
      return 'You completed LAB ' + LAB_NUMBER + ' at 100% — well earned. The completion key is: ' + completionKey() + ' — paste it into the next lab to unlock it.';
    }
    return "I don't have the completion key yet — I only receive it when this lab is completed 100%. Right now the lab is at " + pct() + '% (' + doneCount() + '/' + TESTS.length + ' tests). Finish every test and ask me again.';
  }
  const feature = matchFeature(msg);
  const howIntent = /(how|help|guide|solve|step|approach|do i|can i|hint|stuck)/.test(msg);
  if (feature) {
    const fTests = TESTS.filter(t => t.feature === feature);
    const att = state.attempts[feature] || 0;
    const allPassed = fTests.every(t => state.tests[t.id]);
    if (howIntent) {
      if (att >= 3 || allPassed) {
        const lines = fTests.map(t => state.tests[t.id]
          ? '✓ ' + t.name + ' — done.'
          : '• ' + t.name + ' — step by step: ' + t.hints[2]);
        return 'Here is the guidance for ' + feature + ' (you have tried this feature ' + att + ' time(s)):\n' + lines.join('\n');
      }
      return 'That feature is locked for help. First try the ' + feature + ' tests yourself at least 3 times — I can see you\'ve tried ' + att + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
    }
    return feature + ' has ' + fTests.length + ' tests (' + stats[feature].done + ' done): ' + fTests.map(t => t.name).join('; ') + '. Attempts so far on this feature: ' + att + '. Ask me "how do I solve the ' + feature + ' tests" after at least 3 tries and I will guide you.';
  }
  if (/(progress|how am i|status|next|what should)/.test(msg)) {
    const next = TESTS.find(t => !state.tests[t.id]);
    return 'Current progress: ' + doneCount() + '/' + TESTS.length + ' tests (' + pct() + '%). ' +
      (next ? 'Next open test: "' + next.name + '" in ' + next.feature + '. Open the Mission Board at /tests for its hints.' : 'Everything is done — see /complete for your summary and certificate.');
  }
  if (/(how many|features|vulnerabilit|tests|list)/.test(msg)) {
    const lines = FEATURES.map(f => f + ': ' + stats[f].total + ' tests (' + stats[f].done + ' done)');
    return 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + TESTS.length + ' tests across ' + FEATURES.length + ' features:\n' + lines.join('\n') + '\nThe full map is on the Mission Board at /tests.';
  }
  if (/^(hi|hello|hey| Salam|assalamu)/.test(msg) || msg.length < 4) {
    return 'Hello! I am the Lab Coach for LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' (' + TESTS.length + ' tests, ' + FEATURES.length + ' features). Current progress is ' + pct() + '%. Ask me about a feature, your progress, or — after 3 real tries on a feature — how to solve its tests.';
  }
  return 'I can help with: the test map for any feature (ask "how many tests in Cases & Matters"), your progress, and step-by-step guidance for a feature once you have tried it at least 3 times yourself. The Mission Board at /tests also shows 3 graded hints beside every test.';
}

/* ------------------------------ Pages: auth ------------------------------ */
function loginPage(ctx, msg) {
  const body = '<div class="card" style="max-width:480px;margin:30px auto"><h1>HexaLegal — Client &amp; Attorney Portal</h1>' +
    (msg ? '<p class="open">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/login"><label>Email<input name="email" type="email" required></label>' +
    '<label>Password<input name="password" type="password" required></label><button>Sign in</button></form>' +
    '<p class="muted">Demo account for evaluators: <strong>demo@hexalegal.local</strong> / <strong>demo123</strong></p>' +
    '<p><a href="/forgot">Forgot password?</a> · <a href="/register">Create an account</a></p></div>';
  return layout(ctx, 'Sign in', body, { bare: true });
}
function doLogin(ctx) {
  attempt('Login & Authentication');
  const email = String(ctx.body.email || ''), password = String(ctx.body.password || '');
  probedEmails.add(email);
  if (probedEmails.size >= 5) pass('auth-enum');
  const where = "email = '" + email + "' AND password = '" + password + "'";   // string-built query — the flaw
  const matched = users.find(u => !u.deactivated && evalSql(where, u));
  if (matched) {
    if (password !== matched.password) pass('auth-sqli');
    if (matched.email === 'demo@hexalegal.local') pass('auth-demo');
    startSession(ctx, matched);
    return ctx.redirect('/');
  }
  const exists = users.some(u => u.email === email);
  if (exists) {
    const c = (failedLogins.get(email) || 0) + 1;
    failedLogins.set(email, c);
    if (c >= 10) pass('auth-brute');
  }
  // Divergent messages — the enumeration flaw.
  return ctx.send(200, loginPage(ctx, exists ? 'Incorrect password for that account.' : 'No account found for that email.'));
}
function registerPage(ctx, msg) {
  const body = '<div class="card" style="max-width:480px;margin:30px auto"><h1>Create your HexaLegal account</h1>' +
    (msg ? '<p class="open">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/register"><label>Full name<input name="name" required></label>' +
    '<label>Email<input name="email" type="email" required></label>' +
    '<label>Password<input name="password" type="password" required></label><button>Register</button></form>' +
    '<p><a href="/login">Already have an account?</a></p></div>';
  return layout(ctx, 'Register', body, { bare: true });
}
function doRegister(ctx) {
  attempt('Registration & Profile');
  const name = String(ctx.body.name || 'New User'), email = String(ctx.body.email || ''), password = String(ctx.body.password || '');
  if (!email || users.some(u => u.email === email)) return ctx.send(200, registerPage(ctx, 'That email is already registered or invalid.'));
  const nu = { id: Math.max.apply(null, users.map(u => u.id)) + 1, name, email, password, role: 'client', plan: 'standard' };
  // Mass assignment flaw: extra submitted fields are copied straight onto the record.
  for (const k of ['role', 'plan', 'balance']) if (ctx.body[k] !== undefined) nu[k] = ctx.body[k];
  users.push(nu);
  if (password.length < 4) pass('reg-weakpass');
  if (nu.role !== 'client' || ctx.body.plan !== undefined || ctx.body.balance !== undefined) pass('reg-massassign');
  if (XSS_RE.test(name)) pass('reg-storedxss');
  startSession(ctx, nu);
  return ctx.redirect('/');
}
function forgotPage(ctx, msg) {
  const body = '<div class="card" style="max-width:480px;margin:30px auto"><h1>Reset your password</h1>' +
    (msg ? '<p>' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/forgot"><label>Email<input name="email" type="email" required></label><button>Send reset link</button></form>' +
    '<form method="POST" action="/reset" style="margin-top:18px"><label>Reset token<input name="token" required></label>' +
    '<label>New password<input name="password" type="password" required></label><button>Set new password</button></form>' +
    '<p><a href="/login">Back to sign in</a></p></div>';
  return layout(ctx, 'Forgot password', body, { bare: true });
}
function doForgot(ctx) {
  attempt('Login & Authentication');
  const email = String(ctx.body.email || '');
  probedEmails.add(email);
  if (probedEmails.size >= 5) pass('auth-enum');
  const u = users.find(x => x.email === email);
  if (u) { issuedResetTokens.add(resetTokenFor(u)); return ctx.send(200, forgotPage(ctx, 'Reset link sent to your email.')); }
  return ctx.send(200, forgotPage(ctx, 'No account found for that email.'));
}
function doReset(ctx) {
  attempt('Login & Authentication');
  const token = String(ctx.body.token || ''), password = String(ctx.body.password || '');
  const u = users.find(x => resetTokenFor(x) === token);
  if (!u) return ctx.send(200, forgotPage(ctx, 'That reset token is invalid.'));
  if (!issuedResetTokens.has(token)) pass('auth-reset');   // accepted without ever being issued — the flaw
  issuedResetTokens.delete(token);
  u.password = password;
  return ctx.redirect('/login');
}
function profilePage(ctx) {
  const u = ctx.user;
  const body = '<div class="card"><h1>Your profile</h1>' +
    '<form method="POST" action="/profile">' + originField(ctx) +
    '<label>Display name<input name="name" value="' + esc(u.name) + '"></label>' +
    '<label>Email<input value="' + esc(u.email) + '" disabled></label>' +
    '<label>Role<input value="' + esc(u.role) + '" disabled></label>' +
    '<button>Save changes</button></form></div>';
  return layout(ctx, 'Profile', body);
}
function doProfile(ctx) {
  attempt('Registration & Profile');
  if (ctx.body.name !== undefined && String(ctx.body.name) !== '') {
    ctx.user.name = String(ctx.body.name);
    if (XSS_RE.test(ctx.user.name)) pass('reg-storedxss');
  }
  if (isCsrf(ctx)) pass('reg-csrf');   // change applied even with no valid marker — the flaw
  return ctx.redirect('/profile');
}

/* ------------------------------ Pages: search ------------------------------ */
function searchPage(ctx) {
  attempt('Search & Discovery');
  const q = String(ctx.req.query.q || '');
  let results = [];
  if (q !== '') {
    if (/['"]|--|#|\bor\b|\band\b/i.test(q)) {
      const where = "title = '" + q + "' OR type = '" + q + "' OR status = '" + q + "'";   // string-built — the flaw
      results = cases.filter(c => evalSql(where, { title: c.title, type: c.type, status: c.status, id: c.id }));
      if (results.some(c => c.status === 'draft')) pass('search-sqli');
    } else {
      const needle = q.toLowerCase();
      results = cases.filter(c => c.status !== 'draft' && (c.title.toLowerCase().includes(needle) || c.type.toLowerCase().includes(needle)));
    }
  }
  if (XSS_RE.test(q)) pass('search-xss');
  const rows = results.map(c => '<tr><td><a href="/cases/' + c.id + '">' + esc(c.title) + '</a></td><td>' + esc(c.type) + '</td><td>' + esc(c.status) + '</td></tr>').join('');
  const body = '<div class="card"><h1>Search cases</h1>' +
    '<form method="GET" action="/search"><input name="q" value="' + esc(q) + '" placeholder="Search by title or type"><button>Search</button></form>' +
    // NOTE: q is reflected raw below — the reflected XSS flaw.
    '<h2>Results for "' + q + '"</h2>' +
    (q === '' ? '<p class="muted">Type a term to search the matter index.</p>' : '<table><tr><th>Case</th><th>Type</th><th>Status</th></tr>' + rows + '</table>') + '</div>';
  return layout(ctx, 'Search', body);
}

/* ------------------------------ Pages: cases & documents ------------------------------ */
function visibleCases(u) {
  return cases.filter(c => c.status !== 'draft' && (u.role === 'admin' || c.clientId === u.id || c.attorneyId === u.id));
}
function caseForbidden(u, c) {
  return !(u.role === 'admin' || c.clientId === u.id || c.attorneyId === u.id);
}
function casesPage(ctx) {
  const list = visibleCases(ctx.user);
  const rows = list.map(c => '<tr><td><a href="/cases/' + c.id + '">' + esc(c.title) + '</a></td><td>' + esc(c.type) + '</td><td>' + esc(c.status) + '</td></tr>').join('');
  return layout(ctx, 'Cases', '<div class="card"><h1>Cases &amp; matters</h1><table><tr><th>Title</th><th>Type</th><th>Status</th></tr>' + rows + '</table></div>');
}
function casePage(ctx, id) {
  attempt('Cases & Matters');
  const c = cases.find(x => x.id === id);
  if (!c) return ctx.send(404, layout(ctx, 'Not found', '<div class="card"><h1>Case not found.</h1></div>'));
  if (caseForbidden(ctx.user, c)) pass('case-idor');
  const docs = documents.filter(d => d.caseId === c.id);
  const docRows = docs.map(d => '<li><a href="/documents/' + d.id + '">' + esc(d.title) + '</a> · <a href="/download?file=' + encodeURIComponent(d.file) + '">download</a></li>').join('');
  const body = '<div class="card"><h1>' + esc(c.title) + '</h1>' +
    '<p><strong>Type:</strong> ' + esc(c.type) + ' · <strong>Status:</strong> ' + esc(c.status) + '</p>' +
    '<p>' + esc(c.description) + '</p>' +
    '<p><a href="/cases/' + c.id + '/notes">Attorney notes (internal)</a></p>' +
    '<h2>Documents</h2><ul>' + docRows + '</ul>' +
    '<h3>Upload a document to this case</h3><form method="POST" action="/cases/' + c.id + '/upload">' + originField(ctx) +
    '<label>File name<input name="filename" placeholder="e.g. evidence.txt" required></label>' +
    '<label>Content<textarea name="content" rows="4" required></textarea></label><button>Upload</button></form>' +
    '<h3>Edit this matter</h3><form method="POST" action="/cases/' + c.id + '/edit">' + originField(ctx) +
    '<label>Title<input name="title" value="' + esc(c.title) + '"></label>' +
    '<label>Status<select name="status"><option' + (c.status === 'open' ? ' selected' : '') + '>open</option><option' + (c.status === 'closed' ? ' selected' : '') + '>closed</option><option' + (c.status === 'draft' ? ' selected' : '') + '>draft</option></select></label>' +
    '<button>Save changes</button></form></div>';
  return layout(ctx, c.title, body);
}
function caseNotesPage(ctx, id) {
  attempt('Cases & Matters');
  const c = cases.find(x => x.id === id);
  if (!c) return ctx.send(404, layout(ctx, 'Not found', '<div class="card"><h1>Case not found.</h1></div>'));
  if (!(ctx.user.role === 'admin' || c.attorneyId === ctx.user.id)) pass('case-notes');
  return layout(ctx, 'Attorney notes', '<div class="card"><h1>Attorney notes — ' + esc(c.title) + '</h1><p>' + esc(c.notes) + '</p><p><a href="/cases/' + c.id + '">Back to case</a></p></div>');
}
function doCaseEdit(ctx, id) {
  attempt('Cases & Matters');
  const c = cases.find(x => x.id === id);
  if (!c) return ctx.send(404, 'Not found');
  const forbidden = caseForbidden(ctx.user, c);
  if (ctx.body.title !== undefined && String(ctx.body.title) !== '') c.title = String(ctx.body.title);
  if (ctx.body.status !== undefined) c.status = String(ctx.body.status);
  if (forbidden) pass('case-edit');
  return ctx.redirect('/cases/' + c.id);
}
function doUpload(ctx, caseId) {
  attempt('Documents & Files');
  const name = String(ctx.body.filename || '').split('/').pop();
  if (name) uploads.set(name, { content: String(ctx.body.content || ''), by: ctx.user.id, caseId });
  return ctx.redirect('/cases/' + caseId);
}
function documentPage(ctx, id) {
  attempt('Documents & Files');
  const d = documents.find(x => x.id === id);
  if (!d) return ctx.send(404, layout(ctx, 'Not found', '<div class="card"><h1>Document not found.</h1></div>'));
  const c = cases.find(x => x.id === d.caseId);
  if (c && caseForbidden(ctx.user, c)) pass('doc-idor');
  let content = '(file missing)';
  try { content = fs.readFileSync(path.join(FILES_DIR, d.file), 'utf8'); } catch (e) { /* keep placeholder */ }
  return layout(ctx, d.title, '<div class="card"><h1>' + esc(d.title) + '</h1><pre style="white-space:pre-wrap">' + esc(content) + '</pre>' +
    '<p><a href="/download?file=' + encodeURIComponent(d.file) + '">Download</a> · <a href="/cases/' + d.caseId + '">Back to case</a></p></div>');
}
function doDownload(ctx) {
  attempt('Documents & Files');
  const file = String(ctx.req.query.file || '');
  const p = path.normalize(path.join(FILES_DIR, file));
  if (!p.startsWith(FILES_DIR)) pass('doc-traversal');
  try {
    const content = fs.readFileSync(p, 'utf8');
    return ctx.send(200, content, 'text/plain');
  } catch (e) {
    return ctx.send(404, 'File not found.');
  }
}
function serveUpload(ctx, name) {
  const up = uploads.get(name);
  if (!up) return ctx.send(404, 'Upload not found.');
  const ext = (name.split('.').pop() || '').toLowerCase();
  const mime = ext === 'html' || ext === 'htm' ? 'text/html' : ext === 'svg' ? 'image/svg+xml' : 'text/plain';
  if ((mime === 'text/html' || mime === 'image/svg+xml') && XSS_RE.test(up.content)) pass('doc-upload');
  return ctx.send(200, up.content, mime);
}

/* ------------------------------ Pages: appointments & billing ------------------------------ */
function myAppointments(u) {
  return appointments.filter(a => u.role === 'admin' || a.clientId === u.id || a.attorneyId === u.id);
}
function appointmentsPage(ctx) {
  const list = myAppointments(ctx.user);
  const rows = list.map(a => '<tr><td><a href="/appointments/' + a.id + '">#' + a.id + '</a></td><td>' + esc(a.slot) + '</td><td>' + esc(a.topic) + '</td><td>' + esc(a.status) + '</td></tr>').join('');
  const myCaseOpts = visibleCases(ctx.user).map(c => '<option value="' + c.id + '">' + esc(c.title) + '</option>').join('');
  const attyOpts = users.filter(u => u.role === 'attorney').map(u => '<option value="' + u.id + '">' + esc(u.name) + '</option>').join('');
  const body = '<div class="card"><h1>Appointments</h1><table><tr><th>ID</th><th>Slot</th><th>Topic</th><th>Status</th></tr>' + rows + '</table>' +
    '<h2>Book an appointment</h2><form method="POST" action="/appointments">' + originField(ctx) +
    '<label>Case<select name="caseId">' + myCaseOpts + '</select></label>' +
    '<label>Attorney<select name="attorneyId">' + attyOpts + '</select></label>' +
    '<label>Slot (YYYY-MM-DD HH:MM)<input name="slot" placeholder="2026-11-05 09:00" required></label>' +
    '<label>Topic<input name="topic" placeholder="Consultation topic"></label><button>Book</button></form></div>';
  return layout(ctx, 'Appointments', body);
}
function appointmentPage(ctx, id) {
  attempt('Appointments');
  const a = appointments.find(x => x.id === id);
  if (!a) return ctx.send(404, layout(ctx, 'Not found', '<div class="card"><h1>Appointment not found.</h1></div>'));
  if (!(ctx.user.role === 'admin' || a.clientId === ctx.user.id || a.attorneyId === ctx.user.id)) pass('appt-idor');
  const client = users.find(u => u.id === a.clientId), atty = users.find(u => u.id === a.attorneyId);
  const body = '<div class="card"><h1>Appointment #' + a.id + '</h1>' +
    '<p><strong>When:</strong> ' + esc(a.slot) + '<br><strong>Client:</strong> ' + esc(client ? client.name : '') +
    '<br><strong>Attorney:</strong> ' + esc(atty ? atty.name : '') + '<br><strong>Topic:</strong> ' + esc(a.topic) +
    '<br><strong>Status:</strong> ' + esc(a.status) + '</p><p><a href="/appointments">Back to appointments</a></p></div>';
  return layout(ctx, 'Appointment', body);
}
function doBook(ctx) {
  attempt('Appointments');
  const na = {
    id: Math.max.apply(null, appointments.map(a => a.id).concat([0])) + 1,
    caseId: parseInt(ctx.body.caseId, 10) || 0,
    clientId: ctx.user.id,
    attorneyId: parseInt(ctx.body.attorneyId, 10) || 0,
    slot: String(ctx.body.slot || ''),
    status: 'booked',
    topic: String(ctx.body.topic || 'Consultation')
  };
  // No availability check — the double-booking flaw.
  if (appointments.some(a => a.attorneyId === na.attorneyId && a.slot === na.slot)) pass('appt-double');
  appointments.push(na);
  return ctx.redirect('/appointments/' + na.id);
}
function invoicesPage(ctx) {
  const list = invoices.filter(i => ctx.user.role === 'admin' || i.clientId === ctx.user.id);
  const rows = list.map(i => '<tr><td><a href="/invoices/' + i.id + '">#' + i.id + '</a></td><td>' + esc(i.label) + '</td><td>$' + i.amount + '</td><td>' + esc(i.status) + '</td></tr>').join('');
  return layout(ctx, 'Invoices', '<div class="card"><h1>Your invoices</h1><table><tr><th>ID</th><th>Label</th><th>Amount</th><th>Status</th></tr>' + rows + '</table></div>');
}
function invoicePage(ctx, id) {
  attempt('Billing & Invoices');
  const inv = invoices.find(x => x.id === id);
  if (!inv) return ctx.send(404, layout(ctx, 'Not found', '<div class="card"><h1>Invoice not found.</h1></div>'));
  const c = cases.find(x => x.id === inv.caseId);
  if (!(ctx.user.role === 'admin' || inv.clientId === ctx.user.id || (c && c.attorneyId === ctx.user.id))) pass('inv-idor');
  const payForm = inv.status !== 'paid'
    ? '<h2>Pay this invoice</h2><form method="POST" action="/invoices/' + inv.id + '/pay">' + originField(ctx) +
      '<label>Amount (USD)<input name="amount" type="number" step="0.01" value="' + inv.amount + '"></label><button>Pay now</button></form>'
    : '<p class="done">This invoice is PAID.</p>';
  const body = '<div class="card"><h1>Invoice #' + inv.id + '</h1><p><strong>' + esc(inv.label) + '</strong><br>Amount due: $' + inv.amount + '<br>Status: ' + esc(inv.status) + '</p>' + payForm + '</div>';
  return layout(ctx, 'Invoice', body);
}
function doPay(ctx, id) {
  attempt('Billing & Invoices');
  const inv = invoices.find(x => x.id === id);
  if (!inv) return ctx.send(404, 'Not found');
  const amount = parseFloat(ctx.body.amount);
  if (inv.status !== 'paid' && !isNaN(amount)) {
    if (amount < inv.amount) { inv.status = 'paid'; pass('inv-pay'); }   // settles for less — the flaw
    else inv.status = 'paid';
  }
  return ctx.redirect('/invoices/' + inv.id);
}

/* ------------------------------ Home, attorney, admin, API ------------------------------ */
function homePage(ctx) {
  if (!ctx.user) {
    const body = '<div class="card" style="max-width:640px;margin:30px auto"><h1>HexaLegal — Legal Services Portal</h1>' +
      '<p>Clients track their matters, documents, appointments and invoices. Attorneys manage their assigned cases.</p>' +
      '<p><a href="/login">Sign in</a> · <a href="/register">Create an account</a></p>' +
      '<p class="muted">LAB ' + LAB_NUMBER + ' training environment — all data is fake.</p></div>';
    return layout(ctx, 'Home', body, { bare: true });
  }
  const myCases = visibleCases(ctx.user);
  const rows = myCases.map(c => '<tr><td><a href="/cases/' + c.id + '">' + esc(c.title) + '</a></td><td>' + esc(c.type) + '</td><td>' + esc(c.status) + '</td></tr>').join('');
  const body = '<div class="card"><h1>Welcome, ' + esc(ctx.user.name) + '</h1>' +
    '<p>Role: ' + esc(ctx.user.role) + ' · <a href="/invoices">Your invoices</a> · <a href="/tests">Mission Board</a></p>' +
    '<h2>Your matters</h2><table><tr><th>Title</th><th>Type</th><th>Status</th></tr>' + rows + '</table></div>';
  return layout(ctx, 'Home', body);
}
function attorneyPage(ctx) {
  const roleCookie = ctx.cookies.hx_role || '';
  if (roleCookie !== 'attorney' && roleCookie !== 'admin') {
    return ctx.send(403, layout(ctx, 'Forbidden', '<div class="card"><h1>Attorney role required.</h1><p class="muted">(This console checks the hx_role cookie.)</p></div>'));
  }
  if (ctx.user.role === 'client') pass('auth-cookie');
  const rows = cases.filter(c => c.status !== 'draft').map(c => '<tr><td><a href="/cases/' + c.id + '">' + esc(c.title) + '</a></td><td>' + esc(c.status) + '</td><td><a href="/cases/' + c.id + '/notes">notes</a></td></tr>').join('');
  return layout(ctx, 'Attorney Console', '<div class="card"><h1>Attorney Console</h1><p class="muted">Firm-wide matter index (attorneys and admins).</p><table><tr><th>Case</th><th>Status</th><th></th></tr>' + rows + '</table></div>');
}
function adminPage(ctx) {
  attempt('Admin Panel');
  if (ctx.user.role !== 'admin') pass('admin-bac');
  // Names and passwords rendered raw — feeds the stored-XSS test and shows the exposure.
  const rows = users.map(u => '<tr><td>' + u.id + '</td><td>' + u.name + '</td><td>' + esc(u.email) + '</td><td>' + esc(u.role) + '</td><td>' + esc(u.password) + '</td><td>' + (u.deactivated ? 'deactivated' : 'active') + '</td>' +
    '<td><form method="POST" action="/admin/users/' + u.id + '/deactivate" style="display:inline">' + originField(ctx) + '<button>Deactivate</button></form></td></tr>').join('');
  return layout(ctx, 'Admin Panel', '<div class="card"><h1>Admin Panel — Users</h1><table><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Password</th><th>Status</th><th></th></tr>' + rows + '</table></div>');
}
function doDeactivate(ctx, id) {
  attempt('Admin Panel');
  const u = users.find(x => x.id === id);
  if (u) {
    if (isCsrf(ctx)) pass('admin-csrf');
    u.deactivated = true;
    for (const entry of sessions) if (entry[1].userId === u.id) sessions.delete(entry[0]);
  }
  return ctx.redirect('/admin');
}
function apiCases(ctx) {
  attempt('Platform & API');
  const token = ctx.req.headers['x-api-token'] || ctx.req.query.token || '';
  let email = '';
  try { email = Buffer.from(String(token), 'base64').toString('utf8'); } catch (e) { email = ''; }
  const u = users.find(x => x.email === email);
  if (!u) return ctx.json(401, { error: 'Invalid API token.' });
  if (!ctx.user || ctx.user.id !== u.id) pass('api-token');
  return ctx.json(200, { user: u.email, cases: cases.filter(c => c.clientId === u.id).map(c => ({ id: c.id, title: c.title, type: c.type, status: c.status })) });
}
function apiDebug(ctx) {
  attempt('Platform & API');
  pass('api-debug');
  return ctx.json(200, { debug: true, users, cases, invoices, appointments });
}

/* ------------------------------ Lab pages ------------------------------ */
function testsPage(ctx) {
  const stats = featureStats();
  let html = '<div class="card"><h1>Mission Board — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h1>' +
    '<p>' + doneCount() + '/' + TESTS.length + ' tests complete (' + pct() + '%). Tests flip to done only when the exploit really works — there is no "mark done" button.</p></div>';
  for (const f of FEATURES) {
    html += '<div class="card"><h2>' + esc(f) + ' <span class="muted">(' + stats[f].done + '/' + stats[f].total + ' done · ' + stats[f].attempts + ' attempts)</span></h2>';
    for (const t of TESTS.filter(x => x.feature === f)) {
      const done = !!state.tests[t.id];
      html += '<div style="border-top:1px solid #e2e6f0;padding:8px 0"><strong class="' + (done ? 'done' : 'open') + '">' + (done ? '✓' : '○') + ' ' + esc(t.name) + '</strong>' +
        ' <span class="muted">' + esc(t.owasp) + ' · ' + esc(t.difficulty) + '</span>' +
        '<details><summary>Hint 1</summary><p>' + esc(t.hints[0]) + '</p><details><summary>Hint 2</summary><p>' + esc(t.hints[1]) + '</p>' +
        '<details><summary>Hint 3</summary><p>' + esc(t.hints[2]) + '</p></details></details></details></div>';
    }
    html += '</div>';
  }
  return layout(ctx, 'Mission Board', html);
}
function completePage(ctx) {
  if (!isComplete()) {
    const left = TESTS.filter(t => !state.tests[t.id]);
    const body = '<div class="card"><h1>Completion summary — not yet complete</h1>' +
      '<p>Progress: ' + doneCount() + '/' + TESTS.length + ' tests (' + pct() + '%). The full debrief, completion key, and certificate unlock at 100%.</p>' +
      '<h2>Still open (' + left.length + ')</h2><ul>' + left.map(t => '<li>' + esc(t.feature) + ' — ' + esc(t.name) + '</li>').join('') + '</ul>' +
      '<p><a href="/tests">Open the Mission Board</a></p></div>';
    return layout(ctx, 'Completion', body);
  }
  const stats = featureStats();
  const perFeature = FEATURES.map(f => '<tr><td>' + esc(f) + '</td><td>' + stats[f].total + '</td></tr>').join('');
  const ways = TESTS.map((t, i) => '<li>' + (i + 1) + '. ' + esc(t.name) + ' (' + esc(t.feature) + ')</li>').join('');
  const lessons = TESTS.map(t => '<li><strong>' + esc(t.name) + ':</strong> ' + esc(t.lesson) + '</li>').join('');
  const impacts = TESTS.map(t => '<li><strong>' + esc(t.name) + ':</strong> ' + esc(t.impact) + '</li>').join('');
  const reports = TESTS.map(t => '<tr><td>' + esc(t.report.title) + '</td><td>' + esc(t.report.severity) + '</td><td>' + esc(t.report.remediation) + '</td></tr>').join('');
  const body = '<div class="card"><h1>🎉 LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' complete!</h1>' +
    '<h2>1) Features in this lab</h2><p>' + FEATURES.length + ' features: ' + FEATURES.map(esc).join(', ') + '.</p>' +
    '<h2>2) Vulnerabilities per feature</h2><table><tr><th>Feature</th><th>Tests</th></tr>' + perFeature + '</table>' +
    '<h2>3) How testing was done — ' + TESTS.length + ' ways</h2><ol>' + ways + '</ol>' +
    '<h2>4) What you learned</h2><ul>' + lessons + '</ul>' +
    '<h2>5) What this means for a real client</h2><ul>' + impacts + '</ul>' +
    '<h2>6) Writing it in a real report</h2><table><tr><th>Finding</th><th>Severity</th><th>Remediation</th></tr>' + reports + '</table>' +
    '<h2>Your completion key</h2><p>Paste this key into the next lab to unlock it:</p>' +
    '<p style="font-size:20px"><code>' + esc(completionKey()) + '</code></p>' +
    '<h2>Certificate</h2><form method="POST" action="/tester-name"><label>Your name for the certificate<input name="name" value="' + esc(state.testerName) + '"></label><button>Save name</button></form>' +
    '<p><a href="/certificate">View your certificate</a></p></div>';
  return layout(ctx, 'Lab complete', body);
}
function certificatePage(ctx) {
  if (!isComplete()) return ctx.redirect('/complete');
  const name = state.testerName || (ctx.user ? ctx.user.name : 'HexaCyberLab Tester');
  const dateStr = state.completedAt ? new Date(state.completedAt).toDateString() : new Date().toDateString();
  const body = '<style>@media print{#hxchat{display:none}}</style>' +
    '<div class="card" style="max-width:720px;margin:30px auto;text-align:center;border:3px double #14213d;padding:28px">' +
    '<img src="/logo.png" alt="HexaCyberLab" style="height:64px">' +
    '<h1>Certificate of Completion</h1>' +
    '<p>This certifies that</p><h2>' + esc(name) + '</h2>' +
    '<p>has completed 100% of the security tests in LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' (' + TESTS.length + ' tests across ' + FEATURES.length + ' features)</p>' +
    '<p>Completed on ' + esc(dateStr) + '</p>' +
    '<p><strong>HexaCyberLab — Built by Md. Jony Hassain, Founder</strong></p></div>' +
    '<p style="text-align:center" class="muted">Use your browser\'s Print dialog to save this certificate as a PDF.</p>';
  return ctx.send(200, layout(ctx, 'Certificate', body));
}

/* ------------------------------ Doc generation ------------------------------ */
const DIFF_ORDER = { Beginner: 0, Intermediate: 1, Advanced: 2 };
function genDocs() {
  let vuln = '# HexaLegal — Vulnerability Map (LAB ' + LAB_NUMBER + ')\n\nEvery scored test in the lab, grouped by feature. This is the complete map of what can be found and proven.\n';
  for (const f of FEATURES) {
    vuln += '\n## ' + f + '\n';
    for (const t of TESTS.filter(x => x.feature === f)) {
      vuln += '\n### ' + t.name + '\n- **OWASP:** ' + t.owasp + '\n- **Difficulty:** ' + t.difficulty + '\n- **Location:** ' + t.where + '\n- **Exploitation outline:** ' + t.how + '\n- **Impact:** ' + t.impact + '\n';
    }
  }
  fs.writeFileSync(path.join(ROOT, 'VULNERABILITIES.md'), vuln);

  let guide = '# HexaLegal — Practice Guide (LAB ' + LAB_NUMBER + ')\n\nChallenges grouped by feature, then difficulty. Each challenge is complete when its test flips to done on the Mission Board (/tests) — completion is detected from the real exploit effect, never self-declared.\n';
  for (const f of FEATURES) {
    guide += '\n## ' + f + '\n';
    const list = TESTS.filter(x => x.feature === f).slice().sort((a, b) => DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty]);
    for (const t of list) {
      guide += '\n### ' + t.name + ' (' + t.difficulty + ')\n- **Objective:** Get the "' + t.name + '" test to flip to done on /tests by performing the exploit against the running lab.\n- **Hint 1:** ' + t.hints[0] + '\n- **Hint 2:** ' + t.hints[1] + '\n- **Hint 3:** ' + t.hints[2] + '\n';
    }
  }
  fs.writeFileSync(path.join(ROOT, 'PRACTICE-GUIDE.md'), guide);

  let fix = '# HexaLegal — Fix & Retest Guide (LAB ' + LAB_NUMBER + ')\n\nFor every test: the report entry, the secure implementation, and the regression retest that proves the fix.\n';
  for (const f of FEATURES) {
    fix += '\n## ' + f + '\n';
    for (const t of TESTS.filter(x => x.feature === f)) {
      fix += '\n### ' + t.report.title + '\n- **Severity:** ' + t.report.severity + '\n- **Remediation:** ' + t.report.remediation + '\n- **Secure implementation:** ' + t.fix + '\n- **Regression retest:** Re-run the original exploit (' + t.how + ') against the fixed build. It must fail: no test flip, no unauthorized data, no state change. Then confirm the legitimate flow still works for an authorized user.\n';
    }
  }
  fs.writeFileSync(path.join(ROOT, 'FIX-AND-RETEST.md'), fix);
  console.log('Docs generated from registry: ' + TESTS.length + ' tests, ' + FEATURES.length + ' features.');
}

/* ------------------------------ Router ------------------------------ */
async function handle(req, res) {
  const ctx = makeCtx(req, res);
  try {
    const url = new URL(req.url, 'http://127.0.0.1:' + PORT);
    req.query = Object.fromEntries(url.searchParams.entries());
    req.headers = req.headers;
    ctx.req = req;
    if (req.method === 'POST' || req.method === 'PUT') ctx.body = await readBody(req);
    resolveSession(ctx);
    const p = url.pathname;

    if (p === '/logo.png') {
      try { const img = fs.readFileSync(path.join(ROOT, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(img); }
      catch (e) { return ctx.send(404, 'logo missing'); }
    }
    if (p === '/api/progress') {
      return ctx.json(200, { lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done: doneCount(), pct: pct(), features: featureStats(), complete: isComplete() });
    }
    if (p === '/api/chat' && req.method === 'POST') {
      return ctx.json(200, { reply: coachReply(ctx.body.message) });
    }
    if (p === '/unlock' && req.method === 'POST') {
      const given = String(ctx.body.key || '');
      const expected = entryKey();
      // Constant-work comparison, exact match, no partial hints.
      let diff = given.length === expected.length ? 0 : 1;
      for (let i = 0; i < expected.length; i++) { if (given.charCodeAt(i) !== expected.charCodeAt(i)) diff = 1; }
      if (diff === 0) { state.unlocked = true; saveState(); return ctx.redirect('/'); }
      return ctx.send(403, gatePage(ctx));
    }

    if (!state.unlocked) return ctx.send(200, gatePage(ctx));

    if (p === '/tester-name' && req.method === 'POST') { state.testerName = String(ctx.body.name || '').slice(0, 80); saveState(); return ctx.redirect('/complete'); }
    if (p === '/login') return req.method === 'POST' ? doLogin(ctx) : ctx.send(200, loginPage(ctx));
    if (p === '/register') return req.method === 'POST' ? doRegister(ctx) : ctx.send(200, registerPage(ctx));
    if (p === '/forgot') return req.method === 'POST' ? doForgot(ctx) : ctx.send(200, forgotPage(ctx));
    if (p === '/reset' && req.method === 'POST') return doReset(ctx);
    if (p === '/logout') { const sid = ctx.cookies.hx_session; if (sid) sessions.delete(sid); ctx.cookie('hx_session', ''); return ctx.redirect('/login'); }
    if (p === '/tests') return ctx.send(200, testsPage(ctx));
    if (p === '/complete') return ctx.send(200, completePage(ctx));
    if (p === '/certificate') return certificatePage(ctx);
    if (p === '/') return ctx.send(200, homePage(ctx));
    // Platform API is intentionally reachable without a session:
    // /api/debug is unauthenticated by design (the exposure test) and
    // /api/cases authenticates via its own token (the weak-token test).
    if (p === '/api/cases') return apiCases(ctx);
    if (p === '/api/debug') return apiDebug(ctx);

    if (!ctx.user) return ctx.redirect('/login');

    let m;
    if (p === '/cases') return ctx.send(200, casesPage(ctx));
    if ((m = p.match(/^\/cases\/(\d+)$/))) return ctx.send(200, casePage(ctx, +m[1]));
    if ((m = p.match(/^\/cases\/(\d+)\/notes$/))) return ctx.send(200, caseNotesPage(ctx, +m[1]));
    if ((m = p.match(/^\/cases\/(\d+)\/edit$/)) && req.method === 'POST') return doCaseEdit(ctx, +m[1]);
    if ((m = p.match(/^\/cases\/(\d+)\/upload$/)) && req.method === 'POST') return doUpload(ctx, +m[1]);
    if ((m = p.match(/^\/documents\/(\d+)$/))) return ctx.send(200, documentPage(ctx, +m[1]));
    if (p === '/download') return doDownload(ctx);
    if ((m = p.match(/^\/uploads\/(.+)$/))) return serveUpload(ctx, decodeURIComponent(m[1]));
    if (p === '/search') return ctx.send(200, searchPage(ctx));
    if (p === '/appointments' && req.method === 'GET') return ctx.send(200, appointmentsPage(ctx));
    if (p === '/appointments' && req.method === 'POST') return doBook(ctx);
    if ((m = p.match(/^\/appointments\/(\d+)$/))) return ctx.send(200, appointmentPage(ctx, +m[1]));
    if (p === '/invoices') return ctx.send(200, invoicesPage(ctx));
    if ((m = p.match(/^\/invoices\/(\d+)$/))) return ctx.send(200, invoicePage(ctx, +m[1]));
    if ((m = p.match(/^\/invoices\/(\d+)\/pay$/)) && req.method === 'POST') return doPay(ctx, +m[1]);
    if (p === '/profile') return req.method === 'POST' ? doProfile(ctx) : ctx.send(200, profilePage(ctx));
    if (p === '/attorney') return ctx.send(200, attorneyPage(ctx));
    if (p === '/admin') return ctx.send(200, adminPage(ctx));
    if ((m = p.match(/^\/admin\/users\/(\d+)\/deactivate$/)) && req.method === 'POST') return doDeactivate(ctx, +m[1]);

    return ctx.send(404, layout(ctx, 'Not found', '<div class="card"><h1>404 — page not found.</h1></div>'));
  } catch (e) {
    try { ctx.send(500, 'Internal error — the lab is still running.'); } catch (e2) { /* response already gone */ }
  }
}

if (process.argv.includes('--gen-docs')) {
  genDocs();
} else {
  const server = http.createServer((req, res) => { handle(req, res); });
  server.listen(PORT, '127.0.0.1', () => {
    console.log('LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' listening on http://127.0.0.1:' + PORT + ' (local-only training lab, all data fake)');
  });
}
