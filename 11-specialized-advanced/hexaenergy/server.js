'use strict';
/*
 * HexaEnergy — LAB 106 (Category 11: Specialized & Advanced Business Systems)
 * A deliberately vulnerable energy-utility training lab. LOCAL USE ONLY.
 * Zero-dependency Node.js. All data is fake and held in memory.
 *
 * Business app: customers, meters, usage readings, tariffs, billing/invoices,
 * payments, service connections and support tickets — wrapped in the
 * HexaCyberLab lab system (progress, hints, Lab Coach, sequential key gate,
 * completion summary + certificate). See README.md.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB_NUMBER = 106;
const LAB_NAME = 'HexaEnergy';
const PORT = 3115;
const HOST = '127.0.0.1';
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const LOGO_FILE = path.join(DIR, 'logo.png');

/* ------------------------------------------------------------------ *
 * Region A — scattered credential material (part 1 of 2).
 * Values are never stored whole; see the assembler far below.
 * ------------------------------------------------------------------ */
const _fragA = [
  "MUwtWEg=",
  "Ry02MA==",
  "U0tRSA==",
  "LThTWg==",
  "TjhCOQ==",
  "Q0tOQw=="
];

/* ------------------------- progress state ------------------------- */
function defaultState() {
  return {
    unlocked: false,
    testerName: '',
    tests: {},
    attempts: {},
    probes: { fails: {}, enumEmails: [] },
    completedAt: null,
    keyRevealed: false
  };
}
let state = defaultState();
function loadState() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      state = Object.assign(defaultState(), raw);
      state.probes = Object.assign({ fails: {}, enumEmails: [] }, raw.probes || {});
    }
  } catch (e) { state = defaultState(); }
}
function saveState() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2)); } catch (e) {}
}
loadState();

/* ------------------------- TESTS registry ------------------------- */
/* Filled in below (section: registry). Each entry:
   { id, feature, name, owasp, difficulty, hints[3], lesson, impact,
     report: { title, severity, remediation }, where }              */
const TESTS = [
  {
    id: 'auth-sqli', feature: 'Login & Authentication',
    name: 'SQL injection login bypass',
    owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    where: 'POST /login',
    hints: [
      'The login form builds its database query by gluing your input straight into a string.',
      "Try an email that closes the quote and adds an always-true condition.",
      "Email: ' OR '1'='1' --  (with any password) comments out the password check and logs you in as the first user in the table."
    ],
    lesson: 'String-built queries let attacker input change the meaning of the query itself; a single quote can turn a credential check into an open door.',
    impact: 'On a real utility portal this means instant takeover of the first account in the database — usually an administrator — with no password at all.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements for all database access and never concatenate user input into SQL.' }
  },
  {
    id: 'auth-brute', feature: 'Login & Authentication',
    name: 'Brute force — no rate limit or lockout',
    owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    where: 'POST /login',
    hints: [
      'Pick one real account and keep guessing its password.',
      'Notice that failed attempts never slow down, CAPTCHA or lock the account.',
      'Submit 10 or more wrong passwords for the same account — every one is still processed.'
    ],
    lesson: 'Without throttling, an attacker can try unlimited passwords against any account; the missing control is the vulnerability, not the guesses themselves.',
    impact: 'Customer accounts fall to password spraying and credential stuffing, giving attackers control of billing, meter and personal data.',
    report: { title: 'Missing Rate Limiting on Authentication Endpoint', severity: 'High', remediation: 'Add progressive delays, lockout after repeated failures and CAPTCHA / MFA challenges on the login endpoint.' }
  },
  {
    id: 'auth-enum', feature: 'Login & Authentication',
    name: 'User enumeration via login and forgot-password responses',
    owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    where: 'POST /login, POST /forgot',
    hints: [
      'Compare the error message for an email that exists with one that does not.',
      'The forgot-password form answers differently too — that difference is an oracle.',
      'Probe at least 5 different email addresses across login / forgot and collect which ones are registered.'
    ],
    lesson: 'Different responses for "no such account" and "wrong password" let attackers build a verified list of real users to target.',
    impact: 'Attackers harvest valid customer emails for phishing and credential stuffing against the utility and other services.',
    report: { title: 'Account Enumeration via Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message ("invalid credentials" / "if the account exists…") for all authentication outcomes.' }
  },
  {
    id: 'auth-demo', feature: 'Login & Authentication',
    name: 'Published demo credentials grant a live account',
    owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    where: 'Login page / POST /login',
    hints: [
      'Read the login page carefully — it helpfully prints a demo account.',
      'Demo accounts in production are real accounts with real data access.',
      'Sign in with the demo credentials printed on the login page.'
    ],
    lesson: 'Demo and default credentials are the first thing attackers try; publishing them on the login page removes even that small effort.',
    impact: 'Anyone on the internet can walk into a live customer account and view or change energy account data.',
    report: { title: 'Demo Credentials Published and Active on Production Login', severity: 'High', remediation: 'Remove demo accounts from production, rotate any shared credentials and never print credentials on public pages.' }
  },
  {
    id: 'auth-reset', feature: 'Login & Authentication',
    name: 'Predictable password-reset token',
    owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    where: 'POST /reset',
    hints: [
      'Reset tokens here follow a pattern built from the account ID.',
      'The token looks like EN<id>-<a number you can compute from the id>.',
      'For user id N the token is EN<N>-<N*137+42>. Compute one for an account that never requested a reset and post it to /reset with a new password.'
    ],
    lesson: 'Reset tokens must be unguessable random secrets; a token derived from a public ID is an account-takeover formula anyone can compute.',
    impact: 'Every customer account can be taken over silently — the attacker only needs the victim\'s user ID.',
    report: { title: 'Predictable Password Reset Token Allows Account Takeover', severity: 'Critical', remediation: 'Generate reset tokens from a CSPRNG (≥128 bits), store only a hash, expire them quickly and bind them to a single use.' }
  },
  {
    id: 'auth-cookie', feature: 'Login & Authentication',
    name: 'Role cookie tampering reaches the staff console',
    owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'GET /staff',
    hints: [
      'After login, look at the cookies the app sets — one of them carries your role.',
      'The staff console trusts that cookie instead of the server-side session.',
      'Keep your customer session but change the hx_role cookie to meterreader and open /staff.'
    ],
    lesson: 'Authorization data stored on the client can be edited by the client; roles must be read from server-side session state, never from cookies.',
    impact: 'Any customer can promote themselves to staff and see operational meter-reading tools and data meant only for employees.',
    report: { title: 'Client-Side Role Cookie Trusted for Authorization', severity: 'High', remediation: 'Store the role in the server-side session only and authorize every request against it; ignore role claims from cookies.' }
  },
  {
    id: 'reg-weak', feature: 'Registration & Profile',
    name: 'Weak password policy accepts 1-character passwords',
    owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    where: 'POST /register',
    hints: [
      'Try registering with the shortest password the form will take.',
      'There is no minimum length or complexity check at all.',
      'Register a new account with a 1–3 character password — it is accepted.'
    ],
    lesson: 'A password policy is part of authentication strength; accepting 1-character passwords makes brute force trivial.',
    impact: 'Customer accounts are protected by passwords that fall in seconds, exposing billing and personal data.',
    report: { title: 'No Minimum Password Strength Enforced at Registration', severity: 'Medium', remediation: 'Enforce a minimum length (≥10) and block common/breached passwords at registration and password change.' }
  },
  {
    id: 'reg-mass', feature: 'Registration & Profile',
    name: 'Mass assignment — role and balance set at registration',
    owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /register',
    hints: [
      'The registration handler copies every posted field onto the new account.',
      'Fields the form never shows — like role or balance — are copied too.',
      'Register while also posting role=admin and balance=9999, then check your new account.'
    ],
    lesson: 'Binding request data directly to model objects lets attackers set privileged fields the UI never offered.',
    impact: 'Attackers mint administrator accounts or credit themselves balances, taking over the whole portal and its billing.',
    report: { title: 'Mass Assignment in Registration Allows Privilege Escalation', severity: 'Critical', remediation: 'Whitelist exactly the fields a request may set (name, email, password); assign role and balance server-side only.' }
  },
  {
    id: 'reg-xss', feature: 'Registration & Profile',
    name: 'Stored XSS in display name',
    owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    where: 'POST /register, POST /profile',
    hints: [
      'Your display name is rendered on pages other people — including admins — open.',
      'The name is printed without escaping, so HTML in it becomes live markup.',
      'Set your display name to a script payload such as <script>alert(1)</script> and save it.'
    ],
    lesson: 'Any user-controlled string rendered without output encoding becomes stored XSS that fires in other users\' browsers.',
    impact: 'An attacker can hijack staff or admin sessions and act inside the utility portal as that victim.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Contextually encode all user-controlled output and add a Content-Security-Policy as defence in depth.' }
  },
  {
    id: 'reg-csrf', feature: 'Registration & Profile',
    name: 'CSRF on profile update',
    owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /profile',
    hints: [
      'The app sets a benign hx_origin cookie on its own pages as an origin marker.',
      'The profile endpoint never checks that marker, so a cross-site form post works.',
      'Submit a profile change with your session cookie but WITHOUT the hx_origin cookie — it is accepted as a forged request.'
    ],
    lesson: 'State-changing requests need an unforgeable token; a session cookie alone is sent automatically by the browser on cross-site posts.',
    impact: 'A malicious page a customer visits can silently change their profile details or email, setting up account recovery attacks.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require a per-session CSRF token on every state-changing form and verify Origin/Referer as a secondary check.' }
  },
  {
    id: 'meter-idor', feature: 'Meters & Readings',
    name: 'Meter IDOR — another customer\'s meter and address',
    owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'GET /meter/:id',
    hints: [
      'Meter pages live at predictable sequential URLs.',
      'The server never checks that the meter belongs to you.',
      'Open a meter ID that is not yours — you get its address, tariff and reading history.'
    ],
    lesson: 'Every object access must verify the requesting user owns (or may see) that object; hiding links is not authorization.',
    impact: 'Customers can browse neighbours\' addresses, tariffs and usage patterns — a privacy breach and burglary-relevant data.',
    report: { title: 'Insecure Direct Object Reference on Meter Records', severity: 'High', remediation: 'Enforce per-object ownership checks on the server for every meter request.' }
  },
  {
    id: 'meter-reading-backwards', feature: 'Meters & Readings',
    name: 'Backwards meter reading accepted — usage erased',
    owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    where: 'POST /meter/:id/reading',
    hints: [
      'A meter reading should only ever move forwards.',
      'The endpoint accepts any number you send, even below the last reading.',
      'Submit a reading lower than your meter\'s last reading and watch the bill it creates.'
    ],
    lesson: 'Business invariants (readings are monotonic) must be enforced server-side; trusting client numbers invites billing fraud.',
    impact: 'Customers can erase real consumption and cut their energy bills to near zero — direct revenue loss for the utility.',
    report: { title: 'Meter Readings Accepted Below Previous Reading (Billing Fraud)', severity: 'High', remediation: 'Reject readings below the last recorded value and flag anomalies for manual review.' }
  },
  {
    id: 'meter-reading-other', feature: 'Meters & Readings',
    name: 'Submit a reading for someone else\'s meter',
    owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /meter/:id/reading',
    hints: [
      'Reading submissions take a meter ID in the URL.',
      'Ownership is not checked on the write path either.',
      'Post a new reading to a meter that belongs to another customer.'
    ],
    lesson: 'Write endpoints need the same ownership checks as reads; a writable IDOR lets attackers falsify other people\'s data.',
    impact: 'Attackers can inflate a victim\'s bill or sabotage their account history with forged readings.',
    report: { title: 'Missing Ownership Check on Meter Reading Submission', severity: 'High', remediation: 'Verify the meter belongs to the session user (or an authorized reader) before accepting readings.' }
  },
  {
    id: 'meter-usage-override', feature: 'Meters & Readings',
    name: 'Client-supplied usage figure overrides the real consumption',
    owasp: 'A04:2021 Insecure Design', difficulty: 'Advanced',
    where: 'POST /meter/:id/reading',
    hints: [
      'The reading form computes usage in the browser and posts it along.',
      'The server trusts that posted usage instead of computing it from the readings.',
      'Submit a valid higher reading but post usage=0 — the invoice is created for 0 kWh.'
    ],
    lesson: 'Values the server can compute itself must never be accepted from the client; the client is under attacker control.',
    impact: 'Customers pay for 0 kWh while consuming real energy — silent, scalable billing fraud.',
    report: { title: 'Server Trusts Client-Supplied Usage for Billing', severity: 'High', remediation: 'Compute usage server-side as (new reading − last reading); ignore any client-supplied usage or amount.' }
  },
  {
    id: 'meter-tariff-switch', feature: 'Meters & Readings',
    name: 'Switch a meter onto the internal unlisted tariff',
    owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    where: 'POST /meter/:id/tariff',
    hints: [
      'There are more tariffs in the system than the public tariff page shows.',
      'The tariff-switch endpoint accepts any tariff ID, including internal ones.',
      'Find the internal feed-in tariff\'s ID and switch your meter to it — its rate is negative.'
    ],
    lesson: 'Reference data with internal/unlisted entries must be filtered by entitlement at the action endpoint, not just hidden from listings.',
    impact: 'Customers move onto staff-only or negative-rate tariffs and get paid to consume electricity.',
    report: { title: 'Unlisted Internal Tariff Assignable by Customers', severity: 'High', remediation: 'Only allow assignment of published tariffs to customer meters and require staff approval for internal tariffs.' }
  },
  {
    id: 'search-sqli', feature: 'Search & Catalogue',
    name: 'SQL injection in search dumps unlisted tariffs',
    owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    where: 'GET /search?q=',
    hints: [
      'Search builds its query with your text inside a LIKE pattern.',
      'A quote in the search text breaks out of the pattern.',
      "Search for ' OR '1'='1' --  and the internal, unlisted tariff appears in the results."
    ],
    lesson: 'Search boxes are injection points too; LIKE patterns built by concatenation expose rows the UI deliberately hides.',
    impact: 'Attackers enumerate internal tariffs, meters and customer data that were never meant to be public.',
    report: { title: 'SQL Injection in Search Exposes Unlisted Records', severity: 'High', remediation: 'Parameterise search queries and escape LIKE wildcards in user input.' }
  },
  {
    id: 'search-xss', feature: 'Search & Catalogue',
    name: 'Reflected XSS in search results',
    owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    where: 'GET /search?q=',
    hints: [
      'Your search text is printed back at the top of the results page.',
      'It is printed without escaping.',
      'Search for <script>alert(1)</script> and see it reflected as live markup.'
    ],
    lesson: 'Reflected input must be encoded on output; search pages are classic XSS carriers because they echo the query.',
    impact: 'Attackers craft links that run script in a logged-in customer\'s or agent\'s browser when clicked.',
    report: { title: 'Reflected Cross-Site Scripting in Search', severity: 'Medium', remediation: 'HTML-encode the search term wherever it is reflected and validate input length/characters.' }
  },
  {
    id: 'bill-invoice-idor', feature: 'Billing & Invoices',
    name: 'Invoice IDOR — another customer\'s bill',
    owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'GET /invoice/:id',
    hints: [
      'Invoices have sequential IDs.',
      'The invoice page never checks the invoice is yours.',
      'Open an invoice ID belonging to another customer to see their amount and usage.'
    ],
    lesson: 'Financial documents need per-object authorization; sequential IDs make unauthorised browsing trivial.',
    impact: 'Customers\' billing amounts, addresses and usage leak to any other customer — a privacy and trust failure.',
    report: { title: 'Insecure Direct Object Reference on Invoices', severity: 'High', remediation: 'Check invoice ownership against the session user on every invoice view and payment.' }
  },
  {
    id: 'bill-pay-dollar', feature: 'Billing & Invoices',
    name: 'Paying $1 settles a full invoice',
    owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    where: 'POST /invoice/:id/pay',
    hints: [
      'The payment form lets you type the amount yourself.',
      'The server marks the invoice PAID for any positive amount it receives.',
      'Pay $1 toward a large invoice — it flips to PAID IN FULL.'
    ],
    lesson: 'Payment state must be derived from verified amounts; a client-declared amount is not a payment.',
    impact: 'Customers clear real energy bills for a dollar — direct, obvious revenue loss.',
    report: { title: 'Invoice Settled for Arbitrary Client-Supplied Amount', severity: 'Critical', remediation: 'Settle invoices only from verified payment-provider callbacks matching the full invoice amount.' }
  },
  {
    id: 'bill-pay-negative', feature: 'Billing & Invoices',
    name: 'Negative payment credits the wallet',
    owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    where: 'POST /invoice/:id/pay',
    hints: [
      'Amounts are never checked for sign.',
      'A negative "payment" is processed like a refund — to you.',
      'Pay an invoice with amount=-50 and watch your account balance grow by $50.'
    ],
    lesson: 'Numeric inputs need range validation; negative money flows invert the direction of the transaction.',
    impact: 'Attackers mint unlimited account credit from nothing and cash it out against real bills.',
    report: { title: 'Negative Payment Amount Accepted and Credited', severity: 'High', remediation: 'Reject non-positive payment amounts and validate all monetary inputs server-side.' }
  },
  {
    id: 'conn-idor', feature: 'Connections & Support',
    name: 'Service connection request IDOR',
    owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'GET /connection/:id',
    hints: [
      'Connection requests (new supply, upgrades) have sequential IDs.',
      'Their detail pages show the applicant\'s address and connection fee.',
      'Open a connection request that belongs to another customer.'
    ],
    lesson: 'Workflow objects — applications, requests, cases — need the same ownership checks as core records.',
    impact: 'Home addresses and planned connection details of other customers leak, a privacy and safety issue.',
    report: { title: 'Insecure Direct Object Reference on Service Connection Requests', severity: 'Medium', remediation: 'Enforce ownership checks on connection request views and updates.' }
  },
  {
    id: 'ticket-close-other', feature: 'Connections & Support',
    name: 'Close another customer\'s support ticket',
    owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /ticket/:id/close',
    hints: [
      'The close-ticket action trusts the ticket ID in the URL.',
      'It never asks whether the ticket is yours.',
      'Close a support ticket opened by a different customer.'
    ],
    lesson: 'State-changing actions on other users\' objects are integrity attacks, not just privacy leaks.',
    impact: 'Attackers can sabotage other customers\' support cases, hiding faults and delaying repairs.',
    report: { title: 'Missing Authorization on Support Ticket Closure', severity: 'Medium', remediation: 'Only the ticket owner or support staff may change ticket state; verify on the server.' }
  },
  {
    id: 'admin-bac', feature: 'Admin Panel',
    name: 'Admin panel served to any logged-in customer',
    owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'GET /admin',
    hints: [
      'Try the obvious admin URL while signed in as a normal customer.',
      'The panel only checks that *someone* is logged in.',
      'Open /admin as a customer — the full user list, including passwords, is rendered.'
    ],
    lesson: 'Role checks must happen on the server for every privileged route; "logged in" is not "is staff".',
    impact: 'Every customer password and account detail is exposed to any registered user — total compromise.',
    report: { title: 'Broken Access Control on Admin Panel (Password Disclosure)', severity: 'Critical', remediation: 'Require an admin role check on all admin routes and never render password material.' }
  },
  {
    id: 'admin-csrf', feature: 'Admin Panel',
    name: 'CSRF on admin tariff update',
    owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /admin/tariff/update',
    hints: [
      'Admin actions are plain POSTs protected only by the session cookie.',
      'The benign hx_origin marker the app sets on its own pages is never verified.',
      'Post a tariff rate change with a session cookie but no hx_origin marker — the rate changes.'
    ],
    lesson: 'Privileged actions are the highest-value CSRF targets; without tokens, one malicious page in an admin\'s browser rewrites pricing.',
    impact: 'An attacker can change energy tariffs company-wide by tricking a signed-in admin into visiting a page.',
    report: { title: 'Missing CSRF Protection on Admin Tariff Update', severity: 'High', remediation: 'Add per-session CSRF tokens to all admin forms and verify them server-side.' }
  },
  {
    id: 'api-token', feature: 'Platform & API',
    name: 'API key is just base64(email)',
    owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    where: 'GET /api/invoices (X-API-Key)',
    hints: [
      'The JSON API authenticates with an X-API-Key header.',
      'The "key" is a trivial encoding of something public — the account email.',
      'Base64-encode another customer\'s email and call /api/invoices with it as X-API-Key — no password, no session.'
    ],
    lesson: 'API credentials must be high-entropy secrets; an encoded identifier is not a credential.',
    impact: 'Anyone who knows a customer\'s email can pull their invoices through the API — mass data theft with a phone book.',
    report: { title: 'Weak API Authentication (Base64 Email as API Key)', severity: 'High', remediation: 'Issue random per-user API tokens, store them hashed and support revocation/rotation.' }
  },
  {
    id: 'api-debug', feature: 'Platform & API',
    name: 'Unauthenticated /api/debug dumps all accounts',
    owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    where: 'GET /api/debug',
    hints: [
      'Debug endpoints often survive into production.',
      'This one needs no login at all.',
      'Open /api/debug in a private window — every user, including passwords, is returned as JSON.'
    ],
    lesson: 'Debug and diagnostic endpoints must never ship to production; if they do, they need the strongest authentication, not the least.',
    impact: 'Complete credential dump of every customer and staff account to anyone who finds the URL.',
    report: { title: 'Unauthenticated Debug Endpoint Exposes All Credentials', severity: 'Critical', remediation: 'Remove debug endpoints from production builds and gate diagnostics behind admin auth and IP allowlists.' }
  }
];
const TEST_BY_ID = {};
for (const t of TESTS) TEST_BY_ID[t.id] = t;
const FEATURES = [];
for (const t of TESTS) if (!FEATURES.includes(t.feature)) FEATURES.push(t.feature);

function pass(id) {
  if (!TEST_BY_ID[id]) return;
  if (!state.tests[id]) {
    state.tests[id] = true;
    if (doneCount() === TESTS.length && !state.completedAt) {
      state.completedAt = new Date().toISOString();
      state.keyRevealed = true;
    }
    saveState();
  }
}
function attempt(feature) {
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  saveState();
}
function doneCount() { return Object.keys(state.tests).filter(k => state.tests[k]).length; }
function pct() { return Math.floor(doneCount() * 100 / TESTS.length); }
function isComplete() { return doneCount() === TESTS.length; }

/* --------------------- tiny string-built SQL ---------------------- *
 * The vulnerable data layer: queries are built by concatenating user
 * input into a string, then evaluated by this mini evaluator.       */
function tokenizeSql(q) {
  const toks = []; let i = 0;
  while (i < q.length) {
    const c = q[i];
    if (c === ' ' || c === '\t' || c === '\n') { i++; continue; }
    if (c === '-' && q[i + 1] === '-') break; // comment truncates the rest
    if (c === "'") {
      let j = i + 1, s = '';
      while (j < q.length && q[j] !== "'") { s += q[j]; j++; }
      toks.push({ t: 'str', v: s }); i = j + 1; continue;
    }
    if (c === '=') { toks.push({ t: 'op', v: '=' }); i++; continue; }
    if (/[0-9]/.test(c)) {
      let j = i, s = '';
      while (j < q.length && /[0-9.]/.test(q[j])) { s += q[j]; j++; }
      toks.push({ t: 'num', v: parseFloat(s) }); i = j; continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i, s = '';
      while (j < q.length && /[A-Za-z0-9_]/.test(q[j])) { s += q[j]; j++; }
      const up = s.toUpperCase();
      if (up === 'AND' || up === 'OR' || up === 'LIKE') toks.push({ t: 'kw', v: up });
      else toks.push({ t: 'ident', v: s });
      i = j; continue;
    }
    i++; // ignore anything else (parentheses etc.)
  }
  return toks;
}
function evalSql(query, row) {
  const toks = tokenizeSql(query);
  let pos = 0;
  function operand() {
    const tk = toks[pos++];
    if (!tk) return '';
    if (tk.t === 'str' || tk.t === 'num') return tk.v;
    if (tk.t === 'ident') {
      const key = Object.keys(row).find(k => k.toLowerCase() === tk.v.toLowerCase());
      return key !== undefined ? row[key] : '';
    }
    return '';
  }
  function cmp() {
    const a = operand();
    const tk = toks[pos];
    if (tk && tk.t === 'op') { pos++; const b = operand(); return String(a) === String(b); }
    if (tk && tk.t === 'kw' && tk.v === 'LIKE') {
      pos++; const pat = String(operand());
      const rx = new RegExp('^' + pat.split('%').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$', 'i');
      return rx.test(String(a));
    }
    return !!a;
  }
  function andExpr() { let v = cmp(); while (toks[pos] && toks[pos].t === 'kw' && toks[pos].v === 'AND') { pos++; const r = cmp(); v = v && r; } return v; }
  function orExpr() { let v = andExpr(); while (toks[pos] && toks[pos].t === 'kw' && toks[pos].v === 'OR') { pos++; const r = andExpr(); v = v || r; } return v; }
  try { return !!orExpr(); } catch (e) { return false; }
}

/* --------------------------- seed data ---------------------------- */
let nextUserId = 100;
const users = [
  { id: 1, name: 'Ada Admin', email: 'admin@hexaenergy.local', password: 'admin123', role: 'admin', balance: 0 },
  { id: 2, name: 'Alice Meyer', email: 'alice@test.local', password: 'alice123', role: 'customer', balance: 120 },
  { id: 3, name: 'Bob Carter', email: 'bob@test.local', password: 'bob123', role: 'customer', balance: 45 },
  { id: 4, name: 'Demo Dan', email: 'demo@hexaenergy.local', password: 'demo123', role: 'customer', balance: 10 },
  { id: 5, name: 'Rita Reader', email: 'rita@hexaenergy.local', password: 'rita123', role: 'meterreader', balance: 0 }
];
const tariffs = [
  { id: 1, name: 'Standard', rate: 0.28, listed: 1 },
  { id: 2, name: 'Economy Night', rate: 0.16, listed: 1 },
  { id: 3, name: 'Premium Green', rate: 0.42, listed: 1 },
  { id: 4, name: 'Solar Feed-In (Internal Draft)', rate: -0.08, listed: 0 }
];
let meters = [
  { id: 1, meterNo: 'EN-1001', ownerId: 2, tariffId: 1, address: '12 Oak Street', lastReading: 4520 },
  { id: 2, meterNo: 'EN-1002', ownerId: 3, tariffId: 1, address: '48 Pine Avenue', lastReading: 7810 },
  { id: 3, meterNo: 'EN-1003', ownerId: 2, tariffId: 2, address: '12 Oak Street (Annex)', lastReading: 1290 },
  { id: 4, meterNo: 'EN-1004', ownerId: 4, tariffId: 1, address: '3 Demo Lane', lastReading: 300 }
];
let readings = [
  { meterId: 1, value: 4100, usage: 390, when: '2026-09-30' },
  { meterId: 1, value: 4520, usage: 420, when: '2026-10-31' },
  { meterId: 2, value: 7300, usage: 480, when: '2026-09-30' },
  { meterId: 2, value: 7810, usage: 510, when: '2026-10-31' },
  { meterId: 3, value: 1100, usage: 180, when: '2026-09-30' },
  { meterId: 3, value: 1290, usage: 190, when: '2026-10-31' }
];
let nextInvoiceId = 4;
let invoices = [
  { id: 1, ownerId: 2, meterId: 1, amount: 118.00, status: 'unpaid', period: 'October 2026', usage: 420 },
  { id: 2, ownerId: 3, meterId: 2, amount: 142.80, status: 'unpaid', period: 'October 2026', usage: 510 },
  { id: 3, ownerId: 2, meterId: 3, amount: 30.40, status: 'paid', period: 'September 2026', usage: 190 }
];
const connections = [
  { id: 1, ownerId: 2, kind: 'New connection', address: '12 Oak Street', status: 'approved', fee: 250 },
  { id: 2, ownerId: 3, kind: 'Capacity upgrade', address: '48 Pine Avenue', status: 'pending', fee: 400 }
];
const tickets = [
  { id: 1, ownerId: 2, subject: 'Billing question about October invoice', status: 'open' },
  { id: 2, ownerId: 3, subject: 'Meter display flickering', status: 'open' }
];
const issuedResetTokens = new Set();
const sessions = new Map(); // sid -> userId

function userById(id) { return users.find(u => u.id === id); }
function tariffById(id) { return tariffs.find(t => t.id === id); }
function resetTokenFor(u) { return 'EN' + u.id + '-' + (u.id * 137 + 42); }

/* --------------------------- HTTP plumbing ------------------------ */
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function newSession(userId) { const sid = crypto.randomBytes(16).toString('hex'); sessions.set(sid, userId); return sid; }

function layout(ctx, title, bodyHtml) {
  const d = doneCount(), p = pct();
  const nav = ctx.user
    ? `<a href="/">Home</a> · <a href="/meters">My Meters</a> · <a href="/tariffs">Tariffs</a> · <a href="/search">Search</a> · <a href="/invoices">Invoices</a> · <a href="/connections">Connections</a> · <a href="/tickets">Support</a> · <a href="/staff">Staff</a> · <a href="/profile">Profile</a> · <a href="/tests">Mission Board</a> · <form method="POST" action="/logout" style="display:inline"><button type="submit">Log out (${esc(ctx.user.name)})</button></form>`
    : `<a href="/login">Log in</a> · <a href="/register">Register</a> · <a href="/tests">Mission Board</a>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} — HexaEnergy</title>
<style>body{font-family:system-ui,Arial,sans-serif;margin:2rem auto;max-width:920px;padding:0 1rem;color:#1c2733}header{border-bottom:3px solid #f5a623;padding-bottom:.5rem;margin-bottom:1rem}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:.35rem .6rem}input,select{padding:.3rem;margin:.2rem 0}.bar{background:#e8edf2;height:14px;border-radius:7px;overflow:hidden}.bar>i{display:block;height:100%;background:linear-gradient(90deg,#2f7fe0,#8b46c7)}code{background:#f2f2f2;padding:.1rem .3rem}.card{border:1px solid #ccc;border-radius:10px;padding:1rem;margin:.6rem 0}.done{color:#157347}.open{color:#999}#chat{position:fixed;right:1rem;bottom:1rem;width:320px;background:#fff;border:1px solid #bbb;border-radius:10px;box-shadow:0 4px 18px rgba(0,0,0,.2)}#chat h4{margin:.5rem .7rem}#chatlog{max-height:180px;overflow:auto;padding:0 .7rem;font-size:.9em}#chat form{display:flex;gap:.3rem;padding:.5rem .7rem}#chat input{flex:1}</style></head>
<body><header><img src="/logo.png" alt="HexaCyberLab" style="height:34px;vertical-align:middle"> <strong>LAB ${LAB_NUMBER} — ${LAB_NAME}</strong>
<div style="margin:.4rem 0">LAB ${LAB_NUMBER} · ${d}/${TESTS.length} tests · ${p}%</div><div class="bar"><i style="width:${p}%"></i></div>
<nav style="margin-top:.5rem">${nav}</nav></header>
${bodyHtml}
<div id="chat"><h4>⚡ Lab Coach</h4><div id="chatlog"></div><form id="chatform"><input id="chatin" placeholder="Ask the coach…" autocomplete="off"><button>Send</button></form></div>
<script>
document.getElementById('chatform').addEventListener('submit', async e => {
  e.preventDefault();
  const inp = document.getElementById('chatin'); const msg = inp.value.trim(); if (!msg) return; inp.value = '';
  const log = document.getElementById('chatlog');
  log.innerHTML += '<p><b>You:</b> ' + msg.replace(/</g,'&lt;') + '</p>';
  try { const r = await fetch('/api/chat', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({message: msg})});
    const j = await r.json(); log.innerHTML += '<p><b>Coach:</b> ' + String(j.reply).replace(/</g,'&lt;') + '</p>';
  } catch (err) { log.innerHTML += '<p><b>Coach:</b> (unreachable)</p>'; }
  log.scrollTop = log.scrollHeight;
});
</script></body></html>`;
}

function gatePage(ctx) {
  return layout(ctx, 'Locked', `<h2>🔒 Locked — LAB ${LAB_NUMBER} ${LAB_NAME}</h2>
<p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
<form method="POST" action="/unlock"><input name="key" size="42" placeholder="Completion key from Lab ${LAB_NUMBER - 1}"><button type="submit">Unlock</button></form>`);
}

/* ------------------------------ auth ------------------------------ */
function handleLogin(ctx) {
  attempt('Login & Authentication');
  const email = String(ctx.body.email || '');
  const password = String(ctx.body.password || '');
  // probe bookkeeping for enumeration detection
  if (email && !state.probes.enumEmails.includes(email)) {
    state.probes.enumEmails.push(email);
    if (state.probes.enumEmails.length >= 5) pass('auth-enum');
    saveState();
  }
  // VULNERABLE: string-built query, no parameterisation.
  const q = "email = '" + email + "' AND password = '" + password + "'";
  const user = users.find(u => evalSql(q, u));
  if (!user) {
    state.probes.fails[email] = (state.probes.fails[email] || 0) + 1;
    if (state.probes.fails[email] >= 10) pass('auth-brute');
    saveState();
    const exists = users.some(u => u.email === email);
    const msg = exists ? 'Incorrect password.' : 'No account with that email.';
    return { status: 200, body: layout(ctx, 'Log in', `<h2>Log in</h2><p style="color:#b00">${msg}</p><p><a href="/login">Try again</a></p>`) };
  }
  const exact = users.some(u => u.email === email && u.password === password);
  if (!exact) pass('auth-sqli');
  if (user.email === 'demo@hexaenergy.local') pass('auth-demo');
  const sid = newSession(user.id);
  ctx.setCookies.push(`hx_session=${sid}; Path=/; HttpOnly`);
  ctx.setCookies.push(`hx_role=${user.role}; Path=/`);
  return { status: 302, headers: { Location: '/' }, body: '' };
}

function loginPage(ctx) {
  return { status: 200, body: layout(ctx, 'Log in', `<h2>Log in to HexaEnergy</h2>
<form method="POST" action="/login">
<label>Email <input name="email" size="32"></label><br>
<label>Password <input name="password" type="password" size="32"></label><br>
<button type="submit">Log in</button></form>
<p><a href="/forgot">Forgot password?</a> · <a href="/register">Create account</a></p>
<div class="card"><b>Try our demo account:</b> email <code>demo@hexaenergy.local</code> · password <code>demo123</code></div>`) };
}

function handleRegister(ctx) {
  attempt('Registration & Profile');
  const name = String(ctx.body.name || 'New User');
  const email = String(ctx.body.email || '');
  const password = String(ctx.body.password || '');
  if (!email || !password) return { status: 400, body: layout(ctx, 'Register', '<p>Email and password are required.</p>') };
  if (users.some(u => u.email === email)) return { status: 200, body: layout(ctx, 'Register', '<p>That email is already registered.</p>') };
  // VULNERABLE: copies every posted field onto the new account (mass assignment),
  // no password strength check, name stored unsanitised.
  const u = { id: nextUserId++, name, email, password, role: 'customer', balance: 0 };
  for (const k of Object.keys(ctx.body)) {
    if (k === 'role') u.role = String(ctx.body.role);
    if (k === 'balance') u.balance = parseFloat(ctx.body.balance) || 0;
  }
  users.push(u);
  if (password.length <= 3) pass('reg-weak');
  if (u.role !== 'customer' || u.balance > 0) pass('reg-mass');
  if (/<script|onerror=|onload=|<svg|<img/i.test(name)) pass('reg-xss');
  const sid = newSession(u.id);
  ctx.setCookies.push(`hx_session=${sid}; Path=/; HttpOnly`);
  ctx.setCookies.push(`hx_role=${u.role}; Path=/`);
  return { status: 302, headers: { Location: '/' }, body: '' };
}

function registerPage(ctx) {
  return { status: 200, body: layout(ctx, 'Register', `<h2>Create your HexaEnergy account</h2>
<form method="POST" action="/register">
<label>Display name <input name="name" size="32"></label><br>
<label>Email <input name="email" size="32"></label><br>
<label>Password <input name="password" type="password" size="32"></label><br>
<button type="submit">Register</button></form>`) };
}

function handleForgot(ctx) {
  attempt('Login & Authentication');
  const email = String(ctx.body.email || '');
  if (email && !state.probes.enumEmails.includes(email)) {
    state.probes.enumEmails.push(email);
    if (state.probes.enumEmails.length >= 5) pass('auth-enum');
    saveState();
  }
  const u = users.find(x => x.email === email);
  if (!u) return { status: 200, body: layout(ctx, 'Forgot password', '<p style="color:#b00">No account found for that email.</p><p><a href="/forgot">Back</a></p>') };
  issuedResetTokens.add(resetTokenFor(u));
  return { status: 200, body: layout(ctx, 'Forgot password', '<p>Reset link sent — please check your email.</p>') };
}

function forgotPage(ctx) {
  return { status: 200, body: layout(ctx, 'Forgot password', `<h2>Forgot password</h2>
<form method="POST" action="/forgot"><label>Email <input name="email" size="32"></label> <button type="submit">Send reset link</button></form>
<h3>Have a token?</h3>
<form method="POST" action="/reset"><label>Token <input name="token" size="24"></label> <label>New password <input name="newpassword" size="20"></label> <button type="submit">Reset password</button></form>`) };
}

function handleReset(ctx) {
  attempt('Login & Authentication');
  const token = String(ctx.body.token || '');
  const np = String(ctx.body.newpassword || '');
  const u = users.find(x => resetTokenFor(x) === token);
  if (!u || !np) return { status: 200, body: layout(ctx, 'Reset', '<p style="color:#b00">Invalid reset token.</p>') };
  if (!issuedResetTokens.has(token)) pass('auth-reset'); // token computed, never requested
  u.password = np;
  return { status: 200, body: layout(ctx, 'Reset', '<p>Password updated. <a href="/login">Log in</a></p>') };
}

function handleProfile(ctx) {
  if (!ctx.user) return { status: 302, headers: { Location: '/login' }, body: '' };
  attempt('Registration & Profile');
  const name = String(ctx.body.name || ctx.user.name);
  const email = String(ctx.body.email || ctx.user.email);
  ctx.user.name = name; ctx.user.email = email;
  if (/<script|onerror=|onload=|<svg|<img/i.test(name)) pass('reg-xss');
  if (!ctx.cookies.hx_origin) pass('reg-csrf'); // state change without the app's origin marker
  return { status: 302, headers: { Location: '/profile' }, body: '' };
}

function profilePage(ctx) {
  if (!ctx.user) return { status: 302, headers: { Location: '/login' }, body: '' };
  return { status: 200, body: layout(ctx, 'Profile', `<h2>Your profile</h2>
<p>Name: <span>${ctx.user.name}</span></p><p>Email: ${esc(ctx.user.email)}</p>
<p>Role: ${esc(ctx.user.role)}</p><p>Account balance: $${Number(ctx.user.balance).toFixed(2)}</p>
<form method="POST" action="/profile">
<label>Display name <input name="name" size="32" value="${esc(ctx.user.name)}"></label><br>
<label>Email <input name="email" size="32" value="${esc(ctx.user.email)}"></label><br>
<button type="submit">Save changes</button></form>`) };
}

/* --------------------------- business app ------------------------- */
function homePage(ctx) {
  if (!ctx.user) {
    return { status: 200, body: layout(ctx, 'Welcome', `<h2>Welcome to HexaEnergy</h2>
<p>Manage your meters, readings, tariffs and bills. <a href="/login">Log in</a> or <a href="/register">create an account</a>.</p>
<p>New here? Work through the <a href="/tests">Mission Board</a> — ${TESTS.length} hands-on security tests across ${FEATURES.length} features.</p>`) };
  }
  const myMeters = meters.filter(m => m.ownerId === ctx.user.id);
  const myInv = invoices.filter(i => i.ownerId === ctx.user.id);
  return { status: 200, body: layout(ctx, 'Home', `<h2>Hello, ${ctx.user.name}</h2>
<p>Balance: $${Number(ctx.user.balance).toFixed(2)} · Role: ${esc(ctx.user.role)}</p>
<h3>Your meters</h3>${myMeters.map(m => `<p><a href="/meter/${m.id}">${esc(m.meterNo)}</a> — ${esc(m.address)} — last reading ${m.lastReading} kWh</p>`).join('') || '<p>None yet.</p>'}
<h3>Your invoices</h3>${myInv.map(i => `<p><a href="/invoice/${i.id}">Invoice #${i.id}</a> — $${i.amount.toFixed(2)} — ${esc(i.status)}</p>`).join('') || '<p>None yet.</p>'}`) };
}

function metersPage(ctx) {
  if (!ctx.user) return { status: 302, headers: { Location: '/login' }, body: '' };
  const mine = meters.filter(m => m.ownerId === ctx.user.id);
  return { status: 200, body: layout(ctx, 'My Meters', `<h2>My meters</h2>` +
    mine.map(m => `<div class="card"><a href="/meter/${m.id}">${esc(m.meterNo)}</a> — ${esc(m.address)}<br>Tariff: ${esc(tariffById(m.tariffId).name)} (${tariffById(m.tariffId).rate}/kWh) · Last reading: ${m.lastReading} kWh</div>`).join('')) };
}

function meterPage(ctx, id) {
  if (!ctx.user) return { status: 302, headers: { Location: '/login' }, body: '' };
  attempt('Meters & Readings');
  const m = meters.find(x => x.id === id);
  if (!m) return { status: 404, body: layout(ctx, 'Not found', '<p>No such meter.</p>') };
  if (m.ownerId !== ctx.user.id && ctx.user.role !== 'admin') pass('meter-idor'); // VULNERABLE: served anyway
  const hist = readings.filter(r => r.meterId === m.id);
  return { status: 200, body: layout(ctx, 'Meter ' + m.meterNo, `<h2>Meter ${esc(m.meterNo)}</h2>
<p>Address: ${esc(m.address)}</p><p>Owner account #${m.ownerId}</p>
<p>Tariff: ${esc(tariffById(m.tariffId).name)} — $${tariffById(m.tariffId).rate}/kWh</p>
<p>Last reading: <b>${m.lastReading} kWh</b></p>
<h3>Reading history</h3>${hist.map(r => `<p>${esc(r.when)} — ${r.value} kWh (usage ${r.usage})</p>`).join('')}
<h3>Submit a reading</h3>
<form method="POST" action="/meter/${m.id}/reading">
<label>New reading (kWh) <input name="value" size="10"></label>
<input type="hidden" name="usage" value="">
<button type="submit">Submit reading</button></form>
<h3>Change tariff</h3>
<form method="POST" action="/meter/${m.id}/tariff">
<label>Tariff ID <input name="tariffId" size="4"></label> <button type="submit">Switch tariff</button></form>
<p><small>Public tariff IDs are listed on the <a href="/tariffs">tariffs page</a>.</small></p>`) };
}

function handleReading(ctx, id) {
  if (!ctx.user) return { status: 302, headers: { Location: '/login' }, body: '' };
  attempt('Meters & Readings');
  const m = meters.find(x => x.id === id);
  if (!m) return { status: 404, body: layout(ctx, 'Not found', '<p>No such meter.</p>') };
  const value = parseFloat(ctx.body.value);
  if (isNaN(value)) return { status: 400, body: layout(ctx, 'Reading', '<p>Reading must be a number.</p>') };
  if (m.ownerId !== ctx.user.id) pass('meter-reading-other'); // VULNERABLE: accepted anyway
  const delta = value - m.lastReading;
  if (value < m.lastReading) pass('meter-reading-backwards'); // VULNERABLE: accepted anyway
  let usage = delta;
  if (ctx.body.usage !== undefined && ctx.body.usage !== '') {
    const posted = parseFloat(ctx.body.usage);
    if (!isNaN(posted)) {
      if (posted !== delta) pass('meter-usage-override'); // VULNERABLE: client figure trusted
      usage = posted;
    }
  }
  const t = tariffById(m.tariffId);
  const amount = Math.round(usage * t.rate * 100) / 100;
  const inv = { id: nextInvoiceId++, ownerId: m.ownerId, meterId: m.id, amount, status: 'unpaid', period: 'November 2026', usage };
  invoices.push(inv);
  readings.push({ meterId: m.id, value, usage, when: '2026-11-01' });
  m.lastReading = value;
  return { status: 200, body: layout(ctx, 'Reading saved', `<p>Reading saved for meter ${esc(m.meterNo)}. Usage billed: ${usage} kWh.</p><p>Invoice #${inv.id} created: $${amount.toFixed(2)} (<a href="/invoice/${inv.id}">view</a>).</p>`) };
}

function handleTariffSwitch(ctx, id) {
  if (!ctx.user) return { status: 302, headers: { Location: '/login' }, body: '' };
  attempt('Meters & Readings');
  const m = meters.find(x => x.id === id);
  const t = tariffById(parseInt(ctx.body.tariffId, 10));
  if (!m || !t) return { status: 404, body: layout(ctx, 'Not found', '<p>No such meter or tariff.</p>') };
  if (t.listed === 0 && ctx.user.role !== 'admin') pass('meter-tariff-switch'); // VULNERABLE: internal tariff assignable
  m.tariffId = t.id;
  return { status: 302, headers: { Location: '/meter/' + m.id }, body: '' };
}

function tariffsPage(ctx) {
  const pub = tariffs.filter(t => t.listed === 1);
  return { status: 200, body: layout(ctx, 'Tariffs', `<h2>Tariffs</h2>` +
    pub.map(t => `<div class="card"><a href="/tariff/${t.id}">${esc(t.name)}</a> — $${t.rate}/kWh</div>`).join('')) };
}

function tariffPage(ctx, id) {
  attempt('Search & Catalogue');
  const t = tariffById(id);
  if (!t) return { status: 404, body: layout(ctx, 'Not found', '<p>No such tariff.</p>') };
  // Unlisted tariffs are served by direct ID (information exposure); the scored
  // test for this tariff is assigning it to a meter (see handleTariffSwitch).
  return { status: 200, body: layout(ctx, 'Tariff', `<h2>${esc(t.name)}</h2><p>Rate: $${t.rate}/kWh</p><p>Tariff ID: ${t.id}</p>`) };
}

function searchPage(ctx) {
  attempt('Search & Catalogue');
  const q = String(ctx.query.q || '');
  const rows = [];
  for (const t of tariffs) rows.push({ label: t.name, kind: 'Tariff', listed: t.listed, ref: '/tariff/' + t.id });
  for (const m of meters) rows.push({ label: m.meterNo + ' ' + m.address, kind: 'Meter', listed: 1, ref: '/meter/' + m.id });
  // VULNERABLE: string-built query.
  const query = "listed = 1 AND label LIKE '%" + q + "%'";
  const hits = rows.filter(r => evalSql(query, r));
  if (hits.some(h => h.listed === 0)) pass('search-sqli');
  if (/<script|onerror=|onload=|<svg|<img/i.test(q)) pass('search-xss');
  return { status: 200, body: layout(ctx, 'Search', `<h2>Results for "${q}"</h2>
<form method="GET" action="/search"><input name="q" size="36" value="${esc(q)}"> <button>Search</button></form>
${hits.map(h => `<p>[${esc(h.kind)}] <a href="${h.ref}">${esc(h.label)}</a></p>`).join('') || '<p>No results.</p>'}`) };
}

/* ------------------------------------------------------------------ *
 * Region B — scattered credential material (part 2 of 2), kept with
 * the billing configuration far from Region A.
 * ------------------------------------------------------------------ */
const _fragB = [
  "MUwtWEg=",
  "NS03MA==",
  "TDVVRg==",
  "LVNZSw==",
  "UjJQVQ==",
  "VE1POQ=="
];
function _assemble(parts) {
  return parts.map(s => [...Buffer.from(s, 'base64').toString('utf8')].reverse().join('')).join('');
}

function invoicesPage(ctx) {
  if (!ctx.user) return { status: 302, headers: { Location: '/login' }, body: '' };
  const mine = invoices.filter(i => i.ownerId === ctx.user.id);
  return { status: 200, body: layout(ctx, 'Invoices', `<h2>Your invoices</h2>` +
    mine.map(i => `<div class="card"><a href="/invoice/${i.id}">Invoice #${i.id}</a> — ${esc(i.period)} — $${i.amount.toFixed(2)} — <b>${esc(i.status)}</b></div>`).join('')) };
}

function invoicePage(ctx, id) {
  if (!ctx.user) return { status: 302, headers: { Location: '/login' }, body: '' };
  attempt('Billing & Invoices');
  const inv = invoices.find(x => x.id === id);
  if (!inv) return { status: 404, body: layout(ctx, 'Not found', '<p>No such invoice.</p>') };
  if (inv.ownerId !== ctx.user.id && ctx.user.role !== 'admin') pass('bill-invoice-idor'); // VULNERABLE: served anyway
  return { status: 200, body: layout(ctx, 'Invoice #' + inv.id, `<h2>Invoice #${inv.id}</h2>
<p>Account #${inv.ownerId} · Meter #${inv.meterId} · Period: ${esc(inv.period)}</p>
<p>Usage: ${inv.usage} kWh</p><p>Amount due: <b>$${inv.amount.toFixed(2)}</b></p><p>Status: <b>${esc(inv.status)}</b></p>
${inv.status !== 'paid' ? `<h3>Pay this invoice</h3>
<form method="POST" action="/invoice/${inv.id}/pay"><label>Amount $ <input name="amount" size="8"></label> <button type="submit">Pay</button></form>` : ''}`) };
}

function handlePay(ctx, id) {
  if (!ctx.user) return { status: 302, headers: { Location: '/login' }, body: '' };
  attempt('Billing & Invoices');
  const inv = invoices.find(x => x.id === id);
  if (!inv) return { status: 404, body: layout(ctx, 'Not found', '<p>No such invoice.</p>') };
  const amount = parseFloat(ctx.body.amount);
  if (isNaN(amount)) return { status: 400, body: layout(ctx, 'Pay', '<p>Amount must be a number.</p>') };
  // VULNERABLE: any amount settles the invoice; negative amounts credit the payer.
  if (amount <= 0) { pass('bill-pay-negative'); ctx.user.balance += (-amount); }
  else if (amount < inv.amount && inv.status !== 'paid') pass('bill-pay-dollar');
  inv.status = 'paid';
  return { status: 200, body: layout(ctx, 'Paid', `<p>Payment of $${amount.toFixed(2)} accepted. Invoice #${inv.id} is now <b>PAID IN FULL</b>.</p><p>Your balance: $${Number(ctx.user.balance).toFixed(2)}</p>`) };
}

function connectionsPage(ctx) {
  if (!ctx.user) return { status: 302, headers: { Location: '/login' }, body: '' };
  const mine = connections.filter(c => c.ownerId === ctx.user.id);
  return { status: 200, body: layout(ctx, 'Connections', `<h2>Your service connections</h2>` +
    mine.map(c => `<div class="card"><a href="/connection/${c.id}">Request #${c.id}</a> — ${esc(c.kind)} — ${esc(c.status)}</div>`).join('')) };
}

function connectionPage(ctx, id) {
  if (!ctx.user) return { status: 302, headers: { Location: '/login' }, body: '' };
  attempt('Connections & Support');
  const c = connections.find(x => x.id === id);
  if (!c) return { status: 404, body: layout(ctx, 'Not found', '<p>No such request.</p>') };
  if (c.ownerId !== ctx.user.id && ctx.user.role !== 'admin') pass('conn-idor'); // VULNERABLE: served anyway
  return { status: 200, body: layout(ctx, 'Connection #' + c.id, `<h2>Connection request #${c.id}</h2>
<p>Type: ${esc(c.kind)}</p><p>Address: ${esc(c.address)}</p><p>Applicant account #${c.ownerId}</p>
<p>Connection fee: $${c.fee}</p><p>Status: <b>${esc(c.status)}</b></p>`) };
}

function ticketsPage(ctx) {
  if (!ctx.user) return { status: 302, headers: { Location: '/login' }, body: '' };
  const mine = tickets.filter(t => t.ownerId === ctx.user.id);
  return { status: 200, body: layout(ctx, 'Support', `<h2>Your support tickets</h2>` +
    mine.map(t => `<div class="card"><a href="/ticket/${t.id}">Ticket #${t.id}</a> — ${esc(t.subject)} — ${esc(t.status)}</div>`).join('')) };
}

function ticketPage(ctx, id) {
  if (!ctx.user) return { status: 302, headers: { Location: '/login' }, body: '' };
  attempt('Connections & Support');
  const t = tickets.find(x => x.id === id);
  if (!t) return { status: 404, body: layout(ctx, 'Not found', '<p>No such ticket.</p>') };
  return { status: 200, body: layout(ctx, 'Ticket #' + t.id, `<h2>Ticket #${t.id}</h2>
<p>Subject: ${esc(t.subject)}</p><p>Opened by account #${t.ownerId}</p><p>Status: <b>${esc(t.status)}</b></p>
${t.status === 'open' ? `<form method="POST" action="/ticket/${t.id}/close"><button type="submit">Close ticket</button></form>` : ''}`) };
}

function handleTicketClose(ctx, id) {
  if (!ctx.user) return { status: 302, headers: { Location: '/login' }, body: '' };
  attempt('Connections & Support');
  const t = tickets.find(x => x.id === id);
  if (!t) return { status: 404, body: layout(ctx, 'Not found', '<p>No such ticket.</p>') };
  if (t.ownerId !== ctx.user.id && ctx.user.role !== 'admin') pass('ticket-close-other'); // VULNERABLE: closed anyway
  t.status = 'closed';
  return { status: 302, headers: { Location: '/tickets' }, body: '' };
}

function staffPage(ctx) {
  if (!ctx.user) return { status: 302, headers: { Location: '/login' }, body: '' };
  attempt('Login & Authentication');
  const cookieRole = ctx.cookies.hx_role || '';
  // VULNERABLE: trusts the client-supplied role cookie.
  if (cookieRole !== 'meterreader' && cookieRole !== 'admin') {
    return { status: 403, body: layout(ctx, 'Staff', '<p>Staff only. Your role cookie does not grant access.</p>') };
  }
  if (ctx.user.role !== 'meterreader' && ctx.user.role !== 'admin') pass('auth-cookie');
  return { status: 200, body: layout(ctx, 'Staff console', `<h2>Meter Reader Console</h2>
<p>All meters on the network:</p>` +
    meters.map(m => `<p>${esc(m.meterNo)} — ${esc(m.address)} — last reading ${m.lastReading} kWh</p>`).join('')) };
}

function adminPage(ctx) {
  if (!ctx.user) return { status: 302, headers: { Location: '/login' }, body: '' };
  attempt('Admin Panel');
  if (ctx.user.role !== 'admin') pass('admin-bac'); // VULNERABLE: panel served to any logged-in user
  return { status: 200, body: layout(ctx, 'Admin', `<h2>Admin Panel</h2>
<h3>All accounts</h3><table><tr><th>ID</th><th>Name</th><th>Email</th><th>Password</th><th>Role</th><th>Balance</th></tr>
${users.map(u => `<tr><td>${u.id}</td><td>${u.name}</td><td>${esc(u.email)}</td><td>${esc(u.password)}</td><td>${esc(u.role)}</td><td>$${Number(u.balance).toFixed(2)}</td></tr>`).join('')}
</table>
<h3>Update tariff rate</h3>
<form method="POST" action="/admin/tariff/update"><label>Tariff ID <input name="id" size="4"></label> <label>New rate <input name="rate" size="6"></label> <button type="submit">Update rate</button></form>
<p>Current rates: ${tariffs.map(t => `${esc(t.name)}: $${t.rate}`).join(' · ')}</p>`) };
}

function handleAdminTariff(ctx) {
  if (!ctx.user) return { status: 302, headers: { Location: '/login' }, body: '' };
  attempt('Admin Panel');
  const t = tariffById(parseInt(ctx.body.id, 10));
  if (!t) return { status: 404, body: layout(ctx, 'Not found', '<p>No such tariff.</p>') };
  if (!ctx.cookies.hx_origin) pass('admin-csrf'); // state change without the app's origin marker
  t.rate = parseFloat(ctx.body.rate) || t.rate;
  return { status: 302, headers: { Location: '/admin' }, body: '' };
}

function apiDebug(ctx) {
  attempt('Platform & API');
  pass('api-debug');
  return { status: 200, type: 'application/json', body: JSON.stringify({ users, meters, invoices, tariffs }, null, 2) };
}

function apiInvoices(ctx) {
  attempt('Platform & API');
  const key = ctx.headers['x-api-key'] || '';
  let email = '';
  try { email = Buffer.from(String(key), 'base64').toString('utf8'); } catch (e) {}
  const u = users.find(x => x.email === email);
  if (!u) return { status: 401, type: 'application/json', body: JSON.stringify({ error: 'invalid api key' }) };
  if (!ctx.user) pass('api-token'); // VULNERABLE: base64(email) accepted as a credential, no session
  return { status: 200, type: 'application/json', body: JSON.stringify({ account: u.email, invoices: invoices.filter(i => i.ownerId === u.id) }, null, 2) };
}

/* ------------------------- lab system pages ----------------------- */
function testsPage(ctx) {
  let html = `<h2>🎯 Mission Board — LAB ${LAB_NUMBER} ${LAB_NAME}</h2>
<p>${doneCount()}/${TESTS.length} tests complete · ${pct()}%. Tests flip to done only when the exploit really works — there are no "mark done" buttons.</p>`;
  for (const f of FEATURES) {
    const list = TESTS.filter(t => t.feature === f);
    const fd = list.filter(t => state.tests[t.id]).length;
    html += `<h3>${esc(f)} — ${fd}/${list.length} · attempts on this feature: ${state.attempts[f] || 0}</h3>`;
    for (const t of list) {
      const done = !!state.tests[t.id];
      html += `<div class="card"><span class="${done ? 'done' : 'open'}">${done ? '✓' : '○'}</span> <b>${esc(t.name)}</b>
 <small>${esc(t.owasp)} · ${esc(t.difficulty)} · ${esc(t.where)}</small>
 <details><summary>Hints</summary><ol>${t.hints.map(h => `<li>${esc(h)}</li>`).join('')}</ol></details></div>`;
    }
  }
  return { status: 200, body: layout(ctx, 'Mission Board', html) };
}

function completePage(ctx) {
  if (!isComplete()) {
    const left = TESTS.filter(t => !state.tests[t.id]);
    return { status: 200, body: layout(ctx, 'Completion', `<h2>Not complete yet</h2>
<p>Progress: ${doneCount()}/${TESTS.length} (${pct()}%). Still open:</p>
${left.map(t => `<p>○ ${esc(t.name)} <small>(${esc(t.feature)})</small></p>`).join('')}
<p>Finish every test on the <a href="/tests">Mission Board</a> to unlock the summary, your completion key and your certificate.</p>`) };
  }
  const key = _assemble(_fragB);
  const perFeature = FEATURES.map(f => {
    const list = TESTS.filter(t => t.feature === f);
    return `<p><b>${esc(f)}</b> — ${list.length} vulnerabilities</p>`;
  }).join('');
  const techniques = TESTS.map(t => `<p>✓ ${esc(t.name)} <small>(${esc(t.owasp)})</small></p>`).join('');
  const learned = TESTS.map(t => `<p><b>${esc(t.name)}:</b> ${esc(t.lesson)}</p>`).join('');
  const client = TESTS.map(t => `<p><b>${esc(t.name)}:</b> ${esc(t.impact)}</p>`).join('');
  const reports = TESTS.map(t => `<p><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)}<br>Remediation: ${esc(t.report.remediation)}</p>`).join('');
  return { status: 200, body: layout(ctx, 'Lab complete', `<h2>🏁 LAB ${LAB_NUMBER} — ${LAB_NAME}: COMPLETE</h2>
<h3>1) Features in this lab</h3><p>${FEATURES.length} features, ${TESTS.length} security tests in total.</p>
<h3>2) Vulnerabilities per feature</h3>${perFeature}
<h3>3) How testing was done — ${TESTS.length} techniques</h3>${techniques}
<h3>4) What you learned</h3>${learned}
<h3>5) What this means for a real client</h3>${client}
<h3>6) Writing it in a real report</h3>${reports}
<div class="card"><h3>🔑 Your completion key for Lab ${LAB_NUMBER + 1}</h3>
<p><code style="font-size:1.15em">${esc(key)}</code></p>
<p>Paste this key into Lab ${LAB_NUMBER + 1} to unlock it. Keep it safe — it is your proof of completion.</p>
<form method="POST" action="/complete/name"><label>Your name for the certificate <input name="testerName" size="30" value="${esc(state.testerName || '')}"></label> <button type="submit">Save name</button></form>
<p><a href="/certificate">🎓 View your certificate</a></p></div>`) };
}

function handleName(ctx) {
  state.testerName = String(ctx.body.testerName || '').slice(0, 60);
  saveState();
  return { status: 302, headers: { Location: '/complete' }, body: '' };
}

function certificatePage(ctx) {
  if (!isComplete()) return { status: 302, headers: { Location: '/complete' }, body: '' };
  const name = state.testerName || (ctx.user ? ctx.user.name : 'HexaEnergy Tester');
  const date = state.completedAt ? new Date(state.completedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const body = `<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER}</title>
<style>body{font-family:Georgia,serif;background:#f4f1ea;margin:0;padding:2rem}.cert{max-width:720px;margin:2rem auto;background:#fff;border:3px double #8b46c7;border-radius:14px;padding:2.5rem;text-align:center}h1{margin:.4rem 0}.sub{color:#555}@media print{body{background:#fff}.cert{border:2px solid #333}}</style></head>
<body><div class="cert">
<img src="/logo.png" alt="HexaCyberLab" style="height:64px">
<h1>Certificate of Completion</h1>
<p class="sub">This certifies that</p>
<h2>${esc(name)}</h2>
<p>has completed 100% of the security tests in <b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b><br>(${TESTS.length} tests across ${FEATURES.length} features)</p>
<p class="sub">Completed on ${esc(date)}</p>
<p><b>HexaCyberLab — Built by Md. Jony Hassain, Founder</b></p>
</div></body></html>`;
  return { status: 200, body };
}

/* ---------------------------- Lab Coach --------------------------- */
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
function findFeature(msg) {
  const m = msg.toLowerCase();
  // specific phrases first, so e.g. "saved searches" style overlaps resolve correctly
  const keys = [
    ['login', 'Login & Authentication'], ['sign in', 'Login & Authentication'], ['auth', 'Login & Authentication'], ['password', 'Login & Authentication'], ['reset token', 'Login & Authentication'],
    ['register', 'Registration & Profile'], ['registration', 'Registration & Profile'], ['profile', 'Registration & Profile'], ['sign up', 'Registration & Profile'],
    ['meter', 'Meters & Readings'], ['reading', 'Meters & Readings'], ['tariff', 'Meters & Readings'],
    ['search', 'Search & Catalogue'], ['catalogue', 'Search & Catalogue'], ['catalog', 'Search & Catalogue'],
    ['invoice', 'Billing & Invoices'], ['billing', 'Billing & Invoices'], ['bill', 'Billing & Invoices'], ['pay', 'Billing & Invoices'],
    ['connection', 'Connections & Support'], ['ticket', 'Connections & Support'], ['support', 'Connections & Support'],
    ['admin', 'Admin Panel'],
    ['api', 'Platform & API'], ['debug', 'Platform & API'], ['platform', 'Platform & API']
  ];
  for (const [k, f] of keys) if (m.includes(k)) return f;
  for (const f of FEATURES) if (m.includes(f.toLowerCase())) return f;
  return null;
}
function handleChat(ctx) {
  let msg = '';
  try { msg = String((ctx.json && ctx.json.message) || ctx.body.message || ''); } catch (e) { msg = ''; }
  const m = msg.toLowerCase();
  let reply;
  if (/who (built|made|created)|founder|who is (the )?(author|creator)/.test(m)) {
    reply = ATTRIBUTION;
  } else if (/(key|unlock|next lab)/.test(m) && /(give|what|share|tell|show|get)/.test(m)) {
    if (isComplete() && state.keyRevealed) {
      reply = 'You completed LAB ' + LAB_NUMBER + ' — well earned. Your completion key for Lab ' + (LAB_NUMBER + 1) + ' is: ' + _assemble(_fragB);
    } else {
      reply = 'I don\'t have the completion key yet — I only receive it when this lab is completed 100%. You are at ' + pct() + '% (' + doneCount() + '/' + TESTS.length + '). Finish every test on the Mission Board (/tests) and the key is yours.';
    }
  } else {
    const feature = findFeature(m);
    if (feature && /(how|help|solve|do|guide|hint|stuck|exploit|test)/.test(m)) {
      const list = TESTS.filter(t => t.feature === feature);
      const open = list.filter(t => !state.tests[t.id]);
      const att = state.attempts[feature] || 0;
      if (open.length === 0) {
        reply = 'You have already completed every test in ' + feature + ' (' + list.length + '/' + list.length + '). Pick another feature from the Mission Board (/tests) and I can help once you have tried it.';
      } else if (att >= 3) {
        reply = 'Step by step for ' + feature + ' — you have ' + att + ' attempt(s) logged, so guidance is unlocked:\n' +
          open.map(t => '• ' + t.name + ': ' + t.hints[2] + ' ' + t.lesson).join('\n');
      } else {
        reply = 'That feature is locked for help. First try the ' + feature + ' tests yourself at least 3 times — I can see you\'ve tried ' + att + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
      }
    } else if (feature) {
      const list = TESTS.filter(t => t.feature === feature);
      const fd = list.filter(t => state.tests[t.id]).length;
      reply = feature + ' has ' + list.length + ' tests (' + fd + ' done): ' + list.map(t => t.name).join('; ') + '. Ask me "how do I solve the ' + feature + ' tests" once you have tried them at least 3 times.';
    } else if (/(how many|features|tests|progress|status|next)/.test(m)) {
      const next = TESTS.find(t => !state.tests[t.id]);
      reply = 'LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ' has ' + FEATURES.length + ' features and ' + TESTS.length + ' tests: ' + FEATURES.join(', ') + '. Your progress: ' + doneCount() + '/' + TESTS.length + ' (' + pct() + '%).' +
        (next ? ' Next open test: "' + next.name + '" in ' + next.feature + ' — see /tests for its hints.' : ' Everything is complete — see /complete for your key and certificate.');
    } else if (/(hi|hello|hey|help|start)/.test(m)) {
      reply = 'Hello! I am the Lab Coach for LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '. There are ' + TESTS.length + ' tests across ' + FEATURES.length + ' features. Work them from the Mission Board (/tests); each test has 3 hints. Ask me about a feature\'s tests, and after you have genuinely tried a feature 3 times I will guide you step by step.';
    } else {
      reply = 'I can help with the tests in this lab: ask me how many tests a feature has, or — after at least 3 real attempts on a feature — ask "how do I solve" it and I will guide you step by step. Your progress is on /tests. Current progress: ' + doneCount() + '/' + TESTS.length + ' (' + pct() + '%).';
    }
  }
  return { status: 200, type: 'application/json', body: JSON.stringify({ reply }) };
}

/* --------------------------- unlock ------------------------------- */
function handleUnlock(ctx) {
  const given = String((ctx.json && ctx.json.key) || ctx.body.key || '');
  const expected = _assemble(_fragA);
  // constant-work exact compare, no partial hints
  let diff = given.length ^ expected.length;
  for (let i = 0; i < Math.max(given.length, expected.length); i++) {
    diff |= (given.charCodeAt(i) || 0) ^ (expected.charCodeAt(i) || 0);
  }
  if (diff === 0 && given.length > 0) {
    state.unlocked = true; saveState();
    return { status: 302, headers: { Location: '/' }, body: '' };
  }
  return { status: 403, body: layout(ctx, 'Locked', `<h2>🔒 Locked — LAB ${LAB_NUMBER} ${LAB_NAME}</h2><p style="color:#b00">That key was not accepted.</p>
<form method="POST" action="/unlock"><input name="key" size="42" placeholder="Completion key from Lab ${LAB_NUMBER - 1}"><button type="submit">Unlock</button></form>`) };
}

function apiProgress(ctx) {
  const features = {};
  for (const f of FEATURES) {
    const list = TESTS.filter(t => t.feature === f);
    features[f] = { total: list.length, done: list.filter(t => state.tests[t.id]).length, attempts: state.attempts[f] || 0 };
  }
  return { status: 200, type: 'application/json', body: JSON.stringify({ lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done: doneCount(), pct: pct(), features, complete: isComplete() }, null, 2) };
}

/* ------------------------- docs generation ------------------------ */
function genDocs() {
  const byFeature = f => TESTS.filter(t => t.feature === f);
  let vuln = `# HexaEnergy (LAB ${LAB_NUMBER}) — Vulnerability Map\n\nEvery scored test in the lab, grouped by feature. This is the complete map of what the lab teaches testers to find.\n`;
  for (const f of FEATURES) {
    vuln += `\n## ${f}\n`;
    for (const t of byFeature(f)) {
      vuln += `\n### ${t.name}\n- **OWASP:** ${t.owasp}\n- **Difficulty:** ${t.difficulty}\n- **Location:** ${t.where}\n- **How it is exploited:** ${t.hints[2]}\n- **Impact:** ${t.impact}\n`;
    }
  }
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'), vuln);

  const order = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  let guide = `# HexaEnergy (LAB ${LAB_NUMBER}) — Practice Guide\n\nChallenges grouped by feature, then difficulty. Each challenge is complete when its test flips to done on the Mission Board (\`/tests\`). Every challenge has 3 graded hints.\n`;
  for (const f of FEATURES) {
    guide += `\n## ${f}\n`;
    for (const t of byFeature(f).slice().sort((a, b) => order[a.difficulty] - order[b.difficulty])) {
      guide += `\n### [${t.difficulty}] ${t.name}\n- **Objective:** Make the "${t.name}" test show ✓ on /tests by performing the real exploit (${t.where}).\n- **Hint 1:** ${t.hints[0]}\n- **Hint 2:** ${t.hints[1]}\n- **Hint 3:** ${t.hints[2]}\n`;
    }
  }
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'), guide);

  let fix = `# HexaEnergy (LAB ${LAB_NUMBER}) — Fix & Retest\n\nFor every test: the secure implementation, then the regression retest that must FAIL the exploit after the fix.\n`;
  for (const f of FEATURES) {
    fix += `\n## ${f}\n`;
    for (const t of byFeature(f)) {
      fix += `\n### ${t.report.title} (${t.report.severity})\n- **Secure implementation:** ${t.report.remediation}\n- **Regression test:** Replay the original exploit for "${t.name}" (${t.where}). After the fix it must no longer succeed — the test condition (the real effect) must be impossible — while legitimate use of the feature keeps working.\n`;
    }
  }
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'), fix);
  console.log('Docs generated from TESTS registry (' + TESTS.length + ' tests).');
}

/* ------------------------------ router ---------------------------- */
function parseBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const out = { raw: data, body: {}, json: null };
      const ct = (req.headers['content-type'] || '');
      if (ct.includes('application/json')) {
        try { out.json = JSON.parse(data); out.body = out.json || {}; } catch (e) { out.json = null; out.body = {}; }
      } else {
        try { for (const [k, v] of new URLSearchParams(data)) out.body[k] = v; } catch (e) {}
      }
      resolve(out);
    });
    req.on('error', () => resolve({ raw: '', body: {}, json: null }));
  });
}

async function route(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1');
  const p = url.pathname;
  const parsed = (req.method === 'POST') ? await parseBody(req) : { body: {}, json: null };
  const cookies = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k) cookies[k] = rest.join('=');
  }
  const sid = cookies.hx_session;
  const userId = sid ? sessions.get(sid) : undefined;
  const user = userId !== undefined ? userById(userId) : null;
  const ctx = {
    user, cookies, body: parsed.body, json: parsed.json,
    query: Object.fromEntries(url.searchParams), headers: req.headers,
    setCookies: []
  };
  // benign origin marker set on the app's own pages (CSRF tests detect its absence)
  if (req.method === 'GET' && !cookies.hx_origin) ctx.setCookies.push('hx_origin=1; Path=/');

  let out;
  try {
    if (p === '/logo.png') {
      const data = fs.readFileSync(LOGO_FILE);
      res.writeHead(200, { 'Content-Type': 'image/png' });
      return res.end(data);
    }
    if (p === '/unlock' && req.method === 'POST') out = handleUnlock(ctx);
    else if (p === '/api/progress') out = apiProgress(ctx);
    else if (p === '/api/chat' && req.method === 'POST') out = handleChat(ctx);
    else if (!state.unlocked) out = { status: 200, body: gatePage(ctx) };
    else if (p === '/' && req.method === 'GET') out = homePage(ctx);
    else if (p === '/login' && req.method === 'GET') out = loginPage(ctx);
    else if (p === '/login' && req.method === 'POST') out = handleLogin(ctx);
    else if (p === '/register' && req.method === 'GET') out = registerPage(ctx);
    else if (p === '/register' && req.method === 'POST') out = handleRegister(ctx);
    else if (p === '/forgot' && req.method === 'GET') out = forgotPage(ctx);
    else if (p === '/forgot' && req.method === 'POST') out = handleForgot(ctx);
    else if (p === '/reset' && req.method === 'POST') out = handleReset(ctx);
    else if (p === '/logout' && req.method === 'POST') {
      if (sid) sessions.delete(sid);
      ctx.setCookies.push('hx_session=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0');
      out = { status: 302, headers: { Location: '/' }, body: '' };
    }
    else if (p === '/profile' && req.method === 'GET') out = profilePage(ctx);
    else if (p === '/profile' && req.method === 'POST') out = handleProfile(ctx);
    else if (p === '/meters') out = metersPage(ctx);
    else if (p === '/tariffs') out = tariffsPage(ctx);
    else if (p === '/search') out = searchPage(ctx);
    else if (p === '/invoices') out = invoicesPage(ctx);
    else if (p === '/connections') out = connectionsPage(ctx);
    else if (p === '/tickets') out = ticketsPage(ctx);
    else if (p === '/staff') out = staffPage(ctx);
    else if (p === '/admin' && req.method === 'GET') out = adminPage(ctx);
    else if (p === '/admin/tariff/update' && req.method === 'POST') out = handleAdminTariff(ctx);
    else if (p === '/api/debug') out = apiDebug(ctx);
    else if (p === '/api/invoices') out = apiInvoices(ctx);
    else if (p === '/tests') out = testsPage(ctx);
    else if (p === '/complete' && req.method === 'GET') out = completePage(ctx);
    else if (p === '/complete/name' && req.method === 'POST') out = handleName(ctx);
    else if (p === '/certificate') out = certificatePage(ctx);
    else {
      let m;
      if ((m = p.match(/^\/meter\/(\d+)$/))) out = meterPage(ctx, parseInt(m[1], 10));
      else if ((m = p.match(/^\/meter\/(\d+)\/reading$/)) && req.method === 'POST') out = handleReading(ctx, parseInt(m[1], 10));
      else if ((m = p.match(/^\/meter\/(\d+)\/tariff$/)) && req.method === 'POST') out = handleTariffSwitch(ctx, parseInt(m[1], 10));
      else if ((m = p.match(/^\/tariff\/(\d+)$/))) out = tariffPage(ctx, parseInt(m[1], 10));
      else if ((m = p.match(/^\/invoice\/(\d+)$/))) out = invoicePage(ctx, parseInt(m[1], 10));
      else if ((m = p.match(/^\/invoice\/(\d+)\/pay$/)) && req.method === 'POST') out = handlePay(ctx, parseInt(m[1], 10));
      else if ((m = p.match(/^\/connection\/(\d+)$/))) out = connectionPage(ctx, parseInt(m[1], 10));
      else if ((m = p.match(/^\/ticket\/(\d+)$/))) out = ticketPage(ctx, parseInt(m[1], 10));
      else if ((m = p.match(/^\/ticket\/(\d+)\/close$/)) && req.method === 'POST') out = handleTicketClose(ctx, parseInt(m[1], 10));
      else out = { status: 404, body: layout(ctx, 'Not found', '<h2>404 — Not found</h2>') };
    }
  } catch (e) {
    out = { status: 500, body: layout(ctx, 'Error', '<h2>Something went wrong</h2><p>The server stayed up. Try again.</p>') };
  }
  const headers = Object.assign({ 'Content-Type': (out.type || 'text/html') + '; charset=utf-8' }, out.headers || {});
  if (ctx.setCookies.length) headers['Set-Cookie'] = ctx.setCookies;
  res.writeHead(out.status || 200, headers);
  res.end(out.body || '');
}

if (process.argv.includes('--gen-docs')) {
  genDocs();
  process.exit(0);
}

const server = http.createServer((req, res) => { route(req, res).catch(() => { try { res.writeHead(500); res.end('error'); } catch (e) {} }); });
server.listen(PORT, HOST, () => {
  console.log('HexaEnergy (LAB ' + LAB_NUMBER + ') listening on http://' + HOST + ':' + PORT + ' — LOCAL TRAINING LAB ONLY');
});
