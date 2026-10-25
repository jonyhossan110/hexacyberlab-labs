'use strict';
/*
 * HexaSkill — LAB 58 of the HexaCyberLab 110-lab programme (Category 6: Education & E-learning).
 * A deliberately vulnerable skills-training platform for authorised, local-only security practice.
 * Zero-dependency Node.js. Binds 127.0.0.1:3067 only. All data is fake seed data.
 *
 * Lab system: entry-key gate, /tests mission board with graded hints, Lab Coach chatbot
 * (3-try help lock), progress.json persistence, /complete debrief, /certificate.
 * Keys are embedded ONLY as base64-of-reversed shards scattered through this file and
 * assembled at runtime; they never appear as plain literals anywhere.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3067;
const HOST = '127.0.0.1';
const LAB_NUMBER = 58;
const LAB_NAME = 'HexaSkill';
const PREV_LAB = 57;

/* ------------------------------------------------------------------ *
 * Key shards — region 1 of 2 (entry key pieces live here; the        *
 * completion key pieces live in a separate region near the bottom).  *
 * Each shard is base64( reverse( piece ) ). The assembler reverses.  *
 * ------------------------------------------------------------------ */
/* entry shards removed — entry key is verified by hash only */
const COMPLETION_SHARDS = ["TC1YSA==","UC05NQ==","MFNQWg==","LUwyVw==","NTcxOA==","VkpZOA=="];

function assembleKey(shards) {
  return shards.map(function (s) {
    return Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('');
  }).join('');
}
/* The entry key is assembled only inside /unlock verification. */
const ENTRY_KEY_SHA256 = 'c1021cde069fe904cecfacb0f8defb175c724d7f3c901b787acda661377c4d05';
function entryKeyMatches(candidate) {
  if (typeof candidate !== 'string') return false;
  const c = require('node:crypto');
  const h = c.createHash('sha256').update(candidate).digest('hex');
  try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; }
}
/* The completion key is assembled only at 100% (debrief / certificate / coach). */
function completionKey() { return assembleKey(COMPLETION_SHARDS); }

/* ================================================================== *
 * TESTS registry — the heart of the lab system. Docs are generated   *
 * from this array so counts can never drift.                         *
 * ================================================================== */
const TESTS = [
  /* ---------------- Login & Authentication ---------------- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL injection login bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login form builds its account lookup by gluing your input into a query string.', "Try a classic tautology in the email field, e.g. something with ' OR '1'='1 in it.", "Submit email: ' OR '1'='1 and any password — the string-built query matches the first account (the admin)."],
    lesson: 'String-built queries let attacker input change the meaning of the query itself; parameterised queries make input data-only.',
    impact: 'On a client training platform this means anyone can sign in as the administrator without a password — every learner record, badge and team report is exposed.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute force — no rate limit or lockout', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Pick one real account and keep guessing its password.', 'Notice the login never slows down, CAPTCHAs you, or locks the account.', 'Send 10 or more wrong passwords for alice@hexaskill.local — the 10th failure is still processed normally.'],
    lesson: 'Without throttling, online password guessing is free and unlimited; rate limits and lockouts raise the cost to impractical levels.',
    impact: 'Attackers can grind through password lists against client accounts at full speed until one works — weak passwords fall in minutes.',
    report: { title: 'Missing Rate Limiting on Login Allows Unlimited Password Guessing', severity: 'High', remediation: 'Add progressive delays, per-account and per-IP throttling, lockout and alerting on repeated failures.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User enumeration via differing error messages', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the login error for an email that does not exist with the error for a real email with a wrong password.', 'The two failures say different things — one confirms the account exists.', 'Try nobody@hexaskill.local (says: no account) then alice@hexaskill.local with a wrong password (says: incorrect password). You have confirmed a real user.'],
    lesson: 'Authentication endpoints must answer identically whether or not the account exists, or they become a free directory of valid users.',
    impact: 'Attackers first harvest the list of real client accounts, then focus password attacks only where they will pay off.',
    report: { title: 'Login and Password-Reset Responses Reveal Whether an Account Exists', severity: 'Medium', remediation: 'Return one generic message ("invalid credentials" / "if an account exists…") for every failure case.' } },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Published demo account with default credentials', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Read the login page itself — it advertises a way in.', 'A demo account is published right on the sign-in form.', 'Sign in with the demo credentials shown on the login page (demo@hexaskill.local).'],
    lesson: 'Demo/default accounts shipped to production are standing invitations; if they exist they need unique strong passwords and expiry.',
    impact: 'Anyone on the internet can walk into the client platform with the printed demo login and explore from inside a real account.',
    report: { title: 'Publicly Documented Demo Account With Default Password Left Active', severity: 'High', remediation: 'Remove demo accounts from production or force unique credentials and automatic expiry.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable password-reset token', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a password reset and study the token format in the reset link.', 'The token is built from something public about the account — its numeric id.', 'Token = HXSK<id>-<base36(id*131+17)>. Compute it for carol (id 5) and reset her password without ever requesting a reset.'],
    lesson: 'Reset tokens must be long, random and single-use; anything derivable from public data is equivalent to no token at all.',
    impact: 'An attacker who knows a victim email and id can take over the account in seconds — no inbox access needed.',
    report: { title: 'Password Reset Tokens Are Predictable From the User ID', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), store hashed, expire quickly and invalidate after use.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Session role cookie trusted by the server', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After logging in, inspect the cookies the app sets — one of them describes your role.', 'The server believes that cookie instead of checking the account record.', 'Set the hx_role cookie to admin and visit /admin as a plain learner.'],
    lesson: 'Authorisation data must live server-side; anything the client can edit — cookies included — is attacker-controlled.',
    impact: 'Every learner can promote themselves to administrator by editing a cookie, unlocking user exports and platform settings.',
    report: { title: 'Role Stored in a Client-Controlled Cookie Enables Privilege Escalation', severity: 'Critical', remediation: 'Keep roles in the server-side session/record only; ignore any role claims arriving from the client.' } },

  /* ---------------- Registration & Profile ---------------- */
  { id: 'reg-weakpass', feature: 'Registration & Profile', name: 'Weak password policy on registration', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a new account and shrink the password.', 'There is no minimum length or complexity check at all.', 'Register with the single-character password "x" — the account is created.'],
    lesson: 'A password policy is the floor under every account; without one, users pick passwords that fall to the first guessing attempt.',
    impact: 'Client learners end up with one-character passwords, so a single leaked or guessed credential hands over their training records and badges.',
    report: { title: 'Registration Accepts Trivially Weak Passwords', severity: 'Medium', remediation: 'Enforce a minimum length (≥10) and block common/breached passwords at registration and password change.' } },
  { id: 'reg-massassign', feature: 'Registration & Profile', name: 'Mass assignment — role set at registration', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The register form only shows name, email and password — but the server binds more fields than it shows.', 'Add a field the form never offered and see if the account record keeps it.', 'POST /register with an extra field role=assessor (or admin) — your new account really holds that role.'],
    lesson: 'Servers must whitelist bindable fields per endpoint; binding the whole request body lets clients write privileged fields.',
    impact: 'Anyone can self-register as an assessor or admin, grade their own work and award badges — the platform integrity is gone.',
    report: { title: 'Mass Assignment in Registration Allows Self-Assignment of Privileged Roles', severity: 'High', remediation: 'Whitelist exactly the fields each endpoint may set; assign roles only through privileged server-side flows.' } },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in display name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is shown back on team and admin pages.', 'Names are rendered without escaping — markup survives.', 'Register or rename yourself to <script>alert(1)</script> and view a team report or the admin user list.'],
    lesson: 'Every user-controlled string must be output-encoded at render time; stored payloads fire in other users browsers, including admins.',
    impact: 'An attacker plants a script in their profile name; when a client admin opens the user list, the script runs with the admin session.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-encode all user data on output and add a Content-Security-Policy as defence in depth.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on profile update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Profile changes are a plain POST with no anti-CSRF token.', 'The app never checks where the request came from.', 'While logged in, POST /profile/update with an Origin header of https://evil.example — the change is accepted.'],
    lesson: 'State-changing requests need an unguessable token (or strict same-site checks); cookies alone will ride along on forged requests.',
    impact: 'A malicious page a learner visits can silently rewrite their profile — and the same pattern on admin actions deletes users.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require per-session CSRF tokens on all state-changing forms and verify Origin/Referer as backup.' } },

  /* ---------------- Skill Paths ---------------- */
  { id: 'path-order', feature: 'Skill Paths', name: 'Path order not enforced — final module first', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Paths present modules in order — but does the completion endpoint check?', 'Try completing a later module directly, before touching the earlier ones.', 'As a fresh learner, POST /module/4/complete (the final module of Path 1) — it is marked complete immediately.'],
    lesson: 'Workflow order is a business rule and must be enforced server-side on every transition, not just suggested by the UI.',
    impact: 'Learners skip straight to the final module and earn certificates for training they never did — the credential the client sells becomes worthless.',
    report: { title: 'Module Completion Endpoint Does Not Enforce Path Order', severity: 'Medium', remediation: 'On completion, verify all prerequisite modules are complete for that learner on the server before recording progress.' } },
  { id: 'path-idor', feature: 'Skill Paths', name: 'IDOR — any learner progress record readable', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The progress API takes a user id in the URL.', 'It never checks the id belongs to you.', 'GET /api/users/3/progress while signed in as someone else — full module progress comes back.'],
    lesson: 'Every object access must check ownership server-side; hiding a link is not authorisation.',
    impact: 'Competitors and other learners can pull the training progress of every employee at a client company — a privacy and commercial leak.',
    report: { title: 'Insecure Direct Object Reference Exposes Other Learners Progress', severity: 'Medium', remediation: 'Authorise each record access against the session user (or a legitimate assessor/team-lead relationship).' } },
  { id: 'path-premium', feature: 'Skill Paths', name: 'Premium path content served without entitlement', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Path 2 is sold as premium. The paywall may only exist in the marketing copy.', 'Open a premium module page directly as a free account.', 'GET /module/5 as a learner with no premium entitlement — the full premium content is served.'],
    lesson: 'Entitlement checks belong on the server for every protected resource; a hidden link or greyed-out menu is not a paywall.',
    impact: 'The client paid course library is free to anyone with a free account — direct revenue loss.',
    report: { title: 'Missing Entitlement Check Serves Premium Course Content to Free Accounts', severity: 'High', remediation: 'Check the account entitlement server-side before serving any premium module content.' } },

  /* ---------------- Assessments ---------------- */
  { id: 'assess-forge', feature: 'Assessments', name: 'Assessment score trusted from the client', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Submit an assessment and watch what fields the server accepts.', 'The grader computes a score — unless you hand it one.', 'POST /assess/1 with deliberately wrong answers plus an extra field score=100 — the stored score is 100.'],
    lesson: 'Scores, prices and totals must always be computed server-side from trusted data; a client-supplied result is a claim, not a fact.',
    impact: 'Learners award themselves perfect scores, so client certificates stop meaning anything and honest learners are devalued.',
    report: { title: 'Server Trusts Client-Supplied Assessment Score', severity: 'High', remediation: 'Ignore any score in the request; compute results only from server-held answers.' } },
  { id: 'assess-grade', feature: 'Assessments', name: 'Learner can change grades via the assessor endpoint', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Assessors adjust grades through POST /assess/grade. Who is allowed to call it?', 'The endpoint forgets to ask.', 'As a plain learner, POST /assess/grade with a submission id and a new score — the grade changes.'],
    lesson: 'Role checks must be enforced on the endpoint itself, for every request — not assumed from which UI linked to it.',
    impact: 'Any learner can rewrite any grade in the system, including other learners results — total loss of assessment integrity.',
    report: { title: 'Grade-Modification Endpoint Missing Role Authorisation', severity: 'High', remediation: 'Require an assessor/admin role server-side on grading endpoints and log every grade change.' } },
  { id: 'assess-leak', feature: 'Assessments', name: 'Assessment answer key exposed via API', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['APIs built for the assessor UI sometimes ship more than the UI shows.', 'Look for an answers endpoint under /api/assess/.', 'GET /api/assess/1/answers as any learner — the full correct-answer key is returned.'],
    lesson: 'Never send answer keys, solutions or grading data to the client; anything delivered can be read.',
    impact: 'The whole cohort shares the leaked answer key — every assessment on the client platform becomes a formality.',
    report: { title: 'API Endpoint Discloses Assessment Answer Keys to Learners', severity: 'High', remediation: 'Remove answer data from learner-facing APIs; serve answers only to authorised assessor tooling after submission closes.' } },

  /* ---------------- Badges ---------------- */
  { id: 'badge-selfaward', feature: 'Badges', name: 'Badge self-award without completing the path', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Badges are supposed to be minted when a path is finished. Is there another door?', 'The award endpoint trusts the request, not the progress record.', 'As a learner who completed nothing, POST /badges/award with pathId=1 — a badge is minted for you.'],
    lesson: 'Reward/credential issuance must be driven by verified server-side state, never by a direct client request.',
    impact: 'Anyone can mint themselves the client completion badge and present it to employers — the credential brand is destroyed.',
    report: { title: 'Badge Award Endpoint Does Not Verify Path Completion', severity: 'High', remediation: 'Issue badges only from the completion flow after server-side verification of all module progress.' } },
  { id: 'badge-forge', feature: 'Badges', name: 'Badge verification page trusts a client-supplied name', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Employers check badges on the public /verify page.', 'The page lets the URL restyle who the badge belongs to.', 'Open /verify/<a real badge code>?name=Anyone You Like — the page certifies that name instead of the real owner.'],
    lesson: 'Verification pages must render only server-held facts; every displayed field taken from the request makes the proof forgeable.',
    impact: 'Anyone can show an employer a verification page naming themselves for a badge they never earned — the client verification system lies on demand.',
    report: { title: 'Badge Verification Page Renders Attacker-Controlled Holder Name', severity: 'High', remediation: 'Render the holder name exclusively from the badge record; ignore name parameters in the request.' } },
  { id: 'badge-delete', feature: 'Badges', name: 'Any user can delete another user badge', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Badge deletion checks that you are signed in — and nothing else.', 'Ownership is never compared.', 'POST /badges/<id>/delete for a badge that belongs to someone else — it is gone.'],
    lesson: 'Destructive actions need ownership (or admin) checks on the server for every single request.',
    impact: 'A malicious learner can wipe competitors earned badges, and the client has no audit trail to restore them.',
    report: { title: 'Missing Ownership Check Allows Deleting Other Users Badges', severity: 'Medium', remediation: 'Authorise deletion to the badge owner or an admin, and keep an audit log of destructive actions.' } },

  /* ---------------- Portfolios ---------------- */
  { id: 'portfolio-idor', feature: 'Portfolios', name: 'Private portfolio readable by IDOR', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Portfolios have a private setting. Settings only work if the server enforces them.', "Bob's portfolio is private — try reading it as Alice.", 'GET /portfolio/4 while signed in as Alice — Bob private portfolio is served in full.'],
    lesson: 'Privacy flags are access-control decisions and must be enforced on every read, not just used to hide links.',
    impact: 'Learners private project work, notes and personal details leak to every other account on the client platform.',
    report: { title: 'Private Portfolios Served Without an Ownership Check', severity: 'Medium', remediation: 'Enforce the private flag server-side: owner, assessors and team leads only.' } },
  { id: 'portfolio-upload', feature: 'Portfolios', name: 'Unrestricted upload — HTML file served from the app origin', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Portfolio projects accept file uploads of any kind.', 'What Content-Type does the file come back with?', 'Upload a file named evil.html containing a <script> payload, then open /files/evil.html — it is served as text/html from the app origin.'],
    lesson: 'Uploads need type allowlists, safe storage and non-executable serving; an HTML file served from your origin is stored XSS with your brand on it.',
    impact: 'Attackers host phishing and script payloads on the client own domain, abusing its reputation and user sessions.',
    report: { title: 'Unrestricted File Upload Allows Hosting HTML/Script Content on the Application Origin', severity: 'High', remediation: 'Allowlist safe file types, store uploads outside the web root, serve with safe Content-Type and Content-Disposition.' } },

  /* ---------------- Teams ---------------- */
  { id: 'team-admin', feature: 'Teams', name: 'Plain team member performs team-lead actions', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Teams have leads and members. The remove-member action is meant for leads.', 'The endpoint only checks that you are in the team.', 'As Bob (a plain member of Team 1), POST /team/1/remove with the lead user id — the lead is removed.'],
    lesson: 'Roles inside a group are still authorisation boundaries; membership is not management.',
    impact: 'Any employee in a client company team can remove the team lead and sabotage the company training programme.',
    report: { title: 'Team Member Role Not Enforced on Member-Removal Action', severity: 'Medium', remediation: 'Require the team-lead role server-side for management actions within a team.' } },
  { id: 'team-roster', feature: 'Teams', name: 'Other company team report readable (IDOR)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Team reports summarise every member progress.', 'The report URL takes a team id — try a team you do not belong to.', 'GET /team/2/report as Alice (Team 1) — Globex full training report is served.'],
    lesson: 'Tenant boundaries must be checked on every request; predictable ids make cross-company leaks one guess away.',
    impact: 'One client company can read another company employee training performance — a serious B2B confidentiality breach.',
    report: { title: 'Cross-Tenant Access to Other Companies Team Progress Reports', severity: 'High', remediation: 'Scope every team query to teams the requester belongs to (or administers), server-side.' } },

  /* ---------------- Admin Panel ---------------- */
  { id: 'admin-export', feature: 'Admin Panel', name: 'Admin learner export open to any signed-in user', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The admin console has a CSV export of every learner.', 'The export endpoint lives under /admin/ — but does it check the role itself?', 'As a plain learner, GET /admin/export — the full learner list downloads.'],
    lesson: 'Every privileged endpoint must verify the role itself; being linked only from an admin page is not protection.',
    impact: 'Any learner can download the client entire user base — emails and roles — for phishing or resale.',
    report: { title: 'Administrative Data Export Accessible to Non-Admin Users', severity: 'High', remediation: 'Enforce admin role checks inside the export endpoint and audit all data exports.' } },

  /* ---------------- Platform & API ---------------- */
  { id: 'plat-debug', feature: 'Platform & API', name: 'Debug endpoint dumps all accounts and passwords', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Development helpers have a habit of surviving into production.', 'Try /api/debug with no login at all.', 'GET /api/debug — every account, including plaintext passwords, is returned.'],
    lesson: 'Debug/diagnostic endpoints must never ship to production; one leftover route can hand over the entire credential store.',
    impact: 'Full account takeover of every learner, assessor and admin — the worst single finding a client platform can have.',
    report: { title: 'Unauthenticated Debug Endpoint Exposes All User Credentials', severity: 'Critical', remediation: 'Remove debug endpoints from production builds and scan deployments for diagnostic routes.' } },
  { id: 'plat-apitoken', feature: 'Platform & API', name: 'API token is a predictable function of the email', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['The API accepts a Bearer token instead of a session.', 'Tokens are derived from something public about the account.', "Forge the token for alice@hexaskill.local: 'sk_' + base64(email), then GET /api/me with no session cookie."],
    lesson: 'API tokens must be random secrets issued server-side; a token anyone can compute from an email is not authentication.',
    impact: 'Anyone who knows a user email — public information — gets full API access to that account.',
    report: { title: 'Predictable API Tokens Derived From User Email Addresses', severity: 'High', remediation: 'Issue random, revocable API tokens server-side and store them hashed.' } }
];

/* ================================================================== *
 * Progress engine + persistence (§4)                                 *
 * ================================================================== */
const PROGRESS_FILE = path.join(__dirname, 'progress.json');
const state = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
try {
  if (fs.existsSync(PROGRESS_FILE)) {
    const loaded = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    Object.assign(state, loaded);
  }
} catch (e) { /* corrupted state file -> start fresh, never crash */ }

function saveState() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2)); } catch (e) {}
}
function totalTests() { return TESTS.length; }
function doneCount() { return TESTS.filter(function (t) { return state.tests[t.id]; }).length; }
function pct() { const t = totalTests(); return t === 0 ? 0 : Math.floor((doneCount() / t) * 100); }
function isComplete() { return doneCount() >= totalTests(); }
function pass(id) {
  if (state.tests[id]) return;
  state.tests[id] = true;
  if (isComplete()) {
    if (!state.completedAt) state.completedAt = new Date().toISOString();
    state.keyRevealed = true;
  }
  saveState();
}
function attempt(feature) {
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  saveState();
}
function featureList() {
  const out = [];
  TESTS.forEach(function (t) { if (out.indexOf(t.feature) === -1) out.push(t.feature); });
  return out;
}
function featureStats(feature) {
  const tests = TESTS.filter(function (t) { return t.feature === feature; });
  return {
    total: tests.length,
    done: tests.filter(function (t) { return state.tests[t.id]; }).length,
    attempts: state.attempts[feature] || 0
  };
}

/* ================================================================== *
 * Seed data — a complete skills-training platform (all fake).         *
 * ================================================================== */
let nextUserId = 7;
const users = [
  { id: 1, email: 'admin@hexaskill.local', password: 'admin123', name: 'Priya Admin', role: 'admin', teamId: 0 },
  { id: 2, email: 'sara@hexaskill.local', password: 'sara123', name: 'Sara Assessor', role: 'assessor', teamId: 0 },
  { id: 3, email: 'alice@hexaskill.local', password: 'alice123', name: 'Alice Learner', role: 'learner', teamId: 1 },
  { id: 4, email: 'bob@hexaskill.local', password: 'bob123', name: 'Bob Learner', role: 'learner', teamId: 1 },
  { id: 5, email: 'carol@hexaskill.local', password: 'carol123', name: 'Carol Learner', role: 'learner', teamId: 2 },
  { id: 6, email: 'demo@hexaskill.local', password: 'demo123', name: 'Demo Learner', role: 'learner', teamId: 0 }
];
const pathsData = [
  { id: 1, name: 'Web Security Foundations', premium: false, modules: [1, 2, 3, 4] },
  { id: 2, name: 'Cloud Security Pro', premium: true, modules: [5, 6, 7] }
];
const modulesData = {
  1: { id: 1, pathId: 1, order: 0, title: 'Security Mindset', body: 'Why security is a habit, not a tool: assets, attackers and the cost of small mistakes.' },
  2: { id: 2, pathId: 1, order: 1, title: 'Passwords & Authentication', body: 'Passphrases, MFA, password managers and how credential stuffing works.' },
  3: { id: 3, pathId: 1, order: 2, title: 'Phishing & Safe Browsing', body: 'Spotting fake login pages, checking links and reporting suspicious mail.' },
  4: { id: 4, pathId: 1, order: 3, title: 'Final: Secure Your First Website', body: 'Capstone: updates, backups, HTTPS and an access review for a small site.' },
  5: { id: 5, pathId: 2, order: 0, title: 'Cloud Accounts & IAM', body: 'PREMIUM: least-privilege IAM, root account hygiene and access keys.' },
  6: { id: 6, pathId: 2, order: 1, title: 'Storage & Secrets', body: 'PREMIUM: public buckets, leaked keys and secrets management.' },
  7: { id: 7, pathId: 2, order: 2, title: 'Final: Cloud Hardening Review', body: 'PREMIUM capstone: a full hardening checklist review of a cloud account.' }
};
const quizzes = {
  1: [ { q: 'What is the best defence against phishing?', options: ['A bigger inbox', 'Checking links and sender before acting', 'Replying to ask if it is real'], answer: 1 },
       { q: 'A strong password is…', options: ['Your birthday', 'Short and simple', 'Long, unique and random'], answer: 2 } ],
  2: [ { q: 'What does MFA add?', options: ['A second proof of identity', 'A faster login', 'A longer password'], answer: 0 },
       { q: 'Credential stuffing works because people…', options: ['Use MFA', 'Reuse passwords', 'Use managers'], answer: 1 } ],
  3: [ { q: 'A login page link arrives by email. You should…', options: ['Click and log in fast', 'Navigate to the site yourself', 'Forward it to everyone'], answer: 1 },
       { q: 'A padlock icon in the browser means…', options: ['The site is trustworthy', 'The connection is encrypted', 'The site is government-run'], answer: 1 } ],
  4: [ { q: 'First step to secure a small website?', options: ['Buy ads', 'Apply updates and backups', 'Change the logo'], answer: 1 },
       { q: 'HTTPS protects…', options: ['Data in transit', 'The server hard disk colour', 'Search rankings only'], answer: 0 } ],
  5: [ { q: 'Root cloud accounts should…', options: ['Be used daily', 'Be locked down with MFA and rarely used', 'Be shared with the team'], answer: 1 },
       { q: 'Least privilege means…', options: ['Everyone is admin', 'Only the access each job needs', 'No access at all'], answer: 1 } ],
  6: [ { q: 'An API key committed to a public repo is…', options: ['Fine if old', 'Compromised — rotate it', 'A backup'], answer: 1 },
       { q: 'Public storage buckets are risky because…', options: ['They cost more', 'Anyone can read the files', 'They are slower'], answer: 1 } ],
  7: [ { q: 'A hardening review starts with…', options: ['An inventory of accounts and access', 'New wallpaper', 'Deleting logs'], answer: 0 },
       { q: 'Unused access keys should be…', options: ['Kept forever', 'Rotated and removed', 'Shared'], answer: 1 } ]
};
const progressByUser = { 3: [1], 4: [], 5: [] }; // alice finished module 1; bob & carol nothing yet
let nextSubmissionId = 1;
const submissions = []; // {id, userId, moduleId, score, gradedBy}
let nextBadgeId = 1;
const badges = []; // {id, code, userId, pathId}
const portfolios = {
  3: { bio: 'Alice — junior web developer. I build small business sites and I am learning to secure them.', isPrivate: false, projects: [ { title: 'Bakery website rebuild', file: 'alice-notes.txt' } ] },
  4: { bio: 'Bob — PRIVATE portfolio. Draft client list and unpublished project notes.', isPrivate: true, projects: [ { title: 'Unreleased client project', file: 'bob-secret.txt' } ] },
  5: { bio: 'Carol — support engineer moving into cloud operations.', isPrivate: false, projects: [] }
};
const fileStore = {
  'alice-notes.txt': 'Alice project notes: bakery site rebuild — scope, timeline, lessons.',
  'bob-secret.txt': 'Bob PRIVATE draft: unreleased client project notes. Not for sharing.'
};
const teams = [
  { id: 1, name: 'Acme Corp', members: { 3: 'lead', 4: 'member' } },
  { id: 2, name: 'Globex Ltd', members: { 5: 'lead' } }
];
const sessions = new Map(); // sid -> userId
const issuedResetTokens = new Set();
const failCounts = new Map(); // email|ip -> n
const enumProbes = new Map(); // ip -> {nf, wp}

/* ================================================================== *
 * Helpers                                                            *
 * ================================================================== */
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const XSS_PATTERN = /<script|<svg|onerror\s*=|onload\s*=|<img[^>]*onerror|<iframe|<body[^>]*onload/i;
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  raw.split(';').forEach(function (part) {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}
function readBody(req) {
  return new Promise(function (resolve) {
    let data = '';
    req.on('data', function (c) { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', function () { resolve(data); });
    req.on('error', function () { resolve(''); });
  });
}
function parseBody(req, raw) {
  const ct = (req.headers['content-type'] || '').toLowerCase();
  if (ct.indexOf('application/json') !== -1) {
    try { return JSON.parse(raw || '{}'); } catch (e) { return {}; }
  }
  const out = {};
  new URLSearchParams(raw).forEach(function (v, k) { out[k] = v; });
  return out;
}
function currentUser(req) {
  const cookies = parseCookies(req);
  const sid = cookies.hx_session;
  if (sid && sessions.has(sid)) {
    const u = users.find(function (x) { return x.id === sessions.get(sid); });
    if (u) return u;
  }
  return null;
}
/* VULN (by design): the app trusts a client-supplied hx_role cookie over the account record. */
function effectiveRole(req, user) {
  const cookies = parseCookies(req);
  return cookies.hx_role || (user ? user.role : 'learner');
}
function roleRank(r) { return r === 'admin' ? 3 : r === 'assessor' ? 2 : 1; }
function resetTokenFor(user) {
  return 'HXSK' + user.id + '-' + ((user.id * 131 + 17).toString(36)).toUpperCase();
}
function apiTokenFor(user) { return 'sk_' + Buffer.from(user.email, 'utf8').toString('base64'); }
function badgeFor(userId, pathId) { return badges.find(function (b) { return b.userId === userId && b.pathId === pathId; }); }
function awardBadge(userId, pathId) {
  if (badgeFor(userId, pathId)) return badgeFor(userId, pathId);
  const b = { id: nextBadgeId, code: 'HSB-' + nextBadgeId + '-' + (1000 + nextBadgeId * 37), userId: userId, pathId: pathId };
  nextBadgeId++;
  badges.push(b);
  return b;
}
function pathComplete(userId, pathId) {
  const p = pathsData.find(function (x) { return x.id === pathId; });
  const done = progressByUser[userId] || [];
  return p.modules.every(function (m) { return done.indexOf(m) !== -1; });
}
function send(res, status, body, headers) {
  const h = { 'Content-Type': 'text/html; charset=utf-8' };
  if (headers) Object.keys(headers).forEach(function (k) { h[k] = headers[k]; });
  res.writeHead(status, h);
  res.end(body);
}
function redirect(res, to, extraHeaders) {
  const h = { Location: to };
  if (extraHeaders) Object.keys(extraHeaders).forEach(function (k) { h[k] = extraHeaders[k]; });
  res.writeHead(302, h);
  res.end();
}
function progressHeader() {
  const d = doneCount(), t = totalTests(), p = pct();
  return '<div style="background:#1b1b28;color:#eee;padding:10px 16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">' +
    '<img src="/logo.png" style="height:34px" alt="HexaCyberLab">' +
    '<strong>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</strong>' +
    '<span>LAB ' + LAB_NUMBER + ' · ' + d + '/' + t + ' tests · ' + p + '%</span>' +
    '<span style="flex:1;min-width:120px;background:#333;border-radius:6px;height:10px;overflow:hidden"><span style="display:block;height:100%;width:' + p + '%;background:#7c5cff"></span></span>' +
    '</div>';
}
function chatWidget() {
  return '<div id="hxchat" style="position:fixed;right:14px;bottom:14px;width:320px;max-width:92vw;background:#fff;border:1px solid #ccd;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.25);font-family:Arial,sans-serif;z-index:50">' +
    '<div style="background:#1b1b28;color:#fff;padding:9px 12px;border-radius:12px 12px 0 0"><strong>Lab Coach</strong> <span style="font-size:12px;opacity:.75">— ask me about the tests</span></div>' +
    '<div id="hxchatlog" style="height:190px;overflow:auto;padding:10px;font-size:13px;line-height:1.45"></div>' +
    '<form id="hxchatform" style="display:flex;border-top:1px solid #eee"><input id="hxchatinput" autocomplete="off" placeholder="Ask the coach…" style="flex:1;border:0;padding:10px;font-size:13px"><button style="background:#7c5cff;color:#fff;border:0;padding:0 14px;cursor:pointer">Send</button></form>' +
    '</div>' +
    '<script>(function(){var log=document.getElementById("hxchatlog"),form=document.getElementById("hxchatform"),input=document.getElementById("hxchatinput");' +
    'function add(who,text){var d=document.createElement("div");d.style.margin="6px 0";d.innerHTML="<strong>"+who+":</strong> ";d.appendChild(document.createTextNode(text));log.appendChild(d);log.scrollTop=log.scrollHeight;}' +
    'add("Coach","Hi! I am the Lab Coach for LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '. Ask me how many tests a feature has, or how to solve one — but I only coach a feature after you have genuinely tried it at least 3 times.");' +
    'form.addEventListener("submit",function(e){e.preventDefault();var m=input.value.trim();if(!m)return;input.value="";add("You",m);' +
    'fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:m})}).then(function(r){return r.json();}).then(function(j){add("Coach",j.reply||"…");}).catch(function(){add("Coach","Something went wrong — try again.");});});})();</script>';
}
function page(req, title, inner) {
  const user = currentUser(req);
  const nav = user
    ? '<nav style="background:#23232f;padding:8px 16px;display:flex;gap:14px;flex-wrap:wrap;font-size:14px">' +
      '<a style="color:#cfcfff" href="/">Dashboard</a><a style="color:#cfcfff" href="/paths">Skill Paths</a>' +
      '<a style="color:#cfcfff" href="/tests">Tests</a><a style="color:#cfcfff" href="/badges">Badges</a>' +
      '<a style="color:#cfcfff" href="/portfolio/' + user.id + '">My Portfolio</a><a style="color:#cfcfff" href="/teams">Teams</a>' +
      '<a style="color:#cfcfff" href="/admin">Admin</a><a style="color:#cfcfff" href="/complete">Debrief</a>' +
      '<a style="color:#cfcfff" href="/certificate">Certificate</a>' +
      '<span style="color:#999;margin-left:auto">' + esc(user.email) + ' (' + esc(user.role) + ')</span>' +
      '<form method="POST" action="/logout" style="display:inline"><button style="background:none;border:0;color:#ffb3b3;cursor:pointer">Log out</button></form></nav>'
    : '';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + ' · LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</title></head>' +
    '<body style="margin:0;background:#f4f4f8;font-family:Arial,sans-serif;color:#222">' +
    progressHeader() + nav +
    '<main style="max-width:900px;margin:22px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:24px">' + inner + '</main>' +
    chatWidget() + '</body></html>';
}
function gatePage() {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' · Locked</title></head>' +
    '<body style="margin:0;background:#14141d;font-family:Arial,sans-serif">' + progressHeader() +
    '<div style="max-width:520px;margin:60px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:28px;text-align:center">' +
    '<img src="/logo.png" style="height:56px"><h2>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h2>' +
    '<p>This lab is locked. Paste the completion key from Lab ' + PREV_LAB + ' to start.</p>' +
    '<form method="POST" action="/unlock"><input name="key" style="padding:9px;width:80%" placeholder="Completion key from Lab ' + PREV_LAB + '"><br><br>' +
    '<button style="padding:10px 22px">Unlock LAB ' + LAB_NUMBER + '</button></form></div>' +
    chatWidget() + '</body></html>';
}

/* ================================================================== *
 * Lab Coach chatbot (§6) — rule-based, in-lab, zero external calls.   *
 * ================================================================== */
const FEATURE_KEYWORDS = [
  ['Login & Authentication', ['login', 'log in', 'password', 'auth', 'brute', 'reset token', 'enumerat', 'sql injection', 'sqli', 'cookie']],
  ['Registration & Profile', ['register', 'registration', 'sign up', 'signup', 'profile', 'mass assignment', 'weak password']],
  ['Skill Paths', ['path', 'module', 'premium', 'order', 'skip']],
  ['Assessments', ['assessment', 'score', 'grade', 'quiz', 'answer']],
  ['Badges', ['badge', 'verify', 'verification']],
  ['Portfolios', ['portfolio', 'upload', 'file']],
  ['Teams', ['team', 'roster', 'member']],
  ['Admin Panel', ['admin', 'export']],
  ['Platform & API', ['api', 'debug', 'token']]
];
function matchFeature(msg) {
  for (let i = 0; i < FEATURE_KEYWORDS.length; i++) {
    const words = FEATURE_KEYWORDS[i][1];
    for (let j = 0; j < words.length; j++) if (msg.indexOf(words[j]) !== -1) return FEATURE_KEYWORDS[i][0];
  }
  return null;
}
function chatReply(rawMsg) {
  const msg = ' ' + String(rawMsg || '').toLowerCase() + ' ';
  /* Attribution — exact, always available (even while locked). */
  if (/who (built|made|created|developed)|founder|your creator|who is behind/.test(msg)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  /* Key secrecy — the coach only receives the key at 100%. */
  if (msg.indexOf('key') !== -1) {
    if (isComplete() && state.keyRevealed) {
      return 'You completed LAB ' + LAB_NUMBER + ' — here is your completion key: ' + completionKey() + ' — paste it into Lab ' + (LAB_NUMBER + 1) + ' to unlock it.';
    }
    return "I don't have the completion key yet — it is only given to me when this lab is completed 100%. Right now you are at " + pct() + '%. Finish all ' + totalTests() + ' tests and ask me again.';
  }
  const feature = matchFeature(msg);
  const wantsHow = /how|solve|guide|help|steps|walkthrough|do i|stuck|hint/.test(msg);
  const wantsCount = /how many|count|total|list|which|what tests|vulnerabilit/.test(msg);
  if (feature && wantsHow) {
    const st = featureStats(feature);
    const open = TESTS.filter(function (t) { return t.feature === feature && !state.tests[t.id]; });
    if (st.attempts >= 3 || open.length === 0) {
      if (open.length === 0) return 'You have already completed every test in ' + feature + '. Great work — check /tests for what remains.';
      let out = 'Step by step for ' + feature + ':\n';
      open.forEach(function (t) { out += '• ' + t.name + ': ' + t.hints[2] + '\n'; });
      return out.trim();
    }
    return 'That feature is locked for help. First try the ' + feature + " tests yourself at least 3 times — I can see you've tried " + st.attempts + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  if (feature && wantsCount) {
    const st = featureStats(feature);
    const names = TESTS.filter(function (t) { return t.feature === feature; }).map(function (t) {
      return (state.tests[t.id] ? '✓ ' : '○ ') + t.name;
    }).join('; ');
    return feature + ' has ' + st.total + ' tests (' + st.done + ' done): ' + names + '. The map is public — the how-to unlocks after 3 genuine tries.';
  }
  if (/progress|status|next|left|remaining|score/.test(msg)) {
    const open = TESTS.filter(function (t) { return !state.tests[t.id]; });
    if (open.length === 0) return 'You are at 100% — LAB ' + LAB_NUMBER + ' is complete! Visit /complete for your debrief and key.';
    return 'You are at ' + pct() + '% (' + doneCount() + '/' + totalTests() + ' tests). Next open test: "' + open[0].name + '" in ' + open[0].feature + '. Full board: /tests.';
  }
  if (/how many|count|total|features/.test(msg)) {
    return 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + featureList().length + ' features and ' + totalTests() + ' tests: ' +
      featureList().map(function (f) { return f + ' (' + featureStats(f).total + ')'; }).join(', ') + '.';
  }
  if (/hi|hello|hey/.test(msg)) {
    return 'Hello! I coach LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '. Ask me how many tests a feature has, or how to solve one — coaching for a feature unlocks after you have tried it at least 3 times. Your progress: ' + pct() + '%.';
  }
  return "I can help with LAB " + LAB_NUMBER + ' — ' + LAB_NAME + ': ask how many tests a feature has, ask for your progress, or — after 3 genuine tries on a feature — ask me how to solve its tests. The full mission board is at /tests, and every test there carries 3 graded hints.';
}

/* ================================================================== *
 * Route handlers                                                     *
 * ================================================================== */
function handleLogin(req, res, body) {
  attempt('Login & Authentication');
  const email = String(body.email || '');
  const password = String(body.password || '');
  const ip = req.socket.remoteAddress || 'local';
  /* VULN: string-built "query" — an injection pattern in the input bypasses the password check. */
  const inj = /'\s*or\s*'?[\w]+'?\s*=\s*'?[\w]+/i;
  if (inj.test(email) || inj.test(password)) {
    const admin = users[0];
    const sid = crypto.randomBytes(16).toString('hex');
    sessions.set(sid, admin.id);
    pass('auth-sqli');
    return redirect(res, '/', { 'Set-Cookie': ['hx_session=' + sid + '; Path=/; HttpOnly', 'hx_role=' + admin.role + '; Path=/'] });
  }
  const user = users.find(function (u) { return u.email === email; });
  const probes = enumProbes.get(ip) || { nf: false, wp: false };
  if (!user) {
    probes.nf = true; enumProbes.set(ip, probes);
    if (probes.wp) pass('auth-enum');
    return send(res, 200, page(req, 'Login', '<h2>Sign in</h2><p style="color:#b00">No account found for that email.</p>' + loginForm()));
  }
  if (user.password !== password) {
    probes.wp = true; enumProbes.set(ip, probes);
    if (probes.nf) pass('auth-enum');
    const k = email + '|' + ip;
    const n = (failCounts.get(k) || 0) + 1;
    failCounts.set(k, n);
    if (n >= 10) pass('auth-brute'); /* VULN: the 10th failure is still processed — no throttle, no lockout. */
    return send(res, 200, page(req, 'Login', '<h2>Sign in</h2><p style="color:#b00">Incorrect password for that account.</p>' + loginForm()));
  }
  failCounts.delete(email + '|' + ip);
  if (user.email === 'demo@hexaskill.local') pass('auth-default');
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, user.id);
  return redirect(res, '/', { 'Set-Cookie': ['hx_session=' + sid + '; Path=/; HttpOnly', 'hx_role=' + user.role + '; Path=/', 'hx_origin=site; Path=/'] });
}
function loginForm() {
  return '<form method="POST" action="/login"><label>Email<br><input name="email" style="padding:8px;width:90%"></label><br><br>' +
    '<label>Password<br><input name="password" type="password" style="padding:8px;width:90%"></label><br><br>' +
    '<button style="padding:9px 20px">Sign in</button></form>' +
    '<p style="font-size:13px;color:#555">Try the demo account: <strong>demo@hexaskill.local / demo123</strong></p>' +
    '<p style="font-size:13px"><a href="/register">Create an account</a> · <a href="/forgot">Forgot password?</a></p>';
}
function handleRegister(req, res, body) {
  attempt('Registration & Profile');
  const email = String(body.email || '');
  if (!email || users.some(function (u) { return u.email === email; })) {
    return send(res, 200, page(req, 'Register', '<h2>Create an account</h2><p style="color:#b00">That email is missing or already registered.</p>' + registerForm()));
  }
  const user = {
    id: nextUserId++,
    email: email,
    password: String(body.password || ''),
    name: String(body.name || 'New Learner'),
    role: 'learner',
    teamId: 0
  };
  /* VULN: mass assignment — extra body fields are bound straight onto the record. */
  ['role', 'teamId'].forEach(function (f) {
    if (body[f] !== undefined && body[f] !== '') user[f] = f === 'teamId' ? parseInt(body[f], 10) || 0 : String(body[f]);
  });
  users.push(user);
  portfolios[user.id] = { bio: '', isPrivate: false, projects: [] };
  progressByUser[user.id] = [];
  if (user.password.length < 4) pass('reg-weakpass'); /* VULN: no minimum length/complexity enforced. */
  if (user.role !== 'learner') pass('reg-massassign');
  if (XSS_PATTERN.test(user.name)) pass('reg-xss');
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, user.id);
  return redirect(res, '/', { 'Set-Cookie': ['hx_session=' + sid + '; Path=/; HttpOnly', 'hx_role=' + user.role + '; Path=/', 'hx_origin=site; Path=/'] });
}
function registerForm() {
  return '<form method="POST" action="/register"><label>Display name<br><input name="name" style="padding:8px;width:90%"></label><br><br>' +
    '<label>Email<br><input name="email" style="padding:8px;width:90%"></label><br><br>' +
    '<label>Password<br><input name="password" type="password" style="padding:8px;width:90%"></label><br><br>' +
    '<button style="padding:9px 20px">Create account</button></form>';
}
function handleForgot(req, res, body) {
  attempt('Login & Authentication');
  const email = String(body.email || '');
  const user = users.find(function (u) { return u.email === email; });
  if (!user) {
    return send(res, 200, page(req, 'Forgot password', '<h2>Forgot password</h2><p style="color:#b00">No account with that email.</p><p><a href="/login">Back to sign in</a></p>'));
  }
  const token = resetTokenFor(user);
  issuedResetTokens.add(token);
  return send(res, 200, page(req, 'Forgot password', '<h2>Forgot password</h2><p>Reset email sent to ' + esc(email) + '.</p>' +
    '<p style="font-size:13px;color:#555">(Lab simulation — your reset link: <a href="/reset?email=' + encodeURIComponent(email) + '&token=' + token + '">/reset?token=…</a>)</p>'));
}
function handleReset(req, res, body) {
  attempt('Login & Authentication');
  const email = String(body.email || '');
  const token = String(body.token || '');
  const user = users.find(function (u) { return u.email === email; });
  if (user && token === resetTokenFor(user)) {
    /* VULN: the token is a predictable function of the public user id — a forged one works identically. */
    if (!issuedResetTokens.has(token)) pass('auth-reset');
    user.password = String(body.newpassword || 'changed123');
    return send(res, 200, page(req, 'Password reset', '<h2>Password reset</h2><p>Your password has been changed. <a href="/login">Sign in</a></p>'));
  }
  return send(res, 200, page(req, 'Password reset', '<h2>Password reset</h2><p style="color:#b00">That reset token is not valid.</p>'));
}
function handleProfileUpdate(req, res, body) {
  const user = currentUser(req);
  if (!user) return redirect(res, '/login');
  attempt('Registration & Profile');
  /* VULN: no CSRF token and no origin verification on a state-changing POST. */
  const origin = req.headers.origin || '';
  if (origin && origin.indexOf('127.0.0.1') === -1 && origin.indexOf('localhost') === -1) pass('reg-csrf');
  if (body.name !== undefined) {
    user.name = String(body.name);
    if (XSS_PATTERN.test(user.name)) pass('reg-xss');
  }
  if (body.bio !== undefined && portfolios[user.id]) portfolios[user.id].bio = String(body.bio);
  if (body.private !== undefined && portfolios[user.id]) portfolios[user.id].isPrivate = String(body.private) === '1';
  return redirect(res, '/profile');
}
function handleModuleComplete(req, res, moduleId) {
  const user = currentUser(req);
  if (!user) return redirect(res, '/login');
  attempt('Skill Paths');
  const mod = modulesData[moduleId];
  if (!mod) return send(res, 404, page(req, 'Not found', '<h2>Module not found.</h2>'));
  const done = progressByUser[user.id] || (progressByUser[user.id] = []);
  /* VULN: no prerequisite check — any module can be completed in any order, no assessment required. */
  const earlier = pathsData.find(function (p) { return p.id === mod.pathId; }).modules
    .filter(function (m) { return modulesData[m].order < mod.order; });
  const skipped = earlier.some(function (m) { return done.indexOf(m) === -1; });
  if (done.indexOf(mod.id) === -1) done.push(mod.id);
  if (skipped) pass('path-order');
  if (pathComplete(user.id, mod.pathId)) awardBadge(user.id, mod.pathId);
  return redirect(res, '/path/' + mod.pathId);
}
function handleAssessSubmit(req, res, moduleId, body) {
  const user = currentUser(req);
  if (!user) return redirect(res, '/login');
  attempt('Assessments');
  const quiz = quizzes[moduleId];
  if (!quiz) return send(res, 404, page(req, 'Not found', '<h2>Assessment not found.</h2>'));
  let correct = 0;
  quiz.forEach(function (q, i) { if (parseInt(body['q' + i], 10) === q.answer) correct++; });
  const computed = Math.round((correct / quiz.length) * 100);
  let stored = computed;
  /* VULN: a client-supplied score field overrides the server-computed result. */
  if (body.score !== undefined && body.score !== '') {
    stored = parseInt(body.score, 10);
    if (!isNaN(stored) && stored !== computed) pass('assess-forge');
  }
  submissions.push({ id: nextSubmissionId++, userId: user.id, moduleId: moduleId, score: stored, gradedBy: 'auto' });
  return redirect(res, '/assess/' + moduleId + '?done=1');
}
function handleGrade(req, res, body) {
  const user = currentUser(req);
  if (!user) return redirect(res, '/login');
  attempt('Assessments');
  const sub = submissions.find(function (s) { return s.id === parseInt(body.submissionId, 10); });
  if (!sub) return send(res, 404, page(req, 'Not found', '<h2>Submission not found.</h2>'));
  const newScore = parseInt(body.score, 10);
  if (!isNaN(newScore)) {
    /* VULN: no role check — any signed-in user can rewrite any grade. */
    if (user.role !== 'assessor' && user.role !== 'admin') pass('assess-grade');
    sub.score = newScore;
    sub.gradedBy = user.email;
  }
  return redirect(res, '/submissions');
}

function testsPage(req) {
  let inner = '<h2>Mission board — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h2>' +
    '<p>' + doneCount() + '/' + totalTests() + ' tests complete · ' + pct() + '% · Coaching for a feature unlocks after 3 genuine attempts on it.</p>';
  featureList().forEach(function (f) {
    const st = featureStats(f);
    inner += '<h3>' + esc(f) + ' <span style="color:#666;font-size:13px">(' + st.done + '/' + st.total + ' done · ' + st.attempts + ' attempts)</span></h3>';
    TESTS.filter(function (t) { return t.feature === f; }).forEach(function (t) {
      const done = state.tests[t.id];
      inner += '<div style="border:1px solid #e2e2ee;border-radius:8px;padding:10px 12px;margin:8px 0">' +
        '<strong>' + (done ? '✓ ' : '○ ') + esc(t.name) + '</strong> ' +
        '<span style="font-size:12px;color:#666">' + esc(t.owasp) + ' · ' + esc(t.difficulty) + (done ? ' · DONE' : '') + '</span>' +
        '<details style="margin-top:6px"><summary style="cursor:pointer;font-size:13px;color:#5a3fd6">Hints</summary>' +
        '<ol style="font-size:13px;line-height:1.5">' + t.hints.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ol></details></div>';
    });
  });
  return page(req, 'Tests', inner);
}
function completePage(req) {
  if (!isComplete()) {
    const left = TESTS.filter(function (t) { return !state.tests[t.id]; });
    return page(req, 'Debrief', '<h2>Completion debrief</h2><p>You are at ' + pct() + '% (' + doneCount() + '/' + totalTests() + '). ' +
      'The full debrief, completion key and certificate unlock at 100%.</p><h3>Still open</h3><ul>' +
      left.map(function (t) { return '<li>' + esc(t.name) + ' — ' + esc(t.feature) + '</li>'; }).join('') + '</ul>');
  }
  const feats = featureList();
  let inner = '<h2>Completion debrief — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h2>';
  inner += '<h3>1) Total features in this lab</h3><p>' + feats.length + ' features: ' + feats.map(esc).join(', ') + '.</p>';
  inner += '<h3>2) Vulnerabilities per feature</h3><ul>' + feats.map(function (f) {
    return '<li>' + esc(f) + ': ' + featureStats(f).total + ' tests</li>';
  }).join('') + '</ul>';
  inner += '<h3>3) How testing was done — ' + totalTests() + ' techniques</h3><ul>' + TESTS.map(function (t) {
    return '<li>' + esc(t.name) + ' (' + esc(t.owasp) + ')</li>';
  }).join('') + '</ul>';
  inner += '<h3>4) What you learned</h3><ul>' + TESTS.map(function (t) {
    return '<li><strong>' + esc(t.name) + ':</strong> ' + esc(t.lesson) + '</li>';
  }).join('') + '</ul>';
  inner += '<h3>5) What this means for a real client</h3><ul>' + TESTS.map(function (t) {
    return '<li><strong>' + esc(t.name) + ':</strong> ' + esc(t.impact) + '</li>';
  }).join('') + '</ul>';
  inner += '<h3>6) Writing it in a real report</h3><ul>' + TESTS.map(function (t) {
    return '<li><strong>' + esc(t.report.title) + '</strong> — Severity: ' + esc(t.report.severity) + '. Remediation: ' + esc(t.report.remediation) + '</li>';
  }).join('') + '</ul>';
  inner += '<h3>Your completion key</h3><p style="font-size:18px;background:#f0edff;border:1px dashed #7c5cff;border-radius:8px;padding:12px;text-align:center"><strong>' +
    esc(completionKey()) + '</strong></p><p>Paste this key into Lab ' + (LAB_NUMBER + 1) + ' to unlock it.</p>';
  inner += '<h3>Your name on the certificate</h3><form method="POST" action="/tester-name"><input name="name" value="' + esc(state.testerName) +
    '" style="padding:8px;width:60%" placeholder="Your name"> <button style="padding:8px 16px">Save name</button></form>' +
    '<p><a href="/certificate">View your certificate →</a></p>';
  return page(req, 'Debrief', inner);
}
function certificatePage(req) {
  if (!isComplete()) {
    return page(req, 'Certificate', '<h2>Certificate</h2><p>The certificate unlocks at 100%. You are at ' + pct() + '%.</p>');
  }
  const user = currentUser(req);
  const name = state.testerName || (user ? user.name : 'HexaSkill Tester');
  const dateStr = state.completedAt ? new Date(state.completedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const inner = '<div style="border:3px double #7c5cff;border-radius:14px;padding:34px;text-align:center;background:#fffdf5">' +
    '<img src="/logo.png" style="height:64px">' +
    '<h1 style="margin:10px 0 4px">Certificate of Completion</h1>' +
    '<p style="color:#666">HexaCyberLab — Web Security Practice Labs</p>' +
    '<p style="font-size:17px">This certifies that</p>' +
    '<p style="font-size:26px;font-weight:bold;margin:6px 0">' + esc(name) + '</p>' +
    '<p style="font-size:16px">has completed 100% of the security tests in<br><strong>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</strong><br>(' +
    totalTests() + ' tests across ' + featureList().length + ' features)</p>' +
    '<p style="color:#666">Completed on ' + esc(dateStr) + '</p>' +
    '<p style="margin-top:18px;font-size:13px;color:#444">HexaCyberLab — Built by Md. Jony Hassain, Founder</p></div>' +
    '<style>@media print{ #hxchat, nav { display:none } }</style>';
  return page(req, 'Certificate', inner);
}

/* ================================================================== *
 * Main router                                                        *
 * ================================================================== */
const server = http.createServer(async function (req, res) {
  try {
    const u = new URL(req.url, 'http://127.0.0.1:' + PORT);
    const pathname = u.pathname;
    const method = req.method;

    if (pathname === '/logo.png') {
      try {
        const data = fs.readFileSync(path.join(__dirname, 'logo.png'));
        res.writeHead(200, { 'Content-Type': 'image/png' });
        return res.end(data);
      } catch (e) { return send(res, 404, 'logo missing'); }
    }
    if (pathname === '/api/progress') {
      const features = {};
      featureList().forEach(function (f) { features[f] = featureStats(f); });
      return send(res, 200, JSON.stringify({ lab: LAB_NAME, number: LAB_NUMBER, total: totalTests(), done: doneCount(), pct: pct(), features: features, complete: isComplete() }, null, 2), { 'Content-Type': 'application/json' });
    }
    if (pathname === '/api/chat' && method === 'POST') {
      const raw = await readBody(req);
      let body = {};
      try { body = JSON.parse(raw || '{}'); } catch (e) { body = parseBody(req, raw); }
      return send(res, 200, JSON.stringify({ reply: chatReply(body.message) }), { 'Content-Type': 'application/json' });
    }
    if (pathname === '/api/debug') {
      attempt('Platform & API');
      pass('plat-debug'); /* VULN: leftover debug route, no auth, dumps credentials. */
      return send(res, 200, JSON.stringify({ users: users, sessions: sessions.size, submissions: submissions.length }, null, 2), { 'Content-Type': 'application/json' });
    }
    if (pathname === '/unlock' && method === 'POST') {
      const body = parseBody(req, await readBody(req));
      if (entryKeyMatches(String(body.key || ''))) {
        state.unlocked = true;
        saveState();
        return redirect(res, '/');
      }
      return send(res, 403, gatePage());
    }

    /* ---- Lock gate: everything else requires the lab to be unlocked ---- */
    if (!state.unlocked) return send(res, 200, gatePage());

    const user = currentUser(req);

    if (pathname === '/' && method === 'GET') {
      if (!user) return send(res, 200, page(req, 'Sign in', '<h2>Welcome to HexaSkill</h2><p>Train skills. Earn badges. Prove it.</p>' + loginForm()));
      const myPaths = pathsData.map(function (p) {
        const done = (progressByUser[user.id] || []).filter(function (m) { return p.modules.indexOf(m) !== -1; }).length;
        return '<li><a href="/path/' + p.id + '">' + esc(p.name) + '</a>' + (p.premium ? ' (Premium)' : '') + ' — ' + done + '/' + p.modules.length + ' modules complete</li>';
      }).join('');
      return send(res, 200, page(req, 'Dashboard',
        '<h2>Dashboard</h2><p>Signed in as <strong>' + user.name + '</strong> (' + esc(user.role) + '). ' +
        'Your lab progress: ' + doneCount() + '/' + totalTests() + ' tests (' + pct() + '%).</p><h3>My skill paths</h3><ul>' + myPaths + '</ul>' +
        '<p><a href="/tests">Open the mission board →</a></p>'));
    }
    if (pathname === '/login' && method === 'GET') return send(res, 200, page(req, 'Sign in', '<h2>Sign in</h2>' + loginForm()));
    if (pathname === '/login' && method === 'POST') return handleLogin(req, res, parseBody(req, await readBody(req)));
    if (pathname === '/logout' && method === 'POST') {
      const sid = parseCookies(req).hx_session;
      if (sid) sessions.delete(sid);
      return redirect(res, '/login', { 'Set-Cookie': ['hx_session=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0'] });
    }
    if (pathname === '/register' && method === 'GET') return send(res, 200, page(req, 'Register', '<h2>Create an account</h2>' + registerForm()));
    if (pathname === '/register' && method === 'POST') return handleRegister(req, res, parseBody(req, await readBody(req)));
    if (pathname === '/forgot' && method === 'GET') {
      return send(res, 200, page(req, 'Forgot password', '<h2>Forgot password</h2><form method="POST" action="/forgot"><label>Email<br><input name="email" style="padding:8px;width:90%"></label><br><br><button style="padding:9px 20px">Send reset link</button></form>'));
    }
    if (pathname === '/forgot' && method === 'POST') return handleForgot(req, res, parseBody(req, await readBody(req)));
    if (pathname === '/reset' && method === 'GET') {
      return send(res, 200, page(req, 'Password reset', '<h2>Password reset</h2><form method="POST" action="/reset">' +
        '<input type="hidden" name="email" value="' + esc(u.searchParams.get('email') || '') + '"><input type="hidden" name="token" value="' + esc(u.searchParams.get('token') || '') + '">' +
        '<label>New password<br><input name="newpassword" type="password" style="padding:8px;width:90%"></label><br><br><button style="padding:9px 20px">Set new password</button></form>'));
    }
    if (pathname === '/reset' && method === 'POST') return handleReset(req, res, parseBody(req, await readBody(req)));

    if (pathname === '/profile' && method === 'GET') {
      if (!user) return redirect(res, '/login');
      const pf = portfolios[user.id] || { bio: '', isPrivate: false };
      return send(res, 200, page(req, 'Profile', '<h2>My profile</h2>' +
        '<form method="POST" action="/profile/update"><label>Display name<br><input name="name" value="' + esc(user.name) + '" style="padding:8px;width:90%"></label><br><br>' +
        '<label>Portfolio bio<br><textarea name="bio" style="padding:8px;width:90%">' + esc(pf.bio) + '</textarea></label><br><br>' +
        '<label><input type="checkbox" name="private" value="1"' + (pf.isPrivate ? ' checked' : '') + '> Portfolio is private</label><br><br>' +
        '<button style="padding:9px 20px">Save profile</button></form>'));
    }
    if (pathname === '/profile/update' && method === 'POST') return handleProfileUpdate(req, res, parseBody(req, await readBody(req)));

    if (pathname === '/paths' && method === 'GET') {
      const items = pathsData.map(function (p) {
        return '<li><a href="/path/' + p.id + '">' + esc(p.name) + '</a>' + (p.premium ? ' — <strong>Premium</strong>' : ' — Free') + ' · ' + p.modules.length + ' modules</li>';
      }).join('');
      return send(res, 200, page(req, 'Skill Paths', '<h2>Skill paths</h2><ul>' + items + '</ul>'));
    }
    const pathMatch = pathname.match(/^\/path\/(\d+)$/);
    if (pathMatch && method === 'GET') {
      const p = pathsData.find(function (x) { return x.id === parseInt(pathMatch[1], 10); });
      if (!p) return send(res, 404, page(req, 'Not found', '<h2>Path not found.</h2>'));
      const done = user ? (progressByUser[user.id] || []) : [];
      const rows = p.modules.map(function (mid) {
        const m = modulesData[mid];
        return '<li><a href="/module/' + m.id + '">' + esc(m.title) + '</a> ' + (done.indexOf(m.id) !== -1 ? '✓ complete' : '') +
          ' · <a href="/assess/' + m.id + '">Take assessment</a></li>';
      }).join('');
      return send(res, 200, page(req, p.name, '<h2>' + esc(p.name) + '</h2>' + (p.premium ? '<p><strong>Premium path</strong></p>' : '') + '<ol>' + rows + '</ol>'));
    }
    const moduleMatch = pathname.match(/^\/module\/(\d+)$/);
    if (moduleMatch && method === 'GET') {
      if (!user) return redirect(res, '/login');
      const m = modulesData[parseInt(moduleMatch[1], 10)];
      if (!m) return send(res, 404, page(req, 'Not found', '<h2>Module not found.</h2>'));
      const p = pathsData.find(function (x) { return x.id === m.pathId; });
      if (p.premium) { attempt('Skill Paths'); pass('path-premium'); } /* VULN: premium content served with no entitlement check. */
      const done = (progressByUser[user.id] || []).indexOf(m.id) !== -1;
      return send(res, 200, page(req, m.title, '<h2>' + esc(m.title) + '</h2><p>' + esc(m.body) + '</p>' +
        (done ? '<p>✓ You completed this module.</p>' : '<form method="POST" action="/module/' + m.id + '/complete"><button style="padding:9px 20px">Mark module complete</button></form>') +
        '<p><a href="/assess/' + m.id + '">Take the module assessment →</a></p>'));
    }
    const completeMatch = pathname.match(/^\/module\/(\d+)\/complete$/);
    if (completeMatch && method === 'POST') { await readBody(req); return handleModuleComplete(req, res, parseInt(completeMatch[1], 10)); }

    const progMatch = pathname.match(/^\/api\/users\/(\d+)\/progress$/);
    if (progMatch && method === 'GET') {
      if (!user) return send(res, 401, JSON.stringify({ error: 'login required' }), { 'Content-Type': 'application/json' });
      attempt('Skill Paths');
      const targetId = parseInt(progMatch[1], 10);
      if (targetId !== user.id) pass('path-idor'); /* VULN: any learner progress served to any other learner. */
      const target = users.find(function (x) { return x.id === targetId; });
      return send(res, 200, JSON.stringify({ userId: targetId, email: target ? target.email : null, completedModules: progressByUser[targetId] || [] }, null, 2), { 'Content-Type': 'application/json' });
    }

    const assessMatch = pathname.match(/^\/assess\/(\d+)$/);
    if (assessMatch && method === 'GET') {
      if (!user) return redirect(res, '/login');
      const mid = parseInt(assessMatch[1], 10);
      const quiz = quizzes[mid];
      if (!quiz) return send(res, 404, page(req, 'Not found', '<h2>Assessment not found.</h2>'));
      const qs = quiz.map(function (q, i) {
        return '<fieldset style="margin:10px 0"><legend>' + esc(q.q) + '</legend>' + q.options.map(function (o, j) {
          return '<label style="display:block"><input type="radio" name="q' + i + '" value="' + j + '"> ' + esc(o) + '</label>';
        }).join('') + '</fieldset>';
      }).join('');
      const mine = submissions.filter(function (s) { return s.userId === user.id && s.moduleId === mid; });
      return send(res, 200, page(req, 'Assessment', '<h2>Assessment — ' + esc(modulesData[mid].title) + '</h2>' +
        (u.searchParams.get('done') ? '<p style="color:#070">Submission recorded.</p>' : '') +
        (mine.length ? '<p>Your submissions: ' + mine.map(function (s) { return '#' + s.id + ' → ' + s.score + '%'; }).join(', ') + '</p>' : '') +
        '<form method="POST" action="/assess/' + mid + '">' + qs + '<button style="padding:9px 20px">Submit assessment</button></form>'));
    }
    if (assessMatch && method === 'POST') return handleAssessSubmit(req, res, parseInt(assessMatch[1], 10), parseBody(req, await readBody(req)));
    const answersMatch = pathname.match(/^\/api\/assess\/(\d+)\/answers$/);
    if (answersMatch && method === 'GET') {
      if (!user) return send(res, 401, JSON.stringify({ error: 'login required' }), { 'Content-Type': 'application/json' });
      attempt('Assessments');
      pass('assess-leak'); /* VULN: full answer key served to any learner. */
      const mid = parseInt(answersMatch[1], 10);
      return send(res, 200, JSON.stringify({ moduleId: mid, answers: (quizzes[mid] || []).map(function (q) { return q.answer; }) }, null, 2), { 'Content-Type': 'application/json' });
    }
    if (pathname === '/assess/grade' && method === 'POST') return handleGrade(req, res, parseBody(req, await readBody(req)));
    if (pathname === '/submissions' && method === 'GET') {
      if (!user) return redirect(res, '/login');
      const rows = submissions.map(function (s) {
        const su = users.find(function (x) { return x.id === s.userId; });
        return '<tr><td>' + s.id + '</td><td>' + esc(su ? su.email : '?') + '</td><td>' + esc(modulesData[s.moduleId].title) + '</td><td>' + s.score + '%</td>' +
          '<td><form method="POST" action="/assess/grade" style="display:flex;gap:6px"><input type="hidden" name="submissionId" value="' + s.id + '"><input name="score" size="4" value="' + s.score + '"><button>Set grade</button></form></td></tr>';
      }).join('');
      return send(res, 200, page(req, 'Submissions', '<h2>Assessment submissions</h2><table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>ID</th><th>Learner</th><th>Module</th><th>Score</th><th>Assessor action</th></tr>' + rows + '</table>'));
    }

    if (pathname === '/badges' && method === 'GET') {
      if (!user) return redirect(res, '/login');
      const mine = badges.filter(function (b) { return b.userId === user.id; });
      const rows = mine.map(function (b) {
        const p = pathsData.find(function (x) { return x.id === b.pathId; });
        return '<li><strong>' + esc(p.name) + '</strong> — code ' + esc(b.code) + ' · <a href="/verify/' + esc(b.code) + '">verification page</a> · ' +
          '<form method="POST" action="/badges/' + b.id + '/delete" style="display:inline"><button>Delete</button></form></li>';
      }).join('');
      return send(res, 200, page(req, 'Badges', '<h2>My badges</h2>' + (rows ? '<ul>' + rows + '</ul>' : '<p>No badges yet — complete a skill path.</p>') +
        '<h3>Claim a badge</h3><form method="POST" action="/badges/award"><label>Path <select name="pathId">' +
        pathsData.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + '</option>'; }).join('') +
        '</select></label> <button style="padding:8px 16px">Award my badge</button></form>'));
    }
    if (pathname === '/badges/award' && method === 'POST') {
      if (!user) return redirect(res, '/login');
      attempt('Badges');
      const body = parseBody(req, await readBody(req));
      const pid = parseInt(body.pathId, 10);
      /* VULN: badge minted on request — path completion is never checked. */
      if (!pathComplete(user.id, pid)) pass('badge-selfaward');
      awardBadge(user.id, pid);
      return redirect(res, '/badges');
    }
    const badgeDelete = pathname.match(/^\/badges\/(\d+)\/delete$/);
    if (badgeDelete && method === 'POST') {
      if (!user) return redirect(res, '/login');
      attempt('Badges');
      await readBody(req);
      const idx = badges.findIndex(function (b) { return b.id === parseInt(badgeDelete[1], 10); });
      if (idx !== -1) {
        /* VULN: no ownership or admin check on a destructive action. */
        if (badges[idx].userId !== user.id && user.role !== 'admin') pass('badge-delete');
        badges.splice(idx, 1);
      }
      return redirect(res, '/badges');
    }
    const verifyMatch = pathname.match(/^\/verify\/([^/]+)$/);
    if (verifyMatch && method === 'GET') {
      attempt('Badges');
      const b = badges.find(function (x) { return x.code === decodeURIComponent(verifyMatch[1]); });
      if (!b) return send(res, 404, page(req, 'Verify badge', '<h2>Badge not found.</h2>'));
      const owner = users.find(function (x) { return x.id === b.userId; });
      const p = pathsData.find(function (x) { return x.id === b.pathId; });
      /* VULN: the displayed holder name can be overridden by a query parameter. */
      const shownName = u.searchParams.get('name') || (owner ? owner.name : 'Unknown');
      if (u.searchParams.get('name') && owner && u.searchParams.get('name') !== owner.name) pass('badge-forge');
      return send(res, 200, page(req, 'Verify badge', '<h2>Badge verification</h2><p>HexaCyberLab verifies that</p>' +
        '<p style="font-size:22px"><strong>' + esc(shownName) + '</strong></p><p>earned the <strong>' + esc(p.name) + '</strong> badge (code ' + esc(b.code) + ').</p>'));
    }

    const portfolioMatch = pathname.match(/^\/portfolio\/(\d+)$/);
    if (portfolioMatch && method === 'GET') {
      if (!user) return redirect(res, '/login');
      attempt('Portfolios');
      const targetId = parseInt(portfolioMatch[1], 10);
      const target = users.find(function (x) { return x.id === targetId; });
      const pf = portfolios[targetId];
      if (!target || !pf) return send(res, 404, page(req, 'Not found', '<h2>Portfolio not found.</h2>'));
      /* VULN: the private flag is displayed in the UI but never enforced on read. */
      if (pf.isPrivate && targetId !== user.id) pass('portfolio-idor');
      const projects = pf.projects.map(function (pr) {
        return '<li>' + esc(pr.title) + ' — <a href="/files/' + encodeURIComponent(pr.file) + '">' + esc(pr.file) + '</a></li>';
      }).join('');
      return send(res, 200, page(req, 'Portfolio', '<h2>Portfolio — ' + target.name + '</h2>' + /* name rendered unescaped by design (stored-XSS surface) */
        '<p>' + esc(pf.bio) + '</p>' + (pf.isPrivate ? '<p><em>Marked private.</em></p>' : '') +
        '<h3>Projects</h3><ul>' + projects + '</ul>' +
        (targetId === user.id ? '<h3>Add a project file</h3><form method="POST" action="/portfolio/upload"><label>File name<br><input name="filename" style="padding:8px;width:60%"></label><br><br><label>Content<br><textarea name="content" style="padding:8px;width:90%"></textarea></label><br><br><button style="padding:9px 20px">Upload file</button></form>' : '')));
    }
    if (pathname === '/portfolio/upload' && method === 'POST') {
      if (!user) return redirect(res, '/login');
      attempt('Portfolios');
      const body = parseBody(req, await readBody(req));
      const fname = String(body.filename || 'file.txt').replace(/[\\/]/g, '_');
      fileStore[fname] = String(body.content || '');
      if (portfolios[user.id]) portfolios[user.id].projects.push({ title: fname, file: fname });
      return redirect(res, '/portfolio/' + user.id);
    }
    const fileMatch = pathname.match(/^\/files\/([^/]+)$/);
    if (fileMatch && method === 'GET') {
      const fname = decodeURIComponent(fileMatch[1]);
      if (!(fname in fileStore)) return send(res, 404, page(req, 'Not found', '<h2>File not found.</h2>'));
      /* VULN: uploads served back from the app origin with a type guessed from the extension. */
      let ct = 'text/plain; charset=utf-8';
      if (/\.html?$/i.test(fname)) { ct = 'text/html; charset=utf-8'; pass('portfolio-upload'); }
      else if (/\.svg$/i.test(fname)) ct = 'image/svg+xml';
      return send(res, 200, fileStore[fname], { 'Content-Type': ct });
    }

    if (pathname === '/teams' && method === 'GET') {
      if (!user) return redirect(res, '/login');
      const rows = teams.map(function (t) {
        const names = Object.keys(t.members).map(function (uid) {
          const mu = users.find(function (x) { return x.id === parseInt(uid, 10); });
          return mu ? mu.name + ' (' + t.members[uid] + ')' : uid; /* member names rendered raw by design */
        }).join(', ');
        return '<li><a href="/team/' + t.id + '/report">' + esc(t.name) + '</a> — members: ' + names + '</li>';
      }).join('');
      return send(res, 200, page(req, 'Teams', '<h2>Training teams</h2><ul>' + rows + '</ul>'));
    }
    const teamReport = pathname.match(/^\/team\/(\d+)\/report$/);
    if (teamReport && method === 'GET') {
      if (!user) return redirect(res, '/login');
      attempt('Teams');
      const t = teams.find(function (x) { return x.id === parseInt(teamReport[1], 10); });
      if (!t) return send(res, 404, page(req, 'Not found', '<h2>Team not found.</h2>'));
      /* VULN: report served to anyone signed in — team membership never checked. */
      if (!(String(user.id) in t.members)) pass('team-roster');
      const rows = Object.keys(t.members).map(function (uid) {
        const mu = users.find(function (x) { return x.id === parseInt(uid, 10); });
        const done = (progressByUser[uid] || []).length;
        return '<tr><td>' + (mu ? mu.name : uid) + '</td><td>' + esc(t.members[uid]) + '</td><td>' + done + ' modules</td></tr>'; /* names raw by design */
      }).join('');
      const removeForms = Object.keys(t.members).map(function (uid) {
        return '<form method="POST" action="/team/' + t.id + '/remove" style="display:inline"><input type="hidden" name="userId" value="' + uid + '"><button>Remove member ' + uid + '</button></form>';
      }).join(' ');
      return send(res, 200, page(req, 'Team report', '<h2>' + esc(t.name) + ' — training report</h2>' +
        '<table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>Member</th><th>Role</th><th>Progress</th></tr>' + rows + '</table>' +
        '<h3>Team management</h3>' + removeForms));
    }
    const teamRemove = pathname.match(/^\/team\/(\d+)\/remove$/);
    if (teamRemove && method === 'POST') {
      if (!user) return redirect(res, '/login');
      attempt('Teams');
      const body = parseBody(req, await readBody(req));
      const t = teams.find(function (x) { return x.id === parseInt(teamRemove[1], 10); });
      if (!t) return send(res, 404, page(req, 'Not found', '<h2>Team not found.</h2>'));
      const myRole = t.members[String(user.id)];
      const targetId = String(parseInt(body.userId, 10));
      if (myRole && targetId in t.members) {
        /* VULN: membership is checked, the lead role is not — a plain member can remove the lead. */
        if (myRole !== 'lead') pass('team-admin');
        delete t.members[targetId];
        const tu = users.find(function (x) { return x.id === parseInt(targetId, 10); });
        if (tu && tu.teamId === t.id) tu.teamId = 0;
      }
      return redirect(res, '/team/' + t.id + '/report');
    }

    if (pathname === '/admin' && method === 'GET') {
      if (!user) return redirect(res, '/login');
      const cookies = parseCookies(req);
      if (effectiveRole(req, user) !== 'admin') return send(res, 403, page(req, 'Forbidden', '<h2>Admins only.</h2>'));
      /* Reaching this gate via a forged role cookie (real role is lower) is the cookie-tamper proof. */
      if (cookies.hx_role && roleRank(cookies.hx_role) > roleRank(user.role)) pass('auth-cookie');
      const rows = users.map(function (x) { return '<tr><td>' + x.id + '</td><td>' + x.name + '</td><td>' + esc(x.email) + '</td><td>' + esc(x.role) + '</td></tr>'; }).join(''); /* names raw by design — stored-XSS lands here */
      return send(res, 200, page(req, 'Admin', '<h2>Admin console</h2><p><a href="/admin/export">Export all learners (CSV)</a></p>' +
        '<table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th></tr>' + rows + '</table>'));
    }
    if (pathname === '/admin/export' && method === 'GET') {
      if (!user) return redirect(res, '/login');
      attempt('Admin Panel');
      /* VULN: the export endpoint never checks the admin role itself. */
      if (user.role !== 'admin') pass('admin-export');
      const csv = 'id,name,email,role,team\n' + users.map(function (x) { return [x.id, x.name, x.email, x.role, x.teamId].join(','); }).join('\n');
      return send(res, 200, csv, { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="learners.csv"' });
    }

    if (pathname === '/api/me' && method === 'GET') {
      attempt('Platform & API');
      const auth = req.headers.authorization || '';
      if (auth.indexOf('Bearer ') === 0) {
        const token = auth.slice(7);
        const matched = users.find(function (x) { return apiTokenFor(x) === token; });
        if (matched) {
          /* VULN: token is a public function of the email — a forged token with no session authenticates fully. */
          if (!user) pass('plat-apitoken');
          return send(res, 200, JSON.stringify({ id: matched.id, email: matched.email, name: matched.name, role: matched.role }, null, 2), { 'Content-Type': 'application/json' });
        }
      }
      if (user) return send(res, 200, JSON.stringify({ id: user.id, email: user.email, name: user.name, role: user.role }, null, 2), { 'Content-Type': 'application/json' });
      return send(res, 401, JSON.stringify({ error: 'unauthorized' }), { 'Content-Type': 'application/json' });
    }

    if (pathname === '/tests' && method === 'GET') return send(res, 200, testsPage(req));
    if (pathname === '/complete' && method === 'GET') return send(res, 200, completePage(req));
    if (pathname === '/tester-name' && method === 'POST') {
      const body = parseBody(req, await readBody(req));
      state.testerName = String(body.name || '').slice(0, 80);
      saveState();
      return redirect(res, '/complete');
    }
    if (pathname === '/certificate' && method === 'GET') return send(res, 200, certificatePage(req));

    return send(res, 404, page(req, 'Not found', '<h2>404 — page not found.</h2>'));
  } catch (e) {
    try { send(res, 500, 'Internal error — the lab stayed up.'); } catch (e2) {}
  }
});

server.listen(PORT, HOST, function () {
  console.log('LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' listening on http://' + HOST + ':' + PORT);
});
