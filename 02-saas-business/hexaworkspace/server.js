'use strict';
/* ============================================================================
   HexaWorkspace — LAB 17 of 110 · HexaCyberLab Practice Labs
   Category 2: SaaS & Business Platforms
   A complete collaboration suite (workspaces, folders, shared files,
   comments, per-file permissions, share links, team members) that is
   DELIBERATELY VULNERABLE for local, authorised pentesting practice.
   Zero dependencies (Node.js built-ins only). Binds 127.0.0.1 only.
   ========================================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3026;
const LAB_NUMBER = 17;
const LAB_NAME = 'HexaWorkspace';
const PREV_LAB = 16;
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const LOGO_FILE = path.join(DIR, 'logo.png');

/* ---- key material (shards, region 1 of 3) -------------------------------- */
const _kA = ["TC1YSA==","Ri03MQ=="];
const _kB = ["TC1YSA==","MC04MQ=="];

/* ============================================================================
   TESTS REGISTRY — one entry per scored vulnerability test.
   A test completes only when the server detects the exploit succeeding.
   ========================================================================== */
const TESTS = [
/* ------------------------- Login & Authentication ------------------------ */
{ id:'sqli-login', feature:'Login & Authentication', name:'SQL Injection Login Bypass', owasp:'A03 Injection', difficulty:'Advanced',
  hints:["The login handler builds its user lookup as a text query string with your email pasted straight in.","What happens if your 'email' contains a quote and a logical operator?","Try logging in with the email: ' OR '1'='1 — the password stops mattering."],
  lesson:'String-built queries let attacker input change the logic of the query itself. Authentication must use parameterised queries so input is always treated as data, never as code.',
  impact:'An attacker logs in as the site administrator without any password. On a real client workspace that means every team file, member list and billing setting is exposed in one request.',
  report:{title:'SQL Injection in Login Form Allows Authentication Bypass',severity:'Critical',remediation:'Use parameterised queries / prepared statements for all database access; never build queries by string concatenation.'},
  guide:"Step by step: 1) Open the login page. 2) Enter the email ' OR '1'='1 and any password. 3) Submit — the string-built query matches the first user in the table (the administrator) and you are logged in as them."},
{ id:'brute-force', feature:'Login & Authentication', name:'Brute Force — No Rate Limiting or Lockout', owasp:'A07 Auth Failures', difficulty:'Beginner',
  hints:['Nothing slows you down on the login form — no delay, no CAPTCHA, no lockout.','Script ten wrong passwords for one account and watch: every one is processed.','The 10th failed attempt for the same account is still accepted for processing — that missing throttle is the flaw.'],
  lesson:'Without rate limiting or lockout, an attacker can try unlimited passwords against any account. Failed-login throttling is a basic authentication control.',
  impact:'Attackers can grind through password lists against a real client\u2019s accounts at full speed until one works — especially dangerous for owner and admin accounts.',
  report:{title:'Missing Brute-Force Protection on Login',severity:'High',remediation:'Rate-limit login attempts per account and per IP, add progressive delays / lockout and alerting on repeated failures.'},
  guide:'Step by step: 1) Pick a real account, e.g. emma@acme.test. 2) Submit a wrong password 10 times (Burp Intruder or a small loop). 3) Every attempt is processed with no throttle — the test completes at the 10th failure.'},
{ id:'user-enumeration', feature:'Login & Authentication', name:'User Enumeration via Login & Forgot-Password Responses', owasp:'A07 Auth Failures', difficulty:'Beginner',
  hints:['Compare the login error for an email that exists with one that does not.','"No account found" vs "Incorrect password" — the app tells you which emails are registered.','Probe one unknown email and one known email with a wrong password; the different answers are the leak.'],
  lesson:'Different error messages for "user does not exist" and "wrong password" let attackers build a list of valid accounts to target. Authentication responses must be identical either way.',
  impact:'An attacker first harvests which employee emails have accounts on the client\u2019s platform, then focuses phishing and password attacks only on real users.',
  report:{title:'Account Enumeration via Distinct Authentication Error Messages',severity:'Medium',remediation:'Return one generic message ("Invalid email or password") for all failed logins and password-reset requests.'},
  guide:'Step by step: 1) Log in with an email that does not exist, e.g. nobody@acme.test — note the message. 2) Log in with a real email (emma@acme.test) and a wrong password — note the different message. 3) The contrast confirms which accounts exist.'},
{ id:'default-creds', feature:'Login & Authentication', name:'Weak / Default Credentials — Demo Guest Account', owasp:'A07 Auth Failures', difficulty:'Beginner',
  hints:['Demo and seed accounts are a classic way in. This lab ships with one.','The guest account uses the most-guessed pattern there is: guest / guest123.','Sign in as guest@hexaworkspace.local with password guest123.'],
  lesson:'Default and demo credentials left active in production are an open door — attackers try them first, before any clever exploit.',
  impact:'Anyone on the internet can sign in with the published demo login and start exploring the client\u2019s platform from the inside.',
  report:{title:'Active Default/Demo Account with Weak Password',severity:'High',remediation:'Remove or disable demo/default accounts before production; enforce unique, strong credentials for every account.'},
  guide:'Step by step: 1) On the login page, enter guest@hexaworkspace.local. 2) Use the password guest123. 3) You are in — a shipped default account with a guessable password.'},
{ id:'reset-token', feature:'Login & Authentication', name:'Predictable Password-Reset Token', owasp:'A07 Auth Failures', difficulty:'Intermediate',
  hints:['Request a password reset for your own account and study the token format.','The token is a deterministic function of the user ID: rst-<id>-<id*137+42>.','Compute the token for another user (the admin is id 1) and post it straight to /reset — no email access needed.'],
  lesson:'Reset tokens must be long, random and single-use. A token an attacker can compute from a user ID is equivalent to no token at all.',
  impact:'An attacker resets the workspace owner\u2019s password using only their user ID, takes over the account, and inherits every file and permission it controls.',
  report:{title:'Predictable Password Reset Token Allows Account Takeover',severity:'Critical',remediation:'Generate reset tokens with a CSPRNG (≥128 bits), store them hashed, expire them quickly and make them single-use.'},
  guide:'Step by step: 1) Use Forgot Password on your own account and note the token pattern: rst-<userId>-<userId*137+42>. 2) The admin is user id 1, so their token is rst-1-179. 3) POST that token to /reset with the admin email and a new password — the account is yours.'},
{ id:'cookie-role', feature:'Login & Authentication', name:'Session Role Cookie Tampering', owasp:'A01 Broken Access Control', difficulty:'Intermediate',
  hints:['After logging in, inspect your cookies — one of them carries your role, readable and editable.','The admin panel trusts the hws_role cookie instead of the server-side account record.','Base64-decode hws_role, change the value to admin, and visit /admin.'],
  lesson:'Authorization data must live server-side. A role stored in a client cookie — even encoded — is just a suggestion the attacker can rewrite.',
  impact:'Any low-privilege user promotes themselves to site administrator by editing a cookie, reaching user management and moderation for the whole platform.',
  report:{title:'Privilege Escalation via Unsigned Role Cookie',severity:'Critical',remediation:'Keep roles in server-side session state; never trust client-supplied role claims. If a token must carry claims, sign and verify it (e.g. HMAC/JWT with server secret).'},
  guide:'Step by step: 1) Log in as any non-admin user and look at the hws_role cookie (it is base64). 2) Replace it with the base64 of the word admin. 3) Open /admin — the panel trusts the cookie and lets you in, and the test detects the mismatch with your real account role.'},
/* ----------------------- Registration & Profile -------------------------- */
{ id:'mass-assignment', feature:'Registration & Profile', name:'Mass Assignment — Privileged Fields Accepted from the Form', owasp:'A01 Broken Access Control', difficulty:'Intermediate',
  hints:['The profile update binds every posted field straight onto your user record.','The form shows name, email and plan — but the model also has a siteRole field.','Add a siteRole=admin field to the profile POST (browser dev tools or Burp) and save.'],
  lesson:'Binding request data directly to a data model lets attackers set fields the UI never offered. Updates must use an explicit allowlist of editable fields.',
  impact:'A ordinary user grants themselves site-admin on the client\u2019s SaaS, unlocking user deletion, moderation and platform-wide settings.',
  report:{title:'Mass Assignment Allows Privilege Escalation to Site Admin',severity:'Critical',remediation:'Allowlist bindable fields per endpoint; never bind role/permission fields from request data.'},
  guide:'Step by step: 1) Log in as a normal user and open Profile. 2) Intercept the profile save request and add the field siteRole with value admin. 3) Send it — your account is now a site administrator.'},
{ id:'stored-xss-profile', feature:'Registration & Profile', name:'Stored XSS in Display Name', owasp:'A03 Injection', difficulty:'Beginner',
  hints:['Your display name is shown to other people — in the header greeting and the workspace member list.','It is rendered without escaping.','Set your display name to <script>alert(1)</script> and view a member list.'],
  lesson:'Any user-controlled text rendered into other users\u2019 pages must be output-encoded. Stored XSS fires in the victim\u2019s browser with their session.',
  impact:'An attacker plants a script in their profile name; every teammate or admin who views the member list runs it — session theft and actions performed as the victim follow.',
  report:{title:'Stored Cross-Site Scripting via Display Name',severity:'High',remediation:'Context-appropriate output encoding for all user-supplied content; add a Content-Security-Policy as defence in depth.'},
  guide:'Step by step: 1) Open Profile. 2) Set your display name to <script>alert(document.domain)</script> and save. 3) Open any workspace member list — the name is stored and rendered unescaped, and the test detects the stored payload.'},
{ id:'weak-password', feature:'Registration & Profile', name:'Weak Password Policy — 1-Character Passwords Accepted', owasp:'A07 Auth Failures', difficulty:'Beginner',
  hints:['Register a new account and try the shortest password the form accepts.','There is no length or complexity check at all.','A 2-character password such as "ab" is happily accepted.'],
  lesson:'Password policy is enforced server-side or not at all. Accepting trivial passwords makes accounts guessable in seconds.',
  impact:'Customers who choose weak passwords (many will) have their workspaces — and every shared client file inside — taken over by simple guessing.',
  report:{title:'Missing Password Complexity / Length Policy',severity:'Medium',remediation:'Enforce a minimum length (≥10) and screen against known-breached password lists at registration and reset.'},
  guide:'Step by step: 1) Register a new account. 2) Use a password of 3 characters or fewer, e.g. ab. 3) The account is created — the missing policy is the flaw.'},
{ id:'csrf-profile', feature:'Registration & Profile', name:'CSRF on Profile Update', owasp:'A01 Broken Access Control', difficulty:'Intermediate',
  hints:['The profile form carries a hidden hx_tok field — check whether the server actually verifies it.','It does not. A POST with no token, or from a foreign Origin, is accepted.','Replay the profile POST without hx_tok (curl makes this easy) and your name changes anyway.'],
  lesson:'State-changing forms need an unguessable, server-verified CSRF token bound to the session. A token that is rendered but never checked is decoration.',
  impact:'A malicious page open in a victim\u2019s browser silently rewrites their profile — the first step in account-takeover and social-engineering chains against the client\u2019s team.',
  report:{title:'Cross-Site Request Forgery on Profile Update (Token Not Verified)',severity:'Medium',remediation:'Verify the CSRF token server-side on every state-changing request and enforce SameSite cookies.'},
  guide:'Step by step: 1) Log in and copy your session cookie. 2) From curl, POST to /profile with your cookie but WITHOUT the hx_tok field (add a foreign Origin header for realism). 3) The change is applied — the token was never verified.'},
/* ------------------------ Workspaces & Members --------------------------- */
{ id:'member-idor', feature:'Workspaces & Members', name:'IDOR — Another Workspace\u2019s Member List Exposed', owasp:'A01 Broken Access Control', difficulty:'Beginner',
  hints:['Workspace IDs are small sequential numbers, and member lists live at /workspace/<id>/members.','The endpoint checks that you are logged in — not that you belong to that workspace.','Log in as the Globex user and open workspace 1\u2019s member list.'],
  lesson:'Every object endpoint must verify the requester\u2019s relationship to that object. Sequential IDs plus a missing membership check expose the whole tenant map.',
  impact:'A competitor enumerates the client\u2019s customer workspaces and their full member rosters — names and emails ready-made for phishing.',
  report:{title:'Insecure Direct Object Reference on Workspace Member List',severity:'High',remediation:'Check workspace membership (or an explicit grant) on every workspace-scoped endpoint, not just authentication.'},
  guide:'Step by step: 1) Log in as oscar@globex.test (owner of workspace 2, not a member of workspace 1). 2) Open /workspace/1/members. 3) The full Acme member list is served — the membership check is missing.'},
{ id:'role-tamper', feature:'Workspaces & Members', name:'Role Tampering — a Viewer Can Demote or Remove the Owner', owasp:'A01 Broken Access Control', difficulty:'Intermediate',
  hints:['Member role changes and removals are simple POSTs under /workspace/<id>/members/.','The server never checks that the caller is the workspace owner.','Log in as the viewer and POST a role change — or remove the owner outright.'],
  lesson:'Sensitive team operations must verify the actor\u2019s role server-side. Hiding the button in the UI is not authorization.',
  impact:'The lowest-privilege member of a client workspace fires the owner and seizes or destroys the team\u2019s shared space — a total loss of control in one request.',
  report:{title:'Missing Authorization on Member Role Change / Removal',severity:'High',remediation:'Require workspace-owner role (verified server-side) for role changes and removals; protect the owner record from demotion.'},
  guide:'Step by step: 1) Log in as victor@acme.test (a viewer). 2) POST to /workspace/1/members/remove with userId=2 (the owner). 3) The owner is removed by a viewer — the endpoint never checked who was calling.'},
/* ------------------------- Files & Permissions --------------------------- */
{ id:'file-idor', feature:'Files & Permissions', name:'IDOR — Private File of Another Team Served by ID', owasp:'A01 Broken Access Control', difficulty:'Beginner',
  hints:['File pages live at /files/<id> with small sequential IDs.','The page checks login only — not workspace membership or a sharing grant.','As the Globex user, open file 102 — Acme\u2019s confidential salary document.'],
  lesson:'Object-level authorization must be checked on every read. "Logged in" is not "allowed". This is the single most common SaaS data-leak pattern.',
  impact:'Every private file on the platform — contracts, salary bands, roadmaps — is readable by any account holder who guesses an ID. A client\u2019s entire document store leaks.',
  report:{title:'Insecure Direct Object Reference on File View',severity:'Critical',remediation:'Authorize each file read against workspace membership or an explicit per-file grant.'},
  guide:'Step by step: 1) Log in as oscar@globex.test. 2) Open /files/102. 3) Acme\u2019s salary-band file is served to a user from a different company with no grant.'},
{ id:'viewer-edit', feature:'Files & Permissions', name:'Permission Bypass — Viewer Edits a File', owasp:'A01 Broken Access Control', difficulty:'Beginner',
  hints:['Viewers are read-only in the UI — the Edit button is hidden from them.','The POST endpoint behind it only checks membership, not role.','As the viewer, POST directly to /files/101/edit with new content.'],
  lesson:'UI hiding is not enforcement. Every mutating endpoint must re-check the actor\u2019s permission for that object.',
  impact:'A read-only guest silently rewrites shared client documents — contracts altered, figures changed — with no visual clue anything was wrong.',
  report:{title:'Missing Role Check on File Edit Endpoint',severity:'High',remediation:'Enforce editor-or-above role server-side on all file mutation endpoints.'},
  guide:'Step by step: 1) Log in as victor@acme.test (viewer). 2) POST to /files/101/edit with a new content field. 3) The roadmap is rewritten by a read-only account.'},
{ id:'viewer-delete', feature:'Files & Permissions', name:'Permission Bypass — Viewer Deletes a File', owasp:'A01 Broken Access Control', difficulty:'Beginner',
  hints:['Same missing check as edit — the delete endpoint trusts membership alone.','Create or pick a file, then call the delete endpoint as the viewer.','POST to /files/<id>/delete as victor and the file is gone.'],
  lesson:'Destructive actions deserve the strictest server-side checks. A delete that trusts the UI\u2019s hidden button is one request away from data loss.',
  impact:'A disgruntled read-only member wipes the client\u2019s shared files. Without backups the business documents are simply gone.',
  report:{title:'Missing Role Check on File Delete Endpoint',severity:'High',remediation:'Enforce editor-or-above (ideally owner) server-side for deletion; consider soft-delete with recovery.'},
  guide:'Step by step: 1) Log in as victor@acme.test (viewer). 2) POST to /files/<id>/delete for a workspace file. 3) The file is deleted by a read-only account.'},
{ id:'folder-traversal', feature:'Files & Permissions', name:'Folder Path Traversal — Reading Another Team\u2019s Files by Path', owasp:'A01 Broken Access Control', difficulty:'Intermediate',
  hints:['The raw download endpoint takes a path: /raw?path=acme/projects/roadmap-2027.txt.','It resolves ".." segments naively, with no check on where you end up.','Walk up and across: /raw?path=acme/projects/../../globex/strategy/globex-takeover-plan.txt'],
  lesson:'User-supplied paths must be canonicalised and confined to an allowed root. String prefixes are not a boundary once ".." is resolved.',
  impact:'An attacker walks the folder tree out of their own workspace and downloads every other customer\u2019s files on the platform.',
  report:{title:'Path Traversal in File Download Allows Cross-Tenant File Access',severity:'Critical',remediation:'Resolve the canonical path and verify it stays inside the requester\u2019s authorised root; reject ".." outright.'},
  guide:'Step by step: 1) Log in as an Acme member. 2) Request /raw?path=acme/projects/../../globex/strategy/globex-takeover-plan.txt. 3) The Globex secret is served — traversal escaped your workspace.'},
{ id:'grant-tamper', feature:'Files & Permissions', name:'Sharing Grant Created Without Authority', owasp:'A01 Broken Access Control', difficulty:'Intermediate',
  hints:['Per-file sharing grants are created by POST /files/<id>/share with a userId and a role.','The endpoint never asks whether YOU are allowed to share that file.','As a mere viewer, grant the outsider access to Acme\u2019s salary file.'],
  lesson:'Sharing is a privileged operation: only owners/editors may extend access. If anyone can grant, permissions are theatre.',
  impact:'An insider quietly grants an outside accomplice access to confidential client files — the leak looks like legitimate sharing in every log.',
  report:{title:'Missing Authorization on File Sharing Grant Creation',severity:'High',remediation:'Require owner/editor role on the file\u2019s workspace to create grants; log grant creation for audit.'},
  guide:'Step by step: 1) Log in as victor@acme.test (viewer). 2) POST to /files/102/share with userId=5 and role=viewer. 3) The grant is created — a viewer just shared a file they could not even edit.'},
/* ------------------------------- Comments -------------------------------- */
{ id:'stored-xss-comment', feature:'Comments', name:'Stored XSS in File Comments', owasp:'A03 Injection', difficulty:'Beginner',
  hints:['Comments render on the file page for everyone who opens it.','Comment bodies are not escaped.','Post a comment containing <script>alert(1)</script> on any file.'],
  lesson:'Discussion text is code\u2019s worst neighbour: stored unescaped, it executes for every viewer. Output encoding is mandatory on every render path.',
  impact:'One poisoned comment on a popular client file attacks every teammate and admin who opens it — a watering-hole inside the client\u2019s own workspace.',
  report:{title:'Stored Cross-Site Scripting in Comments',severity:'High',remediation:'Escape all comment content on render; sanitise if rich text is ever allowed; add CSP.'},
  guide:'Step by step: 1) Open any file you can view. 2) Post the comment <script>alert(document.domain)</script>. 3) It is stored raw and rendered unescaped on the file page.'},
{ id:'comment-idor', feature:'Comments', name:"IDOR — Deleting Another User's Comment", owasp:'A01 Broken Access Control', difficulty:'Beginner',
  hints:['Comment deletion is a POST to /comments/<id>/delete.','The server does not check that the comment is yours.','Delete a comment written by a teammate while logged in as someone else.'],
  lesson:'Ownership checks apply to every object, however small. If delete checks nothing, moderation history and evidence can be erased by anyone.',
  impact:'Attackers erase inconvenient comments — approvals, warnings, audit trail — undermining trust in the client\u2019s collaboration records.',
  report:{title:'Missing Ownership Check on Comment Deletion',severity:'Medium',remediation:'Allow deletion only by the comment author, workspace owner, or a site admin — verified server-side.'},
  guide:'Step by step: 1) Note a comment written by Emma. 2) Log in as Victor. 3) POST to /comments/<id>/delete — someone else\u2019s comment disappears.'},
/* ------------------------------ Share Links ------------------------------ */
{ id:'share-revoked', feature:'Share Links', name:'Revoked Share Link Keeps Working', owasp:'A01 Broken Access Control', difficulty:'Intermediate',
  hints:['Owners can revoke a share link from the file page.','The public link handler never looks at the revoked flag.','Create a link, revoke it, then open it in a private window — it still serves the file.'],
  lesson:'Revocation must be enforced at access time, not just recorded. A revoked link that still resolves is a permanent backdoor.',
  impact:'A client revokes a link after a leak scare and believes the file is safe — while the "dead" link keeps serving it to whoever saved it.',
  report:{title:'Revoked Share Links Remain Active',severity:'High',remediation:'Check the revoked flag (and expiry) on every share-link access; deny revoked tokens.'},
  guide:'Step by step: 1) As Olivia, create a share link for a file and open it — it works. 2) Revoke it from the file page. 3) Open the same /s/<token> URL again — the file is still served.'},
{ id:'share-enumeration', feature:'Share Links', name:'Predictable, Enumerable Share-Link Tokens', owasp:'A01 Broken Access Control', difficulty:'Intermediate',
  hints:['Look at a real share token: shr-1001. The next one is not hard to guess.','Tokens are a public sequence: shr-1002, shr-1003, …','Probe five different token values in a row and the pattern — and other people\u2019s shared files — are yours.'],
  lesson:'Access tokens must be unguessable: long, random, and independent. Sequential IDs turn "anyone with the link" into "anyone".',
  impact:'An attacker enumerates every shared file on the platform by counting upwards — every "private link" a client ever sent becomes public.',
  report:{title:'Guessable Share-Link Tokens Allow Enumeration of Shared Files',severity:'High',remediation:'Generate share tokens with a CSPRNG (≥128 bits of entropy); rate-limit token lookups.'},
  guide:'Step by step: 1) Note the seeded share token shr-1001. 2) Request /s/shr-1002, /s/shr-1003, /s/shr-1004, /s/shr-1005 in the same session. 3) Five distinct sequential tokens probed — enumeration is trivial because tokens are predictable.'},
/* ------------------------------ File Upload ------------------------------ */
{ id:'upload-html', feature:'File Upload', name:'Unrestricted Upload — HTML File Served as a Web Page', owasp:'A05 Security Misconfiguration', difficulty:'Intermediate',
  hints:['The upload feature stores any filename and content, then serves it back under /uploads/.','The content type is chosen from the extension — .html is served as text/html.','Upload a file named evil.html containing a script payload, then open its /uploads/ URL.'],
  lesson:'Uploads must be validated by content, stored outside the web root or served with a safe content type and Content-Disposition. Serving attacker HTML from your own origin is stored XSS with extra steps.',
  impact:'Attackers host phishing pages and scripts on the client\u2019s own trusted domain — links that pass every "check the URL" test a victim was taught.',
  report:{title:'Unrestricted File Upload Leads to Stored XSS / Content Spoofing',severity:'High',remediation:'Allowlist file types, verify content, serve uploads as attachments or from a separate sandbox domain with safe content types.'},
  guide:'Step by step: 1) Use the upload form (name + content). 2) Name the file evil.html and put <script>alert(document.domain)</script> in the content. 3) Open /uploads/evil.html — it is served as a real HTML page from the app origin.'},
/* ------------------------------ Admin Panel ------------------------------ */
{ id:'admin-csrf', feature:'Admin Panel', name:'CSRF — Admin User Deletion via a GET Link', owasp:'A01 Broken Access Control', difficulty:'Intermediate',
  hints:['In the admin panel, deleting a user is a plain link — a GET request.','GET requests must never change state; there is also no token of any kind.','While logged in as admin, just visiting /admin/users/<id>/delete removes the account.'],
  lesson:'State changes require POST plus a verified CSRF token. A destructive GET can be triggered by an <img> tag on any page the admin views.',
  impact:'An attacker emails the admin a page containing an invisible image pointing at the delete URL — one glance deletes a customer account.',
  report:{title:'State-Changing GET Request Allows CSRF Account Deletion',severity:'High',remediation:'Make destructive actions POST-only with a verified CSRF token and re-authentication for critical operations.'},
  guide:'Step by step: 1) Log in as the site admin and open /admin. 2) Click (or simply request) a user\u2019s delete link — a GET. 3) The account is gone; in a real attack an <img src> on any site would fire this in the admin\u2019s browser.'},
/* ----------------------------- Platform & API ---------------------------- */
{ id:'api-exposure', feature:'Platform & API', name:'Sensitive Data Exposure — /api/users Full Dump', owasp:'A05 Security Misconfiguration', difficulty:'Beginner',
  hints:['There is a JSON endpoint at /api/users.','It performs no authentication or authorization check at all.','Open it logged out — every account, email and password comes back.'],
  lesson:'API endpoints need the same authN/authZ discipline as pages. Debug and convenience endpoints left open are mass data breaches waiting for a crawler.',
  impact:'Full account takeover of the entire platform in one request: every user\u2019s email and password, ready for direct login.',
  report:{title:'Unauthenticated API Endpoint Exposes All User Credentials',severity:'Critical',remediation:'Require authentication and admin authorization on user-listing APIs; never return password material in API responses.'},
  guide:'Step by step: 1) Log out (or use a fresh browser). 2) Open /api/users. 3) The complete user table — including passwords — is returned with no login at all.'},
{ id:'api-token-weak', feature:'Platform & API', name:'Predictable API Token — Cross-Account API Access', owasp:'A07 Auth Failures', difficulty:'Intermediate',
  hints:['Your profile page shows your API token. Look at its shape: hw-1000 plus your user ID.','The files API accepts any token: /api/files?token=…','Compute another user\u2019s token (Oscar is id 5 → hw-1005) and read their files through the API.'],
  lesson:'API tokens are credentials. They must be long and random; a token derived from a public user ID authenticates no one.',
  impact:'Anyone can mint any customer\u2019s API token from their user ID and pull their files programmatically — silent, bulk exfiltration.',
  report:{title:'Predictable API Tokens Allow Cross-Account Data Access',severity:'Critical',remediation:'Issue API tokens from a CSPRNG with ≥128 bits of entropy; show them once, store hashed, and scope them per account.'},
  guide:'Step by step: 1) Open your profile and note your token pattern hw-<1000+yourId>. 2) Log in as Emma and request /api/files?token=hw-1005 (Oscar\u2019s). 3) Globex files are returned — the token was never a secret.'}
];
const FEATURES = [...new Set(TESTS.map(t => t.feature))];

/* ---- key material (shards, region 2 of 3) -------------------------------- */
const _kC = ["WDY3Vg==","LTlZNw=="];
const _kD = ["WEhUUQ==","LVlUUQ=="];
function _asm(a){ return a.map(s => Buffer.from(s,'base64').toString('utf8').split('').reverse().join('')).join(''); }

/* ============================================================================
   PROGRESS STATE (persisted to progress.json)
   ========================================================================== */
let progress = { unlocked:false, testerName:'', tests:{}, attempts:{}, completedAt:null, keyRevealed:false };
function loadProgress(){
  try { const p = JSON.parse(fs.readFileSync(PROGRESS_FILE,'utf8'));
    if (p && typeof p === 'object') progress = Object.assign(progress, p);
  } catch(e) { /* fresh install */ }
}
function saveProgress(){ try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 1)); } catch(e){} }
function attempt(feature){ progress.attempts[feature] = (progress.attempts[feature] || 0) + 1; saveProgress(); }
function pass(id){
  if (progress.tests[id]) return;
  progress.tests[id] = true;
  if (TESTS.every(t => progress.tests[t.id])) {
    if (!progress.completedAt) progress.completedAt = new Date().toISOString();
    progress.keyRevealed = true;
  }
  saveProgress();
}
function progressSummary(){
  const total = TESTS.length;
  const done = TESTS.filter(t => progress.tests[t.id]).length;
  const features = {};
  for (const f of FEATURES){
    const ts = TESTS.filter(t => t.feature === f);
    features[f] = { total: ts.length, done: ts.filter(t => progress.tests[t.id]).length, attempts: progress.attempts[f] || 0 };
  }
  return { lab: LAB_NAME, number: LAB_NUMBER, total, done, pct: total ? Math.floor(done/total*100) : 0, features, complete: done === total };
}
loadProgress();

/* ============================================================================
   SEED DATA (in-memory; restart re-seeds the business data — progress in
   progress.json is what persists)
   ========================================================================== */
let nextUserId = 7, nextFileId = 104, nextCommentId = 2, nextWsId = 3, nextFolderId = 21, shareCounter = 1001;
const users = [
  { id:1, email:'admin@hexaworkspace.local', password:'Admin@123',  name:'Site Admin',    siteRole:'admin', plan:'enterprise' },
  { id:2, email:'olivia@acme.test',          password:'Owner@123',  name:'Olivia Owner',  siteRole:'user',  plan:'team' },
  { id:3, email:'emma@acme.test',            password:'Editor@123', name:'Emma Editor',   siteRole:'user',  plan:'team' },
  { id:4, email:'victor@acme.test',          password:'Viewer@123', name:'Victor Viewer', siteRole:'user',  plan:'team' },
  { id:5, email:'oscar@globex.test',         password:'Oscar@123',  name:'Oscar Outsider',siteRole:'user',  plan:'team' },
  { id:6, email:'guest@hexaworkspace.local', password:'guest123',   name:'Guest Demo',    siteRole:'user',  plan:'free' }
];
users.forEach(u => u.apiToken = 'hw-' + (1000 + u.id));
const workspaces = [
  { id:1, name:'Acme HQ', slug:'acme',   ownerId:2 },
  { id:2, name:'Globex',  slug:'globex', ownerId:5 }
];
let members = [
  { ws:1, user:2, role:'owner'  },
  { ws:1, user:3, role:'editor' },
  { ws:1, user:4, role:'viewer' },
  { ws:2, user:5, role:'owner'  }
];
const folders = [
  { id:10, ws:1, parent:0, name:'Projects' },
  { id:11, ws:1, parent:0, name:'Finance'  },
  { id:20, ws:2, parent:0, name:'Strategy' }
];
const files = [
  { id:101, ws:1, folder:10, name:'Roadmap 2027.txt',       vpath:'acme/projects/roadmap-2027.txt',        owner:2, deleted:false, content:'ACME-CONFIDENTIAL — Product roadmap 2027.\nQ1: launch collaboration suite v2.\nQ2: enterprise SSO. Q3: AI summaries.\nDo not share outside Acme HQ.' },
  { id:102, ws:1, folder:11, name:'Salary Band Q4.txt',     vpath:'acme/finance/salary-band-q4.txt',       owner:2, deleted:false, content:'ACME-CONFIDENTIAL — Salary bands Q4.\nJunior: 40-55k. Mid: 55-80k. Senior: 80-120k. Staff: 120-160k.\nHR eyes only.' },
  { id:103, ws:2, folder:20, name:'Globex Takeover Plan.txt', vpath:'globex/strategy/globex-takeover-plan.txt', owner:5, deleted:false, content:'GLOBEX-SECRET — Acquisition plan.\nTarget: Acme HQ. Approach quietly via investors in Q2.\nBoard only. Never leave Globex workspace.' }
];
let comments = [
  { id:1, file:101, user:3, body:'Kickoff notes are in — roadmap looks good.', deleted:false }
];
let shareLinks = [ { token:'shr-1001', file:102, by:2, revoked:false } ];
let grants = [];   /* { file, user, role } */
const uploads = {}; /* name -> { content, by } */
const sessions = new Map(); /* sid -> { userId, hx } */
const failCounts = new Map(); /* email -> consecutive failure count */
const probes = new Map(); /* anonId -> { known, unknown, tokens:Set } */

const XSS_RE = /<script|onerror\s*=|onload\s*=|<svg|<img|<iframe|javascript:/i;
const INJ_RE = /'\s*(or|and)\s+('?\d|')|'\s*--|'\s*#|'\s*or\s*1\s*=\s*1/i;
const tokenFor = u => 'rst-' + u.id + '-' + (u.id * 137 + 42);

function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function userById(id){ return users.find(u => u.id === Number(id)); }
function memberOf(wsId, userId){ return members.find(m => m.ws === Number(wsId) && m.user === Number(userId)); }
function roleIn(wsId, userId){ const m = memberOf(wsId, userId); return m ? m.role : null; }
function hasGrant(fileId, userId){ return grants.find(g => g.file === Number(fileId) && g.user === Number(userId)); }
function canViewFile(user, file){
  if (!user || !file) return false;
  return !!memberOf(file.ws, user.id) || !!hasGrant(file.id, user.id);
}

/* ---- key material (shards, region 3 of 3) -------------------------------- */
const _kE = ["VEc0WA==","S1FRTw=="];
const _kF = ["TUlRUA==","QlNIRQ=="];
function entryKey(){ return _asm([..._kA, ..._kC, ..._kE]); }        /* assembled ONLY for /unlock */
function completionKey(){ return _asm([..._kB, ..._kD, ..._kF]); }   /* assembled ONLY at 100% */

/* ============================================================================
   HTTP HELPERS
   ========================================================================== */
function parseCookies(req){
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0,i).trim()] = decodeURIComponent(p.slice(i+1).trim()); });
  return out;
}
function readBody(req){
  return new Promise(resolve => {
    let b = '';
    req.on('data', c => { b += c; if (b.length > 2e6) req.destroy(); });
    req.on('end', () => resolve(b));
    req.on('error', () => resolve(''));
  });
}
function parseForm(raw){
  const out = {};
  for (const pair of String(raw || '').split('&')){
    if (!pair) continue;
    const i = pair.indexOf('=');
    const k = decodeURIComponent((i < 0 ? pair : pair.slice(0, i)).replace(/\+/g, ' '));
    const v = i < 0 ? '' : decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' '));
    out[k] = v;
  }
  return out;
}
function getSession(req){
  const c = parseCookies(req);
  if (c.hws_sid && sessions.has(c.hws_sid)) return { sid: c.hws_sid, ...sessions.get(c.hws_sid) };
  return null;
}
function currentUser(req){ const s = getSession(req); return s ? userById(s.userId) : null; }
function anonId(req, res){
  const c = parseCookies(req);
  if (c.hwa && probes.has(c.hwa)) return c.hwa;
  const id = crypto.randomBytes(8).toString('hex');
  probes.set(id, { known:false, unknown:false, tokens:new Set(), issued:new Set() });
  res.setHeader('Set-Cookie', [...(res.getHeader('Set-Cookie') || []), `hwa=${id}; Path=/; HttpOnly`]);
  return id;
}
function probe(req, res){ const id = anonId(req, res); return probes.get(id); }
function cookieRole(req){
  const c = parseCookies(req);
  if (!c.hws_role) return null;
  try { return Buffer.from(c.hws_role, 'base64').toString('utf8'); } catch(e){ return null; }
}
function csrfSuspect(req, body, sess){
  const origin = req.headers.origin || req.headers.referer || '';
  if (origin && !origin.includes(req.headers.host || '')) return true;
  if (!sess || !body || body.hx_tok !== sess.hx) return true;
  return false;
}

/* ============================================================================
   HTML SHELL — header progress bar + Lab Coach widget on every page
   ========================================================================== */
function layout(req, title, content){
  const s = progressSummary();
  const user = currentUser(req);
  const isAdminCookie = cookieRole(req) === 'admin';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)} · HexaWorkspace</title>
<style>
body{font-family:'Segoe UI',Arial,sans-serif;background:#101018;color:#eee;margin:0}
header{background:#171724;padding:10px 18px;display:flex;align-items:center;gap:14px;border-bottom:2px solid #6c4bd8}
header img{height:34px} header .brand{font-weight:700;font-size:17px}
header nav a{color:#bdb6ff;margin:0 8px;text-decoration:none;font-size:14px}
.pbar{background:#26263a;border-radius:6px;height:14px;min-width:170px;overflow:hidden}
.pbar>div{background:linear-gradient(90deg,#4b6fd8,#9b4bd8);height:100%}
main{max-width:960px;margin:22px auto;padding:0 16px}
.card{background:#1a1a28;border:1px solid #2e2e44;border-radius:8px;padding:16px;margin:14px 0}
input,textarea,select{background:#0d0d16;color:#eee;border:1px solid #3a3a55;border-radius:5px;padding:8px;margin:4px 0;width:100%;box-sizing:border-box}
button,.btn{background:#6c4bd8;color:#fff;border:0;border-radius:5px;padding:8px 14px;cursor:pointer;text-decoration:none;display:inline-block}
.btn2{background:#2c2c44}
table{width:100%;border-collapse:collapse} td,th{border-bottom:1px solid #2e2e44;padding:7px;text-align:left}
.err{background:#4a1f28;border:1px solid #a33;padding:10px;border-radius:6px}.ok{background:#1f4a2a;border:1px solid #3a3;padding:10px;border-radius:6px}
.mut{color:#999;font-size:13px}.tag{background:#2c2c44;border-radius:4px;padding:1px 7px;font-size:12px}
pre{background:#0d0d16;padding:10px;border-radius:6px;white-space:pre-wrap}
#coach{position:fixed;right:14px;bottom:14px;width:320px;background:#171724;border:1px solid #6c4bd8;border-radius:10px;overflow:hidden;z-index:50}
#coach h4{margin:0;padding:9px 12px;background:#6c4bd8;color:#fff;font-size:14px}
#coachlog{height:190px;overflow-y:auto;padding:9px;font-size:13px}
#coachlog div{margin:6px 0}.me{color:#9fd}.bot{color:#dcd6ff}
#coachf{display:flex}#coachf input{flex:1;margin:0;border-radius:0}#coachf button{border-radius:0}
</style></head><body>
<header><img src="/logo.png" alt="HexaCyberLab"><span class="brand">LAB ${LAB_NUMBER} — ${LAB_NAME}</span>
<span class="tag">${s.done}/${s.total} tests · ${s.pct}%</span><div class="pbar"><div style="width:${s.pct}%"></div></div>
<nav><a href="/">Dashboard</a><a href="/tests">🎯 Tests</a>${user ? `<a href="/profile">Profile</a>${isAdminCookie ? '<a href="/admin">Admin</a>' : ''}<a href="/logout">Logout</a>` : '<a href="/login">Login</a><a href="/register">Register</a>'}</nav>
<span class="mut">${user ? 'Hello, ' + user.name : ''}</span></header>
<main><h2>${esc(title)}</h2>${content}</main>
<div id="coach"><h4>🤖 Lab Coach</h4><div id="coachlog"><div class="bot">Hi! I know every test in this lab. Ask me how many tests a feature has, or how to do one — guidance unlocks after 3 real tries on that feature.</div></div>
<form id="coachf"><input id="coachin" placeholder="Ask the coach…" autocomplete="off"><button>Send</button></form></div>
<script>
const cf=document.getElementById('coachf'),ci=document.getElementById('coachin'),cl=document.getElementById('coachlog');
cf.addEventListener('submit',async e=>{e.preventDefault();const m=ci.value.trim();if(!m)return;ci.value='';
cl.insertAdjacentHTML('beforeend','<div class="me">You: '+m.replace(/</g,'&lt;')+'</div>');
try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})});
const j=await r.json();cl.insertAdjacentHTML('beforeend','<div class="bot">Coach: '+String(j.reply).replace(/</g,'&lt;')+'</div>');}
catch(err){cl.insertAdjacentHTML('beforeend','<div class="bot">Coach: connection problem.</div>');}
cl.scrollTop=cl.scrollHeight;});
</script></body></html>`;
}
function send(res, code, html){ res.writeHead(code, { 'Content-Type':'text/html; charset=utf-8' }); res.end(html); }
function sendJson(res, code, obj){ res.writeHead(code, { 'Content-Type':'application/json' }); res.end(JSON.stringify(obj)); }
function redirect(res, to){ res.writeHead(302, { Location: to }); res.end(''); }

function gatePage(req){
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ${LAB_NUMBER} — ${LAB_NAME} · Locked</title>
<style>body{font-family:'Segoe UI',Arial,sans-serif;background:#101018;color:#eee;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.box{background:#1a1a28;border:1px solid #6c4bd8;border-radius:10px;padding:28px;max-width:440px;text-align:center}
input{background:#0d0d16;color:#eee;border:1px solid #3a3a55;border-radius:5px;padding:9px;width:100%;box-sizing:border-box;margin:10px 0}
button{background:#6c4bd8;color:#fff;border:0;border-radius:5px;padding:9px 18px;cursor:pointer}
img{height:56px}</style></head><body><div class="box"><img src="/logo.png" alt="HexaCyberLab">
<h2>LAB ${LAB_NUMBER} — ${LAB_NAME}</h2><p>This lab is locked. Paste the completion key from Lab ${PREV_LAB} to start.</p>
<form method="POST" action="/unlock"><input name="key" placeholder="Completion key from Lab ${PREV_LAB}" autocomplete="off"><br><button>Unlock Lab ${LAB_NUMBER}</button></form>
<p style="color:#999;font-size:13px">HexaCyberLab Practice Labs — local use only.</p>
<div style="text-align:left;margin-top:14px;border-top:1px solid #2e2e44;padding-top:10px">
<div id="coachlog" style="height:110px;overflow-y:auto;font-size:13px"><div style="color:#dcd6ff">Coach: This lab is locked, but I can still chat. Ask me who built these labs!</div></div>
<form id="coachf" style="display:flex;gap:6px"><input id="coachin" placeholder="Ask the coach…" autocomplete="off" style="flex:1"><button>Send</button></form></div></div>
<script>
const cf=document.getElementById('coachf'),ci=document.getElementById('coachin'),cl=document.getElementById('coachlog');
cf.addEventListener('submit',async e=>{e.preventDefault();const m=ci.value.trim();if(!m)return;ci.value='';
cl.insertAdjacentHTML('beforeend','<div>You: '+m.replace(/</g,'&lt;')+'</div>');
try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})});
const j=await r.json();cl.insertAdjacentHTML('beforeend','<div style="color:#dcd6ff">Coach: '+String(j.reply).replace(/</g,'&lt;')+'</div>');}
catch(err){} cl.scrollTop=cl.scrollHeight;});
</script></body></html>`;
}

/* ============================================================================
   CHATBOT — rule-based Lab Coach (spec §6)
   ========================================================================== */
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
const FEATURE_KEYS = [
  [/share/, 'Share Links'],
  [/comment/, 'Comments'],
  [/upload/, 'File Upload'],
  [/admin/, 'Admin Panel'],
  [/member|workspace|role/, 'Workspaces & Members'],
  [/file|folder|permission|traversal|grant/, 'Files & Permissions'],
  [/register|profile|sign ?up/, 'Registration & Profile'],
  [/api/, 'Platform & API'],
  [/login|auth|brute|reset|cookie|password|credential/, 'Login & Authentication']
];
function chatReply(msg){
  const lower = String(msg || '').toLowerCase();
  const s = progressSummary();
  if (/who (built|made|created|is behind)|founder|jony|jonny/.test(lower)) return ATTRIBUTION;
  if (lower.includes('key') && !/api/.test(lower)) {
    if (progress.keyRevealed) return 'You completed the lab — here is the completion key for the next lab: ' + completionKey();
    return "I don't have the completion key yet — nobody does. It is only given to me when this lab is completed 100%. You are at " + s.pct + '% — finish every test and I will share it.';
  }
  let feature = null;
  for (const [re, f] of FEATURE_KEYS) if (re.test(lower)) { feature = f; break; }
  const wantsHow = /how|guide|help|solve|bypass|steps|walkthrough|do it|exploit/.test(lower);
  if (feature) {
    const ts = TESTS.filter(t => t.feature === feature);
    const doneN = ts.filter(t => progress.tests[t.id]).length;
    if (wantsHow) {
      const att = progress.attempts[feature] || 0;
      const allPassed = ts.every(t => progress.tests[t.id]);
      if (att >= 3 || allPassed) {
        return 'Here is the step-by-step guidance for ' + feature + ':\n' + ts.map(t => '• ' + t.name + ' — ' + t.guide).join('\n');
      }
      return 'That feature is locked for help. First try the ' + feature + " tests yourself at least 3 times — I can see you've tried " + att + ' time(s) so far. After 3 real tries, ask me again and I\u2019ll guide you step by step.';
    }
    return feature + ' has ' + ts.length + ' test(s): ' + ts.map(t => t.name).join('; ') + '. ' + doneN + ' of them completed. Attempts so far on this feature: ' + (progress.attempts[feature] || 0) + '.';
  }
  if (/how many|progress|status|score|tests|features/.test(lower)) {
    return 'This lab (LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ') has ' + TESTS.length + ' tests across ' + FEATURES.length + ' features: ' + FEATURES.map(f => f + ' (' + TESTS.filter(t => t.feature === f).length + ')').join(', ') + '. Your progress: ' + s.done + '/' + s.total + ' (' + s.pct + '%). Open the Tests page to pick your next target.';
  }
  if (/^(hi|hello|hey|hello there)/.test(lower)) return 'Hello! Ask me how many tests a feature has, or how to approach one — guidance unlocks after 3 real tries on that feature. Your progress: ' + s.done + '/' + s.total + ' (' + s.pct + '%).';
  return 'I can tell you the map of this lab: which features exist, how many tests each has, and their names. Step-by-step help for a feature unlocks after you have tried that feature at least 3 times. Try asking: "How many tests in Files & Permissions?" or "How do I do the share link tests?"';
}

/* ============================================================================
   PAGE BUILDERS
   ========================================================================== */
function loginPage(req, msg){
  return layout(req, 'Login', `${msg ? `<div class="err">${esc(msg)}</div>` : ''}
  <div class="card"><form method="POST" action="/login">
  <label>Email</label><input name="email" type="email" required>
  <label>Password</label><input name="password" type="password" required>
  <button>Log in</button></form>
  <p class="mut">Demo accounts — Olivia (owner) olivia@acme.test / Owner@123 · Emma (editor) emma@acme.test / Editor@123 · Victor (viewer) victor@acme.test / Viewer@123 · Oscar (Globex) oscar@globex.test / Oscar@123</p>
  <p><a href="/forgot">Forgot password?</a> · <a href="/register">Create an account</a></p></div>`);
}
function dashboardPage(req){
  const user = currentUser(req);
  const mine = workspaces.filter(w => memberOf(w.id, user.id));
  const myFiles = files.filter(f => !f.deleted && memberOf(f.ws, user.id));
  return layout(req, 'Dashboard', `
  <div class="card"><h3>My workspaces</h3>
  ${mine.map(w => `<p>📁 <a href="/workspace/${w.id}">${esc(w.name)}</a> <span class="tag">${esc(roleIn(w.id, user.id))}</span> · <a href="/workspace/${w.id}/members">Members</a></p>`).join('') || '<p class="mut">You are not a member of any workspace yet.</p>'}
  <form method="POST" action="/workspaces"><input name="name" placeholder="New workspace name" required> <button>Create workspace</button></form></div>
  <div class="card"><h3>Recent files</h3>
  ${myFiles.map(f => `<p>📄 <a href="/files/${f.id}">${esc(f.name)}</a> <span class="mut">${esc(f.vpath)}</span></p>`).join('') || '<p class="mut">No files yet.</p>'}</div>
  <div class="card"><h3>Upload a file</h3><form method="POST" action="/upload">
  <input name="name" placeholder="filename.ext" required><textarea name="content" rows="3" placeholder="File content"></textarea><button>Upload</button></form>
  <p class="mut">Uploads are served back under /uploads/&lt;name&gt;.</p></div>`);
}
function testsPage(req){
  const s = progressSummary();
  let h = `<div class="card"><p>Complete tests by <b>doing</b> the exploit — the server detects real success. Hints reveal one at a time. Progress: <b>${s.done}/${s.total} · ${s.pct}%</b></p></div>`;
  for (const f of FEATURES){
    const ts = TESTS.filter(t => t.feature === f);
    h += `<div class="card"><h3>${esc(f)} <span class="mut">(${ts.filter(t => progress.tests[t.id]).length}/${ts.length} done · ${s.features[f].attempts} attempts)</span></h3>`;
    for (const t of ts){
      const done = !!progress.tests[t.id];
      h += `<p>${done ? '✅' : '○'} <b>${esc(t.name)}</b> <span class="tag">${esc(t.owasp)}</span> <span class="tag">${esc(t.difficulty)}</span></p>
      <div>${t.hints.map((x, i) => `<p class="hint mut" data-t="${t.id}" data-i="${i}" style="display:none">💡 Hint ${i + 1}: ${esc(x)}</p>`).join('')}
      <button type="button" class="btn2" onclick="revealHint('${t.id}')">Show hint</button></div>`;
    }
    h += `</div>`;
  }
  h += `<script>function revealHint(id){const els=document.querySelectorAll('.hint[data-t="'+id+'"]');for(const e of els){if(e.style.display==='none'){e.style.display='block';return;}}}</script>`;
  return layout(req, '🎯 Mission — Security Tests', h);
}
function completePage(req){
  const s = progressSummary();
  if (!s.complete) {
    const left = TESTS.filter(t => !progress.tests[t.id]);
    return layout(req, 'Completion', `<div class="card"><h3>Not yet — ${s.done}/${s.total} tests (${s.pct}%)</h3>
    <p>Finish every test to unlock this debrief, your certificate and the key for the next lab.</p>
    <p>Still open:</p>${left.map(t => `<p>○ ${esc(t.name)} <span class="mut">(${esc(t.feature)})</span></p>`).join('')}</div>`);
  }
  const key = completionKey();
  let h = `<div class="ok">🎉 Lab complete — 100% (${s.total}/${s.total} tests)</div>`;
  h += `<div class="card"><h3>1 · This lab at a glance</h3><p>${FEATURES.length} features, ${s.total} security tests.</p>`;
  for (const f of FEATURES){ const ts = TESTS.filter(t => t.feature === f); h += `<p>${esc(f)}: <b>${ts.length}</b> vulnerabilities</p>`; }
  h += `</div><div class="card"><h3>2 · How it was tested — ${s.total} techniques</h3>${TESTS.map(t => `<p>• ${esc(t.name)} <span class="tag">${esc(t.owasp)}</span></p>`).join('')}</div>`;
  h += `<div class="card"><h3>3 · What you learned</h3>${TESTS.map(t => `<p><b>${esc(t.name)}:</b> ${esc(t.lesson)}</p>`).join('')}</div>`;
  h += `<div class="card"><h3>4 · What this means for a real client</h3>${TESTS.map(t => `<p><b>${esc(t.name)}:</b> ${esc(t.impact)}</p>`).join('')}</div>`;
  h += `<div class="card"><h3>5 · Writing it in a real report</h3>${TESTS.map(t => `<p><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)}<br><span class="mut">Remediation: ${esc(t.report.remediation)}</span></p>`).join('')}</div>`;
  h += `<div class="card"><h3>6 · Your completion key</h3><p>Completing LAB ${LAB_NUMBER} earned you the key that unlocks the next lab. Keep it — you will paste it at that lab's gate:</p>
  <p style="font-size:19px"><code>${esc(key)}</code></p>
  <form method="POST" action="/complete"><label>Your name (for the certificate)</label><input name="name" value="${esc(progress.testerName)}" placeholder="Your name"><button>Save name</button></form>
  <p><a class="btn" href="/certificate">🏆 View your certificate</a></p></div>`;
  return layout(req, '🏁 Lab Complete — Debrief', h);
}
function certificatePage(req){
  const s = progressSummary();
  const name = progress.testerName || 'Dedicated Tester';
  const date = progress.completedAt ? new Date(progress.completedAt).toISOString().slice(0, 10) : '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER}</title>
<style>body{font-family:Georgia,serif;background:#ddd;display:flex;justify-content:center;padding:30px}
.cert{background:#fff;color:#222;border:6px double #6c4bd8;border-radius:8px;max-width:720px;padding:44px;text-align:center}
.cert img{height:70px}h1{color:#6c4bd8;margin:8px}@media print{body{background:#fff}}</style></head><body>
<div class="cert"><img src="/logo.png" alt="HexaCyberLab">
<h1>Certificate of Completion</h1><p>This certifies that</p>
<p style="font-size:26px"><b>${esc(name)}</b></p>
<p>has completed 100% of the security tests in</p>
<p style="font-size:20px"><b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b></p>
<p>${s.total} tests across ${FEATURES.length} features · ${esc(date)}</p>
<p style="margin-top:26px;color:#555">HexaCyberLab — Built by Md. Jony Hassain, Founder</p></div></body></html>`;
}

/* ============================================================================
   ROUTES
   ========================================================================== */
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://127.0.0.1');
    const pathname = u.pathname;
    const method = req.method;

    if (pathname === '/logo.png') {
      try { const data = fs.readFileSync(LOGO_FILE); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(data); }
      catch(e){ return send(res, 404, 'logo missing'); }
    }

    /* ---- lock gate ---- */
    if (!progress.unlocked) {
      if (pathname === '/unlock' && method === 'POST') {
        const raw = await readBody(req);
        let body = {}; try { body = JSON.parse(raw); } catch(e){ body = parseForm(raw); }
        if (String(body.key || '').trim() === entryKey()) {
          progress.unlocked = true; saveProgress();
          if ((req.headers['content-type'] || '').includes('json')) return sendJson(res, 200, { ok: true });
          return redirect(res, '/');
        }
        return send(res, 403, gatePage(req).replace('</form>', '</form><p style="color:#f88">That key was not accepted.</p>'));
      }
      if (pathname === '/api/chat' && method === 'POST') {
        const raw = await readBody(req); let body = {}; try { body = JSON.parse(raw); } catch(e){}
        return sendJson(res, 200, { reply: chatReply(body.message) });
      }
      if (method === 'GET') return send(res, 200, gatePage(req));
      return send(res, 403, 'Locked');
    }

    const user = currentUser(req);
    const sess = getSession(req);
    const needLogin = () => { redirect(res, '/login'); return true; };

    /* ------------------------- auth ------------------------- */
    if (pathname === '/login' && method === 'GET') return send(res, 200, loginPage(req, u.searchParams.get('e') || ''));
    if (pathname === '/login' && method === 'POST') {
      attempt('Login & Authentication');
      const b = parseForm(await readBody(req));
      const email = String(b.email || '').trim().toLowerCase();
      const password = String(b.password || '');
      const pr = probe(req, res);
      const doLogin = usr => {
        const sid = crypto.randomBytes(16).toString('hex');
        sessions.set(sid, { userId: usr.id, hx: crypto.randomBytes(8).toString('hex') });
        res.setHeader('Set-Cookie', [
          `hws_sid=${sid}; Path=/; HttpOnly`,
          `hws_role=${Buffer.from(usr.siteRole).toString('base64')}; Path=/`,
          `hx_origin=self; Path=/`
        ]);
        return redirect(res, '/');
      };
      /* VULN(sqli-login): the lookup is a string-built "query"; an injection
         pattern in the email changes its logic and matches the first user. */
      const fakeQuery = `SELECT * FROM users WHERE email='${email}' AND password='${password}'`;
      if (INJ_RE.test(email) || INJ_RE.test(password)) { pass('sqli-login'); return doLogin(users[0]); }
      const found = users.find(x => x.email === email);
      if (!found) {
        pr.unknown = true; if (pr.known && pr.unknown) pass('user-enumeration');
        return send(res, 200, loginPage(req, 'No account found for that email address.'));
      }
      if (found.password !== password) {
        pr.known = true; if (pr.known && pr.unknown) pass('user-enumeration');
        const n = (failCounts.get(email) || 0) + 1; failCounts.set(email, n);
        if (n >= 10) pass('brute-force'); /* VULN: no throttle — the 10th failure is still processed */
        return send(res, 200, loginPage(req, 'Incorrect password.'));
      }
      failCounts.delete(email);
      if (found.id === 6) pass('default-creds'); /* shipped demo account */
      return doLogin(found);
    }
    if (pathname === '/logout') {
      const c = parseCookies(req); if (c.hws_sid) sessions.delete(c.hws_sid);
      res.setHeader('Set-Cookie', ['hws_sid=; Path=/; Max-Age=0', 'hws_role=; Path=/; Max-Age=0']);
      return redirect(res, '/login');
    }
    if (pathname === '/register' && method === 'GET')
      return send(res, 200, layout(req, 'Register', `<div class="card"><form method="POST" action="/register">
      <label>Display name</label><input name="name" required><label>Email</label><input name="email" type="email" required>
      <label>Password</label><input name="password" type="password" required><button>Create account</button></form></div>`));
    if (pathname === '/register' && method === 'POST') {
      attempt('Registration & Profile');
      const b = parseForm(await readBody(req));
      const email = String(b.email || '').trim().toLowerCase();
      if (users.some(x => x.email === email)) return send(res, 200, layout(req, 'Register', '<div class="err">That email is already registered.</div>'));
      const nu = { id: nextUserId++, email, password: String(b.password || ''), name: String(b.name || 'New User'), siteRole: 'user', plan: 'free' };
      nu.apiToken = 'hw-' + (1000 + nu.id);
      if (b.siteRole) { nu.siteRole = String(b.siteRole); if (nu.siteRole === 'admin') pass('mass-assignment'); } /* VULN: privileged field bound */
      if (XSS_RE.test(nu.name)) pass('stored-xss-profile');
      users.push(nu);
      if (String(b.password || '').length <= 3) pass('weak-password'); /* VULN: no password policy */
      const sid = crypto.randomBytes(16).toString('hex');
      sessions.set(sid, { userId: nu.id, hx: crypto.randomBytes(8).toString('hex') });
      res.setHeader('Set-Cookie', [`hws_sid=${sid}; Path=/; HttpOnly`, `hws_role=${Buffer.from(nu.siteRole).toString('base64')}; Path=/`, 'hx_origin=self; Path=/']);
      return redirect(res, '/');
    }
    if (pathname === '/forgot' && method === 'GET')
      return send(res, 200, layout(req, 'Forgot password', `<div class="card"><form method="POST" action="/forgot">
      <label>Email</label><input name="email" type="email" required><button>Generate reset token</button></form>
      <p class="mut">Demo build: the token is shown on screen instead of emailed. Then use <a href="/reset">the reset form</a>.</p></div>`));
    if (pathname === '/forgot' && method === 'POST') {
      attempt('Login & Authentication');
      const b = parseForm(await readBody(req));
      const email = String(b.email || '').trim().toLowerCase();
      const found = users.find(x => x.email === email);
      if (!found) return send(res, 200, layout(req, 'Forgot password', '<div class="err">No account with that email.</div>'));
      probe(req, res).issued.add(email);
      return send(res, 200, layout(req, 'Forgot password', `<div class="ok">Reset token for ${esc(email)}: <b>${esc(tokenFor(found))}</b></div><p>Use it on <a href="/reset">the reset form</a>.</p>`));
    }
    if (pathname === '/reset' && method === 'GET')
      return send(res, 200, layout(req, 'Reset password', `<div class="card"><form method="POST" action="/reset">
      <label>Email</label><input name="email" type="email" required><label>Reset token</label><input name="token" required>
      <label>New password</label><input name="newpassword" type="password" required><button>Reset password</button></form></div>`));
    if (pathname === '/reset' && method === 'POST') {
      attempt('Login & Authentication');
      const b = parseForm(await readBody(req));
      const email = String(b.email || '').trim().toLowerCase();
      const found = users.find(x => x.email === email);
      if (found && String(b.token || '') === tokenFor(found)) { /* VULN: token is a public function of the user id */
        if (!probe(req, res).issued.has(email)) pass('reset-token');
        found.password = String(b.newpassword || '');
        return send(res, 200, layout(req, 'Reset password', '<div class="ok">Password changed. <a href="/login">Log in</a>.</div>'));
      }
      return send(res, 200, layout(req, 'Reset password', '<div class="err">Invalid token.</div>'));
    }

    /* ------------------------- profile ------------------------- */
    if (pathname === '/profile' && method === 'GET') {
      if (!user) return needLogin();
      return send(res, 200, layout(req, 'Profile', `<div class="card"><form method="POST" action="/profile">
      <input type="hidden" name="hx_tok" value="${esc(sess ? sess.hx : '')}">
      <label>Display name</label><input name="name" value="${esc(user.name)}">
      <label>Email</label><input name="email" value="${esc(user.email)}">
      <label>Plan</label><input name="plan" value="${esc(user.plan)}">
      <button>Save profile</button></form>
      <p class="mut">Your API token: <code>${esc(user.apiToken)}</code> — use it at /api/files?token=…</p></div>`));
    }
    if (pathname === '/profile' && method === 'POST') {
      if (!user) return needLogin();
      attempt('Registration & Profile');
      const b = parseForm(await readBody(req));
      const suspect = csrfSuspect(req, b, sess);
      let becameAdmin = false;
      for (const k of ['name', 'email', 'plan', 'siteRole']) { /* VULN: every posted field is bound, incl. siteRole */
        if (b[k] !== undefined) { if (k === 'siteRole' && b[k] === 'admin' && user.siteRole !== 'admin') becameAdmin = true; user[k] = String(b[k]); }
      }
      if (becameAdmin) pass('mass-assignment');
      if (XSS_RE.test(user.name)) pass('stored-xss-profile');
      if (suspect) pass('csrf-profile'); /* the hx_tok was rendered but never actually verified */
      return redirect(res, '/profile');
    }

    /* ------------------------- dashboard / workspaces ------------------------- */
    if (pathname === '/' && method === 'GET') { if (!user) return needLogin(); return send(res, 200, dashboardPage(req)); }
    if (pathname === '/workspaces' && method === 'POST') {
      if (!user) return needLogin();
      const b = parseForm(await readBody(req));
      const name = String(b.name || 'Untitled').slice(0, 60);
      const ws = { id: nextWsId++, name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ws', ownerId: user.id };
      workspaces.push(ws); members.push({ ws: ws.id, user: user.id, role: 'owner' });
      return redirect(res, '/workspace/' + ws.id);
    }
    let m;
    if ((m = pathname.match(/^\/workspace\/(\d+)$/)) && method === 'GET') {
      if (!user) return needLogin();
      const ws = workspaces.find(w => w.id === Number(m[1]));
      if (!ws) return send(res, 404, layout(req, 'Not found', '<p>Workspace not found.</p>'));
      if (!memberOf(ws.id, user.id)) return send(res, 403, layout(req, 'No access', '<p>You are not a member of this workspace.</p>'));
      const wfolders = folders.filter(f => f.ws === ws.id);
      const wfiles = files.filter(f => f.ws === ws.id && !f.deleted);
      return send(res, 200, layout(req, esc(ws.name), `
      <div class="card"><p>Your role: <span class="tag">${esc(roleIn(ws.id, user.id))}</span> · <a href="/workspace/${ws.id}/members">Members</a></p>
      <h3>Folders</h3>${wfolders.map(f => `<p>📁 ${esc(f.name)}</p>`).join('')}
      <form method="POST" action="/folders"><input type="hidden" name="ws" value="${ws.id}"><input name="name" placeholder="New folder name" required> <button>Add folder</button></form>
      <h3>Files</h3>${wfiles.map(f => `<p>📄 <a href="/files/${f.id}">${esc(f.name)}</a> <span class="mut">${esc(f.vpath)}</span></p>`).join('') || '<p class="mut">No files.</p>'}
      <form method="POST" action="/files"><input type="hidden" name="ws" value="${ws.id}">
      <select name="folder">${wfolders.map(f => `<option value="${f.id}">${esc(f.name)}</option>`).join('')}</select>
      <input name="name" placeholder="file-name.txt" required><textarea name="content" rows="3" placeholder="Content"></textarea><button>Create file</button></form></div>`));
    }
    if ((m = pathname.match(/^\/workspace\/(\d+)\/members$/)) && method === 'GET') {
      if (!user) return needLogin();
      attempt('Workspaces & Members');
      const ws = workspaces.find(w => w.id === Number(m[1]));
      if (!ws) return send(res, 404, layout(req, 'Not found', '<p>Workspace not found.</p>'));
      if (!memberOf(ws.id, user.id)) pass('member-idor'); /* VULN: member list served to non-members */
      const rows = members.filter(x => x.ws === ws.id).map(x => { const mu = userById(x.user); return mu ? { mu, role: x.role } : null; }).filter(Boolean);
      return send(res, 200, layout(req, `Members — ${esc(ws.name)}`, `<div class="card">
      <table><tr><th>Name</th><th>Email</th><th>Role</th><th>Change role</th><th>Remove</th></tr>
      ${rows.map(r => `<tr><td>${r.mu.name}</td><td>${esc(r.mu.email)}</td><td>${esc(r.role)}</td>
      <td><form method="POST" action="/workspace/${ws.id}/members/role"><input type="hidden" name="userId" value="${r.mu.id}">
      <select name="role"><option>viewer</option><option>editor</option><option>owner</option></select><button class="btn2">Set</button></form></td>
      <td><form method="POST" action="/workspace/${ws.id}/members/remove"><input type="hidden" name="userId" value="${r.mu.id}"><button class="btn2">Remove</button></form></td></tr>`).join('')}
      </table><p class="mut">Names above are rendered exactly as members typed them.</p></div>`));
    }
    if ((m = pathname.match(/^\/workspace\/(\d+)\/members\/(role|remove)$/)) && method === 'POST') {
      if (!user) return needLogin();
      attempt('Workspaces & Members');
      const ws = workspaces.find(w => w.id === Number(m[1]));
      if (!ws) return send(res, 404, 'no workspace');
      const b = parseForm(await readBody(req));
      const target = memberOf(ws.id, Number(b.userId));
      if (target) {
        if (user.id !== ws.ownerId) pass('role-tamper'); /* VULN: no owner check on role change / removal */
        if (m[2] === 'role') {
          target.role = ['viewer', 'editor', 'owner'].includes(b.role) ? b.role : target.role;
          if (Number(b.userId) === ws.ownerId && target.role !== 'owner') ws.ownerId = 0;
        } else {
          members = members.filter(x => !(x.ws === ws.id && x.user === Number(b.userId)));
          if (Number(b.userId) === ws.ownerId) ws.ownerId = 0;
        }
      }
      return redirect(res, `/workspace/${ws.id}/members`);
    }
    if (pathname === '/folders' && method === 'POST') {
      if (!user) return needLogin();
      const b = parseForm(await readBody(req));
      const ws = workspaces.find(w => w.id === Number(b.ws));
      if (ws && memberOf(ws.id, user.id)) folders.push({ id: nextFolderId++, ws: ws.id, parent: 0, name: String(b.name || 'Folder').slice(0, 60) });
      return redirect(res, ws ? '/workspace/' + ws.id : '/');
    }

    /* ------------------------- files ------------------------- */
    if (pathname === '/files' && method === 'POST') {
      if (!user) return needLogin();
      const b = parseForm(await readBody(req));
      const folder = folders.find(f => f.id === Number(b.folder));
      if (!folder || !memberOf(folder.ws, user.id)) return send(res, 403, layout(req, 'No access', '<p>You cannot add files here.</p>'));
      const ws = workspaces.find(w => w.id === folder.ws);
      const name = String(b.name || 'untitled.txt').slice(0, 80);
      const file = { id: nextFileId++, ws: ws.id, folder: folder.id, name, vpath: ws.slug + '/' + folder.name.toLowerCase().replace(/\s+/g, '-') + '/' + name.toLowerCase().replace(/\s+/g, '-'), owner: user.id, deleted: false, content: String(b.content || '') };
      files.push(file);
      return redirect(res, '/files/' + file.id);
    }
    if ((m = pathname.match(/^\/files\/(\d+)$/)) && method === 'GET') {
      if (!user) return needLogin();
      attempt('Files & Permissions');
      const file = files.find(f => f.id === Number(m[1]) && !f.deleted);
      if (!file) return send(res, 404, layout(req, 'Not found', '<p>File not found.</p>'));
      if (!canViewFile(user, file)) pass('file-idor'); /* VULN: any logged-in user can open any file by ID */
      const ws = workspaces.find(w => w.id === file.ws);
      const myRole = roleIn(file.ws, user.id) || (hasGrant(file.id, user.id) ? hasGrant(file.id, user.id).role : 'none');
      const fcomments = comments.filter(c => c.file === file.id && !c.deleted);
      const flinks = shareLinks.filter(l => l.file === file.id);
      const fgrants = grants.filter(g => g.file === file.id);
      return send(res, 200, layout(req, esc(file.name), `
      <div class="card"><p class="mut">${esc(file.vpath)} · workspace ${esc(ws ? ws.name : '')} · your access: <span class="tag">${esc(myRole)}</span></p>
      <pre>${esc(file.content)}</pre>
      <p><a href="/raw?path=${encodeURIComponent(file.vpath)}">Download (raw)</a></p>
      <h4>Edit content</h4><form method="POST" action="/files/${file.id}/edit"><textarea name="content" rows="4">${esc(file.content)}</textarea><button>Save edit</button></form>
      <form method="POST" action="/files/${file.id}/delete" style="margin-top:8px"><button class="btn2">Delete file</button></form></div>
      <div class="card"><h4>Share this file</h4>
      <form method="POST" action="/files/${file.id}/share"><label>Grant access to user ID</label><input name="userId" placeholder="e.g. 5">
      <select name="role"><option>viewer</option><option>editor</option></select><button>Grant access</button></form>
      ${fgrants.map(g => `<p class="mut">Grant: user ${g.user} — ${esc(g.role)}</p>`).join('')}
      <form method="POST" action="/files/${file.id}/sharelink"><button>Create share link</button></form>
      ${flinks.map(l => `<p class="mut">Link: /s/${esc(l.token)} ${l.revoked ? '(revoked)' : '(active)'}</p>
      <form method="POST" action="/files/${file.id}/revoke"><input type="hidden" name="token" value="${esc(l.token)}"><button class="btn2">Revoke ${esc(l.token)}</button></form>`).join('')}
      </div>
      <div class="card"><h4>Comments</h4>
      ${fcomments.map(c => { const cu = userById(c.user); return `<p><b>${cu ? cu.name : 'user'}</b>: ${c.body} <form method="POST" action="/comments/${c.id}/delete" style="display:inline"><button class="btn2">delete</button></form></p>`; }).join('') || '<p class="mut">No comments yet.</p>'}
      <form method="POST" action="/files/${file.id}/comments"><textarea name="body" rows="2" placeholder="Add a comment" required></textarea><button>Comment</button></form></div>`));
    }
    if ((m = pathname.match(/^\/files\/(\d+)\/edit$/)) && method === 'POST') {
      if (!user) return needLogin();
      attempt('Files & Permissions');
      const file = files.find(f => f.id === Number(m[1]) && !f.deleted);
      if (!file) return send(res, 404, 'no file');
      const mem = memberOf(file.ws, user.id);
      if (!mem && !hasGrant(file.id, user.id)) return send(res, 403, layout(req, 'No access', '<p>Members only.</p>'));
      const b = parseForm(await readBody(req));
      if (mem && mem.role === 'viewer') pass('viewer-edit'); /* VULN: endpoint checks membership, not role */
      file.content = String(b.content || '');
      return redirect(res, '/files/' + file.id);
    }
    if ((m = pathname.match(/^\/files\/(\d+)\/delete$/)) && method === 'POST') {
      if (!user) return needLogin();
      attempt('Files & Permissions');
      const file = files.find(f => f.id === Number(m[1]) && !f.deleted);
      if (!file) return send(res, 404, 'no file');
      const mem = memberOf(file.ws, user.id);
      if (!mem && !hasGrant(file.id, user.id)) return send(res, 403, layout(req, 'No access', '<p>Members only.</p>'));
      if (mem && mem.role === 'viewer') pass('viewer-delete'); /* VULN: same missing role check */
      file.deleted = true;
      return redirect(res, '/workspace/' + file.ws);
    }
    if ((m = pathname.match(/^\/files\/(\d+)\/share$/)) && method === 'POST') {
      if (!user) return needLogin();
      attempt('Files & Permissions');
      const file = files.find(f => f.id === Number(m[1]) && !f.deleted);
      if (!file) return send(res, 404, 'no file');
      const b = parseForm(await readBody(req));
      const myRole = roleIn(file.ws, user.id);
      if (myRole !== 'owner' && myRole !== 'editor') pass('grant-tamper'); /* VULN: grant created without authority */
      const targetId = Number(b.userId);
      if (userById(targetId) && !hasGrant(file.id, targetId)) grants.push({ file: file.id, user: targetId, role: b.role === 'editor' ? 'editor' : 'viewer' });
      return redirect(res, '/files/' + file.id);
    }
    if ((m = pathname.match(/^\/files\/(\d+)\/sharelink$/)) && method === 'POST') {
      if (!user) return needLogin();
      attempt('Share Links');
      const file = files.find(f => f.id === Number(m[1]) && !f.deleted);
      if (!file || !memberOf(file.ws, user.id)) return send(res, 403, layout(req, 'No access', '<p>Members only.</p>'));
      shareLinks.push({ token: 'shr-' + (++shareCounter), file: file.id, by: user.id, revoked: false }); /* VULN: sequential, guessable tokens */
      return redirect(res, '/files/' + file.id);
    }
    if ((m = pathname.match(/^\/files\/(\d+)\/revoke$/)) && method === 'POST') {
      if (!user) return needLogin();
      attempt('Share Links');
      const b = parseForm(await readBody(req));
      const link = shareLinks.find(l => l.token === String(b.token || '') && l.file === Number(m[1]));
      if (link) link.revoked = true;
      return redirect(res, '/files/' + m[1]);
    }
    if ((m = pathname.match(/^\/s\/([A-Za-z0-9\-]+)$/)) && method === 'GET') {
      attempt('Share Links');
      const pr = probe(req, res);
      pr.tokens.add(m[1]);
      if (pr.tokens.size >= 5) pass('share-enumeration'); /* sequential tokens invite probing */
      const link = shareLinks.find(l => l.token === m[1]);
      if (!link) return send(res, 404, layout(req, 'Invalid link', '<p>That share link does not exist.</p>'));
      const file = files.find(f => f.id === link.file && !f.deleted);
      if (!file) return send(res, 404, layout(req, 'Gone', '<p>The shared file is gone.</p>'));
      if (link.revoked) pass('share-revoked'); /* VULN: revocation recorded but never enforced */
      return send(res, 200, layout(req, 'Shared file — ' + esc(file.name), `<div class="card"><p class="mut">Shared via link ${esc(link.token)}${link.revoked ? ' (marked revoked)' : ''}</p><pre>${esc(file.content)}</pre></div>`));
    }
    if (pathname === '/raw' && method === 'GET') {
      if (!user) return needLogin();
      attempt('Files & Permissions');
      const p = String(u.searchParams.get('path') || '');
      if (p.includes('..')) {
        /* VULN: naive ".." resolution escapes the caller's workspace root */
        const stack = [];
        for (const seg of p.split('/')) { if (seg === '..') stack.pop(); else if (seg && seg !== '.') stack.push(seg); }
        const file = files.find(f => f.vpath === stack.join('/') && !f.deleted);
        if (!file) return send(res, 404, 'not found');
        if (!memberOf(file.ws, user.id) && !hasGrant(file.id, user.id)) pass('folder-traversal');
        res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end(file.content);
      }
      const file = files.find(f => f.vpath === p && !f.deleted);
      if (file && canViewFile(user, file)) { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end(file.content); }
      return send(res, 403, layout(req, 'Forbidden', '<p>That path is outside your workspaces.</p>'));
    }

    /* ------------------------- comments ------------------------- */
    if ((m = pathname.match(/^\/files\/(\d+)\/comments$/)) && method === 'POST') {
      if (!user) return needLogin();
      attempt('Comments');
      const file = files.find(f => f.id === Number(m[1]) && !f.deleted);
      if (!file) return send(res, 404, 'no file');
      const b = parseForm(await readBody(req));
      const body = String(b.body || '');
      if (XSS_RE.test(body)) pass('stored-xss-comment'); /* stored and rendered unescaped on the file page */
      comments.push({ id: nextCommentId++, file: file.id, user: user.id, body, deleted: false });
      return redirect(res, '/files/' + file.id);
    }
    if ((m = pathname.match(/^\/comments\/(\d+)\/delete$/)) && method === 'POST') {
      if (!user) return needLogin();
      attempt('Comments');
      const c = comments.find(x => x.id === Number(m[1]));
      if (!c) return send(res, 404, 'no comment');
      if (user.id !== c.user && user.siteRole !== 'admin') pass('comment-idor'); /* VULN: no ownership check */
      c.deleted = true;
      return redirect(res, '/files/' + c.file);
    }

    /* ------------------------- uploads ------------------------- */
    if (pathname === '/upload' && method === 'POST') {
      if (!user) return needLogin();
      attempt('File Upload');
      const b = parseForm(await readBody(req));
      const name = String(b.name || 'file.txt').replace(/[\\/]/g, '').slice(0, 80) || 'file.txt';
      uploads[name] = { content: String(b.content || ''), by: user.id };
      return send(res, 200, layout(req, 'Uploaded', `<div class="ok">Stored. It is served at <a href="/uploads/${encodeURIComponent(name)}">/uploads/${esc(name)}</a></div>`));
    }
    if ((m = pathname.match(/^\/uploads\/(.+)$/)) && method === 'GET') {
      attempt('File Upload');
      const name = decodeURIComponent(m[1]);
      const entry = uploads[name];
      if (!entry) return send(res, 404, 'not found');
      const ext = name.toLowerCase().split('.').pop();
      const type = ext === 'html' ? 'text/html' : ext === 'svg' ? 'image/svg+xml' : 'text/plain';
      if ((ext === 'html' || ext === 'svg') && XSS_RE.test(entry.content)) pass('upload-html'); /* VULN: attacker HTML served from the app origin */
      res.writeHead(200, { 'Content-Type': type }); return res.end(entry.content);
    }

    /* ------------------------- admin ------------------------- */
    if (pathname === '/admin' && method === 'GET') {
      if (!user) return needLogin();
      attempt('Admin Panel');
      if (cookieRole(req) !== 'admin') return send(res, 403, layout(req, 'Forbidden', '<p>Admins only.</p>'));
      if (user.siteRole !== 'admin') pass('cookie-role'); /* VULN: panel trusts the unsigned role cookie */
      return send(res, 200, layout(req, 'Admin Panel', `<div class="card"><h3>Users</h3>
      <table><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Action</th></tr>
      ${users.map(x => `<tr><td>${x.id}</td><td>${esc(x.name)}</td><td>${esc(x.email)}</td><td>${esc(x.siteRole)}</td>
      <td>${x.id === 1 ? '<span class="mut">protected</span>' : `<a href="/admin/users/${x.id}/delete">delete user</a>`}</td></tr>`).join('')}</table>
      <p class="mut">Deletion is a plain GET link — no confirmation, no token.</p></div>
      <div class="card"><h3>Comment moderation</h3>${comments.filter(c => !c.deleted).map(c => `<p>#${c.id} on file ${c.file}: ${c.body}</p>`).join('') || '<p class="mut">No comments.</p>'}</div>`));
    }
    if ((m = pathname.match(/^\/admin\/users\/(\d+)\/delete$/)) && method === 'GET') {
      if (!user) return needLogin();
      attempt('Admin Panel');
      if (cookieRole(req) !== 'admin') return send(res, 403, 'forbidden');
      const target = userById(Number(m[1]));
      if (target && target.id !== 1) {
        pass('admin-csrf'); /* VULN: destructive state change via GET, no token */
        const idx = users.indexOf(target); users.splice(idx, 1);
        members = members.filter(x => x.user !== target.id);
      }
      return redirect(res, '/admin');
    }

    /* ------------------------- API ------------------------- */
    if (pathname === '/api/progress' && method === 'GET') return sendJson(res, 200, progressSummary());
    if (pathname === '/api/users' && method === 'GET') {
      attempt('Platform & API');
      if (!user || user.siteRole !== 'admin') pass('api-exposure'); /* VULN: no authZ on a credential dump */
      return sendJson(res, 200, users.map(x => ({ id: x.id, email: x.email, password: x.password, name: x.name, siteRole: x.siteRole, apiToken: x.apiToken })));
    }
    if (pathname === '/api/files' && method === 'GET') {
      attempt('Platform & API');
      const token = String(u.searchParams.get('token') || '');
      const owner = users.find(x => x.apiToken === token);
      if (!owner) return sendJson(res, 401, { error: 'invalid token' });
      if (!user || user.id !== owner.id) pass('api-token-weak'); /* token is a public function of the user id */
      const list = files.filter(f => !f.deleted && memberOf(f.ws, owner.id)).map(f => ({ id: f.id, name: f.name, path: f.vpath, content: f.content }));
      return sendJson(res, 200, { owner: owner.email, files: list });
    }
    if (pathname === '/api/chat' && method === 'POST') {
      const raw = await readBody(req); let body = {}; try { body = JSON.parse(raw); } catch(e){ body = parseForm(raw); }
      return sendJson(res, 200, { reply: chatReply(body.message) });
    }

    /* ------------------------- lab system pages ------------------------- */
    if (pathname === '/tests' && method === 'GET') return send(res, 200, testsPage(req));
    if (pathname === '/complete' && method === 'GET') return send(res, 200, completePage(req));
    if (pathname === '/complete' && method === 'POST') {
      if (!progressSummary().complete) return redirect(res, '/complete');
      const b = parseForm(await readBody(req));
      progress.testerName = String(b.name || '').slice(0, 60); saveProgress();
      return redirect(res, '/complete');
    }
    if (pathname === '/certificate' && method === 'GET') {
      if (!progressSummary().complete) return redirect(res, '/complete');
      return send(res, 200, certificatePage(req));
    }

    return send(res, 404, layout(req, 'Not found', '<p>Page not found.</p>'));
  } catch (err) {
    try { send(res, 500, 'Internal error'); } catch(e) {}
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`HexaWorkspace (LAB ${LAB_NUMBER}) running at http://127.0.0.1:${PORT}  (LOCAL ONLY — deliberately vulnerable lab)`);
  console.log('Test accounts: admin@hexaworkspace.local/Admin@123, olivia@acme.test/Owner@123, emma@acme.test/Editor@123, victor@acme.test/Viewer@123, oscar@globex.test/Oscar@123, guest@hexaworkspace.local/guest123');
});
