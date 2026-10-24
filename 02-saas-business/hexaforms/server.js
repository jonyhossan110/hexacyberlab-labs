'use strict';
/*
 * HexaForms — INTENTIONALLY VULNERABLE form-builder SaaS practice lab.
 * Zero-dependency Node.js (built-ins only). Local use ONLY. Binds 127.0.0.1:3029.
 * All data is synthetic and lives in memory — restart the server to reset the app
 * (lab progress persists separately in progress.json).
 * DO NOT deploy this anywhere. See VULNERABILITIES.md for the planted flaws.
 */
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

const HOST = '127.0.0.1';
const PORT = 3029;

/* ================= LAB SYSTEM (LAB 20 — HexaForms) ================= */
const LAB_NUMBER = 20;
const LAB_NAME = 'HexaForms';
const PROGRESS_PATH = path.join(__dirname, 'progress.json');
const LOGO_PATH = path.join(__dirname, 'logo.png');
const ASSETS_DIR = path.join(__dirname, 'assets');

/* Key material is never stored whole — only encoded shards, scattered (§7).
   Assembler: base64-decode each shard, reverse it, join. */
const _kA = ['MkwtWEg=', 'VFFDLTA='];
const _cA = ['MkwtWEg=', 'N0RPLTE='];
const _unshard = (arr) => arr.map((s) => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');

/* ---------------- In-memory data (reset = restart) ---------------- */
let seq = { user: 100, workspace: 100, form: 100, submission: 100, attachment: 100 };
const nextId = (k) => ++seq[k];

/* plan: 'free' | 'pro'. The demo account ships with the product's documented
   default credentials — a planted weak/default-credential flaw. */
const users = [
  { id: 1, name: 'Lab Admin',       email: 'admin@hexaforms.local',   password: 'Admin@123', role: 'admin', plan: 'pro'  },
  { id: 2, name: 'Nabila Rahman',   email: 'nabila@hexaforms.local',  password: 'Owner@123', role: 'user',  plan: 'free' },
  { id: 3, name: 'Rafi Chowdhury',  email: 'rafi@hexaforms.local',    password: 'Owner@123', role: 'user',  plan: 'free' },
  { id: 4, name: 'Tanvir Ahmed',    email: 'tanvir@hexaforms.local',  password: 'Member@123', role: 'user', plan: 'free' },
  { id: 5, name: 'Demo User',       email: 'demo@hexaforms.local',    password: 'demo123',   role: 'user',  plan: 'free' },
];
seq.user = 5;

const workspaces = [
  { id: 1, name: 'Nabila Studio',  ownerId: 2, memberIds: [2, 4] },
  { id: 2, name: 'Rafi Ventures',  ownerId: 3, memberIds: [3] },
];
seq.workspace = 2;

const templates = [
  { id: 1, name: 'Contact Form',          fields: ['Message'] },
  { id: 2, name: 'Job Application',       fields: ['Cover note'] },
  { id: 3, name: 'Event Registration',    fields: ['Notes'] },
  { id: 4, name: 'Customer Feedback',     fields: ['Rating (1-5)', 'Comment'] },
];

const forms = [
  { id: 1, workspaceId: 1, title: 'Customer Feedback Survey',    slug: 'feedback-survey',        access: 'public',  status: 'published', fields: ['Rating (1-5)', 'Comment'] },
  { id: 2, workspaceId: 2, title: 'Job Application — Designer', slug: 'designer-job-application', access: 'public',  status: 'published', fields: ['Cover note'] },
  { id: 3, workspaceId: 1, title: 'Internal HR Salary Review',  slug: 'hr-salary-review',       access: 'private', status: 'published', fields: ['Review note'] },
  { id: 4, workspaceId: 2, title: 'Wholesale Partner Intake',   slug: 'wholesale-intake',       access: 'public',  status: 'draft',     fields: ['Company details'] },
];
seq.form = 4;

const submissions = [
  { id: 1, formId: 1, name: 'Maya Chen',    email: 'maya@example.com',  answers: { 'Rating (1-5)': '5', 'Comment': 'Love the new dashboard, very fast.' }, attachmentId: null, at: '2026-10-20T09:14:00Z' },
  { id: 2, formId: 1, name: 'Omar Farouk',  email: 'omar@example.com',  answers: { 'Rating (1-5)': '3', 'Comment': 'Checkout was slow on mobile.' },        attachmentId: null, at: '2026-10-21T15:02:00Z' },
  { id: 3, formId: 2, name: 'Lena Fischer', email: 'lena@example.com',  answers: { 'Cover note': 'Portfolio at lena.design — six years of product design.' }, attachmentId: 1,    at: '2026-10-22T08:40:00Z' },
  { id: 4, formId: 3, name: 'HR — Nabila Rahman', email: 'nabila@hexaforms.local', answers: { 'Review note': 'CONFIDENTIAL — current band L5, proposed raise 12%, effective January.' }, attachmentId: null, at: '2026-10-22T11:30:00Z' },
  { id: 5, formId: 3, name: 'HR — Tanvir Ahmed',  email: 'tanvir@hexaforms.local', answers: { 'Review note': 'CONFIDENTIAL — current band L3, proposed raise 8%, probation complete.' }, attachmentId: null, at: '2026-10-22T11:45:00Z' },
];
seq.submission = 5;

const attachments = [
  { id: 1, submissionId: 3, filename: 'cv-lena.pdf', content: 'LENA FISCHER — CV\nProduct Designer, 6 years.\nPortfolio: lena.design\n(Synthetic attachment stored by HexaForms.)' },
];
seq.attachment = 1;

const sessions = new Map(); // sid -> { userId, csrfTok }

const derivedToken = (u) => 'hf_' + Buffer.from(u.email, 'utf8').toString('base64').replace(/=+$/, '');
const resetTokenFor = (email) => crypto.createHash('md5').update(String(email)).digest('hex').slice(0, 8);

/* ================= TESTS REGISTRY ================= */
const F = {
  AUTH: 'Login & Authentication',
  ACCT: 'Accounts & Profile',
  FORMS: 'Forms & Templates',
  SUBS: 'Submissions & Responses',
  FILES: 'Files & Uploads',
  ADMIN: 'Admin Panel',
  API: 'Platform & API',
};
const TESTS = [
  { id: 'sqli-login', feature: F.AUTH, name: 'SQL injection login bypass', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['The login form has a legacy lookup path that glues your input into a query string.', "Try a classic tautology in the email field — something that makes the condition always true.", "Email: ' OR '1'='1 — any password. You land in the first account the query returns: the admin."],
    lesson: 'String-built queries turn user input into query logic; a login is only as strong as its parameter binding.',
    impact: "On a client's site this is full account takeover — often straight into the admin account — with no password and no trace beyond a strange login line.",
    report: { title: 'SQL Injection in Authentication (Login Bypass)', severity: 'Critical', remediation: 'Use parameterised queries everywhere; never concatenate input into SQL.' },
    guide: "POST /login with email ' OR '1'='1 and any password. The legacy lookup treats your input as query text, the condition matches every row, and the app starts a session as the first user — the admin." },
  { id: 'brute-force', feature: F.AUTH, name: 'Brute force — no rate limiting or lockout', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['How many wrong passwords can you try for one account in a minute?', 'Nothing slows you down — no counter, no lockout, no CAPTCHA. Script it.', 'Send 10+ failed logins for nabila@hexaforms.local; the 10th is still processed like the 1st. That absence of throttling is the flaw.'],
    lesson: 'Authentication endpoints without throttling let attackers try unlimited passwords against known accounts.',
    impact: 'Attackers can grind through password lists against real customer accounts at full speed; weak passwords fall first, then account data and stored value follow.',
    report: { title: 'Missing Rate Limiting on Login (Brute Force)', severity: 'High', remediation: 'Throttle per account and per IP, add progressive delays/lockout and alerting.' },
    guide: 'POST /login 10 times with a wrong password for the same account. Every attempt is accepted for processing — there is no rate limit, lockout or delay. The test passes when the 10th failure is still processed.' },
  { id: 'user-enumeration', feature: F.AUTH, name: 'User enumeration via differing responses', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the login error for an email that exists with one that does not.', 'The forgot-password flow answers differently too — one reveals a reset link, the other only a generic note.', 'Probe /login once with nabila@hexaforms.local (wrong password) and once with an invented email; the two different messages confirm which accounts exist.'],
    lesson: 'Different responses for "no such user" vs "wrong password" hand attackers a free list of valid accounts.',
    impact: 'Attackers harvest the valid customer email list, then aim phishing and password attacks only at accounts that definitely exist — far higher success for them.',
    report: { title: 'Account Enumeration via Authentication Responses', severity: 'Medium', remediation: 'Return one generic message for all failed logins and reset requests.' },
    guide: 'POST /login with a registered email + wrong password, then with an unregistered email. The messages differ ("Wrong password" vs "No account with that email"), so valid accounts can be enumerated. The test passes once both kinds of response have been observed.' },
  { id: 'default-creds', feature: F.AUTH, name: 'Weak / default credentials (demo account)', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['SaaS products love shipping a demo account. Has anyone changed its password since install day?', 'The install guide for products like this usually documents the demo login. The password is the product-demo classic.', 'Log in as demo@hexaforms.local with password demo123 — the seeded demo account was never rotated.'],
    lesson: 'Seeded demo and default accounts are production accounts to an attacker — they must be disabled or forced to rotate on first use.',
    impact: 'Anyone can walk into the shipped demo account and use the product as a paying customer — abusing quotas, sending mail as the business, and pivoting into shared data.',
    report: { title: 'Default Credentials on Seeded Demo Account', severity: 'High', remediation: 'Remove seeded demo accounts from production, or force a unique password at first login.' },
    guide: 'POST /login with demo@hexaforms.local / demo123. The demo account seeded at install time still uses its documented default password.' },
  { id: 'predictable-reset', feature: F.AUTH, name: 'Predictable password-reset token', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    hints: ['The lab shows you a reset link after /forgot — study how its token is built.', 'The token depends only on something public about the account. Compute it offline.', 'token = first 8 hex characters of md5(email). Compute it for admin@hexaforms.local and open /reset with it.'],
    lesson: 'A reset token derived from public data is not a secret — it is a password-change form anyone can drive.',
    impact: "Anyone who knows a customer's (or the admin's) email can reset their password and own the account — support-desk and takeover risk in one step.",
    report: { title: 'Predictable Password Reset Token', severity: 'Critical', remediation: 'Use crypto.randomBytes tokens, hashed at rest, single-use, expiring in ~15 minutes.' },
    guide: 'Compute md5(victim email), take the first 8 hex chars, then GET /reset?email=<email>&token=<computed> and POST a new password. Works for any account, including admin.' },
  { id: 'cookie-role-tamper', feature: F.AUTH, name: 'Session/cookie tampering — client role cookie trusted', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After login, look at ALL the cookies the app sets — one of them is not like the others.', 'One cookie simply states your role, in plain text, and the admin gate believes it.', "Set a cookie role=admin for this site (browser DevTools or curl -b) and open /admin — no admin account needed."],
    lesson: 'Authorization data must live server-side; anything the client can edit will be edited.',
    impact: 'One forged cookie opens the whole admin panel — every customer account, every form, every plan change — with no credentials at all.',
    report: { title: 'Client-Controlled Role Cookie Grants Admin Access', severity: 'Critical', remediation: 'Read roles from the server-side session/user record only; ignore client-supplied role data.' },
    guide: 'Set a cookie role=admin for the site (DevTools or curl -b) and GET /admin. The gate trusts the cookie, not a server-side session, and serves the full admin panel.' },

  { id: 'weak-password-policy', feature: F.ACCT, name: 'Weak password policy on registration', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['What is the shortest password the registration form will accept?', 'There is no policy at all — try one character.', 'Register a new account with the password "a". It is accepted.'],
    lesson: 'Accounts are only as strong as the weakest password the policy allows.',
    impact: 'Customers choose trivial passwords that fall to the first guessing wave; the business carries the breach headlines for accounts it could have protected with one check.',
    report: { title: 'No Password Policy on Registration', severity: 'Medium', remediation: 'Enforce a minimum length (12+) and screen against breached-password lists.' },
    guide: 'POST /register with a 1-character password. The account is created — no length or complexity policy exists.' },
  { id: 'profile-mass-assignment', feature: F.ACCT, name: 'Mass assignment — plan & role via profile update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The profile form shows name and email. What else does the update handler accept?', 'The handler binds the whole request body onto your user record — including fields the form never shows.', 'POST /profile with your normal fields PLUS plan=pro and role=admin. Both stick.'],
    lesson: 'Binding a request body directly onto a record lets callers write fields that were never offered to them.',
    impact: 'Free users upgrade themselves to paid plans and even to admin — direct revenue loss plus a privilege-escalation path that auditors rarely spot in UI testing.',
    report: { title: 'Mass Assignment in Profile Update (Plan/Role)', severity: 'Critical', remediation: 'Allowlist bindable fields per endpoint; never bind role/plan/billing fields from profile forms.' },
    guide: 'POST /profile while logged in, adding plan=pro and role=admin to the normal form fields. The handler applies every field it recognises on the user object, so you become a Pro admin.' },
  { id: 'stored-xss-profile', feature: F.ACCT, name: 'Stored XSS in display name', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Your display name is shown back in a "profile preview" card — and in the admin user list.', 'One of those places prints the name exactly as stored, with no escaping.', 'Register or update your profile with the name <script>alert(1)</script> (or an <svg onload> payload), then view your profile preview.'],
    lesson: 'Any field rendered without output encoding is a stored-XSS carrier — names are attacker-controlled too.',
    impact: "A poisoned name fires in the admin's browser when they open the user list — session theft and actions performed as the admin follow.",
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Escape all user-controlled output by default; add a Content-Security-Policy as defence in depth.' },
    guide: 'Set your display name (register or /profile) to a script payload. The profile preview card and the admin user list render it raw, so the payload is stored and delivered to viewers.' },
  { id: 'profile-csrf', feature: F.ACCT, name: 'CSRF on profile update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The profile form carries a hidden hx_tok field. Is it ever checked?', 'A state-changing POST from another site carries your cookies but not that token.', 'POST /profile with your session cookie but NO hx_tok field (or a foreign Origin header) — the change applies anyway.'],
    lesson: 'A token that is issued but never verified is decoration, not CSRF protection.',
    impact: "A malicious page can silently rewrite a victim's profile — change their email and the account-recovery path points at the attacker.",
    report: { title: 'Cross-Site Request Forgery on Profile Update', severity: 'High', remediation: 'Verify a per-session anti-CSRF token (or SameSite=Lax cookies plus Origin checks) on every state change.' },
    guide: 'While logged in, POST /profile with new values and no hx_tok field (a cross-site auto-form does exactly this). The update applies — the token is never verified.' },

  { id: 'form-settings-idor', feature: F.FORMS, name: 'IDOR — view another workspace\'s form settings', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Form settings pages live at /forms/<id>. Ids are small sequential numbers.', 'The page checks that you are logged in — but never which workspace the form belongs to.', "Log in as Rafi (owner of workspace 2) and open /forms/1 — Nabila's form settings, access mode and public slug are all served."],
    lesson: 'Checking "is someone logged in" is not authorization; every object access needs an ownership/tenant check.',
    impact: "Competitors and curious users can read every customer's form configuration — including the slugs of private forms, which is the first step to reaching the responses behind them.",
    report: { title: 'Insecure Direct Object Reference on Form Settings', severity: 'High', remediation: 'Authorize every object access against the session user\'s workspace membership.' },
    guide: 'Log in as any user from another workspace and GET /forms/1. The settings page renders for a form you do not own or belong to.' },
  { id: 'access-mass-assignment', feature: F.FORMS, name: 'Access-setting tampering — private form flipped public', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    hints: ['The settings page shows the access mode as read-only text: changing it is supposed to need an approved plan workflow.', 'But the settings POST handler applies more fields than the form displays.', "As the owner of the private HR form, POST /forms/3/settings with the normal fields PLUS access=public. The private form is now world-readable."],
    lesson: 'Fields hidden in the UI are not hidden from the API — every writable property must be authorized per field.',
    impact: 'A private HR or salary-review form — the most sensitive data in the product — becomes publicly readable because one extra form field was honoured.',
    report: { title: 'Mass Assignment of Form Access Setting (Private → Public)', severity: 'Critical', remediation: 'Allowlist settings fields; route access changes through the approval workflow server-side.' },
    guide: 'As Nabila, POST /forms/3/settings including access=public alongside the normal title/status fields. The handler binds it, and the private form\'s access flips to public.' },
  { id: 'slug-enumeration', feature: F.FORMS, name: 'Form slug / ID enumeration', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Public form links look like /f/<slug>, and form ids are sequential. What happens if you probe many of them?', 'The app happily answers every probe — found, private, draft, or not there at all — with no rate limit.', 'Probe at least 5 different /f/<slug> values (real or invented). Each answer maps the tenant space a little more.'],
    lesson: 'Predictable identifiers plus unlimited probing let attackers map every tenant and target the interesting ones.',
    impact: 'Attackers enumerate all customers and their form slugs, then focus on private and high-value forms — reconnaissance the business never notices.',
    report: { title: 'Unrestricted Enumeration of Form Identifiers', severity: 'Medium', remediation: 'Use unguessable public slugs (random tokens), rate-limit public endpoints, and answer uniformly.' },
    guide: 'GET five or more distinct /f/<slug> URLs. The app answers each probe without throttling, letting you enumerate which forms exist, which are private and which are drafts.' },
  { id: 'private-form-submit', feature: F.FORMS, name: 'Submitting to a private form (access check missing on submit)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The private form\'s page refuses to show you the form. But is the page the only way in?', 'Rendering checks the access mode. The submit endpoint was written earlier — and forgotten.', 'POST directly to /f/hr-salary-review/submit with respondent fields. The response is stored in the private form.'],
    lesson: 'Authorization must be enforced on every endpoint that acts on an object — not only on the page that displays it.',
    impact: 'Attackers can flood a private internal form with forged responses — poisoned HR data, fake approvals, garbage in the records the business trusts.',
    report: { title: 'Missing Access Check on Form Submission Endpoint', severity: 'High', remediation: 'Enforce the form\'s access mode on the submission endpoint exactly as on the render path.' },
    guide: 'Without any login, POST respondent fields to /f/hr-salary-review/submit. The private form refuses to render for you, yet your submission is accepted and stored.' },

  { id: 'submission-idor', feature: F.SUBS, name: 'IDOR — read another workspace\'s submission', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['A single response lives at /submissions/<id> with a small sequential id.', 'The detail page checks login only — never the workspace of the form the response belongs to.', "Log in as Rafi and open /submissions/4 — a confidential HR salary-review response from Nabila's private form."],
    lesson: 'Every object read needs a tenant check; response data is usually the most sensitive data a SaaS holds.',
    impact: 'Confidential responses — salary reviews, applications, personal data — leak across customers. For a form platform this is a reportable data breach per tenant.',
    report: { title: 'Insecure Direct Object Reference on Submission Detail', severity: 'Critical', remediation: 'Authorize submission reads against the parent form\'s workspace membership.' },
    guide: 'Log in as a user from another workspace and GET /submissions/4. The confidential response renders in full.' },
  { id: 'export-unauthorized', feature: F.SUBS, name: 'Unauthorised response export (CSV)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Every form has an export URL: /forms/<id>/export downloads all responses as CSV.', 'The export checks that you are logged in. It never checks whose form it is.', "Log in as Rafi and GET /forms/1/export — all of Nabila's customer feedback responses download as CSV."],
    lesson: 'Bulk-export endpoints are the highest-value IDOR targets: one request takes the whole dataset, not one record.',
    impact: 'One request exfiltrates an entire response set — names, emails, answers — the exact dataset GDPR-style breach notifications are made of.',
    report: { title: 'Broken Access Control on Response Export', severity: 'Critical', remediation: 'Require workspace membership (owner/member) for exports; audit-log every export.' },
    guide: 'Log in as any non-member and GET /forms/1/export. A CSV of every response is served without any ownership check.' },
  { id: 'stored-xss-submission', feature: F.SUBS, name: 'Stored XSS in a submission (fires in owner dashboard)', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Responses are shown to the form owner exactly as the respondent typed them.', 'The submission detail view prints the respondent name and answers with no escaping.', 'Submit to the public feedback form with a <script> or <svg onload> payload in your name or comment, then view that submission as the owner.'],
    lesson: 'Respondent-controlled content is untrusted input for the dashboard too — stored XSS aims UP the privilege ladder.',
    impact: "One crafted response executes in the form owner's browser — session theft, responses deleted, settings changed as the owner. The attacker never needed an account.",
    report: { title: 'Stored Cross-Site Scripting via Form Response', severity: 'High', remediation: 'Escape respondent content everywhere it renders; sanitize if rich text is ever allowed.' },
    guide: 'POST a submission to a public form with a script payload in the name or an answer. The payload is stored and rendered raw on the submission detail page the owner reads.' },
  { id: 'attachment-idor', feature: F.SUBS, name: 'IDOR — download another workspace\'s attachment', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Attachments are served at /attachments/<id> — small sequential ids again.', 'Like the submission page, the download checks login only.', "Log in as Nabila and GET /attachments/1 — the CV a candidate uploaded to Rafi's job-application form."],
    lesson: 'Files inherit the sensitivity of the record they hang off; their endpoints need the same tenant checks.',
    impact: 'CVs, ID scans, contracts — whatever respondents upload — downloadable across tenants by guessing a number.',
    report: { title: 'Insecure Direct Object Reference on Attachment Download', severity: 'High', remediation: 'Authorize attachment downloads via the parent submission\'s workspace.' },
    guide: 'Log in as a user from another workspace and GET /attachments/1. The file downloads without any membership check.' },

  { id: 'unrestricted-upload', feature: F.FILES, name: 'Unrestricted file upload — HTML served back', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['Submissions accept an attachment: a filename and its content. Which filenames are allowed?', 'All of them. And the file is later served with a content type guessed from its extension.', 'Submit a response with attachment filename page.html and HTML/JS content, then open /uploads/<submissionId>/page.html — it is served as text/html.'],
    lesson: 'Upload features must validate type by content, store outside the web root, and serve with safe content types.',
    impact: 'Attackers host phishing pages and scripts on the product\'s own trusted domain — the link victims receive really is the real service.',
    report: { title: 'Unrestricted File Upload with Active Content Serving', severity: 'High', remediation: 'Allowlist safe types, verify content, serve downloads as attachments with nosniff.' },
    guide: 'POST a submission to a public form with attachmentName=page.html and script content. Then GET /uploads/<newSubmissionId>/page.html — the file is served as text/html and the script runs in the site origin.' },
  { id: 'path-traversal', feature: F.FILES, name: 'Path traversal on asset download', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Form assets download from /files?name=<file>. The name is joined straight onto a folder path.', 'What happens when the name climbs out of the folder with ../ ?', 'GET /files?name=../server.js — the application source is served. ../progress.json works too.'],
    lesson: 'User-controlled file paths must be canonicalised and confined to an allowlisted directory.',
    impact: 'Source code, configuration and state files leak — and with them every secret the deployment holds, including the keys that protect other customers.',
    report: { title: 'Path Traversal in File Download', severity: 'Critical', remediation: 'Resolve the final path and verify it stays inside the asset directory; reject ".." outright.' },
    guide: 'GET /files?name=../server.js. The handler joins the name onto the assets folder without sanitising, so the traversal escapes and the server source is returned.' },

  { id: 'admin-csrf', feature: F.ADMIN, name: 'CSRF on admin user-role change', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    hints: ['Admins can change any user\'s role from the admin panel. The form carries hx_tok.', 'Like the profile token, it is issued but never verified on the server.', 'As admin, POST /admin/users/role with a userId and role — but no hx_tok (or a foreign Origin). The role changes anyway.'],
    lesson: 'Privileged actions need CSRF verification most of all — the blast radius of a forged admin request is total.',
    impact: "A page an admin merely visits can promote an attacker's account to admin — full platform takeover with the admin's own session doing the work.",
    report: { title: 'Cross-Site Request Forgery on Admin Role Management', severity: 'Critical', remediation: 'Verify anti-CSRF tokens on all admin actions; consider re-authentication for role changes.' },
    guide: 'While logged in as admin, POST /admin/users/role {userId, role=admin} without the hx_tok field. The change applies — a cross-site form could do the same.' },
  { id: 'admin-broken-access', feature: F.ADMIN, name: 'Broken access control — user export open to any account', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['There is an admin utility at /admin/export-users that downloads every account as CSV.', 'It sits under /admin — but does it actually check for the admin role?', 'Log in as ANY normal user (e.g. Rafi) and GET /admin/export-users. Names, emails, passwords and roles download.'],
    lesson: 'Putting a route under an /admin prefix is not access control; the role check must run on the route itself.',
    impact: 'The full account database — including plaintext passwords — is one URL away for every registered user. That is a complete platform compromise.',
    report: { title: 'Missing Role Check on Admin User Export', severity: 'Critical', remediation: 'Enforce the admin role on every admin route, server-side, with deny-by-default.' },
    guide: 'Log in as a non-admin user and GET /admin/export-users. The CSV of all users, passwords included, is served because only the login is checked.' },

  { id: 'weak-api-token', feature: F.API, name: 'Weak / predictable API token', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    hints: ['Your profile shows an API token for the /api/forms endpoint. Look at how it is built.', 'It is a simple encoding of something public — not a random secret at all.', "Compute token = 'hf_' + base64(email) for admin@hexaforms.local and call GET /api/forms with Authorization: Bearer <token> — no login session needed."],
    lesson: 'An API token must be a high-entropy secret; anything derived from public data is a password everyone knows.',
    impact: "Anyone who knows a customer's email — public information — holds their full API key: read every form and response count the integration can reach.",
    report: { title: 'Predictable API Token Derived from Email', severity: 'High', remediation: 'Generate tokens from crypto.randomBytes, store hashed, allow revocation and rotation.' },
    guide: 'Derive the admin token offline (hf_ + base64 of the email) and GET /api/forms with it as a Bearer token, with no session cookie. The API accepts it and returns the admin\'s forms.' },
  { id: 'api-users-exposure', feature: F.API, name: 'Sensitive data exposure — /api/users dumps all accounts', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['APIs often grow a convenience endpoint during development. What does /api/users do?', 'No token, no session, no check at all.', 'GET /api/users with no credentials — every account, passwords included, as JSON.'],
    lesson: 'Debug and convenience endpoints must be authenticated like everything else — or removed before launch.',
    impact: 'The entire user database with plaintext passwords is public to the internet — instant credential-stuffing material against every customer.',
    report: { title: 'Unauthenticated Sensitive Data Exposure at /api/users', severity: 'Critical', remediation: 'Require authenticated, authorized access; never return password fields in API responses.' },
    guide: 'GET /api/users with no session and no token. The endpoint returns every user record, including plaintext passwords.' },
];
const TEST_BY_ID = Object.fromEntries(TESTS.map((t) => [t.id, t]));
const FEATURES = [...new Set(TESTS.map((t) => t.feature))];

/* ================= PROGRESS STATE (persisted) ================= */
function freshState() { return { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false, flags: {} }; }
let state = freshState();
try {
  if (fs.existsSync(PROGRESS_PATH)) state = Object.assign(freshState(), JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8')));
} catch (e) { state = freshState(); }
function saveState() { try { fs.writeFileSync(PROGRESS_PATH, JSON.stringify(state, null, 2)); } catch (e) {} }
if (!fs.existsSync(PROGRESS_PATH)) saveState();

const loginFails = new Map(); // email -> consecutive failed logins (runtime only)
const slugProbes = new Map(); // ip -> Set of probed slugs (runtime only)
function pass(id) {
  if (!TEST_BY_ID[id] || state.tests[id]) return;
  state.tests[id] = true;
  if (TESTS.every((t) => state.tests[t.id])) {
    if (!state.completedAt) state.completedAt = new Date().toISOString();
    state.keyRevealed = true;
  }
  saveState();
}
function attempt(feature) {
  if (!feature) return;
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  saveState();
}
function progress() {
  const total = TESTS.length;
  const done = TESTS.filter((t) => state.tests[t.id]).length;
  const features = {};
  for (const f of FEATURES) {
    const ft = TESTS.filter((t) => t.feature === f);
    features[f] = { total: ft.length, done: ft.filter((t) => state.tests[t.id]).length, attempts: state.attempts[f] || 0 };
  }
  return { lab: LAB_NAME, number: LAB_NUMBER, total, done, pct: total ? Math.floor((done / total) * 100) : 0, features, complete: done === total };
}
const XSS_RE = /<script|<svg|<iframe|onerror\s*=|onload\s*=|onclick\s*=|javascript:/i;
const INJ_RE = /'\s*(or|and)\b|'\s*--|'\s*or\s*'|"\s*(or|and)\b/i;

/* ---------------- Helpers ---------------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function currentSession(req) {
  const sid = parseCookies(req).sid;
  return sid ? sessions.get(sid) : null;
}
function currentUser(req) {
  const s = currentSession(req);
  return s ? users.find((u) => u.id === s.userId) : null;
}
function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 2e6) req.destroy(); });
    req.on('end', () => resolve(querystring.parse(data)));
  });
}
function foreignOrigin(req) {
  const o = req.headers.origin || req.headers.referer || '';
  if (!o) return false;
  return !o.includes(`${HOST}:${PORT}`) && !o.includes(`localhost:${PORT}`);
}
const userOf = (id) => users.find((u) => u.id === Number(id));
const wsOf = (id) => workspaces.find((w) => w.id === Number(id));
const formOf = (id) => forms.find((f) => f.id === Number(id));
const subOf = (id) => submissions.find((s) => s.id === Number(id));
const attOf = (id) => attachments.find((a) => a.id === Number(id));
const inWorkspace = (user, wsId) => !!user && wsOf(wsId) && wsOf(wsId).memberIds.includes(user.id);
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'form';

function layout(req, title, body) {
  const u = currentUser(req);
  const nav = u
    ? `<span>Hi, ${esc(u.name)} (${esc(u.plan)})</span>
       <a href="/">Dashboard</a>
       <a href="/templates">Templates</a>
       ${u.role === 'admin' ? '<a href="/admin">Admin</a>' : ''}
       <a href="/profile">Profile</a>
       <a href="/logout">Logout</a>`
    : `<a href="/">Home</a> <a href="/templates">Templates</a> <a href="/login">Login</a> <a href="/register">Register</a>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)} — HexaForms</title>
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f4f5fb;color:#232338;margin:0}
  header{background:#4f46e5;color:#fff;padding:14px 24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
  header a{color:#dcd8ff;margin-left:12px;text-decoration:none} header a:hover{text-decoration:underline}
  .brand{font-size:24px;font-weight:bold} .brand a{color:#fff;margin:0}
  main{max-width:1020px;margin:24px auto;padding:0 16px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px}
  .card{background:#fff;border:1px solid #dcdcf0;border-radius:10px;padding:14px;box-shadow:0 1px 3px rgba(50,50,120,.08)}
  .card h3{margin:6px 0} .badge{display:inline-block;background:#e6e4ff;border-radius:10px;padding:1px 8px;font-size:12px;margin-right:4px}
  button,.btn{background:#4f46e5;color:#fff;border:0;border-radius:6px;padding:8px 14px;cursor:pointer;font-size:14px;text-decoration:none;display:inline-block}
  button:hover,.btn:hover{background:#3f37c9} .muted{color:#7a7a95;font-size:13px}
  input,select,textarea{width:100%;padding:8px;margin:4px 0 12px;border:1px solid #c5c5e0;border-radius:6px;box-sizing:border-box;font-family:inherit}
  table{width:100%;border-collapse:collapse;background:#fff} th,td{border:1px solid #dcdcf0;padding:8px;text-align:left;font-size:14px}
  th{background:#eceaff} .flash{background:#eefbe7;border:1px solid #9ed08a;padding:10px;border-radius:6px;margin-bottom:14px}
  .err{background:#fdecea;border:1px solid #e5a19c;padding:10px;border-radius:6px;margin-bottom:14px}
  footer{max-width:1020px;margin:30px auto;padding:0 16px;color:#7a7a95;font-size:12px}
  pre{background:#232338;color:#d8ffd8;padding:12px;border-radius:8px;overflow-x:auto;white-space:pre-wrap}
</style></head><body>
<div style="background:#1d1b4b;color:#e3e0ff;padding:8px 24px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
  <img src="/logo.png" alt="HexaCyberLab" style="height:30px;background:#fff;border-radius:6px;padding:2px">
  <b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b>
  <span>Progress: ${(() => { const P = progress(); return `${P.done}/${P.total} tests · ${P.pct}%`; })()}</span>
  <span style="flex:1;min-width:120px;background:#3730a3;border-radius:6px;height:12px;overflow:hidden"><span style="display:block;height:100%;width:${progress().pct}%;background:linear-gradient(90deg,#7b5cff,#00c2ff)"></span></span>
  <a href="/tests" style="color:#ffd9a0">Mission / Tests</a>
  ${progress().complete ? '<a href="/complete" style="color:#8affc1">★ Complete!</a>' : ''}
</div>
<header><div class="brand"><a href="/">📋 HexaForms</a></div><nav>${nav}</nav></header>
<main>${body}</main>
<footer>HexaForms practice lab — intentionally vulnerable, synthetic data, local use only.</footer>
${chatWidget()}
</body></html>`;
}

function gatePage(err) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Locked — LAB ${LAB_NUMBER} ${LAB_NAME}</title>
<style>body{font-family:'Segoe UI',Arial,sans-serif;background:#f4f5fb;color:#232338;margin:0}main{max-width:560px;margin:60px auto;padding:0 16px}.card{background:#fff;border:1px solid #dcdcf0;border-radius:10px;padding:24px;box-shadow:0 1px 3px rgba(50,50,120,.08)}input{width:100%;padding:10px;margin:8px 0 14px;border:1px solid #c5c5e0;border-radius:6px;box-sizing:border-box}button{background:#4f46e5;color:#fff;border:0;border-radius:6px;padding:10px 18px;cursor:pointer;font-size:15px}.err{background:#fdecea;border:1px solid #e5a19c;padding:10px;border-radius:6px;margin-bottom:12px}</style></head><body>
<main><div class="card" style="text-align:center">
  <img src="/logo.png" alt="HexaCyberLab" style="height:64px">
  <h2>🔒 LAB ${LAB_NUMBER} — ${LAB_NAME}</h2>
  <p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
  ${err ? '<div class="err">Invalid key.</div>' : ''}
  <form method="POST" action="/unlock">
    <input name="key" placeholder="Completion key from Lab ${LAB_NUMBER - 1}" autocomplete="off" required>
    <button>Unlock Lab ${LAB_NUMBER}</button>
  </form>
  <p style="color:#7a7a95;font-size:13px">Finish Lab ${LAB_NUMBER - 1} at 100% to receive its completion key — it appears on that lab's completion page.</p>
</div></main>
${chatWidget()}
</body></html>`;
}
function send(res, code, html, headers = {}) {
  res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', ...headers });
  res.end(html);
}
function redirect(res, to, headers = {}) {
  res.writeHead(302, { Location: to, ...headers });
  res.end();
}

const _kB = ['RFNQV0Q='];
const _cB = ['NDFBS1c='];

/* ---------------- Chatbot ---------------- */
function featureFromText(msg) {
  const m = msg.toLowerCase();
  const table = [
    ['Admin Panel', ['admin']],
    ['Platform & API', ['api', 'token', 'endpoint']],
    ['Files & Uploads', ['upload', 'file', 'attachment', 'traversal', 'download']],
    ['Submissions & Responses', ['submission', 'response', 'export', 'csv']],
    ['Forms & Templates', ['form', 'template', 'slug', 'private', 'access']],
    ['Accounts & Profile', ['profile', 'account', 'register', 'mass assignment', 'password policy']],
    ['Login & Authentication', ['login', 'log in', 'password', 'reset token', 'brute', 'enumerat', 'sign in', 'demo']],
  ];
  for (const [f, words] of table) if (words.some((w) => m.includes(w))) return f;
  return null;
}
function chatReply(raw) {
  const msg = String(raw || '');
  const m = msg.toLowerCase();
  const P = progress();
  if (/\b(who|whom)\b.*(built|made|created|build|author|founder)|who built|who made|who created|founder/.test(m)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (/key/.test(m) && /(next|unlock|completion|give|what|tell|show|lab)/.test(m)) {
    if (state.keyRevealed) return `You completed LAB ${LAB_NUMBER} at 100%, so I can share it now: the completion key is ${completionKey()} — paste it into Lab ${LAB_NUMBER + 1} to unlock it.`;
    return `I don't have the completion key yet — it is only revealed to me when this lab is completed 100%. Right now you are at ${P.pct}% (${P.done}/${P.total} tests). Finish every test and the key will appear on the completion page, and I'll be able to share it then too.`;
  }
  if (/progress|score|how am i|status|percent/.test(m)) {
    const next = TESTS.find((t) => !state.tests[t.id]);
    return `You have completed ${P.done} of ${P.total} tests (${P.pct}%). ${next ? `Next open test: "${next.name}" in ${next.feature} — open the Mission page (/tests) for its hints, or ask me about that feature after a few tries.` : 'Everything is done — see /complete for your key and certificate.'}`;
  }
  if (/feature|how many|list|tests|vulnerabilit/.test(m) && !/how (do|to|can)/.test(m)) {
    const f = featureFromText(m);
    if (f) {
      const ts = TESTS.filter((t) => t.feature === f);
      return `${f} has ${ts.length} test(s): ${ts.map((t) => `"${t.name}"${state.tests[t.id] ? ' ✓' : ''}`).join(', ')}. Attempts so far on this feature: ${state.attempts[f] || 0}. Ask me "how do I test ${f}" after you've tried it at least 3 times and I'll walk you through it.`;
    }
    return `LAB ${LAB_NUMBER} — ${LAB_NAME} has ${FEATURES.length} features and ${P.total} tests: ${FEATURES.map((x) => `${x} (${P.features[x].total})`).join(' · ')}. Progress: ${P.done}/${P.total} (${P.pct}%).`;
  }
  if (/how|help|guide|stuck|hint|solve|do i|can i/.test(m)) {
    const f = featureFromText(m);
    if (f) {
      const ts = TESTS.filter((t) => t.feature === f);
      const att = state.attempts[f] || 0;
      const open = ts.filter((t) => !state.tests[t.id]);
      if (!open.length) return `You've already completed every test in ${f}. Well done — ${P.done}/${P.total} overall (${P.pct}%).`;
      if (att >= 3) {
        return `You've put in ${att} attempt(s) on ${f} — here's the guided walkthrough:\n` + open.map((t) => `• ${t.name}: ${t.guide}`).join('\n');
      }
      return `That feature is locked for help. First try the ${f} tests yourself at least 3 times — I can see you've tried ${att} time(s) so far. After 3 real tries, ask me again and I'll guide you step by step. The Mission page (/tests) also has graded hints beside every test.`;
    }
    return `Tell me which feature you're stuck on (e.g. "how do I test Submissions & Responses?"). Remember my rule: I can only walk you through a feature after you've genuinely tried it at least 3 times — I keep count. The Mission page (/tests) lists every test with hints.`;
  }
  if (/^(hi|hello|hey|yo)\b/.test(m) || /what can you do|who are you/.test(m)) {
    return `Hi! I'm the LAB ${LAB_NUMBER} assistant for ${LAB_NAME}. This lab has ${FEATURES.length} features and ${P.total} security tests; you're at ${P.done}/${P.total} (${P.pct}%). Ask me about a feature ("how many tests in Forms & Templates?"), your progress, or — after at least 3 real attempts on a feature — ask "how do I test <feature>" and I'll guide you step by step.`;
  }
  return `I can help with: the feature/test map ("list features"), your progress ("progress"), and step-by-step guidance for a feature once you've tried it at least 3 times ("how do I test Forms & Templates?"). Full test list with hints: /tests.`;
}
const CHAT_JS = `<script>
function hxToggleChat(){var p=document.getElementById('hxchat');p.style.display=(p.style.display==='flex')?'none':'flex';}
function hxSendChat(){var i=document.getElementById('hxchatin'),b=document.getElementById('hxchatlog');var v=i.value.trim();if(!v)return;i.value='';
 b.innerHTML+='<div style="text-align:right;margin:6px 0"><span style="background:#4f46e5;color:#fff;border-radius:10px;padding:6px 10px;display:inline-block;max-width:85%">'+v.replace(/</g,'&lt;')+'</span></div>';
 fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:v})}).then(function(r){return r.json()}).then(function(d){
 b.innerHTML+='<div style="margin:6px 0"><span style="background:#eceaff;border-radius:10px;padding:6px 10px;display:inline-block;max-width:85%;white-space:pre-wrap">'+String(d.reply).replace(/</g,'&lt;')+'</span></div>';b.scrollTop=b.scrollHeight;});}
</script>`;
function chatWidget() {
  return `<button onclick="hxToggleChat()" style="position:fixed;right:18px;bottom:18px;z-index:60;border-radius:24px;padding:12px 18px;box-shadow:0 4px 14px rgba(0,0,0,.3)">💬 Lab Assistant</button>
<div id="hxchat" style="display:none;position:fixed;right:18px;bottom:74px;z-index:60;width:340px;max-width:92vw;height:430px;background:#fff;border:1px solid #c5c5e0;border-radius:12px;flex-direction:column;box-shadow:0 8px 30px rgba(0,0,0,.3)">
  <div style="background:#4f46e5;color:#fff;padding:10px 12px;border-radius:12px 12px 0 0"><b>HexaForms Lab Assistant</b><div style="font-size:12px">Guidance unlocks after 3 real attempts per feature</div></div>
  <div id="hxchatlog" style="flex:1;overflow-y:auto;padding:10px;font-size:13px"></div>
  <div style="display:flex;gap:6px;padding:8px;border-top:1px solid #dcdcf0"><input id="hxchatin" placeholder="Ask about a feature…" style="flex:1;margin:0" onkeydown="if(event.key==='Enter')hxSendChat()"><button onclick="hxSendChat()">Send</button></div>
</div>${CHAT_JS}`;
}

const _kC = ['V1lUMi0=', 'NUtWMw=='];
const _cC = ['UFFQRi0=', 'UDZYMg=='];
const entryKey = () => _unshard([..._kA, ..._kB, ..._kC]);
const completionKey = () => _unshard([..._cA, ..._cB, ..._cC]);

/* ---------------- Server & routes ---------------- */
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    const path = url.pathname;
    const method = req.method;
    const user = currentUser(req);
    const session = currentSession(req);
    let m;

    /* ================= LAB SYSTEM ROUTES ================= */
    if (method === 'GET' && path === '/logo.png') {
      try {
        const data = fs.readFileSync(LOGO_PATH);
        res.writeHead(200, { 'Content-Type': 'image/png' });
        return res.end(data);
      } catch (e) { return send(res, 404, 'logo missing'); }
    }
    if (method === 'POST' && path === '/unlock') {
      const body = await readBody(req);
      const given = String(body.key || '').trim();
      const want = entryKey();
      let same = given.length === want.length;
      for (let i = 0; i < want.length; i++) if (given[i] !== want[i]) same = false;
      if (same) { state.unlocked = true; saveState(); return redirect(res, '/'); }
      return send(res, 403, gatePage(true));
    }
    if (method === 'GET' && path === '/api/progress') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(state.unlocked ? progress() : { locked: true, lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done: 0, pct: 0 }));
    }
    if (method === 'POST' && path === '/api/chat') {
      let raw = '';
      req.on('data', (c) => { raw += c; });
      return req.on('end', () => {
        let message = '';
        try { message = JSON.parse(raw).message || ''; } catch (e) { message = ''; }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ reply: chatReply(message) }));
      });
    }

    /* ----- Lock gate: every page shows ONLY the gate until unlocked ----- */
    if (!state.unlocked) return send(res, 200, gatePage(false));

    /* ----- Mission page ----- */
    if (method === 'GET' && path === '/tests') {
      const P = progress();
      const sections = FEATURES.map((f) => {
        const ts = TESTS.filter((t) => t.feature === f);
        const rows = ts.map((t) => {
          const done = !!state.tests[t.id];
          const hintLis = t.hints.map((h, hi) => `<div class="hxhint" id="hint-${t.id}-${hi}" style="display:none;margin-top:6px;background:#fdf6e3;border:1px solid #e5c15c;border-radius:6px;padding:8px">💡 Hint ${hi + 1}: ${esc(h)}</div>`).join('');
          return `<div class="card" style="margin-bottom:10px">
            <div>${done ? '✅' : '○'} <b>${esc(t.name)}</b> <span class="badge">${esc(t.owasp)}</span> <span class="badge">${esc(t.difficulty)}</span> ${done ? '<span class="badge" style="background:#cdeecd">COMPLETED</span>' : ''}</div>
            <div class="muted">Feature attempts so far: ${P.features[f].attempts} · Graded hints beside every test — try first, then reveal one at a time.</div>
            <button type="button" onclick="var n=this.parentNode.querySelectorAll('.hxhint:not([data-open])');if(n.length){n[0].style.display='block';n[0].setAttribute('data-open','1');}">Reveal next hint (${t.hints.length})</button>
            ${hintLis}</div>`;
        }).join('');
        return `<h2>${esc(f)} — ${P.features[f].done}/${P.features[f].total} tests</h2>${rows}`;
      }).join('');
      return send(res, 200, layout(req, 'Mission — Tests', `<h2>🎯 Mission — LAB ${LAB_NUMBER} ${LAB_NAME}</h2>
        <div class="flash">Progress: <b>${P.done}/${P.total} tests · ${P.pct}%</b> ${P.complete ? '— LAB COMPLETE! See <a href="/complete">your completion page</a>.' : '— complete every test to reach 100%, reveal the completion key and earn your certificate.'}</div>
        <p class="muted">Tests complete by <b>doing</b> — the lab detects each successful exploit itself. The Lab Assistant (bottom-right) gives step-by-step guidance for a feature only after you've tried that feature at least 3 times.</p>
        ${sections}`));
    }

    /* ----- Completion page ----- */
    if (method === 'POST' && path === '/complete/name') {
      const body = await readBody(req);
      state.testerName = String(body.name || '').slice(0, 60);
      saveState();
      return redirect(res, '/certificate');
    }
    if (method === 'GET' && path === '/complete') {
      const P = progress();
      if (!P.complete) {
        const left = TESTS.filter((t) => !state.tests[t.id]).map((t) => `<li>${esc(t.name)} <span class="muted">(${esc(t.feature)})</span></li>`).join('');
        return send(res, 200, layout(req, 'Completion', `<h2>Completion — not yet</h2>
          <p>You are at <b>${P.done}/${P.total} tests · ${P.pct}%</b>. This page unlocks at 100%.</p>
          <h3>Still to complete</h3><ul>${left}</ul><p><a class="btn" href="/tests">Go to the Mission page</a></p>`));
      }
      const byFeature = FEATURES.map((f) => {
        const ts = TESTS.filter((t) => t.feature === f);
        return `<tr><td>${esc(f)}</td><td>${ts.length}</td><td>${ts.map((t) => esc(t.name)).join('<br>')}</td></tr>`;
      }).join('');
      const techniques = TESTS.map((t) => `<li><b>${esc(t.name)}</b> — ${esc(t.owasp)}</li>`).join('');
      const lessons = TESTS.map((t) => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('');
      const impacts = TESTS.map((t) => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('');
      const reports = TESTS.map((t) => `<li><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)}. Remediation: ${esc(t.report.remediation)}</li>`).join('');
      return send(res, 200, layout(req, 'Lab Complete!', `<h2>🎉 LAB ${LAB_NUMBER} — ${LAB_NAME}: 100% COMPLETE</h2>
        <div class="flash">Every test in this lab is complete. The completion key for Lab ${LAB_NUMBER + 1} is revealed below — it was assembled only now; before completion it existed nowhere whole, not even with the Lab Assistant.</div>
        <h3>1 · What this lab contained</h3>
        <p>This lab had <b>${FEATURES.length} features</b> and <b>${P.total} vulnerabilities/tests</b> in total:</p>
        <table><tr><th>Feature</th><th>Vulnerabilities</th><th>Tests</th></tr>${byFeature}</table>
        <h3>2 · How many ways the testing was done</h3>
        <p>You tested this application in <b>${P.total} different ways</b>:</p><ul>${techniques}</ul>
        <h3>3 · What you learned</h3><ul>${lessons}</ul>
        <h3>4 · What this means for a real client</h3>
        <p>Found on a real client's website, these same flaws would mean:</p><ul>${impacts}</ul>
        <h3>5 · Writing it in a real report</h3><ul>${reports}</ul>
        <h3>6 · Your completion key for Lab ${LAB_NUMBER + 1}</h3>
        <div class="card" style="text-align:center"><div class="muted">Paste this key into Lab ${LAB_NUMBER + 1} to unlock it</div>
        <div style="font-size:24px;font-weight:bold;letter-spacing:2px;margin:10px 0">${completionKey()}</div></div>
        <h3>Your certificate</h3>
        <form method="POST" action="/complete/name">
          <label>Your name for the certificate <input name="name" value="${esc(state.testerName || (user ? user.name : ''))}"></label>
          <button>Save name & view certificate</button></form>
        <p><a class="btn" href="/certificate">View certificate</a></p>`));
    }

    /* ----- Certificate ----- */
    if (method === 'GET' && path === '/certificate') {
      const P = progress();
      if (!P.complete) return redirect(res, '/complete');
      const name = state.testerName || (user ? user.name : 'HexaForms Tester');
      const date = state.completedAt ? new Date(state.completedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      return send(res, 200, `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER} ${LAB_NAME}</title>
<style>body{font-family:Georgia,serif;background:#e6e4f5;margin:0;padding:30px}.cert{max-width:760px;margin:20px auto;background:#fffdf7;border:3px solid #4f46e5;border-radius:14px;padding:44px;text-align:center;box-shadow:0 6px 30px rgba(50,50,120,.25)}.cert img{height:84px}h1{color:#3730a3;margin:10px 0}.name{font-size:32px;font-weight:bold;color:#232338;border-bottom:2px solid #e5c15c;display:inline-block;padding:0 26px 6px;margin:14px 0}.muted{color:#7a7a95}@media print{body{background:#fff;padding:0}.noPrint{display:none}}</style></head><body>
<div class="cert">
  <img src="/logo.png" alt="HexaCyberLab logo">
  <h1>Certificate of Completion</h1>
  <p class="muted">This certifies that</p>
  <div class="name">${esc(name)}</div>
  <p>has completed <b>100%</b> of the security tests in</p>
  <h2 style="margin:6px 0">LAB ${LAB_NUMBER} — ${LAB_NAME}</h2>
  <p>${P.total} tests across ${FEATURES.length} features · Completed ${date}</p>
  <p style="margin-top:26px" class="muted">HexaCyberLab — Built by Md. Jony Hassain, Founder</p>
</div>
<p class="noPrint" style="text-align:center"><a href="/complete">Back to completion page</a> · Use your browser's Print → Save as PDF to keep this certificate.</p>
</body></html>`);
    }

    /* ----- Landing / dashboard ----- */
    if (method === 'GET' && path === '/') {
      if (!user) {
        const pub = forms.filter((f) => f.access === 'public' && f.status === 'published')
          .map((f) => `<div class="card"><h3>${esc(f.title)}</h3><div class="muted">by ${esc(wsOf(f.workspaceId).name)}</div><p><a class="btn" href="/f/${esc(f.slug)}">Open form</a></p></div>`).join('');
        return send(res, 200, layout(req, 'Forms that fill themselves in', `<h2>Build forms. Collect responses. Done.</h2>
          <p class="muted">HexaForms is a form-builder SaaS: create a form from a template, share its public link, and read every response in your dashboard. Teams share a workspace; private forms stay inside the team.</p>
          <h3>Live public forms</h3><div class="grid">${pub}</div>
          <p style="margin-top:16px"><a class="btn" href="/register">Create your free account</a> <a class="btn" href="/login">Login</a></p>`));
      }
      const myWs = workspaces.filter((w) => w.memberIds.includes(user.id));
      const myForms = forms.filter((f) => myWs.some((w) => w.id === f.workspaceId));
      const rows = myForms.map((f) => {
        const n = submissions.filter((s) => s.formId === f.id).length;
        return `<tr><td><b>${esc(f.title)}</b><br><span class="muted">/f/${esc(f.slug)}</span></td>
          <td>${esc(wsOf(f.workspaceId).name)}</td><td><span class="badge">${esc(f.access)}</span><span class="badge">${esc(f.status)}</span></td><td>${n}</td>
          <td><a href="/forms/${f.id}">Settings</a> · <a href="/forms/${f.id}/submissions">Responses</a> · <a href="/forms/${f.id}/export">Export CSV</a>${f.status === 'published' ? ` · <a href="/f/${esc(f.slug)}">Public link</a>` : ''}</td></tr>`;
      }).join('');
      const recent = submissions.filter((s) => myForms.some((f) => f.id === s.formId)).slice(-5).reverse()
        .map((s) => `<tr><td><a href="/submissions/${s.id}">#${s.id}</a></td><td>${esc(formOf(s.formId).title)}</td><td>${esc(s.name)}</td><td>${esc(s.at)}</td></tr>`).join('');
      return send(res, 200, layout(req, 'Dashboard', `<h2>Dashboard — ${esc(user.name)}</h2>
        <p class="muted">Workspaces: ${myWs.map((w) => esc(w.name)).join(', ') || 'none yet — create a form from a template to start one.'}</p>
        <h3>My forms</h3><table><tr><th>Form</th><th>Workspace</th><th>Access</th><th>Responses</th><th>Actions</th></tr>${rows || '<tr><td colspan="5" class="muted">No forms yet.</td></tr>'}</table>
        <h3>Recent responses</h3><table><tr><th>#</th><th>Form</th><th>From</th><th>At</th></tr>${recent || '<tr><td colspan="4" class="muted">No responses yet.</td></tr>'}</table>`));
    }

    /* ----- Templates ----- */
    if (method === 'GET' && path === '/templates') {
      const cards = templates.map((t) => `<div class="card"><h3>${esc(t.name)}</h3><div class="muted">Fields: ${t.fields.map(esc).join(', ')}, plus respondent name & email</div>
        <form method="POST" action="/forms/create"><input type="hidden" name="templateId" value="${t.id}">
        <label>New form title <input name="title" placeholder="My ${esc(t.name)}" required></label><button>Create form</button></form></div>`).join('');
      return send(res, 200, layout(req, 'Templates', `<h2>Form templates</h2><div class="grid">${cards}</div>`));
    }
    if (method === 'POST' && path === '/forms/create') {
      if (!user) return redirect(res, '/login');
      const body = await readBody(req);
      attempt(F.FORMS);
      const tpl = templates.find((t) => t.id === Number(body.templateId)) || templates[0];
      let ws = workspaces.find((w) => w.ownerId === user.id);
      if (!ws) { ws = { id: nextId('workspace'), name: user.name + "'s Workspace", ownerId: user.id, memberIds: [user.id] }; workspaces.push(ws); }
      const nf = { id: nextId('form'), workspaceId: ws.id, title: String(body.title || tpl.name).slice(0, 80), slug: '', access: 'public', status: 'draft', fields: [...tpl.fields] };
      nf.slug = slugify(nf.title) + '-' + nf.id;
      forms.push(nf);
      return redirect(res, `/forms/${nf.id}`);
    }

    /* ----- Public form view + submit ----- */
    if (method === 'GET' && (m = path.match(/^\/f\/([a-z0-9\-]+)$/))) {
      attempt(F.FORMS);
      const slug = m[1];
      const ip = req.socket.remoteAddress || 'ip';
      if (!slugProbes.has(ip)) slugProbes.set(ip, new Set());
      slugProbes.get(ip).add(slug);
      if (slugProbes.get(ip).size >= 5) pass('slug-enumeration');
      const form = forms.find((f) => f.slug === slug);
      if (!form) return send(res, 404, layout(req, 'Not found', '<h2>Form not found</h2><p class="muted">No form lives at this link.</p>'));
      if (form.status !== 'published') return send(res, 200, layout(req, form.title, '<h2>This form is not published yet.</h2><p class="muted">The owner has not published this form.</p>'));
      if (form.access === 'private' && !inWorkspace(user, form.workspaceId)) {
        return send(res, 200, layout(req, form.title, '<h2>🔒 This form is private.</h2><p class="muted">Only workspace members can view it. If you are a member, log in first.</p>'));
      }
      const fieldInputs = form.fields.map((label, i) => `<label>${esc(label)} <input name="ans_${i}"></label>`).join('');
      const thanks = url.searchParams.get('thanks') ? '<div class="flash">✅ Thanks! Your response was recorded.</div>' : '';
      return send(res, 200, layout(req, form.title, `${thanks}<h2>${esc(form.title)}</h2>
        <p class="muted">by ${esc(wsOf(form.workspaceId).name)} · ${esc(form.access)} form</p>
        <form method="POST" action="/f/${esc(form.slug)}/submit">
          <label>Your name <input name="name" required></label>
          <label>Your email <input name="email" type="email" required></label>
          ${fieldInputs}
          <label>Attachment filename (optional) <input name="attachmentName" placeholder="e.g. cv.pdf"></label>
          <label>Attachment content (optional, text) <textarea name="attachmentContent" rows="3"></textarea></label>
          <button>Submit response</button></form>`));
    }
    if (method === 'POST' && (m = path.match(/^\/f\/([a-z0-9\-]+)\/submit$/))) {
      attempt(F.FORMS);
      const form = forms.find((f) => f.slug === m[1]);
      if (!form || form.status !== 'published') return send(res, 404, layout(req, 'Not found', '<h2>Form not found</h2>'));
      const body = await readBody(req);
      const answers = {};
      form.fields.forEach((label, i) => { answers[label] = String(body['ans_' + i] || ''); });
      const sub = { id: nextId('submission'), formId: form.id, name: String(body.name || 'Anonymous'), email: String(body.email || ''), answers, attachmentId: null, at: new Date().toISOString() };
      submissions.push(sub);
      let att = null;
      if (body.attachmentName) {
        attempt(F.FILES);
        att = { id: nextId('attachment'), submissionId: sub.id, filename: String(body.attachmentName).slice(0, 80), content: String(body.attachmentContent || '') };
        attachments.push(att);
        sub.attachmentId = att.id;
      }
      // NOTE (vuln): the submit endpoint never re-checks the form's access mode —
      // the render path refuses private forms, the POST path accepts everyone.
      if (form.access === 'private' && !inWorkspace(user, form.workspaceId)) pass('private-form-submit');
      if (XSS_RE.test(sub.name) || Object.values(answers).some((a) => XSS_RE.test(a))) pass('stored-xss-submission');
      if (att && /\.(html?|svg)$/i.test(att.filename)) pass('unrestricted-upload');
      return redirect(res, `/f/${form.slug}?thanks=1`);
    }

    /* ----- Stored uploads are served back raw (unrestricted upload) ----- */
    if (method === 'GET' && (m = path.match(/^\/uploads\/(\d+)\/(.+)$/))) {
      const att = attachments.find((a) => a.submissionId === Number(m[1]) && a.filename === decodeURIComponent(m[2]));
      if (!att) return send(res, 404, 'Not found');
      const ext = att.filename.split('.').pop().toLowerCase();
      const type = ext === 'html' || ext === 'htm' ? 'text/html' : ext === 'svg' ? 'image/svg+xml' : ext === 'txt' ? 'text/plain' : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type });
      return res.end(att.content);
    }

    /* ----- Asset download (path traversal by design) ----- */
    if (method === 'GET' && path === '/files') {
      attempt(F.FILES);
      const name = url.searchParams.get('name') || '';
      // NOTE (vuln): the name is joined straight onto the assets dir — ../ climbs out.
      const target = require('path').join(ASSETS_DIR, name);
      try {
        const data = fs.readFileSync(target, 'utf8');
        if (!require('path').resolve(target).startsWith(ASSETS_DIR)) pass('path-traversal');
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end(data);
      } catch (e) { return send(res, 404, layout(req, 'Not found', '<h2>File not found</h2>')); }
    }

    /* ----- Form settings (IDOR on view by design) ----- */
    if (method === 'GET' && (m = path.match(/^\/forms\/(\d+)$/))) {
      if (!user) return redirect(res, '/login');
      const form = formOf(m[1]);
      if (!form) return send(res, 404, layout(req, 'Not found', '<h2>Form not found</h2>'));
      attempt(F.FORMS);
      // NOTE (vuln): any logged-in user can view any form's settings — no workspace check.
      if (!inWorkspace(user, form.workspaceId)) pass('form-settings-idor');
      const n = submissions.filter((s) => s.formId === form.id).length;
      return send(res, 200, layout(req, 'Form settings', `<h2>${esc(form.title)}</h2>
        <p class="muted">Workspace: ${esc(wsOf(form.workspaceId).name)} · Responses: ${n} · Public link: <a href="/f/${esc(form.slug)}">/f/${esc(form.slug)}</a></p>
        <div class="card"><h3>Settings</h3>
        <form method="POST" action="/forms/${form.id}/settings">
          <input type="hidden" name="hx_tok" value="${esc(session ? session.csrfTok || '' : '')}">
          <label>Title <input name="title" value="${esc(form.title)}"></label>
          <label>Status <select name="status"><option value="draft" ${form.status === 'draft' ? 'selected' : ''}>draft</option><option value="published" ${form.status === 'published' ? 'selected' : ''}>published</option></select></label>
          <p class="muted">Access: <b>${esc(form.access)}</b> — access changes require an approved plan workflow and cannot be made here.</p>
          <button>Save settings</button></form></div>
        <p><a class="btn" href="/forms/${form.id}/submissions">View responses</a> <a class="btn" href="/forms/${form.id}/export">Export CSV</a></p>`));
    }
    if (method === 'POST' && (m = path.match(/^\/forms\/(\d+)\/settings$/))) {
      if (!user) return redirect(res, '/login');
      const form = formOf(m[1]);
      if (!form) return send(res, 404, 'Not found');
      if (!inWorkspace(user, form.workspaceId)) return send(res, 403, layout(req, 'Forbidden', '<h2>Not your form</h2>'));
      attempt(F.FORMS);
      const body = await readBody(req);
      if (body.title) form.title = String(body.title).slice(0, 80);
      if (body.status === 'draft' || body.status === 'published') form.status = body.status;
      // NOTE (vuln): the handler also binds an access field the UI never offers —
      // a tampered POST flips a private form public, skipping the approval workflow.
      if (body.access !== undefined && body.access !== form.access) {
        const was = form.access;
        form.access = String(body.access);
        if (was === 'private' && form.access === 'public') pass('access-mass-assignment');
      }
      return redirect(res, `/forms/${form.id}`);
    }

    /* ----- Submissions list (workspace-checked) ----- */
    if (method === 'GET' && (m = path.match(/^\/forms\/(\d+)\/submissions$/))) {
      if (!user) return redirect(res, '/login');
      const form = formOf(m[1]);
      if (!form) return send(res, 404, layout(req, 'Not found', '<h2>Form not found</h2>'));
      if (!inWorkspace(user, form.workspaceId)) return send(res, 403, layout(req, 'Forbidden', '<h2>Not your workspace</h2>'));
      attempt(F.SUBS);
      const rows = submissions.filter((s) => s.formId === form.id)
        .map((s) => `<tr><td><a href="/submissions/${s.id}">#${s.id}</a></td><td>${esc(s.name)}</td><td>${esc(s.email)}</td><td>${esc(s.at)}</td><td>${s.attachmentId ? `<a href="/attachments/${s.attachmentId}">file</a>` : '—'}</td></tr>`).join('');
      return send(res, 200, layout(req, 'Responses', `<h2>Responses — ${esc(form.title)}</h2>
        <table><tr><th>#</th><th>From</th><th>Email</th><th>At</th><th>Attachment</th></tr>${rows || '<tr><td colspan="5" class="muted">No responses yet.</td></tr>'}</table>
        <p><a class="btn" href="/forms/${form.id}/export">Export CSV</a></p>`));
    }

    /* ----- Export (login-only check by design) ----- */
    if (method === 'GET' && (m = path.match(/^\/forms\/(\d+)\/export$/))) {
      if (!user) return redirect(res, '/login');
      const form = formOf(m[1]);
      if (!form) return send(res, 404, 'Not found');
      attempt(F.SUBS);
      // NOTE (vuln): export checks login only — any account can export any form.
      if (!inWorkspace(user, form.workspaceId)) pass('export-unauthorized');
      const head = ['id', 'name', 'email', 'at', ...form.fields, 'attachment'];
      const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
      const lines = submissions.filter((s) => s.formId === form.id).map((s) => {
        const att = s.attachmentId ? attOf(s.attachmentId) : null;
        return [s.id, s.name, s.email, s.at, ...form.fields.map((f) => s.answers[f] || ''), att ? att.filename : ''].map(q).join(',');
      });
      res.writeHead(200, { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="form-${form.id}-responses.csv"` });
      return res.end([head.map(q).join(','), ...lines].join('\n'));
    }

    /* ----- Submission detail (IDOR + raw render by design) ----- */
    if (method === 'GET' && (m = path.match(/^\/submissions\/(\d+)$/))) {
      if (!user) return redirect(res, '/login');
      const sub = subOf(m[1]);
      if (!sub) return send(res, 404, layout(req, 'Not found', '<h2>Response not found</h2>'));
      const form = formOf(sub.formId);
      attempt(F.SUBS);
      // NOTE (vuln): login-only check — any account can read any response.
      if (!inWorkspace(user, form.workspaceId)) pass('submission-idor');
      const ans = Object.entries(sub.answers).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${v}</td></tr>`).join('');
      // NOTE (vuln): respondent name + answers are rendered WITHOUT escaping above/below (stored XSS delivery).
      return send(res, 200, layout(req, 'Response #' + sub.id, `<h2>Response #${sub.id} — ${esc(form.title)}</h2>
        <table><tr><th>From</th><td>${sub.name} (${esc(sub.email)})</td></tr><tr><th>At</th><td>${esc(sub.at)}</td></tr>${ans}</table>
        ${sub.attachmentId ? `<p>Attachment: <a href="/attachments/${sub.attachmentId}">${esc(attOf(sub.attachmentId).filename)}</a></p>` : ''}`));
    }

    /* ----- Attachment download (IDOR by design) ----- */
    if (method === 'GET' && (m = path.match(/^\/attachments\/(\d+)$/))) {
      if (!user) return redirect(res, '/login');
      const att = attOf(m[1]);
      if (!att) return send(res, 404, 'Not found');
      const sub = subOf(att.submissionId);
      const form = formOf(sub.formId);
      attempt(F.SUBS);
      if (!inWorkspace(user, form.workspaceId)) pass('attachment-idor');
      const ext = att.filename.split('.').pop().toLowerCase();
      const type = ext === 'pdf' ? 'application/pdf' : ext === 'txt' ? 'text/plain' : ext === 'html' ? 'text/html' : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type, 'Content-Disposition': `attachment; filename="${att.filename}"` });
      return res.end(att.content);
    }

    /* ----- Auth ----- */
    if (method === 'GET' && path === '/register') {
      return send(res, 200, layout(req, 'Register', `<h2>Create account</h2>
        <form method="POST" action="/register">
          <label>Name <input name="name" required></label>
          <label>Email <input name="email" type="email" required></label>
          <label>Password <input name="password" type="password" required></label>
          <button>Register</button></form>`));
    }
    if (method === 'POST' && path === '/register') {
      const body = await readBody(req);
      attempt(F.ACCT);
      // NOTE: no password policy at all — even a 1-character password is accepted.
      if (String(body.password || '').length < 6) pass('weak-password-policy');
      if (XSS_RE.test(String(body.name || ''))) pass('stored-xss-profile');
      if (users.some((u) => u.email === body.email)) return send(res, 400, layout(req, 'Register', '<p>Email already registered.</p>'));
      users.push({ id: nextId('user'), name: String(body.name || 'New user'), email: String(body.email), password: String(body.password), role: 'user', plan: 'free' });
      return redirect(res, '/login');
    }
    if (method === 'GET' && path === '/login') {
      return send(res, 200, layout(req, 'Login', `<h2>Login</h2>
        <form method="POST" action="/login">
          <label>Email <input name="email" type="email" required></label>
          <label>Password <input name="password" type="password" required></label>
          <button>Login</button></form>
        <p><a href="/forgot">Forgot password?</a></p>
        <div class="card"><b>Test accounts</b><br>admin@hexaforms.local / Admin@123<br>
        nabila@hexaforms.local / Owner@123 (workspace: Nabila Studio)<br>
        rafi@hexaforms.local / Owner@123 (workspace: Rafi Ventures)<br>
        tanvir@hexaforms.local / Member@123 (team member, Nabila Studio)<br>
        demo@hexaforms.local / demo123 (seeded demo account, from the install guide)</div>`));
    }
    if (method === 'POST' && path === '/login') {
      const body = await readBody(req);
      attempt(F.AUTH);
      const startSession = (u) => {
        const sid = crypto.randomBytes(16).toString('hex');
        sessions.set(sid, { userId: u.id, csrfTok: crypto.randomBytes(8).toString('hex') });
        // NOTE (vuln): role is ALSO mirrored into a client cookie that /admin trusts.
        return redirect(res, '/', { 'Set-Cookie': [`sid=${sid}; Path=/; HttpOnly`, `role=${u.role}; Path=/`] });
      };
      // NOTE: legacy lookup path — the email is glued into a query string, so an
      // injection tautology "matches" the first row (the admin) and logs in as them.
      if (INJ_RE.test(String(body.email || '')) || INJ_RE.test(String(body.password || ''))) {
        pass('sqli-login');
        return startSession(users[0]);
      }
      const acct = users.find((x) => x.email === body.email);
      if (!acct) {
        state.flags.enumUnknown = true; saveState();
        if (state.flags.enumKnown && state.flags.enumUnknown) pass('user-enumeration');
        return send(res, 401, layout(req, 'Login', '<p>No account with that email.</p>'));
      }
      if (acct.password !== body.password) {
        state.flags.enumKnown = true; saveState();
        if (state.flags.enumKnown && state.flags.enumUnknown) pass('user-enumeration');
        const n = (loginFails.get(acct.email) || 0) + 1;
        loginFails.set(acct.email, n);
        if (n >= 10) pass('brute-force'); // the 10th failure is still processed — nothing throttles it
        return send(res, 401, layout(req, 'Login', '<p>Wrong password.</p>'));
      }
      loginFails.delete(acct.email);
      if (acct.email === 'demo@hexaforms.local') pass('default-creds');
      return startSession(acct);
    }
    if (method === 'GET' && path === '/logout') {
      const sid = parseCookies(req).sid;
      if (sid) sessions.delete(sid);
      return redirect(res, '/', { 'Set-Cookie': ['sid=; Path=/; Max-Age=0', 'role=; Path=/; Max-Age=0'] });
    }
    if (method === 'GET' && path === '/forgot') {
      return send(res, 200, layout(req, 'Forgot password', `<h2>Forgot password</h2>
        <form method="POST" action="/forgot"><label>Email <input name="email" type="email" required></label><button>Send reset link</button></form>`));
    }
    if (method === 'POST' && path === '/forgot') {
      const body = await readBody(req);
      attempt(F.AUTH);
      const acct = users.find((x) => x.email === body.email);
      // NOTE (vuln): the two paths answer differently — account enumeration again.
      if (!acct) return send(res, 200, layout(req, 'Forgot password', '<p>If that email exists, a reset link has been sent.</p>'));
      const link = `/reset?email=${encodeURIComponent(acct.email)}&token=${resetTokenFor(acct.email)}`;
      return send(res, 200, layout(req, 'Forgot password', `<p>Account found. For this local lab your reset link is shown directly:</p><p><a href="${link}">${link}</a></p>`));
    }
    if (method === 'GET' && path === '/reset') {
      const email = url.searchParams.get('email') || '';
      const token = url.searchParams.get('token') || '';
      if (!email || token !== resetTokenFor(email)) return send(res, 400, layout(req, 'Reset', '<p>Invalid reset link.</p>'));
      return send(res, 200, layout(req, 'Reset password', `<h2>Reset password for ${esc(email)}</h2>
        <form method="POST" action="/reset"><input type="hidden" name="email" value="${esc(email)}"><input type="hidden" name="token" value="${esc(token)}">
        <label>New password <input name="password" type="password" required></label><button>Set password</button></form>`));
    }
    if (method === 'POST' && path === '/reset') {
      const body = await readBody(req);
      attempt(F.AUTH);
      if (String(body.token || '') !== resetTokenFor(String(body.email || ''))) return send(res, 400, layout(req, 'Reset', '<p>Invalid reset link.</p>'));
      const acct = users.find((x) => x.email === body.email);
      if (acct) { acct.password = String(body.password || ''); pass('predictable-reset'); }
      return redirect(res, '/login');
    }

    /* ----- Profile ----- */
    if (method === 'GET' && path === '/profile') {
      if (!user) return redirect(res, '/login');
      return send(res, 200, layout(req, 'Profile', `<h2>Profile</h2>
        <p class="muted">Plan: <b>${esc(user.plan)}</b> · Role: <b>${esc(user.role)}</b></p>
        <div class="card"><div class="muted">Public profile preview</div><h3>${user.name}</h3><div class="muted">${esc(user.email)}</div></div>
        <form method="POST" action="/profile">
          <input type="hidden" name="hx_tok" value="${esc(session ? session.csrfTok || '' : '')}">
          <label>Display name <input name="name" value="${esc(user.name)}"></label>
          <label>Email <input name="email" type="email" value="${esc(user.email)}"></label>
          <button>Save profile</button></form>
        <div class="card"><b>Your API token</b><br><code>${esc(derivedToken(user))}</code>
        <div class="muted">Use it as a Bearer token against GET /api/forms.</div></div>`));
    }
    if (method === 'POST' && path === '/profile') {
      if (!user) return redirect(res, '/login');
      attempt(F.ACCT);
      const body = await readBody(req);
      const wasRole = user.role, wasPlan = user.plan;
      if (body.name !== undefined) user.name = String(body.name);
      if (body.email !== undefined) user.email = String(body.email);
      // NOTE (vuln): extra body fields are bound onto the user record too (mass assignment).
      for (const k of ['role', 'plan']) if (body[k] !== undefined) user[k] = String(body[k]);
      if ((user.role === 'admin' && wasRole !== 'admin') || (user.plan === 'pro' && wasPlan !== 'pro')) pass('profile-mass-assignment');
      if (XSS_RE.test(user.name)) pass('stored-xss-profile');
      // NOTE (vuln): hx_tok is issued on the form but never verified here (CSRF).
      if (body.hx_tok !== (session ? session.csrfTok : undefined) || foreignOrigin(req)) pass('profile-csrf');
      return redirect(res, '/profile');
    }

    /* ----- Admin ----- */
    const adminGate = () => {
      if (user && user.role === 'admin') return 'session';
      if (parseCookies(req).role === 'admin') return 'cookie';
      return null;
    };
    if (method === 'GET' && path === '/admin') {
      const g = adminGate();
      if (!g) return send(res, 403, layout(req, 'Admins only', '<h2>Admins only</h2>'));
      if (g === 'cookie') pass('cookie-role-tamper');
      attempt(F.ADMIN);
      const rows = users.map((x) => `<tr><td>${x.id}</td><td>${x.name}</td><td>${esc(x.email)}</td><td>${esc(x.role)}</td><td>${esc(x.plan)}</td>
        <td><form method="POST" action="/admin/users/role" style="display:flex;gap:4px"><input type="hidden" name="userId" value="${x.id}"><input type="hidden" name="hx_tok" value="${esc(session ? session.csrfTok || '' : '')}">
        <select name="role" style="margin:0"><option value="user" ${x.role === 'user' ? 'selected' : ''}>user</option><option value="admin" ${x.role === 'admin' ? 'selected' : ''}>admin</option></select><button>Set</button></form></td></tr>`).join('');
      // NOTE (vuln): user names are rendered WITHOUT escaping in the table above (stored XSS delivery to admins).
      return send(res, 200, layout(req, 'Admin', `<h2>Admin panel</h2>
        <p class="muted">${users.length} users · ${forms.length} forms · ${submissions.length} responses</p>
        <p><a class="btn" href="/admin/export-users">Export all users (CSV)</a></p>
        <table><tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th>Plan</th><th>Set role</th></tr>${rows}</table>`));
    }
    if (method === 'POST' && path === '/admin/users/role') {
      const g = adminGate();
      if (!g) return send(res, 403, layout(req, 'Admins only', '<h2>Admins only</h2>'));
      if (g === 'cookie') pass('cookie-role-tamper');
      attempt(F.ADMIN);
      const body = await readBody(req);
      const target = userOf(body.userId);
      if (target && (body.role === 'admin' || body.role === 'user')) target.role = body.role;
      // NOTE (vuln): the hx_tok field is never verified on this privileged action (CSRF).
      if (!(session && body.hx_tok === session.csrfTok) || foreignOrigin(req)) pass('admin-csrf');
      return redirect(res, '/admin');
    }
    if (method === 'GET' && path === '/admin/export-users') {
      if (!user) return redirect(res, '/login');
      attempt(F.ADMIN);
      // NOTE (vuln): this admin utility checks login only — never the admin role.
      if (user.role !== 'admin') pass('admin-broken-access');
      const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
      const lines = users.map((x) => [x.id, x.name, x.email, x.password, x.role, x.plan].map(q).join(','));
      res.writeHead(200, { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="users.csv"' });
      return res.end(['id,name,email,password,role,plan', ...lines].join('\n'));
    }

    /* ----- API ----- */
    if (method === 'GET' && path === '/api/users') {
      attempt(F.API);
      // NOTE (vuln): unauthenticated debug endpoint left in production — full dump.
      pass('api-users-exposure');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(users.map((x) => ({ id: x.id, name: x.name, email: x.email, password: x.password, role: x.role, plan: x.plan })), null, 2));
    }
    if (method === 'GET' && path === '/api/forms') {
      attempt(F.API);
      const auth = req.headers.authorization || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
      const acct = users.find((x) => derivedToken(x) === token);
      if (!acct) { res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'invalid token' })); }
      // NOTE (vuln): the token is a pure function of the public email — anyone can derive it.
      if (!session) pass('weak-api-token');
      const mine = forms.filter((f) => inWorkspace(acct, f.workspaceId))
        .map((f) => ({ id: f.id, title: f.title, slug: f.slug, access: f.access, status: f.status, submissions: submissions.filter((s) => s.formId === f.id).length }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ user: acct.email, forms: mine }, null, 2));
    }

    return send(res, 404, layout(req, 'Not found', '<h2>Not found</h2><p class="muted">That page does not exist.</p>'));
  } catch (e) {
    try { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('Internal error'); } catch (_) {}
  }
});

server.listen(PORT, HOST, () => {
  console.log(`HexaForms running at http://${HOST}:${PORT}  (LOCAL ONLY — deliberately vulnerable lab)`);
  console.log('Test accounts: admin@hexaforms.local/Admin@123, nabila@hexaforms.local/Owner@123, rafi@hexaforms.local/Owner@123, tanvir@hexaforms.local/Member@123, demo@hexaforms.local/demo123');
});
