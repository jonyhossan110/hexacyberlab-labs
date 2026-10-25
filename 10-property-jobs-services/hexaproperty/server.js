'use strict';
/*
 * HexaProperty — LAB 91 (Category 10: Property, Jobs & Professional Services)
 * A deliberately vulnerable real-estate portal for local, authorised practice.
 * Zero-dependency Node.js. In-memory fake seed data only. Binds 127.0.0.1:3100.
 * LOCAL-ONLY practice lab — never deploy publicly.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

const PORT = 3100;
const LAB_NUMBER = 91;
const LAB_NAME = 'HexaProperty';
const PREV_LAB = 90;
const FEATURE_PRICE = 49; // server-side price (USD) for a Featured Listing upgrade
const PROGRESS_PATH = path.join(__dirname, 'progress.json');
const LOGO_PATH = path.join(__dirname, 'logo.png');

// --- key shard region A (entry key, first half) ---


// ---------- small helpers ----------
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
const XSS_PATTERN = /<script|onerror\s*=|onload\s*=|<svg|<img[^>]*\sonerror|<iframe|javascript:/i;
function hasXss(s) { return XSS_PATTERN.test(String(s || '')); }
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  raw.split(';').forEach(part => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}
function readBody(req) {
  return new Promise(resolve => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) {
        try { resolve(JSON.parse(raw)); return; } catch (e) { /* fall through */ }
      }
      try { resolve(querystring.parse(raw)); } catch (e) { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}
function send(res, code, body, headers) {
  const h = Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, headers || {});
  res.writeHead(code, h);
  res.end(body);
}
function redirect(res, to, extraHeaders) {
  send(res, 302, 'Redirecting to ' + esc(to), Object.assign({ Location: to }, extraHeaders || {}));
}
function json(res, code, obj) {
  send(res, code, JSON.stringify(obj), { 'Content-Type': 'application/json' });
}

// ---------- TESTS registry ----------
const TESTS = [
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03:2021 – Injection', difficulty: 'Beginner',
    hints: [
      'The login form builds its database query by pasting your input straight into the query string.',
      'A quote character in the email field can break out of the string the query expects.',
      "Use the admin email, then a quote and a SQL comment (-- ) so the password check is commented out."],
    lesson: 'String-built queries let attacker input change the logic of the query itself; parameterised queries keep data and code separate.',
    impact: 'On a real portal, anyone could sign in as the admin or any agent without knowing a password — complete account takeover of the business and its client data.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements for all database access; never concatenate user input into SQL.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'No Brute-Force Protection on Login', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    hints: [
      'Nothing slows you down or locks the account when a password guess is wrong.',
      'Repeat failed logins against one account and watch whether the app ever delays, CAPTCHAs or locks you out.',
      'Submit 10 wrong passwords for one real account — the 10th attempt is still processed exactly like the first.'],
    lesson: 'Without rate limiting or lockout, online password guessing is only a matter of time and a wordlist.',
    impact: 'Attackers can grind through passwords for agent and owner accounts at full speed, quietly taking over listings and client inquiries.',
    report: { title: 'Missing Brute-Force Protection on Authentication Endpoint', severity: 'High', remediation: 'Add per-account and per-IP rate limiting, progressive delays and lockout/alerting after repeated failures.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User Enumeration via Login and Reset Responses', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    hints: [
      'Compare the exact wording of errors for an email that exists versus one that does not.',
      'The forgot-password page is the most talkative — try it with real and invented addresses.',
      'Probe at least 5 different emails on /forgot; the responses confirm which accounts exist.'],
    lesson: 'Different error messages for "no such account" and "wrong password" hand attackers a verified list of valid accounts to target.',
    impact: 'Enumerated agent and owner emails become a precise target list for phishing and password attacks against the portal.',
    report: { title: 'Account Enumeration Through Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message for all login and reset outcomes, regardless of whether the account exists.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: [
      'Reset tokens are not random — they are computed from something you can learn about the account.',
      'Tokens look like HP<id>-<number>. Account IDs leak in URLs and admin/debug views; the number is simple arithmetic on the ID.',
      'For account id N the token is HP<N>-<N*137+42>. Compute it for an owner account and POST it to /reset with a new password — no email needed.'],
    lesson: 'A reset token derived from public data with simple arithmetic is not a secret; tokens must be long, random and single-use.',
    impact: 'Anyone can reset the password of any agent or owner whose ID they know, locking the real user out and taking over their listings.',
    report: { title: 'Password Reset Token Is Predictable (Derived from Account ID)', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (at least 128 bits), store only a hash, expire quickly and make them single-use.' } },
  { id: 'auth-demo', feature: 'Login & Authentication', name: 'Demo Credentials Published on the Login Page', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    hints: [
      'Read the login page carefully — it helpfully tells you a working username and password.',
      'Demo accounts are real accounts on the live system.',
      'Sign in with the demo buyer credentials printed under the login form.'],
    lesson: 'Published or default credentials are not a convenience feature; they are an open door anyone can walk through.',
    impact: 'Attackers get a free, legitimate account inside the portal to probe IDORs and other flaws from an authenticated position.',
    report: { title: 'Working Demo Credentials Disclosed on the Login Page', severity: 'Medium', remediation: 'Remove published/demo credentials from production; disable default accounts or force unique passwords.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Role Trusted from a Client Cookie (hx_role)', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: [
      'After login, look at the cookies the portal sets — one of them describes your role.',
      'Cookies live on the client, so their contents can be edited with browser tools or curl.',
      'Sign in as a buyer, then request /agent with the hx_role cookie changed to agent (or admin).'],
    lesson: 'Authorization decisions must be made from server-side session data, never from values the client can edit.',
    impact: 'Any buyer can promote themselves to agent and read commission data and client lists simply by editing a cookie.',
    report: { title: 'Authorization Role Taken from a Client-Controlled Cookie', severity: 'High', remediation: 'Store roles only in server-side session state; ignore role claims arriving from the client.' } },
  { id: 'reg-weak', feature: 'Registration & Profile', name: 'Weak Password Policy at Registration', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    hints: [
      'The sign-up form claims passwords must be strong — test whether the server actually enforces it.',
      'Try registering with a very short password.',
      'Register a new account with the single-character password "x" — it is accepted.'],
    lesson: 'Client-side hints are not enforcement; password policy must be validated on the server.',
    impact: 'Users pick trivially guessable passwords, and the portal cannot claim any baseline of account security.',
    report: { title: 'No Server-Side Minimum Password Strength at Registration', severity: 'Medium', remediation: 'Enforce a server-side password policy (length and breach-list checks) on registration and password change.' } },
  { id: 'reg-mass', feature: 'Registration & Profile', name: 'Mass Assignment at Registration (role / featuredCredits)', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: [
      'The registration handler copies more of your submitted form than the visible fields.',
      'Add extra form fields the UI never shows — think about which account attributes would be valuable.',
      'POST /register with extra fields role=admin and featuredCredits=50 — the new account is created with them.'],
    lesson: 'Binding request bodies directly to data objects lets attackers set fields that were never meant to be user-controlled.',
    impact: 'Attackers mint their own admin accounts or grant themselves paid featured-listing credits at sign-up — instant privilege and free advertising.',
    report: { title: 'Mass Assignment in Registration Allows Role and Credit Manipulation', severity: 'High', remediation: 'Whitelist the exact fields registration may set; assign roles and credits only through server-side logic.' } },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03:2021 – Injection', difficulty: 'Beginner',
    hints: [
      'Your display name is shown back on many pages — check whether HTML in it is escaped.',
      'Register (or rename yourself) with markup instead of a plain name.',
      'Use a name like <script>alert(1)</script> — it is stored and rendered unescaped, including in the admin user list.'],
    lesson: 'Any stored field rendered without output encoding becomes a stored cross-site scripting payload aimed at other users — including admins.',
    impact: 'An attacker can run script in the browsers of agents, owners and the portal admin, stealing sessions and acting in their name.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Contextually encode all user-supplied data on output and validate input; add a Content-Security-Policy as defence in depth.' } },
  { id: 'profile-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: [
      'The portal marks its own forms with a hidden hx_origin field — but does the server check it?',
      'Replay a profile update without the marker, as a cross-site form would.',
      'POST /profile with a new name/email and NO hx_origin field — the change is applied anyway.'],
    lesson: 'Anti-CSRF markers only protect when the server verifies them on every state-changing request.',
    impact: 'A malicious page visited by a signed-in agent can silently change their profile and contact email — the first step to account takeover.',
    report: { title: 'Missing CSRF Verification on Profile Update', severity: 'Medium', remediation: 'Require and verify a per-session CSRF token on all state-changing requests; use SameSite cookies as a backstop.' } },
  { id: 'search-sqli', feature: 'Search & Listings', name: 'SQL Injection in Property Search Leaks Draft Listings', owasp: 'A03:2021 – Injection', difficulty: 'Intermediate',
    hints: [
      'Search builds its query the same unsafe way the login does.',
      'A normal search never shows draft (unpublished) listings — injection can change which rows the query returns.',
      "Search for ' OR '1'='1 and the unpublished Lakeview Villa draft appears in the results."],
    lesson: 'Injection in search does not just error the page — it can rewrite the query to expose records that were never meant to be public.',
    impact: 'Unpublished properties, pre-market prices and internal notes leak to competitors and buyers before launch, destroying negotiating position.',
    report: { title: 'SQL Injection in Search Exposes Unpublished Listings', severity: 'High', remediation: 'Parameterise the search query and enforce listing-status filters in server-side code, not in the query string alone.' } },
  { id: 'search-xss', feature: 'Search & Listings', name: 'Reflected XSS in Search Results', owasp: 'A03:2021 – Injection', difficulty: 'Beginner',
    hints: [
      'The results page repeats your search term back to you in the heading.',
      'Check whether that reflection is escaped.',
      'Search for <script>alert(1)</script> — the payload comes back in the page unescaped.'],
    lesson: 'Reflected input must be encoded for the context it lands in, even when it looks like "just an echo".',
    impact: 'Attackers craft search links that run script in a victim agent\u2019s browser when clicked — a clean phishing and session-theft vector.',
    report: { title: 'Reflected Cross-Site Scripting in Search', severity: 'Medium', remediation: 'HTML-encode the reflected search term and validate input; deploy a Content-Security-Policy.' } },
  { id: 'listing-draft', feature: 'Search & Listings', name: 'Unpublished (Draft) Listing Visible by Direct URL', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: [
      'Listing IDs are sequential. Drafts are hidden from search and the homepage — but are they hidden everywhere?',
      'Guess the URL of a listing that is not shown publicly.',
      'As a buyer, open /listings/2 — the draft villa, including its internal agent notes, is served.'],
    lesson: 'Hiding an object from listings is not access control; every object request must check status and ownership on the server.',
    impact: 'Pre-market properties and private agent notes (including the owner\u2019s minimum acceptable price) leak to anyone who guesses an ID.',
    report: { title: 'Insecure Direct Object Reference Exposes Draft Listing and Internal Notes', severity: 'High', remediation: 'Check listing status and the requester\u2019s relationship to it on every object access; never render internal notes to buyers.' } }
];

TESTS.push(
  { id: 'listing-edit-idor', feature: 'Listings Management', name: "Edit Another Owner's Listing (Broken Access Control)", owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: [
      'The edit endpoint trusts that whoever posts to it owns the listing.',
      'You do not need to own a listing to open its edit action — only to see the button.',
      'As a buyer, POST /listings/3/edit with a new price — Omar\u2019s studio is repriced.'],
    lesson: 'Every object mutation must verify that the caller owns (or may administer) that object — the UI hiding a button is not a check.',
    impact: 'Competitors or vandals can reprice, rename or deface any owner\u2019s listings, directly costing sales and reputation.',
    report: { title: 'Missing Ownership Check Allows Editing Any Listing', severity: 'High', remediation: 'Enforce per-object authorization on the server for every read and write of a listing.' } },
  { id: 'listing-feature-tamper', feature: 'Listings Management', name: 'Featured-Listing Price Tampering', owasp: 'A04:2021 – Insecure Design', difficulty: 'Beginner',
    hints: [
      'Featuring a listing costs $49 — but the amount travels through the client.',
      'Intercept or hand-craft the feature request and look at what the server trusts.',
      'POST /listings/1/feature as its owner with amount=1 — the listing is featured and only $1 recorded.'],
    lesson: 'Prices belong on the server. Anything the client states about money must be recomputed or verified server-side.',
    impact: 'Owners get premium advertising for $1 instead of $49 — quiet, scalable revenue loss on every featured listing.',
    report: { title: 'Client-Supplied Price Trusted for Featured Listing Upgrade', severity: 'Medium', remediation: 'Look up the price server-side from the listing/plan; ignore any amount sent by the client.' } },
  { id: 'upload-html', feature: 'Listings Management', name: 'Unrestricted File Upload — HTML Served from the Portal', owasp: 'A04:2021 – Insecure Design', difficulty: 'Intermediate',
    hints: [
      'Listing photos are uploaded as a filename plus content, then served back from the portal\u2019s own domain.',
      'Nothing checks that the "photo" is actually an image.',
      'POST /listings/1/photo with filename evil.html and HTML content, then open /uploads/evil.html — it is served as a web page.'],
    lesson: 'Uploads must be validated by content, stored safely, and served with a harmless content type — otherwise the upload feature is a hosting service for attackers.',
    impact: 'Attackers host phishing pages and scripts on the portal\u2019s trusted domain, aimed at buyers and agents.',
    report: { title: 'Unrestricted File Upload Allows HTML/JS Hosting on the Application Domain', severity: 'High', remediation: 'Whitelist image types by content inspection, rename files, store outside the web root and serve with safe headers.' } },
  { id: 'inquiry-idor', feature: 'Inquiries', name: "Read Another Buyer's Inquiry with Private Contact Details", owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: [
      'Inquiries have sequential IDs and contain the buyer\u2019s email and phone.',
      'Who is allowed to open an inquiry — and who actually can?',
      'As Ben, open /inquiries/1 — Bella\u2019s inquiry, phone number included, is served to you.'],
    lesson: 'Objects containing personal data need the strictest ownership checks; sequential IDs make guessing trivial.',
    impact: 'Buyers\u2019 phone numbers and emails leak to strangers — a privacy breach and a list of hot leads for competitors.',
    report: { title: 'Insecure Direct Object Reference Exposes Buyer Contact Details', severity: 'High', remediation: 'Authorize inquiry access to the sender, the listing owner and admins only; audit access to personal data.' } },
  { id: 'inquiry-delete-idor', feature: 'Inquiries', name: "Delete an Inquiry on Someone Else's Listing", owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: [
      'Deleting an inquiry is a state-changing action with the same missing ownership check as reading.',
      'Find an inquiry that belongs to a listing you do not own and a buyer you are not.',
      'POST /inquiries/1/delete as Ben — Bella\u2019s inquiry to Olivia is gone.'],
    lesson: 'Destructive actions need authorization checks at least as strong as reads; otherwise rivals can erase your sales pipeline.',
    impact: 'A competitor can silently delete buyer inquiries, so owners never see genuine offers and lose sales without a trace.',
    report: { title: 'Missing Authorization on Inquiry Deletion', severity: 'Medium', remediation: 'Check that the caller is the sender, the listing owner or an admin before deleting; log destructive actions.' } },
  { id: 'appt-overbook', feature: 'Appointments', name: 'Double-Booking the Same Viewing Slot', owasp: 'A04:2021 – Insecure Design', difficulty: 'Intermediate',
    hints: [
      'A viewing slot for a listing should hold exactly one buyer.',
      'Look at existing appointments, then book the identical listing and slot again.',
      'POST /appointments for listing 1 at 2026-11-02 10:00 — already taken by Ben — and yours is accepted too.'],
    lesson: 'Uniqueness invariants (one booking per slot) must be enforced in server logic and storage, not assumed from the UI calendar.',
    impact: 'Two buyers arrive for the same viewing, agents double-book their day, and the portal\u2019s scheduling data becomes untrustworthy.',
    report: { title: 'Viewing Slot Can Be Booked by Multiple Buyers (Missing Uniqueness Check)', severity: 'Medium', remediation: 'Enforce one active appointment per listing/slot on the server and reject conflicts atomically.' } },
  { id: 'appt-cancel-idor', feature: 'Appointments', name: "Cancel Another Buyer's Viewing Appointment", owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: [
      'Appointment IDs are sequential and the cancel action does not ask who you are.',
      'You only need the ID of someone else\u2019s appointment.',
      'POST /appointments/1/cancel while signed in as Bella — Ben\u2019s viewing is cancelled.'],
    lesson: 'State-changing endpoints on objects must verify the caller\u2019s relationship to the object on every request.',
    impact: 'Rivals can cancel competitors\u2019 viewings the night before, quietly killing deals.',
    report: { title: 'Missing Authorization Allows Cancelling Any Appointment', severity: 'Medium', remediation: 'Authorize cancel actions to the appointment\u2019s buyer, the listing owner or an admin.' } },
  { id: 'appt-confirm', feature: 'Appointments', name: 'Buyer Confirms Own Appointment via the Agent/Owner Action', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: [
      'Appointments start as "pending" until the owner or agent confirms them.',
      'The confirm endpoint exists — the question is who the server lets call it.',
      'Book your own viewing, then POST /appointments/<your id>/confirm as the buyer — it flips to confirmed.'],
    lesson: 'Workflow state transitions are authorization boundaries: each transition must name the roles allowed to perform it.',
    impact: 'Buyers self-approve viewings for properties they should never access, including occupied or off-market homes — a safety as well as security issue.',
    report: { title: 'Broken Function-Level Authorization on Appointment Confirmation', severity: 'Medium', remediation: 'Restrict the confirm transition to the listing owner, assigned agent or admin, checked server-side.' } },
  { id: 'saved-idor', feature: 'Saved Searches', name: "Read Another User's Saved Search and Alert Email", owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: [
      'Saved searches reveal what a buyer wants and their maximum budget.',
      'They also have sequential IDs.',
      'As Bella, open /saved/2 — Ben\u2019s saved search, budget and alert email are shown.'],
    lesson: 'Even "minor" objects leak business intelligence; authorization must cover every object type, not just the obvious ones.',
    impact: 'Competing agents learn buyers\u2019 budgets and alert emails — exactly the data needed to poach clients.',
    report: { title: 'Insecure Direct Object Reference on Saved Searches', severity: 'Medium', remediation: 'Scope saved-search reads to their owner; return 404 for other users\u2019 objects.' } },
  { id: 'admin-bac', feature: 'Admin Panel', name: 'Admin Panel Open to Any Signed-In User', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: [
      'The admin panel is just a URL. What does the server check before serving it?',
      'Try it with the least-privileged account you have.',
      'Sign in as the demo buyer and open /admin — the full user list, passwords included, is served.'],
    lesson: 'Admin surfaces must verify an admin role on the server for every request; obscurity of the URL is not protection.',
    impact: 'Any registered user can read every account\u2019s password and take over the entire portal.',
    report: { title: 'Broken Access Control on Admin Panel (Any Authenticated User)', severity: 'Critical', remediation: 'Require a server-side admin role check on all admin routes; remove password display entirely.' } },
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'CSRF on Admin User Deactivation', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: [
      'Admin actions are plain POSTs. The admin forms carry an hx_origin marker — is it verified?',
      'Replay a deactivation request without the marker, as a cross-site form would send it.',
      'As admin, POST /admin/deactivate with a userId and no hx_origin — the account is deactivated.'],
    lesson: 'Admin actions are the highest-value CSRF targets; unverified markers give a false sense of safety.',
    impact: 'One malicious page view by the admin can deactivate agents and owners across the portal.',
    report: { title: 'Missing CSRF Verification on Administrative Actions', severity: 'High', remediation: 'Verify per-session CSRF tokens on all admin POSTs and require re-authentication for destructive actions.' } },
  { id: 'api-token', feature: 'Platform & API', name: 'Weak API Key — Base64 of the Account Email', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: [
      'The JSON API authenticates with an x-api-key header instead of a session.',
      'The key is derived from something public about the account — no secret involved.',
      'Send GET /api/my-data with x-api-key set to the base64 of olivia@hexaproperty.local — her listings, inquiries and saved searches come back, no login needed.'],
    lesson: 'An API key must be an unguessable secret; encoding a public identifier is not authentication.',
    impact: 'Anyone who knows an agent\u2019s email — printed on every listing — can pull their full business data from the API.',
    report: { title: 'API Authentication Uses Base64-Encoded Email as the Key', severity: 'High', remediation: 'Issue random, revocable API tokens per account, store hashes, and require them over TLS only.' } },
  { id: 'api-debug', feature: 'Platform & API', name: 'Unauthenticated Debug Endpoint Dumps All Accounts', owasp: 'A05:2021 – Security Misconfiguration', difficulty: 'Beginner',
    hints: [
      'Developers leave helpful endpoints behind. Guess the obvious one under /api.',
      'It needs no login at all.',
      'GET /api/debug returns every user, including passwords, as JSON.'],
    lesson: 'Debug and diagnostics endpoints must never ship enabled in production — they bypass every other control at once.',
    impact: 'One unauthenticated request hands an attacker every account and password on the portal.',
    report: { title: 'Exposed Debug Endpoint Discloses All User Credentials', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; gate diagnostics behind admin auth and network restrictions.' } }
);

// --- key shard region B (entry key, second half) ---

function _asm(a, b) {
  return a.concat(b).map(x => [...Buffer.from(x, 'base64').toString('utf8')].reverse().join('')).join('');
}
// NOTE: entryKey_() is called from exactly one place — the /unlock handler (§7).
const ENTRY_KEY_SHA256 = 'de4dcb661ea80ca094f62cc78b6d46518553318a5a41625e5dda2bf8642ebd34';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */

// ---------- seed data (all fake, in-memory) ----------
const users = [
  { id: 1, name: 'Ada Admin', email: 'admin@hexaproperty.local', password: 'admin123', role: 'admin', phone: '+880-1711-555100', demo: false, active: true, featuredCredits: 0 },
  { id: 2, name: 'Olivia Owner', email: 'olivia@hexaproperty.local', password: 'olivia123', role: 'owner', phone: '+880-1711-555101', demo: false, active: true, featuredCredits: 2 },
  { id: 3, name: 'Omar Owner', email: 'omar@hexaproperty.local', password: 'omar123', role: 'owner', phone: '+880-1711-555102', demo: false, active: true, featuredCredits: 0 },
  { id: 4, name: 'Adam Agent', email: 'adam@hexaproperty.local', password: 'adam123', role: 'agent', phone: '+880-1711-555103', demo: false, active: true, featuredCredits: 0 },
  { id: 5, name: 'Bella Buyer', email: 'bella@hexaproperty.local', password: 'bella123', role: 'buyer', phone: '+880-1711-555104', demo: true, active: true, featuredCredits: 0 },
  { id: 6, name: 'Ben Buyer', email: 'ben@hexaproperty.local', password: 'ben123', role: 'buyer', phone: '+880-1711-555105', demo: false, active: true, featuredCredits: 0 }
];
let nextUserId = 7;
const listings = [
  { id: 1, title: 'Sunny 3BR Apartment in Gulshan', city: 'Dhaka', price: 85000, beds: 3, ownerId: 2, status: 'active', featured: false, featuredPaid: 0, desc: 'Bright corner apartment near the lake, two balconies, lift and generator backup.', agentNotes: 'INTERNAL: Owner will accept 82000 minimum. Do not share with buyers.' },
  { id: 2, title: 'Lakeview Villa (Unlisted)', city: 'Dhaka', price: 240000, beds: 5, ownerId: 2, status: 'draft', featured: false, featuredPaid: 0, desc: 'Pre-market villa with private dock. Photos in progress.', agentNotes: 'INTERNAL: Keep hidden until the photo shoot. Owner testing the market at 240000.' },
  { id: 3, title: 'Downtown Studio Loft', city: 'Chattogram', price: 45000, beds: 1, ownerId: 3, status: 'active', featured: false, featuredPaid: 0, desc: 'Compact loft above the port district, ideal first buy.', agentNotes: 'INTERNAL: Tenant leaves in December; viewings after 6pm only.' },
  { id: 4, title: 'Family House with Garden', city: 'Sylhet', price: 120000, beds: 4, ownerId: 3, status: 'active', featured: true, featuredPaid: 49, desc: 'Four-bedroom family house with a mature garden and garage.', agentNotes: 'INTERNAL: Owner is relocating abroad in March; motivated seller.' },
  { id: 5, title: 'Skyline Penthouse', city: 'Dhaka', price: 390000, beds: 4, ownerId: 3, status: 'sold', featured: false, featuredPaid: 0, desc: 'SOLD. Top-floor penthouse with panoramic views.', agentNotes: 'INTERNAL: Sold at asking in 9 days.' }
];
let nextListingId = 6;
const inquiries = [
  { id: 1, listingId: 1, buyerId: 5, message: 'Is the price negotiable? We can move quickly.', email: 'bella@hexaproperty.local', phone: '+880-1711-555001' },
  { id: 2, listingId: 3, buyerId: 6, message: 'Can I view this weekend?', email: 'ben@hexaproperty.local', phone: '+880-1711-555002' },
  { id: 3, listingId: 1, buyerId: 6, message: 'What are the monthly service charges?', email: 'ben@hexaproperty.local', phone: '+880-1711-555002' }
];
let nextInquiryId = 4;
const appointments = [
  { id: 1, listingId: 1, buyerId: 6, slot: '2026-11-02 10:00', status: 'pending' },
  { id: 2, listingId: 3, buyerId: 5, slot: '2026-11-03 14:00', status: 'confirmed' }
];
let nextAppointmentId = 3;
const savedSearches = [
  { id: 1, userId: 5, query: 'villa dhaka', maxPrice: 250000, email: 'bella@hexaproperty.local' },
  { id: 2, userId: 6, query: 'studio loft', maxPrice: 50000, email: 'ben@hexaproperty.local' }
];
const uploads = {}; // filename -> content (simulated photo uploads)
const failedLogins = {}; // email -> consecutive failure count (never throttled — the flaw)
const forgotProbes = new Set(); // distinct emails probed on /forgot
const issuedResetTokens = new Set(); // "email:token" pairs actually issued via /forgot
function resetTokenFor(user) { return 'HP' + user.id + '-' + (user.id * 137 + 42); }

// ---------- progress engine (§4) ----------
let state = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
try {
  if (fs.existsSync(PROGRESS_PATH)) {
    const loaded = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
    state = Object.assign(state, loaded);
  }
} catch (e) { /* start fresh on a corrupt state file */ }
function save() {
  try { fs.writeFileSync(PROGRESS_PATH, JSON.stringify(state, null, 2)); } catch (e) { /* non-fatal */ }
}
function doneCount() { return TESTS.filter(t => state.tests[t.id]).length; }
function attempt(feature) {
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  save();
}
function pass(id) {
  if (state.tests[id]) return;
  state.tests[id] = true;
  if (doneCount() === TESTS.length && !state.completedAt) {
    state.completedAt = new Date().toISOString();
    state.keyRevealed = true;
  }
  save();
}
function progressObj() {
  const features = {};
  TESTS.forEach(t => {
    if (!features[t.feature]) features[t.feature] = { total: 0, done: 0, attempts: state.attempts[t.feature] || 0 };
    features[t.feature].total++;
    if (state.tests[t.id]) features[t.feature].done++;
  });
  const done = doneCount();
  return { lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done, pct: Math.floor(done / TESTS.length * 100), features, complete: done === TESTS.length };
}

// ---------- sessions ----------
const sessions = {}; // sid -> userId
let sidCounter = 0;
function newSession(userId) {
  const sid = 's' + (++sidCounter) + '-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e9).toString(36);
  sessions[sid] = userId;
  return sid;
}
function currentUser(req) {
  const c = parseCookies(req);
  if (!c.hx_session) return null;
  const uid = sessions[c.hx_session];
  if (!uid) return null;
  return users.find(u => u.id === uid && u.active) || null;
}
// The portal (insecurely) also trusts a client cookie for the role — see test auth-cookie.
function cookieRole(req) {
  const c = parseCookies(req);
  return c.hx_role || null;
}
function effectiveRole(req, user) { return cookieRole(req) || (user ? user.role : null); }

// ---------- mini SQL evaluator (the vulnerable string-built query engine) ----------
function stripComment(s) {
  let inStr = false;
  for (let i = 0; i < s.length - 1; i++) {
    if (s[i] === "'") inStr = !inStr;
    if (!inStr && s[i] === '-' && s[i + 1] === '-') return s.slice(0, i);
  }
  return s;
}
function tokenizeWhere(s) {
  const toks = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '(' || ch === ')') { i++; continue; }
    if (ch === "'") {
      let j = i + 1, v = '';
      while (j < s.length && s[j] !== "'") { v += s[j]; j++; }
      toks.push({ t: 'str', v }); i = j + 1; continue;
    }
    if (ch === '=') { toks.push({ t: 'op', v: '=' }); i++; continue; }
    const m = /^[A-Za-z0-9_%.]+/.exec(s.slice(i));
    if (m) {
      const w = m[0];
      const up = w.toUpperCase();
      if (up === 'AND' || up === 'OR') toks.push({ t: 'kw', v: up });
      else if (up === 'LIKE') toks.push({ t: 'op', v: 'LIKE' });
      else toks.push({ t: 'ident', v: w });
      i += w.length; continue;
    }
    i++;
  }
  return toks;
}
function operandVal(tok, row) {
  if (!tok) return '';
  if (tok.t === 'str') return tok.v;
  if (tok.t === 'ident') {
    const v = row[tok.v];
    return v == null ? '' : String(v);
  }
  return '';
}
function likeMatch(value, pattern) {
  const rx = new RegExp('^' + pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i');
  return rx.test(value);
}
function evalAtom(toks, pos, row) {
  const left = operandVal(toks[pos], row);
  const opTok = toks[pos + 1];
  if (opTok && opTok.t === 'op') {
    const right = operandVal(toks[pos + 2], row);
    if (opTok.v === '=') return { v: left.toLowerCase() === right.toLowerCase(), n: 3 };
    if (opTok.v === 'LIKE') return { v: likeMatch(left, right), n: 3 };
  }
  return { v: !!left, n: 1 };
}
function evalAnd(toks, pos, row) {
  let r = evalAtom(toks, pos, row);
  let v = r.v, n = r.n;
  while (toks[pos + n] && toks[pos + n].t === 'kw' && toks[pos + n].v === 'AND') {
    const r2 = evalAtom(toks, pos + n + 1, row);
    v = v && r2.v; n += 1 + r2.n;
  }
  return { v, n };
}
function evalWhere(row, where) {
  const toks = tokenizeWhere(stripComment(where));
  if (!toks.length) return false;
  let r = evalAnd(toks, 0, row);
  let v = r.v, n = r.n;
  while (toks[n] && toks[n].t === 'kw' && toks[n].v === 'OR') {
    const r2 = evalAnd(toks, n + 1, row);
    v = v || r2.v; n += 1 + r2.n;
  }
  return v;
}

// --- key shard region C (completion key, first half) ---
const _cA = ["TC1YSA==","RC0yOQ==","OE5OTw=="];
// NOTE: completionKey() is called only from completion contexts (§7): /complete,
// the certificate flow, and the chatbot once the lab is at 100%.
function completionKey() { return _asm(_cA, _cB); }

// ---------- HTML ----------
const CSS = `
body{font-family:system-ui,Arial,sans-serif;margin:0;background:#f6f4ef;color:#222}
header{background:#1d2733;color:#fff;padding:10px 18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
header img{height:38px;width:38px;border-radius:6px;background:#fff}
header .lab{font-weight:700;letter-spacing:.4px}
header nav a{color:#cfe3ff;margin-right:12px;text-decoration:none;font-size:14px}
.pbar{background:#39485c;border-radius:8px;height:16px;min-width:210px;flex:1;max-width:420px;position:relative;overflow:hidden}
.pbar>i{display:block;height:100%;background:#e8a33d}
.pbar span{position:absolute;inset:0;font-size:11px;text-align:center;line-height:16px;color:#fff}
main{max-width:980px;margin:0 auto;padding:22px 18px 90px}
.card{background:#fff;border:1px solid #ddd6c8;border-radius:10px;padding:16px 18px;margin:0 0 16px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.price{color:#a05c00;font-weight:700}
.tag{display:inline-block;background:#e8a33d;color:#222;border-radius:10px;padding:1px 8px;font-size:12px;font-weight:700}
.tag.grey{background:#ddd}
input,textarea,select{padding:8px;border:1px solid #bbb;border-radius:6px;width:100%;box-sizing:border-box;margin:4px 0 10px}
button,.btn{background:#1d2733;color:#fff;border:0;border-radius:6px;padding:9px 16px;cursor:pointer;text-decoration:none;display:inline-block}
button.alt,.btn.alt{background:#e8a33d;color:#222}
table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #e3ddcf;padding:7px 9px;text-align:left;font-size:14px}
.err{background:#ffe3e0;border:1px solid #d66;padding:10px 14px;border-radius:8px}
.ok{background:#e2f4e2;border:1px solid #6a6;padding:10px 14px;border-radius:8px}
small{color:#666}
#coachBtn{position:fixed;right:18px;bottom:18px;background:#1d2733;color:#fff;border-radius:24px;padding:12px 18px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.3);z-index:50}
#coachPanel{position:fixed;right:18px;bottom:70px;width:340px;max-width:92vw;background:#fff;border:1px solid #ccc;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.25);display:none;z-index:50}
#coachPanel .hd{background:#1d2733;color:#fff;padding:10px 14px;border-radius:12px 12px 0 0;font-weight:700}
#coachLog{height:260px;overflow:auto;padding:10px 14px;font-size:14px}
#coachLog .me{text-align:right;margin:8px 0}#coachLog .bot{margin:8px 0;background:#f1ecdf;border-radius:8px;padding:8px 10px}
#coachPanel .row{display:flex;gap:6px;padding:10px;border-top:1px solid #eee}
#coachPanel input{flex:1;margin:0}
.cert{border:3px double #a05c00;text-align:center;padding:34px;background:#fffdf6}
.cert img{height:70px}
details{margin:4px 0}summary{cursor:pointer;color:#1d5fa8;font-size:13px}
`;
function widget() {
  return `
<div id="coachBtn">Lab Coach</div>
<div id="coachPanel"><div class="hd">Lab Coach — ${LAB_NAME}</div><div id="coachLog"></div>
<div class="row"><input id="coachIn" placeholder="Ask the coach..."><button id="coachSend">Send</button></div></div>
<script>
var cp=document.getElementById('coachPanel'),cl=document.getElementById('coachLog'),ci=document.getElementById('coachIn');
document.getElementById('coachBtn').onclick=function(){cp.style.display=cp.style.display==='block'?'none':'block';};
function addMsg(t,me){var d=document.createElement('div');d.className=me?'me':'bot';d.textContent=t;cl.appendChild(d);cl.scrollTop=cl.scrollHeight;}
function ask(){var m=ci.value.trim();if(!m)return;addMsg(m,true);ci.value='';
fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})})
.then(function(r){return r.json();}).then(function(j){addMsg(j.reply,false);})
.catch(function(){addMsg('Coach unavailable right now.',false);});}
document.getElementById('coachSend').onclick=ask;
ci.addEventListener('keydown',function(e){if(e.key==='Enter')ask();});
</script>`;
}
function layout(user, title, body) {
  const p = progressObj();
  const nav = user
    ? `<a href="/">Listings</a><a href="/my-listings">My Portal</a><a href="/agent">Agent Console</a><a href="/admin">Admin</a><a href="/tests">Mission Board</a><a href="/profile">Profile</a><a href="/logout">Log out</a>`
    : `<a href="/login">Log in</a><a href="/register">Register</a><a href="/tests">Mission Board</a>`;
  // NOTE (lab design): the signed-in display name below is rendered WITHOUT encoding (see test reg-xss).
  const who = user ? `<span>Signed in as ${user.name} (${esc(user.role)})</span>` : '<span>Not signed in</span>';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — LAB ${LAB_NUMBER} ${LAB_NAME}</title><style>${CSS}</style></head><body>
<header><img src="/logo.png" alt="HexaCyberLab logo"><span class="lab">LAB ${LAB_NUMBER} — ${LAB_NAME}</span>
<div class="pbar"><i style="width:${p.pct}%"></i><span>LAB ${LAB_NUMBER} · ${p.done}/${p.total} tests · ${p.pct}%</span></div>
<nav>${nav}</nav>${who}</header>
<main>${body}</main>${widget()}</body></html>`;
}
function gatePage(err) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Locked — LAB ${LAB_NUMBER} ${LAB_NAME}</title><style>${CSS}</style></head><body>
<main style="max-width:560px"><div class="card" style="text-align:center;margin-top:50px">
<img src="/logo.png" alt="HexaCyberLab logo" style="height:64px">
<h1>LAB ${LAB_NUMBER} — ${LAB_NAME}</h1>
<p>This lab is locked. Paste the completion key from Lab ${PREV_LAB} to start.</p>
${err ? '<div class="err">' + esc(err) + '</div>' : ''}
<form method="POST" action="/unlock"><input name="key" placeholder="Paste the key from Lab ${PREV_LAB}" autocomplete="off">
<button type="submit">Unlock Lab ${LAB_NUMBER}</button></form>
<p><small>HexaCyberLab practice labs — local use only.</small></p></div></main>${widget()}</body></html>`;
}
function listingCard(l) {
  return `<div class="card"><h3 style="margin-top:0"><a href="/listings/${l.id}">${esc(l.title)}</a></h3>
<p>${esc(l.city)} · ${l.beds} bed · <span class="price">$${l.price}</span> ${l.featured ? '<span class="tag">FEATURED</span>' : ''} <span class="tag grey">${esc(l.status)}</span></p>
<p><small>${esc(l.desc)}</small></p></div>`;
}
function homePage(user, list, q) {
  return layout(user, 'Listings', `
<h1>Property listings</h1>
<form method="GET" action="/search"><label>Search properties <input name="q" value="${q != null ? q : ''}" placeholder="city, villa, studio..."></label><button type="submit">Search</button></form>
<div class="grid">${list.map(listingCard).join('')}</div>
${list.length === 0 ? '<p>No listings matched.</p>' : ''}`);
}
function listingPage(user, l) {
  const owner = users.find(u => u.id === l.ownerId);
  return layout(user, l.title, `
<div class="card"><h1 style="margin-top:0">${esc(l.title)}</h1>
<p>${esc(l.city)} · ${l.beds} bed · <span class="price">$${l.price}</span> <span class="tag grey">${esc(l.status)}</span> ${l.featured ? '<span class="tag">FEATURED</span>' : ''}</p>
<p>${esc(l.desc)}</p>
<p><small>Listed by ${esc(owner ? owner.name : 'unknown')} · Listing #${l.id}</small></p>
<p><b>Agent notes (internal):</b> ${esc(l.agentNotes)}</p></div>
<div class="card"><h3>Ask about this property</h3>
<form method="POST" action="/inquiries"><input type="hidden" name="hx_origin" value="site">
<input type="hidden" name="listingId" value="${l.id}">
<label>Your email <input name="email" value="${esc(user.email)}"></label>
<label>Your phone <input name="phone" value="${esc(user.phone)}"></label>
<label>Message <textarea name="message" rows="3">I am interested in this property.</textarea></label>
<button type="submit">Send inquiry</button></form></div>
<div class="card"><h3>Book a viewing</h3>
<form method="POST" action="/appointments"><input type="hidden" name="hx_origin" value="site">
<input type="hidden" name="listingId" value="${l.id}">
<label>Slot (e.g. 2026-11-02 10:00) <input name="slot" value="2026-11-05 11:00"></label>
<button type="submit">Book viewing</button></form></div>
<div class="card"><h3>Owner tools</h3>
<p><a class="btn alt" href="/listings/${l.id}/edit">Edit this listing</a></p>
<form method="POST" action="/listings/${l.id}/feature"><input type="hidden" name="hx_origin" value="site">
<input type="hidden" name="amount" value="${FEATURE_PRICE}">
<p>Feature this listing for $${FEATURE_PRICE}. <button type="submit">Feature it</button></p></form>
<form method="POST" action="/listings/${l.id}/photo"><input type="hidden" name="hx_origin" value="site">
<label>Photo file name <input name="filename" value="photo1.jpg"></label>
<label>Photo content (simulated upload) <textarea name="content" rows="2">JPEGDATA</textarea></label>
<button type="submit">Upload photo</button></form></div>`);
}
function testsPage(user) {
  const p = progressObj();
  const byFeature = {};
  TESTS.forEach(t => { (byFeature[t.feature] = byFeature[t.feature] || []).push(t); });
  let html = `<h1>Mission Board — LAB ${LAB_NUMBER} ${LAB_NAME}</h1>
<p>${p.done}/${p.total} tests complete · ${p.pct}% · Attempts are counted per feature; the Lab Coach unlocks step-by-step help for a feature after 3 genuine attempts.</p>`;
  Object.keys(byFeature).forEach(f => {
    html += `<div class="card"><h2 style="margin-top:0">${esc(f)} <small>(${byFeature[f].filter(t => state.tests[t.id]).length}/${byFeature[f].length} · ${state.attempts[f] || 0} attempts)</small></h2>`;
    byFeature[f].forEach(t => {
      const done = !!state.tests[t.id];
      html += `<div style="border-top:1px solid #eee;padding:8px 0"><b>${done ? '✓' : '○'} ${esc(t.name)}</b>
 <small>${esc(t.owasp)} · ${esc(t.difficulty)} · ${done ? 'DONE' : 'OPEN'}</small>
<details><summary>Hint 1</summary><p>${esc(t.hints[0])}</p>
<details><summary>Hint 2</summary><p>${esc(t.hints[1])}</p>
<details><summary>Hint 3</summary><p>${esc(t.hints[2])}</p></details></details></details></div>`;
    });
    html += '</div>';
  });
  return layout(user, 'Mission Board', html);
}
function completePage(user, msg) { if (!user) user = { name: 'Security Tester', email: '', id: 0 };
  const p = progressObj();
  if (!p.complete) {
    const left = TESTS.filter(t => !state.tests[t.id]);
    return layout(user, 'Not complete yet', `<div class="card"><h1>Lab not complete yet</h1>
<p>Progress: ${p.done}/${p.total} tests (${p.pct}%). The completion summary, key and certificate unlock at 100%.</p>
<h3>Still open (${left.length})</h3><ul>${left.map(t => '<li>' + esc(t.name) + ' — ' + esc(t.feature) + '</li>').join('')}</ul>
<p><a class="btn" href="/tests">Back to the Mission Board</a></p></div>`);
  }
  const feats = Object.keys(p.features);
  const name = state.testerName || (user ? user.name : 'Tester');
  let html = `<div class="card"><h1>Lab ${LAB_NUMBER} complete — debrief</h1>${msg || ''}
<h2>1) Features in this lab</h2><p><b>${feats.length} features</b>: ${feats.map(esc).join(', ')}</p>
<h2>2) Vulnerabilities per feature</h2><table><tr><th>Feature</th><th>Tests</th></tr>
${feats.map(f => `<tr><td>${esc(f)}</td><td>${p.features[f].total}</td></tr>`).join('')}</table>
<h2>3) How testing was done (${p.total} techniques)</h2><ul>
${TESTS.map(t => `<li>${esc(t.name)} (${esc(t.feature)})</li>`).join('')}</ul>
<h2>4) What you learned</h2><ul>${TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('')}</ul>
<h2>5) What this means for a real client</h2><ul>${TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('')}</ul>
<h2>6) Writing it in a real report</h2><table><tr><th>Finding</th><th>Severity</th><th>Remediation</th></tr>
${TESTS.map(t => `<tr><td>${esc(t.report.title)}</td><td>${esc(t.report.severity)}</td><td>${esc(t.report.remediation)}</td></tr>`).join('')}</table>
<h2>Your completion key for Lab ${LAB_NUMBER + 1}</h2>
<p style="font-size:20px"><code>${esc(completionKey())}</code></p>
<form method="POST" action="/complete/name"><label>Name for the certificate <input name="testerName" value="${esc(name)}"></label>
<button type="submit">Save name</button></form>
<p><a class="btn alt" href="/certificate">View your certificate</a></p></div>`;
  return layout(user, 'Lab complete', html);
}
function certificatePage(user) { if (!user) user = { name: 'Security Tester', email: '', id: 0 };
  const p = progressObj();
  if (!p.complete) return layout(user, 'Certificate', '<div class="card"><h1>No certificate yet</h1><p>Certificates are issued at 100%. Current progress: ' + p.pct + '%.</p></div>');
  const feats = Object.keys(p.features).length;
  const name = state.testerName || (user ? user.name : 'Tester');
  const date = state.completedAt ? new Date(state.completedAt).toISOString().slice(0, 10) : '';
  return layout(user, 'Certificate', `<div class="cert"><img src="/logo.png" alt="HexaCyberLab logo">
<h1>Certificate of Completion</h1><p>This certifies that</p><h2>${esc(name)}</h2>
<p>has completed 100% of the security tests in LAB ${LAB_NUMBER} — ${LAB_NAME} (${p.total} tests across ${feats} features)</p>
<p>Completed on ${esc(date)}</p><p><b>HexaCyberLab — Built by Md. Jony Hassain, Founder</b></p></div>
<p style="text-align:center"><small>Print this page (Ctrl/Cmd+P) to save your certificate.</small></p>`);
}

// ---------- Lab Coach (§6) ----------
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
const FEATURE_KEYS = [
  ['Login & Authentication', ['login', 'log in', 'password', 'auth', 'brute', 'reset token', 'enumerat', 'cookie', 'demo cred', 'sign in']],
  ['Registration & Profile', ['register', 'sign up', 'signup', 'profile', 'mass assignment', 'display name']],
  ['Saved Searches', ['saved search', 'saved', 'alert']],
  ['Search & Listings', ['search', 'draft', 'catalog', 'catalogue']],
  ['Listings Management', ['edit listing', 'featured', 'feature', 'upload', 'photo']],
  ['Inquiries', ['inquir', 'enquir']],
  ['Appointments', ['appointment', 'viewing', 'slot', 'confirm', 'double-book', 'double book']],
  ['Admin Panel', ['admin']],
  ['Platform & API', ['api', 'debug', 'api key']]
];
function coachReply(message) {
  const m = String(message || '').toLowerCase();
  const p = progressObj();
  if (/(who built|who made|who created|founder|who is behind)/.test(m)) return ATTRIBUTION;
  if (m.includes('key')) {
    if (p.complete) return 'You completed LAB ' + LAB_NUMBER + ' — congratulations! Your completion key for the next lab is: ' + completionKey();
    return 'I do not have the completion key yet — it is only revealed to me when this lab reaches 100%. You are at ' + p.pct + '% (' + p.done + '/' + p.total + ' tests). Finish every test on the Mission Board and the key appears on the completion page — and I will be able to share it too.';
  }
  let feature = null;
  for (const [f, keys] of FEATURE_KEYS) { if (keys.some(k => m.includes(k))) { feature = f; break; } }
  if (m.includes('progress') || m.includes('next') || m.includes('how am i')) {
    const next = TESTS.find(t => !state.tests[t.id]);
    return 'Progress: ' + p.done + '/' + p.total + ' tests (' + p.pct + '%).' + (next ? ' Next open test: "' + next.name + '" in ' + next.feature + '. Open the Mission Board (/tests) for its hints.' : ' Everything is done — see /complete for your key and certificate.');
  }
  if (m.includes('how many') || m.includes('list') || m.includes('features') || m.includes('vulnerabilit')) {
    if (feature) {
      const list = TESTS.filter(t => t.feature === feature);
      return feature + ' has ' + list.length + ' tests: ' + list.map(t => t.name).join('; ') + '. The map is public — but step-by-step help unlocks after 3 genuine attempts on that feature.';
    }
    const counts = Object.keys(p.features).map(f => f + ': ' + p.features[f].total).join(' · ');
    return LAB_NAME + ' has ' + p.total + ' tests across ' + Object.keys(p.features).length + ' features. ' + counts + '. Ask me about any feature by name.';
  }
  if (feature) {
    const list = TESTS.filter(t => t.feature === feature);
    const open = list.filter(t => !state.tests[t.id]);
    const att = state.attempts[feature] || 0;
    if (open.length === 0) return 'All ' + feature + ' tests are already complete. Well done — pick another feature from the Mission Board.';
    if (att >= 3) {
      return 'Step by step for ' + feature + ' (you have ' + att + ' attempts logged):\n' + open.map((t, i) => (i + 1) + '. ' + t.name + ' — ' + t.hints[2]).join('\n');
    }
    return "That feature is locked for help. First try the " + feature + " tests yourself at least 3 times — I can see you've tried " + att + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  if (/^(hi|hello|hey|help)/.test(m) || m.includes('help') || m === '') {
    return 'Welcome to LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '. There are ' + p.total + ' tests across ' + Object.keys(p.features).length + ' features; you have completed ' + p.done + ' (' + p.pct + '%). Work from the Mission Board (/tests): every test shows 3 graded hints. After 3 genuine attempts on a feature, ask me here and I will guide you step by step.';
  }
  return 'I can help with the tests in this lab: ask me how many tests a feature has, ask for step-by-step help with a feature (unlocked after 3 genuine attempts on it), or ask about your progress. The Mission Board (/tests) lists everything.';
}

// ---------- router & handlers ----------
function requireLogin(req, res) {
  const user = currentUser(req);
  if (!user) { redirect(res, '/login'); return null; }
  return user;
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://127.0.0.1:' + PORT);
    const pathName = u.pathname;
    const method = req.method;

    if (pathName === '/logo.png') {
      try { const data = fs.readFileSync(LOGO_PATH); send(res, 200, data, { 'Content-Type': 'image/png' }); }
      catch (e) { send(res, 404, 'logo missing'); }
      return;
    }
    if (pathName === '/unlock' && method === 'POST') {
      const body = await readBody(req);
      const given = String(body.key || '');
      if (entryKeyMatches(given)) { state.unlocked = true; save(); redirect(res, '/'); }
      else send(res, 403, gatePage('That key was not accepted.'));
      return;
    }
    if (pathName === '/api/progress') { json(res, 200, progressObj()); return; }
    if (pathName === '/api/chat' && method === 'POST') {
      const body = await readBody(req);
      json(res, 200, { reply: coachReply(body.message) });
      return;
    }
    if (pathName === '/api/debug') {
      pass('api-debug');
      attempt('Platform & API');
      json(res, 200, { debug: true, users: users.map(x => ({ id: x.id, name: x.name, email: x.email, password: x.password, role: x.role, active: x.active })) });
      return;
    }
    if (pathName === '/api/my-data') {
      const key = req.headers['x-api-key'] || '';
      let decoded = '';
      try { decoded = Buffer.from(String(key), 'base64').toString('utf8'); } catch (e) { decoded = ''; }
      const target = users.find(x => x.email === decoded);
      const sessionUser = currentUser(req);
      if (target && !sessionUser) {
        pass('api-token');
        attempt('Platform & API');
        json(res, 200, {
          user: { id: target.id, email: target.email, role: target.role },
          listings: listings.filter(l => l.ownerId === target.id),
          inquiries: inquiries.filter(i => i.buyerId === target.id),
          savedSearches: savedSearches.filter(s => s.userId === target.id)
        });
      } else if (target) {
        json(res, 200, { user: { id: target.id, email: target.email }, note: 'session present' });
      } else json(res, 401, { error: 'invalid api key' });
      return;
    }

    // ---- lock gate (§5) ----
    if (!state.unlocked) { send(res, 200, gatePage()); return; }

    // ---- auth pages ----
    if (pathName === '/login' && method === 'GET') {
      send(res, 200, layout(null, 'Log in', `<div class="card"><h1>Log in to HexaProperty</h1>
<form method="POST" action="/login"><label>Email <input name="email" autocomplete="off"></label>
<label>Password <input name="password" type="password"></label>
<button type="submit">Log in</button></form>
<p><a href="/forgot">Forgot your password?</a> · <a href="/register">Create an account</a></p>
<div class="ok"><b>Demo account (feel free to try):</b> bella@hexaproperty.local / bella123</div></div>`));
      return;
    }
    if (pathName === '/login' && method === 'POST') {
      const body = await readBody(req);
      attempt('Login & Authentication');
      const email = String(body.email || ''), password = String(body.password || '');
      // VULNERABLE (by design): the query is built by string concatenation and evaluated as SQL.
      const query = "email = '" + email + "' AND password = '" + password + "'";
      const user = users.find(x => x.active && evalWhere(x, query));
      if (user) {
        if (user.password !== password) pass('auth-sqli');
        if (user.demo) pass('auth-demo');
        const sid = newSession(user.id);
        redirect(res, '/', { 'Set-Cookie': ['hx_session=' + sid + '; Path=/; HttpOnly', 'hx_role=' + user.role + '; Path=/'] });
      } else {
        const acct = users.find(x => x.email === email);
        if (acct) {
          failedLogins[email] = (failedLogins[email] || 0) + 1;
          if (failedLogins[email] >= 10) pass('auth-brute');
          send(res, 200, layout(null, 'Log in', '<div class="card"><div class="err">Wrong password for this account.</div><p><a href="/login">Try again</a></p></div>'));
        } else {
          send(res, 200, layout(null, 'Log in', '<div class="card"><div class="err">No account with that email address.</div><p><a href="/login">Try again</a></p></div>'));
        }
      }
      return;
    }
    if (pathName === '/logout') {
      const c = parseCookies(req);
      if (c.hx_session) delete sessions[c.hx_session];
      redirect(res, '/login', { 'Set-Cookie': ['hx_session=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0'] });
      return;
    }
    if (pathName === '/register' && method === 'GET') {
      send(res, 200, layout(null, 'Register', `<div class="card"><h1>Create your account</h1>
<form method="POST" action="/register"><label>Full name <input name="name"></label>
<label>Email <input name="email"></label>
<label>Password (8+ characters, mix of letters and numbers) <input name="password" type="password"></label>
<button type="submit">Register</button></form></div>`));
      return;
    }
    if (pathName === '/register' && method === 'POST') {
      const body = await readBody(req);
      attempt('Registration & Profile');
      const email = String(body.email || '');
      if (!email || users.some(x => x.email === email)) { send(res, 400, layout(null, 'Register', '<div class="card"><div class="err">Email missing or already registered.</div></div>')); return; }
      // VULNERABLE (by design): no server-side password policy; extra body fields are copied onto the account.
      const user = {
        id: nextUserId++, name: String(body.name || 'New User'), email,
        password: String(body.password || ''), role: 'buyer', phone: String(body.phone || ''),
        demo: false, active: true, featuredCredits: 0
      };
      if (body.role && ['buyer', 'owner', 'agent', 'admin'].includes(String(body.role))) user.role = String(body.role);
      if (body.featuredCredits != null && !isNaN(parseInt(body.featuredCredits, 10))) user.featuredCredits = parseInt(body.featuredCredits, 10);
      users.push(user);
      if (user.password.length < 6) pass('reg-weak');
      if (user.role !== 'buyer' || user.featuredCredits > 0) pass('reg-mass');
      if (hasXss(user.name)) pass('reg-xss');
      redirect(res, '/login');
      return;
    }
    if (pathName === '/forgot' && method === 'GET') {
      send(res, 200, layout(null, 'Forgot password', `<div class="card"><h1>Forgot your password?</h1>
<form method="POST" action="/forgot"><label>Email <input name="email"></label>
<button type="submit">Email me a reset link</button></form></div>`));
      return;
    }
    if (pathName === '/forgot' && method === 'POST') {
      const body = await readBody(req);
      attempt('Login & Authentication');
      const email = String(body.email || '');
      forgotProbes.add(email);
      if (forgotProbes.size >= 5) pass('auth-enum');
      const user = users.find(x => x.email === email);
      if (user) {
        issuedResetTokens.add(email + ':' + resetTokenFor(user));
        send(res, 200, layout(null, 'Forgot password', '<div class="card"><div class="ok">A reset link has been emailed to ' + esc(email) + '. (Demo note: in this local lab, use the form at <a href="/reset">/reset</a> with the token from that email.)</div></div>'));
      } else {
        send(res, 200, layout(null, 'Forgot password', '<div class="card"><div class="err">No account found for that email address.</div></div>'));
      }
      return;
    }
    if (pathName === '/reset' && method === 'GET') {
      send(res, 200, layout(null, 'Reset password', `<div class="card"><h1>Reset your password</h1>
<form method="POST" action="/reset"><label>Email <input name="email"></label>
<label>Reset token from your email <input name="token"></label>
<label>New password <input name="newpassword" type="password"></label>
<button type="submit">Set new password</button></form></div>`));
      return;
    }
    if (pathName === '/reset' && method === 'POST') {
      const body = await readBody(req);
      attempt('Login & Authentication');
      const email = String(body.email || ''), token = String(body.token || '');
      const user = users.find(x => x.email === email);
      if (user && token === resetTokenFor(user)) {
        if (!issuedResetTokens.has(email + ':' + token)) pass('auth-reset');
        issuedResetTokens.delete(email + ':' + token);
        user.password = String(body.newpassword || 'changed123');
        failedLogins[email] = 0;
        send(res, 200, layout(null, 'Reset password', '<div class="card"><div class="ok">Password updated. <a href="/login">Log in</a></div></div>'));
      } else {
        send(res, 200, layout(null, 'Reset password', '<div class="card"><div class="err">Invalid token.</div></div>'));
      }
      return;
    }

    // ---- everything below requires a session ----
    const user = (pathName === '/complete' || pathName === '/complete/name' || pathName === '/certificate') ? currentUser(req) : requireLogin(req, res);
    if (!user && pathName !== '/complete' && pathName !== '/complete/name' && pathName !== '/certificate') return;

    if (pathName === '/profile' && method === 'GET') {
      send(res, 200, layout(user, 'Profile', `<div class="card"><h1>Your profile</h1>
<p>Name: ${user.name}<br>Email: ${esc(user.email)}<br>Role: ${esc(user.role)}<br>Featured credits: ${user.featuredCredits}</p>
<form method="POST" action="/profile"><input type="hidden" name="hx_origin" value="site">
<label>Display name <input name="name" value="${esc(user.name)}"></label>
<label>Phone <input name="phone" value="${esc(user.phone)}"></label>
<button type="submit">Save profile</button></form></div>`));
      return;
    }
    if (pathName === '/profile' && method === 'POST') {
      const body = await readBody(req);
      attempt('Registration & Profile');
      const before = user.name + '|' + user.phone;
      if (body.name != null) user.name = String(body.name);
      if (body.phone != null) user.phone = String(body.phone);
      if (body.email != null && String(body.email)) user.email = String(body.email);
      if (hasXss(user.name)) pass('reg-xss');
      if (String(body.hx_origin || '') !== 'site' && (user.name + '|' + user.phone) !== before) pass('profile-csrf');
      redirect(res, '/profile');
      return;
    }

    if (pathName === '/' && method === 'GET') {
      const visible = listings.filter(l => l.status !== 'draft' || l.ownerId === user.id || user.role === 'admin');
      send(res, 200, homePage(user, visible, ''));
      return;
    }
    if (pathName === '/search' && method === 'GET') {
      attempt('Search & Listings');
      const q = u.searchParams.get('q') || '';
      // VULNERABLE (by design): string-built query; drafts are meant to be filtered by it.
      const query = "title LIKE '%" + q + "%' OR city LIKE '%" + q + "%' AND status = 'active'";
      let rows = listings.filter(l => evalWhere(l, query));
      const injected = /'|--/.test(q) || /\b(or|and)\b/i.test(q);
      if (!injected) rows = rows.filter(l => l.status !== 'draft' || l.ownerId === user.id || user.role === 'admin');
      if (injected && rows.some(l => l.status === 'draft' && l.ownerId !== user.id && user.role !== 'admin')) pass('search-sqli');
      if (hasXss(q)) pass('search-xss');
      // NOTE (lab design): the search term below is reflected WITHOUT encoding (see test search-xss).
      const head = `<div class="card"><h1>Results for "${q}"</h1><p>${rows.length} propert${rows.length === 1 ? 'y' : 'ies'} found.</p>
<p><a href="/">Back to all listings</a></p></div><div class="grid">${rows.map(listingCard).join('')}</div>`;
      send(res, 200, layout(user, 'Search', head));
      return;
    }
    const listingView = /^\/listings\/(\d+)$/.exec(pathName);
    if (listingView && method === 'GET') {
      attempt('Search & Listings');
      const l = listings.find(x => x.id === parseInt(listingView[1], 10));
      if (!l) { send(res, 404, layout(user, 'Not found', '<div class="card"><h1>Listing not found</h1></div>')); return; }
      // VULNERABLE (by design): draft listings are served by direct URL, agent notes included.
      if (l.status === 'draft' && l.ownerId !== user.id && user.role !== 'admin') pass('listing-draft');
      send(res, 200, listingPage(user, l));
      return;
    }
    const listingEdit = /^\/listings\/(\d+)\/edit$/.exec(pathName);
    if (listingEdit && method === 'GET') {
      const l = listings.find(x => x.id === parseInt(listingEdit[1], 10));
      if (!l) { send(res, 404, layout(user, 'Not found', '<div class="card"><h1>Listing not found</h1></div>')); return; }
      send(res, 200, layout(user, 'Edit listing', `<div class="card"><h1>Edit listing #${l.id}</h1>
<form method="POST" action="/listings/${l.id}/edit"><input type="hidden" name="hx_origin" value="site">
<label>Title <input name="title" value="${esc(l.title)}"></label>
<label>Price (USD) <input name="price" value="${l.price}"></label>
<label>Description <textarea name="desc" rows="3">${esc(l.desc)}</textarea></label>
<button type="submit">Save changes</button></form></div>`));
      return;
    }
    if (listingEdit && method === 'POST') {
      const body = await readBody(req);
      attempt('Listings Management');
      const l = listings.find(x => x.id === parseInt(listingEdit[1], 10));
      if (!l) { send(res, 404, 'not found'); return; }
      // VULNERABLE (by design): no ownership check on edit.
      if (body.title != null) l.title = String(body.title);
      if (body.price != null && !isNaN(parseInt(body.price, 10))) l.price = parseInt(body.price, 10);
      if (body.desc != null) l.desc = String(body.desc);
      if (l.ownerId !== user.id && user.role !== 'admin') pass('listing-edit-idor');
      redirect(res, '/listings/' + l.id);
      return;
    }
    const listingFeature = /^\/listings\/(\d+)\/feature$/.exec(pathName);
    if (listingFeature && method === 'POST') {
      const body = await readBody(req);
      attempt('Listings Management');
      const l = listings.find(x => x.id === parseInt(listingFeature[1], 10));
      if (!l) { send(res, 404, 'not found'); return; }
      // VULNERABLE (by design): the amount the client posts is trusted as the price paid.
      const amount = parseInt(body.amount, 10);
      l.featured = true;
      l.featuredPaid = isNaN(amount) ? 0 : amount;
      if (l.featuredPaid !== FEATURE_PRICE) pass('listing-feature-tamper');
      redirect(res, '/listings/' + l.id);
      return;
    }
    const listingPhoto = /^\/listings\/(\d+)\/photo$/.exec(pathName);
    if (listingPhoto && method === 'POST') {
      const body = await readBody(req);
      attempt('Listings Management');
      const filename = String(body.filename || 'photo.jpg').replace(/[\\/]/g, '');
      const content = String(body.content || '');
      uploads[filename] = content;
      const ext = (filename.split('.').pop() || '').toLowerCase();
      if (['html', 'htm', 'svg'].includes(ext) && content.includes('<')) pass('upload-html');
      redirect(res, '/listings/' + listingPhoto[1]);
      return;
    }
    if (pathName.startsWith('/uploads/')) {
      const name = decodeURIComponent(pathName.slice('/uploads/'.length)).replace(/[\\/]/g, '');
      if (Object.prototype.hasOwnProperty.call(uploads, name)) {
        const ext = (name.split('.').pop() || '').toLowerCase();
        const ct = ext === 'html' || ext === 'htm' ? 'text/html' : ext === 'svg' ? 'image/svg+xml' : 'application/octet-stream';
        send(res, 200, uploads[name], { 'Content-Type': ct });
      } else send(res, 404, 'not found');
      return;
    }

    if (pathName === '/inquiries' && method === 'POST') {
      const body = await readBody(req);
      attempt('Inquiries');
      const l = listings.find(x => x.id === parseInt(body.listingId, 10));
      if (!l) { send(res, 404, 'listing not found'); return; }
      inquiries.push({ id: nextInquiryId++, listingId: l.id, buyerId: user.id, message: String(body.message || ''), email: String(body.email || user.email), phone: String(body.phone || '') });
      redirect(res, '/listings/' + l.id);
      return;
    }
    const inquiryView = /^\/inquiries\/(\d+)$/.exec(pathName);
    if (inquiryView && method === 'GET') {
      attempt('Inquiries');
      const inq = inquiries.find(x => x.id === parseInt(inquiryView[1], 10));
      if (!inq) { send(res, 404, layout(user, 'Not found', '<div class="card"><h1>Inquiry not found</h1></div>')); return; }
      const l = listings.find(x => x.id === inq.listingId);
      // VULNERABLE (by design): any signed-in user can read any inquiry, contact details included.
      if (inq.buyerId !== user.id && (!l || l.ownerId !== user.id) && user.role !== 'admin') pass('inquiry-idor');
      send(res, 200, layout(user, 'Inquiry', `<div class="card"><h1>Inquiry #${inq.id}</h1>
<p>Listing: ${l ? esc(l.title) : inq.listingId}</p><p>From: ${esc(inq.email)} · Phone: ${esc(inq.phone)}</p>
<p>${esc(inq.message)}</p>
<form method="POST" action="/inquiries/${inq.id}/delete"><button type="submit">Delete this inquiry</button></form></div>`));
      return;
    }
    const inquiryDelete = /^\/inquiries\/(\d+)\/delete$/.exec(pathName);
    if (inquiryDelete && method === 'POST') {
      await readBody(req);
      attempt('Inquiries');
      const idx = inquiries.findIndex(x => x.id === parseInt(inquiryDelete[1], 10));
      if (idx >= 0) {
        const inq = inquiries[idx];
        const l = listings.find(x => x.id === inq.listingId);
        // VULNERABLE (by design): no check that the caller may delete this inquiry.
        if (inq.buyerId !== user.id && (!l || l.ownerId !== user.id) && user.role !== 'admin') pass('inquiry-delete-idor');
        inquiries.splice(idx, 1);
      }
      redirect(res, '/my-listings');
      return;
    }

    if (pathName === '/appointments' && method === 'POST') {
      const body = await readBody(req);
      attempt('Appointments');
      const l = listings.find(x => x.id === parseInt(body.listingId, 10));
      if (!l) { send(res, 404, 'listing not found'); return; }
      const slot = String(body.slot || '');
      // VULNERABLE (by design): no check that the slot is already taken.
      const clash = appointments.some(a => a.listingId === l.id && a.slot === slot && a.status !== 'cancelled');
      appointments.push({ id: nextAppointmentId++, listingId: l.id, buyerId: user.id, slot, status: 'pending' });
      if (clash) pass('appt-overbook');
      redirect(res, '/my-listings');
      return;
    }
    const apptView = /^\/appointments\/(\d+)$/.exec(pathName);
    if (apptView && method === 'GET') {
      attempt('Appointments');
      const a = appointments.find(x => x.id === parseInt(apptView[1], 10));
      if (!a) { send(res, 404, layout(user, 'Not found', '<div class="card"><h1>Appointment not found</h1></div>')); return; }
      const l = listings.find(x => x.id === a.listingId);
      send(res, 200, layout(user, 'Appointment', `<div class="card"><h1>Viewing #${a.id}</h1>
<p>Listing: ${l ? esc(l.title) : a.listingId} · Slot: ${esc(a.slot)} · Status: <b>${esc(a.status)}</b></p>
<form method="POST" action="/appointments/${a.id}/confirm" style="display:inline"><button type="submit">Confirm viewing</button></form>
<form method="POST" action="/appointments/${a.id}/cancel" style="display:inline"><button type="submit" class="alt">Cancel viewing</button></form></div>`));
      return;
    }
    const apptCancel = /^\/appointments\/(\d+)\/cancel$/.exec(pathName);
    if (apptCancel && method === 'POST') {
      await readBody(req);
      attempt('Appointments');
      const a = appointments.find(x => x.id === parseInt(apptCancel[1], 10));
      if (a) {
        const l = listings.find(x => x.id === a.listingId);
        // VULNERABLE (by design): anyone can cancel anyone's viewing.
        if (a.buyerId !== user.id && (!l || l.ownerId !== user.id) && user.role !== 'admin') pass('appt-cancel-idor');
        a.status = 'cancelled';
      }
      redirect(res, '/my-listings');
      return;
    }
    const apptConfirm = /^\/appointments\/(\d+)\/confirm$/.exec(pathName);
    if (apptConfirm && method === 'POST') {
      await readBody(req);
      attempt('Appointments');
      const a = appointments.find(x => x.id === parseInt(apptConfirm[1], 10));
      if (a) {
        const l = listings.find(x => x.id === a.listingId);
        // VULNERABLE (by design): confirmation should be owner/agent-only, but the server never checks.
        const entitled = (l && l.ownerId === user.id) || user.role === 'agent' || user.role === 'admin';
        if (!entitled) pass('appt-confirm');
        a.status = 'confirmed';
      }
      redirect(res, '/my-listings');
      return;
    }

    const savedView = /^\/saved\/(\d+)$/.exec(pathName);
    if (savedView && method === 'GET') {
      attempt('Saved Searches');
      const s = savedSearches.find(x => x.id === parseInt(savedView[1], 10));
      if (!s) { send(res, 404, layout(user, 'Not found', '<div class="card"><h1>Saved search not found</h1></div>')); return; }
      // VULNERABLE (by design): any signed-in user can read any saved search.
      if (s.userId !== user.id) pass('saved-idor');
      send(res, 200, layout(user, 'Saved search', `<div class="card"><h1>Saved search #${s.id}</h1>
<p>Query: ${esc(s.query)}<br>Max budget: $${s.maxPrice}<br>Alert email: ${esc(s.email)}</p></div>`));
      return;
    }

    if (pathName === '/my-listings' && method === 'GET') {
      const mine = listings.filter(l => l.ownerId === user.id);
      const myInq = inquiries.filter(i => { const l = listings.find(x => x.id === i.listingId); return (l && l.ownerId === user.id) || i.buyerId === user.id; });
      const myAppt = appointments.filter(a => a.buyerId === user.id || (listings.find(x => x.id === a.listingId) || {}).ownerId === user.id);
      const mySaved = savedSearches.filter(s => s.userId === user.id);
      send(res, 200, layout(user, 'My Portal', `<div class="card"><h1>My Portal</h1>
<h3>My listings</h3>${mine.length ? mine.map(l => `<p><a href="/listings/${l.id}">${esc(l.title)}</a> — $${l.price} (${esc(l.status)})</p>`).join('') : '<p>None.</p>'}
<h3>Inquiries</h3>${myInq.length ? myInq.map(i => `<p><a href="/inquiries/${i.id}">Inquiry #${i.id}</a> on listing ${i.listingId} from ${esc(i.email)}</p>`).join('') : '<p>None.</p>'}
<h3>My viewing appointments</h3>${myAppt.length ? myAppt.map(a => `<p><a href="/appointments/${a.id}">Viewing #${a.id}</a> — listing ${a.listingId} at ${esc(a.slot)} (${esc(a.status)})</p>`).join('') : '<p>None.</p>'}
<h3>My saved searches</h3>${mySaved.length ? mySaved.map(s => `<p><a href="/saved/${s.id}">${esc(s.query)}</a> up to $${s.maxPrice}</p>`).join('') : '<p>None.</p>'}</div>`));
      return;
    }

    if (pathName === '/agent' && method === 'GET') {
      const role = effectiveRole(req, user);
      if (!['agent', 'owner', 'admin'].includes(role)) { send(res, 403, layout(user, 'Agents only', '<div class="card"><h1>Agents only</h1><p>Your role does not include the agent console.</p></div>')); return; }
      // VULNERABLE (by design): the role above can come straight from the client cookie.
      if (!['agent', 'owner', 'admin'].includes(user.role)) pass('auth-cookie');
      send(res, 200, layout(user, 'Agent Console', `<div class="card"><h1>Agent Console</h1>
<p>Commission this month: <b>$4,280</b> · Active clients: 17</p>
<table><tr><th>Client</th><th>Listing</th><th>Commission</th></tr>
<tr><td>Bella Buyer</td><td>Sunny 3BR Apartment in Gulshan</td><td>$1,700</td></tr>
<tr><td>Ben Buyer</td><td>Downtown Studio Loft</td><td>$900</td></tr>
<tr><td>Walk-in client (confidential)</td><td>Lakeview Villa (Unlisted)</td><td>$4,800</td></tr></table></div>`));
      return;
    }

    if (pathName === '/admin' && method === 'GET') {
      // VULNERABLE (by design): any signed-in user can open the admin panel.
      if (user.role !== 'admin') pass('admin-bac');
      const rows = users.map(x => `<tr><td>${x.id}</td><td>${x.name}</td><td>${esc(x.email)}</td><td>${esc(x.password)}</td><td>${esc(x.role)}</td><td>${x.active ? 'active' : 'DEACTIVATED'}</td>
<td><form method="POST" action="/admin/deactivate"><input type="hidden" name="hx_origin" value="site"><input type="hidden" name="userId" value="${x.id}"><button type="submit">Deactivate</button></form></td></tr>`).join('');
      send(res, 200, layout(user, 'Admin', `<div class="card"><h1>Admin — all users</h1>
<table><tr><th>ID</th><th>Name</th><th>Email</th><th>Password</th><th>Role</th><th>Status</th><th>Action</th></tr>${rows}</table></div>`));
      return;
    }
    if (pathName === '/admin/deactivate' && method === 'POST') {
      const body = await readBody(req);
      attempt('Admin Panel');
      if (user.role !== 'admin') { send(res, 403, 'admins only'); return; }
      const target = users.find(x => x.id === parseInt(body.userId, 10));
      if (target) {
        target.active = false;
        // VULNERABLE (by design): the hx_origin marker is never verified.
        if (String(body.hx_origin || '') !== 'site') pass('admin-csrf');
      }
      redirect(res, '/admin');
      return;
    }

    if (pathName === '/tests' && method === 'GET') { send(res, 200, testsPage(user)); return; }
    if (pathName === '/complete' && method === 'GET') { send(res, 200, completePage(user)); return; }
    if (pathName === '/complete/name' && method === 'POST') {
      const body = await readBody(req);
      if (body.testerName != null && String(body.testerName).trim()) { state.testerName = String(body.testerName).trim(); save(); }
      redirect(res, '/complete');
      return;
    }
    if (pathName === '/certificate' && method === 'GET') { send(res, 200, certificatePage(user)); return; }

    send(res, 404, layout(user, 'Not found', '<div class="card"><h1>404 — page not found</h1></div>'));
  } catch (e) {
    try { send(res, 500, 'Internal error (lab stays up).'); } catch (e2) { /* socket already gone */ }
  }
});

// --- key shard region D (completion key, second half) ---
const _cB = ["LVBWTA==","VURNUg==","NUk2NA=="];

// ---------- docs generation (from the TESTS registry) ----------
function genDocs() {
  const byFeature = {};
  TESTS.forEach(t => { (byFeature[t.feature] = byFeature[t.feature] || []).push(t); });
  const feats = Object.keys(byFeature);
  let vuln = '# HexaProperty (LAB 91) — Vulnerability Map\n\n';
  vuln += 'All ' + TESTS.length + ' scored tests, grouped by feature. A test flips to DONE only when the exploit\u2019s real effect is observed by the server.\n';
  feats.forEach(f => {
    vuln += '\n## ' + f + '\n';
    byFeature[f].forEach(t => {
      vuln += '\n### ' + t.name + '\n- OWASP: ' + t.owasp + '\n- Difficulty: ' + t.difficulty + '\n- Report severity: ' + t.report.severity + '\n- What it teaches: ' + t.lesson + '\n- Client impact: ' + t.impact + '\n';
    });
  });
  fs.writeFileSync(path.join(__dirname, 'VULNERABILITIES.md'), vuln);
  const diffRank = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  let guide = '# HexaProperty (LAB 91) — Practice Guide\n\nChallenges grouped by feature, then difficulty. Each has 3 graded hints and one measurable objective: make the test flip to DONE on the Mission Board (/tests) by producing the real exploit effect.\n';
  feats.forEach(f => {
    guide += '\n## ' + f + '\n';
    byFeature[f].slice().sort((a, b) => diffRank[a.difficulty] - diffRank[b.difficulty]).forEach(t => {
      guide += '\n### ' + t.name + ' (' + t.difficulty + ')\n- Objective: trigger the real effect of this flaw so the server marks the test DONE.\n- Hint 1: ' + t.hints[0] + '\n- Hint 2: ' + t.hints[1] + '\n- Hint 3: ' + t.hints[2] + '\n';
    });
  });
  fs.writeFileSync(path.join(__dirname, 'PRACTICE-GUIDE.md'), guide);
  let fix = '# HexaProperty (LAB 91) — Fix & Retest\n\nFor every test: the secure implementation, and the regression check that proves the fix.\n';
  TESTS.forEach(t => {
    fix += '\n## ' + t.report.title + ' (' + t.report.severity + ')\n- Secure implementation: ' + t.report.remediation + '\n- Regression test: re-run the original exploit for "' + t.name + '" — it must now fail (no test progress, no data change) — then confirm the legitimate flow still works for authorised users.\n';
  });
  fs.writeFileSync(path.join(__dirname, 'FIX-AND-RETEST.md'), fix);
  console.log('Docs generated from registry:', TESTS.length, 'tests across', feats.length, 'features.');
}

if (process.argv.includes('--gen-docs')) {
  genDocs();
} else {
  server.listen(PORT, '127.0.0.1', () => {
    console.log('LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ' listening on http://127.0.0.1:' + PORT);
  });
}
