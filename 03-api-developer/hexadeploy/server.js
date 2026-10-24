'use strict';
/*
 * HexaDeploy — LAB 24 of 110 (Category 3: API & Developer Platforms)
 * A deliberately vulnerable deployment platform for hands-on web
 * penetration-testing practice. LOCAL USE ONLY. Binds 127.0.0.1.
 * Zero dependencies — Node.js built-ins only.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3033;
const LAB_NUMBER = 24;
const LAB_NAME = 'HexaDeploy';
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const LOGO_FILE = path.join(DIR, 'logo.png');

/* ------------------------------------------------------------------ *
 *  Seed business data (in-memory; restart resets the business data,
 *  but NOT the lab progress — that lives in progress.json).
 * ------------------------------------------------------------------ */
let uidSeq = 100;
const users = [
  { id: 1, name: 'Ayesha Rahman', email: 'admin@hexadeploy.local',   password: 'Admin@123',   role: 'admin' },
  { id: 2, name: 'Tanvir Hasan',   email: 'devops@hexadeploy.local',  password: 'Manager@123', role: 'user' },
  { id: 3, name: 'Nadia Islam',    email: 'dev@hexadeploy.local',     password: 'User@123',    role: 'user' },
  { id: 4, name: 'Sara Khatun',    email: 'qa@hexadeploy.local',      password: 'User@123',    role: 'user' },
  { id: 5, name: 'Victor Das',     email: 'victor@hexadeploy.local', password: 'User@123',    role: 'user' },
  { id: 6, name: 'Demo User',      email: 'demo@hexadeploy.local',    password: 'demo123',     role: 'user' },
];
let projSeq = 100;
const projects = [
  { id: 1, name: 'Nebula Storefront', desc: 'Customer-facing e-commerce storefront. Deploys ship the web store.', ownerId: 2,
    members: { 2: 'owner', 3: 'developer', 4: 'viewer' } },
  { id: 2, name: 'Cloudcart API', desc: 'Partner-facing cart and checkout API service.', ownerId: 2,
    members: { 2: 'owner', 4: 'developer' } },
  { id: 3, name: 'DataSync Worker', desc: 'Nightly inventory sync worker between warehouse systems.', ownerId: 5,
    members: { 5: 'owner' } },
];
let envSeq = 100;
const envs = [
  { id: 1, projectId: 1, name: 'development', kind: 'development', vars: { API_URL: 'http://localhost:4000', FEATURE_FLAGS: 'beta-checkout' } },
  { id: 2, projectId: 1, name: 'staging', kind: 'staging', vars: { API_URL: 'https://staging.nebula.example', DB_PASSWORD: 'stg-db-pass-123' } },
  { id: 3, projectId: 1, name: 'production', kind: 'production', vars: { API_URL: 'https://api.nebula.example', DB_PASSWORD: 'prod-db-pass-9f3k', STRIPE_SECRET_KEY: 'sk_live_' + '4eC39HqLyjWDarjtT1zdp7dc' + '' } },
  { id: 4, projectId: 2, name: 'production', kind: 'production', vars: { API_URL: 'https://api.cloudcart.example', JWT_SECRET: 'cloudcart-jwt-secret-2211' } },
  { id: 5, projectId: 3, name: 'production', kind: 'production', vars: { API_URL: 'https://sync.example', SYNC_TOKEN: 'sync-tok-7788-ab' } },
];
let buildSeq = 100;
const builds = [
  { id: 1, projectId: 1, envId: 1, version: 'v1.0.0', status: 'success', byId: 3,
    log: 'Cloning repository...\nInstalling dependencies...\nBuilding v1.0.0...\nBuild finished OK in 42s.' },
  { id: 2, projectId: 1, envId: 3, version: 'v1.0.0', status: 'success', byId: 2,
    log: 'Cloning repository...\n$ printenv | sort\nAPI_URL=https://api.nebula.example\nDB_PASSWORD=prod-db-pass-9f3k\nSTRIPE_SECRET_KEY=sk_live_' + '4eC39HqLyjWDarjtT1zdp7dc' + '\nBuilding v1.0.0...\nDeploy artefacts packaged.\nHealth check OK.' },
  { id: 3, projectId: 2, envId: 4, version: 'v2.1.0', status: 'success', byId: 2,
    log: 'Cloning repository...\nInstalling dependencies...\nBuilding v2.1.0...\nTests passed. Build finished OK in 61s.' },
];
let deploySeq = 100;
const deploys = [
  { id: 1, projectId: 1, envId: 1, buildId: 1, byId: 3, status: 'live', note: 'First dev deploy' },
  { id: 2, projectId: 1, envId: 3, buildId: 2, byId: 2, status: 'live', note: 'v1.0.0 to production' },
  { id: 3, projectId: 2, envId: 4, buildId: 3, byId: 2, status: 'live', note: 'v2.1.0 to production' },
];
const webhooks = [
  { id: 1, projectId: 1, url: 'https://hooks.nebula.example/deploy', events: 'deploy.success, deploy.rollback', secret: 'whsec_nebula_123' },
  { id: 2, projectId: 2, url: 'https://hooks.cloudcart.example/deploy', events: 'deploy.success', secret: 'whsec_cloud_456' },
];

/* ------------------------------------------------------------------ *
 *  Sessions (server-side store). The hx_role cookie is set at login
 *  from the account's real role — and, by design flaw, the admin gate
 *  trusts that client-side cookie instead of the server record.
 * ------------------------------------------------------------------ */
const sessions = new Map(); // sid -> { uid, enumHit, enumMiss, shareProbes: [] }
const issuedTokens = new Map(); // reset token -> sid it was issued to
const failedLogins = {}; // email -> count

function newSession(res, uid) {
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, { uid: uid || null, enumHit: false, enumMiss: false, shareProbes: [] });
  res.setHeader('Set-Cookie', [
    'hx_session=' + sid + '; Path=/; HttpOnly; SameSite=Lax',
    'hx_tok=' + crypto.randomBytes(8).toString('hex') + '; Path=/; SameSite=Lax',
  ]);
  return sid;
}

/* ------------------------------------------------------------------ *
 *  Progress engine (progress.json)
 * ------------------------------------------------------------------ */
let progress = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const p = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      if (p && typeof p === 'object') progress = Object.assign(progress, p);
    }
  } catch (e) { /* start fresh on corrupt state */ }
}
function saveProgress() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 1)); } catch (e) { /* ignore */ }
}
loadProgress();

function pass(id) {
  if (!progress.tests[id]) {
    progress.tests[id] = true;
    if (TESTS.every(t => progress.tests[t.id])) {
      if (!progress.completedAt) progress.completedAt = new Date().toISOString();
      progress.keyRevealed = true;
    }
    saveProgress();
  }
}
function attempt(feature) {
  progress.attempts[feature] = (progress.attempts[feature] || 0) + 1;
  saveProgress();
}
function progressSummary() {
  const total = TESTS.length;
  const done = TESTS.filter(t => progress.tests[t.id]).length;
  const features = {};
  for (const f of FEATURES) {
    const ts = TESTS.filter(t => t.feature === f);
    features[f] = { total: ts.length, done: ts.filter(t => progress.tests[t.id]).length, attempts: progress.attempts[f] || 0 };
  }
  return { lab: LAB_NAME, number: LAB_NUMBER, total, done, pct: total ? Math.floor(done / total * 100) : 0, features, complete: done === total };
}

/* ------------------------------------------------------------------ *
 *  Key material — stored ONLY as encoded fragments, scattered.
 *  (fragments are base64 of reversed pieces; assembled at runtime
 *   only at the moment of verification or reveal.)
 * ------------------------------------------------------------------ */
const _fragA = ['TC1YSA==', 'US00Mg=='];
function _asm(parts) {
  return parts.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}

/* ============================ TESTS ============================ */
const FEATURES = [
  'Login & Authentication', 'Registration & Profile', 'Projects',
  'Builds & Pipelines', 'Environments & Secrets', 'Deployments & Rollback',
  'Team & Roles', 'Admin Panel', 'Platform & API',
];
const TESTS = [
  /* ---------------- Login & Authentication ---------------- */
  { id: 'sqli-login', feature: 'Login & Authentication', name: 'SQL Injection — Login Bypass', owasp: 'A03 Injection', difficulty: 'Beginner', keys: ['sql', 'injection', 'login bypass', 'sqli'],
    hints: ['The login form builds its query by gluing your input straight into the SQL string.', 'A classic tautology in the email field can make the WHERE clause true for the first row in the table.', "Try email: ' OR '1'='1' --  with any password — you land in the first account, which is the platform admin."],
    lesson: 'String-built SQL queries let an attacker rewrite the login check itself. Parameterised queries remove the whole class.',
    impact: 'On a real client deployment platform, this is a full takeover of the first account in the table — usually the platform admin — with no password at all. From there, every project and production secret is exposed.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.' },
    guide: "Step by step: 1) Open /login. 2) In the email field enter: ' OR '1'='1' --  3) Enter any password and submit. 4) You are logged in as the first user in the table (the platform admin) because the query became: email='' OR '1'='1' — always true." },
  { id: 'brute-force', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limiting on Login', owasp: 'A07 Auth Failures', difficulty: 'Beginner', keys: ['brute', 'rate limit', 'password guessing', 'lockout'],
    hints: ['Nothing slows you down: no lockout, no CAPTCHA, no delay.', 'Write a loop (or use Burp Intruder) and fire wrong passwords at one account.', 'After 10 failed attempts the app is still happily processing guesses — that missing throttle is the finding.'],
    lesson: 'Without throttling or lockout, online password guessing is cheap and quiet. Rate limits + lockout + MFA are the standard defence.',
    impact: 'Attackers can grind through password lists against real operator accounts; one weak password becomes control of the deployment pipeline — and of production.',
    report: { title: 'No Rate Limiting or Account Lockout on Login Endpoint', severity: 'High', remediation: 'Add progressive delays/lockout per account and IP, CAPTCHA after failures, and offer MFA.' },
    guide: 'Step by step: 1) Pick an account, e.g. qa@hexadeploy.local. 2) Submit a wrong password 10 times (curl loop or Intruder). 3) Every attempt is processed at full speed — no block, no delay. 4) The test passes at the 10th accepted failure.' },
  { id: 'user-enumeration', feature: 'Login & Authentication', name: 'User Enumeration via Login & Reset Responses', owasp: 'A07 Auth Failures', difficulty: 'Beginner', keys: ['enumeration', 'enumerate', 'which emails exist', 'forgot'],
    hints: ['Compare the error for an email that exists with one that does not.', 'The login form and the forgot-password form answer differently depending on whether the account is real.', 'Probe one real address (from the README) and one invented address in the same session — the difference is the oracle.'],
    lesson: 'Different responses for "no such user" vs "wrong password" hand attackers a free list of valid accounts to target.',
    impact: 'Attackers harvest valid operator emails from the client\u2019s own login page, then aim phishing and password spraying precisely at the people who can deploy.',
    report: { title: 'Account Enumeration via Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message ("invalid credentials" / "if the account exists…") for every failure case.' },
    guide: 'Step by step: 1) In one session, submit /login with an invented email — note "No account found for that email." 2) Submit a real email with a wrong password — note the different message "Incorrect password…". 3) /forgot behaves the same way. The test passes once one session has seen both answers.' },
  { id: 'default-creds', feature: 'Login & Authentication', name: 'Default / Demo Credentials Still Active', owasp: 'A07 Auth Failures', difficulty: 'Beginner', keys: ['default', 'demo', 'credentials', 'weak account'],
    hints: ['Seeded/demo accounts are a classic leftover in production SaaS.', 'The README\u2019s test-account table includes a demo login — check whether it still works.', 'demo@hexadeploy.local with its documented demo password is still an active account.'],
    lesson: 'Demo and default accounts shipped to production are pre-made doors: their passwords are public knowledge.',
    impact: 'Anyone who reads the product\u2019s docs or guesses the demo login walks straight into the client\u2019s deployment workspace.',
    report: { title: 'Active Default/Demo Account with Known Password', severity: 'High', remediation: 'Remove demo/default accounts before production; force unique credentials for every seeded user.' },
    guide: 'Step by step: 1) Open /login. 2) Sign in as demo@hexadeploy.local / demo123. 3) The account is fully active — that successful login is the finding.' },
  { id: 'reset-token', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07 Auth Failures', difficulty: 'Intermediate', keys: ['reset', 'token', 'predictable', 'forgot password'],
    hints: ['Ask for a reset for your own account and study the token format (the flow is intentionally transparent in this lab).', 'The token is built only from the user\u2019s numeric ID and the current minute — nothing random.', 'Compute rst-<victim id>-<current minute> for the admin (id 1) and post it straight to /reset without ever requesting a reset for that account.'],
    lesson: 'Reset tokens must be long, random and single-use. A token derived from public values (ID + time) can be forged for any account.',
    impact: 'An attacker resets the password of any operator — including admins — knowing only their email and the time of day. Full account takeover, no inbox access needed.',
    report: { title: 'Password Reset Tokens Are Predictable (ID + Timestamp)', severity: 'Critical', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), store hashed, expire quickly, single use.' },
    guide: 'Step by step: 1) Note the token format: rst-<userId>-<epoch minute>. 2) In a fresh session (never use /forgot for the victim), compute the token for the victim\u2019s ID with the current minute. 3) POST /reset with their email, your computed token and a new password. 4) The reset succeeds — you forged it. The test passes because the token was never issued to your session.' },
  { id: 'cookie-tamper', feature: 'Login & Authentication', name: 'Session/Role Cookie Tampering', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['cookie', 'role', 'tamper', 'session', 'admin cookie'],
    hints: ['After login, look at the cookies the app sets — one of them carries your platform role.', 'That role cookie is trusted by the admin gate without any server-side check or signature.', 'Set hx_role=admin in your browser (or curl) while logged in as a normal user and open /admin.'],
    lesson: 'Authorisation data must live server-side. A role stored in an unsigned client cookie is a suggestion the user can edit.',
    impact: 'Any normal user promotes themselves to platform admin by editing a cookie — full control of every project, pipeline and secret on the client\u2019s deployment platform.',
    report: { title: 'Platform Role Trusted from Unsigned Client Cookie', severity: 'Critical', remediation: 'Keep authorisation state server-side in the session; never trust client-supplied role values.' },
    guide: 'Step by step: 1) Log in as any normal user (e.g. victor). 2) In your browser\u2019s cookie editor (or with curl -b) set the cookie hx_role to admin. 3) Open /admin. 4) The admin panel opens because the gate reads the cookie, not the account — the test passes when a non-admin reaches /admin this way.' },

  /* ---------------- Registration & Profile ---------------- */
  { id: 'weak-password', feature: 'Registration & Profile', name: 'Weak Password Policy (1-Character Passwords)', owasp: 'A07 Auth Failures', difficulty: 'Beginner', keys: ['weak password', 'password policy', 'short password', 'register'],
    hints: ['The registration form accepts almost anything as a password.', 'Try registering with a password of a single character.', 'No length, complexity or breach-list check stops you — the account is created.'],
    lesson: 'A password policy is the cheapest control there is; accepting 1-character passwords invites credential stuffing and guessing.',
    impact: 'Users will pick trivial passwords, and every one of them is an easy account takeover on the client\u2019s platform.',
    report: { title: 'Registration Accepts Trivially Weak Passwords', severity: 'Medium', remediation: 'Enforce a minimum length (≥10) and screen against known-breached password lists.' },
    guide: 'Step by step: 1) Open /register. 2) Create an account with the password "x" (one character). 3) The account is created and works — the test passes.' },
  { id: 'mass-assignment', feature: 'Registration & Profile', name: 'Mass Assignment — Self-Assigning the Admin Role', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['mass assignment', 'role', 'admin field', 'register role'],
    hints: ['The server binds the whole submitted form to the new account object — including fields the form never shows.', 'Add a field the UI doesn\u2019t offer, e.g. role, to the register or profile request.', 'Register with role=admin added to the POST body (curl or Burp) — the new account is created as a platform admin.'],
    lesson: 'Frameworks that auto-bind request fields to models let attackers set privileged attributes (role, balance, tier) they were never shown.',
    impact: 'A stranger registers and instantly owns the platform: every project, every pipeline, every production secret.',
    report: { title: 'Mass Assignment Allows Privilege Escalation via role Parameter', severity: 'Critical', remediation: 'Whitelist bindable fields explicitly; never bind role/privilege fields from client input.' },
    guide: 'Step by step: 1) Intercept or curl the /register POST. 2) Add the extra field role=admin to the body. 3) Submit — the account is created with the platform admin role (check the Admin link). 4) The same trick works via POST /profile. The test passes when the injected role takes effect.' },
  { id: 'stored-xss-name', feature: 'Registration & Profile', name: 'Stored XSS via Display Name', owasp: 'A03 Injection', difficulty: 'Beginner', keys: ['stored xss', 'name', 'profile name', 'persistent'],
    hints: ['Your display name is shown all over the app — team lists, deploy history, build records.', 'It is rendered without encoding.', 'Register or set your profile name to <script>alert(1)</script> — it is stored as-is and fires for everyone who sees it.'],
    lesson: 'Any stored field rendered without output encoding becomes a persistent script delivery mechanism aimed at other users — including admins.',
    impact: 'An attacker plants a script in their profile name; every operator and admin who opens a team list runs it — session theft and deploys in their name.',
    report: { title: 'Stored Cross-Site Scripting in User Display Name', severity: 'High', remediation: 'Context-encode all user-controlled output; sanitise stored rich text with an allowlist.' },
    guide: 'Step by step: 1) Register a new account (or edit your profile) with the name: <script>alert(1)</script> 2) Submit. 3) The payload is stored verbatim and rendered raw wherever the name appears — the test passes at store time.' },
  { id: 'profile-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['csrf', 'profile', 'cross-site', 'token'],
    hints: ['The profile form carries a token field (hx_tok) — but check whether the server actually verifies it.', 'Send the profile POST from a different origin, or strip the token entirely.', 'curl the /profile POST with an Origin: https://evil.example header and no hx_tok — the change is accepted anyway.'],
    lesson: 'A CSRF token that is rendered but never verified is decoration. State-changing requests must validate the token (or SameSite + origin checks) server-side.',
    impact: 'A malicious page a logged-in operator visits silently rewrites their profile — the first step to account-takeover chains (e.g. changing the recovery email).',
    report: { title: 'Cross-Site Request Forgery on Profile Update (Token Not Verified)', severity: 'Medium', remediation: 'Verify the anti-CSRF token server-side on every state-changing request; enforce SameSite cookies.' },
    guide: 'Step by step: 1) Log in as any user and note your cookie. 2) From curl, POST /profile with a new name, your session cookie, an Origin: https://evil.example header and NO hx_tok field. 3) The name changes — the request was accepted cross-site. The test passes when a state change lands without a valid token.' },

  /* ---------------- Projects ---------------- */
  { id: 'project-idor', feature: 'Projects', name: 'Cross-Project IDOR — Reading Another Team\u2019s Project', owasp: 'A01 Broken Access Control', difficulty: 'Beginner', keys: ['idor', 'project', 'private project', 'other team'],
    hints: ['Project URLs carry a simple numeric ID.', 'Your project list only shows your projects — but the detail page never checks membership.', 'Log in as victor and open /projects/3\u2019s neighbours: /projects/1 — a project you do not belong to renders in full.'],
    lesson: 'Hiding an object from lists is not access control. Every object fetch must check the caller\u2019s right to that object.',
    impact: 'A low-privilege user or a competitor reads other teams\u2019 deployment setup, environments and history just by changing a number in the URL.',
    report: { title: 'Insecure Direct Object Reference on Project Detail (No Membership Check)', severity: 'High', remediation: 'Check project membership/ownership on every project-scoped query; scope queries by the caller\u2019s memberships.' },
    guide: 'Step by step: 1) Log in as victor@hexadeploy.local (owner of DataSync Worker only). 2) Open /projects/1. 3) Nebula Storefront renders in full — members, environments, builds, deploys — although you are not a member. The test passes when a non-member is served the project.' },
  { id: 'search-disclosure', feature: 'Projects', name: 'Search Leaks Other Projects\u2019 Environments & Builds', owasp: 'A01 Broken Access Control', difficulty: 'Beginner', keys: ['search', 'disclosure', 'leak', 'results'],
    hints: ['The global search box searches everything — try searching for an environment name like "production".', 'Results are not scoped to the projects you belong to.', 'As victor, search "production" — environments and builds from Nebula Storefront and Cloudcart API appear, with links.'],
    lesson: 'Search is a data-access path like any other: if it is not scoped by the caller\u2019s permissions, it becomes a catalogue of everything private.',
    impact: 'Any user can enumerate the client\u2019s projects, environments and pipeline activity — reconnaissance that points straight at the production targets.',
    report: { title: 'Search Results Not Scoped by Project Membership (Information Disclosure)', severity: 'Medium', remediation: 'Apply the same membership filters to search queries as to direct object access.' },
    guide: 'Step by step: 1) Log in as victor. 2) Open /search?q=production. 3) Environments and builds belonging to projects you are not a member of are listed. The test passes when a result from a foreign project is served to you.' },

  /* ---------------- Builds & Pipelines ---------------- */
  { id: 'build-idor', feature: 'Builds & Pipelines', name: 'Build Log IDOR — Reading Another Project\u2019s Build Logs', owasp: 'A01 Broken Access Control', difficulty: 'Beginner', keys: ['build', 'log', 'build idor', 'pipeline'],
    hints: ['Build logs have their own URLs with simple numeric IDs: /builds/<id>/log.', 'The log endpoint never asks which project the build belongs to, or whether you are on it.', 'As victor, open /builds/2/log — the Nebula Storefront production build log.'],
    lesson: 'Every artefact of the pipeline — logs included — needs the same ownership check as the project itself.',
    impact: 'Build logs are reconnaissance gold: stack traces, internal URLs, tooling versions — and, as the next test shows, sometimes the production secrets themselves.',
    report: { title: 'Insecure Direct Object Reference on Build Log (No Project Check)', severity: 'High', remediation: 'Authorise build-log access against the parent project\u2019s membership on every request.' },
    guide: 'Step by step: 1) Log in as victor (not a member of Nebula Storefront). 2) Open /builds/2/log. 3) The other project\u2019s build log is served in full. The test passes when a non-member reads the log.' },
  { id: 'secret-in-build-log', feature: 'Builds & Pipelines', name: 'Production Secrets Printed in Build Logs', owasp: 'A09 Logging Failures', difficulty: 'Intermediate', keys: ['secret in log', 'printenv', 'log exposure', 'env dump'],
    hints: ['One of the seeded production builds ran a debug step that dumped the whole environment.', 'Open the production build log for Nebula Storefront (build 2) as someone without production rights — e.g. sara, a mere viewer.', 'The log prints DB_PASSWORD and STRIPE_SECRET_KEY in clear text — the pipeline leaked its own crown jewels.'],
    lesson: 'CI/CD logs must never contain secret values: mask variables, forbid env dumps, and treat logs as sensitive data with restricted access and retention.',
    impact: 'Anyone who can see the build log walks away with the live database password and the payment provider\u2019s secret key — direct production compromise without touching the servers.',
    report: { title: 'Production Secrets Exposed in Build Logs (Unmasked Environment Dump)', severity: 'Critical', remediation: 'Mask all secret variables in CI output, block env/printenv debug steps, restrict log access, and rotate the exposed secrets.' },
    guide: 'Step by step: 1) Log in as sara@hexadeploy.local (viewer on Nebula Storefront — no production rights). 2) Open /builds/2/log. 3) The log contains the real production values (DB_PASSWORD, STRIPE_SECRET_KEY) because the build printed its environment. The test passes when a user without production access is served a log containing a production secret.' },
  { id: 'build-log-injection', feature: 'Builds & Pipelines', name: 'Build-Log Injection via Version String', owasp: 'A03 Injection', difficulty: 'Advanced', keys: ['log injection', 'version', 'newline', 'forge'],
    hints: ['The "trigger build" form takes a free-text version string — and writes it straight into the build log.', 'What happens if the version contains a newline, or a shell-looking fragment like $(printenv)?', 'Trigger a build with the version: v9.9.9$(printenv) — the simulated pipeline "executes" it and the log suddenly contains a full environment dump.'],
    lesson: 'User input that reaches logs or shell-like steps must be treated as code: validate formats (semver), never interpolate raw input into commands or log templates.',
    impact: 'An attacker forges log entries to hide real activity — or, where the pipeline echoes the environment, tricks the build into printing the production secrets it runs with.',
    report: { title: 'Build Version String Injected into Pipeline Log (Log Forging / Env Dump)', severity: 'High', remediation: 'Validate version strings against a strict semver pattern; never pass raw user input into shell steps; sanitise log output.' },
    guide: 'Step by step: 1) Log in as any project member (e.g. dev@). 2) In the Trigger build form, set the version to: v9.9.9$(printenv) 3) Submit and open the new build\u2019s log. 4) The log shows a forged environment dump — your input was treated as a command. The test passes when the injected build is created.' },
];

/* more key fragments, scattered mid-file */
const _fragB = ['SDkzRA==', 'LTJTMg=='];

const _cfragA = ['TC1YSA==', 'Qy01Mg=='];
const TESTS2 = [
  /* ---------------- Environments & Secrets ---------------- */
  { id: 'env-idor', feature: 'Environments & Secrets', name: 'Environment IDOR — Reading Another Project\u2019s Production Secrets', owasp: 'A01 Broken Access Control', difficulty: 'Beginner', keys: ['environment', 'env idor', 'secret', 'variables'],
    hints: ['Environment pages have simple numeric URLs: /envs/<id>.', 'The page shows the environment\u2019s variables in full — and never checks which project they belong to.', 'As victor, open /envs/3 — Nebula Storefront\u2019s production variables, including the live DB password and Stripe key.'],
    lesson: 'Secrets stores are the highest-value pages in a deployment platform; they need the strictest per-object authorisation, not the weakest.',
    impact: 'One changed digit hands an attacker the client\u2019s live database password and payment keys — production data breach and fraudulent charges follow directly.',
    report: { title: 'Insecure Direct Object Reference on Environment Secrets (No Project Check)', severity: 'Critical', remediation: 'Check project membership AND production-access role on every environment read; mask secret values by default.' },
    guide: 'Step by step: 1) Log in as victor. 2) Open /envs/3. 3) The production environment of a project you do not belong to renders with every variable in clear text. The test passes when a non-member is served the environment.' },
  { id: 'secret-tamper', feature: 'Environments & Secrets', name: 'Secret Variable Tampering by a Read-Only Viewer', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['tamper', 'edit secret', 'variable', 'viewer edit'],
    hints: ['The environment page has an "update variables" form. Who is it shown to — and who does the server actually check?', 'A project viewer should be read-only. The update endpoint never verifies a production role.', 'As sara (viewer on Nebula Storefront), POST a changed variable to /envs/3/update — production accepts it.'],
    lesson: 'Production secret changes must require an explicit production role server-side, be audited, and ideally need a second pair of eyes.',
    impact: 'A read-only account silently points production at an attacker\u2019s database or swaps the payment key — a supply-chain attack executed from inside the client\u2019s own pipeline.',
    report: { title: 'Missing Authorisation on Production Secret Update (Viewer Can Tamper)', severity: 'Critical', remediation: 'Require the production/owner role server-side for secret writes; audit-log every change; consider dual approval for production.' },
    guide: 'Step by step: 1) Log in as sara@hexadeploy.local (viewer). 2) Open /envs/3 and use the Update variables form — or curl POST /envs/3/update with vars=API_URL=https://evil.example 3) The production variable is changed. The test passes when a user without production rights modifies a production environment.' },
  { id: 'env-create-prod', feature: 'Environments & Secrets', name: 'Viewer Creates a Production Environment', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['create environment', 'new environment', 'production create'],
    hints: ['The project page lets members add environments and choose the kind — development, staging, or production.', 'Environment creation is a privileged pipeline action, but the server checks nothing beyond being logged in.', 'As sara (viewer), create an environment on Nebula Storefront with kind=production and your own variables.'],
    lesson: 'Creating a production target is a privileged act: restrict it to owners, and treat new environments as security-sensitive configuration.',
    impact: 'A low-privilege user stands up a shadow "production" environment with attacker-controlled endpoints — deployments and webhooks can be steered there.',
    report: { title: 'Missing Authorisation on Environment Creation (Viewer Can Create Production)', severity: 'High', remediation: 'Restrict environment creation to project owners; validate the kind server-side; audit new environments.' },
    guide: 'Step by step: 1) Log in as sara (viewer on Nebula Storefront). 2) On /projects/1, use the Add environment form with name=prod-backup and kind=production. 3) The environment is created. The test passes because a non-owner created a production environment.' },

  /* ---------------- Deployments & Rollback ---------------- */
  { id: 'prod-deploy-role', feature: 'Deployments & Rollback', name: 'Deploy to Production Without the Production Role', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['deploy', 'production deploy', 'ship', 'release'],
    hints: ['The deploy form lets you pick any environment of the project — including production.', 'Only owners and developers should ship to production. Does the server check your project role?', 'As sara (viewer), deploy build 1 to the production environment (env 3) of Nebula Storefront.'],
    lesson: 'The deploy action is the moment code becomes production: its authorisation check must be server-side, role-based, and per-environment.',
    impact: 'A read-only viewer ships arbitrary code to the client\u2019s live store — defacement, skimmers, or a full storefront takeover in one click.',
    report: { title: 'Missing Role Check on Production Deployment (Viewer Can Deploy)', severity: 'Critical', remediation: 'Enforce owner/developer role server-side for production deploys; log and notify on every production release.' },
    guide: 'Step by step: 1) Log in as sara (viewer). 2) On /projects/1, use the Deploy form: environment=production (3), build=1. 3) Submit — the deploy is recorded as live in production. The test passes when a user without production rights deploys to a production environment.' },
  { id: 'rollback-abuse', feature: 'Deployments & Rollback', name: 'Rollback Abuse — Reverting Production Without Rights', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['rollback', 'revert', 'undo deploy'],
    hints: ['Every deploy in the history has a Roll back button.', 'Rolling back production is as powerful as deploying — it changes what customers are served.', 'As sara (viewer), roll back the live production deploy (deploy 2) on Nebula Storefront.'],
    lesson: 'Rollback is a production write and needs the same authorisation, audit and notification as a deploy.',
    impact: 'A low-privilege user knocks the client\u2019s store back to an old, vulnerable release — or takes production down during peak sales — with a single click.',
    report: { title: 'Missing Authorisation on Production Rollback', severity: 'High', remediation: 'Require the production role server-side for rollbacks; audit-log them and notify the project owners.' },
    guide: 'Step by step: 1) Log in as sara (viewer). 2) On /projects/1, find deploy 2 (the live production deploy) and click Roll back — or curl POST /deploys/2/rollback. 3) Production is reverted by a read-only account. The test passes on that state change.' },

  /* ---------------- Team & Roles ---------------- */
  { id: 'role-escalation', feature: 'Team & Roles', name: 'Team Role Escalation — Non-Owner Rewrites Project Roles', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['team', 'role escalation', 'promote', 'member role'],
    hints: ['The Team table on the project page has a role dropdown and a Set role button for every member.', 'Managing roles should be owner-only work. The endpoint never checks who is asking.', 'As nadia (developer) or sara (viewer) on Nebula Storefront, set your own role to owner via POST /projects/1/members/role.'],
    lesson: 'Privilege management is itself a privileged operation — enforce it server-side, not by hiding the button.',
    impact: 'Any team member crowns themselves project owner, gaining production deploys, secret access and the power to remove the real owner.',
    report: { title: 'Missing Authorisation on Team Role Management', severity: 'High', remediation: 'Restrict role changes to project owners server-side; audit all privilege changes.' },
    guide: 'Step by step: 1) Log in as sara (viewer) or nadia (developer). 2) In the Team table of /projects/1, set your own role to owner and submit — or curl POST /projects/1/members/role with your userId and role=owner. 3) Your role changes although you are not the owner. The test passes on that change.' },
  { id: 'kick-owner', feature: 'Team & Roles', name: 'Member Removes the Project Owner', owasp: 'A01 Broken Access Control', difficulty: 'Advanced', keys: ['kick', 'remove owner', 'eject', 'team remove'],
    hints: ['Next to every team member there is a Remove button — including next to the owner.', 'Removing the project owner should be impossible for a non-owner; the endpoint does not check.', 'As sara or nadia, remove user 2 (the owner) from Nebula Storefront via POST /projects/1/members/remove.'],
    lesson: 'Destructive team actions need caller checks and target protections — the owner of a project must never be removable by the people they manage.',
    impact: 'A disgruntled member ejects the legitimate owner from their own project — losing control of production until an admin intervenes. A hostile takeover of the release pipeline.',
    report: { title: 'Project Owner Removable by Non-Owner Team Members', severity: 'High', remediation: 'Only owners can remove members; the project owner can never be removed by another member; require transfer-of-ownership flow instead.' },
    guide: 'Step by step: 1) Log in as sara or nadia. 2) In the Team table of /projects/1, click Remove next to Tanvir (the owner) — or curl POST /projects/1/members/remove with userId=2. 3) The owner is gone from their own project. The test passes on that removal.' },

  /* ---------------- Admin Panel ---------------- */
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'Destructive Admin Action as a Plain GET (CSRF)', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['admin', 'purge', 'csrf admin', 'delete history'],
    hints: ['The admin panel has a "Purge deploy history" action — look at how it is invoked.', 'It is a plain GET link: no form, no token, no confirmation. Any page the admin visits can fire it.', 'While holding the admin gate (cookie or real admin), GET /admin/purge — the entire deploy history is wiped by a link.'],
    lesson: 'State changes must never ride on GET, and admin actions need CSRF tokens plus confirmation — otherwiseone stray link click (or one malicious image tag) fires them.',
    impact: 'An attacker who gets an admin to load a page with an <img> pointing at the purge URL destroys the client\u2019s deploy audit history — hiding every other attack in this lab.',
    report: { title: 'State-Changing Admin Action on GET Without CSRF Protection (Deploy History Purge)', severity: 'High', remediation: 'Make destructive actions POST-only with a verified anti-CSRF token and an explicit confirmation step; keep an immutable audit log.' },
    guide: 'Step by step: 1) Reach /admin (real admin via SQLi/admin login, or the hx_role=admin cookie). 2) Click "Purge deploy history" — or simply GET /admin/purge. 3) The deploy history is emptied by a tokenless GET. The test passes when the purge executes.' },

  /* ---------------- Platform & API ---------------- */
  { id: 'api-user-dump', feature: 'Platform & API', name: 'Unauthenticated API Dumps Every User (Passwords Included)', owasp: 'A01 Broken Access Control', difficulty: 'Beginner', keys: ['api', 'user dump', 'api users', 'no auth'],
    hints: ['The platform exposes a JSON API under /api/.', 'One endpoint returns the user directory — try fetching it with no login and no key at all.', 'curl /api/users — every account, with its password in clear text.'],
    lesson: 'APIs need the same authentication and data-minimisation as the UI: never return password material, and never leave directory endpoints open.',
    impact: 'Anyone on the internet downloads the client\u2019s full operator list with working passwords — every account, including admins, falls at once.',
    report: { title: 'Unauthenticated API Endpoint Exposes All Users Including Passwords', severity: 'Critical', remediation: 'Require authentication and authorisation on every API endpoint; never serialise password fields.' },
    guide: 'Step by step: 1) Without logging in, curl http://127.0.0.1:3033/api/users. 2) The JSON lists every user with email, role and password. The test passes when that dump is served.' },
  { id: 'api-weak-key', feature: 'Platform & API', name: 'Weak Static API Key Leaks Projects & Secrets', owasp: 'A07 Auth Failures', difficulty: 'Intermediate', keys: ['api key', 'weak key', 'api projects', 'integration'],
    hints: ['The API documentation page (/api-docs) is meant for integrators — read it closely.', 'It prints a live "demo" API key — and the API accepts that same key for full read access.', 'curl /api/projects with header x-api-key set to the key from /api-docs — every project, every environment, every secret comes back.'],
    lesson: 'API keys must be unique per customer, high-entropy, scoped, and rotatable. A documented demo key with production read access is a breach waiting for a reader.',
    impact: 'Anyone who reads the public docs exfiltrates the client\u2019s whole deployment inventory — projects, environments and the production secrets inside them.',
    report: { title: 'Documented Static API Key Grants Full Read Access to Projects and Secrets', severity: 'Critical', remediation: 'Issue per-client high-entropy keys, scope them least-privilege, keep secrets out of API responses, and rotate the leaked key.' },
    guide: 'Step by step: 1) Open /api-docs and copy the demo API key printed there. 2) curl /api/projects -H "x-api-key: <key>". 3) The response contains all projects with environments and secret values. The test passes when the key is accepted.' },
  { id: 'share-token-enum', feature: 'Platform & API', name: 'Guessable Environment Share Links (Sequential Tokens)', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['share', 'share link', 'token guess', 'enumerate link'],
    hints: ['Environments can be "shared" with a link like /share/share-<id>.', 'The token is just the environment\u2019s sequential ID — nothing random at all.', 'Probe /share/share-1 through /share/share-5 — each one opens that environment\u2019s variables, no login needed.'],
    lesson: 'Share links are bearer credentials: they must be long, random and revocable. A sequential ID as a token is an open door with a number on it.',
    impact: 'Anyone can walk the numbers and read every environment\u2019s secrets the client ever shared — including production — without any account at all.',
    report: { title: 'Environment Share Tokens Are Sequential and Enumerable', severity: 'High', remediation: 'Generate share tokens with a CSPRNG (≥128 bits), support revocation and expiry, and never derive them from object IDs.' },
    guide: 'Step by step: 1) Log out (share links need no account). 2) Visit /share/share-1, /share/share-2, … up to /share/share-5. 3) Each renders that environment\u2019s variables. The test passes once 5 distinct share tokens have been probed in one session.' },
];
TESTS.push(...TESTS2);

const _fragC = ['V0tRMg==', 'SlVPNQ=='];
function entryKey() { return _asm(_fragA.concat(_fragB, _fragC)); }

const XSS_RE = /<\s*script|on\w+\s*=|<\s*svg|<\s*iframe|<\s*img[^>]*onerror|javascript\s*:/i;
const INJ_RE = /'\s*or\s*'?\d+'?\s*=\s*'?\d+|'\s*or\s*'[^']*'\s*=\s*'[^']*'|'\s*--|'\s*or\s+1\s*=\s*1|\bunion\b[\s\S]*\bselect\b/i;

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function userById(id) { return users.find(u => u.id === Number(id)); }
function userByEmail(email) { return users.find(u => u.email === String(email || '').toLowerCase()); }
function projectById(id) { return projects.find(p => p.id === Number(id)); }
function envById(id) { return envs.find(e => e.id === Number(id)); }
function buildById(id) { return builds.find(b => b.id === Number(id)); }
function memberRole(project, uid) { return project ? project.members[uid] : undefined; }
function isMember(project, uid) { return !!(project && project.members[uid]); }
function prodAccess(project, uid) { const r = memberRole(project, uid); return r === 'owner' || r === 'developer'; }
function prodSecretValues() {
  const vals = [];
  for (const e of envs) if (e.kind === 'production') for (const k of Object.keys(e.vars)) { const v = String(e.vars[k]); if (v.length >= 8) vals.push(v); }
  return vals;
}

function parseCookies(req) {
  const out = {};
  const h = req.headers.cookie || '';
  h.split(';').forEach(part => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}
function getSession(req) {
  const c = parseCookies(req);
  if (c.hx_session && sessions.has(c.hx_session)) return { sid: c.hx_session, data: sessions.get(c.hx_session), cookies: c };
  return { sid: null, data: { uid: null, enumHit: false, enumMiss: false, shareProbes: [] }, cookies: c };
}
function parseBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', ch => { data += ch; if (data.length > 2e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) {
        try { resolve(JSON.parse(data || '{}')); return; } catch (e) { resolve({}); return; }
      }
      const out = {};
      new URLSearchParams(data).forEach((v, k) => { out[k] = v; });
      resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}
function addCookie(res, str) {
  const prev = res.getHeader('Set-Cookie') || [];
  res.setHeader('Set-Cookie', (Array.isArray(prev) ? prev : [prev]).concat([str]));
}
function ensureSession(req, res) {
  const c = parseCookies(req);
  if (c.hx_session && sessions.has(c.hx_session)) return c.hx_session;
  const sid = newSession(res, null);
  req.headers.cookie = (req.headers.cookie ? req.headers.cookie + '; ' : '') + 'hx_session=' + sid;
  return sid;
}
function send(res, code, html) {
  res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}
function redirect(res, loc) {
  res.writeHead(302, { Location: loc });
  res.end();
}
function enumCheck(sessData) {
  if (sessData.enumHit && sessData.enumMiss) pass('user-enumeration');
}
function resetTokenFor(user) {
  return 'rst-' + user.id + '-' + Math.floor(Date.now() / 60000);
}

/* ----------------------------- layout ----------------------------- */
function layout(req, title, body, opts) {
  opts = opts || {};
  const s = progressSummary();
  const sess = getSession(req);
  const me = sess.data.uid ? userById(sess.data.uid) : null;
  const bar = `<div class="pbar"><img src="/logo.png" alt="HexaCyberLab"><span class="plab">LAB ${LAB_NUMBER} — ${LAB_NAME}</span><span class="pstat">${s.done}/${s.total} tests · ${s.pct}%</span><span class="pmeter"><span style="width:${s.pct}%"></span></span></div>`;
  const nav = me
    ? `<nav><a href="/projects">Projects</a><a href="/search">Search</a><a href="/api-docs">API Docs</a><a href="/tests">🎯 Tests</a><a href="/profile">Profile</a>${sess.cookies.hx_role === 'admin' || me.role === 'admin' ? '<a href="/admin">Admin</a>' : ''}<span class="who">${esc(me.name)} (${esc(me.email)})</span><a href="/logout">Logout</a></nav>`
    : `<nav><a href="/login">Login</a><a href="/register">Register</a><a href="/api-docs">API Docs</a><a href="/tests">🎯 Tests</a></nav>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)} · LAB ${LAB_NUMBER} — ${LAB_NAME}</title>
<style>
body{font-family:'Segoe UI',Arial,sans-serif;background:#101018;color:#e8e8f0;margin:0}
a{color:#8ab4ff}h1{font-size:22px}h2{font-size:17px;color:#c9b8ff}
.wrap{max-width:920px;margin:0 auto;padding:18px}
.pbar{display:flex;align-items:center;gap:12px;background:#171724;padding:8px 14px;border-bottom:2px solid #5b4bdb}
.pbar img{height:28px}.plab{font-weight:700;letter-spacing:.4px}.pstat{color:#aef0c0;font-weight:600}
.pmeter{flex:1;height:8px;background:#2a2a3c;border-radius:4px;overflow:hidden}.pmeter span{display:block;height:100%;background:linear-gradient(90deg,#3d7bfd,#9b5bff)}
nav{display:flex;gap:14px;align-items:center;background:#14141f;padding:8px 14px;flex-wrap:wrap}
nav .who{color:#9a9ab0;margin-left:auto;font-size:13px}
.card{background:#171724;border:1px solid #2c2c44;border-radius:10px;padding:14px 16px;margin:12px 0}
input,select,textarea{background:#0d0d16;color:#eee;border:1px solid #3a3a55;border-radius:6px;padding:7px 9px;margin:3px 0;width:100%;box-sizing:border-box}
button,.btn{background:#5b4bdb;color:#fff;border:0;border-radius:6px;padding:8px 14px;cursor:pointer;text-decoration:none;display:inline-block}
.btn2{background:#2c2c44}
table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #2c2c44;padding:6px 8px;text-align:left;font-size:14px}
.err{background:#4d1f28;border:1px solid #a33;padding:9px 12px;border-radius:8px;margin:10px 0}
.ok{background:#173d24;border:1px solid #2a7;padding:9px 12px;border-radius:8px;margin:10px 0}
.tag{display:inline-block;background:#2c2c44;border-radius:10px;padding:1px 8px;font-size:12px;margin-right:5px}
pre{background:#0d0d16;border:1px solid #2c2c44;border-radius:8px;padding:10px 12px;overflow-x:auto;font-size:13px;white-space:pre-wrap}
.done{color:#7ee2a0}.open{color:#f0c96a}
#chatbox{position:fixed;right:14px;bottom:14px;width:320px;background:#171724;border:1px solid #5b4bdb;border-radius:12px;overflow:hidden;z-index:50}
#chatbox header{background:#5b4bdb;color:#fff;padding:8px 12px;font-weight:700;cursor:pointer}
#chatlog{height:210px;overflow-y:auto;padding:10px;font-size:13px;display:none}
#chatlog div{margin:6px 0}#chatlog .me{text-align:right;color:#aef0c0}#chatlog .bot{color:#dcd6ff}
#chatform{display:none;border-top:1px solid #2c2c44}#chatform input{border:0;border-radius:0}
.hintbox{background:#10101c;border:1px dashed #3a3a55;border-radius:8px;padding:8px 12px;margin:6px 0;font-size:13px}
</style></head><body>
${opts.noBar ? '' : bar}${opts.noNav ? '' : nav}
<div class="wrap">${body}</div>
<div id="chatbox"><header onclick="var l=document.getElementById('chatlog'),f=document.getElementById('chatform');var open=l.style.display==='block';l.style.display=open?'none':'block';f.style.display=open?'none':'flex'">🤖 Lab Coach — ask me</header>
<div id="chatlog"><div class="bot">Hi! I am the HexaDeploy Lab Coach. Ask me what this lab contains, how a feature is tested (after you have tried it 3 times), or who built these labs.</div></div>
<form id="chatform" onsubmit="event.preventDefault();var i=document.getElementById('chatin');var m=i.value;i.value='';var l=document.getElementById('chatlog');l.innerHTML+='<div class=me></div>';l.lastChild.textContent=m;fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})}).then(r=>r.json()).then(j=>{l.innerHTML+='<div class=bot></div>';l.lastChild.textContent=j.reply;l.scrollTop=l.scrollHeight;});" style="display:none">
<input id="chatin" placeholder="Ask the coach…" autocomplete="off"></form></div>
</body></html>`;
}
function gatePage(req, err) {
  const body = `<div class="card" style="max-width:520px;margin:40px auto;text-align:center">
  <img src="/logo.png" style="height:56px"><h1>LAB ${LAB_NUMBER} — ${LAB_NAME}</h1>
  <p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
  ${err ? '<div class="err">' + esc(err) + '</div>' : ''}
  <form method="POST" action="/unlock"><input name="key" placeholder="Completion key from Lab ${LAB_NUMBER - 1}" autocomplete="off"><button style="width:100%">Unlock Lab ${LAB_NUMBER}</button></form>
  <p style="color:#9a9ab0;font-size:13px">Complete the previous lab 100% to earn its key. Keys are never written in plain form anywhere in this app.</p></div>`;
  return layout(req, 'Locked', body, {});
}

/* ------------------------------ auth pages ------------------------------ */
function loginPage(req, err) {
  return layout(req, 'Login', `<h1>Sign in to HexaDeploy</h1>
  ${err ? '<div class="err">' + esc(err) + '</div>' : ''}
  <div class="card"><form method="POST" action="/login">
  <label>Email</label><input name="email" type="email" required>
  <label>Password</label><input name="password" type="password" required>
  <button style="width:100%">Sign in</button></form>
  <p><a href="/forgot">Forgot your password?</a> · <a href="/register">Create an account</a></p></div>`, {});
}
function registerPage(req, err) {
  return layout(req, 'Register', `<h1>Create your HexaDeploy account</h1>
  ${err ? '<div class="err">' + esc(err) + '</div>' : ''}
  <div class="card"><form method="POST" action="/register">
  <label>Full name</label><input name="name" required>
  <label>Email</label><input name="email" type="email" required>
  <label>Password</label><input name="password" type="password" required>
  <button style="width:100%">Create account</button></form></div>`, {});
}

async function handleLogin(req, res) {
  const b = await parseBody(req);
  const sess = getSession(req);
  attempt('Login & Authentication');
  const email = String(b.email || '').toLowerCase();
  const password = String(b.password || '');
  /* VULN(sqli-login): the "legacy query" is built by string concatenation:
     SELECT * FROM users WHERE email='<email>' AND password='<password>' */
  if (INJ_RE.test(email) || INJ_RE.test(password)) {
    const admin = users.find(u => u.role === 'admin') || users[0];
    if (admin) {
      newSession(res, admin.id);
      addCookie(res, 'hx_role=' + admin.role + '; Path=/; SameSite=Lax');
      pass('sqli-login');
      return redirect(res, '/projects');
    }
  }
  const user = userByEmail(email);
  if (!user) {
    sess.data.enumMiss = true; enumCheck(sess.data);
    return send(res, 200, loginPage(req, 'No account found for that email.'));
  }
  if (user.password !== password) {
    failedLogins[email] = (failedLogins[email] || 0) + 1;
    if (failedLogins[email] >= 10) pass('brute-force');
    sess.data.enumHit = true; enumCheck(sess.data);
    return send(res, 200, loginPage(req, 'Incorrect password for that account.'));
  }
  if (user.email === 'demo@hexadeploy.local') pass('default-creds');
  newSession(res, user.id);
  addCookie(res, 'hx_role=' + user.role + '; Path=/; SameSite=Lax');
  return redirect(res, '/projects');
}

async function handleRegister(req, res) {
  const b = await parseBody(req);
  attempt('Registration & Profile');
  const name = String(b.name || '').trim();
  const email = String(b.email || '').toLowerCase().trim();
  const password = String(b.password || '');
  if (!name || !email || !password) return send(res, 200, registerPage(req, 'All fields are required.'));
  if (userByEmail(email)) return send(res, 200, registerPage(req, 'That email is already registered.'));
  /* VULN(mass-assignment): the whole body is bound to the account, role included. */
  const role = b.role === 'admin' ? 'admin' : 'user';
  const nu = { id: ++uidSeq, name, email, password, role };
  users.push(nu);
  if (b.role !== undefined && role === 'admin') pass('mass-assignment');
  if (password.length < 6) pass('weak-password'); /* VULN: no password policy at all */
  if (XSS_RE.test(name)) pass('stored-xss-name'); /* VULN: name stored raw, rendered raw */
  newSession(res, nu.id);
  addCookie(res, 'hx_role=' + nu.role + '; Path=/; SameSite=Lax');
  return redirect(res, '/projects');
}

async function handleForgot(req, res) {
  const b = await parseBody(req);
  const sess = getSession(req);
  attempt('Login & Authentication');
  const user = userByEmail(String(b.email || '').toLowerCase());
  let msg;
  if (!user) {
    sess.data.enumMiss = true; enumCheck(sess.data);
    msg = '<div class="err">No account with that email — nothing was sent.</div>';
  } else {
    sess.data.enumHit = true; enumCheck(sess.data);
    issuedTokens.set(resetTokenFor(user), sess.sid);
    msg = '<div class="ok">Reset link sent — check your inbox for the token link.</div>';
  }
  return send(res, 200, layout(req, 'Forgot password', `<h1>Forgot password</h1><div class="card">${msg}
  <p>Have a token? <a href="/reset">Reset your password</a></p></div>`, {}));
}

async function handleReset(req, res) {
  const b = await parseBody(req);
  const sess = getSession(req);
  attempt('Login & Authentication');
  const user = userByEmail(String(b.email || '').toLowerCase());
  const token = String(b.token || '');
  const now = Math.floor(Date.now() / 60000);
  let ok = false;
  if (user) {
    for (const m of [now, now - 1]) {
      if (token === 'rst-' + user.id + '-' + m) { ok = true; break; }
    }
  }
  if (!ok || !b.newpassword) {
    return send(res, 200, layout(req, 'Reset password', `<h1>Reset password</h1><div class="err">Invalid or expired token.</div>
    <div class="card"><form method="POST" action="/reset"><label>Email</label><input name="email"><label>Reset token</label><input name="token"><label>New password</label><input name="newpassword" type="password"><button>Reset password</button></form></div>`, {}));
  }
  /* VULN(reset-token): tokens are rst-<id>-<minute> — forgeable. If this token
     was not issued to THIS session via /forgot, it was computed, not received. */
  if (issuedTokens.get(token) !== sess.sid) pass('reset-token');
  user.password = String(b.newpassword);
  return redirect(res, '/login');
}

/* ------------------------------ profile ------------------------------ */
function profilePage(req, msg) {
  const sess = getSession(req);
  const me = userById(sess.data.uid);
  const tok = sess.cookies.hx_tok || '';
  return layout(req, 'Profile', `<h1>Your profile</h1>${msg || ''}
  <div class="card"><form method="POST" action="/profile">
  <input type="hidden" name="hx_tok" value="${esc(tok)}">
  <label>Display name</label><input name="name" value="${esc(me.name)}">
  <label>Email</label><input value="${esc(me.email)}" disabled>
  <label>Platform role</label><input value="${esc(me.role)}" disabled>
  <button>Save profile</button></form></div>`, {});
}
async function handleProfile(req, res) {
  const b = await parseBody(req);
  const sess = getSession(req);
  const me = userById(sess.data.uid);
  attempt('Registration & Profile');
  if (b.name) me.name = String(b.name);
  if (XSS_RE.test(me.name)) pass('stored-xss-name');
  if (b.role !== undefined) { /* VULN(mass-assignment) on profile too */
    me.role = b.role === 'admin' ? 'admin' : 'user';
    if (me.role === 'admin') pass('mass-assignment');
  }
  /* VULN(profile-csrf): hx_tok is rendered in the form but never verified;
     a cross-site post (foreign Origin, no token) changes state just the same. */
  const origin = req.headers.origin || req.headers.referer || '';
  const foreign = !!origin && !origin.includes(req.headers.host || '');
  const tokOk = b.hx_tok && sess.cookies.hx_tok && b.hx_tok === sess.cookies.hx_tok;
  if (!tokOk || foreign) pass('profile-csrf');
  return send(res, 200, profilePage(req, '<div class="ok">Profile saved.</div>'));
}

/* ------------------------------ projects ------------------------------ */
function myProjectsPage(req) {
  const sess = getSession(req);
  const me = userById(sess.data.uid);
  const mine = projects.filter(p => isMember(p, me.id));
  const rows = mine.map(p => `<tr><td><a href="/projects/${p.id}">${esc(p.name)}</a></td><td>${esc(p.desc)}</td><td>${esc(memberRole(p, me.id))}</td><td>${Object.keys(p.members).length}</td></tr>`).join('');
  return layout(req, 'Projects', `<h1>Your projects</h1>
  <div class="card"><table><tr><th>Project</th><th>Description</th><th>Your role</th><th>Members</th></tr>${rows || '<tr><td colspan="4">No projects yet.</td></tr>'}</table></div>
  <div class="card"><h2>Create a project</h2><form method="POST" action="/projects"><label>Name</label><input name="name" required><label>Description</label><input name="desc"><button>Create project</button></form></div>`, {});
}
function projectPage(req, p) {
  const penvs = envs.filter(e => e.projectId === p.id);
  const pbuilds = builds.filter(b => b.projectId === p.id);
  const pdeploys = deploys.filter(d => d.projectId === p.id);
  const phooks = webhooks.filter(w => w.projectId === p.id);
  const envRows = penvs.map(e => `<tr><td><a href="/envs/${e.id}">${esc(e.name)}</a></td><td>${esc(e.kind)}</td><td>${Object.keys(e.vars).length} variables</td><td><a href="/share/share-${e.id}">share link</a></td></tr>`).join('');
  const buildRows = pbuilds.map(b => {
    const e = envById(b.envId);
    return `<tr><td>${esc(b.version)}</td><td>${esc(e ? e.name : '?')}</td><td>${esc(b.status)}</td><td>${esc((userById(b.byId) || {}).email || '')}</td><td><a href="/builds/${b.id}/log">view log</a></td></tr>`;
  }).join('');
  const buildOpts = pbuilds.map(b => `<option value="${b.id}">${esc(b.version)} (${esc(b.status)})</option>`).join('');
  const envOpts = penvs.map(e => `<option value="${e.id}">${esc(e.name)} (${esc(e.kind)})</option>`).join('');
  const deployRows = pdeploys.map(d => {
    const e = envById(d.envId); const b = buildById(d.buildId);
    /* NOTE: deployer names are rendered RAW — a stored-xss-name sink. */
    const by = userById(d.byId);
    return `<tr><td>${esc(b ? b.version : '?')}</td><td>${esc(e ? e.name : '?')}</td><td>${esc(d.status)}</td><td>${by ? by.name : '?'}</td><td>${esc(d.note)}</td><td><form method="POST" action="/deploys/${d.id}/rollback" style="display:inline"><button class="btn2">Roll back</button></form></td></tr>`;
  }).join('');
  const hookRows = phooks.map(w => `<tr><td>${esc(w.url)}</td><td>${esc(w.events)}</td><td>${esc(w.secret)}</td></tr>`).join('');
  const memberRows = Object.keys(p.members).map(id => {
    const u = userById(id);
    if (!u) return '';
    /* NOTE: member names are rendered RAW here — that is the stored-xss-name sink. */
    return `<tr><td>${u.name}</td><td>${esc(u.email)}</td><td>${esc(p.members[id])}</td>
    <td><form method="POST" action="/projects/${p.id}/members/role" style="display:inline"><input type="hidden" name="userId" value="${u.id}">
    <select name="role" style="width:auto"><option>viewer</option><option>developer</option><option>owner</option></select><button class="btn2">Set role</button></form>
    <form method="POST" action="/projects/${p.id}/members/remove" style="display:inline"><input type="hidden" name="userId" value="${u.id}"><button class="btn2">Remove</button></form></td></tr>`;
  }).join('');
  return layout(req, p.name, `<h1>${esc(p.name)}</h1><p>${esc(p.desc)}</p>
  <div class="card"><h2>Project settings</h2><form method="POST" action="/projects/${p.id}/update"><label>Name</label><input name="name" value="${esc(p.name)}"><label>Description</label><input name="desc" value="${esc(p.desc)}"><button>Save settings</button></form>
  <form method="POST" action="/projects/${p.id}/delete" onsubmit="return confirm('Delete this project?')"><button class="btn2">Delete project</button></form></div>
  <div class="card"><h2>Environments</h2><table><tr><th>Name</th><th>Kind</th><th>Variables</th><th>Share</th></tr>${envRows || '<tr><td colspan="4">None</td></tr>'}</table>
  <form method="POST" action="/projects/${p.id}/envs"><label>New environment name</label><input name="name" required><label>Kind</label><select name="kind"><option>development</option><option>staging</option><option>production</option></select><button>Add environment</button></form></div>
  <div class="card"><h2>Builds</h2><table><tr><th>Version</th><th>Environment</th><th>Status</th><th>By</th><th>Log</th></tr>${buildRows || '<tr><td colspan="5">No builds yet</td></tr>'}</table>
  <form method="POST" action="/projects/${p.id}/builds"><label>Version string</label><input name="version" placeholder="v1.2.3" required><label>Environment</label><select name="envId">${envOpts}</select><button>Trigger build</button></form></div>
  <div class="card"><h2>Deploy</h2><form method="POST" action="/projects/${p.id}/deploy"><label>Environment</label><select name="envId">${envOpts}</select><label>Build</label><select name="buildId">${buildOpts}</select><label>Note</label><input name="note" placeholder="Release note"><button>Deploy now</button></form>
  <h2>Deploy history</h2><table><tr><th>Version</th><th>Environment</th><th>Status</th><th>By</th><th>Note</th><th></th></tr>${deployRows || '<tr><td colspan="6">No deploys yet</td></tr>'}</table></div>
  <div class="card"><h2>Webhooks</h2><table><tr><th>URL</th><th>Events</th><th>Signing secret</th></tr>${hookRows || '<tr><td colspan="3">None</td></tr>'}</table></div>
  <div class="card"><h2>Team</h2><table><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr>${memberRows}</table>
  <form method="POST" action="/projects/${p.id}/members/add"><label>Add member by email</label><input name="email" placeholder="teammate@example.com"><button>Add as viewer</button></form></div>`, {});
}

/* ------------------------------ environments ------------------------------ */
function envVarsText(e) {
  return Object.keys(e.vars).map(k => k + '=' + e.vars[k]).join('\n');
}
function envPage(req, e) {
  const p = projectById(e.projectId);
  const rows = Object.keys(e.vars).map(k => `<tr><td>${esc(k)}</td><td>${esc(e.vars[k])}</td></tr>`).join('');
  return layout(req, e.name, `<h1>${esc(p ? p.name : '')} — ${esc(e.name)}</h1>
  <p>Kind: <b>${esc(e.kind)}</b> · Share link: <a href="/share/share-${e.id}">/share/share-${e.id}</a></p>
  <div class="card"><h2>Variables</h2><table><tr><th>Key</th><th>Value</th></tr>${rows || '<tr><td colspan="2">No variables</td></tr>'}</table></div>
  <div class="card"><h2>Update variables</h2><form method="POST" action="/envs/${e.id}/update">
  <label>Variables (one KEY=value per line — submitted values replace the set)</label>
  <textarea name="vars" rows="6">${esc(envVarsText(e))}</textarea><button>Save variables</button></form></div>`, {});
}

/* ------------------------------ search ------------------------------ */
function searchPage(req, q) {
  const needle = String(q || '').toLowerCase();
  let disclosure = false;
  const sess = getSession(req);
  const me = sess.data.uid ? userById(sess.data.uid) : null;
  const pres = projects.filter(p => !needle || p.name.toLowerCase().includes(needle) || p.desc.toLowerCase().includes(needle));
  const eres = envs.filter(e => !needle || e.name.toLowerCase().includes(needle) || e.kind.toLowerCase().includes(needle));
  const bres = builds.filter(b => !needle || b.version.toLowerCase().includes(needle));
  /* VULN(search-disclosure): results are NOT scoped by membership. */
  if (me && needle) {
    if (pres.some(p => !isMember(p, me.id))
      || eres.some(e => { const p = projectById(e.projectId); return p && !isMember(p, me.id); })
      || bres.some(b => { const p = projectById(b.projectId); return p && !isMember(p, me.id); })) disclosure = true;
  }
  if (disclosure) pass('search-disclosure');
  const items = pres.map(p => `<li>📁 <a href="/projects/${p.id}">${esc(p.name)}</a> — ${esc(p.desc)}</li>`).join('')
    + eres.map(e => `<li>🌐 <a href="/envs/${e.id}">${esc(e.name)}</a> (${esc(e.kind)}) — project ${e.projectId}</li>`).join('')
    + bres.map(b => `<li>🔨 <a href="/builds/${b.id}/log">${esc(b.version)}</a> build log — project ${b.projectId}</li>`).join('');
  return layout(req, 'Search', `<h1>Search</h1>
  <div class="card"><form method="GET" action="/search"><input name="q" value="${esc(q || '')}" placeholder="Search projects, environments and builds"><button>Search</button></form></div>
  ${q !== undefined ? `<div class="card"><h2>Results for: ${esc(String(q || ''))}</h2><ul>${items || '<li>No results.</li>'}</ul></div>` : ''}`, {});
}

/* ------------------------------ API docs ------------------------------ */
const API_DEMO_KEY = 'hxdeploy-demo-key-2024';
function apiDocsPage(req) {
  return layout(req, 'API Docs', `<h1>HexaDeploy API</h1>
  <div class="card"><h2>Endpoints</h2>
  <p><code>GET /api/projects</code> — list all projects with environments. Requires the <code>x-api-key</code> header.</p>
  <p><code>GET /api/users</code> — user directory (internal).</p>
  <h2>Demo key</h2>
  <p>For trying the API quickly, use our shared demo key (read access):</p>
  <pre>x-api-key: ${API_DEMO_KEY}</pre>
  <p style="color:#9a9ab0;font-size:13px">Example: <code>curl -H "x-api-key: ${API_DEMO_KEY}" http://127.0.0.1:${PORT}/api/projects</code></p></div>`, {});
}

/* ------------------------------ admin ------------------------------ */
const _cfragB = ['VDNCMw==', 'LTZMRg=='];
function completionKey() { return _asm(_cfragA.concat(_cfragB, _cfragC)); }
function adminGate(req) {
  const sess = getSession(req);
  return sess.cookies.hx_role === 'admin'; /* VULN: the gate trusts the client cookie */
}
function adminPage(req) {
  const uRows = users.map(u => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td></tr>`).join('');
  const pRows = projects.map(p => `<tr><td>${esc(p.name)}</td><td>${esc((userById(p.ownerId) || {}).email || '')}</td><td>${Object.keys(p.members).length}</td></tr>`).join('');
  return layout(req, 'Admin', `<h1>Platform admin</h1>
  <div class="card"><h2>All users</h2><table><tr><th>Name</th><th>Email</th><th>Role</th></tr>${uRows}</table></div>
  <div class="card"><h2>All projects</h2><table><tr><th>Project</th><th>Owner</th><th>Members</th></tr>${pRows}</table>
  <p>Deploys on record: ${deploys.length}</p>
  <p><a href="/admin/purge" onclick="return confirm('Purge deploy history?')">Purge deploy history</a></p>
  <p style="color:#9a9ab0;font-size:13px">Purging is a plain GET link — no token, no second confirmation.</p></div>`, {});
}

/* ------------------------------ /tests page ------------------------------ */
function testsPage(req) {
  const s = progressSummary();
  const blocks = FEATURES.map(f => {
    const ts = TESTS.filter(t => t.feature === f);
    if (!ts.length) return '';
    const rows = ts.map(t => {
      const done = !!progress.tests[t.id];
      const hints = t.hints.map((h, i) => `<details class="hintbox"><summary>Hint ${i + 1}</summary>${esc(h)}</details>`).join('');
      return `<div class="card"><b>${esc(t.name)}</b> <span class="tag">${esc(t.owasp)}</span><span class="tag">${esc(t.difficulty)}</span>
      <span class="${done ? 'done' : 'open'}">${done ? '✓ done' : '○ open'}</span>
      <div style="color:#9a9ab0;font-size:13px">Attempts on this feature so far: ${progress.attempts[f] || 0} (3+ unlock the coach's step-by-step help)</div>${hints}</div>`;
    }).join('');
    return `<h2>${esc(f)} — ${ts.filter(t => progress.tests[t.id]).length}/${ts.length}</h2>${rows}`;
  }).join('');
  return layout(req, 'Mission — Tests', `<h1>🎯 Mission: ${LAB_NAME} security tests</h1>
  <p>Progress: <b>${s.done}/${s.total} · ${s.pct}%</b>. Tests complete by DOING — the server detects the real exploit effect. There is no "mark done".</p>${blocks}`, {});
}

/* ------------------------------ chatbot ------------------------------ */
const _cfragC = ['STNJSQ==', 'Vkg1Qg=='];
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
function chatReply(message) {
  const msg = String(message || '');
  const low = msg.toLowerCase();
  const s = progressSummary();
  if (/who (built|made|created)|founder|who is behind|your creator/.test(low)) return ATTRIBUTION;
  if (low.includes('key') && /key|unlock|next lab/.test(low)) {
    if (s.complete && progress.keyRevealed) return 'You completed this lab 100% — here is the completion key for the next lab: ' + completionKey();
    return "I don't have the completion key yet — nobody does. It is only created for me when this lab is completed 100%. You are at " + s.pct + '% (' + s.done + '/' + s.total + ' tests). Finish every test and ask me again.';
  }
  /* match a specific test by its keys */
  let test = TESTS.find(t => t.keys.some(k => low.includes(k)));
  let feature = test ? test.feature : null;
  if (!feature) {
    feature = FEATURES.find(f => low.includes(f.toLowerCase()) || low.includes(f.toLowerCase().split(' ')[0]));
  }
  if (/how many|count|list|what tests|which tests|features/.test(low) || (feature && !/how|guide|help|do it|solve|step/.test(low))) {
    if (feature) {
      const ts = TESTS.filter(t => t.feature === feature);
      return feature + ' has ' + ts.length + ' tests: ' + ts.map(t => t.name + (progress.tests[t.id] ? ' ✓' : '')).join(' · ') + '. Attempts on this feature so far: ' + (progress.attempts[feature] || 0) + '.';
    }
    return 'This lab has ' + s.total + ' tests across ' + FEATURES.length + ' features: ' + FEATURES.map(f => f + ' (' + TESTS.filter(t => t.feature === f).length + ')').join(' · ') + '. You have completed ' + s.done + '/' + s.total + ' (' + s.pct + '%). Open the 🎯 Tests page for the full mission list.';
  }
  if (/progress|status|how am i|score/.test(low)) {
    const next = TESTS.find(t => !progress.tests[t.id]);
    return 'You are at ' + s.pct + '% — ' + s.done + '/' + s.total + ' tests done.' + (next ? ' Next open test: "' + next.name + '" in ' + next.feature + '.' : ' Everything is complete — visit /complete for your debrief, key and certificate.');
  }
  if (/how|guide|help|solve|step|hint|stuck/.test(low) || test || feature) {
    if (!feature) return 'Tell me which feature you are working on (for example "Environments & Secrets") and I will check whether you have unlocked my step-by-step help for it.';
    if (!test) test = TESTS.find(t => t.feature === feature && !progress.tests[t.id]) || TESTS.find(t => t.feature === feature);
    const tries = progress.attempts[feature] || 0;
    if (progress.tests[test.id]) return '"' + test.name + '" is already complete ✓. Here is how it was done: ' + test.guide;
    if (tries >= 3) return 'Here is the step-by-step for "' + test.name + '": ' + test.guide;
    return 'That feature is locked for help. First try the ' + feature + ' tests yourself at least 3 times — I can see you have tried ' + tries + ' time(s) so far. After 3 real tries, ask me again and I will guide you step by step.';
  }
  if (/^(hi|hello|hey|hello there)/.test(low) || low.length < 4) {
    const next = TESTS.find(t => !progress.tests[t.id]);
    return 'Hi! This is LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ', a deployment platform with ' + s.total + ' security tests across ' + FEATURES.length + ' features. You are at ' + s.pct + '%.' + (next ? ' A good next target: "' + next.name + '" (' + next.feature + ').' : '') + ' Ask me what a feature contains, or — after 3 tries on a feature — how to solve one of its tests.';
  }
  return 'I can tell you what this lab contains (ask "how many tests" or name a feature), report your progress, and — once you have tried a feature at least 3 times — guide you step by step through its tests. The 🎯 Tests page shows every test with graded hints.';
}

/* ------------------------------ /complete & /certificate ------------------------------ */
function completePage(req) {
  const s = progressSummary();
  if (!s.complete) {
    const left = TESTS.filter(t => !progress.tests[t.id]).map(t => `<li>${esc(t.name)} <span class="tag">${esc(t.feature)}</span></li>`).join('');
    return layout(req, 'Completion', `<h1>Not complete yet</h1>
    <div class="card"><p>You are at <b>${s.pct}%</b> (${s.done}/${s.total} tests). The completion debrief, your key and the certificate unlock at 100%.</p>
    <h2>Still open</h2><ul>${left}</ul><p><a href="/tests">Go to the mission page →</a></p></div>`, {});
  }
  const counts = FEATURES.map(f => `<tr><td>${esc(f)}</td><td>${TESTS.filter(t => t.feature === f).length}</td></tr>`).join('');
  const ways = TESTS.map(t => `<li>${esc(t.name)} <span class="tag">${esc(t.owasp)}</span></li>`).join('');
  const learned = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('');
  const client = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('');
  const reports = TESTS.map(t => `<li><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)}. Remediation: ${esc(t.report.remediation)}</li>`).join('');
  const key = completionKey();
  return layout(req, 'Lab complete', `<h1>🏆 Lab ${LAB_NUMBER} — ${LAB_NAME}: 100% complete</h1>
  <div class="card"><h2>1 · What this lab contains</h2><p>${FEATURES.length} features, ${s.total} scored security tests.</p><table><tr><th>Feature</th><th>Tests</th></tr>${counts}</table></div>
  <div class="card"><h2>2 · Vulnerabilities per feature</h2><p>See the table above — every feature was tested with every technique that applies to it.</p></div>
  <div class="card"><h2>3 · How testing was done (${s.total} techniques)</h2><ul>${ways}</ul></div>
  <div class="card"><h2>4 · What you learned</h2><ul>${learned}</ul></div>
  <div class="card"><h2>5 · What this means for a real client</h2><ul>${client}</ul></div>
  <div class="card"><h2>6 · Writing it in a real report</h2><ul>${reports}</ul></div>
  <div class="card" style="text-align:center"><h2>🔑 Completion key — unlocks Lab ${LAB_NUMBER + 1}</h2>
  <p style="font-size:20px;letter-spacing:1px"><b>${esc(key)}</b></p>
  <form method="POST" action="/complete"><label>Your name (for the certificate)</label><input name="name" value="${esc(progress.testerName || '')}" style="max-width:340px;margin:0 auto"><button>Save name</button></form>
  <p><a class="btn" href="/certificate">🎓 View your certificate</a></p></div>`, {});
}
function certificatePage(req) {
  const s = progressSummary();
  const name = progress.testerName || 'HexaCyberLab Tester';
  const date = progress.completedAt ? new Date(progress.completedAt).toISOString().slice(0, 10) : '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate · LAB ${LAB_NUMBER} — ${LAB_NAME}</title>
  <style>body{background:#22222e;font-family:Georgia,serif}.cert{background:#fff;color:#111;border-radius:14px;padding:40px;text-align:center;max-width:660px;margin:30px auto;border:6px double #5b4bdb}img{height:70px}h1{letter-spacing:2px}.sig{margin-top:26px;color:#444;font-size:14px}@media print{body{background:#fff}}</style></head>
  <body><div class="cert"><img src="/logo.png" alt="HexaCyberLab">
  <h1>CERTIFICATE OF COMPLETION</h1>
  <p>This certifies that</p><h2>${esc(name)}</h2>
  <p>has completed 100% of the security tests in</p>
  <h2>LAB ${LAB_NUMBER} — ${LAB_NAME}</h2>
  <p>${s.total} tests across ${FEATURES.length} features · Completed ${esc(date)}</p>
  <p class="sig">HexaCyberLab — Built by Md. Jony Hassain, Founder</p>
  <p><button onclick="window.print()">Print</button></p></div></body></html>`;
}

/* ------------------------------ router ------------------------------ */
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    const pathname = url.pathname;
    const method = req.method;

    if (pathname === '/logo.png') {
      if (fs.existsSync(LOGO_FILE)) {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        return res.end(fs.readFileSync(LOGO_FILE));
      }
      return send(res, 404, 'logo missing');
    }
    if (pathname === '/api/chat' && method === 'POST') {
      ensureSession(req, res);
      const b = await parseBody(req);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ reply: chatReply(b.message) }));
    }
    if (pathname === '/unlock' && method === 'POST') {
      const b = await parseBody(req);
      if (String(b.key || '') === entryKey()) {
        progress.unlocked = true; saveProgress();
        return redirect(res, '/');
      }
      res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(gatePage(req, 'That key did not work — the lab stays locked.'));
    }
    if (!progress.unlocked) {
      ensureSession(req, res);
      return send(res, 200, gatePage(req, null));
    }

    ensureSession(req, res);
    const sess = getSession(req);
    const me = sess.data.uid ? userById(sess.data.uid) : null;
    const needLogin = () => redirect(res, '/login');

    if (pathname === '/') return redirect(res, me ? '/projects' : '/login');
    if (pathname === '/login' && method === 'GET') return send(res, 200, me ? loginPage(req, 'You are already signed in.') : loginPage(req, null));
    if (pathname === '/login' && method === 'POST') return handleLogin(req, res);
    if (pathname === '/register' && method === 'GET') return send(res, 200, registerPage(req, null));
    if (pathname === '/register' && method === 'POST') return handleRegister(req, res);
    if (pathname === '/forgot' && method === 'GET') return send(res, 200, layout(req, 'Forgot password', `<h1>Forgot password</h1><div class="card"><form method="POST" action="/forgot"><label>Email</label><input name="email" type="email" required><button>Send reset link</button></form><p><a href="/reset">I already have a token</a></p></div>`, {}));
    if (pathname === '/forgot' && method === 'POST') return handleForgot(req, res);
    if (pathname === '/reset' && method === 'GET') return send(res, 200, layout(req, 'Reset password', `<h1>Reset password</h1><div class="card"><form method="POST" action="/reset"><label>Email</label><input name="email"><label>Reset token</label><input name="token"><label>New password</label><input name="newpassword" type="password"><button>Reset password</button></form></div>`, {}));
    if (pathname === '/reset' && method === 'POST') return handleReset(req, res);
    if (pathname === '/logout') {
      if (sess.sid) sessions.delete(sess.sid);
      addCookie(res, 'hx_session=; Path=/; Max-Age=0');
      addCookie(res, 'hx_role=; Path=/; Max-Age=0');
      return redirect(res, '/login');
    }
    if (pathname === '/api/progress') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(progressSummary()));
    }
    if (pathname === '/api/users') {
      attempt('Platform & API');
      pass('api-user-dump'); /* VULN: no auth, passwords included */
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(users.map(u => ({ id: u.id, name: u.name, email: u.email, password: u.password, role: u.role })), null, 1));
    }
    if (pathname === '/api/projects') {
      attempt('Platform & API');
      if (String(req.headers['x-api-key'] || '') !== API_DEMO_KEY) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'missing or invalid x-api-key — see /api-docs' }));
      }
      pass('api-weak-key'); /* VULN: a documented static demo key reads everything, secrets included */
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(projects.map(p => ({
        id: p.id, name: p.name, desc: p.desc, owner: p.ownerId, members: p.members,
        environments: envs.filter(e => e.projectId === p.id).map(e => ({ id: e.id, name: e.name, kind: e.kind, vars: e.vars })),
      })), null, 1));
    }
    if (pathname === '/api-docs' && method === 'GET') return send(res, 200, apiDocsPage(req));
    let m;
    if ((m = pathname.match(/^\/share\/([^/]+)$/)) && method === 'GET') {
      attempt('Platform & API');
      const token = decodeURIComponent(m[1]);
      const tm = token.match(/^share-(\d+)$/);
      const e = tm ? envById(tm[1]) : null;
      const data = sess.data;
      if (!Array.isArray(data.shareProbes)) data.shareProbes = [];
      if (tm && !data.shareProbes.includes(Number(tm[1]))) data.shareProbes.push(Number(tm[1]));
      if (data.shareProbes.length >= 5) pass('share-token-enum'); /* VULN: tokens are sequential env ids */
      if (!e) return send(res, 404, layout(req, 'Not found', '<h1>Share link not found</h1>', {}));
      const p = projectById(e.projectId);
      const rows = Object.keys(e.vars).map(k => `<tr><td>${esc(k)}</td><td>${esc(e.vars[k])}</td></tr>`).join('');
      return send(res, 200, layout(req, 'Shared environment', `<h1>Shared environment — ${esc(p ? p.name : '')} / ${esc(e.name)}</h1>
      <p>Kind: <b>${esc(e.kind)}</b> · Shared read-only view (no login required).</p>
      <div class="card"><table><tr><th>Key</th><th>Value</th></tr>${rows}</table></div>`, {}));
    }
    if (pathname === '/tests' && method === 'GET') return send(res, 200, testsPage(req));
    if (pathname === '/complete' && method === 'GET') return send(res, 200, completePage(req));
    if (pathname === '/complete' && method === 'POST') {
      const b = await parseBody(req);
      if (b.name) { progress.testerName = String(b.name).slice(0, 60); saveProgress(); }
      return redirect(res, '/certificate');
    }
    if (pathname === '/certificate' && method === 'GET') {
      if (!progressSummary().complete) return redirect(res, '/complete');
      return send(res, 200, certificatePage(req));
    }

    if (!me) return needLogin();

    if (pathname === '/profile' && method === 'GET') return send(res, 200, profilePage(req, null));
    if (pathname === '/profile' && method === 'POST') return handleProfile(req, res);

    if (pathname === '/projects' && method === 'GET') return send(res, 200, myProjectsPage(req));
    if (pathname === '/projects' && method === 'POST') {
      const b = await parseBody(req);
      const np = { id: ++projSeq, name: String(b.name || 'Untitled project'), desc: String(b.desc || ''), ownerId: me.id, members: {} };
      np.members[me.id] = 'owner';
      projects.push(np);
      return redirect(res, '/projects/' + np.id);
    }
    if ((m = pathname.match(/^\/projects\/(\d+)$/)) && method === 'GET') {
      const p = projectById(m[1]);
      if (!p) return send(res, 404, layout(req, 'Not found', '<h1>Project not found</h1>', {}));
      attempt('Projects');
      if (!isMember(p, me.id)) pass('project-idor'); /* VULN: detail page never checks membership */
      return send(res, 200, projectPage(req, p));
    }
    if ((m = pathname.match(/^\/projects\/(\d+)\/update$/)) && method === 'POST') {
      const p = projectById(m[1]);
      if (!p) return send(res, 404, 'not found');
      const b = await parseBody(req);
      if (b.name) p.name = String(b.name);
      if (b.desc !== undefined) p.desc = String(b.desc);
      return redirect(res, '/projects/' + p.id);
    }
    if ((m = pathname.match(/^\/projects\/(\d+)\/delete$/)) && method === 'POST') {
      const p = projectById(m[1]);
      if (!p) return send(res, 404, 'not found');
      projects.splice(projects.indexOf(p), 1);
      return redirect(res, '/projects');
    }
    if ((m = pathname.match(/^\/projects\/(\d+)\/members\/add$/)) && method === 'POST') {
      const p = projectById(m[1]);
      if (!p) return send(res, 404, 'not found');
      const b = await parseBody(req);
      attempt('Team & Roles');
      const u = userByEmail(String(b.email || '').toLowerCase());
      if (u && !p.members[u.id]) p.members[u.id] = 'viewer';
      return redirect(res, '/projects/' + p.id);
    }
    if ((m = pathname.match(/^\/projects\/(\d+)\/members\/role$/)) && method === 'POST') {
      const p = projectById(m[1]);
      if (!p) return send(res, 404, 'not found');
      const b = await parseBody(req);
      attempt('Team & Roles');
      const target = Number(b.userId);
      const callerRole = memberRole(p, me.id);
      if (p.members[target] !== undefined && ['owner', 'developer', 'viewer'].includes(String(b.role))) {
        p.members[target] = String(b.role);
        if (callerRole !== 'owner') pass('role-escalation'); /* VULN: anyone can set roles */
      }
      return redirect(res, '/projects/' + p.id);
    }
    if ((m = pathname.match(/^\/projects\/(\d+)\/members\/remove$/)) && method === 'POST') {
      const p = projectById(m[1]);
      if (!p) return send(res, 404, 'not found');
      const b = await parseBody(req);
      attempt('Team & Roles');
      const target = Number(b.userId);
      const callerRole = memberRole(p, me.id);
      if (p.members[target] !== undefined) {
        const wasOwner = p.ownerId === target;
        delete p.members[target];
        if (wasOwner && callerRole !== 'owner') pass('kick-owner'); /* VULN: member ejects the owner */
      }
      return redirect(res, '/projects/' + p.id);
    }
    if ((m = pathname.match(/^\/projects\/(\d+)\/envs$/)) && method === 'POST') {
      const p = projectById(m[1]);
      if (!p) return send(res, 404, 'not found');
      const b = await parseBody(req);
      attempt('Environments & Secrets');
      const kind = ['development', 'staging', 'production'].includes(String(b.kind)) ? String(b.kind) : 'development';
      const ne = { id: ++envSeq, projectId: p.id, name: String(b.name || 'environment'), kind, vars: {} };
      envs.push(ne);
      if (kind === 'production' && memberRole(p, me.id) !== 'owner') pass('env-create-prod'); /* VULN: no owner check on environment creation */
      return redirect(res, '/projects/' + p.id);
    }
    if ((m = pathname.match(/^\/projects\/(\d+)\/builds$/)) && method === 'POST') {
      const p = projectById(m[1]);
      if (!p) return send(res, 404, 'not found');
      const b = await parseBody(req);
      attempt('Builds & Pipelines');
      const version = String(b.version || 'v0.0.0');
      const e = envById(b.envId) || envs.find(x => x.projectId === p.id);
      let log = 'Cloning repository...\nInstalling dependencies...\nBuilding ' + version + '...\nBuild finished OK in 38s.';
      /* VULN(build-log-injection): the raw version string reaches the pipeline
         step unvalidated — a $(...) fragment is "executed" and the step dumps
         the environment into the log. */
      if (/\$\(|`|\r|\n/.test(version)) {
        log = 'Cloning repository...\n$ echo building ' + version + '\nAPI_URL=https://api.nebula.example\nDB_PASSWORD=prod-db-pass-9f3k\nSTRIPE_SECRET_KEY=sk_live_' + '4eC39HqLyjWDarjtT1zdp7dc' + '\nBuilding ' + version + '...\nBuild finished OK in 38s.';
        pass('build-log-injection');
      }
      builds.push({ id: ++buildSeq, projectId: p.id, envId: e ? e.id : null, version, status: 'success', byId: me.id, log });
      return redirect(res, '/projects/' + p.id);
    }
    if ((m = pathname.match(/^\/projects\/(\d+)\/deploy$/)) && method === 'POST') {
      const p = projectById(m[1]);
      if (!p) return send(res, 404, 'not found');
      const b = await parseBody(req);
      attempt('Deployments & Rollback');
      const e = envById(b.envId);
      const bd = buildById(b.buildId);
      if (!e || !bd) return redirect(res, '/projects/' + p.id);
      if (e.kind === 'production' && !prodAccess(p, me.id)) pass('prod-deploy-role'); /* VULN: no production role check on deploy */
      deploys.push({ id: ++deploySeq, projectId: p.id, envId: e.id, buildId: bd.id, byId: me.id, status: 'live', note: String(b.note || 'Deployed via UI') });
      return redirect(res, '/projects/' + p.id);
    }
    if ((m = pathname.match(/^\/envs\/(\d+)$/)) && method === 'GET') {
      const e = envById(m[1]);
      if (!e) return send(res, 404, layout(req, 'Not found', '<h1>Environment not found</h1>', {}));
      attempt('Environments & Secrets');
      const p = projectById(e.projectId);
      if (!p || !isMember(p, me.id)) pass('env-idor'); /* VULN: no project check on environment page */
      return send(res, 200, envPage(req, e));
    }
    if ((m = pathname.match(/^\/envs\/(\d+)\/update$/)) && method === 'POST') {
      const e = envById(m[1]);
      if (!e) return send(res, 404, 'not found');
      const b = await parseBody(req);
      attempt('Environments & Secrets');
      const p = projectById(e.projectId);
      if (e.kind === 'production' && !(p && prodAccess(p, me.id))) pass('secret-tamper'); /* VULN: no production role check on secret writes */
      const vars = {};
      String(b.vars || '').split(/\r?\n/).forEach(line => {
        const i = line.indexOf('=');
        if (i > 0) vars[line.slice(0, i).trim()] = line.slice(i + 1).trim();
      });
      e.vars = vars;
      return redirect(res, '/envs/' + e.id);
    }
    if ((m = pathname.match(/^\/builds\/(\d+)\/log$/)) && method === 'GET') {
      const bd = buildById(m[1]);
      if (!bd) return send(res, 404, layout(req, 'Not found', '<h1>Build not found</h1>', {}));
      attempt('Builds & Pipelines');
      const p = projectById(bd.projectId);
      if (!p || !isMember(p, me.id)) pass('build-idor'); /* VULN: no project check on build logs */
      else if (!prodAccess(p, me.id)) {
        /* VULN(secret-in-build-log): the log printed the production environment */
        const secrets = prodSecretValues();
        if (secrets.some(v => bd.log.includes(v))) pass('secret-in-build-log');
      }
      return send(res, 200, layout(req, 'Build log', `<h1>Build ${esc(bd.version)} — log</h1>
      <p>Project: ${esc(p ? p.name : '?')} · Status: ${esc(bd.status)} · By ${esc((userById(bd.byId) || {}).email || '')}</p>
      <div class="card"><pre>${esc(bd.log)}</pre></div>`, {}));
    }
    if ((m = pathname.match(/^\/deploys\/(\d+)\/rollback$/)) && method === 'POST') {
      const d = deploys.find(x => x.id === Number(m[1]));
      if (!d) return send(res, 404, 'not found');
      attempt('Deployments & Rollback');
      const p = projectById(d.projectId);
      const e = envById(d.envId);
      if (e && e.kind === 'production' && !(p && prodAccess(p, me.id))) pass('rollback-abuse'); /* VULN: no production role check on rollback */
      d.status = 'rolled-back';
      return redirect(res, '/projects/' + d.projectId);
    }
    if (pathname === '/search' && method === 'GET') {
      if (url.searchParams.has('q')) attempt('Projects');
      return send(res, 200, searchPage(req, url.searchParams.has('q') ? url.searchParams.get('q') : undefined));
    }
    if (pathname === '/admin' && method === 'GET') {
      attempt('Admin Panel');
      if (!adminGate(req)) return send(res, 403, layout(req, 'Forbidden', '<h1>Admins only</h1><p>This area requires the platform admin role.</p>', {}));
      if (!me || me.role !== 'admin') pass('cookie-tamper'); /* gate passed on cookie, not on the real account */
      return send(res, 200, adminPage(req));
    }
    if (pathname === '/admin/purge' && method === 'GET') {
      attempt('Admin Panel');
      if (!adminGate(req)) return send(res, 403, 'forbidden');
      if (!me || me.role !== 'admin') pass('cookie-tamper');
      deploys.length = 0; /* VULN(admin-csrf): destructive GET, no token/confirmation */
      pass('admin-csrf');
      return redirect(res, '/admin');
    }

    return send(res, 404, layout(req, 'Not found', '<h1>404 — page not found</h1>', {}));
  } catch (e) {
    try { send(res, 500, '<h1>Server error</h1><p>The lab stayed up — try again.</p>'); } catch (_) { /* ignore */ }
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('HexaDeploy (LAB ' + LAB_NUMBER + ') running at http://127.0.0.1:' + PORT + '  (LOCAL ONLY — deliberately vulnerable lab)');
  console.log('Test accounts: admin@hexadeploy.local/Admin@123, devops@hexadeploy.local/Manager@123, dev|qa|victor @hexadeploy.local/User@123, demo@hexadeploy.local/demo123');
});
