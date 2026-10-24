'use strict';
/*
 * HexaProject — LAB 13 of 110 (Category 2: SaaS & Business Platforms)
 * A deliberately vulnerable project-management platform for hands-on
 * web penetration-testing practice. LOCAL USE ONLY. Binds 127.0.0.1.
 * Zero dependencies — Node.js built-ins only.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3022;
const LAB_NUMBER = 13;
const LAB_NAME = 'HexaProject';
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const ATTACH_DIR = path.join(DIR, 'attachments');
const LOGO_FILE = path.join(DIR, 'logo.png');

/* ------------------------------------------------------------------ *
 *  Seed business data (in-memory; restart resets the business data,
 *  but NOT the lab progress — that lives in progress.json).
 * ------------------------------------------------------------------ */
let uidSeq = 100;
const users = [
  { id: 1, name: 'Ayesha Rahman',  email: 'admin@hexaproject.local',  password: 'Admin@123',  role: 'admin' },
  { id: 2, name: 'Tanvir Hasan',   email: 'pm@hexaproject.local',     password: 'Manager@123', role: 'user' },
  { id: 3, name: 'Nadia Islam',    email: 'dev@hexaproject.local',    password: 'User@123',   role: 'user' },
  { id: 4, name: 'Sara Khatun',    email: 'sara@hexaproject.local',   password: 'User@123',   role: 'user' },
  { id: 5, name: 'Victor Das',     email: 'victor@hexaproject.local', password: 'User@123',   role: 'user' },
  { id: 6, name: 'Demo User',      email: 'demo@hexaproject.local',   password: 'demo123',    role: 'user' },
];
let projSeq = 100;
const projects = [
  { id: 1, name: 'Website Redesign', desc: 'Rebuild the public marketing site and blog.', ownerId: 2,
    members: { 2: 'owner', 3: 'manager', 4: 'member', 5: 'viewer' } },
  { id: 2, name: 'Payments Migration', desc: 'Move billing to the new payment provider. CONFIDENTIAL budget attached.', ownerId: 4,
    members: { 4: 'owner' } },
];
let taskSeq = 100;
const tasks = [
  { id: 1, projectId: 1, milestoneId: 1, title: 'Design new homepage mockup', desc: 'Figma draft for the landing page.', assigneeId: 3, status: 'doing', priority: 'high' },
  { id: 2, projectId: 1, milestoneId: 1, title: 'Write launch announcement', desc: 'Blog post for launch day.', assigneeId: 4, status: 'todo', priority: 'medium' },
  { id: 3, projectId: 2, milestoneId: 2, title: 'Audit provider fees', desc: 'Compare old vs new transaction fees.', assigneeId: 4, status: 'todo', priority: 'high' },
];
let msSeq = 100;
const milestones = [
  { id: 1, projectId: 1, name: 'Design freeze', due: '2026-11-01' },
  { id: 2, projectId: 2, name: 'Provider cutover', due: '2026-12-15' },
];
let commentSeq = 100;
const comments = [
  { id: 1, taskId: 1, authorId: 3, body: 'First draft is ready for review.' },
  { id: 2, taskId: 1, authorId: 2, body: 'Looks good — please tighten the hero section.' },
];
let fileSeq = 100;
const files = [
  { id: 1, projectId: 1, name: 'kickoff-notes.txt', content: 'Kickoff notes: scope, timeline and owners for the redesign.', uploaderId: 2 },
  { id: 2, projectId: 2, name: 'provider-budget.txt', content: 'CONFIDENTIAL — migration budget: $48,000. Provider fee table attached in the vault.', uploaderId: 4 },
];

/* On-disk attachment store used by the /download endpoint (seeded at boot). */
function seedAttachDir() {
  try {
    fs.mkdirSync(ATTACH_DIR, { recursive: true });
    const brief = path.join(ATTACH_DIR, 'project-brief.txt');
    if (!fs.existsSync(brief)) fs.writeFileSync(brief, 'HexaProject — shared project brief (safe to download).\n');
  } catch (e) { /* non-fatal */ }
}
seedAttachDir();

/* ------------------------------------------------------------------ *
 *  Sessions (server-side store). The hx_role cookie is set at login
 *  from the account's real role — and, by design flaw, the admin gate
 *  trusts that client-side cookie instead of the server record.
 * ------------------------------------------------------------------ */
const sessions = new Map(); // sid -> { uid, enumHit, enumMiss }
const issuedTokens = new Map(); // reset token -> sid it was issued to
const failedLogins = {}; // email -> count

function newSession(res, uid) {
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, { uid: uid || null, enumHit: false, enumMiss: false });
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
const _fragA = ['TC1YSA==', 'US0zMQ=='];
function _asm(parts) {
  return parts.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}

/* ============================ TESTS ============================ */
const FEATURES = [
  'Login & Authentication', 'Registration & Profile', 'Projects', 'Search',
  'Tasks & Milestones', 'Comments', 'Files & Attachments', 'Team & Roles',
  'Admin Panel', 'Platform & API',
];
const TESTS = [
  /* ---------------- Login & Authentication ---------------- */
  { id: 'sqli-login', feature: 'Login & Authentication', name: 'SQL Injection — Login Bypass', owasp: 'A03 Injection', difficulty: 'Beginner', keys: ['sql', 'injection', 'login bypass', 'sqli'],
    hints: ['The login form builds its query by gluing your input straight into the SQL string.', 'A classic tautology in the email field can make the WHERE clause true for the first row in the table.', "Try email: ' OR '1'='1' --  with any password — you land in the first account, which is the admin."],
    lesson: 'String-built SQL queries let an attacker rewrite the login check itself. Parameterised queries remove the whole class.',
    impact: 'On a real client SaaS, this is a full account takeover of the first user in the table — usually an administrator — with no password at all.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.' },
    guide: "Step by step: 1) Open /login. 2) In the email field enter: ' OR '1'='1' --  3) Enter any password and submit. 4) You are logged in as the first user in the table (the platform admin) because the query became: email='' OR '1'='1' — always true." },
  { id: 'brute-force', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limiting on Login', owasp: 'A07 Auth Failures', difficulty: 'Beginner', keys: ['brute', 'rate limit', 'password guessing', 'lockout'],
    hints: ['Nothing slows you down: no lockout, no CAPTCHA, no delay.', 'Write a loop (or use Burp Intruder) and fire wrong passwords at one account.', 'After 10 failed attempts the app is still happily processing guesses — that missing throttle is the finding.'],
    lesson: 'Without throttling or lockout, online password guessing is cheap and quiet. Rate limits + lockout + MFA are the standard defence.',
    impact: 'Attackers can grind through password lists against real user accounts; one weak password anywhere becomes a breach.',
    report: { title: 'No Rate Limiting or Account Lockout on Login Endpoint', severity: 'High', remediation: 'Add progressive delays/lockout per account and IP, CAPTCHA after failures, and offer MFA.' },
    guide: 'Step by step: 1) Pick an account, e.g. sara@hexaproject.local. 2) Submit a wrong password 10 times (curl loop or Intruder). 3) Every attempt is processed at full speed — no block, no delay. 4) The test passes at the 10th accepted failure.' },
  { id: 'user-enumeration', feature: 'Login & Authentication', name: 'User Enumeration via Login & Reset Responses', owasp: 'A07 Auth Failures', difficulty: 'Beginner', keys: ['enumeration', 'enumerate', 'which emails exist', 'forgot'],
    hints: ['Compare the error for an email that exists with one that does not.', 'The login form and the forgot-password form answer differently depending on whether the account is real.', 'Probe one real address (from the README) and one invented address in the same session — the difference is the oracle.'],
    lesson: 'Different responses for "no such user" vs "wrong password" hand attackers a free list of valid accounts to target.',
    impact: 'Attackers harvest valid employee emails from the client\u2019s own login page, then aim phishing and password spraying precisely.',
    report: { title: 'Account Enumeration via Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message ("invalid credentials" / "if the account exists…") for every failure case.' },
    guide: 'Step by step: 1) In one browser session, submit /login with an invented email — note "No account found for that email." 2) Submit a real email with a wrong password — note the different message "Incorrect password…". 3) /forgot behaves the same way. The test passes once one session has seen both answers.' },
  { id: 'default-creds', feature: 'Login & Authentication', name: 'Default / Demo Credentials Still Active', owasp: 'A07 Auth Failures', difficulty: 'Beginner', keys: ['default', 'demo', 'credentials', 'weak account'],
    hints: ['Seeded/demo accounts are a classic leftover in production SaaS.', 'The README\u2019s test-account table includes a demo login — check whether it still works.', 'demo@hexaproject.local with its documented demo password is still an active account.'],
    lesson: 'Demo and default accounts shipped to production are pre-made doors: their passwords are public knowledge.',
    impact: 'Anyone who reads the product\u2019s docs or guesses the demo login walks straight into the client\u2019s workspace.',
    report: { title: 'Active Default/Demo Account with Known Password', severity: 'High', remediation: 'Remove demo/default accounts before production; force unique credentials for every seeded user.' },
    guide: 'Step by step: 1) Open /login. 2) Sign in as demo@hexaproject.local / demo123. 3) The account is fully active — that successful login is the finding.' },
  { id: 'reset-token', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07 Auth Failures', difficulty: 'Intermediate', keys: ['reset', 'token', 'predictable', 'forgot password'],
    hints: ['Ask for a reset for your own account and study the token format (the flow is intentionally transparent in this lab).', 'The token is built only from the user\u2019s numeric ID and the current minute — nothing random.', 'Compute rst-<victim id>-<current minute> for the admin (id 1) and post it straight to /reset without ever requesting a reset for that account.'],
    lesson: 'Reset tokens must be long, random and single-use. A token derived from public values (ID + time) can be forged for any account.',
    impact: 'An attacker resets the password of any user — including admins — knowing only their email and the time of day. Full account takeover, no inbox access needed.',
    report: { title: 'Password Reset Tokens Are Predictable (ID + Timestamp)', severity: 'Critical', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), store hashed, expire quickly, single use.' },
    guide: 'Step by step: 1) Note the token format: rst-<userId>-<epoch minute>. 2) In a fresh session (never use /forgot for the victim), compute the token for the victim\u2019s ID with the current minute. 3) POST /reset with their email, your computed token and a new password. 4) The reset succeeds — you forged it. The test passes because the token was never issued to your session.' },
  { id: 'cookie-tamper', feature: 'Login & Authentication', name: 'Session/Role Cookie Tampering', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['cookie', 'role', 'tamper', 'session', 'admin cookie'],
    hints: ['After login, look at the cookies the app sets — one of them carries your platform role.', 'That role cookie is trusted by the admin gate without any server-side check or signature.', 'Set hx_role=admin in your browser (or curl) while logged in as a normal user and open /admin.'],
    lesson: 'Authorisation data must live server-side. A role stored in an unsigned client cookie is a suggestion the user can edit.',
    impact: 'Any normal user promotes themselves to platform admin by editing a cookie — full control of every workspace on the client\u2019s SaaS.',
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
    impact: 'A stranger registers and instantly owns the platform: every project, every file, every user of the client\u2019s SaaS.',
    report: { title: 'Mass Assignment Allows Privilege Escalation via role Parameter', severity: 'Critical', remediation: 'Whitelist bindable fields explicitly; never bind role/privilege fields from client input.' },
    guide: 'Step by step: 1) Intercept or curl the /register POST. 2) Add the extra field role=admin to the body. 3) Submit — the account is created with the platform admin role (check the header/admin link). 4) The same trick works via POST /profile. The test passes when the injected role takes effect.' },
  { id: 'stored-xss-name', feature: 'Registration & Profile', name: 'Stored XSS via Display Name', owasp: 'A03 Injection', difficulty: 'Beginner', keys: ['stored xss', 'name', 'profile name', 'persistent'],
    hints: ['Your display name is shown all over the app — member lists, comment bylines, task assignees.', 'It is rendered without encoding.', 'Register or set your profile name to <script>alert(1)</script> — it is stored as-is and fires for everyone who sees it.'],
    lesson: 'Any stored field rendered without output encoding becomes a persistent script delivery mechanism aimed at other users — including admins.',
    impact: 'An attacker plants a script in their profile name; every teammate and admin who opens a member list runs it — session theft and actions in their name.',
    report: { title: 'Stored Cross-Site Scripting in User Display Name', severity: 'High', remediation: 'Context-encode all user-controlled output; sanitise stored rich text with an allowlist.' },
    guide: 'Step by step: 1) Register a new account (or edit your profile) with the name: <script>alert(1)</script> 2) Submit. 3) The payload is stored verbatim and rendered raw wherever the name appears — the test passes at store time.' },
  { id: 'profile-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['csrf', 'profile', 'cross-site', 'token'],
    hints: ['The profile form carries a token field (hx_tok) — but check whether the server actually verifies it.', 'Send the profile POST from a different origin, or strip the token entirely.', 'curl the /profile POST with an Origin: https://evil.example header and no hx_tok — the change is accepted anyway.'],
    lesson: 'A CSRF token that is rendered but never verified is decoration. State-changing requests must validate the token (or SameSite + origin checks) server-side.',
    impact: 'A malicious page a logged-in user visits silently rewrites their profile — the first step to account-takeover chains (e.g. changing the recovery email).',
    report: { title: 'Cross-Site Request Forgery on Profile Update (Token Not Verified)', severity: 'Medium', remediation: 'Verify the anti-CSRF token server-side on every state-changing request; enforce SameSite cookies.' },
    guide: 'Step by step: 1) Log in as any user and note your cookie. 2) From curl, POST /profile with a new name, your session cookie, an Origin: https://evil.example header and NO hx_tok field. 3) The name changes — the request was accepted cross-site. The test passes when a state change lands without a valid token.' },

  /* ---------------- Projects ---------------- */
  { id: 'project-idor', feature: 'Projects', name: 'Cross-Project IDOR — Reading Another Team\u2019s Private Project', owasp: 'A01 Broken Access Control', difficulty: 'Beginner', keys: ['idor', 'project', 'private', 'other team'],
    hints: ['Project URLs carry a simple numeric ID.', 'Your project list only shows your projects — but the detail page never checks membership.', 'Log in as victor and open /projects/2 — a private project you do not belong to renders in full.'],
    lesson: 'Hiding an object from lists is not access control. Every object fetch must check the caller\u2019s right to that object.',
    impact: 'Competitors or disgruntled users read other teams\u2019 roadmaps, budgets and client names just by changing a number in the URL.',
    report: { title: 'Insecure Direct Object Reference on Project Detail (No Membership Check)', severity: 'High', remediation: 'Check project membership/ownership on every project-scoped query; scope queries by the caller\u2019s memberships.' },
    guide: 'Step by step: 1) Log in as victor@hexaproject.local (member of project 1 only). 2) Browse to /projects/2. 3) Project 2 ("Payments Migration", a private project of another team) renders fully. The test passes when a non-member is served the project.' },
  { id: 'project-tamper', feature: 'Projects', name: 'Tampering with Another Team\u2019s Project (Edit/Delete)', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['tamper', 'edit project', 'delete project', 'rename'],
    hints: ['Reading is not the only missing check — the project settings form posts to /projects/<id>/update.', 'The server never asks whether you own (or even belong to) the project.', 'As victor, POST a new name to /projects/2/update — another team\u2019s project is renamed. /projects/<id>/delete works the same way.'],
    lesson: 'Broken access control on write paths turns confidentiality bugs into integrity disasters: data can be altered or destroyed, not just read.',
    impact: 'A low-privilege user renames, corrupts or deletes other customers\u2019 projects — vandalism or extortion against the client\u2019s tenants.',
    report: { title: 'Missing Authorisation on Project Update/Delete Allows Cross-Tenant Tampering', severity: 'High', remediation: 'Require owner (or manager) role on the target project for every mutating project endpoint.' },
    guide: 'Step by step: 1) Log in as victor. 2) curl/POST to /projects/2/update with a new name (the settings form on the project page shows the fields). 3) Re-open /projects/2 — the other team\u2019s project now carries your name. The test passes when a non-owner\u2019s write lands.' },

  /* ---------------- Search ---------------- */
  { id: 'search-xss', feature: 'Search', name: 'Reflected XSS in Search', owasp: 'A03 Injection', difficulty: 'Beginner', keys: ['reflected xss', 'search', 'query'],
    hints: ['The results page echoes "Results for: <your query>" back at you.', 'It echoes it raw — no encoding.', 'Search for <script>alert(1)</script> and view the page source: your payload is in the HTML untouched.'],
    lesson: 'Reflected input must be encoded for the context it lands in. Search boxes are the most-tested reflection point on any site.',
    impact: 'Attackers send victims a crafted search link; the script runs in the victim\u2019s session on the client\u2019s real domain — phishing and session theft follow.',
    report: { title: 'Reflected Cross-Site Scripting in Search Query', severity: 'Medium', remediation: 'HTML-encode the reflected query (and all reflected input) in the results page.' },
    guide: 'Step by step: 1) Log in. 2) Open /search?q=<script>alert(1)</script>. 3) The query is reflected unescaped in the results heading — the test passes when the payload lands raw in the response.' },
  { id: 'search-disclosure', feature: 'Search', name: 'Search Leaks Private Projects & Tasks', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['search', 'disclosure', 'private results', 'leak'],
    hints: ['Search feels global — test whether it respects project membership.', 'Search a word from another team\u2019s project while logged in as an outsider.', 'As victor, search "Payments" or "fees" — tasks from the private project 2 appear in your results. An injection string returns everything.'],
    lesson: 'Every read path — lists, detail pages AND search — must apply the same authorisation scoping. Search is the path teams forget.',
    impact: 'Private project names, task titles and internal vocabulary leak to any user, mapping the client\u2019s confidential work for targeted attacks.',
    report: { title: 'Search Results Not Scoped by Project Membership (Information Disclosure)', severity: 'Medium', remediation: 'Scope search queries to projects the caller belongs to; apply the same access checks as detail pages.' },
    guide: 'Step by step: 1) Log in as victor (project 1 only). 2) Search for "fees" or "Payments". 3) Results include tasks/projects from private project 2, which victor cannot open from his list. The test passes when a private object appears in an outsider\u2019s results.' },

  /* ---------------- Tasks & Milestones ---------------- */
  { id: 'task-idor', feature: 'Tasks & Milestones', name: 'Task IDOR — Viewing Tasks in Projects You Cannot Access', owasp: 'A01 Broken Access Control', difficulty: 'Beginner', keys: ['task idor', 'task', 'direct link'],
    hints: ['Tasks have their own URLs: /tasks/<id>.', 'The task page checks that you are logged in — nothing about the project it belongs to.', 'As victor, open /tasks/3 — a task inside the private project 2 renders with its full description.'],
    lesson: 'Child objects inherit the parent\u2019s sensitivity. Authorisation must be evaluated against the parent project on every child fetch.',
    impact: 'Internal task details — migration plans, fee audits, incident notes — are readable by any user who guesses an ID.',
    report: { title: 'Insecure Direct Object Reference on Task Detail (Parent Project Not Checked)', severity: 'High', remediation: 'Resolve the task\u2019s project and verify the caller\u2019s membership before serving any task data.' },
    guide: 'Step by step: 1) Log in as victor. 2) Open /tasks/3 (belongs to private project 2). 3) The full task renders. The test passes when a non-member is served the task.' },
  { id: 'viewer-task-edit', feature: 'Tasks & Milestones', name: 'Viewer Role Can Edit Tasks (Broken Role Check)', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['viewer', 'edit task', 'role', 'read-only'],
    hints: ['A viewer is supposed to be read-only inside a project.', 'The task update endpoint never compares your project role against the action.', 'As victor (viewer on project 1), POST /tasks/1/update with a new status — it saves.'],
    lesson: 'Roles must be enforced server-side per action, not just hidden in the UI. A read-only role that can write is an integrity hole.',
    impact: 'Auditors, clients and guests given "view-only" access can silently alter task states and contents — sabotage with legitimate credentials.',
    report: { title: 'Missing Server-Side Role Enforcement Lets Viewers Modify Tasks', severity: 'Medium', remediation: 'Enforce per-action role checks server-side (viewer = read-only) on every mutating endpoint.' },
    guide: 'Step by step: 1) Log in as victor — a VIEWER on project 1. 2) POST /tasks/1/update with status=done (use the task page\u2019s form fields). 3) The change saves despite the read-only role. The test passes when a viewer\u2019s write lands.' },
  { id: 'task-create-nonmember', feature: 'Tasks & Milestones', name: 'Non-Member Can Create Tasks in a Private Project', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['create task', 'non-member', 'add task', 'inject task'],
    hints: ['Creating a task posts to /projects/<id>/tasks.', 'That endpoint never checks that you belong to the project.', 'As victor, POST a new task into project 2 — it appears in the other team\u2019s board.'],
    lesson: 'Create paths are write paths: they need the same membership checks as reads and updates.',
    impact: 'Outsiders inject fake tasks into private projects — spam, social-engineering bait, or poisoned work queues for the client\u2019s teams.',
    report: { title: 'Task Creation Endpoint Lacks Project Membership Check', severity: 'Medium', remediation: 'Verify membership (member role or above) before creating objects inside a project.' },
    guide: 'Step by step: 1) Log in as victor. 2) POST /projects/2/tasks with a title. 3) The task is created inside private project 2 even though you are not a member. The test passes when the task exists.' },
  { id: 'milestone-tamper', feature: 'Tasks & Milestones', name: 'Milestone Tampering by a Plain Member', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['milestone', 'due date', 'tamper milestone'],
    hints: ['Milestones drive deadlines — editing them should be an owner/manager action.', 'The milestone update endpoint accepts posts from any project member.', 'As sara (a plain member of project 1), POST /milestones/1/update with a new due date — it changes.'],
    lesson: 'Not every member action is equal: plan-level objects (milestones, budgets) need elevated roles, checked server-side.',
    impact: 'A junior member quietly moves a contractual deadline; the client discovers it when the milestone is "missed" — or met fraudulently.',
    report: { title: 'Milestone Modification Allowed for Non-Manager Members', severity: 'Medium', remediation: 'Restrict milestone create/update to owner/manager roles, enforced server-side.' },
    guide: 'Step by step: 1) Log in as sara (member of project 1, not a manager). 2) POST /milestones/1/update with due=2030-01-01. 3) The milestone\u2019s date changes. The test passes when a non-manager\u2019s edit lands.' },

  /* ---------------- Comments ---------------- */
  { id: 'comment-xss', feature: 'Comments', name: 'Stored XSS in Task Comments', owasp: 'A03 Injection', difficulty: 'Beginner', keys: ['comment xss', 'stored', 'comment'],
    hints: ['Comment bodies are shown to the whole team on the task page.', 'They are stored and rendered without sanitising.', 'Post a comment containing <script>alert(1)</script> on any task — it is saved verbatim and fires for every viewer.'],
    lesson: 'Collaborative text fields are prime stored-XSS territory: one user\u2019s input becomes every teammate\u2019s execution context.',
    impact: 'A single comment hijacks the sessions of everyone who opens the task — including project owners and admins.',
    report: { title: 'Stored Cross-Site Scripting in Task Comments', severity: 'High', remediation: 'Encode comment output on render; sanitise with an allowlist if markup is needed.' },
    guide: 'Step by step: 1) Log in as any project member. 2) On a task page, post the comment: <script>alert(1)</script> 3) It is stored and rendered raw to every viewer of the task. The test passes at store time.' },
  { id: 'comment-delete-idor', feature: 'Comments', name: 'Deleting Other Users\u2019 Comments (No Author Check)', owasp: 'A01 Broken Access Control', difficulty: 'Beginner', keys: ['delete comment', 'comment idor', 'author'],
    hints: ['Every comment has a delete endpoint: /comments/<id>/delete.', 'The server never checks that the comment is yours.', 'Note a comment written by someone else, then POST its delete as a different user — it disappears.'],
    lesson: 'Ownership checks apply to destructive actions too. "Logged in" is not "authorised for this object".',
    impact: 'Users erase colleagues\u2019 comments — destroying discussion history and audit trails inside the client\u2019s projects.',
    report: { title: 'Comment Deletion Lacks Authorisation (Any User Can Delete Any Comment)', severity: 'Medium', remediation: 'Only the comment\u2019s author (or a project manager) may delete it; verify server-side.' },
    guide: 'Step by step: 1) Find a comment by another user (e.g. comment 1 by dev on task 1). 2) Log in as victor. 3) POST /comments/1/delete. 4) The comment is gone even though it was never yours. The test passes when a non-author delete succeeds.' },

  /* ---------------- Files & Attachments ---------------- */
  { id: 'attachment-idor', feature: 'Files & Attachments', name: 'Attachment IDOR — Downloading Another Project\u2019s Files', owasp: 'A01 Broken Access Control', difficulty: 'Beginner', keys: ['attachment', 'file idor', 'download', 'file'],
    hints: ['Uploaded files are served from /files/<id> with sequential IDs.', 'The handler checks nothing about the file\u2019s project.', 'As victor, open /files/2 — the confidential budget file of private project 2 downloads.'],
    lesson: 'File downloads are object fetches like any other: the caller\u2019s right to the parent project must be checked before bytes are served.',
    impact: ' Budgets, contracts and designs attached to private projects leak to any authenticated user — the classic SaaS data breach pattern.',
    report: { title: 'Insecure Direct Object Reference on File Download (No Project Check)', severity: 'High', remediation: 'Authorise every file download against the file\u2019s project membership before serving content.' },
    guide: 'Step by step: 1) Log in as victor. 2) Open /files/2. 3) The confidential file from private project 2 is served to you. The test passes when a non-member receives the file.' },
  { id: 'upload-html', feature: 'Files & Attachments', name: 'Unrestricted File Upload — HTML Served as Web Content', owasp: 'A03 Injection', difficulty: 'Intermediate', keys: ['upload', 'html', 'file upload', 'unrestricted'],
    hints: ['The upload form accepts any filename and content — no type validation.', 'Try uploading a file whose name ends in .html with markup inside.', 'Upload evil.html to a project, then open /files/<its id> — it is served back as text/html from the app\u2019s own origin.'],
    lesson: 'Uploads must be validated by content, stored safely, and served with a neutral Content-Type / Content-Disposition. An .html upload served inline is stored XSS by another name.',
    impact: 'Attackers host phishing pages and scripts on the client\u2019s own trusted domain, defeating user suspicion and some security tooling.',
    report: { title: 'Unrestricted File Upload Allows Hosting HTML/JS Content', severity: 'High', remediation: 'Allowlist file types, verify content, store outside web root, serve with Content-Disposition: attachment.' },
    guide: 'Step by step: 1) Log in as a project member. 2) Upload a file named evil.html containing <h1>phish</h1> via the project files form. 3) Open the new /files/<id> URL — it renders as an HTML page from the app origin. The test passes when the HTML file is stored and served.' },
  { id: 'path-traversal', feature: 'Files & Attachments', name: 'Path Traversal in File Download', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['traversal', 'path', 'download', '../', 'lfi'],
    hints: ['The /download?path= endpoint reads files from the attachments folder.', 'It joins your path onto the folder without cleaning it.', 'Request /download?path=../server.js — the application\u2019s own source code comes back.'],
    lesson: 'User-controlled paths must be canonicalised and confined to an allowlisted base directory. "../" is the oldest trick in the book because it keeps working.',
    impact: 'Source code, configuration and any file the server can read are exposed — the standard first step from bug to full compromise.',
    report: { title: 'Directory Traversal in Download Endpoint Exposes Server Files', severity: 'High', remediation: 'Resolve the requested path and require it to stay inside the attachment directory; reject ".." sequences.' },
    guide: 'Step by step: 1) Log in. 2) Open /download?path=../server.js. 3) The server returns its own source code — you escaped the attachments folder. The test passes when a file outside that folder is served.' },

  /* ---------------- Team & Roles ---------------- */
  { id: 'role-escalation', feature: 'Team & Roles', name: 'Self-Promotion — Viewer Promotes Themselves to Project Owner', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['role escalation', 'promote', 'owner', 'member role'],
    hints: ['Member roles are changed by posting to /projects/<id>/members/role.', 'The endpoint never checks YOUR role before honouring the change.', 'As victor (viewer), POST your own userId with role=owner for project 1 — you now own it.'],
    lesson: 'Role-management endpoints are the crown jewels of a collaboration tool: they demand the strictest server-side checks.',
    impact: 'A read-only guest seizes ownership of the project — locks out the real owner, reads everything, invites anyone.',
    report: { title: 'Project Role Changes Lack Authorisation (Privilege Escalation to Owner)', severity: 'Critical', remediation: 'Only project owners may change roles; verify the caller\u2019s role server-side on the members endpoints.' },
    guide: 'Step by step: 1) Log in as victor (viewer on project 1). 2) POST /projects/1/members/role with userId=5 and role=owner. 3) Your role in project 1 becomes owner. The test passes when an unprivileged caller\u2019s role change lands.' },
  { id: 'kick-owner', feature: 'Team & Roles', name: 'Plain Member Can Remove the Project Owner', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['remove', 'kick', 'owner removal', 'member remove'],
    hints: ['Removing a member posts to /projects/<id>/members/remove.', 'There is no check on who is being removed — or who is asking.', 'As sara (plain member of project 1), remove userId 2 — the project\u2019s owner is ejected from their own project.'],
    lesson: 'Destructive membership actions need role hierarchy rules: nobody below owner should be able to remove an owner.',
    impact: 'A disgruntled member ejects the project owner, causing lockout and chaos — a denial-of-service against the client\u2019s own team.',
    report: { title: 'Member Removal Endpoint Allows Ejecting the Project Owner', severity: 'High', remediation: 'Enforce role hierarchy on member removal (only owners remove members; owners cannot be removed by non-owners).' },
    guide: 'Step by step: 1) Log in as sara (member of project 1). 2) POST /projects/1/members/remove with userId=2. 3) Tanvir, the project owner, is removed from his own project. The test passes when the removal succeeds.' },

  /* ---------------- Admin Panel ---------------- */
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'Admin Actions via GET — One-Click User Deletion (CSRF)', owasp: 'A01 Broken Access Control', difficulty: 'Advanced', keys: ['admin csrf', 'delete user', 'get request', 'one click'],
    hints: ['In the admin panel, deleting a user is a plain link: /admin/users/<id>/delete.', 'State changes over GET, with no token, are CSRF by design — an <img> tag on any page is enough.', 'As admin, simply visit that URL (imagine it embedded in a page the admin browses) — the user is deleted. No confirmation, no token.'],
    lesson: 'State changes must never ride on GET, and admin actions need CSRF tokens plus re-confirmation for destructive operations.',
    impact: 'An attacker page auto-visited by an admin deletes users at scale — a one-image-tag attack on the client\u2019s whole platform.',
    report: { title: 'State-Changing Admin Actions over GET without CSRF Protection', severity: 'High', remediation: 'Use POST with verified anti-CSRF tokens for all admin mutations; require confirmation for destructive actions.' },
    guide: 'Step by step: 1) Log in as the platform admin. 2) Visit /admin/users/6/delete directly in the browser (as an attacker\u2019s <img src> would). 3) The user is deleted instantly — no token, no POST, no confirmation. The test passes when the GET deletion succeeds.' },

  /* ---------------- Platform & API ---------------- */
  { id: 'api-user-dump', feature: 'Platform & API', name: 'Unauthenticated API Dumps All Users incl. Passwords', owasp: 'A01 Broken Access Control', difficulty: 'Beginner', keys: ['api', 'users', 'dump', 'exposure', 'passwords'],
    hints: ['The platform exposes a small JSON API under /api/.', 'One endpoint returns the user directory — check what it returns without any login at all.', 'curl /api/users in a private window (no cookies): every user, email and PLAINTEXT password comes back.'],
    lesson: 'APIs deserve the same authentication as the UI — and must never serialize secrets like passwords. Field-level allowlists prevent over-exposure.',
    impact: 'The entire user base — names, emails and reusable plaintext passwords — is public to the internet. Credential stuffing against every other service follows.',
    report: { title: 'Unauthenticated API Endpoint Exposes All Users and Plaintext Passwords', severity: 'Critical', remediation: 'Require authentication on all API endpoints; serialize allowlisted fields only; hash passwords with bcrypt/argon2.' },
    guide: 'Step by step: 1) Open a private window or use curl with no cookies. 2) GET /api/users. 3) A JSON dump of every user — including plaintext passwords — returns with no authentication. The test passes on that fetch.' },
];

/* a second scatter of key fragments lives far below, near the admin routes */
const _fragB = ['Wk45WQ==', 'LU84Rw=='];

const XSS_RE = /<\s*script|on\w+\s*=|<\s*svg|<\s*iframe|<\s*img[^>]*onerror|javascript\s*:/i;
const INJ_RE = /'\s*or\s*'?\d+'?\s*=\s*'?\d+|'\s*or\s*'[^']*'\s*=\s*'[^']*'|'\s*--|'\s*or\s+1\s*=\s*1|\bunion\b[\s\S]*\bselect\b/i;

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function userById(id) { return users.find(u => u.id === Number(id)); }
function userByEmail(email) { return users.find(u => u.email === String(email || '').toLowerCase()); }
function projectById(id) { return projects.find(p => p.id === Number(id)); }
function memberRole(project, uid) { return project ? project.members[uid] : undefined; }
function isMember(project, uid) { return !!(project && project.members[uid]); }

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
  return { sid: null, data: { uid: null, enumHit: false, enumMiss: false }, cookies: c };
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

/* ----------------------------- layout ----------------------------- */
function layout(req, title, body, opts) {
  opts = opts || {};
  const s = progressSummary();
  const sess = getSession(req);
  const me = sess.data.uid ? userById(sess.data.uid) : null;
  const bar = `<div class="pbar"><img src="/logo.png" alt="HexaCyberLab"><span class="plab">LAB ${LAB_NUMBER} — ${LAB_NAME}</span><span class="pstat">${s.done}/${s.total} tests · ${s.pct}%</span><span class="pmeter"><span style="width:${s.pct}%"></span></span></div>`;
  const nav = me
    ? `<nav><a href="/projects">Projects</a><a href="/search">Search</a><a href="/tests">🎯 Tests</a><a href="/profile">Profile</a>${sess.cookies.hx_role === 'admin' || me.role === 'admin' ? '<a href="/admin">Admin</a>' : ''}<span class="who">${esc(me.name)} (${esc(me.email)})</span><a href="/logout">Logout</a></nav>`
    : `<nav><a href="/login">Login</a><a href="/register">Register</a><a href="/tests">🎯 Tests</a></nav>`;
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
.done{color:#7ee2a0}.open{color:#f0c96a}
#chatbox{position:fixed;right:14px;bottom:14px;width:320px;background:#171724;border:1px solid #5b4bdb;border-radius:12px;overflow:hidden;z-index:50}
#chatbox header{background:#5b4bdb;color:#fff;padding:8px 12px;font-weight:700;cursor:pointer}
#chatlog{height:210px;overflow-y:auto;padding:10px;font-size:13px;display:none}
#chatlog div{margin:6px 0}#chatlog .me{text-align:right;color:#aef0c0}#chatlog .bot{color:#dcd6ff}
#chatform{display:none;border-top:1px solid #2c2c44}#chatform input{border:0;border-radius:0}
.hintbox{background:#10101c;border:1px dashed #3a3a55;border-radius:8px;padding:8px 12px;margin:6px 0;font-size:13px}
.cert{background:#fff;color:#111;border-radius:14px;padding:34px;text-align:center;max-width:640px;margin:24px auto}
.cert img{height:64px}
</style></head><body>
${opts.noBar ? '' : bar}${opts.noNav ? '' : nav}
<div class="wrap">${body}</div>
<div id="chatbox"><header onclick="var l=document.getElementById('chatlog'),f=document.getElementById('chatform');var open=l.style.display==='block';l.style.display=open?'none':'block';f.style.display=open?'none':'flex'">🤖 Lab Coach — ask me</header>
<div id="chatlog"><div class="bot">Hi! I am the HexaProject Lab Coach. Ask me what this lab contains, how a feature is tested (after you have tried it 3 times), or who built these labs.</div></div>
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

/* more key fragments, scattered mid-file */
const _cfragA = ['TC1YSA==', 'RS00MQ==', 'SjFNSA=='];
const _fragC = ['WkRUUA==', 'Mlk3Rg=='];
function entryKey() { return _asm(_fragA.concat(_fragB, _fragC)); }

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

/* ------------------------------ auth pages ------------------------------ */
function loginPage(req, err) {
  return layout(req, 'Login', `<h1>Sign in to HexaProject</h1>
  ${err ? '<div class="err">' + esc(err) + '</div>' : ''}
  <div class="card"><form method="POST" action="/login">
  <label>Email</label><input name="email" type="email" required>
  <label>Password</label><input name="password" type="password" required>
  <button style="width:100%">Sign in</button></form>
  <p><a href="/forgot">Forgot your password?</a> · <a href="/register">Create an account</a></p></div>`, {});
}
function registerPage(req, err) {
  return layout(req, 'Register', `<h1>Create your HexaProject account</h1>
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
  if (user.email === 'demo@hexaproject.local') pass('default-creds');
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
  const ptasks = tasks.filter(t => t.projectId === p.id);
  const pfiles = files.filter(f => f.projectId === p.id);
  const pms = milestones.filter(m => m.projectId === p.id);
  const memberRows = Object.keys(p.members).map(id => {
    const u = userById(id);
    if (!u) return '';
    /* NOTE: member names are rendered RAW here — that is the stored-xss-name sink. */
    return `<tr><td>${u.name}</td><td>${esc(u.email)}</td><td>${esc(p.members[id])}</td>
    <td><form method="POST" action="/projects/${p.id}/members/role" style="display:inline"><input type="hidden" name="userId" value="${u.id}">
    <select name="role" style="width:auto"><option>viewer</option><option>member</option><option>manager</option><option>owner</option></select><button class="btn2">Set role</button></form>
    <form method="POST" action="/projects/${p.id}/members/remove" style="display:inline"><input type="hidden" name="userId" value="${u.id}"><button class="btn2">Remove</button></form></td></tr>`;
  }).join('');
  const taskRows = ptasks.map(t => `<tr><td><a href="/tasks/${t.id}">${esc(t.title)}</a></td><td>${esc(t.status)}</td><td>${esc(t.priority)}</td><td>${esc((userById(t.assigneeId) || {}).email || '')}</td></tr>`).join('');
  const msRows = pms.map(m => `<tr><td>${esc(m.name)}</td><td>${esc(m.due)}</td><td><form method="POST" action="/milestones/${m.id}/update" style="display:inline"><input name="due" value="${esc(m.due)}" style="width:120px"><button class="btn2">Update due date</button></form></td></tr>`).join('');
  const fileRows = pfiles.map(f => `<tr><td><a href="/files/${f.id}">${esc(f.name)}</a></td><td>${esc((userById(f.uploaderId) || {}).email || '')}</td></tr>`).join('');
  return layout(req, p.name, `<h1>${esc(p.name)}</h1><p>${esc(p.desc)}</p>
  <div class="card"><h2>Project settings</h2><form method="POST" action="/projects/${p.id}/update"><label>Name</label><input name="name" value="${esc(p.name)}"><label>Description</label><input name="desc" value="${esc(p.desc)}"><button>Save settings</button></form>
  <form method="POST" action="/projects/${p.id}/delete" onsubmit="return confirm('Delete this project?')"><button class="btn2">Delete project</button></form></div>
  <div class="card"><h2>Team</h2><table><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr>${memberRows}</table>
  <form method="POST" action="/projects/${p.id}/members/add"><label>Add member by email</label><input name="email" placeholder="teammate@example.com"><button>Add as member</button></form></div>
  <div class="card"><h2>Milestones</h2><table><tr><th>Milestone</th><th>Due</th><th></th></tr>${msRows || '<tr><td colspan="3">None</td></tr>'}</table></div>
  <div class="card"><h2>Tasks</h2><table><tr><th>Task</th><th>Status</th><th>Priority</th><th>Assignee</th></tr>${taskRows || '<tr><td colspan="4">No tasks</td></tr>'}</table>
  <form method="POST" action="/projects/${p.id}/tasks"><label>New task title</label><input name="title" required><button>Add task</button></form></div>
  <div class="card"><h2>Files</h2><table><tr><th>File</th><th>Uploaded by</th></tr>${fileRows || '<tr><td colspan="2">No files</td></tr>'}</table>
  <form method="POST" action="/projects/${p.id}/files"><label>File name</label><input name="name" placeholder="notes.txt" required><label>Content</label><textarea name="content" rows="3"></textarea><button>Upload file</button></form></div>`, {});
}

/* ------------------------------ search ------------------------------ */
function searchPage(req, q) {
  const needle = String(q || '').toLowerCase();
  let disclosure = false;
  const sess = getSession(req);
  const me = sess.data.uid ? userById(sess.data.uid) : null;
  const pres = projects.filter(p => !needle || p.name.toLowerCase().includes(needle) || p.desc.toLowerCase().includes(needle));
  const tres = tasks.filter(t => !needle || t.title.toLowerCase().includes(needle));
  /* VULN(search-disclosure): results are NOT scoped by membership. */
  if (me && needle) {
    if (pres.some(p => !isMember(p, me.id)) || tres.some(t => { const p = projectById(t.projectId); return p && !isMember(p, me.id); })) disclosure = true;
  }
  if (disclosure) pass('search-disclosure');
  if (q && XSS_RE.test(String(q))) pass('search-xss'); /* VULN: query reflected raw below */
  const items = pres.map(p => `<li>📁 <a href="/projects/${p.id}">${esc(p.name)}</a> — ${esc(p.desc)}</li>`).join('')
    + tres.map(t => `<li>✅ <a href="/tasks/${t.id}">${esc(t.title)}</a> (project ${t.projectId})</li>`).join('');
  /* NOTE: the query is reflected RAW in the heading — that is the search-xss sink. */
  return layout(req, 'Search', `<h1>Search</h1>
  <div class="card"><form method="GET" action="/search"><input name="q" value="${esc(q || '')}" placeholder="Search projects and tasks"><button>Search</button></form></div>
  ${q !== undefined ? `<div class="card"><h2>Results for: ${String(q || '')}</h2><ul>${items || '<li>No results.</li>'}</ul></div>` : ''}`, {});
}

/* ------------------------------ tasks & comments ------------------------------ */
function taskPage(req, t) {
  const p = projectById(t.projectId);
  const tc = comments.filter(c => c.taskId === t.id);
  /* NOTE: comment bodies and author names render RAW — stored-xss sinks. */
  const cRows = tc.map(c => {
    const a = userById(c.authorId);
    return `<div class="card"><b>${a ? a.name : 'unknown'}</b><p>${c.body}</p>
    <form method="POST" action="/comments/${c.id}/delete"><button class="btn2">Delete comment</button></form></div>`;
  }).join('');
  const memberOpts = p ? Object.keys(p.members).map(id => { const u = userById(id); return u ? `<option value="${u.id}" ${t.assigneeId === u.id ? 'selected' : ''}>${esc(u.email)}</option>` : ''; }).join('') : '';
  return layout(req, t.title, `<h1>${esc(t.title)}</h1>
  <p>Project: <a href="/projects/${t.projectId}">${esc(p ? p.name : '?')}</a> · Status: ${esc(t.status)} · Priority: ${esc(t.priority)}</p>
  <p>${esc(t.desc)}</p>
  <div class="card"><h2>Update task</h2><form method="POST" action="/tasks/${t.id}/update">
  <label>Title</label><input name="title" value="${esc(t.title)}">
  <label>Status</label><select name="status"><option ${t.status === 'todo' ? 'selected' : ''}>todo</option><option ${t.status === 'doing' ? 'selected' : ''}>doing</option><option ${t.status === 'done' ? 'selected' : ''}>done</option></select>
  <label>Assignee</label><select name="assigneeId">${memberOpts}</select>
  <button>Save task</button></form></div>
  <h2>Comments</h2>${cRows || '<p>No comments yet.</p>'}
  <div class="card"><form method="POST" action="/tasks/${t.id}/comments"><label>Add a comment</label><textarea name="body" rows="3" required></textarea><button>Post comment</button></form></div>`, {});
}

/* ------------------------------ admin ------------------------------ */
const _cfragB = ['LU45OQ==', 'TzZaMw==', 'RFUyRA=='];
function completionKey() { return _asm(_cfragA.concat(_cfragB)); }
function adminGate(req) {
  const sess = getSession(req);
  return sess.cookies.hx_role === 'admin'; /* VULN: the gate trusts the client cookie */
}
function adminPage(req) {
  const uRows = users.map(u => `<tr><td>${u.name}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td><a href="/admin/users/${u.id}/delete">Delete</a></td></tr>`).join('');
  const pRows = projects.map(p => `<tr><td>${esc(p.name)}</td><td>${esc((userById(p.ownerId) || {}).email || '')}</td><td>${Object.keys(p.members).length}</td></tr>`).join('');
  return layout(req, 'Admin', `<h1>Platform admin</h1>
  <div class="card"><h2>All users</h2><table><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr>${uRows}</table>
  <p style="color:#9a9ab0;font-size:13px">Deleting a user is a plain GET link — no token, no confirmation.</p></div>
  <div class="card"><h2>All projects</h2><table><tr><th>Project</th><th>Owner</th><th>Members</th></tr>${pRows}</table></div>`, {});
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
    if (!feature) return 'Tell me which feature you are working on (for example "Tasks & Milestones") and I will check whether you have unlocked my step-by-step help for it.';
    if (!test) test = TESTS.find(t => t.feature === feature && !progress.tests[t.id]) || TESTS.find(t => t.feature === feature);
    const tries = progress.attempts[feature] || 0;
    if (progress.tests[test.id]) return '"' + test.name + '" is already complete ✓. Here is how it was done: ' + test.guide;
    if (tries >= 3) return 'Here is the step-by-step for "' + test.name + '": ' + test.guide;
    return 'That feature is locked for help. First try the ' + feature + ' tests yourself at least 3 times — I can see you have tried ' + tries + ' time(s) so far. After 3 real tries, ask me again and I will guide you step by step.';
  }
  if (/^(hi|hello|hey|hello there)/.test(low) || low.length < 4) {
    const next = TESTS.find(t => !progress.tests[t.id]);
    return 'Hi! This is LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ', a project-management platform with ' + s.total + ' security tests across ' + FEATURES.length + ' features. You are at ' + s.pct + '%.' + (next ? ' A good next target: "' + next.name + '" (' + next.feature + ').' : '') + ' Ask me what a feature contains, or — after 3 tries on a feature — how to solve one of its tests.';
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
    let m;
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
      attempt('Projects');
      if (memberRole(p, me.id) !== 'owner') pass('project-tamper'); /* VULN: no owner check on writes */
      if (b.name) p.name = String(b.name);
      if (b.desc !== undefined) p.desc = String(b.desc);
      return redirect(res, '/projects/' + p.id);
    }
    if ((m = pathname.match(/^\/projects\/(\d+)\/delete$/)) && method === 'POST') {
      const p = projectById(m[1]);
      if (!p) return send(res, 404, 'not found');
      attempt('Projects');
      if (memberRole(p, me.id) !== 'owner') pass('project-tamper');
      projects.splice(projects.indexOf(p), 1);
      return redirect(res, '/projects');
    }
    if ((m = pathname.match(/^\/projects\/(\d+)\/tasks$/)) && method === 'POST') {
      const p = projectById(m[1]);
      if (!p) return send(res, 404, 'not found');
      const b = await parseBody(req);
      attempt('Tasks & Milestones');
      if (!isMember(p, me.id)) pass('task-create-nonmember'); /* VULN: create without membership */
      tasks.push({ id: ++taskSeq, projectId: p.id, milestoneId: null, title: String(b.title || 'Untitled task'), desc: '', assigneeId: me.id, status: 'todo', priority: 'medium' });
      return redirect(res, '/projects/' + p.id);
    }
    if ((m = pathname.match(/^\/projects\/(\d+)\/files$/)) && method === 'POST') {
      const p = projectById(m[1]);
      if (!p) return send(res, 404, 'not found');
      const b = await parseBody(req);
      attempt('Files & Attachments');
      const name = String(b.name || 'file.txt');
      files.push({ id: ++fileSeq, projectId: p.id, name, content: String(b.content || ''), uploaderId: me.id });
      if (/\.(html?|svg)$/i.test(name)) pass('upload-html'); /* VULN: any type accepted, served inline */
      return redirect(res, '/projects/' + p.id);
    }
    if ((m = pathname.match(/^\/projects\/(\d+)\/members\/add$/)) && method === 'POST') {
      const p = projectById(m[1]);
      if (!p) return send(res, 404, 'not found');
      const b = await parseBody(req);
      attempt('Team & Roles');
      const u = userByEmail(String(b.email || '').toLowerCase());
      if (u && !p.members[u.id]) p.members[u.id] = 'member';
      return redirect(res, '/projects/' + p.id);
    }
    if ((m = pathname.match(/^\/projects\/(\d+)\/members\/role$/)) && method === 'POST') {
      const p = projectById(m[1]);
      if (!p) return send(res, 404, 'not found');
      const b = await parseBody(req);
      attempt('Team & Roles');
      const target = Number(b.userId);
      const callerRole = memberRole(p, me.id);
      if (p.members[target] !== undefined && ['owner', 'manager', 'member', 'viewer'].includes(String(b.role))) {
        p.members[target] = String(b.role);
        if (target === p.ownerId && b.role === 'owner') { /* ownership label stays; role map is what gates */ }
        if (callerRole !== 'owner' && callerRole !== 'manager') pass('role-escalation'); /* VULN: anyone can set roles */
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
    if (pathname === '/search' && method === 'GET') {
      if (url.searchParams.has('q')) attempt('Search');
      return send(res, 200, searchPage(req, url.searchParams.has('q') ? url.searchParams.get('q') : undefined));
    }
    if ((m = pathname.match(/^\/tasks\/(\d+)$/)) && method === 'GET') {
      const t = tasks.find(x => x.id === Number(m[1]));
      if (!t) return send(res, 404, layout(req, 'Not found', '<h1>Task not found</h1>', {}));
      attempt('Tasks & Milestones');
      const p = projectById(t.projectId);
      if (!p || !isMember(p, me.id)) pass('task-idor'); /* VULN: parent project not checked */
      return send(res, 200, taskPage(req, t));
    }
    if ((m = pathname.match(/^\/tasks\/(\d+)\/update$/)) && method === 'POST') {
      const t = tasks.find(x => x.id === Number(m[1]));
      if (!t) return send(res, 404, 'not found');
      const b = await parseBody(req);
      attempt('Tasks & Milestones');
      const p = projectById(t.projectId);
      const role = p ? memberRole(p, me.id) : undefined;
      if (role === 'viewer' || !role) pass('viewer-task-edit'); /* VULN: read-only role can write */
      if (b.title) t.title = String(b.title);
      if (b.status) t.status = String(b.status);
      if (b.assigneeId) t.assigneeId = Number(b.assigneeId);
      return redirect(res, '/tasks/' + t.id);
    }
    if ((m = pathname.match(/^\/tasks\/(\d+)\/comments$/)) && method === 'POST') {
      const t = tasks.find(x => x.id === Number(m[1]));
      if (!t) return send(res, 404, 'not found');
      const b = await parseBody(req);
      attempt('Comments');
      const body = String(b.body || '');
      comments.push({ id: ++commentSeq, taskId: t.id, authorId: me.id, body });
      if (XSS_RE.test(body)) pass('comment-xss'); /* VULN: stored & rendered raw */
      return redirect(res, '/tasks/' + t.id);
    }
    if ((m = pathname.match(/^\/comments\/(\d+)\/delete$/)) && method === 'POST') {
      const c = comments.find(x => x.id === Number(m[1]));
      attempt('Comments');
      if (c) {
        if (c.authorId !== me.id) pass('comment-delete-idor'); /* VULN: no author check */
        comments.splice(comments.indexOf(c), 1);
        return redirect(res, '/tasks/' + c.taskId);
      }
      return redirect(res, '/projects');
    }
    if ((m = pathname.match(/^\/milestones\/(\d+)\/update$/)) && method === 'POST') {
      const ms = milestones.find(x => x.id === Number(m[1]));
      if (!ms) return send(res, 404, 'not found');
      const b = await parseBody(req);
      attempt('Tasks & Milestones');
      const p = projectById(ms.projectId);
      const role = p ? memberRole(p, me.id) : undefined;
      if (role !== 'owner' && role !== 'manager') pass('milestone-tamper'); /* VULN: plain members edit milestones */
      if (b.name) ms.name = String(b.name);
      if (b.due) ms.due = String(b.due);
      return redirect(res, '/projects/' + ms.projectId);
    }
    if ((m = pathname.match(/^\/files\/(\d+)$/)) && method === 'GET') {
      const f = files.find(x => x.id === Number(m[1]));
      if (!f) return send(res, 404, 'not found');
      attempt('Files & Attachments');
      const p = projectById(f.projectId);
      if (!p || !isMember(p, me.id)) pass('attachment-idor'); /* VULN: no project check on download */
      const ext = path.extname(f.name).toLowerCase();
      const types = { '.html': 'text/html', '.htm': 'text/html', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.md': 'text/plain' };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
      return res.end(f.content);
    }
    if (pathname === '/download' && method === 'GET') {
      attempt('Files & Attachments');
      const rel = url.searchParams.get('path') || '';
      const resolved = path.resolve(path.join(ATTACH_DIR, rel));
      if (!resolved.startsWith(path.resolve(ATTACH_DIR))) pass('path-traversal'); /* VULN: ../ escapes the folder */
      if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end(fs.readFileSync(resolved));
      }
      return send(res, 404, layout(req, 'Not found', '<h1>File not found</h1>', {}));
    }
    if (pathname === '/admin' && method === 'GET') {
      attempt('Admin Panel');
      if (!adminGate(req)) return send(res, 403, layout(req, 'Forbidden', '<h1>Admins only</h1><p>This area requires the platform admin role.</p>', {}));
      if (!me || me.role !== 'admin') pass('cookie-tamper'); /* gate passed on cookie, not on the real account */
      return send(res, 200, adminPage(req));
    }
    if ((m = pathname.match(/^\/admin\/users\/(\d+)\/delete$/)) && method === 'GET') {
      attempt('Admin Panel');
      if (!adminGate(req)) return send(res, 403, 'forbidden');
      if (!me || me.role !== 'admin') pass('cookie-tamper');
      const u = userById(m[1]);
      if (u && u.id !== me.id) { /* VULN(admin-csrf): destructive GET, no token/confirmation */
        users.splice(users.indexOf(u), 1);
        pass('admin-csrf');
      }
      return redirect(res, '/admin');
    }

    return send(res, 404, layout(req, 'Not found', '<h1>404 — page not found</h1>', {}));
  } catch (e) {
    try { send(res, 500, '<h1>Server error</h1><p>The lab stayed up — try again.</p>'); } catch (_) { /* ignore */ }
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('HexaProject (LAB ' + LAB_NUMBER + ') running at http://127.0.0.1:' + PORT + '  (LOCAL ONLY — deliberately vulnerable lab)');
  console.log('Test accounts: admin@hexaproject.local/Admin@123, pm@hexaproject.local/Manager@123, dev| sara | victor @hexaproject.local/User@123, demo@hexaproject.local/demo123');
});
