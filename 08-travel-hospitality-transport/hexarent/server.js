'use strict';
/*
 * HexaRent — LAB 78 of the HexaCyberLab vulnerable-lab programme.
 * A deliberately vulnerable property & equipment rental platform for
 * authorised, local-only security training. Zero-dependency Node.js.
 * All renters, owners, listings and bookings are invented seed data.
 * Built by Md. Jony Hassain, Founder of HexaCyberLab.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB_NUMBER = 78;
const LAB_NAME = 'HexaRent';
const PREV_LAB = 77;
const PORT = 3087;
const HOST = '127.0.0.1';
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const LOGO_FILE = path.join(DIR, 'logo.png');

/* ------------------------------------------------------------------ *
 * Entry key — stored ONLY as encoded shards (region 1 of 2).
 * The assembler lives elsewhere; the entry key is reconstructed
 * only inside the /unlock verification path.
 * ------------------------------------------------------------------ */
const ENTRY_SHARDS = ["TC1YSA==","MS04Nw==","UkJSSw==","LVVINA==","VVJHUw==","UlJSMw=="];

/* ------------------------- Progress engine ------------------------ */
let progress = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const p = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      if (p && typeof p === 'object') progress = Object.assign(progress, p);
    }
  } catch (e) { /* corrupt state file -> start fresh, never crash */ }
}
function saveProgress() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2)); } catch (e) {}
}
loadProgress();

/* --------------------------- TESTS registry ------------------------ */
const TESTS = [
  /* ---------------- Login & Authentication ---------------- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03:2021 – Injection', difficulty: 'Beginner',
    hints: ['The login form builds its query by pasting your email straight into a string.', 'Try a classic tautology in the email field: a quote, OR, and a comparison that is always true.', "Email: ' OR '1'='1 — the app logs you in as the first matching account."],
    lesson: 'String-built queries let attacker input change the query logic itself; parameterised queries make input data-only.',
    impact: 'On a real rental platform this means an attacker walks straight into the admin account — every renter\'s identity details, booking, deposit and payout is exposed in one request.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.' },
    guide: "Go to the login form and put this in the Email field: ' OR '1'='1 (any password). The query is built by string concatenation, so the condition is always true and you are logged in as the first account (the admin)." },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limiting or Lockout', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Keep guessing the same account\'s password — watch what does NOT happen.', 'There is no CAPTCHA, no delay and no lockout, however many times you fail.', 'Fail 10 logins in a row for one account; the 10th is still processed normally.'],
    lesson: 'Without throttling or lockout, password guessing is free and unlimited — weak passwords fall quickly.',
    impact: 'Attackers can grind through passwords for owner accounts overnight, then drain payouts and harvest renter data.',
    report: { title: 'Missing Brute-Force Protection on Login (No Rate Limit / Lockout)', severity: 'High', remediation: 'Add progressive delays, account lockout and alerting on repeated failed logins.' },
    guide: 'Pick one account (e.g. the demo renter) and submit 10 wrong passwords in a row. Nothing slows down or locks — the test passes when the 10th failure is still accepted for processing.' },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User Enumeration via Divergent Responses', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the forgot-password answer for an email that exists with one that does not.', 'The app is polite — too polite. One says a reset was sent; the other admits there is no account.', 'Submit 5 different emails to /forgot and collect the two different answers.'],
    lesson: 'Different responses for existing vs non-existing accounts hand attackers a valid-account list for targeted attacks.',
    impact: 'An attacker confirms which property owners and renters have accounts, then aims phishing and password attacks only at real targets.',
    report: { title: 'Account Enumeration via Password-Reset and Login Error Messages', severity: 'Medium', remediation: 'Return one identical, generic response for every reset/login attempt regardless of account existence.' },
    guide: 'Use the Forgot Password page. A registered email gets "reset link sent"; an unknown email gets a different "no account" message. Probe 5 distinct emails to map which accounts exist.' },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Demo Credentials Published on the Login Page', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Read the login page carefully — it tries to be helpful.', 'A demo account with its password is printed right under the form.', 'Just log in with the published demo renter credentials.'],
    lesson: 'Demo/default credentials left visible in production are an open door — attackers try them first.',
    impact: 'Anyone on the internet can sign in as a real renter and start exploring bookings, invoices and personal data — no skill required.',
    report: { title: 'Demo Account Credentials Disclosed on the Public Login Page', severity: 'High', remediation: 'Remove demo credentials from production; disable default accounts or force unique passwords.' },
    guide: 'The login page prints a demo renter account under the form. Sign in with exactly those published credentials.' },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a reset for an account you control and look at the token pattern.', 'The token is computed from something you can see — the account\'s numeric id.', 'Token = HR followed by (user id × 149 + 37). Compute another user\'s token without ever requesting a reset for them.'],
    lesson: 'Reset tokens must be long, random and single-use; a formula based on public values is no secret at all.',
    impact: 'An attacker resets the platform admin\'s password using only the admin\'s email and id — full takeover without touching the inbox.',
    report: { title: 'Password-Reset Tokens Are Predictable (Derived from User ID)', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), store hashed, expire quickly and allow single use.' },
    guide: 'Tokens follow a formula: HR + (userId × 149 + 37). User ids are visible in the app (admin is 1, renters are 5 and 6). Compute a token for an account you never requested a reset for and use it on the reset page.' },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Role Cookie Tampering — Client-Supplied Role Trusted', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['After logging in, inspect your cookies — one of them states your role.', 'The owner console believes that cookie instead of the server-side account.', 'Set the hx_role cookie to owner (or admin) and open /owner.'],
    lesson: 'Authorization data must live server-side; anything stored on the client can be edited by the client.',
    impact: 'Any renter can promote themselves to "owner" in their own browser and open owner-only screens — listings, bookings and payout data included.',
    report: { title: 'Owner Console Trusts a Client-Supplied Role Cookie', severity: 'High', remediation: 'Derive roles from the server-side session record only; ignore role claims from cookies or request data.' },
    guide: 'Log in as the demo renter, then set your browser cookie hx_role=owner (dev tools or curl -b). Open /owner — the owner console trusts the cookie, not your real account.' },

  /* ---------------- Registration & Profile ---------------- */
  { id: 'reg-weak', feature: 'Registration & Profile', name: 'Weak Password Policy — 1-Character Passwords Accepted', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a new account and be lazy with the password.', 'There is no minimum length at all.', 'A password of a single character (e.g. "x") is accepted.'],
    lesson: 'Password policy is the first line of defence; accepting 1-character passwords makes brute force trivial.',
    impact: 'Renters who pick tiny passwords get their accounts — and their upcoming trip details — guessed in seconds.',
    report: { title: 'No Minimum Password Strength Enforced at Registration', severity: 'Medium', remediation: 'Enforce a minimum length (≥10–12) and block common/breached passwords at registration and reset.' },
    guide: 'Register a new account with a password of one character. The account is created and works — the policy accepts anything.' },
  { id: 'reg-mass', feature: 'Registration & Profile', name: 'Mass Assignment — Role Set at Registration', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration form shows name, email, password — the server accepts more than it shows.', 'What if the request also carried a role field?', 'Add role=owner (or admin) to the registration POST and check your new powers.'],
    lesson: 'Bind only whitelisted fields from requests; blindly assigning every submitted field lets users grant themselves privileges.',
    impact: 'Anyone can register themselves as a property owner or admin of the platform — instant insider access to listings, bookings and payouts.',
    report: { title: 'Mass Assignment in Registration Allows Self-Assignment of Privileged Roles', severity: 'Critical', remediation: 'Whitelist assignable fields server-side; set role explicitly in code, never from request data.' },
    guide: 'Intercept the registration POST and add a field role=owner (or role=admin). The server binds every field it receives, so your new account is created with that role.' },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03:2021 – Injection', difficulty: 'Beginner',
    hints: ['Your display name is shown in the page header and in owner/admin lists — exactly as typed.', 'Put a script payload where your name goes.', 'Register (or rename yourself) with a name like <script>alert(1)</script> and view a page that renders it.'],
    lesson: 'User-supplied text must be output-encoded everywhere it is rendered; one unescaped field poisons every viewer.',
    impact: 'A malicious "renter name" can run scripts in property owners\' browsers — stealing sessions and acting as the owner.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-encode all user-supplied output; add a Content-Security-Policy as defence in depth.' },
    guide: 'Set your display name (registration or profile) to a payload such as <script>alert(1)</script>. It is stored and rendered unescaped in the header and owner/admin views.' },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['The profile form changes your name and phone with a plain POST.', 'Nothing in the request proves it came from this site\'s own form.', 'POST the profile change from another origin (or without the site\'s origin marker) while logged in.'],
    lesson: 'State-changing requests need an unguessable CSRF token tied to the session; cookies alone are ambient authority.',
    impact: 'A booby-trapped page in an owner\'s browser could silently change profile data (or worse) using their logged-in session.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require a per-session CSRF token on every state-changing request and validate Origin/Referer.' },
    guide: 'While logged in, send the profile-update POST from a different origin (curl with a foreign Origin header, or omit the site origin marker field). The change is applied — no CSRF token exists.' },

  /* ---------------- Search & Listings ---------------- */
  { id: 'search-sqli', feature: 'Search & Listings', name: 'SQL Injection in Listing Search — Hidden Draft Listings Leaked', owasp: 'A03:2021 – Injection', difficulty: 'Intermediate',
    hints: ['The search box feeds a string-built query over the listings table.', 'A tautology in the search term makes the WHERE clause match everything — even rows the public never sees.', "Search for: ' OR '1'='1 — the unpublished DRAFT villa appears in the results."],
    lesson: 'Search is an injection surface like any other; parameterise it, and filter unpublished rows in the query, not the template.',
    impact: 'Attackers enumerate the platform\'s entire inventory — including unlaunched listings, internal pricing drafts and delisted properties.',
    report: { title: 'SQL Injection in Search Exposes Unpublished Listings', severity: 'High', remediation: 'Parameterise the search query and enforce the published-status filter server-side.' },
    guide: "Use the search box with the term ' OR '1'='1. The string-built query returns every listing, including the DRAFT Mountain Villa that never appears in normal browsing." },
  { id: 'search-xss', feature: 'Search & Listings', name: 'Reflected XSS in Search Results', owasp: 'A03:2021 – Injection', difficulty: 'Beginner',
    hints: ['The results page repeats your search term back to you — verbatim.', 'What happens if the "term" is actually HTML?', 'Search for <script>alert(1)</script> and look at the page source.'],
    lesson: 'Anything reflected into a page must be encoded for that context; search terms are a classic reflection point.',
    impact: 'A crafted search link runs script in a victim\'s browser — session theft and fake "support" pages under the real brand.',
    report: { title: 'Reflected Cross-Site Scripting via Search Term', severity: 'Medium', remediation: 'HTML-encode all reflected input; validate search terms server-side.' },
    guide: 'Search for a payload such as <script>alert(1)</script>. The results heading prints your term back completely unescaped.' },

  /* ---------------- Listings Management ---------------- */
  { id: 'list-edit', feature: 'Listings Management', name: 'Edit Another Owner\'s Listing Price', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['Owners edit their listings at /listings/<id>/edit. The form checks ownership — the endpoint does not.', 'Listing 2 belongs to Marcus. You are not Marcus.', 'POST a new dailyRate to /listings/2/edit while logged in as anyone else.'],
    lesson: 'Function-level authorization must be enforced on the server for every write, not just by hiding the edit button from non-owners.',
    impact: 'A rival owner (or any renter) can slash or inflate a competitor\'s prices overnight — bookings, trust and revenue all take the hit.',
    report: { title: 'Broken Function-Level Authorization — Any User Can Edit Any Listing', severity: 'High', remediation: 'Verify listing ownership (or admin role) server-side before applying any listing change.' },
    guide: 'Log in as the demo renter (or the other owner) and POST to /listings/2/edit with dailyRate=1. The listing belongs to Marcus, but the price changes — the endpoint never checks ownership.' },

  /* ---------------- Bookings ---------------- */
  { id: 'book-idor', feature: 'Bookings', name: 'Booking IDOR — View Another Renter\'s Booking', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: ['Your booking detail page has a number in its URL.', 'Numbers are sequential. What is booking 2?', 'Open /bookings/<id> for a booking that involves neither you nor your listings.'],
    lesson: 'Every object access must check that the requester is a party to the object — hiding links is not authorization.',
    impact: 'Strangers can browse who rented what, where, and when — travel plans and home addresses of renters leak one id at a time.',
    report: { title: 'Insecure Direct Object Reference on Booking Details', severity: 'High', remediation: 'Enforce per-object party checks (renter, listing owner, staff) on the server for every booking read.' },
    guide: 'Log in as the demo renter and open /bookings/2 — it is Tom\'s booking on a listing you do not own, yet it is served to you. Sequential ids make every booking enumerable.' },
  { id: 'book-ratetamper', feature: 'Bookings', name: 'Daily-Rate Tampering — Total Price Trusted from the Client', owasp: 'A04:2021 – Insecure Design', difficulty: 'Beginner',
    hints: ['The booking form shows a total — computed in the browser and sent as a field.', 'The server never recomputes days × daily rate.', 'Book 3 nights but send totalPrice=1.'],
    lesson: 'Money figures must always be recomputed server-side from the catalogue truth; a client-sent total is a suggestion, not a fact.',
    impact: 'Every renter can book any property for $1 — direct, unlimited revenue loss for owners and the platform.',
    report: { title: 'Booking Total Trusted from Client Allows Renting at Forged Prices', severity: 'Critical', remediation: 'Recompute totals server-side from listing rates and dates; reject or ignore client-supplied prices.' },
    guide: 'Start a booking for the Beach Apartment (3 nights = $360) and intercept the POST: change totalPrice to 1. The booking is created — and invoiced — at $1.' },
  { id: 'book-deposit', feature: 'Bookings', name: 'Security Deposit Waived by Parameter Forgery', owasp: 'A04:2021 – Insecure Design', difficulty: 'Intermediate',
    hints: ['The deposit is also just a form field (depositAmount) on its way to the server.', 'What if the deposit arriving at the server is 0?', 'Book with depositAmount=0 — the booking confirms with no deposit held.'],
    lesson: 'Every financial term of a transaction — price, deposit, fees — must be derived server-side, never accepted from the request.',
    impact: 'Renters skip the security deposit entirely; when damage happens, owners have nothing to claim against.',
    report: { title: 'Security Deposit Amount Trusted from Client (Deposit Bypass)', severity: 'High', remediation: 'Read the deposit from the listing record server-side at booking time.' },
    guide: 'Intercept the booking POST and set depositAmount=0. The booking is confirmed and the invoice shows a $0 deposit — the platform holds nothing against damage.' },
  { id: 'book-unavailable', feature: 'Bookings', name: 'Double Booking — Availability Calendar Never Checked', owasp: 'A04:2021 – Insecure Design', difficulty: 'Intermediate',
    hints: ['The Beach Apartment is already booked 2026-11-10 → 2026-11-12.', 'The booking code never looks at existing bookings for those dates.', 'Book the same listing for overlapping dates — it confirms as a second booking.'],
    lesson: 'Availability is a core business invariant; it must be checked inside the booking transaction, not drawn on a calendar and forgotten.',
    impact: 'Two renters arrive the same night for one apartment — refunds, chargebacks and reputation damage follow.',
    report: { title: 'Overlapping Bookings Accepted — No Availability Check at Booking Time', severity: 'High', remediation: 'Check date-range overlaps against confirmed bookings in the same transaction that creates the booking.' },
    guide: 'The Beach Apartment (listing 1) is booked 10–12 Nov 2026. Book it again for 11–13 Nov 2026 — the system happily confirms an overlapping booking.' },
  { id: 'book-extend', feature: 'Bookings', name: 'Free Rental Extension — Extra Days Without Payment', owasp: 'A04:2021 – Insecure Design', difficulty: 'Intermediate',
    hints: ['Bookings can be extended from the detail page — a new end date is all it takes.', 'Nobody recomputes the price for the extra days, and no new invoice appears.', 'Extend your booking by 5 extra days and watch the amount owed stay exactly the same.'],
    lesson: 'Any change that extends consumption of a paid resource must re-price and re-bill in the same server-side flow.',
    impact: 'Renters stay extra nights for free while owners lose both the rent and the chance to re-let those dates.',
    report: { title: 'Booking Extension Does Not Re-Price or Bill Extra Days', severity: 'High', remediation: 'Recompute the rental total on extension and require payment for added days before confirming.' },
    guide: 'Open your own booking and POST to /bookings/<id>/extend with a newEnd five days later. The booking stretches — total price and invoice do not move.' },

  /* ---------------- Invoices & Payments ---------------- */
  { id: 'inv-idor', feature: 'Invoices & Payments', name: 'Invoice IDOR — View Another Party\'s Invoice', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: ['Invoices live at /invoices/<id> with sequential ids.', 'An invoice names the renter, the property and exactly what they paid.', 'Open /invoices/3 as the demo renter — it belongs to Tom\'s booking.'],
    lesson: 'Financial documents need the same per-object authorization as the bookings they belong to.',
    impact: 'Renters can read each other\'s invoices — names, properties, dates and amounts — a privacy and fraud-enabling leak.',
    report: { title: 'Insecure Direct Object Reference on Invoice Details', severity: 'High', remediation: 'Enforce invoice party checks server-side on every read.' },
    guide: 'As the demo renter, open /invoices/3 — the invoice for Tom\'s booking, served without any party check.' },
  { id: 'inv-tamper', feature: 'Invoices & Payments', name: 'Invoice Payment Amount Tampering — Settles in Full for $1', owasp: 'A04:2021 – Insecure Design', difficulty: 'Beginner',
    hints: ['The pay form sends the amount as a field. The server trusts it completely.', 'What does the server actually verify before marking an invoice PAID?', 'Pay invoice 1 with amount=1 — the $660 invoice is marked fully paid.'],
    lesson: 'Payment state must be derived from server-side amounts and verified transactions, never from client-supplied figures.',
    impact: 'Every renter can settle every invoice for $1 — rent and deposits alike vanish from the platform\'s books.',
    report: { title: 'Payment Amount Trusted from Client Allows Settling Invoices for $1', severity: 'High', remediation: 'Compute payable amounts server-side from the invoice record; reconcile with the payment provider before marking paid.' },
    guide: 'Open your unpaid invoice ($660) and intercept the pay POST: change amount to 1. The invoice is marked PAID in full.' },

  /* ---------------- Owner Payouts ---------------- */
  { id: 'payout-idor', feature: 'Owner Payouts', name: 'Payout IDOR — View Another Owner\'s Payout', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['Payouts live at /payouts/<id>. Owners are supposed to see only their own money.', 'The handler serves any payout to any signed-in account.', 'As Olivia (owner 1), open /payouts/2 — it is Marcus\'s payout. Even a renter can read it.'],
    lesson: 'Payout data is among the most sensitive financial data on a marketplace; per-object checks must compare the payout\'s owner to the session.',
    impact: 'Competitors learn exactly what each owner earns and when — and payout details are prime material for payment-diversion fraud.',
    report: { title: 'Insecure Direct Object Reference Exposes Owner Payout Records', severity: 'High', remediation: 'Check payout ownership server-side; restrict payout endpoints to the owning account and finance staff.' },
    guide: 'Log in as any non-admin account that does not own payout 2 (e.g. the demo renter) and open /payouts/2. Marcus\'s payout amount and status are served without an ownership check.' },

  /* ---------------- Damage Claims ---------------- */
  { id: 'claim-idor', feature: 'Damage Claims', name: 'Damage Claim IDOR — View Another Party\'s Claim', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: ['Claims live at /claims/<id>, sequential as usual.', 'A claim shows the item, the amount, and both parties.', 'Open /claims/1 as the demo renter Rita — that claim is about Tom\'s rental, not yours.'],
    lesson: 'Dispute records are sensitive for both sides; access must be limited to the claim\'s parties and staff.',
    impact: 'Renters and owners can browse each other\'s disputes — amounts, accusations and outcomes — fuelling retaliation and fraud.',
    report: { title: 'Insecure Direct Object Reference on Damage Claim Details', severity: 'Medium', remediation: 'Enforce claim party checks server-side on every read.' },
    guide: 'As the demo renter, open /claims/1. It concerns Tom\'s camera rental — you are not a party — yet the full claim renders.' },
  { id: 'claim-self', feature: 'Damage Claims', name: 'Renter Approves Their Own Damage Claim via the Owner Endpoint', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Advanced',
    hints: ['Owners decide claims at /claims/<id>/decide. The server never asks WHO is deciding.', 'Claim 2 is a claim AGAINST you (Rita) by the apartment owner.', 'As Rita, POST decision=rejected to /claims/2/decide — kill the claim against yourself.'],
    lesson: 'Workflow decision endpoints must verify the caller is the authorised decision-maker for that object; a hidden button is not a check.',
    impact: 'Any renter can reject every damage claim against themselves — the deposit-protection system becomes worthless for owners.',
    report: { title: 'Broken Function-Level Authorization — Renters Can Decide Damage Claims Against Themselves', severity: 'Critical', remediation: 'Require the claim\'s owner (or admin) server-side on the decide endpoint; log all decisions.' },
    guide: 'Claim 2 is Olivia\'s claim against Rita for a broken vase. Log in as Rita and POST to /claims/2/decide with decision=rejected. The claim dies — decided by the very person it was against.' },

  /* ---------------- Admin Panel ---------------- */
  { id: 'admin-bac', feature: 'Admin Panel', name: 'Admin Panel Open to Any Logged-In User', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: ['Try /admin while logged in as a plain renter.', 'The handler simply forgot the role check.', 'The full user list — emails and roles — renders for anyone with a session.'],
    lesson: 'Every privileged route needs an explicit server-side role check; "nobody will guess the URL" is not a control.',
    impact: 'Any renter can open the admin console and browse every account on the platform.',
    report: { title: 'Broken Access Control — Admin Console Accessible to Non-Admin Users', severity: 'High', remediation: 'Add a server-side admin-role gate to every /admin route.' },
    guide: 'Log in as the demo renter and open /admin. The admin console renders — it never checks your role.' },
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'CSRF on Admin User Deactivation', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['Admins can deactivate users with a POST. No token protects it.', 'An admin browsing a malicious page while logged in is enough.', 'POST /admin/users/<id>/deactivate from a foreign origin with no site marker.'],
    lesson: 'Admin actions are the most dangerous CSRF targets; they need tokens and re-confirmation for destructive operations.',
    impact: 'One booby-trapped page could deactivate the platform\'s owners and staff — a denial of service against the whole marketplace.',
    report: { title: 'Missing CSRF Protection on Administrative User Deactivation', severity: 'High', remediation: 'Require per-session CSRF tokens on all admin state changes; add confirmation for destructive actions.' },
    guide: 'Send the deactivation POST for a user from a foreign Origin (or without the site\'s origin marker) using an admin-capable session. The user is deactivated — no CSRF token exists.' },

  /* ---------------- Platform & API ---------------- */
  { id: 'plat-debug', feature: 'Platform & API', name: 'Unauthenticated Debug Endpoint Exposes All Accounts', owasp: 'A05:2021 – Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Developers leave helpers behind. Try /api/debug.', 'No login is needed at all.', 'The JSON includes every user — with passwords.'],
    lesson: 'Debug/diagnostic endpoints must never ship to production; if they must exist, they need auth and must never include secrets.',
    impact: 'The entire platform\'s credentials — admin included — are one unauthenticated request away. Game over.',
    report: { title: 'Debug Endpoint Exposes User Accounts Including Plaintext Passwords Without Authentication', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; never store or return plaintext passwords.' },
    guide: 'Open /api/debug in a browser with no session at all. It dumps every user account including passwords as JSON.' }
];

/* ----------------------------- Seed data --------------------------- *
 * Everything below is invented demo data for local training only.   */
let users = [
  { id: 1, email: 'admin@hexarent.local',   password: 'admin123',  name: 'Platform Admin', role: 'admin' },
  { id: 2, email: 'olivia@hexarent.local',  password: 'owner123',  name: 'Olivia Owner',   role: 'owner' },
  { id: 3, email: 'marcus@hexarent.local',  password: 'owner123',  name: 'Marcus Owner',   role: 'owner' },
  { id: 4, email: 'agent@hexarent.local',   password: 'agent123',  name: 'Andy Agent',     role: 'agent' },
  { id: 5, email: 'renter@hexarent.local',  password: 'renter123', name: 'Rita Renter',    role: 'renter' },
  { id: 6, email: 'tom@hexarent.local',     password: 'tom123',    name: 'Tom Renter',     role: 'renter' }
];
let listings = [
  { id: 1, ownerUserId: 2, title: 'Sunny Beach Apartment',   type: 'Property',  location: "Cox's Bazar",   dailyRate: 120, deposit: 300, status: 'published' },
  { id: 2, ownerUserId: 3, title: 'City Studio Flat',        type: 'Property',  location: 'Dhaka',         dailyRate: 60,  deposit: 150, status: 'published' },
  { id: 3, ownerUserId: 2, title: 'Canon DSLR Camera Kit',   type: 'Equipment', location: 'Dhaka',         dailyRate: 25,  deposit: 200, status: 'published' },
  { id: 4, ownerUserId: 3, title: 'Mountain Villa Retreat',  type: 'Property',  location: 'Bandarban',     dailyRate: 200, deposit: 500, status: 'draft' }
];
let bookings = [
  { id: 1, listingId: 1, renterUserId: 5, start: '2026-11-10', end: '2026-11-12', totalPrice: 360, deposit: 300, status: 'confirmed' },
  { id: 2, listingId: 1, renterUserId: 6, start: '2026-11-13', end: '2026-11-14', totalPrice: 240, deposit: 300, status: 'confirmed' },
  { id: 3, listingId: 2, renterUserId: 5, start: '2026-11-20', end: '2026-11-21', totalPrice: 120, deposit: 150, status: 'confirmed' },
  { id: 4, listingId: 3, renterUserId: 6, start: '2026-11-05', end: '2026-11-06', totalPrice: 50,  deposit: 200, status: 'completed' }
];
let invoices = [
  { id: 1, bookingId: 1, amount: 660, status: 'unpaid', paidAmount: 0 },
  { id: 2, bookingId: 3, amount: 270, status: 'unpaid', paidAmount: 0 },
  { id: 3, bookingId: 2, amount: 540, status: 'paid',   paidAmount: 540 }
];
let payouts = [
  { id: 1, ownerUserId: 2, amount: 480, status: 'paid',    period: 'October 2026' },
  { id: 2, ownerUserId: 3, amount: 210, status: 'pending', period: 'October 2026' },
  { id: 3, ownerUserId: 2, amount: 150, status: 'pending', period: 'November 2026' }
];
let claims = [
  { id: 1, bookingId: 4, renterUserId: 6, ownerUserId: 2, item: 'Camera lens scratch', amount: 120, status: 'pending' },
  { id: 2, bookingId: 1, renterUserId: 5, ownerUserId: 2, item: 'Broken vase',         amount: 40,  status: 'pending' }
];
let nextIds = { user: 7, listing: 5, booking: 5, invoice: 4, claim: 3 };

const sessions = new Map();           // sid -> userId
const failCount = {};                 // email -> consecutive failed logins
const forgotProbes = new Set();       // distinct emails probed at /forgot
const issuedTokens = {};              // email -> reset token actually issued

/* ------------------------------ Helpers ---------------------------- */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const XSS_RE = /(<script|<svg|<img|<iframe|<body|on\w+\s*=|javascript:)/i;
const SQLI_RE = /'\s*(or|and)\s+('?\w+'?\s*=\s*'?\w+'?)/i;
function hasXss(s) { return typeof s === 'string' && XSS_RE.test(s); }

const ENTRY_KEY_SHA256 = 'b9cf1c87ce4295712b9dadf5bb4c07a838b45452d9d415d762c5c5c19b6dcf9d';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */
function assembleKey(shards) {
  return shards.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}
function resetTokenFor(user) { return 'HR' + (user.id * 149 + 37); }

function totalTests() { return TESTS.length; }
function doneCount() { return TESTS.filter(t => progress.tests[t.id]).length; }
function pct() { const t = totalTests(); return t ? Math.floor(doneCount() / t * 100) : 0; }
function isComplete() { return doneCount() === totalTests(); }
function pass(id) {
  if (!progress.tests[id]) {
    progress.tests[id] = true;
    if (isComplete() && !progress.completedAt) {
      progress.completedAt = new Date().toISOString();
      progress.keyRevealed = true;
    }
    saveProgress();
  }
}
function attempt(feature) {
  progress.attempts[feature] = (progress.attempts[feature] || 0) + 1;
  saveProgress();
}
function featuresSummary() {
  const out = {};
  for (const t of TESTS) {
    if (!out[t.feature]) out[t.feature] = { total: 0, done: 0, attempts: progress.attempts[t.feature] || 0 };
    out[t.feature].total++;
    if (progress.tests[t.id]) out[t.feature].done++;
    out[t.feature].attempts = progress.attempts[t.feature] || 0;
  }
  return out;
}
function userName(id) { const u = users.find(x => x.id === id); return u ? u.name : 'User #' + id; }
function listingTitle(id) { const l = listings.find(x => x.id === id); return l ? l.title : 'Listing #' + id; }
function nights(b) {
  const d = Math.round((Date.parse(b.end) - Date.parse(b.start)) / 86400000);
  return isNaN(d) || d < 1 ? 1 : d;
}
function rangesOverlap(aStart, aEnd, bStart, bEnd) { return aStart <= bEnd && bStart <= aEnd; }

function parseCookies(req) {
  const out = {};
  const h = req.headers.cookie || '';
  for (const part of h.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function sessionUser(req) {
  const c = parseCookies(req);
  if (c.hx_session && sessions.has(c.hx_session)) {
    return users.find(u => u.id === sessions.get(c.hx_session)) || null;
  }
  return null;
}
function newSession(res, user) {
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, user.id);
  res.setHeader('Set-Cookie', [
    'hx_session=' + sid + '; Path=/; HttpOnly',
    'hx_role=' + user.role + '; Path=/',
    'hx_origin=hx; Path=/'
  ]);
}
function parseBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', ch => { data += ch; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = (req.headers['content-type'] || '');
      if (ct.includes('application/json')) {
        try { return resolve(JSON.parse(data || '{}')); } catch (e) { return resolve({}); }
      }
      const out = {};
      try {
        for (const pair of data.split('&')) {
          if (!pair) continue;
          const i = pair.indexOf('=');
          const k = decodeURIComponent(pair.slice(0, i).replace(/\+/g, ' '));
          const v = decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' '));
          out[k] = v;
        }
      } catch (e) { /* malformed body -> empty object, never crash */ }
      resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}
/* CSRF proof per spec: a state change arrives without the site's own
 * origin marker (every genuine form on this site includes _origin=hx). */
function isCsrf(req, body) {
  const origin = req.headers.origin || req.headers.referer || '';
  const foreign = origin && !/127\.0\.0\.1:3087|localhost:3087/.test(origin);
  return foreign || !body || body._origin !== 'hx';
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }

/* ------------------------------ UI --------------------------------- */
function progressBar() {
  const d = doneCount(), t = totalTests(), p = pct();
  return '<div style="background:#23232f;border-radius:8px;padding:8px 12px;margin:10px 0">' +
    '<div style="font-size:13px;color:#cfcfe0">LAB ' + LAB_NUMBER + ' · ' + d + '/' + t + ' tests · ' + p + '%</div>' +
    '<div style="background:#3a3a4d;border-radius:5px;height:10px;margin-top:5px"><div style="background:#7c5cff;height:10px;border-radius:5px;width:' + p + '%"></div></div></div>';
}
function chatWidget() {
  return '<div id="hxchat" style="position:fixed;right:14px;bottom:14px;width:300px;background:#1d1d29;border:1px solid #444;border-radius:10px;color:#eee;font-family:Arial;z-index:50">' +
    '<div style="padding:8px 12px;background:#7c5cff;border-radius:10px 10px 0 0;font-weight:bold">Lab Coach</div>' +
    '<div id="hxlog" style="height:170px;overflow:auto;padding:8px;font-size:13px"></div>' +
    '<div style="display:flex"><input id="hxin" style="flex:1;padding:7px;background:#11111a;color:#eee;border:1px solid #444" placeholder="Ask the coach…">' +
    '<button onclick="hxsend()" style="padding:7px 12px;background:#7c5cff;color:#fff;border:0">Send</button></div></div>' +
    '<script>async function hxsend(){var i=document.getElementById("hxin"),l=document.getElementById("hxlog");var m=i.value.trim();if(!m)return;i.value="";l.innerHTML+="<div><b>You:</b> "+m.replace(/</g,"&lt;")+"</div>";try{var r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:m})});var j=await r.json();l.innerHTML+="<div style=\\"margin:4px 0\\"><b>Coach:</b> "+(j.reply||"").replace(/</g,"&lt;")+"</div>";}catch(e){l.innerHTML+="<div><b>Coach:</b> I could not answer just now.</div>";}l.scrollTop=l.scrollHeight;}' +
    'document.getElementById("hxin").addEventListener("keydown",function(e){if(e.key==="Enter")hxsend();});</script>';
}
function layout(user, title, bodyHtml) {
  const nav = user
    ? '<nav style="margin:8px 0;font-size:14px"><a href="/">Dashboard</a> · <a href="/search">Browse Listings</a> · <a href="/bookings">My Bookings</a> · <a href="/invoices">Invoices</a> · <a href="/claims">Damage Claims</a> · <a href="/owner">Owner Console</a> · <a href="/tests">Mission Board</a> · <a href="/profile">Profile</a> · <a href="/logout">Logout</a></nav>'
    : '<nav style="margin:8px 0;font-size:14px"><a href="/login">Login</a> · <a href="/register">Register</a> · <a href="/tests">Mission Board</a></nav>';
  // NOTE (intentional flaw): the greeting renders the display name UNESCAPED (stored-XSS vector).
  const greet = user ? '<div style="font-size:14px">Signed in as <b>' + user.name + '</b> (' + esc(user.role) + ')</div>' : '';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + ' · LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</title></head>' +
    '<body style="margin:0;background:#14141d;font-family:Arial,sans-serif;color:#222"><div style="max-width:860px;margin:24px auto;background:#fff;border-radius:12px;padding:24px 28px">' +
    '<div style="display:flex;align-items:center;gap:12px"><img src="/logo.png" style="height:44px"><h2 style="margin:0">LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h2></div>' +
    progressBar() + nav + greet + bodyHtml + '</div>' + chatWidget() + '</body></html>';
}
function gatePage(msg) {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' · Locked</title></head>' +
    '<body style="margin:0;background:#14141d;font-family:Arial,sans-serif"><div style="max-width:520px;margin:60px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:28px;text-align:center">' +
    '<img src="/logo.png" style="height:56px"><h2>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h2>' +
    '<p>This lab is locked. Paste the completion key from Lab ' + PREV_LAB + ' to start.</p>' +
    (msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/unlock"><input name="key" style="padding:9px;width:80%" placeholder="Completion key from Lab ' + PREV_LAB + '"><br><br>' +
    '<button style="padding:10px 22px">Unlock LAB ' + LAB_NUMBER + '</button></form></div>' + chatWidget() + '</body></html>';
}
function loginPage(msg) {
  return layout(null, 'Login',
    '<h3>Login</h3>' + (msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/login"><label>Email<br><input name="email" style="padding:8px;width:60%"></label><br><br>' +
    '<label>Password<br><input name="password" type="password" style="padding:8px;width:60%"></label><br><br>' +
    '<button style="padding:9px 20px">Login</button></form>' +
    '<p><a href="/forgot">Forgot password?</a> · <a href="/register">Create an account</a></p>' +
    '<div style="background:#fff8e1;border:1px solid #e0c97f;border-radius:8px;padding:10px 14px;font-size:14px"><b>Demo renter account</b><br>Email: renter@hexarent.local<br>Password: renter123</div>');
}
function registerPage(msg) {
  return layout(null, 'Register',
    '<h3>Create an account</h3>' + (msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/register"><label>Full name<br><input name="name" style="padding:8px;width:60%"></label><br><br>' +
    '<label>Email<br><input name="email" style="padding:8px;width:60%"></label><br><br>' +
    '<label>Password<br><input name="password" type="password" style="padding:8px;width:60%"></label><br><br>' +
    '<input type="hidden" name="_origin" value="hx"><button style="padding:9px 20px">Register</button></form>');
}
function forgotPage(msg) {
  return layout(null, 'Forgot password',
    '<h3>Forgot password</h3>' + (msg ? '<p>' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/forgot"><label>Email<br><input name="email" style="padding:8px;width:60%"></label><br><br>' +
    '<button style="padding:9px 20px">Send reset link</button></form><p><a href="/login">Back to login</a></p>');
}
function resetPage(email, msg) {
  return layout(null, 'Reset password',
    '<h3>Reset password</h3>' + (msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/reset"><input type="hidden" name="email" value="' + esc(email) + '">' +
    '<label>Reset token<br><input name="token" style="padding:8px;width:60%"></label><br><br>' +
    '<label>New password<br><input name="newpassword" type="password" style="padding:8px;width:60%"></label><br><br>' +
    '<button style="padding:9px 20px">Set new password</button></form>');
}
function dashboardPage(user) {
  let mine = '';
  if (user.role === 'renter') {
    const list = bookings.filter(b => b.renterUserId === user.id);
    mine = '<h4>Your rentals</h4>' + (list.length
      ? '<ul>' + list.map(b => '<li><a href="/bookings/' + b.id + '">' + esc(listingTitle(b.listingId)) + ' — ' + esc(b.start) + ' → ' + esc(b.end) + '</a> (' + esc(b.status) + ')</li>').join('') + '</ul>'
      : '<p>No bookings yet.</p>');
  } else if (user.role === 'owner') {
    mine = '<p>Your listings: ' + listings.filter(l => l.ownerUserId === user.id).length + ' · Bookings on your listings: ' + bookings.filter(b => { const l = listings.find(x => x.id === b.listingId); return l && l.ownerUserId === user.id; }).length + '</p>';
  } else {
    mine = '<p>Platform today: ' + bookings.filter(b => b.status === 'confirmed').length + ' confirmed bookings · ' + listings.filter(l => l.status === 'published').length + ' published listings.</p>';
  }
  return layout(user, 'Dashboard', '<h3>Welcome to HexaRent</h3><p>Rent properties and equipment by the day — or list your own and earn.</p>' + mine +
    '<p>Training: open the <a href="/tests">Mission Board</a> to see the security tests for this lab.</p>');
}
function searchPage(user, q, results) {
  // NOTE (intentional flaw): the search term is reflected UNESCAPED in the heading.
  const heading = q !== null && q !== undefined ? '<h3>Results for ' + q + '</h3>' : '<h3>Browse listings</h3>';
  const list = results.map(l => '<li><a href="/listings/' + l.id + '">' + esc(l.title) + '</a> — ' + esc(l.type) + ' · ' + esc(l.location) + ' · <b>$' + l.dailyRate + '/day</b> · deposit $' + l.deposit + (l.status === 'draft' ? ' · <i>(draft)</i>' : '') + '</li>').join('');
  return layout(user, 'Search',
    '<h3>Find a rental</h3><form method="GET" action="/search"><input name="q" style="padding:8px;width:55%" placeholder="Search properties & equipment…"> <button style="padding:8px 16px">Search</button></form>' +
    heading + (results.length ? '<ul>' + list + '</ul>' : '<p>No listings matched.</p>'));
}
function listingDetailPage(user, l) {
  const days = 3;
  const edit = user.id === l.ownerUserId
    ? '<h4>Edit this listing (owner)</h4><form method="POST" action="/listings/' + l.id + '/edit"><input type="hidden" name="_origin" value="hx">' +
      '<label>Daily rate ($)<br><input name="dailyRate" value="' + l.dailyRate + '" style="padding:8px"></label><br><br>' +
      '<label>Deposit ($)<br><input name="deposit" value="' + l.deposit + '" style="padding:8px"></label><br><br>' +
      '<label>Title<br><input name="title" value="' + esc(l.title) + '" style="padding:8px;width:60%"></label><br><br><button>Save listing</button></form>' : '';
  const book = '<h4>Book this rental</h4><form method="POST" action="/bookings/book"><input type="hidden" name="_origin" value="hx">' +
    '<input type="hidden" name="listingId" value="' + l.id + '">' +
    '<label>Start date<br><input name="start" value="2026-11-15" style="padding:8px"></label><br><br>' +
    '<label>End date<br><input name="end" value="2026-11-17" style="padding:8px"></label><br><br>' +
    '<label>Total price ($) — ' + days + ' nights × $' + l.dailyRate + '<br><input name="totalPrice" value="' + (days * l.dailyRate) + '" style="padding:8px"></label><br><br>' +
    '<label>Security deposit ($)<br><input name="depositAmount" value="' + l.deposit + '" style="padding:8px"></label><br><br>' +
    '<button style="padding:9px 20px">Confirm booking</button></form>';
  return layout(user, l.title,
    '<h3>' + esc(l.title) + '</h3><p><b>Type:</b> ' + esc(l.type) + '<br><b>Location:</b> ' + esc(l.location) +
    '<br><b>Owner:</b> ' + esc(userName(l.ownerUserId)) + '<br><b>Daily rate:</b> $' + l.dailyRate + '<br><b>Security deposit:</b> $' + l.deposit +
    '<br><b>Status:</b> ' + esc(l.status) + '</p>' + edit + book +
    '<p><a href="/search">Back to listings</a></p>');
}
function bookingsPage(user) {
  const list = user.role === 'renter' ? bookings.filter(b => b.renterUserId === user.id)
    : user.role === 'owner' ? bookings.filter(b => { const l = listings.find(x => x.id === b.listingId); return l && l.ownerUserId === user.id; })
    : bookings;
  return layout(user, 'Bookings', '<h3>Bookings</h3><ul>' +
    list.map(b => '<li><a href="/bookings/' + b.id + '">Booking #' + b.id + ' — ' + esc(listingTitle(b.listingId)) + ', ' + esc(b.start) + ' → ' + esc(b.end) + '</a> ($' + b.totalPrice + ' · ' + esc(b.status) + ')</li>').join('') +
    '</ul>');
}
function bookingDetailPage(user, b) {
  const inv = invoices.find(i => i.bookingId === b.id);
  return layout(user, 'Booking #' + b.id,
    '<h3>Booking #' + b.id + '</h3><p><b>Listing:</b> ' + esc(listingTitle(b.listingId)) + '<br><b>Renter:</b> ' + esc(userName(b.renterUserId)) +
    '<br><b>Dates:</b> ' + esc(b.start) + ' → ' + esc(b.end) + ' (' + nights(b) + ' nights)<br><b>Total price:</b> $' + b.totalPrice +
    '<br><b>Deposit held:</b> $' + b.deposit + '<br><b>Status:</b> ' + esc(b.status) + '</p>' +
    (inv ? '<p><a href="/invoices/' + inv.id + '">View invoice #' + inv.id + ' ($' + inv.amount + ')</a></p>' : '') +
    '<h4>Extend this rental</h4><form method="POST" action="/bookings/' + b.id + '/extend"><input type="hidden" name="_origin" value="hx">' +
    '<label>New end date<br><input name="newEnd" value="' + esc(b.end) + '" style="padding:8px"></label><br><br><button>Extend booking</button></form>' +
    '<p><a href="/bookings">Back to bookings</a></p>');
}
function invoicesPage(user) {
  const mine = invoices.filter(i => {
    const b = bookings.find(x => x.id === i.bookingId);
    if (!b) return false;
    if (user.role === 'admin' || user.role === 'agent') return true;
    return b.renterUserId === user.id;
  });
  return layout(user, 'Invoices', '<h3>Invoices</h3><ul>' +
    mine.map(i => '<li><a href="/invoices/' + i.id + '">Invoice #' + i.id + ' — booking #' + i.bookingId + ': $' + i.amount + '</a> (' + esc(i.status) + ')</li>').join('') + '</ul>');
}
function invoiceDetailPage(user, inv) {
  const pay = inv.status !== 'paid'
    ? '<form method="POST" action="/invoices/' + inv.id + '/pay"><input type="hidden" name="_origin" value="hx">' +
      '<label>Amount to pay ($)<br><input name="amount" value="' + inv.amount + '" style="padding:8px"></label><br><br><button>Pay now</button></form>' : '<p>Paid in full.</p>';
  return layout(user, 'Invoice #' + inv.id,
    '<h3>Invoice #' + inv.id + '</h3><p><b>Booking:</b> #' + inv.bookingId + '<br><b>Amount:</b> $' + inv.amount +
    '<br><b>Status:</b> ' + esc(inv.status) + '<br><b>Paid so far:</b> $' + inv.paidAmount + '</p>' + pay);
}
function claimsPage(user) {
  const list = user.role === 'renter' ? claims.filter(c => c.renterUserId === user.id)
    : user.role === 'owner' ? claims.filter(c => c.ownerUserId === user.id) : claims;
  return layout(user, 'Damage Claims', '<h3>Damage Claims</h3><ul>' +
    list.map(c => '<li><a href="/claims/' + c.id + '">Claim #' + c.id + ' — ' + esc(c.item) + ' ($' + c.amount + ')</a> (' + esc(c.status) + ')</li>').join('') + '</ul>');
}
function claimDetailPage(user, c) {
  const decide = (user.role === 'owner' || user.role === 'admin')
    ? '<h4>Decide this claim (owner)</h4><form method="POST" action="/claims/' + c.id + '/decide"><input type="hidden" name="_origin" value="hx">' +
      '<label><input type="radio" name="decision" value="approved" checked> Approve</label> ' +
      '<label><input type="radio" name="decision" value="rejected"> Reject</label><br><br><button>Submit decision</button></form>' : '';
  return layout(user, 'Claim #' + c.id,
    '<h3>Damage Claim #' + c.id + '</h3><p><b>Booking:</b> #' + c.bookingId + ' (' + esc(listingTitle((bookings.find(b => b.id === c.bookingId) || {}).listingId)) + ')<br><b>Renter:</b> ' + esc(userName(c.renterUserId)) +
    '<br><b>Owner:</b> ' + esc(userName(c.ownerUserId)) + '<br><b>Item:</b> ' + esc(c.item) + '<br><b>Amount claimed:</b> $' + c.amount +
    '<br><b>Status:</b> ' + esc(c.status) + '</p>' + decide + '<p><a href="/claims">Back to claims</a></p>');
}
function payoutDetailPage(user, p) {
  return layout(user, 'Payout #' + p.id,
    '<h3>Payout #' + p.id + '</h3><p><b>Owner:</b> ' + esc(userName(p.ownerUserId)) + '<br><b>Amount:</b> $' + p.amount +
    '<br><b>Period:</b> ' + esc(p.period) + '<br><b>Status:</b> ' + esc(p.status) + '</p>' +
    '<p>Payouts are released to the owner\'s bank account on file.</p><p><a href="/owner">Back to owner console</a></p>');
}
function ownerPage(user) {
  const mine = listings.filter(l => l.ownerUserId === user.id);
  const myPayouts = payouts.filter(p => p.ownerUserId === user.id);
  return layout(user, 'Owner Console', '<h3>Owner Console</h3><h4>Your listings</h4><ul>' +
    mine.map(l => '<li><a href="/listings/' + l.id + '">' + esc(l.title) + '</a> — $' + l.dailyRate + '/day (' + esc(l.status) + ')</li>').join('') + '</ul>' +
    '<h4>Your payouts</h4><ul>' +
    myPayouts.map(p => '<li><a href="/payouts/' + p.id + '">Payout #' + p.id + ' — $' + p.amount + ' (' + esc(p.period) + ')</a> · ' + esc(p.status) + '</li>').join('') + '</ul>' +
    '<p>All payouts on the platform: ' + payouts.map(p => '<a href="/payouts/' + p.id + '">#' + p.id + '</a>').join(' ') + '</p>');
}
function profilePage(user, msg) {
  return layout(user, 'Profile', '<h3>Your profile</h3>' + (msg ? '<p>' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/profile"><input type="hidden" name="_origin" value="hx">' +
    '<label>Display name<br><input name="name" value="' + esc(user.name) + '" style="padding:8px;width:60%"></label><br><br>' +
    '<label>Phone<br><input name="phone" style="padding:8px;width:60%"></label><br><br><button>Save profile</button></form>');
}
function adminPage(user) {
  // NOTE (intentional flaw): user names rendered UNESCAPED in the admin list.
  return layout(user, 'Admin Panel', '<h3>Admin Panel — Users</h3><table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Action</th></tr>' +
    users.map(u => '<tr><td>' + u.id + '</td><td>' + u.name + '</td><td>' + esc(u.email) + '</td><td>' + esc(u.role) + '</td>' +
      '<td><form method="POST" action="/admin/users/' + u.id + '/deactivate"><input type="hidden" name="_origin" value="hx"><button>Deactivate</button></form></td></tr>').join('') + '</table>');
}
function testsPage(user) {
  const fs2 = featuresSummary();
  let html = '<h3>Mission Board — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h3><p>' + doneCount() + ' of ' + totalTests() + ' tests complete (' + pct() + '%).</p>';
  for (const fname of Object.keys(fs2)) {
    html += '<h4>' + esc(fname) + ' — ' + fs2[fname].done + '/' + fs2[fname].total + ' done · attempts: ' + fs2[fname].attempts + '</h4>';
    for (const t of TESTS.filter(x => x.feature === fname)) {
      const done = progress.tests[t.id];
      html += '<div style="border:1px solid #ddd;border-radius:8px;padding:10px 14px;margin:8px 0"><b>' + (done ? '✓' : '○') + ' ' + esc(t.name) + '</b> ' +
        '<span style="color:#666">(' + esc(t.owasp) + ' · ' + esc(t.difficulty) + ')</span>' +
        t.hints.map((h, i) => '<details><summary>Hint ' + (i + 1) + '</summary><p>' + esc(h) + '</p></details>').join('') + '</div>';
    }
  }
  if (isComplete()) html += '<p><b>Lab complete!</b> Open your <a href="/complete">completion summary</a> and <a href="/certificate">certificate</a>.</p>';
  return layout(user, 'Mission Board', html);
}
function completePage(user) {
  if (!isComplete()) {
    const left = TESTS.filter(t => !progress.tests[t.id]);
    return layout(user, 'Completion', '<h3>Not complete yet</h3><p>' + doneCount() + '/' + totalTests() + ' tests done (' + pct() + '%). Remaining:</p><ul>' +
      left.map(t => '<li>' + esc(t.name) + ' (' + esc(t.feature) + ')</li>').join('') + '</ul>');
  }
  const fs2 = featuresSummary();
  const key = assembleKey(COMPLETION_SHARDS);
  let html = '<h3>Lab Complete — Summary</h3>';
  html += '<h4>1) Features in this lab</h4><p>' + Object.keys(fs2).length + ' features.</p>';
  html += '<h4>2) Vulnerabilities per feature</h4><ul>' + Object.keys(fs2).map(f => '<li>' + esc(f) + ': ' + fs2[f].total + '</li>').join('') + '</ul>';
  html += '<h4>3) How testing was done (' + totalTests() + ' tests)</h4><ul>' + TESTS.map(t => '<li>' + esc(t.name) + ' — ' + esc(t.owasp) + '</li>').join('') + '</ul>';
  html += '<h4>4) What you learned</h4><ul>' + TESTS.map(t => '<li>' + esc(t.lesson) + '</li>').join('') + '</ul>';
  html += '<h4>5) What this means for a real client</h4><ul>' + TESTS.map(t => '<li>' + esc(t.impact) + '</li>').join('') + '</ul>';
  html += '<h4>6) Writing it in a real report</h4><ul>' + TESTS.map(t => '<li><b>' + esc(t.report.title) + '</b> — Severity: ' + esc(t.report.severity) + ' — Remediation: ' + esc(t.report.remediation) + '</li>').join('') + '</ul>';
  html += '<h4>Your completion key</h4><p style="font-size:18px"><code>' + esc(key) + '</code></p><p>Paste this key into Lab ' + (LAB_NUMBER + 1) + ' to unlock it.</p>';
  html += '<form method="POST" action="/complete/name"><label>Your name for the certificate<br><input name="testerName" value="' + esc(progress.testerName || (user ? user.name : '')) + '" style="padding:8px;width:60%"></label><br><br><button>Save name</button></form>';
  html += '<p><a href="/certificate">View your certificate</a></p>';
  return layout(user, 'Completion Summary', html);
}
function certificatePage(user) {
  if (!isComplete()) return null;
  const name = progress.testerName || (user ? user.name : 'Tester');
  const date = progress.completedAt ? progress.completedAt.slice(0, 10) : '';
  const fcount = Object.keys(featuresSummary()).length;
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ' + LAB_NUMBER + '</title></head>' +
    '<body style="margin:0;background:#eee;font-family:Georgia,serif"><div style="max-width:720px;margin:40px auto;background:#fff;border:3px solid #7c5cff;border-radius:14px;padding:36px;text-align:center">' +
    '<img src="/logo.png" style="height:64px"><h2>Certificate of Completion</h2>' +
    '<p>This certifies that</p><h3>' + esc(name) + '</h3>' +
    '<p>has completed 100% of the security tests in LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' (' + totalTests() + ' tests across ' + fcount + ' features)</p>' +
    '<p>Completed on ' + esc(date) + '</p><p style="margin-top:24px"><b>HexaCyberLab</b> — Built by Md. Jony Hassain, Founder</p></div></body></html>';
}

/* ----------------------------- Chatbot ----------------------------- */
const FEATURE_KEYS = {
  'Login & Authentication': ['login', 'authentication', 'auth', 'password', 'brute', 'reset', 'cookie', 'session', 'owner console'],
  'Registration & Profile': ['register', 'registration', 'profile', 'sign up', 'signup', 'account'],
  'Bookings': ['booking', 'book', 'rent', 'extend', 'deposit', 'unavailable', 'double'],
  'Listings Management': ['manage', 'edit listing', 'listing price', 'edit'],
  'Search & Listings': ['search', 'listing', 'browse', 'catalogue', 'catalog'],
  'Owner Payouts': ['payout'],
  'Invoices & Payments': ['invoice', 'payment', 'pay', 'bill'],
  'Damage Claims': ['claim', 'damage', 'refund'],
  'Admin Panel': ['admin'],
  'Platform & API': ['debug', 'api', 'platform']
};
function matchFeature(msg) {
  const m = msg.toLowerCase();
  for (const f of Object.keys(FEATURE_KEYS)) {
    if (m.includes(f.toLowerCase())) return f;
    if (FEATURE_KEYS[f].some(k => m.includes(k))) return f;
  }
  return null;
}
function chatReply(raw) {
  const msg = String(raw || '');
  const m = msg.toLowerCase();
  if (/who (built|made|created|developed)|founder|jony|hexacyberlab/.test(m)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (/key|unlock next|next lab/.test(m)) {
    if (isComplete() && progress.keyRevealed) {
      return 'You completed LAB ' + LAB_NUMBER + ' — here is your completion key: ' + assembleKey(COMPLETION_SHARDS) + ' — paste it into Lab ' + (LAB_NUMBER + 1) + ' to unlock it.';
    }
    return 'I do not have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at ' + pct() + '%. Finish all ' + totalTests() + ' tests and ask me again.';
  }
  const feature = matchFeature(msg);
  const howto = /how|guide|step|solve|help me|exploit|bypass|walkthrough|trick/.test(m);
  if (howto && feature) {
    const tries = progress.attempts[feature] || 0;
    const open = TESTS.filter(t => t.feature === feature && !progress.tests[t.id]);
    if (tries >= 3 || open.length === 0) {
      if (open.length === 0) return 'You have already completed every test in ' + feature + '. Great work!';
      return 'Step by step for ' + feature + ':\n' + open.map(t => '• ' + t.name + ' — ' + t.guide).join('\n');
    }
    return 'That feature is locked for help. First try the ' + feature + ' tests yourself at least 3 times — I can see you\'ve tried ' + tries + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  if (/how many|count|list|which tests|features|vulnerabilit/.test(m)) {
    if (feature) {
      const list = TESTS.filter(t => t.feature === feature);
      return feature + ' has ' + list.length + ' tests: ' + list.map(t => t.name).join('; ') + '. (The map is public — the step-by-step help unlocks after 3 tries on the feature.)';
    }
    const fs2 = featuresSummary();
    return 'This lab has ' + Object.keys(fs2).length + ' features and ' + totalTests() + ' tests: ' +
      Object.keys(fs2).map(f => f + ' (' + fs2[f].total + ')').join(', ') + '. Open /tests for the full mission board.';
  }
  if (/progress|next|status|score|left/.test(m)) {
    const next = TESTS.find(t => !progress.tests[t.id]);
    return 'Your progress: ' + doneCount() + '/' + totalTests() + ' tests (' + pct() + '%).' +
      (next ? ' Next open test: ' + next.name + ' (' + next.feature + '). Try it a few times, then ask me how if you get stuck.' : ' The lab is complete — see /complete for your summary and key.');
  }
  if (/hi|hello|hey|start/.test(m)) {
    return 'Hello! I am the Lab Coach for LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '. This lab has ' + totalTests() + ' tests across ' + Object.keys(featuresSummary()).length + ' features. Open /tests to see them, try each one yourself, and ask me for step-by-step help after 3 tries on a feature.';
  }
  return 'I can help with this lab: ask me how many tests a feature has, what your progress is, or — after you have tried a feature at least 3 times — ask "how do I solve the ' + (TESTS[0].feature) + ' tests" and I will guide you step by step. The full map is on /tests.';
}

/* ------------------------------------------------------------------ *
 * Completion key — stored ONLY as encoded shards (region 2 of 2).
 * Assembled only once the lab reaches 100% (/complete, /certificate,
 * and the coach's unlocked knowledge).
 * ------------------------------------------------------------------ */
const COMPLETION_SHARDS = ["TC1YSA==","SS05Nw==","SFdFVg==","LVpNWQ==","VVRFMg==","WENMRg=="];

/* ------------------------------ Router ----------------------------- */
async function route(req, res) {
  const u = new URL(req.url, 'http://127.0.0.1:3087');
  const p = u.pathname;
  const method = req.method;

  if (p === '/logo.png') {
    try { const data = fs.readFileSync(LOGO_FILE); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(data); }
    catch (e) { return send(res, 404, 'logo not found', 'text/plain'); }
  }
  if (p === '/api/progress' && method === 'GET') {
    return send(res, 200, JSON.stringify({ lab: LAB_NAME, number: LAB_NUMBER, total: totalTests(), done: doneCount(), pct: pct(), features: featuresSummary(), complete: isComplete() }, null, 2), 'application/json');
  }
  if (p === '/api/chat' && method === 'POST') {
    const body = await parseBody(req);
    let reply;
    try { reply = chatReply(body.message); } catch (e) { reply = 'I hit a snag answering that — try asking about a feature, your progress, or who built these labs.'; }
    return send(res, 200, JSON.stringify({ reply }), 'application/json');
  }
  if (p === '/unlock' && method === 'POST') {
    const body = await parseBody(req);
    if (entryKeyMatches(String(body.key || ''))) {
      progress.unlocked = true; saveProgress();
      return redirect(res, '/');
    }
    return send(res, 403, gatePage('Incorrect key — the lab stays locked.'));
  }
  /* -------- Lock gate: everything else waits until unlocked -------- */
  if (!progress.unlocked) return send(res, 200, gatePage());

  if (p === '/tests' && method === 'GET') return send(res, 200, testsPage(sessionUser(req)));
  if (p === '/complete' && method === 'GET') return send(res, 200, completePage(sessionUser(req)));
  if (p === '/complete/name' && method === 'POST') {
    const body = await parseBody(req);
    progress.testerName = String(body.testerName || '').slice(0, 60); saveProgress();
    return redirect(res, '/complete');
  }
  if (p === '/certificate' && method === 'GET') {
    const page = certificatePage(sessionUser(req));
    if (!page) return redirect(res, '/complete');
    return send(res, 200, page);
  }
  if (p === '/api/debug' && method === 'GET') {
    attempt('Platform & API'); pass('plat-debug');
    return send(res, 200, JSON.stringify({ debug: true, users: users.map(x => ({ id: x.id, email: x.email, password: x.password, role: x.role })) }, null, 2), 'application/json');
  }

  /* --------------------------- Auth pages --------------------------- */
  if (p === '/login' && method === 'GET') return send(res, 200, loginPage());
  if (p === '/login' && method === 'POST') {
    const body = await parseBody(req);
    attempt('Login & Authentication');
    const email = String(body.email || ''), password = String(body.password || '');
    if (SQLI_RE.test(email) || SQLI_RE.test(password)) {
      newSession(res, users[0]);
      pass('auth-sqli');
      return redirect(res, '/');
    }
    const user = users.find(x => x.email === email);
    if (!user || user.password !== password || user.active === false) {
      if (email) {
        failCount[email] = (failCount[email] || 0) + 1;
        if (failCount[email] >= 10) pass('auth-brute');
      }
      return send(res, 200, loginPage('Invalid email or password.'));
    }
    failCount[email] = 0;
    newSession(res, user);
    if (email === 'renter@hexarent.local' && password === 'renter123') pass('auth-default');
    return redirect(res, '/');
  }
  if (p === '/logout') {
    const c = parseCookies(req);
    if (c.hx_session) sessions.delete(c.hx_session);
    res.setHeader('Set-Cookie', ['hx_session=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0']);
    return redirect(res, '/login');
  }
  if (p === '/register' && method === 'GET') return send(res, 200, registerPage());
  if (p === '/register' && method === 'POST') {
    const body = await parseBody(req);
    attempt('Registration & Profile');
    const email = String(body.email || '').trim();
    if (!email || users.some(x => x.email === email)) return send(res, 200, registerPage('Please choose a different email.'));
    const role = body.role ? String(body.role) : 'renter';
    const nu = { id: nextIds.user++, email, password: String(body.password || ''), name: String(body.name || 'New User'), role };
    users.push(nu);
    if (String(body.password || '').length === 1) pass('reg-weak');
    if (body.role && role !== 'renter') pass('reg-mass');
    if (hasXss(nu.name)) pass('reg-xss');
    newSession(res, nu);
    return redirect(res, '/');
  }
  if (p === '/forgot' && method === 'GET') return send(res, 200, forgotPage());
  if (p === '/forgot' && method === 'POST') {
    const body = await parseBody(req);
    attempt('Login & Authentication');
    const email = String(body.email || '').trim();
    if (email) forgotProbes.add(email);
    if (forgotProbes.size >= 5) pass('auth-enum');
    const user = users.find(x => x.email === email);
    if (user) {
      issuedTokens[email] = resetTokenFor(user);
      return send(res, 200, forgotPage('Reset link sent — check your inbox. (Demo inbox: your token is ' + issuedTokens[email] + ' — use it on the reset page.)'));
    }
    return send(res, 200, forgotPage('No account exists for that email address.'));
  }
  if (p === '/reset' && method === 'GET') return send(res, 200, resetPage(u.searchParams.get('email') || ''));
  if (p === '/reset' && method === 'POST') {
    const body = await parseBody(req);
    attempt('Login & Authentication');
    const user = users.find(x => x.email === String(body.email || ''));
    if (!user) return send(res, 200, resetPage('', 'Unknown account.'));
    if (String(body.token || '') === resetTokenFor(user)) {
      if (issuedTokens[user.email] !== String(body.token || '')) pass('auth-reset');
      user.password = String(body.newpassword || 'changed123');
      delete issuedTokens[user.email];
      return send(res, 200, loginPage('Password updated — please log in.'));
    }
    return send(res, 200, resetPage(user.email, 'That reset token is not valid.'));
  }

  /* --------------------- Everything below needs login --------------- */
  const user = sessionUser(req);
  if (!user) return redirect(res, '/login');

  if (p === '/' && method === 'GET') return send(res, 200, dashboardPage(user));
  if (p === '/profile' && method === 'GET') return send(res, 200, profilePage(user));
  if (p === '/profile' && method === 'POST') {
    const body = await parseBody(req);
    attempt('Registration & Profile');
    if (body.name) { user.name = String(body.name); if (hasXss(user.name)) pass('reg-xss'); }
    if (isCsrf(req, body)) pass('reg-csrf');
    return send(res, 200, profilePage(user, 'Profile saved.'));
  }
  if (p === '/owner' && method === 'GET') {
    attempt('Login & Authentication');
    const cookies = parseCookies(req);
    const effective = cookies.hx_role || user.role;
    if (['owner', 'agent', 'admin'].includes(effective)) {
      if (user.role === 'renter' && cookies.hx_role && cookies.hx_role !== user.role) pass('auth-cookie');
      return send(res, 200, ownerPage(user));
    }
    return send(res, 403, layout(user, 'Owner Console', '<h3>403 — Owners only.</h3>'));
  }

  /* --------------------------- Search & listings -------------------- */
  if (p === '/search' && method === 'GET') {
    attempt('Search & Listings');
    const q = u.searchParams.get('q');
    if (q !== null && SQLI_RE.test(q)) {
      pass('search-sqli');
      return send(res, 200, searchPage(user, q, listings.slice()));
    }
    if (q !== null && hasXss(q)) pass('search-xss');
    const results = listings.filter(l => l.status === 'published' && (q === null || q === '' ||
      (l.title + ' ' + l.location + ' ' + l.type).toLowerCase().includes(q.toLowerCase())));
    return send(res, 200, searchPage(user, q, results));
  }
  const mList = p.match(/^\/listings\/(\d+)$/);
  if (mList && method === 'GET') {
    const l = listings.find(x => x.id === Number(mList[1]));
    if (!l) return send(res, 404, layout(user, 'Not found', '<h3>Listing not found.</h3>'));
    return send(res, 200, listingDetailPage(user, l));
  }
  const mListEdit = p.match(/^\/listings\/(\d+)\/edit$/);
  if (mListEdit && method === 'POST') {
    const body = await parseBody(req);
    attempt('Listings Management');
    const l = listings.find(x => x.id === Number(mListEdit[1]));
    if (l) {
      if (body.dailyRate !== undefined && body.dailyRate !== '') l.dailyRate = parseFloat(body.dailyRate) || l.dailyRate;
      if (body.deposit !== undefined && body.deposit !== '') l.deposit = parseFloat(body.deposit) || l.deposit;
      if (body.title) l.title = String(body.title);
      if (user.id !== l.ownerUserId && user.role !== 'admin') pass('list-edit');
    }
    return redirect(res, '/listings/' + mListEdit[1]);
  }

  /* ------------------------------ Bookings -------------------------- */
  if (p === '/bookings' && method === 'GET') return send(res, 200, bookingsPage(user));
  if (p === '/bookings/book' && method === 'POST') {
    const body = await parseBody(req);
    attempt('Bookings');
    const l = listings.find(x => x.id === (parseInt(body.listingId, 10) || 0));
    if (!l) return redirect(res, '/search');
    const start = String(body.start || '2026-11-15'), end = String(body.end || '2026-11-17');
    const dcount = Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 86400000) || 1);
    const realTotal = dcount * l.dailyRate;
    const realDeposit = l.deposit;
    // INTENTIONAL FLAWS: total price and deposit are trusted from the request.
    const totalPrice = body.totalPrice !== undefined && body.totalPrice !== '' ? parseFloat(body.totalPrice) : realTotal;
    const deposit = body.depositAmount !== undefined && body.depositAmount !== '' ? parseFloat(body.depositAmount) : realDeposit;
    const overlap = bookings.some(b => b.listingId === l.id && b.status !== 'cancelled' && rangesOverlap(start, end, b.start, b.end));
    const nb = { id: nextIds.booking++, listingId: l.id, renterUserId: user.id, start, end, totalPrice, deposit, status: 'confirmed' };
    bookings.push(nb);
    invoices.push({ id: nextIds.invoice++, bookingId: nb.id, amount: (isNaN(totalPrice) ? realTotal : totalPrice) + (isNaN(deposit) ? realDeposit : deposit), status: 'unpaid', paidAmount: 0 });
    if (!isNaN(totalPrice) && totalPrice < realTotal) pass('book-ratetamper');
    if (!isNaN(deposit) && deposit < realDeposit) pass('book-deposit');
    if (overlap) pass('book-unavailable');
    return redirect(res, '/bookings/' + nb.id);
  }
  const mBook = p.match(/^\/bookings\/(\d+)$/);
  if (mBook && method === 'GET') {
    attempt('Bookings');
    const b = bookings.find(x => x.id === Number(mBook[1]));
    if (!b) return send(res, 404, layout(user, 'Not found', '<h3>Booking not found.</h3>'));
    const l = listings.find(x => x.id === b.listingId);
    const isParty = user.role === 'admin' || user.role === 'agent' || b.renterUserId === user.id || (l && l.ownerUserId === user.id);
    if (!isParty) pass('book-idor');
    return send(res, 200, bookingDetailPage(user, b));
  }
  const mExtend = p.match(/^\/bookings\/(\d+)\/extend$/);
  if (mExtend && method === 'POST') {
    const body = await parseBody(req);
    attempt('Bookings');
    const b = bookings.find(x => x.id === Number(mExtend[1]));
    if (b && body.newEnd && String(body.newEnd) > b.end) {
      // INTENTIONAL FLAW: extension is granted with no re-pricing and no new charge.
      b.end = String(body.newEnd);
      pass('book-extend');
    }
    return redirect(res, '/bookings/' + mExtend[1]);
  }

  /* ------------------------------ Invoices -------------------------- */
  if (p === '/invoices' && method === 'GET') return send(res, 200, invoicesPage(user));
  const mInv = p.match(/^\/invoices\/(\d+)$/);
  if (mInv && method === 'GET') {
    attempt('Invoices & Payments');
    const inv = invoices.find(x => x.id === Number(mInv[1]));
    if (!inv) return send(res, 404, layout(user, 'Not found', '<h3>Invoice not found.</h3>'));
    const b = bookings.find(x => x.id === inv.bookingId);
    const l = b ? listings.find(x => x.id === b.listingId) : null;
    const isParty = user.role === 'admin' || user.role === 'agent' || (b && b.renterUserId === user.id) || (l && l.ownerUserId === user.id);
    if (!isParty) pass('inv-idor');
    return send(res, 200, invoiceDetailPage(user, inv));
  }
  const mPay = p.match(/^\/invoices\/(\d+)\/pay$/);
  if (mPay && method === 'POST') {
    const body = await parseBody(req);
    attempt('Invoices & Payments');
    const inv = invoices.find(x => x.id === Number(mPay[1]));
    if (inv) {
      const amt = parseFloat(body.amount);
      if (!isNaN(amt) && amt > 0) {
        inv.paidAmount = amt;
        inv.status = 'paid'; // intentional flaw: any positive amount settles the invoice in full
        if (amt < inv.amount) pass('inv-tamper');
      }
    }
    return redirect(res, '/invoices/' + mPay[1]);
  }

  /* ------------------------------ Payouts --------------------------- */
  const mPayout = p.match(/^\/payouts\/(\d+)$/);
  if (mPayout && method === 'GET') {
    attempt('Owner Payouts');
    const po = payouts.find(x => x.id === Number(mPayout[1]));
    if (!po) return send(res, 404, layout(user, 'Not found', '<h3>Payout not found.</h3>'));
    if (user.role !== 'admin' && user.role !== 'agent' && po.ownerUserId !== user.id) pass('payout-idor');
    return send(res, 200, payoutDetailPage(user, po));
  }

  /* --------------------------- Damage claims ------------------------ */
  if (p === '/claims' && method === 'GET') return send(res, 200, claimsPage(user));
  const mClaim = p.match(/^\/claims\/(\d+)$/);
  if (mClaim && method === 'GET') {
    attempt('Damage Claims');
    const c = claims.find(x => x.id === Number(mClaim[1]));
    if (!c) return send(res, 404, layout(user, 'Not found', '<h3>Claim not found.</h3>'));
    const isParty = user.role === 'admin' || user.role === 'agent' || c.renterUserId === user.id || c.ownerUserId === user.id;
    if (!isParty) pass('claim-idor');
    return send(res, 200, claimDetailPage(user, c));
  }
  const mDecide = p.match(/^\/claims\/(\d+)\/decide$/);
  if (mDecide && method === 'POST') {
    const body = await parseBody(req);
    attempt('Damage Claims');
    const c = claims.find(x => x.id === Number(mDecide[1]));
    if (c) {
      // INTENTIONAL FLAW: the decide endpoint never verifies that the caller
      // is the claim's owner — even the renter the claim is against can decide it.
      c.status = body.decision === 'approved' ? 'approved' : 'rejected';
      if (user.id === c.renterUserId) pass('claim-self');
    }
    return redirect(res, '/claims/' + mDecide[1]);
  }

  /* ------------------------------- Admin ---------------------------- */
  if (p === '/admin' && method === 'GET') {
    attempt('Admin Panel');
    if (user.role !== 'admin') pass('admin-bac');
    return send(res, 200, adminPage(user));
  }
  const mDeact = p.match(/^\/admin\/users\/(\d+)\/deactivate$/);
  if (mDeact && method === 'POST') {
    const body = await parseBody(req);
    attempt('Admin Panel');
    const t = users.find(x => x.id === Number(mDeact[1]));
    if (t) {
      t.active = false;
      if (isCsrf(req, body)) pass('admin-csrf');
    }
    return redirect(res, '/admin');
  }

  return send(res, 404, layout(user, 'Not found', '<h3>404 — page not found.</h3>'));
}

const server = http.createServer((req, res) => {
  route(req, res).catch(() => { try { send(res, 500, 'Internal error', 'text/plain'); } catch (e) {} });
});
server.listen(PORT, HOST, () => {
  console.log('LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' listening on http://' + HOST + ':' + PORT);
});
