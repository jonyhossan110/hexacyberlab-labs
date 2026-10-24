'use strict';
/*
 * HexaCloud — LAB 23 of the HexaCyberLab vulnerable-lab programme.
 * A deliberately vulnerable cloud management console for hands-on security training.
 * LOCAL ONLY. Zero dependencies. Binds 127.0.0.1:3032.
 * Built by Md. Jony Hassain, Founder of HexaCyberLab.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const LAB_NUMBER = 23;
const LAB_NAME = 'HexaCloud';
const PORT = 3032;
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const LOGO_FILE = path.join(DIR, 'logo.png');

/* ------------------------------------------------------------------ *
 * Fragment vault A (harmless-looking config fragments; a tiny
 * assembler in region C rebuilds values at runtime when needed).
 * ------------------------------------------------------------------ */
const _fragA1 = ['TC1YSA==', 'Ti0zMg=='];
const _fragA2 = ['TC1YSA==', 'US00Mg=='];

/* --------------------------- progress ------------------------------ */
let state = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadState() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      state = Object.assign(state, raw);
    }
  } catch (e) { /* corrupted state file -> start fresh */ }
}
function saveState() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2)); } catch (e) {}
}
loadState();

function bump(feature) {
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  saveState();
}
function pass(id) {
  if (!TESTS.find(t => t.id === id)) return;
  if (!state.tests[id]) {
    state.tests[id] = true;
    if (Object.keys(state.tests).length === TESTS.length) {
      state.completedAt = new Date().toISOString();
      state.keyRevealed = true;
    }
    saveState();
  }
}
function progress() {
  const total = TESTS.length;
  const done = Object.keys(state.tests).length;
  const pct = total ? Math.floor((done / total) * 100) : 0;
  const features = {};
  for (const t of TESTS) {
    features[t.feature] = features[t.feature] || { total: 0, done: 0, attempts: state.attempts[t.feature] || 0 };
    features[t.feature].total += 1;
    if (state.tests[t.id]) features[t.feature].done += 1;
  }
  for (const f of Object.keys(features)) features[f].attempts = state.attempts[f] || 0;
  return { lab: LAB_NAME, number: LAB_NUMBER, total, done, pct, features, complete: done === total };
}

/* --------------------------- TESTS registry ------------------------ */
const TESTS = [
  /* ---------- Login & Authentication ---------- */
  { id: 'sqli-login', feature: 'Login & Authentication', name: 'SQL Injection — Login Bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login form builds its database query by gluing your input straight into the query string.',
            'Try a classic tautology in the email field — something that makes the WHERE clause always true.',
            "Use email: ' OR '1'='1' -- with any password. The query matches the first user row and lets you in as them."],
    lesson: 'String-built queries let an attacker rewrite the login logic itself; parameterised queries make input data, never code.',
    impact: 'On a real client console this is a full account takeover of the first account in the table — usually an administrator — with no password at all.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.' } },
  { id: 'brute-force', feature: 'Login & Authentication', name: 'No Rate Limiting — Brute-Force Login', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['Notice what does NOT happen after many wrong passwords for one account.',
            'There is no lockout, no CAPTCHA and no slow-down — the 10th failure is processed like the 1st.',
            'Script 10+ wrong-password logins for dev@acme.cloud; the attempt that is still calmly processed proves the missing throttle.'],
    lesson: 'Without throttling, lockout or MFA, password guessing is only a matter of time and a wordlist.',
    impact: 'Attackers can grind through password lists against real staff accounts until one works — a top cause of cloud console breaches.',
    report: { title: 'Missing Rate Limiting / Account Lockout on Login Endpoint', severity: 'High', remediation: 'Add progressive delays, lockout or step-up challenges after repeated failures, and alert on credential-stuffing patterns.' } },
  { id: 'user-enumeration', feature: 'Login & Authentication', name: 'User Enumeration via Login & Reset Responses', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the error for an email that exists with one that does not — on login AND on forgot-password.',
            'One says the password is wrong; the other says no such account exists. That difference is a free user list.',
            'Submit a login for root@globex.cloud with a wrong password, then one for nobody@nowhere.cloud; when both response types have been observed, enumeration is proven.'],
    lesson: 'Different errors for "no such user" vs "wrong password" hand attackers a verified target list for phishing and password spraying.',
    impact: 'Attackers confirm which employee emails are real accounts, then focus password attacks and phishing only on those.',
    report: { title: 'Account Enumeration Through Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic "invalid credentials" message for every failed login or reset request, regardless of account existence.' } },
  { id: 'default-creds', feature: 'Login & Authentication', name: 'Weak / Default Demo Credentials', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['The README lists the seeded accounts — one of them is a leftover demo account with a guessable password.',
            'Demo accounts shipped to production are a classic way in.',
            'Log in as demo@acme.cloud with password demo123.'],
    lesson: 'Demo and default accounts with vendor passwords are the first thing attackers try on any new console.',
    impact: 'A forgotten demo login gives an attacker a genuine foothold inside the client’s cloud account from day one.',
    report: { title: 'Default / Demo Account With Weak Password Present in Production', severity: 'High', remediation: 'Remove demo accounts before launch; force unique strong passwords and MFA for every real account.' } },
  { id: 'reset-token', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07:2021 Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a password reset and study the token format — it is built only from things an attacker can know.',
            'The token contains the user id and a small number derived from the email address itself.',
            'Token = rst_<userId>_<sum of the email’s character codes × 31 mod 100000>. Compute it for admin@acme.cloud (id 1) and POST /reset WITHOUT requesting one first.'],
    lesson: 'Reset tokens must be long, random and single-use; anything derivable from public data is an account-takeover shortcut.',
    impact: 'Anyone who knows a staff email can mint a valid reset token and take over the account — including the owner’s.',
    report: { title: 'Password Reset Tokens Are Predictable From Public Data', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), store only a hash, expire quickly and invalidate after use.' } },
  { id: 'cookie-tamper', feature: 'Login & Authentication', name: 'Client-Side Role Cookie Trusted for Authorization', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After login, inspect the cookies the app sets — one of them carries your role, stored in your own browser.',
            'The server reads your role from that cookie instead of its own database. Cookies are yours to edit.',
            'Log in as viewer@acme.cloud, change the hx_role cookie value to owner, then visit /admin.'],
    lesson: 'Authorization data must live server-side; anything stored on the client can be rewritten by the client.',
    impact: 'The lowest-privilege user becomes an administrator by editing one cookie — full console compromise.',
    report: { title: 'Authorization Decisions Trust a Client-Controlled Role Cookie', severity: 'Critical', remediation: 'Resolve roles from the server-side session record on every request; never trust client-supplied role claims.' } },

  /* ---------- Registration & Profile ---------- */
  { id: 'mass-assignment', feature: 'Registration & Profile', name: 'Mass Assignment — Role & Tenant Injection at Registration', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['The registration handler saves the whole submitted object onto the new user record.',
            'Extra form fields you add yourself are honoured — including ones the form never shows.',
            'POST /register with extra fields role=owner and tenantId=2; your new account is created as an owner inside the other tenant.'],
    lesson: 'Bind only whitelisted fields on sign-up and profile updates; never copy a request body onto a privileged record.',
    impact: 'Anyone on the internet can register themselves as an owner inside a customer’s tenant — instant insider access.',
    report: { title: 'Mass Assignment in Registration Allows Role and Tenant Injection', severity: 'Critical', remediation: 'Whitelisting: accept only name/email/password at registration; assign role and tenant server-side.' } },
  { id: 'weak-password', feature: 'Registration & Profile', name: 'Weak Password Policy at Registration', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['How short a password will the sign-up form accept?',
            'There is no minimum length or complexity check at all.',
            'Register a new account with a 1–3 character password; its acceptance proves the missing policy.'],
    lesson: 'If the app accepts tiny passwords, users will pick them — and brute force becomes trivial.',
    impact: 'Customer accounts protected by 3-character passwords fall to guessing in seconds.',
    report: { title: 'No Minimum Password Strength Enforced at Registration', severity: 'Medium', remediation: 'Enforce a minimum length (12+ recommended) and block known-breached passwords at sign-up and password change.' } },
  { id: 'stored-xss', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is shown in the page header and on the admin user list — rendered exactly as typed.',
            'Nothing encodes it on the way out.',
            'Set your profile display name to <script>alert(1)</script> (or an <svg onload> payload) and save; it is stored and served raw.'],
    lesson: 'Any user-controlled text rendered without output encoding is a stored XSS waiting for a victim.',
    impact: 'An attacker plants script that runs in an administrator’s browser — session theft and actions performed as the admin.',
    report: { title: 'Stored Cross-Site Scripting via Profile Display Name', severity: 'High', remediation: 'Context-encode all user-supplied output; sanitise rich text; add a Content-Security-Policy as defence in depth.' } },
  { id: 'profile-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Profile updates change state with a plain POST — look for an anti-CSRF token in the form. There is none.',
            'The app sets an hx_seen marker cookie on its own pages; foreign posts lack the app’s own origin.',
            'While logged in, POST /profile from a foreign Origin (e.g. Origin: https://evil.example) with a new display name; the change is accepted.'],
    lesson: 'State-changing requests need an unguessable token (or strict SameSite cookies) so other sites cannot ride a victim’s session.',
    impact: 'A malicious page a staff member visits can silently change their profile — the classic first step to stored-XSS delivery to admins.',
    report: { title: 'Cross-Site Request Forgery on Profile Update', severity: 'Medium', remediation: 'Require a per-session anti-CSRF token on every state-changing form and verify Origin/Referer as a second layer.' } },

  /* ---------- Resources ---------- */
  { id: 'resource-idor', feature: 'Resources', name: 'Cross-Tenant Resource IDOR', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Resource pages use plain sequential ids in the URL: /resources/101, 102, 103…',
            'The detail page checks that you are logged in — but never that the resource belongs to YOUR tenant.',
            'Log in on the Acme tenant and open /resources/104 — a Globex server — by guessing its id.'],
    lesson: 'Every object fetch must verify the object belongs to the caller’s tenant, not just that the caller is logged in.',
    impact: 'One customer can read every other customer’s servers, databases and configurations — a multi-tenant data breach.',
    report: { title: 'Insecure Direct Object Reference Exposes Other Tenants’ Resources', severity: 'High', remediation: 'Scope every resource query by the authenticated tenant and return 404 for foreign objects.' } },
  { id: 'resource-action', feature: 'Resources', name: 'Unauthorized Resource Actions (Stop / Terminate / Resize)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The action buttons POST to /resources/<id>/action — the server never re-checks ownership or role.',
            'Even a read-only viewer can send the same POST by hand.',
            'As viewer@acme.cloud, POST action=terminate (or a resize with an absurd size) for a Globex resource id such as 104.'],
    lesson: 'Destructive and billable actions need the same ownership + role checks as the screens that display them — on the server.',
    impact: 'A read-only user — or a rival tenant — can terminate production servers and resize resources, causing outage and surprise bills.',
    report: { title: 'Missing Authorization on Resource Lifecycle Actions', severity: 'Critical', remediation: 'Enforce tenant ownership and role permission server-side for every lifecycle action; log and confirm destructive ones.' } },

  /* ---------- Storage Buckets ---------- */
  { id: 'bucket-exposure', feature: 'Storage Buckets', name: 'Private Bucket Made Public Without Authorization', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Bucket settings include a visibility toggle: POST /buckets/<id>/visibility.',
            'The toggle performs no ownership or role check — and /public/bucket/<id> then serves the files to anyone, logged in or not.',
            'As any Acme user, set bucket 203 (Globex) to public — or make your own tenant’s private bucket public — then open /public/bucket/203 in a logged-out request.'],
    lesson: 'Storage exposure settings are security-critical: changing them needs ownership, a privileged role and ideally a confirmation step.',
    impact: 'Private backups and customer files become downloadable by the whole internet — the classic cloud storage breach headline.',
    report: { title: 'Bucket Visibility Can Be Changed Without Authorization, Exposing Private Files Publicly', severity: 'Critical', remediation: 'Require bucket ownership and an admin role for visibility changes; default private; alert on any bucket becoming public.' } },
  { id: 'bucket-traversal', feature: 'Storage Buckets', name: 'Path Traversal in Bucket File Download', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['File downloads are served from /buckets/<id>/files/<name> — the name goes straight into a path.',
            'Dot-dot sequences are never stripped.',
            'Request /buckets/201/files/..%2fserver-config (or ../ sequences) and the app happily reads outside the bucket.'],
    lesson: 'Never let user input become a filesystem path without canonicalisation and an allow-list check.',
    impact: 'Attackers step out of the bucket and read application configuration and secrets stored on the server.',
    report: { title: 'Path Traversal in File Download Reads Files Outside the Bucket', severity: 'High', remediation: 'Resolve the canonical path and verify it stays inside the bucket directory; serve files by id, not by raw name.' } },

  /* ---------- IAM & Policies ---------- */
  { id: 'iam-escalation', feature: 'IAM & Policies', name: 'IAM Privilege Escalation — Unrestricted Role Assignment', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The IAM console posts role changes to /iam/role — look at what the server verifies before applying them. Nothing.',
            'Any signed-in user can name any user id and any role.',
            'As viewer@acme.cloud, POST /iam/role with userId=3 (yourself) and role=owner — then check your new powers.'],
    lesson: 'Privilege changes are the crown jewels of an IAM system; they need caller authorization checks above all else.',
    impact: 'The least-privileged account promotes itself to owner — total tenant takeover from a single request.',
    report: { title: 'Privilege Escalation: Any User Can Assign Any Role to Any User', severity: 'Critical', remediation: 'Only tenant owners/admins may change roles, only within their tenant; audit-log every role change.' } },
  { id: 'policy-idor', feature: 'IAM & Policies', name: 'Cross-Tenant IAM Policy Disclosure (IDOR)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Policy documents live at /iam/policies/<id> with sequential ids.',
            'Like the resource pages, the tenant check is missing here too.',
            'While on the Acme tenant, open /iam/policies/403 — Globex’s admin policy.'],
    lesson: 'Access-control checks must be applied to every object type — policies describe exactly who can do what, so leaking them maps the attack surface.',
    impact: 'Rivals learn the exact permission layout of another tenant, making targeted privilege-escalation attacks far easier.',
    report: { title: 'IAM Policy Documents Accessible Across Tenants (IDOR)', severity: 'Medium', remediation: 'Scope policy reads by tenant; return 404 for policies outside the caller’s tenant.' } },

  /* ---------- Billing & Plans ---------- */
  { id: 'billing-tamper', feature: 'Billing & Plans', name: 'Billing Credit Manipulation', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['The billing page accepts promo/credit posts at /billing/credit — the amount is taken from the request.',
            'The server never validates the amount’s size or sign.',
            'POST /billing/credit with amount=5000 (or a negative amount) and watch the tenant balance obey.'],
    lesson: 'Money values must be computed and validated server-side; client-supplied amounts are wishes, not facts.',
    impact: 'Customers erase their bills or run up fraudulent credit — direct revenue loss for the provider.',
    report: { title: 'Client-Supplied Billing Credit Amount Accepted Without Validation', severity: 'High', remediation: 'Validate credit amounts against server-side promo rules; cap values; require finance role and audit trail.' } },
  { id: 'plan-bypass', feature: 'Billing & Plans', name: 'Plan Change Without Payment Verification', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['POST /billing/plan switches the tenant plan instantly.',
            'No checkout, no payment method check, no approval step stands in the way.',
            'From the Acme tenant (Pro plan) POST /billing/plan with plan=Enterprise; the upgrade applies immediately, free.'],
    lesson: 'Plan/entitlement changes must be bound to a verified payment event, not to a bare request parameter.',
    impact: 'Every customer upgrades to the top tier for free — the pricing model collapses.',
    report: { title: 'Subscription Plan Can Be Changed Without Payment', severity: 'High', remediation: 'Change plans only from a verified payment-webhook flow; reconcile entitlements with the billing provider.' } },
  { id: 'invoice-idor', feature: 'Billing & Plans', name: 'Cross-Tenant Invoice Access (IDOR)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Invoices are addressed by tenant id: /billing/invoice/<tenantId>.',
            'Any logged-in user can type another tenant’s id.',
            'As an Acme user, open /billing/invoice/2 to read Globex’s invoice.'],
    lesson: 'Financial documents need the same per-object tenant check as any other record.',
    impact: 'Competitors read each other’s invoices — pricing, usage and customer scale leak to rivals.',
    report: { title: 'Invoices Accessible Across Tenants by Changing the Tenant Id', severity: 'Medium', remediation: 'Derive the invoice tenant from the session, never from the URL; verify ownership before rendering.' } },

  /* ---------- Search & Discovery ---------- */
  { id: 'search-sqli', feature: 'Search & Discovery', name: 'SQL Injection in Resource Search', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['The global search also builds its query by string concatenation.',
            'A tautology in the search box removes the tenant filter from the WHERE clause.',
            "Search for: ' OR '1'='1 — results suddenly include the other tenant’s resources."],
    lesson: 'Search boxes are injection surfaces too; every query needs parameterisation, not just login forms.',
    impact: 'Attackers dump the entire multi-tenant resource catalogue through one search field.',
    report: { title: 'SQL Injection in Global Search Leaks Cross-Tenant Data', severity: 'High', remediation: 'Parameterise search queries and keep the tenant filter in server-side code, not in the query string built from input.' } },
  { id: 'reflected-xss', feature: 'Search & Discovery', name: 'Reflected XSS in Search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The results page echoes "Results for: <your query>" — unencoded.',
            'Markup you type comes straight back in the page.',
            'Search for <script>alert(1)</script> and view the page source: your payload is reflected raw.'],
    lesson: 'Echoing user input into HTML without encoding turns a search box into a script-delivery tool.',
    impact: 'Attackers send staff a crafted search link that runs script in their browser under the console’s origin.',
    report: { title: 'Reflected Cross-Site Scripting in Search Results', severity: 'Medium', remediation: 'HTML-encode all reflected input; validate query length/characters; add CSP.' } },

  /* ---------- API & Integrations ---------- */
  { id: 'api-bola', feature: 'API & Integrations', name: 'API Broken Object-Level Authorization (BOLA)', owasp: 'A01:2021 / API1:2023 BOLA', difficulty: 'Intermediate',
    hints: ['The JSON API serves /api/resources/<id> to any valid API key.',
            'It authenticates the key — then forgets to check the object’s tenant.',
            'Call GET /api/resources/104 with YOUR Acme API key; Globex’s server comes back as JSON.'],
    lesson: 'APIs must authorise per object, not just per caller; a valid key is not a licence to every record.',
    impact: 'Any API customer can enumerate and read every tenant’s infrastructure through the official API.',
    report: { title: 'Broken Object-Level Authorization in Resource API', severity: 'High', remediation: 'Check object ownership against the key’s tenant on every API object read; return 404 cross-tenant.' } },
  { id: 'api-key-guess', feature: 'API & Integrations', name: 'Predictable API Key Derivation', owasp: 'A07:2021 / API2:2023 Broken Authentication', difficulty: 'Advanced',
    hints: ['Besides the issued live keys, the API quietly accepts a second, undocumented key format.',
            'The fallback keys are derived from something public: the account’s email address.',
            "The fallback key is 'hx_' + base64(email). Compute it for root@globex.cloud and call /api/resources with NO session — you are answered as Globex."],
    lesson: 'Credentials must be random; a key derived from an email address is public information wearing a costume.',
    impact: 'Anyone who knows a customer’s email can forge their API key and act as that tenant programmatically.',
    report: { title: 'API Accepts Predictable Keys Derived From Account Email', severity: 'Critical', remediation: 'Issue only high-entropy random API keys, store hashes, and remove any deterministic fallback authentication.' } },

  /* ---------- Platform & Admin ---------- */
  { id: 'ssrf-metadata', feature: 'Platform & Admin', name: 'SSRF to the Simulated Instance Metadata Service', owasp: 'A10:2021 SSRF', difficulty: 'Advanced',
    hints: ['The console has a "metadata lookup" tool that fetches a URL you give it, server-side.',
            'Cloud metadata endpoints (169.254.169.254) hand out temporary credentials to anything that can ask.',
            'Ask the tool for http://169.254.169.254/latest/meta-data/iam-credentials and read the simulated credentials it returns.'],
    lesson: 'Any server-side fetcher must allow-list destinations and block link-local/metadata ranges; IMDS needs hop limits and tokens (IMDSv2).',
    impact: 'Attackers steal the cloud credentials of the server itself — the keys to the whole cloud account.',
    report: { title: 'Server-Side Request Forgery Reaches the Instance Metadata Service', severity: 'Critical', remediation: 'Allow-list fetch destinations, block 169.254.0.0/16 and internal ranges, require IMDSv2 tokens, and isolate the fetcher.' } },
  { id: 'debug-exposure', feature: 'Platform & Admin', name: 'Sensitive Data Exposure via /debug', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Development consoles often leave a diagnostics page behind. This one did.',
            'It dumps configuration for ALL tenants, including API keys.',
            'While logged in, open /debug and read the other tenant’s API keys and internal settings.'],
    lesson: 'Debug and diagnostics endpoints must never ship to production — or must sit behind strict admin auth.',
    impact: 'One page hands attackers every tenant’s API keys and internal configuration — game over in a single request.',
    report: { title: 'Debug Endpoint Exposes All Tenants’ Configuration and API Keys', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; if essential, restrict to platform admins and audit access.' } },
  { id: 'admin-csrf', feature: 'Platform & Admin', name: 'CSRF on Admin User-Disable Action', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Admins can disable users with POST /admin/users/<id>/disable — again, no anti-CSRF token anywhere.',
            'A foreign Origin on that POST is accepted just the same.',
            'While holding an admin-capable session, POST the disable action with Origin: https://evil.example; the user is disabled anyway.'],
    lesson: 'Privileged state changes are the most important requests to protect with CSRF tokens.',
    impact: 'An attacker page visited by an admin disables customer accounts — sabotage performed with the admin’s own session.',
    report: { title: 'Cross-Site Request Forgery on Administrative User-Disable Action', severity: 'High', remediation: 'Require anti-CSRF tokens on all admin actions and verify Origin; re-authenticate for destructive operations.' } }
];

/* --------------------------- seed data ----------------------------- */
const tenants = [
  { id: 1, name: 'Acme Corp', plan: 'Pro', monthlyCost: 149, credit: 0 },
  { id: 2, name: 'Globex Inc', plan: 'Business', monthlyCost: 429, credit: 0 }
];
const users = [
  { id: 1, tenantId: 1, email: 'admin@acme.cloud', password: 'admin123', role: 'owner', name: 'Alicia Admin', displayName: 'Alicia Admin', apiKey: 'hx_live_acme_9f2Kx7', disabled: false },
  { id: 2, tenantId: 1, email: 'dev@acme.cloud', password: 'dev123', role: 'developer', name: 'Dev Patel', displayName: 'Dev Patel', apiKey: 'hx_live_acme_77Qdz2', disabled: false },
  { id: 3, tenantId: 1, email: 'viewer@acme.cloud', password: 'viewer123', role: 'viewer', name: 'Vera Viewer', displayName: 'Vera Viewer', apiKey: 'hx_live_acme_31Zxm9', disabled: false },
  { id: 4, tenantId: 1, email: 'demo@acme.cloud', password: 'demo123', role: 'viewer', name: 'Demo User', displayName: 'Demo User', apiKey: 'hx_live_acme_demo44', disabled: false },
  { id: 5, tenantId: 2, email: 'root@globex.cloud', password: 'globex123', role: 'owner', name: 'Gus Globex', displayName: 'Gus Globex', apiKey: 'hx_live_globex_51Mnq8', disabled: false },
  { id: 6, tenantId: 2, email: 'ops@globex.cloud', password: 'ops123', role: 'admin', name: 'Olga Ops', displayName: 'Olga Ops', apiKey: 'hx_live_globex_88Rtw3', disabled: false }
];
let nextUserId = 7;
const resources = [
  { id: 101, tenantId: 1, type: 'server', name: 'web-prod-01', status: 'running', size: 'm5.large', detail: 'Ubuntu 24.04 · 2 vCPU · public IP 54.210.x.x' },
  { id: 102, tenantId: 1, type: 'server', name: 'api-prod-02', status: 'running', size: 'm5.xlarge', detail: 'Ubuntu 24.04 · 4 vCPU · behind load balancer' },
  { id: 103, tenantId: 1, type: 'database', name: 'acme-main-db', status: 'running', size: 'db.r6g.large', detail: 'PostgreSQL 16 · 200 GB · nightly snapshots' },
  { id: 104, tenantId: 2, type: 'server', name: 'globex-app-01', status: 'running', size: 'm5.2xlarge', detail: 'Debian 12 · 8 vCPU · customer portal host' },
  { id: 105, tenantId: 2, type: 'database', name: 'globex-analytics', status: 'running', size: 'db.r6g.xlarge', detail: 'PostgreSQL 16 · 1 TB · analytics warehouse' },
  { id: 106, tenantId: 2, type: 'server', name: 'globex-worker-01', status: 'stopped', size: 't3.medium', detail: 'Debian 12 · batch worker · stopped' }
];
const buckets = [
  { id: 201, tenantId: 1, name: 'acme-backups', public: false, files: {
      'db-snapshot-2026-10-20.sql': '-- SIMULATED database snapshot of acme-main-db (fake training data)\nCREATE TABLE customers (id int, email text);\nINSERT INTO customers VALUES (1, \'customer@example.com\');',
      'readme.txt': 'Nightly backups for Acme Corp. Retention: 30 days.' } },
  { id: 202, tenantId: 1, name: 'acme-public-assets', public: false, files: {
      'site-logo-note.txt': 'Marketing assets live here. Currently private while the site redesign is in progress.' } },
  { id: 203, tenantId: 2, name: 'globex-media', public: false, files: {
      'campaign-brief.txt': 'SIMULATED: Globex Q4 campaign brief — confidential until launch.',
      'pricing-sheet.csv': 'plan,monthly\nBusiness,429\nEnterprise,1299' } },
  { id: 204, tenantId: 2, name: 'globex-secrets', public: false, files: {
      'deploy-keys.txt': 'SIMULATED deploy keys for the Globex pipeline (fake training values).' } }
];
const policies = [
  { id: 401, tenantId: 1, name: 'Acme Developer Policy', doc: 'Allow: resources:read, resources:start/stop (own tenant). Deny: billing:*, iam:write.' },
  { id: 402, tenantId: 1, name: 'Acme Billing Policy', doc: 'Allow: billing:read. Deny: billing:credit, billing:plan-change (finance approval required).' },
  { id: 403, tenantId: 2, name: 'Globex Admin Policy', doc: 'Allow: * within Globex tenant, including iam:write and user:disable. Deny: cross-tenant access.' }
];
const sessions = new Map();      // sid -> userId
let nextSid = 1;
const failedLogins = new Map();  // email -> count
const enumSeen = new Map();      // ip -> { unknown:bool, known:bool }
const issuedResetTokens = new Set();

function tenantOf(id) { return tenants.find(t => t.id === id); }
function derivedKey(u) { return 'hx_' + Buffer.from(u.email, 'utf8').toString('base64'); }
function resetTokenFor(u) {
  const sum = [...u.email].reduce((a, c) => a + c.charCodeAt(0), 0);
  return 'rst_' + u.id + '_' + String((sum * 31) % 100000);
}
function injectionLike(s) {
  if (!s) return false;
  const v = String(s);
  return /'\s*(or|and)\s+('?[^\s'&]+'?\s*=\s*'?[^\s'&]+'?|1\s*=\s*1)/i.test(v)
      || v.includes("'--") || v.includes("' --")
      || /'\s*or\s+1\s*=\s*1/i.test(v)
      || v.toLowerCase().includes("' or '1'='1") || v.toLowerCase().includes('" or "1"="1');
}
function xssLike(s) {
  if (!s) return false;
  return /<script|onerror\s*=|onload\s*=|<svg|<img[^>]*\son\w+\s*=|<iframe|<body[^>]*\son\w+/i.test(String(s));
}

/* ------------------------------------------------------------------ *
 * Fragment vault B (scattered configuration fragments).
 * ------------------------------------------------------------------ */
const _fragB1 = ['UkZIRA==', 'LUgzNA=='];
const _fragB2 = ['SDkzRA==', 'LTJTMg=='];

/* --------------------------- http helpers -------------------------- */
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function parseCookies(req) {
  const out = {};
  const h = req.headers.cookie || '';
  for (const part of h.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) {
        try { return resolve(JSON.parse(data || '{}')); } catch (e) { return resolve({}); }
      }
      const obj = {};
      for (const pair of data.split('&')) {
        if (!pair) continue;
        const i = pair.indexOf('=');
        const k = decodeURIComponent(pair.slice(0, i).replace(/\+/g, ' '));
        const v = i >= 0 ? decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' ')) : '';
        obj[k] = v;
      }
      resolve(obj);
    });
    req.on('error', () => resolve({}));
  });
}
function currentUser(req) {
  const sid = parseCookies(req).hx_session;
  if (!sid || !sessions.has(sid)) return null;
  const u = users.find(x => x.id === sessions.get(sid));
  return u && !u.disabled ? u : null;
}
function effectiveRole(req, user) {
  const c = parseCookies(req).hx_role;
  return c || (user ? user.role : 'viewer');
}
function sendHtml(res, code, html, headers) {
  const h = Object.assign({ 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': 'hx_seen=1; Path=/' }, headers || {});
  res.writeHead(code, h);
  res.end(html);
}
function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj, null, 2));
}
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }

/* ------------------------------------------------------------------ *
 * Fragment vault C + assembler.
 * ------------------------------------------------------------------ */
const _fragC1 = ['WERSRA==', 'QUhRSw=='];
const _fragC2 = ['V0tRMg==', 'SlVPNQ=='];
function _assemble(parts) {
  return parts.map(p => Buffer.from(p, 'base64').toString('utf8').split('').reverse().join('')).join('');
}
function entryKeyValue() { return _assemble([].concat(_fragA1, _fragB1, _fragC1)); }
function completionKeyValue() { return _assemble([].concat(_fragA2, _fragB2, _fragC2)); }

/* --------------------------- HTML shell ---------------------------- */
function progressBarHtml() {
  const p = progress();
  return '<div class="pbar-wrap"><div class="pbar-label">LAB ' + LAB_NUMBER + ' · ' + p.done + '/' + p.total + ' tests · ' + p.pct + '%</div>' +
    '<div class="pbar"><div class="pbar-fill" style="width:' + p.pct + '%"></div></div></div>';
}
function chatWidgetHtml() {
  return '<div id="hxchat"><button id="hxchat-btn" onclick="hxToggle()">💬 Lab Coach</button>' +
    '<div id="hxchat-panel" style="display:none"><div id="hxchat-log"></div>' +
    '<div class="hxchat-row"><input id="hxchat-in" placeholder="Ask the Lab Coach…" onkeydown="if(event.key===\'Enter\')hxSend()">' +
    '<button onclick="hxSend()">Send</button></div></div></div>' +
    '<script>function hxToggle(){var p=document.getElementById("hxchat-panel");p.style.display=p.style.display==="none"?"block":"none";}' +
    'function hxAdd(who,txt){var l=document.getElementById("hxchat-log");var d=document.createElement("div");d.className=who;d.textContent=txt;l.appendChild(d);l.scrollTop=l.scrollHeight;}' +
    'function hxSend(){var i=document.getElementById("hxchat-in");var m=i.value.trim();if(!m)return;i.value="";hxAdd("me",m);' +
    'fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:m})}).then(r=>r.json()).then(j=>hxAdd("bot",j.reply)).catch(()=>hxAdd("bot","Coach unavailable right now."));}</script>';
}
function layout(title, user, body) {
  const nav = user ? '<nav><a href="/">Dashboard</a> <a href="/resources">Resources</a> <a href="/buckets">Buckets</a> ' +
    '<a href="/iam">IAM</a> <a href="/billing">Billing</a> <a href="/search">Search</a> <a href="/metadata">Metadata</a> ' +
    '<a href="/tests">Tests</a> <a href="/complete">Complete</a> <a href="/profile">Profile</a> <a href="/logout">Logout</a></nav>' : '';
  const who = user ? '<div class="who">Signed in as <b>' + (user.displayName || user.name) + '</b> · ' + esc(tenantOf(user.tenantId).name) + ' · role: ' + esc(user.role) + '</div>' : '';
  return '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(title) + ' — HexaCloud</title><style>' +
    'body{font-family:system-ui,Arial,sans-serif;margin:0;background:#0d1226;color:#e8ebf7}header{background:#131a38;padding:12px 20px;display:flex;gap:16px;align-items:center;flex-wrap:wrap}' +
    'header img{height:40px}header .t{font-size:20px;font-weight:700}nav a{color:#9fd0ff;margin-right:12px;text-decoration:none}main{padding:20px;max-width:980px;margin:0 auto}' +
    '.card{background:#171f42;border:1px solid #2a3565;border-radius:10px;padding:16px;margin:12px 0}input,select,button{padding:8px;border-radius:6px;border:1px solid #3a4680;background:#0d1226;color:#e8ebf7;margin:4px 0}' +
    'button{background:#4f7cff;border:none;cursor:pointer;font-weight:600}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #2a3565;padding:6px 8px;text-align:left}' +
    '.pbar-wrap{flex:1;min-width:220px}.pbar{background:#0d1226;border:1px solid #3a4680;border-radius:6px;height:14px}.pbar-fill{background:linear-gradient(90deg,#4f7cff,#9b5cff);height:100%;border-radius:6px}.pbar-label{font-size:12px;margin-bottom:3px}' +
    '.err{color:#ff8a8a}.ok{color:#8affb0}.hintbox{background:#0d1226;border:1px dashed #3a4680;padding:8px;border-radius:6px;margin-top:6px}pre{background:#0d1226;padding:10px;border-radius:6px;overflow:auto}' +
    '#hxchat{position:fixed;right:16px;bottom:16px;z-index:50}#hxchat-panel{background:#171f42;border:1px solid #3a4680;border-radius:10px;width:330px;height:380px;display:flex;flex-direction:column;margin-top:8px}' +
    '#hxchat-log{flex:1;overflow:auto;padding:10px}#hxchat-log .me{text-align:right;color:#9fd0ff;margin:6px 0}#hxchat-log .bot{color:#e8ebf7;margin:6px 0;white-space:pre-wrap}.hxchat-row{display:flex;gap:6px;padding:8px}.hxchat-row input{flex:1}' +
    '.cert{max-width:640px;margin:30px auto;background:#fff;color:#14213d;border-radius:14px;padding:36px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.4)}.cert img{height:72px}' +
    '@media print{body{background:#fff}#hxchat,header .pbar-wrap,nav{display:none}}' +
    '</style></head><body><header><img src="/logo.png" alt="HexaCyberLab"><div class="t">LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</div>' +
    progressBarHtml() + '</header>' + nav + who + '<main>' + body + '</main>' + chatWidgetHtml() + '</body></html>';
}
function gatePage(err) {
  const body = '<div class="card"><h2>🔒 LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' is locked</h2>' +
    '<p>This lab is locked. Paste the completion key from Lab ' + (LAB_NUMBER - 1) + ' to start.</p>' +
    (err ? '<p class="err">' + esc(err) + '</p>' : '') +
    '<form method="POST" action="/unlock"><input name="key" placeholder="Completion key from Lab ' + (LAB_NUMBER - 1) + '" size="42"> <button type="submit">Unlock lab</button></form>' +
    '<p>Sequential unlocking keeps every lab in order — finish Lab ' + (LAB_NUMBER - 1) + ' at 100% and its completion key opens this one.</p></div>';
  return '<!doctype html><html><head><meta charset="utf-8"><title>Locked — LAB ' + LAB_NUMBER + '</title><style>body{font-family:system-ui,Arial;background:#0d1226;color:#e8ebf7}main{max-width:640px;margin:60px auto;padding:20px}.card{background:#171f42;border:1px solid #2a3565;border-radius:10px;padding:24px}input,button{padding:9px;border-radius:6px}img{height:48px}#hxchat{position:fixed;right:16px;bottom:16px}#hxchat-panel{background:#171f42;border:1px solid #3a4680;border-radius:10px;width:330px;height:380px;display:flex;flex-direction:column;margin-top:8px}#hxchat-log{flex:1;overflow:auto;padding:10px}#hxchat-log .me{text-align:right;color:#9fd0ff;margin:6px 0}#hxchat-log .bot{margin:6px 0;white-space:pre-wrap}.hxchat-row{display:flex;gap:6px;padding:8px}.hxchat-row input{flex:1}</style></head><body><main><img src="/logo.png" alt="HexaCyberLab">' + body + '</main>' + chatWidgetHtml() + '</body></html>';
}

/* --------------------------- chatbot ------------------------------- */
const FEATURE_KEYWORDS = [
  ['Login & Authentication', ['login', 'log in', 'sign in', 'password', 'brute', 'reset token', 'enumerat', 'cookie', 'auth']],
  ['Registration & Profile', ['register', 'registration', 'sign up', 'signup', 'profile', 'display name', 'mass assignment']],
  ['Resources', ['resource', 'server', 'instance', 'vm', 'virtual machine', 'database', 'terminate', 'resize']],
  ['Storage Buckets', ['bucket', 'storage', 'file download', 'traversal', 'public']],
  ['IAM & Policies', ['iam', 'role', 'policy', 'policies', 'permission', 'privilege']],
  ['Billing & Plans', ['billing', 'bill', 'plan', 'invoice', 'credit', 'price', 'payment']],
  ['Search & Discovery', ['search', 'reflected']],
  ['API & Integrations', ['api', 'api key', 'bola', 'endpoint']],
  ['Platform & Admin', ['metadata', 'ssrf', 'debug', 'admin', 'platform', 'csrf']]
];
function featureAttempts(f) { return state.attempts[f] || 0; }
function chatReply(rawMsg) {
  const msg = String(rawMsg || '');
  const m = msg.toLowerCase();
  const p = progress();
  if (/(who (built|made|created)|founder|who is jony|built this|made this|who built)/.test(m)) {
    return 'These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for "Who is Md. Jony Hassain", or ask ChatGPT.';
  }
  if (/(completion key|the key|next lab.*key|unlock.*key|give me the key|key please)/.test(m)) {
    if (p.complete && state.keyRevealed) return 'You completed LAB ' + LAB_NUMBER + ' at 100% — well earned. The completion key for the next lab is: ' + completionKeyValue();
    return 'I don\'t have the completion key yet — I only receive it when this lab is completed at 100%. You are at ' + p.pct + '% (' + p.done + '/' + p.total + ' tests). Keep going!';
  }
  if (/(how many|list|which features|features|vulnerabilities in|tests in|what tests|counts)/.test(m)) {
    let out = 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + Object.keys(p.features).length + ' features and ' + p.total + ' tests:\n';
    for (const f of Object.keys(p.features)) out += '• ' + f + ': ' + p.features[f].done + '/' + p.features[f].total + ' done\n';
    out += 'Ask me how to approach a feature once you have tried it at least 3 times.';
    return out;
  }
  if (/(progress|how am i|score|percent)/.test(m)) {
    return 'Your progress: ' + p.done + '/' + p.total + ' tests (' + p.pct + '%). ' + (p.complete ? 'Lab complete! Open /complete for your key and certificate.' : 'Open /tests to see what is left.');
  }
  const howTo = /(how|help|guide|step|hint|solve|do i|approach|stuck)/.test(m);
  let matched = null;
  for (const [f, kws] of FEATURE_KEYWORDS) { if (kws.some(k => m.includes(k))) { matched = f; break; } }
  if (matched && howTo) {
    const att = featureAttempts(matched);
    const fTests = TESTS.filter(t => t.feature === matched);
    const allPassed = fTests.every(t => state.tests[t.id]);
    if (att >= 3 || allPassed) {
      let out = 'Step by step for ' + matched + ':\n';
      for (const t of fTests) {
        out += (state.tests[t.id] ? '✓ ' : '• ') + t.name + ': ' + t.hints[2] + '\n';
      }
      return out.trim();
    }
    return 'That feature is locked for help. First try the ' + matched + ' tests yourself at least 3 times — I can see you\'ve tried ' + att + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  if (matched) {
    const fTests = TESTS.filter(t => t.feature === matched);
    return matched + ' has ' + fTests.length + ' tests: ' + fTests.map(t => t.name).join('; ') + '. You have tried this feature ' + featureAttempts(matched) + ' time(s). Try its tests at least 3 times and then ask me how to solve them.';
  }
  return 'I am the Lab Coach for LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '. You are at ' + p.pct + '% (' + p.done + '/' + p.total + ' tests). Open /tests for the mission list and graded hints. Try a feature at least 3 times, then ask me how to solve its tests and I will guide you step by step. You can also ask me which features exist, or who built these labs.';
}

/* --------------------------- routes -------------------------------- */
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://127.0.0.1:' + PORT);
    const pathname = u.pathname;
    const method = req.method;

    if (pathname === '/logo.png') {
      fs.readFile(LOGO_FILE, (e, buf) => {
        if (e) { res.writeHead(404); return res.end('not found'); }
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(buf);
      });
      return;
    }
    if (pathname === '/api/progress') return sendJson(res, 200, progress());
    if (pathname === '/api/chat' && method === 'POST') {
      const b = await readBody(req);
      return sendJson(res, 200, { reply: chatReply(b.message) });
    }

    /* ---- lock gate ---- */
    if (!state.unlocked) {
      if (pathname === '/unlock' && method === 'POST') {
        const b = await readBody(req);
        const given = String(b.key || '').trim();
        if (given && given === entryKeyValue()) {
          state.unlocked = true; saveState();
          return redirect(res, '/');
        }
        return sendHtml(res, 403, gatePage('That key was not accepted.'));
      }
      return sendHtml(res, 200, gatePage(''));
    }

    const user = currentUser(req);

    /* ---- auth pages ---- */
    if (pathname === '/login' && method === 'GET') {
      if (user) return redirect(res, '/');
      const err = u.searchParams.get('e');
      return sendHtml(res, 200, layout('Login', null,
        '<div class="card"><h2>Sign in to HexaCloud</h2>' + (err ? '<p class="err">' + esc(err) + '</p>' : '') +
        '<form method="POST" action="/login"><input name="email" placeholder="Email" size="34"><br>' +
        '<input name="password" type="password" placeholder="Password" size="34"><br><button>Sign in</button></form>' +
        '<p><a href="/forgot">Forgot password?</a> · <a href="/register">Create account</a></p></div>'));
    }
    if (pathname === '/login' && method === 'POST') {
      const b = await readBody(req);
      bump('Login & Authentication');
      const ip = req.socket.remoteAddress || 'local';
      const email = String(b.email || ''), password = String(b.password || '');
      const fail = msg => redirect(res, '/login?e=' + encodeURIComponent(msg));
      if (injectionLike(email) || injectionLike(password)) {
        const victim = users[0];
        const sid = 's' + (nextSid++);
        sessions.set(sid, victim.id);
        pass('sqli-login');
        res.writeHead(302, { Location: '/', 'Set-Cookie': ['hx_session=' + sid + '; Path=/; HttpOnly', 'hx_role=' + victim.role + '; Path=/'] });
        return res.end();
      }
      const found = users.find(x => x.email.toLowerCase() === email.toLowerCase());
      if (!found) {
        const f = enumSeen.get(ip) || { unknown: false, known: false };
        f.unknown = true; enumSeen.set(ip, f);
        if (f.known) pass('user-enumeration');
        return fail('No account found for that email address.');
      }
      if (found.disabled) return fail('This account has been disabled.');
      if (found.password !== password) {
        const n = (failedLogins.get(found.email) || 0) + 1;
        failedLogins.set(found.email, n);
        if (n >= 10) pass('brute-force');
        const f = enumSeen.get(ip) || { unknown: false, known: false };
        f.known = true; enumSeen.set(ip, f);
        if (f.unknown) pass('user-enumeration');
        return fail('Incorrect password for this account.');
      }
      failedLogins.delete(found.email);
      if (found.email === 'demo@acme.cloud') pass('default-creds');
      const sid = 's' + (nextSid++);
      sessions.set(sid, found.id);
      res.writeHead(302, { Location: '/', 'Set-Cookie': ['hx_session=' + sid + '; Path=/; HttpOnly', 'hx_role=' + found.role + '; Path=/'] });
      return res.end();
    }
    if (pathname === '/logout') {
      const sid = parseCookies(req).hx_session;
      if (sid) sessions.delete(sid);
      res.writeHead(302, { Location: '/login', 'Set-Cookie': ['hx_session=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0'] });
      return res.end();
    }
    if (pathname === '/forgot' && method === 'GET') {
      return sendHtml(res, 200, layout('Forgot password', null,
        '<div class="card"><h2>Reset your password</h2><form method="POST" action="/forgot">' +
        '<input name="email" placeholder="Email" size="34"> <button>Send reset token</button></form>' +
        '<p><a href="/login">Back to sign in</a></p></div>'));
    }
    if (pathname === '/forgot' && method === 'POST') {
      const b = await readBody(req);
      bump('Login & Authentication');
      const ip = req.socket.remoteAddress || 'local';
      const found = users.find(x => x.email.toLowerCase() === String(b.email || '').toLowerCase());
      const f = enumSeen.get(ip) || { unknown: false, known: false };
      if (!found) {
        f.unknown = true; enumSeen.set(ip, f);
        if (f.known) pass('user-enumeration');
        return sendHtml(res, 200, layout('Forgot password', null, '<div class="card"><p class="err">No account exists with that email address.</p><p><a href="/forgot">Try again</a></p></div>'));
      }
      f.known = true; enumSeen.set(ip, f);
      if (f.unknown) pass('user-enumeration');
      const tok = resetTokenFor(found);
      issuedResetTokens.add(tok);
      return sendHtml(res, 200, layout('Forgot password', null,
        '<div class="card"><p class="ok">Reset token generated for ' + esc(found.email) + '.</p>' +
        '<p>Dev build — token shown here for training: <code>' + esc(tok) + '</code></p>' +
        '<form method="POST" action="/reset"><input name="token" placeholder="Reset token" size="30"> ' +
        '<input name="newpassword" type="password" placeholder="New password" size="20"> <button>Reset password</button></form></div>'));
    }
    if (pathname === '/reset' && method === 'POST') {
      const b = await readBody(req);
      bump('Login & Authentication');
      const tok = String(b.token || '');
      const target = users.find(x => resetTokenFor(x) === tok);
      if (!target) return sendHtml(res, 200, layout('Reset', null, '<div class="card"><p class="err">That reset token is not valid.</p></div>'));
      if (!issuedResetTokens.has(tok)) pass('reset-token');
      issuedResetTokens.delete(tok);
      target.password = String(b.newpassword || 'changed123');
      return redirect(res, '/login?e=' + encodeURIComponent('Password updated — sign in with the new password.'));
    }
    if (pathname === '/register' && method === 'GET') {
      return sendHtml(res, 200, layout('Register', null,
        '<div class="card"><h2>Create a HexaCloud account</h2><form method="POST" action="/register">' +
        '<input name="name" placeholder="Full name" size="30"><br><input name="email" placeholder="Email" size="30"><br>' +
        '<input name="password" type="password" placeholder="Password" size="30"><br><button>Create account</button></form>' +
        '<p>Extra fields in the request are saved to your account record by our provisioning API.</p></div>'));
    }
    if (pathname === '/register' && method === 'POST') {
      const b = await readBody(req);
      bump('Registration & Profile');
      const pw = String(b.password || '');
      const nu = {
        id: nextUserId++,
        tenantId: b.tenantId ? parseInt(b.tenantId, 10) || 1 : 1,
        email: String(b.email || 'user' + Date.now() + '@acme.cloud'),
        password: pw,
        role: b.role ? String(b.role) : 'viewer',
        name: String(b.name || 'New User'),
        displayName: String(b.name || 'New User'),
        apiKey: 'hx_live_new_' + Math.random().toString(36).slice(2, 8),
        disabled: false
      };
      users.push(nu);
      if (pw.length <= 3) pass('weak-password');
      if (b.role && String(b.role) !== 'viewer') pass('mass-assignment');
      if (b.tenantId && parseInt(b.tenantId, 10) !== 1) pass('mass-assignment');
      const sid = 's' + (nextSid++);
      sessions.set(sid, nu.id);
      res.writeHead(302, { Location: '/', 'Set-Cookie': ['hx_session=' + sid + '; Path=/; HttpOnly', 'hx_role=' + nu.role + '; Path=/'] });
      return res.end();
    }

    /* ---- public bucket route (intentionally session-free) ---- */
    const pubMatch = pathname.match(/^\/public\/bucket\/(\d+)$/);
    if (pubMatch && method === 'GET') {
      const bk = buckets.find(x => x.id === parseInt(pubMatch[1], 10));
      if (!bk || !bk.public) return sendHtml(res, 403, layout('Private bucket', user, '<div class="card"><p>This bucket is private.</p></div>'));
      pass('bucket-exposure');
      const files = Object.keys(bk.files).map(f => '<li>' + esc(f) + '</li>').join('');
      return sendHtml(res, 200, layout('Public bucket', user, '<div class="card"><h2>🌐 Public bucket: ' + esc(bk.name) + '</h2><p>No sign-in required. Files:</p><ul>' + files + '</ul></div>'));
    }

    /* ---- JSON API (authenticated by API key alone) ---- */
    if (pathname === '/api/resources' && method === 'GET') {
      bump('API & Integrations');
      const key = req.headers['x-api-key'] || u.searchParams.get('api_key') || '';
      let keyUser = users.find(x => x.apiKey === key);
      let viaDerived = false;
      if (!keyUser) { keyUser = users.find(x => derivedKey(x) === key); viaDerived = !!keyUser; }
      if (!keyUser) return sendJson(res, 401, { error: 'invalid API key' });
      if (viaDerived && (!user || user.id !== keyUser.id)) pass('api-key-guess');
      const list = resources.filter(r => r.tenantId === keyUser.tenantId);
      return sendJson(res, 200, { tenant: tenantOf(keyUser.tenantId).name, resources: list });
    }
    const apiMatch = pathname.match(/^\/api\/resources\/(\d+)$/);
    if (apiMatch && method === 'GET') {
      bump('API & Integrations');
      const key = req.headers['x-api-key'] || u.searchParams.get('api_key') || '';
      let keyUser = users.find(x => x.apiKey === key);
      let viaDerived = false;
      if (!keyUser) { keyUser = users.find(x => derivedKey(x) === key); viaDerived = !!keyUser; }
      if (!keyUser) return sendJson(res, 401, { error: 'invalid API key' });
      if (viaDerived && (!user || user.id !== keyUser.id)) pass('api-key-guess');
      const r = resources.find(x => x.id === parseInt(apiMatch[1], 10));
      if (!r) return sendJson(res, 404, { error: 'not found' });
      if (r.tenantId !== keyUser.tenantId) pass('api-bola');
      return sendJson(res, 200, r);
    }

    if (!user) return redirect(res, '/login');

    /* ---- dashboard ---- */
    if (pathname === '/' && method === 'GET') {
      const mine = resources.filter(r => r.tenantId === user.tenantId);
      const myBuckets = buckets.filter(x => x.tenantId === user.tenantId);
      const rows = mine.map(r => '<tr><td>' + esc(r.type) + '</td><td><a href="/resources/' + r.id + '">' + esc(r.name) + '</a></td><td>' + esc(r.status) + '</td><td>' + esc(r.size) + '</td></tr>').join('');
      return sendHtml(res, 200, layout('Dashboard', user,
        '<div class="card"><h2>' + esc(tenantOf(user.tenantId).name) + ' — cloud console</h2>' +
        '<p>Plan: <b>' + esc(tenantOf(user.tenantId).plan) + '</b> · Monthly cost: $' + esc(tenantOf(user.tenantId).monthlyCost) + ' · Account credit: $' + esc(tenantOf(user.tenantId).credit) + '</p>' +
        '<h3>Your resources</h3><table><tr><th>Type</th><th>Name</th><th>Status</th><th>Size</th></tr>' + rows + '</table>' +
        '<h3>Your buckets</h3><p>' + myBuckets.map(x => '<a href="/buckets/' + x.id + '">' + esc(x.name) + '</a>').join(' · ') + '</p>' +
        '<p>Need credentials for a forgotten VM? Try the <a href="/metadata">metadata lookup tool</a>.</p></div>'));
    }

    /* ---- profile ---- */
    if (pathname === '/profile' && method === 'GET') {
      return sendHtml(res, 200, layout('Profile', user,
        '<div class="card"><h2>Your profile</h2><form method="POST" action="/profile">' +
        '<label>Display name (shown in the header and admin lists)</label><br>' +
        '<input name="displayName" value="' + esc(user.displayName || '') + '" size="44"><br><button>Save profile</button></form></div>'));
    }
    if (pathname === '/profile' && method === 'POST') {
      const b = await readBody(req);
      bump('Registration & Profile');
      const origin = req.headers.origin || '';
      if ((origin && !origin.includes(req.headers.host || '')) || !parseCookies(req).hx_seen) pass('profile-csrf');
      const dn = String(b.displayName || '');
      if (xssLike(dn)) pass('stored-xss');
      user.displayName = dn;
      return redirect(res, '/profile');
    }

    /* ---- resources ---- */
    if (pathname === '/resources' && method === 'GET') {
      const mine = resources.filter(r => r.tenantId === user.tenantId);
      const rows = mine.map(r => '<tr><td>' + r.id + '</td><td>' + esc(r.type) + '</td><td><a href="/resources/' + r.id + '">' + esc(r.name) + '</a></td><td>' + esc(r.status) + '</td><td>' + esc(r.size) + '</td></tr>').join('');
      return sendHtml(res, 200, layout('Resources', user,
        '<div class="card"><h2>Resources — ' + esc(tenantOf(user.tenantId).name) + '</h2><table><tr><th>ID</th><th>Type</th><th>Name</th><th>Status</th><th>Size</th></tr>' + rows + '</table></div>'));
    }
    const resMatch = pathname.match(/^\/resources\/(\d+)$/);
    if (resMatch && method === 'GET') {
      bump('Resources');
      const r = resources.find(x => x.id === parseInt(resMatch[1], 10));
      if (!r) return sendHtml(res, 404, layout('Not found', user, '<div class="card"><p>Resource not found.</p></div>'));
      if (r.tenantId !== user.tenantId) pass('resource-idor');
      return sendHtml(res, 200, layout('Resource ' + r.name, user,
        '<div class="card"><h2>' + esc(r.name) + '</h2><p>Type: ' + esc(r.type) + ' · Status: ' + esc(r.status) + ' · Size: ' + esc(r.size) + '</p>' +
        '<p>' + esc(r.detail) + '</p><p>Owner tenant: ' + esc(tenantOf(r.tenantId).name) + '</p>' +
        '<form method="POST" action="/resources/' + r.id + '/action"><select name="action"><option>start</option><option>stop</option><option>terminate</option><option>resize</option></select> ' +
        '<input name="size" placeholder="new size (for resize)" size="16"> <button>Run action</button></form></div>'));
    }
    const actMatch = pathname.match(/^\/resources\/(\d+)\/action$/);
    if (actMatch && method === 'POST') {
      const b = await readBody(req);
      bump('Resources');
      const r = resources.find(x => x.id === parseInt(actMatch[1], 10));
      if (!r) return sendHtml(res, 404, layout('Not found', user, '<div class="card"><p>Resource not found.</p></div>'));
      const action = String(b.action || 'stop');
      if (action === 'resize' && b.size) r.size = String(b.size);
      if (action === 'stop') r.status = 'stopped';
      if (action === 'start') r.status = 'running';
      if (action === 'terminate') r.status = 'terminated';
      if (r.tenantId !== user.tenantId || user.role === 'viewer') pass('resource-action');
      return redirect(res, '/resources/' + r.id);
    }

    /* ---- buckets ---- */
    if (pathname === '/buckets' && method === 'GET') {
      const mine = buckets.filter(x => x.tenantId === user.tenantId);
      return sendHtml(res, 200, layout('Buckets', user,
        '<div class="card"><h2>Storage buckets — ' + esc(tenantOf(user.tenantId).name) + '</h2>' +
        mine.map(x => '<p><a href="/buckets/' + x.id + '">' + esc(x.name) + '</a> — ' + (x.public ? '<span class="err">PUBLIC</span>' : 'private') + '</p>').join('') + '</div>'));
    }
    const bkMatch = pathname.match(/^\/buckets\/(\d+)$/);
    if (bkMatch && method === 'GET') {
      bump('Storage Buckets');
      const bk = buckets.find(x => x.id === parseInt(bkMatch[1], 10));
      if (!bk) return sendHtml(res, 404, layout('Not found', user, '<div class="card"><p>Bucket not found.</p></div>'));
      if (bk.tenantId !== user.tenantId) return sendHtml(res, 403, layout('Forbidden', user, '<div class="card"><p>That bucket belongs to another tenant.</p></div>'));
      const files = Object.keys(bk.files).map(f => '<li><a href="/buckets/' + bk.id + '/files/' + encodeURIComponent(f) + '">' + esc(f) + '</a></li>').join('');
      return sendHtml(res, 200, layout('Bucket ' + bk.name, user,
        '<div class="card"><h2>🪣 ' + esc(bk.name) + '</h2><p>Visibility: ' + (bk.public ? '<b class="err">PUBLIC</b>' : 'private') + '</p><ul>' + files + '</ul>' +
        '<form method="POST" action="/buckets/' + bk.id + '/visibility"><select name="visibility"><option value="private">private</option><option value="public">public</option></select> <button>Update visibility</button></form></div>'));
    }
    const visMatch = pathname.match(/^\/buckets\/(\d+)\/visibility$/);
    if (visMatch && method === 'POST') {
      const b = await readBody(req);
      bump('Storage Buckets');
      const bk = buckets.find(x => x.id === parseInt(visMatch[1], 10));
      if (!bk) return sendHtml(res, 404, layout('Not found', user, '<div class="card"><p>Bucket not found.</p></div>'));
      const makePublic = String(b.visibility || '') === 'public';
      bk.public = makePublic;
      if (makePublic && bk.tenantId !== user.tenantId) pass('bucket-exposure');
      return redirect(res, '/buckets');
    }
    const fileMatch = pathname.match(/^\/buckets\/(\d+)\/files\/(.+)$/);
    if (fileMatch && method === 'GET') {
      bump('Storage Buckets');
      const bk = buckets.find(x => x.id === parseInt(fileMatch[1], 10));
      if (!bk) { res.writeHead(404); return res.end('not found'); }
      if (bk.tenantId !== user.tenantId) { res.writeHead(403); return res.end('forbidden'); }
      const name = fileMatch[2];
      if (name.includes('..')) {
        pass('bucket-traversal');
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        return res.end('# SIMULATED /etc/hexacloud/server-config (reached via path traversal)\ninternal_service_token = "sim-token-7788-training"\nmetadata_endpoint = http://169.254.169.254/\nmaster_region = eu-west-1\n');
      }
      const content = bk.files[name];
      if (content == null) { res.writeHead(404); return res.end('no such file'); }
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end(content);
    }

    /* ---- IAM ---- */
    if (pathname === '/iam' && method === 'GET') {
      const mine = users.filter(x => x.tenantId === user.tenantId);
      const rows = mine.map(x => '<tr><td>' + x.id + '</td><td>' + (x.displayName || x.name) + '</td><td>' + esc(x.email) + '</td><td>' + esc(x.role) + '</td></tr>').join('');
      const pols = policies.filter(x => x.tenantId === user.tenantId).map(x => '<p><a href="/iam/policies/' + x.id + '">' + esc(x.name) + '</a></p>').join('');
      return sendHtml(res, 200, layout('IAM', user,
        '<div class="card"><h2>IAM — users of ' + esc(tenantOf(user.tenantId).name) + '</h2><table><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th></tr>' + rows + '</table>' +
        '<h3>Change a role</h3><form method="POST" action="/iam/role"><input name="userId" placeholder="User ID" size="8"> ' +
        '<select name="role"><option>viewer</option><option>developer</option><option>admin</option><option>owner</option></select> <button>Apply role</button></form>' +
        '<h3>Policies</h3>' + pols + '</div>'));
    }
    if (pathname === '/iam/role' && method === 'POST') {
      const b = await readBody(req);
      bump('IAM & Policies');
      const target = users.find(x => x.id === parseInt(b.userId, 10));
      if (target && b.role) {
        const callerRole = user.role, callerTenant = user.tenantId;
        const before = target.role;
        target.role = String(b.role);
        if (target.role !== before && ((callerRole !== 'owner' && callerRole !== 'admin') || target.tenantId !== callerTenant)) pass('iam-escalation');
      }
      return redirect(res, '/iam');
    }
    const polMatch = pathname.match(/^\/iam\/policies\/(\d+)$/);
    if (polMatch && method === 'GET') {
      bump('IAM & Policies');
      const pol = policies.find(x => x.id === parseInt(polMatch[1], 10));
      if (!pol) return sendHtml(res, 404, layout('Not found', user, '<div class="card"><p>Policy not found.</p></div>'));
      if (pol.tenantId !== user.tenantId) pass('policy-idor');
      return sendHtml(res, 200, layout('Policy', user,
        '<div class="card"><h2>' + esc(pol.name) + '</h2><p>Owner tenant: ' + esc(tenantOf(pol.tenantId).name) + '</p><pre>' + esc(pol.doc) + '</pre></div>'));
    }

    /* ---- billing ---- */
    if (pathname === '/billing' && method === 'GET') {
      const t = tenantOf(user.tenantId);
      return sendHtml(res, 200, layout('Billing', user,
        '<div class="card"><h2>Billing — ' + esc(t.name) + '</h2><p>Plan: <b>' + esc(t.plan) + '</b> · Monthly cost: $' + esc(t.monthlyCost) + ' · Credit balance: $' + esc(t.credit) + '</p>' +
        '<p><a href="/billing/invoice/' + t.id + '">View this month’s invoice</a></p>' +
        '<h3>Apply account credit</h3><form method="POST" action="/billing/credit"><input name="amount" placeholder="Amount $" size="10"> <button>Apply credit</button></form>' +
        '<h3>Change plan</h3><form method="POST" action="/billing/plan"><select name="plan"><option>Starter</option><option>Pro</option><option>Business</option><option>Enterprise</option></select> <button>Change plan</button></form></div>'));
    }
    if (pathname === '/billing/credit' && method === 'POST') {
      const b = await readBody(req);
      bump('Billing & Plans');
      const amount = parseFloat(b.amount);
      if (!isNaN(amount)) {
        tenantOf(user.tenantId).credit += amount;
        if (amount > 100 || amount < 0) pass('billing-tamper');
      }
      return redirect(res, '/billing');
    }
    if (pathname === '/billing/plan' && method === 'POST') {
      const b = await readBody(req);
      bump('Billing & Plans');
      const t = tenantOf(user.tenantId);
      if (b.plan && String(b.plan) !== t.plan) { t.plan = String(b.plan); pass('plan-bypass'); }
      return redirect(res, '/billing');
    }
    const invMatch = pathname.match(/^\/billing\/invoice\/(\d+)$/);
    if (invMatch && method === 'GET') {
      bump('Billing & Plans');
      const t = tenantOf(parseInt(invMatch[1], 10));
      if (!t) return sendHtml(res, 404, layout('Not found', user, '<div class="card"><p>Invoice not found.</p></div>'));
      if (t.id !== user.tenantId) pass('invoice-idor');
      return sendHtml(res, 200, layout('Invoice', user,
        '<div class="card"><h2>Invoice — ' + esc(t.name) + '</h2><table><tr><th>Item</th><th>Amount</th></tr>' +
        '<tr><td>' + esc(t.plan) + ' plan (monthly)</td><td>$' + esc(t.monthlyCost) + '</td></tr>' +
        '<tr><td>Account credit applied</td><td>-$' + esc(t.credit) + '</td></tr>' +
        '<tr><td><b>Total due</b></td><td><b>$' + esc(Math.max(0, t.monthlyCost - t.credit)) + '</b></td></tr></table></div>'));
    }

    /* ---- search ---- */
    if (pathname === '/search' && method === 'GET') {
      const q = u.searchParams.get('q') || '';
      let resultsHtml = '';
      if (u.searchParams.has('q')) {
        bump('Search & Discovery');
        let found;
        if (injectionLike(q)) { found = resources.slice(); pass('search-sqli'); }
        else found = resources.filter(r => r.tenantId === user.tenantId && r.name.toLowerCase().includes(q.toLowerCase()));
        if (xssLike(q)) pass('reflected-xss');
        resultsHtml = '<p>Results for: ' + q + '</p>' + (found.length
          ? '<ul>' + found.map(r => '<li><a href="/resources/' + r.id + '">' + esc(r.name) + '</a> (' + esc(tenantOf(r.tenantId).name) + ')</li>').join('') + '</ul>'
          : '<p>No matching resources.</p>');
      }
      return sendHtml(res, 200, layout('Search', user,
        '<div class="card"><h2>Search resources</h2><form method="GET" action="/search"><input name="q" size="40" placeholder="Search by resource name"> <button>Search</button></form>' + resultsHtml + '</div>'));
    }

    /* ---- metadata tool ---- */
    if (pathname === '/metadata' && method === 'GET') {
      const target = u.searchParams.get('url') || '';
      let out = '';
      if (target) {
        bump('Platform & Admin');
        const t = target.toLowerCase();
        if (t.includes('169.254.169.254') || t.includes('metadata') || t.includes('/internal/')) {
          pass('ssrf-metadata');
          out = '<pre>{\n  "AccessKeyId": "SIMIA-HEXACLOUD-TRAINING",\n  "SecretAccessKey": "simulated-secret-do-not-use",\n  "Token": "simulated-session-token",\n  "Expiration": "2026-10-24T00:00:00Z",\n  "Role": "hexacloud-instance-role"\n}</pre><p class="err">The console fetched the instance metadata service from the server side.</p>';
        } else if (t.includes('127.0.0.1') || t.includes('localhost')) {
          pass('ssrf-metadata');
          out = '<pre>Fetched internal URL from the server: ' + esc(target) + ' → HTTP 200 (internal services reachable)</pre>';
        } else {
          out = '<pre>Simulated fetch of ' + esc(target) + ': external fetches are simulated in this lab; the server attempted the request from its own network position.</pre>';
        }
      }
      return sendHtml(res, 200, layout('Metadata lookup', user,
        '<div class="card"><h2>Instance metadata lookup</h2><p>Diagnostic helper: the server fetches a URL and shows the response.</p>' +
        '<form method="GET" action="/metadata"><input name="url" size="52" placeholder="http://…"> <button>Fetch</button></form>' + out + '</div>'));
    }

    /* ---- debug ---- */
    if (pathname === '/debug' && method === 'GET') {
      bump('Platform & Admin');
      pass('debug-exposure');
      return sendJson(res, 200, {
        app: 'HexaCloud console', build: 'dev-2026.10.23', region: 'eu-west-1',
        tenants: tenants.map(t => ({ id: t.id, name: t.name, plan: t.plan })),
        users: users.map(x => ({ id: x.id, email: x.email, role: x.role, tenantId: x.tenantId, apiKey: x.apiKey })),
        note: 'Diagnostics endpoint — do not ship to production.'
      });
    }

    /* ---- admin ---- */
    if (pathname === '/admin' && method === 'GET') {
      const eff = effectiveRole(req, user);
      if (eff !== 'owner' && eff !== 'admin') return sendHtml(res, 403, layout('Forbidden', user, '<div class="card"><p>Admins only.</p></div>'));
      if (user.role !== 'owner' && user.role !== 'admin') pass('cookie-tamper');
      const rows = users.map(x => '<tr><td>' + x.id + '</td><td>' + (x.displayName || x.name) + '</td><td>' + esc(x.email) + '</td><td>' + esc(tenantOf(x.tenantId).name) + '</td><td>' + esc(x.role) + '</td><td>' + (x.disabled ? 'disabled' : 'active') + '</td>' +
        '<td><form method="POST" action="/admin/users/' + x.id + '/disable"><button>Disable</button></form></td></tr>').join('');
      return sendHtml(res, 200, layout('Admin', user,
        '<div class="card"><h2>Platform admin — all users</h2><table><tr><th>ID</th><th>Name</th><th>Email</th><th>Tenant</th><th>Role</th><th>Status</th><th></th></tr>' + rows + '</table></div>'));
    }
    const disMatch = pathname.match(/^\/admin\/users\/(\d+)\/disable$/);
    if (disMatch && method === 'POST') {
      await readBody(req);
      bump('Platform & Admin');
      const eff = effectiveRole(req, user);
      if (eff !== 'owner' && eff !== 'admin') return sendHtml(res, 403, layout('Forbidden', user, '<div class="card"><p>Admins only.</p></div>'));
      const origin = req.headers.origin || '';
      if ((origin && !origin.includes(req.headers.host || '')) || !parseCookies(req).hx_seen) pass('admin-csrf');
      const target = users.find(x => x.id === parseInt(disMatch[1], 10));
      if (target) target.disabled = true;
      return redirect(res, '/admin');
    }

    /* ---- /tests mission page ---- */
    if (pathname === '/tests' && method === 'GET') {
      const p = progress();
      const feats = [...new Set(TESTS.map(t => t.feature))];
      let body = '<div class="card"><h2>🎯 Mission — LAB ' + LAB_NUMBER + ' tests</h2><p>' + p.done + '/' + p.total + ' complete · ' + p.pct + '%</p>';
      for (const f of feats) {
        body += '<h3>' + esc(f) + ' <small>(attempts: ' + (state.attempts[f] || 0) + ')</small></h3>';
        for (const t of TESTS.filter(x => x.feature === f)) {
          const done = !!state.tests[t.id];
          body += '<div class="card"><b>' + (done ? '✓' : '○') + ' ' + esc(t.name) + '</b> · ' + esc(t.owasp) + ' · ' + esc(t.difficulty) +
            ' <button onclick="hxHint(this)">Hints</button><div class="hintbox" style="display:none">' +
            t.hints.map((h, i) => '<p><b>Hint ' + (i + 1) + ':</b> ' + esc(h) + '</p>').join('') + '</div></div>';
        }
      }
      body += '</div><script>function hxHint(b){var d=b.nextElementSibling;d.style.display=d.style.display==="none"?"block":"none";}</script>';
      return sendHtml(res, 200, layout('Tests', user, body));
    }

    /* ---- /complete ---- */
    if (pathname === '/complete' && method === 'GET') {
      const p = progress();
      if (!p.complete) {
        const left = TESTS.filter(t => !state.tests[t.id]);
        return sendHtml(res, 200, layout('Complete', user,
          '<div class="card"><h2>Not yet — ' + p.pct + '%</h2><p>' + p.done + '/' + p.total + ' tests done. Still open:</p><ul>' +
          left.map(t => '<li>' + esc(t.name) + ' (' + esc(t.feature) + ')</li>').join('') + '</ul><p>Open <a href="/tests">/tests</a> and keep going.</p></div>'));
      }
      const feats = [...new Set(TESTS.map(t => t.feature))];
      let body = '<div class="card"><h2>🏁 LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' complete!</h2>';
      body += '<p><b>Total features:</b> ' + feats.length + '</p><h3>Per-feature vulnerability counts</h3><ul>' +
        feats.map(f => '<li>' + esc(f) + ': ' + TESTS.filter(t => t.feature === f).length + ' vulnerabilities</li>').join('') + '</ul>';
      body += '<h3>Ways testing was done (' + TESTS.length + ' techniques)</h3><ul>' +
        TESTS.map(t => '<li>' + esc(t.name) + ' — ' + esc(t.owasp) + '</li>').join('') + '</ul>';
      body += '<h3>What you learned</h3><ul>' + TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.lesson) + '</li>').join('') + '</ul>';
      body += '<h3>What this means for a real client</h3><ul>' + TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.impact) + '</li>').join('') + '</ul>';
      body += '<h3>Writing it in a real report</h3><ul>' + TESTS.map(t =>
        '<li><b>' + esc(t.report.title) + '</b> — Severity: ' + esc(t.report.severity) + ' · Remediation: ' + esc(t.report.remediation) + '</li>').join('') + '</ul>';
      body += '<h3>🔑 Completion key for Lab ' + (LAB_NUMBER + 1) + '</h3><p><code style="font-size:18px">' + esc(completionKeyValue()) + '</code></p>';
      body += '<form method="POST" action="/complete"><label>Your name for the certificate</label><br><input name="testerName" value="' + esc(state.testerName || '') + '" size="36"> <button>Save name</button></form>';
      body += '<p><a href="/certificate">🎓 View your certificate</a></p></div>';
      return sendHtml(res, 200, layout('Complete', user, body));
    }
    if (pathname === '/complete' && method === 'POST') {
      const b = await readBody(req);
      if (b.testerName != null) { state.testerName = String(b.testerName).slice(0, 80); saveState(); }
      return redirect(res, '/complete');
    }

    /* ---- /certificate ---- */
    if (pathname === '/certificate' && method === 'GET') {
      const p = progress();
      if (!p.complete) return redirect(res, '/complete');
      const feats = [...new Set(TESTS.map(t => t.feature))];
      const name = state.testerName || user.displayName || user.name || 'Security Tester';
      const date = state.completedAt ? new Date(state.completedAt).toDateString() : new Date().toDateString();
      const card = '<div class="cert"><img src="/logo.png" alt="HexaCyberLab logo"><h1>Certificate of Completion</h1>' +
        '<p>This certifies that</p><h2>' + esc(name) + '</h2>' +
        '<p>has completed 100% of the security tests in <b>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</b><br>(' + p.total + ' tests across ' + feats.length + ' features)</p>' +
        '<p>' + esc(date) + '</p><p><b>HexaCyberLab</b> — Built by Md. Jony Hassain, Founder</p></div>' +
        '<p style="text-align:center"><button onclick="window.print()">Print certificate</button></p>';
      return sendHtml(res, 200, layout('Certificate', user, card));
    }

    return sendHtml(res, 404, layout('Not found', user, '<div class="card"><h2>404</h2><p>Page not found.</p></div>'));
  } catch (e) {
    try { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('internal error'); } catch (x) {}
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(LAB_NAME + ' (LAB ' + LAB_NUMBER + ') listening on http://127.0.0.1:' + PORT);
});
