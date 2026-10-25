'use strict';
/*
 * HexaIdentity — LAB 108 — HexaCyberLab vulnerable practice lab.
 * Category 11: Specialized & Advanced Business Systems.
 * A deliberately vulnerable digital identity portal: identity profiles,
 * simulated identity documents, a verification workflow, issued credentials,
 * linked services and account recovery.
 * Zero-dependency Node.js (built-ins only). Binds 127.0.0.1:3117.
 * LOCAL PRACTICE ONLY — all accounts, documents and data are generic fakes.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

const LAB_NUMBER = 108;
const LAB_NAME = 'HexaIdentity';
const LAB_CATEGORY = 'Specialized & Advanced Business Systems';
const PORT = 3117;
const ROOT = __dirname;
const STATE_FILE = path.join(ROOT, 'progress.json');
const FILES_DIR = path.join(ROOT, 'files');

/* ------------------------------------------------------------------ *
 * Key material — shard region 1 of 4 (entry key, first half).
 * Keys are never stored whole. Each key is split into 6 pieces; every
 * piece is transformed (base64 of the reversed piece) and the pieces
 * are scattered across separate regions of this file. A small
 * assembler rebuilds a key only at the moment it is needed.
 * ------------------------------------------------------------------ */


/* ================================================================== *
 * TESTS registry — one entry per scored vulnerability test.
 * A test flips to done ONLY when the server observes the real exploit
 * effect inside the vulnerable flow (never a self-declared checkbox).
 * ================================================================== */
const TESTS = [
  // ---------------- Login & Authentication (6) ----------------
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    where: 'POST /login (email field)', exploit: "Submit the login form with an email like ' OR '1'='1' -- and any password; the string-built query matches the first account (the admin) without knowing its password.",
    hints: ['The login query is built by gluing your input straight into a WHERE clause.', 'A single quote in the email field changes the meaning of the query.', "Try email: ' OR '1'='1' -- with any password — the comment swallows the password check."],
    lesson: 'String-built queries let attacker input rewrite the login logic itself; the password check never really happens.',
    impact: 'On a real client portal this is a full account takeover of the first matching account — usually an administrator — with no password at all.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries everywhere and never build SQL by concatenating user input.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute Force — No Login Throttling', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    where: 'POST /login', exploit: 'Send 10 or more wrong passwords for one real account; every attempt is processed normally — nothing slows down, locks or challenges you.',
    hints: ['Pick one real account and keep guessing its password.', 'Count the failures — does anything change after 5? After 10?', 'The flaw is proven when the 10th failure is still accepted for processing like the first.'],
    lesson: 'Without rate limiting or lockout, password guessing is free and unlimited — only password strength stands in the way.',
    impact: 'Attackers can grind through password lists against a real client\u2019s users until one account falls, then pivot from there.',
    report: { title: 'Missing Brute-Force Protection on Login', severity: 'High', remediation: 'Add per-account and per-IP rate limiting, progressive delays and lockout/alerting after repeated failures.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User Enumeration via Login & Recovery Responses', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    where: 'POST /login and POST /forgot', exploit: 'Probe at least 5 different emails across the login and forgot-password forms and compare the messages: real accounts and unknown emails get visibly different answers.',
    hints: ['Compare the exact wording for an email that exists vs one that does not.', 'Both the login form and the forgot-password form answer questions.', 'Probe 5+ distinct addresses and note which responses reveal account existence.'],
    lesson: 'Different error messages for "no such account" and "wrong password" hand attackers a free list of valid targets.',
    impact: 'Enumeration lets an attacker build a verified target list from a client\u2019s user base, fuelling phishing and credential stuffing.',
    report: { title: 'Account Enumeration Through Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message ("invalid credentials" / "if the account exists…") for every authentication outcome.' } },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Published Demo Admin Credentials', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    where: 'GET /login (help text on the page) and POST /login', exploit: 'Read the login page: the demo administrator credentials are printed on it. Sign in with them and you hold a full admin session.',
    hints: ['Everything you need is written on the login page itself.', 'Look for the "demo" note under the sign-in form.', 'Use the printed admin email and password exactly as shown.'],
    lesson: 'Demo and default credentials left visible (or unchanged) are an open door — attackers check them before anything clever.',
    impact: 'A published admin login gives an attacker instant full control of a client\u2019s identity portal, including every user\u2019s identity documents.',
    report: { title: 'Demo Administrator Credentials Published on Login Page', severity: 'Critical', remediation: 'Remove demo accounts and printed credentials from production; force unique strong passwords for all privileged accounts.' } },
  { id: 'auth-reset-token', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    where: 'POST /reset', exploit: 'Reset tokens follow a formula from the user id: HI<id>-<id\u00d7137+42>. Compute it for Bob (id 3) and reset his password without ever requesting an email.',
    hints: ['The reset endpoint accepts a token even when no reset was ever requested.', 'Tokens are derived from something public: the user id.', 'For user id 3 the token is HI3-453 — try the reset form with it.'],
    lesson: 'A reset token that can be computed from public data is not a secret at all — it is just an unlocked form field.',
    impact: 'Anyone can reset any user\u2019s password — including admins — and take over accounts on a real identity service at scale.',
    report: { title: 'Password Reset Tokens Are Predictable From the User ID', severity: 'Critical', remediation: 'Generate reset tokens from a CSPRNG (128+ bits), store only a hash, and expire them quickly.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Role Cookie Tampering (hx_role)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'GET /admin (role read from a client cookie)', exploit: 'Sign in as a normal user, then edit the hx_role cookie to "admin" and open /admin — the portal trusts the role your browser claims.',
    hints: ['After login, inspect the cookies the portal sets.', 'One cookie carries your role — and the server believes whatever it says.', 'Set hx_role=admin in your browser, then visit /admin.'],
    lesson: 'Authorization data stored on the client is attacker-controlled; roles must live server-side in the session.',
    impact: 'Any ordinary user can promote themselves to administrator and reach the verification queue and user management on a client\u2019s live system.',
    report: { title: 'Privilege Escalation via Client-Controlled Role Cookie', severity: 'High', remediation: 'Store roles only in the server-side session; never trust role claims from cookies or form fields.' } },

  // ---------------- Registration & Profile (4) ----------------
  { id: 'reg-weakpass', feature: 'Registration & Profile', name: 'Weak Password Policy — 1-Character Passwords Accepted', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    where: 'POST /register', exploit: 'Register a new account with a password of a single character; the portal accepts it and creates the account.',
    hints: ['Try registering with the shortest password you can think of.', 'There is no minimum length check at all.', 'A one-character password like "x" is enough to create a working account.'],
    lesson: 'A password policy that accepts anything trains users into credentials that fall to the first guessing attempt.',
    impact: 'Weak user passwords on a client identity portal make every other account-takeover technique faster and cheaper.',
    report: { title: 'No Minimum Password Strength Enforced at Registration', severity: 'Medium', remediation: 'Enforce a minimum length of 10–12 characters and screen against known-breached password lists.' } },
  { id: 'reg-massassign', feature: 'Registration & Profile', name: 'Mass Assignment — Role & Verified Status at Registration', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /register', exploit: 'Add extra fields to the registration request — role=admin and status=verified. The portal copies them onto the new account, creating a pre-verified administrator.',
    hints: ['The registration handler copies more of your request than the form shows.', 'What fields does a user record have that the form never asks for?', 'Submit the form again with role=admin and status=verified added as extra fields.'],
    lesson: 'Binding request bodies straight onto records lets attackers set privileged fields the UI never offered.',
    impact: 'An attacker can mint verified admin accounts on a client\u2019s identity platform in one request — total compromise without touching the login form.',
    report: { title: 'Mass Assignment Allows Setting Role and Verification Status at Registration', severity: 'Critical', remediation: 'Whitelist bindable fields per endpoint; set role and verification status only through server-side workflows.' } },
  { id: 'reg-storedxss', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    where: 'POST /register (name field, rendered in admin and profile views)', exploit: 'Register with a display name containing a script payload; the name is stored raw and rendered unescaped to other users and admins.',
    hints: ['Names are displayed back to other people in several places.', 'Nothing encodes HTML in the name field.', 'Register with a name like <script>alert(1)</script> and view the admin user list or member profile.'],
    lesson: 'Any stored field that is rendered without encoding becomes a delivery vehicle into other users\u2019 browsers — including admins.',
    impact: 'Stored XSS in an identity portal can hijack staff sessions, letting an attacker approve their own identity or export user records.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-encode all user-supplied output and validate names against an allowlist of characters.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /profile/update', exploit: 'Submit a profile update with no hx_origin marker (as a cross-site form would): the change is accepted, proving no anti-CSRF token protects the endpoint.',
    hints: ['The portal sets a benign hx_origin cookie on its own pages — its own forms travel with it.', 'A request that arrives WITHOUT that marker did not come from the portal\u2019s pages.', 'POST to /profile/update with only your session cookie and no hx_origin cookie: the change still lands.'],
    lesson: 'State-changing endpoints without CSRF tokens can be fired from any website a logged-in user visits.',
    impact: 'A malicious page could silently rewrite a victim\u2019s identity profile details on a client portal while they browse.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require a per-session CSRF token on every state-changing request and validate Origin/Referer as defence in depth.' } },

  // ---------------- Identity Profiles & Documents (3) ----------------
  { id: 'idor-profile', feature: 'Identity Profiles & Documents', name: 'IDOR — Full Identity Record of Another User', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'GET /identity/:id', exploit: 'While signed in as one user, open another user\u2019s identity record by changing the id (e.g. /identity/3): full name, date of birth and identity number are served with no ownership check.',
    hints: ['Identity records live at predictable numeric URLs.', 'The server checks that you are logged in — but not whose record you asked for.', 'Change the id in /identity/:id to another user\u2019s and read their full record.'],
    lesson: 'Checking "is someone logged in" is not authorization; every object access must verify ownership.',
    impact: 'An attacker can harvest every customer\u2019s identity number and date of birth from a client portal — prime material for identity fraud.',
    report: { title: 'Insecure Direct Object Reference Exposes Full Identity Records', severity: 'High', remediation: 'Enforce per-object authorization: a user may only read identity records they own (or staff with a business need).' } },
  { id: 'doc-upload', feature: 'Identity Profiles & Documents', name: 'Unrestricted Document Upload — HTML Served Back', owasp: 'A08:2021 Software and Data Integrity Failures', difficulty: 'Intermediate',
    where: 'POST /documents/upload and GET /uploads/:name', exploit: 'Upload a "document" named evil.html containing a script payload; the portal stores it and serves it back as text/html from its own origin.',
    hints: ['The document upload accepts any filename and any content.', 'What matters is the extension you choose and how the file is served back.', 'Upload evil.html with a script inside, then open /uploads/evil.html.'],
    lesson: 'An upload feature that stores and serves active content turns the trusted domain into an XSS host.',
    impact: 'Attackers can host phishing and script payloads under a client\u2019s real domain, defeating user trust and content policies.',
    report: { title: 'Unrestricted File Upload Allows Stored HTML/JS on the Portal Origin', severity: 'High', remediation: 'Allowlist document types, verify content server-side, store uploads outside the web root and serve with Content-Disposition: attachment.' } },
  { id: 'doc-traversal', feature: 'Identity Profiles & Documents', name: 'Path Traversal on Document Download', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'GET /download?file=', exploit: 'Ask the document download endpoint for ../server.js: the filename is joined to the documents folder without sanitising, so files outside it are read and returned.',
    hints: ['The download endpoint takes a filename and reads it from the documents folder.', 'Nothing stops the filename from walking up directories.', 'Try /download?file=../server.js and read the application source.'],
    lesson: 'User-controlled file paths must be normalised and confined; ".." is the oldest key in the building.',
    impact: 'Source code, configuration and credential files can leak from a client server, turning one bug into a full compromise.',
    report: { title: 'Path Traversal in Document Download Exposes Arbitrary Files', severity: 'High', remediation: 'Resolve the requested path, verify it stays inside the documents directory, and serve files by opaque IDs instead of names.' } },

  // ---------------- Verification Workflow (3) ----------------
  { id: 'verify-self', feature: 'Verification Workflow', name: 'Self-Verification Through the Verifier Endpoint', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /verify/approve', exploit: 'The approval endpoint — meant for verification staff — checks only that you are signed in. As a regular user with a pending identity, approve your own record and become "verified" with no review.',
    hints: ['Approval is a POST the staff UI sends — but the endpoint itself never checks your role.', 'Your own identity is pending; its user id is yours.', 'POST to /verify/approve with your own userId and watch your status change to verified.'],
    lesson: 'A workflow step is only real if the server enforces who may perform it; a hidden button is not a control.',
    impact: 'On a real identity service this defeats KYC entirely — anyone can mark themselves verified and use that trust to defraud others.',
    report: { title: 'Missing Role Check Lets Users Approve Their Own Identity Verification', severity: 'Critical', remediation: 'Enforce verifier/admin role server-side on every workflow transition and log approvals for audit.' } },
  { id: 'verify-status', feature: 'Verification Workflow', name: 'Verification Status Tampering via Client-Supplied Status', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'POST /identity/status', exploit: 'The status endpoint trusts a status value sent by the client. POST status=verified for your own account and the portal records you as verified — no documents, no review.',
    hints: ['There is an endpoint that updates identity status — and it believes the caller.', 'Your verification status is just a field; who is allowed to write it?', 'POST to /identity/status with status=verified while signed in as an unverified user.'],
    lesson: 'Business-critical state must transition only through server-controlled workflow steps, never from raw client input.',
    impact: 'Attackers gain "verified" trust instantly on a client platform, unlocking features and credibility reserved for checked identities.',
    report: { title: 'Client-Supplied Verification Status Accepted Without Review', severity: 'High', remediation: 'Remove client control of status fields; derive status exclusively from the server-side verification workflow.' } },
  { id: 'verify-queue', feature: 'Verification Workflow', name: 'Verification Queue Leaks Applicant PII to Regular Users', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'GET /verify/queue', exploit: 'Open the staff verification queue as a regular user: a route-ordering bug serves the page — with every pending applicant\u2019s email, identity number and document — to anyone signed in.',
    hints: ['Staff pages are not always protected just because they are staff pages.', 'The queue URL is guessable: /verify/queue.', 'Sign in as a normal user and open /verify/queue directly.'],
    lesson: 'Every route needs its own authorization check; one misplaced route exposes the most sensitive list in the system.',
    impact: 'Applicants\u2019 identity documents and numbers leak to any registered user — a reportable data breach for a real client.',
    report: { title: 'Verification Queue Accessible to Non-Verifier Users (PII Exposure)', severity: 'High', remediation: 'Apply role middleware to the whole /verify route group and test authorization per route, not per page.' } },

  // ---------------- Credentials & Badges (2) ----------------
  { id: 'cred-forge', feature: 'Credentials & Badges', name: 'Forged Credential Issuance — Government-Verified Badge', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /credentials/issue', exploit: 'The self-service issuance endpoint is meant to mint only the basic badge, but it accepts any credential type: ask for type=gov-verified and the portal issues you a government-verified credential.',
    hints: ['Self-service issuance trusts the requested credential type.', 'The basic badge is free for everyone; the valuable types should require a workflow.', 'POST to /credentials/issue with type=gov-verified and check your credentials page.'],
    lesson: 'If the client chooses the privilege level of what the server issues, issuance is not a control — it is a vending machine.',
    impact: 'Forged "government verified" credentials on a real platform can be used to scam users and partner services that trust the badge.',
    report: { title: 'Users Can Issue Themselves High-Assurance Credentials', severity: 'High', remediation: 'Bind credential type to completed server-side verification steps; never accept the assurance level from the client.' } },
  { id: 'cred-idor', feature: 'Credentials & Badges', name: 'Credential IDOR — Another User\u2019s Credential', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'GET /credential/:id', exploit: 'Open another user\u2019s credential by id (e.g. /credential/1): its type, number and owner are shown with no ownership check.',
    hints: ['Credentials have their own numeric URLs.', 'Ownership is never compared with the session.', 'Change the id in /credential/:id to read a credential that is not yours.'],
    lesson: 'Sequential IDs plus missing ownership checks expose every issued credential in the system.',
    impact: 'Leaked credential numbers let attackers clone or reference real users\u2019 verified credentials in fraud against a client\u2019s partners.',
    report: { title: 'Insecure Direct Object Reference on Credential Records', severity: 'Medium', remediation: 'Check credential ownership (or staff role) on every credential read and use non-sequential public identifiers.' } },

  // ---------------- Linked Services (2) ----------------
  { id: 'link-idor', feature: 'Linked Services', name: 'Linked Services IDOR — Service Tokens Exposed', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'GET /services/user/:userId', exploit: 'Open /services/user/3 while signed in as someone else: Bob\u2019s linked services are listed together with their secret service tokens.',
    hints: ['Linked services can be listed per user id.', 'The response includes more than service names.', 'Visit /services/user/<another id> and read their service tokens.'],
    lesson: 'Tokens are credentials; any endpoint that prints them to non-owners is a credential leak.',
    impact: 'Stolen service tokens let attackers act inside a victim\u2019s linked bank/government services under a client\u2019s identity product.',
    report: { title: 'Linked-Service Tokens Exposed via IDOR', severity: 'High', remediation: 'Restrict linked-service views to the owner, and never return raw tokens to the client after linking.' } },
  { id: 'link-unlink', feature: 'Linked Services', name: 'Unlink Another User\u2019s Service', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /services/unlink', exploit: 'Submit the unlink action with another user\u2019s link id: the portal removes their linked service without checking that it belongs to you.',
    hints: ['Unlinking takes a link id — whose links can you name?', 'The handler deletes by id alone.', 'POST to /services/unlink with the linkId of a service owned by another user.'],
    lesson: 'Destructive actions need the same ownership checks as reads; delete endpoints are a favourite sabotage target.',
    impact: 'Attackers can disconnect victims from their linked services — locking them out of banking or government flows tied to a client\u2019s portal.',
    report: { title: 'Missing Ownership Check on Service Unlink (Cross-User Sabotage)', severity: 'Medium', remediation: 'Verify the link belongs to the session user before unlinking, and require re-authentication for destructive actions.' } },

  // ---------------- Account Recovery (2) ----------------
  { id: 'rec-question', feature: 'Account Recovery', name: 'Password Recovery via Publicly Visible Security Answer', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    where: 'POST /recover (answer shown on GET /profile/:id)', exploit: 'Recovery asks for the user\u2019s hometown — which the portal prints on the public member profile. Read Bob\u2019s profile, then reset his password through the recovery form.',
    hints: ['The recovery question\u2019s answer is not secret — the portal publishes it.', 'Check what a member\u2019s public profile says about where they are from.', 'Use the hometown from /profile/3 as the recovery answer for Bob\u2019s account.'],
    lesson: 'A recovery factor is only as strong as its secrecy; answers drawn from public profile data protect nothing.',
    impact: 'Anyone can reset the password of any user whose profile they can read — silent, complete account takeover on a client service.',
    report: { title: 'Account Recovery Relies on a Publicly Visible Security Answer', severity: 'High', remediation: 'Drop knowledge-based recovery; use single-use, expiring reset links sent to the verified email on file.' } },
  { id: 'rec-reuse', feature: 'Account Recovery', name: 'Reset Token Reuse — Tokens Never Invalidate After Use', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    where: 'POST /forgot then POST /reset twice with the same issued token', exploit: 'Request a reset token for your own account (the simulated email shows it), use it to set a new password — then use the SAME token again to set another. It still works.',
    hints: ['Get a legitimate reset token from the forgot-password flow first.', 'Use it once. Then ask: did the portal retire it?', 'Submit the reset form a second time with the identical token and a different new password.'],
    lesson: 'A reset token must die the moment it is used; a reusable token is a permanent backdoor key for the account.',
    impact: 'Anyone who ever sees a reset email — forwarded, leaked, or in a shared inbox — keeps a forever key to that client account.',
    report: { title: 'Password Reset Tokens Are Not Invalidated After Use', severity: 'High', remediation: 'Invalidate reset tokens on first use and on any password change; keep lifetimes short (minutes, not days).' } },

  // ---------------- Admin Panel (2) ----------------
  { id: 'admin-bac', feature: 'Admin Panel', name: 'Admin User Dump Served to Any Logged-In User', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'GET /admin/users.json', exploit: 'As any ordinary signed-in user, open /admin/users.json: the endpoint checks only that a session exists and returns every account — including plaintext passwords.',
    hints: ['Admin data endpoints sometimes check for "a login" instead of "an admin".', 'The JSON twin of the admin user list lives under /admin/.', 'Sign in as a normal user and fetch /admin/users.json.'],
    lesson: 'An endpoint that returns credentials must verify the caller\u2019s role, not merely their presence.',
    impact: 'Every user password on a client\u2019s portal leaks to any registered account — instant mass account takeover and credential-stuffing material.',
    report: { title: 'Administrative User Dump (Including Passwords) Exposed to Regular Users', severity: 'Critical', remediation: 'Require admin role on all /admin endpoints and never store or return plaintext passwords.' } },
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'CSRF on Admin Account Deactivation', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /admin/deactivate', exploit: 'As an admin, submit a deactivation with no hx_origin marker (as a cross-site form would): the account is deactivated, proving the admin action has no CSRF token.',
    hints: ['Admin actions are state-changing POSTs too — and just as forgeable.', 'The portal\u2019s own pages carry the hx_origin marker; a forged request does not.', 'POST to /admin/deactivate as an admin with only the session cookie — no marker — and the user is deactivated.'],
    lesson: 'Privileged actions without CSRF tokens let any website an admin visits fire those actions with the admin\u2019s session.',
    impact: 'A booby-trapped page could deactivate accounts — or worse — using a client admin\u2019s own browser and privileges.',
    report: { title: 'Missing CSRF Protection on Administrative Deactivation', severity: 'High', remediation: 'Require per-session CSRF tokens on all administrative state changes and enforce SameSite cookies.' } },

  // ---------------- Platform & API (2) ----------------
  { id: 'api-debug', feature: 'Platform & API', name: 'Unauthenticated Debug Dump of All Identity Data', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    where: 'GET /api/debug (no session)', exploit: 'Open /api/debug in a fresh browser with no login at all: the diagnostic endpoint dumps every user (with passwords), documents, credentials and linked services.',
    hints: ['Diagnostic endpoints often survive into production.', 'This one needs no session, no token, nothing.', 'Fetch /api/debug while logged out.'],
    lesson: 'Debug endpoints are part of the attack surface; if it can be reached, it will be found.',
    impact: 'A complete identity-database leak — passwords, ID numbers, documents — from a single unauthenticated URL on a client\u2019s system.',
    report: { title: 'Unauthenticated Debug Endpoint Exposes the Entire Identity Dataset', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; gate any diagnostics behind admin auth and network restrictions.' } },
  { id: 'api-token', feature: 'Platform & API', name: 'Weak API Token — Base64 of the Email Address', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    where: 'GET /api/identity?token=', exploit: 'The API accepts a "token" that is simply the base64 of the user\u2019s email. Encode Bob\u2019s email and read his full identity record with no session at all.',
    hints: ['The API token is derived from something public — the account email.', 'Base64 is an encoding, not a secret.', 'base64-encode bob@test.local and call /api/identity?token=<that value>.'],
    lesson: 'A token must be unguessable; an encoding of a public identifier is an identifier, not a credential.',
    impact: 'Anyone who knows or guesses a user\u2019s email can pull their identity record from a client\u2019s API — no password ever needed.',
    report: { title: 'API Authentication Token Is a Base64 Encoding of the User Email', severity: 'High', remediation: 'Issue random, opaque API tokens server-side, store them hashed, and support revocation and rotation.' } }
];

const FEATURES = [];
for (const t of TESTS) if (!FEATURES.includes(t.feature)) FEATURES.push(t.feature);
const TEST_BY_ID = {};
for (const t of TESTS) TEST_BY_ID[t.id] = t;

/* ------------------------------------------------------------------ *
 * Key material — shard region 2 of 4 (entry key, second half).
 * ------------------------------------------------------------------ */


function assembleKey(a, b) {
  return a.concat(b).map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}
const ENTRY_KEY_SHA256 = '477ec46b88f2883450af2ee6d6218f0a26151a8675b92618f2ef9565bb040fce';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */

/* ================================================================== *
 * Progress state (persisted in progress.json — generated state).
 * ================================================================== */
function defaultState() {
  return { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false,
           probes: [], brute: {}, issuedTokens: {}, usedTokens: [] };
}
let state = defaultState();
try {
  if (fs.existsSync(STATE_FILE)) state = Object.assign(defaultState(), JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')));
} catch (e) { state = defaultState(); }
function save() { try { fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2)); } catch (e) {} }

function doneCount() { return TESTS.filter(t => state.tests[t.id]).length; }
function isComplete() { return doneCount() === TESTS.length; }
function pct() { return Math.floor(doneCount() * 100 / TESTS.length); }
function pass(id) {
  if (!state.tests[id]) {
    state.tests[id] = true;
    if (isComplete() && !state.completedAt) { state.completedAt = new Date().toISOString(); state.keyRevealed = true; }
    save();
  }
}
function attempt(feature) { state.attempts[feature] = (state.attempts[feature] || 0) + 1; save(); }

/* ================================================================== *
 * Seed data — all fake. In-memory only; resets on restart.
 * ================================================================== */
let users, documents, credentials, links, uploads;
let nextUserId, nextDocId, nextCredId, nextLinkId, sessions, sidSeq;
function seed() {
  users = [
    { id: 1, name: 'Ada Admin',     email: 'admin@hexaid.local',    password: 'admin123',  role: 'admin',    status: 'verified',   dob: '1990-01-15', idNumber: 'ID-1001-FAKE', hometown: 'Dhaka',       trustScore: 98, active: true },
    { id: 2, name: 'Alice Adams',   email: 'alice@test.local',      password: 'alice123',  role: 'user',     status: 'pending',    dob: '1994-05-20', idNumber: 'ID-1002-FAKE', hometown: 'Greenfield',  trustScore: 41, active: true },
    { id: 3, name: 'Bob Baker',     email: 'bob@test.local',        password: 'bob123',    role: 'user',     status: 'verified',   dob: '1988-11-02', idNumber: 'ID-1003-FAKE', hometown: 'Springfield', trustScore: 86, active: true },
    { id: 4, name: 'Carol Clark',   email: 'carol@test.local',      password: 'carol123',  role: 'user',     status: 'unverified', dob: '1997-03-30', idNumber: 'ID-1004-FAKE', hometown: 'Riverton',    trustScore: 12, active: true },
    { id: 5, name: 'Vera Verifier', email: 'verifier@hexaid.local', password: 'verify123', role: 'verifier', status: 'verified',   dob: '1991-07-19', idNumber: 'ID-1005-FAKE', hometown: 'Portside',    trustScore: 95, active: true }
  ];
  documents = [
    { id: 1, userId: 3, type: 'Passport',        number: 'XP-FAKE-1002', file: 'passport-bob.txt',       status: 'approved' },
    { id: 2, userId: 2, type: 'Driving Licence', number: 'DL-FAKE-2001', file: 'licence-alice.txt',      status: 'pending' },
    { id: 3, userId: 4, type: 'Proof of Address', number: 'UTIL-FAKE-3003', file: 'proof-address-carol.txt', status: 'pending' }
  ];
  credentials = [
    { id: 1, userId: 3, type: 'gov-verified',     number: 'CRED-1001', issued: '2026-09-14' },
    { id: 2, userId: 2, type: 'basic',            number: 'CRED-1002', issued: '2026-10-01' },
    { id: 3, userId: 3, type: 'address-verified', number: 'CRED-1003', issued: '2026-09-20' }
  ];
  links = [
    { id: 1, userId: 3, service: 'BankPortal',   token: 'svc-bob-bank-7f3' },
    { id: 2, userId: 2, service: 'GovPortal',    token: 'svc-alice-gov-9a1' },
    { id: 3, userId: 3, service: 'HealthPortal', token: 'svc-bob-health-2c8' }
  ];
  uploads = {};
  nextUserId = 6; nextDocId = 4; nextCredId = 4; nextLinkId = 4;
  sessions = new Map(); sidSeq = 1;
}
seed();

/* ================================================================== *
 * Small helpers.
 * ================================================================== */
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function raw(s) { return String(s == null ? '' : s); } // vulnerable spots render raw on purpose
function parseCookies(req) {
  const out = {}; const h = req.headers.cookie || '';
  for (const part of h.split(';')) { const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); }
  return out;
}
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 2e6) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(''));
  });
}
function parseBody(req, data) {
  const ct = (req.headers['content-type'] || '');
  if (ct.includes('application/json')) { try { return JSON.parse(data || '{}'); } catch (e) { return {}; } }
  return querystring.parse(data || '');
}
function sendHtml(res, status, body, headers) {
  const h = Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, headers || {});
  res.writeHead(status, h); res.end(body);
}
function sendJson(res, status, obj, headers) {
  const h = Object.assign({ 'Content-Type': 'application/json' }, headers || {});
  res.writeHead(status, h); res.end(JSON.stringify(obj));
}
function redirect(res, loc, cookies) {
  const h = { Location: loc };
  if (cookies && cookies.length) h['Set-Cookie'] = cookies;
  res.writeHead(302, h); res.end('');
}
function sessionUser(req) {
  const c = parseCookies(req);
  if (!c.hx_session) return null;
  const uid = sessions.get(c.hx_session);
  if (!uid) return null;
  return users.find(u => u.id === uid) || null;
}
function effectiveRole(req, user) {
  const c = parseCookies(req);
  if (c.hx_role) return c.hx_role; // FLAW (auth-cookie): role trusted from a client cookie
  return user ? user.role : null;
}
function hasMarker(req) { const c = parseCookies(req); return c.hx_origin === 'hexaid'; }
const XSS_RE = /<script|onerror\s*=|onload\s*=|<svg|<img[^>]*onerror|<iframe|<body[^>]*onload/i;
function resetFormula(id) { return 'HI' + id + '-' + (id * 137 + 42); }

/* ------------------------------------------------------------------ *
 * A tiny string-built "SQL" evaluator — deliberately injectable.
 * Builds:  email = '<e>' AND password = '<p>'
 * Supports string literals, =, AND / OR (AND binds tighter) and
 * -- comments, exactly like the real thing does badly.
 * ------------------------------------------------------------------ */
function sqlMatches(row, where) {
  let w = String(where);
  const ci = w.indexOf('--');
  if (ci >= 0) w = w.slice(0, ci);
  const operand = tok => {
    tok = tok.trim();
    if (tok.startsWith("'") && tok.endsWith("'")) return tok.slice(1, -1);
    const v = row[tok];
    return v == null ? '' : String(v);
  };
  const cmp = part => {
    const m = part.split('=');
    if (m.length !== 2) return false;
    return operand(m[0]) === operand(m[1]);
  };
  return w.split(/\s+OR\s+/i).some(orPart => orPart.split(/\s+AND\s+/i).every(cmp));
}

/* ------------------------------------------------------------------ *
 * Key material — shard region 3 of 4 (completion key, first half).
 * ------------------------------------------------------------------ */
const COMPLETION_SHARDS_A = ["MUwtWEg=","Mi05MA==","NVQyOA=="];

/* ================================================================== *
 * Pages (server-rendered).
 * ================================================================== */
function headerHtml(user) {
  const d = doneCount(), p = pct();
  return '<header style="background:#101828;color:#fff;padding:10px 16px;display:flex;gap:14px;align-items:center;flex-wrap:wrap">'
    + '<img src="/logo.png" alt="HexaCyberLab" style="height:34px">'
    + '<strong>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</strong>'
    + '<span style="background:#1d2939;padding:4px 10px;border-radius:6px">LAB ' + LAB_NUMBER + ' · ' + d + '/' + TESTS.length + ' tests · ' + p + '%</span>'
    + '<span style="flex:1;background:#344054;border-radius:6px;height:10px;min-width:120px"><span style="display:block;background:#2e90fa;height:10px;border-radius:6px;width:' + p + '%"></span></span>'
    + (user ? '<span>' + esc(user.name) + ' (' + esc(user.role) + ')</span> <a style="color:#84adff" href="/logout">Logout</a>' : '<a style="color:#84adff" href="/login">Login</a>')
    + ' <a style="color:#84adff" href="/tests">Mission Board</a></header>';
}
function chatWidget() {
  return '<div id="hxchat" style="position:fixed;right:14px;bottom:14px;width:320px;max-width:92vw;background:#fff;border:1px solid #d0d5dd;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.25);font-family:system-ui;z-index:50">'
    + '<div style="background:#101828;color:#fff;padding:8px 12px;border-radius:12px 12px 0 0"><strong>Lab Coach</strong> <span style="opacity:.75">— ask me about this lab</span></div>'
    + '<div id="hxlog" style="height:180px;overflow:auto;padding:10px;font-size:13px"></div>'
    + '<div style="display:flex;border-top:1px solid #eaecf0"><input id="hxmsg" style="flex:1;border:0;padding:9px" placeholder="Ask the coach…">'
    + '<button onclick="hxSend()" style="background:#2e90fa;color:#fff;border:0;padding:9px 14px;border-radius:0 0 12px 0">Send</button></div></div>'
    + '<script>function hxAdd(who,txt){var l=document.getElementById("hxlog");var d=document.createElement("div");d.style.margin="6px 0";d.innerHTML="<b>"+who+":</b> ";d.appendChild(document.createTextNode(txt));l.appendChild(d);l.scrollTop=l.scrollHeight;}'
    + 'async function hxSend(){var i=document.getElementById("hxmsg");var v=i.value.trim();if(!v)return;i.value="";hxAdd("You",v);try{var r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:v})});var j=await r.json();hxAdd("Coach",j.reply||"…");}catch(e){hxAdd("Coach","(coach unreachable)");}}'
    + 'document.getElementById("hxmsg").addEventListener("keydown",function(e){if(e.key==="Enter")hxSend();});</' + 'script>';
}
function layout(user, title, inner) {
  return '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(title) + ' — ' + LAB_NAME + '</title>'
    + '<style>body{font-family:system-ui;margin:0;background:#f8fafc;color:#101828}main{max-width:960px;margin:0 auto;padding:22px 16px 90px}a{color:#1570c9}input,select,textarea{padding:7px;margin:3px 0 10px;width:100%;box-sizing:border-box}button{background:#2e90fa;color:#fff;border:0;padding:8px 16px;border-radius:6px;cursor:pointer}.card{background:#fff;border:1px solid #eaecf0;border-radius:10px;padding:16px;margin:12px 0}table{border-collapse:collapse}td,th{border:1px solid #d0d5dd;padding:5px 9px;font-size:14px}.badge{background:#eef4ff;border-radius:10px;padding:1px 8px;font-size:12px}</style></head><body>'
    + headerHtml(user) + '<main><h1>' + esc(title) + '</h1>' + inner + '</main>' + chatWidget() + '</body></html>';
}
function gatePage() {
  const inner = '<div class="card"><h2>This lab is locked.</h2>'
    + '<p>Paste the completion key from Lab ' + (LAB_NUMBER - 1) + ' to start.</p>'
    + '<form method="POST" action="/unlock"><label>Completion key from Lab ' + (LAB_NUMBER - 1) + '<input name="key" autocomplete="off"></label>'
    + '<button type="submit">Unlock LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</button></form></div>';
  return '<!doctype html><html><head><meta charset="utf-8"><title>Locked — LAB ' + LAB_NUMBER + '</title></head><body style="font-family:system-ui;background:#f8fafc">'
    + headerHtml(null) + '<main style="max-width:720px;margin:0 auto;padding:22px 16px 90px"><h1>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h1>' + inner + '</main>' + chatWidget() + '</body></html>';
}
function loginPage(msg) {
  return layout(null, 'Sign in — HexaIdentity',
    (msg ? '<p style="color:#b42318">' + esc(msg) + '</p>' : '')
    + '<div class="card"><form method="POST" action="/login"><label>Email<input name="email" type="email" required></label>'
    + '<label>Password<input name="password" type="password" required></label><button type="submit">Sign in</button></form>'
    + '<p><a href="/forgot">Forgot password?</a> · <a href="/recover">Recover with security question</a> · <a href="/register">Create account</a></p>'
    + '<p style="background:#fffaeb;border:1px solid #fedf89;padding:8px;border-radius:6px">Demo access — administrator: <b>admin@hexaid.local</b> / <b>admin123</b> &nbsp;·&nbsp; verifier: <b>verifier@hexaid.local</b> / <b>verify123</b><br>Demo users: alice@test.local / alice123 · bob@test.local / bob123 · carol@test.local / carol123</p></div>');
}
function registerPage(msg) {
  return layout(null, 'Create your HexaIdentity',
    (msg ? '<p style="color:#b42318">' + esc(msg) + '</p>' : '')
    + '<div class="card"><form method="POST" action="/register"><label>Full name<input name="name" required></label>'
    + '<label>Email<input name="email" type="email" required></label><label>Password<input name="password" type="password" required></label>'
    + '<label>Hometown<input name="hometown"></label><button type="submit">Create account</button></form></div>');
}
function homePage(user) {
  const mine = documents.filter(d => d.userId === user.id);
  const myCreds = credentials.filter(c => c.userId === user.id);
  const myLinks = links.filter(l => l.userId === user.id);
  return layout(user, 'Welcome, ' + user.name,
    '<div class="card"><p>Identity status: <span class="badge">' + esc(user.status) + '</span> · Trust score: <b>' + esc(user.trustScore) + '</b> · Role: ' + esc(user.role) + '</p>'
    + '<p><a href="/identity/' + user.id + '">My identity record</a> · <a href="/profile/' + user.id + '">My public profile</a> · <a href="/documents">My documents</a> · <a href="/credentials">My credentials</a> · <a href="/services">Linked services</a></p>'
    + '<p>Documents on file: ' + mine.length + ' · Credentials held: ' + myCreds.length + ' · Linked services: ' + myLinks.length + '</p>'
    + '<p><a href="/verify/queue">Verification queue</a> · <a href="/admin">Admin panel</a> · <a href="/tests">Mission Board</a></p></div>'
    + '<div class="card"><h3>Update my profile</h3><form method="POST" action="/profile/update"><label>Display name<input name="name" value="' + esc(user.name) + '"></label>'
    + '<label>Hometown<input name="hometown" value="' + esc(user.hometown) + '"></label><button type="submit">Save profile</button></form></div>');
}
function publicProfilePage(viewer, u) {
  return layout(viewer, 'Member profile — ' + u.name,
    '<div class="card"><p><strong>' + raw(u.name) + '</strong></p>' // FLAW (reg-storedxss): name rendered raw
    + '<p>From ' + esc(u.hometown) + ' · Member of HexaIdentity · Identity status: ' + esc(u.status) + '</p></div>');
}
function identityPage(viewer, u) {
  const docs = documents.filter(d => d.userId === u.id);
  return layout(viewer, 'Identity record — ' + u.name,
    '<div class="card"><table>'
    + '<tr><th>Full name</th><td>' + raw(u.name) + '</td></tr>'
    + '<tr><th>Email</th><td>' + esc(u.email) + '</td></tr>'
    + '<tr><th>Date of birth</th><td>' + esc(u.dob) + '</td></tr>'
    + '<tr><th>Identity number</th><td>' + esc(u.idNumber) + '</td></tr>'
    + '<tr><th>Hometown</th><td>' + esc(u.hometown) + '</td></tr>'
    + '<tr><th>Status</th><td>' + esc(u.status) + '</td></tr>'
    + '<tr><th>Trust score</th><td>' + esc(u.trustScore) + '</td></tr></table>'
    + '<h3>Documents</h3>' + (docs.length ? docs.map(d => '<p>' + esc(d.type) + ' — ' + esc(d.number) + ' (' + esc(d.status) + ') · <a href="/document/' + d.id + '">view</a> · <a href="/download?file=' + encodeURIComponent(d.file) + '">download</a></p>').join('') : '<p>None</p>')
    + '</div>');
}
function documentsPage(user, msg) {
  const mine = documents.filter(d => d.userId === user.id);
  return layout(user, 'My documents',
    (msg ? '<p>' + esc(msg) + '</p>' : '')
    + '<div class="card">' + (mine.length ? mine.map(d => '<p>' + esc(d.type) + ' — ' + esc(d.number) + ' (' + esc(d.status) + ') · <a href="/document/' + d.id + '">view</a> · <a href="/download?file=' + encodeURIComponent(d.file) + '">download</a></p>').join('') : '<p>No documents yet.</p>') + '</div>'
    + '<div class="card"><h3>Upload a document (simulated)</h3><form method="POST" action="/documents/upload"><label>File name<input name="filename" placeholder="passport-scan.txt"></label>'
    + '<label>Document type<input name="type" placeholder="Passport"></label><label>Content<textarea name="content" rows="4"></textarea></label><button type="submit">Upload</button></form>'
    + '<p>Uploaded files are served from <code>/uploads/&lt;name&gt;</code>.</p></div>');
}
function queuePage(user) {
  const pending = users.filter(u => u.status === 'pending' || u.status === 'unverified');
  return layout(user, 'Verification queue',
    '<div class="card"><p>Applicants awaiting review:</p><table><tr><th>ID</th><th>Name</th><th>Email</th><th>Identity number</th><th>Status</th><th>Document</th><th>Action</th></tr>'
    + pending.map(u => { const d = documents.find(x => x.userId === u.id); return '<tr><td>' + u.id + '</td><td>' + raw(u.name) + '</td><td>' + esc(u.email) + '</td><td>' + esc(u.idNumber) + '</td><td>' + esc(u.status) + '</td><td>' + (d ? esc(d.type) + ' ' + esc(d.number) : '—') + '</td><td><form method="POST" action="/verify/approve" style="display:inline"><input type="hidden" name="userId" value="' + u.id + '"><button type="submit">Approve</button></form></td></tr>'; }).join('')
    + '</table></div>');
}
function credentialsPage(user, msg) {
  const mine = credentials.filter(c => c.userId === user.id);
  return layout(user, 'My credentials',
    (msg ? '<p>' + esc(msg) + '</p>' : '')
    + '<div class="card">' + (mine.length ? mine.map(c => '<p><span class="badge">' + esc(c.type) + '</span> ' + esc(c.number) + ' · issued ' + esc(c.issued) + ' · <a href="/credential/' + c.id + '">view</a></p>').join('') : '<p>No credentials yet.</p>') + '</div>'
    + '<div class="card"><h3>Issue a credential</h3><form method="POST" action="/credentials/issue"><label>Type<select name="type"><option value="basic">basic</option><option value="address-verified">address-verified</option><option value="gov-verified">gov-verified</option></select></label><button type="submit">Issue to me</button></form></div>');
}
function credentialPage(viewer, c) {
  const owner = users.find(u => u.id === c.userId);
  return layout(viewer, 'Credential ' + c.number,
    '<div class="card"><p>Type: <span class="badge">' + esc(c.type) + '</span></p><p>Number: ' + esc(c.number) + '</p><p>Holder: ' + esc(owner ? owner.name : '?') + ' (' + esc(owner ? owner.email : '') + ')</p><p>Issued: ' + esc(c.issued) + '</p></div>');
}
function servicesPage(user, list, ownerLabel) {
  return layout(user, 'Linked services — ' + ownerLabel,
    '<div class="card">' + (list.length ? list.map(l => '<p>' + esc(l.service) + ' · token <code>' + esc(l.token) + '</code> · <form method="POST" action="/services/unlink" style="display:inline"><input type="hidden" name="linkId" value="' + l.id + '"><button type="submit">Unlink</button></form></p>').join('') : '<p>No linked services.</p>') + '</div>');
}
function adminPage(user) {
  return layout(user, 'Admin panel',
    '<div class="card"><p>All accounts:</p><table><tr><th>ID</th><th>Name</th><th>Email</th><th>Password</th><th>Role</th><th>Status</th><th>Active</th><th>Action</th></tr>'
    + users.map(u => '<tr><td>' + u.id + '</td><td>' + raw(u.name) + '</td><td>' + esc(u.email) + '</td><td>' + esc(u.password) + '</td><td>' + esc(u.role) + '</td><td>' + esc(u.status) + '</td><td>' + (u.active ? 'yes' : 'no') + '</td><td><form method="POST" action="/admin/deactivate" style="display:inline"><input type="hidden" name="userId" value="' + u.id + '"><button type="submit">Deactivate</button></form></td></tr>').join('')
    + '</table><p><a href="/admin/users.json">users.json</a> · <a href="/verify/queue">Verification queue</a></p></div>');
}
function testsPage(user) {
  let inner = '<p>Each test completes only when the exploit really works — there is no "mark done" button. Hints reveal one at a time.</p>';
  for (const f of FEATURES) {
    const list = TESTS.filter(t => t.feature === f);
    inner += '<div class="card"><h3>' + esc(f) + ' <span class="badge">attempts: ' + (state.attempts[f] || 0) + '</span></h3>';
    for (const t of list) {
      const done = !!state.tests[t.id];
      inner += '<div style="border-top:1px solid #eaecf0;padding:8px 0"><strong>' + (done ? '✓' : '○') + ' ' + esc(t.name) + '</strong> '
        + '<span class="badge">' + esc(t.owasp) + '</span> <span class="badge">' + esc(t.difficulty) + '</span> '
        + (done ? '<span class="badge" style="background:#dcfae6">done</span>' : '<span class="badge">open</span>')
        + '<div>' + t.hints.map((h, i) => '<p class="hxhint" style="display:none;color:#475467">Hint ' + (i + 1) + ': ' + esc(h) + '</p>').join('')
        + '<button type="button" onclick="hxHint(this)">Hints</button></div></div>';
    }
    inner += '</div>';
  }
  inner += '<script>function hxHint(b){var box=b.parentElement;var hs=box.querySelectorAll(".hxhint");for(var i=0;i<hs.length;i++){if(hs[i].style.display==="none"){hs[i].style.display="block";return;}}}</' + 'script>';
  return layout(user, 'Mission Board — LAB ' + LAB_NUMBER + ' ' + LAB_NAME, inner);
}
function completePage(user) {
  if (!isComplete()) {
    const left = TESTS.filter(t => !state.tests[t.id]);
    return layout(user, 'Not complete yet',
      '<div class="card"><p>Progress: ' + doneCount() + '/' + TESTS.length + ' tests (' + pct() + '%).</p><p>Still open:</p><ul>'
      + left.map(t => '<li>' + esc(t.feature) + ' — ' + esc(t.name) + '</li>').join('') + '</ul></div>');
  }
  const key = assembleCompletionKey();
  let s1 = '<div class="card"><h3>1) Lab totals</h3><p>' + FEATURES.length + ' features · ' + TESTS.length + ' security tests · 100% complete.</p></div>';
  let s2 = '<div class="card"><h3>2) Vulnerabilities per feature</h3><table>' + FEATURES.map(f => '<tr><td>' + esc(f) + '</td><td>' + TESTS.filter(t => t.feature === f).length + '</td></tr>').join('') + '</table></div>';
  let s3 = '<div class="card"><h3>3) How the testing was done</h3><ul>' + TESTS.map(t => '<li>' + esc(t.name) + ' — ' + esc(t.exploit) + '</li>').join('') + '</ul></div>';
  let s4 = '<div class="card"><h3>4) What you learned</h3><ul>' + TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.lesson) + '</li>').join('') + '</ul></div>';
  let s5 = '<div class="card"><h3>5) What this means for a real client</h3><ul>' + TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.impact) + '</li>').join('') + '</ul></div>';
  let s6 = '<div class="card"><h3>6) Writing it in a real report</h3>' + TESTS.map(t => '<p><b>' + esc(t.report.title) + '</b> — Severity: ' + esc(t.report.severity) + '<br>Remediation: ' + esc(t.report.remediation) + '</p>').join('') + '</div>';
  const keyCard = '<div class="card" style="border-color:#2e90fa"><h3>Completion key — unlocks Lab ' + (LAB_NUMBER + 1) + '</h3><p style="font-size:20px"><code>' + esc(key) + '</code></p>'
    + '<form method="POST" action="/complete/name"><label>Your name for the certificate<input name="name" value="' + esc(state.testerName || (user ? user.name : '')) + '"></label><button type="submit">Save name</button></form>'
    + '<p><a href="/certificate">View your certificate</a></p></div>';
  return layout(user, 'LAB ' + LAB_NUMBER + ' complete — debrief', s1 + s2 + s3 + s4 + s5 + s6 + keyCard);
}
function certificatePage(user) {
  if (!isComplete()) return layout(user, 'Certificate', '<div class="card"><p>Complete 100% of the tests first.</p></div>');
  const name = state.testerName || (user ? user.name : 'Tester');
  const date = state.completedAt ? new Date(state.completedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  return '<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ' + LAB_NUMBER + '</title>'
    + '<style>body{font-family:Georgia,serif;background:#f2f4f7}@media print{body{background:#fff}.noprint{display:none}}.cert{max-width:720px;margin:40px auto;background:#fff;border:3px double #101828;border-radius:8px;padding:36px;text-align:center}</style></head><body>'
    + '<div class="cert"><img src="/logo.png" alt="HexaCyberLab" style="height:64px">'
    + '<h1>Certificate of Completion</h1><p>This certifies that</p><h2>' + esc(name) + '</h2>'
    + '<p>has completed 100% of the security tests in LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' (' + TESTS.length + ' tests across ' + FEATURES.length + ' features)</p>'
    + '<p>Completed: ' + esc(date) + '</p><p><em>HexaCyberLab — Built by Md. Jony Hassain, Founder</em></p>'
    + '<p class="noprint"><button onclick="window.print()">Print</button></p></div></body></html>';
}

/* ------------------------------------------------------------------ *
 * Key material — shard region 4 of 4 (completion key, second half).
 * The completion key is assembled only when the lab is at 100%.
 * ------------------------------------------------------------------ */
const COMPLETION_SHARDS_B = ["LUMzNw==","SU4zVw==","MVBFOQ=="];
function assembleCompletionKey() { return assembleKey(COMPLETION_SHARDS_A, COMPLETION_SHARDS_B); }

/* ================================================================== *
 * Lab Coach (rule-based, no external calls).
 * ================================================================== */
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
function matchFeature(m) {
  for (const f of FEATURES) if (m.includes(f.toLowerCase())) return f;
  const rules = [
    ['Verification Workflow', ['verification', 'verify', 'verifier', 'approve', 'queue']],
    ['Account Recovery', ['recover', 'security question']],
    ['Credentials & Badges', ['credential', 'badge']],
    ['Linked Services', ['linked', 'unlink', 'service']],
    ['Identity Profiles & Documents', ['document', 'upload', 'download', 'traversal', 'identity record', 'identity profile']],
    ['Admin Panel', ['admin', 'deactivate']],
    ['Platform & API', ['api', 'debug', 'platform']],
    ['Login & Authentication', ['login', 'authentication', 'brute', 'reset token', 'enumerat', 'cookie', 'password', 'sign in']],
    ['Registration & Profile', ['regist', 'sign up', 'profile update', 'mass assignment', 'weak password']],
    ['Identity Profiles & Documents', ['identity', 'profile', 'idor']]
  ];
  for (const [f, keys] of rules) for (const k of keys) if (m.includes(k)) return f;
  return null;
}
function coachReply(message) {
  const msg = String(message || '');
  const m = msg.toLowerCase();
  const total = TESTS.length, done = doneCount();
  if (/(who (built|made|created)|who is the founder|founder|built this|made this)/.test(m)) return ATTRIBUTION;
  if (/(completion key|the key|next lab|unlock key|give me the key|lab 109)/.test(m)) {
    if (isComplete()) return 'You completed LAB ' + LAB_NUMBER + ' at 100% — here is your completion key: ' + assembleCompletionKey() + ' — use it to unlock Lab ' + (LAB_NUMBER + 1) + '. Well done.';
    return "I don't have the completion key yet — I only receive it when this lab is completed 100%. You are at " + pct() + '% (' + done + '/' + total + ' tests). Finish every test and ask me again.';
  }
  const feature = matchFeature(m);
  const wantsHow = /(how|solve|help|guide|step|exploit|pass|do i|bypass|attack)/.test(m);
  if (feature && wantsHow) {
    const list = TESTS.filter(t => t.feature === feature);
    const open = list.filter(t => !state.tests[t.id]);
    const n = state.attempts[feature] || 0;
    if (!open.length) return 'All ' + feature + ' tests are already complete — nice work. Pick another feature from the Mission Board (/tests).';
    if (n >= 3) {
      return 'Step by step for ' + feature + ':\n' + open.map(t => '• ' + t.name + ' — ' + t.hints[2]).join('\n');
    }
    return 'That feature is locked for help. First try the ' + feature + " tests yourself at least 3 times — I can see you've tried " + n + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  if (feature) {
    const list = TESTS.filter(t => t.feature === feature);
    const dn = list.filter(t => state.tests[t.id]).length;
    return feature + ' has ' + list.length + ' tests (' + dn + ' done):\n' + list.map(t => '• ' + t.name + ' [' + t.difficulty + ']').join('\n')
      + '\nAttempts so far on this feature: ' + (state.attempts[feature] || 0) + '. Ask me "how do I solve the ' + feature + ' tests?" once you have tried at least 3 times.';
  }
  if (/(progress|status|how many|features|tests|score)/.test(m) || /^(hi|hello|hey)\b/.test(m)) {
    const nextOpen = TESTS.find(t => !state.tests[t.id]);
    return 'Welcome to LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' (' + LAB_CATEGORY + '). This lab has ' + FEATURES.length + ' features and ' + total + ' tests. Your progress: ' + done + '/' + total + ' (' + pct() + '%).'
      + (nextOpen ? ' Next open test: ' + nextOpen.name + ' (' + nextOpen.feature + ').' : ' All tests complete!')
      + ' Open /tests for the Mission Board. How-to help for a feature unlocks after you have genuinely tried that feature at least 3 times.';
  }
  return 'I can explain this lab\u2019s map: ask me about a feature (e.g. "' + FEATURES[0] + '") to hear its tests, ask about your progress, or ask how to solve a feature after you have tried it at least 3 times. The Mission Board is at /tests.';
}

/* ================================================================== *
 * Handlers.
 * ================================================================== */
function doLogin(req, res, body, cookiesOut) {
  attempt('Login & Authentication');
  const email = String(body.email || ''), password = String(body.password || '');
  const where = "email = '" + email + "' AND password = '" + password + "'";
  const user = users.find(u => u.active && sqlMatches({ email: u.email, password: u.password, name: u.name, role: u.role }, where));
  // enumeration evidence: differential answers are the flaw; probes are counted
  if (email && !state.probes.includes(email)) { state.probes.push(email); save(); }
  if (user) {
    if (password !== user.password) pass('auth-sqli'); // session created without the real password
    if (email === 'admin@hexaid.local' && password === 'admin123') pass('auth-default'); // published demo creds
    const sid = 's' + (sidSeq++) + '-' + Math.random().toString(36).slice(2, 10);
    sessions.set(sid, user.id);
    cookiesOut.push('hx_session=' + sid + '; Path=/; HttpOnly');
    cookiesOut.push('hx_role=' + user.role + '; Path=/');
    return redirect(res, '/', cookiesOut);
  }
  // failed login — differential message (the enumeration flaw)
  const exists = users.some(u => u.email === email);
  if (exists) {
    state.brute[email] = (state.brute[email] || 0) + 1;
    if (state.brute[email] >= 10) pass('auth-brute'); // 10th failure still processed normally
    save();
  }
  if (state.probes.length >= 5) {
    const anyReal = state.probes.some(e => users.some(u => u.email === e));
    const anyFake = state.probes.some(e => !users.some(u => u.email === e));
    if (anyReal && anyFake) pass('auth-enum');
  }
  return sendHtml(res, 200, loginPage(exists ? 'Incorrect password.' : 'No account found for that email.'));
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1');
  const p = url.pathname;
  const method = req.method;
  const cookies = parseCookies(req);
  const setOrigin = method === 'GET' ? ['hx_origin=hexaid; Path=/'] : null;

  // ---- always-available lab-system endpoints ----
  if (p === '/logo.png') {
    try { const buf = fs.readFileSync(path.join(ROOT, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(buf); }
    catch (e) { res.writeHead(404); return res.end('no logo'); }
  }
  if (p === '/api/progress') {
    const feats = {};
    for (const f of FEATURES) feats[f] = { total: TESTS.filter(t => t.feature === f).length, done: TESTS.filter(t => t.feature === f && state.tests[t.id]).length, attempts: state.attempts[f] || 0 };
    return sendJson(res, 200, { lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done: doneCount(), pct: pct(), features: feats, complete: isComplete() });
  }
  if (p === '/api/chat' && method === 'POST') {
    const body = parseBody(req, await readBody(req));
    return sendJson(res, 200, { reply: coachReply(body.message) });
  }
  if (p === '/unlock' && method === 'POST') {
    const body = parseBody(req, await readBody(req));
    const given = String(body.key || '');
    if (entryKeyMatches(given)) { state.unlocked = true; save(); return redirect(res, '/'); }
    res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(gatePage().replace('</h2>', '</h2><p style="color:#b42318">That key was not accepted.</p>'));
  }

  // ---- platform API (reachable without a session — that is the point of two tests) ----
  if (p === '/api/debug') {
    attempt('Platform & API');
    pass('api-debug');
    return sendJson(res, 200, { users, documents, credentials, links });
  }
  if (p === '/api/identity') {
    attempt('Platform & API');
    const tok = url.searchParams.get('token') || '';
    let email = '';
    try { email = Buffer.from(tok, 'base64').toString('utf8'); } catch (e) {}
    const u = users.find(x => x.email === email);
    if (!u) return sendJson(res, 404, { error: 'unknown token' });
    pass('api-token'); // a base64 email was accepted as a credential
    return sendJson(res, 200, { id: u.id, name: u.name, email: u.email, dob: u.dob, idNumber: u.idNumber, status: u.status, trustScore: u.trustScore });
  }

  // ---- lock gate ----
  if (!state.unlocked) return sendHtml(res, 200, gatePage(), setOrigin ? { 'Set-Cookie': setOrigin } : null);

  const user = sessionUser(req);
  const needLogin = () => redirect(res, '/login');

  if (p === '/logout') { if (cookies.hx_session) sessions.delete(cookies.hx_session); return redirect(res, '/login', ['hx_session=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0']); }

  if (p === '/login') {
    if (method === 'GET') return sendHtml(res, 200, loginPage(), { 'Set-Cookie': setOrigin });
    const body = parseBody(req, await readBody(req)); const out = [];
    return doLogin(req, res, body, out);
  }
  if (p === '/register') {
    if (method === 'GET') return sendHtml(res, 200, registerPage(), { 'Set-Cookie': setOrigin });
    attempt('Registration & Profile');
    const body = parseBody(req, await readBody(req));
    const email = String(body.email || '');
    if (!email || users.some(u => u.email === email)) return sendHtml(res, 200, registerPage('Email missing or already registered.'));
    const nu = { id: nextUserId++, name: String(body.name || 'New User'), email, password: String(body.password || ''),
      role: 'user', status: 'unverified', dob: String(body.dob || '2000-01-01'), idNumber: 'ID-' + (1000 + nextUserId) + '-FAKE',
      hometown: String(body.hometown || 'Nowhere'), trustScore: 5, active: true };
    // FLAW (reg-massassign): extra request fields are copied straight onto the record
    for (const k of ['role', 'status', 'trustScore']) if (body[k] !== undefined) nu[k] = (k === 'trustScore') ? Number(body[k]) || nu[k] : String(body[k]);
    users.push(nu);
    if (nu.password.length < 4) pass('reg-weakpass');
    if (nu.role !== 'user' || nu.status === 'verified') pass('reg-massassign');
    if (XSS_RE.test(nu.name)) pass('reg-storedxss');
    return redirect(res, '/login');
  }

  // ---- password reset & recovery ----
  if (p === '/forgot') {
    if (method === 'GET') return sendHtml(res, 200, layout(null, 'Forgot password', '<div class="card"><form method="POST" action="/forgot"><label>Email<input name="email" type="email" required></label><button type="submit">Send reset token</button></form></div>'), { 'Set-Cookie': setOrigin });
    attempt('Login & Authentication');
    const body = parseBody(req, await readBody(req));
    const email = String(body.email || '');
    if (email && !state.probes.includes(email)) { state.probes.push(email); save(); }
    if (state.probes.length >= 5) {
      const anyReal = state.probes.some(e => users.some(x => x.email === e));
      const anyFake = state.probes.some(e => !users.some(x => x.email === e));
      if (anyReal && anyFake) pass('auth-enum');
    }
    const u = users.find(x => x.email === email);
    if (!u) return sendHtml(res, 200, layout(null, 'Forgot password', '<div class="card"><p>No account found for that email.</p></div>'));
    const tok = String(100000 + Math.floor(Math.random() * 900000));
    state.issuedTokens[u.id] = tok; save();
    return sendHtml(res, 200, layout(null, 'Forgot password', '<div class="card"><p>Reset email sent. <b>[Simulated mailbox]</b> Reset token for ' + esc(email) + ': <code>' + tok + '</code></p><p><a href="/reset">Enter the token</a></p></div>'));
  }
  if (p === '/reset') {
    if (method === 'GET') return sendHtml(res, 200, layout(null, 'Reset password', '<div class="card"><form method="POST" action="/reset"><label>User ID<input name="userId" required></label><label>Reset token<input name="token" required></label><label>New password<input name="newPassword" type="password" required></label><button type="submit">Set new password</button></form></div>'), { 'Set-Cookie': setOrigin });
    attempt('Login & Authentication');
    const body = parseBody(req, await readBody(req));
    const u = users.find(x => x.id === Number(body.userId));
    if (!u) return sendHtml(res, 200, layout(null, 'Reset password', '<div class="card"><p>Unknown user.</p></div>'));
    const tok = String(body.token || '');
    let ok = false;
    if (state.issuedTokens[u.id] && tok === state.issuedTokens[u.id]) {
      ok = true;
      if ((state.usedTokens || []).includes(tok)) pass('rec-reuse'); // token accepted a second time — never invalidated
      else { state.usedTokens.push(tok); save(); }
    } else if (tok === resetFormula(u.id)) { ok = true; pass('auth-reset-token'); }
    if (!ok) return sendHtml(res, 200, layout(null, 'Reset password', '<div class="card"><p>Invalid token.</p></div>'));
    u.password = String(body.newPassword || '');
    return redirect(res, '/login');
  }
  if (p === '/recover') {
    if (method === 'GET') return sendHtml(res, 200, layout(null, 'Recover account', '<div class="card"><p>Answer your security question: <b>What is your hometown?</b></p><form method="POST" action="/recover"><label>Email<input name="email" type="email" required></label><label>Hometown answer<input name="answer" required></label><label>New password<input name="newPassword" type="password" required></label><button type="submit">Recover account</button></form></div>'), { 'Set-Cookie': setOrigin });
    attempt('Account Recovery');
    const body = parseBody(req, await readBody(req));
    const u = users.find(x => x.email === String(body.email || ''));
    if (u && String(body.answer || '').trim().toLowerCase() === String(u.hometown).toLowerCase()) {
      u.password = String(body.newPassword || '');
      pass('rec-question');
      return redirect(res, '/login');
    }
    return sendHtml(res, 200, layout(null, 'Recover account', '<div class="card"><p>Recovery failed: wrong answer.</p></div>'));
  }

  // ---- everything below needs a session ----
  if (!user && !['/'].includes(p) && p !== '/tests' && p !== '/complete' && p !== '/certificate') return needLogin();
  if (p === '/' ) { if (!user) return redirect(res, '/login'); return sendHtml(res, 200, homePage(user), { 'Set-Cookie': setOrigin }); }
  if (p === '/tests') return sendHtml(res, 200, testsPage(user), setOrigin ? { 'Set-Cookie': setOrigin } : null);
  if (p === '/complete') {
    if (method === 'POST') return redirect(res, '/complete');
    return sendHtml(res, 200, completePage(user), setOrigin ? { 'Set-Cookie': setOrigin } : null);
  }
  if (p === '/complete/name' && method === 'POST') {
    const body = parseBody(req, await readBody(req));
    state.testerName = String(body.name || '').slice(0, 80); save();
    return redirect(res, '/certificate');
  }
  if (p === '/certificate') return sendHtml(res, 200, certificatePage(user));

  if (p === '/profile/update' && method === 'POST') {
    attempt('Registration & Profile');
    const body = parseBody(req, await readBody(req));
    if (body.name) user.name = String(body.name);
    if (body.hometown) user.hometown = String(body.hometown);
    if (!hasMarker(req)) pass('reg-csrf'); // state change without the portal's own marker
    return redirect(res, '/');
  }

  let m;
  if ((m = p.match(/^\/profile\/(\d+)$/)) && method === 'GET') {
    const u = users.find(x => x.id === Number(m[1]));
    if (!u) { res.writeHead(404); return res.end('not found'); }
    return sendHtml(res, 200, publicProfilePage(user, u), { 'Set-Cookie': setOrigin });
  }
  if ((m = p.match(/^\/identity\/(\d+)$/)) && method === 'GET') {
    attempt('Identity Profiles & Documents');
    const u = users.find(x => x.id === Number(m[1]));
    if (!u) { res.writeHead(404); return res.end('not found'); }
    if (u.id !== user.id) pass('idor-profile'); // FLAW: any signed-in user can read any identity record
    return sendHtml(res, 200, identityPage(user, u), { 'Set-Cookie': setOrigin });
  }
  if (p === '/identity/status' && method === 'POST') {
    attempt('Verification Workflow');
    const body = parseBody(req, await readBody(req));
    const s = String(body.status || '');
    if (['unverified', 'pending', 'verified'].includes(s)) {
      const before = user.status;
      user.status = s; // FLAW (verify-status): client chooses the verification status
      if (s === 'verified' && before !== 'verified') pass('verify-status');
    }
    return redirect(res, '/');
  }
  if (p === '/documents' && method === 'GET') return sendHtml(res, 200, documentsPage(user), { 'Set-Cookie': setOrigin });
  if (p === '/documents/upload' && method === 'POST') {
    attempt('Identity Profiles & Documents');
    const body = parseBody(req, await readBody(req));
    const fname = String(body.filename || 'document.txt').replace(/[\\/]/g, '_');
    uploads[fname] = String(body.content || '');
    documents.push({ id: nextDocId++, userId: user.id, type: String(body.type || 'Document'), number: 'UP-' + fname, file: fname, status: 'pending' });
    return redirect(res, '/documents');
  }
  if ((m = p.match(/^\/uploads\/(.+)$/)) && method === 'GET') {
    const name = decodeURIComponent(m[1]);
    if (!(name in uploads)) { res.writeHead(404); return res.end('not found'); }
    const ext = path.extname(name).toLowerCase();
    const ct = ext === '.html' ? 'text/html' : ext === '.svg' ? 'image/svg+xml' : 'text/plain';
    if (ext === '.html') pass('doc-upload'); // stored HTML is served as active content from the portal origin
    res.writeHead(200, { 'Content-Type': ct + '; charset=utf-8' });
    return res.end(uploads[name]);
  }
  if ((m = p.match(/^\/document\/(\d+)$/)) && method === 'GET') {
    const d = documents.find(x => x.id === Number(m[1]));
    if (!d) { res.writeHead(404); return res.end('not found'); }
    if (d.userId !== user.id && user.role !== 'admin' && user.role !== 'verifier') { res.writeHead(403); return res.end('not your document'); }
    return sendHtml(res, 200, layout(user, 'Document — ' + d.type, '<div class="card"><p>' + esc(d.type) + ' — ' + esc(d.number) + '</p><p>File: ' + esc(d.file) + ' · Status: ' + esc(d.status) + '</p><p><a href="/download?file=' + encodeURIComponent(d.file) + '">Download</a></p></div>'), { 'Set-Cookie': setOrigin });
  }
  if (p === '/download' && method === 'GET') {
    attempt('Identity Profiles & Documents');
    const file = url.searchParams.get('file') || '';
    const target = path.join(FILES_DIR, file); // FLAW (doc-traversal): no confinement check
    const rel = path.relative(FILES_DIR, target);
    try {
      const content = fs.readFileSync(target);
      if (rel.startsWith('..')) pass('doc-traversal'); // a file outside the documents folder was served
      res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
      return res.end(content);
    } catch (e) { res.writeHead(404); return res.end('not found'); }
  }

  // ---- verification workflow ----
  if (p === '/verify/queue' && method === 'GET') {
    attempt('Verification Workflow');
    if (user.role === 'user') pass('verify-queue'); // FLAW: queue route sits outside the staff role check
    return sendHtml(res, 200, queuePage(user), { 'Set-Cookie': setOrigin });
  }
  if (p === '/verify/approve' && method === 'POST') {
    attempt('Verification Workflow');
    const body = parseBody(req, await readBody(req));
    const target = users.find(x => x.id === Number(body.userId));
    if (target) {
      target.status = 'verified'; // FLAW (verify-self): no role check on the approval endpoint
      const d = documents.find(x => x.userId === target.id);
      if (d) d.status = 'approved';
      if (target.id === user.id && user.role === 'user') pass('verify-self');
    }
    return redirect(res, '/verify/queue');
  }

  // ---- credentials ----
  if (p === '/credentials' && method === 'GET') return sendHtml(res, 200, credentialsPage(user), { 'Set-Cookie': setOrigin });
  if (p === '/credentials/issue' && method === 'POST') {
    attempt('Credentials & Badges');
    const body = parseBody(req, await readBody(req));
    const type = String(body.type || 'basic');
    const c = { id: nextCredId++, userId: user.id, type, number: 'CRED-' + (1000 + nextCredId), issued: new Date().toISOString().slice(0, 10) };
    credentials.push(c);
    if (type !== 'basic' && user.role === 'user') pass('cred-forge'); // high-assurance credential self-issued
    return redirect(res, '/credentials');
  }
  if ((m = p.match(/^\/credential\/(\d+)$/)) && method === 'GET') {
    attempt('Credentials & Badges');
    const c = credentials.find(x => x.id === Number(m[1]));
    if (!c) { res.writeHead(404); return res.end('not found'); }
    if (c.userId !== user.id) pass('cred-idor'); // FLAW: no ownership check on credential reads
    return sendHtml(res, 200, credentialPage(user, c), { 'Set-Cookie': setOrigin });
  }

  // ---- linked services ----
  if (p === '/services' && method === 'GET') {
    attempt('Linked Services');
    return sendHtml(res, 200, servicesPage(user, links.filter(l => l.userId === user.id), 'mine'), { 'Set-Cookie': setOrigin });
  }
  if ((m = p.match(/^\/services\/user\/(\d+)$/)) && method === 'GET') {
    attempt('Linked Services');
    const owner = users.find(x => x.id === Number(m[1]));
    if (!owner) { res.writeHead(404); return res.end('not found'); }
    if (owner.id !== user.id) pass('link-idor'); // FLAW: other users' services + tokens are listed
    return sendHtml(res, 200, servicesPage(user, links.filter(l => l.userId === owner.id), owner.name), { 'Set-Cookie': setOrigin });
  }
  if (p === '/services/unlink' && method === 'POST') {
    attempt('Linked Services');
    const body = parseBody(req, await readBody(req));
    const idx = links.findIndex(l => l.id === Number(body.linkId));
    if (idx >= 0) {
      if (links[idx].userId !== user.id) pass('link-unlink'); // FLAW: no ownership check before deleting
      links.splice(idx, 1);
    }
    return redirect(res, '/services');
  }

  // ---- admin ----
  if (p === '/admin/users.json' && method === 'GET') {
    attempt('Admin Panel');
    if (user.role !== 'admin') pass('admin-bac'); // FLAW: session-only check on an admin data endpoint
    return sendJson(res, 200, users);
  }
  if (p === '/admin' && method === 'GET') {
    const role = effectiveRole(req, user);
    if (role !== 'admin') { res.writeHead(403); return res.end('admins only'); }
    if (user.role !== 'admin') pass('auth-cookie'); // reached only because the client cookie claimed admin
    return sendHtml(res, 200, adminPage(user), { 'Set-Cookie': setOrigin });
  }
  if (p === '/admin/deactivate' && method === 'POST') {
    attempt('Admin Panel');
    const role = effectiveRole(req, user);
    if (role !== 'admin') { res.writeHead(403); return res.end('admins only'); }
    const body = parseBody(req, await readBody(req));
    const target = users.find(x => x.id === Number(body.userId));
    if (target) { target.active = false; if (!hasMarker(req)) pass('admin-csrf'); }
    return redirect(res, '/admin');
  }

  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  return res.end(layout(user, 'Not found', '<div class="card"><p>404 — that page does not exist.</p></div>'));
}

/* ================================================================== *
 * Doc generation (node server.js --gen-docs) — from the registry.
 * ================================================================== */
function genDocs() {
  let vuln = '# ' + LAB_NAME + ' — Vulnerability Map (LAB ' + LAB_NUMBER + ')\n\nAll ' + TESTS.length + ' scored tests, grouped by feature. This is the lab\u2019s complete map.\n';
  let prac = '# ' + LAB_NAME + ' — Practice Guide (LAB ' + LAB_NUMBER + ')\n\nChallenges grouped by feature, then difficulty. Each challenge mirrors the Mission Board (/tests) in the app.\n';
  let fix = '# ' + LAB_NAME + ' — Fix & Retest (LAB ' + LAB_NUMBER + ')\n\nFor every test: the secure implementation, and the regression test that proves the fix.\n';
  const order = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  for (const f of FEATURES) {
    const list = TESTS.filter(t => t.feature === f);
    vuln += '\n## ' + f + ' (' + list.length + ')\n';
    prac += '\n## ' + f + '\n';
    fix += '\n## ' + f + '\n';
    for (const t of list) {
      vuln += '\n### ' + t.name + '\n- OWASP: ' + t.owasp + '\n- Difficulty: ' + t.difficulty + '\n- Location: ' + t.where + '\n- Exploitation outline: ' + t.exploit + '\n- Impact: ' + t.impact + '\n';
      fix += '\n### ' + t.report.title + ' (' + t.report.severity + ')\n- Secure implementation: ' + t.report.remediation + '\n- Regression test: re-run the original exploit (' + t.where + ') — it must now fail safely (no session, no state change, no data served), while the legitimate flow still works.\n';
    }
    for (const t of list.slice().sort((a, b) => order[a.difficulty] - order[b.difficulty])) {
      prac += '\n### [' + t.difficulty + '] ' + t.name + '\n- Objective: prove the flaw at ' + t.where + ' — the test flips on the Mission Board only when the real effect happens.\n- Hints:\n  1. ' + t.hints[0] + '\n  2. ' + t.hints[1] + '\n  3. ' + t.hints[2] + '\n';
    }
  }
  fs.writeFileSync(path.join(ROOT, 'VULNERABILITIES.md'), vuln);
  fs.writeFileSync(path.join(ROOT, 'PRACTICE-GUIDE.md'), prac);
  fs.writeFileSync(path.join(ROOT, 'FIX-AND-RETEST.md'), fix);
  console.log('docs generated for', TESTS.length, 'tests across', FEATURES.length, 'features');
}

if (process.argv.includes('--gen-docs')) { genDocs(); process.exit(0); }

const server = http.createServer((req, res) => {
  handle(req, res).catch(() => { try { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('internal error'); } catch (e) {} });
});
server.listen(PORT, '127.0.0.1', () => console.log(LAB_NAME + ' (LAB ' + LAB_NUMBER + ') listening on http://127.0.0.1:' + PORT));
