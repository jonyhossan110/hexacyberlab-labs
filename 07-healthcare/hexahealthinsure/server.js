'use strict';
/* =====================================================================
   HexaHealthInsure — LAB 70 of 110 (Category 7: Healthcare & Wellness)
   A deliberately vulnerable health-insurance portal for local training.
   Zero-dependency Node.js. ALL data is fake seed data. Local use only.
   ===================================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3079;
const HOST = '127.0.0.1';
const LAB_NUMBER = 70;
const LAB_NAME = 'HexaHealthInsure';
const PROGRESS_FILE = path.join(__dirname, 'progress.json');
const LOGO_FILE = path.join(__dirname, 'logo.png');

/* --- key material, region A (shards only; assembled at runtime) --- */
const _ekA = ['TC1YSA==', 'MC0wNw==', 'QUhFMA=='];
const _ckA = ['TC1YSA==', 'Ry0xNw==', 'QVUxRw=='];

function unshard(parts) {
  return parts.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}

/* ------------------------------ utilities ------------------------------ */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
const XSS_RE = /(<script|<svg|<img[^>]*onerror|onerror\s*=|onload\s*=|<iframe|javascript:)/i;
const INJ_RE = /('|--|;|\/\*|\bunion\b|\bor\s+['1]|\band\s+['1])/i;
function money(n) { return '$' + Number(n || 0).toLocaleString('en-US'); }
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  raw.split(';').forEach(p => {
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
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) {
        try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); }
      } else {
        const out = {};
        new URLSearchParams(data).forEach((v, k) => { out[k] = v; });
        resolve(out);
      }
    });
    req.on('error', () => resolve({}));
  });
}

/* ------------------------------ seed data ------------------------------ */
const PLANS = [
  { id: 1, name: 'Bronze', monthlyFee: 49, annualLimit: 5000, covered: ['General consultation', 'Appendectomy', 'Physiotherapy course', 'Dental cleaning'] },
  { id: 3, name: 'Silver', monthlyFee: 99, annualLimit: 20000, covered: ['General consultation', 'Appendectomy', 'Physiotherapy course', 'Dental cleaning', 'Knee MRI scan', 'Dental surgery', 'Cataract surgery', 'Eye laser surgery'] },
  { id: 2, name: 'Gold', monthlyFee: 199, annualLimit: 50000, covered: ['General consultation', 'Appendectomy', 'Physiotherapy course', 'Dental cleaning', 'Knee MRI scan', 'Dental surgery', 'Cataract surgery', 'Eye laser surgery', 'Heart bypass surgery', 'Spinal surgery', 'Hip replacement', 'Cosmetic rhinoplasty'] }
];
function planById(id) { return PLANS.find(p => p.id === Number(id)) || PLANS[0]; }

const users = [
  { id: 1, name: 'Admin Ava', email: 'admin@hexainsure.local', password: 'admin123', role: 'admin' },
  { id: 2, name: 'Adam Adjuster', email: 'adjuster@hexainsure.local', password: 'adjuster123', role: 'adjuster' },
  { id: 3, name: 'City Clinic', email: 'cityclinic@hexainsure.local', password: 'clinic123', role: 'provider', listed: true },
  { id: 4, name: 'MediCare Center', email: 'medcare@hexainsure.local', password: 'medcare123', role: 'provider', listed: true },
  { id: 5, name: 'Alice Member', email: 'alice@example.com', password: 'alice123', role: 'member', planId: 2 },
  { id: 6, name: 'Bob Member', email: 'bob@example.com', password: 'bob123', role: 'member', planId: 3 },
  { id: 7, name: 'Carol Member', email: 'carol@example.com', password: 'carol123', role: 'member', planId: 1 },
  { id: 8, name: 'Dave Member', email: 'dave@example.com', password: 'dave123', role: 'member', planId: 3 },
  { id: 9, name: 'Demo User', email: 'demo@hexainsure.local', password: 'demo1234', role: 'member', planId: 1, demo: true },
  { id: 10, name: 'WellCare Clinic', email: 'wellcare@hexainsure.local', password: 'wellcare123', role: 'provider', listed: false }
];
let nextUserId = 11;

const claims = [
  { id: 1, memberId: 5, providerId: 3, treatment: 'Knee MRI scan', amount: 1200, status: 'approved', date: '2026-09-14' },
  { id: 2, memberId: 5, providerId: 4, treatment: 'Dental surgery', amount: 800, status: 'pending', date: '2026-10-02' },
  { id: 3, memberId: 6, providerId: 3, treatment: 'Heart bypass surgery', amount: 18000, status: 'pending', date: '2026-10-05' },
  { id: 4, memberId: 7, providerId: 3, treatment: 'Appendectomy', amount: 4500, status: 'pending', date: '2026-10-08' },
  { id: 5, memberId: 8, providerId: 4, treatment: 'Physiotherapy course', amount: 600, status: 'paid', date: '2026-09-20' },
  { id: 6, memberId: 6, providerId: 4, treatment: 'Eye laser surgery', amount: 2500, status: 'rejected', date: '2026-09-25' }
];
let nextClaimId = 7;

const preauths = [
  { id: 1, memberId: 5, providerId: 3, treatment: 'Spinal surgery', estAmount: 30000, status: 'pending', date: '2026-10-10' },
  { id: 2, memberId: 6, providerId: 4, treatment: 'Cataract surgery', estAmount: 4000, status: 'approved', date: '2026-09-28' },
  { id: 3, memberId: 7, providerId: 3, treatment: 'Hip replacement', estAmount: 9000, status: 'pending', date: '2026-10-11' }
];
let nextPreauthId = 4;

const bills = [
  { id: 1, providerId: 3, memberId: 5, claimId: 1, treatment: 'Knee MRI scan', amount: 1200, status: 'paid', date: '2026-09-16' },
  { id: 2, providerId: 4, memberId: 8, claimId: 5, treatment: 'Physiotherapy course', amount: 600, status: 'submitted', date: '2026-09-22' }
];
let nextBillId = 3;

function userById(id) { return users.find(u => u.id === Number(id)); }
function memberUsed(memberId) {
  return claims.filter(c => c.memberId === Number(memberId) && ['approved', 'paid'].includes(c.status))
    .reduce((s, c) => s + Number(c.amount), 0);
}

/* ------------------------------ TESTS registry ------------------------------ */
const T = (id, feature, name, owasp, difficulty, hints, lesson, impact, title, severity, remediation) =>
  ({ id, feature, name, owasp, difficulty, hints, lesson, impact, report: { title, severity, remediation } });

const TESTS = [
  /* ---- Login & Authentication ---- */
  T('auth-sqli', 'Login & Authentication', 'SQL Injection Login Bypass', 'A03 Injection', 'Beginner',
    ["The login form builds its query by gluing your input into a string.", "Try an email that closes the string early, such as admin@hexainsure.local' -- ", "Use admin@hexainsure.local' OR '1'='1 as the email — you are logged in as admin and the password is never checked."],
    'String-built SQL queries let an attacker rewrite the login condition and enter as any account.',
    'On a real insurer portal this is instant takeover of admin and member accounts — every policy, claim and medical bill is exposed.',
    'SQL Injection in Login Form Allows Authentication Bypass', 'Critical', 'Use parameterised queries everywhere; never build SQL with string concatenation.'),
  T('auth-brute', 'Login & Authentication', 'Brute Force — No Rate Limiting', 'A07 Auth Failures', 'Beginner',
    ['Nothing slows down repeated password guesses.', 'Script 10+ wrong passwords for one account and watch for any lockout or delay.', 'After 10 failures the app still processes guesses normally — the missing throttle is the finding.'],
    'Without throttling, an attacker can guess passwords forever until one works.',
    'A client\u2019s members get their accounts cracked one by one — claims fraud and identity theft follow.',
    'No Rate Limiting or Account Lockout on Login', 'High', 'Throttle login attempts per account and IP; add progressive delays or CAPTCHA after repeated failures.'),
  T('auth-enum', 'Login & Authentication', 'User Enumeration via Error Messages', 'A07 Auth Failures', 'Beginner',
    ['Compare the error for an email that exists with one that does not.', 'The forgot-password form answers differently too.', 'Probe 5 or more different emails — the different answers reveal exactly which emails hold accounts.'],
    'Different error messages turn the login and reset forms into an account-existence oracle.',
    'Attackers harvest a verified member list first, then aim phishing and credential stuffing only at real accounts.',
    'Account Enumeration via Differential Error Messages', 'Medium', 'Return one generic message for all login and password-reset outcomes.'),
  T('auth-default', 'Login & Authentication', 'Published Demo Credentials', 'A07 Auth Failures', 'Beginner',
    ['The login page itself offers a demo account.', 'Demo logins from a vendor demo often stay live in production.', 'Sign in with the demo account printed right on the login page.'],
    'A working credential printed in the UI is a standing invitation into the application.',
    'Anyone on the internet can walk into the portal with the printed demo login and explore member functionality.',
    'Working Demo Account Disclosed on the Login Page', 'High', 'Remove demo accounts from production and never print credentials in the UI.'),
  T('auth-reset', 'Login & Authentication', 'Predictable Password-Reset Token', 'A07 Auth Failures', 'Intermediate',
    ['Request a reset and study the shape of the token.', 'The token is computed from the account, not randomly generated.', 'Tokens follow HXR-<userId x 131 + 17> — compute one for another user and reset their password without ever requesting a reset.'],
    'Reset tokens must be unguessable; a formula based on the user id is public knowledge once one token is seen.',
    'Any member\u2019s password can be reset by a stranger — full account takeover with no email access needed.',
    'Password Reset Tokens Are Predictable', 'High', 'Generate reset tokens from a CSPRNG, store only a hash, expire them quickly, and bind them to a real request.'),
  T('auth-cookie', 'Login & Authentication', 'Role Cookie Tampering', 'A01 Broken Access Control', 'Intermediate',
    ['After login, inspect the cookies the app sets.', 'One cookie repeats your role — and the server believes it.', 'Set the hx_role cookie to admin in your browser and open /admin.'],
    'Authorisation data must live server-side; a role stored in a client cookie is editable by the client.',
    'Every member becomes an admin by editing one cookie — user management, claims and payouts are all theirs.',
    'Server Trusts Client-Supplied Role Cookie (Privilege Escalation)', 'Critical', 'Derive roles only from the server-side session; never trust role data from cookies.'),

  /* ---- Registration & Profile ---- */
  T('reg-weak', 'Registration & Profile', 'Weak Password Policy', 'A07 Auth Failures', 'Beginner',
    ['Register a new account.', 'How short can the password be?', 'A 1-character password is accepted.'],
    'Accounts are only as strong as the weakest password the policy allows.',
    'Members with trivial passwords are harvested by the first credential-stuffing run against the portal.',
    'No Minimum Password Strength on Registration', 'Medium', 'Enforce a minimum length of 12+ and block known common passwords.'),
  T('reg-mass', 'Registration & Profile', 'Mass Assignment — Self-Assigned Role', 'A01 Broken Access Control', 'Intermediate',
    ['The register endpoint binds the whole request body to the new user record.', 'Add a field the visible form never shows.', 'Submit role=admin with your registration — the account is created as an admin.'],
    'Binding request bodies directly to models hands the client control of privileged fields.',
    'Anyone can register themselves as an admin of the insurance portal in one request — total compromise.',
    'Mass Assignment Allows Privilege Escalation at Registration', 'Critical', 'Whitelist bindable fields on registration; set roles server-side only.'),
  T('reg-xss', 'Registration & Profile', 'Stored XSS in Display Name', 'A03 Injection', 'Intermediate',
    ['Your display name is printed back on several pages.', 'One of those pages is the admin user list.', 'Register (or rename yourself) with a script payload as the name — it is stored and rendered raw.'],
    'Stored payloads in profile fields execute in other users\u2019 browsers — including administrators.',
    'An attacker plants a script in their name and hijacks the session of every admin who views the user list.',
    'Stored Cross-Site Scripting via Display Name', 'High', 'Context-encode all user-supplied output and validate name fields on the server.'),
  T('reg-csrf', 'Registration & Profile', 'CSRF on Profile Update', 'A01 Broken Access Control', 'Intermediate',
    ['Your own pages carry a hidden hx_origin marker in their forms.', 'A state-changing POST from another origin does not carry it.', 'POST to /profile with a cross-site Origin and no marker — the change is accepted anyway.'],
    'Session cookies ride along with cross-site requests, so state changes need an unforgeable token.',
    'A malicious page can silently rewrite a logged-in member\u2019s profile and contact details.',
    'Missing CSRF Protection on Profile Update', 'High', 'Require a per-session CSRF token on every state-changing request and verify the Origin header.'),

  /* ---- Claims ---- */
  T('claims-limit', 'Claims', 'Claim Above Coverage Limit Accepted', 'A04 Insecure Design', 'Intermediate',
    ['Every plan has an annual coverage limit — find the Bronze limit on the Plans page.', 'The claim form never compares the amount against it.', 'As Carol (Bronze, limit $5,000), file a claim for $9,000 — it is accepted and stored.'],
    'Financial limits that exist in the brochure must also exist in the server-side code.',
    'The insurer pays out claims far beyond what members paid for — direct, unlimited financial loss.',
    'Claim Amounts Are Not Validated Against Coverage Limits', 'High', 'Validate claim amounts server-side against the member\u2019s remaining coverage before accepting.'),
  T('claims-idor', 'Claims', 'Claim IDOR — Other Members\u2019 Claims', 'A01 Broken Access Control', 'Beginner',
    ['Claim detail pages use a simple numeric id.', 'Ownership is never checked when the page loads.', 'Open /claims/3 while signed in as a different member.'],
    'Sequential ids plus missing ownership checks expose every record in the system.',
    'Any member can read every other member\u2019s treatments and amounts — a mass health-data breach.',
    'Insecure Direct Object Reference on Claim Details', 'High', 'Check object ownership on every claim read and write.'),
  T('claims-selfapprove', 'Claims', 'Members Can Approve Their Own Claims', 'A01 Broken Access Control', 'Intermediate',
    ['Adjusters decide claims through /adjuster/decide.', 'Who checks that the caller really is an adjuster?', 'As a plain member, POST your own claim id with decision=approved — it goes through.'],
    'A workflow endpoint without a role check lets the beneficiary act as the approver.',
    'Members approve their own claims at will — the entire claims control process is meaningless.',
    'Missing Authorisation on Claim Decision Endpoint (Self-Approval)', 'Critical', 'Enforce adjuster/admin role checks on the decision endpoint server-side.'),
  T('claims-status', 'Claims', 'Claim Status Forgery by Owner', 'A01 Broken Access Control', 'Intermediate',
    ['The claim detail page has a status form for "updates".', 'It trusts whatever status you submit.', 'Set your own pending claim\u2019s status directly to paid.'],
    'Status fields are money: letting owners set them skips review, approval and payment controls at once.',
    'Members mark their own claims paid without any review — instant fraudulent payouts.',
    'Members Can Forge Claim Status (Workflow Bypass)', 'High', 'Drive status transitions from a server-side state machine restricted by role.'),
  T('claims-edit', 'Claims', 'Editing an Already-Approved Claim', 'A01 Broken Access Control', 'Intermediate',
    ['Approved claims should be frozen — are they?', 'The edit form still posts for claims of any status.', 'Raise the amount of Alice\u2019s approved $1,200 claim to $45,000.'],
    'Once a financial record is approved, any later silent edit destroys the audit trail and the payout math.',
    'An approved $1,200 claim quietly becomes $45,000 — the difference is paid out before anyone notices.',
    'Approved Claims Remain Editable (Amount Tampering)', 'High', 'Lock claims from editing once approved or paid; route changes through adjusters with an audit log.'),

  /* ---- Pre-authorizations ---- */
  T('preauth-forge', 'Pre-authorizations', 'Forged Pre-Authorization', 'A04 Insecure Design', 'Advanced',
    ['The pre-auth form carries hidden fields for the member and the status.', 'Hidden fields are only suggestions — the server trusts them.', 'Submit a pre-authorization with status=approved (optionally for another member) — it is stored as approved.'],
    'Approval state must be produced by the approval workflow, never supplied by the requester.',
    'Members walk into clinics with "approved" authorisations the insurer never reviewed — guaranteed payouts for anything.',
    'Pre-Authorizations Can Be Forged as Pre-Approved', 'Critical', 'Set member and status server-side; approvals only through the reviewer workflow.'),
  T('preauth-idor', 'Pre-authorizations', 'Pre-Authorization IDOR', 'A01 Broken Access Control', 'Beginner',
    ['Pre-auth detail pages take a numeric id.', 'Try a neighbour\u2019s id while signed in as someone else.', 'Open /preauth/1 as a different member — full details are served.'],
    'The same missing ownership check usually repeats on every object type in the app.',
    'Planned surgeries and treatments of every member are readable by any other member.',
    'Insecure Direct Object Reference on Pre-Authorizations', 'High', 'Verify the requester owns, or is assigned to, each pre-authorization.'),

  /* ---- Eligibility Checks ---- */
  T('elig-fraud', 'Eligibility Checks', 'Eligibility Check Trusts Client-Supplied Plan', 'A04 Insecure Design', 'Advanced',
    ['The eligibility checker asks which plan to check against.', 'Your real plan is on your profile — but the form\u2019s planId field is editable.', 'As Carol (Bronze), check "Cosmetic rhinoplasty" with planId set to Gold — it answers ELIGIBLE for a treatment Bronze never covers.'],
    'A decision is only trustworthy when every input comes from the server\u2019s own records.',
    'Members get written "eligible" answers for treatments they never paid to cover — clinics bill, insurer pays.',
    'Eligibility Decisions Based on Client-Supplied Plan Data', 'High', 'Look up the member\u2019s actual plan server-side; never accept plan parameters from the client.'),
  T('elig-idor', 'Eligibility Checks', 'Eligibility Summary IDOR', 'A01 Broken Access Control', 'Beginner',
    ['The eligibility summary URL ends with a member id.', 'Change it.', 'Open /eligibility/6 as another member to see their plan, usage and remaining coverage.'],
    'Coverage details are sensitive personal data and need the same ownership checks as claims.',
    'Any member can map every other member\u2019s plan and remaining coverage — perfect targeting for fraud.',
    'Insecure Direct Object Reference on Eligibility Summaries', 'Medium', 'Restrict eligibility views to the owner and authorised staff.'),

  /* ---- Plans & Coverage ---- */
  T('plan-upgrade', 'Plans & Coverage', 'Free Plan Upgrade (No Payment)', 'A04 Insecure Design', 'Intermediate',
    ['The Plans page offers upgrades.', 'Watch what the upgrade request actually verifies.', 'POST an upgrade to Gold — the plan changes instantly with no payment step at all.'],
    'Entitlement changes must be chained to a verified payment event, not to the upgrade request itself.',
    'Every member upgrades to the top plan for free — premium revenue and coverage control both collapse.',
    'Plan Upgrades Applied Without Payment Verification', 'High', 'Activate plan changes only after confirmed payment.'),

  /* ---- Provider Billing ---- */
  T('billing-phantom', 'Provider Billing', 'Billing for Treatment Never Given', 'A04 Insecure Design', 'Advanced',
    ['Providers submit bills directly to the insurer.', 'Nothing ties a bill to a real visit or claim.', 'As City Clinic, bill Dave for "Brain surgery" — Dave has claims, but never with City Clinic, yet the bill is accepted.'],
    'Money-out endpoints must verify the underlying real-world event exists before accepting a charge.',
    'Clinics bill the insurer for phantom treatments at scale — the classic healthcare-fraud pattern, fully automated.',
    'Providers Can Bill for Non-Existent Treatments (Phantom Billing)', 'Critical', 'Require bills to reference a verified claim or visit before acceptance.'),
  T('billing-double', 'Provider Billing', 'Double Billing for the Same Claim', 'A04 Insecure Design', 'Intermediate',
    ['Claim 1 already has a paid bill.', 'What stops a second bill against the same claim?', 'Submit another bill referencing claim 1 — it is accepted too.'],
    'Idempotency is a security control: the same event must never be payable twice.',
    'Every paid treatment can be billed again and again — losses grow silently inside normal-looking billing volume.',
    'Duplicate Billing Against an Already-Paid Claim', 'High', 'Enforce one payable bill per claim and check the claim billing state server-side.'),

  /* ---- Provider Directory ---- */
  T('dir-xss', 'Provider Directory', 'Reflected XSS in Provider Search', 'A03 Injection', 'Beginner',
    ['The provider directory echoes your search term back.', 'It echoes it exactly as typed.', 'Search for a script payload — it comes back unescaped in the page.'],
    'Reflected input must be encoded for the context it lands in, every time.',
    'Attackers send members crafted search links that run script in the portal under the victim\u2019s session.',
    'Reflected Cross-Site Scripting in Provider Search', 'Medium', 'HTML-encode all reflected input.'),

  /* ---- Admin Panel ---- */
  T('admin-csrf', 'Admin Panel', 'CSRF on Admin Role Change', 'A01 Broken Access Control', 'Intermediate',
    ['Admin actions are plain POSTs.', 'The hx_origin marker in admin forms is never verified by the server.', 'As admin, POST to /admin/role with a cross-site Origin and no marker — the role change applies.'],
    'The more powerful the action, the more dangerous a missing CSRF token becomes.',
    'One malicious page visited by an admin silently promotes an attacker account to admin.',
    'Missing CSRF Protection on Administrative Role Changes', 'High', 'Verify CSRF tokens on all administrative actions.'),

  /* ---- Platform & API ---- */
  T('api-token', 'Platform & API', 'Weak API Token (Derived from Email)', 'A07 Auth Failures', 'Intermediate',
    ['The API wants a Bearer token.', 'The token is derived from something public.', 'Use hhi_ followed by the base64 of a member\u2019s email as the token for /api/claims — it authenticates as that member.'],
    'A token anyone can compute from public data is not a credential at all.',
    'Every member\u2019s claims are readable by anyone who knows an email address — no password ever needed.',
    'API Tokens Are Predictably Derived from Email Addresses', 'High', 'Issue random, revocable API keys and store only their hashes server-side.'),
  T('debug-dump', 'Platform & API', 'Unauthenticated Debug Data Dump', 'A05 Security Misconfiguration', 'Beginner',
    ['Developers love leaving debug endpoints behind.', 'Try the obvious one.', 'Open /debug with no login at all — every account, including passwords, is returned.'],
    'Leftover debug surfaces bypass every other control in the application.',
    'The full credential list of the insurer portal is one unauthenticated request away — game over.',
    'Unauthenticated Debug Endpoint Exposes All User Credentials', 'Critical', 'Remove debug endpoints from production and never expose password data.')
];
const TEST_BY_ID = {};
TESTS.forEach(t => { TEST_BY_ID[t.id] = t; });
const FEATURES = [...new Set(TESTS.map(t => t.feature))];

/* --- key material, region B (remaining shards) --- */
const _ekB = ['LVpRTQ==', 'UlFKMA==', 'M1FVRA=='];
const _ckB = ['LTg1RQ==', 'VFc0SQ==', 'SjkyVQ=='];
function entryKey() { return unshard(_ekA.concat(_ekB)); }
function completionKey() { return unshard(_ckA.concat(_ckB)); }

/* ------------------------------ progress engine ------------------------------ */
let state = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadState() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      state = Object.assign(state, raw);
    }
  } catch (e) { /* corrupted state file: start fresh */ }
}
function saveState() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 1)); } catch (e) { /* ignore */ }
}
function doneCount() { return TESTS.filter(t => state.tests[t.id]).length; }
function isComplete() { return doneCount() === TESTS.length; }
function pass(id) {
  if (!TEST_BY_ID[id] || state.tests[id]) return;
  state.tests[id] = true;
  if (isComplete() && !state.completedAt) {
    state.completedAt = new Date().toISOString();
    state.keyRevealed = true;
  }
  saveState();
}
function attempt(feature) {
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  saveState();
}
function progressJSON() {
  const feats = {};
  FEATURES.forEach(f => {
    const list = TESTS.filter(t => t.feature === f);
    feats[f] = { total: list.length, done: list.filter(t => state.tests[t.id]).length, attempts: state.attempts[f] || 0 };
  });
  const done = doneCount();
  return {
    lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done,
    pct: Math.floor(done / TESTS.length * 100),
    features: feats, complete: isComplete()
  };
}

/* ------------------------------ sessions ------------------------------ */
const sessions = new Map(); // sid -> userId
function newSession(res, user) {
  const sid = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  sessions.set(sid, user.id);
  res.setHeader('Set-Cookie', [
    'hx_session=' + sid + '; Path=/; HttpOnly',
    'hx_role=' + user.role + '; Path=/'
  ]);
  return sid;
}
function currentUser(req) {
  const c = parseCookies(req);
  if (c.hx_session && sessions.has(c.hx_session)) return userById(sessions.get(c.hx_session)) || null;
  return null;
}
function effectiveRole(req, user) {
  const c = parseCookies(req);
  return c.hx_role || (user ? user.role : null);
}
function isCsrf(req, body) {
  const origin = req.headers.origin || '';
  if (origin && !origin.includes('127.0.0.1:' + PORT)) return true;
  if (!body || body.hx_origin !== 'same-site') return true;
  return false;
}
function resetTokenFor(user) { return 'HXR-' + (user.id * 131 + 17); }
const issuedResetTokens = new Set();
const loginFailures = {};   // email -> failed count
const probedEmails = new Set();

/* ------------------------------ rendering ------------------------------ */
function progressBarHTML() {
  const p = progressJSON();
  return '<div style="background:#1d1d28;border-radius:8px;padding:8px 12px;margin:10px 0;color:#eee">' +
    '<div style="font-size:13px">LAB ' + LAB_NUMBER + ' · ' + p.done + '/' + p.total + ' tests · ' + p.pct + '%</div>' +
    '<div style="background:#333;height:10px;border-radius:5px;margin-top:5px"><div style="background:#4caf50;height:10px;border-radius:5px;width:' + p.pct + '%"></div></div></div>';
}
function chatWidgetHTML() {
  return '<div id="hxchat" style="position:fixed;right:16px;bottom:16px;width:320px;max-width:92vw;background:#fff;border:1px solid #ccd;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.25);font-family:Arial,sans-serif;z-index:50">' +
    '<div style="background:#23233a;color:#fff;padding:9px 12px;border-radius:12px 12px 0 0;font-size:14px"><b>Lab Coach</b> — HexaHealthInsure</div>' +
    '<div id="hxlog" style="height:190px;overflow-y:auto;padding:9px 12px;font-size:13px;line-height:1.45"></div>' +
    '<div style="display:flex;border-top:1px solid #eee"><input id="hxmsg" placeholder="Ask the coach…" style="flex:1;border:0;padding:9px;font-size:13px" onkeydown="if(event.key===\'Enter\')hxSend()">' +
    '<button onclick="hxSend()" style="border:0;background:#23233a;color:#fff;padding:0 14px;cursor:pointer">Send</button></div></div>' +
    '<script>async function hxSend(){var m=document.getElementById("hxmsg"),l=document.getElementById("hxlog");var t=m.value.trim();if(!t)return;m.value="";l.innerHTML+="<div><b>You:</b> "+t.replace(/</g,"&lt;")+"</div>";try{var r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:t})});var j=await r.json();l.innerHTML+="<div style=\\"margin:4px 0\\"><b>Coach:</b> "+String(j.reply||"").replace(/</g,"&lt;")+"</div>";}catch(e){l.innerHTML+="<div><b>Coach:</b> (connection problem)</div>";}l.scrollTop=l.scrollHeight;}</script>';
}
function page(user, title, content, opts) {
  opts = opts || {};
  const nav = user ? '<nav style="margin:8px 0;font-size:14px">' +
    ['/', '/claims', '/preauth', '/eligibility', '/plans', '/providers', '/billing', '/adjuster', '/admin', '/tests', '/complete', '/certificate', '/profile']
      .map(u => '<a href="' + u + '" style="margin-right:10px;color:#7ab8ff">' + u + '</a>').join('') +
    '<span style="float:right;color:#ccc">' + (user.name) + ' (' + esc(user.role) + ') · <a href="/logout" style="color:#7ab8ff">logout</a></span></nav>' : '';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + ' · LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</title></head>' +
    '<body style="margin:0;background:#14141d;font-family:Arial,sans-serif;color:#222">' +
    '<div style="max-width:900px;margin:0 auto;padding:18px">' +
    '<div style="background:#fff;border:1px solid #dde;border-radius:12px;padding:20px 24px">' +
    '<img src="/logo.png" style="height:44px;vertical-align:middle"> <span style="font-size:19px;font-weight:bold">LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</span>' +
    progressBarHTML() + nav + '<hr style="border:none;border-top:1px solid #eee">' + content +
    '</div></div>' + chatWidgetHTML() + '</body></html>';
}
function gatePage() {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' · Locked</title></head>' +
    '<body style="margin:0;background:#14141d;font-family:Arial,sans-serif"><div style="max-width:520px;margin:60px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:28px;text-align:center">' +
    '<img src="/logo.png" style="height:56px"><h2>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h2>' +
    '<p>This lab is locked. Paste the completion key from Lab ' + (LAB_NUMBER - 1) + ' to start.</p>' +
    '<form method="POST" action="/unlock"><input name="key" style="padding:9px;width:80%" placeholder="Completion key from Lab ' + (LAB_NUMBER - 1) + '"><br><br>' +
    '<button style="padding:10px 22px">Unlock LAB ' + LAB_NUMBER + '</button></form></div>' + chatWidgetHTML() + '</body></html>';
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }

/* ------------------------------ chatbot ------------------------------ */
const FEATURE_KEYS = [
  ['Login & Authentication', ['login', 'auth', 'password', 'brute', 'reset token', 'enumeration']],
  ['Registration & Profile', ['regist', 'profile', 'sign up', 'signup', 'mass assignment']],
  ['Claims', ['claim']],
  ['Pre-authorizations', ['preauth', 'pre-auth', 'pre auth', 'authorisation', 'authorization']],
  ['Eligibility Checks', ['eligib']],
  ['Plans & Coverage', ['plan', 'coverage', 'upgrade']],
  ['Provider Billing', ['bill']],
  ['Provider Directory', ['directory', 'search provider', 'provider search']],
  ['Admin Panel', ['admin']],
  ['Platform & API', ['api', 'debug', 'platform', 'token']]
];
function featureFromMessage(msg) {
  const m = msg.toLowerCase();
  for (const [f, keys] of FEATURE_KEYS) { if (keys.some(k => m.includes(k))) return f; }
  return null;
}
function chatReply(message) {
  const msg = String(message || '');
  const m = msg.toLowerCase();
  const p = progressJSON();
  if (/\bwho\b.*(built|made|created|build)|founder|jony|hexacyberlab.*(who|built)/.test(m)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (m.includes('key') && (m.includes('completion') || m.includes('next lab') || m.includes('give') || m.includes('what is') || m.includes('unlock'))) {
    if (isComplete() && state.keyRevealed) {
      return 'You completed LAB ' + LAB_NUMBER + ' — here is your completion key for the next lab: ' + completionKey();
    }
    return 'I do not have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at ' + p.pct + '% (' + p.done + '/' + p.total + ' tests). Finish every test and ask me again.';
  }
  const feat = featureFromMessage(msg);
  const wantsHow = /(how|step|guide|help me|solve|exploit|bypass|walkthrough|hint)/.test(m);
  if (feat && (m.includes('how many') || m.includes('vulnerabilit') || m.includes('tests in') || m.includes('count'))) {
    const list = TESTS.filter(t => t.feature === feat);
    return 'The ' + feat + ' feature has ' + list.length + ' tests: ' + list.map(t => t.name + (state.tests[t.id] ? ' (done)' : '')).join('; ') + '.';
  }
  if (feat && wantsHow) {
    const tries = state.attempts[feat] || 0;
    const open = TESTS.filter(t => t.feature === feat && !state.tests[t.id]);
    if (!open.length) return 'You already completed every test in ' + feat + '. Well done!';
    if (tries >= 3 || open.length === 0) {
      const t = open[0];
      return 'Step by step for "' + t.name + '" (' + feat + '): ' + t.hints[2] + ' Lesson: ' + t.lesson;
    }
    return 'That feature is locked for help. First try the ' + feat + ' tests yourself at least 3 times — I can see you have tried ' + tries + ' time(s) so far. After 3 real tries, ask me again and I will guide you step by step.';
  }
  if (m.includes('how many') || m.includes('features') || m.includes('tests') || m.includes('vulnerabilit')) {
    return 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + FEATURES.length + ' features and ' + TESTS.length + ' tests: ' +
      FEATURES.map(f => f + ' (' + TESTS.filter(t => t.feature === f).length + ')').join(', ') + '. See them all on the /tests page.';
  }
  if (m.includes('progress') || m.includes('status') || m.includes('next') || m.includes('start') || m.includes('hello') || m.includes('hi')) {
    const next = TESTS.find(t => !state.tests[t.id]);
    return 'Your progress: ' + p.done + '/' + p.total + ' tests (' + p.pct + '%). ' +
      (next ? 'Next open test: "' + next.name + '" in ' + next.feature + ' — try it yourself first; after 3 attempts on that feature I can guide you.' : 'Everything is complete — visit /complete for your summary and key.');
  }
  return 'I am the Lab Coach for LAB ' + LAB_NUMBER + ' (' + LAB_NAME + '). Ask me how many tests a feature has, ask for your progress, or — after at least 3 real attempts on a feature — ask me how to solve one of its tests. The full map is on the /tests page.';
}

/* ------------------------------ HTTP handler ------------------------------ */
loadState();

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://127.0.0.1:' + PORT);
    const pathname = u.pathname;
    const method = req.method;

    if (pathname === '/logo.png') {
      try { const img = fs.readFileSync(LOGO_FILE); res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(img); }
      catch (e) { send(res, 404, 'not found', 'text/plain'); }
      return;
    }
    if (pathname === '/api/progress' && method === 'GET') {
      send(res, 200, JSON.stringify(progressJSON(), null, 1), 'application/json');
      return;
    }
    if (pathname === '/api/chat' && method === 'POST') {
      const body = await readBody(req);
      send(res, 200, JSON.stringify({ reply: chatReply(body.message) }), 'application/json');
      return;
    }
    if (pathname === '/unlock' && method === 'POST') {
      const body = await readBody(req);
      const given = String(body.key || '').trim();
      if (given && given === entryKey()) {
        state.unlocked = true; saveState();
        redirect(res, '/');
      } else {
        send(res, 403, '<h1>403</h1><p>That key is not correct.</p>', 'text/html');
      }
      return;
    }
    if (!state.unlocked) { send(res, 200, gatePage()); return; }

    /* ---------- auth pages ---------- */
    if (pathname === '/login' && method === 'GET') {
      const msg = u.searchParams.get('msg');
      send(res, 200, page(null, 'Login',
        '<h2>Member &amp; Partner Login</h2>' + (msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : '') +
        '<form method="POST" action="/login">Email<br><input name="email" style="width:90%;padding:8px"><br><br>Password<br>' +
        '<input name="password" type="password" style="width:90%;padding:8px"><br><br><button style="padding:9px 20px">Login</button></form>' +
        '<p style="background:#fff8e1;padding:10px;border-radius:8px">Demo account for evaluators: <b>demo@hexainsure.local</b> / <b>demo1234</b></p>' +
        '<p><a href="/register">Register</a> · <a href="/forgot">Forgot password</a></p>'));
      return;
    }
    if (pathname === '/login' && method === 'POST') {
      const body = await readBody(req);
      attempt('Login & Authentication');
      const email = String(body.email || ''), password = String(body.password || '');
      if (INJ_RE.test(email)) {
        const prefix = email.split("'")[0];
        const victim = users.find(x => x.email === prefix) || users[0];
        if (victim) { pass('auth-sqli'); newSession(res, victim); redirect(res, '/'); return; }
      }
      const usr = users.find(x => x.email === email);
      if (!usr) {
        probedEmails.add(email);
        if (probedEmails.size >= 5) pass('auth-enum');
        redirect(res, '/login?msg=' + encodeURIComponent('No account found for this email.'));
        return;
      }
      if (usr.password !== password) {
        loginFailures[email] = (loginFailures[email] || 0) + 1;
        if (loginFailures[email] >= 10) pass('auth-brute');
        redirect(res, '/login?msg=' + encodeURIComponent('Incorrect password.'));
        return;
      }
      if (usr.demo) pass('auth-default');
      newSession(res, usr);
      redirect(res, '/');
      return;
    }
    if (pathname === '/register' && method === 'GET') {
      const msg = u.searchParams.get('msg');
      send(res, 200, page(null, 'Register',
        '<h2>Create your account</h2>' + (msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : '') +
        '<form method="POST" action="/register">Full name<br><input name="name" style="width:90%;padding:8px"><br><br>Email<br>' +
        '<input name="email" style="width:90%;padding:8px"><br><br>Password<br><input name="password" type="password" style="width:90%;padding:8px"><br><br>' +
        'Plan<br><select name="planId"><option value="1">Bronze</option><option value="3">Silver</option><option value="2">Gold</option></select><br><br>' +
        '<button style="padding:9px 20px">Register</button></form>'));
      return;
    }
    if (pathname === '/register' && method === 'POST') {
      const body = await readBody(req);
      attempt('Registration & Profile');
      const email = String(body.email || '');
      if (users.some(x => x.email === email)) { redirect(res, '/register?msg=' + encodeURIComponent('Email already registered.')); return; }
      const nu = {
        id: nextUserId++, name: String(body.name || 'New User'), email,
        password: String(body.password || ''), role: String(body.role || 'member'),
        planId: body.planId ? Number(body.planId) : 1
      };
      users.push(nu);
      if (nu.password.length < 8) pass('reg-weak');
      if (nu.role !== 'member') pass('reg-mass');
      if (XSS_RE.test(nu.name)) pass('reg-xss');
      newSession(res, nu);
      redirect(res, '/');
      return;
    }
    if (pathname === '/forgot' && method === 'GET') {
      const msg = u.searchParams.get('msg');
      send(res, 200, page(null, 'Forgot password',
        '<h2>Forgot password</h2>' + (msg ? '<p>' + esc(msg) + '</p>' : '') +
        '<form method="POST" action="/forgot">Email<br><input name="email" style="width:90%;padding:8px"><br><br><button style="padding:9px 20px">Send reset token</button></form>' +
        '<p>Have a token? <a href="/reset">Reset your password</a></p>'));
      return;
    }
    if (pathname === '/forgot' && method === 'POST') {
      const body = await readBody(req);
      attempt('Login & Authentication');
      const email = String(body.email || '');
      probedEmails.add(email);
      if (probedEmails.size >= 5) pass('auth-enum');
      const usr = users.find(x => x.email === email);
      if (usr) {
        issuedResetTokens.add(resetTokenFor(usr));
        redirect(res, '/forgot?msg=' + encodeURIComponent('Reset token sent to your email.'));
      } else {
        redirect(res, '/forgot?msg=' + encodeURIComponent('No account found for that email.'));
      }
      return;
    }
    if (pathname === '/reset' && method === 'GET') {
      const msg = u.searchParams.get('msg');
      send(res, 200, page(null, 'Reset password',
        '<h2>Reset password</h2>' + (msg ? '<p>' + esc(msg) + '</p>' : '') +
        '<form method="POST" action="/reset">Reset token<br><input name="token" style="width:90%;padding:8px"><br><br>New password<br>' +
        '<input name="password" type="password" style="width:90%;padding:8px"><br><br><button style="padding:9px 20px">Set new password</button></form>'));
      return;
    }
    if (pathname === '/reset' && method === 'POST') {
      const body = await readBody(req);
      attempt('Login & Authentication');
      const usr = users.find(x => resetTokenFor(x) === String(body.token || ''));
      if (!usr) { redirect(res, '/reset?msg=' + encodeURIComponent('Invalid reset token.')); return; }
      if (!issuedResetTokens.has(String(body.token))) pass('auth-reset');
      issuedResetTokens.delete(String(body.token));
      usr.password = String(body.password || '');
      redirect(res, '/login?msg=' + encodeURIComponent('Password updated — please log in.'));
      return;
    }
    if (pathname === '/logout') {
      const c = parseCookies(req);
      if (c.hx_session) sessions.delete(c.hx_session);
      redirect(res, '/login');
      return;
    }

    /* ---------- everything below needs a session (except the platform routes) ---------- */
    const user = currentUser(req);
    const publicApi = pathname === '/debug' || pathname === '/api/claims';
    /* completion pages stay reachable without a login: the key and certificate must not be locked behind an app session */
    const completionRoute = pathname === '/complete' || pathname === '/certificate' || pathname === '/setname';
    if (!user && !publicApi && !completionRoute) { redirect(res, '/login'); return; }
    const er = effectiveRole(req, user);

    if (pathname === '/' && method === 'GET') {
      let inner = '<h2>Welcome, ' + user.name + '</h2>';
      if (user.role === 'member') {
        const plan = planById(user.planId);
        const used = memberUsed(user.id);
        inner += '<p>Your plan: <b>' + esc(plan.name) + '</b> · Annual limit ' + money(plan.annualLimit) + ' · Used ' + money(used) + ' · Remaining ' + money(plan.annualLimit - used) + '</p>' +
          '<p><a href="/claims">My claims</a> · <a href="/preauth">Pre-authorizations</a> · <a href="/eligibility">Check eligibility</a> · <a href="/plans">Plans &amp; upgrades</a></p>';
      } else if (user.role === 'provider') {
        inner += '<p>Provider console — submit and review your bills on the <a href="/billing">billing page</a>.</p>';
      } else if (user.role === 'adjuster' || user.role === 'admin') {
        inner += '<p>Staff console — ' + claims.filter(c => c.status === 'pending').length + ' claims are waiting for a decision on the <a href="/adjuster">adjuster queue</a>.</p>';
      }
      inner += '<p style="color:#666">HexaHealthInsure is a training portal. All people, plans and money here are fictional.</p>';
      send(res, 200, page(user, 'Dashboard', inner));
      return;
    }

    if (pathname === '/profile' && method === 'GET') {
      const msg = u.searchParams.get('msg');
      send(res, 200, page(user, 'Profile',
        '<h2>My profile</h2>' + (msg ? '<p>' + esc(msg) + '</p>' : '') +
        '<form method="POST" action="/profile"><input type="hidden" name="hx_origin" value="same-site">Display name<br>' +
        '<input name="name" value="' + esc(user.name) + '" style="width:90%;padding:8px"><br><br>Email<br>' +
        '<input name="email" value="' + esc(user.email) + '" style="width:90%;padding:8px"><br><br><button style="padding:9px 20px">Save</button></form>'));
      return;
    }
    if (pathname === '/profile' && method === 'POST') {
      const body = await readBody(req);
      attempt('Registration & Profile');
      if (isCsrf(req, body)) pass('reg-csrf');
      if (body.name) user.name = String(body.name);
      if (body.email) user.email = String(body.email);
      if (XSS_RE.test(user.name)) pass('reg-xss');
      redirect(res, '/profile?msg=' + encodeURIComponent('Saved.'));
      return;
    }

    /* ---------- claims ---------- */
    if (pathname === '/claims' && method === 'GET') {
      attempt('Claims');
      const mine = user.role === 'member' ? claims.filter(c => c.memberId === user.id) : claims;
      const rows = mine.map(c => '<tr><td><a href="/claims/' + c.id + '">#' + c.id + '</a></td><td>' + esc(c.treatment) + '</td><td>' + money(c.amount) + '</td><td>' + esc(c.status) + '</td><td>' + esc((userById(c.memberId) || {}).name || '') + '</td></tr>').join('');
      let form = '';
      if (user.role === 'member') {
        form = '<h3>File a new claim</h3><form method="POST" action="/claims"><input type="hidden" name="hx_origin" value="same-site">Treatment<br>' +
          '<input name="treatment" style="width:90%;padding:8px"><br><br>Amount<br><input name="amount" type="number" style="width:90%;padding:8px"><br><br>Provider<br>' +
          '<select name="providerId">' + users.filter(x => x.role === 'provider').map(x => '<option value="' + x.id + '">' + esc(x.name) + '</option>').join('') + '</select><br><br>' +
          '<button style="padding:9px 20px">Submit claim</button></form>';
      }
      send(res, 200, page(user, 'Claims', '<h2>Claims</h2><table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>Id</th><th>Treatment</th><th>Amount</th><th>Status</th><th>Member</th></tr>' + rows + '</table>' + form));
      return;
    }
    if (pathname === '/claims' && method === 'POST') {
      const body = await readBody(req);
      attempt('Claims');
      if (user.role !== 'member') { redirect(res, '/claims'); return; }
      const c = {
        id: nextClaimId++, memberId: user.id, providerId: Number(body.providerId) || 3,
        treatment: String(body.treatment || 'Treatment'), amount: Number(body.amount) || 0,
        status: 'pending', date: new Date().toISOString().slice(0, 10)
      };
      claims.push(c);
      if (c.amount > planById(user.planId).annualLimit) pass('claims-limit');
      redirect(res, '/claims/' + c.id);
      return;
    }
    const claimMatch = pathname.match(/^\/claims\/(\d+)$/);
    if (claimMatch && method === 'GET') {
      attempt('Claims');
      const c = claims.find(x => x.id === Number(claimMatch[1]));
      if (!c) { send(res, 404, 'not found', 'text/plain'); return; }
      if (user.role === 'member' && c.memberId !== user.id) pass('claims-idor');
      let inner = '<h2>Claim #' + c.id + '</h2><p>Treatment: ' + esc(c.treatment) + '<br>Amount: ' + money(c.amount) + '<br>Status: <b>' + esc(c.status) + '</b><br>Member: ' + esc((userById(c.memberId) || {}).name || '') + '<br>Provider: ' + esc((userById(c.providerId) || {}).name || '') + '<br>Date: ' + esc(c.date) + '</p>';
      if (c.memberId === user.id) {
        inner += '<h3>Edit amount</h3><form method="POST" action="/claims/' + c.id + '/edit"><input type="hidden" name="hx_origin" value="same-site"><input name="amount" type="number" value="' + c.amount + '" style="padding:8px"> <button>Save amount</button></form>' +
          '<h3>Update status</h3><form method="POST" action="/claims/' + c.id + '/status"><input type="hidden" name="hx_origin" value="same-site"><select name="status"><option>pending</option><option>approved</option><option>rejected</option><option>paid</option></select> <button>Set status</button></form>';
      }
      send(res, 200, page(user, 'Claim #' + c.id, inner));
      return;
    }
    const claimEdit = pathname.match(/^\/claims\/(\d+)\/edit$/);
    if (claimEdit && method === 'POST') {
      const body = await readBody(req);
      attempt('Claims');
      const c = claims.find(x => x.id === Number(claimEdit[1]));
      if (!c) { send(res, 404, 'not found', 'text/plain'); return; }
      if (c.memberId !== user.id) { send(res, 403, 'not your claim', 'text/plain'); return; }
      const wasLocked = ['approved', 'paid'].includes(c.status);
      c.amount = Number(body.amount) || c.amount;
      if (wasLocked) pass('claims-edit');
      redirect(res, '/claims/' + c.id);
      return;
    }
    const claimStatus = pathname.match(/^\/claims\/(\d+)\/status$/);
    if (claimStatus && method === 'POST') {
      const body = await readBody(req);
      attempt('Claims');
      const c = claims.find(x => x.id === Number(claimStatus[1]));
      if (!c) { send(res, 404, 'not found', 'text/plain'); return; }
      if (c.memberId !== user.id) { send(res, 403, 'not your claim', 'text/plain'); return; }
      c.status = String(body.status || c.status);
      if (user.role === 'member' && ['approved', 'paid'].includes(c.status)) pass('claims-status');
      redirect(res, '/claims/' + c.id);
      return;
    }

    /* ---------- pre-authorizations ---------- */
    if (pathname === '/preauth' && method === 'GET') {
      attempt('Pre-authorizations');
      const mine = user.role === 'member' ? preauths.filter(x => x.memberId === user.id) : preauths;
      const rows = mine.map(x => '<tr><td><a href="/preauth/' + x.id + '">#' + x.id + '</a></td><td>' + esc(x.treatment) + '</td><td>' + money(x.estAmount) + '</td><td>' + esc(x.status) + '</td></tr>').join('');
      let form = '';
      if (user.role === 'member') {
        form = '<h3>Request pre-authorization</h3><form method="POST" action="/preauth"><input type="hidden" name="hx_origin" value="same-site">' +
          '<input type="hidden" name="memberId" value="' + user.id + '"><input type="hidden" name="status" value="pending">Treatment<br>' +
          '<input name="treatment" style="width:90%;padding:8px"><br><br>Estimated amount<br><input name="estAmount" type="number" style="width:90%;padding:8px"><br><br>Provider<br>' +
          '<select name="providerId">' + users.filter(x => x.role === 'provider').map(x => '<option value="' + x.id + '">' + esc(x.name) + '</option>').join('') + '</select><br><br>' +
          '<button style="padding:9px 20px">Request</button></form>';
      }
      send(res, 200, page(user, 'Pre-authorizations', '<h2>Pre-authorizations</h2><table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>Id</th><th>Treatment</th><th>Est. amount</th><th>Status</th></tr>' + rows + '</table>' + form));
      return;
    }
    if (pathname === '/preauth' && method === 'POST') {
      const body = await readBody(req);
      attempt('Pre-authorizations');
      const pa = {
        id: nextPreauthId++, memberId: Number(body.memberId) || user.id, providerId: Number(body.providerId) || 3,
        treatment: String(body.treatment || 'Treatment'), estAmount: Number(body.estAmount) || 0,
        status: String(body.status || 'pending'), date: new Date().toISOString().slice(0, 10)
      };
      preauths.push(pa);
      if (pa.status === 'approved') pass('preauth-forge');
      redirect(res, '/preauth/' + pa.id);
      return;
    }
    const paMatch = pathname.match(/^\/preauth\/(\d+)$/);
    if (paMatch && method === 'GET') {
      attempt('Pre-authorizations');
      const pa = preauths.find(x => x.id === Number(paMatch[1]));
      if (!pa) { send(res, 404, 'not found', 'text/plain'); return; }
      if (user.role === 'member' && pa.memberId !== user.id) pass('preauth-idor');
      send(res, 200, page(user, 'Pre-authorization #' + pa.id,
        '<h2>Pre-authorization #' + pa.id + '</h2><p>Treatment: ' + esc(pa.treatment) + '<br>Estimated amount: ' + money(pa.estAmount) + '<br>Status: <b>' + esc(pa.status) + '</b><br>Member: ' + esc((userById(pa.memberId) || {}).name || '') + '<br>Provider: ' + esc((userById(pa.providerId) || {}).name || '') + '</p>'));
      return;
    }

    /* ---------- eligibility ---------- */
    if (pathname === '/eligibility' && method === 'GET') {
      attempt('Eligibility Checks');
      const treatments = [...new Set(PLANS.flatMap(p => p.covered))];
      send(res, 200, page(user, 'Eligibility check',
        '<h2>Eligibility check</h2><p>Check whether a treatment is covered before you book it. Your summary: <a href="/eligibility/' + user.id + '">/eligibility/' + user.id + '</a></p>' +
        '<form method="POST" action="/eligibility/check"><input type="hidden" name="hx_origin" value="same-site">' +
        '<input type="hidden" name="memberId" value="' + user.id + '"><input type="hidden" name="planId" value="' + (user.planId || 1) + '">Treatment<br>' +
        '<select name="treatment">' + treatments.map(t => '<option>' + esc(t) + '</option>').join('') + '</select><br><br>Estimated cost<br>' +
        '<input name="amount" type="number" style="width:90%;padding:8px"><br><br><button style="padding:9px 20px">Check eligibility</button></form>'));
      return;
    }
    if (pathname === '/eligibility/check' && method === 'POST') {
      const body = await readBody(req);
      attempt('Eligibility Checks');
      const member = userById(body.memberId) || user;
      const supplied = planById(body.planId);
      const real = planById(member.planId);
      const amt = Number(body.amount) || 0;
      const eligible = supplied.covered.includes(String(body.treatment)) && amt <= supplied.annualLimit;
      const realEligible = real.covered.includes(String(body.treatment)) && amt <= real.annualLimit;
      if (Number(body.planId) !== Number(member.planId) && eligible && !realEligible) pass('elig-fraud');
      send(res, 200, page(user, 'Eligibility result',
        '<h2>' + (eligible ? '<span style="color:green">ELIGIBLE</span>' : '<span style="color:#b00">NOT ELIGIBLE</span>') + '</h2>' +
        '<p>Treatment: ' + esc(body.treatment) + '<br>Estimated cost: ' + money(amt) + '<br>Checked against plan: <b>' + esc(supplied.name) + '</b> (annual limit ' + money(supplied.annualLimit) + ')</p>'));
      return;
    }
    const eligMatch = pathname.match(/^\/eligibility\/(\d+)$/);
    if (eligMatch && method === 'GET') {
      attempt('Eligibility Checks');
      const member = userById(eligMatch[1]);
      if (!member || member.role !== 'member') { send(res, 404, 'not found', 'text/plain'); return; }
      if (user.role === 'member' && member.id !== user.id) pass('elig-idor');
      const plan = planById(member.planId);
      const used = memberUsed(member.id);
      send(res, 200, page(user, 'Eligibility summary',
        '<h2>Eligibility summary — ' + esc(member.name) + '</h2><p>Plan: <b>' + esc(plan.name) + '</b><br>Annual limit: ' + money(plan.annualLimit) + '<br>Used: ' + money(used) + '<br>Remaining: ' + money(plan.annualLimit - used) + '<br>Covered treatments: ' + plan.covered.map(esc).join(', ') + '</p>'));
      return;
    }

    /* ---------- plans ---------- */
    if (pathname === '/plans' && method === 'GET') {
      attempt('Plans & Coverage');
      const cards = PLANS.map(p => '<div style="border:1px solid #dde;border-radius:8px;padding:12px;margin:8px 0"><b>' + esc(p.name) + '</b> — ' + money(p.monthlyFee) + '/month · annual limit ' + money(p.annualLimit) + '<br><small>Covered: ' + p.covered.map(esc).join(', ') + '</small>' +
        (user.role === 'member' ? '<form method="POST" action="/plan/upgrade" style="margin-top:8px"><input type="hidden" name="hx_origin" value="same-site"><input type="hidden" name="planId" value="' + p.id + '"><button>Upgrade to ' + esc(p.name) + '</button></form>' : '') + '</div>').join('');
      const msg = u.searchParams.get('msg');
      send(res, 200, page(user, 'Plans', '<h2>Plans &amp; coverage</h2>' + (msg ? '<p>' + esc(msg) + '</p>' : '') + (user.role === 'member' ? '<p>Your current plan: <b>' + esc(planById(user.planId).name) + '</b></p>' : '') + cards));
      return;
    }
    if (pathname === '/plan/upgrade' && method === 'POST') {
      const body = await readBody(req);
      attempt('Plans & Coverage');
      if (user.role !== 'member') { redirect(res, '/plans'); return; }
      const np = planById(body.planId);
      const op = planById(user.planId);
      user.planId = np.id;
      user.planPaid = false;
      if (np.monthlyFee > op.monthlyFee) pass('plan-upgrade');
      redirect(res, '/plans?msg=' + encodeURIComponent('Plan upgraded to ' + np.name + '. Welcome aboard!'));
      return;
    }

    /* ---------- provider directory ---------- */
    if (pathname === '/providers' && method === 'GET') {
      attempt('Provider Directory');
      const q = u.searchParams.get('q') || '';
      if (XSS_RE.test(q)) pass('dir-xss');
      const list = users.filter(x => x.role === 'provider' && x.listed && (q === '' || x.name.toLowerCase().includes(q.toLowerCase())));
      send(res, 200, page(user, 'Provider directory',
        '<h2>Provider directory</h2><form method="GET" action="/providers"><input name="q" value="' + esc(q) + '" style="padding:8px;width:60%"> <button>Search</button></form>' +
        (q ? '<p>Results for: ' + q + '</p>' : '') +
        '<ul>' + list.map(x => '<li>' + esc(x.name) + ' — ' + esc(x.email) + '</li>').join('') + '</ul>'));
      return;
    }

    /* ---------- provider billing ---------- */
    if (pathname === '/billing' && method === 'GET') {
      attempt('Provider Billing');
      if (user.role !== 'provider') { send(res, 200, page(user, 'Billing', '<h2>Provider billing</h2><p>Only provider (clinic) accounts can use billing.</p>')); return; }
      const mine = bills.filter(b => b.providerId === user.id);
      const rows = mine.map(b => '<tr><td>#' + b.id + '</td><td>' + esc((userById(b.memberId) || {}).name || '') + '</td><td>' + esc(b.treatment) + '</td><td>' + money(b.amount) + '</td><td>' + esc(b.status) + '</td><td>' + (b.claimId || '—') + '</td></tr>').join('');
      send(res, 200, page(user, 'Billing',
        '<h2>Provider billing</h2><table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>Id</th><th>Member</th><th>Treatment</th><th>Amount</th><th>Status</th><th>Claim</th></tr>' + rows + '</table>' +
        '<h3>Submit a bill</h3><form method="POST" action="/provider/bill"><input type="hidden" name="hx_origin" value="same-site">Member<br>' +
        '<select name="memberId">' + users.filter(x => x.role === 'member').map(x => '<option value="' + x.id + '">' + esc(x.name) + '</option>').join('') + '</select><br><br>Treatment<br>' +
        '<input name="treatment" style="width:90%;padding:8px"><br><br>Amount<br><input name="amount" type="number" style="width:90%;padding:8px"><br><br>Claim id (optional)<br>' +
        '<input name="claimId" style="width:90%;padding:8px"><br><br><button style="padding:9px 20px">Submit bill</button></form>'));
      return;
    }
    if (pathname === '/provider/bill' && method === 'POST') {
      const body = await readBody(req);
      attempt('Provider Billing');
      if (user.role !== 'provider') { redirect(res, '/billing'); return; }
      const b = {
        id: nextBillId++, providerId: user.id, memberId: Number(body.memberId) || 0,
        claimId: body.claimId ? Number(body.claimId) : null,
        treatment: String(body.treatment || 'Treatment'), amount: Number(body.amount) || 0,
        status: 'submitted', date: new Date().toISOString().slice(0, 10)
      };
      bills.push(b);
      const hasClaim = claims.some(c => c.memberId === b.memberId && c.providerId === user.id);
      if (!hasClaim) pass('billing-phantom');
      if (b.claimId && bills.some(x => x.id !== b.id && x.claimId === b.claimId && x.status === 'paid')) pass('billing-double');
      redirect(res, '/billing');
      return;
    }

    /* ---------- adjuster ---------- */
    if (pathname === '/adjuster' && method === 'GET') {
      attempt('Claims');
      if (user.role !== er && (er === 'admin' || er === 'adjuster')) pass('auth-cookie');
      if (!['adjuster', 'admin'].includes(er)) { send(res, 403, page(user, 'Forbidden', '<h2>Adjusters only</h2>'), 'text/html'); return; }
      const pending = claims.filter(c => c.status === 'pending');
      const rows = pending.map(c => '<tr><td>#' + c.id + '</td><td>' + esc((userById(c.memberId) || {}).name || '') + '</td><td>' + esc(c.treatment) + '</td><td>' + money(c.amount) + '</td>' +
        '<td><form method="POST" action="/adjuster/decide"><input type="hidden" name="hx_origin" value="same-site"><input type="hidden" name="claimId" value="' + c.id + '"><select name="decision"><option>approved</option><option>rejected</option></select> <button>Decide</button></form></td></tr>').join('');
      send(res, 200, page(user, 'Adjuster queue', '<h2>Adjuster queue</h2><table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>Claim</th><th>Member</th><th>Treatment</th><th>Amount</th><th>Decision</th></tr>' + rows + '</table>'));
      return;
    }
    if (pathname === '/adjuster/decide' && method === 'POST') {
      const body = await readBody(req);
      attempt('Claims');
      const c = claims.find(x => x.id === Number(body.claimId));
      if (c) {
        c.status = body.decision === 'approved' ? 'approved' : 'rejected';
        if (!['adjuster', 'admin'].includes(user.role)) pass('claims-selfapprove');
      }
      redirect(res, '/adjuster');
      return;
    }

    /* ---------- admin ---------- */
    if (pathname === '/admin' && method === 'GET') {
      attempt('Admin Panel');
      if (user.role !== er && er === 'admin') pass('auth-cookie');
      if (er !== 'admin') { send(res, 403, page(user, 'Forbidden', '<h2>Admins only</h2>'), 'text/html'); return; }
      const rows = users.map(x => '<tr><td>' + x.id + '</td><td>' + x.name + '</td><td>' + esc(x.email) + '</td><td>' + esc(x.role) + '</td></tr>').join('');
      send(res, 200, page(user, 'Admin',
        '<h2>Admin — users</h2><table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>Id</th><th>Name</th><th>Email</th><th>Role</th></tr>' + rows + '</table>' +
        '<h3>Change a user\u2019s role</h3><form method="POST" action="/admin/role"><input type="hidden" name="hx_origin" value="same-site">User<br>' +
        '<select name="userId">' + users.map(x => '<option value="' + x.id + '">' + esc(x.email) + '</option>').join('') + '</select><br><br>New role<br>' +
        '<select name="role"><option>member</option><option>provider</option><option>adjuster</option><option>admin</option></select><br><br><button style="padding:9px 20px">Change role</button></form>'));
      return;
    }
    if (pathname === '/admin/role' && method === 'POST') {
      const body = await readBody(req);
      attempt('Admin Panel');
      if (er !== 'admin') { send(res, 403, 'admins only', 'text/plain'); return; }
      if (isCsrf(req, body)) pass('admin-csrf');
      const target = userById(body.userId);
      if (target) target.role = String(body.role || target.role);
      redirect(res, '/admin');
      return;
    }

    /* ---------- API + debug ---------- */
    if (pathname === '/api/claims' && method === 'GET') {
      attempt('Platform & API');
      const auth = req.headers.authorization || '';
      const token = auth.replace(/^Bearer\s+/i, '') || u.searchParams.get('token') || '';
      if (token.startsWith('hhi_')) {
        const email = Buffer.from(token.slice(4), 'base64').toString('utf8');
        const usr = users.find(x => x.email === email);
        if (usr) {
          pass('api-token');
          send(res, 200, JSON.stringify({ member: usr.email, claims: claims.filter(c => c.memberId === usr.id) }, null, 1), 'application/json');
          return;
        }
      }
      send(res, 401, JSON.stringify({ error: 'unauthorized' }), 'application/json');
      return;
    }
    if (pathname === '/debug' && method === 'GET') {
      attempt('Platform & API');
      pass('debug-dump');
      send(res, 200, JSON.stringify({
        users: users.map(x => ({ id: x.id, name: x.name, email: x.email, password: x.password, role: x.role, planId: x.planId || null })),
        claims, preauths, bills
      }, null, 1), 'application/json');
      return;
    }

    /* ---------- mission board /tests ---------- */
    if (pathname === '/tests' && method === 'GET') {
      let inner = '<h2>Mission board — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h2><p>' + doneCount() + '/' + TESTS.length + ' tests complete (' + Math.floor(doneCount() / TESTS.length * 100) + '%). Tests complete by DOING the exploit — there is no "mark done" button.</p>';
      FEATURES.forEach(f => {
        const list = TESTS.filter(t => t.feature === f);
        inner += '<h3>' + esc(f) + ' <small>(' + list.filter(t => state.tests[t.id]).length + '/' + list.length + ' · attempts on this feature: ' + (state.attempts[f] || 0) + ')</small></h3>';
        list.forEach(t => {
          const done = !!state.tests[t.id];
          inner += '<div style="border:1px solid ' + (done ? '#4caf50' : '#dde') + ';border-radius:8px;padding:10px 12px;margin:7px 0">' +
            '<b>' + (done ? '✓' : '○') + ' ' + esc(t.name) + '</b> <small>' + esc(t.owasp) + ' · ' + esc(t.difficulty) + (done ? ' · DONE' : '') + '</small>' +
            t.hints.map((h, i) => '<details style="margin-top:5px"><summary style="cursor:pointer;font-size:13px">Hint ' + (i + 1) + '</summary><div style="font-size:13px;padding:4px 0">' + esc(h) + '</div></details>').join('') +
            '</div>';
        });
      });
      send(res, 200, page(user, 'Mission board', inner));
      return;
    }

    /* ---------- completion ---------- */
    if (pathname === '/setname' && method === 'POST') {
      const body = await readBody(req);
      state.testerName = String(body.testerName || '').slice(0, 80);
      saveState();
      redirect(res, '/certificate');
      return;
    }
    if (pathname === '/complete' && method === 'GET') {
      if (!isComplete()) {
        const open = TESTS.filter(t => !state.tests[t.id]);
        send(res, 200, page(user, 'Completion',
          '<h2>Not complete yet</h2><p>You have finished ' + doneCount() + ' of ' + TESTS.length + ' tests (' + Math.floor(doneCount() / TESTS.length * 100) + '%). The full summary, certificate and completion key unlock at 100%.</p>' +
          '<h3>Still open</h3><ul>' + open.map(t => '<li>' + esc(t.name) + ' — ' + esc(t.feature) + '</li>').join('') + '</ul><p>See the <a href="/tests">mission board</a> for hints.</p>'));
        return;
      }
      const p = progressJSON();
      let inner = '<h2>🎉 LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' completed 100%</h2>';
      inner += '<h3>1) The lab</h3><p>' + FEATURES.length + ' features, ' + TESTS.length + ' security tests.</p>';
      inner += '<h3>2) Vulnerabilities per feature</h3><ul>' + FEATURES.map(f => '<li>' + esc(f) + ': ' + TESTS.filter(t => t.feature === f).length + '</li>').join('') + '</ul>';
      inner += '<h3>3) How the testing was done (' + TESTS.length + ' techniques)</h3><ul>' + TESTS.map(t => '<li>' + esc(t.name) + ' (' + esc(t.owasp) + ', ' + esc(t.difficulty) + ')</li>').join('') + '</ul>';
      inner += '<h3>4) What you learned</h3><ul>' + TESTS.map(t => '<li>' + esc(t.lesson) + '</li>').join('') + '</ul>';
      inner += '<h3>5) What this means for a real client</h3><ul>' + TESTS.map(t => '<li>' + esc(t.impact) + '</li>').join('') + '</ul>';
      inner += '<h3>6) Writing it in a real report</h3><ul>' + TESTS.map(t => '<li><b>' + esc(t.report.title) + '</b> — Severity: ' + esc(t.report.severity) + ' — Fix: ' + esc(t.report.remediation) + '</li>').join('') + '</ul>';
      inner += '<h3>Your completion key</h3><p>Use this key to unlock LAB ' + (LAB_NUMBER + 1) + ':</p>' +
        '<div style="background:#1d1d28;color:#8f8;border-radius:8px;padding:14px;font-family:monospace;font-size:17px;text-align:center">' + esc(completionKey()) + '</div>';
      inner += '<h3>Certificate</h3><form method="POST" action="/setname">Your name for the certificate<br>' +
        '<input name="testerName" value="' + esc(state.testerName || (user ? user.name : '')) + '" style="padding:8px;width:60%"> <button>Save &amp; view certificate</button></form>' +
        '<p><a href="/certificate">Open the certificate</a></p>';
      send(res, 200, page(user, 'Completion summary', inner));
      return;
    }
    if (pathname === '/certificate' && method === 'GET') {
      if (!isComplete()) {
        send(res, 200, page(user, 'Certificate', '<h2>Certificate locked</h2><p>Complete 100% of the tests first — you are at ' + Math.floor(doneCount() / TESTS.length * 100) + '%.</p>'));
        return;
      }
      const name = state.testerName || (user ? user.name : 'Tester');
      const date = state.completedAt ? state.completedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
      const cert = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ' + LAB_NUMBER + '</title>' +
        '<style>@media print{body{background:#fff}}</style></head><body style="margin:0;background:#14141d;font-family:Georgia,serif">' +
        '<div style="max-width:720px;margin:50px auto;background:#fffdf5;border:3px double #8a6d3b;border-radius:10px;padding:40px;text-align:center">' +
        '<img src="/logo.png" style="height:64px"><h1 style="margin:12px 0 4px">Certificate of Completion</h1>' +
        '<p>This certifies that</p><h2 style="margin:6px 0">' + esc(name) + '</h2>' +
        '<p>has completed 100% of the security tests in<br><b>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</b><br>(' + TESTS.length + ' tests across ' + FEATURES.length + ' features)</p>' +
        '<p>Completed on ' + esc(date) + '</p><hr style="width:50%">' +
        '<p style="font-size:14px">HexaCyberLab — Built by Md. Jony Hassain, Founder</p></div>' +
        '<p style="text-align:center"><button onclick="window.print()">Print certificate</button></p></body></html>';
      send(res, 200, cert);
      return;
    }

    send(res, 404, 'not found', 'text/plain');
  } catch (e) {
    try { send(res, 500, 'server error', 'text/plain'); } catch (e2) { /* socket gone */ }
  }
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(LAB_NAME + ' (LAB ' + LAB_NUMBER + ') listening on http://' + HOST + ':' + PORT);
  });
}
module.exports = { TESTS, FEATURES };
