'use strict';
/* HexaInvest — LAB 45 — investment simulator (LOCAL-ONLY training lab).
   Zero-dependency Node. Simulated market only: every price, balance and
   trade in this app is fake data inside this process. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3054, HOST = '127.0.0.1';
const LAB_NO = 45, LAB_NAME = 'HexaInvest';
const DIR = __dirname;
const STATE_FILE = path.join(DIR, 'progress.json');

/* ---- entry key material: stored only as encoded fragments (region A) ---- */

const _u = a => a.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');

/* ================= TESTS registry ================= */
const TESTS = [
  /* ---------- Login & Authentication ---------- */
  { id: 'sqli-login', feature: 'Login & Authentication', name: 'SQL injection login bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ["The login builds its database query by gluing your email and password straight into the SQL string.", "Try closing the email string early and adding a condition that is always true, e.g. an OR clause.", "Use alice@test.local' OR '1'='1 as the email (any password) — the concatenated query matches a row without knowing the password."],
    lesson: "String-built SQL queries let an attacker rewrite the login logic itself; parameterised queries make the input data, never code.",
    impact: "On a real investment platform this is full account takeover with no password at all — portfolios, balances and personal data of any investor are exposed.",
    report: { title: 'SQL Injection in Login (Authentication Bypass)', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements for all database access; never concatenate user input into SQL.' } },
  { id: 'brute-force', feature: 'Login & Authentication', name: 'Brute force — no rate limit or lockout', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ["Nothing slows you down when a password guess fails.", "Write down what happens after the 5th wrong password for alice@test.local. Then keep going.", "Submit 10 wrong passwords for the same account — the 10th is still processed normally; there is no throttle, CAPTCHA or lockout."],
    lesson: "Unlimited password guesses turn a weak password into a timed break-in; throttling and lockout are part of authentication, not extras.",
    impact: "Attackers can grind through password lists against real investor accounts; combined with credential stuffing this quietly drains accounts.",
    report: { title: 'Missing Brute-Force Protection on Login', severity: 'High', remediation: 'Add per-account and per-IP rate limiting, exponential backoff and lockout/alerting after repeated failures.' } },
  { id: 'user-enumeration', feature: 'Login & Authentication', name: 'User enumeration via login error messages', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ["Compare the login error for an email that exists with one that does not.", "alice@test.local with a wrong password answers differently from ghost@nowhere.test.", "The app says 'No account found for that email.' for strangers but 'Incorrect password.' for real accounts — a free list of valid investors."],
    lesson: "Different error messages for 'no such user' vs 'wrong password' hand attackers a verified target list before they guess a single password.",
    impact: "Enumerated investor emails feed phishing and credential-stuffing campaigns aimed at people known to hold money on the platform.",
    report: { title: 'Account Enumeration via Distinct Login Errors', severity: 'Medium', remediation: 'Return one generic error ("Invalid email or password") for every failed login, with identical timing.' } },
  { id: 'default-creds', feature: 'Login & Authentication', name: 'Default administrator credentials', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ["Every platform ships with a first admin account. This one was never changed.", "The admin mailbox follows the lab naming pattern: admin@hexainvest.local.", "Log in as admin@hexainvest.local with the password admin123 — the seeded default still works."],
    lesson: "Default credentials are public knowledge; a setup password that is never rotated is an open door with a welcome mat.",
    impact: "One guessed default login gives an attacker the whole platform: every investor, every balance, and the market controls.",
    report: { title: 'Default Credentials on Administrator Account', severity: 'Critical', remediation: 'Force a unique strong password at first login; disable or rename seeded accounts in production.' } },
  { id: 'reset-token', feature: 'Login & Authentication', name: 'Predictable password-reset token', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    hints: ["Request a password reset for your own account from /forgot and study the pattern the token must follow (your investor number is on your profile).", "The token is not random at all — it is built from your account number.", "Tokens look like INV followed by 1000 + your user id (investor #2 -> INV1002). Compute another account's token and use it on /reset."],
    lesson: "Reset tokens must be unguessable random values; a token derived from a public identifier is just a second, weaker password.",
    impact: "Anyone who knows an investor's account number can reset their password and take over the account — no inbox access needed.",
    report: { title: 'Predictable Password Reset Token', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (>=128 bits), store only a hash, expire them quickly and bind them to a single use.' } },
  { id: 'cookie-tamper', feature: 'Login & Authentication', name: 'Role stored in a client cookie (session tampering)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ["After login, inspect the cookies the app sets — one of them describes who you are.", "The hx_role cookie mirrors your account role, and the admin gate trusts it.", "Change hx_role to admin in your browser and open /admin — the server believes the cookie instead of its own records."],
    lesson: "Authorization data must live server-side; anything the client can edit — cookies included — will be edited.",
    impact: "Any investor can promote themselves to platform admin by editing a cookie, reaching user management and balance controls.",
    report: { title: 'Client-Side Role Cookie Trusted for Authorization', severity: 'High', remediation: 'Keep roles in the server-side session record only; never authorize from client-supplied values.' } },

  /* ---------- Registration & Profile ---------- */
  { id: 'weak-password', feature: 'Registration & Profile', name: 'Weak password policy (1-character passwords)', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ["Register a throwaway account and see how little password the form accepts.", "There is no minimum length or complexity check at all.", "Register with the password 'a' — the account is created and you are logged in."],
    lesson: "A password policy is the floor under every other control; without one, brute force and guessing become trivial.",
    impact: "Investors who pick short passwords are cracked in seconds, and the platform cannot claim it enforced even basic hygiene.",
    report: { title: 'No Minimum Password Strength on Registration', severity: 'Medium', remediation: 'Enforce a minimum length (>=10) and screen new passwords against known-breached lists.' } },
  { id: 'mass-assignment', feature: 'Registration & Profile', name: 'Mass assignment — role & balance settable at signup', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ["The registration handler copies every submitted field onto the new account object — including fields the form never shows.", "Add extra form fields to the signup request and see which ones stick.", "POST /register with additional fields role=admin and balance=999999 — the new account is created as an admin with a fortune."],
    lesson: "Binding request bodies directly to data models lets clients write fields that were never meant for them; allow-list input fields explicitly.",
    impact: "Attackers mint admin accounts with huge simulated balances at signup, corrupting the market and every report built on it.",
    report: { title: 'Mass Assignment in Registration (Role/Balance)', severity: 'Critical', remediation: 'Allow-list bindable fields per endpoint; set role and balance server-side only.' } },
  { id: 'stored-xss-profile', feature: 'Registration & Profile', name: 'Stored XSS in display name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ["Your display name is printed in the header of every page. Check whether it is escaped.", "Save a display name that contains HTML and view any page.", "Set your display name to <script>alert(1)</script> on /profile — it is stored and rendered unescaped in the page header."],
    lesson: "Any user-controlled text rendered without output encoding becomes persistent JavaScript in other users' browsers.",
    impact: "A poisoned display name can fire in the admin's browser during user review, stealing sessions and acting with admin rights.",
    report: { title: 'Stored Cross-Site Scripting in Display Name', severity: 'High', remediation: 'Context-encode all user data on output and validate input; add a Content-Security-Policy as defence in depth.' } },
  { id: 'profile-csrf', feature: 'Registration & Profile', name: 'CSRF on profile update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ["The profile form changes server state with no anti-CSRF token.", "A POST that arrives from a different Origin is still applied.", "While logged in, POST /profile with header Origin: https://evil.example and a new displayName — the change is accepted with no token check."],
    lesson: "State-changing requests need an unguessable per-session token; cookies alone are sent by the browser for any site that asks.",
    impact: "A malicious page visited by a logged-in investor can silently rewrite their profile — the classic first step to account-recovery abuse.",
    report: { title: 'Cross-Site Request Forgery on Profile Update', severity: 'Medium', remediation: 'Require a per-session CSRF token on all state-changing requests and verify Origin/Referer as a secondary check.' } },

  /* ---------- Portfolio ---------- */
  { id: 'portfolio-idor', feature: 'Portfolio', name: 'Portfolio IDOR — view any investor\u2019s holdings', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ["Your portfolio lives at /portfolio/<your id>. What stops you changing the number?", "Nothing checks that the portfolio you ask for is yours.", "Open /portfolio/3 while logged in as investor #2 — Bob's holdings, cash and total value are served in full."],
    lesson: "Every object reference needs an ownership check on the server; hiding a link is not access control.",
    impact: "Competitors or attackers can map exactly what every investor owns and what they paid — prime material for targeted fraud.",
    report: { title: 'Insecure Direct Object Reference on Portfolio', severity: 'High', remediation: 'Authorize every object access against the session user on the server; return 404/403 for other users\u2019 objects.' } },
  { id: 'tx-idor', feature: 'Portfolio', name: 'Trade-history IDOR — another investor\u2019s transactions', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ["Under each portfolio there is a transactions view with the same numbering pattern.", "The /transactions sub-page performs the same missing ownership check.", "Open /portfolio/3/transactions as investor #2 to read Bob's complete trade history."],
    lesson: "Access control must be applied per route, not per page — sub-resources inherit the sensitivity of the parent object.",
    impact: "Full trade histories reveal an investor's strategy and timing, enabling front-running and highly convincing social engineering.",
    report: { title: 'Insecure Direct Object Reference on Trade History', severity: 'High', remediation: 'Apply the same server-side ownership check to every sub-resource route (transactions, exports, attachments).' } },

  /* ---------- Trading & Orders ---------- */
  { id: 'order-price-tamper', feature: 'Trading & Orders', name: 'Order price tampering — buy at your own price', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ["The trade form posts more than symbol and quantity. Watch the full request.", "A price field travels with the order — and the server trusts it.", "POST /trade with symbol=NOVA, side=buy, qty=10 and price=0.01 — the order fills at one cent instead of the market price."],
    lesson: "Prices are server-side truth; anything the client sends about money must be recomputed, never trusted.",
    impact: "Investors could buy assets for almost nothing, destroying market integrity and every other participant's portfolio value.",
    report: { title: 'Client-Supplied Price Trusted in Order Execution', severity: 'Critical', remediation: 'Ignore client-sent prices; execute all orders against the server-side market price at fill time.' } },
  { id: 'negative-qty', feature: 'Trading & Orders', name: 'Negative-quantity trade credits cash', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ["Quantity is multiplied straight into the total. What does a negative total do to a buy?", "The form accepts values the number input would never offer.", "POST /trade with side=buy, qty=-10 — the 'purchase' adds cash to your balance and subtracts shares."],
    lesson: "Quantities need range validation (positive, sane bounds); sign errors in financial math create money from nothing.",
    impact: "Unlimited free cash from negative orders breaks the simulator's economy and, in a real brokerage, would be direct theft.",
    report: { title: 'Negative Quantity Accepted in Trade Execution', severity: 'High', remediation: 'Validate quantity as a positive integer within defined bounds before any balance or holdings math.' } },
  { id: 'insufficient-funds', feature: 'Trading & Orders', name: 'Orders fill beyond available balance', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ["Compare your cash with the cost of a very large buy order.", "The execution path never checks whether you can pay.", "As Bob (cash 25,000), buy 200 QNTM at the market price (~46,000) — the order fills and the balance goes negative."],
    lesson: "Funds checks must happen atomically at execution; a balance that can go negative is a credit line nobody approved.",
    impact: "Investors could acquire positions they cannot pay for, leaving the platform holding unrecoverable losses.",
    report: { title: 'Missing Funds Validation Allows Negative Balances', severity: 'High', remediation: 'Verify sufficient funds inside the same transaction that fills the order; reject with a clear error otherwise.' } },
  { id: 'order-idor', feature: 'Trading & Orders', name: 'Cancel another investor\u2019s order (order IDOR)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ["Order ids are sequential and shown in the orders list. Cancelling reverses a trade.", "The cancel endpoint never asks whose order it is.", "POST /orders/1003/cancel as a different investor — Alice's filled trade is reversed and her balance/holdings change."],
    lesson: "Mutating endpoints need the same ownership checks as read endpoints — a cancel is a financial transaction in reverse.",
    impact: "An attacker can unwind competitors' profitable trades after the fact, rewriting market history in their favour.",
    report: { title: 'Missing Ownership Check on Order Cancellation', severity: 'High', remediation: 'Bind every order mutation to the owning account server-side; log and alert on cross-account attempts.' } },
  { id: 'feed-override', feature: 'Trading & Orders', name: 'Unsigned price-feed override moves the market', owasp: 'A08:2021 Software & Data Integrity Failures', difficulty: 'Advanced',
    hints: ["The market page reads prices from /api/price. That endpoint accepts more than a symbol.", "An extra query parameter is treated as a signed feed update — but nothing signs it.", "GET /api/price?symbol=HEXA&set=0.01 — the live market price for HEXA changes for everyone."],
    lesson: "Market data is a trust boundary; feed updates need authentication and integrity checks exactly like payments do.",
    impact: "Whoever moves the feed price can buy the whole market at a cent and sell back at real prices — total market manipulation.",
    report: { title: 'Unauthenticated Price-Feed Update Parameter', severity: 'Critical', remediation: 'Remove client-writable feed parameters; accept price updates only from an authenticated, signed feed service.' } },

  /* ---------- Watchlist ---------- */
  { id: 'watchlist-xss', feature: 'Watchlist', name: 'Stored XSS in watchlist note', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ["Watchlist notes are rendered back on the watchlist page. Check the encoding.", "Add a note containing HTML and reload the page.", "Add a watchlist entry with note <script>alert(1)</script> — it is stored and executed when the watchlist renders."],
    lesson: "Notes and comments are code to a browser unless they are encoded; every free-text field is an XSS candidate.",
    impact: "Stored payloads in shared or admin-reviewed watchlists can hijack sessions of anyone who views them.",
    report: { title: 'Stored Cross-Site Scripting in Watchlist Note', severity: 'Medium', remediation: 'Output-encode note text everywhere it renders and strip or sanitise HTML on input.' } },
  { id: 'watchlist-idor', feature: 'Watchlist', name: 'Watchlist IDOR — read any investor\u2019s watchlist', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ["Watchlists are addressed by investor number, like portfolios.", "The ownership check is missing here too.", "Open /watchlist/3 as investor #2 to read Bob's watchlist and his private notes."],
    lesson: "Consistent server-side authorization has to cover every feature, not only the ones that look financial.",
    impact: "Private watchlists leak an investor's intentions before they trade — valuable, tradeable intelligence.",
    report: { title: 'Insecure Direct Object Reference on Watchlist', severity: 'Medium', remediation: 'Scope watchlist queries to the session user; never honour a client-supplied owner id.' } },

  /* ---------- Reports & Exports ---------- */
  { id: 'report-idor', feature: 'Reports & Exports', name: 'Report export IDOR — download any investor\u2019s report', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ["Your performance report can be exported as CSV. The export URL carries an investor number.", "Exports are the most commonly forgotten authorization check.", "GET /report/3/export.csv as investor #2 downloads Bob's full performance report."],
    lesson: "Exports concentrate sensitive data into one file; they need the strictest ownership checks, not the weakest.",
    impact: "One URL pattern hands out every investor's complete financial report — cash, holdings, profit and loss — in bulk-friendly CSV.",
    report: { title: 'Missing Authorization on Report CSV Export', severity: 'High', remediation: 'Authorize exports against the session user and audit-log every export download.' } },
  { id: 'export-all-leak', feature: 'Reports & Exports', name: 'Bulk export leaks every investor\u2019s report', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ["The export endpoint understands a scope parameter meant for administrators.", "Nothing verifies that the requester is an administrator.", "GET /report/export?scope=all as a normal investor returns a CSV with every investor's report."],
    lesson: "Administrative bulk features must check the caller's role server-side on every request, not rely on the UI hiding them.",
    impact: "A single request exfiltrates the entire investor base's financial data — a reportable breach in any real deployment.",
    report: { title: 'Unauthenticated Bulk Report Export (All Investors)', severity: 'Critical', remediation: 'Restrict bulk exports to verified admin sessions and rate-limit + alert on their use.' } },

  /* ---------- Admin Panel ---------- */
  { id: 'admin-api-dump', feature: 'Admin Panel', name: 'Admin user API served to any logged-in investor', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ["There is an API twin of the admin user list under /api/admin/.", "It checks that you are logged in — but not that you are an admin.", "As a normal investor, GET /api/admin/users returns every account including passwords."],
    lesson: "APIs need the same role checks as pages; 'logged in' is authentication, not authorization.",
    impact: "Full credential dump for every account — attackers log in as anyone, including the real admin, afterwards.",
    report: { title: 'Broken Access Control on Admin Users API (Credential Exposure)', severity: 'Critical', remediation: 'Enforce admin role on the endpoint server-side and never serialize password fields in API responses.' } },
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'CSRF on admin balance credit', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    hints: ["The admin credit action changes balances with a bare POST — no token anywhere in the admin panel.", "A cross-site Origin on that POST is not rejected.", "As admin, POST /admin/credit with Origin: https://evil.example, an investor email and an amount — the balance changes. A page the admin visits could do the same."],
    lesson: "Admin actions are the highest-value CSRF targets; tokens and SameSite cookies are mandatory there first.",
    impact: "A booby-trapped page an admin opens can credit arbitrary accounts, laundering value through the platform invisibly.",
    report: { title: 'Cross-Site Request Forgery on Admin Credit Action', severity: 'High', remediation: 'Add per-session CSRF tokens to all admin forms, verify Origin, and set session cookies SameSite=Lax or Strict.' } },

  /* ---------- Platform & API ---------- */
  { id: 'api-token-weak', feature: 'Platform & API', name: 'API token is just the base64 of the email', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    hints: ["The JSON API authenticates with a token parameter. Tokens are derived, not random.", "Take an investor's email and transform it the simplest way an API might.", "GET /api/portfolio?token=<base64 of alice@test.local> returns Alice's portfolio with no session at all."],
    lesson: "Tokens must be unguessable random secrets; encoding is not encryption and derivation from public data is not authentication.",
    impact: "Anyone who knows an investor's email — public information — owns API access to their portfolio.",
    report: { title: 'Predictable API Token (Base64 of Email)', severity: 'High', remediation: 'Issue random per-user API keys, store hashes, support revocation, and send keys in headers over TLS only.' } },
  { id: 'debug-exposure', feature: 'Platform & API', name: 'Debug endpoint dumps the whole platform state', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ["Development leftovers love predictable paths under /api/.", "One endpoint returns the server's entire in-memory state for 'debugging'.", "GET /api/debug — users (with passwords), orders and the price feed, no login required."],
    lesson: "Debug and diagnostic endpoints must never ship to production; if they must exist, they need authentication and network restrictions.",
    impact: "A single unauthenticated request exposes every credential and position on the platform — the worst data leak in this lab.",
    report: { title: 'Unauthenticated Debug Endpoint Exposing Full State', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; gate any diagnostics behind admin auth and IP allow-lists.' } }
];

/* entry-key fragments, region B */


/* ================= progress state ================= */
let S = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadState() { try { const d = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); S = Object.assign(S, d); } catch (e) {} }
function saveState() { try { fs.writeFileSync(STATE_FILE, JSON.stringify(S, null, 1)); } catch (e) {} }
loadState();

function totalTests() { return TESTS.length; }
function doneCount() { return TESTS.filter(t => S.tests[t.id]).length; }
function pct() { const t = totalTests(); return t ? Math.floor(doneCount() / t * 100) : 0; }
function featureMap() {
  const f = {};
  for (const t of TESTS) {
    f[t.feature] = f[t.feature] || { total: 0, done: 0, attempts: S.attempts[t.feature] || 0 };
    f[t.feature].total++; if (S.tests[t.id]) f[t.feature].done++;
  }
  return f;
}
function attempt(feature) { S.attempts[feature] = (S.attempts[feature] || 0) + 1; saveState(); }
function pass(id) {
  if (S.tests[id]) return;
  if (!TESTS.some(t => t.id === id)) return;
  S.tests[id] = true;
  if (doneCount() === totalTests()) { S.completedAt = new Date().toISOString(); S.keyRevealed = true; }
  saveState();
}
const ENTRY_KEY_SHA256 = '51d6e50ebada5eda47a0052f547bfa04324bc0754284f819cf612cec053c2f99';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */

/* entry-key fragments, region C */

/* completion-key fragments, region A (mid-file) */
const _C1 = ["TC1YSA==", "Wi02NA=="];
const _C2 = ["RlpWTg==", "LVBWTA=="];

/* ================= business data (all simulated) ================= */
const FEED = [
  { symbol: 'HEXA', name: 'HexaCyberLab Inc', price: 128.50 },
  { symbol: 'NOVA', name: 'Nova Robotics', price: 42.10 },
  { symbol: 'ORBT', name: 'Orbit Logistics', price: 87.25 },
  { symbol: 'PLSX', name: 'Pulse Health', price: 15.75 },
  { symbol: 'QNTM', name: 'Quantum Chips', price: 230.00 },
  { symbol: 'VSTA', name: 'Vista Energy', price: 64.30 },
  { symbol: 'DRFT', name: 'Draft Media', price: 9.85 },
  { symbol: 'LUMN', name: 'Lumen Foods', price: 51.20 }
];
let nextUserId = 5, nextOrderId = 1005, nextWatchId = 10;
let users = [
  { id: 1, name: 'Platform Admin', displayName: 'Platform Admin', email: 'admin@hexainvest.local', password: 'admin123', role: 'admin', balance: 0, resetToken: null },
  { id: 2, name: 'Alice Rahman', displayName: 'Alice Rahman', email: 'alice@test.local', password: 'alice123', role: 'investor', balance: 12500.50, resetToken: null },
  { id: 3, name: 'Bob Karim', displayName: 'Bob Karim', email: 'bob@test.local', password: 'bob123', role: 'investor', balance: 25000, resetToken: null },
  { id: 4, name: 'Carol Das', displayName: 'Carol Das', email: 'carol@test.local', password: 'carol123', role: 'investor', balance: 3200, resetToken: null }
];
let holdings = {
  1: {},
  2: { HEXA: { qty: 40, avg: 110.00 }, NOVA: { qty: 150, avg: 38.50 }, VSTA: { qty: 25, avg: 60.00 } },
  3: { QNTM: { qty: 30, avg: 210.00 }, ORBT: { qty: 60, avg: 80.00 } },
  4: { PLSX: { qty: 200, avg: 12.00 } }
};
let orders = [
  { id: 1001, userId: 2, symbol: 'HEXA', side: 'buy', qty: 40, price: 110.00, total: 4400.00, status: 'filled' },
  { id: 1002, userId: 2, symbol: 'NOVA', side: 'buy', qty: 150, price: 38.50, total: 5775.00, status: 'filled' },
  { id: 1003, userId: 2, symbol: 'VSTA', side: 'buy', qty: 25, price: 60.00, total: 1500.00, status: 'filled' },
  { id: 1004, userId: 3, symbol: 'QNTM', side: 'buy', qty: 30, price: 210.00, total: 6300.00, status: 'filled' }
];
let watchlists = {
  2: [{ id: 1, symbol: 'QNTM', note: 'Watching for a dip below 200' }, { id: 2, symbol: 'LUMN', note: 'Earnings next week' }],
  3: [{ id: 3, symbol: 'HEXA', note: 'Security sector looks strong' }],
  4: []
};

const sessions = new Map(); // sid -> userId
const enumSeen = {};        // ip -> { nf: bool, wp: bool }
const failCount = {};       // ip|email -> n

/* ================= helpers ================= */
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = n => '$' + Number(n || 0).toFixed(2);
const XSS_RE = /<script|onerror\s*=|onload\s*=|<svg|<img[^>]*on\w+\s*=|<iframe|javascript:/i;
function feedPrice(sym) { const f = FEED.find(x => x.symbol === sym); return f ? f.price : null; }
function portfolioValue(uid) {
  let v = 0; const h = holdings[uid] || {};
  for (const sym of Object.keys(h)) v += h[sym].qty * (feedPrice(sym) || 0);
  return v;
}
function parseCookies(req) {
  const out = {}; const c = req.headers.cookie || '';
  for (const part of c.split(';')) { const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); }
  return out;
}
function currentUser(req) {
  const ck = parseCookies(req); if (!ck.hx_sid) return null;
  const uid = sessions.get(ck.hx_sid); if (!uid) return null;
  return users.find(u => u.id === uid) || null;
}
function startSession(res, user) {
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, user.id);
  res.setHeader('Set-Cookie', [
    'hx_sid=' + sid + '; Path=/; HttpOnly',
    'hx_role=' + user.role + '; Path=/',
    'hx_origin=1; Path=/'
  ]);
}
function foreignOrigin(req) {
  const o = req.headers.origin || req.headers.referer || '';
  if (!o) return false;
  try { const u = new URL(o); return u.host !== '127.0.0.1:' + PORT && u.host !== 'localhost:' + PORT; } catch (e) { return false; }
}
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', ch => { data += ch; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) { try { return resolve(JSON.parse(data || '{}')); } catch (e) { return resolve({}); } }
      const out = {}; const p = new URLSearchParams(data);
      for (const [k, v] of p) out[k] = v;
      resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }
function sendJson(res, obj, code) { res.writeHead(code || 200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); }

const CHAT_WIDGET = `
<div id="hxchat" style="position:fixed;right:16px;bottom:16px;width:320px;font-family:monospace;z-index:99">
  <button id="hxchatbtn" style="width:100%;padding:10px;background:#111827;color:#fff;border:1px solid #7c3aed;border-radius:8px;cursor:pointer">💬 Lab Coach</button>
  <div id="hxchatbox" style="display:none;background:#0b1220;color:#e5e7eb;border:1px solid #7c3aed;border-radius:8px;margin-top:6px;padding:10px">
    <div id="hxchatlog" style="height:200px;overflow:auto;font-size:12px;line-height:1.5"></div>
    <div style="display:flex;gap:6px;margin-top:8px">
      <input id="hxchatin" placeholder="Ask the Lab Coach…" style="flex:1;padding:6px;background:#111827;color:#fff;border:1px solid #374151;border-radius:6px">
      <button id="hxchatsend" style="padding:6px 10px;background:#7c3aed;color:#fff;border:0;border-radius:6px;cursor:pointer">Send</button>
    </div>
  </div>
</div>
<script>
(function(){
  var box=document.getElementById('hxchatbox'),log=document.getElementById('hxchatlog'),inp=document.getElementById('hxchatin');
  document.getElementById('hxchatbtn').onclick=function(){box.style.display=box.style.display==='none'?'block':'none';};
  function add(who,txt){var d=document.createElement('div');d.innerHTML='<b>'+who+':</b> ';d.appendChild(document.createTextNode(txt));log.appendChild(d);log.scrollTop=log.scrollHeight;}
  function send(){var m=inp.value.trim();if(!m)return;inp.value='';add('You',m);
    fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})})
    .then(function(r){return r.json();}).then(function(j){add('Coach',j.reply||'…');}).catch(function(){add('Coach','(offline)');});}
  document.getElementById('hxchatsend').onclick=send;
  inp.addEventListener('keydown',function(e){if(e.key==='Enter')send();});
})();
</script>`;

function layout(user, title, body) {
  const d = doneCount(), t = totalTests(), p = pct();
  const nav = user
    ? `<a href="/market">Market</a> · <a href="/portfolio/${user.id}">My Portfolio</a> · <a href="/orders">Orders</a> · <a href="/watchlist">Watchlist</a> · <a href="/report">Report</a> · <a href="/profile">Profile</a>${user.role === 'admin' ? ' · <a href="/admin">Admin</a>' : ''} · <a href="/tests">Mission</a>`
    : `<a href="/login">Login</a> · <a href="/register">Register</a> · <a href="/tests">Mission</a>`;
  // NOTE: displayName below is intentionally rendered unescaped (stored-XSS training flaw).
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} — HexaInvest</title>
<style>body{font-family:system-ui,Arial,sans-serif;background:#0f172a;color:#e2e8f0;margin:0}header{background:#111827;padding:12px 20px;border-bottom:2px solid #7c3aed}.wrap{max-width:980px;margin:0 auto;padding:20px}a{color:#a78bfa}table{border-collapse:collapse;width:100%}td,th{border:1px solid #334155;padding:6px 8px;text-align:left}input,select,button{padding:7px;margin:3px;background:#1e293b;color:#e2e8f0;border:1px solid #475569;border-radius:6px}button{background:#7c3aed;cursor:pointer}.card{background:#1e293b;border:1px solid #334155;border-radius:10px;padding:16px;margin:12px 0}.bar{height:12px;background:#334155;border-radius:6px;overflow:hidden}.bar>i{display:block;height:100%;background:linear-gradient(90deg,#2563eb,#7c3aed)}</style></head>
<body><header><div style="display:flex;align-items:center;gap:12px;max-width:980px;margin:0 auto">
<img src="/logo.png" alt="HexaCyberLab" style="height:38px">
<div style="flex:1"><b>LAB ${LAB_NO} — ${LAB_NAME}</b> · investment simulator (all data fake)<br>
<span style="font-size:13px">Progress: ${d}/${t} tests · ${p}%</span>
<div class="bar" style="margin-top:4px"><i style="width:${p}%"></i></div></div>
${user ? `<div style="font-size:13px">Welcome, ${user.displayName}<br>Investor #${user.id} · Cash ${money(user.balance)}</div>` : ''}
</div><nav style="max-width:980px;margin:8px auto 0">${nav}</nav></header>
<div class="wrap"><h2>${esc(title)}</h2>${body}</div>${CHAT_WIDGET}</body></html>`;
}

function gatePage() {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Locked — LAB ${LAB_NO}</title></head>
<body style="font-family:system-ui;background:#0f172a;color:#e2e8f0"><div style="max-width:560px;margin:60px auto;text-align:center">
<img src="/logo.png" style="height:64px"><h1>LAB ${LAB_NO} — ${LAB_NAME}</h1>
<p>This lab is locked. Paste the completion key from Lab ${LAB_NO - 1} to start.</p>
<form method="POST" action="/unlock"><input name="key" placeholder="Completion key from Lab ${LAB_NO - 1}" style="padding:9px;width:70%;background:#1e293b;color:#fff;border:1px solid #475569;border-radius:6px">
<button style="padding:9px 16px;background:#7c3aed;color:#fff;border:0;border-radius:6px;cursor:pointer">Unlock</button></form>
</div>${CHAT_WIDGET}</body></html>`;
}

/* ================= auth pages & actions ================= */
function loginPage(err) {
  return layout(null, 'Login', `<div class="card"><form method="POST" action="/login">
  <div>Email <input name="email" size="32" required></div>
  <div>Password <input name="password" type="password" size="32" required></div>
  ${err ? `<p style="color:#f87171">${esc(err)}</p>` : ''}
  <button>Log in</button></form>
  <p><a href="/forgot">Forgot password?</a> · <a href="/register">Create an account</a></p>
  <p style="font-size:12px;color:#94a3b8">Demo investors: alice@test.local / alice123 · bob@test.local / bob123 · carol@test.local / carol123</p></div>`);
}
async function doLogin(req, res) {
  const b = await readBody(req);
  attempt('Login & Authentication');
  const email = String(b.email || ''), password = String(b.password || '');
  const ip = req.socket.remoteAddress || 'local';
  // Simulated string-built query (the training flaw):  SELECT * FROM users WHERE email = '<email>' AND password = '<password>'
  const injPat = /'\s*(or|and)\s+[^=]*=/i;
  if (injPat.test(email) || injPat.test(password) || email.includes("'--") || password.includes("'--")) {
    let target = users[0];
    const prefix = email.split("'")[0].trim().toLowerCase();
    const byPrefix = users.find(u => u.email === prefix);
    if (byPrefix) target = byPrefix;
    pass('sqli-login');
    startSession(res, target);
    return redirect(res, '/market');
  }
  const user = users.find(u => u.email === email.toLowerCase());
  if (!user) {
    enumSeen[ip] = enumSeen[ip] || {}; enumSeen[ip].nf = true;
    if (enumSeen[ip].wp) pass('user-enumeration');
    res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(loginPage('No account found for that email.'));
  }
  if (user.password !== password) {
    enumSeen[ip] = enumSeen[ip] || {}; enumSeen[ip].wp = true;
    if (enumSeen[ip].nf) pass('user-enumeration');
    const k = ip + '|' + user.email;
    failCount[k] = (failCount[k] || 0) + 1;
    if (failCount[k] >= 10) pass('brute-force');
    res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(loginPage('Incorrect password.'));
  }
  if (user.email === 'admin@hexainvest.local' && password === 'admin123') pass('default-creds');
  startSession(res, user);
  redirect(res, '/market');
}
function registerPage(err) {
  return layout(null, 'Register', `<div class="card"><form method="POST" action="/register">
  <div>Full name <input name="name" size="32" required></div>
  <div>Email <input name="email" size="32" required></div>
  <div>Password <input name="password" type="password" size="32" required></div>
  ${err ? `<p style="color:#f87171">${esc(err)}</p>` : ''}
  <button>Create account</button></form><p>New investors start with $1,000.00 simulated cash.</p></div>`);
}
async function doRegister(req, res) {
  const b = await readBody(req);
  attempt('Registration & Profile');
  const email = String(b.email || '').toLowerCase();
  if (!email || !b.password) { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(registerPage('Email and password are required.')); }
  if (users.some(u => u.email === email)) { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(registerPage('That email is already registered.')); }
  // Mass-assignment flaw: every submitted field is copied onto the account.
  const user = { id: nextUserId++, name: String(b.name || 'Investor'), displayName: String(b.name || 'Investor'), email, password: String(b.password), role: 'investor', balance: 1000, resetToken: null };
  let assigned = false;
  if (b.role) { user.role = String(b.role); assigned = true; }
  if (b.balance !== undefined && b.balance !== '') { const v = parseFloat(b.balance); if (!isNaN(v)) { user.balance = v; assigned = true; } }
  if (assigned) pass('mass-assignment');
  if (String(b.password).length < 4) pass('weak-password');
  users.push(user); holdings[user.id] = {}; watchlists[user.id] = [];
  startSession(res, user);
  redirect(res, '/market');
}
function forgotPage(msg) {
  return layout(null, 'Forgot password', `<div class="card"><form method="POST" action="/forgot">
  <div>Email <input name="email" size="32" required></div><button>Send reset token</button></form>
  ${msg ? `<p>${esc(msg)}</p>` : ''}<p>Have a token? <a href="/reset">Reset your password</a></p></div>`);
}
function resetPage(msg) {
  return layout(null, 'Reset password', `<div class="card"><form method="POST" action="/reset">
  <div>Email <input name="email" size="32" required></div>
  <div>Reset token <input name="token" size="32" required></div>
  <div>New password <input name="newpassword" type="password" size="32" required></div>
  ${msg ? `<p>${esc(msg)}</p>` : ''}<button>Set new password</button></form></div>`);
}

/* ================= business pages ================= */
function marketPage(user, msg) {
  const rows = FEED.map(f => `<tr><td><b>${f.symbol}</b></td><td>${esc(f.name)}</td><td>${money(f.price)}</td>
  <td><form method="POST" action="/trade" style="display:inline">
    <input type="hidden" name="symbol" value="${f.symbol}"><input type="hidden" name="side" value="buy">
    <input name="qty" type="number" value="1" min="1" style="width:70px"><button>Buy</button></form>
  <form method="POST" action="/trade" style="display:inline">
    <input type="hidden" name="symbol" value="${f.symbol}"><input type="hidden" name="side" value="sell">
    <input name="qty" type="number" value="1" min="1" style="width:70px"><button>Sell</button></form></td></tr>`).join('');
  return layout(user, 'Simulated Market', `${msg ? `<div class="card">${esc(msg)}</div>` : ''}
  <div class="card"><p>Live simulated feed (fake prices, updated in-app). Your cash: <b>${money(user.balance)}</b> · Portfolio value: <b>${money(portfolioValue(user.id))}</b></p>
  <table><tr><th>Symbol</th><th>Company</th><th>Price</th><th>Trade</th></tr>${rows}</table>
  <p style="font-size:12px;color:#94a3b8">Feed JSON: <a href="/api/price?symbol=HEXA">/api/price?symbol=HEXA</a></p></div>`);
}
async function doTrade(req, res, user) {
  const b = await readBody(req);
  attempt('Trading & Orders');
  const sym = FEED.find(f => f.symbol === String(b.symbol || ''));
  if (!sym) return redirect(res, '/market');
  const side = b.side === 'sell' ? 'sell' : 'buy';
  const qty = parseFloat(b.qty);
  if (isNaN(qty) || qty === 0) return redirect(res, '/market');
  /* price flaw: a client-sent price is trusted over the market */
  let price = sym.price;
  if (b.price !== undefined && b.price !== '') { const p = parseFloat(b.price); if (!isNaN(p)) price = p; }
  const total = price * qty;
  if (qty < 0) pass('negative-qty');
  if (price !== sym.price) pass('order-price-tamper');
  holdings[user.id] = holdings[user.id] || {};
  const h = holdings[user.id][sym.symbol] || { qty: 0, avg: 0 };
  if (side === 'buy') {
    if (total > user.balance) pass('insufficient-funds'); // flaw: order fills anyway
    user.balance -= total;
    const newQty = h.qty + qty;
    h.avg = newQty !== 0 ? ((h.qty * h.avg) + total) / newQty : 0;
    h.qty = newQty;
  } else {
    user.balance += total;
    h.qty -= qty;
  }
  holdings[user.id][sym.symbol] = h;
  orders.push({ id: nextOrderId++, userId: user.id, symbol: sym.symbol, side, qty, price, total, status: 'filled' });
  redirect(res, '/orders');
}
function portfolioPage(user, target) {
  const h = holdings[target.id] || {};
  const rows = Object.keys(h).filter(s => h[s].qty !== 0).map(s => {
    const cur = feedPrice(s) || 0, val = h[s].qty * cur, pl = (cur - h[s].avg) * h[s].qty;
    return `<tr><td><b>${s}</b></td><td>${h[s].qty}</td><td>${money(h[s].avg)}</td><td>${money(cur)}</td><td>${money(val)}</td><td>${money(pl)}</td></tr>`;
  }).join('') || '<tr><td colspan="6">No holdings.</td></tr>';
  return layout(user, `Portfolio — ${esc(target.name)}`, `<div class="card">
  <p>Investor #${target.id} · ${esc(target.email)} · Cash <b>${money(target.balance)}</b> · Holdings value <b>${money(portfolioValue(target.id))}</b> · Total <b>${money(target.balance + portfolioValue(target.id))}</b></p>
  <table><tr><th>Symbol</th><th>Qty</th><th>Avg cost</th><th>Price</th><th>Value</th><th>P/L</th></tr>${rows}</table>
  <p><a href="/portfolio/${target.id}/transactions">Trade history</a> · <a href="/report/${target.id}/export.csv">Export report (CSV)</a></p></div>`);
}
function txPage(user, target) {
  const rows = orders.filter(o => o.userId === target.id).map(o => `<tr><td>${o.id}</td><td>${o.symbol}</td><td>${o.side}</td><td>${o.qty}</td><td>${money(o.price)}</td><td>${money(o.total)}</td><td>${o.status}</td></tr>`).join('') || '<tr><td colspan="7">No trades yet.</td></tr>';
  return layout(user, `Trade history — ${esc(target.name)}`, `<div class="card"><table><tr><th>Order</th><th>Symbol</th><th>Side</th><th>Qty</th><th>Price</th><th>Total</th><th>Status</th></tr>${rows}</table></div>`);
}
function ordersPage(user, msg) {
  const rows = orders.filter(o => o.userId === user.id).map(o => `<tr><td><a href="/orders/${o.id}">${o.id}</a></td><td>${o.symbol}</td><td>${o.side}</td><td>${o.qty}</td><td>${money(o.price)}</td><td>${money(o.total)}</td><td>${o.status}</td>
  <td>${o.status === 'filled' ? `<form method="POST" action="/orders/${o.id}/cancel"><button>Cancel</button></form>` : ''}</td></tr>`).join('') || '<tr><td colspan="8">No orders yet — trade on the <a href="/market">market page</a>.</td></tr>';
  return layout(user, 'My Orders', `${msg ? `<div class="card">${esc(msg)}</div>` : ''}<div class="card"><table><tr><th>Order</th><th>Symbol</th><th>Side</th><th>Qty</th><th>Price</th><th>Total</th><th>Status</th><th></th></tr>${rows}</table>
  <p style="font-size:12px;color:#94a3b8">Cancelling a filled order reverses it (refund / return of shares).</p></div>`);
}
function watchlistPage(user, target) {
  const list = watchlists[target.id] || [];
  // NOTE: note text rendered unescaped on purpose (stored-XSS training flaw).
  const rows = list.map(w => `<tr><td><b>${esc(w.symbol)}</b></td><td>${w.note}</td></tr>`).join('') || '<tr><td colspan="2">Watchlist is empty.</td></tr>';
  const form = target.id === user.id ? `<form method="POST" action="/watchlist"><select name="symbol">${FEED.map(f => `<option>${f.symbol}</option>`).join('')}</select>
  <input name="note" size="40" placeholder="Note (e.g. buy below 100)"><button>Add to watchlist</button></form>` : '';
  return layout(user, `Watchlist — ${esc(target.name)}`, `<div class="card">${form}<table><tr><th>Symbol</th><th>Note</th></tr>${rows}</table></div>`);
}
function reportPage(user) {
  const h = holdings[user.id] || {};
  let cost = 0, val = 0;
  for (const s of Object.keys(h)) { cost += h[s].qty * h[s].avg; val += h[s].qty * (feedPrice(s) || 0); }
  return layout(user, 'Performance Report', `<div class="card">
  <p>Investor: ${esc(user.name)} (#${user.id})</p>
  <p>Cash: <b>${money(user.balance)}</b> · Invested cost: <b>${money(cost)}</b> · Current value: <b>${money(val)}</b> · Unrealised P/L: <b>${money(val - cost)}</b></p>
  <p><a href="/report/${user.id}/export.csv">Export my report (CSV)</a></p></div>`);
}
function reportCsv(target) {
  const h = holdings[target.id] || {};
  let lines = ['investor,email,cash,symbol,qty,avg_cost,current_price,value'];
  const syms = Object.keys(h);
  if (!syms.length) lines.push(`${esc(target.name)},${target.email},${target.balance.toFixed(2)},,,, ,`);
  for (const s of syms) lines.push(`${target.name},${target.email},${target.balance.toFixed(2)},${s},${h[s].qty},${h[s].avg.toFixed(2)},${(feedPrice(s) || 0).toFixed(2)},${(h[s].qty * (feedPrice(s) || 0)).toFixed(2)}`);
  return lines.join('\n');
}
function profilePage(user, msg) {
  return layout(user, 'Profile', `<div class="card"><form method="POST" action="/profile">
  <div>Display name <input name="displayName" size="32" value="${esc(user.displayName)}"></div>
  <div>Email <input size="32" value="${esc(user.email)}" disabled></div>
  <div>Investor number: #${user.id} · Role: ${esc(user.role)} · Cash: ${money(user.balance)}</div>
  ${msg ? `<p>${esc(msg)}</p>` : ''}<button>Save profile</button></form></div>`);
}
async function doProfile(req, res, user) {
  const b = await readBody(req);
  attempt('Registration & Profile');
  if (b.displayName !== undefined) {
    user.displayName = String(b.displayName); user.name = String(b.displayName);
    if (XSS_RE.test(user.displayName)) pass('stored-xss-profile');
  }
  let assigned = false;
  if (b.role) { user.role = String(b.role); assigned = true; }
  if (b.balance !== undefined && b.balance !== '') { const v = parseFloat(b.balance); if (!isNaN(v)) { user.balance = v; assigned = true; } }
  if (assigned) pass('mass-assignment');
  if (foreignOrigin(req)) pass('profile-csrf'); // flaw: change applied with no CSRF token at all
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(profilePage(user, 'Profile saved.'));
}
function adminPage(user, msg) {
  const rows = users.map(u => `<tr><td>${u.id}</td><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td>${money(u.balance)}</td><td>${money(portfolioValue(u.id))}</td></tr>`).join('');
  return layout(user, 'Admin Panel', `<div class="card"><h3>Investors</h3>
  <table><tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th>Cash</th><th>Holdings value</th></tr>${rows}</table></div>
  <div class="card"><h3>Credit an investor (simulated funds)</h3>
  <form method="POST" action="/admin/credit"><input name="email" size="28" placeholder="investor email"><input name="amount" size="10" placeholder="amount"><button>Credit</button></form>
  ${msg ? `<p>${esc(msg)}</p>` : ''}</div>`);
}

/* completion-key fragments, region B (bottom of file) */
const _C3 = ["Q1FTWg==", "SElZTA=="];
function completionKey() { return _u([].concat(_C1, _C2, _C3)); }

/* ================= mission / complete / certificate ================= */
function testsPage(user) {
  const fm = featureMap();
  let html = `<div class="card"><p>Solve tests by actually performing the exploit in the app — there is no "mark done" button. Hints unlock one at a time. The Lab Coach gives step-by-step help for a feature after you have genuinely tried that feature at least 3 times.</p></div>`;
  for (const fname of Object.keys(fm)) {
    const f = fm[fname];
    html += `<div class="card"><h3>${esc(fname)} — ${f.done}/${f.total} done · ${f.attempts} attempt(s)</h3>`;
    for (const t of TESTS.filter(x => x.feature === fname)) {
      const done = !!S.tests[t.id];
      html += `<div style="border-top:1px solid #334155;padding:8px 0"><b>${done ? '✓' : '○'} ${esc(t.name)}</b> <span style="color:#94a3b8">${esc(t.owasp)} · ${esc(t.difficulty)}</span>
      <details><summary>Hints</summary><ol>${t.hints.map(h => `<li>${esc(h)}</li>`).join('')}</ol></details></div>`;
    }
    html += `</div>`;
  }
  return layout(user, 'Mission — LAB ' + LAB_NO + ' ' + LAB_NAME, html);
}
function completePage(user) { if (!user) user = { name: 'Security Tester', email: '', id: 0 };
  if (doneCount() < totalTests()) {
    const left = TESTS.filter(t => !S.tests[t.id]).map(t => `<li>${esc(t.name)} (${esc(t.feature)})</li>`).join('');
    return layout(user, 'Completion', `<div class="card"><p>You are at <b>${pct()}%</b> (${doneCount()}/${totalTests()}). The completion summary, your key and the certificate unlock at 100%.</p><p>Still open:</p><ul>${left}</ul></div>`);
  }
  const fm = featureMap();
  const perFeature = Object.keys(fm).map(f => `<li><b>${esc(f)}</b>: ${fm[f].total} vulnerabilities</li>`).join('');
  const ways = TESTS.map(t => `<li>${esc(t.name)} — ${esc(t.owasp)}</li>`).join('');
  const learned = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('');
  const client = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('');
  const report = TESTS.map(t => `<li><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)}. Fix: ${esc(t.report.remediation)}</li>`).join('');
  const key = completionKey();
  return layout(user, 'Lab Complete!', `<div class="card"><h3>🎉 100% — LAB ${LAB_NO} ${LAB_NAME} completed</h3>
  <p><b>Total features:</b> ${Object.keys(fm).length}</p>
  <h4>Per-feature vulnerability counts</h4><ul>${perFeature}</ul>
  <h4>Ways testing was done (${totalTests()} tests)</h4><ul>${ways}</ul>
  <h4>What you learned</h4><ul>${learned}</ul>
  <h4>What this means for a real client</h4><ul>${client}</ul>
  <h4>Writing it in a real report</h4><ul>${report}</ul></div>
  <div class="card"><h3>Your completion key (unlocks Lab ${LAB_NO + 1})</h3>
  <p style="font-size:20px;letter-spacing:1px"><b>${key}</b></p>
  <form method="POST" action="/complete/name"><input name="name" size="30" placeholder="Your name for the certificate" value="${esc(S.testerName || '')}"><button>Save name</button></form>
  <p><a href="/certificate">View your certificate</a></p></div>`);
}
function certificatePage(user) { if (!user) user = { name: 'Security Tester', email: '', id: 0 };
  if (doneCount() < totalTests()) return layout(user, 'Certificate', `<div class="card"><p>The certificate unlocks at 100% (you are at ${pct()}%).</p></div>`);
  const name = S.testerName || (user ? user.name : 'HexaCyberLab Tester');
  const date = S.completedAt ? new Date(S.completedAt).toDateString() : new Date().toDateString();
  return `<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NO}</title>
<style>body{background:#e2e8f0;font-family:Georgia,serif}.cert{max-width:720px;margin:40px auto;background:#fff;color:#111827;border:3px solid #7c3aed;border-radius:14px;padding:36px;text-align:center}@media print{body{background:#fff}}</style></head>
<body><div class="cert"><img src="/logo.png" style="height:70px">
<h1 style="margin:8px 0">Certificate of Completion</h1>
<p>This certifies that</p><h2>${esc(name)}</h2>
<p>has completed 100% of the security tests in</p>
<h3>LAB ${LAB_NO} — ${LAB_NAME} (${totalTests()} tests across ${Object.keys(featureMap()).length} features)</h3>
<p>Completed on ${esc(date)}</p>
<p style="margin-top:24px;color:#475569">HexaCyberLab — Built by Md. Jony Hassain, Founder</p></div></body></html>`;
}

/* ================= Lab Coach chatbot ================= */
const FEATURE_KEYS = [
  ['Login & Authentication', /login|auth|password|brute|enumerat|reset token|sqli|sql injection|cookie|session|default cred/i],
  ['Registration & Profile', /regist|sign ?up|profile|mass assignment|password policy|display name/i],
  ['Portfolio', /portfolio|holding|transaction|trade history/i],
  ['Trading & Orders', /trad|order|buy|sell|price|feed|quantity|cancel/i],
  ['Watchlist', /watchlist|watch list/i],
  ['Reports & Exports', /report|export|csv/i],
  ['Admin Panel', /admin|credit/i],
  ['Platform & API', /api|token|debug|platform/i]
];
function matchFeature(msg) { for (const [f, re] of FEATURE_KEYS) if (re.test(msg)) return f; return null; }
function chatReply(raw) {
  const msg = String(raw || '');
  const low = msg.toLowerCase();
  const fm = featureMap();
  if (/who (built|made|created)|founder|jony|hexacyberlab/.test(low)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (/(completion|next|unlock) key|key please|give me the key|what is the key/.test(low)) {
    if (S.keyRevealed && doneCount() === totalTests()) return 'You completed the lab — congratulations! Your completion key is: ' + completionKey();
    return `I don't have the completion key yet — I only receive it when the lab is completed. You are at ${pct()}% (${doneCount()}/${totalTests()} tests). Finish every test and I'll share it.`;
  }
  const feat = matchFeature(msg);
  const wantsHow = /how|guide|step|help|solve|do i|exploit|walkthrough/.test(low);
  if (feat && wantsHow) {
    const f = fm[feat]; const attempts = S.attempts[feat] || 0;
    const open = TESTS.filter(t => t.feature === feat && !S.tests[t.id]);
    if (attempts >= 3 || open.length === 0) {
      if (!open.length) return `All ${feat} tests are already complete — nice work.`;
      return `Step by step for ${feat}:\n` + open.map(t => `• ${t.name}: ${t.hints[2]}`).join('\n');
    }
    return `That feature is locked for help. First try the ${feat} tests yourself at least 3 times — I can see you've tried ${attempts} time(s) so far. After 3 real tries, ask me again and I'll guide you step by step.`;
  }
  if (feat) {
    const f = fm[feat]; const attempts = S.attempts[feat] || 0;
    const names = TESTS.filter(t => t.feature === feat).map(t => `${S.tests[t.id] ? '✓' : '○'} ${t.name}`).join('\n');
    return `${feat}: ${f.total} tests, ${f.done} done, ${attempts} attempt(s) so far.\n${names}\nAsk me "how do I test ${feat}" after at least 3 tries and I'll walk you through it.`;
  }
  if (/how many|features|tests|vulnerabilit|what.*(lab|here)/.test(low)) {
    const lines = Object.keys(fm).map(f => `• ${f}: ${fm[f].total} tests`).join('\n');
    return `LAB ${LAB_NO} ${LAB_NAME} has ${totalTests()} tests across ${Object.keys(fm).length} features:\n${lines}\nYou have completed ${doneCount()}/${totalTests()} (${pct()}%).`;
  }
  if (/progress|score|how am i|status/.test(low)) {
    return `You are at ${pct()}% — ${doneCount()} of ${totalTests()} tests complete. Open the Mission page (/tests) to see what is left, feature by feature.`;
  }
  if (/^(hi|hello|hey|help)/.test(low) || /help/.test(low)) {
    const next = TESTS.find(t => !S.tests[t.id]);
    return `Hello! I'm the Lab Coach for LAB ${LAB_NO} ${LAB_NAME} — an investment simulator with ${totalTests()} security tests in ${Object.keys(fm).length} features. You are at ${pct()}%. ${next ? `Next open test: "${next.name}" (${next.feature}). ` : ''}The vulnerability map is public on /tests — but step-by-step help for a feature unlocks after you've tried that feature at least 3 times.`;
  }
  return `I can help with the tests in this lab: ask me how many tests a feature has, ask about your progress, or — after 3 genuine tries on a feature — ask "how do I test <feature>" for step-by-step guidance. The full map is on /tests.`;
}

/* ================= router ================= */
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://127.0.0.1:' + PORT);
    const p = u.pathname;
    const method = req.method;

    if (p === '/logo.png') { res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(fs.readFileSync(path.join(DIR, 'logo.png'))); }
    if (p === '/api/progress') {
      return sendJson(res, { lab: LAB_NAME, number: LAB_NO, total: totalTests(), done: doneCount(), pct: pct(), features: featureMap(), complete: doneCount() === totalTests() });
    }
    if (p === '/api/chat' && method === 'POST') { const b = await readBody(req); return sendJson(res, { reply: chatReply(b.message) }); }

    if (!S.unlocked) {
      if (p === '/unlock' && method === 'POST') {
        const b = await readBody(req);
        if (entryKeyMatches(String(b.key || '').trim())) { S.unlocked = true; saveState(); return redirect(res, '/'); }
        res.writeHead(403, { 'Content-Type': 'text/html' });
        return res.end(gatePage().replace('</form>', '</form><p style="color:#f87171">That key was not accepted.</p>'));
      }
      res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(gatePage());
    }

    const user = currentUser(req);
    const needLogin = () => { res.writeHead(302, { Location: '/login' }); res.end(); };

    if (p === '/' ) return redirect(res, user ? '/market' : '/login');
    if (p === '/login' && method === 'GET') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(loginPage()); }
    if (p === '/login' && method === 'POST') return doLogin(req, res);
    if (p === '/register' && method === 'GET') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(registerPage()); }
    if (p === '/register' && method === 'POST') return doRegister(req, res);
    if (p === '/forgot' && method === 'GET') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(forgotPage()); }
    if (p === '/forgot' && method === 'POST') {
      const b = await readBody(req); attempt('Login & Authentication');
      const t = users.find(x => x.email === String(b.email || '').toLowerCase());
      if (t) t.resetToken = 'INV' + (1000 + t.id); // flaw: predictable token derived from the account number
      res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(forgotPage('If that account exists, a reset token has been generated.'));
    }
    if (p === '/reset' && method === 'GET') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(resetPage()); }
    if (p === '/reset' && method === 'POST') {
      const b = await readBody(req); attempt('Login & Authentication');
      const t = users.find(x => x.email === String(b.email || '').toLowerCase());
      if (t && t.resetToken && String(b.token || '') === t.resetToken) {
        t.password = String(b.newpassword || ''); t.resetToken = null; pass('reset-token');
        res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(resetPage('Password updated. You can now log in.'));
      }
      res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(resetPage('Invalid token.'));
    }
    if (p === '/logout') { const ck = parseCookies(req); if (ck.hx_sid) sessions.delete(ck.hx_sid); res.setHeader('Set-Cookie', 'hx_sid=; Path=/; Max-Age=0'); return redirect(res, '/login'); }

    if (p === '/tests') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(testsPage(user)); }

    /* public API flaws (no session needed) */
    if (p === '/api/debug') { attempt('Platform & API'); pass('debug-exposure'); return sendJson(res, { users, orders, feed: FEED, note: 'debug dump' }); }
    if (p === '/api/price') {
      const sym = FEED.find(f => f.symbol === String(u.searchParams.get('symbol') || 'HEXA'));
      if (!sym) return sendJson(res, { error: 'unknown symbol' }, 404);
      if (u.searchParams.get('set') !== null) {
        attempt('Trading & Orders');
        const np = parseFloat(u.searchParams.get('set'));
        if (!isNaN(np) && np !== sym.price) { sym.price = np; pass('feed-override'); } // flaw: unsigned feed update accepted from anyone
      }
      return sendJson(res, { symbol: sym.symbol, price: sym.price });
    }
    if (p === '/api/portfolio') {
      attempt('Platform & API');
      const token = u.searchParams.get('token') || '';
      let email = ''; try { email = Buffer.from(token, 'base64').toString('utf8'); } catch (e) {}
      const t = users.find(x => x.email === email);
      if (!t) return sendJson(res, { error: 'invalid token' }, 401);
      if (!user || user.id !== t.id) pass('api-token-weak'); // flaw: token is just base64(email)
      return sendJson(res, { investor: t.id, email: t.email, cash: t.balance, holdings: holdings[t.id] || {}, portfolioValue: portfolioValue(t.id) });
    }

    if (p === '/complete' && method === 'GET') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(completePage(user)); }
    if (p === '/complete/name' && method === 'POST') { const b = await readBody(req); S.testerName = String(b.name || ''); saveState(); return redirect(res, '/complete'); }
    if (p === '/certificate' && method === 'GET') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(certificatePage(user)); }
    if (!user) return needLogin();

    if (p === '/market') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(marketPage(user)); }
    if (p === '/trade' && method === 'POST') return doTrade(req, res, user);
    if (p === '/orders' && method === 'GET') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(ordersPage(user)); }
    const mOrder = p.match(/^\/orders\/(\d+)$/);
    if (mOrder && method === 'GET') {
      const o = orders.find(x => x.id === Number(mOrder[1]));
      if (!o) { res.writeHead(404, { 'Content-Type': 'text/html' }); return res.end(layout(user, 'Not found', '<div class="card">No such order.</div>')); }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(layout(user, 'Order #' + o.id, `<div class="card"><p>Investor #${o.userId} · ${o.symbol} · ${o.side} · ${o.qty} @ ${money(o.price)} · total ${money(o.total)} · status ${o.status}</p>${o.status === 'filled' ? `<form method="POST" action="/orders/${o.id}/cancel"><button>Cancel this order</button></form>` : ''}</div>`));
    }
    const mCancel = p.match(/^\/orders\/(\d+)\/cancel$/);
    if (mCancel && method === 'POST') {
      attempt('Trading & Orders');
      const o = orders.find(x => x.id === Number(mCancel[1]));
      if (o && o.status === 'filled') {
        const owner = users.find(x => x.id === o.userId);
        holdings[o.userId] = holdings[o.userId] || {};
        const h = holdings[o.userId][o.symbol] || { qty: 0, avg: 0 };
        if (o.side === 'buy') { owner.balance += o.total; h.qty -= o.qty; } else { owner.balance -= o.total; h.qty += o.qty; }
        holdings[o.userId][o.symbol] = h;
        o.status = 'cancelled';
        if (o.userId !== user.id) pass('order-idor'); // flaw: no ownership check on cancel
      }
      return redirect(res, '/orders');
    }
    const mPort = p.match(/^\/portfolio\/(\d+)$/);
    if (mPort && method === 'GET') {
      attempt('Portfolio');
      const t = users.find(x => x.id === Number(mPort[1]));
      if (!t) { res.writeHead(404, { 'Content-Type': 'text/html' }); return res.end(layout(user, 'Not found', '<div class="card">No such investor.</div>')); }
      if (t.id !== user.id) pass('portfolio-idor');
      res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(portfolioPage(user, t));
    }
    const mTx = p.match(/^\/portfolio\/(\d+)\/transactions$/);
    if (mTx && method === 'GET') {
      attempt('Portfolio');
      const t = users.find(x => x.id === Number(mTx[1]));
      if (!t) { res.writeHead(404, { 'Content-Type': 'text/html' }); return res.end(layout(user, 'Not found', '<div class="card">No such investor.</div>')); }
      if (t.id !== user.id) pass('tx-idor');
      res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(txPage(user, t));
    }
    if (p === '/watchlist' && method === 'GET') { attempt('Watchlist'); res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(watchlistPage(user, user)); }
    if (p === '/watchlist' && method === 'POST') {
      const b = await readBody(req); attempt('Watchlist');
      watchlists[user.id] = watchlists[user.id] || [];
      const note = String(b.note || '');
      if (XSS_RE.test(note)) pass('watchlist-xss');
      watchlists[user.id].push({ id: nextWatchId++, symbol: String(b.symbol || 'HEXA'), note });
      return redirect(res, '/watchlist');
    }
    const mWatch = p.match(/^\/watchlist\/(\d+)$/);
    if (mWatch && method === 'GET') {
      attempt('Watchlist');
      const t = users.find(x => x.id === Number(mWatch[1]));
      if (!t) { res.writeHead(404, { 'Content-Type': 'text/html' }); return res.end(layout(user, 'Not found', '<div class="card">No such investor.</div>')); }
      if (t.id !== user.id) pass('watchlist-idor');
      res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(watchlistPage(user, t));
    }
    if (p === '/report' && method === 'GET') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(reportPage(user)); }
    if (p === '/report/export' && method === 'GET') {
      attempt('Reports & Exports');
      if (u.searchParams.get('scope') === 'all') {
        if (user.role !== 'admin') pass('export-all-leak'); // flaw: bulk export served to any investor
        const csv = users.map(t => reportCsv(t)).join('\n---\n');
        res.writeHead(200, { 'Content-Type': 'text/csv' }); return res.end(csv);
      }
      res.writeHead(400, { 'Content-Type': 'text/plain' }); return res.end('missing scope');
    }
    const mRep = p.match(/^\/report\/(\d+)\/export\.csv$/);
    if (mRep && method === 'GET') {
      attempt('Reports & Exports');
      const t = users.find(x => x.id === Number(mRep[1]));
      if (!t) { res.writeHead(404); return res.end('not found'); }
      if (t.id !== user.id) pass('report-idor');
      res.writeHead(200, { 'Content-Type': 'text/csv' }); return res.end(reportCsv(t));
    }
    if (p === '/profile' && method === 'GET') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(profilePage(user)); }
    if (p === '/profile' && method === 'POST') return doProfile(req, res, user);

    const ck = parseCookies(req);
    const isAdmin = user.role === 'admin' || ck.hx_role === 'admin';
    if (p === '/admin' && method === 'GET') {
      if (!isAdmin) { res.writeHead(403, { 'Content-Type': 'text/html' }); return res.end(layout(user, 'Forbidden', '<div class="card">Admins only.</div>')); }
      if (user.role !== 'admin') pass('cookie-tamper'); // flaw: cookie-supplied role trusted
      res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(adminPage(user));
    }
    if (p === '/admin/credit' && method === 'POST') {
      if (!isAdmin) { res.writeHead(403, { 'Content-Type': 'text/html' }); return res.end(layout(user, 'Forbidden', '<div class="card">Admins only.</div>')); }
      const b = await readBody(req); attempt('Admin Panel');
      const t = users.find(x => x.email === String(b.email || '').toLowerCase());
      const amt = parseFloat(b.amount);
      if (t && !isNaN(amt)) t.balance += amt;
      if (foreignOrigin(req)) pass('admin-csrf'); // flaw: no CSRF token on admin actions
      res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(adminPage(user, t ? `Credited ${money(amt)} to ${esc(t.email)}.` : 'Investor not found.'));
    }
    if (p === '/api/admin/users' && method === 'GET') {
      attempt('Admin Panel');
      if (user.role !== 'admin') pass('admin-api-dump'); // flaw: any logged-in investor gets the admin dump
      return sendJson(res, users.map(x => ({ id: x.id, name: x.name, email: x.email, password: x.password, role: x.role, balance: x.balance })));
    }


    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(layout(user, 'Not found', '<div class="card">Page not found.</div>'));
  } catch (e) {
    try { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('error'); } catch (e2) {}
  }
});

server.listen(PORT, HOST, () => console.log(`LAB ${LAB_NO} ${LAB_NAME} listening on http://${HOST}:${PORT}`));
