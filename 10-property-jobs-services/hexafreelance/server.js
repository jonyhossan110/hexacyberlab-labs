'use strict';
/* =====================================================================
   LAB 95 — HexaFreelance
   A deliberately vulnerable freelance marketplace for security training.
   Zero-dependency Node.js. Binds 127.0.0.1 only. LOCAL USE ONLY.
   ===================================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB_NUMBER = 95;
const LAB_NAME = 'HexaFreelance';
const PORT = 3104;
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const LOGO_FILE = path.join(DIR, 'logo.png');

/* --- scattered credential fragments, region A (do not reassemble by hand) --- */

const _fragA2 = ["TC1YSA==","Wi02OQ==","RklaNQ=="];

/* ---------------- progress state ---------------- */
let S = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadState() {
  try {
    const raw = fs.readFileSync(PROGRESS_FILE, 'utf8');
    const j = JSON.parse(raw);
    if (j && typeof j === 'object') S = Object.assign(S, j);
  } catch (e) { /* fresh state */ }
  if (!S.tests) S.tests = {};
  if (!S.attempts) S.attempts = {};
}
function saveState() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(S, null, 2)); } catch (e) { /* ignore */ }
}
function pass(id) {
  if (!S.tests[id]) {
    S.tests[id] = true;
    if (typeof TESTS !== 'undefined' && TESTS.every(t => S.tests[t.id])) {
      if (!S.completedAt) S.completedAt = new Date().toISOString();
      S.keyRevealed = true;
    }
    saveState();
  }
}
function attempt(feature) {
  S.attempts[feature] = (S.attempts[feature] || 0) + 1;
  saveState();
}

/* ---------------- seed data (fake, in-memory) ---------------- */
const users = [
  { id: 1, name: 'Ada Admin',       email: 'admin@hexafreelance.local', password: 'admin123', role: 'admin',      balance: 0 },
  { id: 2, name: 'Carol Client',    email: 'carol@client.local',        password: 'carol123', role: 'client',     balance: 2000 },
  { id: 3, name: 'Dave Client',     email: 'dave@client.local',         password: 'dave123',  role: 'client',     balance: 1500 },
  { id: 4, name: 'Alice Freelance', email: 'alice@free.local',          password: 'alice123', role: 'freelancer', balance: 250 },
  { id: 5, name: 'Bob Freelance',   email: 'bob@free.local',            password: 'bob123',   role: 'freelancer', balance: 120 },
  { id: 6, name: 'Demo Dan',        email: 'demo@hexafreelance.local',   password: 'demo123',  role: 'freelancer', balance: 10 }
];
const jobs = [
  { id: 1, clientId: 2, title: 'Build a landing page for a coffee brand', budget: 800,  visibility: 'public',  invited: [],    desc: 'One-page marketing site with a signup form.' },
  { id: 2, clientId: 3, title: 'Logo and brand kit for a bakery',         budget: 300,  visibility: 'public',  invited: [],    desc: 'Logo, palette and a small brand sheet.' },
  { id: 3, clientId: 2, title: 'CONFIDENTIAL: pre-audit fintech cleanup', budget: 5000, visibility: 'private', invited: [4],   desc: 'Invite-only. Sensitive internal engagement — do not share.' },
  { id: 4, clientId: 3, title: 'Data entry for product catalogue',       budget: 450,  visibility: 'public',  invited: [],    desc: 'Copy 300 products into a spreadsheet template.' }
];
const proposals = [
  { id: 1, jobId: 1, freelancerId: 5, amount: 750, note: 'Bob: I can ship this in 5 days. Private rate note: will accept 700 if paid fast.', status: 'open' },
  { id: 2, jobId: 1, freelancerId: 4, amount: 790, note: 'Alice: portfolio available on request.', status: 'open' },
  { id: 3, jobId: 2, freelancerId: 4, amount: 280, note: 'Alice: two concepts included.', status: 'accepted' }
];
let contracts = [
  { id: 1, jobId: 2, clientId: 3, freelancerId: 4, total: 280, funded: 280, fundRequired: 280, status: 'active',
    milestones: [
      { id: 1, title: 'First concepts', amount: 140, state: 'released' },
      { id: 2, title: 'Final files',    amount: 140, state: 'funded' }
    ] },
  { id: 2, jobId: 1, clientId: 2, freelancerId: 5, total: 750, funded: 0, fundRequired: 750, status: 'awaiting-funds',
    milestones: [
      { id: 1, title: 'Design draft', amount: 375, state: 'pending' },
      { id: 2, title: 'Final build',  amount: 375, state: 'pending' }
    ] }
];
const reviews = [
  { id: 1, contractId: 1, authorId: 4, aboutId: 3, stars: 5, text: 'Dave paid on time, clear brief.' },
  { id: 2, contractId: 1, authorId: 3, aboutId: 4, stars: 5, text: 'Alice delivered early.' }
];
const messages = [
  { id: 1, fromId: 2, toId: 5, text: 'Hi Bob, can you start Monday?' },
  { id: 2, fromId: 5, toId: 2, text: 'Yes — sending the draft Tuesday.' }
];
let nextUserId = 7, nextJobId = 5, nextProposalId = 4, nextContractId = 3, nextReviewId = 3, nextMessageId = 3;
const sessions = {};           // sid -> userId
const loginFails = {};         // email -> consecutive fail count
const probedEmails = new Set();// enumeration tracking
const issuedTokens = new Set();// reset tokens actually issued via /forgot

function userById(id) { return users.find(u => u.id === id); }
function userByEmail(email) { return users.find(u => u.email === String(email || '').toLowerCase()); }

/* ---------------- TESTS registry ---------------- */
const TESTS = [
  /* ----- Login & Authentication ----- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL Injection login bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login form builds its database query by gluing your input straight into a string.', 'Try a quote character in the email field and see how the error/behaviour changes.', "Use the classic tautology in the email field: ' OR '1'='1' -- and any password."],
    lesson: 'String-built queries let an attacker rewrite the login logic itself — no valid password is needed when the query can be bent.',
    impact: 'On a real marketplace this means instant takeover of the highest-privilege account, exposing every client, contract and payment on the platform.',
    report: { title: 'SQL Injection in authentication allows full login bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute force — no rate limiting or lockout', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Pick one real account and keep guessing its password.', 'Count how many failures the server tolerates — does anything slow you down?', 'Fail 10 times in a row for the same account; the server still processes number 10 like number 1.'],
    lesson: 'Without throttling or lockout, password guessing is only a matter of time and wordlist size.',
    impact: 'Attackers can grind through common passwords against client accounts and drain escrow balances once inside.',
    report: { title: 'Missing rate limiting on login enables credential brute force', severity: 'High', remediation: 'Add progressive delays / lockout and alerting after repeated failed logins per account and per IP.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User enumeration via differing responses', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the error message for an email that exists vs one that does not.', 'The forgot-password page answers differently too.', 'Probe at least 5 different emails and watch which ones the server admits are real.'],
    lesson: 'Different error text for "no such account" vs "wrong password" hands attackers a verified list of targets.',
    impact: 'Enumerated emails feed targeted phishing and credential-stuffing against the marketplace\'s clients.',
    report: { title: 'Login and password-reset responses disclose whether an account exists', severity: 'Medium', remediation: 'Return one generic message ("If the account exists…") for all authentication failures.' } },
  { id: 'auth-default-creds', feature: 'Login & Authentication', name: 'Published demo / default credentials', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Read the login page itself very carefully — everything you need is on it.', 'Demo accounts in production are real accounts.', 'Sign in with the demo address printed under the login form.'],
    lesson: 'Demo and default credentials left active in production are an open door, not a convenience.',
    impact: 'Anyone on the internet can walk into a live account and use the platform\'s trusted features as a real user.',
    report: { title: 'Active demo account with publicly documented credentials', severity: 'High', remediation: 'Remove demo/default accounts from production and force unique credentials for every user.' } },
  { id: 'auth-reset-token', feature: 'Login & Authentication', name: 'Predictable password-reset token', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a reset for your own account and study the token format.', 'The token is derived from something you already know about the victim.', 'It is the user id plus simple arithmetic on that id (×137 + 42), formatted HF<id>-<n>.'],
    lesson: 'Reset tokens must be unguessable random values; anything computed from public data can be computed by an attacker too.',
    impact: 'An attacker who knows a victim\'s user id can reset their password and take over the account — and its escrow money.',
    report: { title: 'Password-reset tokens are predictable from the user id', severity: 'High', remediation: 'Generate reset tokens from a CSPRNG (≥128 bits), store hashed, expire quickly, single use.' } },
  { id: 'auth-cookie-tamper', feature: 'Login & Authentication', name: 'Role trusted from a client-side cookie (hx_role)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The app shows your role in the UI — where does it read that role from?', 'Cookies are client-side storage; you can edit them.', 'Set a cookie named hx_role to admin and revisit the admin area.'],
    lesson: 'Authorization decisions must come from server-side session data, never from values the client can edit.',
    impact: 'Any freelancer can promote themselves to admin and moderate, ban or rob other users at will.',
    report: { title: 'Admin authorization trusts the client-controlled hx_role cookie', severity: 'Critical', remediation: 'Derive roles exclusively from the server-side session/user record; ignore role claims from cookies.' } },
  /* ----- Registration & Profile ----- */
  { id: 'reg-weak-password', feature: 'Registration & Profile', name: 'Weak password policy (1 character accepted)', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a new account and try the shortest password the form allows.', 'There is no minimum length check at all.', 'Use a one-character password — it will be accepted.'],
    lesson: 'A password policy is the cheapest control there is; without one, users pick passwords that fall instantly.',
    impact: 'Weak client passwords mean account takeovers, disputed payments and support chaos for the marketplace.',
    report: { title: 'Registration accepts one-character passwords', severity: 'Medium', remediation: 'Enforce a minimum length (≥10) and screen against breached-password lists.' } },
  { id: 'reg-mass-assignment', feature: 'Registration & Profile', name: 'Mass assignment — role & balance set at registration', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration form only shows a few fields — the server may accept more.', 'Add fields the form never offered you.', 'POST role=admin (or a large balance) with your registration request.'],
    lesson: 'Binding request bodies straight onto the data model lets attackers write fields they were never shown.',
    impact: 'Attackers mint admin accounts or credit their own wallet balance out of thin air.',
    report: { title: 'Registration endpoint honours client-supplied role and balance fields', severity: 'Critical', remediation: 'Whitelist bindable fields on registration; assign role and balance server-side only.' } },
  { id: 'reg-stored-xss', feature: 'Registration & Profile', name: 'Stored XSS in display name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is rendered on profiles and listings all over the site.', 'Names are output without encoding.', 'Register with a name like <script>alert(1)</script> and view any page that shows it.'],
    lesson: 'Any user-controlled string rendered unencoded becomes stored XSS that fires in other users\' browsers.',
    impact: 'A poisoned freelancer name can steal session cookies from clients and admins who merely view a proposal.',
    report: { title: 'Stored cross-site scripting via the display-name field', severity: 'High', remediation: 'Context-encode all user output and validate input; add a Content-Security-Policy.' } },
  { id: 'reg-profile-csrf', feature: 'Registration & Profile', name: 'CSRF on profile update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The site\'s own forms carry a hidden hx_marker field — forged requests would not.', 'State-changing forms never verify that marker.', 'POST a profile change without the hx_marker field; it is accepted anyway.'],
    lesson: 'Without anti-CSRF tokens, any website a logged-in user visits can silently rewrite their profile.',
    impact: 'Attackers can change a victim\'s contact email, then reset the password and own the account.',
    report: { title: 'Profile update accepts cross-site requests (no CSRF token verification)', severity: 'Medium', remediation: 'Issue per-session CSRF tokens and verify them on every state-changing request.' } },
  /* ----- Job Posts & Search ----- */
  { id: 'jobs-search-sqli', feature: 'Job Posts & Search', name: 'SQL Injection in job search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Search builds its query from your text exactly like the login form does.', 'A tautology makes the filter match everything.', "Search for ' OR '1'='1 and compare the results with a normal search."],
    lesson: 'Every string-built query is an injection point — search boxes are the most commonly missed ones.',
    impact: 'Injection in search dumps the whole job catalogue, including confidential invite-only engagements.',
    report: { title: 'SQL Injection in job search returns unauthorised records', severity: 'High', remediation: 'Parameterise the search query and enforce visibility filters in the data layer.' } },
  { id: 'jobs-search-xss', feature: 'Job Posts & Search', name: 'Reflected XSS in job search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The results page repeats your search term back to you in the heading.', 'It repeats it without encoding.', 'Search for <script>alert(1)</script> and view the page source.'],
    lesson: 'Reflected input must be encoded on output, even in "harmless" places like headings.',
    impact: 'A crafted search link sent to a client runs script in their session the moment they open it.',
    report: { title: 'Reflected cross-site scripting in the search results heading', severity: 'Medium', remediation: 'HTML-encode reflected values on output; set a restrictive Content-Security-Policy.' } },
  { id: 'job-private-leak', feature: 'Job Posts & Search', name: 'Private (invite-only) job readable by direct URL', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Private jobs are hidden from listings — but do they still have URLs?', 'Job ids are small sequential numbers.', 'Open the private job\'s page directly (try ids above the public ones) while signed in as someone who was not invited.'],
    lesson: 'Hiding a link is not access control; every object needs a server-side authorization check.',
    impact: 'Confidential client engagements — budgets, internal plans — leak to any registered competitor.',
    report: { title: 'Invite-only job posts are accessible to any authenticated user by direct URL (IDOR)', severity: 'High', remediation: 'Check owner/invitee authorization on every object read, not just in listings.' } },
  /* ----- Proposals ----- */
  { id: 'prop-idor', feature: 'Proposals', name: 'Competitor proposal readable (IDOR) — private bid & notes leak', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Proposals have sequential ids and their own pages.', 'Who is supposed to see a proposal? The freelancer and the job owner. Who actually can?', 'Open another freelancer\'s proposal page while signed in as a different freelancer.'],
    lesson: 'Bids are commercially sensitive; object-level authorization is what keeps a marketplace fair.',
    impact: 'Freelancers can read rivals\' exact rates and private notes and undercut every auction.',
    report: { title: 'Proposal pages lack object-level authorization (bid/IDOR)', severity: 'High', remediation: 'Authorize proposal reads to the proposal owner and the job owner only.' } },
  { id: 'prop-edit-idor', feature: 'Proposals', name: "Editing another freelancer's proposal amount", owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The edit form trusts the proposal id in the URL.', 'Ownership is checked on the view page — is it checked on the edit action?', 'POST a new amount to someone else\'s proposal edit endpoint.'],
    lesson: 'Authorization must be enforced on write actions, not just on reads.',
    impact: 'A rival can sabotage bids — inflating a competitor\'s price so their own proposal wins.',
    report: { title: 'Proposal edit endpoint allows modification of other users\' proposals', severity: 'High', remediation: 'Verify proposal ownership server-side on every mutation.' } },
  { id: 'prop-accept-bac', feature: 'Proposals', name: 'Freelancer accepts their own proposal (broken access control)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Accepting a proposal is the client\'s decision — find the accept endpoint.', 'The server checks that you are logged in, not who you are.', 'As a freelancer, POST accept on your OWN proposal and watch a contract appear.'],
    lesson: 'Role checks belong on the server for every privileged action; the UI hiding a button is not a control.',
    impact: 'Freelancers can force-create contracts on their own terms without any client agreeing.',
    report: { title: 'Proposal acceptance does not verify the job-owner role', severity: 'High', remediation: 'Restrict proposal acceptance to the job owner and verify it server-side.' } },
  /* ----- Contracts & Milestones ----- */
  { id: 'contract-idor', feature: 'Contracts & Milestones', name: 'Contract of strangers readable (IDOR)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Contracts live at predictable URLs.', 'Only the two parties should see amounts and milestones.', 'Open a contract between two other users while signed in as an outsider.'],
    lesson: 'Financial agreements are private by default; every read needs a party check.',
    impact: 'Rates, milestones and escrow states of every deal on the platform leak to competitors.',
    report: { title: 'Contract pages accessible to non-parties (IDOR)', severity: 'High', remediation: 'Authorize contract access to its client and freelancer only.' } },
  { id: 'ms-release-bac', feature: 'Contracts & Milestones', name: 'Freelancer releases escrow milestone to themselves', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    hints: ['Releasing a milestone is supposed to be the client\'s approval action.', 'Find the release endpoint on a funded milestone of a contract where YOU are the freelancer.', 'Call release yourself — the escrow pays out to you without the client ever approving.'],
    lesson: 'Money-moving actions need strict role separation: the payee must never be able to approve their own payment.',
    impact: 'Freelancers can empty escrow the moment work is funded, before delivering anything.',
    report: { title: 'Milestone release can be triggered by the payee (missing role check)', severity: 'Critical', remediation: 'Allow milestone release only by the contract\'s client after an explicit approval step.' } },
  { id: 'ms-approve-csrf', feature: 'Contracts & Milestones', name: 'CSRF on milestone approval', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Approving a milestone moves real money — and uses the same marker-free pattern as profiles.', 'The approval POST never verifies hx_marker.', 'POST a milestone approval without the hx_marker field; the state changes anyway.'],
    lesson: 'CSRF on a money action is worse than CSRF on a profile: one malicious page can approve payments.',
    impact: 'A client visiting a booby-trapped page silently approves milestone payments they never reviewed.',
    report: { title: 'Milestone approval lacks CSRF protection', severity: 'High', remediation: 'Require and verify per-session CSRF tokens on all payment-related state changes.' } },
  /* ----- Escrow & Payments ----- */
  { id: 'escrow-fund-tamper', feature: 'Escrow & Payments', name: 'Escrow marked fully funded with a $1 payment', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['Funding a contract asks for an amount — who decides what "fully funded" means?', 'The server trusts the amount you send instead of comparing it to the contract total.', 'Fund an awaiting-funds contract with amount=1 and check its status.'],
    lesson: 'Payment state must be computed server-side from the amount actually received versus the amount owed.',
    impact: 'Clients can activate $5,000 contracts for $1, leaving freelancers working against empty escrow.',
    report: { title: 'Escrow funding trusts the client-supplied amount', severity: 'Critical', remediation: 'Compute funded state server-side from verified payment amounts against the contract total.' } },
  { id: 'escrow-refund-bac', feature: 'Escrow & Payments', name: 'Escrow refund sent to whoever asks (freelancer drains it)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    hints: ['The refund endpoint pays the escrow back — but to whom?', 'It credits the wallet of whoever calls it, and either party can call it.', 'As the freelancer on a funded contract, POST a refund and watch YOUR balance grow.'],
    lesson: 'Refund destinations must be fixed by policy (back to the original payer), never chosen by the caller.',
    impact: 'The payee can "refund" the client\'s escrow straight into their own wallet — outright theft.',
    report: { title: 'Escrow refund credits the caller instead of the original payer', severity: 'Critical', remediation: 'Refunds must return funds only to the original funding account, initiated under strict role rules.' } },
  { id: 'payout-idor', feature: 'Escrow & Payments', name: "Another freelancer's payout & earnings page readable (IDOR)", owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Payout pages are keyed by user id.', 'Your own payout page shows your balance and history — now change the id.', 'Open the payout page of a different freelancer.'],
    lesson: 'Financial privacy needs the same object-level checks as any other private data.',
    impact: 'Earnings of every freelancer leak, enabling targeted scams and unfair poaching.',
    report: { title: 'Payout/earnings pages lack object-level authorization', severity: 'Medium', remediation: 'Restrict payout pages to the owning user (and admins).' } },
  /* ----- Reviews ----- */
  { id: 'review-rating-tamper', feature: 'Reviews', name: 'Out-of-range rating accepted (stars=100)', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['The review form offers 1–5 stars — the server counts whatever you send.', 'Form controls are suggestions, not validation.', 'POST a review with stars=100 and check the stored value / average.'],
    lesson: 'Every client-side range must be re-validated on the server; otherwise averages and rankings are fiction.',
    impact: 'One forged review can rocket a scammer to the top of the marketplace rankings.',
    report: { title: 'Review endpoint accepts out-of-range star values', severity: 'Medium', remediation: 'Validate ratings server-side to the 1–5 range and one review per completed contract.' } },
  { id: 'review-edit-idor', feature: 'Reviews', name: "Editing another user's review", owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Reviews have edit endpoints keyed by id.', 'Authorship is displayed — but is it enforced on edit?', 'POST an edit to a review written by someone else.'],
    lesson: 'Reputation systems collapse when authorship is not enforced on writes.',
    impact: 'Attackers can rewrite negative reviews about themselves or deface competitors\' reputations.',
    report: { title: 'Review edit endpoint does not verify authorship', severity: 'Medium', remediation: 'Check review authorship server-side before applying edits.' } },
  /* ----- Admin & Platform ----- */
  { id: 'admin-bac', feature: 'Admin & Platform', name: 'Admin user list (with passwords) open to any logged-in user', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['There is an admin area linked from nowhere. Its data page is even less protected than the dashboard.', 'The user-list endpoint checks only that you are signed in.', 'Visit /admin/users as a plain freelancer and read every account — passwords included.'],
    lesson: 'Every admin endpoint needs its own role check; "logged in" is not "authorized".',
    impact: 'Full credential dump of every user — instant platform-wide account takeover.',
    report: { title: 'Administrative user listing lacks role-based access control and exposes passwords', severity: 'Critical', remediation: 'Enforce admin role on all admin endpoints and never store or display plaintext passwords.' } },
  { id: 'api-debug', feature: 'Admin & Platform', name: 'Unauthenticated /api/debug dumps the whole database', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Debug endpoints love predictable paths.', 'This one needs no login at all.', 'GET /api/debug and read the platform\'s entire state as JSON.'],
    lesson: 'Debug and diagnostic endpoints must never ship to production — they bypass every other control.',
    impact: 'One unauthenticated request hands an attacker every user, password, contract and balance.',
    report: { title: 'Unauthenticated debug endpoint exposes the full application dataset', severity: 'Critical', remediation: 'Remove debug endpoints from production builds and gate diagnostics behind admin auth.' } }
];
const FEATURES = [...new Set(TESTS.map(t => t.feature))];
function testById(id) { return TESTS.find(t => t.id === id); }
function featureStats() {
  const out = {};
  for (const f of FEATURES) out[f] = { total: 0, done: 0, attempts: S.attempts[f] || 0 };
  for (const t of TESTS) { out[t.feature].total++; if (S.tests[t.id]) out[t.feature].done++; }
  return out;
}
function progress() {
  const done = TESTS.filter(t => S.tests[t.id]).length;
  return { total: TESTS.length, done, pct: Math.floor(done / TESTS.length * 100), complete: done === TESTS.length };
}

/* --- scattered credential fragments, region B --- */

const _fragB2 = ["LTdFNw==","V0o2VA==","Q1FVVQ=="];
function _assemble(a, b) {
  return a.concat(b).map(s => [...Buffer.from(s, 'base64').toString('utf8')].reverse().join('')).join('');
}
const ENTRY_KEY_SHA256 = 'f9d6f610e55e2f9f7a29f5742936d0d94405a42865576786fa76f6a1b1682a91';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */
function completionKey() { return _assemble(_fragA2, _fragB2); }
function keyEq(given, real) {
  const g = Buffer.from(String(given || '')), r = Buffer.from(real);
  if (g.length !== r.length) { crypto.timingSafeEqual(r, r); return false; }
  return crypto.timingSafeEqual(g, r);
}

/* ---------------- http helpers ---------------- */
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
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(''));
  });
}
function bodyParams(req, raw) {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('application/json')) { try { return JSON.parse(raw || '{}'); } catch (e) { return {}; } }
  const out = {};
  for (const pair of String(raw || '').split('&')) {
    if (!pair) continue;
    const i = pair.indexOf('=');
    const k = decodeURIComponent((i < 0 ? pair : pair.slice(0, i)).replace(/\+/g, ' '));
    const v = decodeURIComponent((i < 0 ? '' : pair.slice(i + 1)).replace(/\+/g, ' '));
    out[k] = v;
  }
  return out;
}
const XSS_RE = /<script|onerror\s*=|onload\s*=|<svg|<img[^>]*onerror|<iframe/i;
function hasXss(s) { return XSS_RE.test(String(s || '')); }

/* ---------------- layout ---------------- */
function layout(user, title, bodyHtml) {
  const p = progress();
  const roleCookieNote = user ? ` · signed in as ${esc(user.name)} (${esc(user.role)})` : '';
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} — ${LAB_NAME}</title>
<style>body{font-family:system-ui,Arial,sans-serif;margin:0;background:#f6f7f9;color:#1c2333}
header{background:#101828;color:#fff;padding:10px 18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
header img{height:34px}header .lab{font-weight:700;letter-spacing:.4px}
.bar{flex:1;min-width:180px;background:#2a364d;border-radius:6px;height:16px;position:relative}
.bar>i{position:absolute;inset:0;width:${p.pct}%;background:#4caf7d;border-radius:6px}
.bar span{position:relative;font-size:11px;line-height:16px;padding-left:8px;color:#fff}
nav{background:#1b2740;padding:6px 18px}nav a{color:#cfe0ff;margin-right:14px;text-decoration:none;font-size:14px}
main{max-width:980px;margin:22px auto;padding:0 16px} .card{background:#fff;border:1px solid #dde3ec;border-radius:10px;padding:16px 18px;margin:12px 0}
input,select,textarea{padding:7px 9px;border:1px solid #b9c3d4;border-radius:6px;margin:3px 0;width:100%;box-sizing:border-box}
button{background:#2050c8;color:#fff;border:0;border-radius:6px;padding:8px 14px;cursor:pointer}
table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #e4e9f2;padding:6px 8px;text-align:left;font-size:14px}
.tag{font-size:11px;background:#e8eefc;border-radius:4px;padding:2px 6px}.done{color:#1d7a4f}.open{color:#a35b00}
#chat{position:fixed;right:14px;bottom:14px;width:320px;background:#fff;border:1px solid #c9d3e4;border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.18);font-size:13px}
#chat h4{margin:0;padding:9px 12px;background:#101828;color:#fff;border-radius:10px 10px 0 0}
#chatlog{height:170px;overflow:auto;padding:9px 12px;white-space:pre-wrap}
#chat form{display:flex;border-top:1px solid #e4e9f2}#chat input{flex:1;border:0;margin:0}#chat button{border-radius:0}
.cert{border:3px double #2050c8;text-align:center;padding:34px}
@media print{#chat,nav{display:none}}
</style></head><body>
<header><img src="/logo.png" alt="HexaCyberLab"><span class="lab">LAB ${LAB_NUMBER} — ${LAB_NAME}</span>
<div class="bar"><i></i><span>LAB ${LAB_NUMBER} · ${p.done}/${p.total} tests · ${p.pct}%</span></div><span style="font-size:12px">${roleCookieNote}</span></header>
<nav><a href="/">Home</a><a href="/jobs">Jobs</a><a href="/proposals">Proposals</a><a href="/contracts">Contracts</a><a href="/messages">Messages</a><a href="/tests">Mission Board</a><a href="/complete">Completion</a>${user ? '<a href="/logout">Log out</a>' : '<a href="/login">Log in</a>'}</nav>
<main>${bodyHtml}</main>
<div id="chat"><h4>Lab Coach — HexaFreelance</h4><div id="chatlog">Hi! I am the Lab Coach for LAB ${LAB_NUMBER} — ${LAB_NAME}. Ask me what this lab covers, ask about a feature, or ask who built this.</div>
<form id="chatform"><input id="chatmsg" placeholder="Ask the Lab Coach…" autocomplete="off"><button>Send</button></form></div>
<script>
document.getElementById('chatform').addEventListener('submit', async e => {
  e.preventDefault();
  const inp = document.getElementById('chatmsg'); const log = document.getElementById('chatlog');
  const msg = inp.value.trim(); if (!msg) return; inp.value = '';
  log.textContent += '\\n\\nYou: ' + msg;
  try { const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg }) });
    const j = await r.json(); log.textContent += '\\n\\nCoach: ' + j.reply; }
  catch (err) { log.textContent += '\\n\\nCoach: (connection hiccup — try again)'; }
  log.scrollTop = log.scrollHeight;
});
function revealHint(id, n) { var el = document.getElementById(id + '-' + n); if (el) el.style.display = 'block'; var b = document.getElementById(id + '-b' + n); if (b) b.style.display = 'none'; var nx = document.getElementById(id + '-b' + (n + 1)); if (nx) nx.style.display = 'inline'; }
</script></body></html>`;
}
function gatePage() {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Locked — LAB ${LAB_NUMBER}</title>
<style>body{font-family:system-ui,Arial,sans-serif;background:#101828;color:#eef2ff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.box{background:#1b2740;padding:30px 34px;border-radius:12px;max-width:460px;text-align:center}
input{padding:9px;width:100%;box-sizing:border-box;border-radius:6px;border:1px solid #445}button{background:#2050c8;color:#fff;border:0;border-radius:6px;padding:9px 16px;margin-top:10px;cursor:pointer}</style></head>
<body><div class="box"><img src="/logo.png" style="height:54px"><h2>LAB ${LAB_NUMBER} — ${LAB_NAME}</h2>
<p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
<form method="POST" action="/unlock"><input name="key" placeholder="Completion key from Lab ${LAB_NUMBER - 1}" autocomplete="off"><br><button>Unlock Lab ${LAB_NUMBER}</button></form>
</div></body></html>`;
}

/* ---------------- pages ---------------- */
function loginPage(msg) {
  return layout(null, 'Log in', `<div class="card"><h2>Log in to ${LAB_NAME}</h2>
${msg ? `<p style="color:#b00">${esc(msg)}</p>` : ''}
<form method="POST" action="/login"><label>Email</label><input name="email" type="text">
<label>Password</label><input name="password" type="password"><button>Log in</button></form>
<p style="font-size:13px">New here? <a href="/register">Create an account</a> · <a href="/forgot">Forgot password</a></p>
<p style="font-size:13px;background:#fff8e1;padding:8px;border-radius:6px">Just evaluating? Use our public demo account — <b>demo@hexafreelance.local</b> / <b>demo123</b></p></div>`);
}
function registerPage(msg) {
  return layout(null, 'Register', `<div class="card"><h2>Create your ${LAB_NAME} account</h2>
${msg ? `<p style="color:#b00">${esc(msg)}</p>` : ''}
<form method="POST" action="/register"><label>Display name</label><input name="name">
<label>Email</label><input name="email"><label>Password</label><input name="password" type="password">
<label>I am a</label><select name="kind"><option value="freelancer">Freelancer</option><option value="client">Client</option></select>
<button>Register</button></form></div>`);
}
function homePage(user) {
  const rows = jobs.filter(j => j.visibility === 'public').map(j =>
    `<tr><td><a href="/jobs/${j.id}">${esc(j.title)}</a></td><td>$${j.budget}</td><td>${esc(userById(j.clientId).name)}</td></tr>`).join('');
  return layout(user, 'Home', `<div class="card"><h2>Welcome to ${LAB_NAME}</h2>
<p>The marketplace where clients hire freelancers — contracts, milestones and escrow included.</p>
<p>Your wallet balance: <b>$${user.balance}</b> · Your payout page: <a href="/payouts/${user.id}">/payouts/${user.id}</a></p></div>
<div class="card"><h3>Open jobs</h3><table><tr><th>Job</th><th>Budget</th><th>Client</th></tr>${rows}</table></div>`);
}
function jobsPage(user, q, results) {
  const list = (results || jobs.filter(j => j.visibility === 'public')).map(j =>
    `<tr><td><a href="/jobs/${j.id}">${esc(j.title)}</a></td><td>$${j.budget}</td><td>${esc(j.visibility)}</td></tr>`).join('');
  return layout(user, 'Jobs', `<div class="card"><h2>Search jobs</h2>
<form method="GET" action="/jobs"><input name="q" value="${q != null ? q : ''}" placeholder="Search titles…"><button>Search</button></form>
${q != null ? `<p>Results for: ${q}</p>` : ''}
<table><tr><th>Job</th><th>Budget</th><th>Visibility</th></tr>${list}</table></div>
<div class="card"><h3>Post a job (clients)</h3>
<form method="POST" action="/jobs"><input type="hidden" name="hx_marker" value="site">
<label>Title</label><input name="title"><label>Budget ($)</label><input name="budget">
<label>Visibility</label><select name="visibility"><option value="public">public</option><option value="private">private (invite-only)</option></select>
<label>Description</label><textarea name="desc"></textarea><button>Post job</button></form></div>`);
}
function jobDetailPage(user, job) {
  const props = proposals.filter(p => p.jobId === job.id).map(p =>
    `<tr><td><a href="/proposals/${p.id}">Proposal #${p.id}</a></td><td>${esc(userById(p.freelancerId).name)}</td><td>$${p.amount}</td><td>${esc(p.status)}</td></tr>`).join('');
  return layout(user, 'Job', `<div class="card"><h2>${esc(job.title)}</h2>
<p>Budget: <b>$${job.budget}</b> · Client: ${esc(userById(job.clientId).name)} · Visibility: ${esc(job.visibility)}</p>
<p>${esc(job.desc)}</p></div>
<div class="card"><h3>Proposals</h3><table><tr><th></th><th>Freelancer</th><th>Bid</th><th>Status</th></tr>${props || '<tr><td colspan="4">None yet</td></tr>'}</table></div>
<div class="card"><h3>Submit a proposal</h3><form method="POST" action="/jobs/${job.id}/proposals">
<input type="hidden" name="hx_marker" value="site"><label>Your bid ($)</label><input name="amount">
<label>Cover note</label><textarea name="note"></textarea><button>Send proposal</button></form></div>`);
}
function proposalsPage(user) {
  const rows = proposals.map(p =>
    `<tr><td><a href="/proposals/${p.id}">#${p.id}</a></td><td>${esc((jobs.find(j => j.id === p.jobId) || {}).title || '')}</td><td>${esc(userById(p.freelancerId).name)}</td><td>$${p.amount}</td><td>${esc(p.status)}</td></tr>`).join('');
  return layout(user, 'Proposals', `<div class="card"><h2>All proposals</h2><table><tr><th></th><th>Job</th><th>Freelancer</th><th>Bid</th><th>Status</th></tr>${rows}</table></div>`);
}
function proposalPage(user, p) {
  const job = jobs.find(j => j.id === p.jobId);
  return layout(user, 'Proposal', `<div class="card"><h2>Proposal #${p.id}</h2>
<p>Job: ${esc(job ? job.title : '')} · Freelancer: ${esc(userById(p.freelancerId).name)} · Bid: <b>$${p.amount}</b> · Status: ${esc(p.status)}</p>
<p><i>Cover note (private):</i> ${esc(p.note)}</p>
<h3>Edit bid</h3><form method="POST" action="/proposals/${p.id}/edit"><input type="hidden" name="hx_marker" value="site">
<label>Amount</label><input name="amount" value="${p.amount}"><button>Save</button></form>
<h3>Accept this proposal</h3><form method="POST" action="/proposals/${p.id}/accept"><input type="hidden" name="hx_marker" value="site">
<button>Create contract</button></form></div>`);
}
function contractsPage(user) {
  const rows = contracts.map(c =>
    `<tr><td><a href="/contracts/${c.id}">Contract #${c.id}</a></td><td>${esc(userById(c.clientId).name)}</td><td>${esc(userById(c.freelancerId).name)}</td><td>$${c.total}</td><td>funded $${c.funded}</td><td>${esc(c.status)}</td></tr>`).join('');
  return layout(user, 'Contracts', `<div class="card"><h2>Contracts</h2><table><tr><th></th><th>Client</th><th>Freelancer</th><th>Total</th><th>Escrow</th><th>Status</th></tr>${rows}</table></div>`);
}
function contractPage(user, c) {
  const ms = c.milestones.map(m =>
    `<tr><td>${esc(m.title)}</td><td>$${m.amount}</td><td>${esc(m.state)}</td>
<td><form method="POST" action="/contracts/${c.id}/milestones/${m.id}/approve" style="display:inline"><input type="hidden" name="hx_marker" value="site"><button>Client: approve</button></form>
<form method="POST" action="/contracts/${c.id}/milestones/${m.id}/release" style="display:inline"><input type="hidden" name="hx_marker" value="site"><button>Release escrow</button></form></td></tr>`).join('');
  const revs = reviews.filter(r => r.contractId === c.id).map(r =>
    `<p>★${r.stars} — ${esc(r.text)} <span class="tag">by ${esc(userById(r.authorId).name)}</span> <a href="/reviews/${r.id}/edit">edit</a></p>`).join('');
  return layout(user, 'Contract', `<div class="card"><h2>Contract #${c.id}</h2>
<p>Client: ${esc(userById(c.clientId).name)} · Freelancer: ${esc(userById(c.freelancerId).name)} · Total: <b>$${c.total}</b> · Escrow funded: <b>$${c.funded}</b> / $${c.fundRequired} · Status: ${esc(c.status)}</p>
<h3>Fund escrow</h3><form method="POST" action="/contracts/${c.id}/fund"><input type="hidden" name="hx_marker" value="site">
<label>Amount</label><input name="amount"><button>Fund</button></form>
<form method="POST" action="/contracts/${c.id}/refund"><input type="hidden" name="hx_marker" value="site"><button>Refund escrow</button></form></div>
<div class="card"><h3>Milestones</h3><table><tr><th>Title</th><th>Amount</th><th>State</th><th>Actions</th></tr>${ms}</table></div>
<div class="card"><h3>Reviews</h3>${revs || '<p>No reviews yet.</p>'}
<h4>Leave a review</h4><form method="POST" action="/contracts/${c.id}/review"><input type="hidden" name="hx_marker" value="site">
<label>Stars (1–5)</label><input name="stars" value="5"><label>Text</label><input name="text"><button>Post review</button></form></div>`);
}
function reviewEditPage(user, r) {
  return layout(user, 'Edit review', `<div class="card"><h2>Edit review #${r.id}</h2>
<form method="POST" action="/reviews/${r.id}/edit"><input type="hidden" name="hx_marker" value="site">
<label>Stars</label><input name="stars" value="${r.stars}"><label>Text</label><input name="text" value="${esc(r.text)}">
<button>Save review</button></form></div>`);
}
function profilePage(user, msg) {
  return layout(user, 'Profile', `<div class="card"><h2>Your profile</h2>
${msg ? `<p>${esc(msg)}</p>` : ''}
<p>Name: <b>${user.name}</b> · Email: ${esc(user.email)} · Role: ${esc(user.role)} · Balance: $${user.balance}</p>
<form method="POST" action="/profile"><input type="hidden" name="hx_marker" value="site">
<label>Display name</label><input name="name" value="${esc(user.name)}">
<label>Email</label><input name="email" value="${esc(user.email)}"><button>Update profile</button></form></div>`);
}
function payoutsPage(user, target) {
  return layout(user, 'Payouts', `<div class="card"><h2>Payouts — ${esc(target.name)}</h2>
<p>Role: ${esc(target.role)} · Wallet balance: <b>$${target.balance}</b></p>
<p>Earnings history and payout settings for this account are shown here.</p></div>`);
}
function messagesPage(user) {
  const mine = messages.filter(m => m.fromId === user.id || m.toId === user.id).map(m =>
    `<p><b>${esc(userById(m.fromId).name)}</b> → ${esc(userById(m.toId).name)}: ${esc(m.text)}</p>`).join('');
  return layout(user, 'Messages', `<div class="card"><h2>Your messages</h2>${mine || '<p>No messages.</p>'}
<form method="POST" action="/messages"><input type="hidden" name="hx_marker" value="site">
<label>To (user id)</label><input name="to"><label>Message</label><input name="text"><button>Send</button></form></div>`);
}
function adminPage(user) {
  return layout(user, 'Admin', `<div class="card"><h2>Admin dashboard</h2>
<p>Platform moderation console.</p><p><a href="/admin/users">User list</a></p></div>`);
}
function adminUsersPage(user) {
  const rows = users.map(u => `<tr><td>${u.id}</td><td>${u.name}</td><td>${esc(u.email)}</td><td>${esc(u.password)}</td><td>${esc(u.role)}</td><td>$${u.balance}</td></tr>`).join('');
  return layout(user, 'Admin users', `<div class="card"><h2>All users</h2><table><tr><th>id</th><th>Name</th><th>Email</th><th>Password</th><th>Role</th><th>Balance</th></tr>${rows}</table></div>`);
}
function testsPage(user) {
  const st = featureStats();
  let html = `<div class="card"><h2>Mission Board — LAB ${LAB_NUMBER} ${LAB_NAME}</h2><p>${progress().done}/${progress().total} tests complete · ${progress().pct}%</p></div>`;
  for (const f of FEATURES) {
    html += `<div class="card"><h3>${esc(f)} <span class="tag">${st[f].done}/${st[f].total} done · ${st[f].attempts} attempt(s) on this feature</span></h3>`;
    for (const t of TESTS.filter(x => x.feature === f)) {
      const done = !!S.tests[t.id];
      const hid = 'h' + t.id.replace(/[^a-z0-9]/gi, '');
      html += `<div style="border-top:1px solid #e4e9f2;padding:8px 0"><b class="${done ? 'done' : 'open'}">${done ? '✓' : '○'} ${esc(t.name)}</b>
 <span class="tag">${esc(t.owasp)}</span> <span class="tag">${esc(t.difficulty)}</span><br>
<span id="${hid}-1" style="display:none">Hint 1: ${esc(t.hints[0])}</span>
<span id="${hid}-2" style="display:none">Hint 2: ${esc(t.hints[1])}</span>
<span id="${hid}-3" style="display:none">Hint 3: ${esc(t.hints[2])}</span>
<button type="button" id="${hid}-b1" onclick="revealHint('${hid}',1)">Hint 1</button>
<button type="button" id="${hid}-b2" style="display:none" onclick="revealHint('${hid}',2)">Hint 2</button>
<button type="button" id="${hid}-b3" style="display:none" onclick="revealHint('${hid}',3)">Hint 3</button></div>`;
    }
    html += `</div>`;
  }
  return layout(user, 'Mission Board', html);
}
function completePage(user) { if (!user) user = { name: 'Tester', email: '', id: 0 };
  const p = progress();
  if (!p.complete) {
    const left = TESTS.filter(t => !S.tests[t.id]).map(t => `<li>${esc(t.name)} <span class="tag">${esc(t.feature)}</span></li>`).join('');
    return layout(user, 'Completion', `<div class="card"><h2>Not complete yet</h2>
<p>Progress: ${p.done}/${p.total} tests · ${p.pct}%</p><p>Still open:</p><ul>${left}</ul></div>`);
  }
  const st = featureStats();
  const perFeature = FEATURES.map(f => `<tr><td>${esc(f)}</td><td>${st[f].total}</td></tr>`).join('');
  const techniques = TESTS.map(t => `<li>${esc(t.name)}</li>`).join('');
  const lessons = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('');
  const impacts = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('');
  const reports = TESTS.map(t => `<li><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)} — Remediation: ${esc(t.report.remediation)}</li>`).join('');
  return layout(user, 'Completion', `<div class="card"><h2>Lab ${LAB_NUMBER} — ${LAB_NAME}: 100% complete</h2>
<h3>1) Total features in this lab</h3><p>${FEATURES.length} features</p>
<h3>2) Vulnerability count per feature</h3><table><tr><th>Feature</th><th>Tests</th></tr>${perFeature}</table>
<h3>3) Ways testing was done (${p.total} techniques)</h3><ol>${techniques}</ol>
<h3>4) What you learned</h3><ul>${lessons}</ul>
<h3>5) What this means for a real client</h3><ul>${impacts}</ul>
<h3>6) Writing it in a real report</h3><ul>${reports}</ul>
<h3>Your completion key</h3>
<p>Lab ${LAB_NUMBER} completion key: <b>${completionKey()}</b></p>
<p>Paste it into Lab ${LAB_NUMBER + 1} to unlock the next lab.</p>
<form method="POST" action="/complete/name"><label>Your name for the certificate</label>
<input name="testerName" value="${esc(S.testerName || (user ? user.name : ''))}"><button>Save name</button></form>
<p><a href="/certificate">View your certificate</a></p></div>`);
}
function certificatePage(user) { if (!user) user = { name: 'Tester', email: '', id: 0 };
  const p = progress();
  if (!p.complete) return layout(user, 'Certificate', `<div class="card"><h2>Certificate locked</h2><p>Finish 100% of the tests first (${p.pct}% so far).</p></div>`);
  const name = S.testerName || (user ? user.name : 'Tester');
  const date = S.completedAt ? new Date(S.completedAt).toDateString() : new Date().toDateString();
  return layout(user, 'Certificate', `<div class="card cert"><img src="/logo.png" style="height:64px">
<h1>Certificate of Completion</h1><p>This certifies that</p><h2>${esc(name)}</h2>
<p>has completed 100% of the security tests in LAB ${LAB_NUMBER} — ${LAB_NAME} (${p.total} tests across ${FEATURES.length} features)</p>
<p>Completed on ${esc(date)}</p><p><b>HexaCyberLab — Built by Md. Jony Hassain, Founder</b></p></div>`);
}

/* ---------------- Lab Coach (chatbot) ---------------- */
function coachReply(rawMsg) {
  const msg = String(rawMsg || '');
  const m = msg.toLowerCase();
  const p = progress();
  if (/(who (built|made|created)|founder|your (creator|author)|who is behind)/.test(m)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (/(completion key|the key|next lab|unlock (the )?next|give me the key)/.test(m)) {
    if (p.complete && S.keyRevealed) return 'You completed LAB ' + LAB_NUMBER + ' — here is your completion key: ' + completionKey() + ' — paste it into Lab ' + (LAB_NUMBER + 1) + ' to unlock it.';
    return 'I do not have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at ' + p.pct + '% (' + p.done + '/' + p.total + ' tests). Finish every test on the Mission Board (/tests) and the key will be revealed on the completion page — and to me.';
  }
  // feature-specific questions
  let feature = null;
  for (const f of FEATURES) { if (m.includes(f.toLowerCase())) { feature = f; break; } }
  if (!feature) {
    if (/login|auth|password|sign.?in|brute|reset|enumerat/.test(m)) feature = 'Login & Authentication';
    else if (/register|registration|profile|sign.?up/.test(m)) feature = 'Registration & Profile';
    else if (/job|search/.test(m)) feature = 'Job Posts & Search';
    else if (/proposal|bid/.test(m)) feature = 'Proposals';
    else if (/contract|milestone/.test(m)) feature = 'Contracts & Milestones';
    else if (/escrow|payment|payout|refund|fund/.test(m)) feature = 'Escrow & Payments';
    else if (/review|rating|stars/.test(m)) feature = 'Reviews';
    else if (/admin|debug|api/.test(m)) feature = 'Admin & Platform';
  }
  if (feature) {
    const list = TESTS.filter(t => t.feature === feature);
    const names = list.map(t => (S.tests[t.id] ? '✓ ' : '○ ') + t.name).join('; ');
    const wantsHow = /(how|help|solve|do|exploit|bypass|attack|guide|step)/.test(m);
    if (wantsHow) {
      const att = S.attempts[feature] || 0;
      const open = list.filter(t => !S.tests[t.id]);
      if (att >= 3 || open.length === 0) {
        if (open.length === 0) return 'You have already completed every test in ' + feature + '. Nicely done — pick another feature from the Mission Board.';
        const t = open[0];
        return 'Step by step for "' + t.name + '" (' + feature + '):\n1) ' + t.hints[0] + '\n2) ' + t.hints[1] + '\n3) ' + t.hints[2] + '\nWork through it on the live pages, then check the Mission Board (/tests) — the test flips to ✓ the moment the exploit really succeeds.';
      }
      return 'That feature is locked for help. First try the ' + feature + ' tests yourself at least 3 times — I can see you\'ve tried ' + att + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
    }
    return feature + ' has ' + list.length + ' tests: ' + names + '. Ask me "how do I solve the ' + feature + ' tests" once you have tried them a few times yourself.';
  }
  if (/(how many|features|cover|tests|what.*(lab|here|do)|progress|status|next|start|help|hi|hello)/.test(m)) {
    const next = TESTS.find(t => !S.tests[t.id]);
    return 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + TESTS.length + ' tests across ' + FEATURES.length + ' features: ' + FEATURES.join(', ') + '. Your progress: ' + p.done + '/' + p.total + ' (' + p.pct + '%).' + (next ? ' Next open test: "' + next.name + '" in ' + next.feature + '.' : ' Everything is done — see /complete for your key and certificate.') + ' The Mission Board (/tests) shows every test with graded hints.';
  }
  return 'I can explain what this lab covers, list a feature\'s tests, or — after you have tried a feature at least 3 times — guide you step by step. Try asking "what does the Escrow & Payments feature cover?" or "who built this?". The full map is on the Mission Board (/tests).';
}

/* ---------------- router ---------------- */
loadState();
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://127.0.0.1');
    const pathname = u.pathname;
    const cookies = parseCookies(req);
    const send = (code, html, type) => { res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' }); res.end(html); };
    const sendJson = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    const redirect = (loc, extra) => { res.writeHead(302, Object.assign({ Location: loc }, extra || {})); res.end(); };

    if (pathname === '/logo.png') {
      try { const buf = fs.readFileSync(LOGO_FILE); res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(buf); }
      catch (e) { send(404, 'no logo'); }
      return;
    }

    /* gate: everything except unlock/gate/logo/chat/progress stays locked */
    if (!S.unlocked) {
      if (pathname === '/unlock' && req.method === 'POST') {
        const params = bodyParams(req, await readBody(req));
        if (entryKeyMatches(params.key)) {
          S.unlocked = true; saveState(); redirect('/');
        } else { res.writeHead(403, { 'Content-Type': 'text/html' }); res.end(gatePage()); }
        return;
      }
      if (pathname === '/api/progress') { sendJson(200, { lab: LAB_NAME, number: LAB_NUMBER, total: progress().total, done: 0, pct: 0, features: featureStats(), complete: false }); return; }
      if (pathname === '/api/chat' && req.method === 'POST') {
        const params = bodyParams(req, await readBody(req));
        sendJson(200, { reply: coachReply(params.message) }); return;
      }
      send(200, gatePage()); return;
    }

    /* session */
    const sid = cookies.hx_session;
    let user = sid && sessions[sid] ? userById(sessions[sid]) : null;
    const requireLogin = () => { if (!user && pathname !== '/complete' && pathname !== '/complete/name' && pathname !== '/certificate') { redirect('/login'); return true; } return false; };
    const markerOk = params => params && params.hx_marker === 'site';

    /* public-ish endpoints */
    if (pathname === '/api/progress') {
      const p = progress();
      sendJson(200, { lab: LAB_NAME, number: LAB_NUMBER, total: p.total, done: p.done, pct: p.pct, features: featureStats(), complete: p.complete });
      return;
    }
    if (pathname === '/api/chat' && req.method === 'POST') {
      const params = bodyParams(req, await readBody(req));
      sendJson(200, { reply: coachReply(params.message) }); return;
    }
    if (pathname === '/api/debug') {
      attempt('Admin & Platform'); pass('api-debug');
      sendJson(200, { users, jobs, proposals, contracts, reviews, messages });
      return;
    }
    if (pathname === '/logout') {
      if (sid) delete sessions[sid];
      redirect('/login', { 'Set-Cookie': 'hx_session=; Path=/; Max-Age=0' }); return;
    }

    /* ---------- auth routes ---------- */
    if (pathname === '/login' && req.method === 'GET') { send(200, loginPage(u.searchParams.get('e') === '1' ? 'Invalid email or password.' : '')); return; }
    if (pathname === '/login' && req.method === 'POST') {
      const params = bodyParams(req, await readBody(req));
      const email = String(params.email || '').toLowerCase();
      const password = String(params.password || '');
      attempt('Login & Authentication');
      probedEmails.add(email);
      if (probedEmails.size >= 5) {
        const anyExists = [...probedEmails].some(e => userByEmail(e));
        const anyMissing = [...probedEmails].some(e => !userByEmail(e));
        if (anyExists && anyMissing) pass('auth-enum');
      }
      // vulnerable string-built query simulation
      const query = "SELECT * FROM users WHERE email = '" + email + "' AND password = '" + password + "'";
      const inj = /'\s*or\s*'?\d+'?\s*=\s*'?\d+|'\s*or\s*1\s*=\s*1|--\s*$|'\s*--/i;
      let found = null, viaSqli = false;
      if (inj.test(email) || inj.test(password)) {
        const target = userByEmail(email) || users[0];
        found = target; viaSqli = true;
      } else {
        const cand = userByEmail(email);
        if (cand && cand.password === password) found = cand;
      }
      if (found) {
        const newsid = crypto.randomBytes(12).toString('hex');
        sessions[newsid] = found.id;
        if (viaSqli) pass('auth-sqli');
        if (found.email === 'demo@hexafreelance.local') pass('auth-default-creds');
        redirect('/', { 'Set-Cookie': ['hx_session=' + newsid + '; Path=/; HttpOnly', 'hx_origin=site; Path=/'] });
      } else {
        loginFails[email] = (loginFails[email] || 0) + 1;
        if (loginFails[email] >= 10) pass('auth-brute');
        redirect('/login?e=1');
      }
      return;
    }
    if (pathname === '/register' && req.method === 'GET') { send(200, registerPage('')); return; }
    if (pathname === '/register' && req.method === 'POST') {
      const params = bodyParams(req, await readBody(req));
      attempt('Registration & Profile');
      const nu = {
        id: nextUserId++,
        name: String(params.name || 'New User'),
        email: String(params.email || '').toLowerCase(),
        password: String(params.password || ''),
        role: params.role ? String(params.role) : (params.kind === 'client' ? 'client' : 'freelancer'),
        balance: params.balance != null && params.balance !== '' ? Number(params.balance) || 0 : 0
      };
      if (nu.password.length <= 1) pass('reg-weak-password');
      if (nu.role === 'admin' || nu.balance > 0) pass('reg-mass-assignment');
      if (hasXss(nu.name)) pass('reg-stored-xss');
      users.push(nu);
      const newsid = crypto.randomBytes(12).toString('hex');
      sessions[newsid] = nu.id;
      redirect('/', { 'Set-Cookie': ['hx_session=' + newsid + '; Path=/; HttpOnly', 'hx_origin=site; Path=/'] });
      return;
    }
    if (pathname === '/forgot' && req.method === 'GET') {
      send(200, layout(null, 'Forgot', `<div class="card"><h2>Forgot password</h2>
<form method="POST" action="/forgot"><label>Email</label><input name="email"><button>Send reset link</button></form></div>`)); return;
    }
    if (pathname === '/forgot' && req.method === 'POST') {
      const params = bodyParams(req, await readBody(req));
      const email = String(params.email || '').toLowerCase();
      attempt('Login & Authentication');
      probedEmails.add(email);
      const target = userByEmail(email);
      if (target) {
        issuedTokens.add('HF' + target.id + '-' + (target.id * 137 + 42));
        send(200, layout(null, 'Forgot', `<div class="card"><h2>Check your inbox</h2><p>A reset link was sent to ${esc(email)} (simulated — in this local lab, open <a href="/reset">/reset</a> and use the token from the email).</p></div>`));
      } else {
        send(200, layout(null, 'Forgot', `<div class="card"><h2>No account found</h2><p>There is no account with the email ${esc(email)}.</p></div>`));
      }
      return;
    }
    if (pathname === '/reset' && req.method === 'GET') {
      send(200, layout(null, 'Reset', `<div class="card"><h2>Reset password</h2>
<form method="POST" action="/reset"><label>Email</label><input name="email"><label>Reset token</label><input name="token">
<label>New password</label><input name="password" type="password"><button>Reset</button></form></div>`)); return;
    }
    if (pathname === '/reset' && req.method === 'POST') {
      const params = bodyParams(req, await readBody(req));
      attempt('Login & Authentication');
      const target = userByEmail(String(params.email || '').toLowerCase());
      const token = String(params.token || '');
      if (target && token === 'HF' + target.id + '-' + (target.id * 137 + 42)) {
        target.password = String(params.password || 'x');
        if (!issuedTokens.has(token)) pass('auth-reset-token');
        send(200, layout(null, 'Reset', `<div class="card"><h2>Password updated</h2><p>You can now <a href="/login">log in</a>.</p></div>`));
      } else {
        send(200, layout(null, 'Reset', `<div class="card"><h2>Invalid token</h2><p>That reset token is not valid.</p></div>`));
      }
      return;
    }

    /* ---------- app pages ---------- */
    if (pathname === '/') { if (requireLogin()) return; send(200, homePage(user)); return; }
    if (pathname === '/profile' && req.method === 'GET') { if (requireLogin()) return; send(200, profilePage(user, '')); return; }
    if (pathname === '/profile' && req.method === 'POST') {
      if (requireLogin()) return;
      const params = bodyParams(req, await readBody(req));
      attempt('Registration & Profile');
      if (!markerOk(params)) pass('reg-profile-csrf');
      if (params.name) { user.name = String(params.name); if (hasXss(user.name)) pass('reg-stored-xss'); }
      if (params.email) user.email = String(params.email).toLowerCase();
      send(200, profilePage(user, 'Profile updated.'));
      return;
    }
    if (pathname === '/tests') { if (requireLogin()) return; send(200, testsPage(user)); return; }

    /* jobs + search */
    if (pathname === '/jobs' && req.method === 'GET') {
      if (requireLogin()) return;
      const q = u.searchParams.get('q');
      if (q != null) {
        attempt('Job Posts & Search');
        let results;
        if (/'\s*or\s*'?\d+'?\s*=\s*'?\d+/i.test(q) || /'\s*or\s*1\s*=\s*1/i.test(q)) {
          results = jobs.slice(); pass('jobs-search-sqli');
        } else {
          results = jobs.filter(j => j.visibility === 'public' && j.title.toLowerCase().includes(q.toLowerCase()));
        }
        if (hasXss(q)) pass('jobs-search-xss');
        send(200, jobsPage(user, q, results));
      } else send(200, jobsPage(user, null, null));
      return;
    }
    if (pathname === '/jobs' && req.method === 'POST') {
      if (requireLogin()) return;
      const params = bodyParams(req, await readBody(req));
      attempt('Job Posts & Search');
      jobs.push({ id: nextJobId++, clientId: user.id, title: String(params.title || 'Untitled job'), budget: Number(params.budget) || 0, visibility: params.visibility === 'private' ? 'private' : 'public', invited: [], desc: String(params.desc || '') });
      redirect('/jobs'); return;
    }
    const jobMatch = pathname.match(/^\/jobs\/(\d+)$/);
    if (jobMatch && req.method === 'GET') {
      if (requireLogin()) return;
      const job = jobs.find(j => j.id === Number(jobMatch[1]));
      if (!job) { send(404, layout(user, '404', '<div class="card"><h2>Job not found</h2></div>')); return; }
      attempt('Job Posts & Search');
      if (job.visibility === 'private' && user.id !== job.clientId && !job.invited.includes(user.id)) pass('job-private-leak');
      send(200, jobDetailPage(user, job)); return;
    }
    const jobPropMatch = pathname.match(/^\/jobs\/(\d+)\/proposals$/);
    if (jobPropMatch && req.method === 'POST') {
      if (requireLogin()) return;
      const params = bodyParams(req, await readBody(req));
      attempt('Proposals');
      proposals.push({ id: nextProposalId++, jobId: Number(jobPropMatch[1]), freelancerId: user.id, amount: Number(params.amount) || 0, note: String(params.note || ''), status: 'open' });
      redirect('/jobs/' + jobPropMatch[1]); return;
    }

    /* proposals */
    if (pathname === '/proposals') { if (requireLogin()) return; send(200, proposalsPage(user)); return; }
    const propMatch = pathname.match(/^\/proposals\/(\d+)$/);
    if (propMatch && req.method === 'GET') {
      if (requireLogin()) return;
      const p = proposals.find(x => x.id === Number(propMatch[1]));
      if (!p) { send(404, layout(user, '404', '<div class="card"><h2>Proposal not found</h2></div>')); return; }
      attempt('Proposals');
      const job = jobs.find(j => j.id === p.jobId);
      if (user.id !== p.freelancerId && (!job || user.id !== job.clientId)) pass('prop-idor');
      send(200, proposalPage(user, p)); return;
    }
    const propEdit = pathname.match(/^\/proposals\/(\d+)\/edit$/);
    if (propEdit && req.method === 'POST') {
      if (requireLogin()) return;
      const params = bodyParams(req, await readBody(req));
      attempt('Proposals');
      const p = proposals.find(x => x.id === Number(propEdit[1]));
      if (p) {
        const changed = Number(params.amount) !== p.amount;
        if (params.amount != null) p.amount = Number(params.amount) || 0;
        if (user.id !== p.freelancerId && changed) pass('prop-edit-idor');
      }
      redirect('/proposals/' + propEdit[1]); return;
    }
    const propAccept = pathname.match(/^\/proposals\/(\d+)\/accept$/);
    if (propAccept && req.method === 'POST') {
      if (requireLogin()) return;
      const params = bodyParams(req, await readBody(req));
      attempt('Proposals');
      const p = proposals.find(x => x.id === Number(propAccept[1]));
      if (p) {
        const job = jobs.find(j => j.id === p.jobId);
        p.status = 'accepted';
        contracts.push({ id: nextContractId++, jobId: p.jobId, clientId: job ? job.clientId : 0, freelancerId: p.freelancerId, total: p.amount, funded: 0, fundRequired: p.amount, status: 'awaiting-funds',
          milestones: [ { id: 1, title: 'First half', amount: Math.ceil(p.amount / 2), state: 'pending' }, { id: 2, title: 'Final half', amount: Math.floor(p.amount / 2), state: 'pending' } ] });
        if (!job || user.id !== job.clientId) pass('prop-accept-bac');
      }
      redirect('/contracts'); return;
    }

    /* contracts + milestones + escrow */
    if (pathname === '/contracts') { if (requireLogin()) return; send(200, contractsPage(user)); return; }
    const contractMatch = pathname.match(/^\/contracts\/(\d+)$/);
    if (contractMatch && req.method === 'GET') {
      if (requireLogin()) return;
      const c = contracts.find(x => x.id === Number(contractMatch[1]));
      if (!c) { send(404, layout(user, '404', '<div class="card"><h2>Contract not found</h2></div>')); return; }
      attempt('Contracts & Milestones');
      if (user.id !== c.clientId && user.id !== c.freelancerId) pass('contract-idor');
      send(200, contractPage(user, c)); return;
    }
    const msMatch = pathname.match(/^\/contracts\/(\d+)\/milestones\/(\d+)\/(approve|release)$/);
    if (msMatch && req.method === 'POST') {
      if (requireLogin()) return;
      const params = bodyParams(req, await readBody(req));
      attempt('Contracts & Milestones');
      const c = contracts.find(x => x.id === Number(msMatch[1]));
      const m = c ? c.milestones.find(x => x.id === Number(msMatch[2])) : null;
      if (c && m) {
        if (msMatch[3] === 'approve') {
          if (!markerOk(params)) pass('ms-approve-csrf');
          if (m.state === 'funded' || m.state === 'pending') m.state = 'approved';
        } else {
          if (m.state === 'funded' || m.state === 'approved') {
            m.state = 'released';
            const fl = userById(c.freelancerId); if (fl) fl.balance += m.amount;
            if (user.id === c.freelancerId && user.id !== c.clientId) pass('ms-release-bac');
          }
        }
      }
      redirect('/contracts/' + msMatch[1]); return;
    }
    const fundMatch = pathname.match(/^\/contracts\/(\d+)\/fund$/);
    if (fundMatch && req.method === 'POST') {
      if (requireLogin()) return;
      const params = bodyParams(req, await readBody(req));
      attempt('Escrow & Payments');
      const c = contracts.find(x => x.id === Number(fundMatch[1]));
      if (c) {
        const amt = Number(params.amount) || 0;
        c.funded += amt;
        if (amt < c.fundRequired && c.funded >= c.fundRequired) { /* normal top-up reaching total */ }
        if (amt > 0 && amt < c.fundRequired) {
          c.funded = c.fundRequired; c.status = 'active';
          for (const m of c.milestones) if (m.state === 'pending') m.state = 'funded';
          pass('escrow-fund-tamper');
        } else if (c.funded >= c.fundRequired) {
          c.status = 'active';
          for (const m of c.milestones) if (m.state === 'pending') m.state = 'funded';
        }
      }
      redirect('/contracts/' + fundMatch[1]); return;
    }
    const refundMatch = pathname.match(/^\/contracts\/(\d+)\/refund$/);
    if (refundMatch && req.method === 'POST') {
      if (requireLogin()) return;
      const params = bodyParams(req, await readBody(req));
      attempt('Escrow & Payments');
      const c = contracts.find(x => x.id === Number(refundMatch[1]));
      if (c && c.funded > 0) {
        user.balance += c.funded;
        if (user.id !== c.clientId) pass('escrow-refund-bac');
        c.funded = 0; c.status = 'refunded';
      }
      redirect('/contracts/' + refundMatch[1]); return;
    }

    /* reviews */
    const reviewPost = pathname.match(/^\/contracts\/(\d+)\/review$/);
    if (reviewPost && req.method === 'POST') {
      if (requireLogin()) return;
      const params = bodyParams(req, await readBody(req));
      attempt('Reviews');
      const c = contracts.find(x => x.id === Number(reviewPost[1]));
      if (c) {
        const stars = Number(params.stars);
        const about = user.id === c.clientId ? c.freelancerId : c.clientId;
        reviews.push({ id: nextReviewId++, contractId: c.id, authorId: user.id, aboutId: about, stars, text: String(params.text || '') });
        if (stars > 5 || stars < 1) pass('review-rating-tamper');
      }
      redirect('/contracts/' + reviewPost[1]); return;
    }
    const reviewEdit = pathname.match(/^\/reviews\/(\d+)\/edit$/);
    if (reviewEdit && req.method === 'GET') {
      if (requireLogin()) return;
      const r = reviews.find(x => x.id === Number(reviewEdit[1]));
      if (!r) { send(404, layout(user, '404', '<div class="card"><h2>Review not found</h2></div>')); return; }
      send(200, reviewEditPage(user, r)); return;
    }
    if (reviewEdit && req.method === 'POST') {
      if (requireLogin()) return;
      const params = bodyParams(req, await readBody(req));
      attempt('Reviews');
      const r = reviews.find(x => x.id === Number(reviewEdit[1]));
      if (r) {
        if (params.text != null) r.text = String(params.text);
        if (params.stars != null) r.stars = Number(params.stars);
        if (user.id !== r.authorId) pass('review-edit-idor');
      }
      redirect('/contracts'); return;
    }

    /* payouts */
    const payoutMatch = pathname.match(/^\/payouts\/(\d+)$/);
    if (payoutMatch && req.method === 'GET') {
      if (requireLogin()) return;
      const target = userById(Number(payoutMatch[1]));
      if (!target) { send(404, layout(user, '404', '<div class="card"><h2>User not found</h2></div>')); return; }
      attempt('Escrow & Payments');
      if (user.id !== target.id) pass('payout-idor');
      send(200, payoutsPage(user, target)); return;
    }

    /* messages */
    if (pathname === '/messages' && req.method === 'GET') { if (requireLogin()) return; send(200, messagesPage(user)); return; }
    if (pathname === '/messages' && req.method === 'POST') {
      if (requireLogin()) return;
      const params = bodyParams(req, await readBody(req));
      messages.push({ id: nextMessageId++, fromId: user.id, toId: Number(params.to) || 0, text: String(params.text || '') });
      redirect('/messages'); return;
    }

    /* admin */
    if (pathname === '/admin') {
      if (requireLogin()) return;
      const role = cookies.hx_role || user.role;
      if (role === 'admin') {
        if (user.role !== 'admin') pass('auth-cookie-tamper');
        send(200, adminPage(user));
      } else send(403, layout(user, 'Forbidden', '<div class="card"><h2>Admins only</h2></div>'));
      return;
    }
    if (pathname === '/admin/users') {
      if (requireLogin()) return;
      attempt('Admin & Platform');
      if (user.role !== 'admin') pass('admin-bac');
      send(200, adminUsersPage(user)); return;
    }

    /* completion */
    if (pathname === '/complete') { if (requireLogin()) return; send(200, completePage(user)); return; }
    if (pathname === '/complete/name' && req.method === 'POST') {
      if (requireLogin()) return;
      const params = bodyParams(req, await readBody(req));
      if (params.testerName) { S.testerName = String(params.testerName); saveState(); }
      redirect('/complete'); return;
    }
    if (pathname === '/certificate') { if (requireLogin()) return; send(200, certificatePage(user)); return; }

    send(404, layout(user, '404', '<div class="card"><h2>Not found</h2></div>'));
  } catch (e) {
    try { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('error'); } catch (e2) { /* ignore */ }
  }
});

/* ---------------- doc generation ---------------- */
function genDocs() {
  const byFeature = f => TESTS.filter(t => t.feature === f);
  let vuln = '# HexaFreelance (LAB 95) — Vulnerabilities\n\nThe complete map of this lab: every scored test, grouped by feature.\nThe unlock key mechanism: this lab opens with the completion key of Lab 94 and, at 100%, reveals its own completion key for Lab 96. Keys are stored only as scattered encoded fragments inside the server and are never written in any document.\n';
  for (const f of FEATURES) {
    vuln += '\n## ' + f + '\n';
    for (const t of byFeature(f)) {
      vuln += '\n### ' + t.name + '\n- OWASP: ' + t.owasp + '\n- Difficulty: ' + t.difficulty + '\n- Where: ' + f + ' flows of the live app\n- Exploitation outline: ' + t.hints[2] + '\n- Impact: ' + t.impact + '\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'), vuln);

  let guide = '# HexaFreelance (LAB 95) — Practice Guide\n\nChallenges grouped by feature, then difficulty. Each challenge mirrors the Mission Board (/tests) in the app.\n';
  const rank = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  for (const f of FEATURES) {
    guide += '\n## ' + f + '\n';
    for (const t of byFeature(f).slice().sort((a, b) => rank[a.difficulty] - rank[b.difficulty])) {
      guide += '\n### [' + t.difficulty + '] ' + t.name + '\n- Objective: make the "' + t.name + '" test flip to done on the Mission Board by performing the real exploit in the app.\n- Hint 1: ' + t.hints[0] + '\n- Hint 2: ' + t.hints[1] + '\n- Hint 3: ' + t.hints[2] + '\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'), guide);

  let fix = '# HexaFreelance (LAB 95) — Fix & Retest\n\nFor every test: the secure implementation and how to retest it.\n';
  for (const f of FEATURES) {
    fix += '\n## ' + f + '\n';
    for (const t of byFeature(f)) {
      fix += '\n### ' + t.report.title + '\n- Severity: ' + t.report.severity + '\n- Fix: ' + t.report.remediation + '\n- Retest: repeat the original exploit from the Practice Guide; it must now fail (access denied / input rejected / state unchanged), and the corresponding Mission Board test must stay open on a fresh lab.\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'), fix);
  console.log('docs generated:', TESTS.length, 'tests across', FEATURES.length, 'features');
}

if (process.argv.includes('--gen-docs')) { genDocs(); process.exit(0); }

/* completion bookkeeping on boot of a finished state */
if (progress().complete && !S.completedAt) { S.completedAt = new Date().toISOString(); S.keyRevealed = true; saveState(); }

server.listen(PORT, '127.0.0.1', () => {
  console.log('LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' listening on http://127.0.0.1:' + PORT);
});
