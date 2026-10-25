'use strict';
/*
 * HexaWallet — LAB 42 of 110 (Category 5: Finance, Payments & Insurance)
 * A complete digital-wallet business application (accounts, balances,
 * transfers, top-ups, linked cards/banks, KYC) with the full HexaCyberLab
 * lab system: entry-key gate, progress engine, /tests mission page,
 * Lab Coach chatbot (3-try lock), /complete debrief, /certificate.
 * Zero-dependency Node. LOCAL-ONLY training lab — intentionally vulnerable.
 * Binds 127.0.0.1:3051 only. All money, cards and identities are simulated.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3051;
const HOST = '127.0.0.1';
const LAB_NUMBER = 42;
const LAB_NAME = 'HexaWallet';
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const WEB_TRANSFER_LIMIT = 500; // per-transfer limit enforced by the web UI flow

/* ------------------------------------------------------------------ *
 * Key material — shard set A (see also the second shard region far
 * below). Keys are never stored as plain literals anywhere; they are
 * reconstructed at runtime from transformed fragments only.
 * ------------------------------------------------------------------ */

const _kc = ['TC1YSA==', 'SS0zNA==', 'U05BTQ=='];

/* ============================ TESTS registry ============================ */
const TESTS = [
  // ---- Login & Authentication ----
  { id: 'sqli-login', feature: 'Login & Authentication', name: 'SQL injection login bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login form builds its database query by gluing your input straight into the SQL string.', "Try a quote in the email field, then close the condition so it is always true.", "Classic: ' OR '1'='1 in the email field, with any password."],
    lesson: 'String-built SQL queries let an attacker rewrite the login condition itself and walk in as the first account in the table — usually the admin.',
    impact: 'On a real wallet this is full account takeover without knowing any password: balances, transfers and personal data all exposed in one request.',
    report: { title: 'SQL Injection in Login Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements for all database access and never concatenate user input into SQL.' } },
  { id: 'brute-force', feature: 'Login & Authentication', name: 'Brute force — no rate limiting or lockout', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['Nothing slows you down when a login fails. Try the same account again. And again.', 'Automate it: send 10+ wrong passwords for one account in a row.', 'The 10th failure is processed exactly like the 1st — there is no throttle, CAPTCHA or lockout anywhere.'],
    lesson: 'Without rate limiting, a password is only as strong as the attacker\u2019s patience — credential stuffing and guessing run at machine speed.',
    impact: 'Attackers can grind through password lists against real customers until one account opens, then drain its balance.',
    report: { title: 'Missing Rate Limiting on Login Enables Brute Force', severity: 'High', remediation: 'Add progressive delays, lockout or CAPTCHA after repeated failures, and alert on credential-stuffing patterns.' } },
  { id: 'user-enum', feature: 'Login & Authentication', name: 'Account enumeration via forgot-password', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['Ask for a password reset for an email that exists. Then ask for one that does not.', 'Compare the two responses word for word — the app tells you which emails are registered.', 'Probe one real address (alice@test.local) and one invented address and watch the messages differ.'],
    lesson: 'Different responses for real vs. fake accounts hand attackers a verified target list for phishing and password attacks.',
    impact: 'An attacker can confirm exactly which of a leaked email list holds wallet accounts, focusing attacks only where money exists.',
    report: { title: 'User Enumeration Through Password-Reset Responses', severity: 'Medium', remediation: 'Return one identical, neutral response for every reset request regardless of whether the account exists.' } },
  { id: 'default-creds', feature: 'Login & Authentication', name: 'Shipped demo account with default credentials', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['Products ship with demo or starter accounts that nobody removes.', 'The login page footer still advertises the demo workspace.', 'Log in as demo@hexawallet.local with the password demo123.'],
    lesson: 'Default and demo credentials are public knowledge — if the account stays enabled in production, it is an open door with a sign on it.',
    impact: 'Anyone on the internet can sign in to the seeded demo wallet and explore a live, working account — a foothold for deeper attacks.',
    report: { title: 'Default Demo Account Enabled With Known Password', severity: 'High', remediation: 'Disable or remove all demo/default accounts before production and force unique credentials for every seeded account.' } },
  { id: 'reset-token', feature: 'Login & Authentication', name: 'Predictable password-reset token', owasp: 'A07:2021 Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a reset and look at the token format — it is shown in the simulation panel.', 'The token is built from the account id and the current time of day. Nothing random is in it.', 'Token = RST-<account id>-<minutes since midnight, zero-padded>. Compute it for any account, right now.'],
    lesson: 'A reset token is a temporary password. If it is derived from guessable values (id + clock), anyone can mint one for any account.',
    impact: 'An attacker who knows a victim\u2019s email can calculate a valid reset token and take over the wallet within the same minute.',
    report: { title: 'Password-Reset Tokens Are Predictable', severity: 'High', remediation: 'Generate reset tokens from a CSPRNG (at least 128 bits), store only a hash, and expire them quickly after single use.' } },
  { id: 'cookie-role', feature: 'Login & Authentication', name: 'Session role taken from a client cookie', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After login, inspect the cookies the app sets — one of them describes your role.', 'The server trusts that cookie instead of looking your role up itself.', 'Set the hx_role cookie to admin in your browser, then visit /admin.'],
    lesson: 'Authorization data must live server-side. If the client supplies its own role, every user is one cookie edit away from admin.',
    impact: 'Any registered user can promote themselves to wallet administrator — freezing accounts and viewing every customer\u2019s balance.',
    report: { title: 'Authorization Role Trusted From Client Cookie', severity: 'Critical', remediation: 'Derive roles only from the server-side session record; never trust role or privilege claims sent by the client.' } },

  // ---- Registration & Profile ----
  { id: 'weak-password', feature: 'Registration & Profile', name: 'Weak password policy not enforced', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['The sign-up page claims passwords need 8+ characters. Test that claim.', 'Register a new account with a 1-character password.', 'It is accepted — the policy exists only as text on the page.'],
    lesson: 'A password policy that is displayed but not enforced server-side gives a false sense of security while users pick trivial passwords.',
    impact: 'Customers end up with passwords like "x" that fall to the first guess in any brute-force run against the wallet.',
    report: { title: 'Password Complexity Policy Not Enforced Server-Side', severity: 'Medium', remediation: 'Enforce minimum length and breached-password checks on the server for every password that is set.' } },
  { id: 'mass-assignment', feature: 'Registration & Profile', name: 'Mass assignment — balance, KYC and role are client-settable', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Registration and profile update copy every submitted field onto your account record.', 'Add fields the form never shows: balance, kyc, role.', 'Register with extra fields balance=5000&kyc=verified, or add them to a profile update, and watch your account change.'],
    lesson: 'Binding request fields directly to the data model lets clients write columns the UI never offered — balances and verification flags included.',
    impact: 'A brand-new user can register with a pre-loaded balance and pre-verified KYC, or promote an existing account — free money and laundered identity in one request.',
    report: { title: 'Mass Assignment Allows Setting Balance, KYC Status and Role', severity: 'Critical', remediation: 'Use an explicit allow-list of bindable fields per endpoint; never bind balance, role or verification flags from request data.' } },
  { id: 'stored-xss', feature: 'Registration & Profile', name: 'Stored XSS in display name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is shown to other users — in recipient lists and greetings.', 'Set your profile name to an HTML payload instead of a name.', 'Use <script>alert(1)</script> or <img src=x onerror=alert(1)> as the display name, then view a page that renders it.'],
    lesson: 'Any field rendered back to other users is an injection surface; unsanitised names turn one account\u2019s profile into script execution for everyone who views it.',
    impact: 'An attacker can run script in other customers\u2019 browsers — stealing sessions or driving transfers from the victim\u2019s own logged-in wallet.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-encode all user-supplied values on output and validate name fields against an allow-list of characters.' } },
  { id: 'profile-csrf', feature: 'Registration & Profile', name: 'CSRF on profile update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The profile form changes state with no anti-CSRF token.', 'A POST from another origin — or simply without the app\u2019s own marker cookie — is still accepted.', 'Submit the profile form cross-site (foreign Origin header, no hx_origin marker) and the change applies.'],
    lesson: 'State-changing endpoints without CSRF defence let any website a victim visits rewrite their wallet profile using their own session.',
    impact: 'A malicious page can silently change a victim\u2019s display name or contact details, setting up social-engineering and account-recovery attacks.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require a per-session anti-CSRF token on all state-changing requests and validate Origin/Referer as defence in depth.' } },

  // ---- Transfers ----
  { id: 'negative-transfer', feature: 'Transfers', name: 'Negative transfer amount steals from the recipient', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['The transfer form asks for an amount. Nobody said it had to be positive.', 'Send a transfer with a negative amount, e.g. -50.', 'The maths runs backwards: your balance goes UP and the recipient\u2019s goes DOWN.'],
    lesson: 'Business rules (amounts must be positive) are security controls. Validating only the field\u2019s type, not its sign, reverses the money flow.',
    impact: 'Any user can pull money out of any other wallet by "sending" them a negative amount — theft with a normal-looking transfer record.',
    report: { title: 'Negative Transfer Amounts Reverse the Money Flow', severity: 'Critical', remediation: 'Validate amounts server-side as strictly positive numbers within defined bounds before any balance mutation.' } },
  { id: 'double-spend', feature: 'Transfers', name: 'Double-spend — replayed transfer is applied twice', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['Each transfer form carries a client nonce meant to make the request unique.', 'Capture one transfer request and send the exact same request (same nonce) a second time.', 'The server never checks whether the nonce was already used — both transfers land.'],
    lesson: 'Payment operations need idempotency. Without server-side deduplication, a retry or replay duplicates the money movement.',
    impact: 'Double-clicks, network retries or deliberate replays duplicate transfers — the wallet pays out twice for one instruction.',
    report: { title: 'Transfers Are Not Idempotent — Replay Causes Double-Spend', severity: 'High', remediation: 'Enforce idempotency keys server-side: store processed nonces and reject or return the original result for duplicates.' } },
  { id: 'recipient-tamper', feature: 'Transfers', name: 'Recipient swapped at the confirmation step', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Quick Send is two steps: enter details, then confirm. The confirm form carries the recipient in a hidden field.', 'Start a transfer to one person, then edit the hidden recipient field before confirming.', 'The server trusts the confirmed field, not the transfer you started — the money lands with whoever is in the field.'],
    lesson: 'Multi-step flows must bind each step to server-side state. Trusting hidden form fields at confirm time lets the destination be rewritten mid-flight.',
    impact: 'Funds can be redirected to an attacker\u2019s account after the sender has reviewed and approved a transfer to someone else.',
    report: { title: 'Transfer Recipient Taken From Client Field at Confirmation', severity: 'High', remediation: 'Store pending transfers server-side and confirm against the stored record only; ignore recipient/amount fields posted at confirm time.' } },
  { id: 'receipt-idor', feature: 'Transfers', name: 'Transfer receipt IDOR — anyone can read any receipt', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Every completed transfer gets a receipt page at /receipt/<id>.', 'Receipts are numbered sequentially and never checked against the viewer.', 'Log in as a third party and open the receipt of a transfer between two other users.'],
    lesson: 'Sequential object ids plus missing ownership checks expose every record in the system to every logged-in user.',
    impact: 'Attackers can enumerate receipts to map who pays whom and how much — financial surveillance of the whole customer base.',
    report: { title: 'Insecure Direct Object Reference on Transfer Receipts', severity: 'Medium', remediation: 'Check on every object access that the requesting user is a party to the record; use unguessable ids as defence in depth.' } },
  { id: 'limit-bypass', feature: 'Transfers', name: 'Per-transfer limit enforced only in the web UI, not the API', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    hints: ['The web form refuses transfers above $500. That check lives in the web flow only.', 'The JSON API endpoint /api/transfer performs transfers with your API token — find yours on the API page.', 'POST a $600 transfer through the API. It sails past the limit the website enforces.'],
    lesson: 'A control enforced in one interface but not another does not exist. Every entry point to a money movement must enforce the same limits.',
    impact: 'Limits meant to cap fraud losses can be bypassed entirely through the API, letting a compromised account move large sums at once.',
    report: { title: 'Transfer Limit Not Enforced on API Endpoint', severity: 'High', remediation: 'Enforce business limits in the shared service layer used by every interface, never only in one front-end flow.' } },

  // ---- Top-ups & Cards ----
  { id: 'topup-tamper', feature: 'Top-ups & Cards', name: 'Top-up credits more than the card is charged', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['The top-up form posts two numbers: the amount credited and the amount charged to the card.', 'They travel as separate fields — and the server believes both.', 'Post amount=200 with charge=20. Your wallet gains $200; the card was "charged" $20.'],
    lesson: 'When price/charge data travels with the request, the client sets the price. The amount credited must be derived from the verified payment, never from form fields.',
    impact: 'Users mint wallet balance at a 10:1 discount or better — direct, scalable theft of funds from the platform.',
    report: { title: 'Top-Up Amount and Card Charge Both Client-Controlled', severity: 'Critical', remediation: 'Credit only the amount confirmed by the payment processor callback; ignore any amount or charge fields in the top-up request.' } },
  { id: 'card-any', feature: 'Top-ups & Cards', name: 'Top-up accepts any card number, valid or not', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['Link a new card during top-up and see what validation happens. Very little.', 'Try a card number of 1234.', 'The top-up succeeds and the nonsense card is stored — no format, length or checksum validation at all.'],
    lesson: 'Payment instruments must be validated (format, Luhn, processor tokenisation). Accepting arbitrary strings means the "payment" behind a top-up may not exist.',
    impact: 'Attackers can top up from non-existent cards, creating wallet balance backed by nothing.',
    report: { title: 'No Validation of Card Numbers on Top-Up', severity: 'High', remediation: 'Validate card data through the payment processor (tokenisation + Luhn/format checks) and only credit on confirmed authorisation.' } },
  { id: 'card-idor', feature: 'Top-ups & Cards', name: 'Linked card details of other users exposed (full PAN)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Your linked cards live at /cards, and each card has a detail page /cards/<id>.', 'Ids are sequential and ownership is never checked — and the detail page prints the full card number.', "Open another user's card id and read their complete PAN."],
    lesson: 'Payment data needs the strictest object-level authorization — and full card numbers should never be displayed or stored in the clear at all.',
    impact: 'Any customer can harvest every other customer\u2019s full card numbers — a reportable card-data breach (PCI DSS) on its own.',
    report: { title: 'IDOR Exposes Full Card Numbers of Other Users', severity: 'Critical', remediation: 'Enforce per-object ownership checks and never store or render full PANs; display only brand + last four digits.' } },

  // ---- KYC & Verification ----
  { id: 'kyc-bypass', feature: 'KYC & Verification', name: 'Unverified (KYC) account can withdraw to a bank', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Bank withdrawal is supposed to require completed KYC. The withdraw page hides the form from unverified users.', 'Hiding a form is not a check. The POST endpoint itself never verifies KYC status.', 'Log in as carol@test.local (unverified) and POST directly to /withdraw.'],
    lesson: 'Compliance gates are security controls: if the check lives only in the UI, unverified money can still leave the platform.',
    impact: 'Unverified — potentially anonymous or fraudulent — accounts can cash out to bank accounts, breaking AML/KYC obligations and enabling money laundering.',
    report: { title: 'KYC Verification Not Enforced on Bank Withdrawal', severity: 'High', remediation: 'Check KYC status server-side on the withdrawal endpoint for every request, regardless of which interface submits it.' } },
  { id: 'kyc-idor', feature: 'KYC & Verification', name: 'KYC identity record of other users readable', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Your own identity record is at /kyc. Other users\u2019 records sit at /kyc/<user id>.', 'No ownership check stands between you and their legal name, date of birth and ID number.', "Open /kyc/2 while logged in as someone else and read Alice's identity record."],
    lesson: 'Identity documents are the most sensitive data a wallet holds; per-object authorization is not optional on KYC records.',
    impact: 'Attackers can steal complete identity records — full name, DOB and government ID number — enabling identity theft against every customer.',
    report: { title: 'IDOR on KYC Identity Records', severity: 'High', remediation: 'Restrict KYC record access to the record owner and authorised compliance staff, with audit logging of every view.' } },

  // ---- Transaction History ----
  { id: 'history-idor', feature: 'Transaction History', name: 'Full transaction history of any user via ?user=', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The history page accepts a user parameter — meant for internal support tooling.', 'It never checks that the user you ask for is you.', 'Open /history?user=2 as a different account and read Alice\u2019s complete money history.'],
    lesson: 'Convenience parameters that select "whose data" must be authorized as strictly as the data itself.',
    impact: 'Complete financial histories — every transfer, top-up and withdrawal — of any customer are visible to any other customer.',
    report: { title: 'Transaction History IDOR via User Parameter', severity: 'High', remediation: 'Ignore client-supplied user selectors for account data; always scope history queries to the authenticated session user.' } },
  { id: 'history-xss', feature: 'Transaction History', name: 'Reflected XSS in history search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['History search echoes your search term back at the top of the results.', 'It echoes it as raw HTML.', 'Search for <script>alert(1)</script> and watch it land unescaped in the page.'],
    lesson: 'Reflected input must be output-encoded everywhere — search boxes are a classic place teams forget.',
    impact: 'A crafted history link executes script in a victim\u2019s wallet session when clicked, enabling session theft and actions in their name.',
    report: { title: 'Reflected Cross-Site Scripting in Transaction Search', severity: 'Medium', remediation: 'HTML-encode all reflected values on output and deploy a restrictive Content-Security-Policy as a backstop.' } },

  // ---- Admin Panel ----
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'State-changing admin action over GET (freeze account)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Admins freeze and unfreeze accounts from the admin panel — by clicking a link.', 'A link means a GET request changes account state, with no token and no confirmation.', 'As an admin (see the cookie test), call /admin/freeze?id=<user> directly — an image tag on any page could do the same to a logged-in admin.'],
    lesson: 'GET requests must never change state. Without CSRF tokens, admin powers can be triggered by any page an admin merely views.',
    impact: 'A booby-trapped page can freeze customer accounts the moment an admin browses it — a denial-of-service against the wallet\u2019s own users.',
    report: { title: 'Account Freeze Performed via Unprotected GET Request', severity: 'Medium', remediation: 'Move state changes to POST with per-session CSRF tokens and step-up confirmation for destructive admin actions.' } },

  // ---- Platform & API ----
  { id: 'api-users-dump', feature: 'Platform & API', name: 'Unauthenticated /api/users dumps balances and card numbers', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The JSON API has a users endpoint meant for internal tooling.', 'It asks for no token, no session, nothing.', 'Fetch /api/users logged out and receive every account with its balance and full card numbers.'],
    lesson: 'Debug and internal endpoints shipped to production without authentication are bulk-data breaches waiting for a crawler.',
    impact: 'The entire customer database — emails, balances, KYC status and full card numbers — is downloadable by anyone, no account needed.',
    report: { title: 'Unauthenticated API Endpoint Exposes All User and Card Data', severity: 'Critical', remediation: 'Require authentication and least-privilege authorization on every API endpoint; remove or hard-lock internal data dumps in production.' } },
  { id: 'api-weak-token', feature: 'Platform & API', name: 'API accepts base64(email) as a valid token', owasp: 'A07:2021 Authentication Failures', difficulty: 'Advanced',
    hints: ['The API authenticates with a token. A legacy fallback was left in the token check.', 'The fallback accepts something derived only from a public value: the account email.', 'Call /api/wallet with the header x-api-token set to the base64 encoding of any user\u2019s email address.'],
    lesson: 'A token that can be computed from public data is not a credential. Fallback auth paths are still auth paths — attackers only need the weakest one.',
    impact: 'Anyone who knows a customer\u2019s email address — public information — can read their wallet through the API and act with a predictable credential.',
    report: { title: 'Predictable API Token Derived From Email Address', severity: 'High', remediation: 'Accept only high-entropy, server-issued tokens; remove legacy fallback authentication and rotate tokens on suspicion of exposure.' } },
];

const FEATURES = [...new Set(TESTS.map(t => t.feature))];
const TEST_BY_ID = Object.fromEntries(TESTS.map(t => [t.id, t]));

/* More key material lives further down the file (shard set B). */

const _kd = ['LVlVUg==', 'OFJGRg==', 'TVREUQ=='];
function _asm(parts) {
  return parts.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}
const ENTRY_KEY_SHA256 = 'b8ebd5a2bccf068bd316db622e62fb948bf0e89bb4795aee65ea5255cdc44f92';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */
function completionKey() { return _asm(_kc.concat(_kd)); }

module.exports = { TESTS, FEATURES };
if (require.main !== module) { /* imported by the docs generator */ }
else { main(); }

function main() {

/* ============================ Progress state ============================ */
let P;
function freshProgress() { return { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false }; }
function loadProgress() {
  try { if (fs.existsSync(PROGRESS_FILE)) { P = Object.assign(freshProgress(), JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'))); return; } } catch (e) { /* start fresh */ }
  P = freshProgress();
}
function saveProgress() { try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(P, null, 1)); } catch (e) { /* non-fatal */ } }
loadProgress();
function doneCount() { return TESTS.filter(t => P.tests[t.id]).length; }
function pct() { return Math.floor(doneCount() / TESTS.length * 100); }
function isComplete() { return doneCount() === TESTS.length; }
function pass(id) {
  if (!TEST_BY_ID[id] || P.tests[id]) return;
  P.tests[id] = true;
  if (isComplete() && !P.completedAt) { P.completedAt = new Date().toISOString(); P.keyRevealed = true; }
  saveProgress();
}
function attempt(feature) { P.attempts[feature] = (P.attempts[feature] || 0) + 1; saveProgress(); }

/* ============================ Business data (in-memory seed) ============================ */
let users, cards, txs, pendings, sessions, failedLogins, forgotProbes, seenNonces, seq;
function seed() {
  users = [
    { id: 1, name: 'Wallet Admin', email: 'admin@hexawallet.local', password: 'admin123', role: 'admin', balance: 5000.00, frozen: false, apiToken: 'hw_' + crypto.randomBytes(10).toString('hex'), kyc: { status: 'verified', legalName: 'Wallet Administrator', dob: '1988-03-14', idNumber: 'NID-1988-4471 (simulated)' } },
    { id: 2, name: 'Alice Rahman', email: 'alice@test.local', password: 'alice123', role: 'user', balance: 1250.50, frozen: false, apiToken: 'hw_' + crypto.randomBytes(10).toString('hex'), kyc: { status: 'verified', legalName: 'Alice Rahman', dob: '1994-07-02', idNumber: 'NID-1994-2081 (simulated)' } },
    { id: 3, name: 'Bob Carter', email: 'bob@test.local', password: 'bob123', role: 'user', balance: 340.00, frozen: false, apiToken: 'hw_' + crypto.randomBytes(10).toString('hex'), kyc: { status: 'verified', legalName: 'Bob Carter', dob: '1991-11-19', idNumber: 'NID-1991-7734 (simulated)' } },
    { id: 4, name: 'Carol Das', email: 'carol@test.local', password: 'carol123', role: 'user', balance: 85.25, frozen: false, apiToken: 'hw_' + crypto.randomBytes(10).toString('hex'), kyc: { status: 'unverified', legalName: 'Carol Das', dob: '1998-01-27', idNumber: 'NID-1998-5510 (simulated)' } },
    { id: 5, name: 'Demo User', email: 'demo@hexawallet.local', password: 'demo123', role: 'user', balance: 100.00, frozen: false, apiToken: 'hw_' + crypto.randomBytes(10).toString('hex'), kyc: { status: 'unverified', legalName: 'Demo User', dob: '2000-01-01', idNumber: 'NID-0000-0000 (simulated)' } },
  ];
  cards = [
    { id: 1, userId: 2, brand: 'Visa', pan: '4111 1111 1111 1111', last4: '1111', expiry: '09/28' },
    { id: 2, userId: 3, brand: 'Mastercard', pan: '5500 0055 5555 5559', last4: '5559', expiry: '04/27' },
    { id: 3, userId: 1, brand: 'Visa', pan: '4242 4242 4242 4242', last4: '4242', expiry: '12/29' },
  ];
  txs = [
    { id: 1, fromId: 3, toId: 2, amount: 25.00, type: 'transfer', note: 'Lunch split', ts: Date.now() - 86400000 },
    { id: 2, fromId: 2, toId: 2, amount: 200.00, type: 'topup', note: 'Card top-up', ts: Date.now() - 43200000 },
  ];
  pendings = {}; sessions = new Map(); failedLogins = {}; forgotProbes = new Set(); seenNonces = new Set();
  seq = { tx: 3, card: 4, user: 6, pending: 1 };
}
seed();
const userById = id => users.find(u => u.id === Number(id));
const userByEmail = email => users.find(u => u.email === String(email || '').toLowerCase());
function addTx(fromId, toId, amount, type, note) { const tx = { id: seq.tx++, fromId, toId, amount, type, note: note || '', ts: Date.now() }; txs.push(tx); return tx; }
function money(n) { return '$' + Number(n).toFixed(2); }
function tokenFor(user, offsetMin) {
  const d = new Date(Date.now() + (offsetMin || 0) * 60000);
  const m = d.getHours() * 60 + d.getMinutes();
  return 'RST-' + user.id + '-' + String(m).padStart(4, '0');
}

/* ============================ HTTP helpers ============================ */
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
const PAYLOAD_RE = /<script|<svg|onerror=|onload=|<img[^>]*onerror|<iframe/i;
function parseCookies(req) { const out = {}; String(req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); }); return out; }
function readBody(req) {
  return new Promise(resolve => {
    let data = ''; req.on('data', c => { data += c; if (data.length > 200000) req.destroy(); });
    req.on('end', () => {
      if ((req.headers['content-type'] || '').includes('application/json')) { try { return resolve(JSON.parse(data || '{}')); } catch (e) { return resolve({}); } }
      const out = {}; new URLSearchParams(data).forEach((v, k) => { out[k] = v; }); resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}
function currentUser(req) { const sid = parseCookies(req).sid; if (!sid) return null; const uid = sessions.get(sid); return uid ? userById(uid) : null; }
function effectiveRole(req, user) { const c = parseCookies(req); return c.hx_role || (user ? user.role : 'user'); }
function startSession(res, user) {
  const sid = crypto.randomBytes(12).toString('hex');
  sessions.set(sid, user.id);
  res.setHeader('Set-Cookie', ['sid=' + sid + '; Path=/; HttpOnly', 'hx_role=' + user.role + '; Path=/']);
}
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }
function sendHtml(res, code, html, extraHeaders) { res.writeHead(code, Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, extraHeaders || {})); res.end(html); }
function sendJson(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); }

/* ============================ Page rendering ============================ */
function headerHtml(user) {
  const d = doneCount(), p = pct();
  return '<header style="background:#111827;color:#fff;padding:10px 16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">' +
    '<img src="/logo.png" alt="HexaCyberLab" style="height:34px">' +
    '<strong>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</strong>' +
    '<span style="background:#1f2937;border-radius:6px;padding:4px 10px">' + d + '/' + TESTS.length + ' tests · ' + p + '%</span>' +
    '<span style="flex:1;min-width:120px;background:#374151;border-radius:6px;height:10px;overflow:hidden"><span style="display:block;height:100%;width:' + p + '%;background:#22c55e"></span></span>' +
    (user ? '<nav style="display:flex;gap:10px;flex-wrap:wrap"><a style="color:#93c5fd" href="/">Wallet</a><a style="color:#93c5fd" href="/transfer">Send</a><a style="color:#93c5fd" href="/topup">Top up</a><a style="color:#93c5fd" href="/cards">Cards</a><a style="color:#93c5fd" href="/history">History</a><a style="color:#93c5fd" href="/kyc">KYC</a><a style="color:#93c5fd" href="/api-page">API</a><a style="color:#93c5fd" href="/tests">Tests</a><a style="color:#93c5fd" href="/profile">Profile</a><a style="color:#93c5fd" href="/logout">Logout (' + esc(user.name) + ')</a></nav>'
          : '<nav><a style="color:#93c5fd" href="/tests">Tests</a></nav>') +
    '</header>';
}
const CHAT_WIDGET =
  '<div id="coach" style="position:fixed;right:14px;bottom:14px;width:320px;max-width:92vw;background:#fff;border:1px solid #d1d5db;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.25);font-family:system-ui;z-index:50">' +
  '<div style="background:#111827;color:#fff;padding:8px 12px;border-radius:10px 10px 0 0"><strong>Lab Coach</strong> <span style="color:#9ca3af;font-size:12px">HexaWallet guide</span></div>' +
  '<div id="coachlog" style="height:190px;overflow:auto;padding:10px;font-size:13px;line-height:1.45"></div>' +
  '<form id="coachform" style="display:flex;border-top:1px solid #e5e7eb"><input id="coachin" autocomplete="off" placeholder="Ask the coach…" style="flex:1;border:0;padding:9px;font-size:13px"><button style="background:#2563eb;color:#fff;border:0;padding:0 14px">Send</button></form>' +
  '<script>(function(){var log=document.getElementById("coachlog"),f=document.getElementById("coachform"),i=document.getElementById("coachin");function add(who,txt){var d=document.createElement("div");d.style.margin="6px 0";d.innerHTML="<strong>"+who+":</strong> ";d.appendChild(document.createTextNode(txt));log.appendChild(d);log.scrollTop=log.scrollHeight;}add("Coach","Hi! I am the Lab Coach for LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '. Ask me what to test, or how a feature works.");f.addEventListener("submit",function(e){e.preventDefault();var m=i.value.trim();if(!m)return;i.value="";add("You",m);fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:m})}).then(function(r){return r.json()}).then(function(j){add("Coach",j.reply)}).catch(function(){add("Coach","(connection error)")});});})();</script></div>';
function page(res, code, title, body, user, extraHeaders) {
  const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(title) + ' — HexaWallet Lab</title></head>' +
    '<body style="font-family:system-ui;margin:0;background:#f9fafb;color:#111827">' + headerHtml(user) +
    '<main style="max-width:860px;margin:0 auto;padding:20px 16px 90px">' + body + '</main>' + CHAT_WIDGET + '</body></html>';
  // benign marker cookie the app sets on its own pages (used by the CSRF detection)
  const headers = Object.assign({ 'Set-Cookie': 'hx_origin=1; Path=/' }, extraHeaders || {});
  sendHtml(res, code, html, headers);
}
function gatePage(res) {
  const body = '<div style="max-width:480px;margin:60px auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;text-align:center">' +
    '<img src="/logo.png" style="height:54px"><h1>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h1>' +
    '<p>This lab is locked. Paste the completion key from Lab ' + (LAB_NUMBER - 1) + ' to start.</p>' +
    '<form method="POST" action="/unlock"><input name="key" placeholder="Completion key from Lab ' + (LAB_NUMBER - 1) + '" style="width:100%;padding:10px;font-size:15px;box-sizing:border-box" autocomplete="off">' +
    '<button style="margin-top:12px;background:#2563eb;color:#fff;border:0;padding:10px 22px;border-radius:6px;font-size:15px">Unlock lab</button></form>' +
    '<p style="color:#6b7280;font-size:13px">HexaCyberLab vulnerable-lab series · local use only</p></div>';
  const html = '<!doctype html><html><head><meta charset="utf-8"><title>Locked — LAB ' + LAB_NUMBER + '</title></head><body style="font-family:system-ui;background:#f9fafb;margin:0">' + body + CHAT_WIDGET + '</body></html>';
  sendHtml(res, 200, html);
}

/* ============================ Lab Coach chatbot ============================ */
function featureOf(text) {
  const m = String(text || '').toLowerCase();
  return FEATURES.find(f => f.toLowerCase().split(' & ')[0].split(' ')[0].length > 2 && m.includes(f.toLowerCase().split(' & ')[0].split(' ')[0])) ||
         FEATURES.find(f => m.includes(f.toLowerCase())) || null;
}
function chatReply(raw) {
  const m = String(raw || '').toLowerCase();
  if (/(who (built|made|created)|founder|who is (he|jony)|built this|made this)/.test(m)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (m.includes('key') && /(give|what|tell|share|reveal|show|get|unlock|next)/.test(m)) {
    if (isComplete() && P.keyRevealed) return 'You completed 100% of LAB ' + LAB_NUMBER + ' — here is the completion key for the next lab: ' + completionKey();
    return 'I don\u2019t have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at ' + pct() + '% (' + doneCount() + '/' + TESTS.length + ' tests). Finish every test and I\u2019ll be able to share it.';
  }
  const feat = featureOf(raw);
  if (feat) {
    const list = TESTS.filter(t => t.feature === feat);
    const asksHow = /(how|guide|help|solve|step|hint|do i|exploit|attack|test)/.test(m);
    if (asksHow) {
      const att = P.attempts[feat] || 0;
      const allPassed = list.every(t => P.tests[t.id]);
      if (att >= 3 || allPassed) {
        const steps = list.filter(t => !P.tests[t.id]).map(t => '• ' + t.name + ' — ' + t.hints[2]).join('\n');
        return 'Step by step for ' + feat + ':\n' + (steps || 'You have already passed every test in this feature. Nice work.');
      }
      return 'That feature is locked for help. First try the ' + feat + " tests yourself at least 3 times — I can see you've tried " + att + ' time(s) so far. After 3 real tries, ask me again and I\u2019ll guide you step by step.';
    }
    const names = list.map(t => (P.tests[t.id] ? '✓ ' : '○ ') + t.name).join('\n');
    return feat + ' has ' + list.length + ' tests:\n' + names + '\nAttempts so far on this feature: ' + (P.attempts[feat] || 0) + '. Ask me "how" after at least 3 tries and I\u2019ll guide you.';
  }
  if (/(how many|progress|status|score|percent)/.test(m)) {
    return 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + TESTS.length + ' tests across ' + FEATURES.length + ' features. You have completed ' + doneCount() + ' (' + pct() + '%). See /tests for the full mission board.';
  }
  if (/(feature|features|what.*(test|do)|list|vulnerabilit|next)/.test(m)) {
    const next = TESTS.find(t => !P.tests[t.id]);
    return 'Features: ' + FEATURES.join(' · ') + '.\n' + (next ? 'Suggested next test: "' + next.name + '" (' + next.feature + '). Work it on the live app; full list with hints is on /tests.' : 'Everything is complete — see /complete for your debrief and key.');
  }
  if (/(hello|hi|hey|help)/.test(m)) {
    return 'Hello! I can tell you the test map for any feature (e.g. "Transfers"), your progress, or — after you\u2019ve genuinely tried a feature at least 3 times — step-by-step guidance. The completion key stays secret until you reach 100%.';
  }
  return 'I can help with the LAB ' + LAB_NUMBER + ' test map: ask about a feature (' + FEATURES.join(', ') + '), your progress, or how a feature works after 3 real attempts. Everything is also listed on /tests.';
}

/* ============================ Auth routes ============================ */
const INJ_RE = /'\s*(or|and)\s+'?[\w]+'?\s*=\s*'?[\w]+/i;
function loginPage(res, err) {
  page(res, 200, 'Login', '<h1>Welcome back to HexaWallet</h1>' +
    (err ? '<p style="color:#b91c1c">' + esc(err) + '</p>' : '') +
    '<form method="POST" action="/login" style="display:grid;gap:10px;max-width:360px">' +
    '<input name="email" type="email" required placeholder="Email" style="padding:9px"><input name="password" type="password" required placeholder="Password" style="padding:9px">' +
    '<button style="background:#2563eb;color:#fff;border:0;padding:10px;border-radius:6px">Log in</button></form>' +
    '<p><a href="/forgot">Forgot password?</a> · <a href="/register">Create an account</a></p>' +
    '<p style="color:#6b7280;font-size:13px">Test accounts: alice@test.local / alice123 · bob@test.local / bob123 · carol@test.local / carol123 (KYC unverified)</p>' +
    '<p style="color:#6b7280;font-size:13px">Demo workspace: demo@hexawallet.local — ask your administrator for the demo password.</p>', null);
}
async function handleLogin(req, res) {
  const b = await readBody(req);
  attempt('Login & Authentication');
  const email = String(b.email || ''), password = String(b.password || '');
  const injected = INJ_RE.test(email + ' ' + password) || email.includes("'--") || password.includes("'--");
  let user = null;
  // VULNERABLE: the "query" is built by string concatenation; an injection closes the condition.
  const fakeQuery = "SELECT * FROM users WHERE email = '" + email + "' AND password = '" + password + "'";
  if (injected) user = users[0];
  else user = users.find(u => u.email === email.toLowerCase() && u.password === password) || null;
  if (user) {
    if (injected) pass('sqli-login');
    if (user.email === 'demo@hexawallet.local') pass('default-creds');
    startSession(res, user);
    return redirect(res, '/');
  }
  failedLogins[email] = (failedLogins[email] || 0) + 1;
  if (failedLogins[email] >= 10) pass('brute-force'); // the 10th failure is still processed normally — no throttle
  return loginPage(res, 'Invalid email or password.');
}
function registerPage(res, err) {
  page(res, 200, 'Register', '<h1>Create your HexaWallet</h1>' + (err ? '<p style="color:#b91c1c">' + esc(err) + '</p>' : '') +
    '<form method="POST" action="/register" style="display:grid;gap:10px;max-width:360px">' +
    '<input name="name" required placeholder="Full name" style="padding:9px"><input name="email" type="email" required placeholder="Email" style="padding:9px">' +
    '<input name="password" type="password" required placeholder="Password (8+ characters)" style="padding:9px">' +
    '<button style="background:#2563eb;color:#fff;border:0;padding:10px;border-radius:6px">Create account</button></form><p>Already registered? <a href="/login">Log in</a></p>', null);
}
function applyMassAssignment(user, b) {
  let abused = false;
  if (b.balance !== undefined && b.balance !== '') { const v = parseFloat(b.balance); if (!isNaN(v)) { user.balance = v; if (v > 0) abused = true; } }
  if (b.kyc !== undefined && b.kyc !== '') { user.kyc.status = String(b.kyc); if (String(b.kyc) === 'verified') abused = true; }
  if (b.role !== undefined && b.role !== '') { user.role = String(b.role); if (String(b.role) === 'admin') abused = true; }
  if (abused) pass('mass-assignment');
}
async function handleRegister(req, res) {
  const b = await readBody(req);
  attempt('Registration & Profile');
  const email = String(b.email || '').toLowerCase();
  if (!email || !b.password) return registerPage(res, 'Email and password are required.');
  if (userByEmail(email)) return registerPage(res, 'That email is already registered.');
  const user = { id: seq.user++, name: String(b.name || 'New User'), email, password: String(b.password), role: 'user', balance: 0, frozen: false, apiToken: 'hw_' + crypto.randomBytes(10).toString('hex'), kyc: { status: 'unverified', legalName: String(b.name || ''), dob: '', idNumber: '' } };
  if (String(b.password).length <= 3) pass('weak-password'); // displayed policy (8+) is never enforced server-side
  applyMassAssignment(user, b); // VULNERABLE: every posted field is bound to the record
  users.push(user);
  startSession(res, user);
  return redirect(res, '/');
}
async function handleForgot(req, res) {
  const b = await readBody(req);
  attempt('Login & Authentication');
  const email = String(b.email || '').toLowerCase();
  const u = userByEmail(email);
  forgotProbes.add(email + ':' + (u ? 'real' : 'fake'));
  let hasReal = false, hasFake = false;
  forgotProbes.forEach(p => { if (p.endsWith(':real')) hasReal = true; if (p.endsWith(':fake')) hasFake = true; });
  if (hasReal && hasFake) pass('user-enum');
  // VULNERABLE: the response reveals whether the account exists.
  if (u) {
    const tok = tokenFor(u, 0);
    return page(res, 200, 'Reset sent', '<h1>Check your inbox</h1><p>A reset link has been sent to ' + esc(email) + '.</p>' +
      '<p style="background:#fef3c7;padding:10px;border-radius:6px">(Lab simulation — no email leaves this machine. Your reset token is: <strong>' + esc(tok) + '</strong> — open <a href="/reset">/reset</a> to use it.)</p>', null);
  }
  return page(res, 200, 'Not found', '<h1>No account found</h1><p>There is no HexaWallet account registered for ' + esc(email) + '.</p><p><a href="/forgot">Try again</a></p>', null);
}
async function handleReset(req, res) {
  const b = await readBody(req);
  attempt('Login & Authentication');
  const token = String(b.token || '');
  const mm = token.match(/^RST-(\d+)-(\d{4})$/);
  if (mm) {
    const u = userById(Number(mm[1]));
    if (u && (token === tokenFor(u, 0) || token === tokenFor(u, -1))) {
      u.password = String(b.newPassword || 'changed123');
      pass('reset-token'); // the token was computable from the account id + clock — no secret involved
      return page(res, 200, 'Password reset', '<h1>Password updated</h1><p>You can now <a href="/login">log in</a> with your new password.</p>', null);
    }
  }
  return page(res, 400, 'Bad token', '<h1>Invalid or expired token</h1><p><a href="/forgot">Request a new reset</a></p>', null);
}

/* ============================ App routes ============================ */
function dashboard(res, user) {
  const mine = txs.filter(t => t.fromId === user.id || t.toId === user.id).slice(-6).reverse();
  const rows = mine.map(t => '<tr><td style="padding:6px">' + esc(t.type) + '</td><td style="padding:6px">' + money(t.amount) + '</td><td style="padding:6px">' + esc(t.note) + '</td><td style="padding:6px"><a href="/receipt/' + t.id + '">receipt</a></td></tr>').join('');
  page(res, 200, 'Wallet', '<h1>Hello, ' + user.name + '</h1>' + // name rendered raw on purpose (stored-XSS surface)
    '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;max-width:420px"><div style="color:#6b7280">Current balance</div>' +
    '<div style="font-size:34px;font-weight:700">' + money(user.balance) + '</div>' +
    '<div style="color:#6b7280;font-size:13px">KYC: ' + esc(user.kyc.status) + ' · Account #' + user.id + (user.frozen ? ' · <strong style="color:#b91c1c">FROZEN</strong>' : '') + '</div></div>' +
    '<p><a href="/transfer">Send money</a> · <a href="/topup">Top up</a> · <a href="/withdraw">Withdraw to bank</a></p>' +
    '<h2>Recent activity</h2><table style="background:#fff;border-collapse:collapse;min-width:420px">' + rows + '</table>', user);
}
function profilePage(res, user, msg) {
  page(res, 200, 'Profile', '<h1>Your profile</h1>' + (msg ? '<p style="color:#047857">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/profile" style="display:grid;gap:10px;max-width:380px">' +
    '<label>Display name <input name="name" value="' + esc(user.name) + '" style="padding:9px;width:100%"></label>' +
    '<label>Phone <input name="phone" value="' + esc(user.phone || '') + '" style="padding:9px;width:100%"></label>' +
    '<button style="background:#2563eb;color:#fff;border:0;padding:10px;border-radius:6px">Save profile</button></form>' +
    '<p style="color:#6b7280;font-size:13px">Email: ' + esc(user.email) + ' · Role: ' + esc(user.role) + ' · KYC: ' + esc(user.kyc.status) + '</p>', user);
}
async function handleProfile(req, res, user) {
  const b = await readBody(req);
  attempt('Registration & Profile');
  const cookies = parseCookies(req);
  const origin = String(req.headers.origin || req.headers.referer || '');
  const foreignOrigin = origin && !origin.includes('127.0.0.1:' + PORT) && !origin.includes('localhost:' + PORT);
  if (b.name) { user.name = String(b.name); if (PAYLOAD_RE.test(user.name)) pass('stored-xss'); }
  if (b.phone !== undefined) user.phone = String(b.phone);
  applyMassAssignment(user, b);
  if (foreignOrigin || !cookies.hx_origin) pass('profile-csrf'); // state changed with no app marker / from a foreign origin
  return profilePage(res, user, 'Profile saved.');
}
function transferPage(res, user, msg) {
  page(res, 200, 'Send money', '<h1>Send money</h1>' + (msg ? '<p style="color:#b91c1c">' + esc(msg) + '</p>' : '') +
    '<h2>Direct transfer</h2><form method="POST" action="/transfer" style="display:grid;gap:10px;max-width:380px">' +
    '<input name="to" type="email" required placeholder="Recipient email" style="padding:9px">' +
    '<input name="amount" type="number" step="0.01" required placeholder="Amount (max $500 per transfer)" style="padding:9px">' +
    '<input name="note" placeholder="Note (optional)" style="padding:9px">' +
    '<input type="hidden" name="nonce" value="n-' + Date.now() + '">' +
    '<button style="background:#2563eb;color:#fff;border:0;padding:10px;border-radius:6px">Send</button></form>' +
    '<h2>Quick Send (two-step, with confirmation)</h2><form method="POST" action="/transfer/initiate" style="display:grid;gap:10px;max-width:380px">' +
    '<input name="to" type="email" required placeholder="Recipient email" style="padding:9px">' +
    '<input name="amount" type="number" step="0.01" required placeholder="Amount" style="padding:9px">' +
    '<button style="background:#059669;color:#fff;border:0;padding:10px;border-radius:6px">Review transfer</button></form>' +
    '<p style="color:#6b7280;font-size:13px">People: alice@test.local · bob@test.local · carol@test.local</p>', user);
}
function doTransfer(from, to, amount, note) {
  from.balance = Math.round((from.balance - amount) * 100) / 100;
  to.balance = Math.round((to.balance + amount) * 100) / 100;
  return addTx(from.id, to.id, amount, 'transfer', note || '');
}
async function handleTransfer(req, res, user) {
  const b = await readBody(req);
  attempt('Transfers');
  const to = userByEmail(b.to); const amount = parseFloat(b.amount);
  if (!to) return transferPage(res, user, 'Recipient not found.');
  if (isNaN(amount)) return transferPage(res, user, 'Enter a valid amount.');
  if (amount > WEB_TRANSFER_LIMIT) return transferPage(res, user, 'Over the $' + WEB_TRANSFER_LIMIT + ' per-transfer limit.');
  if (amount > 0 && amount > user.balance) return transferPage(res, user, 'Insufficient balance.');
  const nonceKey = user.id + ':' + String(b.nonce || '');
  const replayed = b.nonce && seenNonces.has(nonceKey);
  if (b.nonce) seenNonces.add(nonceKey);
  const tx = doTransfer(user, to, amount, b.note); // VULNERABLE: negative amounts and replays are applied as-is
  if (amount < 0) pass('negative-transfer');
  if (replayed) pass('double-spend');
  return redirect(res, '/receipt/' + tx.id);
}
async function handleInitiate(req, res, user) {
  const b = await readBody(req);
  attempt('Transfers');
  const to = userByEmail(b.to); const amount = parseFloat(b.amount);
  if (!to || isNaN(amount)) return transferPage(res, user, 'Check the recipient and amount.');
  const pid = 'p' + (seq.pending++);
  pendings[pid] = { id: pid, fromId: user.id, toEmail: to.email, amount };
  page(res, 200, 'Confirm transfer', '<h1>Confirm your transfer</h1><p>You are sending <strong>' + money(amount) + '</strong> to <strong>' + esc(to.email) + '</strong>.</p>' +
    '<form method="POST" action="/transfer/confirm" style="display:grid;gap:10px;max-width:380px">' +
    '<input type="hidden" name="txid" value="' + pid + '"><input type="hidden" name="to" value="' + esc(to.email) + '"><input type="hidden" name="amount" value="' + amount + '">' +
    '<button style="background:#059669;color:#fff;border:0;padding:10px;border-radius:6px">Confirm &amp; send</button></form>', user);
}
async function handleConfirm(req, res, user) {
  const b = await readBody(req);
  attempt('Transfers');
  const p = pendings[String(b.txid || '')];
  if (!p || p.fromId !== user.id) return transferPage(res, user, 'That pending transfer is gone.');
  const to = userByEmail(b.to); // VULNERABLE: recipient (and amount) trusted from the confirm form, not the stored record
  const amount = parseFloat(b.amount);
  if (!to || isNaN(amount)) return transferPage(res, user, 'Check the confirmation details.');
  if (amount > 0 && amount > user.balance) return transferPage(res, user, 'Insufficient balance.');
  const tx = doTransfer(user, to, amount, 'Quick Send');
  if (String(b.to) !== p.toEmail) pass('recipient-tamper');
  delete pendings[p.id];
  return redirect(res, '/receipt/' + tx.id);
}
function receiptPage(res, user, id) {
  attempt('Transfers');
  const tx = txs.find(t => t.id === Number(id));
  if (!tx) return page(res, 404, 'Receipt', '<h1>Receipt not found</h1>', user);
  if (tx.fromId !== user.id && tx.toId !== user.id) pass('receipt-idor');
  const from = userById(tx.fromId), to = userById(tx.toId);
  page(res, 200, 'Receipt', '<h1>Transfer receipt #' + tx.id + '</h1><div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;max-width:460px">' +
    '<p>From: <strong>' + esc(from ? from.name : '?') + '</strong> (' + esc(from ? from.email : '') + ')</p>' +
    '<p>To: <strong>' + esc(to ? to.name : '?') + '</strong> (' + esc(to ? to.email : '') + ')</p>' +
    '<p>Amount: <strong>' + money(tx.amount) + '</strong> · Type: ' + esc(tx.type) + '</p><p>Note: ' + esc(tx.note) + '</p>' +
    '<p style="color:#6b7280;font-size:13px">' + new Date(tx.ts).toLocaleString() + '</p></div><p><a href="/history">Back to history</a></p>', user);
}
function topupPage(res, user, msg) {
  const mine = cards.filter(c => c.userId === user.id);
  const opts = mine.map(c => '<option value="' + c.id + '">' + esc(c.brand) + ' •••• ' + esc(c.last4) + '</option>').join('');
  page(res, 200, 'Top up', '<h1>Top up your wallet</h1>' + (msg ? '<p>' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/topup" style="display:grid;gap:10px;max-width:380px">' +
    '<label>Amount to credit <input name="amount" type="number" step="0.01" value="50" style="padding:9px;width:100%"></label>' +
    '<input type="hidden" name="charge" value="50">' +
    '<label>Saved card <select name="cardId" style="padding:9px;width:100%"><option value="">— use a new card —</option>' + opts + '</select></label>' +
    '<label>Or new card number <input name="newCard" placeholder="Card number" style="padding:9px;width:100%"></label>' +
    '<button style="background:#2563eb;color:#fff;border:0;padding:10px;border-radius:6px">Top up</button></form>', user);
}
async function handleTopup(req, res, user) {
  const b = await readBody(req);
  attempt('Top-ups & Cards');
  const amount = parseFloat(b.amount); const charge = parseFloat(b.charge !== undefined ? b.charge : b.amount);
  if (isNaN(amount) || amount <= 0) return topupPage(res, user, 'Enter a valid amount.');
  if (b.newCard) {
    const num = String(b.newCard).replace(/[\s-]/g, '');
    const nonsense = num.length < 12 || /^(\d)\1+$/.test(num) || !/^\d+$/.test(num);
    cards.push({ id: seq.card++, userId: user.id, brand: 'Card', pan: String(b.newCard), last4: num.slice(-4) || '????', expiry: '—' });
    if (nonsense) pass('card-any'); // VULNERABLE: accepted and stored without any validation
  }
  user.balance = Math.round((user.balance + amount) * 100) / 100;
  addTx(user.id, user.id, amount, 'topup', 'Card top-up (card charged ' + money(isNaN(charge) ? amount : charge) + ')');
  if (!isNaN(charge) && amount > charge) pass('topup-tamper'); // credited more than the card was charged
  return redirect(res, '/');
}
function cardsPage(res, user) {
  attempt('Top-ups & Cards');
  const mine = cards.filter(c => c.userId === user.id);
  const rows = mine.map(c => '<tr><td style="padding:6px">' + esc(c.brand) + '</td><td style="padding:6px">•••• ' + esc(c.last4) + '</td><td style="padding:6px"><a href="/cards/' + c.id + '">details</a></td></tr>').join('');
  page(res, 200, 'Cards', '<h1>Linked cards</h1><table style="background:#fff;border-collapse:collapse;min-width:380px">' + rows + '</table>' +
    '<p style="color:#6b7280;font-size:13px">Banks: withdrawals go to the bank account you name on the withdraw page (simulated).</p>', user);
}
function cardDetail(res, user, id) {
  attempt('Top-ups & Cards');
  const card = cards.find(c => c.id === Number(id));
  if (!card) return page(res, 404, 'Card', '<h1>Card not found</h1>', user);
  if (card.userId !== user.id) pass('card-idor'); // VULNERABLE: served anyway — with the full number
  const owner = userById(card.userId);
  page(res, 200, 'Card detail', '<h1>' + esc(card.brand) + ' card</h1><div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;max-width:460px">' +
    '<p>Card number: <strong>' + esc(card.pan) + '</strong></p><p>Expiry: ' + esc(card.expiry) + '</p><p>Owner: ' + esc(owner ? owner.name : '?') + '</p></div>', user);
}
function kycPage(res, user) {
  attempt('KYC & Verification');
  page(res, 200, 'KYC', '<h1>Identity verification (KYC)</h1><div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;max-width:460px">' +
    '<p>Status: <strong>' + esc(user.kyc.status) + '</strong></p><p>Legal name: ' + esc(user.kyc.legalName) + '</p><p>Date of birth: ' + esc(user.kyc.dob) + '</p><p>ID number: ' + esc(user.kyc.idNumber) + '</p></div>' +
    (user.kyc.status !== 'verified' ? '<form method="POST" action="/kyc"><button style="background:#2563eb;color:#fff;border:0;padding:10px;border-radius:6px">Submit documents for review</button></form>' : '<p>Your identity is verified.</p>'), user);
}
function kycOther(res, user, id) {
  attempt('KYC & Verification');
  const target = userById(id);
  if (!target) return page(res, 404, 'KYC', '<h1>Record not found</h1>', user);
  if (target.id !== user.id) pass('kyc-idor'); // VULNERABLE: any user can read any KYC record
  page(res, 200, 'KYC record', '<h1>KYC record — ' + esc(target.name) + '</h1><div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;max-width:460px">' +
    '<p>Status: <strong>' + esc(target.kyc.status) + '</strong></p><p>Legal name: ' + esc(target.kyc.legalName) + '</p><p>Date of birth: ' + esc(target.kyc.dob) + '</p><p>ID number: ' + esc(target.kyc.idNumber) + '</p></div>', user);
}
function withdrawPage(res, user, msg) {
  const form = user.kyc.status === 'verified'
    ? '<form method="POST" action="/withdraw" style="display:grid;gap:10px;max-width:380px"><input name="amount" type="number" step="0.01" required placeholder="Amount" style="padding:9px"><input name="bank" required placeholder="Bank account (simulated)" style="padding:9px"><button style="background:#2563eb;color:#fff;border:0;padding:10px;border-radius:6px">Withdraw</button></form>'
    : '<p style="color:#b91c1c">Bank withdrawals require a verified KYC status. Your status: ' + esc(user.kyc.status) + '.</p>';
  page(res, 200, 'Withdraw', '<h1>Withdraw to bank</h1>' + (msg ? '<p>' + esc(msg) + '</p>' : '') + form, user);
}
async function handleWithdraw(req, res, user) {
  const b = await readBody(req);
  attempt('KYC & Verification');
  const amount = parseFloat(b.amount);
  if (isNaN(amount) || amount <= 0 || amount > user.balance) return withdrawPage(res, user, 'Enter a valid amount within your balance.');
  if (user.kyc.status !== 'verified') pass('kyc-bypass'); // VULNERABLE: the endpoint never checks KYC — only the page hides the form
  user.balance = Math.round((user.balance - amount) * 100) / 100;
  addTx(user.id, user.id, amount, 'withdrawal', 'Bank withdrawal to ' + String(b.bank || 'bank'));
  return redirect(res, '/');
}
function historyPage(res, user, url) {
  attempt('Transaction History');
  let target = user; let list;
  const qu = url.searchParams.get('user');
  if (qu && Number(qu) !== user.id && userById(Number(qu))) { target = userById(Number(qu)); pass('history-idor'); }
  list = txs.filter(t => t.fromId === target.id || t.toId === target.id);
  const q = url.searchParams.get('q');
  let heading = '<h1>Transaction history — ' + esc(target.name) + '</h1>';
  if (q) {
    if (PAYLOAD_RE.test(q)) pass('history-xss');
    list = list.filter(t => (t.note || '').toLowerCase().includes(q.toLowerCase()));
    heading += '<p>Results for "' + q + '"</p>'; // VULNERABLE: reflected unescaped
  }
  const rows = list.slice().reverse().map(t => '<tr><td style="padding:6px">' + t.id + '</td><td style="padding:6px">' + esc(t.type) + '</td><td style="padding:6px">' + money(t.amount) + '</td><td style="padding:6px">' + esc(t.note) + '</td><td style="padding:6px"><a href="/receipt/' + t.id + '">receipt</a></td></tr>').join('');
  page(res, 200, 'History', heading + '<form method="GET" action="/history" style="margin-bottom:12px"><input name="q" placeholder="Search notes…" style="padding:8px"> <button style="padding:8px 14px">Search</button></form>' +
    '<table style="background:#fff;border-collapse:collapse;min-width:520px"><tr><th style="padding:6px;text-align:left">#</th><th style="padding:6px;text-align:left">Type</th><th style="padding:6px;text-align:left">Amount</th><th style="padding:6px;text-align:left">Note</th><th></th></tr>' + rows + '</table>', user);
}
function adminPage(res, req, user) {
  attempt('Admin Panel');
  const role = effectiveRole(req, user);
  if (role !== 'admin') return page(res, 403, 'Admin', '<h1>403 — Admins only</h1>', user);
  if (user.role !== 'admin') pass('cookie-role'); // reached with a client-supplied role cookie only
  const rows = users.map(u => '<tr><td style="padding:6px">' + u.id + '</td><td style="padding:6px">' + esc(u.name) + '</td><td style="padding:6px">' + esc(u.email) + '</td><td style="padding:6px">' + money(u.balance) + '</td><td style="padding:6px">' + esc(u.kyc.status) + '</td><td style="padding:6px">' + (u.frozen ? 'FROZEN' : 'active') + '</td><td style="padding:6px"><a href="/admin/freeze?id=' + u.id + '">' + (u.frozen ? 'unfreeze' : 'freeze') + '</a></td></tr>').join('');
  page(res, 200, 'Admin', '<h1>Wallet administration</h1><table style="background:#fff;border-collapse:collapse;min-width:640px"><tr><th style="padding:6px;text-align:left">#</th><th style="padding:6px;text-align:left">Name</th><th style="padding:6px;text-align:left">Email</th><th style="padding:6px;text-align:left">Balance</th><th style="padding:6px;text-align:left">KYC</th><th style="padding:6px;text-align:left">State</th><th></th></tr>' + rows + '</table>', user);
}
function apiPage(res, user) {
  attempt('Platform & API');
  page(res, 200, 'API', '<h1>HexaWallet API</h1><p>Your API token:</p><pre style="background:#111827;color:#a7f3d0;padding:12px;border-radius:8px;overflow:auto">' + esc(user.apiToken) + '</pre>' +
    '<p>Endpoints:</p><ul><li><code>GET /api/wallet</code> — header <code>x-api-token</code> → your balance</li>' +
    '<li><code>POST /api/transfer</code> — JSON {token, to, amount} → transfer</li>' +
    '<li><code>GET /api/users</code> — internal directory (staff tooling)</li></ul>', user);
}
function apiUserForToken(token) {
  if (!token) return null;
  const byReal = users.find(u => u.apiToken === token);
  if (byReal) return { user: byReal, weak: false };
  const byWeak = users.find(u => Buffer.from(u.email, 'utf8').toString('base64') === token);
  if (byWeak) return { user: byWeak, weak: true };
  return null;
}

/* ============================ System pages ============================ */
function testsPage(res, user) {
  const blocks = FEATURES.map(f => {
    const list = TESTS.filter(t => t.feature === f);
    const items = list.map(t => {
      const done = !!P.tests[t.id];
      const hints = t.hints.map((h, i) => '<div style="display:none" class="hint hint-' + t.id + '" data-i="' + i + '">' + (i + 1) + '. ' + esc(h) + '</div>').join('');
      return '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin:8px 0"><strong>' + (done ? '✓' : '○') + ' ' + esc(t.name) + '</strong> ' +
        '<span style="color:#6b7280;font-size:12px">' + esc(t.owasp) + ' · ' + esc(t.difficulty) + '</span>' +
        '<div>' + hints + '<button onclick="var hs=document.querySelectorAll(\'.hint-' + t.id + '\');for(var i=0;i<hs.length;i++){if(hs[i].style.display===\'none\'){hs[i].style.display=\'block\';break;}}">Show next hint</button></div></div>';
    }).join('');
    return '<h2>' + esc(f) + ' <span style="color:#6b7280;font-size:13px">(' + list.filter(t => P.tests[t.id]).length + '/' + list.length + ' · attempts: ' + (P.attempts[f] || 0) + ')</span></h2>' + items;
  }).join('');
  page(res, 200, 'Mission board', '<h1>LAB ' + LAB_NUMBER + ' — Mission board</h1><p>' + doneCount() + '/' + TESTS.length + ' tests complete (' + pct() + '%). Tests complete by DOING the exploit on the live wallet — there is no "mark done" button.</p>' + blocks, user);
}
function completePage(res, user) {
  if (!isComplete()) {
    const left = TESTS.filter(t => !P.tests[t.id]).map(t => '<li>' + esc(t.name) + ' (' + esc(t.feature) + ')</li>').join('');
    return page(res, 200, 'Not yet', '<h1>Not complete yet</h1><p>Progress: ' + doneCount() + '/' + TESTS.length + ' (' + pct() + '%). Still to do:</p><ul>' + left + '</ul>', user);
  }
  P.keyRevealed = true; saveProgress();
  const perFeature = FEATURES.map(f => '<li><strong>' + esc(f) + '</strong>: ' + TESTS.filter(t => t.feature === f).length + ' vulnerabilities</li>').join('');
  const ways = TESTS.map(t => '<li>' + esc(t.name) + '</li>').join('');
  const lessons = TESTS.map(t => '<li><strong>' + esc(t.name) + ':</strong> ' + esc(t.lesson) + '</li>').join('');
  const impacts = TESTS.map(t => '<li><strong>' + esc(t.name) + ':</strong> ' + esc(t.impact) + '</li>').join('');
  const reports = TESTS.map(t => '<li><strong>' + esc(t.report.title) + '</strong> — Severity: ' + esc(t.report.severity) + ' · Fix: ' + esc(t.report.remediation) + '</li>').join('');
  page(res, 200, 'Lab complete', '<h1>🎉 LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' complete!</h1>' +
    '<h2>1) Total features in this lab</h2><p>' + FEATURES.length + ' features, ' + TESTS.length + ' vulnerabilities in total.</p>' +
    '<h2>2) Vulnerabilities per feature</h2><ul>' + perFeature + '</ul>' +
    '<h2>3) Ways testing was done (' + TESTS.length + ' techniques)</h2><ul>' + ways + '</ul>' +
    '<h2>4) What you learned</h2><ul>' + lessons + '</ul>' +
    '<h2>5) What this means for a real client</h2><ul>' + impacts + '</ul>' +
    '<h2>6) Writing it in a real report</h2><ul>' + reports + '</ul>' +
    '<div style="background:#ecfdf5;border:1px solid #10b981;border-radius:12px;padding:18px;margin-top:20px"><h2>Your completion key for Lab ' + (LAB_NUMBER + 1) + '</h2>' +
    '<code style="font-size:18px;font-weight:700">' + esc(completionKey()) + '</code>' +
    '<form method="POST" action="/complete" style="margin-top:14px"><label>Your name for the certificate <input name="name" value="' + esc(P.testerName) + '" style="padding:8px"></label> <button style="padding:8px 14px">Save name</button></form>' +
    '<p><a href="/certificate">View your certificate →</a></p></div>', user);
}
function certificatePage(res, user) {
  if (!isComplete()) return redirect(res, '/complete');
  const name = P.testerName || (user ? user.name : 'HexaCyberLab Tester');
  const date = P.completedAt ? new Date(P.completedAt).toLocaleDateString() : new Date().toLocaleDateString();
  const html = '<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ' + LAB_NUMBER + '</title><style>@media print{body{background:#fff}}</style></head>' +
    '<body style="font-family:Georgia,serif;background:#f3f4f6;margin:0;padding:30px"><div style="max-width:720px;margin:0 auto;background:#fff;border:3px solid #111827;border-radius:14px;padding:44px;text-align:center">' +
    '<img src="/logo.png" style="height:64px"><h1 style="margin:10px 0">Certificate of Completion</h1>' +
    '<p>This certifies that</p><div style="font-size:28px;font-weight:700">' + esc(name) + '</div>' +
    '<p>has completed 100% of the security tests in</p><div style="font-size:22px;font-weight:700">LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</div>' +
    '<p>' + TESTS.length + ' tests across ' + FEATURES.length + ' features · Completed: ' + esc(date) + '</p>' +
    '<p style="margin-top:26px;color:#374151">HexaCyberLab — Built by Md. Jony Hassain, Founder</p></div></body></html>';
  sendHtml(res, 200, html);
}

/* ============================ Router ============================ */
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://' + HOST + ':' + PORT);
    const pathName = url.pathname;
    if (pathName === '/logo.png') { try { const data = fs.readFileSync(path.join(DIR, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(data); } catch (e) { res.writeHead(404); return res.end(); } }
    if (pathName === '/api/progress') {
      const features = {}; FEATURES.forEach(f => { const list = TESTS.filter(t => t.feature === f); features[f] = { total: list.length, done: list.filter(t => P.tests[t.id]).length, attempts: P.attempts[f] || 0 }; });
      return sendJson(res, 200, { lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done: doneCount(), pct: pct(), features, complete: isComplete() });
    }
    if (pathName === '/api/chat' && req.method === 'POST') { const b = await readBody(req); return sendJson(res, 200, { reply: chatReply(b.message) }); }
    if (pathName === '/unlock' && req.method === 'POST') {
      const b = await readBody(req);
      if (entryKeyMatches(String(b.key || '').trim())) { P.unlocked = true; saveProgress(); return redirect(res, '/'); }
      res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end('<!doctype html><body style="font-family:system-ui;padding:30px"><h1>Key not accepted</h1><p>That is not the completion key from Lab ' + (LAB_NUMBER - 1) + '.</p><p><a href="/">Back</a></p></body>');
    }
    if (!P.unlocked) return gatePage(res);

    // Public API surfaces (token- or nothing-based by design of the lab)
    if (pathName === '/api/users') { attempt('Platform & API'); pass('api-users-dump'); return sendJson(res, 200, users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, balance: u.balance, kyc: u.kyc.status, cards: cards.filter(c => c.userId === u.id).map(c => ({ brand: c.brand, pan: c.pan, expiry: c.expiry })) }))); }
    if (pathName === '/api/wallet') {
      attempt('Platform & API');
      const auth = apiUserForToken(String(req.headers['x-api-token'] || url.searchParams.get('token') || ''));
      if (!auth) return sendJson(res, 401, { error: 'invalid token' });
      if (auth.weak) pass('api-weak-token');
      return sendJson(res, 200, { email: auth.user.email, balance: auth.user.balance, kyc: auth.user.kyc.status });
    }
    if (pathName === '/api/transfer' && req.method === 'POST') {
      attempt('Platform & API'); attempt('Transfers');
      const b = await readBody(req);
      const auth = apiUserForToken(String(b.token || req.headers['x-api-token'] || ''));
      if (!auth) return sendJson(res, 401, { error: 'invalid token' });
      if (auth.weak) pass('api-weak-token');
      const to = userByEmail(b.to); const amount = parseFloat(b.amount);
      if (!to || isNaN(amount)) return sendJson(res, 400, { error: 'check recipient and amount' });
      if (amount > 0 && amount > auth.user.balance) return sendJson(res, 400, { error: 'insufficient balance' });
      const tx = doTransfer(auth.user, to, amount, 'API transfer'); // VULNERABLE: no per-transfer limit check here
      if (amount > WEB_TRANSFER_LIMIT) pass('limit-bypass');
      if (amount < 0) pass('negative-transfer');
      return sendJson(res, 200, { ok: true, tx: tx.id, balance: auth.user.balance });
    }

    if (pathName === '/login') return req.method === 'POST' ? handleLogin(req, res) : loginPage(res);
    if (pathName === '/register') return req.method === 'POST' ? handleRegister(req, res) : registerPage(res);
    if (pathName === '/forgot') {
      if (req.method === 'POST') return handleForgot(req, res);
      return page(res, 200, 'Forgot password', '<h1>Forgot password</h1><form method="POST" action="/forgot" style="display:grid;gap:10px;max-width:360px"><input name="email" type="email" required placeholder="Your account email" style="padding:9px"><button style="background:#2563eb;color:#fff;border:0;padding:10px;border-radius:6px">Send reset link</button></form>', null);
    }
    if (pathName === '/reset') {
      if (req.method === 'POST') return handleReset(req, res);
      return page(res, 200, 'Reset password', '<h1>Reset password</h1><form method="POST" action="/reset" style="display:grid;gap:10px;max-width:360px"><input name="token" required placeholder="Reset token (RST-…)" style="padding:9px"><input name="newPassword" type="password" required placeholder="New password" style="padding:9px"><button style="background:#2563eb;color:#fff;border:0;padding:10px;border-radius:6px">Set new password</button></form>', null);
    }
    if (pathName === '/logout') { const sid = parseCookies(req).sid; if (sid) sessions.delete(sid); res.setHeader('Set-Cookie', 'sid=; Path=/; Max-Age=0'); return redirect(res, '/login'); }
    if (pathName === '/tests') return testsPage(res, currentUser(req));
    if (pathName === '/complete') {
      if (req.method === 'POST') { const b = await readBody(req); if (b.name) { P.testerName = String(b.name).slice(0, 60); saveProgress(); } return redirect(res, '/complete'); }
      return completePage(res, currentUser(req));
    }
    if (pathName === '/certificate') return certificatePage(res, currentUser(req));

    const user = currentUser(req);
    if (!user) return redirect(res, '/login');
    if (pathName === '/') return dashboard(res, user);
    if (pathName === '/profile') return req.method === 'POST' ? handleProfile(req, res, user) : profilePage(res, user);
    if (pathName === '/transfer') return req.method === 'POST' ? handleTransfer(req, res, user) : transferPage(res, user);
    if (pathName === '/transfer/initiate' && req.method === 'POST') return handleInitiate(req, res, user);
    if (pathName === '/transfer/confirm' && req.method === 'POST') return handleConfirm(req, res, user);
    if (pathName.startsWith('/receipt/')) return receiptPage(res, user, pathName.split('/')[2]);
    if (pathName === '/topup') return req.method === 'POST' ? handleTopup(req, res, user) : topupPage(res, user);
    if (pathName === '/cards') return cardsPage(res, user);
    if (pathName.startsWith('/cards/')) return cardDetail(res, user, pathName.split('/')[2]);
    if (pathName === '/kyc') {
      if (req.method === 'POST') { attempt('KYC & Verification'); if (user.kyc.status === 'unverified') user.kyc.status = 'pending'; return redirect(res, '/kyc'); }
      return kycPage(res, user);
    }
    if (pathName.startsWith('/kyc/')) return kycOther(res, user, pathName.split('/')[2]);
    if (pathName === '/withdraw') return req.method === 'POST' ? handleWithdraw(req, res, user) : withdrawPage(res, user);
    if (pathName === '/history') return historyPage(res, user, url);
    if (pathName === '/admin') return adminPage(res, req, user);
    if (pathName === '/admin/freeze') {
      if (effectiveRole(req, user) !== 'admin') return page(res, 403, 'Admin', '<h1>403 — Admins only</h1>', user);
      const target = userById(Number(url.searchParams.get('id')));
      if (target) { target.frozen = !target.frozen; pass('admin-csrf'); } // VULNERABLE: state change over GET, no token
      return redirect(res, '/admin');
    }
    if (pathName === '/api-page') return apiPage(res, user);
    return page(res, 404, 'Not found', '<h1>404 — page not found</h1>', user);
  } catch (e) {
    try { sendHtml(res, 500, '<h1>Something went wrong</h1><p>The wallet is still running.</p>'); } catch (e2) { /* ignore */ }
  }
});
server.listen(PORT, HOST, () => { console.log('LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' running at http://' + HOST + ':' + PORT); });

}
