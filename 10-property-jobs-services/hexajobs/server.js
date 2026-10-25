'use strict';
/*
 * HexaJobs — LAB 93 (Category 10: Property, Jobs & Professional Services)
 * A deliberately vulnerable job-portal training lab for HexaCyberLab.
 * Zero-dependency Node.js. LOCAL USE ONLY — never deploy publicly.
 * Contains the full HexaCyberLab Lab System: sequential unlock gate,
 * progress engine, Mission Board (/tests), Lab Coach chatbot, completion
 * summary (/complete) and certificate (/certificate).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB_NUMBER = 93;
const LAB_NAME = 'HexaJobs';
const PORT = 3102;
const HOST = '127.0.0.1';
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');

/* ------------------------------------------------------------------ *
 * Key material — fragment set A (entry key, part 1 of 2).
 * Keys are never stored whole; see the assembler near the vault code.
 * ------------------------------------------------------------------ */

const _fragA2 = ['TC1YSA==', 'Qi00OQ==', 'RDMwSA=='];

function fragJoin(parts) {
  return parts.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}
function constEq(a, b) {
  const ba = Buffer.from(String(a)), bb = Buffer.from(String(b));
  let diff = ba.length ^ bb.length;
  const n = Math.max(ba.length, bb.length);
  for (let i = 0; i < n; i++) diff |= (ba[i % ba.length] || 0) ^ (bb[i % bb.length] || 0);
  return diff === 0;
}

/* ------------------------- progress state ------------------------- */
function defaultState() {
  return {
    unlocked: false, testerName: '', tests: {}, attempts: {},
    completedAt: null, keyRevealed: false,
    track: { forgotProbes: [], loginFails: {}, issuedReset: [] }
  };
}
let state = defaultState();
try {
  if (fs.existsSync(PROGRESS_FILE)) {
    const raw = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    state = Object.assign(defaultState(), raw);
    state.track = Object.assign(defaultState().track, raw.track || {});
  }
} catch (e) { state = defaultState(); }
function save() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2)); } catch (e) {}
}

function bump(feature) {
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  save();
}
function pass(id) {
  if (!state.tests[id]) {
    state.tests[id] = true;
    if (TESTS.every(t => state.tests[t.id])) {
      if (!state.completedAt) state.completedAt = new Date().toISOString();
      state.keyRevealed = true;
    }
    save();
  }
}

/* ============================ TESTS registry ============================ */
const TESTS = [
  /* ---- Login & Authentication ---- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass',
    owasp: 'A03:2021 – Injection', difficulty: 'Beginner', where: 'POST /login (email field)',
    hints: ['The login form builds its database query by gluing your input straight into the SQL string.',
      'A quote character in the email can break out of the string. What happens if the rest of the query is commented away?',
      "Try the email: ' OR '1'='1' --  with any password. The comment swallows the password check."],
    lesson: 'String-built SQL queries let an attacker rewrite the query logic itself. Parameterised queries separate code from data so user input can never become SQL.',
    impact: 'On a real job portal this means instant takeover of the admin account — every candidate CV, personal email and employer record exposed in one request.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements for all database access; never concatenate user input into SQL.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limiting or Lockout',
    owasp: 'A07:2021 – Authentication Failures', difficulty: 'Beginner', where: 'POST /login',
    hints: ['Keep guessing the same account\'s password. Does anything slow you down or lock the account?',
      'Ten wrong guesses in a row are all accepted for processing. There is no counter at all.',
      'Script 10+ failed logins for alice@test.local — the 10th failure is still processed like the first.'],
    lesson: 'Without throttling, lockout or CAPTCHA, an attacker can try unlimited passwords until one works. Failed-attempt counters are a basic control.',
    impact: 'A client\'s users get silently cracked by password-spraying bots; the business finds out from its users, not from its own logs.',
    report: { title: 'Missing Brute-Force Protection on Login', severity: 'High', remediation: 'Rate-limit login attempts per account and IP, add progressive delays / lockout and alerting on failure spikes.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User Enumeration via Login & Password-Reset Responses',
    owasp: 'A07:2021 – Authentication Failures', difficulty: 'Beginner', where: 'POST /forgot and POST /login error messages',
    hints: ['Compare the response for an email that exists with one that does not.',
      'The forgot-password page happily confirms whether an account exists. Probe several different emails.',
      'Submit 5 different emails to /forgot — real accounts get "reset link sent", unknown ones get "no such account".'],
    lesson: 'Different responses for existing vs non-existing accounts hand attackers a free list of valid users to target with phishing and password attacks.',
    impact: 'Attackers harvest the client\'s real user list and focus credential-stuffing on accounts that definitely exist, massively raising success rates.',
    report: { title: 'Account Enumeration via Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message for all login/reset outcomes regardless of whether the account exists.' } },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Demo Credentials Published on the Login Page',
    owasp: 'A07:2021 – Authentication Failures', difficulty: 'Beginner', where: 'Login page demo box',
    hints: ['Read the login page carefully — the site tells you a working username and password.',
      'Demo accounts shipped to production are real accounts with real access.',
      'Log in with the demo credentials printed on the login page (demo@hexajobs.local).'],
    lesson: 'Default and demo credentials are the first thing an attacker tries. If they are printed on the page, no skill is needed at all.',
    impact: 'Anyone on the internet can walk into the client\'s platform with a legitimate account — the cheapest possible breach.',
    report: { title: 'Working Demo Credentials Exposed on Production Login Page', severity: 'High', remediation: 'Remove demo/default accounts and credentials from production; enforce unique strong passwords for seed accounts.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token',
    owasp: 'A07:2021 – Authentication Failures', difficulty: 'Intermediate', where: 'GET/POST /reset?token=',
    hints: ['Request a reset for a demo account and look at the token format. Does it look random?',
      'The token seems to be built from the user\'s numeric id with simple arithmetic.',
      'Tokens look like HJ<id>-<id*137+42>. Compute one for another user id and use it without ever requesting a reset.'],
    lesson: 'Reset tokens must be long, random and unguessable. A token derived from a public id by arithmetic is an open door to every account.',
    impact: 'An attacker resets the password of any user — including admins and employers — without touching their inbox. Full platform takeover.',
    report: { title: 'Password-Reset Tokens Are Predictable (Derived from User ID)', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), store only a hash, expire them quickly and use each once.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Role Taken from a Client Cookie (Cookie Tampering)',
    owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate', where: 'hx_role cookie, checked on /admin',
    hints: ['After logging in, inspect the cookies the app sets. One of them describes your role.',
      'Cookies live on the client — you can edit them. The admin gate believes the cookie instead of the server-side account.',
      'Log in as a normal seeker, change the hx_role cookie value to admin, then open /admin.'],
    lesson: 'Authorization data must live server-side. Trusting a client-supplied role value is the same as letting visitors print their own staff badges.',
    impact: 'Every registered user can promote themselves to admin in seconds — user data, billing and moderation all fall at once.',
    report: { title: 'Authorization Role Trusted from Client-Controlled Cookie', severity: 'Critical', remediation: 'Derive roles only from server-side session data; never trust role or privilege values sent by the client.' } },

  /* ---- Registration & Profile ---- */
  { id: 'reg-weakpw', feature: 'Registration & Profile', name: 'Weak Password Policy (1-Character Passwords)',
    owasp: 'A07:2021 – Authentication Failures', difficulty: 'Beginner', where: 'POST /register',
    hints: ['Register a new account and try the shortest password the form will accept.',
      'There is no length or complexity check at all.',
      'Register with the password "a" — the account is created happily.'],
    lesson: 'A password policy is the cheapest defence there is. Accepting 1-character passwords means accounts fall to trivial guessing.',
    impact: 'The client\'s users pick (and attackers crack) laughably weak passwords; account-takeover support tickets follow.',
    report: { title: 'No Minimum Password Strength Enforced at Registration', severity: 'Medium', remediation: 'Enforce a minimum length (≥10) and check passwords against known-breached lists at registration and reset.' } },
  { id: 'reg-massassign', feature: 'Registration & Profile', name: 'Mass Assignment — Role & Plan Set at Registration',
    owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate', where: 'POST /register (extra form fields)',
    hints: ['The registration form shows email, name and password. The server may accept more fields than the form shows.',
      'What fields does a user object have? role and plan are tempting targets.',
      'Add role=admin (or role=employer and plan=premium) to the registration POST and check your new account.'],
    lesson: 'Binding request data directly onto model objects lets attackers set fields the UI never offered. Whitelist the fields a request may set.',
    impact: 'Attackers mint free premium employer accounts — or full admins — at signup, skipping payment and vetting entirely.',
    report: { title: 'Mass Assignment Allows Privilege/Plan Escalation at Registration', severity: 'High', remediation: 'Whitelist assignable fields per endpoint (email, name, password only); set role/plan server-side by business rules.' } },
  { id: 'reg-storedxss', feature: 'Registration & Profile', name: 'Stored XSS in Display Name',
    owasp: 'A03:2021 – Injection', difficulty: 'Beginner', where: 'Display name, rendered on employer applicant lists & profile pages',
    hints: ['Your display name is printed back on several pages. Is it encoded anywhere?',
      'Names reach employer dashboards unescaped — a payload in your name fires in their browser.',
      'Set your name to <script>alert(1)</script> and view a page that renders it (e.g. an applicant list or your profile).'],
    lesson: 'Any stored field is executable code if it is rendered without output encoding. Stored XSS is worse than reflected: victims come to the payload.',
    impact: 'An attacker\'s "name" steals session cookies from every employer who reviews applicants — the client\'s paying customers get hijacked.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-encode all user-supplied output; sanitise stored rich text; add a Content-Security-Policy.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'Cross-Site Request Forgery on Profile Update',
    owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate', where: 'POST /profile',
    hints: ['State-changing forms should carry an anti-CSRF token tied to your session. Check the profile request.',
      'The app sets a casual marker cookie but the profile endpoint never verifies the form marker.',
      'POST to /profile as a logged-in user WITHOUT the hx_origin form field — the change still goes through.'],
    lesson: 'Cookies are sent automatically by the browser, so any site can submit forms as the victim unless the server demands an unguessable per-session token.',
    impact: 'A malicious page silently rewrites a victim\'s profile (name, contact email) — a stepping stone to account recovery abuse.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require a per-session CSRF token on every state-changing request and validate Origin/Referer as defence-in-depth.' } },

  /* ---- Job Search ---- */
  { id: 'search-sqli', feature: 'Job Search', name: 'SQL Injection in Job Search Leaks Draft Jobs',
    owasp: 'A03:2021 – Injection', difficulty: 'Intermediate', where: 'GET /jobs?q=',
    hints: ['Search filters jobs with another string-built query. Draft jobs are supposed to stay hidden.',
      'The status filter is part of the same query your input lands in.',
      "Search for: ' OR '1'='1' --  and the unpublished DRAFT job appears in the results."],
    lesson: 'Injection is rarely just about login forms — every query built from user input is a target, and the leak here is unreleased business data.',
    impact: 'Unannounced roles (a secret CTO hire, a restructuring) leak to competitors and press before the client chooses to publish them.',
    report: { title: 'SQL Injection in Job Search Exposes Unpublished Listings', severity: 'High', remediation: 'Parameterise the search query; enforce publication status as a server-side filter that user input cannot alter.' } },
  { id: 'search-xss', feature: 'Job Search', name: 'Reflected XSS in Search Results',
    owasp: 'A03:2021 – Injection', difficulty: 'Beginner', where: 'GET /jobs?q= (term echoed in the heading)',
    hints: ['The results page repeats your search term back to you. In what form?',
      'The term is echoed into the HTML without encoding.',
      'Search for <script>alert(1)</script> and view the page source — the payload sits raw in the heading.'],
    lesson: 'Reflected input must be encoded for the context it lands in. Echoing a search term raw turns a link into a weapon against anyone who clicks it.',
    impact: 'Attackers send crafted search links to the client\'s users; the script runs under the portal\'s trusted domain and steals sessions.',
    report: { title: 'Reflected Cross-Site Scripting in Job Search', severity: 'Medium', remediation: 'HTML-encode reflected values; validate input; deploy a Content-Security-Policy.' } },

  /* ---- Job Listings ---- */
  { id: 'jobs-draft', feature: 'Job Listings', name: 'Unpublished Draft Job Readable by Direct URL',
    owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner', where: 'GET /job/:id',
    hints: ['Published jobs have sequential ids. What about the numbers in between?',
      'The detail page never checks whether the job is published — or whether you own it.',
      'Open /job/3 — a DRAFT job that appears in no listing — as a seeker.'],
    lesson: 'Hiding an object from listings is not access control. Every object fetch must check visibility and ownership on the server.',
    impact: 'Confidential draft postings (salaries, internal plans) are readable by anyone who guesses a number — including competitors.',
    report: { title: 'Broken Access Control: Draft Job Listings Publicly Readable by ID', severity: 'Medium', remediation: 'Enforce status + ownership checks on every object read; return 404 for objects the requester may not see.' } },
  { id: 'jobs-edit-idor', feature: 'Job Listings', name: 'Edit Another Employer\'s Job Posting (IDOR)',
    owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate', where: 'POST /employer/job/:id/edit',
    hints: ['The employer edit endpoint checks that you are AN employer — but not that the job is YOURS.',
      'Sequential job ids + a missing ownership check = every listing is editable by every employer.',
      "Log in as the FoodHub employer and edit TechCorp's job (id 1) — the change is saved."],
    lesson: 'Role checks ("is an employer") are not enough; object-level authorization ("is THIS employer\'s job") is where IDOR lives.',
    impact: 'A rival employer rewrites or defaces the client\'s customers\' job ads — salaries changed, descriptions vandalised, trust destroyed.',
    report: { title: 'Insecure Direct Object Reference: Cross-Employer Job Editing', severity: 'High', remediation: 'Verify resource ownership on every read/write; scope all queries by the authenticated owner id.' } },

  /* ---- Applications ---- */
  { id: 'app-idor-read', feature: 'Applications', name: 'Read Another Candidate\'s Application (IDOR)',
    owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner', where: 'GET /application/:id',
    hints: ['Application pages have sequential ids and hold cover letters and personal details.',
      'The page checks that you are logged in — never that the application is yours.',
      "Log in as Bob and open Alice's application at /application/1 — her cover letter renders in full."],
    lesson: 'Personal data behind a guessable URL is public data. Object-level checks are mandatory on every record that belongs to someone.',
    impact: 'Candidates\' cover letters, emails and job-hunting activity leak — a GDPR problem and a trust disaster for the portal.',
    report: { title: 'Insecure Direct Object Reference Exposes Candidate Applications', severity: 'High', remediation: 'Check that the requester is the applicant or the owning employer before returning any application.' } },
  { id: 'app-status-self', feature: 'Applications', name: 'Candidate Sets Own Application Status to "Hired"',
    owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate', where: 'POST /application/:id/status',
    hints: ['Application status should move only by the employer. The status endpoint never asks who you are.',
      'A seeker session can call the employer\'s workflow endpoint directly.',
      'As Alice, POST status=hired to your own application (/application/1/status) — the portal accepts your self-promotion.'],
    lesson: 'Workflow state transitions are privileged operations. If the endpoint trusts the caller, the workflow is fiction.',
    impact: 'Candidates mark themselves hired/shortlisted, corrupting the client\'s hiring pipeline and any reporting built on it.',
    report: { title: 'Broken Access Control: Applicants Can Set Their Own Application Status', severity: 'High', remediation: 'Restrict status transitions to the owning employer, server-side, per transition.' } },
  { id: 'app-status-idor', feature: 'Applications', name: 'Change Another Candidate\'s Application Status',
    owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate', where: 'POST /application/:id/status',
    hints: ['The same status endpoint also ignores WHICH application you touch.',
      'A third party — neither applicant nor employer — can move someone else\'s application.',
      "As Bob, POST status=rejected to Alice's application (/application/1/status) and watch her pipeline change."],
    lesson: 'Missing ownership checks on writes are worse than on reads: attackers don\'t just peek, they sabotage.',
    impact: 'Rival candidates (or anyone registered) sabotage other people\'s job applications — real-world harm to real job seekers.',
    report: { title: 'Insecure Direct Object Reference: Cross-User Application Status Changes', severity: 'High', remediation: 'Authorize every status change against both the application owner and the job owner.' } },
  { id: 'app-apply-as', feature: 'Applications', name: 'Apply on Behalf of Another User (seekerId Parameter)',
    owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate', where: 'POST /job/:id/apply',
    hints: ['The apply request carries more than a cover letter — the server trusts a client-supplied applicant id.',
      'Your identity should come from your session, never from a form field.',
      'Apply to a job while adding seekerId=<another user\'s id> — the application is filed under their name.'],
    lesson: 'Identity must come from the authenticated session. Any endpoint that accepts a user id from the client lets users act as each other.',
    impact: 'Attackers file fake applications in victims\' names, spam employers, and poison a candidate\'s reputation with the client\'s customers.',
    report: { title: 'Client-Supplied User ID Allows Applying as Another User', severity: 'High', remediation: 'Ignore client-supplied identity fields; always derive the actor from the server-side session.' } },

  /* ---- CVs & Files ---- */
  { id: 'cv-upload', feature: 'CVs & Files', name: 'Unrestricted CV Upload — HTML File Stored & Served',
    owasp: 'A08:2021 – Software and Data Integrity Failures', difficulty: 'Intermediate', where: 'POST /cv/upload, served at GET /cv/file/:id',
    hints: ['The CV upload accepts any filename and any content. What does the server do with an .html "CV"?',
      'Uploaded files are served back from the app\'s own domain with a browser-friendly content type.',
      'Upload a file named cv.html containing <script>alert(1)</script>, then open its /cv/file/ link.'],
    lesson: 'File uploads must be treated as hostile: validate type by content, store outside the web root, and serve with safe headers — or uploads become hosted XSS / malware.',
    impact: 'Attackers host phishing pages and scripts on the client\'s own trusted domain — the portal becomes the attack platform.',
    report: { title: 'Unrestricted File Upload Allows Stored HTML/JS on the Application Domain', severity: 'High', remediation: 'Whitelist extensions + verify content type, store uploads outside web root, serve with Content-Disposition and nosniff.' } },
  { id: 'cv-traversal', feature: 'CVs & Files', name: 'Path Traversal on CV Download',
    owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate', where: 'GET /cv/download?file=',
    hints: ['The download endpoint joins your file parameter onto the uploads folder. What escapes a folder?',
      'Dot-dot sequences are never normalised away.',
      'Request /cv/download?file=../server.js and the application serves its own source code.'],
    lesson: 'User-controlled paths must be canonicalised and confined to an allowed directory. Traversal turns a download feature into full file disclosure.',
    impact: 'Source code, configuration and secrets leak — the attacker reads the client\'s system like a book and plans the next attack.',
    report: { title: 'Path Traversal in File Download Exposes Server Files', severity: 'High', remediation: 'Resolve the requested path and verify it stays inside the upload directory; whitelist downloadable file ids instead of names.' } },
  { id: 'cv-idor', feature: 'CVs & Files', name: 'Download Another Candidate\'s CV (IDOR)',
    owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner', where: 'GET /cv/file/:id',
    hints: ['CV links are sequential and the viewer is never checked against the owner.',
      'Anyone logged in can read every CV on the platform, one id at a time.',
      "Log in as Bob and open Alice's CV at /cv/file/1 — full text, no questions asked."],
    lesson: 'CVs are dense personal data. Sequential ids plus missing ownership checks equal bulk personal-data theft.',
    impact: 'Every candidate\'s CV — name, phone, address, work history — is harvestable. That is a reportable data breach for the client.',
    report: { title: 'Insecure Direct Object Reference Exposes Candidate CVs', severity: 'High', remediation: 'Check CV ownership (or employer-with-application relationship) before serving any file.' } },

  /* ---- Employer Plans & Billing ---- */
  { id: 'plan-tamper', feature: 'Employer Plans & Billing', name: 'Plan Upgrade Price Tampering',
    owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate', where: 'POST /employer/plan/upgrade',
    hints: ['The upgrade form posts the plan AND its price. The server believes the posted price.',
      'Prices must be looked up server-side. Here the client names its own.',
      'Upgrade to premium with price=0 — the premium plan activates and the invoice says $0.'],
    lesson: 'Money values must always come from server-side price data. A client-supplied price is an invitation to free premium.',
    impact: 'Every employer upgrades for free — direct revenue loss on the client\'s core product.',
    report: { title: 'Client-Side Price Tampering on Plan Upgrades', severity: 'High', remediation: 'Determine prices exclusively from server-side plan data; ignore any client-posted amounts.' } },
  { id: 'invoice-idor', feature: 'Employer Plans & Billing', name: 'Read Another Employer\'s Invoice (IDOR)',
    owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner', where: 'GET /employer/invoice/:id',
    hints: ['Invoices have sequential ids and contain billing details.',
      'The invoice page checks your role, not your ownership of the invoice.',
      "Log in as FoodHub and open TechCorp's invoice at /employer/invoice/1."],
    lesson: 'Financial documents need the same object-level authorization as everything else — role checks alone leak billing data between customers.',
    impact: 'Competitors read each other\'s billing through the client\'s portal — pricing, plans and company details exposed.',
    report: { title: 'Insecure Direct Object Reference Exposes Employer Invoices', severity: 'Medium', remediation: 'Scope invoice queries to the authenticated employer; return 404 for invoices owned by others.' } },

  /* ---- Admin Panel ---- */
  { id: 'admin-bac', feature: 'Admin Panel', name: 'Admin User List Open to Any Logged-in User',
    owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner', where: 'GET /admin/users',
    hints: ['Some admin pages check your role. This one only checks that you have a session.',
      'A plain seeker session is enough for the full user table — passwords included.',
      'Log in as any seeker and open /admin/users.'],
    lesson: 'Every privileged page must verify the role on the server, every time. One forgotten check exposes the whole user base.',
    impact: 'The entire user list — emails and passwords — is visible to any registered user. Total platform compromise in one click.',
    report: { title: 'Broken Access Control: Admin User Listing Accessible to Non-Admins', severity: 'Critical', remediation: 'Enforce admin role checks server-side on every admin route; never expose password material in any view.' } },
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'CSRF on Admin User Deletion',
    owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate', where: 'POST /admin/user/:id/delete',
    hints: ['Destructive admin actions need the same anti-CSRF protection as everything else.',
      'The delete endpoint performs the action without verifying the session marker.',
      'As an admin, POST to /admin/user/3/delete WITHOUT the hx_origin field — the user is deleted.'],
    lesson: 'A missing CSRF token on a destructive admin action means any website an admin visits can delete users through their browser.',
    impact: 'One malicious link wipes the client\'s user accounts while an admin is logged in — vandalism at scale.',
    report: { title: 'Missing CSRF Protection on Administrative User Deletion', severity: 'High', remediation: 'Require per-session CSRF tokens on all state-changing admin actions; consider re-authentication for destructive ones.' } },

  /* ---- Platform & API ---- */
  { id: 'api-debug', feature: 'Platform & API', name: 'Unauthenticated Debug Endpoint Dumps All Data',
    owasp: 'A05:2021 – Security Misconfiguration', difficulty: 'Beginner', where: 'GET /api/debug',
    hints: ['Developers leave helpers behind. This one needs no login at all.',
      'The endpoint serialises the whole database — users, passwords, applications — as JSON.',
      'Open /api/debug in a fresh browser with no session and read everything.'],
    lesson: 'Debug and diagnostic endpoints must never ship to production — they bypass every control the app has.',
    impact: 'One URL, no credentials: the attacker downloads the client\'s entire database including plaintext passwords.',
    report: { title: 'Exposed Debug Endpoint Leaks Full Database Without Authentication', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; gate diagnostics behind admin auth and network restrictions.' } }
];
const FEATURES = [...new Set(TESTS.map(t => t.feature))];
function featureStats(f) {
  const list = TESTS.filter(t => t.feature === f);
  return { total: list.length, done: list.filter(t => state.tests[t.id]).length, attempts: state.attempts[f] || 0 };
}
function progress() {
  const total = TESTS.length, done = TESTS.filter(t => state.tests[t.id]).length;
  const features = {}; FEATURES.forEach(f => features[f] = featureStats(f));
  return { lab: LAB_NAME, number: LAB_NUMBER, total, done, pct: total ? Math.floor(done / total * 100) : 0, features, complete: done === total };
}

/* ============================ seed data (in-memory, all fake) ============================ */
const users = [
  { id: 1, email: 'admin@hexajobs.local', password: 'admin123', name: 'Ada Admin', role: 'admin', plan: 'premium', headline: 'Platform administrator' },
  { id: 2, email: 'hr@techcorp.local', password: 'employer123', name: 'Tom Recruiter', role: 'employer', plan: 'free', headline: 'Hiring Manager, TechCorp', company: 'TechCorp' },
  { id: 3, email: 'jobs@foodhub.local', password: 'employer123', name: 'Fiona Foods', role: 'employer', plan: 'basic', headline: 'HR Lead, FoodHub', company: 'FoodHub' },
  { id: 4, email: 'alice@test.local', password: 'alice123', name: 'Alice Applicant', role: 'seeker', plan: 'free', headline: 'Frontend developer looking for remote roles' },
  { id: 5, email: 'bob@test.local', password: 'bob123', name: 'Bob Builder', role: 'seeker', plan: 'free', headline: 'Backend engineer, Node.js' },
  { id: 6, email: 'demo@hexajobs.local', password: 'demo123', name: 'Demo Seeker', role: 'seeker', plan: 'free', headline: 'Demo account' }
];
let nextUserId = 7;
const jobs = [
  { id: 1, employerId: 2, company: 'TechCorp', title: 'Frontend Developer', location: 'Remote', salary: '$70k-$90k', type: 'Full-time', status: 'published', description: 'Build React interfaces for our SaaS platform. 3+ years experience.' },
  { id: 2, employerId: 2, company: 'TechCorp', title: 'Backend Engineer', location: 'Berlin (hybrid)', salary: '$80k-$100k', type: 'Full-time', status: 'published', description: 'Node.js APIs at scale. PostgreSQL, queues, caching.' },
  { id: 3, employerId: 2, company: 'TechCorp', title: 'Chief Technology Officer', location: 'Berlin', salary: '$180k+', type: 'Executive', status: 'draft', description: 'CONFIDENTIAL draft: board-approved CTO search, not yet announced. Do not share.' },
  { id: 4, employerId: 3, company: 'FoodHub', title: 'Delivery Driver', location: 'Dhaka', salary: '$18/hr', type: 'Part-time', status: 'published', description: 'Evening delivery routes, own motorbike required.' },
  { id: 5, employerId: 3, company: 'FoodHub', title: 'Data Analyst', location: 'Remote', salary: '$60k-$75k', type: 'Full-time', status: 'published', description: 'SQL dashboards for operations and growth teams.' }
];
let nextJobId = 6;
const applications = [
  { id: 1, jobId: 1, seekerId: 4, status: 'reviewing', cover: 'Dear TechCorp, I have 4 years of React experience and would love to join your platform team. — Alice' },
  { id: 2, jobId: 1, seekerId: 5, status: 'applied', cover: 'Hello, I am a backend engineer pivoting to frontend. Keen to learn. — Bob' },
  { id: 3, jobId: 4, seekerId: 4, status: 'shortlisted', cover: 'I know Dhaka routes well and can start immediately. — Alice' }
];
let nextAppId = 4;
const cvs = [
  { id: 1, ownerId: 4, filename: 'alice-cv.pdf', content: 'ALICE APPLICANT — CV\nFrontend Developer\nEmail: alice@test.local\nPhone: +880-100-0001\nExperience: 4 years React, TypeScript, CSS.\nAddress: House 12, Road 5, Dhanmondi, Dhaka.' },
  { id: 2, ownerId: 5, filename: 'bob-cv.pdf', content: 'BOB BUILDER — CV\nBackend Engineer\nEmail: bob@test.local\nPhone: +880-100-0002\nExperience: 5 years Node.js, PostgreSQL, Docker.\nAddress: Flat 8B, Mirpur, Dhaka.' }
];
let nextCvId = 3;
const PLANS = { free: 0, basic: 49, premium: 149 };
const invoices = [
  { id: 1, employerId: 2, item: 'Basic plan — October 2026', amount: 49 },
  { id: 2, employerId: 3, item: 'Basic plan — October 2026', amount: 49 }
];
let nextInvoiceId = 3;
const sessions = new Map(); // sid -> userId
const issuedReset = new Set(); // tokens actually issued via /forgot

/* ---------------- key vault (fragment set B) ---------------- */

const _fragB2 = ['LVZDNA==', 'U1VNQg==', 'S0VZUw=='];
const ENTRY_KEY_SHA256 = 'bdaf4f47957cbbc8508f79c199420b7d3e0d48768ee001c122ca9a7ee8fde694';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */
function completionKey() { return fragJoin(_fragA2.concat(_fragB2)); }

/* ---------------- mini string-built-SQL evaluator ----------------
 * Emulates a naive backend that concatenates input into a WHERE clause
 * and evaluates it: supports field = 'lit', 'lit' = 'lit', LIKE '%x%',
 * AND / OR (AND binds tighter) and -- comments.                      */
function splitKw(s, kw) { return s.split(new RegExp('\\s+' + kw + '\\s+', 'i')); }
function sideVal(row, side) {
  side = side.trim();
  if (side.length >= 2 && side.startsWith("'") && side.endsWith("'")) return side.slice(1, -1);
  return row[side] !== undefined ? String(row[side]) : side;
}
function evalCond(row, cond) {
  cond = cond.trim();
  const like = cond.match(/^(.+?)\s+LIKE\s+(.+)$/i);
  if (like) {
    const v = sideVal(row, like[1]); const pat = sideVal(row, like[2]).replace(/%/g, '');
    return v.includes(pat);
  }
  const m = cond.match(/^(.+?)\s*=\s*(.+)$/);
  if (!m) return false;
  return sideVal(row, m[1]) === sideVal(row, m[2]);
}
function evalWhere(row, where) {
  let s = String(where);
  const ci = s.indexOf('--'); if (ci >= 0) s = s.slice(0, ci);
  return splitKw(s, 'OR').some(part => splitKw(part, 'AND').every(c => evalCond(row, c)));
}

/* --------------------------- http helpers --------------------------- */
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function parseCookies(req) {
  const out = {}; const h = req.headers.cookie || '';
  h.split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}
function readBody(req) {
  return new Promise(res => {
    let d = ''; req.on('data', c => { d += c; if (d.length > 2e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) { try { return res(JSON.parse(d || '{}')); } catch (e) { return res({}); } }
      const o = {}; new URLSearchParams(d).forEach((v, k) => o[k] = v); res(o);
    });
    req.on('error', () => res({}));
  });
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function redirect(res, loc, cookies) {
  const h = { Location: loc };
  if (cookies && cookies.length) h['Set-Cookie'] = cookies;
  res.writeHead(302, h); res.end();
}
function sessionUser(req) {
  const sid = parseCookies(req).hx_session;
  if (!sid || !sessions.has(sid)) return null;
  return users.find(u => u.id === sessions.get(sid) && !u.deleted) || null;
}
function startSession(res, user) {
  const sid = crypto.randomBytes(12).toString('hex');
  sessions.set(sid, user.id);
  return [`hx_session=${sid}; Path=/; HttpOnly`, `hx_role=${user.role}; Path=/`, `hx_origin=1; Path=/`];
}

/* ------------------------------ layout ------------------------------ */
function chatWidget() {
  return `<div id="hxc" style="position:fixed;right:14px;bottom:14px;width:320px;font-family:monospace;z-index:99">
  <div style="background:#111;color:#7ee787;padding:6px 10px;border-radius:8px 8px 0 0;cursor:pointer" onclick="var b=document.getElementById('hxb');b.style.display=b.style.display==='none'?'block':'none'">🤖 Lab Coach — HexaJobs</div>
  <div id="hxb" style="display:none;background:#0d1117;border:1px solid #30363d;border-top:none;padding:8px">
    <div id="hxlog" style="height:170px;overflow:auto;color:#c9d1d9;font-size:12px;margin-bottom:6px"></div>
    <div style="display:flex;gap:4px"><input id="hxi" style="flex:1;background:#161b22;color:#fff;border:1px solid #30363d;padding:5px" placeholder="Ask the coach…">
    <button onclick="hxSend()" style="background:#238636;color:#fff;border:none;padding:5px 10px;cursor:pointer">Send</button></div>
  </div></div>
<script>
async function hxSend(){var i=document.getElementById('hxi'),l=document.getElementById('hxlog');var m=i.value.trim();if(!m)return;i.value='';
l.innerHTML+='<div><b>You:</b> '+m.replace(/</g,'&lt;')+'</div>';
try{var r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})});var j=await r.json();
l.innerHTML+='<div style="margin:4px 0"><b>Coach:</b> '+String(j.reply).replace(/</g,'&lt;')+'</div>';}catch(e){l.innerHTML+='<div>Coach unavailable.</div>';}
l.scrollTop=l.scrollHeight;}
</script>`;
}
function layout(req, title, body, opts) {
  opts = opts || {};
  const p = progress();
  const bar = `<div style="background:#ddd;height:10px;border-radius:5px;overflow:hidden"><div style="background:#2da44e;height:10px;width:${p.pct}%"></div></div>`;
  const head = opts.bare ? '' : `<header style="display:flex;align-items:center;gap:12px;border-bottom:2px solid #eee;padding-bottom:8px;margin-bottom:14px">
    <img src="/logo.png" alt="HexaCyberLab" style="height:38px">
    <div style="flex:1"><strong>LAB ${LAB_NUMBER} — ${LAB_NAME}</strong><br>
    <span style="font-size:13px">${p.done}/${p.total} tests · ${p.pct}%</span> ${bar}</div>
    <nav style="font-size:13px"><a href="/">Home</a> · <a href="/jobs">Jobs</a> · <a href="/tests">Mission Board</a> · <a href="/complete">Complete</a>${opts.user ? ' · <a href="/dashboard">Dashboard</a> · <a href="/logout">Logout (' + esc(opts.user.name) + ')</a>' : ' · <a href="/login">Login</a>'}</nav></header>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} — LAB ${LAB_NUMBER} ${LAB_NAME}</title></head>
<body style="font-family:Verdana,Arial,sans-serif;max-width:920px;margin:18px auto;padding:0 14px;color:#1f2328">
${head}<h2>${esc(title)}</h2>${body}${chatWidget()}</body></html>`;
}
function gatePage(req) {
  const body = `<div style="border:2px solid #d29922;padding:18px;border-radius:8px;background:#fff8c5">
  <p>🔒 <strong>This lab is locked.</strong> Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
  <form method="POST" action="/unlock"><input name="key" size="42" placeholder="Completion key from Lab ${LAB_NUMBER - 1}" style="padding:6px">
  <button style="padding:6px 14px">Unlock Lab ${LAB_NUMBER}</button></form>
  <p style="font-size:12px">Sequential unlock is part of the HexaCyberLab lab system: finish the previous lab at 100% to earn its key.</p></div>`;
  return layout(req, `LAB ${LAB_NUMBER} — ${LAB_NAME} (Locked)`, body, { bare: true });
}
const XSS_RE = /<script|onerror\s*=|onload\s*=|<svg|<img[^>]*onerror|<iframe|javascript:/i;

/* ============================== pages ============================== */
function homePage(req, res, user) {
  const pub = jobs.filter(j => j.status === 'published');
  const body = `<p>Welcome to <strong>HexaJobs</strong> — find work, hire talent. ${pub.length} open roles right now.</p>
  <ul>${pub.map(j => `<li><a href="/job/${j.id}">${esc(j.title)}</a> — ${esc(j.company)} · ${esc(j.location)} · ${esc(j.salary)}</li>`).join('')}</ul>
  <p><a href="/jobs">Browse all jobs</a> ${user ? '' : '· <a href="/register">Create an account</a>'}</p>
  <p style="font-size:12px;color:#666">Training lab — every flow is intentionally vulnerable. See the <a href="/tests">Mission Board</a>.</p>`;
  send(res, 200, layout(req, 'HexaJobs — Find your next role', body, { user }));
}
function loginPage(req, res, msg) {
  const body = `${msg ? `<p style="color:#b00">${esc(msg)}</p>` : ''}
  <form method="POST" action="/login">
    <p>Email <input name="email" size="34"></p>
    <p>Password <input name="password" type="password" size="34"></p>
    <button>Log in</button></form>
  <div style="background:#f6f8fa;border:1px solid #ddd;padding:10px;margin-top:14px">
    <strong>Try the demo!</strong> Seeker demo account — email: <code>demo@hexajobs.local</code> · password: <code>demo123</code>
  </div>
  <p><a href="/forgot">Forgot your password?</a> · <a href="/register">Register</a></p>`;
  send(res, 200, layout(req, 'Log in', body, {}));
}
function registerPage(req, res, msg) {
  const body = `${msg ? `<p style="color:#b00">${esc(msg)}</p>` : ''}
  <form method="POST" action="/register">
    <p>Full name <input name="name" size="34"></p>
    <p>Email <input name="email" size="34"></p>
    <p>Password <input name="password" type="password" size="34"></p>
    <button>Create account</button></form>
  <p>Job seekers and employers welcome. Employers start on the free plan.</p>`;
  send(res, 200, layout(req, 'Register', body, {}));
}
function forgotPage(req, res, msg, color) {
  const body = `${msg ? `<p style="color:${color || '#333'}">${esc(msg)}</p>` : ''}
  <form method="POST" action="/forgot"><p>Account email <input name="email" size="34"></p><button>Send reset link</button></form>`;
  send(res, 200, layout(req, 'Forgot password', body, {}));
}
function resetPage(req, res, token, msg) {
  const body = `${msg ? `<p style="color:#b00">${esc(msg)}</p>` : ''}
  <form method="POST" action="/reset"><input type="hidden" name="token" value="${esc(token || '')}">
  <p>New password <input name="password" type="password" size="30"></p><button>Set new password</button></form>`;
  send(res, 200, layout(req, 'Reset password', body, {}));
}
function jobsPage(req, res, user, q) {
  let results;
  if (q) {
    // VULNERABLE: string-built query — the search term is glued into the WHERE clause.
    const where = `status = 'published' AND title LIKE '%${q}%'`;
    results = jobs.filter(j => evalWhere(j, where));
    if (results.some(j => j.status !== 'published')) pass('search-sqli');
    if (XSS_RE.test(q)) pass('search-xss');
  } else {
    results = jobs.filter(j => j.status === 'published');
  }
  const body = `<form method="GET" action="/jobs"><input name="q" size="36" value="${q ? esc(q) : ''}" placeholder="Search job titles…"> <button>Search</button></form>
  ${q ? `<p>Results for: ${q}</p>` : ''}
  <ul>${results.map(j => `<li><a href="/job/${j.id}">${esc(j.title)}</a> — ${esc(j.company)} · ${esc(j.location)} · ${esc(j.salary)}${j.status !== 'published' ? ' · <b>[' + esc(j.status.toUpperCase()) + ']</b>' : ''}</li>`).join('') || '<li>No jobs found.</li>'}</ul>`;
  send(res, 200, layout(req, 'Browse jobs', body, { user }));
}
function jobPage(req, res, user, job) {
  bump('Job Listings');
  // VULNERABLE: no status / ownership check — draft jobs are readable by direct URL.
  if (job.status !== 'published' && (!user || user.id !== job.employerId)) pass('jobs-draft');
  const mine = user && applications.find(a => a.jobId === job.id && a.seekerId === user.id);
  const body = `<p><strong>${esc(job.company)}</strong> · ${esc(job.location)} · ${esc(job.type)} · ${esc(job.salary)} · status: ${esc(job.status)}</p>
  <p>${esc(job.description)}</p>
  ${user && user.role === 'seeker' ? (mine ? `<p>You applied — status: <b>${esc(mine.status)}</b> (<a href="/application/${mine.id}">view application</a>)</p>`
    : `<h3>Apply now</h3><form method="POST" action="/job/${job.id}/apply"><input type="hidden" name="hx_origin" value="1">
       <p><textarea name="cover" rows="4" cols="60" placeholder="Cover letter"></textarea></p><button>Submit application</button></form>`) : ''}
  ${user && user.role === 'employer' && user.id === job.employerId ? `<p><a href="/employer">Manage in employer dashboard</a></p>` : ''}`;
  send(res, 200, layout(req, job.title, body, { user }));
}
function dashboardPage(req, res, user) {
  let body = `<p>Signed in as <strong>${user.name}</strong> (${esc(user.email)}) — role: <b>${esc(user.role)}</b> · plan: <b>${esc(user.plan)}</b></p>
  <h3>Profile</h3>
  <form method="POST" action="/profile"><input type="hidden" name="hx_origin" value="1">
    <p>Display name <input name="name" size="34" value="${user.name}"></p>
    <p>Headline <input name="headline" size="48" value="${esc(user.headline || '')}"></p>
    <button>Save profile</button></form>`;
  if (user.role === 'seeker') {
    const myApps = applications.filter(a => a.seekerId === user.id);
    const myCvs = cvs.filter(c => c.ownerId === user.id);
    body += `<h3>My applications</h3><ul>${myApps.map(a => { const j = jobs.find(x => x.id === a.jobId); return `<li><a href="/application/${a.id}">Application #${a.id}</a> — ${esc(j ? j.title : '?')} · status: <b>${esc(a.status)}</b></li>`; }).join('') || '<li>None yet.</li>'}</ul>
    <h3>My CVs</h3><ul>${myCvs.map(c => `<li><a href="/cv/file/${c.id}">${esc(c.filename)}</a></li>`).join('') || '<li>None uploaded.</li>'}</ul>
    <form method="POST" action="/cv/upload"><input type="hidden" name="hx_origin" value="1">
      <p>Filename <input name="filename" size="26" placeholder="my-cv.pdf"></p>
      <p><textarea name="content" rows="4" cols="60" placeholder="CV text content"></textarea></p>
      <button>Upload CV</button></form>`;
  }
  if (user.role === 'employer') {
    const myJobs = jobs.filter(j => j.employerId === user.id);
    body += `<h3>My job postings</h3>${myJobs.map(j => {
      const apps = applications.filter(a => a.jobId === j.id);
      return `<div style="border:1px solid #ddd;padding:8px;margin:6px 0"><strong>${esc(j.title)}</strong> (${esc(j.status)}) — ${apps.length} applicant(s)
      <ul>${apps.map(a => { const s = users.find(u => u.id === a.seekerId); return `<li><a href="/application/${a.id}">Application #${a.id}</a> by ${s ? s.name : '?'} — status: <b>${esc(a.status)}</b></li>`; }).join('')}</ul>
      <form method="POST" action="/employer/job/${j.id}/edit"><input type="hidden" name="hx_origin" value="1">
      <input name="title" size="30" value="${esc(j.title)}"> <input name="salary" size="12" value="${esc(j.salary)}"> <button>Edit posting</button></form></div>`; }).join('')}
    <h3>Plan & billing</h3><p>Current plan: <b>${esc(user.plan)}</b>. Upgrade:
    <form method="POST" action="/employer/plan/upgrade"><input type="hidden" name="hx_origin" value="1">
      <select name="plan"><option value="basic">Basic — $${PLANS.basic}</option><option value="premium">Premium — $${PLANS.premium}</option></select>
      <input type="hidden" name="price" value="">
      <button>Upgrade</button></form></p>
    <p>Invoices: ${invoices.filter(i => i.employerId === user.id).map(i => `<a href="/employer/invoice/${i.id}">#${i.id}</a>`).join(' ') || 'none'}</p>`;
  }
  if (user.role === 'admin') body += `<p><a href="/admin">Admin panel</a> · <a href="/admin/users">User list</a></p>`;
  send(res, 200, layout(req, 'Dashboard', body, { user }));
}
function applicationPage(req, res, user, app) {
  bump('Applications');
  const job = jobs.find(j => j.id === app.jobId);
  const seeker = users.find(u => u.id === app.seekerId);
  // VULNERABLE: any logged-in user can read any application.
  if (user.id !== app.seekerId && (!job || user.id !== job.employerId)) pass('app-idor-read');
  const body = `<p>Job: <a href="/job/${app.jobId}">${esc(job ? job.title : '?')}</a> at ${esc(job ? job.company : '')}</p>
  <p>Candidate: ${seeker ? seeker.name : '?'} (${esc(seeker ? seeker.email : '')})</p>
  <p>Status: <b>${esc(app.status)}</b></p>
  <p>Cover letter:</p><blockquote style="background:#f6f8fa;padding:10px">${esc(app.cover)}</blockquote>
  <h3>Update status</h3>
  <form method="POST" action="/application/${app.id}/status"><input type="hidden" name="hx_origin" value="1">
    <select name="status"><option>applied</option><option>reviewing</option><option>shortlisted</option><option>rejected</option><option>hired</option></select>
    <button>Update</button></form>`;
  send(res, 200, layout(req, `Application #${app.id}`, body, { user }));
}

/* ========================= Mission Board / complete / certificate ========================= */
function testsPage(req, res, user) {
  const p = progress();
  const groups = FEATURES.map(f => {
    const rows = TESTS.filter(t => t.feature === f).map((t, i) => {
      const done = state.tests[t.id];
      const hints = t.hints.map((h, hi) => `<div id="hint-${t.id}-${hi}" style="display:none;background:#fff8c5;padding:5px;margin:3px 0">💡 ${esc(h)}</div>`).join('');
      return `<div style="border:1px solid #ddd;padding:8px;margin:6px 0">
      <strong>${done ? '✓' : '○'} ${esc(t.name)}</strong> — ${esc(t.owasp)} · ${esc(t.difficulty)} · <span style="font-size:12px">${esc(t.where)}</span>
      ${hints}<button onclick="for(var k=0;k<3;k++){var e=document.getElementById('hint-${t.id}-'+k);if(e.style.display==='none'){e.style.display='block';break;}}">Hints</button></div>`;
    }).join('');
    const st = featureStats(f);
    return `<h3>${esc(f)} — ${st.done}/${st.total} done · attempts on this feature: ${st.attempts}</h3>${rows}`;
  }).join('');
  send(res, 200, layout(req, `Mission Board — ${p.done}/${p.total} tests · ${p.pct}%`, groups, { user }));
}
function completePage(req, res, user) {
  const p = progress();
  if (!p.complete) {
    const left = TESTS.filter(t => !state.tests[t.id]).map(t => `<li>${esc(t.name)} (${esc(t.feature)})</li>`).join('');
    return send(res, 200, layout(req, 'Not complete yet', `<p>Progress: ${p.done}/${p.total} tests (${p.pct}%). Finish every test to unlock the completion summary, your certificate and the key to the next lab.</p><h3>Still open</h3><ul>${left}</ul>`, { user }));
  }
  const perFeature = FEATURES.map(f => `<li>${esc(f)}: ${featureStats(f).total} vulnerabilities</li>`).join('');
  const techniques = TESTS.map(t => `<li>${esc(t.name)}</li>`).join('');
  const lessons = TESTS.map(t => `<li><strong>${esc(t.name)}:</strong> ${esc(t.lesson)}</li>`).join('');
  const impacts = TESTS.map(t => `<li><strong>${esc(t.name)}:</strong> ${esc(t.impact)}</li>`).join('');
  const reports = TESTS.map(t => `<li><strong>${esc(t.report.title)}</strong> — Severity: ${esc(t.report.severity)} — Fix: ${esc(t.report.remediation)}</li>`).join('');
  const name = state.testerName || (user ? user.name : 'HexaCyberLab Tester');
  const body = `<h3>🎉 Lab ${LAB_NUMBER} — ${LAB_NAME} completed at 100%</h3>
  <p><strong>(1) Features in this lab:</strong> ${FEATURES.length}</p>
  <p><strong>(2) Vulnerabilities per feature:</strong></p><ul>${perFeature}</ul>
  <p><strong>(3) Ways testing was done — ${p.total} techniques completed:</strong></p><ul>${techniques}</ul>
  <p><strong>(4) What you learned:</strong></p><ul>${lessons}</ul>
  <p><strong>(5) What this means for a real client:</strong></p><ul>${impacts}</ul>
  <p><strong>(6) Writing it in a real report:</strong></p><ul>${reports}</ul>
  <div style="border:2px solid #2da44e;padding:14px;border-radius:8px;background:#f0fff4">
    <p>🔑 <strong>Completion key for Lab ${LAB_NUMBER + 1}:</strong></p>
    <p style="font-size:20px;font-family:monospace" id="completion-key">${esc(completionKey())}</p>
    <p style="font-size:12px">Paste this key into the next lab to unlock it. Keep it — it is only shown at 100%.</p></div>
  <form method="POST" action="/complete/name"><p>Your name for the certificate: <input name="name" size="30" value="${esc(name)}"> <button>Save name</button></p></form>
  <p><a href="/certificate">🎓 View your certificate</a></p>`;
  send(res, 200, layout(req, 'Lab complete!', body, { user }));
}
function certificatePage(req, res, user) {
  const p = progress();
  if (!p.complete) return redirect(res, '/complete');
  const name = state.testerName || (user ? user.name : 'HexaCyberLab Tester');
  const date = state.completedAt ? new Date(state.completedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER} ${LAB_NAME}</title>
  <style>@media print{button{display:none}}body{font-family:Georgia,serif;background:#f6f8fa}.card{max-width:720px;margin:40px auto;background:#fff;border:3px double #2da44e;border-radius:12px;padding:36px;text-align:center}</style></head>
  <body><div class="card"><img src="/logo.png" alt="HexaCyberLab" style="height:64px">
  <h1 style="margin:10px 0">Certificate of Completion</h1>
  <p>This certifies that</p><h2 style="margin:6px 0">${esc(name)}</h2>
  <p>has completed 100% of the security tests in</p>
  <h3>LAB ${LAB_NUMBER} — ${LAB_NAME} (${p.total} tests across ${FEATURES.length} features)</h3>
  <p>Completed on ${esc(date)}</p>
  <p style="margin-top:24px"><em>HexaCyberLab — Built by Md. Jony Hassain, Founder</em></p>
  <p><button onclick="window.print()">Print certificate</button></p></div></body></html>`;
  send(res, 200, html);
}

/* ============================== Lab Coach ============================== */
const FEATURE_KEYS = [
  ['login', 'Login & Authentication'], ['authentication', 'Login & Authentication'], ['password', 'Login & Authentication'], ['reset token', 'Login & Authentication'],
  ['registration', 'Registration & Profile'], ['register', 'Registration & Profile'], ['profile', 'Registration & Profile'], ['mass assignment', 'Registration & Profile'], ['csrf', 'Registration & Profile'],
  ['search', 'Job Search'], ['job listing', 'Job Listings'], ['listing', 'Job Listings'], ['draft', 'Job Listings'],
  ['application', 'Applications'], ['apply', 'Applications'],
  ['cv', 'CVs & Files'], ['upload', 'CVs & Files'], ['file', 'CVs & Files'], ['traversal', 'CVs & Files'],
  ['plan', 'Employer Plans & Billing'], ['billing', 'Employer Plans & Billing'], ['invoice', 'Employer Plans & Billing'], ['employer plan', 'Employer Plans & Billing'],
  ['admin', 'Admin Panel'],
  ['api', 'Platform & API'], ['debug', 'Platform & API'], ['platform', 'Platform & API']
];
function matchFeature(msg) {
  const m = msg.toLowerCase();
  let best = null, bl = 0;
  for (const [k, f] of FEATURE_KEYS) if (m.includes(k) && k.length > bl) { best = f; bl = k.length; }
  return best;
}
function coachReply(raw) {
  const msg = String(raw || '');
  const m = msg.toLowerCase();
  const p = progress();
  if (/who (built|made|created)|founder|your creator|who is behind/.test(m)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (/key|unlock next|next lab/.test(m)) {
    if (p.complete && state.keyRevealed) return `You completed LAB ${LAB_NUMBER} at 100% — well earned. The completion key for Lab ${LAB_NUMBER + 1} is: ${completionKey()}`;
    return `I don't have the completion key yet — I only receive it when this lab is completed at 100%. You are at ${p.pct}% (${p.done}/${p.total} tests). Finish every test on the Mission Board (/tests) and the key will appear on /complete — and I will be able to share it then.`;
  }
  const feature = matchFeature(msg);
  const wantsHow = /how|help|guide|solve|step|hint|do i|exploit|attack/.test(m);
  if (feature && wantsHow) {
    const st = featureStats(feature);
    const open = TESTS.filter(t => t.feature === feature && !state.tests[t.id]);
    if (!open.length) return `Every test in ${feature} is already complete (${st.done}/${st.total}). Pick another feature on /tests and I will guide you once you have tried it.`;
    if (st.attempts >= 3 || open.length < st.total) {
      const steps = open.map(t => `• ${t.name}: ${t.hints[1]} ${t.hints[2]}`).join('\n');
      return `Step by step for ${feature} (you have tried ${st.attempts} time(s), so guidance is unlocked):\n${steps}`;
    }
    return `That feature is locked for help. First try the ${feature} tests yourself at least 3 times — I can see you've tried ${st.attempts} time(s) so far. After 3 real tries, ask me again and I'll guide you step by step.`;
  }
  if (feature) {
    const st = featureStats(feature);
    const names = TESTS.filter(t => t.feature === feature).map(t => `${state.tests[t.id] ? '✓' : '○'} ${t.name}`).join('\n');
    return `${feature}: ${st.total} tests (${st.done} done, attempts so far: ${st.attempts}).\n${names}\nAsk me "how do I solve the ${feature} tests" after at least 3 tries and I'll walk you through them.`;
  }
  if (/how many|features|tests|progress|status|vulnerabilit/.test(m)) {
    const lines = FEATURES.map(f => { const s = featureStats(f); return `• ${f}: ${s.done}/${s.total}`; }).join('\n');
    return `LAB ${LAB_NUMBER} — ${LAB_NAME} has ${FEATURES.length} features and ${p.total} tests. Your progress: ${p.done}/${p.total} (${p.pct}%).\n${lines}`;
  }
  if (/^(hi|hello|hey|start|help|what)/.test(m) || m.length < 3) {
    const next = TESTS.find(t => !state.tests[t.id]);
    return `Hello! I'm the Lab Coach for LAB ${LAB_NUMBER} — ${LAB_NAME}. This lab has ${FEATURES.length} features and ${p.total} tests; you are at ${p.pct}%. ${next ? `Next open test: "${next.name}" (${next.feature}) — see /tests for hints. I can only guide you step by step after you've tried a feature at least 3 times.` : 'Everything is complete — see /complete for your key and certificate!'}`;
  }
  return `I can help with the ${p.total} tests in this lab. Ask me how many tests a feature has (e.g. "how many tests in Applications?"), or — after at least 3 genuine tries on a feature — ask "how do I solve the <feature> tests" and I'll guide you step by step. The Mission Board is at /tests.`;
}

/* ============================== router ============================== */
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    const pathName = u.pathname;
    const user = sessionUser(req);

    if (pathName === '/logo.png') {
      try { const data = fs.readFileSync(path.join(DIR, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(data); }
      catch (e) { return send(res, 404, 'no logo'); }
    }
    if (pathName === '/api/progress') return send(res, 200, JSON.stringify(progress()), 'application/json');
    if (pathName === '/api/chat' && req.method === 'POST') {
      const b = await readBody(req);
      return send(res, 200, JSON.stringify({ reply: coachReply(b.message) }), 'application/json');
    }
    if (pathName === '/unlock' && req.method === 'POST') {
      const b = await readBody(req);
      if (b.key && entryKeyMatches(String(b.key).trim())) {
        state.unlocked = true; save(); return redirect(res, '/');
      }
      return send(res, 403, layout(req, 'Wrong key', '<p>❌ That key does not unlock this lab. Keys are case-sensitive and come from completing the previous lab at 100%.</p>', { bare: true }));
    }
    if (!state.unlocked) return send(res, 200, gatePage(req));

    /* -------- auth -------- */
    if (pathName === '/login' && req.method === 'GET') return loginPage(req, res);
    if (pathName === '/login' && req.method === 'POST') {
      bump('Login & Authentication');
      const b = await readBody(req);
      const email = String(b.email || ''), password = String(b.password || '');
      // VULNERABLE: string-built query evaluated naively.
      const where = `email = '${email}' AND password = '${password}'`;
      const found = users.filter(x => !x.deleted && evalWhere(x, where))[0];
      if (found) {
        if (password !== found.password) pass('auth-sqli');
        if (email === 'demo@hexajobs.local' && password === 'demo123') pass('auth-default');
        return redirect(res, '/dashboard', startSession(res, found));
      }
      const acct = users.find(x => x.email === email && !x.deleted);
      if (acct) {
        state.track.loginFails[email] = (state.track.loginFails[email] || 0) + 1;
        if (state.track.loginFails[email] >= 10) pass('auth-brute');
        save();
      }
      return loginPage(req, res, acct ? 'Wrong password for this account.' : 'No account exists for that email.');
    }
    if (pathName === '/logout') {
      const sid = parseCookies(req).hx_session; if (sid) sessions.delete(sid);
      return redirect(res, '/', ['hx_session=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0']);
    }
    if (pathName === '/register' && req.method === 'GET') return registerPage(req, res);
    if (pathName === '/register' && req.method === 'POST') {
      bump('Registration & Profile');
      const b = await readBody(req);
      const email = String(b.email || '').trim();
      if (!email || users.some(x => x.email === email)) return registerPage(req, res, 'Email missing or already registered.');
      const pw = String(b.password || '');
      if (pw.length < 8) pass('reg-weakpw'); // VULNERABLE: no real policy — 1-char passwords sail through below.
      // VULNERABLE: mass assignment — role/plan taken straight from the request.
      const nu = { id: nextUserId++, email, password: pw, name: String(b.name || 'New User'), role: ['seeker', 'employer', 'admin'].includes(b.role) ? b.role : 'seeker', plan: PLANS[b.plan] !== undefined ? b.plan : 'free', headline: '' };
      if (nu.role !== 'seeker' || nu.plan !== 'free') pass('reg-massassign');
      if (XSS_RE.test(nu.name)) pass('reg-storedxss');
      users.push(nu);
      return redirect(res, '/dashboard', startSession(res, nu));
    }
    if (pathName === '/forgot' && req.method === 'GET') return forgotPage(req, res);
    if (pathName === '/forgot' && req.method === 'POST') {
      bump('Login & Authentication');
      const b = await readBody(req);
      const email = String(b.email || '').trim();
      if (!state.track.forgotProbes.includes(email)) state.track.forgotProbes.push(email);
      if (state.track.forgotProbes.length >= 5) pass('auth-enum');
      save();
      const acct = users.find(x => x.email === email && !x.deleted);
      if (acct) {
        const tok = `HJ${acct.id}-${acct.id * 137 + 42}`;
        issuedReset.add(tok);
        return forgotPage(req, res, `Account found — a reset link was sent to ${email}. (Lab hint: the link ends with /reset?token=${tok})`, '#2da44e');
      }
      return forgotPage(req, res, 'No account exists for that email address.', '#b00');
    }
    if (pathName === '/reset' && req.method === 'GET') return resetPage(req, res, u.searchParams.get('token') || '');
    if (pathName === '/reset' && req.method === 'POST') {
      bump('Login & Authentication');
      const b = await readBody(req);
      const token = String(b.token || '');
      const acct = users.find(x => !x.deleted && token === `HJ${x.id}-${x.id * 137 + 42}`);
      if (acct) {
        if (!issuedReset.has(token)) pass('auth-reset'); // token was never requested — pure prediction
        acct.password = String(b.password || 'changed123');
        return loginPage(req, res, 'Password updated. Please log in.');
      }
      return resetPage(req, res, token, 'Invalid or expired reset token.');
    }

    /* -------- public pages -------- */
    if (pathName === '/') return homePage(req, res, user);
    if (pathName === '/jobs' && req.method === 'GET') {
      const q = u.searchParams.get('q');
      if (q !== null) bump('Job Search');
      return jobsPage(req, res, user, q || '');
    }
    const jobMatch = pathName.match(/^\/job\/(\d+)$/);
    if (jobMatch && req.method === 'GET') {
      const job = jobs.find(j => j.id === Number(jobMatch[1]));
      if (!job) return send(res, 404, layout(req, 'Not found', '<p>No such job.</p>', { user }));
      return jobPage(req, res, user, job);
    }
    if (pathName === '/tests') return testsPage(req, res, user);
    if (pathName === '/complete') return completePage(req, res, user);
    if (pathName === '/certificate') return certificatePage(req, res, user);
    if (pathName === '/complete/name' && req.method === 'POST') {
      const b = await readBody(req);
      state.testerName = String(b.name || '').slice(0, 80); save();
      return redirect(res, '/complete');
    }

    if (pathName === '/api/debug') {
      bump('Platform & API');
      pass('api-debug'); // VULNERABLE: no authentication at all on the debug dump.
      return send(res, 200, JSON.stringify({ users: users.filter(x => !x.deleted), jobs, applications, cvs: cvs.map(c => ({ id: c.id, ownerId: c.ownerId, filename: c.filename })) }, null, 2), 'application/json');
    }

    /* -------- needs login beyond here -------- */
    if (!user) return redirect(res, '/login');
    if (pathName === '/dashboard') return dashboardPage(req, res, user);
    if (pathName === '/profile' && req.method === 'POST') {
      bump('Registration & Profile');
      const b = await readBody(req);
      // VULNERABLE: the hx_origin session marker is never verified.
      if (!b.hx_origin) pass('reg-csrf');
      if (b.name !== undefined) { user.name = String(b.name); if (XSS_RE.test(user.name)) pass('reg-storedxss'); }
      if (b.headline !== undefined) user.headline = String(b.headline);
      return redirect(res, '/dashboard');
    }
    const applyMatch = pathName.match(/^\/job\/(\d+)\/apply$/);
    if (applyMatch && req.method === 'POST') {
      bump('Applications');
      const b = await readBody(req);
      const job = jobs.find(j => j.id === Number(applyMatch[1]));
      if (!job) return send(res, 404, 'no job');
      // VULNERABLE: applicant identity taken from the request body.
      const seekerId = b.seekerId ? Number(b.seekerId) : user.id;
      if (seekerId !== user.id) pass('app-apply-as');
      const app = { id: nextAppId++, jobId: job.id, seekerId, status: 'applied', cover: String(b.cover || '') };
      applications.push(app);
      return redirect(res, `/application/${app.id}`);
    }
    const appMatch = pathName.match(/^\/application\/(\d+)$/);
    if (appMatch && req.method === 'GET') {
      const app = applications.find(a => a.id === Number(appMatch[1]));
      if (!app) return send(res, 404, layout(req, 'Not found', '<p>No such application.</p>', { user }));
      return applicationPage(req, res, user, app);
    }
    const statusMatch = pathName.match(/^\/application\/(\d+)\/status$/);
    if (statusMatch && req.method === 'POST') {
      bump('Applications');
      const b = await readBody(req);
      const app = applications.find(a => a.id === Number(statusMatch[1]));
      if (!app) return send(res, 404, 'no application');
      const job = jobs.find(j => j.id === app.jobId);
      const isEmployerOwner = job && user.id === job.employerId;
      // VULNERABLE: no role/ownership check on workflow transitions.
      app.status = String(b.status || app.status);
      if (!isEmployerOwner && user.id === app.seekerId) pass('app-status-self');
      if (!isEmployerOwner && user.id !== app.seekerId) pass('app-status-idor');
      return redirect(res, `/application/${app.id}`);
    }
    if (pathName === '/cv/upload' && req.method === 'POST') {
      bump('CVs & Files');
      const b = await readBody(req);
      const cv = { id: nextCvId++, ownerId: user.id, filename: String(b.filename || 'cv.txt'), content: String(b.content || '') };
      cvs.push(cv);
      // VULNERABLE: any file type accepted and later served from the app origin.
      if (/\.(html?|svg)$/i.test(cv.filename) && XSS_RE.test(cv.content)) pass('cv-upload');
      return redirect(res, '/dashboard');
    }
    const cvMatch = pathName.match(/^\/cv\/file\/(\d+)$/);
    if (cvMatch && req.method === 'GET') {
      bump('CVs & Files');
      const cv = cvs.find(c => c.id === Number(cvMatch[1]));
      if (!cv) return send(res, 404, 'no cv');
      // VULNERABLE: any logged-in user can open any CV.
      if (cv.ownerId !== user.id) pass('cv-idor');
      const ext = (cv.filename.split('.').pop() || '').toLowerCase();
      const type = ext === 'html' || ext === 'htm' ? 'text/html' : ext === 'svg' ? 'image/svg+xml' : 'text/plain; charset=utf-8';
      return send(res, 200, cv.content, type);
    }
    if (pathName === '/cv/download' && req.method === 'GET') {
      bump('CVs & Files');
      const file = u.searchParams.get('file') || '';
      const own = cvs.find(c => c.filename === file && c.ownerId === user.id);
      if (own) return send(res, 200, own.content, 'text/plain; charset=utf-8');
      // VULNERABLE: user-controlled path joined without confinement.
      const target = path.join(DIR, 'uploads', file);
      try {
        const data = fs.readFileSync(target, 'utf8');
        if (file.includes('..')) pass('cv-traversal');
        return send(res, 200, data, 'text/plain; charset=utf-8');
      } catch (e) { return send(res, 404, layout(req, 'Not found', '<p>No such file in the uploads folder.</p>', { user })); }
    }
    const editMatch = pathName.match(/^\/employer\/job\/(\d+)\/edit$/);
    if (editMatch && req.method === 'POST') {
      bump('Job Listings');
      const b = await readBody(req);
      const job = jobs.find(j => j.id === Number(editMatch[1]));
      if (!job) return send(res, 404, 'no job');
      // VULNERABLE: any employer can edit any employer's posting.
      if (user.id !== job.employerId) pass('jobs-edit-idor');
      if (b.title) job.title = String(b.title);
      if (b.salary) job.salary = String(b.salary);
      return redirect(res, '/dashboard');
    }
    if (pathName === '/employer/plan/upgrade' && req.method === 'POST') {
      bump('Employer Plans & Billing');
      const b = await readBody(req);
      const plan = PLANS[b.plan] !== undefined ? b.plan : 'basic';
      const posted = Number(b.price);
      const price = Number.isFinite(posted) && b.price !== '' && b.price !== undefined ? posted : PLANS[plan];
      // VULNERABLE: the client-posted price is trusted.
      if (price < PLANS[plan]) pass('plan-tamper');
      user.plan = plan;
      invoices.push({ id: nextInvoiceId++, employerId: user.id, item: `${plan[0].toUpperCase() + plan.slice(1)} plan upgrade`, amount: price });
      return redirect(res, '/dashboard');
    }
    const invMatch = pathName.match(/^\/employer\/invoice\/(\d+)$/);
    if (invMatch && req.method === 'GET') {
      bump('Employer Plans & Billing');
      const inv = invoices.find(i => i.id === Number(invMatch[1]));
      if (!inv) return send(res, 404, layout(req, 'Not found', '<p>No such invoice.</p>', { user }));
      // VULNERABLE: role checked, ownership not checked.
      if (inv.employerId !== user.id) pass('invoice-idor');
      const emp = users.find(x => x.id === inv.employerId);
      return send(res, 200, layout(req, `Invoice #${inv.id}`, `<p>Employer: ${esc(emp ? emp.company || emp.name : '?')} (${esc(emp ? emp.email : '')})</p><p>Item: ${esc(inv.item)}</p><p>Amount due: <strong>$${inv.amount}</strong></p><p>Status: PAID</p>`, { user }));
    }
    if (pathName === '/employer') return redirect(res, '/dashboard');

    /* -------- admin -------- */
    if (pathName === '/admin' && req.method === 'GET') {
      bump('Admin Panel');
      const cookies = parseCookies(req);
      // VULNERABLE: admin gate trusts the client-editable role cookie.
      if (cookies.hx_role !== 'admin') return send(res, 403, layout(req, 'Forbidden', '<p>Admins only.</p>', { user }));
      if (user.role !== 'admin') pass('auth-cookie');
      return send(res, 200, layout(req, 'Admin panel', `<p>Welcome to the admin panel, ${esc(user.name)}.</p><p><a href="/admin/users">Manage users</a></p><p>Total users: ${users.filter(x => !x.deleted).length} · jobs: ${jobs.length} · applications: ${applications.length}</p>`, { user }));
    }
    if (pathName === '/admin/users' && req.method === 'GET') {
      bump('Admin Panel');
      // VULNERABLE: only a session is required — the role is never checked.
      if (user.role !== 'admin') pass('admin-bac');
      const rows = users.filter(x => !x.deleted).map(x => `<tr><td>${x.id}</td><td>${x.name}</td><td>${esc(x.email)}</td><td>${esc(x.password)}</td><td>${esc(x.role)}</td><td>${esc(x.plan)}</td>
        <td><form method="POST" action="/admin/user/${x.id}/delete" style="display:inline"><input type="hidden" name="hx_origin" value="1"><button>Delete</button></form></td></tr>`).join('');
      return send(res, 200, layout(req, 'Admin — users', `<table border="1" cellpadding="5"><tr><th>ID</th><th>Name</th><th>Email</th><th>Password</th><th>Role</th><th>Plan</th><th></th></tr>${rows}</table>`, { user }));
    }
    const delMatch = pathName.match(/^\/admin\/user\/(\d+)\/delete$/);
    if (delMatch && req.method === 'POST') {
      bump('Admin Panel');
      const b = await readBody(req);
      const cookies = parseCookies(req);
      if (user.role !== 'admin' && cookies.hx_role !== 'admin') return send(res, 403, 'forbidden');
      const target = users.find(x => x.id === Number(delMatch[1]));
      // VULNERABLE: no CSRF marker verification on a destructive admin action.
      if (target && !target.deleted) { target.deleted = true; if (!b.hx_origin) pass('admin-csrf'); }
      return redirect(res, '/admin/users');
    }
    return send(res, 404, layout(req, 'Not found', '<p>That page does not exist on HexaJobs.</p>', { user }));
  } catch (e) {
    try { send(res, 500, 'Something went wrong — the lab is still running.'); } catch (_) {}
  }
});

/* ============================ doc generation ============================ */
function genDocs() {
  const byFeature = f => TESTS.filter(t => t.feature === f);
  let vuln = `# HexaJobs (LAB ${LAB_NUMBER}) — Vulnerability Map\n\nEvery scored test in the lab, grouped by feature. This is the complete map: ${TESTS.length} tests across ${FEATURES.length} features.\n`;
  for (const f of FEATURES) {
    vuln += `\n## ${f}\n`;
    for (const t of byFeature(f)) vuln += `\n### ${t.name}\n- **OWASP:** ${t.owasp}\n- **Difficulty:** ${t.difficulty}\n- **Location:** ${t.where}\n- **Exploitation outline:** ${t.hints[2]}\n- **Impact:** ${t.impact}\n`;
  }
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'), vuln);
  let guide = `# HexaJobs (LAB ${LAB_NUMBER}) — Practice Guide\n\nChallenges grouped by feature, then difficulty. Each challenge mirrors the Mission Board at /tests. Attempts on a feature unlock the Lab Coach's step-by-step help after 3 tries.\n`;
  const order = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  for (const f of FEATURES) {
    guide += `\n## ${f}\n`;
    for (const t of byFeature(f).slice().sort((a, b) => order[a.difficulty] - order[b.difficulty])) {
      guide += `\n### ${t.name} (${t.difficulty})\n- **Objective:** Make the Mission Board flip this test to done by producing the real exploit effect at ${t.where}.\n- Hint 1: ${t.hints[0]}\n- Hint 2: ${t.hints[1]}\n- Hint 3: ${t.hints[2]}\n`;
    }
  }
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'), guide);
  let fix = `# HexaJobs (LAB ${LAB_NUMBER}) — Fix & Retest\n\nFor every test: the secure implementation, and the regression check that proves the fix.\n`;
  for (const f of FEATURES) {
    fix += `\n## ${f}\n`;
    for (const t of byFeature(f)) {
      fix += `\n### ${t.report.title} (${t.report.severity})\n- **Remediation:** ${t.report.remediation}\n- **Retest:** Repeat the original exploit (${t.where}). It must now fail (403/404 or a safe generic response), the Mission Board test must NOT flip on a fresh progress file, and the legitimate flow must still work.\n`;
    }
  }
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'), fix);
  console.log(`Generated VULNERABILITIES.md, PRACTICE-GUIDE.md, FIX-AND-RETEST.md from ${TESTS.length} tests.`);
}

if (process.argv.includes('--gen-docs')) { genDocs(); process.exit(0); }
server.listen(PORT, HOST, () => console.log(`LAB ${LAB_NUMBER} — ${LAB_NAME} listening on http://${HOST}:${PORT}`));
