'use strict';
/*
 * HexaBilling — LAB 48 of 110 (Category 5: Finance, Payments & Insurance)
 * A complete recurring-billing platform (business accounts, subscription plans,
 * customers, invoices, usage metering, coupons, payment methods) built as a
 * LOCAL-ONLY, intentionally vulnerable training lab.
 *
 * Zero-dependency Node.js. Binds 127.0.0.1:3057 only. Never deploy publicly.
 * Built by Md. Jony Hassain, Founder of HexaCyberLab.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB_NUMBER = 48;
const LAB_NAME = 'HexaBilling';
const PORT = 3057;
const HOST = '127.0.0.1';
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const LOGO_FILE = path.join(DIR, 'logo.png');

/* ------------------------------------------------------------------ *
 * Billing catalogue constants (plan prices in USD / month).
 * ------------------------------------------------------------------ */
const PLANS = {
  starter: { label: 'Starter', price: 29,  seatsIncluded: 3,  maxSeats: 5 },
  growth:  { label: 'Growth',  price: 79,  seatsIncluded: 10, maxSeats: 25 },
  scale:   { label: 'Scale',   price: 199, seatsIncluded: 25, maxSeats: 200 }
};
const SEAT_PRICE = 8; // per extra seat / month

/* Opaque config fragments (routing table salts — do not reorder). */
const _cfgA = ["TC1YSA==", "My04NA==", "RDZLSw=="];
const _cfgB = ["TC1YSA==", "Vi05NA==", "WUZSTA=="];

/* ------------------------------------------------------------------ *
 * Progress state (persisted to progress.json — generated runtime state)
 * ------------------------------------------------------------------ */
let progress = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      progress = Object.assign(progress, raw);
    }
  } catch (e) { /* corrupted state file -> start fresh */ }
}
function saveProgress() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2)); } catch (e) {}
}

/* ------------------------------------------------------------------ *
 * TESTS registry — the scored vulnerability tests of this lab.
 * Every test completes ONLY via a server-side detection hook that fires
 * when the real exploit effect happens. Never by a checkbox.
 * ------------------------------------------------------------------ */
const TESTS = [
  // ---- Login & Authentication ----
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass (legacy SSO route)', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login form talks to a legacy SSO endpoint that builds its query by string concatenation.', "Try a classic tautology in the email field, e.g. something with ' OR '1'='1.", "Submit email: admin@hexabilling.local' OR '1'='1' -- with any password — you land in the platform admin account."],
    lesson: 'String-built SQL queries let an attacker rewrite the login logic itself and walk in as any account, including the platform admin.',
    impact: 'On a real billing platform this is total compromise on day one: every business account, every invoice and every stored payment method is exposed.',
    report: { title: 'SQL Injection in Authentication (Legacy SSO Login)', severity: 'Critical', remediation: 'Use parameterised queries everywhere and retire the legacy string-concatenation login path.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limit or Lockout', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Pick one account and just keep guessing wrong passwords.', 'Notice the 10th, 20th, 50th wrong guess is answered exactly like the first — nothing slows down.', 'Submit 10+ failed logins for demo@hexabilling.local — the app processes every one; automated guessing would run forever.'],
    lesson: 'Without throttling or lockout, password guessing is free and unlimited — weak passwords fall to patience, not skill.',
    impact: 'Attackers can credential-stuff or brute-force your customers\u2019 billing accounts and pivot into invoices and payment data.',
    report: { title: 'Missing Brute-Force Protection on Login', severity: 'High', remediation: 'Add progressive rate limiting, account lockout and alerting on repeated failed logins.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User Enumeration via Login & Password-Reset Responses', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the error message for an email that exists vs one that does not.', 'Do the same comparison on the Forgot Password page.', 'Existing email + wrong password says "Incorrect password"; a made-up email says "No account found" — that difference is an account oracle.'],
    lesson: 'Different error messages for "no such user" and "wrong password" hand attackers a free list of valid accounts to target.',
    impact: 'Attackers first harvest which of your customers have accounts, then aim phishing and password attacks only at real targets.',
    report: { title: 'Account Enumeration via Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic "invalid email or password" message and identical reset responses for all inputs.' } },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Default Platform Admin Credentials', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['The platform admin account was seeded at install time and never rotated.', 'Vendor defaults are the first thing attackers try: think admin@ plus the most obvious password of all.', 'Log in as admin@hexabilling.local with password admin123 — the install-time default still works.'],
    lesson: 'Default credentials are public knowledge. An unrotated install password is an open door with the vendor\u2019s name on it.',
    impact: 'Anyone on the internet can try vendor defaults; on a billing platform that means the master account guarding all customer billing data.',
    report: { title: 'Default Credentials on Platform Administrator Account', severity: 'Critical', remediation: 'Force a unique admin password at first setup and disable or rotate all seeded credentials.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a reset for your own account and study the token format.', 'The token is derived from the account by a simple arithmetic formula on its numeric id — no randomness at all.', 'Tokens look like RST-(id*137+42). Compute one for another user\u2019s id and post it to /reset with a new password.'],
    lesson: 'Reset tokens must be unguessable secrets. A formula based on a public identifier lets anyone reset anyone\u2019s password.',
    impact: 'Full account takeover of any customer — including business owners — without touching their inbox.',
    report: { title: 'Predictable Password Reset Token Allows Account Takeover', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), store them hashed, single-use and short-lived.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Session Role Cookie Tampering', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After login, inspect the cookies the app sets — one of them repeats your role back to the server.', 'The /admin gate trusts that client-supplied cookie instead of the server-side session.', 'Set the hx_role cookie to admin in your browser and open /admin — the gate believes you.'],
    lesson: 'Authorization data stored on the client is attacker-controlled. Roles must live server-side, in the session.',
    impact: 'Any logged-in customer can promote themselves to platform admin and read or suspend every business on the platform.',
    report: { title: 'Privilege Escalation via Client-Side Role Cookie', severity: 'High', remediation: 'Never trust client-supplied role claims; resolve authorization from the server-side session on every request.' } },

  // ---- Registration & Profile ----
  { id: 'reg-massassign', feature: 'Registration & Profile', name: 'Mass Assignment — Self-Assign Admin Role at Signup', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration handler copies the whole submitted object onto the new account.', 'Add a field the form never shows — the one that controls privilege.', 'Register with an extra field role=admin in the POST body: the new account is created as a platform admin.'],
    lesson: 'Binding request bodies straight onto data models lets attackers set fields the UI never offered — role, tier, balance.',
    impact: 'Attackers mint themselves admin accounts on your SaaS from the public signup form — no exploit tooling required.',
    report: { title: 'Mass Assignment in Registration Allows Admin Self-Creation', severity: 'Critical', remediation: 'Whitelist assignable fields on every endpoint; never bind role/tier fields from client input.' } },
  { id: 'reg-weakpw', feature: 'Registration & Profile', name: 'Weak Password Policy (1-Character Passwords)', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['How short a password will registration accept? Try shorter and shorter.', 'There is no length or complexity check at all.', 'Register an account with the password "x" — it is accepted and can log in.'],
    lesson: 'A password policy is a security control: without a minimum, users (and attackers creating accounts) choose trivially guessable secrets.',
    impact: 'Weak customer passwords fall instantly to guessing, especially combined with unlimited login attempts.',
    report: { title: 'No Minimum Password Strength Enforced', severity: 'Medium', remediation: 'Enforce ≥10 characters, screen against breached-password lists, and encourage passphrases.' } },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in Business Display Name', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Your business name is shown to platform staff in the admin console — is it escaped there?', 'Put an HTML/JS payload where a name goes and view it from another account.', 'Set the business display name (Profile) to <script>alert(1)</script> — it is stored and rendered raw in the admin business list.'],
    lesson: 'Any field rendered in someone else\u2019s browser is code, not text, unless it is output-encoded. Admin views are the highest-value target.',
    impact: 'A customer can run script in your support team\u2019s browser — session theft and admin actions performed by the victim\u2019s own browser.',
    report: { title: 'Stored Cross-Site Scripting via Business Display Name', severity: 'High', remediation: 'Contextually output-encode all user data and add a Content-Security-Policy header.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Profile changes are accepted from a plain POST with no anti-CSRF token.', 'A form on any other website can submit it, riding your logged-in session.', 'While logged in, submit the /profile form from a page with Origin https://evil.example — the change is applied anyway.'],
    lesson: 'State-changing requests need an unguessable token the attacker\u2019s site cannot know; cookies alone prove nothing about intent.',
    impact: 'A malicious link can silently change a customer\u2019s billing contact details — the first step of invoice-redirection fraud.',
    report: { title: 'Cross-Site Request Forgery on Profile Update', severity: 'Medium', remediation: 'Require per-session CSRF tokens on all state-changing requests and validate Origin/Referer.' } },

  // ---- Subscriptions & Plans ----
  { id: 'sub-upgrade-free', feature: 'Subscriptions & Plans', name: 'Plan Upgrade Without Payment', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['The upgrade flow trusts the amount the client sends to decide whether payment is needed.', 'What happens if the amount you submit is zero?', 'POST /subscription/upgrade with plan=scale and amount=0 — the business is upgraded to Scale instantly, no invoice, no payment.'],
    lesson: 'Payment decisions must be computed server-side from the catalogue. If the client names the price, the price is zero.',
    impact: 'Customers help themselves to your most expensive tier for free — direct revenue loss that scales with every user who notices.',
    report: { title: 'Subscription Upgrade Applied Without Payment Verification', severity: 'High', remediation: 'Compute upgrade charges server-side and apply plan changes only after a confirmed payment event.' } },
  { id: 'sub-proration', feature: 'Subscriptions & Plans', name: 'Proration Credit Manipulation', owasp: 'A04:2021 Insecure Design', difficulty: 'Advanced',
    hints: ['Mid-cycle plan changes grant a proration credit — check who calculates it.', 'The change-plan endpoint accepts a prorationCredit field from the client and applies it verbatim.', 'POST /subscription/change with plan=growth and prorationCredit=9000 — your account credit jumps by exactly $9,000.'],
    lesson: 'Money values derived from client input are donations. Credits, refunds and proration must be computed from server-side facts only.',
    impact: 'Attackers mint unlimited account credit and never pay for the service again — silent, compounding revenue leakage.',
    report: { title: 'Client-Supplied Proration Credit Applied to Account Balance', severity: 'High', remediation: 'Calculate proration server-side from plan prices and cycle dates; ignore all client-supplied money fields.' } },
  { id: 'sub-trial', feature: 'Subscriptions & Plans', name: 'Trial Extension Abuse', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['Trials are meant to last 14 days. Look for an endpoint that moves the trial end date.', 'The extend endpoint accepts any number of days, as often as you like.', 'POST /subscription/trial/extend with days=365 — the free trial now runs for over a year.'],
    lesson: 'Trial rules are business logic, and business logic needs server-side limits like any other input validation.',
    impact: 'Free-forever accounts: users run production workloads on endless trials and the business never converts them.',
    report: { title: 'Unbounded Trial Extension Allows Indefinite Free Use', severity: 'Medium', remediation: 'Fix trial length server-side, allow at most one trial per business, and require payment method upfront.' } },
  { id: 'sub-seats', feature: 'Subscriptions & Plans', name: 'Seat Count Tampering (Negative Seats)', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Per-seat billing multiplies seats by the seat price — what if seats are negative?', 'The seats endpoint validates nothing about the number you send.', 'POST /subscription/seats with seats=-5 — the count is stored and the monthly bill drops below the plan price.'],
    lesson: 'Quantities are money in disguise. Range-check every numeric input that feeds a price calculation.',
    impact: 'Customers shrink or negate their bill by editing a number the server should never have trusted.',
    report: { title: 'Missing Range Validation on Seat Count Enables Billing Manipulation', severity: 'Medium', remediation: 'Validate seats as an integer within plan limits server-side before applying billing changes.' } },

  // ---- Coupons ----
  { id: 'coupon-stack', feature: 'Coupons', name: 'Coupon Stacking on One Invoice', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['The marketing intent is one coupon per invoice. Check what the apply endpoint enforces.', 'Apply a second, different coupon code to the same invoice.', 'Apply SAVE20 to an open invoice, then apply WELCOME10 to the same invoice — both discounts are deducted.'],
    lesson: 'Discount rules are business invariants: "one coupon per order" must be enforced on the server, not described in the UI.',
    impact: 'Combined promotions quietly multiply — margin disappears on every stacked invoice and spreads by word of mouth.',
    report: { title: 'Multiple Coupons Can Be Stacked on a Single Invoice', severity: 'Medium', remediation: 'Enforce a single active coupon per invoice server-side and reject further applications.' } },
  { id: 'coupon-reuse', feature: 'Coupons', name: 'Single-Use Coupon Reuse', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['ONETIME50 is marked single-use. Find out whether redemption is actually recorded against the invoice.', 'Redeem it on one invoice — then try the same code on a second invoice.', 'ONETIME50 applies successfully to two different invoices; the redemption counter is never checked.'],
    lesson: 'A "single-use" flag that the redemption path never reads is decoration. Usage must be checked and recorded atomically.',
    impact: 'A one-off goodwill or win-back coupon becomes a permanent 50% discount for anyone it leaks to.',
    report: { title: 'Single-Use Coupon Can Be Redeemed Multiple Times', severity: 'Medium', remediation: 'Record redemptions transactionally and reject codes whose single-use budget is exhausted.' } },
  { id: 'coupon-over', feature: 'Coupons', name: 'Over-100% Coupon Creates Negative Invoice (Credit Minting)', owasp: 'A04:2021 Insecure Design', difficulty: 'Advanced',
    hints: ['Businesses can create their own coupons. Is the percent field range-checked?', 'Create a coupon above 100% and apply it to an invoice of your own.', 'Create coupon MEGA150 with percent=150, apply it — the invoice total goes negative and turns into account credit.'],
    lesson: 'Every numeric business field needs bounds. A discount above 100% is not a discount, it is a money printer.',
    impact: 'Negative invoices convert to spendable credit — attackers manufacture balance from nothing.',
    report: { title: 'Coupon Percentage Above 100% Produces Negative Invoice Totals', severity: 'High', remediation: 'Clamp coupon percent to 1–100 at creation and floor invoice totals at zero server-side.' } },

  // ---- Usage Metering ----
  { id: 'usage-negative', feature: 'Usage Metering', name: 'Negative Usage Reporting Rewinds the Meter', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Usage-based billing adds up the quantities you report. Can a report subtract?', 'Submit a usage event with a negative quantity and watch the metered total.', 'POST /usage with metric=api_calls and quantity=-5000 — the usage total drops and so does the amount owed.'],
    lesson: 'Metering input is billing input: it must be validated (non-negative, plausible) exactly like a payment amount.',
    impact: 'Customers erase their usage bill by reporting negative consumption — pure revenue loss with a clean-looking audit trail.',
    report: { title: 'Negative Usage Quantities Accepted and Deducted from Billable Total', severity: 'High', remediation: 'Reject negative or implausible usage server-side; make usage events append-only with signed sources.' } },
  { id: 'usage-idor', feature: 'Usage Metering', name: 'Delete Another Business\u2019s Usage Records (IDOR)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Usage records are addressed by numeric id. The delete endpoint checks the session — but does it check ownership?', 'Find the id of a usage record belonging to the other business and delete it as yourself.', 'POST /usage/<id-of-pixelforge-record>/delete while logged in as Northbeam — the record is gone.'],
    lesson: 'Authentication is not authorization: every object access must verify the object belongs to the caller\u2019s tenant.',
    impact: 'A competitor-tenant can vandalise another business\u2019s billing data, destroying invoices before they are even issued.',
    report: { title: 'Insecure Direct Object Reference on Usage Record Deletion', severity: 'High', remediation: 'Scope every usage query and mutation by the caller\u2019s business id on the server.' } },

  // ---- Invoices ----
  { id: 'inv-idor', feature: 'Invoices', name: 'Invoice IDOR Across Businesses', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Your invoice URLs end in a sequential number. What stops you from opening the number next door?', 'Log in as one business and open an invoice id that belongs to the other business.', 'GET /invoices/4 while logged in as Northbeam — PixelForge\u2019s invoice renders in full, line items and totals included.'],
    lesson: 'Sequential ids plus a missing ownership check equals a full data leak — the classic multi-tenant breach.',
    impact: 'Every customer\u2019s invoices — amounts, clients, payment status — readable by any other customer with a browser.',
    report: { title: 'Broken Access Control Exposes Other Businesses\u2019 Invoices', severity: 'High', remediation: 'Filter all invoice reads by the session\u2019s business id; return 404 for foreign objects.' } },
  { id: 'inv-forge-paid', feature: 'Invoices', name: 'Invoice Status Forgery — Mark Paid Without Paying', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Invoices move draft → open → paid. Who is allowed to make the last jump?', 'Try setting the status directly instead of going through the payment flow.', 'POST /invoices/<your draft id>/status with status=paid — the invoice shows PAID with zero payments recorded.'],
    lesson: 'State transitions are privileged operations. The "paid" state must be reachable only from a verified payment event.',
    impact: 'Customers mark their own bills paid and receive service for free; accounting reconciles against fiction.',
    report: { title: 'Invoice Status Can Be Forged to Paid Without a Payment', severity: 'High', remediation: 'Restrict status transitions server-side; derive "paid" only from recorded, verified payments.' } },
  { id: 'inv-share-enum', feature: 'Invoices', name: 'Guessable Public Invoice Links (Enumeration)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    hints: ['Invoices have public share links for customers. Look at the token format.', 'The tokens are sequential — walking them walks every invoice on the platform.', 'Request /i/pub-1001, /i/pub-1002, /i/pub-1003, /i/pub-1004, /i/pub-1005 — five sequential public invoices, no login needed.'],
    lesson: 'Public links are capabilities: their tokens need the entropy of a password, because the link IS the credential.',
    impact: 'Unauthenticated attackers enumerate every invoice ever issued — a complete, silent copy of the platform\u2019s billing history.',
    report: { title: 'Predictable Public Invoice Tokens Allow Full Enumeration', severity: 'High', remediation: 'Use ≥128-bit random tokens for share links, rate-limit probing, and expire links after payment.' } },

  // ---- Customers & Payments ----
  { id: 'cust-idor', feature: 'Customers & Payments', name: 'Customer Record IDOR (Emails + Card Details)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Customer profiles sit behind the same sequential ids as everything else here.', 'Open a customer id that belongs to the other business.', 'GET /customers/3 as Northbeam — you see PixelForge\u2019s customer, their email and their stored card brand + last four digits.'],
    lesson: 'PII and payment metadata deserve the strictest tenant scoping — a customer list is a breach headline on its own.',
    impact: 'Attackers harvest names, emails and card fragments of every customer on the platform for phishing and fraud.',
    report: { title: 'Customer PII and Payment Metadata Exposed via IDOR', severity: 'High', remediation: 'Scope customer reads by business id and minimise payment data shown (brand/last4 only where needed).' } },
  { id: 'pay-idor', feature: 'Customers & Payments', name: 'Pay Your Invoice with Another Business\u2019s Card', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    hints: ['The pay endpoint accepts a payment method id. Does it check whose method it is?', 'First find the other business\u2019s payment method id (their customer/invoice views leak it), then pay your own invoice with it.', 'POST /invoices/<your invoice>/pay with paymentMethodId of PixelForge\u2019s card — the charge lands on their card, your invoice is PAID.'],
    lesson: 'A payment method is a credential. It must be bound to its owner at charge time, not just at save time.',
    impact: 'Direct financial fraud: one tenant pays its bills with another tenant\u2019s stored card.',
    report: { title: 'Stored Payment Method of Another Business Can Be Charged', severity: 'Critical', remediation: 'Verify payment-method ownership against the session business on every charge; log and alert on mismatches.' } },

  // ---- Platform & API ----
  { id: 'api-token', feature: 'Platform & API', name: 'Predictable API Key Derived from Owner Email', owasp: 'A02:2021 Cryptographic Failures', difficulty: 'Intermediate',
    hints: ['API keys on this platform are not random — they are derived from something public about the account.', 'The format is hb_ followed by the base64 of the owner\u2019s email address.', 'Compute hb_ + base64(owner@pixelforge.test) and call GET /api/invoices with it as a Bearer token — no login, full invoice list of that business.'],
    lesson: 'An API key must be a random secret. Deriving it from a public identifier makes it a username, not a password.',
    impact: 'Anyone who knows a business owner\u2019s email — public information — owns their API: invoices, customers, exports.',
    report: { title: 'API Keys Predictably Derived from Owner Email', severity: 'High', remediation: 'Issue CSPRNG API keys, store only hashes, support rotation and per-key scopes.' } },
  { id: 'platform-debug', feature: 'Platform & API', name: 'Unauthenticated Debug Dump of All Platform Data', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Leftover diagnostics endpoints are a classic. Probe the API namespace for a debug route.', 'No session is required for this one.', 'GET /api/debug returns every user, business, invoice and payment method on the platform, unauthenticated.'],
    lesson: 'Debug endpoints are production backdoors. If it exists in prod, it is part of your attack surface.',
    impact: 'One unauthenticated request exfiltrates the entire platform database — the worst-case breach in a single call.',
    report: { title: 'Unauthenticated Debug Endpoint Exposes Full Platform Dataset', severity: 'Critical', remediation: 'Remove debug/diagnostic endpoints from production builds and gate any internal tooling behind admin auth.' } }
];
const TEST_BY_ID = {};
TESTS.forEach(t => { TEST_BY_ID[t.id] = t; });
const FEATURES = [];
TESTS.forEach(t => { if (!FEATURES.includes(t.feature)) FEATURES.push(t.feature); });

function attempt(feature) {
  progress.attempts[feature] = (progress.attempts[feature] || 0) + 1;
  saveProgress();
}
function pass(testId) {
  if (!TEST_BY_ID[testId]) return;
  if (!progress.tests[testId]) {
    progress.tests[testId] = true;
    const done = Object.keys(progress.tests).length;
    if (done >= TESTS.length && !progress.completedAt) {
      progress.completedAt = new Date().toISOString();
      progress.keyRevealed = true;
    }
    saveProgress();
  }
}
function doneCount() { return TESTS.filter(t => progress.tests[t.id]).length; }
function pct() { return Math.floor(doneCount() / TESTS.length * 100); }

/* ------------------------------------------------------------------ *
 * In-memory seeded data (resets when the server restarts; the SCORED
 * progress in progress.json is what persists).
 * ------------------------------------------------------------------ */
function seed() {
  const users = [
    { id: 1, email: 'admin@hexabilling.local', password: 'admin123', name: 'Platform Admin', role: 'admin', businessId: null },
    { id: 2, email: 'owner@northbeam.test', password: 'North123!', name: 'Nora North', role: 'owner', businessId: 1 },
    { id: 3, email: 'staff@northbeam.test', password: 'Staff123!', name: 'Sam Staff', role: 'staff', businessId: 1 },
    { id: 4, email: 'owner@pixelforge.test', password: 'Pixel123!', name: 'Pete Pixel', role: 'owner', businessId: 2 },
    { id: 5, email: 'demo@hexabilling.local', password: 'demo1234', name: 'Demo User', role: 'owner', businessId: 3 }
  ];
  const businesses = [
    { id: 1, name: 'Northbeam Studio', plan: 'starter', seats: 3, creditBalance: 0, trialStart: '2026-10-01', trialEnds: '2026-10-15', status: 'trial' },
    { id: 2, name: 'PixelForge LLC', plan: 'growth', seats: 10, creditBalance: 25, trialStart: '2026-08-01', trialEnds: '2026-08-15', status: 'active' },
    { id: 3, name: 'Demo Bakery', plan: 'starter', seats: 2, creditBalance: 0, trialStart: '2026-10-10', trialEnds: '2026-10-24', status: 'trial' }
  ];
  const customers = [
    { id: 1, businessId: 1, name: 'Acme Retail', email: 'billing@acme-retail.example', cardBrand: 'Visa', cardLast4: '4242' },
    { id: 2, businessId: 1, name: 'Bluefin Yoga', email: 'pay@bluefin.example', cardBrand: 'Mastercard', cardLast4: '5105' },
    { id: 3, businessId: 2, name: 'Kite Airways', email: 'ap@kite-air.example', cardBrand: 'Visa', cardLast4: '1881' },
    { id: 4, businessId: 2, name: 'Mango Hotels', email: 'finance@mango.example', cardBrand: 'Amex', cardLast4: '0005' }
  ];
  const paymentMethods = [
    { id: 1, businessId: 1, label: 'Northbeam Visa', brand: 'Visa', last4: '4242', exp: '09/28' },
    { id: 2, businessId: 2, label: 'PixelForge Mastercard', brand: 'Mastercard', last4: '7777', exp: '03/27' },
    { id: 3, businessId: 1, label: 'Northbeam Amex', brand: 'Amex', last4: '3005', exp: '11/26' }
  ];
  const invoices = [
    { id: 1, businessId: 1, customerId: 1, number: 'INV-1001', items: [{ desc: 'Growth plan — October', qty: 1, price: 79 }], couponsApplied: [], discount: 0, status: 'paid', shareToken: 'pub-1001', payments: [{ methodId: 1, amount: 79, at: '2026-10-03' }] },
    { id: 2, businessId: 1, customerId: 2, number: 'INV-1002', items: [{ desc: 'Starter plan — October', qty: 1, price: 29 }, { desc: 'Extra seats x2', qty: 2, price: 8 }], couponsApplied: [], discount: 0, status: 'open', shareToken: 'pub-1002', payments: [] },
    { id: 3, businessId: 1, customerId: 1, number: 'INV-1003', items: [{ desc: 'Usage overage — API calls', qty: 1, price: 46 }], couponsApplied: [], discount: 0, status: 'draft', shareToken: 'pub-1003', payments: [] },
    { id: 4, businessId: 2, customerId: 3, number: 'INV-2001', items: [{ desc: 'Scale plan — October', qty: 1, price: 199 }, { desc: 'Priority support', qty: 1, price: 49 }], couponsApplied: [], discount: 0, status: 'open', shareToken: 'pub-1004', payments: [] },
    { id: 5, businessId: 2, customerId: 4, number: 'INV-2002', items: [{ desc: 'Growth plan — October', qty: 1, price: 79 }], couponsApplied: [], discount: 0, status: 'paid', shareToken: 'pub-1005', payments: [{ methodId: 2, amount: 79, at: '2026-10-05' }] },
    { id: 6, businessId: 1, customerId: 2, number: 'INV-1004', items: [{ desc: 'Starter plan — November (draft)', qty: 1, price: 29 }], couponsApplied: [], discount: 0, status: 'draft', shareToken: 'pub-1006', payments: [] }
  ];
  const usage = [
    { id: 1, businessId: 1, metric: 'api_calls', quantity: 12000, period: '2026-10' },
    { id: 2, businessId: 1, metric: 'emails_sent', quantity: 3400, period: '2026-10' },
    { id: 3, businessId: 2, metric: 'api_calls', quantity: 56000, period: '2026-10' },
    { id: 4, businessId: 2, metric: 'storage_gb', quantity: 120, period: '2026-10' }
  ];
  const coupons = [
    { id: 1, businessId: null, code: 'SAVE20', percent: 20, singleUse: false, usedOn: [] },
    { id: 2, businessId: null, code: 'WELCOME10', percent: 10, singleUse: false, usedOn: [] },
    { id: 3, businessId: null, code: 'ONETIME50', percent: 50, singleUse: true, usedOn: [] }
  ];
  return { users, businesses, customers, paymentMethods, invoices, usage, coupons,
           nextUserId: 6, nextBusinessId: 4, nextCustomerId: 5, nextInvoiceId: 7, nextUsageId: 5, nextCouponId: 4, nextMethodId: 4 };
}
let DB = seed();
const sessions = new Map(); // sid -> userId
const issuedResetTokens = new Set();
const failedLogins = {};    // email -> count (no lockout: the flaw)
const enumProbe = {};       // ip -> {existing:bool, missing:bool}
const shareProbes = [];     // {token, at}

/* More opaque config fragments (telemetry salts — do not reorder). */
const _cfgC = ["LUtGMA==", "UDE2NA==", "UlRCTA=="];
const _cfgD = ["LVNOUQ==", "WUYxUQ==", "M1NBRA=="];
function _assemble(parts) {
  return parts.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}
function entryKey() { return _assemble(_cfgA.concat(_cfgC)); }
function completionKey() { return _assemble(_cfgB.concat(_cfgD)); }

function invoiceSubtotal(inv) { return inv.items.reduce((a, it) => a + it.qty * it.price, 0); }
function invoiceTotal(inv) { return invoiceSubtotal(inv) - (inv.discount || 0); }
function apiKeyFor(user) { return 'hb_' + Buffer.from(user.email, 'utf8').toString('base64'); }
function resetTokenFor(user) { return 'RST-' + (user.id * 137 + 42); }
function businessOf(user) { return DB.businesses.find(b => b.id === user.businessId) || null; }
function monthlyBill(biz) {
  // Vulnerable by design: seats feed the price directly, so a negative seat
  // count drags the monthly bill below zero (test sub-seats).
  const plan = PLANS[biz.plan];
  return plan.price + (biz.seats - plan.seatsIncluded) * SEAT_PRICE;
}

/* ------------------------------------------------------------------ *
 * HTTP helpers
 * ------------------------------------------------------------------ */
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = (req.headers['content-type'] || '');
      if (ct.includes('application/json')) { try { return resolve(JSON.parse(data || '{}')); } catch (e) { return resolve({}); } }
      const params = new URLSearchParams(data);
      const obj = {};
      params.forEach((v, k) => { obj[k] = v; });
      resolve(obj);
    });
    req.on('error', () => resolve({}));
  });
}
function currentUser(req) {
  const sid = parseCookies(req).hx_session;
  if (!sid || !sessions.has(sid)) return null;
  return DB.users.find(u => u.id === sessions.get(sid)) || null;
}
function startSession(res, user) {
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, user.id);
  // NOTE (the vulnerability): the role is ALSO mirrored into a client cookie,
  // and the admin gate trusts that cookie. See test auth-cookie.
  res.setHeader('Set-Cookie', [
    'hx_session=' + sid + '; Path=/; HttpOnly',
    'hx_role=' + user.role + '; Path=/',
    'hx_origin=1; Path=/'
  ]);
}
function sendJson(res, code, obj) {
  const body = JSON.stringify(obj, null, 2);
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(body);
}
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }

/* esc(): used for data the app DOES escape. The business display name is
 * deliberately NOT passed through this on the admin list (test reg-xss). */
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function hasPayload(s) { return /<script|onerror\s*=|onload\s*=|<svg|<img[^>]*onerror|<iframe/i.test(String(s || '')); }

/* ------------------------------------------------------------------ *
 * Page layout — header progress bar + Lab Coach chatbot on every page
 * ------------------------------------------------------------------ */
function layout(user, title, bodyHtml) {
  const done = doneCount(), total = TESTS.length, p = pct();
  const biz = user ? businessOf(user) : null;
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>' + esc(title) + ' — HexaBilling</title><style>' +
  'body{font-family:system-ui,Segoe UI,Arial,sans-serif;margin:0;background:#0f1220;color:#e8eaf2}header{background:#171b31;padding:10px 18px;display:flex;gap:14px;align-items:center;flex-wrap:wrap;border-bottom:2px solid #2b3160}' +
  'header img{height:34px}nav a{color:#aeb6e8;margin-right:12px;text-decoration:none;font-size:14px}nav a:hover{color:#fff}' +
  '.bar{flex:1;min-width:180px;background:#232849;border-radius:8px;height:16px;position:relative;overflow:hidden}.bar i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#4f7cff,#9b5cff);display:block}' +
  '.bar span{position:relative;font-size:11px;line-height:16px;padding-left:8px;color:#fff}main{max-width:980px;margin:22px auto;padding:0 16px}' +
  '.card{background:#171b31;border:1px solid #2b3160;border-radius:12px;padding:16px 18px;margin-bottom:14px}h1{font-size:22px}h2{font-size:17px;color:#c9cf5}' +
  'table{width:100%;border-collapse:collapse;font-size:14px}td,th{padding:7px 8px;border-bottom:1px solid #2b3160;text-align:left}' +
  'input,select{padding:8px;border-radius:6px;border:1px solid #39406e;background:#0f1220;color:#e8eaf2;margin:3px 0}button,.btn{background:#4f7cff;color:#fff;border:0;padding:8px 14px;border-radius:6px;cursor:pointer;text-decoration:none;display:inline-block;font-size:14px}' +
  'button:hover,.btn:hover{background:#6a90ff}.muted{color:#9aa2c7;font-size:13px}.err{background:#4a1f2b;border:1px solid #8c3350;padding:10px;border-radius:8px}.ok{background:#1d3d2a;border:1px solid #2f7a4d;padding:10px;border-radius:8px}' +
  '#coach{position:fixed;right:14px;bottom:14px;width:320px;background:#171b31;border:1px solid #39406e;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.5);z-index:50}' +
  '#coach h3{margin:0;padding:10px 12px;font-size:14px;border-bottom:1px solid #2b3160}#coachlog{height:180px;overflow:auto;padding:10px;font-size:13px}#coachlog div{margin-bottom:8px}' +
  '#coach form{display:flex;border-top:1px solid #2b3160}#coach input{flex:1;border:0;background:#0f1220;color:#fff;padding:10px}#coach button{border-radius:0}' +
  '.pill{display:inline-block;padding:1px 8px;border-radius:10px;background:#232849;font-size:12px;margin-right:4px}</style></head><body>' +
  '<header><img src="/logo.png" alt="HexaCyberLab"><div><strong>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</strong><br><span class="muted">HexaCyberLab vulnerable lab — local use only</span></div>' +
  '<div class="bar"><i style="width:' + p + '%"></i><span>LAB ' + LAB_NUMBER + ' · ' + done + '/' + total + ' tests · ' + p + '%</span></div>' +
  (user ? '<div class="muted">' + esc(user.name) + ' · ' + esc(user.role) + (biz ? ' · ' + esc(biz.name) : '') + '</div>' : '') +
  '</header><nav style="padding:8px 18px;background:#12152a">' +
  (user ? '<a href="/">Dashboard</a><a href="/plans">Subscription & Plans</a><a href="/invoices">Invoices</a><a href="/customers">Customers</a><a href="/usage">Usage</a><a href="/coupons">Coupons</a><a href="/profile">Profile</a><a href="/admin">Admin</a>' : '<a href="/login">Login</a><a href="/register">Register</a>') +
  '<a href="/tests">Mission / Tests</a><a href="/complete">Completion</a>' + (user ? '<a href="/logout">Logout</a>' : '') + '</nav>' +
  '<main>' + bodyHtml + '</main>' +
  '<div id="coach"><h3>Lab Coach — HexaBilling</h3><div id="coachlog"><div><b>Coach:</b> Hi! I know every test in this lab. Ask me what to try, or how a feature works. How-to help unlocks after you try a feature at least 3 times yourself.</div></div>' +
  '<form id="coachform"><input id="coachmsg" placeholder="Ask the Lab Coach..." autocomplete="off"><button type="submit">Send</button></form></div>' +
  '<script>document.getElementById("coachform").addEventListener("submit",function(e){e.preventDefault();var m=document.getElementById("coachmsg");var v=m.value.trim();if(!v)return;m.value="";var log=document.getElementById("coachlog");log.innerHTML+="<div><b>You:</b> "+v.replace(/</g,"&lt;")+"</div>";fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:v})}).then(function(r){return r.json()}).then(function(d){log.innerHTML+="<div><b>Coach:</b> "+String(d.reply||"").replace(/</g,"&lt;")+"</div>";log.scrollTop=log.scrollHeight;});});</script>' +
  '</body></html>';
}
function gatePage(msg) {
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' (Locked)</title>' +
  '<style>body{font-family:system-ui,Arial,sans-serif;background:#0f1220;color:#e8eaf2;display:flex;justify-content:center;padding-top:60px}.card{background:#171b31;border:1px solid #2b3160;border-radius:12px;padding:26px;max-width:440px;text-align:center}input{padding:9px;width:88%;border-radius:6px;border:1px solid #39406e;background:#0f1220;color:#fff}button{background:#4f7cff;color:#fff;border:0;padding:9px 18px;border-radius:6px;cursor:pointer;margin-top:10px}img{height:54px}.err{color:#ff8fa5}</style></head><body>' +
  '<div class="card"><img src="/logo.png" alt="HexaCyberLab"><h1>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h1>' +
  '<p>This lab is locked. Paste the completion key from Lab ' + (LAB_NUMBER - 1) + ' to start.</p>' +
  (msg ? '<p class="err">' + esc(msg) + '</p>' : '') +
  '<form method="POST" action="/unlock"><input name="key" placeholder="Completion key from Lab ' + (LAB_NUMBER - 1) + '" autocomplete="off"><br><button type="submit">Unlock Lab ' + LAB_NUMBER + '</button></form>' +
  '<p style="color:#9aa2c7;font-size:13px">HexaCyberLab — Built by Md. Jony Hassain, Founder</p></div></body></html>';
}

/* ------------------------------------------------------------------ *
 * Lab Coach chatbot (rule-based, in-lab, no external calls)
 * ------------------------------------------------------------------ */
const FEATURE_KEYWORDS = [
  ['Login & Authentication', ['login', 'log in', 'auth', 'password', 'brute', 'reset token', 'enumeration', 'enumerate', 'sql injection login', 'sqli', 'cookie']],
  ['Registration & Profile', ['register', 'registration', 'sign up', 'signup', 'profile', 'mass assignment', 'display name']],
  ['Subscriptions & Plans', ['subscription', 'plan', 'upgrade', 'proration', 'trial', 'seat']],
  ['Coupons', ['coupon', 'discount', 'promo']],
  ['Usage Metering', ['usage', 'meter', 'metering']],
  ['Invoices', ['invoice', 'share link', 'public link', 'paid status']],
  ['Customers & Payments', ['customer', 'payment method', 'card', 'pay ']],
  ['Platform & API', ['api', 'debug', 'platform', 'api key']]
];
function findFeature(msg) {
  const m = ' ' + msg.toLowerCase() + ' ';
  for (const [f, kws] of FEATURE_KEYWORDS) { for (const kw of kws) { if (m.includes(kw)) return f; } }
  return null;
}
function chatReply(rawMsg) {
  const msg = String(rawMsg || '').slice(0, 500);
  const low = msg.toLowerCase();
  const done = doneCount(), total = TESTS.length, p = pct();
  if (/(who built|who made|who created|founder|who is jony|who developed)/.test(low)) {
    return 'These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for "Who is Md. Jony Hassain", or ask ChatGPT.';
  }
  if (/(completion key|the key|next lab.*key|key.*next lab|unlock.*key|give me the key|what is the key)/.test(low)) {
    if (progress.keyRevealed && done >= total) {
      return 'You completed 100% of LAB ' + LAB_NUMBER + ' — here is your completion key for Lab ' + (LAB_NUMBER + 1) + ': ' + completionKey() + ' — paste it into Lab ' + (LAB_NUMBER + 1) + ' to unlock it.';
    }
    return 'I don\u2019t have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at ' + p + '% (' + done + '/' + total + ' tests). Finish every test and the key will appear here and on the completion page.';
  }
  const feature = findFeature(low);
  if (/(how many|which|list|count|what tests|what vulnerabilities|vulnerabilities in|tests in)/.test(low) && feature) {
    const list = TESTS.filter(t => t.feature === feature);
    return 'The ' + feature + ' feature has ' + list.length + ' scored tests: ' + list.map(t => t.name + (progress.tests[t.id] ? ' (done)' : '')).join('; ') + '. Ask me "how do I do the ' + feature + ' tests" after you have tried them at least 3 times and I will guide you step by step.';
  }
  if (/(how|guide|steps|help me|walkthrough|hint)/.test(low) && feature) {
    const list = TESTS.filter(t => t.feature === feature);
    const att = progress.attempts[feature] || 0;
    const allPassed = list.every(t => progress.tests[t.id]);
    if (att >= 3 || allPassed) {
      let out = 'Step by step for ' + feature + ' (' + att + ' attempt(s) on record):';
      list.forEach((t, i) => { out += '\n' + (i + 1) + '. ' + t.name + ' — ' + t.hints[2]; });
      return out;
    }
    return 'That feature is locked for help. First try the ' + feature + ' tests yourself at least 3 times — I can see you\u2019ve tried ' + att + ' time(s) so far. After 3 real tries, ask me again and I\u2019ll guide you step by step.';
  }
  if (/(progress|how am i|score|percent)/.test(low)) {
    const next = TESTS.find(t => !progress.tests[t.id]);
    return 'You are at ' + p + '% — ' + done + ' of ' + total + ' tests complete in LAB ' + LAB_NUMBER + '.' + (next ? ' Next open test: "' + next.name + '" in ' + next.feature + '. Open /tests for the full mission list and hints.' : ' Everything is done — visit /complete for your debrief and key.');
  }
  if (/(hi|hello|hey|start|begin)/.test(low)) {
    return 'Welcome to LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ', a recurring-billing platform. It has ' + FEATURES.length + ' features and ' + total + ' scored security tests. Log in with a seeded account (see README), work through /tests, and try each feature yourself — after 3 real attempts on a feature I unlock step-by-step guidance for it.';
  }
  if (feature) {
    const list = TESTS.filter(t => t.feature === feature);
    const d = list.filter(t => progress.tests[t.id]).length;
    return feature + ': ' + d + '/' + list.length + ' tests done, ' + (progress.attempts[feature] || 0) + ' attempt(s) recorded. Ask "how many tests in ' + feature + '" for the list, or try the feature ' + Math.max(0, 3 - (progress.attempts[feature] || 0)) + ' more time(s) to unlock my step-by-step help.';
  }
  return 'I can help with LAB ' + LAB_NUMBER + ' (' + LAB_NAME + '): ask about a feature (' + FEATURES.join(', ') + '), your progress, or say "who built this". Remember: how-to help for a feature unlocks after 3 real attempts on it. The /tests page lists every mission with graded hints.';
}

/* ------------------------------------------------------------------ *
 * Routes
 * ------------------------------------------------------------------ */
function loginPage(msg) {
  return '<h1>Log in to HexaBilling</h1>' + (msg ? '<div class="err">' + esc(msg) + '</div>' : '') +
  '<div class="card"><form method="POST" action="/login"><label>Email<br><input name="email" size="34"></label><br><label>Password<br><input type="password" name="password" size="34"></label><br><button type="submit">Log in</button></form>' +
  '<p class="muted">Seeded accounts (see README): owner@northbeam.test / North123! · staff@northbeam.test / Staff123! · owner@pixelforge.test / Pixel123! · demo@hexabilling.local / demo1234</p>' +
  '<p><a href="/forgot" style="color:#aeb6e8">Forgot password?</a> · <a href="/register" style="color:#aeb6e8">Create an account</a></p></div>';
}

async function route(req, res) {
  const url = new URL(req.url, 'http://' + HOST + ':' + PORT);
  const p = url.pathname;
  const method = req.method;
  const cookies = parseCookies(req);

  if (p === '/logo.png') {
    try { const img = fs.readFileSync(LOGO_FILE); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(img); }
    catch (e) { res.writeHead(404); return res.end('no logo'); }
  }

  /* ---- Lock gate ---- */
  if (!progress.unlocked) {
    if (p === '/unlock' && method === 'POST') {
      const b = await readBody(req);
      const given = String(b.key || '');
      if (given === entryKey()) { progress.unlocked = true; saveProgress(); return redirect(res, '/'); }
      res.writeHead(403, { 'Content-Type': 'text/html' }); return res.end(gatePage('That key was not accepted.'));
    }
    if (p === '/api/chat' && method === 'POST') { const b = await readBody(req); return sendJson(res, 200, { reply: chatReply(b.message) }); }
    if (p === '/api/progress') return sendJson(res, 200, progressJson());
    res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(gatePage());
  }

  if (p === '/api/progress') return sendJson(res, 200, progressJson());
  if (p === '/api/chat' && method === 'POST') { const b = await readBody(req); return sendJson(res, 200, { reply: chatReply(b.message) }); }

  const user = currentUser(req);

  /* ---- Public invoice share links (no login) ---- */
  if (p.startsWith('/i/')) {
    const token = decodeURIComponent(p.slice(3));
    const nowMs = Date.now();
    shareProbes.push({ token, at: nowMs });
    const distinct = new Set(shareProbes.filter(x => nowMs - x.at < 60000).map(x => x.token));
    if (distinct.size >= 5) pass('inv-share-enum');
    attempt('Invoices');
    const inv = DB.invoices.find(i => i.shareToken === token);
    if (!inv) { res.writeHead(404, { 'Content-Type': 'text/html' }); return res.end(layout(null, 'Not found', '<div class="card"><h1>Invoice not found</h1></div>')); }
    const biz = DB.businesses.find(b => b.id === inv.businessId);
    const cust = DB.customers.find(c => c.id === inv.customerId);
    return html(res, layout(null, 'Invoice ' + inv.number, '<div class="card"><h1>Invoice ' + esc(inv.number) + '</h1><p>From: ' + esc(biz ? biz.name : '') + '<br>Bill to: ' + esc(cust ? cust.name : '') + '</p>' + invoiceTable(inv) + '<p>Status: <b>' + esc(inv.status) + '</b></p></div>'));
  }

  /* ---- Auth ---- */
  if (p === '/login' && method === 'GET') return html(res, layout(null, 'Login', loginPage()));
  if (p === '/login' && method === 'POST') {
    const b = await readBody(req);
    attempt('Login & Authentication');
    const email = String(b.email || ''), password = String(b.password || '');
    const inj = /'|--|\bor\b\s+['"\d]|\bunion\b/i;
    // Legacy SSO path: query built by string concatenation -> SQLi bypass.
    if (inj.test(email) || inj.test(password)) {
      const admin = DB.users.find(u => u.role === 'admin');
      startSession(res, admin);
      pass('auth-sqli');
      return redirect(res, '/');
    }
    const u = DB.users.find(x => x.email.toLowerCase() === email.toLowerCase());
    const ip = req.socket.remoteAddress || 'local';
    enumProbe[ip] = enumProbe[ip] || { existing: false, missing: false };
    if (!u) {
      enumProbe[ip].missing = true;
      if (enumProbe[ip].existing) pass('auth-enum');
      return html(res, layout(null, 'Login', loginPage('No account found for that email.')));
    }
    enumProbe[ip].existing = true;
    if (enumProbe[ip].missing) pass('auth-enum');
    if (u.password !== password) {
      failedLogins[u.email] = (failedLogins[u.email] || 0) + 1;
      if (failedLogins[u.email] >= 10) pass('auth-brute'); // 10th failure still processed normally: no lockout
      return html(res, layout(null, 'Login', loginPage('Incorrect password for that account.')));
    }
    if (u.email === 'admin@hexabilling.local' && password === 'admin123') pass('auth-default');
    startSession(res, u);
    return redirect(res, '/');
  }
  if (p === '/logout') {
    const sid = cookies.hx_session; if (sid) sessions.delete(sid);
    res.setHeader('Set-Cookie', ['hx_session=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0']);
    return redirect(res, '/login');
  }
  if (p === '/forgot' && method === 'GET') {
    return html(res, layout(null, 'Forgot password', '<h1>Forgot password</h1><div class="card"><form method="POST" action="/forgot"><label>Email<br><input name="email" size="34"></label><br><button type="submit">Send reset link</button></form></div>'));
  }
  if (p === '/forgot' && method === 'POST') {
    const b = await readBody(req);
    attempt('Login & Authentication');
    const u = DB.users.find(x => x.email.toLowerCase() === String(b.email || '').toLowerCase());
    const ip = req.socket.remoteAddress || 'local';
    enumProbe[ip] = enumProbe[ip] || { existing: false, missing: false };
    if (!u) {
      enumProbe[ip].missing = true; if (enumProbe[ip].existing) pass('auth-enum');
      return html(res, layout(null, 'Forgot password', '<div class="err">No account found for that email.</div>'));
    }
    enumProbe[ip].existing = true; if (enumProbe[ip].missing) pass('auth-enum');
    const tok = resetTokenFor(u);
    issuedResetTokens.add(tok);
    return html(res, layout(null, 'Forgot password', '<div class="ok">Reset link created. In a real deployment this is emailed; for the lab, open: <a style="color:#aeb6e8" href="/reset?token=' + tok + '">/reset?token=' + tok + '</a></div>'));
  }
  if (p === '/reset' && method === 'GET') {
    const tok = url.searchParams.get('token') || '';
    return html(res, layout(null, 'Reset password', '<h1>Reset password</h1><div class="card"><form method="POST" action="/reset"><input type="hidden" name="token" value="' + esc(tok) + '"><label>New password<br><input type="password" name="password" size="34"></label><br><button type="submit">Set new password</button></form></div>'));
  }
  if (p === '/reset' && method === 'POST') {
    const b = await readBody(req);
    attempt('Login & Authentication');
    const tok = String(b.token || '');
    const u = DB.users.find(x => resetTokenFor(x) === tok);
    if (!u) return html(res, layout(null, 'Reset password', '<div class="err">Invalid or expired reset token.</div>'));
    // The token is a deterministic formula of the user id: ANY correctly
    // computed token is accepted, issued or not (test auth-reset).
    if (!issuedResetTokens.has(tok)) pass('auth-reset');
    issuedResetTokens.delete(tok);
    u.password = String(b.password || 'x');
    return html(res, layout(null, 'Reset password', '<div class="ok">Password updated for ' + esc(u.email) + '. <a style="color:#aeb6e8" href="/login">Log in</a></div>'));
  }
  if (p === '/register' && method === 'GET') {
    return html(res, layout(null, 'Register', '<h1>Create your HexaBilling account</h1><div class="card"><form method="POST" action="/register"><label>Your name<br><input name="name" size="34"></label><br><label>Business name<br><input name="business" size="34"></label><br><label>Email<br><input name="email" size="34"></label><br><label>Password<br><input type="password" name="password" size="34"></label><br><button type="submit">Create account</button></form></div>'));
  }
  if (p === '/register' && method === 'POST') {
    const b = await readBody(req);
    attempt('Registration & Profile');
    const email = String(b.email || '');
    if (!email || DB.users.some(x => x.email.toLowerCase() === email.toLowerCase())) {
      return html(res, layout(null, 'Register', '<div class="err">Email missing or already registered.</div>'));
    }
    const biz = { id: DB.nextBusinessId++, name: String(b.business || 'My Business'), plan: 'starter', seats: 1, creditBalance: 0, trialStart: '2026-10-23', trialEnds: '2026-11-06', status: 'trial' };
    // Vulnerable: the whole request body is bound onto the new records
    // (mass assignment) and there is NO password policy at all.
    const nu = { id: DB.nextUserId++, email, password: String(b.password || ''), name: String(b.name || 'New User'), role: 'owner', businessId: biz.id };
    Object.keys(b).forEach(k => { if (k !== 'email' && k !== 'business' && k !== 'id' && k !== 'businessId') nu[k] = b[k]; });
    DB.businesses.push(biz); DB.users.push(nu);
    if (String(b.password || '').length < 4) pass('reg-weakpw');
    if (nu.role === 'admin') pass('reg-massassign');
    if (b.plan && PLANS[b.plan]) { biz.plan = b.plan; }
    startSession(res, nu);
    return redirect(res, '/');
  }

  if (!user) return redirect(res, '/login');
  const biz = businessOf(user);

  /* ---- Dashboard ---- */
  if (p === '/' && method === 'GET') {
    const myInv = DB.invoices.filter(i => i.businessId === biz.id);
    const usageTotal = DB.usage.filter(u => u.businessId === biz.id).reduce((a, u) => a + u.quantity, 0);
    const body = '<h1>' + esc(biz.name) + ' — Billing Dashboard</h1>' +
    '<div class="card"><h2>Subscription</h2><p>Plan: <b>' + PLANS[biz.plan].label + '</b> · Seats: <b>' + biz.seats + '</b> · Monthly bill: <b>$' + monthlyBill(biz) + '</b> · Account credit: <b>$' + biz.creditBalance + '</b><br>Status: ' + esc(biz.status) + ' · Trial: ' + esc(biz.trialStart) + ' → ' + esc(biz.trialEnds) + '</p><a class="btn" href="/plans">Manage subscription</a></div>' +
    '<div class="card"><h2>Invoices</h2><p>' + myInv.length + ' invoice(s) · <a style="color:#aeb6e8" href="/invoices">View all</a></p></div>' +
    '<div class="card"><h2>Usage this period</h2><p>Total metered units: <b>' + usageTotal + '</b> · <a style="color:#aeb6e8" href="/usage">Usage detail</a></p></div>' +
    '<div class="card"><h2>Your API key</h2><p class="muted">For the billing API (see /api/invoices):</p><code>' + esc(apiKeyFor(user)) + '</code></div>';
    return html(res, layout(user, 'Dashboard', body));
  }

  /* ---- Profile ---- */
  if (p === '/profile' && method === 'GET') {
    const methods = DB.paymentMethods.filter(m => m.businessId === biz.id);
    const body = '<h1>Profile & Business</h1><div class="card"><form method="POST" action="/profile">' +
    '<label>Your display name<br><input name="name" size="34" value="' + esc(user.name) + '"></label><br>' +
    '<label>Business display name<br><input name="businessName" size="34" value="' + esc(biz.name) + '"></label><br>' +
    '<label>Billing email<br><input name="email" size="34" value="' + esc(user.email) + '"></label><br><button type="submit">Save changes</button></form></div>' +
    '<div class="card"><h2>Payment methods on file</h2>' + methods.map(m => '<p>' + esc(m.label) + ' — ' + esc(m.brand) + ' •••• ' + esc(m.last4) + ' (exp ' + esc(m.exp) + ') <span class="muted">id ' + m.id + '</span></p>').join('') + '</div>';
    return html(res, layout(user, 'Profile', body));
  }
  if (p === '/profile' && method === 'POST') {
    const b = await readBody(req);
    attempt('Registration & Profile');
    if (b.name) user.name = String(b.name);
    if (b.email) user.email = String(b.email);
    if (b.businessName) {
      biz.name = String(b.businessName);
      if (hasPayload(b.businessName)) pass('reg-xss');
    }
    // No CSRF token anywhere in the app (test reg-csrf): a state change that
    // arrives with a foreign Origin/Referer is still applied.
    const origin = req.headers.origin || req.headers.referer || '';
    if (origin && !origin.includes(HOST + ':' + PORT)) pass('reg-csrf');
    return html(res, layout(user, 'Profile', '<div class="ok">Profile saved.</div><p><a style="color:#aeb6e8" href="/profile">Back to profile</a></p>'));
  }

  /* ---- Subscriptions & Plans ---- */
  if (p === '/plans' && method === 'GET') {
    const cards = Object.keys(PLANS).map(k => '<div class="card"><h2>' + PLANS[k].label + ' — $' + PLANS[k].price + '/mo</h2><p class="muted">Includes ' + PLANS[k].seatsIncluded + ' seats · max ' + PLANS[k].maxSeats + ' · extra seat $' + SEAT_PRICE + '/mo</p>' + (biz.plan === k ? '<p><b>Current plan</b></p>' : '<form method="POST" action="/subscription/upgrade"><input type="hidden" name="plan" value="' + k + '"><input type="hidden" name="amount" value="' + PLANS[k].price + '"><button type="submit">Upgrade to ' + PLANS[k].label + ' — pay $' + PLANS[k].price + '</button></form>') + '</div>').join('');
    const body = '<h1>Subscription & Plans</h1><div class="card"><p>Current: <b>' + PLANS[biz.plan].label + '</b> · Seats: <b>' + biz.seats + '</b> · Monthly bill: <b>$' + monthlyBill(biz) + '</b> · Credit: <b>$' + biz.creditBalance + '</b> · Trial ends: ' + esc(biz.trialEnds) + '</p>' +
    '<form method="POST" action="/subscription/seats" style="display:inline">Seats: <input name="seats" size="4" value="' + biz.seats + '"> <button type="submit">Update seats</button></form> ' +
    '<form method="POST" action="/subscription/trial/extend" style="display:inline"><input type="hidden" name="days" value="14"><button type="submit">Extend trial by 14 days</button></form></div>' + cards +
    '<div class="card"><h2>Change plan (mid-cycle)</h2><form method="POST" action="/subscription/change"><label>New plan <select name="plan">' + Object.keys(PLANS).map(k => '<option value="' + k + '">' + PLANS[k].label + '</option>').join('') + '</select></label> <button type="submit">Change plan with proration</button></form></div>';
    return html(res, layout(user, 'Plans', body));
  }
  if (p === '/subscription/upgrade' && method === 'POST') {
    const b = await readBody(req);
    attempt('Subscriptions & Plans');
    const plan = String(b.plan || '');
    if (!PLANS[plan]) return redirect(res, '/plans');
    const amount = Number(b.amount);
    // Vulnerable: the client-named amount decides whether payment is needed.
    if (!amount || amount <= 0) {
      biz.plan = plan;
      pass('sub-upgrade-free');
      return html(res, layout(user, 'Plans', '<div class="ok">Upgraded to ' + PLANS[plan].label + ' — no payment was taken.</div><p><a style="color:#aeb6e8" href="/plans">Back to plans</a></p>'));
    }
    const inv = { id: DB.nextInvoiceId++, businessId: biz.id, customerId: null, number: 'INV-' + (1000 + DB.nextInvoiceId), items: [{ desc: PLANS[plan].label + ' plan upgrade', qty: 1, price: amount }], couponsApplied: [], discount: 0, status: 'open', shareToken: 'pub-' + (1000 + DB.nextInvoiceId), payments: [] };
    DB.invoices.push(inv);
    biz.plan = plan;
    return html(res, layout(user, 'Plans', '<div class="ok">Upgrade invoice ' + inv.number + ' created for $' + amount + '. Pay it from the Invoices page.</div>'));
  }
  if (p === '/subscription/change' && method === 'POST') {
    const b = await readBody(req);
    attempt('Subscriptions & Plans');
    const plan = String(b.plan || '');
    if (PLANS[plan]) biz.plan = plan;
    // Vulnerable: a client-supplied prorationCredit is applied verbatim.
    if (b.prorationCredit !== undefined && !isNaN(Number(b.prorationCredit))) {
      biz.creditBalance += Number(b.prorationCredit);
      if (Number(b.prorationCredit) > 0) pass('sub-proration');
    } else {
      biz.creditBalance += 5; // the honest server-computed proration for a mid-cycle change
    }
    return html(res, layout(user, 'Plans', '<div class="ok">Plan changed to ' + PLANS[biz.plan].label + '. Account credit is now $' + biz.creditBalance + '.</div><p><a style="color:#aeb6e8" href="/plans">Back to plans</a></p>'));
  }
  if (p === '/subscription/trial/extend' && method === 'POST') {
    const b = await readBody(req);
    attempt('Subscriptions & Plans');
    const days = parseInt(b.days, 10) || 0;
    const end = new Date(biz.trialEnds + 'T00:00:00Z');
    end.setUTCDate(end.getUTCDate() + days);
    biz.trialEnds = end.toISOString().slice(0, 10);
    const start = new Date(biz.trialStart + 'T00:00:00Z');
    if ((end - start) / 86400000 > 30) pass('sub-trial');
    return html(res, layout(user, 'Plans', '<div class="ok">Trial extended. New trial end: ' + esc(biz.trialEnds) + '.</div><p><a style="color:#aeb6e8" href="/plans">Back to plans</a></p>'));
  }
  if (p === '/subscription/seats' && method === 'POST') {
    const b = await readBody(req);
    attempt('Subscriptions & Plans');
    const seats = parseInt(b.seats, 10);
    if (!isNaN(seats)) {
      biz.seats = seats; // no range validation at all (test sub-seats)
      if (seats < 0) pass('sub-seats');
    }
    return html(res, layout(user, 'Plans', '<div class="ok">Seats updated to ' + biz.seats + '. Monthly bill is now $' + monthlyBill(biz) + '.</div><p><a style="color:#aeb6e8" href="/plans">Back to plans</a></p>'));
  }

  /* ---- Coupons ---- */
  if (p === '/coupons' && method === 'GET') {
    const mine = DB.coupons.filter(c => c.businessId === null || c.businessId === biz.id);
    const body = '<h1>Coupons</h1><div class="card"><h2>Available coupons</h2>' +
    mine.map(c => '<p><code>' + esc(c.code) + '</code> — ' + c.percent + '% off' + (c.singleUse ? ' · single-use' : '') + ' · redeemed ' + c.usedOn.length + ' time(s)</p>').join('') + '</div>' +
    '<div class="card"><h2>Create a coupon for your customers</h2><form method="POST" action="/coupons"><label>Code <input name="code" size="14"></label> <label>Percent off <input name="percent" size="5"></label> <button type="submit">Create coupon</button></form></div>';
    return html(res, layout(user, 'Coupons', body));
  }
  if (p === '/coupons' && method === 'POST') {
    const b = await readBody(req);
    attempt('Coupons');
    const percent = Number(b.percent);
    const code = String(b.code || '').toUpperCase();
    if (!code || isNaN(percent)) return redirect(res, '/coupons');
    // Vulnerable: percent is never range-checked (test coupon-over fires when
    // such a coupon drives an invoice total negative).
    DB.coupons.push({ id: DB.nextCouponId++, businessId: biz.id, code, percent, singleUse: false, usedOn: [] });
    return html(res, layout(user, 'Coupons', '<div class="ok">Coupon ' + esc(code) + ' created at ' + percent + '% off.</div><p><a style="color:#aeb6e8" href="/coupons">Back to coupons</a></p>'));
  }

  /* ---- Usage metering ---- */
  if (p === '/usage' && method === 'GET') {
    const rows = DB.usage.map(u => { const b2 = DB.businesses.find(x => x.id === u.businessId); return '<tr><td>' + u.id + '</td><td>' + esc(b2 ? b2.name : '') + '</td><td>' + esc(u.metric) + '</td><td>' + u.quantity + '</td><td>' + esc(u.period) + '</td><td><form method="POST" action="/usage/' + u.id + '/delete"><button type="submit">Delete</button></form></td></tr>'; }).join('');
    const body = '<h1>Usage Metering</h1><div class="card"><h2>Report usage</h2><form method="POST" action="/usage"><label>Metric <input name="metric" value="api_calls"></label> <label>Quantity <input name="quantity" size="8"></label> <button type="submit">Report usage</button></form><p class="muted">Usage is billed at $0.001 per unit on your next invoice.</p></div>' +
    '<div class="card"><h2>All usage records (platform view)</h2><table><tr><th>Id</th><th>Business</th><th>Metric</th><th>Quantity</th><th>Period</th><th></th></tr>' + rows + '</table></div>';
    return html(res, layout(user, 'Usage', body));
  }
  if (p === '/usage' && method === 'POST') {
    const b = await readBody(req);
    attempt('Usage Metering');
    const qty = Number(b.quantity);
    if (isNaN(qty)) return redirect(res, '/usage');
    // Vulnerable: negative quantities are accepted and rewind the meter.
    DB.usage.push({ id: DB.nextUsageId++, businessId: biz.id, metric: String(b.metric || 'api_calls'), quantity: qty, period: '2026-10' });
    if (qty < 0) pass('usage-negative');
    return redirect(res, '/usage');
  }
  const usageDel = p.match(/^\/usage\/(\d+)\/delete$/);
  if (usageDel && method === 'POST') {
    attempt('Usage Metering');
    const rec = DB.usage.find(u => u.id === Number(usageDel[1]));
    if (rec) {
      // Vulnerable: no ownership check on delete (test usage-idor).
      if (rec.businessId !== biz.id) pass('usage-idor');
      DB.usage = DB.usage.filter(u => u.id !== rec.id);
    }
    return redirect(res, '/usage');
  }

  /* ---- Invoices ---- */
  if (p === '/invoices' && method === 'GET') {
    const rows = DB.invoices.filter(i => i.businessId === biz.id).map(i => '<tr><td><a style="color:#aeb6e8" href="/invoices/' + i.id + '">' + esc(i.number) + '</a></td><td>$' + invoiceTotal(i) + '</td><td>' + esc(i.status) + '</td><td><a style="color:#aeb6e8" href="/i/' + i.shareToken + '">public link</a></td></tr>').join('');
    return html(res, layout(user, 'Invoices', '<h1>Invoices</h1><div class="card"><table><tr><th>Number</th><th>Total</th><th>Status</th><th>Share</th></tr>' + rows + '</table></div>'));
  }
  const invMatch = p.match(/^\/invoices\/(\d+)$/);
  if (invMatch && method === 'GET') {
    attempt('Invoices');
    const inv = DB.invoices.find(i => i.id === Number(invMatch[1]));
    if (!inv) { res.writeHead(404, { 'Content-Type': 'text/html' }); return res.end(layout(user, 'Not found', '<div class="card"><h1>Invoice not found</h1></div>')); }
    // Vulnerable: no ownership check (test inv-idor).
    if (inv.businessId !== biz.id) pass('inv-idor');
    const owner = DB.businesses.find(b => b.id === inv.businessId);
    const cust = DB.customers.find(c => c.id === inv.customerId);
    const methods = DB.paymentMethods.filter(m => m.businessId === biz.id);
    const body = '<div class="card"><h1>Invoice ' + esc(inv.number) + '</h1><p>Issued by: ' + esc(owner ? owner.name : '') + '<br>Bill to: ' + esc(cust ? cust.name : '—') + '</p>' + invoiceTable(inv) +
    '<p>Status: <b>' + esc(inv.status) + '</b> · Public share link: <a style="color:#aeb6e8" href="/i/' + inv.shareToken + '">/i/' + inv.shareToken + '</a></p>' +
    '<h2>Pay this invoice</h2><form method="POST" action="/invoices/' + inv.id + '/pay"><label>Payment method id <input name="paymentMethodId" size="4" value="' + (methods[0] ? methods[0].id : '') + '"></label> <button type="submit">Pay $' + invoiceTotal(inv) + '</button></form>' +
    '<h2>Apply a coupon</h2><form method="POST" action="/invoices/' + inv.id + '/coupon"><label>Code <input name="code" size="12"></label> <button type="submit">Apply coupon</button></form>' +
    '<h2>Set status</h2><form method="POST" action="/invoices/' + inv.id + '/status"><select name="status"><option>draft</option><option>open</option><option>paid</option></select> <button type="submit">Set status</button></form></div>';
    return html(res, layout(user, 'Invoice', body));
  }
  const invStatus = p.match(/^\/invoices\/(\d+)\/status$/);
  if (invStatus && method === 'POST') {
    const b = await readBody(req);
    attempt('Invoices');
    const inv = DB.invoices.find(i => i.id === Number(invStatus[1]));
    if (inv && inv.businessId === biz.id) {
      const st = String(b.status || '');
      if (['draft', 'open', 'paid'].includes(st)) {
        inv.status = st;
        // Vulnerable: "paid" can be set directly, no payment required.
        if (st === 'paid' && inv.payments.length === 0) pass('inv-forge-paid');
      }
    }
    return redirect(res, '/invoices/' + invStatus[1]);
  }
  const invPay = p.match(/^\/invoices\/(\d+)\/pay$/);
  if (invPay && method === 'POST') {
    const b = await readBody(req);
    attempt('Customers & Payments');
    const inv = DB.invoices.find(i => i.id === Number(invPay[1]));
    const m = DB.paymentMethods.find(x => x.id === Number(b.paymentMethodId));
    if (inv && m && inv.businessId === biz.id) {
      // Vulnerable: the payment method's owner is never checked (test pay-idor).
      inv.payments.push({ methodId: m.id, amount: invoiceTotal(inv), at: '2026-10-23' });
      inv.status = 'paid';
      if (m.businessId !== biz.id) pass('pay-idor');
    }
    return redirect(res, '/invoices/' + invPay[1]);
  }
  const invCoupon = p.match(/^\/invoices\/(\d+)\/coupon$/);
  if (invCoupon && method === 'POST') {
    const b = await readBody(req);
    attempt('Coupons');
    const inv = DB.invoices.find(i => i.id === Number(invCoupon[1]));
    const code = String(b.code || '').toUpperCase();
    const c = DB.coupons.find(x => x.code === code);
    if (inv && c && inv.businessId === biz.id) {
      const alreadyHere = inv.couponsApplied.includes(c.code);
      const usedElsewhere = c.singleUse && c.usedOn.length > 0 && !c.usedOn.includes(inv.id);
      if (!alreadyHere) {
        // Vulnerable: neither stacking nor single-use redemption is enforced.
        inv.couponsApplied.push(c.code);
        inv.discount = Math.round(invoiceSubtotal(inv) * inv.couponsApplied.reduce((a, code2) => { const cc = DB.coupons.find(x => x.code === code2); return a + (cc ? cc.percent : 0); }, 0) / 100);
        c.usedOn.push(inv.id);
        if (inv.couponsApplied.length >= 2) pass('coupon-stack');
        if (usedElsewhere) pass('coupon-reuse');
        if (invoiceTotal(inv) < 0) pass('coupon-over');
      }
    }
    return redirect(res, '/invoices/' + invCoupon[1]);
  }

  /* ---- Customers ---- */
  if (p === '/customers' && method === 'GET') {
    const rows = DB.customers.filter(c => c.businessId === biz.id).map(c => '<tr><td><a style="color:#aeb6e8" href="/customers/' + c.id + '">' + esc(c.name) + '</a></td><td>' + esc(c.email) + '</td><td>' + esc(c.cardBrand) + ' •••• ' + esc(c.cardLast4) + '</td></tr>').join('');
    return html(res, layout(user, 'Customers', '<h1>Customers</h1><div class="card"><table><tr><th>Name</th><th>Email</th><th>Card on file</th></tr>' + rows + '</table></div>'));
  }
  const custMatch = p.match(/^\/customers\/(\d+)$/);
  if (custMatch && method === 'GET') {
    attempt('Customers & Payments');
    const c = DB.customers.find(x => x.id === Number(custMatch[1]));
    if (!c) { res.writeHead(404, { 'Content-Type': 'text/html' }); return res.end(layout(user, 'Not found', '<div class="card"><h1>Customer not found</h1></div>')); }
    // Vulnerable: no ownership check (test cust-idor).
    if (c.businessId !== biz.id) pass('cust-idor');
    const owner = DB.businesses.find(b => b.id === c.businessId);
    return html(res, layout(user, 'Customer', '<div class="card"><h1>' + esc(c.name) + '</h1><p>Business: ' + esc(owner ? owner.name : '') + '<br>Email: ' + esc(c.email) + '<br>Card on file: ' + esc(c.cardBrand) + ' •••• ' + esc(c.cardLast4) + '</p></div>'));
  }

  /* ---- Admin panel (gate trusts the hx_role cookie) ---- */
  if (p === '/admin' && method === 'GET') {
    const cookieRole = cookies.hx_role;
    const isAdmin = user.role === 'admin' || cookieRole === 'admin';
    if (!isAdmin) { res.writeHead(403, { 'Content-Type': 'text/html' }); return res.end(layout(user, 'Forbidden', '<div class="card"><h1>403 — Platform admins only</h1></div>')); }
    if (user.role !== 'admin' && cookieRole === 'admin') pass('auth-cookie');
    // Business names are rendered UNESCAPED here on purpose (test reg-xss).
    const rows = DB.businesses.map(b2 => '<tr><td>' + b2.id + '</td><td>' + b2.name + '</td><td>' + PLANS[b2.plan].label + '</td><td>' + b2.seats + '</td><td>$' + b2.creditBalance + '</td><td>' + esc(b2.status) + '</td></tr>').join('');
    const urows = DB.users.map(u => '<tr><td>' + u.id + '</td><td>' + esc(u.email) + '</td><td>' + esc(u.role) + '</td></tr>').join('');
    return html(res, layout(user, 'Admin', '<h1>Platform Admin</h1><div class="card"><h2>Businesses</h2><table><tr><th>Id</th><th>Business</th><th>Plan</th><th>Seats</th><th>Credit</th><th>Status</th></tr>' + rows + '</table></div><div class="card"><h2>Users</h2><table><tr><th>Id</th><th>Email</th><th>Role</th></tr>' + urows + '</table></div>'));
  }

  /* ---- API ---- */
  if (p === '/api/debug' && method === 'GET') {
    attempt('Platform & API');
    pass('platform-debug');
    return sendJson(res, 200, { debug: true, users: DB.users, businesses: DB.businesses, customers: DB.customers, paymentMethods: DB.paymentMethods, invoices: DB.invoices });
  }
  if (p === '/api/invoices' && method === 'GET') {
    attempt('Platform & API');
    const auth = req.headers.authorization || '';
    const key = auth.replace(/^Bearer\s+/i, '');
    const owner = DB.users.find(u => apiKeyFor(u) === key && u.businessId);
    if (!owner) return sendJson(res, 401, { error: 'invalid API key' });
    // The key is a public derivation of the owner's email (test api-token).
    pass('api-token');
    return sendJson(res, 200, { business: owner.businessId, invoices: DB.invoices.filter(i => i.businessId === owner.businessId) });
  }

  /* ---- Mission / tests page ---- */
  if (p === '/tests' && method === 'GET') {
    let body = '<h1>Mission — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h1><p class="muted">' + doneCount() + '/' + TESTS.length + ' tests complete · Attempts are counted per feature; the Lab Coach unlocks step-by-step help after 3 attempts on a feature.</p>';
    FEATURES.forEach(f => {
      const list = TESTS.filter(t => t.feature === f);
      body += '<div class="card"><h2>' + esc(f) + ' <span class="muted">(' + (progress.attempts[f] || 0) + ' attempt(s))</span></h2>';
      list.forEach(t => {
        body += '<p>' + (progress.tests[t.id] ? '✓' : '○') + ' <b>' + esc(t.name) + '</b> <span class="pill">' + esc(t.owasp) + '</span><span class="pill">' + esc(t.difficulty) + '</span><br><span class="muted">Hints: 1) ' + esc(t.hints[0]) + ' 2) ' + esc(t.hints[1]) + ' 3) ' + esc(t.hints[2]) + '</span></p>';
      });
      body += '</div>';
    });
    return html(res, layout(user, 'Tests', body));
  }

  /* ---- Completion + certificate ---- */
  if (p === '/complete' && method === 'GET') {
    if (doneCount() < TESTS.length) {
      return html(res, layout(user, 'Completion', '<div class="card"><h1>Not yet complete</h1><p>You are at ' + pct() + '% (' + doneCount() + '/' + TESTS.length + '). Remaining tests:</p>' + TESTS.filter(t => !progress.tests[t.id]).map(t => '<p>○ ' + esc(t.name) + ' <span class="muted">(' + esc(t.feature) + ')</span></p>').join('') + '</div>'));
    }
    const perFeature = FEATURES.map(f => { const l = TESTS.filter(t => t.feature === f); return '<tr><td>' + esc(f) + '</td><td>' + l.length + '</td></tr>'; }).join('');
    const body = '<div class="card"><h1>Lab ' + LAB_NUMBER + ' Complete — 100%</h1>' +
    '<h2>1. Total features in this lab</h2><p>' + FEATURES.length + ' features</p>' +
    '<h2>2. Vulnerability counts per feature</h2><table><tr><th>Feature</th><th>Tests</th></tr>' + perFeature + '</table>' +
    '<h2>3. Ways testing was done (' + TESTS.length + ' techniques)</h2>' + TESTS.map(t => '<p>✓ ' + esc(t.name) + ' <span class="muted">(' + esc(t.owasp) + ')</span></p>').join('') +
    '<h2>4. What you learned</h2>' + TESTS.map(t => '<p><b>' + esc(t.name) + ':</b> ' + esc(t.lesson) + '</p>').join('') +
    '<h2>5. What this means for a real client</h2>' + TESTS.map(t => '<p><b>' + esc(t.name) + ':</b> ' + esc(t.impact) + '</p>').join('') +
    '<h2>6. Writing it in a real report</h2>' + TESTS.map(t => '<p><b>' + esc(t.report.title) + '</b> — Severity: ' + esc(t.report.severity) + ' — Fix: ' + esc(t.report.remediation) + '</p>').join('') +
    '<h2>Your completion key for Lab ' + (LAB_NUMBER + 1) + '</h2><p><code style="font-size:18px">' + completionKey() + '</code></p>' +
    '<form method="POST" action="/tester-name"><label>Your name for the certificate<br><input name="name" size="30" value="' + esc(progress.testerName || user.name) + '"></label> <button type="submit">Save name</button></form>' +
    '<p><a class="btn" href="/certificate">View your certificate</a></p></div>';
    return html(res, layout(user, 'Complete', body));
  }
  if (p === '/tester-name' && method === 'POST') {
    const b = await readBody(req);
    progress.testerName = String(b.name || '').slice(0, 80);
    saveProgress();
    return redirect(res, '/complete');
  }
  if (p === '/certificate' && method === 'GET') {
    if (doneCount() < TESTS.length) return redirect(res, '/complete');
    const name = progress.testerName || user.name;
    const date = progress.completedAt ? progress.completedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
    const cert = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ' + LAB_NUMBER + '</title><style>body{font-family:Georgia,serif;background:#f4f1ea;display:flex;justify-content:center;padding:40px}.card{background:#fff;border:3px double #8a6d3b;border-radius:6px;padding:44px 54px;text-align:center;max-width:640px}img{height:64px}h1{color:#24304d;margin:10px 0}.nm{font-size:26px;color:#24304d;border-bottom:1px solid #ccc;display:inline-block;padding:0 22px 4px}@media print{body{background:#fff}}</style></head><body>' +
    '<div class="card"><img src="/logo.png" alt="HexaCyberLab"><h1>Certificate of Completion</h1><p>This certifies that</p><p class="nm">' + esc(name) + '</p>' +
    '<p>has completed 100% of the security tests in<br><b>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</b><br>(' + TESTS.length + ' tests across ' + FEATURES.length + ' features)</p>' +
    '<p>Completed on ' + esc(date) + '</p><p style="margin-top:26px"><b>HexaCyberLab</b> — Built by Md. Jony Hassain, Founder</p></div></body></html>';
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(cert);
  }

  res.writeHead(404, { 'Content-Type': 'text/html' });
  return res.end(layout(user, 'Not found', '<div class="card"><h1>404 — Not found</h1><p><a style="color:#aeb6e8" href="/">Dashboard</a></p></div>'));
}
function html(res, body) { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(body); }
function invoiceTable(inv) {
  const rows = inv.items.map(it => '<tr><td>' + esc(it.desc) + '</td><td>' + it.qty + '</td><td>$' + it.price + '</td><td>$' + (it.qty * it.price) + '</td></tr>').join('');
  return '<table><tr><th>Item</th><th>Qty</th><th>Price</th><th>Line total</th></tr>' + rows +
  '<tr><td colspan="3">Subtotal</td><td>$' + invoiceSubtotal(inv) + '</td></tr>' +
  (inv.discount ? '<tr><td colspan="3">Coupons: ' + esc(inv.couponsApplied.join(', ')) + '</td><td>-$' + inv.discount + '</td></tr>' : '') +
  '<tr><td colspan="3"><b>Total</b></td><td><b>$' + invoiceTotal(inv) + '</b></td></tr></table>';
}
function progressJson() {
  const features = {};
  FEATURES.forEach(f => {
    const list = TESTS.filter(t => t.feature === f);
    features[f] = { total: list.length, done: list.filter(t => progress.tests[t.id]).length, attempts: progress.attempts[f] || 0 };
  });
  return { lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done: doneCount(), pct: pct(), features, complete: doneCount() >= TESTS.length };
}

loadProgress();
if (require.main === module) {
  const server = http.createServer((req, res) => {
    route(req, res).catch(() => { try { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('Internal error'); } catch (e) {} });
  });
  server.listen(PORT, HOST, () => { console.log('LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ' listening on http://' + HOST + ':' + PORT); });
} else {
  module.exports = { TESTS, FEATURES };
}
