'use strict';
/* ============================================================================
   HexaBooking — LAB 19 of the HexaCyberLab practice-lab series.
   A complete appointment-booking SaaS (businesses, services, staff,
   calendars, reservations) that is INTENTIONALLY VULNERABLE for hands-on
   web penetration-testing practice. Zero dependencies — Node built-ins only.
   LOCAL USE ONLY: binds 127.0.0.1, synthetic data, never deploy publicly.
   ========================================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3028;
const HOST = '127.0.0.1';
const LAB_NUMBER = 19;
const LAB_NAME = 'HexaBooking';
const PROGRESS_FILE = path.join(__dirname, 'progress.json');
const LOGO_FILE = path.join(__dirname, 'logo.png');

/* ---------------------------------------------------------------------------
   Key material (see ENGINE SPEC §7). Each key exists ONLY as encoded shards
   scattered through this file; a tiny assembler rebuilds a key at runtime at
   the single moment it is needed (entry key: inside /unlock verification;
   completion key: only once the lab is 100% complete). Never log a key.
   ------------------------------------------------------------------------- */
function _rev(s) { return s.split('').reverse().join(''); }
function _asm(shards) { return shards.map(s => _rev(Buffer.from(s, 'base64').toString('utf8'))).join(''); }

const _KS_B = ['TC1YSA==','Qy0wMg==','V0RUUQ=='];

/* ---------------------------------------------------------------------------
   Progress engine + persistence (ENGINE SPEC §4)
   ------------------------------------------------------------------------- */
let progress = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      progress = Object.assign(progress, raw);
    }
  } catch (e) { /* corrupted state file -> start fresh rather than crash */ }
}
function saveProgress() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 1)); } catch (e) { /* ignore */ }
}
function pass(id) {
  if (!progress.tests[id]) {
    progress.tests[id] = true;
    if (TESTS.every(t => progress.tests[t.id])) {
      if (!progress.completedAt) progress.completedAt = new Date().toISOString();
      progress.keyRevealed = true;
    }
    saveProgress();
  }
}
function attempt(feature) {
  progress.attempts[feature] = (progress.attempts[feature] || 0) + 1;
  saveProgress();
}
function progressSummary() {
  const total = TESTS.length;
  const done = TESTS.filter(t => progress.tests[t.id]).length;
  const features = {};
  for (const f of FEATURES) {
    const ts = TESTS.filter(t => t.feature === f);
    features[f] = { total: ts.length, done: ts.filter(t => progress.tests[t.id]).length, attempts: progress.attempts[f] || 0 };
  }
  return { lab: LAB_NAME, number: LAB_NUMBER, total, done, pct: total ? Math.floor(done / total * 100) : 0, features, complete: done === total };
}

/* ---------------------------------------------------------------------------
   TESTS registry (ENGINE SPEC §3) — 26 scored tests, detected server-side.
   ------------------------------------------------------------------------- */
const FEATURES = [
  'Login & Authentication',
  'Registration & Profile',
  'Businesses & Services',
  'Booking & Reservations',
  'Staff & Schedules',
  'Payments & Promo Codes',
  'Reviews',
  'Admin & Platform'
];

const TESTS = [
  /* ---------------- Login & Authentication (6) ---------------- */
  { id: 'sqli-login', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03 Injection', difficulty: 'Beginner',
    keys: ['sqli', 'sql injection', 'login bypass', 'injection'],
    hints: ['The login form builds its account lookup by gluing your email straight into the query text.', "Try an email that makes the WHERE clause always true — a quote, an OR and a true comparison.", "Use admin@hexabooking.local' OR '1'='1 as the email with ANY password — you land inside the first account in the table."],
    lesson: 'String-built queries let an attacker rewrite the login logic itself. Parameterised queries make the input data, never code.',
    impact: 'On a real booking platform this is a full account takeover of the first account in the table — often the platform admin — with no password at all.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.' },
    guide: 'Step by step: 1) Open /login. 2) Enter the email: admin@hexabooking.local\' OR \'1\'=\'1  3) Type any password. 4) Submit — the string-built query matches the first row (the admin) and a session is created. That is the bypass.' },
  { id: 'brute-force', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limiting or Lockout', owasp: 'A07 Auth Failures', difficulty: 'Beginner',
    keys: ['brute', 'rate limit', 'lockout', 'password guessing'],
    hints: ['Nothing slows you down here: no CAPTCHA, no delay, no lockout counter that ever blocks.', 'Script ten wrong passwords for one account and watch — every one is still processed politely.', 'Send 10 failed logins for sofia@glowsalon.local (any wrong passwords). The 10th is still accepted for processing: that missing throttle is the flaw.'],
    lesson: 'Without throttling or lockout, an attacker can try thousands of passwords per account. Rate limits, lockouts and MFA are what make guessing infeasible.',
    impact: 'A business owner account on a real platform would fall to a password-spray list overnight — and with it every customer reservation and payment record the business holds.',
    report: { title: 'No Rate Limiting or Account Lockout on Login', severity: 'High', remediation: 'Throttle attempts per account and IP, add progressive delays / lockout, and offer MFA.' },
    guide: 'Step by step: 1) Pick one account, e.g. sofia@glowsalon.local. 2) Submit 10 login attempts with wrong passwords. 3) Notice there is never a lockout, delay or CAPTCHA — the 10th attempt is processed exactly like the first. The test passes when the 10th failure is still accepted.' },
  { id: 'user-enumeration', feature: 'Login & Authentication', name: 'User Enumeration via Login & Forgot-Password Responses', owasp: 'A07 Auth Failures', difficulty: 'Beginner',
    keys: ['enumeration', 'enumerate', 'which emails exist', 'user enumeration'],
    hints: ['Compare the exact wording when the email exists vs when it does not — on BOTH the login and the forgot-password form.', 'The app is chatty: one case says the account does not exist, the other only complains about the password.', 'Probe at least 5 different emails across /login and /forgot, mixing real ones (alice@test.local) with invented ones, and diff the messages.'],
    lesson: 'Different error messages for "no such account" and "wrong password" hand attackers a free list of valid accounts to target.',
    impact: 'An attacker harvests which business owners and customers use the platform, then focuses phishing and password attacks only on real accounts.',
    report: { title: 'Account Enumeration via Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message ("invalid email or password") for every failure, on login and password reset alike.' },
    guide: 'Step by step: 1) On /forgot, request a reset for alice@test.local (exists) — note the wording. 2) Request one for a made-up address — the wording changes and admits the account does not exist. 3) Probe at least 5 distinct emails across /login and /forgot, mixing real and fake. The server can see the probing pattern: that is enumeration.' },
  { id: 'default-creds', feature: 'Login & Authentication', name: 'Weak / Default Credentials Still Active', owasp: 'A07 Auth Failures', difficulty: 'Beginner',
    keys: ['default', 'demo account', 'weak credentials', 'demo123'],
    hints: ['Old demo and seed accounts are a classic way in. This platform still carries one from its early demo days.', 'The login page used to advertise it. Think demo@… and the most predictable password a demo could have.', 'Sign in as demo@hexabooking.local with the password demo123 — the account was never removed or forced to change it.'],
    lesson: 'Demo, seed and vendor-default accounts survive into production all the time. If the password is guessable, the account is public.',
    impact: 'A leftover demo account gives an attacker a free authenticated foothold — and on a multi-tenant platform, a stepping stone into other businesses\' data.',
    report: { title: 'Active Default/Demo Account with Guessable Password', severity: 'High', remediation: 'Remove demo/seed accounts before launch, force password changes on first use, and audit for default credentials.' },
    guide: 'Step by step: 1) Go to /login. 2) Email: demo@hexabooking.local, password: demo123. 3) You are signed in — a shipped demo account with its factory password still works.' },
  { id: 'reset-token', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07 Auth Failures', difficulty: 'Intermediate',
    keys: ['reset', 'token', 'forgot', 'password reset'],
    hints: ['Request a reset and look at what the token is made of. It is not random — it is computed from things you already know.', 'The token format is RST-<user id>-<a small number derived from the email itself>.', 'For an account you know the email of: user ids are small sequential numbers, and the suffix is the sum of the email\'s character codes. Compute it, then POST /reset with that token and a new password — no inbox needed.'],
    lesson: 'Reset tokens must be long, random and single-use. A token derived from public data (email, user id) is just a second, weaker password anyone can compute.',
    impact: 'Anyone who knows a victim\'s email address can reset their password and take the account — owner accounts included — without ever touching the victim\'s inbox.',
    report: { title: 'Predictable Password Reset Token Allows Account Takeover', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), store only a hash, expire them quickly and make them single-use.' },
    guide: 'Step by step: 1) The token for an account is RST-<userId>-<sum of the email\'s character codes>. User ids are sequential from the seed data (alice is 7). 2) Compute alice\'s token offline. 3) POST /reset with email, your computed token and a new password. 4) Log in with the new password — you never saw her inbox. (A small helper: open /forgot once so you can see the format is acknowledged, then derive the token yourself.)' },
  { id: 'cookie-tamper', feature: 'Login & Authentication', name: 'Session Cookie Tampering — Client-Side Role Trusted', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    keys: ['cookie', 'session', 'role', 'tamper', 'base64'],
    hints: ['Decode your hb_session cookie (it is plain base64 JSON) and read what the server trusts from it.', 'The server believes the role written inside the cookie instead of checking your account.', 'Change the role field to admin (or owner), re-encode the cookie, and open /admin — the gate checks the cookie, not the database.'],
    lesson: 'Anything the client sends — cookies included — is attacker-controlled. Authorisation must be decided from server-side state, never from a client-carried role claim.',
    impact: 'Any registered customer can promote themselves to platform admin by editing a cookie: every business, reservation and account on the platform is exposed.',
    report: { title: 'Broken Access Control — Role Trusted from Unsigned Session Cookie', severity: 'Critical', remediation: 'Keep sessions server-side (opaque random id) or sign and verify tokens server-side; always authorise from server-side records.' },
    guide: 'Step by step: 1) Log in as alice@test.local. 2) Copy the hb_session cookie and base64-decode it — it is JSON with your uid and role. 3) Change role to "admin", re-encode, replace the cookie. 4) Open /admin. The server trusted the cookie and let a customer into the admin panel.' },

  /* ---------------- Registration & Profile (4) ---------------- */
  { id: 'mass-assignment', feature: 'Registration & Profile', name: 'Mass Assignment — Role Elevation at Registration', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    keys: ['mass assignment', 'role', 'register', 'extra fields', 'owner'],
    hints: ['The registration handler copies fields from your request into the new account far too generously.', 'The form shows name/email/password — but the handler never whitelists which fields it accepts.', 'Register a new account while adding an extra form field role=owner (or admin). The account is created with that role.'],
    lesson: 'Binding request bodies straight onto account objects lets attackers set fields that were never on the form — roles, balances, verified flags.',
    impact: 'Anyone can register directly as a business owner or admin on the live platform — full tenant access with a throwaway email, no exploit tooling needed.',
    report: { title: 'Mass Assignment in Registration Allows Role Elevation', severity: 'High', remediation: 'Whitelist bindable fields explicitly on every endpoint; never accept role/privilege fields from clients.' },
    guide: 'Step by step: 1) On /register, submit the normal form but add an extra field: role=owner. 2) The created account carries the owner role. 3) Log in — owner areas are open to an account that was supposed to be a customer.' },
  { id: 'weak-password', feature: 'Registration & Profile', name: 'Weak Password Policy — 1-Character Passwords Accepted', owasp: 'A07 Auth Failures', difficulty: 'Beginner',
    keys: ['weak password', 'password policy', 'short password'],
    hints: ['How little password will this platform accept at registration?', 'Try the smallest thing you can think of. There is no length or complexity check at all.', 'Register a new account with the password "a" (one character). It is accepted.'],
    lesson: 'A password policy is the cheapest defence there is. Accepting 1-character passwords makes every account on the platform trivially guessable.',
    impact: 'Customers who pick tiny passwords — and many will — hand their accounts (and stored payment details) to the first person who tries "a", "1" or "123".',
    report: { title: 'No Minimum Password Strength Enforced at Registration', severity: 'Medium', remediation: 'Enforce a minimum length (≥10–12) and block common passwords at registration and password change.' },
    guide: 'Step by step: 1) Open /register. 2) Create an account with a one-character password such as "a". 3) It is accepted and you can log in with it — there is no policy at all.' },
  { id: 'stored-xss-name', feature: 'Registration & Profile', name: 'Stored XSS via Display Name', owasp: 'A03 Injection', difficulty: 'Intermediate',
    keys: ['stored xss', 'display name', 'profile name', 'xss'],
    hints: ['Your display name is printed back in places other people read — including the business owner\'s dashboard when you book with them.', 'Set a name that is also a small HTML/JS payload and make a booking; the owner\'s view prints it raw.', 'In /profile, set your name to <script>alert(1)</script> (or an <img onerror> variant), then book any appointment — the payload is stored and delivered to the owner\'s dashboard.'],
    lesson: 'Stored XSS turns any user-controlled field into a weapon against other users — especially staff and admins who view it in dashboards.',
    impact: 'A malicious customer can run JavaScript in a business owner\'s browser while they review reservations — stealing their session and hijacking the business account.',
    report: { title: 'Stored Cross-Site Scripting via User Display Name', severity: 'High', remediation: 'Contextually encode all user-controlled output; treat display names as untrusted data everywhere they render.' },
    guide: 'Step by step: 1) Log in and open /profile. 2) Set your display name to a script payload. 3) Book an appointment at any business. 4) The name is stored as-is and rendered unescaped in the owner\'s reservation dashboard — stored XSS.' },
  { id: 'profile-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    keys: ['csrf', 'profile update', 'cross-site request'],
    hints: ['The profile form carries a token field — but does the server actually check it on the way in?', 'A state change that arrives without the app\'s own marker, from a foreign Origin, should be rejected. Here it is not.', 'While logged in, POST /profile/update from a cross-site Origin (e.g. Origin: https://evil.example) with a new name and NO hx_tok field. The change is applied anyway.'],
    lesson: 'Anti-CSRF tokens only protect if the server verifies them on every state-changing request. A token that is rendered but never checked is decoration.',
    impact: 'A booby-trapped web page can silently change a logged-in user\'s profile — and on similar endpoints, their email or password — just because they visited it.',
    report: { title: 'Missing CSRF Validation on Profile Update', severity: 'Medium', remediation: 'Verify the anti-CSRF token server-side on every state-changing request and check Origin/Referer as defence in depth.' },
    guide: 'Step by step: 1) Log in as any user. 2) Send POST /profile/update with your session cookie, a foreign Origin header, a new name, and no hx_tok field. 3) The profile changes anyway — the server never verified the token. That is CSRF.' },

  /* ---------------- Businesses & Services (3) ---------------- */
  { id: 'search-xss', feature: 'Businesses & Services', name: 'Reflected XSS in Business Search', owasp: 'A03 Injection', difficulty: 'Beginner',
    keys: ['reflected xss', 'search xss', 'search'],
    hints: ['Search for something that is also markup, and look at how the results page greets your query.', 'The "results for …" line prints your text exactly as you typed it.', 'Search for <script>alert(1)</script> — the payload comes back unescaped in the page.'],
    lesson: 'Reflected XSS lives wherever input is echoed without encoding — search boxes are the textbook example.',
    impact: 'An attacker can send a business owner a crafted search link that runs script in their browser — a clean phishing and session-theft channel.',
    report: { title: 'Reflected Cross-Site Scripting in Search', severity: 'Medium', remediation: 'Encode all reflected input in the appropriate output context; deploy a Content-Security-Policy as a backstop.' },
    guide: 'Step by step: 1) Use the search box on the home page. 2) Query: <script>alert(1)</script>. 3) The results page reflects the query unescaped — reflected XSS.' },
  { id: 'search-sqli', feature: 'Businesses & Services', name: 'SQL Injection in Business Search Reveals Unlisted Businesses', owasp: 'A03 Injection', difficulty: 'Intermediate',
    keys: ['search sqli', 'sql injection search', 'unlisted', 'hidden business'],
    hints: ['The catalogue search builds its filter the same sloppy way the login does.', 'A normal search only shows listed businesses. An injected one can make the filter match everything — including a business that is deliberately unlisted.', "Search for ' OR '1'='1 and compare the result set with a normal search — an extra, unlisted business appears."],
    lesson: 'Injection anywhere is injection everywhere: the same string-building habit that breaks login also leaks data the UI was carefully hiding.',
    impact: 'Competitors (or attackers) can enumerate businesses that opted out of the public directory — private tenants, test businesses, pre-launch clients.',
    report: { title: 'SQL Injection in Search Exposes Unlisted Records', severity: 'High', remediation: 'Parameterise the search query and enforce the listed/visibility filter server-side regardless of the query.' },
    guide: 'Step by step: 1) Search normally for "spa" — the unlisted Secret Spa does not appear. 2) Search for \' OR \'1\'=\'1 instead. 3) The always-true filter returns every business including the unlisted one — injection in the catalogue search.' },
  { id: 'service-edit-idor', feature: 'Businesses & Services', name: 'Service Edit IDOR — Rewriting Another Business\'s Prices', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    keys: ['service edit', 'idor', 'price edit', 'another business'],
    hints: ['Owners edit their services through /services/<id>/edit. Who checks that the service is actually yours?', 'Nobody does. Any signed-in user who can guess a service id can open its edit form.', 'As the Glow Salon owner (or even a customer), POST /services/4/update — a City Dental service — with a new price of 1. It saves.'],
    lesson: 'Object-level authorisation must be checked on every object access: "is this YOUR service?" is a server question, not a UI one.',
    impact: 'A rival business can slash or spike a competitor\'s prices platform-wide — sabotage that customers see immediately and the victim may not notice for days.',
    report: { title: 'Insecure Direct Object Reference in Service Management', severity: 'High', remediation: 'Verify ownership of the target object on every read/write; scope all queries to the caller\'s tenant.' },
    guide: 'Step by step: 1) Log in as sofia@glowsalon.local (Glow Salon). 2) Open /services/4/edit — that is City Dental\'s Checkup, not yours; the form opens anyway. 3) POST a new price. 4) The competitor\'s price changed — no ownership check exists.' },

  /* ---------------- Booking & Reservations (5) ---------------- */
  { id: 'double-booking', feature: 'Booking & Reservations', name: 'Double-Booking — No Server-Side Slot Capacity Check', owasp: 'A04 Insecure Design', difficulty: 'Intermediate',
    keys: ['double booking', 'slot', 'capacity', 'race', 'overbook'],
    hints: ['A staff member\'s slot holds exactly one customer. The calendar shows it as taken — but what does the booking endpoint itself check?', 'The UI hides full slots; the server never re-checks them. Book a slot that is already taken by posting the booking directly.', 'Bob already holds Mia at 2026-10-27 10:00. As alice, POST /book for the same staff, date and time — a second active reservation for the same slot is created.'],
    lesson: 'Capacity is a server-side invariant. If the only thing stopping a double-booking is a greyed-out button, the data will double-book.',
    impact: 'Real customers arrive to find their slot given away twice — refunds, chargebacks, and a calendar the business can no longer trust.',
    report: { title: 'Missing Server-Side Capacity Validation Allows Double-Booking', severity: 'High', remediation: 'Enforce slot capacity atomically in the booking transaction (unique constraint / serialised check-and-insert).' },
    guide: 'Step by step: 1) Note the seeded booking: Bob holds Mia (staff 1) on 2026-10-27 at 10:00 for a Haircut. 2) Log in as alice. 3) POST /book with the same staff, date and time. 4) A second active reservation now exists for the same slot — the server never checked capacity.' },
  { id: 'price-tamper', feature: 'Booking & Reservations', name: 'Booking Price Tampering — Premium Service at a Client-Chosen Price', owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    keys: ['price tamper', 'price', 'premium', 'cheap'],
    hints: ['The booking form carries the price in a hidden field. Hidden from view — not from you.', 'The server bills whatever price the request claims the service costs.', 'Book Premium Styling (true price $120) but change the hidden price field to 1 before submitting. You are charged $1.'],
    lesson: 'Prices are server-side facts. Any price, discount or total arriving from the client must be recomputed from the catalogue, never trusted.',
    impact: 'Every premium service on the platform can be bought for a dollar. Revenue leakage like this is silent — bookings look normal in every report.',
    report: { title: 'Client-Side Price Tampering in Booking Flow', severity: 'High', remediation: 'Ignore client-supplied prices; always recompute price and totals from server-side catalogue data.' },
    guide: 'Step by step: 1) Start booking Premium Styling ($120). 2) Intercept/edit the form and set the hidden price field to 1. 3) Submit. 4) The reservation is created at $1 — the server trusted the posted price.' },
  { id: 'duration-tamper', feature: 'Booking & Reservations', name: 'Duration Tampering — Longer Appointment Than Paid For', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    keys: ['duration', 'duration tamper', 'longer', 'minutes'],
    hints: ['Same family as the price field: the form also posts the appointment\'s duration, and the server files it as given.', 'A 30-minute haircut that quietly becomes a 300-minute block breaks the whole day\'s calendar.', 'Book a Haircut but set the hidden duration field to 300. The reservation stores 300 minutes for a 30-minute service.'],
    lesson: 'Every attribute of a transaction — not just price — must be derived server-side. Durations, quantities and tiers are all billing/calendar facts.',
    impact: 'Attackers (or cheap customers) block out entire days of staff time while paying for the shortest service — a denial-of-service against the business\'s diary.',
    report: { title: 'Client-Side Duration Tampering in Booking Flow', severity: 'Medium', remediation: 'Derive duration from the server-side service record; reject or ignore client-supplied durations.' },
    guide: 'Step by step: 1) Start booking a Haircut (30 minutes). 2) Set the hidden duration field to 300. 3) Submit — the stored reservation runs 300 minutes. The calendar is blocked for five hours at a 30-minute price.' },
  { id: 'reservation-view-idor', feature: 'Booking & Reservations', name: 'Reservation IDOR — Viewing Another Customer\'s Booking', owasp: 'A01 Broken Access Control', difficulty: 'Beginner',
    keys: ['reservation idor', 'view booking', 'another customer', 'privacy'],
    hints: ['Reservation pages live at /reservations/<id> and ids are small sequential numbers.', 'Open one that is not yours. What stops you?', 'As alice, open /reservations/1 — that is Bob\'s booking, with his details. Nothing stops you.'],
    lesson: 'Sequential ids plus a missing ownership check equals a full data leak: every reservation on the platform is one increment away.',
    impact: 'Names, phone numbers, appointment times and services of every customer leak — a privacy breach and a gift to social engineers targeting a business\'s clients.',
    report: { title: 'Insecure Direct Object Reference Exposes Customer Reservations', severity: 'High', remediation: 'Check that the requesting user owns (or staffs) the reservation on every access; use unguessable ids as defence in depth.' },
    guide: 'Step by step: 1) Log in as alice. 2) Browse to /reservations/1. 3) You are reading Bob\'s reservation — his service, staff, date and contact details — because the page never checks ownership.' },
  { id: 'reservation-cancel-idor', feature: 'Booking & Reservations', name: 'Reservation Cancel IDOR — Cancelling Strangers\' Appointments', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    keys: ['cancel idor', 'cancel booking', 'cancel another'],
    hints: ['Viewing is bad; cancelling is worse. The cancel endpoint has the same missing check as the view page.', 'POST to the cancel URL of a reservation that belongs to someone else.', 'As alice, POST /reservations/1/cancel — Bob\'s appointment is cancelled, and Bob is never asked.'],
    lesson: 'State-changing actions need the same ownership checks as reads — a destructive IDOR is sabotage, not just disclosure.',
    impact: 'A competitor can quietly cancel a rival\'s entire day of appointments. Customers show up to cancelled bookings; the business eats the blame.',
    report: { title: 'Insecure Direct Object Reference Allows Cancelling Other Customers\' Reservations', severity: 'High', remediation: 'Authorise the actor against the target reservation on every state change; log and alert on cancellations.' },
    guide: 'Step by step: 1) Log in as alice. 2) POST /reservations/1/cancel (Bob\'s booking). 3) Its status flips to cancelled. The endpoint acted on an object you do not own.' },

  /* ---------------- Staff & Schedules (2) ---------------- */
  { id: 'schedule-edit-idor', feature: 'Staff & Schedules', name: 'Staff Schedule IDOR — Rewriting a Rival\'s Availability', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    keys: ['schedule', 'availability', 'staff schedule', 'day off'],
    hints: ['Staff availability is edited per staff id. The endpoint trusts the id in the URL more than the session.', 'Mark another business\'s staff member as off for a whole week and watch their bookable slots vanish.', 'POST /staff/3/schedule/update (Nina at City Dental) while signed in as Glow Salon\'s owner, setting her days off. It applies.'],
    lesson: 'Tenant boundaries must be enforced on staff/administrative objects too, not just customer-facing ones.',
    impact: 'A rival can wipe a competitor\'s dentists off the calendar for a week — no bookings, no alerts, just mysteriously empty days.',
    report: { title: 'Insecure Direct Object Reference in Staff Schedule Management', severity: 'High', remediation: 'Scope schedule reads/writes to staff of the caller\'s own business (or the staff member themselves).' },
    guide: 'Step by step: 1) Log in as sofia (Glow Salon owner). 2) POST /staff/3/schedule/update — Nina belongs to City Dental. 3) Set her unavailable. 4) The change saves: cross-tenant schedule tampering.' },
  { id: 'cross-tenant-staff', feature: 'Staff & Schedules', name: 'Cross-Tenant Staff Assignment — Booking Dental Staff for a Salon Service', owasp: 'A01 Broken Access Control', difficulty: 'Advanced',
    keys: ['cross tenant', 'staff assignment', 'wrong business', 'mismatch'],
    hints: ['A booking ties a service to a staff member. Shouldn\'t they at least work at the same business?', 'The booking endpoint never compares the staff member\'s business with the service\'s business.', 'POST /book for a Glow Salon service (serviceId 1) but with staffId 3 — Nina, who works at City Dental. The booking is created across tenants.'],
    lesson: 'Relational integrity is a security control: when two objects from different tenants can be linked, isolation has already failed.',
    impact: 'Cross-tenant bookings corrupt calendars in two businesses at once and prove the tenant isolation model is broken — auditors treat this as a platform-level failure.',
    report: { title: 'Missing Tenant Consistency Check Allows Cross-Business Staff Assignment', severity: 'Medium', remediation: 'Validate that all objects in a transaction belong to the same tenant before committing.' },
    guide: 'Step by step: 1) Log in as a customer. 2) POST /book choosing serviceId 1 (Glow Salon Haircut) with staffId 3 (Nina — City Dental). 3) The reservation is created even though the staff member works for a different business.' },

  /* ---------------- Payments & Promo Codes (2) ---------------- */
  { id: 'promo-reuse', feature: 'Payments & Promo Codes', name: 'Promo Code Reuse — "Single-Use" Code Works Forever', owasp: 'A04 Insecure Design', difficulty: 'Beginner',
    keys: ['promo', 'coupon', 'reuse', 'discount', 'first20'],
    hints: ['FIRST20 promises 20% off your FIRST booking. The fine print is enforced by… nothing.', 'Use it once. Then use it again. Then again.', 'Book twice as the same customer, applying FIRST20 both times — the discount lands on every booking.'],
    lesson: 'One-time codes are a state machine, not a string comparison: issuance, redemption and per-user usage must be recorded server-side.',
    impact: 'A "new customer" promotion becomes a permanent 20% discount for anyone who hears the code — margin quietly bleeding on every booking.',
    report: { title: 'Single-Use Promo Code Can Be Redeemed Unlimited Times', severity: 'Medium', remediation: 'Record redemptions per user server-side and reject repeat use atomically at booking time.' },
    guide: 'Step by step: 1) Book any service with promo code FIRST20 — 20% comes off. 2) Book again with the same code on the same account. 3) The discount applies again — the "single-use" rule is never checked.' },
  { id: 'paid-status-tamper', feature: 'Payments & Promo Codes', name: 'Payment Status Tampering — Marking Your Own Booking "Paid"', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    keys: ['paid', 'payment status', 'mark paid', 'free service'],
    hints: ['Customers can update their reservation (notes, requests). The update handler accepts more fields than the form shows.', 'What if the request also claims the booking is already paid?', 'POST /reservations/<your id>/update adding paymentStatus=paid. Your unpaid booking now reads PAID.'],
    lesson: 'Payment state must only move through the payment flow. If a general update endpoint can flip it, every service is free.',
    impact: 'Customers receive services marked as paid without paying. Reconciliation sees "paid" bookings with no matching transaction — if anyone ever reconciles.',
    report: { title: 'Payment Status Can Be Forged Through Reservation Update (Mass Assignment)', severity: 'High', remediation: 'Whitelist updatable fields; payment status changes only via verified payment events.' },
    guide: 'Step by step: 1) Make a booking as alice (it starts unpaid). 2) POST /reservations/<its id>/update with paymentStatus=paid added. 3) The reservation now shows PAID — no money ever moved.' },

  /* ---------------- Reviews (2) ---------------- */
  { id: 'review-stored-xss', feature: 'Reviews', name: 'Stored XSS in Business Reviews', owasp: 'A03 Injection', difficulty: 'Intermediate',
    keys: ['review xss', 'stored xss review', 'review'],
    hints: ['Reviews are read by everyone — including the business owner in their dashboard. They are printed raw.', 'Leave a review whose text is also a payload.', 'Review Glow Salon with the text <script>alert(1)</script> — it is stored and rendered unescaped on the business page and the owner dashboard.'],
    lesson: 'Every stored text field is a delivery channel. Reviews, comments and names must all be encoded on output, everywhere they appear.',
    impact: 'A fake review can attack every visitor of a business\'s page — and the owner themselves — turning the platform\'s own content into the exploit.',
    report: { title: 'Stored Cross-Site Scripting in Customer Reviews', severity: 'High', remediation: 'Encode review content on render in all views; consider a strict allowlist sanitiser if any markup is permitted.' },
    guide: 'Step by step: 1) Log in as a customer. 2) Leave a review on a business with a script payload as the text. 3) Open the business page — the payload is in the page source unescaped, stored for every future visitor.' },
  { id: 'review-delete-idor', feature: 'Reviews', name: 'Review Delete IDOR — Deleting Competitors\' Reviews', owasp: 'A01 Broken Access Control', difficulty: 'Intermediate',
    keys: ['delete review', 'review idor', 'remove review'],
    hints: ['Reviews can be deleted through /reviews/<id>/delete. Whose reviews? Apparently anyone\'s.', 'Find a glowing review of a rival business and delete it as an unrelated customer.', 'POST /reviews/1/delete while signed in as someone who neither wrote it nor owns the business. It is gone.'],
    lesson: 'Moderation powers must be scoped: author, or the owning business, or a platform admin — nobody else. Missing checks turn delete buttons into vandalism tools.',
    impact: 'Businesses wake up to find their best reviews deleted by competitors — reputation damage that is hard to prove and harder to undo.',
    report: { title: 'Insecure Direct Object Reference Allows Deleting Any Review', severity: 'Medium', remediation: 'Authorise deletions to the review author, the business owner, or platform admins only.' },
    guide: 'Step by step: 1) Note a seeded review (id 1) praising a business. 2) Log in as an unrelated customer. 3) POST /reviews/1/delete. 4) The review disappears — no authorisation was checked.' },

  /* ---------------- Admin & Platform (2) ---------------- */
  { id: 'admin-csrf', feature: 'Admin & Platform', name: 'Admin Action Without CSRF Protection — Business Deleted via GET Link', owasp: 'A01 Broken Access Control', difficulty: 'Advanced',
    keys: ['admin csrf', 'delete business', 'get request', 'admin action'],
    hints: ['The most destructive action in the admin panel is a plain link — a GET request with no token at all.', 'If an admin can be lured into clicking a link while signed in, the action fires with their session.', 'As admin, simply GET /admin/businesses/2/delete — City Dental is deleted by a page view. No confirmation, no token.'],
    lesson: 'State changes must never ride on GET, and destructive admin actions need CSRF tokens plus confirmation. A link should never be able to delete a tenant.',
    impact: 'One emailed link can erase an entire business — services, staff and reservations — from the platform while an admin is just reading their mail.',
    report: { title: 'State-Changing Admin Action via GET Without CSRF Protection', severity: 'High', remediation: 'Require POST + valid CSRF token + confirmation for destructive admin actions; never mutate state on GET.' },
    guide: 'Step by step: 1) Log in as the platform admin. 2) Visit /admin/businesses/2/delete directly (that is all an attacker\'s link needs). 3) The business is deleted by a GET — the ultimate CSRF.' },
  { id: 'api-token-weak', feature: 'Admin & Platform', name: 'Predictable API Tokens — Cross-Tenant Data via the API', owasp: 'A07 Auth Failures', difficulty: 'Advanced',
    keys: ['api', 'api token', 'predictable token', 'api key'],
    hints: ['The appointments API authenticates with per-user tokens. Look at the pattern of yours (Profile page shows it).', 'Tokens are sequential and guessable — one user\'s token is arithmetic away from another\'s.', 'Tokens look like hbk-<1000 + user id>. The Glow Salon owner is user 2, so hbk-1002. Call /api/appointments?businessId=1&token=hbk-1002 with NO login session and read her business\'s appointments.'],
    lesson: 'API tokens are credentials: they must be long, random and unguessable. Sequential ids with a prefix are just usernames wearing a costume.',
    impact: 'Every business\'s full appointment book — customer names, times, services — is readable by anyone who can count, no account required.',
    report: { title: 'Predictable API Tokens Allow Unauthorised Cross-Tenant Data Access', severity: 'High', remediation: 'Issue API tokens from a CSPRNG (≥128 bits), hash them at rest, and scope each token to its tenant.' },
    guide: 'Step by step: 1) Check your own API token on /profile: it is hbk-(1000 + your user id). 2) The Glow Salon owner is user 2 → her token is hbk-1002. 3) Without logging in, GET /api/appointments?businessId=1&token=hbk-1002. 4) Her business\'s appointments are returned — the token was pure arithmetic.' }
];

/* A few more shards of key material live further down the file (spec §7). */

const _KS_D = ['LURTUA==','V1lUMg==','NUtWMw=='];
const ENTRY_KEY_SHA256 = '08f5b8689577560b7e2fa43cab37589cb3bf9ae70f6d5f41dc3d4a9e3db41fb4';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */
function completionKey() { return _asm(_KS_B.concat(_KS_D)); }

/* ---------------------------------------------------------------------------
   Seed data (in-memory; restarting the server resets the business data —
   lab progress in progress.json is NOT reset).
   ------------------------------------------------------------------------- */
const db = {
  users: [
    { id: 1, name: 'Platform Admin', email: 'admin@hexabooking.local', password: 'Admin@123', role: 'admin', businessId: null, credits: 0 },
    { id: 2, name: 'Sofia Rahman', email: 'sofia@glowsalon.local', password: 'Owner@123', role: 'owner', businessId: 1, credits: 0 },
    { id: 3, name: 'Mia Chen', email: 'mia@glowsalon.local', password: 'Staff@123', role: 'staff', businessId: 1, credits: 0 },
    { id: 4, name: 'Leo Park', email: 'leo@glowsalon.local', password: 'Staff@123', role: 'staff', businessId: 1, credits: 0 },
    { id: 5, name: 'Omar Haddad', email: 'omar@citydental.local', password: 'Owner@123', role: 'owner', businessId: 2, credits: 0 },
    { id: 6, name: 'Nina Petrova', email: 'nina@citydental.local', password: 'Staff@123', role: 'staff', businessId: 2, credits: 0 },
    { id: 7, name: 'Alice Walker', email: 'alice@test.local', password: 'alice123', role: 'customer', businessId: null, credits: 50 },
    { id: 8, name: 'Bob Martin', email: 'bob@test.local', password: 'bob123', role: 'customer', businessId: null, credits: 20 },
    { id: 9, name: 'Demo User', email: 'demo@hexabooking.local', password: 'demo123', role: 'customer', businessId: null, credits: 0, defaultCreds: true }
  ],
  businesses: [
    { id: 1, name: 'Glow Salon', category: 'Hair & Beauty', city: 'Dhaka', ownerId: 2, listed: true, blurb: 'Hair, styling and nails — book your chair in seconds.' },
    { id: 2, name: 'City Dental', category: 'Dental Clinic', city: 'Dhaka', ownerId: 5, listed: true, blurb: 'Checkups, whitening and gentle dentistry.' },
    { id: 3, name: 'Secret Spa', category: 'Spa & Massage', city: 'Dhaka', ownerId: 2, listed: false, blurb: 'Private pre-launch spa — not yet in the public directory.' }
  ],
  services: [
    { id: 1, businessId: 1, name: 'Haircut', price: 30, duration: 30 },
    { id: 2, businessId: 1, name: 'Premium Styling', price: 120, duration: 90 },
    { id: 3, businessId: 1, name: 'Manicure', price: 45, duration: 45 },
    { id: 4, businessId: 2, name: 'Dental Checkup', price: 80, duration: 30 },
    { id: 5, businessId: 2, name: 'Teeth Whitening', price: 200, duration: 60 },
    { id: 6, businessId: 3, name: 'Full-Body Massage', price: 70, duration: 60 }
  ],
  staff: [
    { id: 1, userId: 3, businessId: 1, name: 'Mia Chen', title: 'Senior Stylist', daysOff: 'Friday', notes: 'Prefers morning shifts. Private: discussing a raise with Sofia.' },
    { id: 2, userId: 4, businessId: 1, name: 'Leo Park', title: 'Barber', daysOff: 'Monday', notes: 'Certified for premium styling.' },
    { id: 3, userId: 6, businessId: 2, name: 'Nina Petrova', title: 'Dentist', daysOff: 'Sunday', notes: 'Only takes whitening cases on Thursdays.' }
  ],
  appointments: [
    { id: 1, businessId: 1, serviceId: 1, staffId: 1, customerId: 8, customerName: 'Bob Martin', date: '2026-10-27', time: '10:00', price: 30, duration: 30, promo: '', paymentStatus: 'unpaid', status: 'booked' },
    { id: 2, businessId: 2, serviceId: 4, staffId: 3, customerId: 7, customerName: 'Alice Walker', date: '2026-10-28', time: '11:00', price: 80, duration: 30, promo: '', paymentStatus: 'unpaid', status: 'booked' }
  ],
  reviews: [
    { id: 1, businessId: 2, authorId: 7, authorName: 'Alice Walker', rating: 5, text: 'Gentle, on time, spotless clinic. Best checkup I have had.' },
    { id: 2, businessId: 1, authorId: 8, authorName: 'Bob Martin', rating: 4, text: 'Great haircut, easy booking.' }
  ]
};
let nextUserId = 10, nextApptId = 3, nextReviewId = 3;
const failedLogins = {};           // email -> count (never blocks: the flaw)
const enumProbes = {};             // ip -> Map(email -> exists)
const TIMES = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

/* ---------------------------------------------------------------------------
   Small helpers
   ------------------------------------------------------------------------- */
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const XSS_RE = /<\s*script|on\w+\s*=|<\s*svg|<\s*iframe|<\s*img[^>]*onerror|javascript\s*:/i;
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function sessionOf(req) {
  const c = parseCookies(req).hb_session;
  if (!c) return null;
  try {
    const s = JSON.parse(Buffer.from(c, 'base64').toString('utf8'));
    if (!s || !s.uid) return null;
    return s; // NOTE: role is read from the cookie — see the cookie-tamper test.
  } catch (e) { return null; }
}
function userById(id) { return db.users.find(u => u.id === Number(id)); }
function bizById(id) { return db.businesses.find(b => b.id === Number(id)); }
function svcById(id) { return db.services.find(s => s.id === Number(id)); }
function staffById(id) { return db.staff.find(s => s.id === Number(id)); }
function apptById(id) { return db.appointments.find(a => a.id === Number(id)); }
function apiTokenFor(user) { return 'hbk-' + (1000 + user.id); } // predictable on purpose (api-token-weak)
function resetTokenFor(user) {
  let sum = 0; for (const ch of user.email) sum += ch.charCodeAt(0);
  return 'RST-' + user.id + '-' + sum; // predictable on purpose (reset-token)
}
function parseBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', ch => { data += ch; if (data.length > 2e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) { try { return resolve(JSON.parse(data || '{}')); } catch (e) { return resolve({}); } }
      const out = {};
      new URLSearchParams(data).forEach((v, k) => { out[k] = v; });
      resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}
function csrfSuspect(req, body) {
  const origin = req.headers.origin || req.headers.referer || '';
  const foreign = origin && !/127\.0\.0\.1|localhost/.test(origin);
  const tok = body && body.hx_tok;
  const cookieTok = parseCookies(req).hx_tok;
  return foreign || !tok || tok !== cookieTok;
}

/* ---------------------------------------------------------------------------
   Layout — header progress bar + chatbot widget on every page (spec §5, §6)
   ------------------------------------------------------------------------- */
function layout(req, title, content) {
  const s = progressSummary();
  const sess = sessionOf(req);
  const pct = s.pct;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)} — HexaBooking</title>
<style>
body{font-family:'Segoe UI',Arial,sans-serif;background:#101019;color:#eee;margin:0}
header{background:#171724;padding:10px 18px;display:flex;align-items:center;gap:14px;border-bottom:2px solid #6c4bd8}
header img{height:34px} header .lab{font-weight:700;letter-spacing:.5px}
.bar{flex:1;background:#2a2a3d;border-radius:8px;height:14px;overflow:hidden;min-width:120px}
.bar i{display:block;height:100%;background:linear-gradient(90deg,#6c4bd8,#2fb7a5);width:${pct}%}
main{max-width:980px;margin:22px auto;padding:0 16px}
a{color:#9fd8ff} .card{background:#1b1b2a;border:1px solid #33334d;border-radius:10px;padding:16px;margin:12px 0}
input,select,textarea{background:#12121e;color:#eee;border:1px solid #44445e;border-radius:6px;padding:8px;width:100%;box-sizing:border-box;margin:4px 0 10px}
button,.btn{background:#6c4bd8;color:#fff;border:0;border-radius:6px;padding:9px 16px;cursor:pointer;text-decoration:none;display:inline-block}
.btn.alt{background:#2a2a3d} .err{background:#4d1f28;border:1px solid #a33;padding:10px;border-radius:8px}
.ok{background:#1f4d38;border:1px solid #2a7;padding:10px;border-radius:8px}
table{width:100%;border-collapse:collapse} td,th{border-bottom:1px solid #33334d;padding:7px;text-align:left;vertical-align:top}
.small{color:#aaa;font-size:13px} .done{color:#5fd68a} .open{color:#f2c14e}
#chatbox{position:fixed;right:16px;bottom:16px;width:320px;background:#171724;border:1px solid #6c4bd8;border-radius:12px;overflow:hidden;z-index:50}
#chatbox h4{margin:0;padding:9px 12px;background:#6c4bd8;color:#fff;cursor:pointer}
#chatlog{height:190px;overflow:auto;padding:10px;font-size:13px;display:none}
#chatlog div{margin:6px 0} #chatlog .me{color:#9fd8ff} #chatlog .bot{color:#d8d2ff}
#chatrow{display:none;border-top:1px solid #33334d} #chatrow input{margin:0;border:0}
</style></head><body>
<header><img src="/logo.png" alt="HexaCyberLab"><span class="lab">LAB ${LAB_NUMBER} — ${LAB_NAME}</span>
<span class="small">${s.done}/${s.total} tests · ${pct}%</span><div class="bar"><i></i></div>
<nav><a href="/">Home</a> · <a href="/tests">🎯 Tests</a> · ${sess ? `<a href="/my">My bookings</a> · <a href="/profile">Profile</a> · <a href="/logout">Logout (${esc(sess.name)})</a>` : '<a href="/login">Login</a> · <a href="/register">Register</a>'}</nav></header>
<main>${content}</main>
<div id="chatbox"><h4 id="chathead">🤖 Lab Coach — click to chat</h4><div id="chatlog"></div>
<div id="chatrow"><input id="chatin" placeholder="Ask me about this lab…"><button id="chatsend">Send</button></div></div>
<script>
var opened=false;
document.getElementById('chathead').onclick=function(){opened=!opened;document.getElementById('chatlog').style.display=opened?'block':'none';document.getElementById('chatrow').style.display=opened?'flex':'none';};
function addMsg(cls,text){var d=document.createElement('div');d.className=cls;d.textContent=text;var log=document.getElementById('chatlog');log.appendChild(d);log.scrollTop=log.scrollHeight;}
function sendChat(){var inp=document.getElementById('chatin');var m=inp.value.trim();if(!m)return;inp.value='';addMsg('me','You: '+m);
fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})}).then(function(r){return r.json();}).then(function(j){addMsg('bot','Coach: '+j.reply);}).catch(function(){addMsg('bot','Coach: (chat unavailable)');});}
document.getElementById('chatsend').onclick=sendChat;
document.getElementById('chatin').addEventListener('keydown',function(e){if(e.key==='Enter')sendChat();});
</script></body></html>`;
}
function send(res, code, html) { res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); }
function redirect(res, to, extraHeaders) {
  res.writeHead(302, Object.assign({ Location: to }, extraHeaders || {}));
  res.end();
}
function gatePage(req) {
  return layout(req, 'Locked', `<div class="card"><h1>🔒 LAB ${LAB_NUMBER} — ${LAB_NAME} is locked</h1>
<p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
<form method="POST" action="/unlock"><label>Completion key from Lab ${LAB_NUMBER - 1}<input name="key" placeholder="HX-…"></label>
<button>Unlock Lab ${LAB_NUMBER}</button></form>
<p class="small">The key is earned by completing the previous lab 100%. It is never written anywhere in this app's source in plain form.</p></div>`);
}

/* ---------------------------------------------------------------------------
   Lab Coach chatbot (ENGINE SPEC §6) — rule-based, registry knowledge only.
   ------------------------------------------------------------------------- */
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
function chatReply(rawMsg) {
  const msg = String(rawMsg || '').trim();
  const m = msg.toLowerCase();
  const s = progressSummary();
  if (!msg) return 'Ask me about this lab — its features, how many tests a feature has, your progress, or how a test works (after you have tried it at least 3 times).';
  if (/who (built|made|created|developed)|who is (the )?founder|founder|jony|hexacyberlab|built (this|these|the lab)/.test(m)) return ATTRIBUTION;
  if (/key/.test(m) && /(completion|next|unlock|lab)/.test(m)) {
    if (progress.keyRevealed) return 'You completed the lab, so I can share it now. The completion key for the next lab is: ' + completionKey();
    return "I don't have the completion key yet — nobody does. It is only given to me when this lab is completed 100%. Right now you are at " + s.pct + '% (' + s.done + '/' + s.total + ' tests). Finish every test and both the completion page and I will show it.';
  }
  if (/progress|score|how am i|percent|how many.*(done|complete)/.test(m)) {
    const next = TESTS.find(t => !progress.tests[t.id]);
    return 'You are at ' + s.pct + '% — ' + s.done + ' of ' + s.total + ' tests done across ' + FEATURES.length + ' features.' + (next ? ' Next open test: "' + next.name + '" (' + next.feature + ').' : ' Everything is complete!');
  }
  // Feature / test matching
  let matchedTest = null;
  for (const t of TESTS) { if (t.keys.some(k => m.includes(k))) { matchedTest = t; break; } }
  let matchedFeature = null;
  for (const f of FEATURES) {
    const words = f.toLowerCase().replace(/[^a-z ]/g, '').split(' ').filter(w => w.length > 3);
    if (words.some(w => m.includes(w))) { matchedFeature = f; break; }
  }
  if (!matchedFeature && matchedTest) matchedFeature = matchedTest.feature;
  if (/how many|how much|count|list|which|what tests|vulnerabilit/.test(m) && (matchedFeature || /feature|test|all/.test(m))) {
    if (matchedFeature) {
      const ts = TESTS.filter(t => t.feature === matchedFeature);
      return matchedFeature + ' has ' + ts.length + ' tests: ' + ts.map(t => '"' + t.name + '" (' + (progress.tests[t.id] ? 'done' : 'open') + ')').join(', ') + '. Ask me how one works after you have tried that feature at least 3 times.';
    }
    return 'This lab has ' + s.total + ' tests across ' + FEATURES.length + ' features: ' + FEATURES.map(f => f + ' (' + TESTS.filter(t => t.feature === f).length + ')').join(' · ') + '.';
  }
  if (matchedTest || matchedFeature) {
    const t = matchedTest || TESTS.find(x => x.feature === matchedFeature && !progress.tests[x.id]) || TESTS.find(x => x.feature === matchedFeature);
    const att = progress.attempts[t.feature] || 0;
    if (progress.tests[t.id]) return 'You already completed "' + t.name + '". Here is the walkthrough anyway: ' + t.guide;
    if (att >= 3) return 'You have tried ' + t.feature + ' ' + att + ' times, so I can guide you. For "' + t.name + '": ' + t.guide;
    return 'That feature is locked for help. First try the ' + t.feature + ' tests yourself at least 3 times — I can see you\'ve tried ' + att + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  if (/hint/.test(m)) return 'Every test has 3 graded hints on the 🎯 Tests page (/tests) — reveal them one at a time. For step-by-step walkthroughs, try a feature at least 3 times, then ask me here.';
  if (/hello|hi|hey/.test(m)) return 'Hello! I am the Lab Coach for LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '. This lab has ' + s.total + ' tests in ' + FEATURES.length + ' features, and you are at ' + s.pct + '%. Ask me what a feature contains, or how a test works once you have tried it 3 times.';
  return 'I can help with this lab\'s ' + FEATURES.length + ' features and ' + s.total + ' tests: what each feature contains, your progress, and step-by-step help for a feature once you have tried it at least 3 times. The 🎯 Tests page (/tests) tracks everything and carries graded hints.';
}

/* ---------------------------------------------------------------------------
   /tests — Mission page (spec §5)
   ------------------------------------------------------------------------- */
function testsPage(req) {
  const s = progressSummary();
  let c = '<h1>🎯 Mission — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h1><p>' + s.done + '/' + s.total + ' tests · ' + s.pct + '% — tests complete by DOING: the server detects the exploit actually succeeding.</p>';
  for (const f of FEATURES) {
    const ts = TESTS.filter(t => t.feature === f);
    const att = progress.attempts[f] || 0;
    c += '<div class="card"><h2>' + esc(f) + ' <span class="small">(' + ts.filter(t => progress.tests[t.id]).length + '/' + ts.length + ' done · ' + att + ' attempt(s) logged)</span></h2>';
    for (const t of ts) {
      const done = !!progress.tests[t.id];
      c += '<div style="margin:10px 0"><span class="' + (done ? 'done' : 'open') + '">' + (done ? '✓' : '○') + '</span> <b>' + esc(t.name) + '</b> <span class="small">' + esc(t.owasp) + ' · ' + esc(t.difficulty) + '</span>';
      c += '<details><summary class="small">Hint 1</summary><p class="small">' + esc(t.hints[0]) + '</p><details><summary class="small">Hint 2</summary><p class="small">' + esc(t.hints[1]) + '</p><details><summary class="small">Hint 3 (near-answer)</summary><p class="small">' + esc(t.hints[2]) + '</p></details></details></details></div>';
    }
    c += '</div>';
  }
  return layout(req, 'Tests', c);
}

/* ---------------------------------------------------------------------------
   /complete and /certificate (spec §5)
   ------------------------------------------------------------------------- */
function completePage(req) {
  const s = progressSummary();
  if (!s.complete) {
    const left = TESTS.filter(t => !progress.tests[t.id]);
    return layout(req, 'Not yet complete', '<div class="card"><h1>Not complete yet</h1><p>You are at ' + s.pct + '% (' + s.done + '/' + s.total + '). Still open:</p><ul>' + left.map(t => '<li>' + esc(t.name) + ' <span class="small">(' + esc(t.feature) + ')</span></li>').join('') + '</ul><p><a href="/tests">Back to the mission page</a></p></div>');
  }
  const byFeat = FEATURES.map(f => {
    const ts = TESTS.filter(t => t.feature === f);
    return '<tr><td>' + esc(f) + '</td><td>' + ts.length + '</td><td>' + ts.map(t => esc(t.name)).join('<br>') + '</td></tr>';
  }).join('');
  const key = completionKey();
  const c = '<h1>🏆 Lab ' + LAB_NUMBER + ' — ' + LAB_NAME + ' COMPLETE</h1>' +
    '<div class="card"><h2>1 · What this lab contains</h2><p>' + FEATURES.length + ' features, ' + s.total + ' scored security tests.</p><table><tr><th>Feature</th><th>Tests</th><th>Names</th></tr>' + byFeat + '</table></div>' +
    '<div class="card"><h2>2 · How the testing was done</h2><p>' + s.total + ' techniques, one per test, each proven against the live app (the server detected every exploit\'s real effect):</p><ul>' + TESTS.map(t => '<li>' + esc(t.name) + ' — ' + esc(t.owasp) + '</li>').join('') + '</ul></div>' +
    '<div class="card"><h2>3 · What you learned</h2><ul>' + TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.lesson) + '</li>').join('') + '</ul></div>' +
    '<div class="card"><h2>4 · What this means for a real client</h2><ul>' + TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.impact) + '</li>').join('') + '</ul></div>' +
    '<div class="card"><h2>5 · Writing it in a real report</h2><table><tr><th>Finding</th><th>Severity</th><th>Remediation</th></tr>' + TESTS.map(t => '<tr><td>' + esc(t.report.title) + '</td><td>' + esc(t.report.severity) + '</td><td>' + esc(t.report.remediation) + '</td></tr>').join('') + '</table></div>' +
    '<div class="card"><h2>6 · Your completion key</h2><p>This key unlocks Lab ' + (LAB_NUMBER + 1) + '. Keep it — it is shown only here (and the Lab Coach can repeat it now that you are at 100%).</p><p style="font-size:20px;letter-spacing:1px"><b>' + esc(key) + '</b></p>' +
    '<form method="POST" action="/complete"><label>Your name for the certificate<input name="name" value="' + esc(progress.testerName || '') + '"></label><button>Save name</button></form>' +
    '<p><a class="btn" href="/certificate">🎓 View your certificate</a></p></div>';
  return layout(req, 'Complete', c);
}
function certificatePage(req) {
  const s = progressSummary();
  if (!s.complete) return null;
  const name = progress.testerName || 'Security Tester';
  const date = progress.completedAt ? new Date(progress.completedAt).toISOString().slice(0, 10) : '';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</title>' +
    '<style>body{font-family:Georgia,serif;background:#ececf2;display:flex;justify-content:center;padding:30px}.cert{background:#fff;color:#14141d;border:3px solid #6c4bd8;border-radius:14px;max-width:720px;padding:38px;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.25)}.cert img{height:64px}h1{letter-spacing:2px}.line{border-top:2px solid #6c4bd8;width:60%;margin:18px auto}@media print{body{background:#fff}}</style></head><body>' +
    '<div class="cert"><img src="/logo.png" alt="HexaCyberLab"><h1>CERTIFICATE OF COMPLETION</h1><p>This certifies that</p>' +
    '<h2>' + esc(name) + '</h2><div class="line"></div>' +
    '<p>has completed <b>100%</b> of the security tests in<br><b>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</b><br>(' + s.total + ' tests across ' + FEATURES.length + ' features)</p>' +
    '<p>' + esc(date) + '</p><p style="margin-top:26px"><b>HexaCyberLab</b> — Built by Md. Jony Hassain, Founder</p>' +
    '<p><a href="/complete">Back to completion page</a></p></div></body></html>';
}

/* ---------------------------------------------------------------------------
   Main router
   ------------------------------------------------------------------------- */
function recordEnumProbe(req, email, exists) {
  const ip = req.socket.remoteAddress || 'local';
  if (!enumProbes[ip]) enumProbes[ip] = new Map();
  enumProbes[ip].set(String(email).toLowerCase(), exists);
  const vals = [...enumProbes[ip].values()];
  if (enumProbes[ip].size >= 5 && vals.includes(true) && vals.includes(false)) pass('user-enumeration');
}
function startSession(res, user) {
  const sess = { uid: user.id, role: user.role, name: user.name };
  const cookie = Buffer.from(JSON.stringify(sess)).toString('base64');
  const tok = crypto.randomBytes(8).toString('hex');
  res.writeHead(302, { Location: '/', 'Set-Cookie': ['hb_session=' + cookie + '; Path=/; HttpOnly', 'hx_tok=' + tok + '; Path=/'] });
  res.end();
}
function requireLogin(req, res) {
  const sess = sessionOf(req);
  if (!sess) { redirect(res, '/login'); return null; }
  return sess;
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://127.0.0.1');
    const pathname = u.pathname;
    const method = req.method;

    if (pathname === '/logo.png') {
      if (fs.existsSync(LOGO_FILE)) { res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(fs.readFileSync(LOGO_FILE)); }
      res.writeHead(404); return res.end('no logo');
    }
    if (pathname === '/api/chat' && method === 'POST') {
      const b = await parseBody(req);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ reply: chatReply(b.message) }));
    }
    if (pathname === '/unlock' && method === 'POST') {
      const b = await parseBody(req);
      if (entryKeyMatches(String(b.key || '').trim())) {
        progress.unlocked = true; saveProgress();
        return redirect(res, '/');
      }
      res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(layout(req, 'Locked', '<div class="card"><h1>🔒 Lab ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h1><div class="err">That key did not work. The lab stays locked.</div><form method="POST" action="/unlock"><label>Completion key from Lab ' + (LAB_NUMBER - 1) + '<input name="key"></label><button>Unlock</button></form></div>'));
    }
    if (!progress.unlocked) return send(res, 200, gatePage(req));
    if (pathname === '/api/progress') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(progressSummary()));
    }
    if (pathname === '/tests') return send(res, 200, testsPage(req));
    if (pathname === '/complete') {
      if (method === 'POST') {
        const b = await parseBody(req);
        if (b.name) { progress.testerName = String(b.name).slice(0, 80); saveProgress(); }
        return redirect(res, '/complete');
      }
      return send(res, 200, completePage(req));
    }
    if (pathname === '/certificate') {
      const cert = certificatePage(req);
      if (!cert) return redirect(res, '/complete');
      return send(res, 200, cert);
    }

    /* ---------------- Auth ---------------- */
    if (pathname === '/login' && method === 'GET') {
      return send(res, 200, layout(req, 'Login', `<div class="card"><h1>Login</h1>
      <form method="POST" action="/login"><label>Email<input name="email" type="email" required></label>
      <label>Password<input name="password" type="password" required></label><button>Login</button></form>
      <p class="small"><a href="/forgot">Forgot your password?</a> · New here? <a href="/register">Create an account</a></p></div>`));
    }
    if (pathname === '/login' && method === 'POST') {
      const b = await parseBody(req);
      attempt('Login & Authentication');
      const email = String(b.email || ''), pw = String(b.password || '');
      // VULN(sqli-login): the lookup is simulated as a string-built query.
      if (/'\s*(or|and)\s+'?[\w]+'?\s*=\s*'?\w+/i.test(email) || email.includes("'--") || /'\s*or\s*1\s*=\s*1/i.test(email)) {
        pass('sqli-login');
        return startSession(res, db.users[0]);
      }
      const user = db.users.find(x => x.email.toLowerCase() === email.toLowerCase());
      if (!user) { recordEnumProbe(req, email, false); return send(res, 200, layout(req, 'Login', '<div class="card"><div class="err">No account exists for that email.</div><p><a href="/login">Try again</a></p></div>')); }
      if (user.password !== pw) {
        recordEnumProbe(req, email, true);
        failedLogins[user.email] = (failedLogins[user.email] || 0) + 1;
        if (failedLogins[user.email] >= 10) pass('brute-force');
        return send(res, 200, layout(req, 'Login', '<div class="card"><div class="err">Incorrect password for that account.</div><p><a href="/login">Try again</a></p></div>'));
      }
      if (user.defaultCreds) pass('default-creds');
      return startSession(res, user);
    }
    if (pathname === '/logout') return redirect(res, '/', { 'Set-Cookie': 'hb_session=; Path=/; Max-Age=0' });
    if (pathname === '/register' && method === 'GET') {
      return send(res, 200, layout(req, 'Register', `<div class="card"><h1>Create your account</h1>
      <form method="POST" action="/register"><label>Full name<input name="name" required></label>
      <label>Email<input name="email" type="email" required></label>
      <label>Password<input name="password" type="password" required></label><button>Register</button></form></div>`));
    }
    if (pathname === '/register' && method === 'POST') {
      const b = await parseBody(req);
      attempt('Registration & Profile');
      const email = String(b.email || '');
      if (db.users.some(x => x.email.toLowerCase() === email.toLowerCase()))
        return send(res, 200, layout(req, 'Register', '<div class="card"><div class="err">That email is already registered.</div></div>'));
      // VULN(weak-password): no length/complexity policy at all.
      if (String(b.password || '').length < 4) pass('weak-password');
      // VULN(mass-assignment): extra fields are bound straight onto the account.
      const user = { id: nextUserId++, name: String(b.name || 'User'), email, password: String(b.password || ''), role: 'customer', businessId: null, credits: 0 };
      if (b.role && b.role !== 'customer') { user.role = String(b.role); pass('mass-assignment'); if (b.role === 'owner') user.businessId = 1; }
      if (b.credits) user.credits = Number(b.credits) || 0;
      db.users.push(user);
      return startSession(res, user);
    }
    if (pathname === '/forgot' && method === 'GET') {
      return send(res, 200, layout(req, 'Forgot password', `<div class="card"><h1>Forgot your password?</h1>
      <form method="POST" action="/forgot"><label>Email<input name="email" type="email" required></label><button>Send reset link</button></form>
      <p class="small">Already have a token? <a href="/reset">Reset your password</a></p></div>`));
    }
    if (pathname === '/forgot' && method === 'POST') {
      const b = await parseBody(req);
      attempt('Login & Authentication');
      const user = db.users.find(x => x.email.toLowerCase() === String(b.email || '').toLowerCase());
      recordEnumProbe(req, b.email, !!user);
      if (!user) return send(res, 200, layout(req, 'Forgot password', '<div class="card"><div class="err">No account exists for that email.</div></div>'));
      return send(res, 200, layout(req, 'Forgot password', '<div class="card"><div class="ok">Reset link sent — check your inbox. The link contains your personal reset token.</div></div>'));
    }
    if (pathname === '/reset' && method === 'GET') {
      return send(res, 200, layout(req, 'Reset password', `<div class="card"><h1>Reset your password</h1>
      <form method="POST" action="/reset"><label>Email<input name="email" type="email" required></label>
      <label>Reset token<input name="token" required></label>
      <label>New password<input name="password" type="password" required></label><button>Reset password</button></form></div>`));
    }
    if (pathname === '/reset' && method === 'POST') {
      const b = await parseBody(req);
      attempt('Login & Authentication');
      const user = db.users.find(x => x.email.toLowerCase() === String(b.email || '').toLowerCase());
      if (user && String(b.token || '') === resetTokenFor(user)) {
        user.password = String(b.password || '');
        pass('reset-token');
        return send(res, 200, layout(req, 'Reset password', '<div class="card"><div class="ok">Password changed. <a href="/login">Login</a></div></div>'));
      }
      return send(res, 200, layout(req, 'Reset password', '<div class="card"><div class="err">That token is not valid.</div></div>'));
    }

    /* ---------------- Profile ---------------- */
    if (pathname === '/profile' && method === 'GET') {
      const sess = requireLogin(req, res); if (!sess) return;
      const user = userById(sess.uid);
      const tok = parseCookies(req).hx_tok || '';
      return send(res, 200, layout(req, 'Profile', `<div class="card"><h1>Your profile</h1>
      <p><b>${esc(user.name)}</b> · ${esc(user.email)} · role: ${esc(user.role)} · booking credits: $${esc(user.credits)}</p>
      <p class="small">Your API token: <code>${esc(apiTokenFor(user))}</code> (use it with /api/appointments)</p>
      <form method="POST" action="/profile/update"><input type="hidden" name="hx_tok" value="${esc(tok)}">
      <label>Display name<input name="name" value="${esc(user.name)}"></label><button>Save profile</button></form></div>`));
    }
    if (pathname === '/profile/update' && method === 'POST') {
      const sess = requireLogin(req, res); if (!sess) return;
      const b = await parseBody(req);
      attempt('Registration & Profile');
      const user = userById(sess.uid);
      const oldName = user.name;
      if (b.name) user.name = String(b.name);
      if (XSS_RE.test(user.name)) pass('stored-xss-name');
      if (csrfSuspect(req, b) && user.name !== oldName) pass('profile-csrf');
      return redirect(res, '/profile');
    }

    /* ---------------- Directory & search ---------------- */
    if (pathname === '/' && method === 'GET') {
      const cards = db.businesses.filter(x => x.listed).map(x =>
        `<div class="card"><h3><a href="/business/${x.id}">${esc(x.name)}</a></h3><p>${esc(x.category)} · ${esc(x.city)}</p><p>${esc(x.blurb)}</p></div>`).join('');
      return send(res, 200, layout(req, 'Home', `<h1>Book local services</h1>
      <form method="GET" action="/search"><label>Search businesses<input name="q" placeholder="salon, dental, spa…"></label><button>Search</button></form>${cards}`));
    }
    if (pathname === '/search' && method === 'GET') {
      attempt('Businesses & Services');
      const q = String(u.searchParams.get('q') || '');
      const injected = /'\s*(or|and)\s+/i.test(q) || /'\s*or\s*'1'\s*=\s*'1/i.test(q);
      let results;
      if (injected) {
        // VULN(search-sqli): always-true filter returns everything, even unlisted.
        results = db.businesses.slice();
        if (results.some(x => !x.listed)) pass('search-sqli');
      } else {
        results = db.businesses.filter(x => x.listed && (x.name + ' ' + x.category + ' ' + x.city).toLowerCase().includes(q.toLowerCase()));
      }
      // VULN(search-xss): the query is reflected unescaped.
      if (XSS_RE.test(q)) pass('search-xss');
      const list = results.map(x => `<div class="card"><h3><a href="/business/${x.id}">${esc(x.name)}</a></h3><p>${esc(x.category)} · ${esc(x.city)}${x.listed ? '' : ' · <span class="open">UNLISTED</span>'}</p></div>`).join('') || '<p>No businesses matched.</p>';
      return send(res, 200, layout(req, 'Search', `<h1>Results for ${q}</h1>${list}`));
    }
    const bizMatch = pathname.match(/^\/business\/(\d+)$/);
    if (bizMatch && method === 'GET') {
      const biz = bizById(bizMatch[1]);
      if (!biz) { res.writeHead(404); return res.end('no such business'); }
      const svcs = db.services.filter(s => s.businessId === biz.id).map(s =>
        `<tr><td>${esc(s.name)}</td><td>$${s.price}</td><td>${s.duration} min</td><td><a class="btn" href="/book?service=${s.id}">Book</a></td></tr>`).join('');
      const staffList = db.staff.filter(s => s.businessId === biz.id).map(s => `<li>${esc(s.name)} — ${esc(s.title)}</li>`).join('');
      const revs = db.reviews.filter(r => r.businessId === biz.id).map(r =>
        `<div class="card"><b>${esc(r.authorName)}</b> · ${'★'.repeat(r.rating)}<p>${r.text}</p><form method="POST" action="/reviews/${r.id}/delete"><button class="btn alt">Delete review</button></form></div>`).join('') || '<p>No reviews yet.</p>';
      return send(res, 200, layout(req, biz.name, `<h1>${esc(biz.name)}</h1><p>${esc(biz.category)} · ${esc(biz.city)}</p><p>${esc(biz.blurb)}</p>
      <div class="card"><h3>Services</h3><table><tr><th>Service</th><th>Price</th><th>Duration</th><th></th></tr>${svcs}</table></div>
      <div class="card"><h3>Team</h3><ul>${staffList}</ul></div>
      <div class="card"><h3>Reviews</h3>${revs}
      <form method="POST" action="/business/${biz.id}/review"><label>Your rating (1–5)<input name="rating" type="number" min="1" max="5" value="5"></label>
      <label>Your review<textarea name="text"></textarea></label><button>Post review</button></form></div>`));
    }
    const revPost = pathname.match(/^\/business\/(\d+)\/review$/);
    if (revPost && method === 'POST') {
      const sess = requireLogin(req, res); if (!sess) return;
      const b = await parseBody(req);
      attempt('Reviews');
      const text = String(b.text || '');
      db.reviews.push({ id: nextReviewId++, businessId: Number(revPost[1]), authorId: sess.uid, authorName: sess.name, rating: Math.min(5, Math.max(1, Number(b.rating) || 5)), text });
      if (XSS_RE.test(text)) pass('review-stored-xss');
      return redirect(res, '/business/' + revPost[1]);
    }
    const revDel = pathname.match(/^\/reviews\/(\d+)\/delete$/);
    if (revDel && method === 'POST') {
      const sess = requireLogin(req, res); if (!sess) return;
      attempt('Reviews');
      const idx = db.reviews.findIndex(r => r.id === Number(revDel[1]));
      if (idx >= 0) {
        const rev = db.reviews[idx];
        const biz = bizById(rev.businessId);
        const legit = rev.authorId === sess.uid || (biz && biz.ownerId === sess.uid) || sess.role === 'admin';
        db.reviews.splice(idx, 1);
        if (!legit) pass('review-delete-idor');
        return redirect(res, '/business/' + rev.businessId);
      }
      return redirect(res, '/');
    }

    /* ---------------- Services management ---------------- */
    const svcEdit = pathname.match(/^\/services\/(\d+)\/edit$/);
    if (svcEdit && method === 'GET') {
      const sess = requireLogin(req, res); if (!sess) return;
      const svc = svcById(svcEdit[1]); if (!svc) { res.writeHead(404); return res.end('no such service'); }
      return send(res, 200, layout(req, 'Edit service', `<div class="card"><h1>Edit service</h1>
      <form method="POST" action="/services/${svc.id}/update"><label>Name<input name="name" value="${esc(svc.name)}"></label>
      <label>Price $<input name="price" type="number" value="${svc.price}"></label>
      <label>Duration (min)<input name="duration" type="number" value="${svc.duration}"></label><button>Save service</button></form></div>`));
    }
    const svcUpd = pathname.match(/^\/services\/(\d+)\/update$/);
    if (svcUpd && method === 'POST') {
      const sess = requireLogin(req, res); if (!sess) return;
      const b = await parseBody(req);
      attempt('Businesses & Services');
      const svc = svcById(svcUpd[1]); if (!svc) { res.writeHead(404); return res.end('no such service'); }
      // VULN(service-edit-idor): no ownership check before applying the edit.
      const editor = userById(sess.uid);
      const foreign = !editor || (editor.businessId !== svc.businessId && sess.role !== 'admin');
      if (b.name) svc.name = String(b.name);
      if (b.price !== undefined) svc.price = Number(b.price);
      if (b.duration !== undefined) svc.duration = Number(b.duration);
      if (foreign) pass('service-edit-idor');
      return redirect(res, '/business/' + svc.businessId);
    }

    /* ---------------- Booking ---------------- */
    if (pathname === '/book' && method === 'GET') {
      const sess = requireLogin(req, res); if (!sess) return;
      const svc = svcById(u.searchParams.get('service'));
      if (!svc) return redirect(res, '/');
      const biz = bizById(svc.businessId);
      const staffOpts = db.staff.filter(s => s.businessId === svc.businessId).map(s => `<option value="${s.id}">${esc(s.name)} — ${esc(s.title)}</option>`).join('');
      const timeOpts = TIMES.map(t => `<option>${t}</option>`).join('');
      return send(res, 200, layout(req, 'Book', `<div class="card"><h1>Book ${esc(svc.name)} at ${esc(biz.name)}</h1>
      <p>$${svc.price} · ${svc.duration} minutes</p>
      <form method="POST" action="/book">
      <input type="hidden" name="serviceId" value="${svc.id}">
      <input type="hidden" name="price" value="${svc.price}">
      <input type="hidden" name="duration" value="${svc.duration}">
      <label>Staff member<select name="staffId">${staffOpts}</select></label>
      <label>Date<input name="date" type="date" value="2026-10-27"></label>
      <label>Time<select name="time">${timeOpts}</select></label>
      <label>Promo code (FIRST20 = 20% off your first booking)<input name="promo"></label>
      <button>Confirm booking</button></form></div>`));
    }
    if (pathname === '/book' && method === 'POST') {
      const sess = requireLogin(req, res); if (!sess) return;
      const b = await parseBody(req);
      attempt('Booking & Reservations');
      const svc = svcById(b.serviceId); if (!svc) return redirect(res, '/');
      const staff = staffById(b.staffId);
      const postedPrice = Number(b.price), postedDuration = Number(b.duration);
      let finalPrice = postedPrice;
      const promo = String(b.promo || '').trim().toUpperCase();
      if (promo === 'FIRST20') {
        attempt('Payments & Promo Codes');
        finalPrice = Math.round(postedPrice * 0.8 * 100) / 100;
        // VULN(promo-reuse): the "single use per customer" rule is never recorded.
        if (db.appointments.some(a => a.customerId === sess.uid && a.promo === 'FIRST20' && a.status === 'booked')) pass('promo-reuse');
      }
      const appt = { id: nextApptId++, businessId: svc.businessId, serviceId: svc.id, staffId: staff ? staff.id : Number(b.staffId), customerId: sess.uid, customerName: sess.name, date: String(b.date || '2026-10-27'), time: String(b.time || '09:00'), price: finalPrice, duration: postedDuration, promo, paymentStatus: 'unpaid', status: 'booked' };
      db.appointments.push(appt);
      // Detection hooks — observable effects only.
      if (postedPrice !== svc.price) pass('price-tamper');       // VULN: server billed the posted price
      if (postedDuration !== svc.duration) pass('duration-tamper'); // VULN: server stored the posted duration
      if (staff && staff.businessId !== svc.businessId) { attempt('Staff & Schedules'); pass('cross-tenant-staff'); }
      const sameSlot = db.appointments.filter(a => a.staffId === appt.staffId && a.date === appt.date && a.time === appt.time && a.status === 'booked');
      if (sameSlot.length > 1) pass('double-booking');            // VULN: no capacity check before insert
      return redirect(res, '/reservations/' + appt.id);
    }
    if (pathname === '/my' && method === 'GET') {
      const sess = requireLogin(req, res); if (!sess) return;
      const mine = db.appointments.filter(a => a.customerId === sess.uid);
      const rows = mine.map(a => { const s = svcById(a.serviceId); return `<tr><td><a href="/reservations/${a.id}">#${a.id}</a></td><td>${esc(s ? s.name : '?')}</td><td>${esc(a.date)} ${esc(a.time)}</td><td>$${a.price}</td><td>${esc(a.paymentStatus)}</td><td>${esc(a.status)}</td></tr>`; }).join('');
      return send(res, 200, layout(req, 'My bookings', `<div class="card"><h1>My bookings</h1><table><tr><th>#</th><th>Service</th><th>When</th><th>Price</th><th>Payment</th><th>Status</th></tr>${rows || '<tr><td colspan="6">No bookings yet.</td></tr>'}</table></div>`));
    }
    const resMatch = pathname.match(/^\/reservations\/(\d+)$/);
    if (resMatch && method === 'GET') {
      const sess = requireLogin(req, res); if (!sess) return;
      const appt = apptById(resMatch[1]); if (!appt) { res.writeHead(404); return res.end('no such reservation'); }
      attempt('Booking & Reservations');
      const svc = svcById(appt.serviceId), staff = staffById(appt.staffId), biz = bizById(appt.businessId);
      const staffUser = staff ? staff.userId : null;
      const legit = appt.customerId === sess.uid || staffUser === sess.uid || (biz && biz.ownerId === sess.uid) || sess.role === 'admin';
      // VULN(reservation-view-idor): the page is served to anyone signed in.
      if (!legit) pass('reservation-view-idor');
      return send(res, 200, layout(req, 'Reservation', `<div class="card"><h1>Reservation #${appt.id}</h1>
      <p><b>${esc(svc ? svc.name : '')}</b> at ${esc(biz ? biz.name : '')} with ${esc(staff ? staff.name : '')}</p>
      <p>Customer: ${esc(appt.customerName)} · ${esc(appt.date)} at ${esc(appt.time)} · ${appt.duration} min</p>
      <p>Price: $${appt.price}${appt.promo ? ' (promo ' + esc(appt.promo) + ')' : ''} · Payment: ${esc(appt.paymentStatus)} · Status: ${esc(appt.status)}</p>
      <form method="POST" action="/reservations/${appt.id}/update"><label>Notes / requests<input name="notes"></label><button>Update reservation</button></form>
      <form method="POST" action="/reservations/${appt.id}/cancel"><button class="btn alt">Cancel this reservation</button></form></div>`));
    }
    const resCancel = pathname.match(/^\/reservations\/(\d+)\/cancel$/);
    if (resCancel && method === 'POST') {
      const sess = requireLogin(req, res); if (!sess) return;
      attempt('Booking & Reservations');
      const appt = apptById(resCancel[1]); if (!appt) return redirect(res, '/my');
      const biz = bizById(appt.businessId);
      const legit = appt.customerId === sess.uid || (biz && biz.ownerId === sess.uid) || sess.role === 'admin';
      appt.status = 'cancelled';
      // VULN(reservation-cancel-idor): cancelling works on other customers' bookings.
      if (!legit) pass('reservation-cancel-idor');
      return redirect(res, '/my');
    }
    const resUpd = pathname.match(/^\/reservations\/(\d+)\/update$/);
    if (resUpd && method === 'POST') {
      const sess = requireLogin(req, res); if (!sess) return;
      const b = await parseBody(req);
      attempt('Payments & Promo Codes');
      const appt = apptById(resUpd[1]); if (!appt) return redirect(res, '/my');
      if (b.notes) appt.notes = String(b.notes);
      if (b.date) appt.date = String(b.date);
      if (b.time) appt.time = String(b.time);
      // VULN(paid-status-tamper): the update handler also honours a paymentStatus field.
      if (b.paymentStatus && appt.paymentStatus !== 'paid') { appt.paymentStatus = String(b.paymentStatus); if (appt.paymentStatus === 'paid') pass('paid-status-tamper'); }
      return redirect(res, '/reservations/' + appt.id);
    }

    /* ---------------- Staff schedules ---------------- */
    const staffMatch = pathname.match(/^\/staff\/(\d+)\/schedule$/);
    if (staffMatch && method === 'GET') {
      const sess = requireLogin(req, res); if (!sess) return;
      const st = staffById(staffMatch[1]); if (!st) { res.writeHead(404); return res.end('no such staff'); }
      return send(res, 200, layout(req, 'Schedule', `<div class="card"><h1>${esc(st.name)} — schedule</h1>
      <p>${esc(st.title)} at ${esc((bizById(st.businessId) || {}).name || '')}</p>
      <p>Days off: <b>${esc(st.daysOff)}</b></p><p class="small">Schedule notes: ${esc(st.notes)}</p>
      <form method="POST" action="/staff/${st.id}/schedule/update"><label>Days off<input name="daysOff" value="${esc(st.daysOff)}"></label>
      <label>Notes<input name="notes" value="${esc(st.notes)}"></label><button>Save schedule</button></form></div>`));
    }
    const staffUpd = pathname.match(/^\/staff\/(\d+)\/schedule\/update$/);
    if (staffUpd && method === 'POST') {
      const sess = requireLogin(req, res); if (!sess) return;
      const b = await parseBody(req);
      attempt('Staff & Schedules');
      const st = staffById(staffUpd[1]); if (!st) return redirect(res, '/');
      const editor = userById(sess.uid);
      const legit = st.userId === sess.uid || (editor && editor.businessId === st.businessId && editor.role === 'owner') || sess.role === 'admin';
      if (b.daysOff !== undefined) st.daysOff = String(b.daysOff);
      if (b.notes !== undefined) st.notes = String(b.notes);
      // VULN(schedule-edit-idor): changes apply even across tenants.
      if (!legit) pass('schedule-edit-idor');
      return redirect(res, '/staff/' + st.id + '/schedule');
    }

    /* ---------------- Owner & admin ---------------- */
    if (pathname === '/owner' && method === 'GET') {
      const sess = requireLogin(req, res); if (!sess) return;
      // VULN(cookie-tamper): the gate believes the cookie's role claim.
      if ((sess.role === 'owner' || sess.role === 'admin') && userById(sess.uid) && userById(sess.uid).role === 'customer') pass('cookie-tamper');
      if (sess.role !== 'owner' && sess.role !== 'admin') return send(res, 403, layout(req, 'Forbidden', '<div class="card"><h1>Owners only</h1></div>'));
      const me = userById(sess.uid);
      const biz = me && me.businessId ? bizById(me.businessId) : db.businesses[0];
      const list = db.appointments.filter(a => a.businessId === biz.id);
      const rows = list.map(a => `<tr><td>#${a.id}</td><td>${a.customerName}</td><td>${esc((svcById(a.serviceId) || {}).name || '')}</td><td>${esc(a.date)} ${esc(a.time)}</td><td>$${a.price}</td><td>${esc(a.status)}</td></tr>`).join('');
      return send(res, 200, layout(req, 'Owner dashboard', `<div class="card"><h1>${esc(biz.name)} — reservations</h1>
      <table><tr><th>#</th><th>Customer</th><th>Service</th><th>When</th><th>Price</th><th>Status</th></tr>${rows}</table>
      <p class="small">Manage services from the business page; manage staff schedules via /staff/&lt;id&gt;/schedule.</p></div>`));
    }
    if (pathname === '/admin' && method === 'GET') {
      const sess = requireLogin(req, res); if (!sess) return;
      if (sess.role === 'admin' && userById(sess.uid) && userById(sess.uid).role !== 'admin') pass('cookie-tamper');
      if (sess.role !== 'admin') return send(res, 403, layout(req, 'Forbidden', '<div class="card"><h1>Platform admins only</h1></div>'));
      const bizRows = db.businesses.map(x => `<tr><td>${x.id}</td><td>${esc(x.name)}</td><td>${esc(x.category)}</td><td>${x.listed ? 'listed' : 'unlisted'}</td><td><a href="/admin/businesses/${x.id}/delete">Delete</a></td></tr>`).join('');
      const userRows = db.users.map(x => `<tr><td>${x.id}</td><td>${esc(x.name)}</td><td>${esc(x.email)}</td><td>${esc(x.role)}</td></tr>`).join('');
      return send(res, 200, layout(req, 'Admin', `<div class="card"><h1>Platform admin</h1><h3>Businesses</h3><table><tr><th>#</th><th>Name</th><th>Category</th><th>Visibility</th><th></th></tr>${bizRows}</table>
      <h3>Users</h3><table><tr><th>#</th><th>Name</th><th>Email</th><th>Role</th></tr>${userRows}</table></div>`));
    }
    const admDel = pathname.match(/^\/admin\/businesses\/(\d+)\/delete$/);
    if (admDel && method === 'GET') {
      const sess = requireLogin(req, res); if (!sess) return;
      if (sess.role !== 'admin') return send(res, 403, layout(req, 'Forbidden', '<div class="card"><h1>Platform admins only</h1></div>'));
      attempt('Admin & Platform');
      const idx = db.businesses.findIndex(x => x.id === Number(admDel[1]));
      if (idx >= 0) { db.businesses.splice(idx, 1); pass('admin-csrf'); } // VULN(admin-csrf): destructive state change via GET, no token.
      return redirect(res, '/admin');
    }

    /* ---------------- API ---------------- */
    if (pathname === '/api/appointments' && method === 'GET') {
      attempt('Admin & Platform');
      const token = String(u.searchParams.get('token') || '');
      const bizId = Number(u.searchParams.get('businessId') || 0);
      const owner = db.users.find(x => apiTokenFor(x) === token);
      res.writeHead(owner ? 200 : 401, { 'Content-Type': 'application/json' });
      if (!owner) return res.end(JSON.stringify({ error: 'invalid token' }));
      // VULN(api-token-weak): tokens are sequential; any valid token reads any tenant.
      if (owner.businessId !== bizId) pass('api-token-weak');
      return res.end(JSON.stringify({ businessId: bizId, appointments: db.appointments.filter(a => a.businessId === bizId) }));
    }

    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(layout(req, 'Not found', '<div class="card"><h1>404</h1><p>That page does not exist.</p></div>'));
  } catch (e) {
    try { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('error'); } catch (_) { /* already sent */ }
  }
});

loadProgress();
server.listen(PORT, HOST, () => {
  console.log(`HexaBooking running at http://${HOST}:${PORT}  (LOCAL ONLY — deliberately vulnerable lab)`);
  console.log('Test accounts: sofia@glowsalon.local/Owner@123 (owner), alice@test.local/alice123, bob@test.local/bob123');
});
