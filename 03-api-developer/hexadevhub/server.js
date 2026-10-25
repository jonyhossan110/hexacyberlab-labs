'use strict';
/*
 * HexaDevHub — LAB 22 of 110 (Category 3: API & Developer Platforms)
 * A deliberately vulnerable developer portal, built for authorised,
 * local-only security training. Zero-dependency Node.js.
 * Binds 127.0.0.1:3031 ONLY. Never deploy this publicly.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3031;
const LAB_NUMBER = 22;
const LAB_NAME = 'HexaDevHub';
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const LOGO_FILE = path.join(DIR, 'logo.png');

/* Key material is stored ONLY as encoded shards, scattered through this
 * file and reassembled at runtime. No key ever appears as a plain literal
 * anywhere in this folder. (Shard set A — entry gate, part 1.) */


// ---------------------------------------------------------------------------
// TESTS registry — the heart of the lab system.
// ---------------------------------------------------------------------------
const F_AUTH = 'Login & Authentication';
const F_REG = 'Registration & Profile';
const F_PROJ = 'Projects';
const F_TOK = 'API Tokens';
const F_DOCS = 'Documentation';
const F_INV = 'Team Invites';
const F_API = 'Usage & API';
const F_PLAT = 'Platform & Admin';

const TESTS = [
  // ---- Login & Authentication ----
  { id: 'sqli-login', feature: F_AUTH, name: 'SQL injection login bypass', owasp: 'A03:2021 – Injection', difficulty: 'Beginner',
    hints: ['The login lookup is built by gluing your input straight into the query text.', 'Try a quote in the email field and watch how the behaviour changes.', "Use the classic always-true condition: ' OR '1'='1 as the email, with any password."],
    lesson: 'String-built queries let attacker input change the query logic itself — parameterised queries keep data and code separate.',
    impact: 'An attacker logs in as any account — including an admin — without knowing a password, taking over projects and their live API tokens.',
    report: { title: 'SQL Injection in Login (Authentication Bypass)', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements for the login lookup; never concatenate user input into SQL.' } },
  { id: 'brute-force', feature: F_AUTH, name: 'Brute force — no rate limiting or lockout', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Fail a login on purpose. Does anything slow down, count, or lock?', 'Keep failing — past 5, past 10. The form never pushes back.', 'Ten or more failed attempts for one account are all processed normally — the missing throttle is the flaw.'],
    lesson: 'Without throttling or lockout, password guessing is free and unlimited; the server must count failures.',
    impact: 'Attackers guess weak passwords at full speed until one works — and a developer account hands over every project token inside it.',
    report: { title: 'Missing Brute-Force Protection on Login', severity: 'High', remediation: 'Add per-account and per-IP rate limiting, progressive delays, and lockout/alerting after repeated failures.' } },
  { id: 'user-enumeration', feature: F_AUTH, name: 'User enumeration via login & reset responses', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the login error for an email that exists with one that does not.', 'Do the same comparison on the forgot-password form.', 'Different messages ("no account" vs "wrong password") confirm which emails are registered — that difference is the leak.'],
    lesson: 'Distinct error messages turn login and reset forms into a directory of valid accounts for targeted attacks.',
    impact: 'Attackers build a verified list of a company\u2019s developer accounts, then focus phishing and password guessing only on real targets.',
    report: { title: 'Account Enumeration via Differential Responses', severity: 'Medium', remediation: 'Return one generic message ("if that account exists…") for login failures and reset requests.' } },
  { id: 'default-creds', feature: F_AUTH, name: 'Weak default demo credentials', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Portals often ship a seeded demo account — the login page mentions one.', 'Demo accounts pair an obvious email with an obvious password.', 'Try demo@hexadevhub.local with the password "demo". Seeded accounts must never survive into a real deployment.'],
    lesson: 'Seeded demo/default accounts are public knowledge — if they stay enabled, they are an open door.',
    impact: 'Anyone can walk into a live demo account and explore the portal exactly as a paying customer would see it.',
    report: { title: 'Default/Demo Credentials Enabled', severity: 'High', remediation: 'Disable seeded demo accounts in production and force unique, strong passwords at first login.' } },
  { id: 'predictable-reset', feature: F_AUTH, name: 'Predictable password-reset token', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a reset and study the token format the portal generates.', 'The token is not random — it is derived from something you already know about the account.', 'The token is simply the account email encoded in Base64. Encode a victim\u2019s email and use it on the reset form.'],
    lesson: 'Reset tokens must be unguessable random values; deriving them from public data (like the email) makes them forgeable.',
    impact: 'Anyone who knows a developer\u2019s email can reset their password and seize the account — and every project and token inside it.',
    report: { title: 'Predictable Password Reset Token', severity: 'High', remediation: 'Generate reset tokens from a CSPRNG (at least 128 bits), store them hashed, single-use, with a short expiry.' } },
  { id: 'cookie-tamper', feature: F_AUTH, name: 'Session role trusted from a client cookie (hx_role)', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['Log in and inspect the cookies the portal sets — one of them describes your role.', 'Roles belong on the server. What happens if the browser simply claims a better one?', 'Set the hx_role cookie to "admin" and open /admin — the portal believes the cookie.'],
    lesson: 'Authorisation data must live server-side in the session; anything stored client-side can be rewritten by the user.',
    impact: 'Any signed-up user can promote themselves to platform admin by editing a cookie — full control of every customer project.',
    report: { title: 'Client-Side Role Cookie Trusted for Authorisation (Privilege Escalation)', severity: 'Critical', remediation: 'Store roles only in the server-side session record; never accept role claims from client-controlled cookies.' } },

  // ---- Registration & Profile ----
  { id: 'weak-password', feature: F_REG, name: 'Weak password policy (1-character passwords accepted)', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a new account and try the shortest password the form will accept.', 'There is no length or complexity check on the server.', 'A password of a single character is accepted — the account is protected by almost nothing.'],
    lesson: 'The server must enforce password strength itself; browser-side hints are not a control.',
    impact: 'Users pick trivially guessable passwords, and with no brute-force protection those accounts fall in seconds.',
    report: { title: 'Weak Password Policy on Registration', severity: 'Medium', remediation: 'Enforce a minimum length (12+) and block common/breached passwords server-side at registration and reset.' } },
  { id: 'mass-assignment', feature: F_REG, name: 'Mass assignment — role set at registration', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration handler saves the whole submitted form onto the new account record.', 'What fields does an account have that the form never shows you?', 'Add a field to the registration POST — role=admin — and the new account is created as an admin.'],
    lesson: 'Binding request bodies directly to records lets attackers set fields the UI never offered (role, plan, balance).',
    impact: 'Anyone can register themselves as a platform admin in one request — no exploit chain needed.',
    report: { title: 'Mass Assignment Allows Privilege Escalation at Registration', severity: 'Critical', remediation: 'Whitelist the exact fields registration may set; assign roles server-side only.' } },
  { id: 'stored-xss-profile', feature: F_REG, name: 'Stored XSS in display name (team roster)', owasp: 'A03:2021 – Injection', difficulty: 'Beginner',
    hints: ['Your display name is shown to teammates on the project team roster.', 'Names are rendered without escaping — markup survives the round trip.', 'Set your display name to an <img onerror> payload; it executes for anyone viewing the team roster.'],
    lesson: 'Any user-controlled string rendered into HTML must be output-encoded, even "harmless" fields like names.',
    impact: 'An attacker plants a script in a shared roster that runs in teammates\u2019 browsers — stealing sessions or acting as them.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Output-encode all user data at render time and add a restrictive Content-Security-Policy.' } },
  { id: 'csrf-profile', feature: F_REG, name: 'CSRF on profile update', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['The profile form changes server state with a bare POST — no anti-CSRF token anywhere.', 'The portal recognises its own pages only by the marker cookie it sets.', 'Submit the profile change from a foreign Origin (or without the portal marker) — it is applied anyway.'],
    lesson: 'State-changing forms need unforgeable anti-CSRF tokens; cookies alone are sent automatically by the browser.',
    impact: 'A malicious page a developer visits can silently rewrite their profile (name, email) using their logged-in session.',
    report: { title: 'Cross-Site Request Forgery on Profile Update', severity: 'Medium', remediation: 'Require per-session anti-CSRF tokens on all state-changing requests and validate Origin/Referer.' } },

  // ---- Projects ----
  { id: 'project-idor-read', feature: F_PROJ, name: 'Private project readable by any account (IDOR)', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: ['Project URLs carry a simple numeric id.', 'Open the private project that belongs to the other seeded team — nothing checks that you are a member.', 'Change the project id in the URL to another team\u2019s private project and it is served to you in full.'],
    lesson: 'Every object access must check that the requester is authorised for THAT object, not just logged in.',
    impact: 'Competitors read other companies\u2019 private project details — the classic IDOR behind real customer-data breaches.',
    report: { title: 'Broken Object Level Authorisation — Private Project Readable by IDOR', severity: 'High', remediation: 'Check project membership/ownership on every project read and return 404 for non-members.' } },
  { id: 'project-tamper', feature: F_PROJ, name: 'Project settings tampered by a non-member (write IDOR)', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['Reading is not the only thing missing a check — find the project settings handler.', 'The settings POST trusts the project id in the URL.', 'POST new settings (name, visibility) to another team\u2019s project id — they are saved.'],
    lesson: 'Write paths need the same ownership checks as reads; a missing check on update is vandalism waiting to happen.',
    impact: 'An attacker renames a victim project or flips its visibility to public, exposing it to the whole internet.',
    report: { title: 'Broken Object Level Authorisation — Project Settings Writable by Non-Members', severity: 'High', remediation: 'Enforce ownership/membership checks on all project mutations, server-side.' } },

  // ---- API Tokens ----
  { id: 'token-leak-docs', feature: F_TOK, name: 'Live API token printed inside public docs quickstart', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: ['Open the public documentation of the seeded public project — read the quickstart code sample carefully.', 'The "example" credential in the sample is not a placeholder.', 'The docs generator pastes the project\u2019s real, live token into the example — anyone on the internet can copy and use it.'],
    lesson: 'Documentation generators must never substitute real credentials into examples; samples need obviously fake placeholders.',
    impact: 'A company\u2019s production API token sits in public docs — anyone can call their API as them, run up usage and read their data.',
    report: { title: 'Live API Credential Exposed in Public Documentation', severity: 'Critical', remediation: 'Use placeholder tokens in all examples, scan published docs for secrets, and rotate any token ever printed.' } },
  { id: 'token-scope-escalation', feature: F_TOK, name: 'Read-only token can write (scope not enforced)', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['Find a token whose scope is "read". The API still lets it change things.', 'Scope is stored on the token, but the write endpoint never looks at it.', 'Call the project-settings API endpoint with the read-only token — the change is applied.'],
    lesson: 'Scopes only protect you if every endpoint enforces them; storing a scope is not enforcement.',
    impact: 'A leaked low-privilege read token — the kind pasted into dashboards and CI logs — becomes full write access to the project.',
    report: { title: 'API Token Scope Not Enforced (Read Token Performs Writes)', severity: 'High', remediation: 'Enforce token scope on every API endpoint (read vs write vs admin) before processing the request.' } },
  { id: 'token-idor-revoke', feature: F_TOK, name: 'Any user can revoke another project\u2019s tokens (IDOR)', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['Token management actions address tokens by a simple numeric id.', 'The revoke handler never asks whose token it is.', 'Revoke a token that belongs to another team\u2019s project — their integration dies instantly.'],
    lesson: 'Management endpoints must verify the caller owns the parent project of the token being changed.',
    impact: 'An attacker kills a victim company\u2019s production integrations by revoking their tokens — instant denial of service.',
    report: { title: 'Broken Object Level Authorisation — Token Revocation', severity: 'High', remediation: 'Scope all token operations to projects the caller owns or administers.' } },
  { id: 'predictable-token', feature: F_TOK, name: 'Forgeable legacy API token (derived from public ids)', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['The API still honours an old "legacy" token format alongside issued tokens.', 'The legacy format is built only from values shown on the public project page.', 'Legacy token = dh_legacy_<projectId>_<ownerId>. Both numbers are public — forge it and call the API.'],
    lesson: 'Credentials must be high-entropy secrets; anything derivable from public identifiers is not a credential.',
    impact: 'Anyone can mint a working API credential for any project from its public page — total API compromise without stealing anything.',
    report: { title: 'Forgeable API Token Derived from Public Identifiers', severity: 'Critical', remediation: 'Retire the legacy token format; issue only random tokens of at least 128 bits and store them hashed.' } },

  // ---- Documentation ----
  { id: 'docs-stored-xss', feature: F_DOCS, name: 'Stored XSS in documentation page content', owasp: 'A03:2021 – Injection', difficulty: 'Intermediate',
    hints: ['Docs pages allow rich formatting — the renderer trusts the stored content completely.', 'HTML saved into a docs page comes back raw on the public docs view.', 'Save a docs page containing a <script> or <img onerror> payload — it executes for every visitor of the public page.'],
    lesson: 'Rich-text features need allowlist sanitisation before rendering; storing raw HTML is stored XSS by design.',
    impact: 'A project\u2019s public documentation — the most trusted page a company owns — runs attacker scripts in customers\u2019 browsers.',
    report: { title: 'Stored Cross-Site Scripting in Documentation Pages', severity: 'High', remediation: 'Sanitise stored docs HTML with an allowlist sanitizer and serve docs with a restrictive CSP.' } },
  { id: 'docs-edit-idor', feature: F_DOCS, name: 'Documentation of another project editable (IDOR)', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['Docs pages are addressed by id, and the edit handler trusts it.', 'You do not need to belong to a project to save changes to its pages.', 'POST an edit to a docs page of the other team\u2019s project — your text replaces theirs.'],
    lesson: 'Editor endpoints need the same membership checks as the content they modify.',
    impact: 'Attackers deface or poison a company\u2019s public documentation — planting wrong install commands or malicious download links.',
    report: { title: 'Broken Object Level Authorisation — Docs Page Editing', severity: 'High', remediation: 'Check project membership on every docs write; log content changes with authorship.' } },
  { id: 'private-docs-leak', feature: F_DOCS, name: 'Private project documentation served without login', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: ['Docs are addressed by a friendly slug, and the docs route never asks who you are.', 'Private projects have docs too — their slugs follow the project name.', 'Open the private project\u2019s docs slug in a private window (logged out) — the full internal guide is served.'],
    lesson: 'Public-by-URL is not a permission model; private content needs an authorisation check on every request.',
    impact: 'Internal runbooks, endpoints and credential notes of private projects are readable by anyone who guesses a slug.',
    report: { title: 'Private Documentation Exposed Without Authentication', severity: 'High', remediation: 'Require authentication and project membership for docs of non-public projects.' } },

  // ---- Team Invites ----
  { id: 'invite-any-account', feature: F_INV, name: 'Invite link accepted by the wrong account', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['An invite is addressed to one email — watch what the accept handler actually checks.', 'It checks that SOMEONE is logged in. Not who.', 'Log in as a different person and open someone else\u2019s invite link — you join the project.'],
    lesson: 'Invitations must be bound to the invited identity and verified at acceptance time.',
    impact: 'A forwarded or leaked invite link hands project access to strangers — a routine cause of insider-style breaches.',
    report: { title: 'Team Invite Not Bound to Invited Email', severity: 'High', remediation: 'Bind invites to the invited email address and require the accepting account to match it.' } },
  { id: 'invite-replay', feature: F_INV, name: 'Invite link reusable (never marked used)', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['After an invite is accepted, try the same link again from a second account.', 'The invite record is never consumed.', 'One invite link can onboard an unlimited number of accounts.'],
    lesson: 'Invite tokens are single-use credentials; they must be invalidated on first acceptance.',
    impact: 'A single shared invite link quietly adds attacker accounts to a project over and over.',
    report: { title: 'Team Invite Replay (Token Never Invalidated)', severity: 'Medium', remediation: 'Mark invites used on acceptance, expire them quickly, and alert owners on each join.' } },
  { id: 'invite-role-override', feature: F_INV, name: 'Invite acceptance lets the guest choose their own role', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Advanced',
    hints: ['The accept form posts more than the token — look at what else the handler trusts.', 'The role stored in the invite is not the role the handler uses.', 'Accept an invite while posting role=owner — you land in the project as its owner.'],
    lesson: 'Server-side records (the invite) must decide privileges; never take the granted role from the request.',
    impact: 'Anyone with any invite link becomes project OWNER — able to remove the real owners and seize the project.',
    report: { title: 'Privilege Escalation via Invite Role Override', severity: 'Critical', remediation: 'Grant exactly the role stored on the invite; ignore any role supplied by the client.' } },

  // ---- Usage & API ----
  { id: 'api-bola', feature: F_API, name: 'API returns another project\u2019s stats (BOLA)', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['Your token unlocks your project\u2019s stats endpoint. The id in the URL is the only thing choosing whose stats you get.', 'The API never compares the token\u2019s project with the requested project.', 'Call /api/v1/projects/<other-id>/stats with your token — their usage data is returned.'],
    lesson: 'API authorisation must compare the credential\u2019s owner with the requested object on every call.',
    impact: 'One customer reads every other customer\u2019s API usage — volumes, endpoints, growth — competitive and operational intelligence.',
    report: { title: 'Broken Object Level Authorization in Project Stats API', severity: 'High', remediation: 'Authorise the token\u2019s project against the path project id on every API request.' } },
  { id: 'usage-idor', feature: F_API, name: 'Usage dashboard of another project viewable (IDOR)', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: ['The usage dashboard URL carries the project id, like the project page.', 'Membership is not checked here either.', 'Open the usage dashboard of the other team\u2019s project — full call volume and token usage is shown.'],
    lesson: 'Dashboards aggregate sensitive operational data and need the same per-object checks as the objects themselves.',
    impact: 'Rivals watch a company\u2019s traffic patterns and busiest endpoints in real time — and learn which tokens are active.',
    report: { title: 'Broken Object Level Authorisation — Usage Dashboard', severity: 'Medium', remediation: 'Restrict dashboards to project members and audit access to usage data.' } },

  // ---- Platform & Admin ----
  { id: 'debug-exposure', feature: F_PLAT, name: 'Debug endpoint dumps users, tokens and config', owasp: 'A05:2021 – Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Development leftovers love obvious paths. The API has a diagnostics route.', 'It answers without any login at all.', 'GET /api/debug returns every user, every live token and the portal config in one JSON.'],
    lesson: 'Debug/diagnostic endpoints must never ship to production; if they exist they need admin auth and redaction.',
    impact: 'One unauthenticated request hands an attacker every live API token in the portal — instant compromise of all customers.',
    report: { title: 'Sensitive Data Exposure via Unauthenticated Debug Endpoint', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; require admin auth and redact secrets anywhere diagnostics remain.' } },
];

/* (Shard set B — entry gate, part 2.) */

const FEATURES = [...new Set(TESTS.map(t => t.feature))];

// ---------------------------------------------------------------------------
// Progress state (persisted in progress.json — generated runtime state)
// ---------------------------------------------------------------------------
let state = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadState() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      state = Object.assign(state, raw);
    }
  } catch (e) { /* corrupted state file -> start fresh in memory */ }
}
function saveState() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2)); } catch (e) { /* ignore */ }
}
loadState();

function doneCount() { return TESTS.filter(t => state.tests[t.id]).length; }
function isComplete() { return doneCount() === TESTS.length; }
function pass(id) {
  if (!TESTS.some(t => t.id === id)) return;
  if (!state.tests[id]) {
    state.tests[id] = true;
    if (isComplete()) {
      state.completedAt = state.completedAt || new Date().toISOString();
      state.keyRevealed = true;
    }
    saveState();
  }
}
function bump(feature) {
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  saveState();
}
function featureStats() {
  const out = {};
  for (const f of FEATURES) {
    const list = TESTS.filter(t => t.feature === f);
    out[f] = { total: list.length, done: list.filter(t => state.tests[t.id]).length, attempts: state.attempts[f] || 0 };
  }
  return out;
}

/* (Shard set C — entry gate, part 3 + completion seal, part 1.) */

const _kd = ['TC1YSA==', 'Ti0zMg=='];
function _un(shards) { return shards.map(s => [...Buffer.from(s, 'base64').toString('utf8')].reverse().join('')).join(''); }
const ENTRY_KEY_SHA256 = 'cb61fdd933b56217f8abef1f8c73517ed89c2d5d38efc21f6322997e981010ad';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */
/* (Shard set D — completion seal, part 2.) */
const _ke = ['UkZIRA==', 'LUgzNA=='];
const _kf = ['WERSRA==', 'QUhRSw=='];
function completionKey() { return _un([..._kd, ..._ke, ..._kf]); }

// ---------------------------------------------------------------------------
// Seeded business data (in-memory; resets with the server, by design)
// ---------------------------------------------------------------------------
const users = [
  { id: 1, name: 'Ava Rahman', email: 'ava@hexadevhub.local', password: 'ava12345', role: 'admin', resetToken: null },
  { id: 2, name: 'Daniel Osei', email: 'daniel@hexadevhub.local', password: 'daniel123', role: 'developer', resetToken: null },
  { id: 3, name: 'Marta Kowalski', email: 'marta@hexadevhub.local', password: 'marta123', role: 'developer', resetToken: null },
  { id: 4, name: 'Dev Demo', email: 'demo@hexadevhub.local', password: 'demo', role: 'developer', isDemo: true, resetToken: null },
  { id: 5, name: 'Tom Becker', email: 'tom@hexadevhub.local', password: 'tom12345', role: 'developer', resetToken: null },
];
let nextUserId = 6;
const projects = [
  { id: 1, name: 'Payments API', ownerId: 2, visibility: 'public', description: 'Card payments API for online stores. Public project — docs are open to everyone.' },
  { id: 2, name: 'Internal Billing', ownerId: 3, visibility: 'private', description: 'Internal settlement and invoicing service. Private project — members only.' },
];
const members = [
  { projectId: 1, userId: 2, role: 'owner' },
  { projectId: 1, userId: 5, role: 'viewer' },
  { projectId: 2, userId: 3, role: 'owner' },
];
const tokens = [
  { id: 1, projectId: 1, label: 'Production', value: 'dh_live_9f27ac41bd03e857', scope: 'write', revoked: false, usage: 1204 },
  { id: 2, projectId: 1, label: 'Read-only reporter', value: 'dh_live_51c8e0b3a977d24f', scope: 'read', revoked: false, usage: 312 },
  { id: 3, projectId: 2, label: 'Billing prod', value: 'dh_live_c41d77a09b3e58f1', scope: 'write', revoked: false, usage: 864 },
  { id: 4, projectId: 2, label: 'Billing readonly', value: 'dh_live_77aa10c3d55e901b', scope: 'read', revoked: false, usage: 45 },
];
let nextTokenId = 5;
const docsPages = [
  { id: 1, projectId: 1, slug: 'payments-api', title: 'Payments API — Quickstart',
    content: '<h3>Quickstart</h3><p>Create a charge in one call:</p><pre>curl https://api.hexadevhub.example/v1/charges \\\n  -H "Authorization: Bearer dh_live_9f27ac41bd03e857" \\\n  -d amount=2000 -d currency=usd</pre><p>That is all — your production key above is ready to use.</p>' },
  { id: 2, projectId: 2, slug: 'internal-billing', title: 'Internal Billing — Runbook',
    content: '<h3>INTERNAL ONLY</h3><p>Nightly settlement runs at 02:00. Refund window: 14 days. Escalation: billing-oncall. Never share this runbook outside the billing team.</p>' },
  { id: 3, projectId: 1, slug: 'payments-api-webhooks', title: 'Payments API — Webhooks',
    content: '<h3>Webhooks</h3><p>We POST charge.succeeded and charge.failed events to your endpoint. Retry policy: 5 attempts over 24 hours.</p>' },
];
let nextDocId = 4;
const invites = [];
let nextInviteId = 1;
const usageStats = {
  1: { totalCalls: 15216, endpoints: { 'POST /v1/charges': 8204, 'GET /v1/charges': 4311, 'POST /v1/refunds': 2701 } },
  2: { totalCalls: 3909, endpoints: { 'POST /v1/invoices': 2210, 'GET /v1/settlements': 1699 } },
};
const sessions = {};            // sid -> userId
const loginFailures = {};       // email -> failed count
const enumProbes = {};          // client ip -> { existing:Set, missing:Set }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
const XSS_RE = /(<script|<img[^>]*onerror|<svg|onerror\s*=|onload\s*=|<iframe|javascript:)/i;
const INJ_RE = /'\s*(or|and)\s+'?[^'\s]+'?\s*=\s*'?[^'\s]+'?/i;
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}
function currentUser(req) {
  const sid = req.cookies.hx_sess;
  if (!sid || !(sid in sessions)) return null;
  return users.find(u => u.id === sessions[sid]) || null;
}
function roleFor(req, user) { return req.cookies.hx_role || (user ? user.role : 'developer'); }
function isMember(projectId, userId) { return members.some(m => m.projectId === projectId && m.userId === userId); }
function memberRole(projectId, userId) { const m = members.find(m => m.projectId === projectId && m.userId === userId); return m ? m.role : null; }
function legacyResetToken(email) { return Buffer.from(String(email)).toString('base64').replace(/=+$/, ''); }
function csrfSuspect(req) {
  const o = req.headers.origin || req.headers.referer || '';
  if (o) { try { if (new URL(o).host !== req.headers.host) return true; } catch (e) { return true; } }
  if (!req.cookies.hx_marker) return true;
  return false;
}
function noteEnumProbe(req, email, exists) {
  const ip = (req.socket && req.socket.remoteAddress) || 'local';
  const rec = enumProbes[ip] || (enumProbes[ip] = { existing: new Set(), missing: new Set() });
  (exists ? rec.existing : rec.missing).add(String(email).toLowerCase());
  if (rec.existing.size > 0 && rec.missing.size > 0) pass('user-enumeration');
}
function send(res, code, body, type) {
  const headers = { 'Content-Type': type || 'text/html; charset=utf-8' };
  if (res._extraCookies) for (const c of res._extraCookies) { (headers['Set-Cookie'] = headers['Set-Cookie'] || []).push(c); }
  res.writeHead(code, headers);
  res.end(body);
}
function redirect(res, to) {
  const headers = { Location: to };
  if (res._extraCookies) headers['Set-Cookie'] = res._extraCookies;
  res.writeHead(302, headers);
  res.end();
}
function setCookie(res, str) { (res._extraCookies = res._extraCookies || []).push(str); }
function progressBar() {
  const done = doneCount(), total = TESTS.length, pct = Math.floor(done / total * 100);
  return `<div style="background:#16181d;border:1px solid #2a2e37;border-radius:8px;padding:10px 14px;margin:12px 0">
    <div style="font-size:13px;color:#c9d1d9">LAB ${LAB_NUMBER} · ${done}/${total} tests · ${pct}%</div>
    <div style="height:10px;background:#2a2e37;border-radius:5px;margin-top:6px"><div style="height:10px;width:${pct}%;background:linear-gradient(90deg,#3b82f6,#8b5cf6);border-radius:5px"></div></div></div>`;
}
function chatWidget() {
  return `<div id="hxchat" style="position:fixed;right:16px;bottom:16px;width:320px;max-width:92vw;background:#101216;border:1px solid #2a2e37;border-radius:10px;color:#e6e6e6;font-family:system-ui;z-index:50">
  <div style="padding:8px 12px;border-bottom:1px solid #2a2e37;font-weight:600">Lab Coach</div>
  <div id="hxlog" style="height:180px;overflow:auto;padding:8px 12px;font-size:13px"></div>
  <div style="display:flex;border-top:1px solid #2a2e37"><input id="hxmsg" style="flex:1;background:#0b0c0e;color:#e6e6e6;border:0;padding:8px" placeholder="Ask the Lab Coach…"><button onclick="hxSend()" style="background:#3b3f4a;color:#fff;border:0;padding:8px 12px;cursor:pointer">Send</button></div></div>
<script>
async function hxSend(){var i=document.getElementById('hxmsg'),l=document.getElementById('hxlog');var m=i.value.trim();if(!m)return;i.value='';l.innerHTML+='<div><b>You:</b> '+m.replace(/</g,'&lt;')+'</div>';try{var r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})});var j=await r.json();l.innerHTML+='<div style="margin:4px 0"><b>Coach:</b> '+String(j.reply).replace(/</g,'&lt;')+'</div>';}catch(e){l.innerHTML+='<div><b>Coach:</b> (connection error)</div>';}l.scrollTop=l.scrollHeight;}
document.getElementById('hxmsg').addEventListener('keydown',function(e){if(e.key==='Enter')hxSend();});
</script>`;
}
function layout(req, title, body) {
  const user = currentUser(req);
  const nav = user
    ? `<a href="/">Dashboard</a> · <a href="/projects">Projects</a> · <a href="/profile">Profile</a> · <a href="/tests">Tests</a> · <a href="/complete">Complete</a> · <a href="/logout">Log out (${esc(user.name)})</a>`
    : `<a href="/login">Log in</a> · <a href="/register">Register</a> · <a href="/tests">Tests</a>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} — ${LAB_NAME}</title>
<style>body{font-family:system-ui;background:#0b0c0e;color:#e6e6e6;margin:0 auto;max-width:920px;padding:18px}a{color:#7aa2ff}input,select,textarea{background:#16181d;color:#e6e6e6;border:1px solid #2a2e37;border-radius:6px;padding:7px;margin:3px 0}button{background:#3b3f4a;color:#fff;border:0;border-radius:6px;padding:8px 14px;cursor:pointer}table{border-collapse:collapse}td,th{border:1px solid #2a2e37;padding:6px 10px;text-align:left}.card{background:#101216;border:1px solid #2a2e37;border-radius:10px;padding:14px;margin:10px 0}code,pre{background:#16181d;padding:2px 5px;border-radius:4px}pre{padding:10px;overflow:auto}.muted{color:#9aa3ad}</style></head>
<body><header style="display:flex;align-items:center;gap:12px"><img src="/logo.png" alt="HexaCyberLab" style="height:44px"><div><div style="font-size:20px;font-weight:700">LAB ${LAB_NUMBER} — ${LAB_NAME}</div><div class="muted" style="font-size:12px">HexaCyberLab vulnerable lab — local training only</div></div></header>
${progressBar()}<nav style="margin:8px 0">${nav}</nav>${body}${chatWidget()}</body></html>`;
}
function gatePage(req) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>LAB ${LAB_NUMBER} — ${LAB_NAME} (locked)</title>
<style>body{font-family:system-ui;background:#0b0c0e;color:#e6e6e6;margin:0 auto;max-width:720px;padding:24px}input{background:#16181d;color:#e6e6e6;border:1px solid #2a2e37;border-radius:6px;padding:8px}button{background:#3b3f4a;color:#fff;border:0;border-radius:6px;padding:8px 14px;cursor:pointer}a{color:#7aa2ff}</style></head>
<body><header style="display:flex;align-items:center;gap:12px"><img src="/logo.png" alt="HexaCyberLab" style="height:44px"><div style="font-size:20px;font-weight:700">LAB ${LAB_NUMBER} — ${LAB_NAME}</div></header>
<div style="background:#101216;border:1px solid #2a2e37;border-radius:10px;padding:18px;margin-top:16px"><h2>🔒 This lab is locked</h2>
<p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
<form method="POST" action="/unlock"><input name="key" size="42" placeholder="Completion key from Lab ${LAB_NUMBER - 1}"><button type="submit">Unlock</button></form></div>
${chatWidget()}</body></html>`;
}

// ---------------------------------------------------------------------------
// Pages & flows
// ---------------------------------------------------------------------------
function pageHome(req, res) {
  const user = currentUser(req);
  if (!user) return redirect(res, '/login');
  const mine = projects.filter(p => isMember(p.id, user.id));
  const pub = projects.filter(p => p.visibility === 'public' && !isMember(p.id, user.id));
  const row = p => `<tr><td>${p.id}</td><td><a href="/projects/${p.id}">${esc(p.name)}</a></td><td>${esc(p.visibility)}</td><td>${esc(memberRole(p.id, user.id) || '—')}</td><td><a href="/projects/${p.id}/usage">Usage</a></td></tr>`;
  send(res, 200, layout(req, 'Dashboard', `<h2>Welcome, ${esc(user.name)}</h2>
  <div class="card"><h3>Your projects</h3><table><tr><th>ID</th><th>Name</th><th>Visibility</th><th>Your role</th><th></th></tr>${mine.map(row).join('') || '<tr><td colspan="5">No projects yet.</td></tr>'}</table></div>
  <div class="card"><h3>Public projects</h3><table><tr><th>ID</th><th>Name</th><th>Visibility</th><th>Your role</th><th></th></tr>${pub.map(row).join('') || '<tr><td colspan="5">None.</td></tr>'}</table></div>
  <p class="muted">Work through the security missions on the <a href="/tests">Tests</a> page. The Lab Coach (bottom right) helps — after you have tried a feature at least 3 times.</p>`));
}

function pageLogin(req, res, err) {
  send(res, 200, layout(req, 'Log in', `<h2>Log in</h2>${err ? `<p style="color:#ff8080">${esc(err)}</p>` : ''}
  <form method="POST" action="/login"><div>Email <input name="email" size="34"></div><div>Password <input name="password" type="password" size="34"></div><button type="submit">Log in</button></form>
  <p class="muted">Demo account: demo@hexadevhub.local / demo &nbsp;·&nbsp; <a href="/forgot">Forgot password?</a> &nbsp;·&nbsp; <a href="/register">Create an account</a></p>`));
}
function doLogin(req, res, body) {
  bump(F_AUTH);
  const email = String(body.email || ''), password = String(body.password || '');
  // Deliberately vulnerable: the account lookup is a string-built "query"
  // whose logic an injection payload can rewrite.
  const query = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`;
  void query;
  if (INJ_RE.test(email) || INJ_RE.test(password) || email.includes("'--")) {
    const u = users[0];
    startSession(req, res, u);
    pass('sqli-login');
    return redirect(res, '/');
  }
  const u = users.find(x => x.email.toLowerCase() === email.toLowerCase());
  noteEnumProbe(req, email, !!u);
  if (!u) return pageLogin(req, res, 'No account found for that email.');
  if (u.password !== password) {
    loginFailures[u.email] = (loginFailures[u.email] || 0) + 1;
    if (loginFailures[u.email] >= 10) pass('brute-force');
    return pageLogin(req, res, 'Incorrect password.');
  }
  if (u.isDemo) pass('default-creds');
  startSession(req, res, u);
  return redirect(res, '/');
}
function startSession(req, res, u) {
  const sid = crypto.randomBytes(12).toString('hex');
  sessions[sid] = u.id;
  setCookie(res, `hx_sess=${sid}; Path=/; HttpOnly`);
  setCookie(res, `hx_role=${encodeURIComponent(u.role)}; Path=/`);
}
function pageRegister(req, res, err) {
  send(res, 200, layout(req, 'Register', `<h2>Create a developer account</h2>${err ? `<p style="color:#ff8080">${esc(err)}</p>` : ''}
  <form method="POST" action="/register"><div>Display name <input name="name" size="34"></div><div>Email <input name="email" size="34"></div><div>Password <input name="password" type="password" size="34"></div><button type="submit">Register</button></form>`));
}
function doRegister(req, res, body) {
  bump(F_REG);
  const name = String(body.name || '').trim(), email = String(body.email || '').trim(), password = String(body.password || '');
  if (!name || !email || !password) return pageRegister(req, res, 'All fields are required.');
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) return pageRegister(req, res, 'That email is already registered.');
  if (password.length < 4) pass('weak-password');
  // Deliberately vulnerable: the whole form is bound onto the new record.
  const u = { id: nextUserId++, name, email, password, role: 'developer', resetToken: null };
  for (const k of Object.keys(body)) if (!(k in u) || k === 'role') u[k] = body[k];
  if (body.role && String(body.role) !== 'developer') pass('mass-assignment');
  users.push(u);
  startSession(req, res, u);
  return redirect(res, '/');
}
function pageForgot(req, res, msg) {
  send(res, 200, layout(req, 'Forgot password', `<h2>Forgot password</h2>${msg ? `<p>${esc(msg)}</p>` : ''}
  <form method="POST" action="/forgot"><div>Email <input name="email" size="34"></div><button type="submit">Send reset link</button></form>
  <p class="muted">Have a token already? <a href="/reset">Reset your password</a></p>`));
}
function doForgot(req, res, body) {
  bump(F_AUTH);
  const email = String(body.email || '');
  const u = users.find(x => x.email.toLowerCase() === email.toLowerCase());
  noteEnumProbe(req, email, !!u);
  if (!u) return pageForgot(req, res, 'No account exists for that email address.');
  u.resetToken = legacyResetToken(u.email); // deliberately predictable
  return pageForgot(req, res, `Reset link sent to ${u.email}. (Training build: the token was "emailed" — the reset form is at /reset.)`);
}
function pageReset(req, res, msg) {
  send(res, 200, layout(req, 'Reset password', `<h2>Reset password</h2>${msg ? `<p>${esc(msg)}</p>` : ''}
  <form method="POST" action="/reset"><div>Reset token <input name="token" size="40"></div><div>New password <input name="password" type="password" size="34"></div><button type="submit">Set new password</button></form>`));
}
function doReset(req, res, body) {
  bump(F_AUTH);
  const token = String(body.token || ''), password = String(body.password || '');
  const u = users.find(x => x.resetToken && x.resetToken === token) || users.find(x => legacyResetToken(x.email) === token);
  if (!u) return pageReset(req, res, 'That reset token is not valid.');
  u.password = password;
  u.resetToken = null;
  pass('predictable-reset');
  return pageReset(req, res, 'Password updated. You can now log in.');
}
function pageProfile(req, res, msg) {
  const user = currentUser(req);
  if (!user) return redirect(res, '/login');
  send(res, 200, layout(req, 'Profile', `<h2>Your profile</h2>${msg ? `<p>${esc(msg)}</p>` : ''}
  <form method="POST" action="/profile"><div>Display name <input name="name" size="34" value="${esc(user.name)}"></div><div>Email <input name="email" size="34" value="${esc(user.email)}"></div><button type="submit">Save profile</button></form>
  <p class="muted">Account role: ${esc(user.role)}</p>`));
}
function doProfile(req, res, body) {
  const user = currentUser(req);
  if (!user) return redirect(res, '/login');
  bump(F_REG);
  if (csrfSuspect(req)) pass('csrf-profile');
  if (body.name != null) {
    user.name = String(body.name);
    if (XSS_RE.test(user.name)) pass('stored-xss-profile');
  }
  if (body.email) user.email = String(body.email);
  if (body.role) { user.role = String(body.role); if (String(body.role) !== 'developer') pass('mass-assignment'); }
  return pageProfile(req, res, 'Profile saved.');
}
function doLogout(req, res) {
  const sid = req.cookies.hx_sess;
  if (sid) delete sessions[sid];
  setCookie(res, 'hx_sess=; Path=/; Max-Age=0');
  setCookie(res, 'hx_role=; Path=/; Max-Age=0');
  return redirect(res, '/login');
}

function pageProjects(req, res) {
  const user = currentUser(req);
  if (!user) return redirect(res, '/login');
  const all = projects.map(p => `<tr><td>${p.id}</td><td><a href="/projects/${p.id}">${esc(p.name)}</a></td><td>${esc(p.visibility)}</td><td>${esc(memberRole(p.id, user.id) || '—')}</td></tr>`).join('');
  send(res, 200, layout(req, 'Projects', `<h2>All projects</h2><table><tr><th>ID</th><th>Name</th><th>Visibility</th><th>Your role</th></tr>${all}</table>`));
}
function pageProject(req, res, id) {
  const user = currentUser(req);
  if (!user) return redirect(res, '/login');
  bump(F_PROJ);
  const p = projects.find(x => x.id === id);
  if (!p) return send(res, 404, layout(req, 'Not found', '<h2>Project not found</h2>'));
  const member = isMember(p.id, user.id);
  if (p.visibility === 'private' && !member) pass('project-idor-read'); // flaw: served anyway
  const roster = members.filter(m => m.projectId === p.id).map(m => {
    const mu = users.find(u => u.id === m.userId);
    // Deliberately vulnerable: display names are rendered raw into the roster.
    return `<tr><td>${mu ? mu.name : '?'}</td><td>${esc(mu ? mu.email : '')}</td><td>${esc(m.role)}</td></tr>`;
  }).join('');
  const toks = tokens.filter(t => t.projectId === p.id).map(t => `<tr><td>${t.id}</td><td>${esc(t.label)}</td><td><code>${esc(t.value)}</code></td><td>${esc(t.scope)}</td><td>${t.revoked ? 'revoked' : 'active'}</td><td><form method="POST" action="/tokens/${t.id}/revoke" style="display:inline"><button type="submit">Revoke</button></form></td></tr>`).join('');
  const docs = docsPages.filter(d => d.projectId === p.id).map(d => `<li><a href="/docs/${esc(d.slug)}">${esc(d.title)}</a> (<a href="/docs/${d.id}/edit">edit</a>)</li>`).join('');
  send(res, 200, layout(req, p.name, `<h2>${esc(p.name)}</h2>
  <p>${esc(p.description)}</p><p class="muted">Project ID ${p.id} · Owner user ID ${p.ownerId} · Visibility ${esc(p.visibility)}${member ? '' : ' · (you are not a member of this project)'}</p>
  <div class="card"><h3>Team roster</h3><table><tr><th>Name</th><th>Email</th><th>Role</th></tr>${roster}</table>
  <form method="POST" action="/projects/${p.id}/invite"><div>Invite by email <input name="email" size="30"> Role <select name="role"><option>developer</option><option>viewer</option><option>admin</option><option>owner</option></select> <button type="submit">Send invite</button></div></form></div>
  <div class="card"><h3>API tokens</h3><table><tr><th>ID</th><th>Label</th><th>Token</th><th>Scope</th><th>Status</th><th></th></tr>${toks}</table>
  <form method="POST" action="/projects/${p.id}/tokens"><div>New token label <input name="label" size="24"> Scope <select name="scope"><option>read</option><option>write</option><option>admin</option></select> <button type="submit">Create token</button></div></form></div>
  <div class="card"><h3>Documentation</h3><ul>${docs}</ul></div>
  <div class="card"><h3>Project settings</h3><form method="POST" action="/projects/${p.id}/settings"><div>Name <input name="name" size="34" value="${esc(p.name)}"></div><div>Visibility <select name="visibility"><option ${p.visibility === 'public' ? 'selected' : ''}>public</option><option ${p.visibility === 'private' ? 'selected' : ''}>private</option></select></div><button type="submit">Save settings</button></form></div>`));
}
function doProjectSettings(req, res, id, body) {
  const user = currentUser(req);
  if (!user) return redirect(res, '/login');
  bump(F_PROJ);
  const p = projects.find(x => x.id === id);
  if (!p) return send(res, 404, 'Project not found', 'text/plain');
  if (!isMember(p.id, user.id)) pass('project-tamper'); // flaw: no ownership check, applied anyway
  if (body.name) p.name = String(body.name);
  if (body.visibility === 'public' || body.visibility === 'private') p.visibility = body.visibility;
  return redirect(res, `/projects/${p.id}`);
}
function pageUsage(req, res, id) {
  const user = currentUser(req);
  if (!user) return redirect(res, '/login');
  bump(F_API);
  const p = projects.find(x => x.id === id);
  if (!p) return send(res, 404, layout(req, 'Not found', '<h2>Project not found</h2>'));
  if (!isMember(p.id, user.id)) pass('usage-idor'); // flaw: dashboard served to non-members
  const s = usageStats[p.id] || { totalCalls: 0, endpoints: {} };
  const eps = Object.entries(s.endpoints).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join('');
  const toks = tokens.filter(t => t.projectId === p.id).map(t => `<tr><td>${esc(t.label)}</td><td>${esc(t.scope)}</td><td>${t.usage}</td><td>${t.revoked ? 'revoked' : 'active'}</td></tr>`).join('');
  send(res, 200, layout(req, 'Usage', `<h2>Usage — ${esc(p.name)}</h2>
  <div class="card"><p>Total API calls: <b>${s.totalCalls}</b></p><table><tr><th>Endpoint</th><th>Calls</th></tr>${eps}</table></div>
  <div class="card"><h3>Token usage</h3><table><tr><th>Token</th><th>Scope</th><th>Calls</th><th>Status</th></tr>${toks}</table></div>`));
}
function doCreateToken(req, res, id, body) {
  const user = currentUser(req);
  if (!user) return redirect(res, '/login');
  bump(F_TOK);
  const p = projects.find(x => x.id === id);
  if (!p || !isMember(p.id, user.id)) return send(res, 403, layout(req, 'Forbidden', '<h2>Members only</h2>'));
  tokens.push({ id: nextTokenId++, projectId: p.id, label: String(body.label || 'Token'), value: 'dh_live_' + crypto.randomBytes(8).toString('hex'), scope: ['read', 'write', 'admin'].includes(body.scope) ? body.scope : 'read', revoked: false, usage: 0 });
  return redirect(res, `/projects/${p.id}`);
}
function doRevokeToken(req, res, id) {
  const user = currentUser(req);
  if (!user) return redirect(res, '/login');
  bump(F_TOK);
  const t = tokens.find(x => x.id === id);
  if (!t) return send(res, 404, 'Token not found', 'text/plain');
  if (!isMember(t.projectId, user.id)) pass('token-idor-revoke'); // flaw: revoked anyway
  t.revoked = true;
  return redirect(res, `/projects/${t.projectId}`);
}
function pageDocs(req, res, slug) {
  bump(F_DOCS);
  const page = docsPages.find(d => d.slug === slug);
  if (!page) return send(res, 404, layout(req, 'Not found', '<h2>Documentation page not found</h2>'));
  const p = projects.find(x => x.id === page.projectId);
  const user = currentUser(req);
  const member = user ? isMember(p.id, user.id) : false;
  if (p.visibility === 'private' && !member) pass('private-docs-leak'); // flaw: served anyway, even logged out
  const liveTok = tokens.filter(t => t.projectId === p.id && !t.revoked).map(t => t.value);
  if (liveTok.some(v => page.content.includes(v)) && (!user || user.id !== p.ownerId)) pass('token-leak-docs');
  // Deliberately vulnerable: stored docs HTML is rendered raw.
  send(res, 200, layout(req, page.title, `<h2>${esc(page.title)}</h2><div class="card">${page.content}</div><p class="muted">Project: ${esc(p.name)} · <a href="/docs/${page.id}/edit">Edit this page</a></p>`));
}
function pageDocsEdit(req, res, id, msg) {
  const user = currentUser(req);
  if (!user) return redirect(res, '/login');
  const page = docsPages.find(d => d.id === id);
  if (!page) return send(res, 404, layout(req, 'Not found', '<h2>Page not found</h2>'));
  send(res, 200, layout(req, 'Edit docs', `<h2>Edit documentation</h2>${msg ? `<p>${esc(msg)}</p>` : ''}
  <form method="POST" action="/docs/${page.id}/edit"><div>Title <input name="title" size="50" value="${esc(page.title)}"></div><div><textarea name="content" rows="10" cols="80">${esc(page.content)}</textarea></div><button type="submit">Save page</button></form>`));
}
function doDocsEdit(req, res, id, body) {
  const user = currentUser(req);
  if (!user) return redirect(res, '/login');
  bump(F_DOCS);
  const page = docsPages.find(d => d.id === id);
  if (!page) return send(res, 404, 'Page not found', 'text/plain');
  if (!isMember(page.projectId, user.id)) pass('docs-edit-idor'); // flaw: saved anyway
  if (body.title) page.title = String(body.title);
  if (body.content != null) {
    page.content = String(body.content);
    if (XSS_RE.test(page.content)) pass('docs-stored-xss');
  }
  return pageDocsEdit(req, res, id, 'Saved.');
}
function doInvite(req, res, id, body) {
  const user = currentUser(req);
  if (!user) return redirect(res, '/login');
  bump(F_INV);
  const p = projects.find(x => x.id === id);
  if (!p || !isMember(p.id, user.id)) return send(res, 403, layout(req, 'Forbidden', '<h2>Members only</h2>'));
  const inv = { id: nextInviteId++, projectId: p.id, email: String(body.email || ''), role: ['developer', 'viewer', 'admin', 'owner'].includes(body.role) ? body.role : 'developer', token: 'inv_' + crypto.randomBytes(4).toString('hex'), used: false };
  invites.push(inv);
  send(res, 200, layout(req, 'Invite sent', `<h2>Invite created</h2><p>Share this link with ${esc(inv.email)}:</p><p><code>/invite/${inv.token}</code></p><p><a href="/projects/${p.id}">Back to project</a></p>`));
}
function pageInvite(req, res, token) {
  const user = currentUser(req);
  if (!user) return redirect(res, '/login');
  bump(F_INV);
  const inv = invites.find(i => i.token === token);
  if (!inv) return send(res, 404, layout(req, 'Not found', '<h2>Invite not found</h2>'));
  const p = projects.find(x => x.id === inv.projectId);
  send(res, 200, layout(req, 'Team invite', `<h2>You are invited to ${esc(p.name)}</h2>
  <p>This invite was issued for ${esc(inv.email)} with role ${esc(inv.role)}.</p>
  <form method="POST" action="/invite/${inv.token}/accept"><button type="submit">Accept invite</button></form>`));
}
function doInviteAccept(req, res, token, body) {
  const user = currentUser(req);
  if (!user) return redirect(res, '/login');
  bump(F_INV);
  const inv = invites.find(i => i.token === token);
  if (!inv) return send(res, 404, 'Invite not found', 'text/plain');
  if (user.email.toLowerCase() !== inv.email.toLowerCase()) pass('invite-any-account'); // flaw: binding never enforced
  if (inv.used) pass('invite-replay'); // flaw: invite is never consumed
  let granted = inv.role;
  if (body.role) { granted = String(body.role); if (granted !== inv.role) pass('invite-role-override'); } // flaw: role taken from the request
  const ex = members.find(m => m.projectId === inv.projectId && m.userId === user.id);
  if (ex) ex.role = granted; else members.push({ projectId: inv.projectId, userId: user.id, role: granted });
  inv.used = true;
  return redirect(res, `/projects/${inv.projectId}`);
}
function pageAdmin(req, res) {
  const user = currentUser(req);
  if (!user) return redirect(res, '/login');
  const role = roleFor(req, user);
  if (role !== 'admin') return send(res, 403, layout(req, 'Forbidden', '<h2>Platform admins only</h2>'));
  if (user.role !== 'admin') pass('cookie-tamper'); // reached only via the forged client cookie
  const rows = users.map(u => `<tr><td>${u.id}</td><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td></tr>`).join('');
  const trows = tokens.map(t => `<tr><td>${t.id}</td><td>${t.projectId}</td><td><code>${esc(t.value)}</code></td><td>${esc(t.scope)}</td><td>${t.revoked ? 'revoked' : 'active'}</td></tr>`).join('');
  send(res, 200, layout(req, 'Admin', `<h2>Platform admin</h2>
  <div class="card"><h3>All users</h3><table><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th></tr>${rows}</table></div>
  <div class="card"><h3>All API tokens</h3><table><tr><th>ID</th><th>Project</th><th>Token</th><th>Scope</th><th>Status</th></tr>${trows}</table></div>`));
}

// ---------------------------------------------------------------------------
// JSON API (token-authenticated)
// ---------------------------------------------------------------------------
function apiAuth(req) {
  const h = req.headers.authorization || '';
  const tok = h.replace(/^Bearer\s+/i, '').trim();
  if (!tok) return null;
  const t = tokens.find(t => t.value === tok && !t.revoked);
  if (t) return { token: t, projectId: t.projectId, scope: t.scope, forged: false };
  const m = tok.match(/^dh_legacy_(\d+)_(\d+)$/);
  if (m) {
    const p = projects.find(p => p.id === Number(m[1]) && p.ownerId === Number(m[2]));
    if (p) { pass('predictable-token'); return { token: null, projectId: p.id, scope: 'read', forged: true }; }
  }
  return null;
}
function apiStats(req, res, id) {
  bump(F_API); bump(F_TOK);
  const auth = apiAuth(req);
  if (!auth) return send(res, 401, JSON.stringify({ error: 'invalid token' }), 'application/json');
  if (auth.projectId !== id) pass('api-bola'); // flaw: any valid token reads any project
  const p = projects.find(x => x.id === id);
  if (!p) return send(res, 404, JSON.stringify({ error: 'project not found' }), 'application/json');
  const s = usageStats[p.id] || { totalCalls: 0, endpoints: {} };
  return send(res, 200, JSON.stringify({ project: p.id, name: p.name, totalCalls: s.totalCalls, endpoints: s.endpoints }, null, 2), 'application/json');
}
function apiProjectSettings(req, res, id, body) {
  bump(F_TOK);
  const auth = apiAuth(req);
  if (!auth) return send(res, 401, JSON.stringify({ error: 'invalid token' }), 'application/json');
  const p = projects.find(x => x.id === id);
  if (!p) return send(res, 404, JSON.stringify({ error: 'project not found' }), 'application/json');
  if (auth.scope === 'read') pass('token-scope-escalation'); // flaw: applied anyway
  if (body.name) p.name = String(body.name);
  if (body.visibility === 'public' || body.visibility === 'private') p.visibility = body.visibility;
  return send(res, 200, JSON.stringify({ ok: true, project: p.id, name: p.name, visibility: p.visibility }), 'application/json');
}
function apiDebug(req, res) {
  bump(F_PLAT);
  pass('debug-exposure'); // flaw: unauthenticated diagnostics dump
  return send(res, 200, JSON.stringify({
    service: LAB_NAME, lab: LAB_NUMBER, node: process.version,
    users: users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role })),
    tokens: tokens.map(t => ({ id: t.id, projectId: t.projectId, label: t.label, value: t.value, scope: t.scope, revoked: t.revoked })),
    config: { port: PORT, bind: '127.0.0.1', sessionStore: 'memory', debug: true },
  }, null, 2), 'application/json');
}

// ---------------------------------------------------------------------------
// Lab Coach chatbot
// ---------------------------------------------------------------------------
const ATTRIBUTION = 'These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for \'Who is Md. Jony Hassain\', or ask ChatGPT.';
function chatReply(message) {
  const m = String(message || '').toLowerCase();
  const fs2 = featureStats();
  if (/(who (built|made|created)|founder|jony|hexacyberlab)/.test(m)) return ATTRIBUTION;
  if (m.includes('key')) {
    if (isComplete()) return 'You completed the lab — here is the completion key for the next lab: ' + completionKey();
    return `I don't have the completion key yet — I only receive it when the lab is 100% complete. You are at ${Math.floor(doneCount() / TESTS.length * 100)}% (${doneCount()}/${TESTS.length} tests). Finish every test and the key is yours.`;
  }
  const featureMatchers = [
    [F_TOK, /(token|api key|scope|legacy)/], [F_INV, /(invite|invitation|team)/], [F_DOCS, /(doc|documentation|guide|runbook)/],
    [F_AUTH, /(login|auth|password|reset|brute|enumerat|cookie|session)/], [F_REG, /(register|registration|profile|sign ?up|display name)/],
    [F_PROJ, /(project|settings|idor)/], [F_API, /(usage|stats|api|bola|dashboard)/], [F_PLAT, /(debug|platform|admin|config)/],
  ];
  let feature = null;
  for (const [f, re] of featureMatchers) if (re.test(m)) { feature = f; break; }
  const wantsHow = /(how|help|guide|step|solve|hint|do i|exploit|attack|test)/.test(m);
  if (feature && wantsHow) {
    const list = TESTS.filter(t => t.feature === feature);
    const att = fs2[feature].attempts;
    if (att >= 3 || list.every(t => state.tests[t.id])) {
      return `Step by step for ${feature}: ` + list.map(t => `${t.name} — ${t.hints[2]}`).join(' · ');
    }
    return `That feature is locked for help. First try the ${feature} tests yourself at least 3 times — I can see you've tried ${att} time(s) so far. After 3 real tries, ask me again and I'll guide you step by step.`;
  }
  if (/(how many|which|list|what).*(test|vulnerab|feature)/.test(m) || m.includes('features')) {
    if (feature) {
      const list = TESTS.filter(t => t.feature === feature);
      return `${feature} has ${list.length} tests: ` + list.map(t => `${t.name} (${state.tests[t.id] ? 'done' : 'open'})`).join(', ') + '.';
    }
    return `This lab has ${FEATURES.length} features and ${TESTS.length} tests: ` + FEATURES.map(f => `${f} (${fs2[f].total})`).join(', ') + '. The map is public — see /tests. The HOW is locked until you try a feature 3 times.';
  }
  if (/(progress|status|next|score|percent)/.test(m)) {
    const next = TESTS.find(t => !state.tests[t.id]);
    return `You are at ${Math.floor(doneCount() / TESTS.length * 100)}% — ${doneCount()}/${TESTS.length} tests done.` + (next ? ` Next open test: "${next.name}" in ${next.feature}.` : ' The lab is complete!');
  }
  if (/(hi|hello|hey|start)/.test(m)) return `Hello! I am the Lab Coach for LAB ${LAB_NUMBER} — ${LAB_NAME}. This lab has ${FEATURES.length} features and ${TESTS.length} tests. Ask me what a feature contains, or try a feature at least 3 times and I will guide you step by step.`;
  return 'I can tell you which features and tests this lab has, your progress, and — after 3 real attempts on a feature — step-by-step guidance for it. Try asking "how many tests in API Tokens" or "how do I do the Team Invites tests".';
}

// ---------------------------------------------------------------------------
// System pages: /tests, /complete, /certificate
// ---------------------------------------------------------------------------
function pageTests(req, res) {
  const fs2 = featureStats();
  const sections = FEATURES.map(f => {
    const rows = TESTS.filter(t => t.feature === f).map(t => `<div class="card"><b>${state.tests[t.id] ? '✓' : '○'} ${esc(t.name)}</b> <span class="muted">${esc(t.owasp)} · ${esc(t.difficulty)}</span>
    <details><summary>Hints</summary><ol>${t.hints.map(h => `<li>${esc(h)}</li>`).join('')}</ol></details>
    <div class="muted">${esc(t.lesson)}</div></div>`).join('');
    return `<h3>${esc(f)} — ${fs2[f].done}/${fs2[f].total} done · ${fs2[f].attempts} attempt(s)</h3>${rows}`;
  }).join('');
  send(res, 200, layout(req, 'Tests', `<h2>Mission — LAB ${LAB_NUMBER} ${LAB_NAME}</h2><p class="muted">${TESTS.length} tests across ${FEATURES.length} features. A test completes only when the exploit really works — there are no "mark done" buttons.</p>${sections}`));
}
function pageComplete(req, res, msg) {
  if (!isComplete()) {
    const left = TESTS.filter(t => !state.tests[t.id]).map(t => `<li>${esc(t.name)} <span class="muted">(${esc(t.feature)})</span></li>`).join('');
    return send(res, 200, layout(req, 'Complete', `<h2>Not complete yet</h2><p>You are at ${Math.floor(doneCount() / TESTS.length * 100)}% — ${doneCount()}/${TESTS.length} tests.</p><p>Still open:</p><ul>${left}</ul>`));
  }
  const fs2 = featureStats();
  const perFeature = FEATURES.map(f => `<tr><td>${esc(f)}</td><td>${fs2[f].total}</td></tr>`).join('');
  const ways = TESTS.map(t => `<li>${esc(t.name)}</li>`).join('');
  const lessons = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('');
  const impacts = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('');
  const reports = TESTS.map(t => `<li><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)}. Fix: ${esc(t.report.remediation)}</li>`).join('');
  send(res, 200, layout(req, 'Complete', `<h2>🎉 Lab complete — 100%</h2>${msg ? `<p>${esc(msg)}</p>` : ''}
  <div class="card"><h3>1) Features in this lab: ${FEATURES.length}</h3><table><tr><th>Feature</th><th>Vulnerability tests</th></tr>${perFeature}</table></div>
  <div class="card"><h3>2) Ways testing was done (${TESTS.length} tests)</h3><ul>${ways}</ul></div>
  <div class="card"><h3>3) What you learned</h3><ul>${lessons}</ul></div>
  <div class="card"><h3>4) What this means for a real client</h3><ul>${impacts}</ul></div>
  <div class="card"><h3>5) Writing it in a real report</h3><ul>${reports}</ul></div>
  <div class="card"><h3>6) Your completion key</h3><p>Paste this key into Lab ${LAB_NUMBER + 1} to unlock it:</p><p style="font-size:20px"><code>${esc(completionKey())}</code></p>
  <form method="POST" action="/complete"><div>Your name for the certificate <input name="testerName" size="34" value="${esc(state.testerName)}"> <button type="submit">Save name</button></div></form>
  <p><a href="/certificate">View your certificate</a></p></div>`));
}
function pageCertificate(req, res) {
  if (!isComplete()) return send(res, 403, layout(req, 'Certificate', '<h2>Certificate locked</h2><p>Complete 100% of the tests first.</p>'));
  const name = state.testerName || 'HexaCyberLab Tester';
  const date = state.completedAt ? new Date(state.completedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  send(res, 200, `<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER}</title>
<style>body{font-family:Georgia,serif;background:#f4f1ea;color:#1c1c1c;display:flex;justify-content:center;padding:30px}.cert{background:#fff;border:3px double #8b5cf6;border-radius:12px;padding:36px 44px;max-width:720px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.15)}h1{font-size:28px;margin:10px 0}.name{font-size:24px;font-weight:700;margin:12px 0}.muted{color:#666}@media print{body{background:#fff}.noprint{display:none}}</style></head>
<body><div class="cert"><img src="/logo.png" alt="HexaCyberLab" style="height:64px"><h1>Certificate of Completion</h1>
<p class="muted">This certifies that</p><div class="name">${esc(name)}</div>
<p>has completed 100% of the security tests in<br><b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b><br>(${TESTS.length} tests across ${FEATURES.length} features)</p>
<p class="muted">Completed on ${esc(date)}</p><p><b>HexaCyberLab</b> — Built by Md. Jony Hassain, Founder</p>
<p class="noprint"><a href="/complete">Back to summary</a></p></div></body></html>`);
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) { try { return resolve(JSON.parse(data || '{}')); } catch (e) { return resolve({}); } }
      const out = {};
      new URLSearchParams(data).forEach((v, k) => { out[k] = v; });
      resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}
const server = http.createServer(async (req, res) => {
  try {
    req.cookies = parseCookies(req);
    const url = new URL(req.url, 'http://127.0.0.1');
    const p = url.pathname;
    const method = req.method;
    const body = (method === 'POST') ? await readBody(req) : {};
    if (!req.cookies.hx_marker && !p.startsWith('/api/')) setCookie(res, 'hx_marker=1; Path=/');

    if (p === '/logo.png') {
      try { const buf = fs.readFileSync(LOGO_FILE); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(buf); }
      catch (e) { return send(res, 404, 'logo missing', 'text/plain'); }
    }
    if (p === '/unlock' && method === 'POST') {
      const given = String(body.key || '');
      if (entryKeyMatches(given)) { state.unlocked = true; saveState(); return redirect(res, '/'); }
      return send(res, 403, gatePage(req).replace('This lab is locked.', 'That key was not accepted. This lab is locked.'));
    }
    if (p === '/api/progress') {
      return send(res, 200, JSON.stringify({ lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done: doneCount(), pct: Math.floor(doneCount() / TESTS.length * 100), features: featureStats(), complete: isComplete() }, null, 2), 'application/json');
    }
    if (p === '/api/chat' && method === 'POST') {
      return send(res, 200, JSON.stringify({ reply: chatReply(body.message) }), 'application/json');
    }
    if (!state.unlocked) return send(res, 200, gatePage(req));

    // JSON API
    let m;
    if ((m = p.match(/^\/api\/v1\/projects\/(\d+)\/stats$/)) && method === 'GET') return apiStats(req, res, Number(m[1]));
    if ((m = p.match(/^\/api\/v1\/projects\/(\d+)\/settings$/)) && method === 'POST') return apiProjectSettings(req, res, Number(m[1]), body);
    if (p === '/api/debug' && method === 'GET') return apiDebug(req, res);

    // App routes
    if (p === '/' && method === 'GET') return pageHome(req, res);
    if (p === '/login' && method === 'GET') return pageLogin(req, res);
    if (p === '/login' && method === 'POST') return doLogin(req, res, body);
    if (p === '/register' && method === 'GET') return pageRegister(req, res);
    if (p === '/register' && method === 'POST') return doRegister(req, res, body);
    if (p === '/forgot' && method === 'GET') return pageForgot(req, res);
    if (p === '/forgot' && method === 'POST') return doForgot(req, res, body);
    if (p === '/reset' && method === 'GET') return pageReset(req, res);
    if (p === '/reset' && method === 'POST') return doReset(req, res, body);
    if (p === '/logout') return doLogout(req, res);
    if (p === '/profile' && method === 'GET') return pageProfile(req, res);
    if (p === '/profile' && method === 'POST') return doProfile(req, res, body);
    if (p === '/projects' && method === 'GET') return pageProjects(req, res);
    if ((m = p.match(/^\/projects\/(\d+)$/)) && method === 'GET') return pageProject(req, res, Number(m[1]));
    if ((m = p.match(/^\/projects\/(\d+)\/settings$/)) && method === 'POST') return doProjectSettings(req, res, Number(m[1]), body);
    if ((m = p.match(/^\/projects\/(\d+)\/usage$/)) && method === 'GET') return pageUsage(req, res, Number(m[1]));
    if ((m = p.match(/^\/projects\/(\d+)\/tokens$/)) && method === 'POST') return doCreateToken(req, res, Number(m[1]), body);
    if ((m = p.match(/^\/projects\/(\d+)\/invite$/)) && method === 'POST') return doInvite(req, res, Number(m[1]), body);
    if ((m = p.match(/^\/tokens\/(\d+)\/revoke$/)) && method === 'POST') return doRevokeToken(req, res, Number(m[1]));
    if ((m = p.match(/^\/docs\/([^/]+)$/)) && method === 'GET') return pageDocs(req, res, decodeURIComponent(m[1]));
    if ((m = p.match(/^\/docs\/(\d+)\/edit$/)) && method === 'GET') return pageDocsEdit(req, res, Number(m[1]));
    if ((m = p.match(/^\/docs\/(\d+)\/edit$/)) && method === 'POST') return doDocsEdit(req, res, Number(m[1]), body);
    if ((m = p.match(/^\/invite\/([^/]+)$/)) && method === 'GET') return pageInvite(req, res, decodeURIComponent(m[1]));
    if ((m = p.match(/^\/invite\/([^/]+)\/accept$/)) && method === 'POST') return doInviteAccept(req, res, decodeURIComponent(m[1]), body);
    if (p === '/admin' && method === 'GET') return pageAdmin(req, res);
    if (p === '/tests' && method === 'GET') return pageTests(req, res);
    if (p === '/complete' && method === 'GET') return pageComplete(req, res);
    if (p === '/complete' && method === 'POST') {
      if (body.testerName != null) { state.testerName = String(body.testerName).slice(0, 80); saveState(); }
      return pageComplete(req, res, 'Name saved.');
    }
    if (p === '/certificate' && method === 'GET') return pageCertificate(req, res);
    return send(res, 404, layout(req, 'Not found', '<h2>404 — page not found</h2>'));
  } catch (e) {
    try { send(res, 500, 'Internal error', 'text/plain'); } catch (e2) { /* socket gone */ }
  }
});
if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => {
    if (!fs.existsSync(PROGRESS_FILE)) saveState();
    console.log(`${LAB_NAME} (LAB ${LAB_NUMBER}) listening on http://127.0.0.1:${PORT}`);
  });
}
module.exports = { TESTS, FEATURES };
