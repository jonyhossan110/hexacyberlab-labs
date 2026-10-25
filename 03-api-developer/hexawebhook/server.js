'use strict';
/* =====================================================================
   HexaWebhook — LAB 26 of 110 (Category 3: API & Developer Platforms)
   A webhook delivery service: projects, endpoints, event subscriptions,
   delivery attempts with retries, delivery logs and signing secrets.
   INTENTIONALLY VULNERABLE — local-only training lab. Zero dependencies.
   Bind: 127.0.0.1:3035. Built by Md. Jony Hassain, Founder, HexaCyberLab.
   ===================================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3035;
const LAB_NUMBER = 26;
const LAB_NAME = 'HexaWebhook';
const ROOT = __dirname;
const PROGRESS_FILE = path.join(ROOT, 'progress.json');

/* ---------- key engine (see ENGINE SPEC §7) ----------
   Keys are stored ONLY as encoded shards scattered across this file.
   Each shard is base64 of a reversed piece of the key. The assembler
   below reconstructs a key at runtime; the plain value never appears
   in this file, in the docs, or in any response before its reveal. */

function assembleKey(shards) {
  return shards.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}
const ENTRY_KEY_SHA256 = '957e48a5b416288be084a5be655a53b4d1b35f8fb3e7e19fa4935f5dd5a16253';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */

/* =====================================================================
   TESTS REGISTRY (ENGINE SPEC §3) — 26 scored tests, 8 features.
   A test passes ONLY when the server observes the real exploit effect
   inside the vulnerable flow (see pass() hooks in the routes below).
   ===================================================================== */
const TESTS = [
  /* ---------------- Login & Authentication ---------------- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL injection login bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login form builds its user lookup by gluing your input straight into a query string.', "Try a classic comment-out in the email field, e.g. an address followed by ' -- .", "Or put ' OR '1'='1 in the password field together with any real account email."],
    lesson: 'String-built queries let attacker input change the meaning of the query itself — here it turns a login check into an open door.',
    impact: 'On a real client site this is full account takeover with no password at all — including the admin account — from a single login form.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere and never concatenate user input into SQL.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute force — no rate limit or lockout', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Pick one real account and keep guessing wrong passwords.', 'Notice the login never slows down, never CAPTCHAs and never locks — count your failures.', 'The test flips when the 10th failed attempt for one account is still processed normally.'],
    lesson: 'Without throttling or lockout, an attacker can try millions of passwords against one account at full speed.',
    impact: 'Weak or reused passwords fall quickly; for a client this means credential-stuffing and password-spraying attacks succeed unnoticed.',
    report: { title: 'No Rate Limiting or Account Lockout on Login', severity: 'High', remediation: 'Add progressive delays, per-account and per-IP rate limits, lockout/backoff and breached-password checks.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User enumeration via different error messages', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the login error for an email that exists with one that does not.', 'The forgot-password form answers differently too.', 'The test flips once the server has given both kinds of answer to the same visitor.'],
    lesson: 'Distinct "no such account" vs "wrong password" answers hand attackers a free list of valid accounts to target.',
    impact: 'Attackers confirm which customer emails are registered, then focus phishing and password attacks only on real accounts.',
    report: { title: 'User Enumeration via Authentication Error Messages', severity: 'Medium', remediation: 'Return one generic message ("invalid credentials") for every failed login and reset request.' } },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Default demo credentials still active', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Seed/demo accounts are a classic leftover — think demo@… with the obvious password.', 'The account list in the README names the demo account.', 'Try demo@hexawebhook.local with password "demo".'],
    lesson: 'Shipped or seeded accounts with known passwords are the first thing attackers try on any new deployment.',
    impact: 'A client who forgets one seeded account gives attackers a working login on day one — no exploit needed.',
    report: { title: 'Default/Seeded Credentials Active in Production', severity: 'High', remediation: 'Remove seeded accounts before launch and force unique credentials during installation.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable password-reset token', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a reset for one account and look at the shape of the token you are issued.', 'Tokens are derived from something public about the account — its numeric id.', 'Compute the token for a DIFFERENT account (id × 7919, mod 100000) and use it without ever requesting a reset for them.'],
    lesson: 'Reset tokens must be unguessable random values; a token derived from a public id can be forged for any account.',
    impact: 'Anyone can reset the password of any customer — including admins — knowing only their email address.',
    report: { title: 'Predictable Password Reset Token Allows Account Takeover', severity: 'Critical', remediation: 'Generate reset tokens with a CSPRNG (≥128 bit), store only a hash, expire them quickly and make them single-use.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Role cookie tampering', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The admin gate trusts more than the server-side session.', 'Inspect the cookies the app uses and try adding one that claims a role.', 'Set a cookie named hx_role to the value admin, then visit /admin as a normal member.'],
    lesson: 'Any authorization decision taken from client-supplied data (cookies, hidden fields) can be forged by the client.',
    impact: 'Every regular customer can promote themselves to admin — support tools, user lists and settings all fall at once.',
    report: { title: 'Authorization Based on Client-Supplied Role Cookie', severity: 'Critical', remediation: 'Derive roles only from the server-side session record; never trust role claims sent by the browser.' } },

  /* ---------------- Registration & Profile ---------------- */
  { id: 'reg-mass', feature: 'Registration & Profile', name: 'Mass assignment — self-register as admin', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The register form only shows name, email and password — the server may accept more fields than the form shows.', 'Add an extra form field that a profile normally carries but users should never set themselves.', 'POST /register with role=admin added to the form body.'],
    lesson: 'Binding the whole request body to the user object lets attackers set privileged fields the UI never offered.',
    impact: 'Attackers mint their own admin accounts on a client site — full control without touching anyone else’s credentials.',
    report: { title: 'Mass Assignment in Registration Allows Admin Self-Creation', severity: 'Critical', remediation: 'Whitelist assignable fields on registration and set role/tier server-side only.' } },
  { id: 'reg-weakpw', feature: 'Registration & Profile', name: 'Weak password policy (1 character accepted)', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a fresh account and see how short a password the server accepts.', 'There is effectively no minimum length or complexity check.', 'A one-character password such as "a" is accepted.'],
    lesson: 'Password policy is enforced on the server or it is not enforced at all — client-side hints do nothing.',
    impact: 'Customers pick trivial passwords that fall to the first brute-force run, and the client owns the resulting breach.',
    report: { title: 'Missing Password Complexity Policy', severity: 'Medium', remediation: 'Enforce a minimum length (≥10) and check new passwords against known-breached lists.' } },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in display name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is shown to other people — including admins in the user list.', 'Register with a name that is not just text.', 'Use a name like <script>alert(1)</script> and watch it stored and rendered raw.'],
    lesson: 'Data stored from users must be output-encoded everywhere it is rendered — one raw render is enough.',
    impact: 'Attackers run JavaScript in the browsers of a client’s staff — session theft and actions performed as the victim follow.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-encode all user data on output and add a strict Content-Security-Policy.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on profile update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The profile form changes your display name with a plain POST and no anti-CSRF token.', 'The app marks its own forms with a hidden hx_marker field — a forged request will not have a valid one.', 'Send the profile POST from a cross-site Origin (or without the marker) and watch the name change anyway.'],
    lesson: 'State-changing requests need an unguessable token; cookies alone ride along with forged cross-site requests.',
    impact: 'A malicious page a customer visits can silently rewrite their profile — and on richer apps, change email or password.',
    report: { title: 'Cross-Site Request Forgery on Profile Update', severity: 'Medium', remediation: 'Require per-session CSRF tokens on every state-changing form and verify Origin/Referer as defence in depth.' } },

  /* ---------------- Projects ---------------- */
  { id: 'proj-idor', feature: 'Projects', name: 'Project IDOR — read another team’s project', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Project pages live at predictable numeric URLs like /projects/1.', 'Log in as one user and open a project id that belongs to someone else.', 'Sara opening project 1 (owned by Dev) is enough — the server never checks ownership.'],
    lesson: 'Every object access must check that the object belongs to the caller; hiding links is not authorization.',
    impact: 'Customers read each other’s projects — endpoints, event data and business structure leak to any signed-in user.',
    report: { title: 'Insecure Direct Object Reference on Project Pages', severity: 'High', remediation: 'Check ownership (or team membership) on every object read and write, server-side.' } },
  { id: 'proj-write', feature: 'Projects', name: 'Project IDOR — edit another team’s project', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Reading a foreign project works — try changing it.', 'POST the project update form for a project id you do not own.', 'The update is applied with no ownership check at all.'],
    lesson: 'Write paths need the same ownership checks as reads; a read-only IDOR is often a write IDOR too.',
    impact: 'Attackers tamper with a competitor’s configuration — rename, re-describe or sabotage their integration from inside.',
    report: { title: 'Missing Authorization on Project Update (Write IDOR)', severity: 'High', remediation: 'Enforce ownership checks on update/delete handlers exactly as on reads.' } },

  /* ---------------- Endpoints & SSRF ---------------- */
  { id: 'ssrf-internal', feature: 'Endpoints & SSRF', name: 'SSRF — endpoint URL reaches the internal service', owasp: 'A10:2021 Server-Side Request Forgery', difficulty: 'Advanced',
    hints: ['The delivery engine fetches whatever URL an endpoint is configured with — no allowlist, no private-IP block.', 'The app itself has an /internal/metrics service that refuses direct browser visits.', 'Point one of YOUR endpoints at http://127.0.0.1:3035/internal/metrics and send a test event — then read the delivery log.'],
    lesson: 'Server-side fetching of user-controlled URLs must validate destinations, or the server becomes a proxy into the internal network.',
    impact: 'Attackers use a client’s own server to scan and read internal services that were never meant to be internet-facing.',
    report: { title: 'Server-Side Request Forgery via Endpoint URL', severity: 'Critical', remediation: 'Allowlist destination hosts, block private/reserved IP ranges, resolve DNS before connecting and re-check redirects.' } },
  { id: 'ssrf-metadata', feature: 'Endpoints & SSRF', name: 'SSRF — cloud metadata endpoint', owasp: 'A10:2021 Server-Side Request Forgery', difficulty: 'Advanced',
    hints: ['The classic SSRF target is the cloud metadata address 169.254.169.254.', 'The dispatcher does not block link-local addresses either.', 'Set an endpoint URL to http://169.254.169.254/latest/meta-data/iam and fire a test event; the "response" lands in your delivery log.'],
    lesson: 'Cloud metadata services hand out live credentials to anything that can ask — SSRF turns that into full cloud compromise.',
    impact: 'Stolen cloud keys mean attackers own the client’s infrastructure, data and billing — the most expensive SSRF outcome there is.',
    report: { title: 'SSRF to Cloud Metadata Service Exposes Credentials', severity: 'Critical', remediation: 'Block 169.254.169.254 and all link-local ranges at the fetcher, and require IMDSv2-style protections in deployment.' } },
  { id: 'ep-idor', feature: 'Endpoints & SSRF', name: 'Endpoint IDOR — view another project’s endpoint & signing secret', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Endpoint pages show everything about an endpoint — including its signing secret.', 'Endpoints have small numeric ids; open one that belongs to another project.', 'GET /endpoints/1 while logged in as Sara (project 2) — no ownership check stands in the way.'],
    lesson: 'Secrets displayed on object pages inherit the object’s authorization bugs — an IDOR here leaks cryptographic keys, not just data.',
    impact: 'A leaked signing secret lets attackers forge perfectly-signed fake events into the victim’s systems.',
    report: { title: 'Endpoint Details (incl. Signing Secret) Exposed via IDOR', severity: 'High', remediation: 'Check project ownership before rendering endpoint details and mask secrets by default.' } },
  { id: 'ep-secret-api', feature: 'Endpoints & SSRF', name: 'Signing secret exposed by unauthenticated API', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['There is a JSON API for endpoints under /api/endpoints/<id>.', 'Try it with no session cookie and no API token at all.', 'The response includes the full endpoint record — signing_secret included.'],
    lesson: 'API routes are part of the attack surface: a forgotten auth check on one route undoes every control on the web pages.',
    impact: 'Anyone on the internet can harvest signing secrets and forge webhooks into every customer of the service.',
    report: { title: 'Unauthenticated API Returns Endpoint Signing Secrets', severity: 'Critical', remediation: 'Require authentication on every API route and exclude secret fields from API responses.' } },

  /* ---------------- Subscriptions ---------------- */
  { id: 'sub-tamper', feature: 'Subscriptions', name: 'Subscription tampering on another team’s endpoint', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['An endpoint’s event subscriptions can be replaced with a single POST.', 'The handler never asks whether the endpoint is yours.', 'POST /endpoints/1/subscriptions as a different user and change which events Dev receives.'],
    lesson: 'Configuration writes are state changes like any other — they need ownership checks, not just a login.',
    impact: 'Attackers silently unsubscribe a victim from payment events (or flood them) — business processes break with no visible break-in.',
    report: { title: 'Missing Authorization on Subscription Update', severity: 'High', remediation: 'Verify endpoint ownership in the subscription handler before applying changes.' } },
  { id: 'sub-wildcard', feature: 'Subscriptions', name: 'Wildcard / admin event subscription', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Subscriptions accept a free-text event list — nothing validates it against the events your plan may receive.', 'Platform-internal event types exist (they start with admin.).', 'Subscribe one of your endpoints to * or admin.audit and see it saved without complaint.'],
    lesson: 'Missing allowlist validation lets users opt into data streams that were never meant for customers.',
    impact: 'Customers receive internal audit/security events — a live feed of platform operations that should be private.',
    report: { title: 'No Allowlist on Subscribable Event Types', severity: 'Medium', remediation: 'Validate subscriptions against a per-plan allowlist and reject wildcards for non-admin accounts.' } },

  /* ---------------- Deliveries & Logs ---------------- */
  { id: 'dl-log-idor', feature: 'Deliveries & Logs', name: 'Delivery log IDOR — read another team’s payloads & responses', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Delivery detail pages contain the full event payload, the response body and the signature.', 'Deliveries have small sequential ids.', 'Open /deliveries/1 as a user who does not own that delivery’s project.'],
    lesson: 'Logs are sensitive data: payloads carry customer business data, and signatures/response bodies help forge or debug attacks.',
    impact: 'Competitors read a client’s live business events — orders, payments, customer records — straight from the log viewer.',
    report: { title: 'Insecure Direct Object Reference on Delivery Logs', severity: 'High', remediation: 'Scope every delivery read to projects the caller owns.' } },
  { id: 'dl-replay', feature: 'Deliveries & Logs', name: 'Replay another team’s delivery', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Each delivery has a Replay action that re-sends the event to the endpoint.', 'The replay handler does not check whose delivery it is.', 'POST /deliveries/1/replay while logged in as a different user — a new delivery is created.'],
    lesson: 'Actions on objects (not just views) need authorization; replay turns a read bug into an active one.',
    impact: 'Attackers re-fire a victim’s payment or fulfilment events, causing duplicate orders, refunds or shipments.',
    report: { title: 'Missing Authorization on Delivery Replay', severity: 'High', remediation: 'Check delivery ownership in the replay handler and log replays as auditable events.' } },
  { id: 'dl-export', feature: 'Deliveries & Logs', name: 'Log export leaks every team’s deliveries', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['There is a CSV export of delivery logs at /deliveries/export.csv.', 'It was written for admins but the route only asks for a login.', 'Download it as a normal member and count how many other teams’ deliveries are inside.'],
    lesson: 'Bulk exports multiply any scoping mistake — one route can leak the entire dataset instead of one record.',
    impact: 'One click downloads every customer’s event history — a reportable data breach from a single forgotten check.',
    report: { title: 'Delivery Log Export Not Scoped to Caller', severity: 'High', remediation: 'Scope exports to the caller’s projects and restrict bulk export to admins.' } },

  /* ---------------- Admin Panel ---------------- */
  { id: 'admin-api', feature: 'Admin Panel', name: 'Admin user API open to any logged-in user', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The admin console loads its user table from /admin/api/users.', 'The page is gated — the JSON behind it may not be.', 'Call /admin/api/users as a normal member: full user records, passwords and API tokens come back.'],
    lesson: 'Gating a page is not gating its data API; every backend route needs its own authorization check.',
    impact: 'Any customer can dump the whole user database — credential theft and total account compromise follow.',
    report: { title: 'Admin API Missing Authorization (Full User Dump)', severity: 'Critical', remediation: 'Enforce admin role checks on admin API routes and never return password fields.' } },
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'CSRF on admin user-disable action', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    hints: ['Admins can disable a user with a POST — and that form has no CSRF token either.', 'Reuse the profile-CSRF trick, but against /admin/users/<id>/disable while an admin session is active.', 'A cross-site Origin (or a missing hx_marker) plus an applied disable flips the test.'],
    lesson: 'CSRF on admin actions turns any page an admin browses into an attack on their own panel.',
    impact: 'An attacker who lures an admin to a crafted page can disable accounts — including other admins — without any password.',
    report: { title: 'Cross-Site Request Forgery on Admin User Management', severity: 'High', remediation: 'Add CSRF tokens to all admin actions and set SameSite=Lax or Strict on session cookies.' } },

  /* ---------------- Platform & API ---------------- */
  { id: 'api-token', feature: 'Platform & API', name: 'Predictable legacy API token (derived from email)', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Advanced',
    hints: ['The API accepts Bearer tokens. Real tokens look random and start with whk_live_.', 'A legacy token format is still accepted: the prefix wh_ followed by something derived from the account email.', 'Try Authorization: Bearer wh_ + base64(email) for a victim account against /api/projects.'],
    lesson: 'Backward-compatible weak auth schemes stay as strong as the weakest accepted format — derivation from public data is not a secret.',
    impact: 'Anyone who knows a customer’s email owns their API access — automate that and every account falls.',
    report: { title: 'API Accepts Predictable Token Derived from Email', severity: 'Critical', remediation: 'Retire the legacy token format; issue only high-entropy tokens and store them hashed.' } },
  { id: 'platform-debug', feature: 'Platform & API', name: 'Debug endpoint exposes users & secrets', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Developers love leaving a /debug page behind.', 'This one needs no login at all.', 'GET /debug returns configuration, user password hashes and every endpoint signing secret.'],
    lesson: 'Debug/diagnostic routes must never ship to production — they bundle every secret an attacker could want.',
    impact: 'A single unauthenticated request hands over credentials and signing keys for the entire platform.',
    report: { title: 'Exposed Debug Endpoint Leaks Credentials and Secrets', severity: 'Critical', remediation: 'Remove debug endpoints from production builds and gate diagnostics behind admin auth + IP allowlists.' } },
  { id: 'platform-headers', feature: 'Platform & API', name: 'Missing security headers', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Load any page while logged in and inspect the response headers.', 'There is no X-Frame-Options, no X-Content-Type-Options, no Content-Security-Policy anywhere.', 'The test flips the first time a page is served to a logged-in user with those headers missing.'],
    lesson: 'Baseline headers are cheap defence in depth — clickjacking and MIME-sniffing get harder for free.',
    impact: 'A client’s pages can be framed for clickjacking and sniffed as executable content — small gaps that chain into real attacks.',
    report: { title: 'Missing HTTP Security Headers', severity: 'Low', remediation: 'Set X-Frame-Options/frame-ancestors, X-Content-Type-Options: nosniff and a Content-Security-Policy on all responses.' } },
];
const TOTAL = TESTS.length;
const FEATURES = [...new Set(TESTS.map(t => t.feature))];

/* ---------------- progress engine (SPEC §4) ---------------- */
let progress = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
try {
  if (fs.existsSync(PROGRESS_FILE)) progress = Object.assign(progress, JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')));
} catch (e) { /* corrupted state file: start fresh, never crash */ }
function saveProgress() { try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 1)); } catch (e) {} }
function pass(id) {
  if (!TESTS.some(t => t.id === id)) return;
  if (!progress.tests[id]) {
    progress.tests[id] = true;
    if (doneCount() === TOTAL) {
      progress.completedAt = new Date().toISOString();
      progress.keyRevealed = true;
    }
    saveProgress();
  }
}
function attempt(feature) {
  progress.attempts[feature] = (progress.attempts[feature] || 0) + 1;
  saveProgress();
}
function doneCount() { return TESTS.filter(t => progress.tests[t.id]).length; }
function pct() { return Math.floor(doneCount() / TOTAL * 100); }
function isComplete() { return doneCount() === TOTAL; }

/* =====================================================================
   SEED DATA — a small but complete webhook business.
   Passwords are stored in plaintext ON PURPOSE (training lab; several
   findings are about exactly this kind of exposure).
   ===================================================================== */
const users = [
  { id: 1, name: 'Hook Admin', email: 'admin@hexawebhook.local', password: 'admin123', role: 'admin', apiToken: 'whk_live_9f2c41aa07d34be5', disabled: false },
  { id: 2, name: 'Dev Patel', email: 'dev@hexawebhook.local', password: 'dev123', role: 'member', apiToken: 'whk_live_51bd90c2e77a4f10', disabled: false },
  { id: 3, name: 'Sara Khan', email: 'sara@hexawebhook.local', password: 'sara123', role: 'member', apiToken: 'whk_live_c804de19a3b64d72', disabled: false },
  { id: 4, name: 'Demo User', email: 'demo@hexawebhook.local', password: 'demo', role: 'member', apiToken: 'whk_live_77aa10bc93e04e55', disabled: false },
];
let nextUserId = 5;
const projects = [
  { id: 1, ownerId: 2, name: 'Acme Billing', description: 'Payment webhooks for the Acme invoicing product.', created: '2026-09-02' },
  { id: 2, ownerId: 3, name: 'ShopFront', description: 'Storefront events for the ShopFront e-commerce store.', created: '2026-09-19' },
];
let nextProjectId = 3;
const endpoints = [
  { id: 1, projectId: 1, name: 'Billing production', url: 'https://hooks.acme.example/billing', secret: 'whsec_4f8c2a91bd704e63a5d1', events: ['invoice.paid', 'invoice.failed'], active: true },
  { id: 2, projectId: 1, name: 'Orders staging', url: 'https://hooks.acme.example/orders', secret: 'whsec_91e07b3cda524f8ab602', events: ['order.shipped'], active: true },
  { id: 3, projectId: 2, name: 'Storefront hook', url: 'https://api.shopfront.example/hooks', secret: 'whsec_6bd3310fae8c49d7b955', events: ['user.created'], active: true },
];
let nextEndpointId = 4;
const deliveries = [
  { id: 1, endpointId: 1, event: 'invoice.paid', payload: '{"id":"inv_9042","amount":12900,"currency":"USD","customer":"cust_881"}', status: 'delivered', code: 200, body: 'OK — endpoint acknowledged (simulated)', signature: '', attempts: 1, at: '2026-10-21 09:14' },
  { id: 2, endpointId: 3, event: 'user.created', payload: '{"id":"user_5521","email":"buyer@example.com","plan":"free"}', status: 'delivered', code: 200, body: 'OK — endpoint acknowledged (simulated)', signature: '', attempts: 1, at: '2026-10-21 11:02' },
  { id: 3, endpointId: 2, event: 'order.shipped', payload: '{"id":"ord_3310","carrier":"DHL","tracking":"841220"}', status: 'failed', code: 500, body: 'Internal Server Error (simulated receiver)', signature: '', attempts: 3, at: '2026-10-21 12:47' },
];
let nextDeliveryId = 4;
for (const d of deliveries) {
  const ep = endpoints.find(e => e.id === d.endpointId);
  d.signature = crypto.createHash('sha256').update(ep.secret + '.' + d.payload).digest('hex');
}
const issuedResetTokens = new Set();       // "userId:token" pairs actually emailed
const failCount = {};                        // email -> consecutive failures (brute force)
const enumSeen = {};                         // ip -> Set of login outcomes ('nouser'|'wrongpass')
const sessions = new Map();                  // sid -> userId

/* ---------------- helpers ---------------- */
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}
function currentUser(req) {
  const c = parseCookies(req);
  const uid = sessions.get(c.hxwh_sid);
  return users.find(u => u.id === uid && !u.disabled) || null;
}
function newSession(res, userId) {
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, userId);
  res.setHeader('Set-Cookie', [
    'hxwh_sid=' + sid + '; Path=/; HttpOnly',
    'hx_origin=ok; Path=/',   // benign app marker: its absence on a state change evidences CSRF
  ]);
}
function isCsrf(req, form) {
  const origin = req.headers.origin || req.headers.referer || '';
  if (origin && !origin.includes('127.0.0.1:' + PORT) && !origin.includes('localhost:' + PORT)) return true;
  return form.hx_marker !== 'ok';
}
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', ch => { data += ch; if (data.length > 2e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) { try { return resolve(JSON.parse(data || '{}')); } catch (e) { return resolve({}); } }
      const form = {};
      new URLSearchParams(data).forEach((v, k) => { form[k] = v; });
      resolve(form);
    });
    req.on('error', () => resolve({}));
  });
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }
function xssPayload(s) { return /<script|onerror\s*=|onload\s*=|<svg|<img[^>]*on/i.test(String(s || '')); }

/* ---------------- simulated delivery engine ----------------
   The dispatcher NEVER opens a real network connection. External URLs
   get a canned acknowledgement; URLs that target the app itself or the
   cloud metadata address are answered with SIMULATED internal data —
   which is exactly the data an SSRF would leak on a real deployment. */
function internalData(p) {
  if (p.startsWith('/internal/metrics')) return '{"service":"hexawebhook-internal","classification":"INTERNAL-ONLY-DATA","adminApiToken":"int-admin-5c1d90fe","queueDepth":3,"workers":4}';
  if (p.startsWith('/internal')) return '{"classification":"INTERNAL-ONLY-DATA","note":"internal service response"}';
  return '{"classification":"INTERNAL-ONLY-DATA"}';
}
function fakeFetch(rawUrl) {
  let u;
  try { u = new URL(rawUrl); } catch (e) { return { code: 0, body: 'Invalid URL — delivery failed (simulated)' }; }
  const host = u.hostname.toLowerCase();
  if (host === '169.254.169.254') {
    return { code: 200, body: '{"AccessKeyId":"FAKE-IAM-KEY-ID-0001","SecretAccessKey":"FAKE-IAM-SECRET-9d27c1","Token":"FAKE-IAM-SESSION-TOKEN","Expiration":"2026-12-31T00:00:00Z"}' };
  }
  if ((host === '127.0.0.1' || host === 'localhost') && String(u.port || PORT) === String(PORT)) {
    if (u.pathname.startsWith('/internal/')) return { code: 200, body: internalData(u.pathname) };
    return { code: 200, body: '{"classification":"INTERNAL-ONLY-DATA","note":"loopback request reached the app itself"}' };
  }
  if (host === '127.0.0.1' || host === 'localhost' || host === '0.0.0.0') {
    return { code: 200, body: '{"classification":"INTERNAL-ONLY-DATA","note":"loopback service response (simulated)"}' };
  }
  if (/^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
    return { code: 200, body: '{"classification":"INTERNAL-ONLY-DATA","note":"private network service response (simulated)"}' };
  }
  return { code: 200, body: 'OK — endpoint acknowledged (simulated)' };
}
function doDelivery(endpoint, event, payload) {
  const r = fakeFetch(endpoint.url);
  const d = {
    id: nextDeliveryId++, endpointId: endpoint.id, event, payload,
    status: r.code >= 200 && r.code < 300 ? 'delivered' : 'failed',
    code: r.code, body: r.body, attempts: 1,
    signature: crypto.createHash('sha256').update(endpoint.secret + '.' + payload).digest('hex'),
    at: new Date().toISOString().slice(0, 16).replace('T', ' '),
  };
  deliveries.unshift(d);
  if (r.body.includes('INTERNAL-ONLY-DATA')) pass('ssrf-internal');
  if (r.body.includes('FAKE-IAM')) pass('ssrf-metadata');
  return d;
}
function projectOf(ep) { return projects.find(p => p.id === ep.projectId); }
function ownerOfDelivery(d) { const ep = endpoints.find(e => e.id === d.endpointId); const pr = ep && projectOf(ep); return pr ? pr.ownerId : null; }

/* ---------------- page chrome (SPEC §5) ---------------- */
function layout(user, title, content) {
  const d = doneCount(), p = pct();
  const bar = `<div style="background:#0f172a;color:#e2e8f0;padding:8px 16px;font:13px system-ui">
    <img src="/logo.png" alt="HexaCyberLab" style="height:22px;vertical-align:middle;margin-right:8px">
    <b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b> &nbsp;·&nbsp; ${d}/${TOTAL} tests · ${p}%
    <div style="background:#1e293b;height:8px;border-radius:4px;margin-top:5px"><div style="background:#38bdf8;height:8px;border-radius:4px;width:${p}%"></div></div></div>`;
  const nav = user ? `<nav style="background:#f1f5f9;padding:8px 16px;font:14px system-ui">
    <a href="/dashboard">Dashboard</a> · <a href="/projects">Projects</a> · <a href="/endpoints">Endpoints</a> ·
    <a href="/deliveries">Deliveries</a> · <a href="/tests">Mission (Tests)</a> · <a href="/settings">Settings</a>
    ${user.role === 'admin' ? ' · <a href="/admin">Admin</a>' : ''} · <a href="/logout">Logout (${esc(user.name)})</a></nav>` : '';
  const chat = `<div id="hxchat" style="position:fixed;right:14px;bottom:14px;width:320px;font:13px system-ui;background:#fff;border:1px solid #cbd5e1;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.18);z-index:50">
    <div style="background:#0f172a;color:#fff;padding:8px 12px;border-radius:10px 10px 0 0"><b>Lab Coach</b> — HexaWebhook</div>
    <div id="hxlog" style="height:180px;overflow:auto;padding:8px"></div>
    <div style="display:flex;border-top:1px solid #e2e8f0"><input id="hxin" style="flex:1;border:0;padding:8px" placeholder="Ask the coach…">
    <button onclick="hxSend()" style="background:#0284c7;color:#fff;border:0;padding:8px 12px">Send</button></div></div>
  <script>
    async function hxSend(){const i=document.getElementById('hxin');const log=document.getElementById('hxlog');
      const m=i.value.trim(); if(!m) return; i.value='';
      log.innerHTML+='<div><b>You:</b> '+m.replace(/</g,'&lt;')+'</div>';
      try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})});
      const j=await r.json(); log.innerHTML+='<div style="margin:4px 0"><b>Coach:</b> '+String(j.reply).replace(/</g,'&lt;')+'</div>';}
      catch(e){log.innerHTML+='<div><b>Coach:</b> (connection error)</div>';}
      log.scrollTop=log.scrollHeight;}
    document.getElementById('hxin').addEventListener('keydown',e=>{if(e.key==='Enter')hxSend();});
  </script>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} — HexaWebhook</title></head>
  <body style="margin:0;font-family:system-ui;background:#f8fafc;color:#0f172a">${bar}${nav}
  <main style="max-width:960px;margin:0 auto;padding:20px 16px 90px">${content}</main>${chat}</body></html>`;
}
function gatePage(msg) {
  return layout(null, 'Locked', `<h1>LAB ${LAB_NUMBER} — ${LAB_NAME} is locked</h1>
  <p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
  ${msg ? '<p style="color:#b91c1c">' + esc(msg) + '</p>' : ''}
  <form method="POST" action="/unlock"><input name="key" size="42" placeholder="Completion key from Lab ${LAB_NUMBER - 1}" autocomplete="off">
  <button type="submit">Unlock lab</button></form>
  <p style="color:#475569">A webhook delivery service — projects, endpoints, subscriptions, delivery logs and signing secrets — with a full security mission inside.</p>`);
}

/* =====================================================================
   ROUTES
   ===================================================================== */
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:' + PORT);
    const p = url.pathname;
    const method = req.method;

    if (p === '/logo.png') {
      try { const img = fs.readFileSync(path.join(ROOT, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(img); }
      catch (e) { return send(res, 404, 'no logo'); }
    }
    if (p === '/api/chat' && method === 'POST') { const form = await readBody(req); return chat(res, String(form.message || '')); }
    if (p === '/unlock' && method === 'POST') {
      const form = await readBody(req);
      if (entryKeyMatches(String(form.key || ''))) { progress.unlocked = true; saveProgress(); return redirect(res, '/login'); }
      res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(gatePage('That key was not accepted.'));
    }
    if (!progress.unlocked) { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(gatePage('')); }

    /* ---------- internal service: only the delivery engine "reaches" it ---------- */
    if (p.startsWith('/internal/')) {
      if (req.headers['x-dispatcher'] !== '1') return send(res, 403, 'Forbidden — internal service', 'text/plain');
      return send(res, 200, internalData(p), 'application/json');
    }

    /* ---------- debug exposure (platform-debug) ---------- */
    if (p === '/debug') {
      pass('platform-debug');
      return send(res, 200, JSON.stringify({
        app: 'HexaWebhook', env: 'production', node: process.version,
        users: users.map(u => ({ email: u.email, password: u.password, role: u.role, apiToken: u.apiToken })),
        endpointSecrets: endpoints.map(e => ({ id: e.id, secret: e.secret })),
      }, null, 1), 'application/json');
    }

    /* ---------- unauthenticated endpoint API (ep-secret-api) ---------- */
    if (p.startsWith('/api/endpoints/') && method === 'GET') {
      const ep = endpoints.find(e => e.id === Number(p.split('/')[3]));
      if (!ep) return send(res, 404, '{"error":"not found"}', 'application/json');
      pass('ep-secret-api');
      return send(res, 200, JSON.stringify({ id: ep.id, projectId: ep.projectId, name: ep.name, url: ep.url, events: ep.events, signing_secret: ep.secret, active: ep.active }), 'application/json');
    }
    /* ---------- token API (api-token) ---------- */
    if (p === '/api/projects' && method === 'GET') {
      const auth = req.headers.authorization || '';
      const token = auth.replace(/^Bearer\s+/i, '');
      let apiUser = users.find(u => u.apiToken === token);
      if (!apiUser && token.startsWith('wh_')) {
        let email = ''; try { email = Buffer.from(token.slice(3), 'base64').toString('utf8'); } catch (e) {}
        apiUser = users.find(u => u.email === email) || null;
        if (apiUser) pass('api-token');
      }
      if (!apiUser) return send(res, 401, '{"error":"invalid token"}', 'application/json');
      return send(res, 200, JSON.stringify(projects.filter(pr => pr.ownerId === apiUser.id)), 'application/json');
    }

    /* ---------- auth pages ---------- */
    if (p === '/login' && method === 'GET') {
      return send(res, 200, layout(null, 'Login', `<h1>Sign in to HexaWebhook</h1>
      <form method="POST" action="/login"><input type="hidden" name="hx_marker" value="ok">
      <p><label>Email <input name="email" size="34"></label></p>
      <p><label>Password <input name="password" type="password" size="34"></label></p>
      <button>Sign in</button></form>
      <p><a href="/register">Create an account</a> · <a href="/forgot">Forgot password?</a></p>
      ${url.searchParams.get('e') ? '<p style="color:#b91c1c">' + esc(url.searchParams.get('e')) + '</p>' : ''}`));
    }
    if (p === '/login' && method === 'POST') {
      const form = await readBody(req);
      attempt('Login & Authentication');
      const email = String(form.email || ''), password = String(form.password || '');
      // VULN (by design): the lookup is built by string concatenation —
      // SELECT * FROM users WHERE email='${email}' AND password='${password}'
      const injEmail = /'\s*(or|--)/i.test(email) || email.includes("' OR");
      const injPass = /'\s*or\s/i.test(password);
      let user = null, sqli = false;
      if (injEmail) { user = users[0]; sqli = true; }
      else {
        user = users.find(u => u.email === email) || null;
        if (user && injPass && user.password !== password) sqli = true;
      }
      const ip = req.socket.remoteAddress || 'local';
      if (!user) {
        (enumSeen[ip] = enumSeen[ip] || new Set()).add('nouser');
        if (enumSeen[ip].has('wrongpass')) pass('auth-enum');
        return redirect(res, '/login?e=' + encodeURIComponent('No account found for that email.'));
      }
      if (user.disabled) return redirect(res, '/login?e=' + encodeURIComponent('This account has been disabled.'));
      if (!sqli && user.password !== password) {
        failCount[email] = (failCount[email] || 0) + 1;
        if (failCount[email] >= 10) pass('auth-brute');
        (enumSeen[ip] = enumSeen[ip] || new Set()).add('wrongpass');
        if (enumSeen[ip].has('nouser')) pass('auth-enum');
        return redirect(res, '/login?e=' + encodeURIComponent('Incorrect password for this account.'));
      }
      if (sqli) pass('auth-sqli');
      if (user.id === 4) pass('auth-default');
      failCount[email] = 0;
      newSession(res, user.id);
      return redirect(res, '/dashboard');
    }
    if (p === '/register' && method === 'GET') {
      return send(res, 200, layout(null, 'Register', `<h1>Create your HexaWebhook account</h1>
      <form method="POST" action="/register"><input type="hidden" name="hx_marker" value="ok">
      <p><label>Display name <input name="name" size="34"></label></p>
      <p><label>Email <input name="email" size="34"></label></p>
      <p><label>Password <input name="password" type="password" size="34"></label></p>
      <button>Create account</button></form><p><a href="/login">Already have an account?</a></p>`));
    }
    if (p === '/register' && method === 'POST') {
      const form = await readBody(req);
      attempt('Registration & Profile');
      const email = String(form.email || '');
      if (!email || users.some(u => u.email === email)) return redirect(res, '/register');
      const role = String(form.role || 'member');               // VULN: mass assignment — role taken from the body
      const user = { id: nextUserId++, name: String(form.name || 'New User'), email, password: String(form.password || ''), role: role === 'admin' ? 'admin' : 'member', apiToken: 'whk_live_' + crypto.randomBytes(8).toString('hex'), disabled: false };
      users.push(user);
      if (form.role === 'admin') pass('reg-mass');
      if (user.password.length < 4) pass('reg-weakpw');
      if (xssPayload(user.name)) pass('reg-xss');
      newSession(res, user.id);
      return redirect(res, '/dashboard');
    }
    if (p === '/logout') { const c = parseCookies(req); sessions.delete(c.hxwh_sid); return redirect(res, '/login'); }
    if (p === '/forgot' && method === 'GET') {
      return send(res, 200, layout(null, 'Forgot password', `<h1>Reset your password</h1>
      <form method="POST" action="/forgot"><input type="hidden" name="hx_marker" value="ok">
      <p><label>Email <input name="email" size="34"></label></p><button>Send reset link</button></form>
      ${url.searchParams.get('e') ? '<p>' + esc(url.searchParams.get('e')) + '</p>' : ''}`));
    }
    if (p === '/forgot' && method === 'POST') {
      const form = await readBody(req);
      attempt('Login & Authentication');
      const user = users.find(u => u.email === String(form.email || ''));
      const ip = req.socket.remoteAddress || 'local';
      if (!user) {
        (enumSeen[ip] = enumSeen[ip] || new Set()).add('nouser');
        if (enumSeen[ip].has('wrongpass')) pass('auth-enum');
        return redirect(res, '/forgot?e=' + encodeURIComponent('No account found for that email.'));
      }
      const token = 'rst-' + user.id + '-' + ((user.id * 7919) % 100000);   // VULN: predictable — derived from the public user id
      issuedResetTokens.add(user.id + ':' + token);
      return redirect(res, '/reset?email=' + encodeURIComponent(user.email) + '&note=' + encodeURIComponent('(simulated email sent — in this local lab the token is: ' + token + ')'));
    }
    if (p === '/reset' && method === 'GET') {
      return send(res, 200, layout(null, 'Reset password', `<h1>Choose a new password</h1>
      ${url.searchParams.get('note') ? '<p style="color:#475569">' + esc(url.searchParams.get('note')) + '</p>' : ''}
      <form method="POST" action="/reset"><input type="hidden" name="hx_marker" value="ok">
      <p><label>Email <input name="email" size="34" value="${esc(url.searchParams.get('email') || '')}"></label></p>
      <p><label>Reset token <input name="token" size="34"></label></p>
      <p><label>New password <input name="newpassword" type="password" size="34"></label></p>
      <button>Reset password</button></form>`));
    }
    if (p === '/reset' && method === 'POST') {
      const form = await readBody(req);
      attempt('Login & Authentication');
      const user = users.find(u => u.email === String(form.email || ''));
      if (!user) return redirect(res, '/login?e=' + encodeURIComponent('Reset failed.'));
      const expected = 'rst-' + user.id + '-' + ((user.id * 7919) % 100000);
      if (String(form.token || '') !== expected) return redirect(res, '/login?e=' + encodeURIComponent('Reset failed — bad token.'));
      if (!issuedResetTokens.has(user.id + ':' + expected)) pass('auth-reset');   // forged token accepted
      user.password = String(form.newpassword || '');
      return redirect(res, '/login?e=' + encodeURIComponent('Password updated — sign in.'));
    }

    const user = currentUser(req);
    if (!user && p !== '/complete' && p !== '/complete/name' && p !== '/certificate') return redirect(res, '/login');

    /* ---------- dashboard (platform-headers flips here) ---------- */
    if (p === '/' || p === '/dashboard') {
      pass('platform-headers');   // responses ship with no security headers at all
      const mine = projects.filter(pr => pr.ownerId === user.id);
      const myEps = endpoints.filter(e => { const pr = projectOf(e); return pr && pr.ownerId === user.id; });
      const myDels = deliveries.filter(d => ownerOfDelivery(d) === user.id);
      return send(res, 200, layout(user, 'Dashboard', `<h1>Welcome back, ${esc(user.name)}</h1>
      <p>HexaWebhook delivers your product events to any HTTP endpoint — with retries, signed payloads and full delivery logs.</p>
      <ul><li><b>${mine.length}</b> project(s)</li><li><b>${myEps.length}</b> endpoint(s)</li><li><b>${myDels.length}</b> deliveries in your logs</li></ul>
      <p>New here? Open the <a href="/tests">Mission page</a> to see the security tests for this lab.</p>`));
    }

    /* ---------- profile / settings ---------- */
    if (p === '/settings' && method === 'GET') {
      return send(res, 200, layout(user, 'Settings', `<h1>Profile & settings</h1>
      <form method="POST" action="/profile"><input type="hidden" name="hx_marker" value="ok">
      <p><label>Display name <input name="name" size="34" value="${esc(user.name)}"></label></p>
      <button>Save profile</button></form>
      <h2>API token</h2><p>Your personal API token (keep it secret):</p>
      <code>${esc(user.apiToken)}</code>
      <p style="color:#475569">Use it as <code>Authorization: Bearer &lt;token&gt;</code> against /api/projects.</p>`));
    }
    if (p === '/profile' && method === 'POST') {
      const form = await readBody(req);
      attempt('Registration & Profile');
      const before = user.name;
      user.name = String(form.name || user.name);
      if (isCsrf(req, form) && user.name !== before) pass('reg-csrf');
      return redirect(res, '/settings');
    }

    /* ---------- projects ---------- */
    if (p === '/projects' && method === 'GET') {
      const mine = projects.filter(pr => pr.ownerId === user.id || user.role === 'admin');
      return send(res, 200, layout(user, 'Projects', `<h1>Your projects</h1>
      ${mine.map(pr => `<p><a href="/projects/${pr.id}"><b>${esc(pr.name)}</b></a> — ${esc(pr.description)}</p>`).join('')}
      <h2>Create project</h2><form method="POST" action="/projects"><input type="hidden" name="hx_marker" value="ok">
      <p><label>Name <input name="name" size="30"></label></p>
      <p><label>Description <input name="description" size="46"></label></p><button>Create</button></form>`));
    }
    if (p === '/projects' && method === 'POST') {
      const form = await readBody(req);
      attempt('Projects');
      const pr = { id: nextProjectId++, ownerId: user.id, name: String(form.name || 'Untitled'), description: String(form.description || ''), created: new Date().toISOString().slice(0, 10) };
      projects.push(pr);
      return redirect(res, '/projects/' + pr.id);
    }
    const projMatch = p.match(/^\/projects\/(\d+)$/);
    if (projMatch && method === 'GET') {
      attempt('Projects');
      const pr = projects.find(x => x.id === Number(projMatch[1]));
      if (!pr) return send(res, 404, layout(user, 'Not found', '<h1>Project not found</h1>'));
      if (pr.ownerId !== user.id) pass('proj-idor');   // VULN: no ownership check
      const eps = endpoints.filter(e => e.projectId === pr.id);
      return send(res, 200, layout(user, pr.name, `<h1>${esc(pr.name)}</h1><p>${esc(pr.description)}</p>
      <p>Owner id: ${pr.ownerId} · Created: ${esc(pr.created)}</p>
      <h2>Endpoints</h2>${eps.map(e => `<p><a href="/endpoints/${e.id}">${esc(e.name)}</a> — <code>${esc(e.url)}</code></p>`).join('') || '<p>No endpoints yet.</p>'}
      <h2>Edit project</h2><form method="POST" action="/projects/${pr.id}/update"><input type="hidden" name="hx_marker" value="ok">
      <p><label>Name <input name="name" size="30" value="${esc(pr.name)}"></label></p>
      <p><label>Description <input name="description" size="46" value="${esc(pr.description)}"></label></p><button>Save</button></form>`));
    }
    const projUpd = p.match(/^\/projects\/(\d+)\/update$/);
    if (projUpd && method === 'POST') {
      const form = await readBody(req);
      attempt('Projects');
      const pr = projects.find(x => x.id === Number(projUpd[1]));
      if (!pr) return send(res, 404, 'not found', 'text/plain');
      pr.name = String(form.name || pr.name);
      pr.description = String(form.description || pr.description);
      if (pr.ownerId !== user.id) pass('proj-write');   // VULN: write with no ownership check
      return redirect(res, '/projects/' + pr.id);
    }

    /* ---------- endpoints ---------- */
    if (p === '/endpoints' && method === 'GET') {
      const mine = endpoints.filter(e => { const pr = projectOf(e); return pr && (pr.ownerId === user.id || user.role === 'admin'); });
      return send(res, 200, layout(user, 'Endpoints', `<h1>Your endpoints</h1>
      ${mine.map(e => `<p><a href="/endpoints/${e.id}"><b>${esc(e.name)}</b></a> — <code>${esc(e.url)}</code> · events: ${e.events.map(esc).join(', ')}</p>`).join('')}
      <h2>Add endpoint</h2><form method="POST" action="/endpoints"><input type="hidden" name="hx_marker" value="ok">
      <p><label>Project id <input name="projectId" size="6"></label></p>
      <p><label>Name <input name="name" size="30"></label></p>
      <p><label>URL <input name="url" size="46"></label></p>
      <p><label>Events (comma separated) <input name="events" size="46"></label></p><button>Add endpoint</button></form>`));
    }
    if (p === '/endpoints' && method === 'POST') {
      const form = await readBody(req);
      attempt('Endpoints & SSRF');
      const pr = projects.find(x => x.id === Number(form.projectId));
      if (!pr) return redirect(res, '/endpoints');
      const events = String(form.events || '').split(',').map(s => s.trim()).filter(Boolean);
      const ep = { id: nextEndpointId++, projectId: pr.id, name: String(form.name || 'Endpoint'), url: String(form.url || ''), secret: 'whsec_' + crypto.randomBytes(10).toString('hex'), events, active: true };
      endpoints.push(ep);
      if (events.some(ev => ev === '*' || ev.startsWith('admin.'))) pass('sub-wildcard');
      return redirect(res, '/endpoints/' + ep.id);
    }
    const epMatch = p.match(/^\/endpoints\/(\d+)$/);
    if (epMatch && method === 'GET') {
      attempt('Endpoints & SSRF');
      const ep = endpoints.find(x => x.id === Number(epMatch[1]));
      if (!ep) return send(res, 404, layout(user, 'Not found', '<h1>Endpoint not found</h1>'));
      const pr = projectOf(ep);
      if (pr && pr.ownerId !== user.id) pass('ep-idor');   // VULN: details + secret shown to any user
      return send(res, 200, layout(user, ep.name, `<h1>${esc(ep.name)}</h1>
      <p>Project: ${pr ? esc(pr.name) : '?'} · Status: ${ep.active ? 'active' : 'paused'}</p>
      <p>URL: <code>${esc(ep.url)}</code></p>
      <p>Signing secret: <code>${esc(ep.secret)}</code></p>
      <p>Subscribed events: <b>${ep.events.map(esc).join(', ')}</b></p>
      <h2>Update endpoint</h2><form method="POST" action="/endpoints/${ep.id}/update"><input type="hidden" name="hx_marker" value="ok">
      <p><label>URL <input name="url" size="52" value="${esc(ep.url)}"></label></p>
      <p><label>Name <input name="name" size="30" value="${esc(ep.name)}"></label></p><button>Save</button></form>
      <h2>Subscriptions</h2><form method="POST" action="/endpoints/${ep.id}/subscriptions"><input type="hidden" name="hx_marker" value="ok">
      <p><label>Events (comma separated) <input name="events" size="52" value="${esc(ep.events.join(', '))}"></label></p><button>Save subscriptions</button></form>
      <h2>Send a test event</h2><form method="POST" action="/endpoints/${ep.id}/test"><input type="hidden" name="hx_marker" value="ok">
      <p><label>Event type <input name="event" size="24" value="${esc(ep.events[0] || 'invoice.paid')}"></label></p>
      <button>Deliver test event</button></form>
      <p style="color:#475569">Deliveries are simulated inside this local lab — no real network requests are made. The response your endpoint "returns" is recorded in the delivery log.</p>`));
    }
    const epUpd = p.match(/^\/endpoints\/(\d+)\/update$/);
    if (epUpd && method === 'POST') {
      const form = await readBody(req);
      attempt('Endpoints & SSRF');
      const ep = endpoints.find(x => x.id === Number(epUpd[1]));
      if (!ep) return send(res, 404, 'not found', 'text/plain');
      ep.url = String(form.url || ep.url);
      ep.name = String(form.name || ep.name);
      return redirect(res, '/endpoints/' + ep.id);
    }
    const epSub = p.match(/^\/endpoints\/(\d+)\/subscriptions$/);
    if (epSub && method === 'POST') {
      const form = await readBody(req);
      attempt('Subscriptions');
      const ep = endpoints.find(x => x.id === Number(epSub[1]));
      if (!ep) return send(res, 404, 'not found', 'text/plain');
      const events = String(form.events || '').split(',').map(s => s.trim()).filter(Boolean);
      ep.events = events;   // VULN: applied with no ownership check and no event allowlist
      const pr = projectOf(ep);
      if (pr && pr.ownerId !== user.id) pass('sub-tamper');
      if (events.some(ev => ev === '*' || ev.startsWith('admin.'))) pass('sub-wildcard');
      return redirect(res, '/endpoints/' + ep.id);
    }
    const epTest = p.match(/^\/endpoints\/(\d+)\/test$/);
    if (epTest && method === 'POST') {
      const form = await readBody(req);
      attempt('Endpoints & SSRF');
      const ep = endpoints.find(x => x.id === Number(epTest[1]));
      if (!ep) return send(res, 404, 'not found', 'text/plain');
      const event = String(form.event || ep.events[0] || 'test.event');
      const d = doDelivery(ep, event, JSON.stringify({ id: 'evt_' + Math.floor(1000 + Math.random() * 9000), type: event, test: true }));
      return redirect(res, '/deliveries/' + d.id);
    }

    /* ---------- deliveries & logs ---------- */
    if (p === '/deliveries/export.csv' && method === 'GET') {
      attempt('Deliveries & Logs');
      const rows = ['id,endpoint_id,event,status,code,at'];
      for (const d of deliveries) rows.push([d.id, d.endpointId, d.event, d.status, d.code, d.at].join(','));
      if (user.role !== 'admin' && deliveries.some(d => ownerOfDelivery(d) !== user.id)) pass('dl-export');   // VULN: unscoped export
      res.writeHead(200, { 'Content-Type': 'text/csv' });
      return res.end(rows.join('\n'));
    }
    if (p === '/deliveries' && method === 'GET') {
      const mine = deliveries.filter(d => ownerOfDelivery(d) === user.id || user.role === 'admin');
      return send(res, 200, layout(user, 'Deliveries', `<h1>Delivery logs</h1>
      <p><a href="/deliveries/export.csv">Export all logs (CSV)</a></p>
      ${mine.map(d => `<p><a href="/deliveries/${d.id}">#${d.id}</a> <b>${esc(d.event)}</b> → endpoint ${d.endpointId} · ${esc(d.status)} (${d.code}) · attempts ${d.attempts} · ${esc(d.at)}</p>`).join('') || '<p>No deliveries yet.</p>'}`));
    }
    const delMatch = p.match(/^\/deliveries\/(\d+)$/);
    if (delMatch && method === 'GET') {
      attempt('Deliveries & Logs');
      const d = deliveries.find(x => x.id === Number(delMatch[1]));
      if (!d) return send(res, 404, layout(user, 'Not found', '<h1>Delivery not found</h1>'));
      if (ownerOfDelivery(d) !== user.id) pass('dl-log-idor');   // VULN: full log to any user
      return send(res, 200, layout(user, 'Delivery #' + d.id, `<h1>Delivery #${d.id} — ${esc(d.event)}</h1>
      <p>Status: <b>${esc(d.status)}</b> · Response code: ${d.code} · Attempts: ${d.attempts} · At: ${esc(d.at)}</p>
      <h2>Payload sent</h2><pre>${esc(d.payload)}</pre>
      <h2>Response body</h2><pre>${esc(d.body)}</pre>
      <h2>Signature (X-HexaWebhook-Signature)</h2><code>${esc(d.signature)}</code>
      <form method="POST" action="/deliveries/${d.id}/replay"><input type="hidden" name="hx_marker" value="ok"><button>Replay this delivery</button></form>`));
    }
    const delReplay = p.match(/^\/deliveries\/(\d+)\/replay$/);
    if (delReplay && method === 'POST') {
      await readBody(req);
      attempt('Deliveries & Logs');
      const d = deliveries.find(x => x.id === Number(delReplay[1]));
      if (!d) return send(res, 404, 'not found', 'text/plain');
      const ep = endpoints.find(e => e.id === d.endpointId);
      const wasMine = ownerOfDelivery(d) === user.id;
      const nd = doDelivery(ep, d.event, d.payload);
      nd.attempts = d.attempts + 1;
      if (!wasMine) pass('dl-replay');   // VULN: replay with no ownership check
      return redirect(res, '/deliveries/' + nd.id);
    }

    /* ---------- admin ---------- */
    if (p.startsWith('/admin')) {
      attempt('Admin Panel');
      const cookies = parseCookies(req);
      const cookieAdmin = cookies.hx_role === 'admin';          // VULN: role trusted from a client cookie
      const isAdmin = user.role === 'admin' || cookieAdmin;
      if (p === '/admin/api/users' && method === 'GET') {
        if (user.role !== 'admin') pass('admin-api');           // VULN: data API not gated by real role
        return send(res, 200, JSON.stringify(users.map(u => ({ id: u.id, name: u.name, email: u.email, password: u.password, role: u.role, apiToken: u.apiToken, disabled: u.disabled })), null, 1), 'application/json');
      }
      if (!isAdmin) return send(res, 403, layout(user, 'Forbidden', '<h1>403 — Admins only</h1>'));
      if (cookieAdmin && user.role !== 'admin') pass('auth-cookie');
      if (p === '/admin' && method === 'GET') {
        // NOTE: names are rendered RAW here on purpose (stored-XSS landing zone).
        return send(res, 200, layout(user, 'Admin', `<h1>Admin console</h1>
        <h2>Users</h2>${users.map(u => `<p>#${u.id} <b>${u.name}</b> — ${esc(u.email)} · role ${esc(u.role)} · ${u.disabled ? 'DISABLED' : 'active'}
          <form method="POST" action="/admin/users/${u.id}/disable" style="display:inline"><input type="hidden" name="hx_marker" value="ok"><button>Disable</button></form></p>`).join('')}
        <h2>Platform</h2><p>${projects.length} projects · ${endpoints.length} endpoints · ${deliveries.length} deliveries.</p>`));
      }
      const disMatch = p.match(/^\/admin\/users\/(\d+)\/disable$/);
      if (disMatch && method === 'POST') {
        const form = await readBody(req);
        const target = users.find(u => u.id === Number(disMatch[1]));
        if (target && !target.disabled) {
          target.disabled = true;
          if (isCsrf(req, form)) pass('admin-csrf');           // VULN: admin action with no CSRF token
        }
        return redirect(res, '/admin');
      }
      return send(res, 404, layout(user, 'Not found', '<h1>Not found</h1>'));
    }

    /* ---------- mission page (SPEC §5) ---------- */
    if (p === '/tests' && method === 'GET') {
      const byFeature = FEATURES.map(f => {
        const ts = TESTS.filter(t => t.feature === f);
        const items = ts.map(t => `<li style="margin:8px 0">${progress.tests[t.id] ? '✅' : '⬜'} <b>${esc(t.name)}</b>
          <span style="color:#475569">(${esc(t.owasp)} · ${esc(t.difficulty)})</span>
          <details><summary>Hints</summary><ol>${t.hints.map(h => `<li>${esc(h)}</li>`).join('')}</ol></details>
          <div style="color:#475569">${esc(t.lesson)}</div></li>`).join('');
        return `<h2>${esc(f)} — ${ts.filter(t => progress.tests[t.id]).length}/${ts.length} · attempts: ${progress.attempts[f] || 0}</h2><ul style="list-style:none;padding-left:4px">${items}</ul>`;
      }).join('');
      return send(res, 200, layout(user, 'Mission', `<h1>Mission — LAB ${LAB_NUMBER} ${LAB_NAME}</h1>
      <p>Progress: <b>${doneCount()}/${TOTAL} tests · ${pct()}%</b>. Tests complete by DOING the exploit — there is no "mark done" button. Stuck? Try a feature at least 3 times, then ask the Lab Coach.</p>${byFeature}`));
    }
    if (p === '/api/progress' && method === 'GET') {
      const features = {};
      for (const f of FEATURES) features[f] = { total: TESTS.filter(t => t.feature === f).length, done: TESTS.filter(t => t.feature === f && progress.tests[t.id]).length, attempts: progress.attempts[f] || 0 };
      return send(res, 200, JSON.stringify({ lab: LAB_NAME, number: LAB_NUMBER, total: TOTAL, done: doneCount(), pct: pct(), features, complete: isComplete() }), 'application/json');
    }

    /* ---------- completion (SPEC §5) ---------- */
    if (p === '/complete' && method === 'GET') {
      if (!isComplete()) {
        return send(res, 200, layout(user, 'Not yet', `<h1>Not complete yet</h1>
        <p>You have finished <b>${doneCount()}/${TOTAL}</b> tests (${pct()}%). Remaining:</p>
        <ul>${TESTS.filter(t => !progress.tests[t.id]).map(t => `<li>${esc(t.feature)} — ${esc(t.name)}</li>`).join('')}</ul>
        <p>See the <a href="/tests">Mission page</a> for hints.</p>`));
      }
      const key = completionKey();
      const byFeature = FEATURES.map(f => {
        const ts = TESTS.filter(t => t.feature === f);
        return `<li><b>${esc(f)}</b>: ${ts.length} vulnerabilities</li>`;
      }).join('');
      const ways = TESTS.map(t => `<li>${esc(t.name)} <span style="color:#475569">(${esc(t.owasp)})</span></li>`).join('');
      const learned = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('');
      const client = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('');
      const report = TESTS.map(t => `<li><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)}<br><span style="color:#475569">Remediation: ${esc(t.report.remediation)}</span></li>`).join('');
      return send(res, 200, layout(user, 'Lab complete', `<h1>🎉 LAB ${LAB_NUMBER} — ${LAB_NAME} complete!</h1>
      <h2>1) Features in this lab</h2><p>${FEATURES.length} features, ${TOTAL} tests in total.</p>
      <h2>2) Vulnerabilities per feature</h2><ul>${byFeature}</ul>
      <h2>3) How testing was done (${TOTAL} ways)</h2><ul>${ways}</ul>
      <h2>4) What you learned</h2><ul>${learned}</ul>
      <h2>5) What this means for a real client</h2><ul>${client}</ul>
      <h2>6) Writing it in a real report</h2><ul>${report}</ul>
      <h2>Your completion key for Lab ${LAB_NUMBER + 1}</h2>
      <p style="font-size:20px"><code>${esc(key)}</code></p>
      <form method="POST" action="/tester-name"><input type="hidden" name="hx_marker" value="ok">
      <label>Your name for the certificate <input name="name" size="30" value="${esc(progress.testerName || (user && user.name))}"></label>
      <button>Save name</button></form>
      <p><a href="/certificate">View your certificate →</a></p>`));
    }
    if (p === '/tester-name' && method === 'POST') {
      const form = await readBody(req);
      progress.testerName = String(form.name || '').slice(0, 60);
      saveProgress();
      return redirect(res, '/complete');
    }
    if (p === '/certificate' && method === 'GET') {
      if (!isComplete()) return redirect(res, '/complete');
      const name = progress.testerName || (user && user.name);
      const date = progress.completedAt ? progress.completedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
      return send(res, 200, `<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER}</title>
      <style>@media print{button{display:none}}body{font-family:Georgia,serif;background:#f1f5f9}</style></head>
      <body><div style="max-width:680px;margin:40px auto;background:#fff;border:3px double #0f172a;border-radius:12px;padding:36px;text-align:center">
      <img src="/logo.png" alt="HexaCyberLab" style="height:64px">
      <h1 style="margin:10px 0">Certificate of Completion</h1>
      <p>This certifies that</p><h2 style="margin:6px 0">${esc(name)}</h2>
      <p>has completed 100% of the security tests in</p>
      <h3>LAB ${LAB_NUMBER} — ${LAB_NAME} (${TOTAL} tests across ${FEATURES.length} features)</h3>
      <p>Completed on ${esc(date)}</p>
      <p style="margin-top:24px;color:#334155">HexaCyberLab — Built by Md. Jony Hassain, Founder</p>
      <button onclick="window.print()">Print</button></div></body></html>`);
    }

    return send(res, 404, layout(user, 'Not found', '<h1>404 — page not found</h1>'));
  } catch (e) {
    try { send(res, 500, 'Internal error (the lab stays up)', 'text/plain'); } catch (_) {}
  }
});

/* ---------------- Lab Coach chatbot (SPEC §6) ---------------- */
const FEATURE_KEYWORDS = [
  ['Login & Authentication', ['login', 'sign in', 'password', 'brute', 'reset token', 'enumerat', 'default cred', 'sqli', 'sql injection', 'cookie']],
  ['Registration & Profile', ['register', 'registration', 'profile', 'mass assignment', 'weak password', 'csrf', 'display name']],
  ['Projects', ['project', 'idor']],
  ['Endpoints & SSRF', ['endpoint', 'ssrf', 'metadata', '169.254', 'internal', 'signing secret']],
  ['Subscriptions', ['subscription', 'subscribe', 'wildcard', 'event types']],
  ['Deliveries & Logs', ['deliver', 'log', 'replay', 'export']],
  ['Admin Panel', ['admin', 'user list', 'disable']],
  ['Platform & API', ['api', 'token', 'debug', 'headers', 'platform']],
];
function chat(res, raw) {
  const m = String(raw || '').toLowerCase();
  const reply = (text) => send(res, 200, JSON.stringify({ reply: text }), 'application/json');
  if (/who (built|made|created)|founder|jony|hassain|behind (this|the labs)/.test(m)) {
    return reply("These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.");
  }
  if (/(completion )?key|next lab/.test(m)) {
    if (isComplete() && progress.keyRevealed) return reply('You earned it — the completion key for Lab ' + (LAB_NUMBER + 1) + ' is: ' + completionKey() + '  Paste it into Lab ' + (LAB_NUMBER + 1) + ' to unlock it.');
    return reply("I don't have the completion key yet — I only receive it when this lab is 100% complete. You're at " + pct() + '% (' + doneCount() + '/' + TOTAL + ' tests). Finish every test and I\'ll share it.');
  }
  if (/progress|how am i|score|status/.test(m)) {
    const open = TESTS.filter(t => !progress.tests[t.id]);
    return reply('You are at ' + pct() + '% (' + doneCount() + '/' + TOTAL + ' tests). ' + (open.length ? 'Next open test: "' + open[0].name + '" in ' + open[0].feature + '. See the Mission page (/tests) for the full map.' : 'Everything is done — see /complete!'));
  }
  const hit = FEATURE_KEYWORDS.find(([, kws]) => kws.some(k => m.includes(k)));
  if (/how many|which (features|vulnerabilities|tests)|list|count/.test(m) || (hit && !/how|help|guide|step|do i|exploit|hack|test it/.test(m))) {
    if (hit) {
      const f = hit[0], ts = TESTS.filter(t => t.feature === f);
      return reply(f + ' has ' + ts.length + ' tests: ' + ts.map(t => t.name).join('; ') + '. (The map is public — the step-by-step HOW unlocks after 3 real tries on that feature, or on /tests via the hints.)');
    }
    return reply('This lab has ' + FEATURES.length + ' features and ' + TOTAL + ' tests: ' + FEATURES.map(f => f + ' (' + TESTS.filter(t => t.feature === f).length + ')').join(', ') + '. Ask me about any feature by name.');
  }
  if (hit) {
    const f = hit[0], ts = TESTS.filter(t => t.feature === f);
    const tries = progress.attempts[f] || 0;
    const allPassed = ts.every(t => progress.tests[t.id]);
    if (tries >= 3 || allPassed) {
      const guide = ts.filter(t => !progress.tests[t.id]).map(t => '• ' + t.name + ': ' + t.hints[2]).join('\n');
      return reply('You\'ve put in the work on ' + f + ' (' + tries + ' attempts) — here is the step-by-step:\n' + (guide || 'All tests in this feature are already complete. ✅'));
    }
    return reply("That feature is locked for help. First try the " + f + " tests yourself at least 3 times — I can see you've tried " + tries + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.');
  }
  return reply("I'm the Lab Coach for LAB " + LAB_NUMBER + ' — ' + LAB_NAME + '. Ask me which features exist, how many tests a feature has, your progress, or (after 3 real tries on a feature) for step-by-step help. The Mission page at /tests shows every test with graded hints.');
}

/* ---------- completion key shards — far end of the file (SPEC §7) ---------- */
const COMP_SHARDS = ["TC1YSA==","SC03Mg==","T0FMMQ==","LTdSWQ==","VTdIQg==","VFdSVQ=="];
function completionKey() { return assembleKey(COMP_SHARDS); }

/* =====================================================================
   DOCS GENERATOR — `node server.js --docs` regenerates VULNERABILITIES.md,
   PRACTICE-GUIDE.md and FIX-AND-RETEST.md from the TESTS registry so the
   docs can never drift from the code.
   ===================================================================== */
function genDocs() {
  const byF = FEATURES.map(f => ({ f, ts: TESTS.filter(t => t.feature === f) }));
  const vuln = ['# HexaWebhook — Vulnerabilities (complete map)', '',
    'LAB ' + LAB_NUMBER + ' of 110 · Category 3: API & Developer Platforms · Port ' + PORT + ' (127.0.0.1 only)', '',
    'Every scored test in the lab registry, grouped by feature. Total: ' + TOTAL + ' tests across ' + FEATURES.length + ' features.', ''];
  for (const { f, ts } of byF) {
    vuln.push('## ' + f + ' (' + ts.length + ')', '');
    for (const t of ts) vuln.push('### ' + t.name, '- OWASP: ' + t.owasp + ' · Difficulty: ' + t.difficulty, '- What it is: ' + t.lesson, '- Impact: ' + t.impact, '');
  }
  vuln.push('## Key mechanism', '', 'The lab is gated by the completion key of Lab ' + (LAB_NUMBER - 1) + ' and issues its own completion key at 100%. Keys are never stored or documented in plain form — inside server.js each key exists only as encoded shards scattered across the file, assembled at runtime.', '');
  fs.writeFileSync(path.join(ROOT, 'VULNERABILITIES.md'), vuln.join('\n'));

  const guide = ['# HexaWebhook — Practice Guide', '', 'Challenges grouped by feature, then difficulty. Objective for every challenge: make the test flip to done on the Mission page (/tests) by performing the real exploit. Hints are graded — reveal one at a time.', ''];
  const order = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  for (const { f, ts } of byF) {
    guide.push('## ' + f, '');
    for (const t of [...ts].sort((a, b) => order[a.difficulty] - order[b.difficulty])) {
      guide.push('### ' + t.name + ' (' + t.difficulty + ' · ' + t.owasp + ')', '- Objective: ' + t.lesson, '- Hint 1: ' + t.hints[0], '- Hint 2: ' + t.hints[1], '- Hint 3: ' + t.hints[2], '');
    }
  }
  fs.writeFileSync(path.join(ROOT, 'PRACTICE-GUIDE.md'), guide.join('\n'));

  const fix = ['# HexaWebhook — Fix & Retest', '', 'For every finding: the secure implementation, and the regression test that proves the fix. Retest method: re-run the original exploit after the fix — it must fail — then re-run the legitimate flow — it must still work.', ''];
  for (const { f, ts } of byF) {
    fix.push('## ' + f, '');
    for (const t of ts) fix.push('### ' + t.report.title + ' (' + t.report.severity + ')', '- Fix: ' + t.report.remediation, '- Retest: repeat the exploit from the Practice Guide; expect it to be blocked AND the normal user flow to keep working.', '');
  }
  fs.writeFileSync(path.join(ROOT, 'FIX-AND-RETEST.md'), fix.join('\n'));
  console.log('docs generated for ' + TOTAL + ' tests');
}
if (process.argv.includes('--docs')) { genDocs(); process.exit(0); }

if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => console.log('HexaWebhook (LAB ' + LAB_NUMBER + ') listening on http://127.0.0.1:' + PORT));
}
module.exports = { TESTS };
