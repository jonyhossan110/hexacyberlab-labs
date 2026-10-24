'use strict';
/*
 * HexaNewsletter — LAB 88 (Category 9: Media, Social & Community)
 * A deliberately vulnerable newsletter SaaS for local security practice.
 * Publications, subscribers, campaigns, templates, paid issues, analytics, API keys.
 * Zero-dependency Node.js. Binds 127.0.0.1 only. All data is fake seed data.
 * All "email sending" is simulated in-app — nothing ever leaves this process.
 * WARNING: intentionally insecure. Run locally only. Never deploy.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3097;
const HOST = '127.0.0.1';
const LAB_NUMBER = 88;
const LAB_NAME = 'HexaNewsletter';
const PREV_LAB = 87;
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');

/* ---- presentation theme tokens (shard region 1) ---- */
const _cfgA = ["TC1YSA==","Ui04OA=="];
const THEME = { accent: '#7c5cff', accent2: '#00b3a4', ink: '#1c1c28', paper: '#f6f5fb' };

/* ================= progress state ================= */
function loadState() {
  try {
    const s = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    if (s && typeof s === 'object') {
      return Object.assign({ unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false }, s);
    }
  } catch (e) { /* fresh install */ }
  return { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
}
let state = loadState();
function save() { try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2)); } catch (e) {} }

/* ================= in-memory fake seed data ================= */
let nextUserId = 100, nextPubId = 100, nextSubId = 1000, nextCampId = 100, nextTplId = 100;
const users = [
  { id: 1, name: 'Platform Admin', email: 'admin@hexanews.local', password: 'admin123', role: 'admin', plan: 'owner', apiKey: 'hn_live_admin_51cd', pubId: 0 },
  { id: 2, name: 'Alice Author', email: 'alice@hexanews.local', password: 'alice123', role: 'author', plan: 'pro', apiKey: 'hn_live_alice_9f2k', pubId: 1 },
  { id: 3, name: 'Bob Blogger', email: 'bob@hexanews.local', password: 'bob123', role: 'author', plan: 'free', apiKey: 'hn_live_bob_77qx', pubId: 2 },
  { id: 4, name: 'Demo Dan', email: 'demo@hexanews.local', password: 'demo', role: 'author', plan: 'free', apiKey: 'hn_live_demo_00aa', pubId: 3 }
];
const publications = [
  { id: 1, ownerId: 2, name: 'The Security Digest', desc: 'Weekly web security notes for builders.', paid: true, price: 5, published: true },
  { id: 2, ownerId: 3, name: 'Bobs Travel Tales', desc: 'Stories and photos from the road.', paid: false, price: 0, published: true },
  { id: 3, ownerId: 4, name: 'Demo Daily', desc: 'The demo publication.', paid: false, price: 0, published: true },
  { id: 4, ownerId: 2, name: 'Secret Launch Notes', desc: 'Unannounced product launch plans.', paid: false, price: 0, published: false }
];
const issues = [
  { id: 1, pubId: 1, title: 'Issue 12: Session Safety', paid: false, draft: false, body: 'Free issue body: how sessions fail and how to test them.' },
  { id: 2, pubId: 1, title: 'Issue 13: Premium Deep Dive', paid: true, draft: false, body: 'FULL PREMIUM CONTENT: the complete deep dive, templates and checklists for paying subscribers only.' },
  { id: 3, pubId: 1, title: 'Issue 14: Launch Draft', paid: false, draft: true, body: 'DRAFT — not yet published. Internal launch notes that readers must never see early.' },
  { id: 4, pubId: 2, title: 'Lisbon on Foot', paid: false, draft: false, body: 'A walking tour of Lisbon in three days.' }
];
const subscribers = [
  { id: 1, pubId: 1, name: 'Carol Reader', email: 'carol@mail.test', tier: 'paid', status: 'active', unsubToken: 'tok-carol-881x' },
  { id: 2, pubId: 1, name: 'Dave Reader', email: 'dave@mail.test', tier: 'free', status: 'active', unsubToken: 'tok-dave-552q' },
  { id: 3, pubId: 2, name: 'Erin Reader', email: 'erin@mail.test', tier: 'free', status: 'active', unsubToken: 'tok-erin-903z' },
  { id: 4, pubId: 2, name: 'Frank Reader', email: 'frank@mail.test', tier: 'free', status: 'active', unsubToken: 'tok-frank-117m' },
  { id: 5, pubId: 3, name: 'Grace Reader', email: 'grace@mail.test', tier: 'free', status: 'active', unsubToken: 'tok-grace-640w' }
];
const campaigns = [
  { id: 1, ownerId: 2, pubId: 1, subject: 'Issue 12 is out', body: 'Read the new issue.', templateId: 0, sentTo: 2, opens: 6, clicks: 3 },
  { id: 2, ownerId: 3, pubId: 2, subject: 'Lisbon photos', body: 'New travel post.', templateId: 0, sentTo: 2, opens: 4, clicks: 1 }
];
const templates = [
  { id: 1, ownerId: 2, name: 'Digest Header', html: '<div class="hdr">The Security Digest</div>' },
  { id: 2, ownerId: 3, name: 'Travel Header', html: '<div class="hdr">Bobs Travel Tales</div>' }
];
const sessions = {};        // sid -> userId
const loginFails = {};      // email -> failed count
const enumProbes = {};      // ip -> Set of probed emails
const resetTokens = {};     // email -> issued token

const XSS_RE = /<script|onerror\s*=|onload\s*=|<svg|<img|<iframe|javascript:/i;
const INJ_RE = /'\s*(--|#|or\b|and\b|=)/i;

function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function resetFormula(u) { return 'rst-' + u.id + '-' + (u.id * 137 + 42); }
function pubById(id) { return publications.find(p => p.id === Number(id)); }
function userById(id) { return users.find(u => u.id === Number(id)); }

/* ---- mail-merge tokens (shard region 2) ---- */
const _cfgB = ["NVE5Sw==","LUdIOQ=="];
const MERGE_TAGS = ['{{name}}', '{{email}}', '{{unsubscribe_url}}'];

/* ================= TESTS registry ================= */
const F = {
  LOGIN: 'Login & Authentication',
  REG: 'Registration & Profile',
  PUBS: 'Publications & Paid Content',
  SEARCH: 'Search',
  SUBS: 'Subscribers & Lists',
  CAMP: 'Campaigns & Templates',
  API: 'Analytics & API',
  ADMIN: 'Admin Panel'
};
const TESTS = [
  /* ---- Login & Authentication (6) ---- */
  { id: 'sqli-login', feature: F.LOGIN, name: 'SQL Injection Login Bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login query is built by string concatenation.', "Try an email that closes the string early, like admin@hexanews.local' -- ", "A comment sequence after a valid email makes the password check disappear."],
    lesson: 'String-built queries let an attacker rewrite the login logic itself; parameterized queries make input data, never code.',
    impact: "On a real client's SaaS, this is a full account takeover of any user — including the owner — with no password at all.",
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterized queries / prepared statements for all database access and add injection regression tests.' } },
  { id: 'brute-force', feature: F.LOGIN, name: 'Brute Force — No Rate Limiting or Lockout', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['Nothing slows down repeated password guesses.', 'Fail the same account 10 times in a row and watch what does not happen.', 'No CAPTCHA, no delay, no lockout — the 10th failure is processed like the 1st.'],
    lesson: 'Without throttling, online password guessing is only a matter of time and wordlists.',
    impact: 'Attackers can guess weak passwords against real customer accounts at full speed, leading to account takeovers and support chaos.',
    report: { title: 'Missing Rate Limiting on Login Allows Unlimited Password Guessing', severity: 'High', remediation: 'Add per-account and per-IP throttling, exponential backoff and lockout/alerting after repeated failures.' } },
  { id: 'user-enum', feature: F.LOGIN, name: 'User Enumeration via Response Differences', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the exact wording for a real email vs an invented one.', 'Both the login form and the forgot-password form answer differently.', 'Probe 5 different emails across login/forgot and collect the differences.'],
    lesson: 'Different error messages for "no such account" and "wrong password" hand attackers a free list of valid users.',
    impact: 'Attackers learn exactly which email addresses hold accounts, focusing phishing and password attacks where they will work.',
    report: { title: 'User Enumeration Through Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message for all authentication failures and password-reset requests.' } },
  { id: 'default-creds', feature: F.LOGIN, name: 'Published Demo Credentials', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['The login page itself tells you a working password.', 'Read the small print under the login form.', 'Sign in as the demo account exactly as the page suggests.'],
    lesson: 'Demo and default accounts shipped to production are working keys left in the door.',
    impact: 'Anyone on the internet can sign in with the published demo login and explore the product as a real user — a beachhead for deeper attacks.',
    report: { title: 'Demo Account With Published Credentials Active in Production', severity: 'High', remediation: 'Remove demo/default accounts from production or force unique, unguessable passwords and disable them by default.' } },
  { id: 'predictable-reset', feature: F.LOGIN, name: 'Predictable Password-Reset Token', owasp: 'A07:2021 Authentication Failures', difficulty: 'Intermediate',
    hints: ['Reset tokens are computed, not random.', 'The token contains the user id — and simple arithmetic on it.', 'Compute rst-<id>-<id*137+42> for a user who never requested a reset, then use it.'],
    lesson: 'Reset tokens must be unguessable random values; anything derived from public data like a user id can be forged for every account.',
    impact: 'An attacker can reset the password of any account — including the platform admin — and lock the real owner out.',
    report: { title: 'Password Reset Tokens Are Predictable (Derived From User ID)', severity: 'Critical', remediation: 'Generate reset tokens from a CSPRNG (at least 128 bits), store only a hash, and expire them quickly.' } },
  { id: 'cookie-role', feature: F.LOGIN, name: 'Role Cookie Tampering (hx_role)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After login, inspect the cookies the app trusts.', 'One cookie repeats your role — and the server believes the copy you send back.', 'Set hx_role=admin in your browser and visit /admin.'],
    lesson: 'Authorization data must live server-side; anything stored in a client cookie can be edited by the client.',
    impact: 'Any free user can promote themselves to platform admin, exposing every customer, publication and password on the service.',
    report: { title: 'Client-Controlled Role Cookie Grants Administrative Access', severity: 'Critical', remediation: 'Determine roles only from the server-side session record; never trust role values supplied by the client.' } },
  /* ---- Registration & Profile (4) ---- */
  { id: 'weak-password', feature: F.REG, name: 'Weak Password Policy (1-Character Passwords)', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['Try registering with the shortest password you can think of.', 'There is no minimum length or complexity check at all.', 'A single character is accepted as a password.'],
    lesson: 'If the product allows one-character passwords, users will choose them — policy is the only defence.',
    impact: 'Customer accounts protected by trivial passwords fall to the first guessing attempt, and the business owns the breach headlines.',
    report: { title: 'No Minimum Password Strength Enforced at Registration', severity: 'Medium', remediation: 'Enforce a minimum length (12+) and screen new passwords against known-breached lists.' } },
  { id: 'mass-assignment', feature: F.REG, name: 'Mass Assignment — Role, Plan & API Key', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration endpoint copies the whole request body onto the new user.', 'Add fields the form never shows: role, plan, apiKey.', 'Register with role=admin (or plan=pro) and check what your account became.'],
    lesson: 'Binding request bodies directly to data models lets attackers set fields that were never offered to them.',
    impact: 'Attackers mint themselves admin accounts or free Pro plans with self-chosen API keys — privilege escalation and revenue loss in one request.',
    report: { title: 'Mass Assignment in Registration Allows Role/Plan/API-Key Injection', severity: 'High', remediation: 'Whitelist exactly the fields a client may set at registration; assign role, plan and keys server-side only.' } },
  { id: 'stored-xss', feature: F.REG, name: 'Stored XSS in Display Name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is printed back on pages other people see — including the admin panel.', 'Names are stored and rendered without escaping.', 'Register with a name like <script>alert(1)</script> and find where it lands raw.'],
    lesson: 'Any user-controlled text rendered unescaped becomes code in other users\' browsers.',
    impact: 'An attacker plants a script in their profile name that fires in the admin panel, stealing staff sessions and taking over the platform.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-encode all user-supplied output and add a Content-Security-Policy as defence in depth.' } },
  { id: 'profile-csrf', feature: F.REG, name: 'CSRF on Profile Update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Profile updates are accepted from plain POSTs.', 'The app sets an hx_origin marker cookie and its own forms include it — forged requests will not.', 'POST /profile with a new name and no hx_origin field at all.'],
    lesson: 'State-changing requests without an anti-CSRF token can be triggered by any website the victim visits.',
    impact: 'A malicious page could silently rename or alter customer profiles while they are logged in, eroding trust and enabling follow-on fraud.',
    report: { title: 'Missing Anti-CSRF Token on Profile Update', severity: 'Medium', remediation: 'Require a per-session CSRF token on every state-changing request and verify Origin/Referer as a second layer.' } },
  /* ---- Publications & Paid Content (3) ---- */
  { id: 'paid-preview-bypass', feature: F.PUBS, name: 'Paid Issue Full Text via Preview Parameter', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Paid issues show only a teaser — unless the app thinks you are previewing.', 'Try adding a preview flag to the issue URL.', 'GET the premium issue with ?preview=1 and read the full text.'],
    lesson: 'Debug and preview modes must enforce the same paywall as production paths.',
    impact: 'Every paying article is free to anyone who adds one parameter — the publication\'s entire subscription revenue model collapses.',
    report: { title: 'Paywall Bypass via Preview Parameter Exposes Paid Content', severity: 'High', remediation: 'Enforce entitlement checks on every content path, including preview and debug modes.' } },
  { id: 'paid-tier-forgery', feature: F.PUBS, name: 'Paid Subscriber Tier Forged Without Payment', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The public subscribe form only offers the free tier — the endpoint accepts more.', 'The tier is taken from the request, not from a payment.', 'Subscribe to a paid publication while posting tier=paid.'],
    lesson: 'Never let the client declare what they paid for; entitlement must come from a verified payment record.',
    impact: 'Anyone becomes a "paid" subscriber for free, reading premium issues and inflating the metrics the business sells on.',
    report: { title: 'Client-Supplied Subscription Tier Allows Free Paid Access', severity: 'High', remediation: 'Set subscription tier only from confirmed payment events on the server; ignore client-supplied tier values.' } },
  { id: 'draft-issue-leak', feature: F.PUBS, name: 'Unpublished Draft Issue Served by Direct URL', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Issue ids are small sequential numbers.', 'Drafts are hidden from listings — but are they hidden from the issue page itself?', 'Open the draft issue id directly while signed in as a different author.'],
    lesson: 'Hiding an item from listings is not access control; every object read needs an ownership/state check.',
    impact: 'Unannounced launches, embargoed stories and internal notes leak early, damaging the publication and its partners.',
    report: { title: 'Draft Content Accessible by Direct URL (Missing State Check)', severity: 'Medium', remediation: 'Check publication state and ownership on every object access, not just in listing pages.' } },
  /* ---- Search (2) ---- */
  { id: 'search-sqli', feature: F.SEARCH, name: 'SQL Injection in Search Leaks Unpublished Publications', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Search builds its query the same broken way login does.', 'A quote plus OR logic widens the result set dramatically.', "Search for ' OR '1'='1 and look for a publication that is not public."],
    lesson: 'Injection in a "harmless" search box can dump data the UI never shows, including unpublished records.',
    impact: 'Attackers enumerate every publication — including secret, unannounced ones — through a single search request.',
    report: { title: 'SQL Injection in Search Exposes Unpublished Publications', severity: 'High', remediation: 'Parameterize search queries and apply publication-state filters in the data layer.' } },
  { id: 'search-xss', feature: F.SEARCH, name: 'Reflected XSS in Search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your search term is printed back at the top of the results.', 'It is printed without escaping.', 'Search for a <script> payload and view the page source.'],
    lesson: 'Reflected input must be encoded on output, even in something as small as a "results for" label.',
    impact: 'A crafted search link executes script in a victim\'s browser, enabling session theft and phishing under the real domain.',
    report: { title: 'Reflected Cross-Site Scripting in Search Results', severity: 'Medium', remediation: 'HTML-encode reflected values and deploy a restrictive Content-Security-Policy.' } },
  /* ---- Subscribers & Lists (3) ---- */
  { id: 'export-idor', feature: F.SUBS, name: 'Subscriber List Export IDOR', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Exports are addressed by publication id alone.', 'Nobody checks that the publication belongs to you.', 'Download /subs/export?pub=1 while signed in as Bob.'],
    lesson: 'Every export endpoint needs an ownership check — a CSV of emails is the most sensitive asset a newsletter business owns.',
    impact: 'A competitor downloads the full subscriber email list of any publication — a GDPR breach and the theft of the business\'s core asset.',
    report: { title: 'Broken Access Control on Subscriber Export (IDOR) Exposes Email Lists', severity: 'Critical', remediation: 'Verify object ownership server-side on every export and download endpoint.' } },
  { id: 'import-idor', feature: F.SUBS, name: 'Subscriber Import Into Another User\'s Publication', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Import takes a publication id and a CSV — ownership is never asked.', 'You can write into lists you do not own.', 'POST a CSV import aimed at publication 1 while signed in as Bob.'],
    lesson: 'Write endpoints need the same ownership checks as reads; otherwise attackers poison data they cannot even see.',
    impact: 'Attackers inject fake or malicious subscribers into a rival\'s list, wrecking deliverability and getting the victim\'s domain blacklisted.',
    report: { title: 'Missing Ownership Check on Subscriber Import Allows List Poisoning', severity: 'High', remediation: 'Authorize the target publication\'s ownership before accepting any imported rows.' } },
  { id: 'unsub-token-forge', feature: F.SUBS, name: 'Unsubscribe Token Forgery', owasp: 'A07:2021 Authentication Failures', difficulty: 'Intermediate',
    hints: ['Unsubscribe links carry a token — but a second, simpler token also works.', 'Think about what an attacker knows: just the subscriber id.', 'Try token unsub-<subscriberId> on the unsubscribe endpoint.'],
    lesson: 'Action tokens in emails must be unguessable; a formula based on the record id is public knowledge.',
    impact: 'Anyone can unsubscribe every subscriber of a publication one id at a time, silently destroying its audience.',
    report: { title: 'Unsubscribe Tokens Are Forgeable From Subscriber IDs', severity: 'High', remediation: 'Use long random per-subscriber tokens, stored hashed, and rate-limit unsubscribe attempts.' } },
  /* ---- Campaigns & Templates (3) ---- */
  { id: 'campaign-cross-send', feature: F.CAMP, name: 'Campaign Sent to Another Publication\'s List', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The campaign form lists your publications — the endpoint accepts any publication id.', 'Sending trusts the id you post.', 'Create a campaign with pubId=1 while signed in as Bob and watch it "send".'],
    lesson: 'The audience of a send is a privileged resource; the server must verify the sender owns the list.',
    impact: 'An attacker emails thousands of someone else\'s subscribers with scams from the victim\'s trusted brand and domain.',
    report: { title: 'Missing Ownership Check Allows Campaign Sends to Foreign Lists', severity: 'Critical', remediation: 'Verify list ownership at send time and log cross-account send attempts as security events.' } },
  { id: 'template-xss', feature: F.CAMP, name: 'Stored XSS in Campaign Template', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Templates are stored as raw HTML and rendered in campaign previews.', 'Nothing sanitizes the HTML you save.', 'Save a template containing a <script> payload.'],
    lesson: 'Stored HTML features need sanitization allowlists; raw rendering turns a design feature into stored XSS.',
    impact: 'A malicious template executes in the browsers of colleagues and reviewers who preview it, compromising their accounts.',
    report: { title: 'Stored Cross-Site Scripting via Campaign Template HTML', severity: 'High', remediation: 'Sanitize template HTML with an allowlist sanitizer and render previews in a sandboxed context.' } },
  { id: 'campaign-analytics-idor', feature: F.CAMP, name: 'Campaign Analytics IDOR', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Campaign pages are addressed by sequential ids.', 'Opens, clicks and audience size are visible to whoever asks.', 'Open campaign 1 while signed in as Bob.'],
    lesson: 'Analytics are competitive intelligence; object-level authorization applies to dashboards too.',
    impact: 'Competitors read exact open/click performance of every campaign, stealing strategy and pricing signals.',
    report: { title: 'Broken Access Control on Campaign Analytics (IDOR)', severity: 'Medium', remediation: 'Enforce per-object ownership checks on campaign and analytics endpoints.' } },
  /* ---- Analytics & API (3) ---- */
  { id: 'api-debug-exposure', feature: F.API, name: 'Unauthenticated /api/debug Dumps Users, Passwords & API Keys', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Developers leave diagnostic endpoints behind.', 'This one needs no login at all.', 'Fetch /api/debug and read what it hands you.'],
    lesson: 'Debug endpoints in production are open vaults — remove them or gate them behind admin auth and IP allowlists.',
    impact: 'One unauthenticated request leaks every user, plaintext password and live API key — total platform compromise in seconds.',
    report: { title: 'Unauthenticated Debug Endpoint Exposes Credentials and API Keys', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; never return passwords or keys in any response.' } },
  { id: 'api-key-abuse', feature: F.API, name: 'Sending With Another User\'s Leaked API Key', owasp: 'A07:2021 Authentication Failures', difficulty: 'Intermediate',
    hints: ['The API checks that a key exists — not that the key owns the publication.', 'Keys leak from the debug endpoint.', 'POST /api/send with Alice\'s key but Bob\'s publication (or any foreign list).'],
    lesson: 'API authentication must be paired with authorization: a valid key may only act on its owner\'s resources.',
    impact: 'A leaked key lets attackers send mail as the platform to lists they do not own, burning sender reputation and enabling phishing at scale.',
    report: { title: 'API Key Accepted for Resources Owned by Other Accounts', severity: 'High', remediation: 'Scope every API operation to resources owned by the key\'s account and support key rotation/revocation.' } },
  { id: 'api-weak-token', feature: F.API, name: 'Weak API Token — base64(email) Accepted', owasp: 'A07:2021 Authentication Failures', difficulty: 'Intermediate',
    hints: ['The API accepts a fallback token format for "legacy clients".', 'It is a simple encoding of something public.', 'Try x-api-key set to the base64 of a user\'s email address.'],
    lesson: 'An API credential must be a secret; an encoding of a public identifier is not a credential at all.',
    impact: 'Anyone who knows a target\'s email address — public by design — owns their API account and can send as them.',
    report: { title: 'API Accepts base64(email) as a Valid Credential', severity: 'Critical', remediation: 'Accept only high-entropy issued API keys; remove legacy fallback token schemes.' } },
  /* ---- Admin Panel (2) ---- */
  { id: 'admin-password-exposure', feature: F.ADMIN, name: 'Admin Panel Lists Plaintext Passwords', owasp: 'A02:2021 Cryptographic Failures', difficulty: 'Beginner',
    hints: ['Reach the admin panel (the role cookie test shows the way).', 'The user table shows more than names and emails.', 'Read the password column — those are the real passwords.'],
    lesson: 'Passwords must be hashed with a slow KDF; if an admin screen can display them, storage is broken.',
    impact: 'One glance at the admin panel — or one admin account compromise — exposes every customer password for credential stuffing elsewhere.',
    report: { title: 'Plaintext Password Storage Exposed in Admin Panel', severity: 'Critical', remediation: 'Store passwords only as salted hashes (bcrypt/argon2) and never render credential material in any UI.' } },
  { id: 'admin-csrf', feature: F.ADMIN, name: 'CSRF on Admin User Deletion', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Admin actions are plain POSTs.', 'The deletion form carries no anti-CSRF marker — and the endpoint never checks for one.', 'POST /admin/users/delete with an id and no hx_origin field.'],
    lesson: 'Privileged actions are the highest-value CSRF targets and need token verification most of all.',
    impact: 'A booby-trapped page visited by an admin deletes user accounts, causing data loss and a support crisis.',
    report: { title: 'Missing Anti-CSRF Protection on Administrative User Deletion', severity: 'High', remediation: 'Require CSRF tokens on all administrative state changes and re-confirm destructive actions.' } }
];
const TEST_BY_ID = {}; TESTS.forEach(t => { TEST_BY_ID[t.id] = t; });
const FEATURES = [...new Set(TESTS.map(t => t.feature))];

function bump(feature) { state.attempts[feature] = (state.attempts[feature] || 0) + 1; save(); }
function pass(id) {
  if (!state.tests[id]) {
    state.tests[id] = true;
    if (TESTS.every(t => state.tests[t.id])) { state.completedAt = new Date().toISOString(); state.keyRevealed = true; }
    save();
  }
}
function doneCount() { return TESTS.filter(t => state.tests[t.id]).length; }
function progressData() {
  const features = {};
  FEATURES.forEach(f => { features[f] = { total: TESTS.filter(t => t.feature === f).length, done: TESTS.filter(t => t.feature === f && state.tests[t.id]).length, attempts: state.attempts[f] || 0 }; });
  const done = doneCount();
  return { lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done, pct: Math.floor(done * 100 / TESTS.length), features, complete: done === TESTS.length };
}
function _asm(parts) { return parts.map(s => [...Buffer.from(s, 'base64').toString('utf8')].reverse().join('')).join(''); }
function entryKey() { return _asm(_cfgA.concat(_cfgB, _cfgC)); }
function completionKey() { return _asm(_metaA.concat(_metaB, _metaC)); }

/* ---- template fragments (shard region 3) ---- */
const _cfgC = ["VzMxUw==","UjhVRw=="];
const FOOTER_NOTE = 'HexaNewsletter — a deliberately vulnerable practice lab. Local use only.';

const HX = '<input type="hidden" name="hx_origin" value="self">';
function chatWidget() {
  return `<div id="coach" style="position:fixed;right:14px;bottom:14px;width:320px;background:#fff;border:1px solid #ccc;border-radius:10px;box-shadow:0 4px 18px rgba(0,0,0,.18);font-size:13px;z-index:50">
  <div style="background:${THEME.accent};color:#fff;padding:8px 10px;border-radius:10px 10px 0 0"><b>Lab Coach</b> — LAB ${LAB_NUMBER} ${LAB_NAME}</div>
  <div id="coachlog" style="height:150px;overflow:auto;padding:8px"></div>
  <div style="display:flex;gap:6px;padding:8px"><input id="coachin" style="flex:1" placeholder="Ask the coach…"><button id="coachbtn">Ask</button></div></div>
<script>
var log=document.getElementById('coachlog');
function add(who,txt){var d=document.createElement('div');d.innerHTML='<b></b> ';d.firstChild.textContent=who+': ';d.appendChild(document.createTextNode(txt));log.appendChild(d);log.scrollTop=1e6;}
document.getElementById('coachbtn').onclick=function(){var v=document.getElementById('coachin').value;if(!v)return;add('You',v);document.getElementById('coachin').value='';fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:v})}).then(function(r){return r.json()}).then(function(j){add('Coach',j.reply||'...')}).catch(function(){add('Coach','(no reply)')});};
add('Coach','Hi! Ask me about features, test counts, or how to approach a feature (after 3 tries).');
</script>`;
}
function layout(title, user, body) {
  const p = progressData();
  const nav = user
    ? `<a href="/">Home</a> · <a href="/pubs">Publications</a> · <a href="/subs">Subscribers</a> · <a href="/campaigns">Campaigns</a> · <a href="/templates">Templates</a> · <a href="/apikeys">API Keys</a> · <a href="/profile">Profile (${esc(user.name)})</a> · <a href="/admin">Admin</a> · <a href="/logout">Logout</a>`
    : `<a href="/">Home</a> · <a href="/login">Login</a> · <a href="/register">Register</a>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} — ${LAB_NAME}</title>
<style>body{font-family:system-ui,Arial,sans-serif;background:${THEME.paper};color:${THEME.ink};margin:0}header{background:#fff;border-bottom:2px solid ${THEME.accent};padding:10px 18px}main{max-width:960px;margin:18px auto;padding:0 14px}table{border-collapse:collapse}td,th{border:1px solid #bbb;padding:4px 8px}input,textarea,select{margin:3px;padding:5px}.card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:12px;margin:10px 0}.bar{background:#e3e0f2;border-radius:6px;height:14px}.bar>div{background:${THEME.accent};height:14px;border-radius:6px}</style></head>
<body><header><img src="/logo.png" alt="HexaCyberLab" style="height:34px;vertical-align:middle"> <b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b>
<div style="margin-top:6px">LAB ${LAB_NUMBER} · ${p.done}/${p.total} tests · ${p.pct}% <div class="bar" style="display:inline-block;width:220px;vertical-align:middle"><div style="width:${p.pct}%"></div></div> <a href="/tests">Mission Board</a></div>
<nav style="margin-top:6px">${nav}</nav></header><main>${body}</main><footer style="text-align:center;color:#666;font-size:12px;padding:14px">${FOOTER_NOTE}</footer>${chatWidget()}</body></html>`;
}
function gatePage(msg) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Locked — LAB ${LAB_NUMBER}</title></head>
<body style="font-family:system-ui,Arial,sans-serif;background:${THEME.paper};text-align:center;padding-top:60px">
<img src="/logo.png" alt="HexaCyberLab" style="height:64px">
<h1>LAB ${LAB_NUMBER} — ${LAB_NAME}</h1>
<p>This lab is locked. Paste the completion key from Lab ${PREV_LAB} to start.</p>
${msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : ''}
<form method="POST" action="/unlock"><input name="key" size="42" placeholder="Completion key from Lab ${PREV_LAB}"> <button type="submit">Unlock</button></form>
${chatWidget()}</body></html>`;
}

/* ================= auth pages ================= */
function loginPage(msg) {
  return layout('Login', null, `<h2>Login</h2>${msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : ''}
<form method="POST" action="/login">${HX}<input name="email" placeholder="Email" size="30"><br><input name="password" type="password" placeholder="Password" size="30"><br><button>Login</button></form>
<p><a href="/forgot">Forgot password?</a> · <a href="/register">Create an account</a></p>
<div class="card"><b>Try the demo account:</b> demo@hexanews.local / demo<br>
Seed accounts: alice@hexanews.local / alice123 · bob@hexanews.local / bob123 · admin@hexanews.local / admin123</div>`);
}
function registerPage(msg) {
  return layout('Register', null, `<h2>Create your author account</h2>${msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : ''}
<form method="POST" action="/register">${HX}<input name="name" placeholder="Display name" size="30"><br><input name="email" placeholder="Email" size="30"><br><input name="password" type="password" placeholder="Password" size="30"><br><button>Register</button></form>`);
}
function forgotPage(msg, extra) {
  return layout('Forgot password', null, `<h2>Forgot password</h2>${msg ? '<p>' + esc(msg) + '</p>' : ''}${extra || ''}
<form method="POST" action="/forgot">${HX}<input name="email" placeholder="Email" size="30"> <button>Send reset link</button></form>`);
}
function resetPage(msg) {
  return layout('Reset password', null, `<h2>Reset password</h2>${msg ? '<p>' + esc(msg) + '</p>' : ''}
<form method="POST" action="/reset">${HX}<input name="email" placeholder="Email" size="30"><br><input name="token" placeholder="Reset token" size="30"><br><input name="newpassword" type="password" placeholder="New password" size="30"><br><button>Reset password</button></form>`);
}
function profilePage(user, msg) {
  return layout('Profile', user, `<h2>Your profile</h2>${msg ? '<p>' + esc(msg) + '</p>' : ''}
<p>Name: <b>${esc(user.name)}</b> · Email: ${esc(user.email)} · Role: ${esc(user.role)} · Plan: ${esc(user.plan)}</p>
<form method="POST" action="/profile">${HX}<input name="name" value="${esc(user.name)}" size="30"> <button>Update profile</button></form>`);
}
function homePage(user) {
  const pubs = publications.filter(p => p.published).map(p => {
    const iss = issues.filter(i => i.pubId === p.id && !i.draft).map(i => `<li><a href="/issue/${i.id}">${esc(i.title)}</a>${i.paid ? ' (paid)' : ''}</li>`).join('');
    return `<div class="card"><h3><a href="/pub/${p.id}">${esc(p.name)}</a></h3><p>${esc(p.desc)}</p><ul>${iss}</ul>
<form method="GET" action="/search"><input name="q" placeholder="Search publications & issues"> <button>Search</button></form></div>`;
  }).join('');
  return layout('Home', user, `<h2>Publications on HexaNewsletter</h2>${pubs}`);
}

/* ---- deliverability constants (shard region 4) ---- */
const _metaA = ["TC1YSA==","RS05OA=="];
const SENDING_DOMAIN = 'mail.hexanews.local';

function pubsPage(user) {
  const rows = publications.map(p => `<tr><td>${p.id}</td><td>${esc(p.name)}</td><td>${esc(userById(p.ownerId) ? userById(p.ownerId).name : '?')}</td><td>${p.paid ? 'Paid $' + p.price + '/mo' : 'Free'}</td><td>${p.published ? 'live' : 'unpublished'}</td><td><a href="/pub/${p.id}">View</a></td></tr>`).join('');
  return layout('Publications', user, `<h2>All publications</h2><table><tr><th>ID</th><th>Name</th><th>Owner</th><th>Type</th><th>State</th><th></th></tr>${rows}</table>
<div class="card"><h3>Start a publication</h3><form method="POST" action="/pubs">${HX}<input name="name" placeholder="Name" size="30"> <input name="desc" placeholder="Description" size="40"><br><label><input type="checkbox" name="paid" value="1"> Paid</label> <input name="price" placeholder="Price" size="6"> <button>Create</button></form></div>`);
}
function pubPage(user, pub, note) {
  const owner = userById(pub.ownerId);
  const iss = issues.filter(i => i.pubId === pub.id).map(i => `<li><a href="/issue/${i.id}">${esc(i.title)}</a>${i.paid ? ' (paid)' : ''}${i.draft ? ' (draft)' : ''}</li>`).join('');
  const subCount = subscribers.filter(s => s.pubId === pub.id && s.status === 'active').length;
  return layout(pub.name, user, `<h2>${esc(pub.name)}</h2><p>${esc(pub.desc)}</p>
<p>By ${esc(owner ? owner.name : '?')} · ${pub.paid ? 'Paid publication, $' + pub.price + '/month' : 'Free publication'} · ${subCount} active subscribers</p>
${note ? '<p style="color:#070">' + esc(note) + '</p>' : ''}
<h3>Issues</h3><ul>${iss || '<li>No issues yet.</li>'}</ul>
<div class="card"><h3>Subscribe</h3><form method="POST" action="/pub/${pub.id}/subscribe">${HX}<input name="name" placeholder="Your name" size="24"> <input name="email" placeholder="Your email" size="26"> <button>Subscribe (free)</button></form></div>`);
}
function issuePage(user, issue, entitled, previewUsed) {
  const pub = pubById(issue.pubId);
  const full = !issue.paid || entitled || previewUsed;
  const body = full ? esc(issue.body) : esc(issue.body.slice(0, 60)) + '… <b>[Premium content locked — subscribe as a paid reader to read the full issue.]</b>';
  return layout(issue.title, user, `<h2>${esc(issue.title)}</h2><p>In <a href="/pub/${pub.id}">${esc(pub.name)}</a>${issue.paid ? ' · paid issue' : ''}${issue.draft ? ' · DRAFT' : ''}</p><div class="card">${body}</div>`);
}
function searchPage(user, q, results) {
  const rows = results.map(p => `<li><a href="/pub/${p.id}">${esc(p.name)}</a> — ${esc(p.desc)}${p.published ? '' : ' (unpublished)'}</li>`).join('');
  return layout('Search', user, `<h2>Search results</h2><p>Results for ${q}</p><ul>${rows || '<li>No matches.</li>'}</ul>
<form method="GET" action="/search"><input name="q" size="34"> <button>Search</button></form>`);
}
function subsPage(user, msg) {
  const mine = publications.filter(p => p.ownerId === user.id);
  const lists = mine.map(p => {
    const rows = subscribers.filter(s => s.pubId === p.id).map(s => `<tr><td>${s.id}</td><td>${esc(s.name)}</td><td>${esc(s.email)}</td><td>${esc(s.tier)}</td><td>${esc(s.status)}</td></tr>`).join('');
    return `<div class="card"><h3>${esc(p.name)} (publication ${p.id})</h3><table><tr><th>ID</th><th>Name</th><th>Email</th><th>Tier</th><th>Status</th></tr>${rows}</table>
<p><a href="/subs/export?pub=${p.id}">Export CSV</a></p></div>`;
  }).join('');
  return layout('Subscribers', user, `<h2>Your subscriber lists</h2>${msg ? '<p>' + esc(msg) + '</p>' : ''}${lists || '<p>No publications yet.</p>'}
<div class="card"><h3>Import subscribers (CSV: name,email per line)</h3>
<form method="POST" action="/subs/import">${HX}<input name="pub" placeholder="Publication ID" size="8"><br><textarea name="csv" rows="4" cols="50" placeholder="Jane Reader,jane@mail.test"></textarea><br><button>Import</button></form></div>`);
}
function campaignsPage(user, msg) {
  const rows = campaigns.map(c => `<tr><td>${c.id}</td><td>${esc(c.subject)}</td><td>pub ${c.pubId}</td><td>${esc(userById(c.ownerId) ? userById(c.ownerId).name : '?')}</td><td>${c.sentTo}</td><td><a href="/campaigns/${c.id}">Analytics</a> · <a href="/campaigns/${c.id}/preview">Preview</a></td></tr>`).join('');
  const myPubs = publications.filter(p => p.ownerId === user.id).map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
  const myTpls = templates.filter(t => t.ownerId === user.id).map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('');
  return layout('Campaigns', user, `<h2>Campaigns</h2>${msg ? '<p>' + esc(msg) + '</p>' : ''}<table><tr><th>ID</th><th>Subject</th><th>List</th><th>Owner</th><th>Sent to</th><th></th></tr>${rows}</table>
<div class="card"><h3>New campaign</h3><form method="POST" action="/campaigns">${HX}
Publication: <select name="pubId">${myPubs}</select> Template: <select name="templateId"><option value="0">None</option>${myTpls}</select><br>
<input name="subject" placeholder="Subject" size="40"><br><textarea name="body" rows="3" cols="50" placeholder="Email body"></textarea><br><button>Send campaign (simulated)</button></form></div>`);
}
function campaignPage(user, c) {
  return layout('Campaign ' + c.id, user, `<h2>Campaign analytics</h2>
<p>Subject: <b>${esc(c.subject)}</b> · Publication ${c.pubId} · Owner: ${esc(userById(c.ownerId) ? userById(c.ownerId).name : '?')}</p>
<table><tr><th>Sent to</th><th>Opens</th><th>Clicks</th><th>Open rate</th></tr>
<tr><td>${c.sentTo}</td><td>${c.opens}</td><td>${c.clicks}</td><td>${c.sentTo ? Math.round(c.opens * 100 / c.sentTo) : 0}%</td></tr></table>
<p><a href="/campaigns/${c.id}/preview">View sent email preview</a></p>`);
}
function templatesPage(user, msg) {
  const rows = templates.map(t => `<tr><td>${t.id}</td><td>${esc(t.name)}</td><td>${esc(userById(t.ownerId) ? userById(t.ownerId).name : '?')}</td></tr>`).join('');
  return layout('Templates', user, `<h2>Campaign templates</h2>${msg ? '<p>' + esc(msg) + '</p>' : ''}<table><tr><th>ID</th><th>Name</th><th>Owner</th></tr>${rows}</table>
<div class="card"><h3>New template (HTML)</h3><form method="POST" action="/templates">${HX}<input name="name" placeholder="Template name" size="30"><br><textarea name="html" rows="3" cols="56" placeholder="<div>Your header HTML</div>"></textarea><br><button>Save template</button></form></div>`);
}
function apiKeysPage(user) {
  return layout('API Keys', user, `<h2>Your API key</h2>
<div class="card"><p>Key: <code>${esc(user.apiKey)}</code></p>
<p>Send a campaign with: <code>POST /api/send</code> and header <code>x-api-key: YOUR_KEY</code>, JSON body {"pubId":1,"subject":"Hi","body":"..."}.</p>
<p>Profile check: <code>GET /api/me</code> with the same header. Sending domain: ${SENDING_DOMAIN}. Merge tags: ${MERGE_TAGS.join(', ')}</p></div>`);
}
function adminPage(user) {
  const rows = users.map(u => `<tr><td>${u.id}</td><td>${u.name}</td><td>${esc(u.email)}</td><td>${u.password}</td><td>${esc(u.role)}</td><td>${esc(u.plan)}</td><td><form method="POST" action="/admin/users/delete" style="display:inline"><input type="hidden" name="id" value="${u.id}"><button>Delete</button></form></td></tr>`).join('');
  const pubs = publications.map(p => `<tr><td>${p.id}</td><td>${esc(p.name)}</td><td>owner ${p.ownerId}</td><td>${p.published ? 'live' : 'unpublished'}</td></tr>`).join('');
  return layout('Admin', user, `<h2>Platform admin</h2><h3>Users (passwords shown for support)</h3>
<table><tr><th>ID</th><th>Name</th><th>Email</th><th>Password</th><th>Role</th><th>Plan</th><th></th></tr>${rows}</table>
<h3>Publications</h3><table><tr><th>ID</th><th>Name</th><th>Owner</th><th>State</th></tr>${pubs}</table>`);
}
function testsPage(hintState) {
  const sections = FEATURES.map(f => {
    const items = TESTS.filter(t => t.feature === f).map(t => {
      const shown = hintState[t.id] || 0;
      const hints = t.hints.slice(0, shown).map((h, i) => `<div>Hint ${i + 1}: ${esc(h)}</div>`).join('');
      const more = shown < 3 ? ` <a href="/tests?h=${t.id}:${shown + 1}">Reveal hint ${shown + 1}</a>` : '';
      return `<div class="card"><b>${state.tests[t.id] ? '✓' : '○'} ${esc(t.name)}</b> — ${esc(t.owasp)} · ${esc(t.difficulty)} · attempts on this feature: ${state.attempts[f] || 0}<br>${hints}${more}</div>`;
    }).join('');
    return `<h3>${esc(f)}</h3>${items}`;
  }).join('');
  return layout('Mission Board', null, `<h2>Mission Board — LAB ${LAB_NUMBER} ${LAB_NAME}</h2>${sections}`);
}
function completePage() {
  const p = progressData();
  if (!p.complete) {
    const left = TESTS.filter(t => !state.tests[t.id]).map(t => `<li>${esc(t.name)} (${esc(t.feature)})</li>`).join('');
    return layout('Complete', null, `<h2>Not complete yet — ${p.done}/${p.total} (${p.pct}%)</h2><p>Still open:</p><ul>${left}</ul>`);
  }
  const perFeature = FEATURES.map(f => {
    const ts = TESTS.filter(t => t.feature === f);
    return `<tr><td>${esc(f)}</td><td>${ts.length}</td><td>${ts.filter(t => state.tests[t.id]).length}</td></tr>`;
  }).join('');
  const techniques = TESTS.map(t => `<li>${esc(t.name)} — ${esc(t.owasp)}</li>`).join('');
  const lessons = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('');
  const impacts = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('');
  const reports = TESTS.map(t => `<li><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)} — Remediation: ${esc(t.report.remediation)}</li>`).join('');
  return layout('Complete', null, `<h2>🎉 LAB ${LAB_NUMBER} — ${LAB_NAME} complete!</h2>
<h3>1) Total features in this lab</h3><p>${FEATURES.length} features, ${TESTS.length} security tests.</p>
<h3>2) Vulnerabilities per feature</h3><table><tr><th>Feature</th><th>Tests</th><th>Completed</th></tr>${perFeature}</table>
<h3>3) How testing was done (${TESTS.length} techniques)</h3><ul>${techniques}</ul>
<h3>4) What you learned</h3><ul>${lessons}</ul>
<h3>5) What this means for a real client</h3><ul>${impacts}</ul>
<h3>6) Writing it in a real report</h3><ul>${reports}</ul>
<div class="card"><h3>Your completion key (unlocks Lab ${LAB_NUMBER + 1})</h3><p style="font-size:18px"><code>${esc(completionKey())}</code></p>
<form method="POST" action="/complete">${HX}<input name="testerName" placeholder="Your name for the certificate" size="30" value="${esc(state.testerName)}"> <button>Save name</button></form>
<p><a href="/certificate">View your certificate</a></p></div>`);
}
function certificatePage() {
  const name = state.testerName || 'HexaCyberLab Tester';
  const date = state.completedAt ? new Date(state.completedAt).toDateString() : new Date().toDateString();
  return `<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER}</title>
<style>body{font-family:Georgia,serif;background:#eee}.card{max-width:720px;margin:40px auto;background:#fff;border:3px double ${THEME.accent};padding:36px;text-align:center}@media print{body{background:#fff}}</style></head>
<body><div class="card"><img src="/logo.png" alt="HexaCyberLab" style="height:70px">
<h1>Certificate of Completion</h1><p>This certifies that</p><h2>${esc(name)}</h2>
<p>has completed 100% of the security tests in LAB ${LAB_NUMBER} — ${LAB_NAME} (${TESTS.length} tests across ${FEATURES.length} features)</p>
<p>Completed on ${esc(date)}</p><p><i>HexaCyberLab — Built by Md. Jony Hassain, Founder</i></p></div></body></html>`;
}

/* ---- analytics rollup (shard region 5) ---- */
const _metaB = ["T1NONw==","LTY5Tw=="];
function rollup() { return campaigns.reduce((a, c) => a + c.sentTo, 0); }

/* ================= Lab Coach (chatbot) ================= */
function featureFromMessage(m) {
  if (/admin|panel/.test(m)) return F.ADMIN;
  if (/api|analytic|debug|token/.test(m)) return F.API;
  if (/unsubscrib|subscriber|import|export|list/.test(m)) return F.SUBS;
  if (/campaign|template/.test(m)) return F.CAMP;
  if (/paid|premium|issue|publication|draft|preview/.test(m)) return F.PUBS;
  if (/search/.test(m)) return F.SEARCH;
  if (/register|registration|profile|sign.?up|password policy|mass/.test(m)) return F.REG;
  if (/login|auth|password|reset|brute|enumerat|cookie|demo cred/.test(m)) return F.LOGIN;
  return null;
}
function testFromMessage(m) { return TESTS.find(t => m.includes(t.name.toLowerCase().slice(0, 14))) || null; }
function chatReply(raw) {
  const m = String(raw || '').toLowerCase();
  const p = progressData();
  if (/who (built|made|created)|founder|md\.? jony|hexacyberlab/.test(m)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (/key/.test(m) && !/api key/.test(m)) {
    if (p.complete && state.keyRevealed) return 'You completed LAB ' + LAB_NUMBER + ' — your completion key is: ' + completionKey() + ' — paste it into Lab ' + (LAB_NUMBER + 1) + ' to unlock it.';
    return 'I do not have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at ' + p.pct + '% (' + p.done + '/' + p.total + '). Finish every test and I will share it.';
  }
  const feat = featureFromMessage(m);
  if (/how many|which features|list|count|vulnerabilit/.test(m) || (feat && /how many|tests in|what tests/.test(m))) {
    if (feat) {
      const ts = TESTS.filter(t => t.feature === feat);
      return feat + ' has ' + ts.length + ' tests: ' + ts.map(t => t.name).join('; ') + '.';
    }
    return 'LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ' has ' + FEATURES.length + ' features and ' + TESTS.length + ' tests: ' + FEATURES.map(f => f + ' (' + TESTS.filter(t => t.feature === f).length + ')').join(', ') + '. See /tests for the full Mission Board.';
  }
  if (/progress|status|next|score/.test(m)) {
    const next = TESTS.find(t => !state.tests[t.id]);
    return 'Progress: ' + p.done + '/' + p.total + ' tests (' + p.pct + '%).' + (next ? ' Next open test: "' + next.name + '" in ' + next.feature + '.' : ' All tests complete!');
  }
  if (feat && /how|help|guide|step|solve|hint|approach|do it|exploit/.test(m)) {
    const t = testFromMessage(m);
    const attempts = state.attempts[feat] || 0;
    const relevant = t ? [t] : TESTS.filter(x => x.feature === feat && !state.tests[x.id]);
    const unlocked = attempts >= 3 || (t && state.tests[t.id]) || relevant.every(x => state.tests[x.id]);
    if (!unlocked) {
      return 'That feature is locked for help. First try the ' + feat + ' tests yourself at least 3 times — I can see you\'ve tried ' + attempts + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
    }
    if (!relevant.length) return 'All ' + feat + ' tests are already complete. Well done!';
    return 'Step by step for ' + feat + ': ' + relevant.map(x => '"' + x.name + '" — ' + x.hints[2]).join(' ');
  }
  if (feat) {
    const ts = TESTS.filter(t => t.feature === feat);
    return feat + ' has ' + ts.length + ' tests: ' + ts.map(t => t.name).join('; ') + '. Ask me "how" after at least 3 tries on that feature and I\'ll guide you step by step.';
  }
  return 'I can help with LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ': ' + FEATURES.length + ' features, ' + TESTS.length + ' tests, progress ' + p.pct + '%. Check /tests for the Mission Board and hints — and remember, step-by-step help for a feature unlocks after 3 real tries on it.';
}

/* ---- report export stamp (shard region 6) ---- */
const _metaC = ["NVU0NA==","TTU5Wg=="];
const EXPORT_STAMP = 'hexanewsletter-lab88';

/* ================= HTTP plumbing ================= */
function parseCookies(req) {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach(part => { const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); });
  return out;
}
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 2e6) req.destroy(); });
    req.on('end', () => {
      const ct = String(req.headers['content-type'] || '');
      if (ct.includes('json')) { try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); } return; }
      const out = {}; try { new URLSearchParams(data).forEach((v, k) => { out[k] = v; }); } catch (e) {}
      resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}
function probeEnum(ip, email) {
  if (!email) return;
  if (!enumProbes[ip]) enumProbes[ip] = new Set();
  enumProbes[ip].add(String(email).toLowerCase());
  if (enumProbes[ip].size >= 5) pass('user-enum');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://' + HOST + ':' + PORT);
  const pathname = url.pathname;
  const cookies = parseCookies(req);
  const setCookies = [];
  if (!cookies.hx_origin) setCookies.push('hx_origin=self; Path=/');
  function send(code, type, body, extra) {
    const headers = Object.assign({ 'Content-Type': type }, extra || {});
    if (setCookies.length) headers['Set-Cookie'] = setCookies;
    res.writeHead(code, headers); res.end(body);
  }
  function html(code, body) { send(code, 'text/html; charset=utf-8', body); }
  function json(code, obj) { send(code, 'application/json', JSON.stringify(obj)); }
  function redirect(to) { send(302, 'text/plain', 'Redirecting to ' + to, { Location: to }); }
  function currentUser() { const sid = cookies.hx_session; return sid && sessions[sid] ? userById(sessions[sid]) : null; }
  function startSession(user) {
    const sid = crypto.randomBytes(12).toString('hex');
    sessions[sid] = user.id;
    setCookies.push('hx_session=' + sid + '; Path=/; HttpOnly');
    setCookies.push('hx_role=' + user.role + '; Path=/');
  }
  try {
    if (pathname === '/logo.png') {
      try { send(200, 'image/png', fs.readFileSync(path.join(DIR, 'logo.png'))); } catch (e) { send(404, 'text/plain', 'no logo'); }
      return;
    }
    if (pathname === '/unlock' && req.method === 'POST') {
      const b = await readBody(req);
      const given = String((b && b.key) || '');
      const expected = entryKey();
      let same = given.length === expected.length;
      for (let i = 0; i < expected.length; i++) { if (given[i] !== expected[i]) same = false; }
      if (same) { state.unlocked = true; save(); redirect('/'); }
      else html(403, gatePage('That key was not accepted.'));
      return;
    }
    if (pathname === '/api/chat' && req.method === 'POST') {
      const b = await readBody(req);
      json(200, { reply: chatReply(b && b.message) });
      return;
    }
    if (!state.unlocked) { html(200, gatePage('')); return; }

    const user = currentUser();
    const needLogin = () => { if (!user) { redirect('/login'); return true; } return false; };

    if (pathname === '/' && req.method === 'GET') { html(200, homePage(user)); return; }

    /* ---- auth routes ---- */
    if (pathname === '/login' && req.method === 'GET') { html(200, loginPage('')); return; }
    if (pathname === '/login' && req.method === 'POST') {
      const b = await readBody(req);
      bump(F.LOGIN);
      probeEnum(req.socket.remoteAddress, b.email);
      const email = String(b.email || ''), password = String(b.password || '');
      if (INJ_RE.test(email + ' ' + password)) {
        const prefix = email.split("'")[0].trim().toLowerCase();
        const target = users.find(u => u.email.toLowerCase() === prefix) || users[0];
        pass('sqli-login'); startSession(target); redirect('/'); return;
      }
      const u = users.find(x => x.email.toLowerCase() === email.toLowerCase());
      if (!u) { html(200, loginPage('No account found for that email.')); return; }
      if (u.password !== password) {
        loginFails[u.email] = (loginFails[u.email] || 0) + 1;
        if (loginFails[u.email] >= 10) pass('brute-force');
        html(200, loginPage('Incorrect password for this account.')); return;
      }
      if (u.email === 'demo@hexanews.local') pass('default-creds');
      startSession(u); redirect('/'); return;
    }
    if (pathname === '/register' && req.method === 'GET') { html(200, registerPage('')); return; }
    if (pathname === '/register' && req.method === 'POST') {
      const b = await readBody(req);
      bump(F.REG);
      const email = String(b.email || '');
      if (!email || users.some(u => u.email.toLowerCase() === email.toLowerCase())) { html(200, registerPage('Email missing or already registered.')); return; }
      const nu = { id: nextUserId++, name: String(b.name || 'New Author'), email, password: String(b.password || ''), role: 'author', plan: 'free', apiKey: 'hn_live_' + crypto.randomBytes(4).toString('hex'), pubId: 0 };
      if (String(b.password || '').length < 4) pass('weak-password');
      if (XSS_RE.test(nu.name)) pass('stored-xss');
      let mass = false;
      if (b.role && String(b.role) !== 'author') { nu.role = String(b.role); mass = true; }
      if (b.plan && String(b.plan) !== 'free') { nu.plan = String(b.plan); mass = true; }
      if (b.apiKey) { nu.apiKey = String(b.apiKey); mass = true; }
      if (mass) pass('mass-assignment');
      const pub = { id: nextPubId++, ownerId: nu.id, name: nu.name + "'s Publication", desc: 'A new publication.', paid: false, price: 0, published: true };
      publications.push(pub); nu.pubId = pub.id; users.push(nu);
      startSession(nu); redirect('/'); return;
    }
    if (pathname === '/forgot' && req.method === 'GET') { html(200, forgotPage('')); return; }
    if (pathname === '/forgot' && req.method === 'POST') {
      const b = await readBody(req);
      bump(F.LOGIN);
      probeEnum(req.socket.remoteAddress, b.email);
      const u = users.find(x => x.email.toLowerCase() === String(b.email || '').toLowerCase());
      if (!u) { html(200, forgotPage('No account with that email.')); return; }
      const token = resetFormula(u); resetTokens[u.email] = token;
      html(200, forgotPage('Reset link sent.', '<div class="card">(Simulated email) Your reset token is: <b>' + esc(token) + '</b> — use it on the <a href="/reset">reset page</a>.</div>')); return;
    }
    if (pathname === '/reset' && req.method === 'GET') { html(200, resetPage('')); return; }
    if (pathname === '/reset' && req.method === 'POST') {
      const b = await readBody(req);
      bump(F.LOGIN);
      const u = users.find(x => x.email.toLowerCase() === String(b.email || '').toLowerCase());
      if (!u) { html(200, resetPage('No account with that email.')); return; }
      const token = String(b.token || '');
      if (resetTokens[u.email] && resetTokens[u.email] === token) {
        u.password = String(b.newpassword || 'x'); delete resetTokens[u.email];
        html(200, resetPage('Password updated. You can now log in.')); return;
      }
      if (token === resetFormula(u)) {
        pass('predictable-reset');
        u.password = String(b.newpassword || 'x');
        html(200, resetPage('Password updated. You can now log in.')); return;
      }
      html(200, resetPage('Invalid reset token.')); return;
    }
    if (pathname === '/logout') {
      if (cookies.hx_session) delete sessions[cookies.hx_session];
      setCookies.push('hx_session=; Path=/; Max-Age=0'); redirect('/'); return;
    }
    if (pathname === '/profile' && req.method === 'GET') { if (needLogin()) return; html(200, profilePage(user, '')); return; }
    if (pathname === '/profile' && req.method === 'POST') {
      if (needLogin()) return;
      const b = await readBody(req);
      bump(F.REG);
      const markerOk = b.hx_origin && cookies.hx_origin && b.hx_origin === cookies.hx_origin;
      if (b.name) { user.name = String(b.name); if (XSS_RE.test(user.name)) pass('stored-xss'); }
      if (!markerOk) pass('profile-csrf');
      html(200, profilePage(user, 'Profile updated.')); return;
    }

    /* ---- publications, issues, search ---- */
    if (pathname === '/pubs' && req.method === 'GET') { if (needLogin()) return; html(200, pubsPage(user)); return; }
    if (pathname === '/pubs' && req.method === 'POST') {
      if (needLogin()) return;
      const b = await readBody(req);
      const pub = { id: nextPubId++, ownerId: user.id, name: String(b.name || 'Untitled'), desc: String(b.desc || ''), paid: !!b.paid, price: Number(b.price) || 0, published: true };
      publications.push(pub); redirect('/pub/' + pub.id); return;
    }
    const pubView = pathname.match(/^\/pub\/(\d+)$/);
    if (pubView && req.method === 'GET') {
      const pub = pubById(pubView[1]);
      if (!pub) { html(404, layout('Not found', user, '<h2>Publication not found.</h2>')); return; }
      html(200, pubPage(user, pub, '')); return;
    }
    const subPost = pathname.match(/^\/pub\/(\d+)\/subscribe$/);
    if (subPost && req.method === 'POST') {
      const pub = pubById(subPost[1]);
      if (!pub) { html(404, layout('Not found', user, '<h2>Publication not found.</h2>')); return; }
      const b = await readBody(req);
      bump(F.PUBS);
      const tier = String(b.tier || 'free');
      const ns = { id: nextSubId++, pubId: pub.id, name: String(b.name || 'Reader'), email: String(b.email || ''), tier, status: 'active', unsubToken: 'tok-' + crypto.randomBytes(4).toString('hex') };
      subscribers.push(ns);
      if (tier === 'paid') pass('paid-tier-forgery');
      html(200, pubPage(user, pub, 'Subscribed as ' + tier + '. Welcome!')); return;
    }
    const issueView = pathname.match(/^\/issue\/(\d+)$/);
    if (issueView && req.method === 'GET') {
      const issue = issues.find(i => i.id === Number(issueView[1]));
      if (!issue) { html(404, layout('Not found', user, '<h2>Issue not found.</h2>')); return; }
      bump(F.PUBS);
      const pub = pubById(issue.pubId);
      const isOwner = user && pub && (pub.ownerId === user.id || user.role === 'admin');
      if (issue.draft && !isOwner) pass('draft-issue-leak');
      const entitled = !!(user && subscribers.some(s => s.pubId === issue.pubId && s.tier === 'paid' && s.status === 'active' && s.email.toLowerCase() === user.email.toLowerCase()));
      const previewUsed = url.searchParams.get('preview') === '1';
      if (issue.paid && previewUsed && !entitled && !isOwner) pass('paid-preview-bypass');
      html(200, issuePage(user, issue, entitled || !!isOwner, previewUsed)); return;
    }
    if (pathname === '/search' && req.method === 'GET') {
      const q = String(url.searchParams.get('q') || '');
      bump(F.SEARCH);
      let results = publications.filter(p => p.published && (p.name + ' ' + p.desc).toLowerCase().includes(q.toLowerCase()));
      if (INJ_RE.test(q) || /'\s*or\s*'[^']*'\s*=\s*'/i.test(q)) {
        results = publications.slice();
        if (results.some(p => !p.published)) pass('search-sqli');
      }
      if (XSS_RE.test(q)) pass('search-xss');
      html(200, searchPage(user, q, results)); return;
    }

    /* ---- subscribers ---- */
    if (pathname === '/subs' && req.method === 'GET') { if (needLogin()) return; html(200, subsPage(user, '')); return; }
    if (pathname === '/subs/export' && req.method === 'GET') {
      if (needLogin()) return;
      bump(F.SUBS);
      const pub = pubById(url.searchParams.get('pub'));
      if (!pub) { html(404, layout('Not found', user, '<h2>Publication not found.</h2>')); return; }
      if (pub.ownerId !== user.id) pass('export-idor');
      const csv = 'id,name,email,tier,status\n' + subscribers.filter(s => s.pubId === pub.id).map(s => [s.id, s.name, s.email, s.tier, s.status].join(',')).join('\n');
      send(200, 'text/csv', csv, { 'Content-Disposition': 'attachment; filename="subscribers-pub-' + pub.id + '.csv"' }); return;
    }
    if (pathname === '/subs/import' && req.method === 'POST') {
      if (needLogin()) return;
      const b = await readBody(req);
      bump(F.SUBS);
      const pub = pubById(b.pub);
      if (!pub) { html(200, subsPage(user, 'Publication not found.')); return; }
      let added = 0;
      String(b.csv || '').split('\n').forEach(line => {
        const parts = line.split(','); if (parts.length < 2) return;
        const email = parts[1].trim(); if (!email) return;
        subscribers.push({ id: nextSubId++, pubId: pub.id, name: parts[0].trim() || 'Imported', email, tier: 'free', status: 'active', unsubToken: 'tok-' + crypto.randomBytes(4).toString('hex') });
        added++;
      });
      if (pub.ownerId !== user.id && added > 0) pass('import-idor');
      html(200, subsPage(user, 'Imported ' + added + ' subscriber(s) into publication ' + pub.id + '.')); return;
    }
    if (pathname === '/unsubscribe' && req.method === 'GET') {
      bump(F.SUBS);
      const sub = subscribers.find(s => s.id === Number(url.searchParams.get('sub')));
      if (!sub) { html(404, layout('Not found', user, '<h2>Subscriber not found.</h2>')); return; }
      const t = String(url.searchParams.get('t') || '');
      if (t === sub.unsubToken) { sub.status = 'unsubscribed'; html(200, layout('Unsubscribed', user, '<h2>You have been unsubscribed.</h2>')); return; }
      if (t === 'unsub-' + sub.id) { pass('unsub-token-forge'); sub.status = 'unsubscribed'; html(200, layout('Unsubscribed', user, '<h2>You have been unsubscribed.</h2>')); return; }
      html(403, layout('Invalid', user, '<h2>Invalid unsubscribe token.</h2>')); return;
    }

    /* ---- campaigns & templates ---- */
    if (pathname === '/campaigns' && req.method === 'GET') { if (needLogin()) return; html(200, campaignsPage(user, '')); return; }
    if (pathname === '/campaigns' && req.method === 'POST') {
      if (needLogin()) return;
      const b = await readBody(req);
      bump(F.CAMP);
      const pub = pubById(b.pubId);
      if (!pub) { html(200, campaignsPage(user, 'Publication not found.')); return; }
      const sentTo = subscribers.filter(s => s.pubId === pub.id && s.status === 'active').length;
      const c = { id: nextCampId++, ownerId: user.id, pubId: pub.id, subject: String(b.subject || '(no subject)'), body: String(b.body || ''), templateId: Number(b.templateId) || 0, sentTo, opens: sentTo * 2, clicks: sentTo };
      campaigns.push(c);
      if (pub.ownerId !== user.id) pass('campaign-cross-send');
      redirect('/campaigns/' + c.id); return;
    }
    const campPrev = pathname.match(/^\/campaigns\/(\d+)\/preview$/);
    if (campPrev && req.method === 'GET') {
      if (needLogin()) return;
      const c = campaigns.find(x => x.id === Number(campPrev[1]));
      if (!c) { html(404, layout('Not found', user, '<h2>Campaign not found.</h2>')); return; }
      const tpl = templates.find(t => t.id === c.templateId);
      html(200, layout('Preview', user, '<h2>Sent email preview</h2><div class="card">' + (tpl ? tpl.html : '') + '<h3>' + esc(c.subject) + '</h3><p>' + esc(c.body) + '</p></div>')); return;
    }
    const campView = pathname.match(/^\/campaigns\/(\d+)$/);
    if (campView && req.method === 'GET') {
      if (needLogin()) return;
      bump(F.CAMP);
      const c = campaigns.find(x => x.id === Number(campView[1]));
      if (!c) { html(404, layout('Not found', user, '<h2>Campaign not found.</h2>')); return; }
      if (c.ownerId !== user.id) pass('campaign-analytics-idor');
      html(200, campaignPage(user, c)); return;
    }
    if (pathname === '/templates' && req.method === 'GET') { if (needLogin()) return; html(200, templatesPage(user, '')); return; }
    if (pathname === '/templates' && req.method === 'POST') {
      if (needLogin()) return;
      const b = await readBody(req);
      bump(F.CAMP);
      const tplHtml = String(b.html || '');
      if (XSS_RE.test(tplHtml)) pass('template-xss');
      templates.push({ id: nextTplId++, ownerId: user.id, name: String(b.name || 'Template'), html: tplHtml });
      html(200, templatesPage(user, 'Template saved.')); return;
    }
    if (pathname === '/apikeys' && req.method === 'GET') { if (needLogin()) return; html(200, apiKeysPage(user)); return; }

    /* ---- API ---- */
    if (pathname === '/api/progress' && req.method === 'GET') { json(200, progressData()); return; }
    if (pathname === '/api/debug' && req.method === 'GET') {
      bump(F.API); pass('api-debug-exposure');
      json(200, { stamp: EXPORT_STAMP, users, publications, subscribers }); return;
    }
    function apiAuth() {
      const key = String(req.headers['x-api-key'] || url.searchParams.get('key') || '');
      if (!key) return { user: null, weak: false };
      const byKey = users.find(u => u.apiKey === key);
      if (byKey) return { user: byKey, weak: false };
      const byEmail = users.find(u => Buffer.from(u.email).toString('base64') === key);
      if (byEmail) return { user: byEmail, weak: true };
      return { user: null, weak: false };
    }
    if (pathname === '/api/me' && req.method === 'GET') {
      bump(F.API);
      const a = apiAuth();
      if (!a.user) { json(401, { error: 'invalid api key' }); return; }
      if (a.weak) pass('api-weak-token');
      json(200, { id: a.user.id, name: a.user.name, email: a.user.email, role: a.user.role, plan: a.user.plan }); return;
    }
    if (pathname === '/api/send' && req.method === 'POST') {
      const b = await readBody(req);
      bump(F.API);
      const a = apiAuth();
      if (!a.user) { json(401, { error: 'invalid api key' }); return; }
      if (a.weak) pass('api-weak-token');
      const pub = pubById(b.pubId);
      if (!pub) { json(404, { error: 'publication not found' }); return; }
      if (pub.ownerId !== a.user.id) pass('api-key-abuse');
      const sentTo = subscribers.filter(s => s.pubId === pub.id && s.status === 'active').length;
      const c = { id: nextCampId++, ownerId: a.user.id, pubId: pub.id, subject: String(b.subject || '(no subject)'), body: String(b.body || ''), templateId: 0, sentTo, opens: sentTo * 2, clicks: sentTo };
      campaigns.push(c);
      json(200, { queued: true, campaignId: c.id, sentTo, totalSentAllTime: rollup() }); return;
    }

    /* ---- admin ---- */
    if (pathname === '/admin' && req.method === 'GET') {
      if (needLogin()) return;
      bump(F.ADMIN);
      if (cookies.hx_role !== 'admin') { html(403, layout('Forbidden', user, '<h2>Admins only.</h2>')); return; }
      if (user.role !== 'admin') pass('cookie-role');
      pass('admin-password-exposure');
      html(200, adminPage(user)); return;
    }
    if (pathname === '/admin/users/delete' && req.method === 'POST') {
      if (needLogin()) return;
      const b = await readBody(req);
      bump(F.ADMIN);
      if (cookies.hx_role !== 'admin') { html(403, layout('Forbidden', user, '<h2>Admins only.</h2>')); return; }
      const markerOk = b.hx_origin && cookies.hx_origin && b.hx_origin === cookies.hx_origin;
      if (!markerOk) pass('admin-csrf');
      const idx = users.findIndex(u => u.id === Number(b.id));
      if (idx >= 0 && users[idx].id !== 1) users.splice(idx, 1);
      redirect('/admin'); return;
    }

    /* ---- lab system pages ---- */
    if (pathname === '/tests' && req.method === 'GET') {
      const hintState = {};
      const hv = String(url.searchParams.get('h') || '');
      const hm = hv.match(/^([a-z0-9-]+):(\d)$/);
      if (hm && TEST_BY_ID[hm[1]]) hintState[hm[1]] = Math.min(3, Number(hm[2]));
      html(200, testsPage(hintState)); return;
    }
    if (pathname === '/complete' && req.method === 'GET') { html(200, completePage()); return; }
    if (pathname === '/complete' && req.method === 'POST') {
      const b = await readBody(req);
      if (b.testerName) { state.testerName = String(b.testerName).slice(0, 80); save(); }
      redirect('/complete'); return;
    }
    if (pathname === '/certificate' && req.method === 'GET') {
      if (!progressData().complete) { redirect('/complete'); return; }
      html(200, certificatePage()); return;
    }

    html(404, layout('Not found', user, '<h2>404 — page not found.</h2>'));
  } catch (e) {
    try { html(500, '<h1>Something went wrong — the lab is still running.</h1>'); } catch (e2) {}
  }
});

/* ---- generated docs from the TESTS registry (node server.js --gen-docs) ---- */
function genDocs() {
  const byFeature = f => TESTS.filter(t => t.feature === f);
  let vuln = '# HexaNewsletter (LAB 88) — Vulnerability Map\n\nThe complete map of scored tests in this lab, grouped by feature. Every entry is a real, working flaw in the app; tests complete only when the exploit actually succeeds server-side.\n';
  FEATURES.forEach(f => {
    vuln += '\n## ' + f + '\n';
    byFeature(f).forEach(t => { vuln += '\n### ' + t.name + '\n- OWASP: ' + t.owasp + '\n- Difficulty: ' + t.difficulty + '\n- Impact: ' + t.impact + '\n- Report title: ' + t.report.title + ' (' + t.report.severity + ')\n'; });
  });
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'), vuln);
  let guide = '# HexaNewsletter (LAB 88) — Practice Guide\n\nChallenges grouped by feature, then difficulty. Hints are graded: nudge, stronger, near-answer. Objectives are measurable — a test flips only when the real effect happens.\n';
  const rank = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  FEATURES.forEach(f => {
    guide += '\n## ' + f + '\n';
    byFeature(f).slice().sort((a, b) => rank[a.difficulty] - rank[b.difficulty]).forEach(t => {
      guide += '\n### ' + t.name + ' (' + t.difficulty + ', ' + t.owasp + ')\n- Objective: make the "' + t.name + '" test flip to done on the Mission Board (/tests) by performing the exploit end-to-end.\n- Hint 1: ' + t.hints[0] + '\n- Hint 2: ' + t.hints[1] + '\n- Hint 3: ' + t.hints[2] + '\n';
    });
  });
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'), guide);
  let fix = '# HexaNewsletter (LAB 88) — Fix & Retest\n\nFor every scored test: the secure implementation pattern and a regression check to prove the fix.\n';
  FEATURES.forEach(f => {
    fix += '\n## ' + f + '\n';
    byFeature(f).forEach(t => { fix += '\n### ' + t.report.title + ' (' + t.report.severity + ')\n- Fix: ' + t.report.remediation + '\n- Retest: repeat the original exploit from PRACTICE-GUIDE.md — it must now fail (no test flip, no effect), while the legitimate flow still works.\n'; });
  });
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'), fix);
  console.log('Docs generated for ' + TESTS.length + ' tests across ' + FEATURES.length + ' features.');
}
if (process.argv.includes('--gen-docs')) { genDocs(); process.exit(0); }

server.listen(PORT, HOST, () => { console.log(LAB_NAME + ' (LAB ' + LAB_NUMBER + ') listening on http://' + HOST + ':' + PORT); });
