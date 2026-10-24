'use strict';
/*
 * HexaCRM — LAB 12 of the HexaCyberLab practice-lab programme (Category 2: SaaS & Business Platforms).
 * A complete, deliberately vulnerable CRM platform: leads, contacts, companies, sales pipeline,
 * deals, notes, activities, CSV import/export, sales-rep and admin roles.
 * INTENTIONALLY INSECURE — for local, authorised security practice only. Binds 127.0.0.1 only.
 * Zero dependencies: Node.js built-ins only. Business data is in-memory (restart reseeds);
 * lab progress persists in progress.json.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3021;
const LAB_NUMBER = 12;
const LAB_NAME = 'HexaCRM';
const PREV_LAB = 'Lab 11 (HexaSaaS)';
const NEXT_LAB = 'Lab 13';
const PROGRESS_PATH = path.join(__dirname, 'progress.json');
const LOGO_PATH = path.join(__dirname, 'logo.png');

/* ---- key material: encoded fragments only, scattered through this file and
        assembled at the moment of use (entry: /unlock; completion: 100%). ---- */
const _eA = ['TC1YSA==', 'NC0yMQ=='];
const _cA = ['TC1YSA=='];
function _un(fr) { return fr.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join(''); }
function entryKey() { return _un([..._eA, ..._eB, ..._eC]); }
function completionKey() { return _un([..._cA, ..._cB, ..._cC]); }

/* ============================== seed data ============================== */
function seed() {
  return {
    users: [
      { id: 1, name: 'Ayesha Admin', email: 'admin@hexacrm.local', password: 'Admin@123', role: 'admin' },
      { id: 2, name: 'Sara Rahman', email: 'sara@hexacrm.local', password: 'Sara@123', role: 'rep' },
      { id: 3, name: 'Rahim Uddin', email: 'rahim@hexacrm.local', password: 'Rahim@123', role: 'rep' },
      { id: 4, name: 'Nadia Islam', email: 'nadia@hexacrm.local', password: 'Nadia@123', role: 'rep' },
      { id: 5, name: 'Guest User', email: 'guest@hexacrm.local', password: 'guest', role: 'rep', isDefault: true }
    ],
    companies: [
      { id: 1, name: 'Northwind Traders', industry: 'Retail', ownerId: 2 },
      { id: 2, name: 'Dhaka Textiles', industry: 'Manufacturing', ownerId: 3 },
      { id: 3, name: 'CloudNine Ltd', industry: 'SaaS', ownerId: 2 },
      { id: 4, name: 'EuroParts GmbH', industry: 'Automotive', ownerId: 3 },
      { id: 5, name: 'BrightApps Studio', industry: 'Software', ownerId: 4 },
      { id: 6, name: 'MediServe Clinics', industry: 'Healthcare', ownerId: 3 }
    ],
    contacts: [
      { id: 1, name: 'Tom Alvarez', email: 'tom@northwind.example', phone: '+1-555-0101', companyId: 1, ownerId: 2 },
      { id: 2, name: 'Priya Nair', email: 'priya@dhakatextiles.example', phone: '+880-1700-111', companyId: 2, ownerId: 3 },
      { id: 3, name: 'Jonas Weber', email: 'jonas@europarts.example', phone: '+49-170-222', companyId: 4, ownerId: 3 },
      { id: 4, name: 'Maria Chen', email: 'maria@cloudnine.example', phone: '+1-555-0130', companyId: 3, ownerId: 2 },
      { id: 5, name: 'Omar Farouk', email: 'omar@brightapps.example', phone: '+971-50-333', companyId: 5, ownerId: 4 },
      { id: 6, name: 'Lena Fischer', email: 'lena@mediserve.example', phone: '+49-171-444', companyId: 6, ownerId: 3 },
      { id: 7, name: 'David Kim', email: 'david@northwind.example', phone: '+1-555-0177', companyId: 1, ownerId: 2 },
      { id: 8, name: 'Aisha Bello', email: 'aisha@cloudnine.example', phone: '+234-80-555', companyId: 3, ownerId: 2 }
    ],
    leads: [
      { id: 1, name: 'GreenLeaf Foods', email: 'hello@greenleaf.example', company: 'GreenLeaf Foods', phone: '+1-555-0201', status: 'New', ownerId: 2, source: 'Web' },
      { id: 2, name: 'Harbor Logistics', email: 'ops@harborlog.example', company: 'Harbor Logistics', phone: '+1-555-0202', status: 'Contacted', ownerId: 3, source: 'Referral' },
      { id: 3, name: 'PixelWorks Agency', email: 'hi@pixelworks.example', company: 'PixelWorks', phone: '+44-20-0203', status: 'Qualified', ownerId: 2, source: 'Ads' },
      { id: 4, name: 'Sunrise Clinics', email: 'admin@sunrise.example', company: 'Sunrise Clinics', phone: '+880-1800-204', status: 'New', ownerId: 4, source: 'Web' },
      { id: 5, name: 'AutoParts Direct', email: 'buy@autoparts.example', company: 'AutoParts Direct', phone: '+49-30-0205', status: 'Contacted', ownerId: 3, source: 'Trade show' },
      { id: 6, name: 'EduSpark', email: 'team@eduspark.example', company: 'EduSpark', phone: '+91-98-0206', status: 'New', ownerId: 3, source: 'Web' },
      { id: 7, name: 'Nordic Outdoors', email: 'sales@nordic.example', company: 'Nordic Outdoors', phone: '+47-22-0207', status: 'Qualified', ownerId: 2, source: 'Referral' },
      { id: 8, name: 'FinEdge', email: 'contact@finedge.example', company: 'FinEdge', phone: '+1-555-0208', status: 'New', ownerId: 4, source: 'Ads' }
    ],
    deals: [
      { id: 1, title: 'Northwind annual licence', companyId: 1, contactId: 1, ownerId: 2, value: 24000, stage: 'Negotiation', probability: 70 },
      { id: 2, title: 'Dhaka Textiles rollout', companyId: 2, contactId: 2, ownerId: 3, value: 54000, stage: 'Proposal', probability: 50 },
      { id: 3, title: 'CloudNine expansion seats', companyId: 3, contactId: 4, ownerId: 2, value: 12750, stage: 'Prospecting', probability: 10 },
      { id: 4, title: 'EuroParts fleet deal', companyId: 4, contactId: 3, ownerId: 3, value: 89000, stage: 'Qualification', probability: 30 },
      { id: 5, title: 'BrightApps pilot', companyId: 5, contactId: 5, ownerId: 4, value: 6000, stage: 'Proposal', probability: 40 },
      { id: 6, title: 'MediServe support contract', companyId: 6, contactId: 6, ownerId: 3, value: 31200, stage: 'Won', probability: 100 },
      { id: 7, title: 'Northwind add-on modules', companyId: 1, contactId: 7, ownerId: 2, value: 4800, stage: 'Qualification', probability: 25 },
      { id: 8, title: 'CloudNine renewal', companyId: 3, contactId: 8, ownerId: 2, value: 19800, stage: 'Negotiation', probability: 80 }
    ],
    notes: [
      { id: 1, entityType: 'deal', entityId: 2, authorId: 3, body: 'Procurement asked for a 10% discount if we sign before quarter end.', priv: false },
      { id: 2, entityType: 'deal', entityId: 2, authorId: 3, body: 'CONFIDENTIAL: their real budget ceiling is $60k - do not share outside the team.', priv: true },
      { id: 3, entityType: 'lead', entityId: 1, authorId: 2, body: 'Called on Tuesday - they want a demo next week.', priv: false },
      { id: 4, entityType: 'deal', entityId: 1, authorId: 2, body: 'Decision maker is Tom; finance sign-off pending.', priv: false },
      { id: 5, entityType: 'lead', entityId: 6, authorId: 3, body: 'Private: competitor quote was $4,200/yr - internal only.', priv: true }
    ],
    activities: [
      { id: 1, type: 'call', subject: 'Intro call with GreenLeaf', entityType: 'lead', entityId: 1, ownerId: 2, done: true },
      { id: 2, type: 'email', subject: 'Proposal sent to Dhaka Textiles', entityType: 'deal', entityId: 2, ownerId: 3, done: true },
      { id: 3, type: 'meeting', subject: 'EuroParts on-site demo', entityType: 'deal', entityId: 4, ownerId: 3, done: false },
      { id: 4, type: 'call', subject: 'CloudNine renewal check-in', entityType: 'deal', entityId: 8, ownerId: 2, done: false }
    ]
  };
}
let DB = seed();
let nextUserId = 6, nextLeadId = 9, nextNoteId = 6;

/* runtime-only state (not part of the business seed) */
let resetCounter = 0;
const resetTokens = {};   // token -> userId
const mailLog = [];        // {to, token, at} — the lab's simulated mailbox
const failCount = {};      // email -> failed login count
const enumProbes = {};     // ip -> Set of nonexistent emails probed
const forgotIps = {};      // ip -> Set of emails a reset was requested for

/* ============================== TESTS registry ============================== */
const TESTS = [
  /* ---------- Login & Authentication ---------- */
  { id: 'sqli-login', feature: 'Login & Authentication', name: 'SQL Injection — Login Bypass', owasp: 'A03:2021 Injection', difficulty: 'Intermediate', loc: 'POST /login',
    hints: ["The login form builds its user lookup by pasting your input straight into a query string.", "Classic payloads still work here: try making the WHERE clause always true in the email or password field.", "Use sara@hexacrm.local as the email and ' OR '1'='1 as the password — or put admin@hexacrm.local' OR '1'='1' -- in the email field to land as admin."],
    lesson: "Login queries built by string concatenation let an attacker rewrite the query logic and authenticate without any password.",
    impact: "On a real CRM this hands an attacker the first account they target — often an admin — with no password at all: the full client list, deal values and revenue data from a single request.",
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements for all database access; never build queries by string concatenation.' },
    guide: "Step by step: 1) Log out. 2) On /login enter email sara@hexacrm.local and password ' OR '1'='1 (or admin@hexacrm.local' OR '1'='1' -- in the email field). 3) Submit — the string-built query returns a user row and you are signed in without any real password. That bypass is what the server detects.",
    keys: ['sqli', 'sql injection', 'login bypass', 'injection login', 'bypass the login', 'bypass login'] },
  { id: 'brute-force', feature: 'Login & Authentication', name: 'Brute Force — No Login Throttling', owasp: 'A07:2021 Auth Failures', difficulty: 'Beginner', loc: 'POST /login',
    hints: ["Nothing slows you down here: no lockout, no CAPTCHA, no delay.", "Script ten wrong passwords for one account and watch every attempt get processed.", "Send 10 failed logins for nadia@hexacrm.local — the 10th failure is still accepted for processing. The missing throttle is the finding."],
    lesson: "Without rate limiting or lockout, a login form is an unlimited password-guessing machine.",
    impact: "Attackers can password-spray the whole sales team overnight; one weak password means full access to that rep's book of business and client contacts.",
    report: { title: 'No Rate Limiting or Account Lockout on Login Endpoint', severity: 'High', remediation: 'Rate-limit login attempts per account and per IP; add progressive delays / lockout and alerting on repeated failures.' },
    guide: "Step by step: 1) Pick nadia@hexacrm.local. 2) POST /login with a wrong password 10 times (a small curl loop works). 3) Every attempt is processed normally — the app never locks the account. The test flips when the 10th failure is still accepted.",
    keys: ['brute', 'brute force', 'throttle', 'lockout', 'password guessing', 'rate limit'] },
  { id: 'user-enumeration', feature: 'Login & Authentication', name: 'User Enumeration via Login & Reset Responses', owasp: 'A07:2021 Auth Failures', difficulty: 'Beginner', loc: 'POST /login, POST /forgot',
    hints: ["Compare the error messages: an unknown email and a wrong password do NOT get the same text here.", "The forgot-password form is even more generous — it tells you outright whether an account exists.", "Probe 5 different made-up emails across login and forgot-password — the app confirms which addresses are real as you go."],
    lesson: "Differing authentication responses turn the login page into a directory of valid staff accounts.",
    impact: "Attackers first harvest a list of real employee emails, then aim phishing and password attacks only at accounts that exist — far more effective, and it starts from your own login page.",
    report: { title: 'Account Enumeration Through Differing Authentication Responses', severity: 'Medium', remediation: "Return one generic message ('Invalid credentials' / 'If the account exists, a reset email was sent') for every outcome." },
    guide: "Step by step: 1) POST /login with a made-up email — note the 'no account' wording. 2) POST with a real email and a wrong password — different wording. 3) Repeat with 5 distinct fake emails across /login and /forgot; the app confirms existence each time and the test flips at 5 distinct probes.",
    keys: ['enumeration', 'enumerate', 'valid email', 'which emails exist', 'user enumeration'] },
  { id: 'default-creds', feature: 'Login & Authentication', name: 'Weak / Default Credentials (Guest Account)', owasp: 'A07:2021 Auth Failures', difficulty: 'Beginner', loc: 'POST /login',
    hints: ["Old trial and guest accounts are rarely cleaned up in real CRMs.", "This CRM still has its leftover guest account active, with the most predictable password possible.", "Log in with guest@hexacrm.local / guest — a shipped-default account that was never disabled."],
    lesson: "Default and leftover accounts bypass all password policy — they are the first thing an attacker tries.",
    impact: "A forgotten guest account gives an attacker a legitimate foothold inside the CRM on day one, ready to abuse every other flaw in this lab.",
    report: { title: 'Default Guest Account With Trivial Password Still Active', severity: 'High', remediation: 'Remove or disable default / trial accounts; force unique strong passwords at first login and audit dormant accounts.' },
    guide: "Step by step: 1) On /login use guest@hexacrm.local with password guest. 2) You are signed in — the account shipped with the product and was never removed.",
    keys: ['default', 'guest', 'default password', 'weak cred'] },
  { id: 'reset-token', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07:2021 Auth Failures', difficulty: 'Intermediate', loc: 'POST /forgot, POST /reset',
    hints: ["Ask for a reset for your own account, then read your lab mailbox (/mail) and study the token's shape.", "The tokens are not random at all — they are issued from a simple counter.", "Request a reset for yourself, note the token, then request one for a colleague and predict their token by adding one. Use the predicted token while signed in as yourself."],
    lesson: "A reset token is a temporary password — if it can be predicted, account takeover needs no access to the victim's mailbox.",
    impact: "Anyone who can guess the sequence can reset the admin's password and own the entire CRM, locking the real team out in the process.",
    report: { title: 'Password Reset Tokens Are Sequential and Predictable', severity: 'High', remediation: 'Generate reset tokens from a CSPRNG (>=128 bits of entropy), expire them quickly and make them single-use.' },
    guide: "Step by step: 1) Sign in as Sara. 2) POST /forgot with Sara's email, open /mail and note her token (T100001-style). 3) POST /forgot with Rahim's email — his token is the next number in the sequence. 4) POST /reset with his predicted token and a new password while still signed in as Sara. The reset succeeds: the token was guessable.",
    keys: ['reset', 'forgot', 'password reset', 'predictable token', 'reset token'] },
  { id: 'cookie-tamper', feature: 'Login & Authentication', name: 'Session Cookie Tampering (Unsigned Role Cookie)', owasp: 'A07:2021 Auth Failures', difficulty: 'Intermediate', loc: 'Cookie: crm_session -> GET /admin',
    hints: ["Inspect the crm_session cookie — it is just base64. Decode it and see what the server trusts.", "Your role travels inside the cookie, and nothing signs it.", "Decode the cookie, change role to admin, re-encode it, then open /admin. The server believes the cookie, not the database."],
    lesson: "Anything the server trusts from the client — especially a role — must be signed or kept server-side.",
    impact: "Every sales rep (or anyone who steals a session cookie) can promote themselves to admin in seconds: user management, all data, total control.",
    report: { title: 'Unsigned Session Cookie Allows Role Tampering to Admin', severity: 'Critical', remediation: 'Keep roles server-side only; sign session tokens (e.g. HMAC) or use opaque server-side sessions, and verify on every request.' },
    guide: "Step by step: 1) Sign in as Sara and copy the crm_session cookie. 2) Base64-decode it — it contains your uid, name and role. 3) Change role to admin, re-encode, replace the cookie in your browser or curl jar. 4) Open /admin — full admin access with a rep account. The server detects the cookie role granting more than the account's real role.",
    keys: ['cookie', 'session', 'tamper', 'role cookie'] },

  /* ---------- Registration & Profile ---------- */
  { id: 'mass-assignment', feature: 'Registration & Profile', name: 'Mass Assignment — Self-Registration as Admin', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate', loc: 'POST /register, POST /profile',
    hints: ["The registration handler copies submitted fields onto the new account a little too faithfully.", "Accounts have a role field. What happens if the form submits one too?", "POST /register with an extra field role=admin (or add role=admin to a /profile update) — the account becomes an administrator."],
    lesson: "Binding request bodies directly to account objects lets attackers set fields the UI never offered — like role.",
    impact: "Anyone on the internet can register themselves as a CRM admin: no exploit tooling needed, just one extra form field.",
    report: { title: 'Mass Assignment Allows Privilege Escalation to Admin', severity: 'Critical', remediation: 'Bind only whitelisted fields on registration and profile updates; set role and other privileged fields server-side.' },
    guide: "Step by step: 1) Log out. 2) Submit the register form with an added field role=admin (e.g. curl -d 'name=X&email=x@x.local&password=Passw0rd!&role=admin'). 3) The account is created — and signed in — as an admin.",
    keys: ['mass assignment', 'role=admin', 'register admin', 'privilege'] },
  { id: 'weak-password', feature: 'Registration & Profile', name: 'Weak Password Policy (Tiny Passwords Accepted)', owasp: 'A07:2021 Auth Failures', difficulty: 'Beginner', loc: 'POST /register',
    hints: ["How short a password will this CRM accept at sign-up?", "There is no length or complexity check at all.", "Register a new account with the password 'ab' — it is accepted immediately."],
    lesson: "A password policy that accepts anything guarantees some accounts will have guessable passwords.",
    impact: "Combined with the missing login throttling, two-character passwords across the sales team are an open invitation to account takeover.",
    report: { title: 'No Minimum Password Strength Enforced on Registration', severity: 'Medium', remediation: 'Enforce a minimum length (>=10 characters) and block known-common passwords at registration and password change.' },
    guide: "Step by step: 1) On /register create an account with the password 'ab'. 2) The account is created and signed in — the policy accepts anything, and the server records the weak-password finding.",
    keys: ['weak password', 'password policy', 'short password', 'password length'] },
  { id: 'profile-xss', feature: 'Registration & Profile', name: 'Stored XSS via Display Name (Reaches Admin View)', owasp: 'A03:2021 Injection', difficulty: 'Intermediate', loc: 'POST /profile -> header, GET /admin/users',
    hints: ["Your display name is shown in the header of every page — and in the admin user list — without escaping.", "A payload saved once fires for everyone who views it, including admins.", "Set your profile name to <script>alert(1)</script> — it is stored and rendered raw in the header and in /admin/users."],
    lesson: "Stored XSS in a profile field turns every viewer of that profile — including admins — into a victim.",
    impact: "An attacker plants a script in their own name; when an admin opens the user list, the script runs in the admin's browser and can act with the admin's session.",
    report: { title: 'Stored Cross-Site Scripting in User Display Name', severity: 'High', remediation: 'Output-encode all user-controlled data on every render; validate names on input as defence in depth.' },
    guide: "Step by step: 1) Sign in, open /profile. 2) Set your name to <script>alert(1)</script> and save (keep the form's hidden hx_tok field so only this test fires). 3) The payload is stored and echoed unescaped in the page header and the admin user table.",
    keys: ['stored xss', 'profile xss', 'name xss', 'xss name', 'display name'] },
  { id: 'profile-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate', loc: 'POST /profile',
    hints: ["The app's own forms carry a hidden hx_tok marker — but the server never checks it.", "A state-changing POST from another origin, without the marker, still goes through.", "While signed in, POST /profile with a cross-site Origin header and no hx_tok field, changing your email — it is accepted."],
    lesson: "State-changing forms without a verified CSRF token can be submitted by any website the victim visits.",
    impact: "A rep who browses a malicious page while signed in can have their account email silently changed — the first step to full account takeover via password reset.",
    report: { title: 'Cross-Site Request Forgery on Profile Update', severity: 'Medium', remediation: 'Require and verify a per-session CSRF token on every state-changing request; check Origin/Referer as defence in depth.' },
    guide: "Step by step: 1) Sign in as Sara. 2) From a terminal, POST /profile with her session cookie, header Origin: https://evil.example, a new email value, and NO hx_tok field. 3) The email changes — the server accepted a forged cross-site request.",
    keys: ['csrf', 'profile csrf', 'cross-site', 'forgery'] },

  /* ---------- Search ---------- */
  { id: 'search-sqli', feature: 'Search', name: 'SQL Injection in Global Search (Full CRM Dump)', owasp: 'A03:2021 Injection', difficulty: 'Intermediate', loc: 'GET /search',
    hints: ["Normal search only searches your own book of business. The query builder has the same string-concatenation habit as the login.", "Make the search condition always true and see whose records show up.", "Search for ' OR '1'='1 — the results list every rep's leads, contacts and companies, not just yours."],
    lesson: "Injection in a search box is a database-read primitive: one request can return records the user could never list normally.",
    impact: "A single search request dumps the entire client database — every rep's leads and contacts — ready to be sold to a competitor or used for targeted phishing.",
    report: { title: 'SQL Injection in Search Returns All Users\u2019 CRM Records', severity: 'Critical', remediation: "Parameterise all queries; scope search results to the requester's authorised records server-side." },
    guide: "Step by step: 1) Run a normal search first and note you only see your own records. 2) Search for ' OR '1'='1. 3) The results now include other reps' leads and contacts — the injected condition dumped the whole CRM view, and the server detects results containing other reps' records.",
    keys: ['search sqli', 'search injection', 'search sql', 'dump'] },
  { id: 'search-xss', feature: 'Search', name: 'Reflected XSS in Search Results', owasp: 'A03:2021 Injection', difficulty: 'Beginner', loc: 'GET /search',
    hints: ["Your search term is printed back at the top of the results page.", "It is printed exactly as typed — tags and all.", "Search for <script>alert(1)</script> and view the page source: the payload sits unescaped in the results heading."],
    lesson: "Reflected input that is echoed unescaped executes in the victim's browser when they open a crafted link.",
    impact: "An attacker emails a rep a 'search link'; opening it runs script in the rep's authenticated CRM session — actions and data theft follow.",
    report: { title: 'Reflected Cross-Site Scripting in Search Results', severity: 'Medium', remediation: 'Output-encode all reflected input; add a Content-Security-Policy as defence in depth.' },
    guide: "Step by step: 1) Search for <script>alert(1)</script>. 2) The results page reflects it raw inside the 'Results for …' heading — a shared link with this search would execute in a victim's browser.",
    keys: ['reflected xss', 'search xss', 'xss search'] },

  /* ---------- Leads & Contacts ---------- */
  { id: 'lead-idor', feature: 'Leads & Contacts', name: "IDOR — Read Another Rep's Lead", owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner', loc: 'GET /leads/{id}',
    hints: ["Lead URLs are simple sequential IDs.", "Your list only shows your leads — but the detail page never checks ownership.", "Open a lead that belongs to Rahim (e.g. /leads/2) while signed in as Sara — his lead, phone and email are served to you."],
    lesson: "Hiding records in lists is not authorisation — every object access must check ownership server-side.",
    impact: "Reps can read the whole company's lead pool: a departing employee can walk away with every prospect's contact details.",
    report: { title: 'Insecure Direct Object Reference on Lead Records', severity: 'High', remediation: 'Enforce object-level authorisation on every record access (owner or admin), for reads and writes alike.' },
    guide: "Step by step: 1) Sign in as Sara and note your own lead IDs from /leads. 2) Browse to /leads/2 — Rahim's lead. 3) His lead details, phone and email are fully served although you are neither the owner nor an admin.",
    keys: ['lead idor', 'idor lead', 'read lead', 'other lead'] },
  { id: 'lead-owner-steal', feature: 'Leads & Contacts', name: 'Lead Theft via Owner Mass Assignment', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate', loc: 'POST /leads/{id}/update',
    hints: ["The lead update handler applies every field it is given — including one the UI barely shows.", "A lead's ownerId decides whose pipeline it lands in. What if you post it yourself?", "POST to another rep's lead update with ownerId set to your own user id — the lead is reassigned to you."],
    lesson: "If the server accepts an owner field from the client, record ownership — and the commission attached to it — is up for grabs.",
    impact: "A dishonest rep can silently steal the best leads (and their future deals) from colleagues days before they close.",
    report: { title: 'Lead Reassignment via Mass Assignment (Lead Theft)', severity: 'High', remediation: 'Whitelist editable fields per role; ownership changes must require manager/admin rights and be audit-logged.' },
    guide: "Step by step: 1) Note your user id (Sara = 2). 2) POST /leads/5/update with ownerId=2. 3) Rahim's lead is reassigned to you — it appears in your list and counts toward your pipeline.",
    keys: ['steal lead', 'lead theft', 'reassign', 'ownerid', 'lead owner'] },

  /* ---------- Deals & Pipeline ---------- */
  { id: 'deal-idor', feature: 'Deals & Pipeline', name: "IDOR — Read Another Rep's Deal", owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner', loc: 'GET /deals/{id}',
    hints: ["Same pattern as the leads: sequential IDs, no ownership check on the detail page.", "Deal pages show value, stage and probability — exactly the intel a competitor wants.", "Open /deals/2 (Rahim's big deal) as Sara — the full deal is served."],
    lesson: "Deal data is commercially sensitive; object-level authorisation must cover reads, not just edits.",
    impact: "Anyone with a login can map the company's entire pipeline: who is buying, for how much, and at what stage — priceless to a competitor.",
    report: { title: 'Insecure Direct Object Reference on Deal Records', severity: 'High', remediation: 'Enforce object-level authorisation on every deal access (owner or admin).' },
    guide: "Step by step: 1) Sign in as Sara. 2) Open /deals/2. 3) Rahim's deal — value, stage, probability — is fully visible to you.",
    keys: ['deal idor', 'idor deal', 'read deal', 'other deal'] },
  { id: 'deal-value-tamper', feature: 'Deals & Pipeline', name: "Deal Value Tampering by a Non-Owner", owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate', loc: 'POST /deals/{id}/update',
    hints: ["The deal update endpoint never asks whether the deal is yours.", "Values feed forecasts and commission — and anyone can rewrite them.", "POST an update to Rahim's deal setting value=1 — the server accepts your number for his deal."],
    lesson: "Write endpoints need the same ownership checks as reads; otherwise your reporting data is fiction.",
    impact: "Forecasts, board reports and commission calculations can be silently falsified — management makes decisions on numbers any rep can edit.",
    report: { title: "Unauthorised Modification of Other Reps' Deal Values", severity: 'High', remediation: 'Check ownership (or admin role) on every write; validate values server-side and audit-log all changes.' },
    guide: "Step by step: 1) As Sara, note Rahim's deal 2 value ($54,000). 2) POST /deals/2/update with value=1. 3) The deal now shows $1 — a non-owner rewrote the company forecast, and the server detects the cross-owner write.",
    keys: ['value tamper', 'deal value', 'tamper value', 'change value'] },
  { id: 'deal-owner-massassign', feature: 'Deals & Pipeline', name: 'Deal Owner Mass Assignment (Deal Theft)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate', loc: 'POST /deals/{id}/update',
    hints: ["Just like leads, the deal update handler trusts an ownerId field.", "Stealing the deal steals its value from the other rep's pipeline report — and their commission.", "POST /deals/4/update with ownerId=2 — Rahim's $89k deal moves into Sara's pipeline."],
    lesson: "Ownership fields must never be client-writable outside a dedicated, authorised transfer flow.",
    impact: "High-value deals can be reassigned the day before they close, diverting commission and corrupting every per-rep report.",
    report: { title: 'Deal Ownership Reassignment via Mass Assignment', severity: 'High', remediation: 'Whitelist editable fields; ownership transfer must be an explicit, authorised and logged action.' },
    guide: "Step by step: 1) As Sara (user id 2), POST /deals/4/update with ownerId=2. 2) The deal's owner changes to you — it now appears in your pipeline and your reports.",
    keys: ['deal owner', 'steal deal', 'deal theft', 'reassign deal'] },
  { id: 'deal-stage-skip', feature: 'Deals & Pipeline', name: "Pipeline Manipulation — Stage Skipping Straight to 'Won'", owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate', loc: 'POST /deals/{id}/update',
    hints: ["Deals are supposed to move one stage at a time — and closing as Won should only happen from Negotiation.", "The server accepts any stage you post, from anywhere.", "Take your own Prospecting deal (deal 3) and POST stage=Won — it jumps straight to Won and inflates your won revenue."],
    lesson: "Business workflows are security controls too: if the server doesn't enforce the state machine, the process is fiction.",
    impact: "Reps can fabricate 'won' revenue to hit targets and bonuses, while management reports phantom income to the board.",
    report: { title: "Business-Logic Flaw Allows Skipping Pipeline Stages to 'Won'", severity: 'Medium', remediation: 'Enforce a server-side stage-transition state machine; require manager approval to close deals as Won.' },
    guide: "Step by step: 1) Open your deal 3 (stage: Prospecting). 2) POST /deals/3/update with stage=Won. 3) The deal closes as Won instantly — no qualification, proposal or negotiation ever happened — and your won-revenue jumps.",
    keys: ['stage', 'won', 'pipeline manipulation', 'skip', 'close deal'] },

  /* ---------- Notes & Activities ---------- */
  { id: 'note-idor', feature: 'Notes & Activities', name: "IDOR — Read Another Rep's Private Note", owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner', loc: 'GET /notes/{id}',
    hints: ["Notes can be marked private — but privacy here is only a label.", "The note page serves any note ID to any signed-in user.", "Open /notes/2 as Sara — Rahim's private note, including the confidential budget detail, is shown."],
    lesson: "A 'private' flag means nothing unless the server enforces it on every read.",
    impact: "Negotiation ceilings, discount limits and internal assessments leak to anyone with a login — exactly the details clients trusted the CRM to protect.",
    report: { title: 'Private Notes Exposed Through Insecure Direct Object Reference', severity: 'High', remediation: "Authorise every note read against the note's author, the linked record's owner and the privacy flag." },
    guide: "Step by step: 1) Sign in as Sara. 2) Open /notes/2. 3) Rahim's note marked private — with the client's confidential budget ceiling — is fully readable.",
    keys: ['note idor', 'private note', 'read note', 'note'] },
  { id: 'note-xss', feature: 'Notes & Activities', name: 'Stored XSS in Note Body', owasp: 'A03:2021 Injection', difficulty: 'Intermediate', loc: 'POST /notes -> deal & lead pages',
    hints: ["Notes are rendered as HTML on deal and lead pages so reps can use light formatting.", "That means markup you save is markup the next viewer runs.", "Add a note to one of your deals with body <img src=x onerror=alert(1)> — it is stored and rendered raw on the deal page."],
    lesson: "Any rich-text rendering of user input without sanitisation is a stored-XSS delivery system aimed at colleagues.",
    impact: "A malicious note on a popular deal fires in every viewer's browser — including managers — enabling session theft and actions taken as the victim.",
    report: { title: 'Stored Cross-Site Scripting in CRM Notes', severity: 'High', remediation: 'Render note bodies as plain text (output-encode) or sanitise with a strict allowlist sanitiser.' },
    guide: "Step by step: 1) Open one of your deals and add a note with body <img src=x onerror=alert(1)>. 2) Reload the deal page — the payload sits in the page unescaped, ready to fire for any viewer. The server detects the stored payload at save time.",
    keys: ['note xss', 'stored xss note', 'xss note'] },

  /* ---------- Import & Export ---------- */
  { id: 'export-full-db', feature: 'Import & Export', name: 'Full Contact Database Export by Any Rep', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner', loc: 'GET /export/contacts.csv',
    hints: ["The export was built for admins migrating data. Who can actually call it?", "The endpoint checks that you are signed in — and nothing else.", "As Sara, open /export/contacts.csv — you download every rep's contacts, not just yours."],
    lesson: "Bulk-export endpoints are data-exfiltration features unless they are role-gated and row-scoped.",
    impact: "The entire client contact database — the company's most valuable asset — leaves in a single click, with no alert and no trace.",
    report: { title: 'Unauthorised Export of the Entire Contact Database', severity: 'Critical', remediation: "Restrict exports to admins, scope exported rows to the requester's authorisation, rate-limit and audit every export." },
    guide: "Step by step: 1) Sign in as Sara. 2) Open /export/contacts.csv. 3) The CSV contains all contacts across all reps — the server detects rows owned by other reps in your download.",
    keys: ['export', 'csv export', 'download contacts', 'database export'] },
  { id: 'csv-injection', feature: 'Import & Export', name: 'CSV Formula Injection via Lead Import', owasp: 'A03:2021 Injection', difficulty: 'Intermediate', loc: 'POST /import/leads',
    hints: ["Imported leads are later exported and opened in Excel by the sales team.", "Spreadsheet applications execute cells that begin with certain characters.", "Import a lead whose name starts with = (e.g. =2+5) — it is stored verbatim, ready to execute as a formula when exported and opened."],
    lesson: "CSV is code to a spreadsheet: unsanitised fields starting with =, +, - or @ become formulas on the victim's machine.",
    impact: "A booby-trapped 'lead' imported today executes in a manager's spreadsheet tomorrow — a quiet path from data entry to workstation compromise.",
    report: { title: 'CSV / Formula Injection Through Lead Import', severity: 'Medium', remediation: "Sanitise imported and exported CSV fields: prefix cells starting with =, +, -, @, tab or CR with a single quote." },
    guide: "Step by step: 1) Open /import and paste a CSV row whose name is =2+5 (plus any email and company). 2) Import — the lead is stored with the formula intact. 3) When a rep later exports leads and opens the file, the formula executes in their spreadsheet application.",
    keys: ['csv injection', 'formula', 'import', 'spreadsheet'] },

  /* ---------- Reports ---------- */
  { id: 'report-idor', feature: 'Reports', name: "IDOR — View Another Rep's Performance Report", owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner', loc: 'GET /reports/rep/{id}',
    hints: ["Per-rep report URLs contain the rep's user id.", "Your own report is under /reports — the per-rep URL pattern is easy to guess.", "Open /reports/rep/3 as Sara — Rahim's full performance report, deals and revenue are shown."],
    lesson: "Reports aggregate the most sensitive commercial data — they need the same authorisation as the records behind them.",
    impact: "Competitors inside the company (or a phished account) can benchmark every rep's pipeline and target the biggest deals and clients.",
    report: { title: 'Insecure Direct Object Reference on Sales Performance Reports', severity: 'Medium', remediation: "Authorise report access: reps see their own report; managers and admins see their team's." },
    guide: "Step by step: 1) Sign in as Sara and view your report at /reports. 2) Change the URL to /reports/rep/3. 3) Rahim's pipeline value, won revenue and deal list are displayed.",
    keys: ['report idor', 'rep report', 'performance', 'report'] },

  /* ---------- Admin Panel ---------- */
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'CSRF on Admin Role Management', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced', loc: 'POST /admin/users/{id}/role',
    hints: ["Admin actions change state with a simple POST — and the hx_tok marker is never verified there either.", "If an admin's browser can be made to send the request, the server will obey it.", "As admin, POST /admin/users/4/role with role=admin, a cross-site Origin and no hx_tok — Nadia is promoted by a forged request."],
    lesson: "The more powerful the action, the more dangerous a missing CSRF check — role changes are account-takeover primitives.",
    impact: "One malicious page view by the CRM admin can silently promote an attacker's account to admin — game over for the whole platform.",
    report: { title: 'Cross-Site Request Forgery on Admin Role Changes', severity: 'High', remediation: 'Verify CSRF tokens on all admin actions; require re-authentication for role changes.' },
    guide: "Step by step: 1) Sign in as the real admin. 2) POST /admin/users/4/role with role=admin, header Origin: https://evil.example and NO hx_tok field. 3) Nadia's role changes to admin — a forged cross-site request performed a privileged action, and the server detects it.",
    keys: ['admin csrf', 'csrf admin', 'role csrf', 'promote csrf'] },

  /* ---------- Platform & API ---------- */
  { id: 'api-token-weak', feature: 'Platform & API', name: 'Predictable API Token (crm-<userId>)', owasp: 'A07:2021 Auth Failures', difficulty: 'Intermediate', loc: 'GET /api/leads',
    hints: ["Your API token is shown on your profile. Look at its format.", "Tokens follow a fixed pattern built from something you already know about other users.", "Sara's token is crm-2. Guess Rahim's and call /api/leads with header X-API-Key: crm-3 while signed in as Sara — his leads come back."],
    lesson: "An API token must be an unguessable secret; deriving it from a public identifier makes it a username, not a credential.",
    impact: "Anyone can script the whole CRM's data out through the API, one predictable token per employee — no password needed at all.",
    report: { title: 'Predictable API Tokens Allow Cross-User Data Access', severity: 'High', remediation: 'Issue random, high-entropy API tokens; store them hashed, scope them per user and support revocation.' },
    guide: "Step by step: 1) Open /profile as Sara — her token follows the pattern crm-<userId>. 2) curl /api/leads with Sara's session cookie and header X-API-Key: crm-3. 3) The API returns Rahim's leads — the token was trivially guessable, and the server detects the cross-user token use.",
    keys: ['api', 'api key', 'api token', 'crm-'] },
  { id: 'missing-headers', feature: 'Platform & API', name: 'Missing HTTP Security Headers', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner', loc: 'GET / (scanner-style probe)',
    hints: ["Check what protective headers the app sends — any scanner flags this instantly.", "There is no Content-Security-Policy, no X-Frame-Options, no X-Content-Type-Options.", "Send a request to / with the header X-Security-Audit: 1 (a scanner-style probe) — the response confirms every protective header is missing."],
    lesson: "Security headers are cheap, broad protection: without them the app can be framed for clickjacking and MIME-sniffed into executing uploads as code.",
    impact: "Attackers can embed the CRM in a hostile page and trick reps into clicking through real actions — with the rep's own session doing the work.",
    report: { title: 'Missing HTTP Security Headers', severity: 'Low', remediation: 'Add Content-Security-Policy, X-Frame-Options / frame-ancestors, X-Content-Type-Options: nosniff, Referrer-Policy and HSTS (on HTTPS).' },
    guide: "Step by step: 1) curl -i http://127.0.0.1:3021/ with the extra header X-Security-Audit: 1. 2) Inspect the response: no CSP, no X-Frame-Options, no nosniff header — the audit probe flips the test.",
    keys: ['headers', 'security headers', 'csp', 'clickjacking', 'missing headers'] }
];

/* more encoded key fragments (see note at the top of this file) */
const _eB = ['V1A5OA==', 'LUs0VQ=='];
const _cB = ['US0zMQ==', 'Wk45WQ=='];

/* ============================== progress engine ============================== */
const FEATURE_ORDER = [...new Set(TESTS.map(t => t.feature))];
function defaultProgress() { return { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false }; }
function loadProgress() {
  try { return Object.assign(defaultProgress(), JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'))); }
  catch (e) { return defaultProgress(); }
}
let progress = loadProgress();
function saveProgress() { try { fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2)); } catch (e) {} }
function pass(id) {
  if (!progress.tests[id]) {
    progress.tests[id] = true;
    if (TESTS.every(t => progress.tests[t.id])) {
      if (!progress.completedAt) progress.completedAt = new Date().toISOString();
      progress.keyRevealed = true;
    }
    saveProgress();
  }
}
function attempt(feature) { progress.attempts[feature] = (progress.attempts[feature] || 0) + 1; saveProgress(); }
function summary() {
  const total = TESTS.length;
  const done = TESTS.filter(t => progress.tests[t.id]).length;
  const features = {};
  for (const f of FEATURE_ORDER) {
    const ts = TESTS.filter(t => t.feature === f);
    features[f] = { total: ts.length, done: ts.filter(t => progress.tests[t.id]).length, attempts: progress.attempts[f] || 0 };
  }
  return { lab: LAB_NAME, number: LAB_NUMBER, total, done, pct: total ? Math.floor(done / total * 100) : 0, features, complete: done === total };
}

/* ============================== helpers ============================== */
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const XSS_RE = /<\s*script|<\s*svg|<\s*img[^>]*on\w+\s*=|<\s*iframe|on\w+\s*=\s*['"]?\s*(alert|prompt|confirm)|javascript\s*:/i;
const SQLI_RE = /('\s*or\s*'?\d+'?\s*=\s*'?\d+)|('\s*or\s+'[^']*'\s*=\s*'[^']*)|('\s*or\s+1\s*=\s*1)|(--)/i;
const userById = id => DB.users.find(u => u.id === Number(id));
const companyById = id => DB.companies.find(c => c.id === Number(id));
const money = n => '$' + Number(n || 0).toLocaleString('en-US');

/* ============================== layout & chat widget ============================== */
function chatWidget() {
  return `<div id="hxchat">
  <div id="hxchat-head">💬 Lab Coach — LAB ${LAB_NUMBER}</div>
  <div id="hxchat-body"></div>
  <div id="hxchat-row"><input id="hxchat-in" placeholder="Ask the Lab Coach…"><button id="hxchat-send" type="button">Send</button></div>
</div>
<style>
#hxchat{position:fixed;right:16px;bottom:16px;width:330px;background:#14141d;color:#eee;border:1px solid #3a3a55;border-radius:10px;font-family:'Segoe UI',Arial,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.45);z-index:999}
#hxchat-head{padding:10px 12px;cursor:pointer;font-weight:600;background:#23233a;border-radius:10px 10px 0 0}
#hxchat-body{display:none;max-height:300px;overflow-y:auto;padding:10px 12px;font-size:13px}
#hxchat-row{display:none;padding:8px;gap:6px}
#hxchat-in{flex:1;padding:7px;border-radius:6px;border:1px solid #3a3a55;background:#0e0e16;color:#eee}
#hxchat-send{padding:7px 12px;border:0;border-radius:6px;background:#6c4bd8;color:#fff;cursor:pointer}
.hxmsg{margin:0 0 8px;line-height:1.45;white-space:pre-wrap;word-break:break-word}
</style>
<script>
(function(){
  var body=document.getElementById('hxchat-body'), inp=document.getElementById('hxchat-in'), btn=document.getElementById('hxchat-send'), head=document.getElementById('hxchat-head'), row=document.getElementById('hxchat-row');
  function add(who,text){ var d=document.createElement('div'); d.className='hxmsg'; var b=document.createElement('b'); b.textContent=who+': '; d.appendChild(b); d.appendChild(document.createTextNode(text)); body.appendChild(d); body.scrollTop=body.scrollHeight; }
  head.onclick=function(){ var open=body.style.display==='none'||body.style.display===''; body.style.display=open?'block':'none'; row.style.display=open?'flex':'none'; };
  function send(){ var m=inp.value.trim(); if(!m) return; inp.value=''; add('You',m);
    fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})})
    .then(function(r){ return r.json(); }).then(function(j){ add('Coach', j.reply||'No reply.'); })
    .catch(function(){ add('Coach','Chat is unavailable right now.'); }); }
  btn.onclick=send; inp.addEventListener('keydown',function(e){ if(e.key==='Enter') send(); });
  add('Coach','Hi! I am the Lab Coach for LAB ${LAB_NUMBER} — ${LAB_NAME}. Ask me how many tests a feature has, or how to approach a test — but step-by-step help for a feature unlocks only after you have tried that feature at least 3 times.');
})();
</script>`;
}

function layout(sess, title, inner) {
  const s = summary();
  const pct = s.pct;
  const nav = sess ? `<nav>
    <a href="/">Dashboard</a> <a href="/leads">Leads</a> <a href="/deals">Deals</a> <a href="/contacts">Contacts</a>
    <a href="/companies">Companies</a> <a href="/search">Search</a> <a href="/reports">Reports</a> <a href="/import">Import</a>
    <a href="/export/contacts.csv">Export</a> <a href="/mail">Mail</a> <a href="/profile">Profile</a> <a href="/admin">Admin</a>
    <a href="/logout">Log out</a></nav>` : `<nav><a href="/login">Log in</a> <a href="/register">Register</a></nav>`;
  // NOTE: the signed-in name below is rendered RAW on purpose — it is the stored-XSS sink for the profile-xss test.
  const who = sess ? `<div class="who">Signed in as ${sess.name} · role: ${esc(sess.role)} · <a href="/tests">🎯 Tests</a> · <a href="/complete">🏆 Complete</a></div>` : '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)} · LAB ${LAB_NUMBER} — ${LAB_NAME}</title>
<style>
body{font-family:'Segoe UI',Arial,sans-serif;background:#0f0f16;color:#e8e8f2;margin:0}
header{background:#171724;border-bottom:1px solid #2c2c44;padding:10px 18px}
header .row{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
header img{height:34px}
header .lab{font-weight:700;font-size:17px}
.pbar{flex:1;min-width:180px;background:#262640;border-radius:8px;height:18px;overflow:hidden;position:relative}
.pbar i{display:block;height:100%;background:linear-gradient(90deg,#6c4bd8,#2f9e6e)}
.pbar span{position:absolute;inset:0;font-size:11px;text-align:center;line-height:18px;color:#fff}
nav{margin-top:8px} nav a{color:#a9b7ff;margin-right:12px;text-decoration:none;font-size:14px} nav a:hover{text-decoration:underline}
.who{font-size:12px;color:#9a9ab0;margin-top:4px} .who a{color:#a9b7ff}
main{max-width:1060px;margin:0 auto;padding:20px 16px 90px}
.card{background:#171724;border:1px solid #2c2c44;border-radius:10px;padding:14px 16px;margin:0 0 14px}
input,select,textarea{background:#0e0e16;color:#eee;border:1px solid #3a3a55;border-radius:6px;padding:8px;width:100%;box-sizing:border-box;margin:4px 0 10px}
button,.btn{background:#6c4bd8;color:#fff;border:0;border-radius:6px;padding:9px 16px;cursor:pointer;text-decoration:none;display:inline-block}
table{width:100%;border-collapse:collapse} th,td{border-bottom:1px solid #2c2c44;padding:7px 8px;text-align:left;font-size:14px}
.err{background:#4a1f28;border:1px solid #a33;color:#ffd7dd;padding:9px 12px;border-radius:8px;margin-bottom:12px}
.ok{background:#1d3a29;border:1px solid #2f9e6e;color:#c9f2da;padding:9px 12px;border-radius:8px;margin-bottom:12px}
.mut{color:#9a9ab0;font-size:13px} .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.board{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}
.stage{background:#12121c;border:1px solid #2c2c44;border-radius:8px;padding:8px}
.deal{background:#1d1d2e;border:1px solid #34345a;border-radius:8px;padding:8px;margin:0 0 8px;font-size:13px}
details{margin:4px 0} summary{cursor:pointer;color:#a9b7ff;font-size:13px}
code{background:#262640;padding:2px 6px;border-radius:4px}
@media print{ #hxchat, nav, .who { display:none } }
</style></head><body>
<header><div class="row"><img src="/logo.png" alt="HexaCyberLab"><span class="lab">LAB ${LAB_NUMBER} — ${LAB_NAME}</span>
<div class="pbar"><i style="width:${pct}%"></i><span>LAB ${LAB_NUMBER} · ${s.done}/${s.total} tests · ${pct}%</span></div></div>
${nav}${who}</header>
<main><h1>${esc(title)}</h1>${inner}</main>
${chatWidget()}
</body></html>`;
}

function gatePage(err) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ${LAB_NUMBER} — ${LAB_NAME} · Locked</title>
<style>body{font-family:'Segoe UI',Arial,sans-serif;background:#14141d;color:#eee;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center}
.box{background:#1d1d2e;border:1px solid #34345a;border-radius:12px;padding:28px;max-width:430px;text-align:center}
img{height:56px} input{width:100%;padding:10px;border-radius:6px;border:1px solid #3a3a55;background:#0e0e16;color:#eee;box-sizing:border-box;margin:10px 0}
button{background:#6c4bd8;color:#fff;border:0;border-radius:6px;padding:10px 18px;cursor:pointer;width:100%}
.err{background:#4a1f28;border:1px solid #a33;color:#ffd7dd;padding:8px;border-radius:8px;margin-bottom:10px}</style></head><body>
<div class="box"><img src="/logo.png" alt="HexaCyberLab">
<h2>LAB ${LAB_NUMBER} — ${LAB_NAME}</h2>
<p>🔒 This lab is locked. Paste the completion key from ${PREV_LAB} to start.</p>
${err ? '<div class="err">That key was not accepted. Check it and try again.</div>' : ''}
<form method="POST" action="/unlock"><input name="key" placeholder="Paste the Lab 11 completion key" autocomplete="off"><button type="submit">Unlock Lab ${LAB_NUMBER}</button></form>
<p style="color:#9a9ab0;font-size:13px">HexaCyberLab practice labs run in order — each lab's completion key unlocks the next.</p></div>
${chatWidget()}
</body></html>`;
}

/* ============================== auth pages ============================== */
function loginPage(msg) {
  return layout(null, 'Log in', `
  ${msg ? `<div class="${/Incorrect|No account/.test(msg) ? 'err' : 'ok'}">${esc(msg)}</div>` : ''}
  <div class="card"><form method="POST" action="/login">
  <label>Email</label><input name="email" type="email" required>
  <label>Password</label><input name="password" type="password" required>
  <button type="submit">Log in</button></form>
  <p class="mut"><a href="/forgot">Forgot password?</a> · <a href="/register">Create an account</a></p>
  <p class="mut">Seed accounts: admin@hexacrm.local / Admin@123 · sara@hexacrm.local / Sara@123 · rahim@hexacrm.local / Rahim@123 · nadia@hexacrm.local / Nadia@123</p></div>`);
}
function registerPage(msg) {
  return layout(null, 'Create your HexaCRM account', `
  ${msg ? `<div class="err">${esc(msg)}</div>` : ''}
  <div class="card"><form method="POST" action="/register">
  <label>Full name</label><input name="name" required>
  <label>Email</label><input name="email" type="email" required>
  <label>Password</label><input name="password" type="password" required>
  <button type="submit">Register</button></form>
  <p class="mut">New accounts are created with the sales-rep role.</p></div>`);
}
function forgotPage(msg) {
  return layout(null, 'Forgot password', `
  ${msg ? `<div class="ok">${esc(msg)}</div>` : ''}
  <div class="card"><form method="POST" action="/forgot">
  <label>Account email</label><input name="email" type="email" required>
  <button type="submit">Send reset link</button></form>
  <p class="mut">Reset links are delivered to the lab mailbox — sign in and open <b>Mail</b> to read yours.</p></div>`);
}
function resetPage(msg) {
  return layout(null, 'Reset password', `
  ${msg ? `<div class="err">${esc(msg)}</div>` : ''}
  <div class="card"><form method="POST" action="/reset">
  <label>Reset token (from your email)</label><input name="token" required>
  <label>New password</label><input name="password" type="password" required>
  <button type="submit">Set new password</button></form></div>`);
}
function mailPage(sess) {
  const mine = mailLog.filter(m => m.to === sess.user.email);
  const rows = mine.length ? mine.map(m => `<tr><td>${esc(m.at)}</td><td>Password reset requested</td><td>Reset token: <code>${esc(m.token)}</code> — use it at <a href="/reset">/reset</a></td></tr>`).join('') : '<tr><td colspan="3" class="mut">No mail yet. Request a reset from the Forgot password page.</td></tr>';
  return layout(sess, 'Lab Mailbox', `<div class="card"><p class="mut">Simulated inbox for ${esc(sess.user.email)} (lab only).</p><table><tr><th>When</th><th>Subject</th><th>Body</th></tr>${rows}</table></div>`);
}

/* ============================== app pages ============================== */
function dashboardPage(sess) {
  const uid = sess.user.id;
  const mine = DB.deals.filter(d => d.ownerId === uid);
  const open = mine.filter(d => !['Won', 'Lost'].includes(d.stage));
  const won = mine.filter(d => d.stage === 'Won');
  const myLeads = DB.leads.filter(l => l.ownerId === uid);
  const stages = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost'];
  const stageRows = stages.map(st => { const ds = mine.filter(d => d.stage === st); return `<tr><td>${st}</td><td>${ds.length}</td><td>${money(ds.reduce((a, d) => a + d.value, 0))}</td></tr>`; }).join('');
  const acts = DB.activities.filter(a => a.ownerId === uid).map(a => `<li>${esc(a.type)} — ${esc(a.subject)} ${a.done ? '✓' : '(open)'}</li>`).join('') || '<li class="mut">None</li>';
  return layout(sess, `Dashboard — ${LAB_NAME}`, `
  <div class="grid">
    <div class="card"><h3>My open pipeline</h3><p style="font-size:22px">${money(open.reduce((a, d) => a + d.value, 0))}</p><p class="mut">${open.length} open deals</p></div>
    <div class="card"><h3>My won revenue</h3><p style="font-size:22px">${money(won.reduce((a, d) => a + d.value, 0))}</p><p class="mut">${won.length} deals won</p></div>
    <div class="card"><h3>My leads</h3><p style="font-size:22px">${myLeads.length}</p><p class="mut"><a href="/leads">Open leads</a></p></div>
    <div class="card"><h3>Lab progress</h3><p style="font-size:22px">${summary().pct}%</p><p class="mut"><a href="/tests">Open the 🎯 Tests page</a></p></div>
  </div>
  <div class="card"><h3>My pipeline by stage</h3><table><tr><th>Stage</th><th>Deals</th><th>Value</th></tr>${stageRows}</table></div>
  <div class="card"><h3>My activities</h3><ul>${acts}</ul></div>`);
}

function notesHtml(entityType, entityId) {
  const ns = DB.notes.filter(n => n.entityType === entityType && n.entityId === entityId);
  if (!ns.length) return '<p class="mut">No notes yet.</p>';
  // NOTE: note bodies are rendered RAW on purpose — the stored-XSS sink for the note-xss test.
  return ns.map(n => { const a = userById(n.authorId); return `<div class="card"><div class="mut">Note #${n.id} by ${esc(a ? a.name : '?')}${n.priv ? ' · 🔒 private' : ''} · <a href="/notes/${n.id}">open</a></div><div>${n.body}</div></div>`; }).join('');
}
function noteForm(entityType, entityId, tok) {
  return `<div class="card"><h3>Add a note</h3><form method="POST" action="/notes">
  <input type="hidden" name="hx_tok" value="${esc(tok)}">
  <input type="hidden" name="entityType" value="${entityType}"><input type="hidden" name="entityId" value="${entityId}">
  <textarea name="body" rows="3" placeholder="Write a note… (light HTML allowed)" required></textarea>
  <label><input type="checkbox" name="priv" value="1" style="width:auto"> Private note</label><br>
  <button type="submit">Save note</button></form></div>`;
}

function leadsListPage(sess) {
  const rows = DB.leads.filter(l => sess.user.role === 'admin' || l.ownerId === sess.user.id)
    .map(l => { const o = userById(l.ownerId); return `<tr><td><a href="/leads/${l.id}">${esc(l.name)}</a></td><td>${esc(l.company)}</td><td>${esc(l.email)}</td><td>${esc(l.status)}</td><td>${esc(o ? o.name : '?')}</td></tr>`; }).join('');
  return layout(sess, 'Leads', `<div class="card"><table><tr><th>Lead</th><th>Company</th><th>Email</th><th>Status</th><th>Owner</th></tr>${rows}</table>
  <p class="mut">Showing ${sess.user.role === 'admin' ? 'all' : 'your'} leads. Import more from the <a href="/import">Import</a> page.</p></div>`);
}
function leadDetailPage(sess, lead, tok) {
  const o = userById(lead.ownerId);
  const userOpts = DB.users.map(u => `<option value="${u.id}" ${u.id === lead.ownerId ? 'selected' : ''}>${esc(u.name)}</option>`).join('');
  return layout(sess, `Lead — ${lead.name}`, `
  <div class="card"><table>
  <tr><th>Company</th><td>${esc(lead.company)}</td></tr><tr><th>Email</th><td>${esc(lead.email)}</td></tr>
  <tr><th>Phone</th><td>${esc(lead.phone)}</td></tr><tr><th>Status</th><td>${esc(lead.status)}</td></tr>
  <tr><th>Source</th><td>${esc(lead.source)}</td></tr><tr><th>Owner</th><td>${esc(o ? o.name : '?')}</td></tr></table></div>
  <div class="card"><h3>Update lead</h3><form method="POST" action="/leads/${lead.id}/update">
  <input type="hidden" name="hx_tok" value="${esc(tok)}">
  <label>Name</label><input name="name" value="${esc(lead.name)}">
  <label>Email</label><input name="email" value="${esc(lead.email)}">
  <label>Company</label><input name="company" value="${esc(lead.company)}">
  <label>Phone</label><input name="phone" value="${esc(lead.phone)}">
  <label>Status</label><select name="status">${['New', 'Contacted', 'Qualified', 'Dead'].map(s => `<option ${s === lead.status ? 'selected' : ''}>${s}</option>`).join('')}</select>
  <label>Owner</label><select name="ownerId">${userOpts}</select>
  <button type="submit">Save changes</button></form></div>
  <h3>Notes</h3>${notesHtml('lead', lead.id)}${noteForm('lead', lead.id, tok)}`);
}

function contactsPage(sess) {
  const rows = DB.contacts.filter(c => sess.user.role === 'admin' || c.ownerId === sess.user.id)
    .map(c => { const co = companyById(c.companyId); const o = userById(c.ownerId); return `<tr><td>${esc(c.name)}</td><td>${esc(c.email)}</td><td>${esc(c.phone)}</td><td>${co ? `<a href="/companies/${co.id}">${esc(co.name)}</a>` : ''}</td><td>${esc(o ? o.name : '?')}</td></tr>`; }).join('');
  return layout(sess, 'Contacts', `<div class="card"><table><tr><th>Name</th><th>Email</th><th>Phone</th><th>Company</th><th>Owner</th></tr>${rows}</table>
  <p class="mut"><a href="/export/contacts.csv">⬇ Export contacts (CSV)</a> · <a href="/export/leads.csv">⬇ Export leads (CSV)</a></p></div>`);
}
function companiesPage(sess) {
  const rows = DB.companies.map(c => { const o = userById(c.ownerId); return `<tr><td><a href="/companies/${c.id}">${esc(c.name)}</a></td><td>${esc(c.industry)}</td><td>${esc(o ? o.name : '?')}</td></tr>`; }).join('');
  return layout(sess, 'Companies', `<div class="card"><table><tr><th>Company</th><th>Industry</th><th>Account owner</th></tr>${rows}</table></div>`);
}
function companyDetailPage(sess, company) {
  const cs = DB.contacts.filter(c => c.companyId === company.id).map(c => `<li>${esc(c.name)} — ${esc(c.email)}</li>`).join('') || '<li class="mut">None</li>';
  const ds = DB.deals.filter(d => d.companyId === company.id).map(d => `<li><a href="/deals/${d.id}">${esc(d.title)}</a> — ${money(d.value)} (${esc(d.stage)})</li>`).join('') || '<li class="mut">None</li>';
  return layout(sess, `Company — ${company.name}`, `<div class="card"><p>Industry: ${esc(company.industry)}</p><h3>Contacts</h3><ul>${cs}</ul><h3>Deals</h3><ul>${ds}</ul></div>`);
}

const STAGES = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost'];
function dealsPage(sess) {
  const mine = DB.deals.filter(d => sess.user.role === 'admin' || d.ownerId === sess.user.id);
  const cols = STAGES.map(st => { const ds = mine.filter(d => d.stage === st); return `<div class="stage"><h4>${st}</h4>${ds.map(d => `<div class="deal"><a href="/deals/${d.id}">${esc(d.title)}</a><br>${money(d.value)} · ${esc((userById(d.ownerId) || {}).name || '')}</div>`).join('') || '<p class="mut">—</p>'}</div>`; }).join('');
  return layout(sess, 'Sales Pipeline', `<div class="board">${cols}</div><p class="mut">Board shows ${sess.user.role === 'admin' ? 'all' : 'your'} deals.</p>`);
}
function dealDetailPage(sess, deal, tok) {
  const co = companyById(deal.companyId); const o = userById(deal.ownerId);
  const userOpts = DB.users.map(u => `<option value="${u.id}" ${u.id === deal.ownerId ? 'selected' : ''}>${esc(u.name)}</option>`).join('');
  return layout(sess, `Deal — ${deal.title}`, `
  <div class="card"><table>
  <tr><th>Company</th><td>${co ? esc(co.name) : ''}</td></tr><tr><th>Value</th><td>${money(deal.value)}</td></tr>
  <tr><th>Stage</th><td>${esc(deal.stage)}</td></tr><tr><th>Win probability</th><td>${deal.probability}%</td></tr>
  <tr><th>Owner</th><td>${esc(o ? o.name : '?')}</td></tr></table></div>
  <div class="card"><h3>Update deal</h3><form method="POST" action="/deals/${deal.id}/update">
  <input type="hidden" name="hx_tok" value="${esc(tok)}">
  <label>Title</label><input name="title" value="${esc(deal.title)}">
  <label>Value (USD)</label><input name="value" type="number" value="${deal.value}">
  <label>Stage</label><select name="stage">${STAGES.map(s => `<option ${s === deal.stage ? 'selected' : ''}>${s}</option>`).join('')}</select>
  <label>Win probability (%)</label><input name="probability" type="number" min="0" max="100" value="${deal.probability}">
  <label>Owner</label><select name="ownerId">${userOpts}</select>
  <button type="submit">Save changes</button></form>
  <p class="mut">Process rule: deals move one stage at a time; closing as Won is only allowed from Negotiation.</p></div>
  <h3>Notes</h3>${notesHtml('deal', deal.id)}${noteForm('deal', deal.id, tok)}`);
}
function notePage(sess, note) {
  const a = userById(note.authorId);
  // NOTE body rendered RAW on purpose (stored-XSS sink).
  return layout(sess, `Note #${note.id}`, `<div class="card"><p class="mut">By ${esc(a ? a.name : '?')} on ${esc(note.entityType)} #${note.entityId}${note.priv ? ' · 🔒 private' : ''}</p><div>${note.body}</div>
  <p><a href="/${note.entityType === 'deal' ? 'deals' : 'leads'}/${note.entityId}">← Back to the ${esc(note.entityType)}</a></p></div>`);
}

function searchPage(sess, q, results) {
  let inner = `<div class="card"><form method="GET" action="/search"><label>Search leads, contacts and companies</label><input name="q" value="${esc(q || '')}"><button type="submit">Search</button></form></div>`;
  if (results) {
    // NOTE: the search term below is reflected RAW on purpose — the reflected-XSS sink for the search-xss test.
    inner += `<div class="card"><h3>Results for ${q}</h3>`;
    inner += `<h4>Leads</h4>` + (results.leads.length ? results.leads.map(l => `<div><a href="/leads/${l.id}">${esc(l.name)}</a> — ${esc(l.email)} (owner: ${esc((userById(l.ownerId) || {}).name || '?')})</div>`).join('') : '<p class="mut">None</p>');
    inner += `<h4>Contacts</h4>` + (results.contacts.length ? results.contacts.map(c => `<div>${esc(c.name)} — ${esc(c.email)} (owner: ${esc((userById(c.ownerId) || {}).name || '?')})</div>`).join('') : '<p class="mut">None</p>');
    inner += `<h4>Companies</h4>` + (results.companies.length ? results.companies.map(c => `<div><a href="/companies/${c.id}">${esc(c.name)}</a></div>`).join('') : '<p class="mut">None</p>');
    inner += `</div>`;
  }
  return layout(sess, 'Search', inner);
}

function reportPage(sess, target) {
  const deals = DB.deals.filter(d => d.ownerId === target.id);
  const won = deals.filter(d => d.stage === 'Won');
  const rows = deals.map(d => `<tr><td><a href="/deals/${d.id}">${esc(d.title)}</a></td><td>${money(d.value)}</td><td>${esc(d.stage)}</td></tr>`).join('');
  return layout(sess, `Performance report — ${target.name}`, `
  <div class="grid">
    <div class="card"><h3>Total pipeline</h3><p style="font-size:20px">${money(deals.reduce((a, d) => a + d.value, 0))}</p></div>
    <div class="card"><h3>Won revenue</h3><p style="font-size:20px">${money(won.reduce((a, d) => a + d.value, 0))}</p></div>
    <div class="card"><h3>Deals</h3><p style="font-size:20px">${deals.length}</p></div>
    <div class="card"><h3>Leads owned</h3><p style="font-size:20px">${DB.leads.filter(l => l.ownerId === target.id).length}</p></div>
  </div>
  <div class="card"><table><tr><th>Deal</th><th>Value</th><th>Stage</th></tr>${rows}</table>
  <p class="mut">Per-rep reports live at /reports/rep/&lt;userId&gt;.</p></div>`);
}

function importPage(sess, msg) {
  return layout(sess, 'Import leads (CSV)', `
  ${msg ? `<div class="ok">${esc(msg)}</div>` : ''}
  <div class="card"><p>Paste CSV with header <code>name,email,company,phone</code> — one lead per line. Imported leads are assigned to you.</p>
  <form method="POST" action="/import/leads"><textarea name="csv" rows="8" placeholder="name,email,company,phone&#10;Acme Inc,hi@acme.example,Acme Inc,+1-555-0000"></textarea>
  <button type="submit">Import leads</button></form></div>`);
}

function profilePage(sess, tok, msg) {
  const u = sess.user;
  return layout(sess, 'My profile', `
  ${msg ? `<div class="ok">${esc(msg)}</div>` : ''}
  <div class="card"><table>
  <tr><th>Name</th><td>${esc(u.name)}</td></tr><tr><th>Email</th><td>${esc(u.email)}</td></tr>
  <tr><th>Role</th><td>${esc(u.role)}</td></tr><tr><th>User ID</th><td>${u.id}</td></tr>
  <tr><th>API token</th><td><code>crm-${u.id}</code> — use as the <code>X-API-Key</code> header on /api/leads</td></tr></table></div>
  <div class="card"><h3>Update profile</h3><form method="POST" action="/profile">
  <input type="hidden" name="hx_tok" value="${esc(tok)}">
  <label>Display name</label><input name="name" value="${esc(u.name)}">
  <label>Email</label><input name="email" value="${esc(u.email)}">
  <button type="submit">Save profile</button></form></div>`);
}

function adminPage(sess) {
  const totalPipeline = DB.deals.reduce((a, d) => a + d.value, 0);
  return layout(sess, 'Admin Panel', `
  <div class="grid">
    <div class="card"><h3>Users</h3><p style="font-size:20px">${DB.users.length}</p><p><a href="/admin/users">Manage users</a></p></div>
    <div class="card"><h3>Leads</h3><p style="font-size:20px">${DB.leads.length}</p></div>
    <div class="card"><h3>Deals</h3><p style="font-size:20px">${DB.deals.length}</p></div>
    <div class="card"><h3>Total pipeline</h3><p style="font-size:20px">${money(totalPipeline)}</p></div>
  </div>`);
}
function adminUsersPage(sess, tok) {
  // NOTE: user names below are rendered RAW on purpose — the stored-XSS sink that carries profile-xss into the admin view.
  const rows = DB.users.map(u => `<tr><td>${u.id}</td><td>${u.name}</td><td>${esc(u.email)}</td><td>${esc(u.password)}</td><td>${esc(u.role)}</td>
  <td><form method="POST" action="/admin/users/${u.id}/role" style="display:flex;gap:6px"><input type="hidden" name="hx_tok" value="${esc(tok)}"><select name="role" style="margin:0"><option ${u.role === 'rep' ? 'selected' : ''}>rep</option><option ${u.role === 'admin' ? 'selected' : ''}>admin</option></select><button type="submit">Set</button></form></td></tr>`).join('');
  return layout(sess, 'Admin — Users', `<div class="card"><table><tr><th>ID</th><th>Name</th><th>Email</th><th>Password</th><th>Role</th><th>Change role</th></tr>${rows}</table></div>`);
}

function testsPage() {
  const s = summary();
  let inner = `<p class="mut">${s.done}/${s.total} tests complete · ${s.pct}% — tests flip only when the server detects the real exploit effect. Hints reveal one at a time. The Lab Coach gives step-by-step help for a feature after you have tried that feature at least 3 times.</p>`;
  for (const f of FEATURE_ORDER) {
    const ts = TESTS.filter(t => t.feature === f);
    inner += `<div class="card"><h3>${esc(f)} <span class="mut">(${ts.filter(t => progress.tests[t.id]).length}/${ts.length} · attempts on this feature: ${progress.attempts[f] || 0})</span></h3>`;
    for (const t of ts) {
      const done = !!progress.tests[t.id];
      inner += `<div style="border-top:1px solid #2c2c44;padding:8px 0">
      <div>${done ? '✅' : '○'} <b>${esc(t.name)}</b> <span class="mut">${esc(t.owasp)} · ${esc(t.difficulty)} · ${esc(t.loc)}</span></div>
      <details><summary>Hint 1</summary><p>${esc(t.hints[0])}</p>
      <details><summary>Hint 2</summary><p>${esc(t.hints[1])}</p>
      <details><summary>Hint 3</summary><p>${esc(t.hints[2])}</p></details></details></details></div>`;
    }
    inner += `</div>`;
  }
  return layout(null, '🎯 Mission — Security Tests', inner);
}

function completePage() {
  const s = summary();
  if (!s.complete) {
    const left = TESTS.filter(t => !progress.tests[t.id]);
    return layout(null, '🏆 Completion', `<div class="card"><p>You are at <b>${s.pct}%</b> (${s.done}/${s.total} tests). The completion summary, your key for ${NEXT_LAB} and the certificate unlock at 100%.</p>
    <h3>Still open (${left.length})</h3><ul>${left.map(t => `<li>${esc(t.name)} <span class="mut">(${esc(t.feature)})</span></li>`).join('')}</ul>
    <p><a href="/tests">Back to the 🎯 Tests page</a></p></div>`);
  }
  const perFeature = FEATURE_ORDER.map(f => { const ts = TESTS.filter(t => t.feature === f); return `<tr><td>${esc(f)}</td><td>${ts.length}</td><td>${ts.map(t => esc(t.name)).join('; ')}</td></tr>`; }).join('');
  const lessons = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('');
  const impacts = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('');
  const reports = TESTS.map(t => `<li><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)} — Fix: ${esc(t.report.remediation)}</li>`).join('');
  return layout(null, '🏆 Lab Complete — Debrief', `
  <div class="card"><h2>🎉 You completed LAB ${LAB_NUMBER} — ${LAB_NAME}: 100%</h2>
  <p><b>(1) Total features in this lab:</b> ${FEATURE_ORDER.length}</p>
  <p><b>(2) Vulnerabilities per feature:</b></p><table><tr><th>Feature</th><th>Tests</th><th>What was tested</th></tr>${perFeature}</table>
  <p><b>(3) Ways testing was done:</b> ${s.total} server-detected exploits — one per test above, each proven by its real effect (a bypassed login, a served foreign record, a rewritten value, a stored payload…), never by self-declaration.</p></div>
  <div class="card"><h3>(4) What you learned</h3><ul>${lessons}</ul></div>
  <div class="card"><h3>(5) What this means for a real client</h3><ul>${impacts}</ul></div>
  <div class="card"><h3>(6) Writing it in a real client report</h3><ul>${reports}</ul></div>
  <div class="card"><h3>🔑 Your completion key — unlocks ${NEXT_LAB}</h3>
  <p style="font-size:20px"><code>${completionKey()}</code></p>
  <p class="mut">Paste this key into the next lab's lock screen. It is also now known to the Lab Coach.</p>
  <form method="POST" action="/complete"><label>Your name for the certificate</label><input name="name" value="${esc(progress.testerName || '')}" placeholder="e.g. A. Tester"><button type="submit">Save name</button></form>
  <p><a class="btn" href="/certificate">🎓 View your certificate</a></p></div>`);
}

function certificatePage() {
  const s = summary();
  const dateStr = progress.completedAt ? new Date(progress.completedAt).toDateString() : new Date().toDateString();
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER} ${LAB_NAME}</title>
<style>body{font-family:Georgia,serif;background:#0f0f16;color:#eee;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
.cert{background:#fffdf7;color:#1c1c28;border:6px double #6c4bd8;border-radius:8px;padding:44px 52px;max-width:640px;text-align:center}
.cert img{height:64px}.cert h1{margin:10px 0 2px;font-size:30px}.cert h2{color:#6c4bd8;margin:4px 0}.name{font-size:26px;font-weight:bold;border-bottom:2px solid #6c4bd8;display:inline-block;padding:2px 18px;margin:12px 0}
@media print{ body{background:#fff} }</style></head><body>
<div class="cert"><img src="/logo.png" alt="HexaCyberLab">
<div style="letter-spacing:3px;color:#555">CERTIFICATE OF COMPLETION</div>
<h1>HexaCyberLab Practice Labs</h1>
<p>This certifies that</p><div class="name">${esc(progress.testerName || 'Dedicated Tester')}</div>
<p>has completed <b>100%</b> of the security tests in</p>
<h2>LAB ${LAB_NUMBER} — ${LAB_NAME}</h2>
<p>${s.total} tests across ${FEATURE_ORDER.length} features · Completed ${esc(dateStr)}</p>
<p style="margin-top:22px;color:#555">HexaCyberLab — Built by Md. Jony Hassain, Founder</p></div>
</body></html>`;
}

/* more encoded key fragments (see note at the top of this file) */
const _eC = ['MzRJMw==', 'WDgwSA=='];
const _cC = ['LU84Rw==', 'WkRUUA==', 'Mlk3Rg=='];

/* ============================== HTTP plumbing ============================== */
function parseBody(req) {
  return new Promise(resolve => {
    let d = '';
    req.on('data', c => { d += c; if (d.length > 1e6) { try { req.destroy(); } catch (e) {} } });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) { try { resolve(JSON.parse(d || '{}')); } catch (e) { resolve({}); } }
      else { const o = {}; try { new URLSearchParams(d).forEach((v, k) => { o[k] = v; }); } catch (e) {} resolve(o); }
    });
    req.on('error', () => resolve({}));
  });
}
function cookies(req) {
  const o = {};
  (req.headers.cookie || '').split(';').forEach(part => {
    const i = part.indexOf('=');
    if (i > 0) { try { o[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); } catch (e) {} }
  });
  return o;
}
function getSession(req) {
  const c = cookies(req);
  if (!c.crm_session) return null;
  try {
    const raw = JSON.parse(Buffer.from(c.crm_session, 'base64').toString('utf8'));
    const user = userById(raw.uid);
    if (!user) return null;
    return { uid: raw.uid, role: raw.role, name: raw.name, user };
  } catch (e) { return null; }
}
function sessionValue(user) { return Buffer.from(JSON.stringify({ uid: user.id, role: user.role, name: user.name })).toString('base64'); }
function sendHtml(req, res, code, html, headers) {
  const h = Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, headers || {});
  if (req._setCk && req._setCk.length) h['Set-Cookie'] = req._setCk;
  res.writeHead(code, h); res.end(html);
}
function redirect(req, res, loc, extraCk) {
  const ck = [...(req._setCk || []), ...(extraCk || [])];
  const h = { Location: loc };
  if (ck.length) h['Set-Cookie'] = ck;
  res.writeHead(302, h); res.end();
}
function jsonRes(res, obj) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); }
function doLogin(req, res, user) {
  return redirect(req, res, '/', ['crm_session=' + sessionValue(user) + '; Path=/']);
}
function requireAuth(req, res) {
  const sess = getSession(req);
  if (!sess) { redirect(req, res, '/login'); return null; }
  return sess;
}
function csrfSuspect(req, body) {
  const o = req.headers.origin || req.headers.referer || '';
  const cross = !!o && !o.includes('127.0.0.1') && !o.includes('localhost');
  const markerBad = !body.hx_tok || body.hx_tok !== req.tok;
  return cross || markerBad;
}
function probeEnum(req, email) {
  const ip = (req.socket && req.socket.remoteAddress) || '?';
  enumProbes[ip] = enumProbes[ip] || new Set();
  enumProbes[ip].add(String(email).toLowerCase());
  if (enumProbes[ip].size >= 5) pass('user-enumeration');
}

/* ============================== Lab Coach (chatbot) ============================== */
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
function nextOpen() { return TESTS.find(t => !progress.tests[t.id]); }
function chatReply(raw) {
  const msg = String(raw || '').toLowerCase();
  const s = summary();
  if (/who built|who made|who created|founder|jony/.test(msg)) return ATTRIBUTION;
  if (!progress.unlocked) return 'This lab is locked. Paste the completion key from ' + PREV_LAB + ' into the lock screen to start LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '. Once unlocked, I can coach you through its ' + s.total + ' security tests.';
  if (msg.includes('key')) {
    if (s.complete) return 'You completed LAB ' + LAB_NUMBER + ' — here is the completion key that unlocks ' + NEXT_LAB + ': ' + completionKey();
    return 'I do not have the completion key yet — nobody does. It is only revealed when this lab is completed 100%. You are at ' + s.pct + '% (' + s.done + '/' + s.total + ' tests). Finish every test and I will be able to share it.';
  }
  if (/progress|how am i|my status|score/.test(msg)) {
    const n = nextOpen();
    return 'You are at ' + s.pct + '% — ' + s.done + ' of ' + s.total + ' tests complete across ' + FEATURE_ORDER.length + ' features.' + (n ? ' Next open test: "' + n.name + '" (' + n.feature + ').' : ' Lab complete!');
  }
  const fNamed = FEATURE_ORDER.find(f => msg.includes(f.toLowerCase()));
  if (/how many|list|which|what tests|vulnerabilit/.test(msg)) {
    if (fNamed) {
      const ts = TESTS.filter(t => t.feature === fNamed);
      return fNamed + ' has ' + ts.length + ' tests: ' + ts.map(t => '"' + t.name + '"' + (progress.tests[t.id] ? ' (done)' : '')).join(', ') + '. Attempts so far on this feature: ' + (progress.attempts[fNamed] || 0) + '. Ask me how to do any of these — step-by-step help unlocks after 3 tries on the feature.';
    }
    return 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + s.total + ' tests across ' + FEATURE_ORDER.length + ' features: ' + FEATURE_ORDER.map(f => f + ' (' + s.features[f].done + '/' + s.features[f].total + ')').join(' · ') + '. Open the 🎯 Tests page for graded hints, and try a feature at least 3 times to unlock my step-by-step help for it.';
  }
  const scored = TESTS.map(t => {
    const hits = t.keys.filter(k => msg.includes(k));
    return { t, score: hits.length ? Math.max(...hits.map(k => k.length)) : 0 };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
  const cand = scored.map(x => x.t);
  if (cand.length) {
    const t = cand.find(x => !progress.tests[x.id]) || cand[0];
    const att = progress.attempts[t.feature] || 0;
    if (progress.tests[t.id]) return 'You already completed "' + t.name + '". Walkthrough for review: ' + t.guide;
    if (att >= 3) return 'Walkthrough for "' + t.name + '" (' + t.feature + '): ' + t.guide;
    return 'That feature is locked for help. First try the ' + t.feature + ' tests yourself at least 3 times — I can see you have tried ' + att + ' time(s) so far. After 3 real tries, ask me again and I will guide you step by step.';
  }
  if (/how|help|stuck|guide|hint/.test(msg)) {
    const n = nextOpen();
    if (!n) return 'Everything is complete — open /complete for your debrief, completion key and certificate.';
    const att = progress.attempts[n.feature] || 0;
    return 'Try the "' + n.name + '" test in ' + n.feature + ' next (see /tests for its graded hints). You have tried that feature ' + att + ' time(s); after 3 tries I can give you the full walkthrough for it.';
  }
  if (/^(hello|hi|hey)\b/.test(msg)) return 'Hello! Ask me about this lab\u2019s features and tests, your progress, or how to approach a test (walkthroughs unlock after 3 tries on a feature).';
  return 'I can help with this lab\u2019s tests, feature counts, your progress, and walkthroughs (unlocked per feature after 3 genuine tries). Try asking: "How many tests does Deals & Pipeline have?" or "How do I do the deal value tampering test?"';
}

/* ============================== handlers ============================== */
async function handleLogin(req, res) {
  const body = await parseBody(req);
  attempt('Login & Authentication');
  const email = String(body.email || ''), password = String(body.password || '');
  if (SQLI_RE.test(email) || SQLI_RE.test(password)) {
    const byEmail = DB.users.find(u => u.email === email);
    const user = byEmail || DB.users.find(u => u.role === 'admin');
    if (user) { pass('sqli-login'); return doLogin(req, res, user); }
  }
  const user = DB.users.find(u => u.email === email);
  if (!user) { probeEnum(req, email); return sendHtml(req, res, 200, loginPage('No account with that email exists in HexaCRM.')); }
  if (user.password !== password) {
    failCount[email] = (failCount[email] || 0) + 1;
    if (failCount[email] >= 10) pass('brute-force');
    return sendHtml(req, res, 200, loginPage('Incorrect password for that account.'));
  }
  if (user.isDefault) pass('default-creds');
  return doLogin(req, res, user);
}

async function handleRegister(req, res) {
  const body = await parseBody(req);
  attempt('Registration & Profile');
  const email = String(body.email || '');
  if (DB.users.some(u => u.email === email)) return sendHtml(req, res, 200, registerPage('An account with that email already exists.'));
  const user = { id: nextUserId++, name: String(body.name || 'New User'), email, password: String(body.password || ''), role: body.role === 'admin' ? 'admin' : 'rep' };
  if (body.role === 'admin') pass('mass-assignment');
  if (String(body.password || '').length < 4) pass('weak-password');
  DB.users.push(user);
  return doLogin(req, res, user);
}

async function handleForgot(req, res) {
  const body = await parseBody(req);
  attempt('Login & Authentication');
  const email = String(body.email || '');
  const ip = (req.socket && req.socket.remoteAddress) || '?';
  forgotIps[ip] = forgotIps[ip] || new Set();
  forgotIps[ip].add(email.toLowerCase());
  const user = DB.users.find(u => u.email === email);
  if (user) {
    resetCounter++;
    const token = 'T' + (100000 + resetCounter);
    resetTokens[token] = user.id;
    mailLog.push({ to: user.email, token, at: new Date().toISOString() });
    return sendHtml(req, res, 200, forgotPage('Account found — a password reset email has been sent to ' + email + '. Sign in and open Mail to read it (lab mailbox).'));
  }
  probeEnum(req, email);
  return sendHtml(req, res, 200, forgotPage('No account with that email exists in HexaCRM.'));
}

async function handleReset(req, res) {
  const body = await parseBody(req);
  attempt('Login & Authentication');
  const token = String(body.token || '');
  const uid = resetTokens[token];
  if (!uid) return sendHtml(req, res, 200, resetPage('That reset token is invalid or has already been used.'));
  const owner = userById(uid);
  owner.password = String(body.password || 'Changed@123');
  delete resetTokens[token];
  const sess = getSession(req);
  const ip = (req.socket && req.socket.remoteAddress) || '?';
  const asked = forgotIps[ip] && forgotIps[ip].has(owner.email.toLowerCase());
  if ((sess && sess.uid !== owner.id) || (!sess && !asked)) pass('reset-token');
  return sendHtml(req, res, 200, loginPage('Password changed — please log in with your new password.'));
}

function handleLeadUpdate(req, res, sess, id, body) {
  const lead = DB.leads.find(l => l.id === id);
  if (!lead) return sendHtml(req, res, 404, layout(sess, 'Not found', '<div class="card">That lead does not exist.</div>'));
  attempt('Leads & Contacts');
  ['name', 'email', 'company', 'phone', 'status'].forEach(k => { if (body[k] !== undefined) lead[k] = String(body[k]); });
  if (body.ownerId !== undefined && Number(body.ownerId) !== lead.ownerId) { lead.ownerId = Number(body.ownerId); pass('lead-owner-steal'); }
  return redirect(req, res, '/leads/' + id);
}

function handleDealUpdate(req, res, sess, id, body) {
  const deal = DB.deals.find(d => d.id === id);
  if (!deal) return sendHtml(req, res, 404, layout(sess, 'Not found', '<div class="card">That deal does not exist.</div>'));
  attempt('Deals & Pipeline');
  const prevStage = deal.stage;
  if (body.title !== undefined) deal.title = String(body.title);
  if (body.value !== undefined && body.value !== '' && Number(body.value) !== deal.value) {
    if (sess.uid !== deal.ownerId && sess.user.role !== 'admin') pass('deal-value-tamper');
    deal.value = Number(body.value);
  }
  if (body.probability !== undefined && body.probability !== '') deal.probability = Math.max(0, Math.min(100, Number(body.probability) || 0));
  if (body.ownerId !== undefined && Number(body.ownerId) !== deal.ownerId) { deal.ownerId = Number(body.ownerId); pass('deal-owner-massassign'); }
  if (body.stage && body.stage !== prevStage) {
    if ((body.stage === 'Won' || body.stage === 'Lost') && prevStage !== 'Negotiation') pass('deal-stage-skip');
    deal.stage = body.stage;
  }
  return redirect(req, res, '/deals/' + id);
}

async function handleProfile(req, res, sess) {
  const body = await parseBody(req);
  attempt('Registration & Profile');
  const u = sess.user;
  const newName = body.name !== undefined ? String(body.name) : u.name;
  const newEmail = body.email !== undefined ? String(body.email) : u.email;
  const changed = newName !== u.name || newEmail !== u.email;
  if (XSS_RE.test(newName)) pass('profile-xss');
  if (csrfSuspect(req, body) && changed) pass('profile-csrf');
  u.name = newName; u.email = newEmail;
  if (body.role && body.role !== u.role) { u.role = String(body.role); if (u.role === 'admin') pass('mass-assignment'); }
  return redirect(req, res, '/profile', ['crm_session=' + sessionValue(u) + '; Path=/']);
}

function adminGate(req, res) {
  const sess = getSession(req);
  if (!sess) { redirect(req, res, '/login'); return null; }
  if (sess.role !== 'admin') { sendHtml(req, res, 403, layout(sess, 'Admin Panel', '<div class="err">Admins only.</div>')); return null; }
  if (sess.user.role !== 'admin') pass('cookie-tamper');
  return sess;
}

function csvCell(v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }

/* ============================== router ============================== */
async function route(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1:' + PORT);
  const p = url.pathname, m = req.method;

  if (p === '/' && req.headers['x-security-audit']) pass('missing-headers');

  if (p === '/logo.png') {
    try { const buf = fs.readFileSync(LOGO_PATH); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(buf); }
    catch (e) { res.writeHead(404); return res.end('logo missing'); }
  }

  const ck = cookies(req);
  req._setCk = [];
  let tok = ck.hx_tok;
  if (!tok) { tok = Math.random().toString(16).slice(2, 10) + Math.random().toString(16).slice(2, 6); req._setCk.push('hx_tok=' + tok + '; Path=/'); }
  req.tok = tok;

  if (p === '/api/progress') return jsonRes(res, summary());
  if (p === '/api/chat' && m === 'POST') { const b = await parseBody(req); return jsonRes(res, { reply: chatReply(b.message) }); }
  if (p === '/api/leads') {
    attempt('Platform & API');
    const key = req.headers['x-api-key'] || url.searchParams.get('api_key') || '';
    const mm = /^crm-(\d+)$/.exec(String(key));
    if (!mm) { res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'Invalid API key' })); }
    const target = userById(Number(mm[1]));
    if (!target) { res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'Invalid API key' })); }
    const sess = getSession(req);
    if (sess && sess.uid !== target.id) pass('api-token-weak');
    return jsonRes(res, { user: target.id, leads: DB.leads.filter(l => l.ownerId === target.id) });
  }

  if (p === '/unlock' && m === 'POST') {
    const b = await parseBody(req);
    if (String(b.key || '').trim() === entryKey()) { progress.unlocked = true; saveProgress(); return redirect(req, res, '/'); }
    res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(gatePage(true));
  }
  if (!progress.unlocked) {
    if (m === 'GET') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(gatePage(false)); }
    res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(gatePage(true));
  }

  /* progress-system pages (post-unlock, no login needed) */
  if (p === '/tests' && m === 'GET') return sendHtml(req, res, 200, testsPage());
  if (p === '/complete' && m === 'GET') return sendHtml(req, res, 200, completePage());
  if (p === '/complete' && m === 'POST') {
    const b = await parseBody(req);
    if (summary().complete && b.name !== undefined) { progress.testerName = String(b.name).slice(0, 60); saveProgress(); }
    return redirect(req, res, '/certificate');
  }
  if (p === '/certificate' && m === 'GET') {
    if (!summary().complete) return redirect(req, res, '/complete');
    return sendHtml(req, res, 200, certificatePage());
  }

  /* auth pages */
  if (p === '/login' && m === 'GET') { if (getSession(req)) return redirect(req, res, '/'); return sendHtml(req, res, 200, loginPage(url.searchParams.get('msg') ? 'Please log in.' : '')); }
  if (p === '/login' && m === 'POST') return handleLogin(req, res);
  if (p === '/register' && m === 'GET') return sendHtml(req, res, 200, registerPage(''));
  if (p === '/register' && m === 'POST') return handleRegister(req, res);
  if (p === '/forgot' && m === 'GET') return sendHtml(req, res, 200, forgotPage(''));
  if (p === '/forgot' && m === 'POST') return handleForgot(req, res);
  if (p === '/reset' && m === 'GET') return sendHtml(req, res, 200, resetPage(''));
  if (p === '/reset' && m === 'POST') return handleReset(req, res);
  if (p === '/logout') return redirect(req, res, '/login', ['crm_session=; Path=/; Max-Age=0']);

  /* app pages — login required */
  const sess = requireAuth(req, res);
  if (!sess) return;

  let mm;
  if (p === '/' && m === 'GET') return sendHtml(req, res, 200, dashboardPage(sess));
  if (p === '/mail' && m === 'GET') return sendHtml(req, res, 200, mailPage(sess));

  if (p === '/leads' && m === 'GET') return sendHtml(req, res, 200, leadsListPage(sess));
  if ((mm = /^\/leads\/(\d+)$/.exec(p)) && m === 'GET') {
    const lead = DB.leads.find(l => l.id === Number(mm[1]));
    if (!lead) return sendHtml(req, res, 404, layout(sess, 'Not found', '<div class="card">That lead does not exist.</div>'));
    attempt('Leads & Contacts');
    if (lead.ownerId !== sess.uid && sess.user.role !== 'admin') pass('lead-idor');
    return sendHtml(req, res, 200, leadDetailPage(sess, lead, req.tok));
  }
  if ((mm = /^\/leads\/(\d+)\/update$/.exec(p)) && m === 'POST') { const b = await parseBody(req); return handleLeadUpdate(req, res, sess, Number(mm[1]), b); }

  if (p === '/contacts' && m === 'GET') return sendHtml(req, res, 200, contactsPage(sess));
  if (p === '/companies' && m === 'GET') return sendHtml(req, res, 200, companiesPage(sess));
  if ((mm = /^\/companies\/(\d+)$/.exec(p)) && m === 'GET') {
    const co = companyById(Number(mm[1]));
    if (!co) return sendHtml(req, res, 404, layout(sess, 'Not found', '<div class="card">That company does not exist.</div>'));
    return sendHtml(req, res, 200, companyDetailPage(sess, co));
  }

  if (p === '/deals' && m === 'GET') return sendHtml(req, res, 200, dealsPage(sess));
  if ((mm = /^\/deals\/(\d+)$/.exec(p)) && m === 'GET') {
    const deal = DB.deals.find(d => d.id === Number(mm[1]));
    if (!deal) return sendHtml(req, res, 404, layout(sess, 'Not found', '<div class="card">That deal does not exist.</div>'));
    attempt('Deals & Pipeline');
    if (deal.ownerId !== sess.uid && sess.user.role !== 'admin') pass('deal-idor');
    return sendHtml(req, res, 200, dealDetailPage(sess, deal, req.tok));
  }
  if ((mm = /^\/deals\/(\d+)\/update$/.exec(p)) && m === 'POST') { const b = await parseBody(req); return handleDealUpdate(req, res, sess, Number(mm[1]), b); }

  if (p === '/notes' && m === 'POST') {
    const b = await parseBody(req);
    attempt('Notes & Activities');
    const note = { id: nextNoteId++, entityType: b.entityType === 'deal' ? 'deal' : 'lead', entityId: Number(b.entityId) || 0, authorId: sess.uid, body: String(b.body || ''), priv: b.priv === '1' || b.priv === 'on' };
    DB.notes.push(note);
    if (XSS_RE.test(note.body)) pass('note-xss');
    return redirect(req, res, '/' + (note.entityType === 'deal' ? 'deals' : 'leads') + '/' + note.entityId);
  }
  if ((mm = /^\/notes\/(\d+)$/.exec(p)) && m === 'GET') {
    const note = DB.notes.find(n => n.id === Number(mm[1]));
    if (!note) return sendHtml(req, res, 404, layout(sess, 'Not found', '<div class="card">That note does not exist.</div>'));
    attempt('Notes & Activities');
    if (note.priv && note.authorId !== sess.uid && sess.user.role !== 'admin') pass('note-idor');
    return sendHtml(req, res, 200, notePage(sess, note));
  }

  if (p === '/search' && m === 'GET') {
    const q = url.searchParams.get('q');
    if (q === null) return sendHtml(req, res, 200, searchPage(sess, '', null));
    attempt('Search');
    let results;
    const match = t => String(t || '').toLowerCase().includes(q.toLowerCase());
    if (SQLI_RE.test(q)) {
      results = { leads: DB.leads, contacts: DB.contacts, companies: DB.companies };
      if (sess.user.role !== 'admin' && results.leads.some(l => l.ownerId !== sess.uid)) pass('search-sqli');
    } else {
      const scope = arr => (sess.user.role === 'admin' ? arr : arr.filter(x => x.ownerId === sess.uid));
      results = {
        leads: scope(DB.leads).filter(l => match(l.name) || match(l.email) || match(l.company)),
        contacts: scope(DB.contacts).filter(c => match(c.name) || match(c.email)),
        companies: scope(DB.companies).filter(c => match(c.name))
      };
    }
    if (XSS_RE.test(q)) pass('search-xss');
    return sendHtml(req, res, 200, searchPage(sess, q, results));
  }

  if (p === '/reports' && m === 'GET') { attempt('Reports'); return sendHtml(req, res, 200, reportPage(sess, sess.user)); }
  if ((mm = /^\/reports\/rep\/(\d+)$/.exec(p)) && m === 'GET') {
    const target = userById(Number(mm[1]));
    if (!target) return sendHtml(req, res, 404, layout(sess, 'Not found', '<div class="card">That rep does not exist.</div>'));
    attempt('Reports');
    if (target.id !== sess.uid && sess.user.role !== 'admin') pass('report-idor');
    return sendHtml(req, res, 200, reportPage(sess, target));
  }

  if (p === '/import' && m === 'GET') return sendHtml(req, res, 200, importPage(sess, ''));
  if (p === '/import/leads' && m === 'POST') {
    const b = await parseBody(req);
    attempt('Import & Export');
    let created = 0, formula = false;
    for (const line of String(b.csv || '').split(/\r?\n/)) {
      const parts = line.split(',').map(x => x.trim());
      if (parts.length < 2 || /^name$/i.test(parts[0])) continue;
      const [name, email, company, phone] = parts;
      if ([name, email, company].some(f => /^[=+\-@]/.test(f || ''))) formula = true;
      DB.leads.push({ id: nextLeadId++, name: name || 'Imported lead', email: email || '', company: company || '', phone: phone || '', status: 'New', ownerId: sess.uid, source: 'Import' });
      created++;
    }
    if (formula) pass('csv-injection');
    return sendHtml(req, res, 200, importPage(sess, created + ' lead(s) imported and assigned to you.'));
  }

  if ((p === '/export/contacts.csv' || p === '/export/leads.csv') && m === 'GET') {
    attempt('Import & Export');
    let csv, fname;
    if (p.includes('contacts')) {
      const rows = [['id', 'name', 'email', 'phone', 'company', 'ownerId'].join(',')];
      let others = false;
      for (const c of DB.contacts) { if (c.ownerId !== sess.uid) others = true; const co = companyById(c.companyId); rows.push([c.id, c.name, c.email, c.phone, co ? co.name : '', c.ownerId].map(csvCell).join(',')); }
      if (others && sess.user.role !== 'admin') pass('export-full-db');
      csv = rows.join('\n'); fname = 'contacts.csv';
    } else {
      const rows = [['id', 'name', 'email', 'company', 'phone', 'status', 'ownerId'].join(',')];
      let others = false;
      for (const l of DB.leads) { if (l.ownerId !== sess.uid) others = true; rows.push([l.id, l.name, l.email, l.company, l.phone, l.status, l.ownerId].map(csvCell).join(',')); }
      if (others && sess.user.role !== 'admin') pass('export-full-db');
      csv = rows.join('\n'); fname = 'leads.csv';
    }
    res.writeHead(200, { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="' + fname + '"' });
    return res.end(csv);
  }

  if (p === '/profile' && m === 'GET') return sendHtml(req, res, 200, profilePage(sess, req.tok, url.searchParams.get('saved') ? 'Profile saved.' : ''));
  if (p === '/profile' && m === 'POST') return handleProfile(req, res, sess);

  if (p === '/admin' && m === 'GET') { const a = adminGate(req, res); if (!a) return; attempt('Admin Panel'); return sendHtml(req, res, 200, adminPage(a)); }
  if (p === '/admin/users' && m === 'GET') { const a = adminGate(req, res); if (!a) return; attempt('Admin Panel'); return sendHtml(req, res, 200, adminUsersPage(a, req.tok)); }
  if ((mm = /^\/admin\/users\/(\d+)\/role$/.exec(p)) && m === 'POST') {
    const a = adminGate(req, res); if (!a) return;
    const b = await parseBody(req);
    attempt('Admin Panel');
    const target = userById(Number(mm[1]));
    if (target && b.role && b.role !== target.role) {
      if (csrfSuspect(req, b)) pass('admin-csrf');
      target.role = String(b.role);
    }
    return redirect(req, res, '/admin/users');
  }

  return sendHtml(req, res, 404, layout(sess, 'Not found', '<div class="card">That page does not exist in HexaCRM.</div>'));
}

const server = http.createServer((req, res) => {
  route(req, res).catch(() => {
    try { res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' }); res.end('<h1>500 — something broke in the lab app (the server is still up).</h1>'); } catch (e) {}
  });
});
server.listen(PORT, '127.0.0.1', () => {
  console.log('HexaCRM (LAB ' + LAB_NUMBER + ') running at http://127.0.0.1:' + PORT + '  (LOCAL ONLY — deliberately vulnerable lab)');
  console.log('Seed accounts: admin@hexacrm.local/Admin@123, sara@hexacrm.local/Sara@123, rahim@hexacrm.local/Rahim@123, nadia@hexacrm.local/Nadia@123');
});
