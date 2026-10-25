'use strict';
/*
 * HexaInsurance — LAB 47 of 110 (Category 5: Finance, Payments & Insurance)
 * A deliberately vulnerable insurance portal for authorised local training.
 * Zero-dependency Node.js. Binds 127.0.0.1:3056 ONLY. Never deploy publicly.
 *
 * Business: policyholder accounts, policies with coverage details, claims
 * with evidence uploads (simulated records), renewals, agent claim review,
 * and a platform admin console — plus the HexaCyberLab lab system layer
 * (entry-key gate, progress engine, /tests, Lab Coach chatbot, /complete,
 * /certificate) described in lab-system-ENGINE-SPEC.md.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3056;
const LAB_NUMBER = 47;
const LAB_NAME = 'HexaInsurance';
const DIR = __dirname;
const STATE_FILE = path.join(DIR, 'progress.json');

/* ------------------------------------------------------------------ *
 * Entry key shards (Lab 46 completion key). The key itself NEVER
 * appears as a plain literal anywhere in this file — it is stored as
 * base64-of-reversed pieces and assembled only inside /unlock.
 * ------------------------------------------------------------------ */


function _asm(a) {
  return a.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}
const ENTRY_KEY_SHA256 = 'bda09c0f7f10f9e485cc9b0be53bfafc249e7d1ea334e74b2eb74f79140b7bd0';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */

/* ================================================================== *
 * SEED DATA (in-memory; resets when the server restarts — progress
 * state is what persists, in progress.json)
 * ================================================================== */
const users = [
  { id: 1, name: 'Priya Nair',     email: 'admin@hexainsure.local', password: 'admin123', role: 'admin',    phone: '+1 555 0101', address: '1 Insurer Plaza', active: true },
  { id: 2, name: 'Daniel Reed',    email: 'agent@hexainsure.local', password: 'agent123', role: 'agent',    phone: '+1 555 0102', address: 'Claims Office 4', active: true },
  { id: 3, name: 'Alice Meyer',    email: 'alice@test.local',       password: 'alice123', role: 'customer', phone: '+1 555 0113', address: '12 Maple Street', active: true },
  { id: 4, name: 'Bob Carter',     email: 'bob@test.local',         password: 'bob123',   role: 'customer', phone: '+1 555 0114', address: '48 Oak Avenue', active: true },
  { id: 5, name: 'Carol Diaz',     email: 'carol@test.local',       password: 'carol123', role: 'customer', phone: '+1 555 0115', address: '9 Pine Road', active: true },
  { id: 6, name: 'Demo User',      email: 'demo@hexainsure.local',  password: 'demo123',  role: 'customer', phone: '+1 555 0116', address: 'Demo Account', active: true },
];
let nextUserId = 7;

const policies = [
  { id: 1, number: 'P-1001', ownerId: 3, type: 'Home Shield',      coverageLimit: 50000, premium: 420, renewalPremium: 460, status: 'active', renewals: 1, lastRenewalPremium: null },
  { id: 2, number: 'P-1002', ownerId: 3, type: 'Auto Protect',     coverageLimit: 20000, premium: 310, renewalPremium: 340, status: 'active', renewals: 0, lastRenewalPremium: null },
  { id: 3, number: 'P-2001', ownerId: 4, type: 'Home Shield Plus', coverageLimit: 75000, premium: 640, renewalPremium: 690, status: 'active', renewals: 2, lastRenewalPremium: null },
  { id: 4, number: 'P-2002', ownerId: 4, type: 'Travel Safe',      coverageLimit: 10000, premium: 120, renewalPremium: 130, status: 'active', renewals: 0, lastRenewalPremium: null },
  { id: 5, number: 'P-3001', ownerId: 5, type: 'Health Basic',     coverageLimit: 30000, premium: 260, renewalPremium: 285, status: 'active', renewals: 1, lastRenewalPremium: null },
];
let nextPolicyId = 6;

const claims = [
  { id: 1, number: 'CLM-501', policyId: 1, amount: 1200, status: 'under review', incident: 'Water damage — burst pipe', description: 'Kitchen flooded after a pipe burst overnight.', createdBy: 3 },
  { id: 2, number: 'CLM-502', policyId: 3, amount: 5400, status: 'under review', incident: 'Storm damage to roof', description: 'Storm tore shingles off the north side of the roof.', createdBy: 4 },
  { id: 3, number: 'CLM-503', policyId: 3, amount: 800,  status: 'approved',     incident: 'Broken window', description: 'Fallen branch broke a bedroom window.', createdBy: 4 },
];
let nextClaimId = 4;

const evidence = [
  { id: 1, claimId: 1, filename: 'plumber-invoice.pdf', contentType: 'application/pdf', content: '%PDF-SIMULATED — Plumber invoice #881, Alice Meyer, $1,200.00 — pipe repair and water extraction.', uploadedBy: 3 },
  { id: 2, claimId: 2, filename: 'roof-photos.pdf',     contentType: 'application/pdf', content: '%PDF-SIMULATED — Roof damage photo set, Bob Carter, storm of 12 Oct — 14 photos attached.', uploadedBy: 4 },
  { id: 3, claimId: 3, filename: 'glazier-receipt.pdf', contentType: 'application/pdf', content: '%PDF-SIMULATED — Glazier receipt #204, Bob Carter, $800.00 — window replacement.', uploadedBy: 4 },
];
let nextEvidenceId = 4;

/* ================================================================== *
 * TESTS REGISTRY — the heart of the lab system (25 tests, 8 features)
 * ================================================================== */
const TESTS = [
  /* ---------------- Login & Authentication ---------------- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL Injection — Login Bypass', owasp: 'A03:2021 – Injection', difficulty: 'Beginner',
    hints: ['The login form builds its lookup by gluing your input straight into a query string.', "Try a quote character in the email field and see how the app reacts.", "Classic payload in the email field: ' OR '1'='1 — with any password."],
    lesson: 'String-built queries let an attacker rewrite the login logic itself — no valid password is needed when the query can be bent.',
    impact: 'On a real insurer portal this means instant takeover of the first account the query returns — usually an administrator — with full access to policyholder data and claims.',
    loc: 'POST /login (legacy string-built lookup)', exploit: "Submit the login form with an injection payload such as ' OR '1'='1 in the email field and any password; the bent query returns the first user (the platform admin) and a session is issued.",
    fix: 'Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Replace string-built queries with parameterised queries and add centralised input handling.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute Force — No Login Throttling', owasp: 'A07:2021 – Authentication Failures', difficulty: 'Beginner',
    hints: ['Keep guessing the same account\'s password — does anything ever slow you down or lock the account?', 'Try 10 wrong passwords in a row for bob@test.local.', 'The flaw is proven when the 10th failure is still processed like the first.'],
    lesson: 'Without rate limiting or lockout, a login form is an unlimited password-guessing machine.',
    impact: 'Attackers can grind through password lists against real policyholder accounts at full speed; any weak password falls, and with it the customer\'s policies and claims.',
    loc: 'POST /login', exploit: 'Send 10+ failed login attempts for one account (e.g. bob@test.local) in a row; every attempt is processed normally — no delay, CAPTCHA, or lockout ever appears.',
    fix: 'Add progressive delays, per-account and per-IP rate limits, lockout/back-off, and alerting on repeated failures.',
    report: { title: 'No Rate Limiting or Lockout on Login Endpoint', severity: 'High', remediation: 'Throttle login attempts per account and IP, add lockout/back-off and breach-password screening.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User Enumeration via Login Errors', owasp: 'A07:2021 – Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the error for an email that exists with one that does not.', 'Try alice@test.local with a wrong password, then a made-up email with any password.', 'Two different error messages = a free list of valid accounts.'],
    lesson: 'Different error messages for "no such account" and "wrong password" confirm which emails are registered — the first step of every targeted attack.',
    impact: 'An attacker can harvest a verified list of policyholder emails from the portal itself, then aim phishing and password attacks only at real accounts.',
    loc: 'POST /login (error responses)', exploit: 'Submit a wrong password for an existing email ("Incorrect password.") and for a non-existent email ("No account found for that email.") — the distinguishable responses confirm valid accounts.',
    fix: 'Return one generic "invalid email or password" message for every failed login.',
    report: { title: 'Account Enumeration via Differential Login Error Messages', severity: 'Medium', remediation: 'Use a single generic authentication failure message and consistent response timing.' } },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Default Demo Credentials Still Active', owasp: 'A07:2021 – Authentication Failures', difficulty: 'Beginner',
    hints: ['The login page itself is generous — read everything on it carefully.', 'A demo account is advertised so visitors can "look around".', 'Sign in with demo@hexainsure.local / demo123.'],
    lesson: 'Demo and default accounts shipped to production are open doors — attackers try the published credentials first.',
    impact: 'Anyone on the internet can walk into a real, working policyholder account, learn the portal\'s layout from inside, and use it as a launchpad for deeper attacks.',
    loc: 'Login page demo note + POST /login', exploit: 'Use the demo credentials printed on the login page (demo@hexainsure.local / demo123) to sign in to a live account.',
    fix: 'Remove demo/default accounts from production, or force a unique password at first login and disable them when unused.',
    report: { title: 'Active Demo Account with Published Default Credentials', severity: 'High', remediation: 'Disable demo accounts in production and enforce unique, rotated credentials for any seeded account.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07:2021 – Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a password reset, then think about how the token could be produced.', 'The token is derived from something public about the account — its email address.', 'It is the first 10 hex characters of md5(email). Compute it and post it to the reset form.'],
    lesson: 'A reset token is only as strong as its unpredictability — a token derived from the email address can be computed by anyone.',
    impact: 'Anyone who knows a policyholder\'s email address can reset their password and take over the account — no inbox access needed.',
    loc: 'POST /forgot + POST /reset', exploit: 'Compute md5(victim email), take the first 10 hex characters, and submit it as the reset token with a new password — the portal accepts it and changes the password.',
    fix: 'Generate reset tokens from a CSPRNG (≥128 bits), store only a hash, expire them quickly, and make them single-use.',
    report: { title: 'Password Reset Token Predictable from Email Address', severity: 'High', remediation: 'Issue cryptographically random, short-lived, single-use reset tokens.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Role Cookie Tampering — Admin Trusts the Browser', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['After login, inspect the cookies the portal sets — one of them describes your role.', 'Cookies live in your browser, so you can rewrite them. What does /admin believe?', 'Set the hx_role cookie to "admin" while signed in as a normal customer and visit /admin.'],
    lesson: 'Authorization data stored unsigned on the client is not authorization — the server must decide roles from its own records.',
    impact: 'Any policyholder can promote themselves to platform admin by editing a cookie, reaching user management and every customer\'s records.',
    loc: 'GET /admin (hx_role cookie check)', exploit: 'Sign in as a customer, edit the hx_role cookie to "admin", and open /admin — the console trusts the cookie instead of the server-side account role.',
    fix: 'Keep roles server-side in the session record; never trust client-supplied role claims (or sign and verify them).',
    report: { title: 'Privilege Escalation via Unsigned Role Cookie', severity: 'Critical', remediation: 'Derive authorization from server-side session data only; ignore client-supplied role values.' } },

  /* ---------------- Registration & Profile ---------------- */
  { id: 'reg-weakpass', feature: 'Registration & Profile', name: 'Weak Password Policy — 1-Character Passwords', owasp: 'A07:2021 – Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a new account and be as lazy as possible with the password.', 'Does the form enforce any length or complexity at all?', 'A password of a single character — "a" — is accepted.'],
    lesson: 'If the portal allows it, users will choose terrible passwords — the policy is the only defence most accounts have.',
    impact: 'Policyholder accounts protected by one-character passwords fall to the first guessing attempt, exposing personal data, policies, and claim histories.',
    loc: 'POST /register', exploit: 'Register a new account with a 1-character password; the account is created without any policy complaint.',
    fix: 'Enforce a minimum length (≥10–12) and screen new passwords against known-breached lists.',
    report: { title: 'No Minimum Password Requirements at Registration', severity: 'Medium', remediation: 'Enforce password length/complexity policy and breached-password screening at registration and reset.' } },
  { id: 'reg-mass', feature: 'Registration & Profile', name: 'Mass Assignment — Self-Assign the Agent Role', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration form shows three fields — but the server may accept more than it shows.', 'What happens if the request also carries a "role" field?', 'Register with an extra field: role=agent. Then check what your new account can do.'],
    lesson: 'Binding a whole request body to a database record lets attackers set fields the form never offered — including the role.',
    impact: 'Anyone can register themselves as an insurance agent, gaining the claims-review queue and the power to approve or reject real customers\' claims.',
    loc: 'POST /register (whole-body binding)', exploit: 'Submit the registration form with an extra role=agent field; the server binds it and creates a working agent account.',
    fix: 'Whitelist the fields a request may set (name, email, password); assign roles only through privileged server-side flows.',
    report: { title: 'Mass Assignment at Registration Allows Self-Assigned Agent Role', severity: 'High', remediation: 'Apply explicit field allow-lists on all model binding; never bind role/privilege fields from client input.' } },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03:2021 – Injection', difficulty: 'Beginner',
    hints: ['Your display name is shown back on every page — in the greeting, the profile, and agent views.', 'What if your name were not a name at all, but markup?', 'Register (or rename yourself) with a name like <script>alert(1)</script> — it is stored and rendered unescaped.'],
    lesson: 'Any field that is stored and later rendered is an XSS carrier if output is not encoded — names are a classic hiding place.',
    impact: 'A malicious "customer name" executes script in the browsers of agents and admins who open the claims queue — a direct path to session theft and back-office takeover.',
    loc: 'POST /register + profile name rendering', exploit: 'Create an account whose display name contains a script payload; the payload is stored and rendered unescaped wherever the name appears (header greeting, agent queue, admin list).',
    fix: 'Context-encode all user-controlled output and add a Content-Security-Policy as defence in depth.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Encode user-controlled data on output in every context and deploy a restrictive CSP.' } },
  { id: 'prof-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['The profile form carries a hidden marker field — the server never actually checks it.', 'Replay the profile-update request without the marker, or from a foreign Origin.', 'The change is applied anyway: the anti-CSRF marker is decoration.'],
    lesson: 'A CSRF token that is not verified is not a control — state-changing forms must prove the request came from the app\'s own pages.',
    impact: 'A policyholder who visits a malicious page while signed in can have their name, phone, and address silently rewritten — the first step to diverting claim correspondence and payouts.',
    loc: 'POST /profile/update', exploit: 'POST a profile change with the hidden marker field missing (or a cross-site Origin); the server applies the change without verifying the marker.',
    fix: 'Verify a per-session anti-CSRF token on every state-changing request and check Origin/Referer as a second layer.',
    report: { title: 'Missing CSRF Verification on Profile Update', severity: 'Medium', remediation: 'Validate anti-CSRF tokens server-side on all state-changing endpoints.' } },

  /* ---------------- Policies & Coverage ---------------- */
  { id: 'pol-idor', feature: 'Policies & Coverage', name: 'Policy IDOR — Read Any Customer\'s Policy', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: ['Your policy pages live at /policies/<id> with small sequential ids.', 'The list shows only your policies — but does the detail page check ownership?', 'Sign in as Alice and open /policies/3 — that one belongs to Bob.'],
    lesson: 'Hiding an object from the list is not access control — every object request must check the requester owns it.',
    impact: 'Every policyholder\'s coverage limits, premiums, and personal details are readable by any other customer — prime material for fraud, social engineering, and competitive theft.',
    loc: 'GET /policies/:id', exploit: 'As Alice, request /policies/3 (Bob\'s Home Shield Plus policy); the full policy is served with no ownership check.',
    fix: 'Authorise every object access against the session user (owner, assigned agent, or admin) on the server.',
    report: { title: 'Insecure Direct Object Reference on Policy Details', severity: 'High', remediation: 'Enforce per-object ownership checks on all policy endpoints.' } },
  { id: 'pol-coverage', feature: 'Policies & Coverage', name: 'Coverage Tampering via Mass Assignment', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['The "manage policy" form posts coverage and premium fields back to the server.', 'The server saves what it is given — including numbers it should compute itself.', 'Edit the coverageLimit field (e.g. to 999999) or drop the premium before submitting the policy update.'],
    lesson: 'Fields that define the contract — coverage limits and premiums — must be server-computed; a form that posts them back is an invitation to rewrite the contract.',
    impact: 'A policyholder can raise their own coverage from $50,000 to $999,999 (or slash their premium) without paying a cent more — the insurer carries risk it never priced.',
    loc: 'POST /policies/:id/update', exploit: 'Submit the policy update with a tampered coverageLimit (or premium); the server binds and stores the attacker-chosen values.',
    fix: 'Allow-list editable fields; compute coverage and premium changes only through priced, server-side workflows.',
    report: { title: 'Mass Assignment Allows Coverage Limit and Premium Tampering', severity: 'Critical', remediation: 'Bind only benign fields from requests; derive financial terms from server-side rating logic.' } },
  { id: 'pol-search-sqli', feature: 'Policies & Coverage', name: 'SQL Injection in Policy Search', owasp: 'A03:2021 – Injection', difficulty: 'Intermediate',
    hints: ['The policy search box feeds your text into a lookup query.', 'A quote character is the classic first probe.', "Search for ' OR '1'='1 and watch whose policies come back."],
    lesson: 'Search boxes are query builders — unparameterised search is the same injection flaw as a login form, with the whole book of business behind it.',
    impact: 'One search can dump every policy in the company — all customers, coverage amounts, and premiums — in a single response.',
    loc: 'GET /search?q=', exploit: "Search with the payload ' OR '1'='1; the bent query returns every customer's policies instead of only your own matches.",
    fix: 'Parameterise search queries and scope results to the requester\'s own records by default.',
    report: { title: 'SQL Injection in Policy Search Leaks All Policies', severity: 'Critical', remediation: 'Use parameterised queries and enforce result scoping by account.' } },
  { id: 'pol-search-xss', feature: 'Policies & Coverage', name: 'Reflected XSS in Policy Search', owasp: 'A03:2021 – Injection', difficulty: 'Beginner',
    hints: ['The results page repeats your search text back to you: "Results for …".', 'Does it repeat markup as markup?', 'Search for <script>alert(1)</script> and view the page source.'],
    lesson: 'Reflected input is still dangerous output — anything echoed into a page must be encoded, even "just the search term".',
    impact: 'A crafted search link sent to an agent or admin runs script in their browser under the portal\'s origin — session theft and actions in their name.',
    loc: 'GET /search (query reflection)', exploit: 'Search for a script payload; the results page reflects it unescaped in the "Results for" line, executing in the viewer\'s browser.',
    fix: 'HTML-encode all reflected values; treat search terms as data, never markup.',
    report: { title: 'Reflected Cross-Site Scripting in Policy Search', severity: 'Medium', remediation: 'Encode reflected user input on output and add a CSP.' } },

  /* ---------------- Claims ---------------- */
  { id: 'claim-idor', feature: 'Claims', name: 'Claim IDOR — Read Any Customer\'s Claim', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: ['Claims live at /claims/<id>, sequential like the policies.', 'Your claim list is scoped to you — the detail page is not.', 'As Alice, open /claims/2 — Bob\'s storm-damage claim, amounts and all.'],
    lesson: 'Claim files hold sensitive incident details and amounts; an id in the URL is not permission.',
    impact: 'Any customer can read every other customer\'s claims — what happened, what it cost, and what evidence they filed — a privacy breach and a fraud playbook.',
    loc: 'GET /claims/:id', exploit: 'As Alice, request /claims/2 (Bob\'s claim); the full claim detail is served without an ownership check.',
    fix: 'Check claim ownership (or assigned-agent/admin role) on every claim read and write.',
    report: { title: 'Insecure Direct Object Reference on Claim Details', severity: 'High', remediation: 'Enforce per-object authorization on all claim endpoints.' } },
  { id: 'claim-inflate', feature: 'Claims', name: 'Claim Amount Above Coverage Limit Accepted', owasp: 'A04:2021 – Insecure Design', difficulty: 'Intermediate',
    hints: ['When you file a claim, YOU type the amount. Does the server compare it with anything?', 'Your Auto Protect policy covers $20,000. What does the form think of $50,000?', 'File a claim on your own policy with an amount far above its coverage limit — it is accepted and queued for review.'],
    lesson: 'Business rules are security rules: if the client supplies the number, the server must validate it against the policy\'s actual coverage.',
    impact: 'Inflated claims enter the insurer\'s pipeline at whatever amount the claimant invents — at scale this is direct claims fraud against reserves.',
    loc: 'POST /claims', exploit: 'File a claim on your own Auto Protect policy (coverage $20,000) for $50,000; the server stores it without ever checking the coverage limit.',
    fix: 'Validate claim amounts server-side against the policy\'s coverage limit and flag over-limit submissions for fraud review.',
    report: { title: 'Missing Server-Side Validation of Claim Amount Against Coverage', severity: 'High', remediation: 'Enforce coverage-limit checks on claim creation and route exceptions to fraud review.' } },
  { id: 'claim-upload', feature: 'Claims', name: 'Unrestricted Evidence Upload — HTML Served Inline', owasp: 'A03:2021 – Injection', difficulty: 'Intermediate',
    hints: ['Evidence "uploads" take any filename and any content — the portal never asks what kind of file it is.', 'What if the evidence file were an HTML page with a script in it?', 'Upload evidence named proof.html containing a script payload, then open its /evidence link — it is served as text/html from the portal origin.'],
    lesson: 'An upload feature that stores and re-serves arbitrary content turns your own domain into the attacker\'s hosting.',
    impact: 'Attack pages live on the insurer\'s real domain: a "claim evidence" link sent to staff executes script as the trusted portal — phishing and session theft with a genuine URL.',
    loc: 'POST /claims/:id/evidence + GET /evidence/:id', exploit: 'Upload an evidence file with an .html name and a script payload; opening its download link serves it as text/html, executing under the portal origin.',
    fix: 'Allow-list safe evidence types, store uploads outside the web root, serve with Content-Disposition: attachment and a safe content type.',
    report: { title: 'Unrestricted File Upload Allows Stored HTML/Script Execution', severity: 'High', remediation: 'Restrict upload types, serve downloads as attachments with safe content types, and scan stored files.' } },
  { id: 'claim-evidence-idor', feature: 'Claims', name: 'Evidence Download IDOR — Other Customers\' Files', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: ['Evidence files download from /evidence/<id> — small sequential ids again.', 'The download never asks whose claim the file belongs to.', 'As Alice, download /evidence/2 — Bob\'s roof-damage evidence pack.'],
    lesson: 'Download endpoints are object accesses too — every file fetch needs the same ownership check as the page that links to it.',
    impact: 'Invoices, photos, and receipts from every claim are downloadable by any signed-in customer — raw personal and financial documents, perfect for identity theft.',
    loc: 'GET /evidence/:id', exploit: 'As Alice, request /evidence/2; Bob\'s claim evidence is downloaded with no ownership check.',
    fix: 'Authorise downloads against the parent claim\'s ownership before serving any file.',
    report: { title: 'Insecure Direct Object Reference on Evidence Downloads', severity: 'High', remediation: 'Enforce ownership checks on file download endpoints.' } },

  /* ---------------- Renewals & Billing ---------------- */
  { id: 'renew-price', feature: 'Renewals & Billing', name: 'Renewal Premium Manipulation — Pay $1 Instead of $340', owasp: 'A04:2021 – Insecure Design', difficulty: 'Intermediate',
    hints: ['The renewal form carries the premium as a hidden field, computed in the page.', 'Hidden fields are only hidden from people who do not look.', 'Intercept the renewal POST for your Auto policy and change premium from 340 to 1 — the renewal goes through at $1.'],
    lesson: 'Prices must be recomputed on the server at the moment of the transaction; any price that travels through the client is negotiable.',
    impact: 'Every customer can renew at $1: the insurer keeps providing full coverage while the premium income that funds claims evaporates.',
    loc: 'POST /policies/:id/renew', exploit: 'Submit the renewal for your own policy with the premium field tampered from $340 to $1; the policy renews at the attacker-chosen price.',
    fix: 'Ignore client-supplied prices; recompute premiums server-side from the rating engine at transaction time.',
    report: { title: 'Client-Side Price Tampering on Policy Renewal', severity: 'Critical', remediation: 'Compute all prices server-side; never accept monetary values from the client.' } },
  { id: 'renew-idor', feature: 'Renewals & Billing', name: 'Renew Another Customer\'s Policy (Action IDOR)', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['Renewal is a POST to /policies/<id>/renew — and ids are sequential.', 'Reading a policy checks nothing here; does acting on one check more?', 'As Alice, POST a renewal for policy 3 — Bob\'s policy. It renews.'],
    lesson: 'State-changing actions need authorization even more than reads — an id in the URL plus a POST is not consent from the owner.',
    impact: 'Attackers can renew, alter the billing state of, and create confusion around other customers\' policies — support chaos, billing disputes, and a foothold for refund fraud.',
    loc: 'POST /policies/:id/renew', exploit: 'As Alice, submit a renewal for Bob\'s policy (id 3); the state change is applied to another customer\'s policy.',
    fix: 'Authorise every state-changing action against the target object\'s owner.',
    report: { title: 'Missing Authorization on Policy Renewal Action', severity: 'High', remediation: 'Enforce ownership checks on all policy actions, not just views.' } },

  /* ---------------- Agent Portal ---------------- */
  { id: 'agent-queue', feature: 'Agent Portal', name: 'Agent Claims Queue Visible to Any Policyholder', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: ['Agents work from /agent. The route exists for every signed-in user to try.', 'The portal checks that you are logged in — it forgets to check WHAT you are.', 'Sign in as a normal customer and open /agent: the full claims queue, every customer, every amount.'],
    lesson: 'Authentication is not authorization: a staff-only page must verify the staff role on the server, every time.',
    impact: 'The entire claims operation — every customer, incident, and amount under review — is visible to any policyholder, including the fraudsters the queue exists to catch.',
    loc: 'GET /agent', exploit: 'Open /agent while signed in as a plain customer; the agent claims queue renders with all customers\' claims and personal details.',
    fix: 'Enforce role checks (agent/admin) server-side on every back-office route.',
    report: { title: 'Broken Access Control Exposes Agent Claims Queue to Customers', severity: 'High', remediation: 'Add server-side role authorization to all staff routes.' } },
  { id: 'agent-bac', feature: 'Agent Portal', name: 'Claim Decision by Non-Agent — Approve Your Own Claim', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['The queue\'s approve/reject action posts to /agent/claims/<id>/decide.', 'If the page forgot the role check, the action behind it probably did too.', 'As Alice, POST a decision of "approved" for your own claim (CLM-501) — it is approved. By you.'],
    lesson: 'Every privileged action endpoint must re-check the caller\'s role — hiding the button is not a control.',
    impact: 'Policyholders can approve their own claims — including inflated ones — converting the portal into a self-service payout machine.',
    loc: 'POST /agent/claims/:id/decide', exploit: 'As a customer, POST decision=approved for your own under-review claim; the claim status changes with no agent involved.',
    fix: 'Verify agent/admin role inside the decision handler and log all claim decisions with the acting user.',
    report: { title: 'Missing Authorization on Claim Decision Endpoint Allows Self-Approval', severity: 'Critical', remediation: 'Enforce role checks in the decision handler and maintain an audit trail of claim decisions.' } },

  /* ---------------- Admin Panel ---------------- */
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'Admin User Deactivation via GET (CSRF)', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['In the admin console, "Deactivate" is a plain link — a GET request that changes state.', 'GETs are fired by browsers for images, links, and prefetch — no form, no token.', 'As admin, simply visiting /admin/users/5/deactivate disables Carol\'s account — imagine that URL in an email to the admin.'],
    lesson: 'State changes must never ride on GET, and every admin action needs a verified anti-CSRF token.',
    impact: 'One malicious link or image in an email can make the admin deactivate any account — customers locked out, or a staffer\'s account killed mid-incident.',
    loc: 'GET /admin/users/:id/deactivate', exploit: 'Trigger the deactivation URL as the admin (a bare GET, no token); the target account is disabled immediately.',
    fix: 'Require POST with a verified anti-CSRF token for all admin actions; never mutate state on GET.',
    report: { title: 'State-Changing Admin Action Performed via GET Without CSRF Protection', severity: 'High', remediation: 'Convert admin actions to token-protected POSTs and audit all state changes.' } },

  /* ---------------- Platform & API ---------------- */
  { id: 'api-exposure', feature: 'Platform & API', name: 'Unauthenticated API Dumps Every Policyholder', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: ['The portal has a JSON API for "partners": /api/policyholders.', 'Try it in a private window — signed out completely.', 'No token, no login: the full policyholder list with emails and phone numbers comes back as JSON.'],
    lesson: 'APIs are doors too — an endpoint without authentication is a public data feed, whatever the UI shows.',
    impact: 'The entire customer book — names, emails, phone numbers, and policy summaries — is downloadable by anyone on the internet: a reportable data breach in one request.',
    loc: 'GET /api/policyholders', exploit: 'Request /api/policyholders with no session at all; the JSON response lists every user with contact details and their policies.',
    fix: 'Require authenticated, authorised API access with scoped tokens; return only the minimum fields a partner needs.',
    report: { title: 'Unauthenticated API Endpoint Exposes All Policyholder Data', severity: 'Critical', remediation: 'Put all API endpoints behind authentication and per-client authorization scopes.' } },
  { id: 'platform-headers', feature: 'Platform & API', name: 'Missing Security Headers', owasp: 'A05:2021 – Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Look at the response headers of any page — what is NOT there?', 'No Content-Security-Policy, no X-Frame-Options, no X-Content-Type-Options.', 'Simply loading the dashboard demonstrates it: the portal sends none of the standard protective headers.'],
    lesson: 'Security headers are cheap, broad protection — their absence leaves clickjacking and MIME-sniffing doors open that cost nothing to close.',
    impact: 'Without framing and content-type protections, the portal can be embedded in attacker pages for clickjacking against policyholders and staff.',
    loc: 'All responses (observed on GET /dashboard)', exploit: 'Load any portal page and inspect the response headers: no CSP, X-Frame-Options, or X-Content-Type-Options is set anywhere.',
    fix: 'Set a baseline header set (CSP, X-Frame-Options/frame-ancestors, X-Content-Type-Options, Referrer-Policy) at the server or proxy.',
    report: { title: 'Missing Baseline Security Headers', severity: 'Low', remediation: 'Deploy a standard security header set across all responses.' } },
];

/* Step-by-step guides the Lab Coach may share once a feature is unlocked
 * (≥3 attempts on that feature, or the test is already passed). */
const GUIDES = {
  'auth-sqli': "Step by step: 1) Log out and open the login page. 2) In the Email field type: ' OR '1'='1  3) Type any password and submit. The query is built by string concatenation, so your input rewrites the WHERE clause and the first matching user — the platform admin — is signed in.",
  'auth-brute': "Step by step: 1) Pick an account, e.g. bob@test.local. 2) Submit a wrong password. 3) Repeat at least 10 times in a row. Notice nothing changes: no delay, no CAPTCHA, no lockout. The test passes on the 10th processed failure — that missing throttle IS the vulnerability.",
  'auth-enum': "Step by step: 1) Submit a login for alice@test.local with a WRONG password and read the error: 'Incorrect password.' 2) Submit a login for an email that does not exist, e.g. ghost@nowhere.local: 'No account found for that email.' 3) The two different answers confirm which emails are real accounts.",
  'auth-default': "Step by step: 1) Read the login page carefully — it advertises a demo account. 2) Sign in with demo@hexainsure.local and password demo123. 3) You are inside a live policyholder account. Seeded/demo credentials must never survive into production.",
  'auth-reset': "Step by step: 1) The reset token is the first 10 hex characters of md5(email) — the email is public, so the token is computable. 2) In a terminal: printf 'alice@test.local' | md5sum, take the first 10 characters. 3) Open 'Forgot password', then the reset form, and submit the email, your computed token, and a new password. It is accepted.",
  'auth-cookie': "Step by step: 1) Sign in as a customer (Alice). 2) Open your browser's cookie storage for this site and find hx_role — it says 'customer'. 3) Change its value to 'admin'. 4) Visit /admin. The console reads your role from the cookie you control instead of the server-side account.",
  'reg-weakpass': "Step by step: 1) Open Register. 2) Create an account with the password set to a single character: a. 3) It is accepted. A password policy (length + breached-password screening) is the missing control.",
  'reg-mass': "Step by step: 1) Intercept or craft the registration request (the form posts name, email, password). 2) Add one more field to the POST body: role=agent. 3) Submit. The server binds the whole body, so your new account is created as an agent — sign in and open /agent to confirm.",
  'reg-xss': "Step by step: 1) Register (or use Profile) with the display name set to a payload: <script>alert(1)</script>. 2) The name is stored as-is. 3) Browse the app — the greeting in the header renders your 'name' as markup, and the same happens for agents/admins who view lists containing you.",
  'prof-csrf': "Step by step: 1) Sign in and open Profile — note the hidden marker field in the form. 2) Replay the POST to /profile/update WITHOUT the marker field (or with an Origin header from another site). 3) The change is applied anyway — the marker is never verified server-side.",
  'pol-idor': "Step by step: 1) Sign in as Alice and open your own policy (id 1). 2) Change the URL to /policies/3. 3) Bob's Home Shield Plus policy renders in full — coverage, premium, everything. The detail page never checks that the policy belongs to you.",
  'pol-coverage': "Step by step: 1) Open your own policy and find the 'Manage policy' update form — it posts coverageLimit and premium back to the server. 2) Change coverageLimit to 999999 (and/or lower the premium). 3) Submit and reload: the contract terms are now whatever you typed. Price and coverage must be computed server-side, never bound from the request.",
  'pol-search-sqli': "Step by step: 1) Open the policy search. 2) Search for: ' OR '1'='1  3) Instead of only your policies, the results list every customer's policies — the search text was glued into a query.",
  'pol-search-xss': "Step by step: 1) In the policy search, search for: <script>alert(1)</script>  2) Open the results page and view source. 3) Your input is reflected unescaped in the 'Results for' line — markup you control, executed in the portal origin.",
  'claim-idor': "Step by step: 1) Sign in as Alice and open your claim (id 1). 2) Change the URL to /claims/2. 3) Bob's storm-damage claim renders in full. Same IDOR pattern as policies — claims were never ownership-checked either.",
  'claim-inflate': "Step by step: 1) Check your Auto Protect policy: coverage limit $20,000. 2) File a new claim on that policy and set the amount to 50000. 3) Submit — the claim is created and queued 'under review' at $50,000. The server never compares the amount with the coverage it is claimed against.",
  'claim-upload': "Step by step: 1) Open one of your claims and find the evidence upload form (filename + content). 2) Upload a file named proof.html whose content is an HTML page with a <script> in it. 3) Open the new evidence's download link: it is served as text/html from the portal's own origin, so the script runs as the portal.",
  'claim-evidence-idor': "Step by step: 1) Sign in as Alice. 2) Your own evidence is at /evidence/1. 3) Request /evidence/2 — Bob's roof-damage evidence pack downloads. The download endpoint never checks whose claim the file belongs to.",
  'renew-price': "Step by step: 1) Open your Auto Protect policy (renewal premium $340) and intercept the renewal POST — the premium travels as a form field. 2) Change premium to 1. 3) Submit: the policy renews and the recorded renewal premium is $1. Prices must be recomputed on the server.",
  'renew-idor': "Step by step: 1) Sign in as Alice. 2) Send the renewal POST to /policies/3/renew (Bob's policy), with his normal renewal premium. 3) The renewal is applied to a policy you do not own — the action endpoint never checks ownership.",
  'agent-queue': "Step by step: 1) Sign in as a normal customer (Alice). 2) Browse directly to /agent. 3) The full claims queue renders — every customer, claim, and amount. The route verifies only that SOMEONE is logged in, never that they are staff.",
  'agent-bac': "Step by step: 1) Sign in as Alice; your claim CLM-501 is 'under review'. 2) POST to /agent/claims/1/decide with decision=approved. 3) Your claim is now approved — decided by you. The decision endpoint performs no role check at all.",
  'admin-csrf': "Step by step: 1) Sign in as the admin and open /admin. 2) Notice 'Deactivate' is a plain link. 3) Visit /admin/users/5/deactivate directly — a bare GET, no form, no token — and Carol's account is disabled. Any page that makes an admin's browser load that URL fires it.",
  'api-exposure': "Step by step: 1) Sign out completely (or use a private window). 2) Request /api/policyholders. 3) Full JSON comes back: every policyholder's name, email, phone, and their policies. No token was ever asked for.",
  'platform-headers': "Step by step: 1) Sign in and load the dashboard. 2) Inspect the response headers (browser dev tools → Network, or curl -I). 3) There is no Content-Security-Policy, no X-Frame-Options, no X-Content-Type-Options — the test passes on observation because the headers genuinely are absent.",
};
const TEST_BY_ID = Object.fromEntries(TESTS.map(t => [t.id, t]));
const FEATURES = [...new Set(TESTS.map(t => t.feature))];

/* ================================================================== *
 * PROGRESS ENGINE + PERSISTENCE (progress.json)
 * ================================================================== */
let _state = null;
function defaultState() {
  return { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
}
function S() {
  if (_state) return _state;
  try {
    _state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (typeof _state !== 'object' || _state === null) _state = defaultState();
    _state.tests = _state.tests || {}; _state.attempts = _state.attempts || {};
  } catch (e) { _state = defaultState(); }
  return _state;
}
function save() {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(S(), null, 1)); } catch (e) { /* non-fatal */ }
}
function pass(id) {
  const st = S();
  if (TEST_BY_ID[id] && !st.tests[id]) {
    st.tests[id] = true;
    if (TESTS.every(t => st.tests[t.id])) { st.completedAt = new Date().toISOString(); st.keyRevealed = true; }
    save();
  }
}
function bump(feature) {
  const st = S();
  st.attempts[feature] = (st.attempts[feature] || 0) + 1;
  save();
}
function doneCount() { return TESTS.filter(t => S().tests[t.id]).length; }
function isComplete() { return doneCount() === TESTS.length; }
function progressInfo() {
  const st = S(); const done = doneCount();
  const features = {};
  for (const f of FEATURES) {
    const ft = TESTS.filter(t => t.feature === f);
    features[f] = { total: ft.length, done: ft.filter(t => st.tests[t.id]).length, attempts: st.attempts[f] || 0 };
  }
  return { lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done, pct: Math.floor(done / TESTS.length * 100), features, complete: isComplete(), tests: Object.fromEntries(TESTS.map(t => [t.id, !!st.tests[t.id]])) };
}

/* ================================================================== *
 * SESSIONS + SMALL HELPERS
 * ================================================================== */
const sessions = new Map(); // sid -> { userId, marker }
function newSession(userId) {
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, { userId, marker: crypto.randomBytes(8).toString('hex') });
  return sid;
}
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function sessionOf(req) {
  const sid = parseCookies(req).hx_session;
  return sid && sessions.has(sid) ? { sid, ...sessions.get(sid) } : null;
}
function userOf(req) {
  const s = sessionOf(req);
  return s ? users.find(u => u.id === s.userId) || null : null;
}
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const XSS_RE = /(<script|onerror\s*=|onload\s*=|<svg|<img[^>]*\sonerror|<iframe|<body[^>]*\sonload)/i;
const INJ_RE = /('\s*(or|and)\s+('[^']*'|"[^"]*"|\d+|[a-z]+)\s*=\s*('[^']*'?|"[^"]*"?|\d+|[a-z]+))|('\s*--)|('\s*or\s+1\s*=\s*1)/i;
function md5(s) { return crypto.createHash('md5').update(String(s)).digest('hex'); }

/* In-memory detection trackers (not persisted; progress itself persists) */
const failCounts = {};            // email -> consecutive-ish failure count
const enumProbes = { known: false, unknown: false };

function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 2e6) { req.destroy(); resolve({}); } });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) {
        try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); }
      } else {
        const out = {};
        for (const pair of data.split('&')) {
          if (!pair) continue;
          const i = pair.indexOf('=');
          const k = decodeURIComponent((i < 0 ? pair : pair.slice(0, i)).replace(/\+/g, ' '));
          const v = decodeURIComponent((i < 0 ? '' : pair.slice(i + 1)).replace(/\+/g, ' '));
          out[k] = v;
        }
        resolve(out);
      }
    });
    req.on('error', () => resolve({}));
  });
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function redirect(res, loc) { res.writeHead(302, { Location: loc }); res.end(); }

/* ================================================================== *
 * UI LAYOUT
 * ================================================================== */
const CSS = `
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;background:#f4f6fb;color:#1c2333}
  header{background:#0d1526;color:#fff;padding:10px 20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
  header img{height:38px;width:38px;border-radius:8px}
  header .brand{font-weight:700;font-size:18px}
  header .brand span{background:linear-gradient(90deg,#4f7cff,#a04dff);-webkit-background-clip:text;background-clip:text;color:transparent}
  header nav a{color:#cdd8ff;margin-right:14px;text-decoration:none;font-size:14px}
  header nav a:hover{text-decoration:underline}
  .pbar{background:#1b2745;border-radius:6px;height:10px;min-width:170px;flex:0 0 170px;overflow:hidden}
  .pbar i{display:block;height:100%;background:linear-gradient(90deg,#4f7cff,#a04dff)}
  .pmeta{font-size:12px;color:#aebadd}
  main{max-width:980px;margin:24px auto;padding:0 16px 60px}
  .card{background:#fff;border:1px solid #dde3f0;border-radius:10px;padding:18px 20px;margin-bottom:16px;box-shadow:0 1px 3px rgba(20,30,60,.05)}
  h1{font-size:24px;margin:6px 0 14px} h2{font-size:18px;margin:4px 0 10px} h3{font-size:15px;margin:12px 0 6px}
  table{border-collapse:collapse;width:100%} th,td{border-bottom:1px solid #e6eaf3;padding:8px 10px;text-align:left;font-size:14px;vertical-align:top}
  input,select,textarea{padding:8px 10px;border:1px solid #c3cbdd;border-radius:6px;font-size:14px;width:100%;box-sizing:border-box;margin:4px 0 10px}
  button,.btn{display:inline-block;background:linear-gradient(90deg,#4f7cff,#a04dff);color:#fff;border:0;padding:9px 16px;border-radius:6px;font-size:14px;cursor:pointer;text-decoration:none}
  button:hover,.btn:hover{opacity:.92}
  .muted{color:#66708a;font-size:13px} .err{background:#fdecec;border:1px solid #f3b8b8;color:#8c1f1f;padding:10px 12px;border-radius:8px;margin-bottom:12px}
  .ok{background:#e9f9ee;border:1px solid #a9dcb6;color:#14532d;padding:10px 12px;border-radius:8px;margin-bottom:12px}
  .tag{display:inline-block;background:#eef1fb;border:1px solid #ccd5ee;border-radius:20px;padding:1px 9px;font-size:12px;margin-right:5px}
  .done{color:#14803c;font-weight:600}.open{color:#98a0b5}
  details{margin:6px 0} summary{cursor:pointer;color:#3b5bdb;font-size:13px}
  #chatbtn{position:fixed;right:18px;bottom:18px;background:linear-gradient(90deg,#4f7cff,#a04dff);color:#fff;border-radius:24px;padding:11px 18px;cursor:pointer;box-shadow:0 4px 14px rgba(40,60,160,.35);font-size:14px;z-index:50}
  #chatbox{position:fixed;right:18px;bottom:70px;width:330px;max-width:92vw;background:#fff;border:1px solid #ccd5ee;border-radius:12px;box-shadow:0 10px 30px rgba(20,30,60,.25);display:none;flex-direction:column;z-index:50}
  #chatbox .chead{background:#0d1526;color:#fff;padding:10px 14px;border-radius:12px 12px 0 0;font-weight:600;font-size:14px}
  #chatlog{height:260px;overflow-y:auto;padding:10px 12px;font-size:13px}
  #chatlog .me{text-align:right;margin:6px 0}. #chatlog .bot{margin:6px 0}
  #chatlog .bub{display:inline-block;padding:7px 10px;border-radius:10px;max-width:88%;text-align:left;white-space:pre-wrap}
  #chatlog .me .bub{background:#e7edff}. #chatlog .bot .bub{background:#f1f3f9}
  #chatform{display:flex;gap:6px;padding:10px;border-top:1px solid #e6eaf3}
  #chatform input{flex:1;margin:0}
  .cert{border:3px double #7a5af8;border-radius:14px;padding:34px;text-align:center;background:#fff}
  @media print{header,#chatbtn,#chatbox,.noprint{display:none!important}}
`;
function layout(req, title, body, opts) {
  opts = opts || {};
  const st = S(); const done = doneCount(); const pct = Math.floor(done / TESTS.length * 100);
  const user = opts.user !== undefined ? opts.user : userOf(req);
  const nav = user ? `<nav>
      <a href="/dashboard">Dashboard</a><a href="/policies">My Policies</a><a href="/claims">My Claims</a>
      <a href="/search">Policy Search</a><a href="/profile">Profile</a><a href="/agent">Agent Portal</a><a href="/tests">Mission Tests</a>
      <a href="/logout">Log out</a></nav>
      <span class="pmeta">Hello, ${user.name}</span>` : `<nav><a href="/tests">Mission Tests</a></nav>`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — ${LAB_NAME}</title><style>${CSS}</style></head><body>
<header><img src="/logo.png" alt="HexaCyberLab logo"><div class="brand">LAB ${LAB_NUMBER} — <span>${LAB_NAME}</span></div>
<div class="pbar"><i style="width:${pct}%"></i></div><div class="pmeta">${done}/${TESTS.length} tests · ${pct}%</div>${nav}</header>
<main>${body}</main>
<div id="chatbtn">💬 Lab Coach</div>
<div id="chatbox"><div class="chead">Lab Coach — ${LAB_NAME}</div><div id="chatlog"></div>
<form id="chatform"><input id="chatin" placeholder="Ask about tests, features, who built this…" autocomplete="off"><button type="submit">Send</button></form></div>
<script>
var cb=document.getElementById('chatbtn'),bx=document.getElementById('chatbox'),lg=document.getElementById('chatlog'),started=false;
cb.onclick=function(){bx.style.display=bx.style.display==='flex'?'none':'flex';if(!started){started=true;ask('');}};
function add(who,txt){var d=document.createElement('div');d.className=who;var b=document.createElement('div');b.className='bub';b.textContent=txt;d.appendChild(b);lg.appendChild(d);lg.scrollTop=lg.scrollHeight;}
function ask(m){fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})}).then(function(r){return r.json()}).then(function(j){add('bot',j.reply)}).catch(function(){add('bot','Coach unavailable right now.')});}
document.getElementById('chatform').onsubmit=function(e){e.preventDefault();var i=document.getElementById('chatin');var v=i.value.trim();if(!v)return;i.value='';add('me',v);ask(v);};
</script></body></html>`;
}
function gatePage(req, err) {
  const body = `<div class="card" style="max-width:560px;margin:40px auto;text-align:center">
    <img src="/logo.png" style="height:64px;width:64px;border-radius:12px" alt="HexaCyberLab logo">
    <h1>LAB ${LAB_NUMBER} — ${LAB_NAME}</h1>
    <p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
    ${err ? `<div class="err">${esc(err)}</div>` : ''}
    <form method="POST" action="/unlock"><input name="key" placeholder="Completion key from Lab ${LAB_NUMBER - 1}" autocomplete="off">
    <button type="submit">Unlock Lab ${LAB_NUMBER}</button></form>
    <p class="muted">HexaInsurance is a local-only training lab by HexaCyberLab. Never deploy it publicly.</p></div>`;
  return layout(req, 'Locked', body, { user: null });
}

/* ================================================================== *
 * AUTH PAGES + HANDLERS
 * ================================================================== */
function loginPage(req, err) {
  const body = `<div class="card" style="max-width:480px;margin:30px auto">
    <h1>Sign in to HexaInsurance</h1>
    ${err ? `<div class="err">${esc(err)}</div>` : ''}
    <form method="POST" action="/login">
      <label>Email</label><input name="email" type="email" required>
      <label>Password</label><input name="password" type="password" required>
      <button type="submit">Sign in</button></form>
    <p class="muted">Just looking around? Use our demo account — email <b>demo@hexainsure.local</b>, password <b>demo123</b>.</p>
    <p class="muted"><a href="/forgot">Forgot your password?</a> · <a href="/register">Create an account</a></p>
    <p class="muted">Test accounts: alice@test.local / alice123 · bob@test.local / bob123 · carol@test.local / carol123 · agent@hexainsure.local / agent123 · admin@hexainsure.local / admin123</p></div>`;
  return layout(req, 'Sign in', body, { user: null });
}
async function handleLogin(req, res) {
  const b = await readBody(req);
  bump('Login & Authentication');
  const email = String(b.email || ''), password = String(b.password || '');
  const fail = msg => send(res, 200, loginPage(req, msg));

  /* VULNERABLE legacy string-built lookup: input is glued into a query. */
  const query = "SELECT * FROM users WHERE email='" + email + "' AND password='" + password + "'";
  if (INJ_RE.test(email) || INJ_RE.test(password)) {
    const victim = users.find(u => u.email === 'admin@hexainsure.local');
    pass('auth-sqli');
    return startSession(res, victim);
  }
  const user = users.find(u => u.email === email);
  if (!user) {
    enumProbes.unknown = true;
    if (enumProbes.known && enumProbes.unknown) pass('auth-enum');
    return fail('No account found for that email.');
  }
  if (user.password !== password) {
    enumProbes.known = true;
    if (enumProbes.known && enumProbes.unknown) pass('auth-enum');
    failCounts[email] = (failCounts[email] || 0) + 1;
    if (failCounts[email] >= 10) pass('auth-brute'); // 10th failure still processed — no throttle exists
    return fail('Incorrect password.');
  }
  if (!user.active) return fail('This account has been deactivated.');
  if (user.email === 'demo@hexainsure.local') pass('auth-default');
  return startSession(res, user);
}
function startSession(res, user) {
  const sid = newSession(user.id);
  res.writeHead(302, {
    Location: '/dashboard',
    'Set-Cookie': [
      `hx_session=${sid}; Path=/; HttpOnly`,
      `hx_role=${user.role}; Path=/`,
      `hx_origin=${sessions.get(sid).marker}; Path=/`,
    ],
  });
  res.end();
}
function registerPage(req, err) {
  const body = `<div class="card" style="max-width:480px;margin:30px auto">
    <h1>Create your HexaInsurance account</h1>
    ${err ? `<div class="err">${esc(err)}</div>` : ''}
    <form method="POST" action="/register">
      <label>Full name</label><input name="name" required>
      <label>Email</label><input name="email" type="email" required>
      <label>Password</label><input name="password" type="password" required>
      <button type="submit">Create account</button></form>
    <p class="muted">Already registered? <a href="/login">Sign in</a></p></div>`;
  return layout(req, 'Register', body, { user: null });
}
async function handleRegister(req, res) {
  const b = await readBody(req);
  bump('Registration & Profile');
  const name = String(b.name || 'New Customer'), email = String(b.email || ''), password = String(b.password || '');
  if (!email || !password) return send(res, 200, registerPage(req, 'Email and password are required.'));
  if (users.some(u => u.email === email)) return send(res, 200, registerPage(req, 'An account with that email already exists.'));
  /* VULNERABLE: the whole request body is bound — extra fields (role!) are honoured. */
  let role = 'customer';
  if (b.role === 'agent' || b.role === 'admin') { role = b.role; pass('reg-mass'); }
  if (password.length <= 3) pass('reg-weakpass'); // no password policy at all
  if (XSS_RE.test(name)) pass('reg-xss');          // stored unescaped, rendered in header/lists
  const user = { id: nextUserId++, name, email, password, role, phone: String(b.phone || ''), address: String(b.address || ''), active: true };
  users.push(user);
  return startSession(res, user);
}
function forgotPage(req, msg) {
  const body = `<div class="card" style="max-width:480px;margin:30px auto">
    <h1>Forgot your password?</h1>
    ${msg ? `<div class="ok">${esc(msg)}</div>` : ''}
    <form method="POST" action="/forgot">
      <label>Email</label><input name="email" type="email" required>
      <button type="submit">Send reset link</button></form>
    <h3>Have a reset token?</h3>
    <form method="POST" action="/reset">
      <label>Email</label><input name="email" type="email" required>
      <label>Reset token</label><input name="token" required>
      <label>New password</label><input name="newpassword" type="password" required>
      <button type="submit">Set new password</button></form>
    <p class="muted"><a href="/login">Back to sign in</a></p></div>`;
  return layout(req, 'Forgot password', body, { user: null });
}
async function handleForgot(req, res) {
  const b = await readBody(req);
  bump('Login & Authentication');
  /* The "emailed" token is md5(email)[:10] — computable by anyone (see auth-reset). */
  return send(res, 200, forgotPage(req, 'If an account exists for that email, a reset link is on its way.'));
}
async function handleReset(req, res) {
  const b = await readBody(req);
  bump('Login & Authentication');
  const user = users.find(u => u.email === String(b.email || ''));
  const expected = user ? md5(user.email).slice(0, 10) : null;
  if (user && expected && String(b.token || '') === expected) {
    user.password = String(b.newpassword || 'changed123');
    pass('auth-reset');
    return send(res, 200, forgotPage(req, 'Password updated. You can now sign in with your new password.'));
  }
  return send(res, 200, forgotPage(req, 'That reset token was not accepted.'));
}

/* ================================================================== *
 * APP PAGES (signed-in)
 * ================================================================== */
function requireUser(req, res) {
  const user = userOf(req);
  if (!user) { redirect(res, '/login'); return null; }
  return user;
}
function policyRow(p) {
  const owner = users.find(u => u.id === p.ownerId);
  return `<tr><td><a href="/policies/${p.id}">${esc(p.number)}</a></td><td>${esc(p.type)}</td><td>${esc(owner ? owner.name : '?')}</td><td>$${p.coverageLimit.toLocaleString()}</td><td>$${p.premium}/yr</td><td>${esc(p.status)}</td></tr>`;
}
function claimRow(c) {
  const pol = policies.find(p => p.id === c.policyId);
  return `<tr><td><a href="/claims/${c.id}">${esc(c.number)}</a></td><td>${esc(pol ? pol.number : '?')}</td><td>${esc(c.incident)}</td><td>$${c.amount.toLocaleString()}</td><td>${esc(c.status)}</td></tr>`;
}
function dashboardPage(req, res) {
  const user = requireUser(req, res); if (!user) return;
  pass('platform-headers'); // responses genuinely carry no CSP / X-Frame-Options / XCTO
  const mine = policies.filter(p => p.ownerId === user.id);
  const myClaims = claims.filter(c => c.createdBy === user.id);
  const body = `<h1>Welcome back</h1>
    <div class="card"><h2>Your cover at a glance</h2>
      <p><span class="tag">${esc(user.role)}</span> <span class="tag">${mine.length} polic${mine.length === 1 ? 'y' : 'ies'}</span> <span class="tag">${myClaims.length} claim(s)</span></p>
      <p class="muted">Policyholder since 2024 · Claims are usually reviewed within 3 business days.</p>
      <p><a class="btn" href="/claims/new">File a claim</a> <a class="btn" href="/policies">View policies</a></p></div>
    <div class="card"><h2>Your policies</h2><table><tr><th>Number</th><th>Type</th><th>Holder</th><th>Coverage</th><th>Premium</th><th>Status</th></tr>
      ${mine.map(policyRow).join('') || '<tr><td colspan="6" class="muted">No policies yet.</td></tr>'}</table></div>
    <div class="card"><h2>Your recent claims</h2><table><tr><th>Claim</th><th>Policy</th><th>Incident</th><th>Amount</th><th>Status</th></tr>
      ${myClaims.map(claimRow).join('') || '<tr><td colspan="5" class="muted">No claims yet.</td></tr>'}</table></div>`;
  send(res, 200, layout(req, 'Dashboard', body, { user }));
}
function policiesPage(req, res) {
  const user = requireUser(req, res); if (!user) return;
  const mine = policies.filter(p => p.ownerId === user.id);
  const body = `<h1>My Policies</h1><div class="card"><table><tr><th>Number</th><th>Type</th><th>Holder</th><th>Coverage</th><th>Premium</th><th>Status</th></tr>
    ${mine.map(policyRow).join('') || '<tr><td colspan="6" class="muted">No policies yet.</td></tr>'}</table>
    <p class="muted">Policy documents and renewal options live on each policy's page.</p></div>`;
  send(res, 200, layout(req, 'My Policies', body, { user }));
}
function policyDetailPage(req, res, id) {
  const user = requireUser(req, res); if (!user) return;
  bump('Policies & Coverage');
  const p = policies.find(x => x.id === id);
  if (!p) return send(res, 404, layout(req, 'Not found', '<div class="card"><h1>Policy not found</h1></div>', { user }));
  /* VULNERABLE: no ownership check on the detail page. */
  if (p.ownerId !== user.id && user.role === 'customer') pass('pol-idor');
  const owner = users.find(u => u.id === p.ownerId);
  const polClaims = claims.filter(c => c.policyId === p.id);
  const body = `<h1>Policy ${esc(p.number)} — ${esc(p.type)}</h1>
    <div class="card"><table>
      <tr><th>Policyholder</th><td>${esc(owner ? owner.name : '?')} (${esc(owner ? owner.email : '')})</td></tr>
      <tr><th>Coverage limit</th><td>$${p.coverageLimit.toLocaleString()}</td></tr>
      <tr><th>Annual premium</th><td>$${p.premium}</td></tr>
      <tr><th>Renewal premium</th><td>$${p.renewalPremium}</td></tr>
      <tr><th>Status</th><td>${esc(p.status)} · renewed ${p.renewals} time(s)${p.lastRenewalPremium != null ? ` · last renewal paid $${p.lastRenewalPremium}` : ''}</td></tr></table></div>
    <div class="card"><h2>Manage policy</h2>
      <form method="POST" action="/policies/${p.id}/update">
        <label>Coverage limit ($)</label><input name="coverageLimit" type="number" value="${p.coverageLimit}">
        <label>Annual premium ($)</label><input name="premium" type="number" value="${p.premium}">
        <button type="submit">Save changes</button></form>
      <p class="muted">Coverage changes normally require an agent review and a re-priced quote.</p></div>
    <div class="card"><h2>Renew this policy</h2>
      <form method="POST" action="/policies/${p.id}/renew">
        <input type="hidden" name="premium" value="${p.renewalPremium}">
        <p>Renew for 12 months at <b>$${p.renewalPremium}</b>.</p>
        <button type="submit">Renew now</button></form></div>
    <div class="card"><h2>Claims on this policy</h2><table><tr><th>Claim</th><th>Policy</th><th>Incident</th><th>Amount</th><th>Status</th></tr>
      ${polClaims.map(claimRow).join('') || '<tr><td colspan="5" class="muted">No claims on this policy.</td></tr>'}</table></div>`;
  send(res, 200, layout(req, 'Policy ' + p.number, body, { user }));
}
async function handlePolicyUpdate(req, res, id) {
  const user = requireUser(req, res); if (!user) return;
  bump('Policies & Coverage');
  const b = await readBody(req);
  const p = policies.find(x => x.id === id);
  if (!p) return send(res, 404, 'Policy not found');
  /* VULNERABLE: financial terms are bound straight from the request body. */
  let tampered = false;
  if (b.coverageLimit !== undefined && Number(b.coverageLimit) !== p.coverageLimit) { p.coverageLimit = Number(b.coverageLimit); tampered = true; }
  if (b.premium !== undefined && Number(b.premium) !== p.premium) { p.premium = Number(b.premium); tampered = true; }
  if (b.renewalPremium !== undefined) p.renewalPremium = Number(b.renewalPremium);
  if (b.status !== undefined) p.status = String(b.status);
  if (tampered) pass('pol-coverage');
  redirect(res, '/policies/' + p.id);
}
async function handleRenew(req, res, id) {
  const user = requireUser(req, res); if (!user) return;
  bump('Renewals & Billing');
  const b = await readBody(req);
  const p = policies.find(x => x.id === id);
  if (!p) return send(res, 404, 'Policy not found');
  /* VULNERABLE: no ownership check on the action, and the price comes from the client. */
  if (p.ownerId !== user.id) pass('renew-idor');
  const posted = b.premium !== undefined ? Number(b.premium) : p.renewalPremium;
  if (!Number.isNaN(posted) && posted < p.renewalPremium) pass('renew-price');
  p.renewals += 1; p.status = 'active'; p.lastRenewalPremium = Number.isNaN(posted) ? p.renewalPremium : posted;
  redirect(res, '/policies/' + p.id);
}
function searchPage(req, res, q) {
  const user = requireUser(req, res); if (!user) return;
  bump('Policies & Coverage');
  q = q || '';
  /* VULNERABLE: the search text is glued into a lookup string (the "query" below). */
  const builtQuery = "SELECT * FROM policies WHERE owner=" + user.id + " AND (number LIKE '%" + q + "%' OR type LIKE '%" + q + "%')";
  let results;
  if (INJ_RE.test(q)) {
    results = policies.slice(); // bent query: the owner scoping is commented away
    if (results.some(p => p.ownerId !== user.id)) pass('pol-search-sqli');
  } else {
    const needle = q.toLowerCase();
    results = policies.filter(p => p.ownerId === user.id && (p.number.toLowerCase().includes(needle) || p.type.toLowerCase().includes(needle)));
  }
  if (XSS_RE.test(q)) pass('pol-search-xss'); // q is reflected unescaped below
  const body = `<h1>Policy Search</h1>
    <div class="card"><form method="GET" action="/search"><label>Search by policy number or type</label>
      <input name="q" value="${esc(q)}"><button type="submit">Search</button></form>
      <p class="muted">Lookup: <code>${esc(builtQuery)}</code></p></div>
    <div class="card"><h2>Results for "${q}"</h2>
      <table><tr><th>Number</th><th>Type</th><th>Holder</th><th>Coverage</th><th>Premium</th><th>Status</th></tr>
      ${results.map(policyRow).join('') || '<tr><td colspan="6" class="muted">No matching policies.</td></tr>'}</table></div>`;
  send(res, 200, layout(req, 'Policy Search', body, { user }));
}

/* ================================================================== *
 * CLAIMS + EVIDENCE
 * ================================================================== */
function claimsPage(req, res) {
  const user = requireUser(req, res); if (!user) return;
  const mine = claims.filter(c => c.createdBy === user.id);
  const body = `<h1>My Claims</h1><div class="card"><table><tr><th>Claim</th><th>Policy</th><th>Incident</th><th>Amount</th><th>Status</th></tr>
    ${mine.map(claimRow).join('') || '<tr><td colspan="5" class="muted">No claims yet.</td></tr>'}</table>
    <p><a class="btn" href="/claims/new">File a new claim</a></p></div>`;
  send(res, 200, layout(req, 'My Claims', body, { user }));
}
function claimNewPage(req, res, err) {
  const user = requireUser(req, res); if (!user) return;
  const mine = policies.filter(p => p.ownerId === user.id);
  const body = `<h1>File a claim</h1><div class="card">
    ${err ? `<div class="err">${esc(err)}</div>` : ''}
    <form method="POST" action="/claims">
      <label>Policy</label><select name="policyId">${mine.map(p => `<option value="${p.id}">${esc(p.number)} — ${esc(p.type)} (coverage $${p.coverageLimit.toLocaleString()})</option>`).join('')}</select>
      <label>Incident</label><input name="incident" required>
      <label>Claim amount ($)</label><input name="amount" type="number" required>
      <label>What happened?</label><textarea name="description" rows="3"></textarea>
      <button type="submit">Submit claim</button></form></div>`;
  send(res, 200, layout(req, 'File a claim', body, { user }));
}
async function handleClaimCreate(req, res) {
  const user = requireUser(req, res); if (!user) return;
  bump('Claims');
  const b = await readBody(req);
  const p = policies.find(x => x.id === Number(b.policyId));
  if (!p) return claimNewPage(req, res, 'Please choose one of your policies.');
  const amount = Number(b.amount || 0);
  /* VULNERABLE: the claimed amount is never checked against the policy's coverage limit. */
  if (amount > p.coverageLimit) pass('claim-inflate');
  const c = { id: nextClaimId++, number: 'CLM-' + (500 + nextClaimId), policyId: p.id, amount, status: 'under review', incident: String(b.incident || 'Incident'), description: String(b.description || ''), createdBy: user.id };
  claims.push(c);
  redirect(res, '/claims/' + c.id);
}
function claimDetailPage(req, res, id) {
  const user = requireUser(req, res); if (!user) return;
  bump('Claims');
  const c = claims.find(x => x.id === id);
  if (!c) return send(res, 404, layout(req, 'Not found', '<div class="card"><h1>Claim not found</h1></div>', { user }));
  /* VULNERABLE: no ownership check on the detail page. */
  if (c.createdBy !== user.id && user.role === 'customer') pass('claim-idor');
  const p = policies.find(x => x.id === c.policyId);
  const ev = evidence.filter(e => e.claimId === c.id);
  const body = `<h1>Claim ${esc(c.number)}</h1>
    <div class="card"><table>
      <tr><th>Policy</th><td>${esc(p ? p.number : '?')} — ${esc(p ? p.type : '')}</td></tr>
      <tr><th>Incident</th><td>${esc(c.incident)}</td></tr>
      <tr><th>Amount claimed</th><td>$${c.amount.toLocaleString()}</td></tr>
      <tr><th>Status</th><td>${esc(c.status)}</td></tr>
      <tr><th>Details</th><td>${esc(c.description)}</td></tr></table></div>
    <div class="card"><h2>Evidence</h2>
      ${ev.map(e => `<p>📎 <a href="/evidence/${e.id}">${esc(e.filename)}</a> <span class="muted">(${esc(e.contentType)})</span></p>`).join('') || '<p class="muted">No evidence uploaded yet.</p>'}
      <h3>Add evidence</h3>
      <form method="POST" action="/claims/${c.id}/evidence">
        <label>File name</label><input name="filename" placeholder="e.g. invoice.pdf" required>
        <label>File content (simulated upload)</label><textarea name="content" rows="3" required></textarea>
        <button type="submit">Upload evidence</button></form></div>`;
  send(res, 200, layout(req, 'Claim ' + c.number, body, { user }));
}
async function handleEvidenceUpload(req, res, claimId) {
  const user = requireUser(req, res); if (!user) return;
  bump('Claims');
  const b = await readBody(req);
  const c = claims.find(x => x.id === claimId);
  if (!c) return send(res, 404, 'Claim not found');
  const filename = String(b.filename || 'evidence.txt');
  const lower = filename.toLowerCase();
  /* VULNERABLE: any file type is accepted and later served with a matching content type. */
  const contentType = lower.endsWith('.html') || lower.endsWith('.htm') ? 'text/html'
    : lower.endsWith('.svg') ? 'image/svg+xml'
    : lower.endsWith('.pdf') ? 'application/pdf' : 'text/plain';
  const e = { id: nextEvidenceId++, claimId: c.id, filename, contentType, content: String(b.content || ''), uploadedBy: user.id };
  evidence.push(e);
  redirect(res, '/claims/' + c.id);
}
function handleEvidenceDownload(req, res, id) {
  const user = requireUser(req, res); if (!user) return;
  bump('Claims');
  const e = evidence.find(x => x.id === id);
  if (!e) return send(res, 404, 'Evidence not found');
  const c = claims.find(x => x.id === e.claimId);
  /* VULNERABLE: downloads are never ownership-checked; uploads are served inline. */
  if (c && c.createdBy !== user.id && user.role === 'customer') pass('claim-evidence-idor');
  if ((e.contentType === 'text/html' || e.contentType === 'image/svg+xml') && e.id >= 4) pass('claim-upload');
  res.writeHead(200, { 'Content-Type': e.contentType });
  res.end(e.content);
}

/* ================================================================== *
 * PROFILE
 * ================================================================== */
function profilePage(req, res, msg) {
  const user = requireUser(req, res); if (!user) return;
  const sess = sessionOf(req);
  const body = `<h1>My Profile</h1><div class="card">
    ${msg ? `<div class="ok">${esc(msg)}</div>` : ''}
    <form method="POST" action="/profile/update">
      <input type="hidden" name="_hxm" value="${sess ? sess.marker : ''}">
      <label>Full name</label><input name="name" value="${esc(user.name)}">
      <label>Phone</label><input name="phone" value="${esc(user.phone)}">
      <label>Address</label><input name="address" value="${esc(user.address)}">
      <button type="submit">Save profile</button></form>
    <p class="muted">Account role: ${esc(user.role)} · Email: ${esc(user.email)}</p></div>`;
  send(res, 200, layout(req, 'Profile', body, { user }));
}
async function handleProfileUpdate(req, res) {
  const user = requireUser(req, res); if (!user) return;
  bump('Registration & Profile');
  const sess = sessionOf(req);
  const b = await readBody(req);
  /* VULNERABLE: the anti-CSRF marker is rendered in the form but never verified. */
  const origin = String(req.headers.origin || '');
  const markerBad = !sess || String(b._hxm || '') !== sess.marker;
  const foreignOrigin = origin && !origin.includes('127.0.0.1') && !origin.includes('localhost');
  if (markerBad || foreignOrigin) pass('prof-csrf');
  if (b.name !== undefined) { if (XSS_RE.test(String(b.name))) pass('reg-xss'); user.name = String(b.name); }
  if (b.phone !== undefined) user.phone = String(b.phone);
  if (b.address !== undefined) user.address = String(b.address);
  return profilePage(req, res, 'Profile saved.');
}

/* ================================================================== *
 * AGENT PORTAL + ADMIN
 * ================================================================== */
function agentPage(req, res) {
  const user = requireUser(req, res); if (!user) return;
  bump('Agent Portal');
  /* VULNERABLE: login is checked, the agent role is not. */
  if (user.role === 'customer') pass('agent-queue');
  const rows = claims.map(c => {
    const p = policies.find(x => x.id === c.policyId);
    const holder = users.find(u => u.id === c.createdBy);
    return `<tr><td>${esc(c.number)}</td><td>${holder ? holder.name : '?'}<br><span class="muted">${esc(holder ? holder.email : '')}</span></td>
      <td>${esc(p ? p.number : '?')}</td><td>${esc(c.incident)}</td><td>$${c.amount.toLocaleString()}</td><td>${esc(c.status)}</td>
      <td><form method="POST" action="/agent/claims/${c.id}/decide" style="display:inline"><input type="hidden" name="decision" value="approved"><button type="submit">Approve</button></form>
      <form method="POST" action="/agent/claims/${c.id}/decide" style="display:inline"><input type="hidden" name="decision" value="rejected"><button type="submit">Reject</button></form></td></tr>`;
  }).join('');
  const body = `<h1>Agent Portal — Claims Review Queue</h1>
    <div class="card"><p class="muted">All claims across all policyholders, awaiting review.</p>
    <table><tr><th>Claim</th><th>Customer</th><th>Policy</th><th>Incident</th><th>Amount</th><th>Status</th><th>Decision</th></tr>${rows}</table></div>`;
  send(res, 200, layout(req, 'Agent Portal', body, { user }));
}
async function handleAgentDecide(req, res, claimId) {
  const user = requireUser(req, res); if (!user) return;
  bump('Agent Portal');
  const b = await readBody(req);
  const c = claims.find(x => x.id === claimId);
  if (!c) return send(res, 404, 'Claim not found');
  /* VULNERABLE: the decision endpoint performs no role check at all. */
  if (user.role !== 'agent' && user.role !== 'admin') pass('agent-bac');
  c.status = b.decision === 'rejected' ? 'rejected' : 'approved';
  redirect(res, '/agent');
}
function adminPage(req, res) {
  const user = requireUser(req, res); if (!user) return;
  bump('Admin Panel');
  /* VULNERABLE: the console trusts the client-editable hx_role cookie. */
  const roleCookie = parseCookies(req).hx_role;
  if (roleCookie !== 'admin') return send(res, 403, layout(req, 'Forbidden', '<div class="card"><h1>403 — Admins only</h1><p class="muted">Your role cookie does not grant access to this console.</p></div>', { user }));
  if (user.role !== 'admin') pass('auth-cookie');
  const rows = users.map(u => `<tr><td>${u.id}</td><td>${u.name}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td>${u.active ? 'active' : 'deactivated'}</td>
    <td>${u.active ? `<a href="/admin/users/${u.id}/deactivate">Deactivate</a>` : ''}</td></tr>`).join('');
  const body = `<h1>Admin Console</h1><div class="card"><h2>All accounts</h2>
    <table><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr>${rows}</table></div>`;
  send(res, 200, layout(req, 'Admin Console', body, { user }));
}
function handleAdminDeactivate(req, res, id) {
  const user = requireUser(req, res); if (!user) return;
  bump('Admin Panel');
  if (parseCookies(req).hx_role !== 'admin') return send(res, 403, 'Forbidden');
  const target = users.find(u => u.id === id);
  /* VULNERABLE: a state-changing admin action performed by a bare GET, no token. */
  if (target && target.active) { target.active = false; pass('admin-csrf'); }
  redirect(res, '/admin');
}

/* ================================================================== *
 * API
 * ================================================================== */
function handleApiPolicyholders(req, res) {
  bump('Platform & API');
  /* VULNERABLE: no authentication at all on this endpoint. */
  if (!sessionOf(req)) pass('api-exposure');
  const data = users.map(u => ({
    id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, active: u.active,
    policies: policies.filter(p => p.ownerId === u.id).map(p => ({ number: p.number, type: p.type, coverageLimit: p.coverageLimit, premium: p.premium })),
  }));
  send(res, 200, JSON.stringify({ policyholders: data }, null, 1), 'application/json');
}

/* ================================================================== *
 * LAB SYSTEM PAGES — /tests, /complete, /certificate
 * ================================================================== */
function testsPage(req, res) {
  const st = S(); const info = progressInfo();
  let body = `<h1>Mission Tests — LAB ${LAB_NUMBER} ${LAB_NAME}</h1>
    <div class="card"><p>${info.done}/${info.total} tests complete · <b>${info.pct}%</b> · Attempts are counted per feature; the Lab Coach unlocks step-by-step help for a feature after 3 genuine attempts on it.</p></div>`;
  for (const f of FEATURES) {
    const ft = TESTS.filter(t => t.feature === f);
    body += `<div class="card"><h2>${esc(f)}</h2><p class="muted">Attempts on this feature: ${st.attempts[f] || 0}</p>`;
    for (const t of ft) {
      const done = !!st.tests[t.id];
      body += `<h3>${done ? '<span class="done">✓</span>' : '<span class="open">○</span>'} ${esc(t.name)}</h3>
        <p class="muted">${esc(t.owasp)} · ${esc(t.difficulty)} · ${done ? '<span class="done">done</span>' : 'open'}</p>
        <details><summary>Hint 1</summary><p>${esc(t.hints[0])}</p>
        <details><summary>Hint 2</summary><p>${esc(t.hints[1])}</p>
        <details><summary>Hint 3</summary><p>${esc(t.hints[2])}</p></details></details></details>`;
    }
    body += `</div>`;
  }
  send(res, 200, layout(req, 'Mission Tests', body, {}));
}
function completePage(req, res) {
  const st = S(); const info = progressInfo();
  if (!info.complete) {
    const left = TESTS.filter(t => !st.tests[t.id]).map(t => `<li>${esc(t.name)} <span class="muted">(${esc(t.feature)})</span></li>`).join('');
    return send(res, 200, layout(req, 'Not complete yet', `<h1>Not quite there</h1><div class="card">
      <p>Progress: <b>${info.done}/${info.total} · ${info.pct}%</b></p><p>Still open:</p><ul>${left}</ul>
      <p><a class="btn" href="/tests">Back to the Mission Tests</a></p></div>`, {}));
  }
  const byFeature = FEATURES.map(f => {
    const ft = TESTS.filter(t => t.feature === f);
    return `<tr><td>${esc(f)}</td><td>${ft.length}</td></tr>`;
  }).join('');
  const ways = TESTS.map((t, i) => `<li>${esc(t.name)} — <span class="muted">${esc(t.owasp)}</span></li>`).join('');
  const learned = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('');
  const impacts = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('');
  const reports = TESTS.map(t => `<li><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)} — Remediation: ${esc(t.report.remediation)}</li>`).join('');
  const body = `<h1>🎉 Lab ${LAB_NUMBER} Complete — 100%</h1>
    <div class="card"><h2>1 · Total features in this lab</h2><p>${FEATURES.length} features, ${TESTS.length} security tests.</p>
      <table><tr><th>Feature</th><th>Vulnerability tests</th></tr>${byFeature}</table></div>
    <div class="card"><h2>2 · Per-feature vulnerability counts</h2><p>See the table above — every feature was tested against every technique that applies to it.</p></div>
    <div class="card"><h2>3 · Ways testing was done (${TESTS.length} techniques)</h2><ol>${ways}</ol></div>
    <div class="card"><h2>4 · What you learned</h2><ul>${learned}</ul></div>
    <div class="card"><h2>5 · What this means for a real client</h2><ul>${impacts}</ul></div>
    <div class="card"><h2>6 · Writing it in a real report</h2><ul>${reports}</ul></div>
    <div class="card"><h2>Your completion key — unlocks Lab ${LAB_NUMBER + 1}</h2>
      <p style="font-size:20px"><code id="completion-key">${completionKey()}</code></p>
      <form method="POST" action="/complete"><label>Your name for the certificate</label>
      <input name="testerName" value="${esc(st.testerName || '')}" placeholder="e.g. Alex Tester">
      <button type="submit">Save name</button></form>
      <p><a class="btn" href="/certificate">View your certificate</a></p></div>`;
  send(res, 200, layout(req, 'Lab Complete', body, {}));
}
async function handleCompleteName(req, res) {
  const b = await readBody(req);
  const st = S();
  if (isComplete() && b.testerName) { st.testerName = String(b.testerName).slice(0, 80); save(); }
  redirect(res, '/complete');
}
function certificatePage(req, res) {
  const st = S();
  if (!isComplete()) return redirect(res, '/complete');
  const name = st.testerName || 'HexaCyberLab Tester';
  const date = st.completedAt ? new Date(st.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const body = `<div class="cert">
    <img src="/logo.png" style="height:74px;width:74px;border-radius:14px" alt="HexaCyberLab logo">
    <h1 style="margin-bottom:2px">Certificate of Completion</h1>
    <p class="muted">This certifies that</p>
    <h2 style="font-size:26px;margin:4px 0">${esc(name)}</h2>
    <p>has completed 100% of the security tests in</p>
    <h2>LAB ${LAB_NUMBER} — ${LAB_NAME}</h2>
    <p>${TESTS.length} tests across ${FEATURES.length} features · Completed ${esc(date)}</p>
    <p style="margin-top:22px"><b>HexaCyberLab</b> — Built by Md. Jony Hassain, Founder</p></div>
    <p class="noprint" style="text-align:center;margin-top:14px"><button onclick="window.print()">Print certificate</button></p>`;
  send(res, 200, layout(req, 'Certificate', body, {}));
}

/* ================================================================== *
 * LAB COACH CHATBOT (POST /api/chat)
 * ================================================================== */
const FEATURE_KEYS = [
  ['Claims', ['claim', 'evidence']],
  ['Agent Portal', ['agent']],
  ['Admin Panel', ['admin']],
  ['Renewals & Billing', ['renew', 'premium', 'billing']],
  ['Policies & Coverage', ['polic', 'coverage', 'search']],
  ['Registration & Profile', ['regist', 'sign up', 'signup', 'profile']],
  ['Login & Authentication', ['login', 'log in', 'auth', 'brute', 'forgot', 'reset token', 'session', 'cookie']],
  ['Platform & API', ['api', 'header', 'platform']],
];
function findFeature(msg) {
  for (const [f, keys] of FEATURE_KEYS) if (keys.some(k => msg.includes(k))) return f;
  return null;
}
function chatReply(raw) {
  const st = S(); const info = progressInfo();
  const msg = String(raw || '').toLowerCase().trim();
  if (!msg) return `Hi! I'm the Lab Coach for LAB ${LAB_NUMBER} — ${LAB_NAME}. This lab has ${FEATURES.length} features and ${TESTS.length} security tests. You're at ${info.done}/${info.total} (${info.pct}%). Ask me how many tests a feature has, or — after at least 3 genuine attempts on a feature — ask me how to do its tests.`;
  if (/(who (built|made|created)|founder|your (boss|creator))/.test(msg)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (msg.includes('key')) {
    if (info.complete && st.keyRevealed) return `You've completed the lab — well earned! The completion key for LAB ${LAB_NUMBER} is: ${completionKey()} — it unlocks Lab ${LAB_NUMBER + 1}.`;
    return `I don't have the completion key yet — I only receive it when this lab is completed 100%. Right now you're at ${info.pct}%. Finish all ${TESTS.length} tests and I'll share it.`;
  }
  const feature = findFeature(msg);
  const wantsCount = /(how many|count|list|which|what (tests|vulnerab)|features)/.test(msg);
  const wantsHow = /(how|step|guide|help|hint|exploit|solve|do (the|it|this)|bypass|attack)/.test(msg);
  if (feature && (wantsCount || !wantsHow)) {
    const ft = TESTS.filter(t => t.feature === feature);
    const doneN = ft.filter(t => st.tests[t.id]).length;
    return `${feature}: ${ft.length} tests (${doneN} done, ${st.attempts[feature] || 0} attempts so far):\n` + ft.map(t => `• ${t.name} — ${st.tests[t.id] ? '✓ done' : 'open'}`).join('\n') + (wantsHow ? '' : '\nAsk me "how" after at least 3 attempts on this feature and I\'ll guide you step by step.');
  }
  if (feature && wantsHow) {
    const attempts = st.attempts[feature] || 0;
    const ft = TESTS.filter(t => t.feature === feature);
    const open = ft.filter(t => !st.tests[t.id]);
    if (attempts >= 3 || open.length === 0) {
      const list = (open.length ? open : ft).map(t => `▸ ${t.name}: ${GUIDES[t.id] || t.hints[2]}`).join('\n');
      return `Here's the step-by-step for ${feature}:\n${list}`;
    }
    return `That feature is locked for help. First try the ${feature} tests yourself at least 3 times — I can see you've tried ${attempts} time(s) so far. After 3 real tries, ask me again and I'll guide you step by step.`;
  }
  if (wantsCount || msg.includes('feature')) {
    return `LAB ${LAB_NUMBER} — ${LAB_NAME} has ${FEATURES.length} features and ${TESTS.length} tests:\n` + FEATURES.map(f => { const fi = info.features[f]; return `• ${f}: ${fi.total} tests (${fi.done} done, ${fi.attempts} attempts)`; }).join('\n') + `\nOverall progress: ${info.done}/${info.total} (${info.pct}%). The full map is on the /tests page.`;
  }
  if (wantsHow) {
    return 'Tell me which feature you mean — e.g. "how do I do the Claims tests?" Remember: step-by-step help unlocks after at least 3 genuine attempts on that feature. The /tests page lists every test with graded hints.';
  }
  if (msg.includes('progress') || msg.includes('next')) {
    const next = TESTS.find(t => !st.tests[t.id]);
    return `You're at ${info.done}/${info.total} tests (${info.pct}%).` + (next ? ` Next open test: "${next.name}" in ${next.feature}. Attempts on that feature so far: ${st.attempts[next.feature] || 0} (help unlocks at 3).` : ' Everything is done — see /complete for your key and certificate!');
  }
  return `I can help with: feature/test counts ("how many tests in Claims?"), step-by-step guidance after 3 attempts on a feature ("how do I do the Claims tests?"), your progress, and who built these labs. The full test map with hints lives on /tests.`;
}
async function handleChat(req, res) {
  const b = await readBody(req);
  send(res, 200, JSON.stringify({ reply: chatReply(b.message) }), 'application/json');
}

/* ------------------------------------------------------------------ *
 * Completion key shards (Lab 48's entry key). Assembled ONLY at 100%
 * (for /complete, /certificate context, and the coach's unlocked
 * knowledge) — never before its reveal moment, never a plain literal.
 * ------------------------------------------------------------------ */
const _C = ["TC1YSA==","My04NA==","RDZLSw==","LUtGMA==","UDE2NA==","UlRCTA=="];
function completionKey() { return _asm(_C); }

/* ================================================================== *
 * ROUTER
 * ================================================================== */
async function route(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1');
  const p = url.pathname;
  const m = req.method;
  const st = S();

  if (p === '/logo.png') {
    try { const img = fs.readFileSync(path.join(DIR, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(img); }
    catch (e) { return send(res, 404, 'logo missing'); }
  }
  if (p === '/unlock' && m === 'POST') {
    const b = await readBody(req);
    if (entryKeyMatches(String(b.key || ''))) { st.unlocked = true; save(); return redirect(res, '/'); }
    return send(res, 403, gatePage(req, 'That key was not accepted.'));
  }
  if (p === '/api/progress') return send(res, 200, JSON.stringify(progressInfo()), 'application/json');
  if (p === '/api/chat' && m === 'POST') return handleChat(req, res);

  /* Lock gate: until unlocked, ONLY the gate exists. */
  if (!st.unlocked) return send(res, 200, gatePage(req));

  if (p === '/' ) return userOf(req) ? redirect(res, '/dashboard') : send(res, 200, loginPage(req));
  if (p === '/login' && m === 'GET') return send(res, 200, loginPage(req));
  if (p === '/login' && m === 'POST') return handleLogin(req, res);
  if (p === '/logout') {
    const s = sessionOf(req); if (s) sessions.delete(s.sid);
    res.writeHead(302, { Location: '/login', 'Set-Cookie': ['hx_session=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0', 'hx_origin=; Path=/; Max-Age=0'] });
    return res.end();
  }
  if (p === '/register' && m === 'GET') return send(res, 200, registerPage(req));
  if (p === '/register' && m === 'POST') return handleRegister(req, res);
  if (p === '/forgot' && m === 'GET') return send(res, 200, forgotPage(req));
  if (p === '/forgot' && m === 'POST') return handleForgot(req, res);
  if (p === '/reset' && m === 'POST') return handleReset(req, res);

  if (p === '/dashboard') return dashboardPage(req, res);
  if (p === '/policies') return policiesPage(req, res);
  let mm;
  if ((mm = p.match(/^\/policies\/(\d+)$/)) && m === 'GET') return policyDetailPage(req, res, Number(mm[1]));
  if ((mm = p.match(/^\/policies\/(\d+)\/update$/)) && m === 'POST') return handlePolicyUpdate(req, res, Number(mm[1]));
  if ((mm = p.match(/^\/policies\/(\d+)\/renew$/)) && m === 'POST') return handleRenew(req, res, Number(mm[1]));
  if (p === '/search') return searchPage(req, res, url.searchParams.get('q') || '');

  if (p === '/claims' && m === 'GET') return claimsPage(req, res);
  if (p === '/claims' && m === 'POST') return handleClaimCreate(req, res);
  if (p === '/claims/new') return claimNewPage(req, res);
  if ((mm = p.match(/^\/claims\/(\d+)$/)) && m === 'GET') return claimDetailPage(req, res, Number(mm[1]));
  if ((mm = p.match(/^\/claims\/(\d+)\/evidence$/)) && m === 'POST') return handleEvidenceUpload(req, res, Number(mm[1]));
  if ((mm = p.match(/^\/evidence\/(\d+)$/)) && m === 'GET') return handleEvidenceDownload(req, res, Number(mm[1]));

  if (p === '/profile' && m === 'GET') return profilePage(req, res);
  if (p === '/profile/update' && m === 'POST') return handleProfileUpdate(req, res);

  if (p === '/agent' && m === 'GET') return agentPage(req, res);
  if ((mm = p.match(/^\/agent\/claims\/(\d+)\/decide$/)) && m === 'POST') return handleAgentDecide(req, res, Number(mm[1]));

  if (p === '/admin' && m === 'GET') return adminPage(req, res);
  if ((mm = p.match(/^\/admin\/users\/(\d+)\/deactivate$/)) && m === 'GET') return handleAdminDeactivate(req, res, Number(mm[1]));

  if (p === '/api/policyholders') return handleApiPolicyholders(req, res);

  if (p === '/tests') return testsPage(req, res);
  if (p === '/complete' && m === 'GET') return completePage(req, res);
  if (p === '/complete' && m === 'POST') return handleCompleteName(req, res);
  if (p === '/certificate') return certificatePage(req, res);

  return send(res, 404, layout(req, 'Not found', '<div class="card"><h1>404 — Page not found</h1><p class="muted">That page does not exist in this lab.</p></div>', {}));
}

if (require.main === module) {
  const server = http.createServer((req, res) => {
    route(req, res).catch(() => { try { send(res, 500, 'Internal error'); } catch (e) { /* socket gone */ } });
  });
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`${LAB_NAME} (LAB ${LAB_NUMBER}) listening on http://127.0.0.1:${PORT} — local training only`);
  });
}
module.exports = { TESTS, GUIDES, FEATURES, LAB_NUMBER, LAB_NAME, PORT };
