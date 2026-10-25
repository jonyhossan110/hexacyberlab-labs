'use strict';
/* ============================================================================
   HexaFlight — LAB 73 of 110 (Category 8: Travel, Hospitality & Transport)
   A deliberately vulnerable flight-booking simulator for local practice.
   Zero-dependency Node.js. Binds 127.0.0.1 only. ALL data is fake seed data.
   ========================================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3082;
const LAB_NUMBER = 73;
const LAB_NAME = 'HexaFlight';
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');

/* --- scattered config fragments (reassembled at runtime where needed) --- */

const _p2 = ["TC1YSA==", "UC00Nw==", "V0dSVQ=="];

/* ============================================================================
   TESTS REGISTRY — one entry per scored vulnerability test.
   Tests pass ONLY when the server observes the real exploit effect.
   ========================================================================== */
const TESTS = [
  /* ---------------- Login & Authentication ---------------- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL Injection — Login Bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner', where: 'POST /login',
    hints: ['The login form builds its account lookup by gluing your input into a query string.', 'Try a classic tautology in the email field — something that is always true.', "Use ' OR '1'='1 in the email (any password) and watch whose session you get."],
    lesson: 'String-built queries let attacker input change the meaning of the query itself — here it logs you in as the first account in the table, the admin.',
    impact: 'On a real airline or OTA site this is full account takeover at scale: one payload in the login form can open the admin account and every booking behind it.',
    objective: 'Log in without valid credentials by injecting into the login query.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries everywhere; never concatenate user input into SQL; add central query-layer linting.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute Force — No Login Throttling', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner', where: 'POST /login',
    hints: ['Count how many wrong passwords the login accepts for one account.', 'There is no lockout, no delay and no CAPTCHA — script it.', 'Ten failures in a row for the same account are all processed normally.'],
    lesson: 'Without rate limiting or lockout, password guessing is only a matter of time and wordlists.',
    impact: 'Attackers can credential-stuff or brute-force passenger accounts, harvesting PNRs, personal data and stored payment details.',
    objective: 'Submit 10 failed logins for one account and show none are throttled.',
    report: { title: 'No Rate Limiting or Lockout on Login Enables Brute Force', severity: 'High', remediation: 'Throttle per account and per IP, add progressive delays/lockout and alerting on failure spikes.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User Enumeration via Login & Reset Responses', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner', where: 'POST /login · POST /forgot',
    hints: ['Compare the error for an email that exists vs one that does not.', 'The forgot-password form answers differently too.', 'Probe at least five different emails and collect the two different answers.'],
    lesson: 'Different error messages for "no such account" and "wrong password" hand attackers a free list of valid accounts to target.',
    impact: 'Valid-account lists feed targeted phishing and credential stuffing against real passengers and staff.',
    objective: 'Distinguish registered from unregistered emails using only error messages.',
    report: { title: 'Account Enumeration via Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message for all auth failures and reset requests, with identical timing.' } },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Default Credentials on the Helpdesk Account', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner', where: 'POST /login',
    hints: ['One staff account was set up with a password anyone could guess from the username.', 'Think helpdesk@ and the pattern <name>123.', 'The account exists — try the vendor-default style password.'],
    lesson: 'Default and username-derived passwords survive into production whenever first-login change is not forced.',
    impact: 'A guessed staff password opens the agent desk — fares, discounts and passenger bookings — without any exploit at all.',
    objective: 'Log in to the helpdesk account with its default password.',
    report: { title: 'Staff Account Uses Default, Guessable Password', severity: 'High', remediation: 'Force password change on first login, ban username-derived passwords, audit for default credentials.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate', where: 'POST /reset',
    hints: ['Request a reset for your own account and study the token shape.', 'The token is built from something public about the account — its numeric id.', 'Token = HF<id>-<id×137+42>. Compute it for another user and reset their password without ever requesting a reset.'],
    lesson: 'Reset tokens must be unguessable random values; a formula based on the user id is an open invitation to account takeover.',
    impact: 'Anyone can reset any passenger or staff password knowing only their user id — full account takeover with zero interaction.',
    objective: 'Reset another account\u2019s password using a token you computed, never requested.',
    report: { title: 'Password Reset Tokens Are Predictable (Derived from User ID)', severity: 'Critical', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), expire them quickly and bind them to a single use.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Role Cookie Tampering Unlocks the Admin Panel', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate', where: 'GET /admin (hx_role cookie)',
    hints: ['After login, inspect the cookies the app sets — one of them describes your role.', 'The admin panel trusts that cookie instead of the server-side session.', 'Set hx_role=admin in your browser and reload /admin.'],
    lesson: 'Authorization data stored on the client is attacker-controlled. Roles must be read from the server-side session, every time.',
    impact: 'Any passenger becomes "admin" by editing a cookie — user lists, fares and staff tooling all fall at once.',
    objective: 'Reach /admin as a passenger by forging the role cookie.',
    report: { title: 'Admin Panel Authorizes via Client-Controlled Role Cookie', severity: 'Critical', remediation: 'Derive roles only from the server-side session; ignore any client-supplied role claims.' } },

  /* ---------------- Registration & Profile ---------------- */
  { id: 'reg-weakpw', feature: 'Registration & Profile', name: 'Weak Password Policy — 1-Character Passwords', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner', where: 'POST /register',
    hints: ['Try registering with the shortest password the form will take.', 'There is no length or complexity check at all.', 'A single character is accepted.'],
    lesson: 'A password policy that accepts anything guarantees some accounts have trivially guessable passwords.',
    impact: 'Weak passenger passwords make credential stuffing against the booking platform cheap and effective.',
    objective: 'Create an account with a 1-character password.',
    report: { title: 'Registration Accepts Single-Character Passwords', severity: 'Medium', remediation: 'Enforce a minimum length (≥10) and screen against breached-password lists at registration.' } },
  { id: 'reg-massassign', feature: 'Registration & Profile', name: 'Mass Assignment — Self-Assigned Staff Role', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate', where: 'POST /register',
    hints: ['The registration handler copies form fields straight into the new account record.', 'What happens if the form includes a field the page never showed — like role?', 'Submit role=agent (or admin) with your registration and check your new powers.'],
    lesson: 'Binding request bodies directly to data models lets attackers set privileged fields the UI never offered.',
    impact: 'Self-made "agents" can mint discounts, read wholesale fares and touch every booking on the platform.',
    objective: 'Register a new account that already has a staff role.',
    report: { title: 'Mass Assignment in Registration Allows Role Escalation', severity: 'High', remediation: 'Whitelist assignable fields per endpoint; set roles server-side only.' } },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03:2021 Injection', difficulty: 'Beginner', where: 'POST /register · POST /profile/update → rendered in /admin and agent views',
    hints: ['Your display name is shown to staff in the admin and agent views.', 'Names are rendered without escaping.', 'Register (or rename yourself) with a <script> payload as your name.'],
    lesson: 'Any user-controlled string rendered raw into staff pages is a stored XSS waiting for a victim with privileges.',
    impact: 'A malicious passenger name can hijack the session of the admin who opens the user list — full back-office compromise.',
    objective: 'Store a script payload in a display name so it is saved for staff pages.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-encode all user data on output; add a Content-Security-Policy as defence in depth.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate', where: 'POST /profile/update',
    hints: ['Legit forms carry a hidden hx_origin marker. The handler never checks it.', 'A state-changing POST without the marker still succeeds.', 'Send the profile update with no hx_origin field at all — e.g. as a cross-site form would.'],
    lesson: 'State-changing endpoints that never verify an anti-CSRF token can be triggered by any website the victim visits while logged in.',
    impact: 'Attackers can silently rename accounts or change contact details, setting up booking theft and support-desk social engineering.',
    objective: 'Change a profile with a POST that carries no anti-CSRF marker.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require a per-session anti-CSRF token on every state-changing request and verify Origin/Referer.' } },

  /* ---------------- Flight Search ---------------- */
  { id: 'search-sqli', feature: 'Flight Search', name: 'SQL Injection in Flight Search Reveals Hidden Charter Flight', owasp: 'A03:2021 Injection', difficulty: 'Intermediate', where: 'GET /flights?q=',
    hints: ['Search builds its filter the same sloppy way the login does.', 'A tautology makes the filter match everything — including flights the catalogue hides.', "Search for ' OR '1'='1 and look for a flight that never appears normally."],
    lesson: 'Injection in search is not "just search" — it dumps rows the UI was designed to hide, like internal or unreleased inventory.',
    impact: 'Internal charter flights, unpublished routes and fare experiments leak to competitors and attackers.',
    objective: 'Make the search return the hidden internal charter flight.',
    report: { title: 'SQL Injection in Flight Search Exposes Hidden Inventory', severity: 'High', remediation: 'Parameterise search queries and enforce visibility flags in the data layer, not the UI.' } },
  { id: 'search-xss', feature: 'Flight Search', name: 'Reflected XSS in Search Results', owasp: 'A03:2021 Injection', difficulty: 'Beginner', where: 'GET /flights?q=',
    hints: ['The results page repeats your search term back to you.', 'It does so without escaping.', 'Put a <script> payload in q and view the page source of the response.'],
    lesson: 'Reflected input must be encoded on output, even "harmless" echoes like a search heading.',
    impact: 'Crafted search links execute script in the victim\u2019s browser — session theft and fake "payment problem" pages on a trusted domain.',
    objective: 'Get a script payload reflected unescaped in the search response.',
    report: { title: 'Reflected Cross-Site Scripting in Flight Search', severity: 'Medium', remediation: 'HTML-encode all reflected values; validate search input length and character set.' } },

  /* ---------------- Bookings & Fares ---------------- */
  { id: 'fare-tamper', feature: 'Bookings & Fares', name: 'Fare Tampering — Business Seat at an Economy Price', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate', where: 'POST /book (price field)',
    hints: ['The booking form helpfully sends the price along with the seat choice.', 'The server believes it.', 'Book a business seat but submit the economy price in the price field.'],
    lesson: 'Prices are server-side facts. Any price arriving from the client is a claim to verify, never a value to charge.',
    impact: 'Passengers fly business for economy money; at scale this is direct, silent revenue loss on every route.',
    objective: 'Create a booking whose charged fare is lower than the server fare for that seat.',
    report: { title: 'Client-Supplied Price Trusted at Booking (Fare Tampering)', severity: 'High', remediation: 'Compute all fares server-side from flight + seat at booking and payment time; ignore client prices.' } },
  { id: 'pay-zero', feature: 'Bookings & Fares', name: 'Payment Bypass — Paying $0 Marks the Booking Paid', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner', where: 'POST /book/:id/pay',
    hints: ['The payment step asks the client how much was paid.', 'It never compares that with what is owed.', 'Pay amount=0 (or negative) and watch the booking flip to PAID.'],
    lesson: 'A payment is confirmed by the payment provider\u2019s server-side callback, never by a number the browser posts.',
    impact: 'Free flights: bookings confirmed without a cent changing hands, indistinguishable from real sales in reports.',
    objective: 'Mark a booking PAID while paying less than the amount due.',
    report: { title: 'Payment Amount Not Verified — Zero-Payment Bookings Confirmed', severity: 'Critical', remediation: 'Verify amount and status against the payment gateway server-side before confirming any booking.' } },
  { id: 'book-idor', feature: 'Bookings & Fares', name: 'Booking IDOR — Read Any Passenger\u2019s Booking', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner', where: 'GET /booking/:id',
    hints: ['Booking pages live at predictable numeric addresses.', 'Nothing checks that the booking belongs to you.', 'Open a booking id that is not yours (another passenger\u2019s).'],
    lesson: 'Every object access needs an ownership check; sequential ids make missing checks trivially exploitable.',
    impact: 'Attackers harvest names, routes, dates and PNRs — the raw material for refund fraud and targeted phishing of travellers.',
    objective: 'View a booking owned by a different passenger.',
    report: { title: 'Insecure Direct Object Reference on Booking Details', severity: 'High', remediation: 'Check booking ownership (or staff role) on every booking read/write; use unguessable references.' } },
  { id: 'book-cancel', feature: 'Bookings & Fares', name: 'Cancel Another Passenger\u2019s Booking', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner', where: 'POST /booking/:id/cancel',
    hints: ['The cancel endpoint is as trusting as the view endpoint.', 'No ownership check stands between you and someone else\u2019s trip.', 'Cancel a booking that belongs to another passenger.'],
    lesson: 'Destructive actions need the strictest authorization checks — a missing check here deletes real journeys.',
    impact: 'Attackers can cancel competitors\u2019 or victims\u2019 flights on the day of travel — chaos, refunds and reputational damage.',
    objective: 'Cancel a booking owned by a different passenger.',
    report: { title: 'Missing Authorization on Booking Cancellation', severity: 'High', remediation: 'Verify ownership server-side before any booking mutation; log and alert on staff overrides.' } },

  /* ---------------- Seats & Check-in ---------------- */
  { id: 'seat-premium', feature: 'Seats & Check-in', name: 'Free Upgrade — Premium Seat Change Without Paying the Difference', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate', where: 'POST /booking/:id/seat',
    hints: ['After booking economy, the seat-change form lets you pick any seat on the plane.', 'Nobody charges the fare difference.', 'Move your booking to a first-class seat and compare seat price with what you paid.'],
    lesson: 'Post-booking changes must re-price server-side; a free seat map is a free upgrade machine.',
    impact: 'Premium cabins fill with economy tickets — direct revenue loss and angry full-fare passengers.',
    objective: 'Hold a seat worth more than the fare your booking paid.',
    report: { title: 'Seat Change Does Not Re-Price — Free Premium Upgrades', severity: 'High', remediation: 'Recompute fare on seat change and collect/refund the difference before confirming.' } },
  { id: 'seat-occupied', feature: 'Seats & Check-in', name: 'Double-Booked Seat — the Same Seat Sold Twice', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate', where: 'POST /booking/:id/seat',
    hints: ['The seat-change endpoint never asks whether the seat is already taken.', 'Pick a seat another booking already holds.', 'Two active bookings end up owning the same seat on the same flight.'],
    lesson: 'Uniqueness invariants (one passenger per seat) must be enforced in the data layer at write time, not assumed from the UI.',
    impact: 'Two passengers, one seat: gate chaos, denied boarding, compensation costs and terrible press.',
    objective: 'End up holding a seat that another active booking already holds.',
    report: { title: 'Seat Assignment Allows Double-Booking the Same Seat', severity: 'High', remediation: 'Enforce a uniqueness constraint on (flight, seat) for active bookings inside a transaction.' } },
  { id: 'checkin-idor', feature: 'Seats & Check-in', name: 'Check In Another Passenger', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner', where: 'POST /booking/:id/checkin',
    hints: ['Check-in changes who is expected at the gate.', 'The endpoint does not ask whose booking it is.', 'Check in a booking that belongs to someone else.'],
    lesson: 'Workflow actions inherit the same ownership rules as reads — checking in is a state change on someone\u2019s journey.',
    impact: 'Attackers can check in victims (locking their seats) or check in stolen bookings to fly under another name.',
    objective: 'Check in a booking owned by a different passenger.',
    report: { title: 'Missing Authorization on Check-In', severity: 'Medium', remediation: 'Verify booking ownership before check-in; require the PNR + surname pair for guest flows.' } },
  { id: 'ticket-idor', feature: 'Seats & Check-in', name: 'E-Ticket IDOR — Download Any Passenger\u2019s Ticket', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner', where: 'GET /ticket/:id',
    hints: ['The e-ticket page uses the same predictable booking id.', 'It prints the full ticket — name, PNR, seat — for whoever asks.', 'Open the ticket of a booking that is not yours.'],
    lesson: 'A ticket is a bearer instrument: serving it without an ownership check is handing out other people\u2019s flights.',
    impact: 'Stolen e-tickets can be used to fly, to change bookings, or to social-engineer refunds from support.',
    objective: 'View the e-ticket of a booking owned by a different passenger.',
    report: { title: 'Insecure Direct Object Reference on E-Ticket', severity: 'High', remediation: 'Restrict ticket rendering to the booking owner or staff; use signed, expiring ticket links.' } },

  /* ---------------- Agent Desk ---------------- */
  { id: 'agent-farerules', feature: 'Agent Desk', name: 'Wholesale Fare Rules Exposed to Passengers via API', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate', where: 'GET /api/fare-rules',
    hints: ['The agent fare-rules page checks your role properly. Its JSON API does not.', 'Ask the API directly while logged in as a passenger.', 'GET /api/fare-rules returns wholesale fares and commission rates.'],
    lesson: 'APIs need the same authorization as the pages that use them — securing the page but not the endpoint secures nothing.',
    impact: 'Competitors and passengers see wholesale fares and commission structures — commercial damage and a roadmap for fraud.',
    objective: 'Read the fare rules as a plain passenger.',
    report: { title: 'Fare-Rules API Missing Role Check (Commercial Data Exposure)', severity: 'Medium', remediation: 'Apply the staff role check in the API handler itself; deny by default.' } },
  { id: 'agent-discount', feature: 'Agent Desk', name: 'Passengers Can Mint Their Own Discount Codes', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate', where: 'POST /agent/discount',
    hints: ['Agents create discount codes from the agent desk.', 'The create endpoint forgot to check who is calling.', 'As a passenger, POST a code with pct=100 and it exists.'],
    lesson: 'Every privileged write endpoint must verify the caller\u2019s role server-side — "hidden in the staff UI" is not a control.',
    impact: 'Anyone can mint a 100% discount code and fly free, or sell codes to others.',
    objective: 'Create a discount code while logged in as a passenger.',
    report: { title: 'Discount-Code Creation Missing Authorization', severity: 'High', remediation: 'Restrict discount creation to agent/admin roles server-side; cap discount percentages.' } },

  /* ---------------- Admin Panel ---------------- */
  { id: 'admin-bac', feature: 'Admin Panel', name: 'Admin User List Served to Any Logged-In User', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner', where: 'GET /admin/users',
    hints: ['The admin area has a JSON user list behind it.', 'It asks only that you are logged in — not that you are staff.', 'Fetch /admin/users as a passenger.'],
    lesson: 'Endpoints that return user directories are sensitive assets; "logged in" is not "authorized".',
    impact: 'Every account\u2019s name and email leaks to any registered user — a phishing and enumeration goldmine.',
    objective: 'Fetch the admin user list as a non-admin user.',
    report: { title: 'Broken Access Control on Admin User List', severity: 'Medium', remediation: 'Require the admin role for user-directory endpoints; minimise fields returned.' } },
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'CSRF on Admin Fare Update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate', where: 'POST /admin/fares',
    hints: ['Admin fare changes are a plain POST with no anti-CSRF marker check.', 'Even the admin\u2019s own browser can be tricked into sending it.', 'As admin, change a fare with a POST that carries no hx_origin marker.'],
    lesson: 'Privileged actions are the most valuable CSRF targets; tokens matter most exactly where admins act.',
    impact: 'A malicious page visited by an admin silently reprices routes — revenue chaos that looks like an insider\u2019s mistake.',
    objective: 'Change a flight fare as admin with a POST lacking the CSRF marker.',
    report: { title: 'Missing CSRF Protection on Admin Fare Update', severity: 'Medium', remediation: 'Require anti-CSRF tokens on all admin actions; verify Origin/Referer as defence in depth.' } },

  /* ---------------- Platform & API ---------------- */
  { id: 'api-token', feature: 'Platform & API', name: 'Weak API Token — Base64 of the Account Email', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate', where: 'GET /api/my-bookings (Authorization: Bearer)',
    hints: ['The mobile API authenticates with a Bearer token tied to your email.', 'It is a reversible encoding, not a secret.', 'Send Bearer base64(your email) — no password involved — and your bookings appear.'],
    lesson: 'An identifier is not a credential. API tokens must be random, secret and revocable.',
    impact: 'Anyone who knows a passenger\u2019s email — public information — owns their API account and booking history.',
    objective: 'Authenticate to the API with a token derived only from an email address.',
    report: { title: 'API Bearer Token Is a Predictable Encoding of the Email Address', severity: 'High', remediation: 'Issue random opaque API tokens at login, store hashes, support revocation and expiry.' } },
  { id: 'platform-debug', feature: 'Platform & API', name: 'Debug Endpoint Dumps Every Account and Password', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner', where: 'GET /api/debug',
    hints: ['Developers leave diagnostic endpoints behind more often than anyone admits.', 'This one needs no login at all.', 'GET /api/debug and read the whole user table — passwords included.'],
    lesson: 'Debug surface must never ship to production; if it exists, it will be found.',
    impact: 'Total credential leak in one request: every passenger and staff password, ready for takeover of the whole platform.',
    objective: 'Fetch the debug dump and read the account table.',
    report: { title: 'Unauthenticated Debug Endpoint Exposes All Credentials', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; gate diagnostics behind admin auth and IP allowlists.' } }
];

/* ---------------- progress state ---------------- */
let progress = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const p = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      if (p && typeof p === 'object') progress = Object.assign(progress, p);
    }
  } catch (e) { /* corrupted state must never crash the lab */ }
}
function saveProgress() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2)); } catch (e) {}
}
loadProgress();

const FEATURES = [];
for (const t of TESTS) if (!FEATURES.includes(t.feature)) FEATURES.push(t.feature);
function doneCount() { return TESTS.filter(t => progress.tests[t.id]).length; }
function isComplete() { return doneCount() === TESTS.length; }
function pass(id) {
  if (!progress.tests[id]) {
    progress.tests[id] = true;
    if (isComplete() && !progress.completedAt) { progress.completedAt = new Date().toISOString(); progress.keyRevealed = true; }
    saveProgress();
  }
}
function att(feature) {
  progress.attempts[feature] = (progress.attempts[feature] || 0) + 1;
  saveProgress();
}
function attemptsOf(feature) { return progress.attempts[feature] || 0; }

/* --- more scattered config fragments --- */


/* ============================================================================
   SEED DATA — all fake. In-memory only.
   ========================================================================== */
let nextUserId = 6, nextBookingId = 3, nextFlightId = 5;
const users = [
  { id: 1, name: 'Ayesha Rahman', email: 'admin@hexaflight.local', password: 'admin123', role: 'admin' },
  { id: 2, name: 'Tanvir Ahmed', email: 'agent@hexaflight.local', password: 'agent123', role: 'agent' },
  { id: 3, name: 'Help Desk', email: 'helpdesk@hexaflight.local', password: 'helpdesk123', role: 'agent' },
  { id: 4, name: 'Alice Akter', email: 'alice@test.local', password: 'alice123', role: 'passenger' },
  { id: 5, name: 'Bob Barua', email: 'bob@test.local', password: 'bob123', role: 'passenger' }
];
const flights = [
  { id: 1, no: 'HF101', from: 'Dhaka (DAC)', to: "Cox's Bazar (CXB)", date: '2026-11-02', time: '08:00', fares: { economy: 120, business: 300, first: 450 }, hidden: false },
  { id: 2, no: 'HF202', from: 'Dhaka (DAC)', to: 'Chattogram (CGP)', date: '2026-11-02', time: '11:30', fares: { economy: 95, business: 240, first: 380 }, hidden: false },
  { id: 3, no: 'HF303', from: 'Dhaka (DAC)', to: 'Sylhet (ZYL)', date: '2026-11-03', time: '07:15', fares: { economy: 110, business: 260, first: 400 }, hidden: false },
  { id: 4, no: 'HF999', from: 'Dhaka (DAC)', to: 'INTERNAL CHARTER — STAFF ONLY', date: '2026-11-04', time: '23:59', fares: { economy: 999, business: 1999, first: 2999 }, hidden: true }
];
const bookings = [
  { id: 1, pnr: 'HF1001', userId: 5, flightId: 1, seat: '2A', fareClass: 'business', amountDue: 300, pricePaid: 300, paid: true, status: 'active', checkedIn: false, passengerName: 'Bob Barua' },
  { id: 2, pnr: 'HF1002', userId: 4, flightId: 2, seat: '5C', fareClass: 'economy', amountDue: 95, pricePaid: 95, paid: true, status: 'active', checkedIn: false, passengerName: 'Alice Akter' }
];
const fareRules = {
  wholesaleFares: { 'DAC-CXB': { economy: 61, business: 158, first: 240 }, 'DAC-CGP': { economy: 47, business: 121, first: 190 }, 'DAC-ZYL': { economy: 55, business: 130, first: 205 } },
  agentCommissionPct: 12,
  refundPenaltyPct: 25,
  changeFee: 15,
  note: 'CONFIDENTIAL — internal fare construction. Never expose to passengers.'
};
const discountCodes = { WELCOME10: 10 };
const issuedResetTokens = new Map(); /* userId -> token (only tokens actually requested) */

function seatClass(seat) {
  const row = parseInt(seat, 10);
  if (row === 1) return 'first';
  if (row <= 3) return 'business';
  return 'economy';
}
function seatPrice(flight, seat) { return flight.fares[seatClass(seat)]; }
function seatTaken(flightId, seat, exceptBookingId) {
  return bookings.some(b => b.flightId === flightId && b.seat === seat && b.status === 'active' && b.id !== exceptBookingId);
}
function resetTokenFor(user) { return 'HF' + user.id + '-' + (user.id * 137 + 42); }

/* ---------------- sessions & cookies ---------------- */
const sessions = new Map(); /* sid -> userId */
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function currentUser(req) {
  const c = parseCookies(req);
  if (c.sid && sessions.has(c.sid)) {
    const u = users.find(x => x.id === sessions.get(c.sid));
    if (u) return u;
  }
  return null;
}

/* ---------------- detection patterns & brute/enum tracking ---------------- */
const SQLI = /('\s*(or|and)\s+'?\d+'?\s*=\s*'?\d+)|('\s*(or|and)\s+1\s*=\s*1)|('--)|(\bunion\b\s+\bselect\b)/i;
const XSS = /(<script|<svg|<img|<iframe|onerror\s*=|onload\s*=)/i;
const loginFails = {};       /* email -> consecutive failure count */
const enumProbes = new Map(); /* ip -> Set of probed emails */
function enumProbe(ip, email) {
  if (!enumProbes.has(ip)) enumProbes.set(ip, new Set());
  const s = enumProbes.get(ip);
  s.add(String(email || '').toLowerCase());
  if (s.size >= 5) pass('auth-enum');
}

/* --- final scattered fragments + assembler (keys exist ONLY as shards) --- */
const _p4 = ["LVBBOA==", "SDI5Sg==", "OFBRSA=="];
function _asm(a, b) { return a.concat(b).map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join(''); }
const ENTRY_KEY_SHA256 = '93f4d0dbd2b7d198bc6e18e8da73e343a71bb96b319cea46e495bd3f0ca22261';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */
function completionKey() { return _asm(_p2, _p4); }

/* ---------------- small helpers ---------------- */
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', ch => { data += ch; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) {
        try { return resolve(JSON.parse(data || '{}')); } catch (e) { return resolve({}); }
      }
      const out = {};
      try {
        for (const pair of data.split('&')) {
          if (!pair) continue;
          const i = pair.indexOf('=');
          out[decodeURIComponent(pair.slice(0, i).replace(/\+/g, ' '))] = decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' '));
        }
      } catch (e) {}
      resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }

/* ============================================================================
   PAGE RENDERING
   ========================================================================== */
function progressBar() {
  const total = TESTS.length, done = doneCount(), pct = Math.floor(done / total * 100);
  return `<div style="background:#1b1b26;color:#eee;padding:8px 14px;font-family:Arial">
    <img src="/logo.png" style="height:26px;vertical-align:middle"> <b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b>
    · ${done}/${total} tests · ${pct}%
    <span style="display:inline-block;width:180px;height:10px;background:#333;vertical-align:middle;margin-left:8px">
      <span style="display:block;height:10px;width:${pct}%;background:#7c5cff"></span></span>
    <a style="color:#9df" href="/tests">Mission Board</a> · <a style="color:#9df" href="/complete">Completion</a>
  </div>`;
}
function chatWidget() {
  return `<div id="hxchat" style="position:fixed;right:14px;bottom:14px;width:320px;background:#fff;border:1px solid #99a;border-radius:10px;font-family:Arial;box-shadow:0 4px 18px rgba(0,0,0,.25);z-index:50">
    <div style="background:#22223a;color:#fff;padding:8px 10px;border-radius:10px 10px 0 0"><b>Lab Coach</b> — HexaFlight</div>
    <div id="hxlog" style="height:170px;overflow:auto;padding:8px;font-size:13px"></div>
    <div style="display:flex;border-top:1px solid #dde">
      <input id="hxin" style="flex:1;padding:8px;border:0" placeholder="Ask the coach…">
      <button onclick="hxSend()" style="padding:8px 12px">Send</button>
    </div></div>
  <script>
  function hxAdd(who,text){var l=document.getElementById('hxlog');var d=document.createElement('div');d.innerHTML='<b>'+who+':</b> ';d.appendChild(document.createTextNode(text));l.appendChild(d);l.scrollTop=l.scrollHeight;}
  async function hxSend(){var i=document.getElementById('hxin');var m=i.value.trim();if(!m)return;i.value='';hxAdd('You',m);
    try{var r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})});var j=await r.json();hxAdd('Coach',j.reply||'…');}
    catch(e){hxAdd('Coach','(coach unreachable)');}}
  document.getElementById('hxin').addEventListener('keydown',function(e){if(e.key==='Enter')hxSend();});
  </script>`;
}
function layout(title, user, body) {
  const nav = user
    ? `<span>Signed in as <b>${esc(user.name)}</b> (${esc(user.role)}) · <a href="/flights">Flights</a> · <a href="/bookings">My bookings</a> · <a href="/profile">Profile</a>${user.role !== 'passenger' ? ' · <a href="/agent">Agent desk</a>' : ''} · <a href="/logout">Logout</a></span>`
    : `<span><a href="/login">Login</a> · <a href="/register">Register</a> · <a href="/flights">Flights</a></span>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)} · LAB ${LAB_NUMBER} — ${LAB_NAME}</title></head>
  <body style="margin:0;font-family:Arial;background:#f4f4f8">${progressBar()}
  <div style="max-width:900px;margin:14px auto;background:#fff;padding:18px;border-radius:10px">${nav}<hr>${body}</div>
  ${chatWidget()}</body></html>`;
}
function gatePage(msg) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ${LAB_NUMBER} — ${LAB_NAME} · Locked</title></head>
  <body style="margin:0;background:#14141d;font-family:Arial">${progressBar()}
  <div style="max-width:520px;margin:50px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:28px;text-align:center">
    <img src="/logo.png" style="height:56px"><h2>LAB ${LAB_NUMBER} — ${LAB_NAME}</h2>
    <p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
    ${msg ? `<p style="color:#b00">${esc(msg)}</p>` : ''}
    <form method="POST" action="/unlock"><input name="key" style="padding:9px;width:80%" placeholder="Completion key from Lab ${LAB_NUMBER - 1}"><br><br>
    <button style="padding:10px 22px">Unlock LAB ${LAB_NUMBER}</button></form>
  </div>${chatWidget()}</body></html>`;
}

/* ---------------- auth pages ---------------- */
function loginPage(msg) {
  return layout('Login', null, `<h2>Login — HexaFlight</h2>
  ${msg ? `<p style="color:#b00">${esc(msg)}</p>` : ''}
  <form method="POST" action="/login">
    <label>Email <input name="email" style="width:260px"></label><br><br>
    <label>Password <input name="password" type="password" style="width:260px"></label><br><br>
    <button>Login</button></form>
  <p><a href="/forgot">Forgot password?</a> · <a href="/register">Create an account</a></p>
  <p style="color:#777;font-size:13px">Demo accounts — admin@hexaflight.local / admin123 · agent@hexaflight.local / agent123 · alice@test.local / alice123 · bob@test.local / bob123</p>`);
}
function registerPage(msg) {
  return layout('Register', null, `<h2>Create your HexaFlight account</h2>
  ${msg ? `<p style="color:#b00">${esc(msg)}</p>` : ''}
  <form method="POST" action="/register">
    <label>Full name <input name="name" style="width:260px"></label><br><br>
    <label>Email <input name="email" style="width:260px"></label><br><br>
    <label>Password <input name="password" type="password" style="width:260px"></label><br><br>
    <button>Register</button></form>`);
}
function forgotPage(msg) {
  return layout('Forgot password', null, `<h2>Forgot password</h2>
  ${msg ? `<p>${esc(msg)}</p>` : ''}
  <form method="POST" action="/forgot"><label>Email <input name="email" style="width:260px"></label><br><br><button>Send reset link</button></form>`);
}
function resetPage(token, msg) {
  return layout('Reset password', null, `<h2>Reset password</h2>
  ${msg ? `<p style="color:#b00">${esc(msg)}</p>` : ''}
  <form method="POST" action="/reset">
    <input type="hidden" name="token" value="${esc(token || '')}">
    <label>New password <input name="password" type="password" style="width:260px"></label><br><br>
    <button>Set new password</button></form>`);
}
function profilePage(user, msg) {
  return layout('Profile', user, `<h2>Your profile</h2>
  ${msg ? `<p>${esc(msg)}</p>` : ''}
  <p>Name: <b>${user.name}</b></p><p>Email: ${esc(user.email)}</p><p>Role: ${esc(user.role)}</p>
  <form method="POST" action="/profile/update">
    <input type="hidden" name="hx_origin" value="self">
    <label>Display name <input name="name" value="${esc(user.name)}" style="width:260px"></label>
    <button>Update profile</button></form>`);
}

/* ---------------- flight pages ---------------- */
function flightsPage(user, q, list) {
  const rows = list.map(f => {
    const seats = [];
    for (let r = 1; r <= 8; r++) for (const c of ['A', 'B', 'C', 'D']) {
      const s = r + c;
      seats.push(`<a href="/flight/${f.id}" style="color:${seatTaken(f.id, s, 0) ? '#c00' : '#080'}">${s}</a>`);
    }
    return `<tr><td><b>${esc(f.no)}</b></td><td>${esc(f.from)} → ${esc(f.to)}</td><td>${esc(f.date)} ${esc(f.time)}</td>
    <td>Economy $${f.fares.economy} · Business $${f.fares.business} · First $${f.fares.first}</td>
    <td><a href="/flight/${f.id}">View & book</a></td></tr>`;
  }).join('');
  /* NOTE (intentional flaw): the search term is reflected unescaped below. */
  return layout('Flights', user, `<h2>Flight search</h2>
  <form method="GET" action="/flights"><input name="q" value="${q || ''}" style="width:300px" placeholder="Search route, city or flight no."> <button>Search</button></form>
  ${q ? `<p>Results for: ${q}</p>` : ''}
  <table border="0" cellpadding="6" style="border-collapse:collapse"><tr><th>Flight</th><th>Route</th><th>When</th><th>Fares</th><th></th></tr>${rows}</table>`);
}
function flightPage(user, f) {
  let cells = '';
  for (let r = 1; r <= 8; r++) {
    cells += `<tr>`;
    for (const c of ['A', 'B', 'C', 'D']) {
      const s = r + c, taken = seatTaken(f.id, s, 0);
      cells += `<td style="padding:4px;border:1px solid #ccd">${s}<br><small>${seatClass(s)} $${seatPrice(f, s)}${taken ? '<br><span style="color:#c00">taken</span>' : ''}</small></td>`;
    }
    cells += `</tr>`;
  }
  return layout('Flight ' + f.no, user, `<h2>${esc(f.no)} — ${esc(f.from)} → ${esc(f.to)}</h2>
  <p>${esc(f.date)} · departs ${esc(f.time)}</p>
  <table style="border-collapse:collapse">${cells}</table>
  ${user ? `<h3>Book a seat</h3>
  <form method="POST" action="/book">
    <input type="hidden" name="hx_origin" value="self">
    <input type="hidden" name="flightId" value="${f.id}">
    <label>Seat <input name="seat" style="width:60px" placeholder="5C"></label>
    <label>Passenger name <input name="passengerName" value="${esc(user.name)}" style="width:200px"></label>
    <label>Price <input name="price" style="width:80px"></label>
    <label>Discount code <input name="discount" style="width:100px"></label>
    <button>Book</button></form>
  <p style="color:#777;font-size:13px">(The price box is pre-filled by our sales widget from the seat you pick — the server trusts it.)</p>`
  : '<p><a href="/login">Login</a> to book.</p>'}`);
}

/* ---------------- booking pages ---------------- */
function bookingRow(b, user) {
  const f = flights.find(x => x.id === b.flightId);
  return `<tr><td><a href="/booking/${b.id}">${b.pnr}</a></td><td>${esc(f ? f.no : '?')}</td><td>Seat ${esc(b.seat)} (${esc(b.fareClass)})</td>
  <td>$${b.amountDue} — ${b.paid ? 'PAID' : 'UNPAID'}${b.checkedIn ? ' · CHECKED IN' : ''} · ${esc(b.status)}</td>
  <td><a href="/ticket/${b.id}">E-ticket</a></td></tr>`;
}
function bookingsPage(user, mine) {
  return layout('My bookings', user, `<h2>My bookings</h2>
  <table border="0" cellpadding="6"><tr><th>PNR</th><th>Flight</th><th>Seat</th><th>Status</th><th></th></tr>
  ${mine.map(b => bookingRow(b, user)).join('') || '<tr><td>No bookings yet.</td></tr>'}</table>`);
}
function bookingPage(user, b, msg) {
  const f = flights.find(x => x.id === b.flightId);
  return layout('Booking ' + b.pnr, user, `<h2>Booking ${b.pnr}</h2>
  ${msg ? `<p>${esc(msg)}</p>` : ''}
  <p>Passenger: <b>${b.passengerName}</b></p>
  <p>Flight: ${esc(f ? f.no : '?')} — ${esc(f ? f.from : '')} → ${esc(f ? f.to : '')} · ${esc(f ? f.date : '')} ${esc(f ? f.time : '')}</p>
  <p>Seat: <b>${esc(b.seat)}</b> (${esc(b.fareClass)}) · Fare due: $${b.amountDue} · Paid: $${b.pricePaid} · Status: ${esc(b.status)}${b.checkedIn ? ' · CHECKED IN' : ''}</p>
  ${!b.paid && b.status === 'active' ? `<form method="POST" action="/book/${b.id}/pay"><input type="hidden" name="hx_origin" value="self">
    <label>Amount paid $ <input name="amount" style="width:80px"></label> <button>Pay now</button></form>` : ''}
  ${b.status === 'active' ? `<form method="POST" action="/booking/${b.id}/seat"><input type="hidden" name="hx_origin" value="self">
    <label>Change seat to <input name="seat" style="width:60px"></label> <button>Change seat</button></form>
  <form method="POST" action="/booking/${b.id}/checkin"><input type="hidden" name="hx_origin" value="self"><button>Check in</button></form>
  <form method="POST" action="/booking/${b.id}/cancel"><input type="hidden" name="hx_origin" value="self"><button>Cancel booking</button></form>` : ''}
  <p><a href="/ticket/${b.id}">View e-ticket</a></p>`);
}
function ticketPage(user, b) {
  const f = flights.find(x => x.id === b.flightId);
  return layout('E-ticket ' + b.pnr, user, `<div style="border:2px dashed #557;padding:18px;max-width:560px">
  <img src="/logo.png" style="height:34px"><h2 style="margin:6px 0">E-TICKET — HexaFlight</h2>
  <p>Passenger: <b>${b.passengerName}</b></p>
  <p>PNR: <b>${b.pnr}</b> · Flight: ${esc(f ? f.no : '')} · ${esc(f ? f.from : '')} → ${esc(f ? f.to : '')}</p>
  <p>Date: ${esc(f ? f.date : '')} ${esc(f ? f.time : '')} · Seat: <b>${esc(b.seat)}</b> · Class: ${esc(b.fareClass)}</p>
  <p>Fare paid: $${b.pricePaid} · Status: ${esc(b.status)}${b.checkedIn ? ' · CHECKED IN' : ''}</p></div>`);
}

/* ---------------- staff pages ---------------- */
function agentPage(user) {
  return layout('Agent desk', user, `<h2>Agent desk</h2>
  <p><a href="/agent/fare-rules">Fare rules (staff)</a></p>
  <h3>Create a discount code</h3>
  <form method="POST" action="/agent/discount"><input type="hidden" name="hx_origin" value="self">
  <label>Code <input name="code" style="width:120px"></label> <label>Percent off <input name="pct" style="width:60px"></label> <button>Create</button></form>
  <h3>All bookings</h3>
  <table border="0" cellpadding="6"><tr><th>PNR</th><th>Passenger</th><th>Flight</th><th>Seat</th><th>Status</th></tr>
  ${bookings.map(b => { const f = flights.find(x => x.id === b.flightId); return `<tr><td>${b.pnr}</td><td>${b.passengerName}</td><td>${esc(f ? f.no : '')}</td><td>${esc(b.seat)}</td><td>${esc(b.status)}</td></tr>`; }).join('')}
  </table>`);
}
function fareRulesPage(user) {
  return layout('Fare rules', user, `<h2>Fare rules — CONFIDENTIAL</h2><pre>${esc(JSON.stringify(fareRules, null, 2))}</pre>`);
}
function adminPage(user) {
  return layout('Admin', user, `<h2>Admin panel</h2>
  <p>Users:</p><ul>${users.map(u => `<li>${u.name} — ${esc(u.email)} (${esc(u.role)})</li>`).join('')}</ul>
  <h3>Update a fare</h3>
  <form method="POST" action="/admin/fares"><input type="hidden" name="hx_origin" value="self">
  <label>Flight id <input name="flightId" style="width:50px"></label>
  <label>Class <select name="fareClass"><option>economy</option><option>business</option><option>first</option></select></label>
  <label>New price $ <input name="price" style="width:80px"></label> <button>Update fare</button></form>`);
}

/* ---------------- mission board / completion / certificate ---------------- */
function testsPage(user) {
  const byFeature = {};
  for (const t of TESTS) (byFeature[t.feature] = byFeature[t.feature] || []).push(t);
  const sections = FEATURES.map(f => {
    const list = byFeature[f];
    const items = list.map(t => {
      const done = progress.tests[t.id];
      const hints = t.hints.map((h, i) => `<details><summary>Hint ${i + 1}</summary>${esc(h)}</details>`).join('');
      return `<li><b>${esc(t.name)}</b> — ${esc(t.owasp)} · ${esc(t.difficulty)} · ${done ? '✓ done' : '○ open'}<br><small>Where: ${esc(t.where)}</small>${hints}</li>`;
    }).join('');
    return `<h3>${esc(f)} — ${list.filter(t => progress.tests[t.id]).length}/${list.length} done · attempts: ${attemptsOf(f)}</h3><ul>${items}</ul>`;
  }).join('');
  return layout('Mission Board', user, `<h2>Mission Board — LAB ${LAB_NUMBER} ${LAB_NAME}</h2><p>${doneCount()}/${TESTS.length} tests complete.</p>${sections}`);
}
function completePage(user) {
  if (!isComplete()) {
    const open = TESTS.filter(t => !progress.tests[t.id]);
    return layout('Completion', user, `<h2>Not complete yet</h2><p>${doneCount()}/${TESTS.length} tests done (${Math.floor(doneCount() / TESTS.length * 100)}%).</p>
    <p>Still open:</p><ul>${open.map(t => `<li>${esc(t.feature)} — ${esc(t.name)}</li>`).join('')}</ul>`);
  }
  const byFeature = {};
  for (const t of TESTS) (byFeature[t.feature] = byFeature[t.feature] || []).push(t);
  const counts = FEATURES.map(f => `<li><b>${esc(f)}</b>: ${byFeature[f].length} vulnerabilities</li>`).join('');
  const techniques = TESTS.map(t => `<li>${esc(t.name)} (${esc(t.owasp)})</li>`).join('');
  const lessons = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('');
  const impacts = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('');
  const reports = TESTS.map(t => `<li><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)} — Remediation: ${esc(t.report.remediation)}</li>`).join('');
  return layout('Lab complete', user, `<h2>🎉 LAB ${LAB_NUMBER} — ${LAB_NAME} complete!</h2>
  <h3>1) Features in this lab (${FEATURES.length})</h3><ul>${FEATURES.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
  <h3>2) Vulnerabilities per feature</h3><ul>${counts}</ul>
  <h3>3) Ways testing was done (${TESTS.length} tests)</h3><ul>${techniques}</ul>
  <h3>4) What you learned</h3><ul>${lessons}</ul>
  <h3>5) What this means for a real client</h3><ul>${impacts}</ul>
  <h3>6) Writing it in a real report</h3><ul>${reports}</ul>
  <h3>Your completion key</h3>
  <p style="font-size:20px;background:#eef;padding:10px"><b>${esc(completionKey())}</b></p>
  <p>Paste this key into Lab ${LAB_NUMBER + 1} to unlock it.</p>
  <form method="POST" action="/complete/name"><label>Your name for the certificate <input name="name" value="${esc(progress.testerName || (user ? user.name : ''))}" style="width:240px"></label> <button>Save name</button></form>
  <p><a href="/certificate">View your certificate</a></p>`);
}
function certificatePage(user) {
  if (!isComplete()) return layout('Certificate', user, `<h2>Certificate locked</h2><p>Finish 100% of the tests first — you are at ${doneCount()}/${TESTS.length}.</p>`);
  const name = progress.testerName || (user ? user.name : 'Tester');
  const date = progress.completedAt ? new Date(progress.completedAt).toDateString() : new Date().toDateString();
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER}</title></head>
  <body style="font-family:Georgia;background:#e9e9f2;margin:0">${progressBar()}
  <div style="max-width:720px;margin:40px auto;background:#fff;border:6px double #7c5cff;padding:36px;text-align:center">
    <img src="/logo.png" style="height:64px">
    <h1 style="margin:10px 0">Certificate of Completion</h1>
    <p>This certifies that</p><h2>${esc(name)}</h2>
    <p>has completed 100% of the security tests in</p>
    <h3>LAB ${LAB_NUMBER} — ${LAB_NAME} (${TESTS.length} tests across ${FEATURES.length} features)</h3>
    <p>Completed on ${esc(date)}</p>
    <p style="margin-top:26px;color:#555">HexaCyberLab — Built by Md. Jony Hassain, Founder</p>
  </div>${chatWidget()}</body></html>`;
}

/* ============================================================================
   LAB COACH CHATBOT — rule-based, in-lab, knowledge = TESTS registry only.
   ========================================================================== */
const FEATURE_KEYS = {
  'Login & Authentication': ['login', 'auth', 'password', 'brute', 'reset token', 'sign in'],
  'Registration & Profile': ['regist', 'sign up', 'signup', 'profile'],
  'Flight Search': ['search'],
  'Bookings & Fares': ['booking', 'fare', 'pay', 'cancel'],
  'Seats & Check-in': ['seat', 'check-in', 'checkin', 'check in', 'ticket'],
  'Agent Desk': ['agent', 'discount', 'fare rule'],
  'Admin Panel': ['admin'],
  'Platform & API': ['api', 'debug', 'token']
};
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
function featureFromMessage(m) {
  for (const f of FEATURES) {
    if (m.includes(f.toLowerCase())) return f;
    for (const k of (FEATURE_KEYS[f] || [])) if (m.includes(k)) return f;
  }
  return null;
}
function chatReply(raw) {
  const m = String(raw || '').toLowerCase();
  const total = TESTS.length, done = doneCount(), pct = Math.floor(done / total * 100);
  if (/(who (built|made|created)|founder|jony|hexacyberlab)/.test(m)) return ATTRIBUTION;
  if (/(key|unlock next|next lab)/.test(m)) {
    if (isComplete() && progress.keyRevealed) return 'You completed this lab — well done! Your completion key is: ' + completionKey() + ' — paste it into Lab ' + (LAB_NUMBER + 1) + ' to unlock it.';
    return 'I don\u2019t have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at ' + pct + '% (' + done + '/' + total + '). The key will appear on the /complete page the moment you finish.';
  }
  const feat = featureFromMessage(m);
  if (/(how many|count|list|which|what tests|vulnerabilit)/.test(m)) {
    if (feat) {
      const list = TESTS.filter(t => t.feature === feat);
      return feat + ' has ' + list.length + ' tests: ' + list.map(t => t.name + (progress.tests[t.id] ? ' ✓' : '')).join('; ') + '. Attempts so far on this feature: ' + attemptsOf(feat) + '.';
    }
    return 'This lab has ' + total + ' tests across ' + FEATURES.length + ' features: ' + FEATURES.map(f => f + ' (' + TESTS.filter(t => t.feature === f).length + ')').join(', ') + '. You have completed ' + done + '/' + total + ' (' + pct + '%).';
  }
  if (/(progress|status|score|left|remaining|next)/.test(m)) {
    const next = TESTS.find(t => !progress.tests[t.id]);
    return 'Progress: ' + done + '/' + total + ' tests (' + pct + '%).' + (next ? ' Next open test: "' + next.name + '" in ' + next.feature + ' — see /tests for its hints.' : ' Everything is done — see /complete for your key and certificate.');
  }
  if (/(how|solve|guide|step|help me|exploit|bypass|hint)/.test(m)) {
    const f = feat || (TESTS.find(t => !progress.tests[t.id]) || {}).feature;
    if (!f) return 'Everything is already complete — see /complete for the summary, key and certificate.';
    const open = TESTS.filter(t => t.feature === f && !progress.tests[t.id]);
    if (!open.length) return 'You have already completed every test in ' + f + '. Pick another feature from /tests.';
    const n = attemptsOf(f);
    if (n >= 3) {
      const t = open[0];
      return 'Step by step for "' + t.name + '" (' + f + '): 1) ' + t.hints[0] + ' 2) ' + t.hints[1] + ' 3) ' + t.hints[2] + ' Lesson: ' + t.lesson;
    }
    return 'That feature is locked for help. First try the ' + f + ' tests yourself at least 3 times — I can see you\u2019ve tried ' + n + ' time(s) so far. After 3 real tries, ask me again and I\u2019ll guide you step by step.';
  }
  if (/(hi|hello|hey|salam|start)/.test(m)) {
    return 'Hello! I\u2019m the Lab Coach for LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '. This lab has ' + total + ' security tests across ' + FEATURES.length + ' features; you are at ' + pct + '%. Open /tests to see the Mission Board — every test has 3 hints, and after you\u2019ve genuinely tried a feature 3 times I can guide you step by step.';
  }
  return 'I can tell you how many tests each feature has, your progress, what to try next, and — once you\u2019ve tried a feature at least 3 times — step-by-step guidance for it. Ask me about a feature by name, or open /tests for the Mission Board.';
}

/* ============================================================================
   ROUTER
   ========================================================================== */
function requireLogin(req, res) {
  const u = currentUser(req);
  if (!u) { redirect(res, '/login'); return null; }
  return u;
}
function hasMarker(body) { return body && (body.hx_origin === 'self' || body.hx_origin === '1'); }

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    const pth = url.pathname;
    const ip = req.socket.remoteAddress || 'local';

    if (pth === '/logo.png') {
      try { const img = fs.readFileSync(path.join(DIR, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(img); }
      catch (e) { return send(res, 404, 'no logo'); }
    }
    if (pth === '/api/progress') {
      const features = {};
      for (const f of FEATURES) {
        const list = TESTS.filter(t => t.feature === f);
        features[f] = { total: list.length, done: list.filter(t => progress.tests[t.id]).length, attempts: attemptsOf(f) };
      }
      return send(res, 200, JSON.stringify({ lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done: doneCount(), pct: Math.floor(doneCount() / TESTS.length * 100), features, complete: isComplete() }, null, 2), 'application/json');
    }
    if (pth === '/api/chat' && req.method === 'POST') {
      const body = await readBody(req);
      let reply;
      try { reply = chatReply(body.message); } catch (e) { reply = 'I\u2019m here — ask me about the tests, your progress, or who built these labs.'; }
      return send(res, 200, JSON.stringify({ reply }), 'application/json');
    }

    /* -------- lock gate -------- */
    if (!progress.unlocked) {
      if (pth === '/unlock' && req.method === 'POST') {
        const body = await readBody(req);
        const given = String(body.key || '');
        if (entryKeyMatches(given)) { progress.unlocked = true; saveProgress(); return redirect(res, '/'); }
        return send(res, 403, gatePage('That key was not accepted.'));
      }
      return send(res, 200, gatePage());
    }

    /* -------- auth routes -------- */
    if (pth === '/login' && req.method === 'GET') return send(res, 200, loginPage());
    if (pth === '/login' && req.method === 'POST') {
      const body = await readBody(req);
      att('Login & Authentication');
      const email = String(body.email || ''), password = String(body.password || '');
      if (SQLI.test(email) || SQLI.test(password)) {
        pass('auth-sqli');
        const admin = users[0];
        const sid = crypto.randomBytes(16).toString('hex');
        sessions.set(sid, admin.id);
        res.writeHead(302, { 'Set-Cookie': [`sid=${sid}; Path=/; HttpOnly`, `hx_user=${encodeURIComponent(admin.email)}; Path=/`, `hx_role=${admin.role}; Path=/`, 'hx_origin=self; Path=/'], Location: '/flights' });
        return res.end();
      }
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) { enumProbe(ip, email); return send(res, 200, loginPage('No account exists for this email.')); }
      if (user.password !== password) {
        enumProbe(ip, email);
        loginFails[user.email] = (loginFails[user.email] || 0) + 1;
        if (loginFails[user.email] >= 10) pass('auth-brute');
        return send(res, 200, loginPage('Incorrect password for this account.'));
      }
      loginFails[user.email] = 0;
      if (user.email === 'helpdesk@hexaflight.local') pass('auth-default');
      const sid = crypto.randomBytes(16).toString('hex');
      sessions.set(sid, user.id);
      res.writeHead(302, { 'Set-Cookie': [`sid=${sid}; Path=/; HttpOnly`, `hx_user=${encodeURIComponent(user.email)}; Path=/`, `hx_role=${user.role}; Path=/`, 'hx_origin=self; Path=/'], Location: '/flights' });
      return res.end();
    }
    if (pth === '/logout') {
      const c = parseCookies(req);
      if (c.sid) sessions.delete(c.sid);
      res.writeHead(302, { 'Set-Cookie': ['sid=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0', 'hx_user=; Path=/; Max-Age=0'], Location: '/login' });
      return res.end();
    }
    if (pth === '/register' && req.method === 'GET') return send(res, 200, registerPage());
    if (pth === '/register' && req.method === 'POST') {
      const body = await readBody(req);
      att('Registration & Profile');
      const name = String(body.name || 'New User'), email = String(body.email || ''), password = String(body.password || '');
      if (!email || users.some(u => u.email.toLowerCase() === email.toLowerCase())) return send(res, 200, registerPage('That email is already registered (or empty).'));
      let role = 'passenger';
      if (body.role && ['passenger', 'agent', 'admin'].includes(String(body.role))) {
        role = String(body.role);
        if (role !== 'passenger') pass('reg-massassign');
      }
      if (password.length < 4) pass('reg-weakpw');
      if (XSS.test(name)) pass('reg-xss');
      const nu = { id: nextUserId++, name, email, password, role };
      users.push(nu);
      const sid = crypto.randomBytes(16).toString('hex');
      sessions.set(sid, nu.id);
      res.writeHead(302, { 'Set-Cookie': [`sid=${sid}; Path=/; HttpOnly`, `hx_user=${encodeURIComponent(nu.email)}; Path=/`, `hx_role=${nu.role}; Path=/`, 'hx_origin=self; Path=/'], Location: '/flights' });
      return res.end();
    }
    if (pth === '/forgot' && req.method === 'GET') return send(res, 200, forgotPage());
    if (pth === '/forgot' && req.method === 'POST') {
      const body = await readBody(req);
      att('Login & Authentication');
      const email = String(body.email || '');
      enumProbe(ip, email);
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) return send(res, 200, forgotPage('No account found for that email — nothing was sent.'));
      issuedResetTokens.set(user.id, resetTokenFor(user));
      return send(res, 200, forgotPage('Reset link sent! (Lab note: your reset link is /reset?token=' + resetTokenFor(user) + ' — in this practice lab the "email" is shown to you.)'));
    }
    if (pth === '/reset' && req.method === 'GET') return send(res, 200, resetPage(url.searchParams.get('token') || ''));
    if (pth === '/reset' && req.method === 'POST') {
      const body = await readBody(req);
      att('Login & Authentication');
      const token = String(body.token || ''), password = String(body.password || '');
      const user = users.find(u => resetTokenFor(u) === token);
      if (!user) return send(res, 200, resetPage(token, 'That reset token is not valid.'));
      if (issuedResetTokens.get(user.id) !== token) pass('auth-reset');
      issuedResetTokens.delete(user.id);
      user.password = password;
      return send(res, 200, loginPage('Password changed — please log in.'));
    }

    /* -------- profile -------- */
    if (pth === '/profile' && req.method === 'GET') { const u = requireLogin(req, res); if (!u) return; return send(res, 200, profilePage(u)); }
    if (pth === '/profile/update' && req.method === 'POST') {
      const u = requireLogin(req, res); if (!u) return;
      const body = await readBody(req);
      att('Registration & Profile');
      const name = String(body.name || u.name);
      if (XSS.test(name)) pass('reg-xss');
      u.name = name;
      if (!hasMarker(body)) pass('reg-csrf');
      return send(res, 200, profilePage(u, 'Profile updated.'));
    }

    /* -------- flights & search -------- */
    if (pth === '/flights' && req.method === 'GET') {
      const user = currentUser(req);
      const q = url.searchParams.get('q') || '';
      let list = flights.filter(f => !f.hidden);
      if (q) {
        att('Flight Search');
        if (SQLI.test(q)) { list = flights.slice(); pass('search-sqli'); }
        else {
          const needle = q.toLowerCase();
          list = list.filter(f => (f.from + f.to + f.no).toLowerCase().includes(needle));
        }
        if (XSS.test(q)) pass('search-xss');
      }
      return send(res, 200, flightsPage(user, q, list));
    }
    const fm = pth.match(/^\/flight\/(\d+)$/);
    if (fm && req.method === 'GET') {
      const f = flights.find(x => x.id === Number(fm[1]));
      if (!f) return send(res, 404, 'No such flight');
      return send(res, 200, flightPage(currentUser(req), f));
    }

    /* -------- booking create & pay -------- */
    if (pth === '/book' && req.method === 'POST') {
      const u = requireLogin(req, res); if (!u) return;
      const body = await readBody(req);
      att('Bookings & Fares');
      const f = flights.find(x => x.id === Number(body.flightId));
      if (!f) return send(res, 404, 'No such flight');
      const seat = String(body.seat || '').toUpperCase();
      if (!/^\d{1,2}[A-D]$/.test(seat)) return send(res, 400, 'Pick a seat like 5C.');
      if (seatTaken(f.id, seat, 0)) return send(res, 400, 'That seat is already taken — pick another (or try changing seats later).');
      const truePrice = seatPrice(f, seat);
      let due = truePrice;
      if (body.price !== undefined && body.price !== '' && !isNaN(Number(body.price))) {
        due = Number(body.price);
        if (due !== truePrice) pass('fare-tamper');
      }
      if (body.discount && discountCodes[String(body.discount).toUpperCase()]) {
        due = Math.round(due * (1 - discountCodes[String(body.discount).toUpperCase()] / 100));
      }
      const b = { id: nextBookingId, pnr: 'HF' + (1000 + nextBookingId), userId: u.id, flightId: f.id, seat, fareClass: seatClass(seat), amountDue: due, pricePaid: 0, paid: false, status: 'active', checkedIn: false, passengerName: String(body.passengerName || u.name) };
      nextBookingId++;
      bookings.push(b);
      return redirect(res, '/booking/' + b.id);
    }
    const paym = pth.match(/^\/book\/(\d+)\/pay$/);
    if (paym && req.method === 'POST') {
      const u = requireLogin(req, res); if (!u) return;
      const body = await readBody(req);
      att('Bookings & Fares');
      const b = bookings.find(x => x.id === Number(paym[1]));
      if (!b) return send(res, 404, 'No such booking');
      const amount = Number(body.amount);
      if (!isNaN(amount) && amount < b.amountDue) pass('pay-zero');
      b.pricePaid = isNaN(amount) ? 0 : amount;
      b.paid = true;
      return redirect(res, '/booking/' + b.id);
    }

    /* -------- booking views & actions -------- */
    if (pth === '/bookings' && req.method === 'GET') {
      const u = requireLogin(req, res); if (!u) return;
      return send(res, 200, bookingsPage(u, bookings.filter(b => b.userId === u.id)));
    }
    const bm = pth.match(/^\/booking\/(\d+)$/);
    if (bm && req.method === 'GET') {
      const u = requireLogin(req, res); if (!u) return;
      att('Bookings & Fares');
      const b = bookings.find(x => x.id === Number(bm[1]));
      if (!b) return send(res, 404, 'No such booking');
      if (b.userId !== u.id && u.role === 'passenger') pass('book-idor');
      return send(res, 200, bookingPage(u, b));
    }
    const cm = pth.match(/^\/booking\/(\d+)\/(cancel|checkin|seat)$/);
    if (cm && req.method === 'POST') {
      const u = requireLogin(req, res); if (!u) return;
      const body = await readBody(req);
      const b = bookings.find(x => x.id === Number(cm[1]));
      if (!b) return send(res, 404, 'No such booking');
      if (cm[2] === 'cancel') {
        att('Bookings & Fares');
        if (b.userId !== u.id && u.role === 'passenger') pass('book-cancel');
        b.status = 'cancelled';
        return redirect(res, '/bookings');
      }
      if (cm[2] === 'checkin') {
        att('Seats & Check-in');
        if (b.userId !== u.id && u.role === 'passenger') pass('checkin-idor');
        b.checkedIn = true;
        return redirect(res, '/booking/' + b.id);
      }
      /* seat change */
      att('Seats & Check-in');
      const seat = String(body.seat || '').toUpperCase();
      if (!/^\d{1,2}[A-D]$/.test(seat)) return send(res, 400, 'Pick a seat like 5C.');
      const f = flights.find(x => x.id === b.flightId);
      if (seatTaken(b.flightId, seat, b.id)) pass('seat-occupied');
      if (f && seatPrice(f, seat) > b.amountDue) pass('seat-premium');
      b.seat = seat; b.fareClass = seatClass(seat);
      return redirect(res, '/booking/' + b.id);
    }
    const tm = pth.match(/^\/ticket\/(\d+)$/);
    if (tm && req.method === 'GET') {
      const u = requireLogin(req, res); if (!u) return;
      att('Seats & Check-in');
      const b = bookings.find(x => x.id === Number(tm[1]));
      if (!b) return send(res, 404, 'No such booking');
      if (b.userId !== u.id && u.role === 'passenger') pass('ticket-idor');
      return send(res, 200, ticketPage(u, b));
    }

    /* -------- agent desk -------- */
    if (pth === '/agent' && req.method === 'GET') {
      const u = requireLogin(req, res); if (!u) return;
      if (u.role === 'passenger') return send(res, 403, layout('Agent desk', u, '<h2>Agent desk</h2><p>Staff only.</p>'));
      return send(res, 200, agentPage(u));
    }
    if (pth === '/agent/fare-rules' && req.method === 'GET') {
      const u = requireLogin(req, res); if (!u) return;
      att('Agent Desk');
      if (u.role === 'passenger') return send(res, 403, layout('Fare rules', u, '<h2>Fare rules</h2><p>Staff only.</p>'));
      return send(res, 200, fareRulesPage(u));
    }
    if (pth === '/api/fare-rules' && req.method === 'GET') {
      const u = currentUser(req);
      if (!u) return send(res, 401, JSON.stringify({ error: 'login required' }), 'application/json');
      att('Agent Desk');
      if (u.role === 'passenger') pass('agent-farerules');
      return send(res, 200, JSON.stringify(fareRules, null, 2), 'application/json');
    }
    if (pth === '/agent/discount' && req.method === 'POST') {
      const u = requireLogin(req, res); if (!u) return;
      const body = await readBody(req);
      att('Agent Desk');
      const code = String(body.code || '').toUpperCase().trim();
      const pct = Math.max(0, Math.min(100, Number(body.pct) || 0));
      if (code) {
        discountCodes[code] = pct;
        if (u.role === 'passenger') pass('agent-discount');
      }
      return send(res, 200, layout('Agent desk', u, `<h2>Discount code ${esc(code)} (${pct}%) created.</h2><p><a href="/agent">Back to the agent desk</a></p>`));
    }

    /* -------- admin -------- */
    if (pth === '/admin' && req.method === 'GET') {
      const u = currentUser(req);
      const c = parseCookies(req);
      att('Admin Panel');
      if (c.hx_role === 'admin') {
        if (!u || u.role !== 'admin') pass('auth-cookie');
        return send(res, 200, adminPage(u || { name: 'Cookie Admin', email: '', role: 'admin' }));
      }
      return send(res, 403, layout('Admin', u, '<h2>Admin panel</h2><p>Admins only.</p>'));
    }
    if (pth === '/admin/users' && req.method === 'GET') {
      const u = requireLogin(req, res); if (!u) return;
      att('Admin Panel');
      if (u.role !== 'admin') pass('admin-bac');
      return send(res, 200, JSON.stringify(users.map(x => ({ id: x.id, name: x.name, email: x.email, role: x.role })), null, 2), 'application/json');
    }
    if (pth === '/admin/fares' && req.method === 'POST') {
      const u = requireLogin(req, res); if (!u) return;
      const body = await readBody(req);
      att('Admin Panel');
      if (u.role !== 'admin') return send(res, 403, 'Admins only.');
      const f = flights.find(x => x.id === Number(body.flightId));
      if (f && ['economy', 'business', 'first'].includes(String(body.fareClass))) {
        f.fares[String(body.fareClass)] = Number(body.price) || f.fares[String(body.fareClass)];
        if (!hasMarker(body)) pass('admin-csrf');
      }
      return redirect(res, '/admin');
    }

    /* -------- platform & API -------- */
    if (pth === '/api/debug' && req.method === 'GET') {
      att('Platform & API');
      pass('platform-debug');
      return send(res, 200, JSON.stringify({ debug: true, users, fareRules, discountCodes }, null, 2), 'application/json');
    }
    if (pth === '/api/my-bookings' && req.method === 'GET') {
      att('Platform & API');
      const auth = req.headers.authorization || '';
      const token = auth.replace(/^Bearer\s+/i, '');
      const u = users.find(x => Buffer.from(x.email).toString('base64') === token);
      if (!u) return send(res, 401, JSON.stringify({ error: 'invalid token' }), 'application/json');
      pass('api-token');
      return send(res, 200, JSON.stringify(bookings.filter(b => b.userId === u.id), null, 2), 'application/json');
    }

    /* -------- lab system pages -------- */
    if (pth === '/tests') { const u = currentUser(req); return send(res, 200, testsPage(u)); }
    if (pth === '/complete' && req.method === 'GET') { const u = currentUser(req); return send(res, 200, completePage(u)); }
    if (pth === '/complete/name' && req.method === 'POST') {
      const body = await readBody(req);
      progress.testerName = String(body.name || '').slice(0, 80);
      saveProgress();
      return redirect(res, '/complete');
    }
    if (pth === '/certificate') { const u = currentUser(req); return send(res, 200, certificatePage(u)); }
    if (pth === '/' ) return redirect(res, '/flights');

    return send(res, 404, layout('Not found', currentUser(req), '<h2>404 — page not found</h2>'));
  } catch (e) {
    try { send(res, 500, 'Server error — the lab survived. Try again.'); } catch (e2) {}
  }
});

/* ============================================================================
   DOC GENERATION — `node server.js --gen-docs` regenerates the three
   registry-derived docs so their counts can never drift from TESTS.
   ========================================================================== */
function genDocs() {
  const byFeature = {};
  for (const t of TESTS) (byFeature[t.feature] = byFeature[t.feature] || []).push(t);
  let vuln = `# HexaFlight — VULNERABILITIES (LAB ${LAB_NUMBER})\n\nThe complete map: all ${TESTS.length} scored tests across ${FEATURES.length} features. Every entry is a real, working flaw in this local-only practice app.\n`;
  for (const f of FEATURES) {
    vuln += `\n## ${f} (${byFeature[f].length})\n`;
    for (const t of byFeature[f]) vuln += `\n### ${t.report.title}\n- **Test:** ${t.name} · **OWASP:** ${t.owasp} · **Difficulty:** ${t.difficulty} · **Severity (report):** ${t.report.severity}\n- **Location:** ${t.where}\n- **Impact:** ${t.impact}\n- **Remediation:** ${t.report.remediation}\n`;
  }
  let guide = `# HexaFlight — PRACTICE GUIDE (LAB ${LAB_NUMBER})\n\nChallenges grouped by feature, then difficulty. Objective = the measurable server-side effect that completes the test. Hints are graded: nudge → stronger → near-answer (the /tests Mission Board mirrors this).\n`;
  const order = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  for (const f of FEATURES) {
    guide += `\n## ${f}\n`;
    for (const t of byFeature[f].slice().sort((a, b) => order[a.difficulty] - order[b.difficulty])) {
      guide += `\n### [${t.difficulty}] ${t.name}\n- **Objective:** ${t.objective}\n- **Where:** ${t.where}\n- Hint 1: ${t.hints[0]}\n- Hint 2: ${t.hints[1]}\n- Hint 3: ${t.hints[2]}\n`;
    }
  }
  let fix = `# HexaFlight — FIX & RETEST (LAB ${LAB_NUMBER})\n\nFor every test: the secure implementation pattern and the regression check that proves the fix.\n`;
  for (const f of FEATURES) {
    fix += `\n## ${f}\n`;
    for (const t of byFeature[f]) fix += `\n### ${t.report.title}\n- **Fix:** ${t.report.remediation}\n- **Retest:** Re-run the original exploit for "${t.name}" (${t.where}) — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.\n- **Lesson:** ${t.lesson}\n`;
  }
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'), vuln);
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'), guide);
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'), fix);
  console.log('Docs regenerated: ' + TESTS.length + ' tests across ' + FEATURES.length + ' features.');
}
if (process.argv.includes('--gen-docs')) { genDocs(); process.exit(0); }

server.listen(PORT, '127.0.0.1', () => {
  console.log(`LAB ${LAB_NUMBER} — ${LAB_NAME} running at http://127.0.0.1:${PORT} (${TESTS.length} tests, ${FEATURES.length} features)`);
});
