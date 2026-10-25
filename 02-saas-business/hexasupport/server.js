'use strict';
/* HexaSupport — LAB 18 of 110 · Category 2: SaaS & Business Platforms
   A complete customer-support SaaS (tickets, SLA timers, agents, supervisor,
   internal notes, canned responses, assignment) that is DELIBERATELY VULNERABLE
   for local penetration-testing practice. Zero dependencies. Binds 127.0.0.1 only.
   NEVER deploy publicly. */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3027;
const LAB_NUMBER = 18;
const LAB_NAME = 'HexaSupport';
const PREV_LAB = 'Lab 17';
const ROOT = __dirname;
const UPLOAD_DIR = path.join(ROOT, 'uploads');
const PROGRESS_FILE = path.join(ROOT, 'progress.json');
try { fs.mkdirSync(UPLOAD_DIR, { recursive: true }); } catch (e) {}

/* ---- key shards, region 1 of 4 (transformed fragments only — never the key) ---- */

const _cA = ["TC1YSA==","VS05MQ==","VFc0Qw=="];

/* ================= progress engine ================= */
let progress = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadProgress() {
  try { const p = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); if (p && typeof p === 'object') progress = Object.assign(progress, p); } catch (e) {}
}
function saveProgress() { try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 1)); } catch (e) {} }
loadProgress();
function pass(id) {
  if (!progress.tests[id]) {
    progress.tests[id] = true;
    if (typeof TESTS !== 'undefined' && TESTS.every(t => progress.tests[t.id])) {
      if (!progress.completedAt) progress.completedAt = new Date().toISOString();
      progress.keyRevealed = true;
    }
    saveProgress();
  }
}
function attempt(feature) { progress.attempts[feature] = (progress.attempts[feature] || 0) + 1; saveProgress(); }
function progressSummary() {
  const total = TESTS.length;
  const done = TESTS.filter(t => progress.tests[t.id]).length;
  const features = {};
  for (const f of FEATURES) {
    const ts = TESTS.filter(t => t.feature === f);
    features[f] = { total: ts.length, done: ts.filter(t => progress.tests[t.id]).length, attempts: progress.attempts[f] || 0 };
  }
  return { lab: LAB_NAME, number: LAB_NUMBER, total, done, pct: total ? Math.floor(done / total * 100) : 0, features, complete: done === total };
}

/* ================= helpers ================= */
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
const XSS_RE = /<\s*script|on\w+\s*=|<\s*svg|<\s*iframe|<\s*img[^>]*onerror|javascript\s*:/i;
const INJ_RE = /'\s*OR\s+('?\d+'?\s*=\s*'?\d+|TRUE)|'\s*OR\s+'[^']*'\s*=\s*'|'\s*--|\bUNION\s+SELECT\b/i;
function parseBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 2e6) req.destroy(); });
    req.on('end', () => {
      const out = {};
      try {
        if ((req.headers['content-type'] || '').includes('application/json')) { const j = JSON.parse(data || '{}'); for (const k in j) out[k] = j[k]; }
        else { const p = new URLSearchParams(data); for (const [k, v] of p) out[k] = v; }
      } catch (e) {}
      resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(part => { const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); });
  return out;
}

/* ================= seed data (in-memory; restart reseeds) ================= */
let _uid = 0, _tid = 0, _cid = 0, _rid = 0;
const users = [
  { id: ++_uid, name: 'Sara Lindqvist', email: 'sup@hexasupport.local', password: 'Super@123', role: 'supervisor' },
  { id: ++_uid, name: 'Alex Meyer', email: 'agent@hexasupport.local', password: 'Agent@123', role: 'agent' },
  { id: ++_uid, name: 'Ravi Patel', email: 'ravi@hexasupport.local', password: 'Ravi@123', role: 'agent' },
  { id: ++_uid, name: 'Default Support', email: 'support@hexasupport.local', password: 'support123', role: 'agent' }, // VULN: vendor default credentials still active
  { id: ++_uid, name: 'Nadia Rahman', email: 'nadia@hexasupport.local', password: 'User@123', role: 'customer' },
  { id: ++_uid, name: 'Omar Farouk', email: 'omar@hexasupport.local', password: 'User@123', role: 'customer' }
];
const SLA_HOURS = { Critical: 4, High: 8, Medium: 24, Low: 72 };
let slaHours = Object.assign({}, SLA_HOURS);
function slaDueFor(priority, from) { return new Date((from || Date.now()) + (slaHours[priority] || 24) * 3600 * 1000); }
const tickets = [];
function seedTicket(ownerId, subject, body, priority, status, assigneeId, ageH) {
  const created = Date.now() - ageH * 3600 * 1000;
  const t = { id: ++_tid, ownerId, subject, body, priority, status, assigneeId, createdAt: created, slaDue: slaDueFor(priority, created).toISOString(), replies: [], attachments: [] };
  tickets.push(t); return t;
}
const T1 = seedTicket(5, 'Cannot access the billing page', 'Since yesterday the billing page shows a blank screen after I log in. This is urgent, our finance team needs invoices.', 'High', 'Open', 2, 5);
T1.replies.push({ id: ++_rid, by: 5, roleShown: 'customer', body: 'Any update? Finance is blocked.', internal: false, at: new Date(Date.now() - 4 * 3600 * 1000).toISOString() });
T1.replies.push({ id: ++_rid, by: 2, roleShown: 'agent', body: 'INTERNAL: Nadia\'s card on file has expired and her plan is flagged retention-risk. Do NOT mention the expiry to her yet — let support sort the billing bug first.', internal: true, at: new Date(Date.now() - 3 * 3600 * 1000).toISOString() });
const T2 = seedTicket(6, 'App crashes on login (Android)', 'The mobile app closes immediately after I enter my password. Pixel 8, latest version.', 'Medium', 'Open', null, 2);
const T3 = seedTicket(5, 'Refund for duplicate charge', 'I was charged twice for the March subscription. Please refund one of the charges.', 'Low', 'Pending', 3, 30);
const T4 = seedTicket(6, 'Full data export for compliance audit', 'Our auditors need a complete export of our account data this week.', 'Critical', 'Open', 3, 1);
const canned = [
  { id: ++_cid, ownerId: 1, title: 'Refund policy reply', body: 'Thank you for contacting us. Per our policy, duplicate charges are refunded within 5 business days.' },
  { id: ++_cid, ownerId: 2, title: 'Password reset steps', body: 'Please use the "Forgot password" link on the sign-in page and follow the email instructions.' },
  { id: ++_cid, ownerId: 1, title: 'Greeting — standard hello', body: 'Hello and thank you for reaching out to HexaSupport. An agent will be with you shortly.' }
];
const sessions = new Map(); // sid -> userId
const ipState = new Map();  // ip -> { known:bool, unknown:bool, forgot:Set, fails:{email:n} }
function stateFor(ip) { if (!ipState.has(ip)) ipState.set(ip, { known: false, unknown: false, forgot: new Set(), fails: {} }); return ipState.get(ip); }

/* ---- key shards, region 2 of 4 ---- */


/* ================= TESTS registry ================= */
const FEATURES = ['Login & Authentication', 'Registration & Profile', 'Tickets', 'Search & Canned Responses', 'Attachments', 'Admin Panel', 'API & Platform'];
const TESTS = [
{ id: 'sqli-login', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03 Injection', difficulty: 'Beginner', keys: ['sql', 'injection', 'login bypass', 'or 1=1'],
  hints: ['The login form builds its account lookup by gluing your input straight into a query string — think about what a quote character does to it.', 'A classic tautology in the email field makes the lookup match a row without knowing any password.', "Try email: ' OR '1'='1 — you should land in the first matching account (the supervisor's)."],
  lesson: 'String-built queries let an attacker rewrite the login logic itself. Parameterised queries and ORM bindings make the input data, never code.',
  impact: 'On a real support portal this is a full account takeover of the first matching account — here the supervisor — exposing every customer conversation the company holds.',
  report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries everywhere; never concatenate user input into SQL; add a WAF/regression test for tautology payloads.' },
  guide: "Step by step: 1) Log out. 2) On /login enter email ' OR '1'='1 and any password. 3) The string-built lookup matches the first row (the supervisor) and a session is created — the test flips when that bypass session is created." },
{ id: 'brute-force', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limiting or Lockout', owasp: 'A07 Auth Failures', difficulty: 'Beginner', keys: ['brute', 'rate limit', 'lockout', 'password guessing'],
  hints: ['Nothing slows down repeated login attempts — no counter, no delay, no lockout.', 'Script or repeat 10 wrong passwords for one account and watch: every attempt is processed the same as the first.', 'The test flips when the 10th failed attempt for the same account is still accepted for processing.'],
  lesson: 'Without throttling, credential stuffing and password guessing are free. Rate limits, lockouts and MFA alerts are baseline auth controls.',
  impact: 'Attackers can guess a customer or agent password at full speed; one reused password from a breach list is often all it takes to open a support account full of private conversations.',
  report: { title: 'No Rate Limiting or Account Lockout on Login', severity: 'High', remediation: 'Throttle per account and per IP, add progressive delays/lockout and alert on credential-stuffing patterns.' },
  guide: 'Step by step: 1) Pick an account, e.g. nadia@hexasupport.local. 2) Submit 10 wrong passwords in a row. 3) Notice the 10th is processed normally — no lockout, no CAPTCHA. The server marks the test at the 10th accepted failure.' },
{ id: 'user-enumeration', feature: 'Login & Authentication', name: 'User Enumeration via Login & Forgot-Password Responses', owasp: 'A07 Auth Failures', difficulty: 'Beginner', keys: ['enumerat', 'which email', 'account exists'],
  hints: ['Compare the error for an email that exists (wrong password) with one that does not exist at all.', 'The forgot-password page answers differently too — one says the reset was sent, the other says there is no such account.', 'Probe one real and one fake email across login/forgot; the differing answers confirm which accounts exist.'],
  lesson: 'Distinct error messages turn login and reset forms into an account-existence oracle — the first step of targeted phishing and credential stuffing.',
  impact: 'An attacker can harvest a verified list of the client\'s customers and staff emails, then aim password sprays and phishing precisely at them.',
  report: { title: 'Account Enumeration Through Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message for all auth failures and reset requests regardless of account existence.' },
  guide: 'Step by step: 1) Login with a real email and a wrong password — note the message. 2) Login with a made-up email — note the different message. 3) Do the same on /forgot. Once the server has seen you observe both answers, the test flips.' },
{ id: 'default-creds', feature: 'Login & Authentication', name: 'Default Vendor Credentials Still Active', owasp: 'A07 Auth Failures', difficulty: 'Beginner', keys: ['default', 'support123', 'vendor account'],
  hints: ['Every support product ships with a built-in service account. This one was never disabled.', 'The account is support@hexasupport.local — the password is the product name followed by three digits everyone guesses first.', 'Try support@hexasupport.local / support123.'],
  lesson: 'Default and vendor accounts are the oldest free pass in security. They must be disabled or forced to change on first setup.',
  impact: 'Anyone on the internet who knows the product manual walks into an agent account — reading and answering customer tickets as if they were staff.',
  report: { title: 'Default Support Account with Vendor Password Enabled', severity: 'High', remediation: 'Disable built-in accounts, force unique credentials at install, and audit for default passwords.' },
  guide: 'Step by step: 1) On /login use support@hexasupport.local with password support123. 2) You are in as an agent. The test flips on that successful login.' },
{ id: 'reset-token', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07 Auth Failures', difficulty: 'Intermediate', keys: ['reset', 'token', 'predict'],
  hints: ['Ask for a reset once and inspect the token format — it is built from things you already know about the account.', 'The token is rst-<user id>-<current minute>. User ids are sequential and minutes are public — no email access needed.', 'Compute the token for the supervisor (id 1) for the current minute and POST it straight to /reset without ever using /forgot for that account.'],
  lesson: 'Reset tokens must be long, random and single-use. Anything derived from ids and timestamps is an invitation to take over accounts, starting with admins.',
  impact: 'An attacker who can guess a reset token owns the supervisor account — and with it every ticket, every customer email and every internal note in the system.',
  report: { title: 'Password Reset Tokens Are Predictable (ID + Timestamp)', severity: 'Critical', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), expire them quickly, bind them to one use.' },
  guide: 'Step by step: 1) In a fresh browser (no /forgot visit for the target), compute token = rst-<uid>-<floor(unix time/60)>. The supervisor is uid 1. 2) POST /reset with that email, token and a new password. 3) It succeeds without any email — the server marks the test because the reset was never requested through /forgot from your address.' },
{ id: 'cookie-tamper', feature: 'Login & Authentication', name: 'Session Cookie Role Tampering', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['cookie', 'role', 'session tamper', 'base64'],
  hints: ['Your session cookie is just base64 JSON — decode it and look at what it claims about you.', 'The server trusts the role written inside the cookie instead of checking the account record.', 'Decode hx_sess, change "role" to "supervisor", re-encode, and open /admin.'],
  lesson: 'Authorization data must live server-side (or be signed). Anything the client can edit — roles, prices, ids — will be edited.',
  impact: 'A normal customer becomes supervisor by editing a cookie: full control of the helpdesk, its staff accounts and its SLA settings.',
  report: { title: 'Unsigned Session Cookie Allows Role Escalation to Supervisor', severity: 'Critical', remediation: 'Keep roles server-side in the session store, or sign session data (HMAC) and verify on every request.' },
  guide: 'Step by step: 1) Log in as a customer and copy the hx_sess cookie. 2) Base64-decode it, set role to supervisor, re-encode, replace the cookie. 3) Open /admin — the page trusts the forged role and the server records the mismatch.' },
{ id: 'weak-password', feature: 'Registration & Profile', name: 'Weak Password Policy (1-Character Passwords)', owasp: 'A07 Auth Failures', difficulty: 'Beginner', keys: ['weak password', 'policy', 'register password'],
  hints: ['The registration form accepts almost anything as a password.', 'Try creating an account with a password of one to three characters.', 'If the account is created, the policy failure is proven — the test flips at registration.'],
  lesson: 'Password policy is a control, not a courtesy. Short passwords fall to brute force in seconds, especially beside the missing rate limits here.',
  impact: 'Customers who pick "a" as a password hand attackers a trivially guessable account containing their support history and personal details.',
  report: { title: 'Registration Accepts Weak Passwords (No Minimum Policy)', severity: 'Medium', remediation: 'Enforce a minimum length (≥10) and screen against breached-password lists.' },
  guide: 'Step by step: 1) Register a new account with password "a". 2) The account is created and you are logged in. The test flips because the weak password was accepted.' },
{ id: 'mass-assignment', feature: 'Registration & Profile', name: 'Mass Assignment — Role Granted at Registration', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['mass assignment', 'role field', 'register role', 'extra field'],
  hints: ['The register and profile handlers copy every submitted field onto the user record — including fields the form never shows.', 'Add a field the form does not offer: role. The handler will not stop you.', 'POST /register with role=supervisor added (e.g. via curl or a proxy) and check what the new account can open.'],
  lesson: 'Bind only whitelisted fields. Frameworks that auto-bind request data to models hand attackers every privileged column.',
  impact: 'Anyone can self-register as supervisor of the client\'s helpdesk — no exploit tooling, just one extra form field.',
  report: { title: 'Mass Assignment Allows Privilege Escalation via Role Field', severity: 'Critical', remediation: 'Whitelist bindable fields per endpoint; never accept role/privilege fields from client input.' },
  guide: 'Step by step: 1) Intercept or craft the /register POST and add role=supervisor. 2) Submit — the new account is created with the supervisor role, copied blindly from your input. 3) The test flips when the privileged role lands.' },
{ id: 'stored-xss-profile', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03 Injection', difficulty: 'Intermediate', keys: ['stored xss', 'display name', 'profile xss'],
  hints: ['Your display name is shown to agents in the customer directory and on tickets — and it is printed without escaping.', 'Set your name to an HTML payload, e.g. a script tag or an img with onerror.', 'When an agent opens the customer list, your "name" runs in their browser. The test flips when the payload is stored.'],
  lesson: 'Stored XSS in profile fields is a staff-targeting weapon: the victim is whoever views the record — usually a privileged agent or admin.',
  impact: 'A malicious customer can run script in an agent\'s browser, stealing their session and answering or deleting tickets as that agent.',
  report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-encode all user-supplied output; sanitise stored rich text; deploy a restrictive CSP.' },
  guide: 'Step by step: 1) Go to /profile. 2) Set your display name to <script>alert(1)</script> and save. 3) The payload is stored raw and rendered unescaped in the agent customer directory — the test flips at store time.' },
{ id: 'ticket-idor', feature: 'Tickets', name: 'Ticket IDOR — Reading Another Customer\'s Ticket', owasp: 'A01 Broken Access Control', difficulty: 'Beginner', keys: ['idor', 'ticket', 'another customer', 'ticket id'],
  hints: ['Ticket URLs are simple sequential numbers — and the page never checks that the ticket belongs to you.', 'Log in as one customer and open a ticket id that belongs to someone else.', 'Nadia owns tickets 1 and 3; Omar owns 2 and 4. As Omar, open /tickets/1.'],
  lesson: 'Every object access needs an ownership/authorization check. Sequential ids plus a missing check is the classic IDOR that leaks whole support histories.',
  impact: 'Customers can read each other\'s support tickets — billing problems, addresses, audit requests — a direct privacy breach and a GDPR problem for the client.',
  report: { title: 'Insecure Direct Object Reference on Ticket View', severity: 'High', remediation: 'Authorize every object access server-side against the session user and role; use unguessable ids as defence in depth.' },
  guide: 'Step by step: 1) Log in as Omar (omar@hexasupport.local). 2) Browse to /tickets/1 — Nadia\'s ticket. 3) It opens in full. The server records serving a ticket whose owner is not you.' },
{ id: 'notes-leak', feature: 'Tickets', name: 'Internal Agent Notes Leaked to Customers', owasp: 'A01 Broken Access Control', difficulty: 'Beginner', keys: ['internal note', 'notes leak', 'private note'],
  hints: ['Agents leave internal notes on tickets that customers must never see. The customer ticket view includes them anyway.', 'Log in as Nadia and open her billing ticket — look carefully at everything on the page.', 'Ticket 1 has an internal note about her expired card and retention risk. If you can read it as Nadia, the leak is proven.'],
  lesson: 'Internal commentary is among the most sensitive data in a helpdesk — candid remarks about customers, fraud flags, legal exposure. Views must filter by audience, not by hope.',
  impact: 'Customers reading internal notes see exactly what staff say about them — expired cards, retention flags, suspicion notes — destroying trust and sometimes creating legal liability.',
  report: { title: 'Internal Notes Exposed in Customer Ticket View', severity: 'High', remediation: 'Filter internal-only content server-side per audience; never rely on hiding it in the UI.' },
  guide: 'Step by step: 1) Log in as Nadia. 2) Open ticket 1. 3) The agent\'s internal note is printed on the customer page. The server marks the test when it renders an internal note to a customer session.' },
{ id: 'reply-spoof', feature: 'Tickets', name: 'Reply Role Spoofing — Customer Posts as an Agent', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['spoof', 'author role', 'reply as agent', 'impersonat'],
  hints: ['The reply form carries a hidden author_role field — and the server believes whatever it says.', 'Intercept your reply and change author_role from customer to agent.', 'Your message then appears as an official agent response on the ticket.'],
  lesson: 'Display attributes like author role must come from the authenticated session, never from request parameters.',
  impact: 'A customer can post "official" agent replies — fake refund approvals, fake policy statements — inside real support threads, and other readers will trust them.',
  report: { title: 'Reply Author Role Taken from Client Input (Impersonation)', severity: 'High', remediation: 'Derive author identity and role exclusively from the server-side session.' },
  guide: 'Step by step: 1) As a customer, reply on your ticket but tamper the hidden author_role field to agent (proxy or curl). 2) Submit. 3) The reply is stored and displayed as an agent response — the test flips.' },
{ id: 'status-tamper', feature: 'Tickets', name: 'Ticket Status Tampering by Customer', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['status', 'close ticket', 'status tamper'],
  hints: ['The reply POST handler reads a status field — the customer form just never renders it.', 'Add status=Closed to your reply submission on your own ticket.', 'If the ticket closes, a workflow control meant for staff was driven by the customer.'],
  lesson: 'Workflow state transitions are authorization decisions. Accepting them from any role breaks SLAs, metrics and audit trails.',
  impact: 'Customers can close or reopen tickets at will — hiding unresolved issues, corrupting support metrics and voiding SLA reporting.',
  report: { title: 'Customers Can Change Ticket Status via Reply Parameter', severity: 'Medium', remediation: 'Enforce role-based state transitions server-side; ignore workflow fields from unauthorised roles.' },
  guide: 'Step by step: 1) As a customer, POST a reply to your ticket including status=Closed. 2) The ticket closes. The server marks the test when a customer-driven status change is applied.' },
{ id: 'priority-tamper', feature: 'Tickets', name: 'Priority & SLA Tampering by Customer', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['priority', 'sla', 'urgency'],
  hints: ['Same reply handler, another ignored field: priority. Changing it also recomputes the SLA deadline.', 'POST a reply with priority=Critical to jump the queue — or priority=Low on a rival\'s workflow to bury a ticket.', 'On your own Low ticket, set priority=Critical and watch the SLA due jump earlier.'],
  lesson: 'Priority drives staffing, SLA clocks and escalation. If customers set it freely, the entire triage system is fiction.',
  impact: 'Every customer marks themselves Critical: real emergencies drown, SLA reports become meaningless, and support costs climb.',
  report: { title: 'Customers Can Set Ticket Priority and Reset SLA Deadlines', severity: 'Medium', remediation: 'Restrict priority changes to staff roles; recompute SLA only on authorised transitions and log changes.' },
  guide: 'Step by step: 1) As a customer, POST a reply to your own ticket including priority=Critical. 2) The priority changes and the SLA due is recomputed. The test flips on the applied change.' },
{ id: 'outside-queue', feature: 'Tickets', name: 'Agent Acting Outside Their Queue (Reassign/Close)', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['queue', 'reassign', 'close another', 'agent scope'],
  hints: ['Agents are supposed to work their own queue. The assign and close handlers never check who a ticket belongs to.', 'Ticket 4 belongs to Ravi\'s queue. Log in as Alex and close it — or reassign it to yourself.', 'Only a supervisor should reach across queues. The handler lets any agent do it.'],
  lesson: 'Queue ownership is an authorization boundary inside the app, not a UI convention. Staff-scope checks belong on every action.',
  impact: 'A rogue or careless agent can close another agent\'s critical tickets, sabotage colleagues\' metrics, or bury a VIP case — with the audit trail pointing at the workflow, not the person.',
  report: { title: 'Agents Can Reassign and Close Tickets Outside Their Queue', severity: 'Medium', remediation: 'Check queue ownership on assign/close actions; reserve cross-queue actions for supervisors and log them.' },
  guide: 'Step by step: 1) Log in as Alex (agent@). 2) Ticket 4 is assigned to Ravi. 3) POST /tickets/4/close (or assign it to yourself). It succeeds — the server marks the test when an agent acts on a ticket owned by another agent\'s queue.' },
{ id: 'search-sqli', feature: 'Search & Canned Responses', name: 'SQL Injection in Ticket Search', owasp: 'A03 Injection', difficulty: 'Intermediate', keys: ['search sql', 'search injection'],
  hints: ['Ticket search glues your query into its lookup the same way login does.', 'A tautology in the search box makes the filter match everything — including tickets outside your scope.', "Search for ' OR '1'='1 as a customer and count results that are not yours."],
  lesson: 'Search is an injection surface like any other. A bypassed filter turns scoped search into a full data dump.',
  impact: 'A customer can dump the entire ticket base through the search box — every subject line of every customer\'s support history.',
  report: { title: 'SQL Injection in Ticket Search Bypasses Result Scoping', severity: 'High', remediation: 'Parameterise search queries; enforce result scoping in the data layer, not by filter strings.' },
  guide: "Step by step: 1) As a customer, search for ' OR '1'='1. 2) Results include tickets whose text never matched your term — the filter was bypassed. The server flips the test when an injected search returns out-of-scope rows." },
{ id: 'reflected-xss', feature: 'Search & Canned Responses', name: 'Reflected XSS in Search', owasp: 'A03 Injection', difficulty: 'Beginner', keys: ['reflected xss', 'search xss'],
  hints: ['The results page prints your search term back at the top — unescaped.', 'Put an HTML payload in the search box and view the page source.', 'Try <script>alert(1)</script> as the query.'],
  lesson: 'Reflected output must be encoded for its context. Search pages are classic XSS carriers because the input is echoed by design.',
  impact: 'A crafted search link sent to an agent executes script in their session — a stepping stone to helpdesk takeover.',
  report: { title: 'Reflected Cross-Site Scripting in Ticket Search', severity: 'Medium', remediation: 'HTML-encode reflected input; validate search terms; add CSP.' },
  guide: 'Step by step: 1) Search for <script>alert(1)</script>. 2) The term is reflected raw into the results page. The server marks the test when the payload is reflected unescaped.' },
{ id: 'canned-tamper', feature: 'Search & Canned Responses', name: 'Canned Response Tampering (Editing the Supervisor\'s Templates)', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['canned', 'template', 'edit canned'],
  hints: ['Canned responses are shared templates — some belong to the supervisor. The edit handler never checks ownership.', 'As a regular agent, open the supervisor\'s "Refund policy reply" template and change its text.', 'POST /canned/1/edit with your own wording. If it saves, every future refund reply carries your text.'],
  lesson: 'Shared content still has owners. Editing rights are an authorization decision, especially for templates that speak for the company.',
  impact: 'An agent can rewrite the official refund policy template — and every customer thereafter gets the tampered wording from "support".',
  report: { title: 'Missing Ownership Check on Canned Response Editing', severity: 'Medium', remediation: 'Authorize canned-response edits by owner or supervisor role; audit template changes.' },
  guide: 'Step by step: 1) Log in as Alex. 2) Canned response 1 belongs to the supervisor. 3) POST /canned/1/edit with new body text. It saves — the test flips.' },
{ id: 'upload-served', feature: 'Attachments', name: 'Unrestricted File Upload — HTML Served Back', owasp: 'A03 Injection', difficulty: 'Intermediate', keys: ['upload', 'html upload', 'attachment'],
  hints: ['Ticket attachments accept any filename and content — then the app serves them back from its own origin.', 'Attach a file named page.html containing a script to one of your tickets.', 'Open the served /uploads/page.html URL: it renders as HTML from the support site itself.'],
  lesson: 'Uploads must be validated, renamed, and served from a separate origin with safe content types — otherwise the app hosts attacker pages.',
  impact: 'Attackers host phishing pages and script under the client\'s real support domain, inheriting its trust — and any agent who opens the attachment is in range.',
  report: { title: 'Unrestricted Attachment Upload Allows Stored HTML/JS Hosting', severity: 'High', remediation: 'Whitelist file types, verify content, store outside web root, serve with Content-Disposition and safe types.' },
  guide: 'Step by step: 1) On your ticket, attach filename page.html with an HTML body. 2) Open /uploads/page.html. 3) It is served as text/html from the app origin — the test flips when the dangerous file is served.' },
{ id: 'traversal', feature: 'Attachments', name: 'Path Traversal in File Download', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate', keys: ['traversal', 'download', 'dot dot', 'files'],
  hints: ['The /files download endpoint joins your name parameter onto the uploads folder — without cleaning it.', 'Walk out of the folder with ../ sequences.', 'Try /files?name=../server.js and read the application source.'],
  lesson: 'Never build filesystem paths from raw input. Canonicalise, confine to the intended directory, and serve by id instead of by name.',
  impact: 'Source code, configuration and any file the server can read leak through a download link — usually the first step to a deeper compromise.',
  report: { title: 'Path Traversal in Attachment Download Exposes Server Files', severity: 'High', remediation: 'Resolve and verify the canonical path stays inside the upload directory; map downloads to stored ids.' },
  guide: 'Step by step: 1) Request /files?name=../server.js. 2) The server returns its own source code. The test flips when a path escaping the uploads folder is served.' },
{ id: 'admin-access', feature: 'Admin Panel', name: 'Supervisor Panel Open to Any Logged-In User', owasp: 'A01 Broken Access Control', difficulty: 'Beginner', keys: ['admin panel', 'broken access', 'direct url'],
  hints: ['The /admin panel checks that you are logged in — and nothing else.', 'As a plain customer, just browse to /admin.', 'The full supervisor panel, including every user\'s password, is served.'],
  lesson: 'Authentication is not authorization. Sensitive routes need explicit role checks on the server for every request.',
  impact: 'Every registered customer can open the supervisor panel and read all staff and customer credentials in plaintext.',
  report: { title: 'Missing Role Check on Supervisor Administration Panel', severity: 'Critical', remediation: 'Enforce supervisor role server-side on all admin routes; deny by default.' },
  guide: 'Step by step: 1) Log in as any customer. 2) Open /admin directly. 3) The supervisor panel renders. The test flips when a non-supervisor is served the panel.' },
{ id: 'admin-csrf', feature: 'Admin Panel', name: 'CSRF on Supervisor SLA Settings', owasp: 'A01 Broken Access Control', difficulty: 'Advanced', keys: ['csrf', 'sla settings', 'cross site'],
  hints: ['The SLA settings form has a hidden origin marker field — but the handler never verifies it.', 'Submit the SLA change from another origin, or strip the hx_origin field entirely.', 'POST /admin/sla as the supervisor with an Origin of http://evil.example and new values. If they save, CSRF is proven.'],
  lesson: 'State-changing forms need anti-CSRF tokens that are actually verified, plus SameSite cookies as defence in depth.',
  impact: 'A supervisor who visits a malicious page can silently rewrite the company\'s SLA commitments — a business-integrity attack, not just a technical one.',
  report: { title: 'Cross-Site Request Forgery on SLA Configuration', severity: 'Medium', remediation: 'Issue and verify per-session CSRF tokens on all state-changing requests; set SameSite=Lax on session cookies.' },
  guide: 'Step by step: 1) Log in as the supervisor. 2) POST /admin/sla with changed hours, an Origin header of http://evil.example, and no valid hx_origin field. 3) The change is applied — the test flips.' },
{ id: 'api-weak-token', feature: 'API & Platform', name: 'Weak API Token (Base64 of Email)', owasp: 'A07 Auth Failures', difficulty: 'Intermediate', keys: ['api', 'api key', 'token', 'base64 email'],
  hints: ['The API "key" for an account is just the account\'s email, base64-encoded — public information, encoded, not secret.', 'Compute base64 of any user\'s email and send it as the X-Api-Key header.', 'Try /api/tickets with the key derived from nadia@hexasupport.local.'],
  lesson: 'API credentials must be random secrets. Deriving them from public identifiers (emails, ids) gives every attacker a master key formula.',
  impact: 'Anyone who knows a customer\'s email — printed on every ticket — can pull their full ticket history through the API.',
  report: { title: 'API Keys Are Predictable (Base64-Encoded Email Addresses)', severity: 'High', remediation: 'Issue random, high-entropy API keys; store hashed; allow revocation and rotation.' },
  guide: 'Step by step: 1) Compute base64("nadia@hexasupport.local"). 2) GET /api/tickets with header X-Api-Key set to that value, no login cookie. 3) Her tickets are returned — the test flips on token-authenticated access.' },
{ id: 'data-exposure', feature: 'API & Platform', name: 'Unauthenticated Customer Data Exposure Endpoint', owasp: 'A01 Broken Access Control', difficulty: 'Beginner', keys: ['exposure', 'api customers', 'data dump', 'export'],
  hints: ['One API route was left open for "internal" use and never protected.', 'GET /api/customers needs no login and no key at all.', 'The response includes every user — with their plaintext password.'],
  lesson: 'Debug and internal endpoints ship to production constantly. If it responds, it is public — authenticate and minimise everything.',
  impact: 'The entire customer and staff credential list is one anonymous request away — instant full compromise of the helpdesk.',
  report: { title: 'Unauthenticated Endpoint Exposes All Users and Passwords', severity: 'Critical', remediation: 'Require authentication and authorization on every API route; never return password material.' },
  guide: 'Step by step: 1) In a fresh browser with no cookies, open /api/customers. 2) Full user JSON, passwords included, is returned. The test flips on the fetch.' },
{ id: 'security-headers', feature: 'API & Platform', name: 'Missing Security Headers', owasp: 'A05 Misconfiguration', difficulty: 'Beginner', keys: ['headers', 'csp', 'clickjack', 'security headers'],
  hints: ['Inspect any page response: there is no Content-Security-Policy, no X-Frame-Options, no X-Content-Type-Options.', 'The app can be framed by any site (clickjacking) and browsers will MIME-sniff its responses.', 'Simply load any page and check the response headers — their absence is the finding. The test flips when a page is served without them.'],
  lesson: 'Security headers are cheap, layered defence: CSP blunts XSS, frame-ancestors stops clickjacking, nosniff stops type confusion.',
  impact: 'The support portal can be embedded in an attacker\'s page for clickjacking, tricking staff into clicking disguised actions.',
  report: { title: 'Missing HTTP Security Headers (CSP, Frame Protection, Nosniff)', severity: 'Low', remediation: 'Add Content-Security-Policy, X-Frame-Options/frame-ancestors, X-Content-Type-Options and Referrer-Policy.' },
  guide: 'Step by step: 1) Load any page of the lab. 2) The response is served with no CSP, frame or nosniff headers. The server marks the test on that first unprotected response.' }
];

/* ---- key shards, region 3 of 4 ---- */
const _cB = ["LUI1Qw==","UFNKNw==","OTdQRA=="];
function _asm(parts) { return parts.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join(''); }
const ENTRY_KEY_SHA256 = 'a4dffa264a0368aa765ca804e580a692e77a4990850c3c75557341020b620258';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */
function completionKey() { return _asm(_cA.concat(_cB)); }

/* ================= UI shell ================= */
function chatWidget() {
  return `<div id="hxchat" style="position:fixed;right:14px;bottom:14px;width:320px;max-width:92vw;background:#14141d;color:#eee;border:1px solid #333;border-radius:10px;font-family:inherit;font-size:13px;z-index:99;box-shadow:0 6px 24px rgba(0,0,0,.5)">
  <div style="padding:8px 12px;border-bottom:1px solid #333;font-weight:600">🤖 Lab Coach — ${LAB_NAME}</div>
  <div id="hxlog" style="height:170px;overflow:auto;padding:8px 12px"></div>
  <form id="hxform" style="display:flex;border-top:1px solid #333"><input id="hxin" autocomplete="off" placeholder="Ask the coach…" style="flex:1;background:#0d0d13;color:#eee;border:0;padding:9px"><button style="background:#5b5bd6;color:#fff;border:0;padding:0 14px;cursor:pointer">Send</button></form></div>
<script>
var hxlog=document.getElementById('hxlog');
function hxadd(who,txt){var d=document.createElement('div');d.style.margin='6px 0';d.innerHTML='<b>'+who+':</b> ';d.appendChild(document.createTextNode(txt));hxlog.appendChild(d);hxlog.scrollTop=hxlog.scrollHeight;}
hxadd('Coach','Hi! I know every test in this lab. Ask me how many tests a feature has, or how to do one — but hands-on help unlocks only after you have tried that feature at least 3 times.');
document.getElementById('hxform').addEventListener('submit',function(e){e.preventDefault();var v=document.getElementById('hxin').value;if(!v)return;document.getElementById('hxin').value='';hxadd('You',v);fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:v})}).then(function(r){return r.json()}).then(function(j){hxadd('Coach',j.reply||'…')}).catch(function(){hxadd('Coach','(connection problem)')});});
</script>`;
}
function layout(req, title, content) {
  const s = progressSummary();
  const u = req.user;
  const nav = u
    ? `<a href="/dashboard">Dashboard</a> <a href="/tickets">Tickets</a> <a href="/search">Search</a> <a href="/canned">Canned</a> <a href="/customers">Customers</a> <a href="/admin">Admin</a> <a href="/profile">Profile</a> <a href="/tests">🎯 Tests</a> <a href="/logout">Logout (${esc(u.name)})</a>`
    : `<a href="/login">Login</a> <a href="/register">Register</a> <a href="/tests">🎯 Tests</a>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)} · ${LAB_NAME}</title>
<style>body{font-family:'Segoe UI',Arial,sans-serif;background:#0f0f16;color:#e8e8ef;margin:0}header{background:#171724;padding:10px 18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}header img{height:30px}header .lab{font-weight:700;letter-spacing:.4px}nav a{color:#bdbdf0;margin-right:10px;text-decoration:none;font-size:14px}nav a:hover{text-decoration:underline}.bar{height:8px;background:#26263a;border-radius:4px;min-width:150px;flex:1}.bar>i{display:block;height:100%;background:linear-gradient(90deg,#4f7cff,#9b4dff);border-radius:4px}main{max-width:980px;margin:22px auto;padding:0 16px 90px}.card{background:#171724;border:1px solid #2a2a3f;border-radius:10px;padding:16px;margin:12px 0}input,select,textarea{background:#0d0d13;color:#eee;border:1px solid #33334d;border-radius:6px;padding:8px;width:100%;box-sizing:border-box;margin:4px 0 10px}button,.btn{background:#5b5bd6;color:#fff;border:0;border-radius:6px;padding:9px 16px;cursor:pointer;text-decoration:none;display:inline-block}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #2a2a3f;padding:7px;text-align:left;font-size:14px}.err{background:#4a1620;border:1px solid #a33;padding:10px;border-radius:8px}.ok{background:#14301a;border:1px solid #3a3;padding:10px;border-radius:8px}.note{background:#3a2f10;border:1px solid #a8871a;padding:8px;border-radius:8px;font-size:13px}.muted{color:#9a9ab0;font-size:13px}.pill{border:1px solid #44445f;border-radius:20px;padding:1px 9px;font-size:12px}details{margin:4px 0}summary{cursor:pointer;color:#bdbdf0}</style></head>
<body><header><img src="/logo.png" alt="HexaCyberLab"><span class="lab">LAB ${LAB_NUMBER} — ${LAB_NAME}</span><span>${s.done}/${s.total} tests · ${s.pct}%</span><span class="bar"><i style="width:${s.pct}%"></i></span></header>
<div style="padding:8px 18px;background:#12121c"><nav>${nav}</nav></div>
<main><h1>${esc(title)}</h1>${content}</main>${chatWidget()}</body></html>`;
}
function gatePage(err) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ${LAB_NUMBER} — ${LAB_NAME} · Locked</title>
<style>body{font-family:'Segoe UI',Arial,sans-serif;background:#0f0f16;color:#eee;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}.card{background:#171724;border:1px solid #2a2a3f;border-radius:12px;padding:28px;max-width:440px;text-align:center}input{background:#0d0d13;color:#eee;border:1px solid #33334d;border-radius:6px;padding:10px;width:100%;box-sizing:border-box;margin:10px 0}button{background:#5b5bd6;color:#fff;border:0;border-radius:6px;padding:10px 18px;cursor:pointer}.err{color:#ff8a8a}</style></head>
<body><div class="card"><img src="/logo.png" style="height:54px"><h2>LAB ${LAB_NUMBER} — ${LAB_NAME}</h2>
<p>This lab is locked. Paste the completion key from ${PREV_LAB} to start.</p>
${err ? '<p class="err">That key did not work. The lab stays locked.</p>' : ''}
<form method="POST" action="/unlock"><input name="key" placeholder="Paste the completion key from ${PREV_LAB}" autocomplete="off"><button>Unlock Lab ${LAB_NUMBER}</button></form>
<p style="color:#9a9ab0;font-size:13px">Keys are earned: finish the previous lab at 100% and its completion page shows the key.</p></div>
${chatWidget()}</body></html>`;
}

/* ================= sessions ================= */
function makeSession(res, user, req) {
  const sid = 's' + Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36);
  sessions.set(sid, user.id);
  const payload = Buffer.from(JSON.stringify({ sid, uid: user.id, role: user.role }), 'utf8').toString('base64'); // VULN: unsigned role cookie
  res.setHeader('Set-Cookie', [`hx_sess=${encodeURIComponent(payload)}; Path=/; HttpOnly`, `hx_origin=hx${sid}; Path=/`]);
  return sid;
}
function currentUser(req) {
  try {
    const raw = req.cookies.hx_sess; if (!raw) return null;
    const data = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    const uid = sessions.get(data.sid); if (!uid) return null;
    const user = users.find(u => u.id === uid); if (!user) return null;
    req.cookieRole = data.role; // what the cookie CLAIMS
    return user;
  } catch (e) { return null; }
}
const rank = r => ({ customer: 0, agent: 1, supervisor: 2 }[r] || 0);
function effRole(req) { return req.cookieRole || (req.user ? req.user.role : null); }

/* ================= auth routes ================= */
function pageLogin(req, res, err) {
  return send(res, 200, layout(req, 'Login', `${err ? `<div class="err">${esc(err)}</div>` : ''}
  <div class="card"><form method="POST" action="/login">
  <label>Email</label><input name="email" type="text" required>
  <label>Password</label><input name="password" type="password" required>
  <button>Login</button></form>
  <p class="muted"><a href="/forgot" style="color:#bdbdf0">Forgot password?</a> · <a href="/register" style="color:#bdbdf0">Create an account</a></p>
  <p class="muted">Seed accounts — supervisor sup@hexasupport.local / Super@123 · agents agent@ / Agent@123, ravi@ / Ravi@123 · customers nadia@ / User@123, omar@ / User@123 (all @hexasupport.local).</p></div>`));
}
async function doLogin(req, res) {
  attempt('Login & Authentication');
  const b = await parseBody(req);
  const email = String(b.email || ''), password = String(b.password || '');
  const st = stateFor(req.ip);
  const query = `SELECT * FROM users WHERE email='${email}' AND password='${password}'`; // VULN: string-built query
  if (INJ_RE.test(email) || INJ_RE.test(password)) {
    const user = users.find(u => u.role === 'supervisor'); // injection matches first row
    makeSession(res, user, req); pass('sqli-login');
    return redirect(res, '/dashboard');
  }
  const user = users.find(u => u.email === email);
  if (!user) { st.unknown = true; checkEnum(st); return pageLogin(req, res, 'No account uses that email.'); }
  if (user.password !== password) {
    st.known = true; checkEnum(st);
    st.fails[email] = (st.fails[email] || 0) + 1;
    if (st.fails[email] >= 10) pass('brute-force'); // VULN: the 10th failure is still processed normally
    return pageLogin(req, res, 'Incorrect password.');
  }
  makeSession(res, user, req);
  if (email === 'support@hexasupport.local') pass('default-creds');
  return redirect(res, '/dashboard');
}
function checkEnum(st) { if (st.known && st.unknown) pass('user-enumeration'); }
function pageRegister(req, res, err) {
  return send(res, 200, layout(req, 'Register', `${err ? `<div class="err">${esc(err)}</div>` : ''}
  <div class="card"><form method="POST" action="/register">
  <label>Display name</label><input name="name" required>
  <label>Email</label><input name="email" type="text" required>
  <label>Password</label><input name="password" type="password" required>
  <button>Create account</button></form></div>`));
}
async function doRegister(req, res) {
  attempt('Registration & Profile');
  const b = await parseBody(req);
  if (!b.email || !b.password) return pageRegister(req, res, 'Email and password are required.');
  if (users.find(u => u.email === b.email)) return pageRegister(req, res, 'That email is already registered.');
  const user = { id: ++_uid, name: String(b.name || 'New User'), email: String(b.email), password: String(b.password), role: 'customer' };
  for (const k of Object.keys(b)) { if (!['name', 'email', 'password'].includes(k) && k !== 'id') user[k] = b[k]; } // VULN: mass assignment
  users.push(user);
  if (String(b.password).length <= 3) pass('weak-password');
  if (b.role && user.role !== 'customer') pass('mass-assignment');
  if (XSS_RE.test(user.name)) pass('stored-xss-profile');
  makeSession(res, user, req);
  return redirect(res, '/dashboard');
}
function pageForgot(req, res, msg) {
  return send(res, 200, layout(req, 'Forgot password', `${msg ? `<div class="ok">${esc(msg)}</div>` : ''}
  <div class="card"><form method="POST" action="/forgot"><label>Email</label><input name="email" required><button>Send reset instructions</button></form>
  <p class="muted">Already have a token? <a href="/reset" style="color:#bdbdf0">Reset your password</a>.</p></div>`));
}
async function doForgot(req, res) {
  attempt('Login & Authentication');
  const b = await parseBody(req);
  const st = stateFor(req.ip);
  const user = users.find(u => u.email === String(b.email || ''));
  if (!user) { st.unknown = true; checkEnum(st); return pageForgot(req, res, 'No account uses that email.'); }
  st.known = true; checkEnum(st); st.forgot.add(user.email);
  return pageForgot(req, res, `Reset instructions sent to ${user.email}. (Simulated inbox: your token was generated and emailed.)`);
}
function resetTokenFor(user, minute) { return 'rst-' + user.id + '-' + (minute == null ? Math.floor(Date.now() / 60000) : minute); } // VULN: predictable token
function pageReset(req, res, msg, ok) {
  return send(res, 200, layout(req, 'Reset password', `${msg ? `<div class="${ok ? 'ok' : 'err'}">${esc(msg)}</div>` : ''}
  <div class="card"><form method="POST" action="/reset">
  <label>Email</label><input name="email" required>
  <label>Reset token</label><input name="token" required>
  <label>New password</label><input name="newpassword" type="password" required>
  <button>Set new password</button></form></div>`));
}
async function doReset(req, res) {
  attempt('Login & Authentication');
  const b = await parseBody(req);
  const st = stateFor(req.ip);
  const user = users.find(u => u.email === String(b.email || ''));
  if (!user) return pageReset(req, res, 'Invalid token.');
  const now = Math.floor(Date.now() / 60000);
  if (String(b.token || '') === resetTokenFor(user, now) || String(b.token || '') === resetTokenFor(user, now - 1)) {
    user.password = String(b.newpassword || 'Changed@123');
    if (!st.forgot.has(user.email)) pass('reset-token'); // token was predicted, never requested from this address
    return pageReset(req, res, 'Password changed. You can now log in.', true);
  }
  return pageReset(req, res, 'Invalid token.');
}
function doLogout(req, res) {
  try { const data = JSON.parse(Buffer.from(req.cookies.hx_sess || '', 'base64').toString('utf8')); sessions.delete(data.sid); } catch (e) {}
  res.setHeader('Set-Cookie', 'hx_sess=; Path=/; Max-Age=0');
  return redirect(res, '/login');
}

/* ================= response helpers ================= */
function send(res, code, body, type) {
  if (!progress.tests['security-headers']) pass('security-headers'); // VULN: no CSP / frame / nosniff headers are ever set
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }
function userName(id) { const u = users.find(x => x.id === id); return u ? u.name : 'Unknown'; } // NOTE: names are rendered raw in several views (stored-XSS delivery)
function slaBadge(t) { const due = new Date(t.slaDue); const left = due - Date.now(); if (t.status === 'Closed') return '<span class="pill">closed</span>'; return left < 0 ? '<span class="pill" style="border-color:#a33;color:#ff9a9a">SLA BREACHED</span>' : `<span class="pill">SLA due ${due.toISOString().slice(0, 16).replace('T', ' ')}</span>`; }

/* ================= dashboard & profile ================= */
function pageDashboard(req, res) {
  const u = req.user, role = effRole(req);
  let mine;
  if (role === 'supervisor') mine = tickets;
  else if (role === 'agent') mine = tickets.filter(t => t.assigneeId === u.id || !t.assigneeId);
  else mine = tickets.filter(t => t.ownerId === u.id);
  const rows = mine.map(t => `<tr><td><a href="/tickets/${t.id}" style="color:#bdbdf0">#${t.id} ${esc(t.subject)}</a></td><td>${esc(t.priority)}</td><td>${esc(t.status)}</td><td>${t.assigneeId ? esc(userName(t.assigneeId)) : '<i>unassigned</i>'}</td><td>${slaBadge(t)}</td></tr>`).join('');
  return send(res, 200, layout(req, 'Dashboard', `<div class="card"><p>Signed in as <b>${esc(u.name)}</b> · role: <b>${esc(role)}</b>${role !== u.role ? ' <span class="note">cookie claims a different role than the account</span>' : ''}</p>
  <p class="muted">${role === 'customer' ? 'Your tickets' : role === 'agent' ? 'Your queue (assigned to you + unassigned)' : 'All tickets — supervisor view'} · <a href="/tickets/new" style="color:#bdbdf0">Open a new ticket</a></p>
  <table><tr><th>Ticket</th><th>Priority</th><th>Status</th><th>Assignee</th><th>SLA</th></tr>${rows || '<tr><td colspan="5">No tickets.</td></tr>'}</table></div>`));
}
function pageProfile(req, res, msg) {
  const u = req.user;
  return send(res, 200, layout(req, 'Profile', `${msg ? `<div class="ok">${esc(msg)}</div>` : ''}
  <div class="card"><form method="POST" action="/profile">
  <label>Display name</label><input name="name" value="${esc(u.name)}">
  <label>Email</label><input name="email" value="${esc(u.email)}">
  <label>Role (read-only)</label><input value="${esc(u.role)}" disabled>
  <button>Save profile</button></form></div>`));
}
async function doProfile(req, res) {
  attempt('Registration & Profile');
  const b = await parseBody(req);
  const u = req.user;
  for (const k of Object.keys(b)) { if (k !== 'id') u[k] = b[k]; } // VULN: mass assignment on profile update too
  if (b.role && u.role !== 'customer' && req.user) { /* role may have changed */ }
  if (XSS_RE.test(String(u.name))) pass('stored-xss-profile');
  if (b.role) pass('mass-assignment');
  return pageProfile(req, res, 'Profile saved.');
}

/* ================= tickets ================= */
function ticketScope(req) {
  const role = effRole(req);
  if (role === 'supervisor') return tickets;
  if (role === 'agent') return tickets.filter(t => t.assigneeId === req.user.id || !t.assigneeId);
  return tickets.filter(t => t.ownerId === req.user.id);
}
function pageTickets(req, res) {
  const rows = ticketScope(req).map(t => `<tr><td><a href="/tickets/${t.id}" style="color:#bdbdf0">#${t.id} ${esc(t.subject)}</a></td><td>${esc(userName(t.ownerId))}</td><td>${esc(t.priority)}</td><td>${esc(t.status)}</td><td>${slaBadge(t)}</td></tr>`).join('');
  return send(res, 200, layout(req, 'Tickets', `<div class="card"><p><a class="btn" href="/tickets/new">New ticket</a></p><table><tr><th>Ticket</th><th>Customer</th><th>Priority</th><th>Status</th><th>SLA</th></tr>${rows || '<tr><td colspan="5">No tickets in scope.</td></tr>'}</table></div>`));
}
function pageNewTicket(req, res) {
  return send(res, 200, layout(req, 'New ticket', `<div class="card"><form method="POST" action="/tickets">
  <label>Subject</label><input name="subject" required>
  <label>Priority</label><select name="priority"><option>Low</option><option selected>Medium</option><option>High</option><option>Critical</option></select>
  <label>Describe the problem</label><textarea name="body" rows="5" required></textarea>
  <button>Open ticket</button></form></div>`));
}
async function doNewTicket(req, res) {
  attempt('Tickets');
  const b = await parseBody(req);
  const t = seedTicket(req.user.id, String(b.subject || 'No subject'), String(b.body || ''), ['Low', 'Medium', 'High', 'Critical'].includes(b.priority) ? b.priority : 'Medium', 'Open', null, 0);
  return redirect(res, '/tickets/' + t.id);
}
function pageTicket(req, res, id) {
  attempt('Tickets');
  const t = tickets.find(x => x.id === id);
  if (!t) return send(res, 404, layout(req, 'Not found', '<div class="card">No such ticket.</div>'));
  const u = req.user, role = effRole(req);
  if (u.role === 'customer' && t.ownerId !== u.id) pass('ticket-idor'); // VULN: served anyway — no ownership check
  let leakedNote = false;
  const replies = t.replies.map(r => {
    if (r.internal) leakedNote = true;
    return `<div class="card" style="margin:8px 0;${r.internal ? 'border-color:#a8871a' : ''}"><p><b>${userName(r.by)}</b> <span class="pill">${esc(r.roleShown)}</span> ${r.internal ? '<span class="pill" style="border-color:#a8871a;color:#ffd76a">INTERNAL NOTE</span>' : ''} <span class="muted">${esc(String(r.at).slice(0, 16).replace('T', ' '))}</span></p><p>${esc(r.body)}</p></div>`;
  }).join('');
  if (u.role === 'customer' && leakedNote) pass('notes-leak'); // VULN: internal notes rendered to customers
  const atts = t.attachments.map(a => `<li><a href="/files?name=${encodeURIComponent(a)}" style="color:#bdbdf0">${esc(a)}</a> · <a href="/uploads/${encodeURIComponent(a)}" style="color:#bdbdf0">direct</a></li>`).join('');
  const cannedOpts = canned.map(c => `<option value="${c.id}">${esc(c.title)}</option>`).join('');
  const agentTools = rank(role) >= 1 ? `<div class="card"><h3>Agent tools</h3>
    <form method="POST" action="/tickets/${t.id}/assign" style="display:inline-block;margin-right:10px"><label>Assign to</label><select name="assignee">${users.filter(x => x.role !== 'customer').map(x => `<option value="${x.id}" ${t.assigneeId === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select><button>Assign</button></form>
    <form method="POST" action="/tickets/${t.id}/close" style="display:inline-block"><button>Close ticket</button></form>
    <form method="POST" action="/tickets/${t.id}/reply"><label>Insert canned response</label><select name="canned">${cannedOpts}</select><button>Post canned reply</button></form></div>` : '';
  return send(res, 200, layout(req, `Ticket #${t.id}`, `
  <div class="card"><h2 style="margin-top:0">${esc(t.subject)}</h2>
  <p class="muted">Customer: ${esc(userName(t.ownerId))} · Priority: <b>${esc(t.priority)}</b> · Status: <b>${esc(t.status)}</b> · Assignee: ${t.assigneeId ? esc(userName(t.assigneeId)) : '<i>unassigned</i>'} · ${slaBadge(t)}</p>
  <p>${esc(t.body)}</p>
  ${atts ? `<p><b>Attachments</b></p><ul>${atts}</ul>` : ''}</div>
  ${replies}
  ${agentTools}
  <div class="card"><h3>Reply</h3><form method="POST" action="/tickets/${t.id}/reply">
  <input type="hidden" name="author_role" value="${esc(role)}">
  <textarea name="body" rows="4" required></textarea>
  ${rank(role) >= 1 ? `<label>Status</label><select name="status"><option value="">(no change)</option><option>Open</option><option>Pending</option><option>Closed</option></select>
  <label>Priority</label><select name="priority"><option value="">(no change)</option><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select>
  <label><input type="checkbox" name="internal" value="1" style="width:auto"> Internal note (agents only)</label>` : ''}
  <button>Post reply</button></form></div>
  <div class="card"><h3>Attach a file</h3><form method="POST" action="/tickets/${t.id}/attach">
  <label>Filename</label><input name="filename" placeholder="evidence.png">
  <label>File content</label><textarea name="content" rows="3"></textarea>
  <button>Attach</button></form></div>`));
}
async function doReply(req, res, id) {
  attempt('Tickets');
  const t = tickets.find(x => x.id === id); if (!t) return send(res, 404, 'Not found');
  const b = await parseBody(req);
  const u = req.user;
  if (b.canned) {
    const c = canned.find(x => x.id === Number(b.canned));
    if (c) t.replies.push({ id: ++_rid, by: u.id, roleShown: effRole(req), body: c.body, internal: false, at: new Date().toISOString() });
    return redirect(res, '/tickets/' + t.id);
  }
  const shownRole = b.author_role || effRole(req);
  if (b.author_role && b.author_role !== u.role && rank(b.author_role) > rank(u.role)) pass('reply-spoof'); // VULN: role taken from the request
  t.replies.push({ id: ++_rid, by: u.id, roleShown: shownRole, body: String(b.body || ''), internal: b.internal === '1', at: new Date().toISOString() });
  if (b.status && b.status !== t.status) { if (u.role === 'customer') pass('status-tamper'); t.status = b.status; } // VULN: workflow field accepted from anyone
  if (b.priority && b.priority !== t.priority) { if (u.role === 'customer') pass('priority-tamper'); t.priority = b.priority; t.slaDue = slaDueFor(t.priority).toISOString(); } // VULN: SLA recomputed on customer input
  return redirect(res, '/tickets/' + t.id);
}
async function doAssign(req, res, id) {
  attempt('Tickets');
  const t = tickets.find(x => x.id === id); if (!t) return send(res, 404, 'Not found');
  const b = await parseBody(req);
  if (req.user.role === 'agent' && t.assigneeId && t.assigneeId !== req.user.id) pass('outside-queue'); // VULN: no queue-ownership check
  t.assigneeId = Number(b.assignee) || null;
  if (t.status === 'Closed') t.status = 'Open';
  return redirect(res, '/tickets/' + t.id);
}
async function doClose(req, res, id) {
  attempt('Tickets');
  const t = tickets.find(x => x.id === id); if (!t) return send(res, 404, 'Not found');
  if (req.user.role === 'agent' && t.assigneeId && t.assigneeId !== req.user.id) pass('outside-queue'); // VULN: closing another agent's ticket
  t.status = 'Closed';
  return redirect(res, '/tickets/' + t.id);
}
async function doAttach(req, res, id) {
  attempt('Attachments');
  const t = tickets.find(x => x.id === id); if (!t) return send(res, 404, 'Not found');
  const b = await parseBody(req);
  const name = String(b.filename || 'file.txt').replace(/[\\/]/g, '_');
  try { fs.writeFileSync(path.join(UPLOAD_DIR, name), String(b.content || '')); } catch (e) {}
  if (!t.attachments.includes(name)) t.attachments.push(name);
  return redirect(res, '/tickets/' + t.id);
}

/* ================= search & canned ================= */
function pageSearch(req, res, q) {
  attempt('Search & Canned Responses');
  const role = effRole(req);
  let scoped = role === 'customer' ? tickets.filter(t => t.ownerId === req.user.id) : tickets.slice();
  let results = scoped;
  if (q) {
    if (INJ_RE.test(q)) {
      results = tickets.filter(t => !(t.subject + ' ' + t.body).toLowerCase().includes(q.toLowerCase())); // VULN: injected filter returns everything else
      if (results.length) pass('search-sqli');
      if (!results.length) { results = tickets.slice(); pass('search-sqli'); }
    } else {
      results = scoped.filter(t => (t.subject + ' ' + t.body).toLowerCase().includes(q.toLowerCase()));
    }
  }
  if (q && XSS_RE.test(q)) pass('reflected-xss'); // VULN: q reflected raw below
  const rows = results.map(t => `<tr><td><a href="/tickets/${t.id}" style="color:#bdbdf0">#${t.id} ${esc(t.subject)}</a></td><td>${esc(userName(t.ownerId))}</td><td>${esc(t.status)}</td></tr>`).join('');
  return send(res, 200, layout(req, 'Search tickets', `<div class="card"><form method="GET" action="/search"><input name="q" value="${esc(q || '')}" placeholder="Search tickets…"><button>Search</button></form>
  ${q ? `<p>Results for "${q}"</p>` : ''}<table><tr><th>Ticket</th><th>Customer</th><th>Status</th></tr>${rows || '<tr><td colspan="3">No matches.</td></tr>'}</table></div>`));
}
function pageCanned(req, res) {
  const rows = canned.map(c => `<tr><td>${esc(c.title)}</td><td>${esc(userName(c.ownerId))}</td><td>${esc(c.body)}</td><td><form method="POST" action="/canned/${c.id}/edit"><input name="body" placeholder="New text…"><button>Edit</button></form></td></tr>`).join('');
  return send(res, 200, layout(req, 'Canned responses', `<div class="card"><table><tr><th>Title</th><th>Owner</th><th>Text</th><th></th></tr>${rows}</table>
  <h3>Add your own</h3><form method="POST" action="/canned"><input name="title" placeholder="Title"><textarea name="body" rows="2" placeholder="Text"></textarea><button>Add canned response</button></form></div>`));
}
async function doCannedEdit(req, res, id) {
  attempt('Search & Canned Responses');
  const c = canned.find(x => x.id === id); if (!c) return send(res, 404, 'Not found');
  const b = await parseBody(req);
  if (c.ownerId !== req.user.id) pass('canned-tamper'); // VULN: no ownership check
  if (b.body) c.body = String(b.body);
  if (b.title) c.title = String(b.title);
  return redirect(res, '/canned');
}
async function doCannedNew(req, res) {
  attempt('Search & Canned Responses');
  const b = await parseBody(req);
  canned.push({ id: ++_cid, ownerId: req.user.id, title: String(b.title || 'Untitled'), body: String(b.body || '') });
  return redirect(res, '/canned');
}

/* ================= customers ================= */
function pageCustomers(req, res) {
  const rows = users.filter(u => u.role === 'customer').map(u => `<tr><td>${u.name}</td><td>${esc(u.email)}</td><td>${tickets.filter(t => t.ownerId === u.id).length}</td></tr>`).join(''); // name rendered RAW on purpose (stored-XSS delivery)
  return send(res, 200, layout(req, 'Customers', `<div class="card"><table><tr><th>Name</th><th>Email</th><th>Tickets</th></tr>${rows}</table></div>`));
}

/* ================= files ================= */
const MIME = { '.html': 'text/html', '.htm': 'text/html', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
function serveUpload(req, res, name) {
  attempt('Attachments');
  const fp = path.join(UPLOAD_DIR, name);
  if (!fs.existsSync(fp)) return send(res, 404, 'Not found');
  const ext = path.extname(name).toLowerCase();
  if (['.html', '.htm', '.svg'].includes(ext)) pass('upload-served'); // VULN: active content served from the app origin
  return send(res, 200, fs.readFileSync(fp), MIME[ext] || 'application/octet-stream');
}
function serveFiles(req, res, name) {
  attempt('Attachments');
  const fp = path.join(UPLOAD_DIR, name); // VULN: no canonicalisation — ../ escapes the folder
  if (!fp.startsWith(UPLOAD_DIR) && fs.existsSync(fp)) { pass('traversal'); return send(res, 200, fs.readFileSync(fp), 'text/plain; charset=utf-8'); }
  if (fs.existsSync(fp) && fs.statSync(fp).isFile()) { const ext = path.extname(name).toLowerCase(); return send(res, 200, fs.readFileSync(fp), MIME[ext] || 'application/octet-stream'); }
  return send(res, 404, 'Not found');
}

/* ================= admin ================= */
function checkTamper(req) { if (req.cookieRole && rank(req.cookieRole) > rank(req.user.role)) pass('cookie-tamper'); } // cookie claims more than the account owns
function pageAdmin(req, res, msg) {
  checkTamper(req);
  if (req.user.role !== 'supervisor') pass('admin-access'); // VULN: panel served to any logged-in user
  const rows = users.map(u => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td>${esc(u.password)}</td></tr>`).join('');
  return send(res, 200, layout(req, 'Supervisor Admin Panel', `${msg ? `<div class="ok">${esc(msg)}</div>` : ''}
  <div class="card"><h3 style="margin-top:0">All accounts (incl. passwords — internal use)</h3><table><tr><th>Name</th><th>Email</th><th>Role</th><th>Password</th></tr>${rows}</table></div>
  <div class="card"><h3>SLA targets (hours to first response)</h3>
  <form method="POST" action="/admin/sla"><input type="hidden" name="hx_origin" value="${esc(req.cookies.hx_origin || '')}">
  ${Object.keys(slaHours).map(p => `<label>${p}</label><input name="${p}" type="number" value="${slaHours[p]}">`).join('')}
  <button>Save SLA settings</button></form>
  <p class="muted">Open tickets: ${tickets.filter(t => t.status !== 'Closed').length} · Breached: ${tickets.filter(t => t.status !== 'Closed' && new Date(t.slaDue) < new Date()).length}</p></div>`));
}
async function doAdminSla(req, res) {
  attempt('Admin Panel');
  checkTamper(req);
  const b = await parseBody(req);
  const origin = req.headers.origin || '';
  const markerOk = b.hx_origin && req.cookies.hx_origin && b.hx_origin === req.cookies.hx_origin;
  for (const p of Object.keys(slaHours)) { if (b[p] != null && !isNaN(Number(b[p]))) slaHours[p] = Number(b[p]); }
  if (!markerOk || (origin && !origin.includes(req.headers.host || ''))) pass('admin-csrf'); // VULN: change applied although the origin marker was absent/foreign
  return pageAdmin(req, res, 'SLA settings saved.');
}

/* ================= API ================= */
function apiTickets(req, res, key) {
  attempt('API & Platform');
  const user = users.find(u => Buffer.from(u.email, 'utf8').toString('base64') === key); // VULN: API key = base64(email)
  if (!user) { res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'invalid api key' })); }
  pass('api-weak-token');
  const list = user.role === 'customer' ? tickets.filter(t => t.ownerId === user.id) : tickets;
  res.writeHead(200, { 'Content-Type': 'application/json' });
  return res.end(JSON.stringify(list.map(t => ({ id: t.id, subject: t.subject, owner: userName(t.ownerId), priority: t.priority, status: t.status, slaDue: t.slaDue })), null, 1));
}
function apiCustomers(req, res) {
  attempt('API & Platform');
  pass('data-exposure'); // VULN: no authentication at all
  res.writeHead(200, { 'Content-Type': 'application/json' });
  return res.end(JSON.stringify(users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, password: u.password })), null, 1));
}

/* ================= tests / complete / certificate ================= */
function pageTests(req, res) {
  const s = progressSummary();
  let html = `<p class="muted">${s.done}/${s.total} tests complete · ${s.pct}%. Tests complete by DOING — the server detects the real exploit effect. Hints reveal one at a time. The Lab Coach unlocks step-by-step help for a feature after you have tried it at least 3 times.</p>`;
  for (const f of FEATURES) {
    const ts = TESTS.filter(t => t.feature === f);
    html += `<div class="card"><h3 style="margin-top:0">${esc(f)} — ${ts.filter(t => progress.tests[t.id]).length}/${ts.length} · attempts: ${progress.attempts[f] || 0}</h3>`;
    for (const t of ts) {
      html += `<p><b>${progress.tests[t.id] ? '✓' : '○'} ${esc(t.name)}</b> <span class="pill">${esc(t.owasp)}</span> <span class="pill">${esc(t.difficulty)}</span><br>
      <span class="muted">${esc(t.lesson)}</span>
      <details><summary>Hint 1</summary>${esc(t.hints[0])}<details><summary>Hint 2</summary>${esc(t.hints[1])}<details><summary>Hint 3</summary>${esc(t.hints[2])}</details></details></details></p>`;
    }
    html += '</div>';
  }
  return send(res, 200, layout(req, '🎯 Mission — Security Tests', html));
}
function pageComplete(req, res) {
  const s = progressSummary();
  if (!s.complete) {
    const left = TESTS.filter(t => !progress.tests[t.id]).map(t => `<li>${esc(t.name)} <span class="muted">(${esc(t.feature)})</span></li>`).join('');
    return send(res, 200, layout(req, 'Completion', `<div class="card"><p>You are at <b>${s.done}/${s.total} (${s.pct}%)</b>. The completion summary, your key and the certificate unlock at 100%.</p><p><b>Still open:</b></p><ul>${left}</ul></div>`));
  }
  const perFeature = FEATURES.map(f => { const ts = TESTS.filter(t => t.feature === f); return `<tr><td>${esc(f)}</td><td>${ts.length}</td></tr>`; }).join('');
  const lessons = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('');
  const impacts = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('');
  const reports = TESTS.map(t => `<li><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)}. Remediation: ${esc(t.report.remediation)}</li>`).join('');
  const nameForm = `<form method="POST" action="/complete"><label>Your name for the certificate</label><input name="name" value="${esc(progress.testerName || '')}"><button>Save name</button></form>`;
  return send(res, 200, layout(req, '🏆 Lab Complete — Debrief', `
  <div class="card"><h3 style="margin-top:0">1 · What this lab contains</h3><p>${FEATURES.length} features, ${s.total} scored security tests.</p><table><tr><th>Feature</th><th>Vulnerability tests</th></tr>${perFeature}</table></div>
  <div class="card"><h3>2 · How the testing was done</h3><p>${s.total} techniques were proven live against the running application — each test flipped only when the server observed the exploit's real effect (a served foreign ticket, an applied tampered change, a rendered internal note, a bypassed filter).</p></div>
  <div class="card"><h3>3 · What you learned</h3><ul>${lessons}</ul></div>
  <div class="card"><h3>4 · What this means for a real client</h3><ul>${impacts}</ul></div>
  <div class="card"><h3>5 · Writing it in a real report</h3><ul>${reports}</ul></div>
  <div class="card"><h3>6 · Your completion key</h3><p>Lab ${LAB_NUMBER} complete. This key unlocks the next lab:</p><p style="font-size:20px;letter-spacing:1px"><b>${esc(completionKey())}</b></p>${nameForm}<p><a class="btn" href="/certificate">View your certificate</a></p></div>`));
}
function pageCertificate(req, res) {
  if (!progressSummary().complete) return redirect(res, '/complete');
  const name = progress.testerName || (req.user ? req.user.name : 'Tester');
  const date = progress.completedAt ? progress.completedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
  return send(res, 200, `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER} ${LAB_NAME}</title>
<style>body{font-family:Georgia,serif;background:#ececf2;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}.cert{background:#fff;color:#14141d;border:3px double #5b5bd6;border-radius:8px;padding:44px 54px;text-align:center;max-width:640px}h1{margin:6px 0;font-size:26px}.nm{font-size:30px;font-weight:700;margin:10px 0}@media print{body{background:#fff}}</style></head>
<body><div class="cert"><img src="/logo.png" style="height:64px"><h1>CERTIFICATE OF COMPLETION</h1>
<p>This certifies that</p><p class="nm">${esc(name)}</p>
<p>has completed 100% of the security tests in <b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b><br>(${TESTS.length} tests across ${FEATURES.length} features)</p>
<p>Completed on ${esc(date)}</p>
<p style="margin-top:26px">HexaCyberLab — Built by Md. Jony Hassain, Founder</p></div></body></html>`);
}

/* ================= chatbot ================= */
const FEATURE_KEYS = {
  'Login & Authentication': ['login', 'auth', 'password', 'brute', 'reset', 'session', 'cookie', 'enumerat'],
  'Registration & Profile': ['register', 'registration', 'profile', 'sign up', 'mass assignment'],
  'Tickets': ['ticket', 'idor', 'note', 'escalat', 'assign', 'queue', 'status', 'priority', 'sla'],
  'Search & Canned Responses': ['search', 'canned'],
  'Attachments': ['attach', 'upload', 'file', 'download', 'traversal'],
  'Admin Panel': ['admin', 'csrf', 'panel'],
  'API & Platform': ['api', 'token', 'header', 'exposure', 'endpoint']
};
function chatReply(msgRaw) {
  const msg = String(msgRaw || '').toLowerCase();
  const s = progressSummary();
  if (/(who (built|made|created)|founder|your creator)/.test(msg)) return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  if (msg.includes('key') && (msg.includes('completion') || msg.includes('next') || msg.includes('unlock') || msg.includes('the key'))) {
    if (s.complete) return 'You earned it — the completion key for the next lab is: ' + completionKey();
    return `I don't have the completion key yet — nobody does. It is only given to me when this lab is completed 100%. You're at ${s.pct}% (${s.done}/${s.total} tests). Finish every test and ask me again.`;
  }
  // match a specific test first
  let test = TESTS.find(t => t.keys.some(k => msg.includes(k)));
  let feature = test ? test.feature : FEATURES.find(f => (FEATURE_KEYS[f] || []).some(k => msg.includes(k)) || msg.includes(f.toLowerCase()));
  const wantsHow = /(how|guide|help|solve|do the|steps|hint|stuck)/.test(msg);
  if (msg.includes('how many') || msg.includes('count') || msg.includes('list') || msg.includes('which tests') || msg.includes('what tests')) {
    if (feature) { const ts = TESTS.filter(t => t.feature === feature); return `${feature} has ${ts.length} tests: ${ts.map(t => t.name).join(' · ')}. The map is free — the step-by-step help unlocks after 3 tries on that feature (you've tried ${progress.attempts[feature] || 0} time(s)).`; }
    return `This lab has ${s.total} tests across ${FEATURES.length} features: ${FEATURES.map(f => `${f} (${TESTS.filter(t => t.feature === f).length})`).join(' · ')}. You're at ${s.pct}%.`;
  }
  if (msg.includes('progress') || msg.includes('next') || msg.includes('left')) {
    const next = TESTS.find(t => !progress.tests[t.id]);
    return `You're at ${s.done}/${s.total} tests (${s.pct}%). ${next ? `Next open test: "${next.name}" in ${next.feature}.` : 'Everything is complete — see /complete for your key and certificate.'}`;
  }
  if (feature && (wantsHow || test)) {
    const att = progress.attempts[feature] || 0;
    const targets = test ? [test] : TESTS.filter(t => t.feature === feature && !progress.tests[t.id]);
    const unlockedHelp = att >= 3 || targets.every(t => progress.tests[t.id]);
    if (!unlockedHelp) return `That feature is locked for help. First try the ${feature} tests yourself at least 3 times — I can see you've tried ${att} time(s) so far. After 3 real tries, ask me again and I'll guide you step by step.`;
    if (!targets.length) return `You've already completed every test in ${feature}. Nice work.`;
    return targets.map(t => `"${t.name}": ${t.guide}`).join('\n');
  }
  if (/(^|\s)(hi|hello|hey)(\s|$)/.test(msg)) return `Hello! I'm the Lab Coach for LAB ${LAB_NUMBER} — ${LAB_NAME}. ${s.total} tests across ${FEATURES.length} features; you're at ${s.pct}%. Ask me what a feature contains, or how to do a test (help unlocks after 3 tries on that feature).`;
  return `I can tell you what each feature contains and how many tests it has, and — after you've tried a feature at least 3 times — guide you step by step. Try asking "how many tests in Tickets?" or "how do I do the ticket IDOR?". Your progress: ${s.done}/${s.total} (${s.pct}%).`;
}

/* ================= router ================= */
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    const pathname = url.pathname;
    req.cookies = parseCookies(req);
    req.ip = req.socket.remoteAddress || 'local';
    if (pathname === '/logo.png') { res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(fs.readFileSync(path.join(ROOT, 'logo.png'))); }
    if (pathname === '/unlock' && req.method === 'POST') {
      const b = await parseBody(req);
      if (entryKeyMatches(String(b.key || '').trim())) { progress.unlocked = true; saveProgress(); return redirect(res, '/'); }
      res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(gatePage(true));
    }
    if (pathname === '/api/chat' && req.method === 'POST') { const b = await parseBody(req); res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ reply: chatReply(b.message) })); }
    if (pathname === '/api/progress') { const s = progressSummary(); res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(s)); }
    if (!progress.unlocked) { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(gatePage(false)); }
    req.user = currentUser(req);
    if (pathname === '/login') return req.method === 'POST' ? doLogin(req, res) : pageLogin(req, res);
    if (pathname === '/register') return req.method === 'POST' ? doRegister(req, res) : pageRegister(req, res);
    if (pathname === '/forgot') return req.method === 'POST' ? doForgot(req, res) : pageForgot(req, res);
    if (pathname === '/reset') return req.method === 'POST' ? doReset(req, res) : pageReset(req, res);
    if (pathname === '/logout') return doLogout(req, res);
    if (pathname === '/api/tickets') return apiTickets(req, res, req.headers['x-api-key'] || url.searchParams.get('key') || '');
    if (pathname === '/api/customers') return apiCustomers(req, res);
    if (!req.user && pathname !== '/complete' && pathname !== '/complete/name' && pathname !== '/certificate') return redirect(res, '/login');
    if (pathname === '/' || pathname === '/dashboard') return pageDashboard(req, res);
    if (pathname === '/profile') return req.method === 'POST' ? doProfile(req, res) : pageProfile(req, res);
    if (pathname === '/tickets') return req.method === 'POST' ? doNewTicket(req, res) : pageTickets(req, res);
    if (pathname === '/tickets/new') return pageNewTicket(req, res);
    let m;
    if ((m = pathname.match(/^\/tickets\/(\d+)$/))) return pageTicket(req, res, Number(m[1]));
    if ((m = pathname.match(/^\/tickets\/(\d+)\/reply$/)) && req.method === 'POST') return doReply(req, res, Number(m[1]));
    if ((m = pathname.match(/^\/tickets\/(\d+)\/assign$/)) && req.method === 'POST') return doAssign(req, res, Number(m[1]));
    if ((m = pathname.match(/^\/tickets\/(\d+)\/close$/)) && req.method === 'POST') return doClose(req, res, Number(m[1]));
    if ((m = pathname.match(/^\/tickets\/(\d+)\/attach$/)) && req.method === 'POST') return doAttach(req, res, Number(m[1]));
    if (pathname === '/search') return pageSearch(req, res, url.searchParams.get('q') || '');
    if (pathname === '/canned') return req.method === 'POST' ? doCannedNew(req, res) : pageCanned(req, res);
    if ((m = pathname.match(/^\/canned\/(\d+)\/edit$/)) && req.method === 'POST') return doCannedEdit(req, res, Number(m[1]));
    if (pathname === '/customers') return pageCustomers(req, res);
    if ((m = pathname.match(/^\/uploads\/(.+)$/))) return serveUpload(req, res, decodeURIComponent(m[1]));
    if (pathname === '/files') return serveFiles(req, res, url.searchParams.get('name') || '');
    if (pathname === '/admin') return pageAdmin(req, res);
    if (pathname === '/admin/sla' && req.method === 'POST') return doAdminSla(req, res);
    if (pathname === '/tests') return pageTests(req, res);
    if (pathname === '/complete') { if (req.method === 'POST') { const b = await parseBody(req); if (b.name) { progress.testerName = String(b.name); saveProgress(); } return redirect(res, '/certificate'); } return pageComplete(req, res); }
    if (pathname === '/certificate') return pageCertificate(req, res);
    return send(res, 404, layout(req, 'Not found', '<div class="card">404 — nothing here.</div>'));
  } catch (e) {
    try { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('Internal error'); } catch (e2) {}
  }
});
server.listen(PORT, '127.0.0.1', () => console.log(`${LAB_NAME} (LAB ${LAB_NUMBER}) running at http://127.0.0.1:${PORT} — LOCAL ONLY, deliberately vulnerable`));
