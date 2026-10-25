'use strict';
/* HexaFleet — LAB 75 — HexaCyberLab vulnerable practice lab (LOCAL ONLY).
   Fleet management platform: vehicles, driver assignments, trip logs, fuel
   expenses, maintenance work orders. Zero-dependency Node. All data is fake
   seed data. Intentionally vulnerable — never deploy publicly. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3084;
const LAB_NUMBER = 75;
const LAB_NAME = 'HexaFleet';
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const DOCS_DIR = path.join(DIR, 'docs');
const FUEL_PRICE = 1.45; // server-side price per litre (the truth the app should use)

/* ---------- keys: stored ONLY as scattered base64-of-reversed shards ---------- */


const SH_C = ["TC1YSA==","Qy02Nw==","Q0xVWg==","LVBRUQ==","RFdCNg==","UE9UWQ=="];
const SH_D = ['cmV2aWxk'];
function asm(shards) {
  return shards.map(function (s) { return Buffer.from(s, 'base64').toString('utf8').split('').reverse().join(''); }).join('');
}
const ENTRY_KEY_SHA256 = '4fab67582889b99368e6fc673b15312768700ec006104b77f9ae032a4384b318';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */
function completionKey() { return asm(SH_C.concat(SH_D.slice(0, 0))); }

/* ---------- TESTS registry ---------- */
const TESTS = [
  /* ----- Login & Authentication ----- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL injection login bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login form builds its query by string concatenation.', "Try a classic tautology in the email field: ' OR '1'='1", 'Submit with any password — if a session opens as another user, the query was injected.'],
    lesson: 'String-built SQL queries let an attacker rewrite the login check itself and walk in as the first account in the table — usually the admin.',
    impact: 'On a real fleet platform this means instant takeover of the admin account: every vehicle, driver record and expense is exposed or editable.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries everywhere; never build SQL by string concatenation.' },
    guide: 'Go to /login. In the email field type: \' OR \'1\'=\'1 and any password, then submit. The string-built query matches the first user (the admin) and opens a session without the real password.' },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute force — no rate limiting or lockout', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Pick one real account and keep guessing its password.', 'Notice nothing slows down or locks after many failures.', 'Fail 10 times in a row for the same account — the app still happily processes attempt 11.'],
    lesson: 'Without throttling or lockout, an attacker can try thousands of passwords against a driver or manager account until one works.',
    impact: 'A guessed fleet-manager password hands an attacker the whole operation: assignments, expenses and driver data.',
    report: { title: 'No Rate Limiting or Account Lockout on Login', severity: 'High', remediation: 'Add progressive delays, lockout after repeated failures, and alerting on credential-stuffing patterns.' },
    guide: 'Choose one account (for example a driver email from the login page demo note) and submit a wrong password 10 or more times. The app never locks, delays or challenges you — every attempt is processed.' },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User enumeration via login and forgot-password responses', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the error for an email that exists with one that does not.', 'The forgot-password form answers differently too.', 'Probe at least 5 different emails and note which ones are confirmed as real accounts.'],
    lesson: 'Different error messages for "no such account" and "wrong password" let attackers build a list of valid accounts before attacking passwords.',
    impact: 'Attackers confirm which driver/manager emails are real, then focus phishing and password attacks only on accounts that exist.',
    report: { title: 'Account Enumeration Through Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message for all failed logins and password-reset requests.' },
    guide: 'Submit /forgot (or /login) with several different emails — some real (demo note on the login page), some invented. The responses differ: real accounts are confirmed, invented ones are denied. Probe 5 or more distinct emails.' },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Weak and published default credentials', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['The login page itself prints a demo account.', 'Factory passwords like admin123 were never changed.', 'Sign in with a published/default credential set and you are straight in.'],
    lesson: 'Demo and factory-default credentials left active are the first thing an attacker tries — they are printed in manuals and, here, on the login page itself.',
    impact: 'Anyone on the internet can sign in with the printed demo account — and the untouched admin password — and operate the fleet platform as staff.',
    report: { title: 'Default and Demo Credentials Active on Production Login', severity: 'High', remediation: 'Force password changes on first login, remove demo accounts, and never print credentials on the login page.' },
    guide: 'Read the demo note on /login and sign in with the printed demo credentials — or try the factory admin password admin123 on the admin email. No attack needed; the door was left open.' },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable password-reset token', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a reset and look at the token format.', 'The token is computed from the user id with simple arithmetic: HF + (id x 137 + 42).', 'Compute the token for any user id and reset their password without ever requesting a link.'],
    lesson: 'Reset tokens must be unguessable random secrets. A token derived from the user id with arithmetic can be computed for any account, including the admin.',
    impact: 'An attacker computes the manager or admin reset token from a public user id and takes over the account in seconds — no inbox access needed.',
    report: { title: 'Password Reset Token Is Predictable From the User ID', severity: 'High', remediation: 'Generate reset tokens from a CSPRNG, store only a hash, expire them quickly and bind them to a single use.' },
    guide: 'The reset token formula leaks from the flow: token = HF + (userId x 137 + 42). For the driver with id 3 that is HF453. POST that token with a new password to /reset — no reset email was ever requested, yet the password changes.' },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Session role cookie tampering', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After login, inspect the cookies the app sets.', 'One cookie carries your role — and the server trusts the copy your browser sends back.', 'Edit hx_role to manager or admin, then open the manager dashboard.'],
    lesson: 'Authorization data must live server-side. When the server trusts a role stored in a client cookie, every user is one edit away from being a manager.',
    impact: 'Any driver can promote themselves to fleet manager in their browser and approve expenses, reassign vehicles and read the whole fleet.',
    report: { title: 'Privilege Escalation by Tampering With the Client-Side Role Cookie', severity: 'High', remediation: 'Keep roles in the server-side session only; never trust client-supplied role claims.' },
    guide: 'Log in as a driver. In your browser dev tools (or curl) set the cookie hx_role=manager, then request /manager. The server trusts the cookie and serves the manager dashboard to a driver account.' },

  /* ----- Registration & Profile ----- */
  { id: 'reg-weak', feature: 'Registration & Profile', name: 'Weak password policy on registration', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a new account with the shortest password you can think of.', 'Even a single character is accepted.', 'Weak passwords fall instantly to guessing and credential stuffing.'],
    lesson: 'A password policy that accepts one-character passwords guarantees some accounts will be trivially guessable.',
    impact: 'Driver accounts with passwords like "x" are taken over by the first automated guess, exposing trips, expenses and personal data.',
    report: { title: 'Registration Accepts Single-Character Passwords', severity: 'Medium', remediation: 'Enforce a minimum length (12+) and screen against common-password lists at registration.' },
    guide: 'Go to /register and create an account with the password x (one character). The account is created without complaint.' },
  { id: 'reg-mass', feature: 'Registration & Profile', name: 'Mass assignment — self-assign a privileged role', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration form only shows name, email and password — the server accepts more.', 'Add a role field to the registration POST.', 'Register with role=manager and check what your new account can open.'],
    lesson: 'Binding a whole request body to a user object lets attackers set fields the form never showed — like their own role.',
    impact: 'Anyone can register themselves as fleet manager or admin, skipping every approval step the business thinks it has.',
    report: { title: 'Mass Assignment in Registration Allows Role Self-Assignment', severity: 'High', remediation: 'Whitelist the exact fields registration may set; assign roles only through an admin-controlled flow.' },
    guide: 'Intercept the /register POST and add the field role=manager (or role=admin). The server stores it, and your brand-new account immediately holds a staff role.' },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in display name', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Names are rendered back without encoding — including in the admin user list.', 'Put an HTML/JS payload in the display name at registration or in your profile.', 'A payload like <script>alert(1)</script> in the name is stored and served raw.'],
    lesson: 'Any field that is stored and later rendered — names included — must be output-encoded, or it becomes a stored XSS delivery vehicle.',
    impact: 'A driver name carrying a script fires in the fleet manager\u2019s and admin\u2019s browsers, stealing sessions and acting as staff.',
    report: { title: 'Stored Cross-Site Scripting in User Display Name', severity: 'High', remediation: 'Output-encode all user data at render time and validate name fields against an allow-list.' },
    guide: 'Register (or update your profile) with the display name <script>alert(1)</script>. The payload is stored and rendered unescaped — visible raw in the page source and in the admin user list.' },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on profile update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The app marks its own forms with a hidden hx_origin field — but never checks it properly.', 'Submit the profile form without that marker, from a foreign Origin.', 'The change is applied anyway: no token, no origin check.'],
    lesson: 'State-changing forms need an unforgeable CSRF token. A marker the server never verifies is decoration, not protection.',
    impact: 'A malicious page open in a manager\u2019s browser can silently rewrite their profile — the first step in account-takeover chains.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require a per-session CSRF token on every state-changing request and verify Origin/Referer.' },
    guide: 'While logged in, POST to /profile with a new name but WITHOUT the hidden hx_origin field (and a foreign Origin header). The profile changes anyway — the server never verified the marker.' },

  /* ----- Vehicles & Documents ----- */
  { id: 'veh-idor', feature: 'Vehicles & Documents', name: 'Vehicle IDOR — view another driver\u2019s vehicle and documents', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Vehicle pages live at /vehicles/<id> with small sequential ids.', 'Log in as one driver and open the vehicle assigned to another driver.', 'The full record — including its document list — is served without an ownership check.'],
    lesson: 'Every object access must check that the object belongs to the requester. Sequential ids plus no check equals full fleet exposure.',
    impact: 'Drivers (or anyone with a stolen driver login) can read every vehicle\u2019s registration and insurance documents — prime material for fraud and cloning.',
    report: { title: 'Insecure Direct Object Reference on Vehicle Records', severity: 'High', remediation: 'Authorize every vehicle/document access against the session user\u2019s assignments and role.' },
    guide: 'Log in as Karim (driver, vehicle 1). Open /vehicles/2 — Sara\u2019s vehicle. The full record and its documents are served even though it is not assigned to you.' },
  { id: 'veh-traversal', feature: 'Vehicles & Documents', name: 'Path traversal on document download', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Documents are downloaded through /documents?file=<name>.', 'The name is joined to the docs folder without sanitising .. segments.', 'Ask for ../../server.js and the application source code comes back.'],
    lesson: 'File paths built from user input must be normalised and confined to the intended directory, or the whole filesystem is a download menu.',
    impact: 'Attackers download server source code, configuration and any file the process can read — turning one download link into full system disclosure.',
    report: { title: 'Directory Traversal in Document Download Exposes Server Files', severity: 'High', remediation: 'Resolve the requested path, verify it stays inside the documents directory, and serve files by id, not by name.' },
    guide: 'Request /documents?file=../../server.js while logged in. The path escapes the docs folder and the server returns its own source code.' },
  { id: 'veh-reassign', feature: 'Vehicles & Documents', name: 'Driver reassigns a vehicle to themselves', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Assignment is a POST to /vehicles/<id>/assign meant for managers.', 'The server never checks the caller\u2019s role.', 'As a driver, assign another driver\u2019s vehicle to your own id.'],
    lesson: 'Sensitive workflow actions need server-side role checks; hiding the button in the UI is not authorization.',
    impact: 'A driver can steal the best vehicle, break another driver\u2019s schedule, and corrupt the assignment records the business runs on.',
    report: { title: 'Missing Authorization on Vehicle Assignment Allows Self-Assignment', severity: 'High', remediation: 'Restrict assignment changes to fleet-manager and admin roles, enforced server-side.' },
    guide: 'Log in as a driver. POST to /vehicles/2/assign with driverId set to your own user id. Sara\u2019s vehicle is reassigned to you — the server never asked whether you are a manager.' },

  /* ----- Trip Logs & Mileage ----- */
  { id: 'trip-idor', feature: 'Trip Logs & Mileage', name: 'Trip log IDOR — read another driver\u2019s trips', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Trip pages live at /trips/<id>.', 'Open a trip that belongs to another driver.', 'Routes, times and mileage of colleagues are all readable.'],
    lesson: 'Trip logs are personal operational data; object-level authorization is required on every read, not just on lists.',
    impact: 'Movements of every driver become visible to any account — a privacy breach and a safety risk for the workforce.',
    report: { title: 'Insecure Direct Object Reference on Trip Logs', severity: 'Medium', remediation: 'Check trip ownership (or staff role) before serving any trip record.' },
    guide: 'Log in as Karim and open /trips/2 — Sara\u2019s trip. Her route and mileage are served without any ownership check.' },
  { id: 'trip-mileage', feature: 'Trip Logs & Mileage', name: 'Mileage tampering on an approved trip', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['Approved trips should be immutable — the edit endpoint disagrees.', 'POST a new endKm to /trips/<id>/edit for an already-approved trip.', 'The payable mileage changes after approval, with no re-review.'],
    lesson: 'Records that drive payments must be locked after approval; any later change needs a new approval trail.',
    impact: 'Drivers inflate approved mileage and get paid for kilometres never driven — quiet, repeatable payroll fraud.',
    report: { title: 'Approved Trip Mileage Can Be Edited Without Re-Approval', severity: 'High', remediation: 'Make approved trips immutable; route corrections through a manager-approved adjustment flow.' },
    guide: 'Take Karim\u2019s approved trip 1 (120 km). POST to /trips/1/edit with a much larger endKm. The approved mileage — and what it pays — changes instantly.' },
  { id: 'trip-delete', feature: 'Trip Logs & Mileage', name: 'Delete another driver\u2019s trip log', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The delete action is a POST to /trips/<id>/delete.', 'Ownership is never checked.', 'Delete a trip that belongs to a colleague and it is gone.'],
    lesson: 'Destructive actions need the strictest authorization checks; a missing check turns any account into a wrecking ball for records.',
    impact: 'Trip evidence can be erased to hide fraud or sabotage operations — with no audit trail to recover it.',
    report: { title: 'Missing Authorization Allows Deleting Other Drivers\u2019 Trip Logs', severity: 'High', remediation: 'Restrict deletion to the owner or staff roles and keep a soft-delete audit log.' },
    guide: 'Log in as Karim. POST to /trips/2/delete — Sara\u2019s trip disappears, even though you are neither its owner nor staff.' },

  /* ----- Fuel Expenses ----- */
  { id: 'fuel-inflation', feature: 'Fuel Expenses', name: 'Fuel expense amount inflation', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['The expense form asks for litres AND an amount.', 'The server should price fuel itself (litres x $1.45) — it trusts your amount instead.', 'Claim 10 litres with an amount of $500 and watch it get stored.'],
    lesson: 'Money amounts must always be computed server-side from trusted inputs. A client-supplied total is an invitation to inflate claims.',
    impact: 'Every driver can multiply fuel claims at will; across a fleet this is direct, ongoing cash loss.',
    report: { title: 'Client-Supplied Fuel Expense Amount Trusted by the Server', severity: 'High', remediation: 'Compute expense amounts server-side from litres and the official fuel price; reject mismatched claims.' },
    guide: 'Submit a fuel expense with litres=10 but amount=500. The server stores $500 for 10 litres of fuel instead of pricing it at $14.50 itself.' },
  { id: 'fuel-approve', feature: 'Fuel Expenses', name: 'Driver approves their own fuel expense', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Approval is a POST to /expenses/<id>/approve — a manager action.', 'The endpoint never verifies the caller is a manager, or that they are not the claimant.', 'Create an expense, then approve it yourself.'],
    lesson: 'Separation of duties only exists if the server enforces it. Self-approval turns the whole expense workflow into an honour system.',
    impact: 'Combined with inflated amounts, drivers can claim and approve their own money end-to-end — complete expense fraud with valid-looking records.',
    report: { title: 'Broken Access Control Allows Self-Approval of Fuel Expenses', severity: 'Critical', remediation: 'Enforce manager-only approval server-side and forbid approving your own claims.' },
    guide: 'As a driver, create a fuel expense, then POST to /expenses/<its id>/approve yourself. It flips to approved — the manager step never happened.' },

  /* ----- Maintenance & Work Orders ----- */
  { id: 'maint-close', feature: 'Maintenance & Work Orders', name: 'Close another driver\u2019s maintenance work order', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Work orders close via POST /workorders/<id>/close.', 'The closer is never checked against the reporter, the assigned mechanic, or staff roles.', 'Close a work order reported by another driver.'],
    lesson: 'Workflow transitions must verify the actor\u2019s relationship to the record — anyone-can-close breaks maintenance safety chains.',
    impact: 'Safety repairs can be marked done without being done: vehicles go back on the road with known faults, and the paper trail says "closed".',
    report: { title: 'Missing Authorization on Work Order Closure', severity: 'High', remediation: 'Allow closing only by the assigned mechanic or fleet staff, with the closer recorded.' },
    guide: 'Log in as Karim. POST to /workorders/2/close — the work order Sara reported is closed by you, though you are neither reporter, mechanic, nor manager.' },
  { id: 'maint-cost', feature: 'Maintenance & Work Orders', name: 'Work order cost tampering by a driver', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Costs are set through POST /workorders/<id>/cost, a mechanic/manager function.', 'A plain driver session can call it too.', 'Set an arbitrary cost on any work order.'],
    lesson: 'Financial fields on operational records need role checks and change history; otherwise budgets and supplier billing can be rewritten by anyone.',
    impact: 'Maintenance costs can be inflated for kickback fraud or zeroed to hide spending — the finance reports stop meaning anything.',
    report: { title: 'Unauthorized Users Can Rewrite Work Order Costs', severity: 'Medium', remediation: 'Restrict cost edits to mechanic/manager roles and keep an immutable change log.' },
    guide: 'As a driver, POST to /workorders/1/cost with cost=9999. The recorded maintenance cost changes — a financial field edited by someone with no right to touch it.' },

  /* ----- Search ----- */
  { id: 'search-sqli', feature: 'Search', name: 'SQL injection in vehicle search', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Search builds its query with the raw q parameter.', "A tautology like ' OR '1'='1 makes the WHERE clause always true.", 'The dump includes a decommissioned vehicle that normal search hides.'],
    lesson: 'Search boxes are injection points like any other input; parameterisation is not optional just because the field is "only search".',
    impact: 'Attackers dump the entire fleet register — including decommissioned and internal vehicles — through a single search request.',
    report: { title: 'SQL Injection in Vehicle Search Returns the Full Register', severity: 'High', remediation: 'Parameterise the search query and escape LIKE wildcards in user input.' },
    guide: 'Request /search?q=\' OR \'1\'=\'1 — the always-true condition returns every vehicle, including DHK-1004, the decommissioned unit hidden from normal search.' },
  { id: 'search-xss', feature: 'Search', name: 'Reflected XSS in search results', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The results page prints your query back: Results for "...".', 'It prints it raw, without encoding.', 'Put a script payload in q and view the page source.'],
    lesson: 'Reflected input must be encoded on output even when it "only" echoes the user\u2019s own query — the victim is whoever is sent the crafted link.',
    impact: 'A crafted search link runs script in a manager\u2019s browser, enabling session theft and actions taken as staff.',
    report: { title: 'Reflected Cross-Site Scripting in Search', severity: 'Medium', remediation: 'HTML-encode the reflected query and all user input at render time.' },
    guide: 'Request /search?q=<script>alert(1)</script> and view source: your payload is reflected unescaped into the results page.' },

  /* ----- Admin Panel ----- */
  { id: 'admin-bac', feature: 'Admin Panel', name: 'Admin panel open to any signed-in user', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The admin console lives at /admin.', 'Nothing checks your role before serving it — being logged in is enough.', 'Open it as a plain driver and read the full user list, passwords included.'],
    lesson: 'Admin surfaces must verify the admin role server-side on every request; obscurity of the URL is not a control.',
    impact: 'Every driver account can read all credentials in the system — total compromise of the platform from the lowest-privilege login.',
    report: { title: 'Broken Access Control Exposes Admin Console and Passwords to All Users', severity: 'Critical', remediation: 'Enforce admin-role checks on every admin route and never display stored passwords.' },
    guide: 'Log in as any driver and open /admin. The full admin console — every user with their password — is served without a role check.' },
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'CSRF on admin user deactivation', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    hints: ['Deactivation is a POST to /admin/deactivate.', 'Like the profile form, it carries a marker the server ignores.', 'Fire the POST without hx_origin, from a foreign Origin, using an admin session — the user is deactivated.'],
    lesson: 'Admin actions are the highest-value CSRF targets; tokens must be verified, not merely present in the form.',
    impact: 'One malicious page visited by the admin silently deactivates accounts — operations halt and the audit trail blames the admin.',
    report: { title: 'Missing CSRF Verification on Admin User Deactivation', severity: 'High', remediation: 'Verify a per-session CSRF token on all admin state changes and enforce SameSite cookies.' },
    guide: 'With an admin session, POST to /admin/deactivate with a userId but no hx_origin marker and a foreign Origin header. The account is deactivated — no token was ever checked.' },

  /* ----- Platform & API ----- */
  { id: 'plat-debug', feature: 'Platform & API', name: 'Unauthenticated debug endpoint dumps all data', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Developers left a diagnostic endpoint at /api/debug.', 'It needs no login at all.', 'It returns every user — passwords included — plus the fleet data.'],
    lesson: 'Debug and diagnostic endpoints must never ship to production; unauthenticated ones are a complete data breach in a single request.',
    impact: 'Anyone on the network can download the entire user database with plaintext passwords — no account, no attack skill required.',
    report: { title: 'Unauthenticated Debug Endpoint Exposes the Full User Database', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; gate diagnostics behind admin auth and network restrictions.' },
    guide: 'Without logging in at all, request /api/debug. The response is the full database dump: users with passwords, vehicles, trips and expenses.' },
  { id: 'plat-token', feature: 'Platform & API', name: 'Weak API token — base64 of the user\u2019s email', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['The JSON API checks an X-API-Key header.', 'The "key" is just the account email, base64-encoded.', 'Encode any user\u2019s email and the API treats you as them.'],
    lesson: 'API tokens must be random secrets issued per account. A token anyone can derive from a public identifier is not authentication.',
    impact: 'Knowing a manager\u2019s email address — public information — is enough to use the API as them and pull fleet data at scale.',
    report: { title: 'API Authentication Token Is Derivable From the User\u2019s Email Address', severity: 'High', remediation: 'Issue random, revocable API keys per account and store only their hashes.' },
    guide: 'Send GET /api/vehicles with the header X-API-Key set to the base64 of any account email, e.g. the manager\u2019s. The API returns the fleet as if you were that user.' }
];

/* ---------- seed data (all fake) ---------- */
const users = [
  { id: 1, name: 'Ava Admin', email: 'admin@hexafleet.local', password: 'admin123', role: 'admin', active: true },
  { id: 2, name: 'Max Manager', email: 'manager@hexafleet.local', password: 'manager123', role: 'manager', active: true },
  { id: 3, name: 'Karim Driver', email: 'karim@hexafleet.local', password: 'karim123', role: 'driver', active: true },
  { id: 4, name: 'Sara Driver', email: 'sara@hexafleet.local', password: 'sara123', role: 'driver', active: true },
  { id: 5, name: 'Rafi Mechanic', email: 'rafi@hexafleet.local', password: 'rafi123', role: 'mechanic', active: true },
  { id: 6, name: 'Demo Dan', email: 'demo@hexafleet.local', password: 'demo123', role: 'driver', active: true }
];
let nextUserId = 7;
const vehicles = [
  { id: 1, plate: 'DHK-1001', model: 'Toyota Hilux', type: 'Pickup', status: 'active', assignedDriverId: 3, docs: ['reg-DHK-1001.txt', 'insurance-DHK-1001.txt'] },
  { id: 2, plate: 'DHK-1002', model: 'Ford Transit', type: 'Van', status: 'active', assignedDriverId: 4, docs: ['reg-DHK-1002.txt'] },
  { id: 3, plate: 'DHK-1003', model: 'Mitsubishi Fuso', type: 'Truck', status: 'active', assignedDriverId: null, docs: ['reg-DHK-1003.txt'] },
  { id: 4, plate: 'DHK-1004', model: 'Scrapped Hino Bus', type: 'Bus', status: 'decommissioned', assignedDriverId: null, docs: [] }
];
const trips = [
  { id: 1, driverId: 3, vehicleId: 1, date: '2026-10-20', route: 'Dhaka Depot -> Gazipur Warehouse', startKm: 10000, endKm: 10120, status: 'approved' },
  { id: 2, driverId: 4, vehicleId: 2, date: '2026-10-21', route: 'Dhaka Depot -> Narayanganj Port', startKm: 45200, endKm: 45268, status: 'submitted' },
  { id: 3, driverId: 3, vehicleId: 1, date: '2026-10-22', route: 'Gazipur Warehouse -> Dhaka Depot', startKm: 10120, endKm: 10241, status: 'submitted' }
];
let nextTripId = 4;
const expenses = [
  { id: 1, driverId: 3, vehicleId: 1, liters: 50, amount: 72.50, status: 'pending' },
  { id: 2, driverId: 4, vehicleId: 2, liters: 40, amount: 58.00, status: 'approved' }
];
let nextExpenseId = 3;
const workorders = [
  { id: 1, vehicleId: 1, reportedBy: 3, assignedTo: 5, description: 'Brake pads worn — replace before next long trip', cost: 200, status: 'open' },
  { id: 2, vehicleId: 2, reportedBy: 4, assignedTo: 5, description: 'Air conditioning not cooling', cost: 150, status: 'open' }
];
let nextWoId = 3;

/* ---------- progress engine ---------- */
let state = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadState() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const s = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      if (s && typeof s === 'object') state = Object.assign(state, s);
    }
  } catch (e) { /* corrupted state -> start fresh */ }
}
function saveState() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 1)); } catch (e) { /* ignore */ }
}
loadState();
function pass(id) {
  if (!state.tests[id]) {
    state.tests[id] = true;
    if (TESTS.every(function (t) { return state.tests[t.id]; })) {
      state.keyRevealed = true;
      if (!state.completedAt) state.completedAt = new Date().toISOString();
    }
    saveState();
  }
}
function attempt(feature) {
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  saveState();
}
function doneCount() { return TESTS.filter(function (t) { return state.tests[t.id]; }).length; }
function pct() { return Math.floor(doneCount() / TESTS.length * 100); }
function isComplete() { return doneCount() === TESTS.length; }
function featureStats() {
  const out = {};
  TESTS.forEach(function (t) {
    if (!out[t.feature]) out[t.feature] = { total: 0, done: 0, attempts: state.attempts[t.feature] || 0 };
    out[t.feature].total++;
    if (state.tests[t.id]) out[t.feature].done++;
  });
  Object.keys(out).forEach(function (f) { out[f].attempts = state.attempts[f] || 0; });
  return out;
}

/* ---------- small helpers ---------- */
const INJ = /(\'\s*(or|and)\s+[^=]+=[^\s&]+)|(\'\s*--)|(\bunion\b\s+\bselect\b)/i;
const XSS = /<script|<svg|onerror\s*=|onload\s*=|<img[^>]*onerror|<iframe/i;
const sessions = new Map();
const loginFails = {};
const probedEmails = new Set();
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function userById(id) { return users.find(function (u) { return u.id === Number(id); }); }
function userByEmail(email) { return users.find(function (u) { return u.email === String(email || '').toLowerCase(); }); }
function resetTokenFor(id) { return 'HF' + (Number(id) * 137 + 42); }
function parseBody(req) {
  return new Promise(function (resolve) {
    let data = '';
    req.on('data', function (c) { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', function () {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) {
        try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({ __badjson: true }); }
      } else {
        const out = {};
        new URLSearchParams(data).forEach(function (v, k) { out[k] = v; });
        resolve(out);
      }
    });
    req.on('error', function () { resolve({}); });
  });
}
function parseCookies(req) {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach(function (p) {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function sessionUser(req) {
  const c = parseCookies(req);
  if (c.hx_session && sessions.has(c.hx_session)) return sessions.get(c.hx_session);
  return null;
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function redirect(res, to, extraHeaders) {
  const h = { Location: to };
  if (extraHeaders) Object.assign(h, extraHeaders);
  res.writeHead(302, h);
  res.end();
}
function progressBar() {
  const d = doneCount(), p = pct();
  return '<div style="background:#1d2433;padding:8px 16px;border-bottom:2px solid #2f81f7;color:#e6edf3;font-family:Arial">'
    + '<img src="/logo.png" style="height:26px;vertical-align:middle"> <b>LAB ' + LAB_NUMBER + ' \u2014 ' + LAB_NAME + '</b>'
    + ' &nbsp;\u00b7&nbsp; ' + d + '/' + TESTS.length + ' tests \u00b7 ' + p + '%'
    + ' <span style="display:inline-block;width:180px;background:#0d1117;border-radius:6px;vertical-align:middle;margin-left:8px"><span style="display:block;width:' + p + '%;background:#2f81f7;border-radius:6px">&nbsp;</span></span>'
    + ' <span style="float:right"><a style="color:#7ee787" href="/">Dashboard</a> \u00b7 <a style="color:#7ee787" href="/tests">Mission Board</a> \u00b7 <a style="color:#7ee787" href="/complete">Completion</a></span></div>'
    + chatWidget();
}
function chatWidget() {
  return '<div id="hxchat" style="position:fixed;right:14px;bottom:14px;width:300px;background:#fff;border:1px solid #ccd;border-radius:10px;box-shadow:0 4px 18px rgba(0,0,0,.25);font-family:Arial;z-index:99">'
    + '<div style="background:#1d2433;color:#fff;padding:8px 12px;border-radius:10px 10px 0 0"><b>Lab Coach</b> <span style="font-size:11px;color:#9fb">HexaCyberLab</span></div>'
    + '<div id="hxlog" style="height:170px;overflow:auto;padding:8px;font-size:13px"></div>'
    + '<div style="display:flex;border-top:1px solid #eee"><input id="hxmsg" style="flex:1;border:0;padding:8px" placeholder="Ask the coach..."><button onclick="hxSend()" style="background:#2f81f7;color:#fff;border:0;padding:8px 12px">Send</button></div>'
    + '<script>async function hxSend(){var m=document.getElementById("hxmsg");var log=document.getElementById("hxlog");if(!m.value)return;log.innerHTML+="<div><b>You:</b> "+m.value.replace(/</g,"&lt;")+"</div>";var v=m.value;m.value="";try{var r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:v})});var j=await r.json();log.innerHTML+="<div style=\\"margin:4px 0\\"><b>Coach:</b> "+String(j.reply).replace(/</g,"&lt;")+"</div>";}catch(e){log.innerHTML+="<div><b>Coach:</b> connection issue</div>";}log.scrollTop=log.scrollHeight;}</script></div>';
}
function page(title, user, body) {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + ' \u00b7 LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</title></head>'
    + '<body style="margin:0;background:#f4f6fb;font-family:Arial;color:#1d2433">'
    + progressBar()
    + '<div style="max-width:920px;margin:22px auto;padding:0 16px 90px">'
    + (user ? '<p style="color:#555">Signed in as <b>' + user.name + '</b> (' + esc(user.role) + ') \u00b7 <a href="/profile">Profile</a> \u00b7 <a href="/logout">Log out</a></p>' : '')
    + body + '</div></body></html>';
}
const ORIGIN_FIELD = '<input type="hidden" name="hx_origin" value="hx-same-site">';

/* ---------- pages: gate / auth ---------- */
function gatePage(msg) {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ' + LAB_NUMBER + ' \u2014 ' + LAB_NAME + ' \u00b7 Locked</title></head>'
    + '<body style="margin:0;background:#14141d;font-family:Arial">'
    + '<div style="max-width:520px;margin:60px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:28px;text-align:center">'
    + '<img src="/logo.png" style="height:56px"><h2>LAB ' + LAB_NUMBER + ' \u2014 ' + LAB_NAME + '</h2>'
    + '<p>This lab is locked. Paste the completion key from Lab ' + (LAB_NUMBER - 1) + ' to start.</p>'
    + (msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : '')
    + '<form method="POST" action="/unlock"><input name="key" style="padding:9px;width:80%" placeholder="Completion key from Lab ' + (LAB_NUMBER - 1) + '"><br><br>'
    + '<button style="padding:10px 22px">Unlock LAB ' + LAB_NUMBER + '</button></form></div>'
    + chatWidget() + '</body></html>';
}
function loginPage(msg) {
  return page('Login', null, '<h1>HexaFleet \u2014 sign in</h1>'
    + (msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : '')
    + '<form method="POST" action="/login" style="background:#fff;padding:18px;border-radius:10px;max-width:420px">'
    + '<label>Email<br><input name="email" style="width:95%;padding:8px"></label><br><br>'
    + '<label>Password<br><input type="password" name="password" style="width:95%;padding:8px"></label><br><br>'
    + '<button style="padding:9px 20px">Sign in</button></form>'
    + '<p><a href="/forgot">Forgot password?</a> \u00b7 <a href="/register">Create an account</a></p>'
    + '<div style="background:#fff8d6;border:1px solid #e6d97a;padding:10px;border-radius:8px;max-width:420px"><b>Demo account (for evaluation):</b><br>demo@hexafleet.local / demo123</div>');
}
function registerPage(msg) {
  return page('Register', null, '<h1>Create your HexaFleet account</h1>'
    + (msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : '')
    + '<form method="POST" action="/register" style="background:#fff;padding:18px;border-radius:10px;max-width:420px">'
    + '<label>Full name<br><input name="name" style="width:95%;padding:8px"></label><br><br>'
    + '<label>Email<br><input name="email" style="width:95%;padding:8px"></label><br><br>'
    + '<label>Password<br><input type="password" name="password" style="width:95%;padding:8px"></label><br><br>'
    + '<button style="padding:9px 20px">Register</button></form><p>New accounts start as drivers.</p>');
}
function forgotPage(msg) {
  return page('Forgot password', null, '<h1>Reset your password</h1>'
    + (msg ? '<p>' + msg + '</p>' : '')
    + '<form method="POST" action="/forgot" style="background:#fff;padding:18px;border-radius:10px;max-width:420px">'
    + '<label>Email<br><input name="email" style="width:95%;padding:8px"></label><br><br>'
    + '<button style="padding:9px 20px">Send reset link</button></form>'
    + '<form method="POST" action="/reset" style="background:#fff;padding:18px;border-radius:10px;max-width:420px;margin-top:14px">'
    + '<h3>Have a token?</h3><label>Reset token<br><input name="token" style="width:95%;padding:8px"></label><br><br>'
    + '<label>New password<br><input type="password" name="password" style="width:95%;padding:8px"></label><br><br>'
    + '<button style="padding:9px 20px">Set new password</button></form>');
}

/* ---------- route handlers: auth ---------- */
async function handleLogin(req, res) {
  const b = await parseBody(req);
  attempt('Login & Authentication');
  const email = String(b.email || ''), password = String(b.password || '');
  probedEmails.add(email.toLowerCase());
  if (probedEmails.size >= 5) pass('auth-enum');
  // vulnerable: string-built "query" — an injection pattern bypasses the password check
  if (INJ.test(email) || INJ.test(password)) {
    const admin = users[0];
    const sid = crypto.randomBytes(12).toString('hex');
    sessions.set(sid, admin);
    pass('auth-sqli');
    return redirect(res, '/', { 'Set-Cookie': ['hx_session=' + sid + '; Path=/', 'hx_role=' + admin.role + '; Path=/', 'hx_origin=hx-same-site; Path=/'] });
  }
  const u = userByEmail(email);
  if (!u) return send(res, 200, loginPage('No account found for that email.'));
  if (!u.active) return send(res, 200, loginPage('This account has been deactivated.'));
  if (u.password !== password) {
    loginFails[u.email] = (loginFails[u.email] || 0) + 1;
    if (loginFails[u.email] >= 10) pass('auth-brute');
    return send(res, 200, loginPage('Wrong password for this account.'));
  }
  if (u.email === 'demo@hexafleet.local' || password === 'admin123' || password === 'manager123') pass('auth-default');
  const sid = crypto.randomBytes(12).toString('hex');
  sessions.set(sid, u);
  return redirect(res, '/', { 'Set-Cookie': ['hx_session=' + sid + '; Path=/', 'hx_role=' + u.role + '; Path=/', 'hx_origin=hx-same-site; Path=/'] });
}
async function handleRegister(req, res) {
  const b = await parseBody(req);
  attempt('Registration & Profile');
  const name = String(b.name || 'New Driver'), email = String(b.email || '').toLowerCase(), password = String(b.password || '');
  if (!email || !password) return send(res, 200, registerPage('Email and password are required.'));
  if (userByEmail(email)) return send(res, 200, registerPage('That email is already registered.'));
  if (password.length < 4) pass('reg-weak'); // flaw: accepted anyway below
  const role = b.role ? String(b.role) : 'driver'; // flaw: mass assignment
  if (b.role && String(b.role) !== 'driver') pass('reg-mass');
  if (XSS.test(name)) pass('reg-xss');
  const u = { id: nextUserId++, name: name, email: email, password: password, role: role, active: true };
  users.push(u);
  const sid = crypto.randomBytes(12).toString('hex');
  sessions.set(sid, u);
  return redirect(res, '/', { 'Set-Cookie': ['hx_session=' + sid + '; Path=/', 'hx_role=' + u.role + '; Path=/', 'hx_origin=hx-same-site; Path=/'] });
}
async function handleForgot(req, res) {
  const b = await parseBody(req);
  attempt('Login & Authentication');
  const email = String(b.email || '').toLowerCase();
  probedEmails.add(email);
  if (probedEmails.size >= 5) pass('auth-enum');
  const u = userByEmail(email);
  if (!u) return send(res, 200, forgotPage('<span style="color:#b00">No account with that email exists.</span>'));
  u.resetRequested = true;
  u.resetToken = resetTokenFor(u.id);
  return send(res, 200, forgotPage('Reset email sent to ' + esc(email) + '. (Lab note: your token is ' + u.resetToken + ')'));
}
async function handleReset(req, res) {
  const b = await parseBody(req);
  attempt('Login & Authentication');
  const token = String(b.token || ''), password = String(b.password || '');
  const u = users.find(function (x) { return resetTokenFor(x.id) === token; });
  if (!u || !password) return send(res, 200, forgotPage('<span style="color:#b00">Invalid reset token.</span>'));
  if (!u.resetRequested) pass('auth-reset'); // flaw: formula token works without any request
  u.password = password;
  u.resetRequested = false;
  return send(res, 200, forgotPage('Password updated. You can now <a href="/login">sign in</a>.'));
}
async function handleProfile(req, res, user) {
  const b = await parseBody(req);
  attempt('Registration & Profile');
  if (b.name) {
    if (XSS.test(String(b.name))) pass('reg-xss');
    user.name = String(b.name); // stored and rendered raw (see header/admin list)
  }
  if (b.hx_origin !== 'hx-same-site') pass('reg-csrf'); // flaw: marker never enforced — change applied anyway
  return redirect(res, '/profile');
}
function profilePage(user) {
  return page('Profile', user, '<h1>Your profile</h1>'
    + '<p>Name: <b>' + user.name + '</b><br>Email: ' + esc(user.email) + '<br>Role: ' + esc(user.role) + '</p>'
    + '<form method="POST" action="/profile" style="background:#fff;padding:18px;border-radius:10px;max-width:420px">'
    + '<label>Display name<br><input name="name" value="' + esc(user.name) + '" style="width:95%;padding:8px"></label><br><br>'
    + ORIGIN_FIELD + '<button style="padding:9px 20px">Save</button></form>');
}

/* ---------- business pages ---------- */
function dashboardPage(user) {
  const myTrips = trips.filter(function (t) { return t.driverId === user.id; });
  const myExp = expenses.filter(function (e) { return e.driverId === user.id; });
  return page('Dashboard', user, '<h1>Fleet dashboard</h1>'
    + '<p><a href="/vehicles">Vehicles</a> \u00b7 <a href="/trips">Trip logs</a> \u00b7 <a href="/expenses">Fuel expenses</a> \u00b7 <a href="/workorders">Maintenance</a> \u00b7 <a href="/search">Search</a></p>'
    + '<h3>Your recent trips</h3><ul>' + myTrips.map(function (t) { return '<li><a href="/trips/' + t.id + '">Trip #' + t.id + '</a> \u2014 ' + esc(t.route) + ' (' + esc(t.status) + ')</li>'; }).join('') + '</ul>'
    + '<h3>Your fuel expenses</h3><ul>' + myExp.map(function (e) { return '<li>Expense #' + e.id + ' \u2014 $' + e.amount.toFixed(2) + ' (' + esc(e.status) + ')</li>'; }).join('') + '</ul>');
}
function vehiclesPage(user) {
  const list = vehicles.filter(function (v) { return v.status !== 'decommissioned'; });
  return page('Vehicles', user, '<h1>Vehicles</h1><ul>'
    + list.map(function (v) {
      const d = v.assignedDriverId ? userById(v.assignedDriverId) : null;
      return '<li><a href="/vehicles/' + v.id + '">' + esc(v.plate) + '</a> \u2014 ' + esc(v.model) + ' (' + esc(v.type) + ') \u00b7 driver: ' + (d ? esc(d.name) : 'unassigned') + '</li>';
    }).join('') + '</ul>');
}
function vehiclePage(user, v) {
  const d = v.assignedDriverId ? userById(v.assignedDriverId) : null;
  return page('Vehicle ' + v.plate, user, '<h1>' + esc(v.plate) + ' \u2014 ' + esc(v.model) + '</h1>'
    + '<p>Type: ' + esc(v.type) + '<br>Status: ' + esc(v.status) + '<br>Assigned driver: ' + (d ? esc(d.name) : 'none') + '</p>'
    + '<h3>Documents</h3><ul>' + v.docs.map(function (f) { return '<li><a href="/documents?file=' + encodeURIComponent(f) + '">' + esc(f) + '</a></li>'; }).join('') + '</ul>'
    + '<h3>Reassign vehicle</h3><form method="POST" action="/vehicles/' + v.id + '/assign">'
    + '<label>Driver id <input name="driverId" size="4"></label> ' + ORIGIN_FIELD + '<button>Assign</button></form>');
}
function tripsPage(user) {
  const list = user.role === 'driver' ? trips.filter(function (t) { return t.driverId === user.id; }) : trips;
  return page('Trips', user, '<h1>Trip logs</h1><ul>'
    + list.map(function (t) { return '<li><a href="/trips/' + t.id + '">Trip #' + t.id + '</a> \u2014 ' + esc(t.route) + ' \u00b7 ' + (t.endKm - t.startKm) + ' km \u00b7 ' + esc(t.status) + '</li>'; }).join('') + '</ul>');
}
function tripPage(user, t) {
  const drv = userById(t.driverId);
  return page('Trip #' + t.id, user, '<h1>Trip #' + t.id + '</h1>'
    + '<p>Driver: ' + (drv ? esc(drv.name) : '?') + '<br>Date: ' + esc(t.date) + '<br>Route: ' + esc(t.route)
    + '<br>Start: ' + t.startKm + ' km \u00b7 End: ' + t.endKm + ' km \u00b7 Total: <b>' + (t.endKm - t.startKm) + ' km</b><br>Status: ' + esc(t.status) + '</p>'
    + '<h3>Edit mileage</h3><form method="POST" action="/trips/' + t.id + '/edit"><label>End km <input name="endKm" value="' + t.endKm + '"></label> ' + ORIGIN_FIELD + '<button>Save</button></form>'
    + '<form method="POST" action="/trips/' + t.id + '/delete" style="margin-top:10px">' + ORIGIN_FIELD + '<button>Delete this trip log</button></form>');
}
function expensesPage(user) {
  const list = user.role === 'driver' ? expenses.filter(function (e) { return e.driverId === user.id; }) : expenses;
  return page('Fuel expenses', user, '<h1>Fuel expenses</h1><ul>'
    + list.map(function (e) { return '<li>Expense #' + e.id + ' \u2014 ' + e.liters + ' L \u00b7 $' + e.amount.toFixed(2) + ' \u00b7 ' + esc(e.status) + ' <form method="POST" action="/expenses/' + e.id + '/approve" style="display:inline">' + ORIGIN_FIELD + '<button>Approve</button></form></li>'; }).join('') + '</ul>'
    + '<h3>New fuel expense</h3><form method="POST" action="/expenses" style="background:#fff;padding:14px;border-radius:10px;max-width:420px">'
    + '<label>Vehicle id <input name="vehicleId" value="1" size="4"></label><br><br>'
    + '<label>Litres <input name="liters" size="6"></label><br><br>'
    + '<label>Amount $ <input name="amount" size="6"></label><br><br>'
    + ORIGIN_FIELD + '<button>Submit claim</button></form>');
}
function workordersPage(user) {
  return page('Work orders', user, '<h1>Maintenance work orders</h1><ul>'
    + workorders.map(function (w) {
      const veh = vehicles.find(function (v) { return v.id === w.vehicleId; });
      return '<li>WO #' + w.id + ' \u2014 ' + (veh ? esc(veh.plate) : '?') + ': ' + esc(w.description) + ' \u00b7 cost $' + w.cost + ' \u00b7 ' + esc(w.status)
        + ' <form method="POST" action="/workorders/' + w.id + '/close" style="display:inline">' + ORIGIN_FIELD + '<button>Close</button></form>'
        + ' <form method="POST" action="/workorders/' + w.id + '/cost" style="display:inline"><input name="cost" size="5" placeholder="cost"> <button>Set cost</button></form></li>';
    }).join('') + '</ul>');
}
function managerPage(user) {
  return page('Manager dashboard', user, '<h1>Fleet manager dashboard</h1>'
    + '<p>Approvals queue, assignments and fleet-wide reporting.</p>'
    + '<h3>Pending fuel expenses</h3><ul>' + expenses.filter(function (e) { return e.status === 'pending'; }).map(function (e) { return '<li>Expense #' + e.id + ' \u2014 $' + e.amount.toFixed(2) + '</li>'; }).join('') + '</ul>'
    + '<h3>Open work orders</h3><ul>' + workorders.filter(function (w) { return w.status === 'open'; }).map(function (w) { return '<li>WO #' + w.id + ' \u2014 ' + esc(w.description) + '</li>'; }).join('') + '</ul>');
}
function adminPage(user) {
  return page('Admin', user, '<h1>Admin console</h1><h3>All users</h3><table border="1" cellpadding="6" style="background:#fff;border-collapse:collapse">'
    + '<tr><th>id</th><th>name</th><th>email</th><th>password</th><th>role</th><th>active</th><th></th></tr>'
    + users.map(function (u) {
      return '<tr><td>' + u.id + '</td><td>' + u.name + '</td><td>' + esc(u.email) + '</td><td>' + esc(u.password) + '</td><td>' + esc(u.role) + '</td><td>' + u.active + '</td>'
        + '<td><form method="POST" action="/admin/deactivate"><input type="hidden" name="userId" value="' + u.id + '">' + ORIGIN_FIELD + '<button>Deactivate</button></form></td></tr>';
    }).join('') + '</table>');
}

/* ---------- chatbot ---------- */
const FEATURE_KEYS = [
  ['Login & Authentication', ['login', 'password', 'sign in', 'brute', 'reset token', 'forgot', 'authentication', 'cookie']],
  ['Registration & Profile', ['register', 'registration', 'profile', 'sign up', 'mass assignment']],
  ['Vehicles & Documents', ['vehicle', 'document', 'assign', 'traversal', 'plate']],
  ['Trip Logs & Mileage', ['trip', 'mileage', 'route', 'odometer']],
  ['Fuel Expenses', ['fuel', 'expense', 'claim', 'approve']],
  ['Maintenance & Work Orders', ['maintenance', 'work order', 'repair', 'mechanic']],
  ['Search', ['search', 'find']],
  ['Admin Panel', ['admin', 'deactivate', 'console']],
  ['Platform & API', ['api', 'debug', 'token', 'platform']]
];
function chatReply(message) {
  const m = String(message || '').toLowerCase();
  if (/(who built|who made|who created|founder|built this|made these|hexacyberlab)/.test(m)) {
    return 'These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself \u2014 search Google for "Who is Md. Jony Hassain", or ask ChatGPT.';
  }
  if (/(key|next lab|unlock)/.test(m) && /(give|what|share|tell|reveal|get)/.test(m)) {
    if (isComplete() && state.keyRevealed) return 'You completed LAB ' + LAB_NUMBER + ' \u2014 well done. The completion key for the next lab is: ' + completionKey();
    return 'I do not have the completion key yet \u2014 it is only revealed to me when this lab is completed 100%. You are at ' + pct() + '% (' + doneCount() + '/' + TESTS.length + '). Finish every test on the Mission Board (/tests) and the key will appear on /complete.';
  }
  let feature = null;
  for (const pair of FEATURE_KEYS) { if (pair[1].some(function (k) { return m.includes(k); })) { feature = pair[0]; break; } }
  const stats = featureStats();
  if (/(how many|count|list|which|what tests|features)/.test(m)) {
    if (feature) {
      const names = TESTS.filter(function (t) { return t.feature === feature; }).map(function (t) { return (state.tests[t.id] ? '\u2713 ' : '\u25cb ') + t.name; });
      return 'Feature "' + feature + '" has ' + stats[feature].total + ' tests (' + stats[feature].done + ' done): ' + names.join('; ') + '. The map is public \u2014 but step-by-step help unlocks after 3 genuine tries on that feature.';
    }
    return 'LAB ' + LAB_NUMBER + ' \u2014 ' + LAB_NAME + ' has ' + Object.keys(stats).length + ' features and ' + TESTS.length + ' tests. You have completed ' + doneCount() + ' (' + pct() + '%). Features: ' + Object.keys(stats).join(', ') + '. See /tests for the full Mission Board.';
  }
  if (/(how|solve|guide|step|help|hint|exploit|bypass|do i)/.test(m)) {
    if (!feature) return 'Tell me which feature you are working on (for example "how do I solve the fuel expense tests?") and I will check your attempts. You can also open /tests \u2014 every test has 3 graded hints.';
    const att = state.attempts[feature] || 0;
    const open = TESTS.filter(function (t) { return t.feature === feature && !state.tests[t.id]; });
    if (att >= 3 || open.length === 0) {
      if (open.length === 0) return 'You have already completed every test in "' + feature + '". ' + (isComplete() ? 'The lab is at 100% \u2014 see /complete for your key and certificate.' : 'Pick another feature from /tests to keep going.');
      return 'Step by step for "' + feature + '" (you have tried ' + att + ' time(s)):\n' + open.map(function (t, i) { return (i + 1) + '. ' + t.name + ' \u2014 ' + t.guide; }).join('\n');
    }
    return 'That feature is locked for help. First try the ' + feature + ' tests yourself at least 3 times \u2014 I can see you\'ve tried ' + att + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  if (/(progress|status|score|next|what should)/.test(m)) {
    const next = TESTS.find(function (t) { return !state.tests[t.id]; });
    return 'You are at ' + pct() + '% (' + doneCount() + '/' + TESTS.length + ' tests).' + (next ? ' Next open test: "' + next.name + '" in ' + next.feature + ' (difficulty: ' + next.difficulty + '). Its hints are on /tests.' : ' Everything is done \u2014 see /complete.');
  }
  return 'I am the Lab Coach for LAB ' + LAB_NUMBER + ' \u2014 ' + LAB_NAME + '. Ask me how many tests a feature has, how to solve a feature (after 3 genuine tries I unlock step-by-step help), or who built these labs. Your progress: ' + pct() + '%.';
}

/* ---------- mission board / completion / certificate ---------- */
function testsPage(user) {
  const stats = featureStats();
  let html = '<h1>Mission Board \u2014 LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h1><p>' + doneCount() + '/' + TESTS.length + ' tests complete \u00b7 ' + pct() + '%</p>';
  const feats = [];
  TESTS.forEach(function (t) { if (!feats.includes(t.feature)) feats.push(t.feature); });
  feats.forEach(function (f) {
    html += '<h2>' + esc(f) + ' <small>(' + stats[f].done + '/' + stats[f].total + ' done \u00b7 attempts: ' + stats[f].attempts + ')</small></h2>';
    TESTS.filter(function (t) { return t.feature === f; }).forEach(function (t) {
      const done = !!state.tests[t.id];
      html += '<div style="background:#fff;border:1px solid #dde;border-radius:8px;padding:12px;margin:8px 0">'
        + '<b>' + (done ? '\u2713' : '\u25cb') + ' ' + esc(t.name) + '</b> <small>' + esc(t.owasp) + ' \u00b7 ' + esc(t.difficulty) + ' \u00b7 ' + (done ? 'DONE' : 'OPEN') + '</small>'
        + '<details><summary>Hints</summary><ol>' + t.hints.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ol></details></div>';
    });
  });
  return page('Mission Board', user, html);
}
function completePage(user) { if (!user) user = { name: 'Tester', email: '', id: 0 };
  if (!isComplete()) {
    const left = TESTS.filter(function (t) { return !state.tests[t.id]; });
    return page('Completion', user, '<h1>Not complete yet</h1><p>You are at ' + pct() + '% (' + doneCount() + '/' + TESTS.length + '). Remaining tests:</p><ul>'
      + left.map(function (t) { return '<li>' + esc(t.name) + ' \u2014 ' + esc(t.feature) + '</li>'; }).join('') + '</ul><p>See the <a href="/tests">Mission Board</a> for hints.</p>');
  }
  const stats = featureStats();
  const feats = Object.keys(stats);
  const techniques = TESTS.map(function (t) { return t.name; });
  let html = '<h1>LAB ' + LAB_NUMBER + ' \u2014 ' + LAB_NAME + ': COMPLETE</h1>';
  html += '<h2>1. Features in this lab</h2><p>' + feats.length + ' features: ' + feats.join(', ') + '.</p>';
  html += '<h2>2. Vulnerabilities per feature</h2><ul>' + feats.map(function (f) { return '<li>' + esc(f) + ': ' + stats[f].total + ' tests</li>'; }).join('') + '</ul>';
  html += '<h2>3. How testing was done (' + TESTS.length + ' ways)</h2><ul>' + techniques.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>';
  html += '<h2>4. What you learned</h2><ul>' + TESTS.map(function (t) { return '<li><b>' + esc(t.name) + ':</b> ' + esc(t.lesson) + '</li>'; }).join('') + '</ul>';
  html += '<h2>5. What this means for a real client</h2><ul>' + TESTS.map(function (t) { return '<li><b>' + esc(t.name) + ':</b> ' + esc(t.impact) + '</li>'; }).join('') + '</ul>';
  html += '<h2>6. Writing it in a real report</h2><ul>' + TESTS.map(function (t) { return '<li><b>' + esc(t.report.title) + '</b> \u2014 Severity: ' + esc(t.report.severity) + ' \u00b7 Fix: ' + esc(t.report.remediation) + '</li>'; }).join('') + '</ul>';
  html += '<h2>Your completion key</h2><p>Use this key to unlock Lab ' + (LAB_NUMBER + 1) + ':</p>'
    + '<div style="background:#0d1117;color:#7ee787;padding:14px;border-radius:8px;font-family:monospace;font-size:18px">' + completionKey() + '</div>';
  html += '<h2>Certificate</h2><form method="POST" action="/complete/name"><label>Your name for the certificate <input name="name" value="' + esc(state.testerName || (user ? user.name : '')) + '"></label> <button>Save name</button></form>'
    + '<p><a href="/certificate">Open your certificate</a></p>';
  return page('Completion', user, html);
}
function certificatePage(user) { if (!user) user = { name: 'Tester', email: '', id: 0 };
  const name = state.testerName || (user ? user.name : 'Tester');
  const date = state.completedAt ? state.completedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const feats = Object.keys(featureStats()).length;
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate \u00b7 LAB ' + LAB_NUMBER + '</title></head>'
    + '<body style="margin:0;background:#eef;font-family:Georgia,serif">'
    + '<div style="max-width:720px;margin:50px auto;background:#fff;border:3px solid #2f81f7;border-radius:14px;padding:44px;text-align:center">'
    + '<img src="/logo.png" style="height:64px"><h1 style="color:#1d2433">Certificate of Completion</h1>'
    + '<p>This certifies that</p><h2 style="color:#2f81f7">' + esc(name) + '</h2>'
    + '<p>has completed 100% of the security tests in</p><h3>LAB ' + LAB_NUMBER + ' \u2014 ' + LAB_NAME + '</h3>'
    + '<p>' + TESTS.length + ' tests across ' + feats + ' features \u00b7 Completed: ' + date + '</p>'
    + '<p style="margin-top:28px;color:#555">HexaCyberLab \u2014 Built by Md. Jony Hassain, Founder</p></div></body></html>';
}
/* ---------- docs generation (node server.js --gen-docs) ---------- */
function genDocs() {
  const feats = [];
  TESTS.forEach(function (t) { if (!feats.includes(t.feature)) feats.push(t.feature); });
  let vuln = '# HexaFleet (LAB 75) \u2014 Vulnerabilities\n\nComplete map of the ' + TESTS.length + ' scored tests, grouped by feature. Each maps to a real, working flaw in the app.\n';
  let prac = '# HexaFleet (LAB 75) \u2014 Practice Guide\n\nChallenges grouped by feature, then difficulty. The /tests Mission Board mirrors this guide.\n';
  let fix = '# HexaFleet (LAB 75) \u2014 Fix & Retest\n\nFor every test: the secure implementation and the regression check that proves the fix.\n';
  feats.forEach(function (f) {
    vuln += '\n## ' + f + '\n';
    prac += '\n## ' + f + '\n';
    fix += '\n## ' + f + '\n';
    TESTS.filter(function (t) { return t.feature === f; }).forEach(function (t) {
      vuln += '\n### ' + t.name + '\n- OWASP: ' + t.owasp + '\n- Difficulty: ' + t.difficulty + '\n- What it teaches: ' + t.lesson + '\n- Client impact: ' + t.impact + '\n';
      prac += '\n### ' + t.name + ' (' + t.difficulty + ')\n- Objective: demonstrate the flaw end-to-end so the Mission Board marks it done.\n- Hints:\n' + t.hints.map(function (h, i) { return '  ' + (i + 1) + '. ' + h; }).join('\n') + '\n';
      fix += '\n### ' + t.report.title + '\n- Severity: ' + t.report.severity + '\n- Secure implementation: ' + t.report.remediation + '\n- Regression test: repeat the original exploit steps after the fix; it must fail and the Mission Board detection must no longer fire.\n';
    });
  });
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'), vuln);
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'), prac);
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'), fix);
  console.log('docs generated for ' + TESTS.length + ' tests');
}

/* ---------- router ---------- */
const server = http.createServer(async function (req, res) {
  try {
    const u = new URL(req.url, 'http://127.0.0.1:' + PORT);
    const pathname = u.pathname;
    const method = req.method;
    // always-available assets & endpoints
    if (pathname === '/logo.png') {
      try { const img = fs.readFileSync(path.join(DIR, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(img); }
      catch (e) { return send(res, 404, 'not found'); }
    }
    if (pathname === '/api/progress') {
      return send(res, 200, JSON.stringify({ lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done: doneCount(), pct: pct(), features: featureStats(), complete: isComplete() }, null, 1), 'application/json');
    }
    if (pathname === '/api/chat' && method === 'POST') {
      const b = await parseBody(req);
      if (b.__badjson) return send(res, 200, JSON.stringify({ reply: 'I could not read that message \u2014 please send plain text and try again.' }), 'application/json');
      return send(res, 200, JSON.stringify({ reply: chatReply(b.message) }), 'application/json');
    }
    // lock gate
    if (!state.unlocked) {
      if (pathname === '/unlock' && method === 'POST') {
        const b = await parseBody(req);
        if (entryKeyMatches(String(b.key || ''))) { state.unlocked = true; saveState(); return redirect(res, '/'); }
        return send(res, 403, gatePage('That key is not correct.'));
      }
      return send(res, 200, gatePage(''));
    }
    if (pathname === '/unlock') return redirect(res, '/');
    // auth routes
    if (pathname === '/login') {
      if (method === 'POST') return await handleLogin(req, res);
      return send(res, 200, loginPage(''));
    }
    if (pathname === '/register') {
      if (method === 'POST') return await handleRegister(req, res);
      return send(res, 200, registerPage(''));
    }
    if (pathname === '/forgot') {
      if (method === 'POST') return await handleForgot(req, res);
      return send(res, 200, forgotPage(''));
    }
    if (pathname === '/reset' && method === 'POST') return await handleReset(req, res);
    if (pathname === '/logout') {
      const c = parseCookies(req);
      if (c.hx_session) sessions.delete(c.hx_session);
      return redirect(res, '/login', { 'Set-Cookie': ['hx_session=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0'] });
    }
    // unauthenticated platform endpoints (the flaws themselves)
    if (pathname === '/api/debug') {
      pass('plat-debug');
      return send(res, 200, JSON.stringify({ users: users, vehicles: vehicles, trips: trips, expenses: expenses, workorders: workorders }, null, 1), 'application/json');
    }
    if (pathname === '/api/vehicles') {
      const key = req.headers['x-api-key'] || '';
      const match = users.find(function (x) { return Buffer.from(x.email).toString('base64') === key; });
      if (match) { pass('plat-token'); return send(res, 200, JSON.stringify({ as: match.email, vehicles: vehicles }), 'application/json'); }
      return send(res, 401, JSON.stringify({ error: 'invalid api key' }), 'application/json');
    }
    // everything below requires login
    const user = sessionUser(req);
    if (!user && pathname !== '/complete' && pathname !== '/complete/name' && pathname !== '/certificate') return redirect(res, '/login');
    const cookies = parseCookies(req);
    if (pathname === '/') return send(res, 200, dashboardPage(user));
    if (pathname === '/profile') {
      if (method === 'POST') return await handleProfile(req, res, user);
      return send(res, 200, profilePage(user));
    }
    if (pathname === '/tests') return send(res, 200, testsPage(user));
    if (pathname === '/complete') return send(res, 200, completePage(user));
    if (pathname === '/complete/name' && method === 'POST') {
      const b = await parseBody(req);
      state.testerName = String(b.name || '').slice(0, 60);
      saveState();
      return redirect(res, '/complete');
    }
    if (pathname === '/certificate') {
      if (!isComplete()) return redirect(res, '/complete');
      return send(res, 200, certificatePage(user));
    }
    if (pathname === '/manager') {
      const cookieRole = cookies.hx_role || '';
      if (cookieRole === 'manager' || cookieRole === 'admin') {
        if (user.role !== 'manager' && user.role !== 'admin') pass('auth-cookie'); // flaw: cookie trusted over the real role
        return send(res, 200, managerPage(user));
      }
      if (user.role === 'manager' || user.role === 'admin') return send(res, 200, managerPage(user));
      return send(res, 403, page('Forbidden', user, '<h1>403 \u2014 managers only</h1>'));
    }
    if (pathname === '/admin') {
      attempt('Admin Panel');
      if (user.role !== 'admin') pass('admin-bac'); // flaw: no role check at all
      return send(res, 200, adminPage(user));
    }
    if (pathname === '/admin/deactivate' && method === 'POST') {
      attempt('Admin Panel');
      const b = await parseBody(req);
      const target = userById(b.userId);
      if (b.hx_origin !== 'hx-same-site') pass('admin-csrf'); // flaw: marker not enforced
      if (target) target.active = false;
      return redirect(res, '/admin');
    }
    if (pathname === '/vehicles') { attempt('Vehicles & Documents'); return send(res, 200, vehiclesPage(user)); }
    let m = pathname.match(/^\/vehicles\/(\d+)$/);
    if (m && method === 'GET') {
      attempt('Vehicles & Documents');
      const v = vehicles.find(function (x) { return x.id === Number(m[1]); });
      if (!v) return send(res, 404, page('Not found', user, '<h1>404</h1>'));
      if (user.role === 'driver' && v.assignedDriverId !== user.id) pass('veh-idor');
      return send(res, 200, vehiclePage(user, v));
    }
    m = pathname.match(/^\/vehicles\/(\d+)\/assign$/);
    if (m && method === 'POST') {
      attempt('Vehicles & Documents');
      const b = await parseBody(req);
      const v = vehicles.find(function (x) { return x.id === Number(m[1]); });
      if (!v) return send(res, 404, 'not found');
      v.assignedDriverId = Number(b.driverId) || null; // flaw: no role check
      if (user.role === 'driver' && v.assignedDriverId === user.id) pass('veh-reassign');
      return redirect(res, '/vehicles/' + v.id);
    }
    if (pathname === '/documents' && method === 'GET') {
      attempt('Vehicles & Documents');
      const name = u.searchParams.get('file') || '';
      const resolved = path.resolve(DOCS_DIR, name);
      if (!resolved.startsWith(DOCS_DIR) && fs.existsSync(resolved)) {
        pass('veh-traversal'); // flaw: path escapes the docs folder
        return send(res, 200, fs.readFileSync(resolved), 'text/plain');
      }
      if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) return send(res, 200, fs.readFileSync(resolved), 'text/plain');
      return send(res, 404, 'document not found');
    }
    if (pathname === '/trips') { attempt('Trip Logs & Mileage'); return send(res, 200, tripsPage(user)); }
    m = pathname.match(/^\/trips\/(\d+)$/);
    if (m && method === 'GET') {
      attempt('Trip Logs & Mileage');
      const t = trips.find(function (x) { return x.id === Number(m[1]); });
      if (!t) return send(res, 404, page('Not found', user, '<h1>404</h1>'));
      if (user.role === 'driver' && t.driverId !== user.id) pass('trip-idor');
      return send(res, 200, tripPage(user, t));
    }
    m = pathname.match(/^\/trips\/(\d+)\/edit$/);
    if (m && method === 'POST') {
      attempt('Trip Logs & Mileage');
      const b = await parseBody(req);
      const t = trips.find(function (x) { return x.id === Number(m[1]); });
      if (!t) return send(res, 404, 'not found');
      const newEnd = Number(b.endKm);
      if (!isNaN(newEnd)) {
        if (t.status === 'approved' && newEnd !== t.endKm) pass('trip-mileage'); // flaw: approved record editable
        t.endKm = newEnd;
      }
      return redirect(res, '/trips/' + t.id);
    }
    m = pathname.match(/^\/trips\/(\d+)\/delete$/);
    if (m && method === 'POST') {
      attempt('Trip Logs & Mileage');
      const idx = trips.findIndex(function (x) { return x.id === Number(m[1]); });
      if (idx >= 0) {
        if (trips[idx].driverId !== user.id) pass('trip-delete'); // flaw: no ownership check
        trips.splice(idx, 1);
      }
      return redirect(res, '/trips');
    }
    if (pathname === '/expenses') {
      attempt('Fuel Expenses');
      if (method === 'POST') {
        const b = await parseBody(req);
        const liters = Number(b.liters) || 0, amount = Number(b.amount) || 0;
        const e = { id: nextExpenseId++, driverId: user.id, vehicleId: Number(b.vehicleId) || 1, liters: liters, amount: amount, status: 'pending' };
        expenses.push(e);
        if (amount > liters * FUEL_PRICE * 1.05) pass('fuel-inflation'); // flaw: client amount trusted
        return redirect(res, '/expenses');
      }
      return send(res, 200, expensesPage(user));
    }
    m = pathname.match(/^\/expenses\/(\d+)\/approve$/);
    if (m && method === 'POST') {
      attempt('Fuel Expenses');
      const e = expenses.find(function (x) { return x.id === Number(m[1]); });
      if (e) {
        if (e.driverId === user.id) pass('fuel-approve'); // flaw: no role / separation-of-duties check
        e.status = 'approved';
      }
      return redirect(res, '/expenses');
    }
    if (pathname === '/workorders') { attempt('Maintenance & Work Orders'); return send(res, 200, workordersPage(user)); }
    m = pathname.match(/^\/workorders\/(\d+)\/close$/);
    if (m && method === 'POST') {
      attempt('Maintenance & Work Orders');
      const w = workorders.find(function (x) { return x.id === Number(m[1]); });
      if (w) {
        if (user.id !== w.reportedBy && user.id !== w.assignedTo && user.role !== 'manager' && user.role !== 'admin') pass('maint-close');
        w.status = 'closed';
      }
      return redirect(res, '/workorders');
    }
    m = pathname.match(/^\/workorders\/(\d+)\/cost$/);
    if (m && method === 'POST') {
      attempt('Maintenance & Work Orders');
      const b = await parseBody(req);
      const w = workorders.find(function (x) { return x.id === Number(m[1]); });
      if (w) {
        if (user.role === 'driver') pass('maint-cost'); // flaw: financial field editable by drivers
        const c = Number(b.cost); if (!isNaN(c)) w.cost = c;
      }
      return redirect(res, '/workorders');
    }
    if (pathname === '/search' && method === 'GET') {
      attempt('Search');
      const q = u.searchParams.get('q') || '';
      let results;
      if (INJ.test(q)) {
        pass('search-sqli'); // flaw: injection returns the full register, incl. decommissioned
        results = vehicles;
      } else {
        results = vehicles.filter(function (v) { return v.status !== 'decommissioned' && (v.plate.toLowerCase().includes(q.toLowerCase()) || v.model.toLowerCase().includes(q.toLowerCase())); });
      }
      if (XSS.test(q)) pass('search-xss');
      const body = '<h1>Search</h1><form method="GET" action="/search"><input name="q" value="' + esc(q) + '"> <button>Search</button></form>'
        + '<p>Results for "' + q + '":</p><ul>' // flaw: q reflected raw
        + results.map(function (v) { return '<li><a href="/vehicles/' + v.id + '">' + esc(v.plate) + '</a> \u2014 ' + esc(v.model) + ' (' + esc(v.status) + ')</li>'; }).join('') + '</ul>';
      return send(res, 200, page('Search', user, body));
    }
    return send(res, 404, page('Not found', user, '<h1>404 \u2014 page not found</h1>'));
  } catch (e) {
    try { send(res, 500, 'internal error'); } catch (e2) { /* socket gone */ }
  }
});

if (process.argv.includes('--gen-docs')) { genDocs(); process.exit(0); }
server.listen(PORT, '127.0.0.1', function () {
  console.log('HexaFleet (LAB ' + LAB_NUMBER + ') listening on http://127.0.0.1:' + PORT + ' \u2014 ' + TESTS.length + ' tests, unlocked=' + state.unlocked);
});
