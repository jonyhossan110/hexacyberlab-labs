'use strict';
/* =====================================================================
 * HexaMonitor — LAB 27 of the HexaCyberLab lab programme.
 * A complete uptime / website-monitoring SaaS (accounts, monitors,
 * alert rules, maintenance windows, incidents, public status pages,
 * integrations, API) with the full lab system layered on top:
 * entry-key gate, scored TESTS registry, progress persistence,
 * Lab Coach chatbot with the 3-try help lock, /complete debrief
 * and /certificate.
 *
 * Zero-dependency Node.js. Binds 127.0.0.1:3036 ONLY. Local training
 * lab — the vulnerabilities in here are INTENTIONAL. Never deploy.
 * ===================================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const PORT = 3036;
const LAB_NUMBER = 27;
const LAB_NAME = 'HexaMonitor';
const PREV_LAB = 26;
const PROGRESS_FILE = path.join(DIR, 'progress.json');

/* ------------------------------------------------------------------ *
 * Key material. The lab's two chain keys are stored ONLY as encoded  *
 * fragments, scattered in separate regions of this file and rebuilt  *
 * in memory at the moment of use. No key ever appears in plain form *
 * in this file, the docs, or any response before its reveal moment. *
 * ------------------------------------------------------------------ */
function _un(a) {
  return a.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}
const _eA = ['TC1YSA==', 'SC03Mg==', 'T0FMMQ=='];

/* ============================ TESTS registry ============================ */
const TESTS = [
  /* ---- Login & Authentication ---- */
  { id: 'sqli-login', feature: 'Login & Authentication', name: 'SQL injection login bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    where: 'POST /login',
    hints: ['The login builds its database query by gluing your input straight into the query string.', 'Try a classic tautology payload in the email field, e.g. something that makes the WHERE clause always true.', "Use ada@northbeam.test' OR '1'='1 as the email with any password — the password check disappears."],
    lesson: 'String-built queries let an attacker rewrite the login logic itself; parameterised queries make input data, never code.',
    impact: 'On a real monitoring account this hands an attacker the keys to the kingdom: they can silence alerts and hide downtime while they attack the client\u2019s actual website.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements for all database access and add a regression test with injection payloads.' },
    guide: 'Step by step: (1) Open the login page. (2) In the email field enter ada@northbeam.test\' OR \'1\'=\'1 and any password. (3) Submit — you are logged in as Ada without knowing her password, because the query becomes true for the first matching row.' },
  { id: 'brute-force', feature: 'Login & Authentication', name: 'Brute force — no rate limit or lockout', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    where: 'POST /login',
    hints: ['How many wrong passwords can you try for one account in a row?', 'Nothing slows you down — no counter, no CAPTCHA, no lockout message.', 'Send 10 failed logins for omar@northbeam.test — the 10th is still processed normally.'],
    lesson: 'Without throttling, a login form is an unlimited guessing machine; rate limits and lockouts turn brute force from minutes into centuries.',
    impact: 'An attacker can grind through password lists against the client\u2019s monitoring account overnight and nobody is alerted — the attempts are not even counted.',
    report: { title: 'No Rate Limiting or Account Lockout on Login Endpoint', severity: 'High', remediation: 'Add progressive rate limiting, temporary lockout after repeated failures, and alerting on authentication anomalies.' },
    guide: 'Step by step: (1) Pick a real account, e.g. omar@northbeam.test. (2) Submit a wrong password. (3) Repeat it at least 10 times — every attempt is processed at full speed and the account never locks.' },
  { id: 'user-enumeration', feature: 'Login & Authentication', name: 'User enumeration via different error messages', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    where: 'POST /login and POST /forgot',
    hints: ['Compare the error for an email that exists with one that does not.', 'The app is helpful in two different voices — that difference is the leak.', 'Login once with a real email + wrong password ("Incorrect password") and once with a fake email ("No account found") — the pair confirms which emails are registered.'],
    lesson: 'Distinct login errors turn the form into an account-existence oracle; uniform messages and timing close the oracle.',
    impact: 'Attackers first harvest valid staff emails from the login form, then aim password spraying only at accounts that definitely exist — quietly and efficiently.',
    report: { title: 'Account Enumeration Through Divergent Authentication Error Messages', severity: 'Medium', remediation: 'Return one generic "invalid credentials" message (and uniform timing) for every failed authentication.' },
    guide: 'Step by step: (1) Login with omar@northbeam.test and a wrong password — note "Incorrect password". (2) Login with nobody@nowhere.test — note "No account found for that email". (3) The difference proves which emails have accounts.' },
  { id: 'default-creds', feature: 'Login & Authentication', name: 'Default platform admin credentials unchanged', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    where: 'POST /login (platform root account)',
    hints: ['Every product ships with a first admin account. What password do vendors always pick?', 'The platform root account is root@hexamonitor.test.', 'Try the most infamous default of all: admin123. It was never changed.'],
    lesson: 'Default credentials are public knowledge; a setup checklist that forces a change on first login removes an entire class of instant compromises.',
    impact: 'Anyone on the internet who guesses the vendor default owns the whole monitoring platform — every customer\u2019s monitors, alerts and incidents.',
    report: { title: 'Default Administrative Credentials Left Unchanged', severity: 'Critical', remediation: 'Force a password change on first login, disable vendor defaults in production, and scan for default creds in deployment checks.' },
    guide: 'Step by step: (1) Go to the login page. (2) Email: root@hexamonitor.test. (3) Password: admin123 — the vendor default. You are in as platform administrator.' },
  { id: 'reset-token', feature: 'Login & Authentication', name: 'Predictable password-reset token', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    where: 'POST /forgot and POST /reset',
    hints: ['Request a reset for your own account and study the token format — it is not random.', 'The token is a small arithmetic function of the user\u2019s numeric ID and the day of the year.', 'Token = HM- + hex(userId × 331 + dayOfYear). Vera is user 3 — compute her token and reset her password without ever requesting one.'],
    lesson: 'Reset tokens must be long, random and single-use; anything derivable from public data (IDs, dates) is a password-reset backdoor.',
    impact: 'An attacker who knows a staff member\u2019s email can compute the reset token and take the account — no inbox access needed.',
    report: { title: 'Password Reset Tokens Are Predictable', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), store only a hash, expire them quickly and make them single-use.' },
    guide: 'Step by step: (1) Note the user IDs (Ada 1, Omar 2, Vera 3, Ben 4, Nia 5). (2) Compute HM- + hex(userId × 331 + dayOfYear), zero-padded to 4. (3) POST that token to /reset for the victim\u2019s email with a new password — it is accepted even though no reset was ever requested.' },
  { id: 'cookie-role', feature: 'Login & Authentication', name: 'Session/cookie role tampering', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'GET /admin (hx_role cookie)',
    hints: ['The app keeps a helper cookie that mirrors your role. Who does the server believe — the session or the cookie?', 'Edit the hx_role cookie in your browser and see what value the admin gate wants.', 'As Vera (viewer), set cookie hx_role=platform and open /admin — the gate trusts the cookie over the real account.'],
    lesson: 'Authorisation data must live server-side; any role the client can edit will be edited.',
    impact: 'The lowest-privilege viewer account becomes platform administrator by changing one cookie — every customer on the platform is exposed at once.',
    report: { title: 'Privilege Escalation via Client-Controlled Role Cookie', severity: 'Critical', remediation: 'Derive roles exclusively from the server-side session record; never trust client-supplied role values.' },
    guide: 'Step by step: (1) Log in as Vera (viewer). (2) In your browser\u2019s cookie editor set hx_role to platform. (3) Open /admin — the platform console loads, because the gate reads the cookie instead of the session.' },

  /* ---- Registration & Profile ---- */
  { id: 'weak-password', feature: 'Registration & Profile', name: 'Weak password policy on registration', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    where: 'POST /register',
    hints: ['What is the shortest password the sign-up form accepts?', 'There is no minimum length or complexity check at all.', 'Register a new account with the password "a" — it is accepted.'],
    lesson: 'Password policy is the cheapest security control there is; accepting 1-character passwords invites instant credential stuffing.',
    impact: 'Customers who pick weak passwords get their monitoring accounts taken over, and attackers use them to blind the client before a real attack.',
    report: { title: 'Registration Accepts Trivially Weak Passwords', severity: 'Medium', remediation: 'Enforce a minimum length (≥10) and check new passwords against known-breached password lists.' },
    guide: 'Step by step: (1) Open /register. (2) Create an account with password "a". (3) The account is created and logged in — no policy stopped you.' },
  { id: 'mass-assignment', feature: 'Registration & Profile', name: 'Mass assignment — role granted at registration', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /register (role parameter)',
    hints: ['The registration handler binds every submitted field onto the new user object.', 'What happens if you add a field the form never showed — like the account\u2019s role?', 'Submit the registration with an extra field role=platform — the new account is created as platform administrator.'],
    lesson: 'Bind only whitelisted fields on write endpoints; anything the client sends must be treated as hostile.',
    impact: 'Anyone can self-register a platform-admin account on the client\u2019s SaaS — full control of every tenant without ever attacking a login.',
    report: { title: 'Mass Assignment Allows Self-Registration as Platform Administrator', severity: 'Critical', remediation: 'Whitelist assignable fields per endpoint and set roles server-side only.' },
    guide: 'Step by step: (1) Intercept or hand-craft the /register POST. (2) Add role=platform to the form fields. (3) Submit — your brand-new account holds the platform role and /admin opens.' },
  { id: 'profile-xss', feature: 'Registration & Profile', name: 'Stored XSS in display name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    where: 'POST /profile (name), served on /team and page headers',
    hints: ['Your display name is printed on the team page for your colleagues. Is it encoded?', 'Put markup in your name and visit /team.', 'Set your profile name to Ada <script>alert(1)</script> — the payload is stored and served raw to teammates.'],
    lesson: 'Any user-controlled string rendered without output encoding is a stored XSS waiting for a viewer; encode on output, everywhere.',
    impact: 'A malicious name fires in the browser of every teammate and admin who opens the team page — session theft and actions in their name follow.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Contextually HTML-encode all user-controlled output and add a Content-Security-Policy as defence in depth.' },
    guide: 'Step by step: (1) Log in and open /profile. (2) Set your name to Ada <script>alert(1)</script> and save. (3) Open /team — the script executes for anyone viewing the page.' },
  { id: 'profile-csrf', feature: 'Registration & Profile', name: 'CSRF on profile update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /profile',
    hints: ['The profile form carries a hidden marker field. Does the server actually require it?', 'A state change that succeeds without the marker — or from a foreign Origin — is CSRF.', 'While logged in, submit a profile change from another origin (or with the hx_marker field removed) — it is applied.'],
    lesson: 'State-changing forms need unguessable anti-CSRF tokens verified server-side; cookies alone do not prove intent.',
    impact: 'A booby-trapped page silently rewrites a logged-in admin\u2019s profile (name, notification email) — the first step to account recovery abuse.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Issue per-session CSRF tokens, verify them on every state change, and set SameSite cookies.' },
    guide: 'Step by step: (1) Log in. (2) From a different origin (or a hand-made form without the hx_marker field), POST a new name/email to /profile with the victim\u2019s cookies attached. (3) The change is applied — no token was checked.' },

  /* ---- Monitors ---- */
  { id: 'monitor-idor-read', feature: 'Monitors', name: 'Cross-account monitor IDOR (read)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'GET /monitors/:id',
    hints: ['Monitor IDs are small sequential numbers. What stops you opening another account\u2019s monitor?', 'Nothing checks that the monitor belongs to your account.', 'Log in as Ada (account 1) and open /monitors/4 — PixelPort\u2019s monitor, including its internal note, is served.'],
    lesson: 'Every object access must verify ownership server-side; sequential IDs without authorisation are a public catalogue.',
    impact: 'A competitor or attacker enumerates the client\u2019s entire infrastructure map — every URL, every internal note — straight from a free account.',
    report: { title: 'Broken Object Level Authorisation on Monitor Details (IDOR)', severity: 'High', remediation: 'Scope every object query by the session\u2019s account ID and return 404 for objects outside the tenant.' },
    guide: 'Step by step: (1) Log in as Ada from Northbeam. (2) Browse to /monitors/4. (3) You are reading PixelPort\u2019s monitor — URL, status and the internal note — because the handler never checks account ownership.' },
  { id: 'monitor-idor-write', feature: 'Monitors', name: 'Cross-account monitor tampering (edit)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /monitors/:id/edit',
    hints: ['Reading a foreign monitor worked. Does writing work too?', 'The edit handler has the same missing ownership check as the read.', 'POST a new name/URL to /monitors/4/edit as Ada — PixelPort\u2019s monitor is rewritten.'],
    lesson: 'Read-only IDOR leaks data; write IDOR changes reality — both come from the same missing tenant check.',
    impact: 'An attacker repoints a rival\u2019s monitors at dead URLs or renames them — the victim\u2019s alerting now watches the wrong targets while the real site burns.',
    report: { title: 'Cross-Tenant Monitor Modification via IDOR', severity: 'High', remediation: 'Authorise writes with the same tenant scoping as reads and audit-log cross-account attempts.' },
    guide: 'Step by step: (1) Log in as Ada. (2) POST to /monitors/4/edit with a new name and URL. (3) Open PixelPort\u2019s monitor list as Ben — the change is real and was made by another tenant.' },
  { id: 'checker-ssrf', feature: 'Monitors', name: 'SSRF in the quick-check tool', owasp: 'A10:2021 Server-Side Request Forgery', difficulty: 'Intermediate',
    where: 'POST /tools/quickcheck',
    hints: ['The quick-check tool fetches any URL you give it — from the server\u2019s network position.', 'What internal addresses would a cloud server trust? The lab simulates one: 169.254.169.254.sim.', 'Quick-check http://169.254.169.254.sim/latest/meta-data/iam/security-credentials — the checker returns the simulated cloud credentials.'],
    lesson: 'Any server-side fetcher is an SSRF candidate; allowlists, egress rules and metadata hardening are the layered fix.',
    impact: 'The monitoring server becomes a proxy into the client\u2019s cloud metadata and internal network — credentials and internal services leak through a diagnostic tool.',
    report: { title: 'Server-Side Request Forgery in URL Quick-Check', severity: 'High', remediation: 'Validate and allowlist fetch targets, block link-local/metadata ranges, and require IMDSv2-style tokens on metadata services.' },
    guide: 'Step by step: (1) Log in and open /monitors — the Quick check box fetches a URL for you. (2) Enter http://169.254.169.254.sim/latest/meta-data/iam/security-credentials. (3) The result shows simulated cloud credentials — the server fetched an internal address on your behalf.' },
  { id: 'url-allowlist-bypass', feature: 'Monitors', name: 'Monitor URL allowlist bypass via userinfo', owasp: 'A10:2021 Server-Side Request Forgery', difficulty: 'Advanced',
    where: 'POST /monitors (URL validation vs fetch)',
    hints: ['Creating a monitor with an internal URL is blocked — the validator reads the host one way, the fetcher another.', 'In a URL, everything before the @ is userinfo, not the host. Which parser forgets that?', 'Create a monitor with URL http://shop.northbeam.test@169.254.169.254.sim/latest/meta-data — the validator approves "shop.northbeam.test", the checker fetches the metadata service.'],
    lesson: 'Validation and fetching must parse URLs identically; parser differentials are a classic SSRF bypass family.',
    impact: 'The one control meant to stop SSRF in monitor URLs is theatre — attackers walk straight past it with a single @ and reach internal services.',
    report: { title: 'SSRF Allowlist Bypass via URL Userinfo Parsing Differential', severity: 'High', remediation: 'Parse URLs with one strict parser for both validation and fetching; reject userinfo and non-allowlisted hosts after resolution.' },
    guide: 'Step by step: (1) Try creating a monitor pointing straight at 169.254.169.254.sim — validation blocks it. (2) Create one with http://shop.northbeam.test@169.254.169.254.sim/latest/meta-data. (3) It is approved — and its automatic first check returns the internal metadata, because the fetcher resolves the host after the @.' },

  /* ---- Alert Rules ---- */
  { id: 'alert-tamper', feature: 'Alert Rules', name: 'Cross-account alert rule tampering', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /alerts/:id/edit',
    hints: ['Alert rules are objects with IDs too — and the edit handler trusts them.', 'Whose inbox receives PixelPort\u2019s down-alerts after you visit their rule?', 'As Ada, POST to /alerts/2/edit and change notify to your own address — their alerts now come to you (or nowhere).'],
    lesson: 'Notification configuration is a security control; letting strangers rewrite it disables the alarm system itself.',
    impact: 'An attacker reroutes or mutes a client\u2019s downtime alerts, then takes the real site down — the client\u2019s team hears nothing until customers complain.',
    report: { title: 'Cross-Tenant Alert Rule Modification (IDOR)', severity: 'High', remediation: 'Scope alert-rule reads/writes to the owning account and notify owners of rule changes out-of-band.' },
    guide: 'Step by step: (1) Log in as Ada. (2) POST /alerts/2/edit with notify=attacker@evil.test and a huge threshold. (3) PixelPort\u2019s alert rule now points at the attacker — no ownership check stopped you.' },
  { id: 'alert-silence', feature: 'Alert Rules', name: 'Silencing a rival\u2019s monitor via maintenance window', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /maintenance',
    hints: ['Maintenance windows pause alerting for a monitor. Which monitor IDs does the form accept?', 'The handler never asks whether the monitor is yours.', 'As Ada, create a maintenance window for monitor 4 (PixelPort\u2019s) — their monitor is silenced under a fake maintenance note.'],
    lesson: 'Business workflows that suppress security signals (maintenance, mute, snooze) need the same authorisation rigour as the signals themselves.',
    impact: 'A fake "maintenance" window blinds the client\u2019s on-call team for hours — the perfect cover for attacking the real website unnoticed.',
    report: { title: 'Unauthorised Maintenance Windows Silence Other Tenants\u2019 Alerts', severity: 'High', remediation: 'Verify monitor ownership on maintenance creation and alert owners when windows are scheduled.' },
    guide: 'Step by step: (1) Log in as Ada. (2) POST /maintenance with monitorId=4 and any note/duration. (3) PixelPort\u2019s monitor now shows a maintenance badge — its alerts are paused, scheduled by a stranger.' },

  /* ---- Incidents ---- */
  { id: 'incident-xss', feature: 'Incidents', name: 'Stored XSS in incident comments', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    where: 'POST /incidents/:id/comment, served on the incident page',
    hints: ['Incident comments are the team\u2019s shared timeline. How are they rendered?', 'Post a comment containing markup and reload the incident.', 'Comment <script>alert(document.domain)</script> on an incident — it executes for everyone who opens the timeline.'],
    lesson: 'Collaboration text is still untrusted input; timelines and comment feeds are prime stored-XSS real estate.',
    impact: 'One poisoned incident comment hijacks the session of every responder who opens it — during a real outage, when the whole team is watching.',
    report: { title: 'Stored Cross-Site Scripting in Incident Comments', severity: 'High', remediation: 'HTML-encode comment output, sanitise any allowed markup, and deploy a restrictive CSP.' },
    guide: 'Step by step: (1) Open any incident. (2) Post the comment <script>alert(document.domain)</script>. (3) Reload — the payload runs in every viewer\u2019s browser because comments are printed unencoded.' },
  { id: 'incident-idor', feature: 'Incidents', name: 'Cross-account incident access', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'GET /incidents/:id',
    hints: ['Incidents carry internal notes marked "do not share". Who can read them?', 'Incident IDs are sequential and the handler skips the tenant check.', 'As Ada, open /incidents/2 — PixelPort\u2019s incident, including its internal note, is fully visible.'],
    lesson: 'Internal incident data (causes, infrastructure hints, customer impact) is sensitive; tenant scoping must cover every route, not just lists.',
    impact: 'A rival reads the client\u2019s outage post-mortems live — root causes, weak points and embarrassed internal notes included.',
    report: { title: 'Cross-Tenant Incident Disclosure via IDOR', severity: 'High', remediation: 'Authorise incident access by account ownership on every incident route.' },
    guide: 'Step by step: (1) Log in as Ada. (2) Open /incidents/2. (3) PixelPort\u2019s incident detail — status, comments and the internal note — renders for a foreign tenant.' },

  /* ---- Status Pages ---- */
  { id: 'status-leak', feature: 'Status Pages', name: 'Public status page leaks internal data', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'GET /status/:slug (unauthenticated)',
    hints: ['The public status page is meant to show up/down. What else is in the HTML?', 'View the page source while logged out and look for "INTERNAL".', 'Open /status/northbeam logged out — monitor internal notes and the account contact email are in the public markup.'],
    lesson: 'Public views must be built from a public DTO; rendering the full internal object always leaks whatever is added later.',
    impact: 'The whole internet can read the client\u2019s internal infrastructure notes and staff contact emails from a page designed for customers.',
    report: { title: 'Internal Operational Data Exposed on Public Status Page', severity: 'Medium', remediation: 'Render public status pages from an allowlisted view model that excludes internal notes, emails and debug data.' },
    guide: 'Step by step: (1) Log out. (2) Open /status/northbeam. (3) View source: the monitors\u2019 INTERNAL notes and the account\u2019s contact email are served to anonymous visitors.' },
  { id: 'status-enumeration', feature: 'Status Pages', name: 'Status page enumeration', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'GET /status/:slug',
    hints: ['Status pages live at short, guessable slugs — the account\u2019s short name.', 'How many different company status pages can you find by guessing?', 'Probe 5 distinct slugs (northbeam, pixelport, and a few guesses) while logged out — every guess is answered and nothing throttles you.'],
    lesson: 'Guessable public identifiers plus zero throttling let strangers map your whole customer base; monitor and rate-limit enumeration patterns.',
    impact: 'Competitors harvest the monitoring provider\u2019s customer list one slug at a time — a ready-made target list of companies and their infrastructure.',
    report: { title: 'Unauthenticated Status Page Enumeration Without Throttling', severity: 'Low', remediation: 'Use unguessable page tokens for public pages and rate-limit slug probing per IP.' },
    guide: 'Step by step: (1) Log out. (2) Request /status/ for 5 different slugs in a row. (3) Each answers (page or 404) with no slowing or blocking — the customer directory is enumerable.' },
  { id: 'status-xss', feature: 'Status Pages', name: 'Reflected XSS on the public status page', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    where: 'GET /status/:slug?notice=',
    hints: ['Status pages accept a notice parameter shown as a banner. Is it encoded?', 'Craft a link with markup in the notice and open it.', 'Open /status/northbeam?notice=<script>alert(1)</script> — the banner reflects it raw, a perfect phishing link on the real domain.'],
    lesson: 'Reflected parameters must be encoded even on "harmless" public pages — the trusted domain is what makes the phish work.',
    impact: 'Attackers send the client\u2019s customers a link on the client\u2019s own status domain that runs script in their browser — trust in the brand does the rest.',
    report: { title: 'Reflected Cross-Site Scripting via Status Page Notice Parameter', severity: 'Medium', remediation: 'HTML-encode the notice parameter and avoid reflecting arbitrary query input.' },
    guide: 'Step by step: (1) Log out. (2) Open /status/northbeam?notice=<script>alert(1)</script>. (3) The script executes — the parameter is reflected into the banner unencoded.' },

  /* ---- Integrations ---- */
  { id: 'webhook-ssrf', feature: 'Integrations', name: 'SSRF via integration webhook test', owasp: 'A10:2021 Server-Side Request Forgery', difficulty: 'Intermediate',
    where: 'POST /integrations/:id/test',
    hints: ['The "Send test" button makes the server call your webhook URL. Any URL.', 'Internal addresses answer the server — including the simulated ops console at internal-admin.sim.', 'Create a webhook integration pointing at http://internal-admin.sim/ and press test — the response shows the internal console.'],
    lesson: 'Webhook testers are SSRF by design unless targets are restricted; the test path needs the same egress controls as production sends.',
    impact: 'Through a "test webhook" button, attackers pull internal admin panels and metadata into the integration log — from a free trial account.',
    report: { title: 'Server-Side Request Forgery in Webhook Test Delivery', severity: 'High', remediation: 'Restrict webhook targets to public HTTPS URLs, block internal ranges at connect time, and log egress attempts.' },
    guide: 'Step by step: (1) Create an integration with URL http://internal-admin.sim/. (2) Press "Send test". (3) The test result displays the internal ops console HTML — the server fetched an internal-only service for you.' },
  { id: 'integration-secrets', feature: 'Integrations', name: 'Cross-account integration secrets exposure', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'GET /integrations/:id',
    hints: ['Integration details include the webhook signing secret. Whose integrations can you open?', 'IDs are sequential; the detail handler shows the full record.', 'As Ada, open /integrations/2 — PixelPort\u2019s webhook URL and its signing secret are displayed.'],
    lesson: 'Secrets multiply the blast radius of an IDOR: one missing check leaks credentials that unlock other systems.',
    impact: 'With a rival\u2019s webhook signing secret, an attacker forges "official" alert messages — fake all-clear or fake outage notices the client\u2019s team will believe.',
    report: { title: 'Cross-Tenant Exposure of Webhook URLs and Signing Secrets', severity: 'High', remediation: 'Tenant-scope integration access and mask secrets after creation (show once, never re-display).' },
    guide: 'Step by step: (1) Log in as Ada. (2) Open /integrations/2. (3) PixelPort\u2019s integration detail — endpoint and signing secret — is shown to a foreign tenant.' },

  /* ---- Admin Panel ---- */
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'Admin user deletion via GET (CSRF)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'GET /admin/users/delete?id=',
    hints: ['Destructive admin actions should never ride on a GET — do these?', 'A link an admin can be tricked into clicking must not change state.', 'As platform admin, open /admin/users/delete?id=2 — Omar is deleted by a plain GET: an <img> tag on any page would do the same.'],
    lesson: 'State changes belong behind POST + CSRF tokens; GET endpoints that mutate are one malicious image away from disaster.',
    impact: 'A single link in an email deletes staff accounts from the client\u2019s monitoring platform — no password, no confirmation, just a click.',
    report: { title: 'State-Changing Administrative Action Performed via GET (CSRF)', severity: 'High', remediation: 'Require POST with a valid CSRF token and a confirmation step for destructive admin actions.' },
    guide: 'Step by step: (1) Log in as platform admin (or via the cookie trick). (2) Visit /admin/users/delete?id=2. (3) The user is gone — a GET request performed a destructive, tokenless state change.' },

  /* ---- Platform & API ---- */
  { id: 'api-bola', feature: 'Platform & API', name: 'API BOLA — accountId parameter crosses tenants', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'GET /api/monitors?accountId=',
    hints: ['Your API key belongs to your account. What does the accountId query parameter do?', 'The API trusts the parameter over the key\u2019s tenant.', 'Call /api/monitors?accountId=2 with Northbeam\u2019s key — PixelPort\u2019s monitors come back.'],
    lesson: 'API authorisation must be derived from the credential, never from client-supplied tenant parameters.',
    impact: 'Every API customer can pull every other customer\u2019s monitor inventory — the whole platform\u2019s infrastructure map via one parameter.',
    report: { title: 'Broken Object Level Authorisation in API via accountId Parameter', severity: 'High', remediation: 'Ignore client-supplied tenant IDs; scope all API queries by the account bound to the API key.' },
    guide: 'Step by step: (1) Take Northbeam\u2019s API key from the Integrations page. (2) GET /api/monitors?accountId=2 with header X-API-Key set to it. (3) The response lists PixelPort\u2019s monitors — the parameter overrode your tenant.' },
  { id: 'api-key-weak', feature: 'Platform & API', name: 'Legacy API key derived from email', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Advanced',
    where: 'GET /api/monitors (X-API-Key)',
    hints: ['Old "legacy" API keys are still accepted next to the real ones. How were they generated?', 'Emails are public. Base64 is not encryption.', 'The legacy key for an account is hmk_ + base64(admin email). Compute Ben\u2019s from ben@pixelport.test and call the API — it authenticates.'],
    lesson: 'API keys must be random and unguessable; a key derived from public data is a password printed on a business card.',
    impact: 'Anyone who knows a staff email — printed on the leaky status page — can mint a working API key for that company\u2019s account.',
    report: { title: 'Predictable Legacy API Keys Derived from Account Email', severity: 'High', remediation: 'Retire derived keys, issue CSPRNG-generated keys, store only hashes, and support rotation.' },
    guide: 'Step by step: (1) Note Ben\u2019s public email: ben@pixelport.test. (2) Compute hmk_ + base64("ben@pixelport.test"). (3) GET /api/monitors with that X-API-Key — you are authenticated as PixelPort without ever seeing their real key.' },
];

const _eB = ['LTdSWQ==', 'VTdIQg==', 'VFdSVQ=='];
function entryKey() { return _un(_eA.concat(_eB)); }

/* ============================ Progress engine ============================ */
let progress = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const p = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      if (p && typeof p === 'object') progress = Object.assign(progress, p);
    }
  } catch (e) { /* corrupted state file -> start fresh, never crash */ }
}
function saveProgress() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 1)); } catch (e) {}
}
function pass(id) {
  if (!TESTS.some(t => t.id === id)) return;
  if (!progress.tests[id]) { progress.tests[id] = true; saveProgress(); }
}
function attempt(feature) {
  progress.attempts[feature] = (progress.attempts[feature] || 0) + 1;
  saveProgress();
}
function isComplete() { return TESTS.every(t => progress.tests[t.id]); }
function progressSummary() {
  const total = TESTS.length;
  const done = TESTS.filter(t => progress.tests[t.id]).length;
  const features = {};
  for (const t of TESTS) {
    features[t.feature] = features[t.feature] || { total: 0, done: 0, attempts: progress.attempts[t.feature] || 0 };
    features[t.feature].total++;
    if (progress.tests[t.id]) features[t.feature].done++;
  }
  for (const f of Object.keys(features)) features[f].attempts = progress.attempts[f] || 0;
  return { lab: LAB_NAME, number: LAB_NUMBER, total, done, pct: total ? Math.floor(done * 100 / total) : 0, features, complete: done === total };
}

/* ============================ App data (seed) ============================ */
const accounts = [
  { id: 1, name: 'Northbeam Retail', slug: 'northbeam', plan: 'pro', contact: 'billing@northbeam.test', apiKey: 'hmk_A_NORTHBEAM_LIVE_9F2' },
  { id: 2, name: 'PixelPort Studio', slug: 'pixelport', plan: 'free', contact: 'hello@pixelport.test', apiKey: 'hmk_B_PIXELPORT_LIVE_4D7' },
];
const users = [
  { id: 1, accountId: 1, name: 'Ada Admin', email: 'ada@northbeam.test', password: 'ada-pass-1', role: 'admin' },
  { id: 2, accountId: 1, name: 'Omar Operator', email: 'omar@northbeam.test', password: 'omar-pass-1', role: 'operator' },
  { id: 3, accountId: 1, name: 'Vera Viewer', email: 'vera@northbeam.test', password: 'vera-pass-1', role: 'viewer' },
  { id: 4, accountId: 2, name: 'Ben Admin', email: 'ben@pixelport.test', password: 'ben-pass-1', role: 'admin' },
  { id: 5, accountId: 2, name: 'Nia Operator', email: 'nia@pixelport.test', password: 'nia-pass-1', role: 'operator' },
  { id: 6, accountId: 0, name: 'Platform Root', email: 'root@hexamonitor.test', password: 'admin123', role: 'platform' },
];
const monitors = [
  { id: 1, accountId: 1, name: 'Northbeam Storefront', url: 'https://shop.northbeam.test', type: 'HTTP', intervalMin: 5, status: 'up', internalNote: 'INTERNAL: runs on legacy VM nb-web-01, SSH via bastion only', lastCheck: '' },
  { id: 2, accountId: 1, name: 'Northbeam Checkout API', url: 'https://api.northbeam.test/checkout', type: 'API', intervalMin: 2, status: 'up', internalNote: 'INTERNAL: checkout shares the payments DB', lastCheck: '' },
  { id: 3, accountId: 1, name: 'Northbeam Blog', url: 'https://blog.northbeam.test', type: 'HTTP', intervalMin: 10, status: 'down', internalNote: 'INTERNAL: blog host disk nearly full', lastCheck: '' },
  { id: 4, accountId: 2, name: 'PixelPort Gallery', url: 'https://gallery.pixelport.test', type: 'HTTP', intervalMin: 5, status: 'up', internalNote: 'INTERNAL: client staging creds in vault note PP-7', lastCheck: '' },
  { id: 5, accountId: 2, name: 'PixelPort Booking API', url: 'https://api.pixelport.test/bookings', type: 'API', intervalMin: 3, status: 'degraded', internalNote: 'INTERNAL: client migrating providers this month', lastCheck: '' },
];
const alertRules = [
  { id: 1, accountId: 1, monitorId: 1, name: 'Storefront down 2 min', notify: 'oncall@northbeam.test', threshold: 2, enabled: true },
  { id: 2, accountId: 2, monitorId: 4, name: 'Gallery down 5 min', notify: 'ben@pixelport.test', threshold: 5, enabled: true },
];
const incidents = [
  { id: 1, accountId: 1, monitorId: 3, title: 'Blog unreachable', status: 'investigating', internalNote: 'INTERNAL: suspected host disk failure — do not share publicly', comments: [ { user: 'Omar Operator', body: 'Looking into the host now.', internal: false } ] },
  { id: 2, accountId: 2, monitorId: 5, title: 'Booking API slow responses', status: 'identified', internalNote: 'INTERNAL: client is mid-migration, keep quiet', comments: [] },
];
const integrations = [
  { id: 1, accountId: 1, type: 'Slack', url: 'https://hooks.slack.test/T000/B000/xxxx', secret: 'whsec_A_SLACK_SIGNING_81' },
  { id: 2, accountId: 2, type: 'Webhook', url: 'https://hooks.pixelport.test/notify', secret: 'whsec_B_WEBHOOK_SIGNING_42' },
  { id: 3, accountId: 2, type: 'Discord', url: 'https://discord.test/api/webhooks/123', secret: 'whsec_B_DISCORD_99' },
];
const maintenance = [];
let nextUserId = 7, nextMonitorId = 6, nextIntegrationId = 4, nextMaintenanceId = 1, nextAccountId = 3;

const _cA = ['TC1YSA==', 'SS04Mg==', 'SDhWSQ=='];

/* ================= Simulated network (SAFE, in-app only) =================
 * The checker/webhook fetcher never touches the real network. URLs resolve
 * against this virtual map: a few simulated public sites plus simulated
 * INTERNAL hosts (cloud metadata, ops console, agent config) that a real
 * SSRF would reach. Everything is fake data generated in-process. */
function effectiveHost(rawUrl) {
  const m = String(rawUrl || '').match(/^https?:\/\/([^\/:?#]+)/i);
  if (!m) return '';
  let authority = m[1];
  if (authority.includes('@')) authority = authority.split('@').slice(-1)[0];
  return authority.toLowerCase();
}
function displayHost(rawUrl) {
  const m = String(rawUrl || '').match(/^https?:\/\/([^\/:?#]+)/i);
  if (!m) return '';
  return m[1].split('@')[0].toLowerCase();
}
const INTERNAL_HOSTS = ['169.254.169.254.sim', 'metadata.internal', 'internal-admin.sim', 'localhost', '127.0.0.1'];
function simulateFetch(rawUrl) {
  const host = effectiveHost(rawUrl);
  const p = String(rawUrl || '').split('?')[0];
  if (!host) return { status: 0, internal: false, host, body: 'Invalid URL — nothing was fetched.' };
  if (host === '169.254.169.254.sim' || host === 'metadata.internal') {
    if (p.includes('security-credentials')) {
      return { status: 200, internal: true, host, body: '{\n  "Code" : "Success",\n  "AccessKeyId" : "SIMULATED-AK-IA-EXAMPLE",\n  "SecretAccessKey" : "SIMULATED-SECRET-KEY-DO-NOT-USE",\n  "Token" : "SIMULATED-SESSION-TOKEN",\n  "Expiration" : "2026-10-24T00:00:00Z"\n}' };
    }
    return { status: 200, internal: true, host, body: 'latest\nmeta-data\nmeta-data/iam\nmeta-data/iam/security-credentials' };
  }
  if (host === 'internal-admin.sim') {
    return { status: 200, internal: true, host, body: '<h1>Internal Ops Console</h1><p>SIMULATED internal service. Services: checker-agent, billing-worker, db-proxy. Admin token: SIMULATED-OPS-TOKEN.</p>' };
  }
  if (host === 'localhost' || host === '127.0.0.1') {
    return { status: 200, internal: true, host, body: '{\n  "agent" : "hexamonitor-checker",\n  "agentToken" : "SIMULATED-AGENT-TOKEN",\n  "region" : "sim-1"\n}' };
  }
  return { status: 200, internal: false, host, body: 'OK — ' + host + ' responded 200 in 84ms. Keyword check passed. (Simulated public site.)' };
}

/* ============================ Sessions ============================ */
const sessions = new Map();
function makeSession(user) {
  const sid = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  sessions.set(sid, { userId: user.id });
  return sid;
}
function getSession(req) {
  const c = cookies(req);
  if (!c.hxmon_sess) return null;
  const s = sessions.get(c.hxmon_sess);
  if (!s) return null;
  const user = users.find(u => u.id === s.userId);
  if (!user) return null;
  return { user, sid: c.hxmon_sess };
}
function effectiveRole(req, sess) {
  const c = cookies(req);
  if (c.hx_role) return c.hx_role; // VULN: the client-supplied role cookie is trusted
  return sess ? sess.user.role : '';
}

/* ============================ Small helpers ============================ */
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function cookies(req) {
  const out = {};
  const h = req.headers.cookie || '';
  for (const part of h.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function parseBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', ch => { data += ch; if (data.length > 2e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) {
        try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); }
      } else {
        const out = {};
        for (const pair of data.split('&')) {
          if (!pair) continue;
          const i = pair.indexOf('=');
          const k = decodeURIComponent(pair.slice(0, i).replace(/\+/g, ' '));
          out[k] = i >= 0 ? decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' ')) : '';
        }
        resolve(out);
      }
    });
    req.on('error', () => resolve({}));
  });
}
function send(res, code, html, headers) {
  res.writeHead(code, Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, headers || {}));
  res.end(html);
}
function redirect(res, to, headers) { res.writeHead(302, Object.assign({ Location: to }, headers || {})); res.end(); }
function originOk(req, body) {
  const origin = req.headers.origin || '';
  if (origin && !origin.includes(req.headers.host || '')) return false;
  if (!body || body.hx_marker === undefined) return false;
  return true;
}
function isCsrf(req, body) { return !originOk(req, body); }
function markerField() { return '<input type="hidden" name="hx_marker" value="1">'; }
function xssPayload(s) { return /<script|onerror\s*=|onload\s*=|<svg|<img[^>]*onerror/i.test(String(s || '')); }
function dayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now - start) / 864e5);
}
function resetTokenFor(user) { return 'HM-' + (user.id * 331 + dayOfYear()).toString(16).toUpperCase().padStart(4, '0'); }
function legacyApiKeyFor(account) {
  const admin = users.find(u => u.accountId === account.id && u.role === 'admin') || users.find(u => u.accountId === account.id);
  return admin ? 'hmk_' + Buffer.from(admin.email, 'utf8').toString('base64') : '';
}
function accountOf(id) { return accounts.find(a => a.id === id); }
function monitorOf(id) { return monitors.find(m => m.id === id); }

/* ================= Auth tracking (brute force / enumeration) ================= */
const failedLogins = new Map();   // email -> { count, first }
const enumProbes = new Map();     // ip -> { unknown: bool, known: bool }
function clientIp(req) { return (req.socket && req.socket.remoteAddress) || 'local'; }
function evalLogin(email, password) {
  // Builds a query string the way the vulnerable app does, then "executes" it.
  const query = "SELECT * FROM users WHERE email='" + email + "' AND password='" + password + "'";
  const exact = users.find(u => u.email === email && u.password === password);
  if (exact) return { user: exact, via: 'exact', query };
  const inj = /'\s*(or|and)\s*'?\d+'?\s*=\s*'?\d+|'\s*or\s*'[^']*'='|'\s*--|\bor\s+1\s*=\s*1/i;
  if (inj.test(email) || inj.test(password)) {
    let target = null;
    const beforeQuote = String(email).split("'")[0];
    target = users.find(u => u.email === beforeQuote) || users.find(u => u.role === 'platform') || users[0];
    if (target) return { user: target, via: 'sqli', query };
  }
  return { user: null, via: 'fail', query };
}

/* ============================ Layout ============================ */
function layout(req, title, body, sess) {
  const sum = progressSummary();
  const pct = sum.pct;
  const auth = sess
    ? '<span style="color:#cfe3ff">' + sess.user.name + '</span> <a style="color:#9fc1ff" href="/dashboard">Dashboard</a> <a style="color:#9fc1ff" href="/monitors">Monitors</a> <a style="color:#9fc1ff" href="/alerts">Alerts</a> <a style="color:#9fc1ff" href="/incidents">Incidents</a> <a style="color:#9fc1ff" href="/integrations">Integrations</a> <a style="color:#9fc1ff" href="/team">Team</a> <a style="color:#9fc1ff" href="/profile">Profile</a> <a style="color:#9fc1ff" href="/logout">Logout</a>'
    : '<a style="color:#9fc1ff" href="/login">Login</a> <a style="color:#9fc1ff" href="/register">Register</a>';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + ' — HexaMonitor</title>' +
    '<style>body{font-family:system-ui,Arial,sans-serif;margin:0;background:#0d1420;color:#e8eef7}header{background:#111c2e;padding:10px 18px;display:flex;gap:14px;align-items:center;flex-wrap:wrap}header img{height:34px}main{max-width:980px;margin:22px auto;padding:0 16px}input,select,textarea{padding:8px;border-radius:6px;border:1px solid #335;background:#0f1a2c;color:#e8eef7}button{background:#2f7cf6;color:#fff;border:0;padding:9px 16px;border-radius:6px;cursor:pointer}a{color:#7db4ff}.card{background:#13203a;border:1px solid #24405f;border-radius:10px;padding:16px;margin:12px 0}table{width:100%;border-collapse:collapse}td,th{padding:7px;border-bottom:1px solid #24405f;text-align:left}.bar{background:#233750;border-radius:6px;height:14px;overflow:hidden}.bar>i{display:block;height:100%;background:linear-gradient(90deg,#2f7cf6,#8a5cf6)}code{background:#0a1220;padding:2px 6px;border-radius:4px}.up{color:#4ade80}.down{color:#f87171}.degraded{color:#fbbf24}</style></head><body>' +
    '<header><img src="/logo.png" alt="HexaCyberLab"><b>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</b>' +
    '<span style="flex:1"></span>' + auth +
    '<a style="color:#9fc1ff" href="/tests">🎯 Tests</a><a style="color:#9fc1ff" href="/complete">🏁 Complete</a></header>' +
    '<div style="max-width:980px;margin:10px auto;padding:0 16px"><div style="font-size:13px;margin-bottom:4px">LAB ' + LAB_NUMBER + ' · ' + sum.done + '/' + sum.total + ' tests · ' + pct + '%</div><div class="bar"><i style="width:' + pct + '%"></i></div></div>' +
    '<main>' + body + '</main>' +
    '<div id="hxchat" style="position:fixed;right:14px;bottom:14px;width:320px;background:#0f1a2c;border:1px solid #335;border-radius:10px;padding:10px;z-index:50">' +
    '<b>🧭 Lab Coach</b><div id="hxlog" style="height:150px;overflow:auto;font-size:13px;margin:8px 0"></div>' +
    '<input id="hxin" placeholder="Ask the coach…" style="width:70%"><button onclick="hxSend()">Send</button></div>' +
    '<script>async function hxSend(){var i=document.getElementById("hxin"),l=document.getElementById("hxlog");var m=i.value.trim();if(!m)return;i.value="";l.innerHTML+="<div><b>You:</b> "+m.replace(/</g,"&lt;")+"</div>";var r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:m})});var j=await r.json();l.innerHTML+="<div style=\\"margin:6px 0\\"><b>Coach:</b> "+j.reply.replace(/</g,"&lt;").replace(/\\n/g,"<br>")+"</div>";l.scrollTop=l.scrollHeight;}</script>' +
    '</body></html>';
}
function gatePage(req, err) {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ' + LAB_NUMBER + ' locked</title></head>' +
    '<body style="font-family:system-ui;background:#0d1420;color:#e8eef7;text-align:center;padding:60px 20px">' +
    '<img src="/logo.png" style="height:70px"><h1>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h1>' +
    '<p>This lab is locked. Paste the completion key from Lab ' + PREV_LAB + ' to start.</p>' +
    (err ? '<p style="color:#f87171">' + esc(err) + '</p>' : '') +
    '<form method="POST" action="/unlock"><input name="key" style="padding:9px;width:320px" placeholder="Completion key from Lab ' + PREV_LAB + '"><br><br><button style="padding:10px 22px">Unlock</button></form>' +
    '<div style="max-width:340px;margin:40px auto;text-align:left;background:#0f1a2c;border:1px solid #335;border-radius:10px;padding:10px"><b>🧭 Lab Coach</b><div id="hxlog" style="height:120px;overflow:auto;font-size:13px;margin:8px 0"></div><input id="hxin" placeholder="Ask the coach…" style="width:65%"><button onclick="hxSend()">Send</button></div>' +
    '<script>async function hxSend(){var i=document.getElementById("hxin"),l=document.getElementById("hxlog");var m=i.value.trim();if(!m)return;i.value="";l.innerHTML+="<div><b>You:</b> "+m.replace(/</g,"&lt;")+"</div>";var r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:m})});var j=await r.json();l.innerHTML+="<div style=\\"margin:6px 0\\"><b>Coach:</b> "+j.reply.replace(/</g,"&lt;").replace(/\\n/g,"<br>")+"</div>";l.scrollTop=l.scrollHeight;}</script>' +
    '</body></html>';
}

/* ============================ Lab Coach chatbot ============================ */
const FEATURE_KEYWORDS = [
  ['Login & Authentication', ['login', 'log in', 'auth', 'password', 'brute', 'reset token', 'enumeration', 'cookie role', 'sqli', 'sql injection', 'sign in']],
  ['Registration & Profile', ['register', 'registration', 'sign up', 'signup', 'profile', 'mass assignment', 'display name']],
  ['Monitors', ['monitor', 'quick check', 'quickcheck', 'checker', 'ssrf', 'uptime check', 'idor']],
  ['Alert Rules', ['alert', 'maintenance', 'silence', 'mute', 'notification']],
  ['Incidents', ['incident', 'comment', 'timeline', 'outage']],
  ['Status Pages', ['status page', 'status pages', 'public page', 'slug', 'notice']],
  ['Integrations', ['integration', 'webhook', 'slack', 'discord', 'secret']],
  ['Admin Panel', ['admin', 'console', 'delete user']],
  ['Platform & API', ['api', 'api key', 'bola', 'accountid', 'legacy key']],
];
function featureFromMessage(msg) {
  const m = msg.toLowerCase();
  for (const [feature, words] of FEATURE_KEYWORDS) {
    if (words.some(w => m.includes(w))) return feature;
  }
  return null;
}
function chatReply(raw) {
  const msg = String(raw || '').trim();
  const m = msg.toLowerCase();
  const sum = progressSummary();
  if (/who (built|made|created)|founder|jony|hassain|hexacyberlab/.test(m)) {
    return 'These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for "Who is Md. Jony Hassain", or ask ChatGPT.';
  }
  if (/(completion key|the key|next lab.*key|unlock key|give me the key|lab 28)/.test(m)) {
    if (sum.complete && progress.keyRevealed) return 'You completed LAB ' + LAB_NUMBER + ' — here is the completion key for Lab ' + (LAB_NUMBER + 1) + ': ' + completionKey();
    return 'I don\u2019t have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at ' + sum.pct + '% (' + sum.done + '/' + sum.total + '). Finish every test and I\u2019ll hand it over.';
  }
  if (/progress|how am i doing|score|percent/.test(m)) {
    const next = TESTS.find(t => !progress.tests[t.id]);
    return 'Current progress: ' + sum.done + '/' + sum.total + ' tests (' + sum.pct + '%). ' + (next ? 'Next open test: "' + next.name + '" in ' + next.feature + ' — see /tests for hints.' : 'Lab complete! Open /complete for your debrief and key.');
  }
  if (/^(hi|hello|hey|help|start|begin)/.test(m) || m === '') {
    return 'Hello! I am the Lab Coach for LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ', an uptime-monitoring SaaS. There are ' + Object.keys(sum.features).length + ' features and ' + sum.total + ' security tests. Ask me how many vulnerabilities a feature has (the map is free) — step-by-step help unlocks after you have tried a feature at least 3 times. Open /tests to begin.';
  }
  const feature = featureFromMessage(msg);
  if (feature) {
    const list = TESTS.filter(t => t.feature === feature);
    const wantsHow = /how|guide|step|solve|do (it|the)|exploit|attack|walkthrough|help me/.test(m);
    if (!wantsHow || /how many|which|list|count|what (tests|vulnerabilities|flaws)/.test(m)) {
      const names = list.map(t => '• ' + t.name + (progress.tests[t.id] ? ' ✓' : '')).join('\n');
      return feature + ' has ' + list.length + ' tests:\n' + names + '\nAttempts so far on this feature: ' + (progress.attempts[feature] || 0) + '. Ask me "how do I do the ' + feature + ' tests?" after at least 3 tries and I\u2019ll guide you step by step.';
    }
    const att = progress.attempts[feature] || 0;
    const anyPassed = list.some(t => progress.tests[t.id]);
    if (att >= 3 || anyPassed) {
      const guides = list.filter(t => !progress.tests[t.id]).map(t => '— ' + t.name + ': ' + t.guide).join('\n');
      return 'You\u2019ve earned guidance for ' + feature + ' (' + att + ' attempt(s)). Step by step:\n' + (guides || 'All tests in this feature are already complete. ✓');
    }
    return 'That feature is locked for help. First try the ' + feature + ' tests yourself at least 3 times — I can see you\u2019ve tried ' + att + ' time(s) so far. After 3 real tries, ask me again and I\u2019ll guide you step by step.';
  }
  return 'I can help with LAB ' + LAB_NUMBER + ' (' + LAB_NAME + '): ask about a feature (monitors, alert rules, incidents, status pages, integrations, login, registration, admin, API) — I\u2019ll tell you its test names and counts freely, and step-by-step help after 3 genuine tries on that feature. Your progress and hints live at /tests.';
}

/* ============================ Router ============================ */
const _cB = ['LUxMQg==', 'MUhMUw==', 'WDNSVg=='];
function completionKey() { return _un(_cA.concat(_cB)); }

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://127.0.0.1:' + PORT);
    const p = u.pathname;
    const method = req.method;

    if (p === '/logo.png') {
      try {
        const img = fs.readFileSync(path.join(DIR, 'logo.png'));
        res.writeHead(200, { 'Content-Type': 'image/png' });
        return res.end(img);
      } catch (e) { return send(res, 404, 'logo missing'); }
    }
    if (p === '/unlock' && method === 'POST') {
      const body = await parseBody(req);
      const given = String(body.key || '').trim();
      const expected = entryKey();
      let same = given.length === expected.length;
      if (same) { let diff = 0; for (let i = 0; i < expected.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i); same = diff === 0; }
      if (same) { progress.unlocked = true; saveProgress(); return redirect(res, '/'); }
      res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(gatePage(req, 'That key was not accepted.'));
    }
    if (p === '/api/chat' && method === 'POST') {
      const body = await parseBody(req);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ reply: chatReply(body.message) }));
    }
    if (p === '/api/progress' && method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(progressSummary()));
    }

    /* ---- Lab lock gate ---- */
    if (!progress.unlocked) return send(res, 200, gatePage(req, ''));

    const sess = getSession(req);
    const needLogin = () => redirect(res, '/login');

    /* ---- Public status pages ---- */
    if (p.startsWith('/status/') && method === 'GET') {
      attempt('Status Pages');
      const slug = decodeURIComponent(p.slice('/status/'.length));
      const ip = clientIp(req);
      let probe = statusProbes.get(ip);
      if (!probe || Date.now() - probe.first > 60000) { probe = { slugs: new Set(), first: Date.now() }; statusProbes.set(ip, probe); }
      probe.slugs.add(slug);
      if (probe.slugs.size >= 5) pass('status-enumeration');
      const acct = accounts.find(a => a.slug === slug);
      if (!acct) return send(res, 404, layout(req, 'Not found', '<h1>Status page not found</h1><p>No public status page exists for "' + esc(slug) + '".</p>', sess));
      const notice = u.searchParams.get('notice') || '';
      if (notice && xssPayload(notice)) pass('status-xss');
      if (!sess) pass('status-leak'); // internal data below is served to anonymous visitors
      const mons = monitors.filter(mn => mn.accountId === acct.id);
      const incs = incidents.filter(i => i.accountId === acct.id);
      let h = '<h1>' + esc(acct.name) + ' — System Status</h1>';
      if (notice) h += '<div class="card" style="border-color:#8a5cf6">' + notice + '</div>'; // VULN: notice reflected unencoded
      h += mons.map(mn => '<div class="card"><b>' + esc(mn.name) + '</b> — <span class="' + mn.status + '">' + mn.status.toUpperCase() + '</span>' +
        '<div style="font-size:12px;color:#8fa8c8;margin-top:6px">Details: ' + esc(mn.internalNote) + ' · last check from agent region sim-1</div></div>').join(''); // VULN: internal note published
      if (incs.length) h += '<h3>Recent incidents</h3>' + incs.map(i => '<div class="card"><b>' + esc(i.title) + '</b> — ' + esc(i.status) + '</div>').join('');
      h += '<p style="font-size:12px;color:#8fa8c8">Questions? Contact ' + esc(acct.contact) + '</p>'; // VULN: staff contact email public
      return send(res, 200, layout(req, acct.name + ' status', h, sess));
    }

    /* ---- JSON API ---- */
    if (p === '/api/monitors' && method === 'GET') {
      attempt('Platform & API');
      const key = req.headers['x-api-key'] || u.searchParams.get('api_key') || '';
      let acct = accounts.find(a => a.apiKey === key);
      let viaLegacy = false;
      if (!acct) {
        for (const a of accounts) { if (key && key === legacyApiKeyFor(a)) { acct = a; viaLegacy = true; break; } }
      }
      if (!acct) { res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'invalid api key' })); }
      if (viaLegacy) pass('api-key-weak'); // VULN: predictable legacy key accepted
      const targetId = u.searchParams.get('accountId') ? parseInt(u.searchParams.get('accountId'), 10) : acct.id;
      if (targetId !== acct.id) pass('api-bola'); // VULN: client-supplied tenant overrides the key's tenant
      const list = monitors.filter(mn => mn.accountId === targetId).map(mn => ({ id: mn.id, name: mn.name, url: mn.url, status: mn.status }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ account: targetId, monitors: list }));
    }

    /* ---- Auth ---- */
    if (p === '/login' && method === 'GET') {
      if (sess) return redirect(res, '/dashboard');
      return send(res, 200, layout(req, 'Login', '<h1>Log in to HexaMonitor</h1><div class="card"><form method="POST" action="/login">Email<br><input name="email" style="width:90%"><br><br>Password<br><input name="password" type="password" style="width:90%"><br><br><button>Log in</button></form><p><a href="/forgot">Forgot password?</a> · <a href="/register">Create an account</a></p><p style="font-size:12px;color:#8fa8c8">Demo accounts: ada@northbeam.test / ada-pass-1 (Northbeam admin) · ben@pixelport.test / ben-pass-1 (PixelPort admin) · vera@northbeam.test / vera-pass-1 (viewer)</p></div>', null));
    }
    if (p === '/login' && method === 'POST') {
      attempt('Login & Authentication');
      const body = await parseBody(req);
      const email = String(body.email || ''), password = String(body.password || '');
      const r = evalLogin(email, password);
      if (r.user) {
        if (r.via === 'sqli') pass('sqli-login');
        if (r.via === 'exact' && r.user.email === 'root@hexamonitor.test' && password === 'admin123') pass('default-creds');
        const sid = makeSession(r.user);
        return redirect(res, '/dashboard', { 'Set-Cookie': ['hxmon_sess=' + sid + '; Path=/; HttpOnly', 'hx_role=' + r.user.role + '; Path=/'] });
      }
      const exists = users.some(x => x.email === email);
      const ip = clientIp(req);
      const ep = enumProbes.get(ip) || { unknown: false, known: false };
      if (exists) ep.known = true; else ep.unknown = true;
      enumProbes.set(ip, ep);
      if (ep.known && ep.unknown) pass('user-enumeration');
      const fl = failedLogins.get(email) || { count: 0, first: Date.now() };
      fl.count++; failedLogins.set(email, fl);
      if (fl.count >= 10) pass('brute-force'); // the 10th failure is still processed: no lockout exists
      const msg = exists ? 'Incorrect password.' : 'No account found for that email.';
      return send(res, 200, layout(req, 'Login', '<h1>Log in to HexaMonitor</h1><div class="card"><p style="color:#f87171">' + esc(msg) + '</p><form method="POST" action="/login">Email<br><input name="email" style="width:90%" value="' + esc(email) + '"><br><br>Password<br><input name="password" type="password" style="width:90%"><br><br><button>Log in</button></form><p><a href="/forgot">Forgot password?</a></p></div>', null));
    }
    if (p === '/logout') {
      if (sess) sessions.delete(sess.sid);
      return redirect(res, '/login', { 'Set-Cookie': ['hxmon_sess=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0'] });
    }
    if (p === '/register' && method === 'GET') {
      return send(res, 200, layout(req, 'Register', '<h1>Create your HexaMonitor account</h1><div class="card"><form method="POST" action="/register">Your name<br><input name="name" style="width:90%"><br><br>Work email<br><input name="email" style="width:90%"><br><br>Company<br><input name="company" style="width:90%"><br><br>Password<br><input name="password" type="password" style="width:90%"><br><br>' + markerField() + '<button>Create account</button></form></div>', null));
    }
    if (p === '/register' && method === 'POST') {
      attempt('Registration & Profile');
      const body = await parseBody(req);
      const acct = { id: nextAccountId++, name: String(body.company || 'My Team'), slug: 'team' + Math.random().toString(36).slice(2, 7), plan: 'free', contact: String(body.email || ''), apiKey: 'hmk_NEW_' + Math.random().toString(36).slice(2, 10).toUpperCase() };
      if (body.plan) acct.plan = String(body.plan); // VULN: mass assignment of plan
      accounts.push(acct);
      const user = { id: nextUserId++, accountId: acct.id, name: String(body.name || 'New User'), email: String(body.email || ''), password: String(body.password || ''), role: 'admin' };
      if (body.role) { user.role = String(body.role); } // VULN: mass assignment of role
      users.push(user);
      if (String(body.password || '').length < 4) pass('weak-password');
      if (user.role === 'platform' || acct.plan !== 'free') pass('mass-assignment');
      const sid = makeSession(user);
      return redirect(res, '/dashboard', { 'Set-Cookie': ['hxmon_sess=' + sid + '; Path=/; HttpOnly', 'hx_role=' + user.role + '; Path=/'] });
    }
    if (p === '/forgot' && method === 'GET') {
      return send(res, 200, layout(req, 'Forgot password', '<h1>Forgot password</h1><div class="card"><form method="POST" action="/forgot">Email<br><input name="email" style="width:90%"><br><br><button>Send reset link</button></form><p>Already have a token? <a href="/reset">Reset your password</a></p></div>', sess));
    }
    if (p === '/forgot' && method === 'POST') {
      attempt('Login & Authentication');
      const body = await parseBody(req);
      const user = users.find(x => x.email === String(body.email || ''));
      let msg;
      if (user) { user.resetIssued = resetTokenFor(user); msg = 'Reset link sent to your email.'; }
      else msg = 'No account with that email.'; // VULN: divergent response feeds enumeration
      return send(res, 200, layout(req, 'Forgot password', '<h1>Forgot password</h1><div class="card"><p>' + esc(msg) + '</p><p><a href="/reset">Enter your reset token</a></p></div>', sess));
    }
    if (p === '/reset' && method === 'GET') {
      return send(res, 200, layout(req, 'Reset password', '<h1>Reset password</h1><div class="card"><form method="POST" action="/reset">Email<br><input name="email" style="width:90%"><br><br>Reset token<br><input name="token" style="width:90%"><br><br>New password<br><input name="newpassword" type="password" style="width:90%"><br><br><button>Set new password</button></form></div>', sess));
    }
    if (p === '/reset' && method === 'POST') {
      attempt('Login & Authentication');
      const body = await parseBody(req);
      const user = users.find(x => x.email === String(body.email || ''));
      if (user && String(body.token || '') === resetTokenFor(user)) {
        if (user.resetIssued !== String(body.token || '')) pass('reset-token'); // forged token accepted: it was never the issued one
        user.password = String(body.newpassword || '');
        user.resetIssued = null;
        return redirect(res, '/login');
      }
      return send(res, 200, layout(req, 'Reset password', '<h1>Reset password</h1><div class="card"><p style="color:#f87171">Invalid or expired token.</p><p><a href="/forgot">Request a new one</a></p></div>', sess));
    }

    /* ---- Everything below needs an app session ---- */
    if (!sess && !['/tests', '/complete', '/certificate'].includes(p)) return needLogin();

    if (p === '/dashboard' && method === 'GET') {
      const acct = accountOf(sess.user.accountId);
      const mons = monitors.filter(mn => mn.accountId === sess.user.accountId);
      const incs = incidents.filter(i => i.accountId === sess.user.accountId);
      let h = '<h1>Welcome, ' + sess.user.name + '</h1>'; // name printed as stored (see profile-xss)
      h += '<div class="card"><b>' + esc(acct ? acct.name : 'Platform') + '</b> · plan: ' + esc(acct ? acct.plan : 'platform') + ' · role: ' + esc(sess.user.role) + '</div>';
      h += '<div class="card"><h3>Monitors</h3>' + (mons.length ? mons.map(mn => '<div>' + esc(mn.name) + ' — <span class="' + mn.status + '">' + mn.status.toUpperCase() + '</span> <a href="/monitors/' + mn.id + '">open</a></div>').join('') : '<p>No monitors yet.</p>') + '</div>';
      h += '<div class="card"><h3>Open incidents</h3>' + (incs.length ? incs.map(i => '<div><a href="/incidents/' + i.id + '">' + esc(i.title) + '</a> — ' + esc(i.status) + '</div>').join('') : '<p>None.</p>') + '</div>';
      if (acct) h += '<div class="card">Your public status page: <a href="/status/' + acct.slug + '">/status/' + acct.slug + '</a> · Your API key: <code>' + esc(acct.apiKey) + '</code></div>';
      return send(res, 200, layout(req, 'Dashboard', h, sess));
    }

    /* ---- Monitors ---- */
    if (p === '/monitors' && method === 'GET') {
      attempt('Monitors');
      const mons = monitors.filter(mn => mn.accountId === sess.user.accountId);
      let h = '<h1>Monitors</h1><div class="card"><table><tr><th>Name</th><th>URL</th><th>Status</th><th></th></tr>' +
        mons.map(mn => '<tr><td>' + esc(mn.name) + '</td><td>' + esc(mn.url) + '</td><td><span class="' + mn.status + '">' + mn.status.toUpperCase() + '</span></td><td><a href="/monitors/' + mn.id + '">open</a></td></tr>').join('') + '</table></div>';
      h += '<div class="card"><h3>Add a monitor</h3><form method="POST" action="/monitors">Name<br><input name="name" style="width:90%"><br><br>URL<br><input name="url" style="width:90%" placeholder="https://example.com"><br><br>' + markerField() + '<button>Add monitor</button></form><p style="font-size:12px;color:#8fa8c8">Internal and private addresses are blocked by the URL validator.</p></div>';
      h += '<div class="card"><h3>Quick check</h3><form method="POST" action="/tools/quickcheck">URL to fetch right now<br><input name="url" style="width:90%" placeholder="https://example.com"><br><br>' + markerField() + '<button>Fetch it</button></form></div>';
      return send(res, 200, layout(req, 'Monitors', h, sess));
    }
    if (p === '/monitors' && method === 'POST') {
      attempt('Monitors');
      const body = await parseBody(req);
      const url = String(body.url || '');
      const dHost = displayHost(url);
      if (INTERNAL_HOSTS.includes(dHost)) {
        return send(res, 200, layout(req, 'Monitors', '<h1>Monitors</h1><div class="card"><p style="color:#f87171">Blocked by the URL validator: internal addresses are not allowed as monitor targets.</p><p><a href="/monitors">Back</a></p></div>', sess));
      }
      const mon = { id: nextMonitorId++, accountId: sess.user.accountId, name: String(body.name || 'Monitor'), url, type: 'HTTP', intervalMin: 5, status: 'up', internalNote: '', lastCheck: '' };
      monitors.push(mon);
      const r = simulateFetch(url); // automatic first check
      mon.lastCheck = r.body;
      if (r.internal) { if (dHost !== r.host) pass('url-allowlist-bypass'); else pass('checker-ssrf'); }
      return redirect(res, '/monitors/' + mon.id);
    }
    if (p === '/tools/quickcheck' && method === 'POST') {
      attempt('Monitors');
      const body = await parseBody(req);
      const r = simulateFetch(String(body.url || ''));
      if (r.internal) pass('checker-ssrf'); // VULN: diagnostic fetcher reaches internal hosts
      return send(res, 200, layout(req, 'Quick check', '<h1>Quick check result</h1><div class="card"><p>Host: <code>' + esc(r.host) + '</code> · HTTP ' + r.status + '</p><pre style="white-space:pre-wrap">' + esc(r.body) + '</pre><p><a href="/monitors">Back to monitors</a></p></div>', sess));
    }
    const monMatch = p.match(/^\/monitors\/(\d+)$/);
    if (monMatch && method === 'GET') {
      attempt('Monitors');
      const mon = monitorOf(parseInt(monMatch[1], 10));
      if (!mon) return send(res, 404, layout(req, 'Not found', '<h1>Monitor not found</h1>', sess));
      if (mon.accountId !== sess.user.accountId) pass('monitor-idor-read'); // VULN: no tenant check
      const maint = maintenance.filter(mw => mw.monitorId === mon.id);
      let h = '<h1>' + esc(mon.name) + '</h1><div class="card"><p>URL: ' + esc(mon.url) + '</p><p>Status: <span class="' + mon.status + '">' + mon.status.toUpperCase() + '</span> · Type: ' + esc(mon.type) + ' · every ' + mon.intervalMin + ' min</p>' +
        '<p>Internal note: ' + esc(mon.internalNote || '—') + '</p>' +
        (maint.length ? '<p>🔕 Maintenance: ' + maint.map(mw => esc(mw.note)).join('; ') + '</p>' : '') +
        (mon.lastCheck ? '<p>Last check result:</p><pre style="white-space:pre-wrap">' + esc(mon.lastCheck) + '</pre>' : '') + '</div>';
      h += '<div class="card"><h3>Run check now</h3><form method="POST" action="/monitors/' + mon.id + '/check">' + markerField() + '<button>Check now</button></form></div>';
      h += '<div class="card"><h3>Edit monitor</h3><form method="POST" action="/monitors/' + mon.id + '/edit">Name<br><input name="name" value="' + esc(mon.name) + '" style="width:90%"><br><br>URL<br><input name="url" value="' + esc(mon.url) + '" style="width:90%"><br><br>' + markerField() + '<button>Save</button></form>' +
        '<form method="POST" action="/monitors/' + mon.id + '/delete" style="margin-top:10px">' + markerField() + '<button>Delete monitor</button></form></div>';
      return send(res, 200, layout(req, mon.name, h, sess));
    }
    const monAction = p.match(/^\/monitors\/(\d+)\/(edit|delete|check)$/);
    if (monAction && method === 'POST') {
      attempt('Monitors');
      const mon = monitorOf(parseInt(monAction[1], 10));
      if (!mon) return send(res, 404, layout(req, 'Not found', '<h1>Monitor not found</h1>', sess));
      const body = await parseBody(req);
      if (monAction[2] === 'edit') {
        if (mon.accountId !== sess.user.accountId) pass('monitor-idor-write'); // VULN: cross-tenant write
        mon.name = String(body.name || mon.name);
        mon.url = String(body.url || mon.url);
        return redirect(res, '/monitors/' + mon.id);
      }
      if (monAction[2] === 'delete') {
        if (mon.accountId !== sess.user.accountId) pass('monitor-idor-write');
        monitors.splice(monitors.indexOf(mon), 1);
        return redirect(res, '/monitors');
      }
      const r = simulateFetch(mon.url);
      mon.lastCheck = r.body;
      if (r.internal) { if (displayHost(mon.url) !== r.host) pass('url-allowlist-bypass'); else pass('checker-ssrf'); }
      return send(res, 200, layout(req, 'Check result', '<h1>Check result — ' + esc(mon.name) + '</h1><div class="card"><p>Host: <code>' + esc(r.host) + '</code> · HTTP ' + r.status + '</p><pre style="white-space:pre-wrap">' + esc(r.body) + '</pre><p><a href="/monitors/' + mon.id + '">Back to monitor</a></p></div>', sess));
    }

    /* ---- Alert rules & maintenance ---- */
    if (p === '/alerts' && method === 'GET') {
      attempt('Alert Rules');
      const rules = alertRules.filter(r => r.accountId === sess.user.accountId);
      const mons = monitors.filter(mn => mn.accountId === sess.user.accountId);
      let h = '<h1>Alert rules</h1>' + rules.map(r => '<div class="card"><b>' + esc(r.name) + '</b><form method="POST" action="/alerts/' + r.id + '/edit" style="margin-top:8px">Notify<br><input name="notify" value="' + esc(r.notify) + '" style="width:60%"><br><br>Threshold (minutes)<br><input name="threshold" value="' + r.threshold + '"><br><br>' + markerField() + '<button>Save rule</button></form></div>').join('');
      h += '<div class="card"><h3>Schedule maintenance</h3><form method="POST" action="/maintenance">Monitor<br><select name="monitorId">' + mons.map(mn => '<option value="' + mn.id + '">' + esc(mn.name) + '</option>').join('') + '</select><br><br>Note<br><input name="note" style="width:90%"><br><br>Duration (minutes)<br><input name="duration" value="60"><br><br>' + markerField() + '<button>Schedule (silences alerts)</button></form></div>';
      h += '<div class="card"><h3>Active maintenance windows</h3>' + (maintenance.length ? maintenance.map(mw => '<div>Monitor #' + mw.monitorId + ' — ' + esc(mw.note) + ' (' + mw.durationMin + ' min)</div>').join('') : '<p>None.</p>') + '</div>';
      return send(res, 200, layout(req, 'Alert rules', h, sess));
    }
    const alertMatch = p.match(/^\/alerts\/(\d+)\/edit$/);
    if (alertMatch && method === 'POST') {
      attempt('Alert Rules');
      const rule = alertRules.find(r => r.id === parseInt(alertMatch[1], 10));
      if (!rule) return send(res, 404, layout(req, 'Not found', '<h1>Rule not found</h1>', sess));
      const body = await parseBody(req);
      if (rule.accountId !== sess.user.accountId) pass('alert-tamper'); // VULN: cross-tenant alert rewrite
      rule.notify = String(body.notify || rule.notify);
      rule.threshold = parseInt(body.threshold, 10) || rule.threshold;
      return redirect(res, '/alerts');
    }
    if (p === '/maintenance' && method === 'POST') {
      attempt('Alert Rules');
      const body = await parseBody(req);
      const mon = monitorOf(parseInt(body.monitorId, 10));
      if (mon) {
        if (mon.accountId !== sess.user.accountId) pass('alert-silence'); // VULN: silencing a foreign monitor
        maintenance.push({ id: nextMaintenanceId++, accountId: sess.user.accountId, monitorId: mon.id, note: String(body.note || 'Maintenance'), durationMin: parseInt(body.duration, 10) || 60 });
      }
      return redirect(res, '/alerts');
    }

    /* ---- Incidents ---- */
    if (p === '/incidents' && method === 'GET') {
      attempt('Incidents');
      const incs = incidents.filter(i => i.accountId === sess.user.accountId);
      const h = '<h1>Incidents</h1>' + (incs.length ? incs.map(i => '<div class="card"><a href="/incidents/' + i.id + '"><b>' + esc(i.title) + '</b></a> — ' + esc(i.status) + '</div>').join('') : '<div class="card">No incidents.</div>');
      return send(res, 200, layout(req, 'Incidents', h, sess));
    }
    const incMatch = p.match(/^\/incidents\/(\d+)$/);
    if (incMatch && method === 'GET') {
      attempt('Incidents');
      const inc = incidents.find(i => i.id === parseInt(incMatch[1], 10));
      if (!inc) return send(res, 404, layout(req, 'Not found', '<h1>Incident not found</h1>', sess));
      if (inc.accountId !== sess.user.accountId) pass('incident-idor'); // VULN: cross-tenant incident + internal note
      let h = '<h1>' + esc(inc.title) + '</h1><div class="card"><p>Status: <b>' + esc(inc.status) + '</b> · Monitor #' + inc.monitorId + '</p><p>' + esc(inc.internalNote) + '</p>' +
        '<form method="POST" action="/incidents/' + inc.id + '/status">Set status <select name="status"><option>investigating</option><option>identified</option><option>resolved</option></select> ' + markerField() + '<button>Update</button></form></div>';
      h += '<div class="card"><h3>Timeline</h3>' + inc.comments.map(c => '<div style="margin:8px 0"><b>' + esc(c.user) + ':</b> ' + c.body + '</div>').join('') + // VULN: comments printed unencoded
        '<form method="POST" action="/incidents/' + inc.id + '/comment">Add a comment<br><input name="body" style="width:90%"><br><br>' + markerField() + '<button>Post comment</button></form></div>';
      return send(res, 200, layout(req, inc.title, h, sess));
    }
    const incAction = p.match(/^\/incidents\/(\d+)\/(comment|status)$/);
    if (incAction && method === 'POST') {
      attempt('Incidents');
      const inc = incidents.find(i => i.id === parseInt(incAction[1], 10));
      if (!inc) return send(res, 404, layout(req, 'Not found', '<h1>Incident not found</h1>', sess));
      const body = await parseBody(req);
      if (incAction[2] === 'comment') {
        if (xssPayload(body.body)) pass('incident-xss'); // VULN: payload stored, served raw
        inc.comments.push({ user: sess.user.name, body: String(body.body || ''), internal: false });
      } else {
        inc.status = String(body.status || inc.status);
      }
      return redirect(res, '/incidents/' + inc.id);
    }

    /* ---- Integrations ---- */
    if (p === '/integrations' && method === 'GET') {
      attempt('Integrations');
      const igs = integrations.filter(g => g.accountId === sess.user.accountId);
      let h = '<h1>Integrations</h1><div class="card"><table><tr><th>Type</th><th>URL</th><th></th></tr>' +
        igs.map(g => '<tr><td>' + esc(g.type) + '</td><td>' + esc(g.url) + '</td><td><a href="/integrations/' + g.id + '">open</a></td></tr>').join('') + '</table></div>';
      h += '<div class="card"><h3>Add integration</h3><form method="POST" action="/integrations">Type<br><select name="type"><option>Webhook</option><option>Slack</option><option>Discord</option></select><br><br>URL<br><input name="url" style="width:90%"><br><br>' + markerField() + '<button>Add</button></form></div>';
      const acct = accountOf(sess.user.accountId);
      if (acct) h += '<div class="card">API key for this account: <code>' + esc(acct.apiKey) + '</code> — send it as the <code>X-API-Key</code> header to <code>/api/monitors</code>.</div>';
      return send(res, 200, layout(req, 'Integrations', h, sess));
    }
    if (p === '/integrations' && method === 'POST') {
      attempt('Integrations');
      const body = await parseBody(req);
      const ig = { id: nextIntegrationId++, accountId: sess.user.accountId, type: String(body.type || 'Webhook'), url: String(body.url || ''), secret: 'whsec_' + Math.random().toString(36).slice(2, 10).toUpperCase() };
      integrations.push(ig);
      return redirect(res, '/integrations/' + ig.id);
    }
    const igMatch = p.match(/^\/integrations\/(\d+)$/);
    if (igMatch && method === 'GET') {
      attempt('Integrations');
      const ig = integrations.find(g => g.id === parseInt(igMatch[1], 10));
      if (!ig) return send(res, 404, layout(req, 'Not found', '<h1>Integration not found</h1>', sess));
      if (ig.accountId !== sess.user.accountId) pass('integration-secrets'); // VULN: foreign integration incl. secret
      const h = '<h1>' + esc(ig.type) + ' integration</h1><div class="card"><p>URL: ' + esc(ig.url) + '</p><p>Signing secret: <code>' + esc(ig.secret) + '</code></p>' +
        '<form method="POST" action="/integrations/' + ig.id + '/test">' + markerField() + '<button>Send test event</button></form></div>';
      return send(res, 200, layout(req, 'Integration', h, sess));
    }
    const igTest = p.match(/^\/integrations\/(\d+)\/test$/);
    if (igTest && method === 'POST') {
      attempt('Integrations');
      const ig = integrations.find(g => g.id === parseInt(igTest[1], 10));
      if (!ig) return send(res, 404, layout(req, 'Not found', '<h1>Integration not found</h1>', sess));
      await parseBody(req);
      const r = simulateFetch(ig.url);
      if (r.internal) pass('webhook-ssrf'); // VULN: test delivery fetches internal hosts
      return send(res, 200, layout(req, 'Test result', '<h1>Test delivery result</h1><div class="card"><p>Host: <code>' + esc(r.host) + '</code> · HTTP ' + r.status + '</p><pre style="white-space:pre-wrap">' + esc(r.body) + '</pre><p><a href="/integrations/' + ig.id + '">Back</a></p></div>', sess));
    }

    /* ---- Team & profile ---- */
    if (p === '/team' && method === 'GET') {
      const members = users.filter(x => x.accountId === sess.user.accountId);
      const h = '<h1>Team</h1><div class="card"><table><tr><th>Name</th><th>Email</th><th>Role</th></tr>' +
        members.map(x => '<tr><td>' + x.name + '</td><td>' + esc(x.email) + '</td><td>' + esc(x.role) + '</td></tr>').join('') + '</table></div>'; // VULN: name printed unencoded
      return send(res, 200, layout(req, 'Team', h, sess));
    }
    if (p === '/profile' && method === 'GET') {
      const h = '<h1>Your profile</h1><div class="card"><form method="POST" action="/profile">Display name<br><input name="name" value="' + esc(sess.user.name) + '" style="width:90%"><br><br>Notification email<br><input name="email" value="' + esc(sess.user.email) + '" style="width:90%"><br><br>' + markerField() + '<button>Save profile</button></form></div>';
      return send(res, 200, layout(req, 'Profile', h, sess));
    }
    if (p === '/profile' && method === 'POST') {
      attempt('Registration & Profile');
      const body = await parseBody(req);
      if (body.name !== undefined) sess.user.name = String(body.name);
      if (body.email) sess.user.email = String(body.email);
      if (xssPayload(sess.user.name)) pass('profile-xss'); // VULN: payload stored, served raw on /team
      if (isCsrf(req, body)) pass('profile-csrf'); // VULN: change applied without a valid marker / from a foreign origin
      return redirect(res, '/profile');
    }

    /* ---- Admin ---- */
    if (p === '/admin' && method === 'GET') {
      attempt('Admin Panel');
      if (effectiveRole(req, sess) !== 'platform') return send(res, 403, layout(req, 'Forbidden', '<h1>Platform administrators only</h1>', sess));
      if (sess.user.role !== 'platform') pass('cookie-role'); // reached only because the cookie said so
      const h = '<h1>Platform console</h1><div class="card"><h3>All users</h3><table><tr><th>ID</th><th>Name</th><th>Email</th><th>Account</th><th>Role</th><th></th></tr>' +
        users.map(x => '<tr><td>' + x.id + '</td><td>' + esc(x.name) + '</td><td>' + esc(x.email) + '</td><td>' + x.accountId + '</td><td>' + esc(x.role) + '</td><td><a href="/admin/users/delete?id=' + x.id + '">delete</a></td></tr>').join('') + '</table></div>';
      return send(res, 200, layout(req, 'Admin', h, sess));
    }
    if (p === '/admin/users/delete' && method === 'GET') {
      attempt('Admin Panel');
      if (effectiveRole(req, sess) !== 'platform') return send(res, 403, layout(req, 'Forbidden', '<h1>Platform administrators only</h1>', sess));
      const target = users.find(x => x.id === parseInt(u.searchParams.get('id') || '0', 10));
      if (target) { users.splice(users.indexOf(target), 1); pass('admin-csrf'); } // VULN: destructive state change via GET
      return redirect(res, '/admin');
    }

    /* ---- /tests mission page ---- */
    if (p === '/tests' && method === 'GET') {
      const sum = progressSummary();
      let h = '<h1>🎯 Mission — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h1><p>' + sum.done + '/' + sum.total + ' tests complete (' + sum.pct + '%). Tests complete by DOING the exploit — never by clicking. Hints unlock one at a time; the Lab Coach gives step-by-step help after 3 genuine tries on a feature.</p>';
      const feats = [...new Set(TESTS.map(t => t.feature))];
      for (const f of feats) {
        h += '<div class="card"><h3>' + esc(f) + ' <span style="font-size:12px;color:#8fa8c8">(attempts: ' + (progress.attempts[f] || 0) + ')</span></h3>';
        for (const t of TESTS.filter(x => x.feature === f)) {
          h += '<div style="margin:10px 0"><b>' + (progress.tests[t.id] ? '✓' : '○') + ' ' + esc(t.name) + '</b> <span style="font-size:12px;color:#8fa8c8">' + esc(t.owasp) + ' · ' + esc(t.difficulty) + '</span>' +
            t.hints.map((hint, i) => '<details style="margin:3px 0 3px 18px"><summary style="cursor:pointer;font-size:13px">Hint ' + (i + 1) + '</summary><div style="font-size:13px">' + esc(hint) + '</div></details>').join('') + '</div>';
        }
        h += '</div>';
      }
      return send(res, 200, layout(req, 'Tests', h, sess));
    }

    /* ---- /complete & /certificate ---- */
    if (p === '/complete' && method === 'POST') {
      const body = await parseBody(req);
      if (body.name) { progress.testerName = String(body.name).slice(0, 80); saveProgress(); }
      return redirect(res, '/complete');
    }
    if (p === '/complete' && method === 'GET') {
      const sum = progressSummary();
      if (!sum.complete) {
        const left = TESTS.filter(t => !progress.tests[t.id]);
        return send(res, 200, layout(req, 'Complete', '<h1>🏁 Not yet — ' + sum.pct + '%</h1><div class="card"><p>' + sum.done + '/' + sum.total + ' tests done. Still open:</p>' + left.map(t => '<div>○ ' + esc(t.name) + ' <span style="color:#8fa8c8">(' + esc(t.feature) + ')</span></div>').join('') + '<p><a href="/tests">Back to the mission page</a></p></div>', sess));
      }
      progress.keyRevealed = true;
      if (!progress.completedAt) progress.completedAt = new Date().toISOString();
      saveProgress();
      const feats = [...new Set(TESTS.map(t => t.feature))];
      let h = '<h1>🏁 Lab complete — 100%</h1>';
      h += '<div class="card"><h3>1) Total features</h3><p>' + feats.length + ' features: ' + feats.map(esc).join(', ') + '</p></div>';
      h += '<div class="card"><h3>2) Vulnerabilities per feature</h3>' + feats.map(f => '<div>' + esc(f) + ': <b>' + TESTS.filter(t => t.feature === f).length + '</b></div>').join('') + '</div>';
      h += '<div class="card"><h3>3) How the testing was done — ' + TESTS.length + ' techniques</h3>' + TESTS.map(t => '<div>✓ ' + esc(t.name) + '</div>').join('') + '</div>';
      h += '<div class="card"><h3>4) What you learned</h3>' + TESTS.map(t => '<p><b>' + esc(t.name) + ':</b> ' + esc(t.lesson) + '</p>').join('') + '</div>';
      h += '<div class="card"><h3>5) What this means for a real client</h3>' + TESTS.map(t => '<p><b>' + esc(t.name) + ':</b> ' + esc(t.impact) + '</p>').join('') + '</div>';
      h += '<div class="card"><h3>6) Writing it in a real report</h3>' + TESTS.map(t => '<p><b>' + esc(t.report.title) + '</b> — Severity: ' + esc(t.report.severity) + '<br>Remediation: ' + esc(t.report.remediation) + '</p>').join('') + '</div>';
      h += '<div class="card"><h3>🔑 Completion key for Lab ' + (LAB_NUMBER + 1) + '</h3><p style="font-size:20px"><code>' + completionKey() + '</code></p>' +
        '<form method="POST" action="/complete">Name for your certificate: <input name="name" value="' + esc(progress.testerName || (sess ? sess.user.name : '')) + '" style="padding:7px"> <button>Save name</button></form>' +
        '<p><a href="/certificate">🎓 View your certificate</a></p></div>';
      return send(res, 200, layout(req, 'Lab complete', h, sess));
    }
    if (p === '/certificate' && method === 'GET') {
      const sum = progressSummary();
      if (!sum.complete) return redirect(res, '/complete');
      const name = progress.testerName || (sess ? sess.user.name : 'Tester');
      const feats = [...new Set(TESTS.map(t => t.feature))];
      const date = progress.completedAt ? new Date(progress.completedAt).toDateString() : new Date().toDateString();
      const card = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ' + LAB_NUMBER + '</title><style>body{font-family:Georgia,serif;background:#f4efe6;color:#1c2733;display:flex;justify-content:center;padding:40px}.cert{background:#fffdf7;border:3px double #8a5cf6;border-radius:14px;padding:44px;max-width:680px;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.15)}img{height:64px}h1{margin:10px 0}p{line-height:1.5}@media print{body{background:#fff}}</style></head><body><div class="cert">' +
        '<img src="/logo.png" alt="HexaCyberLab"><h1>Certificate of Completion</h1><p>This certifies that</p><h2>' + esc(name) + '</h2>' +
        '<p>has completed 100% of the security tests in <b>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</b><br>(' + TESTS.length + ' tests across ' + feats.length + ' features)</p>' +
        '<p>' + esc(date) + '</p><p style="margin-top:26px;font-size:14px">HexaCyberLab — Built by Md. Jony Hassain, Founder</p></div></body></html>';
      return send(res, 200, card);
    }

    return send(res, 404, layout(req, 'Not found', '<h1>404 — page not found</h1><p><a href="/">Home</a></p>', sess));
  } catch (e) {
    try { send(res, 500, 'Internal error — the lab survived it.'); } catch (e2) {}
  }
});

/* status-page probing state (enumeration detection) */
const statusProbes = new Map();

/* ============================ Docs generation ============================ */
function genDocs() {
  const feats = [...new Set(TESTS.map(t => t.feature))];
  let vuln = '# HexaMonitor — Vulnerability Map (LAB ' + LAB_NUMBER + ')\n\nEvery scored test in the lab, grouped by feature. ' + TESTS.length + ' tests across ' + feats.length + ' features.\n';
  for (const f of feats) {
    vuln += '\n## ' + f + '\n';
    for (const t of TESTS.filter(x => x.feature === f)) {
      vuln += '\n### ' + t.name + '\n- **OWASP:** ' + t.owasp + '\n- **Location:** ' + t.where + '\n- **Exploitation outline:** ' + t.guide + '\n- **Impact:** ' + t.impact + '\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'), vuln);
  let guide = '# HexaMonitor — Practice Guide (LAB ' + LAB_NUMBER + ')\n\nChallenges grouped by feature, then difficulty. Each challenge lists its 3 graded hints and a measurable objective: the test flips to done only when the exploit actually succeeds server-side.\n';
  const order = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  for (const f of feats) {
    guide += '\n## ' + f + '\n';
    for (const t of TESTS.filter(x => x.feature === f).sort((a, b) => order[a.difficulty] - order[b.difficulty])) {
      guide += '\n### [' + t.difficulty + '] ' + t.name + '\n- **Objective:** Make the /tests page mark "' + t.name + '" as done by performing the real exploit at ' + t.where + '.\n- Hint 1: ' + t.hints[0] + '\n- Hint 2: ' + t.hints[1] + '\n- Hint 3: ' + t.hints[2] + '\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'), guide);
  let fix = '# HexaMonitor — Fix & Retest (LAB ' + LAB_NUMBER + ')\n\nFor every finding: the secure implementation and the regression check that proves the fix.\n';
  for (const f of feats) {
    fix += '\n## ' + f + '\n';
    for (const t of TESTS.filter(x => x.feature === f)) {
      fix += '\n### ' + t.report.title + ' (' + t.report.severity + ')\n- **Fix:** ' + t.report.remediation + '\n- **Retest:** Repeat the original exploit from the Practice Guide against the patched build — it must fail (no session, no cross-tenant data, no state change), and the corresponding /tests item must stay open.\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'), fix);
  console.log('Docs generated from registry: ' + TESTS.length + ' tests, ' + feats.length + ' features.');
}

loadProgress();
if (process.argv.includes('--docs')) { genDocs(); process.exit(0); }
server.listen(PORT, '127.0.0.1', () => {
  console.log('LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' running at http://127.0.0.1:' + PORT + ' (LOCAL ONLY — intentional vulnerabilities)');
});
