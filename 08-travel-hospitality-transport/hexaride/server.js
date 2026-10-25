'use strict';
/*
 * HexaRide — LAB 74 (Category 8: Travel, Hospitality & Transport)
 * A deliberately vulnerable ride-hailing simulator for security training.
 * Zero-dependency Node.js. LOCAL USE ONLY — all data is fake seed data.
 * Contains the HexaCyberLab Lab System: entry-key gate, progress engine,
 * mission board (/tests), Lab Coach chatbot, completion page + certificate.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3083;
const LAB_NUMBER = 74;
const LAB_NAME = 'HexaRide';
const ROOT = __dirname;
const PROGRESS_FILE = path.join(ROOT, 'progress.json');

/* ---- key material, part 1 of 4 (sharded; assembled at runtime) ---- */

const _kC = ['TC1YSA==', 'TS01Nw==', 'MEFHVA=='];

/* ============================= seed data ============================= */
const users = [
  { id: 1, name: 'HexaRide Admin', email: 'admin@hexaride.local', password: 'admin123', role: 'admin', wallet: 0, earnings: 0 },
  { id: 2, name: 'Alice Rider', email: 'alice@test.local', password: 'alice123', role: 'rider', wallet: 50, earnings: 0 },
  { id: 3, name: 'Bob Rider', email: 'bob@test.local', password: 'bob123', role: 'rider', wallet: 20, earnings: 0 },
  { id: 4, name: 'Dave Driver', email: 'dave@test.local', password: 'dave123', role: 'driver', wallet: 0, earnings: 120 },
  { id: 5, name: 'Erin Driver', email: 'erin@test.local', password: 'erin123', role: 'driver', wallet: 0, earnings: 75 },
];
let nextUserId = 6;

const places = [
  { id: 1, name: 'Airport', x: 0, y: 0 },
  { id: 2, name: 'Downtown', x: 3, y: 4 },
  { id: 3, name: 'University', x: 6, y: 8 },
  { id: 4, name: 'City Mall', x: 12, y: 5 },
  { id: 5, name: 'Central Station', x: 2, y: 2 },
  { id: 6, name: 'General Hospital', x: 9, y: 3 },
  { id: 7, name: 'Sunny Beach', x: 15, y: 10 },
  { id: 8, name: 'Office Park', x: 4, y: 10 },
];
function placeById(id) { return places.find(p => p.id === Number(id)); }
function trueDistanceKm(a, b) {
  const d = Math.hypot(a.x - b.x, a.y - b.y) * 2; // simulator scale: 1 grid unit = 2 km
  return Math.round(d * 10) / 10;
}
function trueFare(km) { return Math.round((2.5 + 1.6 * km) * 100) / 100; }

const promos = [
  { code: 'WELCOME20', pct: 20, singleUse: false },
  { code: 'RIDE50', pct: 50, singleUse: false },
  { code: 'STUDENT10', pct: 10, singleUse: false },
  { code: 'RIDEFREE', pct: 100, singleUse: true },
];
const promoUse = {}; // "userId:CODE" -> times redeemed (the app counts but never enforces single-use)

const trips = [
  { id: 1, riderId: 2, driverId: 4, pickupId: 1, dropoffId: 3, distanceKm: 20, baseFare: 34.5, fare: 34.5, status: 'completed', paid: true, promos: [] },
  { id: 2, riderId: 3, driverId: 5, pickupId: 2, dropoffId: 4, distanceKm: 18.1, baseFare: 31.48, fare: 31.48, status: 'completed', paid: true, promos: [] },
  { id: 3, riderId: 2, driverId: 4, pickupId: 5, dropoffId: 2, distanceKm: 4.5, baseFare: 9.7, fare: 9.7, status: 'requested', paid: false, promos: [] },
];
let nextTripId = 4;
const ratings = []; // {tripId, byUserId, stars, comment}
const payouts = []; // {driverId, amount}
const sessions = new Map(); // sid -> userId
const issuedResetTokens = new Set();
const loginFailures = {}; // email -> count
const forgotProbes = {}; // ip -> Set of emails

/* ========================= progress engine =========================== */
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
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2)); } catch (e) { /* ignore */ }
}
loadProgress();

/* ============================ TESTS registry ========================= */
const TESTS = [
  // ---- Login & Authentication ----
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['The login form builds its database query by gluing your input straight into the query string.', 'A quote character ends the email string early — what could follow it to change the logic?', "Try an email like ' OR '1'='1' -- and any password. The -- comments out the password check."],
    lesson: 'String-built queries let attacker input change the query logic itself; parameterised queries make input data-only.',
    impact: 'On a real ride-hailing platform this hands an attacker an admin or driver account with no password — full access to trip histories, home addresses and earnings.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'No Brute-Force Protection on Login', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['Nothing slows you down when a password guess is wrong.', 'Keep guessing the same account — does anything lock, delay or CAPTCHA you after many failures?', 'Submit 10+ wrong passwords for one account (e.g. bob@test.local) — the 10th is still processed normally.'],
    lesson: 'Without rate limiting or lockout, online password guessing is free and unlimited.',
    impact: 'Attackers can grind through password lists against rider and driver accounts until one works — account takeover at scale.',
    report: { title: 'Missing Rate Limiting / Account Lockout on Login', severity: 'High', remediation: 'Throttle attempts per account and IP, add progressive delays or lockout, and alert on credential-stuffing patterns.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User Enumeration via Login & Reset Responses', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the error messages for an email that exists and one that does not.', 'The forgot-password form is even more talkative than the login form.', 'Probe 5+ different emails on /forgot: real accounts get "Reset link sent", unknown ones get "No account with that email".'],
    lesson: 'Different responses for existing vs non-existing accounts turn your forms into a free address book of valid users.',
    impact: 'Attackers confirm which customers and drivers have accounts, then target exactly those people with phishing and password attacks.',
    report: { title: 'Account Enumeration Through Differential Error Messages', severity: 'Medium', remediation: 'Return one generic message for login and password-reset regardless of whether the account exists.' } },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Default / Published Demo Credentials', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['The login page itself tells you a demo account.', 'Demo accounts in training material have a habit of surviving into production.', 'Sign in as admin@hexaride.local with the published demo password admin123.'],
    lesson: 'Default and demo credentials are public knowledge; if they work in production, the attacker knows them too.',
    impact: 'Anyone who reads the manual or this page owns the admin account — the most common "how did they get in?" answer in real breaches.',
    report: { title: 'Default Administrative Credentials Active', severity: 'Critical', remediation: 'Force unique strong passwords at first login; remove demo accounts and sample credentials from production.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07:2021 Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a reset for your own account and look at the token format.', 'The token is built from something you can see — the user id — plus fixed arithmetic.', 'Tokens look like HR<id>-<id*137+42>. Compute one for another user (e.g. id 3) and use /reset without ever requesting it.'],
    lesson: 'Reset tokens must be unguessable random values; a token derived from public data is no secret at all.',
    impact: 'Anyone can reset any rider, driver or admin password knowing only their user id — silent full account takeover.',
    report: { title: 'Password Reset Tokens Are Predictable', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), store them hashed, expire them quickly and make them single-use.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Role Cookie Tampering (Client-Side Role Trust)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After login, look at the cookies the app sets — one of them repeats your role.', 'The driver area believes that cookie instead of checking your account.', 'Set the hx_role cookie to "driver" (browser dev tools) while logged in as a rider, then open /driver.'],
    lesson: 'Anything stored on the client can be edited by the client; authorisation must be decided from server-side session data.',
    impact: 'Every rider becomes a "driver" in one edit — they can open driver tooling, see assigned trips and touch the trip lifecycle.',
    report: { title: 'Authorisation Decisions Trust a Client-Controlled Role Cookie', severity: 'High', remediation: 'Derive roles only from the server-side session record; never trust role claims stored in cookies.' } },
  // ---- Registration & Profile ----
  { id: 'reg-weak', feature: 'Registration & Profile', name: 'Weak Password Policy', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['How short can a password be at registration?', 'The form accepts almost anything as a password.', 'Register a new account with a 1-character password — it is accepted.'],
    lesson: 'A password policy that accepts "a" guarantees accounts that fall to the first guessing attempt.',
    impact: 'Customers pick trivial passwords and their accounts — with saved home addresses and wallet balances — are taken over.',
    report: { title: 'No Minimum Password Strength Enforced at Registration', severity: 'Medium', remediation: 'Enforce a minimum length (12+) and block known-breached passwords at registration and password change.' } },
  { id: 'reg-mass', feature: 'Registration & Profile', name: 'Mass Assignment — Role & Wallet Balance', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration handler copies more of your form than the visible fields.', 'What fields does a user record have that the form never shows? role? wallet?', 'Register while adding extra form fields role=driver and wallet=500 — the new account keeps them.'],
    lesson: 'Binding request data straight onto the data model lets clients write fields that were never offered to them.',
    impact: 'Attackers mint themselves driver/admin accounts with pre-loaded wallet balances — fraud and privilege escalation in one request.',
    report: { title: 'Mass Assignment Allows Setting Role and Wallet Balance at Registration', severity: 'High', remediation: 'Whitelist exactly the fields each form may set; assign role and balance server-side only.' } },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is printed back on pages other people see — including staff.', 'Does anything strip HTML from the name field?', 'Register or rename yourself with a name containing <script>alert(1)</script> or an <img onerror> payload — it is stored and rendered raw.'],
    lesson: 'User-controlled text rendered without output encoding becomes stored cross-site scripting.',
    impact: 'A malicious rider name executes script in the admin panel — session theft and actions performed as the admin.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-encode all user output and validate/sanitise stored profile fields.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The profile form includes a hidden hx_origin marker — but is it checked?', 'A state-changing POST from another site carries cookies but not that marker.', 'POST to /profile as a logged-in user WITHOUT the hx_origin field (e.g. from curl) — the change is accepted anyway.'],
    lesson: 'State-changing endpoints must verify an anti-CSRF token; a marker that is never checked protects nothing.',
    impact: 'A rider visiting a malicious page silently gets their profile (and contact email) changed — a stepping stone to account takeover.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require and verify a per-session CSRF token on every state-changing request; use SameSite cookies as defence in depth.' } },
  // ---- Trips & Fares ----
  { id: 'fare-tamper', feature: 'Trips & Fares', name: 'Fare Tampering — Client-Supplied Price', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['The booking form computes a helpful fare estimate in the page. Where is the real price decided?', 'The create-trip request accepts fields the form never shows.', 'Create a trip while adding a form field fare=1 — the platform stores YOUR price, not its own.'],
    lesson: 'Prices must be computed and enforced server-side; any price arriving from the client is a suggestion an attacker will edit.',
    impact: 'Riders cross the city for $1 — direct revenue loss on every tampered trip, invisible until finance reconciles.',
    report: { title: 'Trip Fare Accepted From Client Instead of Server-Side Calculation', severity: 'High', remediation: 'Compute fares exclusively on the server from distance and tariff; ignore client-supplied prices.' } },
  { id: 'fare-distance', feature: 'Trips & Fares', name: 'Distance Tampering — Client-Supplied Distance', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['Fare follows distance. Who measures the distance?', 'The booking request can carry its own distanceKm value.', 'Book Airport → Sunny Beach but send distanceKm=0.5 — the fare is calculated from your number.'],
    lesson: 'Derived values (distance → fare) must be derived on the server from trusted inputs, never accepted pre-computed from the client.',
    impact: 'Long, expensive routes are billed as trips around the block — systematic undercharging that scales with every ride.',
    report: { title: 'Client-Supplied Trip Distance Used for Fare Calculation', severity: 'High', remediation: 'Compute distance server-side from the stored pickup/dropoff coordinates; reject client-supplied distance.' } },
  { id: 'trip-idor', feature: 'Trips & Fares', name: "Trip IDOR — Other Riders' Trips & Routes", owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Trip pages live at predictable URLs: /trips/<id>.', 'Does the page check whose trip it is before showing pickup and dropoff?', "Open another rider's trip (e.g. /trips/2 while logged in as Alice) — full route history is served."],
    lesson: 'Every object access needs an ownership check; a sequential id is not authorisation.',
    impact: 'Anyone can map where any customer lives, works and travels — a physical-safety and stalking risk, not just a data leak.',
    report: { title: 'Insecure Direct Object Reference on Trip Details', severity: 'High', remediation: 'Verify the requesting user owns (or is assigned to) the trip on every read; return 404 for others.' } },
  { id: 'trip-cancel-idor', feature: 'Trips & Fares', name: "Cancel Another Rider's Trip (IDOR)", owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Cancelling is a POST to /trips/<id>/cancel.', 'Viewing was only the beginning — is writing checked any better?', "POST a cancel for a trip that belongs to someone else — it cancels."],
    lesson: 'Write endpoints need the same ownership checks as reads; a missing check turns read-only snooping into sabotage.',
    impact: 'Attackers cancel competitors\' or victims\' rides at will — service disruption and harassment straight from the API.',
    report: { title: 'Missing Ownership Check Allows Cancelling Other Users\' Trips', severity: 'High', remediation: 'Authorise every state change against the trip owner / assigned driver on the server.' } },
  { id: 'trip-status-forge', feature: 'Trips & Fares', name: 'Trip Completion by Non-Driver (Broken Function-Level Authorisation)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Drivers move a trip through accepted → ongoing → completed via /driver/trips/<id>/... endpoints.', 'The complete endpoint seems to have forgotten to ask WHO is calling.', 'As a RIDER, POST to /driver/trips/<your trip id>/complete — the trip completes without any driver.'],
    lesson: 'Each privileged function must verify the caller\'s role itself; "the button is hidden in the UI" is not a control.',
    impact: 'Riders complete their own trips to trigger payouts/ratings flows, or fake completed trips — fraud inside the core money flow.',
    report: { title: 'Driver-Only Trip Completion Endpoint Accepts Any Authenticated User', severity: 'High', remediation: 'Enforce role and assignment checks inside every driver endpoint, not just in the UI.' } },
  // ---- Promo Codes ----
  { id: 'promo-stack', feature: 'Promo Codes', name: 'Promo Code Stacking', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['One promo per trip is the business rule. Is it the code\'s rule?', 'The apply-promo endpoint can be called more than once on the same trip.', 'Apply WELCOME20 and then RIDE50 to the same unpaid trip — both discounts land.'],
    lesson: 'Business rules like "one promotion per order" must be enforced where the discount is applied, not assumed.',
    impact: 'Stacked discounts quietly erase the margin on every ride — a 20% + 50% stack makes most trips loss-makers.',
    report: { title: 'Multiple Promo Codes Can Be Stacked on One Trip', severity: 'Medium', remediation: 'Enforce a single active promotion per trip on the server; reject additional codes.' } },
  { id: 'promo-reuse', feature: 'Promo Codes', name: 'Single-Use Promo Code Reuse', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['RIDEFREE is a single-use welcome gift: 100% off, once per rider.', 'The system counts redemptions... and then does nothing with the count.', 'Use RIDEFREE on one trip, then on a second trip — it works again.'],
    lesson: 'Single-use semantics need a redemption record that is CHECKED at apply time, not just counted.',
    impact: 'One leaked "single-use" code becomes unlimited free rides for everyone who hears about it.',
    report: { title: 'Single-Use Promo Code Can Be Redeemed Unlimited Times', severity: 'Medium', remediation: 'Record redemptions per user and reject codes already redeemed where the terms say single-use.' } },
  { id: 'promo-retro', feature: 'Promo Codes', name: 'Promo Applied to a Completed Trip — Wallet Refund', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['What happens if you apply a promo to a trip that is already finished and paid?', 'The endpoint never asks about the trip\'s state — and it is generous about the difference.', 'Apply a promo code to your own completed, paid trip (e.g. trip 1) — the discount is credited back to your wallet.'],
    lesson: 'State matters: financial adjustments must validate the object\'s lifecycle state before moving money.',
    impact: 'Every finished trip becomes a refund machine — riders drain promo value out of historical rides indefinitely.',
    report: { title: 'Promo Codes Applicable to Completed Trips, Crediting the Wallet', severity: 'High', remediation: 'Only allow promo application on unpaid, uncompleted trips; never credit wallets from retroactive discounts.' } },
  // ---- Wallet & Payments ----
  { id: 'wallet-topup', feature: 'Wallet & Payments', name: 'Wallet Top-Up Amount Forgery', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['Top-up takes two numbers: what you pay and what you are credited. The form only shows one.', 'The server believes the credited amount the client sends.', 'POST /wallet/topup with amount=100 and paidAmount=1 — $100 lands in the wallet for a $1 "payment".'],
    lesson: 'Credit must equal the amount verified with the payment provider — never a number the client supplies.',
    impact: 'Free money: attackers load wallets with funds they never paid, then spend them on rides or cash-out flows.',
    report: { title: 'Wallet Credited With Client-Supplied Amount Independent of Payment', severity: 'Critical', remediation: 'Credit wallets only from verified payment-provider callbacks, for the exact captured amount.' } },
  { id: 'wallet-negpay', feature: 'Wallet & Payments', name: 'Negative Trip Payment Credits the Wallet', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['Paying a trip subtracts the amount from your wallet. What if the amount is below zero?', 'The pay endpoint never validates the sign of the amount.', 'On a completed unpaid trip of yours, POST /trips/<id>/pay with amount=-50 — your wallet GROWS and the trip counts as paid.'],
    lesson: 'Amounts must be validated as positive and equal to the amount due; arithmetic is not validation.',
    impact: 'Paying with negative amounts turns every fare into income — the platform pays riders to ride.',
    report: { title: 'Negative Payment Amount Accepted and Credited to Wallet', severity: 'High', remediation: 'Reject non-positive amounts and require the payment to equal the server-side amount due.' } },
  // ---- Driver & Earnings ----
  { id: 'driver-earnings-idor', feature: 'Driver & Earnings', name: "Driver Earnings IDOR", owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The earnings page takes a driverId parameter.', 'It never asks whether that driver is you.', "Open /driver/earnings?driverId=5 while logged in as someone else — Erin's earnings are served."],
    lesson: 'Financial data needs the same ownership checks as personal data — a parameter is not permission.',
    impact: 'Drivers\' income data leaks to anyone — competitive intelligence and a privacy breach for every driver on the platform.',
    report: { title: 'Earnings of Any Driver Visible via IDOR', severity: 'Medium', remediation: 'Ignore client-supplied driver ids; serve earnings only for the authenticated driver.' } },
  { id: 'driver-payout', feature: 'Driver & Earnings', name: 'Payout Above Earnings Balance', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['Drivers request payouts of their earnings. Who checks the balance?', 'The payout form certainly shows your balance — but the endpoint trusts your amount.', 'As a driver, POST /driver/payout with an amount far above your earnings (e.g. 10000) — it is accepted.'],
    lesson: 'Withdrawal endpoints must verify the available balance server-side at the moment of the request.',
    impact: 'Drivers cash out money they never earned — direct financial theft from the platform.',
    report: { title: 'Payout Requests Not Checked Against Earnings Balance', severity: 'High', remediation: 'Validate payout amount ≤ available earnings server-side and reserve the funds atomically.' } },
  // ---- Ratings ----
  { id: 'rating-value', feature: 'Ratings', name: 'Out-of-Range Rating Value Accepted', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['Ratings are 1–5 stars. In the UI, anyway.', 'The rating endpoint stores whatever number arrives.', 'Rate one of your completed trips with stars=100 — it is stored as-is.'],
    lesson: 'Range validation belongs on the server for every numeric input, ratings included.',
    impact: 'Rating averages are destroyed by absurd values — driver reputations and ranking algorithms become meaningless.',
    report: { title: 'Rating Value Not Range-Validated (Accepts 100 Stars)', severity: 'Low', remediation: 'Validate ratings as integers within 1–5 on the server.' } },
  { id: 'rating-foreign', feature: 'Ratings', name: 'Rating a Trip You Did Not Take', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The rate endpoint asks for a trip id. Whose trip may it be?', 'Nothing ties the rater to the trip.', "Rate another rider's completed trip (e.g. trip 2 as Alice) — the review lands."],
    lesson: 'Actions on an object must verify the actor\'s relationship to that object.',
    impact: 'Fake reviews from strangers — reputation manipulation against drivers or riders, straight through the official endpoint.',
    report: { title: 'Users Can Rate Trips They Did Not Take', severity: 'Medium', remediation: 'Only the trip\'s rider may rate it, once, after completion.' } },
  // ---- Admin & Platform ----
  { id: 'admin-bac', feature: 'Admin & Platform', name: 'Admin Panel Without Access Control', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The admin panel lives at /admin. Surely it checks for admins?', 'It does not. Anyone with any login can open it.', 'Log in as a plain rider and open /admin — the full user list, passwords included, is served.'],
    lesson: 'Sensitive areas must check the role server-side on every request — obscurity of the URL is not protection.',
    impact: 'Every customer account can open the admin console and read all credentials — total platform compromise.',
    report: { title: 'Administrative Panel Accessible to Any Authenticated User', severity: 'Critical', remediation: 'Enforce admin role checks server-side on all administrative routes.' } },
  { id: 'platform-debug', feature: 'Admin & Platform', name: 'Debug Endpoint Exposes All Accounts & Passwords', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Development leftovers have a habit of shipping. Check /api/debug.', 'No login is even required once the lab is unlocked.', 'Open /api/debug — the whole user table, plaintext passwords included, comes back as JSON.'],
    lesson: 'Debug/diagnostic endpoints must never reach production; if they do, they must be authenticated and audited.',
    impact: 'One URL hands an attacker every account and password on the platform — the breach writes itself.',
    report: { title: 'Unauthenticated Debug Endpoint Dumps User Credentials', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; never store or return plaintext passwords.' } },
];
const FEATURES = [...new Set(TESTS.map(t => t.feature))];
function testById(id) { return TESTS.find(t => t.id === id); }

/* ---- key material, part 2 of 4 ---- */
const _kB = ['LVBBOA==', 'SDI5Sg==', 'OFBRSA=='];
function _unshard(parts) { return parts.map(s => [...Buffer.from(s, 'base64').toString('utf8')].reverse().join('')).join(''); }

/* ---- key material, part 3 of 4 ---- */
const _kD = ['LUdIRA==', 'RlE0Sg==', 'UE4yTg=='];
const ENTRY_KEY_SHA256 = '897c02facc0786ff02e0bf838795ce1fb564d4941502de5d34255d528746df42';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */
function completionKey() { return progress.keyRevealed ? _unshard([..._kC, ..._kD]) : null; }

/* ============================== helpers ============================== */
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
const XSS_PAT = /(<script|onerror\s*=|onload\s*=|<svg|<img|<iframe|javascript:)/i;
const SQLI_PAT = /('|")\s*(OR|AND)\b|--|'\s*OR\s*'|UNION\s+SELECT/i;
function money(n) { return '$' + Number(n || 0).toFixed(2); }
function userById(id) { return users.find(u => u.id === Number(id)); }
function userByEmail(email) { return users.find(u => u.email === String(email || '').toLowerCase()); }

function attempt(feature) {
  progress.attempts[feature] = (progress.attempts[feature] || 0) + 1;
  saveProgress();
}
function pass(id) {
  if (!progress.tests[id]) {
    progress.tests[id] = true;
    if (Object.keys(progress.tests).length >= TESTS.length && !progress.completedAt) {
      progress.completedAt = new Date().toISOString();
      progress.keyRevealed = true;
    }
    saveProgress();
  }
}
function doneCount() { return Object.keys(progress.tests).length; }
function pct() { return Math.floor((doneCount() / TESTS.length) * 100); }
function featureStats(f) {
  const list = TESTS.filter(t => t.feature === f);
  return { total: list.length, done: list.filter(t => progress.tests[t.id]).length, attempts: progress.attempts[f] || 0 };
}

/* ---------------- mini SQL evaluator (for the vulnerable login) ---------------- */
function tokenizeSql(s) {
  const toks = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
    if (c === '-' && s[i + 1] === '-') break; // SQL comment: rest is ignored
    if (c === "'") { let j = i + 1, str = ''; while (j < s.length && s[j] !== "'") { str += s[j]; j++; } toks.push({ t: 'str', v: str }); i = j + 1; continue; }
    if (c === '=') { toks.push({ t: 'eq' }); i++; continue; }
    if (/[A-Za-z0-9_.@]/.test(c)) {
      let j = i, w = ''; while (j < s.length && /[A-Za-z0-9_.@]/.test(s[j])) { w += s[j]; j++; }
      const up = w.toUpperCase();
      if (up === 'AND') toks.push({ t: 'and' }); else if (up === 'OR') toks.push({ t: 'or' }); else toks.push({ t: 'ident', v: w });
      i = j; continue;
    }
    i++;
  }
  return toks;
}
function evalWhere(toks, row) {
  let pos = 0;
  function operand() {
    const tk = toks[pos++];
    if (!tk) return '';
    if (tk.t === 'str') return tk.v;
    if (tk.t === 'ident') { const k = tk.v.toLowerCase(); return row[k] !== undefined ? String(row[k]) : tk.v; }
    return '';
  }
  function cmp() { const a = operand(); if (toks[pos] && toks[pos].t === 'eq') { pos++; const b = operand(); return a === b; } return a === 'true'; }
  function andE() { let v = cmp(); while (toks[pos] && toks[pos].t === 'and') { pos++; const r = cmp(); v = v && r; } return v; }
  function orE() { let v = andE(); while (toks[pos] && toks[pos].t === 'or') { pos++; const r = andE(); v = v || r; } return v; }
  return orE();
}
function sqlLogin(email, password) {
  // VULNERABLE BY DESIGN: the query is built by string concatenation.
  const q = "SELECT * FROM users WHERE email = '" + email + "' AND password = '" + password + "'";
  const where = q.slice(q.indexOf('WHERE') + 5);
  const toks = tokenizeSql(where);
  for (const u of users) {
    if (evalWhere(toks, { email: u.email, password: u.password, role: u.role, id: String(u.id), name: u.name })) return u;
  }
  return null;
}
function resetTokenFor(u) { return 'HR' + u.id + '-' + (u.id * 137 + 42); }

/* ============================== sessions ============================= */
function parseCookies(req) {
  const out = {};
  const h = req.headers.cookie || '';
  for (const part of h.split(';')) { const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); }
  return out;
}
function sessionUser(req) {
  const c = parseCookies(req);
  if (c.hx_session && sessions.has(c.hx_session)) return userById(sessions.get(c.hx_session));
  return null;
}
function startSession(res, user) {
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, user.id);
  res.setHeader('Set-Cookie', [
    'hx_session=' + sid + '; Path=/; HttpOnly',
    'hx_role=' + user.role + '; Path=/', // the app exposes the role to the client — and (in one place) trusts it back
    'hx_origin=present; Path=/',
  ]);
}

/* ================================ UI ================================= */
function progressBar() {
  const d = doneCount(), p = pct();
  return '<div style="background:#1d1d29;border:1px solid #333;border-radius:8px;padding:8px 12px;margin:10px 0;color:#eee">' +
    '<b>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</b> · ' + d + '/' + TESTS.length + ' tests · ' + p + '%' +
    '<div style="background:#333;height:10px;border-radius:5px;margin-top:6px"><div style="background:#7c5cff;height:10px;border-radius:5px;width:' + p + '%"></div></div></div>';
}
function layout(req, title, body, user) {
  const nav = user
    ? '<a href="/">Book a ride</a> · <a href="/trips">My trips</a> · <a href="/wallet">Wallet</a> · <a href="/driver">Driver area</a> · <a href="/profile">Profile</a> · <a href="/tests">Mission Board</a> · <a href="/logout">Log out (' + user.name + ')</a>'
    : '<a href="/login">Log in</a> · <a href="/register">Register</a> · <a href="/tests">Mission Board</a>';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + ' · LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</title></head>' +
    '<body style="margin:0;background:#101018;font-family:Arial,sans-serif;color:#eee"><div style="max-width:860px;margin:0 auto;padding:16px">' +
    '<div style="display:flex;align-items:center;gap:12px"><img src="/logo.png" style="height:44px"><h1 style="margin:0;font-size:22px">HexaRide</h1></div>' +
    '<div style="margin:8px 0">' + nav + '</div>' + progressBar() + body + '</div>' + chatWidget() + '</body></html>';
}
function chatWidget() {
  return '<div style="position:fixed;right:14px;bottom:14px;width:300px;background:#1d1d29;border:1px solid #444;border-radius:10px;color:#eee;font-family:Arial">' +
    '<div style="padding:8px 10px;border-bottom:1px solid #333"><b>Lab Coach</b></div>' +
    '<div id="chatlog" style="height:150px;overflow:auto;padding:8px;font-size:13px"></div>' +
    '<div style="display:flex"><input id="chatin" style="flex:1;padding:8px;background:#14141d;color:#eee;border:0" placeholder="Ask the coach...">' +
    '<button onclick="sendChat()" style="padding:8px;background:#7c5cff;color:#fff;border:0">Send</button></div>' +
    '<script>async function sendChat(){var i=document.getElementById("chatin");var m=i.value;i.value="";var l=document.getElementById("chatlog");l.innerHTML+="<div><b>You:</b> "+m.replace(/</g,"&lt;")+"</div>";try{var r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:m})});var j=await r.json();l.innerHTML+="<div><b>Coach:</b> "+j.reply.replace(/</g,"&lt;")+"</div>";}catch(e){l.innerHTML+="<div><b>Coach:</b> (unavailable)</div>";}l.scrollTop=l.scrollHeight;}</script></div>';
}
function gatePage(msg) {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' · Locked</title></head>' +
    '<body style="margin:0;background:#14141d;font-family:Arial,sans-serif"><div style="max-width:520px;margin:60px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:28px;text-align:center;color:#222">' +
    '<img src="/logo.png" style="height:56px"><h2>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h2>' +
    '<p>This lab is locked. Paste the completion key from Lab ' + (LAB_NUMBER - 1) + ' to start.</p>' +
    (msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/unlock"><input name="key" style="padding:9px;width:80%" placeholder="Completion key from Lab ' + (LAB_NUMBER - 1) + '"><br><br>' +
    '<button style="padding:10px 22px">Unlock LAB ' + LAB_NUMBER + '</button></form></div>' + chatWidget() + '</body></html>';
}

/* =============================== pages =============================== */
function loginPage(msg) {
  return '<h2>Log in to HexaRide</h2>' + (msg ? '<p style="color:#ff8080">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/login" style="background:#1d1d29;padding:16px;border-radius:10px;max-width:420px">' +
    'Email<br><input name="email" style="width:95%;padding:8px"><br><br>Password<br><input name="password" type="password" style="width:95%;padding:8px"><br><br>' +
    '<button style="padding:10px 20px">Log in</button></form>' +
    '<p style="color:#aaa;font-size:13px">Demo accounts (training build): admin@hexaride.local / admin123 · alice@test.local / alice123 · bob@test.local / bob123 · dave@test.local / dave123 (driver) · erin@test.local / erin123 (driver)</p>' +
    '<p><a href="/forgot">Forgot password?</a></p>';
}
function registerPage(msg) {
  return '<h2>Create your HexaRide account</h2>' + (msg ? '<p style="color:#ff8080">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/register" style="background:#1d1d29;padding:16px;border-radius:10px;max-width:420px">' +
    'Display name<br><input name="name" style="width:95%;padding:8px"><br><br>Email<br><input name="email" style="width:95%;padding:8px"><br><br>' +
    'Password<br><input name="password" type="password" style="width:95%;padding:8px"><br><br>' +
    '<button style="padding:10px 20px">Register</button></form>';
}
function forgotPage(msg) {
  return '<h2>Forgot password</h2>' + (msg ? '<p>' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/forgot" style="background:#1d1d29;padding:16px;border-radius:10px;max-width:420px">' +
    'Email<br><input name="email" style="width:95%;padding:8px"><br><br><button style="padding:10px 20px">Send reset link</button></form>';
}
function homePage(user, msg) {
  const opts = places.map(p => '<option value="' + p.id + '">' + esc(p.name) + '</option>').join('');
  return (msg ? '<p style="color:#9f9">' + esc(msg) + '</p>' : '') +
    '<h2>Book a ride</h2><p>Signed in as ' + user.name + ' (' + user.role + ') · Wallet: ' + money(user.wallet) + '</p>' +
    '<form method="POST" action="/trips" style="background:#1d1d29;padding:16px;border-radius:10px;max-width:460px">' +
    'Pickup<br><select name="pickupId" style="width:95%;padding:8px">' + opts + '</select><br><br>' +
    'Dropoff<br><select name="dropoffId" style="width:95%;padding:8px">' + opts + '</select><br><br>' +
    '<button style="padding:10px 20px">Request ride</button></form>' +
    '<p style="color:#aaa;font-size:13px">Fare = $2.50 base + $1.60/km, computed from our location grid. A driver is assigned automatically.</p>';
}
function tripRow(t, user) {
  const pu = placeById(t.pickupId), dr = placeById(t.dropoffId);
  return '<div style="background:#1d1d29;border:1px solid #333;border-radius:8px;padding:10px;margin:8px 0">' +
    '<b>Trip #' + t.id + '</b> · ' + esc(pu ? pu.name : '?') + ' → ' + esc(dr ? dr.name : '?') + ' · ' + t.distanceKm + ' km · Fare ' + money(t.fare) +
    ' · Status: ' + esc(t.status) + (t.paid ? ' · Paid' : ' · Unpaid') +
    (t.promos.length ? ' · Promos: ' + t.promos.map(esc).join(', ') : '') +
    ' · <a href="/trips/' + t.id + '">Details</a></div>';
}
function tripsPage(user) {
  const mine = trips.filter(t => t.riderId === user.id);
  return '<h2>My trips</h2>' + (mine.length ? mine.map(t => tripRow(t, user)).join('') : '<p>No trips yet.</p>');
}
function tripDetailPage(t, user, msg) {
  const pu = placeById(t.pickupId), dr = placeById(t.dropoffId);
  const driver = userById(t.driverId), rider = userById(t.riderId);
  const myRatings = ratings.filter(r => r.tripId === t.id);
  return (msg ? '<p style="color:#9f9">' + esc(msg) + '</p>' : '') + '<h2>Trip #' + t.id + '</h2>' +
    '<div style="background:#1d1d29;padding:16px;border-radius:10px">' +
    '<p>Route: ' + esc(pu ? pu.name : '?') + ' → ' + esc(dr ? dr.name : '?') + ' (' + t.distanceKm + ' km)</p>' +
    '<p>Rider: ' + (rider ? rider.name : '?') + ' · Driver: ' + (driver ? driver.name : 'unassigned') + '</p>' +
    '<p>Status: ' + esc(t.status) + ' · Fare: ' + money(t.fare) + (t.paid ? ' · Paid' : ' · Unpaid') + '</p>' +
    '<form method="POST" action="/trips/' + t.id + '/cancel" style="display:inline"><button>Cancel trip</button></form> ' +
    '<form method="POST" action="/trips/' + t.id + '/promo" style="display:inline"><input name="code" placeholder="Promo code" style="padding:6px"> <button>Apply promo</button></form> ' +
    (t.status === 'completed' && !t.paid ? '<form method="POST" action="/trips/' + t.id + '/pay" style="display:inline"><input name="amount" placeholder="Amount" style="padding:6px;width:80px"> <button>Pay</button></form>' : '') +
    '<h3>Rate this trip</h3><form method="POST" action="/trips/' + t.id + '/rate"><input name="stars" placeholder="Stars (1-5)" style="padding:6px;width:90px"> <input name="comment" placeholder="Comment" style="padding:6px"> <button>Rate</button></form>' +
    (myRatings.length ? '<h3>Ratings</h3>' + myRatings.map(r => '<p>★ ' + esc(r.stars) + ' — ' + esc(r.comment || '') + ' (by user ' + r.byUserId + ')</p>').join('') : '') +
    '</div>';
}
function walletPage(user, msg) {
  return (msg ? '<p style="color:#9f9">' + esc(msg) + '</p>' : '') + '<h2>Wallet</h2><p>Balance: <b>' + money(user.wallet) + '</b></p>' +
    '<form method="POST" action="/wallet/topup" style="background:#1d1d29;padding:16px;border-radius:10px;max-width:420px">' +
    'Top-up amount<br><input name="amount" style="width:95%;padding:8px"><input type="hidden" name="paidAmount" value="">' +
    '<br><br><button style="padding:10px 20px">Top up</button></form>' +
    '<p style="color:#aaa;font-size:13px">Card payment is simulated in this training build.</p>';
}
function driverPage(user, cookies, msg) {
  const assigned = trips.filter(t => t.driverId === user.id);
  const rows = assigned.map(t => {
    const pu = placeById(t.pickupId), dr = placeById(t.dropoffId);
    return '<div style="background:#1d1d29;border:1px solid #333;border-radius:8px;padding:10px;margin:8px 0"><b>Trip #' + t.id + '</b> · ' +
      esc(pu ? pu.name : '?') + ' → ' + esc(dr ? dr.name : '?') + ' · ' + money(t.fare) + ' · ' + esc(t.status) +
      ' <form method="POST" action="/driver/trips/' + t.id + '/accept" style="display:inline"><button>Accept</button></form>' +
      ' <form method="POST" action="/driver/trips/' + t.id + '/start" style="display:inline"><button>Start</button></form>' +
      ' <form method="POST" action="/driver/trips/' + t.id + '/complete" style="display:inline"><button>Complete</button></form></div>';
  }).join('');
  return (msg ? '<p style="color:#9f9">' + esc(msg) + '</p>' : '') + '<h2>Driver area</h2><p>Your earnings balance: ' + money(user.earnings) + ' · <a href="/driver/earnings?driverId=' + user.id + '">Earnings detail</a></p>' +
    '<form method="POST" action="/driver/payout" style="background:#1d1d29;padding:12px;border-radius:10px;max-width:420px">Request payout<br><input name="amount" style="padding:8px;width:60%"> <button>Request</button></form>' +
    '<h3>Assigned trips</h3>' + (rows || '<p>No assigned trips.</p>');
}
function earningsPage(target, user) {
  return '<h2>Earnings — ' + target.name + '</h2><p>Total earnings available for payout: <b>' + money(target.earnings) + '</b></p>' +
    '<p style="color:#aaa">Payouts requested: ' + payouts.filter(p => p.driverId === target.id).map(p => money(p.amount)).join(', ') + '</p>';
}
function adminPage() {
  return '<h2>Admin panel</h2><p>All accounts:</p>' + users.map(u =>
    '<div style="background:#1d1d29;border:1px solid #333;border-radius:8px;padding:8px;margin:6px 0">' +
    '#' + u.id + ' · ' + u.name + ' · ' + esc(u.email) + ' · role ' + esc(u.role) + ' · password: ' + esc(u.password) + ' · wallet ' + money(u.wallet) + '</div>').join('');
}
function testsPage(user) {
  let h = '<h2>Mission Board — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h2><p>' + doneCount() + '/' + TESTS.length + ' tests complete (' + pct() + '%). Complete every test to earn the completion key and certificate.</p>';
  for (const f of FEATURES) {
    const st = featureStats(f);
    h += '<h3>' + esc(f) + ' — ' + st.done + '/' + st.total + ' · attempts: ' + st.attempts + '</h3>';
    for (const t of TESTS.filter(x => x.feature === f)) {
      h += '<div style="background:#1d1d29;border:1px solid #333;border-radius:8px;padding:10px;margin:8px 0">' +
        '<b>' + (progress.tests[t.id] ? '✓' : '○') + ' ' + esc(t.name) + '</b> · ' + esc(t.owasp) + ' · ' + esc(t.difficulty) +
        '<details><summary>Hint 1</summary><p>' + esc(t.hints[0]) + '</p><details><summary>Hint 2</summary><p>' + esc(t.hints[1]) + '</p>' +
        '<details><summary>Hint 3</summary><p>' + esc(t.hints[2]) + '</p></details></details></details></div>';
    }
  }
  return h;
}
function completePage(user) { if (!user) user = { name: 'Security Tester', email: '', id: 0 };
  if (doneCount() < TESTS.length) {
    return '<h2>Not complete yet</h2><p>' + doneCount() + '/' + TESTS.length + ' tests done (' + pct() + '%). Finish every test on the <a href="/tests">Mission Board</a> to unlock this page.</p>';
  }
  const key = completionKey();
  let h = '<h2>🎉 Lab complete — 100%</h2>';
  h += '<h3>1) Features in this lab</h3><p>' + FEATURES.length + ' features: ' + FEATURES.map(esc).join(', ') + '</p>';
  h += '<h3>2) Vulnerabilities per feature</h3>' + FEATURES.map(f => '<p>' + esc(f) + ': ' + TESTS.filter(t => t.feature === f).length + '</p>').join('');
  h += '<h3>3) How the testing was done (' + TESTS.length + ' techniques)</h3>' + TESTS.map(t => '<p>• ' + esc(t.name) + ' (' + esc(t.owasp) + ')</p>').join('');
  h += '<h3>4) What you learned</h3>' + TESTS.map(t => '<p>• <b>' + esc(t.name) + ':</b> ' + esc(t.lesson) + '</p>').join('');
  h += '<h3>5) What this means for a real client</h3>' + TESTS.map(t => '<p>• <b>' + esc(t.name) + ':</b> ' + esc(t.impact) + '</p>').join('');
  h += '<h3>6) Writing it in a real report</h3>' + TESTS.map(t => '<p>• <b>' + esc(t.report.title) + '</b> — Severity: ' + esc(t.report.severity) + ' — Fix: ' + esc(t.report.remediation) + '</p>').join('');
  h += '<h3>Your completion key</h3><div style="background:#1d1d29;border:1px solid #7c5cff;border-radius:8px;padding:14px;font-size:18px"><b>' + esc(key || '') + '</b></div>' +
    '<p>Paste this key into the next lab to unlock it.</p>' +
    '<form method="POST" action="/complete/name">Your name for the certificate: <input name="name" value="' + esc(progress.testerName) + '" style="padding:7px"> <button>Save name</button></form>' +
    '<p><a href="/certificate">View your certificate →</a></p>';
  return h;
}
function certificatePage(user) { if (!user) user = { name: 'Security Tester', email: '', id: 0 };
  if (doneCount() < TESTS.length) return '<h2>Certificate locked</h2><p>Complete 100% of the tests first (' + pct() + '% so far).</p>';
  const name = progress.testerName || (user ? user.name : 'HexaRide Tester');
  const date = progress.completedAt ? new Date(progress.completedAt).toISOString().slice(0, 10) : '';
  return '<div style="background:#fff;color:#222;border-radius:12px;padding:32px;text-align:center;max-width:640px;margin:20px auto">' +
    '<img src="/logo.png" style="height:64px"><h2>Certificate of Completion</h2>' +
    '<p>This certifies that</p><h3>' + esc(name) + '</h3>' +
    '<p>has completed 100% of the security tests in LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' (' + TESTS.length + ' tests across ' + FEATURES.length + ' features)</p>' +
    '<p>' + esc(date) + '</p><p style="color:#555">HexaCyberLab — Built by Md. Jony Hassain, Founder</p></div>' +
    '<style>@media print{body{background:#fff}}</style>';
}

/* ============================== chatbot ============================== */
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
function matchFeature(msg) {
  const m = msg.toLowerCase();
  const aliases = {
    'Login & Authentication': ['login', 'auth', 'password', 'sign in', 'reset token'],
    'Registration & Profile': ['regist', 'profile', 'sign up', 'account creat'],
    'Trips & Fares': ['trip', 'fare', 'distance', 'book', 'cancel', 'route'],
    'Promo Codes': ['promo', 'coupon', 'discount', 'code'],
    'Wallet & Payments': ['wallet', 'top-up', 'topup', 'top up', 'payment', 'pay'],
    'Driver & Earnings': ['driver', 'earning', 'payout'],
    'Ratings': ['rating', 'rate', 'review', 'star'],
    'Admin & Platform': ['admin', 'debug', 'platform', 'panel'],
  };
  for (const f of FEATURES) if (m.includes(f.toLowerCase())) return f;
  for (const f of FEATURES) for (const a of aliases[f] || []) if (m.includes(a)) return f;
  for (const t of TESTS) if (m.includes(t.name.toLowerCase())) return t.feature;
  return null;
}
function chatReply(rawMsg) {
  const msg = String(rawMsg || '');
  const m = msg.toLowerCase();
  if (/(who built|who made|who created|founder|who is behind|built this|made this)/.test(m)) return ATTRIBUTION;
  if (/(completion key|the key|next lab|unlock key|give me the key|lab key)/.test(m)) {
    if (progress.keyRevealed && doneCount() >= TESTS.length) {
      return 'You completed LAB ' + LAB_NUMBER + ' at 100% — well earned. The completion key is: ' + (completionKey() || '') + ' — paste it into the next lab to unlock it.';
    }
    return 'I do not have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at ' + pct() + '% (' + doneCount() + '/' + TESTS.length + ' tests). Finish every test on the Mission Board (/tests) and the key is yours.';
  }
  const f = matchFeature(msg);
  if (/(how many|how much|count|list|which|what tests|vulnerabilit|features)/.test(m) && !/(how do i|how to|solve|exploit|bypass|guide|step)/.test(m)) {
    if (f) {
      const list = TESTS.filter(t => t.feature === f);
      return 'The ' + f + ' feature has ' + list.length + ' tests: ' + list.map(t => t.name).join('; ') + '. Attempts so far on this feature: ' + (progress.attempts[f] || 0) + '.';
    }
    return 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + FEATURES.length + ' features and ' + TESTS.length + ' tests: ' + FEATURES.map(x => x + ' (' + TESTS.filter(t => t.feature === x).length + ')').join(', ') + '. Your progress: ' + doneCount() + '/' + TESTS.length + ' (' + pct() + '%).';
  }
  if (/(progress|how am i|status|next|what should)/.test(m)) {
    const next = TESTS.find(t => !progress.tests[t.id]);
    return 'Your progress: ' + doneCount() + '/' + TESTS.length + ' tests (' + pct() + '%).' + (next ? ' Next open test: "' + next.name + '" in ' + next.feature + ' — see /tests for hints, and remember: my step-by-step help for a feature unlocks after 3 genuine attempts on it.' : ' Everything is complete — open /complete for your key and certificate.');
  }
  if (/(how do i|how to|solve|exploit|bypass|guide|step|help me|attack|hack)/.test(m) || f) {
    const feat = f || (TESTS.find(t => !progress.tests[t.id]) || {}).feature;
    if (!feat) return 'Everything is already complete — see /complete for the summary, key and certificate.';
    const tries = progress.attempts[feat] || 0;
    const open = TESTS.filter(t => t.feature === feat && !progress.tests[t.id]);
    if (tries >= 3 || open.length === 0) {
      if (!open.length) return 'All tests in ' + feat + ' are already complete. ' + ATTRIBUTION;
      return 'Step by step for ' + feat + ':\n' + open.map(t => '• ' + t.name + ' — ' + t.hints[2]).join('\n');
    }
    return 'That feature is locked for help. First try the ' + feat + ' tests yourself at least 3 times — I can see you\'ve tried ' + tries + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  if (/(hi|hello|hey|salam)/.test(m)) return 'Hello! I am the Lab Coach for LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '. You have ' + doneCount() + '/' + TESTS.length + ' tests done (' + pct() + '%). Ask me how many tests a feature has, what to do next, or — after 3 genuine attempts on a feature — how to solve its tests.';
  return 'I can help with LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ': ask me about the features and test counts (the map is public), your progress, what to try next, or step-by-step guidance for a feature after you\'ve genuinely tried it at least 3 times. The full mission board is at /tests.';
}

/* ============================ http plumbing =========================== */
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(''));
  });
}
function parseForm(data) {
  const out = {};
  for (const pair of String(data || '').split('&')) {
    if (!pair) continue;
    const i = pair.indexOf('=');
    const k = i < 0 ? pair : pair.slice(0, i);
    const v = i < 0 ? '' : pair.slice(i + 1);
    try { out[decodeURIComponent(k.replace(/\+/g, ' '))] = decodeURIComponent(v.replace(/\+/g, ' ')); } catch (e) { out[k] = v; }
  }
  return out;
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://127.0.0.1');
    const pathname = u.pathname;
    const cookies = parseCookies(req);
    const user = sessionUser(req);
    const raw = await readBody(req);
    let form = {};
    if ((req.headers['content-type'] || '').includes('application/x-www-form-urlencoded')) form = parseForm(raw);

    if (pathname === '/logo.png') {
      try { const img = fs.readFileSync(path.join(ROOT, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(img); }
      catch (e) { send(res, 404, 'not found'); }
      return;
    }

    /* unlock gate */
    if (pathname === '/unlock' && req.method === 'POST') {
      const given = String(form.key || '');

      if (entryKeyMatches(given)) { progress.unlocked = true; saveProgress(); redirect(res, '/login'); }
      else send(res, 403, gatePage('Wrong key — check the completion key from the previous lab.'));
      return;
    }
    if (pathname === '/api/chat' && req.method === 'POST') {
      let msg = '';
      try { msg = JSON.parse(raw || '{}').message || ''; } catch (e) { msg = ''; }
      send(res, 200, JSON.stringify({ reply: chatReply(msg) }), 'application/json');
      return;
    }
    if (pathname === '/api/progress') {
      const feats = {};
      for (const f of FEATURES) feats[f] = featureStats(f);
      send(res, 200, JSON.stringify({ lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done: doneCount(), pct: pct(), features: feats, complete: doneCount() >= TESTS.length }), 'application/json');
      return;
    }
    if (!progress.unlocked) { send(res, 200, gatePage()); return; }

    /* ------------------------------- auth ------------------------------ */
    if (pathname === '/login' && req.method === 'GET') { send(res, 200, layout(req, 'Log in', loginPage(), user)); return; }
    if (pathname === '/login' && req.method === 'POST') {
      attempt('Login & Authentication');
      const email = String(form.email || ''), pw = String(form.password || '');
      const found = sqlLogin(email, pw);
      if (found) {
        if (SQLI_PAT.test(email) || SQLI_PAT.test(pw)) pass('auth-sqli');
        if (found.email === 'admin@hexaride.local' && pw === 'admin123' && !SQLI_PAT.test(email) && !SQLI_PAT.test(pw)) pass('auth-default');
        startSession(res, found);
        redirect(res, '/');
      } else {
        const acct = userByEmail(email);
        if (acct) {
          loginFailures[acct.email] = (loginFailures[acct.email] || 0) + 1;
          if (loginFailures[acct.email] >= 10) pass('auth-brute');
        }
        const msgTxt = acct ? 'Wrong password for that account.' : 'No account with that email.';
        send(res, 200, layout(req, 'Log in', loginPage(msgTxt), user));
      }
      return;
    }
    if (pathname === '/logout') {
      if (cookies.hx_session) sessions.delete(cookies.hx_session);
      res.setHeader('Set-Cookie', 'hx_session=; Path=/; Max-Age=0');
      redirect(res, '/login');
      return;
    }
    if (pathname === '/register' && req.method === 'GET') { send(res, 200, layout(req, 'Register', registerPage(), user)); return; }
    if (pathname === '/register' && req.method === 'POST') {
      attempt('Registration & Profile');
      const name = String(form.name || 'New Rider'), email = String(form.email || '').toLowerCase(), pw = String(form.password || '');
      if (!email || !pw) { send(res, 200, layout(req, 'Register', registerPage('Email and password are required.'), user)); return; }
      if (userByEmail(email)) { send(res, 200, layout(req, 'Register', registerPage('That email is already registered.'), user)); return; }
      const nu = { id: nextUserId++, name, email, password: pw, role: 'rider', wallet: 0, earnings: 0 };
      // VULNERABLE BY DESIGN: the whole form is bound onto the new account (mass assignment).
      for (const k of ['role', 'wallet', 'earnings']) if (form[k] !== undefined && form[k] !== '') nu[k] = k === 'role' ? String(form[k]) : Number(form[k]);
      users.push(nu);
      if (pw.length < 6) pass('reg-weak');
      if (nu.role !== 'rider' || Number(nu.wallet) > 0 || Number(nu.earnings) > 0) pass('reg-mass');
      if (XSS_PAT.test(name)) pass('reg-xss');
      startSession(res, nu);
      redirect(res, '/');
      return;
    }
    if (pathname === '/forgot' && req.method === 'GET') { send(res, 200, layout(req, 'Forgot password', forgotPage(), user)); return; }
    if (pathname === '/forgot' && req.method === 'POST') {
      attempt('Login & Authentication');
      const email = String(form.email || '').toLowerCase();
      const ip = req.socket.remoteAddress || 'local';
      if (!forgotProbes[ip]) forgotProbes[ip] = new Set();
      forgotProbes[ip].add(email);
      if (forgotProbes[ip].size >= 5) pass('auth-enum');
      const acct = userByEmail(email);
      if (acct) {
        const tok = resetTokenFor(acct);
        issuedResetTokens.add(tok);
        send(res, 200, layout(req, 'Forgot password', forgotPage('Reset link sent. (Training build — your reset link is: /reset?token=' + tok + ')'), user));
      } else {
        send(res, 200, layout(req, 'Forgot password', forgotPage('No account with that email.'), user));
      }
      return;
    }
    if (pathname === '/reset' && req.method === 'GET') {
      const tok = u.searchParams.get('token') || '';
      send(res, 200, layout(req, 'Reset password', '<h2>Reset password</h2><form method="POST" action="/reset" style="background:#1d1d29;padding:16px;border-radius:10px;max-width:420px"><input type="hidden" name="token" value="' + esc(tok) + '">New password<br><input name="newPassword" type="password" style="width:95%;padding:8px"><br><br><button style="padding:10px 20px">Set new password</button></form>', user));
      return;
    }
    if (pathname === '/reset' && req.method === 'POST') {
      attempt('Login & Authentication');
      const tok = String(form.token || '');
      const target = users.find(x => resetTokenFor(x) === tok); // VULNERABLE: the formula is accepted whether or not a reset was ever requested
      if (target && form.newPassword) {
        target.password = String(form.newPassword);
        if (!issuedResetTokens.has(tok)) pass('auth-reset');
        send(res, 200, layout(req, 'Reset password', '<p>Password changed. <a href="/login">Log in</a></p>', user));
      } else {
        send(res, 200, layout(req, 'Reset password', '<p style="color:#ff8080">Invalid reset token.</p>', user));
      }
      return;
    }
    if (pathname === '/profile' && req.method === 'GET') {
      if (!user) { redirect(res, '/login'); return; }
      send(res, 200, layout(req, 'Profile', '<h2>Your profile</h2><form method="POST" action="/profile" style="background:#1d1d29;padding:16px;border-radius:10px;max-width:420px"><input type="hidden" name="hx_origin" value="1">Display name<br><input name="name" value="' + esc(user.name) + '" style="width:95%;padding:8px"><br><br>Email<br><input name="email" value="' + esc(user.email) + '" style="width:95%;padding:8px"><br><br><button style="padding:10px 20px">Save profile</button></form>', user));
      return;
    }
    if (pathname === '/profile' && req.method === 'POST') {
      if (!user) { redirect(res, '/login'); return; }
      attempt('Registration & Profile');
      const before = user.name + '|' + user.email;
      if (form.name) user.name = String(form.name);
      if (form.email) user.email = String(form.email).toLowerCase();
      // VULNERABLE: the hx_origin marker the form carries is never verified.
      if ((user.name + '|' + user.email) !== before && form.hx_origin !== '1') pass('reg-csrf');
      redirect(res, '/');
      return;
    }

    /* ------------------------------ app pages ------------------------------ */
    if (pathname === '/' && req.method === 'GET') {
      if (!user) { redirect(res, '/login'); return; }
      send(res, 200, layout(req, 'Book a ride', homePage(user, u.searchParams.get('msg') || ''), user));
      return;
    }
    if (pathname === '/trips' && req.method === 'GET') {
      if (!user) { redirect(res, '/login'); return; }
      send(res, 200, layout(req, 'My trips', tripsPage(user), user));
      return;
    }
    if (pathname === '/trips' && req.method === 'POST') {
      if (!user) { redirect(res, '/login'); return; }
      attempt('Trips & Fares');
      const pu = placeById(form.pickupId), dr = placeById(form.dropoffId);
      if (!pu || !dr || pu.id === dr.id) { redirect(res, '/?msg=' + encodeURIComponent('Choose two different places.')); return; }
      const realKm = trueDistanceKm(pu, dr);
      const base = trueFare(realKm);
      const t = { id: nextTripId++, riderId: user.id, driverId: 4, pickupId: pu.id, dropoffId: dr.id, distanceKm: realKm, baseFare: base, fare: base, status: 'requested', paid: false, promos: [] };
      // VULNERABLE BY DESIGN: client-supplied distance / fare are trusted when present.
      if (form.distanceKm !== undefined && form.distanceKm !== '' && !isNaN(Number(form.distanceKm))) {
        t.distanceKm = Number(form.distanceKm);
        t.fare = trueFare(t.distanceKm);
        if (t.distanceKm !== realKm) pass('fare-distance');
      }
      if (form.fare !== undefined && form.fare !== '' && !isNaN(Number(form.fare))) {
        t.fare = Number(form.fare);
        if (t.fare !== t.baseFare) pass('fare-tamper');
      }
      trips.push(t);
      redirect(res, '/trips/' + t.id);
      return;
    }
    const tripMatch = pathname.match(/^\/trips\/(\d+)$/);
    if (tripMatch && req.method === 'GET') {
      if (!user) { redirect(res, '/login'); return; }
      attempt('Trips & Fares');
      const t = trips.find(x => x.id === Number(tripMatch[1]));
      if (!t) { send(res, 404, layout(req, 'Not found', '<h2>Trip not found</h2>', user)); return; }
      // VULNERABLE BY DESIGN: no ownership check on trip details (IDOR).
      if (t.riderId !== user.id && t.driverId !== user.id && user.role !== 'admin') pass('trip-idor');
      send(res, 200, layout(req, 'Trip #' + t.id, tripDetailPage(t, user, u.searchParams.get('msg') || ''), user));
      return;
    }
    const cancelMatch = pathname.match(/^\/trips\/(\d+)\/cancel$/);
    if (cancelMatch && req.method === 'POST') {
      if (!user) { redirect(res, '/login'); return; }
      attempt('Trips & Fares');
      const t = trips.find(x => x.id === Number(cancelMatch[1]));
      if (!t) { send(res, 404, 'not found'); return; }
      // VULNERABLE BY DESIGN: anyone can cancel anyone's trip.
      if (t.riderId !== user.id && user.role !== 'admin') pass('trip-cancel-idor');
      t.status = 'cancelled';
      redirect(res, '/trips/' + t.id + '?msg=' + encodeURIComponent('Trip cancelled.'));
      return;
    }
    const promoMatch = pathname.match(/^\/trips\/(\d+)\/promo$/);
    if (promoMatch && req.method === 'POST') {
      if (!user) { redirect(res, '/login'); return; }
      attempt('Promo Codes');
      const t = trips.find(x => x.id === Number(promoMatch[1]));
      if (!t) { send(res, 404, 'not found'); return; }
      const code = String(form.code || '').toUpperCase().trim();
      const p = promos.find(x => x.code === code);
      if (!p) { redirect(res, '/trips/' + t.id + '?msg=' + encodeURIComponent('Unknown promo code.')); return; }
      // VULNERABLE BY DESIGN: no single-promo rule, no single-use enforcement, no state check.
      t.promos.push(p.code);
      const discount = Math.round(t.fare * p.pct) / 100;
      promoUse[user.id + ':' + p.code] = (promoUse[user.id + ':' + p.code] || 0) + 1;
      if (t.promos.length >= 2) pass('promo-stack');
      if (p.singleUse && promoUse[user.id + ':' + p.code] >= 2) pass('promo-reuse');
      if (t.status === 'completed' && t.paid) {
        user.wallet = Math.round((Number(user.wallet) + discount) * 100) / 100; // retroactive "refund" of the discount
        pass('promo-retro');
      } else {
        t.fare = Math.round((t.fare - discount) * 100) / 100;
      }
      redirect(res, '/trips/' + t.id + '?msg=' + encodeURIComponent('Promo applied: ' + p.code));
      return;
    }
    const payMatch = pathname.match(/^\/trips\/(\d+)\/pay$/);
    if (payMatch && req.method === 'POST') {
      if (!user) { redirect(res, '/login'); return; }
      attempt('Trips & Fares');
      const t = trips.find(x => x.id === Number(payMatch[1]));
      if (!t) { send(res, 404, 'not found'); return; }
      const amount = Number(form.amount);
      if (!isNaN(amount) && amount !== 0) {
        // VULNERABLE BY DESIGN: the amount is trusted — a negative "payment" credits the wallet.
        user.wallet = Math.round((Number(user.wallet) - amount) * 100) / 100;
        if (amount < 0) pass('wallet-negpay');
        t.paid = true;
        if (t.driverId && amount > 0) { const d = userById(t.driverId); if (d) d.earnings = Math.round((Number(d.earnings) + amount) * 100) / 100; }
      }
      redirect(res, '/trips/' + t.id + '?msg=' + encodeURIComponent('Payment recorded.'));
      return;
    }
    const rateMatch = pathname.match(/^\/trips\/(\d+)\/rate$/);
    if (rateMatch && req.method === 'POST') {
      if (!user) { redirect(res, '/login'); return; }
      attempt('Ratings');
      const t = trips.find(x => x.id === Number(rateMatch[1]));
      if (!t) { send(res, 404, 'not found'); return; }
      const stars = Number(form.stars);
      // VULNERABLE BY DESIGN: no range check, no check that the rater took this trip.
      ratings.push({ tripId: t.id, byUserId: user.id, stars, comment: String(form.comment || '') });
      if (!isNaN(stars) && (stars > 5 || stars < 1)) pass('rating-value');
      if (t.riderId !== user.id) pass('rating-foreign');
      redirect(res, '/trips/' + t.id + '?msg=' + encodeURIComponent('Thanks for rating.'));
      return;
    }
    if (pathname === '/wallet' && req.method === 'GET') {
      if (!user) { redirect(res, '/login'); return; }
      send(res, 200, layout(req, 'Wallet', walletPage(user, u.searchParams.get('msg') || ''), user));
      return;
    }
    if (pathname === '/wallet/topup' && req.method === 'POST') {
      if (!user) { redirect(res, '/login'); return; }
      attempt('Wallet & Payments');
      const amount = Number(form.amount);
      const paidAmount = (form.paidAmount === undefined || form.paidAmount === '') ? amount : Number(form.paidAmount);
      if (!isNaN(amount) && amount > 0) {
        // VULNERABLE BY DESIGN: the wallet is credited the client-supplied amount, whatever was "paid".
        user.wallet = Math.round((Number(user.wallet) + amount) * 100) / 100;
        if (paidAmount !== amount) pass('wallet-topup');
      }
      redirect(res, '/wallet?msg=' + encodeURIComponent('Top-up complete.'));
      return;
    }
    if (pathname === '/driver' && req.method === 'GET') {
      if (!user) { redirect(res, '/login'); return; }
      // VULNERABLE BY DESIGN: the driver area trusts the client-controlled hx_role cookie.
      if (user.role === 'driver' || user.role === 'admin' || cookies.hx_role === 'driver') {
        if (user.role !== 'driver' && user.role !== 'admin') pass('auth-cookie');
        send(res, 200, layout(req, 'Driver area', driverPage(user, cookies, u.searchParams.get('msg') || ''), user));
      } else {
        send(res, 403, layout(req, 'Forbidden', '<h2>Driver area</h2><p>Drivers only.</p>', user));
      }
      return;
    }
    if (pathname === '/driver/earnings' && req.method === 'GET') {
      if (!user) { redirect(res, '/login'); return; }
      attempt('Driver & Earnings');
      const target = userById(u.searchParams.get('driverId') || user.id);
      if (!target) { send(res, 404, layout(req, 'Not found', '<h2>Driver not found</h2>', user)); return; }
      // VULNERABLE BY DESIGN: any signed-in user can read any driver's earnings.
      if (target.id !== user.id) pass('driver-earnings-idor');
      send(res, 200, layout(req, 'Earnings', earningsPage(target, user), user));
      return;
    }
    if (pathname === '/driver/payout' && req.method === 'POST') {
      if (!user) { redirect(res, '/login'); return; }
      attempt('Driver & Earnings');
      const amount = Number(form.amount);
      if (!isNaN(amount) && amount > 0) {
        // VULNERABLE BY DESIGN: no check against the driver's actual earnings balance.
        payouts.push({ driverId: user.id, amount });
        if (amount > Number(user.earnings || 0)) pass('driver-payout');
      }
      redirect(res, '/driver?msg=' + encodeURIComponent('Payout requested.'));
      return;
    }
    const drvMatch = pathname.match(/^\/driver\/trips\/(\d+)\/(accept|start|complete)$/);
    if (drvMatch && req.method === 'POST') {
      if (!user) { redirect(res, '/login'); return; }
      attempt('Trips & Fares');
      const t = trips.find(x => x.id === Number(drvMatch[1]));
      if (!t) { send(res, 404, 'not found'); return; }
      const action = drvMatch[2];
      if (action === 'complete') {
        // VULNERABLE BY DESIGN: the completion endpoint forgot to verify the caller is the assigned driver.
        if (user.role !== 'driver') pass('trip-status-forge');
        t.status = 'completed';
      } else {
        if (user.role !== 'driver' && user.role !== 'admin') { send(res, 403, layout(req, 'Forbidden', '<p>Drivers only.</p>', user)); return; }
        t.status = action === 'accept' ? 'accepted' : 'ongoing';
      }
      redirect(res, '/driver?msg=' + encodeURIComponent('Trip ' + t.id + ' → ' + t.status));
      return;
    }
    if (pathname === '/admin' && req.method === 'GET') {
      if (!user && pathname !== '/complete' && pathname !== '/complete/name' && pathname !== '/certificate' && pathname !== '/tester-name' && pathname !== '/set-name' && pathname !== '/tester') { redirect(res, '/login'); return; }
      attempt('Admin & Platform');
      // VULNERABLE BY DESIGN: no role check at all on the admin panel.
      if (user.role !== 'admin') pass('admin-bac');
      send(res, 200, layout(req, 'Admin panel', adminPage(), user));
      return;
    }
    if (pathname === '/api/debug' && req.method === 'GET') {
      attempt('Admin & Platform');
      // VULNERABLE BY DESIGN: leftover debug endpoint dumps everything, no auth.
      pass('platform-debug');
      send(res, 200, JSON.stringify({ users, trips, ratings, payouts }, null, 2), 'application/json');
      return;
    }
    if (pathname === '/tests' && req.method === 'GET') { send(res, 200, layout(req, 'Mission Board', testsPage(user), user)); return; }
    if (pathname === '/complete' && req.method === 'GET') {
      send(res, 200, layout(req, 'Completion summary', completePage(user), user));
      return;
    }
    if (pathname === '/complete/name' && req.method === 'POST') {
      progress.testerName = String(form.name || '').slice(0, 60);
      saveProgress();
      redirect(res, '/complete');
      return;
    }
    if (pathname === '/certificate' && req.method === 'GET') {
      send(res, 200, layout(req, 'Certificate', certificatePage(user), user));
      return;
    }
    if (pathname === '/' ) { redirect(res, '/login'); return; }
    send(res, 404, layout(req, 'Not found', '<h2>404 — page not found</h2>', user));
  } catch (e) {
    try { send(res, 500, 'Internal error'); } catch (e2) { /* socket gone */ }
  }
});

/* ============================ docs generation ========================= */
function genDocs() {
  const byFeature = f => TESTS.filter(t => t.feature === f);
  let vuln = '# HexaRide — Vulnerabilities (full test registry)\n\nLAB 74 — HexaRide (Category 8: Travel, Hospitality & Transport) · ' + TESTS.length + ' scored tests across ' + FEATURES.length + ' features.\nEvery test below is a real, working vulnerability in the app; a test is marked complete only when the exploit actually succeeds (detected server-side).\n';
  for (const f of FEATURES) {
    vuln += '\n## ' + f + '\n';
    for (const t of byFeature(f)) {
      vuln += '\n### ' + t.name + '\n- OWASP: ' + t.owasp + ' · Difficulty: ' + t.difficulty + '\n- Where: the ' + f + ' flow of HexaRide.\n- Exploitation outline: ' + t.hints[2] + '\n- Impact: ' + t.impact + '\n';
    }
  }
  fs.writeFileSync(path.join(ROOT, 'VULNERABILITIES.md'), vuln);

  const order = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  let guide = '# HexaRide — Practice Guide\n\nWork through the challenges feature by feature. Hints are graded: try Hint 1 first. A challenge is complete only when the exploit actually works — the Mission Board (/tests) tracks your real progress.\n';
  for (const f of FEATURES) {
    guide += '\n## ' + f + '\n';
    for (const t of byFeature(f).slice().sort((a, b) => order[a.difficulty] - order[b.difficulty])) {
      guide += '\n### [' + t.difficulty + '] ' + t.name + '\n- Objective: make the "' + t.name + '" test flip to done on the Mission Board by exploiting the real flaw in the ' + f + ' flow (' + t.owasp + ').\n- Hint 1: ' + t.hints[0] + '\n- Hint 2: ' + t.hints[1] + '\n- Hint 3: ' + t.hints[2] + '\n';
    }
  }
  fs.writeFileSync(path.join(ROOT, 'PRACTICE-GUIDE.md'), guide);

  let fix = '# HexaRide — Fix & Retest Guide\n\nFor every test: the secure implementation and the regression check that proves the fix.\n';
  for (const f of FEATURES) {
    fix += '\n## ' + f + '\n';
    for (const t of byFeature(f)) {
      fix += '\n### ' + t.report.title + '\n- Severity: ' + t.report.severity + '\n- Fix: ' + t.report.remediation + '\n- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("' + t.name + '") — it must now FAIL (no test flip, no effect), while the legitimate ' + f + ' flow still works for authorised users.\n';
    }
  }
  fs.writeFileSync(path.join(ROOT, 'FIX-AND-RETEST.md'), fix);
  console.log('Docs generated from registry: ' + TESTS.length + ' tests, ' + FEATURES.length + ' features.');
}

if (process.argv.includes('--gen-docs')) { genDocs(); process.exit(0); }

/* ---- key material, part 4 of 4 (kept far from parts 1–3) ---- */
void _kB; void _kD;

if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => {
    console.log('LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' listening on http://127.0.0.1:' + PORT);
  });
}
module.exports = { server, TESTS, FEATURES };
