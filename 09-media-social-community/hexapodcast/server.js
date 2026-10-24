'use strict';
/*
 * HexaPodcast — LAB 85 (Category 9: Media, Social & Community)
 * A deliberately vulnerable podcast platform for security training.
 * Zero-dependency Node.js. LOCAL USE ONLY — never deploy publicly.
 * All data is fake seed data held in memory. Audio is simulated in-app.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3094;
const LAB_NUMBER = 85;
const LAB_NAME = 'HexaPodcast';
const PREV_LAB = 84;
const DIR = __dirname;
const STATE_FILE = path.join(DIR, 'progress.json');
const PREMIUM_PRICE = 12;

/* ------------------------------------------------------------------ *
 * Fragment vault A (do not reorganise — fragments are load-bearing). *
 * ------------------------------------------------------------------ */
const _vaultA1 = ['TC1YSA==', 'SS01OA==', 'SkpBSg=='];
const _vaultA2 = ['TC1YSA==', 'VC02OA==', 'U1U2MA=='];

function _unshard(parts) {
  return parts.map(s => [...Buffer.from(s, 'base64').toString('utf8')].reverse().join('')).join('');
}

/* ------------------------------ Seed data (all fake) ------------------------------ */
const users = [
  { id: 1, name: 'Platform Admin', email: 'admin@hexapodcast.local',   password: 'admin123',   role: 'admin',   premium: true  },
  { id: 2, name: 'Casey Rivers',   email: 'creator@hexapodcast.local', password: 'creator123', role: 'creator', premium: true  },
  { id: 3, name: 'Maya Chen',      email: 'maya@hexapodcast.local',    password: 'maya123',    role: 'creator', premium: true  },
  { id: 4, name: 'Alice Walker',   email: 'alice@test.local',          password: 'alice123',   role: 'listener', premium: true  },
  { id: 5, name: 'Bob Stone',      email: 'bob@test.local',            password: 'bob123',     role: 'listener', premium: false },
  { id: 6, name: 'Demo Listener',  email: 'demo@hexapodcast.local',    password: 'demo123',    role: 'listener', premium: false },
];
let nextUserId = 7;

const shows = [
  { id: 1, ownerId: 2, title: 'Byte Sized Security', desc: 'Short, sharp stories from the security world.', listed: true,  plays: 1520, revenue: 240 },
  { id: 2, ownerId: 3, title: 'Night Signals',       desc: 'Late-night conversations about cities and sound.', listed: true, plays: 980,  revenue: 180 },
  { id: 3, ownerId: 2, title: 'Midnight Drafts',     desc: 'Unreleased pilot season — not yet public.',          listed: false, plays: 12,   revenue: 0   },
];

const episodes = [
  { id: 1, showId: 1, title: 'Ep 1: Phishing Tales',    premium: false, listed: true,  hidden: false, duration: '18 min' },
  { id: 2, showId: 1, title: 'Ep 2: Zero Day Diaries',  premium: true,  listed: true,  hidden: false, duration: '24 min' },
  { id: 3, showId: 2, title: 'Ep 1: City Nights',       premium: false, listed: true,  hidden: false, duration: '31 min' },
  { id: 4, showId: 2, title: 'Ep 2: Insider Sessions',  premium: true,  listed: true,  hidden: false, duration: '27 min' },
  { id: 5, showId: 3, title: 'Secret Pilot',            premium: false, listed: false, hidden: false, duration: '12 min' },
  { id: 6, showId: 1, title: 'Ep 3: Patch Tuesday',     premium: false, listed: true,  hidden: false, duration: '20 min' },
];

const subscriptions = [
  { id: 1, userId: 4, plan: 'Premium',  amount: 12, cardLast4: '4242', status: 'active' },
  { id: 2, userId: 5, plan: 'Supporter', amount: 5,  cardLast4: '1111', status: 'active' },
];
let nextSubId = 3;

const payouts = [
  { id: 1, creatorId: 2, amount: 100, status: 'paid', bankRef: 'BANK-REF-1001' },
  { id: 2, creatorId: 3, amount: 50,  status: 'paid', bankRef: 'BANK-REF-1002' },
];
let nextPayoutId = 3;

const earnings = { 2: 240, 3: 180 };

const comments = [
  { id: 1, episodeId: 1, userId: 5, name: 'Bob Stone', text: 'Great episode, learned a lot!' },
];
let nextCommentId = 2;

const ratings = [
  { episodeId: 1, userId: 4, stars: 5 },
  { episodeId: 1, userId: 5, stars: 4 },
];

const sessions = new Map();       // sid -> { userId, origin }
const failedLogins = {};          // email -> count
const probedEmails = new Set();   // enumeration probes via /forgot
const issuedTokens = {};          // email -> reset token actually issued

function tokenFor(user) { return 'POD-' + user.id + '-' + (user.id * 149 + 37); }
function showOf(ep) { return shows.find(s => s.id === ep.showId); }
function userOf(id) { return users.find(u => u.id === id); }

/* ------------------------------ TESTS registry ------------------------------ */
const F_AUTH = 'Login & Authentication';
const F_REG = 'Registration & Profile';
const F_SEARCH = 'Search & Discovery';
const F_EP = 'Episodes & Premium';
const F_SUB = 'Subscriptions & Payments';
const F_COM = 'Comments & Ratings';
const F_AN = 'Creator Analytics & Payouts';
const F_ADM = 'Admin Panel';
const F_API = 'Platform & API';
const FEATURE_ORDER = [F_AUTH, F_REG, F_SEARCH, F_EP, F_SUB, F_COM, F_AN, F_ADM, F_API];

const TESTS = [
  /* ---- Login & Authentication (6) ---- */
  { id: 'auth-sqli', feature: F_AUTH, name: 'SQL injection login bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login form builds its user lookup by gluing your input straight into a query string.', 'Try a classic tautology in the email field — something that makes the WHERE clause always true.', "Use ' OR '1'='1 as the email with any password and you will be signed in as the first account in the table: the admin."],
    lesson: 'String-built queries let attacker input change the query logic itself; parameterised queries keep data and code separate.',
    impact: 'On a real podcast platform this hands an attacker the admin account with no password at all — every show, payout and listener account is exposed.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements for all database access and never concatenate user input into SQL.' } },
  { id: 'auth-brute', feature: F_AUTH, name: 'Brute force — no rate limit or lockout', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Pick one real account and keep guessing its password.', 'Notice the server never slows down, CAPTCHAs you, or locks the account.', 'Fail 10 logins in a row for the same account — the 10th is still processed like the first. That missing throttle is the flaw.'],
    lesson: 'Without throttling or lockout, password guessing is free and unlimited; the defence is rate limiting, lockout and MFA.',
    impact: 'Attackers can grind through common passwords against creator accounts and take over shows and their payout details.',
    report: { title: 'Missing Rate Limiting on Login Allows Unlimited Password Guessing', severity: 'High', remediation: 'Add per-account and per-IP rate limiting, progressive delays / lockout, and offer MFA.' } },
  { id: 'auth-enum', feature: F_AUTH, name: 'User enumeration via forgot-password', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the forgot-password response for an email that exists with one that does not.', 'The two answers are different — one confirms the account is real.', 'Probe at least 5 different emails and record which ones the page confirms as registered.'],
    lesson: 'Different responses for real vs fake accounts let attackers build a target list before attacking; responses must be identical.',
    impact: 'Attackers learn exactly which creators and listeners have accounts, focusing phishing and password attacks where they will land.',
    report: { title: 'Account Enumeration via Differential Forgot-Password Responses', severity: 'Medium', remediation: 'Return one generic message for all forgot-password submissions regardless of account existence.' } },
  { id: 'auth-demo', feature: F_AUTH, name: 'Published demo credentials', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Read the login page carefully — it is more helpful than it should be.', 'A demo account and its password are printed right on the page.', 'Sign in with the demo listener credentials shown on the login page.'],
    lesson: 'Credentials printed in the UI are credentials for everyone; demo accounts must never share the production login or hold real access.',
    impact: 'Anyone on the internet can walk into a real account, and demo accounts are a classic stepping stone to deeper access.',
    report: { title: 'Live Credentials Published on the Login Page', severity: 'Medium', remediation: 'Remove credentials from all pages and disable demo accounts in production.' } },
  { id: 'auth-reset', feature: F_AUTH, name: 'Predictable password-reset token', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['Reset tokens here follow a pattern built from something public: the user id.', 'The token looks like POD-<id>-<a number derived from the id>. Small ids are printed in API responses and profile URLs.', "Compute Bob's token yourself (id 5): POD-5-(5*149+37). Post it to /reset without ever requesting a reset — it is accepted."],
    lesson: 'Reset tokens must be long, random and single-use; anything derivable from public data is an account-takeover shortcut.',
    impact: 'An attacker can reset any creator\u2019s password — including payout and show ownership — without touching their inbox.',
    report: { title: 'Predictable Password Reset Token Enables Account Takeover', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (at least 128 bits), expire them quickly and make them single-use.' } },
  { id: 'auth-cookie', feature: F_AUTH, name: 'Role cookie tampering', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After login, inspect the cookies the app sets — one of them carries your role.', 'The server trusts that cookie instead of checking your account on the server side.', 'Set the hx_role cookie to admin in your browser and visit /admin.'],
    lesson: 'Anything stored on the client can be changed by the client; authorisation decisions must be made server-side from server-side data.',
    impact: 'A free listener can promote themselves to admin in seconds and reach the full admin panel.',
    report: { title: 'Client-Side Role Cookie Trusted for Authorisation', severity: 'High', remediation: 'Derive roles from the server-side session record only; never trust role values sent by the client.' } },

  /* ---- Registration & Profile (4) ---- */
  { id: 'reg-weak', feature: F_REG, name: 'Weak password policy at registration', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Try registering with the shortest password the form will accept.', 'There is no length or complexity check at all.', 'Register a new account with a 1-character password — it is accepted.'],
    lesson: 'Password policy is enforced (or not) at the server; a missing policy guarantees weak passwords across the user base.',
    impact: 'Listeners choose trivial passwords, making credential stuffing and guessing attacks far more effective.',
    report: { title: 'No Minimum Password Policy on Registration', severity: 'Medium', remediation: 'Enforce a minimum length (12+ recommended) and screen against breached-password lists.' } },
  { id: 'reg-mass', feature: F_REG, name: 'Mass assignment — role / premium via registration fields', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration handler copies more of your form than the three visible fields.', 'Add fields the form never showed you — the account record has role and premium properties.', 'Register with extra fields role=creator (or plan=premium) in the POST body and check what kind of account you get.'],
    lesson: 'Binding request bodies directly to data models exposes every writable field; allow-list the fields a form may set.',
    impact: 'Attackers mint their own creator or premium accounts for free, skipping payment and vetting entirely.',
    report: { title: 'Mass Assignment in Registration Allows Role and Plan Escalation', severity: 'High', remediation: 'Allow-list assignable fields per endpoint and set roles/plans only through privileged server-side logic.' } },
  { id: 'reg-xss', feature: F_REG, name: 'Stored XSS in display name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is printed back in many places — comments, the header, profiles.', 'Nothing escapes it on the way out.', 'Register or rename yourself with a name like <script>alert(1)</script> and view a page that prints it — it runs.'],
    lesson: 'Stored user input must be output-encoded everywhere it is rendered; one unescaped field poisons every page that shows it.',
    impact: 'An attacker\u2019s script runs in other listeners\u2019 and admins\u2019 browsers — session theft and forced actions follow.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Contextually output-encode all user-supplied data and validate input on the server.' } },
  { id: 'reg-csrf', feature: F_REG, name: 'CSRF on profile update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Your own profile form carries a hidden hx_origin field that matches a cookie.', 'The server never actually verifies it on the way in.', 'POST to /profile with a new name but WITHOUT the hx_origin field — the change is accepted anyway.'],
    lesson: 'State-changing forms need an unguessable anti-CSRF token that the server verifies on every request.',
    impact: 'A malicious page a listener visits can silently rewrite their profile — the first step in social-engineering and account confusion attacks.',
    report: { title: 'Missing CSRF Validation on Profile Update', severity: 'Medium', remediation: 'Issue per-session CSRF tokens and verify them server-side on every state-changing request.' } },

  /* ---- Search & Discovery (3) ---- */
  { id: 'search-sqli', feature: F_SEARCH, name: 'SQL injection in search leaks unlisted content', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Search builds its matching the same careless way login does.', 'A tautology in the query makes the search match everything — including rows that are not public.', "Search for ' OR '1'='1 and look for the unlisted draft show and its secret episode in the results."],
    lesson: 'Injection flaws leak whatever the query can reach — including content that was never meant to be listed.',
    impact: 'Unreleased episodes and draft shows leak before launch, destroying exclusivity and sponsor deals.',
    report: { title: 'SQL Injection in Search Exposes Unlisted Shows and Episodes', severity: 'High', remediation: 'Parameterise search queries and enforce visibility filters in the data layer.' } },
  { id: 'search-xss', feature: F_SEARCH, name: 'Reflected XSS in search results', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The results page repeats your search term back to you in the heading.', 'It repeats it exactly as typed — markup and all.', 'Search for <script>alert(1)</script> and view the page source of the results heading.'],
    lesson: 'Reflected input must be encoded in the response; a search box is one of the most reliable XSS delivery points.',
    impact: 'Crafted search links run scripts in victims\u2019 browsers when shared — a ready-made phishing amplifier.',
    report: { title: 'Reflected Cross-Site Scripting in Search', severity: 'Medium', remediation: 'Output-encode all reflected request data in HTML responses.' } },
  { id: 'search-unlisted', feature: F_SEARCH, name: 'Unlisted episode reachable by direct ID (IDOR)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Episode pages are just numbers: /episode/1, /episode/2, ...', 'One episode belongs to the unlisted draft show. Nothing checks whether you should see it.', 'Open /episode/5 directly while signed in as a listener — the secret pilot plays.'],
    lesson: 'Unlisted is not private: if the server serves the object by ID without an ownership/visibility check, anyone can fetch it.',
    impact: 'Unreleased content can be downloaded and leaked by anyone who guesses a number.',
    report: { title: 'Missing Visibility Check Allows Direct Access to Unlisted Episodes', severity: 'Medium', remediation: 'Check object visibility and ownership server-side on every object access.' } },

  /* ---- Episodes & Premium (2) ---- */
  { id: 'ep-premium', feature: F_EP, name: 'Premium episode stream served to free listeners', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Premium episodes show a paywall on the episode page — but the stream URL is a separate endpoint.', 'The stream endpoint never asks whether you paid.', 'As Bob (free plan), open /episode/2/stream directly — the premium audio streams.'],
    lesson: 'Paywalls must be enforced on the resource endpoint itself, not just hidden in the UI.',
    impact: 'The entire premium catalogue can be consumed (and re-shared) without paying — the platform\u2019s core revenue leaks.',
    report: { title: 'Premium Content Stream Missing Entitlement Check', severity: 'High', remediation: 'Verify subscription entitlement server-side before serving premium media.' } },
  { id: 'ep-edit-idor', feature: F_EP, name: 'Edit another creator\u2019s episode (IDOR)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The episode edit form posts to /episode/<id>/edit.', 'It checks that you are a creator — never that the episode is yours.', 'As Casey, POST a new title to /episode/3/edit (Maya\u2019s episode) and watch it change.'],
    lesson: 'Role checks are not ownership checks; every object mutation must verify the caller owns the object.',
    impact: 'Rival creators can vandalise or hijack each other\u2019s episodes, titles and release schedules.',
    report: { title: 'Missing Ownership Check on Episode Edit (IDOR)', severity: 'High', remediation: 'Enforce per-object ownership authorisation on all edit/delete endpoints.' } },

  /* ---- Subscriptions & Payments (2) ---- */
  { id: 'sub-price', feature: F_SUB, name: 'Subscription price tampering', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['The subscribe form posts the amount along with the plan.', 'The server believes the amount your browser sends.', 'POST /subscribe with plan=premium and amount=0 — Premium is granted for free.'],
    lesson: 'Prices live on the server; any price, total or discount arriving from the client is a suggestion, not a fact.',
    impact: 'Every listener can self-upgrade to Premium for $0 — subscription revenue drops to whatever honest users feel like paying.',
    report: { title: 'Client-Supplied Price Trusted for Premium Subscription', severity: 'High', remediation: 'Look up prices server-side from the plan catalogue and ignore client-supplied amounts.' } },
  { id: 'sub-idor', feature: F_SUB, name: 'Another user\u2019s subscription details (IDOR)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Subscription pages live at /subscription/<id> and ids are small numbers.', 'The page shows plan, amount and card digits — to whoever asks.', 'As Bob, open /subscription/1 and read Alice\u2019s plan and card last four digits.'],
    lesson: 'Billing objects need the same ownership checks as any private data; sequential ids make guessing trivial.',
    impact: 'Payment metadata of every subscriber is exposed, enabling targeted phishing and social engineering.',
    report: { title: 'Broken Access Control on Subscription Records (IDOR)', severity: 'Medium', remediation: 'Restrict subscription views to the owning user (or admins) server-side.' } },

  /* ---- Comments & Ratings (2) ---- */
  { id: 'com-xss', feature: F_COM, name: 'Stored XSS in episode comments', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Comments are printed under episodes exactly as written.', 'Try leaving a comment that is more than text.', 'Post a comment containing <script>alert(1)</script> on any episode — it is stored and served raw to every visitor.'],
    lesson: 'Comment fields are stored-XSS classics: sanitise/encode on output, every time, for every viewer.',
    impact: 'One comment can attack every listener who opens a popular episode — including the show\u2019s own creator.',
    report: { title: 'Stored Cross-Site Scripting in Episode Comments', severity: 'High', remediation: 'Output-encode comment text on render and apply a strict content policy.' } },
  { id: 'com-rating', feature: F_COM, name: 'Rating value tampering (stars out of range)', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['The rating form offers 1–5 stars, but that limit lives only in the HTML.', 'The server stores whatever number arrives.', 'POST a rating with stars=100 to /episode/1/rate and check the average afterwards.'],
    lesson: 'Server-side range validation is mandatory for every numeric input; UI limits are decoration.',
    impact: 'A single tampered rating can rocket a show to the top of the charts or bury a competitor.',
    report: { title: 'Missing Range Validation on Episode Ratings', severity: 'Medium', remediation: 'Validate rating values server-side (integers 1–5) and reject out-of-range input.' } },

  /* ---- Creator Analytics & Payouts (3) ---- */
  { id: 'an-idor', feature: F_AN, name: 'Another creator\u2019s analytics (IDOR)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Analytics pages live at /analytics/<showId>.', 'Plays and revenue are commercially sensitive — and served to any creator who asks.', 'As Maya, open /analytics/1 and read Casey\u2019s plays and revenue.'],
    lesson: 'Business metrics are private data; analytics endpoints need the same ownership checks as content endpoints.',
    impact: 'Competitors learn exactly what every show earns and how it performs — intelligence creators guard closely.',
    report: { title: 'Broken Access Control on Creator Analytics (IDOR)', severity: 'Medium', remediation: 'Restrict analytics to the show owner server-side.' } },
  { id: 'an-payout-tamper', feature: F_AN, name: 'Payout amount exceeds earnings', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['The payout form asks how much you want to withdraw.', 'Compare the amount you request with the earnings the studio shows you.', 'Request a payout far above your earnings (e.g. 100000) — it is recorded without any balance check.'],
    lesson: 'Financial actions must verify balances server-side at the moment of the transaction.',
    impact: 'Creators can drain money they never earned — direct financial loss to the platform.',
    report: { title: 'Payout Created Without Balance Verification', severity: 'Critical', remediation: 'Verify available earnings server-side and cap payouts at the verified balance.' } },
  { id: 'an-payout-idor', feature: F_AN, name: 'Another creator\u2019s payout record (IDOR)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Payout receipts live at /payout/<id> with small sequential ids.', 'Receipts include the bank reference — exactly what a fraudster needs.', 'As Maya, open /payout/1 and read Casey\u2019s payout amount and bank reference.'],
    lesson: 'Financial records must be owner-scoped; a bank reference plus amount is enough to attempt payment fraud.',
    impact: 'Payout details leak across creators, enabling invoice and bank-detail fraud.',
    report: { title: 'Broken Access Control on Payout Records (IDOR)', severity: 'Medium', remediation: 'Restrict payout views to the owning creator (or admins) server-side.' } },

  /* ---- Admin Panel (2) ---- */
  { id: 'adm-default', feature: F_ADM, name: 'Admin panel served when role cookie is absent', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The admin gate reads your role from a cookie.', 'Ask yourself what the code does when that cookie is simply not there.', 'Sign in, delete the hx_role cookie entirely, then visit /admin — the gate defaults to letting you in.'],
    lesson: 'Authorisation must fail closed: a missing signal is a denial, never a default grant.',
    impact: 'Any signed-in user who drops one cookie reaches the full admin panel and its user list.',
    report: { title: 'Admin Authorisation Fails Open When Role Cookie Is Missing', severity: 'High', remediation: 'Deny by default; require a positive server-side role check for admin routes.' } },
  { id: 'adm-csrf', feature: F_ADM, name: 'CSRF on admin episode-hide action', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    hints: ['Admin actions are plain POSTs — like the episode hide button.', 'Like the profile form, the hx_origin marker is rendered but never verified.', 'As admin, POST /admin/episode/2/hide without the hx_origin field — the episode disappears anyway.'],
    lesson: 'Privileged actions are the highest-value CSRF targets and need verified tokens most of all.',
    impact: 'A booby-trapped page visited by an admin can hide episodes and disrupt the catalogue without their knowledge.',
    report: { title: 'Missing CSRF Validation on Admin Content Actions', severity: 'Medium', remediation: 'Verify anti-CSRF tokens server-side on all admin state-changing endpoints.' } },

  /* ---- Platform & API (2) ---- */
  { id: 'api-token', feature: F_API, name: 'Weak API token — base64 of email', owasp: 'A02:2021 Cryptographic Failures', difficulty: 'Intermediate',
    hints: ['The JSON API at /api/my/episodes authenticates with an X-Api-Token header.', 'The token is not random — it is a simple encoding of something public.', 'Send X-Api-Token set to the base64 encoding of alice@test.local — her data comes back with no session at all.'],
    lesson: 'API tokens must be unguessable random secrets; an encoding of public data is not a credential.',
    impact: 'Anyone who knows a listener\u2019s email — public by design — owns their API identity.',
    report: { title: 'API Token Is a Deterministic Encoding of the User\u2019s Email', severity: 'High', remediation: 'Issue high-entropy random API tokens, store them hashed, and support revocation.' } },
  { id: 'api-debug', feature: F_API, name: 'Unauthenticated /api/debug dumps all accounts', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Developers leave diagnostic endpoints behind. This app has one.', 'It needs no login at all.', 'Open /api/debug in a fresh browser with no session — every account, including passwords, comes back as JSON.'],
    lesson: 'Debug and diagnostic endpoints must never ship to production — they bypass every other control at once.',
    impact: 'Full credential dump of every user including the admin: total platform compromise in one request.',
    report: { title: 'Unauthenticated Debug Endpoint Exposes All User Credentials', severity: 'Critical', remediation: 'Remove debug endpoints from production builds and require admin auth for any diagnostics.' } },
];

/* ------------------------------------------------------------------ *
 * Fragment vault B (separate region by design).                      *
 * ------------------------------------------------------------------ */
const _vaultB1 = ['LTRGWg==', 'UUZEMA==', 'V1k3Mw=='];
const _vaultB2 = ['LThXNQ==', 'M0EyWQ==', 'N1hTNA=='];

function entryKey() { return _unshard(_vaultA1.concat(_vaultB1)); }
function completionKey() { return _unshard(_vaultA2.concat(_vaultB2)); }

/* ------------------------------ Progress engine ------------------------------ */
let state = { unlocked: false, testerName: '', lastAccountName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadState() {
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') state = Object.assign(state, parsed);
  } catch (e) { /* fresh install */ }
}
function saveState() {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2)); } catch (e) { /* ignore */ }
}
function totalTests() { return TESTS.length; }
function doneCount() { return TESTS.filter(t => state.tests[t.id]).length; }
function isComplete() { return doneCount() === totalTests(); }
function pass(id) {
  if (!state.tests[id]) {
    state.tests[id] = true;
    if (isComplete() && !state.completedAt) {
      state.completedAt = new Date().toISOString();
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
  for (const f of FEATURE_ORDER) {
    const list = TESTS.filter(t => t.feature === f);
    out[f] = { total: list.length, done: list.filter(t => state.tests[t.id]).length, attempts: state.attempts[f] || 0 };
  }
  return out;
}

/* ------------------------------ HTTP helpers ------------------------------ */
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) {
        try { resolve(JSON.parse(data || '{}')); return; } catch (e) { resolve({}); return; }
      }
      const out = {};
      for (const pair of data.split('&')) {
        if (!pair) continue;
        const i = pair.indexOf('=');
        const k = decodeURIComponent(pair.slice(0, i).replace(/\+/g, ' '));
        const v = i >= 0 ? decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' ')) : '';
        out[k] = v;
      }
      resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}
function getSession(req) {
  const cookies = parseCookies(req);
  const sid = cookies.hx_session;
  if (sid && sessions.has(sid)) {
    const s = sessions.get(sid);
    const user = userOf(s.userId);
    if (user) return { sid, user, origin: s.origin, cookies };
  }
  return { sid: null, user: null, origin: null, cookies };
}
function send(res, code, body, headers) {
  res.writeHead(code, Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, headers || {}));
  res.end(body);
}
function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj, null, 2));
}
function redirect(res, to, extraHeaders) {
  res.writeHead(302, Object.assign({ Location: to }, extraHeaders || {}));
  res.end('Redirecting to ' + to);
}

const XSS_RE = /<script|onerror\s*=|onload\s*=|<svg|<img[^>]*onerror|<iframe/i;
const INJ_RE = /'\s*or\s/i;

/* ------------------------------ Page scaffolding ------------------------------ */
function progressHeader() {
  const done = doneCount(), total = totalTests();
  const pct = Math.floor(done / total * 100);
  return '<header style="background:#14101f;color:#eee;padding:10px 18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">' +
    '<img src="/logo.png" alt="HexaCyberLab" style="height:30px">' +
    '<strong>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</strong>' +
    '<span style="font-size:13px">LAB ' + LAB_NUMBER + ' · ' + done + '/' + total + ' tests · ' + pct + '%</span>' +
    '<span style="flex:1;min-width:120px;background:#2a2140;border-radius:6px;height:10px;overflow:hidden"><span style="display:block;height:100%;width:' + pct + '%;background:linear-gradient(90deg,#4f7cff,#a24fff)"></span></span>' +
    '</header>';
}
function nav(sess) {
  const links = ['<a href="/">Home</a>', '<a href="/tests">Mission Board</a>', '<a href="/complete">Complete</a>'];
  if (sess && sess.user) {
    links.push('<a href="/show/1">Shows</a>', '<a href="/studio">Creator Studio</a>', '<a href="/profile">Profile (' + sess.user.name + ')</a>', '<a href="/logout">Log out</a>');
  } else {
    links.push('<a href="/login">Log in</a>', '<a href="/register">Register</a>');
  }
  return '<nav style="padding:8px 18px;background:#1d1730;display:flex;gap:16px;flex-wrap:wrap">' +
    links.map(l => l.replace('<a ', '<a style="color:#cbb8ff;text-decoration:none" ')).join('') + '</nav>';
}
const CHAT_JS = `
<div id="hxchat" style="position:fixed;right:16px;bottom:16px;width:320px;max-width:92vw;background:#171226;border:1px solid #3a2d63;border-radius:12px;color:#eee;font-family:inherit;box-shadow:0 8px 30px rgba(0,0,0,.5);z-index:50">
  <div style="padding:10px 12px;border-bottom:1px solid #3a2d63;display:flex;justify-content:space-between;align-items:center"><strong>Lab Coach</strong><button onclick="document.getElementById('hxchatbody').style.display=document.getElementById('hxchatbody').style.display==='none'?'block':'none'" style="background:#2a2140;color:#eee;border:0;border-radius:6px;padding:2px 10px;cursor:pointer">–</button></div>
  <div id="hxchatbody" style="padding:10px 12px">
    <div id="hxlog" style="height:170px;overflow:auto;font-size:13px;line-height:1.45"></div>
    <div style="display:flex;gap:6px;margin-top:8px"><input id="hxin" placeholder="Ask the coach..." style="flex:1;padding:7px;border-radius:6px;border:1px solid #3a2d63;background:#0f0b1c;color:#eee"><button onclick="hxSend()" style="background:#5a3fd4;color:#fff;border:0;border-radius:6px;padding:7px 12px;cursor:pointer">Send</button></div>
  </div>
</div>
<script>
function hxAdd(who, text){ var d=document.getElementById('hxlog'); var p=document.createElement('p'); p.style.margin='4px 0'; p.innerHTML='<strong>'+who+':</strong> '; p.appendChild(document.createTextNode(text)); d.appendChild(p); d.scrollTop=d.scrollHeight; }
async function hxSend(){ var inp=document.getElementById('hxin'); var msg=inp.value.trim(); if(!msg) return; inp.value=''; hxAdd('You', msg);
  try { var r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg})}); var j=await r.json(); hxAdd('Coach', j.reply||'...'); }
  catch(e){ hxAdd('Coach','Connection hiccup — try again.'); } }
hxAdd('Coach','Hi! I am the HexaPodcast Lab Coach. Ask me what to try next, or how a feature works after you have tried it yourself.');
</script>`;
function layout(sess, title, bodyHtml) {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + title + ' — HexaPodcast (LAB 85)</title></head>' +
    '<body style="margin:0;font-family:Verdana,Geneva,sans-serif;background:#0f0b1c;color:#e8e4f5">' +
    progressHeader() + nav(sess) +
    '<main style="max-width:920px;margin:0 auto;padding:22px 18px 90px">' + bodyHtml + '</main>' +
    CHAT_JS + '</body></html>';
}
function gatePage(err) {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Locked — LAB 85 HexaPodcast</title></head>' +
    '<body style="margin:0;font-family:Verdana,Geneva,sans-serif;background:#0f0b1c;color:#e8e4f5">' + progressHeader() +
    '<main style="max-width:520px;margin:60px auto;padding:24px;background:#171226;border:1px solid #3a2d63;border-radius:12px">' +
    '<img src="/logo.png" alt="HexaCyberLab" style="height:44px">' +
    '<h1>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h1>' +
    '<p>This lab is locked. Paste the completion key from Lab ' + PREV_LAB + ' to start.</p>' +
    (err ? '<p style="color:#ff8a8a">' + err + '</p>' : '') +
    '<form method="POST" action="/unlock"><input name="key" placeholder="Completion key from Lab ' + PREV_LAB + '" style="width:100%;padding:10px;border-radius:6px;border:1px solid #3a2d63;background:#0f0b1c;color:#eee;box-sizing:border-box">' +
    '<button style="margin-top:10px;background:#5a3fd4;color:#fff;border:0;border-radius:6px;padding:10px 16px;cursor:pointer">Unlock Lab ' + LAB_NUMBER + '</button></form>' +
    '</main>' + CHAT_JS + '</body></html>';
}

/* ------------------------------ Lab Coach (chatbot) ------------------------------ */
const FEATURE_KEYWORDS = [
  [F_AUTH, ['login', 'log in', 'sign in', 'authentication', 'auth', 'password', 'brute', 'reset token', 'forgot']],
  [F_REG, ['register', 'registration', 'sign up', 'profile', 'mass assignment', 'display name']],
  [F_SEARCH, ['search', 'discovery', 'unlisted', 'draft show']],
  [F_EP, ['premium', 'stream', 'episode', 'edit episode']],
  [F_SUB, ['subscription', 'subscribe', 'billing', 'price', 'payment']],
  [F_COM, ['comment', 'rating', 'rate', 'stars', 'review']],
  [F_AN, ['analytics', 'payout', 'earnings', 'revenue']],
  [F_ADM, ['admin', 'panel']],
  [F_API, ['api', 'token', 'debug', 'endpoint']],
];
function matchFeature(msg) {
  for (const [f, kws] of FEATURE_KEYWORDS) {
    for (const kw of kws) if (msg.includes(kw)) return f;
  }
  return null;
}
function coachReply(rawMsg) {
  const msg = String(rawMsg || '').toLowerCase();
  const done = doneCount(), total = totalTests();
  const stats = featureStats();
  if (/who (built|made|created)|founder|md\.? jony|hexacyberlab/.test(msg)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (/(completion|next lab|unlock) key|key for lab|give me the key|what is the key/.test(msg)) {
    if (isComplete() && state.keyRevealed) {
      return 'You earned it — the completion key for LAB ' + LAB_NUMBER + ' is: ' + completionKey() + ' — paste it into the next lab to unlock it.';
    }
    return 'I do not have the completion key yet — it is only given to me when this lab reaches 100%. Right now you are at ' + done + '/' + total + ' tests (' + Math.floor(done / total * 100) + '%). Finish every test and ask me again.';
  }
  if (/progress|how am i doing|score|percent/.test(msg)) {
    const next = TESTS.find(t => !state.tests[t.id]);
    return 'You have completed ' + done + ' of ' + total + ' tests (' + Math.floor(done / total * 100) + '%).' + (next ? ' Next open test: "' + next.name + '" in ' + next.feature + ' — see the Mission Board at /tests.' : ' Everything is done — visit /complete for your key and certificate.');
  }
  const feature = matchFeature(msg);
  if (feature) {
    const list = TESTS.filter(t => t.feature === feature);
    const st = stats[feature];
    const wantsHow = /how|help|guide|step|hint|do it|exploit|hack|solve|bypass/.test(msg);
    if (!wantsHow) {
      return feature + ' has ' + list.length + ' tests (' + st.done + ' done): ' + list.map(t => t.name).join('; ') + '. Ask me "how" after you have tried the feature yourself at least 3 times.';
    }
    const allPassed = list.every(t => state.tests[t.id]);
    if (st.attempts >= 3 || allPassed) {
      const steps = list.filter(t => !state.tests[t.id]).map(t => '• ' + t.name + ' — ' + t.hints[2]).join('\n');
      if (!steps) return 'You have already completed every test in ' + feature + '. Nicely done.';
      return 'Step by step for ' + feature + ' (you have tried it ' + st.attempts + ' time(s), so guidance is unlocked):\n' + steps;
    }
    return 'That feature is locked for help. First try the ' + feature + ' tests yourself at least 3 times — I can see you\'ve tried ' + st.attempts + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  if (/hi|hello|hey|start|begin/.test(msg)) {
    return 'Welcome to LAB ' + LAB_NUMBER + ' — HexaPodcast, a podcast platform with shows, episodes, premium content, subscriptions, comments, creator analytics and payouts. It has ' + total + ' security tests across ' + FEATURE_ORDER.length + ' features. You are at ' + done + '/' + total + '. Open /tests for the Mission Board, try things yourself first (3 real tries per feature unlocks my step-by-step help), and reach 100% for your certificate and the key to the next lab.';
  }
  if (/feature|features|list|what.*(test|vulnerab)/.test(msg)) {
    return 'Features and test counts: ' + FEATURE_ORDER.map(f => f + ' (' + stats[f].total + ')').join('; ') + '. Ask me about any feature by name.';
  }
  return 'I can explain the lab, report your progress, list a feature\'s tests, and — after you have tried a feature at least 3 times yourself — guide you step by step. Try asking "what is my progress" or "how do I do the Login & Authentication tests". Details and hints live on the Mission Board at /tests.';
}

/* ------------------------------ Business pages ------------------------------ */
function homePage(sess) {
  const cards = shows.filter(s => s.listed).map(s => {
    const eps = episodes.filter(e => e.showId === s.id && e.listed && !e.hidden);
    return '<section style="background:#171226;border:1px solid #3a2d63;border-radius:12px;padding:16px;margin:14px 0">' +
      '<h2 style="margin:4px 0"><a style="color:#cbb8ff" href="/show/' + s.id + '">' + s.title + '</a></h2><p>' + s.desc + '</p>' +
      '<p style="font-size:13px;color:#a99fd0">By ' + (userOf(s.ownerId) || {}).name + ' · ' + s.plays + ' plays</p>' +
      eps.map(e => '<p style="margin:6px 0"><a style="color:#e8e4f5" href="/episode/' + e.id + '">' + e.title + '</a> ' + (e.premium ? '<span style="color:#ffd479">★ PREMIUM</span>' : '') + ' <span style="color:#a99fd0">' + e.duration + '</span></p>').join('') +
      '</section>';
  }).join('');
  return layout(sess, 'Home', '<h1>HexaPodcast</h1><p>Shows, episodes and premium listening — all simulated for security training.</p>' +
    '<form method="GET" action="/search"><input name="q" placeholder="Search shows and episodes..." style="padding:9px;width:60%;border-radius:6px;border:1px solid #3a2d63;background:#171226;color:#eee"> <button style="background:#5a3fd4;color:#fff;border:0;border-radius:6px;padding:9px 14px;cursor:pointer">Search</button></form>' + cards);
}
function loginPage(sess, err) {
  return layout(sess, 'Log in', '<h1>Log in</h1>' + (err ? '<p style="color:#ff8a8a">' + err + '</p>' : '') +
    '<form method="POST" action="/login" style="max-width:380px">' +
    '<p>Email<br><input name="email" style="width:100%;padding:9px;border-radius:6px;border:1px solid #3a2d63;background:#171226;color:#eee"></p>' +
    '<p>Password<br><input name="password" type="password" style="width:100%;padding:9px;border-radius:6px;border:1px solid #3a2d63;background:#171226;color:#eee"></p>' +
    '<button style="background:#5a3fd4;color:#fff;border:0;border-radius:6px;padding:10px 16px;cursor:pointer">Log in</button></form>' +
    '<p><a style="color:#cbb8ff" href="/forgot">Forgot your password?</a></p>' +
    '<div style="background:#241a3f;border:1px dashed #5a3fd4;border-radius:8px;padding:12px;max-width:420px"><strong>Just looking?</strong><br>Demo listener account — email: demo@hexapodcast.local · password: demo123</div>');
}
function registerPage(sess, err) {
  return layout(sess, 'Register', '<h1>Create your account</h1>' + (err ? '<p style="color:#ff8a8a">' + err + '</p>' : '') +
    '<form method="POST" action="/register" style="max-width:380px">' +
    '<p>Display name<br><input name="name" style="width:100%;padding:9px;border-radius:6px;border:1px solid #3a2d63;background:#171226;color:#eee"></p>' +
    '<p>Email<br><input name="email" style="width:100%;padding:9px;border-radius:6px;border:1px solid #3a2d63;background:#171226;color:#eee"></p>' +
    '<p>Password<br><input name="password" type="password" style="width:100%;padding:9px;border-radius:6px;border:1px solid #3a2d63;background:#171226;color:#eee"></p>' +
    '<button style="background:#5a3fd4;color:#fff;border:0;border-radius:6px;padding:10px 16px;cursor:pointer">Register</button></form>');
}
function forgotPage(sess, msg) {
  return layout(sess, 'Forgot password', '<h1>Forgot password</h1>' + (msg ? '<p>' + msg + '</p>' : '') +
    '<form method="POST" action="/forgot" style="max-width:380px"><p>Email<br><input name="email" style="width:100%;padding:9px;border-radius:6px;border:1px solid #3a2d63;background:#171226;color:#eee"></p>' +
    '<button style="background:#5a3fd4;color:#fff;border:0;border-radius:6px;padding:10px 16px;cursor:pointer">Send reset link</button></form>' +
    '<h2>Reset password</h2><form method="POST" action="/reset" style="max-width:380px">' +
    '<p>Email<br><input name="email" style="width:100%;padding:9px;border-radius:6px;border:1px solid #3a2d63;background:#171226;color:#eee"></p>' +
    '<p>Reset token<br><input name="token" style="width:100%;padding:9px;border-radius:6px;border:1px solid #3a2d63;background:#171226;color:#eee"></p>' +
    '<p>New password<br><input name="password" type="password" style="width:100%;padding:9px;border-radius:6px;border:1px solid #3a2d63;background:#171226;color:#eee"></p>' +
    '<button style="background:#5a3fd4;color:#fff;border:0;border-radius:6px;padding:10px 16px;cursor:pointer">Reset password</button></form>');
}
function searchPage(sess, q, results) {
  return layout(sess, 'Search', '<h1>Results for "' + q + '"</h1>' +
    (results.length ? results.join('') : '<p>No results.</p>'));
}
function showPage(sess, show) {
  const eps = episodes.filter(e => e.showId === show.id);
  return layout(sess, show.title, '<h1>' + show.title + '</h1><p>' + show.desc + '</p><p style="color:#a99fd0">By ' + (userOf(show.ownerId) || {}).name + '</p>' +
    eps.map(e => '<p><a style="color:#e8e4f5" href="/episode/' + e.id + '">' + e.title + '</a> ' + (e.premium ? '<span style="color:#ffd479">★ PREMIUM</span>' : '') + (e.listed ? '' : ' <span style="color:#ff8a8a">(unlisted)</span>') + (e.hidden ? ' <span style="color:#ff8a8a">(hidden by admin)</span>' : '') + '</p>').join(''));
}
function episodePage(sess, ep) {
  const show = showOf(ep);
  const myComments = comments.filter(c => c.episodeId === ep.id);
  const myRatings = ratings.filter(r => r.episodeId === ep.id);
  const avg = myRatings.length ? (myRatings.reduce((a, r) => a + r.stars, 0) / myRatings.length).toFixed(2) : '—';
  let html = '<h1>' + ep.title + '</h1><p style="color:#a99fd0">From <a style="color:#cbb8ff" href="/show/' + show.id + '">' + show.title + '</a> · ' + ep.duration + (ep.premium ? ' · <span style="color:#ffd479">★ PREMIUM</span>' : '') + '</p>';
  if (ep.premium && !(sess.user && sess.user.premium)) {
    html += '<div style="background:#241a3f;border-radius:8px;padding:14px"><strong>Premium episode.</strong> <a style="color:#cbb8ff" href="/subscribe">Subscribe</a> to listen — or try the stream URL if you are feeling curious: /episode/' + ep.id + '/stream</div>';
  } else {
    html += '<p><a style="color:#cbb8ff" href="/episode/' + ep.id + '/stream">▶ Play episode (simulated stream)</a></p>';
  }
  if (sess.user) {
    html += '<h2>Rate this episode</h2><p>Average rating: ' + avg + ' (' + myRatings.length + ' ratings)</p>' +
      '<form method="POST" action="/episode/' + ep.id + '/rate"><select name="stars"><option>1</option><option>2</option><option>3</option><option>4</option><option selected>5</option></select> <button style="background:#5a3fd4;color:#fff;border:0;border-radius:6px;padding:7px 12px;cursor:pointer">Rate</button></form>' +
      '<h2>Comments</h2>' + myComments.map(c => '<div style="background:#171226;border-radius:8px;padding:10px;margin:8px 0"><strong>' + c.name + '</strong><p style="margin:4px 0">' + c.text + '</p></div>').join('') +
      '<form method="POST" action="/episode/' + ep.id + '/comment"><textarea name="text" rows="3" style="width:100%;border-radius:6px;border:1px solid #3a2d63;background:#171226;color:#eee"></textarea><br><button style="background:#5a3fd4;color:#fff;border:0;border-radius:6px;padding:8px 14px;cursor:pointer;margin-top:6px">Post comment</button></form>';
    if (sess.user.role === 'creator' || sess.user.role === 'admin') {
      html += '<h2>Edit episode (creators)</h2><form method="POST" action="/episode/' + ep.id + '/edit"><input name="title" value="' + ep.title + '" style="width:60%;padding:8px;border-radius:6px;border:1px solid #3a2d63;background:#171226;color:#eee"> <button style="background:#5a3fd4;color:#fff;border:0;border-radius:6px;padding:8px 12px;cursor:pointer">Save title</button></form>';
    }
  } else {
    html += '<p><a style="color:#cbb8ff" href="/login">Log in</a> to comment and rate.</p><h2>Comments</h2>' + myComments.map(c => '<div style="background:#171226;border-radius:8px;padding:10px;margin:8px 0"><strong>' + c.name + '</strong><p style="margin:4px 0">' + c.text + '</p></div>').join('');
  }
  return layout(sess, ep.title, html);
}

function subscribePage(sess, msg) {
  return layout(sess, 'Subscribe', '<h1>Go Premium</h1><p>Premium is $' + PREMIUM_PRICE + '/month — every episode, no limits.</p>' + (msg ? '<p>' + msg + '</p>' : '') +
    (sess.user && sess.user.premium ? '<p>You are already Premium. Enjoy!</p>' :
    '<form method="POST" action="/subscribe" style="max-width:380px"><input type="hidden" name="plan" value="premium">' +
    '<p>Amount (USD)<br><input name="amount" value="' + PREMIUM_PRICE + '" style="width:100%;padding:9px;border-radius:6px;border:1px solid #3a2d63;background:#171226;color:#eee"></p>' +
    '<button style="background:#5a3fd4;color:#fff;border:0;border-radius:6px;padding:10px 16px;cursor:pointer">Subscribe</button></form>'));
}
function profilePage(sess, msg) {
  const u = sess.user;
  return layout(sess, 'Profile', '<h1>Your profile</h1>' + (msg ? '<p>' + msg + '</p>' : '') +
    '<p>Name: <strong>' + u.name + '</strong><br>Email: ' + u.email + '<br>Role: ' + u.role + '<br>Plan: ' + (u.premium ? 'Premium' : 'Free') + '</p>' +
    '<form method="POST" action="/profile" style="max-width:380px"><input type="hidden" name="hx_origin" value="' + sess.origin + '">' +
    '<p>Display name<br><input name="name" value="' + u.name + '" style="width:100%;padding:9px;border-radius:6px;border:1px solid #3a2d63;background:#171226;color:#eee"></p>' +
    '<button style="background:#5a3fd4;color:#fff;border:0;border-radius:6px;padding:10px 16px;cursor:pointer">Save profile</button></form>');
}
function studioPage(sess) {
  const u = sess.user;
  const mine = shows.filter(s => s.ownerId === u.id);
  const myPayouts = payouts.filter(p => p.creatorId === u.id);
  return layout(sess, 'Creator Studio', '<h1>Creator Studio</h1>' +
    '<h2>Your shows</h2>' + (mine.length ? mine.map(s => '<p><a style="color:#e8e4f5" href="/show/' + s.id + '">' + s.title + '</a> — <a style="color:#cbb8ff" href="/analytics/' + s.id + '">Analytics</a></p>').join('') : '<p>No shows yet.</p>') +
    '<h2>Earnings &amp; payouts</h2><p>Available earnings: $' + (earnings[u.id] || 0) + '</p>' +
    '<form method="POST" action="/payout" style="max-width:380px"><p>Amount (USD)<br><input name="amount" value="50" style="width:100%;padding:9px;border-radius:6px;border:1px solid #3a2d63;background:#171226;color:#eee"></p>' +
    '<button style="background:#5a3fd4;color:#fff;border:0;border-radius:6px;padding:10px 16px;cursor:pointer">Request payout</button></form>' +
    '<h3>Your payout history</h3>' + (myPayouts.length ? myPayouts.map(p => '<p><a style="color:#e8e4f5" href="/payout/' + p.id + '">Payout #' + p.id + '</a> — $' + p.amount + ' (' + p.status + ')</p>').join('') : '<p>None yet.</p>'));
}
function testsPage(sess) {
  const stats = featureStats();
  let html = '<h1>Mission Board — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h1><p>' + doneCount() + '/' + totalTests() + ' tests complete. Tests complete by DOING — perform the exploit and the board notices. The coach unlocks step-by-step help for a feature after 3 genuine attempts on it.</p>';
  const hintsJson = JSON.stringify(TESTS.reduce((o, t) => { o[t.id] = t.hints; return o; }, {})).replace(/<\//g, '<\\/');
  for (const f of FEATURE_ORDER) {
    html += '<h2>' + f + ' <span style="font-size:13px;color:#a99fd0">(' + stats[f].done + '/' + stats[f].total + ' done · ' + stats[f].attempts + ' attempts)</span></h2>';
    for (const t of TESTS.filter(x => x.feature === f)) {
      html += '<div style="background:#171226;border:1px solid #3a2d63;border-radius:10px;padding:12px;margin:8px 0">' +
        '<strong>' + (state.tests[t.id] ? '✓' : '○') + ' ' + t.name + '</strong> ' +
        '<span style="color:#a99fd0;font-size:12px">' + t.owasp + ' · ' + t.difficulty + ' · ' + (state.tests[t.id] ? 'done' : 'open') + '</span>' +
        '<p style="font-size:13px;margin:6px 0">' + t.lesson + '</p>' +
        '<button onclick="hxHint(\'' + t.id + '\')" style="background:#2a2140;color:#eee;border:0;border-radius:6px;padding:5px 12px;cursor:pointer">Hints</button> <span id="hint-' + t.id + '" style="font-size:13px;color:#ffd479"></span></div>';
    }
  }
  html += '<script>var HINTS=' + hintsJson + ';var IDX={};function hxHint(id){var i=IDX[id]||0;if(i>=3){document.getElementById("hint-"+id).textContent="No more hints — ask the coach after 3 attempts.";return;}IDX[id]=i+1;document.getElementById("hint-"+id).textContent="Hint "+(i+1)+"/3: "+HINTS[id][i];}</script>';
  return layout(sess, 'Mission Board', html);
}
function completePage(sess) {
  const stats = featureStats();
  if (!isComplete()) {
    const left = TESTS.filter(t => !state.tests[t.id]);
    return layout(sess, 'Complete', '<h1>Not quite there yet</h1><p>You have completed ' + doneCount() + '/' + totalTests() + ' tests (' + Math.floor(doneCount() / totalTests() * 100) + '%). This page unlocks at 100%.</p>' +
      '<h2>Still open</h2>' + left.map(t => '<p>○ ' + t.name + ' <span style="color:#a99fd0">(' + t.feature + ')</span></p>').join('') +
      '<p><a style="color:#cbb8ff" href="/tests">Back to the Mission Board</a></p>');
  }
  if (!state.keyRevealed) { state.keyRevealed = true; saveState(); }
  const key = completionKey();
  const techniques = [...new Set(TESTS.map(t => t.owasp))];
  let html = '<h1>Lab complete — 100%</h1>';
  html += '<h2>1) Total features</h2><p>This lab has <strong>' + FEATURE_ORDER.length + ' features</strong> and <strong>' + totalTests() + ' security tests</strong>.</p>';
  html += '<h2>2) Vulnerabilities per feature</h2>' + FEATURE_ORDER.map(f => '<p>' + f + ': <strong>' + stats[f].total + '</strong></p>').join('');
  html += '<h2>3) Ways testing was done</h2><p>' + totalTests() + ' tests completed, covering these technique families:</p>' + techniques.map(x => '<p>• ' + x + '</p>').join('');
  html += '<h2>4) What you learned</h2>' + TESTS.map(t => '<p><strong>' + t.name + ':</strong> ' + t.lesson + '</p>').join('');
  html += '<h2>5) What this means for a real client</h2>' + TESTS.map(t => '<p><strong>' + t.name + ':</strong> ' + t.impact + '</p>').join('');
  html += '<h2>6) Writing it in a real report</h2>' + TESTS.map(t => '<p><strong>' + t.report.title + '</strong> — Severity: ' + t.report.severity + ' — Remediation: ' + t.report.remediation + '</p>').join('');
  html += '<h2>Your completion key</h2><p style="font-size:18px;background:#241a3f;border:1px dashed #5a3fd4;border-radius:8px;padding:14px">' + key + '</p><p>Paste this key into the next lab to unlock it. The coach can also give it to you now that you are at 100%.</p>';
  html += '<h2>Certificate name</h2><form method="POST" action="/complete/name" style="max-width:380px"><p>Tester name<br><input name="testerName" value="' + (state.testerName || '') + '" style="width:100%;padding:9px;border-radius:6px;border:1px solid #3a2d63;background:#171226;color:#eee"></p><button style="background:#5a3fd4;color:#fff;border:0;border-radius:6px;padding:10px 16px;cursor:pointer">Save name</button></form>' +
    '<p><a style="color:#cbb8ff" href="/certificate">View your certificate</a></p>';
  return layout(sess, 'Complete', html);
}
function certificatePage(sess) {
  if (!isComplete()) return layout(sess, 'Certificate', '<h1>Certificate locked</h1><p>Complete 100% of the tests first — you are at ' + doneCount() + '/' + totalTests() + '.</p>');
  const name = state.testerName || state.lastAccountName || 'Dedicated Tester';
  const date = state.completedAt ? new Date(state.completedAt).toDateString() : new Date().toDateString();
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB 85 HexaPodcast</title><style>@media print{body{background:#fff}}</style></head>' +
    '<body style="margin:0;font-family:Georgia,serif;background:#f4f1ea;color:#1d1730">' +
    '<main style="max-width:720px;margin:40px auto;background:#fff;border:3px double #5a3fd4;border-radius:8px;padding:40px;text-align:center">' +
    '<img src="/logo.png" alt="HexaCyberLab" style="height:64px">' +
    '<h1 style="margin:10px 0">Certificate of Completion</h1>' +
    '<p>This certifies that</p><h2 style="margin:6px 0">' + name + '</h2>' +
    '<p>has completed 100% of the security tests in <strong>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</strong> (' + totalTests() + ' tests across ' + FEATURE_ORDER.length + ' features)</p>' +
    '<p>' + date + '</p>' +
    '<p style="margin-top:26px;font-style:italic">HexaCyberLab — Built by Md. Jony Hassain, Founder</p>' +
    '</main></body></html>';
}

/* ------------------------------ Router & handlers ------------------------------ */
async function handle(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1:' + PORT);
  const p = url.pathname;
  const sess = getSession(req);

  if (p === '/logo.png') {
    try { const data = fs.readFileSync(path.join(DIR, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(data); }
    catch (e) { send(res, 404, 'logo missing'); }
    return;
  }
  if (p === '/api/progress') {
    const done = doneCount(), total = totalTests();
    sendJson(res, 200, { lab: LAB_NAME, number: LAB_NUMBER, total, done, pct: Math.floor(done / total * 100), features: featureStats(), complete: isComplete() });
    return;
  }
  if (p === '/api/chat' && req.method === 'POST') {
    const body = await readBody(req);
    sendJson(res, 200, { reply: coachReply(body.message) });
    return;
  }
  if (p === '/unlock' && req.method === 'POST') {
    const body = await readBody(req);
    const given = String(body.key || '').trim();
    if (given && given === entryKey()) {
      state.unlocked = true; saveState();
      redirect(res, '/');
    } else {
      res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(gatePage('That key was not accepted.'));
    }
    return;
  }
  if (!state.unlocked) { send(res, 200, gatePage(null)); return; }

  try {
    /* ---- Auth ---- */
    if (p === '/login' && req.method === 'GET') { send(res, 200, loginPage(sess, null)); return; }
    if (p === '/login' && req.method === 'POST') {
      const body = await readBody(req);
      bump(F_AUTH);
      const email = String(body.email || ''), password = String(body.password || '');
      let user = null;
      if (INJ_RE.test(email) || INJ_RE.test(password)) {
        user = users[0]; // the tautology matches the first row: the admin
        pass('auth-sqli');
      } else {
        user = users.find(u => u.email === email) || null;
        if (!user) { send(res, 200, loginPage(sess, 'No account found for that email.')); return; }
        if (user.password !== password) {
          failedLogins[email] = (failedLogins[email] || 0) + 1;
          if (failedLogins[email] >= 10) pass('auth-brute');
          send(res, 200, loginPage(sess, 'Wrong password for that account.'));
          return;
        }
      }
      const sid = crypto.randomBytes(16).toString('hex');
      const origin = crypto.randomBytes(8).toString('hex');
      sessions.set(sid, { userId: user.id, origin });
      if (user.id === 6) pass('auth-demo');
      if (!state.lastAccountName) { state.lastAccountName = user.name; saveState(); }
      redirect(res, '/', { 'Set-Cookie': ['hx_session=' + sid + '; Path=/; HttpOnly', 'hx_role=' + user.role + '; Path=/', 'hx_origin=' + origin + '; Path=/'] });
      return;
    }
    if (p === '/logout') {
      if (sess.sid) sessions.delete(sess.sid);
      redirect(res, '/', { 'Set-Cookie': ['hx_session=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0', 'hx_origin=; Path=/; Max-Age=0'] });
      return;
    }
    if (p === '/register' && req.method === 'GET') { send(res, 200, registerPage(sess, null)); return; }
    if (p === '/register' && req.method === 'POST') {
      const body = await readBody(req);
      bump(F_REG);
      const email = String(body.email || '');
      if (!email || users.some(u => u.email === email)) { send(res, 200, registerPage(sess, 'That email is already registered (or missing).')); return; }
      const user = { id: nextUserId++, name: String(body.name || 'New Listener'), email, password: String(body.password || ''), role: 'listener', premium: false };
      if (user.password.length <= 3) pass('reg-weak');
      let escalated = false;
      if (body.role && String(body.role) !== 'listener') { user.role = String(body.role); escalated = true; }
      if (body.plan === 'premium' || body.isPremium === '1' || body.isPremium === 'true' || body.premium === '1') { user.premium = true; escalated = true; }
      if (escalated) pass('reg-mass');
      if (XSS_RE.test(user.name)) pass('reg-xss');
      users.push(user);
      const sid = crypto.randomBytes(16).toString('hex');
      const origin = crypto.randomBytes(8).toString('hex');
      sessions.set(sid, { userId: user.id, origin });
      if (!state.lastAccountName) { state.lastAccountName = user.name; saveState(); }
      redirect(res, '/', { 'Set-Cookie': ['hx_session=' + sid + '; Path=/; HttpOnly', 'hx_role=' + user.role + '; Path=/', 'hx_origin=' + origin + '; Path=/'] });
      return;
    }
    if (p === '/forgot' && req.method === 'GET') { send(res, 200, forgotPage(sess, null)); return; }
    if (p === '/forgot' && req.method === 'POST') {
      const body = await readBody(req);
      bump(F_AUTH);
      const email = String(body.email || '');
      probedEmails.add(email);
      if (probedEmails.size >= 5) pass('auth-enum');
      const user = users.find(u => u.email === email);
      if (user) { issuedTokens[email] = tokenFor(user); send(res, 200, forgotPage(sess, 'Reset link sent to ' + email + '.')); }
      else send(res, 200, forgotPage(sess, 'No account found for that email.'));
      return;
    }
    if (p === '/reset' && req.method === 'POST') {
      const body = await readBody(req);
      bump(F_AUTH);
      const email = String(body.email || ''), token = String(body.token || '');
      const user = users.find(u => u.email === email);
      if (user && token === tokenFor(user)) {
        const wasIssued = Object.prototype.hasOwnProperty.call(issuedTokens, email);
        user.password = String(body.password || 'changed123');
        delete issuedTokens[email];
        if (!wasIssued) pass('auth-reset');
        send(res, 200, loginPage(sess, 'Password reset. Please log in with your new password.'));
      } else {
        send(res, 200, forgotPage(sess, 'That reset token is not valid.'));
      }
      return;
    }

    /* ---- Discovery ---- */
    if (p === '/' && req.method === 'GET') { send(res, 200, homePage(sess)); return; }
    if (p === '/search' && req.method === 'GET') {
      bump(F_SEARCH);
      const q = url.searchParams.get('q') || '';
      let pool;
      if (INJ_RE.test(q)) {
        pool = shows.concat(episodes.map(e => ({ ep: true, ref: e })));
        if (shows.some(s => !s.listed) || episodes.some(e => !e.listed)) pass('search-sqli');
        var results = pool.map(item => {
          if (item.ep) return '<p><a style="color:#e8e4f5" href="/episode/' + item.ref.id + '">' + item.ref.title + '</a> <span style="color:#a99fd0">(episode)</span>' + (item.ref.listed ? '' : ' <span style="color:#ff8a8a">(unlisted)</span>') + '</p>';
          return '<p><a style="color:#e8e4f5" href="/show/' + item.id + '">' + item.title + '</a> <span style="color:#a99fd0">(show)</span>' + (item.listed ? '' : ' <span style="color:#ff8a8a">(unlisted)</span>') + '</p>';
        });
      } else {
        const needle = q.toLowerCase();
        const rs = shows.filter(s => s.listed && s.title.toLowerCase().includes(needle)).map(s => '<p><a style="color:#e8e4f5" href="/show/' + s.id + '">' + s.title + '</a> <span style="color:#a99fd0">(show)</span></p>');
        const re = episodes.filter(e => e.listed && !e.hidden && e.title.toLowerCase().includes(needle)).map(e => '<p><a style="color:#e8e4f5" href="/episode/' + e.id + '">' + e.title + '</a> <span style="color:#a99fd0">(episode)</span></p>');
        var results = rs.concat(re);
      }
      if (XSS_RE.test(q)) pass('search-xss');
      send(res, 200, searchPage(sess, q, results));
      return;
    }
    const showMatch = p.match(/^\/show\/(\d+)$/);
    if (showMatch && req.method === 'GET') {
      const show = shows.find(s => s.id === Number(showMatch[1]));
      if (!show) { send(res, 404, layout(sess, 'Not found', '<h1>Show not found</h1>')); return; }
      send(res, 200, showPage(sess, show));
      return;
    }
    const epMatch = p.match(/^\/episode\/(\d+)$/);
    if (epMatch && req.method === 'GET') {
      bump(F_SEARCH);
      const ep = episodes.find(e => e.id === Number(epMatch[1]));
      if (!ep) { send(res, 404, layout(sess, 'Not found', '<h1>Episode not found</h1>')); return; }
      if (!ep.listed) {
        const ownerId = showOf(ep).ownerId;
        if (!sess.user || (sess.user.id !== ownerId && sess.user.role !== 'admin')) pass('search-unlisted');
      }
      send(res, 200, episodePage(sess, ep));
      return;
    }
    const streamMatch = p.match(/^\/episode\/(\d+)\/stream$/);
    if (streamMatch && req.method === 'GET') {
      bump(F_EP);
      const ep = episodes.find(e => e.id === Number(streamMatch[1]));
      if (!ep) { send(res, 404, 'episode not found'); return; }
      if (ep.premium) {
        const ownerId = showOf(ep).ownerId;
        const entitled = sess.user && (sess.user.premium || sess.user.id === ownerId || sess.user.role === 'admin');
        if (!entitled) pass('ep-premium');
      }
      res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
      res.end('SIMULATED-AUDIO-STREAM :: ' + ep.title + ' :: HexaPodcast LAB 85 training stream');
      return;
    }
    const editMatch = p.match(/^\/episode\/(\d+)\/edit$/);
    if (editMatch && req.method === 'POST') {
      if (!sess.user) { redirect(res, '/login'); return; }
      bump(F_EP);
      const body = await readBody(req);
      const ep = episodes.find(e => e.id === Number(editMatch[1]));
      if (!ep) { send(res, 404, 'episode not found'); return; }
      const ownerId = showOf(ep).ownerId;
      ep.title = String(body.title || ep.title);
      if (ownerId !== sess.user.id && sess.user.role !== 'admin') pass('ep-edit-idor');
      redirect(res, '/episode/' + ep.id);
      return;
    }
    const commentMatch = p.match(/^\/episode\/(\d+)\/comment$/);
    if (commentMatch && req.method === 'POST') {
      if (!sess.user) { redirect(res, '/login'); return; }
      bump(F_COM);
      const body = await readBody(req);
      const ep = episodes.find(e => e.id === Number(commentMatch[1]));
      if (!ep) { send(res, 404, 'episode not found'); return; }
      const text = String(body.text || '');
      comments.push({ id: nextCommentId++, episodeId: ep.id, userId: sess.user.id, name: sess.user.name, text });
      if (XSS_RE.test(text)) pass('com-xss');
      redirect(res, '/episode/' + ep.id);
      return;
    }
    const rateMatch = p.match(/^\/episode\/(\d+)\/rate$/);
    if (rateMatch && req.method === 'POST') {
      if (!sess.user) { redirect(res, '/login'); return; }
      bump(F_COM);
      const body = await readBody(req);
      const ep = episodes.find(e => e.id === Number(rateMatch[1]));
      if (!ep) { send(res, 404, 'episode not found'); return; }
      const stars = Number(body.stars);
      ratings.push({ episodeId: ep.id, userId: sess.user.id, stars });
      if (stars > 5 || stars < 1) pass('com-rating');
      redirect(res, '/episode/' + ep.id);
      return;
    }

    /* ---- Subscriptions ---- */
    if (p === '/subscribe' && req.method === 'GET') {
      if (!sess.user) { redirect(res, '/login'); return; }
      send(res, 200, subscribePage(sess, null)); return;
    }
    if (p === '/subscribe' && req.method === 'POST') {
      if (!sess.user) { redirect(res, '/login'); return; }
      bump(F_SUB);
      const body = await readBody(req);
      let amount = PREMIUM_PRICE;
      let tampered = false;
      if (body.amount !== undefined && body.amount !== '') {
        amount = Number(body.amount);
        if (!Number.isNaN(amount) && amount < PREMIUM_PRICE) tampered = true;
      }
      sess.user.premium = true;
      subscriptions.push({ id: nextSubId++, userId: sess.user.id, plan: 'Premium', amount, cardLast4: '4242', status: 'active' });
      if (tampered) pass('sub-price');
      send(res, 200, subscribePage(sess, 'Subscription active — you were charged $' + amount + '.'));
      return;
    }
    const subMatch = p.match(/^\/subscription\/(\d+)$/);
    if (subMatch && req.method === 'GET') {
      if (!sess.user) { redirect(res, '/login'); return; }
      bump(F_SUB);
      const sub = subscriptions.find(s => s.id === Number(subMatch[1]));
      if (!sub) { send(res, 404, layout(sess, 'Not found', '<h1>Subscription not found</h1>')); return; }
      if (sub.userId !== sess.user.id && sess.user.role !== 'admin') pass('sub-idor');
      const owner = userOf(sub.userId);
      send(res, 200, layout(sess, 'Subscription', '<h1>Subscription #' + sub.id + '</h1><p>Owner: ' + (owner ? owner.name + ' (' + owner.email + ')' : '?') + '<br>Plan: ' + sub.plan + '<br>Amount: $' + sub.amount + '/month<br>Card on file: **** **** **** ' + sub.cardLast4 + '<br>Status: ' + sub.status + '</p>'));
      return;
    }

    /* ---- Profile ---- */
    if (p === '/profile' && req.method === 'GET') {
      if (!sess.user) { redirect(res, '/login'); return; }
      send(res, 200, profilePage(sess, null)); return;
    }
    if (p === '/profile' && req.method === 'POST') {
      if (!sess.user) { redirect(res, '/login'); return; }
      bump(F_REG);
      const body = await readBody(req);
      const newName = String(body.name || sess.user.name);
      const changed = newName !== sess.user.name;
      sess.user.name = newName;
      if (XSS_RE.test(newName)) pass('reg-xss');
      if (changed && body.hx_origin !== sess.origin) pass('reg-csrf');
      send(res, 200, profilePage(sess, 'Profile saved.'));
      return;
    }

    /* ---- Creator studio, analytics, payouts ---- */
    if (p === '/studio' && req.method === 'GET') {
      if (!sess.user) { redirect(res, '/login'); return; }
      send(res, 200, studioPage(sess)); return;
    }
    const anMatch = p.match(/^\/analytics\/(\d+)$/);
    if (anMatch && req.method === 'GET') {
      if (!sess.user) { redirect(res, '/login'); return; }
      bump(F_AN);
      const show = shows.find(s => s.id === Number(anMatch[1]));
      if (!show) { send(res, 404, layout(sess, 'Not found', '<h1>Show not found</h1>')); return; }
      if (show.ownerId !== sess.user.id && sess.user.role !== 'admin') pass('an-idor');
      send(res, 200, layout(sess, 'Analytics', '<h1>Analytics — ' + show.title + '</h1><p>Total plays: ' + show.plays + '<br>Revenue: $' + show.revenue + '<br>Owner: ' + (userOf(show.ownerId) || {}).name + '</p>'));
      return;
    }
    if (p === '/payout' && req.method === 'POST') {
      if (!sess.user) { redirect(res, '/login'); return; }
      bump(F_AN);
      const body = await readBody(req);
      const amount = Number(body.amount);
      const rec = { id: nextPayoutId++, creatorId: sess.user.id, amount, status: 'pending', bankRef: 'BANK-REF-' + (1000 + nextPayoutId) };
      payouts.push(rec);
      if (amount > (earnings[sess.user.id] || 0)) pass('an-payout-tamper');
      redirect(res, '/payout/' + rec.id);
      return;
    }
    const poMatch = p.match(/^\/payout\/(\d+)$/);
    if (poMatch && req.method === 'GET') {
      if (!sess.user) { redirect(res, '/login'); return; }
      bump(F_AN);
      const po = payouts.find(x => x.id === Number(poMatch[1]));
      if (!po) { send(res, 404, layout(sess, 'Not found', '<h1>Payout not found</h1>')); return; }
      if (po.creatorId !== sess.user.id && sess.user.role !== 'admin') pass('an-payout-idor');
      const owner = userOf(po.creatorId);
      send(res, 200, layout(sess, 'Payout', '<h1>Payout #' + po.id + '</h1><p>Creator: ' + (owner ? owner.name : '?') + '<br>Amount: $' + po.amount + '<br>Status: ' + po.status + '<br>Bank reference: ' + po.bankRef + '</p>'));
      return;
    }

    /* ---- Admin ---- */
    if (p === '/admin' && req.method === 'GET') {
      if (!sess.user) { redirect(res, '/login'); return; }
      bump(F_ADM);
      const cookieRole = sess.cookies.hx_role;
      let via = null;
      if (cookieRole !== undefined) { if (cookieRole === 'admin') via = (sess.user.role === 'admin') ? 'real' : 'cookie'; }
      else via = 'default';
      if (!via) { send(res, 403, layout(sess, 'Forbidden', '<h1>Admins only</h1>')); return; }
      if (via === 'cookie') pass('auth-cookie');
      if (via === 'default' && sess.user.role !== 'admin') pass('adm-default');
      const rows = users.map(u => '<tr><td>' + u.id + '</td><td>' + u.name + '</td><td>' + u.email + '</td><td>' + u.role + '</td></tr>').join('');
      const epRows = episodes.map(e => '<p>' + e.title + ' <form method="POST" action="/admin/episode/' + e.id + '/hide" style="display:inline"><button style="background:#5a3fd4;color:#fff;border:0;border-radius:6px;padding:4px 10px;cursor:pointer">Hide</button></form></p>').join('');
      send(res, 200, layout(sess, 'Admin', '<h1>Admin panel</h1><h2>All users</h2><table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th></tr>' + rows + '</table><h2>Episodes</h2>' + epRows));
      return;
    }
    const hideMatch = p.match(/^\/admin\/episode\/(\d+)\/hide$/);
    if (hideMatch && req.method === 'POST') {
      if (!sess.user) { redirect(res, '/login'); return; }
      bump(F_ADM);
      const body = await readBody(req);
      const ep = episodes.find(e => e.id === Number(hideMatch[1]));
      if (ep) {
        ep.hidden = true;
        if (body.hx_origin !== sess.origin) pass('adm-csrf');
      }
      redirect(res, '/admin');
      return;
    }

    /* ---- API ---- */
    if (p === '/api/debug' && req.method === 'GET') {
      bump(F_API);
      pass('api-debug');
      sendJson(res, 200, { users: users.map(u => ({ id: u.id, name: u.name, email: u.email, password: u.password, role: u.role, premium: u.premium })), shows: shows.length, episodes: episodes.length });
      return;
    }
    if (p === '/api/my/episodes' && req.method === 'GET') {
      bump(F_API);
      const token = req.headers['x-api-token'] || url.searchParams.get('token') || '';
      let user = null;
      try {
        const decoded = Buffer.from(String(token), 'base64').toString('utf8');
        user = users.find(u => u.email === decoded) || null;
      } catch (e) { user = null; }
      if (user) {
        pass('api-token');
        sendJson(res, 200, { user: user.email, episodes: episodes.filter(e => e.listed || showOf(e).ownerId === user.id).map(e => ({ id: e.id, title: e.title, premium: e.premium })) });
        return;
      }
      if (sess.user) {
        sendJson(res, 200, { user: sess.user.email, episodes: episodes.filter(e => e.listed).map(e => ({ id: e.id, title: e.title, premium: e.premium })) });
        return;
      }
      sendJson(res, 401, { error: 'authentication required' });
      return;
    }

    /* ---- Lab system pages ---- */
    if (p === '/tests' && req.method === 'GET') { send(res, 200, testsPage(sess)); return; }
    if (p === '/complete' && req.method === 'GET') { send(res, 200, completePage(sess)); return; }
    if (p === '/complete/name' && req.method === 'POST') {
      const body = await readBody(req);
      state.testerName = String(body.testerName || '').slice(0, 80);
      saveState();
      redirect(res, '/complete');
      return;
    }
    if (p === '/certificate' && req.method === 'GET') { send(res, 200, certificatePage(sess)); return; }

    send(res, 404, layout(sess, 'Not found', '<h1>404 — page not found</h1>'));
  } catch (err) {
    send(res, 500, layout(sess, 'Error', '<h1>Something went sideways</h1><p>The lab is still standing. Try again.</p>'));
  }
}

/* ------------------------------ Doc generation ------------------------------ */
function genDocs() {
  const byFeature = f => TESTS.filter(t => t.feature === f);
  let vuln = '# HexaPodcast — Vulnerabilities (LAB 85)\n\nThe complete map of the lab: all ' + TESTS.length + ' scored tests grouped by feature. Every entry is a real, working flaw in the app, detected server-side when the exploit succeeds.\n';
  for (const f of FEATURE_ORDER) {
    vuln += '\n## ' + f + '\n';
    for (const t of byFeature(f)) {
      vuln += '\n### ' + t.name + '\n- OWASP: ' + t.owasp + '\n- Difficulty: ' + t.difficulty + '\n- Report title: ' + t.report.title + ' (' + t.report.severity + ')\n- Impact: ' + t.impact + '\n- Lesson: ' + t.lesson + '\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'), vuln);

  const order = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  let guide = '# HexaPodcast — Practice Guide (LAB 85)\n\nChallenges grouped by feature, then difficulty. Each challenge mirrors an entry on the in-app Mission Board (/tests). A test completes only when the exploit actually succeeds — the server detects the real effect.\n';
  for (const f of FEATURE_ORDER) {
    guide += '\n## ' + f + '\n';
    const list = byFeature(f).slice().sort((a, b) => order[a.difficulty] - order[b.difficulty]);
    for (const t of list) {
      guide += '\n### ' + t.name + ' (' + t.difficulty + ')\n- Objective: perform the exploit so the server records the real effect (see VULNERABILITIES.md).\n- Hint 1: ' + t.hints[0] + '\n- Hint 2: ' + t.hints[1] + '\n- Hint 3: ' + t.hints[2] + '\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'), guide);

  let fix = '# HexaPodcast — Fix & Retest (LAB 85)\n\nFor every test in the registry: the secure implementation and how to retest that the fix holds.\n';
  for (const f of FEATURE_ORDER) {
    fix += '\n## ' + f + '\n';
    for (const t of byFeature(f)) {
      fix += '\n### ' + t.report.title + ' (' + t.report.severity + ')\n- Fix: ' + t.report.remediation + '\n- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session granted, no object served, no state changed), while the legitimate flow still works.\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'), fix);
  console.log('Docs generated from registry: ' + TESTS.length + ' tests across ' + FEATURE_ORDER.length + ' features.');
}

/* ------------------------------ Boot ------------------------------ */
if (process.argv.includes('--gen-docs')) {
  genDocs();
  process.exit(0);
}
loadState();
saveState();
const server = http.createServer((req, res) => {
  handle(req, res).catch(() => {
    try { send(res, 500, 'Internal error'); } catch (e) { /* socket gone */ }
  });
});
server.listen(PORT, '127.0.0.1', () => {
  console.log('LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' listening on http://127.0.0.1:' + PORT);
});
