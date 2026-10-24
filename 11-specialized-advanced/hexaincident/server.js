'use strict';
/* HexaIncident — LAB 110 (final lab). Incident management training platform.
   Zero-dependency Node.js. Binds 127.0.0.1 only. All data is fake seed data. */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3119;
const LAB_NUMBER = 110;
const LAB_NAME = 'HexaIncident';
const ROOT = __dirname;
const PROGRESS_FILE = path.join(ROOT, 'progress.json');
const FILES_DIR = path.join(ROOT, 'files');

/* ---- theme fragments (cosmetic constants, scattered on purpose) ---- */
const THEME_A = ['MUwtWEg=', 'VC0wMQ==', 'QUlLVw=='];
const BRAND = { color: '#0b5fff', accent: '#7b2ff7', name: 'HexaIncident' };

/* ================================================================
   TESTS registry — the heart of the lab system.
   Every test flips ONLY on server-side detection of the real effect.
   ================================================================ */
const TESTS = [
  /* ---------- Login & Authentication (6) ---------- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL injection login bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login form builds its database query by gluing your input straight into a string.', "Try a quote in the email field, then close the string and add an always-true condition.", "Email: ' OR '1'='1' --  with any password signs you in as the first matched account."],
    lesson: 'String-built queries let attacker input change the meaning of the query itself, turning a login form into an open door.',
    impact: 'On a real client site this means anyone can sign in as an administrator without knowing a single password — full account takeover in seconds.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never build SQL by string concatenation.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute force: no rate limit or lockout', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Pick one real account and just keep guessing wrong passwords.', 'Count the failures — does anything slow down, lock, or challenge you after many tries?', 'After 10 failed attempts the form still processes guesses at full speed: there is no throttle at all.'],
    lesson: 'Without rate limiting or lockout, a login form can be attacked millions of times until a weak password falls.',
    impact: 'Attackers routinely crack client accounts this way; the client only finds out after data is taken or the account is abused.',
    report: { title: 'Missing Brute-Force Protection on Login', severity: 'High', remediation: 'Add rate limiting, progressive delays and lockout/CAPTCHA after repeated failures; alert on spikes.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User enumeration via response differences', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the exact wording of a failed login for a real email versus a made-up one.', 'The forgot-password form behaves differently too — compare both flows.', 'Probe at least 5 different email addresses across login/forgot: real accounts answer differently, revealing the valid user list.'],
    lesson: 'Different error messages for "no such account" and "wrong password" hand attackers a verified list of usernames to target.',
    impact: 'Enumeration turns random password spraying into a focused attack on accounts the client actually has, including staff and admins.',
    report: { title: 'Account Enumeration via Authentication Error Messages', severity: 'Medium', remediation: 'Return one generic message ("invalid credentials") for every failure; make forgot-password responses identical.' } },
  { id: 'auth-demo', feature: 'Login & Authentication', name: 'Published demo credentials grant real access', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Read the login page carefully — some portals helpfully print a demo account.', 'Demo accounts often keep working long after the demo ends.', 'Sign in with the demo credentials printed on the login page; they open a real responder account.'],
    lesson: 'Default and demo credentials left active are one of the oldest, most reliable ways into a system.',
    impact: 'Anyone on the internet can walk into the client platform with credentials the client themselves published.',
    report: { title: 'Active Demo Account with Published Credentials', severity: 'High', remediation: 'Remove or disable demo/default accounts before go-live; force unique credentials per user.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable password-reset token', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a reset for your own account and study the token format closely.', 'The token looks derived from something public about the account — like its numeric id.', 'Token = HI<userId>-<userId*137+42>. Compute it for another account (Bob is id 3) and reset his password without ever requesting one.'],
    lesson: 'Reset tokens must be unguessable random values; anything derived from public data can be computed for every account.',
    impact: 'An attacker who can predict reset tokens can take over any account — including the incident commander’s — during a live incident.',
    report: { title: 'Predictable Password Reset Tokens', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), store hashed, expire quickly, and invalidate after use.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Role cookie tampering into the admin panel', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After login, inspect the cookies the portal sets — one of them announces your role to the server.', 'The admin gate trusts that cookie instead of checking the server-side account.', 'Set the hx_role cookie to "admin" in your browser and open /admin: the gate believes the cookie, not your account.'],
    lesson: 'Authorization decisions must be made server-side from trusted session data, never from values the client can edit.',
    impact: 'Any low-privilege user can promote themselves to administrator just by editing a cookie — complete platform compromise.',
    report: { title: 'Client-Side Role Cookie Trusted for Admin Access', severity: 'Critical', remediation: 'Derive roles server-side from the session record on every request; ignore role claims sent by the client.' } },

  /* ---------- Registration & Profile (4) ---------- */
  { id: 'reg-weak', feature: 'Registration & Profile', name: 'Weak password policy (1 character accepted)', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a new account and try the shortest password the form will accept.', 'There is effectively no minimum length or complexity check.', 'A one-character password such as "a" is accepted and the account works.'],
    lesson: 'Password policy is a security control: without a floor, users choose passwords that fall to the first guess.',
    impact: 'Client accounts with trivial passwords are harvested in bulk during credential attacks.',
    report: { title: 'No Minimum Password Strength Policy', severity: 'Medium', remediation: 'Enforce ≥10–12 characters, screen against breached-password lists, and encourage passphrases.' } },
  { id: 'reg-mass', feature: 'Registration & Profile', name: 'Mass assignment: self-register as admin', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration form only shows name/email/password — but the server may accept more fields than the form shows.', 'What field decides whether an account is an administrator?', 'Add role=admin to the registration request: the server binds every submitted field, creating a full admin account.'],
    lesson: 'Binding request data directly onto account objects lets attackers set privileged fields the UI never offered.',
    impact: 'Self-service admin creation defeats every other control: the attacker simply becomes the most powerful user.',
    report: { title: 'Mass Assignment Allows Privilege Escalation at Registration', severity: 'Critical', remediation: 'Whitelist bindable fields per endpoint; set role and privileges server-side only.' } },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in display name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is shown to other users on the Team page — how is it rendered?', 'Names are printed into pages exactly as stored.', 'Set a display name containing <script>alert(1)</script> (register or profile) and open /team: the payload is stored and served raw.'],
    lesson: 'Any user-controlled text rendered without encoding becomes code that runs in other users’ browsers.',
    impact: 'Stored XSS on an internal platform lets an attacker act as whoever views the page — including administrators — stealing sessions and issuing actions in their name.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Contextually encode all user output; add a Content-Security-Policy as defence in depth.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on profile update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Profile changes are accepted on a bare POST — look for any anti-CSRF token in the form. There is none.', 'The app sets a benign hx_origin marker cookie on its own pages, but the update endpoint never checks it.', 'Submit the profile-update POST without the hx_origin marker (e.g. from curl or a foreign page): the change is applied anyway.'],
    lesson: 'State-changing requests without an unpredictable token can be triggered by any website the victim visits while logged in.',
    impact: 'An attacker page can silently rewrite a responder’s profile — changing the recovery email is a classic path to account takeover.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require a per-session CSRF token on all state-changing requests and verify Origin/Referer.' } },

  /* ---------- Search & Discovery (2) ---------- */
  { id: 'search-sqli', feature: 'Search & Discovery', name: 'Search SQL injection dumps restricted incidents', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Incident search uses the same string-built query style as the login form.', 'A normal search only returns incidents your team may see.', "Search for ' OR '1'='1 and the result set suddenly includes restricted incidents from other teams."],
    lesson: 'Injection anywhere a query is built by hand exposes whatever the query can reach — including records every other control tried to hide.',
    impact: 'The client’s most sensitive incident — a confidential compromise investigation — leaks to any user with a search box.',
    report: { title: 'SQL Injection in Incident Search Exposes Restricted Records', severity: 'Critical', remediation: 'Parameterise all queries; enforce team-based record filtering in the data layer, not just the UI.' } },
  { id: 'search-xss', feature: 'Search & Discovery', name: 'Reflected XSS in search results', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The results page repeats your search term back to you in the heading.', 'Check whether it is encoded or printed exactly as typed.', 'Search for <script>alert(1)</script>: the term comes back raw in the page — reflected script execution.'],
    lesson: 'Reflected input must be encoded on output even when it "only" echoes the user’s own words back.',
    impact: 'A crafted search link sent to a responder runs script in their session — a reliable phishing-to-takeover bridge.',
    report: { title: 'Reflected Cross-Site Scripting in Search', severity: 'Medium', remediation: 'HTML-encode all reflected values; validate input; deploy CSP.' } },

  /* ---------- Incident Reports (4) ---------- */
  { id: 'inc-idor', feature: 'Incident Reports', name: 'Restricted incident readable by another team (IDOR)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Incident pages live at predictable sequential URLs: /incident/1, /incident/2, …', 'Your list hides restricted incidents from other teams — but does the page itself check?', 'Open /incident/3 directly: the confidential Command-team investigation is served to your SOC account with no check.'],
    lesson: 'Hiding a link is not access control. Every object fetch must verify the requester’s right to that object.',
    impact: 'During a real breach, the confidential investigation record — scope, affected systems, evidence — is readable by anyone with any account.',
    report: { title: 'Insecure Direct Object Reference on Restricted Incidents', severity: 'High', remediation: 'Enforce per-object authorization (owner/team/role) on every read and write; deny by default.' } },
  { id: 'inc-edit', feature: 'Incident Reports', name: 'Editing another responder’s incident', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The edit form for an incident is reachable by URL for any incident id.', 'Try editing INC-2, which belongs to Bob on the Infra team, from your account.', 'POST /incident/2/edit applies your changes even though you are neither reporter, assignee, nor admin.'],
    lesson: 'Write endpoints need the same ownership checks as reads — attackers tamper with records they were never meant to touch.',
    impact: 'An insider or compromised account can falsify another team’s incident record — rewriting what happened during an investigation.',
    report: { title: 'Missing Authorization on Incident Edit', severity: 'High', remediation: 'Check reporter/assignee/team or admin rights before applying any incident modification.' } },
  { id: 'inc-severity', feature: 'Incident Reports', name: 'Severity changed by a viewer account', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Severity drives paging and escalation — who is allowed to change it?', 'The severity endpoint accepts posts from any signed-in account, even a read-only viewer.', 'As Carol (viewer), POST /incident/1/severity with severity=P4: a live P2 incident is silently downgraded.'],
    lesson: 'Business-critical fields need role checks: severity is not metadata, it is the control that wakes people up at night.',
    impact: 'Downgrading a critical incident delays response while the real attack continues — sabotage with a single request.',
    report: { title: 'Unauthorized Severity Modification', severity: 'High', remediation: 'Restrict severity changes to assignee, reporter or incident command; log every change.' } },
  { id: 'inc-status', feature: 'Incident Reports', name: 'Closing an incident assigned to someone else', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Status transitions close the book on an incident — check who can perform them.', 'The status endpoint never compares the caller to the assignee.', "As Alice, POST /incident/2/status with status=closed: Bob's open incident is closed without his knowledge."],
    lesson: 'Workflow actions must verify the actor is a legitimate participant in that workflow instance.',
    impact: 'Prematurely closed incidents stop investigations cold; the client believes a threat is handled while it is not.',
    report: { title: 'Unauthorized Incident Closure', severity: 'High', remediation: 'Allow status changes only for assignee, reporter, team lead or admin; require a resolution note.' } },

  /* ---------- Assignments & Workflow (3) ---------- */
  { id: 'wf-reassign', feature: 'Assignments & Workflow', name: 'Reassigning another team’s incident to yourself', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The assign endpoint takes an incident id and a user id — and trusts both.', 'You do not need to be involved in an incident to take it over.', "POST /incident/2/assign with assignee=<your id> from your account: Bob's incident is now yours."],
    lesson: 'Assignment is a privileged workflow action; letting anyone reassign anything breaks accountability and chain of custody.',
    impact: 'Evidence and responsibility can be quietly pulled away from the right team mid-investigation.',
    report: { title: 'Unauthorized Incident Reassignment', severity: 'Medium', remediation: 'Restrict assignment changes to the current assignee, team leads and admins; audit every change.' } },
  { id: 'wf-selfassign', feature: 'Assignments & Workflow', name: 'Self-assigning a restricted incident', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    hints: ['Restricted incidents should not even be visible to other teams — but assignment is a write path nobody guarded.', 'Combine what you learned: the restricted incident is id 3, and the assign endpoint trusts the caller.', 'POST /incident/3/assign with assignee=<your id>: you are now the assignee of the confidential Command investigation.'],
    lesson: 'Write paths into restricted objects are access control too; an assignment makes the outsider an insider.',
    impact: 'Confidentiality of the most sensitive investigation collapses — the attacker legitimises their own access.',
    report: { title: 'Self-Assignment to Restricted Incident Grants Access', severity: 'High', remediation: 'Validate team/role eligibility for the target incident before any assignment; treat restricted objects as invisible to non-members.' } },
  { id: 'wf-escalate', feature: 'Assignments & Workflow', name: 'Escalation triggered by an unauthorized user', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Escalation jumps an incident to P1 and hands it to the Command team — a powerful, paging action.', 'The escalate endpoint checks only that you are signed in.', "As Carol (viewer), POST /incident/1/escalate: the incident is escalated and reassigned without any command authority."],
    lesson: 'High-impact workflow buttons need explicit role authorization — convenience endpoints become sabotage tools.',
    impact: 'False escalations burn out the response team and cry wolf; real P1s then get ignored — or a real one is "escalated away" to hide it.',
    report: { title: 'Unauthorized Incident Escalation', severity: 'Medium', remediation: 'Restrict escalation to responder roles on the owning team and incident command; rate-limit and log escalations.' } },

  /* ---------- Evidence & Attachments (2) ---------- */
  { id: 'ev-idor', feature: 'Evidence & Attachments', name: 'Evidence file download IDOR', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Evidence files are downloaded by file name through /download?file=…', 'The download never asks whether your team may see the incident the file belongs to.', 'Download evidence-3.txt — the confidential mailbox-forensics notes of the restricted Command incident — from your SOC account.'],
    lesson: 'Attachments inherit the sensitivity of their parent record; download endpoints must re-check that record’s permissions.',
    impact: 'Forensic evidence from the most sensitive case can be pulled by any account — leaking investigation details and possibly tipping off the attacker.',
    report: { title: 'Evidence Download Missing Object Authorization', severity: 'High', remediation: 'Authorize every download against the parent incident’s team/restriction before serving the file.' } },
  { id: 'ev-traversal', feature: 'Evidence & Attachments', name: 'Path traversal in evidence download', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The file parameter is joined straight onto the evidence folder path.', 'What happens if the "file name" contains ../ segments?', 'Request /download?file=../server.js: the application source code itself is served.'],
    lesson: 'User-controlled paths must be canonicalised and confined to the intended directory.',
    impact: 'Source code, configuration and potentially secrets on the server become downloadable — the foothold for the next, bigger attack.',
    report: { title: 'Path Traversal in File Download', severity: 'High', remediation: 'Resolve the path, require it to stay inside the evidence directory, and whitelist known files.' } },

  /* ---------- Audit Trail & Postmortems (2) ---------- */
  { id: 'audit-exposure', feature: 'Audit Trail & Postmortems', name: 'Audit trail readable by any user', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The audit trail at /audit records who did what across the whole platform.', 'It should be a command-only tool — check who can actually open it.', 'Any signed-in account, even a viewer, can read the full audit trail including admin actions.'],
    lesson: 'Security telemetry is sensitive data: it reveals investigations, timings and who is watching whom.',
    impact: 'An attacker with a low account can watch the defenders’ every move and learn exactly what has been noticed about them.',
    report: { title: 'Audit Trail Exposed to All Authenticated Users', severity: 'Medium', remediation: 'Restrict audit access to incident command/admin roles; redact sensitive fields.' } },
  { id: 'pm-idor', feature: 'Audit Trail & Postmortems', name: 'Postmortem readable across teams (IDOR)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Postmortems live at predictable URLs: /postmortem/1 …', 'PM-1 belongs to a SOC incident. What stops an Infra account from reading it?', 'Open /postmortem/1 as Bob (Infra): the full postmortem — root cause and lessons — is served without any check.'],
    lesson: 'Documents derived from restricted work need their own authorization checks, not just an unguessable-looking URL.',
    impact: 'Postmortems describe exactly how the client was breached and what was weak — a roadmap for the next attacker if leaked.',
    report: { title: 'Insecure Direct Object Reference on Postmortems', severity: 'Medium', remediation: 'Authorize postmortem reads by incident participation/team; deny cross-team access by default.' } },

  /* ---------- Admin Panel (2) ---------- */
  { id: 'admin-bac', feature: 'Admin Panel', name: 'Admin user dump served to any account', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Admin tooling often hides JSON endpoints next to the HTML pages, like /admin/users.json.', 'This one checks that you are signed in — and nothing else.', 'Open /admin/users.json as a plain responder: every account, including plaintext passwords, is returned.'],
    lesson: 'Every route needs its own authorization check; "the UI doesn’t link it" is not protection.',
    impact: 'The entire credential list of the response team — including the admin’s password — is one request away for any account holder.',
    report: { title: 'Broken Access Control on Admin User Export (Plaintext Passwords)', severity: 'Critical', remediation: 'Require admin role on all admin endpoints; never store or return plaintext passwords.' } },
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'CSRF on admin user deactivation', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    hints: ['Deactivating a user is a state-changing admin POST with no anti-CSRF token.', 'The app’s hx_origin marker cookie is never verified on this endpoint either.', 'As the admin, submit /admin/deactivate for a user without the marker: the account is deactivated by a tokenless request.'],
    lesson: 'Admin actions are the highest-value CSRF targets: one visited page can lock out the response team.',
    impact: 'Tricking one admin into opening a malicious page during an incident could deactivate the responders mid-response.',
    report: { title: 'Missing CSRF Protection on Admin Deactivation', severity: 'High', remediation: 'Require CSRF tokens on all admin actions; use SameSite cookies and verify Origin headers.' } },

  /* ---------- Platform & API (1) ---------- */
  { id: 'api-debug', feature: 'Platform & API', name: 'Unauthenticated /api/debug full data dump', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Developers love leaving a debug endpoint behind. Try /api/debug.', 'This one does not even ask for a login.', 'Open /api/debug with no session at all: users, passwords and incidents are dumped as JSON.'],
    lesson: 'Debug and diagnostics endpoints must never ship to production; if they must exist, they need the strongest authentication of all.',
    impact: 'No account, no password, no problem: the whole platform’s data is public to the internet.',
    report: { title: 'Unauthenticated Debug Endpoint Exposes All Data', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; gate diagnostics behind admin auth and network restrictions.' } },
];

/* completion-shard anchor (part 1 of the completion material lives far below) */
const THEME_B = ['QVJHLVhI', 'VFNBTURO', 'UVMtUkU='];

/* ---------------- seed data (all fake) ---------------- */
const users = [
  { id: 1, name: 'Ada Admin', email: 'admin@hexaincident.local', password: 'admin123', role: 'admin', team: 'Command' },
  { id: 2, name: 'Alice Responder', email: 'alice@hexaincident.local', password: 'alice123', role: 'responder', team: 'SOC' },
  { id: 3, name: 'Bob Responder', email: 'bob@hexaincident.local', password: 'bob123', role: 'responder', team: 'Infra' },
  { id: 4, name: 'Carol Viewer', email: 'carol@hexaincident.local', password: 'carol123', role: 'viewer', team: 'SOC' },
  { id: 5, name: 'Demo Dan', email: 'demo@hexaincident.local', password: 'demo123', role: 'responder', team: 'Infra', demo: true },
];
let nextUserId = 6;
const incidents = [
  { id: 1, title: 'Suspicious outbound traffic from web server', description: 'Workstation WS-114 is beaconing to an unknown external host every 60 seconds. Packet summary attached as evidence.', severity: 'P2', status: 'investigating', reporter: 2, assignee: 2, team: 'SOC', restricted: false },
  { id: 2, title: 'Database failover failure during maintenance', description: 'The scheduled failover drill failed: the standby node did not promote. Customer impact was brief but the root cause is unknown.', severity: 'P3', status: 'open', reporter: 3, assignee: 3, team: 'Infra', restricted: false },
  { id: 3, title: 'Executive mailbox compromise investigation', description: 'CONFIDENTIAL — Command team only. A fictional executive mailbox showed unknown forwarding rules. Marker: EXEC-MAILBOX-SECRET. Evidence EV-3 holds the forensic notes.', severity: 'P1', status: 'investigating', reporter: 1, assignee: 1, team: 'Command', restricted: true },
  { id: 4, title: 'Phishing wave targeting finance staff', description: 'A wave of fake invoice emails reached the finance team. Two users clicked; both endpoints were reimaged. Postmortem PM-1 is complete.', severity: 'P2', status: 'resolved', reporter: 4, assignee: 2, team: 'SOC', restricted: false },
  { id: 5, title: 'Unannounced red-team exercise on VPN gateway', description: 'CONFIDENTIAL — Infra team only. Internal red-team window; do not disclose outside the team.', severity: 'P3', status: 'open', reporter: 3, assignee: 3, team: 'Infra', restricted: true },
];
let nextIncidentId = 6;
const evidenceFiles = [
  { id: 1, incidentId: 1, name: 'evidence-1.txt', label: 'Packet capture summary (EV-1)' },
  { id: 3, incidentId: 3, name: 'evidence-3.txt', label: 'Mailbox forensic notes (EV-3)' },
  { id: 4, incidentId: 4, name: 'evidence-4.txt', label: 'Phishing sample headers (EV-4)' },
];
const postmortems = [
  { id: 1, incidentId: 4, author: 2, title: 'Postmortem PM-1: Phishing wave targeting finance staff', body: 'Root cause: the mail gateway allowed external senders to spoof the internal finance domain. Two users clicked a fake invoice link. Actions taken: gateway rule tightened, endpoints reimaged, staff briefing held. Lesson: attachment sandboxing must be enabled for all inbound mail.' },
];
const auditLog = [
  { at: '2026-10-20 09:14', actor: 'Ada Admin', action: 'Created restricted incident INC-3 (Command team)' },
  { at: '2026-10-20 09:15', actor: 'System', action: 'Evidence EV-3 attached to INC-3' },
  { at: '2026-10-21 11:02', actor: 'Alice Responder', action: 'Updated INC-1 status to investigating' },
  { at: '2026-10-22 08:40', actor: 'Ada Admin', action: 'Reviewed the full user account list in the admin panel' },
];
function audit(actor, action) { auditLog.push({ at: new Date().toISOString().slice(0, 16).replace('T', ' '), actor, action }); }

/* ---------------- progress engine + persistence ---------------- */
let state = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadState() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      state = Object.assign(state, raw);
    }
  } catch (e) { /* corrupted state: start fresh rather than crash */ }
}
function saveState() { try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2)); } catch (e) {} }
loadState();

const FEATURES = [];
for (const t of TESTS) if (!FEATURES.includes(t.feature)) FEATURES.push(t.feature);
function featureTests(f) { return TESTS.filter(t => t.feature === f); }
function doneCount() { return TESTS.filter(t => state.tests[t.id]).length; }
function isComplete() { return doneCount() === TESTS.length; }
function attempt(feature) { state.attempts[feature] = (state.attempts[feature] || 0) + 1; saveState(); }
function pass(id) {
  if (!state.tests[id]) {
    state.tests[id] = true;
    if (isComplete() && !state.keyRevealed) { state.keyRevealed = true; state.completedAt = new Date().toISOString(); }
    saveState();
  }
}

/* ---------------- sessions & request helpers ---------------- */
const sessions = new Map();
let sidSeq = 1;
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) { const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); }
  return out;
}
function sessionUser(req) {
  if (!req) return null;
  const c = parseCookies(req);
  if (c.hx_session && sessions.has(c.hx_session)) return users.find(u => u.id === sessions.get(c.hx_session)) || null;
  return null;
}
function hasMarker(req) { const c = parseCookies(req); return c.hx_origin === 'lab110'; }
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', d => { data += d; if (data.length > 2e6) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(''));
  });
}
function parseForm(raw) {
  const out = {};
  for (const pair of raw.split('&')) { if (!pair) continue; const i = pair.indexOf('='); const k = i < 0 ? pair : pair.slice(0, i); const v = i < 0 ? '' : pair.slice(i + 1); try { out[decodeURIComponent(k.replace(/\+/g, ' '))] = decodeURIComponent(v.replace(/\+/g, ' ')); } catch (e) { out[k] = v; } }
  return out;
}
async function bodyParams(req) {
  const raw = await readBody(req);
  const ct = (req.headers['content-type'] || '');
  if (ct.includes('application/json')) { try { return JSON.parse(raw || '{}'); } catch (e) { return {}; } }
  return parseForm(raw);
}
function redirect(res, loc, extra) {
  const headers = Object.assign({ Location: loc }, extra || {});
  res.writeHead(302, headers); res.end();
}
function baseHeaders(req, res) {
  // the app sets a benign origin marker cookie on its own pages (spec §3 CSRF model)
  res.setHeader('Set-Cookie', 'hx_origin=lab110; Path=/');
}

/* ------------- tiny evaluator for the string-built "SQL" -------------
   The app builds queries like:
     SELECT * FROM users WHERE email = '<input>' AND password = '<input>'
   and this evaluator runs them — faithfully, injections included. */
function evalWhere(row, where) {
  let s = String(where);
  const cut = s.indexOf('--');
  if (cut >= 0) s = s.slice(0, cut);
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === "'") { let j = i + 1, val = ''; while (j < s.length && s[j] !== "'") { val += s[j]; j++; } tokens.push({ t: 'str', v: val }); i = j + 1; continue; }
    if (/[0-9]/.test(ch)) { let j = i, val = ''; while (j < s.length && /[0-9]/.test(s[j])) { val += s[j]; j++; } tokens.push({ t: 'num', v: parseInt(val, 10) }); i = j; continue; }
    if (ch === '=') { tokens.push({ t: 'op', v: '=' }); i++; continue; }
    if (/[A-Za-z_]/.test(ch)) { let j = i, val = ''; while (j < s.length && /[A-Za-z0-9_.]/.test(s[j])) { val += s[j]; j++; } const up = val.toUpperCase(); if (up === 'AND' || up === 'OR') tokens.push({ t: up }); else tokens.push({ t: 'col', v: val.split('.').pop().toLowerCase() }); i = j; continue; }
    i++;
  }
  let pos = 0;
  function operand() {
    const tk = tokens[pos++];
    if (!tk) return '';
    if (tk.t === 'str') return tk.v;
    if (tk.t === 'num') return tk.v;
    if (tk.t === 'col') { const v = row[tk.v]; return v == null ? '' : v; }
    return '';
  }
  function comparison() {
    const a = operand();
    const tk = tokens[pos];
    if (tk && tk.t === 'op') { pos++; const b = operand(); return String(a) === String(b); }
    return !!a;
  }
  function andExpr() { let v = comparison(); while (tokens[pos] && tokens[pos].t === 'AND') { pos++; const r = comparison(); v = v && r; } return v; }
  function orExpr() { let v = andExpr(); while (tokens[pos] && tokens[pos].t === 'OR') { pos++; const r = andExpr(); v = v || r; } return v; }
  try { return orExpr(); } catch (e) { return false; }
}
function runQuery(rows, where) { return rows.filter(r => evalWhere(r, where)); }

/* ---------------- auth attack bookkeeping ---------------- */
const loginFails = new Map();       // email -> failed count (no lockout — that is the flaw)
const probedEmails = new Set();     // distinct emails probed via login/forgot
const issuedResetTokens = new Set();// tokens actually issued through /forgot
function resetTokenFor(u) { return 'HI' + u.id + '-' + (u.id * 137 + 42); }
function noteProbe(email) {
  if (!email) return;
  probedEmails.add(String(email).toLowerCase());
  if (probedEmails.size >= 5) pass('auth-enum');
}
function userById(id) { return users.find(u => u.id === Number(id)) || null; }
function canSeeIncident(u, inc) {
  if (!u) return false;
  if (!inc.restricted) return true;
  return u.role === 'admin' || u.team === inc.team;
}

/* ---------------- key assembly (shards only; assembled at runtime) ---------------- */
const THEME_C = ['LVlGSA==', 'S0ZKNQ==', 'UDBKNg=='];
function assembleFrom(shards) { return shards.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join(''); }
function entryKeyValue() { return assembleFrom(THEME_A.concat(THEME_C)); }

/* ---------------- layout ---------------- */
function layout(req, title, content) {
  const done = doneCount(), total = TESTS.length, pct = Math.floor(done / total * 100);
  const u = req ? sessionUser(req) : null;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)} — HexaIncident</title>
<style>body{font-family:system-ui,Arial,sans-serif;margin:0;background:#0f1420;color:#e8ecf4}
header{background:#131b2e;padding:10px 18px;display:flex;gap:14px;align-items:center;flex-wrap:wrap}
header img{height:34px} a{color:#7db4ff} main{max-width:960px;margin:0 auto;padding:20px}
.bar{flex:1;min-width:180px;background:#26314d;border-radius:6px;height:16px;position:relative}
.bar>i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#2f7bff,#8a3ffc);border-radius:6px}
.card{background:#182238;border:1px solid #2a3757;border-radius:10px;padding:16px;margin:12px 0}
input,select,textarea{background:#0f1626;color:#e8ecf4;border:1px solid #33436b;border-radius:6px;padding:8px;width:100%;box-sizing:border-box;margin:4px 0 10px}
button{background:linear-gradient(90deg,#2f7bff,#8a3ffc);color:#fff;border:0;border-radius:6px;padding:9px 16px;cursor:pointer}
table{width:100%;border-collapse:collapse} td,th{border-bottom:1px solid #2a3757;padding:6px;text-align:left}
.tag{font-size:12px;padding:2px 8px;border-radius:10px;background:#26314d}
#coach{position:fixed;right:14px;bottom:14px;width:320px;background:#182238;border:1px solid #2a3757;border-radius:10px;padding:10px;z-index:50}
#coachlog{height:150px;overflow:auto;font-size:13px;margin-bottom:8px;white-space:pre-wrap}
small{color:#9fb0d0}</style></head><body>
<header><img src="/logo.png" alt="HexaCyberLab"><strong>LAB ${LAB_NUMBER} — ${LAB_NAME}</strong>
<span>LAB ${LAB_NUMBER} · ${done}/${total} tests · ${pct}%</span><div class="bar"><i style="width:${pct}%"></i></div>
<nav>${u ? `<a href="/">Incidents</a> · <a href="/search">Search</a> · <a href="/team">Team</a> · <a href="/audit">Audit trail</a> · <a href="/tests">Mission board</a> · <span>${esc(u.name)} (${esc(u.role)}, ${esc(u.team)})</span> · <a href="/logout">Logout</a>` : `<a href="/login">Login</a> · <a href="/tests">Mission board</a>`}</nav></header>
<main>${content}</main>
<div id="coach"><strong>Lab Coach</strong><div id="coachlog"></div>
<input id="coachin" placeholder="Ask the coach…"><button onclick="askCoach()">Ask</button></div>
<script>
async function askCoach(){const i=document.getElementById('coachin');const log=document.getElementById('coachlog');const m=i.value.trim();if(!m)return;i.value='';log.textContent+='You: '+m+'\n';try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})});const j=await r.json();log.textContent+='Coach: '+j.reply+'\n';}catch(e){log.textContent+='Coach: (unavailable)\n';}log.scrollTop=log.scrollHeight;}
</script></body></html>`;
}
function gatePage() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Locked — LAB ${LAB_NUMBER} ${LAB_NAME}</title>
<style>body{font-family:system-ui,Arial,sans-serif;background:#0f1420;color:#e8ecf4}main{max-width:560px;margin:60px auto;padding:20px}.card{background:#182238;border:1px solid #2a3757;border-radius:10px;padding:20px}input{background:#0f1626;color:#e8ecf4;border:1px solid #33436b;border-radius:6px;padding:9px;width:100%;box-sizing:border-box;margin:8px 0}button{background:linear-gradient(90deg,#2f7bff,#8a3ffc);color:#fff;border:0;border-radius:6px;padding:10px 18px;cursor:pointer}img{height:40px}</style></head><body><main>
<div class="card"><img src="/logo.png" alt="HexaCyberLab"><h1>LAB ${LAB_NUMBER} — ${LAB_NAME}</h1>
<p><strong>Locked — LAB ${LAB_NUMBER} ${LAB_NAME}.</strong> This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
<form method="POST" action="/unlock"><input name="key" placeholder="Completion key from Lab ${LAB_NUMBER - 1}" autocomplete="off"><button type="submit">Unlock lab</button></form>
<p><small>HexaIncident is the final lab of the chain. Its completion key is the Grandmaster key of all 110 labs.</small></p></div>
<div class="card"><strong>Lab Coach</strong><div id="coachlog" style="white-space:pre-wrap;font-size:13px;height:120px;overflow:auto"></div>
<input id="coachin" placeholder="Ask the coach…"><button onclick="askCoach()">Ask</button></div>
<script>async function askCoach(){const i=document.getElementById('coachin');const log=document.getElementById('coachlog');const m=i.value.trim();if(!m)return;i.value='';log.textContent+='You: '+m+'\n';try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})});const j=await r.json();log.textContent+='Coach: '+j.reply+'\n';}catch(e){log.textContent+='Coach: (unavailable)\n';}}</script>
</main></body></html>`;
}

/* ---------------- Lab Coach (POST /api/chat) ---------------- */
function coachReply(message) {
  const msg = String(message || '').toLowerCase();
  const done = doneCount(), total = TESTS.length;
  if (/(who (built|made|created)|founder|your creator|who is behind)/.test(msg)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (/(key|unlock next|grandmaster|password for next)/.test(msg) && /(completion|next|grandmaster|lab 111|final)/.test(msg)) {
    if (isComplete() && state.keyRevealed) return 'You completed LAB ' + LAB_NUMBER + ' — the final lab! Your Grandmaster completion key is: ' + completionKeyValue() + ' — this completes the entire 110-lab chain. Congratulations!';
    return 'I do not have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at ' + done + '/' + total + ' tests (' + Math.floor(done / total * 100) + '%). Finish every test on the Mission Board (/tests) and the key will appear on /complete — and I will be able to share it too.';
  }
  if (/(progress|how am i|status|score)/.test(msg)) {
    const next = TESTS.find(t => !state.tests[t.id]);
    return 'You have completed ' + done + ' of ' + total + ' tests (' + Math.floor(done / total * 100) + '%).' + (next ? ' Next open test: "' + next.name + '" in ' + next.feature + ' — see /tests for its hints.' : ' Everything is done — see /complete and /certificate.');
  }
  // feature-targeted questions
  for (const f of FEATURES) {
    const key = f.toLowerCase();
    const words = key.replace(/[^a-z ]/g, '').split(' ').filter(w => w.length > 2);
    const hit = words.some(w => msg.includes(w)) || msg.includes(key);
    if (!hit) continue;
    const ft = featureTests(f);
    if (/(how many|which|list|count|vulnerabilit|tests in|what tests)/.test(msg) && !/(how|solve|do|exploit|bypass)/.test(msg)) {
      return f + ' has ' + ft.length + ' tests: ' + ft.map(t => t.name + (state.tests[t.id] ? ' (done)' : '')).join('; ') + '.';
    }
    if (/(how|solve|do|exploit|bypass|help|guide)/.test(msg)) {
      const open = ft.filter(t => !state.tests[t.id]);
      if (!open.length) return 'All ' + f + ' tests are already complete — nice work.';
      const tries = state.attempts[f] || 0;
      if (tries >= 3) {
        return 'Step by step for ' + f + ' — start with "' + open[0].name + '": ' + open[0].hints[2] + (open[1] ? ' After that: "' + open[1].name + '": ' + open[1].hints[2] : '');
      }
      return 'That feature is locked for help. First try the ' + f + ' tests yourself at least 3 times — I can see you\'ve tried ' + tries + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
    }
    return f + ' has ' + ft.length + ' tests (' + ft.filter(t => state.tests[t.id]).length + ' done). Ask me "how do I solve the ' + f + ' tests" once you have tried them a few times.';
  }
  if (/(feature|features|categories|map|overview)/.test(msg)) {
    return 'This lab has ' + FEATURES.length + ' features and ' + total + ' tests: ' + FEATURES.map(f => f + ' (' + featureTests(f).length + ')').join(', ') + '. The full map is on /tests — test names and hints are public; step-by-step help unlocks after 3 tries per feature.';
  }
  if (/(hi|hello|hey|start|begin)/.test(msg)) {
    return 'Welcome to LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ', the final lab. It has ' + FEATURES.length + ' features and ' + total + ' tests; you are at ' + done + '/' + total + '. Open /tests for the Mission Board, try each feature at least 3 times, then ask me for step-by-step help.';
  }
  return 'I can help with this lab\'s map and — after you have tried a feature at least 3 times — step-by-step guidance. Try: "which features are there", "how many tests in Login & Authentication", "what is my progress", or ask who built these labs. The Mission Board is at /tests.';
}

/* ---------------- pages: auth ---------------- */
function loginPage(err) {
  return layout(null, 'Login', `<h1>HexaIncident — sign in</h1>
<div class="card"><form method="POST" action="/login">
<label>Work email</label><input name="email" type="email" required>
<label>Password</label><input name="password" type="password" required>
<button type="submit">Sign in</button></form>
${err ? `<p style="color:#ff8080">${esc(err)}</p>` : ''}
<p><small>Demo account for evaluation: <b>demo@hexaincident.local</b> / <b>demo123</b> (responder, Infra team).</small></p>
<p><a href="/register">Register a responder account</a> · <a href="/forgot">Forgot password</a></p></div>`);
}
function registerPage(err) {
  return layout(null, 'Register', `<h1>Create your responder account</h1>
<div class="card"><form method="POST" action="/register">
<label>Display name</label><input name="name" required>
<label>Work email</label><input name="email" type="email" required>
<label>Password</label><input name="password" type="password" required>
<label>Team</label><select name="team"><option>SOC</option><option>Infra</option><option>Command</option></select>
<button type="submit">Create account</button></form>
${err ? `<p style="color:#ff8080">${esc(err)}</p>` : ''}</div>`);
}
function forgotPage(msg) {
  return layout(null, 'Forgot password', `<h1>Reset your password</h1>
<div class="card"><form method="POST" action="/forgot">
<label>Work email</label><input name="email" type="email" required>
<button type="submit">Send reset token</button></form>
${msg ? `<p>${esc(msg)}</p>` : ''}
<form method="POST" action="/reset">
<label>Work email</label><input name="email" type="email" required>
<label>Reset token</label><input name="token" required>
<label>New password</label><input name="newpassword" type="password" required>
<button type="submit">Set new password</button></form></div>`);
}

/* ---------------- pages: business ---------------- */
function incidentRow(u, inc) {
  const reporter = userById(inc.reporter), assignee = userById(inc.assignee);
  return `<tr><td><a href="/incident/${inc.id}">INC-${inc.id}</a></td><td>${esc(inc.title)}${inc.restricted ? ' <span class="tag">restricted</span>' : ''}</td><td>${esc(inc.severity)}</td><td>${esc(inc.status)}</td><td>${esc(inc.team)}</td><td>${esc(reporter ? reporter.name : '?')}</td><td>${esc(assignee ? assignee.name : '?')}</td></tr>`;
}
function homePage(req, u) {
  const rows = incidents.filter(i => canSeeIncident(u, i)).map(i => incidentRow(u, i)).join('');
  return layout(req, 'Incidents', `<h1>Incident board</h1>
<div class="card"><table><tr><th>ID</th><th>Title</th><th>Severity</th><th>Status</th><th>Team</th><th>Reporter</th><th>Assignee</th></tr>${rows}</table>
<p><small>Restricted incidents from other teams are hidden here. Signed in as ${esc(u.name)} — ${esc(u.role)}, ${esc(u.team)} team.</small></p></div>
<div class="card"><h3>Report a new incident</h3><form method="POST" action="/incident/new">
<label>Title</label><input name="title" required>
<label>Description</label><textarea name="description" rows="3"></textarea>
<label>Severity</label><select name="severity"><option>P1</option><option>P2</option><option selected>P3</option><option>P4</option></select>
<button type="submit">Create incident</button></form></div>`);
}
function incidentPage(req, u, inc) {
  const reporter = userById(inc.reporter), assignee = userById(inc.assignee);
  const ev = evidenceFiles.filter(e => e.incidentId === inc.id);
  const evHtml = ev.length ? '<h3>Evidence</h3>' + ev.map(e => `<p>${esc(e.label)} — <a href="/download?file=${encodeURIComponent(e.name)}">download</a></p>`).join('') : '';
  const names = users.map(x => `<option value="${x.id}"${x.id === inc.assignee ? ' selected' : ''}>${esc(x.name)}</option>`).join('');
  return layout(req, 'INC-' + inc.id, `<h1>INC-${inc.id}: ${esc(inc.title)}</h1>
<div class="card"><p>${esc(inc.description)}</p>
<table><tr><td>Severity</td><td>${esc(inc.severity)}</td></tr><tr><td>Status</td><td>${esc(inc.status)}</td></tr>
<tr><td>Team</td><td>${esc(inc.team)}</td></tr><tr><td>Reporter</td><td>${esc(reporter ? reporter.name : '?')}</td></tr>
<tr><td>Assignee</td><td>${esc(assignee ? assignee.name : '?')}</td></tr><tr><td>Visibility</td><td>${inc.restricted ? 'Restricted (' + esc(inc.team) + ' + Command)' : 'All responders'}</td></tr></table>${evHtml}</div>
<div class="card"><h3>Edit incident</h3><form method="POST" action="/incident/${inc.id}/edit">
<label>Title</label><input name="title" value="${esc(inc.title)}">
<label>Description</label><textarea name="description" rows="3">${esc(inc.description)}</textarea>
<button type="submit">Save changes</button></form></div>
<div class="card"><h3>Workflow</h3>
<form method="POST" action="/incident/${inc.id}/severity"><label>Set severity</label><select name="severity"><option>P1</option><option>P2</option><option>P3</option><option>P4</option></select><button type="submit">Update severity</button></form>
<form method="POST" action="/incident/${inc.id}/status"><label>Set status</label><select name="status"><option>open</option><option>investigating</option><option>resolved</option><option>closed</option></select><button type="submit">Update status</button></form>
<form method="POST" action="/incident/${inc.id}/assign"><label>Assign to</label><select name="assignee">${names}</select><button type="submit">Assign</button></form>
<form method="POST" action="/incident/${inc.id}/escalate"><button type="submit">Escalate to Command (P1)</button></form></div>`);
}
function searchPage(req, u, q, results) {
  const rows = results ? results.map(i => incidentRow(u, i)).join('') : '';
  return layout(req, 'Search', `<h1>Search incidents</h1>
<div class="card"><form method="GET" action="/search"><label>Keyword</label><input name="q" value="${q == null ? '' : q}"><button type="submit">Search</button></form>
${q != null ? `<p>Results for: ${q}</p>` : ''}
${results ? `<table><tr><th>ID</th><th>Title</th><th>Severity</th><th>Status</th><th>Team</th><th>Reporter</th><th>Assignee</th></tr>${rows}</table>` : ''}</div>`);
}
function teamPage(req, u) {
  const rows = users.map(x => `<tr><td>${x.name}</td><td>${esc(x.email)}</td><td>${esc(x.role)}</td><td>${esc(x.team)}</td></tr>`).join('');
  return layout(req, 'Team', `<h1>Response team directory</h1>
<div class="card"><table><tr><th>Name</th><th>Email</th><th>Role</th><th>Team</th></tr>${rows}</table></div>
<div class="card"><h3>Your profile</h3><form method="POST" action="/profile/update">
<label>Display name</label><input name="name" value="${esc(u.name)}">
<label>Email</label><input name="email" value="${esc(u.email)}">
<button type="submit">Update profile</button></form></div>`);
}
function auditPage(req, u) {
  const rows = auditLog.map(a => `<tr><td>${esc(a.at)}</td><td>${esc(a.actor)}</td><td>${esc(a.action)}</td></tr>`).join('');
  return layout(req, 'Audit trail', `<h1>Platform audit trail</h1>
<div class="card"><table><tr><th>When</th><th>Actor</th><th>Action</th></tr>${rows}</table></div>`);
}
function postmortemPage(req, u, pm) {
  const author = userById(pm.author);
  return layout(req, 'Postmortem', `<h1>${esc(pm.title)}</h1>
<div class="card"><p><small>Author: ${esc(author ? author.name : '?')} · Linked incident INC-${pm.incidentId}</small></p><p>${esc(pm.body)}</p></div>`);
}
function adminPage(req, u) {
  const rows = users.map(x => `<tr><td>${x.id}</td><td>${x.name}</td><td>${esc(x.email)}</td><td>${esc(x.password)}</td><td>${esc(x.role)}</td><td>${esc(x.team)}</td><td>${x.active === false ? 'deactivated' : 'active'}</td></tr>`).join('');
  return layout(req, 'Admin', `<h1>Admin panel — accounts</h1>
<div class="card"><table><tr><th>ID</th><th>Name</th><th>Email</th><th>Password</th><th>Role</th><th>Team</th><th>Status</th></tr>${rows}</table></div>
<div class="card"><h3>Deactivate a user</h3><form method="POST" action="/admin/deactivate">
<label>User ID</label><input name="userId"><button type="submit">Deactivate</button></form></div>`);
}

/* ---------------- pages: lab system ---------------- */
function testsPage(req) {
  const done = doneCount(), pct = Math.floor(done / TESTS.length * 100);
  let html = `<h1>Mission Board — LAB ${LAB_NUMBER} ${LAB_NAME}</h1><p>${done}/${TESTS.length} tests · ${pct}% · Progress and attempts persist across restarts. The Lab Coach unlocks step-by-step help for a feature after 3 genuine attempts on it.</p>`;
  for (const f of FEATURES) {
    const ft = featureTests(f), tries = state.attempts[f] || 0;
    html += `<div class="card"><h2>${esc(f)} <small>(${ft.filter(t => state.tests[t.id]).length}/${ft.length} done · ${tries} attempt(s) on this feature)</small></h2>`;
    for (const t of ft) {
      const st = state.tests[t.id] ? '✓ done' : '○ open';
      html += `<div style="border-top:1px solid #2a3757;padding:8px 0"><strong>${st} — ${esc(t.name)}</strong> <span class="tag">${esc(t.owasp)}</span> <span class="tag">${esc(t.difficulty)}</span>
<details><summary>Hints</summary><ol>${t.hints.map(h => `<li>${esc(h)}</li>`).join('')}</ol></details></div>`;
    }
    html += '</div>';
  }
  return layout(req, 'Mission Board', html);
}
function completePage(req) {
  const done = doneCount();
  if (!isComplete()) {
    const left = TESTS.filter(t => !state.tests[t.id]).map(t => `<li>${esc(t.name)} (${esc(t.feature)})</li>`).join('');
    return layout(req, 'Complete', `<h1>Not complete yet</h1><div class="card"><p>You have finished ${done}/${TESTS.length} tests (${Math.floor(done / TESTS.length * 100)}%). Still open:</p><ul>${left}</ul><p><a href="/tests">Open the Mission Board</a></p></div>`);
  }
  const key = completionKeyValue();
  const perFeature = FEATURES.map(f => `<tr><td>${esc(f)}</td><td>${featureTests(f).length}</td></tr>`).join('');
  const techniques = TESTS.map(t => `<li>${esc(t.name)} — ${esc(t.feature)}</li>`).join('');
  const lessons = TESTS.map(t => `<li><strong>${esc(t.name)}:</strong> ${esc(t.lesson)}</li>`).join('');
  const impacts = TESTS.map(t => `<li><strong>${esc(t.name)}:</strong> ${esc(t.impact)}</li>`).join('');
  const reports = TESTS.map(t => `<li><strong>${esc(t.report.title)}</strong> — Severity: ${esc(t.report.severity)}. Remediation: ${esc(t.report.remediation)}</li>`).join('');
  return layout(req, 'Complete', `<h1>LAB ${LAB_NUMBER} — ${LAB_NAME}: 100% complete</h1>
<div class="card"><h2>1) Features in this lab</h2><p>Total features: ${FEATURES.length}</p><table><tr><th>Feature</th><th>Tests</th></tr>${perFeature}</table></div>
<div class="card"><h2>2) Vulnerabilities per feature</h2><p>Every feature above carries its own set of tests — ${TESTS.length} scored tests in total, listed per feature in section 1 and by technique in section 3.</p></div>
<div class="card"><h2>3) Ways testing was done (${TESTS.length} techniques)</h2><ul>${techniques}</ul></div>
<div class="card"><h2>4) What you learned</h2><ul>${lessons}</ul></div>
<div class="card"><h2>5) What this means for a real client</h2><ul>${impacts}</ul></div>
<div class="card"><h2>6) Writing it in a real report</h2><ul>${reports}</ul></div>
<div class="card"><h2>Your Grandmaster completion key</h2>
<p>This is the final lab of the 110-lab chain. Your completion key — the Grandmaster key:</p>
<p style="font-size:20px"><code>${esc(key)}</code></p>
<form method="POST" action="/complete/name"><label>Your name for the certificate</label><input name="testerName" value="${esc(state.testerName || '')}"><button type="submit">Save name</button></form>
<p><a href="/certificate">Open your certificate</a></p></div>`);
}
function certificatePage(req) {
  if (!isComplete()) return layout(req, 'Certificate', `<h1>Certificate locked</h1><div class="card"><p>Finish all ${TESTS.length} tests to unlock your certificate. Current progress: ${doneCount()}/${TESTS.length}.</p></div>`);
  const name = state.testerName || 'HexaCyberLab Tester';
  const date = state.completedAt ? state.completedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER}</title>
<style>body{font-family:Georgia,serif;background:#f4f1ea;color:#16233d}.cert{max-width:720px;margin:40px auto;background:#fff;border:3px solid #16233d;padding:36px;text-align:center}@media print{body{background:#fff}}</style></head><body>
<div class="cert"><img src="/logo.png" alt="HexaCyberLab" style="height:64px">
<h1>Certificate of Completion</h1><p>This certifies that</p><h2>${esc(name)}</h2>
<p>has completed 100% of the security tests in LAB ${LAB_NUMBER} — ${LAB_NAME} (${TESTS.length} tests across ${FEATURES.length} features)</p>
<p>Completed on ${esc(date)}</p><p><strong>HexaCyberLab — Built by Md. Jony Hassain, Founder</strong></p></div></body></html>`;
}

/* completion material, second half — assembled only at 100% */
const THEME_D = ['VllCTjQ=', 'NjlMLVQ=', 'OUFGOEE='];
function completionKeyValue() { return assembleFrom(THEME_B.concat(THEME_D)); }

/* ---------------- router ---------------- */
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://127.0.0.1:' + PORT);
    const p = u.pathname;
    const method = req.method;

    if (p === '/logo.png') { res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(fs.readFileSync(path.join(ROOT, 'logo.png'))); }

    if (p === '/api/chat' && method === 'POST') {
      const params = await bodyParams(req);
      let reply;
      try { reply = coachReply(params.message || ''); } catch (e) { reply = 'I can help with this lab\'s map, your progress, and — after 3 tries on a feature — step-by-step guidance. See /tests.'; }
      res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ reply }));
    }
    if (p === '/api/progress' && method === 'GET') {
      const features = {};
      for (const f of FEATURES) { const ft = featureTests(f); features[f] = { total: ft.length, done: ft.filter(t => state.tests[t.id]).length, attempts: state.attempts[f] || 0 }; }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done: doneCount(), pct: Math.floor(doneCount() / TESTS.length * 100), features, complete: isComplete() }));
    }

    /* gate */
    if (!state.unlocked) {
      if (p === '/unlock' && method === 'POST') {
        const params = await bodyParams(req);
        if (String(params.key || '') === entryKeyValue()) { state.unlocked = true; saveState(); return redirect(res, '/'); }
        res.writeHead(403, { 'Content-Type': 'text/html' }); return res.end(gatePage());
      }
      res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(gatePage());
    }

    if (p === '/tests') { baseHeaders(req, res); res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(testsPage(req)); }
    if (p === '/complete') { baseHeaders(req, res); res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(completePage(req)); }
    if (p === '/complete/name' && method === 'POST') { const params = await bodyParams(req); state.testerName = String(params.testerName || '').slice(0, 80); saveState(); return redirect(res, '/complete'); }
    if (p === '/certificate') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(certificatePage(req)); }

    /* platform exposure: no session required at all */
    if (p === '/api/debug') {
      attempt('Platform & API'); pass('api-debug');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ debug: true, users, incidents, postmortems, auditLog }, null, 2));
    }

    /* ---- auth routes ---- */
    if (p === '/login' && method === 'GET') { baseHeaders(req, res); res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(loginPage()); }
    if (p === '/login' && method === 'POST') {
      const params = await bodyParams(req);
      attempt('Login & Authentication');
      const email = String(params.email || ''), password = String(params.password || '');
      noteProbe(email);
      const where = "email = '" + email + "' AND password = '" + password + "'";
      const rows = runQuery(users.filter(x => x.active !== false), where);
      const user = rows[0];
      const injected = /'|\bOR\b|--/i.test(email + ' ' + password);
      if (user) {
        if (injected && user.password !== password) pass('auth-sqli');
        if (user.demo) pass('auth-demo');
        const sid = 's' + (sidSeq++) + 'x' + Date.now().toString(36);
        sessions.set(sid, user.id);
        audit(user.name, 'Signed in');
        return redirect(res, '/', { 'Set-Cookie': ['hx_session=' + sid + '; Path=/; HttpOnly', 'hx_role=' + user.role + '; Path=/', 'hx_origin=lab110; Path=/'] });
      }
      const exists = users.some(x => x.email.toLowerCase() === email.toLowerCase());
      if (exists) {
        const n = (loginFails.get(email.toLowerCase()) || 0) + 1;
        loginFails.set(email.toLowerCase(), n);
        if (n >= 10) pass('auth-brute');
        res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(loginPage('Incorrect password.'));
      }
      res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(loginPage('No account with that email.'));
    }
    if (p === '/logout') { const c = parseCookies(req); if (c.hx_session) sessions.delete(c.hx_session); return redirect(res, '/login', { 'Set-Cookie': 'hx_session=; Path=/; Max-Age=0' }); }
    if (p === '/register' && method === 'GET') { baseHeaders(req, res); res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(registerPage()); }
    if (p === '/register' && method === 'POST') {
      const params = await bodyParams(req);
      attempt('Registration & Profile');
      const name = String(params.name || ''), email = String(params.email || ''), password = String(params.password || '');
      if (!name || !email || !password) { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(registerPage('All fields are required.')); }
      if (users.some(x => x.email.toLowerCase() === email.toLowerCase())) { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(registerPage('That email is already registered.')); }
      const nu = { id: nextUserId++, name, email, password, role: 'responder', team: String(params.team || 'SOC') };
      for (const k of Object.keys(params)) { if (!['name', 'email', 'password', 'team'].includes(k)) nu[k] = params[k]; } // mass assignment: extra fields bind too
      users.push(nu);
      if (password.length < 4) pass('reg-weak');
      if (nu.role === 'admin') pass('reg-mass');
      if (/<script|onerror=|onload=|<svg|<img/i.test(name)) pass('reg-xss');
      audit(nu.name, 'Registered an account');
      const sid = 's' + (sidSeq++) + 'x' + Date.now().toString(36);
      sessions.set(sid, nu.id);
      return redirect(res, '/', { 'Set-Cookie': ['hx_session=' + sid + '; Path=/; HttpOnly', 'hx_role=' + nu.role + '; Path=/', 'hx_origin=lab110; Path=/'] });
    }
    if (p === '/forgot' && method === 'GET') { baseHeaders(req, res); res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(forgotPage()); }
    if (p === '/forgot' && method === 'POST') {
      const params = await bodyParams(req);
      attempt('Login & Authentication');
      const email = String(params.email || '');
      noteProbe(email);
      const user = users.find(x => x.email.toLowerCase() === email.toLowerCase());
      res.writeHead(200, { 'Content-Type': 'text/html' });
      if (user) { const tok = resetTokenFor(user); issuedResetTokens.add(tok); return res.end(forgotPage('Reset token issued for that account: ' + tok + ' (in a real system this would be emailed).')); }
      return res.end(forgotPage('No account uses that email address.'));
    }
    if (p === '/reset' && method === 'POST') {
      const params = await bodyParams(req);
      attempt('Login & Authentication');
      const email = String(params.email || ''), token = String(params.token || ''), np = String(params.newpassword || '');
      const user = users.find(x => x.email.toLowerCase() === email.toLowerCase());
      res.writeHead(200, { 'Content-Type': 'text/html' });
      if (user && token === resetTokenFor(user) && np) {
        if (!issuedResetTokens.has(token)) pass('auth-reset');
        user.password = np;
        audit(user.name, 'Password reset completed');
        return res.end(forgotPage('Password updated. You can now sign in.'));
      }
      return res.end(forgotPage('Invalid reset token.'));
    }

    const me = sessionUser(req);
    if (!me) return redirect(res, '/login');
    baseHeaders(req, res);

    if (p === '/' && method === 'GET') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(homePage(req, me)); }
    if (p === '/incident/new' && method === 'POST') {
      const params = await bodyParams(req);
      attempt('Incident Reports');
      const inc = { id: nextIncidentId++, title: String(params.title || 'Untitled incident'), description: String(params.description || ''), severity: String(params.severity || 'P3'), status: 'open', reporter: me.id, assignee: me.id, team: me.team, restricted: false };
      incidents.push(inc); audit(me.name, 'Created incident INC-' + inc.id);
      return redirect(res, '/incident/' + inc.id);
    }
    if (p === '/search' && method === 'GET') {
      const q = u.searchParams.get('q');
      if (q == null) { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(searchPage(req, me, null, null)); }
      attempt('Search & Discovery');
      const where = "title = '" + q + "' OR description = '" + q + "'";
      // note: the string-built search matches by substring below; the injection path widens it to everything
      let results;
      if (/'|\bOR\b|--/i.test(q)) { results = runQuery(incidents, where).length ? runQuery(incidents, where) : incidents.slice(); if (/'\s*OR\s*'1'\s*=\s*'1/i.test(q)) results = incidents.slice(); }
      else { const needle = q.toLowerCase(); results = incidents.filter(i => canSeeIncident(me, i) && (i.title.toLowerCase().includes(needle) || i.description.toLowerCase().includes(needle))); }
      if (results.some(i => i.restricted && !canSeeIncident(me, i))) pass('search-sqli');
      const bodyHtml = searchPage(req, me, q, results);
      if (/<script|onerror=|onload=|<svg|<img/i.test(q) && bodyHtml.includes(q)) pass('search-xss');
      res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(bodyHtml);
    }
    if (p === '/team' && method === 'GET') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(teamPage(req, me)); }
    if (p === '/profile/update' && method === 'POST') {
      const params = await bodyParams(req);
      attempt('Registration & Profile');
      const csrf = !hasMarker(req);
      if (params.name) { me.name = String(params.name); if (/<script|onerror=|onload=|<svg|<img/i.test(me.name)) pass('reg-xss'); }
      if (params.email) me.email = String(params.email);
      if (csrf) pass('reg-csrf');
      audit(me.name, 'Updated profile');
      return redirect(res, '/team');
    }
    if (p === '/audit' && method === 'GET') {
      attempt('Audit Trail & Postmortems');
      if (me.role !== 'admin') pass('audit-exposure');
      res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(auditPage(req, me));
    }
    const pmMatch = p.match(/^\/postmortem\/(\d+)$/);
    if (pmMatch && method === 'GET') {
      attempt('Audit Trail & Postmortems');
      const pm = postmortems.find(x => x.id === Number(pmMatch[1]));
      if (!pm) { res.writeHead(404, { 'Content-Type': 'text/html' }); return res.end(layout(req, 'Not found', '<h1>404</h1>')); }
      const inc = incidents.find(i => i.id === pm.incidentId);
      const participant = inc && (inc.reporter === me.id || inc.assignee === me.id || pm.author === me.id || me.team === inc.team || me.role === 'admin');
      if (!participant) pass('pm-idor');
      res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(postmortemPage(req, me, pm));
    }
    if (p === '/download' && method === 'GET') {
      attempt('Evidence & Attachments');
      const file = u.searchParams.get('file') || '';
      const target = path.normalize(path.join(FILES_DIR, file));
      if (!target.startsWith(FILES_DIR) && fs.existsSync(target)) {
        pass('ev-traversal');
        res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end(fs.readFileSync(target));
      }
      const rec = evidenceFiles.find(e => e.name === file);
      if (rec) {
        const inc = incidents.find(i => i.id === rec.incidentId);
        if (inc && inc.restricted && me.role !== 'admin' && me.team !== inc.team) pass('ev-idor');
        const fp = path.join(FILES_DIR, rec.name);
        if (fs.existsSync(fp)) { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end(fs.readFileSync(fp)); }
      }
      res.writeHead(404, { 'Content-Type': 'text/html' }); return res.end(layout(req, 'Not found', '<h1>404 — file not found</h1>'));
    }
    if (p === '/admin' && method === 'GET') {
      attempt('Admin Panel');
      const c = parseCookies(req);
      if (c.hx_role !== 'admin' && me.role !== 'admin') { res.writeHead(403, { 'Content-Type': 'text/html' }); return res.end(layout(req, 'Forbidden', '<h1>403 — admin role required</h1>')); }
      if (me.role !== 'admin') pass('auth-cookie');
      res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(adminPage(req, me));
    }
    if (p === '/admin/users.json' && method === 'GET') {
      attempt('Admin Panel');
      if (me.role !== 'admin') pass('admin-bac');
      res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(users, null, 2));
    }
    if (p === '/admin/deactivate' && method === 'POST') {
      const params = await bodyParams(req);
      attempt('Admin Panel');
      const c = parseCookies(req);
      if (c.hx_role !== 'admin' && me.role !== 'admin') { res.writeHead(403, { 'Content-Type': 'text/html' }); return res.end(layout(req, 'Forbidden', '<h1>403 — admin role required</h1>')); }
      const target = userById(params.userId);
      if (target) { target.active = false; audit(me.name, 'Deactivated user ' + target.email); if (!hasMarker(req)) pass('admin-csrf'); }
      return redirect(res, '/admin');
    }
    const incMatch = p.match(/^\/incident\/(\d+)$/);
    if (incMatch && method === 'GET') {
      attempt('Incident Reports');
      const inc = incidents.find(i => i.id === Number(incMatch[1]));
      if (!inc) { res.writeHead(404, { 'Content-Type': 'text/html' }); return res.end(layout(req, 'Not found', '<h1>404</h1>')); }
      if (inc.restricted && me.role !== 'admin' && me.team !== inc.team) pass('inc-idor');
      res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(incidentPage(req, me, inc));
    }
    const actMatch = p.match(/^\/incident\/(\d+)\/(edit|severity|status|assign|escalate)$/);
    if (actMatch && method === 'POST') {
      const params = await bodyParams(req);
      const inc = incidents.find(i => i.id === Number(actMatch[1]));
      if (!inc) { res.writeHead(404, { 'Content-Type': 'text/html' }); return res.end(layout(req, 'Not found', '<h1>404</h1>')); }
      const action = actMatch[2];
      if (action === 'edit') {
        attempt('Incident Reports');
        if (params.title) inc.title = String(params.title);
        if (params.description) inc.description = String(params.description);
        if (inc.reporter !== me.id && inc.assignee !== me.id && me.role !== 'admin') pass('inc-edit');
        audit(me.name, 'Edited INC-' + inc.id);
      } else if (action === 'severity') {
        attempt('Incident Reports');
        const before = inc.severity;
        inc.severity = String(params.severity || inc.severity);
        if (inc.severity !== before && inc.assignee !== me.id && me.role !== 'admin') pass('inc-severity');
        audit(me.name, 'Changed INC-' + inc.id + ' severity to ' + inc.severity);
      } else if (action === 'status') {
        attempt('Incident Reports');
        inc.status = String(params.status || inc.status);
        if ((inc.status === 'closed' || inc.status === 'resolved') && inc.assignee !== me.id && me.role !== 'admin') pass('inc-status');
        audit(me.name, 'Set INC-' + inc.id + ' status to ' + inc.status);
      } else if (action === 'assign') {
        attempt('Assignments & Workflow');
        const newAssignee = Number(params.assignee);
        const wasAssignee = inc.assignee;
        inc.assignee = newAssignee;
        if (inc.restricted && newAssignee === me.id && me.team !== inc.team && me.role !== 'admin') pass('wf-selfassign');
        else if (wasAssignee !== me.id && me.role !== 'admin') pass('wf-reassign');
        audit(me.name, 'Assigned INC-' + inc.id + ' to user ' + newAssignee);
      } else if (action === 'escalate') {
        attempt('Assignments & Workflow');
        inc.severity = 'P1'; inc.team = 'Command';
        if (inc.assignee !== me.id && me.role !== 'admin') pass('wf-escalate');
        audit(me.name, 'Escalated INC-' + inc.id + ' to Command');
      }
      return redirect(res, '/incident/' + inc.id);
    }

    res.writeHead(404, { 'Content-Type': 'text/html' });
    return res.end(layout(req, 'Not found', '<h1>404 — page not found</h1>'));
  } catch (e) {
    try { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ reply: 'The lab hit a snag but is still running — try /tests.' })); } catch (e2) {}
  }
});

/* ---------------- docs generation (from the TESTS registry) ---------------- */
function genDocs() {
  const byFeature = {};
  for (const t of TESTS) { (byFeature[t.feature] = byFeature[t.feature] || []).push(t); }
  let vuln = '# HexaIncident — Vulnerability Map (LAB ' + LAB_NUMBER + ')\n\nEvery scored test in the lab, grouped by feature. ' + TESTS.length + ' tests across ' + FEATURES.length + ' features. This is the lab\'s complete map.\n';
  for (const f of FEATURES) {
    vuln += '\n## ' + f + '\n';
    for (const t of byFeature[f]) vuln += '\n### ' + t.name + '\n- OWASP: ' + t.owasp + '\n- Difficulty: ' + t.difficulty + '\n- Impact: ' + t.impact + '\n- Report title: ' + t.report.title + ' (' + t.report.severity + ')\n';
  }
  fs.writeFileSync(path.join(ROOT, 'VULNERABILITIES.md'), vuln);
  const order = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  let guide = '# HexaIncident — Practice Guide (LAB ' + LAB_NUMBER + ')\n\nChallenges grouped by feature, then difficulty. Each has graded hints and a measurable objective: the test completes only when the server sees the real effect.\n';
  for (const f of FEATURES) {
    guide += '\n## ' + f + '\n';
    for (const t of byFeature[f].slice().sort((a, b) => order[a.difficulty] - order[b.difficulty])) {
      guide += '\n### [' + t.difficulty + '] ' + t.name + '\n- Objective: make the "' + t.name + '" test flip to done on the Mission Board (/tests) by performing the real exploit.\n- Hints:\n  1. ' + t.hints[0] + '\n  2. ' + t.hints[1] + '\n  3. ' + t.hints[2] + '\n';
    }
  }
  fs.writeFileSync(path.join(ROOT, 'PRACTICE-GUIDE.md'), guide);
  let fix = '# HexaIncident — Fix & Retest Guide (LAB ' + LAB_NUMBER + ')\n\nFor every test: the secure implementation and a regression check. After fixing, re-run the exploit — it must fail — then confirm the normal flow still works.\n';
  for (const f of FEATURES) {
    fix += '\n## ' + f + '\n';
    for (const t of byFeature[f]) fix += '\n### ' + t.report.title + '\n- Severity: ' + t.report.severity + '\n- Secure implementation: ' + t.report.remediation + '\n- Regression test: repeat the original exploit for "' + t.name + '"; it must no longer succeed, and legitimate users must still complete the same workflow.\n';
  }
  fs.writeFileSync(path.join(ROOT, 'FIX-AND-RETEST.md'), fix);
  console.log('docs generated: ' + TESTS.length + ' tests');
}
if (process.argv.includes('--gen-docs')) { genDocs(); process.exit(0); }

server.listen(PORT, '127.0.0.1', () => { console.log(LAB_NAME + ' (LAB ' + LAB_NUMBER + ') listening on http://127.0.0.1:' + PORT); });
