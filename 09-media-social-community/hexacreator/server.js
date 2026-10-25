'use strict';
/*
 * HexaCreator — LAB 87 (Category 9: Media, Social & Community)
 * A deliberately vulnerable creator platform (Patreon-style) for local,
 * authorised security practice. Zero-dependency Node.js, in-memory fake
 * seed data, binds 127.0.0.1 only. LOCAL USE ONLY — never deploy publicly.
 *
 * Built by Md. Jony Hassain, Founder of HexaCyberLab.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3096;
const LAB_NUMBER = 87;
const LAB_NAME = 'HexaCreator';
const PREV_LAB = 86;
const PROGRESS_FILE = path.join(__dirname, 'progress.json');
const LOGO_FILE = path.join(__dirname, 'logo.png');

/* ------------------------------------------------------------------ *
 *  Key material — entry key shards (assembled only inside /unlock)   *
 * ------------------------------------------------------------------ */
const _fragA = ["TC1YSA==","NS03OA==","TjZVVA==","SERa","QkQt","Q0ZT","V1RU"];

/* ------------------------- progress state ------------------------- */
function defaultState() {
  return { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
}
let state = (() => {
  try {
    const s = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    return Object.assign(defaultState(), s);
  } catch (e) { return defaultState(); }
})();
function saveState() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2)); } catch (e) { /* ignore */ }
}
if (!fs.existsSync(PROGRESS_FILE)) saveState();

/* ----------------------------- seed data -------------------------- */
/* All accounts, names and figures below are FAKE practice data. */
const users = [
  { id: 1, email: 'admin@hexacreator.local',   password: 'admin123',   name: 'Lab Admin',    role: 'admin',   balance: 0,   earnings: 0 },
  { id: 2, email: 'creator@hexacreator.local', password: 'creator123', name: 'Nova Creates', role: 'creator', balance: 25,  earnings: 340 },
  { id: 3, email: 'pixel@hexacreator.local',   password: 'pixel123',   name: 'PixelForge',   role: 'creator', balance: 10,  earnings: 90 },
  { id: 4, email: 'hidden@hexacreator.local',  password: 'hidden123',  name: 'Secret Studio', role: 'creator', balance: 0,  earnings: 55 },
  { id: 5, email: 'demo@hexacreator.local',    password: 'demo123',    name: 'Demo Fan',     role: 'fan',     balance: 50,  earnings: 0 },
  { id: 6, email: 'alice@hexacreator.local',   password: 'alice123',   name: 'Alice Rivers', role: 'fan',     balance: 80,  earnings: 0 },
  { id: 7, email: 'bob@hexacreator.local',     password: 'bob123',     name: 'Bob Turner',   role: 'fan',     balance: 40,  earnings: 0 },
];
const pages = [
  { id: 1, creatorId: 2, name: 'Nova Creates',   slug: 'nova-creates',   bio: 'Weekly digital-art tutorials and process videos.', listed: true },
  { id: 2, creatorId: 3, name: 'PixelForge',     slug: 'pixelforge',     bio: 'Indie game-dev logs, sprites and source files.',    listed: true },
  { id: 3, creatorId: 4, name: 'Secret Studio', slug: 'secret-studio',  bio: 'Unlisted page — invite only.',                      listed: false },
];
const tiers = [
  { id: 1, pageId: 1, name: 'Supporter', price: 5 },
  { id: 2, pageId: 1, name: 'Superfan',  price: 15 },
  { id: 3, pageId: 2, name: 'Backer',    price: 8 },
  { id: 4, pageId: 3, name: 'Insider',   price: 20 },
];
const posts = [
  { id: 1, pageId: 1, authorId: 2, title: 'Welcome to Nova Creates',       body: 'Thanks for stopping by! Public updates every Monday.', visibility: 'public' },
  { id: 2, pageId: 1, authorId: 2, title: 'Members: October brush pack',   body: 'MEMBERS-ONLY DOWNLOAD: the full October brush pack and PSD sources live here.', visibility: 'members' },
  { id: 3, pageId: 2, authorId: 3, title: 'Devlog #12 is live',            body: 'Public devlog: new lighting engine walkthrough.', visibility: 'public' },
  { id: 4, pageId: 2, authorId: 3, title: 'Backers: beta build 0.9',       body: 'MEMBERS-ONLY: beta build 0.9 download and the private roadmap.', visibility: 'members' },
];
let memberships = [
  { id: 1, userId: 6, pageId: 1, tierId: 1, pricePaid: 5, months: 1, status: 'active' },
];
let payouts = [
  { id: 1, creatorId: 2, amount: 120, status: 'paid', bankRef: 'BANK-XXXX-4242' },
];
let nextUserId = 8, nextPostId = 5, nextMembershipId = 2, nextPayoutId = 2;

const sessions = new Map();       // sid -> userId
const failCount = new Map();      // email -> consecutive failed logins
const probedEmails = new Set();   // distinct emails probed via failed login / forgot

function resetTokenFor(u) { return 'HC' + u.id + '-' + (u.id * 137 + 42); }

/* --------------------------- TESTS registry ------------------------ */
const TESTS = [
  /* ----- Login & Authentication ----- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL injection login bypass',
    owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login form builds its database query by pasting your input straight into the query string.', "Try a classic tautology in the email field, e.g. something that makes the WHERE clause always true.", "Use admin@hexacreator.local' OR '1'='1' -- as the email with any password."],
    lesson: 'String-built queries let attacker input change the query logic itself; parameterised queries make input data-only.',
    impact: 'On a real creator platform this hands an attacker the admin account in seconds — every creator page, payout and supporter record is exposed.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements for all database access and validate input server-side.' },
    where: 'POST /login', exploit: "Submit the login form with an injection payload in the email field so the credential check is bypassed and a session is issued without the real password.", objective: 'Log in as another account without knowing its password.' },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute force — no rate limit or lockout',
    owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Nothing slows you down when a password guess is wrong.', 'Script ten or more wrong passwords for one account and watch what does not happen.', 'Submit 10 failed logins for bob@hexacreator.local — the 10th is still processed with no lockout, CAPTCHA or delay.'],
    lesson: 'Without throttling, lockout or MFA, online password guessing is only a matter of time against weak passwords.',
    impact: 'Attackers can grind through password lists against creator accounts and take over pages that hold supporter money and content.',
    report: { title: 'Missing Brute-Force Protection on Login', severity: 'High', remediation: 'Add progressive rate limiting, account lockout and MFA; alert on repeated failures.' },
    where: 'POST /login', exploit: 'Send repeated failed logins for one account and observe that attempts are never throttled or locked.', objective: 'Reach 10 failed logins for one account with every attempt still accepted for processing.' },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User enumeration via differing responses',
    owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the error message for an email that exists with one that does not.', 'The forgot-password form answers differently too.', 'Probe at least 5 distinct emails across login failures and /forgot and note which ones are confirmed as real accounts.'],
    lesson: 'Different error messages for "no such account" vs "wrong password" confirm which emails are registered — the first step of targeted attacks.',
    impact: 'An attacker builds a verified list of creator and fan accounts, then aims phishing and password attacks only at real targets.',
    report: { title: 'Account Enumeration via Authentication Error Messages', severity: 'Medium', remediation: 'Return one generic message for all authentication and recovery failures.' },
    where: 'POST /login and POST /forgot', exploit: 'Probe multiple distinct emails and compare responses to learn which emails own accounts.', objective: 'Probe at least 5 distinct emails and identify which are registered from the differing responses.' },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Published demo credentials',
    owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['The login page itself tells you a working username and password.', 'Demo accounts are production accounts here.', 'Sign in with the demo fan or demo creator credentials printed on the login page.'],
    lesson: 'Demo and default credentials left active in production are an open door — attackers try them first.',
    impact: 'Anyone on the internet can walk into a live creator account and a fan account using credentials the site publishes itself.',
    report: { title: 'Active Demo Accounts with Published Credentials', severity: 'High', remediation: 'Remove demo accounts from production or force unique, unguessable credentials and disable password login for them.' },
    where: 'GET /login (credentials printed on the page)', exploit: 'Read the demo credentials published on the login page and sign in with them.', objective: 'Gain an authenticated session using only credentials the site itself publishes.' },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable password-reset token',
    owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['Reset tokens here are not random — they are computed from something public.', 'A user id is sequential and visible. What simple arithmetic could turn an id into a token?', 'The token format is HC<id>-<id*137+42>. Compute it for the victim id and submit it at /reset without ever requesting a reset email.'],
    lesson: 'Reset tokens must be long, random and single-use; anything derivable from public data is equivalent to no token at all.',
    impact: 'Any account — including the admin and top creators — can be taken over by anyone who can guess a small integer.',
    report: { title: 'Predictable Password Reset Token Allows Account Takeover', severity: 'Critical', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), expire them quickly and make them single-use.' },
    where: 'POST /reset', exploit: 'Derive the deterministic reset token from the victim user id and set a new password without access to their email.', objective: 'Reset another account\u2019s password using only its user id.' },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Role cookie tampering into Creator Studio',
    owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After login the server sets a cookie that repeats your role back to it.', 'The Creator Studio trusts that cookie instead of the server-side session.', 'As a fan, edit the hx_role cookie to creator and open /studio.'],
    lesson: 'Authorisation decisions must come from server-side session state; anything stored on the client can be edited by the client.',
    impact: 'Any fan can promote themselves into creator tooling, reaching earnings and payout functions they should never see.',
    report: { title: 'Client-Controlled Role Cookie Used for Authorisation', severity: 'High', remediation: 'Derive roles from the server-side session on every request; never trust role claims in cookies.' },
    where: 'GET /studio (hx_role cookie)', exploit: 'Forge the role cookie so a low-privilege session is treated as a creator by the studio gate.', objective: 'Open the Creator Studio as a fan by changing only a cookie value.' },

  /* ----- Registration & Profile ----- */
  { id: 'reg-weakpass', feature: 'Registration & Profile', name: 'Weak password policy (1-character passwords)',
    owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Registration barely looks at the password you choose.', 'Try the shortest password the form will accept.', 'Register a new account with a 1-character password — it is created without complaint.'],
    lesson: 'A password policy is the cheapest defence there is; accepting 1-character passwords makes every account trivially guessable.',
    impact: 'Supporter and creator accounts protected by one-character passwords fall to the most basic guessing attack.',
    report: { title: 'Registration Accepts 1-Character Passwords', severity: 'Medium', remediation: 'Enforce a minimum length (≥10) and screen new passwords against known-breached lists.' },
    where: 'POST /register', exploit: 'Create an account with a password far below any sane minimum and observe it is accepted.', objective: 'Create a working account with a password of 3 characters or fewer.' },
  { id: 'reg-massassign', feature: 'Registration & Profile', name: 'Mass assignment — role granted at registration',
    owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration handler copies more of your request body into the new account than it should.', 'What field would you add to the form if you wanted a better account?', 'Add role=creator (or admin) to the registration POST — the new account is created with that role.'],
    lesson: 'Binding request bodies directly to account records lets clients set privileged fields; allow-list exactly the fields a user may supply.',
    impact: 'Anyone can mint themselves a creator or admin account at sign-up, skipping every approval and verification step.',
    report: { title: 'Mass Assignment in Registration Allows Privilege Escalation', severity: 'High', remediation: 'Allow-list bindable registration fields server-side; set role and balance only from server logic.' },
    where: 'POST /register', exploit: 'Add privileged fields to the registration request and observe the new account is created with them applied.', objective: 'Create an account whose role is creator or admin purely by adding a form field.' },
  { id: 'reg-storedxss', feature: 'Registration & Profile', name: 'Stored XSS in display name',
    owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is shown on public pages exactly as typed.', 'Names are rendered without output encoding.', 'Register (or rename yourself) with a name containing <script>alert(1)</script> or an <img onerror> payload and view a page that prints it.'],
    lesson: 'Every user-controlled string is untrusted input; stored payloads fire in other users\u2019 browsers, including admins.',
    impact: 'A malicious display name can run script in the browsers of fans and staff who view the attacker\u2019s page — session theft and fake payout forms follow.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-encode all user output and validate names against a strict allow-list.' },
    where: 'POST /register and POST /profile/update (name rendered site-wide)', exploit: 'Store a script payload in the display name so it is saved and rendered raw to other visitors.', objective: 'Persist a script payload in a profile field that other pages render.' },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on profile update',
    owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The app marks its own pages with an hx_origin cookie; state-changing forms never check it.', 'A POST that arrives without that marker did not come from the app\u2019s own pages.', 'While logged in, POST /profile/update with a new name but without the hx_origin cookie (e.g. plain curl) — the change is applied.'],
    lesson: 'State-changing requests need an anti-CSRF token tied to the session; cookies alone are sent by the browser for any site\u2019s request.',
    impact: 'A malicious page a creator visits while logged in can silently rename their profile or deface their public identity.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require a per-session anti-CSRF token on all state-changing requests and verify Origin/Referer.' },
    where: 'POST /profile/update', exploit: 'Submit a profile change that carries no origin marker, as a cross-site request would, and observe it is accepted.', objective: 'Change a profile via a request with no hx_origin marker.' },

  /* ----- Creators & Search ----- */
  { id: 'page-search-sqli', feature: 'Creators & Search', name: 'SQL injection in creator search leaks unlisted page',
    owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Creator search builds its query the same careless way login does.', 'One creator page is unlisted and never appears in normal results.', "Search for ' OR '1'='1 and see the full directory — including the unlisted Secret Studio page."],
    lesson: 'Injection flaws in "harmless" search boxes leak data the UI was deliberately hiding; hidden is not the same as protected.',
    impact: 'A creator\u2019s private, invite-only page — meant to be invisible — is exposed to anyone who can type a quote character.',
    report: { title: 'SQL Injection in Creator Search Exposes Unlisted Pages', severity: 'High', remediation: 'Parameterise search queries and enforce listing visibility in the data layer, not the template.' },
    where: 'GET /creators?q=', exploit: 'Inject into the creator search so the result set includes the unlisted page that normal search never returns.', objective: 'Make the unlisted creator page appear in search results.' },
  { id: 'page-search-xss', feature: 'Creators & Search', name: 'Reflected XSS in creator search',
    owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The search page repeats your query back to you at the top of the results.', 'It repeats it without encoding.', 'Search for <script>alert(1)</script> and view the page source — your payload is reflected raw.'],
    lesson: 'Reflected input must be output-encoded; a search box that echoes queries is a ready-made phishing and session-theft vector.',
    impact: 'Attackers send creators a crafted search link that runs script in their browser under the platform\u2019s real domain and trust.',
    report: { title: 'Reflected Cross-Site Scripting in Creator Search', severity: 'Medium', remediation: 'HTML-encode all reflected values and add a restrictive Content-Security-Policy.' },
    where: 'GET /creators?q=', exploit: 'Place a script payload in the search query and observe it reflected unescaped in the results page.', objective: 'Get a script payload reflected raw by the search page.' },

  /* ----- Posts ----- */
  { id: 'post-members-idor', feature: 'Posts', name: 'Members-only post readable without a membership',
    owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Members-only posts are hidden from listings for non-members — but hiding is all that happens.', 'Post URLs are simple sequential ids.', 'As a fan with no membership, open /post/2 directly — the full members-only content is served.'],
    lesson: 'Paid content must be authorised on the server for every single request; obscurity and hidden links are not access control.',
    impact: 'This is the platform\u2019s core product leaking: every members-only post can be read for free, destroying creators\u2019 reason to paywall content.',
    report: { title: 'Missing Authorisation on Members-Only Posts (IDOR)', severity: 'High', remediation: 'Check an active membership (or authorship) server-side before serving members-only content.' },
    where: 'GET /post/:id', exploit: 'Open a members-only post directly as a user with no membership for that page and read the full body.', objective: 'Read a members-only post without any membership.' },
  { id: 'post-edit-idor', feature: 'Posts', name: 'Edit another creator\u2019s post (IDOR)',
    owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The post-edit endpoint checks that you are logged in — nothing more.', 'Ownership is never compared with the post\u2019s author.', 'As any other user, POST /post/1/edit with a new title/body — Nova\u2019s post is changed.'],
    lesson: 'Every object mutation must verify the caller owns (or may administer) that object; sequential ids make guessing trivial.',
    impact: 'Rivals or vandals can rewrite any creator\u2019s posts — replacing download links with malware is the obvious escalation.',
    report: { title: 'Broken Object-Level Authorisation on Post Editing', severity: 'High', remediation: 'Enforce ownership checks on every post mutation.' },
    where: 'POST /post/:id/edit', exploit: 'Submit an edit for a post authored by someone else and observe the change is saved.', objective: 'Modify a post you do not own.' },
  { id: 'post-storedxss', feature: 'Posts', name: 'Stored XSS in post body',
    owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Post bodies are rendered exactly as the author typed them.', 'Creators can post — and payloads persist for every reader.', 'Create a post whose body contains <script>alert(1)</script> or an <img src=x onerror=...> payload, then open the post.'],
    lesson: 'Rich content still needs sanitisation; a stored payload in a popular post executes for every supporter who opens it.',
    impact: 'One poisoned post can harvest the sessions of every fan and creator who reads it — platform-wide account takeover from a single upload.',
    report: { title: 'Stored Cross-Site Scripting in Post Body', severity: 'High', remediation: 'Sanitise post HTML with an allow-list sanitiser and encode on output.' },
    where: 'POST /post (body rendered raw at GET /post/:id)', exploit: 'Save a post containing a script payload and observe it stored and rendered unescaped.', objective: 'Persist a script payload inside a post.' },

  /* ----- Memberships & Payments ----- */
  { id: 'member-price', feature: 'Memberships & Payments', name: 'Membership price tampering',
    owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['The subscribe form posts a price field along with the tier.', 'The server trusts the price it is given.', 'Subscribe to the $15 Superfan tier but post price=1 — your membership is created at $1.'],
    lesson: 'Prices must always be recomputed server-side from the catalogue; any price arriving from the client is a suggestion an attacker controls.',
    impact: 'Every paid tier on the platform can be bought for a dollar — creators lose their subscription revenue while the platform reports "sales".',
    report: { title: 'Client-Side Price Tampering in Membership Checkout', severity: 'High', remediation: 'Ignore client-supplied prices; always charge the server-side tier price.' },
    where: 'POST /subscribe', exploit: 'Subscribe while posting a price lower than the tier\u2019s real price and observe the membership created at the fake price.', objective: 'Obtain a paid membership for less than the tier price.' },
  { id: 'member-negative', feature: 'Memberships & Payments', name: 'Negative months create wallet credit',
    owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['The subscribe form also accepts a months value.', 'Nobody checks its sign.', 'Subscribe with months=-3 — the "charge" is negative, so your wallet balance goes UP instead of down.'],
    lesson: 'Quantities and amounts need range validation; a negative charge is a refund the attacker grants themselves.',
    impact: 'Attackers mint free wallet credit out of thin air and spend it across the platform — direct financial loss.',
    report: { title: 'Negative Quantity Accepted in Subscription Checkout', severity: 'High', remediation: 'Validate months/quantities as positive integers server-side and reject negative totals.' },
    where: 'POST /subscribe', exploit: 'Subscribe with a negative months value so the computed charge is negative and credits the wallet.', objective: 'Increase your wallet balance through a negative subscription charge.' },
  { id: 'member-idor', feature: 'Memberships & Payments', name: 'Membership details IDOR',
    owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Membership records have their own sequential ids and their own page.', 'That page never asks whether the membership is yours.', 'Open /membership/1 while logged in as Bob — Alice\u2019s membership details are shown.'],
    lesson: 'Any page addressed by object id must check the object belongs to the caller; otherwise private billing data is public by enumeration.',
    impact: 'Supporters\u2019 subscription and payment details can be harvested one id at a time — a privacy breach and a phishing goldmine.',
    report: { title: 'Insecure Direct Object Reference on Membership Records', severity: 'Medium', remediation: 'Scope membership lookups to the authenticated user (or admins).' },
    where: 'GET /membership/:id', exploit: 'View a membership record belonging to another user by changing the id.', objective: 'Read another user\u2019s membership record.' },
  { id: 'member-cancel-idor', feature: 'Memberships & Payments', name: 'Cancel another user\u2019s membership (IDOR)',
    owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Cancelling is a POST to the membership\u2019s own URL.', 'Like the view, it never checks ownership.', 'As Bob, POST /membership/1/cancel — Alice\u2019s membership is cancelled.'],
    lesson: 'Destructive actions need the strictest ownership checks; a cancel endpoint without them is a denial-of-service against any customer.',
    impact: 'Anyone can cancel every paying supporter\u2019s membership — instant revenue destruction for creators and chaos for support.',
    report: { title: 'Broken Object-Level Authorisation on Membership Cancellation', severity: 'High', remediation: 'Verify membership ownership before allowing cancellation.' },
    where: 'POST /membership/:id/cancel', exploit: 'Cancel a membership that belongs to another user.', objective: 'Cancel someone else\u2019s membership.' },

  /* ----- Earnings & Payouts ----- */
  { id: 'earn-idor', feature: 'Earnings & Payouts', name: 'Another creator\u2019s earnings exposed (IDOR)',
    owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Earnings pages are addressed by creator id.', 'Logging in is the only check performed.', 'Open /earnings/2 as a fan — Nova\u2019s earnings, payout history and bank reference are displayed.'],
    lesson: 'Financial data needs object-level authorisation; creator income figures are commercially sensitive, not decoration.',
    impact: 'Competitors and extortionists can pull every creator\u2019s income and bank details — doxxing the platform\u2019s earners and enabling targeted fraud.',
    report: { title: 'Insecure Direct Object Reference on Creator Earnings', severity: 'High', remediation: 'Restrict earnings views to the owning creator or finance admins.' },
    where: 'GET /earnings/:creatorId', exploit: 'Open the earnings page of a creator you are not, and read their figures.', objective: 'View another creator\u2019s earnings and payout history.' },
  { id: 'payout-amount', feature: 'Earnings & Payouts', name: 'Payout larger than earnings accepted',
    owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['Payout requests ask how much you want — and believe you.', 'Your real available balance is never consulted.', 'As a creator, POST /payout with amount=99999, far above your earnings — the payout is created.'],
    lesson: 'Money-out flows must validate against the server-side ledger balance at the moment of the request.',
    impact: 'Creators can request payouts far beyond what they earned — the platform pays out money that does not exist.',
    report: { title: 'Payout Amount Not Validated Against Earnings Balance', severity: 'Critical', remediation: 'Validate payout amounts against the server-side available balance and hold funds on request.' },
    where: 'POST /payout', exploit: 'Request a payout greater than the creator\u2019s available earnings and observe it accepted.', objective: 'Create a payout that exceeds the creator\u2019s earnings.' },
  { id: 'payout-csrf', feature: 'Earnings & Payouts', name: 'CSRF on payout request',
    owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The payout form is a state-changing, money-moving POST with no marker check.', 'Requests arriving without the hx_origin cookie are still honoured.', 'While logged in as a creator, POST /payout from curl (no hx_origin cookie) — a payout is created.'],
    lesson: 'Money-moving endpoints are prime CSRF targets; a missing token means any website can trigger them for a logged-in victim.',
    impact: 'A creator who visits a malicious page while logged in can have payout requests fired in their name without ever seeing the form.',
    report: { title: 'Missing CSRF Protection on Payout Requests', severity: 'High', remediation: 'Require per-session anti-CSRF tokens on payout and all state-changing endpoints.' },
    where: 'POST /payout', exploit: 'Create a payout via a request carrying no origin marker, as a cross-site form would.', objective: 'Trigger a payout request with no hx_origin marker.' },

  /* ----- Supporters & Community ----- */
  { id: 'supporters-leak', feature: 'Supporters & Community', name: 'Supporter list with emails exposed to everyone',
    owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Each creator page links to its supporter list.', 'The list includes private email addresses — and no ownership check.', 'Open /page/1/supporters as any other user and read the supporters\u2019 names and emails.'],
    lesson: 'A page\u2019s audience data belongs to that creator; exposing supporter emails platform-wide is a privacy breach by design.',
    impact: 'Anyone can scrape every creator\u2019s supporter emails — spam, phishing and poaching lists built straight from the platform itself (a GDPR problem too).',
    report: { title: 'Supporter Personal Data Exposed Without Authorisation', severity: 'High', remediation: 'Restrict supporter lists to the page owner and never expose supporter emails to other users.' },
    where: 'GET /page/:id/supporters', exploit: 'Open another creator\u2019s supporter list and read supporter names and email addresses.', objective: 'Read a supporter list (with emails) for a page you do not own.' },

  /* ----- Admin Panel ----- */
  { id: 'admin-bac', feature: 'Admin Panel', name: 'Admin panel open to any logged-in user',
    owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The admin panel checks that *someone* is logged in.', 'It never checks that the someone is an admin.', 'Log in as the demo fan and open /admin — the full user table, including passwords, is served.'],
    lesson: 'Authentication is not authorisation; privileged areas must verify the role on the server for every request.',
    impact: 'Every registered user — including free fans — can open the admin panel and read the entire account table with passwords.',
    report: { title: 'Missing Role Check on Admin Panel (Broken Access Control)', severity: 'Critical', remediation: 'Enforce admin role server-side on all /admin routes and never render credential data.' },
    where: 'GET /admin', exploit: 'Open the admin panel with a non-admin session and read the full user list.', objective: 'Reach the admin panel as a non-admin user.' },

  /* ----- Platform & API ----- */
  { id: 'api-debug', feature: 'Platform & API', name: 'Unauthenticated debug endpoint dumps all users',
    owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Developers leave diagnostic endpoints behind more often than you would think.', 'This one needs no login at all.', 'Fetch /api/debug — every account, including passwords, comes back as JSON.'],
    lesson: 'Debug and diagnostic endpoints must never ship to production; one forgotten route can hand over the entire user database.',
    impact: 'A single unauthenticated request downloads every account and password on the platform — total compromise in one click.',
    report: { title: 'Exposed Debug Endpoint Discloses All User Credentials', severity: 'Critical', remediation: 'Remove debug endpoints from production builds and require admin auth for any diagnostics.' },
    where: 'GET /api/debug', exploit: 'Fetch the debug endpoint and observe the full user dump including passwords.', objective: 'Retrieve the full account list from the debug endpoint.' },
  { id: 'api-token', feature: 'Platform & API', name: 'Weak API token (base64 of email)',
    owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['The API accepts an x-api-token header instead of a session.', 'The "token" is a reversible encoding of something public.', 'Send x-api-token as base64 of alice@hexacreator.local to /api/my-memberships — her memberships come back with no session at all.'],
    lesson: 'API tokens must be unguessable random secrets; encoding an identifier is not authentication.',
    impact: 'Anyone who knows a user\u2019s email — public by design on a creator platform — can call the API as that user.',
    report: { title: 'Predictable API Token Derived from Email Address', severity: 'High', remediation: 'Issue high-entropy random API tokens, store them hashed, and support revocation.' },
    where: 'GET /api/my-memberships (x-api-token header)', exploit: 'Call the API with a token computed from a victim\u2019s email and receive their data without a session.', objective: 'Access another user\u2019s API data using only their email address.' },
];

const FEATURES = [...new Set(TESTS.map(t => t.feature))];
const XSS_RE = /(<script|onerror\s*=|onload\s*=|<svg|<img[^>]*onerror|javascript:)/i;
const INJ_RE = /('\s*(or|and)\s+('?\d+'?\s*=\s*'?\d+|'[^']*'\s*=\s*'[^']*'))|('\s*--)|(\bunion\b\s+\bselect\b)/i;

/* ------------------------------------------------------------------ *
 *  Key material — completion key shards (assembled ONLY at 100%)     *
 * ------------------------------------------------------------------ */
const _fragB = ["TC1YSA==","Ui04OA==","NVE5Sw==","R0g5","MVMt","R1cz","UjhV"];
const _unshard = a => a.map(s => [...Buffer.from(s, 'base64').toString('utf8')].reverse().join('')).join('');
function completionKey() {
  if (!state.keyRevealed) return null;          // the key does not exist for us before 100%
  return _unshard(_fragB);
}

/* --------------------------- progress engine ----------------------- */
function progress() {
  const total = TESTS.length;
  const done = TESTS.filter(t => state.tests[t.id]).length;
  const features = {};
  for (const f of FEATURES) {
    const ft = TESTS.filter(t => t.feature === f);
    features[f] = { total: ft.length, done: ft.filter(t => state.tests[t.id]).length, attempts: state.attempts[f] || 0 };
  }
  return { lab: LAB_NAME, number: LAB_NUMBER, total, done, pct: total ? Math.floor(done / total * 100) : 0, features, complete: done === total };
}
function pass(id) {
  if (state.tests[id]) return;
  state.tests[id] = true;
  const p = progress();
  if (p.complete && !state.keyRevealed) { state.keyRevealed = true; state.completedAt = new Date().toISOString(); }
  saveState();
}
function attempt(feature) { state.attempts[feature] = (state.attempts[feature] || 0) + 1; saveState(); }

/* ----------------------------- http helpers ------------------------ */
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function parseBody(req) {
  return new Promise(resolve => {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = (req.headers['content-type'] || '');
      if (ct.includes('application/json')) { try { return resolve(JSON.parse(raw || '{}')); } catch (e) { return resolve({}); } }
      const out = {};
      try { for (const [k, v] of new URLSearchParams(raw)) out[k] = v; } catch (e) { /* ignore */ }
      resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}
function cookiesOf(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function currentUser(req) {
  const sid = cookiesOf(req).hx_session;
  if (!sid || !sessions.has(sid)) return null;
  return users.find(u => u.id === sessions.get(sid)) || null;
}
function startSession(res, user) {
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, user.id);
  res.setHeader('Set-Cookie', [
    'hx_session=' + sid + '; Path=/; HttpOnly',
    'hx_role=' + user.role + '; Path=/',
    'hx_origin=site; Path=/',
  ]);
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }

/* ------------------------------ layout ----------------------------- */
function layout(req, title, content) {
  const p = progress();
  const u = currentUser(req);
  const bar = '<div style="background:#22262e;border-radius:6px;overflow:hidden;height:14px;max-width:520px"><div style="background:linear-gradient(90deg,#4f7cff,#a04dff);height:14px;width:' + p.pct + '%"></div></div>';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + ' — HexaCreator</title>' +
    '<style>body{font-family:system-ui,Arial,sans-serif;background:#101216;color:#e8eaf0;margin:0}header{background:#171a21;padding:12px 20px;border-bottom:1px solid #2a2f3a}a{color:#8fb4ff}nav a{margin-right:14px}.wrap{max-width:960px;margin:0 auto;padding:20px}.card{background:#171a21;border:1px solid #2a2f3a;border-radius:10px;padding:16px;margin:12px 0}input,textarea,select{background:#0d0f13;color:#e8eaf0;border:1px solid #39404e;border-radius:6px;padding:8px;margin:4px 0;width:100%;box-sizing:border-box}button{background:linear-gradient(90deg,#4f7cff,#a04dff);color:#fff;border:0;border-radius:6px;padding:9px 16px;cursor:pointer}table{border-collapse:collapse;width:100%}td,th{border:1px solid #2a2f3a;padding:6px 8px;text-align:left}.muted{color:#9aa3b2}</style></head><body>' +
    '<header><div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap"><img src="/logo.png" alt="HexaCyberLab" style="height:38px">' +
    '<strong>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</strong><span class="muted">LAB ' + LAB_NUMBER + ' · ' + p.done + '/' + p.total + ' tests · ' + p.pct + '%</span></div>' + bar +
    '<nav style="margin-top:10px"><a href="/">Home</a><a href="/creators">Creators</a><a href="/tests">Mission Board</a>' +
    (u ? '<a href="/my">My Page</a><a href="/studio">Creator Studio</a><a href="/admin">Admin</a><a href="/complete">Complete</a><a href="/logout">Logout (' + esc(u.name) + ')</a>'
        : '<a href="/login">Login</a><a href="/register">Register</a>') +
    '</nav></header><div class="wrap">' + content + '</div>' + chatWidget() + '</body></html>';
}
function chatWidget() {
  return '<div id="hxchat" style="position:fixed;right:16px;bottom:16px;width:320px;background:#171a21;border:1px solid #39404e;border-radius:10px;overflow:hidden;z-index:50">' +
    '<div style="background:linear-gradient(90deg,#4f7cff,#a04dff);padding:8px 12px;font-weight:bold">Lab Coach</div>' +
    '<div id="hxlog" style="height:170px;overflow:auto;padding:10px;font-size:13px"></div>' +
    '<div style="display:flex"><input id="hxmsg" placeholder="Ask the Lab Coach…" style="flex:1;border:0;border-top:1px solid #39404e;background:#0d0f13;color:#e8eaf0;padding:9px">' +
    '<button onclick="hxSend()" style="border-radius:0">Send</button></div></div>' +
    '<script>async function hxSend(){var m=document.getElementById("hxmsg");var log=document.getElementById("hxlog");var t=m.value.trim();if(!t)return;m.value="";log.innerHTML+="<div><b>You:</b> "+t.replace(/</g,"&lt;")+"</div>";try{var r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:t})});var j=await r.json();log.innerHTML+="<div style=\\"margin:6px 0\\"><b>Coach:</b> "+(j.reply||"").replace(/</g,"&lt;")+"</div>";}catch(e){log.innerHTML+="<div><b>Coach:</b> (unavailable)</div>";}log.scrollTop=log.scrollHeight;}' +
    'document.getElementById("hxmsg").addEventListener("keydown",function(e){if(e.key==="Enter")hxSend();});</script>';
}
function gatePage(req, msg) {
  const content = '<div class="card" style="text-align:center"><img src="/logo.png" style="height:64px"><h1>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h1>' +
    '<p>This lab is locked. Paste the completion key from Lab ' + PREV_LAB + ' to start.</p>' +
    (msg ? '<p style="color:#ff8080">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/unlock" style="max-width:420px;margin:0 auto"><input name="key" placeholder="Completion key from Lab ' + PREV_LAB + '" autocomplete="off"><button type="submit">Unlock Lab ' + LAB_NUMBER + '</button></form></div>';
  const p = progress();
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Locked — LAB ' + LAB_NUMBER + '</title><style>body{font-family:system-ui,Arial;background:#101216;color:#e8eaf0;margin:0}.wrap{max-width:720px;margin:40px auto;padding:20px}.card{background:#171a21;border:1px solid #2a2f3a;border-radius:10px;padding:24px}input{background:#0d0f13;color:#e8eaf0;border:1px solid #39404e;border-radius:6px;padding:9px;width:100%;box-sizing:border-box;margin:8px 0}button{background:linear-gradient(90deg,#4f7cff,#a04dff);color:#fff;border:0;border-radius:6px;padding:9px 16px;cursor:pointer}</style></head><body><div class="wrap">' + content + '</div>' + chatWidget() + '</body></html>';
}

/* ------------------------------- pages ----------------------------- */
function homePage(req) {
  const cards = pages.filter(pg => pg.listed).map(pg => {
    const c = users.find(u => u.id === pg.creatorId);
    return '<div class="card"><h3><a href="/page/' + pg.id + '">' + esc(pg.name) + '</a></h3><p>' + esc(pg.bio) + '</p><p class="muted">by ' + esc(c ? c.name : '?') + '</p></div>';
  }).join('');
  const recent = posts.filter(p => p.visibility === 'public').map(p => '<li><a href="/post/' + p.id + '">' + esc(p.title) + '</a></li>').join('');
  return layout(req, 'Home', '<h1>HexaCreator</h1><p class="muted">Support the creators you love. Memberships unlock members-only posts.</p><h2>Featured creators</h2>' + cards + '<div class="card"><h3>Latest public posts</h3><ul>' + recent + '</ul></div>');
}
function loginPage(req, msg) {
  return layout(req, 'Login', '<h1>Login</h1>' + (msg ? '<p style="color:#ff8080">' + esc(msg) + '</p>' : '') +
    '<div class="card"><form method="POST" action="/login"><label>Email<input name="email" type="email" required></label><label>Password<input name="password" type="password" required></label><button>Login</button></form>' +
    '<p class="muted">Forgot your password? <a href="/forgot">Reset it</a></p></div>' +
    '<div class="card"><h3>Try the demo</h3><p>Demo fan: <b>demo@hexacreator.local / demo123</b><br>Demo creator: <b>creator@hexacreator.local / creator123</b></p></div>');
}
function registerPage(req, msg) {
  return layout(req, 'Register', '<h1>Create your account</h1>' + (msg ? '<p style="color:#ff8080">' + esc(msg) + '</p>' : '') +
    '<div class="card"><form method="POST" action="/register"><label>Display name<input name="name" required></label><label>Email<input name="email" type="email" required></label><label>Password<input name="password" type="password" required></label><button>Register</button></form></div>');
}
function creatorsPage(req, q, results) {
  const rows = results.map(pg => '<div class="card"><h3><a href="/page/' + pg.id + '">' + esc(pg.name) + '</a></h3><p>' + esc(pg.bio) + '</p></div>').join('') || '<p>No creators found.</p>';
  // NOTE (intentional flaw): the raw query q is reflected unescaped below.
  return layout(req, 'Creators', '<h1>Find creators</h1><form method="GET" action="/creators"><input name="q" value="' + (q || '') + '" placeholder="Search creators…"><button>Search</button></form>' +
    (q ? '<p>Results for: ' + q + '</p>' : '') + rows);
}
function pageView(req, pg) {
  const c = users.find(u => u.id === pg.creatorId);
  const tierRows = tiers.filter(t => t.pageId === pg.id).map(t =>
    '<tr><td>' + esc(t.name) + '</td><td>$' + t.price + '/mo</td><td><form method="POST" action="/subscribe"><input type="hidden" name="tierId" value="' + t.id + '"><input type="hidden" name="price" value="' + t.price + '"><label>Months <input name="months" value="1" size="3"></label> <button>Subscribe</button></form></td></tr>').join('');
  const postRows = posts.filter(p => p.pageId === pg.id).map(p =>
    '<li><a href="/post/' + p.id + '">' + esc(p.title) + '</a> ' + (p.visibility === 'members' ? '<span class="muted">(members only)</span>' : '') + '</li>').join('');
  return layout(req, pg.name, '<h1>' + esc(pg.name) + '</h1><p>' + esc(pg.bio) + '</p><p class="muted">by ' + esc(c ? c.name : '?') + ' · <a href="/page/' + pg.id + '/supporters">Supporters</a></p>' +
    '<div class="card"><h3>Membership tiers</h3><table>' + tierRows + '</table></div><div class="card"><h3>Posts</h3><ul>' + postRows + '</ul></div>');
}
function postView(req, post) {
  const pg = pages.find(x => x.id === post.pageId);
  const author = users.find(u => u.id === post.authorId);
  // NOTE (intentional flaw): post body rendered raw; members-only check happens in the router hook, body is always served.
  return layout(req, post.title, '<h1>' + esc(post.title) + '</h1><p class="muted">on <a href="/page/' + post.pageId + '">' + esc(pg ? pg.name : '') + '</a> by ' + esc(author ? author.name : '') + (post.visibility === 'members' ? ' · members only' : '') + '</p><div class="card">' + post.body + '</div>' +
    '<div class="card"><h3>Edit this post</h3><form method="POST" action="/post/' + post.id + '/edit"><label>Title<input name="title" value="' + esc(post.title) + '"></label><label>Body<textarea name="body" rows="4">' + esc(post.body) + '</textarea></label><button>Save edit</button></form></div>');
}
function myPage(req, u) {
  const mine = memberships.filter(m => m.userId === u.id);
  const rows = mine.map(m => {
    const t = tiers.find(x => x.id === m.tierId); const pg = pages.find(x => x.id === m.pageId);
    return '<tr><td><a href="/membership/' + m.id + '">#' + m.id + '</a></td><td>' + esc(pg ? pg.name : '') + '</td><td>' + esc(t ? t.name : '') + '</td><td>$' + m.pricePaid + '</td><td>' + esc(m.status) + '</td></tr>';
  }).join('') || '<tr><td colspan="5">No memberships yet.</td></tr>';
  return layout(req, 'My Page', '<h1>My Page</h1><div class="card"><p><b>' + esc(u.name) + '</b> (' + esc(u.email) + ') · role: ' + esc(u.role) + ' · wallet: $' + u.balance + '</p>' +
    '<form method="POST" action="/profile/update"><label>Display name<input name="name" value="' + esc(u.name) + '"></label><button>Update profile</button></form></div>' +
    '<div class="card"><h3>My memberships</h3><table><tr><th>ID</th><th>Page</th><th>Tier</th><th>Paid</th><th>Status</th></tr>' + rows + '</table></div>' +
    (u.role === 'creator' || u.role === 'admin' ? '<div class="card"><h3>New post</h3><form method="POST" action="/post"><label>Page id<input name="pageId" value="' + (pages.find(p => p.creatorId === u.id) || {}).id + '"></label><label>Title<input name="title"></label><label>Visibility<select name="visibility"><option>public</option><option>members</option></select></label><label>Body<textarea name="body" rows="4"></textarea></label><button>Publish</button></form></div>' : ''));
}

function studioPage(req, u) {
  const mine = payouts.filter(p => p.creatorId === u.id);
  const rows = mine.map(p => '<tr><td>#' + p.id + '</td><td>$' + p.amount + '</td><td>' + esc(p.status) + '</td><td>' + esc(p.bankRef) + '</td></tr>').join('') || '<tr><td colspan="4">No payouts yet.</td></tr>';
  return layout(req, 'Creator Studio', '<h1>Creator Studio</h1><div class="card"><p>Creator: <b>' + esc(u.name) + '</b> · earnings balance: <b>$' + u.earnings + '</b></p>' +
    '<h3>Request a payout</h3><form method="POST" action="/payout"><label>Amount (USD)<input name="amount" type="number" value="50"></label><button>Request payout</button></form></div>' +
    '<div class="card"><h3>My payouts</h3><table><tr><th>ID</th><th>Amount</th><th>Status</th><th>Bank ref</th></tr>' + rows + '</table></div>');
}
function earningsPage(req, target) {
  const rows = payouts.filter(p => p.creatorId === target.id).map(p => '<tr><td>#' + p.id + '</td><td>$' + p.amount + '</td><td>' + esc(p.status) + '</td><td>' + esc(p.bankRef) + '</td></tr>').join('') || '<tr><td colspan="4">No payouts.</td></tr>';
  return layout(req, 'Earnings', '<h1>Earnings — ' + esc(target.name) + '</h1><div class="card"><p>Total earnings balance: <b>$' + target.earnings + '</b></p><h3>Payout history</h3><table><tr><th>ID</th><th>Amount</th><th>Status</th><th>Bank ref</th></tr>' + rows + '</table></div>');
}
function adminPage(req) {
  const rows = users.map(u => '<tr><td>' + u.id + '</td><td>' + esc(u.name) + '</td><td>' + esc(u.email) + '</td><td>' + esc(u.password) + '</td><td>' + esc(u.role) + '</td><td>$' + u.balance + '</td></tr>').join('');
  return layout(req, 'Admin', '<h1>Admin Panel</h1><div class="card"><table><tr><th>ID</th><th>Name</th><th>Email</th><th>Password</th><th>Role</th><th>Balance</th></tr>' + rows + '</table></div>');
}
function testsPage(req) {
  const p = progress();
  let html = '<h1>Mission Board — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h1><p>' + p.done + '/' + p.total + ' tests complete · ' + p.pct + '%</p>';
  for (const f of FEATURES) {
    const ft = TESTS.filter(t => t.feature === f);
    html += '<div class="card"><h2>' + esc(f) + '</h2><p class="muted">Attempts on this feature: ' + (state.attempts[f] || 0) + '</p>';
    for (const t of ft) {
      const doneIt = !!state.tests[t.id];
      html += '<div style="border-top:1px solid #2a2f3a;padding:8px 0"><b>' + (doneIt ? '✓' : '○') + ' ' + esc(t.name) + '</b> <span class="muted">' + esc(t.owasp) + ' · ' + esc(t.difficulty) + '</span>' +
        '<div><button type="button" onclick="var e=this.nextElementSibling;e.style.display=e.style.display===\'none\'?\'block\':\'none\'">Hints</button>' +
        '<div style="display:none"><ol><li>' + esc(t.hints[0]) + '</li><li>' + esc(t.hints[1]) + '</li><li>' + esc(t.hints[2]) + '</li></ol></div></div></div>';
    }
    html += '</div>';
  }
  return layout(req, 'Mission Board', html);
}
function completePage(req) {
  const p = progress();
  if (!p.complete) {
    const left = TESTS.filter(t => !state.tests[t.id]).map(t => '<li>' + esc(t.name) + ' <span class="muted">(' + esc(t.feature) + ')</span></li>').join('');
    return layout(req, 'Complete', '<h1>Not yet complete</h1><p>Progress: ' + p.done + '/' + p.total + ' tests · ' + p.pct + '%</p><div class="card"><h3>Still to solve</h3><ul>' + left + '</ul></div>');
  }
  const key = completionKey();
  const byFeature = FEATURES.map(f => '<li><b>' + esc(f) + '</b>: ' + TESTS.filter(t => t.feature === f).length + ' vulnerabilities</li>').join('');
  const techniques = TESTS.map(t => '<li>' + esc(t.name) + ' <span class="muted">(' + esc(t.owasp) + ')</span></li>').join('');
  const lessons = TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.lesson) + '</li>').join('');
  const impacts = TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.impact) + '</li>').join('');
  const reports = TESTS.map(t => '<li><b>' + esc(t.report.title) + '</b> — Severity: ' + esc(t.report.severity) + ' — Remediation: ' + esc(t.report.remediation) + '</li>').join('');
  return layout(req, 'Lab Complete', '<h1>🎉 LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' complete!</h1>' +
    '<div class="card"><h2>1 · Features in this lab</h2><p>' + FEATURES.length + ' features</p><ul>' + byFeature + '</ul></div>' +
    '<div class="card"><h2>2 · Per-feature vulnerability counts</h2><ul>' + byFeature + '</ul></div>' +
    '<div class="card"><h2>3 · Ways testing was done (' + p.total + ' tests)</h2><ul>' + techniques + '</ul></div>' +
    '<div class="card"><h2>4 · What you learned</h2><ul>' + lessons + '</ul></div>' +
    '<div class="card"><h2>5 · What this means for a real client</h2><ul>' + impacts + '</ul></div>' +
    '<div class="card"><h2>6 · Writing it in a real report</h2><ul>' + reports + '</ul></div>' +
    '<div class="card"><h2>Your completion key</h2><p>Paste this key into Lab ' + (LAB_NUMBER + 1) + ' to unlock it:</p><p style="font-size:20px"><b>' + esc(key) + '</b></p>' +
    '<form method="POST" action="/complete/name"><label>Your name for the certificate<input name="testerName" value="' + esc(state.testerName) + '"></label><button>Save name</button></form>' +
    '<p><a href="/certificate">View your certificate →</a></p></div>');
}
function certificatePage(req) {
  const p = progress();
  const name = state.testerName || 'HexaCreator Tester';
  const date = state.completedAt ? new Date(state.completedAt).toDateString() : new Date().toDateString();
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ' + LAB_NUMBER + '</title><style>body{background:#e9ebef;font-family:Georgia,serif}.card{max-width:720px;margin:40px auto;background:#fff;border:3px double #4f7cff;border-radius:8px;padding:40px;text-align:center;color:#1c2333}@media print{body{background:#fff}.card{border:2px solid #333}}</style></head><body>' +
    '<div class="card"><img src="/logo.png" style="height:72px"><h1>Certificate of Completion</h1><p>This certifies that</p><h2>' + esc(name) + '</h2>' +
    '<p>has completed 100% of the security tests in LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' (' + p.total + ' tests across ' + FEATURES.length + ' features)</p>' +
    '<p>' + esc(date) + '</p><p style="margin-top:28px"><b>HexaCyberLab — Built by Md. Jony Hassain, Founder</b></p></div></body></html>';
}

/* ------------------------------ chatbot ---------------------------- */
const FEATURE_KEYS = [
  ['login', 'Login & Authentication'], ['password', 'Login & Authentication'], ['auth', 'Login & Authentication'], ['sql', 'Login & Authentication'], ['reset token', 'Login & Authentication'],
  ['register', 'Registration & Profile'], ['registration', 'Registration & Profile'], ['profile', 'Registration & Profile'], ['sign up', 'Registration & Profile'],
  ['search', 'Creators & Search'], ['creator page', 'Creators & Search'],
  ['post', 'Posts'],
  ['membership', 'Memberships & Payments'], ['subscribe', 'Memberships & Payments'], ['subscription', 'Memberships & Payments'], ['payment', 'Memberships & Payments'], ['checkout', 'Memberships & Payments'],
  ['earning', 'Earnings & Payouts'], ['payout', 'Earnings & Payouts'],
  ['supporter', 'Supporters & Community'],
  ['admin', 'Admin Panel'],
  ['api', 'Platform & API'], ['debug', 'Platform & API'], ['token', 'Platform & API'],
];
function chatReply(message) {
  const m = String(message || '').toLowerCase();
  const p = progress();
  if (/(who (built|made|created)|founder|jony|hassain)/.test(m)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (m.includes('key')) {
    if (p.complete && state.keyRevealed) return 'You completed LAB ' + LAB_NUMBER + ' — here is your completion key: ' + completionKey() + ' — paste it into Lab ' + (LAB_NUMBER + 1) + ' to unlock it.';
    return "I don't have the completion key yet — I only receive it when this lab is completed 100%. Right now you're at " + p.pct + '% (' + p.done + '/' + p.total + ' tests). Finish every test on the Mission Board (/tests) and ask me again.';
  }
  let feature = null;
  for (const f of FEATURES) if (m.includes(f.toLowerCase())) feature = f;
  if (!feature) for (const [k, f] of FEATURE_KEYS) if (m.includes(k)) { feature = f; break; }
  if (m.includes('how many') || m.includes('features') || m.includes('list') || m.includes('what tests') || m.includes('vulnerabilit')) {
    if (feature) {
      const ft = TESTS.filter(t => t.feature === feature);
      return feature + ' has ' + ft.length + ' tests: ' + ft.map(t => t.name).join('; ') + '. Attempts so far on this feature: ' + (state.attempts[feature] || 0) + '.';
    }
    return 'LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ' has ' + FEATURES.length + ' features and ' + p.total + ' tests: ' + FEATURES.map(f => f + ' (' + TESTS.filter(t => t.feature === f).length + ')').join(', ') + '. Your progress: ' + p.done + '/' + p.total + ' (' + p.pct + '%).';
  }
  if (feature) {
    const ft = TESTS.filter(t => t.feature === feature);
    const att = state.attempts[feature] || 0;
    const allDone = ft.every(t => state.tests[t.id]);
    if (allDone) return 'You have already completed every test in ' + feature + '. Nice work — pick another feature from the Mission Board (/tests).';
    if (att >= 3) {
      const open = ft.filter(t => !state.tests[t.id]);
      return 'Step by step for ' + feature + ' — ' + open.map(t => '"' + t.name + '": ' + t.hints[2]).join(' · ');
    }
    return 'That feature is locked for help. First try the ' + feature + " tests yourself at least 3 times — I can see you've tried " + att + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  if (m.includes('hello') || m.includes('hi') || m.includes('help') || m.includes('start') || m.includes('next') || m === '') {
    const next = TESTS.find(t => !state.tests[t.id]);
    return 'Welcome to LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '! This lab has ' + FEATURES.length + ' features and ' + p.total + ' tests. Your progress: ' + p.done + '/' + p.total + ' (' + p.pct + '%).' + (next ? ' Next open test: "' + next.name + '" in ' + next.feature + ' — see the Mission Board at /tests, and use each test\u2019s hints.' : ' Everything is done — see /complete for your key and certificate.');
  }
  return 'I can help with the tests in this lab: ask me about a feature (e.g. "' + FEATURES[0] + '"), ask how many tests a feature has, or open the Mission Board at /tests for hints. Remember: I unlock step-by-step help for a feature after you have tried it at least 3 times.';
}

/* ------------------------------- router ---------------------------- */
async function route(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1:' + PORT);
  const pth = url.pathname;
  const method = req.method;
  const cookies = cookiesOf(req);
  let m;

  if (pth === '/logo.png') {
    try { const data = fs.readFileSync(LOGO_FILE); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(data); }
    catch (e) { return send(res, 404, 'not found'); }
  }
  if (pth === '/api/progress' && method === 'GET') return send(res, 200, JSON.stringify(progress()), 'application/json');
  if (pth === '/api/chat' && method === 'POST') {
    const b = await parseBody(req);
    return send(res, 200, JSON.stringify({ reply: chatReply(b.message) }), 'application/json');
  }
  if (pth === '/unlock' && method === 'POST') {
    const b = await parseBody(req);
    const given = String(b.key || '');
    const expected = _unshard(_fragA);           // assembled only here, inside unlock verification
    let ok = false;
    try {
      const ga = Buffer.from(given), gb = Buffer.from(expected);
      ok = ga.length === gb.length && crypto.timingSafeEqual(ga, gb);
    } catch (e) { ok = false; }
    if (ok) { state.unlocked = true; saveState(); return redirect(res, '/'); }
    return send(res, 403, gatePage(req, 'That key was not accepted.'));
  }

  if (!state.unlocked) return send(res, 200, gatePage(req));

  /* ---- public / auth ---- */
  if (pth === '/' && method === 'GET') return send(res, 200, homePage(req));
  if (pth === '/login' && method === 'GET') return send(res, 200, loginPage(req));
  if (pth === '/register' && method === 'GET') return send(res, 200, registerPage(req));
  if (pth === '/logout' && method === 'GET') {
    const sid = cookies.hx_session; if (sid) sessions.delete(sid);
    res.setHeader('Set-Cookie', ['hx_session=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0']);
    return redirect(res, '/');
  }
  if (pth === '/login' && method === 'POST') {
    attempt('Login & Authentication');
    const b = await parseBody(req);
    const email = String(b.email || '').trim().toLowerCase();
    const pw = String(b.password || '');
    const inj = INJ_RE.test(email) || INJ_RE.test(pw) || email.includes("'--") || pw.includes("'--");
    if (inj) {
      const admin = users.find(u => u.role === 'admin');
      pass('auth-sqli');
      startSession(res, admin);
      return redirect(res, '/');
    }
    const u = users.find(x => x.email === email);
    if (!u) { probedEmails.add(email); if (probedEmails.size >= 5) pass('auth-enum'); return send(res, 200, loginPage(req, 'No account found for that email address.')); }
    if (u.password !== pw) {
      probedEmails.add(email); if (probedEmails.size >= 5) pass('auth-enum');
      const n = (failCount.get(email) || 0) + 1; failCount.set(email, n);
      if (n >= 10) pass('auth-brute');
      return send(res, 200, loginPage(req, 'Wrong password for that account.'));
    }
    failCount.delete(email);
    if ((email === 'demo@hexacreator.local' && pw === 'demo123') || (email === 'creator@hexacreator.local' && pw === 'creator123')) pass('auth-default');
    startSession(res, u);
    return redirect(res, '/');
  }
  if (pth === '/forgot' && method === 'GET') {
    return send(res, 200, layout(req, 'Forgot password', '<h1>Forgot password</h1><div class="card"><form method="POST" action="/forgot"><label>Email<input name="email" type="email" required></label><button>Send reset link</button></form></div><div class="card"><h3>Have a token?</h3><form method="POST" action="/reset"><label>Email<input name="email" type="email" required></label><label>Reset token<input name="token" required></label><label>New password<input name="newpassword" type="password" required></label><button>Reset password</button></form></div>'));
  }
  if (pth === '/forgot' && method === 'POST') {
    attempt('Login & Authentication');
    const b = await parseBody(req);
    const email = String(b.email || '').trim().toLowerCase();
    probedEmails.add(email); if (probedEmails.size >= 5) pass('auth-enum');
    const u = users.find(x => x.email === email);
    if (u) { u.resetToken = resetTokenFor(u); return send(res, 200, layout(req, 'Forgot password', '<div class="card"><p>A password reset link has been emailed to ' + esc(email) + '.</p></div>')); }
    return send(res, 200, layout(req, 'Forgot password', '<div class="card"><p>No account exists for that email address.</p></div>'));
  }
  if (pth === '/reset' && method === 'POST') {
    attempt('Login & Authentication');
    const b = await parseBody(req);
    const email = String(b.email || '').trim().toLowerCase();
    const u = users.find(x => x.email === email);
    if (u && String(b.token || '') === resetTokenFor(u) && b.newpassword) {
      u.password = String(b.newpassword);
      pass('auth-reset');
      return send(res, 200, layout(req, 'Reset', '<div class="card"><p>Password updated. <a href="/login">Login</a></p></div>'));
    }
    return send(res, 200, layout(req, 'Reset', '<div class="card"><p>That reset token is not valid.</p></div>'));
  }
  if (pth === '/register' && method === 'POST') {
    attempt('Registration & Profile');
    const b = await parseBody(req);
    const name = String(b.name || 'New User');
    const email = String(b.email || '').trim().toLowerCase();
    const pw = String(b.password || '');
    if (!email || users.some(x => x.email === email)) return send(res, 200, registerPage(req, 'That email is already registered or invalid.'));
    let role = 'fan';
    if (b.role && ['fan', 'creator', 'admin'].includes(String(b.role))) role = String(b.role);
    let balance = 20;
    if (b.balance !== undefined && !isNaN(Number(b.balance))) balance = Number(b.balance);
    const nu = { id: nextUserId++, email, password: pw, name, role, balance, earnings: 0 };
    users.push(nu);
    if (pw.length <= 3) pass('reg-weakpass');
    if ((b.role && role !== 'fan') || b.balance !== undefined) pass('reg-massassign');
    if (XSS_RE.test(name)) pass('reg-storedxss');
    startSession(res, nu);
    return redirect(res, '/my');
  }

  /* ---- everything below needs a session ---- */
  const u = currentUser(req);
  if (!u) {
    if (pth.startsWith('/api/')) return handleApi(req, res, url, null, cookies);
    if (pth !== '/complete' && pth !== '/complete/name' && pth !== '/certificate') return redirect(res, '/login');
  }

  if (pth === '/creators' && method === 'GET') {
    attempt('Creators & Search');
    const q = url.searchParams.get('q') || '';
    let results;
    if (INJ_RE.test(q)) {
      results = pages.slice();
      if (results.some(pg => !pg.listed)) pass('page-search-sqli');
    } else {
      results = pages.filter(pg => pg.listed && pg.name.toLowerCase().includes(q.toLowerCase()));
    }
    if (XSS_RE.test(q)) pass('page-search-xss');
    return send(res, 200, creatorsPage(req, q, results));
  }
  if ((m = pth.match(/^\/page\/(\d+)\/supporters$/)) && method === 'GET') {
    attempt('Supporters & Community');
    const pg = pages.find(x => x.id === Number(m[1]));
    if (!pg) return send(res, 404, 'not found');
    if (pg.creatorId !== u.id && u.role !== 'admin') pass('supporters-leak');
    const rows = memberships.filter(x => x.pageId === pg.id).map(x => {
      const su = users.find(y => y.id === x.userId);
      return '<tr><td>' + esc(su ? su.name : '?') + '</td><td>' + esc(su ? su.email : '?') + '</td><td>' + esc(x.status) + '</td></tr>';
    }).join('') || '<tr><td colspan="3">No supporters yet.</td></tr>';
    return send(res, 200, layout(req, 'Supporters', '<h1>Supporters of ' + esc(pg.name) + '</h1><div class="card"><table><tr><th>Name</th><th>Email</th><th>Status</th></tr>' + rows + '</table></div>'));
  }
  if ((m = pth.match(/^\/page\/(\d+)$/)) && method === 'GET') {
    const pg = pages.find(x => x.id === Number(m[1]));
    if (!pg) return send(res, 404, 'not found');
    return send(res, 200, pageView(req, pg));
  }
  if ((m = pth.match(/^\/post\/(\d+)$/)) && method === 'GET') {
    attempt('Posts');
    const post = posts.find(x => x.id === Number(m[1]));
    if (!post) return send(res, 404, 'not found');
    if (post.visibility === 'members') {
      const isMember = memberships.some(x => x.userId === u.id && x.pageId === post.pageId && x.status === 'active');
      if (!isMember && post.authorId !== u.id && u.role !== 'admin') pass('post-members-idor');
    }
    return send(res, 200, postView(req, post));
  }
  if (pth === '/post' && method === 'POST') {
    attempt('Posts');
    const b = await parseBody(req);
    const pg = pages.find(x => x.id === Number(b.pageId));
    if (!pg) return send(res, 404, 'no such page');
    if (pg.creatorId !== u.id && u.role !== 'admin') return send(res, 403, 'You can only post to your own page.');
    const np = { id: nextPostId++, pageId: pg.id, authorId: u.id, title: String(b.title || 'Untitled'), body: String(b.body || ''), visibility: b.visibility === 'members' ? 'members' : 'public' };
    posts.push(np);
    if (XSS_RE.test(np.body) || XSS_RE.test(np.title)) pass('post-storedxss');
    return redirect(res, '/post/' + np.id);
  }
  if ((m = pth.match(/^\/post\/(\d+)\/edit$/)) && method === 'POST') {
    attempt('Posts');
    const post = posts.find(x => x.id === Number(m[1]));
    if (!post) return send(res, 404, 'not found');
    const b = await parseBody(req);
    if (post.authorId !== u.id) pass('post-edit-idor');
    if (b.title) post.title = String(b.title);
    if (b.body !== undefined) post.body = String(b.body);
    return redirect(res, '/post/' + post.id);
  }
  if (pth === '/my' && method === 'GET') return send(res, 200, myPage(req, u));
  if (pth === '/profile/update' && method === 'POST') {
    attempt('Registration & Profile');
    const b = await parseBody(req);
    if (!cookies.hx_origin) pass('reg-csrf');
    if (b.name) { u.name = String(b.name); if (XSS_RE.test(u.name)) pass('reg-storedxss'); }
    return redirect(res, '/my');
  }
  if (pth === '/subscribe' && method === 'POST') {
    attempt('Memberships & Payments');
    const b = await parseBody(req);
    const tier = tiers.find(x => x.id === Number(b.tierId));
    if (!tier) return send(res, 404, 'no such tier');
    const months = parseInt(b.months, 10);
    const mths = isNaN(months) ? 1 : months;
    const serverTotal = tier.price * mths;
    let charged = serverTotal;
    if (b.price !== undefined && b.price !== '' && !isNaN(Number(b.price))) charged = Number(b.price) * mths;
    if (mths < 0) { pass('member-negative'); u.balance += -charged; }
    else {
      if (charged < serverTotal) pass('member-price');
      u.balance -= charged;
    }
    const nm = { id: nextMembershipId++, userId: u.id, pageId: tier.pageId, tierId: tier.id, pricePaid: charged, months: mths, status: 'active' };
    memberships.push(nm);
    const owner = users.find(x => x.id === (pages.find(pg => pg.id === tier.pageId) || {}).creatorId);
    if (owner && charged > 0) owner.earnings += charged;
    return redirect(res, '/membership/' + nm.id);
  }
  if ((m = pth.match(/^\/membership\/(\d+)$/)) && method === 'GET') {
    attempt('Memberships & Payments');
    const mm = memberships.find(x => x.id === Number(m[1]));
    if (!mm) return send(res, 404, 'not found');
    if (mm.userId !== u.id && u.role !== 'admin') pass('member-idor');
    const t = tiers.find(x => x.id === mm.tierId); const pg = pages.find(x => x.id === mm.pageId); const owner = users.find(x => x.id === mm.userId);
    return send(res, 200, layout(req, 'Membership', '<h1>Membership #' + mm.id + '</h1><div class="card"><p>Member: ' + esc(owner ? owner.name : '?') + ' (' + esc(owner ? owner.email : '') + ')<br>Page: ' + esc(pg ? pg.name : '') + '<br>Tier: ' + esc(t ? t.name : '') + '<br>Paid: $' + mm.pricePaid + ' · Months: ' + mm.months + ' · Status: ' + esc(mm.status) + '</p><form method="POST" action="/membership/' + mm.id + '/cancel"><button>Cancel membership</button></form></div>'));
  }
  if ((m = pth.match(/^\/membership\/(\d+)\/cancel$/)) && method === 'POST') {
    attempt('Memberships & Payments');
    const mm = memberships.find(x => x.id === Number(m[1]));
    if (!mm) return send(res, 404, 'not found');
    if (mm.userId !== u.id && u.role !== 'admin') pass('member-cancel-idor');
    mm.status = 'cancelled';
    return redirect(res, '/my');
  }
  if (pth === '/studio' && method === 'GET') {
    const roleCookie = cookies.hx_role;
    if (roleCookie === 'creator' || roleCookie === 'admin') {
      if (u.role === 'fan') pass('auth-cookie');
      return send(res, 200, studioPage(req, u));
    }
    return send(res, 403, layout(req, 'Studio', '<h1>Creator Studio</h1><div class="card"><p>Creator access only.</p></div>'));
  }
  if ((m = pth.match(/^\/earnings\/(\d+)$/)) && method === 'GET') {
    attempt('Earnings & Payouts');
    const target = users.find(x => x.id === Number(m[1]));
    if (!target) return send(res, 404, 'not found');
    if (target.id !== u.id && u.role !== 'admin') pass('earn-idor');
    return send(res, 200, earningsPage(req, target));
  }
  if (pth === '/payout' && method === 'POST') {
    attempt('Earnings & Payouts');
    const b = await parseBody(req);
    const amount = Number(b.amount);
    if (!cookies.hx_origin) pass('payout-csrf');
    const pendingTotal = payouts.filter(x => x.creatorId === u.id && x.status === 'pending').reduce((s, x) => s + x.amount, 0);
    const availSimple = u.earnings - pendingTotal;
    if (!isNaN(amount) && amount > availSimple) pass('payout-amount');
    if (!isNaN(amount) && amount > 0) payouts.push({ id: nextPayoutId++, creatorId: u.id, amount, status: 'pending', bankRef: 'BANK-XXXX-4242' });
    return redirect(res, '/studio');
  }
  if (pth === '/admin' && method === 'GET') {
    attempt('Admin Panel');
    if (u.role !== 'admin') pass('admin-bac');
    return send(res, 200, adminPage(req));
  }
  if (pth === '/tests' && method === 'GET') return send(res, 200, testsPage(req));
  if (pth === '/complete' && method === 'GET') return send(res, 200, completePage(req));
  if (pth === '/complete/name' && method === 'POST') {
    const b = await parseBody(req);
    if (b.testerName) { state.testerName = String(b.testerName).slice(0, 80); saveState(); }
    return redirect(res, '/complete');
  }
  if (pth === '/certificate' && method === 'GET') {
    if (!progress().complete) return redirect(res, '/complete');
    return send(res, 200, certificatePage(req));
  }
  if (pth.startsWith('/api/')) return handleApi(req, res, url, u, cookies);
  return send(res, 404, layout(req, 'Not found', '<h1>404</h1><p>That page does not exist.</p>'));
}

function handleApi(req, res, url, u, cookies) {
  const pth = url.pathname;
  if (pth === '/api/debug' && req.method === 'GET') {
    attempt('Platform & API');
    pass('api-debug');
    return send(res, 200, JSON.stringify({ users: users.map(x => ({ id: x.id, email: x.email, password: x.password, role: x.role, balance: x.balance, earnings: x.earnings })) }), 'application/json');
  }
  if (pth === '/api/my-memberships' && req.method === 'GET') {
    attempt('Platform & API');
    const token = req.headers['x-api-token'] || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    let target = null;
    if (token) {
      try { const email = Buffer.from(String(token), 'base64').toString('utf8'); target = users.find(x => x.email === email) || null; } catch (e) { target = null; }
    }
    if (target) {
      pass('api-token');
      return send(res, 200, JSON.stringify({ user: target.email, memberships: memberships.filter(x => x.userId === target.id) }), 'application/json');
    }
    if (u) return send(res, 200, JSON.stringify({ user: u.email, memberships: memberships.filter(x => x.userId === u.id) }), 'application/json');
    return send(res, 401, JSON.stringify({ error: 'unauthorized' }), 'application/json');
  }
  return send(res, 404, JSON.stringify({ error: 'not found' }), 'application/json');
}

/* ---------------------------- doc generator ------------------------ */
function genDocs() {
  const byFeature = f => TESTS.filter(t => t.feature === f);
  let v = '# HexaCreator — Vulnerability Map (LAB ' + LAB_NUMBER + ')\n\nThe complete map of the ' + TESTS.length + ' scored tests, grouped by feature. Every flaw below is a real, working vulnerability in this local practice app.\n';
  for (const f of FEATURES) {
    v += '\n## ' + f + '\n';
    for (const t of byFeature(f)) v += '\n### ' + t.name + '\n- **OWASP:** ' + t.owasp + '\n- **Difficulty:** ' + t.difficulty + '\n- **Location:** ' + t.where + '\n- **Exploitation outline:** ' + t.exploit + '\n- **Impact:** ' + t.impact + '\n';
  }
  fs.writeFileSync(path.join(__dirname, 'VULNERABILITIES.md'), v);

  let g = '# HexaCreator — Practice Guide (LAB ' + LAB_NUMBER + ')\n\nChallenges grouped by feature, then difficulty. Solve them in the app; the Mission Board (/tests) mirrors this guide. A test completes only when the exploit really works — never by declaration.\n';
  const order = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  for (const f of FEATURES) {
    g += '\n## ' + f + '\n';
    for (const t of byFeature(f).sort((a, b) => order[a.difficulty] - order[b.difficulty])) {
      g += '\n### ' + t.name + ' (' + t.difficulty + ')\n- **Objective:** ' + t.objective + '\n- **Hints:**\n  1. ' + t.hints[0] + '\n  2. ' + t.hints[1] + '\n  3. ' + t.hints[2] + '\n';
    }
  }
  fs.writeFileSync(path.join(__dirname, 'PRACTICE-GUIDE.md'), g);

  let fx = '# HexaCreator — Fix & Retest (LAB ' + LAB_NUMBER + ')\n\nFor every scored test: the professional report entry, the secure implementation, and the regression test that proves the fix.\n';
  for (const f of FEATURES) {
    fx += '\n## ' + f + '\n';
    for (const t of byFeature(f)) {
      fx += '\n### ' + t.report.title + '\n- **Severity:** ' + t.report.severity + '\n- **Secure implementation:** ' + t.report.remediation + '\n- **Regression test:** Repeat the original exploit (' + t.exploit + ') and confirm it now fails safely, while the legitimate flow still works for authorised users.\n';
    }
  }
  fs.writeFileSync(path.join(__dirname, 'FIX-AND-RETEST.md'), fx);
  console.log('docs generated: VULNERABILITIES.md, PRACTICE-GUIDE.md, FIX-AND-RETEST.md (' + TESTS.length + ' tests)');
}

if (process.argv.includes('--gen-docs')) { genDocs(); process.exit(0); }

const server = http.createServer((req, res) => {
  route(req, res).catch(() => { try { send(res, 500, '<h1>Server error</h1><p>Something went wrong, but the lab is still running.</p>'); } catch (e) { /* ignore */ } });
});
server.listen(PORT, '127.0.0.1', () => console.log('LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ' listening on http://127.0.0.1:' + PORT));
