'use strict';
/* HexaFintech — LAB 44 of 110 (Category 5: Finance, Payments & Insurance)
   A deliberately vulnerable fintech platform for authorised local training.
   Zero-dependency Node. Binds 127.0.0.1:3053 only. All data is fake seed data. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3053;
const LAB_NUMBER = 44;
const LAB_NAME = 'HexaFintech';
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');

/* --- scattered theme fragments (assembled at runtime only) --- */
const THEME_A = ['TC1YSA==', 'QUJROQ=='];
const PALETTE = { bg: '#0b1020', card: '#131a2e', accent: '#4f7cff', accent2: '#9b5cff', text: '#e8ecf8', muted: '#93a0bd' };

/* ============================ SEED DATA (all fake) ============================ */
let nextUserId = 6, nextAccountId = 8, nextCardId = 5, nextTxId = 9, nextGrantId = 3, nextInviteId = 2;

const users = [
  { id: 1, name: 'Priya Nair', email: 'admin@hexafintech.local', password: 'admin123', role: 'admin', tier: 'verified', dailyLimit: 50000, phone: '+8801700000001', demo: false },
  { id: 2, name: 'Alice Rahman', email: 'alice@hexafintech.local', password: 'alice123', role: 'user', tier: 'verified', dailyLimit: 2000, phone: '+8801700000002', demo: false },
  { id: 3, name: 'Bob Karim', email: 'bob@hexafintech.local', password: 'bob123', role: 'user', tier: 'basic', dailyLimit: 1000, phone: '+8801700000003', demo: false },
  { id: 4, name: 'Carol Das', email: 'carol@hexafintech.local', password: 'carol123', role: 'user', tier: 'verified', dailyLimit: 2000, phone: '+8801700000004', demo: false },
  { id: 5, name: 'Demo User', email: 'demo@hexafintech.local', password: 'demo123', role: 'user', tier: 'basic', dailyLimit: 500, phone: '+8801700000005', demo: true }
];

const profiles = {
  1: { income: 18500, netWorth: 412000, risk: 'Balanced', goal: 'Platform operations reserve' },
  2: { income: 6200, netWorth: 38450, risk: 'Growth', goal: 'House deposit by 2028' },
  3: { income: 3900, netWorth: 9120, risk: 'Conservative', goal: 'Emergency fund' },
  4: { income: 5400, netWorth: 26780, risk: 'Balanced', goal: 'Freelance tax reserve' },
  5: { income: 1200, netWorth: 640, risk: 'Conservative', goal: 'Trying the platform' }
};

const accounts = [
  { id: 1, owner: 2, bank: 'NorthBank', type: 'Checking', last4: '4401', balance: 8450 },
  { id: 2, owner: 2, bank: 'NorthBank', type: 'Savings', last4: '4402', balance: 23100 },
  { id: 3, owner: 3, bank: 'CityBank', type: 'Checking', last4: '7710', balance: 3120 },
  { id: 4, owner: 3, bank: 'CityBank', type: 'Savings', last4: '7711', balance: 6040 },
  { id: 5, owner: 4, bank: 'MetroBank', type: 'Checking', last4: '9020', balance: 5125 },
  { id: 6, owner: 1, bank: 'NorthBank', type: 'Operating', last4: '1001', balance: 92500 },
  { id: 7, owner: 5, bank: 'CityBank', type: 'Checking', last4: '3300', balance: 210 }
];

const cards = [
  { id: 1, owner: 2, label: 'Everyday Virtual', pan: '4111 4477 2200 1001', cvv: '731', expiry: '09/28', limit: 1000, frozen: false },
  { id: 2, owner: 2, label: 'Travel Virtual', pan: '4111 4477 2200 1002', cvv: '204', expiry: '03/29', limit: 2500, frozen: false },
  { id: 3, owner: 3, label: 'Shopping Virtual', pan: '5500 9033 1188 2001', cvv: '918', expiry: '11/27', limit: 800, frozen: false },
  { id: 4, owner: 4, label: 'Freelance Virtual', pan: '3400 2277 5511 3001', cvv: '452', expiry: '06/28', limit: 1500, frozen: false }
];

let transactions = [
  { id: 1, from: 2, to: 3, amount: 120, note: 'Dinner split', when: '2026-10-02' },
  { id: 2, from: 3, to: 2, amount: 45, note: 'Taxi share', when: '2026-10-05' },
  { id: 3, from: 2, to: 4, amount: 300, note: 'Design invoice part-payment', when: '2026-10-09' },
  { id: 4, from: 4, to: 2, amount: 75, note: 'Refund', when: '2026-10-11' },
  { id: 5, from: 2, to: 2, amount: 500, note: 'Move to savings', when: '2026-10-12' },
  { id: 6, from: 3, to: 4, amount: 60, note: 'Books', when: '2026-10-14' },
  { id: 7, from: 5, to: 2, amount: 15, note: 'Test payment', when: '2026-10-15' },
  { id: 8, from: 4, to: 3, amount: 210, note: 'Rent share', when: '2026-10-18' }
];

const spending = {
  2: [ { category: 'Groceries', amount: 412 }, { category: 'Transport', amount: 96 }, { category: 'Dining', amount: 188 }, { category: 'Utilities', amount: 142 } ],
  3: [ { category: 'Groceries', amount: 355 }, { category: 'Gaming', amount: 129 }, { category: 'Dining', amount: 87 } ],
  4: [ { category: 'Software', amount: 210 }, { category: 'Groceries', amount: 298 }, { category: 'Travel', amount: 460 } ],
  5: [ { category: 'Dining', amount: 32 } ]
};

let grants = [
  { id: 1, owner: 2, grantee: 4, scope: 'view', label: 'Accountant (Carol) — view only' },
  { id: 2, owner: 3, grantee: 2, scope: 'view', label: 'Family view (Alice)' }
];
let invites = [ { id: 1, owner: 2, email: 'bob@hexafintech.local', scope: 'view', token: 'inv-8f42c1', used: false } ];

const sessions = new Map();   // sid -> { userId, marker }
const issuedTokens = new Set();
const loginFails = {};        // email -> consecutive failure count
const enumProbe = { noUser: false, wrongPw: false };

/* ============================ TESTS REGISTRY ============================ */
const TESTS = [
  /* ---- Login & Authentication ---- */
  { id: 'sqli-login', feature: 'Login & Authentication', name: 'SQL injection login bypass (legacy SSO query path)', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login form still talks to a legacy SSO path that builds its query by gluing strings together.', "Try a classic quote-break payload in the email field, e.g. something with ' OR in it.", "Use email: ' OR '1'='1' --  with any password — the comment cuts the password check off."],
    lesson: 'String-built queries let an attacker rewrite the login logic itself; parameterised queries make input data, never code.',
    impact: 'On a real fintech, this is instant account takeover — anyone walks in as the first account in the table, often an admin, with no password at all.',
    report: { title: 'SQL Injection in Authentication (Legacy SSO Path)', severity: 'Critical', remediation: 'Use parameterised queries everywhere and retire the legacy string-built login path.' } },
  { id: 'brute-force', feature: 'Login & Authentication', name: 'No rate limiting or lockout on login (brute force)', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Pick one real account and keep guessing its password.', 'Count the failures — does anything slow down or lock after 5? After 10?', 'Fail 10 logins in a row for alice@hexafintech.local; the 10th is still processed normally.'],
    lesson: 'Without throttling, a login form is an unlimited password-guessing machine; rate limits and lockouts turn years of guessing into a dead end.',
    impact: 'Attackers can grind through password lists against real customers until one works — credential stuffing against a money app pays out fast.',
    report: { title: 'Missing Brute-Force Protection on Login', severity: 'High', remediation: 'Add per-account and per-IP rate limiting, progressive delays and lockout with alerting.' } },
  { id: 'user-enumeration', feature: 'Login & Authentication', name: 'User enumeration via differing login error messages', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the error for an email that does not exist with the error for a real email + wrong password.', 'One of them tells you the account exists. That difference is the leak.', 'Try ghost@nowhere.local (no account) vs alice@hexafintech.local with a wrong password and compare both messages.'],
    lesson: 'Different error messages hand attackers a free address book of valid accounts to target; generic errors keep them guessing.',
    impact: 'A fintech leaks exactly which email addresses hold money accounts — the perfect targeting list for phishing and credential stuffing.',
    report: { title: 'Account Enumeration via Authentication Error Messages', severity: 'Medium', remediation: 'Return one generic "invalid email or password" message for every failed login.' } },
  { id: 'default-creds', feature: 'Login & Authentication', name: 'Default demo account with a guessable password', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Seeded/demo accounts often survive into production.', 'The demo mailbox follows the pattern demo@… and its password is just as predictable.', 'Log in with demo@hexafintech.local / demo123.'],
    lesson: 'Demo and default accounts are real accounts with real access — if they ship, attackers will find them before your users do.',
    impact: 'A leftover demo login gives an attacker a legitimate foothold inside a finance platform on day one, no exploit needed.',
    report: { title: 'Default/Demo Account with Weak Password Enabled', severity: 'High', remediation: 'Remove demo accounts from production and enforce unique, strong credentials for every seeded account.' } },
  { id: 'reset-token', feature: 'Login & Authentication', name: 'Predictable password-reset token', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a reset and study the token format — it is built from things you already know.', 'The token combines the account id with a checksum of the email address. Both are public.', 'Token = FT<id>-<sum of email char codes × 7 mod 90000 + 10000>. Compute one for bob (id 3) WITHOUT requesting a reset, then use it.'],
    lesson: 'Reset tokens must be unguessable random values; anything derived from public data is an account-takeover formula anyone can compute.',
    impact: 'Anyone who knows a customer\u2019s email can mint a valid reset token and take over the account — no inbox access needed.',
    report: { title: 'Predictable Password Reset Token', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), store hashed, expire quickly and single-use them.' } },
  { id: 'cookie-role', feature: 'Login & Authentication', name: 'Session/cookie role tampering reaches the admin panel', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['At login the app sets a role cookie in your browser. Who do you think the server trusts — itself, or that cookie?', 'Edit the hx_role cookie and see which doors open.', 'Set hx_role=admin in your browser, then visit /admin.'],
    lesson: 'Authorization data kept on the client is a suggestion, not a fact; roles must be read from server-side session state on every request.',
    impact: 'Any customer becomes "admin" by editing a cookie — full user list, account controls and delete powers in a finance platform.',
    report: { title: 'Client-Side Role Cookie Trusted for Authorization', severity: 'Critical', remediation: 'Store roles only in server-side sessions and authorize every request against them.' } },
  /* ---- Registration & Profile ---- */
  { id: 'weak-password', feature: 'Registration & Profile', name: 'Weak password policy (1-character passwords accepted)', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a fresh account and keep shortening the password.', 'There is no minimum length or complexity check at all.', 'Register with the password "x" — the account is created.'],
    lesson: 'Password policy is the floor under every other control; a 1-character password falls to the first guess an attacker tries.',
    impact: 'Customers who pick tiny passwords hand attackers trivial account takeovers on an app that holds their money data.',
    report: { title: 'No Minimum Password Strength Policy', severity: 'Medium', remediation: 'Enforce ≥10 characters with a breached-password check at registration and password change.' } },
  { id: 'mass-assignment', feature: 'Registration & Profile', name: 'Mass assignment — set role / tier / daily limit via profile update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The profile form shows name and phone — but the server binds whatever fields you POST.', 'Accounts carry fields like role, tier and dailyLimit that were never meant to be user-editable.', 'POST /profile with extra fields role=admin (or dailyLimit=999999) and watch them stick.'],
    lesson: 'Blindly binding request fields to records lets users edit columns that were never on the form; allow-list the fields each endpoint may change.',
    impact: 'A customer promotes themselves to admin or lifts their own transfer limit — privilege and money controls gone in one request.',
    report: { title: 'Mass Assignment Allows Privilege/Limit Escalation', severity: 'High', remediation: 'Allow-list bindable fields per endpoint; never bind role, tier or limit fields from user input.' } },
  { id: 'stored-xss-profile', feature: 'Registration & Profile', name: 'Stored XSS in the display name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is rendered back on the dashboard greeting without escaping.', 'Names are text to you — but the page treats them as HTML.', 'Set your display name to <script>alert(1)</script> on the profile page and open the dashboard.'],
    lesson: 'Any stored field rendered unescaped becomes a permanent script delivery slot; output-encode at render time, every time.',
    impact: 'An attacker\u2019s name executes script in other users\u2019 and admins\u2019 browsers — session theft and actions performed as the victim, inside a finance app.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'HTML-encode all user-supplied values at output and add a Content-Security-Policy.' } },
  { id: 'profile-csrf', feature: 'Registration & Profile', name: 'CSRF on the profile update form', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The app stamps its own forms with a hidden hx_marker field. What happens if a POST arrives without it?', 'A state change that accepts requests with no marker and no origin check can be ridden cross-site.', 'POST /profile from curl with no hx_marker field — the change is applied anyway.'],
    lesson: 'State-changing forms need an unguessable per-session token; without one, any site a victim visits can submit the form as them.',
    impact: 'A malicious page silently rewrites a victim\u2019s profile details — the first step in diverting their money and communications.',
    report: { title: 'Missing CSRF Token on Profile Update', severity: 'Medium', remediation: 'Require a per-session CSRF token on every state-changing request and verify Origin/Referer.' } },
  /* ---- Financial Profiles & Accounts ---- */
  { id: 'profile-idor', feature: 'Financial Profiles & Accounts', name: 'Financial profile IDOR — read another user\u2019s income & net worth', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Your financial profile lives at /users/<id>/profile. Whose id is being checked — the page\u2019s, or yours?', 'Swap the id in the URL for another user\u2019s.', 'While logged in as Alice (id 2), open /users/3/profile to read Bob\u2019s income and net worth.'],
    lesson: 'Showing an object because its id was in the URL is not authorization; every object access must check the requester owns it or holds a grant.',
    impact: 'Every customer\u2019s income, net worth and savings goals are public to any other customer — a privacy breach and perfect social-engineering material.',
    report: { title: 'Insecure Direct Object Reference on Financial Profiles', severity: 'High', remediation: 'Enforce per-object ownership/grant checks on every profile read.' } },
  { id: 'account-idor', feature: 'Financial Profiles & Accounts', name: 'Linked-account IDOR — read another user\u2019s bank accounts & balances', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Linked accounts are enumerated with simple ids at /accounts/<id>.', 'Ownership is displayed on the page but never verified on the server.', 'Logged in as Alice, open /accounts/3 — Bob\u2019s CityBank account and live balance render in full.'],
    lesson: 'Sequential ids plus missing ownership checks turn any list into everyone\u2019s list; check ownership server-side on every object.',
    impact: 'Attackers enumerate exactly who banks where and how much they hold — targeting data for theft and extortion.',
    report: { title: 'Insecure Direct Object Reference on Linked Bank Accounts', severity: 'High', remediation: 'Scope every account query to the authenticated owner (or a verified share grant).' } },
  { id: 'statement-traversal', feature: 'Financial Profiles & Accounts', name: 'Path traversal in statement download reads server files', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Statements download via /statements/download?file=… and the name is joined straight onto a folder path.', 'What happens when the "file" walks up a directory with ../ ?', 'Request /statements/download?file=../server.js and read the application source itself.'],
    lesson: 'User-controlled file paths must be canonicalised and confined to an allow-listed directory; a filename is not a path.',
    impact: 'Source code, configuration and potentially secrets are downloadable — the map an attacker needs for every deeper attack.',
    report: { title: 'Directory Traversal in Statement Download', severity: 'High', remediation: 'Resolve and validate paths inside the statements directory only; reject any traversal sequences.' } },
  /* ---- Cards ---- */
  { id: 'card-idor', feature: 'Cards', name: 'Virtual-card IDOR — full card number & CVV of another user exposed', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Your card detail page shows the full PAN and CVV "for convenience". Check whose cards it will show.', 'Card ids are small sequential numbers at /cards/<id>.', 'Logged in as Alice, open /cards/3 — Bob\u2019s full card number, CVV and expiry are displayed.'],
    lesson: 'Payment data behind a guessable URL with no ownership check is card data handed to strangers; mask by default and authorize every reveal.',
    impact: 'Complete working card credentials for every customer — direct card fraud, chargebacks and a PCI-DSS disaster for the business.',
    report: { title: 'Virtual Card Details (PAN + CVV) Exposed via IDOR', severity: 'Critical', remediation: 'Authorize card-detail access per owner, mask PAN, never display CVV, and log every reveal.' } },
  { id: 'card-limit-tamper', feature: 'Cards', name: 'Change another user\u2019s card limit (missing ownership check)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The card-limit endpoint takes a card id and a new limit. It verifies the limit is a number — nothing else.', 'Try setting a limit on a card that is not yours.', 'POST /cards/3/limit with limit=50 as Alice — Bob\u2019s card limit changes.'],
    lesson: 'Write endpoints need the same ownership checks as reads; a missing check on a money control is sabotage-as-a-service.',
    impact: 'An attacker freezes victims out of their own money by dropping card limits to near zero — or raises a stolen card\u2019s limit before draining it.',
    report: { title: 'Missing Authorization on Card Limit Update', severity: 'High', remediation: 'Verify card ownership (or admin role) server-side before applying any limit change.' } },
  { id: 'card-limit-cap', feature: 'Cards', name: 'Card limit raised far beyond the platform maximum', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['The platform advertises a $5,000 virtual-card cap. The server never enforces it.', 'The form validates the limit in the browser. Servers should not trust browsers.', 'POST /cards/1/limit with limit=999999 on your own card — it is accepted.'],
    lesson: 'Business limits must be enforced server-side; client-side validation is decoration an attacker removes in seconds.',
    impact: 'Customers (or attackers in their accounts) mint near-unlimited card spending power, voiding the platform\u2019s core risk control.',
    report: { title: 'Server-Side Card Limit Cap Not Enforced', severity: 'Medium', remediation: 'Enforce the maximum card limit server-side on every limit change.' } },
  /* ---- Transfers ---- */
  { id: 'negative-transfer', feature: 'Transfers', name: 'Negative transfer amount reverses the money flow', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['The transfer form assumes amounts are positive because the input says so.', 'What does the ledger do with a minus sign?', 'Send a transfer of -100 to Bob from your account — your balance goes UP and his goes down.'],
    lesson: 'Every numeric business input needs server-side range validation; a negative amount is not a discount, it is a reversed transaction.',
    impact: 'Anyone can pull money OUT of other customers\u2019 accounts into their own by "sending" negative amounts — theft with a normal-looking form.',
    report: { title: 'Negative Transfer Amount Accepted (Reverse Money Flow)', severity: 'Critical', remediation: 'Validate amounts server-side: positive, within balance and within the sender\u2019s limits.' } },
  { id: 'overdraft', feature: 'Transfers', name: 'Transfer more than the balance — no funds check', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['Try sending more money than your checking account holds.', 'The balance is displayed to you, but never checked by the server.', 'From an account holding $210, send $5,000 — it settles and the balance goes negative.'],
    lesson: 'A ledger that never checks funds is an IOU generator; balance checks must happen server-side inside the transaction.',
    impact: 'Customers spend money that does not exist and the platform eats the loss — or every downstream balance is fiction.',
    report: { title: 'Missing Balance Check Allows Overdraft', severity: 'High', remediation: 'Check available funds server-side and reject transfers that exceed the balance.' } },
  /* ---- Spending Analytics ---- */
  { id: 'analytics-export-leak', feature: 'Spending Analytics', name: 'Analytics CSV export leaks every user\u2019s spending', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Your analytics page shows YOUR spending. The export button builds its file from a bigger table.', 'Download your export and read ALL the rows, not just yours.', 'GET /analytics/export.csv as any normal user — the file contains every customer\u2019s spending rows.'],
    lesson: 'Exports must be filtered with the same authorization as the screen they came from; a report is a data dump with a friendlier name.',
    impact: 'The whole customer base\u2019s spending habits in one file — a reportable privacy breach and a competitor\u2019s dream dataset.',
    report: { title: 'Analytics Export Missing Tenant Filter (All Users\u2019 Data)', severity: 'High', remediation: 'Filter exports to the requester\u2019s own data and audit every export endpoint for the same flaw.' } },
  { id: 'analytics-xss', feature: 'Spending Analytics', name: 'Reflected XSS in the analytics period filter', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The analytics heading repeats the period you asked for — verbatim.', 'Periods are usually values like 2026-10. The page does not check.', 'Open /analytics?period=<script>alert(1)</script> and watch it land in the page unescaped.'],
    lesson: 'Reflected input is still injection; encode every value echoed into a page, even "harmless" filters and headings.',
    impact: 'A crafted analytics link runs script in a victim customer\u2019s browser — phishing and session theft wearing the platform\u2019s own URL.',
    report: { title: 'Reflected Cross-Site Scripting in Analytics Filter', severity: 'Medium', remediation: 'HTML-encode all reflected parameters and validate the period against an allow-list format.' } },
  /* ---- Sharing & Permissions ---- */
  { id: 'share-escalation', feature: 'Sharing & Permissions', name: 'View-only grantee upgrades their own share to full control', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    hints: ['Alice granted Carol view-only access. The scope-change endpoint does not ask WHO is calling it.', 'Only the grant\u2019s owner should be able to change its scope. The server never checks.', 'As Carol, POST /shares/1/scope with scope=full — your view-only grant becomes full control.'],
    lesson: 'Permission changes are themselves privileged operations; the actor\u2019s authority over the grant must be checked, not just the grant\u2019s existence.',
    impact: 'An accountant or family member with read-only access silently becomes a full controller of the victim\u2019s finances — insider fraud with no alarm.',
    report: { title: 'Share Scope Escalation by Grantee (Missing Owner Check)', severity: 'Critical', remediation: 'Only the grant owner may change scope; authorize scope changes server-side and audit them.' } },
  { id: 'share-write', feature: 'Sharing & Permissions', name: 'View-only shared access can still move money (scope not enforced)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The shared dashboard renders a transfer form for viewers. Rendering is not the flaw — the endpoint accepts it.', 'The server checks a grant EXISTS for the shared account, never what its scope allows.', 'As Carol (view-only on Alice), POST /shared/2/transfer moving money from Alice\u2019s account — it settles.'],
    lesson: 'Read and write are different permissions; every write path must re-check scope, not inherit trust from a view grant.',
    impact: 'Anyone ever given view access — an accountant, an ex-partner — can drain the account they were only meant to watch.',
    report: { title: 'View-Only Share Scope Not Enforced on Transfers', severity: 'Critical', remediation: 'Enforce grant scope on every action: view grants are read-only, checked server-side per request.' } },
  { id: 'share-invite-abuse', feature: 'Sharing & Permissions', name: 'Share invite can be accepted by the wrong account', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Alice invited Bob by email with a token link. The accept endpoint checks the token — and nothing about who clicks it.', 'An invite is bound to an email address in the data, but not in the code.', 'Log in as Carol and open /shares/accept?token=inv-8f42c1 — the grant lands on Carol, not Bob.'],
    lesson: 'Invite tokens must be bound to the invited identity and verified at acceptance; a bearer link is a bearer permission.',
    impact: 'A forwarded or leaked invite link hands financial access to whoever opens it first — no trace back to the intended person.',
    report: { title: 'Share Invitation Not Bound to Invited Account', severity: 'High', remediation: 'Bind invites to the invited email, require the accepting account to match, and expire invites quickly.' } },
  /* ---- Admin Panel ---- */
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'Admin user deletion via a simple GET link (CSRF)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The admin panel deletes users from a plain link — a state change riding on GET.', 'GET requests need no token and no confirmation, so any page can fire one in an admin\u2019s browser.', 'As admin, visit /admin/delete?id=5 — the demo user is gone, no form, no token.'],
    lesson: 'State changes must never ride on GET and always need CSRF tokens; a link is the easiest request in the world to trick a browser into making.',
    impact: 'One malicious image tag on any page an admin views deletes customer accounts — destructive power with zero clicks.',
    report: { title: 'State-Changing Admin Action over GET without CSRF Protection', severity: 'High', remediation: 'Move destructive actions to POST/DELETE with CSRF tokens and confirmation.' } },
  /* ---- Platform & API ---- */
  { id: 'api-users-dump', feature: 'Platform & API', name: 'Unauthenticated API dumps every user including passwords', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The JSON API has a users collection endpoint. Try it with no login at all.', 'Debug-era endpoints tend to survive because nobody links to them.', 'curl /api/users with no cookies — every account, email and password comes back as JSON.'],
    lesson: 'Every route needs authentication and field-level restraint; an unlinked endpoint is still a public endpoint.',
    impact: 'The entire customer credential list in one request — every account on the platform falls at once.',
    report: { title: 'Unauthenticated User Enumeration Endpoint Exposes Passwords', severity: 'Critical', remediation: 'Require authentication and admin authorization on user-listing APIs; never serialize password fields.' } },
  { id: 'weak-api-key', feature: 'Platform & API', name: 'API key derived from the email address (base64)', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    hints: ['Your API key is shown on the API docs page. Look at its structure — it is an encoding, not a secret.', 'ftk_ plus base64 of… something you already know about every user.', "Compute base64('bob@hexafintech.local'), prefix ftk_, and call /api/accounts?userId=3 with that X-API-Key — Bob's accounts open."],
    lesson: 'API keys must be high-entropy random secrets; a key derived from public data authenticates everyone to everyone.',
    impact: 'Anyone can forge any customer\u2019s API key from their email address and pull their financial data programmatically.',
    report: { title: 'Predictable API Key Derived from Email Address', severity: 'High', remediation: 'Issue random ≥128-bit API keys, store them hashed, and scope each key to its owner\u2019s data only.' } }
];
const TEST_BY_ID = {}; TESTS.forEach(t => TEST_BY_ID[t.id] = t);
const FEATURES = []; TESTS.forEach(t => { if (!FEATURES.includes(t.feature)) FEATURES.push(t.feature); });

/* ---- more scattered fragments ---- */
const THEME_B = ['NC00NA==', 'VC01NA=='];

/* ============================ PROGRESS ENGINE ============================ */
let state = freshState();
function freshState() { return { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false }; }
function loadState() {
  try { if (fs.existsSync(PROGRESS_FILE)) { const s = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); if (s && typeof s === 'object') state = Object.assign(freshState(), s); } } catch (e) { /* corrupted state -> fresh */ }
}
function saveState() { try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 1)); } catch (e) {} }
loadState();

function doneCount() { return TESTS.filter(t => state.tests[t.id]).length; }
function isComplete() { return doneCount() === TESTS.length; }
function pass(id) {
  if (!TEST_BY_ID[id] || state.tests[id]) return;
  state.tests[id] = true;
  if (isComplete() && !state.completedAt) { state.completedAt = new Date().toISOString(); state.keyRevealed = true; }
  saveState();
}
function attempt(feature) { state.attempts[feature] = (state.attempts[feature] || 0) + 1; saveState(); }
function featureStats() {
  const out = {};
  FEATURES.forEach(f => out[f] = { total: 0, done: 0, attempts: state.attempts[f] || 0 });
  TESTS.forEach(t => { out[t.feature].total++; if (state.tests[t.id]) out[t.feature].done++; });
  return out;
}

/* ---- key assembly (fragments scattered through this file) ---- */
const THEME_C = ['VUVXQw==', 'QUJROQ=='];
function assembleKey(parts) { return parts.map(p => Buffer.from(p, 'base64').toString('utf8').split('').reverse().join('')).join(''); }
function entryKey() { return assembleKey(THEME_A.slice(0, 1).concat(THEME_B.slice(0, 1), THEME_C.slice(0, 1), THEME_D, THEME_E, THEME_F)); }
function completionKey() { return assembleKey(THEME_A.slice(0, 1).concat(THEME_B.slice(1, 2), THEME_C.slice(1, 2), THEME_G, THEME_H, THEME_I)); }

/* ============================ HELPERS ============================ */
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function money(n) { return '$' + Number(n).toLocaleString('en-US'); }
function userById(id) { return users.find(u => u.id === Number(id)); }
function userByEmail(email) { return users.find(u => u.email === String(email || '').toLowerCase()); }
function tokenFor(u) { let s = 0; for (const ch of u.email) s += ch.charCodeAt(0); return 'FT' + u.id + '-' + ((s * 7) % 90000 + 10000); }
function apiKeyFor(u) { return 'ftk_' + Buffer.from(u.email).toString('base64'); }
function hasPayload(s) { return /<script|onerror\s*=|onload\s*=|<svg|<img[^>]*onerror|<iframe/i.test(String(s || '')); }
function parseCookies(req) { const out = {}; String(req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); }); return out; }
function readBody(req) {
  return new Promise(resolve => {
    let data = ''; let big = false;
    req.on('data', c => { data += c; if (data.length > 200000) { big = true; req.destroy(); } });
    req.on('end', () => {
      if (big) return resolve({});
      const ct = String(req.headers['content-type'] || '');
      if (ct.includes('application/json')) { try { return resolve(JSON.parse(data || '{}')); } catch (e) { return resolve({}); } }
      const out = {}; new URLSearchParams(data).forEach((v, k) => out[k] = v); resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}
function sessionOf(req) { const c = parseCookies(req); const s = c.hxsid && sessions.get(c.hxsid); return s ? { sid: c.hxsid, userId: s.userId, marker: s.marker } : null; }
function currentUser(req) { const s = sessionOf(req); return s ? userById(s.userId) : null; }
function startSession(res, user) {
  const sid = crypto.randomBytes(12).toString('hex');
  const marker = crypto.randomBytes(8).toString('hex');
  sessions.set(sid, { userId: user.id, marker });
  res.setHeader('Set-Cookie', [
    'hxsid=' + sid + '; Path=/; HttpOnly',
    'hx_role=' + user.role + '; Path=/',
    'hx_origin=' + marker + '; Path=/'
  ]);
  return marker;
}
/* CSRF proof: a state-changing POST that does not carry the session marker (and/or arrives cross-site) */
function csrfSuspect(req, sess, body) {
  if (!sess) return false;
  const origin = String(req.headers.origin || req.headers.referer || '');
  const cross = origin && !origin.includes('127.0.0.1:' + PORT) && !origin.includes('localhost:' + PORT);
  return cross || !body || body.hx_marker !== sess.marker;
}

/* ---- legacy string-built query evaluator (the vulnerable SSO path) ---- */
function splitTop(s, word) {
  const parts = []; let cur = '', inQ = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "'") inQ = !inQ;
    if (!inQ && s.slice(i, i + word.length).toUpperCase() === word && /\s/.test(s[i - 1] || ' ') && /\s/.test(s[i + word.length] || ' ')) {
      parts.push(cur); cur = ''; i += word.length - 1; continue;
    }
    cur += ch;
  }
  parts.push(cur); return parts;
}
function evalAtom(a, row) {
  const m = a.match(/^(.+?)\s*=\s*(.+)$/); if (!m) return false;
  const val = raw => { const s = String(raw).trim(); if (/^'.*'$/.test(s)) return s.slice(1, -1); if (/^-?\d+$/.test(s)) return s; if (Object.prototype.hasOwnProperty.call(row, s)) return String(row[s]); return s; };
  return val(m[1]) === val(m[2]);
}
function legacyQueryLogin(email, password) {
  const q = "email='" + email + "' AND password='" + password + "'";
  const noComment = q.replace(/--[\s\S]*$/, '').replace(/#[\s\S]*$/, '');
  for (const u of users) {
    const row = { email: u.email, password: u.password };
    const ok = splitTop(noComment, 'OR').some(part => splitTop(part, 'AND').every(atom => evalAtom(atom, row)));
    if (ok) return u;
  }
  return null;
}

/* ============================ UI ============================ */
const THEME_D = ['LTUyNQ=='];
function progressBar() {
  const done = doneCount(), total = TESTS.length, pct = Math.floor(done / total * 100);
  return '<div style="background:#0d1430;border-bottom:1px solid #26305a;padding:8px 18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">' +
    '<img src="/logo.png" alt="HexaCyberLab" style="height:30px"> <strong>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</strong>' +
    '<span style="color:' + PALETTE.muted + '">' + done + '/' + total + ' tests · ' + pct + '%</span>' +
    '<span style="flex:1;min-width:120px;background:#1b2447;border-radius:6px;height:10px;overflow:hidden"><span style="display:block;height:100%;width:' + pct + '%;background:linear-gradient(90deg,#4f7cff,#9b5cff)"></span></span>' +
    (isComplete() ? '<a style="color:#7be2a0" href="/complete">✔ Lab complete — view debrief</a>' : '<a style="color:' + PALETTE.muted + '" href="/tests">Mission page</a>') + '</div>';
}
function chatWidget() {
  return '<div id="coach" style="position:fixed;right:16px;bottom:16px;width:320px;max-width:92vw;background:#101830;border:1px solid #2c3a6e;border-radius:12px;overflow:hidden;font-size:14px;z-index:50">' +
    '<div style="background:#1b2447;padding:8px 12px;font-weight:bold">💬 Lab Coach</div>' +
    '<div id="coachLog" style="height:170px;overflow:auto;padding:10px;color:#cdd6f4"></div>' +
    '<div style="display:flex;border-top:1px solid #2c3a6e"><input id="coachIn" placeholder="Ask the coach…" style="flex:1;background:#0b1020;color:#fff;border:0;padding:9px"><button onclick="coachSend()" style="background:#4f7cff;color:#fff;border:0;padding:0 14px;cursor:pointer">Send</button></div></div>' +
    '<script>async function coachSend(){var i=document.getElementById("coachIn"),l=document.getElementById("coachLog");var m=i.value.trim();if(!m)return;i.value="";l.innerHTML+="<div><b>You:</b> "+m.replace(/</g,"&lt;")+"</div>";try{var r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:m})});var j=await r.json();l.innerHTML+="<div style=\\"margin:6px 0\\"><b>Coach:</b> "+j.reply.replace(/</g,"&lt;")+"</div>";}catch(e){l.innerHTML+="<div><b>Coach:</b> (connection error)</div>";}l.scrollTop=l.scrollHeight;}</script>';
}
function layout(req, title, body, opts) {
  opts = opts || {};
  const u = opts.user !== undefined ? opts.user : currentUser(req);
  const nav = u ? '<nav style="display:flex;gap:14px;flex-wrap:wrap;padding:10px 18px;background:#0d1430;border-bottom:1px solid #26305a">' +
    '<a href="/dashboard">Dashboard</a><a href="/accounts">Accounts</a><a href="/cards">Cards</a><a href="/transfer">Transfer</a><a href="/analytics">Analytics</a><a href="/shares">Sharing</a><a href="/users/' + u.id + '/profile">My Financial Profile</a><a href="/api/docs">API</a><a href="/profile">Profile Settings</a>' +
    '<span style="margin-left:auto;color:' + PALETTE.muted + '">' + esc(u.name) + ' (' + esc(u.role) + ') · <a href="/logout">Logout</a></span></nav>' :
    '<nav style="padding:10px 18px;background:#0d1430;border-bottom:1px solid #26305a"><a href="/login">Login</a> · <a href="/register">Register</a></nav>';
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(title) + ' — ' + LAB_NAME + '</title>' +
    '<style>body{margin:0;font-family:system-ui,Segoe UI,Arial;background:' + PALETTE.bg + ';color:' + PALETTE.text + '}a{color:#8fb0ff}.card{background:' + PALETTE.card + ';border:1px solid #26305a;border-radius:10px;padding:16px;margin:14px 18px}input,select,textarea{background:#0b1020;color:#fff;border:1px solid #33406e;border-radius:6px;padding:8px;margin:4px 0;width:100%;box-sizing:border-box}button,.btn{background:linear-gradient(90deg,#4f7cff,#9b5cff);color:#fff;border:0;border-radius:6px;padding:9px 18px;cursor:pointer;text-decoration:none;display:inline-block}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #26305a;padding:7px;text-align:left}.muted{color:' + PALETTE.muted + '}main{max-width:1020px;margin:0 auto;padding-bottom:90px}</style></head><body>' +
    progressBar() + nav + '<main>' + body + '</main>' + chatWidget() + '</body></html>';
}
function gatePage(req, err) {
  const body = '<div class="card" style="max-width:560px;margin:40px auto;text-align:center">' +
    '<img src="/logo.png" style="height:64px"><h1>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h1>' +
    '<p>This lab is locked. Paste the completion key from Lab ' + (LAB_NUMBER - 1) + ' to start.</p>' +
    (err ? '<p style="color:#ff8f8f">' + esc(err) + '</p>' : '') +
    '<form method="POST" action="/unlock"><input name="key" placeholder="Completion key from Lab ' + (LAB_NUMBER - 1) + '" autocomplete="off"><button type="submit">Unlock Lab ' + LAB_NUMBER + '</button></form>' +
    '<p class="muted">HexaCyberLab vulnerable-lab series — for authorised local training only.</p></div>';
  return '<!doctype html><html><head><meta charset="utf-8"><title>Locked — ' + LAB_NAME + '</title><style>body{margin:0;font-family:system-ui;background:' + PALETTE.bg + ';color:' + PALETTE.text + '}input{background:#0b1020;color:#fff;border:1px solid #33406e;border-radius:6px;padding:9px;width:100%;box-sizing:border-box;margin:8px 0}button{background:linear-gradient(90deg,#4f7cff,#9b5cff);color:#fff;border:0;border-radius:6px;padding:10px 22px;cursor:pointer}.card{background:' + PALETTE.card + ';border:1px solid #26305a;border-radius:10px;padding:22px}.muted{color:' + PALETTE.muted + '}</style></head><body>' + body + chatWidget() + '</body></html>';
}
function loginPage(req, msg) {
  return layout(req, 'Login', '<div class="card" style="max-width:460px;margin:30px auto"><h2>Welcome back to HexaFintech</h2>' +
    (msg ? '<p style="color:#ffb3b3">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/login"><label>Email</label><input name="email" type="email" required><label>Password</label><input name="password" type="password" required><button type="submit">Log in</button></form>' +
    '<p class="muted">Demo accounts: alice@hexafintech.local / alice123 · bob@hexafintech.local / bob123 · carol@hexafintech.local / carol123</p>' +
    '<p><a href="/forgot">Forgot password?</a> · <a href="/register">Create an account</a></p></div>', { user: null });
}
function registerPage(req, msg) {
  return layout(req, 'Register', '<div class="card" style="max-width:460px;margin:30px auto"><h2>Create your HexaFintech account</h2>' +
    (msg ? '<p style="color:#ffb3b3">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/register"><label>Full name</label><input name="name" required><label>Email</label><input name="email" type="email" required><label>Password</label><input name="password" type="password" required><button type="submit">Create account</button></form></div>', { user: null });
}
function dashboardPage(req, u) {
  const mine = accounts.filter(a => a.owner === u.id);
  const prof = profiles[u.id] || { income: 0, netWorth: 0, risk: '-', goal: '-' };
  const recent = transactions.filter(t => t.from === u.id || t.to === u.id).slice(-5).reverse();
  const rows = mine.map(a => '<tr><td>' + esc(a.bank) + ' ' + esc(a.type) + ' •••' + esc(a.last4) + '</td><td>' + money(a.balance) + '</td><td><a href="/accounts/' + a.id + '">Open</a></td></tr>').join('');
  const tx = recent.map(t => '<tr><td>' + esc(t.when) + '</td><td>' + esc(t.note) + '</td><td>' + money(t.amount) + '</td></tr>').join('');
  /* NOTE (intentional flaw): display name rendered unescaped here -> stored XSS surface */
  return layout(req, 'Dashboard', '<div class="card"><h2>Hello, ' + u.name + '</h2>' +
    '<p class="muted">Monthly income ' + money(prof.income) + ' · Net worth ' + money(prof.netWorth) + ' · Risk profile ' + esc(prof.risk) + ' · Goal: ' + esc(prof.goal) + '</p></div>' +
    '<div class="card"><h3>Linked accounts</h3><table>' + rows + '</table></div>' +
    '<div class="card"><h3>Recent activity</h3><table>' + tx + '</table></div>');
}
const THEME_E = ['UlNHNg=='];
function profileSettingsPage(req, u, msg) {
  const sess = sessionOf(req);
  return layout(req, 'Profile settings', '<div class="card" style="max-width:560px"><h2>Profile settings</h2>' +
    (msg ? '<p style="color:#7be2a0">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/profile"><input type="hidden" name="hx_marker" value="' + esc(sess ? sess.marker : '') + '">' +
    '<label>Display name</label><input name="name" value="' + esc(u.name) + '">' +
    '<label>Phone</label><input name="phone" value="' + esc(u.phone) + '">' +
    '<p class="muted">Tier: ' + esc(u.tier) + ' · Daily transfer limit: ' + money(u.dailyLimit) + ' · Role: ' + esc(u.role) + '</p>' +
    '<button type="submit">Save changes</button></form></div>');
}
function finProfilePage(req, viewer, target) {
  const p = profiles[target.id] || { income: 0, netWorth: 0, risk: '-', goal: '-' };
  const accts = accounts.filter(a => a.owner === target.id).map(a => '<tr><td>' + esc(a.bank) + ' ' + esc(a.type) + ' •••' + esc(a.last4) + '</td><td>' + money(a.balance) + '</td></tr>').join('');
  /* NOTE (intentional flaw): name rendered unescaped (stored XSS reaches other viewers) */
  return layout(req, 'Financial profile', '<div class="card"><h2>Financial profile — ' + target.name + '</h2>' +
    '<table><tr><th>Email</th><td>' + esc(target.email) + '</td></tr><tr><th>Monthly income</th><td>' + money(p.income) + '</td></tr>' +
    '<tr><th>Net worth</th><td>' + money(p.netWorth) + '</td></tr><tr><th>Risk profile</th><td>' + esc(p.risk) + '</td></tr><tr><th>Savings goal</th><td>' + esc(p.goal) + '</td></tr>' +
    '<tr><th>Tier</th><td>' + esc(target.tier) + '</td></tr><tr><th>Daily limit</th><td>' + money(target.dailyLimit) + '</td></tr></table></div>' +
    '<div class="card"><h3>Linked accounts</h3><table>' + accts + '</table></div>');
}
function accountsPage(req, u) {
  const mine = accounts.filter(a => a.owner === u.id);
  return layout(req, 'Accounts', '<div class="card"><h2>Your linked accounts</h2><table><tr><th>Account</th><th>Balance</th><th></th></tr>' +
    mine.map(a => '<tr><td>' + esc(a.bank) + ' ' + esc(a.type) + ' •••' + esc(a.last4) + '</td><td>' + money(a.balance) + '</td><td><a href="/accounts/' + a.id + '">Details &amp; statement</a></td></tr>').join('') + '</table></div>');
}
function accountDetailPage(req, u, a) {
  const owner = userById(a.owner);
  return layout(req, 'Account detail', '<div class="card"><h2>' + esc(a.bank) + ' ' + esc(a.type) + ' •••' + esc(a.last4) + '</h2>' +
    '<p>Account holder: ' + esc(owner ? owner.name : '?') + '<br>Live balance: <strong>' + money(a.balance) + '</strong></p>' +
    '<p><a class="btn" href="/statements/download?file=stmt-' + a.id + '.txt">Download statement (.txt)</a></p>' +
    '<p class="muted">Statements are generated for the account holder and stored under /statements/.</p></div>');
}

const THEME_F = ['SFZVUQ=='];
function cardsPage(req, u) {
  const mine = cards.filter(c => c.owner === u.id);
  return layout(req, 'Cards', '<div class="card"><h2>Your virtual cards</h2><p class="muted">Platform maximum virtual-card limit: $5,000.</p><table><tr><th>Card</th><th>Number</th><th>Limit</th><th></th></tr>' +
    mine.map(c => '<tr><td>' + esc(c.label) + '</td><td>•••• •••• •••• ' + esc(c.pan.slice(-4)) + '</td><td>' + money(c.limit) + '</td><td><a href="/cards/' + c.id + '">Reveal details</a></td></tr>').join('') + '</table></div>');
}
function cardDetailPage(req, u, c) {
  const owner = userById(c.owner);
  const sess = sessionOf(req);
  return layout(req, 'Card detail', '<div class="card"><h2>' + esc(c.label) + '</h2>' +
    '<table><tr><th>Card holder</th><td>' + esc(owner ? owner.name : '?') + '</td></tr>' +
    '<tr><th>Full card number</th><td><strong>' + esc(c.pan) + '</strong></td></tr>' +
    '<tr><th>CVV</th><td><strong>' + esc(c.cvv) + '</strong></td></tr>' +
    '<tr><th>Expiry</th><td>' + esc(c.expiry) + '</td></tr><tr><th>Spending limit</th><td>' + money(c.limit) + '</td></tr></table>' +
    '<form method="POST" action="/cards/' + c.id + '/limit" style="margin-top:14px"><input type="hidden" name="hx_marker" value="' + esc(sess ? sess.marker : '') + '">' +
    '<label>New spending limit ($)</label><input name="limit" type="number" value="' + c.limit + '"><button type="submit">Update limit</button></form></div>');
}
function transferPage(req, u, msg) {
  const mine = accounts.filter(a => a.owner === u.id);
  const sess = sessionOf(req);
  return layout(req, 'Transfer', '<div class="card" style="max-width:560px"><h2>Send money</h2>' +
    (msg ? '<p>' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/transfer"><input type="hidden" name="hx_marker" value="' + esc(sess ? sess.marker : '') + '">' +
    '<label>From account</label><select name="fromAccount">' + mine.map(a => '<option value="' + a.id + '">' + esc(a.bank) + ' ' + esc(a.type) + ' •••' + esc(a.last4) + ' — ' + money(a.balance) + '</option>').join('') + '</select>' +
    '<label>Recipient email</label><input name="toEmail" type="email" required>' +
    '<label>Amount ($)</label><input name="amount" type="number" step="0.01" required>' +
    '<label>Note</label><input name="note"><button type="submit">Send</button></form>' +
    '<p class="muted">Your daily transfer limit: ' + money(u.dailyLimit) + '</p></div>');
}
function analyticsPage(req, u, period) {
  const rows = (spending[u.id] || []).map(s => '<tr><td>' + esc(s.category) + '</td><td>' + money(s.amount) + '</td></tr>').join('');
  /* NOTE (intentional flaw): period reflected unescaped -> reflected XSS surface */
  return layout(req, 'Analytics', '<div class="card"><h2>Spending analytics — ' + period + '</h2>' +
    '<form method="GET" action="/analytics"><label>Period</label><input name="period" value="' + esc(period) + '"><button type="submit">Apply</button></form>' +
    '<table><tr><th>Category</th><th>Spent</th></tr>' + rows + '</table>' +
    '<p style="margin-top:12px"><a class="btn" href="/analytics/export.csv">Export my analytics (CSV)</a></p></div>');
}
function sharesPage(req, u, msg) {
  const sess = sessionOf(req);
  const given = grants.filter(g => g.owner === u.id).map(g => { const gr = userById(g.grantee); return '<tr><td>' + esc(gr ? gr.name : '?') + '</td><td>' + esc(g.scope) + '</td><td>' + esc(g.label) + '</td></tr>'; }).join('');
  const received = grants.filter(g => g.grantee === u.id).map(g => { const ow = userById(g.owner); return '<tr><td>' + esc(ow ? ow.name : '?') + '</td><td>' + esc(g.scope) + '</td><td><a href="/shared/' + g.owner + '">Open shared view</a></td>' +
    '<td><form method="POST" action="/shares/' + g.id + '/scope"><input type="hidden" name="hx_marker" value="' + esc(sess ? sess.marker : '') + '"><select name="scope"><option value="view">view</option><option value="full">full</option></select> <button type="submit">Change scope</button></form></td></tr>'; }).join('');
  const myInvites = invites.filter(i => i.owner === u.id && !i.used).map(i => '<tr><td>' + esc(i.email) + '</td><td>/shares/accept?token=' + esc(i.token) + '</td></tr>').join('');
  return layout(req, 'Sharing', '<div class="card"><h2>Sharing &amp; permissions</h2>' + (msg ? '<p>' + esc(msg) + '</p>' : '') +
    '<h3>Access you have given</h3><table><tr><th>Person</th><th>Scope</th><th>Label</th></tr>' + (given || '<tr><td colspan="3" class="muted">None</td></tr>') + '</table>' +
    '<h3>Access shared with you</h3><table><tr><th>Owner</th><th>Scope</th><th></th><th></th></tr>' + (received || '<tr><td colspan="4" class="muted">None</td></tr>') + '</table>' +
    '<h3>Grant access</h3><form method="POST" action="/shares/grant"><input type="hidden" name="hx_marker" value="' + esc(sess ? sess.marker : '') + '"><label>Person (registered email)</label><input name="granteeEmail" type="email" required><label>Scope</label><select name="scope"><option value="view">view only</option><option value="full">full control</option></select><button type="submit">Grant access</button></form>' +
    '<h3>Invite by link</h3><form method="POST" action="/shares/invite"><input type="hidden" name="hx_marker" value="' + esc(sess ? sess.marker : '') + '"><label>Invitee email</label><input name="email" type="email" required><button type="submit">Create invite link</button></form>' +
    (myInvites ? '<table><tr><th>Invited</th><th>Link</th></tr>' + myInvites + '</table>' : '') + '</div>');
}
function sharedPage(req, u, owner, grant, msg) {
  const sess = sessionOf(req);
  const accts = accounts.filter(a => a.owner === owner.id);
  return layout(req, 'Shared view', '<div class="card"><h2>Shared view — ' + esc(owner.name) + '</h2>' +
    '<p class="muted">Your access scope: <strong>' + esc(grant.scope) + '</strong>. View-only access is read-only.</p>' + (msg ? '<p>' + esc(msg) + '</p>' : '') +
    '<table><tr><th>Account</th><th>Balance</th></tr>' + accts.map(a => '<tr><td>' + esc(a.bank) + ' ' + esc(a.type) + ' •••' + esc(a.last4) + '</td><td>' + money(a.balance) + '</td></tr>').join('') + '</table>' +
    '<h3>Pay from ' + esc(owner.name) + '\u2019s account</h3>' +
    '<form method="POST" action="/shared/' + owner.id + '/transfer"><input type="hidden" name="hx_marker" value="' + esc(sess ? sess.marker : '') + '">' +
    '<label>From account</label><select name="fromAccount">' + accts.map(a => '<option value="' + a.id + '">' + esc(a.bank) + ' ' + esc(a.type) + ' •••' + esc(a.last4) + '</option>').join('') + '</select>' +
    '<label>Recipient email</label><input name="toEmail" type="email" required><label>Amount ($)</label><input name="amount" type="number" step="0.01" required><button type="submit">Send from shared account</button></form></div>');
}
const THEME_G = ['LVRPUQ=='];
function adminPage(req) {
  const rows = users.map(x => '<tr><td>' + x.id + '</td><td>' + esc(x.name) + '</td><td>' + esc(x.email) + '</td><td>' + esc(x.role) + '</td><td><a href="/admin/delete?id=' + x.id + '">Delete user</a></td></tr>').join('');
  return layout(req, 'Admin', '<div class="card"><h2>Admin panel — all users</h2><table><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th></th></tr>' + rows + '</table></div>');
}
function apiDocsPage(req, u) {
  return layout(req, 'API', '<div class="card"><h2>HexaFintech API</h2>' +
    '<p>Your API key: <code>' + esc(apiKeyFor(u)) + '</code> — send it as the <code>X-API-Key</code> header.</p>' +
    '<table><tr><th>Endpoint</th><th>What it returns</th></tr>' +
    '<tr><td>GET /api/users</td><td>User directory (JSON)</td></tr>' +
    '<tr><td>GET /api/accounts?userId=&lt;id&gt;</td><td>Linked accounts for a user (API key required)</td></tr>' +
    '<tr><td>GET /api/profile</td><td>Your financial profile (API key required)</td></tr></table></div>');
}
function testsPage(req) {
  const stats = featureStats();
  let body = '<div class="card"><h2>Mission — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h2><p class="muted">' + doneCount() + '/' + TESTS.length + ' tests complete. Tests pass only when the exploit really works — never by declaration. Hints unlock one at a time; the Lab Coach gives step-by-step help for a feature after you have genuinely tried that feature at least 3 times.</p></div>';
  FEATURES.forEach(f => {
    body += '<div class="card"><h3>' + esc(f) + ' <span class="muted">(' + stats[f].done + '/' + stats[f].total + ' · attempts: ' + stats[f].attempts + ')</span></h3>';
    TESTS.filter(t => t.feature === f).forEach((t, i) => {
      const done = !!state.tests[t.id];
      body += '<div style="border-top:1px solid #26305a;padding:9px 0"><strong>' + (done ? '✓' : '○') + ' ' + esc(t.name) + '</strong><br>' +
        '<span class="muted">' + esc(t.owasp) + ' · ' + esc(t.difficulty) + ' · ' + (done ? 'Done' : 'Open') + '</span>' +
        '<details style="margin-top:5px"><summary>Hints</summary><ol>' + t.hints.map(h => '<li>' + esc(h) + '</li>').join('') + '</ol></details></div>';
    });
    body += '</div>';
  });
  return layout(req, 'Mission', body);
}
const THEME_H = ['Q0xRMw=='];
function completePage(req) {
  if (!isComplete()) {
    return layout(req, 'Not yet', '<div class="card"><h2>Lab not complete yet</h2><p>You have finished ' + doneCount() + ' of ' + TESTS.length + ' tests (' + Math.floor(doneCount() / TESTS.length * 100) + '%). The debrief, your completion key and the certificate unlock at 100%.</p><p><a class="btn" href="/tests">Back to the mission page</a></p></div>');
  }
  const stats = featureStats();
  const key = completionKey();
  let body = '<div class="card"><h2>🎉 Lab ' + LAB_NUMBER + ' — ' + LAB_NAME + ' complete!</h2>' +
    '<h3>1 · Features in this lab</h3><p>' + FEATURES.length + ' features: ' + FEATURES.map(esc).join(', ') + '.</p>' +
    '<h3>2 · Vulnerabilities per feature</h3><table>' + FEATURES.map(f => '<tr><td>' + esc(f) + '</td><td>' + stats[f].total + ' tests</td></tr>').join('') + '</table>' +
    '<h3>3 · Ways testing was done (' + TESTS.length + ' techniques)</h3><ul>' + TESTS.map(t => '<li>' + esc(t.name) + '</li>').join('') + '</ul>' +
    '<h3>4 · What you learned</h3><ul>' + TESTS.map(t => '<li><strong>' + esc(t.name) + ':</strong> ' + esc(t.lesson) + '</li>').join('') + '</ul>' +
    '<h3>5 · What this means for a real client</h3><ul>' + TESTS.map(t => '<li><strong>' + esc(t.name) + ':</strong> ' + esc(t.impact) + '</li>').join('') + '</ul>' +
    '<h3>6 · Writing it in a real report</h3><table><tr><th>Finding</th><th>Severity</th><th>Remediation</th></tr>' +
    TESTS.map(t => '<tr><td>' + esc(t.report.title) + '</td><td>' + esc(t.report.severity) + '</td><td>' + esc(t.report.remediation) + '</td></tr>').join('') + '</table>' +
    '<h3>Your completion key for Lab ' + (LAB_NUMBER + 1) + '</h3><p style="font-size:20px;background:#0b1020;border:1px solid #4f7cff;border-radius:8px;padding:14px;text-align:center"><code>' + esc(key) + '</code></p>' +
    '<form method="POST" action="/tester-name"><label>Your name for the certificate</label><input name="name" value="' + esc(state.testerName) + '"><button type="submit">Save name</button></form>' +
    '<p style="margin-top:12px"><a class="btn" href="/certificate">View your certificate</a></p></div>';
  return layout(req, 'Lab complete', body);
}
const THEME_I = ['SlNHVQ=='];
function certificatePage(req) {
  if (!isComplete()) return layout(req, 'Locked', '<div class="card"><h2>Certificate locked</h2><p>Finish 100% of the tests first.</p></div>');
  const name = state.testerName || (currentUser(req) ? currentUser(req).name : 'HexaCyberLab Tester');
  const date = state.completedAt ? new Date(state.completedAt).toDateString() : new Date().toDateString();
  return '<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ' + LAB_NUMBER + '</title><style>body{font-family:Georgia,serif;background:#e9ecf5;margin:0;padding:30px}.cert{max-width:760px;margin:0 auto;background:#fff;border:6px double #31418f;border-radius:14px;padding:36px;text-align:center;color:#14204a}h1{margin:8px 0}.muted{color:#5a6a94}@media print{body{background:#fff;padding:0}}</style></head><body>' +
    '<div class="cert"><img src="/logo.png" style="height:74px"><h1>Certificate of Completion</h1>' +
    '<p class="muted">This certifies that</p><h2>' + esc(name) + '</h2>' +
    '<p>has completed 100% of the security tests in <strong>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</strong><br>(' + TESTS.length + ' tests across ' + FEATURES.length + ' features)</p>' +
    '<p class="muted">Completed on ' + esc(date) + '</p>' +
    '<p><strong>HexaCyberLab — Built by Md. Jony Hassain, Founder</strong></p></div></body></html>';
}

/* ============================ CHATBOT ============================ */
const FEATURE_KEYWORDS = [
  ['Login & Authentication', ['login', 'password', 'auth', 'brute', 'reset', 'enumerat', 'cookie', 'session', 'sqli', 'injection login', 'default']],
  ['Registration & Profile', ['register', 'registration', 'profile', 'mass assignment', 'display name']],
  ['Financial Profiles & Accounts', ['financial profile', 'account', 'statement', 'traversal', 'income', 'net worth', 'linked']],
  ['Cards', ['card', 'pan', 'cvv', 'limit']],
  ['Transfers', ['transfer', 'overdraft', 'negative', 'send money']],
  ['Spending Analytics', ['analytics', 'export', 'spending', 'csv']],
  ['Sharing & Permissions', ['shar', 'permission', 'grant', 'invite', 'view-only', 'view only', 'accountant']],
  ['Admin Panel', ['admin', 'delete user']],
  ['Platform & API', ['api', 'key', 'endpoint', 'dump']]
];
function matchFeature(msg) {
  const m = msg.toLowerCase();
  for (const [f, kws] of FEATURE_KEYWORDS) if (kws.some(k => m.includes(k))) return f;
  return null;
}
function chatReply(rawMsg) {
  const msg = String(rawMsg || '');
  const m = msg.toLowerCase();
  const stats = featureStats();
  if (/who (built|made|created)|founder|jony|hassain/.test(m)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (/(completion|next lab|unlock)? ?key/.test(m) && /(give|what|share|tell|show|get)/.test(m)) {
    if (isComplete() && state.keyRevealed) return 'You earned it — the completion key for Lab ' + (LAB_NUMBER + 1) + ' is: ' + completionKey();
    return 'I don\u2019t have the completion key yet — I only receive it when this lab is completed. You are at ' + Math.floor(doneCount() / TESTS.length * 100) + '% (' + doneCount() + '/' + TESTS.length + ' tests). Finish every test and I\u2019ll share it.';
  }
  if (/progress|how am i|status|score/.test(m)) {
    return 'Your progress: ' + doneCount() + '/' + TESTS.length + ' tests (' + Math.floor(doneCount() / TESTS.length * 100) + '%). ' + FEATURES.map(f => f + ' ' + stats[f].done + '/' + stats[f].total).join(' · ') + '.';
  }
  const feat = matchFeature(m);
  if (/(how many|list|which tests|what tests|what are the tests)/.test(m)) {
    if (feat) { const list = TESTS.filter(t => t.feature === feat); return 'The ' + feat + ' feature has ' + list.length + ' tests: ' + list.map(t => t.name + (state.tests[t.id] ? ' ✓' : '')).join(' | ') + '. The map is public — the step-by-step HOW is what unlocks after 3 tries.'; }
    return 'This lab has ' + TESTS.length + ' tests across ' + FEATURES.length + ' features: ' + FEATURES.map(f => f + ' (' + stats[f].total + ')').join(', ') + '. Open /tests for the full mission list.';
  }
  if (/how (do|can|to)|guide|step|solve|help me/.test(m)) {
    const f = feat || FEATURES.find(x => !TESTS.filter(t => t.feature === x).every(t => state.tests[t.id]));
    if (!f) return 'Every test is complete — congratulations! Head to /complete for your key and certificate.';
    const att = stats[f].attempts;
    const open = TESTS.filter(t => t.feature === f && !state.tests[t.id]);
    if (!open.length) return 'The ' + f + ' feature is fully solved. Pick another feature from /tests and I\u2019ll guide you once you\u2019ve tried it 3 times.';
    if (att >= 3) {
      return 'Step by step for ' + f + ':\n' + open.map(t => '• ' + t.name + ' — ' + t.hints[2]).join('\n');
    }
    return 'That feature is locked for help. First try the ' + f + ' tests yourself at least 3 times — I can see you\u2019ve tried ' + att + ' time(s) so far. After 3 real tries, ask me again and I\u2019ll guide you step by step.';
  }
  if (/^(hi|hello|hey|help)/.test(m) || m.length < 3) {
    return 'Hello! I\u2019m the Lab Coach for LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '. This lab has ' + TESTS.length + ' tests across ' + FEATURES.length + ' features and you are at ' + Math.floor(doneCount() / TESTS.length * 100) + '%. Ask me how many tests a feature has, or try a feature 3 times and ask me how to solve it.';
  }
  return 'I can help with this lab\u2019s ' + TESTS.length + ' tests across ' + FEATURES.length + ' features. Try asking: "how many tests in Cards?", "what is my progress?", or — after 3 genuine tries on a feature — "how do I solve the ' + (FEATURES[0]) + ' tests?" Full list: /tests.';
}

/* ============================ ROUTER ============================ */
function send(res, code, body, type) { res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' }); res.end(body); }
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:' + PORT);
    const p = url.pathname;
    const method = req.method;

    if (p === '/logo.png') { res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(fs.readFileSync(path.join(DIR, 'logo.png'))); }

    if (p === '/api/progress') {
      return send(res, 200, JSON.stringify({ lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done: doneCount(), pct: Math.floor(doneCount() / TESTS.length * 100), features: featureStats(), complete: isComplete() }), 'application/json');
    }
    if (p === '/api/chat' && method === 'POST') {
      const body = await readBody(req);
      return send(res, 200, JSON.stringify({ reply: chatReply(body.message) }), 'application/json');
    }

    /* ---- lock gate ---- */
    if (!state.unlocked) {
      if (p === '/unlock' && method === 'POST') {
        const body = await readBody(req);
        if (String(body.key || '') === entryKey()) { state.unlocked = true; saveState(); return redirect(res, '/login'); }
        res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(gatePage(req, 'That key was not accepted.'));
      }
      return send(res, 200, gatePage(req));
    }

    if (p === '/unlock') return redirect(res, '/login');

    /* ---- auth ---- */
    if (p === '/login' && method === 'GET') return send(res, 200, loginPage(req, url.searchParams.get('e') || ''));
    if (p === '/login' && method === 'POST') {
      attempt('Login & Authentication');
      const body = await readBody(req);
      const email = String(body.email || ''), password = String(body.password || '');
      const injection = /('|--|#)/.test(email) || /('|--|#)/.test(password);
      if (injection) {
        const u = legacyQueryLogin(email, password);
        if (u) { if (password !== u.password) pass('sqli-login'); startSession(res, u); return redirect(res, '/dashboard'); }
        return send(res, 200, loginPage(req, 'Invalid email or password.'));
      }
      const user = userByEmail(email);
      if (!user) {
        enumProbe.noUser = true; if (enumProbe.wrongPw) pass('user-enumeration');
        return send(res, 200, loginPage(req, 'No account found for that email address.'));
      }
      if (user.password !== password) {
        enumProbe.wrongPw = true; if (enumProbe.noUser) pass('user-enumeration');
        loginFails[user.email] = (loginFails[user.email] || 0) + 1;
        if (loginFails[user.email] >= 10) pass('brute-force');
        return send(res, 200, loginPage(req, 'Incorrect password for this account.'));
      }
      loginFails[user.email] = 0;
      if (user.demo) pass('default-creds');
      startSession(res, user); return redirect(res, '/dashboard');
    }
    if (p === '/forgot' && method === 'GET') {
      return send(res, 200, layout(req, 'Forgot password', '<div class="card" style="max-width:460px"><h2>Reset your password</h2><form method="POST" action="/forgot"><label>Email</label><input name="email" type="email" required><button type="submit">Send reset link</button></form><p class="muted">Know your token already? <a href="/reset">Enter it here</a>.</p></div>', { user: null }));
    }
    if (p === '/forgot' && method === 'POST') {
      attempt('Login & Authentication');
      const body = await readBody(req);
      const user = userByEmail(body.email);
      if (!user) return send(res, 200, layout(req, 'Forgot password', '<div class="card" style="max-width:460px"><p>No account uses that email address.</p></div>', { user: null }));
      issuedTokens.add(tokenFor(user));
      return send(res, 200, layout(req, 'Forgot password', '<div class="card" style="max-width:460px"><p>If that email exists, a reset link has been sent. Open <a href="/reset">the reset page</a> and paste your token.</p></div>', { user: null }));
    }
    if (p === '/reset' && method === 'GET') {
      return send(res, 200, layout(req, 'Reset password', '<div class="card" style="max-width:460px"><h2>Set a new password</h2><form method="POST" action="/reset"><label>Email</label><input name="email" type="email" required><label>Reset token</label><input name="token" required><label>New password</label><input name="newpassword" type="password" required><button type="submit">Reset password</button></form></div>', { user: null }));
    }
    if (p === '/reset' && method === 'POST') {
      attempt('Login & Authentication');
      const body = await readBody(req);
      const user = userByEmail(body.email);
      if (user && String(body.token || '') === tokenFor(user)) {
        if (!issuedTokens.has(String(body.token))) pass('reset-token');
        user.password = String(body.newpassword || 'reset1234');
        return redirect(res, '/login');
      }
      return send(res, 200, layout(req, 'Reset password', '<div class="card" style="max-width:460px"><p style="color:#ffb3b3">That token was not accepted.</p></div>', { user: null }));
    }
    if (p === '/register' && method === 'GET') return send(res, 200, registerPage(req, ''));
    if (p === '/register' && method === 'POST') {
      attempt('Registration & Profile');
      const body = await readBody(req);
      const email = String(body.email || '').toLowerCase();
      if (!email || userByEmail(email)) return send(res, 200, registerPage(req, 'That email is already registered (or missing).'));
      const id = nextUserId++;
      const nu = { id, name: String(body.name || 'New User'), email, password: String(body.password || ''), role: 'user', tier: 'basic', dailyLimit: 500, phone: '', demo: false };
      if (String(body.password || '').length < 4) pass('weak-password');
      if (body.role) { nu.role = String(body.role); pass('mass-assignment'); }
      if (body.tier) { nu.tier = String(body.tier); pass('mass-assignment'); }
      if (body.dailyLimit) { nu.dailyLimit = Number(body.dailyLimit) || nu.dailyLimit; pass('mass-assignment'); }
      users.push(nu); profiles[id] = { income: 0, netWorth: 0, risk: 'New', goal: '-' };
      accounts.push({ id: nextAccountId++, owner: id, bank: 'NorthBank', type: 'Checking', last4: String(5000 + id), balance: 100 });
      startSession(res, nu); return redirect(res, '/dashboard');
    }
    if (p === '/logout') { const s = sessionOf(req); if (s) sessions.delete(s.sid); res.setHeader('Set-Cookie', ['hxsid=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0']); return redirect(res, '/login'); }

    /* ---- public API: unauthenticated user dump (intentional flaw) ---- */
    if (p === '/api/users') { attempt('Platform & API'); pass('api-users-dump'); return send(res, 200, JSON.stringify(users.map(u => ({ id: u.id, name: u.name, email: u.email, password: u.password, role: u.role, tier: u.tier }))), 'application/json'); }

    const sess = sessionOf(req); const me = currentUser(req);
    if (!me) { if (p.startsWith('/api/')) return send(res, 401, JSON.stringify({ error: 'login required' }), 'application/json'); return redirect(res, '/login'); }

    /* ---- key-authenticated API ---- */
    if (p === '/api/accounts') {
      attempt('Platform & API');
      const target = userById(url.searchParams.get('userId'));
      const key = String(req.headers['x-api-key'] || '');
      if (!target || key !== apiKeyFor(target)) return send(res, 403, JSON.stringify({ error: 'invalid api key' }), 'application/json');
      if (sess.userId !== target.id) pass('weak-api-key');
      return send(res, 200, JSON.stringify(accounts.filter(a => a.owner === target.id)), 'application/json');
    }
    if (p === '/api/profile') {
      attempt('Platform & API');
      const key = String(req.headers['x-api-key'] || '');
      if (key !== apiKeyFor(me)) return send(res, 403, JSON.stringify({ error: 'invalid api key' }), 'application/json');
      return send(res, 200, JSON.stringify({ user: { id: me.id, name: me.name, email: me.email, tier: me.tier, dailyLimit: me.dailyLimit }, profile: profiles[me.id] }), 'application/json');
    }
    if (p === '/api/docs') return send(res, 200, apiDocsPage(req, me));

    /* ---- app pages ---- */
    if (p === '/' || p === '/dashboard') return send(res, 200, dashboardPage(req, me));
    if (p === '/tests') return send(res, 200, testsPage(req));
    if (p === '/complete') return send(res, 200, completePage(req));
    if (p === '/certificate') return send(res, 200, certificatePage(req));
    if (p === '/tester-name' && method === 'POST') { const body = await readBody(req); state.testerName = String(body.name || '').slice(0, 60); saveState(); return redirect(res, '/complete'); }

    if (p === '/profile' && method === 'GET') return send(res, 200, profileSettingsPage(req, me, url.searchParams.get('ok') ? 'Saved.' : ''));
    if (p === '/profile' && method === 'POST') {
      attempt('Registration & Profile');
      const body = await readBody(req);
      if (csrfSuspect(req, sess, body)) pass('profile-csrf');
      if (body.name !== undefined) { me.name = String(body.name); if (hasPayload(me.name)) pass('stored-xss-profile'); }
      if (body.phone !== undefined) me.phone = String(body.phone);
      if (body.role !== undefined && String(body.role) !== '') { me.role = String(body.role); pass('mass-assignment'); }
      if (body.tier !== undefined && String(body.tier) !== '') { me.tier = String(body.tier); pass('mass-assignment'); }
      if (body.dailyLimit !== undefined && String(body.dailyLimit) !== '') { me.dailyLimit = Number(body.dailyLimit) || me.dailyLimit; pass('mass-assignment'); }
      return redirect(res, '/profile?ok=1');
    }

    let mm;
    if ((mm = p.match(/^\/users\/(\d+)\/profile$/)) && method === 'GET') {
      attempt('Financial Profiles & Accounts');
      const target = userById(mm[1]);
      if (!target) return send(res, 404, layout(req, 'Not found', '<div class="card"><h2>No such user</h2></div>'));
      if (target.id !== me.id) pass('profile-idor');
      return send(res, 200, finProfilePage(req, me, target));
    }
    if (p === '/accounts' && method === 'GET') return send(res, 200, accountsPage(req, me));
    if ((mm = p.match(/^\/accounts\/(\d+)$/)) && method === 'GET') {
      attempt('Financial Profiles & Accounts');
      const a = accounts.find(x => x.id === Number(mm[1]));
      if (!a) return send(res, 404, layout(req, 'Not found', '<div class="card"><h2>No such account</h2></div>'));
      if (a.owner !== me.id) pass('account-idor');
      return send(res, 200, accountDetailPage(req, me, a));
    }
    if (p === '/statements/download' && method === 'GET') {
      attempt('Financial Profiles & Accounts');
      const file = String(url.searchParams.get('file') || '');
      if (file.includes('..')) {
        pass('statement-traversal');
        try { return send(res, 200, fs.readFileSync(path.join(DIR, file.replace(/^\/+/, '')) , 'utf8'), 'text/plain; charset=utf-8'); }
        catch (e) { try { return send(res, 200, fs.readFileSync(__filename, 'utf8'), 'text/plain; charset=utf-8'); } catch (e2) { return send(res, 404, 'not found', 'text/plain'); } }
      }
      const stmt = accounts.find(a => 'stmt-' + a.id + '.txt' === file);
      if (!stmt) return send(res, 404, 'statement not found', 'text/plain');
      const owner = userById(stmt.owner);
      return send(res, 200, 'HexaFintech statement\nAccount: ' + stmt.bank + ' ' + stmt.type + ' ***' + stmt.last4 + '\nHolder: ' + (owner ? owner.name : '?') + '\nBalance: ' + money(stmt.balance) + '\nGenerated for training purposes only.\n', 'text/plain; charset=utf-8');
    }

    if (p === '/cards' && method === 'GET') return send(res, 200, cardsPage(req, me));
    if ((mm = p.match(/^\/cards\/(\d+)$/)) && method === 'GET') {
      attempt('Cards');
      const c = cards.find(x => x.id === Number(mm[1]));
      if (!c) return send(res, 404, layout(req, 'Not found', '<div class="card"><h2>No such card</h2></div>'));
      if (c.owner !== me.id) pass('card-idor');
      return send(res, 200, cardDetailPage(req, me, c));
    }
    if ((mm = p.match(/^\/cards\/(\d+)\/limit$/)) && method === 'POST') {
      attempt('Cards');
      const body = await readBody(req);
      const c = cards.find(x => x.id === Number(mm[1]));
      if (!c) return send(res, 404, 'no card', 'text/plain');
      const limit = Number(body.limit);
      if (Number.isFinite(limit)) {
        if (c.owner !== me.id) pass('card-limit-tamper');
        if (c.owner === me.id && limit > 5000) pass('card-limit-cap');
        c.limit = limit;
      }
      return redirect(res, '/cards/' + c.id);
    }

    if (p === '/transfer' && method === 'GET') return send(res, 200, transferPage(req, me, ''));
    if (p === '/transfer' && method === 'POST') {
      attempt('Transfers');
      const body = await readBody(req);
      const from = accounts.find(a => a.id === Number(body.fromAccount) && a.owner === me.id);
      const to = userByEmail(body.toEmail);
      const amount = Number(body.amount);
      if (!from || !to || !Number.isFinite(amount)) return send(res, 200, transferPage(req, me, 'Transfer could not be completed — check the account and recipient.'));
      const dest = accounts.find(a => a.owner === to.id);
      from.balance -= amount; if (dest) dest.balance += amount;
      transactions.push({ id: nextTxId++, from: me.id, to: to.id, amount, note: String(body.note || 'Transfer'), when: '2026-10-23' });
      if (amount < 0) pass('negative-transfer');
      if (from.balance < 0) pass('overdraft');
      return send(res, 200, transferPage(req, me, 'Sent ' + money(amount) + ' to ' + esc(to.name) + '. New balance: ' + money(from.balance) + '.'));
    }

    if (p === '/analytics' && method === 'GET') {
      attempt('Spending Analytics');
      const period = url.searchParams.get('period') || '2026-10';
      if (hasPayload(period)) pass('analytics-xss');
      return send(res, 200, analyticsPage(req, me, period));
    }
    if (p === '/analytics/export.csv' && method === 'GET') {
      attempt('Spending Analytics');
      if (me.role !== 'admin') pass('analytics-export-leak');
      let csv = 'user,category,amount\n';
      Object.keys(spending).forEach(uid => { const u = userById(uid); (spending[uid] || []).forEach(s => { csv += (u ? u.name : uid) + ',' + s.category + ',' + s.amount + '\n'; }); });
      res.writeHead(200, { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="analytics-export.csv"' });
      return res.end(csv);
    }

    if (p === '/shares' && method === 'GET') return send(res, 200, sharesPage(req, me, ''));
    if (p === '/shares/grant' && method === 'POST') {
      attempt('Sharing & Permissions');
      const body = await readBody(req);
      const grantee = userByEmail(body.granteeEmail);
      if (grantee && grantee.id !== me.id) grants.push({ id: nextGrantId++, owner: me.id, grantee: grantee.id, scope: body.scope === 'full' ? 'full' : 'view', label: 'Granted by ' + me.name });
      return redirect(res, '/shares');
    }
    if (p === '/shares/invite' && method === 'POST') {
      attempt('Sharing & Permissions');
      const body = await readBody(req);
      invites.push({ id: nextInviteId++, owner: me.id, email: String(body.email || '').toLowerCase(), scope: 'view', token: 'inv-' + crypto.randomBytes(3).toString('hex'), used: false });
      return redirect(res, '/shares');
    }
    if (p === '/shares/accept' && method === 'GET') {
      attempt('Sharing & Permissions');
      const inv = invites.find(i => i.token === String(url.searchParams.get('token') || '') && !i.used);
      if (!inv) return send(res, 200, layout(req, 'Invite', '<div class="card"><h2>Invite not valid</h2></div>'));
      inv.used = true;
      if (me.email !== inv.email) pass('share-invite-abuse');
      if (!grants.some(g => g.owner === inv.owner && g.grantee === me.id)) grants.push({ id: nextGrantId++, owner: inv.owner, grantee: me.id, scope: inv.scope, label: 'Accepted invite' });
      return redirect(res, '/shares');
    }
    if ((mm = p.match(/^\/shares\/(\d+)\/scope$/)) && method === 'POST') {
      attempt('Sharing & Permissions');
      const body = await readBody(req);
      const g = grants.find(x => x.id === Number(mm[1]));
      if (g && (body.scope === 'view' || body.scope === 'full')) {
        if (g.grantee === me.id && g.owner !== me.id && body.scope === 'full') pass('share-escalation');
        g.scope = body.scope;
      }
      return redirect(res, '/shares');
    }
    if ((mm = p.match(/^\/shared\/(\d+)$/)) && method === 'GET') {
      attempt('Sharing & Permissions');
      const owner = userById(mm[1]);
      const g = owner && grants.find(x => x.owner === owner.id && x.grantee === me.id);
      if (!owner || !g) return send(res, 403, layout(req, 'No access', '<div class="card"><h2>No shared access</h2></div>'));
      return send(res, 200, sharedPage(req, me, owner, g, ''));
    }
    if ((mm = p.match(/^\/shared\/(\d+)\/transfer$/)) && method === 'POST') {
      attempt('Sharing & Permissions');
      const body = await readBody(req);
      const owner = userById(mm[1]);
      const g = owner && grants.find(x => x.owner === owner.id && x.grantee === me.id);
      if (!owner || !g) return send(res, 403, 'no grant', 'text/plain');
      const from = accounts.find(a => a.id === Number(body.fromAccount) && a.owner === owner.id);
      const to = userByEmail(body.toEmail);
      const amount = Number(body.amount);
      if (!from || !to || !Number.isFinite(amount)) return send(res, 200, sharedPage(req, me, owner, g, 'Transfer could not be completed.'));
      const dest = accounts.find(a => a.owner === to.id);
      from.balance -= amount; if (dest) dest.balance += amount;
      transactions.push({ id: nextTxId++, from: owner.id, to: to.id, amount, note: 'Shared transfer by ' + me.name, when: '2026-10-23' });
      if (g.scope === 'view') pass('share-write');
      return send(res, 200, sharedPage(req, me, owner, g, 'Sent ' + money(amount) + ' from the shared account.'));
    }

    /* ---- admin: gated by the client-side role cookie (intentional flaw) ---- */
    if (p === '/admin' && method === 'GET') {
      attempt('Admin Panel');
      const cookies = parseCookies(req);
      if (cookies.hx_role !== 'admin') return send(res, 403, layout(req, 'Forbidden', '<div class="card"><h2>Admins only</h2></div>'));
      if (me.role !== 'admin') pass('cookie-role');
      return send(res, 200, adminPage(req));
    }
    if (p === '/admin/delete' && method === 'GET') {
      attempt('Admin Panel');
      const cookies = parseCookies(req);
      if (cookies.hx_role !== 'admin') return send(res, 403, 'forbidden', 'text/plain');
      const target = userById(url.searchParams.get('id'));
      if (target) { users.splice(users.indexOf(target), 1); delete profiles[target.id]; pass('admin-csrf'); }
      return redirect(res, '/admin');
    }

    return send(res, 404, layout(req, 'Not found', '<div class="card"><h2>404 — page not found</h2></div>'));
  } catch (e) {
    try { send(res, 500, 'Internal error', 'text/plain'); } catch (e2) {}
  }
});

server.listen(PORT, '127.0.0.1', () => { console.log(LAB_NAME + ' (LAB ' + LAB_NUMBER + ') listening on http://127.0.0.1:' + PORT); });
