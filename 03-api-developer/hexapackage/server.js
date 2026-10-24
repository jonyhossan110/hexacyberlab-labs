'use strict';
/*
 * HexaPackage — INTENTIONALLY VULNERABLE software package registry practice lab.
 * Zero-dependency Node.js (built-ins only). Local use ONLY. Binds 127.0.0.1:3039.
 * All data is synthetic and lives in memory — restart the server to reset the app
 * (lab progress persists separately in progress.json).
 * DO NOT deploy this anywhere. See VULNERABILITIES.md for the planted flaws.
 */
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

const HOST = '127.0.0.1';
const PORT = 3039;

/* ================= LAB SYSTEM (LAB 30 — HexaPackage) ================= */
const LAB_NUMBER = 30;
const LAB_NAME = 'HexaPackage';
const PROGRESS_PATH = path.join(__dirname, 'progress.json');
const LOGO_PATH = path.join(__dirname, 'logo.png');

/* Key material is never stored whole — only encoded shards, scattered (§7).
   Assembler: base64-decode each shard, reverse it, join. */
const _eA = ['TC1YSA==', 'Ri0wMw=='];
const _cA = ['TC1YSA==', 'RC0xMw=='];
const _unshard = (arr) => arr.map((s) => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');

/* ---------------- In-memory data (reset = restart) ---------------- */
let seq = { user: 100, pkg: 100, version: 100, token: 100, download: 100 };
const nextId = (k) => ++seq[k];

/* roles: 'admin' | 'publisher' | 'user'. The demo account ships with the
   product's documented default credentials — a planted weak/default-credential flaw. */
const users = [
  { id: 1, name: 'Registry Admin', email: 'admin@hexapackages.local', password: 'Admin@123', role: 'admin',     active: true },
  { id: 2, name: 'Priya Nair',     email: 'priya@hexapackages.local', password: 'Priya@123', role: 'publisher', active: true },
  { id: 3, name: 'Marco Ruiz',     email: 'marco@hexapackages.local', password: 'Marco@123', role: 'publisher', active: true },
  { id: 4, name: 'Demo User',      email: 'demo@hexapackages.local',  password: 'demo123',   role: 'user',      active: true },
  { id: 5, name: 'Sara Lindqvist', email: 'sara@hexapackages.local',   password: 'Sara@123',  role: 'publisher', active: true },
];
seq.user = 5;

const packages = [
  { id: 1, name: 'dataforge',     ownerId: 2, maintainerIds: [2, 5], listed: true,
    description: 'Fast, streaming data-pipeline toolkit for Node services.',
    readme: '# dataforge\nStream records through typed transforms. Install: npm i dataforge',
    downloads: 1204, lastActivity: '2026-10-22T10:00:00Z' },
  { id: 2, name: 'swiftcache',    ownerId: 3, maintainerIds: [3], listed: true,
    description: 'Tiny in-memory cache with TTL and LRU eviction.',
    readme: '# swiftcache\nA tiny cache. Install: npm i swiftcache',
    downloads: 860, lastActivity: '2026-10-21T09:30:00Z' },
  { id: 3, name: 'webutils',      ownerId: 3, maintainerIds: [3], listed: true,
    description: 'Everyday string, date and URL helpers for web apps.',
    readme: '# webutils\nHelpers for the web. Install: npm i webutils',
    downloads: 312, lastActivity: '2026-10-20T14:12:00Z' },
  { id: 4, name: 'internal-tools', ownerId: 2, maintainerIds: [2], listed: false,
    description: 'UNLISTED — internal release tooling, not for public distribution.',
    readme: '# internal-tools\nInternal only. Contains release automation secrets handling.',
    downloads: 12, lastActivity: '2026-10-22T08:00:00Z' },
];
seq.pkg = 4;

let versions = [
  { id: 1, pkgId: 1, version: '1.0.0', hash: 'sha512-a1b2c3dataforge100', changelog: 'Initial public release.', publishedBy: 2, at: '2026-09-01T10:00:00Z', unpublished: false },
  { id: 2, pkgId: 1, version: '1.1.0', hash: 'sha512-d4e5f6dataforge110', changelog: 'Bug fixes and faster streaming.', publishedBy: 2, at: '2026-10-01T10:00:00Z', unpublished: false },
  { id: 3, pkgId: 2, version: '2.0.0', hash: 'sha512-g7h8i9swiftcache200', changelog: 'New LRU engine.', publishedBy: 3, at: '2026-09-15T10:00:00Z', unpublished: false },
  { id: 4, pkgId: 3, version: '0.9.1', hash: 'sha512-j1k2l3webutils091', changelog: 'Beta helpers.', publishedBy: 3, at: '2026-09-20T10:00:00Z', unpublished: false },
  { id: 5, pkgId: 4, version: '0.1.0', hash: 'sha512-m4n5o6internal010', changelog: 'Internal build.', publishedBy: 2, at: '2026-10-10T10:00:00Z', unpublished: false },
];
seq.version = 5;

/* Publish tokens: scope 'publish' may publish; scope 'read' must NOT. */
const tokens = [
  { id: 1, userId: 2, value: 'hxpk_live_9f2ac41bd077', label: 'Priya CI',   scope: 'publish', revoked: false },
  { id: 2, userId: 3, value: 'hxpk_live_51bd90e2aa13', label: 'Marco CI',   scope: 'publish', revoked: false },
  { id: 3, userId: 4, value: 'hxpk_read_77c0d51e9b20', label: 'Demo stats reader', scope: 'read', revoked: false },
];
seq.token = 3;

const downloadLog = [
  { id: 1, pkgId: 1, email: 'dev@startup-example.com', ip: '203.0.113.9',  at: '2026-10-22T09:00:00Z' },
  { id: 2, pkgId: 1, email: 'ops@agency-example.com',  ip: '198.51.100.4', at: '2026-10-22T09:05:00Z' },
  { id: 3, pkgId: 2, email: 'dev@startup-example.com', ip: '203.0.113.9',  at: '2026-10-22T09:10:00Z' },
];
seq.download = 3;

const sessions = new Map(); // sid -> userId
const bruteCount = new Map(); // email -> failed login count
const enumProbe = new Map();  // ip -> {exists:bool, missing:bool}
const dlWindow = new Map();   // ip -> [timestamps]

const userById = (id) => users.find((u) => u.id === id);
const userByEmail = (e) => users.find((u) => u.email === String(e || '').toLowerCase());
const pkgByName = (n) => packages.find((p) => p.name === String(n || '').toLowerCase());
const pkgById = (id) => packages.find((p) => p.id === Number(id));
const versionsOf = (pkgId) => versions.filter((v) => v.pkgId === pkgId);
const XSS_RE = /(<script|onerror\s*=|onload\s*=|<svg|<img|javascript:)/i;
const SQLI_RE = /('|%27)\s*(or|and)\s+[^=]*=|'\s*--|'\s*or\s*'|union\s+select/i;

/* more key shards, kept apart (§7) */
const _eB = ['R0tINQ==', 'LURORw=='];
const _cB = ['WjgzTA==', 'LURRSQ=='];

/* ================= TESTS REGISTRY (§3) ================= */
const TESTS = [
  /* ---- Login & Authentication ---- */
  { id: 'sqli-login', feature: 'Login & Authentication', name: 'SQL injection login bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login form builds its account lookup by gluing your input straight into a query string.', "What if the email field itself contained a quote and a condition that is always true?", "Try email: ' OR '1'='1 — the lookup matches the first account in the table and never checks the password."],
    lesson: 'String-built queries let an attacker rewrite the login logic itself — no valid password is needed when the database is told the condition is already true.',
    impact: 'On a real registry this means an attacker signs in as the administrator without any credentials, then owns every package, token and publisher account on the platform.',
    report: { title: 'SQL Injection in Login Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries everywhere and never build SQL by concatenating request input.' } },
  { id: 'brute-force', feature: 'Login & Authentication', name: 'Brute force — no rate limit or lockout', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['How many wrong passwords can you try for one account in a row?', 'Nothing slows you down, counts failures or locks the account — even the 10th failure is processed normally.', 'Send 10+ wrong passwords for priya@hexapackages.local and notice every one is still accepted for checking.'],
    lesson: 'Without throttling, an online password guesser gets unlimited attempts — weak and reused passwords fall quickly.',
    impact: 'Attackers can grind through password lists against publisher accounts and take over popular packages once a single password falls.',
    report: { title: 'Missing Rate Limiting on Login Enables Brute Force', severity: 'High', remediation: 'Add progressive delays, per-account and per-IP throttling, lockout and alerting on repeated failures.' } },
  { id: 'user-enumeration', feature: 'Login & Authentication', name: 'User enumeration via login responses', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the error for an email that exists with one that does not.', 'The two answers are worded differently — one confirms the account is real.', 'Login once with priya@hexapackages.local (wrong password) and once with nobody@hexapackages.local — the messages differ.'],
    lesson: 'Different error messages for "no such account" and "wrong password" hand attackers a free list of valid accounts to target.',
    impact: 'Attackers first harvest which publisher emails are real, then focus brute force and phishing only on accounts that exist.',
    report: { title: 'Account Enumeration via Distinct Login Error Messages', severity: 'Medium', remediation: 'Return one generic "invalid email or password" message and identical behaviour for unknown accounts.' } },
  { id: 'default-creds', feature: 'Login & Authentication', name: 'Default demo credentials still active', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['The product documentation mentions a demo account that ships with the registry.', 'Demo accounts usually follow a pattern: demo@… / demo…', 'Sign in with demo@hexapackages.local / demo123 — the documented default was never disabled.'],
    lesson: 'Vendor default accounts are public knowledge — if they stay enabled, the front door is open to anyone who reads the manual.',
    impact: 'Anyone can sign in with the shipped demo credentials and start abusing registry features under a "legitimate" account.',
    report: { title: 'Default Demo Credentials Enabled in Production', severity: 'High', remediation: 'Remove or force-reset all default accounts before deployment and audit for vendor defaults regularly.' } },
  { id: 'reset-token', feature: 'Login & Authentication', name: 'Predictable password-reset token', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a password reset and look closely at the token format.', 'The token is not random — it is derived from something public about the account.', 'The token is simply the base64 encoding of the account email. Compute it for any publisher and POST it to /reset.'],
    lesson: 'A reset token must be unguessable — deriving it from the email address means anyone can reset anyone else\'s password.',
    impact: 'An attacker resets a top publisher\'s password, signs in, and pushes a malicious version of a widely downloaded package.',
    report: { title: 'Password Reset Token Is Predictable (Derived from Email)', severity: 'Critical', remediation: 'Generate reset tokens from a CSPRNG, store only a hash, expire them quickly and make them single-use.' } },
  { id: 'cookie-role', feature: 'Login & Authentication', name: 'Session role trusted from a client cookie', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After login, inspect the cookies the app sets — one of them carries your role.', 'The server trusts that cookie when deciding who may open /admin.', 'Set the hx_role cookie to "admin" in your browser, then visit /admin — your account role never changed server-side.'],
    lesson: 'Authorisation data must live server-side. A role stored in a client cookie is a suggestion the user can simply rewrite.',
    impact: 'Any signed-in user promotes themselves to registry administrator — full control over users, packages and tokens.',
    report: { title: 'Privilege Escalation via Client-Controlled Role Cookie', severity: 'Critical', remediation: 'Keep roles in the server-side session record only; never derive authorisation from client-supplied cookies.' } },

  /* ---- Registration & Profile ---- */
  { id: 'weak-password', feature: 'Registration & Profile', name: 'Weak password policy at registration', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a new account and see how short a password you can get away with.', 'There is effectively no minimum length or complexity check.', 'Register with the password "a" — the account is created.'],
    lesson: 'If the registry accepts one-character passwords, it is choosing to let accounts be guessed in seconds.',
    impact: 'Publisher accounts with trivial passwords are harvested by credential stuffing and used to poison packages.',
    report: { title: 'Registration Accepts Trivially Weak Passwords', severity: 'Medium', remediation: 'Enforce a minimum length (12+) and screen new passwords against known-breached lists.' } },
  { id: 'mass-assignment', feature: 'Registration & Profile', name: 'Mass assignment — role set from request body', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The profile update form only shows name and bio fields — but the server binds the whole submitted object.', 'What extra field would change your privileges if the server copied it blindly?', 'POST /profile/update with an added field role=admin — the server applies it.'],
    lesson: 'Binding request bodies directly to records lets attackers set fields the UI never offered — including role and account flags.',
    impact: 'A normal user self-promotes to administrator through a routine profile form, bypassing every approval process.',
    report: { title: 'Mass Assignment Allows Role Escalation via Profile Update', severity: 'High', remediation: 'Whitelist bindable fields per endpoint; never accept role/privilege fields from client input.' } },
  { id: 'stored-xss-profile', feature: 'Registration & Profile', name: 'Stored XSS in publisher display name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is shown on your public publisher page and in admin lists — how is it rendered?', 'Try storing markup instead of a plain name.', 'Set your display name to <script>alert(1)</script> via /profile/update — it is stored and rendered unescaped.'],
    lesson: 'Any field rendered without output encoding becomes a stored script delivery channel to everyone who views it.',
    impact: 'A malicious publisher name executes script in the browsers of registry admins and other publishers — session theft and actions in their name.',
    report: { title: 'Stored Cross-Site Scripting in Display Name', severity: 'High', remediation: 'Contextually encode all user-supplied output and add a Content-Security-Policy as defence in depth.' } },
  { id: 'profile-csrf', feature: 'Registration & Profile', name: 'CSRF on profile update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Profile changes are accepted from a plain POST with no anti-CSRF token.', 'The app only checks that you are logged in — not where the request came from.', 'POST /profile/update from a cross-site Origin (e.g. Origin: https://evil.example) while logged in — the change is applied.'],
    lesson: 'State-changing forms without CSRF tokens can be submitted by any website the victim visits while logged in.',
    impact: 'A publisher visiting a malicious page silently gets their profile — or worse, their account email — changed by an attacker.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require per-session anti-CSRF tokens on all state-changing requests and verify Origin/Referer.' } },

  /* ---- Packages & Versions ---- */
  { id: 'maintainer-takeover', feature: 'Packages & Versions', name: 'Package takeover via maintainer manipulation', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Maintainers can be added to a package from its page — who is allowed to do that?', 'The endpoint checks that you are logged in, but never that you own the package.', 'As any user, POST /package/swiftcache/maintainers/add with username = your own account email — you become a maintainer of Marco\'s package.'],
    lesson: 'Every ownership/maintainer operation must verify the caller actually controls the package — "logged in" is not "authorised".',
    impact: 'This is the classic supply-chain takeover: an attacker adds themselves as maintainer of a popular package and ships a backdoored release to thousands of projects.',
    report: { title: 'Broken Access Control Allows Adding Maintainers to Any Package', severity: 'Critical', remediation: 'Verify package ownership/maintainer status server-side before any maintainer change, and notify owners of changes.' } },
  { id: 'version-overwrite', feature: 'Packages & Versions', name: 'Version overwrite — republish replaces a released version', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['Released versions should be immutable. What happens if you publish a version number that already exists?', 'The registry silently replaces the stored content instead of rejecting the duplicate.', 'As a maintainer of dataforge, publish version 1.0.0 again with a new changelog/content — the original release is overwritten.'],
    lesson: 'Package versions must be immutable once published; overwriting a release breaks the trust every downstream pin relies on.',
    impact: 'Attackers who gain publish rights can rewrite history — swapping a trusted, audited release for a malicious one under the exact version everyone already approved.',
    report: { title: 'Published Versions Can Be Overwritten (No Immutability)', severity: 'Critical', remediation: 'Reject publishing an existing version number; treat releases as immutable and require a new version for any change.' } },
  { id: 'unpublish-others', feature: 'Packages & Versions', name: 'Unpublish/delete versions of other publishers\' packages', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The unpublish action removes a version from distribution. Whose versions can you unpublish?', 'Like the maintainer endpoint, it never checks package ownership.', 'As any logged-in user, POST /package/webutils/unpublish with version 0.9.1 — Marco\'s release disappears.'],
    lesson: 'Destructive actions need the same ownership checks as edit actions — a missing check turns any account into a vandal.',
    impact: 'Competitors or vandals can pull a company\'s packages from distribution, breaking builds and deploys across every customer who depends on them.',
    report: { title: 'Missing Authorisation on Unpublish Allows Deleting Others\' Releases', severity: 'High', remediation: 'Restrict unpublish/delete to package owners (and admins), with confirmation and audit logging.' } },
  { id: 'claim-takeover', feature: 'Packages & Versions', name: 'Ownership claim of an active package (name-squat transfer)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    hints: ['The registry lets users "claim" packages whose owners abandoned them. What proves abandonment?', 'The claim form exists — but the inactivity check behind it was never implemented.', 'POST /package/dataforge/claim as any other user — ownership of an actively maintained package transfers to you immediately.'],
    lesson: 'Ownership-transfer features must verify their precondition (here: real abandonment) server-side, not just present a form.',
    impact: 'A headline package can be seized in one request — its name, download base and reputation now belong to the attacker.',
    report: { title: 'Package Ownership Claim Works on Active Packages (No Abandonment Check)', severity: 'Critical', remediation: 'Verify inactivity server-side, require owner notification and a waiting period before any ownership transfer.' } },
  { id: 'readme-xss', feature: 'Packages & Versions', name: 'Stored XSS in package README / description', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Package pages render the README and description as rich content. Is any of it encoded?', 'Maintainers can edit the README — what if the README is not documentation but markup?', 'As a maintainer, POST /package/dataforge/readme with a description containing <script>alert(1)</script> — it renders raw on the package page.'],
    lesson: 'Rendering maintainer-supplied README/description as raw HTML makes every package page a stored-XSS host.',
    impact: 'Every visitor of a popular package page — including registry admins — runs the attacker\'s script; one poisoned README can cascade into account takeovers.',
    report: { title: 'Stored Cross-Site Scripting via Package README/Description', severity: 'High', remediation: 'Render README through a sanitising Markdown pipeline and encode descriptions; never inject raw user HTML.' } },

  /* ---- Search & Discovery ---- */
  { id: 'search-sqli', feature: 'Search & Discovery', name: 'SQL injection in package search exposes unlisted packages', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Search only shows listed packages — in the results the query builds.', 'The search term is glued into the lookup the same way the login was.', "Search for: ' OR '1'='1 — the result set suddenly includes packages that are not listed publicly."],
    lesson: 'Search is a query interface too — injecting it can dump records the UI would never show, including unlisted/internal packages.',
    impact: 'Internal package names leak: attackers learn a company\'s private tooling and target it for dependency-confusion attacks.',
    report: { title: 'SQL Injection in Search Leaks Unlisted Packages', severity: 'High', remediation: 'Parameterise search queries and enforce visibility filters in the data layer, not the presentation layer.' } },
  { id: 'reflected-xss', feature: 'Search & Discovery', name: 'Reflected XSS in search results', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The results page echoes "Results for …" — how is your term written back?', 'Put markup in the search box and view the page source.', 'Search for <script>alert(1)</script> — the term is reflected into the page unescaped.'],
    lesson: 'Echoing user input into HTML without encoding turns a harmless search link into a script-delivery URL.',
    impact: 'Attackers send victims crafted search links that run script in the registry origin — stealing sessions of signed-in publishers.',
    report: { title: 'Reflected Cross-Site Scripting in Search', severity: 'Medium', remediation: 'Encode all reflected values on output and validate input types at the boundary.' } },

  /* ---- Tokens & API ---- */
  { id: 'token-scope', feature: 'Tokens & API', name: 'Read-only token can publish (scope never checked)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Tokens carry a scope: read or publish. The API publish endpoint authenticates the token — but does it authorise it?', 'The demo account owns a read-only token meant only for stats.', 'POST /api/v1/publish with the demo read token (Authorization: Bearer …) — a new version is created.'],
    lesson: 'Authentication is not authorisation: a valid token must also be checked for the scope the operation requires.',
    impact: 'A leaked low-privilege "read-only" token — the kind pasted into dashboards and CI logs — becomes full publish access to production packages.',
    report: { title: 'API Publish Endpoint Ignores Token Scope', severity: 'High', remediation: 'Enforce scope checks on every API operation (publish requires the publish scope) and test them per endpoint.' } },
  { id: 'token-idor', feature: 'Tokens & API', name: 'Token IDOR — view other publishers\' token values', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Your token page shows each token at /tokens/<id>. The ids are small sequential numbers.', 'What stops you opening a token that is not yours?', 'Open /tokens/1 while signed in as someone else — Priya\'s full publish token value is displayed.'],
    lesson: 'Object endpoints must check ownership per record; sequential ids plus no check equals everyone\'s secrets on display.',
    impact: 'Any user harvests every publisher\'s live publish tokens and can release malicious versions as them.',
    report: { title: 'Insecure Direct Object Reference Exposes All Publish Tokens', severity: 'Critical', remediation: 'Scope every token query to the authenticated owner and show token values only once, at creation.' } },
  { id: 'weak-api-key', feature: 'Tokens & API', name: 'Legacy API key derived from the account email', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    hints: ['The API also accepts a "legacy key" header for old integrations. Legacy schemes are rarely random.', 'The key is derived from something every publisher page shows publicly.', 'Call GET /api/v1/me with header X-Api-Key set to the base64 of a user\'s email (e.g. the admin\'s) — you are authenticated as them.'],
    lesson: 'Credentials derived from public identifiers are not credentials — they are usernames wearing a costume.',
    impact: 'Anyone who knows a publisher\'s email — printed on every package page — owns their API identity.',
    report: { title: 'API Key Predictably Derived from Email Address', severity: 'High', remediation: 'Issue random, high-entropy API keys, store hashes, and retire derivation-based legacy schemes.' } },
  { id: 'api-package-idor', feature: 'Tokens & API', name: 'API returns unlisted package data to any token', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The API package endpoint looks packages up by name — does it apply the listed/unlisted visibility rule?', 'An unlisted internal package exists. The website hides it; the API may not.', 'GET /api/v1/packages/internal-tools with any valid token — full details of the unlisted package are returned.'],
    lesson: 'Visibility rules must be enforced in every interface — web, API, exports — not just the one users see most.',
    impact: 'Private/internal packages (names, maintainers, versions) leak through the API even though the website correctly hides them.',
    report: { title: 'API Exposes Unlisted Packages Without Authorisation', severity: 'High', remediation: 'Apply the same ownership/visibility authorisation in the API as in the web UI, with tests for both.' } },

  /* ---- Downloads & Stats ---- */
  { id: 'download-inflation', feature: 'Downloads & Stats', name: 'Download-count inflation (no rate limit / dedup)', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['Download counts drive the registry\'s popularity rankings. What counts as a download?', 'Every single request bumps the counter — same user, same second, no questions asked.', 'Request /download/dataforge/1.1.0 twenty times in a row — the counter climbs by twenty.'],
    lesson: 'Metrics that influence ranking and trust must be rate-limited and deduplicated, or they measure whoever scripts loudest.',
    impact: 'Attackers inflate a malicious package\'s download count to make it look established and trustworthy, pushing it up search results.',
    report: { title: 'Download Statistics Can Be Inflated Without Limit', severity: 'Medium', remediation: 'Deduplicate downloads per user/IP over a window and rate-limit the download endpoint.' } },
  { id: 'stats-idor', feature: 'Downloads & Stats', name: 'Detailed download stats of others\' packages are public', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Each package has a /stats page with the detailed download log. Who is it for?', 'The log includes downloader email addresses — and the page checks nothing at all.', 'Open /stats/swiftcache as any other user — Marco\'s full download log, with customer emails, is shown.'],
    lesson: 'Analytics about a package belong to its owner; exposing per-download identities leaks a company\'s customer list.',
    impact: 'Competitors scrape which companies download a package and when — a ready-made list of another firm\'s customers to poach.',
    report: { title: 'Broken Access Control on Package Download Statistics', severity: 'Medium', remediation: 'Restrict stats pages to the package owner/maintainers and aggregate away downloader identities.' } },

  /* ---- Admin Panel ---- */
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'Admin user deactivation via simple GET (CSRF)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Admin actions should be deliberate POSTs with tokens. Look at how user deactivation is triggered in /admin.', 'It is a plain link — a GET request changes account state.', 'While signed in as admin, GET /admin/users/5/deactivate — the account is disabled by a link an attacker could make the admin\'s browser visit.'],
    lesson: 'State changes behind GET links can be fired by an image tag on any page an admin views — the browser sends their session for free.',
    impact: 'An attacker tricks the registry admin into opening a page and silently deactivates publisher accounts, locking companies out of their own packages.',
    report: { title: 'State-Changing Admin Action Performed via GET (CSRF)', severity: 'High', remediation: 'Make all state changes POST-only with anti-CSRF tokens and re-authentication for destructive admin actions.' } },

  /* ---- Platform & Exposure ---- */
  { id: 'debug-exposure', feature: 'Platform & Exposure', name: 'Debug endpoint dumps users, passwords and tokens', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Development leftovers love predictable paths.', 'Try the endpoint every developer forgets to remove before shipping.', 'GET /debug — the full registry state, including account passwords and live publish tokens, is returned to anyone.'],
    lesson: 'Debug/diagnostic endpoints must never ship to production — they bypass every control the rest of the app enforces.',
    impact: 'One unauthenticated request hands over every credential and token in the registry — total platform compromise in a single call.',
    report: { title: 'Exposed Debug Endpoint Discloses Credentials and Tokens', severity: 'Critical', remediation: 'Remove debug endpoints from production builds and gate diagnostics behind admin auth on a separate interface.' } },
];
const TEST_BY_ID = Object.fromEntries(TESTS.map((t) => [t.id, t]));
const FEATURES = [...new Set(TESTS.map((t) => t.feature))];

/* ================= Progress engine (§4) ================= */
let progress = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_PATH)) {
      const p = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
      if (p && typeof p === 'object') progress = Object.assign(progress, p);
    }
  } catch (e) { /* corrupt state -> start fresh */ }
}
function saveProgress() {
  try { fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2)); } catch (e) { /* ignore */ }
}
function pass(id) {
  if (TEST_BY_ID[id] && !progress.tests[id]) {
    progress.tests[id] = true;
    if (TESTS.every((t) => progress.tests[t.id])) {
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
function progressView() {
  const total = TESTS.length;
  const done = TESTS.filter((t) => progress.tests[t.id]).length;
  const pct = Math.floor((done / total) * 100);
  const features = {};
  for (const f of FEATURES) {
    const ft = TESTS.filter((t) => t.feature === f);
    features[f] = { total: ft.length, done: ft.filter((t) => progress.tests[t.id]).length, attempts: progress.attempts[f] || 0 };
  }
  return { lab: LAB_NAME, number: LAB_NUMBER, total, done, pct, features, complete: done === total };
}
loadProgress();

/* more key shards, kept apart (§7) */
const _eC = ['VFc4UA==', 'QVA4TA=='];
const _cC = ['VUZGNw==', 'NkpHNQ=='];
const entryKey = () => _unshard([..._eA, ..._eB, ..._eC]);
const completionKey = () => _unshard([..._cA, ..._cB, ..._cC]);

/* ================= HTTP helpers ================= */
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(''));
  });
}
function parseBody(req, raw) {
  const ct = String(req.headers['content-type'] || '');
  if (ct.includes('application/json')) { try { return JSON.parse(raw || '{}'); } catch (e) { return {}; } }
  return querystring.parse(raw || '');
}
function currentUser(req) {
  const sid = parseCookies(req).sid;
  const uid = sid && sessions.get(sid);
  const u = uid && userById(uid);
  return u && u.active ? u : null;
}
function startSession(res, user) {
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, user.id);
  // NOTE (planted flaw): the role is ALSO mirrored into a client-editable cookie,
  // and /admin trusts it — see the cookie-role test.
  res.setHeader('Set-Cookie', [
    `sid=${sid}; Path=/; HttpOnly`,
    `hx_role=${user.role}; Path=/`,
    'hx_origin=same; Path=/',
  ]);
}
function isCsrf(req) {
  const origin = String(req.headers.origin || req.headers.referer || '');
  if (origin && !origin.includes(`${HOST}:${PORT}`) && !origin.includes('localhost')) return true;
  if (!parseCookies(req).hx_origin) return true;
  return false;
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }
function json(res, code, obj) { send(res, code, JSON.stringify(obj, null, 2), 'application/json'); }

/* ================= Page furniture (§5) ================= */
function progressBar() {
  const P = progressView();
  return `<div style="background:#111827;color:#e5e7eb;padding:8px 14px;border-radius:8px;margin:10px 0">
    <img src="/logo.png" alt="HexaCyberLab" style="height:26px;vertical-align:middle">
    <b style="margin-left:8px">LAB ${LAB_NUMBER} — ${LAB_NAME}</b>
    <span style="float:right">${P.done}/${P.total} tests · ${P.pct}%</span>
    <div style="background:#374151;height:10px;border-radius:5px;margin-top:6px"><div style="background:#22c55e;height:10px;border-radius:5px;width:${P.pct}%"></div></div>
    ${P.complete ? '<div style="margin-top:4px"><a href="/complete" style="color:#8affc1">★ Lab complete — view your summary & key</a></div>' : ''}
  </div>`;
}
const CHAT_WIDGET = `
<div id="hxchat" style="position:fixed;right:14px;bottom:14px;width:320px;font-family:inherit;z-index:50">
  <button onclick="document.getElementById('hxchatbox').style.display=document.getElementById('hxchatbox').style.display==='none'?'block':'none'" style="float:right;background:#2563eb;color:#fff;border:0;border-radius:20px;padding:8px 14px;cursor:pointer">💬 Lab Coach</button>
  <div id="hxchatbox" style="display:none;clear:both;background:#fff;border:1px solid #d1d5db;border-radius:10px;padding:10px;margin-top:6px;box-shadow:0 8px 30px rgba(0,0,0,.18)">
    <div id="hxlog" style="height:180px;overflow:auto;font-size:13px;margin-bottom:8px"><div><b>Coach:</b> Hi! Ask me how many tests a feature has, or how to approach one — guidance unlocks after 3 tries on that feature.</div></div>
    <form onsubmit="hxSend(event)"><input id="hxin" placeholder="Ask the Lab Coach…" style="width:72%;padding:6px"><button style="padding:6px 10px">Send</button></form>
  </div>
</div>
<script>
function hxSend(e){e.preventDefault();var v=document.getElementById('hxin').value;if(!v)return;var log=document.getElementById('hxlog');log.innerHTML+='<div><b>You:</b> '+v.replace(/</g,'&lt;')+'</div>';document.getElementById('hxin').value='';
fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:v})}).then(function(r){return r.json()}).then(function(d){log.innerHTML+='<div><b>Coach:</b> '+String(d.reply).replace(/</g,'&lt;')+'</div>';log.scrollTop=log.scrollHeight;});}
</script>`;
function page(req, title, inner) {
  const u = currentUser(req);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} — HexaPackage</title>
<style>body{font-family:system-ui,Arial,sans-serif;max-width:960px;margin:0 auto;padding:16px;background:#f8fafc;color:#111827}a{color:#2563eb}table{border-collapse:collapse;width:100%}td,th{border:1px solid #d1d5db;padding:6px 8px;text-align:left}input,textarea,select{padding:6px;margin:2px 0}button,.btn{background:#2563eb;color:#fff;border:0;border-radius:6px;padding:7px 12px;cursor:pointer;text-decoration:none;display:inline-block}.card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px;margin:10px 0}.muted{color:#6b7280}.flash{background:#ecfdf5;border:1px solid #6ee7b7;padding:8px;border-radius:8px}</style></head>
<body>${progressBar()}
<nav>
  <a href="/">Registry</a> · <a href="/tests">Mission (tests)</a>
  ${u ? ` · <a href="/dashboard">My dashboard</a> · <a href="/tokens">My tokens</a> · <a href="/profile">Profile</a> · <a href="/admin">Admin</a> · <span class="muted">Signed in as ${esc(u.name)} (${esc(u.email)}, ${esc(u.role)})</span> · <a href="/logout">Logout</a>`
      : ' · <a href="/login">Login</a> · <a href="/register">Register</a>'}
</nav>
${inner}
${CHAT_WIDGET}
</body></html>`;
}
function gatePage() {
  return `<!doctype html><html><head><meta charset="utf-8"><title>LAB ${LAB_NUMBER} — ${LAB_NAME} (locked)</title></head>
<body style="font-family:system-ui,Arial;max-width:640px;margin:40px auto;padding:16px">
<img src="/logo.png" alt="HexaCyberLab" style="height:44px">
<h1>LAB ${LAB_NUMBER} — ${LAB_NAME}</h1>
<p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
<form method="POST" action="/unlock"><input name="key" placeholder="Completion key from Lab ${LAB_NUMBER - 1}" style="width:70%;padding:8px"> <button style="padding:8px 14px">Unlock</button></form>
${CHAT_WIDGET}
</body></html>`;
}

/* ================= Lab Coach chatbot (§6) ================= */
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
function featureFromMessage(msg) {
  const m = msg.toLowerCase();
  return FEATURES.find((f) => {
    const words = f.toLowerCase().replace(/&/g, ' ').split(/[^a-z]+/).filter((w) => w.length > 3);
    return words.some((w) => m.includes(w)) || m.includes(f.toLowerCase());
  });
}
function chatReply(message) {
  const msg = String(message || '');
  const m = msg.toLowerCase();
  const P = progressView();
  if (/(who (built|made|created)|founder|author|jony)/.test(m)) return ATTRIBUTION;
  if (/(key|unlock next|next lab)/.test(m) && /(give|show|tell|what)/.test(m)) {
    if (P.complete && progress.keyRevealed) return `You completed the lab — here is the completion key for Lab ${LAB_NUMBER + 1}: ${completionKey()}`;
    return `I don't have the completion key yet — it is only revealed when the lab reaches 100%. You are at ${P.pct}% (${P.done}/${P.total} tests). Finish every test and the key appears on /complete — and I can share it then too.`;
  }
  const feature = featureFromMessage(msg);
  if (/(how many|count|which|list|what tests|vulnerabilit)/.test(m)) {
    if (feature) {
      const ft = TESTS.filter((t) => t.feature === feature);
      return `${feature} has ${ft.length} test(s): ${ft.map((t) => `"${t.name}"`).join(', ')}. Open /tests for their hints.`;
    }
    return `This lab has ${FEATURES.length} features and ${TESTS.length} tests: ${FEATURES.map((f) => `${f} (${TESTS.filter((t) => t.feature === f).length})`).join(', ')}.`;
  }
  if (/(how|guide|help|solve|do i|steps|approach|hint)/.test(m)) {
    const f = feature || (TESTS.find((t) => !progress.tests[t.id]) || {}).feature;
    if (!f) return 'Everything is done — see /complete for your key and certificate.';
    const tries = progress.attempts[f] || 0;
    const open = TESTS.filter((t) => t.feature === f && !progress.tests[t.id]);
    if (tries >= 3 || open.length === 0) {
      const t = open[0];
      if (!t) return `All ${f} tests are already passed. Well done!`;
      return `Step by step for "${t.name}" (${f}): ${t.hints[2]} Lesson: ${t.lesson}`;
    }
    return `That feature is locked for help. First try the ${f} tests yourself at least 3 times — I can see you've tried ${tries} time(s) so far. After 3 real tries, ask me again and I'll guide you step by step.`;
  }
  if (/(progress|status|score|percent)/.test(m)) {
    const next = TESTS.find((t) => !progress.tests[t.id]);
    return `You have completed ${P.done} of ${P.total} tests (${P.pct}%). ${next ? `Next open test: "${next.name}" in ${next.feature} — open the Mission page (/tests) for its hints, or ask me about that feature after a few tries.` : 'Everything is done — see /complete for your key and certificate.'}`;
  }
  if (/^(hi|hello|hey)\b/.test(m)) return `Hello! This is LAB ${LAB_NUMBER} — ${LAB_NAME}, a package-registry lab with ${TESTS.length} tests across ${FEATURES.length} features. You are at ${progressView().pct}%. Ask me about a feature (e.g. "how many tests in Tokens & API"), or check /tests.`;
  return `I can tell you how many tests each feature has, your progress, and — after you've tried a feature at least 3 times — step-by-step guidance for it. Try asking "how do I do the Packages & Versions tests?" or open the Mission page at /tests.`;
}

/* ================= Router ================= */
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, `http://${HOST}:${PORT}`);
    const pathname = u.pathname;
    const method = req.method;
    const raw = (method === 'POST') ? await readBody(req) : '';
    const body = (method === 'POST') ? parseBody(req, raw) : {};
    const ip = req.socket.remoteAddress || 'local';

    /* ---- always available (also behind the gate) ---- */
    if (method === 'GET' && pathname === '/logo.png') {
      try { const img = fs.readFileSync(LOGO_PATH); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(img); }
      catch (e) { return send(res, 404, 'logo missing'); }
    }
    if (method === 'POST' && pathname === '/unlock') {
      const key = String(body.key || '');
      if (key && key === entryKey()) { progress.unlocked = true; saveProgress(); return redirect(res, '/'); }
      return send(res, 403, gatePage().replace('</form>', '</form><p style="color:#b91c1c">That key was not accepted.</p>'));
    }
    if (method === 'GET' && pathname === '/api/progress') return json(res, 200, progressView());
    if (method === 'POST' && pathname === '/api/chat') return json(res, 200, { reply: chatReply(body.message) });

    /* ---- lock gate (§5) ---- */
    if (!progress.unlocked) return send(res, 200, gatePage());

    const user = currentUser(req);
    const cookies = parseCookies(req);

    /* ---- auth ---- */
    if (method === 'GET' && pathname === '/login') {
      return send(res, 200, page(req, 'Login', `<h1>Publisher login</h1>
        <form method="POST" action="/login"><input name="email" placeholder="Email" size="34"><br>
        <input name="password" type="password" placeholder="Password" size="34"><br>
        <button>Sign in</button></form>
        <p class="muted">Demo account (from the docs): demo@hexapackages.local / demo123 · <a href="/forgot">Forgot password?</a></p>`));
    }
    if (method === 'POST' && pathname === '/login') {
      attempt('Login & Authentication');
      const email = String(body.email || '').toLowerCase();
      const password = String(body.password || '');
      if (SQLI_RE.test(email) || SQLI_RE.test(password)) {
        // Planted flaw: the lookup is a string-built query; an always-true
        // condition matches the first account and skips the password check.
        pass('sqli-login');
        startSession(res, users[0]);
        return redirect(res, '/dashboard');
      }
      const acct = userByEmail(email);
      const probe = enumProbe.get(ip) || { exists: false, missing: false };
      if (!acct) {
        probe.missing = true; enumProbe.set(ip, probe);
        if (probe.exists && probe.missing) pass('user-enumeration');
        return send(res, 200, page(req, 'Login', '<p style="color:#b91c1c">No account with that email.</p><p><a href="/login">Try again</a></p>'));
      }
      if (acct.password !== password) {
        probe.exists = true; enumProbe.set(ip, probe);
        if (probe.exists && probe.missing) pass('user-enumeration');
        const n = (bruteCount.get(email) || 0) + 1; bruteCount.set(email, n);
        if (n >= 10) pass('brute-force'); // 10th failure still processed — no throttle
        return send(res, 200, page(req, 'Login', '<p style="color:#b91c1c">Incorrect password for this account.</p><p><a href="/login">Try again</a></p>'));
      }
      if (!acct.active) return send(res, 403, page(req, 'Login', '<p>This account has been deactivated by an administrator.</p>'));
      bruteCount.delete(email);
      if (email === 'demo@hexapackages.local') pass('default-creds');
      startSession(res, acct);
      return redirect(res, '/dashboard');
    }
    if (method === 'GET' && pathname === '/logout') {
      if (cookies.sid) sessions.delete(cookies.sid);
      res.setHeader('Set-Cookie', ['sid=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0']);
      return redirect(res, '/');
    }
    if (method === 'GET' && pathname === '/forgot') {
      return send(res, 200, page(req, 'Forgot password', `<h1>Reset your password</h1>
        <form method="POST" action="/forgot"><input name="email" placeholder="Email" size="34"> <button>Send reset link</button></form>`));
    }
    if (method === 'POST' && pathname === '/forgot') {
      attempt('Login & Authentication');
      return send(res, 200, page(req, 'Forgot password', '<p>If that account exists, a reset link has been emailed. (In this local lab the link would be /reset?email=…&amp;token=…)</p>'));
    }
    if (method === 'GET' && pathname === '/reset') {
      return send(res, 200, page(req, 'Reset password', `<h1>Choose a new password</h1>
        <form method="POST" action="/reset">
        <input name="email" placeholder="Email" size="34" value="${esc(u.searchParams.get('email') || '')}"><br>
        <input name="token" placeholder="Reset token" size="34" value="${esc(u.searchParams.get('token') || '')}"><br>
        <input name="password" type="password" placeholder="New password" size="34"><br>
        <button>Reset password</button></form>`));
    }
    if (method === 'POST' && pathname === '/reset') {
      attempt('Login & Authentication');
      const acct = userByEmail(body.email);
      // Planted flaw: the reset token is just the base64 of the account email.
      const expected = acct ? Buffer.from(acct.email, 'utf8').toString('base64') : null;
      if (acct && expected && String(body.token || '') === expected) {
        acct.password = String(body.password || 'x');
        pass('reset-token');
        return redirect(res, '/login');
      }
      return send(res, 400, page(req, 'Reset password', '<p style="color:#b91c1c">Invalid or expired reset token.</p>'));
    }
    if (method === 'GET' && pathname === '/register') {
      return send(res, 200, page(req, 'Register', `<h1>Create a publisher account</h1>
        <form method="POST" action="/register"><input name="name" placeholder="Display name" size="34"><br>
        <input name="email" placeholder="Email" size="34"><br>
        <input name="password" type="password" placeholder="Password" size="34"><br>
        <button>Create account</button></form>`));
    }
    if (method === 'POST' && pathname === '/register') {
      attempt('Registration & Profile');
      const email = String(body.email || '').toLowerCase();
      if (!email || userByEmail(email)) return send(res, 400, page(req, 'Register', '<p style="color:#b91c1c">Email missing or already registered.</p>'));
      const nu = { id: nextId('user'), name: String(body.name || 'New Publisher'), email, password: String(body.password || ''), role: 'user', active: true };
      if (body.role) { nu.role = String(body.role); if (nu.role === 'admin') pass('mass-assignment'); }
      users.push(nu);
      if (String(body.password || '').length < 4) pass('weak-password'); // accepted anyway — no policy
      startSession(res, nu);
      return redirect(res, '/dashboard');
    }
    if (method === 'GET' && pathname === '/profile') {
      if (!user) return redirect(res, '/login');
      return send(res, 200, page(req, 'Profile', `<h1>Your profile</h1>
        <form method="POST" action="/profile/update">
        <label>Display name<br><input name="name" size="40" value="${esc(user.name)}"></label><br>
        <label>Email<br><input name="email" size="40" value="${esc(user.email)}"></label><br>
        <button>Save profile</button></form>
        <p class="muted">Public publisher page: <a href="/publisher/${user.id}">/publisher/${user.id}</a> · Role: ${esc(user.role)}</p>`));
    }
    if (method === 'POST' && pathname === '/profile/update') {
      if (!user) return redirect(res, '/login');
      attempt('Registration & Profile');
      if (isCsrf(req)) pass('profile-csrf'); // change is applied regardless — no token check
      if (body.name !== undefined) {
        user.name = String(body.name);
        if (XSS_RE.test(user.name)) pass('stored-xss-profile');
      }
      if (body.email) user.email = String(body.email).toLowerCase();
      if (body.role) { user.role = String(body.role); if (user.role === 'admin') pass('mass-assignment'); }
      return redirect(res, '/profile');
    }
    if (method === 'GET' && pathname.startsWith('/publisher/')) {
      const pub = userById(Number(pathname.split('/')[2]));
      if (!pub) return send(res, 404, page(req, 'Not found', '<h1>Publisher not found</h1>'));
      const mine = packages.filter((p) => p.ownerId === pub.id && p.listed);
      // NOTE (planted flaw): the display name is rendered unescaped here.
      return send(res, 200, page(req, 'Publisher', `<h1>${pub.name}</h1>
        <p class="muted">Publisher since 2026 · ${esc(pub.email)}</p>
        ${mine.map((p) => `<div class="card"><a href="/package/${esc(p.name)}"><b>${esc(p.name)}</b></a> — ${esc(p.description)}<br><span class="muted">${p.downloads} downloads</span></div>`).join('') || '<p>No public packages.</p>'}`));
    }

    req._user = user; req._cookies = cookies; req._body = body; req._url = u; req._ip = ip;
    return routeApp(req, res);
  } catch (err) {
    try { send(res, 500, 'Internal error — the lab survived.'); } catch (e) { /* socket gone */ }
  }
});

async function routeApp(req, res) {
  const u = req._url, pathname = u.pathname, method = req.method;
  const body = req._body || {}, user = req._user, cookies = req._cookies || {}, ip = req._ip;
  const isMaintainer = (p) => user && (p.ownerId === user.id || p.maintainerIds.includes(user.id) || user.role === 'admin');

  /* ---- home / catalogue ---- */
  if (method === 'GET' && pathname === '/') {
    const listed = packages.filter((p) => p.listed);
    return send(res, 200, page(req, 'Registry', `<h1>HexaPackage Registry</h1>
      <p class="muted">Community package registry — publish, version and distribute software packages.</p>
      <form method="GET" action="/search"><input name="q" placeholder="Search packages…" size="40"> <button>Search</button></form>
      ${listed.map((p) => `<div class="card"><a href="/package/${esc(p.name)}"><b>${esc(p.name)}</b></a> — ${p.description}
        <br><span class="muted">by ${esc((userById(p.ownerId) || {}).name || '')} · ${p.downloads} downloads · versions: ${versionsOf(p.id).filter((v) => !v.unpublished).map((v) => esc(v.version)).join(', ')}</span>
        <br><a href="/download/${esc(p.name)}/${esc((versionsOf(p.id).filter((v) => !v.unpublished)[0] || {}).version || '')}">Download latest</a> · <a href="/stats/${esc(p.name)}">Stats</a></div>`).join('')}`));
  }
  if (method === 'GET' && pathname === '/search') {
    attempt('Search & Discovery');
    const q = String(u.searchParams.get('q') || '');
    let results;
    if (SQLI_RE.test(q)) {
      // Planted flaw: injected search dumps every package, listed or not.
      results = packages.slice();
      if (results.some((p) => !p.listed)) pass('search-sqli');
    } else {
      const needle = q.toLowerCase();
      results = packages.filter((p) => p.listed && (p.name.includes(needle) || p.description.toLowerCase().includes(needle)));
    }
    if (XSS_RE.test(q)) pass('reflected-xss'); // q is echoed raw below
    return send(res, 200, page(req, 'Search', `<h1>Search</h1>
      <form method="GET" action="/search"><input name="q" size="40" value="${esc(q)}"> <button>Search</button></form>
      <p>Results for ${q}:</p>
      ${results.map((p) => `<div class="card"><a href="/package/${esc(p.name)}"><b>${esc(p.name)}</b></a> — ${esc(p.description)} ${p.listed ? '' : '<b>(unlisted)</b>'}</div>`).join('') || '<p>No packages matched.</p>'}`));
  }

  /* ---- package pages & operations ---- */
  const pkgMatch = pathname.match(/^\/package\/([a-z0-9._-]+)(\/([a-z]+))?$/i);
  if (pkgMatch) {
    const pkg = pkgByName(pkgMatch[1]);
    const action = pkgMatch[3] || '';
    if (!pkg) return send(res, 404, page(req, 'Not found', '<h1>Package not found</h1>'));
    if (method === 'GET' && !action) {
      attempt('Packages & Versions');
      if (!pkg.listed && !isMaintainer(pkg)) return send(res, 404, page(req, 'Not found', '<h1>Package not found</h1>'));
      const owner = userById(pkg.ownerId) || {};
      const vs = versionsOf(pkg.id);
      // NOTE (planted flaw): description & README are rendered as raw HTML.
      return send(res, 200, page(req, pkg.name, `<h1>${esc(pkg.name)}</h1>
        <p>${pkg.description}</p>
        <p class="muted">Owner: <a href="/publisher/${pkg.ownerId}">${esc(owner.name || '')}</a> · Maintainers: ${pkg.maintainerIds.map((id) => esc((userById(id) || {}).name || '')).join(', ')} · ${pkg.downloads} downloads</p>
        <div class="card"><h3>README</h3><div>${String(pkg.readme || '').replace(/\n/g, '<br>')}</div></div>
        <div class="card"><h3>Versions</h3><table><tr><th>Version</th><th>Changelog</th><th>Content hash</th><th></th></tr>
        ${vs.map((v) => `<tr><td>${esc(v.version)}${v.unpublished ? ' (unpublished)' : ''}</td><td>${esc(v.changelog)}</td><td><code>${esc(v.hash)}</code></td><td>${v.unpublished ? '' : `<a href="/download/${esc(pkg.name)}/${esc(v.version)}">Download</a>`}</td></tr>`).join('')}</table>
        <p><a href="/stats/${esc(pkg.name)}">Download statistics</a></p></div>
        ${user ? `<div class="card"><h3>Publish a version</h3>
          <form method="POST" action="/package/${esc(pkg.name)}/publish"><input name="version" placeholder="Version e.g. 1.2.0" size="14"> <input name="changelog" placeholder="Changelog" size="30"> <input name="content" placeholder="Package content" size="24"> <button>Publish</button></form>
          <h3>Maintainers</h3>
          <form method="POST" action="/package/${esc(pkg.name)}/maintainers/add"><input name="email" placeholder="Publisher email" size="30"> <button>Add maintainer</button></form>
          <h3>Edit README / description</h3>
          <form method="POST" action="/package/${esc(pkg.name)}/readme"><input name="description" size="50" value="${esc(pkg.description)}"><br><textarea name="readme" rows="3" cols="60">${esc(pkg.readme)}</textarea><br><button>Save</button></form>
          <h3>Unpublish a version</h3>
          <form method="POST" action="/package/${esc(pkg.name)}/unpublish"><input name="version" placeholder="Version" size="14"> <button>Unpublish</button></form>
          ${pkg.ownerId !== user.id ? `<h3>Abandoned package?</h3>
          <form method="POST" action="/package/${esc(pkg.name)}/claim"><button>Claim ownership of this package</button></form>` : ''}
        </div>` : '<p><a href="/login">Sign in</a> to publish, maintain or claim packages.</p>'}`));
    }
    if (method === 'POST' && action === 'publish') {
      if (!user) return redirect(res, '/login');
      attempt('Packages & Versions');
      if (!isMaintainer(pkg)) return send(res, 403, page(req, 'Forbidden', '<p>Only maintainers may publish to this package (web UI).</p>'));
      const version = String(body.version || '').trim();
      if (!version) return redirect(res, `/package/${pkg.name}`);
      const hash = 'sha512-' + crypto.createHash('sha256').update(String(body.content || '')).digest('hex').slice(0, 16);
      const existing = versionsOf(pkg.id).find((v) => v.version === version);
      if (existing) {
        // Planted flaw: a published version can be silently overwritten.
        existing.hash = hash; existing.changelog = String(body.changelog || ''); existing.publishedBy = user.id; existing.unpublished = false;
        pass('version-overwrite');
      } else {
        versions.push({ id: nextId('version'), pkgId: pkg.id, version, hash, changelog: String(body.changelog || ''), publishedBy: user.id, at: new Date().toISOString(), unpublished: false });
      }
      return redirect(res, `/package/${pkg.name}`);
    }
    if (method === 'POST' && action === 'maintainers') return redirect(res, `/package/${pkg.name}`);
    if (method === 'POST' && pathname === `/package/${pkgMatch[1]}/maintainers/add`) { /* handled below */ }
    if (method === 'POST' && action === 'readme') {
      if (!user) return redirect(res, '/login');
      attempt('Packages & Versions');
      if (!isMaintainer(pkg)) return send(res, 403, page(req, 'Forbidden', '<p>Only maintainers may edit the README.</p>'));
      pkg.description = String(body.description || pkg.description);
      pkg.readme = String(body.readme || pkg.readme);
      if (XSS_RE.test(pkg.description) || XSS_RE.test(pkg.readme)) pass('readme-xss'); // stored & served raw
      return redirect(res, `/package/${pkg.name}`);
    }
    if (method === 'POST' && action === 'unpublish') {
      if (!user) return redirect(res, '/login');
      attempt('Packages & Versions');
      const v = versionsOf(pkg.id).find((x) => x.version === String(body.version || ''));
      if (v && !v.unpublished) {
        v.unpublished = true;
        // Planted flaw: no ownership check at all on this destructive action.
        if (!isMaintainer(pkg)) pass('unpublish-others');
      }
      return redirect(res, `/package/${pkg.name}`);
    }
    if (method === 'POST' && action === 'claim') {
      if (!user) return redirect(res, '/login');
      attempt('Packages & Versions');
      if (pkg.ownerId !== user.id) {
        // Planted flaw: the "abandoned package" claim never checks inactivity.
        pkg.ownerId = user.id;
        if (!pkg.maintainerIds.includes(user.id)) pkg.maintainerIds.push(user.id);
        pkg.lastActivity = new Date().toISOString();
        pass('claim-takeover');
      }
      return redirect(res, `/package/${pkg.name}`);
    }
  }
  if (method === 'POST' && pathname.match(/^\/package\/[a-z0-9._-]+\/maintainers\/add$/i)) {
    if (!user) return redirect(res, '/login');
    attempt('Packages & Versions');
    const pkg = pkgByName(pathname.split('/')[2]);
    const target = userByEmail(body.email);
    if (pkg && target && !pkg.maintainerIds.includes(target.id)) {
      const wasMaintainer = isMaintainer(pkg);
      pkg.maintainerIds.push(target.id);
      // Planted flaw: any signed-in user can add maintainers to ANY package.
      if (!wasMaintainer) pass('maintainer-takeover');
    }
    return redirect(res, pkg ? `/package/${pkg.name}` : '/');
  }

  /* ---- downloads & stats ---- */
  const dlMatch = pathname.match(/^\/download\/([a-z0-9._-]+)\/([A-Za-z0-9._-]+)$/i);
  if (method === 'GET' && dlMatch) {
    attempt('Downloads & Stats');
    const pkg = pkgByName(dlMatch[1]);
    const v = pkg && versionsOf(pkg.id).find((x) => x.version === dlMatch[2] && !x.unpublished);
    if (!pkg || !v) return send(res, 404, 'No such package version.');
    pkg.downloads += 1;
    downloadLog.push({ id: nextId('download'), pkgId: pkg.id, email: user ? user.email : 'anonymous@internet', ip, at: new Date().toISOString() });
    const now = Date.now();
    const win = (dlWindow.get(ip) || []).filter((t) => now - t < 60000); win.push(now); dlWindow.set(ip, win);
    if (win.length >= 20) pass('download-inflation'); // every hit counts, no dedup/throttle
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end(`(synthetic tarball) ${pkg.name}@${v.version} hash ${v.hash}\n`);
  }
  const stMatch = pathname.match(/^\/stats\/([a-z0-9._-]+)$/i);
  if (method === 'GET' && stMatch) {
    if (!user) return redirect(res, '/login');
    attempt('Downloads & Stats');
    const pkg = pkgByName(stMatch[1]);
    if (!pkg) return send(res, 404, page(req, 'Not found', '<h1>Package not found</h1>'));
    // Planted flaw: detailed stats (with downloader identities) shown to anyone signed in.
    if (!isMaintainer(pkg)) pass('stats-idor');
    const logs = downloadLog.filter((d) => d.pkgId === pkg.id).slice(-30).reverse();
    return send(res, 200, page(req, 'Stats', `<h1>Download stats — ${esc(pkg.name)}</h1>
      <p>Total downloads: <b>${pkg.downloads}</b></p>
      <table><tr><th>When</th><th>Downloader</th><th>IP</th></tr>
      ${logs.map((d) => `<tr><td>${esc(d.at)}</td><td>${esc(d.email)}</td><td>${esc(d.ip)}</td></tr>`).join('')}</table>`));
  }

  /* ---- dashboard & tokens ---- */
  if (method === 'GET' && pathname === '/dashboard') {
    if (!user) return redirect(res, '/login');
    const mine = packages.filter((p) => p.maintainerIds.includes(user.id));
    return send(res, 200, page(req, 'Dashboard', `<h1>My dashboard</h1>
      <p class="muted">${esc(user.name)} · ${esc(user.email)} · role ${esc(user.role)}</p>
      <h3>Packages I maintain</h3>
      ${mine.map((p) => `<div class="card"><a href="/package/${esc(p.name)}"><b>${esc(p.name)}</b></a> — ${p.downloads} downloads ${p.listed ? '' : '(unlisted)'}</div>`).join('') || '<p>None yet.</p>'}
      <p><a href="/tokens">Manage my publish tokens</a></p>`));
  }
  if (method === 'GET' && pathname === '/tokens') {
    if (!user) return redirect(res, '/login');
    attempt('Tokens & API');
    const mine = tokens.filter((t) => t.userId === user.id);
    return send(res, 200, page(req, 'Tokens', `<h1>My publish tokens</h1>
      <table><tr><th>ID</th><th>Label</th><th>Scope</th><th>Status</th><th></th></tr>
      ${mine.map((t) => `<tr><td>${t.id}</td><td>${esc(t.label)}</td><td>${esc(t.scope)}</td><td>${t.revoked ? 'revoked' : 'active'}</td><td><a href="/tokens/${t.id}">View</a></td></tr>`).join('')}</table>
      <form method="POST" action="/tokens/create"><input name="label" placeholder="Label" size="24">
      <select name="scope"><option value="publish">publish</option><option value="read">read</option></select> <button>Create token</button></form>
      <p class="muted">API docs: authenticate with <code>Authorization: Bearer &lt;token&gt;</code> on /api/v1/*. Legacy integrations may use the <code>X-Api-Key</code> header described in the migration guide.</p>`));
  }
  if (method === 'POST' && pathname === '/tokens/create') {
    if (!user) return redirect(res, '/login');
    attempt('Tokens & API');
    const scope = body.scope === 'read' ? 'read' : 'publish';
    tokens.push({ id: nextId('token'), userId: user.id, value: `hxpk_${scope}_${crypto.randomBytes(6).toString('hex')}`, label: String(body.label || 'token'), scope, revoked: false });
    return redirect(res, '/tokens');
  }
  const tokMatch = pathname.match(/^\/tokens\/(\d+)$/);
  if (method === 'GET' && tokMatch) {
    if (!user) return redirect(res, '/login');
    attempt('Tokens & API');
    const t = tokens.find((x) => x.id === Number(tokMatch[1]));
    if (!t) return send(res, 404, page(req, 'Not found', '<h1>Token not found</h1>'));
    // Planted flaw: no ownership check — any signed-in user can read any token.
    if (t.userId !== user.id) pass('token-idor');
    const owner = userById(t.userId) || {};
    return send(res, 200, page(req, 'Token', `<h1>Token #${t.id}</h1>
      <p>Label: ${esc(t.label)} · Scope: ${esc(t.scope)} · Owner: ${esc(owner.email || '')} · Status: ${t.revoked ? 'revoked' : 'active'}</p>
      <p>Value: <code>${esc(t.value)}</code></p>
      <form method="POST" action="/tokens/${t.id}/revoke"><button>Revoke this token</button></form>`));
  }
  const tokRevoke = pathname.match(/^\/tokens\/(\d+)\/revoke$/);
  if (method === 'POST' && tokRevoke) {
    if (!user) return redirect(res, '/login');
    attempt('Tokens & API');
    const t = tokens.find((x) => x.id === Number(tokRevoke[1]));
    if (t) t.revoked = true;
    return redirect(res, '/tokens');
  }

  /* ---- API ---- */
  function apiAuth() {
    const auth = String(req.headers.authorization || '');
    if (auth.startsWith('Bearer ')) {
      const t = tokens.find((x) => x.value === auth.slice(7) && !x.revoked);
      if (t) return { user: userById(t.userId), token: t, derived: false };
    }
    const legacy = String(req.headers['x-api-key'] || '');
    if (legacy) {
      // Planted flaw: the "legacy API key" is just the base64 of the account email.
      const acct = users.find((x) => Buffer.from(x.email, 'utf8').toString('base64') === legacy);
      if (acct) return { user: acct, token: null, derived: true };
    }
    return null;
  }
  if (method === 'GET' && pathname === '/api/v1/me') {
    attempt('Tokens & API');
    const a = apiAuth();
    if (!a || !a.user) return json(res, 401, { error: 'unauthorized' });
    if (a.derived) pass('weak-api-key');
    return json(res, 200, { id: a.user.id, email: a.user.email, role: a.user.role });
  }
  const apiPkg = pathname.match(/^\/api\/v1\/packages\/([a-z0-9._-]+)$/i);
  if (method === 'GET' && apiPkg) {
    attempt('Tokens & API');
    const a = apiAuth();
    if (!a || !a.user) return json(res, 401, { error: 'unauthorized' });
    if (a.derived) pass('weak-api-key');
    const pkg = pkgByName(apiPkg[1]);
    if (!pkg) return json(res, 404, { error: 'no such package' });
    const allowed = pkg.listed || pkg.ownerId === a.user.id || pkg.maintainerIds.includes(a.user.id) || a.user.role === 'admin';
    if (!allowed) pass('api-package-idor'); // data is returned anyway — the flaw
    return json(res, 200, { name: pkg.name, owner: (userById(pkg.ownerId) || {}).email, maintainers: pkg.maintainerIds.map((id) => (userById(id) || {}).email), listed: pkg.listed, downloads: pkg.downloads, description: pkg.description, versions: versionsOf(pkg.id).map((v) => ({ version: v.version, hash: v.hash, changelog: v.changelog, unpublished: v.unpublished })) });
  }
  if (method === 'POST' && pathname === '/api/v1/publish') {
    attempt('Tokens & API');
    const a = apiAuth();
    if (!a || !a.user) return json(res, 401, { error: 'unauthorized' });
    if (a.derived) pass('weak-api-key');
    if (!a.token) return json(res, 401, { error: 'a publish token is required' });
    const pkg = pkgByName(body.package);
    if (!pkg) return json(res, 404, { error: 'no such package' });
    const version = String(body.version || '').trim();
    if (!version) return json(res, 400, { error: 'version required' });
    // Planted flaw: the token's scope is never checked — a read token publishes.
    if (a.token.scope !== 'publish') pass('token-scope');
    const hash = 'sha512-' + crypto.createHash('sha256').update(String(body.content || '')).digest('hex').slice(0, 16);
    const existing = versionsOf(pkg.id).find((v) => v.version === version);
    if (existing) { existing.hash = hash; existing.changelog = String(body.changelog || ''); existing.publishedBy = a.user.id; existing.unpublished = false; pass('version-overwrite'); }
    else versions.push({ id: nextId('version'), pkgId: pkg.id, version, hash, changelog: String(body.changelog || ''), publishedBy: a.user.id, at: new Date().toISOString(), unpublished: false });
    return json(res, 200, { ok: true, package: pkg.name, version, hash });
  }
  if (pathname.startsWith('/api/')) return json(res, 404, { error: 'not found' });

  /* ---- admin ---- */
  const effectiveAdmin = user && (user.role === 'admin' || cookies.hx_role === 'admin');
  if (method === 'GET' && pathname === '/admin') {
    if (!user) return redirect(res, '/login');
    attempt('Admin Panel');
    if (!effectiveAdmin) return send(res, 403, page(req, 'Forbidden', '<h1>Admins only</h1><p>Your account role is not admin.</p>'));
    // Planted flaw: a forged hx_role cookie is enough to reach this panel.
    if (user.role !== 'admin' && cookies.hx_role === 'admin') pass('cookie-role');
    return send(res, 200, page(req, 'Admin', `<h1>Registry admin</h1>
      <h3>Users</h3><table><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Active</th><th></th></tr>
      ${users.map((x) => `<tr><td>${x.id}</td><td>${x.name}</td><td>${esc(x.email)}</td><td>${esc(x.role)}</td><td>${x.active}</td><td>${x.active ? `<a href="/admin/users/${x.id}/deactivate">Deactivate</a>` : ''}</td></tr>`).join('')}</table>
      <h3>Packages</h3><table><tr><th>Name</th><th>Owner</th><th>Listed</th><th>Downloads</th></tr>
      ${packages.map((p) => `<tr><td>${esc(p.name)}</td><td>${esc((userById(p.ownerId) || {}).email || '')}</td><td>${p.listed}</td><td>${p.downloads}</td></tr>`).join('')}</table>`));
  }
  const admMatch = pathname.match(/^\/admin\/users\/(\d+)\/deactivate$/);
  if (method === 'GET' && admMatch) {
    if (!user) return redirect(res, '/login');
    attempt('Admin Panel');
    if (!effectiveAdmin) return send(res, 403, page(req, 'Forbidden', '<h1>Admins only</h1>'));
    const target = userById(Number(admMatch[1]));
    if (target && target.active) {
      target.active = false;
      // Planted flaw: a state-changing admin action performed by a plain GET link.
      pass('admin-csrf');
    }
    return redirect(res, '/admin');
  }

  /* ---- debug ---- */
  if (method === 'GET' && pathname === '/debug') {
    attempt('Platform & Exposure');
    pass('debug-exposure'); // planted flaw: full state, incl. secrets, to anyone
    return json(res, 200, { users, tokens, packages, versions, note: 'debug dump — should never ship' });
  }

  /* ---- lab system pages ---- */
  if (method === 'GET' && pathname === '/tests') {
    const P = progressView();
    const groups = FEATURES.map((f) => {
      const ft = TESTS.filter((t) => t.feature === f);
      return `<div class="card"><h3>${esc(f)} — ${ft.filter((t) => progress.tests[t.id]).length}/${ft.length} done · attempts: ${progress.attempts[f] || 0}</h3>
      ${ft.map((t) => `<div style="margin:8px 0"><b>${progress.tests[t.id] ? '✓' : '○'} ${esc(t.name)}</b> <span class="muted">${esc(t.owasp)} · ${esc(t.difficulty)}</span>
        <details><summary>Hints</summary><ol>${t.hints.map((h) => `<li>${esc(h)}</li>`).join('')}</ol></details></div>`).join('')}</div>`;
    }).join('');
    return send(res, 200, page(req, 'Mission', `<h1>Mission — LAB ${LAB_NUMBER} ${LAB_NAME}</h1>
      <div class="flash">Progress: <b>${P.done}/${P.total} tests · ${P.pct}%</b> ${P.complete ? '— LAB COMPLETE! See <a href="/complete">your completion page</a>.' : '— complete every test to reach 100%, reveal the completion key and earn your certificate.'}</div>
      ${groups}`));
  }
  if (method === 'POST' && pathname === '/complete/name') {
    progress.testerName = String(body.name || '').slice(0, 60);
    saveProgress();
    return redirect(res, '/certificate');
  }
  if (method === 'GET' && pathname === '/complete') {
    const P = progressView();
    if (!P.complete) {
      const left = TESTS.filter((t) => !progress.tests[t.id]);
      return send(res, 200, page(req, 'Not yet', `<h1>Lab not complete yet</h1>
        <p>Progress: <b>${P.done}/${P.total} tests · ${P.pct}%</b>. Still open:</p>
        <ul>${left.map((t) => `<li>${esc(t.name)} <span class="muted">(${esc(t.feature)})</span></li>`).join('')}</ul>
        <p><a href="/tests">Back to the Mission page</a></p>`));
    }
    const byFeature = FEATURES.map((f) => `<li><b>${esc(f)}</b>: ${TESTS.filter((t) => t.feature === f).length} vulnerabilities</li>`).join('');
    return send(res, 200, page(req, 'Lab complete', `<h1>★ LAB ${LAB_NUMBER} — ${LAB_NAME} COMPLETE</h1>
      <div class="card"><h3>1 · Total features in this lab</h3><p>${FEATURES.length} features: ${FEATURES.map(esc).join(', ')}</p>
      <h3>2 · Vulnerabilities per feature</h3><ul>${byFeature}</ul>
      <h3>3 · Ways testing was done</h3><p>${P.total} tests completed, one per technique:</p><ul>${TESTS.map((t) => `<li>${esc(t.name)} <span class="muted">(${esc(t.owasp)})</span></li>`).join('')}</ul></div>
      <div class="card"><h3>4 · What you learned</h3><ul>${TESTS.map((t) => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('')}</ul></div>
      <div class="card"><h3>5 · What this means for a real client</h3><ul>${TESTS.map((t) => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('')}</ul></div>
      <div class="card"><h3>6 · Writing it in a real report</h3><table><tr><th>Finding</th><th>Severity</th><th>Remediation</th></tr>
      ${TESTS.map((t) => `<tr><td>${esc(t.report.title)}</td><td>${esc(t.report.severity)}</td><td>${esc(t.report.remediation)}</td></tr>`).join('')}</table></div>
      <div class="card"><h3>Your completion key for Lab ${LAB_NUMBER + 1}</h3>
      <p style="font-size:20px"><code>${esc(completionKey())}</code></p>
      <p class="muted">Paste this key into Lab ${LAB_NUMBER + 1} to unlock it.</p>
      <form method="POST" action="/complete/name"><label>Your name for the certificate<br><input name="name" size="40" value="${esc(progress.testerName)}"></label> <button>Save & view certificate</button></form>
      <p><a class="btn" href="/certificate">View certificate</a></p></div>`));
  }
  if (method === 'GET' && pathname === '/certificate') {
    const P = progressView();
    if (!P.complete) return redirect(res, '/complete');
    const name = progress.testerName || (user ? user.name : 'Security Tester');
    const date = progress.completedAt ? new Date(progress.completedAt).toDateString() : new Date().toDateString();
    return send(res, 200, `<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER}</title>
<style>body{font-family:Georgia,serif;background:#f1f5f9;padding:30px}.card{max-width:720px;margin:0 auto;background:#fff;border:3px double #2563eb;border-radius:12px;padding:36px;text-align:center}@media print{.noPrint{display:none}}</style></head>
<body><div class="card">
<img src="/logo.png" alt="HexaCyberLab" style="height:64px">
<h1 style="margin:8px 0">Certificate of Completion</h1>
<p>This certifies that</p>
<h2 style="margin:6px 0">${esc(name)}</h2>
<p>has completed 100% of the security tests in</p>
<h3>LAB ${LAB_NUMBER} — ${LAB_NAME} (${P.total} tests across ${FEATURES.length} features)</h3>
<p>${esc(date)}</p>
<p style="margin-top:20px"><b>HexaCyberLab</b> — Built by Md. Jony Hassain, Founder</p>
</div>
<p class="noPrint" style="text-align:center"><a href="/complete">Back to completion page</a> · Use your browser's Print → Save as PDF to keep this certificate.</p>
</body></html>`);
  }

  return send(res, 404, page(req, 'Not found', '<h1>404 — not found</h1>'));
}

/* ================= Docs generation (from the registry, §8) ================= */
function genDocs() {
  const byF = (f) => TESTS.filter((t) => t.feature === f);
  const readme = `# HexaPackage — LAB ${LAB_NUMBER} of 110 (Category 3: API & Developer Platforms)

An **intentionally vulnerable** software package registry for hands-on web security practice.
Publishers hold accounts, own packages with maintainers, publish immutable-in-theory versions,
manage publish tokens (read/publish scopes) and watch download statistics.

> ⚠️ **LOCAL USE ONLY.** Zero-dependency Node.js, binds \`127.0.0.1:${PORT}\` only. All data is
> synthetic and in-memory (restart resets the app). Never deploy this anywhere.

## Run it
\`\`\`bash
node server.js          # then open http://127.0.0.1:${PORT}
# or: docker compose up --build
\`\`\`

## The Lab System
- **Sequential unlock:** this lab starts locked. Paste the completion key earned in Lab ${LAB_NUMBER - 1}
  into the gate (\`POST /unlock\`). Keys are never stored whole in the code — they are split into
  encoded shards scattered through \`server.js\` and assembled only at verification/reveal time.
- **Progress:** ${TESTS.length} scored tests across ${FEATURES.length} features. A test passes only when the server
  detects the real exploit effect — never by clicking. Watch progress in the header bar or \`GET /api/progress\`.
- **Mission page:** \`/tests\` groups every test by feature, with 3 graded hints each.
- **Lab Coach chatbot:** on every page. It answers counts/names freely, but step-by-step guidance
  for a feature unlocks only after **3 genuine attempts** on that feature. The completion key is
  revealed to the coach (and on \`/complete\`) only at 100%.
- **Persistence:** progress lives in \`progress.json\` (generated state — do not commit). Restart
  the server and your % and attempt counts resume exactly where you left them.
- **Completion:** at 100%, \`/complete\` shows the six-section debrief (features, per-feature counts,
  techniques, lessons, client impact, report writing), the Lab ${LAB_NUMBER + 1} key, and \`/certificate\`
  renders a printable certificate with the HexaCyberLab logo.

## Test accounts (synthetic)
| Email | Password | Role |
|---|---|---|
| admin@hexapackages.local | Admin@123 | admin |
| priya@hexapackages.local | Priya@123 | publisher (owns dataforge, internal-tools) |
| marco@hexapackages.local | Marco@123 | publisher (owns swiftcache, webutils) |
| sara@hexapackages.local | Sara@123 | publisher (maintainer of dataforge) |
| demo@hexapackages.local | demo123 | user (documented default) |

Seeded API token for the demo account (read scope): shown on its token page in-app.

## Files
- \`server.js\` — the whole lab (app + lab system), zero dependencies
- \`VULNERABILITIES.md\` — the full test map by feature · \`PRACTICE-GUIDE.md\` — challenges & hints
- \`FIX-AND-RETEST.md\` — secure implementation + regression check per test
- \`progress.json\` — generated runtime state (not committed)

Built by Md. Jony Hassain, Founder of HexaCyberLab.
`;
  const vuln = `# HexaPackage — Vulnerability Map (${TESTS.length} scored tests)

${FEATURES.map((f) => `## ${f}\n\n${byF(f).map((t) => `### ${t.name}\n- **OWASP:** ${t.owasp} · **Difficulty:** ${t.difficulty}\n- **Where:** the ${f} surface of the registry.\n- **Exploitation outline:** ${t.hints[2]}\n- **Impact:** ${t.impact}`).join('\n\n')}`).join('\n\n')}
`;
  const diffOrder = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  const practice = `# HexaPackage — Practice Guide

Challenges grouped by feature, then difficulty. Each challenge lists its 3 graded hints
(same hints as the in-app Mission page at \`/tests\`) and a measurable objective.

${FEATURES.map((f) => `## ${f}\n\n${byF(f).slice().sort((a, b) => diffOrder[a.difficulty] - diffOrder[b.difficulty]).map((t) => `### ${t.name} (${t.difficulty} · ${t.owasp})\n**Objective:** make the server record this test as passed (watch the header progress bar / \`/api/progress\`).\nHints:\n1. ${t.hints[0]}\n2. ${t.hints[1]}\n3. ${t.hints[2]}`).join('\n\n')}`).join('\n\n')}
`;
  const fix = `# HexaPackage — Fix & Retest

For every scored test: the secure implementation pattern and a regression check proving
the exploit no longer works.

${TESTS.map((t) => `## ${t.name} — ${t.report.severity}\n- **Finding (report title):** ${t.report.title}\n- **Secure implementation:** ${t.report.remediation}\n- **Regression test:** re-run the original exploit steps from PRACTICE-GUIDE.md and confirm the attack is rejected (4xx / generic error) and the test no longer triggers on the fixed build.`).join('\n\n')}
`;
  fs.writeFileSync(path.join(__dirname, 'README.md'), readme);
  fs.writeFileSync(path.join(__dirname, 'VULNERABILITIES.md'), vuln);
  fs.writeFileSync(path.join(__dirname, 'PRACTICE-GUIDE.md'), practice);
  fs.writeFileSync(path.join(__dirname, 'FIX-AND-RETEST.md'), fix);
  console.log('Docs generated from registry:', TESTS.length, 'tests,', FEATURES.length, 'features.');
}
if (process.argv.includes('--docs')) { genDocs(); process.exit(0); }

server.listen(PORT, HOST, () => {
  console.log(`LAB ${LAB_NUMBER} — ${LAB_NAME} running at http://${HOST}:${PORT} (local only, intentionally vulnerable)`);
});
