'use strict';
/* HexaNutrition — LAB 68 (Category 7: Healthcare & Wellness)
   A deliberately vulnerable nutrition coaching platform for authorised
   local security practice. Zero-dependency Node, in-memory fake seed data.
   Binds 127.0.0.1 only. NEVER deploy publicly. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3077, HOST = '127.0.0.1';
const LAB_NUMBER = 68, LAB_NAME = 'HexaNutrition';
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const LOGO_FILE = path.join(DIR, 'logo.png');

/* ---- key material, part 1 of 2 (encoded shards only — see assembler below) ---- */
const _kA = ["TC1YSA==", "Qy04Ng==", "U1RPNg=="];
const _kC = ["TC1YSA==", "UC05Ng==", "T1dWMw=="];

/* ============================== SEED DATA (all fake) ============================== */
const users = [
  { id: 1, email: 'admin@hexanutrition.local', pass: 'admin123', name: 'Site Admin', role: 'admin', plan: 'premium' },
  { id: 2, email: 'nina@hexanutrition.local', pass: 'nina123', name: 'Nina Rahman', role: 'nutritionist', plan: 'staff', rate: 60 },
  { id: 3, email: 'omar@hexanutrition.local', pass: 'omar123', name: 'Omar Farouk', role: 'nutritionist', plan: 'staff', rate: 50 },
  { id: 4, email: 'alice@test.local', pass: 'alice123', name: 'Alice Carter', role: 'client', plan: 'premium', freeMonths: 0 },
  { id: 5, email: 'bob@test.local', pass: 'bob123', name: 'Bob Meyer', role: 'client', plan: 'free', freeMonths: 0 },
  { id: 6, email: 'carol@test.local', pass: 'carol123', name: 'Carol Diaz', role: 'client', plan: 'free', freeMonths: 0 }
];
let nextUserId = 7;

const mealPlans = [
  { id: 1, clientId: 4, nutritionistId: 2, title: 'Balanced 1800 kcal', calories: 1800, notes: 'Nut allergy — strictly no peanuts. High-protein breakfasts.', meals: 'Oats & eggs | Grilled chicken salad | Salmon & quinoa' },
  { id: 2, clientId: 5, nutritionistId: 2, title: 'Weight-loss 1500 kcal', calories: 1500, notes: 'Evening snacking is the main issue. Front-load protein.', meals: 'Greek yoghurt & berries | Lentil soup | Baked fish & greens' },
  { id: 3, clientId: 6, nutritionistId: 3, title: 'Plant-based 2000 kcal', calories: 2000, notes: 'Watch iron and B12. Fortified foods twice a week.', meals: 'Tofu scramble | Chickpea curry | Tempeh stir fry' }
];
let nextPlanId = 4;

const consultations = [
  { id: 1, clientId: 4, nutritionistId: 2, when: '2026-10-28 10:00', price: 60, paid: true, status: 'booked' },
  { id: 2, clientId: 5, nutritionistId: 3, when: '2026-10-29 15:00', price: 50, paid: true, status: 'booked' }
];
let nextConsultId = 3;

const foodLogs = [
  { id: 1, userId: 4, day: '2026-10-20', text: 'Breakfast: oats. Lunch: chicken salad. Dinner: salmon.' },
  { id: 2, userId: 4, day: '2026-10-21', text: 'Breakfast: eggs. Lunch: quinoa bowl. Dinner: soup.' },
  { id: 3, userId: 5, day: '2026-10-20', text: 'Breakfast: toast. Lunch: burger (slip). Dinner: salad.' },
  { id: 4, userId: 6, day: '2026-10-20', text: 'Breakfast: tofu scramble. Lunch: chickpea curry.' }
];
let nextLogId = 5;

const checkins = [
  { id: 1, userId: 4, weight: 68.4, waist: 74, note: 'Feeling good, energy up.' },
  { id: 2, userId: 5, weight: 91.2, waist: 102, note: 'Tough week at work.' },
  { id: 3, userId: 6, weight: 59.8, waist: 70, note: 'New personal best on runs.' }
];
let nextCheckinId = 4;

const recipes = [
  { id: 1, title: 'Green Breakfast Smoothie', premium: false, body: 'Blend spinach, banana, Greek yoghurt, chia seeds and oat milk for 60 seconds.' },
  { id: 2, title: 'High-Protein Chicken Meal Prep', premium: true, body: 'PREMIUM PROTOCOL: 620 kcal, 58g protein. Marinate 800g chicken in yoghurt + spices 4h, grill, portion with 150g quinoa and charred broccoli. Sauce recipe and macro split included.' },
  { id: 3, title: 'Lentil & Feta Salad', premium: false, body: 'Cook green lentils 20 min, toss with feta, cucumber, mint and lemon.' },
  { id: 4, title: '14-Day Gut Reset Protocol', premium: true, body: 'PREMIUM PROTOCOL: day-by-day fermented food schedule, fibre ladder from 18g to 35g, shopping list and symptom tracker.' },
  { id: 5, title: 'Overnight Oats Base', premium: false, body: 'Oats + milk + yoghurt, rest overnight, top with berries.' },
  { id: 6, title: 'Athlete Carb-Loading Plan', premium: true, body: 'PREMIUM PROTOCOL: 3-day carb load at 10g/kg bodyweight, hourly meal timing before race day, sodium and hydration schedule.' }
];

const SUB_PRICE = 49;               // Premium subscription, USD/month
const COUPONS = { FIRSTFREE: { singleUse: true, usedBy: [] } };
const sessions = new Map();          // sid -> userId
const failCounts = {};               // email -> consecutive failed logins
const enumProbes = {};               // ip -> { emails:Set, known:bool, unknown:bool }
const issuedResets = new Set();      // userIds with a forgot-password request on file

/* ============================== TESTS REGISTRY ============================== */
const TESTS = [
  /* ---- Login & Authentication ---- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login query is built by string concatenation — what happens if your email contains a quote?', 'Try a classic tautology payload in the email field.', "Use admin@hexanutrition.local' OR '1'='1 as the email with any password."],
    lesson: 'String-built SQL queries let an attacker rewrite the query logic and log in as anyone — here, the first account in the table (the admin).',
    impact: 'On a real health platform this means instant takeover of staff accounts and every client record behind them — meal plans, weights, consultation notes.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries everywhere; never concatenate user input into SQL.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute Force — No Login Rate Limiting', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['How many wrong passwords can you try for one account in a row?', 'The app never locks the account or slows you down.', 'Script 10+ failed logins for bob@test.local and watch the test flip.'],
    lesson: 'Without throttling or lockout, credential stuffing and password guessing run at machine speed until one works.',
    impact: 'Attackers can grind through common passwords against real client accounts — weight histories and health notes are deeply personal data.',
    report: { title: 'Missing Rate Limiting on Login Enables Brute Force', severity: 'High', remediation: 'Add progressive delays, lockout and alerting after repeated failed logins.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User Enumeration via Login & Forgot Password', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the error for an email that exists with one that does not.', 'The forgot-password form answers differently too.', 'Probe at least 5 different emails across login/forgot, mixing real and fake ones.'],
    lesson: 'Different error messages for "no such account" vs "wrong password" hand attackers a free list of valid accounts to target.',
    impact: 'For a health service, confirming that a person is a client is itself a privacy leak — and it feeds targeted phishing and brute force.',
    report: { title: 'Account Enumeration Through Differential Auth Responses', severity: 'Medium', remediation: 'Return one generic message for all failed logins and reset requests.' } },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Published Default Demo Credentials', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['Read the login page carefully — what accounts does it advertise?', 'Demo credentials were never changed or removed.', 'Log in with the published demo admin account.'],
    lesson: 'Demo/default credentials left on a production login page are an open door — attackers try them first, every time.',
    impact: 'A real clinic platform shipping with admin/admin123-style creds would be breached within hours of launch.',
    report: { title: 'Default Demo Administrator Credentials Active on Login', severity: 'Critical', remediation: 'Remove demo accounts before launch; force unique credentials for every environment.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable Password Reset Token', owasp: 'A07:2021 Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a reset and study the token format — is any part random?', 'Tokens follow a formula based on the account id.', 'Compute the token for a victim account and POST /reset without ever requesting a link.'],
    lesson: 'A reset token derived from the account id by a fixed formula is not a secret — anyone can compute it and reset any password.',
    impact: 'Full account takeover of any client or staff member, including their health data and billing, with no email access needed.',
    report: { title: 'Password Reset Tokens Are Predictable', severity: 'High', remediation: 'Issue single-use, expiring reset tokens from a CSPRNG with at least 128 bits of entropy.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Role Cookie Tampering', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After login, look at the cookies the app sets — one of them describes your role.', 'The server trusts that cookie instead of the account record.', 'Set hx_role=admin in your browser and visit /admin.'],
    lesson: 'Authorization data stored client-side is attacker-controlled. Roles must be read from the server-side account record on every request.',
    impact: 'Any client becomes an admin by editing a cookie — full control of the platform, its users and its health records.',
    report: { title: 'Privilege Escalation via Client-Side Role Cookie', severity: 'Critical', remediation: 'Never trust client-supplied role data; authorize from server-side session state.' } },

  /* ---- Registration & Profile ---- */
  { id: 'reg-weakpw', feature: 'Registration & Profile', name: 'Weak Password Policy', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['How short a password will registration accept?', 'Try a single character.', 'Register with password "a" — if the account is created, the policy is the flaw.'],
    lesson: 'A password policy that accepts one character guarantees weak accounts across the whole user base.',
    impact: 'Trivially guessable client passwords expose personal health journeys and enable account resale/takeover.',
    report: { title: 'Registration Accepts Single-Character Passwords', severity: 'Medium', remediation: 'Enforce a minimum length and block common passwords at registration.' } },
  { id: 'reg-mass', feature: 'Registration & Profile', name: 'Mass Assignment — Role & Plan at Registration', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The register form shows 3 fields. What if you POST more?', 'Servers that bind the whole request body accept fields the UI never offered.', 'Add role=nutritionist (or plan=premium) to the registration POST.'],
    lesson: 'Binding request bodies straight to account records lets users grant themselves staff roles and paid plans.',
    impact: 'Attackers self-register as nutritionists — trusted staff who can read every client plan — or take premium for free.',
    report: { title: 'Mass Assignment in Registration Allows Role/Plan Escalation', severity: 'High', remediation: 'Whitelist bindable fields on every endpoint; set role and plan server-side only.' } },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is rendered in the header and the staff caseload view — is it escaped?', 'Register with an HTML payload as your name.', 'Use a name like <script>alert(1)</script> or <img src=x onerror=alert(1)>.'],
    lesson: 'User-supplied names stored and rendered unescaped execute JavaScript in other users\u2019 browsers — including staff.',
    impact: 'A malicious client name can hijack a nutritionist or admin session when they open the caseload list, pivoting to all client data.',
    report: { title: 'Stored Cross-Site Scripting in Display Name', severity: 'High', remediation: 'Escape all user-supplied output by default; add a Content-Security-Policy.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The profile form carries a hidden same-site marker. What if a POST leaves it out?', 'Nothing checks the marker, the Origin, or the Referer.', 'POST /profile with a new name and no hx_marker field, straight from curl.'],
    lesson: 'State-changing forms without anti-CSRF tokens can be triggered from any website the victim visits while logged in.',
    impact: 'An attacker page could silently rename accounts or change details on a health platform the victim trusts.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require per-session CSRF tokens on all state-changing requests and verify them server-side.' } },

  /* ---- Meal Plans ---- */
  { id: 'plan-idor', feature: 'Meal Plans', name: "Read Another Client's Meal Plan (IDOR)", owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Meal plan URLs carry a simple numeric id.', 'Nothing checks that the plan belongs to you.', 'As Bob, open /plans/1 — Alice\u2019s plan, allergy notes included.'],
    lesson: 'Sequential ids plus a missing ownership check expose every record in the system one URL at a time.',
    impact: 'Meal plans contain allergy and health-condition notes — leaking them is a serious medical-privacy breach for real clients.',
    report: { title: 'Insecure Direct Object Reference on Meal Plans', severity: 'High', remediation: 'Check object ownership against the session user on every request.' } },
  { id: 'plan-self-edit', feature: 'Meal Plans', name: 'Client Edits Own Plan via Nutritionist Endpoint', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Plans are edited through /nutritionist/plans/<id>/update — who is allowed to call it?', 'The endpoint never checks the caller\u2019s role.', 'As a client, POST new calories/notes to the nutritionist update endpoint for your own plan.'],
    lesson: 'Hiding a staff URL is not authorization. Every endpoint must verify the role itself, not rely on the UI.',
    impact: 'Clients could rewrite their own prescribed plans — dangerous where calories and allergens are clinically set.',
    report: { title: 'Missing Role Check on Nutritionist Plan-Update Endpoint', severity: 'High', remediation: 'Enforce role-based authorization inside every staff endpoint.' } },
  { id: 'plan-other-edit', feature: 'Meal Plans', name: "Edit Another Client's Meal Plan", owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The same nutritionist endpoint also ignores whose plan it is.', 'Combine the missing role check with a foreign plan id.', 'As Bob, POST an update to plan 1 (Alice\u2019s plan) and change her calories.'],
    lesson: 'Missing role checks AND missing ownership checks compound: a low-privilege user can modify anyone\u2019s clinical data.',
    impact: 'Tampering with another client\u2019s meal plan — e.g. removing an allergy warning — can cause real physical harm, not just data loss.',
    report: { title: 'Unauthorised Modification of Other Clients\u2019 Meal Plans', severity: 'Critical', remediation: 'Authorize both the role and the object ownership on every update.' } },

  /* ---- Consultations ---- */
  { id: 'consult-free', feature: 'Consultations', name: 'Consultation Booked Without Payment (Price Tampering)', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['The booking form carries the price in a hidden field.', 'The server trusts the submitted price as the amount paid.', 'Book Nina ($60) with price=0 and see the booking confirmed as paid.'],
    lesson: 'Prices and payment status must come from server-side records, never from fields the client submits.',
    impact: 'Every consultation can be booked free — direct revenue loss for practitioners on a real platform.',
    report: { title: 'Client-Side Price Trust Allows Free Consultation Booking', severity: 'High', remediation: 'Look up the rate server-side and create bookings only after verified payment.' } },
  { id: 'consult-idor', feature: 'Consultations', name: "View Another Client's Consultation (IDOR)", owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Consultation detail URLs use sequential ids.', 'Ownership is never checked on the read path.', 'As Bob, open /consultations/1 to see Alice\u2019s session with Nina.'],
    lesson: 'Read endpoints need the same ownership checks as write endpoints.',
    impact: 'Consultation details reveal who is seeing which specialist and when — sensitive health-adjacent metadata.',
    report: { title: 'Insecure Direct Object Reference on Consultation Details', severity: 'Medium', remediation: 'Scope every consultation query to the session user (or their assigned staff).' } },
  { id: 'consult-cancel', feature: 'Consultations', name: "Cancel Another Client's Consultation", owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The cancel action is a POST with the consultation id.', 'It checks you are logged in — and nothing else.', 'As Bob, POST /consultations/1/cancel.'],
    lesson: 'Destructive actions need ownership checks most of all; "logged in" is not "authorised".',
    impact: 'Malicious users can sabotage other clients\u2019 care by cancelling their appointments — a denial-of-service against patients.',
    report: { title: 'Missing Authorisation on Consultation Cancellation', severity: 'High', remediation: 'Verify the actor owns (or staffs) the consultation before cancelling.' } },

  /* ---- Food Logs & Check-ins ---- */
  { id: 'log-idor', feature: 'Food Logs & Check-ins', name: "Read Another Client's Food Log History (IDOR)", owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Food logs are addressed by user id: /foodlog/<userId>.', 'Any client can ask for any user\u2019s log.', 'As Bob, open /foodlog/4 — Alice\u2019s complete food history.'],
    lesson: 'Per-user collections keyed by a guessable id must be scoped to the requester.',
    impact: 'Food diaries expose eating habits, religious observance, disorders and routines — intimate data that must never cross accounts.',
    report: { title: 'Insecure Direct Object Reference on Food Log History', severity: 'High', remediation: 'Serve food logs only for the session user or their assigned nutritionist.' } },
  { id: 'checkin-forge', feature: 'Food Logs & Check-ins', name: 'Forged Check-in for Another Client', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The check-in form posts a hidden userId field.', 'The server records the check-in for whoever the form names.', 'POST /checkins with userId=4 and a fake weight while logged in as Bob.'],
    lesson: 'Identity fields in request bodies must be ignored — the session is the only trustworthy source of "who".',
    impact: 'Forged weigh-ins corrupt a client\u2019s progress record and the nutritionist\u2019s clinical decisions based on it.',
    report: { title: 'Check-in Forgery via Client-Supplied User ID', severity: 'High', remediation: 'Derive the user from the session; never accept a userId from the request body.' } },

  /* ---- Recipes ---- */
  { id: 'recipe-premium', feature: 'Recipes', name: 'Premium Recipe Served Without a Subscription', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Premium recipes are marked with a lock — is the lock real?', 'Open a premium recipe while on the free plan.', 'As Bob (free), open /recipes/2 and read the full premium protocol.'],
    lesson: 'Paywalls must be enforced where the content is served, not just drawn in the UI.',
    impact: 'The entire premium recipe library — the product being sold — is free to anyone with an account.',
    report: { title: 'Missing Subscription Check on Premium Recipe Pages', severity: 'Medium', remediation: 'Check the account plan server-side before serving premium content.' } },
  { id: 'recipe-api', feature: 'Recipes', name: 'Premium Recipe Content Leaked via API', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The JSON API returns recipe objects — how much of them?', 'Web pages may hide what the API happily serialises.', 'As a free user, GET /api/recipes/4 and read the premium body.'],
    lesson: 'APIs must apply the same entitlement rules as pages, and serialise only the fields the caller may see.',
    impact: 'Scrapers can harvest the full premium catalogue through the API even if the website paywall is later fixed.',
    report: { title: 'Premium Content Exposure Through API Responses', severity: 'Medium', remediation: 'Apply entitlement checks and field-level filtering in API serializers.' } },

  /* ---- Subscriptions & Billing ---- */
  { id: 'sub-price', feature: 'Subscriptions & Billing', name: 'Subscription Price Tampering', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['The subscribe form posts an amount field.', 'The server compares nothing — it just upgrades you.', 'POST /subscribe with plan=premium and amount=0.'],
    lesson: 'Payment amounts must be computed from server-side price lists; a posted amount is a claim, not a fact.',
    impact: 'Premium subscriptions for $0 — the core revenue of the business — with a one-line request.',
    report: { title: 'Client-Controlled Subscription Price', severity: 'High', remediation: 'Charge the server-side plan price via the payment provider; ignore posted amounts.' } },
  { id: 'sub-coupon', feature: 'Subscriptions & Billing', name: 'Single-Use Coupon Reuse', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['FIRSTFREE is meant to be used once per account.', 'Redemption is recorded — but is it checked?', 'Subscribe with FIRSTFREE twice and collect two free months.'],
    lesson: 'Coupon rules must be enforced at redemption time against the redemption ledger, atomically.',
    impact: 'Unlimited free months from one leaked code — a slow, quiet revenue bleed that finance may never notice.',
    report: { title: 'Single-Use Coupon Can Be Redeemed Repeatedly', severity: 'Medium', remediation: 'Enforce one redemption per account in the same transaction that grants the benefit.' } },

  /* ---- Search ---- */
  { id: 'search-sqli', feature: 'Search', name: 'SQL Injection in Search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Search builds its query from your text, just like login does.', 'A tautology payload makes the filter match everything.', "Search for ' OR '1'='1 and watch private results pour in."],
    lesson: 'Every string-built query is an injection point — search boxes are the most tested input on any site.',
    impact: 'Here it dumps the client directory (names and emails of everyone getting nutrition coaching) — a reportable data breach.',
    report: { title: 'SQL Injection in Search Returns Full Client Directory', severity: 'High', remediation: 'Parameterise search queries and scope results to the caller\u2019s role.' } },
  { id: 'search-xss', feature: 'Search', name: 'Reflected XSS in Search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your query is echoed in the results heading.', 'It is echoed without escaping.', 'Search for <script>alert(1)</script> and inspect the page source.'],
    lesson: 'Reflected input must be output-encoded; an echo is an injection if it is not.',
    impact: 'A crafted search link sent to a nutritionist executes script in their session — a stepping stone to staff account takeover.',
    report: { title: 'Reflected Cross-Site Scripting in Search Results', severity: 'Medium', remediation: 'HTML-encode all reflected values; deploy a restrictive CSP.' } },

  /* ---- Admin & Platform ---- */
  { id: 'admin-bac', feature: 'Admin & Platform', name: 'Caseload Export Open to Any Logged-In User', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Staff export the full caseload from /admin/clients.', 'The route checks for a login — and stops there.', 'As any client, open /admin/clients and download the whole client list.'],
    lesson: 'Sensitive staff endpoints need explicit role checks; being hidden behind /admin/ in the URL is not protection.',
    impact: 'Every client\u2019s name, email, plan and coach leaks to any registered user — the exact dataset health-privacy law protects most.',
    report: { title: 'Broken Access Control on Caseload Export', severity: 'High', remediation: 'Restrict caseload exports to staff roles and log every access.' } },
  { id: 'platform-debug', feature: 'Admin & Platform', name: 'Debug Endpoint Exposes All Accounts & Passwords', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Developers leave diagnostic routes behind. Guess a common one.', 'This one needs no login at all.', 'GET /api/debug and read every account, plaintext passwords included.'],
    lesson: 'Debug endpoints ship with the code and are found within minutes by scanners — they must never reach production.',
    impact: 'Complete credential dump of a health platform: every client and staff password, reusable on other services.',
    report: { title: 'Unauthenticated Debug Endpoint Discloses All Credentials', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; gate diagnostics behind admin auth and audit logs.' } }
];

/* ---- key material, part 2 of 2 (scattered far from part 1 on purpose) ---- */
const _kB = ["LTJOVw==", "M01DSQ==", "VkM5WA=="];
const _kD = ["LVhFOA==", "VkZGVg==", "Tk41Rw=="];
function _unshard(a) { return a.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join(''); }
function entryKey() { return _unshard(_kA.concat(_kB)); }
function completionKey() { return _unshard(_kC.concat(_kD)); }

/* ============================== PROGRESS ENGINE ============================== */
let state = loadState();
function loadState() {
  try {
    const s = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    if (s && typeof s === 'object') return Object.assign({ unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false }, s);
  } catch (e) { /* fresh */ }
  return { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
}
function saveState() { try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 1)); } catch (e) { /* ignore */ } }
function progressView() {
  const total = TESTS.length;
  const done = TESTS.filter(t => state.tests[t.id]).length;
  const features = {};
  for (const t of TESTS) {
    features[t.feature] = features[t.feature] || { total: 0, done: 0, attempts: state.attempts[t.feature] || 0 };
    features[t.feature].total++;
    if (state.tests[t.id]) features[t.feature].done++;
  }
  for (const f of Object.keys(features)) features[f].attempts = state.attempts[f] || 0;
  return { lab: LAB_NAME, number: LAB_NUMBER, total, done, pct: total ? Math.floor(done * 100 / total) : 0, features, complete: done === total };
}
function pass(id) {
  if (state.tests[id]) return;
  state.tests[id] = true;
  const p = progressView();
  if (p.complete && !state.completedAt) { state.completedAt = new Date().toISOString(); state.keyRevealed = true; }
  saveState();
}
function bump(feature) { state.attempts[feature] = (state.attempts[feature] || 0) + 1; saveState(); }

/* ============================== HELPERS ============================== */
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
const INJ_RE = /('|%27)\s*(or|and)\s|'\s*or\s*'|'\s*or\s*\d|union\s+select|--\s|'\s*=\s*'/i;
const XSS_RE = /<\s*script|onerror\s*=|onload\s*=|<\s*svg|<\s*img[^>]*onerror|<\s*iframe|javascript:/i;
function hasInj(s) { return typeof s === 'string' && INJ_RE.test(s); }
function resetTokenFor(u) { return 'NUT' + u.id + '-' + ((u.id * 9973 + 12345) % 100000); }
function userByEmail(email) { return users.find(u => u.email.toLowerCase() === String(email || '').toLowerCase()); }
function userById(id) { return users.find(u => u.id === Number(id)); }

function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) { const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); }
  return out;
}
function currentUser(req) {
  const c = parseCookies(req);
  const uid = sessions.get(c.hx_session || '');
  return uid ? userById(uid) : null;
}
function effectiveRole(req, user) {
  const c = parseCookies(req);
  return c.hx_role || (user ? user.role : null);
}
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', ch => { data += ch; if (data.length > 200000) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) { try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({ __badjson: true }); } }
      else {
        const out = {};
        for (const pair of data.split('&')) { if (!pair) continue; const i = pair.indexOf('='); const k = decodeURIComponent((i < 0 ? pair : pair.slice(0, i)).replace(/\+/g, ' ')); const v = decodeURIComponent((i < 0 ? '' : pair.slice(i + 1)).replace(/\+/g, ' ')); out[k] = v; }
        resolve(out);
      }
    });
    req.on('error', () => resolve({}));
  });
}
function send(res, code, body, headers) {
  res.writeHead(code, Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, headers || {}));
  res.end(body);
}
function sendJson(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj, null, 1)); }
function redirect(res, to, headers) { res.writeHead(302, Object.assign({ Location: to }, headers || {})); res.end(); }

function chatWidget() {
  return '<div id="hxchat" style="position:fixed;right:14px;bottom:14px;width:290px;background:#fff;border:1px solid #cbd5e1;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.18);font-family:Arial,sans-serif;z-index:50">' +
    '<div style="background:#14532d;color:#fff;padding:8px 12px;border-radius:12px 12px 0 0;font-weight:bold;font-size:14px">Lab Coach</div>' +
    '<div id="hxlog" style="height:150px;overflow:auto;padding:8px;font-size:13px"></div>' +
    '<form id="hxform" style="display:flex;border-top:1px solid #e2e8f0"><input id="hxin" style="flex:1;border:0;padding:9px;font-size:13px" placeholder="Ask the coach\u2026" autocomplete="off"><button style="background:#14532d;color:#fff;border:0;padding:0 14px">Send</button></form></div>' +
    '<script>var f=document.getElementById("hxform"),l=document.getElementById("hxlog"),i=document.getElementById("hxin");' +
    'f.addEventListener("submit",function(e){e.preventDefault();var m=i.value;i.value="";if(!m)return;l.innerHTML+="<div><b>You:</b> "+m.replace(/</g,"&lt;")+"</div>";' +
    'fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:m})}).then(function(r){return r.json()}).then(function(j){l.innerHTML+="<div style=\\"margin:4px 0\\"><b>Coach:</b> "+String(j.reply||"").replace(/</g,"&lt;")+"</div>";l.scrollTop=l.scrollHeight;}).catch(function(){l.innerHTML+="<div><b>Coach:</b> (connection hiccup — try again)</div>";});});</script>';
}
function layout(user, title, body) {
  const p = progressView();
  const who = user ? '<span style="float:right;font-size:13px">' + user.name + ' (' + esc(user.role) + (user.plan ? ', ' + esc(user.plan) : '') + ') · <a href="/tests">Mission Board</a> · <a href="/logout">Logout</a></span>' : '';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + ' — HexaNutrition</title>' +
    '<style>body{font-family:Arial,sans-serif;margin:0;background:#f6f8f6;color:#1c2b1c}header{background:#14532d;color:#fff;padding:10px 18px}header a{color:#bbf7d0}main{max-width:920px;margin:0 auto;padding:18px}.card{background:#fff;border:1px solid #dbe7db;border-radius:10px;padding:16px;margin:12px 0}.bar{display:inline-block;width:150px;height:10px;background:#33513c;border-radius:5px;vertical-align:middle}.bar>span{display:block;height:10px;background:#4ade80;border-radius:5px}input,select,textarea{padding:8px;margin:4px 0;width:100%;box-sizing:border-box}button{background:#16a34a;color:#fff;border:0;padding:9px 18px;border-radius:6px;cursor:pointer}a{color:#15803d}table{border-collapse:collapse;width:100%}td,th{border:1px solid #dbe7db;padding:6px 8px;text-align:left;font-size:14px}.tag{background:#dcfce7;border-radius:8px;padding:1px 8px;font-size:12px}</style></head><body>' +
    '<header><img src="/logo.png" style="height:32px;vertical-align:middle"> <b>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</b> · ' + p.done + '/' + p.total + ' tests · ' + p.pct + '% <span class="bar"><span style="width:' + p.pct + '%"></span></span>' + who + '</header>' +
    '<main>' + body + '</main>' + chatWidget() + '</body></html>';
}
function gatePage() {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' · Locked</title></head>' +
    '<body style="margin:0;background:#14231a;font-family:Arial,sans-serif"><div style="max-width:520px;margin:60px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:28px;text-align:center">' +
    '<img src="/logo.png" style="height:56px"><h2>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h2>' +
    '<p>This lab is locked. Paste the completion key from Lab ' + (LAB_NUMBER - 1) + ' to start.</p>' +
    '<form method="POST" action="/unlock"><input name="key" style="padding:9px;width:80%" placeholder="Completion key from Lab ' + (LAB_NUMBER - 1) + '"><br><br><button style="padding:10px 22px">Unlock LAB ' + LAB_NUMBER + '</button></form></div>' + chatWidget() + '</body></html>';
}

/* ============================== LAB COACH (chatbot) ============================== */
const GUIDE = {
  'Login & Authentication': 'Step by step for Login & Authentication:\n1) SQLi bypass — the login query is string-built. Log in with email: admin@hexanutrition.local\' OR \'1\'=\'1 and any password.\n2) Brute force — nothing throttles you: script 10+ wrong passwords for one account (e.g. bob@test.local) and the missing lockout flips the test.\n3) Enumeration — probe 5+ different emails across login and forgot-password, mixing real and fake ones; compare the different error messages.\n4) Default creds — the login page itself publishes a demo admin account; just log in with it.\n5) Predictable reset token — tokens are NUT<id>-<a fixed formula of the id>. Compute one for a victim and POST /reset {email, token, newpass} without requesting a link first.\n6) Role cookie — after any login, set the hx_role cookie to "admin" and open /admin.',
  'Registration & Profile': 'Step by step for Registration & Profile:\n1) Weak password — register with a 1-character password; the account is created anyway.\n2) Mass assignment — add role=nutritionist (or plan=premium) to the registration POST; the server binds the whole body.\n3) Stored XSS — register with a display name like <script>alert(1)</script>; it is rendered raw in the header and the staff caseload.\n4) CSRF — while logged in, POST /profile with a new name from curl and leave out the hx_marker field; it changes with no token check.',
  'Meal Plans': 'Step by step for Meal Plans:\n1) IDOR read — as Bob (client), open /plans/1. That is Alice\u2019s plan, allergy notes and all; no ownership check runs.\n2) Self-edit via staff endpoint — plans are edited at POST /nutritionist/plans/<id>/update. As a client, POST new calories/notes for YOUR OWN plan there; the role check is missing.\n3) Other-edit — same endpoint, but target a plan that is not yours (e.g. as Bob, update plan 1) and change the calories.',
  'Consultations': 'Step by step for Consultations:\n1) Free booking — the booking form carries the price in a hidden field and the server trusts it. Book Nina (rate $60) while posting price=0; the booking is created as paid.\n2) IDOR read — as Bob, open /consultations/1 to view Alice\u2019s consultation.\n3) Foreign cancel — as Bob, POST /consultations/1/cancel; it cancels even though it is not your booking.',
  'Food Logs & Check-ins': 'Step by step for Food Logs & Check-ins:\n1) Food log IDOR — logs live at /foodlog/<userId>. As Bob, open /foodlog/4 for Alice\u2019s full history.\n2) Forged check-in — the check-in form posts a hidden userId. POST /checkins with userId=4 and any weight while logged in as Bob; the entry lands on Alice\u2019s record.',
  'Recipes': 'Step by step for Recipes:\n1) Premium page — as a free-plan user (Bob), just open /recipes/2; the full premium protocol is served with no subscription check.\n2) API leak — as the same free user, GET /api/recipes/4; the JSON API returns the premium body too.',
  'Subscriptions & Billing': 'Step by step for Subscriptions & Billing:\n1) Price tampering — POST /subscribe with plan=premium and amount=0; the upgrade is granted for the posted amount.\n2) Coupon reuse — subscribe using coupon FIRSTFREE once (legit), then subscribe with FIRSTFREE again; the single-use rule is recorded but never enforced, and a second free month lands.',
  'Search': 'Step by step for Search:\n1) SQLi — search for \' OR \'1\'=\'1 ; the string-built query matches everything and the result includes the private client directory.\n2) Reflected XSS — search for <script>alert(1)</script> and view the page source; your query is echoed unescaped in the results heading.',
  'Admin & Platform': 'Step by step for Admin & Platform:\n1) Caseload export — while logged in as any client, open /admin/clients. The full caseload (names, emails, plans) is served with no role check.\n2) Debug dump — GET /api/debug with no login at all; it returns every account including plaintext passwords.'
};
const FEATURE_KEYS = [
  ['Login & Authentication', ['login', 'auth', 'brute', 'reset token', 'enumerat', 'cookie']],
  ['Registration & Profile', ['register', 'registration', 'profile', 'sign up', 'signup', 'mass assignment']],
  ['Meal Plans', ['meal plan', 'meal plans']],
  ['Consultations', ['consult']],
  ['Food Logs & Check-ins', ['food log', 'check-in', 'checkin', 'check in', 'weigh']],
  ['Recipes', ['recipe']],
  ['Subscriptions & Billing', ['subscri', 'coupon', 'billing']],
  ['Search', ['search']],
  ['Admin & Platform', ['admin', 'debug', 'caseload', 'platform']]
];
function chatReply(raw) {
  const m = String(raw || '').toLowerCase();
  const p = progressView();
  if (/(who (built|made|created)|founder|who is jony|your creator|who built)/.test(m)) {
    return 'These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for \'Who is Md. Jony Hassain\', or ask ChatGPT.';
  }
  if (/(completion key|next lab|the key|unlock key|give me.*key|reveal.*key)/.test(m)) {
    if (p.complete && state.keyRevealed) return 'You completed LAB ' + LAB_NUMBER + ' — 100%! The completion key for the next lab is: ' + completionKey();
    return 'I don\'t have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at ' + p.pct + '% (' + p.done + '/' + p.total + ' tests). Finish every test and I\'ll be able to share it.';
  }
  if (/(progress|how am i|how far|my score)/.test(m)) {
    return 'You have completed ' + p.done + ' of ' + p.total + ' tests (' + p.pct + '%).' + (p.complete ? ' This lab is complete!' : ' Check the Mission Board at /tests to see what is still open.');
  }
  let feat = null;
  for (const pair of FEATURE_KEYS) { if (pair[1].some(k => m.includes(k))) { feat = pair[0]; break; } }
  const wantsCount = /(how many|which|list|count|what tests|vulnerabilit|names)/.test(m);
  const wantsHow = /(how|guide|step|solve|exploit|bypass|help me|do it|attack|hint)/.test(m);
  if (feat) {
    const list = TESTS.filter(t => t.feature === feat);
    if (wantsCount || !wantsHow) {
      if (wantsHow && !wantsCount) { /* falls through to guidance below */ }
      else return feat + ' has ' + list.length + ' tests: ' + list.map(t => t.name + (state.tests[t.id] ? ' (done)' : '')).join('; ') + '. Attempts so far on this feature: ' + (state.attempts[feat] || 0) + '.';
    }
    const att = state.attempts[feat] || 0;
    const openLeft = list.some(t => !state.tests[t.id]);
    if (att >= 3 || !openLeft) return GUIDE[feat];
    return 'That feature is locked for help. First try the ' + feat + ' tests yourself at least 3 times — I can see you\'ve tried ' + att + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  if (wantsCount || /(features|tests)/.test(m)) {
    return 'This lab has ' + Object.keys(p.features).length + ' features and ' + p.total + ' tests in total. You have finished ' + p.done + ' (' + p.pct + '%). Visit /tests for the full Mission Board with hints for every test.';
  }
  if (/(^|\b)(hi|hello|hey)\b/.test(m)) {
    return 'Hello! I am the Lab Coach for LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '. Ask me how many tests a feature has, say "progress" for your score, or try a feature at least 3 times and then ask me how to solve its tests.';
  }
  return 'I can help with this lab\u2019s features and tests. Try "how many tests in Meal Plans", "progress", or try a feature 3 times and ask "how do I solve the Search tests". The full map with hints is at /tests.';
}

/* ============================== PAGES ============================== */
function loginPage(msg) {
  return layout(null, 'Login',
    '<div class="card"><h2>Welcome to HexaNutrition</h2>' +
    (msg ? '<p style="color:#b91c1c">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/login"><label>Email</label><input name="email" type="email" required><label>Password</label><input name="pass" type="password" required><button>Log in</button></form>' +
    '<p><a href="/forgot">Forgot password?</a> · <a href="/register">Create an account</a></p>' +
    '<div style="background:#fef9c3;padding:10px;border-radius:8px"><b>Demo accounts (remove before launch!):</b><br>Admin: admin@hexanutrition.local / admin123<br>Nutritionist: nina@hexanutrition.local / nina123<br>Clients: alice@test.local / alice123 (premium), bob@test.local / bob123 (free), carol@test.local / carol123 (free)</div></div>');
}
function registerPage(msg) {
  return layout(null, 'Register',
    '<div class="card"><h2>Create your account</h2>' + (msg ? '<p style="color:#b91c1c">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/register"><label>Display name</label><input name="name" required><label>Email</label><input name="email" type="email" required><label>Password</label><input name="pass" type="password" required><button>Register</button></form>' +
    '<p>Already registered? <a href="/login">Log in</a></p></div>');
}
function dashboard(user) {
  const myPlan = mealPlans.find(pl => pl.clientId === user.id);
  return layout(user, 'Dashboard',
    '<div class="card"><h2>Hello, ' + user.name + '</h2>' +
    '<p>Your plan: <span class="tag">' + esc(user.plan) + '</span> · Role: <span class="tag">' + esc(user.role) + '</span>' + (user.freeMonths ? ' · Free months banked: ' + user.freeMonths : '') + '</p>' +
    '<ul>' +
    (myPlan ? '<li><a href="/plans/' + myPlan.id + '">My meal plan</a> — ' + esc(myPlan.title) + '</li>' : '<li><a href="/plans">Meal plans</a></li>') +
    '<li><a href="/consultations">Consultations</a> — book & manage sessions</li>' +
    '<li><a href="/foodlog/' + user.id + '">My food log</a> · <a href="/checkins">My check-ins</a></li>' +
    '<li><a href="/recipes">Recipe library</a> · <a href="/search">Search</a></li>' +
    '<li><a href="/subscribe">Subscription</a> · <a href="/profile">Profile</a></li>' +
    '<li><a href="/tests">Mission Board</a> — track the security tests</li></ul></div>');
}
function testsPage(user) {
  const p = progressView();
  let body = '<div class="card"><h2>Mission Board — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h2><p>' + p.done + '/' + p.total + ' tests complete · ' + p.pct + '%</p></div>';
  for (const fname of Object.keys(p.features)) {
    const f = p.features[fname];
    body += '<div class="card"><h3>' + esc(fname) + ' <span class="tag">' + f.done + '/' + f.total + ' done · ' + f.attempts + ' attempts</span></h3>';
    for (const t of TESTS.filter(x => x.feature === fname)) {
      body += '<div style="border-top:1px solid #e5e7eb;padding:8px 0"><b>' + (state.tests[t.id] ? '✓' : '○') + ' ' + esc(t.name) + '</b> <span class="tag">' + esc(t.owasp) + '</span> <span class="tag">' + esc(t.difficulty) + '</span>' +
        '<details><summary>Hint 1</summary><p>' + esc(t.hints[0]) + '</p><details><summary>Hint 2</summary><p>' + esc(t.hints[1]) + '</p><details><summary>Hint 3</summary><p>' + esc(t.hints[2]) + '</p></details></details></details></div>';
    }
    body += '</div>';
  }
  return layout(user, 'Mission Board', body);
}
function completePage(user) {
  const p = progressView();
  if (!p.complete) {
    const left = TESTS.filter(t => !state.tests[t.id]);
    let body = '<div class="card"><h2>Completion Summary</h2><p>You are at ' + p.pct + '% (' + p.done + '/' + p.total + '). The full summary, completion key and certificate unlock at 100%.</p><h3>Still open (' + left.length + '):</h3><ul>';
    for (const t of left) body += '<li>' + esc(t.feature) + ' — ' + esc(t.name) + '</li>';
    return layout(user, 'Complete', body + '</ul><p>See the <a href="/tests">Mission Board</a>.</p></div>');
  }
  let body = '<div class="card"><h2>Lab Complete — 100%</h2>';
  body += '<h3>1) Features in this lab</h3><p>' + Object.keys(p.features).length + ' features, ' + p.total + ' tests.</p>';
  body += '<h3>2) Vulnerabilities per feature</h3><ul>';
  for (const fname of Object.keys(p.features)) body += '<li>' + esc(fname) + ': ' + p.features[fname].total + ' tests</li>';
  body += '</ul><h3>3) Ways testing was done</h3><ul>';
  for (const t of TESTS) body += '<li>' + esc(t.name) + ' (' + esc(t.owasp) + ')</li>';
  body += '</ul><h3>4) What you learned</h3><ul>';
  for (const t of TESTS) body += '<li><b>' + esc(t.name) + ':</b> ' + esc(t.lesson) + '</li>';
  body += '</ul><h3>5) What this means for a real client</h3><ul>';
  for (const t of TESTS) body += '<li><b>' + esc(t.name) + ':</b> ' + esc(t.impact) + '</li>';
  body += '</ul><h3>6) Writing it in a real report</h3><ul>';
  for (const t of TESTS) body += '<li><b>' + esc(t.report.title) + '</b> — Severity: ' + esc(t.report.severity) + '. Fix: ' + esc(t.report.remediation) + '</li>';
  body += '</ul>';
  body += '<h3>Your completion key (unlocks Lab ' + (LAB_NUMBER + 1) + ')</h3><p style="font-size:20px"><code>' + esc(completionKey()) + '</code></p>';
  body += '<form method="POST" action="/set-name"><label>Your name for the certificate</label><input name="name" value="' + esc(state.testerName) + '" placeholder="e.g. Alex Tester"><button>Save name</button></form>';
  body += '<p><a href="/certificate">View your certificate</a></p></div>';
  return layout(user, 'Complete', body);
}
function certificatePage(user) {
  const p = progressView();
  if (!p.complete) return null;
  const name = state.testerName || (user ? user.name : 'Tester');
  const date = state.completedAt ? new Date(state.completedAt).toISOString().slice(0, 10) : '';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ' + LAB_NUMBER + '</title><style>body{font-family:Georgia,serif;background:#eef4ee;margin:0}.card{max-width:720px;margin:50px auto;background:#fff;border:3px double #14532d;border-radius:8px;padding:44px;text-align:center}h1{color:#14532d}@media print{body{background:#fff}}</style></head><body>' +
    '<div class="card"><img src="/logo.png" style="height:64px"><h1>Certificate of Completion</h1>' +
    '<p>This certifies that</p><h2>' + esc(name) + '</h2>' +
    '<p>has completed 100% of the security tests in <b>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</b> (' + p.total + ' tests across ' + Object.keys(p.features).length + ' features)</p>' +
    '<p>Completed on ' + esc(date) + '</p><p style="margin-top:28px"><b>HexaCyberLab — Built by Md. Jony Hassain, Founder</b></p></div></body></html>';
}

/* ============================== HTTP SERVER ============================== */
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://127.0.0.1');
    const pathname = u.pathname;
    const method = req.method;

    if (pathname === '/logo.png') {
      try { const img = fs.readFileSync(LOGO_FILE); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(img); }
      catch (e) { return send(res, 404, 'logo missing'); }
    }
    if (pathname === '/api/progress') return sendJson(res, 200, progressView());

    /* ---- chatbot (also answers while locked, per coach rules) ---- */
    if (pathname === '/api/chat' && method === 'POST') {
      const body = await readBody(req);
      if (body.__badjson) return sendJson(res, 200, { reply: 'Sorry, I could not read that message. Ask me about this lab\u2019s features, tests or your progress.' });
      return sendJson(res, 200, { reply: chatReply(body.message) });
    }

    /* ---- lock gate ---- */
    if (!state.unlocked) {
      if (pathname === '/unlock' && method === 'POST') {
        const body = await readBody(req);
        if (String(body.key || '') === entryKey()) { state.unlocked = true; saveState(); return redirect(res, '/'); }
        return send(res, 403, 'Invalid key — access denied.');
      }
      return send(res, 200, gatePage());
    }

    /* ---- debug dump: no authentication at all (that is the flaw) ---- */
    if (pathname === '/api/debug') {
      bump('Admin & Platform');
      pass('platform-debug');
      return sendJson(res, 200, { users: users.map(x => ({ id: x.id, email: x.email, password: x.pass, name: x.name, role: x.role, plan: x.plan })), mealPlans, consultations });
    }

    const user = currentUser(req);
    const body = (method === 'POST') ? await readBody(req) : {};

    /* ---------------- auth routes ---------------- */
    if (pathname === '/login' && method === 'GET') { if (user) return redirect(res, '/'); return send(res, 200, loginPage('')); }
    if (pathname === '/login' && method === 'POST') {
      bump('Login & Authentication');
      const email = String(body.email || ''), pw = String(body.pass || '');
      const ip = req.socket.remoteAddress || 'local';
      const probe = (known) => {
        const e = enumProbes[ip] || (enumProbes[ip] = { emails: new Set(), known: false, unknown: false });
        e.emails.add(email.toLowerCase()); if (known) e.known = true; else e.unknown = true;
        if (e.emails.size >= 5 && e.known && e.unknown) pass('auth-enum');
      };
      if (hasInj(email) || hasInj(pw)) {
        const victim = users[0];
        const sid = crypto.randomBytes(16).toString('hex'); sessions.set(sid, victim.id);
        pass('auth-sqli');
        return redirect(res, '/', { 'Set-Cookie': ['hx_session=' + sid + '; Path=/; HttpOnly', 'hx_role=' + victim.role + '; Path=/'] });
      }
      const found = userByEmail(email);
      if (!found) { probe(false); return send(res, 200, loginPage('No account found for that email.')); }
      if (found.pass !== pw) {
        failCounts[email.toLowerCase()] = (failCounts[email.toLowerCase()] || 0) + 1;
        if (failCounts[email.toLowerCase()] >= 10) pass('auth-brute');
        probe(true);
        return send(res, 200, loginPage('Incorrect password.'));
      }
      failCounts[email.toLowerCase()] = 0; probe(true);
      if (email.toLowerCase() === 'admin@hexanutrition.local' && pw === 'admin123') pass('auth-default');
      const sid = crypto.randomBytes(16).toString('hex'); sessions.set(sid, found.id);
      return redirect(res, '/', { 'Set-Cookie': ['hx_session=' + sid + '; Path=/; HttpOnly', 'hx_role=' + found.role + '; Path=/'] });
    }
    if (pathname === '/logout') {
      const c = parseCookies(req); sessions.delete(c.hx_session || '');
      return redirect(res, '/login', { 'Set-Cookie': ['hx_session=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0'] });
    }
    if (pathname === '/forgot' && method === 'GET') {
      return send(res, 200, layout(null, 'Forgot password', '<div class="card"><h2>Forgot password</h2><form method="POST" action="/forgot"><label>Email</label><input name="email" type="email" required><button>Send reset link</button></form></div>'));
    }
    if (pathname === '/forgot' && method === 'POST') {
      bump('Login & Authentication');
      const email = String(body.email || '');
      const found = userByEmail(email);
      const ip = req.socket.remoteAddress || 'local';
      const e = enumProbes[ip] || (enumProbes[ip] = { emails: new Set(), known: false, unknown: false });
      e.emails.add(email.toLowerCase()); if (found) e.known = true; else e.unknown = true;
      if (e.emails.size >= 5 && e.known && e.unknown) pass('auth-enum');
      if (found) { issuedResets.add(found.id); return send(res, 200, layout(null, 'Forgot password', '<div class="card"><h2>Reset link sent</h2><p>Check your inbox for the password reset link.</p><p><a href="/reset">Open the reset page</a> (in this lab you type the token yourself).</p></div>')); }
      return send(res, 200, layout(null, 'Forgot password', '<div class="card"><h2>No account with that email.</h2><p><a href="/forgot">Try again</a></p></div>'));
    }
    if (pathname === '/reset' && method === 'GET') {
      return send(res, 200, layout(null, 'Reset password', '<div class="card"><h2>Reset password</h2><form method="POST" action="/reset"><label>Email</label><input name="email" type="email" required><label>Reset token</label><input name="token" required><label>New password</label><input name="newpass" type="password" required><button>Reset password</button></form></div>'));
    }
    if (pathname === '/reset' && method === 'POST') {
      bump('Login & Authentication');
      const found = userByEmail(String(body.email || ''));
      if (found && String(body.token || '') === resetTokenFor(found)) {
        if (!issuedResets.has(found.id)) pass('auth-reset');
        found.pass = String(body.newpass || 'changed123'); issuedResets.delete(found.id);
        return send(res, 200, layout(null, 'Reset password', '<div class="card"><h2>Password changed</h2><p><a href="/login">Log in</a> with your new password.</p></div>'));
      }
      return send(res, 200, layout(null, 'Reset password', '<div class="card"><h2>Invalid reset token.</h2><p><a href="/reset">Try again</a></p></div>'));
    }
    if (pathname === '/register' && method === 'GET') return send(res, 200, registerPage(''));
    if (pathname === '/register' && method === 'POST') {
      bump('Registration & Profile');
      const email = String(body.email || ''), pw = String(body.pass || ''), name = String(body.name || 'New User');
      if (!email || !pw) return send(res, 200, registerPage('Email and password are required.'));
      if (userByEmail(email)) return send(res, 200, registerPage('That email is already registered.'));
      const nu = { id: nextUserId++, email, pass: pw, name, role: 'client', plan: 'free', freeMonths: 0 };
      let mass = false;
      if (body.role === 'nutritionist' || body.role === 'admin') { nu.role = body.role; mass = true; }
      if (body.plan === 'premium') { nu.plan = 'premium'; mass = true; }
      if (mass) pass('reg-mass');
      if (pw.length <= 3) pass('reg-weakpw');
      if (XSS_RE.test(name)) pass('reg-xss');
      users.push(nu);
      const sid = crypto.randomBytes(16).toString('hex'); sessions.set(sid, nu.id);
      return redirect(res, '/', { 'Set-Cookie': ['hx_session=' + sid + '; Path=/; HttpOnly', 'hx_role=' + nu.role + '; Path=/'] });
    }

    /* ---------------- completion pages: no login needed (the completion key and certificate must stay reachable even if the session is gone) ---------------- */
    if (pathname === '/complete' && method === 'GET') return send(res, 200, completePage(user));
    if (pathname === '/set-name' && method === 'POST') { state.testerName = String(body.name || '').slice(0, 80); saveState(); return redirect(res, '/complete'); }
    if (pathname === '/certificate' && method === 'GET') {
      const cert = certificatePage(user);
      if (!cert) return redirect(res, '/complete');
      return send(res, 200, cert);
    }

    /* ---------------- everything below needs a login ---------------- */
    if (!user) return redirect(res, '/login');

    if (pathname === '/' && method === 'GET') return send(res, 200, dashboard(user));
    if (pathname === '/tests' && method === 'GET') return send(res, 200, testsPage(user));

    /* ---------------- profile ---------------- */
    if (pathname === '/profile' && method === 'GET') {
      return send(res, 200, layout(user, 'Profile', '<div class="card"><h2>Your profile</h2><form method="POST" action="/profile"><input type="hidden" name="hx_marker" value="1"><label>Display name</label><input name="name" value="' + esc(user.name) + '"><label>Email</label><input value="' + esc(user.email) + '" disabled><button>Save profile</button></form></div>'));
    }
    if (pathname === '/profile' && method === 'POST') {
      bump('Registration & Profile');
      if (!body.hx_marker) pass('reg-csrf');
      if (body.name) { user.name = String(body.name); if (XSS_RE.test(user.name)) pass('reg-xss'); }
      return redirect(res, '/profile');
    }

    /* ---------------- meal plans ---------------- */
    if (pathname === '/plans' && method === 'GET') {
      let rows = '';
      for (const pl of mealPlans) { const c = userById(pl.clientId); rows += '<tr><td>' + pl.id + '</td><td><a href="/plans/' + pl.id + '">' + esc(pl.title) + '</a></td><td>' + esc(c ? c.name : '?') + '</td><td>' + pl.calories + ' kcal</td></tr>'; }
      return send(res, 200, layout(user, 'Meal plans', '<div class="card"><h2>Meal plans</h2><table><tr><th>#</th><th>Plan</th><th>Client</th><th>Calories</th></tr>' + rows + '</table></div>'));
    }
    let m = pathname.match(/^\/plans\/(\d+)$/);
    if (m && method === 'GET') {
      bump('Meal Plans');
      const pl = mealPlans.find(x => x.id === Number(m[1]));
      if (!pl) return send(res, 404, 'Plan not found');
      if (user.role === 'client' && pl.clientId !== user.id) pass('plan-idor');
      const coach = userById(pl.nutritionistId);
      return send(res, 200, layout(user, 'Meal plan', '<div class="card"><h2>' + esc(pl.title) + '</h2><p>Coach: ' + esc(coach ? coach.name : '?') + ' · Target: ' + pl.calories + ' kcal/day</p><p><b>Meals:</b> ' + esc(pl.meals) + '</p><p><b>Coach notes:</b> ' + esc(pl.notes) + '</p>' +
        '<h3>Update (nutritionist)</h3><form method="POST" action="/nutritionist/plans/' + pl.id + '/update"><label>Title</label><input name="title" value="' + esc(pl.title) + '"><label>Calories</label><input name="calories" value="' + pl.calories + '"><label>Notes</label><input name="notes" value="' + esc(pl.notes) + '"><button>Update plan</button></form></div>'));
    }
    m = pathname.match(/^\/nutritionist\/plans\/(\d+)\/update$/);
    if (m && method === 'POST') {
      bump('Meal Plans');
      const pl = mealPlans.find(x => x.id === Number(m[1]));
      if (!pl) return send(res, 404, 'Plan not found');
      if (body.title) pl.title = String(body.title);
      if (body.calories) pl.calories = Number(body.calories) || pl.calories;
      if (body.notes) pl.notes = String(body.notes);
      if (user.role === 'client' && pl.clientId === user.id) pass('plan-self-edit');
      if (user.role === 'client' && pl.clientId !== user.id) pass('plan-other-edit');
      return redirect(res, '/plans/' + pl.id);
    }

    /* ---------------- consultations ---------------- */
    if (pathname === '/consultations' && method === 'GET') {
      let rows = '';
      for (const c of consultations) { const cl = userById(c.clientId), n = userById(c.nutritionistId); rows += '<tr><td>' + c.id + '</td><td><a href="/consultations/' + c.id + '">' + esc(c.when) + '</a></td><td>' + esc(cl ? cl.name : '?') + '</td><td>' + esc(n ? n.name : '?') + '</td><td>$' + c.price + '</td><td>' + (c.paid ? 'paid' : 'unpaid') + '</td><td>' + esc(c.status) + '</td></tr>'; }
      let opts = '';
      for (const n of users.filter(x => x.role === 'nutritionist')) opts += '<option value="' + n.id + '">' + esc(n.name) + ' — $' + n.rate + '/session</option>';
      return send(res, 200, layout(user, 'Consultations', '<div class="card"><h2>Consultations</h2><table><tr><th>#</th><th>When</th><th>Client</th><th>Nutritionist</th><th>Price</th><th>Payment</th><th>Status</th></tr>' + rows + '</table>' +
        '<h3>Book a consultation</h3><form method="POST" action="/consultations/book"><label>Nutritionist</label><select name="nutritionistId">' + opts + '</select><label>When</label><input name="when" value="2026-11-02 10:00"><input type="hidden" name="price" value="60"><button>Book &amp; pay</button></form></div>'));
    }
    if (pathname === '/consultations/book' && method === 'POST') {
      bump('Consultations');
      const nutri = userById(Number(body.nutritionistId));
      const rate = nutri && nutri.rate ? nutri.rate : 50;
      let price = Number(body.price); if (isNaN(price)) price = rate;
      const c = { id: nextConsultId++, clientId: user.id, nutritionistId: nutri ? nutri.id : 2, when: String(body.when || '2026-11-02 10:00'), price, paid: true, status: 'booked' };
      consultations.push(c);
      if (price < rate) pass('consult-free');
      return redirect(res, '/consultations');
    }
    m = pathname.match(/^\/consultations\/(\d+)$/);
    if (m && method === 'GET') {
      bump('Consultations');
      const c = consultations.find(x => x.id === Number(m[1]));
      if (!c) return send(res, 404, 'Consultation not found');
      if (user.role === 'client' && c.clientId !== user.id) pass('consult-idor');
      const cl = userById(c.clientId), n = userById(c.nutritionistId);
      return send(res, 200, layout(user, 'Consultation', '<div class="card"><h2>Consultation #' + c.id + '</h2><p>Client: ' + esc(cl ? cl.name : '?') + '<br>Nutritionist: ' + esc(n ? n.name : '?') + '<br>When: ' + esc(c.when) + '<br>Price: $' + c.price + ' (' + (c.paid ? 'paid' : 'unpaid') + ')<br>Status: ' + esc(c.status) + '</p><form method="POST" action="/consultations/' + c.id + '/cancel"><button>Cancel this consultation</button></form></div>'));
    }
    m = pathname.match(/^\/consultations\/(\d+)\/cancel$/);
    if (m && method === 'POST') {
      bump('Consultations');
      const c = consultations.find(x => x.id === Number(m[1]));
      if (!c) return send(res, 404, 'Consultation not found');
      if (user.role === 'client' && c.clientId !== user.id) pass('consult-cancel');
      c.status = 'cancelled';
      return redirect(res, '/consultations');
    }

    /* ---------------- food logs & check-ins ---------------- */
    m = pathname.match(/^\/foodlog\/(\d+)$/);
    if (m && method === 'GET') {
      bump('Food Logs & Check-ins');
      const target = userById(Number(m[1]));
      if (!target) return send(res, 404, 'User not found');
      if (user.role === 'client' && target.id !== user.id) pass('log-idor');
      let rows = '';
      for (const l of foodLogs.filter(x => x.userId === target.id)) rows += '<tr><td>' + esc(l.day) + '</td><td>' + esc(l.text) + '</td></tr>';
      return send(res, 200, layout(user, 'Food log', '<div class="card"><h2>Food log — ' + esc(target.name) + '</h2><table><tr><th>Day</th><th>Log</th></tr>' + rows + '</table>' +
        (target.id === user.id ? '<h3>Add today\u2019s log</h3><form method="POST" action="/foodlog"><input name="day" value="2026-10-22"><input name="text" placeholder="What did you eat?"><button>Add entry</button></form>' : '') + '</div>'));
    }
    if (pathname === '/foodlog' && method === 'POST') {
      bump('Food Logs & Check-ins');
      foodLogs.push({ id: nextLogId++, userId: user.id, day: String(body.day || ''), text: String(body.text || '') });
      return redirect(res, '/foodlog/' + user.id);
    }
    if (pathname === '/checkins' && method === 'GET') {
      let rows = '';
      for (const ci of checkins.filter(x => x.userId === user.id)) rows += '<tr><td>' + ci.weight + ' kg</td><td>' + ci.waist + ' cm</td><td>' + esc(ci.note) + '</td></tr>';
      return send(res, 200, layout(user, 'Check-ins', '<div class="card"><h2>Your check-ins</h2><table><tr><th>Weight</th><th>Waist</th><th>Note</th></tr>' + rows + '</table>' +
        '<h3>New check-in</h3><form method="POST" action="/checkins"><input type="hidden" name="userId" value="' + user.id + '"><label>Weight (kg)</label><input name="weight" value="70"><label>Waist (cm)</label><input name="waist" value="80"><label>Note</label><input name="note"><button>Submit check-in</button></form></div>'));
    }
    if (pathname === '/checkins' && method === 'POST') {
      bump('Food Logs & Check-ins');
      const target = Number(body.userId || user.id);
      if (target !== user.id) pass('checkin-forge');
      checkins.push({ id: nextCheckinId++, userId: target, weight: Number(body.weight) || 0, waist: Number(body.waist) || 0, note: String(body.note || '') });
      return redirect(res, '/checkins');
    }

    /* ---------------- recipes ---------------- */
    if (pathname === '/recipes' && method === 'GET') {
      let rows = '';
      for (const r of recipes) rows += '<div style="border-top:1px solid #e5e7eb;padding:8px 0"><a href="/recipes/' + r.id + '">' + esc(r.title) + '</a> ' + (r.premium ? '<span class="tag">PREMIUM</span>' : '<span class="tag">free</span>') + '</div>';
      return send(res, 200, layout(user, 'Recipes', '<div class="card"><h2>Recipe library</h2><p>Your plan: <b>' + esc(user.plan) + '</b></p>' + rows + '</div>'));
    }
    m = pathname.match(/^\/recipes\/(\d+)$/);
    if (m && method === 'GET') {
      bump('Recipes');
      const r = recipes.find(x => x.id === Number(m[1]));
      if (!r) return send(res, 404, 'Recipe not found');
      if (r.premium && user.plan !== 'premium') pass('recipe-premium');
      return send(res, 200, layout(user, 'Recipe', '<div class="card"><h2>' + esc(r.title) + '</h2>' + (r.premium ? '<p><span class="tag">PREMIUM</span></p>' : '') + '<p>' + esc(r.body) + '</p></div>'));
    }
    m = pathname.match(/^\/api\/recipes\/(\d+)$/);
    if (m && method === 'GET') {
      bump('Recipes');
      const r = recipes.find(x => x.id === Number(m[1]));
      if (!r) return sendJson(res, 404, { error: 'not found' });
      if (r.premium && user.plan !== 'premium') pass('recipe-api');
      return sendJson(res, 200, r);
    }

    /* ---------------- subscriptions ---------------- */
    if (pathname === '/subscribe' && method === 'GET') {
      return send(res, 200, layout(user, 'Subscription', '<div class="card"><h2>Subscription</h2><p>Current plan: <b>' + esc(user.plan) + '</b>' + (user.freeMonths ? ' · Free months banked: ' + user.freeMonths : '') + '</p>' +
        '<p>Premium — $' + SUB_PRICE + '/month: full meal-plan coaching, premium recipes, priority consultations.</p>' +
        '<form method="POST" action="/subscribe"><input type="hidden" name="plan" value="premium"><input type="hidden" name="amount" value="' + SUB_PRICE + '"><label>Coupon code</label><input name="coupon" placeholder="e.g. FIRSTFREE"><button>Upgrade to Premium</button></form></div>'));
    }
    if (pathname === '/subscribe' && method === 'POST') {
      bump('Subscriptions & Billing');
      const amount = body.amount !== undefined ? Number(body.amount) : SUB_PRICE;
      const code = String(body.coupon || '').toUpperCase();
      if (code && COUPONS[code]) {
        if (COUPONS[code].usedBy.includes(user.id)) { pass('sub-coupon'); user.freeMonths = (user.freeMonths || 0) + 1; }
        else { COUPONS[code].usedBy.push(user.id); user.freeMonths = (user.freeMonths || 0) + 1; }
      }
      user.plan = 'premium';
      if (!isNaN(amount) && amount < SUB_PRICE) pass('sub-price');
      return redirect(res, '/subscribe');
    }

    /* ---------------- search ---------------- */
    if (pathname === '/search' && method === 'GET') {
      bump('Search');
      const q = u.searchParams.get('q') || '';
      let foundRecipes = [], foundClients = [];
      if (q) {
        if (hasInj(q)) { pass('search-sqli'); foundRecipes = recipes.slice(); foundClients = users.filter(x => x.role === 'client'); }
        else {
          const ql = q.toLowerCase();
          foundRecipes = recipes.filter(r => r.title.toLowerCase().includes(ql));
          foundClients = users.filter(x => x.role === 'client' && (x.name.toLowerCase().includes(ql) || x.email.toLowerCase().includes(ql)));
        }
        if (XSS_RE.test(q)) pass('search-xss');
      }
      let body = '<div class="card"><h2>Search recipes &amp; clients</h2><form method="GET" action="/search"><input name="q" value="' + esc(q) + '" placeholder="Search\u2026"><button>Search</button></form>';
      if (q) {
        body += '<h3>Results for "' + q + '"</h3><h4>Recipes</h4><ul>';
        for (const r of foundRecipes) body += '<li><a href="/recipes/' + r.id + '">' + esc(r.title) + '</a>' + (r.premium ? ' (premium)' : '') + '</li>';
        body += '</ul><h4>Clients</h4><ul>';
        for (const c of foundClients) body += '<li>' + esc(c.name) + ' — ' + esc(c.email) + '</li>';
        body += '</ul>';
      }
      return send(res, 200, layout(user, 'Search', body + '</div>'));
    }

    /* ---------------- admin & platform ---------------- */
    if (pathname === '/admin' && method === 'GET') {
      bump('Admin & Platform');
      const role = effectiveRole(req, user);
      if (role !== 'admin') return send(res, 403, layout(user, 'Forbidden', '<div class="card"><h2>403 — Admins only</h2></div>'));
      if (user.role !== 'admin') pass('auth-cookie');
      return send(res, 200, layout(user, 'Admin', '<div class="card"><h2>Admin console</h2><p>' + users.length + ' accounts · ' + mealPlans.length + ' meal plans · ' + consultations.length + ' consultations</p><ul><li><a href="/admin/clients">Caseload export</a></li><li><a href="/tests">Mission Board</a></li></ul></div>'));
    }
    if (pathname === '/admin/clients' && method === 'GET') {
      bump('Admin & Platform');
      if (user.role === 'client') pass('admin-bac');
      let rows = '';
      for (const x of users) rows += '<tr><td>' + x.id + '</td><td>' + x.name + '</td><td>' + esc(x.email) + '</td><td>' + esc(x.role) + '</td><td>' + esc(x.plan) + '</td></tr>';
      return send(res, 200, layout(user, 'Caseload', '<div class="card"><h2>Caseload export — all accounts</h2><table><tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th>Plan</th></tr>' + rows + '</table></div>'));
    }
    return send(res, 404, 'Not found');
  } catch (err) {
    try { send(res, 500, 'Server error'); } catch (e) { /* already sent */ }
  }
});

server.listen(PORT, HOST, () => { console.log('LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ' listening on http://' + HOST + ':' + PORT); });
