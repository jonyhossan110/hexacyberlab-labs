'use strict';
/*
 * HexaPay — LAB 41 of the HexaCyberLab lab programme.
 * A deliberately vulnerable payment-gateway training app.
 * LOCAL ONLY. Bind 127.0.0.1:3050. Zero dependencies. All money is fake seed data.
 * WARNING: every flaw in here is intentional. Never deploy publicly.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB_NUMBER = 41;
const LAB_NAME = 'HexaPay';
const PORT = 3050;
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');

/* ------------------------------------------------------------------ *
 * Key material. Each key exists ONLY as 6 shards (base64 of the
 * reversed piece), scattered in different regions of this file.
 * One assembler rebuilds a key at runtime, only at its reveal moment:
 * the entry key inside /unlock, the completion key at 100%.
 * ------------------------------------------------------------------ */

function unshard(a) {
  return a.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}
const ENTRY_KEY_SHA256 = '174e21ca33e534987c50d5ecd5b2e222d6da32b9026d0a9f868b7c0919338325';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */

/* ============================ TESTS REGISTRY ============================ */
const TESTS = [
  /* ---------------- Login & Authentication ---------------- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03:2021 – Injection', difficulty: 'Beginner',
    where: 'POST /login',
    hints: ['The gateway still runs a legacy login that builds its query by gluing your input straight into the SQL string.', 'Try a classic tautology in the email field — something that makes the WHERE clause always true.', "Use admin@hexapay.local' OR '1'='1' -- as the email and any password."],
    goal: 'Log in without knowing any real password, by injecting into the login query.',
    lesson: 'String-built SQL queries let an attacker rewrite the login check itself. Parameterised queries make the input data, never code.',
    impact: 'On a real payment gateway this is full account takeover with no password at all — the attacker lands in the first account the query returns, often an admin.',
    report: { title: 'SQL Injection in Authentication', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.' },
    guide: 'Go to /login. In the email field type: admin@hexapay.local\' OR \'1\'=\'1\' -- and any password. Submit. The legacy query becomes always-true and you are logged in as the platform admin without the password.',
    fix: 'Replace the string-built query with parameterised queries so credentials are compared as data.' },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limiting', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    where: 'POST /login',
    hints: ['Nothing slows you down when a login fails. No lockout, no delay, no CAPTCHA.', 'Script 10 wrong passwords for one account and watch every attempt get processed.', 'The 10th consecutive failure is still answered instantly — that missing throttle is the flaw.'],
    goal: 'Get 10 failed logins for one account processed with no lockout or throttling.',
    lesson: 'Without throttling, password guessing is free and unlimited. Rate limits, lockouts and delays turn a cheap attack into a slow, noisy one.',
    impact: 'Attackers run credential-stuffing lists against gateways like this every day. One reused password and a merchant account — with its balance and payouts — is gone.',
    report: { title: 'Missing Brute-Force Protection on Login', severity: 'High', remediation: 'Add per-account and per-IP rate limiting, progressive delays and lockout with alerting.' },
    guide: 'Pick one account, e.g. maya@novashop.test. Send 10 login attempts with wrong passwords (curl loop or Burp Intruder). Every failure is processed normally; on the 10th the test flips — the gateway never throttles you.',
    fix: 'Count failures per account/IP and throttle or lock after a small threshold; add alerting.' },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User Enumeration via Login & Reset Responses', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    where: 'POST /login, POST /forgot',
    hints: ['Compare the error for an email that exists with one that does not.', '“No account found” vs “Incorrect password” tells you exactly which emails are registered.', 'The forgot-password page leaks the same way. Collect both response types to prove it.'],
    goal: 'Prove the gateway reveals whether an email is registered, from differing error messages.',
    lesson: 'Different errors for “no such user” and “wrong password” hand attackers a free list of valid accounts to target.',
    impact: 'Enumeration turns random phishing into a aimed hit-list of real merchant accounts — the first step of almost every account-takeover campaign.',
    report: { title: 'Account Enumeration via Authentication Responses', severity: 'Medium', remediation: 'Return one generic error (“invalid credentials”) for every failed login and reset request.' },
    guide: 'POST /login with an existing email (maya@novashop.test) and a wrong password → “Incorrect password”. POST again with a fake email (nobody@nowhere.test) → “No account found”. The two different answers enumerate accounts; both sightings flip the test.',
    fix: 'Use a single generic authentication error and identical reset responses regardless of account existence.' },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Default Platform Admin Credentials', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    where: 'POST /login (platform admin account)',
    hints: ['The platform admin account shipped with the product was never changed.', 'Docs, installers and defaults lists all point at the same classic pair: admin@… / admin123.', 'Try admin@hexapay.local with the most common default password in the world.'],
    goal: 'Log in as the platform admin using shipped default credentials.',
    lesson: 'Default credentials are public knowledge. Any product installed and not re-secured is pre-compromised.',
    impact: 'A platform admin on a payment gateway sees every merchant, every key and every balance. Default creds here mean total platform compromise.',
    report: { title: 'Default Credentials on Administrative Account', severity: 'Critical', remediation: 'Force a password change at first login; disable or rename default accounts; scan for defaults in deployment checks.' },
    guide: 'On /login use email admin@hexapay.local and password admin123. You land in the platform admin account — the shipped defaults were never changed.',
    fix: 'Force credential rotation at first run and remove vendor default accounts.' },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable Password Reset Token', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Intermediate',
    where: 'POST /forgot, POST /reset',
    hints: ['Request a reset for your own account and look closely at the token format.', 'The token is built only from things an attacker knows: the user id and today’s date.', 'Guess the token for a different account — rst-<userid>-<DDMM> — without ever requesting a reset for it.'],
    goal: 'Reset another account’s password using a token you computed yourself, never issued to you.',
    lesson: 'Reset tokens must be long, random and single-use. A token derived from public values is not a secret at all.',
    impact: 'Anyone can take over any merchant account — including the payout settings — just by knowing an email address and the date.',
    report: { title: 'Predictable Password Reset Token', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), store hashed, expire quickly, single use.' },
    guide: 'User ids: maya=2, leo=3, ivan=4, sara=5. The token formula is rst-<id>-<DDMM> with today’s date, e.g. rst-5-2310 on Oct 23. POST /reset with sara@pixelmart.test, your guessed token and a new password — no reset email was ever requested, yet it works. Log in as sara with the new password.',
    fix: 'Issue cryptographically random, expiring, single-use reset tokens; verify against the stored issued token only.' },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Session Cookie Role Tampering', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    where: 'GET /admin (session cookie)',
    hints: ['Your session cookie is just base64 JSON. Decode it and see what it claims about you.', 'The /admin page trusts the role written inside the cookie instead of the account record.', 'Change "role":"staff" to "role":"admin" in the cookie, re-encode, and visit /admin.'],
    goal: 'Reach the platform admin panel by editing the role inside your own session cookie.',
    lesson: 'Authorization data must live server-side. Anything the client can edit, the client controls.',
    impact: 'A low-privilege staff account becomes platform admin in seconds — every merchant’s money flows are then one click away.',
    report: { title: 'Client-Side Authorization Data in Session Cookie', severity: 'High', remediation: 'Keep roles server-side in the session store; sign or encrypt client cookies; never trust client-supplied roles.' },
    guide: 'Log in as leo@novashop.test (staff). Copy the hxpay_sess cookie, base64-decode it, change "role":"staff" to "role":"admin", base64-encode again and replace the cookie. Visit /admin — the gateway trusts the cookie and opens the platform panel.',
    fix: 'Store the session server-side with only an opaque id in the cookie; read roles from the account record per request.' },

  /* ---------------- Registration & Profile ---------------- */
  { id: 'reg-weakpw', feature: 'Registration & Profile', name: 'Weak Password Policy at Registration', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    where: 'POST /register',
    hints: ['Register a new merchant and see how short a password you can get away with.', 'There is no length or complexity check at all.', 'A one-character password is accepted.'],
    goal: 'Create an account protected by a one-character password.',
    lesson: 'A password policy is the cheapest defence a signup form has. Without one, users pick passwords attackers guess in seconds.',
    impact: 'Weak merchant passwords plus no brute-force protection means accounts fall to the first password list an attacker tries.',
    report: { title: 'No Password Complexity Requirements', severity: 'Medium', remediation: 'Enforce a minimum length (≥12) and breached-password screening at registration and password change.' },
    guide: 'Go to /register and create a merchant with password “a”. The account is created — the gateway never asked for length or complexity.',
    fix: 'Enforce minimum length and check new passwords against known-breached lists.' },
  { id: 'reg-massassign', feature: 'Registration & Profile', name: 'Mass Assignment — Role & Balance at Registration', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /register',
    hints: ['The signup handler copies every submitted field straight onto the new account.', 'Add fields the form never showed you — the data model has role and balance fields.', 'Register with role=admin (or balance=99999) as extra form fields and see what your new account owns.'],
    goal: 'Register an account that is born an admin, or born with a large balance, by submitting unlisted fields.',
    lesson: 'Bind request data to an allow-list. If the server copies the whole body onto the record, attackers set the fields you forgot existed.',
    impact: 'Attackers mint admin accounts — or accounts pre-loaded with spendable balance — directly from the public signup form.',
    report: { title: 'Mass Assignment in Registration', severity: 'High', remediation: 'Allow-list bindable fields per endpoint; set role/balance server-side only; reject unexpected properties.' },
    guide: 'POST /register with the normal fields PLUS role=admin (or balance=99999). The handler binds everything: your new account is a platform admin / starts with a fake balance. Log in and check.',
    fix: 'Bind only an explicit allow-list of signup fields; assign role and balance exclusively on the server.' },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in Business Name', owasp: 'A03:2021 – Injection', difficulty: 'Beginner',
    where: 'POST /register, POST /settings (business name rendered on dashboard & admin list)',
    hints: ['Your business name is printed back on the dashboard and in the admin merchant list — unescaped.', 'Put an HTML/JS payload in the business name at signup or in Settings.', '<script>alert(1)</script> or <img src=x onerror=alert(1)> as the business name is stored raw.'],
    goal: 'Store a script payload in the business name so it is saved and rendered as code.',
    lesson: 'Any user-controlled text that is rendered without encoding is a stored XSS waiting for a victim — here, the platform admin.',
    impact: 'The payload fires in the platform admin’s browser when they review merchants — session theft and admin actions from the victim’s own browser.',
    report: { title: 'Stored Cross-Site Scripting in Business Name', severity: 'High', remediation: 'Context-encode all user-controlled output; add a Content-Security-Policy as defence in depth.' },
    guide: 'Register (or edit Settings) with business name: <img src=x onerror=alert(1)>. It is stored verbatim and rendered unescaped on the dashboard and the admin merchant list.',
    fix: 'HTML-encode user-controlled values at render time in every context.' },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    where: 'POST /settings',
    hints: ['The settings form changes your contact email and business name with no anti-CSRF token.', 'The app sets an hx_origin marker cookie on its own pages; the settings handler never checks it.', 'Send the settings POST from “another site” (no marker cookie / foreign Origin) while logged in — it still applies.'],
    goal: 'Change a victim’s profile settings with a cross-site request that carries no CSRF protection.',
    lesson: 'State-changing forms need unforgeable tokens. Cookies alone authenticate the victim — that is exactly what CSRF abuses.',
    impact: 'A merchant who visits a hostile page while logged in gets their contact email changed — the first step to hijacking password resets and payout notices.',
    report: { title: 'Cross-Site Request Forgery on Profile Update', severity: 'Medium', remediation: 'Require per-session CSRF tokens on all state-changing requests and verify Origin/Referer as defence in depth.' },
    guide: 'While logged in, POST /settings with new values but WITHOUT the hx_origin marker cookie (e.g. curl with only the session cookie, or a foreign Origin header). The change applies — no token was ever checked.',
    fix: 'Add synchroniser CSRF tokens to every state-changing form and verify them server-side.' },

  /* ---------------- Checkout & Payment Links ---------------- */
  { id: 'chk-amount', feature: 'Checkout & Payment Links', name: 'Checkout Amount Tampering', owasp: 'A04:2021 – Insecure Design', difficulty: 'Beginner',
    where: 'POST /checkout/:linkId',
    hints: ['The hosted checkout page shows the real price — but the POST includes an amount field.', 'The gateway trusts the amount the browser sends instead of the link’s stored price.', 'Pay a $250 link with amount=1 and watch the merchant get credited for a “paid” order.'],
    goal: 'Complete a checkout for far less than the payment link’s real price.',
    lesson: 'Prices are server-side facts. If the client names the price, the client sets the price — usually to $1.',
    impact: 'Customers check out entire carts for a dollar while the merchant’s dashboard shows a normal paid order. Pure, silent revenue theft.',
    report: { title: 'Client-Side Price Tampering at Checkout', severity: 'Critical', remediation: 'Compute the charge amount server-side from the stored link/product; ignore any client-sent amount.' },
    guide: 'Open NovaShop’s $250 link L-1001 checkout. POST /checkout/L-1001 with amount=1. The payment succeeds, the transaction shows $1 on a $250 link and the merchant is credited.',
    fix: 'Always derive the payable amount from server-side catalogue data.' },
  { id: 'chk-currency', feature: 'Checkout & Payment Links', name: 'Currency Confusion at Checkout', owasp: 'A04:2021 – Insecure Design', difficulty: 'Intermediate',
    where: 'POST /checkout/:linkId',
    hints: ['The checkout accepts a currency parameter and never reconciles it with the link’s currency.', 'The merchant is credited the numeric amount as if it were USD either way.', 'Pay a $120 USD link with currency set to a near-worthless unit — the books still show 120 USD in.'],
    goal: 'Settle a USD payment link in a different currency while the merchant is credited the full USD number.',
    lesson: 'Amount and currency are one fact, not two. Validating the number but not the unit is validating neither.',
    impact: 'Attackers pay in a currency worth a fraction of the dollar amount while the merchant ships goods against a “fully paid” USD order.',
    report: { title: 'Missing Currency Validation at Checkout', severity: 'High', remediation: 'Fix the settlement currency to the link’s stored currency; convert explicitly with a rate if multi-currency is intended.' },
    guide: 'POST /checkout/L-2001 (a $120 USD link) with the correct amount but currency=HXP (or BDT). The payment settles and PixelMart is credited 120 — in USD on the books.',
    fix: 'Ignore client currency; settle in the link’s currency or apply an explicit, logged conversion.' },
  { id: 'chk-negative', feature: 'Checkout & Payment Links', name: 'Negative Quantity Accepted at Checkout', owasp: 'A04:2021 – Insecure Design', difficulty: 'Intermediate',
    where: 'POST /checkout/:linkId',
    hints: ['Quantity is multiplied straight into the total with no sanity check.', 'What happens when qty is not 1, or 2 — but below zero?', 'POST qty=-2: the gateway creates a “paid” transaction with a negative total.'],
    goal: 'Create a paid transaction with a negative total by submitting a negative quantity.',
    lesson: 'Every numeric input needs bounds. Quantities, amounts and counts below zero or absurdly large break money maths in the attacker’s favour.',
    impact: 'Negative-total transactions corrupt balances, refunds and reports — and in real gateways have been used to pull money OUT of merchant accounts.',
    report: { title: 'Missing Bounds Validation on Quantity', severity: 'High', remediation: 'Validate quantity as a positive integer within sensible bounds server-side; reject totals ≤ 0 for payments.' },
    guide: 'POST /checkout/L-1002 with qty=-2 and no amount override. The gateway multiplies price × -2 and records a paid transaction of -$80.',
    fix: 'Validate qty ≥ 1 (integer) and recompute totals server-side; reject non-positive payment totals.' },
  { id: 'link-idor', feature: 'Checkout & Payment Links', name: 'Cross-Merchant Payment Link Editing (IDOR)', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    where: 'POST /links/:id/update',
    hints: ['Payment link ids are predictable (L-1001, L-2001…). The edit handler checks you are logged in — nothing more.', 'Try editing the OTHER merchant’s link: change its price or deactivate it.', 'No ownership check stands between you and a competitor’s checkout.'],
    goal: 'Modify or deactivate a payment link that belongs to a different merchant.',
    lesson: '“Logged in” is not “authorised”. Every object access must check that the object belongs to the caller.',
    impact: 'A rival merchant rewrites your link’s price to $0 or switches it off during your biggest sale — sabotage with your own gateway’s help.',
    report: { title: 'Insecure Direct Object Reference on Payment Links', severity: 'High', remediation: 'Enforce per-object ownership checks on every read/write; use unguessable ids as defence in depth.' },
    guide: 'Log in as maya (NovaShop). POST /links/L-2001/update with a new price or active=0 — L-2001 belongs to PixelMart, but the change is applied anyway.',
    fix: 'Check link.merchantId === session merchant on every link operation.' },

  /* ---------------- Transactions & Receipts ---------------- */
  { id: 'txn-idor', feature: 'Transactions & Receipts', name: 'Cross-Merchant Transaction Details (IDOR)', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    where: 'GET /transactions/:id',
    hints: ['Transaction ids are sequential numbers — walk them.', 'The details page never asks which merchant the transaction belongs to.', 'Open a transaction id from the other merchant’s range and read their customer’s payment.'],
    goal: 'Read full details of a transaction owned by another merchant.',
    lesson: 'Sequential ids plus missing ownership checks turn your transaction history into everyone’s transaction history.',
    impact: 'Competitors and attackers harvest customer emails, amounts and purchase patterns — a privacy breach and a targeting goldmine.',
    report: { title: 'Insecure Direct Object Reference on Transactions', severity: 'High', remediation: 'Scope every transaction query to the authenticated merchant; return 404 for foreign objects.' },
    guide: 'Log in as maya. Open /transactions/1003 — that payment belongs to PixelMart, yet the full details (customer, amount, status) are served to you.',
    fix: 'Filter all transaction reads by the session merchant id.' },
  { id: 'receipt-idor', feature: 'Transactions & Receipts', name: 'Cross-Merchant Receipt Access (IDOR)', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    where: 'GET /receipts/:id',
    hints: ['Receipts live at their own predictable URL, separate from the transaction page.', 'Fixing the transaction page is not enough if the receipt route was forgotten.', 'Fetch a receipt for the other merchant’s transaction id.'],
    goal: 'Download a payment receipt belonging to another merchant’s customer.',
    lesson: 'Every route that serves an object is an access-control surface — including the “harmless” printable ones.',
    impact: 'Receipts carry buyer names, emails and purchase details. Leaking them is a reportable data breach in most jurisdictions.',
    report: { title: 'Insecure Direct Object Reference on Receipts', severity: 'Medium', remediation: 'Apply the same ownership scoping to receipt/document routes as to the primary object routes.' },
    guide: 'While logged in as maya, open /receipts/1004 — a PixelMart receipt renders in full, no ownership check anywhere.',
    fix: 'Scope receipt generation to transactions owned by the session merchant.' },

  /* ---------------- Refunds ---------------- */
  { id: 'refund-over', feature: 'Refunds', name: 'Refund Exceeds the Original Payment', owasp: 'A04:2021 – Insecure Design', difficulty: 'Beginner',
    where: 'POST /transactions/:id/refund',
    hints: ['The refund form asks for an amount. Nothing compares it with what was actually paid.', 'Refund more than the transaction total and see if the gateway blinks.', 'A $250 payment happily refunds $300 — money from nowhere.'],
    goal: 'Refund more money than a transaction originally collected.',
    lesson: 'Refund logic must cap cumulative refunds at the captured amount. It is the oldest money-out bug in payments.',
    impact: 'Anyone with refund access — or a hijacked account — drains the merchant balance by “refunding” money that was never paid in.',
    report: { title: 'Refund Amount Not Capped at Captured Amount', severity: 'Critical', remediation: 'Enforce cumulative refunds ≤ captured amount, server-side, inside a transaction-safe check.' },
    guide: 'As maya, POST /transactions/1001/refund with amount=300. The original payment was $250 — the gateway still books a $300 refund and debits the balance.',
    fix: 'Validate refund amount against (captured − already refunded) before booking.' },
  { id: 'refund-cross', feature: 'Refunds', name: "Refund Another Merchant's Transaction", owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    where: 'POST /transactions/:id/refund',
    hints: ['You already know transaction ids are sequential and readable cross-merchant.', 'The refund endpoint is just as trusting as the read endpoints.', 'Refund a small amount from the OTHER merchant’s transaction and watch their balance drop.'],
    goal: 'Book a refund against a transaction owned by a different merchant.',
    lesson: 'Write endpoints need ownership checks even more than read endpoints — a cross-tenant refund is direct financial sabotage.',
    impact: 'A malicious merchant (or compromised account) refunds a competitor’s sales all day, draining their balance and enraging their customers.',
    report: { title: 'Cross-Tenant Refund (Broken Access Control)', severity: 'Critical', remediation: 'Require transaction.merchantId === session merchant for refund creation; log and alert on cross-tenant attempts.' },
    guide: 'As maya, POST /transactions/1003/refund with amount=10. Transaction 1003 is PixelMart’s — the refund books anyway and PixelMart’s balance falls.',
    fix: 'Enforce merchant ownership on the refund endpoint.' },
  { id: 'refund-double', feature: 'Refunds', name: 'Double Refund on a Fully Refunded Payment', owasp: 'A04:2021 – Insecure Design', difficulty: 'Intermediate',
    where: 'POST /transactions/:id/refund',
    hints: ['Transaction 1005 is already refunded in full — its status says so.', 'Does the refund endpoint check the status, or the already-refunded total, at all?', 'Refund it again. Then again. The balance keeps dropping.'],
    goal: 'Refund an already fully-refunded transaction a second time.',
    lesson: 'State machines matter in money code: a settled refund must be a terminal state the endpoint respects.',
    impact: 'Double refunds are a classic insider and bug-abuse drain — the same sale pays out twice, three times, until someone reconciles by hand.',
    report: { title: 'Missing Refund State Validation (Double Refund)', severity: 'High', remediation: 'Reject refunds on transactions whose refundable remainder is zero; make refund booking idempotent.' },
    guide: 'As ivan, POST /transactions/1005/refund with amount=10. Transaction 1005 was already refunded its full $60 — the gateway books another refund regardless.',
    fix: 'Check refundable remainder and transaction status before creating any refund.' },

  /* ---------------- Webhooks ---------------- */
  { id: 'wh-forge', feature: 'Webhooks', name: 'Forged Webhook Event — No Signature Verification', owasp: 'A08:2021 – Software and Data Integrity Failures', difficulty: 'Intermediate',
    where: 'POST /webhooks/receive',
    hints: ['The gateway accepts inbound “payment.succeeded” events from its processor at /webhooks/receive.', 'Real processors sign events with HMAC. This endpoint never checks the signature header.', 'POST your own payment.succeeded event with a made-up signature and a fat amount — the balance still moves.'],
    goal: 'Get a self-invented payment event accepted and credited, with an invalid signature.',
    lesson: 'Webhooks are code execution by remote control. If you do not verify the signature, anyone on the internet is your payment processor.',
    impact: 'Attackers credit their own merchant accounts with unlimited fake payments, then pay the money out — direct theft from the platform.',
    report: { title: 'Webhook Signature Not Verified', severity: 'Critical', remediation: 'Verify the HMAC signature of every webhook against the endpoint secret (constant-time compare) before processing; reject failures.' },
    guide: 'POST /webhooks/receive with JSON {"type":"payment.succeeded","merchant":"m1","amount":500} and header x-hexapay-signature: forged. NovaShop’s balance rises by $500 — the signature was never verified.',
    fix: 'Compute HMAC-SHA256 over the raw body with the endpoint secret and compare in constant time; process only on match.' },
  { id: 'wh-secret', feature: 'Webhooks', name: 'Webhook Signing Secret Exposed to Staff Role', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    where: 'GET /api/webhooks/config',
    hints: ['The webhook config API returns the endpoint details — including the signing secret.', 'It answers any logged-in user of the merchant, not just the owner.', 'Log in as a staff account and ask the API for the config.'],
    goal: 'Read the merchant’s webhook signing secret using a low-privilege staff account.',
    lesson: 'Secrets are owner-grade data. Role checks must apply to API responses, not just to admin pages.',
    impact: 'A junior staff login (or phished staff account) walks away with the key that signs payment events — forged webhooks become undetectable.',
    report: { title: 'Sensitive Secret Exposed to Insufficient Role', severity: 'High', remediation: 'Restrict secret-bearing responses to the owner role; mask secrets after creation; rotate on exposure.' },
    guide: 'Log in as leo@novashop.test (staff, not owner). GET /api/webhooks/config — the JSON includes the whsec_ signing secret that only the owner should ever see.',
    fix: 'Gate secret fields behind the owner role and mask them in all other responses.' },

  /* ---------------- API & API Keys ---------------- */
  { id: 'api-scope', feature: 'API & API Keys', name: 'Read-Only API Key Can Create Charges', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /api/charges',
    hints: ['Merchants get separate keys: a read-only secret and a write secret. Least privilege — in theory.', 'The charges endpoint checks that a key exists, not what the key may do.', 'Create a charge with the read-only key (sk_…_read) as the Bearer token.'],
    goal: 'Create a real charge using an API key whose scope is read-only.',
    lesson: 'Scopes are authorization, not decoration. Every endpoint must check the key’s scope, not merely its existence.',
    impact: 'A read-only key leaked in a dashboard or a log becomes a full payment-creation key — charges, refunds and chaos follow.',
    report: { title: 'API Key Scope Not Enforced', severity: 'High', remediation: 'Enforce per-endpoint scope checks (read vs write) for every API key on every route.' },
    guide: 'Take NovaShop’s read-only secret key from the API page. POST /api/charges with Authorization: Bearer <read key> and {"amount":75}. A charge is created and credited — a read key just wrote.',
    fix: 'Check key.scope against the operation on each API route; deny writes to read-scoped keys.' },
  { id: 'api-keyconfusion', feature: 'API & API Keys', name: 'Publishable Key Accepted on Secret Endpoints', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    where: 'GET /api/balance',
    hints: ['Publishable keys (pk_…) are meant to be public — they sit in web page source by design.', 'Some API endpoints accept ANY known key as a Bearer token, publishable included.', 'Ask /api/balance for the balance using only the pk_ key anyone can scrape.'],
    goal: 'Read protected account data (the balance) using only the public publishable key.',
    lesson: 'Key TYPES are a security boundary. A key designed to be public must never authenticate anything sensitive.',
    impact: 'Every merchant’s live balance — scraped from their own checkout pages’ public keys — is exposed to the whole internet.',
    report: { title: 'Publishable Key Accepted as API Credential', severity: 'High', remediation: 'Accept only secret keys on server-side endpoints; keep publishable keys limited to tokenising payments in the browser.' },
    guide: 'Copy NovaShop’s publishable key (pk_live_…) from the API page. GET /api/balance with Authorization: Bearer pk_live_… — the balance is returned to a key that is public by design.',
    fix: 'Require secret keys for all server-side API endpoints; reject publishable keys explicitly.' },

  /* ---------------- Payouts & Balance ---------------- */
  { id: 'payout-dest', feature: 'Payouts & Balance', name: 'Payout Destination Changed at Request Time', owasp: 'A04:2021 – Insecure Design', difficulty: 'Intermediate',
    where: 'POST /payouts',
    hints: ['Your saved payout bank account is on file — but the payout form lets the request itself carry an IBAN.', 'The gateway pays wherever the request says, no re-verification, no cooling-off period.', 'Request a small payout with someone else’s IBAN in the iban field.'],
    goal: 'Send a payout to a bank account that is not the merchant’s saved payout account.',
    lesson: 'Money destinations must come from verified, server-side records — never from the same request that moves the money.',
    impact: 'One hijacked session sends the entire balance to an attacker’s IBAN. Real gateways add verification and delays precisely because of this bug.',
    report: { title: 'Unverified Payout Destination Override', severity: 'Critical', remediation: 'Pay only to the verified on-file account; require re-authentication and a holding period for account changes.' },
    guide: 'As maya, POST /payouts with amount=10 and iban=DE021005000000111222333 (not NovaShop’s saved IBAN). The payout is created to the foreign account immediately.',
    fix: 'Ignore request-supplied destinations; pay only the verified saved account.' },
  { id: 'payout-overdraw', feature: 'Payouts & Balance', name: 'Payout Exceeds Available Balance', owasp: 'A04:2021 – Insecure Design', difficulty: 'Beginner',
    where: 'POST /payouts',
    hints: ['The payout handler subtracts first and never asks whether the balance covers it.', 'Ask for more than the merchant owns.', 'A payout of 999999 is accepted and the balance simply goes negative.'],
    goal: 'Book a payout larger than the merchant’s available balance.',
    lesson: 'Balance checks are the business logic. A payout path without one prints money against the platform’s own funds.',
    impact: 'Merchants (or hijacked accounts) withdraw money that does not exist; the platform eats the difference at settlement.',
    report: { title: 'Missing Balance Check on Payout Creation', severity: 'Critical', remediation: 'Check available balance (minus holds/pending) inside the same transaction that books the payout.' },
    guide: 'As maya, POST /payouts with amount=999999 and no iban override. It is accepted; NovaShop’s balance plunges far below zero.',
    fix: 'Validate amount ≤ available balance atomically at booking time.' },

  /* ---------------- Platform & Admin ---------------- */
  { id: 'plat-debug', feature: 'Platform & Admin', name: 'Debug Endpoint Exposes Secrets & Passwords', owasp: 'A05:2021 – Security Misconfiguration', difficulty: 'Beginner',
    where: 'GET /debug',
    hints: ['A diagnostics page from development was left switched on in production.', 'It dumps the whole in-memory state: users, passwords, API keys, webhook secrets.', 'Just open /debug while the lab is unlocked.'],
    goal: 'Open the leftover debug endpoint and read the platform’s secrets in plain text.',
    lesson: 'Debug surfaces are production vulnerabilities. Anything that dumps state, config or credentials must never ship enabled.',
    impact: 'One URL hands an attacker every password and every signing secret on the platform — total compromise without logging in.',
    report: { title: 'Debug Endpoint Exposing Sensitive Data', severity: 'Critical', remediation: 'Remove debug/diagnostic endpoints from production builds; gate any retained tooling behind admin auth and network restrictions.' },
    guide: 'Browse to /debug. The page prints all users with plain-text passwords, all API keys and all webhook secrets — leftovers from development, live in production.',
    fix: 'Delete the debug route from production; never render credentials or secrets in diagnostics.' },
];

/* Completion-key shards live in a different region of this file (near the
 * bottom, beside the completion machinery). See COMPLETION_SHARDS there. */

/* ============================ SEED DATA (all fake) ============================ */
const users = [
  { id: 1, email: 'admin@hexapay.local', password: 'admin123', name: 'Platform Admin', role: 'admin', merchantId: null, isDefault: true },
  { id: 2, email: 'maya@novashop.test', password: 'maya123', name: 'Maya Rahman', role: 'owner', merchantId: 'm1' },
  { id: 3, email: 'leo@novashop.test', password: 'leo123', name: 'Leo Park', role: 'staff', merchantId: 'm1' },
  { id: 4, email: 'ivan@pixelmart.test', password: 'ivan123', name: 'Ivan Petrov', role: 'owner', merchantId: 'm2' },
  { id: 5, email: 'sara@pixelmart.test', password: 'sara123', name: 'Sara Ahmed', role: 'staff', merchantId: 'm2' },
];
const merchants = [
  { id: 'm1', name: 'NovaShop', ownerId: 2, balance: 1240, payoutIban: 'DE89370400440532013000', payoutName: 'NovaShop GmbH', plan: 'pro',
    whUrl: 'https://novashop.test/hooks/hexapay', whSecret: 'whsec_nova_7f3ka9d2',
    keys: [
      { key: 'pk_live_nova_4d8f2c', type: 'publishable', scope: 'public' },
      { key: 'sk_live_nova_read_91bd', type: 'secret', scope: 'read' },
      { key: 'sk_live_nova_write_55e0', type: 'secret', scope: 'write' },
    ] },
  { id: 'm2', name: 'PixelMart', ownerId: 4, balance: 860, payoutIban: 'FR7630006000011234567890189', payoutName: 'PixelMart SAS', plan: 'growth',
    whUrl: 'https://pixelmart.test/hooks/hexapay', whSecret: 'whsec_pixel_2b8qx41m',
    keys: [
      { key: 'pk_live_pixel_77aa10', type: 'publishable', scope: 'public' },
      { key: 'sk_live_pixel_read_30cf', type: 'secret', scope: 'read' },
      { key: 'sk_live_pixel_write_c418', type: 'secret', scope: 'write' },
    ] },
];
let links = [
  { id: 'L-1001', merchantId: 'm1', name: 'Pro Plan — Annual', price: 250, currency: 'USD', active: true },
  { id: 'L-1002', merchantId: 'm1', name: 'Add-on Pack', price: 40, currency: 'USD', active: true },
  { id: 'L-2001', merchantId: 'm2', name: 'E-book Bundle', price: 120, currency: 'USD', active: true },
  { id: 'L-2002', merchantId: 'm2', name: 'Consulting Hour', price: 300, currency: 'USD', active: true },
];
let txns = [
  { id: 1001, merchantId: 'm1', linkId: 'L-1001', customer: 'cara@buyer.test', amount: 250, currency: 'USD', status: 'paid', refunded: 0, via: 'checkout' },
  { id: 1002, merchantId: 'm1', linkId: 'L-1002', customer: 'dan@buyer.test', amount: 40, currency: 'USD', status: 'paid', refunded: 0, via: 'checkout' },
  { id: 1003, merchantId: 'm2', linkId: 'L-2001', customer: 'eli@buyer.test', amount: 120, currency: 'USD', status: 'paid', refunded: 0, via: 'checkout' },
  { id: 1004, merchantId: 'm2', linkId: 'L-2002', customer: 'fay@buyer.test', amount: 300, currency: 'USD', status: 'paid', refunded: 0, via: 'checkout' },
  { id: 1005, merchantId: 'm2', linkId: 'L-2001', customer: 'gil@buyer.test', amount: 60, currency: 'USD', status: 'refunded', refunded: 60, via: 'checkout' },
];
let refunds = [ { id: 1, txnId: 1005, amount: 60, by: 4 } ];
let payouts = [
  { id: 1, merchantId: 'm1', amount: 500, iban: 'DE89370400440532013000', status: 'completed' },
  { id: 2, merchantId: 'm2', amount: 300, iban: 'FR7630006000011234567890189', status: 'completed' },
];
let issuedResetTokens = {}; // userId -> token actually issued via /forgot
let enumProbe = {};         // per-IP flags for the enumeration test
let bruteProbe = {};        // per-IP+email failure counts
let nextUserId = 6, nextMerchantSeq = 3, nextTxnId = 1006, nextRefundId = 2, nextPayoutId = 3, nextLinkSeq = 3001;

const merchantById = id => merchants.find(m => m.id === id);
const userById = id => users.find(u => u.id === id);
const userByEmail = e => users.find(u => u.email === String(e || '').toLowerCase());

/* ============================ PROGRESS ENGINE ============================ */
let state = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadState() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const s = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      if (s && typeof s === 'object') state = Object.assign(state, s);
    }
  } catch (e) { /* corrupted state file: start fresh rather than crash */ }
}
function saveState() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2)); } catch (e) { /* ignore */ }
}
function totalTests() { return TESTS.length; }
function doneCount() { return TESTS.filter(t => state.tests[t.id]).length; }
function pct() { return Math.floor(doneCount() / totalTests() * 100); }
function isComplete() { return doneCount() === totalTests(); }
function pass(id) {
  if (!TESTS.some(t => t.id === id)) return;
  if (!state.tests[id]) {
    state.tests[id] = true;
    if (isComplete() && !state.completedAt) { state.completedAt = new Date().toISOString(); state.keyRevealed = true; }
    saveState();
  }
}
function bump(feature) {
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  saveState();
}
function featureStats() {
  const out = {};
  for (const t of TESTS) {
    out[t.feature] = out[t.feature] || { total: 0, done: 0, attempts: state.attempts[t.feature] || 0 };
    out[t.feature].total++;
    if (state.tests[t.id]) out[t.feature].done++;
  }
  for (const f of Object.keys(out)) out[f].attempts = state.attempts[f] || 0;
  return out;
}

/* ============================ HTTP HELPERS ============================ */
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function parseCookies(req) {
  const out = {};
  const h = req.headers.cookie || '';
  for (const part of h.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) {
        try { return resolve(JSON.parse(data || '{}')); } catch (e) { return resolve({}); }
      }
      const out = {};
      for (const pair of data.split('&')) {
        if (!pair) continue;
        const i = pair.indexOf('=');
        const k = decodeURIComponent((i < 0 ? pair : pair.slice(0, i)).replace(/\+/g, ' '));
        const v = decodeURIComponent((i < 0 ? '' : pair.slice(i + 1)).replace(/\+/g, ' '));
        out[k] = v;
      }
      resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function sendJson(res, code, obj) { send(res, code, JSON.stringify(obj, null, 2), 'application/json; charset=utf-8'); }
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }

/* Session: the cookie IS the session (base64 JSON) — intentionally tamperable.
 * Authorization for /admin trusts the role written in the cookie (auth-cookie). */
function makeSessionCookie(user) {
  const payload = { uid: user.id, role: user.role, mid: user.merchantId };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
}
function sessionOf(req) {
  const c = parseCookies(req);
  if (!c.hxpay_sess) return null;
  try {
    const p = JSON.parse(Buffer.from(c.hxpay_sess, 'base64').toString('utf8'));
    const user = userById(p.uid);
    if (!user) return null;
    return { user, role: p.role, mid: p.mid, raw: p };
  } catch (e) { return null; }
}
function setSession(res, user) {
  res.setHeader('Set-Cookie', [
    'hxpay_sess=' + makeSessionCookie(user) + '; Path=/; HttpOnly',
    'hx_origin=1; Path=/',
  ]);
}
function clearSession(res) {
  res.setHeader('Set-Cookie', ['hxpay_sess=; Path=/; Max-Age=0', 'hx_origin=1; Path=/']);
}
const ipOf = req => req.socket.remoteAddress || 'local';

/* ============================ PAGE SHELL ============================ */
function chatWidget() {
  return `<div id="coach" style="position:fixed;right:16px;bottom:16px;width:320px;max-width:92vw;background:#111827;color:#e5e7eb;border:1px solid #374151;border-radius:12px;overflow:hidden;font-family:system-ui;z-index:50;box-shadow:0 8px 30px rgba(0,0,0,.4)">
  <div style="background:#1f2937;padding:8px 12px;font-weight:700">💬 Lab Coach — LAB ${LAB_NUMBER}</div>
  <div id="coachLog" style="height:180px;overflow:auto;padding:10px;font-size:13px;line-height:1.45"></div>
  <form id="coachForm" style="display:flex;border-top:1px solid #374151">
    <input id="coachIn" autocomplete="off" placeholder="Ask the coach…" style="flex:1;background:#0b1220;color:#e5e7eb;border:0;padding:9px;font-size:13px">
    <button style="background:#2563eb;color:#fff;border:0;padding:0 14px;cursor:pointer">Send</button>
  </form></div>
<script>
var log=document.getElementById('coachLog'),form=document.getElementById('coachForm'),inp=document.getElementById('coachIn');
function add(who,txt){var d=document.createElement('div');d.style.margin='6px 0';d.innerHTML='<b>'+who+':</b> ';d.appendChild(document.createTextNode(txt));log.appendChild(d);log.scrollTop=log.scrollHeight;}
add('Coach','Hi! I am the ${LAB_NAME} Lab Coach. Ask me what this lab covers, or how to test a feature — but I only unlock step-by-step help after you have tried that feature at least 3 times yourself.');
form.addEventListener('submit',function(e){e.preventDefault();var m=inp.value.trim();if(!m)return;inp.value='';add('You',m);
fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})}).then(function(r){return r.json()}).then(function(j){add('Coach',j.reply)}).catch(function(){add('Coach','(connection hiccup — try again)')});});
</script>`;
}
function layout(title, sess, inner, opts) {
  opts = opts || {};
  const done = doneCount(), total = totalTests(), p = pct();
  const nav = sess ? `<nav style="margin:10px 0;font-size:14px">
    <a href="/dashboard">Dashboard</a> · <a href="/links">Payment Links</a> · <a href="/transactions">Transactions</a> ·
    <a href="/webhooks">Webhooks</a> · <a href="/api-keys">API Keys</a> · <a href="/payouts">Payouts</a> ·
    <a href="/settings">Settings</a> · <a href="/tests">Mission (Tests)</a> · <a href="/logout">Logout</a></nav>` : '';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — HexaPay LAB ${LAB_NUMBER}</title>
<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0b1220;color:#e5e7eb;margin:0}
a{color:#93c5fd} .wrap{max-width:960px;margin:0 auto;padding:18px}
header.top{background:#111827;border-bottom:1px solid #1f2937;padding:10px 18px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.bar{height:10px;background:#1f2937;border-radius:6px;overflow:hidden;min-width:180px;flex:1}
.bar>i{display:block;height:100%;background:linear-gradient(90deg,#2563eb,#7c3aed)}
.card{background:#111827;border:1px solid #1f2937;border-radius:12px;padding:16px;margin:12px 0}
input,select{padding:8px;border-radius:8px;border:1px solid #374151;background:#0b1220;color:#e5e7eb;width:100%;box-sizing:border-box;margin:4px 0 10px}
button,.btn{background:linear-gradient(90deg,#2563eb,#7c3aed);color:#fff;border:0;border-radius:8px;padding:9px 16px;cursor:pointer;text-decoration:none;display:inline-block}
table{width:100%;border-collapse:collapse} td,th{border-bottom:1px solid #1f2937;padding:7px;text-align:left;font-size:14px}
.ok{color:#34d399}.bad{color:#f87171}.muted{color:#9ca3af} code{background:#1f2937;padding:1px 5px;border-radius:4px}
</style></head><body>
<header class="top"><img src="/logo.png" alt="HexaCyberLab" style="height:34px">
<strong>LAB ${LAB_NUMBER} — ${LAB_NAME}</strong>
<span class="muted">${done}/${total} tests · ${p}%</span>
<div class="bar"><i style="width:${p}%"></i></div>
${sess ? '<span class="muted">' + esc(sess.user.name) + ' (' + esc(sess.role) + ')</span>' : ''}</header>
<div class="wrap">${nav}${opts.noCard ? inner : '<div class="card">' + inner + '</div>'}
<p class="muted" style="font-size:12px">HexaPay is a fictional training gateway. All money, people and banks are fake seed data. Local use only.</p>
</div>${chatWidget()}</body></html>`;
}
function gatePage(err) {
  const inner = `<h2>🔒 LAB ${LAB_NUMBER} — ${LAB_NAME} is locked</h2>
  <p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
  ${err ? '<p class="bad">' + esc(err) + '</p>' : ''}
  <form method="POST" action="/unlock"><input name="key" placeholder="Completion key from Lab ${LAB_NUMBER - 1}" autocomplete="off">
  <button>Unlock Lab ${LAB_NUMBER}</button></form>`;
  return layout('Locked', null, inner);
}

/* ============================ AUTH ROUTES ============================ */
function loginPage(err) {
  return layout('Login', null, `<h2>Merchant Login</h2>
  ${err ? '<p class="bad">' + esc(err) + '</p>' : ''}
  <form method="POST" action="/login">
    <label>Email</label><input name="email" type="text" autocomplete="off">
    <label>Password</label><input name="password" type="password">
    <button>Log in</button></form>
  <p><a href="/forgot">Forgot password?</a> · <a href="/register">Create a merchant account</a></p>
  <p class="muted">Demo accounts — maya@novashop.test / maya123 (owner) · leo@novashop.test / leo123 (staff) · ivan@pixelmart.test / ivan123 (owner) · sara@pixelmart.test / sara123 (staff)</p>`);
}
async function handleLogin(req, res) {
  const b = await readBody(req);
  bump('Login & Authentication');
  const email = String(b.email || ''), password = String(b.password || '');
  const ip = ipOf(req);
  /* VULNERABLE (auth-sqli): the "legacy" login builds a query string and any
   * tautology pattern in the input makes the WHERE clause always true. */
  const inj = /('|--|'|;)\s*(or|and)?\s*'?[\w]*'?\s*=\s*'?\w*'?/i.test(email + ' ' + password) && /('|--|or\s|and\s)/i.test(email + ' ' + password) && (email.includes("'") || password.includes("'"));
  if (inj) {
    const admin = users.find(u => u.role === 'admin');
    pass('auth-sqli');
    setSession(res, admin);
    return redirect(res, '/admin');
  }
  const user = userByEmail(email);
  if (!user) {
    enumProbe[ip] = enumProbe[ip] || {};
    enumProbe[ip].unknown = true;
    if (enumProbe[ip].unknown && enumProbe[ip].wrongPw) pass('auth-enum');
    return send(res, 200, loginPage('No account found for that email address.'));
  }
  if (user.password !== password) {
    enumProbe[ip] = enumProbe[ip] || {};
    enumProbe[ip].wrongPw = true;
    if (enumProbe[ip].unknown && enumProbe[ip].wrongPw) pass('auth-enum');
    const bk = ip + '|' + user.email;
    bruteProbe[bk] = (bruteProbe[bk] || 0) + 1;
    if (bruteProbe[bk] >= 10) pass('auth-brute'); // 10th failure still processed: no throttle
    return send(res, 200, loginPage('Incorrect password for that account.'));
  }
  if (user.isDefault && password === 'admin123') pass('auth-default');
  setSession(res, user);
  redirect(res, user.role === 'admin' ? '/admin' : '/dashboard');
}
function registerPage(err) {
  return layout('Register', null, `<h2>Create a Merchant Account</h2>
  ${err ? '<p class="bad">' + esc(err) + '</p>' : ''}
  <form method="POST" action="/register">
    <label>Your name</label><input name="name" autocomplete="off">
    <label>Business name</label><input name="business" autocomplete="off">
    <label>Email</label><input name="email" autocomplete="off">
    <label>Password</label><input name="password" type="password">
    <button>Create account</button></form>
  <p><a href="/login">Already registered? Log in</a></p>`);
}
async function handleRegister(req, res) {
  const b = await readBody(req);
  bump('Registration & Profile');
  const email = String(b.email || '').toLowerCase();
  if (!email || !b.password) return send(res, 200, registerPage('Email and password are required.'));
  if (userByEmail(email)) return send(res, 200, registerPage('That email is already registered.'));
  if (/<script|<img[^>]*onerror|<svg[^>]*onload|onerror\s*=/i.test(String(b.business || ''))) pass('reg-xss');
  const merchant = { id: 'm' + nextMerchantSeq, name: String(b.business || 'New Store'), ownerId: nextUserId,
    balance: 0, payoutIban: 'DE00000000000000000000', payoutName: String(b.business || ''), plan: 'starter',
    whUrl: '', whSecret: 'whsec_new_' + nextMerchantSeq + 'x', keys: [
      { key: 'pk_live_new_' + nextMerchantSeq + 'a', type: 'publishable', scope: 'public' },
      { key: 'sk_live_new_' + nextMerchantSeq + '_read', type: 'secret', scope: 'read' },
      { key: 'sk_live_new_' + nextMerchantSeq + '_write', type: 'secret', scope: 'write' } ] };
  nextMerchantSeq++;
  const user = { id: nextUserId++, email, password: String(b.password), name: String(b.name || 'Merchant'), role: 'owner', merchantId: merchant.id };
  /* VULNERABLE (reg-massassign): every extra submitted field is copied onto
   * the new records — role, balance, plan included. */
  for (const k of Object.keys(b)) {
    if (['email', 'password', 'name', 'business'].includes(k)) continue;
    if (k === 'role' || k === 'balance' || k === 'plan' || k === 'isDefault') {
      const v = b[k];
      if (k === 'balance') { merchant.balance = Number(v) || 0; if (merchant.balance !== 0) pass('reg-massassign'); }
      else if (k === 'role') { user.role = String(v); if (user.role === 'admin') pass('reg-massassign'); }
      else if (k === 'plan') merchant.plan = String(v);
    }
  }
  if (String(b.password).length < 4) pass('reg-weakpw');
  merchants.push(merchant);
  users.push(user);
  setSession(res, user);
  redirect(res, '/dashboard');
}
function forgotPage(msg) {
  return layout('Forgot password', null, `<h2>Forgot Password</h2>
  ${msg ? '<p>' + msg + '</p>' : ''}
  <form method="POST" action="/forgot"><label>Email</label><input name="email" autocomplete="off"><button>Send reset token</button></form>
  <p><a href="/login">Back to login</a></p>`);
}
function resetTokenFor(user) {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0'), mm = String(d.getMonth() + 1).padStart(2, '0');
  return 'rst-' + user.id + '-' + dd + mm; // VULNERABLE (auth-reset): fully predictable
}
async function handleForgot(req, res) {
  const b = await readBody(req);
  bump('Login & Authentication');
  const user = userByEmail(b.email);
  if (!user) return send(res, 200, forgotPage('No account exists for that email, so no reset was sent.'));
  const tok = resetTokenFor(user);
  issuedResetTokens[user.id] = tok;
  // Training lab: the "emailed" token is shown on screen so testers can study its format.
  return send(res, 200, forgotPage('Reset token issued for ' + esc(user.email) + ': <code>' + esc(tok) + '</code> — now open <a href="/reset">/reset</a>.'));
}
function resetPage(msg) {
  return layout('Reset password', null, `<h2>Reset Password</h2>
  ${msg ? '<p>' + msg + '</p>' : ''}
  <form method="POST" action="/reset">
    <label>Email</label><input name="email" autocomplete="off">
    <label>Reset token</label><input name="token" autocomplete="off">
    <label>New password</label><input name="password" type="password">
    <button>Reset password</button></form>`);
}
async function handleReset(req, res) {
  const b = await readBody(req);
  bump('Login & Authentication');
  const user = userByEmail(b.email);
  if (!user) return send(res, 200, resetPage('No such account.'));
  const expected = resetTokenFor(user);
  if (String(b.token || '') !== expected) return send(res, 200, resetPage('Invalid reset token.'));
  /* Token matches the predictable formula. If it was never issued via /forgot
   * for this user, the attacker computed it — that is the exploit. */
  if (issuedResetTokens[user.id] !== String(b.token)) pass('auth-reset');
  user.password = String(b.password || 'x');
  delete issuedResetTokens[user.id];
  return send(res, 200, resetPage('Password updated. <a href="/login">Log in</a> with the new password.'));
}

/* ============================ UNLOCK & PROGRESS API ============================ */
async function handleUnlock(req, res) {
  const b = await readBody(req);
  const key = String(b.key || '');
  if (!entryKeyMatches(key)) return send(res, 403, gatePage('That key was not accepted. Check the completion key from Lab ' + (LAB_NUMBER - 1) + ' and try again.'));
  state.unlocked = true;
  saveState();
  redirect(res, '/login');
}
function handleProgressApi(req, res) {
  sendJson(res, 200, { lab: LAB_NAME, number: LAB_NUMBER, total: totalTests(), done: doneCount(), pct: pct(), features: featureStats(), complete: isComplete() });
}

/* ============================ LAB COACH CHATBOT ============================ */
const FEATURE_KEYS = [
  ['Login & Authentication', ['login', 'auth', 'password', 'brute', 'reset token', 'enumerat', 'cookie', 'sign in', 'sqli', 'sql']],
  ['Registration & Profile', ['regist', 'sign up', 'signup', 'profile', 'settings', 'csrf', 'mass assign', 'business name']],
  ['Checkout & Payment Links', ['checkout', 'payment link', 'link', 'amount', 'currency', 'quantity', 'price']],
  ['Transactions & Receipts', ['transaction', 'receipt', 'idor']],
  ['Refunds', ['refund']],
  ['Webhooks', ['webhook', 'signature', 'whsec']],
  ['API & API Keys', ['api', 'api key', 'scope', 'publishable', 'bearer', 'charge']],
  ['Payouts & Balance', ['payout', 'balance', 'iban', 'bank']],
  ['Platform & Admin', ['debug', 'platform', 'admin panel', 'misconfig']],
];
function chatReply(rawMsg) {
  const msg = String(rawMsg || '').toLowerCase();
  const stats = featureStats();
  if (/who (built|made|created)|founder|md\.? ?jony|hexacyberlab/.test(msg) && !/how|test|vulnerab/.test(msg)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (/(completion )?key|unlock (the )?next|next lab/.test(msg)) {
    if (isComplete() && state.keyRevealed) return 'You completed LAB ' + LAB_NUMBER + ' — here is the completion key for the next lab: ' + completionKey();
    return 'I do not have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at ' + pct() + '%. Finish all ' + totalTests() + ' tests and I will share it.';
  }
  if (/progress|how (am i|much)|score|percent/.test(msg)) {
    return 'You have completed ' + doneCount() + ' of ' + totalTests() + ' tests (' + pct() + '%). ' + (isComplete() ? 'The lab is complete — see /complete for your debrief, key and certificate.' : 'Open /tests to see what is still open.');
  }
  // Feature detection
  let feature = null;
  for (const [f, keys] of FEATURE_KEYS) if (keys.some(k => msg.includes(k))) { feature = f; break; }
  const asksHow = /how|guide|step|exploit|solve|do the|test for|walkthrough|help/.test(msg);
  const asksCount = /how many|which|what (tests|vulnerab)|list|features?/.test(msg);
  if (feature && (asksCount || !asksHow)) {
    const ftests = TESTS.filter(t => t.feature === feature);
    const s = stats[feature];
    return 'The ' + feature + ' feature has ' + ftests.length + ' tests (' + s.done + ' done, ' + s.attempts + ' attempt(s) so far): ' + ftests.map(t => t.name + (state.tests[t.id] ? ' ✓' : '')).join('; ') + '. Ask me HOW to test it after you have tried that feature at least 3 times.';
  }
  if (asksHow) {
    const f = feature || (TESTS.find(t => !state.tests[t.id]) || {}).feature;
    if (!f) return 'Everything is done — see /complete for the debrief and your completion key.';
    const attempts = state.attempts[f] || 0;
    const ftests = TESTS.filter(t => t.feature === f);
    const openGuides = ftests.filter(t => !state.tests[t.id]).map(t => '• ' + t.name + ': ' + t.guide).join(' ');
    const anyPassed = ftests.some(t => state.tests[t.id]);
    if (attempts >= 3 || anyPassed) {
      return 'Here is the step-by-step for ' + f + ' (attempts on this feature: ' + attempts + '): ' + (openGuides || 'All tests in this feature are already done ✓.');
    }
    return "That feature is locked for help. First try the " + f + " tests yourself at least 3 times — I can see you've tried " + attempts + " time(s) so far. After 3 real tries, ask me again and I'll guide you step by step.";
  }
  if (/feature|cover|scope|vulnerab|tests/.test(msg)) {
    return LAB_NAME + ' has ' + Object.keys(stats).length + ' features and ' + totalTests() + ' scored tests: ' + Object.entries(stats).map(([f, s]) => f + ' (' + s.total + ')').join(', ') + '. Which feature do you want to explore?';
  }
  if (/next|what (should|to do)|start|begin/.test(msg)) {
    const nxt = TESTS.find(t => !state.tests[t.id]);
    if (!nxt) return 'All tests are complete! Visit /complete for your summary, completion key and certificate.';
    return 'Next open test: "' + nxt.name + '" in ' + nxt.feature + ' (' + nxt.difficulty + '). Open /tests for its graded hints, try it yourself, and ask me after 3 attempts on that feature if you get stuck.';
  }
  if (/hi|hello|hey/.test(msg)) {
    return 'Hello! I am the Lab Coach for LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ', a payment gateway full of realistic money bugs. You are at ' + pct() + '%. Open /tests to see the mission list, or ask me about any feature.';
  }
  return 'I can help with: what this lab covers (ask about a feature), your progress, what to try next, and step-by-step guidance for a feature once you have tried it at least 3 times. The mission list lives at /tests with graded hints for every test.';
}
async function handleChat(req, res) {
  const b = await readBody(req);
  sendJson(res, 200, { reply: chatReply(b.message) });
}

/* ============================ APP ROUTES ============================ */
function money(n) { return '$' + Number(n || 0).toFixed(2); }
function requireLogin(req, res) {
  const sess = sessionOf(req);
  if (!sess) { redirect(res, '/login'); return null; }
  return sess;
}
function dashboardPage(req, res, sess) {
  const m = merchantById(sess.mid);
  if (sess.user.role === 'admin' || !m) return redirect(res, '/admin');
  const my = txns.filter(t => t.merchantId === m.id);
  const rows = my.map(t => `<tr><td>${t.id}</td><td>${esc(t.customer)}</td><td>${money(t.amount)} ${esc(t.currency)}</td><td>${esc(t.status)}</td></tr>`).join('');
  // NOTE (reg-xss): merchant business name is rendered UNESCAPED by design.
  send(res, 200, layout('Dashboard', sess, `<h2>Welcome, ${m.name}</h2>
    <p>Balance available for payout: <strong>${money(m.balance)}</strong> · Plan: ${esc(m.plan)} · Payout account: ${esc(m.payoutIban)}</p>
    <h3>Recent transactions</h3><table><tr><th>ID</th><th>Customer</th><th>Amount</th><th>Status</th></tr>${rows || '<tr><td colspan="4">None yet</td></tr>'}</table>
    <p><a class="btn" href="/links">Create / manage payment links</a> <a class="btn" href="/payouts">Request payout</a></p>`));
}
function linksPage(req, res, sess) {
  const all = links.map(l => {
    const mine = l.merchantId === sess.mid;
    return `<tr><td>${l.id}</td><td>${esc(l.name)}</td><td>${money(l.price)} ${esc(l.currency)}</td><td>${l.active ? 'active' : 'disabled'}</td><td>${mine ? 'yours' : esc((merchantById(l.merchantId) || {}).name || '')}</td>
    <td><a href="/checkout/${l.id}">pay page</a></td>
    <td><form method="POST" action="/links/${l.id}/update" style="display:flex;gap:4px"><input name="price" type="number" step="0.01" placeholder="new price" style="width:110px;margin:0"><button>Set price</button></form>
    <form method="POST" action="/links/${l.id}/update"><input type="hidden" name="active" value="0"><button>Disable</button></form></td></tr>`;
  }).join('');
  send(res, 200, layout('Payment Links', sess, `<h2>Payment Links</h2>
  <p class="muted">All links on the gateway (support view). Your checkout pages are public once the lab is unlocked.</p>
  <table><tr><th>ID</th><th>Name</th><th>Price</th><th>Status</th><th>Owner</th><th>Checkout</th><th>Manage</th></tr>${all}</table>
  <h3>Create a link</h3><form method="POST" action="/links/create"><label>Name</label><input name="name"><label>Price (USD)</label><input name="price" type="number" step="0.01"><button>Create link</button></form>`));
}
async function handleLinkCreate(req, res, sess) {
  const b = await readBody(req);
  bump('Checkout & Payment Links');
  links.push({ id: 'L-' + (nextLinkSeq++), merchantId: sess.mid, name: String(b.name || 'Untitled'), price: Number(b.price) || 0, currency: 'USD', active: true });
  redirect(res, '/links');
}
async function handleLinkUpdate(req, res, sess, linkId) {
  const b = await readBody(req);
  bump('Checkout & Payment Links');
  const link = links.find(l => l.id === linkId);
  if (!link) return send(res, 404, layout('Not found', sess, '<h2>Link not found</h2>'));
  /* VULNERABLE (link-idor): no ownership check before applying the change. */
  let changed = false;
  if (b.price !== undefined && b.price !== '') { link.price = Number(b.price); changed = true; }
  if (b.active !== undefined) { link.active = String(b.active) === '1'; changed = true; }
  if (b.name) { link.name = String(b.name); changed = true; }
  if (changed && link.merchantId !== sess.mid) pass('link-idor');
  redirect(res, '/links');
}
function checkoutPage(req, res, linkId, msg) {
  const link = links.find(l => l.id === linkId);
  if (!link) return send(res, 404, layout('Not found', null, '<h2>Payment link not found</h2>'));
  const sess = sessionOf(req);
  send(res, 200, layout('Checkout', sess, `<h2>Pay ${esc((merchantById(link.merchantId) || {}).name || '')}</h2>
  <p><strong>${esc(link.name)}</strong> — ${money(link.price)} ${esc(link.currency)}</p>
  ${msg ? '<p class="ok">' + esc(msg) + '</p>' : ''}
  <form method="POST" action="/checkout/${link.id}">
    <label>Your email</label><input name="customer" value="you@buyer.test">
    <label>Quantity</label><input name="qty" type="number" value="1">
    <label>Amount (${esc(link.currency)})</label><input name="amount" type="number" step="0.01" value="${link.price}">
    <label>Currency</label><input name="currency" value="${esc(link.currency)}">
    <button>Pay now (simulated)</button></form>
  <p class="muted">Simulated checkout — no real card is ever asked for or charged.</p>`));
}
async function handleCheckout(req, res, linkId) {
  const b = await readBody(req);
  bump('Checkout & Payment Links');
  const link = links.find(l => l.id === linkId);
  if (!link || !link.active) return send(res, 404, layout('Not found', null, '<h2>Payment link not found or disabled</h2>'));
  const qty = b.qty === undefined || b.qty === '' ? 1 : Number(b.qty);
  const expected = link.price * qty;
  let amount = expected;
  /* VULNERABLE (chk-amount): a client-sent amount replaces the server truth. */
  if (b.amount !== undefined && b.amount !== '' && !isNaN(Number(b.amount))) {
    amount = Number(b.amount);
    if (amount !== expected) pass('chk-amount');
  }
  /* VULNERABLE (chk-negative): quantity is never bounds-checked. */
  if (!isNaN(qty) && qty <= 0) { pass('chk-negative'); amount = expected; }
  /* VULNERABLE (chk-currency): posted currency settles as if it were the link currency. */
  const currency = String(b.currency || link.currency).toUpperCase();
  if (currency !== link.currency) pass('chk-currency');
  const m = merchantById(link.merchantId);
  const txn = { id: nextTxnId++, merchantId: link.merchantId, linkId: link.id, customer: String(b.customer || 'guest@buyer.test'), amount, currency: link.currency, status: 'paid', refunded: 0, via: 'checkout' };
  txns.push(txn);
  if (m) m.balance += amount;
  checkoutPage(req, res, linkId, 'Payment complete — transaction #' + txn.id + ' for ' + money(amount) + ' ' + link.currency + '.');
}
function transactionsPage(req, res, sess) {
  const all = txns.map(t => `<tr><td><a href="/transactions/${t.id}">${t.id}</a></td><td>${esc((merchantById(t.merchantId) || {}).name || '')}</td><td>${esc(t.customer)}</td><td>${money(t.amount)} ${esc(t.currency)}</td><td>${esc(t.status)}</td><td>refunded ${money(t.refunded)}</td><td><a href="/receipts/${t.id}">receipt</a></td></tr>`).join('');
  send(res, 200, layout('Transactions', sess, `<h2>Transactions</h2><p class="muted">Gateway-wide ledger view.</p>
  <table><tr><th>ID</th><th>Merchant</th><th>Customer</th><th>Amount</th><th>Status</th><th></th><th></th></tr>${all}</table>`));
}
function transactionDetail(req, res, sess, id) {
  bump('Transactions & Receipts');
  const t = txns.find(x => x.id === id);
  if (!t) return send(res, 404, layout('Not found', sess, '<h2>Transaction not found</h2>'));
  /* VULNERABLE (txn-idor): any logged-in merchant can read any transaction. */
  if (sess.mid && t.merchantId !== sess.mid) pass('txn-idor');
  const trefunds = refunds.filter(r => r.txnId === t.id).map(r => `<tr><td>${r.id}</td><td>${money(r.amount)}</td><td>by user ${r.by}</td></tr>`).join('');
  send(res, 200, layout('Transaction ' + t.id, sess, `<h2>Transaction #${t.id}</h2>
  <table>
    <tr><td>Merchant</td><td>${esc((merchantById(t.merchantId) || {}).name || '')}</td></tr>
    <tr><td>Customer</td><td>${esc(t.customer)}</td></tr>
    <tr><td>Amount</td><td>${money(t.amount)} ${esc(t.currency)}</td></tr>
    <tr><td>Status</td><td>${esc(t.status)}</td></tr>
    <tr><td>Refunded so far</td><td>${money(t.refunded)}</td></tr>
    <tr><td>Via</td><td>${esc(t.via)}</td></tr></table>
  <h3>Refunds</h3><table>${trefunds || '<tr><td>None</td></tr>'}</table>
  <h3>Issue a refund</h3>
  <form method="POST" action="/transactions/${t.id}/refund"><label>Refund amount</label><input name="amount" type="number" step="0.01"><button>Refund</button></form>
  <p><a href="/receipts/${t.id}">View receipt</a></p>`));
}
function receiptPage(req, res, sess, id) {
  bump('Transactions & Receipts');
  const t = txns.find(x => x.id === id);
  if (!t) return send(res, 404, layout('Not found', sess, '<h2>Receipt not found</h2>'));
  /* VULNERABLE (receipt-idor): receipts served with no ownership check. */
  if (sess.mid && t.merchantId !== sess.mid) pass('receipt-idor');
  send(res, 200, layout('Receipt ' + t.id, sess, `<h2>🧾 Receipt #${t.id}</h2>
  <table><tr><td>Sold by</td><td>${esc((merchantById(t.merchantId) || {}).name || '')}</td></tr>
  <tr><td>Billed to</td><td>${esc(t.customer)}</td></tr>
  <tr><td>Item</td><td>${esc((links.find(l => l.id === t.linkId) || {}).name || t.via)}</td></tr>
  <tr><td>Total paid</td><td>${money(t.amount)} ${esc(t.currency)}</td></tr>
  <tr><td>Status</td><td>${esc(t.status)}</td></tr></table>`));
}
async function handleRefund(req, res, sess, id) {
  const b = await readBody(req);
  bump('Refunds');
  const t = txns.find(x => x.id === id);
  if (!t) return send(res, 404, layout('Not found', sess, '<h2>Transaction not found</h2>'));
  const amount = Number(b.amount);
  if (!amount || amount <= 0) return redirect(res, '/transactions/' + id);
  /* VULNERABLE on three axes at once: no ownership check (refund-cross),
   * no cap against the captured amount (refund-over), no state check on an
   * already fully-refunded transaction (refund-double). */
  if (sess.mid && t.merchantId !== sess.mid) pass('refund-cross');
  const wasFullyRefunded = t.refunded >= t.amount;
  refunds.push({ id: nextRefundId++, txnId: t.id, amount, by: sess.user.id });
  t.refunded += amount;
  if (wasFullyRefunded) pass('refund-double');
  if (t.refunded > t.amount) pass('refund-over');
  t.status = t.refunded >= t.amount ? 'refunded' : 'partially_refunded';
  const m = merchantById(t.merchantId);
  if (m) m.balance -= amount;
  redirect(res, '/transactions/' + id);
}
function webhooksPage(req, res, sess) {
  const m = merchantById(sess.mid);
  if (!m) return redirect(res, '/admin');
  send(res, 200, layout('Webhooks', sess, `<h2>Webhook Endpoints</h2>
  <table><tr><td>Endpoint URL</td><td>${esc(m.whUrl || '(not set)')}</td></tr>
  <tr><td>Signing secret</td><td><code>whsec_••••••••</code> <span class="muted">(visible to the owner in the API config)</span></td></tr>
  <tr><td>Inbound receiver</td><td><code>POST /webhooks/receive</code> — the processor pushes payment events here.</td></tr></table>
  <p class="muted">Events are signed with HMAC-SHA256 in the <code>x-hexapay-signature</code> header.</p>`));
}
function apiKeysPage(req, res, sess) {
  const m = merchantById(sess.mid);
  if (!m) return redirect(res, '/admin');
  const rows = m.keys.map(k => `<tr><td><code>${esc(k.key)}</code></td><td>${esc(k.type)}</td><td>${esc(k.scope)}</td></tr>`).join('');
  send(res, 200, layout('API Keys', sess, `<h2>API Keys — ${esc(m.name)}</h2>
  <table><tr><th>Key</th><th>Type</th><th>Scope</th></tr>${rows}</table>
  <p class="muted">Publishable keys (pk_) are safe to embed in web pages. Secret keys (sk_) must stay on your server. Use <code>Authorization: Bearer &lt;key&gt;</code> on /api/balance, /api/charges, /api/webhooks/config.</p>`));
}
function payoutsPage(req, res, sess, msg) {
  const m = merchantById(sess.mid);
  if (!m) return redirect(res, '/admin');
  const mine = payouts.filter(p => p.merchantId === m.id).map(p => `<tr><td>${p.id}</td><td>${money(p.amount)}</td><td>${esc(p.iban)}</td><td>${esc(p.status)}</td></tr>`).join('');
  send(res, 200, layout('Payouts', sess, `<h2>Payouts — ${esc(m.name)}</h2>
  ${msg ? '<p class="ok">' + esc(msg) + '</p>' : ''}
  <p>Available balance: <strong>${money(m.balance)}</strong> · Saved payout account: <code>${esc(m.payoutIban)}</code> (${esc(m.payoutName)})</p>
  <table><tr><th>ID</th><th>Amount</th><th>Destination IBAN</th><th>Status</th></tr>${mine}</table>
  <h3>Request a payout</h3>
  <form method="POST" action="/payouts"><label>Amount</label><input name="amount" type="number" step="0.01">
  <label>Destination IBAN (leave blank to use the saved account)</label><input name="iban" autocomplete="off">
  <button>Send payout</button></form>`));
}
async function handlePayout(req, res, sess) {
  const b = await readBody(req);
  bump('Payouts & Balance');
  const m = merchantById(sess.mid);
  if (!m) return redirect(res, '/dashboard');
  const amount = Number(b.amount);
  if (!amount) return payoutsPage(req, res, sess, '');
  /* VULNERABLE (payout-dest): destination can be overridden by the request. */
  const iban = b.iban ? String(b.iban) : m.payoutIban;
  if (b.iban && iban !== m.payoutIban) pass('payout-dest');
  /* VULNERABLE (payout-overdraw): balance is never checked. */
  if (amount > m.balance) pass('payout-overdraw');
  payouts.push({ id: nextPayoutId++, merchantId: m.id, amount, iban, status: 'sent' });
  m.balance -= amount;
  payoutsPage(req, res, sess, 'Payout of ' + money(amount) + ' sent to ' + iban + '.');
}
function settingsPage(req, res, sess, msg) {
  const m = merchantById(sess.mid);
  send(res, 200, layout('Settings', sess, `<h2>Settings</h2>
  ${msg ? '<p class="ok">' + esc(msg) + '</p>' : ''}
  <form method="POST" action="/settings">
    <label>Your name</label><input name="name" value="${esc(sess.user.name)}">
    <label>Contact email</label><input name="email" value="${esc(sess.user.email)}">
    ${m ? '<label>Business name</label><input name="business" value="' + esc(m.name) + '">' : ''}
    <button>Save settings</button></form>
  ${m ? '<p class="muted">Payout account on file: <code>' + esc(m.payoutIban) + '</code></p>' : ''}`));
}
async function handleSettings(req, res, sess) {
  const b = await readBody(req);
  bump('Registration & Profile');
  /* VULNERABLE (reg-csrf): no CSRF token is ever verified. The app sets an
   * hx_origin marker cookie on its own pages; a state-changing POST that
   * arrives without it (or with a foreign Origin) is a cross-site request. */
  const cookies = parseCookies(req);
  const origin = req.headers.origin || req.headers.referer || '';
  const foreign = origin && !/127\.0\.0\.1|localhost/.test(origin);
  let changed = false;
  if (b.name && b.name !== sess.user.name) { sess.user.name = String(b.name); changed = true; }
  if (b.email && b.email !== sess.user.email) { sess.user.email = String(b.email).toLowerCase(); changed = true; }
  const m = merchantById(sess.mid);
  if (m && b.business !== undefined && b.business !== m.name) {
    if (/<script|<img[^>]*onerror|<svg[^>]*onload|onerror\s*=/i.test(String(b.business))) pass('reg-xss');
    m.name = String(b.business); changed = true;
  }
  if (changed && (!cookies.hx_origin || foreign)) pass('reg-csrf');
  settingsPage(req, res, sess, changed ? 'Settings saved.' : 'Nothing changed.');
}
function adminPage(req, res, sess) {
  bump('Login & Authentication');
  /* VULNERABLE (auth-cookie): /admin trusts the role inside the cookie. */
  if (sess.role !== 'admin') return send(res, 403, layout('Forbidden', sess, '<h2>403 — platform admins only</h2>'));
  if (sess.user.role !== 'admin') pass('auth-cookie');
  const mrows = merchants.map(m => `<tr><td>${m.id}</td><td>${m.name}</td><td>${money(m.balance)}</td><td>${esc(m.plan)}</td><td>${esc(m.payoutIban)}</td></tr>`).join('');
  const urows = users.map(u => `<tr><td>${u.id}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td>${esc(u.merchantId || '—')}</td></tr>`).join('');
  send(res, 200, layout('Platform Admin', sess, `<h2>Platform Admin</h2>
  <h3>Merchants</h3><table><tr><th>ID</th><th>Business</th><th>Balance</th><th>Plan</th><th>Payout IBAN</th></tr>${mrows}</table>
  <h3>Users</h3><table><tr><th>ID</th><th>Email</th><th>Role</th><th>Merchant</th></tr>${urows}</table>`));
}
function debugPage(req, res, sess) {
  bump('Platform & Admin');
  pass('plat-debug');
  /* VULNERABLE (plat-debug): a leftover diagnostics dump, live in production. */
  sendJson(res, 200, { debug: true, users: users.map(u => ({ id: u.id, email: u.email, password: u.password, role: u.role })),
    merchants: merchants.map(m => ({ id: m.id, name: m.name, balance: m.balance, whSecret: m.whSecret, keys: m.keys.map(k => k.key) })) });
}

/* ============================ API ROUTES ============================ */
function apiKeyAuth(req) {
  const h = req.headers.authorization || '';
  const token = h.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  for (const m of merchants) for (const k of m.keys) if (k.key === token) return { merchant: m, key: k };
  return null;
}
function handleApiBalance(req, res) {
  bump('API & API Keys');
  const a = apiKeyAuth(req);
  if (!a) return sendJson(res, 401, { error: 'invalid API key' });
  /* VULNERABLE (api-keyconfusion): publishable keys authenticate here too. */
  if (a.key.type === 'publishable') pass('api-keyconfusion');
  sendJson(res, 200, { merchant: a.merchant.id, balance: a.merchant.balance, currency: 'USD' });
}
async function handleApiCharges(req, res) {
  bump('API & API Keys');
  const a = apiKeyAuth(req);
  if (!a) return sendJson(res, 401, { error: 'invalid API key' });
  if (a.key.type === 'publishable') return sendJson(res, 403, { error: 'publishable keys cannot create charges' });
  const b = await readBody(req);
  const amount = Number(b.amount) || 0;
  /* VULNERABLE (api-scope): scope is never checked — a read key can write. */
  if (a.key.scope === 'read') pass('api-scope');
  const txn = { id: nextTxnId++, merchantId: a.merchant.id, linkId: null, customer: String(b.customer || 'api@buyer.test'), amount, currency: 'USD', status: 'paid', refunded: 0, via: 'api' };
  txns.push(txn);
  a.merchant.balance += amount;
  sendJson(res, 200, { id: txn.id, amount: txn.amount, status: txn.status });
}
function handleApiWebhookConfig(req, res) {
  bump('Webhooks');
  const sess = sessionOf(req);
  if (!sess) return sendJson(res, 401, { error: 'login required' });
  const m = merchantById(sess.mid);
  if (!m) return sendJson(res, 404, { error: 'no merchant' });
  /* VULNERABLE (wh-secret): the signing secret is returned to ANY role. */
  if (sess.user.role !== 'owner' && sess.user.role !== 'admin') pass('wh-secret');
  sendJson(res, 200, { url: m.whUrl, signing_secret: m.whSecret, events: ['payment.succeeded', 'payment.refunded'] });
}
async function handleWebhookReceive(req, res) {
  bump('Webhooks');
  const b = await readBody(req);
  const m = merchantById(b.merchant);
  if (!m) return sendJson(res, 404, { error: 'unknown merchant' });
  /* The signature SHOULD be HMAC-SHA256(rawBody, m.whSecret) — it is never
   * checked (wh-forge). The event is processed purely on trust. */
  const sig = req.headers['x-hexapay-signature'] || '';
  const expected = crypto.createHmac('sha256', m.whSecret).update(JSON.stringify(b)).digest('hex');
  if (b.type === 'payment.succeeded' && Number(b.amount) > 0) {
    m.balance += Number(b.amount);
    txns.push({ id: nextTxnId++, merchantId: m.id, linkId: null, customer: String(b.customer || 'webhook@processor.test'), amount: Number(b.amount), currency: 'USD', status: 'paid', refunded: 0, via: 'webhook' });
    if (sig !== expected) pass('wh-forge');
    return sendJson(res, 200, { received: true });
  }
  sendJson(res, 200, { received: true, ignored: true });
}

/* ============================ /tests, /complete, /certificate ============================ */
function testsPage(req, res, sess) {
  const stats = featureStats();
  let html = `<h2>🎯 Mission — LAB ${LAB_NUMBER} ${LAB_NAME}</h2>
  <p>${doneCount()}/${totalTests()} tests complete · ${pct()}% · Progress is saved automatically and survives restarts.</p>`;
  for (const [feature, s] of Object.entries(stats)) {
    html += `<h3>${esc(feature)} <span class="muted">(${s.done}/${s.total} · attempts: ${s.attempts})</span></h3>`;
    for (const t of TESTS.filter(x => x.feature === feature)) {
      const done = !!state.tests[t.id];
      html += `<div style="border:1px solid #1f2937;border-radius:10px;padding:10px;margin:8px 0">
        <strong>${done ? '✓' : '○'} ${esc(t.name)}</strong> <span class="muted">${esc(t.owasp)} · ${esc(t.difficulty)} · ${esc(t.where)}</span>
        <div>${t.hints.map((h, i) => `<button type="button" onclick="var e=document.getElementById('${t.id}h${i}');e.style.display=e.style.display==='none'?'block':'none'">Hint ${i + 1}</button> <span id="${t.id}h${i}" style="display:none">${esc(h)}</span>`).join(' ')}</div>
      </div>`;
    }
  }
  send(res, 200, layout('Mission', sess, html));
}
function completePage(req, res, sess) { if (!sess) sess = { user: { name: 'Security Tester', email: '', id: 0 } };
  if (!isComplete()) {
    const left = TESTS.filter(t => !state.tests[t.id]).map(t => '<li>' + esc(t.name) + ' <span class="muted">(' + esc(t.feature) + ')</span></li>').join('');
    return send(res, 200, layout('Not yet', sess, `<h2>Lab not complete yet — ${pct()}%</h2><p>Still open:</p><ul>${left}</ul><p><a href="/tests">Back to the mission list</a></p>`));
  }
  const stats = featureStats();
  const featuresHtml = Object.entries(stats).map(([f, s]) => `<tr><td>${esc(f)}</td><td>${s.total}</td><td>${s.done}</td><td>${s.attempts}</td></tr>`).join('');
  const lessons = TESTS.map(t => `<li><strong>${esc(t.name)}:</strong> ${esc(t.lesson)}</li>`).join('');
  const impacts = TESTS.map(t => `<li><strong>${esc(t.name)}:</strong> ${esc(t.impact)}</li>`).join('');
  const reports = TESTS.map(t => `<li><strong>${esc(t.report.title)}</strong> — Severity: ${esc(t.report.severity)}. Fix: ${esc(t.report.remediation)}</li>`).join('');
  send(res, 200, layout('Complete', sess, `<h2>🏁 LAB ${LAB_NUMBER} — ${LAB_NAME} COMPLETE</h2>
  <h3>1 · Features in this lab: ${Object.keys(stats).length}</h3>
  <table><tr><th>Feature</th><th>Tests</th><th>Done</th><th>Attempts</th></tr>${featuresHtml}</table>
  <h3>2 · Ways testing was done: ${totalTests()} techniques</h3><p>${TESTS.map(t => esc(t.name)).join(' · ')}</p>
  <h3>3 · What you learned</h3><ul>${lessons}</ul>
  <h3>4 · What this means for a real client</h3><ul>${impacts}</ul>
  <h3>5 · Writing it in a real report</h3><ul>${reports}</ul>
  <h3>6 · Your completion key (unlocks Lab ${LAB_NUMBER + 1})</h3>
  <p style="font-size:20px"><code>${esc(completionKey())}</code></p>
  <form method="POST" action="/tester"><label>Your name for the certificate</label>
  <input name="name" value="${esc(state.testerName)}"><button>Save name</button></form>
  <p><a class="btn" href="/certificate">View your certificate</a></p>`));
}
async function handleTester(req, res) {
  const b = await readBody(req);
  state.testerName = String(b.name || '').slice(0, 80);
  saveState();
  redirect(res, '/complete');
}
function certificatePage(req, res, sess) { if (!sess) sess = { user: { name: 'Security Tester', email: '', id: 0 } };
  if (!isComplete()) return redirect(res, '/complete');
  const name = state.testerName || (sess ? sess.user.name : 'HexaCyberLab Tester');
  const when = state.completedAt ? new Date(state.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const nf = Object.keys(featureStats()).length;
  send(res, 200, `<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER}</title>
  <style>body{font-family:Georgia,serif;background:#f3f4f6;display:flex;justify-content:center;padding:30px}
  .cert{background:#fff;border:3px double #7c3aed;border-radius:14px;max-width:720px;padding:36px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.15)}
  @media print{body{background:#fff}.cert{box-shadow:none}}</style></head><body>
  <div class="cert"><img src="/logo.png" style="height:64px">
  <h1 style="margin:8px 0">Certificate of Completion</h1>
  <p>This certifies that</p><h2 style="color:#4c1d95">${esc(name)}</h2>
  <p>has completed 100% of the security tests in</p>
  <h3>LAB ${LAB_NUMBER} — ${LAB_NAME} (${totalTests()} tests across ${nf} features)</h3>
  <p>Completed on ${esc(when)}</p>
  <p style="margin-top:22px;color:#374151">HexaCyberLab — Built by Md. Jony Hassain, Founder</p>
  <p><a href="/complete">Back to debrief</a></p></div></body></html>`);
}

/* ============ Completion key shards — second region of this file ============ */
const COMPLETION_SHARDS = ["TC1YSA==","Ny0yNA==","RkJDWg==","LUJTQQ==","Nk5XTw==","UkVLSg=="];
function completionKey() { return unshard(COMPLETION_SHARDS); }

/* ============================ ROUTER ============================ */
loadState();
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:' + PORT);
    const p = url.pathname;
    const m = req.method;
    if (p === '/logo.png') {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      return res.end(fs.readFileSync(path.join(DIR, 'logo.png')));
    }
    if (p === '/api/progress' && m === 'GET') return handleProgressApi(req, res);
    if (p === '/api/chat' && m === 'POST') return await handleChat(req, res);
    if (!state.unlocked) {
      if (p === '/unlock' && m === 'POST') return await handleUnlock(req, res);
      if (m === 'GET') return send(res, 200, gatePage());
      return send(res, 403, gatePage());
    }
    /* unlocked below */
    if (p === '/' || p === '/login') {
      if (m === 'POST' && p === '/login') return await handleLogin(req, res);
      const sess = sessionOf(req);
      if (p === '/' && sess) return redirect(res, sess.user.role === 'admin' ? '/admin' : '/dashboard');
      return send(res, 200, loginPage());
    }
    if (p === '/register') { if (m === 'POST') return await handleRegister(req, res); return send(res, 200, registerPage()); }
    if (p === '/forgot') { if (m === 'POST') return await handleForgot(req, res); return send(res, 200, forgotPage()); }
    if (p === '/reset') { if (m === 'POST') return await handleReset(req, res); return send(res, 200, resetPage()); }
    if (p === '/logout') { clearSession(res); return redirect(res, '/login'); }
    if (p === '/webhooks/receive' && m === 'POST') return await handleWebhookReceive(req, res);
    if (p === '/api/balance' && m === 'GET') return handleApiBalance(req, res);
    if (p === '/api/charges' && m === 'POST') return await handleApiCharges(req, res);
    if (p === '/api/webhooks/config' && m === 'GET') return handleApiWebhookConfig(req, res);
    if (p === '/debug' && m === 'GET') return debugPage(req, res, sessionOf(req));
    /* Checkout is the public, customer-facing surface of the gateway — it
     * sits outside the merchant login (but behind the lab gate above). */
    let mm;
    if ((mm = p.match(/^\/checkout\/([\w-]+)$/))) {
      if (m === 'POST') return await handleCheckout(req, res, mm[1]);
      return checkoutPage(req, res, mm[1]);
    }

    const sess = (p === '/complete' || p === '/complete/name' || p === '/certificate' || p === '/tester' || p === '/tester-name' || p === '/set-name') ? sessionOf(req) : requireLogin(req, res);
    if (!sess && p !== '/complete' && p !== '/complete/name' && p !== '/certificate' && p !== '/tester' && p !== '/tester-name' && p !== '/set-name') return;
    if (p === '/dashboard' && m === 'GET') return dashboardPage(req, res, sess);
    if (p === '/links' && m === 'GET') return linksPage(req, res, sess);
    if (p === '/links/create' && m === 'POST') return await handleLinkCreate(req, res, sess);
    if ((mm = p.match(/^\/links\/([\w-]+)\/update$/)) && m === 'POST') return await handleLinkUpdate(req, res, sess, mm[1]);
    if (p === '/transactions' && m === 'GET') return transactionsPage(req, res, sess);
    if ((mm = p.match(/^\/transactions\/(\d+)$/)) && m === 'GET') return transactionDetail(req, res, sess, Number(mm[1]));
    if ((mm = p.match(/^\/transactions\/(\d+)\/refund$/)) && m === 'POST') return await handleRefund(req, res, sess, Number(mm[1]));
    if ((mm = p.match(/^\/receipts\/(\d+)$/)) && m === 'GET') return receiptPage(req, res, sess, Number(mm[1]));
    if (p === '/webhooks' && m === 'GET') return webhooksPage(req, res, sess);
    if (p === '/api-keys' && m === 'GET') return apiKeysPage(req, res, sess);
    if (p === '/payouts' && m === 'GET') return payoutsPage(req, res, sess);
    if (p === '/payouts' && m === 'POST') return await handlePayout(req, res, sess);
    if (p === '/settings' && m === 'GET') return settingsPage(req, res, sess);
    if (p === '/settings' && m === 'POST') return await handleSettings(req, res, sess);
    if (p === '/admin' && m === 'GET') return adminPage(req, res, sess);
    if (p === '/tests' && m === 'GET') return testsPage(req, res, sess);
    if (p === '/complete' && m === 'GET') return completePage(req, res, sess);
    if (p === '/tester' && m === 'POST') return await handleTester(req, res);
    if (p === '/certificate' && m === 'GET') return certificatePage(req, res, sess);
    return send(res, 404, layout('Not found', sess, '<h2>404 — page not found</h2>'));
  } catch (e) {
    try { send(res, 500, 'Internal error (the lab survived).'); } catch (e2) { /* socket gone */ }
  }
});
if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => console.log(LAB_NAME + ' LAB ' + LAB_NUMBER + ' listening on http://127.0.0.1:' + PORT));
}
module.exports = { TESTS };
