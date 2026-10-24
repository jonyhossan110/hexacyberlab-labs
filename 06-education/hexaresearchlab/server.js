'use strict';
/*
 * HexaResearchLab — LAB 60 of the HexaCyberLab vulnerable-lab programme.
 * Category 6: Education & E-learning. Port 3069. LOCAL USE ONLY.
 * An intentionally vulnerable academic research portal: paper submissions,
 * double-blind peer review, reviewer invitations, editorial decisions.
 * Zero-dependency Node.js. All data is fake seed data held in memory.
 * Progress (tests passed, attempts, unlock state) persists in progress.json.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB = { number: 60, name: 'HexaResearchLab', prev: 59, port: 3069, category: 'Education & E-learning' };
const DIR = __dirname;
const FILES_DIR = path.join(DIR, 'files');
const PROGRESS_FILE = path.join(DIR, 'progress.json');

/* --- completion/entry key material, region 1 of 3 (sharded, encoded) --- */
const _EA = ["TC1YSA==","Ti0wNg=="];
const _CA = ["TC1YSA==","Qy0xNg=="];
function _unshard(parts) {
  return parts.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}

/* ============================ TESTS registry ============================ */
const F_AUTH = 'Login & Authentication';
const F_REG = 'Registration & Profile';
const F_SUB = 'Paper Submissions';
const F_REV = 'Peer Review';
const F_SEARCH = 'Search';
const F_ADMIN = 'Admin Panel';
const F_API = 'Platform & API';

const TESTS = [
  { id: 'auth-sqli', feature: F_AUTH, name: 'SQL Injection — Login Bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    location: 'POST /login',
    exploit: "Submit a login whose email contains a tautology injection (' OR '1'='1). The string-built query matches the first user row and a session is issued without any valid password.",
    hints: [
      'The login form builds its database query by gluing your input straight into the query text.',
      'Try a quote in the email field — then make the rest of the condition always true.',
      "Email: admin@hexaresearchlab.local' OR '1'='1 — the password check never really happens."
    ],
    lesson: 'String-built queries let an attacker rewrite the login logic itself. Parametrised queries keep input as data, never code.',
    impact: 'On a real portal this is full account takeover without any password — every author, reviewer and editor account, and every unpublished paper behind them, is exposed.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parametrised queries / prepared statements for all database access, and only authenticate when exactly one row matches.' } },
  { id: 'auth-brute', feature: F_AUTH, name: 'Brute Force — No Rate Limiting on Login', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    location: 'POST /login',
    exploit: 'Submit 10 or more wrong passwords for one account. Every attempt is processed at full speed — no lockout, no delay, no CAPTCHA.',
    hints: [
      'Nothing slows you down here — no lockout, no CAPTCHA, no delay.',
      'Pick a target email and just keep guessing passwords.',
      'After 10 failed attempts for one account the portal still happily processes the 11th — the missing throttle is the flaw.'
    ],
    lesson: 'Without throttling, password guessing is limited only by the attacker\u2019s bandwidth. Rate limits and lockouts turn an automated attack into a noisy, losing one.',
    impact: 'Attackers can grind through weak passwords for researcher accounts around the clock; one guessed editor password hands them every submission and decision in the portal.',
    report: { title: 'Missing Rate Limiting and Account Lockout on the Login Endpoint', severity: 'High', remediation: 'Add progressive delays and temporary lockout after repeated failures, plus alerting on credential-stuffing patterns.' } },
  { id: 'auth-enum', feature: F_AUTH, name: 'User Enumeration via Password Reset', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    location: 'POST /forgot-password',
    exploit: 'The forgot-password form replies "reset link sent" for real accounts and "no account found" for invented ones. Probe at least 5 different emails and compare the answers.',
    hints: [
      'The forgot-password form answers differently depending on whether the account exists.',
      'Compare the message for a real email against an invented one.',
      'Probe at least 5 different emails and note which ones the portal confirms as registered.'
    ],
    lesson: 'Differential responses turn any public form into an account oracle. Uniform, generic responses deny attackers that free reconnaissance.',
    impact: 'Attackers harvest a verified list of which researchers use the portal, then aim phishing and password spraying precisely at them.',
    report: { title: 'User Enumeration Through Differential Password-Reset Responses', severity: 'Medium', remediation: 'Return one generic response for every reset request, regardless of whether the account exists.' } },
  { id: 'auth-default', feature: F_AUTH, name: 'Default Demo Credentials Accepted', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    location: 'POST /login (demo account)',
    exploit: 'The login page publicly offers a demo account (demo@hexaresearchlab.local / demo123). Sign in with it — a published password is a working password.',
    hints: [
      'The login page itself offers a demo account to visitors.',
      'Demo accounts left active in production are just published passwords.',
      'Sign in with the demo email and password printed on the login page.'
    ],
    lesson: 'Demo and default accounts are part of the attack surface. If the world knows the password, the account is public, not private.',
    impact: 'Anyone on the internet can walk straight into the portal with the demo password and start probing internal features as an authenticated user.',
    report: { title: 'Default/Demo Credentials Active on the Production Portal', severity: 'High', remediation: 'Remove demo accounts from production, or force unique passwords and disable them by default.' } },
  { id: 'auth-reset', feature: F_AUTH, name: 'Predictable Password-Reset Token', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    location: 'POST /reset-password',
    exploit: "Reset tokens are derived from the account's public email: 'HXRESET-' plus the first 12 characters of the base64 encoding of the email. Compute the token for any user and reset their password without ever requesting a link.",
    hints: [
      'Reset tokens here are generated, not randomised — they are derived from something public about the account.',
      'What does the portal know about a user that an attacker also knows? Start with the email address.',
      "The token is 'HXRESET-' plus the first 12 characters of the base64 of the account's email — compute it for any user and reset their password without requesting a link."
    ],
    lesson: 'A token is only a secret if it is random. Anything derived from public data (like an email address) can be recomputed by anyone.',
    impact: 'Any account — including the editor-in-chief — can be taken over by a stranger who knows only an email address, with no mailbox access needed.',
    report: { title: 'Password-Reset Tokens Are Predictable (Derived From the Email Address)', severity: 'Critical', remediation: 'Generate reset tokens with a CSPRNG (at least 128 bits), store only a hash, expire them quickly and make them single-use.' } },
  { id: 'auth-cookie', feature: F_AUTH, name: 'Role Cookie Tampering Grants Editor Access', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    location: 'GET /editor',
    exploit: 'Login sets a client-side hx_role cookie. The /editor console trusts that cookie instead of the server-side session. Set hx_role to editor in your browser and open /editor with an ordinary account.',
    hints: [
      'After login the browser carries a cookie that repeats your role back to the server.',
      'One page trusts that cookie instead of the server-side session record.',
      "Set your hx_role cookie to 'editor' and open /editor — your real role never changes, but the door opens."
    ],
    lesson: 'Authorisation decisions must come from server-side state. Anything stored on the client — cookies included — is attacker-controlled input.',
    impact: 'Any registered user can promote themselves to editor in their own browser and reach the editorial console, including pending decisions on papers.',
    report: { title: 'Client-Controlled Role Cookie Trusted for Authorisation (Editor Console)', severity: 'High', remediation: 'Derive roles only from the server-side session record; never trust client-supplied role claims.' } },
  { id: 'reg-mass', feature: F_REG, name: 'Mass Assignment — Self-Assigned Editor Role at Registration', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    location: 'POST /register',
    exploit: 'The registration handler copies every submitted field onto the new account. Add a field the form never shows — role=editor — and the account is created as an editor.',
    hints: [
      'The registration form only shows a few fields, but the server reads more from the request than it shows.',
      'What happens if you add a field the form never offered?',
      'Register with an extra field role=editor — the account is created holding that role.'
    ],
    lesson: 'Binding request bodies directly to data models hands attackers every field you forgot to exclude. Whitelist the fields a form may set.',
    impact: 'A stranger can register themselves as an editor — no approval, no insider help — and immediately join the workflow that accepts and rejects papers.',
    report: { title: 'Mass Assignment in Registration Allows Privilege Escalation', severity: 'High', remediation: 'Bind only whitelisted fields on registration; assign roles server-side, never from request input.' } },
  { id: 'reg-weakpw', feature: F_REG, name: 'Weak Password Policy — 1-Character Passwords Accepted', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    location: 'POST /register',
    exploit: 'Register an account with a password of a single character. There is no length or complexity policy at all.',
    hints: [
      'Try registering with the shortest password the form will take.',
      'There is no minimum length or complexity check anywhere.',
      'A password of a single character is accepted.'
    ],
    lesson: 'Password policy is the floor under every other control. If one-character passwords are allowed, brute force stops being an attack and becomes a formality.',
    impact: 'Accounts protected by trivial passwords fall instantly to guessing, handing attackers legitimate logins into the submission system.',
    report: { title: 'Weak Password Policy on Registration', severity: 'Medium', remediation: 'Enforce a minimum length of at least 10 characters and screen new passwords against known-breached lists.' } },
  { id: 'reg-xss', feature: F_REG, name: 'Stored XSS in Display Name', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    location: 'POST /register, POST /profile/update',
    exploit: 'The display name is stored and later rendered unencoded in the page header for that user. Register or rename yourself with a name containing a script payload and it is stored as-is.',
    hints: [
      'Your display name is printed back in the header of every page — and it is not encoded.',
      'Whatever you store as your name is delivered to the browser exactly as you wrote it.',
      'Register (or rename yourself) with a name containing a script payload and watch it stored raw.'
    ],
    lesson: 'Stored user input is untrusted data forever, not just at input time. Output encoding at render is what defuses it.',
    impact: 'A crafted display name executes script in the browsers of editors and reviewers who share pages with it — a stepping stone to session theft and actions taken in their name.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-encode all user-supplied output and validate display names against an allow-list pattern.' } },
  { id: 'reg-csrf', feature: F_REG, name: 'CSRF on Profile Update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    location: 'POST /profile/update',
    exploit: 'The profile form renders a same-site marker field, but the server never verifies it. Submit the update from a cross-site origin (or with the marker missing) and the change is saved anyway.',
    hints: [
      'The profile form carries a same-site marker — but does the server ever check it?',
      'A state-changing POST from another origin is processed exactly like your own.',
      'Submit the profile update with a cross-site Origin header and no marker field — the change is saved anyway.'
    ],
    lesson: 'Rendering a CSRF token is decoration; verifying it is the control. Every state-changing request must prove it came from your own pages.',
    impact: 'A malicious page a researcher merely visits can silently rewrite their profile — the classic first step toward account-takeover chains and impersonation.',
    report: { title: 'Cross-Site Request Forgery on Profile Update', severity: 'Medium', remediation: 'Require and verify an unpredictable CSRF token on every state-changing request, and validate Origin/Referer.' } },
  { id: 'sub-idor', feature: F_SUB, name: "Paper IDOR — Reading Another Author's Paper", owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    location: 'GET /papers/:id',
    exploit: 'Paper pages are keyed by a small numeric id and never check your relationship to the paper. Sign in as one author and open another author\u2019s paper in full.',
    hints: [
      'Paper URLs carry a simple numeric id.',
      'Nobody checks whether the paper belongs to you, is assigned to you, or is any of your business.',
      'Open /papers/2 while signed in as a different author and read the full paper.'
    ],
    lesson: 'Every object access needs an authorisation decision, not just an authentication check. Predictable ids plus no ownership check equals total exposure.',
    impact: 'Unpublished research — the crown jewels of a research portal — can be read and stolen by any registered user, including competitors of the authors.',
    report: { title: 'Insecure Direct Object Reference Exposes Other Authors\u2019 Papers', severity: 'High', remediation: 'Check authorisation (owner, assigned reviewer, or editor) on every paper access.' } },
  { id: 'sub-download', feature: F_SUB, name: 'Manuscript Download Without Authorisation', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    location: 'GET /papers/:id/manuscript',
    exploit: 'The manuscript endpoint repeats the paper page\u2019s missing check: any signed-in user can download the full text of any paper, assigned or not.',
    hints: [
      'The manuscript link hangs off the paper page — and the download endpoint has the same missing check.',
      'You do not need to own a paper, or be assigned to review it, to pull its full text.',
      'Request /papers/<id>/manuscript for a paper you have no relationship with.'
    ],
    lesson: 'File downloads are object accesses too. Every route that serves an object must repeat the same authorisation check — attackers go straight for the file.',
    impact: 'Complete manuscripts can be bulk-harvested by any user, leaking unpublished findings, data and methods before peer review even finishes.',
    report: { title: 'Manuscript Download Missing Authorisation (IDOR)', severity: 'High', remediation: 'Enforce the same ownership/assignment check on file downloads as on the paper page.' } },
  { id: 'sub-upload', feature: F_SUB, name: 'Unrestricted File Upload — Stored HTML Served From the Portal', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Intermediate',
    location: 'POST /papers/:id/upload, GET /files/:name',
    exploit: 'Attachments are accepted with no type check and served back under the portal origin with a content type taken from the extension. Upload evil.html with markup inside and open /files/evil.html — it renders as a page of this portal.',
    hints: [
      'The attachment upload never asks what kind of file you are sending.',
      'The portal serves your file back under its own origin, with a content type picked from the extension.',
      'Upload a file named evil.html containing markup and open /files/evil.html — it renders as a page of this portal.'
    ],
    lesson: 'An upload feature is a content-publishing feature unless you cage it: allow-list types, neutralise content types, and isolate where uploads are served from.',
    impact: 'Attackers can host phishing pages and script under the portal\u2019s trusted address, aimed at editors and reviewers — the perfect lure inside a trusted workflow.',
    report: { title: 'Unrestricted File Upload Allows Stored HTML/JS Under the Portal Origin', severity: 'High', remediation: 'Allow-list file types, store uploads outside the web root or on a separate domain, and serve them with a safe Content-Type and Content-Disposition.' } },
  { id: 'sub-traversal', feature: F_SUB, name: 'Path Traversal in Supplementary File Download', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    location: 'GET /download?file=',
    exploit: 'The download helper joins the requested name onto the files folder without sanitising it. Ask for ../data/editor-notes.txt and the editors\u2019 private notes are served.',
    hints: [
      'The download helper joins your file name onto the files folder without cleaning it.',
      'Dot-dot segments let you walk out of the folder.',
      'Ask the download endpoint for ../data/editor-notes.txt and read the editors\u2019 private notes.'
    ],
    lesson: 'User-controlled paths must be canonicalised and confined. Joining raw input onto a base directory is an open door to the whole filesystem the process can read.',
    impact: 'Internal files outside the download folder — editorial notes, configuration, other submissions — become readable to any user, and on real systems this often reaches credentials.',
    report: { title: 'Path Traversal in File Download Endpoint', severity: 'High', remediation: 'Resolve the requested path and verify it stays inside the intended directory; reject traversal sequences outright.' } },
  { id: 'rev-unassigned', feature: F_REV, name: 'Review Submitted Without Assignment', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    location: 'POST /papers/:id/reviews',
    exploit: 'The review form only appears for assigned reviewers, but the endpoint trusts any signed-in POST. Submit a review for a paper you were never assigned to.',
    hints: [
      'The review form only appears when you are assigned, but the endpoint behind it trusts the POST.',
      'Any signed-in user can post a review for any paper if they ask the endpoint directly.',
      'POST a review to /papers/<id>/reviews for a paper you were never assigned to.'
    ],
    lesson: 'Hiding a form is not authorisation. The server must verify the workflow relationship (assignment) on every action, every time.',
    impact: 'Anyone can inject fake peer reviews into any submission — rigging outcomes, sinking rivals\u2019 papers or praising their own allies.',
    report: { title: 'Broken Access Control Allows Reviews From Unassigned Users', severity: 'High', remediation: 'Verify reviewer assignment server-side before accepting any review.' } },
  { id: 'rev-score', feature: F_REV, name: "Tampering With Another Reviewer's Score", owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    location: 'POST /reviews/:id/score',
    exploit: 'The score-update endpoint is keyed by review id and never asks whose review it is. POST a new score for a review you did not write.',
    hints: [
      'Review scores can be updated through a small endpoint keyed by review id.',
      'The endpoint never asks whose review it is.',
      'POST a new score to /reviews/<id>/score for a review you did not write.'
    ],
    lesson: 'Ownership checks belong on every mutable object, however small the endpoint. A one-field update can still decide the outcome.',
    impact: 'Review scores — the numbers editorial decisions rest on — can be silently rewritten by rivals, changing which papers get accepted.',
    report: { title: 'Insecure Direct Object Reference Allows Editing Other Reviewers\u2019 Scores', severity: 'Medium', remediation: 'Check that the session user owns the review before allowing score changes.' } },
  { id: 'rev-identity', feature: F_REV, name: 'Reviewer Identity Leak to Authors (Double-Blind Broken)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    location: 'GET /api/papers/:id/reviews',
    exploit: 'A JSON endpoint returns full review records — including reviewer names and emails — to the paper\u2019s author, destroying double-blind anonymity. Fetch it as the author.',
    hints: [
      'Peer review here is supposed to be double-blind — authors must never learn who reviewed them.',
      'A JSON endpoint returns more about each review than the paper page does.',
      "As the paper's author, fetch /api/papers/<id>/reviews and read the reviewers' real names and emails."
    ],
    lesson: 'APIs must apply the same information policy as the UI. If a page anonymises data, the endpoint behind it must too.',
    impact: 'Authors learn exactly who criticised their work — enabling retaliation, pressure and collusion, and destroying trust in the double-blind process the portal promises.',
    report: { title: 'Reviewer Identities Exposed to Authors, Breaking Double-Blind Review', severity: 'High', remediation: 'Return anonymised reviewer labels to authors; expose identities only to editors.' } },
  { id: 'rev-selfassign', feature: F_REV, name: 'Author Assigns Themselves as Reviewer of Their Own Paper', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    location: 'POST /papers/:id/assign',
    exploit: 'Reviewer assignment is an editor job, but the endpoint only checks that you are signed in. As a paper\u2019s author, POST your own email to its assign endpoint and you become its reviewer.',
    hints: [
      'Assigning reviewers is an editor job — but the assignment endpoint only checks that you are signed in.',
      'The author of a paper is very motivated to review it themselves.',
      'POST your own email to /papers/<your paper id>/assign and you become its reviewer.'
    ],
    lesson: 'Workflow endpoints need both a role check and a conflict-of-interest check. Some actions must be impossible for the beneficiary, not just unlikely.',
    impact: 'Authors can review their own submissions and guarantee acceptance — the single most damaging fraud a peer-review system can allow.',
    report: { title: 'Missing Authorisation on Reviewer Assignment Enables Self-Review', severity: 'High', remediation: 'Restrict assignment to editors and block conflicts of interest (an author can never review their own paper).' } },
  { id: 'rev-decision', feature: F_REV, name: 'Accept/Reject Decision Made by a Non-Editor', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    location: 'POST /papers/:id/decide',
    exploit: 'The decision endpoint sets a paper\u2019s status to accepted or rejected and never checks the caller\u2019s role. POST a decision as a plain author and the status changes.',
    hints: [
      'The decision endpoint changes a paper\u2019s status to accepted or rejected.',
      'It never checks that the caller is an editor.',
      'POST a decision to /papers/<id>/decide as a plain author and the status changes.'
    ],
    lesson: 'The most privileged action in a workflow deserves the strongest check. If only editors may decide, the server must prove the caller is an editor.',
    impact: 'Any user can accept or reject any paper — the entire editorial process becomes meaningless and publication integrity collapses.',
    report: { title: 'Broken Access Control on the Editorial Decision Endpoint', severity: 'Critical', remediation: 'Require the editor role server-side for all decision actions and keep an audit log of decisions.' } },
  { id: 'rev-invite', feature: F_REV, name: 'Accepting a Review Invitation Addressed to Someone Else', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    location: 'POST /invitations/:id/accept',
    exploit: 'Invitations are keyed by small numeric ids and the accept endpoint never compares the addressee with the caller. Accept an invitation issued to another reviewer and you take their seat.',
    hints: [
      'Invitations are keyed by a simple numeric id and can be accepted with a POST.',
      'The endpoint never compares the invitation\u2019s addressee with your account.',
      'Accept invitation #1 while signed in as a different user and you take their reviewer seat.'
    ],
    lesson: 'Tokens and invitations must be bound to their intended recipient. An unbound invitation is a transferable capability for whoever finds it.',
    impact: 'Attackers can seat themselves as reviewers on targeted papers by accepting invitations meant for genuine experts — another road to rigged reviews.',
    report: { title: 'Invitation Acceptance Does Not Verify the Invitee (IDOR)', severity: 'Medium', remediation: 'Bind invitations to the invited account with an unguessable token and verify the acceptor matches.' } },
  { id: 'search-sqli', feature: F_SEARCH, name: 'SQL Injection in Paper Search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    location: 'GET /search?q=',
    exploit: "Search builds its query the same string-built way as login. Search for ' OR '1'='1 and the WHERE clause is true for every row — all papers return, including ones the term never matched.",
    hints: [
      'Search glues your query into the same kind of string-built statement as the login.',
      'A tautology in the search box makes the WHERE clause true for every row.',
      "Search for ' OR '1'='1 and every paper in the portal comes back, including ones your term never matched."
    ],
    lesson: 'Injection lives wherever input meets a query — search boxes are the most-tried door on any site. Parametrise every query, not just the login.',
    impact: 'Search injection can dump the entire catalogue — including under-review papers that should stay invisible — and on real stacks it escalates to full database extraction.',
    report: { title: 'SQL Injection in Paper Search', severity: 'High', remediation: 'Use parametrised queries for search and never interpolate user input into SQL.' } },
  { id: 'search-xss', feature: F_SEARCH, name: 'Reflected XSS in Search Results', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    location: 'GET /search?q=',
    exploit: 'The results page repeats your search term back unencoded. Put a script payload in q and it is reflected raw into the page.',
    hints: [
      'The results page politely repeats your search term back to you — unencoded.',
      'Whatever markup you search for lands in the page.',
      'Put a script payload in q and view the page: your payload is reflected raw.'
    ],
    lesson: 'Reflected input is live ammunition: one crafted link plus one victim equals script running in their session. Encode everything a page echoes.',
    impact: 'A booby-trapped search link sent to an editor runs script in their browser under the portal origin — session theft and actions in their name follow.',
    report: { title: 'Reflected Cross-Site Scripting in Search', severity: 'Medium', remediation: 'Encode the reflected search term in the correct (HTML) output context.' } },
  { id: 'admin-bac', feature: F_ADMIN, name: 'Admin Panel Open to Any Signed-In User', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    location: 'GET /admin',
    exploit: 'The admin console checks only that somebody is signed in — never who. Open /admin with an ordinary researcher account and browse the user administration.',
    hints: [
      'The admin console checks only that somebody is signed in — never who.',
      'Your ordinary author account is enough.',
      'Open /admin as a regular researcher and browse the user administration.'
    ],
    lesson: 'Authentication is not authorisation. Every privileged area needs its own role check, enforced on the server for every request.',
    impact: 'Every registered user can see the full account list and reach admin actions — one step from taking over the portal entirely.',
    report: { title: 'Broken Access Control Exposes the Admin Console to All Authenticated Users', severity: 'Critical', remediation: 'Enforce role checks (admin only) on every admin route, server-side.' } },
  { id: 'admin-csrf', feature: F_ADMIN, name: 'CSRF on Admin Role Change', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    location: 'POST /admin/users/:id/role',
    exploit: 'Admin role changes are plain POSTs and the same-site marker is never verified. Submit a role change with a cross-site Origin (or no marker) and the role still changes.',
    hints: [
      'Admin actions change user roles with a plain POST.',
      'Like the profile form, the marker is rendered but never verified.',
      'Submit the role change from a cross-site origin, or without the marker, and the role still changes.'
    ],
    lesson: 'Privileged actions need the strongest request-integrity guarantees: verified CSRF tokens, and ideally re-authentication for role changes.',
    impact: 'Tricking one admin (or any user, given the open admin panel) into visiting a hostile page can silently promote an attacker\u2019s account to admin.',
    report: { title: 'Cross-Site Request Forgery on Admin Role Management', severity: 'High', remediation: 'Verify CSRF tokens on all admin actions and require re-authentication for role changes.' } },
  { id: 'api-token', feature: F_API, name: 'Weak API Token — Base64 of the Account Email', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    location: 'GET /api/papers (X-Api-Key header)',
    exploit: 'The API checks X-Api-Key against issued keys, but a legacy fallback also accepts the base64 encoding of any user\u2019s email. Send that as the key and the API lets you in.',
    hints: [
      'The JSON API wants an X-Api-Key header. Real keys are shown in profiles — but the API also accepts something far weaker.',
      'The legacy check accepts a trivial encoding of a public fact about the account.',
      'Send X-Api-Key as the base64 of any user\u2019s email address and the API lets you in.'
    ],
    lesson: 'Credentials must be unguessable, full stop. Any deterministic derivation from public data is a published password with extra steps.',
    impact: 'Anyone who knows a single email address — public information for researchers — holds a working API key to the submission catalogue.',
    report: { title: 'Predictable API Credentials (Base64 of Email) Accepted', severity: 'High', remediation: 'Issue high-entropy API keys, store them hashed, and remove legacy credential fallbacks.' } },
  { id: 'api-exposure', feature: F_API, name: 'Sensitive Data Exposure — /api/debug Dumps All Users and Passwords', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    location: 'GET /api/debug',
    exploit: 'A leftover debug endpoint returns every account record, including plaintext passwords, with no authentication at all. Fetch /api/debug.',
    hints: [
      'A leftover debug endpoint ships with the portal.',
      'It requires no login at all.',
      'Fetch /api/debug and receive every account, including plaintext passwords.'
    ],
    lesson: 'Debug and diagnostic endpoints are production liabilities. If it can dump your user table, it must not exist outside development — and passwords must never be stored or returned in plaintext.',
    impact: 'One unauthenticated request hands an attacker every account and password on the portal — total compromise in a single call.',
    report: { title: 'Debug Endpoint Exposes All User Accounts and Plaintext Passwords', severity: 'Critical', remediation: 'Remove debug endpoints from production and hash passwords with a modern password hashing function.' } }
];
const TOTAL_TESTS = TESTS.length;
const TEST_BY_ID = Object.fromEntries(TESTS.map(t => [t.id, t]));
const FEATURES = [...new Set(TESTS.map(t => t.feature))];

/* ========================= progress engine (§4) ========================= */
function freshState() {
  return { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
}
function loadState() {
  try {
    const s = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    return Object.assign(freshState(), s);
  } catch (e) {
    const s = freshState();
    try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(s, null, 2)); } catch (e2) {}
    return s;
  }
}
const state = loadState();
function saveState() { try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2)); } catch (e) {} }
function doneCount() { return TESTS.filter(t => state.tests[t.id]).length; }
function isComplete() { return doneCount() === TOTAL_TESTS; }
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
function attemptsOf(feature) { return state.attempts[feature] || 0; }
function progressData() {
  const features = {};
  for (const f of FEATURES) {
    const list = TESTS.filter(t => t.feature === f);
    features[f] = { total: list.length, done: list.filter(t => state.tests[t.id]).length, attempts: attemptsOf(f) };
  }
  const done = doneCount();
  return { lab: LAB.name, number: LAB.number, total: TOTAL_TESTS, done, pct: Math.floor(done / TOTAL_TESTS * 100), features, complete: isComplete() };
}

/* ============================== seed data ============================== */
let nextUserId = 100;
const users = [
  { id: 1, name: 'Prof. Alan Reyes', email: 'admin@hexaresearchlab.local', password: 'admin123', role: 'admin', institution: 'HexaResearchLab HQ', apiKey: 'hxapi_9f2kd81mzq' },
  { id: 2, name: 'Dr. Elena Morris', email: 'editor@hexaresearchlab.local', password: 'editor123', role: 'editor', institution: 'Journal of Applied Computing', apiKey: 'hxapi_47tbxn02pw' },
  { id: 3, name: 'Alice Rahman', email: 'alice@hexaresearchlab.local', password: 'alice123', role: 'researcher', institution: 'Dhaka Institute of Technology', apiKey: 'hxapi_63qwer88zx' },
  { id: 4, name: 'Bob Carter', email: 'bob@hexaresearchlab.local', password: 'bob123', role: 'researcher', institution: 'Northgate University', apiKey: 'hxapi_15mnbv42kd' },
  { id: 5, name: 'Dr. Carol Nguyen', email: 'carol@hexaresearchlab.local', password: 'carol123', role: 'reviewer', institution: 'Pacific Tech', apiKey: 'hxapi_78asdf09qw' },
  { id: 6, name: 'Dr. Dave Osei', email: 'dave@hexaresearchlab.local', password: 'dave123', role: 'reviewer', institution: 'Cape Coast University', apiKey: 'hxapi_32zxcv65bn' },
  { id: 7, name: 'Demo Researcher', email: 'demo@hexaresearchlab.local', password: 'demo123', role: 'researcher', institution: 'Demo Institution', apiKey: 'hxapi_54ghjk31re' }
];
let nextPaperId = 100;
const papers = [
  { id: 1, title: 'Neural Approaches to Citation Prediction', abstract: 'We study graph neural networks for predicting citation counts of newly submitted manuscripts.', authorId: 3, status: 'under-review', reviewers: [5], manuscript: 'manuscript-1.txt', attachments: [] },
  { id: 2, title: 'Quantum Error Correction Benchmarks on Noisy Hardware', abstract: 'A benchmark suite for surface-code decoders running on current noisy quantum devices.', authorId: 4, status: 'under-review', reviewers: [6], manuscript: 'manuscript-2.txt', attachments: [] },
  { id: 3, title: 'Low-Cost Sensors for River Water Quality Monitoring', abstract: 'Field results from a network of inexpensive sensors deployed across three river basins.', authorId: 3, status: 'submitted', reviewers: [], manuscript: 'manuscript-3.txt', attachments: [] },
  { id: 4, title: 'Adaptive Interfaces for Low-Literacy Mobile Users', abstract: 'A longitudinal study of icon-driven interfaces for first-time smartphone users.', authorId: 4, status: 'accepted', reviewers: [5, 6], manuscript: 'manuscript-4.txt', attachments: [], issue: 'Journal of Applied Computing — Issue 12' }
];
let nextReviewId = 100;
const reviews = [
  { id: 1, paperId: 1, reviewerId: 5, score: 7, comment: 'Solid methodology; please clarify the dataset split in section 3.' },
  { id: 2, paperId: 2, reviewerId: 6, score: 6, comment: 'Promising benchmarks, but the noise model needs more justification.' }
];
const invitations = [
  { id: 1, paperId: 3, inviteeEmail: 'dave@hexaresearchlab.local', invitedBy: 2, status: 'pending' },
  { id: 2, paperId: 1, inviteeEmail: 'dave@hexaresearchlab.local', invitedBy: 2, status: 'pending' }
];
const sessions = new Map();       // sid -> { userId, originMark }
const loginFailures = new Map();  // email -> failed count
const enumProbes = new Map();     // email -> exists(bool)
const issuedResetTokens = new Set();

/* --- key material, region 2 of 3 (sharded, encoded) --- */
const _EB = ["UFJWVg==","LVdMSg=="];
const _CB = ["WTRRWQ==","LVFYOQ=="];
function entryKey() { return _unshard([..._EA, ..._EB, ..._EC]); }

/* =============================== helpers =============================== */
const XSS_PAT = /<script|onerror\s*=|onload\s*=|<svg|<img/i;
const INJ_PAT = /('\s*(or|and)\s)|('--)|('\s*=)/i;
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function userById(id) { return users.find(u => u.id === id); }
function userByEmail(email) { return users.find(u => u.email === String(email || '').toLowerCase()); }
function parseCookies(req) {
  const out = {};
  const h = req.headers.cookie || '';
  for (const part of h.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function getSession(req) {
  const c = parseCookies(req);
  const s = c.hx_session && sessions.get(c.hx_session);
  if (!s) return null;
  return { sid: c.hx_session, userId: s.userId, originMark: s.originMark, user: userById(s.userId), cookies: c };
}
function startSession(res, user) {
  const sid = crypto.randomBytes(18).toString('hex');
  const originMark = crypto.randomBytes(8).toString('hex');
  sessions.set(sid, { userId: user.id, originMark });
  res.setHeader('Set-Cookie', [
    'hx_session=' + sid + '; Path=/; HttpOnly',
    'hx_role=' + user.role + '; Path=/',
    'hx_origin=' + originMark + '; Path=/'
  ]);
  return sid;
}
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 2e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) {
        try { resolve({ json: JSON.parse(data), raw: data }); return; } catch (e) { resolve({ json: null, raw: data, badJson: true }); return; }
      }
      const params = {};
      try { for (const [k, v] of new URLSearchParams(data)) params[k] = v; } catch (e) {}
      resolve({ form: params, raw: data });
    });
    req.on('error', () => resolve({ form: {}, raw: '' }));
  });
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }
function resetTokenFor(user) {
  return 'HXRESET-' + Buffer.from(user.email, 'utf8').toString('base64').replace(/=+$/, '').slice(0, 12);
}

/* ================================ layout ================================ */
function layout(title, session, bodyHtml) {
  const p = progressData();
  const pct = isComplete() ? 100 : p.pct;
  const bar = '<div style="background:#e8e8f2;border-radius:6px;height:12px;overflow:hidden"><div style="background:linear-gradient(90deg,#2563eb,#7c3aed);height:12px;width:' + pct + '%"></div></div>';
  const greet = session && session.user ? '<span style="color:#cdd">Welcome, ' + session.user.name + '</span>' : '';
  const nav = session ? '<nav style="margin-top:8px;font-size:14px"><a style="color:#9cf" href="/">Dashboard</a> · <a style="color:#9cf" href="/papers">Papers</a> · <a style="color:#9cf" href="/search">Search</a> · <a style="color:#9cf" href="/invitations">Invitations</a> · <a style="color:#9cf" href="/profile">Profile</a> · <a style="color:#9cf" href="/editor">Editor Console</a> · <a style="color:#9cf" href="/admin">Admin</a> · <a style="color:#9cf" href="/tests">Tests</a> · <a style="color:#9cf" href="/logout">Log out</a></nav>' : '';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + ' · HexaResearchLab</title></head>' +
    '<body style="margin:0;background:#f4f4f8;font-family:Arial,sans-serif;color:#1b1b26">' +
    '<header style="background:#14141d;color:#fff;padding:14px 22px">' +
    '<div style="display:flex;align-items:center;gap:14px"><img src="/logo.png" style="height:44px" alt="HexaCyberLab logo">' +
    '<div><div style="font-size:19px;font-weight:bold">LAB ' + LAB.number + ' — ' + LAB.name + '</div>' +
    '<div style="font-size:13px;color:#bbd">Progress: ' + p.done + '/' + p.total + ' tests · ' + pct + '%</div>' + bar + '</div>' +
    '<div style="margin-left:auto">' + greet + '</div></div>' + nav + '</header>' +
    '<main style="max-width:980px;margin:24px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:26px">' + bodyHtml + '</main>' +
    chatWidget() +
    '</body></html>';
}
function chatWidget() {
  return '<div id="hxchat" style="position:fixed;right:16px;bottom:16px;width:320px;background:#fff;border:1px solid #ccd;border-radius:10px;box-shadow:0 4px 18px rgba(0,0,0,.2);font-family:Arial,sans-serif;z-index:50">' +
    '<div style="background:#14141d;color:#fff;padding:9px 12px;border-radius:10px 10px 0 0;font-size:14px"><b>Lab Coach</b> — HexaResearchLab</div>' +
    '<div id="hxlog" style="height:190px;overflow-y:auto;padding:10px;font-size:13px"></div>' +
    '<div style="display:flex;border-top:1px solid #eee"><input id="hxin" style="flex:1;border:0;padding:9px;font-size:13px" placeholder="Ask the coach\u2026"><button id="hxsend" style="background:#2563eb;color:#fff;border:0;padding:9px 14px;cursor:pointer">Send</button></div></div>' +
    '<script>(function(){var log=document.getElementById("hxlog"),inp=document.getElementById("hxin");' +
    'function add(who,txt){var d=document.createElement("div");d.style.margin="6px 0";d.innerHTML="<b>"+who+":</b> ";d.appendChild(document.createTextNode(txt));log.appendChild(d);log.scrollTop=log.scrollHeight;}' +
    'function send(){var m=inp.value.trim();if(!m)return;inp.value="";add("You",m);fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:m})}).then(function(r){return r.json()}).then(function(j){add("Coach",j.reply||"\u2026")}).catch(function(){add("Coach","The coach is unreachable right now.")});}' +
    'document.getElementById("hxsend").onclick=send;inp.addEventListener("keydown",function(e){if(e.key==="Enter")send();});})();</script>';
}
function gatePage() {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ' + LAB.number + ' — ' + LAB.name + ' · Locked</title></head>' +
    '<body style="margin:0;background:#14141d;font-family:Arial,sans-serif"><div style="max-width:520px;margin:60px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:28px;text-align:center">' +
    '<img src="/logo.png" style="height:56px"><h2>LAB ' + LAB.number + ' — ' + LAB.name + '</h2>' +
    '<p>This lab is locked. Paste the completion key from Lab ' + LAB.prev + ' to start.</p>' +
    '<form method="POST" action="/unlock"><input name="key" style="padding:9px;width:80%" placeholder="Completion key from Lab ' + LAB.prev + '"><br><br>' +
    '<button style="padding:10px 22px">Unlock LAB ' + LAB.number + '</button></form></div>' + chatWidget() + '</body></html>';
}

/* ============================ route handlers ============================ */
async function handleUnlock(req, res) {
  const body = await readBody(req);
  const key = String((body.form && body.form.key) || (body.json && body.json.key) || '');
  if (key && key === entryKey()) {
    state.unlocked = true;
    saveState();
    return redirect(res, '/');
  }
  return send(res, 403, '<h1>403</h1><p>That key does not unlock this lab.</p>');
}

function loginPage(msg) {
  return layout('Log in', null,
    '<h2>Log in to HexaResearchLab</h2>' +
    (msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/login"><label>Email<br><input name="email" style="padding:8px;width:70%"></label><br><br>' +
    '<label>Password<br><input name="password" type="password" style="padding:8px;width:70%"></label><br><br>' +
    '<button style="padding:9px 20px">Log in</button></form>' +
    '<p><a href="/forgot-password">Forgot your password?</a> · <a href="/register">Create an account</a></p>' +
    '<div style="background:#f0f4ff;border:1px solid #ccd;border-radius:8px;padding:12px;margin-top:16px"><b>Demo account for visitors:</b><br>Email: demo@hexaresearchlab.local<br>Password: demo123</div>' +
    '<h3>Seeded test accounts</h3><ul>' +
    '<li>admin@hexaresearchlab.local / admin123 (admin)</li>' +
    '<li>editor@hexaresearchlab.local / editor123 (editor)</li>' +
    '<li>alice@hexaresearchlab.local / alice123 (researcher / author)</li>' +
    '<li>bob@hexaresearchlab.local / bob123 (researcher / author)</li>' +
    '<li>carol@hexaresearchlab.local / carol123 (reviewer)</li>' +
    '<li>dave@hexaresearchlab.local / dave123 (reviewer)</li></ul>');
}
async function handleLogin(req, res) {
  if (req.method === 'GET') return send(res, 200, loginPage(''));
  const body = await readBody(req);
  const form = body.form || body.json || {};
  attempt(F_AUTH);
  const email = String(form.email || '');
  const password = String(form.password || '');
  // Simulated string-built query: SELECT * FROM users WHERE email='<email>' AND password='<password>'
  const query = "SELECT * FROM users WHERE email='" + email + "' AND password='" + password + "'";
  if (INJ_PAT.test(email) || INJ_PAT.test(password)) {
    // The injected condition makes the query true for the first row: the admin.
    const victim = users[0];
    void query;
    pass('auth-sqli');
    startSession(res, victim);
    return redirect(res, '/');
  }
  const user = userByEmail(email);
  if (!user || user.password !== password) {
    const n = (loginFailures.get(email.toLowerCase()) || 0) + 1;
    loginFailures.set(email.toLowerCase(), n);
    if (n >= 10) pass('auth-brute'); // the 10th failure is still processed normally: no throttle exists
    return send(res, 200, loginPage('Invalid email or password.'));
  }
  loginFailures.delete(email.toLowerCase());
  if (user.email === 'demo@hexaresearchlab.local') pass('auth-default');
  startSession(res, user);
  return redirect(res, '/');
}
function registerPage(msg) {
  return layout('Register', null,
    '<h2>Create your researcher account</h2>' +
    (msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/register"><label>Display name<br><input name="name" style="padding:8px;width:70%"></label><br><br>' +
    '<label>Email<br><input name="email" style="padding:8px;width:70%"></label><br><br>' +
    '<label>Institution<br><input name="institution" style="padding:8px;width:70%"></label><br><br>' +
    '<label>Password<br><input name="password" type="password" style="padding:8px;width:70%"></label><br><br>' +
    '<button style="padding:9px 20px">Register</button></form><p><a href="/login">Already registered? Log in</a></p>');
}
async function handleRegister(req, res) {
  if (req.method === 'GET') return send(res, 200, registerPage(''));
  const body = await readBody(req);
  const form = body.form || body.json || {};
  attempt(F_REG);
  const email = String(form.email || '').toLowerCase();
  if (!email || !form.password) return send(res, 200, registerPage('Email and password are required.'));
  if (userByEmail(email)) return send(res, 200, registerPage('That email is already registered.'));
  // Mass assignment flaw: every submitted field is copied onto the account.
  const user = {
    id: nextUserId++, name: String(form.name || 'New Researcher'), email,
    password: String(form.password), role: 'researcher',
    institution: String(form.institution || ''), apiKey: 'hxapi_' + crypto.randomBytes(5).toString('hex')
  };
  for (const k of Object.keys(form)) {
    if (['id', 'email', 'password', 'apiKey'].includes(k)) continue;
    user[k] = form[k];
  }
  users.push(user);
  if (user.role === 'editor' || user.role === 'admin') pass('reg-mass');
  if (String(form.password).length < 4) pass('reg-weakpw');
  if (XSS_PAT.test(user.name)) pass('reg-xss');
  return redirect(res, '/login');
}
function forgotPage(msg) {
  return layout('Forgot password', null,
    '<h2>Forgot your password?</h2>' + (msg ? '<p>' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/forgot-password"><label>Email<br><input name="email" style="padding:8px;width:70%"></label><br><br>' +
    '<button style="padding:9px 20px">Send reset link</button></form><p><a href="/login">Back to log in</a></p>');
}
async function handleForgot(req, res) {
  if (req.method === 'GET') return send(res, 200, forgotPage(''));
  const body = await readBody(req);
  const form = body.form || body.json || {};
  attempt(F_AUTH);
  const email = String(form.email || '').toLowerCase();
  const user = userByEmail(email);
  enumProbes.set(email, !!user);
  if (enumProbes.size >= 5 && [...enumProbes.values()].some(Boolean) && [...enumProbes.values()].some(v => !v)) pass('auth-enum');
  if (user) {
    issuedResetTokens.add(resetTokenFor(user)); // the "emailed" link carries this token
    return send(res, 200, forgotPage('A password reset link has been sent to ' + email + '.'));
  }
  return send(res, 200, forgotPage('No account found for ' + email + '.'));
}
function resetPage(msg) {
  return layout('Reset password', null,
    '<h2>Reset your password</h2>' + (msg ? '<p>' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/reset-password"><label>Email<br><input name="email" style="padding:8px;width:70%"></label><br><br>' +
    '<label>Reset token (from the email link)<br><input name="token" style="padding:8px;width:70%"></label><br><br>' +
    '<label>New password<br><input name="newpassword" type="password" style="padding:8px;width:70%"></label><br><br>' +
    '<button style="padding:9px 20px">Set new password</button></form>');
}
async function handleReset(req, res) {
  if (req.method === 'GET') return send(res, 200, resetPage(''));
  const body = await readBody(req);
  const form = body.form || body.json || {};
  attempt(F_AUTH);
  const user = userByEmail(String(form.email || ''));
  if (!user) return send(res, 200, resetPage('No account found for that email.'));
  const token = String(form.token || '');
  if (token !== resetTokenFor(user)) return send(res, 200, resetPage('That reset token is not valid.'));
  user.password = String(form.newpassword || user.password);
  if (!issuedResetTokens.has(token)) pass('auth-reset'); // valid token that was never issued: it was computed
  issuedResetTokens.delete(token);
  return send(res, 200, resetPage('Your password has been updated. You can now log in.'));
}
function handleLogout(req, res, session) {
  if (session) sessions.delete(session.sid);
  res.setHeader('Set-Cookie', ['hx_session=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0', 'hx_origin=; Path=/; Max-Age=0']);
  return redirect(res, '/login');
}
function profilePage(session, msg) {
  const u = session.user;
  return layout('Profile', session,
    '<h2>Your profile</h2>' + (msg ? '<p style="color:#070">' + esc(msg) + '</p>' : '') +
    '<p><b>Email:</b> ' + esc(u.email) + '<br><b>Role:</b> ' + esc(u.role) + '<br><b>Your API key:</b> ' + esc(u.apiKey) + '</p>' +
    '<form method="POST" action="/profile/update">' +
    '<input type="hidden" name="hx_origin" value="' + esc(session.originMark) + '">' +
    '<label>Display name<br><input name="name" value="' + esc(u.name) + '" style="padding:8px;width:70%"></label><br><br>' +
    '<label>Institution<br><input name="institution" value="' + esc(u.institution || '') + '" style="padding:8px;width:70%"></label><br><br>' +
    '<button style="padding:9px 20px">Save profile</button></form>');
}
async function handleProfileUpdate(req, res, session) {
  const body = await readBody(req);
  const form = body.form || body.json || {};
  attempt(F_REG);
  const u = session.user;
  const markerOk = form.hx_origin && form.hx_origin === session.originMark;
  if (form.name) {
    u.name = String(form.name);
    if (XSS_PAT.test(u.name)) pass('reg-xss');
    if (!markerOk) pass('reg-csrf'); // the change was applied even though the same-site marker was absent/wrong
  }
  if (form.institution) u.institution = String(form.institution);
  return send(res, 200, profilePage(session, 'Profile saved.'));
}
function handleEditor(req, res, session) {
  const cookieRole = session.cookies.hx_role || '';
  const realRole = session.user.role;
  if (cookieRole === 'editor' || cookieRole === 'admin') {
    if (realRole !== 'editor' && realRole !== 'admin') pass('auth-cookie');
    const pending = papers.filter(p => p.status === 'submitted' || p.status === 'under-review');
    let rows = pending.map(p => '<li><a href="/papers/' + p.id + '">' + esc(p.title) + '</a> — status: ' + esc(p.status) + '</li>').join('');
    return send(res, 200, layout('Editor Console', session,
      '<h2>Editor Console</h2><p>Papers awaiting editorial attention:</p><ul>' + (rows || '<li>None.</li>') + '</ul>' +
      '<p>Conference track: Journal of Applied Computing — Issue 12 is in preparation. Decisions are made from each paper page.</p>'));
  }
  return send(res, 403, layout('Editor Console', session, '<h2>403</h2><p>The editor console requires the editor role.</p>'));
}

function dashboardPage(session) {
  const u = session.user;
  const mine = papers.filter(p => p.authorId === u.id);
  const assigned = papers.filter(p => p.reviewers.includes(u.id));
  const li = list => list.map(p => '<li><a href="/papers/' + p.id + '">' + esc(p.title) + '</a> — ' + esc(p.status) + '</li>').join('') || '<li>None yet.</li>';
  return layout('Dashboard', session,
    '<h2>Researcher Dashboard</h2><p>Signed in as ' + esc(u.email) + ' (' + esc(u.role) + '), ' + esc(u.institution || '') + '.</p>' +
    '<h3>Your submissions</h3><ul>' + li(mine) + '</ul>' +
    '<h3>Papers assigned to you for review</h3><ul>' + li(assigned) + '</ul>' +
    '<p><a href="/papers/new">Submit a new paper</a> · <a href="/papers">Browse all papers</a></p>' +
    '<p style="color:#555">Now publishing: Journal of Applied Computing — Issue 12 (papers marked accepted).</p>');
}
function paperListPage(session) {
  const rows = papers.map(p => {
    const a = userById(p.authorId);
    return '<li><a href="/papers/' + p.id + '">' + esc(p.title) + '</a> — by ' + esc(a ? a.name : '?') + ' · ' + esc(p.status) + (p.issue ? ' · ' + esc(p.issue) : '') + '</li>';
  }).join('');
  return layout('Papers', session, '<h2>All papers in the portal</h2><ul>' + rows + '</ul><p><a href="/papers/new">Submit a new paper</a></p>');
}
function paperRelation(paper, user) {
  return user.id === paper.authorId || paper.reviewers.includes(user.id) || user.role === 'editor' || user.role === 'admin';
}
function paperPage(session, paper) {
  const author = userById(paper.authorId);
  const revs = reviews.filter(r => r.paperId === paper.id);
  const revHtml = revs.map((r, i) => '<li>Anonymous Reviewer ' + (i + 1) + ' — score ' + r.score + '/10 — ' + esc(r.comment) + '</li>').join('') || '<li>No reviews yet.</li>';
  const atts = (paper.attachments || []).map(a => '<li><a href="/files/' + esc(a) + '">' + esc(a) + '</a></li>').join('');
  return layout('Paper', session,
    '<h2>' + esc(paper.title) + '</h2>' +
    '<p><b>Author:</b> ' + esc(author ? author.name : '?') + ' · <b>Status:</b> ' + esc(paper.status) + (paper.issue ? ' · <b>Issue:</b> ' + esc(paper.issue) : '') + '</p>' +
    '<p>' + esc(paper.abstract) + '</p>' +
    '<p><a href="/papers/' + paper.id + '/manuscript">Download manuscript (full text)</a> · <a href="/download?file=supp-1.txt">Download supplementary file</a></p>' +
    '<h3>Reviews (double-blind: reviewers are anonymous)</h3><ul>' + revHtml + '</ul>' +
    '<h3>Submit a review</h3><form method="POST" action="/papers/' + paper.id + '/reviews">' +
    '<label>Score (1-10)<br><input name="score" style="padding:8px;width:30%"></label><br><br>' +
    '<label>Comment<br><input name="comment" style="padding:8px;width:80%"></label><br><br><button style="padding:9px 20px">Submit review</button></form>' +
    '<h3>Assign a reviewer (editors)</h3><form method="POST" action="/papers/' + paper.id + '/assign">' +
    '<label>Reviewer email<br><input name="email" style="padding:8px;width:60%"></label><br><br><button style="padding:9px 20px">Assign reviewer</button></form>' +
    '<h3>Editorial decision (editors)</h3><form method="POST" action="/papers/' + paper.id + '/decide">' +
    '<select name="decision"><option value="accepted">accepted</option><option value="rejected">rejected</option></select> ' +
    '<button style="padding:9px 20px">Record decision</button></form>' +
    '<h3>Attachments</h3><ul>' + (atts || '<li>None.</li>') + '</ul>' +
    '<form method="POST" action="/papers/' + paper.id + '/upload">' +
    '<label>File name<br><input name="filename" style="padding:8px;width:50%"></label><br><br>' +
    '<label>File content<br><textarea name="content" rows="3" style="width:80%"></textarea></label><br><br>' +
    '<button style="padding:9px 20px">Upload attachment</button></form>');
}
function handlePaperView(req, res, session, id) {
  const paper = papers.find(p => p.id === id);
  if (!paper) return send(res, 404, layout('Not found', session, '<h2>404</h2><p>No such paper.</p>'));
  attempt(F_SUB);
  if (!paperRelation(paper, session.user)) pass('sub-idor');
  return send(res, 200, paperPage(session, paper));
}
function handleManuscript(req, res, session, id) {
  const paper = papers.find(p => p.id === id);
  if (!paper) return send(res, 404, 'No such paper.');
  attempt(F_SUB);
  if (!paperRelation(paper, session.user)) pass('sub-download');
  let content = '';
  try { content = fs.readFileSync(path.join(FILES_DIR, paper.manuscript), 'utf8'); }
  catch (e) { content = '(manuscript file missing)'; }
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': 'attachment; filename="' + paper.manuscript + '"' });
  return res.end(content);
}
function newPaperPage(session) {
  return layout('Submit paper', session,
    '<h2>Submit a new paper</h2><form method="POST" action="/papers">' +
    '<label>Title<br><input name="title" style="padding:8px;width:80%"></label><br><br>' +
    '<label>Abstract<br><textarea name="abstract" rows="4" style="width:80%"></textarea></label><br><br>' +
    '<button style="padding:9px 20px">Submit paper</button></form>');
}
async function handlePaperCreate(req, res, session) {
  const body = await readBody(req);
  const form = body.form || body.json || {};
  const paper = { id: nextPaperId++, title: String(form.title || 'Untitled'), abstract: String(form.abstract || ''), authorId: session.user.id, status: 'submitted', reviewers: [], manuscript: 'manuscript-1.txt', attachments: [] };
  papers.push(paper);
  return redirect(res, '/papers/' + paper.id);
}
async function handleUpload(req, res, session, id) {
  const paper = papers.find(p => p.id === id);
  if (!paper) return send(res, 404, 'No such paper.');
  const body = await readBody(req);
  const form = body.form || body.json || {};
  attempt(F_SUB);
  const filename = path.basename(String(form.filename || 'attachment.txt'));
  try { fs.writeFileSync(path.join(FILES_DIR, filename), String(form.content || '')); } catch (e) {}
  paper.attachments = paper.attachments || [];
  if (!paper.attachments.includes(filename)) paper.attachments.push(filename);
  if (/\.(html?|svg)$/i.test(filename)) pass('sub-upload');
  return redirect(res, '/papers/' + paper.id);
}
function handleFileServe(req, res, session, name) {
  const file = path.join(FILES_DIR, path.basename(name));
  if (!fs.existsSync(file)) return send(res, 404, 'File not found.');
  const ext = path.extname(file).toLowerCase();
  const type = ext === '.html' || ext === '.htm' ? 'text/html; charset=utf-8' : ext === '.svg' ? 'image/svg+xml' : 'text/plain; charset=utf-8';
  res.writeHead(200, { 'Content-Type': type });
  return res.end(fs.readFileSync(file));
}
function handleDownload(req, res, session, url) {
  attempt(F_SUB);
  const name = url.searchParams.get('file') || '';
  const target = path.join(FILES_DIR, name);
  if (!name || !fs.existsSync(target) || !fs.statSync(target).isFile()) return send(res, 404, 'File not found.');
  if (!target.startsWith(FILES_DIR)) pass('sub-traversal');
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': 'attachment' });
  return res.end(fs.readFileSync(target));
}
async function handleReviewSubmit(req, res, session, id) {
  const paper = papers.find(p => p.id === id);
  if (!paper) return send(res, 404, 'No such paper.');
  const body = await readBody(req);
  const form = body.form || body.json || {};
  attempt(F_REV);
  const assigned = paper.reviewers.includes(session.user.id) || session.user.role === 'editor' || session.user.role === 'admin';
  if (!assigned) pass('rev-unassigned');
  reviews.push({ id: nextReviewId++, paperId: paper.id, reviewerId: session.user.id, score: Number(form.score || 0), comment: String(form.comment || '') });
  if (paper.status === 'submitted') paper.status = 'under-review';
  return redirect(res, '/papers/' + paper.id);
}
async function handleScoreUpdate(req, res, session, id) {
  const review = reviews.find(r => r.id === id);
  if (!review) return send(res, 404, 'No such review.');
  const body = await readBody(req);
  const form = body.form || body.json || {};
  attempt(F_REV);
  if (review.reviewerId !== session.user.id) pass('rev-score');
  review.score = Number(form.score || review.score);
  return redirect(res, '/papers/' + review.paperId);
}
function handleApiPaperReviews(req, res, session, id) {
  const paper = papers.find(p => p.id === id);
  if (!paper) return send(res, 404, JSON.stringify({ error: 'no such paper' }), 'application/json');
  attempt(F_REV);
  if (session.user.id === paper.authorId) pass('rev-identity');
  const out = reviews.filter(r => r.paperId === paper.id).map(r => {
    const rv = userById(r.reviewerId);
    return { id: r.id, paperId: r.paperId, score: r.score, comment: r.comment, reviewerName: rv ? rv.name : null, reviewerEmail: rv ? rv.email : null };
  });
  return send(res, 200, JSON.stringify({ paper: paper.id, reviews: out }), 'application/json');
}
async function handleAssign(req, res, session, id) {
  const paper = papers.find(p => p.id === id);
  if (!paper) return send(res, 404, 'No such paper.');
  const body = await readBody(req);
  const form = body.form || body.json || {};
  attempt(F_REV);
  const target = userByEmail(String(form.email || ''));
  if (target) {
    if (!paper.reviewers.includes(target.id)) paper.reviewers.push(target.id);
    if (session.user.id === paper.authorId && target.id === session.user.id) pass('rev-selfassign');
  }
  return redirect(res, '/papers/' + paper.id);
}
async function handleDecide(req, res, session, id) {
  const paper = papers.find(p => p.id === id);
  if (!paper) return send(res, 404, 'No such paper.');
  const body = await readBody(req);
  const form = body.form || body.json || {};
  attempt(F_REV);
  const decision = String(form.decision || '');
  if (decision === 'accepted' || decision === 'rejected') {
    paper.status = decision;
    if (session.user.role !== 'editor' && session.user.role !== 'admin') pass('rev-decision');
  }
  return redirect(res, '/papers/' + paper.id);
}
function invitationsPage(session) {
  const mine = invitations.filter(i => i.inviteeEmail === session.user.email);
  const rows = mine.map(i => {
    const p = papers.find(x => x.id === i.paperId);
    return '<li>Invitation #' + i.id + ' — review "' + esc(p ? p.title : '?') + '" — status: ' + esc(i.status) +
      (i.status === 'pending' ? ' <form method="POST" action="/invitations/' + i.id + '/accept" style="display:inline"><button>Accept</button></form>' : '') + '</li>';
  }).join('');
  const all = invitations.map(i => '<li>Invitation #' + i.id + ' → ' + esc(i.inviteeEmail) + ' (paper ' + i.paperId + ') — ' + esc(i.status) + '</li>').join('');
  return layout('Invitations', session,
    '<h2>Your review invitations</h2><ul>' + (rows || '<li>None addressed to you.</li>') + '</ul>' +
    '<h3>All invitations in the portal</h3><ul>' + all + '</ul>');
}
async function handleInviteAccept(req, res, session, id) {
  const inv = invitations.find(i => i.id === id);
  if (!inv) return send(res, 404, 'No such invitation.');
  attempt(F_REV);
  if (inv.inviteeEmail !== session.user.email) pass('rev-invite');
  inv.status = 'accepted';
  const paper = papers.find(p => p.id === inv.paperId);
  if (paper && !paper.reviewers.includes(session.user.id)) paper.reviewers.push(session.user.id);
  return redirect(res, '/invitations');
}
function handleSearch(req, res, session, url) {
  attempt(F_SEARCH);
  const q = url.searchParams.get('q') || '';
  let results;
  if (q && INJ_PAT.test(q)) {
    results = papers.slice(); // the injected condition is true for every row
    if (results.some(p => !(p.title + ' ' + p.abstract).toLowerCase().includes(q.toLowerCase()))) pass('search-sqli');
  } else if (q) {
    const needle = q.toLowerCase();
    results = papers.filter(p => (p.title + ' ' + p.abstract).toLowerCase().includes(needle));
  } else {
    results = [];
  }
  if (q && XSS_PAT.test(q)) pass('search-xss');
  const rows = results.map(p => '<li><a href="/papers/' + p.id + '">' + esc(p.title) + '</a> — ' + esc(p.status) + '</li>').join('');
  // Deliberate flaw: the search term is reflected without encoding.
  return send(res, 200, layout('Search', session,
    '<h2>Search papers</h2><form method="GET" action="/search"><input name="q" value="' + esc(q) + '" style="padding:8px;width:60%"> <button style="padding:9px 18px">Search</button></form>' +
    (q ? '<p>Results for "' + q + '":</p><ul>' + (rows || '<li>No matches.</li>') + '</ul>' : '')));
}
function adminPage(session) {
  const rows = users.map(u => '<li>' + esc(u.name) + ' (' + esc(u.email) + ') — role: ' + esc(u.role) +
    ' <form method="POST" action="/admin/users/' + u.id + '/role" style="display:inline"><input type="hidden" name="hx_origin" value="' + esc(session.originMark) + '">' +
    '<select name="role"><option>researcher</option><option>reviewer</option><option>editor</option><option>admin</option></select> <button>Set role</button></form></li>').join('');
  return layout('Admin', session, '<h2>Admin Console — user administration</h2><ul>' + rows + '</ul>');
}
function handleAdmin(req, res, session) {
  attempt(F_ADMIN);
  if (session.user.role !== 'admin') pass('admin-bac'); // the page is served anyway: only login was checked
  return send(res, 200, adminPage(session));
}
async function handleAdminRole(req, res, session, id) {
  const target = userById(id);
  if (!target) return send(res, 404, 'No such user.');
  const body = await readBody(req);
  const form = body.form || body.json || {};
  attempt(F_ADMIN);
  const markerOk = form.hx_origin && form.hx_origin === session.originMark;
  const before = target.role;
  if (form.role) target.role = String(form.role);
  if (target.role !== before && !markerOk) pass('admin-csrf');
  return redirect(res, '/admin');
}
function handleApiPapers(req, res) {
  attempt(F_API);
  const key = req.headers['x-api-key'] || '';
  const legacy = users.some(u => Buffer.from(u.email, 'utf8').toString('base64') === key);
  const issued = users.some(u => u.apiKey === key);
  if (legacy) pass('api-token');
  if (!legacy && !issued) return send(res, 401, JSON.stringify({ error: 'invalid API key' }), 'application/json');
  return send(res, 200, JSON.stringify({ papers: papers.map(p => ({ id: p.id, title: p.title, status: p.status, authorId: p.authorId })) }), 'application/json');
}
function handleApiDebug(req, res) {
  attempt(F_API);
  pass('api-exposure');
  return send(res, 200, JSON.stringify({ debug: true, users: users.map(u => ({ id: u.id, name: u.name, email: u.email, password: u.password, role: u.role, apiKey: u.apiKey })) }), 'application/json');
}

/* --- key material, region 3 of 3 (sharded, encoded) --- */
const _EC = ["QVgxMA==","TkVRTA=="];
const _CC = ["SVczMw==","SUg5MA=="];
function completionKey() { return _unshard([..._CA, ..._CB, ..._CC]); }

function testsPage(session) {
  const p = progressData();
  let html = '<h2>Mission Board — LAB ' + LAB.number + ' ' + LAB.name + '</h2>' +
    '<p>' + p.done + ' of ' + p.total + ' tests complete (' + p.pct + '%). Tests complete by <b>doing</b> the exploit — there is no "mark done" button. ' +
    'Stuck? Try a test at least 3 times, then ask the Lab Coach (bottom right) for step-by-step help on that feature.</p>';
  for (const f of FEATURES) {
    const list = TESTS.filter(t => t.feature === f);
    html += '<h3>' + esc(f) + ' — ' + list.filter(t => state.tests[t.id]).length + '/' + list.length + ' done · ' + attemptsOf(f) + ' attempt(s) on this feature</h3>';
    for (const t of list) {
      const done = !!state.tests[t.id];
      html += '<div style="border:1px solid #dde;border-radius:8px;padding:12px;margin:10px 0">' +
        '<b>' + (done ? '✓' : '○') + ' ' + esc(t.name) + '</b> <span style="color:#555">(' + esc(t.owasp) + ' · ' + esc(t.difficulty) + ' · ' + (done ? 'done' : 'open') + ')</span>' +
        '<div style="margin-top:6px">' + t.hints.map((h, i) => '<details style="margin:3px 0"><summary>Hint ' + (i + 1) + '</summary><p>' + esc(h) + '</p></details>').join('') + '</div></div>';
    }
  }
  return layout('Tests', session, html);
}
function buildCompletePage(session) {
  const key = completionKey();
  let html = '<h2>Lab Complete — 100%</h2>';
  html += '<h3>Section 1 — Total features</h3><p>This lab has <b>' + FEATURES.length + ' features</b> and <b>' + TOTAL_TESTS + ' scored tests</b>.</p>';
  html += '<h3>Section 2 — Vulnerabilities per feature</h3><ul>' +
    FEATURES.map(f => '<li>' + esc(f) + ': ' + TESTS.filter(t => t.feature === f).length + ' vulnerabilities</li>').join('') + '</ul>';
  html += '<h3>Section 3 — Ways testing was done</h3><p>' + TOTAL_TESTS + ' techniques were executed against the live application:</p><ul>' +
    TESTS.map(t => '<li>' + esc(t.name) + '</li>').join('') + '</ul>';
  html += '<h3>Section 4 — What you learned</h3><ul>' + TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.lesson) + '</li>').join('') + '</ul>';
  html += '<h3>Section 5 — What this means for a real client</h3><ul>' + TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.impact) + '</li>').join('') + '</ul>';
  html += '<h3>Section 6 — Writing it in a real report</h3><ul>' +
    TESTS.map(t => '<li><b>' + esc(t.report.title) + '</b> — Severity: ' + esc(t.report.severity) + ' — Remediation: ' + esc(t.report.remediation) + '</li>').join('') + '</ul>';
  html += '<div style="background:#f0f4ff;border:2px solid #2563eb;border-radius:10px;padding:16px;margin-top:20px"><h3 style="margin-top:0">Completion Key — unlocks Lab ' + (LAB.number + 1) + '</h3>' +
    '<p style="font-size:20px;font-family:monospace"><b>' + esc(key) + '</b></p>' +
    '<p>Paste this key into the next lab to unlock it. The Lab Coach can also give it to you now that you are at 100%.</p></div>';
  html += '<h3>Your certificate</h3><form method="POST" action="/tester-name"><label>Your name for the certificate<br>' +
    '<input name="name" value="' + esc(state.testerName || (session ? session.user.name : '')) + '" style="padding:8px;width:60%"></label> ' +
    '<button style="padding:9px 18px">Save name</button></form>' +
    '<p><a href="/certificate">View your certificate</a></p>';
  return layout('Complete', session, html);
}
function certificatePage(session) {
  const name = state.testerName || (session ? session.user.name : 'HexaCyberLab Tester');
  const date = state.completedAt ? new Date(state.completedAt).toISOString().slice(0, 10) : '';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ' + LAB.number + '</title>' +
    '<style>@media print { #hxchat { display:none } }</style></head>' +
    '<body style="margin:0;background:#e9e9f2;font-family:Georgia,serif">' +
    '<div style="max-width:720px;margin:50px auto;background:#fff;border:3px double #2563eb;border-radius:10px;padding:44px;text-align:center">' +
    '<img src="/logo.png" style="height:70px">' +
    '<h1 style="margin:14px 0 4px">Certificate of Completion</h1>' +
    '<p style="color:#555">HexaCyberLab — Vulnerable Lab Programme</p>' +
    '<p style="font-size:18px">This certifies that</p>' +
    '<p style="font-size:28px;font-weight:bold;margin:6px 0">' + esc(name) + '</p>' +
    '<p style="font-size:17px">has completed 100% of the security tests in<br><b>LAB ' + LAB.number + ' — ' + LAB.name + '</b><br>(' + TOTAL_TESTS + ' tests across ' + FEATURES.length + ' features)</p>' +
    '<p style="color:#555">Completed on ' + esc(date) + '</p>' +
    '<p style="margin-top:26px;font-size:14px;color:#333">HexaCyberLab — Built by Md. Jony Hassain, Founder</p></div>' +
    '<p style="text-align:center"><a href="/complete">Back to the completion summary</a></p></body></html>';
}

/* ============================== chatbot (§6) ============================== */
const FEATURE_KEYS = [
  [F_AUTH, ['login', 'log in', 'authentication', 'brute', 'forgot', 'sign in']],
  [F_REG, ['register', 'registration', 'sign up', 'profile', 'password policy']],
  [F_SUB, ['paper', 'submission', 'submit', 'manuscript', 'upload', 'download', 'attachment', 'traversal']],
  [F_REV, ['review', 'reviewer', 'peer', 'invitation', 'invite', 'score', 'assign', 'decision', 'blind']],
  [F_SEARCH, ['search', 'find', 'catalog']],
  [F_ADMIN, ['admin', 'console', 'role']],
  [F_API, ['api', 'debug', 'platform', 'endpoint']]
];
function matchFeature(text) {
  for (const [f, keys] of FEATURE_KEYS) if (keys.some(k => text.includes(k))) return f;
  for (const f of FEATURES) if (text.includes(f.toLowerCase())) return f;
  return null;
}
function coachReply(raw) {
  const text = String(raw || '').toLowerCase();
  const p = progressData();
  const attribution = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  if (/who (built|made|created)|founder|who is behind/.test(text)) return attribution;
  if (/key/.test(text) && /(completion|next|lab|unlock|give|what|share)/.test(text)) {
    if (isComplete() && state.keyRevealed) {
      return 'You earned it — the completion key for this lab is: ' + completionKey() + ' — paste it into Lab ' + (LAB.number + 1) + ' to unlock it.';
    }
    return "I don't have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at " + p.done + '/' + p.total + ' tests (' + p.pct + '%). Finish every test and I will share it with you.';
  }
  const feature = matchFeature(text);
  const howTo = /(how|guide|help|solve|steps?|hint|exploit|walkthrough|do i)/.test(text);
  if (/progress|how am i|my status|score so far/.test(text)) {
    return 'Your progress: ' + p.done + ' of ' + p.total + ' tests complete (' + p.pct + '%). ' +
      FEATURES.map(f => f + ': ' + p.features[f].done + '/' + p.features[f].total).join(' · ') + '.';
  }
  if (/next|what should i do|where do i start/.test(text)) {
    const nxt = TESTS.find(t => !state.tests[t.id]);
    if (!nxt) return 'You have completed every test — visit /complete for your summary and certificate.';
    return 'Next open test: "' + nxt.name + '" in ' + nxt.feature + ' (' + nxt.difficulty + '). Attempts on that feature so far: ' + attemptsOf(nxt.feature) + '. Try it yourself first — after 3 attempts on a feature I can guide you step by step.';
  }
  if (feature && /how many|count|list|what tests|which tests|vulnerabilit/.test(text) && !howTo) {
    const list = TESTS.filter(t => t.feature === feature);
    return feature + ' has ' + list.length + ' tests: ' + list.map(t => '"' + t.name + '" (' + (state.tests[t.id] ? 'done' : 'open') + ')').join(', ') + '.';
  }
  if (/how many|how much|total/.test(text)) {
    return 'This lab has ' + TOTAL_TESTS + ' tests across ' + FEATURES.length + ' features: ' +
      FEATURES.map(f => f + ' (' + TESTS.filter(t => t.feature === f).length + ')').join(', ') + '. You have completed ' + p.done + '.';
  }
  if (feature && howTo) {
    const list = TESTS.filter(t => t.feature === feature);
    const n = attemptsOf(feature);
    if (n >= 3 || list.every(t => state.tests[t.id])) {
      const steps = list.map((t, i) => (i + 1) + '. ' + t.name + (state.tests[t.id] ? ' (done)' : '') + ' — ' + t.hints[2]).join('\n');
      return 'Step by step for ' + feature + ':\n' + steps;
    }
    return 'That feature is locked for help. First try the ' + feature + " tests yourself at least 3 times — I can see you've tried " + n + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  if (feature) {
    const list = TESTS.filter(t => t.feature === feature);
    return feature + ' has ' + list.length + ' tests: ' + list.map(t => '"' + t.name + '"').join(', ') + '. Ask me "how do I solve the ' + feature + ' tests" once you have tried that feature at least 3 times.';
  }
  return 'Hello! I am the Lab Coach for LAB ' + LAB.number + ' — ' + LAB.name + '. This lab has ' + TOTAL_TESTS + ' tests across ' + FEATURES.length + ' features (' + FEATURES.join(', ') + '), and you have completed ' + p.done + '. ' +
    'Ask me how many tests a feature has, what to do next, or — after at least 3 real attempts on a feature — how to solve its tests step by step. The /tests page lists every test with graded hints.';
}
async function handleChat(req, res) {
  const body = await readBody(req);
  let msg = '';
  if (body.json && typeof body.json.message === 'string') msg = body.json.message;
  else if (body.form && body.form.message) msg = body.form.message;
  else if (body.badJson) return send(res, 200, JSON.stringify({ reply: 'I could not read that message — please send plain JSON like {"message":"hi"}. Ask me about any feature by name, or check /tests.' }), 'application/json');
  return send(res, 200, JSON.stringify({ reply: coachReply(msg) }), 'application/json');
}

/* ================================ router ================================ */
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:' + LAB.port);
    const pathname = url.pathname;
    const method = req.method;

    if (pathname === '/logo.png') {
      try {
        const data = fs.readFileSync(path.join(DIR, 'logo.png'));
        res.writeHead(200, { 'Content-Type': 'image/png' });
        return res.end(data);
      } catch (e) { return send(res, 404, 'logo missing'); }
    }
    if (pathname === '/unlock' && method === 'POST') return handleUnlock(req, res);
    if (pathname === '/api/chat' && method === 'POST') return handleChat(req, res);
    if (pathname === '/api/progress' && method === 'GET') {
      return send(res, 200, JSON.stringify(progressData(), null, 2), 'application/json');
    }

    // Lock gate: until unlocked, only the gate (plus the routes above) exists.
    if (!state.unlocked) return send(res, 200, gatePage());

    // API routes manage their own auth.
    if (pathname === '/api/papers' && method === 'GET') return handleApiPapers(req, res);
    if (pathname === '/api/debug' && method === 'GET') return handleApiDebug(req, res);
    const apiRev = pathname.match(/^\/api\/papers\/(\d+)\/reviews$/);
    if (apiRev && method === 'GET') {
      const s = getSession(req);
      if (!s) return send(res, 401, JSON.stringify({ error: 'login required' }), 'application/json');
      return handleApiPaperReviews(req, res, s, Number(apiRev[1]));
    }

    // Public pages.
    if (pathname === '/login') return handleLogin(req, res);
    if (pathname === '/register') return handleRegister(req, res);
    if (pathname === '/forgot-password') return handleForgot(req, res);
    if (pathname === '/reset-password') return handleReset(req, res);

    // Everything below requires a session.
    const session = getSession(req);
    if (!session) return redirect(res, '/login');

    if (pathname === '/logout') return handleLogout(req, res, session);
    if (pathname === '/') return send(res, 200, dashboardPage(session));
    if (pathname === '/profile' && method === 'GET') return send(res, 200, profilePage(session, ''));
    if (pathname === '/profile/update' && method === 'POST') return handleProfileUpdate(req, res, session);
    if (pathname === '/editor' && method === 'GET') return handleEditor(req, res, session);
    if (pathname === '/papers' && method === 'GET') return send(res, 200, paperListPage(session));
    if (pathname === '/papers/new' && method === 'GET') return send(res, 200, newPaperPage(session));
    if (pathname === '/papers' && method === 'POST') return handlePaperCreate(req, res, session);
    if (pathname === '/invitations' && method === 'GET') return send(res, 200, invitationsPage(session));
    if (pathname === '/search' && method === 'GET') return handleSearch(req, res, session, url);
    if (pathname === '/download' && method === 'GET') return handleDownload(req, res, session, url);
    if (pathname === '/admin' && method === 'GET') return handleAdmin(req, res, session);
    if (pathname === '/tests' && method === 'GET') return send(res, 200, testsPage(session));
    if (pathname === '/complete' && method === 'GET') {
      if (!isComplete()) {
        const p = progressData();
        const left = TESTS.filter(t => !state.tests[t.id]);
        return send(res, 200, layout('Complete', session,
          '<h2>Not yet complete</h2><p>You are at ' + p.done + '/' + p.total + ' tests (' + p.pct + '%). The completion summary, key and certificate unlock at 100%.</p>' +
          '<h3>Still open</h3><ul>' + left.map(t => '<li>' + esc(t.name) + ' (' + esc(t.feature) + ')</li>').join('') + '</ul>'));
      }
      return send(res, 200, buildCompletePage(session));
    }
    if (pathname === '/certificate' && method === 'GET') {
      if (!isComplete()) return redirect(res, '/complete');
      return send(res, 200, certificatePage(session));
    }
    if (pathname === '/tester-name' && method === 'POST') {
      const body = await readBody(req);
      const form = body.form || body.json || {};
      if (form.name) { state.testerName = String(form.name); saveState(); }
      return redirect(res, '/complete');
    }

    let m;
    if ((m = pathname.match(/^\/papers\/(\d+)$/)) && method === 'GET') return handlePaperView(req, res, session, Number(m[1]));
    if ((m = pathname.match(/^\/papers\/(\d+)\/manuscript$/)) && method === 'GET') return handleManuscript(req, res, session, Number(m[1]));
    if ((m = pathname.match(/^\/papers\/(\d+)\/upload$/)) && method === 'POST') return handleUpload(req, res, session, Number(m[1]));
    if ((m = pathname.match(/^\/papers\/(\d+)\/reviews$/)) && method === 'POST') return handleReviewSubmit(req, res, session, Number(m[1]));
    if ((m = pathname.match(/^\/papers\/(\d+)\/assign$/)) && method === 'POST') return handleAssign(req, res, session, Number(m[1]));
    if ((m = pathname.match(/^\/papers\/(\d+)\/decide$/)) && method === 'POST') return handleDecide(req, res, session, Number(m[1]));
    if ((m = pathname.match(/^\/reviews\/(\d+)\/score$/)) && method === 'POST') return handleScoreUpdate(req, res, session, Number(m[1]));
    if ((m = pathname.match(/^\/invitations\/(\d+)\/accept$/)) && method === 'POST') return handleInviteAccept(req, res, session, Number(m[1]));
    if ((m = pathname.match(/^\/admin\/users\/(\d+)\/role$/)) && method === 'POST') return handleAdminRole(req, res, session, Number(m[1]));
    if ((m = pathname.match(/^\/files\/(.+)$/)) && method === 'GET') return handleFileServe(req, res, session, decodeURIComponent(m[1]));

    return send(res, 404, layout('Not found', session, '<h2>404</h2><p>That page does not exist in this portal.</p>'));
  } catch (err) {
    try { send(res, 500, '<h1>500</h1><p>Something went wrong, but the lab is still running.</p>'); } catch (e) {}
  }
});

if (require.main === module) {
  server.listen(LAB.port, '127.0.0.1', () => {
    console.log('LAB ' + LAB.number + ' — ' + LAB.name + ' listening on http://127.0.0.1:' + LAB.port);
  });
}
module.exports = { TESTS, LAB, FEATURES, TOTAL_TESTS };
