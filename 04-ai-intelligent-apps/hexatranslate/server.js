'use strict';
/*
 * HexaTranslate — LAB 38 of 110 (Category 4: AI & Intelligent Applications)
 * A deliberately vulnerable translation SaaS for hands-on security training.
 * LOCAL ONLY. Zero-dependency Node.js. Binds 127.0.0.1:3047.
 * Translations are simulated with deterministic in-app word mappings —
 * no real model calls, no external network access.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3047;
const HOST = '127.0.0.1';
const LAB_NUMBER = 38;
const LAB_NAME = 'HexaTranslate';

/* ---- runtime tuning constants (encoded fragments, assembled on demand) ---- */

const _CM_A = ['TC1YSA==', 'Vy05Mw=='];
function _asm(parts) {
  return parts.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}

/* ================= TESTS REGISTRY ================= */
const TESTS = [
  /* ---- Login & Authentication ---- */
  { id: 'sqli-login', feature: 'Login & Authentication', name: 'SQL Injection login bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The legacy sign-on builds its account lookup by gluing your email into the query text.', "Try an email that starts with a real account address followed by a single quote and a comment, e.g. admin@hexatranslate.local' -- .", "POST /login with email = admin@hexatranslate.local' -- and ANY password. The lookup matches the admin row and the password check is skipped."],
    lesson: 'String-built queries let attacker input change the meaning of the query itself — here it turns a login form into an admin session.',
    impact: 'On a real client site this is a full account takeover of the most privileged account, reached from the public login page in seconds.',
    report: { title: 'SQL Injection in authentication allows login bypass', severity: 'Critical', remediation: 'Use parameterised queries everywhere and never build SQL by concatenating user input.' } },
  { id: 'brute-force', feature: 'Login & Authentication', name: 'Brute force — no rate limit or lockout on login', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Count how many wrong passwords the login accepts for one account.', 'There is no CAPTCHA, delay or lockout — script 10+ failures in a row.', 'POST /login 10 times with a wrong password for marco@hexatranslate.local; the 10th failure is still processed normally.'],
    lesson: 'Without throttling, an attacker can try unlimited passwords against any account until one works.',
    impact: 'A client\'s customer accounts fall to password-spraying and credential-stuffing lists — one weak password is all it takes.',
    report: { title: 'Missing brute-force protection on login', severity: 'High', remediation: 'Add rate limiting, progressive delays and lockout/alerting after repeated failures per account and IP.' } },
  { id: 'user-enum', feature: 'Login & Authentication', name: 'User enumeration via login & password-reset responses', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the error text for an email that exists vs one that does not.', 'Try it on both /login and /forgot — the wording is not uniform.', 'POST /forgot or /login once with a real email (lena@hexatranslate.local) and once with a fake one (nobody@nowhere.test): one says "No account found", the other complains about the password or issues a reset.'],
    lesson: 'Different responses for "no such account" and "wrong password" hand attackers a free list of valid accounts to target.',
    impact: 'Attackers harvest your client\'s real customer emails, then aim phishing and credential stuffing exactly at them.',
    report: { title: 'Account enumeration through differing authentication responses', severity: 'Medium', remediation: 'Return one generic message ("invalid credentials" / "if the account exists…") for every failure case.' } },
  { id: 'default-creds', feature: 'Login & Authentication', name: 'Weak & default credentials on live accounts', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Seeded/demo accounts often keep the password they were created with.', 'Look at the test-account list in the README — two accounts still use embarrassingly common passwords.', "Log in as demo@demo.local / password, or tara@hexatranslate.local / LetMeIn123 — both are accepted."],
    lesson: 'Default and dictionary passwords survive into production more often than any exotic bug — and they are the first thing an attacker tries.',
    impact: 'Anyone on the internet can walk into a real customer\'s account with a password from a public top-10 list.',
    report: { title: 'Accounts with default / weak passwords', severity: 'High', remediation: 'Force password changes for seeded accounts, block known-breached passwords and enforce a real password policy.' } },
  { id: 'reset-token', feature: 'Login & Authentication', name: 'Predictable password-reset token', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    hints: ['Ask for a password reset and study the token format in the response.', 'The token looks like rst-<something small and guessable>.', 'POST /forgot for any account, read the token (rst-<user id>), then POST /reset with token rst-4 to take over a DIFFERENT account\'s password.'],
    lesson: 'A reset token must be unguessable — if it is derived from a public value like the user id, the reset flow becomes an account-takeover flow.',
    impact: 'An attacker resets the password of any customer — including admins — without ever seeing an email.',
    report: { title: 'Predictable password reset tokens allow account takeover', severity: 'Critical', remediation: 'Generate reset tokens from a CSPRNG (≥128 bits), store them hashed, single-use, with a short expiry.' } },

  /* ---- Account & Profile ---- */
  { id: 'weak-password', feature: 'Account & Profile', name: 'Weak password policy at registration', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a new account and see how short a password you can get away with.', 'One character is enough.', 'POST /register with password = "a" — the account is created and you are logged in.'],
    lesson: 'If the server accepts any password, users will pick terrible ones — policy must be enforced server-side.',
    impact: 'Your client\'s users end up with one-character passwords that fall to the first automated guess.',
    report: { title: 'No minimum password strength enforced at registration', severity: 'Medium', remediation: 'Enforce a minimum length (≥10) and breached-password screening on the server.' } },
  { id: 'mass-assignment', feature: 'Account & Profile', name: 'Mass assignment at registration (plan / credits / role)', owasp: 'A08:2021 Software & Data Integrity Failures', difficulty: 'Intermediate',
    hints: ['The register handler binds the whole submitted object onto the new user record.', 'Add fields the form never shows: plan, credits, role.', 'POST /register with extra fields plan=Enterprise&credits=99999 (or role=admin) — your profile shows them applied.'],
    lesson: 'Binding request data straight onto a model lets attackers set fields the UI never offered — pricing tiers, balances, even roles.',
    impact: 'Attackers give themselves the paid Enterprise plan and a huge credit balance for free — direct revenue loss for the client.',
    report: { title: 'Mass assignment allows privilege and billing manipulation', severity: 'High', remediation: 'Whitelist assignable fields explicitly on every endpoint; never bind raw request bodies to models.' } },
  { id: 'stored-xss-profile', feature: 'Account & Profile', name: 'Stored XSS in profile display name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is rendered back on your profile page.', 'Check whether HTML in the name is escaped or served raw.', 'Register or update your profile with name = <script>alert(1)</script> (or an <img onerror> payload), then open /profile.'],
    lesson: 'Any user-controlled string rendered without output encoding becomes stored XSS that fires for everyone who views it.',
    impact: 'An attacker plants script on your client\'s site that runs in other customers\' browsers — session theft, defacement, phishing overlays.',
    report: { title: 'Stored cross-site scripting via profile display name', severity: 'High', remediation: 'Contextually encode all user output and add a Content-Security-Policy header.' } },
  { id: 'profile-csrf', feature: 'Account & Profile', name: 'CSRF on profile update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The profile form carries a hidden marker field; the handler trusts requests that lack it just the same.', 'A state-changing POST with no marker and no token is accepted.', 'While logged in, POST /profile from a raw HTTP client (no hx_token field) with a new name — the change is applied.'],
    lesson: 'State-changing endpoints without an anti-CSRF token can be triggered by any website the victim visits while logged in.',
    impact: 'A malicious page silently rewrites your client\'s customers\' profiles — names, details, even contact data — in one visit.',
    report: { title: 'Missing CSRF protection on profile update', severity: 'Medium', remediation: 'Require a per-session anti-CSRF token on every state-changing form and verify Origin/Referer.' } },

  /* ---- Translation Projects ---- */
  { id: 'project-idor', feature: 'Translation Projects', name: 'Project IDOR — read another user\'s project', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Project pages take a numeric id. Ownership is never checked.', 'Open a project id that is not yours (seeded projects run 101–105, across several owners).', 'Log in as marco@hexatranslate.local and open /project?id=103 — Omar\'s project is served in full.'],
    lesson: 'Checking that a user is logged in is not authorisation — every object access must verify the object belongs to them (or their role allows it).',
    impact: 'Competitors and strangers read your client\'s customers\' confidential documents queued for translation — contracts, legal texts, product plans.',
    report: { title: 'Insecure direct object reference on translation projects', severity: 'High', remediation: 'Enforce per-object ownership/role checks on every project read.' } },
  { id: 'export-idor', feature: 'Translation Projects', name: 'Export another user\'s project (data exfiltration)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The export endpoint shares the id parameter with the project page — and the same missing check.', 'A JSON download of someone else\'s project is one request away.', 'As any user, GET /project/export?id=103 — the full project record downloads as JSON.'],
    lesson: 'Export/download endpoints are the highest-value IDOR targets because they package the data for exfiltration.',
    impact: 'Bulk theft of your client\'s customers\' translation projects — a reportable data breach, not just a privacy bug.',
    report: { title: 'Project export endpoint lacks authorisation checks', severity: 'High', remediation: 'Apply the same ownership checks on export endpoints as on the UI, and log bulk exports.' } },
  { id: 'project-delete-idor', feature: 'Translation Projects', name: 'Delete another user\'s project by id', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Deletion is a plain POST with an id — whose id is never compared to the caller.', 'Create a throwaway project of your own first, note the id pattern, then aim at someone else\'s.', 'POST /project/delete with id=101 while logged in as a different user — Lena\'s project is gone.'],
    lesson: 'Destructive actions need the strictest authorisation checks; a missing check turns a read bug into data destruction.',
    impact: 'An attacker deletes your client\'s customers\' work — lost projects, broken deadlines, support chaos.',
    report: { title: 'Missing authorisation on project deletion', severity: 'High', remediation: 'Verify ownership (or an admin role) before any destructive operation, and soft-delete with audit logs.' } },

  /* ---- Translation Memory ---- */
  { id: 'tm-poisoning', feature: 'Translation Memory', name: 'Translation-memory poisoning leaks into other users\' output', owasp: 'A08:2021 Software & Data Integrity Failures', difficulty: 'Advanced',
    hints: ['The translation memory is shared by everyone, and the newest entry for a phrase wins.', 'Add a TM entry for a phrase somebody else will translate, with a target of your choosing.', 'As omar@outsider.test, POST /tm/add (en→fr) source "Your order has shipped" with a hostile target; then, as Lena, translate that exact phrase EN→FR — your text comes out in her result.'],
    lesson: 'Shared learned data is an attack surface: if anyone can write to it, everyone who reads it is downstream of the attacker.',
    impact: 'An attacker rewrites what your client\'s platform outputs to paying customers — wrong legal wording, insults, or phishing text at scale.',
    report: { title: 'Shared translation memory accepts unauthenticated-quality writes (poisoning)', severity: 'High', remediation: 'Scope TM writes per tenant, review shared entries, and version entries so poisoned rows can be rolled back.' } },
  { id: 'glossary-xss', feature: 'Translation Memory', name: 'Stored XSS through glossary term into translation output', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Glossary term targets are inserted into translation results verbatim.', 'Put markup in a term target, then translate a sentence containing the term\'s source word.', 'Add a term source "checkout" with target <img src=x onerror=alert(1)> to one of your glossaries, then translate "checkout" using that glossary — the payload is served raw in the result.'],
    lesson: 'Data that is "just terminology" still becomes HTML somewhere — every rendering context needs encoding, especially data reused across features.',
    impact: 'Stored script executes for translators and reviewers inside your client\'s app — a wormable XSS across the whole team.',
    report: { title: 'Stored XSS via glossary term rendered in translation output', severity: 'High', remediation: 'Encode glossary terms on output everywhere they are rendered, including generated documents.' } },

  /* ---- Glossaries & Term Bases ---- */
  { id: 'glossary-idor', feature: 'Glossaries & Term Bases', name: 'Private glossary IDOR — read another user\'s term base', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Glossaries have a "private" flag. Check whether the server honours it.', 'Seeded glossaries: 201 is Lena\'s, 202 is Omar\'s private one.', 'Log in as marco@hexatranslate.local and open /glossary?id=202 — the private term base is served.'],
    lesson: 'A privacy toggle in the UI is meaningless if the endpoint ignores it.',
    impact: 'Trade-secret terminology — product names, pricing language, legal phrasing — leaks to any registered account.',
    report: { title: 'Private glossary readable by any authenticated user (IDOR)', severity: 'Medium', remediation: 'Check the glossary visibility and ownership on the server for every read.' } },
  { id: 'term-injection', feature: 'Glossaries & Term Bases', name: 'Add terms to another user\'s glossary', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Adding a term takes a glossaryId. Whose glossary it belongs to is never verified.', 'You can write into a term base you do not own.', 'POST /terms with glossaryId=201 (Lena\'s glossary) while logged in as someone else — your term appears in her glossary.'],
    lesson: 'Write endpoints need ownership checks just as much as reads — unauthorised writes are integrity attacks, not just access bugs.',
    impact: 'An attacker edits your client\'s official terminology so every future translation uses their wording — subtle, persistent sabotage.',
    report: { title: 'Missing authorisation allows writing to foreign glossaries', severity: 'Medium', remediation: 'Verify glossary ownership (or editor role) on every term write.' } },

  /* ---- Review Workflow ---- */
  { id: 'reviewer-bypass', feature: 'Review Workflow', name: 'Reviewer-role bypass — approve a review assigned to someone else', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['A pending review waits for its assigned reviewer (Rita). The approve endpoint never asks who you are.', 'Any logged-in account can press approve.', 'Log in as marco@hexatranslate.local and POST /review/approve with id=301 — the review is approved and the project flips to Approved, though the review belongs to Rita.'],
    lesson: 'Workflow roles only exist if the server enforces them at the action, not just by hiding buttons in the UI.',
    impact: 'Unreviewed translations get "approved" and shipped to your client\'s customers — quality and legal exposure with a fake audit trail.',
    report: { title: 'Review approval not restricted to the assigned reviewer', severity: 'High', remediation: 'Enforce reviewer assignment (or admin role) server-side on approve/reject actions and log the actor.' } },

  /* ---- Credits & Billing ---- */
  { id: 'credit-negative-topup', feature: 'Credits & Billing', name: 'Negative top-up accepted (no amount validation)', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['The top-up form takes an amount. Try values a sane billing system would reject.', 'Zero and negative amounts are applied to the balance as-is.', 'POST /credits/topup with amount=-500 — your credit balance drops by 500 (and a negative transfer can push it the other way).'],
    lesson: 'Money-moving inputs need positive-value validation and server-side limits; the HTML form\'s min attribute is not a control.',
    impact: 'Billing balances can be driven negative or manipulated at will — accounting chaos and free service for attackers.',
    report: { title: 'Credit top-up accepts negative amounts', severity: 'Medium', remediation: 'Validate amounts server-side (positive, within plan limits) and reject non-numeric input.' } },
  { id: 'credit-transfer-negative', feature: 'Credits & Billing', name: 'Negative credit transfer steals credits from the recipient', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['Transfers move credits between accounts based on one signed number.', 'What happens if the amount is negative? The direction reverses.', 'POST /credits/transfer to lena@hexatranslate.local with amount=-200 — 200 credits move FROM Lena TO you.'],
    lesson: 'Business-logic flaws hide in arithmetic: every signed value in a money flow must be range-checked, or the flow runs backwards.',
    impact: 'Attackers drain other customers\' paid credit balances into their own accounts — theft, executed with valid requests.',
    report: { title: 'Negative transfer amount reverses credit flow', severity: 'High', remediation: 'Reject non-positive transfer amounts and verify sender balance before applying.' } },

  /* ---- API & Platform ---- */
  { id: 'weak-api-token', feature: 'API & Platform', name: 'API token is just base64 of the account email', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    hints: ['The API docs proudly explain how tokens are "derived".', 'base64 is an encoding, not a secret — and emails are public.', 'Compute base64("lena@hexatranslate.local") and GET /api/projects?token=<that> — her identity is accepted and projects are returned.'],
    lesson: 'An API credential must be unguessable and revocable; deriving it from a public identifier gives every attacker a master key.',
    impact: 'Anyone who knows a customer\'s email address gets full API access to their translation projects — no password ever needed.',
    report: { title: 'Predictable API tokens derived from email addresses', severity: 'Critical', remediation: 'Issue random, high-entropy API keys, store them hashed, and support revocation and rotation.' } },
  { id: 'api-user-dump', feature: 'API & Platform', name: 'Unauthenticated /api/users dumps every account incl. passwords', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Some API routes forgot the login check entirely.', 'Try the users collection without any session at all.', 'GET /api/users with no cookies — the full user list, passwords included, comes back as JSON.'],
    lesson: 'Every route needs an explicit authentication decision; framework defaults will not save an endpoint nobody remembered to protect.',
    impact: 'Full credential dump of your client\'s customer base — instant account takeover everywhere those passwords are reused.',
    report: { title: 'Unauthenticated user-list endpoint exposes credentials', severity: 'Critical', remediation: 'Require authentication and role checks on all API routes; never serialise password fields.' } },
  { id: 'debug-exposure', feature: 'API & Platform', name: '/debug endpoint exposes configuration and secrets', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Developers leave diagnostic pages behind. This one answers without a login.', 'It prints environment details — including a signing secret.', 'GET /debug — configuration, version and the API_SIGNING_SECRET are all in the response.'],
    lesson: 'Debug and diagnostics endpoints are production attack surface; anything that prints secrets must never ship.',
    impact: 'Leaked signing secrets let attackers forge trusted requests against your client\'s platform.',
    report: { title: 'Debug endpoint exposes secrets and configuration', severity: 'High', remediation: 'Remove debug endpoints from production, or gate them behind admin auth and IP allowlists.' } },
  { id: 'missing-headers', feature: 'API & Platform', name: 'Missing HTTP security headers', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Inspect any API response and look for the usual hardening headers.', 'There is no Content-Security-Policy, no X-Frame-Options, no HSTS — nothing.', 'GET /api/ping and check the response headers: the security header set is empty, and the check registers.'],
    lesson: 'Security headers are cheap defence-in-depth: without them, clickjacking and script-injection impact grow immediately.',
    impact: 'Your client\'s app can be framed for clickjacking and lacks the browser-side safety net modern users expect.',
    report: { title: 'Missing HTTP security headers', severity: 'Low', remediation: 'Add CSP, X-Frame-Options/frame-ancestors, X-Content-Type-Options, Referrer-Policy and HSTS at the server.' } },

  /* ---- Admin Panel ---- */
  { id: 'cookie-role-tamper', feature: 'Admin Panel', name: 'Role cookie tampering opens the admin panel', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Your role travels in a cookie the server trusts blindly.', 'The cookie is called hx_role and it is fully client-controlled.', 'Log in as any normal user, set cookie hx_role=admin, then open /admin — the panel, passwords and all, is served.'],
    lesson: 'Authorisation data must live server-side (in the session), never in values the client can edit.',
    impact: 'Every registered user becomes an admin — full control of your client\'s platform, users and data.',
    report: { title: 'Client-controlled role cookie enables privilege escalation', severity: 'Critical', remediation: 'Store roles in the server-side session only; ignore client-supplied role claims.' } },
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'CSRF on admin user deletion', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Deleting a user is a plain POST with no anti-CSRF token.', 'An admin\'s browser can be made to send it from any website.', 'As an admin (or via the tampered role), POST /admin/delete-user with id of a throwaway user and no token — the account is deleted.'],
    lesson: 'The more powerful the action, the more damage a CSRF hole does — destructive admin actions need tokens and re-confirmation.',
    impact: 'One malicious page view by an admin deletes customer accounts on your client\'s platform.',
    report: { title: 'Missing CSRF protection on administrative user deletion', severity: 'High', remediation: 'Add anti-CSRF tokens to all admin actions and require confirmation for destructive operations.' } },
];

/* ================= PROGRESS ENGINE ================= */
const PROGRESS_FILE = path.join(__dirname, 'progress.json');
function defaultProgress() {
  return { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
}
let progress = (() => {
  try { return Object.assign(defaultProgress(), JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'))); }
  catch (e) { return defaultProgress(); }
})();
function saveProgress() { try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2)); } catch (e) {} }
function doneCount() { return TESTS.filter(t => progress.tests[t.id]).length; }
function isComplete() { return doneCount() === TESTS.length; }
function pass(id) {
  if (!TESTS.some(t => t.id === id)) return;
  if (!progress.tests[id]) {
    progress.tests[id] = true;
    if (isComplete()) { progress.completedAt = new Date().toISOString(); progress.keyRevealed = true; }
    saveProgress();
  }
}
function attempt(feature) { progress.attempts[feature] = (progress.attempts[feature] || 0) + 1; saveProgress(); }
function featureStats() {
  const out = {};
  for (const t of TESTS) {
    out[t.feature] = out[t.feature] || { total: 0, done: 0, attempts: progress.attempts[t.feature] || 0 };
    out[t.feature].total++;
    if (progress.tests[t.id]) out[t.feature].done++;
  }
  for (const f of Object.keys(out)) out[f].attempts = progress.attempts[f] || 0;
  return out;
}

/* ================= APPLICATION DATA (seeded, in-memory) ================= */
let users = [
  { id: 1, name: 'Ada Admin',      email: 'admin@hexatranslate.local', pass: 'admin123',   role: 'admin',    plan: 'Team',       credits: 9999 },
  { id: 2, name: 'Lena Lead',      email: 'lena@hexatranslate.local',  pass: 'lena2024',   role: 'lead',     plan: 'Team',       credits: 2500 },
  { id: 3, name: 'Marco Member',   email: 'marco@hexatranslate.local', pass: 'marco2024',  role: 'member',   plan: 'Team',       credits: 1500 },
  { id: 4, name: 'Rita Reviewer',  email: 'rita@hexatranslate.local',  pass: 'review2024', role: 'reviewer', plan: 'Team',       credits: 1200 },
  { id: 5, name: 'Viktor Viewer',  email: 'viktor@hexatranslate.local',pass: 'viewer2024', role: 'viewer',   plan: 'Free',       credits: 100 },
  { id: 6, name: 'Tara Translator',email: 'tara@hexatranslate.local',  pass: 'LetMeIn123', role: 'member',   plan: 'Pro',        credits: 1800 },
  { id: 7, name: 'Omar Outsider',  email: 'omar@outsider.test',        pass: 'omar2024',   role: 'member',   plan: 'Pro',        credits: 900 },
  { id: 8, name: 'Demo Dana',      email: 'demo@demo.local',           pass: 'password',   role: 'member',   plan: 'Demo',       credits: 50 },
];
let nextUserId = 9;
const resetTokens = {};   // token -> userId
const loginFails = {};     // email -> consecutive failure count
const enumSeen = { exists: false, missing: false };

let projects = [
  { id: 101, ownerId: 2, name: 'Product Launch EN→DE',  src: 'en', tgt: 'de', status: 'Draft',     budget: 500 },
  { id: 102, ownerId: 3, name: 'Legal Contract EN→FR',  src: 'en', tgt: 'fr', status: 'In Review', budget: 1200 },
  { id: 103, ownerId: 7, name: 'Omar Marketing EN→ES',  src: 'en', tgt: 'es', status: 'Draft',     budget: 300 },
  { id: 104, ownerId: 2, name: 'Support FAQ EN→IT',     src: 'en', tgt: 'it', status: 'Approved',  budget: 800 },
  { id: 105, ownerId: 4, name: 'Rita Style Guide EN→PT',src: 'en', tgt: 'pt', status: 'Draft',     budget: 450 },
];
let nextProjectId = 106;

let tmEntries = [
  { id: 1, src: 'en', tgt: 'de', source: 'Welcome to our store',   target: 'Willkommen in unserem Shop',        authorId: 2, added: false },
  { id: 2, src: 'en', tgt: 'fr', source: 'Your order has shipped', target: 'Votre commande a été expédiée',     authorId: 3, added: false },
  { id: 3, src: 'en', tgt: 'es', source: 'Thank you',              target: 'Gracias',                           authorId: 2, added: false },
];
let nextTmId = 4;

let glossaries = [
  { id: 201, ownerId: 2, name: 'Brand Terms EN-DE',    src: 'en', tgt: 'de', isPublic: false },
  { id: 202, ownerId: 7, name: 'Omar Private Glossary',src: 'en', tgt: 'es', isPublic: false },
];
let nextGlossaryId = 203;
let terms = [
  { id: 1, glossaryId: 201, source: 'checkout',  target: 'Kasse' },
  { id: 2, glossaryId: 201, source: 'dashboard', target: 'Armaturenbrett' },
];
let nextTermId = 3;

let reviews = [
  { id: 301, projectId: 102, reviewerId: 4, status: 'Pending', comment: 'Legal contract translation awaiting reviewer sign-off.' },
];
let nextReviewId = 302;
const uploads = {}; // filename -> { ownerId, content, type }

/* ---- more encoded fragments (assembled on demand) ---- */

const _CM_B = ['V1MwTQ=='];
const ENTRY_KEY_SHA256 = 'af92c2447ff6127fdfa15dc4c6842e802b5860e576e29be1a57d2ed46117377a';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */
function completionKey() { return _asm(_CM_A.concat(_CM_B, _CM_C)); }

/* ================= TRANSLATION ENGINE (simulated, deterministic) ================= */
const WORDS = {
  de: { welcome: 'Willkommen', hello: 'Hallo', thank: 'Danke', you: 'du', your: 'deine', order: 'Bestellung', has: 'wurde', shipped: 'versandt', store: 'Shop', checkout: 'Kasse', dashboard: 'Armaturenbrett', password: 'Passwort', account: 'Konto' },
  fr: { welcome: 'Bienvenue', hello: 'Bonjour', thank: 'Merci', you: 'vous', your: 'votre', order: 'commande', has: 'a été', shipped: 'expédiée', store: 'magasin', checkout: 'paiement', dashboard: 'tableau de bord', password: 'mot de passe', account: 'compte' },
  es: { welcome: 'Bienvenido', hello: 'Hola', thank: 'Gracias', you: 'usted', your: 'su', order: 'pedido', has: 'ha sido', shipped: 'enviado', store: 'tienda', checkout: 'pago', dashboard: 'panel', password: 'contraseña', account: 'cuenta' },
};
function capLike(orig, repl) { return orig && orig[0] === orig[0].toUpperCase() ? repl[0].toUpperCase() + repl.slice(1) : repl; }
function translateText(text, src, tgt, glossaryId) {
  // 1) Translation memory — the NEWEST matching entry wins (entries are appended).
  let tmHit = null;
  for (const e of tmEntries) if (e.src === src && e.tgt === tgt && e.source.toLowerCase() === text.toLowerCase()) tmHit = e;
  if (tmHit) return { output: tmHit.target, tmHit };
  // 2) Word-by-word dictionary, with glossary terms overriding single words.
  const glossaryTerms = glossaryId ? terms.filter(t => t.glossaryId === Number(glossaryId)) : [];
  const dict = WORDS[tgt] || {};
  const out = text.split(/(\s+)/).map(tok => {
    if (/^\s+$/.test(tok) || !tok) return tok;
    const key = tok.toLowerCase().replace(/[^a-zà-ÿ]/gi, '');
    const g = glossaryTerms.find(t => t.source.toLowerCase() === key);
    if (g) return g.target;
    if (dict[key]) return capLike(tok, dict[key]);
    return tok;
  }).join('');
  return { output: out, tmHit: null };
}

/* ================= HTTP HELPERS ================= */
const XSS_RE = /<script|onerror\s*=|onload\s*=|<svg|<img[^>]*onerror|<iframe/i;
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) { const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); }
  return out;
}
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 2 * 1024 * 1024) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) { try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); } }
      else {
        const out = {};
        for (const pair of data.split('&')) {
          if (!pair) continue;
          const i = pair.indexOf('=');
          const k = i >= 0 ? pair.slice(0, i) : pair, v = i >= 0 ? pair.slice(i + 1) : '';
          out[decodeURIComponent(k.replace(/\+/g, ' '))] = decodeURIComponent(v.replace(/\+/g, ' '));
        }
        resolve(out);
      }
    });
    req.on('error', () => resolve({}));
  });
}
const sessions = {}; // sid -> userId
function currentUser(req) {
  const c = parseCookies(req);
  const uid = c.sid ? sessions[c.sid] : null;
  const user = uid ? users.find(u => u.id === uid) : null;
  if (!user) return { user: null, role: null };
  return { user, role: c.hx_role || user.role }; // role cookie is trusted blindly (intended flaw)
}
function startSession(res, user) {
  const sid = crypto.randomBytes(12).toString('hex');
  sessions[sid] = user.id;
  res.setHeader('Set-Cookie', [`sid=${sid}; Path=/; HttpOnly`, `hx_role=${user.role}; Path=/`]);
  return sid;
}
function sendHtml(res, code, html) { res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); }
function sendJson(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj, null, 2)); }
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }

/* ================= UI ================= */
function chatWidget() {
  return `<div id="hxchat" style="position:fixed;right:16px;bottom:16px;width:320px;max-width:92vw;background:#111827;color:#e5e7eb;border:1px solid #374151;border-radius:12px;font-family:system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.4);z-index:50">
  <div style="padding:10px 12px;border-bottom:1px solid #374151;font-weight:700">💬 Lab Coach — HexaTranslate</div>
  <div id="hxlog" style="height:190px;overflow:auto;padding:10px 12px;font-size:13px;line-height:1.45"></div>
  <div style="display:flex;gap:6px;padding:10px 12px;border-top:1px solid #374151">
    <input id="hxin" type="text" placeholder="Ask about features, counts, how-to…" style="flex:1;background:#1f2937;color:#e5e7eb;border:1px solid #374151;border-radius:8px;padding:7px 9px;font-size:13px">
    <button onclick="hxSend()" style="background:#2563eb;color:#fff;border:0;border-radius:8px;padding:7px 12px;cursor:pointer">Send</button>
  </div>
</div>
<script>
async function hxSend(){var i=document.getElementById('hxin');var log=document.getElementById('hxlog');var m=i.value.trim();if(!m)return;i.value='';log.innerHTML+='<div><b>You:</b> '+m.replace(/</g,'&lt;')+'</div>';try{var r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})});var j=await r.json();log.innerHTML+='<div style="margin:6px 0"><b>Coach:</b> '+String(j.reply).replace(/</g,'&lt;').replace(/\\n/g,'<br>')+'</div>';}catch(e){log.innerHTML+='<div><b>Coach:</b> (connection issue — is the lab running?)</div>';}log.scrollTop=log.scrollHeight;}
document.getElementById('hxin').addEventListener('keydown',function(e){if(e.key==='Enter')hxSend();});
</script>`;
}
function pageShell(title, user, body) {
  const stats = featureStats();
  const done = doneCount(), total = TESTS.length, pct = Math.floor(done * 100 / total);
  const nav = user ? `<nav style="display:flex;gap:14px;flex-wrap:wrap;margin:10px 0;font-size:14px">
    <a href="/">Home</a><a href="/projects">Projects</a><a href="/translate">Translate</a><a href="/tm">Translation Memory</a>
    <a href="/glossaries">Glossaries</a><a href="/reviews">Reviews</a><a href="/credits">Credits</a><a href="/profile">Profile</a>
    <a href="/api/docs">API Docs</a><a href="/tests">Mission / Tests</a><a href="/logout">Log out (${esc(user.name)})</a></nav>`
    : `<nav style="display:flex;gap:14px;margin:10px 0;font-size:14px"><a href="/login">Log in</a><a href="/register">Register</a><a href="/tests">Mission / Tests</a></nav>`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — HexaTranslate (Lab 38)</title>
<style>body{font-family:system-ui,sans-serif;margin:0;background:#f8fafc;color:#0f172a}main{max-width:980px;margin:0 auto;padding:18px}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:12px 0}table{border-collapse:collapse;width:100%}td,th{border:1px solid #e2e8f0;padding:6px 8px;text-align:left;font-size:14px}
input,select,textarea{padding:7px 9px;border:1px solid #cbd5e1;border-radius:8px;margin:3px 0}button{background:#2563eb;color:#fff;border:0;border-radius:8px;padding:8px 14px;cursor:pointer}
a{color:#2563eb}.muted{color:#64748b;font-size:13px}.bar{height:10px;background:#e2e8f0;border-radius:6px;overflow:hidden}.bar>i{display:block;height:100%;background:linear-gradient(90deg,#2563eb,#7c3aed)}</style></head>
<body><main>
<header style="display:flex;align-items:center;gap:12px">
  <img src="/logo.png" alt="HexaCyberLab" style="height:40px;width:40px;object-fit:contain">
  <div style="flex:1"><strong>LAB ${LAB_NUMBER} — ${LAB_NAME}</strong>
  <div class="muted">${done}/${total} tests · ${pct}% complete</div>
  <div class="bar" style="margin-top:4px"><i style="width:${pct}%"></i></div></div>
</header>
${nav}
<h1>${esc(title)}</h1>
${body}
<footer class="muted" style="margin:26px 0 90px">HexaTranslate — a deliberately vulnerable training lab by HexaCyberLab. Local use only.</footer>
</main>${chatWidget()}</body></html>`;
}
function gatePage() {
  return `<!doctype html><html><head><meta charset="utf-8"><title>LAB ${LAB_NUMBER} — ${LAB_NAME} (locked)</title>
<style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#e5e7eb;display:flex;justify-content:center;padding:40px 16px}.card{background:#111827;border:1px solid #374151;border-radius:14px;padding:28px;max-width:520px}input{width:100%;padding:10px;border-radius:8px;border:1px solid #374151;background:#1f2937;color:#e5e7eb}button{background:#2563eb;color:#fff;border:0;border-radius:8px;padding:10px 16px;cursor:pointer;margin-top:10px}</style></head>
<body><div class="card"><img src="/logo.png" alt="HexaCyberLab" style="height:48px;width:48px;object-fit:contain">
<h2>LAB ${LAB_NUMBER} — ${LAB_NAME}</h2>
<p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
<form method="POST" action="/unlock"><input name="key" placeholder="Completion key from Lab ${LAB_NUMBER - 1}" autocomplete="off"><br><button type="submit">Unlock lab</button></form>
<p style="color:#9ca3af;font-size:13px">The Lab Coach (bottom-right) already works while the lab is locked — ask it who built these labs.</p>
</div>${chatWidget()}</body></html>`;
}
function testsPage(user) {
  const stats = featureStats();
  let body = `<p class="muted">Every test below is a real, working flaw in this app. Tests complete by <b>doing</b> the exploit — the server detects the real effect. Attempts per feature unlock the Lab Coach's step-by-step help at 3 tries.</p>`;
  for (const [feature, list] of Object.entries(groupTests())) {
    const st = stats[feature];
    body += `<div class="card"><h3>${esc(feature)} — ${st.done}/${st.total} done · ${st.attempts} attempt(s) so far</h3>`;
    for (const t of list) {
      const done = !!progress.tests[t.id];
      body += `<div style="border-top:1px solid #e2e8f0;padding:10px 0">
        <div>${done ? '✅' : '○'} <b>${esc(t.name)}</b> <span class="muted">${esc(t.owasp)} · ${esc(t.difficulty)}</span></div>
        <details><summary class="muted">Hint 1</summary><div>${esc(t.hints[0])}
        <details><summary class="muted">Hint 2</summary><div>${esc(t.hints[1])}
        <details><summary class="muted">Hint 3</summary><div>${esc(t.hints[2])}</div></details></div></details></div></details>
      </div>`;
    }
    body += `</div>`;
  }
  if (isComplete()) body += `<div class="card"><b>🎉 Lab complete!</b> Open your <a href="/complete">completion summary</a> and <a href="/certificate">certificate</a>.</div>`;
  return pageShell('Mission — Security Tests', user, body);
}
function groupTests() {
  const out = {};
  for (const t of TESTS) { out[t.feature] = out[t.feature] || []; out[t.feature].push(t); }
  return out;
}

/* ================= LAB COACH CHATBOT ================= */
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
const FEATURE_KEYS = {
  'Login & Authentication': ['login', 'password', 'sign in', 'reset', 'brute', 'enumerat', 'authentication', 'sql injection login'],
  'Account & Profile': ['profile', 'register', 'registration', 'sign up', 'mass assignment', 'xss profile', 'csrf profile', 'weak password'],
  'Translation Projects': ['project', 'export', 'delete project'],
  'Translation Memory': ['translation memory', 'memory', 'poison', 'tm ', 'translate', 'tm)'],
  'Glossaries & Term Bases': ['glossar', 'term', 'term base'],
  'Review Workflow': ['review', 'approve', 'reviewer'],
  'Credits & Billing': ['credit', 'billing', 'top-up', 'topup', 'transfer', 'balance'],
  'API & Platform': ['api', 'token', 'debug', 'headers', 'users endpoint'],
  'Admin Panel': ['admin', 'role cookie', 'delete user'],
};
function matchFeature(msg) {
  const m = ' ' + msg.toLowerCase() + ' ';
  for (const [f, keys] of Object.entries(FEATURE_KEYS)) if (keys.some(k => m.includes(k))) return f;
  return null;
}
function chatReply(raw) {
  const msg = String(raw || '');
  const m = msg.toLowerCase();
  const stats = featureStats();
  const done = doneCount(), total = TESTS.length, pct = Math.floor(done * 100 / total);
  if (/(who (built|made|created)|founder|your creator|who is behind)/.test(m)) return ATTRIBUTION;
  if (m.includes('key') && /(completion|next lab|unlock|give|what|share|tell)/.test(m)) {
    if (isComplete() && progress.keyRevealed) return `You completed the lab, so I can share it now. The completion key for Lab ${LAB_NUMBER} is: ${completionKey()} — paste it into Lab ${LAB_NUMBER + 1} to unlock it.`;
    return `I don't have the completion key yet — I only receive it when this lab is 100% complete. You're at ${pct}% (${done}/${total}). Finish all tests and ask me again.`;
  }
  const feature = matchFeature(msg);
  const asksHow = /(how|guide|help|step|exploit|walkthrough|do the|solve|attack)/.test(m);
  if (feature && asksHow) {
    const list = TESTS.filter(t => t.feature === feature);
    const n = progress.attempts[feature] || 0;
    const allPassed = list.every(t => progress.tests[t.id]);
    if (n >= 3 || allPassed) {
      const lines = list.map(t => progress.tests[t.id] ? `✔ ${t.name} — done.` : `• ${t.name}: ${t.hints[2]}`).join('\n');
      return `Here's the step-by-step for ${feature}:\n${lines}\nFull graded hints are also on the /tests page.`;
    }
    return `That feature is locked for help. First try the ${feature} tests yourself at least 3 times — I can see you've tried ${n} time(s) so far. After 3 real tries, ask me again and I'll guide you step by step.`;
  }
  if (/(how many|count|list|which|what features|vulnerabilit)/.test(m)) {
    if (feature) {
      const list = TESTS.filter(t => t.feature === feature);
      return `${feature} has ${list.length} test(s):\n` + list.map(t => `• ${t.name} (${t.difficulty})${progress.tests[t.id] ? ' ✔ done' : ''}`).join('\n') + `\nAttempts on this feature so far: ${progress.attempts[feature] || 0}. Ask me "how" after 3 tries and I'll walk you through them.`;
    }
    return `This lab has ${Object.keys(stats).length} features and ${total} tests in total:\n` +
      Object.entries(stats).map(([f, s]) => `• ${f}: ${s.total} tests (${s.done} done)`).join('\n') +
      `\nCurrent progress: ${done}/${total} tests · ${pct}%. Open /tests for the mission page with hints.`;
  }
  if (/(progress|status|next|stuck|start|begin)/.test(m)) {
    const next = TESTS.find(t => !progress.tests[t.id]);
    return next
      ? `You're at ${done}/${total} tests (${pct}%). Next open test: "${next.name}" in ${next.feature}. Its first hint: ${next.hints[0]} Attempts on that feature: ${progress.attempts[next.feature] || 0} (help unlocks at 3).`
      : `You're at 100%! Your completion summary is on /complete and your certificate on /certificate.`;
  }
  if (/(hello|hi|hey|salam)/.test(m)) return `Hello! I'm the Lab Coach for LAB ${LAB_NUMBER} — ${LAB_NAME}. This lab covers ${Object.keys(stats).length} features and ${total} security tests. Progress: ${done}/${total} (${pct}%). Ask me what features exist, how many tests a feature has, or — after 3 real attempts on a feature — ask me how to solve its tests.`;
  return `I can help with this lab's map and, after 3 attempts on a feature, step-by-step guidance. Try: "how many features are there?", "list the Translation Memory tests", or "what's my progress?". The full mission page is /tests.`;
}

/* ---- more encoded fragments (assembled on demand) ---- */


const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    const p = url.pathname;
    const method = req.method;
    const { user, role } = currentUser(req);
    const body = (method === 'POST') ? await readBody(req) : {};

    /* ---- always-available endpoints ---- */
    if (p === '/logo.png') {
      try { const data = fs.readFileSync(path.join(__dirname, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(data); }
      catch (e) { res.writeHead(404); res.end('no logo'); }
      return;
    }
    if (p === '/api/progress') {
      const done = doneCount();
      return sendJson(res, 200, { lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done, pct: Math.floor(done * 100 / TESTS.length), features: featureStats(), complete: isComplete() });
    }
    if (p === '/api/chat' && method === 'POST') return sendJson(res, 200, { reply: chatReply(body.message) });
    if (p === '/unlock' && method === 'POST') {
      const given = String(body.key || '');
      if (entryKeyMatches(given)) { progress.unlocked = true; saveProgress(); return redirect(res, '/'); }
      res.writeHead(403, { 'Content-Type': 'text/plain' }); return res.end('Key not accepted.');
    }

    /* ---- lock gate ---- */
    if (!progress.unlocked) return sendHtml(res, 200, gatePage());

    /* ================= PUBLIC / AUTH ================= */
    if (p === '/login' && method === 'GET') {
      return sendHtml(res, 200, pageShell('Log in', user, `<div class="card"><form method="POST" action="/login">
        <div>Email <input name="email" size="34"></div><div>Password <input name="password" type="password" size="34"></div>
        <button>Log in</button></form><p class="muted"><a href="/forgot">Forgot password?</a> · Test accounts are listed in the lab README.</p></div>`));
    }
    if (p === '/login' && method === 'POST') {
      attempt('Login & Authentication');
      const email = String(body.email || ''), password = String(body.password || '');
      let found = null, viaSqli = false;
      if (email.includes("'")) { // legacy string-built lookup: quoted input escapes the query
        const base = email.split("'")[0].trim();
        found = users.find(u => u.email === base) || null;
        if (found) viaSqli = true;
      }
      if (!found) found = users.find(u => u.email === email && u.pass === password) || null;
      if (found) {
        loginFails[email] = 0;
        if (viaSqli) pass('sqli-login');
        if ((found.email === 'demo@demo.local' && password === 'password') || (found.email === 'tara@hexatranslate.local' && password === 'LetMeIn123')) pass('default-creds');
        startSession(res, found);
        return redirect(res, '/');
      }
      const exists = users.some(u => u.email === email);
      if (exists) { enumSeen.exists = true; } else { enumSeen.missing = true; }
      if (enumSeen.exists && enumSeen.missing) pass('user-enum');
      loginFails[email] = (loginFails[email] || 0) + 1;
      if (loginFails[email] >= 10) pass('brute-force'); // the 10th failure is still processed — no throttle exists
      const msg = exists ? 'Incorrect password for that account.' : 'No account found for that email.';
      return sendHtml(res, 200, pageShell('Log in', null, `<div class="card"><p style="color:#b91c1c">${esc(msg)}</p><p><a href="/login">Try again</a></p></div>`));
    }
    if (p === '/forgot' && method === 'GET') {
      return sendHtml(res, 200, pageShell('Forgot password', user, `<div class="card"><form method="POST" action="/forgot">
        <div>Email <input name="email" size="34"></div><button>Send reset link</button></form></div>`));
    }
    if (p === '/forgot' && method === 'POST') {
      attempt('Login & Authentication');
      const email = String(body.email || '');
      const u = users.find(x => x.email === email);
      if (u) {
        enumSeen.exists = true;
        const token = 'rst-' + u.id;
        resetTokens[token] = u.id;
        if (enumSeen.exists && enumSeen.missing) pass('user-enum');
        return sendHtml(res, 200, pageShell('Forgot password', null, `<div class="card"><p>If the account exists, a reset link was sent. (Demo build — your link: <a href="/reset?token=${token}">/reset?token=${token}</a>)</p></div>`));
      }
      enumSeen.missing = true;
      if (enumSeen.exists && enumSeen.missing) pass('user-enum');
      return sendHtml(res, 200, pageShell('Forgot password', null, `<div class="card"><p style="color:#b91c1c">No account found for that email.</p></div>`));
    }
    if (p === '/reset' && method === 'GET') {
      return sendHtml(res, 200, pageShell('Reset password', user, `<div class="card"><form method="POST" action="/reset">
        <input type="hidden" name="token" value="${esc(url.searchParams.get('token') || '')}">
        <div>New password <input name="newpass" type="password" size="34"></div><button>Set new password</button></form></div>`));
    }
    if (p === '/reset' && method === 'POST') {
      attempt('Login & Authentication');
      const token = String(body.token || '');
      let uid = resetTokens[token];
      if (!uid) { // the token is derived purely from the user id — no issuance record is ever checked (intended flaw)
        const mm = /^rst-(\d+)$/.exec(token);
        if (mm && users.some(x => x.id === Number(mm[1]))) uid = Number(mm[1]);
      }
      if (uid) {
        const u = users.find(x => x.id === uid);
        if (u) { u.pass = String(body.newpass || ''); delete resetTokens[token]; if (/^rst-\d+$/.test(token)) pass('reset-token'); }
        return sendHtml(res, 200, pageShell('Reset password', null, `<div class="card"><p>Password updated. <a href="/login">Log in</a></p></div>`));
      }
      return sendHtml(res, 200, pageShell('Reset password', null, `<div class="card"><p style="color:#b91c1c">Invalid or expired reset token.</p></div>`));
    }
    if (p === '/logout') {
      const c = parseCookies(req); if (c.sid) delete sessions[c.sid];
      res.setHeader('Set-Cookie', ['sid=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0']);
      return redirect(res, '/login');
    }
    if (p === '/register' && method === 'GET') {
      return sendHtml(res, 200, pageShell('Register', user, `<div class="card"><form method="POST" action="/register">
        <div>Name <input name="name" size="34"></div><div>Email <input name="email" size="34"></div>
        <div>Password <input name="password" type="password" size="34"></div><button>Create account</button></form></div>`));
    }
    if (p === '/register' && method === 'POST') {
      attempt('Account & Profile');
      const nu = { id: nextUserId++, name: String(body.name || 'New User'), email: String(body.email || ''), pass: String(body.password || ''), role: 'member', plan: 'Free', credits: 100 };
      // Mass assignment: the whole body is bound onto the record (intended flaw).
      for (const k of ['plan', 'role']) if (body[k] !== undefined) nu[k] = String(body[k]);
      if (body.credits !== undefined) nu.credits = Number(body.credits) || 0;
      users.push(nu);
      if (String(body.password || '').length < 8) pass('weak-password');
      if (nu.plan === 'Enterprise' || nu.role === 'admin' || nu.credits > 5000) pass('mass-assignment');
      startSession(res, nu);
      return redirect(res, '/profile');
    }

    /* ---- everything below requires a login ---- */
    if (!user) {
      if (p === '/api/users' || p === '/debug' || p === '/api/ping' || p === '/api/projects') { /* public API flaws handled below */ }
      else if (p === '/complete' || p === '/complete/name' || p === '/certificate') { /* completion pages stay public */ } else return redirect(res, '/login');
    }

    if (p === '/' && method === 'GET') {
      const mine = projects.filter(x => x.ownerId === user.id);
      return sendHtml(res, 200, pageShell('HexaTranslate — Translation SaaS', user, `
        <div class="card"><p>Welcome back, ${esc(user.name)}. Plan: <b>${esc(user.plan)}</b> · Credits: <b>${user.credits}</b> · Role: <b>${esc(role)}</b></p>
        <p>Translate product copy, contracts and support content with a shared translation memory, team glossaries and a reviewer workflow. Translations here are simulated deterministically — no external services.</p></div>
        <div class="card"><h3>Your projects (${mine.length})</h3>${mine.map(x => `<div>• <a href="/project?id=${x.id}">${esc(x.name)}</a> <span class="muted">${x.src}→${x.tgt} · ${esc(x.status)}</span></div>`).join('') || '<p class="muted">None yet.</p>'}</div>`));
    }

    /* ================= PROFILE ================= */
    if (p === '/profile' && method === 'GET') {
      return sendHtml(res, 200, pageShell('Your profile', user, `<div class="card">
        <p>Display name (rendered exactly as stored):</p><h3>${user.name}</h3>
        ${XSS_RE.test(user.name) ? (pass('stored-xss-profile'), '') : ''}
        <p class="muted">Email: ${esc(user.email)} · Role: ${esc(user.role)} · Plan: ${esc(user.plan)} · Credits: ${user.credits}</p>
        <form method="POST" action="/profile"><input type="hidden" name="hx_token" value="app-form">
        <div>Display name <input name="name" size="34" value="${esc(user.name)}"></div><button>Save profile</button></form></div>`));
    }
    if (p === '/profile' && method === 'POST') {
      attempt('Account & Profile');
      if (body.name !== undefined) user.name = String(body.name);
      if (!body.hx_token) pass('profile-csrf'); // state change accepted with no marker at all
      return redirect(res, '/profile');
    }

    /* ================= PROJECTS ================= */
    if (p === '/projects' && method === 'GET') {
      const mine = projects.filter(x => x.ownerId === user.id);
      return sendHtml(res, 200, pageShell('Translation projects', user, `<div class="card">
        ${mine.map(x => `<div>• <a href="/project?id=${x.id}">${esc(x.name)}</a> <span class="muted">${x.src}→${x.tgt} · ${esc(x.status)} · budget $${x.budget}</span> — <a href="/project/export?id=${x.id}">export</a></div>`).join('') || '<p class="muted">No projects yet.</p>'}
        <h4>Create project</h4><form method="POST" action="/projects">
        <div>Name <input name="name" size="40"></div><div>From <input name="src" value="en" size="4"> To <input name="tgt" value="de" size="4"> Budget $<input name="budget" value="100" size="6"></div>
        <button>Create</button></form></div>`));
    }
    if (p === '/projects' && method === 'POST') {
      attempt('Translation Projects');
      projects.push({ id: nextProjectId++, ownerId: user.id, name: String(body.name || 'Untitled'), src: String(body.src || 'en'), tgt: String(body.tgt || 'de'), status: 'Draft', budget: Number(body.budget) || 0 });
      return redirect(res, '/projects');
    }
    if (p === '/project' && method === 'GET') {
      attempt('Translation Projects');
      const pr = projects.find(x => x.id === Number(url.searchParams.get('id')));
      if (!pr) return sendHtml(res, 404, pageShell('Not found', user, '<div class="card">Project not found.</div>'));
      if (pr.ownerId !== user.id) pass('project-idor'); // served anyway — no ownership check (intended flaw)
      const owner = users.find(u => u.id === pr.ownerId);
      return sendHtml(res, 200, pageShell('Project #' + pr.id, user, `<div class="card">
        <h3>${esc(pr.name)}</h3><p class="muted">Owner: ${esc(owner ? owner.name : '?')} · ${pr.src}→${pr.tgt} · Status: ${esc(pr.status)} · Budget: $${pr.budget}</p>
        <p><a href="/project/export?id=${pr.id}">Export JSON</a></p>
        <form method="POST" action="/project/delete"><input type="hidden" name="id" value="${pr.id}"><button>Delete project</button></form></div>`));
    }
    if (p === '/project/export' && method === 'GET') {
      attempt('Translation Projects');
      const pr = projects.find(x => x.id === Number(url.searchParams.get('id')));
      if (!pr) return sendJson(res, 404, { error: 'not found' });
      if (pr.ownerId !== user.id) pass('export-idor');
      res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="project-${pr.id}.json"` });
      return res.end(JSON.stringify(pr, null, 2));
    }
    if (p === '/project/delete' && method === 'POST') {
      attempt('Translation Projects');
      const idx = projects.findIndex(x => x.id === Number(body.id));
      if (idx >= 0) { if (projects[idx].ownerId !== user.id) pass('project-delete-idor'); projects.splice(idx, 1); }
      return redirect(res, '/projects');
    }

    /* ================= TRANSLATE + TM ================= */
    if (p === '/translate' && method === 'GET') {
      const myGloss = glossaries.filter(g => g.ownerId === user.id || g.isPublic);
      return sendHtml(res, 200, pageShell('Translate', user, `<div class="card"><form method="POST" action="/translate">
        <div>Text <input name="text" size="60" placeholder="Your order has shipped"></div>
        <div>From <select name="src"><option>en</option></select> To <select name="tgt"><option>de</option><option>fr</option><option>es</option></select></div>
        <div>Glossary <select name="glossaryId"><option value="">(none)</option>${myGloss.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></div>
        <button>Translate (uses shared translation memory first)</button></form></div>`));
    }
    if (p === '/translate' && method === 'POST') {
      attempt('Translation Memory');
      const r = translateText(String(body.text || ''), String(body.src || 'en'), String(body.tgt || 'de'), body.glossaryId);
      if (r.tmHit && r.tmHit.added && r.tmHit.authorId !== user.id) pass('tm-poisoning');
      if (XSS_RE.test(r.output)) pass('glossary-xss');
      return sendHtml(res, 200, pageShell('Translation result', user, `<div class="card">
        <p class="muted">Source (${esc(String(body.src || 'en'))}→${esc(String(body.tgt || 'de'))})${r.tmHit ? ' · matched translation memory entry #' + r.tmHit.id : ''}</p>
        <p>${esc(String(body.text || ''))}</p><h3>Result</h3><div style="font-size:18px">${r.output}</div>
        <p><a href="/translate">Translate more</a></p></div>`));
    }
    if (p === '/tm' && method === 'GET') {
      return sendHtml(res, 200, pageShell('Translation memory (shared)', user, `<div class="card">
        <table><tr><th>#</th><th>Pair</th><th>Source</th><th>Target</th><th>Author</th></tr>
        ${tmEntries.map(e => { const a = users.find(u => u.id === e.authorId); return `<tr><td>${e.id}</td><td>${e.src}→${e.tgt}</td><td>${esc(e.source)}</td><td>${esc(e.target)}</td><td>${esc(a ? a.name : '?')}</td></tr>`; }).join('')}</table>
        <h4>Add entry</h4><form method="POST" action="/tm/add">
        <div>From <input name="src" value="en" size="3"> To <input name="tgt" value="fr" size="3"></div>
        <div>Source <input name="source" size="40"></div><div>Target <input name="target" size="40"></div><button>Add to shared memory</button></form>
        <p class="muted">Note: when several entries match a phrase, the newest one wins.</p></div>`));
    }
    if (p === '/tm/add' && method === 'POST') {
      attempt('Translation Memory');
      tmEntries.push({ id: nextTmId++, src: String(body.src || 'en'), tgt: String(body.tgt || 'de'), source: String(body.source || ''), target: String(body.target || ''), authorId: user.id, added: true });
      return redirect(res, '/tm');
    }

    /* ================= GLOSSARIES ================= */
    if (p === '/glossaries' && method === 'GET') {
      const visible = glossaries.filter(g => g.ownerId === user.id || g.isPublic);
      return sendHtml(res, 200, pageShell('Glossaries & term bases', user, `<div class="card">
        ${visible.map(g => `<div>• <a href="/glossary?id=${g.id}">${esc(g.name)}</a> <span class="muted">${g.src}→${g.tgt} · ${g.isPublic ? 'public' : 'private'} · ${terms.filter(t => t.glossaryId === g.id).length} terms</span></div>`).join('') || '<p class="muted">None.</p>'}
        <h4>Create glossary</h4><form method="POST" action="/glossaries">
        <div>Name <input name="name" size="36"></div><div>From <input name="src" value="en" size="3"> To <input name="tgt" value="de" size="3"> Public <input type="checkbox" name="isPublic" value="1"></div>
        <button>Create</button></form></div>`));
    }
    if (p === '/glossaries' && method === 'POST') {
      attempt('Glossaries & Term Bases');
      glossaries.push({ id: nextGlossaryId++, ownerId: user.id, name: String(body.name || 'Glossary'), src: String(body.src || 'en'), tgt: String(body.tgt || 'de'), isPublic: body.isPublic === '1' || body.isPublic === 'on' });
      return redirect(res, '/glossaries');
    }
    if (p === '/glossary' && method === 'GET') {
      attempt('Glossaries & Term Bases');
      const g = glossaries.find(x => x.id === Number(url.searchParams.get('id')));
      if (!g) return sendHtml(res, 404, pageShell('Not found', user, '<div class="card">Glossary not found.</div>'));
      if (!g.isPublic && g.ownerId !== user.id) pass('glossary-idor'); // privacy flag ignored (intended flaw)
      const gt = terms.filter(t => t.glossaryId === g.id);
      if (gt.some(t => XSS_RE.test(t.target) || XSS_RE.test(t.source))) pass('glossary-xss');
      return sendHtml(res, 200, pageShell('Glossary #' + g.id, user, `<div class="card">
        <h3>${esc(g.name)}</h3><p class="muted">${g.src}→${g.tgt} · ${g.isPublic ? 'public' : 'private'}</p>
        <table><tr><th>Source term</th><th>Target term (rendered raw)</th></tr>
        ${gt.map(t => `<tr><td>${esc(t.source)}</td><td>${t.target}</td></tr>`).join('')}</table>
        <h4>Add term</h4><form method="POST" action="/terms"><input type="hidden" name="glossaryId" value="${g.id}">
        <div>Source <input name="source" size="24"> Target <input name="target" size="24"></div><button>Add term</button></form></div>`));
    }
    if (p === '/terms' && method === 'POST') {
      attempt('Glossaries & Term Bases');
      const g = glossaries.find(x => x.id === Number(body.glossaryId));
      if (g) { if (g.ownerId !== user.id) pass('term-injection'); terms.push({ id: nextTermId++, glossaryId: g.id, source: String(body.source || ''), target: String(body.target || '') }); }
      return redirect(res, '/glossary?id=' + (g ? g.id : ''));
    }

    /* ================= REVIEWS ================= */
    if (p === '/reviews' && method === 'GET') {
      return sendHtml(res, 200, pageShell('Review workflow', user, `<div class="card">
        ${reviews.map(r => { const pr = projects.find(x => x.id === r.projectId); const rv = users.find(u => u.id === r.reviewerId); return `<div style="border-top:1px solid #e2e8f0;padding:8px 0">
          Review #${r.id} — project <b>${esc(pr ? pr.name : '#' + r.projectId)}</b> · assigned reviewer: ${esc(rv ? rv.name : '?')} · status: <b>${esc(r.status)}</b><br>
          <span class="muted">${esc(r.comment)}</span>
          <form method="POST" action="/review/approve" style="display:inline"><input type="hidden" name="id" value="${r.id}"><button>Approve</button></form>
          <form method="POST" action="/review/reject" style="display:inline"><input type="hidden" name="id" value="${r.id}"><button>Reject</button></form></div>`; }).join('') || '<p class="muted">No reviews.</p>'}
        </div>`));
    }
    if ((p === '/review/approve' || p === '/review/reject') && method === 'POST') {
      attempt('Review Workflow');
      const r = reviews.find(x => x.id === Number(body.id));
      if (r) {
        if (user.id !== r.reviewerId && user.role !== 'admin') pass('reviewer-bypass');
        r.status = p.endsWith('approve') ? 'Approved' : 'Rejected';
        const pr = projects.find(x => x.id === r.projectId);
        if (pr) pr.status = r.status;
      }
      return redirect(res, '/reviews');
    }

    /* ================= CREDITS ================= */
    if (p === '/credits' && method === 'GET') {
      return sendHtml(res, 200, pageShell('Credits & billing', user, `<div class="card">
        <p>Your balance: <b>${user.credits}</b> character credits (plan ${esc(user.plan)}).</p>
        <h4>Top up</h4><form method="POST" action="/credits/topup"><div>Amount <input name="amount" value="100" size="8"></div><button>Top up</button></form>
        <h4>Transfer credits</h4><form method="POST" action="/credits/transfer">
        <div>To (email) <input name="to" size="30"></div><div>Amount <input name="amount" value="50" size="8"></div><button>Transfer</button></form></div>`));
    }
    if (p === '/credits/topup' && method === 'POST') {
      attempt('Credits & Billing');
      const amt = Number(body.amount);
      if (!Number.isNaN(amt)) { user.credits += amt; if (amt <= 0) pass('credit-negative-topup'); }
      return redirect(res, '/credits');
    }
    if (p === '/credits/transfer' && method === 'POST') {
      attempt('Credits & Billing');
      const amt = Number(body.amount);
      const to = users.find(u => u.email === String(body.to || ''));
      if (to && !Number.isNaN(amt)) { user.credits -= amt; to.credits += amt; if (amt < 0) pass('credit-transfer-negative'); }
      return redirect(res, '/credits');
    }

    /* ================= API & PLATFORM ================= */
    if (p === '/api/docs' && method === 'GET') {
      return sendHtml(res, 200, pageShell('API documentation', user, `<div class="card">
        <p>Authenticate API calls with your account token. For convenience, your token is <b>derived from your account email</b>: it is simply the base64 encoding of the email address.</p>
        <p><code>GET /api/projects?token=&lt;base64(email)&gt;</code> — returns translation projects.</p>
        <p class="muted">Other endpoints: <code>GET /api/users</code>, <code>GET /api/ping</code>. Internal diagnostics live at <code>/debug</code>.</p></div>`));
    }
    if (p === '/api/projects' && method === 'GET') {
      attempt('API & Platform');
      const token = url.searchParams.get('token') || '';
      let email = '';
      try { email = Buffer.from(token, 'base64').toString('utf8'); } catch (e) {}
      const u = users.find(x => x.email === email);
      if (!u) return sendJson(res, 401, { error: 'invalid token' });
      pass('weak-api-token'); // credential derived from a public identifier was accepted
      return sendJson(res, 200, { user: u.email, projects });
    }
    if (p === '/api/users' && method === 'GET') {
      attempt('API & Platform');
      pass('api-user-dump');
      return sendJson(res, 200, users.map(u => ({ id: u.id, name: u.name, email: u.email, password: u.pass, role: u.role, plan: u.plan, credits: u.credits })));
    }
    if (p === '/debug' && method === 'GET') {
      attempt('API & Platform');
      pass('debug-exposure');
      return sendJson(res, 200, { app: 'HexaTranslate', version: '2.4.1', nodeEnv: 'production', port: PORT, API_SIGNING_SECRET: 'dev-signing-secret-123', tmSize: tmEntries.length, users: users.length, note: 'diagnostics — do not ship' });
    }
    if (p === '/api/ping' && method === 'GET') {
      attempt('API & Platform');
      const hdrs = res.getHeaderNames();
      const hasSecurity = ['content-security-policy', 'x-frame-options', 'strict-transport-security', 'x-content-type-options'].some(h => hdrs.includes(h));
      if (!hasSecurity) pass('missing-headers');
      return sendJson(res, 200, { ok: true, ts: Date.now() });
    }

    /* ================= ADMIN ================= */
    if (p === '/admin' && method === 'GET') {
      attempt('Admin Panel');
      if (role !== 'admin') return sendHtml(res, 403, pageShell('Forbidden', user, '<div class="card">Admins only.</div>'));
      if (user.role !== 'admin') pass('cookie-role-tamper'); // reached via the client-supplied role cookie
      return sendHtml(res, 200, pageShell('Admin panel', user, `<div class="card">
        <h3>All users</h3><table><tr><th>#</th><th>Name</th><th>Email</th><th>Password</th><th>Role</th><th>Plan</th><th>Credits</th><th></th></tr>
        ${users.map(u => `<tr><td>${u.id}</td><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.pass)}</td><td>${esc(u.role)}</td><td>${esc(u.plan)}</td><td>${u.credits}</td>
        <td><form method="POST" action="/admin/delete-user"><input type="hidden" name="id" value="${u.id}"><button>Delete</button></form></td></tr>`).join('')}</table></div>`));
    }
    if (p === '/admin/delete-user' && method === 'POST') {
      attempt('Admin Panel');
      if (role !== 'admin') return sendHtml(res, 403, pageShell('Forbidden', user, '<div class="card">Admins only.</div>'));
      const idx = users.findIndex(u => u.id === Number(body.id));
      if (idx >= 0) { users.splice(idx, 1); pass('admin-csrf'); } // destructive action, no token of any kind
      return redirect(res, '/admin');
    }

    /* ================= COMPLETE + CERTIFICATE ================= */
    if (p === '/complete' && method === 'GET') return sendHtml(res, 200, completePage(user));
    if (p === '/complete/name' && method === 'POST') { progress.testerName = String(body.name || '').slice(0, 80); saveProgress(); return redirect(res, '/certificate'); }
    if (p === '/certificate' && method === 'GET') {
      if (!isComplete()) return redirect(res, '/complete');
      return sendHtml(res, 200, certificatePage(user));
    }
    if (p === '/tests' && method === 'GET') return sendHtml(res, 200, testsPage(user));

    return sendHtml(res, 404, pageShell('Not found', user, '<div class="card">Page not found.</div>'));
  } catch (err) {
    try { sendHtml(res, 500, '<h1>Server error</h1><p>The lab survived your input. Try again.</p>'); } catch (e) {}
  }
});

/* ---- more encoded fragments (assembled on demand) ---- */
const _CM_C = ['LVBSTg==', 'MVNUTQ==', 'R0xOTQ=='];

function completePage(user) { if (!user) user = { name: 'Security Tester', email: '', id: 0 };
  const stats = featureStats();
  const done = doneCount(), total = TESTS.length, pct = Math.floor(done * 100 / total);
  if (!isComplete()) {
    const left = TESTS.filter(t => !progress.tests[t.id]);
    return pageShell('Completion summary', user, `<div class="card"><h3>Not yet — ${done}/${total} tests (${pct}%)</h3>
      <p>Remaining tests:</p>${left.map(t => `<div>○ ${esc(t.name)} <span class="muted">(${esc(t.feature)})</span></div>`).join('')}
      <p><a href="/tests">Back to the mission page</a></p></div>`);
  }
  const grouped = groupTests();
  const section2 = Object.entries(grouped).map(([f, list]) => `<div>• <b>${esc(f)}</b>: ${list.length} vulnerabilities</div>`).join('');
  const section3 = TESTS.map(t => `<div>• ${esc(t.name)}</div>`).join('');
  const section4 = TESTS.map(t => `<div style="margin:6px 0"><b>${esc(t.name)}:</b> ${esc(t.lesson)}</div>`).join('');
  const section5 = TESTS.map(t => `<div style="margin:6px 0"><b>${esc(t.name)}:</b> ${esc(t.impact)}</div>`).join('');
  const section6 = TESTS.map(t => `<div style="margin:6px 0"><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)}<br><span class="muted">Remediation: ${esc(t.report.remediation)}</span></div>`).join('');
  return pageShell('🎉 Lab complete — summary', user, `
    <div class="card"><h3>1 · Features in this lab</h3><p>${Object.keys(stats).length} features, ${total} security tests in total.</p></div>
    <div class="card"><h3>2 · Vulnerabilities per feature</h3>${section2}</div>
    <div class="card"><h3>3 · How the testing was done — ${done} techniques completed</h3>${section3}</div>
    <div class="card"><h3>4 · What you learned</h3>${section4}</div>
    <div class="card"><h3>5 · What this means for a real client</h3>${section5}</div>
    <div class="card"><h3>6 · Writing it in a real report</h3>${section6}</div>
    <div class="card" style="border-color:#2563eb"><h3>Your completion key for Lab ${LAB_NUMBER + 1}</h3>
      <p style="font-size:20px;font-family:monospace;letter-spacing:1px"><b>${completionKey()}</b></p>
      <p class="muted">Paste this key into Lab ${LAB_NUMBER + 1} to unlock it. The Lab Coach can also give it to you now.</p>
      <form method="POST" action="/complete/name"><div>Your name for the certificate <input name="name" size="30" value="${esc(progress.testerName || (user ? user.name : ''))}"></div>
      <button>Save name & view certificate</button></form>
      <p><a href="/certificate">Open certificate</a></p></div>`);
}
function certificatePage(user) { if (!user) user = { name: 'Security Tester', email: '', id: 0 };
  const stats = featureStats();
  const name = progress.testerName || (user ? user.name : 'Security Tester');
  const date = progress.completedAt ? new Date(progress.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  return `<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER} ${LAB_NAME}</title>
<style>body{font-family:Georgia,serif;background:#f1f5f9;display:flex;justify-content:center;padding:30px}.card{background:#fff;border:3px double #2563eb;border-radius:10px;padding:36px 44px;max-width:720px;text-align:center}h1{margin:8px 0}@media print{body{background:#fff}}</style></head>
<body><div class="card">
<img src="/logo.png" alt="HexaCyberLab" style="height:64px;width:64px;object-fit:contain">
<h1>Certificate of Completion</h1>
<p>This certifies that</p>
<h2>${esc(name)}</h2>
<p>has completed 100% of the security tests in</p>
<h3>LAB ${LAB_NUMBER} — ${LAB_NAME} (${TESTS.length} tests across ${Object.keys(stats).length} features)</h3>
<p>Completed on ${esc(date)}</p>
<p style="margin-top:26px;color:#475569">HexaCyberLab — Built by Md. Jony Hassain, Founder</p>
</div></body></html>`;
}

server.listen(PORT, HOST, () => {
  console.log(`${LAB_NAME} (LAB ${LAB_NUMBER}) running at http://${HOST}:${PORT}/ — local training only`);
});
