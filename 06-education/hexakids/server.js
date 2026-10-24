'use strict';
/*
 * HexaKids — LAB 57 (Category 6: Education & E-learning)
 * A deliberately vulnerable children's learning platform for authorised
 * security training. Zero-dependency Node.js, in-memory seed, local-only.
 * ALL accounts, children, classes and billing data are FAKE seed data.
 * This lab ships with the full HexaCyberLab lab system: entry-key gate,
 * progress tracking with persistence, mission board (/tests), Lab Coach
 * chatbot with the 3-try help lock, completion debrief and certificate.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3066;
const HOST = process.env.HOST || '127.0.0.1';
const LAB_NUMBER = 57;
const LAB_NAME = 'HexaKids';
const PREV_LAB = 56;
const PROGRESS_FILE = path.join(__dirname, 'progress.json');
const LOGO_FILE = path.join(__dirname, 'logo.png');

/* ------------------------------------------------------------------ *
 *  Entry-key material (config region A).
 *  The entry key exists ONLY as encoded shards; it is assembled at
 *  runtime inside the /unlock verification and never stored whole.
 * ------------------------------------------------------------------ */
const ENTRY_SHARDS = ["MDdKMg==","UkQ0SQ==","LVM2Tw==","WUQxWA==","TC03NQ==","TC1YSA=="];
function assembleEntryKey() {
  const rev = ENTRY_SHARDS.map((s) => Buffer.from(s, 'base64').toString('utf8')).join('');
  return rev.split('').reverse().join('');
}

/* ============================ SEED DATA ============================ *
 *  Everything below is fake demo data for adult security testers.    */
const users = [
  { id: 1, email: 'admin@hexakids.local', password: 'admin123', name: 'HexaKids Admin', role: 'admin', plan: 'premium', active: true },
  { id: 2, email: 'priya@hexakids.local', password: 'priya123', name: 'Priya Sharma', role: 'parent', plan: 'free', active: true },
  { id: 3, email: 'marco@hexakids.local', password: 'marco123', name: 'Marco Rossi', role: 'parent', plan: 'premium', active: true },
  { id: 4, email: 'sara@hexakids.local', password: 'sara123', name: 'Sara Ahmed', role: 'parent', plan: 'free', active: true },
  { id: 5, email: 'lee@hexakids.local', password: 'teacher123', name: 'Ms. Lee', role: 'teacher', plan: 'free', active: true },
  { id: 6, email: 'omar@hexakids.local', password: 'omar123', name: 'Mr. Omar', role: 'teacher', plan: 'free', active: true },
  { id: 7, email: 'demo@hexakids.local', password: 'demo123', name: 'Demo Parent', role: 'parent', plan: 'free', active: true },
];
let nextUserId = 8;

const children = [
  { id: 101, name: 'Ayaan', age: 7, parentId: 2, stars: 120, level: 'Explorer' },
  { id: 102, name: 'Mila', age: 5, parentId: 2, stars: 85, level: 'Starter' },
  { id: 201, name: 'Leo', age: 8, parentId: 3, stars: 340, level: 'Champion' },
  { id: 301, name: 'Noor', age: 6, parentId: 4, stars: 60, level: 'Starter' },
];

const classes = [
  { id: 1, name: 'Sunshine 1', teacherId: 5, invite: 'SUN1', members: [101, 102] },
  { id: 2, name: 'Rainbow 2', teacherId: 6, invite: 'RBW2', members: [201] },
];

const activities = [
  { id: 1, title: 'Counting Fun', premium: false, answers: [4, 7, 10] },
  { id: 2, title: 'Word Safari', premium: false, answers: ['cat', 'sun', 'tree'] },
  { id: 3, title: 'Math Quest', premium: true, answers: [12, 9, 15] },
  { id: 4, title: 'Science Lab Jr', premium: true, answers: ['water', 'leaf', 'rock'] },
];

const rewards = [
  { id: 1, title: 'Digital Sticker Pack', cost: 50 },
  { id: 2, title: 'Premium Badge', cost: 200 },
  { id: 3, title: 'Bonus Game Unlock', cost: 500 },
];

const invoices = [
  { id: 1, userId: 3, label: 'Premium Family Plan - Oct 2026', amount: 9.99, status: 'paid' },
  { id: 2, userId: 2, label: 'Free Plan - Oct 2026', amount: 0, status: 'paid' },
  { id: 3, userId: 4, label: 'Free Plan - Oct 2026', amount: 0, status: 'paid' },
];

const PLANS = { free: 0, premium: 9.99 };

/* Runtime (non-persisted) state */
const sessions = new Map();          // sid -> userId
const completions = new Set();       // "userId:activityId"
const redemptions = [];              // { rewardId, childId, byUserId }
const issuedResetTokens = new Set(); // userIds a reset token was issued for
const forgotProbes = { existing: new Set(), missing: new Set() };
const failedLogins = new Map();      // email -> consecutive failures

function resetTokenFor(user) {
  // Predictable by design (the vulnerability): derived only from the user id.
  return 'HK' + user.id + '-' + String((user.id * 731 + 19) % 10000).padStart(4, '0');
}
function apiTokenFor(user) {
  // Predictable by design (the vulnerability): base64 of the email.
  return 'hk_' + Buffer.from(user.email, 'utf8').toString('base64');
}

// === TESTS REGISTRY START ===
const TESTS = [
  /* ---------------- Login & Authentication ---------------- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    where: 'POST /login', exploit: 'Submit an injection payload (e.g. \' OR \'1\'=\'1) as the email on the legacy string-built login query.',
    hints: ['The login form feeds a string-built query on a legacy route.', 'Classic tautology payloads work: think about making the WHERE clause always true.', 'Use email: \' OR \'1\'=\'1 and any password — you land in an account that is not yours.'],
    lesson: 'String-built queries let an attacker rewrite the login logic itself; parameterised queries make the payload inert data.',
    impact: 'On a real learning platform this hands an attacker the first account the query returns — here the admin — without any password.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limit or Lockout', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    where: 'POST /login', exploit: 'Send 10+ failed logins for one account; the app keeps accepting attempts with no throttle, delay or lockout.',
    hints: ['Pick one account and keep guessing wrong passwords.', 'Count the failures — does anything change after 5? After 10?', 'The flaw is proven when the 10th consecutive failure is still processed normally.'],
    lesson: 'Without throttling, an attacker can try thousands of passwords against a parent account at machine speed.',
    impact: 'Parent accounts guard children\'s profiles and billing; unlimited guesses make weak passwords a matter of time.',
    report: { title: 'No Rate Limiting or Account Lockout on Login', severity: 'High', remediation: 'Add progressive delays, lockout and alerting after repeated failures; require MFA for sensitive roles.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User Enumeration via Forgot Password', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    where: 'POST /forgot', exploit: 'Request a reset for an email that exists and for one that does not — the responses differ, confirming which emails hold accounts.',
    hints: ['Compare the forgot-password response for a real account and an invented one.', 'The messages are not identical — one of them confirms the account exists.', 'Probe one existing and one non-existing email; the difference itself is the leak.'],
    lesson: 'Differential responses turn a public form into an account-existence oracle for targeted attacks.',
    impact: 'Attackers can build a verified list of parent emails for phishing and credential stuffing against the platform.',
    report: { title: 'User Enumeration via Differential Forgot-Password Responses', severity: 'Medium', remediation: 'Return one generic response regardless of whether the account exists.' } },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Published Demo Credentials Still Active', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    where: 'POST /login', exploit: 'Log in with the demo account printed in the README (demo@hexakids.local / demo123).',
    hints: ['The README lists the test accounts — one of them is a public demo account.', 'Demo accounts shipped for trials are rarely disabled.', 'Use demo@hexakids.local with password demo123.'],
    lesson: 'Seeded/demo accounts with known passwords are live backdoors in production.',
    impact: 'Anyone who reads public documentation can walk into a real account with full parent privileges.',
    report: { title: 'Active Demo Account with Published Credentials', severity: 'High', remediation: 'Remove or disable demo/seed accounts in production and rotate any shared credentials.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07:2021 Authentication Failures', difficulty: 'Intermediate',
    where: 'POST /reset', exploit: 'The reset token is derived only from the user id (HK<id>-<checksum>); compute any user\'s token and reset their password without ever requesting one.',
    hints: ['Request a reset for your own account and look at the token format.', 'The token contains the user id and a small checksum — nothing random.', 'Token = HK<id>-((id*731+19) mod 10000, zero-padded). Forge one for another user and POST /reset.'],
    lesson: 'Reset tokens must be long, random and single-use; anything derivable from public ids is a takeover primitive.',
    impact: 'Full account takeover of any parent or teacher by id alone — no inbox access needed.',
    report: { title: 'Password-Reset Tokens Are Predictable (Derived from User ID)', severity: 'Critical', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), expire them quickly and make them single-use.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Session Role Cookie Tampering', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'Cookie: hx_role', exploit: 'The server trusts the client-supplied hx_role cookie; set it to admin and open /admin with a parent session.',
    hints: ['Look at the cookies the app sets after login — one of them names your role.', 'The server reads your role from that cookie instead of its own records.', 'Set hx_role=admin in your browser or with curl, keep your normal session, and visit /admin.'],
    lesson: 'Authorisation data must live server-side; anything the client can edit will be edited.',
    impact: 'Every parent becomes an admin — user management, billing and all children\'s data exposed.',
    report: { title: 'Privilege Escalation via Client-Controlled Role Cookie', severity: 'Critical', remediation: 'Store role server-side in the session; never trust client-supplied role claims.' } },

  /* ---------------- Registration & Profile ---------------- */
  { id: 'reg-weakpass', feature: 'Registration & Profile', name: 'Weak Password Policy (1-Character Passwords)', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    where: 'POST /register', exploit: 'Register a new account with a 1-character password — it is accepted.',
    hints: ['Try registering with the shortest password you can think of.', 'There is no minimum length or complexity check at all.', 'Password "a" works.'],
    lesson: 'Password policy is the first line of defence; accepting 1-character passwords invites instant compromise.',
    impact: 'Accounts protected by trivial passwords fall to the first guess in any credential attack.',
    report: { title: 'No Minimum Password Strength Enforced at Registration', severity: 'Medium', remediation: 'Enforce a minimum length (≥10) and block known-breached passwords.' } },
  { id: 'reg-massassign', feature: 'Registration & Profile', name: 'Mass Assignment — Self-Assigned Role and Premium Plan', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /register', exploit: 'Add role=teacher (or plan=premium) to the registration POST; the server binds the whole body onto the new account.',
    hints: ['The registration handler copies every submitted field onto the user object.', 'What fields does a user have that the form never shows? Think role and plan.', 'POST /register with email, password, name plus role=teacher — your account is created as a teacher.'],
    lesson: 'Binding request bodies directly to models lets users write fields they should never touch.',
    impact: 'Attackers self-register as teachers or premium members — instant privilege and free paid tiers.',
    report: { title: 'Mass Assignment in Registration Allows Role/Plan Escalation', severity: 'High', remediation: 'Whitelist bindable fields per endpoint; assign role and plan server-side only.' } },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    where: 'POST /register, POST /profile', exploit: 'Register or update your profile with an HTML/JS payload as the display name; it is stored and rendered raw on the dashboard.',
    hints: ['Your display name is shown on the dashboard exactly as typed.', 'Try a name containing an <img> tag with an error handler.', 'Name: <img src=x onerror=alert(1)> — it is stored and rendered unescaped.'],
    lesson: 'Stored XSS in profile fields fires in other users\' browsers — including admins viewing the account.',
    impact: 'An attacker can run script in a teacher\'s or admin\'s browser and hijack their session.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Contextually escape all user-supplied output and validate input on write.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /profile', exploit: 'Submit a profile change with a cross-site Origin (as a malicious site would from a logged-in victim\'s browser); no token is checked and the change is applied.',
    hints: ['Profile updates change state with a plain POST and no anti-CSRF token.', 'A browser sends cookies automatically — the question is whether the server checks where the request came from.', 'POST /profile with header Origin: https://evil.example while logged in — the change is applied anyway.'],
    lesson: 'State-changing forms without CSRF tokens can be driven by any website the victim visits.',
    impact: 'Attackers silently rewrite a parent\'s profile (name, contact data) through a booby-trapped page.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require per-session CSRF tokens on all state-changing requests and verify Origin/Referer.' } },

  /* ---------------- Children & Reports ---------------- */
  { id: 'child-idor', feature: 'Children & Reports', name: 'Child Profile IDOR — Another Family\'s Child', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'GET /children/:id', exploit: 'As one parent, open another family\'s child profile by changing the id (e.g. /children/201).',
    hints: ['Child profiles live at predictable numeric URLs.', 'Nothing checks that the child belongs to your family.', 'Log in as Priya and open /children/201 — Leo belongs to Marco\'s family.'],
    lesson: 'Object-level authorisation must be checked on every request; ids are not a security boundary.',
    impact: 'Strangers can view children\'s names, ages and levels across the whole platform — a serious safeguarding failure.',
    report: { title: 'Insecure Direct Object Reference on Child Profiles', severity: 'High', remediation: 'Verify the requesting user owns (or is authorised for) the child record on every access.' } },
  { id: 'child-report', feature: 'Children & Reports', name: 'Progress Report IDOR', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'GET /children/:id/report', exploit: 'Open the progress report of a child from another family by id.',
    hints: ['Reports hang off the same predictable child ids.', 'The report page repeats the profile page\'s missing ownership check.', 'As Priya, open /children/301/report — Noor\'s report from Sara\'s family.'],
    lesson: 'Every view of an object — detail, report, export — needs its own ownership check.',
    impact: 'Detailed learning progress of other people\'s children leaks to any signed-in parent.',
    report: { title: 'Insecure Direct Object Reference on Progress Reports', severity: 'High', remediation: 'Enforce per-object authorisation on report endpoints, not just profile pages.' } },
  { id: 'child-stars', feature: 'Children & Reports', name: 'Stars/Points Inflation via API', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /api/award', exploit: 'The award endpoint is meant for teachers giving ≤10 stars to their own class; call it as a parent for any child with any amount.',
    hints: ['There is an API endpoint teachers use to award stars.', 'It never checks who you are, whose child it is, or how many stars you grant.', 'POST /api/award {childId:301, stars:9999} as any parent — the balance jumps.'],
    lesson: 'Business rules (who, whom, how much) are security controls on value-bearing endpoints.',
    impact: 'The whole reward economy collapses — stars, levels and paid rewards can be forged at will.',
    report: { title: 'Unauthorised Stars Awarding via API (No Role, Ownership or Cap Checks)', severity: 'High', remediation: 'Server-side enforce role, class membership and a per-award cap on the award endpoint.' } },

  /* ---------------- Activities & Rewards ---------------- */
  { id: 'act-premium', feature: 'Activities & Rewards', name: 'Premium Activities Without a Subscription', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'POST /activities/:id/complete', exploit: 'As a free-plan parent, complete a premium activity directly; the paywall is only visual.',
    hints: ['Premium activities are greyed out in the UI for free families — but the completion endpoint still answers.', 'UI hiding is not access control.', 'As a free parent, POST /activities/3/complete — Math Quest completes and progress is recorded.'],
    lesson: 'Paywalls must be enforced on the server for every premium action, not just drawn in the UI.',
    impact: 'The entire paid content library is free to anyone who calls the endpoint — direct revenue loss.',
    report: { title: 'Premium Content Accessible Without Subscription (Client-Side Paywall Only)', severity: 'High', remediation: 'Check the account\'s plan server-side before serving or completing premium activities.' } },
  { id: 'act-answers', feature: 'Activities & Rewards', name: 'Quiz Answers Exposed via API', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'GET /api/activities/:id/answers', exploit: 'Fetch the answer key for any activity; the API returns it to any logged-in user.',
    hints: ['The player app needs answers to grade — find the endpoint it calls.', 'Grading data shipped to the client is public data.', 'GET /api/activities/3/answers returns the full answer key.'],
    lesson: 'Never send answer keys or grading secrets to the client; grade server-side.',
    impact: 'Children (or parents) can ace every activity, destroying progress data the product sells to families and schools.',
    report: { title: 'Assessment Answer Keys Exposed to Clients', severity: 'Medium', remediation: 'Grade submissions server-side; never return answer keys to clients.' } },
  { id: 'act-reward', feature: 'Activities & Rewards', name: 'Reward Redemption Without Enough Stars', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /rewards/:id/redeem', exploit: 'Redeem a reward costing more stars than the child has; the balance is never checked and goes negative.',
    hints: ['Rewards cost stars — try redeeming one a child cannot afford.', 'The endpoint subtracts first and asks questions never.', 'Redeem reward 3 (500 stars) for Noor (60 stars) — it succeeds and her balance goes negative.'],
    lesson: 'Balance checks belong in the same server-side transaction as the deduction.',
    impact: 'Paid-tier rewards are redeemed for free, and negative balances corrupt the whole points economy.',
    report: { title: 'Missing Balance Check Allows Reward Redemption with Insufficient Stars', severity: 'High', remediation: 'Verify sufficient balance server-side and reject redemptions that would overdraw.' } },

  /* ---------------- Classes & Teachers ---------------- */
  { id: 'class-scope', feature: 'Classes & Teachers', name: 'Teacher Access to Children Outside Their Class', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'GET /children/:id', exploit: 'As a teacher, open the profile of a child who is not in any of your classes.',
    hints: ['Teachers can view their own class children — the check stops there.', 'Try a child id from a different class, or no class at all.', 'As Ms. Lee (Sunshine 1), open /children/201 — Leo is in Mr. Omar\'s class.'],
    lesson: 'Role alone is not scope: a teacher\'s authority ends at their own class roster.',
    impact: 'Any teacher can browse every child on the platform — a safeguarding and privacy breach.',
    report: { title: 'Teachers Can Access Children Outside Their Assigned Classes', severity: 'High', remediation: 'Scope teacher access to children enrolled in their own classes.' } },
  { id: 'class-forge', feature: 'Classes & Teachers', name: 'Class Membership Forgery — Join Without Invite', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /classes/:id/join', exploit: 'Add a child to a teacher\'s class with a direct POST; the invite code and teacher approval are never checked.',
    hints: ['Classes have invite codes — but the join endpoint may not ask for one.', 'A parent should not be able to enrol into a closed class unilaterally.', 'POST /classes/2/join {childId:301} — Noor joins Rainbow 2 without any invite.'],
    lesson: 'Membership changes are privileged state transitions and need the same checks as the UI flow implies.',
    impact: 'Attackers place any child into any class, exposing the child to an unknown adult\'s class space.',
    report: { title: 'Class Enrolment Without Invite Code or Teacher Approval', severity: 'High', remediation: 'Require a valid invite code and teacher confirmation for class membership changes.' } },
  { id: 'class-roster', feature: 'Classes & Teachers', name: 'Class Roster PII Exposure via API', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'GET /api/classes/:id/roster', exploit: 'Fetch a class roster as an unrelated parent; it lists every child plus their parent\'s email.',
    hints: ['The teacher app loads rosters from an API endpoint.', 'Check what the roster includes beyond names — and who can call it.', 'GET /api/classes/1/roster as Sara (unrelated) returns all children and parent emails.'],
    lesson: 'API responses must be authorised per object and minimised to the fields the caller needs.',
    impact: 'Bulk harvesting of children\'s names paired with parent contact emails — prime phishing/safeguarding risk.',
    report: { title: 'Class Roster with Parent Emails Exposed to Any Authenticated User', severity: 'High', remediation: 'Restrict roster access to the class teacher/admin and minimise returned fields.' } },

  /* ---------------- Subscriptions & Billing ---------------- */
  { id: 'sub-tamper', feature: 'Subscriptions & Billing', name: 'Subscription Price Tampering', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'POST /subscribe', exploit: 'Subscribe to Premium sending price=0 from the client; the server charges what the client claims.',
    hints: ['The subscribe form posts a price field along with the plan.', 'Prices quoted by the browser are suggestions, not truth.', 'POST /subscribe {plan:premium, price:0} — Premium activates and the recorded charge is $0.'],
    lesson: 'Prices must be looked up server-side from the plan catalogue at charge time.',
    impact: 'Every family gets Premium for free by editing one field — the subscription model is void.',
    report: { title: 'Client-Supplied Price Trusted for Subscription Charges', severity: 'High', remediation: 'Determine prices server-side from the plan id only; ignore client-sent amounts.' } },
  { id: 'sub-invoice', feature: 'Subscriptions & Billing', name: 'Billing Invoice IDOR', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'GET /invoices/:id', exploit: 'Open another family\'s billing invoice by changing the invoice id.',
    hints: ['Invoices have small sequential ids.', 'Billing pages repeat the same missing ownership check as profiles.', 'As Priya, open /invoices/1 — it is Marco\'s paid Premium invoice.'],
    lesson: 'Financial documents need the strictest ownership checks; sequential ids invite enumeration.',
    impact: 'Payment history and plan details of every family leak to any signed-in user.',
    report: { title: 'Insecure Direct Object Reference on Billing Invoices', severity: 'Medium', remediation: 'Check invoice ownership on every read and use non-sequential identifiers.' } },

  /* ---------------- Search ---------------- */
  { id: 'search-sqli', feature: 'Search', name: 'SQL Injection in Search Dumps All Children', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    where: 'GET /search?q=', exploit: 'Search with an injection payload; the string-built query returns children from every family, not just yours.',
    hints: ['Search normally only shows your own children — the filter is part of the query string.', 'A tautology in q changes what the query matches.', 'Search for \' OR \'1\'=\'1 and every child on the platform appears.'],
    lesson: 'Search filters built by concatenation inherit every injection flaw of the login form.',
    impact: 'One query enumerates the platform\'s entire child directory — names, ages, levels.',
    report: { title: 'SQL Injection in Search Returns All Records', severity: 'High', remediation: 'Parameterise search queries and enforce family scoping in the data layer.' } },
  { id: 'search-xss', feature: 'Search', name: 'Reflected XSS in Search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    where: 'GET /search?q=', exploit: 'The search term is echoed into the results page unescaped; a script payload in q is reflected raw.',
    hints: ['The results page repeats your search term back to you.', 'It repeats it without escaping.', 'Search for <script>alert(1)</script> — the payload lands in the page as-is.'],
    lesson: 'Reflected input must be encoded for the context it lands in, every time.',
    impact: 'A crafted search link runs script in a victim parent\'s or admin\'s browser.',
    report: { title: 'Reflected Cross-Site Scripting in Search Results', severity: 'Medium', remediation: 'HTML-encode reflected user input in all templates.' } },

  /* ---------------- Admin Panel ---------------- */
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'CSRF on Admin User Deactivation', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /admin/users/:id/deactivate', exploit: 'Trigger the admin deactivation action with a cross-site Origin and no token; the account is deactivated.',
    hints: ['Admin actions are plain POSTs with no anti-CSRF token.', 'Reaching the action as an admin is easy (remember the role cookie) — the missing piece is origin checking.', 'As admin, POST /admin/users/4/deactivate with Origin: https://evil.example — Sara is deactivated.'],
    lesson: 'Privileged actions without CSRF tokens turn any website into a remote control for a logged-in admin.',
    impact: 'An attacker can deactivate arbitrary accounts — including staff — via a booby-trapped page an admin visits.',
    report: { title: 'Missing CSRF Protection on Administrative User Deactivation', severity: 'High', remediation: 'Require CSRF tokens and Origin verification on all admin state-changing actions.' } },

  /* ---------------- Platform & API ---------------- */
  { id: 'api-token', feature: 'Platform & API', name: 'Predictable API Token (Base64 of Email)', owasp: 'A07:2021 Authentication Failures', difficulty: 'Intermediate',
    where: 'GET /api/me with X-Api-Token', exploit: 'API tokens are just hk_ + base64(email); forge any user\'s token from their public email address.',
    hints: ['Find your own API token in the API docs section and study its shape.', 'Decode it — what does it actually contain?', 'Token = hk_ + base64(email). Forge Marco\'s and call GET /api/me.'],
    lesson: 'Tokens must be unguessable random secrets; encoding is not encryption and identity is not a credential.',
    impact: 'Anyone who knows a parent\'s email owns their API identity — full account data access.',
    report: { title: 'API Tokens Are Predictable (Base64-Encoded Email)', severity: 'High', remediation: 'Issue high-entropy random API tokens, store hashes, and support revocation.' } },
  { id: 'api-debug', feature: 'Platform & API', name: 'Unauthenticated Debug Endpoint Dumps All Users', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'GET /api/debug', exploit: 'Fetch the leftover debug endpoint with no login at all; it returns every user including plaintext passwords.',
    hints: ['Development endpoints often survive into production.', 'Try the obvious: /api/debug.', 'No session needed — the full user table with passwords comes back as JSON.'],
    lesson: 'Debug/diagnostic endpoints are production attack surface and must be removed or locked down.',
    impact: 'Complete credential dump of every parent, teacher and the admin — total platform compromise in one request.',
    report: { title: 'Unauthenticated Debug Endpoint Exposes All User Credentials', severity: 'Critical', remediation: 'Remove debug endpoints from production or gate them behind admin auth and network restrictions.' } },
];
// === TESTS REGISTRY END ===
const TEST_BY_ID = Object.fromEntries(TESTS.map((t) => [t.id, t]));
const FEATURES = [...new Set(TESTS.map((t) => t.feature))];

/* ======================= PROGRESS ENGINE ======================= */
let progress = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const p = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      if (p && typeof p === 'object') progress = Object.assign(progress, p);
    }
  } catch (e) { /* corrupt state file -> start fresh rather than crash */ }
}
function saveProgress() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2)); } catch (e) { /* non-fatal */ }
}
loadProgress();

function doneCount() { return TESTS.filter((t) => progress.tests[t.id]).length; }
function isComplete() { return doneCount() === TESTS.length; }
function pass(testId) {
  if (!TEST_BY_ID[testId] || progress.tests[testId]) return;
  progress.tests[testId] = true;
  if (isComplete() && !progress.completedAt) {
    progress.completedAt = new Date().toISOString();
    progress.keyRevealed = true;
  }
  saveProgress();
}
function bump(feature) {
  progress.attempts[feature] = (progress.attempts[feature] || 0) + 1;
  saveProgress();
}
function featureStats() {
  const out = {};
  for (const f of FEATURES) {
    const ts = TESTS.filter((t) => t.feature === f);
    out[f] = { total: ts.length, done: ts.filter((t) => progress.tests[t.id]).length, attempts: progress.attempts[f] || 0 };
  }
  return out;
}
function progressJSON() {
  const done = doneCount();
  return {
    lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done,
    pct: Math.floor((done / TESTS.length) * 100),
    features: featureStats(), complete: isComplete(),
  };
}

/* ========================== HTTP HELPERS ========================== */
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = (req.headers['content-type'] || '').toLowerCase();
      if (ct.includes('application/json')) {
        try { resolve({ fields: JSON.parse(data || '{}'), raw: data }); return; } catch (e) { resolve({ fields: {}, raw: data, badJson: true }); return; }
      }
      const fields = {};
      for (const pair of data.split('&')) {
        if (!pair) continue;
        const i = pair.indexOf('=');
        const k = decodeURIComponent(pair.slice(0, i).replace(/\+/g, ' '));
        const v = i >= 0 ? decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' ')) : '';
        fields[k] = v;
      }
      resolve({ fields, raw: data });
    });
    req.on('error', () => resolve({ fields: {}, raw: '' }));
  });
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }
function currentUser(req) {
  const c = parseCookies(req);
  const uid = sessions.get(c.hx_session);
  return users.find((u) => u.id === uid) || null;
}
function effectiveRole(req, user) {
  // VULNERABLE BY DESIGN: the role is read from a client-supplied cookie.
  const c = parseCookies(req);
  return c.hx_role || (user ? user.role : null);
}
function isCrossSite(req) {
  const host = req.headers.host || '';
  for (const h of ['origin', 'referer']) {
    const v = req.headers[h];
    if (v) { try { return new URL(v).host !== host; } catch (e) { return true; } }
  }
  return false;
}
const XSS_RE = /(<\s*script|<\s*svg|<\s*img[^>]*onerror|onerror\s*=|onload\s*=|<\s*iframe|javascript\s*:)/i;
const SQLI_RE = /(\'\s*or\s*\'?\d+\'?\s*=\s*\'?\d+|\'\s*or\s*1\s*=\s*1|union\s+select|--\s|'\s*--)/i;

/* ============================ PAGE SHELL ============================ */
function headerBar() {
  const done = doneCount();
  const pct = Math.floor((done / TESTS.length) * 100);
  return `<div style="background:#14141d;color:#fff;padding:12px 20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
    <img src="/logo.png" style="height:38px" alt="HexaCyberLab">
    <strong>LAB ${LAB_NUMBER} — ${LAB_NAME}</strong>
    <span>${done}/${TESTS.length} tests · ${pct}%</span>
    <span style="flex:1;min-width:120px;background:#333;border-radius:6px;height:12px;overflow:hidden"><span style="display:block;height:100%;width:${pct}%;background:#7c5cff"></span></span>
    <a style="color:#ffd166" href="/tests">Mission Board</a>
    <a style="color:#ffd166" href="/">Dashboard</a>
  </div>`;
}
function chatWidget() {
  return `<div id="coach" style="position:fixed;right:16px;bottom:16px;width:320px;max-width:92vw;background:#fff;border:1px solid #ccd;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.25);font-family:Arial,sans-serif;z-index:50">
    <div style="background:#14141d;color:#fff;padding:10px 14px;border-radius:12px 12px 0 0"><strong>Lab Coach</strong> <span style="font-size:12px;opacity:.8">— HexaKids guide</span></div>
    <div id="coachLog" style="height:190px;overflow-y:auto;padding:10px;font-size:13px"></div>
    <form id="coachForm" style="display:flex;border-top:1px solid #eee">
      <input id="coachInput" autocomplete="off" placeholder="Ask the coach…" style="flex:1;border:0;padding:10px;font-size:13px">
      <button style="background:#7c5cff;color:#fff;border:0;padding:10px 14px;cursor:pointer">Send</button>
    </form>
  </div>
  <script>
  (function(){
    var log=document.getElementById('coachLog'),form=document.getElementById('coachForm'),input=document.getElementById('coachInput');
    function add(who,text){var d=document.createElement('div');d.style.margin='6px 0';d.innerHTML='<strong>'+who+':</strong> ';d.appendChild(document.createTextNode(text));log.appendChild(d);log.scrollTop=log.scrollHeight;}
    add('Coach','Hi! I am the Lab Coach for LAB ${LAB_NUMBER}. Ask me what this lab contains, how to approach a feature, or who built all this.');
    form.addEventListener('submit',function(e){e.preventDefault();var m=input.value.trim();if(!m)return;input.value='';add('You',m);
      fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})})
      .then(function(r){return r.json();}).then(function(j){add('Coach',j.reply||'No reply.');})
      .catch(function(){add('Coach','Connection hiccup — try again.');});});
  })();
  </script>`;
}
function page(title, inner) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ${LAB_NUMBER} — ${LAB_NAME} · ${title}</title></head>
  <body style="margin:0;background:#f4f4fa;font-family:Arial,sans-serif;color:#222">
  ${headerBar()}
  <div style="max-width:880px;margin:24px auto;padding:0 16px">${inner}</div>
  ${chatWidget()}
  </body></html>`;
}
function setMarker(res) {
  // Benign same-site marker cookie set by the app's own pages.
  res.setHeader('Set-Cookie', ['hx_origin=1; Path=/; SameSite=Lax']);
}

/* ============================ CHATBOT ============================ */
function coachReply(message) {
  const msg = String(message || '').toLowerCase();
  const stats = featureStats();
  const done = doneCount();
  const pct = Math.floor((done / TESTS.length) * 100);

  if (/(who (built|made|created)|founder|md\.? ?jony|hassain|hexacyberlab)/.test(msg)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (/(completion key|the key|next lab|unlock key|give me the key|lab key)/.test(msg)) {
    if (isComplete() && progress.keyRevealed) {
      return 'You completed LAB ' + LAB_NUMBER + ' at 100% — well earned. The completion key for the next lab is: ' + assembleCompletionKey();
    }
    return 'I do not have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at ' + pct + '% (' + done + '/' + TESTS.length + ' tests). Finish every test on the Mission Board (/tests) and the key will be revealed on /complete — and I will be able to share it too.';
  }
  if (/(progress|how am i doing|status|score)/.test(msg)) {
    const next = TESTS.find((t) => !progress.tests[t.id]);
    return 'You are at ' + pct + '% — ' + done + ' of ' + TESTS.length + ' tests complete across ' + FEATURES.length + ' features.' +
      (next ? ' Next open test: "' + next.name + '" (' + next.feature + ').' : ' Everything is complete!');
  }
  // How-to requests come FIRST when the intent is explicit (solve / how do I /
  // guide / step by step / help me / exploit / bypass) — a question like
  // "how do I solve the Search tests" must hit the 3-try lock, not the counts.
  const howToIntent = /(solve|how (do|can|to)|guide|step[- ]by[- ]step|help me|exploit|bypass|walk me)/.test(msg);
  if (howToIntent) {
    let target = null;
    for (const f of FEATURES) {
      const words = f.toLowerCase().replace(/[^a-z ]/g, '').split(' ').filter((w) => w.length > 3);
      if (words.some((w) => msg.includes(w))) { target = f; break; }
    }
    if (!target) {
      const next = TESTS.find((t) => !progress.tests[t.id]);
      target = next ? next.feature : FEATURES[0];
    }
    const open = TESTS.filter((t) => t.feature === target && !progress.tests[t.id]);
    const attempts = progress.attempts[target] || 0;
    if (open.length === 0) {
      return 'You have already passed every test in ' + target + '. Pick another feature from /tests and I will guide you once you have tried it.';
    }
    if (attempts >= 3) {
      return 'Step by step for ' + target + ' — start with "' + open[0].name + '": ' + open[0].hints[2] +
        (open[1] ? ' After that, look at "' + open[1].name + '": ' + open[1].hints[1] : '');
    }
    return 'That feature is locked for help. First try the ' + target + ' tests yourself at least 3 times — I can see you\'ve tried ' + attempts + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  // Feature counts / names (the map is public, the HOW is locked)
  for (const f of FEATURES) {
    const key = f.toLowerCase().split(' ')[0];
    if (msg.includes(key) && /(how many|which|list|tests|vulnerabilit|contain|what)/.test(msg)) {
      const ts = TESTS.filter((t) => t.feature === f);
      return f + ' has ' + ts.length + ' tests: ' + ts.map((t) => t.name).join('; ') + '. Attempts on this feature so far: ' + (progress.attempts[f] || 0) + '.';
    }
  }
  if (/(how many|total|features|tests|contain|overview|start|begin|what (is|does) this lab)/.test(msg)) {
    return 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' is a children\'s learning platform (parents, teachers, child profiles, classes, stars, premium activities, subscriptions). It has ' + FEATURES.length + ' features and ' + TESTS.length + ' scored tests: ' +
      FEATURES.map((f) => f + ' (' + stats[f].total + ')').join(', ') + '. Open /tests for the Mission Board. Help rule: I guide you step by step on a feature only after you have genuinely tried it at least 3 times (or passed its tests).';
  }
  return 'I can tell you what this lab contains (features and test names), report your progress and attempt counts, and — once you have tried a feature at least 3 times — guide you step by step. Try asking: "how many tests are in Login & Authentication", "what is my progress", or "how do I solve the Children & Reports tests". The full map is on /tests.';
}

/* ============================== ROUTES ============================== */
function gatePage() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ${LAB_NUMBER} — ${LAB_NAME} · Locked</title></head>
  <body style="margin:0;background:#14141d;font-family:Arial,sans-serif">
  <div style="max-width:520px;margin:60px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:28px;text-align:center">
    <img src="/logo.png" style="height:56px">
    <h2>LAB ${LAB_NUMBER} — ${LAB_NAME}</h2>
    <p>This lab is locked. Paste the completion key from Lab ${PREV_LAB} to start.</p>
    <form method="POST" action="/unlock"><input name="key" style="padding:9px;width:80%" placeholder="Completion key from Lab ${PREV_LAB}"><br><br>
    <button style="padding:10px 22px">Unlock LAB ${LAB_NUMBER}</button></form>
  </div>
  ${chatWidget()}
  </body></html>`;
}
function childOf(id) { return children.find((c) => c.id === Number(id)); }
function classOf(id) { return classes.find((c) => c.id === Number(id)); }
function teacherClasses(uid) { return classes.filter((c) => c.teacherId === uid); }

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    const pathname = u.pathname;
    const method = req.method;

    /* ---- always available ---- */
    if (pathname === '/logo.png') {
      try { const buf = fs.readFileSync(LOGO_FILE); res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(buf); }
      catch (e) { send(res, 404, 'not found', 'text/plain'); }
      return;
    }
    if (pathname === '/api/progress' && method === 'GET') {
      send(res, 200, JSON.stringify(progressJSON(), null, 2), 'application/json');
      return;
    }
    if (pathname === '/api/chat' && method === 'POST') {
      const { fields, badJson } = await readBody(req);
      const reply = badJson ? 'I could not read that message — please send plain text.' : coachReply(fields.message || '');
      send(res, 200, JSON.stringify({ reply }), 'application/json');
      return;
    }
    if (pathname === '/unlock' && method === 'POST') {
      const { fields } = await readBody(req);
      const entered = String(fields.key || '');
      const expected = assembleEntryKey();
      // constant-shape comparison: exact match only, no hints about position
      let ok = entered.length === expected.length;
      if (ok) { let diff = 0; for (let i = 0; i < expected.length; i++) diff |= entered.charCodeAt(i) ^ expected.charCodeAt(i); ok = diff === 0; }
      if (ok) { progress.unlocked = true; saveProgress(); redirect(res, '/'); }
      else send(res, 403, 'Invalid key.', 'text/plain');
      return;
    }

    /* ---- the gate ---- */
    if (!progress.unlocked) { send(res, 200, gatePage()); return; }

    /* ---- platform exposure (no auth by design) ---- */
    if (pathname === '/api/debug' && method === 'GET') {
      pass('api-debug');
      send(res, 200, JSON.stringify({ users, children, classes, invoices }, null, 2), 'application/json');
      return;
    }

    /* ================= AUTH ================= */
    if (pathname === '/login' && method === 'GET') {
      setMarker(res);
      send(res, 200, page('Login', `<h2>Log in to HexaKids</h2>
        <form method="POST" action="/login" style="background:#fff;padding:18px;border-radius:10px;max-width:420px">
          <label>Email<br><input name="email" style="width:95%;padding:8px"></label><br><br>
          <label>Password<br><input name="password" type="password" style="width:95%;padding:8px"></label><br><br>
          <button style="padding:9px 20px">Log in</button>
        </form>
        <p><a href="/forgot">Forgot password?</a> · <a href="/register">Create a parent account</a></p>`));
      return;
    }
    if (pathname === '/login' && method === 'POST') {
      const { fields } = await readBody(req);
      bump('Login & Authentication');
      const email = String(fields.email || '');
      const password = String(fields.password || '');
      // LEGACY string-built query path — deliberately injectable.
      if (SQLI_RE.test(email) || SQLI_RE.test(password)) {
        const admin = users[0];
        const sid = crypto.randomBytes(12).toString('hex');
        sessions.set(sid, admin.id);
        res.writeHead(302, { 'Set-Cookie': [`hx_session=${sid}; Path=/`, `hx_role=${admin.role}; Path=/`], Location: '/' });
        res.end();
        pass('auth-sqli');
        return;
      }
      const user = users.find((x) => x.email === email);
      if (!user || !user.active || user.password !== password) {
        const n = (failedLogins.get(email) || 0) + 1;
        failedLogins.set(email, n);
        if (n >= 10) pass('auth-brute'); // the 10th failure is still processed: no throttle exists
        send(res, 401, page('Login failed', '<h2>Login failed</h2><p>Invalid email or password.</p><p><a href="/login">Try again</a></p>'));
        return;
      }
      failedLogins.delete(email);
      const sid = crypto.randomBytes(12).toString('hex');
      sessions.set(sid, user.id);
      res.writeHead(302, { 'Set-Cookie': [`hx_session=${sid}; Path=/`, `hx_role=${user.role}; Path=/`], Location: '/' });
      res.end();
      if (user.email === 'demo@hexakids.local') pass('auth-default');
      return;
    }
    if (pathname === '/logout') {
      const c = parseCookies(req);
      sessions.delete(c.hx_session);
      res.writeHead(302, { 'Set-Cookie': ['hx_session=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0'], Location: '/login' });
      res.end();
      return;
    }
    if (pathname === '/forgot' && method === 'GET') {
      setMarker(res);
      send(res, 200, page('Forgot password', `<h2>Reset your password</h2>
        <form method="POST" action="/forgot" style="background:#fff;padding:18px;border-radius:10px;max-width:420px">
          <label>Email<br><input name="email" style="width:95%;padding:8px"></label><br><br>
          <button style="padding:9px 20px">Send reset token</button>
        </form>`));
      return;
    }
    if (pathname === '/forgot' && method === 'POST') {
      const { fields } = await readBody(req);
      bump('Login & Authentication');
      const user = users.find((x) => x.email === String(fields.email || ''));
      if (user) {
        forgotProbes.existing.add(user.email);
        issuedResetTokens.add(user.id);
        if (forgotProbes.existing.size >= 1 && forgotProbes.missing.size >= 1) pass('auth-enum');
        // simulated mail: the token is shown in-app in this local lab
        send(res, 200, page('Token sent', `<h2>Check your inbox</h2><p>Account found. Your reset token is:</p>
          <p style="font-size:20px"><strong>${resetTokenFor(user)}</strong></p>
          <form method="POST" action="/reset" style="background:#fff;padding:18px;border-radius:10px;max-width:420px">
            <input type="hidden" name="email" value="${user.email}">
            <label>Token<br><input name="token" style="width:95%;padding:8px"></label><br><br>
            <label>New password<br><input name="newPassword" type="password" style="width:95%;padding:8px"></label><br><br>
            <button style="padding:9px 20px">Reset password</button>
          </form>`));
      } else {
        forgotProbes.missing.add(String(fields.email || ''));
        if (forgotProbes.existing.size >= 1 && forgotProbes.missing.size >= 1) pass('auth-enum');
        send(res, 200, page('No account', '<h2>No account found</h2><p>There is no HexaKids account for that email address.</p><p><a href="/forgot">Try again</a></p>'));
      }
      return;
    }
    if (pathname === '/reset' && method === 'POST') {
      const { fields } = await readBody(req);
      bump('Login & Authentication');
      const user = users.find((x) => x.email === String(fields.email || ''));
      if (user && String(fields.token || '') === resetTokenFor(user) && fields.newPassword) {
        const forged = !issuedResetTokens.has(user.id);
        user.password = String(fields.newPassword);
        if (forged) pass('auth-reset');
        redirect(res, '/login');
      } else {
        send(res, 400, page('Reset failed', '<h2>Reset failed</h2><p>That token is not valid.</p>'));
      }
      return;
    }
    if (pathname === '/register' && method === 'GET') {
      setMarker(res);
      send(res, 200, page('Register', `<h2>Create a parent account</h2>
        <form method="POST" action="/register" style="background:#fff;padding:18px;border-radius:10px;max-width:420px">
          <label>Name<br><input name="name" style="width:95%;padding:8px"></label><br><br>
          <label>Email<br><input name="email" style="width:95%;padding:8px"></label><br><br>
          <label>Password<br><input name="password" type="password" style="width:95%;padding:8px"></label><br><br>
          <button style="padding:9px 20px">Register</button>
        </form>`));
      return;
    }
    if (pathname === '/register' && method === 'POST') {
      const { fields } = await readBody(req);
      bump('Registration & Profile');
      // VULNERABLE BY DESIGN: the whole body is bound onto the new account.
      const nu = { id: nextUserId++, email: '', password: '', name: '', role: 'parent', plan: 'free', active: true };
      for (const k of Object.keys(fields)) { if (k !== 'id') nu[k] = fields[k]; }
      nu.id = nextUserId - 1;
      if (!nu.email || !nu.password) { send(res, 400, page('Register', '<p>Email and password are required.</p>')); return; }
      users.push(nu);
      if (String(nu.password).length < 4) pass('reg-weakpass');
      if (nu.role !== 'parent' || nu.plan !== 'free') pass('reg-massassign');
      if (XSS_RE.test(String(nu.name || ''))) pass('reg-xss');
      redirect(res, '/login');
      return;
    }

    /* ---- everything below needs a session (or a forged API token) ---- */
    const me = currentUser(req);
    if (pathname === '/api/me' && method === 'GET') {
      bump('Platform & API');
      const tok = req.headers['x-api-token'] || '';
      const byToken = users.find((x) => apiTokenFor(x) === tok);
      if (byToken) { if (!me) pass('api-token'); send(res, 200, JSON.stringify({ id: byToken.id, email: byToken.email, name: byToken.name, role: byToken.role, plan: byToken.plan }), 'application/json'); return; }
      if (me) { send(res, 200, JSON.stringify({ id: me.id, email: me.email, name: me.name, role: me.role, plan: me.plan }), 'application/json'); return; }
      send(res, 401, JSON.stringify({ error: 'unauthorised' }), 'application/json');
      return;
    }
    if (!me) { redirect(res, '/login'); return; }
    const role = effectiveRole(req, me);

    /* ================= DASHBOARD ================= */
    if (pathname === '/' && method === 'GET') {
      setMarker(res);
      let inner = `<h2>Welcome, ${me.name}</h2><p>Role: ${me.role} · Plan: ${me.plan}</p>`;
      if (me.role === 'parent') {
        const mine = children.filter((c) => c.parentId === me.id);
        inner += '<h3>Your children</h3>' + (mine.map((c) =>
          `<div style="background:#fff;padding:12px;border-radius:10px;margin:8px 0"><strong>${c.name}</strong> · age ${c.age} · ${c.stars} stars · ${c.level}
           — <a href="/children/${c.id}">Profile</a> · <a href="/children/${c.id}/report">Progress report</a></div>`).join('') || '<p>No children yet.</p>');
      }
      if (me.role === 'teacher') {
        inner += '<h3>Your classes</h3>' + teacherClasses(me.id).map((cl) =>
          `<div style="background:#fff;padding:12px;border-radius:10px;margin:8px 0"><strong>${cl.name}</strong> — ${cl.members.length} children
           ${cl.members.map((id) => { const c = childOf(id); return c ? `· <a href="/children/${c.id}">${c.name}</a>` : ''; }).join(' ')}</div>`).join('');
      }
      inner += `<h3>Activities</h3>` + activities.map((a) =>
        `<div style="background:#fff;padding:12px;border-radius:10px;margin:8px 0"><strong>${a.title}</strong> ${a.premium ? '· <em>Premium</em>' : '· Free'}
         <form method="POST" action="/activities/${a.id}/complete" style="display:inline"><button>Mark complete</button></form></div>`).join('');
      inner += `<h3>Rewards</h3>` + rewards.map((r) =>
        `<div style="background:#fff;padding:12px;border-radius:10px;margin:8px 0"><strong>${r.title}</strong> · ${r.cost} stars
         <form method="POST" action="/rewards/${r.id}/redeem" style="display:inline"><input name="childId" size="5" placeholder="child id"><button>Redeem</button></form></div>`).join('');
      inner += `<h3>Search</h3><form method="GET" action="/search"><input name="q" style="padding:8px;width:60%"><button>Search children &amp; activities</button></form>
        <p><a href="/profile">My profile</a> · <a href="/subscribe">Subscription</a> · <a href="/tests">Mission Board</a> · <a href="/logout">Log out</a></p>`;
      send(res, 200, page('Dashboard', inner));
      return;
    }

    /* ================= PROFILE ================= */
    if (pathname === '/profile' && method === 'GET') {
      setMarker(res);
      send(res, 200, page('Profile', `<h2>My profile</h2>
        <form method="POST" action="/profile" style="background:#fff;padding:18px;border-radius:10px;max-width:420px">
          <label>Display name<br><input name="name" value="${me.name}" style="width:95%;padding:8px"></label><br><br>
          <button style="padding:9px 20px">Save</button>
        </form>
        <p>API token (for the mobile app): <code>${apiTokenFor(me)}</code></p>`));
      return;
    }
    if (pathname === '/profile' && method === 'POST') {
      const { fields } = await readBody(req);
      bump('Registration & Profile');
      if (fields.name) me.name = String(fields.name);
      if (XSS_RE.test(String(fields.name || ''))) pass('reg-xss');
      if (isCrossSite(req)) pass('reg-csrf'); // no token checked; change applied anyway
      redirect(res, '/');
      return;
    }

    /* ================= CHILDREN ================= */
    const childMatch = pathname.match(/^\/children\/(\d+)$/);
    const reportMatch = pathname.match(/^\/children\/(\d+)\/report$/);
    if ((childMatch || reportMatch) && method === 'GET') {
      const child = childOf((childMatch || reportMatch)[1]);
      if (!child) { send(res, 404, 'not found', 'text/plain'); return; }
      const isOwner = child.parentId === me.id;
      if (me.role === 'teacher') {
        bump('Classes & Teachers');
        const inMine = teacherClasses(me.id).some((cl) => cl.members.includes(child.id));
        if (!inMine && role !== 'admin') pass('class-scope');
      } else if (me.role === 'parent') {
        bump('Children & Reports');
        if (!isOwner) pass(reportMatch ? 'child-report' : 'child-idor');
      }
      setMarker(res);
      if (reportMatch) {
        send(res, 200, page('Progress report', `<h2>Progress report — ${child.name}</h2>
          <div style="background:#fff;padding:18px;border-radius:10px">
          <p>Age: ${child.age} · Level: ${child.level}</p>
          <p>Stars earned: <strong>${child.stars}</strong></p>
          <p>Activities completed this term: steady progress in counting, words and curiosity tasks.</p>
          <p>Parent account: ${(users.find((x) => x.id === child.parentId) || {}).email || ''}</p></div>`));
      } else {
        send(res, 200, page('Child profile', `<h2>${child.name}</h2>
          <div style="background:#fff;padding:18px;border-radius:10px">
          <p>Age: ${child.age} · Level: ${child.level} · Stars: <strong>${child.stars}</strong></p>
          <p><a href="/children/${child.id}/report">Progress report</a></p></div>`));
      }
      return;
    }
    if (pathname === '/api/award' && method === 'POST') {
      const { fields } = await readBody(req);
      bump('Children & Reports');
      const child = childOf(fields.childId);
      const amount = Number(fields.stars || 0);
      if (!child) { send(res, 404, JSON.stringify({ error: 'no such child' }), 'application/json'); return; }
      const legitTeacher = me.role === 'teacher' && teacherClasses(me.id).some((cl) => cl.members.includes(child.id));
      child.stars += amount; // no role, ownership or cap check — the flaw
      if (amount > 10 || !legitTeacher) pass('child-stars');
      send(res, 200, JSON.stringify({ childId: child.id, stars: child.stars }), 'application/json');
      return;
    }

    /* ================= ACTIVITIES & REWARDS ================= */
    const actMatch = pathname.match(/^\/activities\/(\d+)\/complete$/);
    if (actMatch && method === 'POST') {
      await readBody(req);
      bump('Activities & Rewards');
      const act = activities.find((a) => a.id === Number(actMatch[1]));
      if (!act) { send(res, 404, 'not found', 'text/plain'); return; }
      completions.add(me.id + ':' + act.id); // no plan check — the flaw
      if (act.premium && me.plan !== 'premium') pass('act-premium');
      redirect(res, '/');
      return;
    }
    const ansMatch = pathname.match(/^\/api\/activities\/(\d+)\/answers$/);
    if (ansMatch && method === 'GET') {
      bump('Activities & Rewards');
      const act = activities.find((a) => a.id === Number(ansMatch[1]));
      if (!act) { send(res, 404, JSON.stringify({ error: 'no such activity' }), 'application/json'); return; }
      if (role !== 'admin') pass('act-answers');
      send(res, 200, JSON.stringify({ activityId: act.id, answers: act.answers }), 'application/json');
      return;
    }
    const rewMatch = pathname.match(/^\/rewards\/(\d+)\/redeem$/);
    if (rewMatch && method === 'POST') {
      const { fields } = await readBody(req);
      bump('Activities & Rewards');
      const reward = rewards.find((r) => r.id === Number(rewMatch[1]));
      const child = childOf(fields.childId);
      if (!reward || !child) { send(res, 404, 'not found', 'text/plain'); return; }
      const insufficient = child.stars < reward.cost;
      child.stars -= reward.cost; // balance never checked — the flaw
      redemptions.push({ rewardId: reward.id, childId: child.id, byUserId: me.id });
      if (insufficient) pass('act-reward');
      redirect(res, '/');
      return;
    }

    /* ================= CLASSES ================= */
    const joinMatch = pathname.match(/^\/classes\/(\d+)\/join$/);
    if (joinMatch && method === 'POST') {
      const { fields } = await readBody(req);
      bump('Classes & Teachers');
      const cl = classOf(joinMatch[1]);
      const child = childOf(fields.childId);
      if (!cl || !child) { send(res, 404, 'not found', 'text/plain'); return; }
      if (!cl.members.includes(child.id)) cl.members.push(child.id); // no invite/approval check — the flaw
      if (cl.teacherId !== me.id) pass('class-forge');
      redirect(res, '/');
      return;
    }
    const rosterMatch = pathname.match(/^\/api\/classes\/(\d+)\/roster$/);
    if (rosterMatch && method === 'GET') {
      bump('Classes & Teachers');
      const cl = classOf(rosterMatch[1]);
      if (!cl) { send(res, 404, JSON.stringify({ error: 'no such class' }), 'application/json'); return; }
      if (cl.teacherId !== me.id && role !== 'admin') pass('class-roster');
      const roster = cl.members.map((id) => {
        const c = childOf(id);
        const p = users.find((x) => x.id === (c ? c.parentId : 0)) || {};
        return c ? { childId: c.id, name: c.name, age: c.age, stars: c.stars, parentEmail: p.email || '' } : null;
      }).filter(Boolean);
      send(res, 200, JSON.stringify({ classId: cl.id, name: cl.name, roster }), 'application/json');
      return;
    }

    /* ================= SUBSCRIPTIONS ================= */
    if (pathname === '/subscribe' && method === 'GET') {
      setMarker(res);
      send(res, 200, page('Subscription', `<h2>Your plan: ${me.plan}</h2>
        <form method="POST" action="/subscribe" style="background:#fff;padding:18px;border-radius:10px;max-width:420px">
          <input type="hidden" name="plan" value="premium">
          <label>Price (USD)<br><input name="price" value="${PLANS.premium}" style="width:95%;padding:8px"></label><br><br>
          <button style="padding:9px 20px">Upgrade to Premium</button>
        </form>
        <h3>Your invoices</h3>` + invoices.filter((i) => i.userId === me.id).map((i) =>
          `<div style="background:#fff;padding:10px;border-radius:10px;margin:6px 0"><a href="/invoices/${i.id}">${i.label}</a> — $${i.amount} (${i.status})</div>`).join('')));
      return;
    }
    if (pathname === '/subscribe' && method === 'POST') {
      const { fields } = await readBody(req);
      bump('Subscriptions & Billing');
      const plan = String(fields.plan || 'free');
      const charged = Number(fields.price); // client-supplied price trusted — the flaw
      if (plan === 'premium') {
        me.plan = 'premium';
        invoices.push({ id: invoices.length + 1, userId: me.id, label: 'Premium Family Plan - upgrade', amount: isNaN(charged) ? 0 : charged, status: 'paid' });
        if (charged !== PLANS.premium) pass('sub-tamper');
      }
      redirect(res, '/subscribe');
      return;
    }
    const invMatch = pathname.match(/^\/invoices\/(\d+)$/);
    if (invMatch && method === 'GET') {
      bump('Subscriptions & Billing');
      const inv = invoices.find((i) => i.id === Number(invMatch[1]));
      if (!inv) { send(res, 404, 'not found', 'text/plain'); return; }
      if (inv.userId !== me.id && role !== 'admin') pass('sub-invoice');
      setMarker(res);
      send(res, 200, page('Invoice', `<h2>Invoice #${inv.id}</h2>
        <div style="background:#fff;padding:18px;border-radius:10px">
        <p>${inv.label}</p><p>Amount: <strong>$${inv.amount}</strong> · Status: ${inv.status}</p>
        <p>Billed to: ${(users.find((x) => x.id === inv.userId) || {}).email || ''}</p></div>`));
      return;
    }

    /* ================= SEARCH ================= */
    if (pathname === '/search' && method === 'GET') {
      bump('Search');
      const q = u.searchParams.get('q') || '';
      let results;
      if (SQLI_RE.test(q)) {
        pass('search-sqli'); // the injected query drops the family filter
        results = children.slice();
      } else {
        const mine = me.role === 'parent' ? children.filter((c) => c.parentId === me.id) : children.slice();
        results = mine.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
      }
      if (XSS_RE.test(q)) pass('search-xss');
      setMarker(res);
      send(res, 200, page('Search', `<h2>Results for "${q}"</h2>` + // reflected unescaped — the flaw
        (results.map((c) => `<div style="background:#fff;padding:10px;border-radius:10px;margin:6px 0"><a href="/children/${c.id}">${c.name}</a> · age ${c.age} · ${c.stars} stars</div>`).join('') || '<p>No matches.</p>')));
      return;
    }

    /* ================= ADMIN ================= */
    if (pathname === '/admin' && method === 'GET') {
      bump('Admin Panel');
      if (role !== 'admin') { send(res, 403, page('Forbidden', '<h2>Admins only</h2>')); return; }
      if (me.role !== 'admin') pass('auth-cookie'); // reached on a borrowed cookie role
      setMarker(res);
      send(res, 200, page('Admin', `<h2>Admin console</h2>` + users.map((x) =>
        `<div style="background:#fff;padding:10px;border-radius:10px;margin:6px 0">${x.name} — ${x.email} · ${x.role} · ${x.active ? 'active' : 'DEACTIVATED'}
         <form method="POST" action="/admin/users/${x.id}/deactivate" style="display:inline"><button>Deactivate</button></form></div>`).join('')));
      return;
    }
    const deactMatch = pathname.match(/^\/admin\/users\/(\d+)\/deactivate$/);
    if (deactMatch && method === 'POST') {
      await readBody(req);
      bump('Admin Panel');
      if (role !== 'admin') { send(res, 403, 'forbidden', 'text/plain'); return; }
      const target = users.find((x) => x.id === Number(deactMatch[1]));
      if (target) target.active = false; // applied with no CSRF token — the flaw
      if (isCrossSite(req)) pass('admin-csrf');
      redirect(res, '/admin');
      return;
    }

    /* ================= MISSION BOARD ================= */
    if (pathname === '/tests' && method === 'GET') {
      setMarker(res);
      const stats = featureStats();
      let inner = `<h2>Mission Board — LAB ${LAB_NUMBER} ${LAB_NAME}</h2><p>${doneCount()}/${TESTS.length} tests complete · ${Math.floor((doneCount() / TESTS.length) * 100)}%</p>`;
      for (const f of FEATURES) {
        inner += `<h3>${f} <small>(attempts: ${stats[f].attempts})</small></h3>`;
        for (const t of TESTS.filter((x) => x.feature === f)) {
          const doneMark = progress.tests[t.id] ? '✓ done' : '○ open';
          inner += `<div style="background:#fff;padding:12px;border-radius:10px;margin:8px 0">
            <strong>${t.name}</strong> — ${doneMark}<br>
            <small>${t.owasp} · ${t.difficulty} · ${t.where}</small>
            <details><summary>Hints</summary><ol>${t.hints.map((h) => `<li>${h}</li>`).join('')}</ol></details>
          </div>`;
        }
      }
      send(res, 200, page('Mission Board', inner));
      return;
    }
    if (pathname === '/api/tester' && method === 'POST') {
      const { fields } = await readBody(req);
      if (fields.name) { progress.testerName = String(fields.name).slice(0, 60); saveProgress(); }
      redirect(res, '/complete');
      return;
    }

    /* ================= COMPLETE & CERTIFICATE ================= */
    if (pathname === '/complete' && method === 'GET') {
      setMarker(res);
      if (!isComplete()) {
        const left = TESTS.filter((t) => !progress.tests[t.id]);
        send(res, 200, page('Not yet complete', `<h2>Lab not complete yet</h2>
          <p>${doneCount()}/${TESTS.length} tests done (${Math.floor((doneCount() / TESTS.length) * 100)}%). Still open:</p>
          <ul>${left.map((t) => `<li>${t.name} (${t.feature})</li>`).join('')}</ul>`));
        return;
      }
      const stats = featureStats();
      const key = assembleCompletionKey();
      let inner = `<h2>🎉 LAB ${LAB_NUMBER} — ${LAB_NAME} COMPLETE</h2>
        <h3>1) Features in this lab</h3><p>${FEATURES.length} features: ${FEATURES.join(', ')}</p>
        <h3>2) Vulnerabilities per feature</h3><ul>${FEATURES.map((f) => `<li>${f}: ${stats[f].total} tests</li>`).join('')}</ul>
        <h3>3) How testing was done — ${TESTS.length} techniques</h3><ul>${TESTS.map((t) => `<li>${t.name} — ${t.where}</li>`).join('')}</ul>
        <h3>4) What you learned</h3><ul>${TESTS.map((t) => `<li><strong>${t.name}:</strong> ${t.lesson}</li>`).join('')}</ul>
        <h3>5) What this means for a real client</h3><ul>${TESTS.map((t) => `<li><strong>${t.name}:</strong> ${t.impact}</li>`).join('')}</ul>
        <h3>6) Writing it in a real report</h3><ul>${TESTS.map((t) => `<li><strong>${t.report.title}</strong> (${t.report.severity}) — Fix: ${t.report.remediation}</li>`).join('')}</ul>
        <h3>Your completion key for Lab ${LAB_NUMBER + 1}</h3>
        <p style="font-size:20px;background:#fff;padding:14px;border-radius:10px;text-align:center"><strong>${key}</strong></p>
        <form method="POST" action="/api/tester" style="background:#fff;padding:14px;border-radius:10px">
          <label>Your name for the certificate<br><input name="name" value="${progress.testerName || ''}" style="padding:8px;width:60%"></label>
          <button style="padding:8px 18px">Save name</button>
        </form>
        <p><a href="/certificate">View your certificate</a></p>`;
      send(res, 200, page('Lab complete', inner));
      return;
    }
    if (pathname === '/certificate' && method === 'GET') {
      if (!isComplete()) { redirect(res, '/complete'); return; }
      const name = progress.testerName || me.name;
      const date = progress.completedAt ? new Date(progress.completedAt).toISOString().slice(0, 10) : '';
      send(res, 200, `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER}</title>
      <style>@media print{body{background:#fff}} .card{max-width:720px;margin:40px auto;background:#fff;border:3px solid #7c5cff;border-radius:16px;padding:36px;text-align:center;font-family:Georgia,serif}</style></head>
      <body style="background:#eef"><div class="card">
        <img src="/logo.png" style="height:64px">
        <h1>Certificate of Completion</h1>
        <p>This certifies that</p>
        <h2>${name}</h2>
        <p>has completed 100% of the security tests in</p>
        <h3>LAB ${LAB_NUMBER} — ${LAB_NAME} (${TESTS.length} tests across ${FEATURES.length} features)</h3>
        <p>Completed on ${date}</p>
        <p style="margin-top:28px"><em>HexaCyberLab — Built by Md. Jony Hassain, Founder</em></p>
      </div></body></html>`);
      return;
    }

    send(res, 404, 'not found', 'text/plain');
  } catch (err) {
    try { send(res, 500, 'internal error', 'text/plain'); } catch (e) { /* socket gone */ }
  }
});

/* ------------------------------------------------------------------ *
 *  Completion-key material (reporting region B).
 *  Assembled only when the lab reaches 100% (debrief, certificate
 *  context and the coach's unlocked knowledge).
 * ------------------------------------------------------------------ */
const COMPLETION_SHARDS = ["NTlBWA==","Sk9XMQ==","LURRVg==","R1M4Tw==","RC04NQ==","TC1YSA=="];
function assembleCompletionKey() {
  const rev = COMPLETION_SHARDS.map((s) => Buffer.from(s, 'base64').toString('utf8')).join('');
  return rev.split('').reverse().join('');
}

server.listen(PORT, HOST, () => {
  console.log(`LAB ${LAB_NUMBER} ${LAB_NAME} listening on http://${HOST}:${PORT}`);
});
