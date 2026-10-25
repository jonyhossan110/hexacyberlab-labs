'use strict';
/* HexaDataHub — LAB 28 (Category 3: API & Developer Platforms)
   A deliberately vulnerable data platform for authorised local training only.
   Zero-dependency Node.js. Binds 127.0.0.1:3037. NEVER deploy publicly. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB_NUMBER = 28;
const LAB_NAME = 'HexaDataHub';
const PORT = 3037;
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');

/* ---- key material: stored ONLY as base64-of-reversed shards, scattered ---- */

const _un = a => a.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');

/* ============================== TEST REGISTRY ============================== */
const TESTS = [
  /* ---- Login & Authentication ---- */
  { id: 'sqli-login', feature: 'Login & Authentication', name: 'SQL Injection — Login Bypass', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['The login form builds its database query by gluing your input straight into the query text.', 'Think about making the email condition true for every row — quotes plus a logical OR.', "Use email: ' OR '1'='1' --  with any password. The -- comments out the password check and the first account matches."],
    lesson: 'String-built queries let an attacker rewrite the login logic itself — no password is needed when the query can be made to lie.',
    impact: 'On a client platform this is a full account takeover of the first matching account — often an admin — with nothing but a text field.',
    report: { title: 'SQL Injection in Login Form', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.' },
    guide: "Step by step: 1) Open the login form. 2) In Email enter: ' OR '1'='1' --  3) Enter any password and submit. The query's email condition becomes true for the first user row and the password check is commented out, so you are logged in without knowing any password." },
  { id: 'brute-force', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limit or Lockout', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['Nothing on the login form mentions attempt limits or CAPTCHAs.', 'Try a handful of wrong passwords for one account and watch whether anything slows down or locks.', 'Submit 10 or more wrong passwords for alice@acme.test — the 10th failure is still processed instantly. There is no throttle at all.'],
    lesson: 'Without rate limiting, lockout or MFA, password guessing is only a matter of time and a wordlist.',
    impact: 'Attackers can grind through common-password lists against real customer accounts; the client discovers it only after accounts are taken over.',
    report: { title: 'No Brute-Force Protection on Login', severity: 'High', remediation: 'Add per-account and per-IP rate limiting, progressive delays / lockout, and MFA.' },
    guide: 'Step by step: 1) Pick a real account, e.g. alice@acme.test. 2) Submit the login form with a wrong password. 3) Repeat at least 10 times. Every failure is accepted for processing — no lockout, no delay, no CAPTCHA.' },
  { id: 'user-enumeration', feature: 'Login & Authentication', name: 'User Enumeration via Error Messages', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare what the app says for an email that exists versus one that does not.', 'Try both the login form and the forgot-password form with a real and a fake email.', 'Login with a real email + wrong password says "Incorrect password"; a fake email says "No account found". Forgot-password answers differently too — the app confirms which emails are registered.'],
    lesson: 'Different error messages for "no such user" and "wrong password" hand attackers a free list of valid accounts to target.',
    impact: 'Attackers harvest valid customer email addresses, then aim phishing and password-spraying only at accounts that definitely exist.',
    report: { title: 'Account Enumeration via Authentication Responses', severity: 'Medium', remediation: 'Return one generic message ("Invalid email or password") for all authentication failures.' },
    guide: 'Step by step: 1) Log in with a fake email (nobody@nowhere.test) and read the error. 2) Log in with alice@acme.test and a wrong password and read the different error. 3) Do the same pair on the forgot-password form. The differing answers reveal which emails have accounts.' },
  { id: 'default-creds', feature: 'Login & Authentication', name: 'Default Demo Credentials Still Active', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['The login page itself is generous with information for new visitors.', 'Look for a demo / trial account mentioned anywhere on the login page.', 'The login page prints the demo account demo@datahub.io with password demo1234. It is a real, working account.'],
    lesson: 'Demo, default and vendor-supplied credentials are the first thing attackers try — and they are printed in every wordlist.',
    impact: 'Anyone on the internet can walk into a live account; if that account has data access, the client has a breach on day one.',
    report: { title: 'Active Default / Demo Credentials', severity: 'High', remediation: 'Remove demo accounts from production, force unique credentials, and rotate any vendor defaults.' },
    guide: 'Step by step: 1) Read the hint box on the login page. 2) Log in with the printed demo credentials (demo@datahub.io / demo1234). 3) You are inside a real account with workspace access — credentials that were never changed.' },
  { id: 'reset-token', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07:2021 Authentication Failures', difficulty: 'Intermediate',
    hints: ['Ask for a password reset and study the token in the reset link closely.', 'The token looks familiar — compare it with the email address it was issued for.', 'The token is simply the account email encoded in base64. Encode any victim email the same way, open /reset?token=<that value>, and set a new password.'],
    lesson: 'A reset token must be a random secret. If it can be derived from public data like an email address, anyone can reset anyone\u2019s password.',
    impact: 'Full takeover of any account — including admins — knowing only the victim\u2019s email address, which is usually public.',
    report: { title: 'Predictable Password Reset Token', severity: 'Critical', remediation: 'Generate reset tokens with a CSPRNG, store them hashed, expire them quickly, and bind them to a single use.' },
    guide: "Step by step: 1) Note that the reset link's token is the account email in base64. 2) Take a victim email, e.g. alice@acme.test, and base64-encode it. 3) Open /reset?token=<encoded value>. 4) Set a new password — you never needed the email inbox." },
  { id: 'cookie-tamper', feature: 'Login & Authentication', name: 'Session Cookie Tampering — Role Forgery', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Inspect the hx_session cookie after logging in — what is inside it, and who signed it?', 'The cookie is just encoded JSON, and nothing checks its integrity.', 'Decode the cookie (base64), change "role" to "admin", re-encode it, and visit /admin. The server trusts the role you hand it.'],
    lesson: 'Trusting client-supplied session data without a signature lets users promote themselves to any role.',
    impact: 'Any customer can become a platform administrator — user lists, passwords and destructive actions included — by editing one cookie.',
    report: { title: 'Unsigned Session Cookie Allows Role Forgery', severity: 'Critical', remediation: 'Sign session tokens (HMAC) or keep session state server-side; always re-check roles from the server-side account record.' },
    guide: 'Step by step: 1) Log in as any normal user. 2) Copy the hx_session cookie and base64-decode it — it is plain JSON with a role field. 3) Change role to "admin", re-encode, and replace the cookie. 4) Open /admin — the server believes your forged role.' },

  /* ---- Registration & Profile ---- */
  { id: 'weak-password', feature: 'Registration & Profile', name: 'Weak Password Policy at Registration', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a new account and be lazy about the password.', 'Does the form complain about a very short password?', 'A one-character password ("a") is accepted. There is no length or complexity policy at all.'],
    lesson: 'If users may choose one-character passwords, credential stuffing and guessing succeed almost immediately.',
    impact: 'Customer accounts fall to the simplest guessing attacks; the client carries the breach-notification and trust cost.',
    report: { title: 'No Password Policy on Registration', severity: 'Medium', remediation: 'Enforce a minimum length (12+), screen against known-breached passwords, and offer MFA.' },
    guide: 'Step by step: 1) Open the registration form. 2) Create an account with the password "a" (one character). 3) The account is created and works — no policy stopped you.' },
  { id: 'mass-assignment', feature: 'Registration & Profile', name: 'Mass Assignment — Self-Made Admin', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration endpoint binds whatever fields you send to the new account record.', 'What fields does an account have that the form never shows? Think about role.', 'Send the registration POST with an extra field role=admin (curl or devtools). The account is created as a platform admin.'],
    lesson: 'Binding request bodies directly to data models lets attackers set fields the UI never offered — role, plan, balance.',
    impact: 'Attackers mint their own admin accounts on a client platform: total compromise without touching the login form.',
    report: { title: 'Mass Assignment in Registration Allows Admin Creation', severity: 'Critical', remediation: 'Allow-list exactly the fields each endpoint may set; never bind privileged fields from request input.' },
    guide: 'Step by step: 1) Intercept or craft the registration request (curl works). 2) Add the extra form field role=admin to the normal name/email/password fields. 3) Submit. 4) Log in — the new account has the admin role and can open /admin.' },
  { id: 'stored-xss-profile', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Your display name appears on more pages than your own profile — the Team page shows every member.', 'Names are rendered exactly as typed, with no output encoding.', 'Set your display name to <script>alert(1)</script> (or an <img onerror> payload) and open the Team page: the payload is stored and served to everyone.'],
    lesson: 'Any user-controlled text rendered without encoding becomes stored XSS — it fires in other users\u2019 browsers, including admins.',
    impact: 'Attackers can hijack sessions and actions of staff who merely open a team or admin page on the client\u2019s platform.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-encode all user-controlled output and validate input; deploy a restrictive Content-Security-Policy.' },
    guide: 'Step by step: 1) Go to your Profile. 2) Set the display name to a script payload such as <script>alert(document.domain)</script>. 3) Save and open the Team page. 4) Your payload was stored in the account record and is rendered raw to every viewer.' },
  { id: 'profile-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The profile form changes your email and name — what proves the request came from the app\u2019s own page?', 'There is no anti-CSRF token in the form, and the server ignores where the request came from.', 'While logged in, submit the profile form from a different origin (or with no origin/marker at all). The change is applied anyway.'],
    lesson: 'State-changing forms without CSRF tokens let any website a victim visits silently rewrite their account.',
    impact: 'Attackers change a customer\u2019s email, then use password reset to take the account over completely.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'High', remediation: 'Require unpredictable per-session CSRF tokens on all state-changing requests and verify Origin/Referer.' },
    guide: 'Step by step: 1) Log in. 2) Send the profile-update POST from outside the app — e.g. curl with header Origin: https://evil.example and a new email/name. 3) The server applies the change: no token was required and the foreign origin was ignored.' },

  /* ---- Workspaces & Members ---- */
  { id: 'workspace-idor', feature: 'Workspaces & Members', name: 'Cross-Workspace IDOR — Rival Workspace Settings', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Your workspace has an ID in its URL. Other companies have workspaces too.', 'The settings page checks that you are logged in — but does it check that the workspace is yours?', 'Open /workspaces/2 while logged into workspace 1. A rival company\u2019s settings and member list are served to you.'],
    lesson: 'Checking "is someone logged in" is not authorisation. Every object access must verify the caller belongs to that tenant.',
    impact: 'In multi-tenant SaaS, one IDOR exposes every customer\u2019s workspace — names, members, plans — to every other customer.',
    report: { title: 'Broken Access Control on Workspace Pages (IDOR)', severity: 'High', remediation: 'Verify tenant membership server-side for every workspace-scoped route and object.' },
    guide: 'Step by step: 1) Log in as a member of workspace 1 and open your workspace page — note the ID in the URL. 2) Change the ID to 2. 3) The other company\u2019s workspace settings and member list load, although you are not a member.' },
  { id: 'invite-abuse', feature: 'Workspaces & Members', name: 'Invite Link Abuse — Sequential Tokens, No Email Binding', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Workspace invites are links. Look at the shape of an invite link for your own workspace.', 'The tokens look sequential — and the accept page never asks whether the invite was meant for you.', 'Open /invite/inv-1 while logged in as someone the invite was never sent to. You are added to that workspace instantly.'],
    lesson: 'Invite links must be unguessable and bound to the invited email; a sequential token anyone can open is an open door.',
    impact: 'Outsiders enumerate invite links and quietly join client workspaces, reading every dataset inside them.',
    report: { title: 'Guessable, Unbound Workspace Invite Tokens', severity: 'High', remediation: 'Use random, expiring invite tokens bound to the invited email address; require acceptance by that account.' },
    guide: 'Step by step: 1) Look at an invite link on a workspace page — the token pattern is inv-<number>. 2) Log in as a user who was never invited to workspace 2. 3) Open /invite/inv-1. 4) You are now a member of workspace 2 — the invite was addressed to a different email and still worked.' },

  /* ---- Datasets ---- */
  { id: 'dataset-idor', feature: 'Datasets', name: 'Cross-Workspace Dataset IDOR', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Dataset pages have IDs in the URL, and datasets belong to workspaces.', 'Try opening a dataset that belongs to the other company.', 'Open /datasets/3 while logged into workspace 1: the other tenant\u2019s full dataset — every row — is served.'],
    lesson: 'Object-level authorisation must be checked on every single record, not just on list pages.',
    impact: 'Tenant data isolation fails: one customer reads another customer\u2019s entire datasets, row by row — a reportable data breach.',
    report: { title: 'Broken Object-Level Authorisation on Dataset View (IDOR)', severity: 'Critical', remediation: 'Scope every dataset query by the caller\u2019s workspace membership; return 404 for objects outside it.' },
    guide: 'Step by step: 1) Log in as a workspace 1 user. 2) Open /datasets/1 (yours) and note the URL pattern. 3) Change the ID to 3 — a dataset owned by workspace 2. 4) The full dataset, including sensitive rows, is displayed.' },
  { id: 'dataset-rename-idor', feature: 'Datasets', name: 'Dataset Rename by Non-Member', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Viewing is not the only thing missing a check — look at what you can change on someone else\u2019s dataset.', 'The rename form on a dataset page posts to an endpoint that never verifies ownership.', 'While viewing the other workspace\u2019s dataset (ID 3), use its rename form. The new name is saved — you modified a rival tenant\u2019s data.'],
    lesson: 'Read-only IDOR is bad; write IDOR lets attackers vandalise or ransom another tenant\u2019s data.',
    impact: 'Attackers alter or deface other customers\u2019 datasets, destroying trust and data integrity on the platform.',
    report: { title: 'Missing Authorisation on Dataset Rename (Write IDOR)', severity: 'High', remediation: 'Enforce the same membership/ownership checks on mutating endpoints as on reads; log cross-tenant attempts.' },
    guide: 'Step by step: 1) Open the other workspace\u2019s dataset (/datasets/3) as an outsider. 2) Use the rename form on that page with any new name. 3) Submit — the dataset now carries your name. The endpoint never checked that you belong to its workspace.' },
  { id: 'dataset-delete-idor', feature: 'Datasets', name: 'Dataset Deletion by Outsider', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['If rename lacks a check, what about the most destructive action on the page?', 'The delete endpoint trusts any logged-in user — even one from a different workspace.', 'As a workspace 1 user, POST the delete for dataset 4 (owned by workspace 2). It is permanently deleted.'],
    lesson: 'Destructive endpoints need the strictest authorisation of all — and soft-delete/audit trails for recovery.',
    impact: 'A rival or malicious user wipes other customers\u2019 datasets: data loss, downtime and contractual fallout for the client.',
    report: { title: 'Missing Authorisation on Dataset Deletion', severity: 'Critical', remediation: 'Restrict deletion to dataset/workspace owners, add confirmation, soft-delete and an audit log.' },
    guide: 'Step by step: 1) Note a dataset owned by the other workspace (ID 4). 2) While logged in as a workspace 1 user, send its delete POST (the button on its page works, even for outsiders). 3) The dataset is gone — deletion never verified ownership.' },

  /* ---- Imports ---- */
  { id: 'formula-injection', feature: 'Imports', name: 'CSV Formula Injection via Import', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Imported CSV cells are stored exactly as written — think about what a spreadsheet does with a cell that starts with a special character.', 'Cells beginning with = + - or @ are treated as formulas when the data is opened in Excel or Sheets.', 'Import a CSV containing a cell like =2+5+cmd|\u2019 /C calc\u2019!A0. It is stored and later exported verbatim — a formula waiting to execute on a victim\u2019s machine.'],
    lesson: 'CSV is code to a spreadsheet. Unsanitised cells starting with =, +, - or @ become formulas that run when anyone opens the export.',
    impact: 'A client\u2019s staff open a routine export and the embedded formula executes commands or exfiltrates data from their workstations.',
    report: { title: 'CSV / Formula Injection in Imported Data', severity: 'High', remediation: 'Neutralise cells starting with =, +, -, @ (and tab/CR) on import and export by prefixing a single quote.' },
    guide: 'Step by step: 1) Prepare a small CSV whose second column starts with a formula character, e.g. =2+5+cmd|\u2019 /C calc\u2019!A0. 2) Import it via the Imports page into your workspace. 3) View or export the dataset — the formula cell is stored and served verbatim, ready to fire in a spreadsheet.' },
  { id: 'import-traversal', feature: 'Imports', name: 'Import Path Traversal — Reading Server Files', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The import form offers "import from a server path" for power users. Paths are joined to an uploads folder…', '…but nothing stops the path from walking back out of that folder.', 'Set the source path to ../server.js. The importer reads the application\u2019s own source code and turns it into a dataset.'],
    lesson: 'Joining user input to a base directory without normalising and verifying the result is textbook path traversal.',
    impact: 'Attackers read source code, configuration and secrets from the client\u2019s server — the first step to a full compromise.',
    report: { title: 'Path Traversal in File Import', severity: 'Critical', remediation: 'Resolve the final path and verify it stays inside the allowed directory; reject .. and absolute paths.' },
    guide: 'Step by step: 1) Open the Imports page. 2) In "server path" enter ../server.js and import. 3) A dataset appears whose rows are the lines of the application source code — the path escaped the uploads folder.' },
  { id: 'import-xxe', feature: 'Imports', name: 'XML External Entity (XXE) in Dataset Import', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Advanced',
    hints: ['The importer also accepts XML datasets — and its parser is old-school trusting.', 'XML lets a document declare entities, including ones that point at files on the server.', 'Import an XML file whose DOCTYPE declares <!ENTITY xxe SYSTEM "file:///etc/passwd"> (or the lab\u2019s server.js) and reference &xxe; in a cell. The file\u2019s contents land inside your dataset.'],
    lesson: 'XML parsers must have DTDs and external entities disabled; otherwise a data file becomes a file-read primitive.',
    impact: 'Attackers upload a "dataset" and walk away with server configuration, credentials files and source code.',
    report: { title: 'XML External Entity Injection in Import', severity: 'Critical', remediation: 'Disable DTD processing / external entities in the XML parser, or reject DOCTYPE declarations outright.' },
    guide: 'Step by step: 1) Craft an XML dataset with a DOCTYPE declaring an external entity pointing at file:///etc/passwd (or file://../server.js style paths the parser accepts). 2) Put &xxe; as a cell value. 3) Import it and open the dataset — the referenced file\u2019s contents are inside the rows.' },

  /* ---- Exports & API ---- */
  { id: 'export-idor', feature: 'Exports & API', name: 'Cross-Workspace Dataset Export', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Exports turn a dataset into a downloadable CSV. Whose datasets can you export?', 'The export endpoint repeats the view page\u2019s mistake — no tenant check.', 'Open /datasets/3/export as a workspace 1 user: the other company\u2019s complete dataset downloads as CSV.'],
    lesson: 'Bulk endpoints amplify IDOR: one request takes every row, not just the page you can see.',
    impact: 'Full exfiltration of another tenant\u2019s data in a single click — exactly what breach notifications are made of.',
    report: { title: 'Broken Access Control on Dataset Export (Bulk IDOR)', severity: 'Critical', remediation: 'Apply the same tenant scoping to exports as to views; audit and alert on bulk downloads.' },
    guide: 'Step by step: 1) Log in as a workspace 1 user. 2) Open /datasets/3/export — dataset 3 belongs to workspace 2. 3) A CSV with every row of the rival tenant\u2019s dataset downloads.' },
  { id: 'weak-api-key', feature: 'Exports & API', name: 'Predictable API Key — Derived from Email', owasp: 'A07:2021 Authentication Failures', difficulty: 'Intermediate',
    hints: ['Your API page shows your key. Study its format — where have you seen that string before?', 'The key is a prefix plus your email address, encoded. Nothing random is involved.', 'Take any user\u2019s email, base64-encode it, prefix it like the docs show, and call /api/datasets with header x-api-key — no login needed. You are authenticated as them.'],
    lesson: 'API keys must be unguessable random secrets. A key derived from a public identifier is not a credential at all.',
    impact: 'Anyone who knows a customer\u2019s email — public information — gets full API access to their account and data.',
    report: { title: 'Predictable API Keys Derived from Email Addresses', severity: 'Critical', remediation: 'Generate API keys from a CSPRNG, store only hashes, and support rotation and revocation.' },
    guide: 'Step by step: 1) Open the API page and note your key\u2019s format: dh_ followed by your base64-encoded email. 2) Take another user\u2019s email (carol@globex.test) and build the same string. 3) Call /api/datasets with header x-api-key set to it, with no session cookie. 4) The API answers as that user.' },
  { id: 'api-bola', feature: 'Exports & API', name: 'API Broken Object-Level Authorisation — Workspace Parameter', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The API accepts a workspace parameter to choose whose data to return.', 'Your key proves who you are — but does the API check that the workspace you ask for is yours?', 'Call /api/datasets?workspace=2 with workspace 1\u2019s key. The other tenant\u2019s datasets come back.'],
    lesson: 'Authentication is not authorisation: every API parameter selecting data must be checked against the caller\u2019s tenancy.',
    impact: 'Any API customer can pull every other tenant\u2019s datasets by changing one number — silent, scriptable mass exfiltration.',
    report: { title: 'Broken Object-Level Authorisation in API (BOLA)', severity: 'Critical', remediation: 'Ignore client-supplied tenant IDs or verify membership for each; scope queries by the authenticated key\u2019s workspaces.' },
    guide: 'Step by step: 1) Use your own valid API key (workspace 1). 2) Call /api/datasets?workspace=2. 3) The response contains workspace 2\u2019s datasets although your key has no rights there — the parameter was trusted blindly.' },

  /* ---- Sharing ---- */
  { id: 'guessable-share', feature: 'Sharing', name: 'Guessable Public Share Links', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Shared datasets live under /s/<token>. Real share tokens are random — but old links never die.', 'A legacy alias pattern still works for every dataset, shared or not.', 'Open /s/share-3 in a private window (no login). Dataset 3 is served publicly — the "token" is just its ID.'],
    lesson: 'Public links are capabilities: if the URL can be guessed, the data is effectively public.',
    impact: 'Every dataset on the platform — shared or not — is readable by anyone on the internet who can count.',
    report: { title: 'Predictable Share-Link Tokens Expose All Datasets', severity: 'High', remediation: 'Use long random tokens for share links, remove ID-based aliases, and let owners revoke links.' },
    guide: 'Step by step: 1) Log out or open a private window. 2) Visit /s/share-3. 3) The full dataset is shown with no login and no real share token — the legacy pattern share-<id> works for every dataset ID.' },
  { id: 'share-enumeration', feature: 'Sharing', name: 'Share-Link Enumeration — No Rate Limit', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['What happens when you try share tokens that do not exist? Anything slow you down?', 'The share endpoint answers hit-or-miss questions forever, as fast as you can ask.', 'Probe 5 or more different /s/<token> values in a minute. Nothing throttles you — an attacker can sweep the whole token space this way.'],
    lesson: 'Endpoints that resolve tokens need rate limits and uniform errors, or guessing attacks become enumeration scanners.',
    impact: 'Attackers script the share endpoint to map and harvest every publicly reachable dataset on the platform.',
    report: { title: 'No Rate Limiting on Share-Link Resolution', severity: 'Medium', remediation: 'Rate-limit token resolution per IP, return uniform 404s, and alert on probing patterns.' },
    guide: 'Step by step: 1) Pick any 5 different token values, existing or not. 2) Request /s/<token> for each within a minute. 3) Every request is answered immediately — hit vs miss is distinguishable and nothing limits the probing.' },

  /* ---- Search ---- */
  { id: 'reflected-xss', feature: 'Search', name: 'Reflected XSS in Dataset Search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The dataset search repeats your query back on the results page.', 'It repeats it exactly as typed — try asking it to say something with angle brackets.', 'Search for <script>alert(1)</script>: the payload is reflected into the page unescaped and executes.'],
    lesson: 'Reflected user input must be output-encoded; search boxes are a classic XSS entry point.',
    impact: 'Attackers send crafted search links to staff; one click runs script in the victim\u2019s session on the client\u2019s domain.',
    report: { title: 'Reflected Cross-Site Scripting in Search', severity: 'High', remediation: 'Context-encode all reflected values and validate search input.' },
    guide: 'Step by step: 1) Open the Datasets page search. 2) Search for <script>alert(document.domain)</script>. 3) The results page includes your payload verbatim in the HTML — it executes in the browser.' },

  /* ---- Admin & Platform ---- */
  { id: 'admin-csrf', feature: 'Admin & Platform', name: 'CSRF on Admin User Deletion', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The admin panel can delete users with a single form post.', 'Like other forms here, it carries no anti-CSRF token and ignores request origin.', 'While an admin session exists, fire the delete POST from a foreign origin. The user is deleted — no token was ever checked.'],
    lesson: 'Privileged actions are the highest-value CSRF targets; one malicious page visit can delete accounts.',
    impact: 'An attacker lures one admin to a booby-trapped page and deletes users — sabotage with the admin\u2019s own authority.',
    report: { title: 'Missing CSRF Protection on Admin Actions', severity: 'High', remediation: 'Require CSRF tokens and same-site cookies for all admin state changes; re-confirm destructive actions.' },
    guide: 'Step by step: 1) Have an admin session (real admin, or the forged-cookie one). 2) Send the /admin/users/<id>/delete POST with a foreign Origin header (or none of the app\u2019s markers) via curl. 3) The user is deleted — the request\u2019s origin was never verified.' },
  { id: 'debug-exposure', feature: 'Admin & Platform', name: 'Debug Endpoint Exposes All Users and Passwords', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Development leftovers often survive into production under predictable paths.', 'Think /api/debug, /debug, /backup — try the API\u2019s debug route.', 'Open /api/debug with no login at all: it dumps every user (with passwords), every workspace and dataset metadata as JSON.'],
    lesson: 'Debug and diagnostics endpoints must never ship to production — they bypass every other control at once.',
    impact: 'One unauthenticated URL hands attackers every customer\u2019s credentials — instant platform-wide compromise.',
    report: { title: 'Unauthenticated Debug Endpoint Discloses Credentials', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; gate diagnostics behind admin auth and network restrictions.' },
    guide: 'Step by step: 1) Log out completely. 2) Open /api/debug. 3) The JSON response lists every user including plaintext passwords, plus workspaces and datasets — no authentication was requested.' },
];
const TOTAL = TESTS.length;
const FEATURES = [...new Set(TESTS.map(t => t.feature))];

/* ============================== SEEDED DATA ============================== */
let nextUserId = 7, nextDatasetId = 5, nextWorkspaceId = 3;
const users = [
  { id: 1, name: 'Platform Admin', email: 'admin@datahub.io', password: 'admin123', role: 'admin' },
  { id: 2, name: 'Alice Rahman', email: 'alice@acme.test', password: 'alice123', role: 'user' },
  { id: 3, name: 'Bob Chen', email: 'bob@acme.test', password: 'bob123', role: 'user' },
  { id: 4, name: 'Carol Diaz', email: 'carol@globex.test', password: 'carol123', role: 'user' },
  { id: 5, name: 'Dave Osei', email: 'dave@globex.test', password: 'dave123', role: 'user' },
  { id: 6, name: 'Demo User', email: 'demo@datahub.io', password: 'demo1234', role: 'user' },
];
const workspaces = [
  { id: 1, name: 'Acme Analytics', ownerId: 2, plan: 'Pro', members: { 2: 'owner', 3: 'editor', 6: 'viewer' } },
  { id: 2, name: 'Globex Data Co', ownerId: 4, plan: 'Free', members: { 4: 'owner', 5: 'editor' } },
];
let datasets = [
  { id: 1, workspaceId: 1, ownerId: 2, name: 'Q3 Sales Pipeline', columns: ['customer', 'email', 'deal_value', 'status'],
    rows: [['Northwind Traders', 'ops@northwind.example', '18400', 'won'], ['Contoso Retail', 'it@contoso.example', '9200', 'open'], ['Fabrikam GmbH', 'hello@fabrikam.example', '27150', 'won'], ['Tailspin Toys', 'admin@tailspin.example', '4300', 'lost']] },
  { id: 2, workspaceId: 1, ownerId: 2, name: 'Support Ticket Export', columns: ['ticket', 'customer', 'priority', 'summary'],
    rows: [['T-1001', 'Northwind Traders', 'high', 'Export failing for large files'], ['T-1002', 'Contoso Retail', 'low', 'Password reset loop'], ['T-1003', 'Fabrikam GmbH', 'medium', 'API key rotation question']] },
  { id: 3, workspaceId: 2, ownerId: 4, name: 'Patient Intake Records', columns: ['patient', 'email', 'diagnosis', 'doctor'],
    rows: [['J. Meyer', 'jmeyer@example.org', 'Type 2 diabetes', 'Dr. Ruiz'], ['A. Novak', 'anovak@example.org', 'Hypertension', 'Dr. Chen'], ['S. Patel', 'spatel@example.org', 'Asthma', 'Dr. Ruiz']] },
  { id: 4, workspaceId: 2, ownerId: 4, name: 'Product Telemetry Events', columns: ['device', 'event', 'firmware', 'count'],
    rows: [['sensor-881', 'heartbeat', '2.4.1', '1440'], ['sensor-882', 'error:E17', '2.4.1', '3'], ['gateway-12', 'sync', '5.0.0', '288']] },
];
const invites = [
  { token: 'inv-1', workspaceId: 2, email: 'partner@globex.test', usedBy: null },
  { token: 'inv-2', workspaceId: 1, email: 'newhire@acme.test', usedBy: null },
];
const shares = {}; // token -> datasetId (random tokens created via UI)
const enumFlags = { noAccount: false, wrongPassword: false };
const loginFailures = {}; // email -> count
const shareProbes = []; // {token, at}

/* ============================== PROGRESS ============================== */
let state = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadState() {
  try { if (fs.existsSync(PROGRESS_FILE)) state = Object.assign(state, JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'))); } catch (e) {}
}
function saveState() { try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2)); } catch (e) {} }
function pass(id) {
  if (!TESTS.find(t => t.id === id)) return;
  if (!state.tests[id]) {
    state.tests[id] = true;
    const done = Object.keys(state.tests).length;
    if (done >= TOTAL && !state.completedAt) { state.completedAt = new Date().toISOString(); state.keyRevealed = true; }
    saveState();
  }
}
function attempt(feature) { state.attempts[feature] = (state.attempts[feature] || 0) + 1; saveState(); }
function doneCount() { return Object.keys(state.tests).length; }
function pct() { return Math.floor(doneCount() / TOTAL * 100); }
loadState();

/* more key material (completion) — first half lives here, rest near the end */
const _c1 = ["TC1YSA==", "My05Mg==", "Rk8wMQ=="];

/* ============================== HELPERS ============================== */
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const XSS_RE = /(<script|onerror\s*=|onload\s*=|<svg|<img[^>]*onerror|<iframe)/i;
function parseBody(req) {
  return new Promise(res => {
    let b = ''; req.on('data', c => { b += c; if (b.length > 2e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) { try { return res(JSON.parse(b || '{}')); } catch (e) { return res({}); } }
      const o = {}; for (const [k, v] of new URLSearchParams(b)) o[k] = v; res(o);
    });
    req.on('error', () => res({}));
  });
}
function cookies(req) { const o = {}; (req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) o[p.slice(0, i).trim()] = p.slice(i + 1).trim(); }); return o; }
function session(req) {
  const raw = cookies(req).hx_session; if (!raw) return null;
  try { const j = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')); const u = users.find(x => x.id === j.uid); if (!u) return null; return { user: u, role: j.role || u.role, raw: j }; } catch (e) { return null; }
}
function setSession(res, u) {
  const v = Buffer.from(JSON.stringify({ uid: u.id, role: u.role })).toString('base64');
  res.setHeader('Set-Cookie', [`hx_session=${v}; Path=/; HttpOnly`, 'hx_marker=dhub28; Path=/']);
}
function isCsrf(req) {
  const o = req.headers.origin, r = req.headers.referer, host = req.headers.host;
  if (o) { try { if (new URL(o).host !== host) return true; } catch (e) { return true; } }
  if (r) { try { if (new URL(r).host !== host) return true; } catch (e) {} }
  if (!cookies(req).hx_marker) return true;
  return false;
}
const memberOf = (uid, wsId) => { const w = workspaces.find(x => x.id === wsId); return w && w.members[uid] ? w : null; };
const myWorkspaces = uid => workspaces.filter(w => w.members[uid]);
const apiKeyFor = u => 'dh_' + Buffer.from(u.email).toString('base64');
const resetTokenFor = email => Buffer.from(email).toString('base64');

/* naive string-built "SQL" login evaluator — the vulnerability is the point */
function evalAtom(atom, row) {
  const m = atom.trim().match(/^('([^']*)'|([A-Za-z_][A-Za-z0-9_]*))\s*=\s*'([^']*)'$/);
  if (!m) return false;
  const left = m[2] !== undefined ? m[2] : row[m[3]];
  return String(left) === m[4];
}
function evalWhere(q, row) {
  return q.split(/\s+OR\s+/i).some(part => part.split(/\s+AND\s+/i).every(a => evalAtom(a, row)));
}
function sqlLogin(email, password) {
  let q = `email = '${email}' AND password = '${password}'`;
  const ci = q.indexOf('--'); if (ci >= 0) q = q.slice(0, ci);
  q = q.trim();
  for (const u of users) { try { if (evalWhere(q, u)) return u; } catch (e) {} }
  return null;
}

/* ============================== UI SHELL ============================== */
function progressBar() {
  const d = doneCount(), p = pct();
  return `<div style="background:#111827;color:#e5e7eb;padding:8px 14px;display:flex;gap:14px;align-items:center;font-family:monospace">
    <img src="/logo.png" style="height:26px"> <b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b>
    <span>${d}/${TOTAL} tests · ${p}%</span>
    <span style="flex:1;background:#374151;height:10px;border-radius:5px;overflow:hidden"><span style="display:block;height:100%;width:${p}%;background:linear-gradient(90deg,#2563eb,#9333ea)"></span></span>
    <a style="color:#93c5fd" href="/tests">Mission</a> <a style="color:#93c5fd" href="/complete">Debrief</a></div>`;
}
function chatWidget() {
  return `<div id="coach" style="position:fixed;right:14px;bottom:14px;width:320px;font-family:sans-serif;z-index:50">
  <div style="background:#111827;color:#fff;padding:8px 12px;border-radius:10px 10px 0 0;cursor:pointer" onclick="var b=document.getElementById('coachbody');b.style.display=b.style.display=='none'?'block':'none'">💬 Lab Coach</div>
  <div id="coachbody" style="display:none;background:#fff;border:1px solid #ddd;border-top:none;border-radius:0 0 10px 10px;padding:10px">
    <div id="coachlog" style="height:180px;overflow:auto;font-size:13px;margin-bottom:8px"></div>
    <form onsubmit="event.preventDefault();var i=document.getElementById('coachin');sendCoach(i.value);i.value=''">
      <input id="coachin" style="width:72%" placeholder="Ask the Lab Coach…"> <button>Send</button></form></div></div>
  <script>async function sendCoach(m){var l=document.getElementById('coachlog');l.innerHTML+='<div><b>You:</b> '+m.replace(/</g,'&lt;')+'</div>';try{var r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})});var j=await r.json();l.innerHTML+='<div style="margin:4px 0"><b>Coach:</b> '+j.reply.replace(/</g,'&lt;')+'</div>';}catch(e){l.innerHTML+='<div>Coach unavailable.</div>';}l.scrollTop=l.scrollHeight;}</script>`;
}
function page(res, title, body, status = 200) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} — ${LAB_NAME}</title></head>
  <body style="font-family:sans-serif;margin:0;background:#f8fafc;color:#0f172a">${progressBar()}
  <main style="max-width:980px;margin:24px auto;padding:0 16px">${body}</main>${chatWidget()}</body></html>`);
}
function gatePage(res) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html><html><head><meta charset="utf-8"><title>Locked — LAB ${LAB_NUMBER}</title></head>
  <body style="font-family:sans-serif;background:#0f172a;color:#e5e7eb;display:flex;justify-content:center;padding-top:10vh">
  <div style="max-width:480px;text-align:center"><img src="/logo.png" style="height:64px">
  <h1>LAB ${LAB_NUMBER} — ${LAB_NAME}</h1>
  <p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
  <form method="POST" action="/unlock"><input name="key" size="36" placeholder="Completion key from Lab ${LAB_NUMBER - 1}" style="padding:8px">
  <button style="padding:8px 16px">Unlock</button></form></div>${chatWidget()}</body></html>`);
}

/* ============================== CHATBOT ============================== */
const FEATURE_KEYS = {
  'Login & Authentication': ['login', 'auth', 'password', 'brute', 'reset token', 'session', 'cookie', 'enumerat', 'sqli', 'sql injection'],
  'Registration & Profile': ['register', 'registration', 'profile', 'sign up', 'signup', 'mass assignment', 'display name'],
  'Workspaces & Members': ['workspace', 'invite', 'member', 'tenant'],
  'Datasets': ['dataset', 'delete dataset', 'rename'],
  'Imports': ['import', 'csv', 'xml', 'xxe', 'upload', 'formula'],
  'Exports & API': ['export', 'api', 'api key', 'bola'],
  'Sharing': ['share', 'sharing', 'link'],
  'Search': ['search', 'reflected'],
  'Admin & Platform': ['admin', 'debug', 'platform'],
};
function findFeature(msg) {
  for (const f of FEATURES) { const ks = FEATURE_KEYS[f] || []; if (ks.some(k => msg.includes(k))) return f; if (msg.includes(f.toLowerCase())) return f; }
  return null;
}
function chatReply(message) {
  const msg = String(message || '').toLowerCase();
  const d = doneCount(), p = pct();
  if (/who (built|made|created)|founder|your creator/.test(msg)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (msg.includes('key') && (msg.includes('completion') || msg.includes('next') || msg.includes('unlock') || msg.includes('the key') || msg.includes('give'))) {
    if (state.keyRevealed && d >= TOTAL) return `You earned it — the completion key for this lab is: ${completionKey()} — paste it into Lab ${LAB_NUMBER + 1} to unlock it.`;
    return `I don't have the completion key yet — I only receive it when this lab is completed. Right now you are at ${p}% (${d}/${TOTAL} tests). Finish all the tests and I'll be able to share it.`;
  }
  const f = findFeature(msg);
  if (f && (/how many|count|list|which|vulnerabilit|tests in|what tests/.test(msg))) {
    const ts = TESTS.filter(t => t.feature === f);
    return `${f} has ${ts.length} tests: ${ts.map(t => t.name + (state.tests[t.id] ? ' ✓' : '')).join('; ')}. Ask me "how do I test ${f}" after you've tried it a few times and I'll guide you step by step.`;
  }
  if (f && (/how|guide|help|step|hint|stuck|do the|test /.test(msg))) {
    const att = state.attempts[f] || 0;
    const anyPassed = TESTS.some(t => t.feature === f && state.tests[t.id]);
    if (att >= 3 || anyPassed) {
      const ts = TESTS.filter(t => t.feature === f && !state.tests[t.id]);
      if (!ts.length) return `You've already completed every test in ${f}. Well done!`;
      return ts.map(t => `• ${t.name}: ${t.guide}`).join('\n');
    }
    return `That feature is locked for help. First try the ${f} tests yourself at least 3 times — I can see you've tried ${att} time(s) so far. After 3 real tries, ask me again and I'll guide you step by step.`;
  }
  if (/progress|how am i|score|percent/.test(msg)) return `You are at ${p}% — ${d} of ${TOTAL} tests complete across ${FEATURES.length} features. Open /tests to see what's left.`;
  if (/feature|how many tests|total/.test(msg)) return `This lab has ${FEATURES.length} features and ${TOTAL} tests: ${FEATURES.map(x => { const n = TESTS.filter(t => t.feature === x).length; return `${x} (${n})`; }).join(', ')}. Start on /tests — each test shows graded hints.`;
  if (/hello|hi|hey/.test(msg)) return `Hello! I'm the Lab Coach for LAB ${LAB_NUMBER} — ${LAB_NAME}. You are at ${p}% (${d}/${TOTAL}). Pick an open test on /tests, try it at least 3 times, then ask me how it works and I'll guide you step by step.`;
  const next = TESTS.find(t => !state.tests[t.id]);
  return `I can explain this lab's features and test counts freely, and give step-by-step help for a feature once you've tried it at least 3 times. ${next ? `A good next step: "${next.name}" in ${next.feature} — see /tests for its hints.` : 'Everything is complete — see /complete for your debrief and key.'}`;
}

/* ============================== SERVER ============================== */
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://127.0.0.1:' + PORT);
    const pth = u.pathname;
    const sess = session(req);
    const send = (code, body, type = 'application/json') => { res.writeHead(code, { 'Content-Type': type }); res.end(typeof body === 'string' ? body : JSON.stringify(body)); };

    if (pth === '/logo.png') { res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(fs.readFileSync(path.join(DIR, 'logo.png'))); }
    if (pth === '/api/progress') return send(200, { lab: LAB_NAME, number: LAB_NUMBER, total: TOTAL, done: doneCount(), pct: pct(), complete: doneCount() >= TOTAL, features: Object.fromEntries(FEATURES.map(f => [f, { total: TESTS.filter(t => t.feature === f).length, done: TESTS.filter(t => t.feature === f && state.tests[t.id]).length, attempts: state.attempts[f] || 0 }])) });
    if (pth === '/api/chat' && req.method === 'POST') { const b = await parseBody(req); return send(200, { reply: chatReply(b.message) }); }
    if (pth === '/unlock' && req.method === 'POST') {
      const b = await parseBody(req);
      const key = String(b.key || '').trim();
      if (key && entryKeyMatches(key)) { state.unlocked = true; saveState(); res.writeHead(302, { Location: '/' }); return res.end(); }
      res.writeHead(403, { 'Content-Type': 'text/html' }); return res.end('<h1>403 — That key was not accepted.</h1><p><a href="/">Back</a></p>');
    }
    if (!state.unlocked) return gatePage(res);

    /* ---------- public share links (no login) ---------- */
    if (pth.startsWith('/s/')) {
      attempt('Sharing');
      const token = decodeURIComponent(pth.slice(3));
      const now = Date.now();
      shareProbes.push({ token, at: now });
      while (shareProbes.length && now - shareProbes[0].at > 60000) shareProbes.shift();
      if (new Set(shareProbes.map(x => x.token)).size >= 5) pass('share-enumeration');
      let ds = null, viaAlias = false;
      if (shares[token]) ds = datasets.find(x => x.id === shares[token]);
      const m = token.match(/^share-(\d+)$/);
      if (!ds && m) { ds = datasets.find(x => x.id === Number(m[1])); viaAlias = !!ds; }
      if (!ds) { res.writeHead(404, { 'Content-Type': 'text/html' }); return res.end('<h1>404 — Share link not found.</h1>'); }
      if (viaAlias) pass('guessable-share');
      const rows = ds.rows.map(r => `<tr>${r.map(c => `<td style="border:1px solid #ccc;padding:4px 8px">${esc(c)}</td>`).join('')}</tr>`).join('');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`<!doctype html><html><body style="font-family:sans-serif;max-width:900px;margin:30px auto"><img src="/logo.png" style="height:30px"><h2>Shared dataset: ${esc(ds.name)}</h2><table style="border-collapse:collapse"><tr>${ds.columns.map(c => `<th style="border:1px solid #ccc;padding:4px 8px">${esc(c)}</th>`).join('')}</tr>${rows}</table><p style="color:#666">Shared via HexaDataHub</p></body></html>`);
    }

    /* ---------- debug exposure ---------- */
    if (pth === '/api/debug') { pass('debug-exposure'); return send(200, { debug: true, users, workspaces: workspaces.map(w => ({ id: w.id, name: w.name, plan: w.plan, members: w.members })), datasets: datasets.map(x => ({ id: x.id, workspaceId: x.workspaceId, name: x.name, rows: x.rows.length })) }); }

    /* ---------- API (key auth) ---------- */
    if (pth === '/api/datasets') {
      const key = req.headers['x-api-key'] || u.searchParams.get('api_key') || '';
      const owner = users.find(x => apiKeyFor(x) === key);
      if (!owner) return send(401, { error: 'Invalid API key' });
      attempt('Exports & API');
      if (!sess) pass('weak-api-key');
      const wsParam = Number(u.searchParams.get('workspace') || 0);
      let list;
      if (wsParam) {
        list = datasets.filter(x => x.workspaceId === wsParam);
        if (list.length && !memberOf(owner.id, wsParam)) pass('api-bola');
      } else list = datasets.filter(x => memberOf(owner.id, x.workspaceId));
      return send(200, { as: owner.email, datasets: list.map(x => ({ id: x.id, workspaceId: x.workspaceId, name: x.name, columns: x.columns, rows: x.rows })) });
    }

    /* ---------- auth ---------- */
    if (pth === '/login') {
      if (req.method === 'GET') return page(res, 'Login', `<h1>Log in to ${LAB_NAME}</h1>
        <form method="POST" style="display:grid;gap:8px;max-width:360px">
        <input name="email" placeholder="Email" required><input name="password" type="password" placeholder="Password" required>
        <button>Log in</button></form>
        <p><a href="/forgot">Forgot password?</a> · <a href="/register">Create an account</a></p>
        <div style="background:#fef9c3;border:1px solid #fde68a;padding:10px;max-width:420px"><b>Just visiting?</b> Try the demo account — email <code>demo@datahub.io</code>, password <code>demo1234</code>.</div>
        ${req.headers['x-msg'] ? '' : ''}<p style="color:#b91c1c">${esc(u.searchParams.get('e') || '')}</p>`);
      const b = await parseBody(req); attempt('Login & Authentication');
      const email = String(b.email || ''), password = String(b.password || '');
      const found = sqlLogin(email, password);
      if (found) {
        if (/('|--|'\s*or\s)/i.test(email + ' ' + password)) pass('sqli-login');
        if (email === 'demo@datahub.io' && password === 'demo1234') pass('default-creds');
        setSession(res, found); res.writeHead(302, { Location: '/' }); return res.end();
      }
      const exists = users.find(x => x.email === email);
      loginFailures[email] = (loginFailures[email] || 0) + 1;
      if (exists && loginFailures[email] >= 10) pass('brute-force');
      let msg;
      if (exists) { enumFlags.wrongPassword = true; msg = 'Incorrect password for this account.'; }
      else { enumFlags.noAccount = true; msg = 'No account found with that email address.'; }
      if (enumFlags.noAccount && enumFlags.wrongPassword) pass('user-enumeration');
      res.writeHead(302, { Location: '/login?e=' + encodeURIComponent(msg) }); return res.end();
    }
    if (pth === '/logout') { res.writeHead(302, { Location: '/login', 'Set-Cookie': 'hx_session=; Path=/; Max-Age=0' }); return res.end(); }
    if (pth === '/forgot') {
      if (req.method === 'GET') return page(res, 'Forgot password', `<h1>Reset your password</h1>
        <form method="POST" style="display:grid;gap:8px;max-width:360px"><input name="email" placeholder="Email" required><button>Send reset link</button></form>
        <p style="color:#065f46">${esc(u.searchParams.get('m') || '')}</p>`);
      const b = await parseBody(req); attempt('Login & Authentication');
      const email = String(b.email || '');
      const exists = users.find(x => x.email === email);
      let msg;
      if (exists) { enumFlags.existsForgot = true; msg = `Reset link sent! For this local lab, open: /reset?token=${resetTokenFor(email)}`; }
      else { enumFlags.noForgot = true; msg = 'No account found for that email address.'; }
      if (enumFlags.noAccount && enumFlags.wrongPassword) pass('user-enumeration');
      res.writeHead(302, { Location: '/forgot?m=' + encodeURIComponent(msg) }); return res.end();
    }
    if (pth === '/reset') {
      if (req.method === 'GET') return page(res, 'Reset password', `<h1>Set a new password</h1>
        <form method="POST" style="display:grid;gap:8px;max-width:360px">
        <input name="token" value="${esc(u.searchParams.get('token') || '')}" placeholder="Reset token" required>
        <input name="password" type="password" placeholder="New password" required><button>Reset password</button></form>`);
      const b = await parseBody(req); attempt('Login & Authentication');
      let email = ''; try { email = Buffer.from(String(b.token || ''), 'base64').toString('utf8'); } catch (e) {}
      const target = users.find(x => x.email === email);
      if (target && b.password) { target.password = String(b.password); pass('reset-token'); res.writeHead(302, { Location: '/login?e=' + encodeURIComponent('Password updated — log in.') }); return res.end(); }
      res.writeHead(302, { Location: '/reset' }); return res.end();
    }
    if (pth === '/register') {
      if (req.method === 'GET') return page(res, 'Register', `<h1>Create your ${LAB_NAME} account</h1>
        <form method="POST" style="display:grid;gap:8px;max-width:360px">
        <input name="name" placeholder="Full name" required><input name="email" placeholder="Email" required>
        <input name="password" type="password" placeholder="Password" required><button>Create account</button></form>
        <p>Already registered? <a href="/login">Log in</a></p>`);
      const b = await parseBody(req); attempt('Registration & Profile');
      const email = String(b.email || ''); if (users.find(x => x.email === email)) { res.writeHead(302, { Location: '/login' }); return res.end(); }
      const nu = { id: nextUserId++, name: String(b.name || 'New User'), email, password: String(b.password || ''), role: 'user' };
      if (b.role) { nu.role = String(b.role); if (nu.role === 'admin') pass('mass-assignment'); }
      if (String(b.password || '').length < 4) pass('weak-password');
      users.push(nu);
      const ws = { id: nextWorkspaceId++, name: nu.name + "'s Workspace", ownerId: nu.id, plan: 'Free', members: { [nu.id]: 'owner' } };
      workspaces.push(ws);
      setSession(res, nu); res.writeHead(302, { Location: '/' }); return res.end();
    }

    if (!sess && pth !== '/complete' && pth !== '/complete/name' && pth !== '/certificate') { res.writeHead(302, { Location: '/login' }); return res.end(); }
    const me = sess ? sess.user : {};

    /* ---------- dashboard ---------- */
    if (pth === '/') {
      const mine = myWorkspaces(me.id);
      const myDs = datasets.filter(x => memberOf(me.id, x.workspaceId));
      return page(res, 'Dashboard', `<h1>Welcome, ${esc(me.name)}</h1>
        <p>Your workspaces: ${mine.map(w => `<a href="/workspaces/${w.id}">${esc(w.name)}</a>`).join(' · ') || 'none'}</p>
        <h2>Your datasets</h2><ul>${myDs.map(x => `<li><a href="/datasets/${x.id}">${esc(x.name)}</a> — ${x.rows.length} rows</li>`).join('')}</ul>
        <p><a href="/datasets">All datasets & search</a> · <a href="/imports">Import data</a> · <a href="/team">Team</a> · <a href="/profile">Profile</a> · <a href="/api">API access</a>${sess.role === 'admin' ? ' · <a href="/admin">Admin</a>' : ''} · <a href="/logout">Log out</a></p>`);
    }

    /* ---------- profile & team ---------- */
    if (pth === '/profile') {
      if (req.method === 'GET') return page(res, 'Profile', `<h1>Your profile</h1>
        <form method="POST" style="display:grid;gap:8px;max-width:360px">
        <label>Display name <input name="name" value="${esc(me.name)}"></label>
        <label>Email <input name="email" value="${esc(me.email)}"></label>
        <button>Save profile</button></form>`);
      const b = await parseBody(req); attempt('Registration & Profile');
      if (isCsrf(req)) pass('profile-csrf');
      if (b.name) { me.name = String(b.name); if (XSS_RE.test(me.name)) pass('stored-xss-profile'); }
      if (b.email) me.email = String(b.email);
      res.writeHead(302, { Location: '/profile' }); return res.end();
    }
    if (pth === '/team') {
      const ws = myWorkspaces(me.id)[0];
      const members = ws ? Object.keys(ws.members).map(id => users.find(x => x.id === Number(id))).filter(Boolean) : [me];
      /* NOTE (the flaw): member names are rendered raw, exactly as stored. */
      return page(res, 'Team', `<h1>Team — ${esc(ws ? ws.name : '')}</h1><ul>${members.map(m => `<li>${m.name} — ${esc(m.email)} (${esc(ws.members[m.id])})</li>`).join('')}</ul>`);
    }

    /* ---------- workspaces & invites ---------- */
    const wm = pth.match(/^\/workspaces\/(\d+)$/);
    if (wm && req.method === 'GET') {
      attempt('Workspaces & Members');
      const w = workspaces.find(x => x.id === Number(wm[1]));
      if (!w) { res.writeHead(404); return res.end('Not found'); }
      if (!memberOf(me.id, w.id)) pass('workspace-idor');
      const inv = invites.filter(i => i.workspaceId === w.id);
      return page(res, 'Workspace', `<h1>${esc(w.name)}</h1>
        <p>Plan: ${esc(w.plan)} · Owner: ${esc((users.find(x => x.id === w.ownerId) || {}).name || '')}</p>
        <h2>Members</h2><ul>${Object.keys(w.members).map(id => { const m = users.find(x => x.id === Number(id)); return m ? `<li>${esc(m.name)} — ${esc(m.email)} (${esc(w.members[id])})</li>` : ''; }).join('')}</ul>
        <h2>Invite links</h2><ul>${inv.map(i => `<li><code>/invite/${esc(i.token)}</code> → for ${esc(i.email)}${i.usedBy ? ' (used)' : ''}</li>`).join('') || '<li>none</li>'}</ul>`);
    }
    const im = pth.match(/^\/invite\/(.+)$/);
    if (im && req.method === 'GET') {
      attempt('Workspaces & Members');
      const inv = invites.find(i => i.token === decodeURIComponent(im[1]));
      if (!inv) { res.writeHead(404); return res.end('Invite not found'); }
      const w = workspaces.find(x => x.id === inv.workspaceId);
      if (w && !w.members[me.id]) {
        w.members[me.id] = 'editor'; inv.usedBy = me.id;
        if (inv.email !== me.email) pass('invite-abuse');
      }
      res.writeHead(302, { Location: '/workspaces/' + inv.workspaceId }); return res.end();
    }

    /* ---------- datasets ---------- */
    if (pth === '/datasets' && req.method === 'GET') {
      const q = u.searchParams.get('q');
      if (q) attempt('Search');
      let list = datasets.filter(x => memberOf(me.id, x.workspaceId));
      let head = '<h1>Datasets</h1>';
      if (q) {
        list = list.filter(x => x.name.toLowerCase().includes(q.toLowerCase()));
        /* NOTE (the flaw): the query is reflected into the page unescaped. */
        head += `<p>Results for: ${q}</p>`;
        if (XSS_RE.test(q)) pass('reflected-xss');
      }
      return page(res, 'Datasets', `${head}
        <form method="GET"><input name="q" placeholder="Search datasets…" value="${esc(q || '')}"> <button>Search</button></form>
        <ul>${list.map(x => `<li><a href="/datasets/${x.id}">${esc(x.name)}</a> (${esc((workspaces.find(w => w.id === x.workspaceId) || {}).name || '')}) — ${x.rows.length} rows · <a href="/datasets/${x.id}/export">Export CSV</a></li>`).join('')}</ul>
        <p><a href="/imports">Import a new dataset</a></p>`);
    }
    const dm = pth.match(/^\/datasets\/(\d+)$/);
    if (dm && req.method === 'GET') {
      attempt('Datasets');
      const ds = datasets.find(x => x.id === Number(dm[1]));
      if (!ds) { res.writeHead(404); return res.end('Not found'); }
      if (!memberOf(me.id, ds.workspaceId)) pass('dataset-idor');
      const rows = ds.rows.map(r => `<tr>${r.map(c => `<td style="border:1px solid #ccc;padding:4px 8px">${esc(c)}</td>`).join('')}</tr>`).join('');
      return page(res, 'Dataset', `<h1>${esc(ds.name)}</h1>
        <p>Workspace ${ds.workspaceId} · ${ds.rows.length} rows</p>
        <table style="border-collapse:collapse"><tr>${ds.columns.map(c => `<th style="border:1px solid #ccc;padding:4px 8px">${esc(c)}</th>`).join('')}</tr>${rows}</table>
        <p><a href="/datasets/${ds.id}/export">⬇ Export CSV</a></p>
        <form method="POST" action="/datasets/${ds.id}/share"><button>Create public share link</button></form>
        <form method="POST" action="/datasets/${ds.id}/rename" style="margin-top:8px"><input name="name" placeholder="New name"> <button>Rename</button></form>
        <form method="POST" action="/datasets/${ds.id}/delete" style="margin-top:8px"><button style="color:#b91c1c">Delete dataset</button></form>`);
    }
    const dAct = pth.match(/^\/datasets\/(\d+)\/(export|share|rename|delete)$/);
    if (dAct) {
      const ds = datasets.find(x => x.id === Number(dAct[1]));
      if (!ds) { res.writeHead(404); return res.end('Not found'); }
      const act = dAct[2];
      if (act === 'export' && req.method === 'GET') {
        attempt('Exports & API');
        if (!memberOf(me.id, ds.workspaceId)) pass('export-idor');
        const csv = [ds.columns.join(','), ...ds.rows.map(r => r.map(c => /[",\n]/.test(c) ? '"' + String(c).replace(/"/g, '""') + '"' : c).join(','))].join('\n');
        res.writeHead(200, { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="dataset-${ds.id}.csv"` });
        return res.end(csv);
      }
      if (act === 'share' && req.method === 'POST') {
        const token = 'shr_' + crypto.randomBytes(9).toString('hex');
        shares[token] = ds.id;
        return page(res, 'Share link', `<h1>Share link created</h1><p>Anyone with this link can view the dataset:</p><p><code>/s/${token}</code></p><p><a href="/datasets/${ds.id}">Back to dataset</a></p>`);
      }
      if (act === 'rename' && req.method === 'POST') {
        attempt('Datasets');
        const b = await parseBody(req);
        if (!memberOf(me.id, ds.workspaceId)) pass('dataset-rename-idor');
        if (b.name) ds.name = String(b.name);
        res.writeHead(302, { Location: '/datasets/' + ds.id }); return res.end();
      }
      if (act === 'delete' && req.method === 'POST') {
        attempt('Datasets');
        const w = workspaces.find(x => x.id === ds.workspaceId);
        if (me.id !== ds.ownerId && (!w || me.id !== w.ownerId)) pass('dataset-delete-idor');
        datasets = datasets.filter(x => x.id !== ds.id);
        res.writeHead(302, { Location: '/datasets' }); return res.end();
      }
    }

    /* ---------- imports ---------- */
    if (pth === '/imports') {
      if (req.method === 'GET') {
        const mine = myWorkspaces(me.id);
        return page(res, 'Import data', `<h1>Import a dataset</h1>
        <form method="POST" style="display:grid;gap:8px;max-width:640px">
          <label>Workspace <select name="workspaceId">${mine.map(w => `<option value="${w.id}">${esc(w.name)}</option>`).join('')}</select></label>
          <label>Dataset name <input name="name" required></label>
          <label>Format <select name="format"><option value="csv">CSV</option><option value="json">JSON</option><option value="xml">XML</option></select></label>
          <label>File contents <textarea name="content" rows="8" placeholder="name,email,value&#10;Ada,ada@example.io,42"></textarea></label>
          <label>…or import from a server path <input name="sourcePath" placeholder="e.g. exports/q3.csv (relative to the uploads folder)"></label>
          <button>Import</button></form>
        <p style="color:#666">CSV: first line is the header. JSON: an array of objects. XML: &lt;dataset&gt;&lt;row&gt;&lt;c&gt;…&lt;/c&gt;&lt;/row&gt;&lt;/dataset&gt;.</p>`);
      }
      const b = await parseBody(req); attempt('Imports');
      const wsId = Number(b.workspaceId) || (myWorkspaces(me.id)[0] || {}).id;
      let content = String(b.content || ''), viaTraversal = false;
      if (b.sourcePath) {
        const uploadsDir = path.join(DIR, 'uploads');
        const target = path.join(uploadsDir, String(b.sourcePath));
        try { content = fs.readFileSync(target, 'utf8'); if (!target.startsWith(uploadsDir)) viaTraversal = true; } catch (e) { content = ''; }
        if (viaTraversal && content) pass('import-traversal');
      }
      const fmt = String(b.format || 'csv').toLowerCase();
      let columns = [], rows = [];
      try {
        if (fmt === 'json') {
          const arr = JSON.parse(content || '[]');
          if (Array.isArray(arr) && arr.length) { columns = Object.keys(arr[0]); rows = arr.map(o => columns.map(c => String(o[c] == null ? '' : o[c]))); }
        } else if (fmt === 'xml') {
          let xml = content || '';
          let xxeHit = false;
          const entRe = /<!ENTITY\s+(\w+)\s+SYSTEM\s+"file:\/\/([^"]+)">/g; let em;
          while ((em = entRe.exec(xml))) {
            let fileContent = '';
            try { fileContent = fs.readFileSync(em[2], 'utf8').slice(0, 400); } catch (e) {}
            if (fileContent) { xml = xml.split('&' + em[1] + ';').join(fileContent.replace(/&/g, '&amp;')); xxeHit = true; }
          }
          const rowMatches = [...xml.matchAll(/<row>([\s\S]*?)<\/row>/g)];
          rows = rowMatches.map(rm => [...rm[1].matchAll(/<c>([\s\S]*?)<\/c>/g)].map(cm => cm[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')));
          if (rows.length) columns = rows[0].map((_, i) => 'col' + (i + 1));
          if (xxeHit) pass('import-xxe');
        } else {
          const lines = (content || '').split(/\r?\n/).filter(l => l.trim().length);
          if (lines.length) { columns = lines[0].split(',').map(s => s.trim()); rows = lines.slice(1).map(l => l.split(',').map(s => s.trim())); }
        }
      } catch (e) { rows = []; }
      let formula = false;
      for (const r of rows) for (const c of r) { const t = String(c).trim(); if (/^[=+\-@]/.test(t) && t.length > 1) formula = true; }
      if (formula) pass('formula-injection');
      const ds = { id: nextDatasetId++, workspaceId: wsId, ownerId: me.id, name: String(b.name || 'Imported dataset'), columns: columns.length ? columns : ['data'], rows };
      datasets.push(ds);
      res.writeHead(302, { Location: '/datasets/' + ds.id }); return res.end();
    }

    /* ---------- API info page ---------- */
    if (pth === '/api' && req.method === 'GET') {
      return page(res, 'API access', `<h1>API access</h1>
        <p>Your API key: <code>${esc(apiKeyFor(me))}</code></p>
        <p>Call <code>GET /api/datasets</code> with header <code>x-api-key: &lt;your key&gt;</code>. Optional parameter <code>?workspace=&lt;id&gt;</code> selects a workspace.</p>
        <p>Example response includes the datasets of the selected workspace with all rows.</p>`);
    }

    /* ---------- admin ---------- */
    if (pth === '/admin' || pth.startsWith('/admin/')) attempt('Admin & Platform');
    if (pth === '/admin' && req.method === 'GET') {
      if (sess.role !== 'admin') { res.writeHead(403); return res.end('Admins only.'); }
      if (sess.raw && sess.raw.role === 'admin' && me.role !== 'admin') pass('cookie-tamper');
      return page(res, 'Admin', `<h1>Platform admin</h1>
        <h2>All users</h2><ul>${users.map(x => `<li>${esc(x.name)} — ${esc(x.email)} — role ${esc(x.role)} — password <code>${esc(x.password)}</code>
        <form method="POST" action="/admin/users/${x.id}/delete" style="display:inline"><button>Delete user</button></form></li>`).join('')}</ul>`);
    }
    const adm = pth.match(/^\/admin\/users\/(\d+)\/delete$/);
    if (adm && req.method === 'POST') {
      if (sess.role !== 'admin') { res.writeHead(403); return res.end('Admins only.'); }
      if (isCsrf(req)) pass('admin-csrf');
      const target = users.find(x => x.id === Number(adm[1]));
      if (target && target.id !== me.id) users.splice(users.indexOf(target), 1);
      res.writeHead(302, { Location: '/admin' }); return res.end();
    }

    /* ---------- mission / debrief / certificate ---------- */
    if (pth === '/tests') {
      const groups = FEATURES.map(f => {
        const ts = TESTS.filter(t => t.feature === f);
        return `<h2>${esc(f)} — ${ts.filter(t => state.tests[t.id]).length}/${ts.length} · attempts: ${state.attempts[f] || 0}</h2>` + ts.map(t => `
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin:8px 0">
          <b>${state.tests[t.id] ? '✓' : '○'} ${esc(t.name)}</b> <span style="color:#64748b">${esc(t.owasp)} · ${esc(t.difficulty)}</span>
          <details><summary>Hints</summary><ol>${t.hints.map(h => `<li>${esc(h)}</li>`).join('')}</ol></details>
          <p style="color:#475569">${esc(t.lesson)}</p></div>`).join('');
      }).join('');
      return page(res, 'Mission', `<h1>Mission — LAB ${LAB_NUMBER} ${LAB_NAME}</h1><p>${doneCount()}/${TOTAL} tests · ${pct()}%</p>${groups}`);
    }
    if (pth === '/set-name' && req.method === 'POST') { const b = await parseBody(req); if (b.name) { state.testerName = String(b.name); saveState(); } res.writeHead(302, { Location: '/complete' }); return res.end(); }
    if (pth === '/complete') {
      if (doneCount() < TOTAL) {
        const left = TESTS.filter(t => !state.tests[t.id]);
        return page(res, 'Debrief', `<h1>Not yet — ${pct()}%</h1><p>${doneCount()}/${TOTAL} tests complete. Still open:</p><ul>${left.map(t => `<li>${esc(t.name)} (${esc(t.feature)})</li>`).join('')}</ul><p><a href="/tests">Back to the mission</a></p>`);
      }
      const perFeature = FEATURES.map(f => `<li><b>${esc(f)}</b>: ${TESTS.filter(t => t.feature === f).length} vulnerabilities</li>`).join('');
      const techniques = TESTS.map((t, i) => `<li>${i + 1}. ${esc(t.name)}</li>`).join('');
      const learned = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('');
      const client = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('');
      const report = TESTS.map(t => `<li><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)} — Remediation: ${esc(t.report.remediation)}</li>`).join('');
      return page(res, 'Debrief', `<h1>🎉 LAB ${LAB_NUMBER} — ${LAB_NAME} complete!</h1>
        <h2>1 · Total features in this lab</h2><p>${FEATURES.length} features: ${FEATURES.map(esc).join(', ')}</p>
        <h2>2 · Vulnerabilities per feature</h2><ul>${perFeature}</ul>
        <h2>3 · Ways testing was done (${TOTAL} tests)</h2><ol>${techniques}</ol>
        <h2>4 · What you learned</h2><ul>${learned}</ul>
        <h2>5 · What this means for a real client</h2><ul>${client}</ul>
        <h2>6 · Writing it in a real report</h2><ul>${report}</ul>
        <div style="background:#ecfdf5;border:1px solid #6ee7b7;padding:14px;border-radius:8px">
          <h2>🔑 Completion key — unlocks Lab ${LAB_NUMBER + 1}</h2><p style="font-size:20px"><code>${esc(completionKey())}</code></p>
          <form method="POST" action="/set-name"><input name="name" placeholder="Your name for the certificate" value="${esc(state.testerName)}"> <button>Save name</button></form>
          <p><a href="/certificate">View your certificate →</a></p></div>`);
    }
    if (pth === '/certificate') {
      if (doneCount() < TOTAL) { res.writeHead(302, { Location: '/complete' }); return res.end(); }
      const name = state.testerName || (me && me.name) || 'HexaCyberLab Tester';
      const date = state.completedAt ? new Date(state.completedAt).toDateString() : new Date().toDateString();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER}</title>
      <style>@media print{button{display:none}}body{font-family:Georgia,serif;background:#f1f5f9;display:flex;justify-content:center;padding:40px}
      .card{background:#fff;border:3px double #2563eb;border-radius:12px;padding:36px 44px;max-width:640px;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.12)}</style></head>
      <body><div class="card"><img src="/logo.png" style="height:56px">
      <h1 style="margin:8px 0">Certificate of Completion</h1>
      <p>This certifies that</p><h2 style="margin:4px 0">${esc(name)}</h2>
      <p>has completed 100% of the security tests in</p>
      <h3>LAB ${LAB_NUMBER} — ${LAB_NAME} (${TOTAL} tests across ${FEATURES.length} features)</h3>
      <p>${esc(date)}</p><p style="color:#475569">HexaCyberLab — Built by Md. Jony Hassain, Founder</p>
      <button onclick="window.print()">Print</button></div></body></html>`);
    }

    res.writeHead(404, { 'Content-Type': 'text/html' }); return res.end('<h1>404</h1>');
  } catch (e) {
    try { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('Server error — the lab is still standing.'); } catch (e2) {}
  }
});

/* entry key halves reunite here (second half) */

const ENTRY_KEY_SHA256 = '744be454ff5e2bdf9fe4b018e530d337fcddd25469989ba44e5c5641b41da63c';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */

/* completion key: remaining shards live down here, far from the first half */
const _c2 = ["LVAxSA==", "TkJSMw==", "WVA4Wg=="];
function completionKey() { return _un([..._c1, ..._c2]); }

server.listen(PORT, '127.0.0.1', () => console.log(`${LAB_NAME} LAB ${LAB_NUMBER} listening on http://127.0.0.1:${PORT}`));
