'use strict';
/* =====================================================================
   HexaHotel — LAB 72 (Category 8: Travel, Hospitality & Transport)
   A deliberately vulnerable hotel booking platform for authorised
   security training. Zero-dependency Node.js. LOCAL USE ONLY.
   All data is fake seed data. Never deploy this publicly.
   ===================================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3081;
const LAB_NUMBER = 72;
const LAB_NAME = 'HexaHotel';
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');

/* ---------- Completion-key shards (see ENGINE SPEC §7) ----------
   Each key exists ONLY as base64-of-reversed pieces, scattered in
   different regions of this file. Never write a key in plain text. */

const _c1 = ["TC1YSA==","Ty0zNw==","VTNUWA=="];

/* ---------------- Progress state (§4) ---------------- */
let state = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadState() {
  try {
    const raw = fs.readFileSync(PROGRESS_FILE, 'utf8');
    const s = JSON.parse(raw);
    if (s && typeof s === 'object') state = Object.assign(state, s);
  } catch (e) { /* fresh install */ }
}
function saveState() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2)); } catch (e) {}
}
loadState();

/* ---------------- TESTS registry (§3) ---------------- */
const TESTS = [
  /* ----- Login & Authentication ----- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL injection login bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login form builds its query by gluing your input straight into a string.', 'A quote character can break out of the email value in that string.', "Try an email like admin@hexahotel.local' OR '1'='1 with any password."],
    lesson: 'String-built SQL queries let an attacker rewrite the query logic and log in without a password.',
    impact: 'On a real hotel site this hands an attacker instant access to guest accounts — names, stay dates and payment details — with no password at all.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute force — no rate limit or lockout', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Nothing slows you down when a password guess is wrong.', 'Count what happens after many wrong passwords for the same account.', 'Send 10+ wrong passwords for alice@test.local — the 10th is still processed normally.'],
    lesson: 'Without throttling or lockout, attackers can guess passwords forever until one works.',
    impact: 'Guest accounts on a real booking platform fall to automated password guessing, exposing trips and stored payment methods.',
    report: { title: 'No Rate Limiting or Account Lockout on Login', severity: 'High', remediation: 'Add progressive delays, lockout and alerting after repeated failed logins; require MFA for staff.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User enumeration via differing error messages', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the login error for an email that exists with one that does not.', 'The forgot-password page answers differently too.', 'Probe at least 5 different emails across login / forgot-password and watch the responses split into two kinds.'],
    lesson: 'Different errors for "no such account" and "wrong password" let attackers harvest valid accounts before attacking them.',
    impact: 'Attackers build a verified list of real guest emails from a hotel site, then target exactly those people with phishing and password attacks.',
    report: { title: 'Account Enumeration Through Authentication Error Messages', severity: 'Medium', remediation: 'Return one generic error ("invalid credentials") for every failed login or reset request.' } },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Default administrator credentials', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Installers often ship with a well-known admin password that never gets changed.', 'The platform admin email follows the pattern admin@<domain>.', 'Try admin@hexahotel.local with the classic default password admin123.'],
    lesson: 'Default credentials are public knowledge; any system still using them is effectively unauthenticated.',
    impact: 'A real hotel platform left on default admin credentials gives an attacker full control — every booking, every guest, every invoice.',
    report: { title: 'Default Administrative Credentials in Use', severity: 'Critical', remediation: 'Force a unique strong password at first setup; disable or rename default accounts.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable password-reset token', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['Ask for a reset and look at how the token is shaped — it is derived from something public.', 'The only variable input is the account\'s numeric user id.', 'The token looks like HH<id>-<a number computed from the id>. Work out the formula from your own account, then forge one for the admin.'],
    lesson: 'Reset tokens must be long, random and single-use; a token computed from a public id can be forged for any account.',
    impact: 'Anyone can reset the password of any guest or staff account on a real hotel site and take it over completely.',
    report: { title: 'Password Reset Tokens Are Predictable', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), expire them quickly and invalidate after use.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Session role trusted from a client cookie', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After login, look at the cookies the app sets — one of them repeats your role.', 'Some pages trust that cookie instead of the server-side session.', 'As a normal guest, set your hx_role cookie to admin and open /admin.'],
    lesson: 'Authorisation decisions must come from server-side session data, never from values the client can edit.',
    impact: 'Any guest can promote themselves to administrator on a real hotel platform just by editing a cookie.',
    report: { title: 'Broken Access Control — Role Read From Client Cookie', severity: 'High', remediation: 'Derive roles exclusively from the server-side session; ignore client-supplied role values.' } },

  /* ----- Registration & Profile ----- */
  { id: 'reg-weak', feature: 'Registration & Profile', name: 'Weak password policy on registration', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['How short a password will the registration form accept?', 'There is no minimum length or complexity check at all.', 'Register a new account with a 1-character password.'],
    lesson: 'Weak password policies fill the database with accounts that fall to the first guessing attempt.',
    impact: 'Guests who pick tiny passwords on a real hotel site have their accounts — and travel plans — taken over trivially.',
    report: { title: 'Weak Password Policy Allows Trivial Passwords', severity: 'Medium', remediation: 'Enforce a minimum length (≥10) and screen against known-breached password lists.' } },
  { id: 'reg-mass', feature: 'Registration & Profile', name: 'Mass assignment — role set at registration', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration handler copies the whole submitted form into the new user record.', 'What fields does a real user record have that the form never shows?', 'Register while adding a form field role=admin to the request.'],
    lesson: 'Binding request data directly to data models lets attackers set fields that were never meant to be user-controlled.',
    impact: 'Attackers mint themselves staff or admin accounts on a real booking platform during normal sign-up.',
    report: { title: 'Mass Assignment Allows Privilege Escalation at Registration', severity: 'High', remediation: 'Whitelist the exact fields each endpoint may set; never bind raw request bodies to models.' } },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in display name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is printed back on pages other people see — including staff pages.', 'Nothing escapes HTML in the name field.', 'Register (or rename yourself) with a name containing a <script> or <img onerror> payload.'],
    lesson: 'Any user-controlled text rendered without escaping becomes stored XSS that fires in other users\' browsers.',
    impact: 'A malicious guest name can run JavaScript in the front-desk or admin browser on a real hotel system, hijacking staff sessions.',
    report: { title: 'Stored Cross-Site Scripting in User Display Name', severity: 'High', remediation: 'Contextually escape all user-supplied output; add a Content-Security-Policy header.' } },
  { id: 'prof-csrf', feature: 'Registration & Profile', name: 'CSRF on profile update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Legit profile forms carry a hidden hx_origin marker field — nothing checks cross-site posts that omit it.', 'The update endpoint accepts a plain POST from anywhere while you are logged in.', 'Submit the profile form fields (name/email) WITHOUT the hx_origin field, as a cross-site form would.'],
    lesson: 'State-changing endpoints without anti-CSRF tokens can be triggered by any website a logged-in user visits.',
    impact: 'A guest browsing a malicious page could have their hotel account name and contact email silently changed.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require a per-session anti-CSRF token on every state-changing request and validate Origin/Referer.' } },

  /* ----- Rooms & Search ----- */
  { id: 'search-sqli', feature: 'Rooms & Search', name: 'SQL injection in room search reveals hidden rooms', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['The room search passes your text into the same kind of string-built query as the login.', 'A successful injection makes the filter match everything — including rooms that are not listed publicly.', "Search for ' OR '1'='1 and compare the room list with a normal search."],
    lesson: 'Search boxes are injection points too; a broken filter can dump records the UI was supposed to hide.',
    impact: 'Unlisted rooms, staff rates and internal inventory on a real hotel site leak to anyone who asks the search box correctly.',
    report: { title: 'SQL Injection in Room Search Exposes Unlisted Inventory', severity: 'High', remediation: 'Parameterise search queries and enforce listing/visibility filters server-side.' } },
  { id: 'search-xss', feature: 'Rooms & Search', name: 'Reflected XSS in room search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your search text is echoed back in the results heading.', 'It is echoed without escaping.', 'Search for a <script> payload and view the page source.'],
    lesson: 'Reflected input must be escaped; otherwise a crafted link runs script in the victim\'s session.',
    impact: 'Attackers send guests or staff a poisoned search link for a real hotel site and steal sessions when it is opened.',
    report: { title: 'Reflected Cross-Site Scripting in Search', severity: 'Medium', remediation: 'Escape reflected values in HTML output; validate and encode search input.' } },

  /* ----- Bookings ----- */
  { id: 'book-rate', feature: 'Bookings', name: 'Nightly rate tampering in booking', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The booking form carries the nightly rate in a hidden field — and the server believes it.', 'Prices must always be recomputed on the server from the room catalogue.', 'Book a Suite but change the submitted rate field to 1.'],
    lesson: 'Any price the client sends can be edited; totals must be calculated server-side from trusted data.',
    impact: 'Guests book premium rooms for pennies on a real hotel site — direct revenue loss that scales with automation.',
    report: { title: 'Client-Side Price Tampering in Booking Flow', severity: 'High', remediation: 'Ignore client-supplied prices; recompute totals server-side from the catalogue at booking time.' } },
  { id: 'book-full', feature: 'Bookings', name: 'Booking a fully-booked room type', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The Deluxe type has exactly 1 room. Another guest already holds it for 10–12 Nov 2026.', 'Availability shown on the page is not re-checked when the booking is saved.', 'Book the Deluxe room for the same dates anyway.'],
    lesson: 'Availability must be enforced inside the booking transaction, not just displayed in the UI.',
    impact: 'Overbooking on a real hotel platform means guests arrive to no room — refunds, compensation and reputation damage.',
    report: { title: 'Missing Availability Enforcement Allows Overbooking', severity: 'High', remediation: 'Check inventory atomically at booking time and reject when capacity is exhausted.' } },
  { id: 'book-idor', feature: 'Bookings', name: 'Booking IDOR — view another guest\'s booking', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Booking pages live at predictable sequential URLs.', 'The page never checks that the booking belongs to you.', 'Open a booking id that is not yours (seed bookings start at 5001).'],
    lesson: 'Every object access needs an ownership check; sequential ids make guessing trivial.',
    impact: 'Strangers read other guests\' names, dates and room details on a real hotel site — a serious privacy breach.',
    report: { title: 'Insecure Direct Object Reference on Booking Details', severity: 'High', remediation: 'Verify the session user owns (or staff-manages) every booking before serving it.' } },
  { id: 'book-dates', feature: 'Bookings', name: 'Date / nights manipulation — pay for fewer nights', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The booking form also trusts a client-supplied "nights" value for the total.', 'The stored dates and the charged nights are never compared.', 'Book 3 nights of dates but submit nights=1.'],
    lesson: 'Derived values (nights, totals) must be computed from the authoritative inputs on the server.',
    impact: 'Guests stay three nights and pay for one on a real hotel site — silent, repeatable revenue leakage.',
    report: { title: 'Booking Total Uses Client-Supplied Nights Value', severity: 'High', remediation: 'Compute nights from the validated check-in/check-out dates server-side; ignore client totals.' } },
  { id: 'book-cancel', feature: 'Bookings', name: 'Cancel another guest\'s booking', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The cancel action trusts the booking id in the request.', 'No ownership check stands between you and someone else\'s reservation.', 'Cancel a booking that belongs to another guest.'],
    lesson: 'Destructive actions need the same ownership checks as reads — often stricter.',
    impact: 'Attackers cancel strangers\' reservations on a real hotel platform, sabotaging trips and the business alike.',
    report: { title: 'Missing Authorisation on Booking Cancellation', severity: 'High', remediation: 'Check booking ownership (or staff role) before applying any state change.' } },

  /* ----- Extras & Charges ----- */
  { id: 'extra-free', feature: 'Extras & Charges', name: 'Free extras via forged extra price', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Adding an extra sends the extra\'s price along with its id.', 'The server stores whatever price arrives instead of the catalogue price.', 'Add Spa access to your booking with price=0.'],
    lesson: 'Line-item prices are server data; accepting them from the client invites free goods.',
    impact: 'Breakfast, parking and spa charges quietly vanish from bills on a real hotel system — death by a thousand cuts.',
    report: { title: 'Client-Supplied Pricing Accepted for Booking Extras', severity: 'Medium', remediation: 'Look up extra prices server-side by id; never accept a price field from the client.' } },
  { id: 'extra-idor', feature: 'Extras & Charges', name: 'Add extras to another guest\'s booking', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The extras endpoint takes a booking id — any booking id.', 'Adding charges to someone else\'s stay is not checked.', 'Add a chargeable extra to a booking owned by another guest.'],
    lesson: 'Write endpoints on foreign objects are IDOR too, not just reads.',
    impact: 'Attackers inflate strangers\' hotel bills with unwanted extras, causing disputes and chargebacks.',
    report: { title: 'IDOR Allows Modifying Other Guests\' Bookings', severity: 'High', remediation: 'Authorise every mutation against the booking\'s owner or a staff role.' } },

  /* ----- Check-in & Front Desk ----- */
  { id: 'desk-checkin', feature: 'Check-in & Front Desk', name: 'Guest performs front-desk check-in', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The front-desk check-in endpoint exists and works — the question is who may call it.', 'The page is staff-only, but the POST behind it never checks the role.', 'As a guest, POST a booking id to /frontdesk/checkin (your own or anyone\'s).'],
    lesson: 'Hiding a page is not access control; every endpoint must verify the caller\'s role itself.',
    impact: 'Guests check themselves (or strangers) in and out on a real hotel system, breaking billing and room status.',
    report: { title: 'Missing Role Check on Front-Desk Check-In Endpoint', severity: 'High', remediation: 'Enforce staff role server-side on every front-desk action.' } },
  { id: 'desk-override', feature: 'Check-in & Front Desk', name: 'Guest uses front-desk rate override', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    hints: ['Front desk can override a booking\'s nightly rate for service recovery.', 'That override endpoint also skips the staff check.', 'As a guest, POST /frontdesk/override with a booking id and a tiny new rate.'],
    lesson: 'Privileged business operations need authorisation at the operation, not just at the menu that links to it.',
    impact: 'Any guest can rewrite their rate to almost nothing on a real hotel platform using a staff-only tool.',
    report: { title: 'Unauthorised Access to Staff Rate-Override Function', severity: 'High', remediation: 'Require and verify the front-desk/admin role inside the override handler; log all overrides.' } },

  /* ----- Invoices & Payments ----- */
  { id: 'inv-idor', feature: 'Invoices & Payments', name: 'Invoice IDOR — view another guest\'s invoice', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Invoices have their own sequential ids starting at 1001.', 'The invoice page does not check ownership either.', 'Open an invoice belonging to another guest.'],
    lesson: 'Financial documents are sensitive objects and need the same ownership enforcement as the booking itself.',
    impact: 'Strangers read other guests\' full bills on a real hotel site — amounts, dates, personal details.',
    report: { title: 'Insecure Direct Object Reference on Invoices', severity: 'High', remediation: 'Check invoice ownership before display or download.' } },
  { id: 'inv-tamper', feature: 'Invoices & Payments', name: 'Settle invoice in full with a partial payment', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The pay endpoint accepts an amount — and a client flag claiming the payment settles the bill.', 'The server marks the invoice PAID from the flag instead of the money received.', 'Pay 1 toward a large invoice with settle=full.'],
    lesson: 'Payment state must be derived from verified amounts, never from client assertions.',
    impact: 'Guests close out large hotel bills for a token payment — direct, provable financial loss.',
    report: { title: 'Invoice Marked Paid Without Full Payment', severity: 'Critical', remediation: 'Mark invoices paid only when cumulative verified payments cover the amount due.' } },

  /* ----- Admin Panel ----- */
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'CSRF on admin room-rate change', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Admin forms also carry the hx_origin marker — and the rate-change handler also fails to require it.', 'You need a real admin session for this one (see the Authentication tests).', 'As admin, POST /admin/rooms/<id>/rate with a new rate and NO hx_origin field.'],
    lesson: 'Admin actions are the highest-value CSRF targets; tokens must be verified there most of all.',
    impact: 'A tricked admin visit to a malicious page could slash (or spike) room rates on a real hotel platform.',
    report: { title: 'Missing CSRF Protection on Administrative Rate Change', severity: 'High', remediation: 'Validate anti-CSRF tokens on all admin state changes; use SameSite cookies as defence in depth.' } },

  /* ----- Platform & API ----- */
  { id: 'api-weak', feature: 'Platform & API', name: 'Weak API token — base64 of email', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['The JSON API authenticates with a Bearer token derived from the account email.', 'The derivation is a common encoding, not a secret.', 'Call GET /api/bookings with Authorization: Bearer base64(someone\'s email).'],
    lesson: 'API tokens must be unguessable random secrets; encoding an identifier is not authentication.',
    impact: 'Anyone who knows a guest\'s email address can pull their bookings from a real hotel API.',
    report: { title: 'Predictable API Authentication Tokens', severity: 'High', remediation: 'Issue random, revocable API tokens; store only hashes server-side.' } },
  { id: 'plat-debug', feature: 'Platform & API', name: 'Unauthenticated debug endpoint dumps accounts', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Developers leave diagnostic endpoints behind — try the obvious name under /api.', 'This one needs no login at all.', 'Fetch GET /api/debug.'],
    lesson: 'Debug and diagnostic endpoints must never ship to production; they bypass every other control.',
    impact: 'A single URL hands out every account — including passwords — on a real hotel platform. Game over in one request.',
    report: { title: 'Debug Endpoint Exposes All User Accounts and Passwords', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; store passwords hashed with a strong KDF.' } }
];
const TEST_BY_ID = {}; TESTS.forEach(t => TEST_BY_ID[t.id] = t);
const FEATURES = []; TESTS.forEach(t => { if (!FEATURES.includes(t.feature)) FEATURES.push(t.feature); });

function pass(id) {
  if (!TEST_BY_ID[id]) return;
  if (!state.tests[id]) {
    state.tests[id] = true;
    if (Object.keys(state.tests).length >= TESTS.length && !state.completedAt) {
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
function doneCount() { return Object.keys(state.tests).filter(id => state.tests[id]).length; }
function pct() { return Math.floor(doneCount() * 100 / TESTS.length); }
function featureStats(f) {
  const list = TESTS.filter(t => t.feature === f);
  return { total: list.length, done: list.filter(t => state.tests[t.id]).length, attempts: state.attempts[f] || 0 };
}

/* ---------- More key shards, scattered (see §7) ---------- */

const _c2 = ["LTFWVQ==","OTJKRQ==","U0lLNw=="];
function _unshard(parts) {
  return parts.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}
const ENTRY_KEY_SHA256 = 'a95d71de6888616a6489f19e8c33920ef8f9e64ce5d2cca566dde9ab9fc79beb';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */
function completionKey() { return _unshard(_c1.concat(_c2)); }

/* ---------------- Seed data (all fake) ---------------- */
let nextUserId = 5, nextBookingId = 5003, nextInvoiceId = 1003;
const users = [
  { id: 1, name: 'Hotel Admin', email: 'admin@hexahotel.local', password: 'admin123', role: 'admin', defaultCred: true, issuedTokens: [] },
  { id: 2, name: 'Freddie Frontdesk', email: 'desk@hexahotel.local', password: 'desk123', role: 'frontdesk', issuedTokens: [] },
  { id: 3, name: 'Alice Guest', email: 'alice@test.local', password: 'alice123', role: 'guest', issuedTokens: [] },
  { id: 4, name: 'Bob Guest', email: 'bob@test.local', password: 'bob123', role: 'guest', issuedTokens: [] }
];
const roomTypes = [
  { id: 1, name: 'Standard Room', rate: 80, inventory: 2, listed: true, desc: 'Queen bed, city view, free Wi-Fi.' },
  { id: 2, name: 'Deluxe Room', rate: 150, inventory: 1, listed: true, desc: 'King bed, balcony, breakfast included.' },
  { id: 3, name: 'Suite', rate: 300, inventory: 1, listed: true, desc: 'Separate lounge, sea view, late checkout.' },
  { id: 4, name: 'Penthouse (staff only)', rate: 900, inventory: 1, listed: false, desc: 'Unlisted internal inventory — not for public sale.' }
];
const extrasCatalogue = [
  { id: 1, name: 'Breakfast', price: 15 },
  { id: 2, name: 'Parking', price: 10 },
  { id: 3, name: 'Spa access', price: 40 }
];
const bookings = [
  { id: 5001, userId: 4, roomTypeId: 2, checkin: '2026-11-10', checkout: '2026-11-12', nights: 2, rate: 150, extras: [], total: 300, status: 'booked' },
  { id: 5002, userId: 3, roomTypeId: 1, checkin: '2026-11-15', checkout: '2026-11-17', nights: 2, rate: 80, extras: [], total: 160, status: 'booked' }
];
const invoices = [
  { id: 1001, bookingId: 5001, userId: 4, amount: 300, paid: 300, status: 'paid' },
  { id: 1002, bookingId: 5002, userId: 3, amount: 160, paid: 0, status: 'open' }
];
const sessions = new Map(); // sid -> userId
const loginFails = {};      // email -> failed count
const enumProbes = new Map(); // sid -> Set of probed emails

/* ---------------- Small helpers ---------------- */
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
const XSS_PAT = /(<script|<\/script|<svg|<img[^>]*\sonerror|onerror\s*=|onload\s*=|javascript:|<iframe|<details|<body[^>]*\sonload)/i;
const SQLI_PAT = /('|%27)(\s|\+)*(or|and)(\s|\+)+('|%27)?[0-9a-z]+('|%27)?\s*=\s*('|%27)?[0-9a-z]+|union(\s|\+)+select|'\s*--|'\s*or\s*'|'\s*or\s*[0-9]/i;
function nightsBetween(a, b) {
  const d = (new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000;
  return isNaN(d) ? 0 : Math.round(d);
}
function overlaps(b, ci, co) { return b.checkin < co && ci < b.checkout; }
function userById(id) { return users.find(u => u.id === id); }
function userByEmail(e) { return users.find(u => u.email === String(e || '').toLowerCase()); }
function bookingById(id) { return bookings.find(b => b.id === id); }
function invoiceById(id) { return invoices.find(i => i.id === id); }
function roomById(id) { return roomTypes.find(r => r.id === id); }
function extrasTotal(b) { return (b.extras || []).reduce((s, x) => s + (x.charge || 0), 0); }
function resetTokenFor(u) { return 'HH' + u.id + '-' + ((u.id * 137 + 42) % 9973); }

/* ---------------- Chatbot (§6) ---------------- */
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
function chatReply(rawMsg) {
  const msg = String(rawMsg || '');
  const m = msg.toLowerCase();
  const total = TESTS.length, done = doneCount();
  if (/(who built|who made|who created|founder|who is jony|built this|made this)/.test(m)) return ATTRIBUTION;
  if (/(key|unlock next|next lab)/.test(m) && /(give|show|tell|what|reveal|get)/.test(m)) {
    if (state.keyRevealed && done >= total) return 'You completed LAB ' + LAB_NUMBER + ' — here is your completion key: ' + completionKey() + ' — paste it into the next lab to unlock it.';
    return "I don't have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at " + pct() + '% (' + done + '/' + total + ' tests). Finish every test and I will be able to share it.';
  }
  if (/(how many|count|total).*(test|vulnerab|feature)|test.*count|how many features/.test(m)) {
    return 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + FEATURES.length + ' features and ' + total + ' scored tests: ' + FEATURES.map(f => { const s = featureStats(f); return f + ' (' + s.total + ')'; }).join(', ') + '. You have completed ' + done + '/' + total + ' (' + pct() + '%).';
  }
  // feature-specific questions
  for (const f of FEATURES) {
    const key = f.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 3)[0];
    const mentioned = m.includes(f.toLowerCase()) || (key && m.includes(key)) ||
      (f === 'Login & Authentication' && /(login|auth|password|brute|reset token|enumerat)/.test(m)) ||
      (f === 'Registration & Profile' && /(register|registration|profile|sign ?up|mass assignment|csrf)/.test(m)) ||
      (f === 'Rooms & Search' && /(room|search)/.test(m)) ||
      (f === 'Bookings' && /(booking|book|reservation|cancel)/.test(m)) ||
      (f === 'Extras & Charges' && /(extra|breakfast|parking|spa|charge)/.test(m)) ||
      (f === 'Check-in & Front Desk' && /(check ?in|front ?desk|override)/.test(m)) ||
      (f === 'Invoices & Payments' && /(invoice|payment|pay|bill)/.test(m)) ||
      (f === 'Admin Panel' && /(admin|rate change)/.test(m)) ||
      (f === 'Platform & API' && /(api|debug|token|platform)/.test(m));
    if (!mentioned) continue;
    const s = featureStats(f);
    const names = TESTS.filter(t => t.feature === f).map(t => (state.tests[t.id] ? '✓ ' : '○ ') + t.name).join('; ');
    if (/(how|guide|step|help me|solve|hint|exploit|bypass|do it|attack)/.test(m)) {
      if (s.attempts >= 3 || s.done >= s.total) {
        const guide = TESTS.filter(t => t.feature === f && !state.tests[t.id])
          .map(t => '• ' + t.name + ' — step by step: ' + t.hints[2]).join('\n');
        return 'Here is step-by-step help for ' + f + ' (you have tried ' + s.attempts + ' time(s) on this feature):\n' + (guide || 'All tests in this feature are already complete. Well done!');
      }
      return 'That feature is locked for help. First try the ' + f + ' tests yourself at least 3 times — I can see you\'ve tried ' + s.attempts + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
    }
    return f + ': ' + s.total + ' tests, ' + s.done + ' completed, ' + s.attempts + ' attempt(s) so far. Tests: ' + names + '.';
  }
  if (/(progress|how am i|score|status)/.test(m)) return 'Your progress: ' + done + '/' + total + ' tests (' + pct() + '%). ' + (done >= total ? 'Lab complete! See /complete for your key and certificate.' : 'Keep going — open /tests for the mission board.');
  if (/(next|what should|where|start|suggest)/.test(m)) {
    const nx = TESTS.find(t => !state.tests[t.id]);
    if (!nx) return 'Everything is complete — visit /complete for your completion key and /certificate for your certificate.';
    return 'Next open test: "' + nx.name + '" in ' + nx.feature + ' (' + nx.difficulty + '). Open /tests for its hints, try it at least 3 times, then ask me for step-by-step help.';
  }
  if (/(hi|hello|hey|help)/.test(m)) return 'Hello! I am the HexaHotel Lab Coach for LAB ' + LAB_NUMBER + '. This lab has ' + FEATURES.length + ' features and ' + total + ' tests; you are at ' + pct() + '%. Ask me how many tests a feature has, ask for help with a feature after trying it 3 times, or ask what to do next.';
  return 'I can help with LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ': ask me about a feature (I will share its test names and counts freely), ask "what next", or try a feature\'s tests at least 3 times and then ask me how to solve them. The mission board is at /tests.';
}

/* ---------------- HTTP plumbing ---------------- */
function parseCookies(req) {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = String(req.headers['content-type'] || '');
      if (ct.includes('application/json')) { try { return resolve(JSON.parse(data || '{}')); } catch (e) { return resolve({}); } }
      const out = {}; try { new URLSearchParams(data).forEach((v, k) => out[k] = v); } catch (e) {}
      resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}
function send(res, code, body, type) {
  if (res.writableEnded) return;
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function redirect(res, to, cookies) {
  const h = { Location: to };
  if (cookies && cookies.length) h['Set-Cookie'] = cookies;
  res.writeHead(302, h); res.end();
}
function newSession(res, user) {
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, user.id);
  return ['hx_sid=' + sid + '; Path=/', 'hx_role=' + user.role + '; Path=/'];
}
function sessionUser(req) {
  const c = parseCookies(req);
  if (c.hx_sid && sessions.has(c.hx_sid)) return userById(sessions.get(c.hx_sid));
  return null;
}
function probe(ip, email) {
  if (!email) return;
  if (!enumProbes.has(ip)) enumProbes.set(ip, new Set());
  const s = enumProbes.get(ip); s.add(String(email).toLowerCase());
  if (s.size >= 5) pass('auth-enum');
}

/* ---------------- Router ---------------- */
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://127.0.0.1');
    const p = u.pathname;
    const q = Object.fromEntries(u.searchParams.entries());
    const cookies = parseCookies(req);
    const ip = req.socket.remoteAddress || 'local';

    if (p === '/logo.png') {
      try { const img = fs.readFileSync(path.join(DIR, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(img); }
      catch (e) { return send(res, 404, 'no logo'); }
    }
    if (p === '/api/chat' && req.method === 'POST') {
      const b = await readBody(req);
      return send(res, 200, JSON.stringify({ reply: chatReply(b.message) }), 'application/json');
    }
    if (p === '/unlock' && req.method === 'POST') {
      const b = await readBody(req);
      const given = String(b.key || '');
      if (given && entryKeyMatches(given)) { state.unlocked = true; saveState(); return redirect(res, '/'); }
      return send(res, 403, gatePage('That key was not accepted.'));
    }
    if (!state.unlocked) return send(res, 200, gatePage());

    const user = sessionUser(req);

    /* ----- progress API ----- */
    if (p === '/api/progress') {
      const feats = {}; FEATURES.forEach(f => feats[f] = featureStats(f));
      return send(res, 200, JSON.stringify({ lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done: doneCount(), pct: pct(), features: feats, complete: doneCount() >= TESTS.length }, null, 2), 'application/json');
    }
    /* ----- platform API ----- */
    if (p === '/api/debug') {
      attempt('Platform & API'); pass('plat-debug');
      return send(res, 200, JSON.stringify({ debug: true, users: users.map(x => ({ id: x.id, name: x.name, email: x.email, password: x.password, role: x.role })), bookings }, null, 2), 'application/json');
    }
    if (p === '/api/bookings') {
      attempt('Platform & API');
      const tok = String((req.headers.authorization || '').replace(/^Bearer\s+/i, '') || q.token || '');
      const matched = users.find(x => Buffer.from(x.email).toString('base64') === tok);
      if (matched) { pass('api-weak'); return send(res, 200, JSON.stringify({ user: matched.email, bookings: bookings.filter(b => b.userId === matched.id) }, null, 2), 'application/json'); }
      return send(res, 401, JSON.stringify({ error: 'invalid token' }), 'application/json');
    }

    /* ----- auth ----- */
    if (p === '/login' && req.method === 'GET') return send(res, 200, loginPage());
    if (p === '/login' && req.method === 'POST') {
      const b = await readBody(req);
      attempt('Login & Authentication'); probe(ip, b.email);
      const email = String(b.email || ''), pw = String(b.password || '');
      if (SQLI_PAT.test(email) || SQLI_PAT.test(pw)) {
        pass('auth-sqli');
        const admin = userById(1);
        return redirect(res, '/', newSession(res, admin));
      }
      const acct = userByEmail(email);
      if (!acct) return send(res, 200, loginPage('No account with that email.'));
      if (acct.password !== pw) {
        loginFails[email] = (loginFails[email] || 0) + 1;
        if (loginFails[email] >= 10) pass('auth-brute');
        return send(res, 200, loginPage('Incorrect password.'));
      }
      if (acct.defaultCred && pw === 'admin123') pass('auth-default');
      return redirect(res, '/', newSession(res, acct));
    }
    if (p === '/logout') { if (cookies.hx_sid) sessions.delete(cookies.hx_sid); return redirect(res, '/login', ['hx_sid=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0']); }
    if (p === '/register' && req.method === 'GET') return send(res, 200, registerPage());
    if (p === '/register' && req.method === 'POST') {
      const b = await readBody(req);
      attempt('Registration & Profile');
      const email = String(b.email || '').toLowerCase();
      if (!email || userByEmail(email)) return send(res, 200, registerPage('Email missing or already registered.'));
      const role = ['guest', 'frontdesk', 'admin'].includes(b.role) ? b.role : 'guest';
      const nu = { id: nextUserId++, name: String(b.name || 'Guest'), email, password: String(b.password || ''), role, issuedTokens: [] };
      users.push(nu);
      if (String(b.password || '').length < 6) pass('reg-weak');
      if (role !== 'guest') pass('reg-mass');
      if (XSS_PAT.test(nu.name)) pass('reg-xss');
      return redirect(res, '/', newSession(res, nu));
    }
    if (p === '/forgot' && req.method === 'GET') return send(res, 200, forgotPage());
    if (p === '/forgot' && req.method === 'POST') {
      const b = await readBody(req);
      attempt('Login & Authentication'); probe(ip, b.email);
      const acct = userByEmail(b.email);
      if (!acct) return send(res, 200, forgotPage('No account found for that email.'));
      const t = resetTokenFor(acct); if (!acct.issuedTokens.includes(t)) acct.issuedTokens.push(t);
      return send(res, 200, forgotPage('Reset link sent to ' + esc(acct.email) + '. (Demo lab: the token was "emailed".)'));
    }
    if (p === '/reset' && req.method === 'GET') return send(res, 200, resetPage(q.email || ''));
    if (p === '/reset' && req.method === 'POST') {
      const b = await readBody(req);
      attempt('Login & Authentication');
      const acct = userByEmail(b.email);
      if (!acct) return send(res, 200, resetPage('', 'No such account.'));
      const token = String(b.token || '');
      if (token !== resetTokenFor(acct)) return send(res, 200, resetPage(acct.email, 'Invalid reset token.'));
      if (!acct.issuedTokens.includes(token)) pass('auth-reset');
      acct.issuedTokens = acct.issuedTokens.filter(t => t !== token);
      acct.password = String(b.newpassword || 'changed123');
      return redirect(res, '/login');
    }

    /* everything below needs a session */
    if (!user) {
      if (p === '/' ) return send(res, 200, homePage(null, q));
      if (p === '/rooms') { if ('q' in q) { attempt('Rooms & Search'); } return send(res, 200, roomsPage(null, q)); }
      if (p !== '/complete' && p !== '/complete/name' && p !== '/certificate') return redirect(res, '/login');
    }

    if (p === '/') return send(res, 200, homePage(user, q));
    if (p === '/rooms') {
      if ('q' in q) attempt('Rooms & Search');
      const query = String(q.q || '');
      if (query && SQLI_PAT.test(query)) pass('search-sqli');
      if (query && XSS_PAT.test(query)) pass('search-xss');
      return send(res, 200, roomsPage(user, q));
    }
    if (p === '/profile' && req.method === 'GET') return send(res, 200, profilePage(user));
    if (p === '/profile' && req.method === 'POST') {
      const b = await readBody(req);
      attempt('Registration & Profile');
      if (!('hx_origin' in b)) pass('prof-csrf');
      if (b.name) { user.name = String(b.name); if (XSS_PAT.test(user.name)) pass('reg-xss'); }
      if (b.email) user.email = String(b.email).toLowerCase();
      return redirect(res, '/profile');
    }

    /* ----- bookings ----- */
    if (p === '/bookings' && req.method === 'POST') {
      const b = await readBody(req);
      attempt('Bookings');
      const room = roomById(parseInt(b.roomTypeId, 10));
      if (!room) return send(res, 400, 'Unknown room type');
      const ci = String(b.checkin || ''), co = String(b.checkout || '');
      const actual = Math.max(1, nightsBetween(ci, co) || 1);
      const charged = b.nights ? parseInt(b.nights, 10) || actual : actual;
      const rate = b.rate ? parseFloat(b.rate) : room.rate;
      const active = bookings.filter(x => x.roomTypeId === room.id && x.status !== 'cancelled' && overlaps(x, ci, co)).length;
      if (active >= room.inventory) pass('book-full');
      if (rate < room.rate) pass('book-rate');
      if (charged < actual) pass('book-dates');
      const bk = { id: nextBookingId++, userId: user.id, roomTypeId: room.id, checkin: ci, checkout: co, nights: charged, rate, extras: [], total: rate * charged, status: 'booked' };
      bookings.push(bk);
      invoices.push({ id: nextInvoiceId++, bookingId: bk.id, userId: user.id, amount: bk.total, paid: bk.total, status: 'paid' });
      return redirect(res, '/bookings/' + bk.id);
    }
    const bm = p.match(/^\/bookings\/(\d+)$/);
    if (bm && req.method === 'GET') {
      attempt('Bookings');
      const bk = bookingById(parseInt(bm[1], 10));
      if (!bk) return send(res, 404, 'No such booking');
      if (bk.userId !== user.id) pass('book-idor');
      return send(res, 200, bookingPage(user, bk));
    }
    const bc = p.match(/^\/bookings\/(\d+)\/cancel$/);
    if (bc && req.method === 'POST') {
      attempt('Bookings');
      const bk = bookingById(parseInt(bc[1], 10));
      if (!bk) return send(res, 404, 'No such booking');
      if (bk.userId !== user.id) pass('book-cancel');
      bk.status = 'cancelled';
      return redirect(res, '/');
    }
    const be = p.match(/^\/bookings\/(\d+)\/extras$/);
    if (be && req.method === 'POST') {
      const b = await readBody(req);
      attempt('Extras & Charges');
      const bk = bookingById(parseInt(be[1], 10));
      if (!bk) return send(res, 404, 'No such booking');
      const ex = extrasCatalogue.find(x => x.id === parseInt(b.extraId, 10));
      if (!ex) return send(res, 400, 'Unknown extra');
      const charge = (b.price !== undefined && b.price !== '') ? parseFloat(b.price) : ex.price;
      bk.extras.push({ name: ex.name, charge });
      bk.total += charge;
      const inv = invoices.find(i => i.bookingId === bk.id);
      if (inv && inv.status === 'open') inv.amount += charge;
      if (charge !== ex.price) pass('extra-free');
      if (bk.userId !== user.id) pass('extra-idor');
      return redirect(res, '/bookings/' + bk.id);
    }

    /* ----- front desk ----- */
    if (p === '/frontdesk' && req.method === 'GET') {
      attempt('Check-in & Front Desk');
      if (!['frontdesk', 'admin'].includes(user.role)) return send(res, 403, layout(user, 'Front desk', '<p>Staff only.</p>'));
      return send(res, 200, frontdeskPage(user));
    }
    if (p === '/frontdesk/checkin' && req.method === 'POST') {
      const b = await readBody(req);
      attempt('Check-in & Front Desk');
      const bk = bookingById(parseInt(b.bookingId, 10));
      if (!bk) return send(res, 404, 'No such booking');
      bk.status = 'checked-in';
      if (user.role === 'guest') pass('desk-checkin');
      return redirect(res, '/bookings/' + bk.id);
    }
    if (p === '/frontdesk/override' && req.method === 'POST') {
      const b = await readBody(req);
      attempt('Check-in & Front Desk');
      const bk = bookingById(parseInt(b.bookingId, 10));
      if (!bk) return send(res, 404, 'No such booking');
      const nr = parseFloat(b.rate);
      if (!isNaN(nr)) {
        bk.rate = nr; bk.total = nr * bk.nights + extrasTotal(bk);
        const inv = invoices.find(i => i.bookingId === bk.id);
        if (inv && inv.status === 'open') inv.amount = bk.total;
        if (user.role === 'guest') pass('desk-override');
      }
      return redirect(res, '/bookings/' + bk.id);
    }

    /* ----- invoices ----- */
    const im = p.match(/^\/invoices\/(\d+)$/);
    if (im && req.method === 'GET') {
      attempt('Invoices & Payments');
      const inv = invoiceById(parseInt(im[1], 10));
      if (!inv) return send(res, 404, 'No such invoice');
      if (inv.userId !== user.id) pass('inv-idor');
      return send(res, 200, invoicePage(user, inv));
    }
    const ipay = p.match(/^\/invoices\/(\d+)\/pay$/);
    if (ipay && req.method === 'POST') {
      const b = await readBody(req);
      attempt('Invoices & Payments');
      const inv = invoiceById(parseInt(ipay[1], 10));
      if (!inv) return send(res, 404, 'No such invoice');
      const amt = parseFloat(b.amount || 0) || 0;
      inv.paid += amt;
      if (b.settle === 'full') { if (inv.paid < inv.amount) pass('inv-tamper'); inv.status = 'paid'; }
      else if (inv.paid >= inv.amount) inv.status = 'paid';
      return redirect(res, '/invoices/' + inv.id);
    }

    /* ----- admin ----- */
    if (p === '/admin' && req.method === 'GET') {
      attempt('Admin Panel');
      const viaCookie = cookies.hx_role === 'admin' && user.role !== 'admin';
      if (user.role === 'admin' || cookies.hx_role === 'admin') {
        if (viaCookie) pass('auth-cookie');
        return send(res, 200, adminPage(user));
      }
      return send(res, 403, layout(user, 'Admin', '<p>Administrators only.</p>'));
    }
    const arm = p.match(/^\/admin\/rooms\/(\d+)\/rate$/);
    if (arm && req.method === 'POST') {
      const b = await readBody(req);
      attempt('Admin Panel');
      if (user.role !== 'admin') return send(res, 403, 'Administrators only.');
      const room = roomById(parseInt(arm[1], 10));
      if (!room) return send(res, 404, 'No such room');
      if (!('hx_origin' in b)) pass('admin-csrf');
      const nr = parseFloat(b.rate); if (!isNaN(nr)) room.rate = nr;
      return redirect(res, '/admin');
    }

    /* ----- lab system pages ----- */
    if (p === '/tests') return send(res, 200, testsPage(user));
    if (p === '/complete' && req.method === 'GET') return send(res, 200, completePage(user));
    if (p === '/complete' && req.method === 'POST') {
      const b = await readBody(req);
      if (b.testerName) { state.testerName = String(b.testerName).slice(0, 60); saveState(); }
      return redirect(res, '/complete');
    }
    if (p === '/certificate') {
      if (doneCount() < TESTS.length) return send(res, 200, layout(user, 'Certificate', '<p>Complete 100% of the tests to earn your certificate. Current progress: ' + pct() + '%.</p>'));
      return send(res, 200, certificatePage(user));
    }

    return send(res, 404, layout(user, 'Not found', '<p>404 — page not found.</p>'));
  } catch (err) {
    try { send(res, 500, 'Internal error'); } catch (e) {}
  }
});

/* ---------------- Pages ---------------- */
function chatWidget() {
  return '<div id="hxchat" style="position:fixed;right:14px;bottom:14px;width:320px;max-width:92vw;background:#fff;border:1px solid #ccd;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.25);font-family:Arial,sans-serif;z-index:99">' +
    '<div style="background:#23233a;color:#fff;padding:9px 12px;border-radius:12px 12px 0 0;font-weight:bold">💬 Lab Coach — LAB ' + LAB_NUMBER + '</div>' +
    '<div id="hxlog" style="height:180px;overflow:auto;padding:10px;font-size:13px;line-height:1.45"></div>' +
    '<div style="display:flex;border-top:1px solid #dde"><input id="hxin" style="flex:1;border:0;padding:9px;font-size:13px" placeholder="Ask the coach…"><button id="hxsend" style="border:0;background:#5a4fcf;color:#fff;padding:9px 14px;cursor:pointer">Send</button></div></div>' +
    '<script>(function(){var log=document.getElementById("hxlog"),inp=document.getElementById("hxin");function add(w,t){var d=document.createElement("div");d.style.margin="6px 0";d.innerHTML="<b>"+w+":</b> ";d.appendChild(document.createTextNode(t));log.appendChild(d);log.scrollTop=1e6;}add("Coach","Hello! Ask me about the tests, or try a feature 3 times and ask how to solve it.");function send(){var v=inp.value.trim();if(!v)return;inp.value="";add("You",v);fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:v})}).then(function(r){return r.json()}).then(function(j){add("Coach",j.reply)}).catch(function(){add("Coach","(connection error)")});}document.getElementById("hxsend").onclick=send;inp.addEventListener("keydown",function(e){if(e.key==="Enter")send();});})();</script>';
}
function layout(user, title, body) {
  const nav = user
    ? '<a href="/">Home</a> · <a href="/rooms">Rooms</a> · <a href="/tests">Tests</a> · <a href="/complete">Complete</a> · <a href="/frontdesk">Front desk</a> · <a href="/admin">Admin</a> · <a href="/profile">Profile (' + user.name + ')</a> · <a href="/logout">Logout</a>'
    : '<a href="/rooms">Rooms</a> · <a href="/login">Login</a> · <a href="/register">Register</a>';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' · ' + esc(title) + '</title></head>' +
    '<body style="margin:0;background:#f2f2f7;font-family:Arial,sans-serif;color:#222">' +
    '<div style="background:#14141d;color:#fff;padding:12px 20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">' +
    '<img src="/logo.png" style="height:40px"><div><b>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</b><br><span style="font-size:12px;opacity:.85">' + doneCount() + '/' + TESTS.length + ' tests · ' + pct() + '%</span>' +
    '<div style="background:#33334d;border-radius:5px;width:220px;height:9px;margin-top:4px"><div style="background:#7b6cf0;height:9px;border-radius:5px;width:' + pct() + '%"></div></div></div>' +
    '<div style="margin-left:auto;font-size:13px">' + nav + '</div></div>' +
    '<div style="max-width:920px;margin:22px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:24px">' + body + '</div>' +
    chatWidget() + '</body></html>';
}
function gatePage(msg) {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' · Locked</title></head><body style="margin:0;background:#14141d;font-family:Arial,sans-serif">' +
    '<div style="max-width:520px;margin:60px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:28px;text-align:center">' +
    '<img src="/logo.png" style="height:56px"><h2>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h2>' +
    '<p>This lab is locked. Paste the completion key from Lab ' + (LAB_NUMBER - 1) + ' to start.</p>' +
    (msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/unlock"><input name="key" style="padding:9px;width:80%" placeholder="Completion key from Lab ' + (LAB_NUMBER - 1) + '"><br><br><button style="padding:10px 22px">Unlock LAB ' + LAB_NUMBER + '</button></form></div>' +
    chatWidget() + '</body></html>';
}
function roomCard(user, r) {
  let h = '<div style="border:1px solid #dde;border-radius:10px;padding:14px;margin:10px 0"><b>' + esc(r.name) + '</b> — $' + r.rate + '/night · ' + r.inventory + ' room(s)<br><span style="color:#555">' + esc(r.desc) + '</span>';
  if (user) {
    h += '<form method="POST" action="/bookings" style="margin-top:8px">Check-in <input type="date" name="checkin" value="2026-11-20" required> Check-out <input type="date" name="checkout" value="2026-11-22" required>' +
      '<input type="hidden" name="roomTypeId" value="' + r.id + '"><input type="hidden" name="rate" value="' + r.rate + '"><input type="hidden" name="nights" value="2"> <button>Book</button></form>';
  }
  return h + '</div>';
}
function homePage(user, q) {
  let body = '<h2>Welcome to HexaHotel</h2><p>Book your stay. ' + (user ? '' : 'Please <a href="/login">login</a> or <a href="/register">register</a> to book.') + '</p>';
  body += roomTypes.filter(r => r.listed).map(r => roomCard(user, r)).join('');
  if (user) {
    const mine = bookings.filter(b => b.userId === user.id);
    body += '<h3>My bookings</h3>' + (mine.length ? mine.map(b => '<p># ' + b.id + ' — ' + esc(roomById(b.roomTypeId).name) + ', ' + b.checkin + ' → ' + b.checkout + ', $' + b.total + ', status: ' + esc(b.status) + ' — <a href="/bookings/' + b.id + '">view</a></p>').join('') : '<p>No bookings yet.</p>');
    const myInv = invoices.filter(i => i.userId === user.id);
    if (myInv.length) body += '<h3>My invoices</h3>' + myInv.map(i => '<p>Invoice #' + i.id + ' — $' + i.amount + ' (' + i.status + ') — <a href="/invoices/' + i.id + '">view</a></p>').join('');
  }
  return layout(user, 'Home', body);
}
function roomsPage(user, q) {
  const query = String(q.q || '');
  let list = roomTypes.filter(r => r.listed);
  if (query) {
    if (SQLI_PAT.test(query)) list = roomTypes.slice();
    else list = list.filter(r => r.name.toLowerCase().includes(query.toLowerCase()));
  }
  let body = '<h2>Rooms</h2><form method="GET" action="/rooms"><input name="q" style="padding:8px;width:60%" value="' + esc(query) + '" placeholder="Search rooms…"> <button>Search</button></form>';
  if ('q' in q) body += '<p>Results for: ' + query + '</p>'; // reflected without escaping (intended flaw)
  body += list.map(r => roomCard(user, r)).join('') || '<p>No rooms matched.</p>';
  return layout(user, 'Rooms', body);
}
function loginPage(msg) {
  return layout(null, 'Login', '<h2>Login</h2>' + (msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/login">Email <input name="email" style="padding:8px;width:60%"><br><br>Password <input type="password" name="password" style="padding:8px;width:60%"><br><br><button style="padding:9px 20px">Login</button></form>' +
    '<p><a href="/forgot">Forgot password?</a> · <a href="/register">Create account</a></p>' +
    '<p style="color:#666;font-size:13px">Demo accounts: alice@test.local / alice123 · bob@test.local / bob123 · desk@hexahotel.local / desk123</p>');
}
function registerPage(msg) {
  return layout(null, 'Register', '<h2>Create account</h2>' + (msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/register">Name <input name="name" style="padding:8px;width:60%"><br><br>Email <input name="email" style="padding:8px;width:60%"><br><br>Password <input type="password" name="password" style="padding:8px;width:60%"><br><br><button style="padding:9px 20px">Register</button></form>');
}
function forgotPage(msg) {
  return layout(null, 'Forgot password', '<h2>Forgot password</h2>' + (msg ? '<p>' + msg + '</p>' : '') +
    '<form method="POST" action="/forgot">Email <input name="email" style="padding:8px;width:60%"> <button>Send reset link</button></form><p>Know your token? <a href="/reset">Reset here</a>.</p>');
}
function resetPage(email, msg) {
  return layout(null, 'Reset password', '<h2>Reset password</h2>' + (msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/reset">Email <input name="email" value="' + esc(email) + '" style="padding:8px;width:55%"><br><br>Token <input name="token" style="padding:8px;width:55%"><br><br>New password <input type="password" name="newpassword" style="padding:8px;width:55%"><br><br><button>Reset password</button></form>');
}
function profilePage(user) {
  return layout(user, 'Profile', '<h2>My profile</h2><p>Name: ' + user.name + '<br>Email: ' + esc(user.email) + '<br>Role: ' + esc(user.role) + '</p>' +
    '<form method="POST" action="/profile"><input type="hidden" name="hx_origin" value="profile-form">Name <input name="name" value="' + esc(user.name) + '" style="padding:8px;width:55%"><br><br>Email <input name="email" value="' + esc(user.email) + '" style="padding:8px;width:55%"><br><br><button>Save changes</button></form>');
}
function bookingPage(user, bk) {
  const room = roomById(bk.roomTypeId);
  const guest = userById(bk.userId);
  const inv = invoices.find(i => i.bookingId === bk.id);
  let body = '<h2>Booking #' + bk.id + '</h2><p>Guest: ' + (guest ? guest.name + ' (' + esc(guest.email) + ')' : '?') + '<br>Room: ' + esc(room.name) + '<br>Dates: ' + bk.checkin + ' → ' + bk.checkout + ' (' + bk.nights + ' night(s) at $' + bk.rate + ')<br>Status: <b>' + esc(bk.status) + '</b><br>Total: <b>$' + bk.total + '</b></p>';
  body += '<h3>Extras</h3>' + ((bk.extras || []).map(x => '<p>' + esc(x.name) + ' — $' + x.charge + '</p>').join('') || '<p>None yet.</p>');
  body += extrasCatalogue.map(x => '<form method="POST" action="/bookings/' + bk.id + '/extras" style="display:inline"><input type="hidden" name="extraId" value="' + x.id + '"><input type="hidden" name="price" value="' + x.price + '"><button>Add ' + esc(x.name) + ' ($' + x.price + ')</button></form> ').join('');
  if (inv) body += '<p>Invoice: <a href="/invoices/' + inv.id + '">#' + inv.id + '</a> — $' + inv.amount + ' (' + inv.status + ')</p>';
  body += '<h3>Actions</h3><form method="POST" action="/bookings/' + bk.id + '/cancel"><button>Cancel this booking</button></form>' +
    '<form method="POST" action="/frontdesk/checkin"><input type="hidden" name="bookingId" value="' + bk.id + '"><button>Front desk: check in</button></form>' +
    '<form method="POST" action="/frontdesk/override">New rate <input name="rate" style="width:70px"> <input type="hidden" name="bookingId" value="' + bk.id + '"><button>Front desk: override rate</button></form>';
  return layout(user, 'Booking #' + bk.id, body);
}
function frontdeskPage(user) {
  let body = '<h2>Front desk — all bookings</h2>';
  body += bookings.map(b => '<p>#' + b.id + ' — ' + esc((userById(b.userId) || {}).name || '?') + ', ' + esc(roomById(b.roomTypeId).name) + ', ' + b.checkin + ' → ' + b.checkout + ', ' + esc(b.status) + ' <form method="POST" action="/frontdesk/checkin" style="display:inline"><input type="hidden" name="bookingId" value="' + b.id + '"><button>Check in</button></form></p>').join('');
  return layout(user, 'Front desk', body);
}
function invoicePage(user, inv) {
  const bk = bookingById(inv.bookingId);
  let body = '<h2>Invoice #' + inv.id + '</h2><p>Booking: #' + inv.bookingId + (bk ? ' (' + esc(roomById(bk.roomTypeId).name) + ', ' + bk.checkin + ' → ' + bk.checkout + ')' : '') + '<br>Billed to: ' + esc((userById(inv.userId) || {}).name || '?') + '<br>Amount due: <b>$' + inv.amount + '</b><br>Paid so far: $' + inv.paid + '<br>Status: <b>' + inv.status + '</b></p>';
  if (inv.status !== 'paid') body += '<form method="POST" action="/invoices/' + inv.id + '/pay">Amount <input name="amount" style="width:80px"> <label><input type="checkbox" name="settle" value="full"> This payment settles the bill in full</label> <button>Pay</button></form>';
  return layout(user, 'Invoice #' + inv.id, body);
}
function adminPage(user) {
  let body = '<h2>Admin panel</h2><h3>Users</h3>' + users.map(x => '<p>' + x.id + ' — ' + x.name + ' (' + esc(x.email) + ') — role: ' + esc(x.role) + '</p>').join('');
  body += '<h3>Room rates</h3>' + roomTypes.map(r => '<form method="POST" action="/admin/rooms/' + r.id + '/rate"><input type="hidden" name="hx_origin" value="admin-form">' + esc(r.name) + ' — $<input name="rate" value="' + r.rate + '" style="width:70px"> <button>Set rate</button></form>').join('');
  return layout(user, 'Admin', body);
}
function testsPage(user) {
  let body = '<h2>Mission board — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h2><p>' + doneCount() + '/' + TESTS.length + ' tests complete (' + pct() + '%). Hints reveal one at a time. The Lab Coach unlocks step-by-step help for a feature after 3 genuine attempts on it.</p>';
  for (const f of FEATURES) {
    const s = featureStats(f);
    body += '<h3>' + esc(f) + ' — ' + s.done + '/' + s.total + ' done · ' + s.attempts + ' attempt(s)</h3>';
    for (const t of TESTS.filter(t => t.feature === f)) {
      body += '<div style="border:1px solid #e2e2ee;border-radius:8px;padding:10px;margin:8px 0"><b>' + (state.tests[t.id] ? '✓' : '○') + ' ' + esc(t.name) + '</b> <span style="color:#666">· ' + esc(t.owasp) + ' · ' + t.difficulty + '</span>' +
        t.hints.map((h, i) => '<details style="margin-top:5px"><summary>Hint ' + (i + 1) + '</summary><p>' + esc(h) + '</p></details>').join('') + '</div>';
    }
  }
  return layout(user, 'Tests', body);
}
function completePage(user) { if (!user) user = { name: 'Security Tester', email: '', id: 0 };
  if (doneCount() < TESTS.length) {
    const left = TESTS.filter(t => !state.tests[t.id]);
    return layout(user, 'Complete', '<h2>Not complete yet — ' + pct() + '%</h2><p>' + doneCount() + '/' + TESTS.length + ' tests done. Still open:</p>' + left.map(t => '<p>○ ' + esc(t.name) + ' (' + esc(t.feature) + ')</p>').join('') + '<p><a href="/tests">Open the mission board</a></p>');
  }
  let body = '<h2>🎉 LAB ' + LAB_NUMBER + ' complete — 100%</h2>';
  body += '<h3>1) Features in this lab</h3><p>' + FEATURES.length + ' features: ' + FEATURES.map(esc).join(', ') + '.</p>';
  body += '<h3>2) Vulnerabilities per feature</h3>' + FEATURES.map(f => { const s = featureStats(f); return '<p>' + esc(f) + ': ' + s.total + ' vulnerabilities</p>'; }).join('');
  body += '<h3>3) How testing was done — ' + TESTS.length + ' techniques</h3>' + TESTS.map(t => '<p>✓ ' + esc(t.name) + ' (' + esc(t.owasp) + ')</p>').join('');
  body += '<h3>4) What you learned</h3>' + TESTS.map(t => '<p><b>' + esc(t.name) + ':</b> ' + esc(t.lesson) + '</p>').join('');
  body += '<h3>5) What this means for a real client</h3>' + TESTS.map(t => '<p><b>' + esc(t.name) + ':</b> ' + esc(t.impact) + '</p>').join('');
  body += '<h3>6) Writing it in a real report</h3>' + TESTS.map(t => '<p><b>' + esc(t.report.title) + '</b> — Severity: ' + esc(t.report.severity) + '<br>Remediation: ' + esc(t.report.remediation) + '</p>').join('');
  body += '<h3>Your completion key</h3><p style="font-size:20px;background:#eef;padding:12px;border-radius:8px;text-align:center"><b>' + completionKey() + '</b></p><p>Paste this key into the next lab to unlock it.</p>';
  body += '<form method="POST" action="/complete">Your name for the certificate: <input name="testerName" value="' + esc(state.testerName) + '" style="padding:8px"> <button>Save name</button></form>';
  body += '<p><a href="/certificate">View your certificate →</a></p>';
  return layout(user, 'Complete', body);
}
function certificatePage(user) { if (!user) user = { name: 'Security Tester', email: '', id: 0 };
  const name = state.testerName || user.name;
  const date = state.completedAt ? state.completedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ' + LAB_NUMBER + '</title></head><body style="background:#e9e9f2;font-family:Georgia,serif">' +
    '<div style="max-width:720px;margin:40px auto;background:#fff;border:3px double #5a4fcf;border-radius:14px;padding:40px;text-align:center">' +
    '<img src="/logo.png" style="height:64px"><h1 style="margin:10px 0">Certificate of Completion</h1>' +
    '<p>This certifies that</p><h2>' + esc(name) + '</h2>' +
    '<p>has completed 100% of the security tests in <b>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</b><br>(' + TESTS.length + ' tests across ' + FEATURES.length + ' features)</p>' +
    '<p>Completed on ' + esc(date) + '</p><hr style="width:50%">' +
    '<p style="font-size:14px">HexaCyberLab — Built by Md. Jony Hassain, Founder</p></div>' +
    '<p style="text-align:center"><button onclick="window.print()">Print certificate</button></p></body></html>';
}

/* ---------------- Doc generation (§8) ---------------- */
if (process.argv.includes('--gen-docs')) {
  const byFeature = f => TESTS.filter(t => t.feature === f);
  let vuln = '# HexaHotel — Vulnerabilities (complete test map)\n\nLAB 72 — HexaHotel (Category 8: Travel, Hospitality & Transport). Every entry below is a scored test in the lab\'s TESTS registry; a test passes only when the exploit actually succeeds server-side.\n';
  for (const f of FEATURES) {
    vuln += '\n## ' + f + '\n';
    for (const t of byFeature(f)) vuln += '\n### ' + t.name + '\n- OWASP: ' + t.owasp + '\n- Difficulty: ' + t.difficulty + '\n- Impact: ' + t.impact + '\n- Report as: "' + t.report.title + '" (' + t.report.severity + ') — ' + t.report.remediation + '\n';
  }
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'), vuln);
  let guide = '# HexaHotel — Practice Guide\n\nChallenges grouped by feature, then difficulty. Each challenge mirrors the /tests mission board; hints reveal in order.\n';
  const rank = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  for (const f of FEATURES) {
    guide += '\n## ' + f + '\n';
    for (const t of byFeature(f).slice().sort((a, b) => rank[a.difficulty] - rank[b.difficulty])) {
      guide += '\n### ' + t.name + ' (' + t.difficulty + ')\n- Objective: make the exploit effect happen for real (the test flips automatically when it does).\n- Hint 1: ' + t.hints[0] + '\n- Hint 2: ' + t.hints[1] + '\n- Hint 3: ' + t.hints[2] + '\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'), guide);
  let fix = '# HexaHotel — Fix & Retest\n\nFor every scored test: the secure implementation and the regression check that proves the fix.\n';
  for (const f of FEATURES) {
    fix += '\n## ' + f + '\n';
    for (const t of byFeature(f)) fix += '\n### ' + t.report.title + ' (' + t.report.severity + ')\n- Fix: ' + t.report.remediation + '\n- Retest: repeat the original exploit from the practice guide; it must now fail (no test flip, no effect), while the legitimate flow still works.\n';
  }
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'), fix);
  console.log('docs generated for', TESTS.length, 'tests');
  process.exit(0);
}

server.listen(PORT, '127.0.0.1', () => { console.log('HexaHotel LAB 72 listening on http://127.0.0.1:' + PORT); });
