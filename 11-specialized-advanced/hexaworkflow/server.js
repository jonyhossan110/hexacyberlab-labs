'use strict';
/*
 * HexaWorkflow — LAB 109 (Category 11: Specialized & Advanced Business Systems)
 * A deliberately vulnerable workflow-automation platform for local security training.
 * Zero-dependency Node.js. Binds 127.0.0.1:3118 only. All data is fake seed data.
 * WARNING: intentionally insecure. Never deploy publicly.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3118;
const LAB_NUMBER = 109;
const LAB_NAME = 'HexaWorkflow';
const PREV_LAB = 108;
const DIR = __dirname;

// --- key material, region A (shards; assembled at runtime, never stored whole) ---
const _e0 = "TC1YSA==";
const _c0 = "TC1YSA==";

// ---------------------------------------------------------------- seed data
const users = [
  { id: 1, name: 'Ada Admin',    email: 'admin@hexaworkflow.local', pass: 'admin123', role: 'admin',  ws: 1, wsRole: 'owner',  plan: 'pro',  apiKey: 'hwk_admin_9c41be' },
  { id: 2, name: 'Alice Avery',  email: 'alice@test.local',         pass: 'alice123', role: 'editor', ws: 1, wsRole: 'owner',  plan: 'pro',  apiKey: 'hwk_alice_5f3d2a' },
  { id: 3, name: 'Bob Barker',   email: 'bob@test.local',           pass: 'bob123',   role: 'editor', ws: 2, wsRole: 'owner',  plan: 'pro',  apiKey: 'hwk_bob_71aa09' },
  { id: 4, name: 'Carol Chen',   email: 'carol@test.local',         pass: 'carol123', role: 'viewer', ws: 1, wsRole: 'member', plan: 'free', apiKey: 'hwk_carol_3d77c1' },
  { id: 5, name: 'Dave Demo',    email: 'dave@test.local',          pass: 'demo123',  role: 'viewer', ws: 2, wsRole: 'member', plan: 'free', apiKey: 'hwk_dave_48be20' },
];
let nextUserId = 6;

const workspaces = [
  { id: 1, name: 'Acme Ops' },
  { id: 2, name: 'Globex Labs' },
];

// --- key material, region B ---
const _e1 = "LTkwMQ==";
const _c1 = "LTAxMQ==";

const workflows = [
  { id: 1, name: 'Welcome Email',        ws: 1, ownerId: 2, trigger: 'New signup',      actionType: 'email',   actionConfig: 'Send the standard welcome email',        active: true,  priv: false },
  { id: 2, name: 'Nightly Data Sync',    ws: 1, ownerId: 2, trigger: 'Schedule 02:00',  actionType: 'webhook', actionConfig: 'https://hooks.acme.example/sync',        active: true,  priv: false },
  { id: 3, name: 'Invoice Chaser',       ws: 2, ownerId: 3, trigger: 'Invoice overdue', actionType: 'email',   actionConfig: 'Send a payment reminder email',          active: true,  priv: false },
  { id: 4, name: 'Payroll Export (HR)',  ws: 2, ownerId: 3, trigger: 'Month end',       actionType: 'webhook', actionConfig: 'https://internal.globex.example/payroll',  active: true,  priv: true },
  { id: 5, name: 'Ticket Auto-Reply',    ws: 1, ownerId: 4, trigger: 'Ticket created',  actionType: 'task',    actionConfig: 'Create a follow-up task for support',    active: false, priv: false },
];
let nextWorkflowId = 6;

const runs = [
  { id: 1, wfId: 1, by: 2, status: 'success', output: 'Email queued to the new user.', at: '2026-10-20 09:14' },
  { id: 2, wfId: 2, by: 2, status: 'success', output: 'Webhook POST https://hooks.acme.example/sync -> 200 OK', at: '2026-10-21 02:00' },
  { id: 3, wfId: 4, by: 3, status: 'success', output: 'Webhook POST https://internal.globex.example/payroll -> 200 OK (214 rows exported)', at: '2026-10-01 23:59' },
  { id: 4, wfId: 3, by: 3, status: 'success', output: 'Reminder email queued to the overdue account.', at: '2026-10-19 11:02' },
];
let nextRunId = 5;

const templates = [
  { id: 1, name: 'Signup Welcome (official)',    ownerId: 0, trigger: 'New signup',     actionType: 'email',   desc: 'Official platform template: welcome email on signup.' },
  { id: 2, name: 'Daily Report (official)',      ownerId: 0, trigger: 'Schedule 08:00', actionType: 'task',    desc: 'Official platform template: morning report task.' },
  { id: 3, name: 'CRM Sync (official)',          ownerId: 0, trigger: 'Record updated', actionType: 'webhook', desc: 'Official platform template: push changes to a CRM webhook.' },
  { id: 4, name: "Bob's Private Lead Scorer",    ownerId: 3, trigger: 'Lead created',   actionType: 'webhook', desc: "Bob's private template — scores leads against Globex's internal pricing sheet." },
];

const resetTokens = {}; // email -> token actually issued via /forgot
const sessions = new Map(); // sid -> userId

// ------------------------------------------------------------- progress state
const PROGRESS_FILE = path.join(DIR, 'progress.json');
let state = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false, counters: { fails: {}, probes: [] } };
try {
  if (fs.existsSync(PROGRESS_FILE)) {
    const loaded = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    state = Object.assign(state, loaded);
    state.counters = Object.assign({ fails: {}, probes: [] }, loaded.counters || {});
  }
} catch (e) { /* corrupted state starts fresh */ }
function save() { try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2)); } catch (e) {} }

// --- key material, region C ---
const _e2 = "NVQyODI=";
const _c2 = "QUlLV1Q=";

// ------------------------------------------------------------- TESTS registry
const TESTS = [
  // ---- Login & Authentication (6) ----
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL injection login bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login form builds its query by pasting your input straight into the SQL text.', "Try a classic tautology in the email field, e.g. an OR '1'='1' condition.", "Use ' OR '1'='1' -- as the email with any password — the comment cuts the password check off."],
    lesson: 'String-built SQL queries let an attacker rewrite the login logic itself; parameterised queries make input data, never code.',
    impact: 'On a real client site this is a full account takeover — the attacker logs in as the first account in the table, usually the administrator, without knowing any password.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries/prepared statements for all database access and reject unexpected input.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute force — no rate limit or lockout', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Count how many wrong passwords the login accepts for one account.', 'There is no CAPTCHA, delay or lockout — script 10+ failures.', 'The 10th failed attempt is still processed normally; that missing throttle is the flaw.'],
    lesson: 'Without throttling, online password guessing is limited only by the attacker\'s patience.',
    impact: 'Attackers can grind through password lists against your client\'s real users; one reused or weak password hands them a legitimate account.',
    report: { title: 'Missing Rate Limiting on Login Allows Brute Force Attacks', severity: 'High', remediation: 'Add per-account and per-IP rate limiting, progressive delays and lockout/alerting after repeated failures.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User enumeration via differing error messages', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the login error for an email that exists with one that does not.', 'The forgot-password form answers differently too — probe at least 5 distinct emails.', 'Existing accounts say "Incorrect password." / get a reset message; unknown ones are told no account exists.'],
    lesson: 'Different error messages for "no such user" and "wrong password" turn your login page into a free address book of valid accounts.',
    impact: 'Attackers harvest a verified list of your client\'s users, then aim phishing and password spraying only at accounts that definitely exist.',
    report: { title: 'User Enumeration via Authentication Error Messages', severity: 'Medium', remediation: 'Return one generic error ("invalid email or password") for every failed login and reset request.' } },
  { id: 'auth-demo', feature: 'Login & Authentication', name: 'Demo credentials published on the login page', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Read the login page carefully — everything you need is printed on it.', 'A demo account is advertised with its password.', 'Log in as dave@test.local with the published demo password.'],
    lesson: 'Sample and demo accounts ship with known passwords and are rarely removed before production.',
    impact: 'Anyone on the internet can walk into your client\'s product with the published demo login and explore from inside a real account.',
    report: { title: 'Publicly Documented Demo Account Credentials', severity: 'High', remediation: 'Remove demo/sample accounts and credentials from production, or disable them and rotate their passwords.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable password-reset token', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a reset for your own account and study the token format.', 'The token is built from the account\'s numeric id with simple arithmetic.', 'Token = WF<id>-<id*137+42>. Compute Bob\'s (id 3) and reset his password without ever requesting it.'],
    lesson: 'Reset tokens must be unguessable random values; anything derived from a public identifier can be forged for every account.',
    impact: 'An attacker resets the password of any user — including admins — knowing only their email, and takes over the account completely.',
    report: { title: 'Predictable Password Reset Tokens Allow Account Takeover', severity: 'Critical', remediation: 'Generate reset tokens with a CSPRNG (at least 128 bits), store them hashed, and expire them quickly.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Role taken from a client cookie (session/role tampering)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Inspect the cookies the app sets after login — one of them states your role.', 'The admin area trusts that cookie instead of the server-side session.', 'Set hx_role=admin in your browser while logged in as a normal user, then open /admin.'],
    lesson: 'Authorization data must live server-side; anything stored on the client can be edited by the client.',
    impact: 'Any logged-in user becomes an administrator by editing a cookie — full control of your client\'s users, plans and data.',
    report: { title: 'Authorization Role Trusted from Client-Side Cookie', severity: 'Critical', remediation: 'Derive roles only from the server-side session record; never trust role claims stored in cookies.' } },

  // ---- Registration & Profile (4) ----
  { id: 'reg-weakpass', feature: 'Registration & Profile', name: 'Weak password policy (1 character accepted)', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a new account and shrink the password.', 'There is effectively no minimum length or complexity check.', 'A single-character password such as "x" is accepted.'],
    lesson: 'Password policy is the cheapest control there is; accepting trivial passwords invites credential stuffing and guessing.',
    impact: 'Users protect real business data with passwords like "1", and attackers guess them in seconds.',
    report: { title: 'Weak Password Policy Allows Single-Character Passwords', severity: 'Medium', remediation: 'Enforce a minimum length of 10+ characters and screen new passwords against known-breached lists.' } },
  { id: 'reg-massassign', feature: 'Registration & Profile', name: 'Mass assignment — role/plan set at registration', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration handler copies more form fields onto the account than the form shows.', 'Add extra fields to the POST body and see what sticks.', 'POST /register with role=admin (or plan=pro) in the body — the new account is created with them.'],
    lesson: 'Binding request bodies directly to data models lets attackers write fields the UI never offered.',
    impact: 'Attackers self-register as administrators or premium customers of your client — privilege escalation and free paid service in one request.',
    report: { title: 'Mass Assignment in Registration Allows Privilege Escalation', severity: 'High', remediation: 'Whitelist the exact fields a request may set; never bind role, plan or balance fields from user input.' } },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in display name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is rendered back on several pages — check whether it is encoded.', 'Register (or rename yourself) with an HTML payload as the name.', 'Use a name like <script>alert(1)</script> or <img src=x onerror=alert(1)> — it is stored and rendered raw, including in the admin user list.'],
    lesson: 'Stored XSS turns one user\'s profile field into code that runs in every viewer\'s browser, including administrators\'.',
    impact: 'An attacker plants a script in their profile name; when your client\'s admin opens the user list, the script runs with the admin\'s session.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Contextually output-encode all user-supplied data and add a Content-Security-Policy header.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on profile update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The profile form has no anti-CSRF token; the app only sets a benign marker cookie on its own pages.', 'A state-changing POST that arrives WITHOUT the hx_origin cookie did not come from the app\'s own pages.', 'POST /profile with a new name from curl (no cookies except the session) — the change is accepted.'],
    lesson: 'State-changing requests need an unforgeable token; cookies alone are sent by the browser for cross-site requests too.',
    impact: 'A malicious page visited by your client\'s user silently rewrites their profile — the first step in account-takeover and social-engineering chains.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require a per-session anti-CSRF token on every state-changing request and verify Origin/Referer.' } },

  // ---- Workflows (6) ----
  { id: 'wf-idor', feature: 'Workflows', name: 'Cross-workspace workflow IDOR', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Workflow ids are small sequential numbers — open one that is not yours.', 'The detail page checks that you are logged in, not which workspace owns the workflow.', 'As Alice (workspace 1), open /workflow/3 — a Globex Labs workflow.'],
    lesson: 'Every object access must check ownership/tenancy, not just authentication.',
    impact: 'Competitors and ex-contractors read your client\'s automation logic, internal URLs and business processes across tenant boundaries.',
    report: { title: 'Insecure Direct Object Reference on Workflow Detail (Cross-Tenant)', severity: 'High', remediation: 'Enforce workspace/ownership checks on every object lookup, server-side.' } },
  { id: 'wf-private', feature: 'Workflows', name: 'Private workflow served to non-owners', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['One Globex workflow is marked private — it hides payroll data.', 'Privacy flags are cosmetic here; the direct URL still works.', 'Open /workflow/4 as Alice — the private HR payroll export, its webhook URL included.'],
    lesson: 'A "private" flag only works if the server enforces it on every read path, including direct URLs and exports.',
    impact: 'The most sensitive automation in the account — payroll export — is readable by any user who guesses its id.',
    report: { title: 'Private Workflow Accessible by Direct URL', severity: 'High', remediation: 'Check the private flag and ownership on the server before serving any workflow content.' } },
  { id: 'wf-run', feature: 'Workflows', name: 'Run or toggle another workspace\'s workflow', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Viewing is not the only unchecked action — try the Run button on someone else\'s workflow.', 'The run and activate/deactivate endpoints skip the ownership check too.', 'As Alice, POST /workflow/3/run (or /toggle) — Globex\'s workflow executes / changes state.'],
    lesson: 'Write and execute actions need the same authorization checks as reads — execution is where damage happens.',
    impact: 'An attacker triggers or disables your client\'s business automations — stopping invoice reminders or firing off exports at will.',
    report: { title: 'Missing Authorization on Workflow Execute/Toggle Endpoints', severity: 'High', remediation: 'Verify the caller\'s workspace and role before executing or modifying any workflow.' } },
  { id: 'wf-export', feature: 'Workflows', name: 'Workflow export leaks full configuration cross-workspace', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The export endpoint returns the complete workflow definition as JSON.', 'It performs even less checking than the detail page.', 'As Alice, GET /workflow/3/export — full config, including the action target, is returned.'],
    lesson: 'Export/backup endpoints concentrate sensitive data and are classic forgotten attack surface.',
    impact: 'Attackers download complete automation blueprints — internal endpoints, recipients and logic — for every tenant on the platform.',
    report: { title: 'Cross-Tenant Workflow Export Without Authorization', severity: 'High', remediation: 'Apply the same tenancy checks to export endpoints as to the UI, and audit export access.' } },
  { id: 'wf-search-sqli', feature: 'Workflows', name: 'SQL injection in workflow search', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Search builds its WHERE clause by string concatenation too.', 'A tautology in the search box changes which rows come back.', "Search for ' OR '1'='1 — every workflow on the platform is returned, including other workspaces and the private one."],
    lesson: 'Injection flaws hide in every input that reaches a query — search boxes are the most common.',
    impact: 'One search dumps your client\'s entire cross-tenant catalogue, turning a limited IDOR into full platform enumeration.',
    report: { title: 'SQL Injection in Workflow Search', severity: 'High', remediation: 'Parameterise the search query and scope results to the caller\'s workspace.' } },
  { id: 'wf-search-xss', feature: 'Workflows', name: 'Reflected XSS in workflow search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your search term is echoed in the results heading.', 'Check whether the echo is HTML-encoded.', 'Search for <script>alert(1)</script> — it comes back raw in the page.'],
    lesson: 'Reflected input must be encoded for the context it lands in; search pages are a classic delivery vehicle.',
    impact: 'A crafted search link sent to your client\'s admin runs script in their browser and can steal the session or act as them.',
    report: { title: 'Reflected Cross-Site Scripting in Search', severity: 'Medium', remediation: 'HTML-encode reflected values and validate search input.' } },

  // ---- Runs & History (1) ----
  { id: 'run-idor', feature: 'Runs & History', name: 'Run-log IDOR exposes another workspace\'s execution output', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Run records have their own sequential ids and their own detail view.', 'Run output contains what the workflow actually did — URLs, row counts, recipients.', 'As Alice, open /run/3 — the Globex payroll export run, with its output.'],
    lesson: 'Execution logs are sensitive data in their own right and need the same tenancy checks as the objects they describe.',
    impact: 'Attackers read exactly what your client\'s automations exported and where it went — a map of the business\'s data flows.',
    report: { title: 'Insecure Direct Object Reference on Run History', severity: 'Medium', remediation: 'Scope run-log queries to workflows the caller is authorized to see.' } },

  // ---- Templates (1) ----
  { id: 'tpl-idor', feature: 'Templates', name: 'Use another user\'s private template', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The template gallery mixes official templates with users\' own ones.', 'The "use template" action does not check who owns the template.', 'As Alice, POST /template/4/use — Bob\'s private lead-scoring template is copied into your workspace.'],
    lesson: 'Marketplace/gallery features must separate public catalogue items from private user content on the server side.',
    impact: 'Private playbooks — pricing logic, internal endpoints — are copied out of your client\'s account by any other user.',
    report: { title: 'Private Template Reuse Without Ownership Check', severity: 'Medium', remediation: 'Only serve platform templates and the caller\'s own templates; verify ownership on use.' } },

  // ---- Integrations & API Keys (4) ----
  { id: 'int-keyleak', feature: 'Integrations & API Keys', name: 'Integrations page exposes teammates\' API keys', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Open the Integrations page and look beyond your own key.', 'A "team keys" section helpfully lists everyone\'s keys in your workspace.', 'Your own Integrations page shows Carol\'s full API key — copy it; the leak itself is the flaw.'],
    lesson: 'API keys are credentials; displaying other users\' keys to any teammate destroys accountability and invites abuse.',
    impact: 'Any insider (or anyone who hijacks one low-privilege account) harvests every teammate\'s API key and acts under their identities.',
    report: { title: 'Exposure of Other Users\' API Keys on Integrations Page', severity: 'High', remediation: 'Show each user only their own key, masked after creation, with per-key audit logs.' } },
  { id: 'int-rotate', feature: 'Integrations & API Keys', name: 'Rotate another user\'s API key', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The rotate endpoint accepts a userId parameter.', 'It never checks that the key being rotated belongs to you.', 'POST /integrations/rotate with userId=3 — Bob\'s API key is replaced, locking his integrations out.'],
    lesson: 'Credential-management actions are high-value targets and demand strict ownership checks.',
    impact: 'An attacker rotates a victim\'s API key to break their automations (denial of service) or races to use the fresh key first.',
    report: { title: 'Missing Authorization on API Key Rotation', severity: 'High', remediation: 'Ignore client-supplied user ids; always operate on the authenticated user\'s own keys.' } },
  { id: 'int-ssrf', feature: 'Integrations & API Keys', name: 'Server-side request forgery via webhook tester', owasp: 'A10:2021 Server-Side Request Forgery', difficulty: 'Advanced',
    hints: ['The webhook tester makes the server fetch any URL you give it.', 'Point it at an internal address instead of a public one.', 'POST /integrations/webhook-test with url=http://169.254.169.254/latest/meta-data (or an internal hostname) — the server fetches it and shows you the response.'],
    lesson: 'Any feature that fetches user-supplied URLs must validate and restrict destinations, or the server becomes a proxy into the internal network.',
    impact: 'Attackers reach cloud metadata and internal services through your client\'s server — the classic route to full cloud account compromise.',
    report: { title: 'Server-Side Request Forgery in Webhook Test Feature', severity: 'Critical', remediation: 'Allowlist webhook destinations, block private/link-local IP ranges, and disable redirects to internal targets.' } },
  { id: 'int-apitoken', feature: 'Integrations & API Keys', name: 'API accepts base64(email) as a credential', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['The JSON API authenticates with a key parameter — look at what else it accepts.', 'A legacy fallback compares the key against something trivially derivable from the account.', 'GET /api/v1/workflows?key=<base64 of bob@test.local> — Bob\'s workflows are returned; an email address is not a secret.'],
    lesson: 'API credentials must be high-entropy secrets; identifiers (even encoded ones) are public knowledge.',
    impact: 'Anyone who knows a user\'s email address — public information — gets full API access to their workflows.',
    report: { title: 'Weak API Authentication Accepts Base64-Encoded Email', severity: 'Critical', remediation: 'Accept only the issued high-entropy API keys, compared in constant time, and remove legacy fallbacks.' } },

  // ---- Workspaces & Members (1) ----
  { id: 'ws-role', feature: 'Workspaces & Members', name: 'Member promotes roles — workspace role escalation', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The member-role endpoint trusts whoever calls it.', 'You do not need to be the workspace owner to change roles.', 'As Carol (a plain member), POST /workspace/role with userId=4 and role=owner — you are now a workspace owner.'],
    lesson: 'Role management is an owner/admin-only operation; letting members call it collapses the whole permission model.',
    impact: 'The lowest-privilege member of your client\'s workspace promotes themselves to owner and can remove the real owner.',
    report: { title: 'Privilege Escalation via Workspace Role Endpoint', severity: 'High', remediation: 'Restrict role changes to workspace owners and verify the actor\'s role server-side.' } },

  // ---- Admin Panel (2) ----
  { id: 'adm-bac', feature: 'Admin Panel', name: 'Admin panel open to non-admin sessions', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The /admin URL is only hidden, not protected, if your role claim says admin.', 'Combine this with the role-cookie flaw.', 'Logged in as any user with hx_role=admin, open /admin — the full user list appears.'],
    lesson: 'Admin surfaces must verify the server-side role on every request; hiding links is not access control.',
    impact: 'Full administrative control — every user, every plan — is one cookie edit away for any registered user.',
    report: { title: 'Broken Access Control on Admin Panel', severity: 'Critical', remediation: 'Enforce admin authorization middleware on all /admin routes using the server-side session role.' } },
  { id: 'adm-csrf', feature: 'Admin Panel', name: 'CSRF on admin plan change', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    hints: ['Admin actions are plain POSTs with no anti-CSRF token.', 'The marker-cookie check used elsewhere is missing here entirely.', 'While holding an admin session, POST /admin/plan (userId + plan) from curl without the hx_origin cookie — the plan changes.'],
    lesson: 'Privileged actions are the most important place for CSRF tokens — a forged admin request inherits full power.',
    impact: 'A booby-trapped page an admin merely visits can rewrite customer plans across your client\'s whole platform.',
    report: { title: 'Missing CSRF Protection on Administrative Actions', severity: 'High', remediation: 'Add per-session CSRF tokens to all admin forms and verify them server-side.' } },

  // ---- Platform & API (1) ----
  { id: 'plat-debug', feature: 'Platform & API', name: 'Unauthenticated debug endpoint dumps all data', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Developers leave diagnostic endpoints behind — guess the obvious path.', 'No login is required at all.', 'GET /api/debug — every user (passwords and API keys included), workflow and run, as JSON.'],
    lesson: 'Debug/diagnostic endpoints must never ship to production; if they do, they need authentication and auditing.',
    impact: 'The entire platform database — credentials included — is downloadable by anyone, no account needed. Total compromise in one request.',
    report: { title: 'Unauthenticated Debug Endpoint Exposes Full Database Dump', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; gate any diagnostics behind admin auth and IP allowlists.' } },
];

// --- key material, region D ---
const _e3 = "LUMzNw==";
const _c3 = "LVlGSA==";

const FEATURES = [...new Set(TESTS.map(t => t.feature))];
function pass(id) {
  if (!state.tests[id]) {
    state.tests[id] = true;
    const done = TESTS.filter(t => state.tests[t.id]).length;
    if (done === TESTS.length && !state.completedAt) {
      state.completedAt = new Date().toISOString();
      state.keyRevealed = true;
    }
    save();
  }
}
function attempt(feature) {
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  save();
}
function doneCount() { return TESTS.filter(t => state.tests[t.id]).length; }
function isComplete() { return doneCount() === TESTS.length; }

// key assemblers (entry key assembled only for unlock verification;
// completion key assembled only once the lab is complete)
function _asm(parts) { return parts.map(s => [...Buffer.from(s, 'base64').toString('utf8')].reverse().join('')).join(''); }
function entryKey() { return _asm([_e0, _e1, _e2, _e3, _e4, _e5]); }
function completionKey() { return _asm([_c0, _c1, _c2, _c3, _c4, _c5]); }

// --- key material, region E ---
const _e4 = "SU4zVw==";
const _c4 = "S0ZKNQ==";

// ------------------------------------------------------------- mini SQL eval
// Deliberately naive: the login/search queries are built by string pasting and
// then "evaluated", which is exactly what makes injection possible here.
function evalCond(c, row) {
  const m = c.match(/^(.+?)\s*=\s*(.+)$/);
  if (!m) return false;
  const val = (raw) => {
    raw = raw.trim();
    if (raw.startsWith("'") && raw.endsWith("'") && raw.length >= 2) return raw.slice(1, -1);
    if (/^\d+$/.test(raw)) return Number(raw);
    if (raw in row) return row[raw];
    return raw;
  };
  return String(val(m[1])) === String(val(m[2]));
}
function evalWhere(q, row) {
  const ci = q.indexOf('--');
  if (ci >= 0) q = q.slice(0, ci);
  return q.split(/\s+OR\s+/i).some(part => part.split(/\s+AND\s+/i).every(c => evalCond(c.trim(), row)));
}
const XSS_RE = /<script|onerror\s*=|onload\s*=|<svg|<img|<iframe/i;
function resetTokenFor(u) { return 'WF' + u.id + '-' + (u.id * 137 + 42); }

// ------------------------------------------------------------- HTTP helpers
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      if (!data) return resolve({});
      try { return resolve(JSON.parse(data)); } catch (e) {}
      const out = {};
      new URLSearchParams(data).forEach((v, k) => { out[k] = v; });
      resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}
function currentUser(req) {
  const sid = parseCookies(req).sid;
  if (!sid || !sessions.has(sid)) return null;
  return users.find(u => u.id === sessions.get(sid)) || null;
}
function startSession(res, userId) {
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, userId);
  const u = users.find(x => x.id === userId);
  res.setHeader('Set-Cookie', [
    'sid=' + sid + '; Path=/; HttpOnly',
    'hx_role=' + (u ? u.role : 'viewer') + '; Path=/',
    'hx_origin=1; Path=/',
  ]);
}
function progressJSON() {
  const feats = {};
  for (const f of FEATURES) {
    const ts = TESTS.filter(t => t.feature === f);
    feats[f] = { total: ts.length, done: ts.filter(t => state.tests[t.id]).length, attempts: state.attempts[f] || 0 };
  }
  const done = doneCount();
  return { lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done, pct: Math.floor(done / TESTS.length * 100), features: feats, complete: isComplete() };
}

// --- key material, region F ---
const _e5 = "MVBFOQ==";
const _c5 = "UDBKNg==";

// ------------------------------------------------------------- UI rendering
const CHAT_WIDGET = `
<div id="coach" style="position:fixed;right:16px;bottom:16px;width:320px;max-width:92vw;background:#111827;color:#e5e7eb;border:1px solid #374151;border-radius:12px;overflow:hidden;font-family:system-ui;z-index:50;box-shadow:0 10px 30px rgba(0,0,0,.35)">
  <div style="background:#1f2937;padding:10px 12px;font-weight:700">Hexa Lab Coach</div>
  <div id="coachlog" style="height:180px;overflow:auto;padding:10px 12px;font-size:13px;line-height:1.45"></div>
  <form id="coachform" style="display:flex;border-top:1px solid #374151">
    <input id="coachinput" autocomplete="off" placeholder="Ask the coach..." style="flex:1;background:#0b1220;color:#e5e7eb;border:0;padding:10px">
    <button style="background:#2563eb;color:#fff;border:0;padding:0 14px;cursor:pointer">Send</button>
  </form>
</div>
<script>
(function(){
  var log=document.getElementById('coachlog'), form=document.getElementById('coachform'), inp=document.getElementById('coachinput');
  function add(who,text){ var d=document.createElement('div'); d.style.margin='6px 0'; d.innerHTML='<b>'+who+':</b> '; d.appendChild(document.createTextNode(text)); log.appendChild(d); log.scrollTop=log.scrollHeight; }
  add('Coach','Hi! I am the Lab '+109+' coach. Ask me what to do next, how many tests a feature has, or how to solve one (after 3 real tries).');
  form.addEventListener('submit', function(ev){ ev.preventDefault(); var m=inp.value.trim(); if(!m) return; inp.value=''; add('You',m);
    fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})})
      .then(function(r){return r.json();}).then(function(j){ add('Coach', j.reply || '...'); })
      .catch(function(){ add('Coach','Coach unavailable right now.'); });
  });
})();
</script>`;

function layout(title, user, body) {
  const p = progressJSON();
  const pct = p.pct;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} — HexaWorkflow</title>
<style>body{font-family:system-ui;margin:0;background:#f6f7fb;color:#111827}a{color:#2563eb}header{background:#111827;color:#fff;padding:10px 18px;display:flex;gap:14px;align-items:center;flex-wrap:wrap}header a{color:#93c5fd;text-decoration:none;margin-right:10px}.barwrap{background:#374151;border-radius:6px;height:10px;min-width:180px;flex:1}.bar{background:#22c55e;height:10px;border-radius:6px}main{max-width:980px;margin:22px auto;padding:0 16px}.card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin:12px 0}input,select,textarea{padding:8px;border:1px solid #d1d5db;border-radius:6px}button{background:#2563eb;color:#fff;border:0;padding:8px 14px;border-radius:6px;cursor:pointer}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #e5e7eb;padding:7px;text-align:left}.muted{color:#6b7280}.ok{color:#16a34a}.open{color:#9ca3af}</style></head>
<body><header><img src="/logo.png" alt="HexaCyberLab" style="height:34px">
<div><b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b><div class="muted" style="color:#9ca3af;font-size:12px">LAB ${LAB_NUMBER} · ${p.done}/${p.total} tests · ${pct}%</div></div>
<div class="barwrap"><div class="bar" style="width:${pct}%"></div></div>
<nav>${user ? `<a href="/">Dashboard</a><a href="/workflows">Workflows</a><a href="/runs">Runs</a><a href="/templates">Templates</a><a href="/integrations">Integrations</a><a href="/workspace">Workspace</a><a href="/members">Members</a><a href="/tests">Mission Board</a><a href="/logout">Log out (${esc(user.name)})</a>` : `<a href="/login">Login</a><a href="/register">Register</a><a href="/tests">Mission Board</a>`}</nav></header>
<main>${body}</main>${CHAT_WIDGET}</body></html>`;
}

function gatePage() {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Locked — LAB ${LAB_NUMBER}</title></head>
<body style="font-family:system-ui;background:#0b1220;color:#e5e7eb;margin:0">
<main style="max-width:560px;margin:60px auto;padding:0 16px;text-align:center">
<img src="/logo.png" alt="HexaCyberLab" style="height:64px">
<h1>LAB ${LAB_NUMBER} — ${LAB_NAME}</h1>
<p>This lab is locked. Paste the completion key from Lab ${PREV_LAB} to start.</p>
<form method="POST" action="/unlock"><input name="key" placeholder="Completion key from Lab ${PREV_LAB}" style="padding:10px;width:80%;border-radius:6px;border:1px solid #374151;background:#111827;color:#e5e7eb">
<p><button style="background:#2563eb;color:#fff;border:0;padding:10px 22px;border-radius:6px;cursor:pointer">Unlock</button></p></form>
</main>${CHAT_WIDGET}</body></html>`;
}

// ------------------------------------------------------------- Lab Coach
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
const FEATURE_KEYS = [
  [/login|log in|auth|password|brute|enumerat|reset token/, 'Login & Authentication'],
  [/regist|sign ?up|profile/, 'Registration & Profile'],
  [/workflow/, 'Workflows'],
  [/run|history|execution/, 'Runs & History'],
  [/template/, 'Templates'],
  [/integration|api|webhook|ssrf/, 'Integrations & API Keys'],
  [/workspace|member|role/, 'Workspaces & Members'],
  [/admin/, 'Admin Panel'],
  [/debug|platform/, 'Platform & API'],
];
function coachReply(raw) {
  const msg = String(raw || '');
  const m = msg.toLowerCase();
  if (/who (built|made|created)|founder|who is/.test(m)) return ATTRIBUTION;
  const p = progressJSON();
  if (/(completion )?key|unlock|next lab/.test(m)) {
    if (p.complete && state.keyRevealed) return 'You completed LAB ' + LAB_NUMBER + ' — well done! The completion key for the next lab is: ' + completionKey();
    return "I don't have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at " + p.pct + '% (' + p.done + '/' + p.total + ' tests). Finish every test and ask me again.';
  }
  let feat = null;
  for (const [re, f] of FEATURE_KEYS) { if (re.test(m)) { feat = f; break; } }
  if (feat && /(how|solve|help|guide|do|hint|stuck)/.test(m)) {
    const ts = TESTS.filter(t => t.feature === feat);
    const open = ts.filter(t => !state.tests[t.id]);
    const att = state.attempts[feat] || 0;
    if (!open.length) return 'You have already completed every test in ' + feat + '. Great work — pick another feature from the Mission Board (/tests).';
    if (att >= 3) {
      return 'Step by step for ' + feat + ' — ' + open.map(t => '"' + t.name + '": ' + t.hints[2]).join(' | ');
    }
    return 'That feature is locked for help. First try the ' + feat + " tests yourself at least 3 times — I can see you've tried " + att + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  if (/progress|status|score|how am i/.test(m)) {
    return 'Your progress: ' + p.done + '/' + p.total + ' tests (' + p.pct + '%). ' + (p.complete ? 'Lab complete!' : 'Keep going — open /tests for the Mission Board.');
  }
  if (/how many|features|tests|vulnerab|what.*(is|are) (in|the)/.test(m) || feat) {
    const f = feat || null;
    if (f) {
      const ts = TESTS.filter(t => t.feature === f);
      return f + ' has ' + ts.length + ' test(s): ' + ts.map(t => t.name + (state.tests[t.id] ? ' (done)' : '')).join('; ') + '.';
    }
    return 'LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ' has ' + TESTS.length + ' tests across ' + FEATURES.length + ' features: ' + FEATURES.map(f2 => f2 + ' (' + TESTS.filter(t => t.feature === f2).length + ')').join(', ') + '. Ask me about a feature by name.';
  }
  if (/next|what.*do|start|begin/.test(m)) {
    const next = TESTS.find(t => !state.tests[t.id]);
    if (!next) return 'Everything is done — open /complete for your summary, completion key and certificate.';
    return 'Next up: "' + next.name + '" in ' + next.feature + ' (' + next.difficulty + '). Open /tests for its hints — hints are always free; my step-by-step help unlocks after 3 tries on a feature.';
  }
  const next = TESTS.find(t => !state.tests[t.id]);
  return 'I can tell you the map freely: ask "how many tests in Workflows", or check /tests for hints on every test. Step-by-step help for a feature unlocks after you have tried that feature at least 3 times. ' + (next ? 'Next open test: "' + next.name + '" (' + next.feature + ').' : 'The lab is complete — see /complete.');
}

// ------------------------------------------------------------- doc generation
function genDocs() {
  const byFeature = f => TESTS.filter(t => t.feature === f);
  let vuln = '# HexaWorkflow (LAB ' + LAB_NUMBER + ') — Vulnerability Map\n\nAll ' + TESTS.length + ' scored tests, grouped by feature. Every item is a real, working flaw in this training app.\n';
  let guide = '# HexaWorkflow (LAB ' + LAB_NUMBER + ') — Practice Guide\n\nChallenges grouped by feature, then difficulty. Solve them in the app; progress is scored on /tests.\n';
  let fix = '# HexaWorkflow (LAB ' + LAB_NUMBER + ') — Fix & Retest\n\nFor every scored test: the secure implementation and the regression check.\n';
  const diffRank = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  for (const f of FEATURES) {
    vuln += '\n## ' + f + '\n';
    guide += '\n## ' + f + '\n';
    fix += '\n## ' + f + '\n';
    for (const t of byFeature(f)) {
      vuln += '\n### ' + t.name + '\n- OWASP: ' + t.owasp + '\n- Difficulty: ' + t.difficulty + '\n- Impact: ' + t.impact + '\n- Report title: ' + t.report.title + ' (' + t.report.severity + ')\n';
      fix += '\n### ' + t.report.title + '\n- Severity: ' + t.report.severity + '\n- Secure implementation: ' + t.report.remediation + '\n- Regression test: repeat the original exploit after the fix; it must fail and the test must no longer flip on a fresh lab.\n';
    }
    for (const t of [...byFeature(f)].sort((a, b) => diffRank[a.difficulty] - diffRank[b.difficulty])) {
      guide += '\n### [' + t.difficulty + '] ' + t.name + '\n- Objective: make the "' + t.name + '" test flip to done on /tests by performing the real exploit.\n- Hints:\n  1. ' + t.hints[0] + '\n  2. ' + t.hints[1] + '\n  3. ' + t.hints[2] + '\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'), vuln);
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'), guide);
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'), fix);
  console.log('docs generated:', TESTS.length, 'tests');
}

// ------------------------------------------------------------- routes
function send(res, status, body, type) {
  const h = { 'Content-Type': (type || 'text/html') + '; charset=utf-8' };
  if (!type || type === 'text/html') {
    const existing = res.getHeader('Set-Cookie');
    const arr = existing ? (Array.isArray(existing) ? existing : [existing]) : [];
    if (!arr.some(c => String(c).startsWith('hx_origin='))) arr.push('hx_origin=1; Path=/');
    h['Set-Cookie'] = arr;
  }
  res.writeHead(status, h);
  res.end(body);
}
function redirect(res, loc) { res.writeHead(302, { Location: loc }); res.end(); }
function probe(email) {
  if (email && !state.counters.probes.includes(email)) {
    state.counters.probes.push(email);
    if (state.counters.probes.length >= 5) pass('auth-enum');
    save();
  }
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1');
  const p = url.pathname;
  const cookies = parseCookies(req);

  if (p === '/logo.png') {
    try { const img = fs.readFileSync(path.join(DIR, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(img); }
    catch (e) { return send(res, 404, 'no logo'); }
  }
  if (p === '/unlock' && req.method === 'POST') {
    const b = await readBody(req);
    const key = String(b.key || '');
    if (key && key === entryKey()) { state.unlocked = true; save(); return redirect(res, '/'); }
    return send(res, 403, 'Invalid key.');
  }
  if (p === '/api/chat' && req.method === 'POST') {
    const b = await readBody(req);
    return send(res, 200, JSON.stringify({ reply: coachReply(b.message) }), 'application/json');
  }
  if (p === '/api/progress') return send(res, 200, JSON.stringify(progressJSON()), 'application/json');

  if (!state.unlocked) return send(res, 200, gatePage());

  // ---------------- platform API (no session by design — this is the flaw) ----------------
  if (p === '/api/debug') {
    attempt('Platform & API');
    pass('plat-debug');
    return send(res, 200, JSON.stringify({ users, workspaces, workflows, runs, templates }, null, 2), 'application/json');
  }
  if (p === '/api/v1/workflows') {
    attempt('Integrations & API Keys');
    const key = String(url.searchParams.get('key') || '');
    let u = users.find(x => x.apiKey === key);
    if (!u && key) {
      try {
        const email = Buffer.from(key, 'base64').toString('utf8');
        const u2 = users.find(x => x.email === email);
        if (u2) { pass('int-apitoken'); u = u2; }
      } catch (e) {}
    }
    if (!u) return send(res, 401, JSON.stringify({ error: 'invalid api key' }), 'application/json');
    return send(res, 200, JSON.stringify({ user: u.email, workflows: workflows.filter(w => w.ws === u.ws) }), 'application/json');
  }

  const user = currentUser(req);
  const body = (req.method === 'POST') ? await readBody(req) : {};

  // ---------------- auth ----------------
  if (p === '/login' && req.method === 'GET') {
    return send(res, 200, layout('Login', null, `<h1>Log in to HexaWorkflow</h1>
<div class="card"><form method="POST" action="/login">
<p>Email <input name="email" size="34"></p><p>Password <input name="pass" type="password" size="34"></p>
<p><button>Log in</button></p></form>
<p class="muted">Try the demo account: <b>dave@test.local</b> / <b>demo123</b></p>
<p><a href="/forgot">Forgot password?</a> · <a href="/register">Create an account</a></p></div>`));
  }
  if (p === '/login' && req.method === 'POST') {
    attempt('Login & Authentication');
    const email = String(body.email || ''), pw = String(body.pass || '');
    const q = "email = '" + email + "' AND pass = '" + pw + "'";
    const u = users.find(x => evalWhere(q, x));
    if (u) {
      if (email.includes("'") || pw.includes("'")) pass('auth-sqli');
      if (u.email === 'dave@test.local') pass('auth-demo');
      startSession(res, u.id);
      return redirect(res, '/');
    }
    const exists = users.some(x => x.email === email);
    if (exists) {
      state.counters.fails[email] = (state.counters.fails[email] || 0) + 1;
      if (state.counters.fails[email] >= 10) pass('auth-brute');
      save();
    }
    probe(email);
    const msg = exists ? 'Incorrect password.' : 'No account found for that email.';
    return send(res, 200, layout('Login', null, `<h1>Log in</h1><div class="card"><p style="color:#dc2626">${esc(msg)}</p><p><a href="/login">Try again</a></p></div>`));
  }
  if (p === '/logout') {
    if (cookies.sid) sessions.delete(cookies.sid);
    return redirect(res, '/login');
  }
  if (p === '/register' && req.method === 'GET') {
    return send(res, 200, layout('Register', null, `<h1>Create your account</h1>
<div class="card"><form method="POST" action="/register">
<p>Name <input name="name" size="30"></p><p>Email <input name="email" size="30"></p><p>Password <input name="pass" type="password" size="30"></p>
<p><button>Register</button></p></form></div>`));
  }
  if (p === '/register' && req.method === 'POST') {
    attempt('Registration & Profile');
    const name = String(body.name || 'New User'), email = String(body.email || ''), pw = String(body.pass || '');
    if (users.some(x => x.email === email)) return send(res, 200, layout('Register', null, '<div class="card">That email is already registered. <a href="/login">Log in</a></div>'));
    if (pw.length < 6) pass('reg-weakpass');
    const role = body.role ? String(body.role) : 'viewer';
    const plan = body.plan ? String(body.plan) : 'free';
    if (role === 'admin' || plan === 'pro') pass('reg-massassign');
    if (XSS_RE.test(name)) pass('reg-xss');
    const nu = { id: nextUserId++, name, email, pass: pw, role, ws: 1, wsRole: 'member', plan, apiKey: 'hwk_' + crypto.randomBytes(3).toString('hex') };
    users.push(nu);
    startSession(res, nu.id);
    return redirect(res, '/');
  }
  if (p === '/forgot' && req.method === 'GET') {
    return send(res, 200, layout('Forgot password', null, `<h1>Forgot password</h1>
<div class="card"><form method="POST" action="/forgot"><p>Email <input name="email" size="34"></p><p><button>Send reset link</button></p></form></div>`));
  }
  if (p === '/forgot' && req.method === 'POST') {
    attempt('Login & Authentication');
    const email = String(body.email || '');
    probe(email);
    const u = users.find(x => x.email === email);
    let msg;
    if (u) { resetTokens[email] = resetTokenFor(u); msg = 'Reset link sent to ' + email + '.'; }
    else msg = 'No account with that email.';
    return send(res, 200, layout('Forgot password', null, `<div class="card"><p>${esc(msg)}</p>
<form method="POST" action="/reset"><p>Email <input name="email" size="30"></p><p>Token <input name="token" size="30"></p><p>New password <input name="newpass" size="30"></p><p><button>Reset password</button></p></form></div>`));
  }
  if (p === '/reset' && req.method === 'POST') {
    attempt('Login & Authentication');
    const email = String(body.email || ''), token = String(body.token || ''), np = String(body.newpass || '');
    const u = users.find(x => x.email === email);
    if (u && token) {
      if (resetTokens[email] && resetTokens[email] === token) {
        u.pass = np; delete resetTokens[email];
        return send(res, 200, layout('Reset', null, '<div class="card">Password updated. <a href="/login">Log in</a></div>'));
      }
      if (token === resetTokenFor(u)) {
        pass('auth-reset');
        u.pass = np;
        return send(res, 200, layout('Reset', null, '<div class="card">Password updated. <a href="/login">Log in</a></div>'));
      }
    }
    return send(res, 200, layout('Reset', null, '<div class="card">Invalid or expired token. <a href="/forgot">Try again</a></div>'));
  }

  if (!user && !['/tests', '/complete', '/certificate'].includes(p)) return redirect(res, '/login');

  // ---------------- profile & members ----------------
  if (p === '/profile' && req.method === 'GET') {
    return send(res, 200, layout('Profile', user, `<h1>Your profile</h1><div class="card">
<p>Name: ${esc(user.name)}</p><p>Email: ${esc(user.email)}</p><p>Role: ${esc(user.role)} · Plan: ${esc(user.plan)}</p>
<form method="POST" action="/profile"><p>Display name <input name="name" value="${esc(user.name)}" size="30"></p><p><button>Save</button></p></form></div>`));
  }
  if (p === '/profile' && req.method === 'POST') {
    attempt('Registration & Profile');
    if (!cookies.hx_origin) pass('reg-csrf');
    if (body.name) { user.name = String(body.name); if (XSS_RE.test(user.name)) pass('reg-xss'); }
    return redirect(res, '/profile');
  }
  if (p === '/members') {
    attempt('Registration & Profile');
    const rows = users.filter(u => u.ws === user.ws).map(u => `<tr><td>${u.name}</td><td>${esc(u.email)}</td><td>${esc(u.wsRole)}</td></tr>`).join('');
    return send(res, 200, layout('Members', user, `<h1>Workspace members</h1><div class="card"><table><tr><th>Name</th><th>Email</th><th>Workspace role</th></tr>${rows}</table></div>`));
  }

  // ---------------- workflows ----------------
  if (p === '/') {
    const mine = workflows.filter(w => w.ws === user.ws);
    const items = mine.map(w => `<tr><td><a href="/workflow/${w.id}">${esc(w.name)}</a></td><td>${esc(w.trigger)}</td><td>${esc(w.actionType)}</td><td>${w.active ? 'Active' : 'Paused'}</td></tr>`).join('');
    return send(res, 200, layout('Dashboard', user, `<h1>Welcome, ${esc(user.name)}</h1>
<div class="card"><h3>Your workspace workflows</h3><table><tr><th>Name</th><th>Trigger</th><th>Action</th><th>Status</th></tr>${items}</table>
<p><a href="/search">Search all workflows</a></p></div>`));
  }
  if (p === '/workflows') {
    const mine = workflows.filter(w => w.ws === user.ws);
    const items = mine.map(w => `<tr><td><a href="/workflow/${w.id}">${esc(w.name)}</a></td><td>${esc(w.trigger)}</td><td>${esc(w.actionType)}</td><td>${w.active ? 'Active' : 'Paused'}</td></tr>`).join('');
    return send(res, 200, layout('Workflows', user, `<h1>Workflows</h1><div class="card"><table><tr><th>Name</th><th>Trigger</th><th>Action</th><th>Status</th></tr>${items}</table></div>`));
  }
  if (p === '/search') {
    attempt('Workflows');
    const q = String(url.searchParams.get('q') || '');
    let results;
    if (/'\s*or\s/i.test(q)) {
      results = workflows.slice();
      if (results.some(w => w.ws !== user.ws)) pass('wf-search-sqli');
    } else {
      results = workflows.filter(w => w.ws === user.ws && w.name.toLowerCase().includes(q.toLowerCase()));
    }
    if (XSS_RE.test(q)) pass('wf-search-xss');
    const items = results.map(w => `<tr><td><a href="/workflow/${w.id}">${esc(w.name)}</a></td><td>Workspace ${w.ws}</td><td>${w.priv ? 'Private' : 'Shared'}</td></tr>`).join('');
    return send(res, 200, layout('Search', user, `<h1>Search workflows</h1><div class="card">
<form method="GET" action="/search"><input name="q" size="40" value="${esc(q)}"> <button>Search</button></form>
<h3>Results for ${q}</h3><table>${items || '<tr><td>No matches.</td></tr>'}</table></div>`));
  }
  const wfMatch = p.match(/^\/workflow\/(\d+)(?:\/(run|toggle|export))?$/);
  if (wfMatch) {
    attempt('Workflows');
    const wf = workflows.find(w => w.id === Number(wfMatch[1]));
    if (!wf) return send(res, 404, 'Workflow not found');
    const sub = wfMatch[2];
    if (sub === 'export') {
      if (wf.ws !== user.ws) pass('wf-export');
      return send(res, 200, JSON.stringify(wf, null, 2), 'application/json');
    }
    if (sub === 'run' && req.method === 'POST') {
      if (wf.ws !== user.ws) pass('wf-run');
      const out = wf.actionType === 'webhook' ? 'Webhook POST ' + wf.actionConfig + ' -> 200 OK (simulated fetch)'
        : wf.actionType === 'email' ? 'Email action executed: ' + wf.actionConfig
        : 'Task action executed: ' + wf.actionConfig;
      runs.push({ id: nextRunId++, wfId: wf.id, by: user.id, status: 'success', output: out, at: 'just now' });
      return redirect(res, '/runs');
    }
    if (sub === 'toggle' && req.method === 'POST') {
      if (wf.ws !== user.ws) pass('wf-run');
      wf.active = !wf.active;
      return redirect(res, '/workflow/' + wf.id);
    }
    if (wf.ws !== user.ws) pass('wf-idor');
    if (wf.priv && wf.ownerId !== user.id) pass('wf-private');
    return send(res, 200, layout('Workflow', user, `<h1>${esc(wf.name)}</h1><div class="card">
<p>Trigger: ${esc(wf.trigger)}</p><p>Action: ${esc(wf.actionType)} — ${esc(wf.actionConfig)}</p>
<p>Status: ${wf.active ? 'Active' : 'Paused'} · Visibility: ${wf.priv ? 'Private' : 'Workspace'} · Owner id: ${wf.ownerId} · Workspace: ${wf.ws}</p>
<form method="POST" action="/workflow/${wf.id}/run" style="display:inline"><button>Run now</button></form>
<form method="POST" action="/workflow/${wf.id}/toggle" style="display:inline"><button>${wf.active ? 'Pause' : 'Activate'}</button></form>
<p><a href="/workflow/${wf.id}/export">Export JSON</a></p></div>`));
  }

  // ---------------- runs ----------------
  if (p === '/runs') {
    const mine = runs.filter(r => { const w = workflows.find(x => x.id === r.wfId); return w && w.ws === user.ws; });
    const items = mine.map(r => { const w = workflows.find(x => x.id === r.wfId); return `<tr><td><a href="/run/${r.id}">Run ${r.id}</a></td><td>${w ? esc(w.name) : '?'}</td><td>${esc(r.status)}</td><td>${esc(r.at)}</td></tr>`; }).join('');
    return send(res, 200, layout('Runs', user, `<h1>Run history</h1><div class="card"><table><tr><th>Run</th><th>Workflow</th><th>Status</th><th>When</th></tr>${items}</table></div>`));
  }
  const runMatch = p.match(/^\/run\/(\d+)$/);
  if (runMatch) {
    attempt('Runs & History');
    const run = runs.find(r => r.id === Number(runMatch[1]));
    if (!run) return send(res, 404, 'Run not found');
    const wf = workflows.find(w => w.id === run.wfId);
    if (wf && wf.ws !== user.ws) pass('run-idor');
    return send(res, 200, layout('Run detail', user, `<h1>Run ${run.id}</h1><div class="card">
<p>Workflow: ${wf ? esc(wf.name) : '?'} (workspace ${wf ? wf.ws : '?'})</p><p>Status: ${esc(run.status)}</p><p>Output: ${esc(run.output)}</p><p>When: ${esc(run.at)}</p></div>`));
  }

  // ---------------- templates ----------------
  if (p === '/templates' && req.method === 'GET') {
    attempt('Templates');
    const items = templates.map(t => `<tr><td>${esc(t.name)}</td><td>${t.ownerId === 0 ? 'Platform' : 'User ' + t.ownerId}</td><td>${esc(t.desc)}</td><td><form method="POST" action="/template/${t.id}/use"><button>Use template</button></form></td></tr>`).join('');
    return send(res, 200, layout('Templates', user, `<h1>Template gallery</h1><div class="card"><table><tr><th>Name</th><th>Owner</th><th>About</th><th></th></tr>${items}</table></div>`));
  }
  const tplMatch = p.match(/^\/template\/(\d+)\/use$/);
  if (tplMatch && req.method === 'POST') {
    attempt('Templates');
    const t = templates.find(x => x.id === Number(tplMatch[1]));
    if (!t) return send(res, 404, 'Template not found');
    if (t.ownerId !== 0 && t.ownerId !== user.id) pass('tpl-idor');
    workflows.push({ id: nextWorkflowId++, name: t.name + ' (copy)', ws: user.ws, ownerId: user.id, trigger: t.trigger, actionType: t.actionType, actionConfig: t.desc, active: false, priv: false });
    return redirect(res, '/workflows');
  }

  // ---------------- integrations ----------------
  if (p === '/integrations' && req.method === 'GET') {
    attempt('Integrations & API Keys');
    const team = users.filter(u => u.ws === user.ws);
    if (team.some(u => u.id !== user.id)) pass('int-keyleak');
    const keys = team.map(u => `<tr><td>${esc(u.name)}</td><td><code>${esc(u.apiKey)}</code></td></tr>`).join('');
    return send(res, 200, layout('Integrations', user, `<h1>Integrations</h1>
<div class="card"><h3>Your API key</h3><p><code>${esc(user.apiKey)}</code></p>
<form method="POST" action="/integrations/rotate"><button>Rotate my key</button></form>
<h3>Team API keys</h3><table><tr><th>Member</th><th>API key</th></tr>${keys}</table></div>
<div class="card"><h3>Webhook tester</h3><form method="POST" action="/integrations/webhook-test"><p>URL <input name="url" size="48" placeholder="https://example.com/hook"></p><p><button>Send test request</button></p></form></div>`));
  }
  if (p === '/integrations/webhook-test' && req.method === 'POST') {
    attempt('Integrations & API Keys');
    const target = String(body.url || '');
    let out;
    if (/169\.254|127\.0\.0\.1|localhost|internal/i.test(target)) {
      pass('int-ssrf');
      out = 'Fetched ' + target + ' -> 200 OK. Body: internal-service hexa-metadata: instance-id i-0hexa109, role workflow-node, export endpoint /internal/export (simulated internal response)';
    } else {
      out = 'Fetched ' + target + ' -> 200 OK (simulated)';
    }
    return send(res, 200, layout('Webhook test', user, `<h1>Webhook test result</h1><div class="card"><p>${esc(out)}</p><p><a href="/integrations">Back</a></p></div>`));
  }
  if (p === '/integrations/rotate' && req.method === 'POST') {
    attempt('Integrations & API Keys');
    const target = body.userId ? users.find(u => u.id === Number(body.userId)) : user;
    if (target) {
      if (target.id !== user.id) pass('int-rotate');
      target.apiKey = 'hwk_' + crypto.randomBytes(4).toString('hex');
    }
    return redirect(res, '/integrations');
  }
  // ---------------- workspace ----------------
  if (p === '/workspace' && req.method === 'GET') {
    attempt('Workspaces & Members');
    const ws = workspaces.find(w => w.id === user.ws);
    const members = users.filter(u => u.ws === user.ws).map(u => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.wsRole)}</td>
<td><form method="POST" action="/workspace/role"><input type="hidden" name="userId" value="${u.id}"><select name="role"><option>member</option><option>admin</option><option>owner</option></select> <button>Set role</button></form></td></tr>`).join('');
    return send(res, 200, layout('Workspace', user, `<h1>Workspace: ${esc(ws ? ws.name : '')}</h1><div class="card"><table><tr><th>Name</th><th>Email</th><th>Role</th><th>Change</th></tr>${members}</table></div>`));
  }
  if (p === '/workspace/role' && req.method === 'POST') {
    attempt('Workspaces & Members');
    const target = users.find(u => u.id === Number(body.userId));
    if (target && target.ws === user.ws) {
      if (user.wsRole !== 'owner') pass('ws-role');
      target.wsRole = String(body.role || 'member');
    }
    return redirect(res, '/workspace');
  }

  // ---------------- admin ----------------
  if (p === '/admin' && req.method === 'GET') {
    attempt('Admin Panel');
    if (cookies.hx_role !== 'admin') return send(res, 403, 'Admins only.');
    if (user.role !== 'admin') { pass('adm-bac'); pass('auth-cookie'); }
    const rows = users.map(u => `<tr><td>${u.name}</td><td>${esc(u.email)}</td><td>${esc(u.pass)}</td><td>${esc(u.role)}</td><td>${esc(u.plan)}</td>
<td><form method="POST" action="/admin/plan"><input type="hidden" name="userId" value="${u.id}"><select name="plan"><option>free</option><option>pro</option></select> <button>Set plan</button></form></td></tr>`).join('');
    return send(res, 200, layout('Admin', user, `<h1>Admin panel</h1><div class="card"><table><tr><th>Name</th><th>Email</th><th>Password</th><th>Role</th><th>Plan</th><th>Change plan</th></tr>${rows}</table></div>`));
  }
  if (p === '/admin/plan' && req.method === 'POST') {
    attempt('Admin Panel');
    if (cookies.hx_role !== 'admin') return send(res, 403, 'Admins only.');
    if (!cookies.hx_origin) pass('adm-csrf');
    const target = users.find(u => u.id === Number(body.userId));
    if (target) target.plan = String(body.plan || target.plan);
    return redirect(res, '/admin');
  }

  // ---------------- lab system pages ----------------
  if (p === '/tests') {
    const pj = progressJSON();
    let html = `<h1>Mission Board — LAB ${LAB_NUMBER} ${LAB_NAME}</h1><p>${pj.done}/${pj.total} tests · ${pj.pct}%</p>`;
    for (const f of FEATURES) {
      html += `<div class="card"><h3>${esc(f)} <span class="muted">(attempts: ${pj.features[f].attempts})</span></h3>`;
      for (const t of TESTS.filter(x => x.feature === f)) {
        const done = !!state.tests[t.id];
        html += `<p><span class="${done ? 'ok' : 'open'}">${done ? '✓' : '○'}</span> <b>${esc(t.name)}</b> <span class="muted">${esc(t.owasp)} · ${esc(t.difficulty)}</span><br>
<span class="hints-${t.id}"></span> <button type="button" onclick="showHint('${t.id}')">Show hint</button></p>`;
      }
      html += '</div>';
    }
    const hintData = {};
    for (const t of TESTS) hintData[t.id] = t.hints;
    html += `<script>var HINTS=${JSON.stringify(hintData)};var IDX={};function showHint(id){var i=IDX[id]||0;if(i>=HINTS[id].length)return;IDX[id]=i+1;var s=document.querySelector('.hints-'+id);var d=document.createElement('div');d.textContent='Hint '+IDX[id]+': '+HINTS[id][i];s.appendChild(d);}</script>`;
    return send(res, 200, layout('Mission Board', user, html));
  }
  if (p === '/complete/name' && req.method === 'POST') {
    state.testerName = String(body.name || '').slice(0, 80);
    save();
    return redirect(res, '/complete');
  }
  if (p === '/complete') {
    const pj = progressJSON();
    if (!pj.complete) {
      const left = TESTS.filter(t => !state.tests[t.id]).map(t => `<li>${esc(t.name)} (${esc(t.feature)})</li>`).join('');
      return send(res, 200, layout('Complete', user, `<h1>Not yet complete</h1><div class="card"><p>Progress: ${pj.done}/${pj.total} (${pj.pct}%)</p><p>Still open:</p><ul>${left}</ul></div>`));
    }
    let s1 = `<p>Total features in this lab: <b>${FEATURES.length}</b></p>`;
    let s2 = '<ul>' + FEATURES.map(f => { const ts = TESTS.filter(t => t.feature === f); return `<li>${esc(f)}: ${ts.length} vulnerabilities (${ts.filter(t => state.tests[t.id]).length} solved)</li>`; }).join('') + '</ul>';
    let s3 = '<p>' + pj.done + ' ways of testing were completed:</p><ul>' + TESTS.map(t => `<li>${esc(t.name)} — ${esc(t.owasp)}</li>`).join('') + '</ul>';
    let s4 = '<ul>' + TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('') + '</ul>';
    let s5 = '<ul>' + TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('') + '</ul>';
    let s6 = '<ul>' + TESTS.map(t => `<li><b>${esc(t.report.title)}</b> (${esc(t.report.severity)}) — Remediation: ${esc(t.report.remediation)}</li>`).join('') + '</ul>';
    return send(res, 200, layout('Complete', user, `<h1>Lab complete — 100%</h1>
<div class="card"><h3>1) Lab totals</h3>${s1}<h3>2) Vulnerabilities per feature</h3>${s2}<h3>3) How testing was done</h3>${s3}</div>
<div class="card"><h3>4) What you learned</h3>${s4}</div>
<div class="card"><h3>5) What this means for a real client</h3>${s5}</div>
<div class="card"><h3>6) Writing it in a real report</h3>${s6}</div>
<div class="card"><h3>Your completion key for Lab ${LAB_NUMBER + 1}</h3><p style="font-size:20px"><code>${esc(completionKey())}</code></p>
<form method="POST" action="/complete/name"><p>Your name for the certificate: <input name="name" value="${esc(state.testerName)}" size="30"> <button>Save name</button></p></form>
<p><a href="/certificate">View your certificate</a></p></div>`));
  }
  if (p === '/certificate') {
    const pj = progressJSON();
    if (!pj.complete) return redirect(res, '/complete');
    const name = state.testerName || (user ? user.name : 'Tester');
    const date = state.completedAt ? new Date(state.completedAt).toISOString().slice(0, 10) : '';
    return send(res, 200, `<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER}</title>
<style>body{font-family:Georgia,serif;background:#f3f4f6;margin:0}.card{max-width:720px;margin:50px auto;background:#fff;border:3px double #111827;padding:44px;text-align:center}@media print{body{background:#fff}.card{border:2px solid #111827}}</style></head>
<body><div class="card"><img src="/logo.png" alt="HexaCyberLab" style="height:72px">
<h1>Certificate of Completion</h1><p>This certifies that</p><h2>${esc(name)}</h2>
<p>has completed 100% of the security tests in LAB ${LAB_NUMBER} — ${LAB_NAME} (${pj.total} tests across ${FEATURES.length} features)</p>
<p>Completed on ${esc(date)}</p><p style="margin-top:28px">HexaCyberLab — Built by Md. Jony Hassain, Founder</p></div></body></html>`);
  }

  return send(res, 404, 'Not found');
}

if (process.argv.includes('--gen-docs')) { genDocs(); process.exit(0); }

const server = http.createServer((req, res) => {
  handle(req, res).catch(() => { try { send(res, 500, 'Server error'); } catch (e) {} });
});
server.listen(PORT, '127.0.0.1', () => console.log(LAB_NAME + ' LAB ' + LAB_NUMBER + ' listening on 127.0.0.1:' + PORT));
