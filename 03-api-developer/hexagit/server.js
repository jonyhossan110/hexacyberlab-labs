'use strict';
/*
 * HexaGit — LAB 25 (Category 3: API & Developer Platforms)
 * A deliberately vulnerable code-hosting platform for authorised, local-only
 * security training. Zero-dependency Node.js. Binds 127.0.0.1:3034 only.
 * WARNING: intentionally insecure. Never deploy publicly.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB_NUMBER = 25;
const LAB_NAME = 'HexaGit';
const PORT = 3034;
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');

/* ------------------------------------------------------------------ *
 * Key material — embedded ONLY as encoded shards (base64 of reversed
 * pieces), scattered across this file. Assembled at runtime only.
 * ------------------------------------------------------------------ */
const _eS = ['TC1YSA==', 'Qy01Mg==', 'VDNCMw==', 'LTZMRg==', 'STNJSQ==', 'Vkg1Qg=='];
function _revB64(s){ return Buffer.from(s, 'base64').toString('utf8').split('').reverse().join(''); }
function assembleKey(shards){ return shards.map(_revB64).join(''); }

/* ------------------------- Seed data ------------------------------ */
function seed(){
  const users = [
    { id:1, username:'admin',  password:'Admin@2024', role:'admin', name:'Ada Admin',   email:'admin@hexagit.local' },
    { id:2, username:'alice',  password:'alice123',   role:'user',  name:'Alice Chen',  email:'alice@hexagit.local' },
    { id:3, username:'bob',    password:'bob123',     role:'user',  name:'Bob Rivera',  email:'bob@hexagit.local' },
    { id:4, username:'carol',  password:'carol123',   role:'user',  name:'Carol Danvers', email:'carol@hexagit.local' },
    { id:5, username:'deploy', password:'deploy',     role:'user',  name:'Deploy Bot (service account)', email:'deploy@hexagit.local' },
    { id:6, username:'victor', password:'victor123',  role:'user',  name:'Victor Vale', email:'victor@hexagit.local' },
  ];
  const repos = [
    { id:101, name:'web-storefront', owner:'alice', visibility:'public',  description:'Storefront front-end for the HexaShop demo brand.', branches:['main','dev'], stars:14 },
    { id:102, name:'payment-core',   owner:'alice', visibility:'private', description:'Payment processing core. CONFIDENTIAL — internal only.', branches:['main'], stars:2 },
    { id:103, name:'ml-toolkit',     owner:'bob',   visibility:'public',  description:'Small ML utilities and notebooks.', branches:['main','experiments'], stars:31 },
    { id:104, name:'secret-roadmap', owner:'bob',   visibility:'private', description:'Unannounced product roadmap. Do not share.', branches:['main'], stars:0 },
  ];
  const files = [
    { id:1001, repoId:101, branch:'main', name:'README.md',    content:'# web-storefront\nStorefront front-end.' },
    { id:1002, repoId:101, branch:'main', name:'app.js',       content:'// storefront entry\nconsole.log("storefront");' },
    { id:1003, repoId:101, branch:'dev',  name:'app.js',       content:'// dev build\nconsole.log("dev storefront");' },
    { id:1004, repoId:102, branch:'main', name:'charge.js',    content:'// payment core charging logic' },
    { id:1005, repoId:102, branch:'main', name:'config.js',    content:'module.exports = { gatewayKey: "INTERNAL-ONLY-DO-NOT-LEAK", env: "prod" };' },
    { id:1006, repoId:103, branch:'main', name:'train.py',     content:'# model training script' },
    { id:1007, repoId:104, branch:'main', name:'roadmap.md',   content:'# Secret roadmap\nQ3: launch stealth product.' },
  ];
  // collaborators: repoId -> { username: 'read'|'write'|'admin' }
  const collaborators = {
    101: { bob:'write', carol:'read' },
    102: { bob:'read' },
    103: {},
    104: {},
  };
  const prs = [
    { id:1, repoId:101, number:1, author:'bob',   title:'Add checkout banner',  status:'open', approvals:[], branch:'dev' },
    { id:2, repoId:101, number:2, author:'carol', title:'Fix footer typo',      status:'open', approvals:[], branch:'dev' },
    { id:3, repoId:102, number:1, author:'alice', title:'Rotate gateway keys',  status:'open', approvals:[], branch:'main' },
  ];
  const issues = [
    { id:1, repoId:101, author:'carol', title:'Cart total rounds down', body:'The cart total is off by one cent on some orders.', status:'open' },
    { id:2, repoId:102, author:'alice', title:'Gateway timeouts in prod', body:'Seeing intermittent timeouts from the payment gateway.', status:'open' },
  ];
  const invites = [
    { token:'inv-ml-7f3a', repoId:103, invitee:'carol', role:'write', used:false },
  ];
  const tokens = [
    { token:'hxgit_alice_readonly_51c2', user:'alice', scopes:['read'] },
    { token:'hxgit_bob_full_99d0',       user:'bob',   scopes:['read','write'] },
  ];
  return { users, repos, files, collaborators, prs, issues, invites, tokens, nextUserId:7, nextRepoId:105, nextFileId:1008, nextPrId:4, nextIssueId:3 };
}
let DB = seed();
const sessions = new Map();       // sid -> { user, enumExists, enumMissing }
const issuedResetTokens = new Set();
const loginFails = new Map();     // sid|username -> count

const APP_CONFIG = 'HEXAGIT INTERNAL CONFIG\n========================\ninternalApiSecret: "INTERNAL-ONLY-DO-NOT-LEAK"\ndatabase: gitdb.internal:5432\nmode: production';

/* ------------------------- TESTS registry ------------------------- */
const F = {
  AUTH:'Login & Authentication', REG:'Registration & Profile', REPO:'Repositories',
  BR:'Branches & Files', PR:'Pull Requests', ISS:'Issues', COL:'Collaborators & Invites',
  TOK:'Tokens & API', SEA:'Search', ADM:'Admin Panel'
};
const TESTS = [
 /* ---- Login & Authentication ---- */
 { id:'sqli-login', feature:F.AUTH, name:'SQL injection login bypass (legacy auth path)', owasp:'A03:2021 Injection', difficulty:'Beginner',
   hints:['The login form still talks to a legacy string-built query path — it trusts what you type in the username box.','Try a username that makes the WHERE clause always true.','Classic: admin\' OR \'1\'=\'1 as the username, any password.'],
   lesson:'String-built queries let an attacker rewrite the login logic itself and walk in as the first account in the table — usually the admin.',
   impact:'On a real client this is a full account takeover of the most powerful account, with no password needed.',
   report:{ title:'SQL Injection in Login Form Allows Authentication Bypass', severity:'Critical', remediation:'Use parameterised queries everywhere; never build SQL by string concatenation.' } },
 { id:'brute-force', feature:F.AUTH, name:'Brute force — no rate limit or lockout on login', owasp:'A07:2021 Identification and Authentication Failures', difficulty:'Beginner',
   hints:['Pick one account and just keep guessing wrong passwords.','Count how many failures the app happily processes — 5? 10? more?','Submit 10 wrong passwords for alice from one session; nothing slows you down.'],
   lesson:'Without throttling or lockout, an attacker can try unlimited passwords against any account until one works.',
   impact:'Weak client passwords fall quickly to automated guessing; the client only finds out after the account is abused.',
   report:{ title:'Missing Rate Limiting on Authentication Endpoint', severity:'High', remediation:'Add progressive delays, lockout and alerting after repeated failed logins.' } },
 { id:'user-enumeration', feature:F.AUTH, name:'User enumeration via password-reset responses', owasp:'A07:2021 Identification and Authentication Failures', difficulty:'Beginner',
   hints:['The forgot-password page answers differently depending on whether the account exists.','Try one real username (alice) and one invented one.','Compare the two responses word for word — one confirms the account is real.'],
   lesson:'Different responses for real vs fake usernames hand attackers a verified target list for password attacks.',
   impact:'Attackers confirm which employee accounts exist, then focus phishing and password spraying exactly there.',
   report:{ title:'Username Enumeration via Password Reset', severity:'Medium', remediation:'Return one identical, generic response whether or not the account exists.' } },
 { id:'default-creds', feature:F.AUTH, name:'Default credentials on the deploy service account', owasp:'A07:2021 Identification and Authentication Failures', difficulty:'Beginner',
   hints:['One account on this platform is a service account that shipped with its factory password.','Its username and password are the same word.','Try deploy / deploy.'],
   lesson:'Vendor and service accounts with default passwords are one of the oldest, most reliable ways into a system.',
   impact:'A forgotten service account gives attackers a quiet, legitimate-looking login that bypasses most monitoring.',
   report:{ title:'Default Credentials on Service Account', severity:'High', remediation:'Force a unique strong password at first use; inventory and rotate all service accounts.' } },
 { id:'reset-token-predict', feature:F.AUTH, name:'Predictable password-reset token', owasp:'A07:2021 Identification and Authentication Failures', difficulty:'Intermediate',
   hints:['Request a reset for your own account and study the token format.','The token is built only from things an attacker knows: the user id and the current minute.','Format: HXGRST-<userId>-<unix minutes>. Compute one for alice (id 2) without asking the app.'],
   lesson:'Reset tokens must be unguessable random values; anything derived from public data can be forged for any victim.',
   impact:'An attacker resets the password of any client account — including admins — without ever seeing an email.',
   report:{ title:'Predictable Password Reset Token', severity:'High', remediation:'Generate reset tokens with a CSPRNG, store only a hash, expire them quickly, single use.' } },
 { id:'cookie-role-tamper', feature:F.AUTH, name:'Session/cookie role tampering opens the admin panel', owasp:'A01:2021 Broken Access Control', difficulty:'Intermediate',
   hints:['After login, look at every cookie the app sets — one of them repeats your role.','The admin gate trusts that cookie instead of the server-side account.','Set hx_role=admin in your browser, keep your normal session, then visit /admin.'],
   lesson:'Authorization data must live server-side; anything stored in a cookie can be edited by the client.',
   impact:'Any ordinary user becomes an admin — full control of the client platform with a one-word cookie edit.',
   report:{ title:'Client-Side Role Cookie Trusted for Authorization', severity:'Critical', remediation:'Determine roles from the server-side session record only; ignore role claims from cookies.' } },
 /* ---- Registration & Profile ---- */
 { id:'weak-password', feature:F.REG, name:'Weak password policy — 1-character passwords accepted', owasp:'A07:2021 Identification and Authentication Failures', difficulty:'Beginner',
   hints:['Register a new account and see how short a password you can get away with.','There is effectively no minimum length or complexity check.','A single character is accepted.'],
   lesson:'A password policy that accepts anything guarantees some accounts will have guessable passwords.',
   impact:'Client users pick trivial passwords; one guessed account can expose private repositories and code.',
   report:{ title:'No Minimum Password Strength Enforced', severity:'Medium', remediation:'Enforce a minimum length (12+) and block known-breached passwords at registration.' } },
 { id:'mass-assignment', feature:F.REG, name:'Mass assignment — role field accepted at registration', owasp:'A01:2021 Broken Access Control', difficulty:'Intermediate',
   hints:['The registration handler binds the whole request body to the new user object.','Add a field the form never shows you: role.','POST /register with role=admin alongside the normal fields.'],
   lesson:'Binding request data straight onto privileged objects lets attackers set fields the UI never offered them.',
   impact:'Attackers mint their own admin accounts on the client platform — no exploit chain needed, just one extra field.',
   report:{ title:'Mass Assignment Allows Admin Role at Registration', severity:'Critical', remediation:'Whitelist assignable fields server-side; never accept role/privilege fields from the client.' } },
 { id:'stored-xss-profile', feature:F.REG, name:'Stored XSS in profile display name', owasp:'A03:2021 Injection', difficulty:'Beginner',
   hints:['Your display name is shown on your public profile page and next to your work.','It is rendered without escaping.','Set your display name to <script>alert(1)</script> and view your profile.'],
   lesson:'Any user-controlled text rendered unescaped becomes JavaScript running in other users\' browsers.',
   impact:'Attackers hijack the sessions of anyone who views the poisoned profile — including client admins.',
   report:{ title:'Stored Cross-Site Scripting in Display Name', severity:'High', remediation:'Escape all user content on output and add a Content-Security-Policy.' } },
 { id:'profile-csrf', feature:F.REG, name:'CSRF on profile update (no token, no origin check)', owasp:'A01:2021 Broken Access Control', difficulty:'Intermediate',
   hints:['Profile updates are a plain POST with no anti-CSRF token.','The app sets an hx_origin marker cookie on its own pages — but never checks it.','Submit the profile form from a context without the hx_origin cookie (e.g. curl with only your session cookie).'],
   lesson:'State-changing forms without CSRF tokens can be submitted by any website the victim visits while logged in.',
   impact:'A malicious page silently rewrites a client user\'s profile — a stepping stone to account takeover via email change.',
   report:{ title:'Cross-Site Request Forgery on Profile Update', severity:'Medium', remediation:'Require a per-session CSRF token (or strict origin checks) on every state-changing request.' } },
 /* ---- Repositories ---- */
 { id:'private-repo-idor', feature:F.REPO, name:'Private repository readable by any logged-in user (IDOR)', owasp:'A01:2021 Broken Access Control', difficulty:'Beginner',
   hints:['Repository ids are small sequential numbers — and private repos are just ids too.','Log in as victor, who owns nothing and collaborates on nothing.','Open /repo/102 directly. Nobody checks that it is private.'],
   lesson:'Hiding a link is not access control; every object read must verify the requester is allowed to see it.',
   impact:'On a real client, private source code — their core IP — is readable by anyone who creates a free account.',
   report:{ title:'Broken Access Control: Private Repositories Exposed by ID', severity:'Critical', remediation:'Check ownership/collaborator rights on every repository read, regardless of how the id was obtained.' } },
 { id:'repo-settings-tamper', feature:F.REPO, name:'Repository settings changed by a non-owner', owasp:'A01:2021 Broken Access Control', difficulty:'Intermediate',
   hints:['The settings endpoint checks that you are logged in — not that the repo is yours.','Pick a repo you do not own, e.g. alice\'s web-storefront (101).','POST a new visibility to /repo/101/settings as bob.'],
   lesson:'Every privileged action needs an ownership/role check on the server, not just an authenticated session.',
   impact:'A stranger can flip a private client repo to public, or lock the owner out of their own project settings.',
   report:{ title:'Missing Ownership Check on Repository Settings', severity:'High', remediation:'Authorize settings changes to the repository owner (or repo admins) only.' } },
 { id:'stored-xss-repo', feature:F.REPO, name:'Stored XSS in repository description', owasp:'A03:2021 Injection', difficulty:'Beginner',
   hints:['Repository descriptions are rendered raw on the explore page and repo home.','Create or edit a repo you own and put markup in the description.','Use <script>alert(1)</script> in the description and view the repo.'],
   lesson:'Descriptions, READMEs and comments are code-adjacent content — rendering them raw executes attacker scripts for every visitor.',
   impact:'One poisoned repo description attacks every developer who browses it, spreading through a client\'s whole team.',
   report:{ title:'Stored Cross-Site Scripting in Repository Description', severity:'High', remediation:'Escape descriptions on output; sanitise any allowed markup with a proven library.' } },
 { id:'repo-transfer-hijack', feature:F.REPO, name:'Repository transfer executed by a non-owner (transfer hijack)', owasp:'A01:2021 Broken Access Control', difficulty:'Intermediate',
   hints:['Transferring a repo should be the owner\'s most guarded action. Here it is a plain POST anyone logged in can call.','As bob, target alice\'s repo 101.','POST /repo/101/transfer with newOwner=bob — the repo changes hands.'],
   lesson:'Ownership-transfer flows need the strictest authorization and confirmation; a missing check hands the asset to whoever asks.',
   impact:'An attacker steals a client\'s repository outright — code, history and collaborators all move to the attacker.',
   report:{ title:'Repository Ownership Transfer Without Authorization', severity:'Critical', remediation:'Restrict transfers to the current owner, require re-authentication and notify both parties.' } },
 /* ---- Branches & Files ---- */
 { id:'path-traversal', feature:F.BR, name:'Path traversal in raw file view exposes server config', owasp:'A01:2021 Broken Access Control', difficulty:'Intermediate',
   hints:['The raw file endpoint takes a path parameter and serves whatever it resolves to.','Try walking up out of the repository with ../','GET /repo/101/raw?path=../../app-config reads the server\'s internal config.'],
   lesson:'File paths from users must be normalised and confined to an allowed directory; otherwise the whole filesystem is in scope.',
   impact:'Server configuration and secrets leak — the keys an attacker needs to pivot into the client\'s infrastructure.',
   report:{ title:'Path Traversal in File Download Exposes Server Files', severity:'High', remediation:'Resolve paths against a fixed base directory and reject anything escaping it.' } },
 { id:'protected-branch-push', feature:F.BR, name:'Direct push to protected main branch by a non-owner', owasp:'A01:2021 Broken Access Control', difficulty:'Intermediate',
   hints:['The main branch is labelled "protected" — but the push endpoint never enforces it.','Try pushing as bob (a collaborator, not the owner).','POST /repo/101/push with branch=main.'],
   lesson:'Branch protection that exists only as a label does nothing; enforcement must happen on the write path itself.',
   impact:'Unreviewed code lands directly in the client\'s production branch — the classic supply-chain nightmare.',
   report:{ title:'Protected Branch Accepts Direct Pushes from Non-Owners', severity:'High', remediation:'Enforce branch protection server-side: only owners/admins or approved PR merges may write to main.' } },
];
TESTS.push(
 /* ---- Pull Requests ---- */
 { id:'pr-self-approve', feature:F.PR, name:'Author can approve their own pull request (self-approval)', owasp:'A01:2021 Broken Access Control', difficulty:'Beginner',
   hints:['PR #1 on web-storefront was opened by bob. Reviews are meant to be independent.','The approve endpoint never asks whether you wrote the PR.','Log in as bob and approve PR 1 — your own approval counts.'],
   lesson:'Review gates only work if the reviewer is independent of the author; self-approval makes the gate theatre.',
   impact:'A malicious or careless change reviews itself into the client codebase with a perfect audit trail.',
   report:{ title:'Pull Request Self-Approval Permitted', severity:'Medium', remediation:'Reject approvals where approver == author; require at least one independent approver.' } },
 { id:'pr-merge-no-approval', feature:F.PR, name:'Pull request merged with zero approvals', owasp:'A01:2021 Broken Access Control', difficulty:'Beginner',
   hints:['PR #2 on web-storefront has no approvals at all.','The merge endpoint checks the PR exists — nothing else.','POST /pr/2/merge and it lands in main unreviewed.'],
   lesson:'Merge buttons must verify the review policy (approvals, checks) on the server at merge time.',
   impact:'Any contributor can ship unreviewed code to the client\'s main branch — review process fully bypassed.',
   report:{ title:'Pull Request Merge Without Required Approvals', severity:'High', remediation:'Verify approval count and merger permissions server-side before merging.' } },
 /* ---- Issues ---- */
 { id:'stored-xss-issue', feature:F.ISS, name:'Stored XSS in issue title/body', owasp:'A03:2021 Injection', difficulty:'Beginner',
   hints:['Issue text is rendered raw on the issue page.','Open an issue on a repo you can access and put markup in the title.','<script>alert(1)</script> as an issue title fires for every viewer.'],
   lesson:'Issue trackers are high-traffic internal pages — stored XSS there reaches maintainers and admins fast.',
   impact:'Attackers target the client\'s maintainers through the tracker itself, stealing sessions from the people with most access.',
   report:{ title:'Stored Cross-Site Scripting in Issue Tracker', severity:'High', remediation:'Escape issue content on output; adopt a strict Content-Security-Policy.' } },
 { id:'issue-delete-idor', feature:F.ISS, name:'Delete another user\'s issue (IDOR on issue actions)', owasp:'A01:2021 Broken Access Control', difficulty:'Intermediate',
   hints:['The delete-issue endpoint trusts the id in the URL and nothing else.','Issue 1 on web-storefront belongs to carol.','As bob, POST /issue/1/delete — it disappears.'],
   lesson:'Destructive actions on objects need the same ownership checks as reads — often they get none.',
   impact:'Attackers quietly erase the client\'s bug reports and audit trail, hiding defects or sabotaging the team.',
   report:{ title:'Missing Authorization on Issue Deletion', severity:'Medium', remediation:'Only the issue author, repo owner or moderators may delete an issue; log deletions.' } },
 /* ---- Collaborators & Invites ---- */
 { id:'collab-priv-esc', feature:F.COL, name:'Read-only collaborator promotes themselves to repo admin', owasp:'A01:2021 Broken Access Control', difficulty:'Intermediate',
   hints:['carol has read-only access to web-storefront — the lowest rung.','The collaborator-management endpoint never checks the CALLER\'s role.','As carol, POST /repo/101/collaborators setting carol to admin.'],
   lesson:'Privilege-management endpoints must verify the caller\'s privilege, not just that a session exists.',
   impact:'The least-trusted insider becomes repo admin: can read everything, change settings, and disrupt the real owner\'s team.',
   report:{ title:'Collaborator Privilege Escalation (Read → Admin)', severity:'Critical', remediation:'Only repo owners/admins may change collaborator roles; verify the caller role server-side.' } },
 { id:'invite-wrong-user', feature:F.COL, name:'Repository invite accepted by the wrong user', owasp:'A01:2021 Broken Access Control', difficulty:'Intermediate',
   hints:['There is a pending invite to ml-toolkit addressed to carol, token inv-ml-7f3a (visible on the invites page).','Accepting it never checks that YOU are carol.','Log in as victor and POST /invite/accept with that token — you get carol\'s access.'],
   lesson:'Invite tokens must be bound to the invited identity and verified at acceptance.',
   impact:'A leaked or guessed invite link hands repository access to whoever finds it — outside the client\'s control.',
   report:{ title:'Invitation Acceptance Not Bound to Invitee', severity:'High', remediation:'Bind invites to the invitee account/email and require that identity at acceptance.' } },
 /* ---- Tokens & API ---- */
 { id:'token-scope-abuse', feature:F.TOK, name:'Read-only API token performs writes (scope not enforced)', owasp:'A01:2021 Broken Access Control', difficulty:'Intermediate',
   hints:['alice\'s API token is labelled read-only (see the Tokens page).','The API write endpoint authenticates the token but never checks its scopes.','POST /api/repo/103/file with alice\'s read-only token — the file is created.'],
   lesson:'Token scopes are a security boundary only if every endpoint enforces them on every request.',
   impact:'A leaked read-only token (the kind pasted into CI logs) becomes full write access to the client\'s code.',
   report:{ title:'API Token Scope Not Enforced on Write Endpoints', severity:'High', remediation:'Check required scopes per endpoint server-side; deny by default.' } },
 { id:'weak-api-token', feature:F.TOK, name:'API token derivable from the username (predictable token)', owasp:'A02:2021 Cryptographic Failures', difficulty:'Advanced',
   hints:['Besides issued tokens, the API quietly accepts a fallback token format.','It is just a prefix plus the base64 of the username.','Call GET /api/me with Authorization: Bearer hxgit_<base64 of "bob"> — you are bob, no token was ever issued to you.'],
   lesson:'Authentication secrets must be high-entropy and server-issued; anything derivable from public data is not a secret.',
   impact:'Anyone who knows a username — public information — owns that account\'s full API access on the client platform.',
   report:{ title:'Predictable API Token Derived from Username', severity:'Critical', remediation:'Issue only random, high-entropy tokens; store hashes; remove all fallback/derived token paths.' } },
 /* ---- Search ---- */
 { id:'search-sqli', feature:F.SEA, name:'SQL injection in repository search leaks private repos', owasp:'A03:2021 Injection', difficulty:'Intermediate',
   hints:['Search builds its query by gluing your text into a WHERE clause over all repos, filtering later.','A classic always-true condition makes the filter meaningless.','Search for \' OR \'1\'=\'1 and watch private repositories appear in the results.'],
   lesson:'Filtering results after an injectable query is not protection — the injection decides what comes back.',
   impact:'The existence, names and descriptions of a client\'s private projects leak to any user with a search box.',
   report:{ title:'SQL Injection in Search Exposes Private Repositories', severity:'High', remediation:'Parameterise the search query and enforce visibility in the query itself.' } },
 /* ---- Admin Panel ---- */
 { id:'admin-action-csrf', feature:F.ADM, name:'Admin user-deletion performed by a simple GET (CSRF)', owasp:'A01:2021 Broken Access Control', difficulty:'Intermediate',
   hints:['Deleting a user is a state-changing, destructive admin action.','Here it is a plain GET link with no token and no confirmation.','As admin, GET /admin/delete-user?id=6 — the account is gone. (An attacker page could fire that URL in an admin\'s browser.)'],
   lesson:'State changes must never ride on GET; destructive admin actions need POST + CSRF token + confirmation.',
   impact:'One malicious link visited by an admin deletes client accounts — data loss triggered by a single click.',
   report:{ title:'State-Changing Admin Action via GET (CSRF)', severity:'High', remediation:'Make deletions POST-only with CSRF tokens, confirmation and audit logging.' } },
);
const TEST_BY_ID = Object.fromEntries(TESTS.map(t => [t.id, t]));
const FEATURES = [...new Set(TESTS.map(t => t.feature))];

/* --------------------- Progress engine ---------------------------- */
let progress = { unlocked:false, testerName:'', tests:{}, attempts:{}, completedAt:null, keyRevealed:false };
function loadProgress(){
  try { const raw = fs.readFileSync(PROGRESS_FILE, 'utf8'); const p = JSON.parse(raw); if (p && typeof p === 'object') progress = Object.assign(progress, p); } catch(e) { /* fresh */ }
  for (const f of FEATURES) if (typeof progress.attempts[f] !== 'number') progress.attempts[f] = 0;
}
function saveProgress(){ try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2)); } catch(e) {} }
function doneCount(){ return TESTS.filter(t => progress.tests[t.id]).length; }
function isComplete(){ return doneCount() === TESTS.length; }
function pass(id){
  if (!TEST_BY_ID[id] || progress.tests[id]) return;
  progress.tests[id] = true;
  if (isComplete()) { progress.completedAt = new Date().toISOString(); progress.keyRevealed = true; }
  saveProgress();
}
function attempt(feature){ if (feature in progress.attempts) { progress.attempts[feature]++; saveProgress(); } }
loadProgress();

/* ------------------------- HTTP helpers --------------------------- */
function parseCookies(req){ const out = {}; const h = req.headers.cookie || ''; for (const part of h.split(';')) { const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); } return out; }
function readBody(req){ return new Promise(resolve => { let d = ''; req.on('data', c => { d += c; if (d.length > 1e6) req.destroy(); }); req.on('end', () => resolve(d)); req.on('error', () => resolve('')); }); }
function parseBody(req, raw){
  const ct = (req.headers['content-type'] || '');
  if (ct.includes('application/json')) { try { return JSON.parse(raw || '{}'); } catch(e) { return {}; } }
  const out = {}; for (const pair of (raw || '').split('&')) { if (!pair) continue; const i = pair.indexOf('='); const k = decodeURIComponent((i < 0 ? pair : pair.slice(0, i)).replace(/\+/g, ' ')); const v = i < 0 ? '' : decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' ')); out[k] = v; }
  return out;
}
function esc(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
const XSS_RE = /(<script|<svg|<img[^>]*onerror|onerror\s*=|onload\s*=|<iframe|<details|<body|<video|<a\s[^>]*javascript:)/i;
function sendHtml(res, code, html, extraHeaders){
  const headers = Object.assign({ 'Content-Type':'text/html; charset=utf-8', 'Set-Cookie':'hx_origin=hexagit; Path=/; SameSite=Lax' }, extraHeaders || {});
  res.writeHead(code, headers); res.end(html);
}
function sendJson(res, code, obj){ res.writeHead(code, { 'Content-Type':'application/json' }); res.end(JSON.stringify(obj)); }
function redirect(res, to, extraHeaders){ res.writeHead(302, Object.assign({ Location: to }, extraHeaders || {})); res.end(); }

function getSession(req){
  const cookies = parseCookies(req);
  const sid = cookies.hx_session;
  if (sid && sessions.has(sid)) return { sid, data: sessions.get(sid), cookies };
  return { sid: null, data: null, cookies };
}
function currentUser(req, sess){
  if (!sess.data) return null;
  return DB.users.find(u => u.username === sess.data.user) || null;
}
function loginAs(req, res, user){
  const sid = crypto.randomBytes(12).toString('hex');
  sessions.set(sid, { user: user.username, enumExists:false, enumMissing:false });
  redirect(res, '/', { 'Set-Cookie': [ 'hx_session=' + sid + '; Path=/; HttpOnly', 'hx_role=' + user.role + '; Path=/', 'hx_origin=hexagit; Path=/; SameSite=Lax' ] });
}
function collabRole(repo, username){
  if (!repo || !username) return null;
  if (repo.owner === username) return 'owner';
  const c = DB.collaborators[repo.id] || {};
  return c[username] || null;
}

/* ------------------------- Page furniture ------------------------- */
function progressBarHtml(){
  const done = doneCount(), total = TESTS.length, pct = Math.floor(done * 100 / total);
  return '<div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:10px 14px;margin:12px 0">'
    + '<div style="font-size:13px;color:#c9d1d9">LAB ' + LAB_NUMBER + ' · ' + done + '/' + total + ' tests · ' + pct + '%</div>'
    + '<div style="background:#30363d;border-radius:6px;height:10px;margin-top:6px"><div style="background:#2f81f7;height:10px;border-radius:6px;width:' + pct + '%"></div></div></div>';
}
const CHAT_WIDGET = `
<div id="hxchat" style="position:fixed;right:16px;bottom:16px;width:320px;max-width:92vw;background:#0d1117;border:1px solid #30363d;border-radius:10px;color:#c9d1d9;font-family:monospace;z-index:9999;box-shadow:0 8px 30px rgba(0,0,0,.5)">
  <div style="padding:8px 12px;border-bottom:1px solid #30363d;font-weight:bold">Lab Coach — HexaGit</div>
  <div id="hxlog" style="height:180px;overflow:auto;padding:8px 12px;font-size:12px"></div>
  <div style="display:flex;border-top:1px solid #30363d">
    <input id="hxmsg" placeholder="Ask the Lab Coach…" style="flex:1;background:#161b22;border:0;color:#c9d1d9;padding:8px;font-family:monospace">
    <button onclick="hxSend()" style="background:#238636;color:#fff;border:0;padding:8px 14px;cursor:pointer">Send</button>
  </div>
</div>
<script>
async function hxSend(){ const i=document.getElementById('hxmsg'); const log=document.getElementById('hxlog'); const m=i.value.trim(); if(!m) return; i.value='';
  log.innerHTML += '<div><b>You:</b> '+m.replace(/</g,'&lt;')+'</div>';
  try { const r = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ message: m }) }); const j = await r.json();
    log.innerHTML += '<div style="margin:6px 0"><b>Coach:</b> '+String(j.reply).replace(/</g,'&lt;')+'</div>'; } catch(e){ log.innerHTML += '<div>Coach unavailable.</div>'; }
  log.scrollTop = log.scrollHeight; }
document.getElementById('hxmsg').addEventListener('keydown', e => { if (e.key === 'Enter') hxSend(); });
</script>`;
function layout(user, title, body){
  const nav = user
    ? '<span>' + user.name + ' (@' + esc(user.username) + ')</span> · <a href="/explore">Explore</a> · <a href="/search">Search</a> · <a href="/repos/new">New repo</a> · <a href="/invites">Invites</a> · <a href="/settings/tokens">Tokens</a> · <a href="/profile">Profile</a> · <a href="/admin">Admin</a> · <a href="/tests">Tests</a> · <a href="/logout">Log out</a>'
    : '<a href="/login">Log in</a> · <a href="/register">Register</a> · <a href="/tests">Tests</a>';
  return '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(title) + ' — HexaGit</title>'
    + '<style>body{background:#0d1117;color:#c9d1d9;font-family:monospace;margin:0 auto;max-width:980px;padding:16px}a{color:#58a6ff}input,select,textarea{background:#161b22;color:#c9d1d9;border:1px solid #30363d;border-radius:6px;padding:6px;margin:3px}button{background:#238636;color:#fff;border:0;border-radius:6px;padding:7px 14px;cursor:pointer}.card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px;margin:10px 0}code{background:#21262d;padding:1px 5px;border-radius:4px}.priv{color:#f85149}.pub{color:#3fb950}</style></head><body>'
    + '<header style="display:flex;align-items:center;gap:12px"><img src="/logo.png" alt="HexaCyberLab" style="height:38px">'
    + '<div><div style="font-size:19px;font-weight:bold">LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</div><div style="font-size:12px;color:#8b949e">Code hosting · HexaCyberLab training lab — local use only</div></div></header>'
    + progressBarHtml()
    + '<nav style="font-size:13px;margin:8px 0">' + nav + '</nav>'
    + body + CHAT_WIDGET + '</body></html>';
}
function gatePage(msg){
  return '<!doctype html><html><head><meta charset="utf-8"><title>Locked — LAB ' + LAB_NUMBER + '</title></head>'
    + '<body style="background:#0d1117;color:#c9d1d9;font-family:monospace;max-width:640px;margin:40px auto;padding:16px">'
    + '<img src="/logo.png" alt="HexaCyberLab" style="height:44px">'
    + '<h2>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' is locked</h2>'
    + '<p>This lab is locked. Paste the completion key from Lab ' + (LAB_NUMBER - 1) + ' to start.</p>'
    + (msg ? '<p style="color:#f85149">' + esc(msg) + '</p>' : '')
    + '<form method="POST" action="/unlock"><input name="key" placeholder="Completion key from Lab ' + (LAB_NUMBER - 1) + '" style="width:70%;background:#161b22;color:#c9d1d9;border:1px solid #30363d;border-radius:6px;padding:8px"> <button style="background:#238636;color:#fff;border:0;border-radius:6px;padding:8px 16px;cursor:pointer">Unlock</button></form>'
    + '<p style="font-size:12px;color:#8b949e">HexaCyberLab training labs — built by Md. Jony Hassain, Founder of HexaCyberLab.</p>'
    + '</body></html>';
}

/* --------------------------- Chatbot ------------------------------ */
const GUIDANCE = {
  [F.AUTH]: 'Step by step — Login & Authentication: (1) SQLi: log in with username admin\' OR \'1\'=\'1 and any password — the legacy query path lets you in as admin. (2) Brute force: send 10 wrong passwords for one account from one session; nothing locks. (3) Enumeration: POST /forgot with a real username (alice) then a fake one and compare the answers. (4) Default creds: deploy / deploy. (5) Reset token: tokens look like HXGRST-<userId>-<unix minutes>; forge one for alice (id 2) for the current minute and POST /reset. (6) Cookie tamper: log in normally, set the hx_role cookie to admin, then open /admin.',
  [F.REG]: 'Step by step — Registration & Profile: (1) Register with a 1-character password — it is accepted. (2) Register again including an extra role=admin field in the POST — mass assignment makes you admin. (3) Set your profile display name to <script>alert(1)</script> and view /user/<you>. (4) CSRF: submit POST /profile/update carrying ONLY your hx_session cookie (no hx_origin cookie) — the change still applies.',
  [F.REPO]: 'Step by step — Repositories: (1) IDOR: log in as victor and open /repo/102 (alice\'s private payment-core) directly. (2) Settings tamper: as bob, POST /repo/101/settings with a new visibility — you are not the owner. (3) Stored XSS: put <script>alert(1)</script> in a repo description you control. (4) Transfer hijack: as bob, POST /repo/101/transfer with newOwner=bob.',
  [F.BR]: 'Step by step — Branches & Files: (1) Path traversal: GET /repo/101/raw?path=../../app-config — the raw view escapes the repo and serves the server config. (2) Protected branch: as bob, POST /repo/101/push with branch=main and a filename — main is "protected" but nobody enforces it.',
  [F.PR]: 'Step by step — Pull Requests: (1) Self-approval: PR 1 on repo 101 is bob\'s — log in as bob and POST /pr/1/approve; your own approval counts. (2) Merge without approvals: PR 2 has zero approvals — POST /pr/2/merge and it lands anyway.',
  [F.ISS]: 'Step by step — Issues: (1) Stored XSS: open an issue with <script>alert(1)</script> in the title. (2) Delete IDOR: issue 1 belongs to carol — as bob, POST /issue/1/delete.',
  [F.COL]: 'Step by step — Collaborators & Invites: (1) Privilege escalation: carol is a READ collaborator on repo 101 — as carol, POST /repo/101/collaborators with username=carol, role=admin. (2) Wrong-user invite: the ml-toolkit invite token inv-ml-7f3a is addressed to carol — log in as victor and POST /invite/accept with it.',
  [F.TOK]: 'Step by step — Tokens & API: (1) Scope abuse: alice\'s token hxgit_alice_readonly_51c2 is read-only — use it in an Authorization: Bearer header on POST /api/repo/103/file with a JSON body {name, content}; the write succeeds. (2) Derivable token: GET /api/me with Authorization: Bearer hxgit_ + base64 of a username (e.g. bob) — no issued token needed.',
  [F.SEA]: 'Step by step — Search: put \' OR \'1\'=\'1 into the search box (GET /search?q=...) — the injectable query returns every repository, including the private ones.',
  [F.ADM]: 'Step by step — Admin Panel: log in as admin (or reach /admin via the cookie test) and simply GET /admin/delete-user?id=6 — a destructive admin action performed by a bare GET request, no token or confirmation.',
};
function chatReply(message){
  const m = String(message || '').toLowerCase();
  const total = TESTS.length, done = doneCount(), pct = Math.floor(done * 100 / total);
  if (/(who (built|made|created)|founder|your (creator|author)|hexacyberlab)/.test(m))
    return 'These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for "Who is Md. Jony Hassain", or ask ChatGPT.';
  if (/(completion key|next lab.*key|the key|unlock.*key)/.test(m)) {
    if (progress.keyRevealed && isComplete()) return 'You completed the lab — here is the completion key for the next lab: ' + assembleKey(_cS);
    return 'I do not have the completion key yet — it is only revealed to me when this lab reaches 100%. Right now you are at ' + pct + '% (' + done + '/' + total + '). Finish every test and I will share it.';
  }
  if (/(how many (features|tests|vulnerabilities)|features|what tests|list)/.test(m)) {
    const byF = FEATURES.map(f => f + ': ' + TESTS.filter(t => t.feature === f).length + ' tests (' + TESTS.filter(t => t.feature === f).map(t => t.name).join('; ') + ')').join(' | ');
    return 'This lab has ' + FEATURES.length + ' features and ' + total + ' tests. ' + byF;
  }
  for (const f of FEATURES) {
    const key = f.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
    if ((m.includes('how') || m.includes('help') || m.includes('guide') || m.includes('do i') || m.includes('test')) && (m.includes(key) || (f === F.AUTH && /login|auth|password|brute|sqli|reset|cookie/.test(m)) || (f === F.REPO && /repo|idor|private|transfer/.test(m)) || (f === F.TOK && /token|api/.test(m)) || (f === F.COL && /collaborator|invite/.test(m)) || (f === F.PR && /pull|merge|approve/.test(m)))) {
      const n = progress.attempts[f] || 0;
      const allPassed = TESTS.filter(t => t.feature === f).every(t => progress.tests[t.id]);
      if (n >= 3 || allPassed) return GUIDANCE[f];
      return 'That feature is locked for help. First try the ' + f + ' tests yourself at least 3 times — I can see you\'ve tried ' + n + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
    }
  }
  if (/(progress|status|score|percent|%)/.test(m)) return 'Your progress: ' + done + '/' + total + ' tests (' + pct + '%). See /tests for the full mission board.';
  const next = TESTS.find(t => !progress.tests[t.id]);
  return 'Hello! I am the Lab Coach for LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '. You are at ' + pct + '% (' + done + '/' + total + '). ' + (next ? 'Next open test: "' + next.name + '" (' + next.feature + '). ' : 'All tests complete — see /complete. ') + 'Ask me about a feature (I can name its tests freely), but step-by-step help unlocks only after you have tried that feature at least 3 times. Full map: /tests.';
}

/* --------------------------- Auth routes -------------------------- */
function loginPage(msg){
  return '<h2>Log in to HexaGit</h2>' + (msg ? '<p style="color:#f85149">' + esc(msg) + '</p>' : '')
    + '<form method="POST" action="/login"><input name="username" placeholder="Username"> <input name="password" type="password" placeholder="Password"> <button>Log in</button></form>'
    + '<p style="font-size:13px">Demo accounts: alice/alice123 · bob/bob123 · carol/carol123 · victor/victor123 · admin/Admin@2024</p>'
    + '<p style="font-size:13px"><a href="/forgot">Forgot password?</a> · <a href="/register">Create an account</a></p>';
}
async function routeLogin(req, res){
  const body = parseBody(req, await readBody(req));
  attempt(F.AUTH);
  const username = String(body.username || ''), password = String(body.password || '');
  const sess = getSession(req);
  // VULN: legacy string-built query path — injection in the username bypasses the password check.
  const query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'";
  if (/('\s*or\s*'?\d+'?\s*=\s*'?\d+)|('\s*or\s*'[^']*'\s*=\s*'[^']*')|(--\s*$)/i.test(username)) {
    const first = DB.users[0];
    if (first) { pass('sqli-login'); return loginAs(req, res, first); }
  }
  void query;
  const user = DB.users.find(u => u.username === username);
  if (!user || user.password !== password) {
    if (user) {
      const key = (sess.sid || 'anon') + '|' + username;
      const n = (loginFails.get(key) || 0) + 1; loginFails.set(key, n);
      if (n >= 10) pass('brute-force');
    }
    return sendHtml(res, 401, layout(null, 'Log in', loginPage('Invalid username or password.')));
  }
  if (user.username === 'deploy' && password === 'deploy') pass('default-creds');
  return loginAs(req, res, user);
}
function registerPage(msg){
  return '<h2>Create your HexaGit account</h2>' + (msg ? '<p style="color:#f85149">' + esc(msg) + '</p>' : '')
    + '<form method="POST" action="/register"><input name="username" placeholder="Username"> <input name="name" placeholder="Display name"> <input name="email" placeholder="Email"> <input name="password" type="password" placeholder="Password"> <button>Register</button></form>';
}
async function routeRegister(req, res){
  const body = parseBody(req, await readBody(req));
  attempt(F.REG);
  const username = String(body.username || '').trim();
  if (!username || DB.users.some(u => u.username === username)) return sendHtml(res, 400, layout(null, 'Register', registerPage('Username missing or already taken.')));
  const password = String(body.password || '');
  // VULN: no password policy at all.
  if (password.length >= 1 && password.length < 4) pass('weak-password');
  // VULN: mass assignment — the whole body is bound onto the new user record.
  const user = { id: DB.nextUserId++, username, password, role:'user', name: String(body.name || username), email: String(body.email || '') };
  if (body.role) { user.role = String(body.role); if (user.role === 'admin') pass('mass-assignment'); }
  if (XSS_RE.test(user.name)) pass('stored-xss-profile');
  DB.users.push(user);
  return loginAs(req, res, user);
}
function forgotPage(msg){
  return '<h2>Reset your password</h2>' + (msg ? '<p>' + esc(msg) + '</p>' : '')
    + '<form method="POST" action="/forgot"><input name="username" placeholder="Username"> <button>Send reset token</button></form>'
    + '<p style="font-size:13px">Already have a token? <a href="/reset">Use it here</a>.</p>';
}
async function routeForgot(req, res){
  const body = parseBody(req, await readBody(req));
  attempt(F.AUTH);
  const username = String(body.username || '');
  const user = DB.users.find(u => u.username === username);
  const sess = getSession(req);
  let sid = sess.sid, data = sess.data;
  if (!data) { sid = crypto.randomBytes(12).toString('hex'); data = { user: null, enumExists:false, enumMissing:false }; sessions.set(sid, data); }
  const cookieHdr = { 'Set-Cookie': 'hx_session=' + sid + '; Path=/; HttpOnly' };
  // VULN: different responses leak whether the account exists.
  if (user) {
    data.enumExists = true;
    const token = 'HXGRST-' + user.id + '-' + Math.floor(Date.now() / 60000);
    issuedResetTokens.add(token);
    if (data.enumExists && data.enumMissing) pass('user-enumeration');
    return sendHtml(res, 200, layout(null, 'Forgot', forgotPage('Reset token sent for ' + esc(username) + '. (Lab demo: your token is ' + token + ')')), cookieHdr);
  }
  data.enumMissing = true;
  if (data.enumExists && data.enumMissing) pass('user-enumeration');
  return sendHtml(res, 200, layout(null, 'Forgot', forgotPage('No account with that username exists.')), cookieHdr);
}
function resetPage(msg){
  return '<h2>Set a new password</h2>' + (msg ? '<p>' + esc(msg) + '</p>' : '')
    + '<form method="POST" action="/reset"><input name="username" placeholder="Username"> <input name="token" placeholder="Reset token"> <input name="password" type="password" placeholder="New password"> <button>Reset password</button></form>';
}
async function routeReset(req, res){
  const body = parseBody(req, await readBody(req));
  attempt(F.AUTH);
  const username = String(body.username || ''), token = String(body.token || ''), password = String(body.password || '');
  const user = DB.users.find(u => u.username === username);
  if (!user) return sendHtml(res, 400, layout(null, 'Reset', resetPage('Unknown user.')));
  // VULN: the expected token is computable from the user id + current minute.
  const expected = 'HXGRST-' + user.id + '-' + Math.floor(Date.now() / 60000);
  const expectedPrev = 'HXGRST-' + user.id + '-' + (Math.floor(Date.now() / 60000) - 1);
  if (token === expected || token === expectedPrev || issuedResetTokens.has(token)) {
    if (!issuedResetTokens.has(token)) pass('reset-token-predict');
    user.password = password || user.password;
    return sendHtml(res, 200, layout(null, 'Reset', resetPage('Password updated for ' + esc(username) + '. You can now log in.')));
  }
  return sendHtml(res, 400, layout(null, 'Reset', resetPage('Invalid or expired token.')));
}

/* --------------------------- App routes --------------------------- */
function repoCard(r){
  return '<div class="card"><a href="/repo/' + r.id + '"><b>' + esc(r.owner) + '/' + esc(r.name) + '</b></a> '
    + (r.visibility === 'private' ? '<span class="priv">private</span>' : '<span class="pub">public</span>')
    + ' · ★ ' + r.stars + '<br><span>' + r.description + '</span></div>'; // description intentionally rendered raw (stored-XSS surface)
}
function dashboardPage(user){
  const mine = DB.repos.filter(r => r.owner === user.username);
  const collab = DB.repos.filter(r => r.owner !== user.username && collabRole(r, user.username));
  return '<h2>Welcome, ' + user.name + '</h2><h3>Your repositories</h3>' + (mine.map(repoCard).join('') || '<p>None yet.</p>')
    + '<h3>Shared with you</h3>' + (collab.map(repoCard).join('') || '<p>None.</p>')
    + '<p><a href="/explore">Explore public repositories</a></p>';
}
function repoPage(user, r, msg){
  const role = user ? collabRole(r, user.username) : null;
  const branch = 'main';
  const files = DB.files.filter(f => f.repoId === r.id && f.branch === branch);
  const prs = DB.prs.filter(p => p.repoId === r.id);
  const issues = DB.issues.filter(i => i.repoId === r.id);
  const collabs = DB.collaborators[r.id] || {};
  return '<h2>' + esc(r.owner) + '/' + esc(r.name) + ' ' + (r.visibility === 'private' ? '<span class="priv">(private)</span>' : '<span class="pub">(public)</span>') + '</h2>'
    + (msg ? '<p>' + esc(msg) + '</p>' : '')
    + '<p>' + r.description + '</p>' // raw on purpose
    + '<p style="font-size:13px">Your access: ' + esc(role || 'none') + ' · Branches: ' + r.branches.map(b => b === 'main' ? '<b>main (protected)</b>' : esc(b)).join(', ') + '</p>'
    + '<h3>Files on main</h3>' + files.map(f => '<div class="card"><a href="/repo/' + r.id + '/raw?path=' + encodeURIComponent(f.name) + '">' + esc(f.name) + '</a></div>').join('')
    + '<h3>Push a file (simulated commit)</h3><form method="POST" action="/repo/' + r.id + '/push"><input name="branch" value="main"> <input name="filename" placeholder="filename"> <input name="content" placeholder="content"> <button>Push</button></form>'
    + '<h3>Pull requests</h3>' + (prs.map(p => '<div class="card"># ' + p.number + ' <a href="/pr/' + p.id + '">' + esc(p.title) + '</a> by ' + esc(p.author) + ' — ' + p.status + ' · approvals: ' + p.approvals.length + '</div>').join('') || '<p>None.</p>')
    + '<h3>Issues</h3>' + (issues.map(i => '<div class="card"><a href="/issue/' + i.id + '">' + i.title + '</a> by ' + esc(i.author) + ' — ' + i.status + '</div>').join('') || '<p>None.</p>')
    + '<h4>Open an issue</h4><form method="POST" action="/repo/' + r.id + '/issues"><input name="title" placeholder="Issue title"> <input name="body" placeholder="Details"> <button>Open issue</button></form>'
    + '<h3>Collaborators</h3>' + Object.entries(collabs).map(([u, ro]) => '<div>' + esc(u) + ' — ' + esc(ro) + '</div>').join('')
    + '<form method="POST" action="/repo/' + r.id + '/collaborators"><input name="username" placeholder="Username"> <select name="role"><option>read</option><option>write</option><option>admin</option></select> <button>Add / update collaborator</button></form>'
    + '<h3>Settings</h3><form method="POST" action="/repo/' + r.id + '/settings"><select name="visibility"><option>public</option><option>private</option></select> <button>Save settings</button></form>'
    + '<h3>Transfer ownership</h3><form method="POST" action="/repo/' + r.id + '/transfer"><input name="newOwner" placeholder="New owner username"> <button>Transfer</button></form>';
}

async function routeApp(req, res, url){
  const sess = getSession(req);
  const user = currentUser(req, sess);
  const p = url.pathname;

  if (p === '/') {
    if (!user) return sendHtml(res, 200, layout(null, 'Welcome', '<h2>HexaGit — code hosting for teams</h2><p>Host repositories, review pull requests, track issues and manage access tokens.</p>' + loginPage()));
    return sendHtml(res, 200, layout(user, 'Dashboard', dashboardPage(user)));
  }
  if (p === '/explore') {
    const pubs = DB.repos.filter(r => r.visibility === 'public');
    return sendHtml(res, 200, layout(user, 'Explore', '<h2>Explore public repositories</h2>' + pubs.map(repoCard).join('')));
  }
  if (p === '/search') {
    attempt(F.SEA);
    const q = String(url.searchParams.get('q') || '');
    let results;
    // VULN: injectable search — an always-true condition returns every repo, private included.
    if (/('\s*or\s*'?\d+'?\s*=\s*'?\d+)|('\s*or\s*'[^']*'\s*=\s*'[^']*')/i.test(q)) {
      results = DB.repos.slice();
      if (results.some(r => r.visibility === 'private')) pass('search-sqli');
    } else {
      results = DB.repos.filter(r => r.visibility === 'public' && (r.name.toLowerCase().includes(q.toLowerCase()) || String(r.description).toLowerCase().includes(q.toLowerCase())));
    }
    return sendHtml(res, 200, layout(user, 'Search', '<h2>Search repositories</h2><form method="GET" action="/search"><input name="q" value="' + esc(q) + '"> <button>Search</button></form>' + results.map(repoCard).join('')));
  }
  if (p === '/repos/new' && req.method === 'GET') {
    if (!user) return redirect(res, '/login');
    return sendHtml(res, 200, layout(user, 'New repo', '<h2>New repository</h2><form method="POST" action="/repos/new"><input name="name" placeholder="Repo name"> <input name="description" placeholder="Description"> <select name="visibility"><option>public</option><option>private</option></select> <button>Create</button></form>'));
  }
  if (p === '/repos/new' && req.method === 'POST') {
    if (!user) return redirect(res, '/login');
    const body = parseBody(req, await readBody(req)); attempt(F.REPO);
    const r = { id: DB.nextRepoId++, name: String(body.name || 'untitled'), owner: user.username, visibility: body.visibility === 'private' ? 'private' : 'public', description: String(body.description || ''), branches:['main'], stars: 0 };
    if (XSS_RE.test(r.description)) pass('stored-xss-repo');
    DB.repos.push(r); DB.collaborators[r.id] = {};
    return redirect(res, '/repo/' + r.id);
  }

  let m;
  if ((m = p.match(/^\/repo\/(\d+)$/)) && req.method === 'GET') {
    const r = DB.repos.find(x => x.id === Number(m[1]));
    if (!r) return sendHtml(res, 404, layout(user, 'Not found', '<h2>Repository not found</h2>'));
    if (!user) return redirect(res, '/login');
    attempt(F.REPO);
    // VULN: no visibility/ownership check — any logged-in user can open any repo by id.
    if (r.visibility === 'private' && !collabRole(r, user.username)) pass('private-repo-idor');
    return sendHtml(res, 200, layout(user, r.name, repoPage(user, r)));
  }
  if ((m = p.match(/^\/repo\/(\d+)\/raw$/)) && req.method === 'GET') {
    if (!user) return redirect(res, '/login');
    attempt(F.BR);
    const r = DB.repos.find(x => x.id === Number(m[1]));
    if (!r) return sendHtml(res, 404, layout(user, 'Not found', '<h2>Repository not found</h2>'));
    const rawPath = String(url.searchParams.get('path') || '');
    // VULN: path traversal — ../ escapes the repository and reads server files.
    if (rawPath.includes('..')) {
      if (rawPath.replace(/\\/g, '/').includes('app-config')) { pass('path-traversal'); res.writeHead(200, { 'Content-Type':'text/plain' }); return res.end(APP_CONFIG); }
      return sendHtml(res, 404, layout(user, 'Not found', '<h2>No such file</h2>'));
    }
    const f = DB.files.find(x => x.repoId === r.id && x.name === rawPath);
    if (!f) return sendHtml(res, 404, layout(user, 'Not found', '<h2>No such file on main</h2>'));
    res.writeHead(200, { 'Content-Type':'text/plain' }); return res.end(f.content);
  }
  if ((m = p.match(/^\/repo\/(\d+)\/push$/)) && req.method === 'POST') {
    if (!user) return redirect(res, '/login');
    const body = parseBody(req, await readBody(req)); attempt(F.BR);
    const r = DB.repos.find(x => x.id === Number(m[1]));
    if (!r) return sendHtml(res, 404, layout(user, 'Not found', '<h2>Repository not found</h2>'));
    const branch = String(body.branch || 'main');
    // VULN: "protected" main is not enforced — any logged-in user can push to it.
    if (branch === 'main' && r.owner !== user.username && user.role !== 'admin') pass('protected-branch-push');
    DB.files.push({ id: DB.nextFileId++, repoId: r.id, branch, name: String(body.filename || 'file.txt'), content: String(body.content || '') });
    return redirect(res, '/repo/' + r.id);
  }
  if ((m = p.match(/^\/repo\/(\d+)\/settings$/)) && req.method === 'POST') {
    if (!user) return redirect(res, '/login');
    const body = parseBody(req, await readBody(req)); attempt(F.REPO);
    const r = DB.repos.find(x => x.id === Number(m[1]));
    if (!r) return sendHtml(res, 404, layout(user, 'Not found', '<h2>Repository not found</h2>'));
    // VULN: no ownership check on settings.
    if (r.owner !== user.username) pass('repo-settings-tamper');
    if (body.visibility === 'public' || body.visibility === 'private') r.visibility = body.visibility;
    if (body.description !== undefined) { r.description = String(body.description); if (XSS_RE.test(r.description)) pass('stored-xss-repo'); }
    return redirect(res, '/repo/' + r.id);
  }
  if ((m = p.match(/^\/repo\/(\d+)\/transfer$/)) && req.method === 'POST') {
    if (!user) return redirect(res, '/login');
    const body = parseBody(req, await readBody(req)); attempt(F.REPO);
    const r = DB.repos.find(x => x.id === Number(m[1]));
    if (!r) return sendHtml(res, 404, layout(user, 'Not found', '<h2>Repository not found</h2>'));
    const newOwner = String(body.newOwner || '');
    if (!DB.users.some(u => u.username === newOwner)) return sendHtml(res, 400, layout(user, 'Transfer', '<h2>No such user</h2>'));
    // VULN: anyone logged in can transfer anyone's repo.
    if (r.owner !== user.username) pass('repo-transfer-hijack');
    r.owner = newOwner;
    return redirect(res, '/repo/' + r.id);
  }
  if ((m = p.match(/^\/repo\/(\d+)\/collaborators$/)) && req.method === 'POST') {
    if (!user) return redirect(res, '/login');
    const body = parseBody(req, await readBody(req)); attempt(F.COL);
    const r = DB.repos.find(x => x.id === Number(m[1]));
    if (!r) return sendHtml(res, 404, layout(user, 'Not found', '<h2>Repository not found</h2>'));
    const target = String(body.username || ''), role = ['read','write','admin'].includes(body.role) ? body.role : 'read';
    if (!DB.users.some(u => u.username === target)) return sendHtml(res, 400, layout(user, 'Collaborators', '<h2>No such user</h2>'));
    const callerRole = collabRole(r, user.username);
    // VULN: the caller's own role is never checked — a read collaborator can promote anyone.
    if (callerRole !== 'owner' && callerRole !== 'admin') pass('collab-priv-esc');
    DB.collaborators[r.id] = DB.collaborators[r.id] || {};
    DB.collaborators[r.id][target] = role;
    return redirect(res, '/repo/' + r.id);
  }
  if ((m = p.match(/^\/repo\/(\d+)\/issues$/)) && req.method === 'POST') {
    if (!user) return redirect(res, '/login');
    const body = parseBody(req, await readBody(req)); attempt(F.ISS);
    const r = DB.repos.find(x => x.id === Number(m[1]));
    if (!r) return sendHtml(res, 404, layout(user, 'Not found', '<h2>Repository not found</h2>'));
    const title = String(body.title || ''), ibody = String(body.body || '');
    if (XSS_RE.test(title) || XSS_RE.test(ibody)) pass('stored-xss-issue');
    const issue = { id: DB.nextIssueId++, repoId: r.id, author: user.username, title, body: ibody, status:'open' };
    DB.issues.push(issue);
    return redirect(res, '/issue/' + issue.id);
  }
  if ((m = p.match(/^\/issue\/(\d+)$/)) && req.method === 'GET') {
    if (!user) return redirect(res, '/login');
    const issue = DB.issues.find(i => i.id === Number(m[1]));
    if (!issue) return sendHtml(res, 404, layout(user, 'Not found', '<h2>Issue not found</h2>'));
    const r = DB.repos.find(x => x.id === issue.repoId);
    return sendHtml(res, 200, layout(user, 'Issue', '<h2>' + issue.title + '</h2><p>on ' + esc(r ? r.name : '?') + ' by ' + esc(issue.author) + ' — ' + issue.status + '</p><p>' + issue.body + '</p>'
      + '<form method="POST" action="/issue/' + issue.id + '/delete"><button>Delete issue</button></form>'));
  }
  if ((m = p.match(/^\/issue\/(\d+)\/delete$/)) && req.method === 'POST') {
    if (!user) return redirect(res, '/login');
    attempt(F.ISS);
    const idx = DB.issues.findIndex(i => i.id === Number(m[1]));
    if (idx < 0) return sendHtml(res, 404, layout(user, 'Not found', '<h2>Issue not found</h2>'));
    const issue = DB.issues[idx];
    const r = DB.repos.find(x => x.id === issue.repoId);
    // VULN: no ownership check on deletion.
    if (issue.author !== user.username && (!r || r.owner !== user.username)) pass('issue-delete-idor');
    DB.issues.splice(idx, 1);
    return redirect(res, r ? '/repo/' + r.id : '/');
  }
  if ((m = p.match(/^\/pr\/(\d+)$/)) && req.method === 'GET') {
    if (!user) return redirect(res, '/login');
    const pr = DB.prs.find(x => x.id === Number(m[1]));
    if (!pr) return sendHtml(res, 404, layout(user, 'Not found', '<h2>Pull request not found</h2>'));
    const r = DB.repos.find(x => x.id === pr.repoId);
    return sendHtml(res, 200, layout(user, 'Pull request', '<h2>#' + pr.number + ' ' + esc(pr.title) + '</h2><p>on ' + esc(r ? r.name : '?') + ' by ' + esc(pr.author) + ' — ' + pr.status + ' · approvals: ' + pr.approvals.join(', ') + ' (' + pr.approvals.length + ')</p><p>Policy: at least 1 approval from someone other than the author is required before merge.</p>'
      + '<form method="POST" action="/pr/' + pr.id + '/approve"><button>Approve</button></form>'
      + '<form method="POST" action="/pr/' + pr.id + '/merge"><button>Merge pull request</button></form>'));
  }
  if ((m = p.match(/^\/pr\/(\d+)\/approve$/)) && req.method === 'POST') {
    if (!user) return redirect(res, '/login');
    attempt(F.PR);
    const pr = DB.prs.find(x => x.id === Number(m[1]));
    if (!pr) return sendHtml(res, 404, layout(user, 'Not found', '<h2>Pull request not found</h2>'));
    // VULN: self-approval is accepted and counted.
    if (pr.author === user.username) pass('pr-self-approve');
    if (!pr.approvals.includes(user.username)) pr.approvals.push(user.username);
    return redirect(res, '/pr/' + pr.id);
  }
  if ((m = p.match(/^\/pr\/(\d+)\/merge$/)) && req.method === 'POST') {
    if (!user) return redirect(res, '/login');
    attempt(F.PR);
    const pr = DB.prs.find(x => x.id === Number(m[1]));
    if (!pr) return sendHtml(res, 404, layout(user, 'Not found', '<h2>Pull request not found</h2>'));
    // VULN: merge never verifies the approval policy.
    if (pr.approvals.length < 1 && pr.status === 'open') pass('pr-merge-no-approval');
    pr.status = 'merged';
    return redirect(res, '/pr/' + pr.id);
  }
  if (p === '/invites' && req.method === 'GET') {
    if (!user) return redirect(res, '/login');
    const list = DB.invites.filter(i => !i.used).map(i => { const r = DB.repos.find(x => x.id === i.repoId); return '<div class="card">Invite to <b>' + esc(r ? r.name : '?') + '</b> (role ' + esc(i.role) + ') addressed to <b>' + esc(i.invitee) + '</b> — token <code>' + esc(i.token) + '</code></div>'; }).join('');
    return sendHtml(res, 200, layout(user, 'Invites', '<h2>Pending invites</h2>' + (list || '<p>None.</p>') + '<form method="POST" action="/invite/accept"><input name="token" placeholder="Invite token"> <button>Accept invite</button></form>'));
  }
  if (p === '/invite/accept' && req.method === 'POST') {
    if (!user) return redirect(res, '/login');
    const body = parseBody(req, await readBody(req)); attempt(F.COL);
    const inv = DB.invites.find(i => i.token === String(body.token || '') && !i.used);
    if (!inv) return sendHtml(res, 400, layout(user, 'Invites', '<h2>Invalid or used invite token</h2>'));
    // VULN: acceptance is not bound to the invited user.
    if (inv.invitee !== user.username) pass('invite-wrong-user');
    DB.collaborators[inv.repoId] = DB.collaborators[inv.repoId] || {};
    DB.collaborators[inv.repoId][user.username] = inv.role;
    inv.used = true;
    return redirect(res, '/repo/' + inv.repoId);
  }
  if ((m = p.match(/^\/user\/([^/]+)$/)) && req.method === 'GET') {
    const target = DB.users.find(u => u.username === decodeURIComponent(m[1]));
    if (!target) return sendHtml(res, 404, layout(user, 'Not found', '<h2>No such user</h2>'));
    const their = DB.repos.filter(r => r.owner === target.username && r.visibility === 'public');
    // Display name rendered raw on purpose (stored-XSS surface).
    return sendHtml(res, 200, layout(user, target.username, '<h2>' + target.name + '</h2><p>@' + esc(target.username) + ' · role ' + esc(target.role) + '</p><h3>Public repositories</h3>' + their.map(repoCard).join('')));
  }
  if (p === '/profile' && req.method === 'GET') {
    if (!user) return redirect(res, '/login');
    return sendHtml(res, 200, layout(user, 'Profile', '<h2>Your profile</h2><form method="POST" action="/profile/update"><input name="name" value="' + esc(user.name) + '"> <input name="email" value="' + esc(user.email) + '"> <button>Save profile</button></form>'));
  }
  if (p === '/profile/update' && req.method === 'POST') {
    if (!user) return redirect(res, '/login');
    const body = parseBody(req, await readBody(req)); attempt(F.REG);
    // VULN: no CSRF token / origin validation — the hx_origin marker cookie is set but never checked.
    if (!sess.cookies.hx_origin) pass('profile-csrf');
    if (body.name !== undefined) { user.name = String(body.name); if (XSS_RE.test(user.name)) pass('stored-xss-profile'); }
    if (body.email !== undefined) user.email = String(body.email);
    return redirect(res, '/profile');
  }
  if (p === '/settings/tokens' && req.method === 'GET') {
    if (!user) return redirect(res, '/login');
    attempt(F.TOK);
    const mine = DB.tokens.filter(t => t.user === user.username);
    const all = user.role === 'admin' ? DB.tokens : mine;
    return sendHtml(res, 200, layout(user, 'Tokens', '<h2>API access tokens</h2>' + all.map(t => '<div class="card"><code>' + esc(t.token) + '</code> — owner ' + esc(t.user) + ' · scopes: ' + t.scopes.join(', ') + '</div>').join('')
      + '<p style="font-size:13px">Use a token as <code>Authorization: Bearer &lt;token&gt;</code>. Endpoints: <code>GET /api/me</code>, <code>POST /api/repo/:id/file</code> with JSON {"name","content"}.</p>'));
  }
  if (p === '/admin' && req.method === 'GET') {
    if (!user) return redirect(res, '/login');
    attempt(F.ADM);
    // VULN: the gate trusts the client-supplied hx_role cookie.
    const cookieAdmin = sess.cookies.hx_role === 'admin';
    if (user.role !== 'admin' && !cookieAdmin) return sendHtml(res, 403, layout(user, 'Admin', '<h2>Admins only</h2>'));
    if (user.role !== 'admin' && cookieAdmin) pass('cookie-role-tamper');
    return sendHtml(res, 200, layout(user, 'Admin', '<h2>Admin panel</h2><h3>Users</h3>' + DB.users.map(u => '<div class="card">' + esc(u.username) + ' — ' + esc(u.role) + ' — ' + esc(u.email) + ' · <a href="/admin/delete-user?id=' + u.id + '">Delete user</a></div>').join('')));
  }
  if (p === '/admin/delete-user' && req.method === 'GET') {
    if (!user) return redirect(res, '/login');
    attempt(F.ADM);
    const cookieAdmin = sess.cookies.hx_role === 'admin';
    if (user.role !== 'admin' && !cookieAdmin) return sendHtml(res, 403, layout(user, 'Admin', '<h2>Admins only</h2>'));
    const id = Number(url.searchParams.get('id'));
    const idx = DB.users.findIndex(u => u.id === id);
    if (idx >= 0) { DB.users.splice(idx, 1); pass('admin-action-csrf'); } // VULN: destructive state change via GET
    return redirect(res, '/admin');
  }
  return sendHtml(res, 404, layout(user, 'Not found', '<h2>404 — page not found</h2>'));
}

/* ------------------------------ API ------------------------------- */
function apiAuth(req){
  const h = req.headers.authorization || '';
  const tok = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!tok) return null;
  const issued = DB.tokens.find(t => t.token === tok);
  if (issued) return { user: issued.user, scopes: issued.scopes, derived: false };
  // VULN: fallback token derived from the username — hxgit_ + base64(username).
  if (tok.startsWith('hxgit_')) {
    try { const uname = Buffer.from(tok.slice(6), 'base64').toString('utf8'); const u = DB.users.find(x => x.username === uname); if (u) return { user: u.username, scopes: ['read', 'write'], derived: true }; } catch(e) {}
  }
  return null;
}
async function routeApi(req, res, url){
  const p = url.pathname;
  if (p === '/api/progress') {
    const features = {};
    for (const f of FEATURES) features[f] = { total: TESTS.filter(t => t.feature === f).length, done: TESTS.filter(t => t.feature === f && progress.tests[t.id]).length, attempts: progress.attempts[f] || 0 };
    const done = doneCount();
    return sendJson(res, 200, { lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done, pct: Math.floor(done * 100 / TESTS.length), features, complete: isComplete() });
  }
  if (p === '/api/chat' && req.method === 'POST') {
    let body = {}; try { body = JSON.parse((await readBody(req)) || '{}'); } catch(e) { body = {}; }
    return sendJson(res, 200, { reply: chatReply(body.message) });
  }
  if (p === '/api/me' && req.method === 'GET') {
    attempt(F.TOK);
    const auth = apiAuth(req);
    if (!auth) return sendJson(res, 401, { error: 'invalid token' });
    if (auth.derived) pass('weak-api-token');
    const u = DB.users.find(x => x.username === auth.user);
    return sendJson(res, 200, { username: auth.user, role: u ? u.role : 'user', scopes: auth.scopes });
  }
  const m = p.match(/^\/api\/repo\/(\d+)\/file$/);
  if (m && req.method === 'POST') {
    attempt(F.TOK);
    const auth = apiAuth(req);
    if (!auth) return sendJson(res, 401, { error: 'invalid token' });
    if (auth.derived) pass('weak-api-token');
    let body = {}; try { body = JSON.parse((await readBody(req)) || '{}'); } catch(e) { body = {}; }
    const r = DB.repos.find(x => x.id === Number(m[1]));
    if (!r) return sendJson(res, 404, { error: 'no such repo' });
    // VULN: token scopes are never checked — a read-only token can write.
    if (!auth.scopes.includes('write')) pass('token-scope-abuse');
    const f = { id: DB.nextFileId++, repoId: r.id, branch: 'main', name: String(body.name || 'api-file.txt'), content: String(body.content || '') };
    DB.files.push(f);
    return sendJson(res, 201, { created: f.name, repo: r.name });
  }
  return sendJson(res, 404, { error: 'not found' });
}

/* --------------------- Tests / complete / cert -------------------- */
function testsPage(user){
  let html = '<h2>Mission board — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h2><p>' + doneCount() + '/' + TESTS.length + ' complete. Hints reveal one at a time; the Lab Coach unlocks step-by-step help after 3 attempts on a feature.</p>';
  for (const f of FEATURES) {
    const list = TESTS.filter(t => t.feature === f);
    html += '<h3>' + esc(f) + ' <span style="font-size:12px;color:#8b949e">(attempts: ' + (progress.attempts[f] || 0) + ')</span></h3>';
    for (const t of list) {
      const done = !!progress.tests[t.id];
      html += '<div class="card"><b>' + (done ? '✓' : '○') + ' ' + esc(t.name) + '</b><br><span style="font-size:12px">' + esc(t.owasp) + ' · ' + esc(t.difficulty) + '</span>'
        + '<details><summary>Hints</summary><ol>' + t.hints.map(h => '<li>' + esc(h) + '</li>').join('') + '</ol></details></div>';
    }
  }
  return layout(user, 'Tests', html);
}
function completePage(user){
  if (!isComplete()) {
    const left = TESTS.filter(t => !progress.tests[t.id]);
    return layout(user, 'Not yet', '<h2>Lab not complete yet</h2><p>' + doneCount() + '/' + TESTS.length + ' tests done. Still open:</p>' + left.map(t => '<div class="card">○ ' + esc(t.name) + ' (' + esc(t.feature) + ')</div>').join('') + '<p><a href="/tests">Back to the mission board</a></p>');
  }
  const key = assembleKey(_cS);
  let html = '<h2>Lab complete — debrief</h2>'
    + '<h3>1. Features in this lab</h3><p>' + FEATURES.length + ' features: ' + FEATURES.map(esc).join(', ') + '</p>'
    + '<h3>2. Vulnerabilities per feature</h3>' + FEATURES.map(f => '<div>' + esc(f) + ': ' + TESTS.filter(t => t.feature === f).length + '</div>').join('')
    + '<h3>3. How testing was done (' + TESTS.length + ' techniques)</h3>' + TESTS.map(t => '<div>✓ ' + esc(t.name) + '</div>').join('')
    + '<h3>4. What you learned</h3>' + TESTS.map(t => '<div class="card"><b>' + esc(t.name) + '</b><br>' + esc(t.lesson) + '</div>').join('')
    + '<h3>5. What this means for a real client</h3>' + TESTS.map(t => '<div class="card"><b>' + esc(t.name) + '</b><br>' + esc(t.impact) + '</div>').join('')
    + '<h3>6. Writing it in a real report</h3>' + TESTS.map(t => '<div class="card"><b>' + esc(t.report.title) + '</b> — Severity: ' + esc(t.report.severity) + '<br>Remediation: ' + esc(t.report.remediation) + '</div>').join('')
    + '<h3>Completion key (unlocks Lab ' + (LAB_NUMBER + 1) + ')</h3><div class="card" style="font-size:18px"><code>' + esc(key) + '</code></div>'
    + '<form method="POST" action="/complete/name"><input name="name" placeholder="Your name for the certificate" value="' + esc(progress.testerName || '') + '"> <button>Save name</button></form>'
    + '<p><a href="/certificate">View your certificate</a></p>';
  return layout(user, 'Complete', html);
}
function certificatePage(user){
  if (!isComplete()) return layout(user, 'Certificate', '<h2>Certificate locked</h2><p>Complete 100% of the tests first. Current: ' + doneCount() + '/' + TESTS.length + '.</p>');
  const name = progress.testerName || (user ? user.name : 'HexaCyberLab Tester');
  const date = progress.completedAt ? new Date(progress.completedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  return '<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ' + LAB_NUMBER + '</title><style>@media print{body{background:#fff}}</style></head>'
    + '<body style="background:#f6f8fa;font-family:Georgia,serif;color:#1f2328;display:flex;justify-content:center;padding:30px">'
    + '<div style="background:#fff;border:3px double #2f81f7;border-radius:12px;padding:36px 44px;max-width:680px;text-align:center">'
    + '<img src="/logo.png" alt="HexaCyberLab" style="height:56px">'
    + '<h1 style="margin:10px 0">Certificate of Completion</h1>'
    + '<p>This certifies that</p><h2 style="margin:6px 0">' + esc(name) + '</h2>'
    + '<p>has completed 100% of the security tests in</p><h3>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' (' + TESTS.length + ' tests across ' + FEATURES.length + ' features)</h3>'
    + '<p style="color:#57606a">' + date + '</p>'
    + '<p style="margin-top:22px;font-size:14px">HexaCyberLab — Built by Md. Jony Hassain, Founder</p>'
    + '</div></body></html>';
}

/* ------------------------------ Router ---------------------------- */
const _cS = ['TC1YSA==', 'NC02Mg==', 'NzJCNQ==', 'LVhYQg==', 'WFhRVg==', 'NDU5WQ=='];
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:' + PORT);
    const p = url.pathname;
    if (p === '/logo.png') { try { const data = fs.readFileSync(path.join(DIR, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(data); } catch(e) { res.writeHead(404); return res.end(); } }
    if (p === '/api/progress' || p === '/api/chat') return routeApi(req, res, url);
    // Lock gate — everything else waits until unlocked.
    if (!progress.unlocked) {
      if (p === '/unlock' && req.method === 'POST') {
        const body = parseBody(req, await readBody(req));
        if (String(body.key || '') === assembleKey(_eS)) { progress.unlocked = true; saveProgress(); return redirect(res, '/'); }
        res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(gatePage('That key was not accepted.'));
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(gatePage());
    }
    if (p.startsWith('/api/')) return routeApi(req, res, url);
    const sess = getSession(req);
    const user = currentUser(req, sess);
    if (p === '/login' && req.method === 'GET') return sendHtml(res, 200, layout(null, 'Log in', loginPage()));
    if (p === '/login' && req.method === 'POST') return routeLogin(req, res);
    if (p === '/logout') { if (sess.sid) sessions.delete(sess.sid); return redirect(res, '/', { 'Set-Cookie': 'hx_session=; Path=/; Max-Age=0' }); }
    if (p === '/register' && req.method === 'GET') return sendHtml(res, 200, layout(null, 'Register', registerPage()));
    if (p === '/register' && req.method === 'POST') return routeRegister(req, res);
    if (p === '/forgot' && req.method === 'GET') return sendHtml(res, 200, layout(null, 'Forgot', forgotPage()));
    if (p === '/forgot' && req.method === 'POST') return routeForgot(req, res);
    if (p === '/reset' && req.method === 'GET') return sendHtml(res, 200, layout(null, 'Reset', resetPage()));
    if (p === '/reset' && req.method === 'POST') return routeReset(req, res);
    if (p === '/tests') return sendHtml(res, 200, testsPage(user));
    if (p === '/complete' && req.method === 'GET') return sendHtml(res, 200, completePage(user));
    if (p === '/complete/name' && req.method === 'POST') { const body = parseBody(req, await readBody(req)); progress.testerName = String(body.name || '').slice(0, 80); saveProgress(); return redirect(res, '/complete'); }
    if (p === '/certificate') return sendHtml(res, 200, certificatePage(user));
    return routeApp(req, res, url);
  } catch (e) {
    try { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('Internal error'); } catch (_) {}
  }
});
if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => console.log('HexaGit LAB ' + LAB_NUMBER + ' listening on http://127.0.0.1:' + PORT));
}
module.exports = { TESTS, FEATURES };
