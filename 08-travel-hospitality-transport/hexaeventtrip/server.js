'use strict';
/* =====================================================================
   HexaEventTrip — LAB 79 (Category 8: Travel, Hospitality & Transport)
   A deliberately vulnerable event-travel platform for security training.
   Zero-dependency Node.js. LOCAL USE ONLY. All data is fake seed data.
   ===================================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3088;
const HOST = '127.0.0.1';
const LAB_NUMBER = 79;
const LAB_NAME = 'HexaEventTrip';
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const LOGO_FILE = path.join(DIR, 'logo.png');

/* ---- key material, fragment set A (never a whole key in this file) ---- */
const _kfA = ['TC1YSA==', 'SS05Nw==', 'SFdFVg=='];
const _kfC = ['TC1YSA==', 'TS0wOA==', 'RVo0VA=='];

/* ------------------------- TESTS registry ------------------------- */
const TESTS = [
  /* ---- Login & Authentication ---- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL injection login bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The legacy login still builds its query by string concatenation.', 'Try a classic tautology in the email field.', "Use admin@hexaeventtrip.local' OR '1'='1 as the email, any password."],
    lesson: 'Login forms that build SQL queries by concatenating user input let attackers bypass authentication entirely.',
    impact: 'On a real travel platform this hands an attacker an admin session — every booking, traveller passport detail and payment record is exposed.',
    guide: 'Go to /login. In the email field enter: admin@hexaeventtrip.local\' OR \'1\'=\'1 and any password. Submit — you are logged in as the admin without knowing the password.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries everywhere; never concatenate user input into SQL.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute force — no rate limiting or lockout', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Pick one account and keep guessing its password.', 'Notice nothing slows you down or locks the account.', 'Fail 10 logins in a row for the same account — the 10th is still processed normally.'],
    lesson: 'Without throttling or lockout, attackers can guess passwords indefinitely.',
    impact: 'A client\u2019s customer accounts fall to credential stuffing and password spraying, leading to stolen bookings and refunds fraud.',
    guide: 'On /login, submit a wrong password for tom@hexaeventtrip.local at least 10 times in a row. The app never locks the account or slows you down — that missing throttle is the flaw.',
    report: { title: 'Missing Brute-Force Protection on Login', severity: 'High', remediation: 'Add rate limiting, progressive delays and account lockout with alerting on the login endpoint.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User enumeration via login and forgot-password responses', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the error for an email that exists with one that does not.', 'Try the forgot-password form too.', 'Probe at least 5 different emails and watch how the messages differ.'],
    lesson: 'Different responses for existing vs non-existing accounts let attackers build a valid user list.',
    impact: 'Attackers harvest real customer emails from the client\u2019s platform and target them with phishing and credential stuffing.',
    guide: 'Submit logins / forgot-password requests for at least 5 different emails, mixing real ones (from the demo list) and invented ones. Existing accounts answer differently from unknown ones — that difference is the leak.',
    report: { title: 'Account Enumeration via Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message for login and password-reset regardless of whether the account exists.' } },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Default/demo admin credentials published on the login page', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Read the demo-accounts box on the login page carefully.', 'One of the listed accounts is not a normal user.', 'Log in with the published admin email and password.'],
    lesson: 'Demo and default credentials left in production are an open door — especially when printed on the login page.',
    impact: 'Anyone on the internet can sign in as the client\u2019s administrator and control events, prices and customer data.',
    guide: 'Look at the demo accounts box on /login. Use the admin email and password shown there to sign in — full admin access with public credentials.',
    report: { title: 'Default Administrative Credentials Exposed and Active', severity: 'Critical', remediation: 'Remove demo accounts and default passwords before production; force unique credentials per admin.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable password-reset token', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a reset for your own account and study the token format.', 'The token is derived from something public about the account.', 'It combines the user id with a simple arithmetic formula — compute another user\u2019s token and use it without ever requesting a reset for them.'],
    lesson: 'Reset tokens must be random and unguessable; a token computed from a user id can be forged for any account.',
    impact: 'An attacker resets the password of the client\u2019s admin or any customer and takes over the account — no inbox access needed.',
    guide: 'Tokens look like ET<id>-<number> where the number is id*137+42. Pick a victim (e.g. the admin, id 1, or another user), compute their token yourself and POST it to /reset with a new password — it is accepted even though no reset was ever requested for them.',
    report: { title: 'Predictable Password Reset Tokens Allow Account Takeover', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (at least 128 bits), store hashed, single-use, short expiry.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Session role cookie tampering (hx_role)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Inspect the cookies the app sets after login.', 'One cookie repeats your role — and the server trusts it.', 'Change hx_role to admin and visit /admin.'],
    lesson: 'Authorization decisions must come from server-side session state, never from client-editable cookies.',
    impact: 'Any customer can promote themselves to admin by editing a cookie — full control of the client\u2019s platform.',
    guide: 'Log in as a normal traveller. In your browser dev tools (or curl) set the cookie hx_role=admin, keep your session cookie, and open /admin. The server trusts the cookie and serves the admin console.',
    report: { title: 'Privilege Escalation via Client-Controlled Role Cookie', severity: 'Critical', remediation: 'Store roles only in server-side session records; ignore role claims from the client.' } },

  /* ---- Registration & Profile ---- */
  { id: 'reg-weak', feature: 'Registration & Profile', name: 'Weak password policy (1-character passwords accepted)', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a new account with the shortest password you can.', 'There is no length or complexity check at all.', 'A single character is enough.'],
    lesson: 'A password policy is the cheapest defence against guessing and credential stuffing.',
    impact: 'Customers pick trivial passwords; attackers crack accounts in seconds and steal bookings or stored payment details.',
    guide: 'Go to /register and create an account with the password "a" (one character). It is accepted — no policy is enforced.',
    report: { title: 'No Password Policy on Registration', severity: 'Medium', remediation: 'Enforce a minimum length (12+) and check passwords against known-breached lists.' } },
  { id: 'reg-mass', feature: 'Registration & Profile', name: 'Mass assignment — role and credit set at registration', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration handler copies every submitted field onto the new account.', 'Add fields the form never shows.', 'Submit role=organizer (or admin) and credit=500 along with the normal fields.'],
    lesson: 'Binding request bodies directly to data models lets attackers set fields that were never meant to be user-controlled.',
    impact: 'Attackers mint themselves organizer/admin accounts or free credit, then abuse group bookings and refunds.',
    guide: 'POST to /register with the normal fields plus role=organizer and credit=500. The new account is created with that role and a credit balance — the server copied fields it should have ignored.',
    report: { title: 'Mass Assignment in Registration Allows Role/Credit Injection', severity: 'High', remediation: 'Whitelist bindable fields on every endpoint; assign roles and balances server-side only.' } },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in display name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is rendered on staff-facing pages without escaping.', 'Put an HTML/JS payload in the name field.', 'Use <script>alert(1)</script> or an <img onerror> payload as your name.'],
    lesson: 'User-controlled text must be output-encoded everywhere it is rendered — especially in admin views.',
    impact: 'An attacker plants script in the client\u2019s admin console and steals staff sessions, taking over the whole platform.',
    guide: 'Register (or rename yourself) with a display name containing <script>alert(1)</script>. Open a page where staff see your name (admin users list, organizer manifest) — the payload is stored and rendered unescaped.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-aware output encoding on all user data; add a Content-Security-Policy.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on profile update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The profile form carries a hidden hx_origin marker — but the server never verifies it.', 'Send the same POST without the marker.', 'A cross-site form post changes your profile just as well.'],
    lesson: 'State-changing endpoints must verify an anti-CSRF token bound to the session.',
    impact: 'A malicious page visited by a logged-in customer silently changes their profile email — the first step to account takeover.',
    guide: 'POST to /profile/update with new name/email values but WITHOUT the hx_origin field. The change is saved anyway — the marker is never checked server-side.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require and verify a per-session CSRF token on every state-changing request.' } },

  /* ---- Events & Packages ---- */
  { id: 'pkg-search-sqli', feature: 'Events & Packages', name: 'SQL injection in event search leaks unpublished events', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['The event search feeds your text straight into a query.', 'A tautology makes the search return everything.', "Search for ' OR '1'='1 and look for an event that is never listed normally."],
    lesson: 'Search boxes are injection points too — and the data behind them is often more than the public catalogue.',
    impact: 'Unpublished events, internal pricing and draft packages leak to competitors and attackers before launch.',
    guide: 'On /events, search for: \' OR \'1\'=\'1 — the results include the unpublished draft event "VIP Gala Preview (Draft)" that never appears in the normal catalogue.',
    report: { title: 'SQL Injection in Event Search Exposes Unpublished Data', severity: 'High', remediation: 'Parameterise search queries and enforce publication status in the query itself.' } },
  { id: 'pkg-search-xss', feature: 'Events & Packages', name: 'Reflected XSS in event search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The search page echoes your query back at the top of the results.', 'It is not escaped.', 'Search for <script>alert(1)</script> and view the page source.'],
    lesson: 'Reflected input must be encoded — search pages are a classic phishing delivery vehicle.',
    impact: 'Attackers send the client\u2019s customers a crafted search link that runs script in the real site, stealing sessions.',
    guide: 'Search /events?q=<script>alert(1)</script>. The payload appears unescaped in the "Results for:" line of the response.',
    report: { title: 'Reflected Cross-Site Scripting in Event Search', severity: 'Medium', remediation: 'HTML-encode all reflected values; validate search input.' } },
  { id: 'pkg-swap', feature: 'Events & Packages', name: 'Bundle component swap — premium hotel at the basic price', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['A package tier is a bundle: ticket + hotel class + transfer class.', 'The booking form submits each component separately — and the server trusts them.', 'Book the Basic tier but submit hotel=5-star Grand Hotel and transfer=Private car. You are charged the Basic price.'],
    lesson: 'Bundles must be priced and composed server-side from the chosen tier, never assembled from client-submitted parts.',
    impact: 'Customers quietly upgrade themselves to premium hotels and private transfers at basic prices — direct revenue loss on every booking.',
    guide: 'POST /book with tier=basic but hotel=5-star Grand Hotel and transfer=Private car. The reservation is created with the premium components while the price stays the Basic per-person price.',
    report: { title: 'Package Bundle Components Trusted From Client Allow Free Upgrades', severity: 'High', remediation: 'Derive all bundle components and prices server-side from the tier id alone.' } },

  /* ---- Group Reservations ---- */
  { id: 'res-group', feature: 'Group Reservations', name: 'Group-size forgery — pay for 2, register 10 travellers', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['The booking form asks how many travellers you pay for — and separately lists their names.', 'Nobody compares the two numbers.', 'Set paidCount=2 but list 10 traveller names. All 10 get seats and rooms.'],
    lesson: 'Every quantity that money depends on must be reconciled server-side: paid count, traveller list, seats and rooms must agree.',
    impact: 'Groups travel at a fraction of the price — 10 people on a 2-person payment — while the client still provides seats, rooms and transfers for all.',
    guide: 'Create a booking with paidCount=2 and a travellers list of 10 names. The server charges for 2 and allocates seats/rooms for all 10.',
    report: { title: 'Paid Group Size Not Reconciled With Traveller List', severity: 'High', remediation: 'Server must require travellers.length === paidCount before pricing and allocation.' } },
  { id: 'res-idor', feature: 'Group Reservations', name: 'Reservation IDOR — view another group\u2019s booking', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Reservation URLs carry a simple numeric id.', 'Ownership is never checked on the view page.', 'Open a reservation id that is not yours.'],
    lesson: 'Every object access must verify that the object belongs to the caller.',
    impact: 'Travellers\u2019 names, itineraries and payment status of every group leak to any logged-in user — a serious privacy breach.',
    guide: 'Log in as one user and open /reservations/<id> for a reservation owned by someone else (ids are sequential). Their full booking, travellers and instalments are served.',
    report: { title: 'Insecure Direct Object Reference on Reservation View', severity: 'High', remediation: 'Check ownership (or group membership) on every reservation access.' } },
  { id: 'res-cancel', feature: 'Group Reservations', name: 'Cancel another user\u2019s reservation', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The cancel action is a plain POST with the reservation id.', 'It never asks whose reservation it is.', 'Cancel a booking owned by someone else.'],
    lesson: 'Destructive actions need the same ownership checks as reads — and usually stricter ones.',
    impact: 'A malicious user cancels competitors\u2019 or victims\u2019 group trips days before departure — chaos and refunds for the client.',
    guide: 'POST /reservations/<id>/cancel for a reservation that is not yours. It is cancelled without any ownership check.',
    report: { title: 'Missing Ownership Check on Reservation Cancellation', severity: 'High', remediation: 'Verify the caller owns the reservation before any state change; log destructive actions.' } },
  { id: 'res-price', feature: 'Group Reservations', name: 'Price tampering on booking (client-submitted per-person price)', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['The booking form posts a perPersonPrice field.', 'The server uses it instead of its own catalogue price.', 'Submit perPersonPrice=1 for a $499 package.'],
    lesson: 'Prices must always be recomputed server-side from the catalogue; client-submitted money values are untrusted input.',
    impact: 'Anyone books premium event packages for $1 a head — total revenue loss that accounting may not notice for weeks.',
    guide: 'POST /book including perPersonPrice=1. The reservation total is computed from your price, not the catalogue price.',
    report: { title: 'Client-Side Price Tampering in Booking Flow', severity: 'Critical', remediation: 'Ignore client-submitted prices; recompute totals from server-side catalogue data.' } },

  /* ---- Allocations ---- */
  { id: 'alloc-steal', feature: 'Allocations', name: 'Steal/modify another group\u2019s seat & room allocation', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Allocations (seat block, rooms) can be edited with a POST carrying the reservation id.', 'Ownership is not checked there either.', 'Change the seat block of a reservation owned by another group.'],
    lesson: 'Allocation state is part of the booking\u2019s integrity — write access must be owner-scoped.',
    impact: 'Attackers move rival groups to the worst seats, steal premium rooms, or corrupt the seating plan on event day.',
    guide: 'POST /reservations/<id>/allocation with a new seatBlock for someone else\u2019s reservation. The allocation changes — no ownership check.',
    report: { title: 'Unauthorised Modification of Other Groups\u2019 Allocations', severity: 'High', remediation: 'Scope allocation writes to the reservation owner or staff roles.' } },
  { id: 'alloc-overbook', feature: 'Allocations', name: 'Event capacity overbooking', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['One event is nearly full — check the remaining seats on its page.', 'Bookings never re-check the remaining capacity.', 'Book a group larger than the seats left. The event ends up over capacity.'],
    lesson: 'Capacity is a hard business invariant; it must be enforced atomically at booking time.',
    impact: 'The client sells seats that do not exist — refunds, chargebacks and a crowd problem at the venue.',
    guide: 'The Desert Rally Expo has only a few seats left (a large group is already booked). Create a booking whose traveller count exceeds the remaining seats. It is accepted and the event goes over capacity.',
    report: { title: 'Event Capacity Not Enforced at Booking', severity: 'High', remediation: 'Check remaining capacity inside the booking transaction and reject oversell.' } },

  /* ---- Payments & Instalments ---- */
  { id: 'pay-free', feature: 'Payments & Instalments', name: 'Instalment marked paid without any payment', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['An instalment can be "paid" with a simple POST.', 'Send it with no payment token and amount 0.', 'It still flips to PAID.'],
    lesson: 'Payment state must only change on verified payment-provider confirmation, never on a bare client request.',
    impact: 'Groups mark every instalment paid and travel for free while the client\u2019s ledger shows the money as received.',
    guide: 'POST /reservations/<id>/instalments/1/pay with amount=0 and no paymentToken. The instalment is recorded as PAID in full.',
    report: { title: 'Instalments Can Be Marked Paid Without Payment', severity: 'Critical', remediation: 'Only mark paid from verified payment webhooks with matching amounts.' } },
  { id: 'pay-amount', feature: 'Payments & Instalments', name: 'Partial payment accepted as full instalment payment', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['Send a payment token — but pay far less than the instalment.', 'The server never compares the amount with what is due.', 'Pay $1 toward a $300+ instalment; it closes as fully paid.'],
    lesson: 'Paid-in-full must mean the received amount equals the amount due.',
    impact: 'Customers settle large instalments for pennies; the shortfall is invisible until manual reconciliation.',
    guide: 'POST to an instalment pay endpoint with a paymentToken but amount=1. The instalment closes as PAID even though almost nothing was paid.',
    report: { title: 'Instalment Amount Not Verified Against Amount Due', severity: 'High', remediation: 'Compare paid amount to amount due server-side; keep instalments open for the remainder.' } },

  /* ---- Organizer & Manifest ---- */
  { id: 'org-manifest', feature: 'Organizer & Manifest', name: 'Organizer-only traveller manifest readable by any traveller', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Organizers have a manifest page listing every traveller in a group.', 'The URL is /organizer/manifest/<reservationId>.', 'Open it while logged in as a plain traveller.'],
    lesson: 'Role-restricted views must check the role server-side on every request — hiding the link is not protection.',
    impact: 'Full traveller manifests — names, groups, itineraries — leak to any user; a privacy and safeguarding failure.',
    guide: 'Log in as a traveller (not an organizer) and open /organizer/manifest/<id> for someone\u2019s group reservation. The complete traveller manifest is served.',
    report: { title: 'Organizer Manifest Exposed to Non-Organizer Users', severity: 'High', remediation: 'Enforce organizer/staff role and group ownership on the manifest endpoint.' } },

  /* ---- Admin Panel ---- */
  { id: 'adm-bac', feature: 'Admin Panel', name: 'Admin user list served to any logged-in user', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['There is a user-management page under /admin/users.', 'Try it as a plain traveller — no cookie tricks.', 'It lists every account, roles included.'],
    lesson: 'Admin surfaces must verify the admin role server-side; being logged in is not being authorized.',
    impact: 'Attackers enumerate all staff and customer accounts, roles and emails — the map for a targeted takeover.',
    guide: 'Log in as any non-admin user and open /admin/users. The full account list is served without any role check.',
    report: { title: 'Broken Access Control on Admin User List', severity: 'High', remediation: 'Require the admin role server-side on every /admin route.' } },
  { id: 'adm-csrf', feature: 'Admin Panel', name: 'CSRF on admin deactivate-user action', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The admin deactivate action is a POST with just a user id.', 'Like the profile form, its marker is never verified.', 'As admin, POST /admin/deactivate without the hx_origin marker.'],
    lesson: 'Admin actions are the highest-value CSRF targets and must carry verified tokens.',
    impact: 'A page visited by a logged-in admin silently deactivates accounts — including other admins or big group organizers.',
    guide: 'While logged in as admin, POST /admin/deactivate with a userId and no hx_origin marker. The account is deactivated — no token was verified.',
    report: { title: 'Missing CSRF Token on Administrative Action', severity: 'Medium', remediation: 'Verify per-session CSRF tokens on all admin state-changing endpoints.' } },

  /* ---- Platform & API ---- */
  { id: 'api-token', feature: 'Platform & API', name: 'Weak API token — base64(email) accepted as a bearer token', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['The JSON API authenticates with a Bearer token.', 'The token is just a reversible encoding of something public.', 'Send Authorization: Bearer base64(your email) to /api/reservations — no session needed.'],
    lesson: 'API tokens must be random secrets; an encoding of a public identifier is not a credential.',
    impact: 'Anyone who knows a customer\u2019s email — public information — can pull their bookings from the API.',
    guide: 'curl /api/reservations with header Authorization: Bearer <base64 of a user\u2019s email> and no cookies. Their reservations are returned.',
    report: { title: 'Forgeable API Token (Base64 of Email)', severity: 'High', remediation: 'Issue random, high-entropy API tokens; store hashed and scope them per user.' } },
  { id: 'api-debug', feature: 'Platform & API', name: 'Unauthenticated /api/debug dumps users and passwords', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Developers left a debug endpoint in production.', 'It needs no login at all.', 'Fetch /api/debug and read the user table.'],
    lesson: 'Debug and diagnostic endpoints must never ship to production — they bypass every other control.',
    impact: 'The entire customer database, including passwords, is downloadable by anyone — total compromise in one request.',
    guide: 'Simply GET /api/debug (after unlocking the lab). It returns every user with their password and role, no authentication required.',
    report: { title: 'Sensitive Data Exposure via Debug Endpoint', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; never store or return plaintext passwords.' } }
];

/* ------------------------- progress engine ------------------------- */
let progress = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      progress = Object.assign(progress, raw);
    }
  } catch (e) { /* start fresh on corrupt state */ }
}
function saveProgress() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2)); } catch (e) {}
}
loadProgress();

function pass(id) {
  if (!progress.tests[id]) {
    progress.tests[id] = true;
    if (TESTS.every(t => progress.tests[t.id])) {
      progress.completedAt = new Date().toISOString();
      progress.keyRevealed = true;
    }
    saveProgress();
  }
}
function bump(feature) {
  progress.attempts[feature] = (progress.attempts[feature] || 0) + 1;
  saveProgress();
}
function featureStats() {
  const out = {};
  for (const t of TESTS) {
    out[t.feature] = out[t.feature] || { total: 0, done: 0, attempts: progress.attempts[t.feature] || 0 };
    out[t.feature].total++;
    if (progress.tests[t.id]) out[t.feature].done++;
    out[t.feature].attempts = progress.attempts[t.feature] || 0;
  }
  return out;
}
function doneCount() { return TESTS.filter(t => progress.tests[t.id]).length; }
function isComplete() { return doneCount() === TESTS.length; }

/* ------------------------- seed data (all fake) ------------------------- */
let nextUserId = 100;
let nextResId = 100;
const users = [
  { id: 1, name: 'Ada Admin', email: 'admin@hexaeventtrip.local', password: 'admin123', role: 'admin', credit: 0 },
  { id: 2, name: 'Olivia Organizer', email: 'olivia@hexaeventtrip.local', password: 'olivia123', role: 'organizer', credit: 0 },
  { id: 3, name: 'Omar Organizer', email: 'omar@hexaeventtrip.local', password: 'omar123', role: 'organizer', credit: 0 },
  { id: 4, name: 'Tom Traveller', email: 'tom@hexaeventtrip.local', password: 'tom123', role: 'traveller', credit: 0 },
  { id: 5, name: 'Tina Traveller', email: 'tina@hexaeventtrip.local', password: 'tina123', role: 'traveller', credit: 0 },
  { id: 6, name: 'Ben Backpacker', email: 'ben@hexaeventtrip.local', password: 'ben123', role: 'traveller', credit: 0 }
];
const events = [
  { id: 1, name: 'Neon Summit 2026 — Lisbon', city: 'Lisbon', published: true, capacity: 100,
    tiers: { basic: { price: 499, hotel: '2-star City Hotel', transfer: 'Shared shuttle' },
             premium: { price: 999, hotel: '5-star Grand Hotel', transfer: 'Private car' } } },
  { id: 2, name: 'Alpine Music Fest 2026 — Innsbruck', city: 'Innsbruck', published: true, capacity: 60,
    tiers: { basic: { price: 349, hotel: '2-star City Hotel', transfer: 'Shared shuttle' },
             premium: { price: 749, hotel: '5-star Grand Hotel', transfer: 'Private car' } } },
  { id: 3, name: 'Desert Rally Expo 2026 — Dubai', city: 'Dubai', published: true, capacity: 40,
    tiers: { basic: { price: 899, hotel: '3-star Desert Inn', transfer: 'Shared coach' },
             premium: { price: 1599, hotel: '5-star Grand Hotel', transfer: 'Private car' } } },
  { id: 4, name: 'VIP Gala Preview (Draft)', city: 'Monaco', published: false, capacity: 20,
    tiers: { basic: { price: 2500, hotel: '5-star Grand Hotel', transfer: 'Private car' },
             premium: { price: 4000, hotel: '5-star Grand Hotel', transfer: 'Helicopter' } } }
];
function mkInstalments(total) {
  const each = Math.round(total / 3);
  return [1, 2, 3].map(n => ({ n, amount: n === 3 ? total - each * 2 : each, status: 'unpaid' }));
}
function mkRes(id, ownerId, eventId, tierKey, paidCount, travellers) {
  const ev = events.find(e => e.id === eventId);
  const tier = ev.tiers[tierKey];
  const total = tier.price * paidCount;
  return { id, ownerId, eventId, tier: tierKey, hotel: tier.hotel, transfer: tier.transfer,
    perPersonPrice: tier.price, paidCount, travellers, total,
    seatBlock: 'Block ' + String.fromCharCode(64 + (id % 6) + 1), rooms: Math.ceil(travellers.length / 2),
    status: 'active', instalments: mkInstalments(total) };
}
const omarGroup = [];
for (let i = 1; i <= 38; i++) omarGroup.push('Rally Guest ' + String(i).padStart(2, '0'));
let reservations = [
  mkRes(1, 2, 1, 'premium', 4, ['Olivia Organizer', 'Sam Field', 'Ruth Field', 'Kai Field']),
  mkRes(2, 3, 3, 'basic', 38, omarGroup),
  mkRes(3, 4, 2, 'basic', 2, ['Tom Traveller', 'Tina Traveller'])
];

/* ------------------------- small helpers ------------------------- */
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const xssPat = s => typeof s === 'string' && /<\s*(script|svg|img|iframe|body|a)\b|on(error|load|click|mouseover)\s*=|javascript:/i.test(s);
const sqliPat = s => typeof s === 'string' && (/('\s*(or|and)\s)|('\s*=)|('\s*or\s*')|(union\s+select)|(--\s)/i.test(s));
function tokenFor(u) { return 'ET' + u.id + '-' + (u.id * 137 + 42); }
const issuedTokens = new Set();      // user ids a reset was actually requested for
const loginFails = {};               // email -> failed login count
const probedEmails = new Set();      // enumeration tracking
let probedExisting = false, probedMissing = false;
function noteProbe(email) {
  probedEmails.add(String(email || '').toLowerCase());
  if (users.some(u => u.email === String(email || '').toLowerCase())) probedExisting = true; else probedMissing = true;
  if (probedEmails.size >= 5 && probedExisting && probedMissing) pass('auth-enum');
}
function allocatedFor(eventId) {
  return reservations.filter(r => r.eventId === eventId && r.status === 'active')
    .reduce((sum, r) => sum + r.travellers.length, 0);
}

/* ---- key material, fragment set B ---- */
const _kfB = ['LVpNWQ==', 'VVRFMg==', 'WENMRg=='];
const _kfD = ['LTZNQg==', 'Q1RLTA==', 'VFU4Tw=='];
function _asm(parts) { return parts.map(x => Buffer.from(x, 'base64').toString('utf8').split('').reverse().join('')).join(''); }
function entryKey() { return _asm(_kfA.concat(_kfB)); }
function completionKey() { return _asm(_kfC.concat(_kfD)); }

/* ------------------------- sessions ------------------------- */
const sessions = new Map(); // sid -> { userId, origin }
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function currentSession(req) {
  const c = parseCookies(req);
  if (c.hx_session && sessions.has(c.hx_session)) return { sid: c.hx_session, data: sessions.get(c.hx_session), cookies: c };
  return { sid: null, data: null, cookies: c };
}
function currentUser(req) {
  const s = currentSession(req);
  if (!s.data) return null;
  return users.find(u => u.id === s.data.userId) || null;
}

/* ------------------------- page furniture ------------------------- */
function progressBar() {
  const total = TESTS.length, done = doneCount(), pct = Math.floor(done / total * 100);
  return '<div style="background:#1c1c26;color:#eee;padding:8px 14px;border-radius:8px;margin:10px 0">' +
    '<img src="/logo.png" style="height:26px;vertical-align:middle"> <b>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</b>' +
    ' &nbsp;·&nbsp; ' + done + '/' + total + ' tests · ' + pct + '%' +
    '<div style="background:#333;height:10px;border-radius:5px;margin-top:6px"><div style="background:#7c5cff;height:10px;border-radius:5px;width:' + pct + '%"></div></div></div>';
}
function chatWidget() {
  return '<div id="hxchat" style="position:fixed;right:14px;bottom:14px;width:300px;background:#fff;border:1px solid #ccd;border-radius:10px;box-shadow:0 4px 18px rgba(0,0,0,.25);font-family:Arial;z-index:50">' +
    '<div style="background:#1c1c26;color:#fff;padding:8px 10px;border-radius:10px 10px 0 0"><b>Lab Coach</b></div>' +
    '<div id="hxlog" style="height:170px;overflow:auto;padding:8px;font-size:13px"></div>' +
    '<div style="display:flex;border-top:1px solid #eee"><input id="hxmsg" style="flex:1;border:0;padding:8px" placeholder="Ask the coach...">' +
    '<button onclick="hxSend()" style="border:0;background:#7c5cff;color:#fff;padding:8px 12px">Send</button></div></div>' +
    '<script>function hxSend(){var m=document.getElementById("hxmsg");var v=m.value;if(!v)return;m.value="";' +
    'var log=document.getElementById("hxlog");log.innerHTML+="<div><b>You:</b> "+v.replace(/</g,"&lt;")+"</div>";' +
    'fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:v})})' +
    '.then(function(r){return r.json()}).then(function(d){log.innerHTML+="<div><b>Coach:</b> "+String(d.reply).replace(/</g,"&lt;")+"</div>";log.scrollTop=1e6;});}</script>';
}
function layout(title, body, req) {
  const u = currentUser(req);
  const nav = u
    ? '<a href="/">Home</a> · <a href="/events">Events</a> · <a href="/book">Book</a> · <a href="/my">My Reservations</a> · <a href="/organizer">Organizer</a> · <a href="/profile">Profile</a> · <a href="/tests">Mission Board</a> · <a href="/complete">Complete</a> · <a href="/logout">Logout (' + esc(u.name) + ')</a>'
    : '<a href="/login">Login</a> · <a href="/register">Register</a> · <a href="/tests">Mission Board</a>';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + ' · LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</title></head>' +
    '<body style="margin:0;background:#f4f4f8;font-family:Arial,sans-serif"><div style="max-width:900px;margin:0 auto;padding:14px">' +
    progressBar() + '<nav style="margin:8px 0;font-size:14px">' + nav + '</nav>' + body + '</div>' + chatWidget() + '</body></html>';
}
function gatePage() {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' · Locked</title></head>' +
    '<body style="margin:0;background:#14141d;font-family:Arial,sans-serif"><div style="max-width:520px;margin:60px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:28px;text-align:center">' +
    '<img src="/logo.png" style="height:56px"><h2>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h2>' +
    '<p>This lab is locked. Paste the completion key from Lab ' + (LAB_NUMBER - 1) + ' to start.</p>' +
    '<form method="POST" action="/unlock"><input name="key" style="padding:9px;width:80%" placeholder="Completion key from Lab ' + (LAB_NUMBER - 1) + '"><br><br>' +
    '<button style="padding:10px 22px">Unlock LAB ' + LAB_NUMBER + '</button></form></div>' + chatWidget() + '</body></html>';
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function redirect(res, to, extraHeaders) {
  res.writeHead(302, Object.assign({ Location: to }, extraHeaders || {}));
  res.end();
}

/* ------------------------- request plumbing ------------------------- */
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', ch => { data += ch; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(''));
  });
}
function parseForm(raw) {
  const out = {};
  for (const pair of String(raw || '').split('&')) {
    if (!pair) continue;
    const i = pair.indexOf('=');
    const k = decodeURIComponent(pair.slice(0, i).replace(/\+/g, ' '));
    const v = decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' '));
    out[k] = v;
  }
  return out;
}

async function handle(req, res) {
  const u = new URL(req.url, 'http://x');
  const pathname = u.pathname;
  const method = req.method;
  const sess = currentSession(req);
  const me = currentUser(req);

  if (pathname === '/logo.png') {
    try { const img = fs.readFileSync(LOGO_FILE); res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(img); }
    catch (e) { send(res, 404, 'no logo'); }
    return;
  }
  if (pathname === '/api/progress') {
    const done = doneCount();
    send(res, 200, JSON.stringify({ lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done,
      pct: Math.floor(done / TESTS.length * 100), features: featureStats(), complete: isComplete() }, null, 2), 'application/json');
    return;
  }
  if (pathname === '/api/chat' && method === 'POST') {
    let msg = '';
    try { msg = (JSON.parse(await readBody(req)) || {}).message || ''; } catch (e) { msg = ''; }
    send(res, 200, JSON.stringify({ reply: chatReply(String(msg)) }), 'application/json');
    return;
  }
  if (pathname === '/unlock' && method === 'POST') {
    const form = parseForm(await readBody(req));
    if (String(form.key || '') === entryKey()) {
      progress.unlocked = true; saveProgress();
      redirect(res, '/');
    } else {
      res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(gatePage().replace('</p>', '</p><p style="color:#b00"><b>Wrong key.</b></p>'));
    }
    return;
  }
  if (!progress.unlocked) { send(res, 200, gatePage()); return; }

  /* ---------------- public-ish API (the lab's vulnerable API) ---------------- */
  if (pathname === '/api/debug') {
    pass('api-debug'); bump('Platform & API');
    send(res, 200, JSON.stringify({ users, events, reservations }, null, 2), 'application/json');
    return;
  }
  if (pathname === '/api/reservations') {
    bump('Platform & API');
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer ')) {
      const email = Buffer.from(auth.slice(7), 'base64').toString('utf8');
      const owner = users.find(x => x.email === email);
      if (owner && !sess.data) {
        pass('api-token');
        send(res, 200, JSON.stringify(reservations.filter(r => r.ownerId === owner.id), null, 2), 'application/json');
        return;
      }
      if (owner) { send(res, 200, JSON.stringify(reservations.filter(r => r.ownerId === owner.id), null, 2), 'application/json'); return; }
    }
    if (me) { send(res, 200, JSON.stringify(reservations.filter(r => r.ownerId === me.id), null, 2), 'application/json'); return; }
    send(res, 401, JSON.stringify({ error: 'unauthorized' }), 'application/json');
    return;
  }

  /* ---------------- auth ---------------- */
  if (pathname === '/login' && method === 'GET') {
    const demo = users.map(x => '<tr><td>' + esc(x.email) + '</td><td>' + esc(x.password) + '</td><td>' + esc(x.role) + '</td></tr>').join('');
    send(res, 200, layout('Login', '<h2>Login</h2>' +
      '<form method="POST" action="/login">Email <input name="email" style="width:280px"><br><br>Password <input name="password" type="password"><br><br><button>Login</button></form>' +
      '<p><a href="/forgot">Forgot password?</a></p>' +
      '<h3>Demo accounts (for the training lab)</h3><table border="1" cellpadding="5"><tr><th>Email</th><th>Password</th><th>Role</th></tr>' + demo + '</table>', req));
    return;
  }
  if (pathname === '/login' && method === 'POST') {
    bump('Login & Authentication');
    const form = parseForm(await readBody(req));
    const email = String(form.email || ''), password = String(form.password || '');
    noteProbe(email);
    let user = null, viaSqli = false;
    if (sqliPat(email) || sqliPat(password)) {
      user = users.find(x => x.role === 'admin'); viaSqli = true;   // injection: query returns first row
    } else {
      user = users.find(x => x.email === email.toLowerCase());
      if (user && user.password !== password) user = null;
      else if (!user) { /* unknown email: different message below */ }
    }
    if (!user) {
      const exists = users.some(x => x.email === email.toLowerCase());
      loginFails[email.toLowerCase()] = (loginFails[email.toLowerCase()] || 0) + 1;
      if (loginFails[email.toLowerCase()] >= 10) pass('auth-brute');
      send(res, 200, layout('Login failed', '<h2>Login failed</h2><p>' +
        (exists ? 'Wrong password for that account.' : 'No account with that email exists.') +
        '</p><p><a href="/login">Try again</a></p>', req));
      return;
    }
    if (viaSqli) pass('auth-sqli');
    if (!viaSqli && user.email === 'admin@hexaeventtrip.local' && password === 'admin123') pass('auth-default');
    const sid = crypto.randomBytes(16).toString('hex');
    const origin = crypto.randomBytes(8).toString('hex');
    sessions.set(sid, { userId: user.id, origin });
    redirect(res, '/', { 'Set-Cookie': [
      'hx_session=' + sid + '; Path=/; HttpOnly',
      'hx_role=' + user.role + '; Path=/',
      'hx_origin=' + origin + '; Path=/'
    ] });
    return;
  }
  if (pathname === '/logout') {
    if (sess.sid) sessions.delete(sess.sid);
    redirect(res, '/login', { 'Set-Cookie': ['hx_session=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0'] });
    return;
  }
  if (pathname === '/forgot' && method === 'GET') {
    send(res, 200, layout('Forgot password', '<h2>Forgot password</h2><form method="POST" action="/forgot">Email <input name="email" style="width:280px"><br><br><button>Send reset token</button></form>', req));
    return;
  }
  if (pathname === '/forgot' && method === 'POST') {
    bump('Login & Authentication');
    const form = parseForm(await readBody(req));
    noteProbe(form.email);
    const user = users.find(x => x.email === String(form.email || '').toLowerCase());
    if (!user) { send(res, 200, layout('Forgot password', '<p>No account with that email exists.</p>', req)); return; }
    issuedTokens.add(user.id);
    send(res, 200, layout('Forgot password', '<p>Reset token for ' + esc(user.email) + ': <b>' + tokenFor(user) + '</b> — now go to <a href="/reset">/reset</a>.</p>', req));
    return;
  }
  if (pathname === '/reset' && method === 'GET') {
    send(res, 200, layout('Reset password', '<h2>Reset password</h2><form method="POST" action="/reset">Email <input name="email" style="width:280px"><br><br>Token <input name="token"><br><br>New password <input name="newpassword"><br><br><button>Reset</button></form>', req));
    return;
  }
  if (pathname === '/reset' && method === 'POST') {
    bump('Login & Authentication');
    const form = parseForm(await readBody(req));
    const user = users.find(x => x.email === String(form.email || '').toLowerCase());
    if (user && String(form.token || '') === tokenFor(user)) {
      if (!issuedTokens.has(user.id)) pass('auth-reset');
      user.password = String(form.newpassword || 'x');
      send(res, 200, layout('Reset password', '<p>Password changed. <a href="/login">Login</a></p>', req));
    } else {
      send(res, 200, layout('Reset password', '<p>Invalid token.</p>', req));
    }
    return;
  }

  /* ---------------- registration & profile ---------------- */
  if (pathname === '/register' && method === 'GET') {
    send(res, 200, layout('Register', '<h2>Register</h2><form method="POST" action="/register">Name <input name="name"><br><br>Email <input name="email"><br><br>Password <input name="password" type="password"><br><br><button>Register</button></form>', req));
    return;
  }
  if (pathname === '/register' && method === 'POST') {
    bump('Registration & Profile');
    const form = parseForm(await readBody(req));
    const nu = { id: nextUserId++, name: String(form.name || 'New User'), email: String(form.email || '').toLowerCase(),
      password: String(form.password || ''), role: 'traveller', credit: 0 };
    for (const k of Object.keys(form)) if (k in nu && k !== 'id') nu[k] = form[k];   // mass assignment
    nu.id = nextUserId - 1;
    nu.credit = Number(nu.credit) || 0;
    users.push(nu);
    if (String(form.password || '').length < 4) pass('reg-weak');
    if (nu.role !== 'traveller' || nu.credit > 0) pass('reg-mass');
    if (xssPat(nu.name)) pass('reg-xss');
    send(res, 200, layout('Register', '<p>Account created for ' + esc(nu.email) + ' with role <b>' + esc(nu.role) + '</b>. <a href="/login">Login</a></p>', req));
    return;
  }
  if (!me) { redirect(res, '/login'); return; }

  if (pathname === '/profile' && method === 'GET') {
    send(res, 200, layout('Profile', '<h2>Profile</h2><form method="POST" action="/profile/update">' +
      '<input type="hidden" name="hx_origin" value="' + esc(sess.data.origin) + '">' +
      'Name <input name="name" value="' + esc(me.name) + '"><br><br>Email <input name="email" value="' + esc(me.email) + '"><br><br>' +
      'Role: ' + esc(me.role) + ' · Credit: $' + me.credit + '<br><br><button>Save</button></form>', req));
    return;
  }
  if (pathname === '/profile/update' && method === 'POST') {
    bump('Registration & Profile');
    const form = parseForm(await readBody(req));
    const markerOk = form.hx_origin && sess.data && form.hx_origin === sess.data.origin;
    if (form.name) { me.name = String(form.name); if (xssPat(me.name)) pass('reg-xss'); }
    if (form.email) me.email = String(form.email).toLowerCase();
    if (!markerOk) pass('reg-csrf');
    redirect(res, '/profile');
    return;
  }

  /* ---------------- events & search ---------------- */
  if (pathname === '/events' && method === 'GET') {
    bump('Events & Packages');
    const q = u.searchParams.get('q') || '';
    let list = events.filter(e => e.published);
    if (q) {
      if (sqliPat(q)) { list = events.slice(); if (list.some(e => !e.published)) pass('pkg-search-sqli'); }
      else list = list.filter(e => (e.name + ' ' + e.city).toLowerCase().includes(q.toLowerCase()));
    }
    if (xssPat(q)) pass('pkg-search-xss');
    const rows = list.map(e => {
      const left = e.capacity - allocatedFor(e.id);
      return '<li><b>' + esc(e.name) + '</b> — ' + esc(e.city) + ' · capacity ' + e.capacity + ' · seats left: ' + left +
        '<br>Basic $' + e.tiers.basic.price + '/person (' + esc(e.tiers.basic.hotel) + ', ' + esc(e.tiers.basic.transfer) + ')' +
        ' · Premium $' + e.tiers.premium.price + '/person (' + esc(e.tiers.premium.hotel) + ', ' + esc(e.tiers.premium.transfer) + ')</li>';
    }).join('');
    send(res, 200, layout('Events', '<h2>Events & Packages</h2>' +
      '<form method="GET" action="/events">Search <input name="q" value=""> <button>Search</button></form>' +
      (q ? '<p>Results for: ' + q + '</p>' : '') + '<ul>' + rows + '</ul>', req));
    return;
  }

  /* ---------------- booking ---------------- */
  if (pathname === '/book' && method === 'GET') {
    const opts = events.filter(e => e.published).map(e => '<option value="' + e.id + '">' + esc(e.name) + '</option>').join('');
    send(res, 200, layout('Book', '<h2>Book a group package</h2><form method="POST" action="/book">' +
      'Event <select name="eventId">' + opts + '</select><br><br>' +
      'Tier <select name="tier"><option value="basic">Basic</option><option value="premium">Premium</option></select><br><br>' +
      'Hotel <input name="hotel" value="2-star City Hotel"><br><br>' +
      'Transfer <input name="transfer" value="Shared shuttle"><br><br>' +
      'Travellers you pay for <input name="paidCount" value="2" size="4"><br><br>' +
      'Per-person price <input name="perPersonPrice" value="" placeholder="(from catalogue)"><br><br>' +
      'Traveller names (one per line)<br><textarea name="travellers" rows="6" cols="40">' + esc(me.name) + '\nGuest Two</textarea><br><br>' +
      '<button>Create reservation</button></form>', req));
    return;
  }
  if (pathname === '/book' && method === 'POST') {
    bump('Events & Packages'); bump('Group Reservations');
    const form = parseForm(await readBody(req));
    const ev = events.find(e => e.id === Number(form.eventId));
    if (!ev) { send(res, 404, 'no such event'); return; }
    const tierKey = form.tier === 'premium' ? 'premium' : 'basic';
    const tier = ev.tiers[tierKey];
    const paidCount = Math.max(1, parseInt(form.paidCount, 10) || 1);
    const travellers = String(form.travellers || '').split('\n').map(s => s.trim()).filter(Boolean);
    const hotel = String(form.hotel || tier.hotel), transfer = String(form.transfer || tier.transfer);
    let perPerson = tier.price;
    if (form.perPersonPrice !== undefined && form.perPersonPrice !== '' && Number(form.perPersonPrice) !== tier.price) {
      perPerson = Number(form.perPersonPrice) || 0;
      pass('res-price');
    }
    const r = { id: nextResId++, ownerId: me.id, eventId: ev.id, tier: tierKey, hotel, transfer,
      perPersonPrice: perPerson, paidCount, travellers: travellers.length ? travellers : [me.name],
      total: perPerson * paidCount, seatBlock: 'Block C', rooms: Math.ceil((travellers.length || 1) / 2),
      status: 'active', instalments: mkInstalments(perPerson * paidCount) };
    reservations.push(r);
    if (hotel !== tier.hotel || transfer !== tier.transfer) pass('pkg-swap');
    if (r.travellers.length > paidCount) pass('res-group');
    if (allocatedFor(ev.id) > ev.capacity) pass('alloc-overbook');
    redirect(res, '/reservations/' + r.id);
    return;
  }

  /* ---------------- reservations ---------------- */
  if (pathname === '/my' && method === 'GET') {
    const mine = reservations.filter(r => r.ownerId === me.id);
    const rows = mine.map(r => '<li><a href="/reservations/' + r.id + '">Reservation #' + r.id + '</a> — event ' + r.eventId + ', ' + r.travellers.length + ' travellers, total $' + r.total + ' (' + r.status + ')</li>').join('');
    send(res, 200, layout('My Reservations', '<h2>My Reservations</h2><ul>' + (rows || '<li>None yet</li>') + '</ul>', req));
    return;
  }
  const resMatch = pathname.match(/^\/reservations\/(\d+)$/);
  if (resMatch && method === 'GET') {
    bump('Group Reservations');
    const r = reservations.find(x => x.id === Number(resMatch[1]));
    if (!r) { send(res, 404, 'no such reservation'); return; }
    if (r.ownerId !== me.id) pass('res-idor');
    const ev = events.find(e => e.id === r.eventId);
    const inst = r.instalments.map(i => '<li>Instalment ' + i.n + ': $' + i.amount + ' — ' + i.status +
      (i.status !== 'paid' ? ' <form method="POST" action="/reservations/' + r.id + '/instalments/' + i.n + '/pay" style="display:inline">Amount <input name="amount" size="5"> Token <input name="paymentToken" size="8"> <button>Pay</button></form>' : '') + '</li>').join('');
    send(res, 200, layout('Reservation #' + r.id,
      '<h2>Reservation #' + r.id + '</h2><p>Event: ' + esc(ev ? ev.name : '?') + '<br>Tier: ' + esc(r.tier) +
      ' · Hotel: ' + esc(r.hotel) + ' · Transfer: ' + esc(r.transfer) + '<br>Paid for: ' + r.paidCount +
      ' · Travellers: ' + r.travellers.length + '<br>Total: $' + r.total + ' · Status: ' + r.status + '</p>' +
      '<h3>Travellers</h3><ul>' + r.travellers.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>' +
      '<h3>Allocation</h3><p>Seat block: ' + esc(r.seatBlock) + ' · Rooms: ' + r.rooms + '</p>' +
      '<form method="POST" action="/reservations/' + r.id + '/allocation">New seat block <input name="seatBlock"> <button>Move allocation</button></form>' +
      '<h3>Instalments</h3><ul>' + inst + '</ul>' +
      '<form method="POST" action="/reservations/' + r.id + '/cancel"><button>Cancel reservation</button></form>', req));
    return;
  }
  const cancelMatch = pathname.match(/^\/reservations\/(\d+)\/cancel$/);
  if (cancelMatch && method === 'POST') {
    bump('Group Reservations');
    const r = reservations.find(x => x.id === Number(cancelMatch[1]));
    if (!r) { send(res, 404, 'no such reservation'); return; }
    if (r.ownerId !== me.id) pass('res-cancel');
    r.status = 'cancelled';
    redirect(res, '/my');
    return;
  }
  const allocMatch = pathname.match(/^\/reservations\/(\d+)\/allocation$/);
  if (allocMatch && method === 'POST') {
    bump('Allocations');
    const r = reservations.find(x => x.id === Number(allocMatch[1]));
    if (!r) { send(res, 404, 'no such reservation'); return; }
    const form = parseForm(await readBody(req));
    if (r.ownerId !== me.id) pass('alloc-steal');
    if (form.seatBlock) r.seatBlock = String(form.seatBlock);
    redirect(res, '/reservations/' + r.id);
    return;
  }
  const payMatch = pathname.match(/^\/reservations\/(\d+)\/instalments\/(\d+)\/pay$/);
  if (payMatch && method === 'POST') {
    bump('Payments & Instalments');
    const r = reservations.find(x => x.id === Number(payMatch[1]));
    if (!r) { send(res, 404, 'no such reservation'); return; }
    const inst = r.instalments.find(i => i.n === Number(payMatch[2]));
    if (!inst) { send(res, 404, 'no such instalment'); return; }
    const form = parseForm(await readBody(req));
    const amount = Number(form.amount);
    if (!form.paymentToken && (!form.amount || amount === 0)) { inst.status = 'paid'; pass('pay-free'); }
    else if (form.paymentToken && amount > 0 && amount < inst.amount) { inst.status = 'paid'; pass('pay-amount'); }
    else if (amount >= inst.amount) { inst.status = 'paid'; }
    redirect(res, '/reservations/' + r.id);
    return;
  }

  /* ---------------- organizer ---------------- */
  if (pathname === '/organizer' && method === 'GET') {
    const roleCookie = sess.cookies.hx_role || me.role;
    if (roleCookie !== 'organizer' && roleCookie !== 'admin') { send(res, 403, layout('Organizer', '<p>Organizers only.</p>', req)); return; }
    const groups = reservations.filter(r => r.ownerId === me.id);
    const rows = groups.map(r => '<li>Group reservation #' + r.id + ' — ' + r.travellers.length + ' travellers · <a href="/organizer/manifest/' + r.id + '">Traveller manifest</a></li>').join('');
    send(res, 200, layout('Organizer', '<h2>Organizer dashboard</h2><ul>' + (rows || '<li>No groups yet</li>') + '</ul>', req));
    return;
  }
  const manMatch = pathname.match(/^\/organizer\/manifest\/(\d+)$/);
  if (manMatch && method === 'GET') {
    bump('Organizer & Manifest');
    const r = reservations.find(x => x.id === Number(manMatch[1]));
    if (!r) { send(res, 404, 'no such reservation'); return; }
    if (me.role === 'traveller') pass('org-manifest');
    const owner = users.find(x => x.id === r.ownerId);
    send(res, 200, layout('Manifest', '<h2>Traveller manifest — reservation #' + r.id + '</h2>' +
      '<p>Group owner: ' + (owner ? owner.name : '?') + ' · Event ' + r.eventId + ' · Seat block ' + esc(r.seatBlock) + '</p>' +
      '<ol>' + r.travellers.map(t => '<li>' + esc(t) + '</li>').join('') + '</ol>', req));
    return;
  }

  /* ---------------- admin ---------------- */
  if (pathname === '/admin' && method === 'GET') {
    const roleCookie = sess.cookies.hx_role || '';
    if (roleCookie === 'admin' && me.role !== 'admin') pass('auth-cookie');
    if (roleCookie !== 'admin') { send(res, 403, layout('Admin', '<p>Admins only.</p>', req)); return; }
    send(res, 200, layout('Admin', '<h2>Admin console</h2><p><a href="/admin/users">User management</a></p>' +
      '<h3>Deactivate user</h3><form method="POST" action="/admin/deactivate">User id <input name="userId" size="4"> <button>Deactivate</button></form>' +
      '<p>Events: ' + events.length + ' · Reservations: ' + reservations.length + ' · Users: ' + users.length + '</p>', req));
    return;
  }
  if (pathname === '/admin/users' && method === 'GET') {
    bump('Admin Panel');
    if (me.role !== 'admin') pass('adm-bac');
    const rows = users.map(x => '<tr><td>' + x.id + '</td><td>' + x.name + '</td><td>' + esc(x.email) + '</td><td>' + esc(x.role) + '</td><td>' + (x.deactivated ? 'deactivated' : 'active') + '</td></tr>').join('');
    send(res, 200, layout('Admin users', '<h2>All users</h2><table border="1" cellpadding="5"><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr>' + rows + '</table>', req));
    return;
  }
  if (pathname === '/admin/deactivate' && method === 'POST') {
    bump('Admin Panel');
    const roleCookie = sess.cookies.hx_role || '';
    if (roleCookie !== 'admin' && me.role !== 'admin') { send(res, 403, 'forbidden'); return; }
    const form = parseForm(await readBody(req));
    const target = users.find(x => x.id === Number(form.userId));
    const markerOk = form.hx_origin && sess.data && form.hx_origin === sess.data.origin;
    if (target) { target.deactivated = true; if (!markerOk) pass('adm-csrf'); }
    redirect(res, '/admin/users');
    return;
  }

  /* ---------------- mission board / complete / certificate ---------------- */
  if (pathname === '/tests' && method === 'GET') {
    const fs2 = featureStats();
    let html = '<h2>Mission Board — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h2>';
    for (const fname of Object.keys(fs2)) {
      html += '<h3>' + esc(fname) + ' (' + fs2[fname].done + '/' + fs2[fname].total + ' · attempts: ' + fs2[fname].attempts + ')</h3>';
      for (const t of TESTS.filter(x => x.feature === fname)) {
        const done = progress.tests[t.id];
        html += '<div style="background:#fff;border:1px solid #dde;border-radius:8px;padding:10px;margin:6px 0">' +
          '<b>' + (done ? '✓' : '○') + ' ' + esc(t.name) + '</b> · ' + esc(t.owasp) + ' · ' + esc(t.difficulty) +
          '<details><summary>Hints</summary><ol>' + t.hints.map(h => '<li>' + esc(h) + '</li>').join('') + '</ol></details></div>';
      }
    }
    send(res, 200, layout('Mission Board', html, req));
    return;
  }
  if (pathname === '/complete/name' && method === 'POST') {
    const form = parseForm(await readBody(req));
    progress.testerName = String(form.name || '').slice(0, 60); saveProgress();
    redirect(res, '/complete');
    return;
  }
  if (pathname === '/complete' && method === 'GET') {
    if (!isComplete()) {
      const left = TESTS.filter(t => !progress.tests[t.id]).map(t => '<li>' + esc(t.feature) + ' — ' + esc(t.name) + '</li>').join('');
      send(res, 200, layout('Complete', '<h2>Not complete yet</h2><p>' + doneCount() + '/' + TESTS.length + ' tests done. Still open:</p><ul>' + left + '</ul>', req));
      return;
    }
    const fs2 = featureStats();
    const perFeature = Object.keys(fs2).map(f => '<li><b>' + esc(f) + '</b>: ' + fs2[f].total + ' vulnerabilities</li>').join('');
    const lessons = TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.lesson) + '</li>').join('');
    const impacts = TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.impact) + '</li>').join('');
    const reports = TESTS.map(t => '<li><b>' + esc(t.report.title) + '</b> — Severity: ' + esc(t.report.severity) + ' — Remediation: ' + esc(t.report.remediation) + '</li>').join('');
    send(res, 200, layout('Lab Complete',
      '<h2>🎉 LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' complete!</h2>' +
      '<h3>1) Features in this lab</h3><p>' + Object.keys(fs2).length + ' features, ' + TESTS.length + ' tests.</p>' +
      '<h3>2) Vulnerabilities per feature</h3><ul>' + perFeature + '</ul>' +
      '<h3>3) Ways testing was done</h3><p>' + TESTS.length + ' techniques completed:</p><ul>' + TESTS.map(t => '<li>' + esc(t.name) + '</li>').join('') + '</ul>' +
      '<h3>4) What you learned</h3><ul>' + lessons + '</ul>' +
      '<h3>5) What this means for a real client</h3><ul>' + impacts + '</ul>' +
      '<h3>6) Writing it in a real report</h3><ul>' + reports + '</ul>' +
      '<h3>Your completion key (unlocks Lab ' + (LAB_NUMBER + 1) + ')</h3>' +
      '<p style="font-size:20px;background:#eef;border:1px dashed #88a;padding:12px;text-align:center"><b>' + completionKey() + '</b></p>' +
      '<form method="POST" action="/complete/name">Your name for the certificate <input name="name" value="' + esc(progress.testerName || me.name) + '"> <button>Save name</button></form>' +
      '<p><a href="/certificate">View your certificate</a></p>', req));
    return;
  }
  if (pathname === '/certificate' && method === 'GET') {
    if (!isComplete()) { redirect(res, '/complete'); return; }
    const name = progress.testerName || me.name;
    const date = (progress.completedAt || new Date().toISOString()).slice(0, 10);
    send(res, 200, '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ' + LAB_NUMBER + '</title></head>' +
      '<body style="font-family:Georgia,serif;background:#f7f3ea"><div style="max-width:700px;margin:40px auto;background:#fff;border:3px double #7c5cff;border-radius:10px;padding:36px;text-align:center">' +
      '<img src="/logo.png" style="height:70px"><h1>Certificate of Completion</h1>' +
      '<p>This certifies that</p><h2>' + esc(name) + '</h2>' +
      '<p>has completed 100% of the security tests in <b>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</b><br>(' + TESTS.length + ' tests across ' + Object.keys(featureStats()).length + ' features)</p>' +
      '<p>Completed on ' + esc(date) + '</p><hr>' +
      '<p><b>HexaCyberLab</b> — Built by Md. Jony Hassain, Founder</p></div></body></html>');
    return;
  }

  send(res, 404, layout('Not found', '<h2>404 — page not found</h2>', req));
}

/* ------------------------- chatbot ------------------------- */
const FEATURE_KEYS = [
  ['Login & Authentication', ['login', 'auth', 'password', 'brute', 'reset token', 'session']],
  ['Registration & Profile', ['register', 'registration', 'profile', 'sign up', 'signup']],
  ['Events & Packages', ['event', 'package', 'search', 'bundle', 'tier', 'swap']],
  ['Group Reservations', ['reservation', 'group', 'booking', 'book', 'cancel']],
  ['Allocations', ['allocation', 'seat', 'room', 'capacity', 'overbook']],
  ['Payments & Instalments', ['payment', 'instalment', 'installment', 'pay']],
  ['Organizer & Manifest', ['organizer', 'organiser', 'manifest']],
  ['Admin Panel', ['admin', 'deactivate']],
  ['Platform & API', ['api', 'debug', 'token', 'platform']]
];
function findFeature(msg) {
  for (const [f, keys] of FEATURE_KEYS) if (keys.some(k => msg.includes(k))) return f;
  return null;
}
function chatReply(rawMsg) {
  const msg = String(rawMsg || '').toLowerCase();
  const done = doneCount(), total = TESTS.length;
  if (/\b(who (built|made|created)|founder|jony|hexacyberlab)\b/.test(msg) || msg.includes('who built') || msg.includes('who made')) {
    return 'These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for "Who is Md. Jony Hassain", or ask ChatGPT.';
  }
  if (msg.includes('key')) {
    if (isComplete() && progress.keyRevealed) return 'Congratulations on completing LAB ' + LAB_NUMBER + '! Your completion key is: ' + completionKey() + ' — paste it into Lab ' + (LAB_NUMBER + 1) + ' to unlock it.';
    return 'I don\u2019t have the completion key yet — it is only given to me when this lab is completed 100%. Right now you are at ' + done + '/' + total + ' tests. Finish the lab and I\u2019ll share it.';
  }
  const feature = findFeature(msg);
  const wantsHow = /(how|solve|guide|step|help|exploit|bypass|do i|tutorial)/.test(msg);
  if (wantsHow || (feature && /(test|vulnerab|flaw|issue)/.test(msg) && !/how many/.test(msg))) {
    const f = feature || (TESTS.find(t => !progress.tests[t.id]) || {}).feature;
    if (f) {
      const attempts = progress.attempts[f] || 0;
      const open = TESTS.filter(t => t.feature === f && !progress.tests[t.id]);
      if (!open.length) return 'All tests in ' + f + ' are already complete. Well done!';
      if (attempts >= 3) {
        return 'Step by step for ' + f + ' — ' + open.map(t => t.name + ': ' + t.guide).join('  ||  ');
      }
      return 'That feature is locked for help. First try the ' + f + ' tests yourself at least 3 times — I can see you\u2019ve tried ' + attempts + ' time(s) so far. After 3 real tries, ask me again and I\u2019ll guide you step by step.';
    }
  }
  if (msg.includes('how many') || msg.includes('features') || msg.includes('tests') || msg.includes('vulnerab')) {
    if (feature) {
      const list = TESTS.filter(t => t.feature === feature);
      return feature + ' has ' + list.length + ' tests: ' + list.map(t => t.name).join('; ') + '. Attempts so far on this feature: ' + (progress.attempts[feature] || 0) + '.';
    }
    const fs2 = featureStats();
    return 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + Object.keys(fs2).length + ' features and ' + total + ' tests: ' +
      Object.keys(fs2).map(f => f + ' (' + fs2[f].total + ')').join(', ') + '. Your progress: ' + done + '/' + total + '.';
  }
  if (msg.includes('progress') || msg.includes('score') || msg.includes('status')) {
    return 'Your progress is ' + done + '/' + total + ' tests (' + Math.floor(done / total * 100) + '%). ' + (isComplete() ? 'Lab complete!' : 'Keep going — the Mission Board at /tests shows what is open.');
  }
  if (msg.includes('next') || msg.includes('start') || msg.includes('begin')) {
    const nx = TESTS.find(t => !progress.tests[t.id]);
    if (!nx) return 'Everything is complete — visit /complete for your key and certificate.';
    return 'Next open test: "' + nx.name + '" in ' + nx.feature + ' (' + nx.difficulty + '). Open /tests for its hints; after 3 genuine attempts on that feature I can guide you step by step.';
  }
  if (msg.includes('hello') || msg.includes('hi')) {
    return 'Hello! I am the Lab Coach for LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '. Ask me how many tests a feature has, what to do next, or — after 3 genuine attempts on a feature — how to solve its tests.';
  }
  return 'I can help with: how many features/tests this lab has, counts and test names for a feature, your progress, what to do next, and step-by-step help for a feature once you have tried it at least 3 times. The Mission Board at /tests lists everything with hints.';
}

/* ------------------------- server ------------------------- */
const server = http.createServer((req, res) => {
  handle(req, res).catch(() => {
    try { send(res, 200, JSON.stringify({ reply: 'Something went wrong on my side — please try again.' }), 'application/json'); } catch (e) {}
  });
});
server.listen(PORT, HOST, () => { console.log('LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ' listening on http://' + HOST + ':' + PORT); });
