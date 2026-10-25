'use strict';
/* ============================================================================
   HexaTutor — LAB 54 (Category 6: Education & E-learning)
   A deliberately vulnerable tutor marketplace for security training.
   LOCAL USE ONLY. Zero-dependency Node.js. All data is fake seed data.
   ============================================================================ */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3063;
const HOST = '127.0.0.1';
const LAB_NUMBER = 54;
const LAB_NAME = 'HexaTutor';
const PROGRESS_FILE = path.join(__dirname, 'progress.json');
const LOGO_FILE = path.join(__dirname, 'logo.png');

/* --- entry key material: encoded shards only, never a plain literal ------- */

function _unshard(parts) {
  return parts.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}
const ENTRY_KEY_SHA256 = 'c93174a9cf701cc742a12ad65775bfe3db9b4891b1a06d965e70901087aa2ae0';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */

/* ============================ TESTS registry ============================== */
const TESTS = [
  /* ------------------------- Login & Authentication ---------------------- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL Injection — Login Bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: [
      'The login check is built by gluing your input into a query string.',
      'Try a single quote in the email field, then a condition that is always true.',
      "Email: ' OR '1'='1' -- with any password — you are logged in as the first user in the table (the admin)."
    ],
    how: "Go to /login. In the email field type ' OR '1'='1' -- and any password, then submit. The string-built query matches the first user row, so a session is created without knowing any real password.",
    lesson: 'String-built queries let attacker input change the meaning of the query itself — authentication falls without any password being guessed.',
    impact: 'On a real client site this is a full account takeover of the first account in the table — usually the administrator — from the public login page, no credentials needed.',
    report: { title: 'SQL Injection in Login Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries/prepared statements everywhere; never concatenate user input into SQL.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limiting or Lockout', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: [
      'Nothing slows you down, and nothing locks the account.',
      'Script 10 or more wrong passwords for one account and compare the responses.',
      'After 10 failures the app still answers with the same plain "invalid" message — no lockout, no CAPTCHA, no delay.'
    ],
    how: 'Pick one account (e.g. alice@hexatutor.local) and submit 10 wrong passwords in a row. Every attempt is processed at full speed; watch the 10th failure — the app still does not lock or throttle.',
    lesson: 'Without throttling, lockout or MFA, an attacker can try unlimited passwords against any account at machine speed.',
    impact: 'A client’s users can be password-sprayed or credential-stuffed indefinitely; weak passwords will eventually fall and accounts are taken over.',
    report: { title: 'Missing Rate Limiting and Account Lockout on Login', severity: 'High', remediation: 'Add progressive delays/lockout per account and IP, CAPTCHA after repeated failures, and consider MFA.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User Enumeration via Forgot Password', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    hints: [
      'Compare the answers for accounts that exist and accounts that do not.',
      'The forgot-password page is chattier than it should be.',
      'Probe 5+ different emails on /forgot: real accounts get "reset link sent", unknown ones get a visibly different answer.'
    ],
    how: 'Go to /forgot and submit at least 5 different email addresses, mixing real accounts (alice@hexatutor.local) with invented ones (ghost@nowhere.test). Note the different responses — that difference is an account-existence oracle.',
    lesson: 'Different responses for existing vs non-existing accounts hand attackers a verified list of targets for phishing and password attacks.',
    impact: 'Attackers can harvest a client’s real user list, then aim password spraying and phishing precisely at accounts that exist.',
    report: { title: 'User Enumeration Through Differential Forgot-Password Responses', severity: 'Medium', remediation: 'Return one identical generic message for every forgot-password submission, regardless of whether the account exists.' } },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Default Administrator Credentials Still Active', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: [
      'The demo ships with an admin account that was never changed.',
      'The login page itself names the demo administrator.',
      'admin@hexatutor.local with password admin123 — the shipped default still works.'
    ],
    how: 'On /login, sign in as admin@hexatutor.local with the password admin123. Those are the credentials the demo shipped with, and they were never rotated.',
    lesson: 'Default and demo credentials are public knowledge; leaving them active is the same as publishing the admin password.',
    impact: 'Anyone on the internet can try the well-known default and own the client’s admin panel — full control of users, money and data.',
    report: { title: 'Default Administrator Credentials Were Never Changed', severity: 'Critical', remediation: 'Force a password change on first login, remove demo accounts from production, and audit for shipped defaults.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    hints: [
      'Ask for a reset for your own account and study the shape of the token.',
      'The token is computed from something an attacker already knows about the victim.',
      'Token = RST<userId>-<userId*137+42>. Compute the token for Carol (user id 4) yourself and reset her password without ever requesting a reset for her.'
    ],
    how: 'The reset token for a user is RST<id>-<id*137+42>. For Carol (id 4) that is one short calculation. Go to /reset, enter her email, the token you computed, and a new password — the account is yours, and no reset was ever requested for her.',
    lesson: 'Reset tokens must be unguessable random values; a token derived from a public user id is an account-takeover formula.',
    impact: 'Any user’s password can be reset by anyone who can see a user id — silent, complete account takeover on a real client platform.',
    report: { title: 'Password-Reset Tokens Are Predictable (Derived From User ID)', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), store only a hash, expire them quickly and make them single-use.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Session Role Cookie Tampering', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: [
      'The admin gate trusts something your own browser sends.',
      'Look at your cookies after logging in — one of them sounds like a role.',
      'Set the cookie hx_role=admin and open /admin while logged in as a student.'
    ],
    how: 'Log in as any student. In your browser (or with curl) set the cookie hx_role=admin, then open /admin. The server believes the client-supplied role cookie instead of the session, and the admin panel opens.',
    lesson: 'Authorisation data must live server-side; anything the client sends (cookies, hidden fields) can be rewritten by the client.',
    impact: 'Every registered user of a client site can promote themselves to administrator just by editing a cookie — total platform compromise.',
    report: { title: 'Privilege Escalation via Client-Controlled Role Cookie', severity: 'Critical', remediation: 'Keep roles in the server-side session only; never trust role or privilege values supplied by the client.' } },

  /* ------------------------- Registration & Profile ---------------------- */
  { id: 'reg-mass', feature: 'Registration & Profile', name: 'Mass Assignment — Self-Assigned Admin Role', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: [
      'The register form shows only a few fields, but the server reads more of the request than it displays.',
      'Add extra fields to the registration POST and see what sticks.',
      'Submit /register with an extra field role=admin — the new account is created as an administrator.'
    ],
    how: 'Register a new account, but add role=admin to the POST body alongside name/email/password. The server copies request fields straight onto the new user record, so the account is born an admin. Log in and open /admin.',
    lesson: 'Binding request data directly to data models lets attackers set fields the UI never offered — role, balance, verification flags.',
    impact: 'Self-service admin creation on a client platform: the attacker skips every approval process and owns the system from a public form.',
    report: { title: 'Mass Assignment in Registration Allows Role Escalation', severity: 'High', remediation: 'Whitelist bindable fields on every endpoint; set role and other privileged fields server-side only.' } },
  { id: 'reg-weak', feature: 'Registration & Profile', name: 'Weak Password Policy', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: [
      'How short can a password be on this platform?',
      'Try registering with a one-character password.',
      'A password of "x" is accepted — there is no length or complexity rule at all.'
    ],
    how: 'Go to /register and create an account with the password x (a single character). The account is created without complaint.',
    lesson: 'A password policy is the cheapest defence in depth; without one, users choose passwords that fall to the first guessing attempt.',
    impact: 'Client users with one-character passwords are brute-forced in seconds, and the client owns the breach headlines and the support cost.',
    report: { title: 'No Minimum Password Strength Enforced at Registration', severity: 'Medium', remediation: 'Enforce a minimum length (≥10–12) and screen against known-breached password lists.' } },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: [
      'Your display name is printed back on pages that other people — including admins — see.',
      'Names are rendered without output escaping.',
      'Register or rename yourself with the display name <script>alert(1)</script> and open a page that lists users.'
    ],
    how: 'Register a new account (or update your profile) with the display name <script>alert(1)</script>. The payload is stored and rendered unescaped wherever names are shown, e.g. the admin user list and message threads.',
    lesson: 'Stored XSS turns one user’s profile field into code that runs in every viewer’s browser — including administrators’.',
    impact: 'An attacker can steal admin sessions or act as the admin on a client site, pivoting one profile field into full control.',
    report: { title: 'Stored Cross-Site Scripting via Display Name Field', severity: 'High', remediation: 'Contextually escape all user-controlled output and add a Content-Security-Policy; validate input on the server.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: [
      'Profile updates never check where the request actually came from.',
      'Real pages make your browser carry a marker cookie; a forged cross-site request would not.',
      'POST /profile/update sending only your session cookie (no hx_origin marker) — your profile still changes.'
    ],
    how: 'While logged in, send POST /profile/update with a new name but WITHOUT the hx_origin marker cookie your browser normally carries (e.g. with curl). The change is applied — any website you visit while logged in could do the same.',
    lesson: 'State-changing endpoints must verify the request’s origin (anti-CSRF token); cookies alone are sent by the browser for any site.',
    impact: 'A malicious page a client’s user merely visits can silently rewrite their profile — and on other endpoints, far worse.',
    report: { title: 'Cross-Site Request Forgery on Profile Update', severity: 'Medium', remediation: 'Require a per-session anti-CSRF token on all state-changing requests and set SameSite cookies.' } },

  /* ------------------------- Tutor Search & Profiles --------------------- */
  { id: 'search-sqli', feature: 'Tutor Search & Profiles', name: 'SQL Injection in Tutor Search', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: [
      'Search glues your text into a query in the same careless way login does.',
      'An always-true condition makes every tutor match.',
      "Search for ' OR '1'='1 — every tutor is returned, whatever subject you asked for."
    ],
    how: "On the home page search box, enter ' OR '1'='1 and submit. The result lists every tutor on the platform, including ones whose subjects do not match the search at all.",
    lesson: 'Any input that reaches a query is an injection surface — search boxes are among the most commonly missed.',
    impact: 'Search injection on a client site is a stepping stone to dumping the whole database: users, emails, payment data.',
    report: { title: 'SQL Injection in Tutor Search', severity: 'High', remediation: 'Parameterise all queries, including search and filter parameters; apply least-privilege database accounts.' } },
  { id: 'search-xss', feature: 'Tutor Search & Profiles', name: 'Reflected XSS in Search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: [
      'Your search text is echoed at the top of the results page.',
      'It is echoed without escaping.',
      'Search for <script>alert(1)</script> and look at the results page — the payload is in the page as live markup.'
    ],
    how: 'Search for <script>alert(1)</script>. The results page prints "Results for …" with your text rendered as raw HTML/JS, executing in the browser of anyone who opens that link.',
    lesson: 'Reflected input must be encoded for the context it lands in; echoing a query back raw is a script-injection gift.',
    impact: 'Attackers send crafted links to a client’s users; the script runs as the trusted site, stealing sessions and data.',
    report: { title: 'Reflected Cross-Site Scripting in Search Results', severity: 'Medium', remediation: 'Escape reflected values in HTML context and deploy a Content-Security-Policy.' } },
  { id: 'profile-pii', feature: 'Tutor Search & Profiles', name: 'Tutor Private Data Exposure via Profile API', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: [
      'The JSON tutor API returns more than the public profile page shows.',
      'Compare /api/tutors/<id> with what the website displays.',
      'The API includes each tutor’s private email address and phone number — and answers without any login.'
    ],
    how: 'Open /api/tutors/5 in a fresh browser (no login). The JSON includes the tutor’s private email and phone number, fields the public website never displays.',
    lesson: 'APIs must return only the fields the caller is authorised to see; serialising the whole record leaks private data by default.',
    impact: 'A client’s entire tutor/teacher contact list can be scraped anonymously for spam, phishing and poaching.',
    report: { title: 'Excessive Data Exposure — Private Contact Fields in Public API', severity: 'Medium', remediation: 'Return explicit DTOs with only public fields; require authentication and authorisation for private data.' } },

  /* ----------------------------- Session Booking ------------------------- */
  { id: 'book-rate', feature: 'Session Booking', name: 'Hourly Rate Tampering at Booking', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: [
      'The booking form carries the price in a hidden field.',
      'Hidden fields are suggestions, not server-side truth.',
      'Book Tina (normally $40/h) with rate=1 — the session is created and charged at your price.'
    ],
    how: 'Open Tina’s profile and book a session, but change the hidden rate field to 1 before submitting (browser dev tools or curl). The server books the session at $1/hour and never checks the tutor’s real rate.',
    lesson: 'Prices must be recomputed server-side from the catalogue; any price arriving from the client is attacker-controlled.',
    impact: 'Customers buy a client’s services for pennies — direct revenue loss on every order until someone reconciles the books.',
    report: { title: 'Client-Side Price Tampering in Session Booking', severity: 'High', remediation: 'Ignore client-supplied prices; always price from server-side catalogue data at booking time.' } },
  { id: 'book-nopay', feature: 'Session Booking', name: 'Booking Confirmed Without Payment', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: [
      'Payment is "simulated" — but the server never checks that it happened at all.',
      'What if the card field is simply left out of the request?',
      'POST a booking with no card field: the session is confirmed anyway, marked unpaid but fully booked.'
    ],
    how: 'Book a session via POST /book with tutor, slot, hours and rate — but omit the card field entirely. The booking is created as a confirmed session with nothing paid.',
    lesson: 'A business invariant ("no confirmed booking without payment") must be enforced by the server at the moment of booking, not assumed from the UI flow.',
    impact: 'Free services at scale: a client’s calendar fills with unpaid bookings and real paying customers are crowded out.',
    report: { title: 'Session Booking Does Not Verify Payment', severity: 'High', remediation: 'Create bookings in a pending state and confirm them only after verified payment; check payment server-side.' } },
  { id: 'book-cancel', feature: 'Session Booking', name: 'Cancel Another Student’s Session (IDOR)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: [
      'Cancelling a session checks that the session exists — not that it is yours.',
      'Session ids are small sequential numbers.',
      'As Alice, POST /sessions/2/cancel — session 2 belongs to Bob, and it is cancelled.'
    ],
    how: 'Log in as Alice and send POST /sessions/2/cancel. Session 2 is Bob’s booking with Tina. The server cancels it without ever checking ownership.',
    lesson: 'Every object access must check that the object belongs to (or is shared with) the caller — unguessable ids are not an authorisation check.',
    impact: 'Any user can sabotage every other customer’s bookings on a client platform — support chaos and refunds follow.',
    report: { title: 'Insecure Direct Object Reference — Cancelling Other Users’ Sessions', severity: 'High', remediation: 'Enforce ownership/authorisation checks on every object-level operation, server-side.' } },
  { id: 'book-hours', feature: 'Session Booking', name: 'Negative Hours Quantity Tampering', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: [
      'Hours are multiplied by the rate without any sanity check.',
      'What does a negative lesson cost?',
      'Book with hours=-2: the total becomes negative — and the booking is accepted.'
    ],
    how: 'Book a session with hours=-2. The server multiplies rate × hours, stores a session with a negative total, and confirms it — the platform now notionally owes the student money.',
    lesson: 'Quantities are business inputs too: they need range validation (positive, sane maximums) before they touch money math.',
    impact: 'Negative-quantity abuse corrupts a client’s billing and payouts — refunds, credits and reports all built on poisoned totals.',
    report: { title: 'Missing Quantity Validation Allows Negative Booking Totals', severity: 'Medium', remediation: 'Validate quantities server-side (integer, ≥1, ≤ a sane maximum) before pricing or persisting.' } },

  /* ---------------------------- Reviews & Ratings ------------------------ */
  { id: 'rev-nobook', feature: 'Reviews & Ratings', name: 'Review Without Any Completed Session', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: [
      'Who is allowed to review a tutor? The server never asks.',
      'The review endpoint accepts any tutor id from any logged-in student.',
      'As Carol, review Tina — you have never had a session with her, yet the review is stored and shown.'
    ],
    how: 'Log in as Carol and POST /reviews with tutorId=5 (Tina), a rating and a comment. Carol has no completed session with Tina, but the review is saved and displayed on Tina’s profile.',
    lesson: 'Eligibility rules ("only students who completed a session may review") are authorisation logic and must be enforced server-side.',
    impact: 'Fake reviews destroy trust in a client’s marketplace — competitors can tank a tutor, or boost themselves, at will.',
    report: { title: 'Missing Eligibility Check Allows Fake Reviews', severity: 'Medium', remediation: 'Verify a completed session between reviewer and tutor server-side before accepting a review.' } },
  { id: 'rev-rating', feature: 'Reviews & Ratings', name: 'Rating Value Manipulation (Out of Range)', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: [
      'Ratings are supposed to be 1 to 5 stars.',
      'The server trusts the number you send, whatever it is.',
      'Submit a review with rating=100 — the tutor’s average explodes, and the value is stored as sent.'
    ],
    how: 'POST a review with rating=100 (or -5). The value is stored verbatim and fed into the tutor’s average rating, which now shows an absurd number.',
    lesson: 'Every numeric input has a domain; validating ranges is part of the business logic, not a UI nicety.',
    impact: 'Ratings are a client’s shop window — one request can make any seller look perfect or terrible, misleading every customer.',
    report: { title: 'Unvalidated Rating Range Corrupts Tutor Averages', severity: 'Medium', remediation: 'Validate rating server-side as an integer between 1 and 5; reject anything outside the domain.' } },

  /* ------------------------------- Messaging ----------------------------- */
  { id: 'msg-idor', feature: 'Messaging', name: 'Reading Another Pair’s Messages (IDOR)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: [
      'Thread pages check that you are logged in — nothing more.',
      'Thread ids are small sequential numbers.',
      'Open /messages/2 while logged in as Alice: the private thread between Bob and Tom is served in full.'
    ],
    how: 'Log in as Alice and open /messages/2. Thread 2 belongs to Bob and Tom; Alice is not a participant, but the whole conversation is rendered for her.',
    lesson: 'Private conversations are objects too: participant checks are mandatory on every read, not just on write.',
    impact: 'Every private conversation on a client platform is public to any registered user — a serious privacy breach and regulatory problem.',
    report: { title: 'Insecure Direct Object Reference — Private Message Threads', severity: 'High', remediation: 'Check thread participation on every message read/write; return 404/403 for non-participants.' } },
  { id: 'msg-xss', feature: 'Messaging', name: 'Stored XSS in Message Body', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: [
      'Message bodies are printed into the thread page exactly as stored.',
      'Send a message inside a thread you belong to.',
      'Send <script>alert(1)</script> as a message: it is stored, and it renders as live markup for the other participant.'
    ],
    how: 'In one of your own threads (e.g. Alice in thread 1), send the message <script>alert(1)</script>. Open the thread — the payload is in the page as executable markup, served to every participant.',
    lesson: 'Chat and messaging surfaces are stored-XSS goldmines: every participant’s browser trusts the thread page completely.',
    impact: 'An attacker messages a client’s staff or customers and runs script in their sessions — account actions performed as the victim.',
    report: { title: 'Stored Cross-Site Scripting in Private Messages', severity: 'High', remediation: 'Escape all message content on render, sanitise any allowed markup, and add a Content-Security-Policy.' } },

  /* --------------------------- Earnings & Payouts ------------------------ */
  { id: 'earn-idor', feature: 'Earnings & Payouts', name: 'Another Tutor’s Earnings Exposed (IDOR)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: [
      'The earnings page takes a tutor id as a parameter.',
      'Your own id is not the only one it accepts.',
      'As Tina, open /tutor/earnings?tutorId=6 — Tom’s earnings, session by session, are shown.'
    ],
    how: 'Log in as Tina (tutor) and open /tutor/earnings?tutorId=6. The page happily renders Tom’s earnings data, because the parameter is never checked against the session.',
    lesson: 'Financial data needs the strictest ownership checks; a query parameter is not proof of identity.',
    impact: 'Sellers on a client marketplace can spy on each other’s income — competitive harm and a privacy incident in one request.',
    report: { title: 'Insecure Direct Object Reference — Tutor Earnings', severity: 'High', remediation: 'Derive the tutor identity from the session; ignore client-supplied ids for private financial data.' } },
  { id: 'earn-payout', feature: 'Earnings & Payouts', name: 'Payout Request Above Balance Accepted', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: [
      'Payout requests are recorded — never checked against the tutor’s balance.',
      'Your balance is what your completed sessions actually earned.',
      'As Tina (balance $80 from one completed session), request a payout of $500: it is accepted in full.'
    ],
    how: 'Log in as Tina and POST /tutor/payout with amount=500. Her real balance is $80. The payout is recorded as pending for the full $500 — no balance check anywhere.',
    lesson: 'Money-out flows must re-verify the balance server-side at request time; the displayed balance is not a control.',
    impact: 'Direct financial theft on a client platform: sellers withdraw money they never earned, discovered only at reconciliation.',
    report: { title: 'Missing Balance Verification on Payout Requests', severity: 'High', remediation: 'Check the available balance server-side inside the payout transaction; lock funds atomically.' } },

  /* ------------------------------ Admin Panel ---------------------------- */
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'CSRF on Admin User-Role Change', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    hints: [
      'Admin actions trust the admin’s browser completely.',
      'Changing a user’s role is a plain POST with no origin check.',
      'As admin, POST /admin/users/2/role with role=tutor and no hx_origin marker — Alice’s role changes.'
    ],
    how: 'Log in as the admin, then send POST /admin/users/2/role {role: "tutor"} WITHOUT the hx_origin marker cookie (e.g. with curl). The role change is applied — a malicious page the admin visits could submit the same request silently.',
    lesson: 'Privileged actions need CSRF tokens most of all: the more powerful the victim’s session, the more valuable the forgery.',
    impact: 'One visited link can hand an attacker chosen roles on a client platform — promote an accomplice, demote the real admins.',
    report: { title: 'Cross-Site Request Forgery on Administrative Role Changes', severity: 'High', remediation: 'Require anti-CSRF tokens on all admin mutations, SameSite=Lax/Strict cookies, and re-authentication for sensitive actions.' } },

  /* ----------------------------- Platform & API -------------------------- */
  { id: 'api-token', feature: 'Platform & API', name: 'Predictable API Token (Base64 of Email)', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    hints: [
      'The API accepts a Bearer token instead of a session cookie.',
      'The token is derived from something completely public about the user.',
      'Token = base64 of the user’s email address. Forge Bob’s and GET /api/profile — his account data is returned, no password involved.'
    ],
    how: 'Compute base64("bob@hexatutor.local") and send GET /api/profile with header Authorization: Bearer <that value>. The API resolves it to Bob and returns his profile — the "token" is just his public email encoded.',
    lesson: 'Tokens must be high-entropy secrets; anything derivable from public data is not a credential, it is an encoding.',
    impact: 'Every API account on a client platform is open to anyone who knows an email address — emails are public by design.',
    report: { title: 'API Authentication Tokens Are Predictable (Base64 of Email)', severity: 'High', remediation: 'Issue random opaque tokens (≥128 bits) stored server-side, or signed JWTs with a strong secret and expiry.' } },
  { id: 'api-debug', feature: 'Platform & API', name: 'Debug Endpoint Dumps the Whole User Table', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: [
      'Something was left behind for the developers and never removed.',
      'Try the obvious diagnostic path under /api.',
      'GET /api/debug dumps every user — including plaintext passwords — with no login at all.'
    ],
    how: 'Open /api/debug in a browser with no session. The endpoint returns the full user table, emails and plaintext passwords included, left over from development.',
    lesson: 'Debug and diagnostic endpoints are production attack surface; if it can dump data, it must not ship — or must be locked down like the admin panel.',
    impact: 'A client’s entire credential list is one URL away from the public internet — every account falls at once.',
    report: { title: 'Unauthenticated Debug Endpoint Exposes All Credentials', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; gate any diagnostics behind admin auth and network restrictions.' } }
];

const FEATURES = [...new Set(TESTS.map(t => t.feature))];
const TEST_BY_ID = Object.fromEntries(TESTS.map(t => [t.id, t]));

/* ============================ progress state ============================== */
let state = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function saveState() { try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 1)); } catch (e) { /* ignore */ } }
function loadState() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const s = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      if (s && typeof s === 'object') state = Object.assign(state, s);
    }
  } catch (e) { /* start fresh */ }
}
loadState();
function doneCount() { return TESTS.filter(t => state.tests[t.id]).length; }
function pct() { return Math.floor(doneCount() / TESTS.length * 100); }
function isComplete() { return doneCount() === TESTS.length; }
function pass(id) {
  if (!TEST_BY_ID[id] || state.tests[id]) return;
  state.tests[id] = true;
  if (isComplete() && !state.completedAt) { state.completedAt = new Date().toISOString(); state.keyRevealed = true; }
  saveState();
}
function attempt(feature) {
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  saveState();
}

/* ================================ seed data =============================== */
/* All demo data. Passwords are intentionally weak/demo values for training. */
const users = [
  { id: 1, name: 'Hexa Admin', email: 'admin@hexatutor.local', password: 'admin123', role: 'admin', phone: '+1 555 0100' },
  { id: 2, name: 'Alice Student', email: 'alice@hexatutor.local', password: 'alice123', role: 'student', phone: '+1 555 0102' },
  { id: 3, name: 'Bob Student', email: 'bob@hexatutor.local', password: 'bob123', role: 'student', phone: '+1 555 0103' },
  { id: 4, name: 'Carol Student', email: 'carol@hexatutor.local', password: 'carol123', role: 'student', phone: '+1 555 0104' },
  { id: 5, name: 'Tina Tutor', email: 'tina@hexatutor.local', password: 'tina123', role: 'tutor', phone: '+1 555 0105' },
  { id: 6, name: 'Tom Tutor', email: 'tom@hexatutor.local', password: 'tom123', role: 'tutor', phone: '+1 555 0106' },
  { id: 7, name: 'Tara Tutor', email: 'tara@hexatutor.local', password: 'tara123', role: 'tutor', phone: '+1 555 0107' }
];
let nextUserId = 8;
/* Tutor profiles: id == the tutor's user id. email/phone here are PRIVATE
   (never shown on the public site) — but see the profile API. */
const tutors = [
  { id: 5, name: 'Tina Tutor', subjects: 'Mathematics, Algebra, Calculus', rate: 40, bio: 'Patient maths tutor, 8 years of experience.', email: 'tina@hexatutor.local', phone: '+1 555 0105' },
  { id: 6, name: 'Tom Tutor', subjects: 'Physics, Mechanics', rate: 35, bio: 'Physics made simple — exam specialist.', email: 'tom@hexatutor.local', phone: '+1 555 0106' },
  { id: 7, name: 'Tara Tutor', subjects: 'English, Essay Writing', rate: 30, bio: 'Helping students write with confidence.', email: 'tara@hexatutor.local', phone: '+1 555 0107' }
];
let bookings = [
  { id: 1, studentId: 2, tutorId: 5, slot: '2026-10-20 10:00', hours: 2, rate: 40, total: 80, paid: true, status: 'completed' },
  { id: 2, studentId: 3, tutorId: 5, slot: '2026-10-25 11:00', hours: 1, rate: 40, total: 40, paid: true, status: 'upcoming' },
  { id: 3, studentId: 3, tutorId: 6, slot: '2026-10-19 09:00', hours: 2, rate: 35, total: 70, paid: true, status: 'completed' },
  { id: 4, studentId: 4, tutorId: 7, slot: '2026-10-26 14:00', hours: 1, rate: 30, total: 30, paid: true, status: 'upcoming' }
];
let nextBookingId = 5;
let reviews = [
  { id: 1, studentId: 3, tutorId: 6, rating: 5, comment: 'Great physics session, very clear.' }
];
let nextReviewId = 2;
let threads = [
  { id: 1, studentId: 2, tutorId: 5, msgs: [ { from: 2, body: 'Hi Tina, looking forward to our maths session!' }, { from: 5, body: 'Hi Alice — bring your calculus homework.' } ] },
  { id: 2, studentId: 3, tutorId: 6, msgs: [ { from: 3, body: 'Hi Tom, can we focus on mechanics next time?' }, { from: 6, body: 'Of course, Bob. Bring the problem set.' } ] }
];
let payouts = [];
let nextPayoutId = 1;

/* --- completion key material: encoded shards only, far from the entry set - */
const _cShards = ["TC1YSA==", "Ni01NQ==", "NzdTSA==", "LVVEVg==", "OUEwUA==", "R1ZZMQ=="];
function completionKey() { return state.keyRevealed ? _unshard(_cShards) : null; }

/* ============================ runtime tracking ============================ */
const sessions = new Map();       // sid -> userId
const issuedResetTokens = new Set();
const loginFailures = {};         // email -> failed count
const forgotProbes = new Map();   // clientKey -> Set of emails

/* ================================ helpers ================================= */
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
const XSS_RE = /(<script|onerror\s*=|onload\s*=|<svg|<img[^>]*onerror|<iframe|javascript:)/i;
const SQLI_RE = /('\s*or\s*'?\d+'?\s*=\s*'?\d+|'\s*or\s*'[^']*'\s*=\s*'[^']*'|--|\bunion\b\s+\bselect\b)/i;
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}
function currentUser(req) {
  const c = parseCookies(req);
  const uid = sessions.get(c.hx_sid);
  return users.find(u => u.id === uid) || null;
}
function userName(id) { const u = users.find(x => x.id === id); return u ? u.name : ('user ' + id); }
function tutorAvg(tutorId) {
  const rs = reviews.filter(r => r.tutorId === tutorId);
  if (!rs.length) return null;
  return (rs.reduce((a, r) => a + Number(r.rating || 0), 0) / rs.length).toFixed(1);
}
function tutorBalance(tutorId) {
  const earned = bookings.filter(b => b.tutorId === tutorId && b.status === 'completed').reduce((a, b) => a + Number(b.total || 0), 0);
  const out = payouts.filter(p => p.tutorId === tutorId).reduce((a, p) => a + Number(p.amount || 0), 0);
  return earned - out;
}
function resetTokenFor(user) { return 'RST' + user.id + '-' + (user.id * 137 + 42); }
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', ch => { data += ch; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(''));
  });
}
function parseForm(raw) {
  const out = {};
  new URLSearchParams(raw).forEach((v, k) => { out[k] = v; });
  return out;
}

/* ================================ rendering =============================== */
function header(req, title) {
  const u = currentUser(req);
  const done = doneCount(), total = TESTS.length, p = pct();
  const nav = u
    ? `<a href="/">Tutors</a> · <a href="/sessions">My Sessions</a> · <a href="/messages">Messages</a>${u.role === 'tutor' ? ' · <a href="/tutor/earnings">Earnings</a>' : ''} · <a href="/tests">Tests</a> · <a href="/admin">Admin</a> · <span>${esc(u.name)} (${esc(u.role)})</span> · <a href="/logout">Logout</a>`
    : `<a href="/">Tutors</a> · <a href="/tests">Tests</a> · <a href="/login">Login</a> · <a href="/register">Register</a>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)} · HexaTutor</title></head>
<body style="margin:0;background:#14141d;font-family:Arial,sans-serif;color:#222">
<div style="background:#1d1d2b;color:#eee;padding:12px 20px">
  <img src="/logo.png" style="height:34px;vertical-align:middle"> <b style="font-size:18px">LAB ${LAB_NUMBER} — ${LAB_NAME}</b>
  <span style="margin-left:16px">${done}/${total} tests · ${p}%</span>
  <div style="background:#333;height:10px;border-radius:5px;margin-top:8px;max-width:520px"><div style="background:#7ac74f;height:10px;border-radius:5px;width:${p}%"></div></div>
  <div style="margin-top:8px;font-size:14px">${nav}</div>
</div>
<div style="max-width:860px;margin:22px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:24px">`;
}
function footer() {
  return `</div>
<div id="coach" style="position:fixed;right:16px;bottom:16px;width:320px;background:#fff;border:1px solid #99a;border-radius:10px;box-shadow:0 4px 18px rgba(0,0,0,.3);font-family:Arial,sans-serif">
  <div style="background:#1d1d2b;color:#fff;padding:8px 12px;border-radius:10px 10px 0 0"><b>Lab Coach</b> — ask me about the tests</div>
  <div id="coachLog" style="height:150px;overflow:auto;padding:8px 12px;font-size:13px"></div>
  <div style="display:flex;border-top:1px solid #ddd"><input id="coachIn" style="flex:1;padding:8px;border:0" placeholder="Ask the coach…"><button onclick="coachSend()" style="padding:8px 12px">Send</button></div>
</div>
<script>
async function coachSend(){
  var inp=document.getElementById('coachIn'), log=document.getElementById('coachLog');
  var msg=inp.value.trim(); if(!msg) return; inp.value='';
  log.innerHTML += '<div><b>You:</b> '+msg.replace(/</g,'&lt;')+'</div>';
  try {
    var r = await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg})});
    var j = await r.json();
    log.innerHTML += '<div style="margin:6px 0"><b>Coach:</b> '+(j.reply||'').replace(/</g,'&lt;')+'</div>';
  } catch(e){ log.innerHTML += '<div><b>Coach:</b> (unavailable)</div>'; }
  log.scrollTop = log.scrollHeight;
}
</script>
</body></html>`;
}
function page(req, res, title, bodyHtml, status) {
  res.writeHead(status || 200, { 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': 'hx_origin=site; Path=/' });
  res.end(header(req, title) + bodyHtml + footer());
}
function gatePage(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ${LAB_NUMBER} — ${LAB_NAME} · Locked</title></head><body style="margin:0;background:#14141d;font-family:Arial,sans-serif"><div style="max-width:520px;margin:60px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:28px;text-align:center"><img src="/logo.png" style="height:56px"><h2>LAB ${LAB_NUMBER} — ${LAB_NAME}</h2><p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p><form method="POST" action="/unlock"><input name="key" style="padding:9px;width:80%" placeholder="Completion key from Lab ${LAB_NUMBER - 1}"><br><br><button style="padding:10px 22px">Unlock LAB ${LAB_NUMBER}</button></form></div></body></html>`);
}
function redirect(res, to, extraCookies) {
  const headers = { 'Location': to };
  if (extraCookies) headers['Set-Cookie'] = extraCookies;
  res.writeHead(302, headers); res.end();
}
function json(res, status, obj) { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj, null, 1)); }

/* ================================ Lab Coach ================================= */
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
const FEATURE_KEYWORDS = [
  ['Login & Authentication', ['login', 'log in', 'sign in', 'password', 'brute', 'authentication', 'reset token']],
  ['Registration & Profile', ['register', 'registration', 'sign up', 'profile', 'mass assignment']],
  ['Tutor Search & Profiles', ['search', 'tutor profile', 'find a tutor', 'contact details']],
  ['Session Booking', ['book', 'booking', 'session', 'cancel', 'hourly rate']],
  ['Reviews & Ratings', ['review', 'rating', 'stars']],
  ['Messaging', ['message', 'thread', 'inbox']],
  ['Earnings & Payouts', ['earning', 'payout', 'balance']],
  ['Admin Panel', ['admin']],
  ['Platform & API', ['api', 'token', 'debug', 'platform']]
];
function matchFeature(m) {
  for (const [f, kws] of FEATURE_KEYWORDS) if (kws.some(k => m.includes(k))) return f;
  return null;
}
function coachReply(message) {
  const m = ' ' + String(message || '').toLowerCase() + ' ';
  if (/(who (built|made|created)|founder|jony|hassain)/.test(m)) return ATTRIBUTION;
  if (m.includes('key')) {
    if (isComplete() && state.keyRevealed) return 'You completed LAB ' + LAB_NUMBER + ' — well earned. The completion key for the next lab is: ' + completionKey();
    return "I don't have the completion key yet — I only receive it when this lab is completed 100%. Finish all " + TESTS.length + " tests and ask me again.";
  }
  const feat = matchFeature(m);
  if (/(how|help|guide|solve|step|walkthrough)/.test(m)) {
    if (!feat) return 'Tell me which feature you want help with: ' + FEATURES.join(', ') + '. Remember: step-by-step help for a feature unlocks after you have genuinely tried that feature at least 3 times.';
    const tests = TESTS.filter(t => t.feature === feat);
    const allPassed = tests.every(t => state.tests[t.id]);
    const n = state.attempts[feat] || 0;
    if (n >= 3 || allPassed) {
      return 'Step by step — ' + feat + ':\n' + tests.map(t => '• ' + t.name + ': ' + t.how).join('\n');
    }
    return 'That feature is locked for help. First try the ' + feat + ' tests yourself at least 3 times — I can see you\'ve tried ' + n + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  if (/(how many|which|list|features|tests|vulnerabilit|what is in)/.test(m)) {
    if (feat) {
      const tests = TESTS.filter(t => t.feature === feat);
      return feat + ' has ' + tests.length + ' tests: ' + tests.map(t => t.name).join('; ') + '.';
    }
    return LAB_NAME + ' has ' + FEATURES.length + ' features and ' + TESTS.length + ' tests: ' +
      FEATURES.map(f => f + ' (' + TESTS.filter(t => t.feature === f).length + ')').join(', ') + '. See /tests for the full mission board.';
  }
  if (/(progress|next|start|begin|status)/.test(m)) {
    const next = TESTS.find(t => !state.tests[t.id]);
    return 'Your progress: ' + doneCount() + '/' + TESTS.length + ' tests (' + pct() + '%).' +
      (next ? ' Next open test: "' + next.name + '" in ' + next.feature + '. Open /tests for hints.' : ' Everything is done — open /complete for your summary and key.');
  }
  return 'I am the HexaTutor Lab Coach. Ask me how many tests a feature has, what to do next, or — after at least 3 genuine tries on a feature — ask "how do I solve the <feature> tests" and I will guide you step by step. The mission board is at /tests.';
}

/* ================================= routes ================================= */
async function route(req, res) {
  const u = new URL(req.url, 'http://x');
  const p = u.pathname;
  const method = req.method;
  const cookies = parseCookies(req);

  if (p === '/logo.png') {
    if (fs.existsSync(LOGO_FILE)) { res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(fs.readFileSync(LOGO_FILE)); }
    res.writeHead(404); return res.end('no logo');
  }
  if (p === '/unlock' && method === 'POST') {
    const body = parseForm(await readBody(req));
    if (entryKeyMatches(String(body.key || ''))) { state.unlocked = true; saveState(); return redirect(res, '/'); }
    res.writeHead(403, { 'Content-Type': 'text/plain' }); return res.end('Wrong key.');
  }
  if (p === '/api/chat' && method === 'POST') {
    const raw = await readBody(req);
    let msg = '';
    try { msg = JSON.parse(raw).message || ''; } catch (e) { msg = ''; }
    return json(res, 200, { reply: coachReply(msg) });
  }
  if (!state.unlocked) return gatePage(req, res);

  if (p === '/api/progress') {
    const features = {};
    for (const f of FEATURES) {
      const ts = TESTS.filter(t => t.feature === f);
      features[f] = { total: ts.length, done: ts.filter(t => state.tests[t.id]).length, attempts: state.attempts[f] || 0 };
    }
    return json(res, 200, { lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done: doneCount(), pct: pct(), features, complete: isComplete() });
  }

  const user = currentUser(req);

  /* -------------------------------- auth -------------------------------- */
  if (p === '/login' && method === 'GET') {
    return page(req, res, 'Login', `<h2>Login</h2>
      ${u.searchParams.get('e') ? '<p style="color:#b00">Invalid email or password.</p>' : ''}
      <form method="POST" action="/login">
        <p>Email <input name="email" style="padding:6px;width:70%"></p>
        <p>Password <input name="password" type="password" style="padding:6px;width:70%"></p>
        <button style="padding:8px 20px">Login</button></form>
      <p><a href="/forgot">Forgot password?</a> · <a href="/register">Create an account</a></p>
      <p style="color:#666;font-size:13px">Demo accounts — students: alice@ / bob@ / carol@hexatutor.local (password = first name + 123); tutors: tina@ / tom@ / tara@.
      Demo administrator (default, never changed): admin@hexatutor.local / admin123.</p>`);
  }
  if (p === '/login' && method === 'POST') {
    attempt('Login & Authentication');
    const body = parseForm(await readBody(req));
    const email = String(body.email || ''), password = String(body.password || '');
    const found = users.find(x => x.email === email);
    const inj = SQLI_RE.test(email) || SQLI_RE.test(password);
    if (inj && !(found && found.password === password)) {
      const victim = users[0];
      const sid = crypto.randomBytes(12).toString('hex');
      sessions.set(sid, victim.id);
      pass('auth-sqli');
      return redirect(res, '/', 'hx_sid=' + sid + '; Path=/');
    }
    if (found && found.password === password) {
      const sid = crypto.randomBytes(12).toString('hex');
      sessions.set(sid, found.id);
      if (found.id === 1 && password === 'admin123') pass('auth-default');
      return redirect(res, '/', 'hx_sid=' + sid + '; Path=/');
    }
    loginFailures[email] = (loginFailures[email] || 0) + 1;
    if (loginFailures[email] >= 10) pass('auth-brute');
    return redirect(res, '/login?e=1');
  }
  if (p === '/logout') { if (cookies.hx_sid) sessions.delete(cookies.hx_sid); return redirect(res, '/', 'hx_sid=; Path=/; Max-Age=0'); }
  if (p === '/register' && method === 'GET') {
    return page(req, res, 'Register', `<h2>Create an account</h2>
      <form method="POST" action="/register">
        <p>Name <input name="name" style="padding:6px;width:70%"></p>
        <p>Email <input name="email" style="padding:6px;width:70%"></p>
        <p>Password <input name="password" type="password" style="padding:6px;width:70%"></p>
        <button style="padding:8px 20px">Register (student)</button></form>`);
  }
  if (p === '/register' && method === 'POST') {
    attempt('Registration & Profile');
    const body = parseForm(await readBody(req));
    const nu = {
      id: nextUserId++,
      name: String(body.name || 'New User'),
      email: String(body.email || ''),
      password: String(body.password || ''),
      role: typeof body.role === 'string' && body.role ? body.role : 'student',
      phone: String(body.phone || '')
    };
    users.push(nu);
    if (nu.role === 'tutor') tutors.push({ id: nu.id, name: nu.name, subjects: String(body.subjects || 'General'), rate: Number(body.rate || 25), bio: String(body.bio || ''), email: nu.email, phone: nu.phone });
    if (nu.role === 'admin') pass('reg-mass');
    if (nu.password.length > 0 && nu.password.length < 4) pass('reg-weak');
    if (XSS_RE.test(nu.name)) pass('reg-xss');
    return redirect(res, '/login');
  }
  if (p === '/forgot' && method === 'GET') {
    return page(req, res, 'Forgot password', `<h2>Forgot password</h2>
      ${u.searchParams.get('m') ? '<p>' + esc(u.searchParams.get('m')) + '</p>' : ''}
      <form method="POST" action="/forgot"><p>Email <input name="email" style="padding:6px;width:70%"></p>
      <button style="padding:8px 20px">Send reset link</button></form>
      <p style="color:#666;font-size:13px">Already have a token? <a href="/reset">Reset your password</a>.</p>`);
  }
  if (p === '/forgot' && method === 'POST') {
    attempt('Login & Authentication');
    const body = parseForm(await readBody(req));
    const email = String(body.email || '');
    const found = users.find(x => x.email === email);
    const ck = cookies.hx_sid || req.socket.remoteAddress || 'anon';
    if (!forgotProbes.has(ck)) forgotProbes.set(ck, new Map());
    const probes = forgotProbes.get(ck);
    probes.set(email, !!found);
    const vals = [...probes.values()];
    if (probes.size >= 5 && vals.some(v => v) && vals.some(v => !v)) pass('auth-enum');
    if (found) {
      issuedResetTokens.add(resetTokenFor(found));
      return redirect(res, '/forgot?m=' + encodeURIComponent('Reset link sent to ' + email + '.'));
    }
    return redirect(res, '/forgot?m=' + encodeURIComponent('No account found for that email address.'));
  }
  if (p === '/reset' && method === 'GET') {
    return page(req, res, 'Reset password', `<h2>Reset password</h2>
      <form method="POST" action="/reset">
        <p>Email <input name="email" style="padding:6px;width:70%"></p>
        <p>Reset token <input name="token" style="padding:6px;width:70%"></p>
        <p>New password <input name="newpassword" type="password" style="padding:6px;width:70%"></p>
        <button style="padding:8px 20px">Reset password</button></form>`);
  }
  if (p === '/reset' && method === 'POST') {
    attempt('Login & Authentication');
    const body = parseForm(await readBody(req));
    const found = users.find(x => x.email === String(body.email || ''));
    if (found && String(body.token || '') === resetTokenFor(found)) {
      found.password = String(body.newpassword || '');
      if (!issuedResetTokens.has(String(body.token || ''))) pass('auth-reset');
      return redirect(res, '/login');
    }
    return page(req, res, 'Reset password', '<p style="color:#b00">Invalid token.</p><p><a href="/reset">Try again</a></p>');
  }

  /* ------------------------------- profile ------------------------------- */
  if (p === '/profile' && method === 'GET') {
    if (!user) return redirect(res, '/login');
    return page(req, res, 'Profile', `<h2>Your profile</h2>
      <p>Name: <b>${esc(user.name)}</b> · Email: ${esc(user.email)} · Role: ${esc(user.role)}</p>
      <form method="POST" action="/profile/update"><p>Display name <input name="name" value="${esc(user.name)}" style="padding:6px;width:60%"></p>
      <button style="padding:8px 20px">Update profile</button></form>`);
  }
  if (p === '/profile/update' && method === 'POST') {
    if (!user) return redirect(res, '/login');
    attempt('Registration & Profile');
    const body = parseForm(await readBody(req));
    const newName = String(body.name || user.name);
    const changed = newName !== user.name;
    user.name = newName;
    const tu = tutors.find(t => t.id === user.id); if (tu) tu.name = newName;
    if (XSS_RE.test(newName)) pass('reg-xss');
    if (changed && !cookies.hx_origin) pass('reg-csrf');
    return redirect(res, '/profile');
  }

  /* --------------------------- home / search ----------------------------- */
  if (p === '/' && method === 'GET') {
    const q = u.searchParams.get('q');
    let list = tutors;
    if (q !== null) {
      attempt('Tutor Search & Profiles');
      if (SQLI_RE.test(q)) { list = tutors; pass('search-sqli'); }
      else list = tutors.filter(t => (t.subjects + ' ' + t.name).toLowerCase().includes(q.toLowerCase()));
      if (XSS_RE.test(q)) pass('search-xss');
    }
    const cards = list.map(t => {
      const avg = tutorAvg(t.id);
      return `<div style="border:1px solid #ccd;border-radius:8px;padding:14px;margin:10px 0">
        <b style="font-size:17px">${esc(t.name)}</b> — $${esc(t.rate)}/hour ${avg ? '· ★ ' + esc(avg) : '· no ratings yet'}<br>
        <span style="color:#555">${esc(t.subjects)}</span><br>${esc(t.bio)}<br>
        <a href="/tutors/${t.id}">View profile &amp; book</a></div>`;
    }).join('');
    return page(req, res, 'Tutors', `<h2>Find a tutor</h2>
      <form method="GET" action="/"><input name="q" value="${esc(q || '')}" style="padding:7px;width:60%" placeholder="Search by subject or name"> <button style="padding:7px 16px">Search</button></form>
      ${q !== null ? '<p>Results for "' + q + '":</p>' : ''}
      ${cards || '<p>No tutors found.</p>'}`);
  }
  const tutorPageMatch = p.match(/^\/tutors\/(\d+)$/);
  if (tutorPageMatch && method === 'GET') {
    const t = tutors.find(x => x.id === Number(tutorPageMatch[1]));
    if (!t) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('not found'); }
    const avg = tutorAvg(t.id);
    const revs = reviews.filter(r => r.tutorId === t.id).map(r =>
      `<div style="border-top:1px solid #eee;padding:8px 0"><b>${esc(userName(r.studentId))}</b> — ★ ${esc(r.rating)}<br>${esc(r.comment)}</div>`).join('');
    return page(req, res, t.name, `<h2>${esc(t.name)}</h2>
      <p>${esc(t.subjects)} · <b>$${esc(t.rate)}/hour</b> ${avg ? '· ★ ' + esc(avg) + ' average' : ''}</p><p>${esc(t.bio)}</p>
      <h3>Book a session</h3>
      <form method="POST" action="/book">
        <input type="hidden" name="tutorId" value="${t.id}">
        <input type="hidden" name="rate" value="${t.rate}">
        <p>Slot <input name="slot" value="2026-10-27 10:00" style="padding:6px"></p>
        <p>Hours <input name="hours" type="number" value="1" style="padding:6px;width:80px"></p>
        <p>Card (simulated payment) <input name="card" placeholder="4242 4242 4242 4242" style="padding:6px;width:60%"></p>
        <button style="padding:8px 20px">Book at $${esc(t.rate)}/hour</button></form>
      <h3>Reviews</h3>${revs || '<p>No reviews yet.</p>'}
      <h4>Leave a review</h4>
      <form method="POST" action="/reviews">
        <input type="hidden" name="tutorId" value="${t.id}">
        <p>Rating <input name="rating" type="number" value="5" style="padding:6px;width:70px"> · Comment <input name="comment" style="padding:6px;width:55%"></p>
        <button style="padding:7px 16px">Submit review</button></form>`);
  }
  if (p === '/book' && method === 'POST') {
    if (!user) return redirect(res, '/login');
    attempt('Session Booking');
    const body = parseForm(await readBody(req));
    const t = tutors.find(x => x.id === Number(body.tutorId));
    if (!t) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('no such tutor'); }
    const rate = Number(body.rate), hours = Number(body.hours), total = rate * hours;
    const bk = { id: nextBookingId++, studentId: user.id, tutorId: t.id, slot: String(body.slot || 'TBD'), hours, rate, total, paid: !!body.card, status: 'upcoming' };
    bookings.push(bk);
    if (rate !== t.rate) pass('book-rate');
    if (!body.card && total > 0) pass('book-nopay');
    if (hours <= 0 || total < 0) pass('book-hours');
    return redirect(res, '/sessions');
  }

  /* ------------------------------- sessions ------------------------------ */
  if (p === '/sessions' && method === 'GET') {
    if (!user) return redirect(res, '/login');
    const mine = bookings.filter(b => b.studentId === user.id || b.tutorId === user.id);
    const rows = mine.map(b => `<div style="border:1px solid #ccd;border-radius:8px;padding:12px;margin:8px 0">
      Session #${b.id} — ${esc(userName(b.tutorId))} · ${esc(b.slot)} · ${esc(b.hours)}h × $${esc(b.rate)} = <b>$${esc(b.total)}</b>
      · ${b.paid ? 'paid' : '<b style="color:#b00">unpaid</b>'} · status: <b>${esc(b.status)}</b>
      ${b.status === 'upcoming' ? `<form method="POST" action="/sessions/${b.id}/cancel" style="display:inline"><button>Cancel</button></form>` : ''}
      </div>`).join('');
    return page(req, res, 'My Sessions', '<h2>My sessions</h2>' + (rows || '<p>No sessions yet. Book one from a tutor profile.</p>'));
  }
  const cancelMatch = p.match(/^\/sessions\/(\d+)\/cancel$/);
  if (cancelMatch && method === 'POST') {
    if (!user) return redirect(res, '/login');
    attempt('Session Booking');
    const bk = bookings.find(b => b.id === Number(cancelMatch[1]));
    if (bk) {
      if (bk.studentId !== user.id && bk.tutorId !== user.id) pass('book-cancel');
      bk.status = 'cancelled';
    }
    return redirect(res, '/sessions');
  }

  /* ------------------------------- reviews ------------------------------- */
  if (p === '/reviews' && method === 'POST') {
    if (!user) return redirect(res, '/login');
    attempt('Reviews & Ratings');
    const body = parseForm(await readBody(req));
    const tutorId = Number(body.tutorId), rating = Number(body.rating);
    reviews.push({ id: nextReviewId++, studentId: user.id, tutorId, rating, comment: String(body.comment || '') });
    const hadCompleted = bookings.some(b => b.studentId === user.id && b.tutorId === tutorId && b.status === 'completed');
    if (!hadCompleted) pass('rev-nobook');
    if (!(rating >= 1 && rating <= 5)) pass('rev-rating');
    return redirect(res, '/tutors/' + tutorId);
  }

  /* ------------------------------ messaging ------------------------------ */
  if (p === '/messages' && method === 'GET') {
    if (!user) return redirect(res, '/login');
    const mine = threads.filter(t => t.studentId === user.id || t.tutorId === user.id);
    const rows = mine.map(t => `<p>Thread #${t.id} — with ${esc(userName(t.studentId === user.id ? t.tutorId : t.studentId))} · <a href="/messages/${t.id}">Open</a></p>`).join('');
    return page(req, res, 'Messages', '<h2>Your message threads</h2>' + (rows || '<p>No threads yet.</p>'));
  }
  const threadMatch = p.match(/^\/messages\/(\d+)$/);
  if (threadMatch && method === 'GET') {
    if (!user) return redirect(res, '/login');
    attempt('Messaging');
    const th = threads.find(t => t.id === Number(threadMatch[1]));
    if (!th) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('not found'); }
    if (user.id !== th.studentId && user.id !== th.tutorId) pass('msg-idor');
    const msgs = th.msgs.map(m => `<div style="border-top:1px solid #eee;padding:8px 0"><b>${esc(userName(m.from))}:</b> ${m.body}</div>`).join('');
    return page(req, res, 'Thread #' + th.id, `<h2>Thread #${th.id}</h2>${msgs}
      <form method="POST" action="/messages/${th.id}/send"><p><input name="body" style="padding:7px;width:70%" placeholder="Write a message…"> <button style="padding:7px 16px">Send</button></p></form>`);
  }
  const sendMatch = p.match(/^\/messages\/(\d+)\/send$/);
  if (sendMatch && method === 'POST') {
    if (!user) return redirect(res, '/login');
    attempt('Messaging');
    const th = threads.find(t => t.id === Number(sendMatch[1]));
    if (!th) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('not found'); }
    const body = parseForm(await readBody(req));
    const text = String(body.body || '');
    th.msgs.push({ from: user.id, body: text });
    if (XSS_RE.test(text)) pass('msg-xss');
    return redirect(res, '/messages/' + th.id);
  }

  /* ------------------------------ earnings ------------------------------- */
  if (p === '/tutor/earnings' && method === 'GET') {
    if (!user) return redirect(res, '/login');
    attempt('Earnings & Payouts');
    let tutorId = Number(u.searchParams.get('tutorId') || 0);
    if (!tutorId) tutorId = user.id;
    if (tutorId !== user.id) pass('earn-idor');
    const bal = tutorBalance(tutorId);
    const done = bookings.filter(b => b.tutorId === tutorId && b.status === 'completed')
      .map(b => `<p>Session #${b.id} — ${esc(b.slot)} — $${esc(b.total)}</p>`).join('');
    const outs = payouts.filter(x => x.tutorId === tutorId)
      .map(x => `<p>Payout #${x.id} — $${esc(x.amount)} — ${esc(x.status)}</p>`).join('');
    return page(req, res, 'Earnings', `<h2>Earnings — ${esc(userName(tutorId))}</h2>
      <p>Available balance: <b>$${esc(bal)}</b></p>
      <h3>Completed sessions</h3>${done || '<p>None.</p>'}
      <h3>Payouts</h3>${outs || '<p>None.</p>'}
      <h3>Request a payout</h3>
      <form method="POST" action="/tutor/payout"><p>Amount $ <input name="amount" type="number" style="padding:6px;width:110px"> <button style="padding:7px 16px">Request payout</button></p></form>`);
  }
  if (p === '/tutor/payout' && method === 'POST') {
    if (!user) return redirect(res, '/login');
    attempt('Earnings & Payouts');
    const body = parseForm(await readBody(req));
    const amount = Number(body.amount || 0);
    const balBefore = tutorBalance(user.id);
    payouts.push({ id: nextPayoutId++, tutorId: user.id, amount, status: 'pending' });
    if (amount > balBefore) pass('earn-payout');
    return redirect(res, '/tutor/earnings');
  }

  /* -------------------------------- admin -------------------------------- */
  if (p === '/admin' && method === 'GET') {
    if (!user) return redirect(res, '/login');
    attempt('Admin Panel');
    const role = cookies.hx_role || user.role;
    if (role !== 'admin') { res.writeHead(403, { 'Content-Type': 'text/plain' }); return res.end('Forbidden — admins only.'); }
    if (cookies.hx_role === 'admin' && user.role !== 'admin') pass('auth-cookie');
    const rows = users.map(x => `<tr><td>${x.id}</td><td>${x.name}</td><td>${esc(x.email)}</td><td>${esc(x.role)}</td>
      <td><form method="POST" action="/admin/users/${x.id}/role"><select name="role"><option>student</option><option>tutor</option><option>admin</option></select> <button>Set role</button></form></td></tr>`).join('');
    return page(req, res, 'Admin', `<h2>Admin panel</h2>
      <p>${users.length} users · ${bookings.length} sessions · ${reviews.length} reviews · ${payouts.length} payouts</p>
      <table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Change role</th></tr>${rows}</table>`);
  }
  const roleMatch = p.match(/^\/admin\/users\/(\d+)\/role$/);
  if (roleMatch && method === 'POST') {
    if (!user) return redirect(res, '/login');
    const role = cookies.hx_role || user.role;
    if (role !== 'admin') { res.writeHead(403, { 'Content-Type': 'text/plain' }); return res.end('Forbidden — admins only.'); }
    attempt('Admin Panel');
    const body = parseForm(await readBody(req));
    const target = users.find(x => x.id === Number(roleMatch[1]));
    if (target && typeof body.role === 'string' && body.role) {
      target.role = body.role;
      if (!cookies.hx_origin) pass('admin-csrf');
    }
    return redirect(res, '/admin');
  }

  /* --------------------------------- API --------------------------------- */
  const apiTutorMatch = p.match(/^\/api\/tutors\/(\d+)$/);
  if (apiTutorMatch && method === 'GET') {
    attempt('Tutor Search & Profiles');
    const t = tutors.find(x => x.id === Number(apiTutorMatch[1]));
    if (!t) return json(res, 404, { error: 'not found' });
    if (!user || (user.id !== t.id && user.role !== 'admin')) pass('profile-pii');
    return json(res, 200, t);
  }
  if (p === '/api/profile' && method === 'GET') {
    attempt('Platform & API');
    const auth = req.headers.authorization || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    let email = '';
    try { email = Buffer.from(token, 'base64').toString('utf8'); } catch (e) { email = ''; }
    const found = users.find(x => x.email === email);
    if (!found) { res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end('{"error":"unauthorized"}'); }
    pass('api-token');
    return json(res, 200, { id: found.id, name: found.name, email: found.email, role: found.role, phone: found.phone });
  }
  if (p === '/api/debug' && method === 'GET') {
    attempt('Platform & API');
    pass('api-debug');
    return json(res, 200, { users, bookings, payouts });
  }

  /* ------------------------------ tests page ----------------------------- */
  if (p === '/tests' && method === 'GET') {
    const hintId = u.searchParams.get('h'), hintLvl = Number(u.searchParams.get('lvl') || 0);
    let html = '<h2>Mission board — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h2><p>' + doneCount() + '/' + TESTS.length + ' tests complete (' + pct() + '%). Tests complete by DOING the exploit — there is no "mark done" button.</p>';
    for (const f of FEATURES) {
      html += '<h3>' + esc(f) + ' <span style="color:#777">(attempts: ' + (state.attempts[f] || 0) + ')</span></h3>';
      for (const t of TESTS.filter(x => x.feature === f)) {
        const done = !!state.tests[t.id];
        html += `<div style="border:1px solid ${done ? '#7ac74f' : '#ccd'};border-radius:8px;padding:10px;margin:8px 0">
          <b>${done ? '✓' : '○'} ${esc(t.name)}</b> — ${esc(t.owasp)} · ${esc(t.difficulty)}<br>
          <span style="color:#555">${esc(t.lesson)}</span><br>`;
        if (hintId === t.id && hintLvl > 0) {
          for (let i = 0; i < Math.min(hintLvl, 3); i++) html += '<div style="color:#864">Hint ' + (i + 1) + ': ' + esc(t.hints[i]) + '</div>';
        }
        if (hintLvl < 3) html += `<a href="/tests?h=${t.id}&lvl=${(hintId === t.id ? hintLvl : 0) + 1}">Show hint ${(hintId === t.id ? hintLvl : 0) + 1}</a>`;
        html += '</div>';
      }
    }
    return page(req, res, 'Tests', html);
  }

  /* ------------------------------ /complete ------------------------------ */
  if (p === '/complete/name' && method === 'POST') {
    const body = parseForm(await readBody(req));
    state.testerName = String(body.name || '').slice(0, 60);
    saveState();
    return redirect(res, '/complete');
  }
  if (p === '/complete' && method === 'GET') {
    if (!isComplete()) {
      const left = TESTS.filter(t => !state.tests[t.id]).map(t => '<li>' + esc(t.name) + ' (' + esc(t.feature) + ')</li>').join('');
      return page(req, res, 'Complete', '<h2>Not yet complete</h2><p>Progress: ' + doneCount() + '/' + TESTS.length + ' (' + pct() + '%). Still to do:</p><ul>' + left + '</ul>');
    }
    let html = '<h2>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ': COMPLETE</h2>';
    html += '<h3>1) Features in this lab</h3><p>' + FEATURES.length + ' features: ' + FEATURES.map(esc).join(', ') + '.</p>';
    html += '<h3>2) Vulnerabilities per feature</h3><ul>' + FEATURES.map(f => '<li>' + esc(f) + ': ' + TESTS.filter(t => t.feature === f).length + '</li>').join('') + '</ul>';
    html += '<h3>3) How testing was done — ' + TESTS.length + ' techniques</h3><ul>' + TESTS.map(t => '<li>' + esc(t.name) + '</li>').join('') + '</ul>';
    html += '<h3>4) What you learned</h3><ul>' + TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.lesson) + '</li>').join('') + '</ul>';
    html += '<h3>5) What this means for a real client</h3><ul>' + TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.impact) + '</li>').join('') + '</ul>';
    html += '<h3>6) Writing it in a real report</h3><ul>' + TESTS.map(t => '<li><b>' + esc(t.report.title) + '</b> — Severity: ' + esc(t.report.severity) + ' — Fix: ' + esc(t.report.remediation) + '</li>').join('') + '</ul>';
    html += '<h3>Your completion key for Lab ' + (LAB_NUMBER + 1) + '</h3><p style="font-size:20px"><code>' + esc(completionKey() || '') + '</code></p>';
    html += '<form method="POST" action="/complete/name"><p>Your name for the certificate: <input name="name" value="' + esc(state.testerName) + '" style="padding:6px"> <button>Save name</button></p></form>';
    html += '<p><a href="/certificate">View your certificate</a></p>';
    return page(req, res, 'Complete', html);
  }

  /* ----------------------------- certificate ----------------------------- */
  if (p === '/certificate' && method === 'GET') {
    if (!isComplete()) return redirect(res, '/complete');
    const name = state.testerName || (user ? user.name : 'Tester');
    const dateStr = state.completedAt ? new Date(state.completedAt).toISOString().slice(0, 10) : '';
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER}</title></head>
<body style="background:#e8e8f0;font-family:Georgia,serif">
<div style="max-width:720px;margin:50px auto;background:#fff;border:3px double #7a7;border-radius:14px;padding:42px;text-align:center">
  <img src="/logo.png" style="height:64px">
  <h1 style="margin:10px 0">Certificate of Completion</h1>
  <p>This certifies that</p>
  <h2 style="color:#1d1d2b">${esc(name)}</h2>
  <p>has completed 100% of the security tests in <b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b><br>(${TESTS.length} tests across ${FEATURES.length} features)</p>
  <p>Completed on ${esc(dateStr)}</p>
  <p style="margin-top:28px;color:#444">HexaCyberLab — Built by Md. Jony Hassain, Founder</p>
</div></body></html>`);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('not found');
}

const server = http.createServer((req, res) => {
  route(req, res).catch(() => {
    try { if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('error'); } catch (e) { /* ignore */ }
  });
});
server.listen(PORT, HOST, () => { console.log(LAB_NAME + ' lab listening on http://' + HOST + ':' + PORT); });
