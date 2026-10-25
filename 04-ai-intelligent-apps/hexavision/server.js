'use strict';
/* ============================================================================
   HexaVision — LAB 33 of 110 (Category 4: AI & Intelligent Applications)
   An image-AI platform: accounts, image uploads (simulated), AI analysis
   jobs (simulated deterministic results), galleries, collections, sharing,
   API access and credits. Zero-dependency Node. LOCAL LAB ONLY — 127.0.0.1.
   Intentionally vulnerable for training. Never deploy publicly.
   ========================================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB_NUMBER = 33;
const LAB_NAME = 'HexaVision';
const PORT = 3042;
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const LOGO_FILE = path.join(DIR, 'logo.png');

/* ---------------------------------------------------------------------------
   Key material — stored ONLY as base64-of-reversed shards, scattered across
   different regions of this file. Assembled at runtime only when needed.
   ------------------------------------------------------------------------- */

const ENTRY_KEY_SHA256 = '707cbfd0cedccb7a2d16c4168be67352fa9925e3dd1c466cb742dac13c9f329e';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */

/* ------------------------- Progress engine (§4) -------------------------- */
const TESTS = [
  /* ---- Login & Authentication ---- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03:2021 – Injection', difficulty: 'Beginner',
    hints: ['The legacy SSO login builds its query by gluing your input straight into a string.', "Try a quote in the password field, then make the whole condition true.", "Password: ' OR '1'='1 — the glued-together query then matches the first account (the admin)."],
    lesson: 'String-built queries let attacker input change the meaning of the query itself; parameterised queries keep data and code separate.',
    impact: 'On a real client site this is a full account takeover — the attacker logs in as admin without knowing any password.',
    report: { title: 'SQL Injection in Login (Authentication Bypass)', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limit or Lockout', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Pick one account and keep guessing its password.', 'Notice the login never slows down, CAPTCHAs or locks the account.', 'Fail 10 logins in a row for the same account — every attempt is still processed.'],
    lesson: 'Without throttling, lockout or MFA, an attacker can try unlimited passwords until one works.',
    impact: 'Attackers can grind through password lists against real customer accounts, including staff accounts, unnoticed.',
    report: { title: 'Missing Brute-Force Protection on Login', severity: 'High', remediation: 'Add rate limiting, progressive delays / lockout and MFA; alert on repeated failures.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User Enumeration via Login & Forgot-Password', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the answer for an email that exists with one that does not.', 'Try the forgot-password form with both kinds of email too.', 'Existing email: "wrong password" / reset sent. Unknown email: a different message. Probe one of each to prove it.'],
    lesson: 'Different error messages for "no such account" vs "wrong password" leak which emails are registered.',
    impact: 'Attackers first build a list of valid customer emails, then aim phishing and password attacks only at real accounts.',
    report: { title: 'User Enumeration via Authentication Responses', severity: 'Medium', remediation: 'Return one generic message ("invalid credentials" / "if an account exists…") for all cases.' } },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Default / Demo Credentials Still Active', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['The README lists the seeded test accounts for this lab.', 'One of them is a leftover demo account with a guessable password.', 'Log in as demo@hexavision.local with the documented demo password.'],
    lesson: 'Demo, default and seeded accounts left active in production are a standing back door.',
    impact: 'Anyone who reads the docs (or guesses) can sign in — a real client would hand attackers a working account.',
    report: { title: 'Active Default/Demo Account with Weak Password', severity: 'High', remediation: 'Remove or disable demo/default accounts before production; enforce unique strong passwords.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a reset and look at how the token is formed.', 'The token is not random — it is computed from something you know about the account.', 'Token = rst-(userId × 137 + 42). Compute it for the admin (id 1) and reset without ever seeing an email.'],
    lesson: 'Reset tokens must be long, random and single-use; anything derivable from a user id is public knowledge.',
    impact: 'An attacker can reset ANY account’s password — including the admin’s — with nothing but the victim’s user id.',
    report: { title: 'Predictable Password Reset Token', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), expire them quickly and make them single-use.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Session Role Cookie Tampering', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['Look at the cookies the app sets after login — one of them names a role.', 'The server trusts that cookie instead of its own session record.', 'Set the hxv_role cookie to admin and visit /admin as a normal user.'],
    lesson: 'Authorisation data must live server-side; anything the client can edit will be edited.',
    impact: 'Any customer can promote themselves to admin just by editing a cookie — full platform compromise.',
    report: { title: 'Client-Controlled Role Cookie Trusted for Authorisation', severity: 'Critical', remediation: 'Keep roles in the server-side session; never trust client-supplied role claims.' } },

  /* ---- Registration & Profile ---- */
  { id: 'reg-weakpw', feature: 'Registration & Profile', name: 'Weak Password Policy at Registration', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a new account and shrink the password.', 'There is no minimum length or complexity check at all.', 'A 1-character password is accepted — register with one.'],
    lesson: 'A password policy is the cheapest defence against credential guessing and stuffing.',
    impact: 'Customers will pick trivial passwords, and attackers will guess them in seconds.',
    report: { title: 'No Password Policy on Registration', severity: 'Medium', remediation: 'Enforce a minimum length (≥10) and block common/breached passwords.' } },
  { id: 'reg-massassign', feature: 'Registration & Profile', name: 'Mass Assignment — Plan, Credits and Role', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['The register and profile forms only show a few fields — the server accepts more.', 'Add fields the form never offered and see which ones stick.', 'Submit plan=Enterprise, credits=9999 or role=admin with registration or a profile update.'],
    lesson: 'Binding request bodies straight onto records lets attackers set privileged fields the UI never exposed.',
    impact: 'Attackers give themselves Enterprise plans, free credits or even admin role — direct revenue loss and takeover.',
    report: { title: 'Mass Assignment of Privileged Fields', severity: 'High', remediation: 'Whitelist bindable fields per endpoint; set role/plan/credits only in server-side logic.' } },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03:2021 – Injection', difficulty: 'Beginner',
    hints: ['Your display name is shown back on the dashboard and to the admin.', 'Names are stored and printed without escaping.', 'Set your display name to an HTML/JS payload such as <script>alert(1)</script>.'],
    lesson: 'Any user-controlled string rendered unescaped becomes stored XSS for every viewer, including admins.',
    impact: 'An attacker’s payload runs in other users’ and admins’ browsers — session theft and actions performed as the victim.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Escape all user output by context and add a Content-Security-Policy.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['Profile updates have no anti-CSRF token.', 'The app trusts any POST that arrives with your session cookie.', 'Send the profile POST from a "foreign" origin (or without the app’s marker cookie) and watch it apply.'],
    lesson: 'State-changing requests need an unguessable token tied to the session; cookies alone are ambient authority.',
    impact: 'A malicious page a logged-in user visits can silently change their profile — and, combined with other flaws, their role.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Add per-session CSRF tokens to all state-changing forms and verify Origin/Referer.' } },

  /* ---- Galleries & Images ---- */
  { id: 'gal-idor', feature: 'Galleries & Images', name: 'Private Gallery IDOR', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: ['Galleries have simple numeric ids in the URL.', 'The server checks that a gallery exists — not that it belongs to you.', 'Open gallery 1 or 4 (another user’s PRIVATE gallery) while logged in as someone else.'],
    lesson: 'Every object access must verify ownership/permission server-side; predictable ids are not protection.',
    impact: 'Customers’ private photo galleries — often client work or family photos — are readable by any signed-in stranger.',
    report: { title: 'Insecure Direct Object Reference on Private Galleries', severity: 'High', remediation: 'Authorise every object access against the session user; deny by default.' } },
  { id: 'img-idor', feature: 'Galleries & Images', name: 'Private Image IDOR', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: ['Images also live at simple numeric URLs.', 'Private images are served to anyone who asks for the id.', 'Open image 1, 5 or 6 (private, owned by others) as a different user.'],
    lesson: 'Media and download endpoints need the same ownership checks as the pages that link to them.',
    impact: 'Private client images can be downloaded in bulk by competitors or extortionists.',
    report: { title: 'Insecure Direct Object Reference on Private Images', severity: 'High', remediation: 'Check ownership/visibility on the media endpoint itself, not just in the UI.' } },
  { id: 'gal-searchxss', feature: 'Galleries & Images', name: 'Reflected XSS in Gallery Search', owasp: 'A03:2021 – Injection', difficulty: 'Beginner',
    hints: ['Search echoes your query back into the results page.', 'It is echoed without escaping.', 'Search for <script>alert(1)</script> and view the page source.'],
    lesson: 'Reflected input must be encoded; search pages are a classic delivery vehicle for phishing links.',
    impact: 'Attackers send victims a crafted search link that runs script in the victim’s session.',
    report: { title: 'Reflected Cross-Site Scripting in Search', severity: 'Medium', remediation: 'Contextually escape all reflected values; validate input.' } },
  { id: 'gal-enum', feature: 'Galleries & Images', name: 'Gallery / Image Enumeration', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['Object ids are small sequential numbers.', 'Nothing slows down or questions rapid browsing of many ids.', 'View at least 5 different gallery/image ids in quick succession.'],
    lesson: 'Sequential ids plus no monitoring turn "hidden" objects into a catalogue an attacker can scrape.',
    impact: 'Attackers map the whole media library first, then target the valuable private items.',
    report: { title: 'Enumerable Object Identifiers with No Access Monitoring', severity: 'Medium', remediation: 'Use unguessable ids (UUIDs) for sensitive objects and rate-limit object access.' } },

  /* ---- Uploads & Import ---- */
  { id: 'upl-type', feature: 'Uploads & Import', name: 'Upload Type Confusion — HTML Served Inline', owasp: 'A04:2021 – Insecure Design', difficulty: 'Intermediate',
    hints: ['The upload form accepts any "filename" and any content.', 'The media route serves the file back using the extension YOU chose.', 'Upload a file named page.html containing HTML/JS, then open its /media link — it renders as a web page from this origin.'],
    lesson: 'Uploaded files must be validated by content, renamed, and served with a safe content type (or as downloads).',
    impact: 'Attackers host phishing pages and script under the client’s own trusted domain.',
    report: { title: 'Unrestricted File Upload — HTML/Script Served from Application Origin', severity: 'High', remediation: 'Whitelist image types by magic bytes, store outside web root, serve with Content-Disposition: attachment or a safe type.' } },
  { id: 'upl-traversal', feature: 'Uploads & Import', name: 'Path Traversal on File Download', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['The download endpoint takes a file name parameter.', 'It joins the name to the uploads folder without cleaning it.', 'Ask for ../server.js and read the application’s own source code.'],
    lesson: 'User-supplied paths must be normalised and confined to the intended directory.',
    impact: 'Attackers read source code, configuration and secrets from the server — the keys to every other attack.',
    report: { title: 'Path Traversal in File Download', severity: 'High', remediation: 'Resolve the final path and verify it stays inside the allowed directory; whitelist file names.' } },
  { id: 'upl-ssrf', feature: 'Uploads & Import', name: 'SSRF via Image-URL Import', owasp: 'A10:2021 – Server-Side Request Forgery', difficulty: 'Intermediate',
    hints: ['The "import from URL" feature fetches whatever address you give it.', 'Nothing blocks internal or cloud-metadata addresses.', 'Import http://169.254.169.254/latest/meta-data/ and read what the server fetched on your behalf.'],
    lesson: 'Server-side fetchers must whitelist destinations and block private/metadata IP ranges.',
    impact: 'Attackers reach cloud credentials and internal services that were never meant to be public — often full cloud takeover.',
    report: { title: 'Server-Side Request Forgery in URL Import', severity: 'High', remediation: 'Allowlist hosts, block private/link-local ranges, and disable redirects to internal addresses.' } },

  /* ---- AI Analysis Jobs ---- */
  { id: 'job-idor', feature: 'AI Analysis Jobs', name: 'Analysis Job Result IDOR', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: ['Finished analysis jobs have numeric ids.', 'Results pages do not check the job’s owner.', 'Open job 1 (Alice’s) while logged in as Bob or Carol.'],
    lesson: 'Job/result endpoints are object accesses like any other — they need ownership checks.',
    impact: 'Competitors can read the AI results customers paid for, including labels on unreleased product photos.',
    report: { title: 'Insecure Direct Object Reference on Analysis Jobs', severity: 'Medium', remediation: 'Authorise job access against the owning account on every request.' } },
  { id: 'job-tamper', feature: 'AI Analysis Jobs', name: 'Analysis Result Tampering by Non-Owner', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['There is a "manual correction" endpoint for job results.', 'It checks that you are logged in — not that the job is yours.', 'POST a new score/labels to a job owned by another user.'],
    lesson: 'Write endpoints need the same ownership checks as reads — often stricter.',
    impact: 'Attackers can falsify moderation or quality results — e.g. mark unsafe content as safe on a client’s platform.',
    report: { title: 'Broken Access Control on Job Result Update', severity: 'High', remediation: 'Verify ownership (or an explicit reviewer role) before allowing result changes; log all edits.' } },
  { id: 'job-credit', feature: 'AI Analysis Jobs', name: 'Credit Abuse via Client-Supplied Job Cost', owasp: 'A04:2021 – Insecure Design', difficulty: 'Intermediate',
    hints: ['Creating an analysis job charges credits — the price is meant to be fixed per job type.', 'The create form carries the cost as an ordinary field.', 'Submit a job with cost 0 — or a negative cost — and watch your balance.'],
    lesson: 'Prices and charges must be computed server-side from the catalogue, never accepted from the client.',
    impact: 'Customers run unlimited paid AI jobs for free — or mint themselves credits — direct revenue loss.',
    report: { title: 'Client-Controlled Pricing on Credit-Charged Jobs', severity: 'High', remediation: 'Compute charges server-side; ignore any client-supplied price/cost fields.' } },

  /* ---- Collections & Sharing ---- */
  { id: 'col-leak', feature: 'Collections & Sharing', name: 'Private Collection Leakage', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: ['Collections group a user’s selected images.', 'Private collections are viewable by direct URL.', 'Open collection 1 or 3 (private, not yours) while logged in as another user.'],
    lesson: 'Visibility flags only protect data when every route enforces them.',
    impact: 'Curated client proof sets — often the most sensitive images — leak to any account holder.',
    report: { title: 'Private Collections Accessible by Direct URL', severity: 'High', remediation: 'Enforce visibility + ownership checks on the collection route.' } },
  { id: 'col-share', feature: 'Collections & Sharing', name: 'Predictable Share Token', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['Sharing a collection creates a public link token.', 'Look at the token format for a shared collection.', 'Tokens are just shr-<collection id>. Guess the link for a private, never-shared collection.'],
    lesson: 'Share links are capabilities — they must be long, random and revocable, never derivable from the object id.',
    impact: 'Anyone can open every "private" shared collection by counting numbers — sharing controls become theatre.',
    report: { title: 'Guessable Share Tokens for Private Collections', severity: 'High', remediation: 'Generate share tokens with a CSPRNG, store them hashed, and allow revocation.' } },

  /* ---- API Access ---- */
  { id: 'api-weak', feature: 'API Access', name: 'Predictable API Key Derived from Email', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['Your API key is shown on the API page — look at its shape.', 'It is not random at all: hv- plus a simple encoding of something public.', 'Compute hv_ + base64(email) for another user and call the API as them.'],
    lesson: 'API keys must be random secrets; anything derived from public data is public.',
    impact: 'Anyone who knows a customer’s email owns their API account — data access and credit spending included.',
    report: { title: 'Predictable API Keys Derived from Email Address', severity: 'High', remediation: 'Issue random API keys (≥128 bits), show them once, store only hashes.' } },
  { id: 'api-bola', feature: 'API Access', name: 'API Returns All Users’ Private Images (BOLA)', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['The /api/images endpoint answers with a key — any valid key.', 'It never scopes the results to the key’s owner.', 'Call it with your own key and count how many PRIVATE images belong to other users.'],
    lesson: 'API queries must always be scoped to the authenticated principal.',
    impact: 'One free account drains the whole platform’s private media library through the official API.',
    report: { title: 'Broken Object Level Authorisation in API Image Listing', severity: 'High', remediation: 'Scope every API query by the token owner; filter private objects by permission.' } },

  /* ---- Admin Panel ---- */
  { id: 'adm-csrf', feature: 'Admin Panel', name: 'State-Changing Admin Action via GET (CSRF)', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['Admins can grant credits from the admin panel.', 'The grant action is a plain link — a GET request that changes state.', 'As admin, open /admin/grant?email=…&amount=… — or trick an admin into opening it.'],
    lesson: 'GET requests must never change state; admin actions also need CSRF tokens.',
    impact: 'An attacker who gets an admin to click a link can mint credits or alter accounts — no password needed.',
    report: { title: 'CSRF / Unsafe GET for Admin Credit Grant', severity: 'Medium', remediation: 'Use POST with CSRF tokens for all state changes; never mutate on GET.' } },

  /* ---- Platform & Exposure ---- */
  { id: 'plt-debug', feature: 'Platform & Exposure', name: 'Debug Endpoint Exposes Internal Configuration', owasp: 'A05:2021 – Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Development leftovers often survive into the running app.', 'Try the classic diagnostics path.', 'Fetch /debug and read the internal configuration it hands to anyone.'],
    lesson: 'Debug and diagnostics endpoints must be removed or locked down before production.',
    impact: 'Attackers get internal configuration and notes that make every other attack faster and quieter.',
    report: { title: 'Exposed Debug Endpoint with Internal Configuration', severity: 'Medium', remediation: 'Remove debug endpoints in production; restrict diagnostics to admin + localhost.' } },
];
const TOTAL = TESTS.length;
const FEATURES = [...new Set(TESTS.map(t => t.feature))];

let state = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadState() {
  try { if (fs.existsSync(PROGRESS_FILE)) { const s = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); if (s && typeof s === 'object') state = Object.assign(state, s); } } catch (e) { /* fresh state */ }
}
function saveState() { try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 1)); } catch (e) { /* ignore */ } }
loadState();
function doneCount() { return TESTS.filter(t => state.tests[t.id]).length; }
function pct() { return Math.floor(doneCount() * 100 / TOTAL); }
function isComplete() { return doneCount() === TOTAL; }
function pass(id) {
  if (!TESTS.find(t => t.id === id)) return;
  if (!state.tests[id]) {
    state.tests[id] = true;
    if (isComplete() && !state.completedAt) { state.completedAt = new Date().toISOString(); state.keyRevealed = true; }
    saveState();
  }
}
function bump(feature) { state.attempts[feature] = (state.attempts[feature] || 0) + 1; saveState(); }
function attemptsOf(feature) { return state.attempts[feature] || 0; }

/* ------------------------------ Seed data -------------------------------- */
const users = [
  { id: 1, email: 'admin@hexavision.local', password: 'admin123', name: 'Vision Admin', role: 'admin', plan: 'Enterprise', credits: 500, apiKeyViewed: true },
  { id: 2, email: 'alice@hexavision.local', password: 'alice123', name: 'Alice Rahman', role: 'user', plan: 'Pro', credits: 120, apiKeyViewed: false },
  { id: 3, email: 'bob@hexavision.local', password: 'bob123', name: 'Bob Silva', role: 'user', plan: 'Free', credits: 25, apiKeyViewed: false },
  { id: 4, email: 'carol@hexavision.local', password: 'carol123', name: 'Carol Meyer', role: 'user', plan: 'Free', credits: 25, apiKeyViewed: false },
  { id: 5, email: 'demo@hexavision.local', password: 'demo1234', name: 'Demo User', role: 'user', plan: 'Free', credits: 10, apiKeyViewed: false },
];
let nextUserId = 6;
const galleries = [
  { id: 1, ownerId: 2, name: 'Wedding Selects', visibility: 'private' },
  { id: 2, ownerId: 2, name: 'Public Landscapes', visibility: 'public' },
  { id: 3, ownerId: 3, name: 'Product Shots', visibility: 'public' },
  { id: 4, ownerId: 4, name: 'Family Archive', visibility: 'private' },
];
let nextGalleryId = 5;
const images = [
  { id: 1, ownerId: 2, galleryId: 1, title: 'Ceremony Main Shot', filename: 'ceremony-main.jpg', content: 'SIMULATED-JPEG :: bride and groom at the altar', contentType: 'image/jpeg', visibility: 'private' },
  { id: 2, ownerId: 2, galleryId: 1, title: 'Vows Close-Up', filename: 'vows-closeup.jpg', content: 'SIMULATED-JPEG :: close-up of the vows', contentType: 'image/jpeg', visibility: 'private' },
  { id: 3, ownerId: 2, galleryId: 2, title: 'Mountain Dawn', filename: 'mountain-dawn.jpg', content: 'SIMULATED-JPEG :: sunrise over the ridge', contentType: 'image/jpeg', visibility: 'public' },
  { id: 4, ownerId: 3, galleryId: 3, title: 'Red Sneaker Product Shot', filename: 'sneaker-red.png', content: 'SIMULATED-PNG :: red sneaker on white', contentType: 'image/png', visibility: 'public' },
  { id: 5, ownerId: 4, galleryId: 4, title: 'Kids Birthday', filename: 'kids-birthday.jpg', content: 'SIMULATED-JPEG :: birthday cake and balloons', contentType: 'image/jpeg', visibility: 'private' },
  { id: 6, ownerId: 4, galleryId: 4, title: 'Grandma Portrait', filename: 'grandma-portrait.jpg', content: 'SIMULATED-JPEG :: portrait, natural light', contentType: 'image/jpeg', visibility: 'private' },
  { id: 7, ownerId: 3, galleryId: 3, title: 'Watch Macro', filename: 'watch-macro.png', content: 'SIMULATED-PNG :: macro watch face', contentType: 'image/png', visibility: 'public' },
];
let nextImageId = 8;
const collections = [
  { id: 1, ownerId: 2, name: 'Client Proofs — Do Not Share', visibility: 'private', imageIds: [1, 2], shareEnabled: false, shareToken: null },
  { id: 2, ownerId: 3, name: 'Portfolio Picks', visibility: 'public', imageIds: [4, 7], shareEnabled: false, shareToken: null },
  { id: 3, ownerId: 4, name: 'Family Heirlooms', visibility: 'private', imageIds: [5, 6], shareEnabled: false, shareToken: null },
];
let nextCollectionId = 4;
const JOB_PRICES = { tagging: 5, faces: 8, moderation: 3 };
const jobs = [
  { id: 1, ownerId: 2, imageId: 1, type: 'tagging', cost: 5, status: 'done', result: { labels: ['people', 'ceremony', 'indoor'], score: 96 } },
  { id: 2, ownerId: 3, imageId: 4, type: 'moderation', cost: 3, status: 'done', result: { labels: ['safe'], score: 99 } },
];
let nextJobId = 3;
const issuedResetTokens = new Set();

/* --------------------------- Runtime trackers ---------------------------- */
const sessions = new Map();           // sid -> { userId }
const bruteMap = new Map();           // cid|email -> failed count
const enumMap = new Map();            // cid -> { hit, miss }
const probeMap = new Map();           // cid -> [{ kind, id, ts }]
function resetTokenFor(user) { return 'rst-' + (user.id * 137 + 42); }
function apiKeyFor(user) { return 'hv_' + Buffer.from(user.email, 'utf8').toString('base64'); }
function analyze(image, type) {
  let h = 0; const s = image.content + '|' + type;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const pools = { tagging: ['people', 'outdoor', 'product', 'animal', 'vehicle', 'food', 'architecture'], faces: ['face', 'smile', 'eyes-open', 'adult'], moderation: ['safe', 'no-text', 'no-logo'] };
  const pool = pools[type] || pools.tagging;
  const labels = [pool[h % pool.length], pool[(h >> 3) % pool.length]].filter((v, i, a) => a.indexOf(v) === i);
  return { labels, score: 70 + (h % 30) };
}

/* ------------------------------- Helpers --------------------------------- */
const XSS_PAT = /<script|onerror\s*=|onload\s*=|<svg|<img[^>]*\sonerror|<iframe|<body[^>]*\sonload/i;
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function parseCookies(req) { const out = {}; const h = req.headers.cookie || ''; h.split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); }); return out; }
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 2e6) { req.destroy(); } });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) { try { return resolve(JSON.parse(data || '{}')); } catch (e) { return resolve({}); } }
      const out = {}; new URLSearchParams(data).forEach((v, k) => { out[k] = v; }); resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}
function clientId(req, res) {
  const c = parseCookies(req);
  if (c.hxv_cid) return c.hxv_cid;
  const id = crypto.randomBytes(8).toString('hex');
  res.setHeader('Set-Cookie', (res.getHeader('Set-Cookie') || []).concat([`hxv_cid=${id}; Path=/; HttpOnly`]));
  return id;
}
function currentUser(req) {
  const c = parseCookies(req);
  const s = c.hxv_session && sessions.get(c.hxv_session);
  if (!s) return null;
  return users.find(u => u.id === s.userId) || null;
}
function effectiveRole(req, user) {
  const c = parseCookies(req);
  if (c.hxv_role) return c.hxv_role;               // FLAW: client-supplied role trusted
  return user ? user.role : 'guest';
}
function startSession(res, userId) {
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, { userId });
  res.setHeader('Set-Cookie', (res.getHeader('Set-Cookie') || []).concat([`hxv_session=${sid}; Path=/; HttpOnly`, 'hx_origin=app; Path=/']));
}
function isCsrf(req) {
  const origin = req.headers.origin || req.headers.referer || '';
  if (origin && !origin.includes('127.0.0.1:' + PORT) && !origin.includes('localhost:' + PORT)) return true;
  const c = parseCookies(req);
  if (!c.hx_origin) return true;
  return false;
}
function noteEnumProbe(cid, exists) {
  const e = enumMap.get(cid) || { hit: false, miss: false };
  if (exists) e.hit = true; else e.miss = true;
  enumMap.set(cid, e);
  if (e.hit && e.miss) pass('auth-enum');
}
function noteProbe(cid, kind, id) {
  const now = Date.now();
  const arr = (probeMap.get(cid) || []).filter(p => now - p.ts < 120000);
  if (!arr.find(p => p.kind === kind && p.id === id)) arr.push({ kind, id, ts: now });
  probeMap.set(cid, arr);
  if (arr.length >= 5) pass('gal-enum');
}
function send(res, code, body, type) { res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' }); res.end(body); }
function sendJson(res, code, obj) { send(res, code, JSON.stringify(obj, null, 1), 'application/json'); }
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }

/* ------------------------------ Page shell ------------------------------- */
function shell(req, title, bodyHtml) {
  const user = currentUser(req);
  const d = doneCount(), p = pct();
  const bar = `<div style="background:#111827;border-bottom:2px solid #7c3aed;padding:8px 16px;color:#e5e7eb;font-family:monospace">
    <img src="/logo.png" alt="HexaCyberLab" style="height:26px;vertical-align:middle">
    <b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b> · ${d}/${TOTAL} tests · ${p}%
    <div style="background:#1f2937;height:10px;border-radius:5px;margin-top:6px"><div style="background:linear-gradient(90deg,#2563eb,#7c3aed);height:10px;border-radius:5px;width:${p}%"></div></div>
    <div style="margin-top:6px;font-size:13px">
      <a style="color:#93c5fd" href="/">Home</a> · <a style="color:#93c5fd" href="/dashboard">Dashboard</a> · <a style="color:#93c5fd" href="/galleries">Galleries</a> · <a style="color:#93c5fd" href="/collections">Collections</a> · <a style="color:#93c5fd" href="/jobs">AI Jobs</a> · <a style="color:#93c5fd" href="/upload">Upload</a> · <a style="color:#93c5fd" href="/api-page">API</a> · <a style="color:#93c5fd" href="/tests">Mission / Tests</a>
      ${user ? ` · <span>Signed in as ${esc(user.email)} (${esc(user.plan)}, ${user.credits} credits)</span> · <a style="color:#93c5fd" href="/profile">Profile</a> · <a style="color:#93c5fd" href="/logout">Logout</a>` : ' · <a style="color:#93c5fd" href="/login">Login</a> · <a style="color:#93c5fd" href="/register">Register</a>'}
    </div></div>`;
  const chat = `<div id="hxchat" style="position:fixed;right:14px;bottom:14px;width:320px;background:#0f172a;color:#e2e8f0;border:1px solid #7c3aed;border-radius:10px;font-family:monospace;font-size:13px;z-index:50">
    <div style="background:#7c3aed;padding:6px 10px;border-radius:10px 10px 0 0"><b>Lab Coach</b> — HexaVision</div>
    <div id="hxlog" style="height:170px;overflow:auto;padding:8px"></div>
    <div style="display:flex;border-top:1px solid #334155"><input id="hxin" style="flex:1;background:#1e293b;color:#e2e8f0;border:0;padding:8px" placeholder="Ask the coach…"><button onclick="hxSend()" style="background:#2563eb;color:#fff;border:0;padding:8px 12px">Send</button></div></div>
  <script>
  function hxAdd(who,txt){var l=document.getElementById('hxlog');var d=document.createElement('div');d.innerHTML='<b>'+who+':</b> ';d.appendChild(document.createTextNode(txt));l.appendChild(d);l.scrollTop=l.scrollHeight;}
  async function hxSend(){var i=document.getElementById('hxin');var m=i.value.trim();if(!m)return;i.value='';hxAdd('You',m);try{var r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})});var j=await r.json();hxAdd('Coach',j.reply);}catch(e){hxAdd('Coach','(chat unavailable)');}}
  document.getElementById('hxin').addEventListener('keydown',function(e){if(e.key==='Enter')hxSend();});
  </script>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} — HexaVision (LAB ${LAB_NUMBER})</title></head><body style="margin:0;font-family:system-ui;background:#f8fafc;color:#0f172a">${bar}<main style="max-width:960px;margin:0 auto;padding:20px">${bodyHtml}</main>${chat}</body></html>`;
}
function gatePage() {
  return `<!doctype html><html><head><meta charset="utf-8"><title>LAB ${LAB_NUMBER} — ${LAB_NAME} (Locked)</title></head><body style="font-family:system-ui;background:#0f172a;color:#e2e8f0;margin:0"><main style="max-width:560px;margin:60px auto;padding:24px;background:#111827;border:1px solid #7c3aed;border-radius:12px">
  <img src="/logo.png" alt="HexaCyberLab" style="height:44px">
  <h1>LAB ${LAB_NUMBER} — ${LAB_NAME}</h1>
  <p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
  <form method="POST" action="/unlock"><input name="key" style="width:100%;padding:10px;background:#1f2937;color:#e5e7eb;border:1px solid #374151;border-radius:6px" placeholder="Completion key from Lab ${LAB_NUMBER - 1}" autocomplete="off"><button style="margin-top:12px;background:#7c3aed;color:#fff;border:0;padding:10px 18px;border-radius:6px">Unlock Lab ${LAB_NUMBER}</button></form>
  <p style="color:#94a3b8;font-size:13px">HexaCyberLab vulnerable-lab series — for authorised local training only.</p></main></body></html>`;
}

/* ------------------------------ Auth routes ------------------------------ */
function legacyLogin(email, password) {
  // FLAW: "legacy SSO" path builds a query string by concatenation and a
  // tiny evaluator honours injected OR conditions — classic SQLi bypass.
  const q = `SELECT * FROM users WHERE email='${email}' AND password='${password}'`;
  if (/('\s*or\s*'1'\s*=\s*'1'|'\s*or\s*1\s*=\s*1|'\s*or\s*'[^']*'\s*=\s*'[^']*)/i.test(q)) {
    return { user: users[0], bypass: true };
  }
  const u = users.find(x => x.email === email);
  if (!u) return { error: 'No account with that email.' };
  if (u.password !== password) return { error: 'Wrong password for that account.' };
  return { user: u, bypass: false };
}
async function routeLogin(req, res) {
  if (req.method === 'GET') {
    return send(res, 200, shell(req, 'Login', `<h1>Sign in to HexaVision</h1>
      <form method="POST" action="/login"><p><label>Email <input name="email" style="width:280px"></label></p>
      <p><label>Password <input name="password" type="password" style="width:280px"></label></p>
      <button>Sign in</button></form><p><a href="/forgot">Forgot password?</a> · <a href="/register">Create account</a></p>`));
  }
  const b = await readBody(req);
  bump('Login & Authentication');
  const cid = clientId(req, res);
  const email = String(b.email || ''), password = String(b.password || '');
  const target = users.find(u => u.email === email);
  noteEnumProbe(cid, !!target || /'/.test(email));
  const r = legacyLogin(email, password);
  if (r.error) {
    const key = cid + '|' + email;
    const n = (bruteMap.get(key) || 0) + 1;
    bruteMap.set(key, n);
    if (n >= 10) pass('auth-brute');               // 10th failure still processed — no throttle
    return send(res, 200, shell(req, 'Login', `<h1>Sign in</h1><p style="color:#b91c1c">${esc(r.error)}</p><p><a href="/login">Try again</a> · <a href="/forgot">Forgot password?</a></p>`));
  }
  if (r.bypass) pass('auth-sqli');
  if (r.user.email === 'demo@hexavision.local' && !r.bypass) pass('auth-default');
  startSession(res, r.user.id);
  redirect(res, '/dashboard');
}
async function routeRegister(req, res) {
  if (req.method === 'GET') {
    return send(res, 200, shell(req, 'Register', `<h1>Create your HexaVision account</h1>
      <form method="POST" action="/register"><p><label>Display name <input name="name" style="width:280px"></label></p>
      <p><label>Email <input name="email" style="width:280px"></label></p>
      <p><label>Password <input name="password" type="password" style="width:280px"></label></p>
      <button>Create account</button></form>`));
  }
  const b = await readBody(req);
  bump('Registration & Profile');
  const email = String(b.email || '');
  if (!email || users.find(u => u.email === email)) return send(res, 400, shell(req, 'Register', '<h1>Register</h1><p>That email is already registered (or empty).</p>'));
  const u = { id: nextUserId++, email, password: String(b.password || ''), name: String(b.name || email), role: 'user', plan: 'Free', credits: 10, apiKeyViewed: false };
  // FLAW: mass assignment — the whole body is bound onto the new record.
  ['role', 'plan', 'credits'].forEach(k => { if (b[k] !== undefined && b[k] !== '') u[k] = k === 'credits' ? Number(b[k]) : String(b[k]); });
  if (String(b.password || '').length < 4) pass('reg-weakpw');   // accepted anyway — no policy
  if (u.role === 'admin' || u.plan !== 'Free' || u.credits !== 10) pass('reg-massassign');
  if (XSS_PAT.test(u.name)) pass('reg-xss');
  users.push(u);
  startSession(res, u.id);
  redirect(res, '/dashboard');
}
async function routeForgot(req, res) {
  if (req.method === 'GET') {
    return send(res, 200, shell(req, 'Forgot password', `<h1>Reset your password</h1>
      <form method="POST" action="/forgot"><p><label>Email <input name="email" style="width:280px"></label></p><button>Send reset link</button></form>
      <form method="POST" action="/reset" style="margin-top:24px"><p><label>Email <input name="email" style="width:280px"></label></p>
      <p><label>Reset token <input name="token" style="width:280px"></label></p>
      <p><label>New password <input name="password" style="width:280px"></label></p><button>Set new password</button></form>`));
  }
  const b = await readBody(req);
  bump('Login & Authentication');
  const cid = clientId(req, res);
  const u = users.find(x => x.email === String(b.email || ''));
  noteEnumProbe(cid, !!u);
  if (!u) return send(res, 200, shell(req, 'Forgot password', '<h1>Reset</h1><p style="color:#b91c1c">No account found for that email.</p>'));
  issuedResetTokens.add(resetTokenFor(u));   // FLAW: token is a formula, not random
  return send(res, 200, shell(req, 'Forgot password', '<h1>Reset</h1><p>A password reset link has been emailed to you.</p>'));
}
async function routeReset(req, res) {
  const b = await readBody(req);
  bump('Login & Authentication');
  const u = users.find(x => x.email === String(b.email || ''));
  if (!u) return send(res, 404, shell(req, 'Reset', '<h1>Reset</h1><p>No such account.</p>'));
  const token = String(b.token || '');
  if (token === resetTokenFor(u)) {
    if (!issuedResetTokens.has(token)) pass('auth-reset');   // computed, never issued
    issuedResetTokens.delete(token);
    u.password = String(b.password || 'changed123');
    return send(res, 200, shell(req, 'Reset', '<h1>Reset</h1><p>Password updated. <a href="/login">Sign in</a>.</p>'));
  }
  return send(res, 403, shell(req, 'Reset', '<h1>Reset</h1><p>Invalid reset token.</p>'));
}
function routeLogout(req, res) {
  const c = parseCookies(req);
  if (c.hxv_session) sessions.delete(c.hxv_session);
  res.setHeader('Set-Cookie', ['hxv_session=; Path=/; Max-Age=0']);
  redirect(res, '/login');
}
function routeDashboard(req, res) {
  const user = currentUser(req);
  const mine = images.filter(i => i.ownerId === user.id);
  const myJobs = jobs.filter(j => j.ownerId === user.id);
  // NOTE: user.name is printed UNESCAPED here (and in /admin) — the stored-XSS flaw.
  return send(res, 200, shell(req, 'Dashboard', `<h1>Welcome, ${user.name}</h1>
    <p>Plan: <b>${esc(user.plan)}</b> · Credits: <b>${user.credits}</b> · Role: <b>${esc(user.role)}</b></p>
    <h2>Your images (${mine.length})</h2><ul>${mine.map(i => `<li><a href="/image/${i.id}">${esc(i.title)}</a> (${esc(i.visibility)}) — <a href="/media/${i.id}">raw</a></li>`).join('') || '<li>None yet — <a href="/upload">upload one</a>.</li>'}</ul>
    <h2>Your recent analysis jobs</h2><ul>${myJobs.map(j => `<li><a href="/jobs/${j.id}">Job ${j.id}</a> — ${esc(j.type)} on image ${j.imageId} · score ${j.result.score}</li>`).join('') || '<li>None yet.</li>'}</ul>`));
}
async function routeProfile(req, res) {
  const user = currentUser(req);
  if (req.method === 'GET') {
    return send(res, 200, shell(req, 'Profile', `<h1>Your profile</h1>
      <form method="POST" action="/profile"><p><label>Display name <input name="name" value="${esc(user.name)}" style="width:280px"></label></p>
      <p>Email: ${esc(user.email)} · Plan: ${esc(user.plan)} · Credits: ${user.credits} · Role: ${esc(user.role)}</p>
      <button>Save profile</button></form>`));
  }
  const b = await readBody(req);
  bump('Registration & Profile');
  if (isCsrf(req)) pass('reg-csrf');           // FLAW: no token — the change is applied anyway
  if (b.name !== undefined) { user.name = String(b.name); if (XSS_PAT.test(user.name)) pass('reg-xss'); }
  ['role', 'plan', 'credits'].forEach(k => { if (b[k] !== undefined && b[k] !== '') user[k] = k === 'credits' ? Number(b[k]) : String(b[k]); });
  if (user.role === 'admin' || user.credits > 10000) pass('reg-massassign');
  redirect(res, '/profile');
}

/* --------------------- Galleries, images, search ------------------------- */
function ownerName(id) { const u = users.find(x => x.id === id); return u ? u.name : 'user ' + id; }
function routeGalleries(req, res) {
  const user = currentUser(req);
  const list = galleries.map(g => {
    const own = g.ownerId === user.id;
    return `<li><a href="/gallery/${g.id}">${esc(g.name)}</a> — ${esc(g.visibility)} · by ${esc(ownerName(g.ownerId))}${own ? ' (yours)' : ''}</li>`;
  }).join('');
  return send(res, 200, shell(req, 'Galleries', `<h1>Galleries</h1><ul>${list}</ul><p>Public galleries are community showcases. Private ones are… private. Supposedly.</p>`));
}
function routeGallery(req, res, id) {
  const user = currentUser(req);
  bump('Galleries & Images');
  noteProbe(clientId(req, res), 'gallery', id);
  const g = galleries.find(x => x.id === id);
  if (!g) return send(res, 404, shell(req, 'Gallery', '<h1>Gallery not found</h1>'));
  if (g.visibility === 'private' && g.ownerId !== user.id) pass('gal-idor');   // FLAW: served anyway
  const imgs = images.filter(i => i.galleryId === g.id);
  return send(res, 200, shell(req, 'Gallery', `<h1>${esc(g.name)}</h1><p>${esc(g.visibility)} gallery by ${esc(ownerName(g.ownerId))}</p>
    <ul>${imgs.map(i => `<li><a href="/image/${i.id}">${esc(i.title)}</a> (${esc(i.visibility)})</li>`).join('') || '<li>No images.</li>'}</ul>`));
}
function routeImage(req, res, id) {
  const user = currentUser(req);
  bump('Galleries & Images');
  noteProbe(clientId(req, res), 'image', id);
  const img = images.find(x => x.id === id);
  if (!img) return send(res, 404, shell(req, 'Image', '<h1>Image not found</h1>'));
  if (img.visibility === 'private' && img.ownerId !== user.id) pass('img-idor');   // FLAW: served anyway
  return send(res, 200, shell(req, 'Image', `<h1>${esc(img.title)}</h1>
    <p>File: ${esc(img.filename)} · ${esc(img.visibility)} · owner ${esc(ownerName(img.ownerId))}</p>
    <div style="background:#e2e8f0;padding:24px;text-align:center;font-family:monospace">${esc(img.content)}</div>
    <p><a href="/media/${img.id}">Open raw media</a> · <a href="/download?name=uploads/${encodeURIComponent(img.filename)}">Download</a></p>
    <form method="POST" action="/jobs"><input type="hidden" name="imageId" value="${img.id}">
    <label>Analyse: <select name="type"><option value="tagging">Tagging (5 credits)</option><option value="faces">Face analysis (8 credits)</option><option value="moderation">Moderation (3 credits)</option></select></label>
    <input type="hidden" name="cost" value=""> <button>Run analysis</button></form>`));
}
function routeSearch(req, res, url) {
  bump('Galleries & Images');
  const q = url.searchParams.get('q') || '';
  if (q && XSS_PAT.test(q)) pass('gal-searchxss');   // FLAW: q reflected unescaped below
  const hits = images.filter(i => (i.title + ' ' + i.filename).toLowerCase().includes(q.toLowerCase()));
  return send(res, 200, shell(req, 'Search', `<h1>Search images</h1>
    <form method="GET" action="/search"><input name="q" value="${esc(q)}" style="width:300px"><button>Search</button></form>
    <p>Results for: ${q}</p><ul>${hits.map(i => `<li><a href="/image/${i.id}">${esc(i.title)}</a> (${esc(i.visibility)})</li>`).join('') || '<li>No matches.</li>'}</ul>`));
}
function routeMedia(req, res, id) {
  const img = images.find(x => x.id === id);
  if (!img) return send(res, 404, 'not found', 'text/plain');
  // FLAW: uploader-chosen content type is honoured — HTML "images" render inline.
  if (img.contentType === 'text/html' || (img.contentType === 'image/svg+xml' && XSS_PAT.test(img.content))) pass('upl-type');
  res.writeHead(200, { 'Content-Type': img.contentType || 'application/octet-stream' });
  res.end(img.content);
}
async function routeUpload(req, res) {
  const user = currentUser(req);
  if (req.method === 'GET') {
    const gs = galleries.filter(g => g.ownerId === user.id).map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('');
    return send(res, 200, shell(req, 'Upload', `<h1>Upload an image</h1>
      <form method="POST" action="/upload"><p><label>Title <input name="title" style="width:280px"></label></p>
      <p><label>File name <input name="filename" style="width:280px" placeholder="photo.jpg"></label></p>
      <p><label>File contents (simulated) <input name="content" style="width:280px" placeholder="SIMULATED-JPEG :: …"></label></p>
      <p><label>Gallery <select name="galleryId">${gs}</select></label></p>
      <p><label>Visibility <select name="visibility"><option>private</option><option>public</option></select></label></p>
      <button>Upload</button></form>
      <h2>Import from URL</h2>
      <form method="POST" action="/import"><p><label>Image URL <input name="url" style="width:340px" placeholder="https://example.com/pic.jpg"></label></p>
      <p><label>Title <input name="title" style="width:280px"></label></p><button>Import</button></form>`));
  }
  const b = await readBody(req);
  bump('Uploads & Import');
  const filename = String(b.filename || 'untitled.jpg');
  const ext = (filename.split('.').pop() || '').toLowerCase();
  let contentType = 'application/octet-stream';
  if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
  else if (ext === 'png') contentType = 'image/png';
  else if (ext === 'gif') contentType = 'image/gif';
  else if (ext === 'html' || ext === 'htm') contentType = 'text/html';        // FLAW: type confusion accepted
  else if (ext === 'svg') contentType = 'image/svg+xml';
  const img = { id: nextImageId++, ownerId: user.id, galleryId: Number(b.galleryId) || 0, title: String(b.title || filename), filename, content: String(b.content || ''), contentType, visibility: b.visibility === 'public' ? 'public' : 'private' };
  images.push(img);
  redirect(res, '/image/' + img.id);
}
async function routeImport(req, res) {
  const user = currentUser(req);
  const b = await readBody(req);
  bump('Uploads & Import');
  const url = String(b.url || '');
  let content;
  // SIMULATED server-side fetch — no real network access leaves this process.
  if (/169\.254\.169\.254/.test(url)) content = '{"SIMULATED-INTERNAL":"cloud-metadata","iam-role":"hexavision-prod","access-key":"AKIA-SIMULATED","secret":"SIMULATED-SECRET-KEY"}';
  else if (/localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]/i.test(url)) content = 'SIMULATED-INTERNAL :: HexaVision admin console snapshot :: users=5 :: maintenance mode off';
  else content = 'remote image bytes (simulated) fetched from ' + url;
  if (content.includes('SIMULATED-INTERNAL')) pass('upl-ssrf');
  const img = { id: nextImageId++, ownerId: user.id, galleryId: 0, title: String(b.title || 'Imported image'), filename: 'import-' + nextImageId + '.jpg', content, contentType: 'image/jpeg', visibility: 'private' };
  images.push(img);
  return send(res, 200, shell(req, 'Import', `<h1>Imported</h1><p>The server fetched this content for you:</p><pre style="background:#e2e8f0;padding:12px;white-space:pre-wrap">${esc(content)}</pre><p><a href="/image/${img.id}">View imported image</a></p>`));
}
function routeDownload(req, res, url) {
  bump('Uploads & Import');
  const name = url.searchParams.get('name') || '';
  if (name.includes('..')) {
    // FLAW: traversal — the name escapes the uploads folder unchecked.
    const rel = name.replace(/^(\.\.\/|\.\.\\)+/, '');
    try {
      const target = path.join(DIR, rel);
      if (target.startsWith(DIR) && fs.existsSync(target) && fs.statSync(target).isFile()) {
        const content = fs.readFileSync(target, 'utf8');
        if (content.includes('createServer') || rel === 'server.js') pass('upl-traversal');
        return send(res, 200, content, 'text/plain; charset=utf-8');
      }
    } catch (e) { /* fall through */ }
    return send(res, 404, 'not found', 'text/plain');
  }
  const img = images.find(i => name === 'uploads/' + i.filename || name === i.filename);
  if (!img) return send(res, 404, 'not found', 'text/plain');
  return send(res, 200, img.content, 'text/plain; charset=utf-8');
}

/* --------------------------- AI analysis jobs ---------------------------- */
async function routeJobs(req, res) {
  const user = currentUser(req);
  if (req.method === 'GET') {
    const all = jobs.map(j => `<li><a href="/jobs/${j.id}">Job ${j.id}</a> — ${esc(j.type)} on image ${j.imageId} · owner ${esc(ownerName(j.ownerId))} · score ${j.result.score}</li>`).join('');
    const mine = images.filter(i => i.ownerId === user.id).map(i => `<option value="${i.id}">${esc(i.title)}</option>`).join('');
    return send(res, 200, shell(req, 'AI Jobs', `<h1>AI analysis jobs</h1><ul>${all}</ul>
      <h2>New analysis</h2><form method="POST" action="/jobs"><p><label>Image <select name="imageId">${mine}</select></label></p>
      <p><label>Type <select name="type"><option value="tagging">Tagging (5 credits)</option><option value="faces">Face analysis (8 credits)</option><option value="moderation">Moderation (3 credits)</option></select></label></p>
      <p><label>Cost (credits) <input name="cost" value="5" style="width:80px"></label></p>
      <button>Run analysis (credits: ${user.credits})</button></form>`));
  }
  const b = await readBody(req);
  bump('AI Analysis Jobs');
  const img = images.find(i => i.id === Number(b.imageId));
  if (!img) return send(res, 404, shell(req, 'AI Jobs', '<h1>Image not found</h1>'));
  const type = JOB_PRICES[b.type] ? String(b.type) : 'tagging';
  const price = JOB_PRICES[type];
  const charged = (b.cost !== undefined && b.cost !== '') ? Number(b.cost) : price;   // FLAW: client sets the price
  if (!Number.isNaN(charged) && charged !== price) pass('job-credit');
  user.credits -= (Number.isNaN(charged) ? price : charged);
  const job = { id: nextJobId++, ownerId: user.id, imageId: img.id, type, cost: Number.isNaN(charged) ? price : charged, status: 'done', result: analyze(img, type) };
  jobs.push(job);
  redirect(res, '/jobs/' + job.id);
}
function routeJob(req, res, id) {
  const user = currentUser(req);
  bump('AI Analysis Jobs');
  const job = jobs.find(j => j.id === id);
  if (!job) return send(res, 404, shell(req, 'Job', '<h1>Job not found</h1>'));
  if (job.ownerId !== user.id) pass('job-idor');   // FLAW: results readable by anyone
  const img = images.find(i => i.id === job.imageId);
  return send(res, 200, shell(req, 'Job', `<h1>Analysis job ${job.id}</h1>
    <p>Type: ${esc(job.type)} · Image: ${img ? esc(img.title) : job.imageId} · Owner: ${esc(ownerName(job.ownerId))} · Cost: ${job.cost} credits</p>
    <p>Labels: <b>${job.result.labels.map(esc).join(', ')}</b> · Confidence score: <b>${job.result.score}</b></p>
    <h2>Manual result correction</h2>
    <form method="POST" action="/jobs/${job.id}/result"><p><label>Labels (comma separated) <input name="labels" style="width:280px"></label></p>
    <p><label>Score <input name="score" style="width:80px"></label></p><button>Save corrected result</button></form>`));
}
async function routeJobResult(req, res, id) {
  const user = currentUser(req);
  const b = await readBody(req);
  bump('AI Analysis Jobs');
  const job = jobs.find(j => j.id === id);
  if (!job) return send(res, 404, shell(req, 'Job', '<h1>Job not found</h1>'));
  if (job.ownerId !== user.id) pass('job-tamper');   // FLAW: no ownership check on writes
  job.result = { labels: String(b.labels || '').split(',').map(s => s.trim()).filter(Boolean), score: Number(b.score) || 0 };
  redirect(res, '/jobs/' + job.id);
}

/* ------------------------- Collections & sharing ------------------------- */
function collectionHtml(req, c, viaShare) {
  const imgs = c.imageIds.map(id => images.find(i => i.id === id)).filter(Boolean);
  return `<h1>${esc(c.name)}</h1><p>${esc(c.visibility)} collection by ${esc(ownerName(c.ownerId))}${viaShare ? ' · opened via share link' : ''}</p>
    <ul>${imgs.map(i => `<li><a href="/image/${i.id}">${esc(i.title)}</a> (${esc(i.visibility)})</li>`).join('') || '<li>Empty.</li>'}</ul>`;
}
function routeCollections(req, res) {
  const user = currentUser(req);
  const list = collections.map(c => `<li><a href="/collection/${c.id}">${esc(c.name)}</a> — ${esc(c.visibility)} · by ${esc(ownerName(c.ownerId))}${c.ownerId === user.id ? ` · <form method="POST" action="/collection/${c.id}/share" style="display:inline"><button>Enable share link</button></form> ${c.shareEnabled ? 'share link: /s/' + c.shareToken : ''}` : ''}</li>`).join('');
  return send(res, 200, shell(req, 'Collections', `<h1>Collections</h1><ul>${list}</ul>`));
}
function routeCollection(req, res, id) {
  const user = currentUser(req);
  bump('Collections & Sharing');
  const c = collections.find(x => x.id === id);
  if (!c) return send(res, 404, shell(req, 'Collection', '<h1>Collection not found</h1>'));
  if (c.visibility === 'private' && c.ownerId !== user.id) pass('col-leak');   // FLAW: served anyway
  return send(res, 200, shell(req, 'Collection', collectionHtml(req, c, false)));
}
function routeCollectionShare(req, res, id) {
  const user = currentUser(req);
  bump('Collections & Sharing');
  const c = collections.find(x => x.id === id);
  if (!c || c.ownerId !== user.id) return send(res, 403, shell(req, 'Collection', '<h1>Only the owner can share.</h1>'));
  c.shareEnabled = true;
  c.shareToken = 'shr-' + c.id;   // FLAW: token is just the id — guessable for every collection
  redirect(res, '/collections');
}
function routeShare(req, res, token) {
  bump('Collections & Sharing');
  let c = collections.find(x => x.shareToken && x.shareToken === token);
  if (!c) {
    const m = /^shr-(\d+)$/.exec(token);
    if (m) c = collections.find(x => x.id === Number(m[1]));   // FLAW: formula tokens honoured even when never shared
  }
  if (!c) return send(res, 404, shell(req, 'Share', '<h1>Share link not found</h1>'));
  if (c.visibility === 'private' && !c.shareEnabled) pass('col-share');
  return send(res, 200, shell(req, 'Shared collection', collectionHtml(req, c, true)));
}

/* --------------------------------- API ----------------------------------- */
function apiAuth(req) {
  const token = req.headers['x-api-key'] || '';
  const u = users.find(x => apiKeyFor(x) === token);
  if (u && !u.apiKeyViewed) pass('api-weak');   // key derived from email — never actually issued to the caller
  return u || null;
}
function routeApiPage(req, res) {
  const user = currentUser(req);
  bump('API Access');
  user.apiKeyViewed = true;
  return send(res, 200, shell(req, 'API', `<h1>HexaVision API</h1>
    <p>Your API key: <code>${esc(apiKeyFor(user))}</code></p>
    <p>Send it as the <code>X-API-Key</code> header. Endpoints: <code>GET /api/me</code>, <code>GET /api/images</code>.</p>`));
}
function routeApiMe(req, res) {
  bump('API Access');
  const u = apiAuth(req);
  if (!u) return sendJson(res, 401, { error: 'invalid api key' });
  return sendJson(res, 200, { id: u.id, email: u.email, plan: u.plan, credits: u.credits, role: u.role });
}
function routeApiImages(req, res) {
  bump('API Access');
  const u = apiAuth(req);
  if (!u) return sendJson(res, 401, { error: 'invalid api key' });
  // FLAW: no scoping to the key owner — every image, private included.
  if (images.some(i => i.ownerId !== u.id && i.visibility === 'private')) pass('api-bola');
  return sendJson(res, 200, images.map(i => ({ id: i.id, ownerId: i.ownerId, title: i.title, filename: i.filename, visibility: i.visibility, content: i.content })));
}

/* ------------------------------ Admin/debug ------------------------------ */
function routeAdmin(req, res) {
  const user = currentUser(req);
  const role = effectiveRole(req, user);
  if (role !== 'admin') return send(res, 403, shell(req, 'Admin', '<h1>Admins only</h1>'));
  if (user.role !== 'admin' && parseCookies(req).hxv_role === 'admin') pass('auth-cookie');
  bump('Admin Panel');
  const rows = users.map(u => `<tr><td>${u.id}</td><td>${esc(u.email)}</td><td>${u.name}</td><td>${esc(u.role)}</td><td>${esc(u.plan)}</td><td>${u.credits}</td></tr>`).join('');
  return send(res, 200, shell(req, 'Admin', `<h1>HexaVision admin</h1>
    <table border="1" cellpadding="6"><tr><th>id</th><th>email</th><th>name</th><th>role</th><th>plan</th><th>credits</th></tr>${rows}</table>
    <h2>Grant credits</h2><form method="GET" action="/admin/grant"><p><label>Email <input name="email" style="width:240px"></label>
    <label>Amount <input name="amount" style="width:80px"></label> <button>Grant</button></p></form>`));
}
function routeAdminGrant(req, res, url) {
  const user = currentUser(req);
  const role = effectiveRole(req, user);
  if (role !== 'admin') return send(res, 403, shell(req, 'Admin', '<h1>Admins only</h1>'));
  bump('Admin Panel');
  const target = users.find(u => u.email === (url.searchParams.get('email') || ''));
  const amount = Number(url.searchParams.get('amount') || 0);
  if (target && amount) { target.credits += amount; pass('adm-csrf'); }   // FLAW: state change via GET
  return send(res, 200, shell(req, 'Admin', `<h1>Grant</h1><p>${target ? `Granted ${amount} credits to ${esc(target.email)} (balance ${target.credits}).` : 'No such user.'}</p><p><a href="/admin">Back to admin</a></p>`));
}
function routeDebug(req, res) {
  bump('Platform & Exposure');
  pass('plt-debug');
  return sendJson(res, 200, { lab: LAB_NAME, version: '2.4.1', env: 'local-lab', database: 'simulated-in-memory', internalNote: 'SIMULATED-INTERNAL config — debug build, do not ship', storage: 'uploads_virtual/', jobPrices: JOB_PRICES, users: users.length });
}

/* --------------------- Mission / completion / certificate ---------------- */
function routeTests(req, res) {
  const groups = FEATURES.map(f => {
    const ts = TESTS.filter(t => t.feature === f);
    const items = ts.map(t => `<li style="margin-bottom:10px">${state.tests[t.id] ? '✓' : '○'} <b>${esc(t.name)}</b> — ${esc(t.owasp)} · ${esc(t.difficulty)}<br>
      <span style="color:#475569">Hints:</span> ${t.hints.map((h, i) => `<span style="display:block;margin-left:14px">${i + 1}. ${esc(h)}</span>`).join('')}</li>`).join('');
    return `<h2>${esc(f)} (${ts.filter(t => state.tests[t.id]).length}/${ts.length}) — attempts so far: ${attemptsOf(f)}</h2><ul>${items}</ul>`;
  }).join('');
  return send(res, 200, shell(req, 'Mission', `<h1>Mission — LAB ${LAB_NUMBER} ${LAB_NAME}</h1><p>${doneCount()}/${TOTAL} tests complete (${pct()}%). Pass a test by actually performing the exploit — there are no "mark done" buttons. The Lab Coach unlocks step-by-step help for a feature after you have genuinely tried that feature at least 3 times.</p>${groups}`));
}
async function routeComplete(req, res) {
  const user = currentUser(req);
  if (req.method === 'POST') {
    const b = await readBody(req);
    if (b.testerName) { state.testerName = String(b.testerName).slice(0, 60); saveState(); }
    return redirect(res, '/complete');
  }
  if (!isComplete()) {
    const left = TESTS.filter(t => !state.tests[t.id]).map(t => `<li>${esc(t.name)} <span style="color:#64748b">(${esc(t.feature)})</span></li>`).join('');
    return send(res, 200, shell(req, 'Complete', `<h1>Not yet complete</h1><p>Progress: ${doneCount()}/${TOTAL} (${pct()}%). Still open:</p><ul>${left}</ul><p><a href="/tests">Back to the mission page</a></p>`));
  }
  const perFeature = FEATURES.map(f => { const ts = TESTS.filter(t => t.feature === f); return `<li><b>${esc(f)}</b>: ${ts.length} vulnerabilities</li>`; }).join('');
  const ways = TESTS.map(t => `<li>${esc(t.name)} <span style="color:#64748b">(${esc(t.feature)})</span></li>`).join('');
  const lessons = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('');
  const impacts = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('');
  const reports = TESTS.map(t => `<li><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)} — Fix: ${esc(t.report.remediation)}</li>`).join('');
  return send(res, 200, shell(req, 'Complete', `<h1>LAB ${LAB_NUMBER} — ${LAB_NAME}: COMPLETE</h1>
    <h2>1 · Features in this lab</h2><p>${FEATURES.length} features, ${TOTAL} security tests.</p>
    <h2>2 · Vulnerabilities per feature</h2><ul>${perFeature}</ul>
    <h2>3 · How the testing was done (${TOTAL} ways)</h2><ul>${ways}</ul>
    <h2>4 · What you learned</h2><ul>${lessons}</ul>
    <h2>5 · What this means for a real client</h2><ul>${impacts}</ul>
    <h2>6 · Writing it in a real report</h2><ul>${reports}</ul>
    <h2>Your completion key for Lab ${LAB_NUMBER + 1}</h2>
    <p style="font-family:monospace;font-size:18px;background:#ecfdf5;border:1px solid #059669;padding:12px">${esc(completionKey())}</p>
    <form method="POST" action="/complete"><label>Your name for the certificate <input name="testerName" value="${esc(state.testerName || (user ? user.name : ''))}" style="width:240px"></label> <button>Save name</button></form>
    <p><a href="/certificate">Open your certificate</a></p>`));
}
function routeCertificate(req, res) {
  const user = currentUser(req);
  if (!isComplete()) return redirect(res, '/complete');
  const name = state.testerName || (user ? user.name : 'HexaVision Tester');
  const date = state.completedAt ? new Date(state.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  return send(res, 200, `<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER}</title><style>@media print{button{display:none}}body{font-family:Georgia,serif;background:#f1f5f9}</style></head>
  <body><div style="max-width:680px;margin:40px auto;background:#fff;border:3px double #7c3aed;padding:36px;text-align:center">
  <img src="/logo.png" alt="HexaCyberLab" style="height:56px">
  <h1 style="color:#4c1d95">Certificate of Completion</h1>
  <p>This certifies that</p><h2>${esc(name)}</h2>
  <p>has completed 100% of the security tests in</p>
  <h2>LAB ${LAB_NUMBER} — ${LAB_NAME} (${TOTAL} tests across ${FEATURES.length} features)</h2>
  <p>${esc(date)}</p>
  <p style="margin-top:28px;color:#475569">HexaCyberLab — Built by Md. Jony Hassain, Founder</p>
  <button onclick="window.print()">Print</button></div></body></html>`);
}
function routeProgressApi(req, res) {
  const features = {};
  FEATURES.forEach(f => { const ts = TESTS.filter(t => t.feature === f); features[f] = { total: ts.length, done: ts.filter(t => state.tests[t.id]).length, attempts: attemptsOf(f) }; });
  return sendJson(res, 200, { lab: LAB_NAME, number: LAB_NUMBER, total: TOTAL, done: doneCount(), pct: pct(), features, complete: isComplete() });
}

/* --------------------------- Completion key ------------------------------ */
const _CK = ["TC1YSA==", "RC00Mw==", "TTdJVA==", "LVMyUA==", "U1U3Nw==", "TUVLTA=="];
function completionKey() { return _CK.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join(''); }

/* -------------------------------- Chatbot -------------------------------- */
const CHAT_FEATURE_KEYS = [
  ['Login & Authentication', ['login', 'auth', 'password', 'brute', 'reset token', 'enumerat', 'session', 'cookie']],
  ['Registration & Profile', ['register', 'registration', 'profile', 'sign up', 'signup', 'mass assignment']],
  ['Galleries & Images', ['gallery', 'galleries', 'image', 'search', 'idor']],
  ['Uploads & Import', ['upload', 'import', 'ssrf', 'download', 'traversal', 'file']],
  ['AI Analysis Jobs', ['job', 'analysis', 'analyse', 'analyze', 'credit']],
  ['Collections & Sharing', ['collection', 'share', 'sharing']],
  ['API Access', ['api']],
  ['Admin Panel', ['admin']],
  ['Platform & Exposure', ['debug', 'platform', 'exposure', 'config']],
];
async function routeChat(req, res) {
  const b = await readBody(req);
  const msg = String(b.message || '');
  const m = msg.toLowerCase();
  let reply;
  if (/who (built|made|created)|founder|behind (this|the labs)/.test(m)) {
    reply = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  } else if (/(completion key|next lab|the key|unlock.*key|key for lab)/.test(m)) {
    if (isComplete() && state.keyRevealed) reply = 'Lab complete — well done. The completion key for Lab ' + (LAB_NUMBER + 1) + ' is: ' + completionKey();
    else reply = "I don't have the completion key yet — it is only given to me when this lab reaches 100%. Your current progress is " + pct() + '% (' + doneCount() + '/' + TOTAL + '). Finish every test and ask me again.';
  } else if (/how many|features|vulnerabilit/.test(m)) {
    reply = 'HexaVision has ' + FEATURES.length + ' features and ' + TOTAL + ' tests: ' + FEATURES.map(f => f + ' (' + TESTS.filter(t => t.feature === f).length + ')').join(', ') + '. You have passed ' + doneCount() + ' so far.';
  } else if (/progress|status|next/.test(m)) {
    const next = TESTS.find(t => !state.tests[t.id]);
    reply = 'Progress: ' + doneCount() + '/' + TOTAL + ' (' + pct() + '%).' + (next ? ' Next open test: "' + next.name + '" in ' + next.feature + '.' : ' Everything is done — see /complete for your key and certificate.');
  } else {
    const hit = CHAT_FEATURE_KEYS.find(([f, keys]) => keys.some(k => m.includes(k)));
    if (hit) {
      const f = hit[0];
      const ts = TESTS.filter(t => t.feature === f);
      const allPassed = ts.every(t => state.tests[t.id]);
      if (attemptsOf(f) >= 3 || allPassed) {
        reply = 'Step by step for ' + f + ':\n' + ts.map(t => '• ' + t.name + (state.tests[t.id] ? ' (done ✓)' : '') + ' — ' + t.hints[2]).join('\n');
      } else {
        reply = 'That feature is locked for help. First try the ' + f + ' tests yourself at least 3 times — I can see you\'ve tried ' + attemptsOf(f) + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
      }
    } else if (/^(hi|hello|hey|help)/.test(m)) {
      reply = 'Welcome to LAB ' + LAB_NUMBER + ' — HexaVision, an image-AI platform. It has ' + FEATURES.length + ' features and ' + TOTAL + ' security tests. Track them on /tests, try each exploit yourself, and after 3 tries on a feature I can guide you step by step. Your progress: ' + pct() + '%.';
    } else {
      reply = 'I can help with this lab\'s ' + TOTAL + ' tests across ' + FEATURES.length + ' features. Ask me how many vulnerabilities a feature has, check your progress, or — after 3 real tries on a feature — ask how to do its tests. The mission page /tests shows every test with graded hints.';
    }
  }
  return sendJson(res, 200, { reply });
}

/* -------------------------------- Router --------------------------------- */
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:' + PORT);
    const p = url.pathname;
    /* logo is always public */
    if (p === '/logo.png') { res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(fs.readFileSync(LOGO_FILE)); }
    /* lock gate */
    if (!state.unlocked) {
      if (p === '/api/chat' && req.method === 'POST') return routeChat(req, res);
      if (p === '/api/progress') return routeProgressApi(req, res);
      if (p === '/unlock' && req.method === 'POST') {
        const b = await readBody(req);
        if (entryKeyMatches(String(b.key || '').trim())) { state.unlocked = true; saveState(); return redirect(res, '/'); }
        return send(res, 403, gatePage().replace('This lab is locked.', 'That key was not accepted. This lab is locked.'));
      }
      return send(res, 200, gatePage());
    }
    /* public-ish routes */
    if (p === '/unlock') { state.unlocked = true; return redirect(res, '/'); }
    if (p === '/login') return routeLogin(req, res);
    if (p === '/register') return routeRegister(req, res);
    if (p === '/forgot') return routeForgot(req, res);
    if (p === '/reset' && req.method === 'POST') return routeReset(req, res);
    if (p === '/logout') return routeLogout(req, res);
    if (p === '/api/chat' && req.method === 'POST') return routeChat(req, res);
    if (p === '/api/progress') return routeProgressApi(req, res);
    if (p === '/api/me') return routeApiMe(req, res);
    if (p === '/api/images') return routeApiImages(req, res);
    if (p === '/debug') return routeDebug(req, res);
    if (p.startsWith('/s/')) return routeShare(req, res, decodeURIComponent(p.slice(3)));
    /* everything below needs a session */
    const user = currentUser(req);
    if (!user && p !== '/complete' && p !== '/complete/name' && p !== '/certificate') return redirect(res, '/login');
    if (p === '/' || p === '/dashboard') return routeDashboard(req, res);
    if (p === '/profile') return routeProfile(req, res);
    if (p === '/galleries') return routeGalleries(req, res);
    let mm;
    if ((mm = /^\/gallery\/(\d+)$/.exec(p))) return routeGallery(req, res, Number(mm[1]));
    if ((mm = /^\/image\/(\d+)$/.exec(p))) return routeImage(req, res, Number(mm[1]));
    if (p === '/search') return routeSearch(req, res, url);
    if ((mm = /^\/media\/(\d+)$/.exec(p))) return routeMedia(req, res, Number(mm[1]));
    if (p === '/upload') return routeUpload(req, res);
    if (p === '/import' && req.method === 'POST') return routeImport(req, res);
    if (p === '/download') return routeDownload(req, res, url);
    if (p === '/jobs') return routeJobs(req, res);
    if ((mm = /^\/jobs\/(\d+)$/.exec(p))) return routeJob(req, res, Number(mm[1]));
    if ((mm = /^\/jobs\/(\d+)\/result$/.exec(p)) && req.method === 'POST') return routeJobResult(req, res, Number(mm[1]));
    if (p === '/collections') return routeCollections(req, res);
    if ((mm = /^\/collection\/(\d+)$/.exec(p))) return routeCollection(req, res, Number(mm[1]));
    if ((mm = /^\/collection\/(\d+)\/share$/.exec(p)) && req.method === 'POST') return routeCollectionShare(req, res, Number(mm[1]));
    if (p === '/api-page') return routeApiPage(req, res);
    if (p === '/admin') return routeAdmin(req, res);
    if (p === '/admin/grant') return routeAdminGrant(req, res, url);
    if (p === '/tests') return routeTests(req, res);
    if (p === '/complete') return routeComplete(req, res);
    if (p === '/certificate') return routeCertificate(req, res);
    return send(res, 404, shell(req, 'Not found', '<h1>404 — page not found</h1>'));
  } catch (e) {
    try { send(res, 500, 'internal error', 'text/plain'); } catch (e2) { /* socket gone */ }
  }
});
if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => console.log(`HexaVision (LAB ${LAB_NUMBER}) listening on http://127.0.0.1:${PORT}`));
}
module.exports = { TESTS, FEATURES, TOTAL };
