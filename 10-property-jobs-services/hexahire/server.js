'use strict';
/*
 * HexaHire — LAB 94 — HexaCyberLab vulnerable practice lab (LOCAL ONLY).
 * A deliberately vulnerable recruitment SaaS (candidates, pipelines, interviews,
 * scorecards, offers, documents) wrapped in the HexaCyberLab Lab System:
 * progress, tests, hints, Lab Coach, sequential key gate, certificate.
 * Zero dependencies. Binds 127.0.0.1 only. All data is fake and in-memory.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = 3103;
const LAB_NUMBER = 94;
const LAB_NAME = 'HexaHire';
const PREV_LAB = 93;
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const FILES_DIR = path.join(DIR, 'files');
const LOGO_FILE = path.join(DIR, 'logo.png');

/* ---- key material: stored ONLY as transformed fragments, assembled at runtime ---- */
const _ep = ["TC1YSA==","Qi00OQ==","RDMwSA==","LVZDNA==","U1VNQg==","S0VZUw=="];
function _assemble(parts) {
  return parts.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}
function entryKey() { return _assemble(_ep); }

/* ============================== SEED DATA (all fake) ============================== */
const companies = [
  { id: 1, name: 'NovaTech' },
  { id: 2, name: 'BrightLabs' }
];
let users = [
  { id: 1, name: 'Ada Admin',       email: 'admin@novatech.local',   password: 'adminpass1', role: 'admin',           companyId: 1, active: true,  resetIssued: false },
  { id: 2, name: 'Rita Recruiter',  email: 'rita@novatech.local',    password: 'rita123',    role: 'recruiter',       companyId: 1, active: true,  resetIssued: false },
  { id: 3, name: 'Henry Hiring',    email: 'henry@novatech.local',   password: 'henry123',   role: 'hiring_manager',  companyId: 1, active: true,  resetIssued: false },
  { id: 4, name: 'Ben Boss',        email: 'ben@brightlabs.local',   password: 'ben123',     role: 'admin',           companyId: 2, active: true,  resetIssued: false },
  { id: 5, name: 'Rachel Recruiter',email: 'rachel@brightlabs.local',password: 'rachel123',  role: 'recruiter',       companyId: 2, active: true,  resetIssued: false },
  { id: 6, name: 'Demo User',       email: 'demo@hexahire.local',    password: 'demo123',    role: 'recruiter',       companyId: 1, active: true,  resetIssued: false }
];
let nextUserId = 7;
const jobs = [
  { id: 101, title: 'Senior Backend Engineer', companyId: 1, band: '$120k-$150k', status: 'Open' },
  { id: 102, title: 'Product Designer',        companyId: 1, band: '$90k-$110k',  status: 'Open' },
  { id: 201, title: 'Data Analyst',            companyId: 2, band: '$80k-$100k',  status: 'Open' }
];
const candidates = [
  { id: 1001, name: 'Alice Applicant',   email: 'alice.c@test.local', companyId: 1, jobId: 101, stage: 'Interview', salaryExp: 140000, confidential: 0 },
  { id: 1002, name: 'Bob Builder',       email: 'bob.b@test.local',   companyId: 1, jobId: 101, stage: 'Applied',   salaryExp: 110000, confidential: 0 },
  { id: 1003, name: 'Carol Confidential',email: 'carol.c@test.local', companyId: 1, jobId: 102, stage: 'Screening', salaryExp: 160000, confidential: 1 },
  { id: 2001, name: 'Dave Data',         email: 'dave.d@test.local',  companyId: 2, jobId: 201, stage: 'Offer',     salaryExp: 95000,  confidential: 0 },
  { id: 2002, name: 'Erin Engineer',     email: 'erin.e@test.local',  companyId: 2, jobId: 201, stage: 'Screening', salaryExp: 88000,  confidential: 0 }
];
const documents = [
  { id: 3001, candidateId: 1001, filename: 'cv-alice.txt', label: 'CV - Alice Applicant' },
  { id: 3002, candidateId: 1002, filename: 'cv-bob.txt',   label: 'CV - Bob Builder' },
  { id: 3003, candidateId: 2001, filename: 'cv-dave.txt',  label: 'CV - Dave Data' }
];
let interviews = [
  { id: 501, candidateId: 1001, interviewerId: 3, when: '2026-10-24 10:00', scorecard: { by: 3, score: 4, feedback: 'Strong system design.' } },
  { id: 502, candidateId: 2001, interviewerId: 5, when: '2026-10-24 12:00', scorecard: { by: 5, score: 5, feedback: 'Excellent SQL skills.' } },
  { id: 503, candidateId: 1002, interviewerId: 3, when: '2026-10-25 09:00', scorecard: null }
];
let offers = [
  { id: 701, candidateId: 2001, salary: 95000, status: 'Sent' },
  { id: 702, candidateId: 1002, salary: 80000, status: 'Draft' }
];
const uploads = {};               // filename -> { content, type }
const sessions = new Map();       // sid -> { userId }
let nextSession = 1;
const failedLogins = {};          // email -> count (brute-force flaw: never locked)
const probedEmails = new Set();   // enumeration tracking
let probeSawExisting = false, probeSawMissing = false;

/* The reset token is COMPUTED from the user id — that predictability is the flaw. */
function resetTokenFor(user) { return 'HH' + user.id + '-' + (user.id * 149 + 37); }

/* ============================== TESTS REGISTRY ============================== */
const TESTS = [
  /* ---- Login & Authentication (standard family, complete) ---- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03:2021 - Injection', difficulty: 'Intermediate', loc: 'POST /login',
    hints: ['The login builds its query by gluing your input straight into a string.', "Try closing the email string early and adding a condition that is always true.", "Email: ' OR '1'='1' --  (with any password) comments out the password check."],
    lesson: 'String-built queries let an attacker rewrite the login logic itself — the password check can be commented out entirely.',
    impact: 'On a real client ATS, this means full account takeover of recruiter and admin accounts with no password at all — every candidate record behind them is exposed.',
    exploit: "POST /login with email `' OR '1'='1' -- ` and any password; a session is created without knowing any real password.",
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute Force - No Rate Limiting or Lockout', owasp: 'A07:2021 - Identification and Authentication Failures', difficulty: 'Beginner', loc: 'POST /login',
    hints: ['Keep guessing the same account\'s password. Does anything ever slow you down or lock the account?', 'Script 10+ wrong passwords for one account and watch the responses.', 'The 10th wrong attempt is processed exactly like the 1st — there is no throttle at all.'],
    lesson: 'Without rate limiting, lockout or CAPTCHA, online password guessing is only a matter of time and wordlists.',
    impact: 'Attackers can grind through common passwords against a client\'s recruiter accounts and walk into the whole hiring pipeline.',
    exploit: 'POST /login 10+ times with wrong passwords for one real account; every attempt is still processed.',
    report: { title: 'No Rate Limiting or Account Lockout on Login', severity: 'High', remediation: 'Add progressive delays, lockout after repeated failures, and alerting on credential-stuffing patterns.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User Enumeration via Login & Forgot-Password Responses', owasp: 'A07:2021 - Identification and Authentication Failures', difficulty: 'Beginner', loc: 'POST /login, POST /forgot',
    hints: ['Compare the error message for an email that exists with one that does not.', 'The forgot-password page answers differently too.', 'Probe at least 5 different emails across /login and /forgot and diff the responses.'],
    lesson: 'Different answers for "no such account" vs "wrong password" hand attackers a free list of valid accounts to target.',
    impact: 'A client\'s attacker can confirm which employee emails have accounts, then focus phishing and password attacks only on real targets.',
    exploit: 'Probe >=5 distinct emails via /login and /forgot; responses reveal which emails are registered.',
    report: { title: 'Account Enumeration via Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message ("if the account exists...") for login failures and password resets.' } },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Published Demo Credentials', owasp: 'A07:2021 - Identification and Authentication Failures', difficulty: 'Beginner', loc: 'GET /login',
    hints: ['Read the login page carefully — marketing put something helpful there.', 'A demo workspace is advertised right on the page.', 'Log in with the demo email and password printed on /login.'],
    lesson: 'Demo and default credentials printed in public are real credentials — anyone on the internet can use them.',
    impact: 'One public demo login gives an attacker a genuine foothold inside the client\'s ATS to explore, enumerate and escalate from.',
    exploit: 'Use the demo credentials printed on the login page to sign in.',
    report: { title: 'Demo Account Credentials Published on the Login Page', severity: 'High', remediation: 'Remove public demo credentials; give demos isolated, expiring, low-privilege accounts.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07:2021 - Identification and Authentication Failures', difficulty: 'Intermediate', loc: 'POST /reset',
    hints: ['Reset tokens here are not random — they are computed from something you can see.', 'Look at a user id (the team page and API make ids easy to find).', 'Token format: HH<id>-<id*149+37>. Compute it for a user who never requested a reset and POST /reset.'],
    lesson: 'A reset token that can be calculated from a public user id is not a secret at all — it is an account-takeover formula.',
    impact: 'Anyone who can see a recruiter\'s user id can reset that account\'s password and own the client\'s hiring data.',
    exploit: 'Compute HH<id>-<id*149+37> for a user who never requested a reset and POST /reset with it, then log in with the new password.',
    report: { title: 'Predictable Password Reset Tokens Allow Account Takeover', severity: 'Critical', remediation: 'Generate reset tokens from a CSPRNG, store only a hash, expire them quickly and make them single-use.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Session/Role Cookie Tampering', owasp: 'A01:2021 - Broken Access Control', difficulty: 'Intermediate', loc: 'GET /admin',
    hints: ['The app stores your role in a cookie — and some pages believe the cookie instead of the server-side session.', 'Log in as a non-admin, then look at your cookies.', 'Set the hx_role cookie to admin and open /admin.'],
    lesson: 'Authorization data kept on the client can be edited by the client. Roles must come from server-side session state, never from cookies.',
    impact: 'Any low-privilege user of the client\'s ATS can promote themselves to admin just by editing a cookie.',
    exploit: 'As a non-admin, set cookie hx_role=admin and GET /admin.',
    report: { title: 'Role Stored in a Client-Controlled Cookie Used for Authorization', severity: 'High', remediation: 'Derive authorization from the server-side session only; ignore role claims from cookies or request bodies.' } },
  /* ---- Registration & Profile ---- */
  { id: 'reg-weakpw', feature: 'Registration & Profile', name: 'Weak Password Policy (1-Character Passwords)', owasp: 'A07:2021 - Identification and Authentication Failures', difficulty: 'Beginner', loc: 'POST /register',
    hints: ['Try registering with the shortest password the form will accept.', 'There is no minimum length at all.', 'Register a new account with a 1-character password.'],
    lesson: 'A password policy that accepts "a" guarantees weak accounts that fall to the smallest wordlists.',
    impact: 'Client staff accounts with trivial passwords are the first domino in most breaches of tools like this.',
    exploit: 'POST /register with a 1-character password; the account is created.',
    report: { title: 'No Minimum Password Strength Enforced at Registration', severity: 'Medium', remediation: 'Enforce a minimum length (12+) and block known-breached passwords at registration and password change.' } },
  { id: 'reg-massassign', feature: 'Registration & Profile', name: 'Mass Assignment - Self-Assign Admin Role at Registration', owasp: 'A01:2021 - Broken Access Control', difficulty: 'Intermediate', loc: 'POST /register',
    hints: ['The registration handler copies fields from your request into the new user record.', 'The visible form only shows name/email/password — the handler accepts more.', 'Add role=admin to the registration POST and check your profile afterwards.'],
    lesson: 'Binding request bodies directly to data models lets attackers set fields the UI never offered — like role.',
    impact: 'Anyone can mint themselves an admin account in the client\'s ATS in one request — no exploit chain needed.',
    exploit: 'POST /register including role=admin; the new account really holds the admin role.',
    report: { title: 'Mass Assignment Allows Privilege Escalation at Registration', severity: 'Critical', remediation: 'Whitelist assignable fields per endpoint; never accept role/privilege fields from client input.' } },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03:2021 - Injection', difficulty: 'Beginner', loc: 'POST /register, GET /team',
    hints: ['Your display name is shown to the whole team — and rendered as raw HTML.', 'Register with a name that is also a small script payload.', 'Name: <script>alert(1)</script> — then open /team as anyone.'],
    lesson: 'Any field rendered unescaped becomes a delivery vehicle: one malicious profile attacks every colleague who views it.',
    impact: 'A stored payload in the client\'s ATS fires in recruiters\' and admins\' browsers — session theft and actions in their name.',
    exploit: 'Register (or rename) with a display name containing a script payload; it is stored and rendered raw on /team.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-encode all user-controlled output and sanitise stored rich text; add a Content-Security-Policy.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 - Broken Access Control', difficulty: 'Intermediate', loc: 'POST /profile',
    hints: ['The app plants a marker (hx_origin) on its own forms and pages. Real requests from the site carry it.', 'A state-changing POST without that marker should be rejected — is it?', 'POST /profile with your session cookie but no hx_origin marker anywhere and change the display name.'],
    lesson: 'State-changing endpoints must verify the request really came from your own pages — a marker/token the attacker cannot forge.',
    impact: 'A recruiter visiting a malicious page while logged in could have their ATS profile silently altered by the attacker\'s site.',
    exploit: 'POST /profile (name change) with a valid session but no hx_origin cookie/field; the change is accepted.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require an unpredictable anti-CSRF token on every state-changing request and verify Origin/Referer.' } }
];

TESTS.push(
  /* ---- Candidates ---- */
  { id: 'cand-idor', feature: 'Candidates', name: 'Candidate IDOR - Read Another Company\'s Candidate', owasp: 'A01:2021 - Broken Access Control', difficulty: 'Beginner', loc: 'GET /candidates/:id',
    hints: ['Candidate ids are sequential and the page only checks that you are logged in — not which company the candidate belongs to.', 'Your company has candidates 1001-1003. Another company\'s start at 2001.', 'Open /candidates/2001 while logged in as a NovaTech user.'],
    lesson: 'Checking "is logged in" is not authorization. Every object access must verify the object belongs to the caller\'s tenant.',
    impact: 'A client using this ATS leaks rival companies\' candidate pools — names, emails, salary expectations — to any authenticated user.',
    exploit: 'As a company-1 user, GET /candidates/2001 (a company-2 candidate) and read the full profile.',
    report: { title: 'Insecure Direct Object Reference on Candidate Profiles (Cross-Tenant)', severity: 'High', remediation: 'Scope every query by the caller\'s tenant/company and return 404 for objects outside it.' } },
  { id: 'cand-doc-idor', feature: 'Candidates', name: 'Candidate CV Download IDOR', owasp: 'A01:2021 - Broken Access Control', difficulty: 'Beginner', loc: 'GET /candidates/:id/documents/:docId',
    hints: ['Document downloads are nested under candidates, but the check is missing there too.', 'Dave\'s CV is document 3003 under candidate 2001.', 'GET /candidates/2001/documents/3003 as a NovaTech user.'],
    lesson: 'Authorization must be enforced on every route — including file downloads nested under an object.',
    impact: 'CVs contain personal data (emails, phone numbers, work history). Cross-tenant CV access is a personal-data breach for the client.',
    exploit: 'As a company-1 user, download document 3003 belonging to a company-2 candidate.',
    report: { title: 'Insecure Direct Object Reference on Candidate Document Downloads', severity: 'High', remediation: 'Verify document -> candidate -> tenant ownership on every download request.' } },
  { id: 'cand-stage', feature: 'Candidates', name: 'Pipeline Stage Skipping (Applied Straight to Hired)', owasp: 'A01:2021 - Broken Access Control', difficulty: 'Intermediate', loc: 'POST /candidates/:id/stage',
    hints: ['The stage-change endpoint accepts any stage name you send.', 'There is no check that interviews or scorecards ever happened.', 'POST stage=Hired for an Applied candidate (e.g. 1002).'],
    lesson: 'Workflow rules are security rules: if the server does not enforce stage order, the whole screening process can be bypassed.',
    impact: 'An insider (or hijacked account) can push an unscreened candidate straight to Hired in the client\'s pipeline, defeating every control before it.',
    exploit: 'POST /candidates/1002/stage with stage=Hired while the candidate is still at Applied.',
    report: { title: 'Missing Workflow Validation Allows Pipeline Stage Skipping', severity: 'Medium', remediation: 'Enforce a server-side state machine for pipeline stages, including required artefacts (scorecards) per transition.' } },
  /* ---- Search & Jobs ---- */
  { id: 'search-sqli', feature: 'Search & Jobs', name: 'SQL Injection in Candidate Search', owasp: 'A03:2021 - Injection', difficulty: 'Intermediate', loc: 'GET /search',
    hints: ['Search builds one big string query: name pattern, confidential flag and your company id all glued together.', 'A comment sequence can cut off the filters glued after your input.', "Search for: ' OR '1'='1' --  and see who shows up."],
    lesson: 'Injection in search is worse than a broken search box: it turns the query against the filters that were supposed to hide data.',
    impact: 'Confidential executive-search candidates and other tenants\' pipelines — the data the client most needs to protect — are dumped through a search box.',
    exploit: "GET /search?q=' OR '1'='1' --  returns confidential and other-company candidates.",
    report: { title: 'SQL Injection in Candidate Search Bypasses Tenant and Confidentiality Filters', severity: 'Critical', remediation: 'Parameterise the search query and apply tenant/confidentiality filters in code, not in the query string.' } },
  { id: 'search-xss', feature: 'Search & Jobs', name: 'Reflected XSS in Search', owasp: 'A03:2021 - Injection', difficulty: 'Beginner', loc: 'GET /search',
    hints: ['The results page repeats your search text back to you.', 'It does not encode it first.', 'Search for <script>alert(1)</script> and view the page source.'],
    lesson: 'Reflected input is still stored in the victim\'s browser the moment it renders — encoding on output is the fix.',
    impact: 'A crafted search link sent to a client recruiter executes script in their ATS session when clicked.',
    exploit: 'GET /search?q=<script>alert(1)</script> reflects the payload unescaped in the response.',
    report: { title: 'Reflected Cross-Site Scripting in Search Results', severity: 'Medium', remediation: 'HTML-encode all reflected user input in responses.' } },
  { id: 'job-edit-idor', feature: 'Search & Jobs', name: 'Edit Another Company\'s Job Posting', owasp: 'A01:2021 - Broken Access Control', difficulty: 'Intermediate', loc: 'POST /jobs/:id/edit',
    hints: ['The job edit endpoint trusts the job id in the URL.', 'BrightLabs\' Data Analyst job is id 201.', 'POST /jobs/201/edit as a NovaTech user and change its title or salary band.'],
    lesson: 'Write endpoints need ownership checks just as much as reads — a missing check on edit is silent sabotage of another tenant.',
    impact: 'A competitor or malicious user can rewrite the client\'s job ads — titles, salary bands — damaging hiring and reputation.',
    exploit: 'As a company-1 user, POST /jobs/201/edit changing a company-2 job; the change is applied.',
    report: { title: 'Missing Ownership Check Allows Editing Other Tenants\' Job Postings', severity: 'High', remediation: 'Check tenant ownership on every mutating job endpoint; log cross-tenant attempts.' } },
  /* ---- Interviews & Scorecards ---- */
  { id: 'int-idor', feature: 'Interviews & Scorecards', name: 'Interview & Scorecard IDOR', owasp: 'A01:2021 - Broken Access Control', difficulty: 'Beginner', loc: 'GET /interviews/:id',
    hints: ['Interview pages follow the same id pattern — and the same missing tenant check.', 'Interview 502 belongs to BrightLabs\' candidate Dave.', 'Open /interviews/502 as a NovaTech user and read the scorecard.'],
    lesson: 'Interview feedback is among the most sensitive data in hiring — candid assessments that must never cross tenants.',
    impact: 'Leaked scorecards expose brutally honest internal opinions about candidates — a legal and reputational risk for the client.',
    exploit: 'As a company-1 user, GET /interviews/502 and read another company\'s scorecard.',
    report: { title: 'Insecure Direct Object Reference on Interviews and Scorecards', severity: 'High', remediation: 'Scope interview access by tenant and interviewer assignment.' } },
  { id: 'int-score-tamper', feature: 'Interviews & Scorecards', name: 'Scorecard Tampering - Score an Interview You Did Not Conduct', owasp: 'A01:2021 - Broken Access Control', difficulty: 'Intermediate', loc: 'POST /interviews/:id/scorecard',
    hints: ['The scorecard endpoint never asks whether YOU were the assigned interviewer.', 'Interview 503 is assigned to Henry. You are not Henry.', 'POST a scorecard for interview 503 as Rita and watch it save.'],
    lesson: 'Business rules like "only the interviewer can score" are authorization rules — the server must enforce them.',
    impact: 'Anyone can fabricate glowing (or damning) scorecards in the client\'s ATS, corrupting hiring decisions.',
    exploit: 'POST /interviews/503/scorecard as a user who is not the assigned interviewer; the scorecard is stored.',
    report: { title: 'Missing Authorization on Scorecard Submission', severity: 'High', remediation: 'Only the assigned interviewer (or an admin) may create or modify a scorecard; keep an audit trail.' } },
  /* ---- Offers ---- */
  { id: 'offer-idor', feature: 'Offers', name: 'Offer Letter IDOR', owasp: 'A01:2021 - Broken Access Control', difficulty: 'Beginner', loc: 'GET /offers/:id',
    hints: ['Offer letters live at predictable ids too.', 'Offer 701 belongs to BrightLabs\' candidate Dave.', 'Open /offers/701 as a NovaTech user and read the salary.'],
    lesson: 'Offer letters concentrate the most negotiable secret in hiring — the exact salary. Predictable ids + no tenant check = public salaries.',
    impact: 'Competitors learning the client\'s exact offer amounts can outbid every hire — a direct commercial loss.',
    exploit: 'As a company-1 user, GET /offers/701 and read another company\'s offer salary.',
    report: { title: 'Insecure Direct Object Reference on Offer Letters', severity: 'High', remediation: 'Scope offers by tenant; use unguessable identifiers as defence-in-depth.' } },
  { id: 'offer-tamper', feature: 'Offers', name: 'Offer Salary / Status Tampering', owasp: 'A01:2021 - Broken Access Control', difficulty: 'Intermediate', loc: 'POST /offers/:id/update',
    hints: ['The offer update endpoint accepts salary and status straight from the request.', 'Accepting an offer is supposed to be the candidate\'s move.', 'POST /offers/702/update with a new salary or status=Accepted.'],
    lesson: 'Financial fields and lifecycle status must be server-controlled with role checks — whoever can edit the salary owns the negotiation.',
    impact: 'A tampered offer can commit the client to the wrong salary, or fake an acceptance that triggers onboarding and costs.',
    exploit: 'POST /offers/702/update changing the salary, or setting status=Accepted; the change is stored.',
    report: { title: 'Missing Authorization and Validation on Offer Updates', severity: 'High', remediation: 'Restrict offer edits by role and state; only the candidate can accept, via a signed single-use link.' } },
  /* ---- Documents & Files ---- */
  { id: 'doc-upload', feature: 'Documents & Files', name: 'Unrestricted File Upload - HTML Served from the App', owasp: 'A08:2021 - Software and Data Integrity Failures', difficulty: 'Intermediate', loc: 'POST /upload, GET /uploads/:name',
    hints: ['Uploads accept any filename and content, and serve them back from the app\'s own origin.', 'An .html file is served as text/html — the browser will run its script.', 'Upload evil.html with a script payload, then open /uploads/evil.html.'],
    lesson: 'If user uploads are served from your domain with their chosen content type, your domain hosts the attacker\'s page.',
    impact: 'Phishing pages and script hosted on the client\'s own ATS domain inherit its trust and its users\' sessions.',
    exploit: 'Upload an .html file containing a script payload, then GET it from /uploads/ and receive it as text/html.',
    report: { title: 'Unrestricted File Upload with Content Served from Application Origin', severity: 'High', remediation: 'Whitelist file types, verify content, store uploads outside the web root and serve via a separate domain with Content-Disposition: attachment.' } },
  { id: 'doc-traversal', feature: 'Documents & Files', name: 'Path Traversal on File Download', owasp: 'A01:2021 - Broken Access Control', difficulty: 'Intermediate', loc: 'GET /download',
    hints: ['The download endpoint joins your file parameter onto the files folder without checking where it lands.', 'Dot-dot segments are not stripped.', 'GET /download?file=../server.js and read the application source.'],
    lesson: 'Any user-controlled path must be normalised and confined to its base directory — otherwise the whole filesystem is the download folder.',
    impact: 'Source code, configuration and secrets on the client\'s server become downloadable — the keys to every other attack.',
    exploit: 'GET /download?file=../server.js returns the server source.',
    report: { title: 'Path Traversal in File Download Endpoint', severity: 'High', remediation: 'Resolve the requested path and verify it stays inside the intended directory; whitelist downloadable file ids instead of paths.' } },
  /* ---- Admin Panel ---- */
  { id: 'admin-bac', feature: 'Admin Panel', name: 'Admin User Data Served to Any Logged-In User', owasp: 'A01:2021 - Broken Access Control', difficulty: 'Beginner', loc: 'GET /admin/users.json',
    hints: ['One admin endpoint only checks that *someone* is logged in.', 'It returns the user table as JSON — passwords included.', 'GET /admin/users.json as a plain recruiter.'],
    lesson: 'Sensitive endpoints hide behind innocent-looking URLs. If it returns admin data, it must require admin — every time, on the server.',
    impact: 'Every user password in the client\'s ATS is one request away for the lowliest account — total compromise.',
    exploit: 'As a non-admin user, GET /admin/users.json and receive all users including passwords.',
    report: { title: 'Broken Access Control on Admin User Export (Passwords Exposed)', severity: 'Critical', remediation: 'Require an admin role server-side for user exports; never include password material in API responses.' } },
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'CSRF on Admin User Deactivation', owasp: 'A01:2021 - Broken Access Control', difficulty: 'Intermediate', loc: 'POST /admin/deactivate',
    hints: ['Admin actions use the same marker scheme as the profile form — and it is not verified here either.', 'You need admin access (your own admin account, or the role cookie).', 'POST /admin/deactivate for a user id with no hx_origin marker anywhere.'],
    lesson: 'The more powerful the action, the more dangerous a missing CSRF check: one malicious page can fire an admin\'s browser at it.',
    impact: 'An attacker page visited by the client\'s admin silently deactivates user accounts — a denial of service against the whole hiring team.',
    exploit: 'As an admin, POST /admin/deactivate without the hx_origin marker; the user is deactivated.',
    report: { title: 'Missing CSRF Protection on Administrative User Deactivation', severity: 'Medium', remediation: 'Verify anti-CSRF tokens on all administrative state-changing endpoints.' } },
  /* ---- Platform & API ---- */
  { id: 'api-token', feature: 'Platform & API', name: 'Weak API Token - Base64 of the User\'s Email', owasp: 'A07:2021 - Identification and Authentication Failures', difficulty: 'Intermediate', loc: 'GET /api/candidates',
    hints: ['The API accepts an X-Api-Key header instead of a session.', 'The "key" is derived from something public about the user.', 'Send X-Api-Key with the base64 encoding of a user\'s email — no cookies.'],
    lesson: 'An API key must be an unguessable secret. Encoding a public identifier is not a key, it is a label.',
    impact: 'Anyone who knows a recruiter\'s email address has full API access to the client\'s candidate pipeline.',
    exploit: 'GET /api/candidates with header X-Api-Key = base64(email) and no session cookie; candidate data is returned.',
    report: { title: 'API Authentication Uses Base64-Encoded Email as the Token', severity: 'High', remediation: 'Issue random, per-user API secrets; store hashes, support rotation and revocation.' } },
  { id: 'api-debug', feature: 'Platform & API', name: 'Unauthenticated Debug Endpoint Dumps All Users', owasp: 'A05:2021 - Security Misconfiguration', difficulty: 'Beginner', loc: 'GET /api/debug',
    hints: ['Developers left something behind for debugging.', 'It needs no login at all.', 'Open /api/debug in a private window (or curl it with no cookies).'],
    lesson: 'Debug endpoints ship to production more often than anyone admits — and they usually dump the crown jewels.',
    impact: 'The entire user table, passwords included, is public on the client\'s ATS to anyone who guesses one URL.',
    exploit: 'GET /api/debug with no session returns all users including passwords.',
    report: { title: 'Unauthenticated Debug Endpoint Exposes Full User Table', severity: 'Critical', remediation: 'Remove debug/diagnostic endpoints from production builds; gate any retained tooling behind admin auth and network restrictions.' } }
);

/* ============================== PROGRESS ENGINE ============================== */
const FEATURES = [...new Set(TESTS.map(t => t.feature))];
function defaultProgress() { return { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false }; }
let progress = (() => {
  try { const p = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); return Object.assign(defaultProgress(), p); }
  catch (e) { return defaultProgress(); }
})();
function saveProgress() { try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2)); } catch (e) {} }
saveProgress();
function pass(id) {
  if (!TESTS.some(t => t.id === id) || progress.tests[id]) return;
  progress.tests[id] = true;
  if (TESTS.every(t => progress.tests[t.id])) {
    progress.completedAt = new Date().toISOString();
    progress.keyRevealed = true;
  }
  saveProgress();
}
function attempt(feature) { progress.attempts[feature] = (progress.attempts[feature] || 0) + 1; saveProgress(); }
function doneCount() { return TESTS.filter(t => progress.tests[t.id]).length; }
function isComplete() { return doneCount() === TESTS.length; }
function progressJSON() {
  const features = {};
  for (const f of FEATURES) {
    features[f] = {
      total: TESTS.filter(t => t.feature === f).length,
      done: TESTS.filter(t => t.feature === f && progress.tests[t.id]).length,
      attempts: progress.attempts[f] || 0
    };
  }
  const done = doneCount();
  return { lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done, pct: Math.floor(done / TESTS.length * 100), features, complete: isComplete() };
}

/* ============================== HELPERS ============================== */
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
const XSS_RE = /<script|onerror\s*=|onload\s*=|<svg|<img|<iframe|javascript:/i;
function hasXss(s) { return typeof s === 'string' && XSS_RE.test(s); }
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) { const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); }
  return out;
}
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 2e6) req.destroy(); });
    req.on('end', () => {
      const type = req.headers['content-type'] || '';
      if (type.includes('application/json')) { try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); } }
      else { const o = {}; for (const [k, v] of new URLSearchParams(data)) o[k] = v; resolve(o); }
    });
    req.on('error', () => resolve({}));
  });
}
function currentUser(req) {
  const sid = parseCookies(req).hx_session;
  const s = sid && sessions.get(sid);
  if (!s) return null;
  return users.find(u => u.id === s.userId && u.active) || null;
}
function hasMarker(req, body) {
  if (body && body.hx_origin) return true;
  return !!parseCookies(req).hx_origin;
}
/* --- tiny string-built-query evaluator: the SQLi flaw, faithfully simulated --- */
function operandVal(row, s) {
  s = String(s).trim();
  if (s.startsWith("'")) { const e = s.lastIndexOf("'"); return e > 0 ? s.slice(1, e) : s.slice(1); }
  if (/^-?\d+$/.test(s)) return s;
  const v = row[s];
  return v === undefined ? '' : String(v);
}
function evalTerm(row, term) {
  term = String(term).trim().replace(/^\(+|\)+$/g, '').trim();
  if (!term) return false;
  try {
    const likeAt = term.toUpperCase().indexOf(' LIKE ');
    if (likeAt > 0) {
      const left = operandVal(row, term.slice(0, likeAt));
      const pat = operandVal(row, term.slice(likeAt + 6)).replace(/^%+|%+$/g, '');
      return left.toLowerCase().includes(pat.toLowerCase());
    }
    const eq = term.indexOf('=');
    if (eq > 0) return operandVal(row, term.slice(0, eq)) === operandVal(row, term.slice(eq + 1));
    if (term === '1') return true;
  } catch (e) {}
  return false;
}
function sqlQuery(rows, where) {
  let w = String(where);
  const ci = w.indexOf('--'); if (ci >= 0) w = w.slice(0, ci);
  const orGroups = w.split(/\s+OR\s+/i);
  return rows.filter(row => orGroups.some(g => g.split(/\s+AND\s+/i).every(t => evalTerm(row, t))));
}

/* ============================== PAGE LAYOUT + CHAT WIDGET ============================== */
function chatWidget() {
  return `<div id="hxchat" style="position:fixed;right:16px;bottom:16px;width:320px;max-width:92vw;background:#111827;color:#e5e7eb;border:1px solid #374151;border-radius:12px;font-family:system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.45);z-index:9999">
  <div style="padding:10px 12px;border-bottom:1px solid #374151;font-weight:700">Lab Coach — ${LAB_NAME}</div>
  <div id="hxlog" style="height:200px;overflow-y:auto;padding:10px 12px;font-size:13px;line-height:1.45"></div>
  <form id="hxform" style="display:flex;border-top:1px solid #374151">
    <input id="hxinput" autocomplete="off" placeholder="Ask the coach..." style="flex:1;background:#1f2937;border:0;color:#fff;padding:10px;font-size:13px">
    <button style="background:#2563eb;color:#fff;border:0;padding:0 14px;cursor:pointer">Send</button>
  </form></div>
<script>
(function(){
  var log=document.getElementById('hxlog'), form=document.getElementById('hxform'), input=document.getElementById('hxinput');
  function add(who,text){ var d=document.createElement('div'); d.style.margin='6px 0'; d.innerHTML='<b>'+who+':</b> '; d.appendChild(document.createTextNode(text)); log.appendChild(d); log.scrollTop=log.scrollHeight; }
  add('Coach','Hi! I am the ${LAB_NAME} Lab Coach. Ask me how many tests a feature has, or ask for help after you have tried a feature at least 3 times.');
  form.addEventListener('submit', function(e){ e.preventDefault(); var m=input.value.trim(); if(!m) return; input.value=''; add('You',m);
    fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})}).then(function(r){return r.json();}).then(function(j){ add('Coach', j.reply||'...'); }).catch(function(){ add('Coach','Connection hiccup — try again.'); });
  });
})();
</script>`;
}
function layout(title, user, body) {
  const p = progressJSON();
  const pct = p.pct;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — ${LAB_NAME} (LAB ${LAB_NUMBER})</title>
<style>body{font-family:system-ui,sans-serif;margin:0;background:#f8fafc;color:#0f172a}header{background:#0f172a;color:#fff;padding:10px 18px;display:flex;gap:14px;align-items:center;flex-wrap:wrap}header img{height:36px;background:#fff;border-radius:6px;padding:2px}header .bar{flex:1;min-width:180px;background:#334155;border-radius:6px;height:14px;overflow:hidden}header .fill{height:100%;background:linear-gradient(90deg,#2563eb,#7c3aed);width:${pct}%}main{max-width:980px;margin:0 auto;padding:20px}nav a{color:#bfdbfe;margin-right:12px;text-decoration:none}table{border-collapse:collapse;width:100%;background:#fff}td,th{border:1px solid #e2e8f0;padding:7px 9px;text-align:left;font-size:14px}input,select,textarea{padding:7px;border:1px solid #cbd5e1;border-radius:6px}button{background:#2563eb;color:#fff;border:0;padding:8px 14px;border-radius:6px;cursor:pointer}.card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:12px 0}.err{color:#b91c1c}.ok{color:#15803d}details{margin:4px 0}</style></head>
<body><header><img src="/logo.png" alt="HexaCyberLab"><div><b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b><br><small>LAB ${LAB_NUMBER} · ${p.done}/${p.total} tests · ${pct}%</small></div><div class="bar"><div class="fill"></div></div>
<nav>${user ? `<a href="/">Dashboard</a><a href="/candidates">Candidates</a><a href="/jobs">Jobs</a><a href="/interviews">Interviews</a><a href="/search">Search</a><a href="/team">Team</a><a href="/tests">Mission Board</a><a href="/profile">${esc(user.name)}</a><a href="/logout">Log out</a>` : `<a href="/login">Login</a><a href="/register">Register</a><a href="/tests">Mission Board</a>`}</nav></header>
<main>${body}</main>${chatWidget()}</body></html>`;
}
function gatePage() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Locked — LAB ${LAB_NUMBER} ${LAB_NAME}</title>
<style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#e5e7eb;display:flex;justify-content:center;padding:40px}.card{background:#111827;border:1px solid #374151;border-radius:12px;padding:28px;max-width:520px}input{padding:9px;border-radius:6px;border:1px solid #374151;background:#1f2937;color:#fff;width:100%;box-sizing:border-box}button{background:#2563eb;color:#fff;border:0;padding:10px 16px;border-radius:6px;cursor:pointer;margin-top:10px}img{height:44px;background:#fff;border-radius:6px;padding:3px}</style></head>
<body><div class="card"><img src="/logo.png" alt="HexaCyberLab"><h2>🔒 LAB ${LAB_NUMBER} — ${LAB_NAME} is locked</h2>
<p>This lab is locked. Paste the completion key from Lab ${PREV_LAB} to start.</p>
<form method="POST" action="/unlock"><input name="key" placeholder="Completion key from Lab ${PREV_LAB}" autocomplete="off"><button type="submit">Unlock Lab ${LAB_NUMBER}</button></form>
<p style="font-size:13px;color:#9ca3af">Sequential unlock: each HexaCyberLab lab opens only with the key earned by completing the previous lab at 100%.</p></div>${chatWidget()}</body></html>`;
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function redirect(res, to, extraHeaders) {
  res.writeHead(302, Object.assign({ Location: to }, extraHeaders || {}));
  res.end();
}

/* ============================== ROUTE HELPERS ============================== */
function originCookie(res) { res.setHeader('Set-Cookie', 'hx_origin=1; Path=/'); }
function loginCookies(res, user) {
  const sid = 's' + (nextSession++) + Date.now().toString(36);
  sessions.set(sid, { userId: user.id });
  res.setHeader('Set-Cookie', [
    'hx_session=' + sid + '; Path=/; HttpOnly',
    'hx_role=' + encodeURIComponent(user.role) + '; Path=/',
    'hx_origin=1; Path=/'
  ]);
  return sid;
}
function trackProbe(email) {
  if (!email) return;
  probedEmails.add(email);
  if (users.some(u => u.email === email)) probeSawExisting = true; else probeSawMissing = true;
  if (probedEmails.size >= 5 && probeSawExisting && probeSawMissing) pass('auth-enum');
}

/* ============================== AUTH ROUTES ============================== */
function loginPage(req, res, error) {
  originCookie(res);
  send(res, 200, layout('Login', null, `<h2>Sign in to ${LAB_NAME}</h2>
  ${error ? `<p class="err">${esc(error)}</p>` : ''}
  <form method="POST" action="/login"><p>Email<br><input name="email" size="34"></p>
  <p>Password<br><input name="password" type="password" size="34"></p>
  <p><button>Sign in</button></p></form>
  <div class="card"><b>Try the demo workspace:</b> email <code>demo@hexahire.local</code> · password <code>demo123</code></div>
  <p><a href="/forgot">Forgot your password?</a> · <a href="/register">Create an account</a></p>`));
}
async function loginPost(req, res) {
  const body = await readBody(req);
  attempt('Login & Authentication');
  trackProbe(body.email);
  const q = `email='${body.email || ''}' AND password='${body.password || ''}'`;
  const match = sqlQuery(users, q)[0];
  if (match && match.active) {
    if (body.password !== match.password) pass('auth-sqli');
    if (match.email === 'demo@hexahire.local' && body.password === 'demo123') pass('auth-default');
    loginCookies(res, match);
    return redirect(res, '/');
  }
  const exists = users.some(u => u.email === body.email);
  if (exists) {
    failedLogins[body.email] = (failedLogins[body.email] || 0) + 1;
    if (failedLogins[body.email] >= 10) pass('auth-brute');
  }
  loginPage(req, res, exists ? 'Incorrect password.' : 'No account found for that email.');
}
function registerPage(req, res, error) {
  originCookie(res);
  send(res, 200, layout('Register', null, `<h2>Create your ${LAB_NAME} account</h2>
  ${error ? `<p class="err">${esc(error)}</p>` : ''}
  <form method="POST" action="/register"><p>Display name<br><input name="name" size="34"></p>
  <p>Email<br><input name="email" size="34"></p>
  <p>Password<br><input name="password" type="password" size="34"></p>
  <p><button>Create account</button></p></form>`));
}
async function registerPost(req, res) {
  const body = await readBody(req);
  attempt('Registration & Profile');
  if (!body.email || !body.password || !body.name) return registerPage(req, res, 'All fields are required.');
  if (users.some(u => u.email === body.email)) return registerPage(req, res, 'That email is already registered.');
  const user = {
    id: nextUserId++, name: String(body.name), email: String(body.email), password: String(body.password),
    role: body.role ? String(body.role) : 'recruiter',
    companyId: body.companyId ? Number(body.companyId) : 1,
    active: true, resetIssued: false
  };
  users.push(user);
  if (user.password.length < 4) pass('reg-weakpw');
  if (body.role && String(body.role) !== 'recruiter') pass('reg-massassign');
  if (hasXss(user.name)) pass('reg-xss');
  loginCookies(res, user);
  redirect(res, '/');
}
function forgotPage(req, res, msg) {
  originCookie(res);
  send(res, 200, layout('Forgot password', null, `<h2>Forgot your password?</h2>
  ${msg ? `<p>${esc(msg)}</p>` : ''}
  <form method="POST" action="/forgot"><p>Email<br><input name="email" size="34"></p><p><button>Send reset link</button></p></form>
  <p><a href="/reset">I already have a reset token</a></p>`));
}
async function forgotPost(req, res) {
  const body = await readBody(req);
  attempt('Login & Authentication');
  trackProbe(body.email);
  const user = users.find(u => u.email === body.email);
  if (!user) return forgotPage(req, res, 'No account found for that email.');
  user.resetIssued = true;
  forgotPage(req, res, 'Reset link sent to your email. (In this local lab the simulated inbox is not shown — the token scheme is the lesson.)');
}
function resetPage(req, res, msg, isErr) {
  originCookie(res);
  send(res, 200, layout('Reset password', null, `<h2>Reset your password</h2>
  ${msg ? `<p class="${isErr ? 'err' : 'ok'}">${esc(msg)}</p>` : ''}
  <form method="POST" action="/reset"><p>Email<br><input name="email" size="34"></p>
  <p>Reset token<br><input name="token" size="34"></p>
  <p>New password<br><input name="newpassword" type="password" size="34"></p>
  <p><button>Set new password</button></p></form>`));
}
async function resetPost(req, res) {
  const body = await readBody(req);
  attempt('Login & Authentication');
  const user = users.find(u => u.email === body.email);
  if (!user) return resetPage(req, res, 'No account found for that email.', true);
  if (String(body.token || '') !== resetTokenFor(user)) return resetPage(req, res, 'Invalid reset token.', true);
  if (!user.resetIssued) pass('auth-reset');
  user.password = String(body.newpassword || '');
  user.resetIssued = false;
  resetPage(req, res, 'Password updated. You can now sign in with the new password.');
}

/* ============================== PROFILE & TEAM ============================== */
function profilePage(req, res, user, msg) {
  originCookie(res);
  send(res, 200, layout('Profile', user, `<h2>Your profile</h2>
  ${msg ? `<p class="ok">${esc(msg)}</p>` : ''}
  <table><tr><th>Name</th><td>${esc(user.name)}</td></tr><tr><th>Email</th><td>${esc(user.email)}</td></tr>
  <tr><th>Role</th><td>${esc(user.role)}</td></tr><tr><th>Company</th><td>${esc((companies.find(c => c.id === user.companyId) || {}).name || '')}</td></tr>
  <tr><th>User ID</th><td>${user.id}</td></tr></table>
  <div class="card"><h3>Update profile</h3>
  <form method="POST" action="/profile"><input type="hidden" name="hx_origin" value="1">
  <p>Display name<br><input name="name" size="34" value="${esc(user.name)}"></p>
  <p><button>Save</button></p></form></div>`));
}
async function profilePost(req, res, user) {
  const body = await readBody(req);
  attempt('Registration & Profile');
  if (!hasMarker(req, body)) pass('reg-csrf');
  if (body.name) { user.name = String(body.name); if (hasXss(user.name)) pass('reg-xss'); }
  profilePage(req, res, user, 'Profile saved.');
}
function teamPage(req, res, user) {
  originCookie(res);
  const mates = users.filter(u => u.companyId === user.companyId);
  // NOTE (the flaw): display names are rendered RAW here — stored XSS delivery point.
  send(res, 200, layout('Team', user, `<h2>Your team — ${esc((companies.find(c => c.id === user.companyId) || {}).name || '')}</h2>
  <table><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th></tr>
  ${mates.map(u => `<tr><td>${u.id}</td><td>${u.name}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td></tr>`).join('')}</table>`));
}

/* ============================== CANDIDATES / DOCUMENTS ============================== */
function candidatesPage(req, res, user) {
  originCookie(res);
  const list = candidates.filter(c => c.companyId === user.companyId);
  send(res, 200, layout('Candidates', user, `<h2>Candidates</h2>
  <table><tr><th>ID</th><th>Name</th><th>Job</th><th>Stage</th><th></th></tr>
  ${list.map(c => `<tr><td>${c.id}</td><td>${esc(c.name)}</td><td>${esc((jobs.find(j => j.id === c.jobId) || {}).title || '')}</td><td>${esc(c.stage)}</td><td><a href="/candidates/${c.id}">Open</a></td></tr>`).join('')}</table>`));
}
function candidatePage(req, res, user, cand) {
  originCookie(res);
  if (cand.companyId !== user.companyId) pass('cand-idor');
  const docs = documents.filter(d => d.candidateId === cand.id);
  send(res, 200, layout('Candidate', user, `<h2>${esc(cand.name)}</h2>
  <table><tr><th>Email</th><td>${esc(cand.email)}</td></tr><tr><th>Company</th><td>${esc((companies.find(c => c.id === cand.companyId) || {}).name || '')}</td></tr>
  <tr><th>Stage</th><td>${esc(cand.stage)}</td></tr><tr><th>Salary expectation</th><td>$${cand.salaryExp}</td></tr>
  <tr><th>Confidential</th><td>${cand.confidential ? 'Yes' : 'No'}</td></tr></table>
  <div class="card"><h3>Documents</h3>${docs.length ? docs.map(d => `<p><a href="/candidates/${cand.id}/documents/${d.id}">${esc(d.label)}</a></p>`).join('') : '<p>No documents.</p>'}</div>
  <div class="card"><h3>Move pipeline stage</h3>
  <form method="POST" action="/candidates/${cand.id}/stage"><select name="stage"><option>Applied</option><option>Screening</option><option>Interview</option><option>Offer</option><option>Hired</option><option>Rejected</option></select>
  <button>Move</button></form></div>`));
}
function docDownload(req, res, user, candId, docId) {
  attempt('Candidates');
  const doc = documents.find(d => d.id === Number(docId));
  if (!doc) return send(res, 404, 'Document not found');
  const cand = candidates.find(c => c.id === doc.candidateId);
  if (cand && cand.companyId !== user.companyId) pass('cand-doc-idor');
  fs.readFile(path.join(FILES_DIR, doc.filename), 'utf8', (err, data) => {
    if (err) return send(res, 404, 'File missing');
    send(res, 200, data, 'text/plain; charset=utf-8');
  });
}
function downloadRoute(req, res, user, url) {
  attempt('Documents & Files');
  const file = url.searchParams.get('file') || '';
  const target = path.resolve(FILES_DIR, file);
  fs.readFile(target, 'utf8', (err, data) => {
    if (err) return send(res, 404, 'File not found');
    if (!target.startsWith(FILES_DIR + path.sep)) pass('doc-traversal');
    send(res, 200, data, 'text/plain; charset=utf-8');
  });
}
function uploadPage(req, res, user, msg) {
  originCookie(res);
  send(res, 200, layout('Upload', user, `<h2>Upload a candidate file</h2>
  ${msg ? `<p class="ok">${esc(msg)}</p>` : ''}
  <form method="POST" action="/upload"><p>Filename<br><input name="filename" size="34" placeholder="cv.txt"></p>
  <p>Content<br><textarea name="content" rows="5" cols="40"></textarea></p><p><button>Upload</button></p></form>
  <p>Uploaded files are served from <code>/uploads/&lt;filename&gt;</code>.</p>`));
}
async function uploadPost(req, res, user) {
  const body = await readBody(req);
  attempt('Documents & Files');
  const name = String(body.filename || '').split('/').pop();
  if (!name) return uploadPage(req, res, user);
  uploads[name] = { content: String(body.content || '') };
  uploadPage(req, res, user, 'Stored. Open it at /uploads/' + name);
}
function serveUpload(req, res, name) {
  const up = uploads[name];
  if (!up) return send(res, 404, 'Not found');
  const lower = name.toLowerCase();
  if (lower.endsWith('.html') || lower.endsWith('.htm')) { pass('doc-upload'); return send(res, 200, up.content, 'text/html; charset=utf-8'); }
  if (lower.endsWith('.svg')) { pass('doc-upload'); return send(res, 200, up.content, 'image/svg+xml'); }
  send(res, 200, up.content, 'text/plain; charset=utf-8');
}

/* ============================== JOBS & SEARCH ============================== */
function jobsPage(req, res, user) {
  originCookie(res);
  const list = jobs.filter(j => j.companyId === user.companyId);
  send(res, 200, layout('Jobs', user, `<h2>Your jobs</h2>
  <table><tr><th>ID</th><th>Title</th><th>Salary band</th><th>Status</th><th></th></tr>
  ${list.map(j => `<tr><td>${j.id}</td><td>${esc(j.title)}</td><td>${esc(j.band)}</td><td>${esc(j.status)}</td><td><a href="/jobs/${j.id}">View / edit</a></td></tr>`).join('')}</table>`));
}
function jobPage(req, res, user, job) {
  originCookie(res);
  send(res, 200, layout('Job', user, `<h2>${esc(job.title)}</h2>
  <p>Company: ${esc((companies.find(c => c.id === job.companyId) || {}).name || '')} · Band: ${esc(job.band)} · Status: ${esc(job.status)}</p>
  <div class="card"><h3>Edit job</h3><form method="POST" action="/jobs/${job.id}/edit">
  <p>Title<br><input name="title" size="40" value="${esc(job.title)}"></p>
  <p>Salary band<br><input name="band" size="40" value="${esc(job.band)}"></p>
  <p><button>Save changes</button></p></form></div>`));
}
async function jobEditPost(req, res, user, job) {
  const body = await readBody(req);
  attempt('Search & Jobs');
  const changed = (body.title && String(body.title) !== job.title) || (body.band && String(body.band) !== job.band);
  if (body.title) job.title = String(body.title);
  if (body.band) job.band = String(body.band);
  if (changed && job.companyId !== user.companyId) pass('job-edit-idor');
  redirect(res, '/jobs/' + job.id);
}
function searchPage(req, res, user, url) {
  originCookie(res);
  const q = url.searchParams.get('q');
  if (q === null) {
    return send(res, 200, layout('Search', user, `<h2>Search candidates</h2>
    <form method="GET" action="/search"><input name="q" size="40" placeholder="Candidate name..."> <button>Search</button></form>`));
  }
  attempt('Search & Jobs');
  const where = `name LIKE '%${q}%' AND confidential = '0' AND companyId = ${user.companyId}`;
  const results = sqlQuery(candidates, where);
  if (hasXss(q)) pass('search-xss');
  if (results.some(c => c.confidential === 1 || c.companyId !== user.companyId)) pass('search-sqli');
  // NOTE (the flaw): the query text is reflected RAW below.
  send(res, 200, layout('Search', user, `<h2>Search candidates</h2>
  <form method="GET" action="/search"><input name="q" size="40" value="${esc(q)}"> <button>Search</button></form>
  <p>Results for: ${q}</p>
  <table><tr><th>ID</th><th>Name</th><th>Email</th><th>Stage</th></tr>
  ${results.map(c => `<tr><td>${c.id}</td><td>${esc(c.name)}</td><td>${esc(c.email)}</td><td>${esc(c.stage)}</td></tr>`).join('')}</table>`));
}

/* ============================== INTERVIEWS & OFFERS ============================== */
function interviewsPage(req, res, user) {
  originCookie(res);
  const list = interviews.filter(iv => { const c = candidates.find(x => x.id === iv.candidateId); return c && c.companyId === user.companyId; });
  send(res, 200, layout('Interviews', user, `<h2>Interviews</h2>
  <table><tr><th>ID</th><th>Candidate</th><th>Interviewer</th><th>When</th><th>Scorecard</th><th></th></tr>
  ${list.map(iv => { const c = candidates.find(x => x.id === iv.candidateId); const by = users.find(u => u.id === iv.interviewerId); return `<tr><td>${iv.id}</td><td>${esc(c ? c.name : '')}</td><td>${esc(by ? by.name : '')}</td><td>${esc(iv.when)}</td><td>${iv.scorecard ? 'Submitted' : 'Pending'}</td><td><a href="/interviews/${iv.id}">Open</a></td></tr>`; }).join('')}</table>`));
}
function interviewPage(req, res, user, iv) {
  originCookie(res);
  const cand = candidates.find(c => c.id === iv.candidateId);
  if (cand && cand.companyId !== user.companyId) pass('int-idor');
  const interviewer = users.find(u => u.id === iv.interviewerId);
  send(res, 200, layout('Interview', user, `<h2>Interview — ${esc(cand ? cand.name : '')}</h2>
  <table><tr><th>When</th><td>${esc(iv.when)}</td></tr><tr><th>Interviewer</th><td>${esc(interviewer ? interviewer.name : '')}</td></tr>
  <tr><th>Candidate stage</th><td>${esc(cand ? cand.stage : '')}</td></tr></table>
  <div class="card"><h3>Scorecard</h3>
  ${iv.scorecard ? `<p>Score: <b>${iv.scorecard.score}/5</b> — ${esc(iv.scorecard.feedback)}</p>` : '<p>No scorecard yet.</p>'}
  <form method="POST" action="/interviews/${iv.id}/scorecard"><p>Score (1-5)<br><input name="score" size="6"></p>
  <p>Feedback<br><input name="feedback" size="50"></p><p><button>Submit scorecard</button></p></form></div>`));
}
async function scorecardPost(req, res, user, iv) {
  const body = await readBody(req);
  attempt('Interviews & Scorecards');
  if (iv.interviewerId !== user.id) pass('int-score-tamper');
  iv.scorecard = { by: user.id, score: Number(body.score) || 0, feedback: String(body.feedback || '') };
  redirect(res, '/interviews/' + iv.id);
}
function offerPage(req, res, user, offer) {
  originCookie(res);
  const cand = candidates.find(c => c.id === offer.candidateId);
  if (cand && cand.companyId !== user.companyId) pass('offer-idor');
  send(res, 200, layout('Offer', user, `<h2>Offer letter — ${esc(cand ? cand.name : '')}</h2>
  <div class="card"><p>Dear ${esc(cand ? cand.name : 'candidate')},</p>
  <p>We are delighted to offer you the position with a salary of <b>$${offer.salary}</b> per year.</p>
  <p>Status: <b>${esc(offer.status)}</b></p></div>
  <div class="card"><h3>Update offer</h3><form method="POST" action="/offers/${offer.id}/update">
  <p>Salary<br><input name="salary" size="12" value="${offer.salary}"></p>
  <p>Status<br><select name="status"><option>Draft</option><option>Sent</option><option>Accepted</option><option>Declined</option></select></p>
  <p><button>Save offer</button></p></form></div>`));
}
async function offerUpdatePost(req, res, user, offer) {
  const body = await readBody(req);
  attempt('Offers');
  let changed = false;
  if (body.salary !== undefined && body.salary !== '' && Number(body.salary) !== offer.salary) { offer.salary = Number(body.salary); changed = true; }
  if (body.status && String(body.status) !== offer.status) { offer.status = String(body.status); changed = true; }
  if (changed) pass('offer-tamper');
  redirect(res, '/offers/' + offer.id);
}

/* ============================== ADMIN ============================== */
function adminAllowed(req, user) {
  return user.role === 'admin' || parseCookies(req).hx_role === 'admin';
}
function adminPage(req, res, user) {
  attempt('Admin Panel');
  if (!adminAllowed(req, user)) return send(res, 403, layout('Forbidden', user, '<h2>403 — Admins only</h2>'));
  if (user.role !== 'admin' && parseCookies(req).hx_role === 'admin') pass('auth-cookie');
  originCookie(res);
  send(res, 200, layout('Admin', user, `<h2>Admin panel — all users</h2>
  <table><tr><th>ID</th><th>Name</th><th>Email</th><th>Password</th><th>Role</th><th>Company</th><th>Active</th><th></th></tr>
  ${users.map(u => `<tr><td>${u.id}</td><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.password)}</td><td>${esc(u.role)}</td><td>${u.companyId}</td><td>${u.active ? 'yes' : 'NO'}</td>
  <td><form method="POST" action="/admin/deactivate"><input type="hidden" name="hx_origin" value="1"><input type="hidden" name="userId" value="${u.id}"><button>Deactivate</button></form></td></tr>`).join('')}</table>`));
}
async function adminDeactivatePost(req, res, user) {
  const body = await readBody(req);
  attempt('Admin Panel');
  if (!adminAllowed(req, user)) return send(res, 403, 'Admins only');
  const target = users.find(u => u.id === Number(body.userId));
  if (!hasMarker(req, body)) pass('admin-csrf');
  if (target) target.active = false;
  redirect(res, '/admin');
}

/* ============================== LAB SYSTEM PAGES ============================== */
function testsPage(req, res, user) {
  originCookie(res);
  const p = progressJSON();
  const byFeature = FEATURES.map(f => {
    const ts = TESTS.filter(t => t.feature === f);
    return `<div class="card"><h3>${esc(f)} <small>(${ts.filter(t => progress.tests[t.id]).length}/${ts.length} done · ${p.features[f].attempts} attempts on this feature)</small></h3>
    ${ts.map(t => `<div style="border-top:1px solid #e2e8f0;padding:8px 0"><b>${progress.tests[t.id] ? '✓' : '○'} ${esc(t.name)}</b>
    <small> — ${esc(t.owasp)} · ${esc(t.difficulty)} · ${esc(t.loc)}</small>
    <details><summary>Hint 1</summary><p>${esc(t.hints[0])}</p><details><summary>Hint 2</summary><p>${esc(t.hints[1])}</p><details><summary>Hint 3</summary><p>${esc(t.hints[2])}</p></details></details></details></div>`).join('')}</div>`;
  }).join('');
  send(res, 200, layout('Mission Board', user, `<h2>Mission Board — LAB ${LAB_NUMBER} ${LAB_NAME}</h2>
  <p>Progress: <b>${p.done}/${p.total} tests · ${p.pct}%</b>. Tests complete by DOING — perform the real exploit and the board notices. The Lab Coach (bottom right) gives step-by-step help for a feature after you have tried it at least 3 times.</p>${byFeature}`));
}
function completePage(req, res, user) {
  originCookie(res);
  const p = progressJSON();
  if (!isComplete()) {
    const left = TESTS.filter(t => !progress.tests[t.id]);
    return send(res, 200, layout('Complete', user, `<h2>Not complete yet — ${p.done}/${p.total} tests (${p.pct}%)</h2>
    <p>Still open:</p><ul>${left.map(t => `<li>${esc(t.name)} <small>(${esc(t.feature)})</small></li>`).join('')}</ul>
    <p>Head to the <a href="/tests">Mission Board</a> and keep going.</p>`));
  }
  const key = completionKey();
  send(res, 200, layout('Complete', user, `<h2>🎉 LAB ${LAB_NUMBER} — ${LAB_NAME} complete: 100%</h2>
  <h3>1) Total features in this lab</h3><p><b>${FEATURES.length} features</b>: ${FEATURES.map(esc).join(', ')}</p>
  <h3>2) Vulnerabilities per feature</h3><table><tr><th>Feature</th><th>Tests</th></tr>
  ${FEATURES.map(f => `<tr><td>${esc(f)}</td><td>${TESTS.filter(t => t.feature === f).length}</td></tr>`).join('')}</table>
  <h3>3) How testing was done — ${TESTS.length} techniques</h3><ol>${TESTS.map(t => `<li>${esc(t.name)} <small>(${esc(t.feature)})</small></li>`).join('')}</ol>
  <h3>4) What you learned</h3><ul>${TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('')}</ul>
  <h3>5) What this means for a real client</h3><ul>${TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('')}</ul>
  <h3>6) Writing it in a real report</h3><table><tr><th>Finding</th><th>Severity</th><th>Remediation</th></tr>
  ${TESTS.map(t => `<tr><td>${esc(t.report.title)}</td><td>${esc(t.report.severity)}</td><td>${esc(t.report.remediation)}</td></tr>`).join('')}</table>
  <div class="card"><h3>🔑 Completion key — unlocks Lab ${LAB_NUMBER + 1}</h3>
  <p style="font-size:20px"><code>${esc(key)}</code></p>
  <p>Keep it safe. Paste it into the next lab's gate to continue the chain.</p>
  <form method="POST" action="/complete/name"><p>Your name for the certificate<br><input name="name" size="34" value="${esc(progress.testerName)}"></p>
  <p><button>Save name</button> · <a href="/certificate">Open your certificate</a></p></form></div>`));
}
function certificatePage(req, res, user) {
  if (!isComplete()) return redirect(res, '/complete');
  const name = progress.testerName || (user ? user.name : 'HexaHire Tester');
  const date = progress.completedAt ? progress.completedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
  send(res, 200, `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER} ${LAB_NAME}</title>
<style>body{font-family:Georgia,serif;background:#f1f5f9;display:flex;justify-content:center;padding:30px}.card{background:#fff;border:3px double #0f172a;border-radius:8px;padding:36px 44px;max-width:680px;text-align:center}img{height:64px}h1{margin:8px 0}@media print{body{background:#fff}}</style></head>
<body><div class="card"><img src="/logo.png" alt="HexaCyberLab">
<h1>Certificate of Completion</h1>
<p>This certifies that</p><h2>${esc(name)}</h2>
<p>has completed 100% of the security tests in <b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b><br>(${TESTS.length} tests across ${FEATURES.length} features)</p>
<p>Completed on ${esc(date)}</p>
<p style="margin-top:26px"><b>HexaCyberLab — Built by Md. Jony Hassain, Founder</b></p>
</div></body></html>`);
}

/* ---- completion key fragments (second region) ---- */
const _cp = ["TC1YSA==","Ti01OQ==","STBWRQ==","LVkySQ==","VTNFTA==","QlhIMw=="];
function completionKey() { return _assemble(_cp); }

/* ============================== LAB COACH (chatbot) ============================== */
const FEATURE_KEYS = {
  'Login & Authentication': ['login', 'auth', 'password', 'sign in', 'signin', 'reset token'],
  'Registration & Profile': ['register', 'registration', 'profile', 'sign up', 'signup'],
  'Candidates': ['candidate'],
  'Search & Jobs': ['search', 'job'],
  'Interviews & Scorecards': ['interview', 'scorecard'],
  'Offers': ['offer'],
  'Documents & Files': ['document', 'file', 'upload', 'download'],
  'Admin Panel': ['admin'],
  'Platform & API': ['api', 'platform', 'debug']
};
function coachReply(message) {
  const low = String(message || '').toLowerCase();
  if ((low.includes('who') && (low.includes('built') || low.includes('made') || low.includes('creat') || low.includes('founder'))) || low.includes('jony') || low.includes('founder')) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (low.includes('key')) {
    if (isComplete() && progress.keyRevealed) return 'You completed LAB ' + LAB_NUMBER + ' at 100% — here is the completion key for the next lab: ' + completionKey();
    return 'I do not have the completion key yet — I only receive it when this lab is completed at 100%. Finish all ' + TESTS.length + ' tests and ask me again.';
  }
  let feature = null;
  for (const f of FEATURES) { if ((FEATURE_KEYS[f] || []).some(k => low.includes(k))) { feature = f; break; } }
  const wantsHow = /(how (do|to|can)|solve|step by step|guide|exploit|help me)/.test(low);
  if (feature) {
    const ftests = TESTS.filter(t => t.feature === feature);
    const open = ftests.filter(t => !progress.tests[t.id]);
    if (wantsHow) {
      const att = progress.attempts[feature] || 0;
      if (open.length === 0) return 'All ' + feature + ' tests are already complete — nice work.';
      if (att >= 3) return 'Step by step for ' + feature + ': ' + open.map(t => t.name + ' — ' + t.hints[2]).join(' · ');
      return "That feature is locked for help. First try the " + feature + " tests yourself at least 3 times — I can see you've tried " + att + " time(s) so far. After 3 real tries, ask me again and I'll guide you step by step.";
    }
    return feature + ' has ' + ftests.length + ' tests: ' + ftests.map(t => t.name + (progress.tests[t.id] ? ' (done)' : '')).join('; ') + '. Attempts so far on this feature: ' + (progress.attempts[feature] || 0) + '.';
  }
  if (/(how many|progress|status|next|start|hello|hi\b|tests|features)/.test(low)) {
    const p = progressJSON();
    const next = TESTS.find(t => !progress.tests[t.id]);
    return LAB_NAME + ' has ' + TESTS.length + ' tests across ' + FEATURES.length + ' features. Your progress: ' + p.done + '/' + p.total + ' (' + p.pct + '%).' + (next ? ' Next open test: ' + next.name + ' (' + next.feature + '). See /tests for the full Mission Board.' : ' Everything is complete — ask me for the completion key!');
  }
  return 'I can tell you how many tests each feature has and their names, and once you have tried a feature at least 3 times I can guide you step by step. The full map is on /tests. Ask me about a feature — for example "Which tests are in the Candidates feature?"';
}

/* ============================== DOC GENERATION ============================== */
function genDocs() {
  const byF = f => TESTS.filter(t => t.feature === f);
  let vuln = `# ${LAB_NAME} (LAB ${LAB_NUMBER}) — Complete Vulnerability Map\n\nIntentionally vulnerable LOCAL practice lab. Every entry below is a scored test in the Mission Board (/tests). Do not deploy publicly.\n`;
  for (const f of FEATURES) {
    vuln += `\n## ${f}\n`;
    for (const t of byF(f)) vuln += `\n### ${t.name}\n- **OWASP:** ${t.owasp}\n- **Difficulty:** ${t.difficulty}\n- **Location:** ${t.loc}\n- **Exploitation outline:** ${t.exploit}\n- **Impact:** ${t.impact}\n`;
  }
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'), vuln);
  const order = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  let guide = `# ${LAB_NAME} (LAB ${LAB_NUMBER}) — Practice Guide\n\nChallenges grouped by feature, then difficulty. Each challenge flips on the Mission Board only when the real exploit succeeds server-side.\n`;
  for (const f of FEATURES) {
    guide += `\n## ${f}\n`;
    for (const t of byF(f).slice().sort((a, b) => order[a.difficulty] - order[b.difficulty])) {
      guide += `\n### ${t.name} (${t.difficulty})\n- **Objective:** ${t.exploit}\n- **Hints:**\n  1. ${t.hints[0]}\n  2. ${t.hints[1]}\n  3. ${t.hints[2]}\n`;
    }
  }
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'), guide);
  let fix = `# ${LAB_NAME} (LAB ${LAB_NUMBER}) — Fix & Retest Guide\n\nFor every scored test: the professional report entry, the secure implementation, and the regression check.\n`;
  for (const t of TESTS) {
    fix += `\n## ${t.report.title}\n- **Feature:** ${t.feature}\n- **Severity:** ${t.report.severity}\n- **Secure implementation:** ${t.report.remediation}\n- **Regression test:** Re-run the documented exploit (${t.exploit}) against the fixed build — it must fail: no session, data change or disclosure may occur, and the Mission Board test must stay open.\n`;
  }
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'), fix);
  console.log('Docs generated for', TESTS.length, 'tests across', FEATURES.length, 'features.');
}

/* ============================== MAIN HANDLER ============================== */
function dashboard(req, res, user) {
  originCookie(res);
  const myCands = candidates.filter(c => c.companyId === user.companyId);
  const myOffers = offers.filter(o => { const c = candidates.find(x => x.id === o.candidateId); return c && c.companyId === user.companyId; });
  send(res, 200, layout('Dashboard', user, `<h2>Welcome to ${LAB_NAME}, ${esc(user.name)}</h2>
  <p>Company: <b>${esc((companies.find(c => c.id === user.companyId) || {}).name || '')}</b> · Role: <b>${esc(user.role)}</b></p>
  <div class="card"><h3>Pipeline snapshot</h3><p>${myCands.length} candidates · ${jobs.filter(j => j.companyId === user.companyId).length} jobs · ${interviews.filter(iv => { const c = candidates.find(x => x.id === iv.candidateId); return c && c.companyId === user.companyId; }).length} interviews</p></div>
  <div class="card"><h3>Your offers</h3>${myOffers.map(o => { const c = candidates.find(x => x.id === o.candidateId); return `<p><a href="/offers/${o.id}">Offer ${o.id}</a> — ${esc(c ? c.name : '')} · $${o.salary} · ${esc(o.status)}</p>`; }).join('') || '<p>None.</p>'}</div>
  <div class="card"><h3>Files</h3><p><a href="/upload">Upload a candidate file</a> · Download seeded files via /download?file=&lt;name&gt; (cv-alice.txt, cv-bob.txt, cv-dave.txt)</p></div>
  <div class="card"><h3>Mission</h3><p>Open the <a href="/tests">Mission Board</a> — ${TESTS.length} security tests across ${FEATURES.length} features.</p></div>`));
}
async function handle(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1:' + PORT);
  const p = url.pathname;
  const method = req.method;
  /* always reachable */
  if (p === '/logo.png') {
    return fs.readFile(LOGO_FILE, (e, d) => { if (e) return send(res, 404, 'no logo'); res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(d); });
  }
  if (p === '/api/progress') return send(res, 200, JSON.stringify(progressJSON()), 'application/json');
  if (p === '/api/chat' && method === 'POST') { const b = await readBody(req); return send(res, 200, JSON.stringify({ reply: coachReply(b.message) }), 'application/json'); }
  if (p === '/unlock' && method === 'POST') {
    const b = await readBody(req);
    if (String(b.key || '').trim() === entryKey()) { progress.unlocked = true; saveProgress(); return redirect(res, '/'); }
    return send(res, 403, gatePage());
  }
  if (!progress.unlocked) return send(res, 200, gatePage());
  /* lab-system pages (progress-based, no login needed) */
  if (p === '/tests') return testsPage(req, res, currentUser(req));
  if (p === '/complete' && method === 'GET') return completePage(req, res, currentUser(req));
  if (p === '/complete/name' && method === 'POST') { const b = await readBody(req); progress.testerName = String(b.name || ''); saveProgress(); return redirect(res, '/complete'); }
  if (p === '/certificate') return certificatePage(req, res, currentUser(req));
  /* auth */
  if (p === '/login' && method === 'GET') { if (currentUser(req)) return redirect(res, '/'); return loginPage(req, res); }
  if (p === '/login' && method === 'POST') return loginPost(req, res);
  if (p === '/register' && method === 'GET') return registerPage(req, res);
  if (p === '/register' && method === 'POST') return registerPost(req, res);
  if (p === '/forgot' && method === 'GET') return forgotPage(req, res);
  if (p === '/forgot' && method === 'POST') return forgotPost(req, res);
  if (p === '/reset' && method === 'GET') return resetPage(req, res);
  if (p === '/reset' && method === 'POST') return resetPost(req, res);
  if (p === '/logout') { const sid = parseCookies(req).hx_session; if (sid) sessions.delete(sid); res.setHeader('Set-Cookie', 'hx_session=; Path=/; Max-Age=0'); return redirect(res, '/login'); }
  /* platform API: /api/debug is unauthenticated BY DESIGN (the flaw); /api/candidates authenticates via its API key instead of a session */
  if (p === '/api/candidates' && method === 'GET') {
    attempt('Platform & API');
    const key = req.headers['x-api-key'] || '';
    let email = '';
    try { email = Buffer.from(String(key), 'base64').toString('utf8'); } catch (e) {}
    const apiUser = users.find(u => u.email === email);
    if (!apiUser) return send(res, 401, JSON.stringify({ error: 'invalid api key' }), 'application/json');
    if (!currentUser(req)) pass('api-token');
    return send(res, 200, JSON.stringify(candidates.filter(c => c.companyId === apiUser.companyId), null, 2), 'application/json');
  }
  if (p === '/api/debug' && method === 'GET') { attempt('Platform & API'); pass('api-debug'); return send(res, 200, JSON.stringify({ debug: true, users, candidates: candidates.length, interviews: interviews.length }, null, 2), 'application/json'); }
  /* everything below requires a login */
  const user = currentUser(req);
  if (!user) return redirect(res, '/login');
  if (p === '/') return dashboard(req, res, user);
  if (p === '/profile' && method === 'GET') return profilePage(req, res, user);
  if (p === '/profile' && method === 'POST') return profilePost(req, res, user);
  if (p === '/team') return teamPage(req, res, user);
  if (p === '/candidates') return candidatesPage(req, res, user);
  let m;
  if ((m = p.match(/^\/candidates\/(\d+)$/)) && method === 'GET') { const c = candidates.find(x => x.id === Number(m[1])); if (!c) return send(res, 404, 'Candidate not found'); attempt('Candidates'); return candidatePage(req, res, user, c); }
  if ((m = p.match(/^\/candidates\/(\d+)\/stage$/)) && method === 'POST') { const c = candidates.find(x => x.id === Number(m[1])); if (!c) return send(res, 404, 'Candidate not found'); const b = await readBody(req); attempt('Candidates'); const prev = c.stage; c.stage = String(b.stage || prev); if (['Applied', 'Screening'].includes(prev) && ['Offer', 'Hired'].includes(c.stage)) pass('cand-stage'); return redirect(res, '/candidates/' + c.id); }
  if ((m = p.match(/^\/candidates\/(\d+)\/documents\/(\d+)$/)) && method === 'GET') return docDownload(req, res, user, m[1], m[2]);
  if (p === '/download') return downloadRoute(req, res, user, url);
  if (p === '/upload' && method === 'GET') return uploadPage(req, res, user);
  if (p === '/upload' && method === 'POST') return uploadPost(req, res, user);
  if ((m = p.match(/^\/uploads\/(.+)$/)) && method === 'GET') return serveUpload(req, res, decodeURIComponent(m[1]));
  if (p === '/jobs') return jobsPage(req, res, user);
  if ((m = p.match(/^\/jobs\/(\d+)$/)) && method === 'GET') { const j = jobs.find(x => x.id === Number(m[1])); if (!j) return send(res, 404, 'Job not found'); return jobPage(req, res, user, j); }
  if ((m = p.match(/^\/jobs\/(\d+)\/edit$/)) && method === 'POST') { const j = jobs.find(x => x.id === Number(m[1])); if (!j) return send(res, 404, 'Job not found'); return jobEditPost(req, res, user, j); }
  if (p === '/search') return searchPage(req, res, user, url);
  if (p === '/interviews') return interviewsPage(req, res, user);
  if ((m = p.match(/^\/interviews\/(\d+)$/)) && method === 'GET') { const iv = interviews.find(x => x.id === Number(m[1])); if (!iv) return send(res, 404, 'Interview not found'); attempt('Interviews & Scorecards'); return interviewPage(req, res, user, iv); }
  if ((m = p.match(/^\/interviews\/(\d+)\/scorecard$/)) && method === 'POST') { const iv = interviews.find(x => x.id === Number(m[1])); if (!iv) return send(res, 404, 'Interview not found'); return scorecardPost(req, res, user, iv); }
  if ((m = p.match(/^\/offers\/(\d+)$/)) && method === 'GET') { const o = offers.find(x => x.id === Number(m[1])); if (!o) return send(res, 404, 'Offer not found'); attempt('Offers'); return offerPage(req, res, user, o); }
  if ((m = p.match(/^\/offers\/(\d+)\/update$/)) && method === 'POST') { const o = offers.find(x => x.id === Number(m[1])); if (!o) return send(res, 404, 'Offer not found'); return offerUpdatePost(req, res, user, o); }
  if (p === '/admin' && method === 'GET') return adminPage(req, res, user);
  if (p === '/admin/users.json' && method === 'GET') { attempt('Admin Panel'); if (user.role !== 'admin') pass('admin-bac'); return send(res, 200, JSON.stringify(users.map(u => ({ id: u.id, name: u.name, email: u.email, password: u.password, role: u.role, companyId: u.companyId, active: u.active })), null, 2), 'application/json'); }
  if (p === '/admin/deactivate' && method === 'POST') return adminDeactivatePost(req, res, user);
  return send(res, 404, layout('Not found', user, '<h2>404 — page not found</h2>'));
}

if (process.argv.includes('--gen-docs')) { genDocs(); process.exit(0); }
http.createServer((req, res) => { handle(req, res).catch(() => { try { send(res, 500, 'Server error'); } catch (e) {} }); }).listen(PORT, '127.0.0.1', () => {
  console.log(LAB_NAME + ' (LAB ' + LAB_NUMBER + ') listening on http://127.0.0.1:' + PORT);
});
