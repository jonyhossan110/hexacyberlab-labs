'use strict';
/* HexaChat — LAB 89 (Category 9: Media, Social & Community)
   A deliberately vulnerable messaging app for local, authorised practice.
   Zero-dependency Node.js. Binds 127.0.0.1 only. All data is fake seed data. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3098;
const LAB_NUMBER = 89;
const LAB_NAME = 'HexaChat';
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const FILES_DIR = path.join(DIR, 'files');

/* --- scattered config fragments (assembled at runtime only where needed) --- */

const _cfgC = ['TC1YSA==', 'Ni0wOQ==', 'UFhBRA=='];
function _un(a) { return a.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join(''); }

/* ================= TESTS registry ================= */
const TESTS = [
  /* ---- Login & Authentication ---- */
  { id: 'sqli-login', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03:2021 – Injection', difficulty: 'Beginner', where: 'POST /login',
    hints: ['The login form builds its database query by gluing your input straight into the query string.', 'Try a quote character in the email field, followed by a condition that is always true.', "Use admin@hexachat.local' OR '1'='1' -- as the email and any password — the query stops checking the password."],
    lesson: 'String-built queries let an attacker rewrite the login logic itself; the password check never really happens.',
    impact: 'On a real messaging product this is instant account takeover — an attacker reads private conversations as any user, including admins, without knowing a single password.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements for all database access and never interpolate user input into SQL.' },
    fix: 'Parameterise the login query so credentials are bound as data, never concatenated into the query string.',
    objective: 'Log in without valid credentials so the sqli-login test flips to done on /tests.' },
  { id: 'brute-force', feature: 'Login & Authentication', name: 'No Brute-Force Protection on Login', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner', where: 'POST /login',
    hints: ['Nothing slows you down when a password guess is wrong — no delay, no lockout, no CAPTCHA.', 'Script ten wrong passwords for the same account and watch them all get processed.', 'Fail 10 logins in a row for alice@hexachat.local — the 10th is still accepted for processing.'],
    lesson: 'Without throttling or lockout, a login form is an unlimited password-guessing machine.',
    impact: 'Attackers can grind through password lists against real accounts at full speed; weak passwords fall in minutes and the business never notices.',
    report: { title: 'Missing Brute-Force Protection on Authentication Endpoint', severity: 'High', remediation: 'Add per-account and per-IP rate limiting, progressive delays and lockout/alerting after repeated failures.' },
    fix: 'Throttle failed logins per account and per IP, with lockout and alerting after a small threshold.',
    objective: 'Submit 10 failed logins for one account and confirm every attempt is still processed.' },
  { id: 'user-enum', feature: 'Login & Authentication', name: 'User Enumeration via Login & Reset Responses', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner', where: 'POST /login and POST /forgot',
    hints: ['Compare the error message for an email that exists with one that does not.', 'The forgot-password page answers differently for real and fake accounts too.', 'Probe 5 different emails across /login and /forgot and collect the two different answers.'],
    lesson: 'Different responses for "no such account" and "wrong password" hand attackers a free list of valid usernames.',
    impact: 'Attackers first harvest which email addresses have accounts, then aim phishing and password attacks only at real users — much higher success, much less noise.',
    report: { title: 'Account Enumeration Through Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message ("invalid credentials" / "if the account exists…") for every authentication and reset outcome.' },
    fix: 'Use identical generic responses and timing for existing and non-existing accounts on login and reset.',
    objective: 'Probe at least 5 distinct email addresses and observe the differing responses.' },
  { id: 'demo-creds', feature: 'Login & Authentication', name: 'Published Demo Credentials', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner', where: 'Login page / POST /login',
    hints: ['Read the login page carefully — it is friendlier than it should be.', 'The page itself tells you a working username and password.', 'Sign in with the demo account printed on the login page.'],
    lesson: 'Demo and default accounts left active in production are pre-made doors for attackers.',
    impact: 'Anyone on the internet can sign in with credentials the business itself published — no skill required — and pivot from that account into real users.',
    report: { title: 'Active Demo Account With Publicly Published Credentials', severity: 'High', remediation: 'Remove demo/default accounts from production, or disable them and rotate their credentials before launch.' },
    fix: 'Delete demo/default accounts from production builds and never print working credentials on a login page.',
    objective: 'Sign in with the demo credentials shown on the login page.' },
  { id: 'reset-token', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Intermediate', where: 'POST /reset',
    hints: ['Reset tokens are not random — they are computed from something you can see.', 'A user id is public (member list, /api/debug). The token is a short formula of that id.', 'For user id N the token is HC<N>-<N*149+37>. Compute one for Bob and reset his password without ever requesting a reset.'],
    lesson: 'A reset token derived from public data is not a secret — anyone can mint one for any account.',
    impact: 'Full account takeover of any user, including admins, by anyone who can see a user id — no inbox access needed.',
    report: { title: 'Password Reset Tokens Are Predictable (Derived From User ID)', severity: 'Critical', remediation: 'Generate reset tokens from a CSPRNG (≥128 bits), store only a hash, expire them quickly and bind them to a single use.' },
    fix: 'Issue single-use, short-lived reset tokens from a cryptographically secure random generator.',
    objective: 'Reset another account’s password using a token you computed yourself, without requesting a reset first.' },
  { id: 'role-cookie', feature: 'Login & Authentication', name: 'Role Cookie Tampering (hx_role)', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate', where: 'GET /admin',
    hints: ['After login, inspect the cookies the app sets — one of them describes your role.', 'The admin page trusts that cookie instead of checking the account on the server.', 'Set the hx_role cookie to admin in your browser and open /admin as a normal user.'],
    lesson: 'Authorisation data stored on the client is attacker-controlled data; trusting it is the same as having no check at all.',
    impact: 'Any ordinary user becomes an administrator by editing a cookie — full control of the platform, its users and its data.',
    report: { title: 'Authorisation Bypass via Client-Side Role Cookie', severity: 'Critical', remediation: 'Determine roles server-side from the authenticated session on every request; never trust client-supplied role data.' },
    fix: 'Look up the role from the server-side session record on every privileged request; ignore role cookies.',
    objective: 'Reach /admin as a regular user by forging the hx_role cookie.' },

  /* ---- Registration & Profile ---- */
  { id: 'weak-password', feature: 'Registration & Profile', name: 'Weak Password Policy (1-Character Passwords)', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner', where: 'POST /register',
    hints: ['Registration never checks how strong a password is.', 'Try creating an account with the shortest password the form will take.', 'Register a new account with the password "x" — it is accepted.'],
    lesson: 'If the server accepts any password, users will choose terrible ones — and the business carries the risk.',
    impact: 'Accounts protected by one-character passwords are guessed instantly, turning small leaks into full account takeovers.',
    report: { title: 'No Minimum Password Strength Enforced at Registration', severity: 'Medium', remediation: 'Enforce a minimum length (≥10) and check new passwords against known-breached lists.' },
    fix: 'Enforce minimum password length and breached-password screening at registration and password change.',
    objective: 'Create an account with a 1-character password.' },
  { id: 'mass-assignment', feature: 'Registration & Profile', name: 'Mass Assignment: Role Granted at Registration', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate', where: 'POST /register',
    hints: ['The registration handler copies more of your request into the new account than the form shows.', 'Add a field the form never offered you and see if the account keeps it.', 'POST /register with an extra role=admin field — the new account is created as an administrator.'],
    lesson: 'Binding request data directly onto account records lets attackers set fields the UI never exposed.',
    impact: 'Self-service admin creation: an attacker registers and is instantly an administrator of the whole platform.',
    report: { title: 'Mass Assignment Allows Privilege Escalation at Registration', severity: 'Critical', remediation: 'Whitelist the exact fields a request may set (email, password, display name) and assign roles only through privileged server-side logic.' },
    fix: 'Build the account object from an explicit whitelist of registration fields; never bind raw request bodies.',
    objective: 'Register a new account that ends up with the admin role.' },
  { id: 'stored-xss-profile', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03:2021 – Injection', difficulty: 'Intermediate', where: 'POST /register, POST /profile → rendered on /members',
    hints: ['Display names are printed back to other users without encoding — check the member list.', 'Put markup, not text, in the name field.', 'Register or rename with the display name <script>alert(1)</script> and open /members.'],
    lesson: 'Any user-controlled string rendered as HTML becomes code that runs in other people’s browsers.',
    impact: 'Attackers plant scripts that fire for every user who views a member list — session theft, fake login forms and actions taken in victims’ names.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Contextually output-encode all user-supplied data and deploy a restrictive Content-Security-Policy.' },
    fix: 'HTML-encode display names (and all user content) at render time, everywhere they appear.',
    objective: 'Store an XSS payload in a display name so it is saved in the profile.' },
  { id: 'csrf-profile', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate', where: 'POST /profile',
    hints: ['Profile changes are accepted from a plain POST with no anti-CSRF token check.', 'The app’s own forms carry a marker field — the server never verifies it.', 'POST /profile with a new display name and NO hx_marker field — the change is applied anyway.'],
    lesson: 'State-changing requests without CSRF tokens let any website a victim visits act with the victim’s session.',
    impact: 'A malicious page open in one tab can silently rename a user, change their profile, or worse — in their name, from their browser.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require a per-session, unpredictable CSRF token on every state-changing request and verify it server-side.' },
    fix: 'Generate a per-session CSRF token, embed it in forms, and reject state changes that lack a valid token.',
    objective: 'Change a profile with a POST that carries no valid hx_marker.' },

  /* ---- Direct Messages ---- */
  { id: 'dm-idor', feature: 'Direct Messages', name: 'Read Another User’s Private Conversation (IDOR)', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner', where: 'GET /conversations/:id',
    hints: ['Conversation URLs are simple numbers, and the page never checks that you are in the conversation.', 'Open a conversation id that belongs to two other people.', 'As Alice, open /conversations/3 — that is Bob and Carol’s private chat.'],
    lesson: 'An id in a URL is not permission; every object access needs an ownership check on the server.',
    impact: 'Every private conversation on the platform is readable by any signed-in user — total loss of the privacy the product promises.',
    report: { title: 'Insecure Direct Object Reference Exposes Private Conversations', severity: 'High', remediation: 'Verify the requester is a participant of the conversation before returning any of its messages.' },
    fix: 'Check conversation membership server-side on every read and write.',
    objective: 'Open a DM conversation you are not a participant of and read its messages.' },
  { id: 'dm-delete-idor', feature: 'Direct Messages', name: 'Delete Another User’s Message', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate', where: 'POST /messages/:id/delete',
    hints: ['The delete endpoint checks that you are logged in — nothing more.', 'Find a message id written by someone else and ask the endpoint to delete it.', 'POST /messages/<id>/delete for a message authored by Bob, while signed in as Alice.'],
    lesson: 'Write operations need the same ownership checks as reads — "can view" and "can modify" are separate questions.',
    impact: 'Users can erase other people’s messages — destroying evidence of abuse, fraud or agreements and undermining trust in the platform.',
    report: { title: 'Missing Authorisation on Message Deletion Allows Deleting Other Users’ Messages', severity: 'Medium', remediation: 'Only allow the message author (or a moderator through a checked flow) to delete a message.' },
    fix: 'Verify message authorship server-side before deletion.',
    objective: 'Delete a message written by a different user.' },
  { id: 'blocked-bypass', feature: 'Direct Messages', name: 'Blocked User Can Still Send Messages (API Path)', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate', where: 'POST /api/send',
    hints: ['Alice has blocked Carol — the web form honours the block. Not every code path does.', 'The app has a JSON send endpoint used by its mobile client; checks were only added to the web form.', 'As Carol, POST /api/send with {"to":2,"text":"..."} — the message to Alice is delivered despite the block.'],
    lesson: 'Security checks must live in the shared business logic, not in one front door — attackers use the other doors.',
    impact: 'Blocking — the main tool users have against harassment — silently fails, exposing victims to continued abuse.',
    report: { title: 'Block Enforcement Missing on API Message-Send Path', severity: 'Medium', remediation: 'Enforce block checks in the shared message-delivery service used by every client (web, mobile, API).' },
    fix: 'Move the block check into the single delivery function every send path calls.',
    objective: 'Deliver a message to a user who has blocked you, using the API send path.' },
];

TESTS.push(
  /* ---- Groups & Channels ---- */
  { id: 'group-join', feature: 'Groups & Channels', name: 'Join a Private Group Without an Invite', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner', where: 'POST /groups/:id/join',
    hints: ['Private groups are supposed to need an invite code. The join endpoint is less strict than the UI suggests.', 'The server grants membership whether or not a valid code arrives.', 'As Carol, POST /groups/2/join with no invite field at all — you become a member of the private group.'],
    lesson: '"Private" is a server-side rule, not a label; if the join handler does not enforce it, the group is public.',
    impact: 'Private communities — family groups, internal teams, paying members — are open to anyone who finds the join button’s URL.',
    report: { title: 'Private Group Join Does Not Verify Invite Code', severity: 'High', remediation: 'Require and verify a valid, unexpired invite code server-side before adding any member to a private group.' },
    fix: 'Verify the invite code against the group record before granting membership.',
    objective: 'Become a member of the private group (id 2) without a valid invite code.' },
  { id: 'group-messages-idor', feature: 'Groups & Channels', name: 'Read Private Group Messages as a Non-Member', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner', where: 'GET /groups/:id',
    hints: ['Group pages are simple numbered URLs.', 'The page renders the messages before it ever asks whether you belong to the group — in fact it never asks.', 'As Carol (not a member), open /groups/2 and read the private group’s messages.'],
    lesson: 'Membership must be checked before content is served, on every request — not hidden in the UI.',
    impact: 'The entire history of a private group is exposed to any signed-in account, including anything sensitive members shared believing it was closed.',
    report: { title: 'Private Group Messages Served to Non-Members', severity: 'High', remediation: 'Check group membership server-side before returning group content; return 403 for non-members.' },
    fix: 'Gate group content behind a server-side membership check.',
    objective: 'Read the messages of private group 2 while not a member of it.' },
  { id: 'group-role-escalation', feature: 'Groups & Channels', name: 'Self-Promote to Group Admin', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate', where: 'POST /groups/:id/role',
    hints: ['Group roles are changed through an endpoint that trusts whoever calls it.', 'You do not need to be a group admin to use the endpoint that makes group admins.', 'As Bob (a plain member of group 2), POST /groups/2/role with your own userId and role=admin.'],
    lesson: 'Privilege changes must themselves be privileged operations, verified against the actor’s current rights.',
    impact: 'Any member can seize control of any group — changing settings, removing people, reading everything — from one request.',
    report: { title: 'Group Role Management Lacks Authorisation (Self-Promotion to Admin)', severity: 'High', remediation: 'Only allow group owners/admins to change member roles, verified server-side against stored membership.' },
    fix: 'Check the requester’s stored group role before applying any role change.',
    objective: 'Promote yourself to admin of a group where you are only a member.' },
  { id: 'group-remove-owner', feature: 'Groups & Channels', name: 'Remove the Group Owner as a Regular Member', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Advanced', where: 'POST /groups/:id/remove',
    hints: ['Member removal is another endpoint that never asks who you are in the group.', 'Even the group’s owner is just a userId to this handler.', 'As Bob, POST /groups/2/remove with userId=2 — the owner, Alice, is removed from her own group.'],
    lesson: 'Destructive actions need the strictest checks: who may act, and who may never be a target.',
    impact: 'A single member can hijack a community by deleting its owner — locking out leadership and taking over the space.',
    report: { title: 'Unauthorised Member Removal Allows Removing the Group Owner', severity: 'High', remediation: 'Restrict member removal to group admins, and never allow removal of the group owner through this endpoint.' },
    fix: 'Verify the requester is a group admin and protect the owner record from removal.',
    objective: 'Remove the owner of group 2 while signed in as a regular member.' },

  /* ---- Attachments ---- */
  { id: 'attachment-idor', feature: 'Attachments', name: 'Download Another User’s Attachment (IDOR)', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner', where: 'GET /attachments/:id',
    hints: ['Attachments have small sequential ids and a download endpoint that trusts them.', 'Nothing ties an attachment to the person asking for it.', 'As Alice, open /attachments/2 — that file belongs to Bob’s private conversation with Carol.'],
    lesson: 'Files are objects too: every download needs the same ownership check as every page.',
    impact: 'Contracts, photos and documents users shared privately can be downloaded by anyone — a direct privacy and data-protection breach.',
    report: { title: 'Attachment Downloads Lack Ownership Checks (IDOR)', severity: 'High', remediation: 'Verify the requester owns the attachment or participates in the conversation it belongs to before serving the file.' },
    fix: 'Authorise every attachment download against the stored owner and conversation participants.',
    objective: 'Download an attachment that belongs to another user.' },
  { id: 'download-traversal', feature: 'Attachments', name: 'Path Traversal on File Download', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate', where: 'GET /download?file=',
    hints: ['The download endpoint joins your file parameter onto a folder path without cleaning it.', 'Dot-dot sequences walk up out of the files folder.', 'Request /download?file=../server.js — the app serves its own source code.'],
    lesson: 'User input must never become a filesystem path without canonicalisation and an allow-list check.',
    impact: 'Attackers read source code, configuration and secrets from the server itself — the first step to full compromise.',
    report: { title: 'Path Traversal in File Download Allows Reading Arbitrary Files', severity: 'High', remediation: 'Resolve the requested path, require it to stay inside the upload directory, and serve files by id rather than by name.' },
    fix: 'Normalise and prefix-check every download path against the files directory.',
    objective: 'Use /download to read a file outside the files folder (the server’s own source).' },
  { id: 'upload-html', feature: 'Attachments', name: 'Unrestricted Upload: Stored HTML/SVG File Served', owasp: 'A03:2021 – Injection', difficulty: 'Intermediate', where: 'POST /upload → GET /files/<name>',
    hints: ['The upload form accepts any filename and any content — and the app serves it back.', 'The content type comes from the extension you choose.', 'Upload a file named page.html containing a <script> payload, then open /files/page.html — it runs as a page of this site.'],
    lesson: 'An upload feature without type validation is a hosted-content feature — attackers will host their scripts on your domain.',
    impact: 'Attackers store phishing pages and scripts under the business’s real domain, abusing its reputation and stealing sessions from anyone who opens the link.',
    report: { title: 'Unrestricted File Upload Allows Stored HTML/SVG (Active Content)', severity: 'High', remediation: 'Allow-list safe file types, verify content server-side, serve uploads from a separate domain with Content-Disposition: attachment.' },
    fix: 'Validate uploads against an extension/content allow-list and serve them as downloads, never as site pages.',
    objective: 'Upload an .html file with a script payload and have it served back as a page.' },

  /* ---- Search ---- */
  { id: 'search-sqli', feature: 'Search', name: 'SQL Injection in Message Search', owasp: 'A03:2021 – Injection', difficulty: 'Intermediate', where: 'GET /search?q=',
    hints: ['Search glues your query into a database search the same careless way the login does.', 'A classic always-true condition makes the "filter" match everything — including things you should never see.', "Search for ' OR '1'='1 — the results dump every message on the platform, private groups included."],
    lesson: 'Every input that reaches a query is an injection surface — search boxes are the most commonly missed one.',
    impact: 'One search dumps the entire message database: private DMs and closed groups included — a complete privacy breach from a single request.',
    report: { title: 'SQL Injection in Search Returns All Messages Including Private Content', severity: 'Critical', remediation: 'Parameterise search queries and scope results to content the requester is authorised to see.' },
    fix: 'Parameterise the search query and filter results by the requester’s access rights.',
    objective: 'Make search return private messages you have no right to see, via an injected always-true condition.' },
  { id: 'search-xss', feature: 'Search', name: 'Reflected XSS in Search', owasp: 'A03:2021 – Injection', difficulty: 'Beginner', where: 'GET /search?q=',
    hints: ['The results page repeats your search term back to you — as HTML, not text.', 'Whatever markup you search for lands in the page.', 'Search for <script>alert(1)</script> and view the page source: your payload is reflected unescaped.'],
    lesson: 'Echoing input without encoding is XSS even when nothing is stored — the victim’s own link carries the payload.',
    impact: 'Attackers send victims links to the real site that run attacker scripts in the victim’s session — phishing and account actions under a trusted domain.',
    report: { title: 'Reflected Cross-Site Scripting in Search Results', severity: 'Medium', remediation: 'Output-encode the reflected query term (and all user input) in every response.' },
    fix: 'HTML-encode the search term wherever it is reflected in the results page.',
    objective: 'Get an XSS payload reflected unescaped in the search results page.' },

  /* ---- Admin Panel ---- */
  { id: 'moderator-bac', feature: 'Admin Panel', name: 'Moderator Console Open to Any Logged-In User', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner', where: 'GET /moderator',
    hints: ['There is a moderation queue page meant for staff. Its only real requirement is a login.', 'No role is ever checked on the server.', 'Sign in as any regular user and open /moderator — the reports queue is served.'],
    lesson: 'Hiding a link is not access control; if the server serves the page, the page is public to every account.',
    impact: 'Internal moderation data — abuse reports, reporter identities, flagged content — leaks to the very users being reported.',
    report: { title: 'Broken Access Control on Moderator Console', severity: 'High', remediation: 'Require a moderator/admin role, verified server-side, for every staff page and action.' },
    fix: 'Add a server-side role check to the moderator console and every staff endpoint.',
    objective: 'Open the moderator console while signed in as a non-admin user.' },
  { id: 'admin-ban-csrf', feature: 'Admin Panel', name: 'CSRF on Admin Ban Action', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate', where: 'POST /admin/ban',
    hints: ['Banning a user is a single POST. Like the profile form, it never verifies the anti-CSRF marker.', 'You need an admin session (or a forged admin role cookie) — then the marker is the only thing missing, and it is not checked.', 'As admin, POST /admin/ban with a userId and NO hx_marker — the user is banned anyway.'],
    lesson: 'The more powerful the action, the more damage a forged request does — admin actions need CSRF tokens most of all.',
    impact: 'An admin who merely opens a malicious page can be made to ban users — sabotage carried out with the admin’s own authority.',
    report: { title: 'Missing CSRF Protection on Administrative Ban Action', severity: 'High', remediation: 'Require and verify per-session CSRF tokens on all administrative state-changing endpoints.' },
    fix: 'Verify the CSRF token server-side before applying any admin action.',
    objective: 'Ban a user through a POST that carries no valid hx_marker.' },

  /* ---- Platform & API ---- */
  { id: 'api-token', feature: 'Platform & API', name: 'Weak API Token (Base64 of Email)', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Intermediate', where: 'GET /api/conversations',
    hints: ['The JSON API authenticates with a token header — but the "token" is not a secret.', 'It is a reversible encoding of something public. Whose email addresses do you know?', 'Send GET /api/conversations with header X-Api-Token set to the base64 of bob@hexachat.local — his conversations are returned, no login needed.'],
    lesson: 'An identifier is not a credential; anything an attacker can compute or guess cannot authenticate.',
    impact: 'Anyone who knows or guesses a user’s email address gets API access to their private conversations — no password, no trace.',
    report: { title: 'API Authentication Token Is a Guessable Encoding of the User’s Email', severity: 'High', remediation: 'Issue high-entropy, random API tokens per user, store them hashed, and support revocation.' },
    fix: 'Replace email-derived tokens with random, revocable, server-issued API tokens.',
    objective: 'Use a base64-of-email token to read another user’s conversations through the API.' },
  { id: 'api-debug', feature: 'Platform & API', name: 'Unauthenticated Debug Data Dump (/api/debug)', owasp: 'A05:2021 – Security Misconfiguration', difficulty: 'Beginner', where: 'GET /api/debug',
    hints: ['Developers left a debug endpoint in the build.', 'It needs no login at all.', 'Open /api/debug in a fresh browser with no cookies — every account, including passwords, is returned as JSON.'],
    lesson: 'Debug and diagnostic endpoints are production vulnerabilities the moment they ship.',
    impact: 'The full user database — emails and passwords — is public to the entire internet; every account falls at once.',
    report: { title: 'Unauthenticated Debug Endpoint Exposes All User Credentials', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; if diagnostics are needed, gate them behind admin auth and network restrictions.' },
    fix: 'Delete the debug endpoint from the production build entirely.',
    objective: 'Fetch /api/debug with no session and receive the full user dump.' }
);

/* ================= progress engine ================= */
let state = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
try {
  if (fs.existsSync(PROGRESS_FILE)) {
    const loaded = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    state = Object.assign(state, loaded);
  }
} catch (e) { /* corrupted state file -> start fresh */ }
function save() { try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2)); } catch (e) {} }
function doneCount() { return TESTS.filter(t => state.tests[t.id]).length; }
function isComplete() { return doneCount() === TESTS.length; }
function pass(id) {
  if (!state.tests[id]) {
    state.tests[id] = true;
    if (isComplete() && !state.completedAt) { state.completedAt = new Date().toISOString(); state.keyRevealed = true; }
    save();
  }
}
function bump(feature) { state.attempts[feature] = (state.attempts[feature] || 0) + 1; save(); }
function featureStats() {
  const out = {};
  for (const t of TESTS) {
    out[t.feature] = out[t.feature] || { total: 0, done: 0, attempts: state.attempts[t.feature] || 0 };
    out[t.feature].total++;
    if (state.tests[t.id]) out[t.feature].done++;
  }
  return out;
}

/* --- more scattered fragments, far from the first set --- */

const ENTRY_KEY_SHA256 = '8bcf85fc3e32110f35419cb767b87a781aed774eae5ea103f6bb82be30542905';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */

/* ================= seed data (all fake) ================= */
let nextUserId = 7, nextMsgId = 100, nextConvId = 4, nextAttId = 4;
const users = [
  { id: 1, email: 'admin@hexachat.local', password: 'admin123', displayName: 'Ada Admin', role: 'admin', banned: false, issuedToken: null },
  { id: 2, email: 'alice@hexachat.local', password: 'alice123', displayName: 'Alice', role: 'user', banned: false, issuedToken: null },
  { id: 3, email: 'bob@hexachat.local', password: 'bob123', displayName: 'Bob', role: 'user', banned: false, issuedToken: null },
  { id: 4, email: 'carol@hexachat.local', password: 'carol123', displayName: 'Carol', role: 'user', banned: false, issuedToken: null },
  { id: 5, email: 'demo@hexachat.local', password: 'demo123', displayName: 'Demo Dan', role: 'user', banned: false, issuedToken: null },
  { id: 6, email: 'erin@hexachat.local', password: 'erin123', displayName: 'Erin', role: 'user', banned: false, issuedToken: null }
];
const conversations = [
  { id: 1, participants: [2, 3] },
  { id: 2, participants: [2, 4] },
  { id: 3, participants: [3, 4] }
];
const groups = [
  { id: 1, name: 'Weekend Hikers', private: false, ownerId: 2, inviteCode: null, roles: { 2: 'owner', 3: 'member', 4: 'member' } },
  { id: 2, name: 'Family Secrets', private: true, ownerId: 2, inviteCode: 'FAM-2024', roles: { 2: 'owner', 3: 'member' } },
  { id: 3, name: 'Work Gamers', private: false, ownerId: 3, inviteCode: null, roles: { 3: 'owner', 4: 'member' } }
];
const messages = [
  { id: 1, convId: 1, groupId: null, authorId: 2, text: 'Hi Bob! Lisbon flights are booked, sending you the plan tonight.' },
  { id: 2, convId: 1, groupId: null, authorId: 3, text: 'Great — did you attach the itinerary file?' },
  { id: 3, convId: 1, groupId: null, authorId: 2, text: 'Yes, see alice-notes.txt attached to this chat.' },
  { id: 4, convId: 2, groupId: null, authorId: 4, text: 'Alice, the shoot is Saturday at golden hour.' },
  { id: 5, convId: 2, groupId: null, authorId: 2, text: 'Perfect, I will bring the printed shot list.' },
  { id: 6, convId: 3, groupId: null, authorId: 3, text: 'Carol, the contract draft is attached here — please keep it between us.' },
  { id: 7, convId: 3, groupId: null, authorId: 4, text: 'Got it Bob, reading it tonight. Very confidential.' },
  { id: 8, convId: null, groupId: 1, authorId: 2, text: 'Saturday hike: meet at the trailhead at 8am!' },
  { id: 9, convId: null, groupId: 1, authorId: 3, text: 'Bringing the snacks this time.' },
  { id: 10, convId: null, groupId: 2, authorId: 2, text: 'Family only: the reunion budget is in the shared sheet, password is grandma’s birthday.' },
  { id: 11, convId: null, groupId: 2, authorId: 3, text: 'Please nobody share this outside the family group.' },
  { id: 12, convId: null, groupId: 3, authorId: 3, text: 'Game night Friday, usual lobby.' },
  { id: 13, convId: null, groupId: 3, authorId: 4, text: 'I will host this week.' }
];
const attachments = [
  { id: 1, ownerId: 2, convId: 1, filename: 'alice-notes.txt', label: 'Lisbon trip notes' },
  { id: 2, ownerId: 3, convId: 3, filename: 'bob-contract.txt', label: 'Freelance contract (private)' },
  { id: 3, ownerId: 4, convId: 2, filename: 'carol-photo-notes.txt', label: 'Photo shoot notes' }
];
const blocks = [ { blocker: 2, blocked: 4 } ]; // Alice has blocked Carol
const reports = [
  { id: 1, reporter: 'Carol', target: 'Demo Dan', reason: 'Spam links in public group' },
  { id: 2, reporter: 'Bob', target: 'unknown account', reason: 'Harassment in DMs' }
];
const sessions = new Map();
const failedLogins = {};   // email -> consecutive failures
const probeSet = new Set(); // distinct emails probed via login/forgot (enumeration)
function resetTokenFor(id) { return 'HC' + id + '-' + (id * 149 + 37); }
function userById(id) { return users.find(u => u.id === Number(id)); }
function userByEmail(email) { return users.find(u => u.email === String(email || '').toLowerCase()); }
function isBlocked(blockerId, senderId) { return blocks.some(b => b.blocker === blockerId && b.blocked === senderId); }

/* ================= http helpers ================= */
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
const XSS_RE = /<script|onerror\s*=|onload\s*=|<svg|<img[^>]*onerror|javascript:/i;
const INJ_RE = /'\s*(or|and)\b|'--|union\s+select|'\s*or\s+1\s*=\s*1|\bor\s+1\s*=\s*1/i;
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}
function parseBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 2e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) { try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); } }
      else {
        const out = {};
        new URLSearchParams(data).forEach((v, k) => { out[k] = v; });
        resolve(out);
      }
    });
    req.on('error', () => resolve({}));
  });
}
function getSession(req) {
  const c = parseCookies(req);
  if (c.sid && sessions.has(c.sid)) return { sid: c.sid, data: sessions.get(c.sid) };
  return null;
}
function currentUser(req) { const s = getSession(req); return s ? userById(s.data.userId) : null; }
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }

/* ================= layout + coach widget ================= */
function progressBar() {
  const done = doneCount(), total = TESTS.length, pct = Math.floor(done / total * 100);
  return '<div style="background:#111827;color:#e5e7eb;padding:8px 14px;border-radius:8px;margin:10px 0">' +
    '<img src="/logo.png" alt="HexaCyberLab" style="height:26px;vertical-align:middle;margin-right:8px">' +
    '<b>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</b> &nbsp;·&nbsp; ' + done + '/' + total + ' tests · ' + pct + '%' +
    '<div style="background:#374151;height:8px;border-radius:4px;margin-top:6px"><div style="background:#22c55e;height:8px;border-radius:4px;width:' + pct + '%"></div></div></div>';
}
const WIDGET = `
<div id="coach" style="position:fixed;right:14px;bottom:14px;width:320px;background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:10px;font-family:system-ui;z-index:50">
  <div style="padding:8px 12px;background:#1e293b;border-radius:10px 10px 0 0;cursor:pointer" onclick="var b=document.getElementById('coachbody');b.style.display=b.style.display==='none'?'block':'none'"><b>Lab Coach</b> — tap to open/close</div>
  <div id="coachbody" style="display:none;padding:10px">
    <div id="coachlog" style="height:180px;overflow:auto;font-size:13px;margin-bottom:8px"></div>
    <div style="display:flex;gap:6px"><input id="coachin" style="flex:1;padding:6px;border-radius:6px;border:1px solid #475569;background:#020617;color:#e2e8f0" placeholder="Ask the coach..."><button onclick="coachSend()" style="padding:6px 10px">Send</button></div>
  </div>
</div>
<script>
function coachAdd(who,text){var l=document.getElementById('coachlog');var d=document.createElement('div');d.innerHTML='<b>'+who+':</b> ';d.appendChild(document.createTextNode(text));l.appendChild(d);l.scrollTop=l.scrollHeight;}
async function coachSend(){var i=document.getElementById('coachin');var m=i.value.trim();if(!m)return;i.value='';coachAdd('You',m);try{var r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})});var j=await r.json();coachAdd('Coach',j.reply||'...');}catch(e){coachAdd('Coach','(connection problem)');}}
document.getElementById('coachin').addEventListener('keydown',function(e){if(e.key==='Enter')coachSend();});
</script>`;
function layout(title, body, user) {
  const nav = user
    ? '<nav style="margin:8px 0"><a href="/">Home</a> · <a href="/members">Members</a> · <a href="/search">Search</a> · <a href="/upload">Upload</a> · <a href="/tests">Mission Board</a> · <a href="/profile">Profile (' + esc(user.displayName) + ')</a> · <a href="/logout">Log out</a></nav>'
    : '<nav style="margin:8px 0"><a href="/login">Log in</a> · <a href="/register">Register</a> · <a href="/tests">Mission Board</a></nav>';
  return '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(title) + ' — HexaChat Lab</title></head>' +
    '<body style="font-family:system-ui;max-width:900px;margin:0 auto;padding:14px;background:#f8fafc;color:#0f172a">' +
    progressBar() + nav + '<main>' + body + '</main>' + WIDGET + '</body></html>';
}
function gatePage() {
  const body = '<h1>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' is locked</h1>' +
    '<p>This lab is locked. Paste the completion key from Lab ' + (LAB_NUMBER - 1) + ' to start.</p>' +
    '<form method="POST" action="/unlock"><input name="key" placeholder="Completion key from Lab ' + (LAB_NUMBER - 1) + '" style="padding:8px;width:320px"> <button style="padding:8px 14px">Unlock</button></form>' +
    '<p style="color:#475569;font-size:13px">The Lab Coach (bottom-right) already works while the lab is locked — ask it who built these labs.</p>';
  return '<!doctype html><html><head><meta charset="utf-8"><title>Locked — HexaChat Lab</title></head>' +
    '<body style="font-family:system-ui;max-width:900px;margin:0 auto;padding:14px;background:#f8fafc;color:#0f172a">' + progressBar() + body + WIDGET + '</body></html>';
}

/* --- final scattered fragments --- */
const _cfgD = ['LTBVUw==', 'UFBTVA==', 'TEpFWg=='];
function completionKey() { return _un(_cfgC.concat(_cfgD)); }

/* ================= Lab Coach ================= */
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
const FEATURE_KEYWORDS = [
  ['Login & Authentication', ['login', 'log in', 'password', 'auth', 'sign in', 'reset', 'brute', 'enumerat']],
  ['Registration & Profile', ['register', 'registration', 'sign up', 'profile', 'display name']],
  ['Direct Messages', ['direct message', 'dm', 'conversation', 'block', 'message', 'delete a message']],
  ['Groups & Channels', ['group', 'channel', 'invite', 'member']],
  ['Attachments', ['attachment', 'file', 'upload', 'download']],
  ['Search', ['search']],
  ['Admin Panel', ['admin', 'moderator', 'ban', 'staff']],
  ['Platform & API', ['api', 'token', 'debug']]
];
function coachReply(rawMsg) {
  const msg = String(rawMsg || '').toLowerCase();
  const stats = featureStats();
  const done = doneCount(), total = TESTS.length;
  if (/who (built|made|created)|founder|jony|hexacyberlab/.test(msg)) return ATTRIBUTION;
  if (/key|unlock|next lab/.test(msg)) {
    if (state.keyRevealed && isComplete()) return 'You completed LAB ' + LAB_NUMBER + ' — here is the completion key for the next lab: ' + completionKey();
    return 'I do not have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at ' + done + '/' + total + ' tests (' + Math.floor(done / total * 100) + '%). Finish every test on /tests and the key will be revealed on /complete.';
  }
  for (const [feature, words] of FEATURE_KEYWORDS) {
    if (words.some(w => msg.includes(w))) {
      const fTests = TESTS.filter(t => t.feature === feature);
      if (/how|help|guide|hint|solve|do|exploit|hack/.test(msg)) {
        const attempts = state.attempts[feature] || 0;
        const allPassed = fTests.every(t => state.tests[t.id]);
        if (attempts >= 3 || allPassed) {
          const steps = fTests.filter(t => !state.tests[t.id]).map(t => '• ' + t.name + ' — ' + t.hints[2]);
          if (!steps.length) return 'You have already completed every test in ' + feature + '. Well done.';
          return 'Step by step for ' + feature + ' (you have tried ' + attempts + ' time(s), so guidance is unlocked):\n' + steps.join('\n');
        }
        return 'That feature is locked for help. First try the ' + feature + ' tests yourself at least 3 times — I can see you\'ve tried ' + attempts + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
      }
      const names = fTests.map(t => '• ' + t.name + (state.tests[t.id] ? ' ✓' : '')).join('\n');
      return feature + ' has ' + fTests.length + ' tests:\n' + names + '\nAsk me "how do I solve the ' + feature + ' tests" once you have tried at least 3 times.';
    }
  }
  if (/how many|features|tests|vulnerabilit|progress|status/.test(msg)) {
    const lines = Object.keys(stats).map(f => f + ': ' + stats[f].total + ' tests (' + stats[f].done + ' done, ' + stats[f].attempts + ' attempts)');
    return 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + total + ' tests across ' + Object.keys(stats).length + ' features. Your progress: ' + done + '/' + total + '.\n' + lines.join('\n') + '\nOpen /tests for the full mission board.';
  }
  if (/hi|hello|hey|start/.test(msg)) {
    const next = TESTS.find(t => !state.tests[t.id]);
    return 'Welcome to LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '. There are ' + total + ' security tests across ' + Object.keys(stats).length + ' features; you have completed ' + done + '. ' + (next ? 'A good next target: "' + next.name + '" (' + next.feature + '). ' : '') + 'See /tests for the mission board and hints. Remember: my step-by-step help for a feature unlocks after you have genuinely tried that feature at least 3 times.';
  }
  return 'I can tell you the test map (ask "how many tests"), explain a feature\'s tests by name, and — after you have tried a feature at least 3 times — guide you step by step. Start on /tests, use the hints beside each test, and try things yourself first.';
}

/* ================= request handler ================= */
function progressJson() {
  const done = doneCount(), total = TESTS.length;
  return { lab: LAB_NAME, number: LAB_NUMBER, total, done, pct: Math.floor(done / total * 100), features: featureStats(), complete: isComplete() };
}
function startSession(res, user) {
  const sid = crypto.randomBytes(16).toString('hex');
  const marker = crypto.randomBytes(8).toString('hex');
  sessions.set(sid, { userId: user.id, marker });
  res.writeHead(302, { Location: '/', 'Set-Cookie': ['sid=' + sid + '; Path=/; HttpOnly', 'hx_role=' + user.role + '; Path=/', 'hx_origin=' + marker + '; Path=/'] });
  res.end();
}
function markerOk(req, body) {
  const s = getSession(req);
  return !!(s && body && body.hx_marker && body.hx_marker === s.data.marker);
}
function keyMatches(given, expected) {
  const a = String(given || ''), b = String(expected || '');
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

async function handler(req, res) {
  try {
    const u = new URL(req.url, 'http://127.0.0.1');
    const p = u.pathname;
    const method = req.method;

    if (p === '/logo.png') {
      try { const img = fs.readFileSync(path.join(DIR, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(img); }
      catch (e) { return send(res, 404, 'no logo'); }
    }
    if (p === '/api/chat' && method === 'POST') {
      const b = await parseBody(req);
      return send(res, 200, JSON.stringify({ reply: coachReply(b.message) }), 'application/json');
    }
    if (p === '/api/progress') return send(res, 200, JSON.stringify(progressJson()), 'application/json');
    if (p === '/unlock') {
      if (method === 'POST') {
        const b = await parseBody(req);
        if (entryKeyMatches(b.key)) { state.unlocked = true; save(); return redirect(res, '/'); }
        return send(res, 403, 'Invalid key.');
      }
      return send(res, 200, gatePage());
    }
    if (!state.unlocked) return send(res, 200, gatePage());

    const user = currentUser(req);
    const sess = getSession(req);

    /* ---- public auth pages ---- */
    if (p === '/login') {
      if (method === 'POST') {
        const b = await parseBody(req);
        bump('Login & Authentication');
        const email = String(b.email || '').toLowerCase(), pw = String(b.password || '');
        if (email) { probeSet.add(email); if (probeSet.size >= 5) pass('user-enum'); }
        if (INJ_RE.test(email) || INJ_RE.test(pw)) {
          const target = userByEmail(email.split("'")[0]) || users[0];
          pass('sqli-login');
          return startSession(res, target);
        }
        const usr = userByEmail(email);
        if (!usr) return redirect(res, '/login?err=' + encodeURIComponent('No account found for that email address.'));
        if (usr.banned) return redirect(res, '/login?err=' + encodeURIComponent('This account has been banned.'));
        if (usr.password !== pw) {
          failedLogins[email] = (failedLogins[email] || 0) + 1;
          if (failedLogins[email] >= 10) pass('brute-force');
          return redirect(res, '/login?err=' + encodeURIComponent('Incorrect password for that account.'));
        }
        failedLogins[email] = 0;
        if (usr.id === 5) pass('demo-creds');
        return startSession(res, usr);
      }
      const err = u.searchParams.get('err');
      return send(res, 200, layout('Log in',
        '<h1>Log in to HexaChat</h1>' + (err ? '<p style="color:#b91c1c">' + esc(err) + '</p>' : '') +
        '<form method="POST" action="/login"><p><input name="email" placeholder="Email" style="padding:8px;width:280px"></p>' +
        '<p><input name="password" type="password" placeholder="Password" style="padding:8px;width:280px"></p>' +
        '<button style="padding:8px 16px">Log in</button></form>' +
        '<p><a href="/forgot">Forgot your password?</a> · <a href="/register">Create an account</a></p>' +
        '<div style="background:#fef9c3;border:1px solid #facc15;padding:10px;border-radius:8px;max-width:420px"><b>Try the demo:</b> email <code>demo@hexachat.local</code> · password <code>demo123</code></div>', user));
    }
    if (p === '/register') {
      if (method === 'POST') {
        const b = await parseBody(req);
        bump('Registration & Profile');
        const nu = { id: nextUserId++, email: String(b.email || '').toLowerCase(), password: String(b.password || ''), displayName: String(b.displayName || 'New User'), role: 'user', banned: false, issuedToken: null };
        if (b.role && String(b.role) !== 'user') { nu.role = String(b.role); if (nu.role === 'admin') pass('mass-assignment'); }
        if (nu.password.length < 8) pass('weak-password');
        if (XSS_RE.test(nu.displayName)) pass('stored-xss-profile');
        users.push(nu);
        return startSession(res, nu);
      }
      return send(res, 200, layout('Register',
        '<h1>Create your HexaChat account</h1><form method="POST" action="/register">' +
        '<p><input name="email" placeholder="Email" style="padding:8px;width:280px"></p>' +
        '<p><input name="displayName" placeholder="Display name" style="padding:8px;width:280px"></p>' +
        '<p><input name="password" type="password" placeholder="Password" style="padding:8px;width:280px"></p>' +
        '<button style="padding:8px 16px">Register</button></form>', user));
    }
    if (p === '/forgot') {
      if (method === 'POST') {
        const b = await parseBody(req);
        bump('Login & Authentication');
        const email = String(b.email || '').toLowerCase();
        if (email) { probeSet.add(email); if (probeSet.size >= 5) pass('user-enum'); }
        const usr = userByEmail(email);
        if (!usr) return send(res, 200, layout('Forgot password', '<h1>Forgot password</h1><p style="color:#b91c1c">No account with that email address.</p><p><a href="/login">Back to login</a></p>', user));
        usr.issuedToken = resetTokenFor(usr.id);
        return send(res, 200, layout('Forgot password', '<h1>Forgot password</h1><p>Reset link sent to ' + esc(email) + '. (In this lab the "email" is imaginary — see /reset.)</p><p><a href="/reset">Open the reset page</a></p>', user));
      }
      return send(res, 200, layout('Forgot password',
        '<h1>Forgot password</h1><form method="POST" action="/forgot"><input name="email" placeholder="Email" style="padding:8px;width:280px"> <button style="padding:8px 14px">Send reset link</button></form>', user));
    }
    if (p === '/reset') {
      if (method === 'POST') {
        const b = await parseBody(req);
        bump('Login & Authentication');
        const usr = userByEmail(String(b.email || '').toLowerCase());
        if (usr && String(b.token || '') === resetTokenFor(usr.id)) {
          if (usr.issuedToken !== String(b.token)) pass('reset-token');
          usr.password = String(b.newPassword || 'changed123');
          usr.issuedToken = null;
          return send(res, 200, layout('Reset password', '<h1>Password changed</h1><p>You can now <a href="/login">log in</a> with the new password.</p>', user));
        }
        return send(res, 200, layout('Reset password', '<h1>Reset password</h1><p style="color:#b91c1c">Invalid reset token.</p>', user));
      }
      return send(res, 200, layout('Reset password',
        '<h1>Reset password</h1><form method="POST" action="/reset"><p><input name="email" placeholder="Email" style="padding:8px;width:280px"></p>' +
        '<p><input name="token" placeholder="Reset token" style="padding:8px;width:280px"></p>' +
        '<p><input name="newPassword" type="password" placeholder="New password" style="padding:8px;width:280px"></p>' +
        '<button style="padding:8px 14px">Set new password</button></form>', user));
    }
    if (p === '/logout') {
      if (sess) sessions.delete(sess.sid);
      res.writeHead(302, { Location: '/login', 'Set-Cookie': ['sid=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0', 'hx_origin=; Path=/; Max-Age=0'] });
      return res.end();
    }

    /* ---- everything below needs a logged-in user, except the platform API
       (its whole point is token/no-session access) and the lab-system pages ---- */
    const OPEN_PATHS = ['/api/debug', '/api/conversations', '/tests', '/complete', '/certificate'];
    if (!user && !OPEN_PATHS.includes(p)) return redirect(res, '/login');

    if (p === '/') {
      const myConvs = conversations.filter(c => c.participants.includes(user.id));
      const convHtml = myConvs.map(c => {
        const other = userById(c.participants.find(x => x !== user.id));
        return '<li><a href="/conversations/' + c.id + '">Chat with ' + esc(other ? other.displayName : '?') + '</a></li>';
      }).join('');
      const grpHtml = groups.map(g => '<li><a href="/groups/' + g.id + '">' + esc(g.name) + '</a>' + (g.private ? ' 🔒 private' : ' (public)') + (g.roles[user.id] ? ' — you are ' + esc(g.roles[user.id]) : ' — not a member') + '</li>').join('');
      const attHtml = attachments.filter(a => a.ownerId === user.id).map(a => '<li>' + esc(a.label) + ' — <a href="/attachments/' + a.id + '">download</a></li>').join('') || '<li>(none)</li>';
      return send(res, 200, layout('Home',
        '<h1>Welcome, ' + esc(user.displayName) + '</h1>' +
        '<h2>Your direct messages</h2><ul>' + convHtml + '</ul>' +
        '<h2>Groups & channels</h2><ul>' + grpHtml + '</ul>' +
        '<h2>Your attachments</h2><ul>' + attHtml + '</ul>' +
        '<p style="color:#475569">HexaChat is a training build of LAB ' + LAB_NUMBER + '. Everything here is fake data on your own machine.</p>', user));
    }
    if (p === '/members') {
      // NOTE (intentional vuln): display names rendered RAW -> stored XSS victim view
      const rows = users.map(x => '<li><b>' + x.displayName + '</b> — ' + esc(x.email) + ' (id ' + x.id + ', role ' + esc(x.role) + ')</li>').join('');
      return send(res, 200, layout('Members', '<h1>Members</h1><ul>' + rows + '</ul>', user));
    }
    if (p === '/profile') {
      if (method === 'POST') {
        const b = await parseBody(req);
        bump('Registration & Profile');
        if (b.displayName) {
          user.displayName = String(b.displayName);
          if (XSS_RE.test(user.displayName)) pass('stored-xss-profile');
        }
        if (!markerOk(req, b)) pass('csrf-profile');
        return redirect(res, '/profile?ok=1');
      }
      return send(res, 200, layout('Profile',
        '<h1>Your profile</h1>' + (u.searchParams.get('ok') ? '<p style="color:#15803d">Profile updated.</p>' : '') +
        '<p>Email: ' + esc(user.email) + ' · Role: ' + esc(user.role) + '</p>' +
        '<form method="POST" action="/profile"><input type="hidden" name="hx_marker" value="' + esc(sess ? sess.data.marker : '') + '">' +
        '<p><input name="displayName" value="' + esc(user.displayName) + '" style="padding:8px;width:280px"></p>' +
        '<button style="padding:8px 14px">Save profile</button></form>', user));
    }

    /* ---- direct messages ---- */
    const convMatch = p.match(/^\/conversations\/(\d+)$/);
    if (convMatch && method === 'GET') {
      bump('Direct Messages');
      const conv = conversations.find(c => c.id === Number(convMatch[1]));
      if (!conv) return send(res, 404, 'Conversation not found');
      if (!conv.participants.includes(user.id)) pass('dm-idor');
      const msgs = messages.filter(m => m.convId === conv.id).map(m => {
        const a = userById(m.authorId);
        return '<div style="border-bottom:1px solid #e2e8f0;padding:6px 0"><b>' + (a ? a.displayName : '?') + '</b>: ' + esc(m.text) +
          ' <form method="POST" action="/messages/' + m.id + '/delete" style="display:inline"><button style="font-size:11px">delete</button></form></div>';
      }).join('');
      const atts = attachments.filter(a => a.convId === conv.id).map(a => '<li>' + esc(a.label) + ' — <a href="/attachments/' + a.id + '">download</a></li>').join('');
      return send(res, 200, layout('Conversation',
        '<h1>Conversation #' + conv.id + '</h1>' + msgs +
        '<form method="POST" action="/messages"><input type="hidden" name="convId" value="' + conv.id + '">' +
        '<input type="hidden" name="hx_marker" value="' + esc(sess ? sess.data.marker : '') + '">' +
        '<p><input name="text" placeholder="Type a message" style="padding:8px;width:420px"> <button style="padding:8px 14px">Send</button></p></form>' +
        (atts ? '<h3>Attachments</h3><ul>' + atts + '</ul>' : ''), user));
    }
    if (p === '/messages' && method === 'POST') {
      const b = await parseBody(req);
      bump('Direct Messages');
      const conv = conversations.find(c => c.id === Number(b.convId));
      if (!conv) return send(res, 404, 'Conversation not found');
      const otherId = conv.participants.find(x => x !== user.id);
      if (otherId && isBlocked(otherId, user.id)) {
        return send(res, 200, layout('Blocked', '<h1>Message not sent</h1><p>You cannot message this user.</p><p><a href="/">Home</a></p>', user));
      }
      messages.push({ id: nextMsgId++, convId: conv.id, groupId: null, authorId: user.id, text: String(b.text || '') });
      return redirect(res, '/conversations/' + conv.id);
    }
    if (p === '/api/send' && method === 'POST') {
      const b = await parseBody(req);
      bump('Direct Messages');
      const to = userById(Number(b.to));
      if (!to) return send(res, 404, JSON.stringify({ error: 'no such user' }), 'application/json');
      let conv = conversations.find(c => c.participants.includes(user.id) && c.participants.includes(to.id));
      if (!conv) { conv = { id: nextConvId++, participants: [user.id, to.id] }; conversations.push(conv); }
      // NOTE (intentional vuln): the API path never checks blocks — the web form above does.
      messages.push({ id: nextMsgId++, convId: conv.id, groupId: null, authorId: user.id, text: String(b.text || '') });
      if (isBlocked(to.id, user.id)) pass('blocked-bypass');
      return send(res, 200, JSON.stringify({ ok: true, conversationId: conv.id }), 'application/json');
    }
    const delMatch = p.match(/^\/messages\/(\d+)\/delete$/);
    if (delMatch && method === 'POST') {
      await parseBody(req);
      bump('Direct Messages');
      const idx = messages.findIndex(m => m.id === Number(delMatch[1]));
      if (idx >= 0) {
        if (messages[idx].authorId !== user.id) pass('dm-delete-idor');
        messages.splice(idx, 1);
      }
      return redirect(res, '/');
    }

    /* ---- groups ---- */
    const grpMatch = p.match(/^\/groups\/(\d+)$/);
    if (grpMatch && method === 'GET') {
      bump('Groups & Channels');
      const g = groups.find(x => x.id === Number(grpMatch[1]));
      if (!g) return send(res, 404, 'Group not found');
      const myRole = g.roles[user.id];
      if (g.private && !myRole) pass('group-messages-idor');
      const msgs = messages.filter(m => m.groupId === g.id).map(m => {
        const a = userById(m.authorId);
        return '<div style="border-bottom:1px solid #e2e8f0;padding:6px 0"><b>' + (a ? a.displayName : '?') + '</b>: ' + esc(m.text) +
          ' <form method="POST" action="/messages/' + m.id + '/delete" style="display:inline"><button style="font-size:11px">delete</button></form></div>';
      }).join('');
      const memberRows = Object.keys(g.roles).map(uid => { const mu = userById(uid); return '<li>' + (mu ? esc(mu.displayName) : uid) + ' (id ' + uid + ') — ' + esc(g.roles[uid]) + '</li>'; }).join('');
      return send(res, 200, layout(g.name,
        '<h1>' + esc(g.name) + '</h1><p>' + (g.private ? '🔒 Private group' : 'Public group') + ' · owner id ' + g.ownerId + ' · your role: ' + esc(myRole || 'not a member') + '</p>' +
        '<h3>Messages</h3>' + msgs +
        '<form method="POST" action="/groups/' + g.id + '/post"><p><input name="text" placeholder="Message the group" style="padding:8px;width:420px"> <button style="padding:8px 14px">Post</button></p></form>' +
        '<h3>Members</h3><ul>' + memberRows + '</ul>' +
        '<h3>Join this group</h3><form method="POST" action="/groups/' + g.id + '/join"><input name="invite" placeholder="Invite code (private groups)"> <button>Join</button></form>' +
        '<h3>Change a member role</h3><form method="POST" action="/groups/' + g.id + '/role"><input name="userId" placeholder="User id" size="6"> <select name="role"><option>member</option><option>admin</option><option>owner</option></select> <button>Set role</button></form>' +
        '<h3>Remove a member</h3><form method="POST" action="/groups/' + g.id + '/remove"><input name="userId" placeholder="User id" size="6"> <button>Remove</button></form>', user));
    }
    const grpPost = p.match(/^\/groups\/(\d+)\/post$/);
    if (grpPost && method === 'POST') {
      const b = await parseBody(req);
      bump('Groups & Channels');
      const g = groups.find(x => x.id === Number(grpPost[1]));
      if (!g) return send(res, 404, 'Group not found');
      messages.push({ id: nextMsgId++, convId: null, groupId: g.id, authorId: user.id, text: String(b.text || '') });
      return redirect(res, '/groups/' + g.id);
    }
    const grpJoin = p.match(/^\/groups\/(\d+)\/join$/);
    if (grpJoin && method === 'POST') {
      const b = await parseBody(req);
      bump('Groups & Channels');
      const g = groups.find(x => x.id === Number(grpJoin[1]));
      if (!g) return send(res, 404, 'Group not found');
      if (!g.roles[user.id]) {
        // NOTE (intentional vuln): membership is granted even when the invite is missing/wrong.
        if (g.private && String(b.invite || '') !== g.inviteCode) pass('group-join');
        g.roles[user.id] = 'member';
      }
      return redirect(res, '/groups/' + g.id);
    }
    const grpRole = p.match(/^\/groups\/(\d+)\/role$/);
    if (grpRole && method === 'POST') {
      const b = await parseBody(req);
      bump('Groups & Channels');
      const g = groups.find(x => x.id === Number(grpRole[1]));
      if (!g) return send(res, 404, 'Group not found');
      const requesterRole = g.roles[user.id];
      const target = Number(b.userId), role = String(b.role || '');
      if (['member', 'admin', 'owner'].includes(role) && g.roles[target] !== undefined) {
        g.roles[target] = role;
        if (target === user.id && requesterRole !== 'admin' && requesterRole !== 'owner' && (role === 'admin' || role === 'owner')) pass('group-role-escalation');
      }
      return redirect(res, '/groups/' + g.id);
    }
    const grpRemove = p.match(/^\/groups\/(\d+)\/remove$/);
    if (grpRemove && method === 'POST') {
      const b = await parseBody(req);
      bump('Groups & Channels');
      const g = groups.find(x => x.id === Number(grpRemove[1]));
      if (!g) return send(res, 404, 'Group not found');
      const requesterRole = g.roles[user.id];
      const target = Number(b.userId);
      if (g.roles[target] !== undefined) {
        delete g.roles[target];
        if (target === g.ownerId && requesterRole !== 'admin' && requesterRole !== 'owner') pass('group-remove-owner');
      }
      return redirect(res, '/groups/' + g.id);
    }

    /* ---- attachments ---- */
    const attMatch = p.match(/^\/attachments\/(\d+)$/);
    if (attMatch && method === 'GET') {
      bump('Attachments');
      const att = attachments.find(a => a.id === Number(attMatch[1]));
      if (!att) return send(res, 404, 'Attachment not found');
      if (att.ownerId !== user.id) pass('attachment-idor');
      try {
        const content = fs.readFileSync(path.join(FILES_DIR, att.filename), 'utf8');
        return send(res, 200, content, 'text/plain; charset=utf-8');
      } catch (e) { return send(res, 404, 'File missing'); }
    }
    if (p === '/download' && method === 'GET') {
      bump('Attachments');
      const file = u.searchParams.get('file') || '';
      const resolved = path.join(FILES_DIR, file);
      try {
        const content = fs.readFileSync(resolved, 'utf8');
        if (file.includes('..') && !resolved.startsWith(FILES_DIR)) pass('download-traversal');
        return send(res, 200, content, 'text/plain; charset=utf-8');
      } catch (e) { return send(res, 404, 'File not found'); }
    }
    if (p === '/upload') {
      if (method === 'POST') {
        const b = await parseBody(req);
        bump('Attachments');
        const name = path.basename(String(b.filename || 'upload.txt'));
        fs.writeFileSync(path.join(FILES_DIR, name), String(b.content || ''));
        attachments.push({ id: nextAttId++, ownerId: user.id, convId: null, filename: name, label: name });
        if (/\.(html?|svg)$/i.test(name)) pass('upload-html');
        return send(res, 200, layout('Uploaded', '<h1>File stored</h1><p>Your file is served at <a href="/files/' + encodeURIComponent(name) + '">/files/' + esc(name) + '</a></p>', user));
      }
      return send(res, 200, layout('Upload',
        '<h1>Share a file</h1><form method="POST" action="/upload"><p><input name="filename" placeholder="filename.txt" style="padding:8px;width:280px"></p>' +
        '<p><textarea name="content" rows="5" cols="50" placeholder="File content"></textarea></p>' +
        '<button style="padding:8px 14px">Upload</button></form>', user));
    }
    if (p.startsWith('/files/') && method === 'GET') {
      const name = path.basename(decodeURIComponent(p.slice('/files/'.length)));
      try {
        const content = fs.readFileSync(path.join(FILES_DIR, name));
        const type = /\.html?$/i.test(name) ? 'text/html; charset=utf-8' : (/\.svg$/i.test(name) ? 'image/svg+xml' : 'text/plain; charset=utf-8');
        res.writeHead(200, { 'Content-Type': type });
        return res.end(content);
      } catch (e) { return send(res, 404, 'File not found'); }
    }

    /* ---- search ---- */
    if (p === '/search') {
      const q = u.searchParams.get('q') || '';
      let resultsHtml = '';
      if (u.searchParams.has('q')) {
        bump('Search');
        let pool;
        if (INJ_RE.test(q)) {
          pass('search-sqli');
          pool = messages; // injected condition matches everything — including private groups and other users' DMs
        } else {
          pool = messages.filter(m => {
            if (m.groupId) { const g = groups.find(x => x.id === m.groupId); return g && (!g.private || g.roles[user.id]); }
            const c = conversations.find(x => x.id === m.convId);
            return c && c.participants.includes(user.id);
          }).filter(m => m.text.toLowerCase().includes(q.toLowerCase()));
        }
        const hits = pool.filter(m => INJ_RE.test(q) ? true : m.text.toLowerCase().includes(q.toLowerCase()));
        resultsHtml = '<h2>Results for "' + q + '"</h2>' + (XSS_RE.test(q) ? '' : '') +
          (hits.length ? '<ul>' + hits.map(m => { const a = userById(m.authorId); return '<li><b>' + esc(a ? a.displayName : '?') + '</b>: ' + esc(m.text) + '</li>'; }).join('') + '</ul>' : '<p>No messages matched.</p>');
        if (XSS_RE.test(q)) pass('search-xss');
      }
      return send(res, 200, layout('Search',
        '<h1>Search messages</h1><form method="GET" action="/search"><input name="q" value="' + esc(q) + '" placeholder="Search..." style="padding:8px;width:320px"> <button style="padding:8px 14px">Search</button></form>' + resultsHtml, user));
    }

    /* ---- admin ---- */
    if (p === '/moderator' && method === 'GET') {
      bump('Admin Panel');
      if (user.role !== 'admin') pass('moderator-bac');
      const rows = reports.map(r => '<li>Report #' + r.id + ' — reporter: ' + esc(r.reporter) + ' · target: ' + esc(r.target) + ' · reason: ' + esc(r.reason) + '</li>').join('');
      return send(res, 200, layout('Moderator console', '<h1>Moderator console</h1><p>Abuse reports queue (staff only):</p><ul>' + rows + '</ul>', user));
    }
    if (p === '/admin' && method === 'GET') {
      bump('Login & Authentication');
      const cookies = parseCookies(req);
      if (cookies.hx_role !== 'admin') return send(res, 403, layout('Forbidden', '<h1>403 — Admins only</h1>', user));
      if (user.role !== 'admin') pass('role-cookie');
      const rows = users.map(x => '<li>' + esc(x.displayName) + ' — ' + esc(x.email) + ' (id ' + x.id + ', role ' + esc(x.role) + (x.banned ? ', BANNED' : '') + ')</li>').join('');
      return send(res, 200, layout('Admin panel',
        '<h1>Admin panel</h1><h3>All users</h3><ul>' + rows + '</ul>' +
        '<h3>Ban a user</h3><form method="POST" action="/admin/ban"><input type="hidden" name="hx_marker" value="' + esc(sess ? sess.data.marker : '') + '">' +
        '<input name="userId" placeholder="User id" size="6"> <button>Ban user</button></form>', user));
    }
    if (p === '/admin/ban' && method === 'POST') {
      const b = await parseBody(req);
      bump('Admin Panel');
      const cookies = parseCookies(req);
      if (cookies.hx_role !== 'admin' && user.role !== 'admin') return send(res, 403, 'Admins only');
      const target = userById(Number(b.userId));
      if (target) {
        target.banned = true;
        if (!markerOk(req, b)) pass('admin-ban-csrf');
      }
      return redirect(res, '/admin');
    }

    /* ---- platform API ---- */
    if (p === '/api/conversations' && method === 'GET') {
      bump('Platform & API');
      const token = req.headers['x-api-token'] || '';
      let tu = null;
      try { tu = userByEmail(Buffer.from(String(token), 'base64').toString('utf8')); } catch (e) { tu = null; }
      if (!tu) return send(res, 401, JSON.stringify({ error: 'invalid token' }), 'application/json');
      if (!sess || sess.data.userId !== tu.id) pass('api-token');
      const convs = conversations.filter(c => c.participants.includes(tu.id)).map(c => ({ id: c.id, participants: c.participants, messages: messages.filter(m => m.convId === c.id) }));
      return send(res, 200, JSON.stringify({ user: tu.email, conversations: convs }), 'application/json');
    }
    if (p === '/api/debug' && method === 'GET') {
      bump('Platform & API');
      pass('api-debug');
      return send(res, 200, JSON.stringify({ users, groups, blocks, note: 'debug build — remove before production' }, null, 2), 'application/json');
    }

    /* ---- mission board ---- */
    if (p === '/tests' && method === 'GET') {
      const stats = featureStats();
      let html = '<h1>Mission Board — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h1>' +
        '<p>' + doneCount() + '/' + TESTS.length + ' tests complete. Tests flip to done only when the exploit really works — there are no checkboxes. ' +
        'The Lab Coach unlocks step-by-step help for a feature after you have tried that feature at least 3 times.</p>';
      for (const feature of Object.keys(stats)) {
        html += '<h2>' + esc(feature) + ' <small style="color:#475569">(' + stats[feature].done + '/' + stats[feature].total + ' done · ' + stats[feature].attempts + ' attempts)</small></h2>';
        for (const t of TESTS.filter(x => x.feature === feature)) {
          const st = state.tests[t.id] ? '<span style="color:#15803d">✓ done</span>' : '<span style="color:#b45309">○ open</span>';
          html += '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px;margin:8px 0">' +
            '<b>' + esc(t.name) + '</b> ' + st + '<br><small>' + esc(t.owasp) + ' · ' + esc(t.difficulty) + ' · ' + esc(t.where) + '</small>' +
            '<div style="margin-top:6px"><button onclick="var h=this.parentNode.querySelectorAll(\'.hint\');for(var i=0;i<h.length;i++){if(h[i].style.display===\'none\'){h[i].style.display=\'block\';break;}}">Show hint</button> ' +
            t.hints.map((h, i) => '<div class="hint" style="display:none;background:#fef9c3;padding:6px;margin-top:4px;border-radius:6px">Hint ' + (i + 1) + ': ' + esc(h) + '</div>').join('') +
            '</div></div>';
        }
      }
      return send(res, 200, layout('Mission Board', html, user));
    }

    /* ---- completion ---- */
    if (p === '/complete') {
      if (method === 'POST') {
        const b = await parseBody(req);
        if (b.testerName) { state.testerName = String(b.testerName).slice(0, 60); save(); }
        return redirect(res, '/complete');
      }
      if (!isComplete()) {
        const left = TESTS.filter(t => !state.tests[t.id]).map(t => '<li>' + esc(t.name) + ' (' + esc(t.feature) + ')</li>').join('');
        return send(res, 200, layout('Not yet complete',
          '<h1>Not yet — ' + doneCount() + '/' + TESTS.length + ' tests done (' + Math.floor(doneCount() / TESTS.length * 100) + '%)</h1><p>Still open:</p><ul>' + left + '</ul><p><a href="/tests">Back to the Mission Board</a></p>', user));
      }
      const stats = featureStats();
      const features = Object.keys(stats);
      const s1 = '<h2>1) Features in this lab</h2><p>' + features.length + ' features: ' + features.map(esc).join(', ') + '</p>';
      const s2 = '<h2>2) Vulnerability count per feature</h2><ul>' + features.map(f => '<li>' + esc(f) + ': ' + stats[f].total + '</li>').join('') + '</ul>';
      const s3 = '<h2>3) Ways testing was done (' + TESTS.length + ' techniques)</h2><ul>' + TESTS.map(t => '<li>' + esc(t.name) + ' — ' + esc(t.owasp) + '</li>').join('') + '</ul>';
      const s4 = '<h2>4) What you learned</h2><ul>' + TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.lesson) + '</li>').join('') + '</ul>';
      const s5 = '<h2>5) What this means for a real client</h2><ul>' + TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.impact) + '</li>').join('') + '</ul>';
      const s6 = '<h2>6) Writing it in a real report</h2><ul>' + TESTS.map(t => '<li><b>' + esc(t.report.title) + '</b> — Severity: ' + esc(t.report.severity) + ' — Remediation: ' + esc(t.report.remediation) + '</li>').join('') + '</ul>';
      const keyBlock = '<div style="background:#dcfce7;border:1px solid #22c55e;padding:12px;border-radius:8px"><h2>Completion key — unlocks Lab ' + (LAB_NUMBER + 1) + '</h2>' +
        '<code style="font-size:18px">' + esc(completionKey()) + '</code><p>Keep it safe. The Lab Coach can also give it to you now that the lab is complete.</p></div>';
      const nameForm = '<form method="POST" action="/complete"><p>Your name for the certificate: <input name="testerName" value="' + esc(state.testerName) + '" style="padding:6px;width:240px"> <button style="padding:6px 12px">Save name</button></p></form>' +
        '<p><a href="/certificate">Open your certificate</a></p>';
      return send(res, 200, layout('Lab complete', '<h1>🎉 LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' complete: ' + TESTS.length + '/' + TESTS.length + ' tests</h1>' + s1 + s2 + s3 + s4 + s5 + s6 + keyBlock + nameForm, user));
    }
    if (p === '/certificate' && method === 'GET') {
      if (!isComplete()) return redirect(res, '/complete');
      const stats = featureStats();
      const name = state.testerName || (user ? user.displayName : 'HexaChat Tester');
      const date = state.completedAt ? new Date(state.completedAt).toDateString() : new Date().toDateString();
      const card = '<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ' + LAB_NUMBER + '</title>' +
        '<style>@media print{#coach,nav{display:none}}</style></head><body style="font-family:Georgia,serif;background:#f1f5f9;padding:30px">' +
        '<div style="max-width:680px;margin:0 auto;background:#fff;border:3px solid #0f172a;border-radius:12px;padding:36px;text-align:center">' +
        '<img src="/logo.png" alt="HexaCyberLab" style="height:64px">' +
        '<h1 style="margin:10px 0">Certificate of Completion</h1>' +
        '<p>This is to certify that</p><h2 style="margin:6px 0">' + esc(name) + '</h2>' +
        '<p>has completed 100% of the security tests in <b>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</b><br>(' + TESTS.length + ' tests across ' + Object.keys(stats).length + ' features)</p>' +
        '<p>' + esc(date) + '</p><hr><p><b>HexaCyberLab — Built by Md. Jony Hassain, Founder</b></p></div>' +
        '<p style="text-align:center"><a href="/complete">Back to the completion summary</a></p>' + WIDGET + '</body></html>';
      return send(res, 200, card);
    }

    return send(res, 404, layout('Not found', '<h1>404 — page not found</h1>', user));
  } catch (e) {
    try { send(res, 500, 'Server error'); } catch (e2) {}
  }
}

/* ================= docs generation ================= */
function genDocs() {
  const feats = [];
  for (const t of TESTS) if (!feats.includes(t.feature)) feats.push(t.feature);
  let vuln = '# HexaChat (LAB ' + LAB_NUMBER + ') — Vulnerability Map\n\nAll ' + TESTS.length + ' scored tests, grouped by feature. Every item is a real, working flaw in this local training build.\n';
  for (const f of feats) {
    vuln += '\n## ' + f + '\n';
    for (const t of TESTS.filter(x => x.feature === f)) {
      vuln += '\n### ' + t.name + '\n- OWASP: ' + t.owasp + '\n- Difficulty: ' + t.difficulty + '\n- Location: ' + t.where + '\n- Exploitation outline: ' + t.hints[2] + '\n- Impact: ' + t.impact + '\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'), vuln);
  const order = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  let guide = '# HexaChat (LAB ' + LAB_NUMBER + ') — Practice Guide\n\nChallenges grouped by feature, then difficulty. The /tests Mission Board mirrors this guide. A challenge is complete only when its detection flips on the server — never by declaration.\n';
  for (const f of feats) {
    guide += '\n## ' + f + '\n';
    for (const t of TESTS.filter(x => x.feature === f).sort((a, b) => order[a.difficulty] - order[b.difficulty])) {
      guide += '\n### ' + t.name + ' (' + t.difficulty + ')\n- Objective: ' + t.objective + '\n- Hints:\n  1. ' + t.hints[0] + '\n  2. ' + t.hints[1] + '\n  3. ' + t.hints[2] + '\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'), guide);
  let fix = '# HexaChat (LAB ' + LAB_NUMBER + ') — Fix & Retest\n\nFor every scored test: the report entry, the secure implementation, and how to retest. After fixing, repeat the attack from the Practice Guide — it must fail, and the legitimate flow must still work.\n';
  for (const t of TESTS) {
    fix += '\n## ' + t.report.title + '\n- Test: ' + t.name + ' (' + t.feature + ')\n- Severity: ' + t.report.severity + '\n- Remediation: ' + t.report.remediation + '\n- Secure implementation: ' + t.fix + '\n- Regression test: repeat the exploit for "' + t.name + '" — the attack must be blocked, rejected or safely encoded, while the normal feature keeps working for legitimate users.\n';
  }
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'), fix);
  console.log('Docs generated from registry: ' + TESTS.length + ' tests across ' + feats.length + ' features.');
}

if (process.argv.includes('--gen-docs')) { genDocs(); process.exit(0); }
http.createServer(handler).listen(PORT, '127.0.0.1', () => {
  console.log('LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' listening on http://127.0.0.1:' + PORT + ' (local training only)');
});
