'use strict';
/* =====================================================================
   HexaRestaurant — LAB 80 (Category 8: Travel, Hospitality & Transport)
   A deliberately vulnerable restaurant platform for security training.
   LOCAL USE ONLY. Zero-dependency Node.js. All data is fake seed data.
   ===================================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3089;
const LAB_NUMBER = 80;
const LAB_NAME = 'HexaRestaurant';
const PREV_LAB = 79;
const DIR = __dirname;

/* --- key material: stored ONLY as encoded shards, scattered (see §7) --- */

const _cA = ["TC1YSA==", "UC0xOA==", "RkRLWg=="];

/* ------------------------- progress engine ------------------------- */
const PROGRESS_FILE = path.join(DIR, 'progress.json');
let progress = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      progress = Object.assign(progress, raw);
    }
  } catch (e) { /* corrupted state -> start fresh */ }
}
function saveProgress() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2)); } catch (e) {}
}
loadProgress();

/* --------------------------- TESTS registry --------------------------- */
const TESTS = [
  /* ---- Login & Authentication ---- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL injection login bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login form builds its query by gluing your input straight into a string.', "Try a classic tautology in the email field, e.g. something containing ' OR '1'='1.", "Use email: x' OR '1'='1' --  with any password — the query comment swallows the password check."],
    lesson: 'String-built SQL queries let an attacker rewrite the login logic itself and walk in as the first account in the table — usually the admin.',
    impact: 'On a real restaurant platform this means an attacker takes over the manager account in seconds: menus, prices, bookings and customer data are all exposed.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements for all database access and never concatenate user input into SQL.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute force — no rate limit or lockout', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Pick one real account and just keep guessing wrong passwords.', 'There is no lockout, no CAPTCHA and no delay — count how many failures the app happily processes.', 'Fail 10 times in a row for the same account; the 10th failure is still processed like the first.'],
    lesson: 'Without throttling or lockout, an attacker can try unlimited passwords against any account until one works.',
    impact: 'A client’s staff accounts can be cracked overnight with a password list, giving attackers a legitimate-looking way into the system.',
    report: { title: 'Missing Brute-Force Protection on Login', severity: 'High', remediation: 'Add rate limiting, progressive delays and account lockout / MFA for staff accounts.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User enumeration via login & reset responses', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the error message for an email that exists with one that does not.', 'The forgot-password form answers differently too — that difference is an oracle.', 'Probe at least 5 different email addresses across login/forgot and watch the messages diverge.'],
    lesson: 'Different error messages for "no such account" vs "wrong password" let attackers harvest a list of valid accounts to target.',
    impact: 'Attackers can confirm which customer and staff emails exist, then focus phishing and password attacks only on real accounts.',
    report: { title: 'Account Enumeration Through Divergent Authentication Responses', severity: 'Medium', remediation: 'Return one generic message ("invalid credentials" / "if the account exists…") for every authentication failure.' } },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Demo credentials published on the login page', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Read the login page carefully — the site itself hands you an account.', 'Demo accounts shipped to production are real accounts with real access.', 'Sign in with the demo diner account printed under the login form.'],
    lesson: 'Published or default demo credentials are working keys left under the doormat — anyone can sign in with them.',
    impact: 'A demo account on a live client site gives attackers a free foothold and a way to explore authenticated features at zero cost.',
    report: { title: 'Demo Account Credentials Exposed on Login Page', severity: 'High', remediation: 'Remove demo/default accounts from production and never print credentials on public pages.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable password-reset token', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['Reset tokens here are not random — they are computed from something you can see.', 'The token looks like HR<user id>-<a number derived from the id>. User ids are sequential.', 'For user id N the token is HR<N>-<N*137+42>. Compute Bob’s (id 3) and reset his password without ever requesting a reset.'],
    lesson: 'A reset token derived from a public identifier is not a secret — anyone can forge it and reset any account, including staff.',
    impact: 'Full account takeover of any customer or manager, leading to booking fraud, data exposure and reputational damage for the restaurant.',
    report: { title: 'Predictable Password Reset Token Enables Account Takeover', severity: 'Critical', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), store them hashed, expire them quickly and make them single-use.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Role trusted from a client cookie (hx_role)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After login, inspect your cookies — the app mirrors your role into one of them.', 'The server trusts that cookie more than its own session record.', 'Set the hx_role cookie to "manager" in your browser, then visit /manager as a plain diner.'],
    lesson: 'Authorization decisions must come from server-side session data; anything the client sends (cookies, fields) can be edited at will.',
    impact: 'Any diner becomes "manager" by editing a cookie — prices, staff tools and customer records are all within reach.',
    report: { title: 'Privilege Escalation via Client-Controlled Role Cookie', severity: 'Critical', remediation: 'Derive roles exclusively from the server-side session/record; ignore role claims from cookies or request fields.' } },

  /* ---- Registration & Profile ---- */
  { id: 'reg-weakpw', feature: 'Registration & Profile', name: 'Weak password policy (1 character accepted)', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a new account and shrink the password.', 'There is no minimum length or complexity check at all.', 'Create an account with the single-character password "x" — it is accepted.'],
    lesson: 'A registration form that accepts any password invites accounts that fall to the first guess in a brute-force list.',
    impact: 'Customer accounts on the client site are trivially guessable, enabling booking fraud and personal-data exposure.',
    report: { title: 'No Password Strength Policy at Registration', severity: 'Medium', remediation: 'Enforce a minimum length (≥10–12) and screen against common/breached password lists.' } },
  { id: 'reg-massassign', feature: 'Registration & Profile', name: 'Mass assignment — role & loyalty points at signup', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The register endpoint copies more of your POST body than the form shows.', 'Add fields the form never offered and see which ones stick.', 'POST /register with extra fields role=manager and loyaltyPoints=9999, then check the new account.'],
    lesson: 'Binding a whole request body to a user record lets attackers set privileged fields (role, balances) that the UI never exposed.',
    impact: 'Attackers mint themselves manager accounts and unlimited loyalty points — full control plus free food at the client’s expense.',
    report: { title: 'Mass Assignment in Registration Allows Role and Balance Forgery', severity: 'High', remediation: 'Whitelist the exact fields a request may set; assign role/balance fields only on the server.' } },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in display name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is shown to staff in the manager user list — exactly as you typed it.', 'HTML is not escaped on the way out.', 'Register with a name like <script>alert(1)</script> and let the manager open the user list.'],
    lesson: 'User-controlled text rendered without escaping executes in other users’ browsers — here, in the manager’s own panel.',
    impact: 'A stored payload in a name can hijack staff sessions and take over the restaurant’s admin side from a single signup.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-encode all user output and apply a strict CSP; sanitise stored rich text.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on profile update (marker never checked)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The real profile form carries a hidden hx_marker tied to your session.', 'The server never actually verifies that marker on the way in.', 'POST /profile with a new name and NO hx_marker at all — the change still goes through.'],
    lesson: 'A state-changing form without a verified anti-CSRF token can be submitted by any website the victim visits while logged in.',
    impact: 'An attacker’s page can silently rewrite a customer’s profile (name, contact data) the moment they browse it while logged in.',
    report: { title: 'Missing CSRF Validation on Profile Update', severity: 'Medium', remediation: 'Issue per-session CSRF tokens, verify them on every state-changing request, and use SameSite cookies.' } },

  /* ---- Menu & Search ---- */
  { id: 'search-sqli', feature: 'Menu & Search', name: 'SQL injection in menu search leaks hidden items', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The search box feeds the same string-built query style as login.', 'A tautology makes the WHERE clause true for every row — including rows meant to be invisible.', "Search for ' OR '1'='1 and look for the dish that never appears on the normal menu."],
    lesson: 'Injection in search turns a filter into a full table dump — hidden, internal or unreleased records included.',
    impact: 'Unreleased menus, staff-only items and pricing experiments leak to competitors and customers before launch.',
    report: { title: 'SQL Injection in Menu Search Exposes Hidden Records', severity: 'High', remediation: 'Parameterise the search query and enforce visibility filters server-side.' } },
  { id: 'search-xss', feature: 'Menu & Search', name: 'Reflected XSS in menu search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your search term is echoed back in the results heading — unescaped.', 'Put markup in the query and view the page source.', 'Search for <script>alert(1)</script> and watch it land raw in the page.'],
    lesson: 'Reflecting input without encoding turns a harmless search link into a script-delivery vehicle against anyone who clicks it.',
    impact: 'Attackers can send customers a "menu search" link that runs script in the restaurant’s own site — stealing sessions and trust.',
    report: { title: 'Reflected Cross-Site Scripting in Search Results', severity: 'Medium', remediation: 'HTML-encode all reflected input and deploy a Content-Security-Policy.' } },

  /* ---- Table Bookings ---- */
  { id: 'book-capacity', feature: 'Table Bookings', name: 'Booking a party larger than the table’s seats', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['Table T1 seats 2. The booking form asks for party size…', '…but nothing compares the party size with the table’s capacity.', 'Book table 1 for a party of 8 — it is accepted.'],
    lesson: 'Business rules (capacity) must be enforced on the server; the form’s dropdown limits mean nothing to a direct request.',
    impact: 'Impossible bookings reach the floor team: overbooked tables, turned-away guests and comped meals on a busy Friday night.',
    report: { title: 'Server Fails to Enforce Table Capacity on Booking', severity: 'Medium', remediation: 'Validate party size against the table’s seat count server-side before confirming a booking.' } },
  { id: 'book-slot', feature: 'Table Bookings', name: 'Double-booking the same table and time slot', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['Bob already holds table T2 at 19:00 on 2026-10-24.', 'The booking flow never checks whether the slot is taken.', 'Book table 2, 2026-10-24, 19:00 yourself — the second booking is accepted too.'],
    lesson: 'Uniqueness invariants (one booking per table per slot) must be checked at write time, or concurrent/hidden requests break them.',
    impact: 'Two parties arrive for the same table; the restaurant eats the apology, the free desserts and the one-star reviews.',
    report: { title: 'Missing Slot-Availability Check Allows Double Booking', severity: 'Medium', remediation: 'Check slot availability in the same transaction that creates the booking; add a unique constraint.' } },
  { id: 'book-view-idor', feature: 'Table Bookings', name: 'IDOR — view another diner’s booking', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Booking ids are small sequential numbers.', 'The booking page checks that you are logged in — not that the booking is yours.', 'Open /booking/1 while signed in as Alice; booking 1 belongs to Bob.'],
    lesson: 'Every object fetch must verify ownership; sequential ids plus a missing check equal a full data leak.',
    impact: 'Strangers can read who is dining where and when — a privacy breach and a safety risk for the restaurant’s guests.',
    report: { title: 'Insecure Direct Object Reference on Booking Details', severity: 'High', remediation: 'Authorise every object access against the session user’s ownership or role.' } },
  { id: 'book-cancel-idor', feature: 'Table Bookings', name: 'IDOR — cancel another diner’s booking', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Cancellation trusts the booking id in the URL the same way viewing does.', 'You do not need to own a booking to destroy it.', 'POST /booking/1/cancel as Alice — Bob’s reservation disappears.'],
    lesson: 'Destructive actions need the same ownership checks as reads — a missing check turns viewing rights into sabotage.',
    impact: 'Anyone can wipe out a rival’s — or every — reservation for the evening, emptying the restaurant on demand.',
    report: { title: 'Missing Authorisation on Booking Cancellation', severity: 'High', remediation: 'Verify booking ownership (or staff role) before applying cancellations.' } },

  /* ---- Orders & Payments ---- */
  { id: 'order-price', feature: 'Orders & Payments', name: 'Menu price tampering at checkout', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['The order form posts the item price along with the item id.', 'The server trusts the posted price instead of looking it up.', 'Order the Truffle Pasta (real price $18) with price=1 and check the order total.'],
    lesson: 'Prices are server-side truth; any price arriving from the client is a suggestion the attacker controls.',
    impact: 'Customers eat $18 dishes for $1 all night — direct revenue loss that scales with every order placed.',
    report: { title: 'Client-Supplied Price Trusted at Checkout', severity: 'High', remediation: 'Compute all prices and totals server-side from the catalogue; ignore client-posted amounts.' } },
  { id: 'order-negative', feature: 'Orders & Payments', name: 'Negative quantity creates a negative-total order', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['Quantities are multiplied straight into the total with no sanity check.', 'What happens when qty is below zero?', 'Order any dish with qty=-3 — the platform stores an order with a negative total.'],
    lesson: 'Numeric inputs need range validation; a negative quantity turns a purchase into a credit against the business.',
    impact: 'Negative orders can offset real charges or corrupt the day’s takings and stock counts for the client.',
    report: { title: 'Missing Quantity Validation Allows Negative Orders', severity: 'Medium', remediation: 'Validate quantity as a positive integer within sane bounds server-side.' } },
  { id: 'order-idor', feature: 'Orders & Payments', name: 'IDOR — view another diner’s order', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Order ids are sequential, starting at 1 (that one is Bob’s).', 'The order page repeats the booking mistake: login is checked, ownership is not.', 'Open /order/1 while signed in as Alice.'],
    lesson: 'Read endpoints for private objects must check ownership every time — ids are not secrets.',
    impact: 'Customers’ orders, addresses and habits leak to anyone with an account — a privacy and GDPR problem for the restaurant.',
    report: { title: 'Insecure Direct Object Reference on Order Details', severity: 'High', remediation: 'Scope every order query to the session user (or staff role) server-side.' } },
  { id: 'order-status', feature: 'Orders & Payments', name: 'Diner marks own order paid/served (staff action)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['There is a status endpoint the kitchen uses: /order/<id>/status.', 'It never asks WHO is calling — a diner’s session works fine.', 'As a diner, POST status=paid to your own order and watch it settle itself.'],
    lesson: 'Function-level authorization matters as much as data access: a user may own an object yet must not perform staff-only transitions on it.',
    impact: 'Diners mark bills "paid" without paying and orders "served" that never left the kitchen — chaos and direct loss.',
    report: { title: 'Missing Function-Level Authorisation on Order Status Changes', severity: 'High', remediation: 'Restrict status transitions to staff roles and to the transitions each role may perform.' } },

  /* ---- Reviews & Loyalty ---- */
  { id: 'loyalty-forge', feature: 'Reviews & Loyalty', name: 'Loyalty points forged — redeem more than the balance', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['Checkout accepts a "redeem" field: points become discount at 10 points = $1… roughly.', 'Your balance is never checked before the discount is applied.', 'Alice has 120 points. Order with redeem=10000 and watch the discount land anyway (and the balance go negative).'],
    lesson: 'Balances must be verified and debited atomically on the server; a redemption field without a balance check is free money.',
    impact: 'Unlimited discounts drain margin on every order and poison the loyalty programme’s accounting.',
    report: { title: 'Loyalty Redemption Without Balance Verification', severity: 'High', remediation: 'Check and debit the loyalty balance server-side in the same transaction as the order.' } },
  { id: 'review-noorder', feature: 'Reviews & Loyalty', name: 'Review posted without any completed order', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The review form asks for a dish and a rating — nothing about whether you ate it.', 'Verified-purchase checks were never implemented.', 'Create a fresh account with zero orders and post a review for any dish.'],
    lesson: 'Eligibility rules (only buyers may review) are business logic that must be enforced server-side, not assumed.',
    impact: 'Fake reviews — glowing or vicious — can be manufactured at scale, distorting the restaurant’s reputation and ratings.',
    report: { title: 'Reviews Accepted Without a Verified Completed Order', severity: 'Medium', remediation: 'Require a completed order containing the item before accepting a review.' } },
  { id: 'review-xss', feature: 'Reviews & Loyalty', name: 'Stored XSS in review text', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Reviews are printed on the menu page word-for-word.', 'The browser cannot tell your review text from the page’s own markup.', 'Post a review containing <img src=x onerror=alert(1)> and open the menu page.'],
    lesson: 'Stored user content must be encoded on output everywhere it appears — one raw render poisons every visitor.',
    impact: 'Every customer browsing the menu runs attacker script in the restaurant’s domain — session theft and defacement follow.',
    report: { title: 'Stored Cross-Site Scripting in Customer Reviews', severity: 'High', remediation: 'HTML-encode review text on render and add a restrictive Content-Security-Policy.' } },

  /* ---- Staff & Manager ---- */
  { id: 'staff-queue', feature: 'Staff & Manager', name: 'Kitchen queue readable by any diner', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The kitchen screen lives at /kitchen and shows every live order.', 'It checks that you are signed in. It forgets to check that you are staff.', 'Sign in as a diner and open /kitchen.'],
    lesson: 'Internal operational screens are part of the attack surface; "staff will only use the link" is not access control.',
    impact: 'Diners see every table’s orders in real time — privacy exposure and a window into the business’s busiest data.',
    report: { title: 'Broken Access Control on Kitchen Queue', severity: 'Medium', remediation: 'Gate staff screens by server-side role checks on every request.' } },
  { id: 'admin-csrf', feature: 'Staff & Manager', name: 'CSRF on manager price change', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Managers can reprice dishes at /manager — the form carries the same hx_marker as the profile form.', 'And just like the profile form, the server never verifies it.', 'As the manager, POST /manager/price with a new price and no hx_marker — the menu changes.'],
    lesson: 'Privileged actions are the highest-value CSRF targets; a token that is issued but never verified protects nothing.',
    impact: 'A malicious page a manager browses can reprice the whole menu — $1 mains or $999 salads — without a single click on the real site.',
    report: { title: 'Missing CSRF Validation on Manager Price Change', severity: 'High', remediation: 'Verify per-session CSRF tokens on all state-changing manager actions.' } },

  /* ---- Platform & API ---- */
  { id: 'api-token', feature: 'Platform & API', name: 'API token is just base64(email)', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['The JSON API authenticates with a Bearer token.', 'The token is derived from something public — decode what a token looks like.', 'Send Authorization: Bearer <base64 of bob@diner.local> to /api/orders with NO session cookie and read his orders.'],
    lesson: 'An API token must be an unguessable secret; encoding a public identifier is not authentication.',
    impact: 'Anyone who knows a customer’s email — it is on every receipt — can pull their full order history from the API.',
    report: { title: 'Predictable API Token (Base64 of Email) Allows Impersonation', severity: 'High', remediation: 'Issue random, revocable API tokens per user and store them hashed server-side.' } }
];

const FEATURES = [];
for (const t of TESTS) if (!FEATURES.includes(t.feature)) FEATURES.push(t.feature);
const TOTAL = TESTS.length;

function pass(id) {
  if (!progress.tests[id]) { progress.tests[id] = true; }
  if (TOTAL > 0 && Object.keys(progress.tests).length >= TOTAL && !progress.completedAt) {
    progress.completedAt = new Date().toISOString();
    progress.keyRevealed = true;
  }
  saveProgress();
}
function attempt(feature) {
  progress.attempts[feature] = (progress.attempts[feature] || 0) + 1;
  saveProgress();
}
function doneCount() { return TESTS.filter(t => progress.tests[t.id]).length; }
function isComplete() { return doneCount() >= TOTAL; }

/* --- more key shards, kept far from the first set (see §7) --- */

function _asm(parts) {
  return parts.map(s => [...Buffer.from(s, 'base64').toString('utf8')].reverse().join('')).join('');
}
const ENTRY_KEY_SHA256 = 'ec8b9ed7f3ca93edee89a67c634612a7edf0e4bdf425ec4a825daa5aefa7b308';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */

/* ------------------------------ seed data ------------------------------ */
const users = [
  { id: 1, name: 'Rosa Manager', email: 'manager@hexarestaurant.local', password: 'manager123', role: 'manager', loyaltyPoints: 0 },
  { id: 2, name: 'Alice Diner', email: 'alice@diner.local', password: 'alice123', role: 'diner', loyaltyPoints: 120 },
  { id: 3, name: 'Bob Diner', email: 'bob@diner.local', password: 'bob123', role: 'diner', loyaltyPoints: 40 },
  { id: 4, name: 'Sam Staff', email: 'staff@hexarestaurant.local', password: 'staff123', role: 'staff', loyaltyPoints: 0 },
  { id: 5, name: 'Demo Diner', email: 'demo@diner.local', password: 'demo123', role: 'diner', loyaltyPoints: 10 }
];
let nextUserId = 6;
const items = [
  { id: 1, name: 'Margherita Pizza', price: 12, visible: 1 },
  { id: 2, name: 'Truffle Pasta', price: 18, visible: 1 },
  { id: 3, name: 'Grilled Salmon', price: 24, visible: 1 },
  { id: 4, name: 'Caesar Salad', price: 9, visible: 1 },
  { id: 5, name: 'Chocolate Lava Cake', price: 8, visible: 1 },
  { id: 6, name: "Chef's Secret Test Dish", price: 99, visible: 0 }
];
const tables = [
  { id: 1, label: 'T1', seats: 2 },
  { id: 2, label: 'T2', seats: 4 },
  { id: 3, label: 'T3', seats: 6 }
];
let bookings = [
  { id: 1, userId: 3, tableId: 2, date: '2026-10-24', slot: '19:00', partySize: 3, status: 'active' }
];
let nextBookingId = 2;
let orders = [
  { id: 1, userId: 3, itemId: 2, qty: 1, unitPrice: 18, total: 18, status: 'preparing', redeem: 0 }
];
let nextOrderId = 2;
let reviews = [
  { id: 1, userId: 3, itemId: 1, rating: 5, text: 'Great pizza, will come back!' }
];
let nextReviewId = 2;

/* ------------------------------ sessions ------------------------------ */
const sessions = new Map(); // sid -> { userId, marker }
let sidCounter = 0;
function newSession(userId) {
  const sid = 's' + (++sidCounter) + 'x' + Math.random().toString(36).slice(2, 10);
  sessions.set(sid, { userId, marker: 'MK' + Math.random().toString(36).slice(2, 10) });
  return sid;
}
function getSession(req) {
  const c = parseCookies(req);
  return c.hx_session ? sessions.get(c.hx_session) : null;
}
function currentUser(req) {
  const s = getSession(req);
  if (!s) return null;
  return users.find(u => u.id === s.userId) || null;
}
function effectiveRole(req, user) {
  const c = parseCookies(req);
  if (c.hx_role) return c.hx_role; // FLAW: role trusted from a client cookie
  return user ? user.role : null;
}

/* ------------------------------ auth tracking ------------------------------ */
const failCount = {};        // email -> consecutive failures
const probeSets = {};        // ip -> Set of probed emails
const forgotCalled = new Set(); // emails a reset was requested for
const issuedTokens = {};     // email -> last issued token
function resetTokenFor(user) { return 'HR' + user.id + '-' + (user.id * 137 + 42); }
function probe(ip, email) {
  if (!probeSets[ip]) probeSets[ip] = new Set();
  probeSets[ip].add(String(email || '').toLowerCase());
  if (probeSets[ip].size >= 5) pass('auth-enum');
}

/* ------------------------------ patterns ------------------------------ */
const SQLI_PAT = /(\'\s*(or|and)\s)|(\'\s*\=)|(\'\s*--)|(--\s)|(\bunion\b[\s\S]*\bselect\b)/i;
const XSS_PAT = /(<script|<svg|<img[^>]*onerror|onerror\s*=|onload\s*=|<iframe|<body[^>]*onload)/i;

/* ------------------------------ helpers ------------------------------ */
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
    req.on('data', ch => { data += ch; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) {
        try { resolve(JSON.parse(data || '{}')); return; }
        catch (e) { resolve({ __badjson: true }); return; }
      }
      const obj = {};
      for (const pair of data.split('&')) {
        if (!pair) continue;
        const i = pair.indexOf('=');
        const k = decodeURIComponent(pair.slice(0, i).replace(/\+/g, ' '));
        const v = decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' '));
        obj[k] = v;
      }
      resolve(obj);
    });
    req.on('error', () => resolve({}));
  });
}
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }
function itemById(id) { return items.find(i => i.id === Number(id)); }
function userByEmail(email) { return users.find(u => u.email === String(email || '').toLowerCase()); }

/* ------------------------------ pages ------------------------------ */
function progressBar() {
  const done = doneCount(), pct = TOTAL ? Math.floor(done * 100 / TOTAL) : 0;
  return '<div style="background:#1d1d27;color:#eee;padding:8px 14px;font-family:Arial">' +
    '<img src="/logo.png" style="height:26px;vertical-align:middle"> <b>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</b>' +
    ' &nbsp;·&nbsp; ' + done + '/' + TOTAL + ' tests · ' + pct + '%' +
    '<div style="background:#333;height:8px;border-radius:4px;margin-top:6px"><div style="background:#7c5cff;height:8px;border-radius:4px;width:' + pct + '%"></div></div></div>';
}
function chatWidget() {
  return '<div id="hxchat" style="position:fixed;right:14px;bottom:14px;width:320px;font-family:Arial;background:#fff;border:1px solid #ccd;border-radius:10px;box-shadow:0 4px 18px rgba(0,0,0,.25);z-index:50">' +
    '<div style="background:#1d1d27;color:#fff;padding:8px 12px;border-radius:10px 10px 0 0"><b>Lab Coach</b> — HexaRestaurant</div>' +
    '<div id="hxlog" style="height:170px;overflow:auto;padding:8px 12px;font-size:13px"></div>' +
    '<div style="display:flex;border-top:1px solid #eee"><input id="hxmsg" placeholder="Ask the coach…" style="flex:1;border:0;padding:9px">' +
    '<button onclick="hxSend()" style="background:#7c5cff;color:#fff;border:0;padding:9px 14px">Send</button></div></div>' +
    '<script>function hxAdd(who,txt){var l=document.getElementById("hxlog");var d=document.createElement("div");d.innerHTML="<b>"+who+":</b> ";d.appendChild(document.createTextNode(txt));l.appendChild(d);l.scrollTop=l.scrollHeight;}' +
    'function hxSend(){var m=document.getElementById("hxmsg");var v=m.value;m.value="";if(!v)return;hxAdd("You",v);fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:v})}).then(function(r){return r.json()}).then(function(j){hxAdd("Coach",j.reply)}).catch(function(){hxAdd("Coach","(connection hiccup — try again)")});}' +
    'document.getElementById("hxmsg").addEventListener("keydown",function(e){if(e.key==="Enter")hxSend()});</script>';
}
function layout(title, user, inner) {
  const nav = user
    ? '<a href="/menu">Menu</a> · <a href="/book">Book a table</a> · <a href="/my">My bookings & orders</a> · <a href="/kitchen">Kitchen</a> · <a href="/manager">Manager</a> · <a href="/tests">Mission Board</a> · <span>Signed in as ' + esc(user.name) + ' (' + esc(user.role) + ') · ' + user.loyaltyPoints + ' pts</span> · <a href="/logout">Logout</a>'
    : '<a href="/login">Login</a> · <a href="/register">Register</a> · <a href="/tests">Mission Board</a>';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + ' · LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</title></head>' +
    '<body style="margin:0;font-family:Arial;background:#f6f6f9">' + progressBar() +
    '<div style="background:#fff;border-bottom:1px solid #e2e2ea;padding:9px 14px">' + nav + '</div>' +
    '<div style="max-width:860px;margin:22px auto;background:#fff;border:1px solid #e2e2ea;border-radius:10px;padding:22px">' + inner + '</div>' +
    chatWidget() + '</body></html>';
}
function gatePage() {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' · Locked</title></head>' +
    '<body style="margin:0;background:#14141d;font-family:Arial,sans-serif"><div style="max-width:520px;margin:60px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:28px;text-align:center">' +
    '<img src="/logo.png" style="height:56px"><h2>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h2>' +
    '<p>This lab is locked. Paste the completion key from Lab ' + PREV_LAB + ' to start.</p>' +
    '<form method="POST" action="/unlock"><input name="key" style="padding:9px;width:80%" placeholder="Completion key from Lab ' + PREV_LAB + '"><br><br>' +
    '<button style="padding:10px 22px">Unlock LAB ' + LAB_NUMBER + '</button></form></div>' + chatWidget() + '</body></html>';
}
function loginPage(msg) {
  return layout('Login', null, '<h2>Login</h2>' + (msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/login">Email <input name="email" style="padding:7px;width:60%"><br><br>' +
    'Password <input name="password" type="password" style="padding:7px;width:60%"><br><br>' +
    '<button style="padding:9px 20px">Login</button></form>' +
    '<p><a href="/forgot">Forgot password?</a></p>' +
    '<div style="background:#fff8e1;border:1px solid #e6d28a;padding:10px;border-radius:8px">Just looking? Try our demo account — <b>demo@diner.local</b> / <b>demo123</b></div>');
}
function registerPage(msg) {
  return layout('Register', null, '<h2>Create your diner account</h2>' + (msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/register">Name <input name="name" style="padding:7px;width:60%"><br><br>' +
    'Email <input name="email" style="padding:7px;width:60%"><br><br>' +
    'Password <input name="password" type="password" style="padding:7px;width:60%"><br><br>' +
    '<button style="padding:9px 20px">Register</button></form>');
}
function forgotPage(msg) {
  return layout('Forgot password', null, '<h2>Forgot password</h2>' + (msg ? '<p>' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/forgot">Email <input name="email" style="padding:7px;width:60%"><br><br>' +
    '<button style="padding:9px 20px">Send reset link</button></form>' +
    '<h3>Have a token?</h3><form method="POST" action="/reset">Email <input name="email" style="padding:7px;width:50%"><br><br>' +
    'Token <input name="token" style="padding:7px;width:50%"><br><br>New password <input name="newPassword" type="password" style="padding:7px;width:50%"><br><br>' +
    '<button style="padding:9px 20px">Reset password</button></form>');
}
function menuPage(user, q) {
  let list = items.filter(i => i.visible === 1);
  let heading = 'Today\'s menu';
  if (q !== undefined && q !== '') {
    if (SQLI_PAT.test(q)) { pass('search-sqli'); list = items.slice(); heading = 'Search results'; }
    else list = list.filter(i => i.name.toLowerCase().includes(String(q).toLowerCase()));
    if (XSS_PAT.test(q)) pass('search-xss');
  }
  const rows = list.map(i =>
    '<div style="border:1px solid #eee;border-radius:8px;padding:12px;margin:10px 0"><b>' + esc(i.name) + '</b> — $' + i.price +
    '<form method="POST" action="/order" style="display:inline;margin-left:14px">Qty <input name="qty" value="1" size="3">' +
    ' <input type="hidden" name="itemId" value="' + i.id + '"><input type="hidden" name="price" value="' + i.price + '">' +
    ' Redeem pts <input name="redeem" value="0" size="4"> <button>Order</button></form></div>').join('');
  const revs = reviews.map(r => {
    const it = itemById(r.itemId); const au = users.find(u => u.id === r.userId);
    return '<div style="border-top:1px dashed #ddd;padding:8px 0"><b>' + (au ? au.name : 'Guest') + '</b> on ' + (it ? esc(it.name) : '?') + ' — ★' + r.rating + '<br>' + r.text + '</div>';
  }).join('');
  return layout('Menu', user, '<h2>' + heading + (q ? ' for "' + q + '"' : '') + '</h2>' +
    '<form method="GET" action="/menu">Search the menu <input name="q" value="' + (q || '') + '" style="padding:7px;width:50%"> <button>Search</button></form>' + rows +
    '<h3>Reviews</h3>' + revs +
    '<h3>Write a review</h3><form method="POST" action="/review">Dish <select name="itemId">' +
    items.filter(i => i.visible).map(i => '<option value="' + i.id + '">' + esc(i.name) + '</option>').join('') +
    '</select> Rating <input name="rating" value="5" size="3"><br><br><textarea name="text" rows="3" style="width:90%"></textarea><br><button style="padding:8px 18px">Post review</button></form>');
}
function bookPage(user, msg) {
  const rows = tables.map(t => '<option value="' + t.id + '">' + t.label + ' — seats ' + t.seats + '</option>').join('');
  return layout('Book a table', user, '<h2>Book a table</h2>' + (msg ? '<p>' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/book">Table <select name="tableId">' + rows + '</select><br><br>' +
    'Date <input name="date" value="2026-10-24" style="padding:7px"> Time <input name="slot" value="19:00" style="padding:7px"><br><br>' +
    'Party size <input name="partySize" value="2" size="3"><br><br><button style="padding:9px 20px">Book</button></form>');
}
function myPage(user, marker) {
  const bs = bookings.filter(b => b.userId === user.id).map(b => {
    const t = tables.find(x => x.id === b.tableId);
    return '<li><a href="/booking/' + b.id + '">Booking #' + b.id + '</a> — table ' + (t ? t.label : '?') + ', ' + esc(b.date) + ' ' + esc(b.slot) + ', party of ' + b.partySize + ' (' + esc(b.status) + ')</li>';
  }).join('');
  const os = orders.filter(o => o.userId === user.id).map(o => {
    const it = itemById(o.itemId);
    return '<li><a href="/order/' + o.id + '">Order #' + o.id + '</a> — ' + (it ? esc(it.name) : '?') + ' × ' + o.qty + ' — $' + o.total + ' (' + esc(o.status) + ')</li>';
  }).join('');
  return layout('My page', user, '<h2>My bookings</h2><ul>' + (bs || '<li>None yet</li>') + '</ul><h2>My orders</h2><ul>' + (os || '<li>None yet</li>') + '</ul>' +
    '<h2>Profile</h2><form method="POST" action="/profile">Display name <input name="name" value="' + esc(user.name) + '" style="padding:7px;width:50%">' +
    '<input type="hidden" name="hx_marker" value="' + esc(marker || '') + '"><br><br><button style="padding:8px 18px">Save profile</button></form>');
}

function kitchenPage(user) {
  const rows = orders.map(o => {
    const it = itemById(o.itemId); const dn = users.find(u => u.id === o.userId);
    return '<tr><td>#' + o.id + '</td><td>' + (dn ? esc(dn.name) : '?') + '</td><td>' + (it ? esc(it.name) : '?') + '</td><td>' + o.qty + '</td><td>$' + o.total + '</td><td>' + esc(o.status) + '</td></tr>';
  }).join('');
  return layout('Kitchen queue', user, '<h2>Kitchen queue — all live orders</h2><table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>Order</th><th>Diner</th><th>Dish</th><th>Qty</th><th>Total</th><th>Status</th></tr>' + rows + '</table>');
}
function managerPage(user, marker) {
  const urows = users.map(u => '<tr><td>' + u.id + '</td><td>' + u.name + '</td><td>' + esc(u.email) + '</td><td>' + esc(u.role) + '</td><td>' + u.loyaltyPoints + '</td></tr>').join('');
  const irows = items.map(i => '<tr><td>' + esc(i.name) + '</td><td>$' + i.price + '</td><td>' +
    '<form method="POST" action="/manager/price" style="display:inline"><input type="hidden" name="itemId" value="' + i.id + '"><input name="price" value="' + i.price + '" size="5"><input type="hidden" name="hx_marker" value="' + esc(marker || '') + '"><button>Set price</button></form></td></tr>').join('');
  return layout('Manager', user, '<h2>Manager console</h2><h3>Users</h3><table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>Id</th><th>Name</th><th>Email</th><th>Role</th><th>Pts</th></tr>' + urows + '</table>' +
    '<h3>Menu prices</h3><table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>Dish</th><th>Price</th><th>Change</th></tr>' + irows + '</table>');
}
function testsPage(user) {
  const byF = {};
  for (const t of TESTS) { (byF[t.feature] = byF[t.feature] || []).push(t); }
  let html = '<h2>Mission Board — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h2><p>' + doneCount() + ' of ' + TOTAL + ' tests complete. Hints reveal one at a time. The Lab Coach unlocks step-by-step help for a feature after you have genuinely tried that feature at least 3 times.</p>';
  for (const f of FEATURES) {
    html += '<h3>' + esc(f) + ' <small>(attempts so far: ' + (progress.attempts[f] || 0) + ')</small></h3>';
    for (const t of byF[f]) {
      const done = !!progress.tests[t.id];
      html += '<div style="border:1px solid #e6e6ee;border-radius:8px;padding:10px;margin:8px 0"><b>' + (done ? '✓' : '○') + ' ' + esc(t.name) + '</b> · ' + esc(t.owasp) + ' · ' + esc(t.difficulty) +
        '<details><summary>Hints</summary><ol><li>' + esc(t.hints[0]) + '</li><li>' + esc(t.hints[1]) + '</li><li>' + esc(t.hints[2]) + '</li></ol></details></div>';
    }
  }
  return layout('Mission Board', user, html);
}
function completePage(user) {
  if (!isComplete()) {
    const left = TESTS.filter(t => !progress.tests[t.id]).map(t => '<li>' + esc(t.name) + ' (' + esc(t.feature) + ')</li>').join('');
    return layout('Not yet complete', user, '<h2>Lab not complete yet</h2><p>Progress: ' + doneCount() + '/' + TOTAL + ' (' + Math.floor(doneCount() * 100 / TOTAL) + '%). Still open:</p><ul>' + left + '</ul><p><a href="/tests">Back to the Mission Board</a></p>');
  }
  const byF = {};
  for (const t of TESTS) { (byF[t.feature] = byF[t.feature] || []).push(t); }
  let s1 = '<p>This lab has <b>' + FEATURES.length + ' features</b> and <b>' + TOTAL + ' scored security tests</b>.</p>';
  let s2 = '<ul>' + FEATURES.map(f => '<li><b>' + esc(f) + '</b>: ' + byF[f].length + ' vulnerabilities</li>').join('') + '</ul>';
  let s3 = '<p>' + TOTAL + ' testing techniques were completed:</p><ul>' + TESTS.map(t => '<li>' + esc(t.name) + ' — ' + esc(t.owasp) + '</li>').join('') + '</ul>';
  let s4 = '<ul>' + TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.lesson) + '</li>').join('') + '</ul>';
  let s5 = '<ul>' + TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.impact) + '</li>').join('') + '</ul>';
  let s6 = '<ul>' + TESTS.map(t => '<li><b>' + esc(t.report.title) + '</b> — Severity: ' + esc(t.report.severity) + '. Remediation: ' + esc(t.report.remediation) + '</li>').join('') + '</ul>';
  const key = completionKey();
  return layout('Lab complete', user,
    '<h2>🎉 LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' complete!</h2>' +
    '<h3>1 · The lab at a glance</h3>' + s1 +
    '<h3>2 · Vulnerabilities per feature</h3>' + s2 +
    '<h3>3 · How the testing was done</h3>' + s3 +
    '<h3>4 · What you learned</h3>' + s4 +
    '<h3>5 · What this means for a real client</h3>' + s5 +
    '<h3>6 · Writing it in a real report</h3>' + s6 +
    '<div style="background:#eef7ee;border:1px solid #9c9;padding:14px;border-radius:8px"><b>Your completion key</b> — paste it into the next lab to unlock it:<br><code style="font-size:18px">' + key + '</code></div>' +
    '<h3>Certificate</h3><form method="POST" action="/api/name">Your name for the certificate <input name="name" value="' + esc(progress.testerName || (user ? user.name : '')) + '" style="padding:7px;width:50%"> <button>Save name</button></form>' +
    '<p><a href="/certificate">View your certificate →</a></p>');
}
function certificatePage(user) {
  if (!isComplete()) return layout('Certificate', user, '<h2>Certificate locked</h2><p>Finish 100% of the tests first — you are at ' + doneCount() + '/' + TOTAL + '.</p>');
  const name = progress.testerName || (user ? user.name : 'Tester');
  const date = progress.completedAt ? progress.completedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ' + LAB_NUMBER + '</title><style>@media print{button{display:none}}</style></head>' +
    '<body style="font-family:Georgia,serif;background:#ececf1;margin:0">' + progressBar() +
    '<div style="max-width:720px;margin:36px auto;background:#fff;border:3px double #7c5cff;border-radius:14px;padding:38px;text-align:center">' +
    '<img src="/logo.png" style="height:64px"><h1 style="margin:10px 0">Certificate of Completion</h1>' +
    '<p>This certifies that</p><h2 style="margin:6px 0">' + esc(name) + '</h2>' +
    '<p>has completed 100% of the security tests in</p><h3>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h3>' +
    '<p>' + TOTAL + ' tests across ' + FEATURES.length + ' features</p><p>Completed on ' + esc(date) + '</p>' +
    '<p style="margin-top:26px"><b>HexaCyberLab</b> — Built by Md. Jony Hassain, Founder</p>' +
    '<button onclick="window.print()">Print</button></div></body></html>';
}

/* --- final key shards + assembler (far from the first set, §7) --- */
const _cB = ["LTg4RA==", "VUJKSw==", "OVU1WQ=="];
function completionKey() { return _asm(_cA.concat(_cB)); }

/* ------------------------------ chatbot ------------------------------ */
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
const FEATURE_KEYS = [
  ['Login & Authentication', ['login', 'authentication', 'password', 'brute', 'reset token', 'enumerat', 'cookie']],
  ['Registration & Profile', ['regist', 'profile', 'signup', 'sign up', 'mass assignment']],
  ['Menu & Search', ['search', 'menu']],
  ['Table Bookings', ['book', 'table', 'reservation']],
  ['Orders & Payments', ['order', 'checkout', 'payment', 'price']],
  ['Reviews & Loyalty', ['review', 'loyalty', 'points']],
  ['Staff & Manager', ['staff', 'kitchen', 'manager', 'admin']],
  ['Platform & API', ['api', 'token', 'platform']]
];
function findFeature(msg) {
  for (const t of TESTS) if (msg.includes(t.name.toLowerCase())) return t.feature;
  for (const [f, keys] of FEATURE_KEYS) for (const k of keys) if (msg.includes(k)) return f;
  return null;
}
function chatReply(rawMsg) {
  const msg = String(rawMsg || '').toLowerCase();
  const done = doneCount();
  if (/(who (built|made|created)|founder|built this|made this|your creator)/.test(msg)) return ATTRIBUTION;
  if (msg.includes('key') && /(completion|next lab|unlock|give|what|share|tell)/.test(msg)) {
    if (isComplete() && progress.keyRevealed) return 'You earned it — the completion key for LAB ' + LAB_NUMBER + ' is: ' + completionKey() + ' — paste it into the next lab to unlock it.';
    return 'I do not have the completion key yet — it is only given to me when this lab is completed 100%. Right now the lab is at ' + done + '/' + TOTAL + ' tests (' + Math.floor(done * 100 / TOTAL) + '%). Finish every test and I will be able to share it.';
  }
  const howto = /(how|solve|guide|step|help|exploit|bypass|walkthrough|hint)/.test(msg);
  const f = findFeature(msg);
  if (howto && f) {
    const list = TESTS.filter(t => t.feature === f);
    const open = list.filter(t => !progress.tests[t.id]);
    const tries = progress.attempts[f] || 0;
    if (tries >= 3 || open.length === 0) {
      if (open.length === 0) return 'You have already completed every test in ' + f + ' — nicely done. Overall progress: ' + done + '/' + TOTAL + '.';
      let out = 'Step by step for ' + f + ' (you have tried this feature ' + tries + ' time(s)):\n';
      open.forEach((t, i) => { out += (i + 1) + '. ' + t.name + ' — ' + t.hints[2] + '\n'; });
      return out.trim();
    }
    return 'That feature is locked for help. First try the ' + f + ' tests yourself at least 3 times — I can see you\'ve tried ' + tries + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  if (/(how many|count|features|tests|vulnerabilities)/.test(msg)) {
    if (f) {
      const list = TESTS.filter(t => t.feature === f);
      return f + ' has ' + list.length + ' tests: ' + list.map(t => t.name).join('; ') + '. You have completed ' + list.filter(t => progress.tests[t.id]).length + ' of them.';
    }
    return 'LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ' has ' + FEATURES.length + ' features and ' + TOTAL + ' tests in total: ' + FEATURES.map(x => x + ' (' + TESTS.filter(t => t.feature === x).length + ')').join(', ') + '. Your progress: ' + done + '/' + TOTAL + '.';
  }
  if (/(progress|status|score)/.test(msg)) return 'Current progress: ' + done + '/' + TOTAL + ' tests (' + Math.floor(done * 100 / TOTAL) + '%). Attempts by feature: ' + FEATURES.map(x => x + ': ' + (progress.attempts[x] || 0)).join(', ') + '.';
  if (/(next|start|begin|what should|where)/.test(msg)) {
    const next = TESTS.find(t => !progress.tests[t.id]);
    if (!next) return 'Everything is complete — visit /complete for your summary, completion key and certificate.';
    return 'Next open test: "' + next.name + '" in ' + next.feature + ' (' + next.difficulty + '). Open /tests for its hints, try it yourself, and after 3 genuine attempts on that feature I can guide you step by step.';
  }
  if (/(hi|hello|hey)\b/.test(msg) || msg.length < 3) return 'Hello! I am the Lab Coach for LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '. There are ' + TOTAL + ' tests across ' + FEATURES.length + ' features; you have completed ' + done + '. Ask me how many tests a feature has, what to do next, or — after 3 real tries on a feature — how to solve its tests.';
  return 'I can help with this lab: ask me how many tests a feature has, what to try next, or how to solve a feature\'s tests (that unlocks after 3 genuine attempts on the feature — you have tried: ' + FEATURES.map(x => x + ' ' + (progress.attempts[x] || 0)).join(', ') + '). The Mission Board at /tests lists everything.';
}

/* ------------------------------ router ------------------------------ */
async function handle(req, res) {
  const u = new URL(req.url, 'http://127.0.0.1');
  const p = u.pathname;
  const method = req.method;
  const ip = req.socket.remoteAddress || 'local';

  if (p === '/logo.png') {
    try { const data = fs.readFileSync(path.join(DIR, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(data); }
    catch (e) { send(res, 404, 'no logo'); }
    return;
  }
  if (p === '/api/progress') {
    const feats = {};
    for (const f of FEATURES) {
      const list = TESTS.filter(t => t.feature === f);
      feats[f] = { total: list.length, done: list.filter(t => progress.tests[t.id]).length, attempts: progress.attempts[f] || 0 };
    }
    send(res, 200, JSON.stringify({ lab: LAB_NAME, number: LAB_NUMBER, total: TOTAL, done: doneCount(), pct: Math.floor(doneCount() * 100 / TOTAL), features: feats, complete: isComplete() }, null, 2), 'application/json');
    return;
  }
  if (p === '/api/chat' && method === 'POST') {
    const body = await readBody(req);
    if (body.__badjson) { send(res, 200, JSON.stringify({ reply: 'I could not parse that — please ask me in plain words about this lab.' }), 'application/json'); return; }
    send(res, 200, JSON.stringify({ reply: chatReply(body.message) }), 'application/json');
    return;
  }
  if (p === '/unlock' && method === 'POST') {
    const body = await readBody(req);
    if (entryKeyMatches(String(body.key || ''))) {
      progress.unlocked = true; saveProgress(); redirect(res, '/');
    } else { res.writeHead(403, { 'Content-Type': 'text/html' }); res.end('<h1>403 — wrong key</h1><p>That key does not open LAB ' + LAB_NUMBER + '.</p>'); }
    return;
  }

  if (!progress.unlocked) { send(res, 200, gatePage()); return; }

  const user = currentUser(req);
  const sess = getSession(req);
  res.setHeader('Set-Cookie', 'hx_origin=1; Path=/');

  if (p === '/' ) { redirect(res, user ? '/menu' : '/login'); return; }

  /* ---------- auth ---------- */
  if (p === '/login' && method === 'GET') { send(res, 200, loginPage()); return; }
  if (p === '/login' && method === 'POST') {
    const b = await readBody(req);
    attempt('Login & Authentication');
    const email = String(b.email || ''), pw = String(b.password || '');
    probe(ip, email);
    if (SQLI_PAT.test(email) || SQLI_PAT.test(pw)) {
      pass('auth-sqli');
      const sid = newSession(users[0].id);
      res.writeHead(302, { 'Set-Cookie': 'hx_session=' + sid + '; Path=/; HttpOnly', Location: '/menu' }); res.end(); return;
    }
    const found = userByEmail(email);
    if (!found) { send(res, 200, loginPage('No account with that email.')); return; }
    if (found.password !== pw) {
      failCount[found.email] = (failCount[found.email] || 0) + 1;
      if (failCount[found.email] >= 10) pass('auth-brute');
      send(res, 200, loginPage('Wrong password for that account.')); return;
    }
    failCount[found.email] = 0;
    if (found.id === 5) pass('auth-default');
    const sid = newSession(found.id);
    res.writeHead(302, { 'Set-Cookie': 'hx_session=' + sid + '; Path=/; HttpOnly', Location: '/menu' }); res.end(); return;
  }
  if (p === '/logout') {
    const c = parseCookies(req); if (c.hx_session) sessions.delete(c.hx_session);
    res.writeHead(302, { 'Set-Cookie': 'hx_session=; Path=/; Max-Age=0', Location: '/login' }); res.end(); return;
  }
  if (p === '/forgot' && method === 'GET') { send(res, 200, forgotPage()); return; }
  if (p === '/forgot' && method === 'POST') {
    const b = await readBody(req);
    attempt('Login & Authentication');
    probe(ip, b.email);
    const found = userByEmail(b.email);
    if (!found) { send(res, 200, forgotPage('No such account.')); return; }
    forgotCalled.add(found.email);
    issuedTokens[found.email] = resetTokenFor(found);
    send(res, 200, forgotPage('Reset link sent to ' + esc(found.email) + '.')); return;
  }
  if (p === '/reset' && method === 'POST') {
    const b = await readBody(req);
    attempt('Login & Authentication');
    const found = userByEmail(b.email);
    if (!found) { send(res, 200, forgotPage('No such account.')); return; }
    const formula = resetTokenFor(found);
    if (String(b.token || '') === formula) {
      if (!forgotCalled.has(found.email) || issuedTokens[found.email] !== b.token) pass('auth-reset');
      found.password = String(b.newPassword || 'reset123');
      send(res, 200, loginPage('Password reset complete — sign in with your new password.')); return;
    }
    send(res, 200, forgotPage('Invalid reset token.')); return;
  }

  /* ---------- registration & profile ---------- */
  if (p === '/register' && method === 'GET') { send(res, 200, registerPage()); return; }
  if (p === '/register' && method === 'POST') {
    const b = await readBody(req);
    attempt('Registration & Profile');
    const email = String(b.email || '').toLowerCase();
    if (!email || userByEmail(email)) { send(res, 200, registerPage('Email missing or already registered.')); return; }
    const pw = String(b.password || '');
    const nu = {
      id: nextUserId++,
      name: String(b.name || 'New Diner'),
      email,
      password: pw,
      role: b.role ? String(b.role) : 'diner',
      loyaltyPoints: b.loyaltyPoints !== undefined ? Number(b.loyaltyPoints) || 0 : 0
    };
    users.push(nu);
    if (pw.length < 4) pass('reg-weakpw');
    if (nu.role !== 'diner' || nu.loyaltyPoints > 0) pass('reg-massassign');
    if (XSS_PAT.test(nu.name)) pass('reg-xss');
    const sid = newSession(nu.id);
    res.writeHead(302, { 'Set-Cookie': 'hx_session=' + sid + '; Path=/; HttpOnly', Location: '/menu' }); res.end(); return;
  }
  if (p === '/profile' && method === 'POST') {
    if (!user) { redirect(res, '/login'); return; }
    const b = await readBody(req);
    attempt('Registration & Profile');
    user.name = String(b.name || user.name); // FLAW: hx_marker never verified
    if (!sess || b.hx_marker !== sess.marker) pass('reg-csrf');
    redirect(res, '/my'); return;
  }

  /* ---------- menu & search ---------- */
  if (p === '/menu' && method === 'GET') {
    if (!user) { redirect(res, '/login'); return; }
    const q = u.searchParams.get('q');
    if (q) attempt('Menu & Search');
    send(res, 200, menuPage(user, q === null ? undefined : q)); return;
  }

  /* ---------- bookings ---------- */
  if (p === '/book' && method === 'GET') {
    if (!user) { redirect(res, '/login'); return; }
    send(res, 200, bookPage(user)); return;
  }
  if (p === '/book' && method === 'POST') {
    if (!user) { redirect(res, '/login'); return; }
    const b = await readBody(req);
    attempt('Table Bookings');
    const table = tables.find(t => t.id === Number(b.tableId)) || tables[0];
    const party = Number(b.partySize || 2);
    const bk = { id: nextBookingId++, userId: user.id, tableId: table.id, date: String(b.date || '2026-10-24'), slot: String(b.slot || '19:00'), partySize: party, status: 'active' };
    if (party > table.seats) pass('book-capacity');
    if (bookings.some(x => x.tableId === bk.tableId && x.date === bk.date && x.slot === bk.slot && x.status === 'active')) pass('book-slot');
    bookings.push(bk);
    redirect(res, '/my'); return;
  }
  const bm = p.match(/^\/booking\/(\d+)$/);
  if (bm && method === 'GET') {
    if (!user) { redirect(res, '/login'); return; }
    attempt('Table Bookings');
    const bk = bookings.find(x => x.id === Number(bm[1]));
    if (!bk) { send(res, 404, layout('Not found', user, '<h2>404 — no such booking</h2>')); return; }
    if (bk.userId !== user.id) pass('book-view-idor');
    const t = tables.find(x => x.id === bk.tableId); const owner = users.find(x => x.id === bk.userId);
    send(res, 200, layout('Booking', user, '<h2>Booking #' + bk.id + '</h2><p>Guest: ' + (owner ? esc(owner.name) + ' (' + esc(owner.email) + ')' : '?') + '</p><p>Table ' + (t ? t.label : '?') + ' · ' + esc(bk.date) + ' ' + esc(bk.slot) + ' · party of ' + bk.partySize + ' · status ' + esc(bk.status) + '</p>' +
      '<form method="POST" action="/booking/' + bk.id + '/cancel"><button>Cancel this booking</button></form>'));
    return;
  }
  const bc = p.match(/^\/booking\/(\d+)\/cancel$/);
  if (bc && method === 'POST') {
    if (!user) { redirect(res, '/login'); return; }
    await readBody(req);
    attempt('Table Bookings');
    const bk = bookings.find(x => x.id === Number(bc[1]));
    if (bk) { if (bk.userId !== user.id) pass('book-cancel-idor'); bk.status = 'cancelled'; }
    redirect(res, '/my'); return;
  }

  /* ---------- orders ---------- */
  if (p === '/order' && method === 'POST') {
    if (!user) { redirect(res, '/login'); return; }
    const b = await readBody(req);
    attempt('Orders & Payments');
    const item = itemById(b.itemId) || items[0];
    const qty = b.qty !== undefined && b.qty !== '' ? Number(b.qty) : 1;
    const unit = (b.price !== undefined && b.price !== '') ? Number(b.price) : item.price;
    const redeem = b.redeem !== undefined && b.redeem !== '' ? Number(b.redeem) || 0 : 0;
    if (redeem > 0) attempt('Reviews & Loyalty');
    const total = Math.round((unit * qty - redeem * 0.1) * 100) / 100;
    const ord = { id: nextOrderId++, userId: user.id, itemId: item.id, qty, unitPrice: unit, total, status: 'preparing', redeem };
    orders.push(ord);
    if (unit !== item.price) pass('order-price');
    if (qty < 0 || total < 0) pass('order-negative');
    if (redeem > user.loyaltyPoints) pass('loyalty-forge');
    user.loyaltyPoints -= redeem;
    redirect(res, '/my'); return;
  }
  const om = p.match(/^\/order\/(\d+)$/);
  if (om && method === 'GET') {
    if (!user) { redirect(res, '/login'); return; }
    attempt('Orders & Payments');
    const ord = orders.find(x => x.id === Number(om[1]));
    if (!ord) { send(res, 404, layout('Not found', user, '<h2>404 — no such order</h2>')); return; }
    if (ord.userId !== user.id) pass('order-idor');
    const it = itemById(ord.itemId); const owner = users.find(x => x.id === ord.userId);
    send(res, 200, layout('Order', user, '<h2>Order #' + ord.id + '</h2><p>Diner: ' + (owner ? esc(owner.name) : '?') + '</p><p>' + (it ? esc(it.name) : '?') + ' × ' + ord.qty + ' @ $' + ord.unitPrice + ' — total $' + ord.total + ' — status: <b>' + esc(ord.status) + '</b></p>' +
      '<form method="POST" action="/order/' + ord.id + '/status">Set status <select name="status"><option>preparing</option><option>served</option><option>paid</option><option>cancelled</option></select> <button>Update</button></form>'));
    return;
  }
  const os2 = p.match(/^\/order\/(\d+)\/status$/);
  if (os2 && method === 'POST') {
    if (!user) { redirect(res, '/login'); return; }
    const b = await readBody(req);
    attempt('Orders & Payments');
    const ord = orders.find(x => x.id === Number(os2[1]));
    if (ord) {
      const st = String(b.status || 'preparing');
      if (user.role === 'diner' && (st === 'paid' || st === 'served')) pass('order-status');
      ord.status = st;
    }
    redirect(res, '/my'); return;
  }

  /* ---------- reviews ---------- */
  if (p === '/review' && method === 'POST') {
    if (!user) { redirect(res, '/login'); return; }
    const b = await readBody(req);
    attempt('Reviews & Loyalty');
    const itemId = Number(b.itemId) || 1;
    const text = String(b.text || '');
    const eligible = orders.some(o => o.userId === user.id && o.itemId === itemId && (o.status === 'paid' || o.status === 'served'));
    if (!eligible) pass('review-noorder');
    if (XSS_PAT.test(text)) pass('review-xss');
    reviews.push({ id: nextReviewId++, userId: user.id, itemId, rating: Number(b.rating) || 5, text });
    redirect(res, '/menu'); return;
  }

  /* ---------- my page ---------- */
  if (p === '/my' && method === 'GET') {
    if (!user) { redirect(res, '/login'); return; }
    send(res, 200, myPage(user, sess ? sess.marker : '')); return;
  }

  /* ---------- staff & manager ---------- */
  if (p === '/kitchen' && method === 'GET') {
    if (!user) { redirect(res, '/login'); return; }
    attempt('Staff & Manager');
    if (user.role === 'diner') pass('staff-queue');
    send(res, 200, kitchenPage(user)); return;
  }
  if (p === '/manager' && method === 'GET') {
    if (!user) { redirect(res, '/login'); return; }
    attempt('Staff & Manager');
    const role = effectiveRole(req, user);
    if (user.role !== 'manager' && role === 'manager') pass('auth-cookie');
    if (role !== 'manager') { send(res, 403, layout('Forbidden', user, '<h2>403 — managers only</h2>')); return; }
    send(res, 200, managerPage(user, sess ? sess.marker : '')); return;
  }
  if (p === '/manager/price' && method === 'POST') {
    if (!user) { redirect(res, '/login'); return; }
    const b = await readBody(req);
    attempt('Staff & Manager');
    const role = effectiveRole(req, user);
    if (user.role !== 'manager' && role === 'manager') pass('auth-cookie');
    if (role !== 'manager') { send(res, 403, layout('Forbidden', user, '<h2>403 — managers only</h2>')); return; }
    const item = itemById(b.itemId);
    if (item) { item.price = Number(b.price) || item.price; if (!sess || b.hx_marker !== sess.marker) pass('admin-csrf'); }
    redirect(res, '/manager'); return;
  }

  /* ---------- api ---------- */
  if (p === '/api/orders' && method === 'GET') {
    attempt('Platform & API');
    const auth = req.headers.authorization || '';
    let apiUser = null;
    if (auth.startsWith('Bearer ')) {
      try { const em = Buffer.from(auth.slice(7), 'base64').toString('utf8'); apiUser = userByEmail(em) || null; } catch (e) {}
    }
    if (apiUser && !user) pass('api-token');
    const who = apiUser || user;
    if (!who) { send(res, 401, JSON.stringify({ error: 'unauthorized' }), 'application/json'); return; }
    send(res, 200, JSON.stringify({ user: who.email, orders: orders.filter(o => o.userId === who.id) }, null, 2), 'application/json');
    return;
  }
  if (p === '/api/name' && method === 'POST') {
    const b = await readBody(req);
    if (b.name) { progress.testerName = String(b.name).slice(0, 60); saveProgress(); }
    redirect(res, '/complete'); return;
  }

  /* ---------- system pages ---------- */
  if (p === '/tests' && method === 'GET') { send(res, 200, testsPage(user)); return; }
  if (p === '/complete' && method === 'GET') { send(res, 200, completePage(user)); return; }
  if (p === '/certificate' && method === 'GET') { send(res, 200, certificatePage(user)); return; }

  send(res, 404, layout('Not found', user, '<h2>404 — page not found</h2>'));
}

const server = http.createServer((req, res) => {
  handle(req, res).catch(() => {
    try { send(res, 200, '<!DOCTYPE html><html><body style="font-family:Arial"><h2>Something hiccuped — the lab is still up.</h2><p><a href="/menu">Back to the menu</a></p></body></html>'); } catch (e) {}
  });
});
if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => console.log('LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ' listening on http://127.0.0.1:' + PORT));
}
module.exports = { TESTS, FEATURES, TOTAL };
