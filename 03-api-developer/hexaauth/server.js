'use strict';
/*
 * HexaAuth — LAB 29 of 110 (Category 3: API & Developer Platforms)
 * A deliberately vulnerable identity / authentication platform (tenant apps,
 * simulated OAuth clients, per-app end users, SSO config, MFA) for hands-on
 * web penetration-testing practice. LOCAL USE ONLY. Binds 127.0.0.1.
 * Zero dependencies — Node.js built-ins only.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3038;
const LAB_NUMBER = 29;
const LAB_NAME = 'HexaAuth';
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const LOGO_FILE = path.join(DIR, 'logo.png');

/* ------------------------------------------------------------------ *
 *  Seed business data (in-memory; restart resets the business data,
 *  but NOT the lab progress — that lives in progress.json).
 *
 *  HexaAuth is an identity platform: developer teams ("console users")
 *  register tenant applications, configure OAuth-style clients, SSO and
 *  MFA, and manage the end users who sign in to those applications.
 * ------------------------------------------------------------------ */
const users = [ // console users (developers / platform staff)
  { id: 1, name: 'HexaAuth Admin', email: 'admin@hexaauth.local', password: 'Admin@123', role: 'admin', disabled: false },
  { id: 2, name: 'Aaron Cole',     email: 'dev@acme.local',      password: 'Dev@123',    role: 'user',  disabled: false },
  { id: 3, name: 'Greta Weiss',    email: 'dev@globex.local',    password: 'Dev@123',    role: 'user',  disabled: false },
  { id: 4, name: 'Ivan Petrov',    email: 'dev@initech.local',  password: 'Dev@123',    role: 'user',  disabled: false },
  { id: 5, name: 'Demo User',      email: 'demo@hexaauth.local', password: 'demo123',   role: 'user',  disabled: false },
];
let userSeq = 5;

const apps = [ // tenant applications with simulated OAuth clients
  { id: 1, name: 'Acme Portal',  ownerId: 2, clientId: 'acme_web',     clientSecret: 'acme_secret_9f2K',    redirectUris: ['https://acme.example/callback'],          plan: 'pro',  ssoEnabled: false, ssoDomain: '',               mfaRequired: false, apiKey: 'hx_live_1' },
  { id: 2, name: 'Globex HR',    ownerId: 3, clientId: 'globex_hr',    clientSecret: 'globex_secret_77Qz', redirectUris: ['https://globex.example/auth/callback'], plan: 'pro',  ssoEnabled: true,  ssoDomain: 'globex.example', mfaRequired: true,  apiKey: 'hx_live_2' },
  { id: 3, name: 'Initech Docs', ownerId: 4, clientId: 'initech_docs', clientSecret: 'initech_secret_41Md', redirectUris: ['https://initech.example/oauth/done'],   plan: 'free', ssoEnabled: false, ssoDomain: '',               mfaRequired: false, apiKey: 'hx_live_3' },
];

const endUsers = [ // people who sign in to the tenant apps
  { id: 1, appId: 1, email: 'alice@acme.example',    password: 'alice123', mfaEnabled: false, mfaCode: '' },
  { id: 2, appId: 1, email: 'bob@acme.example',      password: 'bob123',   mfaEnabled: false, mfaCode: '' },
  { id: 3, appId: 2, email: 'carol@globex.example',  password: 'carol123', mfaEnabled: true,  mfaCode: '246810' },
  { id: 4, appId: 2, email: 'dave@globex.example',   password: 'dave123',  mfaEnabled: false, mfaCode: '' },
  { id: 5, appId: 3, email: 'erin@initech.example',  password: 'erin123',  mfaEnabled: false, mfaCode: '' },
];

/* ------------------------------------------------------------------ *
 *  Sessions. Console sessions are server-side; the hx_role cookie is
 *  set at login from the account's real role — and, by design flaw,
 *  the admin gate trusts that client-side cookie. End-user sessions
 *  (people signing in to tenant apps) are a separate store.
 * ------------------------------------------------------------------ */
const sessions = new Map();   // sid -> { uid, marker, enumHit, enumMiss }
const euSessions = new Map(); // sid -> { euId, appId, mfaPending, mfaVerified }
const issuedResetTokens = new Map(); // token -> uid
const failedLogins = {}; // email -> count
const authCodes = new Map(); // code -> { appId, euId, redirectUri, exchanges }
const issuedAccessTokens = new Set();
let codeSeq = 1000;
let tokenSeq = 5000;

function newConsoleSession(res, uid) {
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, { uid: uid || null, marker: crypto.randomBytes(8).toString('hex'), enumHit: false, enumMiss: false });
  const u = users.find(x => x.id === uid);
  res.setHeader('Set-Cookie', [
    'hx_session=' + sid + '; Path=/; HttpOnly; SameSite=Lax',
    'hx_role=' + (u ? u.role : 'user') + '; Path=/; SameSite=Lax',
  ]);
  return sid;
}
function newEuSession(res, euId, appId, mfaPending) {
  const sid = crypto.randomBytes(16).toString('hex');
  euSessions.set(sid, { euId, appId, mfaPending: !!mfaPending, mfaVerified: !mfaPending });
  res.setHeader('Set-Cookie', 'eu_session=' + sid + '; Path=/; HttpOnly; SameSite=Lax');
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
const _fragA = ['TC1YSA==', 'My05Mg=='];
function _asm(parts) {
  return parts.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}

/* ============================ TESTS ============================ */
const FEATURES = [
  'Login & Authentication', 'Registration & Profile', 'Tenant Apps & Clients',
  'OAuth Flow', 'End Users & MFA', 'SSO Configuration', 'Admin Panel', 'Platform & API',
];
const TESTS = [
  /* ---------------- Login & Authentication ---------------- */
  { id: 'sqli-login', feature: 'Login & Authentication', name: 'SQL Injection — Login Bypass', owasp: 'A03 Injection', difficulty: 'Beginner', keys: ['sql', 'injection', 'login bypass', 'sqli'],
    hints: ['The console login builds its query by gluing your input straight into the SQL string.', 'A classic tautology in the email field can make the WHERE clause true for the first row in the table.', "Try email: ' OR '1'='1' --  with any password — you land in the first account, which is the platform admin."],
    lesson: 'String-built SQL queries let an attacker rewrite the login check itself. Parameterised queries remove the whole class.',
    impact: 'On a real identity platform this is catastrophic: the first row is the platform admin, so one form field hands over every tenant app, every client secret and every end user.',
    report: { title: 'SQL Injection in Console Login Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.' },
    guide: "Step by step: 1) Open /login. 2) In the email field enter: ' OR '1'='1' --  3) Enter any password and submit. 4) You are logged in as the first user in the table (the platform admin) because the query became always-true." },
  { id: 'brute-force', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limiting on Login', owasp: 'A07 Auth Failures', difficulty: 'Beginner', keys: ['brute', 'rate limit', 'password guessing', 'lockout'],
    hints: ['Nothing slows you down: no lockout, no CAPTCHA, no delay.', 'Write a loop (or use Burp Intruder) and fire wrong passwords at one console account.', 'After 10 failed attempts the app is still happily processing guesses — that missing throttle is the finding.'],
    lesson: 'Without throttling or lockout, online password guessing is cheap and quiet. Rate limits + lockout + MFA are the standard defence.',
    impact: 'Attackers can grind through password lists against developer accounts; one weak password becomes control of that tenant\u2019s apps and their end users.',
    report: { title: 'No Rate Limiting or Account Lockout on Login Endpoint', severity: 'High', remediation: 'Add progressive delays/lockout per account and IP, CAPTCHA after failures, and enforce MFA.' },
    guide: 'Step by step: 1) Pick an account, e.g. dev@acme.local. 2) Submit a wrong password 10 times (curl loop or Intruder). 3) Every attempt is processed at full speed — no block, no delay. 4) The test passes at the 10th accepted failure.' },
  { id: 'user-enumeration', feature: 'Login & Authentication', name: 'User Enumeration via Login & Reset Responses', owasp: 'A07 Auth Failures', difficulty: 'Beginner', keys: ['enumeration', 'enumerate', 'which emails exist', 'forgot'],
    hints: ['Compare the error for an email that exists with one that does not.', 'The login form and the forgot-password form answer differently depending on whether the account is real.', 'Probe one real address (from the README) and one invented address in the same session — the difference is the oracle.'],
    lesson: 'Different responses for "no such user" vs "wrong password" hand attackers a free list of valid accounts to target.',
    impact: 'Attackers harvest valid developer emails from the identity provider itself, then aim phishing and password spraying precisely at the people who control tenant apps.',
    report: { title: 'Account Enumeration via Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message ("invalid credentials" / "if the account exists…") for every failure case.' },
    guide: 'Step by step: 1) In one browser session, submit /login with an invented email — note "No account found for that email." 2) Submit a real email with a wrong password — note the different message. 3) /forgot behaves the same way. The test passes once one session has seen both answers.' },
  { id: 'default-creds', feature: 'Login & Authentication', name: 'Default / Demo Credentials Still Active', owasp: 'A07 Auth Failures', difficulty: 'Beginner', keys: ['default', 'demo', 'credentials', 'weak account'],
    hints: ['Seeded/demo accounts are a classic leftover in production identity platforms.', 'The README\u2019s test-account table includes a demo login — check whether it still works.', 'demo@hexaauth.local with its documented demo password is still an active account.'],
    lesson: 'Demo and default accounts shipped to production are pre-made doors: their passwords are public knowledge.',
    impact: 'Anyone who reads the product\u2019s docs or guesses the demo login walks straight into the identity console.',
    report: { title: 'Active Default/Demo Account with Known Password', severity: 'High', remediation: 'Remove demo/default accounts before production; force unique credentials for every seeded user.' },
    guide: 'Step by step: 1) Open /login. 2) Sign in as demo@hexaauth.local / demo123. 3) The account is fully active — that successful login is the finding.' },
  { id: 'reset-token', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07 Auth Failures', difficulty: 'Intermediate', keys: ['reset', 'token', 'predictable', 'forgot password'],
    hints: ['Ask for a reset for your own account and study the token format (the flow is intentionally transparent in this lab).', 'The token is built only from the user\u2019s numeric ID and the current minute — nothing random.', 'Compute rst-<victim id>-<current minute> for any account and post it straight to /reset without ever requesting a reset for that account.'],
    lesson: 'Reset tokens must be long, random and single-use. A token derived from public values (ID + time) can be forged for any account.',
    impact: 'An attacker resets the password of any console user — including the platform admin — knowing only their ID and the time of day. Full takeover of the identity platform, no inbox access needed.',
    report: { title: 'Password Reset Tokens Are Predictable (ID + Timestamp)', severity: 'Critical', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), store hashed, expire quickly, single use.' },
    guide: 'Step by step: 1) Note the victim\u2019s numeric ID (admin = 1, demo = 5). 2) Compute the current epoch minute: Math.floor(Date.now()/60000). 3) POST /reset with token rst-<id>-<minute> and a new password — no reset email was ever requested. 4) Log in with the new password.' },
  { id: 'cookie-role', feature: 'Login & Authentication', name: 'Session Cookie Role Tampering — Admin Gate Trusts hx_role', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['cookie', 'role tamper', 'hx_role', 'admin cookie'],
    hints: ['At login the server sets a second cookie, hx_role, copied from your account.', 'The /admin gate reads that cookie instead of checking the server-side account record.', 'Log in as any normal developer, change hx_role to admin in your browser, and open /admin.'],
    lesson: 'Authorization decisions must be made from server-side state. Anything the client sends — cookies included — is attacker-controlled.',
    impact: 'Any low-privilege developer becomes platform admin by editing one cookie: every tenant, secret and end user on the platform is exposed.',
    report: { title: 'Admin Authorization Based on Client-Controlled Role Cookie', severity: 'Critical', remediation: 'Derive roles from the server-side session record on every request; never trust client-supplied role claims.' },
    guide: 'Step by step: 1) Log in as dev@acme.local (a normal user). 2) In DevTools → Application → Cookies, change hx_role from user to admin. 3) Browse to /admin — the gate trusts the cookie and shows the platform admin panel.' },
  /* ---------------- Registration & Profile ---------------- */
  { id: 'weak-password', feature: 'Registration & Profile', name: 'Weak Password Policy on Registration', owasp: 'A07 Auth Failures', difficulty: 'Beginner', keys: ['weak password', 'password policy', 'short password'],
    hints: ['The registration form validates the email format carefully — but look at what it accepts as a password.', 'There is no minimum length or complexity check at all.', 'Register a new account with the password "a" — it is accepted.'],
    lesson: 'An identity platform that accepts 1-character passwords manufactures brute-forceable accounts by design.',
    impact: 'End users pick trivial passwords; attackers crack tenant accounts in seconds, and the identity provider gets the blame.',
    report: { title: 'No Minimum Password Strength Enforced at Registration', severity: 'Medium', remediation: 'Enforce a minimum length (≥12) and breached-password screening (e.g. NIST 800-63B) at registration and reset.' },
    guide: 'Step by step: 1) Open /register. 2) Create an account with password "a" (one character). 3) The account is created — the missing policy is the finding.' },
  { id: 'mass-assignment', feature: 'Registration & Profile', name: 'Mass Assignment — role Field at Registration', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['mass assignment', 'role field', 'register admin', 'overposting'],
    hints: ['The registration handler binds the whole request body onto the new user object.', 'The visible form only shows name/email/password — but the model has more fields.', 'Add a hidden field role=admin to the registration POST and the new account is created as an administrator.'],
    lesson: 'Bind only an explicit allow-list of fields. Anything else in the request body (role, plan, balance) must be ignored.',
    impact: 'Self-service registration becomes self-service privilege escalation: anyone can mint a platform admin account in one request.',
    report: { title: 'Mass Assignment Allows Privilege Escalation at Registration', severity: 'Critical', remediation: 'Use an explicit field allow-list (DTO) for registration; set role/plan server-side only.' },
    guide: 'Step by step: 1) Intercept the POST /register request (or use curl). 2) Add the extra field role=admin to the body. 3) The account is created with the admin role — log in and open /admin to confirm.' },
  { id: 'stored-xss-profile', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03 Injection', difficulty: 'Beginner', keys: ['stored xss', 'display name', 'xss name', 'script name'],
    hints: ['Your display name is printed, unescaped, in the platform admin\u2019s user list.', 'That page renders names exactly as they were stored — no output encoding.', 'Set your name to <script>alert(1)</script> (registration or profile) — it is stored and served raw to the admin.'],
    lesson: 'Every stored field is an injection surface wherever it is later rendered. Output-encode at render time, everywhere.',
    impact: 'An attacker plants a script in their profile name; when a platform admin opens the user list, the script runs in the admin\u2019s session — session theft and actions as admin.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Contextually output-encode all user-supplied fields at render; add a Content-Security-Policy as defence in depth.' },
    guide: 'Step by step: 1) Register (or edit your profile) with the display name <script>alert(1)</script>. 2) Open /admin (the hx_role cookie trick from the Login feature gets a normal user in) — your name is printed into the user list unescaped and the payload fires in the admin\u2019s browser.' },
  { id: 'profile-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['csrf', 'profile update', 'cross site request'],
    hints: ['Your own profile form carries a hidden marker field tied to your session.', 'The server never actually checks that marker on POST /profile.', 'Send the same POST without the marker (e.g. from curl, or an auto-submitting form on another site) — the change is applied anyway.'],
    lesson: 'State-changing endpoints need an unguessable per-session token, verified server-side on every request.',
    impact: 'A malicious page visited by a logged-in developer silently rewrites their profile — the classic stepping stone to account-recovery abuse.',
    report: { title: 'Missing CSRF Token Verification on Profile Update', severity: 'Medium', remediation: 'Issue per-session CSRF tokens and verify them on every state-changing request; use SameSite cookies as defence in depth.' },
    guide: 'Step by step: 1) Note the hidden hx_marker field in the /profile form. 2) POST /profile with your session cookie but WITHOUT hx_marker (curl works). 3) Your display name changes anyway — no token was ever verified.' },
  /* ---------------- Tenant Apps & Clients ---------------- */
  { id: 'app-idor', feature: 'Tenant Apps & Clients', name: 'Cross-Tenant IDOR — Other Teams\u2019 App Settings', owasp: 'A01 Broken Access Control', difficulty: 'Beginner', keys: ['idor', 'other app', 'tenant', 'app settings'],
    hints: ['Your dashboard lists only your own apps — but the detail page takes any numeric ID.', 'Nothing checks that the app belongs to you.', 'Open /apps/2 while signed in as the Acme developer: you are reading (and can edit) Globex\u2019s app settings.'],
    lesson: 'Every object access must verify ownership/tenancy server-side. Hiding links in the UI is not access control.',
    impact: 'Competitors or malicious tenants read each other\u2019s OAuth configuration — redirect URIs, SSO domains, plan details — the reconnaissance for a full tenant takeover.',
    report: { title: 'Broken Access Control on Tenant Application Settings (IDOR)', severity: 'High', remediation: 'Check app.ownerId against the session user on every app route; return 404 for objects outside the caller\u2019s tenancy.' },
    guide: 'Step by step: 1) Log in as dev@acme.local (owner of app 1). 2) Browse to /apps/2. 3) Globex HR\u2019s full settings page loads — client ID, redirect URIs, SSO config — although you are not its owner.' },
  { id: 'secret-exposure', feature: 'Tenant Apps & Clients', name: 'Client Secret Exposed via JSON API', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['client secret', 'api secret', 'secret exposure', 'json api'],
    hints: ['There is a JSON API for app metadata: /api/apps/<id>.', 'It serialises the whole app record — including the one field that should never leave the owner\u2019s screen.', 'Call /api/apps/2 as the Acme developer and read Globex\u2019s client_secret straight from the JSON.'],
    lesson: 'API responses must be built from allow-listed DTOs. A client secret is a credential — exposing it is equivalent to publishing the tenant\u2019s password.',
    impact: 'With another tenant\u2019s client secret, an attacker can exchange stolen authorization codes and impersonate the real application to its users.',
    report: { title: 'OAuth Client Secret Disclosed to Other Tenants via API', severity: 'Critical', remediation: 'Return only allow-listed fields; never serialise secrets; restrict app metadata to the owning team.' },
    guide: 'Step by step: 1) Log in as any developer. 2) GET /api/apps/2 (an app you do not own). 3) The JSON contains clientSecret in full — that disclosure is the finding.' },
  { id: 'plan-tamper', feature: 'Tenant Apps & Clients', name: 'Plan Tampering via App Update', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['plan', 'upgrade', 'billing tamper', 'free plan'],
    hints: ['The app settings form lets you edit the name and redirect URIs — the plan is shown as read-only text.', 'The update handler, like registration, binds extra body fields without an allow-list.', 'POST /apps/3/update with an added plan=enterprise field and the free app upgrades itself — no payment involved.'],
    lesson: 'Billing-relevant fields must never be client-writable. The server owns plan state; updates bind an allow-list.',
    impact: 'Every free-tier tenant upgrades itself to the top plan for free — direct revenue loss, and proof the billing model trusts the client.',
    report: { title: 'Subscription Plan Editable via Mass Assignment on App Update', severity: 'High', remediation: 'Allow-list editable fields (name, redirect URIs); change plans only through the verified billing flow.' },
    guide: 'Step by step: 1) Log in as dev@initech.local (app 3, free plan). 2) POST /apps/3/update with the normal fields PLUS plan=enterprise. 3) Reload the app page — the plan now reads enterprise.' },
  /* ---------------- OAuth Flow ---------------- */
  { id: 'redirect-uri', feature: 'OAuth Flow', name: 'Redirect URI Validation Bypass', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['redirect', 'redirect_uri', 'callback', 'open redirect oauth'],
    hints: ['The authorize endpoint checks the redirect_uri against the registered one — but only that it STARTS WITH the registered origin.', 'A look-alike host that begins with the same text passes the check.', 'Use redirect_uri https://acme.example.evil.test/callback for client acme_web: the code is delivered to the attacker\u2019s look-alike domain.'],
    lesson: 'OAuth redirect URIs must match the registered value EXACTLY (string equality). Prefix, substring and wildcard matching all leak authorization codes.',
    impact: 'Attackers harvest authorization codes through phishing links on the real login page, then exchange them for access tokens — full end-user account takeover under the client\u2019s own brand.',
    report: { title: 'OAuth Redirect URI Prefix Matching Allows Code Interception', severity: 'High', remediation: 'Require exact string match against the registered redirect URI list; reject anything else.' },
    guide: 'Step by step: 1) Sign in as an Acme end user (alice@acme.example). 2) Open /oauth/authorize?client_id=acme_web&redirect_uri=https://acme.example.evil.test/callback and approve. 3) The browser is sent to the evil.test look-alike WITH a valid code — the prefix check passed it.' },
  { id: 'token-predictable', feature: 'OAuth Flow', name: 'Predictable Access Tokens — Forgeable Bearer Tokens', owasp: 'A02 Cryptographic Failures', difficulty: 'Advanced', keys: ['token', 'predictable token', 'forge token', 'bearer'],
    hints: ['Fetch /api/me with a real token and study its format.', 'The token is just base64 of "<endUserId>:<appId>" plus a counter — no signature, no randomness.', 'Forge hxat_<base64 of 3:2>.999999 for Carol at Globex and call /api/me — the API accepts a token it never issued.'],
    lesson: 'Bearer tokens must be unguessable: long random values or properly signed (and verified) structures. Encoding is not encryption, and it is not authentication.',
    impact: 'Anyone can mint a working access token for ANY end user of ANY tenant app — total, silent impersonation across the whole platform.',
    report: { title: 'Access Tokens Are Predictable Encodings (No Signature/Randomness)', severity: 'Critical', remediation: 'Issue opaque random tokens (≥128 bits) stored server-side, or sign tokens with a strong secret and verify the signature.' },
    guide: 'Step by step: 1) Get one real token and decode its middle part — it is base64 of "userId:appId". 2) Build hxat_ + base64("3:2") + ".999999" — a token never issued to anyone. 3) GET /api/me with Authorization: Bearer <forged> — Carol\u2019s profile comes back.' },
  { id: 'code-reuse', feature: 'OAuth Flow', name: 'Authorization Code Reuse — Codes Never Invalidated', owasp: 'A07 Auth Failures', difficulty: 'Intermediate', keys: ['code reuse', 'authorization code', 'exchange twice', 'replay'],
    hints: ['Authorization codes are supposed to be single-use.', 'Exchange one code at /oauth/token and note the access token you get.', 'Exchange the SAME code again — a second, fresh access token is issued. The code was never burned.'],
    lesson: 'Authorization codes must be short-lived and single-use; a second exchange must fail and should revoke tokens from the first.',
    impact: 'A leaked or logged code (browser history, proxy logs, referer headers) stays redeemable forever — anyone who ever sees it owns the account.',
    report: { title: 'OAuth Authorization Codes Are Reusable (Not Invalidated After Exchange)', severity: 'High', remediation: 'Invalidate each code on first exchange, expire codes within minutes, and bind codes to client + redirect URI.' },
    guide: 'Step by step: 1) Complete an authorize flow and capture the code. 2) POST /oauth/token with the code + client credentials — token issued. 3) POST the exact same code again — a second token is issued instead of an error.' },
  /* ---------------- End Users & MFA ---------------- */
  { id: 'cross-app-users', feature: 'End Users & MFA', name: 'Cross-App End-User List Exposure (Passwords + MFA Secrets)', owasp: 'A01 Broken Access Control', difficulty: 'Beginner', keys: ['end users', 'user list', 'other app users', 'passwords list'],
    hints: ['Each app has an end-user management page: /apps/<id>/users.', 'Like the settings page, it never checks that the app is yours.', 'As the Acme developer, open /apps/2/users — Globex\u2019s end users, their plaintext passwords and MFA codes are all listed.'],
    lesson: 'Tenancy checks belong on every route that touches tenant data — especially the route that lists credentials.',
    impact: 'One tenant reads another tenant\u2019s entire user base WITH working passwords and MFA codes: those users are compromised on every service where they reused them.',
    report: { title: 'End-User Credentials of Other Tenants Exposed (Broken Access Control)', severity: 'Critical', remediation: 'Enforce ownership checks on user-management routes; never store or display plaintext passwords or MFA secrets.' },
    guide: 'Step by step: 1) Log in as dev@acme.local. 2) Open /apps/2/users. 3) Globex HR\u2019s end users load with plaintext passwords and MFA codes — accounts you have no right to see.' },
  { id: 'mfa-bypass', feature: 'End Users & MFA', name: 'MFA Bypass — Pending Session Treated as Full Session', owasp: 'A07 Auth Failures', difficulty: 'Intermediate', keys: ['mfa', 'two factor', '2fa bypass', 'pending session'],
    hints: ['Carol (Globex) has MFA on: password login sends her to a code page first.', 'Look at what the session already contains the moment the password step succeeds.', 'After the password step, skip the code page and browse straight to /enduser/home — the pending session is already trusted.'],
    lesson: 'A half-authenticated session must be a separate, restricted state. Until the second factor verifies, the session should reach nothing but the MFA page.',
    impact: 'MFA that can be walked around with one URL change is worse than no MFA: the client believes high-risk users are protected when they are not.',
    report: { title: 'MFA Verification Bypass via Unrestricted Pending Session', severity: 'High', remediation: 'Keep pre-MFA sessions in a separate restricted store; require mfaVerified before issuing the real session.' },
    guide: 'Step by step: 1) At /enduser/login?app=globex_hr, sign in as carol@globex.example / carol123. 2) You are redirected to the MFA code page — do NOT enter a code. 3) Browse directly to /enduser/home: you are in, fully authenticated, MFA never completed.' },
  { id: 'app-api-key', feature: 'End Users & MFA', name: 'Guessable App API Key — hx_live_<appId>', owasp: 'A07 Auth Failures', difficulty: 'Intermediate', keys: ['api key', 'guessable key', 'hx_live', 'api users'],
    hints: ['Apps can also be managed through an API key sent as X-Api-Key to /api/apps/<id>/users.', 'Look at your own app\u2019s key on its settings page and study the pattern.', 'Your key is hx_live_1 because your app ID is 1. Try hx_live_2 against Globex\u2019s user list — no console login needed.'],
    lesson: 'API keys are credentials: they must be long, random and unguessable. A key derived from a public sequential ID is public.',
    impact: 'Anyone on the internet can enumerate every tenant\u2019s end-user list by counting 1, 2, 3… — a complete credential dump of the platform\u2019s user base.',
    report: { title: 'Predictable Per-App API Keys Allow Unauthenticated User-List Access', severity: 'Critical', remediation: 'Generate API keys with a CSPRNG (≥128 bits), store hashed, and support rotation/revocation.' },
    guide: 'Step by step: 1) Note your own key format on /apps/1: hx_live_1. 2) curl /api/apps/2/users with header X-Api-Key: hx_live_2 — no session cookie at all. 3) Globex\u2019s end users (with passwords) come back as JSON.' },
  /* ---------------- SSO Configuration ---------------- */
  { id: 'sso-tamper', feature: 'SSO Configuration', name: 'SSO Configuration Tampering by Another Tenant', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['sso', 'sso config', 'saml', 'identity provider'],
    hints: ['The SSO settings form posts to /apps/<id>/sso — the same route family as the other app pages.', 'Ownership is checked nowhere in this part of the console.', 'As the Acme developer, POST a new ssoDomain for app 2 (Globex) — their SSO now points at a domain you control.'],
    lesson: 'Security configuration is the highest-value target in an identity platform; writing it must require ownership AND step-up authentication.',
    impact: 'An attacker repoints a victim tenant\u2019s SSO at their own identity provider, then signs in as any of that tenant\u2019s employees — a silent, persistent backdoor.',
    report: { title: 'SSO Configuration Writable by Non-Owner Tenants', severity: 'Critical', remediation: 'Enforce ownership + admin role on SSO configuration writes; audit-log and alert on IdP changes.' },
    guide: 'Step by step: 1) Log in as dev@acme.local. 2) POST /apps/2/sso with ssoEnabled=on and ssoDomain=attacker.example. 3) Reopen /apps/2 — Globex\u2019s SSO domain is now yours. Their login security was rewritten by a stranger.' },
  { id: 'sso-assertion', feature: 'SSO Configuration', name: 'Unverified SSO Assertion — Login as Anyone by Email', owasp: 'A07 Auth Failures', difficulty: 'Advanced', keys: ['sso login', 'assertion', 'saml assertion', 'email login'],
    hints: ['Apps with SSO enabled offer a "Continue with SSO" login at /sso/login.', 'The handler trusts the email address typed into the form as a verified identity assertion — no signature, no redirect to a real IdP, no proof at all.', 'Enter carol@globex.example for client globex_hr: you are signed in as Carol, MFA and password never involved.'],
    lesson: 'An identity assertion is only worth anything when it is signed by the IdP and the signature is verified. A form field is not an assertion.',
    impact: 'Every SSO-enabled tenant is wide open: type any employee\u2019s email and you ARE that employee. Passwords and MFA are irrelevant.',
    report: { title: 'SSO Login Accepts Unverified Email Assertions (No IdP Proof)', severity: 'Critical', remediation: 'Implement real SAML/OIDC with signature validation against the configured IdP; never trust client-supplied identity claims.' },
    guide: 'Step by step: 1) Open /sso/login?client_id=globex_hr. 2) Enter carol@globex.example (domain matches the app\u2019s SSO domain) and submit — no password, no code. 3) You land on Carol\u2019s end-user home, fully signed in.' },
  /* ---------------- Admin Panel ---------------- */
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'State-Changing GET — Disable Any User with One Link', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['admin csrf', 'disable user', 'get request', 'one click'],
    hints: ['In the admin panel, each user row has a "Disable" action.', 'Look at how it is implemented: a plain GET link — no form, no token, nothing to forge-proof it.', 'While signed in as admin, just visiting /admin/users/5/disable disables that account — an <img> tag on any page could do the same to the admin\u2019s browser.'],
    lesson: 'GET requests must never change state. Combined with a missing CSRF token, any website an admin visits can fire admin actions.',
    impact: 'One malicious page view disables accounts across the platform — including other admins — from the victim admin\u2019s own authenticated browser.',
    report: { title: 'Administrative State Change via GET Without CSRF Protection', severity: 'High', remediation: 'Use POST/DELETE with per-session CSRF tokens for all state changes; never mutate state in GET handlers.' },
    guide: 'Step by step: 1) Sign in as admin (or use the hx_role cookie trick). 2) Visit /admin/users/5/disable directly in the address bar. 3) The demo account is disabled instantly — a bare GET changed platform state.' },
  /* ---------------- Platform & API ---------------- */
  { id: 'api-users-dump', feature: 'Platform & API', name: 'Unauthenticated Console-User Dump at /api/console/users', owasp: 'A01 Broken Access Control', difficulty: 'Beginner', keys: ['console users', 'api dump', 'unauthenticated api', 'user dump'],
    hints: ['The platform API has a user-listing endpoint meant for internal tooling.', 'Nobody ever put an authentication check on it.', 'Open /api/console/users in a private window (no login at all) — every console user, with plaintext passwords, is returned.'],
    lesson: 'Every endpoint needs an explicit auth decision. "Internal" endpoints deployed to production are public endpoints.',
    impact: 'The full developer-account credential list of the identity platform is public — attackers take over tenant apps at leisure, including the admin account.',
    report: { title: 'Unauthenticated API Endpoint Returns All Console Users with Passwords', severity: 'Critical', remediation: 'Require authentication and admin authorization on user-listing endpoints; never return password fields.' },
    guide: 'Step by step: 1) Log out (or open a private window). 2) GET /api/console/users. 3) All console accounts come back as JSON, passwords included — no session was ever presented.' },
  { id: 'debug-exposure', feature: 'Platform & API', name: 'Debug Endpoint Leaks Token-Signing Secret', owasp: 'A05 Security Misconfiguration', difficulty: 'Beginner', keys: ['debug', 'config', 'signing secret', 'exposure'],
    hints: ['Developers left a diagnostics page in the production build.', 'Try the classic path: /debug.', 'It prints the platform configuration — including the secret used to sign tokens for every tenant.'],
    lesson: 'Debug/diagnostics surfaces must never ship to production; a leaked signing secret compromises every token the platform has ever issued.',
    impact: 'With the signing secret, attackers forge perfectly valid tokens offline for any user of any tenant — a platform-wide, hard-to-detect compromise.',
    report: { title: 'Debug Endpoint Exposes Platform Configuration and Signing Secret', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; rotate the leaked signing secret; gate diagnostics behind admin auth and IP allow-lists.' },
    guide: 'Step by step: 1) Browse to /debug (login not required). 2) The JSON prints environment, tenant count and the token-signing secret. 3) That secret is the finding — it should never be reachable.' },
];

/* More key fragments live further down the file (see _fragC / _fragD). */
const _fragB = ['Rk8wMQ==', 'LVAxSA==', 'TkJSMw==', 'WVA4Wg=='];
function entryKey() { return _asm(_fragA.concat(_fragB)); }

/* ============================ HTML helpers ============================ */
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const CSS = `
body{font-family:Segoe UI,Arial,sans-serif;margin:0;background:#0f172a;color:#e2e8f0}
a{color:#38bdf8} header{background:#1e293b;padding:10px 20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
header img{height:38px} header .brand{font-weight:700;font-size:18px}
.bar{flex:1;min-width:180px;background:#334155;border-radius:6px;height:18px;position:relative}
.bar i{position:absolute;left:0;top:0;bottom:0;background:#22c55e;border-radius:6px}
.bar span{position:absolute;width:100%;text-align:center;font-size:12px;line-height:18px;color:#fff}
nav a{margin-right:12px;font-size:14px}
main{max-width:980px;margin:24px auto;padding:0 16px}
.card{background:#1e293b;border:1px solid #334155;border-radius:10px;padding:18px;margin-bottom:16px}
input,select,textarea{background:#0f172a;border:1px solid #475569;color:#e2e8f0;border-radius:6px;padding:8px;width:100%;box-sizing:border-box;margin:4px 0 10px}
button,.btn{background:#2563eb;color:#fff;border:0;border-radius:6px;padding:9px 16px;cursor:pointer;text-decoration:none;display:inline-block}
button:hover,.btn:hover{background:#1d4ed8}
table{width:100%;border-collapse:collapse} td,th{border-bottom:1px solid #334155;padding:7px;text-align:left;font-size:14px}
.err{background:#7f1d1d;padding:10px;border-radius:6px;margin-bottom:12px}
.ok{background:#14532d;padding:10px;border-radius:6px;margin-bottom:12px}
.small{font-size:13px;color:#94a3b8} code{background:#0f172a;padding:2px 5px;border-radius:4px}
.test{border:1px solid #334155;border-radius:8px;padding:12px;margin-bottom:10px}
.done{color:#4ade80}.open{color:#fbbf24}
#chatbtn{position:fixed;right:18px;bottom:18px;background:#2563eb;color:#fff;border-radius:24px;padding:11px 18px;cursor:pointer;z-index:50;box-shadow:0 4px 14px rgba(0,0,0,.5)}
#chatbox{position:fixed;right:18px;bottom:70px;width:330px;max-height:470px;background:#1e293b;border:1px solid #475569;border-radius:10px;display:none;flex-direction:column;z-index:50}
#chatlog{overflow-y:auto;padding:10px;font-size:13px;flex:1}
#chatlog .me{text-align:right;margin:6px 0;color:#93c5fd}
#chatlog .bot{margin:6px 0;background:#0f172a;padding:8px;border-radius:6px;white-space:pre-wrap}
#chatform{display:flex;border-top:1px solid #334155}
#chatform input{flex:1;margin:0;border:0}
.cert{max-width:640px;margin:30px auto;background:#f8fafc;color:#0f172a;border-radius:12px;padding:36px;text-align:center}
@media print{ #chatbtn,#chatbox,nav{display:none} body{background:#fff} }
`;
const CHAT_WIDGET = `
<div id="chatbtn" onclick="var b=document.getElementById('chatbox');b.style.display=b.style.display==='flex'?'none':'flex'">Lab Coach</div>
<div id="chatbox">
  <div id="chatlog"><div class="bot">Hi! I am the HexaAuth Lab Coach. Ask me what this lab covers, how many tests a feature has, or — after you have tried a feature at least 3 times — how a test is done.</div></div>
  <form id="chatform"><input id="chatin" placeholder="Ask the Lab Coach..." autocomplete="off"><button>Send</button></form>
</div>
<script>
document.getElementById('chatform').addEventListener('submit',function(e){e.preventDefault();var i=document.getElementById('chatin');var m=i.value;i.value='';var l=document.getElementById('chatlog');var d=document.createElement('div');d.className='me';d.textContent=m;l.appendChild(d);fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})}).then(function(r){return r.json()}).then(function(j){var b=document.createElement('div');b.className='bot';b.textContent=j.reply;l.appendChild(b);l.scrollTop=l.scrollHeight;});});
</script>`;
function layout(title, body, opts) {
  opts = opts || {};
  const s = progressSummary();
  const nav = opts.gate ? '' : `<nav>
    <a href="/">Dashboard</a><a href="/directory">App Directory</a><a href="/tests">Mission / Tests</a>
    <a href="/complete">Completion</a><a href="/certificate">Certificate</a><a href="/admin">Admin</a>
    ${opts.user ? `<a href="/profile">Profile (${esc(opts.user.name)})</a><a href="/logout">Logout</a>` : '<a href="/login">Login</a><a href="/register">Register</a>'}
  </nav>`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — HexaAuth LAB 29</title><style>${CSS}</style></head><body>
<header><img src="/logo.png" alt="HexaCyberLab"><div class="brand">LAB ${LAB_NUMBER} — ${LAB_NAME}</div>
<div class="bar"><i style="width:${s.pct}%"></i><span>LAB ${LAB_NUMBER} · ${s.done}/${s.total} tests · ${s.pct}%</span></div></header>
<div style="padding:8px 20px;background:#1e293b;border-top:1px solid #334155">${nav}</div>
<main>${body}</main>${CHAT_WIDGET}</body></html>`;
}
function gatePage(msg) {
  return layout('Locked', `<div class="card" style="max-width:520px;margin:40px auto;text-align:center">
  <img src="/logo.png" style="height:64px">
  <h2>LAB ${LAB_NUMBER} — ${LAB_NAME} is locked</h2>
  <p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
  ${msg ? `<div class="err">${esc(msg)}</div>` : ''}
  <form method="POST" action="/unlock"><input name="key" placeholder="Completion key from Lab ${LAB_NUMBER - 1}" autocomplete="off"><button style="width:100%">Unlock Lab ${LAB_NUMBER}</button></form>
  <p class="small">HexaCyberLab practice labs — local use only.</p></div>`, { gate: true });
}

/* ============================ Console pages ============================ */
function loginPage(msg) {
  return layout('Login', `<div class="card" style="max-width:460px;margin:30px auto">
  <h2>Developer Console — Sign in</h2>${msg ? `<div class="err">${esc(msg)}</div>` : ''}
  <form method="POST" action="/login">
    <label>Email</label><input name="email" type="text" autocomplete="off">
    <label>Password</label><input name="password" type="password">
    <button style="width:100%">Sign in</button></form>
  <p class="small">No account? <a href="/register">Register</a> · <a href="/forgot">Forgot password?</a></p>
  <p class="small">End user of a tenant app? Use the <a href="/enduser/login?app=acme_web">end-user sign in</a> or <a href="/sso/login?client_id=globex_hr">SSO sign in</a>.</p></div>`);
}
function registerPage(msg) {
  return layout('Register', `<div class="card" style="max-width:460px;margin:30px auto">
  <h2>Create a developer account</h2>${msg ? `<div class="err">${esc(msg)}</div>` : ''}
  <form method="POST" action="/register">
    <label>Display name</label><input name="name" type="text" autocomplete="off">
    <label>Email</label><input name="email" type="text" autocomplete="off">
    <label>Password</label><input name="password" type="password">
    <button style="width:100%">Create account</button></form>
  <p class="small">Already registered? <a href="/login">Sign in</a></p></div>`);
}
function forgotPage(msg, token) {
  return layout('Forgot password', `<div class="card" style="max-width:460px;margin:30px auto">
  <h2>Forgot password</h2>${msg ? `<div class="${token ? 'ok' : 'err'}">${esc(msg)}</div>` : ''}
  ${token ? `<p>Lab note — your reset token is: <code>${esc(token)}</code></p><p><a href="/reset?token=${esc(token)}">Continue to reset</a></p>` : `
  <form method="POST" action="/forgot">
    <label>Email</label><input name="email" type="text" autocomplete="off">
    <button style="width:100%">Send reset link</button></form>`}
  <p class="small"><a href="/login">Back to sign in</a></p></div>`);
}
function resetPage(msg, token) {
  return layout('Reset password', `<div class="card" style="max-width:460px;margin:30px auto">
  <h2>Reset password</h2>${msg ? `<div class="err">${esc(msg)}</div>` : ''}
  <form method="POST" action="/reset">
    <label>Reset token</label><input name="token" type="text" value="${esc(token || '')}" autocomplete="off">
    <label>New password</label><input name="password" type="password">
    <button style="width:100%">Set new password</button></form></div>`);
}
function dashboardPage(user) {
  const mine = apps.filter(a => a.ownerId === user.id);
  const rows = mine.map(a => `<tr><td><a href="/apps/${a.id}">${esc(a.name)}</a></td><td><code>${esc(a.clientId)}</code></td><td>${esc(a.plan)}</td><td>${a.ssoEnabled ? 'SSO on' : 'SSO off'}</td><td><a href="/apps/${a.id}/users">End users</a></td></tr>`).join('');
  return layout('Dashboard', `<h2>Welcome, ${esc(user.name)}</h2>
  <div class="card"><h3>Your tenant applications</h3>
  ${mine.length ? `<table><tr><th>App</th><th>Client ID</th><th>Plan</th><th>SSO</th><th></th></tr>${rows}</table>` : '<p>You do not own any apps yet.</p>'}
  <p class="small">HexaAuth hosts identity for every app: OAuth-style clients, SSO configuration, MFA and per-app end users.</p></div>
  <div class="card"><h3>Quick links</h3><p><a href="/directory">App directory</a> · <a href="/tests">Mission page</a> · <a href="/enduser/login?app=acme_web">End-user sign in (Acme)</a> · <a href="/sso/login?client_id=globex_hr">SSO sign in (Globex)</a></p></div>`, { user });
}
function appPage(user, app, msg) {
  const owner = users.find(u => u.id === app.ownerId);
  return layout(app.name, `<h2>${esc(app.name)}</h2>${msg ? `<div class="ok">${esc(msg)}</div>` : ''}
  <div class="card"><h3>Application settings</h3>
  <p class="small">Owner: ${owner ? owner.name : 'unknown'} · Client ID: <code>${esc(app.clientId)}</code> · Client secret: <code>${esc(app.clientSecret)}</code> · API key: <code>${esc(app.apiKey)}</code></p>
  <form method="POST" action="/apps/${app.id}/update">
    <label>App name</label><input name="name" value="${esc(app.name)}">
    <label>Redirect URI</label><input name="redirectUri" value="${esc(app.redirectUris[0] || '')}">
    <label>Plan (managed by billing)</label><input value="${esc(app.plan)}" disabled>
    <button>Save settings</button></form>
  <p><a href="/apps/${app.id}/users">Manage end users</a></p></div>
  <div class="card"><h3>Single Sign-On (SSO)</h3>
  <p class="small">Current: ${app.ssoEnabled ? 'enabled' : 'disabled'}${app.ssoDomain ? ' — IdP domain <code>' + esc(app.ssoDomain) + '</code>' : ''} · MFA required for end users: ${app.mfaRequired ? 'yes' : 'no'}</p>
  <form method="POST" action="/apps/${app.id}/sso">
    <label>SSO IdP domain</label><input name="ssoDomain" value="${esc(app.ssoDomain)}">
    <label><input type="checkbox" name="ssoEnabled" style="width:auto" ${app.ssoEnabled ? 'checked' : ''}> Enable SSO</label><br>
    <button>Save SSO configuration</button></form></div>`, { user });
}
function appUsersPage(user, app) {
  const rows = endUsers.filter(e => e.appId === app.id).map(e => `<tr><td>${e.id}</td><td>${esc(e.email)}</td><td><code>${esc(e.password)}</code></td><td>${e.mfaEnabled ? 'on — code <code>' + esc(e.mfaCode) + '</code>' : 'off'}</td></tr>`).join('');
  return layout('End users', `<h2>${esc(app.name)} — end users</h2>
  <div class="card"><table><tr><th>ID</th><th>Email</th><th>Password</th><th>MFA</th></tr>${rows}</table>
  <p class="small">End-user sign in for this app: <a href="/enduser/login?app=${esc(app.clientId)}">/enduser/login?app=${esc(app.clientId)}</a></p></div>`, { user });
}
function directoryPage(user) {
  const rows = apps.map(a => { const o = users.find(u => u.id === a.ownerId); return `<tr><td>${esc(a.name)}</td><td><code>${esc(a.clientId)}</code></td><td>${o ? o.name : ''}</td><td>${esc(a.plan)}</td></tr>`; }).join('');
  return layout('App Directory', `<h2>App directory</h2><div class="card"><table><tr><th>App</th><th>Client ID</th><th>Owner</th><th>Plan</th></tr>${rows}</table></div>`, { user });
}
function profilePage(user, sess, msg) {
  return layout('Profile', `<div class="card" style="max-width:520px;margin:30px auto"><h2>Your profile</h2>
  ${msg ? `<div class="ok">${esc(msg)}</div>` : ''}
  <form method="POST" action="/profile">
    <input type="hidden" name="hx_marker" value="${esc(sess.marker)}">
    <label>Display name</label><input name="name" value="${esc(user.name)}">
    <label>Email</label><input value="${esc(user.email)}" disabled>
    <button>Save profile</button></form></div>`, { user });
}
function adminPage() {
  const urows = users.map(u => `<tr><td>${u.id}</td><td>${u.name}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td>${u.disabled ? 'disabled' : 'active'}</td><td>${u.disabled ? '' : `<a href="/admin/users/${u.id}/disable">Disable</a>`}</td></tr>`).join('');
  const arows = apps.map(a => `<tr><td>${a.id}</td><td>${esc(a.name)}</td><td><code>${esc(a.clientId)}</code></td><td>${esc(a.plan)}</td></tr>`).join('');
  return layout('Admin', `<h2>Platform admin</h2>
  <div class="card"><h3>Console users</h3><table><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr>${urows}</table></div>
  <div class="card"><h3>Tenant apps</h3><table><tr><th>ID</th><th>App</th><th>Client ID</th><th>Plan</th></tr>${arows}</table></div>`);
}

/* ============================ End-user & OAuth pages ============================ */
function euLoginPage(app, msg, next) {
  return layout('End-user sign in', `<div class="card" style="max-width:460px;margin:30px auto">
  <h2>Sign in to ${esc(app.name)}</h2>${msg ? `<div class="err">${esc(msg)}</div>` : ''}
  <form method="POST" action="/enduser/login">
    <input type="hidden" name="app" value="${esc(app.clientId)}">
    ${next ? `<input type="hidden" name="next" value="${esc(next)}">` : ''}
    <label>Email</label><input name="email" type="text" autocomplete="off">
    <label>Password</label><input name="password" type="password">
    <button style="width:100%">Sign in</button></form>
  ${app.ssoEnabled ? `<p class="small">This app uses SSO: <a href="/sso/login?client_id=${esc(app.clientId)}">Continue with SSO</a></p>` : ''}</div>`);
}
function euMfaPage(msg, next) {
  return layout('MFA check', `<div class="card" style="max-width:460px;margin:30px auto">
  <h2>Two-factor check</h2><p>Enter the 6-digit code from your authenticator app.</p>${msg ? `<div class="err">${esc(msg)}</div>` : ''}
  <form method="POST" action="/enduser/mfa">
    ${next ? `<input type="hidden" name="next" value="${esc(next)}">` : ''}
    <label>Code</label><input name="code" type="text" autocomplete="off">
    <button style="width:100%">Verify</button></form></div>`);
}
function euHomePage(eu, app) {
  return layout('Home', `<div class="card"><h2>Welcome, ${esc(eu.email)}</h2>
  <p>You are signed in to <b>${esc(app.name)}</b> as end user #${eu.id}. MFA status: ${eu.mfaEnabled ? 'enabled on your account' : 'not enabled'}.</p>
  <p><a href="/oauth/authorize?client_id=${esc(app.clientId)}&redirect_uri=${encodeURIComponent(app.redirectUris[0] || '')}">Start an OAuth authorize flow for this app</a></p>
  <p><a href="/enduser/logout">Sign out</a></p></div>`);
}
function ssoLoginPage(app, msg) {
  return layout('SSO sign in', `<div class="card" style="max-width:460px;margin:30px auto">
  <h2>Continue with SSO — ${esc(app.name)}</h2>
  <p>Your identity provider (${esc(app.ssoDomain)}) has verified your identity. Confirm your work email to continue.</p>
  ${msg ? `<div class="err">${esc(msg)}</div>` : ''}
  <form method="POST" action="/sso/login">
    <input type="hidden" name="client_id" value="${esc(app.clientId)}">
    <label>Work email</label><input name="email" type="text" autocomplete="off">
    <button style="width:100%">Continue</button></form></div>`);
}
function consentPage(app, eu, redirectUri, state) {
  return layout('Authorize', `<div class="card" style="max-width:520px;margin:30px auto">
  <h2>${esc(app.name)} wants your approval</h2>
  <p>Signed in as <b>${esc(eu.email)}</b>. Approve to receive an authorization code at:</p>
  <p><code>${esc(redirectUri)}</code></p>
  <form method="POST" action="/oauth/authorize/approve">
    <input type="hidden" name="client_id" value="${esc(app.clientId)}">
    <input type="hidden" name="redirect_uri" value="${esc(redirectUri)}">
    <input type="hidden" name="state" value="${esc(state || '')}">
    <button style="width:100%">Approve</button></form></div>`);
}

/* ============================ Mission / completion ============================ */
function testsPage(user) {
  const s = progressSummary();
  let out = `<h2>Mission — LAB ${LAB_NUMBER} ${LAB_NAME}</h2><p>${s.done}/${s.total} tests complete · ${s.pct}%</p>`;
  for (const f of FEATURES) {
    const ts = TESTS.filter(t => t.feature === f);
    out += `<div class="card"><h3>${esc(f)} <span class="small">(${ts.filter(t => progress.tests[t.id]).length}/${ts.length} done · ${progress.attempts[f] || 0} attempts)</span></h3>`;
    for (const t of ts) {
      const done = !!progress.tests[t.id];
      out += `<div class="test"><b class="${done ? 'done' : 'open'}">${done ? '✓' : '○'} ${esc(t.name)}</b>
      <div class="small">${esc(t.owasp)} · ${esc(t.difficulty)}</div>
      <details><summary>Hints</summary><ol>${t.hints.map(h => `<li>${esc(h)}</li>`).join('')}</ol></details></div>`;
    }
    out += '</div>';
  }
  return layout('Mission', out, { user });
}
const _fragC = ['TC1YSA==', 'Ri0wMw=='];
function completePage(user, justNamed) {
  const s = progressSummary();
  if (!s.complete) {
    const left = TESTS.filter(t => !progress.tests[t.id]);
    return layout('Completion', `<div class="card"><h2>Not complete yet — ${s.done}/${s.total} (${s.pct}%)</h2>
    <p>Still open:</p><ul>${left.map(t => `<li>${esc(t.name)} <span class="small">(${esc(t.feature)})</span></li>`).join('')}</ul>
    <p><a href="/tests">Back to the mission page</a></p></div>`, { user });
  }
  const feats = FEATURES.map(f => { const ts = TESTS.filter(t => t.feature === f); return `<tr><td>${esc(f)}</td><td>${ts.length}</td></tr>`; }).join('');
  const lessons = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('');
  const impacts = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('');
  const reports = TESTS.map(t => `<li><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)}. Remediation: ${esc(t.report.remediation)}</li>`).join('');
  return layout('Completion', `<div class="card"><h2>Lab complete — 100%</h2>
  ${justNamed ? '<div class="ok">Name saved for your certificate.</div>' : ''}
  <h3>1) Total features in this lab</h3><p>${FEATURES.length} features, ${s.total} security tests.</p>
  <h3>2) Vulnerabilities per feature</h3><table><tr><th>Feature</th><th>Tests</th></tr>${feats}</table>
  <h3>3) Ways testing was done</h3><p>${s.total} tests completed, one per technique:</p><ul>${TESTS.map(t => `<li>${esc(t.name)} (${esc(t.owasp)})</li>`).join('')}</ul>
  <h3>4) What you learned</h3><ul>${lessons}</ul>
  <h3>5) What this means for a real client</h3><ul>${impacts}</ul>
  <h3>6) Writing it in a real report</h3><ul>${reports}</ul>
  <h3>Your completion key for Lab ${LAB_NUMBER + 1}</h3>
  <p><code style="font-size:18px">${esc(completionKey())}</code></p>
  <form method="POST" action="/complete"><label>Your name (for the certificate)</label>
  <input name="testerName" value="${esc(progress.testerName || '')}" style="max-width:320px"> <button>Save name</button></form>
  <p><a class="btn" href="/certificate">View your certificate</a></p></div>`, { user });
}
function certificatePage() {
  const s = progressSummary();
  if (!s.complete) return layout('Certificate', `<div class="card"><h2>Certificate locked</h2><p>Complete 100% of the tests first — currently ${s.pct}%.</p></div>`);
  const name = progress.testerName || 'HexaCyberLab Tester';
  const date = progress.completedAt ? new Date(progress.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  return `<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER}</title><style>${CSS}</style></head><body style="background:#334155">
  <div class="cert"><img src="/logo.png" style="height:70px">
  <h1 style="margin:8px 0">Certificate of Completion</h1>
  <p>This certifies that</p><h2 style="margin:6px 0">${esc(name)}</h2>
  <p>has completed 100% of the security tests in<br><b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b> (${s.total} tests across ${FEATURES.length} features)</p>
  <p>${esc(date)}</p><p style="margin-top:22px"><b>HexaCyberLab</b> — Built by Md. Jony Hassain, Founder</p>
  <p class="small"><a href="/complete">Back to completion summary</a></p></div></body></html>`;
}

/* ============================ Lab Coach chatbot ============================ */
function chatReply(raw) {
  const msg = String(raw || '').toLowerCase();
  const s = progressSummary();
  if (/(who (built|made|created)|founder|jony|hassain|built this|made this)/.test(msg)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (/(completion key|the key|next lab.*key|key please|give.*key)/.test(msg)) {
    if (s.complete && progress.keyRevealed) return 'You completed the lab — your completion key is: ' + completionKey() + ' — paste it into Lab ' + (LAB_NUMBER + 1) + ' to unlock it.';
    return 'I do not have the completion key yet — I only receive it when the lab is completed 100%. Right now you are at ' + s.pct + '% (' + s.done + '/' + s.total + ' tests). Finish every test and I will share it.';
  }
  const feat = FEATURES.find(f => msg.includes(f.toLowerCase()) || msg.includes(f.toLowerCase().split(' ')[0]));
  if (/(how many|count|which|list|features|tests|vulnerabilit)/.test(msg)) {
    if (feat) {
      const ts = TESTS.filter(t => t.feature === feat);
      return feat + ' has ' + ts.length + ' tests: ' + ts.map(t => t.name + (progress.tests[t.id] ? ' (done)' : '')).join('; ') + '. Attempts so far on this feature: ' + (progress.attempts[feat] || 0) + '.';
    }
    return 'HexaAuth (Lab ' + LAB_NUMBER + ') has ' + FEATURES.length + ' features and ' + s.total + ' tests: ' + FEATURES.map(f => f + ' (' + TESTS.filter(t => t.feature === f).length + ')').join(', ') + '. Your progress: ' + s.done + '/' + s.total + ' (' + s.pct + '%). The full map is on /tests.';
  }
  let test = TESTS.find(t => t.keys.some(k => msg.includes(k)));
  if (!test && feat) test = TESTS.find(t => t.feature === feat && !progress.tests[t.id]) || TESTS.find(t => t.feature === feat);
  if (test && /(how|do|exploit|hack|solve|pass|guide|help|steps|attack)/.test(msg)) {
    const att = progress.attempts[test.feature] || 0;
    if (progress.tests[test.id]) return 'You already passed "' + test.name + '". ' + test.guide;
    if (att >= 3) return 'Step by step for "' + test.name + '": ' + test.guide;
    return 'That feature is locked for help. First try the ' + test.feature + ' tests yourself at least 3 times — I can see you\'ve tried ' + att + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  if (/(next|what should|where|start|stuck)/.test(msg)) {
    const nx = TESTS.find(t => !progress.tests[t.id]);
    if (!nx) return 'Everything is done — 100%! Open /complete for your summary and completion key.';
    return 'Next open test: "' + nx.name + '" in ' + nx.feature + ' (' + nx.difficulty + '). Attempts on that feature: ' + (progress.attempts[nx.feature] || 0) + '/3 for my step-by-step help. The hints on /tests are always available.';
  }
  if (/(hello|hi|hey|help)/.test(msg)) {
    return 'Hi! This is Lab ' + LAB_NUMBER + ' — HexaAuth, an identity platform with tenant apps, OAuth clients, SSO and MFA. You are at ' + s.pct + '% (' + s.done + '/' + s.total + '). Ask me how many tests a feature has, or — after 3 real tries on a feature — ask how a test is done.';
  }
  return 'I can explain the lab map (features and test counts are public), suggest your next open test, and — once you have tried a feature at least 3 times — guide you step by step. The HOW of each test is locked until then. Try /tests for hints, or ask "what next?".';
}

/* ============================ Router & handlers ============================ */
const _fragD = ['R0tINQ==', 'LURORw==', 'VFc4UA==', 'QVA4TA=='];
function completionKey() { return _asm(_fragC.concat(_fragD)); }

const XSS_RE = /<script|onerror\s*=|onload\s*=|<svg|<img[^>]*onerror|<iframe/i;
const INJ_RE = /'\s*(or|and)\s+(?:'[^']*'|\d+)\s*=\s*(?:'[^']*'|\d+)/i;
function hasXss(s) { return XSS_RE.test(String(s || '')); }
function nowMinute() { return Math.floor(Date.now() / 60000); }

function parseCookies(req) {
  const out = {};
  const h = req.headers.cookie || '';
  for (const part of h.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 200000) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) {
        try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); }
      } else {
        const o = {};
        try { for (const [k, v] of new URLSearchParams(data)) o[k] = v; } catch (e) { /* ignore */ }
        resolve(o);
      }
    });
    req.on('error', () => resolve({}));
  });
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function sendJson(res, code, obj) { send(res, code, JSON.stringify(obj), 'application/json'); }
function redirect(res, loc) { res.writeHead(302, { Location: loc }); res.end(); }
function notFound(res, user) { send(res, 404, layout('Not found', '<div class="card"><h2>404 — page not found</h2><p><a href="/">Back to dashboard</a></p></div>', { user })); }
function checkEnum(sess) { if (sess && sess.enumHit && sess.enumMiss) pass('user-enumeration'); }

async function handle(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1');
  const pathname = url.pathname;
  const method = req.method;
  const cookies = parseCookies(req);
  const sess = cookies.hx_session ? sessions.get(cookies.hx_session) : null;
  const sessUser = sess && sess.uid ? users.find(u => u.id === sess.uid) : null;
  const euSess = cookies.eu_session ? euSessions.get(cookies.eu_session) : null;

  /* Always reachable (also while locked) */
  if (pathname === '/logo.png') {
    try { const img = fs.readFileSync(LOGO_FILE); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(img); }
    catch (e) { return send(res, 404, 'no logo'); }
  }
  if (pathname === '/api/progress' && method === 'GET') return sendJson(res, 200, progressSummary());
  if (pathname === '/api/chat' && method === 'POST') {
    const b = await readBody(req);
    return sendJson(res, 200, { reply: chatReply(b.message) });
  }
  if (pathname === '/unlock' && method === 'POST') {
    const b = await readBody(req);
    if (String(b.key || '') === entryKey()) {
      progress.unlocked = true; saveProgress();
      return redirect(res, '/');
    }
    return send(res, 403, gatePage('That key was not accepted.'));
  }
  if (!progress.unlocked) return send(res, 200, gatePage());

  /* ---------------- Console auth ---------------- */
  if (pathname === '/login' && method === 'GET') return send(res, 200, loginPage());
  if (pathname === '/login' && method === 'POST') {
    attempt('Login & Authentication');
    const b = await readBody(req);
    let anon = sess;
    if (!anon) { const sid = newConsoleSession(res, null); anon = sessions.get(sid); }
    const email = String(b.email || ''), password = String(b.password || '');
    if (INJ_RE.test(email)) { // simulated string-built query returns the first row
      pass('sqli-login');
      newConsoleSession(res, users[0].id);
      return redirect(res, '/');
    }
    const u = users.find(x => x.email.toLowerCase() === email.toLowerCase());
    if (!u) { anon.enumMiss = true; checkEnum(anon); return send(res, 200, loginPage('No account found for that email.')); }
    if (u.disabled) return send(res, 200, loginPage('This account has been disabled.'));
    if (u.password !== password) {
      anon.enumHit = true; checkEnum(anon);
      failedLogins[u.email] = (failedLogins[u.email] || 0) + 1;
      if (failedLogins[u.email] >= 10) pass('brute-force');
      return send(res, 200, loginPage('Incorrect password for that account.'));
    }
    if (u.email === 'demo@hexaauth.local') pass('default-creds');
    newConsoleSession(res, u.id);
    return redirect(res, '/');
  }
  if (pathname === '/register' && method === 'GET') return send(res, 200, registerPage());
  if (pathname === '/register' && method === 'POST') {
    attempt('Registration & Profile');
    const b = await readBody(req);
    const name = String(b.name || ''), email = String(b.email || ''), password = String(b.password || '');
    if (!name || !email.includes('@') || !password) return send(res, 200, registerPage('Please fill in name, a valid email and a password.'));
    if (users.some(x => x.email.toLowerCase() === email.toLowerCase())) return send(res, 200, registerPage('An account with that email already exists.'));
    const nu = { id: ++userSeq, name, email, password, role: b.role === 'admin' ? 'admin' : 'user', disabled: false };
    users.push(nu);
    if (b.role === 'admin') pass('mass-assignment');
    if (password.length < 4) pass('weak-password');
    if (hasXss(name)) pass('stored-xss-profile');
    return send(res, 200, loginPage('Account created — please sign in.'));
  }
  if (pathname === '/forgot' && method === 'GET') return send(res, 200, forgotPage());
  if (pathname === '/forgot' && method === 'POST') {
    attempt('Login & Authentication');
    const b = await readBody(req);
    let anon = sess;
    if (!anon) { const sid = newConsoleSession(res, null); anon = sessions.get(sid); }
    const u = users.find(x => x.email.toLowerCase() === String(b.email || '').toLowerCase());
    if (!u) { anon.enumMiss = true; checkEnum(anon); return send(res, 200, forgotPage('No account with that email.')); }
    anon.enumHit = true; checkEnum(anon);
    const token = 'rst-' + u.id + '-' + nowMinute();
    issuedResetTokens.set(token, u.id);
    return send(res, 200, forgotPage('If the account exists, a reset link has been created.', token));
  }
  if (pathname === '/reset' && method === 'GET') return send(res, 200, resetPage('', url.searchParams.get('token') || ''));
  if (pathname === '/reset' && method === 'POST') {
    attempt('Login & Authentication');
    const b = await readBody(req);
    const token = String(b.token || ''), password = String(b.password || '');
    if (!password) return send(res, 200, resetPage('Please enter a new password.', token));
    if (issuedResetTokens.has(token)) {
      const u = users.find(x => x.id === issuedResetTokens.get(token));
      issuedResetTokens.delete(token);
      if (u) { u.password = password; return send(res, 200, loginPage('Password updated — please sign in.')); }
    }
    const m = token.match(/^rst-(\d+)-(\d+)$/);
    if (m) { // forged but well-formed: derived only from the user id + current minute
      const u = users.find(x => x.id === parseInt(m[1], 10));
      if (u && Math.abs(parseInt(m[2], 10) - nowMinute()) <= 1) {
        u.password = password;
        pass('reset-token');
        return send(res, 200, loginPage('Password updated — please sign in.'));
      }
    }
    return send(res, 200, resetPage('Invalid or expired token.', token));
  }
  if (pathname === '/logout') {
    if (cookies.hx_session) sessions.delete(cookies.hx_session);
    res.setHeader('Set-Cookie', ['hx_session=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0']);
    return redirect(res, '/login');
  }

  /* ---------------- Console pages ---------------- */
  if (pathname === '/' && method === 'GET') {
    if (!sessUser) return redirect(res, '/login');
    return send(res, 200, dashboardPage(sessUser));
  }
  if (pathname === '/directory' && method === 'GET') {
    if (!sessUser) return redirect(res, '/login');
    return send(res, 200, directoryPage(sessUser));
  }
  if (pathname === '/profile' && method === 'GET') {
    if (!sessUser) return redirect(res, '/login');
    return send(res, 200, profilePage(sessUser, sess));
  }
  if (pathname === '/profile' && method === 'POST') {
    if (!sessUser) return redirect(res, '/login');
    attempt('Registration & Profile');
    const b = await readBody(req);
    if (!b.hx_marker || b.hx_marker !== sess.marker) pass('profile-csrf');
    if (hasXss(b.name)) pass('stored-xss-profile');
    if (b.name) sessUser.name = String(b.name);
    return send(res, 200, profilePage(sessUser, sess, 'Profile saved.'));
  }
  const appMatch = pathname.match(/^\/apps\/(\d+)(\/users|\/update|\/sso)?$/);
  if (appMatch) {
    if (!sessUser) return redirect(res, '/login');
    const app = apps.find(a => a.id === parseInt(appMatch[1], 10));
    if (!app) return notFound(res, sessUser);
    const sub = appMatch[2] || '';
    if (sub === '' && method === 'GET') {
      attempt('Tenant Apps & Clients');
      if (app.ownerId !== sessUser.id) pass('app-idor');
      return send(res, 200, appPage(sessUser, app));
    }
    if (sub === '/update' && method === 'POST') {
      attempt('Tenant Apps & Clients');
      const b = await readBody(req);
      if (b.name) app.name = String(b.name);
      if (b.redirectUri) app.redirectUris = [String(b.redirectUri)];
      if (b.plan && String(b.plan) !== app.plan) { app.plan = String(b.plan); pass('plan-tamper'); }
      return send(res, 200, appPage(sessUser, app, 'Settings saved.'));
    }
    if (sub === '/users' && method === 'GET') {
      attempt('End Users & MFA');
      if (app.ownerId !== sessUser.id) pass('cross-app-users');
      return send(res, 200, appUsersPage(sessUser, app));
    }
    if (sub === '/sso' && method === 'POST') {
      attempt('SSO Configuration');
      const b = await readBody(req);
      app.ssoDomain = String(b.ssoDomain || '');
      app.ssoEnabled = b.ssoEnabled === 'on' || b.ssoEnabled === 'true' || b.ssoEnabled === '1';
      if (app.ownerId !== sessUser.id) pass('sso-tamper');
      return send(res, 200, appPage(sessUser, app, 'SSO configuration saved.'));
    }
  }

  /* ---------------- Admin ---------------- */
  if (pathname === '/admin' && method === 'GET') {
    if (!sessUser) return redirect(res, '/login');
    attempt('Admin Panel');
    const cookieRole = cookies.hx_role;
    if (sessUser.role !== 'admin' && cookieRole === 'admin') { pass('cookie-role'); return send(res, 200, adminPage()); }
    if (sessUser.role === 'admin') return send(res, 200, adminPage());
    return send(res, 403, layout('Forbidden', '<div class="card"><h2>403 — admins only</h2></div>', { user: sessUser }));
  }
  const disMatch = pathname.match(/^\/admin\/users\/(\d+)\/disable$/);
  if (disMatch && method === 'GET') {
    if (!sessUser) return redirect(res, '/login');
    attempt('Admin Panel');
    const isAdmin = sessUser.role === 'admin' || cookies.hx_role === 'admin';
    if (!isAdmin) return send(res, 403, layout('Forbidden', '<div class="card"><h2>403 — admins only</h2></div>', { user: sessUser }));
    const target = users.find(u => u.id === parseInt(disMatch[1], 10));
    if (target) { target.disabled = true; pass('admin-csrf'); }
    return redirect(res, '/admin');
  }

  /* ---------------- End users ---------------- */
  if (pathname === '/enduser/login' && method === 'GET') {
    const app = apps.find(a => a.clientId === url.searchParams.get('app')) || apps[0];
    return send(res, 200, euLoginPage(app, '', url.searchParams.get('next') || ''));
  }
  if (pathname === '/enduser/login' && method === 'POST') {
    attempt('End Users & MFA');
    const b = await readBody(req);
    const app = apps.find(a => a.clientId === b.app) || apps[0];
    const eu = endUsers.find(e => e.appId === app.id && e.email.toLowerCase() === String(b.email || '').toLowerCase());
    if (!eu || eu.password !== String(b.password || '')) return send(res, 200, euLoginPage(app, 'Invalid email or password.', b.next || ''));
    const pending = eu.mfaEnabled && app.mfaRequired;
    newEuSession(res, eu.id, app.id, pending);
    if (pending) return redirect(res, '/enduser/mfa' + (b.next ? '?next=' + encodeURIComponent(b.next) : ''));
    return redirect(res, b.next || '/enduser/home');
  }
  if (pathname === '/enduser/mfa' && method === 'GET') {
    if (!euSess) return redirect(res, '/enduser/login?app=acme_web');
    return send(res, 200, euMfaPage('', url.searchParams.get('next') || ''));
  }
  if (pathname === '/enduser/mfa' && method === 'POST') {
    if (!euSess) return redirect(res, '/enduser/login?app=acme_web');
    attempt('End Users & MFA');
    const b = await readBody(req);
    const eu = endUsers.find(e => e.id === euSess.euId);
    if (eu && String(b.code || '') === eu.mfaCode && eu.mfaCode) {
      euSess.mfaVerified = true; euSess.mfaPending = false;
      return redirect(res, b.next || url.searchParams.get('next') || '/enduser/home');
    }
    return send(res, 200, euMfaPage('Incorrect code.'));
  }
  if (pathname === '/enduser/home' && method === 'GET') {
    if (!euSess) return redirect(res, '/enduser/login?app=acme_web');
    const eu = endUsers.find(e => e.id === euSess.euId);
    const app = apps.find(a => a.id === euSess.appId);
    if (euSess.mfaPending && !euSess.mfaVerified) pass('mfa-bypass'); // flaw: pending session is fully trusted here
    return send(res, 200, euHomePage(eu, app));
  }
  if (pathname === '/enduser/logout') {
    if (cookies.eu_session) euSessions.delete(cookies.eu_session);
    res.setHeader('Set-Cookie', 'eu_session=; Path=/; Max-Age=0');
    return redirect(res, '/login');
  }

  /* ---------------- SSO ---------------- */
  if (pathname === '/sso/login' && method === 'GET') {
    const app = apps.find(a => a.clientId === url.searchParams.get('client_id')) || apps[1];
    return send(res, 200, ssoLoginPage(app, app.ssoEnabled ? '' : 'SSO is not enabled for this app.'));
  }
  if (pathname === '/sso/login' && method === 'POST') {
    attempt('SSO Configuration');
    const b = await readBody(req);
    const app = apps.find(a => a.clientId === b.client_id) || apps[1];
    if (!app.ssoEnabled) return send(res, 200, ssoLoginPage(app, 'SSO is not enabled for this app.'));
    const email = String(b.email || '');
    const domain = email.split('@')[1] || '';
    if (domain !== app.ssoDomain) return send(res, 200, ssoLoginPage(app, 'Email domain does not match the SSO domain.'));
    const eu = endUsers.find(e => e.appId === app.id && e.email.toLowerCase() === email.toLowerCase());
    if (!eu) return send(res, 200, ssoLoginPage(app, 'No user with that email in this app.'));
    newEuSession(res, eu.id, app.id, false); // flaw: the typed email is trusted as a verified assertion
    pass('sso-assertion');
    return redirect(res, '/enduser/home');
  }

  /* ---------------- OAuth ---------------- */
  if (pathname === '/oauth/authorize' && method === 'GET') {
    attempt('OAuth Flow');
    const app = apps.find(a => a.clientId === url.searchParams.get('client_id'));
    if (!app) return send(res, 400, layout('Error', '<div class="card"><h2>Unknown client_id</h2></div>'));
    const self = '/oauth/authorize?client_id=' + encodeURIComponent(app.clientId) + '&redirect_uri=' + encodeURIComponent(url.searchParams.get('redirect_uri') || app.redirectUris[0] || '') + '&state=' + encodeURIComponent(url.searchParams.get('state') || '');
    if (!euSess || euSess.appId !== app.id) return redirect(res, '/enduser/login?app=' + encodeURIComponent(app.clientId) + '&next=' + encodeURIComponent(self));
    if (euSess.mfaPending && !euSess.mfaVerified) return redirect(res, '/enduser/mfa?next=' + encodeURIComponent(self));
    const eu = endUsers.find(e => e.id === euSess.euId);
    return send(res, 200, consentPage(app, eu, url.searchParams.get('redirect_uri') || app.redirectUris[0] || '', url.searchParams.get('state') || ''));
  }
  if (pathname === '/oauth/authorize/approve' && method === 'POST') {
    attempt('OAuth Flow');
    const b = await readBody(req);
    const app = apps.find(a => a.clientId === b.client_id);
    if (!app || !euSess || euSess.appId !== app.id) return send(res, 400, layout('Error', '<div class="card"><h2>Not signed in to this app.</h2></div>'));
    const redirectUri = String(b.redirect_uri || '');
    let origin = '';
    try { origin = new URL(app.redirectUris[0]).origin; } catch (e) { /* ignore */ }
    const ok = app.redirectUris.includes(redirectUri) || (origin && redirectUri.startsWith(origin)); // flaw: prefix match
    if (!ok) return send(res, 400, layout('Error', '<div class="card"><h2>redirect_uri mismatch</h2><p>The redirect URI is not registered for this client.</p></div>'));
    const code = 'code_' + (++codeSeq);
    authCodes.set(code, { appId: app.id, euId: euSess.euId, redirectUri, exchanges: 0 });
    if (!app.redirectUris.includes(redirectUri)) pass('redirect-uri');
    const sep = redirectUri.includes('?') ? '&' : '?';
    return redirect(res, redirectUri + sep + 'code=' + code + (b.state ? '&state=' + encodeURIComponent(b.state) : ''));
  }
  if (pathname === '/oauth/token' && method === 'POST') {
    attempt('OAuth Flow');
    const b = await readBody(req);
    const app = apps.find(a => a.clientId === b.client_id);
    const rec = authCodes.get(String(b.code || ''));
    if (!app || !rec || rec.appId !== app.id || String(b.client_secret || '') !== app.clientSecret) {
      return sendJson(res, 400, { error: 'invalid_grant' });
    }
    if (rec.exchanges >= 1) pass('code-reuse'); // flaw: codes are never invalidated
    rec.exchanges++;
    const token = 'hxat_' + Buffer.from(rec.euId + ':' + rec.appId, 'utf8').toString('base64') + '.' + (++tokenSeq);
    issuedAccessTokens.add(token);
    return sendJson(res, 200, { access_token: token, token_type: 'Bearer', expires_in: 3600 });
  }
  if (pathname === '/api/me' && method === 'GET') {
    const auth = req.headers.authorization || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (issuedAccessTokens.has(token)) {
      const payload = token.slice(5, token.lastIndexOf('.'));
      const parts = Buffer.from(payload, 'base64').toString('utf8').split(':');
      const eu = endUsers.find(e => e.id === parseInt(parts[0], 10));
      if (eu) return sendJson(res, 200, { id: eu.id, appId: eu.appId, email: eu.email, mfaEnabled: eu.mfaEnabled });
    }
    const m = token.match(/^hxat_([A-Za-z0-9+/=]+)\.(\d+)$/);
    if (m) { // flaw: token is just an encoding — never issued, still accepted
      const parts = Buffer.from(m[1], 'base64').toString('utf8').split(':');
      const eu = endUsers.find(e => e.id === parseInt(parts[0], 10) && e.appId === parseInt(parts[1], 10));
      if (eu) { pass('token-predictable'); return sendJson(res, 200, { id: eu.id, appId: eu.appId, email: eu.email, mfaEnabled: eu.mfaEnabled }); }
    }
    return sendJson(res, 401, { error: 'invalid_token' });
  }

  /* ---------------- Platform & app APIs ---------------- */
  const apiApp = pathname.match(/^\/api\/apps\/(\d+)(\/users)?$/);
  if (apiApp && method === 'GET') {
    const app = apps.find(a => a.id === parseInt(apiApp[1], 10));
    if (!app) return sendJson(res, 404, { error: 'no such app' });
    if (apiApp[2] === '/users') {
      const key = req.headers['x-api-key'] || '';
      if (key !== app.apiKey) return sendJson(res, 401, { error: 'invalid api key' });
      attempt('End Users & MFA');
      if (!sessUser || app.ownerId !== sessUser.id) pass('app-api-key');
      return sendJson(res, 200, endUsers.filter(e => e.appId === app.id));
    }
    if (!sessUser) return sendJson(res, 401, { error: 'login required' });
    attempt('Tenant Apps & Clients');
    if (app.ownerId !== sessUser.id) pass('secret-exposure'); // flaw: full record incl. secret serialised
    return sendJson(res, 200, app);
  }
  if (pathname === '/api/console/users' && method === 'GET') {
    attempt('Platform & API');
    if (!sessUser) pass('api-users-dump'); // flaw: no authentication on this endpoint at all
    return sendJson(res, 200, users);
  }
  if (pathname === '/debug' && method === 'GET') {
    attempt('Platform & API');
    pass('debug-exposure');
    return sendJson(res, 200, { env: 'production', version: '2.4.1', tenants: apps.length, consoleUsers: users.length, tokenSigningSecret: 'hexaauth_signing_secret_5ecret', note: 'diagnostics — do not expose' });
  }

  /* ---------------- Mission / completion ---------------- */
  if (pathname === '/tests' && method === 'GET') return send(res, 200, testsPage(sessUser));
  if (pathname === '/complete' && method === 'GET') return send(res, 200, completePage(sessUser, false));
  if (pathname === '/complete' && method === 'POST') {
    const b = await readBody(req);
    if (b.testerName != null) { progress.testerName = String(b.testerName).slice(0, 60); saveProgress(); }
    return send(res, 200, completePage(sessUser, true));
  }
  if (pathname === '/certificate' && method === 'GET') return send(res, 200, certificatePage());

  return notFound(res, sessUser);
}

const server = http.createServer((req, res) => {
  handle(req, res).catch(() => {
    try { send(res, 500, 'Internal error — the lab is still running.'); } catch (e) { /* socket gone */ }
  });
});
if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => {
    console.log(LAB_NAME + ' (LAB ' + LAB_NUMBER + ') listening on http://127.0.0.1:' + PORT);
  });
}
module.exports = { TESTS, FEATURES };
