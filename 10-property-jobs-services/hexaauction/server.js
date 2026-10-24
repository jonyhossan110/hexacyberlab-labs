'use strict';
/* HexaAuction — LAB 99 — HexaCyberLab vulnerable practice lab.
   Online auction platform with intentionally vulnerable workflows.
   LOCAL-ONLY training software. Zero dependencies. Binds 127.0.0.1:3108. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB_NUMBER = 99;
const LAB_NAME = 'HexaAuction';
const PORT = 3108;
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');

/* ---- scattered key material, region A (assembled only at reveal/verify time) ---- */
const _ka = ['TC1YSA==', 'QS05OQ==', 'T0o4RQ=='];
const _kc = ['MUwtWEg=', 'My0wMA==', 'QUNRNQ=='];
function _asm(parts) {
  return parts.map(s => [...Buffer.from(s, 'base64').toString('utf8')].reverse().join('')).join('');
}

/* ================= TESTS registry ================= */
const TESTS = [
  // ---- Login & Authentication ----
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login form builds its query by gluing your input straight into a string.', "Try closing the email string early and commenting out the rest of the query.", "Email: admin@hexaauction.local' --  with any password logs you in as admin."],
    lesson: 'String-built SQL queries let an attacker rewrite the login logic itself and walk in as any account, including admin.',
    impact: 'On a real client site this means full account takeover with no password at all — the attacker becomes an admin in one request.',
    loc: 'POST /login', how: "Submit an email containing a quote + comment sequence so the password clause is commented out of the string-built query.",
    fix: 'Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Parameterise all queries and add regression tests with injection payloads.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limit or Lockout', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Nothing slows you down when a password guess fails.', 'Script 10 or more wrong passwords for one account and watch what does NOT happen.', 'After 10 failed logins for the same account the app still happily accepts more guesses.'],
    lesson: 'Without throttling or lockout, password guessing is free — weak passwords fall to automated guessing.',
    impact: 'Attackers can grind through password lists against real customer accounts until one opens, then drain balances or abuse the account.',
    loc: 'POST /login', how: 'Submit 10+ failed logins for one account; the 10th failure is still processed with no challenge or lock.',
    fix: 'Add per-account and per-IP rate limits, exponential backoff and optional MFA.',
    report: { title: 'No Brute-Force Protection on Login', severity: 'High', remediation: 'Rate-limit login attempts and lock or challenge after repeated failures.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User Enumeration via Response Differences', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the forgot-password answer for a real email vs an invented one.', 'The two answers are worded differently — that difference is the leak.', 'Probe 5 different emails on /forgot; real accounts get a distinct "reset sent" message.'],
    lesson: 'Different responses for existing vs non-existing accounts hand attackers a verified target list for phishing and password attacks.',
    impact: 'An attacker can confirm which of a client\u2019s customers have accounts, then focus credential stuffing and phishing exactly on them.',
    loc: 'POST /forgot', how: 'Submit 5 distinct emails; existing accounts return a different message than unknown ones.',
    fix: 'Return one generic response for all account-recovery and login failures.',
    report: { title: 'Account Enumeration via Forgot-Password Responses', severity: 'Medium', remediation: 'Use identical generic responses regardless of account existence.' } },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Demo Credentials Published on the Login Page', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Read the login page carefully — it is more helpful than it should be.', 'A demo admin account is printed right on the page.', 'Log in with the demo admin credentials shown in the box on /login.'],
    lesson: 'Demo/default credentials left on a production login page are an open door — no skill required, just reading.',
    impact: 'Anyone on the internet can sign in as admin with credentials the site itself publishes; for a client this is instant, total compromise.',
    loc: 'GET /login (demo box), POST /login', how: 'Use the demo admin credentials printed on the login page to sign in.',
    fix: 'Remove demo accounts and credential hints from production; seed data must never ship live credentials.',
    report: { title: 'Working Demo Admin Credentials Disclosed on Login Page', severity: 'Critical', remediation: 'Delete demo accounts and never display credentials on authentication pages.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a reset and study the token format — it is not random.', 'The token is built from the user id with simple arithmetic: HA<id>-<id*137+42>.', "Compute Bob's token (id 3) yourself and POST it to /reset without ever requesting one."],
    lesson: 'Reset tokens must be unguessable random values; a token derived from the user id lets anyone reset anyone\u2019s password.',
    impact: 'An attacker resets the password of any customer — or the admin — and owns the account, its bids, payouts and personal data.',
    loc: 'POST /reset', how: 'Derive the token from the target user id with the published formula and submit it without a reset request.',
    fix: 'Generate reset tokens with a CSPRNG, store only hashes, expire them quickly and bind them to a single use.',
    report: { title: 'Predictable Password Reset Token Allows Account Takeover', severity: 'High', remediation: 'Use cryptographically random, single-use, expiring reset tokens.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Role Cookie Tampering into the Seller Console', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After login, look at the cookies the app sets — one of them carries your role.', 'The seller console trusts that cookie instead of the server-side session.', 'Log in as a plain bidder, change hx_role to seller, then open /seller.'],
    lesson: 'Authorisation data kept on the client can be edited by the client; roles must be checked server-side from the session.',
    impact: 'Any bidder can promote themselves to seller (or beyond), list fake auctions and manipulate listings — direct fraud against the client\u2019s users.',
    loc: 'GET /seller', how: 'Forge the hx_role cookie to a privileged role and load the gated console.',
    fix: 'Derive roles from the server-side session on every request; never trust role cookies.',
    report: { title: 'Privilege Escalation via Client-Side Role Cookie', severity: 'High', remediation: 'Enforce authorisation server-side from session data on every route.' } },

  // ---- Registration & Profile ----
  { id: 'reg-weakpw', feature: 'Registration & Profile', name: 'Weak Password Policy (1 Character Accepted)', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Try registering with the shortest password the form will take.', 'There is no minimum length or complexity check at all.', 'Register with the password "x" — the account is created.'],
    lesson: 'A password policy that accepts anything guarantees some users pick guessable passwords.',
    impact: 'Client customers end up with trivially guessed passwords, feeding account-takeover and refund fraud.',
    loc: 'POST /register', how: 'Create an account with a 1-character password.',
    fix: 'Enforce a sane minimum length and screen against known-breached passwords.',
    report: { title: 'No Minimum Password Strength on Registration', severity: 'Medium', remediation: 'Enforce minimum length/complexity and breached-password screening.' } },
  { id: 'reg-massassign', feature: 'Registration & Profile', name: 'Mass Assignment — Role & Balance via Registration', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The register handler copies every submitted field onto the new user record.', 'Add fields the form never shows you — like role and balance.', 'Register with extra fields role=admin and balance=9999 and check your profile.'],
    lesson: 'Binding request bodies directly to data models lets attackers set fields that were never offered, including role and balance.',
    impact: 'Attackers mint themselves admin accounts with fat balances — for a client this is privilege escalation plus direct financial fraud.',
    loc: 'POST /register', how: 'Submit extra role/balance fields at registration; they are stored on the account.',
    fix: 'Whitelist bindable fields per endpoint; set role and balance server-side only.',
    report: { title: 'Mass Assignment in Registration Allows Admin Role and Balance Forgery', severity: 'Critical', remediation: 'Bind only an explicit allow-list of fields; never accept role/balance from clients.' } },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is printed back on pages without escaping.', 'Put an HTML payload in it instead of a name.', 'Register with display name <script>alert(1)</script> and view any page that lists members.'],
    lesson: 'User-controlled text stored and rendered unescaped executes in other users\u2019 browsers — including staff browsers.',
    impact: 'Attackers can steal sessions or act as any viewer; one poisoned profile can compromise the client\u2019s admin team.',
    loc: 'POST /register (name field), rendered site-wide', how: 'Store a script payload as the display name; it is served unescaped to other users.',
    fix: 'Escape all user content on output and add a Content-Security-Policy.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-aware output encoding for all user-supplied fields.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Legit forms carry a hidden hx_origin marker field. The profile endpoint never checks it.', 'A POST without the marker still changes the profile.', 'POST to /profile with a new name and no hx_origin field — it succeeds.'],
    lesson: 'State-changing endpoints without anti-CSRF tokens can be triggered by any website the victim visits while logged in.',
    impact: 'Attackers can silently rewrite a customer\u2019s profile details, paving the way for social-engineering and account-recovery attacks against the client.',
    loc: 'POST /profile', how: 'Submit a profile change with no hx_origin marker; it is accepted.',
    fix: 'Require and verify anti-CSRF tokens on every state-changing request.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Issue per-session CSRF tokens and verify them on all POST handlers.' } },

  // ---- Search & Listings ----
  { id: 'search-sqli', feature: 'Search & Listings', name: 'SQL Injection in Search Leaks Draft Listings', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Search glues your term into a query the same way login does.', 'A classic OR-tautology makes the filter match everything — including drafts.', "Search for ' OR '1'='1 and look for the unpublished draft lot."],
    lesson: 'Injection in search bypasses every filter the query was supposed to enforce, exposing data that was never meant to be public.',
    impact: 'Unpublished products, embargoed listings and their reserve details leak before launch — a client loses control of its own catalogue.',
    loc: 'GET /search', how: "Inject an OR-tautology into the search term; draft listings are returned.",
    fix: 'Parameterise search queries and enforce visibility filters server-side.',
    report: { title: 'SQL Injection in Search Exposes Unpublished Listings', severity: 'High', remediation: 'Use prepared statements and server-side visibility checks.' } },
  { id: 'search-xss', feature: 'Search & Listings', name: 'Reflected XSS in Search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The results page repeats your search term back to you — raw.', 'Search for an HTML payload and view the page source.', 'Search for <script>alert(1)</script>; it lands unescaped in the results heading.'],
    lesson: 'Reflecting input without encoding turns a harmless search box into a script-delivery channel via crafted links.',
    impact: 'Attackers send victims links that run script in the client\u2019s domain, stealing sessions and trust.',
    loc: 'GET /search', how: 'Put a script payload in the search term; it is reflected unescaped in the response.',
    fix: 'Encode reflected values and validate input types.',
    report: { title: 'Reflected Cross-Site Scripting in Search Results', severity: 'Medium', remediation: 'HTML-encode all reflected user input.' } },

  // ---- Bidding ----
  { id: 'bid-lowball', feature: 'Bidding', name: 'Bid Below the Current Price Accepted as Winning', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['The bid endpoint never compares your amount with the current highest bid.', 'Bid far below the current price on a live auction.', 'Bid $1 on the Vintage Camera (current bid $150) — it becomes the winning bid.'],
    lesson: 'Core auction invariants (a bid must beat the current price) must be enforced server-side, not assumed from the UI.',
    impact: 'Attackers win client auctions for $1, destroying seller revenue and platform trust in a single request.',
    loc: 'POST /auction/:id/bid', how: 'Place a bid lower than the current highest bid; it is accepted and becomes winning.',
    fix: 'Validate bid > current price + minimum increment on the server, inside a transaction.',
    report: { title: 'Auction Accepts Bids Below Current Price', severity: 'High', remediation: 'Server-side bid validation against current price and increment rules.' } },
  { id: 'bid-negative', feature: 'Bidding', name: 'Negative Bid Amount Accepted', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['Amounts are never checked for being positive, either.', 'What happens if a bid amount is below zero?', 'Bid -50 on a live auction — the negative bid is recorded.'],
    lesson: 'Numeric inputs need range validation; negative money values corrupt balances, fees and settlement math.',
    impact: 'Negative bids can manipulate fees and payouts, effectively making the platform pay the attacker.',
    loc: 'POST /auction/:id/bid', how: 'Submit a negative bid amount; it is stored as a bid.',
    fix: 'Reject non-positive and non-numeric amounts server-side.',
    report: { title: 'Negative Bid Amounts Accepted', severity: 'Medium', remediation: 'Validate all monetary inputs as positive numbers within sane ranges.' } },
  { id: 'bid-afterclose', feature: 'Bidding', name: 'Bidding on an Ended Auction', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The ended auction page still has a working bid path underneath.', 'The endpoint never checks the auction status.', 'POST a bid to the Antique Vase auction, which already ended — it is accepted.'],
    lesson: 'Lifecycle state (open/ended) is an authorisation rule; endpoints must verify it on every action.',
    impact: 'Attackers snipe finished auctions, overturn legitimate winners and create settlement disputes for the client.',
    loc: 'POST /auction/:id/bid (ended auction)', how: 'Place a bid on an auction whose status is ended; it is accepted.',
    fix: 'Check auction status and end time server-side before accepting any bid.',
    report: { title: 'Bids Accepted on Closed Auctions', severity: 'High', remediation: 'Enforce auction lifecycle checks in the bid handler.' } },
  { id: 'bid-reserve', feature: 'Bidding', name: 'Reserve Price Disclosed to Bidders', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The reserve is secret — but view the auction page source as a bidder.', 'The server ships the reserve value to every visitor in a hidden field.', 'Open the Vintage Camera page as Bob and find the reserve in the HTML.'],
    lesson: 'Data rendered into a page is public, even in hidden fields; secrets must never leave the server.',
    impact: 'Bidders learn the exact minimum a seller will accept and bid precisely that — sellers lose the entire point of a reserve.',
    loc: 'GET /auction/:id', how: 'Load an auction as a non-seller; the secret reserve price is present in the response.',
    fix: 'Never send reserve prices to clients; only reveal whether the reserve was met.',
    report: { title: 'Secret Reserve Price Exposed in Auction Page', severity: 'Medium', remediation: 'Remove reserve values from all client-facing responses.' } },

  // ---- Seller & Listings ----
  { id: 'seller-edit-other', feature: 'Seller & Listings', name: "Editing Another Seller's Listing (IDOR)", owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The edit endpoint asks for a listing id but never asks who owns it.', 'A bidder account can POST edits to a listing it does not own.', "As Bob, POST a new title to /auction/1/edit — Alice's listing changes."],
    lesson: 'Object-level authorisation must be checked on every object access, not just on listing pages.',
    impact: 'Competitors or vandals can rewrite a client\u2019s listings — prices, descriptions, images — causing direct revenue loss and chaos.',
    loc: 'POST /auction/:id/edit', how: "Change another user's listing; the change is saved.",
    fix: 'Verify ownership (or an admin role) server-side before any object mutation.',
    report: { title: 'Broken Object-Level Authorisation on Listing Edit', severity: 'High', remediation: 'Ownership checks on every object read/write.' } },
  { id: 'seller-edit-live', feature: 'Seller & Listings', name: 'Seller Edits a Live Auction After Bids Are Placed', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['Nothing freezes a listing once bidding starts.', 'The seller can still rewrite the terms mid-auction.', 'As Alice, edit the live Vintage Camera (it already has bids) — the change goes through.'],
    lesson: 'Once third parties rely on an offer (bids placed), its terms must lock; editable live auctions break the market\u2019s fairness.',
    impact: 'A seller can bait bidders with one item and swap the description after bids — textbook fraud that lands on the client\u2019s platform.',
    loc: 'POST /auction/:id/edit (live, has bids)', how: 'The owner edits a live auction that already has bids; the platform accepts it.',
    fix: 'Lock key fields once an auction has bids, or require cancelling and relisting.',
    report: { title: 'Live Auction Terms Editable After Bids Placed', severity: 'Medium', remediation: 'Freeze listing terms after the first bid.' } },
  { id: 'seller-draft-idor', feature: 'Seller & Listings', name: 'Unpublished Draft Listing Viewable by Direct URL (IDOR)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Drafts are hidden from search — but ids are sequential.', 'Guess the next id after the public listings.', 'Open /auction/4 as Bob: Alice\u2019s unpublished draft loads in full.'],
    lesson: 'Hiding a link is not access control; unpublished objects need the same authorisation as published ones.',
    impact: 'Competitors preview a client\u2019s unreleased products and pricing, and embargoed listings leak early.',
    loc: 'GET /auction/:id (draft)', how: 'Request a draft listing by id as a non-owner; it is served in full.',
    fix: 'Enforce status + ownership checks on object reads.',
    report: { title: 'Draft Listings Accessible by Direct ID', severity: 'Medium', remediation: 'Server-side visibility and ownership checks on every listing view.' } },

  // ---- Payments & Settlement ----
  { id: 'settle-tamper', feature: 'Payments & Settlement', name: 'Settlement Amount Tampering — Won Auction Paid for $1', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['The settle page asks you how much you are paying — and believes you.', 'The amount due lives on the server, but the payment amount comes from your request.', 'Win the Antique Vase at $300, then POST a settlement payment of $1 — it is marked PAID.'],
    lesson: 'Payment amounts must be computed and verified server-side; a client-supplied amount is a suggestion, not a fact.',
    impact: 'Buyers settle real purchases for pennies; the client eats the loss on every single order.',
    loc: 'POST /settle/:id/pay', how: 'Pay less than the winning amount; the settlement is marked fully PAID.',
    fix: 'Compute the amount due server-side and require an exact match with the payment confirmation.',
    report: { title: 'Settlement Accepts Arbitrary Payment Amounts', severity: 'Critical', remediation: 'Server-side amount verification before marking settlements paid.' } },
  { id: 'settle-free', feature: 'Payments & Settlement', name: 'Settlement Completed with a $0 Payment', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['If $1 works, what about nothing at all?', 'A zero payment is accepted the same way.', 'POST a settlement payment of 0 for a won auction — status flips to PAID.'],
    lesson: 'Zero and empty values are still inputs; payment flows must reject them explicitly.',
    impact: 'Attackers obtain goods entirely free while the client\u2019s books show a completed, paid order.',
    loc: 'POST /settle/:id/pay', how: 'Submit amount 0; the settlement is marked PAID.',
    fix: 'Require a positive payment equal to the server-computed amount due.',
    report: { title: 'Zero-Value Settlement Marks Auction as Paid', severity: 'High', remediation: 'Reject zero/negative payments; verify amount due server-side.' } },
  { id: 'settle-idor', feature: 'Payments & Settlement', name: "Another User's Settlement Invoice Exposed (IDOR)", owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Settlement pages are numbered, just like listings.', 'Nothing checks that the invoice belongs to you.', "Open /settle/5 as Bob — Carol's invoice, amount and details load."],
    lesson: 'Financial documents are sensitive objects; every read needs an ownership check.',
    impact: 'Customers\u2019 purchase history, amounts and personal details leak to any other user — a privacy breach and a trust killer for the client.',
    loc: 'GET /settle/:id', how: "View another user's settlement invoice by changing the id.",
    fix: 'Ownership checks on settlement reads; use unguessable references.',
    report: { title: 'Settlement Invoices Accessible by Other Users (IDOR)', severity: 'High', remediation: 'Authorise every settlement read against the session user.' } },

  // ---- Admin Panel ----
  { id: 'admin-bac', feature: 'Admin Panel', name: 'Admin Panel Open to Any Logged-In User', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The admin panel URL is easy to guess — try it as a normal bidder.', 'Logging in is the only check it performs.', 'Sign in as Bob and open /admin — the full user list with passwords renders.'],
    lesson: 'Authentication is not authorisation; admin routes must verify the admin role on the server for every request.',
    impact: 'Any registered user reaches the client\u2019s control panel — user data, passwords and platform controls are all exposed.',
    loc: 'GET /admin', how: 'Load the admin panel with a non-admin account; it renders fully, including passwords.',
    fix: 'Role checks on every admin route, enforced server-side.',
    report: { title: 'Admin Panel Accessible to Non-Admin Users', severity: 'Critical', remediation: 'Server-side role enforcement on all administrative routes.' } },
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'CSRF on Admin End-Auction Action', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    hints: ['Admin actions are plain POSTs. Do they carry the hx_origin marker? They do not check it.', 'A marker-less POST from the admin session still executes.', 'As admin, POST to /admin/end/2 with no hx_origin field — the auction ends.'],
    lesson: 'Admin endpoints are the highest-value CSRF targets; a single malicious page visit can trigger platform-wide damage.',
    impact: 'An attacker who lures the client\u2019s admin to a web page can end auctions, ban users or worse — without ever knowing a password.',
    loc: 'POST /admin/end/:id', how: 'Trigger the admin end-auction action with no hx_origin marker; it executes.',
    fix: 'Anti-CSRF tokens plus SameSite cookies on all admin actions.',
    report: { title: 'Missing CSRF Protection on Administrative Actions', severity: 'High', remediation: 'Verify CSRF tokens on every state-changing admin route.' } },

  // ---- Platform & API ----
  { id: 'api-debug', feature: 'Platform & API', name: 'Unauthenticated Debug Endpoint Dumps All Users', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Developers leave helpers behind. Try the obvious debug path.', 'No login is needed for this one.', 'GET /api/debug returns every account, passwords included.'],
    lesson: 'Debug and diagnostic endpoints must never ship to production; they bypass every other control in one request.',
    impact: 'One URL hands attackers the client\u2019s entire user database — instant mass account takeover and a reportable data breach.',
    loc: 'GET /api/debug', how: 'Fetch the debug endpoint without any session; full user records with passwords are returned.',
    fix: 'Remove debug endpoints from production builds; gate diagnostics behind admin auth and network controls.',
    report: { title: 'Unauthenticated Debug Endpoint Exposes All User Credentials', severity: 'Critical', remediation: 'Remove or strictly protect diagnostic endpoints in production.' } },
  { id: 'api-token', feature: 'Platform & API', name: 'API Token Is Just Base64 of the Email Address', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['The API wants an X-Api-Token header. What could the token be made of?', 'It decodes to something you already know about every user.', 'Send X-Api-Token with base64(alice@hexaauction.local) to /api/me — her data comes back, no session needed.'],
    lesson: 'API credentials must be unguessable secrets; encoding an identifier is not authentication.',
    impact: 'Anyone can impersonate any user through the API — read their bids, watchlists and settlements — with nothing but their email address.',
    loc: 'GET /api/me (X-Api-Token header)', how: 'Present base64(email) as the API token; the API accepts it as that user.',
    fix: 'Issue random, revocable API tokens stored hashed server-side.',
    report: { title: 'Forgeable API Tokens (Base64 of Email)', severity: 'High', remediation: 'Use cryptographically random API tokens with server-side verification.' } }
];
const FEATURES = [...new Set(TESTS.map(t => t.feature))];

/* ================= progress state ================= */
let P = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadProgress() {
  try { const raw = fs.readFileSync(PROGRESS_FILE, 'utf8'); const j = JSON.parse(raw); if (j && typeof j === 'object') P = Object.assign(P, j); } catch (e) { /* fresh */ }
}
function saveProgress() { try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(P, null, 2)); } catch (e) {} }
loadProgress();
function bump(feature) { P.attempts[feature] = (P.attempts[feature] || 0) + 1; saveProgress(); }
function pass(id) {
  if (!P.tests[id]) {
    P.tests[id] = true;
    const done = TESTS.filter(t => P.tests[t.id]).length;
    if (done >= TESTS.length && !P.completedAt) { P.completedAt = new Date().toISOString(); P.keyRevealed = true; }
    saveProgress();
  }
}
function doneCount() { return TESTS.filter(t => P.tests[t.id]).length; }

/* ---- scattered key material, region B ---- */
const _kb = ['LTE4MQ==', 'MUgxSg==', 'UlhJMA=='];
const _kd = ['LVdYQg==', 'M1NDTQ==', 'SU1VSw=='];
function entryKey() { return _asm(_ka.concat(_kb)); }
function completionKey() { return _asm(_kc.concat(_kd)); }

/* ================= seed data (all fake) ================= */
const users = [
  { id: 1, email: 'admin@hexaauction.local', password: 'admin123', name: 'Ada Admin', role: 'admin', balance: 0 },
  { id: 2, email: 'alice@test.local', password: 'alice123', name: 'Alice Seller', role: 'seller', balance: 250 },
  { id: 3, email: 'bob@test.local', password: 'bob123', name: 'Bob Bidder', role: 'bidder', balance: 500 },
  { id: 4, email: 'carol@test.local', password: 'carol123', name: 'Carol Bidder', role: 'bidder', balance: 400 }
];
let nextUserId = 5;
const auctions = [
  { id: 1, sellerId: 2, title: 'Vintage Camera', desc: 'Classic 35mm film camera, fully serviced.', startPrice: 100, currentBid: 150, currentBidder: 3, reserve: 500, status: 'live' },
  { id: 2, sellerId: 2, title: 'Rare Coin', desc: '19th century silver coin, graded.', startPrice: 50, currentBid: 80, currentBidder: 4, reserve: 200, status: 'live' },
  { id: 3, sellerId: 2, title: 'Antique Vase', desc: 'Porcelain vase, auction ended.', startPrice: 120, currentBid: 300, currentBidder: 3, reserve: 250, status: 'ended' },
  { id: 4, sellerId: 2, title: 'Secret Prototype Watch', desc: 'Unreleased prototype — draft listing, not public yet.', startPrice: 900, currentBid: 0, currentBidder: null, reserve: 2000, status: 'draft' },
  { id: 5, sellerId: 2, title: 'Brass Telescope', desc: 'Antique telescope, auction ended.', startPrice: 90, currentBid: 200, currentBidder: 4, reserve: 150, status: 'ended' }
];
const bids = [
  { auctionId: 1, bidderId: 3, amount: 150 }, { auctionId: 2, bidderId: 4, amount: 80 },
  { auctionId: 3, bidderId: 3, amount: 300 }, { auctionId: 5, bidderId: 4, amount: 200 }
];
const settlements = {
  3: { auctionId: 3, winnerId: 3, amount: 300, paid: 0, status: 'UNPAID' },
  5: { auctionId: 5, winnerId: 4, amount: 200, paid: 0, status: 'UNPAID' }
};
const watchlist = { 3: [1, 2], 4: [1] };
const issuedResetTokens = {}; // userId -> token (only ones actually requested)
const failedLogins = {};       // email -> count
const probedEmails = new Set(); // enumeration detection
const sessions = {};           // sid -> userId
function userById(id) { return users.find(u => u.id === id); }
function auctionById(id) { return auctions.find(a => a.id === id); }
function resetTokenFor(id) { return 'HA' + id + '-' + (id * 137 + 42); }

/* ---- tiny evaluator for the string-built "SQL" used by login ---- */
function sqlVal(row, tok) {
  tok = String(tok).trim();
  if (/^'.*'$/.test(tok)) return tok.slice(1, -1);
  const v = row[tok]; return v === undefined ? tok : String(v);
}
function evalWhere(row, where) {
  return where.split(/\s+OR\s+/i).some(part =>
    part.split(/\s+AND\s+/i).every(cond => {
      const m = cond.trim().match(/^(.+?)\s*=\s*(.+)$/);
      if (!m) return false;
      return sqlVal(row, m[1]) === sqlVal(row, m[2]);
    }));
}

/* ================= http helpers ================= */
function parseBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) { try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); } }
      else { const o = {}; new URLSearchParams(data).forEach((v, k) => { o[k] = v; }); resolve(o); }
    });
    req.on('error', () => resolve({}));
  });
}
function cookies(req) {
  const o = {}; const h = req.headers.cookie || '';
  h.split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) o[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return o;
}
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function xssPayload(s) { return /<script|onerror\s*=|onload\s*=|<svg|<img[^>]*on/i.test(String(s || '')); }

function sessionUser(req) {
  const c = cookies(req); const sid = c.hx_session;
  if (sid && sessions[sid]) return userById(sessions[sid]) || null;
  return null;
}
function setSession(res, user) {
  const sid = crypto.randomBytes(12).toString('hex');
  sessions[sid] = user.id;
  res.setHeader('Set-Cookie', [
    'hx_session=' + sid + '; Path=/; HttpOnly',
    'hx_role=' + user.role + '; Path=/',
    'hx_origin=site; Path=/'
  ]);
}
function progressJSON() {
  const feats = {};
  for (const f of FEATURES) {
    feats[f] = {
      total: TESTS.filter(t => t.feature === f).length,
      done: TESTS.filter(t => t.feature === f && P.tests[t.id]).length,
      attempts: P.attempts[f] || 0
    };
  }
  const done = doneCount();
  return { lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done, pct: Math.floor(done / TESTS.length * 100), features: feats, complete: done >= TESTS.length };
}
function header(title, user) {
  const d = doneCount(), pct = Math.floor(d / TESTS.length * 100);
  return '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(title) + ' — HexaAuction</title>' +
    '<style>body{font-family:system-ui,Arial,sans-serif;margin:0;background:#f6f4ef;color:#222}header{background:#232946;color:#fff;padding:10px 18px;display:flex;gap:14px;align-items:center}header img{height:34px}header a{color:#eebbc3;text-decoration:none;margin-right:10px}main{max-width:920px;margin:22px auto;padding:0 16px} .card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:16px;margin:12px 0} .bar{background:#ddd;border-radius:6px;height:14px;overflow:hidden;min-width:170px}.bar>i{display:block;background:#7c5cd6;height:100%}input,select,textarea{padding:7px;margin:4px 0;width:100%;box-sizing:border-box}button{background:#232946;color:#fff;border:0;padding:9px 16px;border-radius:6px;cursor:pointer}.tag{background:#eef;border-radius:4px;padding:1px 7px;font-size:12px}.open{color:#b00}.done{color:#087f23}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #eee;padding:6px;text-align:left}</style></head><body>' +
    '<header><img src="/logo.png" alt="HexaCyberLab"><div><strong>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</strong><br><span style="font-size:12px">HexaCyberLab vulnerable practice lab — local use only</span></div>' +
    '<div style="margin-left:auto;text-align:right"><div style="font-size:12px">LAB ' + LAB_NUMBER + ' · ' + d + '/' + TESTS.length + ' tests · ' + pct + '%</div><div class="bar"><i style="width:' + pct + '%"></i></div></div></header>' +
    '<header style="background:#3a4066;padding:6px 18px"><nav>' +
    (user ? '<a href="/">Auctions</a><a href="/search">Search</a><a href="/watchlist">Watchlist</a><a href="/seller">Seller Console</a><a href="/admin">Admin</a>' : '') +
    '<a href="/tests">Mission Board</a><a href="/complete">Completion</a>' +
    (user ? '<span style="color:#fff;margin-left:12px">Signed in as ' + user.name + ' (' + esc(user.role) + ') · balance $' + user.balance + '</span> <a href="/logout">Logout</a>' : '<a href="/login">Login</a>') +
    '</nav></header><main>';
}
function footer() {
  return '</main>' + chatWidget() + '</body></html>';
}
function chatWidget() {
  return '<div id="coach" style="position:fixed;right:14px;bottom:14px;width:320px;background:#fff;border:1px solid #bbb;border-radius:10px;box-shadow:0 4px 18px rgba(0,0,0,.2);font-size:13px">' +
    '<div style="background:#232946;color:#fff;padding:8px 12px;border-radius:10px 10px 0 0"><strong>Lab Coach</strong> — HexaAuction</div>' +
    '<div id="coachlog" style="height:170px;overflow:auto;padding:8px 12px"></div>' +
    '<div style="display:flex;border-top:1px solid #eee"><input id="coachin" placeholder="Ask the coach…" style="flex:1;border:0;padding:8px"><button onclick="coachSend()">Send</button></div></div>' +
    '<script>function coachSend(){var i=document.getElementById("coachin");var m=i.value.trim();if(!m)return;i.value="";var log=document.getElementById("coachlog");log.innerHTML+="<div><b>You:</b> "+m.replace(/</g,"&lt;")+"</div>";fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:m})}).then(r=>r.json()).then(j=>{log.innerHTML+="<div style=\\"margin:6px 0\\"><b>Coach:</b> "+String(j.reply).replace(/</g,"&lt;")+"</div>";log.scrollTop=1e6;});}' +
    'document.getElementById("coachin").addEventListener("keydown",function(e){if(e.key==="Enter")coachSend();});</script>';
}
function gatePage(msg) {
  return '<!doctype html><html><head><meta charset="utf-8"><title>Locked — LAB ' + LAB_NUMBER + '</title></head><body style="font-family:system-ui;max-width:520px;margin:60px auto;padding:0 16px">' +
    '<img src="/logo.png" style="height:54px"><h1>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h1>' +
    '<p>This lab is locked. Paste the completion key from Lab ' + (LAB_NUMBER - 1) + ' to start.</p>' +
    (msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/unlock"><input name="key" placeholder="Completion key from Lab ' + (LAB_NUMBER - 1) + '" style="width:100%;padding:9px;box-sizing:border-box"><br><br><button style="padding:9px 18px">Unlock</button></form>' +
    chatWidget() + '</body></html>';
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }

/* ================= pages & flows ================= */
function homePage(req, res) {
  const user = sessionUser(req);
  const rows = auctions.filter(a => a.status !== 'draft').map(a => {
    const s = userById(a.sellerId);
    return '<div class="card"><h3><a href="/auction/' + a.id + '">' + esc(a.title) + '</a> <span class="tag">' + a.status + '</span></h3><p>' + esc(a.desc) + '</p><p>Current bid: <b>$' + a.currentBid + '</b> · Seller: ' + esc(s ? s.name : '?') + '</p></div>';
  }).join('');
  send(res, 200, header('Auctions', user) + '<h2>Live &amp; recent auctions</h2>' + rows + footer());
}
function loginPage(req, res, msg) {
  send(res, 200, header('Login', null) + '<div class="card"><h2>Login</h2>' +
    (msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/login"><input name="email" placeholder="Email"><input name="password" type="password" placeholder="Password"><button>Login</button></form>' +
    '<p><a href="/forgot">Forgot password?</a> · <a href="/register">Create account</a></p>' +
    '<div class="card" style="background:#fffbe6"><b>Demo access (for reviewers):</b><br>Admin demo account — email: admin@hexaauction.local · password: admin123</div></div>' + footer());
}
async function doLogin(req, res) {
  const b = await parseBody(req);
  bump('Login & Authentication');
  const email = String(b.email || ''), password = String(b.password || '');
  const query = "email = '" + email + "' AND password = '" + password + "'";
  const clean = query.split('--')[0];
  const user = users.find(u => evalWhere(u, clean));
  if (!user) {
    failedLogins[email] = (failedLogins[email] || 0) + 1;
    if (failedLogins[email] >= 10) pass('auth-brute');
    return loginPage(req, res, 'Invalid email or password.');
  }
  if (user.password !== password) pass('auth-sqli'); // session created without the real password
  if (email === 'admin@hexaauction.local' && password === 'admin123') pass('auth-default');
  setSession(res, user);
  redirect(res, '/');
}
function registerPage(req, res, msg) {
  send(res, 200, header('Register', null) + '<div class="card"><h2>Create account</h2>' +
    (msg ? '<p>' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/register"><input name="name" placeholder="Display name"><input name="email" placeholder="Email"><input name="password" type="password" placeholder="Password"><button>Register</button></form></div>' + footer());
}
async function doRegister(req, res) {
  const b = await parseBody(req);
  bump('Registration & Profile');
  const email = String(b.email || '');
  if (!email || users.some(u => u.email === email)) return registerPage(req, res, 'Email missing or already registered.');
  const u = { id: nextUserId++, email, password: String(b.password || ''), name: String(b.name || 'New User'), role: 'bidder', balance: 100 };
  // FLAW: mass assignment — every extra field is copied onto the record
  for (const k of Object.keys(b)) if (!(k in u)) u[k] = b[k];
  if (b.role) u.role = String(b.role);
  if (b.balance !== undefined) u.balance = Number(b.balance);
  users.push(u);
  if (String(b.password || '').length <= 1) pass('reg-weakpw');
  if ((b.role && String(b.role) !== 'bidder') || (b.balance !== undefined && Number(b.balance) !== 100)) pass('reg-massassign');
  if (xssPayload(b.name)) pass('reg-xss');
  setSession(res, u);
  redirect(res, '/');
}
async function doForgot(req, res) {
  const b = await parseBody(req);
  bump('Login & Authentication');
  const email = String(b.email || '');
  probedEmails.add(email);
  if (probedEmails.size >= 5) pass('auth-enum');
  const u = users.find(x => x.email === email);
  if (u) {
    issuedResetTokens[u.id] = resetTokenFor(u.id);
    send(res, 200, header('Forgot', null) + '<div class="card"><h2>Check your inbox</h2><p>A password reset link was sent to ' + esc(email) + '.</p></div>' + footer());
  } else {
    send(res, 200, header('Forgot', null) + '<div class="card"><h2>No account found</h2><p>There is no account registered for ' + esc(email) + '.</p></div>' + footer());
  }
}
async function doReset(req, res) {
  const b = await parseBody(req);
  bump('Login & Authentication');
  const token = String(b.token || ''), np = String(b.newpassword || '');
  const u = users.find(x => resetTokenFor(x.id) === token);
  if (!u || !np) { send(res, 400, header('Reset', null) + '<div class="card"><p>Invalid reset token.</p></div>' + footer()); return; }
  if (issuedResetTokens[u.id] !== token) pass('auth-reset'); // formula token accepted without ever being issued
  u.password = np; delete issuedResetTokens[u.id];
  send(res, 200, header('Reset', null) + '<div class="card"><p>Password updated for ' + esc(u.email) + '. <a href="/login">Login</a></p></div>' + footer());
}
function profilePage(req, res) {
  const user = sessionUser(req); if (!user) return redirect(res, '/login');
  send(res, 200, header('Profile', user) + '<div class="card"><h2>Your profile</h2><p>Name: ' + user.name + '<br>Email: ' + esc(user.email) + '<br>Role: ' + esc(user.role) + '<br>Balance: $' + user.balance + '</p>' +
    '<form method="POST" action="/profile"><input type="hidden" name="hx_origin" value="site"><input name="name" value="' + esc(user.name) + '"><button>Save profile</button></form></div>' + footer());
}
async function doProfile(req, res) {
  const user = sessionUser(req); if (!user) return redirect(res, '/login');
  const b = await parseBody(req);
  bump('Registration & Profile');
  if (b.hx_origin !== 'site') pass('reg-csrf'); // FLAW: action proceeds anyway
  if (b.name) user.name = String(b.name);
  redirect(res, '/profile');
}
function searchPage(req, res, q) {
  const user = sessionUser(req);
  bump('Search & Listings');
  let results, injected = false;
  if (/('|%27)\s*(or|and)\s+/i.test(q) || q.includes("' or") || q.includes("' OR")) {
    injected = true; results = auctions.slice(); // injection returns everything, drafts included
  } else {
    results = auctions.filter(a => a.status !== 'draft' && a.title.toLowerCase().includes(q.toLowerCase()));
  }
  if (injected && results.some(a => a.status === 'draft')) pass('search-sqli');
  if (xssPayload(q)) pass('search-xss');
  const rows = results.map(a => '<div class="card"><h3><a href="/auction/' + a.id + '">' + esc(a.title) + '</a> <span class="tag">' + a.status + '</span></h3><p>Current bid: $' + a.currentBid + '</p></div>').join('') || '<p>No results.</p>';
  // FLAW: q reflected unescaped
  send(res, 200, header('Search', user) + '<h2>Results for: ' + q + '</h2><form method="GET" action="/search"><input name="q" value="' + esc(q) + '"><button>Search</button></form>' + rows + footer());
}
function auctionPage(req, res, id) {
  const user = sessionUser(req); if (!user) return redirect(res, '/login');
  const a = auctionById(id); if (!a) { send(res, 404, 'Not found'); return; }
  bump('Seller & Listings');
  if (a.status === 'draft' && a.sellerId !== user.id) pass('seller-draft-idor'); // FLAW: draft served to anyone
  if (a.sellerId !== user.id) pass('bid-reserve'); // FLAW: reserve shipped to non-sellers below
  const seller = userById(a.sellerId);
  const bidRows = bids.filter(x => x.auctionId === a.id).map(x => '<tr><td>' + esc((userById(x.bidderId) || {}).name || '?') + '</td><td>$' + x.amount + '</td></tr>').join('');
  send(res, 200, header(a.title, user) +
    '<div class="card"><h2>' + esc(a.title) + ' <span class="tag">' + a.status + '</span></h2><p>' + esc(a.desc) + '</p>' +
    '<input type="hidden" id="reserve" value="' + a.reserve + '">' +
    '<p>Seller: ' + esc(seller ? seller.name : '?') + ' · Start: $' + a.startPrice + ' · Current bid: <b>$' + a.currentBid + '</b></p>' +
    '<form method="POST" action="/auction/' + a.id + '/bid"><input name="amount" type="number" placeholder="Your bid"><button>Place bid</button></form>' +
    '<form method="POST" action="/watch/' + a.id + '"><button>Add to watchlist</button></form></div>' +
    '<div class="card"><h3>Bid history</h3><table>' + bidRows + '</table></div>' +
    (user.id === a.sellerId || true ? '<div class="card"><h3>Edit listing</h3><form method="POST" action="/auction/' + a.id + '/edit"><input type="hidden" name="hx_origin" value="site"><input name="title" value="' + esc(a.title) + '"><input name="startPrice" type="number" value="' + a.startPrice + '"><button>Save changes</button></form></div>' : '') +
    footer());
}
async function doBid(req, res, id) {
  const user = sessionUser(req); if (!user) return redirect(res, '/login');
  const a = auctionById(id); if (!a) { send(res, 404, 'Not found'); return; }
  const b = await parseBody(req);
  bump('Bidding');
  const amount = Number(b.amount);
  if (Number.isNaN(amount)) { send(res, 400, 'Bad amount'); return; }
  // FLAWS: no status check, no minimum/increment check, no positivity check
  if (a.status === 'ended') pass('bid-afterclose');
  if (amount < 0) pass('bid-negative');
  if (a.status === 'live' && amount < a.currentBid) pass('bid-lowball');
  bids.push({ auctionId: a.id, bidderId: user.id, amount });
  a.currentBid = amount; a.currentBidder = user.id;
  redirect(res, '/auction/' + a.id);
}
async function doEditAuction(req, res, id) {
  const user = sessionUser(req); if (!user) return redirect(res, '/login');
  const a = auctionById(id); if (!a) { send(res, 404, 'Not found'); return; }
  const b = await parseBody(req);
  bump('Seller & Listings');
  const hadBids = bids.some(x => x.auctionId === a.id);
  if (a.sellerId !== user.id) pass('seller-edit-other'); // FLAW: no ownership check
  else if (a.status === 'live' && hadBids) pass('seller-edit-live'); // FLAW: terms change mid-auction
  if (b.title) a.title = String(b.title);
  if (b.startPrice !== undefined && !Number.isNaN(Number(b.startPrice))) a.startPrice = Number(b.startPrice);
  redirect(res, '/auction/' + a.id);
}
function sellerPage(req, res) {
  const user = sessionUser(req); if (!user) return redirect(res, '/login');
  const role = cookies(req).hx_role || user.role;
  if (role !== 'seller' && role !== 'admin') { send(res, 403, header('Seller', user) + '<div class="card"><p>Sellers only.</p></div>' + footer()); return; }
  if (user.role !== 'seller' && user.role !== 'admin') pass('auth-cookie'); // reached only via forged cookie
  const mine = auctions.filter(a => a.sellerId === user.id);
  const rows = (mine.length ? mine : auctions).map(a => '<tr><td>' + esc(a.title) + '</td><td>' + a.status + '</td><td>$' + a.currentBid + '</td><td>reserve $' + a.reserve + '</td></tr>').join('');
  send(res, 200, header('Seller Console', user) + '<div class="card"><h2>Seller Console</h2><table><tr><th>Listing</th><th>Status</th><th>Current bid</th><th>Reserve</th></tr>' + rows + '</table></div>' + footer());
}
function watchlistPage(req, res) {
  const user = sessionUser(req); if (!user) return redirect(res, '/login');
  const ids = watchlist[user.id] || [];
  const rows = ids.map(id => { const a = auctionById(id); return a ? '<div class="card"><a href="/auction/' + a.id + '">' + esc(a.title) + '</a> — current bid $' + a.currentBid + '</div>' : ''; }).join('') || '<p>Nothing watched yet.</p>';
  send(res, 200, header('Watchlist', user) + '<h2>Your watchlist</h2>' + rows + footer());
}
function settlePage(req, res, id) {
  const user = sessionUser(req); if (!user) return redirect(res, '/login');
  const s = settlements[id]; if (!s) { send(res, 404, 'Not found'); return; }
  bump('Payments & Settlement');
  if (s.winnerId !== user.id) pass('settle-idor'); // FLAW: invoice served to anyone
  const a = auctionById(s.auctionId), w = userById(s.winnerId);
  send(res, 200, header('Settlement', user) + '<div class="card"><h2>Settlement — ' + esc(a ? a.title : '?') + '</h2>' +
    '<p>Winner: ' + esc(w ? w.name : '?') + ' (' + esc(w ? w.email : '') + ')<br>Winning bid: $' + s.amount + '<br>Paid so far: $' + s.paid + '<br>Status: <b>' + s.status + '</b></p>' +
    '<form method="POST" action="/settle/' + id + '/pay"><input name="amount" type="number" placeholder="Amount you are paying"><button>Pay now</button></form></div>' + footer());
}
async function doSettlePay(req, res, id) {
  const user = sessionUser(req); if (!user) return redirect(res, '/login');
  const s = settlements[id]; if (!s) { send(res, 404, 'Not found'); return; }
  const b = await parseBody(req);
  bump('Payments & Settlement');
  const amount = Number(b.amount);
  if (Number.isNaN(amount)) { send(res, 400, 'Bad amount'); return; }
  s.paid += amount;
  if (amount === 0) { s.status = 'PAID'; pass('settle-free'); } // FLAW: zero settles the invoice
  else if (amount < s.amount) { s.status = 'PAID'; pass('settle-tamper'); } // FLAW: partial payment settles in full
  else s.status = 'PAID';
  redirect(res, '/settle/' + id);
}
function adminPage(req, res) {
  const user = sessionUser(req); if (!user) return redirect(res, '/login');
  bump('Admin Panel');
  if (user.role !== 'admin') pass('admin-bac'); // FLAW: panel renders for any logged-in user
  const rows = users.map(u => '<tr><td>' + u.id + '</td><td>' + esc(u.email) + '</td><td>' + u.password + '</td><td>' + esc(u.role) + '</td></tr>').join('');
  const arows = auctions.map(a => '<tr><td>' + esc(a.title) + '</td><td>' + a.status + '</td><td><form method="POST" action="/admin/end/' + a.id + '"><button>End auction</button></form></td></tr>').join('');
  send(res, 200, header('Admin', user) + '<div class="card"><h2>Admin Panel</h2><h3>Users (passwords in clear)</h3><table><tr><th>ID</th><th>Email</th><th>Password</th><th>Role</th></tr>' + rows + '</table><h3>Auctions</h3><table>' + arows + '</table></div>' + footer());
}
async function doAdminEnd(req, res, id) {
  const user = sessionUser(req); if (!user) return redirect(res, '/login');
  const b = await parseBody(req);
  bump('Admin Panel');
  if (b.hx_origin !== 'site') pass('admin-csrf'); // FLAW: action proceeds anyway
  const a = auctionById(id); if (a) a.status = 'ended';
  redirect(res, '/admin');
}
function testsPage(req, res, url) {
  const user = sessionUser(req);
  const show = url.searchParams.get('h') || '';
  let html = '<h2>Mission Board — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h2><p>' + doneCount() + '/' + TESTS.length + ' tests complete. Attempts unlock coach help per feature (3 tries).</p>';
  for (const f of FEATURES) {
    html += '<div class="card"><h3>' + f + ' <span class="tag">attempts: ' + (P.attempts[f] || 0) + '</span></h3>';
    for (const t of TESTS.filter(x => x.feature === f)) {
      const done = !!P.tests[t.id];
      html += '<div style="border-top:1px solid #eee;padding:8px 0"><b>' + (done ? '<span class="done">✓ done</span>' : '<span class="open">○ open</span>') + ' ' + esc(t.name) + '</b> <span class="tag">' + esc(t.owasp) + '</span> <span class="tag">' + t.difficulty + '</span>';
      const m = show.match(new RegExp('^' + t.id + ':(\\d)$'));
      const lvl = m ? Number(m[1]) : 0;
      if (lvl > 0) { for (let i = 0; i < Math.min(lvl, 3); i++) html += '<div style="font-size:13px;color:#555">Hint ' + (i + 1) + ': ' + esc(t.hints[i]) + '</div>'; }
      if (lvl < 3) html += ' <a href="/tests?h=' + t.id + ':' + (lvl + 1) + '">Hints ▸</a>';
      html += '</div>';
    }
    html += '</div>';
  }
  send(res, 200, header('Mission Board', user) + html + footer());
}
function completePage(req, res) {
  const user = sessionUser(req);
  const done = doneCount();
  if (done < TESTS.length) {
    const left = TESTS.filter(t => !P.tests[t.id]).map(t => '<li>' + esc(t.name) + ' (' + t.feature + ')</li>').join('');
    send(res, 200, header('Completion', user) + '<div class="card"><h2>Not complete yet — ' + done + '/' + TESTS.length + '</h2><p>Still to solve:</p><ul>' + left + '</ul></div>' + footer());
    return;
  }
  let h = '<div class="card"><h2>Lab complete — 100%</h2>';
  h += '<h3>1) Features in this lab</h3><p>' + FEATURES.length + ' features: ' + FEATURES.join(', ') + '</p>';
  h += '<h3>2) Vulnerabilities per feature</h3><ul>' + FEATURES.map(f => '<li>' + f + ': ' + TESTS.filter(t => t.feature === f).length + '</li>').join('') + '</ul>';
  h += '<h3>3) Ways testing was done (' + TESTS.length + ' techniques)</h3><ul>' + TESTS.map(t => '<li>' + esc(t.name) + '</li>').join('') + '</ul>';
  h += '<h3>4) What you learned</h3><ul>' + TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.lesson) + '</li>').join('') + '</ul>';
  h += '<h3>5) What this means for a real client</h3><ul>' + TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.impact) + '</li>').join('') + '</ul>';
  h += '<h3>6) Writing it in a real report</h3><ul>' + TESTS.map(t => '<li><b>' + esc(t.report.title) + '</b> — Severity: ' + t.report.severity + ' — Remediation: ' + esc(t.report.remediation) + '</li>').join('') + '</ul>';
  h += '<h3>Your completion key for Lab ' + (LAB_NUMBER + 1) + '</h3><p style="font-size:20px"><code>' + completionKey() + '</code></p>';
  h += '<form method="POST" action="/complete/name"><input name="name" placeholder="Your name for the certificate" value="' + esc(P.testerName || '') + '"><button>Save name</button></form>';
  h += '<p><a href="/certificate">View your certificate</a></p></div>';
  send(res, 200, header('Complete', user) + h + footer());
}
function certificatePage(req, res) {
  const user = sessionUser(req);
  if (doneCount() < TESTS.length) { send(res, 200, header('Certificate', user) + '<div class="card"><p>Certificate unlocks at 100%.</p></div>' + footer()); return; }
  const name = P.testerName || (user ? user.name : 'Tester');
  const date = P.completedAt ? new Date(P.completedAt).toDateString() : new Date().toDateString();
  send(res, 200, '<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ' + LAB_NUMBER + '</title><style>@media print{button{display:none}}body{font-family:Georgia,serif;background:#eee}.cert{max-width:720px;margin:40px auto;background:#fff;border:6px double #232946;padding:36px;text-align:center}</style></head><body><div class="cert">' +
    '<img src="/logo.png" style="height:70px"><h1>Certificate of Completion</h1><p>This certifies that</p><h2>' + esc(name) + '</h2>' +
    '<p>has completed 100% of the security tests in LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' (' + TESTS.length + ' tests across ' + FEATURES.length + ' features)</p>' +
    '<p>' + date + '</p><p><b>HexaCyberLab — Built by Md. Jony Hassain, Founder</b></p><button onclick="window.print()">Print</button></div></body></html>');
}

/* ================= Lab Coach (chatbot) ================= */
const FEATURE_KEYS = [
  ['Login & Authentication', ['login', 'auth', 'password', 'brute', 'reset token', 'sign in']],
  ['Registration & Profile', ['register', 'registration', 'profile', 'sign up', 'account']],
  ['Search & Listings', ['search', 'find', 'listing search']],
  ['Bidding', ['bid', 'bidding', 'reserve', 'auction bid']],
  ['Seller & Listings', ['seller', 'listing', 'draft', 'edit listing']],
  ['Payments & Settlement', ['settle', 'settlement', 'payment', 'pay', 'invoice']],
  ['Admin Panel', ['admin', 'panel']],
  ['Platform & API', ['api', 'token', 'debug', 'platform']]
];
function coachReply(raw) {
  const msg = String(raw || '').toLowerCase();
  const done = doneCount();
  if (/who (built|made|created)|founder|who is.*(jony|hexa)/.test(msg) || msg.includes('built this') || msg.includes('made this')) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (/(completion )?key|next lab/.test(msg)) {
    if (P.keyRevealed && done >= TESTS.length) return 'You earned it — the completion key for Lab ' + (LAB_NUMBER + 1) + ' is: ' + completionKey();
    return 'I do not have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at ' + done + '/' + TESTS.length + ' tests (' + Math.floor(done / TESTS.length * 100) + '%). Finish every test on the Mission Board and I will share it.';
  }
  // feature-targeted questions
  for (const [feature, keys] of FEATURE_KEYS) {
    if (keys.some(k => msg.includes(k))) {
      const list = TESTS.filter(t => t.feature === feature);
      if (/how many|count|list|which|what (tests|vulnerab)/.test(msg) && !/how (do|to)|help|solve|guide/.test(msg)) {
        return feature + ' has ' + list.length + ' tests: ' + list.map(t => t.name + (P.tests[t.id] ? ' ✓' : '')).join('; ') + '. Attempts so far on this feature: ' + (P.attempts[feature] || 0) + '.';
      }
      if (/how|help|solve|guide|stuck|hint/.test(msg)) {
        const att = P.attempts[feature] || 0;
        const open = list.filter(t => !P.tests[t.id]);
        if (!open.length) return 'You have already completed every test in ' + feature + '. Nice work.';
        if (att >= 3 || open.length < list.length) {
          return 'Step by step for ' + feature + ' — next open test: "' + open[0].name + '". ' + open[0].hints[2] + ' (' + open.length + ' test(s) still open in this feature.)';
        }
        return "That feature is locked for help. First try the " + feature + " tests yourself at least 3 times — I can see you've tried " + att + " time(s) so far. After 3 real tries, ask me again and I'll guide you step by step.";
      }
      return feature + ' has ' + list.length + ' tests (' + list.filter(t => P.tests[t.id]).length + ' done). Attempts on this feature: ' + (P.attempts[feature] || 0) + '. Ask me "how do I solve the ' + feature + ' tests" once you have tried at least 3 times.';
    }
  }
  if (/how many|features|tests|progress|status/.test(msg)) {
    return 'LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ' has ' + FEATURES.length + ' features and ' + TESTS.length + ' tests. Your progress: ' + done + '/' + TESTS.length + ' (' + Math.floor(done / TESTS.length * 100) + '%). Next open test: ' + (TESTS.find(t => !P.tests[t.id]) ? TESTS.find(t => !P.tests[t.id]).name : 'none — lab complete!') + '. See /tests for the full Mission Board.';
  }
  if (/hi|hello|hey/.test(msg)) return 'Hello! I am the Lab Coach for LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ' — ' + FEATURES.length + ' features, ' + TESTS.length + ' tests. You are at ' + done + '/' + TESTS.length + '. Try tests on the Mission Board (/tests); after 3 real attempts on a feature I can guide you step by step.';
  return 'I can help with this lab: ask me how many tests a feature has, your progress, or — after at least 3 real attempts on a feature — how to solve its tests. Full map: /tests.';
}

/* ================= router ================= */
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:' + PORT);
    const pth = url.pathname;
    if (pth === '/logo.png') {
      try { const img = fs.readFileSync(path.join(DIR, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(img); } catch (e) { send(res, 404, 'no logo'); }
      return;
    }
    if (pth === '/api/progress') { send(res, 200, JSON.stringify(progressJSON()), 'application/json'); return; }
    if (pth === '/api/chat' && req.method === 'POST') {
      const b = await parseBody(req);
      send(res, 200, JSON.stringify({ reply: coachReply(b.message) }), 'application/json');
      return;
    }
    if (pth === '/unlock' && req.method === 'POST') {
      const b = await parseBody(req);
      const given = String(b.key || '');
      const want = entryKey();
      let same = given.length === want.length; // constant-ish work, exact match, no partial hints
      for (let i = 0; i < Math.max(given.length, want.length); i++) { if (given[i] !== want[i]) same = false; }
      if (same) { P.unlocked = true; saveProgress(); redirect(res, '/'); }
      else send(res, 403, gatePage('That key was not accepted.'));
      return;
    }
    if (!P.unlocked) { send(res, 200, gatePage()); return; }

    const user = sessionUser(req);
    if (pth === '/') return homePage(req, res);
    if (pth === '/login' && req.method === 'GET') return loginPage(req, res);
    if (pth === '/login' && req.method === 'POST') return doLogin(req, res);
    if (pth === '/register' && req.method === 'GET') return registerPage(req, res);
    if (pth === '/register' && req.method === 'POST') return doRegister(req, res);
    if (pth === '/logout') { const c = cookies(req); if (c.hx_session) delete sessions[c.hx_session]; res.setHeader('Set-Cookie', 'hx_session=; Path=/; Max-Age=0'); return redirect(res, '/login'); }
    if (pth === '/forgot' && req.method === 'GET') { send(res, 200, header('Forgot', null) + '<div class="card"><h2>Forgot password</h2><form method="POST" action="/forgot"><input name="email" placeholder="Email"><button>Send reset link</button></form></div>' + footer()); return; }
    if (pth === '/forgot' && req.method === 'POST') return doForgot(req, res);
    if (pth === '/reset' && req.method === 'GET') { send(res, 200, header('Reset', null) + '<div class="card"><h2>Reset password</h2><form method="POST" action="/reset"><input name="token" placeholder="Reset token"><input name="newpassword" type="password" placeholder="New password"><button>Reset</button></form></div>' + footer()); return; }
    if (pth === '/reset' && req.method === 'POST') return doReset(req, res);
    if (pth === '/profile' && req.method === 'GET') return profilePage(req, res);
    if (pth === '/profile' && req.method === 'POST') return doProfile(req, res);
    if (pth === '/search') return searchPage(req, res, url.searchParams.get('q') || '');
    let m;
    if ((m = pth.match(/^\/auction\/(\d+)$/)) && req.method === 'GET') return auctionPage(req, res, Number(m[1]));
    if ((m = pth.match(/^\/auction\/(\d+)\/bid$/)) && req.method === 'POST') return doBid(req, res, Number(m[1]));
    if ((m = pth.match(/^\/auction\/(\d+)\/edit$/)) && req.method === 'POST') return doEditAuction(req, res, Number(m[1]));
    if ((m = pth.match(/^\/watch\/(\d+)$/)) && req.method === 'POST') {
      if (!user) return redirect(res, '/login');
      (watchlist[user.id] = watchlist[user.id] || []).push(Number(m[1]));
      return redirect(res, '/watchlist');
    }
    if (pth === '/watchlist') return watchlistPage(req, res);
    if (pth === '/seller') return sellerPage(req, res);
    if ((m = pth.match(/^\/settle\/(\d+)$/)) && req.method === 'GET') return settlePage(req, res, Number(m[1]));
    if ((m = pth.match(/^\/settle\/(\d+)\/pay$/)) && req.method === 'POST') return doSettlePay(req, res, Number(m[1]));
    if (pth === '/admin') return adminPage(req, res);
    if ((m = pth.match(/^\/admin\/end\/(\d+)$/)) && req.method === 'POST') return doAdminEnd(req, res, Number(m[1]));
    if (pth === '/api/debug') {
      bump('Platform & API'); pass('api-debug');
      send(res, 200, JSON.stringify({ users, auctions, settlements }, null, 2), 'application/json'); return;
    }
    if (pth === '/api/me') {
      const tok = req.headers['x-api-token'] || '';
      let em = '';
      try { em = Buffer.from(tok, 'base64').toString('utf8'); } catch (e) {}
      const u = users.find(x => x.email === em);
      if (u && tok === Buffer.from(u.email).toString('base64')) {
        bump('Platform & API'); pass('api-token');
        send(res, 200, JSON.stringify({ id: u.id, email: u.email, name: u.name, role: u.role, balance: u.balance, bids: bids.filter(b => b.bidderId === u.id), watchlist: watchlist[u.id] || [] }), 'application/json');
      } else if (user) {
        send(res, 200, JSON.stringify({ id: user.id, email: user.email, name: user.name, role: user.role, balance: user.balance }), 'application/json');
      } else send(res, 401, JSON.stringify({ error: 'unauthorized' }), 'application/json');
      return;
    }
    if (pth === '/tests') return testsPage(req, res, url);
    if (pth === '/complete' && req.method === 'GET') return completePage(req, res);
    if (pth === '/complete/name' && req.method === 'POST') {
      const b = await parseBody(req);
      if (b.name) { P.testerName = String(b.name); saveProgress(); }
      return redirect(res, '/certificate');
    }
    if (pth === '/certificate') return certificatePage(req, res);
    send(res, 404, header('404', user) + '<div class="card"><p>Not found.</p></div>' + footer());
  } catch (e) {
    try { send(res, 500, 'Server error'); } catch (e2) {}
  }
});

/* ================= docs generation (from the registry) ================= */
function genDocs() {
  const byF = f => TESTS.filter(t => t.feature === f);
  let v = '# HexaAuction — Vulnerability Map (LAB 99)\n\nAll ' + TESTS.length + ' scored tests, grouped by feature. Every item is a real, working flaw in this app.\n';
  for (const f of FEATURES) { v += '\n## ' + f + '\n'; for (const t of byF(f)) v += '\n### ' + t.name + '\n- OWASP: ' + t.owasp + '\n- Difficulty: ' + t.difficulty + '\n- Location: ' + t.loc + '\n- Exploitation outline: ' + t.how + '\n- Impact: ' + t.impact + '\n'; }
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'), v);
  let g = '# HexaAuction — Practice Guide (LAB 99)\n\nChallenges grouped by feature, then difficulty. Solve them in the app; the Mission Board (/tests) mirrors this guide.\n';
  const order = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  for (const f of FEATURES) { g += '\n## ' + f + '\n'; for (const t of byF(f).slice().sort((a, b) => order[a.difficulty] - order[b.difficulty])) g += '\n### [' + t.difficulty + '] ' + t.name + '\n- Objective: ' + t.how + '\n- Hints:\n  1. ' + t.hints[0] + '\n  2. ' + t.hints[1] + '\n  3. ' + t.hints[2] + '\n'; }
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'), g);
  let r = '# HexaAuction — Fix & Retest Guide (LAB 99)\n\nFor each finding: the secure implementation, then the regression retest that must FAIL after the fix.\n';
  for (const f of FEATURES) { r += '\n## ' + f + '\n'; for (const t of byF(f)) r += '\n### ' + t.report.title + ' (' + t.report.severity + ')\n- Fix: ' + t.fix + '\n- Remediation: ' + t.report.remediation + '\n- Retest: repeat the original exploit (' + t.how + ') — it must no longer succeed, and the test must stay un-passed on a fresh progress file.\n'; }
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'), r);
  console.log('docs generated: ' + TESTS.length + ' tests across ' + FEATURES.length + ' features');
}
if (process.argv.includes('--gen-docs')) { genDocs(); process.exit(0); }

server.listen(PORT, '127.0.0.1', () => console.log('LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ' listening on 127.0.0.1:' + PORT));
