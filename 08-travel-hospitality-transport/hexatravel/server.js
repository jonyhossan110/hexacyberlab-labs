'use strict';
/* ============================================================================
   HexaTravel — LAB 71 (Category 8: Travel, Hospitality & Transport)
   A deliberately vulnerable travel-booking platform for authorised,
   local-only security training. Zero-dependency Node.js. All data is fake.
   ========================================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3080;
const LAB_NUMBER = 71;
const LAB_NAME = 'HexaTravel';
const DIR = __dirname;
const FILES_DIR = path.join(DIR, 'files');
const PROGRESS_PATH = path.join(DIR, 'progress.json');

/* --- key shards, region 1 of 4 (entry, first half) --- */
const _eA = ["TC1YSA==","Ry0xNw==","QVUxRw=="];

/* ============================== seed data ================================ */
const users = [
  { id: 1, name: 'Travel Admin', email: 'admin@hexatravel.local', password: 'admin123', role: 'admin', credit: 0, isDefault: true, resetRequested: false },
  { id: 2, name: 'Agent Amy', email: 'agent@hexatravel.local', password: 'agent123', role: 'agent', credit: 0, resetRequested: false },
  { id: 3, name: 'Alice Traveller', email: 'alice@test.local', password: 'alice123', role: 'traveller', credit: 20, resetRequested: false },
  { id: 4, name: 'Bob Traveller', email: 'bob@test.local', password: 'bob123', role: 'traveller', credit: 0, resetRequested: false },
  { id: 5, name: 'Carol Traveller', email: 'carol@test.local', password: 'carol123', role: 'traveller', credit: 0, resetRequested: false },
];
let nextUserId = 6;

const packages = [
  { id: 1, name: "Cox's Bazar Beach Escape", destination: 'Bangladesh', price: 120, seats: 40, seatsBooked: 12, listed: true,
    itinerary: 'Day 1: arrive & beach check-in. Day 2: marine drive & Himchari. Day 3: Inani beach, sunset, return.',
    agentNotes: 'AGENT-ONLY FARE RULE: net rate is 62% of public price. Never disclose to travellers.' },
  { id: 2, name: 'Sundarbans Mangrove Tour', destination: 'Bangladesh', price: 180, seats: 25, seatsBooked: 9, listed: true,
    itinerary: 'Day 1: Khulna boarding, boat briefing. Day 2: Kotka & Kochikhali trails. Day 3: return.',
    agentNotes: 'AGENT-ONLY FARE RULE: group of 8+ gets a hidden 15% margin refund. Never disclose to travellers.' },
  { id: 3, name: 'Bali Island Honeymoon', destination: 'Indonesia', price: 899, seats: 16, seatsBooked: 5, listed: true,
    itinerary: 'Day 1: Uluwatu sunset. Day 2: Ubud rice terraces. Day 3: Nusa Penida. Day 4: spa & departure.',
    agentNotes: 'AGENT-ONLY FARE RULE: honeymoon upsell margin is 22%. Never disclose to travellers.' },
  { id: 4, name: 'Iceland Northern Lights', destination: 'Iceland', price: 1450, seats: 20, seatsBooked: 20, listed: true,
    itinerary: 'Day 1: Reykjavik. Day 2: Golden Circle. Day 3: aurora hunt. Day 4: departure.',
    agentNotes: 'AGENT-ONLY FARE RULE: waitlist seats are held for partner agencies first. Never disclose to travellers.' },
  { id: 5, name: 'Swiss Alps Rail Journey', destination: 'Switzerland', price: 1299, seats: 30, seatsBooked: 11, listed: true,
    itinerary: 'Day 1: Zurich. Day 2: Glacier Express. Day 3: Zermatt. Day 4: Lucerne & departure.',
    agentNotes: 'AGENT-ONLY FARE RULE: rail pass buy price is 48% of public price. Never disclose to travellers.' },
  { id: 6, name: 'STAFF-TEST Internal Fare Audit', destination: 'INTERNAL', price: 1, seats: 1, seatsBooked: 0, listed: false,
    itinerary: 'Internal test package. Not for sale.',
    agentNotes: 'INTERNAL ONLY: fare-audit placeholder package.' },
];
let nextPackageId = 7;

const reservations = [
  { id: 1, userId: 3, packageId: 1, travellers: 2, paidFor: 2, total: 240, voucher: '', status: 'confirmed' },
  { id: 2, userId: 4, packageId: 3, travellers: 2, paidFor: 2, total: 1798, voucher: '', status: 'confirmed' },
];
let nextReservationId = 3;

const documents = [
  { id: 1, reservationId: 1, title: 'Alice — Cox\'s Bazar itinerary & vouchers', file: 'doc-1.txt' },
  { id: 2, reservationId: 2, title: 'Bob — Bali itinerary & vouchers', file: 'doc-2.txt' },
];
let nextDocumentId = 3;

const reviews = [
  { id: 1, packageId: 1, userId: 4, text: 'Great beach trip, hotel was close to the sea.' },
];
let nextReviewId = 2;

const VOUCHERS = {
  'SAVE10': { pct: 10, singleUse: false },
  'TRAVEL20': { pct: 20, singleUse: false },
  'AGENT50': { pct: 50, singleUse: true },
};
const voucherUse = {}; // userId -> Set of single-use codes already redeemed

const sessions = new Map(); // sid -> userId
let nextSession = 1;
const loginFailures = {};   // userId -> count
const probeSets = {};       // ip -> Set of distinct emails probed

/* ========================= progress state ================================ */
let state = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadState() {
  try {
    if (fs.existsSync(PROGRESS_PATH)) {
      const raw = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
      state = Object.assign(state, raw);
    }
  } catch (e) { /* start fresh on corrupt state */ }
}
function saveState() {
  try { fs.writeFileSync(PROGRESS_PATH, JSON.stringify(state, null, 2)); } catch (e) { /* ignore */ }
}
loadState();

/* ============================== TESTS ==================================== */
/* Populated below the shard region break. */
const TESTS = [
  /* ---------------- Login & Authentication ---------------- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL injection login bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login form builds its query by gluing your input into a string.', "Try a classic tautology in the email field, e.g. ' OR '1'='1", "Use email: ' OR '1'='1' --  with any password to land in an account without knowing its password."],
    lesson: 'String-built queries let an attacker rewrite the login logic itself; parameterised queries remove the whole class.',
    impact: 'On a real travel site this means full account takeover — bookings, traveller documents and payment details exposed.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements for all database access; never concatenate user input into SQL.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute force — no rate limit or lockout', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Keep guessing passwords for one account — does anything ever slow you down?', 'Script 10+ wrong passwords for alice@test.local and watch the responses stay identical.', 'After 10 failed attempts the app still happily processes more: the missing throttle is the flaw.'],
    lesson: 'Without throttling or lockout, credential stuffing and password guessing are only a matter of time.',
    impact: 'Attackers can grind through common passwords against customer accounts and take over bookings at scale.',
    report: { title: 'No Rate Limiting or Account Lockout on Login Endpoint', severity: 'High', remediation: 'Add progressive delays, lockout after repeated failures, and CAPTCHA / MFA for accounts.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User enumeration via login & forgot-password', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the error for an email that exists with one that does not.', 'The forgot-password form leaks the same difference.', 'Probe 5+ different emails across login/forgot and note the two distinct messages.'],
    lesson: 'Different error messages for "no such account" vs "wrong password" hand attackers a valid-account list.',
    impact: 'Attackers harvest real customer emails first, then aim phishing and credential stuffing precisely.',
    report: { title: 'Account Enumeration via Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message ("if the account exists…") for all login and reset outcomes.' } },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Default / demo credentials still active', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['The login page itself publishes demo accounts.', 'One of them is the administrator account.', 'Sign in as admin@hexatravel.local with the published demo password admin123.'],
    lesson: 'Published demo/default credentials are an open door, especially on the admin account.',
    impact: 'Anyone on the internet can become admin of the booking platform with a password printed on the login page.',
    report: { title: 'Default Administrator Credentials Active and Publicly Disclosed', severity: 'Critical', remediation: 'Force password change on first use, remove demo accounts from production, never print credentials on the login page.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable password-reset token', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    hints: ['Reset tokens here are not random — they are computed from something public.', 'Look at how a token relates to the numeric user id.', "The token is 'HT-' + base36(userId x 137 + 42). Compute Bob's (id 4) and reset his password without ever requesting a reset email."],
    lesson: 'Reset tokens must be long, random and single-use; a formula based on the user id is guessable by anyone.',
    impact: 'Any customer account can be taken over knowing only its email and its (sequential) user id.',
    report: { title: 'Password Reset Tokens Are Predictable (Derived from User ID)', severity: 'High', remediation: 'Generate reset tokens from a CSPRNG (≥128-bit), store hashed, expire quickly, single use.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Session/role cookie tampering', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After login, inspect the cookies the app trusts.', 'One cookie carries your role — and the server believes whatever it says.', "Set the hx_role cookie to 'agent' and open the agent console at /agent."],
    lesson: 'Authorization data must come from server-side session state, never from a client-editable cookie.',
    impact: 'A plain traveller can promote themselves to agent or admin tooling and reach internal fare and booking data.',
    report: { title: 'Authorization Role Trusted from a Client-Controlled Cookie', severity: 'High', remediation: 'Derive roles from the server-side session record only; ignore any role value supplied by the client.' } },

  /* ---------------- Registration & Profile ---------------- */
  { id: 'reg-weak', feature: 'Registration & Profile', name: 'Weak password policy (1 character)', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a new account and try the shortest password it will accept.', 'There is no length or complexity check at all.', 'A one-character password like "x" is accepted.'],
    lesson: 'Password policy is the first line of defence; accepting 1-character passwords invites instant brute force.',
    impact: 'Customer accounts fall to trivial guessing, exposing bookings and personal documents.',
    report: { title: 'Registration Accepts Extremely Weak Passwords', severity: 'Medium', remediation: 'Enforce a minimum length (≥10) and screen against known-breached password lists.' } },
  { id: 'reg-mass', feature: 'Registration & Profile', name: 'Mass assignment — role & credit at signup', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The signup form only shows name/email/password, but the server binds the whole request body.', 'Add extra fields to the registration POST and see which ones stick.', 'Register with role=agent (or a big credit value) in the POST body and check your new powers.'],
    lesson: 'Binding request bodies straight onto the user record lets attackers set privileged fields the UI never offered.',
    impact: 'Attackers mint themselves agent/admin accounts or free travel credit at signup — no exploit chain needed.',
    report: { title: 'Mass Assignment in Registration Allows Privilege Escalation', severity: 'High', remediation: 'Whitelist bindable fields server-side; set role/credit only through privileged internal code paths.' } },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in display name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is printed back on pages other users (and the admin) see.', 'Names are rendered without escaping.', 'Register (or rename yourself) with a name containing a <script> payload and view a page that prints it.'],
    lesson: 'Every user-controlled string printed into HTML must be output-encoded, even "harmless" name fields.',
    impact: 'A crafted name fires script in the browsers of staff and customers — session theft and actions in their name.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-aware output encoding on all user data; add a Content-Security-Policy as defence in depth.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on profile update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Legit forms carry a hidden hx_origin marker. What happens if a POST arrives without it?', 'The server never checks the marker — or the Origin — on profile update.', 'POST to /profile as a logged-in user with no hx_origin field and confirm the change sticks.'],
    lesson: 'State-changing endpoints need anti-CSRF tokens; a marker that is issued but never verified protects nothing.',
    impact: 'A malicious page can silently rename/re-profile a logged-in customer, a stepping stone to account confusion and fraud.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Issue and verify per-session CSRF tokens on every state-changing request; validate Origin/Referer.' } },

  /* ---------------- Search & Packages ---------------- */
  { id: 'search-sqli', feature: 'Search & Packages', name: 'SQL injection in package search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Search also builds its query from your raw text.', 'A tautology here changes which rows come back.', "Search for ' OR '1'='1 and look for a package that never appears in normal results (an unlisted internal one)."],
    lesson: 'Search boxes are query builders too — injection there can dump rows the UI was never meant to show.',
    impact: 'Hidden/internal packages, test fares and agent-only inventory leak to the public.',
    report: { title: 'SQL Injection in Package Search Exposes Unlisted Records', severity: 'High', remediation: 'Parameterise search queries and enforce listing/visibility filters server-side regardless of input.' } },
  { id: 'search-xss', feature: 'Search & Packages', name: 'Reflected XSS in search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your search text is echoed into the results page heading.', 'It is echoed without escaping.', 'Search for a <script> payload and view the page source / response.'],
    lesson: 'Reflected input must be encoded at output; search pages are a classic phishing delivery vehicle.',
    impact: 'Attackers send victims a crafted search link that runs script on the real travel domain, stealing sessions.',
    report: { title: 'Reflected Cross-Site Scripting in Search Results', severity: 'Medium', remediation: 'HTML-encode all reflected input; deploy a restrictive Content-Security-Policy.' } },
  { id: 'pkg-notes', feature: 'Search & Packages', name: 'Agent-only fare rules exposed to travellers', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Package records contain an internal "agent notes" field with fare rules.', 'Open any package page as a normal traveller and read everything on it.', 'The agent-only fare rule is printed right on the public package page.'],
    lesson: 'Fields meant for internal roles must be filtered server-side per role — hiding them in the UI is not enough, and here they are not even hidden.',
    impact: 'Net fares and margin rules leak to customers and competitors, destroying pricing confidentiality.',
    report: { title: 'Internal Agent Fare Rules Disclosed to Unprivileged Users', severity: 'Medium', remediation: 'Strip internal fields from responses for non-agent roles; review every DTO for internal-only data.' } },

  /* ---------------- Booking & Payments ---------------- */
  { id: 'book-price', feature: 'Booking & Payments', name: 'Price-per-person tampering at checkout', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['The booking form carries the price and total in hidden fields computed "in the browser".', 'The server trusts the posted total.', 'Book a package and POST a total of 1 instead of the real amount.'],
    lesson: 'Prices must be recomputed server-side from the catalogue; anything the browser sends about money is a suggestion, not truth.',
    impact: 'Customers book $1,450 tours for $1 — direct revenue loss on every tampered booking.',
    report: { title: 'Client-Side Price Trusted at Booking (Price Tampering)', severity: 'Critical', remediation: 'Recompute price and total server-side from catalogue data; ignore all client-supplied monetary fields.' } },
  { id: 'book-count', feature: 'Booking & Payments', name: 'Traveller-count forgery (pay for 1, book for 4)', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['The form has separate fields for how many travel and how many you pay for.', 'The server books the first number and charges the second.', 'Book with travellers=4 and payFor=1 and a matching total — four seats, one fare.'],
    lesson: 'Quantity invariants (seats booked == seats paid) must be enforced server-side, not by form design.',
    impact: 'Groups travel while paying for one seat — silent inventory and revenue leakage.',
    report: { title: 'Booked Traveller Count Not Reconciled with Paid Count', severity: 'High', remediation: 'Derive the booked quantity from the paid line items server-side; reject mismatches.' } },
  { id: 'book-soldout', feature: 'Booking & Payments', name: 'Booking a sold-out departure', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['One departure (Iceland Northern Lights) is fully booked — 20 of 20 seats taken.', 'The booking endpoint never re-checks capacity.', 'Book the sold-out package anyway and confirm your reservation is created.'],
    lesson: 'Capacity checks belong in the booking transaction itself; a "sold out" label in the UI stops nobody.',
    impact: 'Oversold departures mean refunds, compensation and reputational damage on the travel day.',
    report: { title: 'Missing Capacity Validation Allows Overselling Departures', severity: 'High', remediation: 'Check and decrement seat inventory atomically inside the booking transaction.' } },
  { id: 'voucher-stack', feature: 'Booking & Payments', name: 'Voucher stacking (two codes on one booking)', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['The booking form accepts a voucher… and a second voucher field too.', 'Discounts combine multiplicatively with no rule against it.', 'Apply SAVE10 together with TRAVEL20 on one booking and watch both discounts land.'],
    lesson: 'Promotion rules (one code per order) are business invariants that must be enforced in code, not in marketing copy.',
    impact: 'Stacked discounts quietly erode margin and can be combined with other flaws for near-free travel.',
    report: { title: 'Multiple Discount Vouchers Can Be Stacked on a Single Booking', severity: 'Medium', remediation: 'Enforce a single active voucher per booking server-side unless an explicit combining rule exists.' } },
  { id: 'voucher-reuse', feature: 'Booking & Payments', name: 'Single-use voucher reused', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['AGENT50 is described as single-use per customer.', 'Nothing records that you already redeemed it.', 'Use AGENT50 on two separate bookings as the same user — it works both times.'],
    lesson: 'Single-use semantics need server-side redemption records checked at apply time.',
    impact: 'A leaked "one-time" 50% code becomes a permanent half-price channel for anyone who reuses it.',
    report: { title: 'Single-Use Voucher Can Be Redeemed Repeatedly', severity: 'Medium', remediation: 'Persist voucher redemptions per user/code and reject repeat use of single-use codes.' } },

  /* ---------------- Reservations & Documents ---------------- */
  { id: 'res-idor', feature: 'Reservations & Documents', name: 'Reservation IDOR — view another traveller\'s booking', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Reservations have simple sequential ids in the URL.', 'Ownership is never checked when one is opened.', "Open /reservation/2 while signed in as Alice — that is Bob's booking."],
    lesson: 'Every object access needs an ownership/authorization check; predictable ids make gaps trivially enumerable.',
    impact: 'Full itineraries, dates and traveller details of every customer are readable by any other customer.',
    report: { title: 'Insecure Direct Object Reference on Reservation Records', severity: 'High', remediation: 'Verify the requesting user owns (or is authorised for) the reservation on every read and write.' } },
  { id: 'doc-idor', feature: 'Reservations & Documents', name: 'Travel document IDOR — download another traveller\'s documents', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Each reservation carries travel documents with their own ids.', 'The document endpoint checks login — but not whose document it is.', "Download document 2 (Bob's Bali vouchers) while signed in as Alice."],
    lesson: 'Documents concentrate the most sensitive trip data; they need the same ownership checks as the parent record.',
    impact: 'Passport-adjacent travel documents and vouchers of other customers can be harvested wholesale.',
    report: { title: 'Insecure Direct Object Reference on Travel Documents', severity: 'High', remediation: 'Authorize document access through the parent reservation\'s ownership, every time.' } },
  { id: 'doc-traversal', feature: 'Reservations & Documents', name: 'Path traversal on document download', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The /download endpoint takes a file name and joins it to the documents folder.', 'Nothing stops you from walking up the directory tree.', 'Request /download?file=../server.js and read the application source.'],
    lesson: 'File paths built from user input must be canonicalised and confined to an allow-listed directory.',
    impact: 'Source code, configuration and any file the server can read become downloadable — a beachhead for deeper attacks.',
    report: { title: 'Directory Traversal in File Download Endpoint', severity: 'High', remediation: 'Resolve the requested path, verify it stays inside the documents directory, and serve files by id, not by name.' } },

  /* ---------------- Reviews ---------------- */
  { id: 'review-xss', feature: 'Reviews', name: 'Stored XSS in package reviews', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Reviews are printed on the package page for every visitor.', 'Review text is stored and rendered raw.', 'Post a review containing a <script> payload on any package and open its page.'],
    lesson: 'User-generated content shown to other users is the highest-value XSS surface and must be encoded on output.',
    impact: 'One review can attack every future visitor of a popular package page, including staff.',
    report: { title: 'Stored Cross-Site Scripting in Package Reviews', severity: 'High', remediation: 'Output-encode review text at render time and sanitise stored rich text if any is allowed.' } },

  /* ---------------- Admin Panel ---------------- */
  { id: 'admin-bac', feature: 'Admin Panel', name: 'Admin panel open to any signed-in user', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The admin console lives at a guessable URL.', 'It checks that you are signed in — nothing more.', 'Open /admin as Alice, a plain traveller, and read the user list.'],
    lesson: 'Role checks must run on every privileged route; "signed in" is not "authorised".',
    impact: 'Every registered customer can reach admin tooling and the full customer list.',
    report: { title: 'Broken Access Control — Admin Console Accessible to Non-Admin Users', severity: 'Critical', remediation: 'Enforce role-based authorization middleware on all admin routes.' } },
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'CSRF on admin package deletion', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Admin actions are plain POSTs; the hx_origin marker is issued but never verified here either.', 'A request forged from another site carries the admin\'s cookies automatically.', 'POST to /admin/package/delete without the hx_origin marker and confirm the package disappears.'],
    lesson: 'Privileged actions are the most damaging CSRF targets and need verified tokens, not decorative ones.',
    impact: 'An admin visiting a malicious page can be made to delete packages or sabotage the catalogue unknowingly.',
    report: { title: 'Missing CSRF Protection on Administrative Actions', severity: 'High', remediation: 'Verify per-session CSRF tokens on all admin state changes and add SameSite cookies.' } },

  /* ---------------- Platform & API ---------------- */
  { id: 'api-token', feature: 'Platform & API', name: 'Weak API token (base64 of email)', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    hints: ['The JSON API authenticates with an X-Api-Token header.', 'The "token" is a reversible encoding of something public about the user.', "Send X-Api-Token: base64 of bob@test.local to /api/bookings and read Bob's reservations with no password."],
    lesson: 'API credentials must be unguessable random secrets; encoding an email address is not a credential.',
    impact: 'Anyone who knows a customer\'s email — public information — gets full API access to their bookings.',
    report: { title: 'API Authentication Token Is a Predictable Encoding of the User\'s Email', severity: 'High', remediation: 'Issue random, high-entropy API keys, store them hashed, and support revocation/rotation.' } },
  { id: 'api-debug', feature: 'Platform & API', name: 'Unauthenticated debug endpoint dumps all users', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Development leftovers often live at predictable paths.', 'Try /api/debug with no session at all.', 'The endpoint returns every account — including plaintext passwords.'],
    lesson: 'Debug/diagnostic endpoints must never ship to production; if they must exist, they need auth and auditing.',
    impact: 'Total credential disclosure: every customer and staff password, enabling full platform takeover.',
    report: { title: 'Unauthenticated Debug Endpoint Exposes All User Credentials', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; gate any diagnostics behind admin auth and logging.' } },
];

/* --- key shards, region 2 of 4 (entry, second half) --- */
const _eB = ["LTg1RQ==","VFc0SQ==","SjkyVQ=="];

const TOTAL = TESTS.length;
const FEATURES = [...new Set(TESTS.map(t => t.feature))];
function testById(id) { return TESTS.find(t => t.id === id); }
function resetTokenFor(u) { return 'HT-' + ((u.id * 137 + 42) >>> 0).toString(36).toUpperCase(); }

/* ============================ key assembly =============================== */
/* --- key shards, region 3 of 4 (completion, first half) --- */
const _cA = ["TC1YSA==","Mi0yNw==","RFE0UA=="];

function _unshard(parts) {
  return parts.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}
function entryKey() { return _unshard(_eA.concat(_eB)); }
function completionKey() { return _unshard(_cA.concat(_cB)); }

/* ============================ progress =================================== */
function pass(id) {
  if (!state.tests[id]) {
    state.tests[id] = true;
    if (TESTS.every(t => state.tests[t.id])) {
      state.completedAt = new Date().toISOString();
      state.keyRevealed = true;
    }
    saveState();
  }
}
function attempt(feature) {
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  saveState();
}
function progressData() {
  const done = TESTS.filter(t => state.tests[t.id]).length;
  const features = {};
  for (const f of FEATURES) {
    const ft = TESTS.filter(t => t.feature === f);
    features[f] = { total: ft.length, done: ft.filter(t => state.tests[t.id]).length, attempts: state.attempts[f] || 0 };
  }
  return { lab: LAB_NAME, number: LAB_NUMBER, total: TOTAL, done, pct: TOTAL ? Math.floor(done * 100 / TOTAL) : 0, features, complete: done === TOTAL };
}

/* ============================ helpers ==================================== */
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
const XSS_PAT = /(<\s*script|<\s*svg|<\s*img[^>]*onerror|onerror\s*=|onload\s*=|<\s*iframe|javascript\s*:)/i;
const SQLI_PAT = /('\s*(or|and)\s+('?[\w]+'?\s*=\s*'?[\w]+'?)|'\s*or\s*'|'\s*--|\bunion\s+select\b|'\s*or\s+1\s*=\s*1)/i;
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}
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
function currentUser(req) {
  const c = parseCookies(req);
  const uid = sessions.get(c.hx_session);
  return users.find(u => u.id === uid) || null;
}
function send(res, code, body, headers) {
  res.writeHead(code, Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, headers || {}));
  res.end(body);
}
function sendJson(res, code, obj) { send(res, code, JSON.stringify(obj, null, 2), { 'Content-Type': 'application/json' }); }
function redirect(res, to, headers) { res.writeHead(302, Object.assign({ Location: to }, headers || {})); res.end(); }

/* ============================ page layout ================================ */
function chatWidget() {
  return `<div id="hxchat" style="position:fixed;right:14px;bottom:14px;width:320px;font-family:Arial,sans-serif;z-index:99">
  <div style="background:#5b2ea6;color:#fff;padding:9px 12px;border-radius:10px 10px 0 0;cursor:pointer" onclick="var b=document.getElementById('hxchatbody');b.style.display=b.style.display=='none'?'block':'none'">💬 Lab Coach — HexaTravel</div>
  <div id="hxchatbody" style="display:none;background:#fff;border:1px solid #cbb;border-top:none;border-radius:0 0 10px 10px;padding:10px;max-height:340px;overflow:auto">
    <div id="hxchatlog" style="font-size:13px;line-height:1.5"></div>
    <form onsubmit="return hxSend(event)"><input id="hxchatin" style="width:72%;padding:7px" placeholder="Ask the coach…"><button style="padding:7px 10px">Send</button></form>
  </div></div>
  <script>
  function hxAdd(who,txt){var l=document.getElementById('hxchatlog');var d=document.createElement('div');d.innerHTML='<b>'+who+':</b> ';d.appendChild(document.createTextNode(txt));l.appendChild(d);l.scrollTop=99999;}
  function hxSend(e){e.preventDefault();var i=document.getElementById('hxchatin');var m=i.value;i.value='';hxAdd('You',m);
    fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})}).then(function(r){return r.json()}).then(function(j){hxAdd('Coach',j.reply)}).catch(function(){hxAdd('Coach','(connection error)')});
    return false;}
  </script>`;
}
function page(req, title, body) {
  const p = progressData();
  const u = currentUser(req);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)} — LAB ${LAB_NUMBER} ${LAB_NAME}</title></head>
  <body style="margin:0;background:#f2f0fa;font-family:Arial,sans-serif">
  <div style="background:#221a35;color:#fff;padding:10px 18px;display:flex;align-items:center;gap:14px">
    <img src="/logo.png" style="height:42px"><div><b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b><br><span style="font-size:12px">${p.done}/${p.total} tests · ${p.pct}%</span>
    <div style="background:#443a5e;width:220px;height:8px;border-radius:4px;margin-top:3px"><div style="background:#8b5cf6;height:8px;border-radius:4px;width:${p.pct}%"></div></div></div>
    <div style="margin-left:auto;font-size:13px">${u ? esc(u.name) + ' (' + esc(u.role) + ') · <a style="color:#cdbcf5" href="/my">My bookings</a> · <a style="color:#cdbcf5" href="/profile">Profile</a> · <a style="color:#cdbcf5" href="/logout">Logout</a>' : '<a style="color:#cdbcf5" href="/login">Login</a> · <a style="color:#cdbcf5" href="/register">Register</a>'}</div>
  </div>
  <div style="background:#fff;border-bottom:1px solid #ddd;padding:8px 18px;font-size:14px">
    <a href="/">Packages</a> · <a href="/tests">Mission Board (/tests)</a> · <a href="/agent">Agent console</a> · <a href="/admin">Admin</a> · <a href="/complete">Completion</a>
  </div>
  <div style="max-width:960px;margin:22px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:24px">${body}</div>
  ${chatWidget()}
  </body></html>`;
}
function gatePage() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ${LAB_NUMBER} — ${LAB_NAME} · Locked</title></head>
  <body style="margin:0;background:#14141d;font-family:Arial,sans-serif"><div style="max-width:520px;margin:60px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:28px;text-align:center">
  <img src="/logo.png" style="height:56px"><h2>LAB ${LAB_NUMBER} — ${LAB_NAME}</h2>
  <p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
  <form method="POST" action="/unlock"><input name="key" style="padding:9px;width:80%" placeholder="Completion key from Lab ${LAB_NUMBER - 1}"><br><br><button style="padding:10px 22px">Unlock LAB ${LAB_NUMBER}</button></form></div>
  ${chatWidget()}
  </body></html>`;
}

/* ============================ chatbot brain ============================== */
const FEATURE_KEYS = [
  ['Login & Authentication', ['login', 'log in', 'auth', 'password', 'brute', 'reset token', 'cookie', 'session', 'enumeration']],
  ['Registration & Profile', ['register', 'registration', 'signup', 'sign up', 'profile', 'mass assignment']],
  ['Search & Packages', ['search', 'package', 'catalog', 'catalogue', 'fare rule', 'agent note']],
  ['Booking & Payments', ['book', 'booking', 'pay', 'price', 'voucher', 'coupon', 'sold out', 'sold-out', 'traveller count', 'traveler']],
  ['Reservations & Documents', ['reservation', 'document', 'idor', 'download', 'traversal', 'itinerary']],
  ['Reviews', ['review', 'rating']],
  ['Admin Panel', ['admin', 'console', 'delete package']],
  ['Platform & API', ['api', 'token', 'debug', 'endpoint']],
];
function featureFromMessage(m) {
  const low = m.toLowerCase();
  for (const [f, keys] of FEATURE_KEYS) if (keys.some(k => low.includes(k))) return f;
  return null;
}
function chatReply(message) {
  const m = String(message || '');
  const low = m.toLowerCase();
  const p = progressData();
  if (/(who (built|made|created)|founder|jony|hexacyberlab)/.test(low)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (/(completion key|the key|next lab.*key|key please|give me the key)/.test(low)) {
    if (p.complete && state.keyRevealed) return 'You completed LAB ' + LAB_NUMBER + ' — congratulations! Your completion key is: ' + completionKey() + ' — paste it into the next lab to unlock it.';
    return 'I do not have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at ' + p.pct + '% (' + p.done + '/' + p.total + ' tests). Finish every test on /tests and the key will be revealed.';
  }
  const f = featureFromMessage(m);
  if (/(how many|count|list|which (tests|vulnerabilities|features)|what tests)/.test(low)) {
    if (f) {
      const ft = TESTS.filter(t => t.feature === f);
      return f + ' has ' + ft.length + ' tests: ' + ft.map(t => t.name + (state.tests[t.id] ? ' ✓' : '')).join('; ') + '.';
    }
    return 'LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ' has ' + FEATURES.length + ' features and ' + TOTAL + ' tests: ' + FEATURES.map(x => x + ' (' + TESTS.filter(t => t.feature === x).length + ')').join(', ') + '. You have completed ' + p.done + '/' + p.total + ' (' + p.pct + '%).';
  }
  if (/(progress|how am i|next|what.*do)/.test(low) && !/(how (do|to)|solve|exploit|bypass|guide|help me)/.test(low)) {
    const open = TESTS.find(t => !state.tests[t.id]);
    return 'Progress: ' + p.done + '/' + p.total + ' tests (' + p.pct + '%).' + (open ? ' Next open test: "' + open.name + '" in ' + open.feature + ' — see /tests for its hints.' : ' Everything is done — see /complete for your summary and key!');
  }
  if (/(how (do|to)|solve|exploit|bypass|guide|step|help me|hint)/.test(low)) {
    const feat = f || (TESTS.find(t => !state.tests[t.id]) || {}).feature;
    if (!feat) return 'All tests are complete — congratulations! See /complete.';
    const att = state.attempts[feat] || 0;
    const openTests = TESTS.filter(t => t.feature === feat && !state.tests[t.id]);
    if (att >= 3 || openTests.length === 0) {
      if (!openTests.length) return 'You already completed every test in ' + feat + '. Well done!';
      return 'Step by step for ' + feat + ': ' + openTests.map(t => '"' + t.name + '" — ' + t.hints[2]).join('  •  ');
    }
    return 'That feature is locked for help. First try the ' + feat + ' tests yourself at least 3 times — I can see you\'ve tried ' + att + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  if (/(hi|hello|hey|help)\b/.test(low) || low.length < 3) {
    return 'Hello! I am the Lab Coach for LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '. This lab has ' + FEATURES.length + ' features and ' + TOTAL + ' tests; you are at ' + p.pct + '%. Ask me "how many tests in Booking & Payments", ask how to solve a feature (after 3 real tries), or ask about your progress.';
  }
  return 'I can help with: the test map (ask "how many tests in <feature>"), your progress, and step-by-step guidance for a feature once you have tried it at least 3 times. The full mission board is at /tests.';
}

/* ============================ auth routes ================================ */
function probe(req, email) {
  const ip = req.socket.remoteAddress || 'x';
  probeSets[ip] = probeSets[ip] || new Set();
  probeSets[ip].add(String(email).toLowerCase());
  if (probeSets[ip].size >= 5) pass('auth-enum');
}
function doLogin(req, res, user, extraHeaders) {
  const sid = 's' + (nextSession++) + Date.now().toString(36);
  sessions.set(sid, user.id);
  const hdrs = Object.assign({
    'Set-Cookie': ['hx_session=' + sid + '; Path=/; HttpOnly', 'hx_role=' + user.role + '; Path=/', 'hx_origin=hexatravel; Path=/'],
  }, extraHeaders || {});
  redirect(res, '/', hdrs);
}
async function routeAuth(req, res, url) {
  if (url.pathname === '/login' && req.method === 'GET') {
    return send(res, 200, page(req, 'Login', `<h2>Login</h2>
      <form method="POST" action="/login"><input type="hidden" name="hx_origin" value="hexatravel">
      <p>Email <input name="email" style="width:280px"></p><p>Password <input name="password" type="password"></p>
      <button>Login</button></form>
      <p style="color:#666;font-size:13px">Demo accounts (published for testers): admin@hexatravel.local / admin123 · agent@hexatravel.local / agent123 · alice@test.local / alice123 · bob@test.local / bob123</p>
      <p><a href="/forgot">Forgot password?</a></p>`));
  }
  if (url.pathname === '/login' && req.method === 'POST') {
    const b = await readBody(req);
    attempt('Login & Authentication');
    const email = String(b.email || ''), pw = String(b.password || '');
    if (SQLI_PAT.test(email) || SQLI_PAT.test(pw)) { pass('auth-sqli'); return doLogin(req, res, users[0]); }
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) { probe(req, email); return send(res, 200, page(req, 'Login', '<h2>Login</h2><p style="color:red">No account found for that email.</p><p><a href="/login">Try again</a></p>')); }
    if (user.password !== pw) {
      loginFailures[user.id] = (loginFailures[user.id] || 0) + 1;
      if (loginFailures[user.id] >= 10) pass('auth-brute');
      probe(req, email);
      return send(res, 200, page(req, 'Login', '<h2>Login</h2><p style="color:red">Incorrect password.</p><p><a href="/login">Try again</a></p>'));
    }
    loginFailures[user.id] = 0;
    if (user.isDefault && pw === 'admin123') pass('auth-default');
    return doLogin(req, res, user);
  }
  if (url.pathname === '/logout') {
    const c = parseCookies(req); sessions.delete(c.hx_session);
    return redirect(res, '/login', { 'Set-Cookie': 'hx_session=; Path=/; Max-Age=0' });
  }
  if (url.pathname === '/forgot' && req.method === 'GET') {
    return send(res, 200, page(req, 'Forgot password', `<h2>Forgot password</h2>
      <form method="POST" action="/forgot"><input type="hidden" name="hx_origin" value="hexatravel">
      <p>Email <input name="email" style="width:280px"></p><button>Send reset link</button></form>
      <h3>Already have a token?</h3>
      <form method="POST" action="/reset"><input type="hidden" name="hx_origin" value="hexatravel">
      <p>Email <input name="email" style="width:240px"></p><p>Token <input name="token" style="width:240px"></p>
      <p>New password <input name="newpassword" type="password"></p><button>Reset password</button></form>`));
  }
  if (url.pathname === '/forgot' && req.method === 'POST') {
    const b = await readBody(req);
    const user = users.find(u => u.email.toLowerCase() === String(b.email || '').toLowerCase());
    if (!user) { probe(req, b.email); return send(res, 200, page(req, 'Forgot password', '<p style="color:red">No account with that email exists.</p><p><a href="/forgot">Back</a></p>')); }
    probe(req, b.email);
    user.resetRequested = true; saveState();
    return send(res, 200, page(req, 'Forgot password', '<p>Reset link sent to ' + esc(user.email) + ' (check your inbox).</p>'));
  }
  if (url.pathname === '/reset' && req.method === 'POST') {
    const b = await readBody(req);
    attempt('Login & Authentication');
    const user = users.find(u => u.email.toLowerCase() === String(b.email || '').toLowerCase());
    if (user && String(b.token || '') === resetTokenFor(user)) {
      if (!user.resetRequested) pass('auth-reset');
      user.password = String(b.newpassword || 'changed123');
      user.resetRequested = false;
      return send(res, 200, page(req, 'Reset', '<p>Password updated. <a href="/login">Login</a></p>'));
    }
    return send(res, 200, page(req, 'Reset', '<p style="color:red">Invalid reset token.</p>'));
  }
  if (url.pathname === '/register' && req.method === 'GET') {
    return send(res, 200, page(req, 'Register', `<h2>Create account</h2>
      <form method="POST" action="/register"><input type="hidden" name="hx_origin" value="hexatravel">
      <p>Name <input name="name"></p><p>Email <input name="email"></p><p>Password <input name="password" type="password"></p>
      <button>Register</button></form>`));
  }
  if (url.pathname === '/register' && req.method === 'POST') {
    const b = await readBody(req);
    attempt('Registration & Profile');
    const name = String(b.name || 'New Traveller');
    const pw = String(b.password || '');
    if (pw.length < 8) pass('reg-weak');
    if (XSS_PAT.test(name)) pass('reg-xss');
    let role = 'traveller', credit = 0, elevated = false;
    if (b.role && ['agent', 'admin'].includes(String(b.role))) { role = String(b.role); elevated = true; }
    if (b.credit !== undefined && Number(b.credit) > 0) { credit = Number(b.credit); elevated = true; }
    if (elevated) pass('reg-mass');
    const user = { id: nextUserId++, name, email: String(b.email || ('user' + nextUserId + '@test.local')), password: pw || 'x', role, credit, resetRequested: false };
    users.push(user);
    return doLogin(req, res, user);
  }
  if (url.pathname === '/profile' && req.method === 'GET') {
    const u = currentUser(req); if (!u) return redirect(res, '/login');
    return send(res, 200, page(req, 'Profile', `<h2>Your profile</h2>
      <form method="POST" action="/profile"><input type="hidden" name="hx_origin" value="hexatravel">
      <p>Display name <input name="name" value="${esc(u.name)}"></p>
      <p>Email ${esc(u.email)} · Role ${esc(u.role)} · Credit $${esc(u.credit)}</p><button>Save profile</button></form>`));
  }
  if (url.pathname === '/profile' && req.method === 'POST') {
    const u = currentUser(req); if (!u) return redirect(res, '/login');
    const b = await readBody(req);
    attempt('Registration & Profile');
    if (!b.hx_origin) pass('reg-csrf');
    if (b.name) { if (XSS_PAT.test(String(b.name))) pass('reg-xss'); u.name = String(b.name); }
    return redirect(res, '/profile');
  }
  return null;
}

/* ============================ app routes ================================= */
function packageCard(pk) {
  return `<div style="border:1px solid #ddd;border-radius:10px;padding:14px;margin:10px 0">
    <b><a href="/package/${pk.id}">${esc(pk.name)}</a></b> — ${esc(pk.destination)} · $${pk.price} per person ·
    ${pk.seatsBooked >= pk.seats ? '<span style="color:red">SOLD OUT</span>' : (pk.seats - pk.seatsBooked) + ' seats left'}
    <br><span style="color:#555">${esc(pk.itinerary.split('.')[0])}.</span></div>`;
}
async function routeApp(req, res, url) {
  const u = currentUser(req);
  if (url.pathname === '/' && req.method === 'GET') {
    const q = url.searchParams.get('q');
    let list = packages.filter(pk => pk.listed);
    let note = '';
    if (q !== null) {
      attempt('Search & Packages');
      if (SQLI_PAT.test(q)) { list = packages.slice(); if (list.some(pk => !pk.listed)) pass('search-sqli'); }
      else list = list.filter(pk => (pk.name + ' ' + pk.destination).toLowerCase().includes(q.toLowerCase()));
      if (XSS_PAT.test(q)) pass('search-xss');
      note = '<p>Results for: ' + q + '</p>';
    }
    return send(res, 200, page(req, 'Packages', `<h2>Holiday packages</h2>
      <form method="GET" action="/"><input name="q" style="width:280px" placeholder="Search destinations…"> <button>Search</button></form>
      ${note}${list.map(packageCard).join('') || '<p>No packages found.</p>'}`));
  }
  const pm = url.pathname.match(/^\/package\/(\d+)$/);
  if (pm && req.method === 'GET') {
    const pk = packages.find(x => x.id === Number(pm[1]));
    if (!pk) return send(res, 404, page(req, 'Not found', '<h2>Package not found</h2>'));
    if (u && u.role === 'traveller') pass('pkg-notes');
    const revs = reviews.filter(r => r.packageId === pk.id);
    return send(res, 200, page(req, pk.name, `<h2>${esc(pk.name)}</h2>
      <p>${esc(pk.destination)} · <b>$${pk.price} per person</b> · ${pk.seatsBooked}/${pk.seats} seats booked</p>
      <p><b>Itinerary:</b> ${esc(pk.itinerary)}</p>
      <p style="background:#fff7d6;padding:8px"><b>Agent notes:</b> ${esc(pk.agentNotes)}</p>
      <h3>Book this package</h3>
      <form method="POST" action="/book"><input type="hidden" name="hx_origin" value="hexatravel">
      <input type="hidden" name="packageId" value="${pk.id}">
      <input type="hidden" name="pricePerPerson" value="${pk.price}">
      <p>Travellers <input name="travellers" type="number" value="2" min="1" style="width:70px">
      Paying for <input name="payFor" type="number" value="2" min="1" style="width:70px"></p>
      <p>Voucher <input name="voucher"> Second voucher <input name="voucher2"></p>
      <p>Total $ <input name="total" value="${pk.price * 2}" style="width:100px"></p>
      <button>Book &amp; pay (simulated)</button></form>
      <h3>Reviews</h3>${revs.map(r => '<p>★ ' + r.text + '</p>').join('') || '<p>No reviews yet.</p>'}
      <form method="POST" action="/package/${pk.id}/review"><input type="hidden" name="hx_origin" value="hexatravel">
      <input name="text" style="width:70%"> <button>Add review</button></form>`));
  }
  const rm = url.pathname.match(/^\/package\/(\d+)\/review$/);
  if (rm && req.method === 'POST') {
    if (!u) return redirect(res, '/login');
    const b = await readBody(req);
    attempt('Reviews');
    const text = String(b.text || '');
    if (XSS_PAT.test(text)) pass('review-xss');
    reviews.push({ id: nextReviewId++, packageId: Number(rm[1]), userId: u.id, text });
    return redirect(res, '/package/' + rm[1]);
  }
  if (url.pathname === '/book' && req.method === 'POST') {
    if (!u) return redirect(res, '/login');
    const b = await readBody(req);
    attempt('Booking & Payments');
    const pk = packages.find(x => x.id === Number(b.packageId));
    if (!pk) return send(res, 404, page(req, 'Not found', '<h2>Package not found</h2>'));
    const travellers = Math.max(1, parseInt(b.travellers, 10) || 1);
    const paidFor = Math.max(1, parseInt(b.payFor, 10) || travellers);
    const codes = [b.voucher, b.voucher2].map(x => String(x || '').trim().toUpperCase()).filter(Boolean);
    const valid = codes.filter(c => VOUCHERS[c]);
    if (valid.length >= 2) pass('voucher-stack');
    voucherUse[u.id] = voucherUse[u.id] || new Set();
    for (const c of valid) if (VOUCHERS[c].singleUse && voucherUse[u.id].has(c)) pass('voucher-reuse');
    const factor = valid.reduce((f, c) => f * (1 - VOUCHERS[c].pct / 100), 1);
    const expected = Math.round(pk.price * paidFor * factor * 100) / 100;
    const total = b.total !== undefined && b.total !== '' ? Number(b.total) : expected;
    if (!isNaN(total) && total < expected - 0.01) pass('book-price');
    if (travellers > paidFor) pass('book-count');
    if (pk.seatsBooked >= pk.seats) pass('book-soldout');
    for (const c of valid) if (VOUCHERS[c].singleUse) voucherUse[u.id].add(c);
    const r = { id: nextReservationId++, userId: u.id, packageId: pk.id, travellers, paidFor, total: isNaN(total) ? expected : total, voucher: valid.join('+'), status: 'confirmed' };
    reservations.push(r);
    pk.seatsBooked += travellers;
    const doc = { id: nextDocumentId++, reservationId: r.id, title: u.name + ' — ' + pk.name + ' itinerary & vouchers', file: 'doc-' + r.id + '.txt' };
    documents.push(doc);
    try { fs.writeFileSync(path.join(FILES_DIR, doc.file), 'HEXA TRAVEL — TRAVEL DOCUMENT\nBooking #' + r.id + ' · ' + pk.name + '\nTraveller: ' + u.name + '\nItinerary: ' + pk.itinerary + '\n'); } catch (e) {}
    return redirect(res, '/reservation/' + r.id);
  }
  if (url.pathname === '/my' && req.method === 'GET') {
    if (!u) return redirect(res, '/login');
    const mine = reservations.filter(r => r.userId === u.id);
    return send(res, 200, page(req, 'My bookings', '<h2>My bookings</h2>' + (mine.map(r => {
      const pk = packages.find(x => x.id === r.packageId) || {};
      return '<p><a href="/reservation/' + r.id + '">Booking #' + r.id + '</a> — ' + esc(pk.name || '?') + ' · ' + r.travellers + ' traveller(s) · $' + r.total + ' · ' + esc(r.status) + '</p>';
    }).join('') || '<p>No bookings yet.</p>')));
  }
  const resm = url.pathname.match(/^\/reservation\/(\d+)$/);
  if (resm && req.method === 'GET') {
    if (!u) return redirect(res, '/login');
    attempt('Reservations & Documents');
    const r = reservations.find(x => x.id === Number(resm[1]));
    if (!r) return send(res, 404, page(req, 'Not found', '<h2>Booking not found</h2>'));
    if (r.userId !== u.id) pass('res-idor');
    const pk = packages.find(x => x.id === r.packageId) || {};
    const owner = users.find(x => x.id === r.userId) || {};
    const docs = documents.filter(d => d.reservationId === r.id);
    return send(res, 200, page(req, 'Booking #' + r.id, `<h2>Booking #${r.id} — ${esc(pk.name || '')}</h2>
      <p>Traveller: ${esc(owner.name || '')} · Travellers: ${r.travellers} (paid for ${r.paidFor}) · Total paid: $${r.total} · Status: ${esc(r.status)}</p>
      <p><b>Itinerary:</b> ${esc(pk.itinerary || '')}</p>
      <h3>Travel documents</h3>${docs.map(d => '<p><a href="/document/' + d.id + '">' + esc(d.title) + '</a> · <a href="/download?file=' + esc(d.file) + '">download</a></p>').join('')}`));
  }
  const docm = url.pathname.match(/^\/document\/(\d+)$/);
  if (docm && req.method === 'GET') {
    if (!u) return redirect(res, '/login');
    attempt('Reservations & Documents');
    const d = documents.find(x => x.id === Number(docm[1]));
    if (!d) return send(res, 404, page(req, 'Not found', '<h2>Document not found</h2>'));
    const r = reservations.find(x => x.id === d.reservationId);
    if (r && r.userId !== u.id) pass('doc-idor');
    let content = '(document file)';
    try { content = fs.readFileSync(path.join(FILES_DIR, d.file), 'utf8'); } catch (e) {}
    return send(res, 200, page(req, d.title, '<h2>' + esc(d.title) + '</h2><pre>' + esc(content) + '</pre>'));
  }
  if (url.pathname === '/download' && req.method === 'GET') {
    if (!u) return redirect(res, '/login');
    attempt('Reservations & Documents');
    const name = url.searchParams.get('file') || '';
    const target = path.resolve(FILES_DIR, name);
    if (!target.startsWith(FILES_DIR) && fs.existsSync(target)) pass('doc-traversal');
    if (fs.existsSync(target) && fs.statSync(target).isFile()) return send(res, 200, fs.readFileSync(target, 'utf8'), { 'Content-Type': 'text/plain; charset=utf-8' });
    return send(res, 404, 'Not found', { 'Content-Type': 'text/plain' });
  }
  if (url.pathname === '/agent' && req.method === 'GET') {
    if (!u) return redirect(res, '/login');
    const c = parseCookies(req);
    if (c.hx_role === 'agent' || c.hx_role === 'admin') {
      if (u.role === 'traveller') pass('auth-cookie');
      const rows = packages.map(pk => '<tr><td>' + esc(pk.name) + '</td><td>$' + pk.price + '</td><td>' + esc(pk.agentNotes) + '</td></tr>').join('');
      return send(res, 200, page(req, 'Agent console', '<h2>Agent console — fare rules</h2><table border="1" cellpadding="6">' + rows + '</table>'));
    }
    return send(res, 403, page(req, 'Forbidden', '<h2>403 — agents only</h2>'));
  }
  if (url.pathname === '/admin' && req.method === 'GET') {
    if (!u) return redirect(res, '/login');
    if (u.role !== 'admin') pass('admin-bac');
    const rows = users.map(x => '<tr><td>' + x.id + '</td><td>' + esc(x.name) + '</td><td>' + esc(x.email) + '</td><td>' + esc(x.role) + '</td></tr>').join('');
    const pkRows = packages.map(pk => '<tr><td>' + esc(pk.name) + '</td><td><form method="POST" action="/admin/package/delete"><input type="hidden" name="hx_origin" value="hexatravel"><input type="hidden" name="id" value="' + pk.id + '"><button>Delete</button></form></td></tr>').join('');
    return send(res, 200, page(req, 'Admin', '<h2>Admin console</h2><h3>Users</h3><table border="1" cellpadding="6">' + rows + '</table><h3>Packages</h3><table border="1" cellpadding="6">' + pkRows + '</table>'));
  }
  if (url.pathname === '/admin/package/delete' && req.method === 'POST') {
    if (!u) return redirect(res, '/login');
    const b = await readBody(req);
    attempt('Admin Panel');
    if (!b.hx_origin) pass('admin-csrf');
    const i = packages.findIndex(x => x.id === Number(b.id));
    if (i >= 0) packages.splice(i, 1);
    return redirect(res, '/admin');
  }
  if (url.pathname === '/api/bookings' && req.method === 'GET') {
    attempt('Platform & API');
    const token = req.headers['x-api-token'] || '';
    const user = users.find(x => Buffer.from(x.email).toString('base64') === token);
    if (!user) return sendJson(res, 401, { error: 'invalid api token' });
    pass('api-token');
    return sendJson(res, 200, { user: user.email, bookings: reservations.filter(r => r.userId === user.id) });
  }
  if (url.pathname === '/api/debug' && req.method === 'GET') {
    attempt('Platform & API');
    pass('api-debug');
    return sendJson(res, 200, { users, packages: packages.map(p => p.id), sessions: sessions.size });
  }
  return null;
}

/* ====================== tests / complete / certificate =================== */
function routeSystem(req, res, url) {
  if (url.pathname === '/tests' && req.method === 'GET') {
    const p = progressData();
    let html = '<h2>Mission Board — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h2><p>' + p.done + '/' + p.total + ' tests · ' + p.pct + '%</p>';
    for (const f of FEATURES) {
      html += '<h3>' + esc(f) + ' <span style="color:#666;font-size:13px">(attempts: ' + (state.attempts[f] || 0) + ')</span></h3>';
      for (const t of TESTS.filter(x => x.feature === f)) {
        const done = !!state.tests[t.id];
        html += `<div style="border:1px solid #ddd;border-radius:8px;padding:10px;margin:8px 0">
          <b>${done ? '✓' : '○'} ${esc(t.name)}</b> · ${esc(t.owasp)} · ${esc(t.difficulty)}
          <details><summary>Hints</summary><ol>${t.hints.map(h => '<li>' + esc(h) + '</li>').join('')}</ol></details></div>`;
      }
    }
    return send(res, 200, page(req, 'Mission Board', html));
  }
  if (url.pathname === '/complete' && req.method === 'GET') {
    const p = progressData();
    if (!p.complete) {
      const left = TESTS.filter(t => !state.tests[t.id]);
      return send(res, 200, page(req, 'Completion', '<h2>Not complete yet — ' + p.pct + '%</h2><p>' + p.done + '/' + p.total + ' tests done. Still open:</p><ul>' + left.map(t => '<li>' + esc(t.name) + ' (' + esc(t.feature) + ')</li>').join('') + '</ul>'));
    }
    const sections = [
      ['1 · Features in this lab', FEATURES.length + ' features: ' + FEATURES.map(f => f + ' (' + TESTS.filter(t => t.feature === f).length + ' vulnerabilities)').join(', ') + '.'],
      ['2 · Vulnerabilities per feature', FEATURES.map(f => f + ': ' + TESTS.filter(t => t.feature === f).length).join(' · ')],
      ['3 · How testing was done (' + TOTAL + ' techniques)', TESTS.map(t => t.name).join(' · ')],
      ['4 · What you learned', TESTS.map(t => '<li>' + esc(t.lesson) + '</li>').join('')],
      ['5 · What this means for a real client', TESTS.map(t => '<li>' + esc(t.impact) + '</li>').join('')],
      ['6 · Writing it in a real report', TESTS.map(t => '<li><b>' + esc(t.report.title) + '</b> — ' + esc(t.report.severity) + ' — Fix: ' + esc(t.report.remediation) + '</li>').join('')],
    ];
    const body = '<h2>🎉 LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ' — 100% complete</h2>' +
      sections.map(s => '<h3>' + s[0] + '</h3>' + (s[1].startsWith('<li>') ? '<ul>' + s[1] + '</ul>' : '<p>' + s[1] + '</p>')).join('') +
      `<h3>Your completion key</h3><p style="font-size:20px;background:#eef;padding:12px;border-radius:8px"><b>${completionKey()}</b></p>
       <p>Paste this key into the next lab to unlock it.</p>
       <form method="POST" action="/complete/name"><p>Your name for the certificate: <input name="name" value="${esc(state.testerName)}"> <button>Save name</button></p></form>
       <p><a href="/certificate">View your certificate →</a></p>`;
    return send(res, 200, page(req, 'Completion summary', body));
  }
  if (url.pathname === '/complete/name' && req.method === 'POST') {
    return readBody(req).then(b => { state.testerName = String(b.name || '').slice(0, 60); saveState(); redirect(res, '/complete'); });
  }
  if (url.pathname === '/certificate' && req.method === 'GET') {
    const p = progressData();
    if (!p.complete) return send(res, 200, page(req, 'Certificate', '<h2>Certificate locked</h2><p>Complete 100% of the tests first (' + p.pct + '% so far).</p>'));
    const name = state.testerName || (currentUser(req) || {}).name || 'HexaCyberLab Tester';
    const date = state.completedAt ? new Date(state.completedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    return send(res, 200, `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER}</title>
      <style>@media print{body{background:#fff}}</style></head><body style="background:#eceaf4;font-family:Georgia,serif">
      <div style="max-width:720px;margin:50px auto;background:#fff;border:3px solid #5b2ea6;border-radius:14px;padding:44px;text-align:center">
      <img src="/logo.png" style="height:70px"><h1 style="color:#5b2ea6">Certificate of Completion</h1>
      <p>This certifies that</p><h2>${esc(name)}</h2>
      <p>has completed 100% of the security tests in <b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b><br>(${p.total} tests across ${FEATURES.length} features)</p>
      <p>Completed on ${date}</p><hr style="width:50%">
      <p style="font-size:14px">HexaCyberLab — Built by Md. Jony Hassain, Founder</p></div></body></html>`);
  }
  if (url.pathname === '/api/progress' && req.method === 'GET') return sendJson(res, 200, progressData());
  return null;
}

/* --- key shards, region 4 of 4 (completion, second half) --- */
const _cB = ["LVdUUA==","UUlLSA==","UjU1Rg=="];

/* ============================ docs generator ============================= */
function genDocs() {
  const byFeature = f => TESTS.filter(t => t.feature === f);
  let vuln = '# HexaTravel (LAB 71) — Vulnerabilities\n\n' + TOTAL + ' scored tests across ' + FEATURES.length + ' features. Every item below is a real, working flaw in the app, detected server-side when exploited.\n';
  for (const f of FEATURES) {
    vuln += '\n## ' + f + '\n';
    for (const t of byFeature(f)) vuln += '\n### ' + t.name + '\n- OWASP: ' + t.owasp + ' · Difficulty: ' + t.difficulty + '\n- Lesson: ' + t.lesson + '\n- Impact: ' + t.impact + '\n- Report: **' + t.report.title + '** (' + t.report.severity + ') — ' + t.report.remediation + '\n';
  }
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'), vuln);
  let guide = '# HexaTravel (LAB 71) — Practice Guide\n\nChallenges grouped by feature, then difficulty. Pass each test by actually performing the exploit — the server detects the real effect. Hints are also on the in-app Mission Board (/tests), and the Lab Coach unlocks step-by-step help after 3 genuine attempts on a feature.\n';
  const order = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  for (const f of FEATURES) {
    guide += '\n## ' + f + '\n';
    for (const t of byFeature(f).sort((a, b) => order[a.difficulty] - order[b.difficulty])) {
      guide += '\n### ' + t.name + ' (' + t.difficulty + ')\n- Objective: make the "' + t.id + '" test flip to done on /tests by exploiting the flaw end-to-end.\n- Hints:\n' + t.hints.map((h, i) => '  ' + (i + 1) + '. ' + h).join('\n') + '\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'), guide);
  let fix = '# HexaTravel (LAB 71) — Fix & Retest\n\nFor every scored test: the secure implementation and the regression check that proves the fix.\n';
  for (const f of FEATURES) {
    fix += '\n## ' + f + '\n';
    for (const t of byFeature(f)) fix += '\n### ' + t.report.title + ' (' + t.report.severity + ')\n- Fix: ' + t.report.remediation + '\n- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("' + t.name + '"); it must now fail (no pass recorded, no effect on data), while the legitimate flow still works.\n';
  }
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'), fix);
  console.log('docs generated: ' + TOTAL + ' tests, ' + FEATURES.length + ' features');
}

/* ============================ main router ================================ */
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:' + PORT);
    if (url.pathname === '/logo.png') {
      try { return send(res, 200, fs.readFileSync(path.join(DIR, 'logo.png')), { 'Content-Type': 'image/png' }); }
      catch (e) { return send(res, 404, 'no logo', { 'Content-Type': 'text/plain' }); }
    }
    if (url.pathname === '/api/chat' && req.method === 'POST') {
      const raw = await readBody(req).catch(() => ({}));
      let msg = raw && raw.message;
      if (typeof msg !== 'string') {
        // tolerate raw/non-JSON bodies gracefully
        msg = '';
      }
      return sendJson(res, 200, { reply: chatReply(msg) });
    }
    if (url.pathname === '/api/progress' && req.method === 'GET') return sendJson(res, 200, progressData());
    if (url.pathname === '/unlock' && req.method === 'POST') {
      const b = await readBody(req);
      if (String(b.key || '') === entryKey()) { state.unlocked = true; saveState(); return redirect(res, '/'); }
      return send(res, 403, gatePage());
    }
    if (!state.unlocked) return send(res, 200, gatePage());
    let r = await routeAuth(req, res, url); if (r !== null && r !== undefined) return;
    r = await routeApp(req, res, url); if (r !== null && r !== undefined) return;
    r = routeSystem(req, res, url); if (r !== null && r !== undefined) return;
    return send(res, 404, page(req, 'Not found', '<h2>404 — page not found</h2>'));
  } catch (e) {
    try { send(res, 500, 'Internal error', { 'Content-Type': 'text/plain' }); } catch (e2) {}
  }
});

if (process.argv.includes('--gen-docs')) { genDocs(); process.exit(0); }
try { fs.mkdirSync(FILES_DIR, { recursive: true }); } catch (e) {}
server.listen(PORT, '127.0.0.1', () => console.log('LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ' listening on http://127.0.0.1:' + PORT));
