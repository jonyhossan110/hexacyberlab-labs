'use strict';
/*
 * LAB 107 — HexaInsuranceClaim (Category 11: Specialized & Advanced Business Systems)
 * Insurance claims processing platform — INTENTIONALLY VULNERABLE training lab.
 * Zero-dependency Node.js. Binds 127.0.0.1:3116 only. All seed data is fake.
 * Built by Md. Jony Hassain, Founder of HexaCyberLab.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB_NUMBER = 107;
const LAB_NAME = 'HexaInsuranceClaim';
const PORT = 3116;
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const DOCS_DIR = path.join(DIR, 'docs');

/* ------------------------------------------------------------------ *
 * Key material — stored ONLY as base64-of-reversed shards, scattered
 * through this file. Assembled at runtime; never a plain literal.
 * ------------------------------------------------------------------ */
const _eA = ["MUwtWEg=","RjUtNzA=","WUtMNVU="];
const _cA = ["MUwtWEg=","QzgtODA=","WFowMVQ="];

function _asm(a, b) {
  return a.concat(b).map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}

/* ============================ TESTS registry ============================ */
const TESTS = [
  /* ---------- Login & Authentication ---------- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login form builds its database query by gluing your input straight into the query text.', "Try a classic tautology in the email field so the WHERE clause is always true, and comment out the rest.", "Email: ' OR '1'='1' --  with any password logs you in as the first account in the table."],
    lesson: 'String-built queries let an attacker rewrite the login logic itself — no password is needed when the query can be made always-true.',
    impact: 'On a real insurer portal this means instant takeover of the first account in the database (often an admin), with full access to claims and payouts.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute Force — No Login Throttling', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Notice what happens after several wrong passwords for the same account — does anything slow down or lock?', 'Script 10+ wrong passwords for one account and watch whether every attempt is still processed normally.', 'There is no lockout, no CAPTCHA and no delay: the 10th wrong password is answered exactly like the 1st.'],
    lesson: 'Without throttling or lockout, password guessing is only a matter of time and wordlist size.',
    impact: 'Attackers can grind through common passwords against customer and staff accounts, leading to claim fraud and data breaches.',
    report: { title: 'Missing Brute-Force Protection on Login', severity: 'High', remediation: 'Add progressive delays, account lockout and alerting after repeated failed logins; consider MFA for staff.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'Account Enumeration via Login & Reset Responses', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the error message for an email that exists with a wrong password vs an email that does not exist at all.', 'The forgot-password form answers differently too. Probe at least 5 different emails across the two forms.', 'Existing account + wrong password says "Incorrect password"; unknown email says "No account with that email" — a perfect oracle for harvesting valid accounts.'],
    lesson: 'Different error messages for "no such user" and "wrong password" turn your login form into an account-existence oracle.',
    impact: 'Attackers first harvest the valid customer/staff email list, then focus password attacks and phishing only on real accounts.',
    report: { title: 'User Enumeration via Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message ("Invalid email or password") for every failed login and reset request.' } },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Published Demo / Default Admin Credentials', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Read the login page carefully — it helpfully lists demo accounts for testers.', 'One of the published demo accounts is the administrator, with a password that matches its role name pattern.', 'Log in with the published admin demo credentials shown on the login page.'],
    lesson: 'Default and demo credentials printed on the login page are an open door — attackers try them before anything clever.',
    impact: 'Anyone on the internet can sign in as administrator and read or approve every claim in the business.',
    report: { title: 'Default Administrator Credentials Published on Login Page', severity: 'Critical', remediation: 'Remove demo accounts and default passwords from production; force unique strong credentials.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable Password Reset Token', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a reset for your own account and look at the token format — then look at your numeric user id.', 'The token is a short prefix plus your id and a simple arithmetic function of that id (multiply, then add).', 'Token format: HIC<id>-<id*137+42>. Compute it for any user id — it works even when no reset was ever requested.'],
    lesson: 'A reset token derived from public data (the user id) with simple arithmetic is not a secret — it is a formula anyone can compute.',
    impact: 'An attacker who knows a victim\'s user id can reset their password and take over the account, then file or approve fraudulent claims.',
    report: { title: 'Password Reset Token Is Predictable (Derived from User ID)', severity: 'High', remediation: 'Generate reset tokens from a CSPRNG (≥128 bits), expire them quickly, and only honour tokens that were actually issued.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Role Cookie Tampering (hx_role)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After login, inspect your cookies — one of them repeats your role back to the server.', 'The adjuster and admin areas trust that cookie instead of checking the account on the server.', 'Set your hx_role cookie to "adjuster" or "admin" and reload /adjuster or /admin.'],
    lesson: 'Authorisation decisions must be made from server-side session data, never from values the client can edit.',
    impact: 'Any customer can crown themselves adjuster or admin by editing a cookie, approving their own claims and reading the whole book of business.',
    report: { title: 'Privilege Escalation via Client-Controlled Role Cookie', severity: 'Critical', remediation: 'Store roles only in the server-side session/record; ignore role claims from cookies or request fields.' } },

  /* ---------- Registration & Profile ---------- */
  { id: 'reg-weak', feature: 'Registration & Profile', name: 'Weak Password Policy at Registration', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['The registration form claims a minimum password length — test whether it is actually enforced.', 'Try registering with a password far below the stated minimum.', 'A 1-character password is accepted and the account works immediately.'],
    lesson: 'A password policy that exists only as page text protects nothing — enforcement must happen on the server.',
    impact: 'Customers pick trivially guessable passwords, making credential attacks against claim accounts cheap and reliable.',
    report: { title: 'Password Length Policy Not Enforced Server-Side', severity: 'Medium', remediation: 'Enforce minimum length and complexity on the server for every account-creation path.' } },
  { id: 'reg-mass', feature: 'Registration & Profile', name: 'Mass Assignment — Role Granted at Registration', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration endpoint copies more of your submitted form into the new account than the visible fields suggest.', 'Add fields the form never shows you — think about which account attributes would be valuable.', 'POST /register with an extra field role=adjuster (or admin) and the new account is created with that role.'],
    lesson: 'Binding request fields directly onto the account object lets attackers set privileged attributes the UI never offered.',
    impact: 'Attackers mint their own adjuster/admin accounts, bypassing every hiring and vetting control the insurer has.',
    report: { title: 'Mass Assignment in Registration Allows Privilege Escalation', severity: 'High', remediation: 'Whitelist exactly the fields a registrant may set; assign roles only through staff workflows.' } },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03:2021 Injection (XSS)', difficulty: 'Beginner',
    hints: ['Your display name is shown back in staff views exactly as typed.', 'Register (or rename yourself) with a name that is actually an HTML/JS payload.', 'A name like <script>alert(1)</script> is stored and rendered raw in the admin user list.'],
    lesson: 'Any user-controlled text rendered without encoding becomes stored XSS when staff view it.',
    impact: 'A malicious customer name can run script in an adjuster\'s or admin\'s browser, hijacking their session and the claims they control.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Contextually encode all user-supplied output; validate names against an allowlist of characters.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Legit profile forms carry a hidden hx_marker field tied to your session. What happens if it is missing?', 'Replay the profile update POST without the hx_marker field (e.g. from a raw curl request).', 'The update is applied with no marker check at all — a cross-site form could do the same in a victim\'s browser.'],
    lesson: 'State-changing endpoints without an anti-CSRF token can be triggered by any website the victim visits while logged in.',
    impact: 'Attackers can silently change a victim\'s profile details (including contact email) to prepare account takeover or divert claim communications.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require a per-session anti-CSRF token on every state-changing request and verify Origin/Referer.' } },

  /* ---------- Claims ---------- */
  { id: 'claim-idor', feature: 'Claims', name: 'Claim IDOR — Read Another Policyholder\'s Claim', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Claim pages live at predictable numeric URLs like /claim/2.', 'Log in as one policyholder and open a claim that belongs to someone else.', 'No ownership check is done — any logged-in policyholder can read any claim, including amounts and descriptions.'],
    lesson: 'Sequential object ids plus no ownership check equals a full read of every customer\'s private claims.',
    impact: 'Competitors, fraudsters or curious strangers can read customers\' accident, health and damage details — a serious privacy breach.',
    report: { title: 'Insecure Direct Object Reference on Claim Details', severity: 'High', remediation: 'Check on the server that the requesting user owns (or is staff for) every claim being served.' } },
  { id: 'claim-amount', feature: 'Claims', name: 'Claim Amount Inflation Beyond Coverage Limit', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['Your policy has a coverage limit. The claim update form lets you edit the claimed amount — does the server compare them?', 'Edit your own claim and raise the amount far above your policy\'s coverage limit.', 'Amounts above the coverage limit are saved without complaint — the policy terms say payouts must stay within the limit.'],
    lesson: 'Business limits (coverage caps) must be enforced server-side at the moment data changes, not just displayed in the UI.',
    impact: 'Fraudulent customers inflate claims beyond their coverage, converting a $10,000 policy into unlimited payouts.',
    report: { title: 'Claim Amount Can Exceed Policy Coverage Limit', severity: 'High', remediation: 'Validate claimed amounts against the policy coverage limit on the server for every create/update.' } },
  { id: 'claim-edit', feature: 'Claims', name: 'Edit Another Policyholder\'s Claim', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The claim update endpoint takes a claim id — try posting an update to a claim that is not yours.', 'Change the description or amount of someone else\'s claim via POST /claim/<id>/update.', 'The update is saved even though you do not own the claim.'],
    lesson: 'Read-only IDOR often hides a write IDOR next door: if you can view it, check whether you can also change it.',
    impact: 'Attackers can sabotage other customers\' claims, alter amounts, or plant misleading descriptions that derail legitimate payouts.',
    report: { title: 'Broken Access Control Allows Editing Other Customers\' Claims', severity: 'High', remediation: 'Authorise every mutation against the claim\'s owner/staff assignment on the server.' } },
  { id: 'claim-status', feature: 'Claims', name: 'Claim Status Forgery via Edit Form', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The update handler copies several posted fields onto the claim — including one it should only take from adjusters.', 'Add a status field to your own claim\'s update POST.', 'POST /claim/<id>/update with status=approved flips your own claim to approved without any adjuster.'],
    lesson: 'Workflow state must transition only through guarded server-side steps — never from client-supplied fields.',
    impact: 'Customers approve their own claims, short-circuiting fraud review and triggering payouts the business never authorised.',
    report: { title: 'Mass Assignment of Claim Status Allows Self-Approval', severity: 'Critical', remediation: 'Remove status from user-writable fields; drive status changes only through role-checked workflow endpoints.' } },
];

const TESTS2 = [
  /* ---------- Adjuster & Approvals ---------- */
  { id: 'adj-self', feature: 'Adjuster & Approvals', name: 'Approval Endpoint Missing Role Check', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The adjuster approval action is just a POST to /adjuster/approve/<claimId>. Who is allowed to call it?', 'Call it as a plain policyholder on your own claim — the UI hides the button, but the endpoint may not check.', 'Any logged-in user can approve any claim: the endpoint never verifies the adjuster role.'],
    lesson: 'Hiding a button is not access control. Every privileged endpoint must verify the caller\'s role on the server.',
    impact: 'Policyholders approve their own (possibly fraudulent) claims and set the stage for payout — the core anti-fraud control is absent.',
    report: { title: 'Claim Approval Endpoint Lacks Authorisation Check', severity: 'Critical', remediation: 'Require the adjuster role (and assignment) server-side on approval endpoints.' } },
  { id: 'adj-payout-inflate', feature: 'Adjuster & Approvals', name: 'Payout Set Above the Claimed Amount', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['When approving, a payout figure is submitted with the request. Is it compared to the claimed amount?', 'Approve a claim while supplying a payout far larger than the amount claimed.', 'The payout is stored unchecked — approve a $2,500 claim with payout=999999 and it sticks.'],
    lesson: 'Money-out fields need server-side sanity bounds against the underlying claim and policy, whoever submits them.',
    impact: 'A rogue or tricked adjuster session can authorise payouts many times the claimed amount, directly draining the insurer.',
    report: { title: 'Approved Payout Not Validated Against Claimed Amount', severity: 'High', remediation: 'Enforce payout ≤ min(claimed amount, coverage limit) on the server at approval time.' } },
  { id: 'adj-notes', feature: 'Adjuster & Approvals', name: 'Internal Adjuster Notes Leaked to Policyholder', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['One seeded claim carries confidential internal notes about a fraud suspicion. Whose screen do they appear on?', 'Log in as the owner of Bob\'s water-damage claim (claim 2) and open its detail page.', 'The internal SIU note is rendered on the customer-facing claim page — it was only ever meant for staff.'],
    lesson: 'Fields intended for staff eyes must be filtered from customer responses, not merely hidden with CSS.',
    impact: 'Suspected fraudsters learn they are under investigation and why, letting them destroy evidence or adjust their story.',
    report: { title: 'Confidential Internal Notes Exposed in Customer Claim View', severity: 'Medium', remediation: 'Strip internal-only fields from any response served to non-staff users.' } },

  /* ---------- Evidence & Documents ---------- */
  { id: 'ev-upload', feature: 'Evidence & Documents', name: 'Unrestricted Evidence Upload (Stored HTML)', owasp: 'A03:2021 Injection (File Upload)', difficulty: 'Intermediate',
    hints: ['Evidence upload accepts a filename and content. What file types does it refuse?', 'Upload an evidence file whose name ends in .html and whose content is a script payload, then open it.', 'The file is stored and served back as text/html from the portal domain — a stored XSS page on the insurer\'s own site.'],
    lesson: 'Upload features must validate type by content, store safely, and serve with safe content types — extension trust is not enough.',
    impact: 'Attackers host phishing/script pages on the insurer\'s trusted domain and send them to customers or staff.',
    report: { title: 'Unrestricted File Upload Allows Stored HTML/JS', severity: 'High', remediation: 'Allowlist evidence types, verify content, serve uploads with Content-Disposition: attachment and a safe type.' } },
  { id: 'ev-idor', feature: 'Evidence & Documents', name: 'Evidence Download IDOR', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Evidence files have their own numeric download URLs (/evidence/<id>).', 'As one policyholder, download an evidence file that belongs to another customer\'s claim.', 'No ownership check: any logged-in user can download any evidence file by guessing its id.'],
    lesson: 'Attachments inherit the sensitivity of the claim — they need the same ownership checks as the claim itself.',
    impact: 'Private evidence (medical bills, photos, invoices) of every customer can be harvested by any account holder.',
    report: { title: 'Insecure Direct Object Reference on Evidence Downloads', severity: 'High', remediation: 'Authorise evidence downloads against the parent claim\'s owner/staff on the server.' } },
  { id: 'ev-traversal', feature: 'Evidence & Documents', name: 'Path Traversal in Document Download', owasp: 'A01:2021 Broken Access Control (Path Traversal)', difficulty: 'Intermediate',
    hints: ['The /download endpoint serves files from the docs folder using the name you give it.', 'What happens if the name contains ../ sequences that climb out of the docs folder?', '/download?file=../server.js serves the application\'s own source code.'],
    lesson: 'Filenames from users must be resolved and confined to the intended directory — string concatenation is not confinement.',
    impact: 'Attackers read source code, configuration and any file the server can reach, staging deeper compromise.',
    report: { title: 'Directory Traversal in Document Download', severity: 'High', remediation: 'Resolve the absolute path and require it to stay inside the documents directory; reject .. components.' } },

  /* ---------- Payouts ---------- */
  { id: 'pay-double', feature: 'Payouts', name: 'Double Payout — No Idempotency on Release', owasp: 'A04:2021 Insecure Design', difficulty: 'Advanced',
    hints: ['An approved claim can be paid via POST /adjuster/payout/<claimId>. What stops it being called twice?', 'Approve a claim, release its payout, then release it again and compare the payout records / totals.', 'Every call creates a fresh payout: the same claim can be paid again and again, exceeding the approved amount.'],
    lesson: 'Money-moving actions must be idempotent and state-guarded: once paid, a claim must refuse further payouts.',
    impact: 'Insiders or attackers with endpoint access drain multiples of every approved claim — direct financial loss.',
    report: { title: 'Payout Release Can Be Repeated (No Idempotency / State Guard)', severity: 'Critical', remediation: 'Guard payout release with claim state (approved → paid is one-way) and idempotency keys; reconcile totals.' } },
  { id: 'pay-idor', feature: 'Payouts', name: 'Payout Record IDOR', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Payout records live at /payouts/<id> with sequential ids.', 'As a policyholder, open a payout record that belongs to another customer.', 'Payout amounts and claim links of other customers are served without any ownership check.'],
    lesson: 'Financial records are prime IDOR targets — every record view needs an ownership or role decision.',
    impact: 'Attackers map who got paid and how much, enabling targeted fraud, extortion and social engineering.',
    report: { title: 'Insecure Direct Object Reference on Payout Records', severity: 'Medium', remediation: 'Restrict payout record views to the payee and authorised staff.' } },

  /* ---------- Search ---------- */
  { id: 'search-sqli', feature: 'Search', name: 'SQL Injection in Claim Search', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Search builds a LIKE query from your term by string concatenation, just like the login did.', 'A tautology in the search box can dump rows that normal searches never show — including non-customer records.', "Search for ' OR '1'='1' --  and the hidden internal investigation claim appears in the results."],
    lesson: 'Every string-built query is an injection point, not just the login form — search is a favourite because it returns data directly.',
    impact: 'Attackers dump the entire claims database, including internal fraud investigations, through the public search box.',
    report: { title: 'SQL Injection in Claim Search Exposes All Claims', severity: 'Critical', remediation: 'Parameterise search queries and scope results to records the user may see.' } },
  { id: 'search-xss', feature: 'Search', name: 'Reflected XSS in Search Results', owasp: 'A03:2021 Injection (XSS)', difficulty: 'Beginner',
    hints: ['The results page repeats your search term back to you in the heading.', 'Put an HTML payload in the search box and view the page source of the results.', 'Your term is reflected unescaped — <script>alert(1)</script> lands raw in the page.'],
    lesson: 'Reflected output must be encoded even when it "only" echoes the user\'s own input — links make it someone else\'s browser.',
    impact: 'Crafted search links run script in victims\' browsers, enabling session theft against customers and staff.',
    report: { title: 'Reflected Cross-Site Scripting in Search', severity: 'Medium', remediation: 'HTML-encode all reflected values in responses.' } },

  /* ---------- Admin & Platform ---------- */
  { id: 'admin-csrf', feature: 'Admin & Platform', name: 'CSRF on Admin User Deactivation', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Admin actions are plain POSTs. Compare them with the profile form — do they carry the hx_marker token?', 'Replay POST /admin/deactivate/<userId> as admin without the hx_marker field.', 'The account is deactivated with no CSRF token check — a malicious page could fire this from an admin\'s browser.'],
    lesson: 'Privileged actions are the most important ones to protect with anti-CSRF tokens — their impact is the highest.',
    impact: 'An admin visiting a booby-trapped page could silently deactivate staff/customer accounts, disrupting the whole operation.',
    report: { title: 'Missing CSRF Protection on Administrative Actions', severity: 'Medium', remediation: 'Require per-session CSRF tokens on all state-changing admin endpoints.' } },
  { id: 'api-debug', feature: 'Admin & Platform', name: 'Unauthenticated Debug Endpoint Data Dump', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Development leftovers often live at predictable paths like /api/debug.', 'Fetch /api/debug without logging in at all.', 'It returns every user (with passwords), policy and claim as JSON — no authentication required.'],
    lesson: 'Debug and diagnostic endpoints must never ship to production, and certainly not without authentication.',
    impact: 'The entire customer database — credentials included — is one unauthenticated request away from any attacker.',
    report: { title: 'Unauthenticated Debug Endpoint Exposes Full Database', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; gate any diagnostics behind admin auth and IP allowlists.' } },
];
const ALL_TESTS = TESTS.concat(TESTS2);
const FEATURES = [];
for (const t of ALL_TESTS) if (!FEATURES.includes(t.feature)) FEATURES.push(t.feature);

/* ============================ Seed data (fake) ============================ */
let nextUserId = 6, nextClaimId = 6, nextEvidenceId = 3, nextPayoutId = 2;
const users = [
  { id: 1, name: 'Ada Admin', email: 'admin@hexaclaim.local', password: 'admin123', role: 'admin', active: true },
  { id: 2, name: 'Tom Adjuster', email: 'adjuster@hexaclaim.local', password: 'adjuster123', role: 'adjuster', active: true },
  { id: 3, name: 'Alice Policy', email: 'alice@test.local', password: 'alice123', role: 'policyholder', active: true },
  { id: 4, name: 'Bob Policy', email: 'bob@test.local', password: 'bob123', role: 'policyholder', active: true },
  { id: 5, name: 'Carol Policy', email: 'carol@test.local', password: 'carol123', role: 'policyholder', active: true },
];
const DEMO_CREDS = { 'admin@hexaclaim.local': 'admin123', 'adjuster@hexaclaim.local': 'adjuster123', 'alice@test.local': 'alice123' };
const policies = [
  { id: 1, ownerId: 3, number: 'POL-1001', type: 'Auto', coverage: 10000 },
  { id: 2, ownerId: 4, number: 'POL-1002', type: 'Home', coverage: 50000 },
  { id: 3, ownerId: 5, number: 'POL-1003', type: 'Health', coverage: 25000 },
  { id: 4, ownerId: 3, number: 'POL-1004', type: 'Home', coverage: 30000 },
];
const claims = [
  { id: 1, policyId: 1, ownerId: 3, type: 'Auto', description: 'Rear-end collision on the highway', amount: 2500, status: 'under_review', payout: 0, internalNotes: '', internal: false },
  { id: 2, policyId: 2, ownerId: 4, type: 'Home', description: 'Kitchen water damage from a burst pipe', amount: 8000, status: 'under_review', payout: 0, internalNotes: 'SUSPECTED STAGED LEAK — SIU referral pending. Do not pay before inspection.', internal: false },
  { id: 3, policyId: 3, ownerId: 5, type: 'Health', description: 'Emergency room visit and scans', amount: 1200, status: 'paid', payout: 1200, internalNotes: '', internal: false },
  { id: 4, policyId: 2, ownerId: 4, type: 'Home', description: 'Roof damage after the storm', amount: 15000, status: 'submitted', payout: 0, internalNotes: '', internal: false },
  { id: 5, policyId: 0, ownerId: 1, type: 'Internal', description: 'Internal fraud investigation — organised ring suspected in Region 4', amount: 0, status: 'internal', payout: 0, internalNotes: 'SIU eyes only.', internal: true },
];
let evidence = [
  { id: 1, claimId: 1, filename: 'scene-photo.txt', content: 'Simulated photo evidence: two cars at the scene.', type: 'text/plain' },
  { id: 2, claimId: 2, filename: 'plumber-invoice.txt', content: 'Simulated invoice: pipe repair, $800 labour.', type: 'text/plain' },
];
let payouts = [ { id: 1, claimId: 3, ownerId: 5, amount: 1200 } ];
const sessions = new Map();       // sid -> { userId, marker }
const issuedResetTokens = new Set();
const failedLogins = {};          // email -> count
const enumProbes = new Set();     // distinct emails probed (login/forgot)

/* ============================ Progress engine ============================ */
let progress = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadProgress() {
  try { const raw = fs.readFileSync(PROGRESS_FILE, 'utf8'); const p = JSON.parse(raw); if (p && typeof p === 'object') progress = Object.assign(progress, p); } catch (e) { /* fresh */ }
  for (const f of FEATURES) if (typeof progress.attempts[f] !== 'number') progress.attempts[f] = 0;
}
function saveProgress() { try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 1)); } catch (e) {} }
function doneCount() { return ALL_TESTS.filter(t => progress.tests[t.id]).length; }
function isComplete() { return doneCount() === ALL_TESTS.length; }
function pass(id) {
  if (!progress.tests[id]) {
    progress.tests[id] = true;
    if (isComplete() && !progress.completedAt) { progress.completedAt = new Date().toISOString(); progress.keyRevealed = true; }
    saveProgress();
  }
}
function attempt(feature) { if (FEATURES.includes(feature)) { progress.attempts[feature] = (progress.attempts[feature] || 0) + 1; saveProgress(); } }
loadProgress();

/* ============================ Tiny string-built "SQL" evaluator ============================
 * Deliberately mimics a string-concatenated query so injection behaves like a real app. */
function stripComment(q) {
  let out = '', inStr = false;
  for (let i = 0; i < q.length; i++) {
    const c = q[i];
    if (c === "'") inStr = !inStr;
    if (!inStr && c === '-' && q[i + 1] === '-') break;
    out += c;
  }
  return out;
}
function tokenize(q) {
  const toks = []; let i = 0;
  while (i < q.length) {
    const c = q[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "'") { let j = i + 1, s = ''; while (j < q.length && q[j] !== "'") { s += q[j]; j++; } toks.push({ t: 'str', v: s }); i = j + 1; continue; }
    if (/[0-9]/.test(c)) { let j = i, s = ''; while (j < q.length && /[0-9.]/.test(q[j])) { s += q[j]; j++; } toks.push({ t: 'num', v: parseFloat(s) }); i = j; continue; }
    if (/[A-Za-z_]/.test(c)) { let j = i, s = ''; while (j < q.length && /[A-Za-z0-9_.]/.test(q[j])) { s += q[j]; j++; } const up = s.toUpperCase(); if (up === 'AND' || up === 'OR' || up === 'LIKE') toks.push({ t: up }); else toks.push({ t: 'ident', v: s }); i = j; continue; }
    if (c === '=') { toks.push({ t: 'op', v: '=' }); i++; continue; }
    i++;
  }
  return toks;
}
function likeMatch(value, pattern) {
  const re = new RegExp('^' + String(pattern).split('').map(ch => ch === '%' ? '.*' : ch === '_' ? '.' : ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('') + '$', 'i');
  return re.test(String(value));
}
function evalClause(row, clause) {
  const toks = tokenize(stripComment(clause));
  let pos = 0;
  function operand() {
    const tk = toks[pos++];
    if (!tk) return '';
    if (tk.t === 'str' || tk.t === 'num') return tk.v;
    if (tk.t === 'ident') { const v = row[tk.v.split('.').pop()]; return v === undefined ? '' : v; }
    return '';
  }
  function comparison() {
    const left = operand(); const tk = toks[pos];
    if (tk && (tk.t === 'op' || tk.t === 'LIKE')) { pos++; const right = operand(); if (tk.t === 'LIKE') return likeMatch(left, right); return String(left) === String(right); }
    return !!left;
  }
  function andExpr() { let v = comparison(); while (toks[pos] && toks[pos].t === 'AND') { pos++; const r = comparison(); v = v && r; } return v; }
  function orExpr() { let v = andExpr(); while (toks[pos] && toks[pos].t === 'OR') { pos++; const r = andExpr(); v = v || r; } return v; }
  try { return !!orExpr(); } catch (e) { return false; }
}
const XSS_MARK = /<script|<svg|<img[^>]*onerror|onerror\s*=|onload\s*=|<iframe|<body[^>]*onload/i;
function resetTokenFor(u) { return 'HIC' + u.id + '-' + (u.id * 137 + 42); }

/* ============================ HTTP helpers ============================ */
function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function parseCookies(req) { const out = {}; const h = req.headers.cookie || ''; for (const part of h.split(';')) { const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); } return out; }
function readBody(req) { return new Promise(res => { let d = ''; req.on('data', c => { d += c; if (d.length > 2e6) req.destroy(); }); req.on('end', () => res(d)); req.on('error', () => res('')); }); }
function parseBody(raw, ctype) {
  if ((ctype || '').includes('application/json')) { try { return JSON.parse(raw || '{}'); } catch (e) { return {}; } }
  const out = {}; for (const [k, v] of new URLSearchParams(raw || '')) out[k] = v; return out;
}
function send(res, code, body, headers) { res.writeHead(code, Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, headers || {})); res.end(body); }
function redirect(res, to, headers) { res.writeHead(302, Object.assign({ Location: to }, headers || {})); res.end(''); }
function sessionOf(req) { const c = parseCookies(req); const s = c.hx_session && sessions.get(c.hx_session); return s ? { sid: c.hx_session, userId: s.userId, marker: s.marker } : null; }
function userOf(req) { const s = sessionOf(req); if (!s) return null; return users.find(u => u.id === s.userId && u.active) || null; }
function effRole(req, user) { const c = parseCookies(req); return c.hx_role || (user ? user.role : ''); }
function newSession(res, user) {
  const sid = crypto.randomBytes(16).toString('hex'); const marker = crypto.randomBytes(8).toString('hex');
  sessions.set(sid, { userId: user.id, marker });
  return ['hx_session=' + sid + '; Path=/; HttpOnly', 'hx_role=' + user.role + '; Path=/', 'hx_origin=' + marker + '; Path=/'];
}
const money = n => '$' + Number(n || 0).toLocaleString('en-US');

function progressBar() {
  const d = doneCount(), total = ALL_TESTS.length, pct = Math.floor(d / total * 100);
  return `<div style="background:#111827;color:#e5e7eb;padding:8px 14px;font-family:monospace;font-size:13px">
    <img src="/logo.png" alt="" style="height:20px;vertical-align:middle"> LAB ${LAB_NUMBER} — ${LAB_NAME} · ${d}/${total} tests · ${pct}%
    <span style="display:inline-block;background:#374151;height:8px;width:180px;vertical-align:middle;margin-left:8px"><span style="display:block;background:#22c55e;height:8px;width:${pct}%"></span></span>
    &nbsp; <a style="color:#93c5fd" href="/tests">Mission Board</a> · <a style="color:#93c5fd" href="/">Home</a></div>`;
}
function chatWidget() {
  return `<div id="hxchat" style="position:fixed;right:14px;bottom:14px;width:320px;font-family:sans-serif;z-index:50;background:#fff;border:1px solid #d1d5db;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.25)">
  <div style="background:#111827;color:#fff;padding:8px 12px;border-radius:10px 10px 0 0;font-weight:bold">Lab Coach</div>
  <div id="hxlog" style="height:170px;overflow:auto;padding:8px 12px;font-size:13px"></div>
  <div style="display:flex;border-top:1px solid #e5e7eb"><input id="hxmsg" style="flex:1;border:0;padding:8px" placeholder="Ask the coach…"><button onclick="hxSend()" style="background:#2563eb;color:#fff;border:0;padding:8px 14px">Send</button></div></div>
<script>
async function hxSend(){const i=document.getElementById('hxmsg');const m=i.value.trim();if(!m)return;i.value='';const L=document.getElementById('hxlog');L.innerHTML+='<div><b>You:</b> '+m.replace(/</g,'&lt;')+'</div>';
const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})});const j=await r.json();L.innerHTML+='<div style="margin:4px 0"><b>Coach:</b> '+String(j.reply).replace(/</g,'&lt;')+'</div>';L.scrollTop=L.scrollHeight;}
</script>`;
}
function layout(title, user, body) {
  const who = user ? `<span style="float:right">${esc(user.name)} (${esc(user.role)}) · <a href="/profile" style="color:#93c5fd">Profile</a> · <a href="/logout" style="color:#93c5fd">Log out</a></span>` : '<span style="float:right"><a href="/login" style="color:#93c5fd">Log in</a> · <a href="/register" style="color:#93c5fd">Register</a></span>';
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} — ${LAB_NAME}</title></head>
<body style="font-family:sans-serif;margin:0;background:#f9fafb;color:#111827">${progressBar()}
<div style="background:#1f2937;color:#fff;padding:10px 14px"><b>HexaClaim Insurance</b> — claims portal ${who}</div>
<main style="max-width:900px;margin:0 auto;padding:18px">${body}</main>${chatWidget()}</body></html>`;
}
function gatePage() {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Locked — LAB ${LAB_NUMBER}</title></head>
<body style="font-family:sans-serif;margin:0;background:#f9fafb">${progressBar()}
<main style="max-width:560px;margin:60px auto;padding:24px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;text-align:center">
<img src="/logo.png" alt="HexaCyberLab" style="height:64px">
<h1>🔒 LAB ${LAB_NUMBER} — ${LAB_NAME}</h1>
<p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
<form method="POST" action="/unlock"><input name="key" style="width:80%;padding:10px" placeholder="Completion key from Lab ${LAB_NUMBER - 1}" required>
<br><br><button style="background:#2563eb;color:#fff;border:0;padding:10px 22px;border-radius:6px">Unlock lab</button></form>
</main>${chatWidget()}</body></html>`;
}

/* ============================ Auth pages ============================ */
function loginPage(msg) {
  return layout('Log in', null, `<h1>Log in</h1>${msg ? `<p style="color:#b91c1c">${esc(msg)}</p>` : ''}
<form method="POST" action="/login">
<label>Email<br><input name="email" style="width:320px;padding:8px" required></label><br><br>
<label>Password<br><input name="password" type="password" style="width:320px;padding:8px" required></label><br><br>
<button style="background:#2563eb;color:#fff;border:0;padding:9px 20px;border-radius:6px">Log in</button></form>
<p><a href="/forgot">Forgot your password?</a> · <a href="/register">Create an account</a></p>
<div style="background:#fef3c7;border:1px solid #f59e0b;padding:12px;border-radius:8px;max-width:520px">
<b>Demo accounts for testers</b><br>
Administrator: admin@hexaclaim.local / admin123<br>
Adjuster: adjuster@hexaclaim.local / adjuster123<br>
Policyholder: alice@test.local / alice123</div>`);
}
function registerPage(msg) {
  return layout('Register', null, `<h1>Create your account</h1>${msg ? `<p style="color:#b91c1c">${esc(msg)}</p>` : ''}
<form method="POST" action="/register">
<label>Full name<br><input name="name" style="width:320px;padding:8px" required></label><br><br>
<label>Email<br><input name="email" style="width:320px;padding:8px" required></label><br><br>
<label>Password (minimum 8 characters)<br><input name="password" type="password" style="width:320px;padding:8px" required></label><br><br>
<button style="background:#2563eb;color:#fff;border:0;padding:9px 20px;border-radius:6px">Register</button></form>`);
}
function forgotPage(msg) {
  return layout('Forgot password', null, `<h1>Forgot password</h1>${msg ? `<p>${esc(msg)}</p>` : ''}
<form method="POST" action="/forgot"><label>Email<br><input name="email" style="width:320px;padding:8px" required></label><br><br>
<button style="background:#2563eb;color:#fff;border:0;padding:9px 20px;border-radius:6px">Send reset link</button></form>
<p>Have a token already? <a href="/reset">Reset your password</a></p>`);
}
function resetPage(msg) {
  return layout('Reset password', null, `<h1>Reset password</h1>${msg ? `<p>${esc(msg)}</p>` : ''}
<form method="POST" action="/reset">
<label>Email<br><input name="email" style="width:320px;padding:8px" required></label><br><br>
<label>Reset token<br><input name="token" style="width:320px;padding:8px" required></label><br><br>
<label>New password<br><input name="newpassword" type="password" style="width:320px;padding:8px" required></label><br><br>
<button style="background:#2563eb;color:#fff;border:0;padding:9px 20px;border-radius:6px">Set new password</button></form>`);
}

/* ---- entry-key shards, second region (assembled only inside /unlock) ---- */
const _eB = ["MlBVLVM=","VE1POVI=",""];

/* ============================ App pages ============================ */
function claimRow(c) {
  const pol = policies.find(p => p.id === c.policyId);
  return `<tr><td><a href="/claim/${c.id}">#${c.id}</a></td><td>${esc(c.type)}</td><td>${esc(c.description)}</td><td>${pol ? esc(pol.number) : '—'}</td><td>${money(c.amount)}</td><td>${esc(c.status)}</td><td>${c.payout ? money(c.payout) : '—'}</td></tr>`;
}
function claimsTable(list) {
  return `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;background:#fff"><tr><th>ID</th><th>Type</th><th>Description</th><th>Policy</th><th>Amount</th><th>Status</th><th>Payout</th></tr>${list.map(claimRow).join('')}</table>`;
}
function homePage(user) {
  if (!user) return layout('Welcome', null, `<h1>HexaClaim Insurance</h1><p>File claims, upload evidence and track payouts.</p><p><a href="/login">Log in</a> or <a href="/register">create an account</a> to begin.</p><p>Documents: <a href="/download?file=claim-form.txt">claim form</a> · <a href="/download?file=policy-terms.txt">policy terms</a> (login required).</p>`);
  const mine = user.role === 'policyholder' ? claims.filter(c => c.ownerId === user.id && !c.internal) : claims.filter(c => !c.internal);
  const myPolicies = user.role === 'policyholder' ? policies.filter(p => p.ownerId === user.id) : policies;
  return layout('Dashboard', user, `<h1>Welcome, ${esc(user.name)}</h1>
<h2>Your policies</h2><ul>${myPolicies.map(p => `<li>${esc(p.number)} — ${esc(p.type)} — coverage ${money(p.coverage)}</li>`).join('')}</ul>
<h2>${user.role === 'policyholder' ? 'Your claims' : 'Claims'}</h2>${claimsTable(mine)}
<p><a href="/claims/new">File a new claim</a> · <a href="/claims">All claims</a> · <a href="/search">Search claims</a>${user.role !== 'policyholder' ? ' · <a href="/adjuster">Adjuster console</a>' : ''}${user.role === 'admin' ? ' · <a href="/admin">Admin panel</a>' : ''}</p>`);
}
function newClaimPage(user) {
  const opts = policies.map(p => `<option value="${p.id}">${esc(p.number)} (${esc(p.type)}, owner #${p.ownerId})</option>`).join('');
  return layout('New claim', user, `<h1>File a claim</h1>
<form method="POST" action="/claims"><label>Policy<br><select name="policyId">${opts}</select></label><br><br>
<label>Type<br><input name="type" style="width:320px;padding:8px" required></label><br><br>
<label>Description<br><input name="description" style="width:420px;padding:8px" required></label><br><br>
<label>Amount claimed<br><input name="amount" type="number" style="width:200px;padding:8px" required></label><br><br>
<button style="background:#2563eb;color:#fff;border:0;padding:9px 20px;border-radius:6px">Submit claim</button></form>`);
}
function claimPage(user, claim, sess) {
  const pol = policies.find(p => p.id === claim.policyId);
  const evs = evidence.filter(e => e.claimId === claim.id);
  const notes = claim.internalNotes ? `<div style="background:#fee2e2;border:1px solid #ef4444;padding:10px;border-radius:8px"><b>Internal adjuster notes:</b> ${esc(claim.internalNotes)}</div>` : '';
  return layout('Claim #' + claim.id, user, `<h1>Claim #${claim.id} — ${esc(claim.type)}</h1>
<p><b>Description:</b> ${esc(claim.description)}<br><b>Policy:</b> ${pol ? esc(pol.number) + ' (coverage ' + money(pol.coverage) + ')' : '—'}<br>
<b>Amount claimed:</b> ${money(claim.amount)}<br><b>Status:</b> ${esc(claim.status)}<br><b>Approved payout:</b> ${claim.payout ? money(claim.payout) : '—'}</p>
${notes}
<h2>Update claim</h2>
<form method="POST" action="/claim/${claim.id}/update"><input type="hidden" name="hx_marker" value="${sess ? sess.marker : ''}">
<label>Description<br><input name="description" value="${esc(claim.description)}" style="width:420px;padding:8px"></label><br><br>
<label>Amount<br><input name="amount" type="number" value="${claim.amount}" style="width:200px;padding:8px"></label><br><br>
<button style="background:#2563eb;color:#fff;border:0;padding:9px 20px;border-radius:6px">Save update</button></form>
<h2>Evidence</h2>
<ul>${evs.map(e => `<li><a href="/evidence/${e.id}">${esc(e.filename)}</a></li>`).join('') || '<li>No evidence yet.</li>'}</ul>
<form method="POST" action="/claim/${claim.id}/evidence">
<label>Filename<br><input name="filename" style="width:320px;padding:8px" required></label><br><br>
<label>Content (simulated upload)<br><textarea name="content" rows="3" style="width:420px;padding:8px"></textarea></label><br><br>
<button style="background:#2563eb;color:#fff;border:0;padding:9px 20px;border-radius:6px">Upload evidence</button></form>
<p><a href="/claims">Back to claims</a></p>`);
}
function searchPage(user, q, results) {
  return layout('Search', user, `<h1>Search claims</h1>
<form method="GET" action="/search"><input name="q" value="${esc(q)}" style="width:320px;padding:8px"><button style="background:#2563eb;color:#fff;border:0;padding:9px 16px;border-radius:6px">Search</button></form>
${q !== '' ? `<h2>Results for "${q}"</h2>` : ''}
${results.length ? claimsTable(results) : (q !== '' ? '<p>No matching claims.</p>' : '')}`);
}
function adjusterPage(user, sess) {
  const rows = claims.filter(c => !c.internal).map(c => `<tr><td><a href="/claim/${c.id}">#${c.id}</a></td><td>${esc(c.type)}</td><td>${money(c.amount)}</td><td>${esc(c.status)}</td><td>${c.payout ? money(c.payout) : '—'}</td>
<td><form method="POST" action="/adjuster/approve/${c.id}" style="display:inline"><input type="hidden" name="hx_marker" value="${sess.marker}"><input name="payout" type="number" value="${c.amount}" style="width:90px"> <button>Approve</button></form>
<form method="POST" action="/adjuster/payout/${c.id}" style="display:inline"><input type="hidden" name="hx_marker" value="${sess.marker}"><button>Release payout</button></form></td></tr>`).join('');
  return layout('Adjuster console', user, `<h1>Adjuster console</h1>
<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;background:#fff"><tr><th>ID</th><th>Type</th><th>Amount</th><th>Status</th><th>Payout</th><th>Actions</th></tr>${rows}</table>`);
}
function adminPage(user, sess) {
  const rows = users.map(u => `<tr><td>${u.id}</td><td>${u.name}</td><td>${esc(u.email)}</td><td>${esc(u.password)}</td><td>${esc(u.role)}</td><td>${u.active ? 'active' : 'DEACTIVATED'}</td>
<td><form method="POST" action="/admin/deactivate/${u.id}"><input type="hidden" name="hx_marker" value="${sess.marker}"><button>Deactivate</button></form></td></tr>`).join('');
  return layout('Admin panel', user, `<h1>Admin panel — users</h1>
<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;background:#fff"><tr><th>ID</th><th>Name</th><th>Email</th><th>Password</th><th>Role</th><th>State</th><th></th></tr>${rows}</table>`);
}
function profilePage(user, sess, msg) {
  return layout('Profile', user, `<h1>Your profile</h1>${msg ? `<p style="color:#15803d">${esc(msg)}</p>` : ''}
<form method="POST" action="/profile"><input type="hidden" name="hx_marker" value="${sess.marker}">
<label>Full name<br><input name="name" value="${esc(user.name)}" style="width:320px;padding:8px"></label><br><br>
<label>Email<br><input name="email" value="${esc(user.email)}" style="width:320px;padding:8px"></label><br><br>
<button style="background:#2563eb;color:#fff;border:0;padding:9px 20px;border-radius:6px">Save profile</button></form>`);
}
function testsPage() {
  const byFeature = {};
  for (const t of ALL_TESTS) (byFeature[t.feature] = byFeature[t.feature] || []).push(t);
  const sections = FEATURES.map(f => {
    const items = byFeature[f].map(t => {
      const done = !!progress.tests[t.id];
      return `<li style="margin:10px 0"><b>${done ? '✓' : '○'} ${esc(t.name)}</b> — ${esc(t.owasp)} · ${esc(t.difficulty)} · <i>${done ? 'done' : 'open'}</i>
      <details><summary>Hint 1</summary><p>${esc(t.hints[0])}</p><details><summary>Hint 2</summary><p>${esc(t.hints[1])}</p><details><summary>Hint 3</summary><p>${esc(t.hints[2])}</p></details></details></details></li>`;
    }).join('');
    return `<h2>${esc(f)} <small>(${byFeature[f].filter(t => progress.tests[t.id]).length}/${byFeature[f].length} · attempts on this feature: ${progress.attempts[f] || 0})</small></h2><ul>${items}</ul>`;
  }).join('');
  return layout('Mission Board', null, `<h1>Mission Board — LAB ${LAB_NUMBER} ${LAB_NAME}</h1><p>${doneCount()}/${ALL_TESTS.length} tests complete (${Math.floor(doneCount() / ALL_TESTS.length * 100)}%). Solve tests by actually performing the exploit — there are no "mark done" buttons.</p>${sections}`);
}

/* ---- completion-key shards, second region (assembled only at 100%) ---- */
const _cB = ["VzMzLTg=","M1lNSDY=",""];
function completionKey() { return _asm(_cA, _cB); }

/* ============================ Lab Coach (chatbot) ============================ */
const FEATURE_KEYS = [
  ['Adjuster & Approvals', ['adjuster', 'approval', 'approve', 'approvals']],
  ['Login & Authentication', ['login', 'log in', 'authentication', 'password', 'reset token', 'brute', 'enumeration']],
  ['Registration & Profile', ['registration', 'register', 'profile', 'sign up', 'signup']],
  ['Evidence & Documents', ['evidence', 'document', 'upload', 'download', 'traversal']],
  ['Payouts', ['payout', 'payment', 'paid twice', 'double pay']],
  ['Search', ['search']],
  ['Admin & Platform', ['admin', 'debug', 'platform']],
  ['Claims', ['claim']],
];
function matchFeature(msg) { const m = msg.toLowerCase(); for (const [f, keys] of FEATURE_KEYS) if (keys.some(k => m.includes(k))) return f; return null; }
function chatReply(rawMsg) {
  const msg = String(rawMsg || '');
  const m = msg.toLowerCase();
  const d = doneCount(), total = ALL_TESTS.length;
  if (/(who built|who made|who created|founder|jony|hassain)/.test(m)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (m.includes('key')) {
    if (isComplete()) return 'You completed LAB ' + LAB_NUMBER + '! Here is your completion key for the next lab: ' + completionKey();
    return 'I don\'t have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at ' + d + '/' + total + ' tests. Finish every test on the Mission Board (/tests) and the key is yours.';
  }
  const feature = matchFeature(m);
  const howIntent = /(how|help|guide|solve|exploit|do i|step|hint)/.test(m);
  if (feature && howIntent) {
    const ftests = ALL_TESTS.filter(t => t.feature === feature);
    const open = ftests.filter(t => !progress.tests[t.id]);
    const att = progress.attempts[feature] || 0;
    if (!open.length) return 'You have already completed every test in ' + feature + '. Pick another feature from the Mission Board (/tests).';
    if (att >= 3 || open.length < ftests.length && att >= 3) { /* guidance below */ }
    if (att < 3) {
      return 'That feature is locked for help. First try the ' + feature + ' tests yourself at least 3 times — I can see you\'ve tried ' + att + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
    }
    const steps = open.map((t, i) => (i + 1) + ') ' + t.name + ' — ' + t.hints[2]).join(' ');
    return 'Step by step for ' + feature + ': ' + steps;
  }
  if (feature && /(how many|count|list|which|what)/.test(m)) {
    const ftests = ALL_TESTS.filter(t => t.feature === feature);
    return feature + ' has ' + ftests.length + ' tests: ' + ftests.map(t => t.name).join('; ') + '.';
  }
  if (/(how many|total|features|tests)/.test(m)) {
    return 'LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ' has ' + total + ' tests across ' + FEATURES.length + ' features: ' + FEATURES.join(', ') + '. You have completed ' + d + '/' + total + '.';
  }
  if (/(progress|status|next|start|hello|hi|help)/.test(m)) {
    const next = ALL_TESTS.find(t => !progress.tests[t.id]);
    return 'You are at ' + d + '/' + total + ' tests (' + Math.floor(d / total * 100) + '%).' + (next ? ' Next open test: "' + next.name + '" in ' + next.feature + '. See /tests for the full board and hints — and remember, feature help unlocks after 3 real tries.' : ' Everything is done — visit /complete for your key and certificate.');
  }
  return 'I can tell you the test map (ask "how many tests in Claims?"), report your progress, and — once you have tried a feature at least 3 times — guide you step by step (ask "how do I solve the Claims tests?"). The full board is at /tests.';
}

/* ============================ Completion & certificate ============================ */
function completePage(user) {
  const d = doneCount(), total = ALL_TESTS.length;
  if (!isComplete()) {
    const left = ALL_TESTS.filter(t => !progress.tests[t.id]).map(t => `<li>${esc(t.name)} (${esc(t.feature)})</li>`).join('');
    return layout('Not yet complete', user, `<h1>Not complete yet</h1><p>You have solved ${d}/${total} tests (${Math.floor(d / total * 100)}%). Still open:</p><ul>${left}</ul><p>See the <a href="/tests">Mission Board</a> for hints.</p>`);
  }
  const perFeature = FEATURES.map(f => `<li><b>${esc(f)}</b>: ${ALL_TESTS.filter(t => t.feature === f).length} vulnerabilities</li>`).join('');
  const ways = ALL_TESTS.map(t => `<li>${esc(t.name)}</li>`).join('');
  const lessons = ALL_TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('');
  const impacts = ALL_TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('');
  const reports = ALL_TESTS.map(t => `<li><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)} — Remediation: ${esc(t.report.remediation)}</li>`).join('');
  return layout('Lab complete', user, `<h1>🎉 LAB ${LAB_NUMBER} — ${LAB_NAME} complete!</h1>
<h2>1) Features in this lab</h2><p>${FEATURES.length} features in total.</p>
<h2>2) Vulnerabilities per feature</h2><ul>${perFeature}</ul>
<h2>3) How testing was done (${total} ways)</h2><ul>${ways}</ul>
<h2>4) What you learned</h2><ul>${lessons}</ul>
<h2>5) What this means for a real client</h2><ul>${impacts}</ul>
<h2>6) Writing it in a real report</h2><ul>${reports}</ul>
<h2>Your completion key (unlocks Lab ${LAB_NUMBER + 1})</h2>
<p style="font-family:monospace;font-size:20px;background:#ecfdf5;border:1px solid #10b981;padding:12px">${completionKey()}</p>
<form method="POST" action="/complete/name"><label>Your name for the certificate<br><input name="name" value="${esc(progress.testerName)}" style="width:320px;padding:8px"></label> <button style="background:#2563eb;color:#fff;border:0;padding:9px 16px;border-radius:6px">Save name</button></form>
<p><a href="/certificate">View your certificate</a></p>`);
}
function certificatePage(user) {
  if (!isComplete()) return layout('Certificate', user, `<h1>Certificate locked</h1><p>Complete 100% of LAB ${LAB_NUMBER} to earn your certificate. You are at ${doneCount()}/${ALL_TESTS.length}.</p>`);
  const name = progress.testerName || (user ? user.name : 'Security Tester');
  const date = progress.completedAt ? new Date(progress.completedAt).toDateString() : new Date().toDateString();
  return `<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER}</title><style>@media print{button{display:none}}</style></head>
<body style="font-family:Georgia,serif;background:#f3f4f6;margin:0">${progressBar()}
<div style="max-width:720px;margin:40px auto;background:#fff;border:3px solid #b45309;padding:40px;text-align:center">
<img src="/logo.png" alt="HexaCyberLab" style="height:84px">
<h1 style="margin:10px 0">Certificate of Completion</h1>
<p>This certifies that</p><h2 style="margin:6px 0">${esc(name)}</h2>
<p>has completed 100% of the security tests in LAB ${LAB_NUMBER} — ${LAB_NAME} (${ALL_TESTS.length} tests across ${FEATURES.length} features)</p>
<p>Completed on ${esc(date)}</p>
<p style="margin-top:26px;font-weight:bold">HexaCyberLab — Built by Md. Jony Hassain, Founder</p>
<button onclick="window.print()">Print certificate</button></div>${chatWidget()}</body></html>`;
}

/* ============================ Router ============================ */
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    const p = url.pathname;
    const ctype = req.headers['content-type'] || '';
    const raw = (req.method === 'POST') ? await readBody(req) : '';
    const body = req.method === 'POST' ? parseBody(raw, ctype) : {};

    if (p === '/logo.png') { try { const img = fs.readFileSync(path.join(DIR, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(img); } catch (e) { return send(res, 404, 'not found'); } }
    if (p === '/api/progress') {
      const feats = {}; for (const f of FEATURES) feats[f] = { total: ALL_TESTS.filter(t => t.feature === f).length, done: ALL_TESTS.filter(t => t.feature === f && progress.tests[t.id]).length, attempts: progress.attempts[f] || 0 };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ lab: LAB_NAME, number: LAB_NUMBER, total: ALL_TESTS.length, done: doneCount(), pct: Math.floor(doneCount() / ALL_TESTS.length * 100), features: feats, complete: isComplete() }));
    }
    if (p === '/api/chat' && req.method === 'POST') {
      let reply; try { reply = chatReply(body.message); } catch (e) { reply = 'Ask me about the test map, your progress, or say "who built this".'; }
      res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ reply }));
    }
    if (p === '/unlock' && req.method === 'POST') {
      const given = String(body.key || '');
      const want = _asm(_eA, _eB);
      if (given === want) { progress.unlocked = true; saveProgress(); return redirect(res, '/'); }
      return send(res, 403, gatePage().replace('</form>', '</form><p style="color:#b91c1c">That key was not accepted.</p>'));
    }
    if (!progress.unlocked) return send(res, 200, gatePage());

    const sess = sessionOf(req); const user = userOf(req);
    const needAuth = () => { if (!user) { redirect(res, '/login'); return true; } return false; };

    if (p === '/') return send(res, 200, homePage(user));
    if (p === '/login' && req.method === 'GET') return send(res, 200, loginPage(''));
    if (p === '/login' && req.method === 'POST') {
      attempt('Login & Authentication');
      const email = String(body.email || ''), password = String(body.password || '');
      enumProbes.add(email); if (enumProbes.size >= 5) pass('auth-enum');
      const clause = "email = '" + email + "' AND password = '" + password + "'";
      const found = users.filter(u => u.active && evalClause(u, clause))[0];
      if (found) {
        if (password !== found.password) pass('auth-sqli');
        if (DEMO_CREDS[email] && DEMO_CREDS[email] === password) pass('auth-default');
        return redirect(res, '/', { 'Set-Cookie': newSession(res, found) });
      }
      failedLogins[email] = (failedLogins[email] || 0) + 1;
      if (failedLogins[email] >= 10) pass('auth-brute');
      const exists = users.some(u => u.email === email);
      return send(res, 200, loginPage(exists ? 'Incorrect password for this account.' : 'No account with that email.'));
    }
    if (p === '/logout') { if (sess) sessions.delete(sess.sid); return redirect(res, '/', { 'Set-Cookie': ['hx_session=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0'] }); }
    if (p === '/register' && req.method === 'GET') return send(res, 200, registerPage(''));
    if (p === '/register' && req.method === 'POST') {
      attempt('Registration & Profile');
      const name = String(body.name || 'User'), email = String(body.email || ''), password = String(body.password || '');
      if (!email || users.some(u => u.email === email)) return send(res, 200, registerPage('That email is already registered or invalid.'));
      if (password.length < 8) pass('reg-weak');
      let role = 'policyholder';
      if (body.role && ['policyholder', 'adjuster', 'admin'].includes(String(body.role))) { role = String(body.role); if (role !== 'policyholder') pass('reg-mass'); }
      if (XSS_MARK.test(name)) pass('reg-xss');
      const nu = { id: nextUserId++, name, email, password, role, active: true };
      users.push(nu);
      return redirect(res, '/', { 'Set-Cookie': newSession(res, nu) });
    }
    if (p === '/forgot' && req.method === 'GET') return send(res, 200, forgotPage(''));
    if (p === '/forgot' && req.method === 'POST') {
      attempt('Login & Authentication');
      const email = String(body.email || ''); enumProbes.add(email); if (enumProbes.size >= 5) pass('auth-enum');
      const u = users.find(x => x.email === email);
      if (u) { issuedResetTokens.add(resetTokenFor(u)); return send(res, 200, forgotPage('Reset link sent — check your inbox.')); }
      return send(res, 200, forgotPage('No account with that email.'));
    }
    if (p === '/reset' && req.method === 'GET') return send(res, 200, resetPage(''));
    if (p === '/reset' && req.method === 'POST') {
      attempt('Login & Authentication');
      const u = users.find(x => x.email === String(body.email || ''));
      if (u && String(body.token || '') === resetTokenFor(u)) {
        if (!issuedResetTokens.has(String(body.token))) pass('auth-reset');
        u.password = String(body.newpassword || 'changed123');
        return redirect(res, '/login');
      }
      return send(res, 200, resetPage('That reset token is not valid.'));
    }
    if (p === '/tests') return send(res, 200, testsPage());
    if (p === '/complete' && req.method === 'GET') return send(res, 200, completePage(user));
    if (p === '/complete/name' && req.method === 'POST') { if (isComplete()) { progress.testerName = String(body.name || '').slice(0, 60); saveProgress(); } return redirect(res, '/complete'); }
    if (p === '/certificate') return send(res, 200, certificatePage(user));
    if (p === '/api/debug') { pass('api-debug'); attempt('Admin & Platform'); res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ users, policies, claims, payouts }, null, 1)); }

    if (p === '/profile' && req.method === 'GET') { if (needAuth()) return; return send(res, 200, profilePage(user, sess, url.searchParams.get('ok') ? 'Profile saved.' : '')); }
    if (p === '/profile' && req.method === 'POST') {
      if (needAuth()) return; attempt('Registration & Profile');
      if (String(body.hx_marker || '') !== sess.marker) pass('reg-csrf');
      if (body.name) { user.name = String(body.name); if (XSS_MARK.test(user.name)) pass('reg-xss'); }
      if (body.email) user.email = String(body.email);
      return redirect(res, '/profile?ok=1');
    }
    if (p === '/claims' && req.method === 'GET') { if (needAuth()) return; const list = user.role === 'policyholder' ? claims.filter(c => c.ownerId === user.id && !c.internal) : claims.filter(c => !c.internal); return send(res, 200, layout('Claims', user, `<h1>Claims</h1>${claimsTable(list)}<p><a href="/claims/new">File a new claim</a></p>`)); }
    if (p === '/claims/new' && req.method === 'GET') { if (needAuth()) return; return send(res, 200, newClaimPage(user)); }
    if (p === '/claims' && req.method === 'POST') {
      if (needAuth()) return; attempt('Claims');
      const pol = policies.find(x => x.id === Number(body.policyId)) || policies[0];
      const nc = { id: nextClaimId++, policyId: pol.id, ownerId: user.id, type: String(body.type || pol.type), description: String(body.description || ''), amount: Number(body.amount || 0), status: 'submitted', payout: 0, internalNotes: '', internal: false };
      claims.push(nc); return redirect(res, '/claim/' + nc.id);
    }
    const mClaim = p.match(/^\/claim\/(\d+)$/);
    if (mClaim && req.method === 'GET') {
      if (needAuth()) return; attempt('Claims');
      const claim = claims.find(c => c.id === Number(mClaim[1])); if (!claim) return send(res, 404, 'Claim not found');
      if (user.role === 'policyholder' && claim.ownerId !== user.id && !claim.internal) pass('claim-idor');
      if (user.role === 'policyholder' && claim.internalNotes) pass('adj-notes');
      return send(res, 200, claimPage(user, claim, sess));
    }
    const mUpd = p.match(/^\/claim\/(\d+)\/update$/);
    if (mUpd && req.method === 'POST') {
      if (needAuth()) return; attempt('Claims');
      const claim = claims.find(c => c.id === Number(mUpd[1])); if (!claim) return send(res, 404, 'Claim not found');
      if (body.description !== undefined) claim.description = String(body.description);
      if (body.amount !== undefined && body.amount !== '') {
        const pol = policies.find(x => x.id === claim.policyId);
        if (pol && Number(body.amount) > pol.coverage) pass('claim-amount');
        claim.amount = Number(body.amount);
      }
      if (body.status !== undefined && String(body.status) !== claim.status) {
        if (user.role === 'policyholder') pass('claim-status');
        claim.status = String(body.status);
      }
      if (user.role === 'policyholder' && claim.ownerId !== user.id) pass('claim-edit');
      return redirect(res, '/claim/' + claim.id);
    }
    const mEv = p.match(/^\/claim\/(\d+)\/evidence$/);
    if (mEv && req.method === 'POST') {
      if (needAuth()) return; attempt('Evidence & Documents');
      const claim = claims.find(c => c.id === Number(mEv[1])); if (!claim) return send(res, 404, 'Claim not found');
      const filename = String(body.filename || 'evidence.txt');
      const ext = (filename.split('.').pop() || '').toLowerCase();
      const allowed = ['txt', 'png', 'jpg', 'jpeg', 'gif', 'pdf'];
      const type = ext === 'html' || ext === 'htm' ? 'text/html' : ext === 'svg' ? 'image/svg+xml' : 'text/plain';
      evidence.push({ id: nextEvidenceId++, claimId: claim.id, filename, content: String(body.content || ''), type, unsafe: !allowed.includes(ext) });
      return redirect(res, '/claim/' + claim.id);
    }
    const mEvGet = p.match(/^\/evidence\/(\d+)$/);
    if (mEvGet && req.method === 'GET') {
      if (needAuth()) return; attempt('Evidence & Documents');
      const ev = evidence.find(e => e.id === Number(mEvGet[1])); if (!ev) return send(res, 404, 'Evidence not found');
      const claim = claims.find(c => c.id === ev.claimId);
      if (user.role === 'policyholder' && claim && claim.ownerId !== user.id) pass('ev-idor');
      if (ev.unsafe) pass('ev-upload');
      res.writeHead(200, { 'Content-Type': ev.type }); return res.end(ev.content);
    }
    if (p === '/download' && req.method === 'GET') {
      if (needAuth()) return; attempt('Evidence & Documents');
      const name = url.searchParams.get('file') || '';
      const target = path.join(DOCS_DIR, name);
      try {
        const data = fs.readFileSync(target, 'utf8');
        if (name.includes('..') && !path.resolve(target).startsWith(path.resolve(DOCS_DIR))) pass('ev-traversal');
        res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end(data);
      } catch (e) { return send(res, 404, 'Document not found'); }
    }
    if (p === '/search' && req.method === 'GET') {
      if (needAuth()) return; attempt('Search');
      const q = url.searchParams.get('q') || '';
      let results = [];
      if (q !== '') {
        const clause = "description LIKE '%" + q + "%' OR type LIKE '%" + q + "%'";
        results = claims.filter(c => evalClause(c, clause));
        if (results.some(c => c.internal) && q.includes("'")) pass('search-sqli');
        if (XSS_MARK.test(q) || /<script/i.test(q)) pass('search-xss');
      }
      return send(res, 200, searchPage(user, q, results));
    }
    if (p === '/adjuster' && req.method === 'GET') {
      if (needAuth()) return; attempt('Adjuster & Approvals');
      const role = effRole(req, user);
      if (role !== 'adjuster' && role !== 'admin') return send(res, 403, layout('Forbidden', user, '<h1>403 — Adjusters only</h1>'));
      if (user.role === 'policyholder') pass('auth-cookie');
      return send(res, 200, adjusterPage(user, sess));
    }
    const mApprove = p.match(/^\/adjuster\/approve\/(\d+)$/);
    if (mApprove && req.method === 'POST') {
      if (needAuth()) return; attempt('Adjuster & Approvals');
      const claim = claims.find(c => c.id === Number(mApprove[1])); if (!claim) return send(res, 404, 'Claim not found');
      const payout = body.payout !== undefined && body.payout !== '' ? Number(body.payout) : claim.amount;
      if (user.role === 'policyholder') pass('adj-self');
      if (payout > claim.amount) pass('adj-payout-inflate');
      claim.payout = payout; claim.status = 'approved';
      return redirect(res, '/adjuster');
    }
    const mPayout = p.match(/^\/adjuster\/payout\/(\d+)$/);
    if (mPayout && req.method === 'POST') {
      if (needAuth()) return; attempt('Payouts');
      const claim = claims.find(c => c.id === Number(mPayout[1])); if (!claim) return send(res, 404, 'Claim not found');
      if (claim.status === 'approved' || claim.status === 'paid') {
        payouts.push({ id: nextPayoutId++, claimId: claim.id, ownerId: claim.ownerId, amount: claim.payout || claim.amount });
        claim.status = 'paid';
        const mine = payouts.filter(x => x.claimId === claim.id);
        const totalPaid = mine.reduce((a, x) => a + x.amount, 0);
        if (mine.length >= 2 || totalPaid > (claim.payout || claim.amount)) pass('pay-double');
      }
      return redirect(res, '/adjuster');
    }
    const mPayGet = p.match(/^\/payouts\/(\d+)$/);
    if (mPayGet && req.method === 'GET') {
      if (needAuth()) return; attempt('Payouts');
      const rec = payouts.find(x => x.id === Number(mPayGet[1])); if (!rec) return send(res, 404, 'Payout not found');
      if (user.role === 'policyholder' && rec.ownerId !== user.id) pass('pay-idor');
      return send(res, 200, layout('Payout #' + rec.id, user, `<h1>Payout #${rec.id}</h1><p>Claim: <a href="/claim/${rec.claimId}">#${rec.claimId}</a><br>Paid to user #${rec.ownerId}<br>Amount: ${money(rec.amount)}</p>`));
    }
    if (p === '/admin' && req.method === 'GET') {
      if (needAuth()) return; attempt('Admin & Platform');
      const role = effRole(req, user);
      if (role !== 'admin') return send(res, 403, layout('Forbidden', user, '<h1>403 — Admins only</h1>'));
      if (user.role !== 'admin') pass('auth-cookie');
      return send(res, 200, adminPage(user, sess));
    }
    const mDeact = p.match(/^\/admin\/deactivate\/(\d+)$/);
    if (mDeact && req.method === 'POST') {
      if (needAuth()) return; attempt('Admin & Platform');
      if (effRole(req, user) !== 'admin') return send(res, 403, 'Forbidden');
      if (String(body.hx_marker || '') !== sess.marker) pass('admin-csrf');
      const target = users.find(u => u.id === Number(mDeact[1])); if (target) target.active = false;
      return redirect(res, '/admin');
    }
    return send(res, 404, layout('Not found', user, '<h1>404 — page not found</h1>'));
  } catch (e) {
    try { send(res, 500, 'Internal error — the lab survived your input.'); } catch (e2) {}
  }
});

/* ============================ Doc generation ============================ */
function genDocs() {
  const byFeature = {}; for (const t of ALL_TESTS) (byFeature[t.feature] = byFeature[t.feature] || []).push(t);
  let vuln = '# HexaInsuranceClaim (LAB 107) — Vulnerability Map\n\nEvery scored test in the lab, grouped by feature. ' + ALL_TESTS.length + ' tests across ' + FEATURES.length + ' features.\n';
  for (const f of FEATURES) {
    vuln += '\n## ' + f + '\n';
    for (const t of byFeature[f]) vuln += '\n### ' + t.name + '\n- OWASP: ' + t.owasp + '\n- Difficulty: ' + t.difficulty + '\n- Exploitation outline: ' + t.hints[2] + '\n- Impact: ' + t.impact + '\n';
  }
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'), vuln);
  const order = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  let guide = '# HexaInsuranceClaim (LAB 107) — Practice Guide\n\nChallenges grouped by feature, then difficulty. Each mirrors the /tests Mission Board.\n';
  for (const f of FEATURES) {
    guide += '\n## ' + f + '\n';
    for (const t of byFeature[f].slice().sort((a, b) => order[a.difficulty] - order[b.difficulty])) {
      guide += '\n### ' + t.name + ' (' + t.difficulty + ')\n- Objective: ' + t.lesson + '\n- Measurable goal: the "' + t.name + '" test flips to done on /tests by performing the exploit.\n- Hint 1: ' + t.hints[0] + '\n- Hint 2: ' + t.hints[1] + '\n- Hint 3: ' + t.hints[2] + '\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'), guide);
  let fix = '# HexaInsuranceClaim (LAB 107) — Fix & Retest Guide\n\nFor every finding: the secure implementation and the regression test. Retest = repeat the original exploit and confirm it now fails while legitimate use still works.\n';
  for (const t of ALL_TESTS) fix += '\n## ' + t.report.title + '\n- Severity: ' + t.report.severity + '\n- Fix: ' + t.report.remediation + '\n- Regression test: repeat the exploit for "' + t.name + '" — it must no longer flip the test on /tests, and the normal user flow must still succeed.\n';
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'), fix);
  console.log('Docs generated from registry: ' + ALL_TESTS.length + ' tests, ' + FEATURES.length + ' features.');
}
if (process.argv.includes('--gen-docs')) { genDocs(); process.exit(0); }

server.listen(PORT, '127.0.0.1', () => { console.log('LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ' listening on http://127.0.0.1:' + PORT); });
