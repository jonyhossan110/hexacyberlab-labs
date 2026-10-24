'use strict';
/* HexaSmartHome — LAB 102 of 110 (Category 11: Specialized & Advanced Business Systems)
   A deliberately vulnerable smart-home simulator for LOCAL, authorised practice only.
   Zero-dependency Node.js. Binds 127.0.0.1:3111. All data is fake seed data. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB_NUMBER = 102;
const LAB_NAME = 'HexaSmartHome';
const PORT = 3111;
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const LOGO_FILE = path.join(DIR, 'logo.png');

/* ---- key fragments (encoded shards, scattered by design — see ENGINE SPEC §7) ---- */
const _cfgA = ["TC1YSA==", "LTIwMQ==", "RE83UQ=="];
const _cfgC = ["TC1YSA==", "LTMwMQ=="];

/* ============================== SEED DATA (fake) ============================== */
const users = [
  { id: 1, name: 'Ada Admin',    email: 'admin@hexasmart.local', password: 'admin123', role: 'admin' },
  { id: 2, name: 'Alice Owner',  email: 'alice@test.local',      password: 'alice123', role: 'user' },
  { id: 3, name: 'Bob Owner',    email: 'bob@test.local',        password: 'bob123',   role: 'user' },
  { id: 4, name: 'Carol Member', email: 'carol@test.local',      password: 'carol123', role: 'user' },
  { id: 5, name: 'Dave Guest',   email: 'dave@test.local',       password: 'dave123',  role: 'user' },
  { id: 6, name: 'Demo User',    email: 'demo@hexasmart.local',  password: 'demo1234', role: 'user' },
];
let nextUserId = 7;

const homes = [
  { id: 1, name: 'Maple House', city: 'Springfield', address: '12 Maple Street', ownerId: 2, listed: true },
  { id: 2, name: 'Cedar Flat',  city: 'Riverton',    address: '4 Cedar Court',   ownerId: 3, listed: true },
  { id: 3, name: 'Lake Villa',  city: 'Lakeside',    address: '1 Hidden Shore',  ownerId: 3, listed: false },
  { id: 4, name: 'Demo Home',   city: 'Springfield', address: '9 Demo Lane',     ownerId: 6, listed: true },
];
/* permission: owner | member (control) | guest (view only) */
const memberships = [
  { homeId: 1, userId: 2, permission: 'owner' },
  { homeId: 1, userId: 4, permission: 'member' },
  { homeId: 1, userId: 5, permission: 'guest' },
  { homeId: 2, userId: 3, permission: 'owner' },
  { homeId: 3, userId: 3, permission: 'owner' },
  { homeId: 4, userId: 6, permission: 'owner' },
];
const rooms = [
  { id: 11, homeId: 1, name: 'Living Room' }, { id: 12, homeId: 1, name: 'Entrance' }, { id: 13, homeId: 1, name: 'Bedroom' },
  { id: 21, homeId: 2, name: 'Hall' },        { id: 22, homeId: 2, name: 'Entrance' },
  { id: 31, homeId: 3, name: 'Lounge' },
  { id: 41, homeId: 4, name: 'Main Room' },
];
const devices = [
  { id: 1, homeId: 1, roomId: 12, type: 'lock',      name: 'Front Door Lock',   state: 'locked' },
  { id: 2, homeId: 1, roomId: 11, type: 'light',     name: 'Living Room Light', state: 'off' },
  { id: 3, homeId: 1, roomId: 11, type: 'camera',    name: 'Living Room Cam',   state: 'on', snapshot: 'All quiet. No motion in the last hour.' },
  { id: 4, homeId: 1, roomId: 13, type: 'thermostat', name: 'Bedroom Thermostat', state: '22C' },
  { id: 5, homeId: 2, roomId: 22, type: 'lock',      name: 'Front Door Lock',   state: 'locked' },
  { id: 6, homeId: 2, roomId: 21, type: 'light',     name: 'Hall Light',        state: 'off' },
  { id: 7, homeId: 2, roomId: 21, type: 'camera',    name: 'Hall Cam',          state: 'on', snapshot: 'Motion detected at the front hall, 07:42. One person entered.' },
  { id: 8, homeId: 3, roomId: 31, type: 'camera',    name: 'Pool Cam',          state: 'on', snapshot: 'Pool area empty. Gate closed.' },
  { id: 9, homeId: 4, roomId: 41, type: 'lock',      name: 'Demo Door Lock',    state: 'locked' },
];
const scenes = [
  { id: 1, homeId: 1, name: 'Good Night', actions: 'lock doors, lights off' },
  { id: 2, homeId: 2, name: 'Away Mode',  actions: 'lock doors, cameras on, lights off' },
  { id: 3, homeId: 1, name: 'Movie Time', actions: 'dim lights, thermostat 21C' },
];
const automations = [
  { id: 1, homeId: 1, name: 'Night Lockdown', rule: 'At 23:00, lock all doors' },
  { id: 2, homeId: 2, name: 'Morning Lights', rule: 'At 07:00, turn hall light on' },
];
const activityLog = [
  { id: 1, homeId: 1, text: 'Front Door Lock unlocked by Alice Owner (keypad)', at: '2026-10-23 08:15' },
  { id: 2, homeId: 1, text: 'Living Room Cam: motion detected near the sofa', at: '2026-10-23 09:02' },
  { id: 3, homeId: 2, text: 'Hall Cam: motion detected at the front hall', at: '2026-10-23 07:42' },
  { id: 4, homeId: 2, text: 'Front Door Lock locked by Bob Owner (app)', at: '2026-10-23 07:50' },
  { id: 5, homeId: 3, text: 'Pool Cam: scheduled snapshot saved', at: '2026-10-23 06:30' },
];
let nextLogId = 6;
const invites = [ { code: 'INV-2-1', homeId: 2, email: 'carol@test.local', role: 'guest', used: false } ];
const inviteCounters = { 2: 1 };
const issuedResetTokens = {}; // userId -> token (only tokens genuinely issued via /forgot)
const sessions = new Map();    // sid -> userId

function logActivity(homeId, text) {
  activityLog.push({ id: nextLogId++, homeId, text, at: new Date().toISOString().slice(0, 16).replace('T', ' ') });
}
const userById = id => users.find(u => u.id === Number(id));
const userByEmail = e => users.find(u => u.email === String(e || '').toLowerCase());
const homeById = id => homes.find(h => h.id === Number(id));
const deviceById = id => devices.find(d => d.id === Number(id));
const membership = (homeId, userId) => memberships.find(m => m.homeId === Number(homeId) && m.userId === Number(userId));
const resetTokenFor = id => 'SH' + id + '-' + (Number(id) * 137 + 42);

/* ============================== MINI SQL EVALUATOR ==============================
   The app builds "queries" as strings (the vulnerability) and this evaluator runs
   them against in-memory rows, supporting =, LIKE, AND, OR and -- comments. */
function tokenizeSql(s) {
  const toks = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ' || c === '\t' || c === '\n') { i++; continue; }
    if (c === '-' && s[i + 1] === '-') break; // -- comment truncates the rest
    if (c === "'") { let j = i + 1, v = ''; while (j < s.length && s[j] !== "'") { v += s[j]; j++; } toks.push({ t: 'str', v }); i = j + 1; continue; }
    if (/[0-9]/.test(c)) { let j = i, v = ''; while (j < s.length && /[0-9.]/.test(s[j])) { v += s[j]; j++; } toks.push({ t: 'num', v: Number(v) }); i = j; continue; }
    if (/[A-Za-z_]/.test(c)) { let j = i, v = ''; while (j < s.length && /[A-Za-z0-9_]/.test(s[j])) { v += s[j]; j++; } toks.push({ t: 'id', v }); i = j; continue; }
    if (c === '=') { toks.push({ t: 'op', v: '=' }); i++; continue; }
    if (c === '(' || c === ')') { toks.push({ t: c, v: c }); i++; continue; }
    i++; // skip anything else
  }
  return toks;
}
function likeToRegex(p) {
  return new RegExp('^' + String(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i');
}
function evalWhere(expr, row) {
  const toks = tokenizeSql(expr); let pos = 0;
  const peek = () => toks[pos]; const next = () => toks[pos++];
  function operand() {
    const tk = next(); if (!tk) return '';
    if (tk.t === 'str' || tk.t === 'num') return tk.v;
    if (tk.t === 'id') { const v = row[tk.v]; return v === undefined ? '' : v; }
    return '';
  }
  function cmp() {
    if (peek() && peek().t === '(') { next(); const v = orExpr(); if (peek() && peek().t === ')') next(); return v; }
    const a = operand(); const tk = peek();
    if (tk && ((tk.t === 'op') || (tk.t === 'id' && /^like$/i.test(tk.v)))) {
      next(); const b = operand();
      if (tk.t === 'id') return likeToRegex(b).test(String(a));
      return String(a) === String(b);
    }
    return !!a && a !== '0';
  }
  function andExpr() { let v = cmp(); while (peek() && peek().t === 'id' && /^and$/i.test(peek().v)) { next(); const r = cmp(); v = !!(v && r); } return v; }
  function orExpr() { let v = andExpr(); while (peek() && peek().t === 'id' && /^or$/i.test(peek().v)) { next(); const r = andExpr(); v = !!(v || r); } return v; }
  try { return !!orExpr(); } catch (e) { return false; }
}
const INJ = /(\bor\b|\band\b|--|'|")/i;
const XSS = /(<\s*script|onerror\s*=|onload\s*=|<\s*svg|<\s*img|<\s*iframe|javascript:)/i;

/* ============================== TESTS REGISTRY ============================== */
const TESTS = [
  /* ---- Login & Authentication ---- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login form builds its query as a string. What happens if your input becomes part of the query logic?', "Try a quote in the email field, then close the condition early.", "Email: ' OR '1'='1' -- with any password logs you in as the first matching user."],
    lesson: 'String-built queries let attacker input change the query itself; parameterised queries keep data and logic separate.',
    impact: 'On a real client site this means anyone can sign in as the first account in the database — often the administrator — with no password at all.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements for all database access and never build SQL by string concatenation.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limiting', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['How many wrong passwords can you try for one account in a row?', 'There is no lockout, delay or CAPTCHA — count your failures past ten.', 'Fail 10+ logins for one real account and the app still happily processes the next one.'],
    lesson: 'Without throttling, lockout or MFA, password guessing is only a matter of time and a wordlist.',
    impact: 'Attackers can grind through common passwords against a real customer account until one works — then they own the home controls.',
    report: { title: 'No Rate Limiting or Account Lockout on Login', severity: 'High', remediation: 'Add progressive delays/lockout after repeated failures, alert the account owner, and offer MFA.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User Enumeration via Login & Forgot-Password', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['Compare the exact wording of a failed login for a real email vs an invented one.', 'The forgot-password form answers differently too.', 'Probe 5+ different emails across login/forgot: real accounts say "Incorrect password", unknown ones say "No account".'],
    lesson: 'Different error messages for "no such user" and "wrong password" hand attackers a valid-account list for free.',
    impact: 'Attackers first harvest which emails are registered, then aim password attacks only at accounts that actually exist.',
    report: { title: 'Account Enumeration via Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message ("invalid credentials" / "if the account exists…") for every failure case.' } },
  { id: 'auth-demo', feature: 'Login & Authentication', name: 'Published Demo Credentials', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Read the login page carefully — everything on it.', 'A demo account is advertised with its password.', 'Sign in with the demo credentials printed on the login page (demo@hexasmart.local).'],
    lesson: 'Demo and default accounts with known passwords are real accounts — attackers try them first.',
    impact: 'A public demo login gives anyone a foothold account inside the platform, ready to attack real households from within.',
    report: { title: 'Demo Account Credentials Published on the Login Page', severity: 'Medium', remediation: 'Remove demo credentials from production, disable demo accounts, and force unique strong passwords.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a reset for your own account and study the token format.', 'The token is derived from something guessable about the user — their numeric id.', 'Token = SH<id>-<id*137+42>. Compute it for another user (e.g. id 3) and reset their password without ever requesting a token for them.'],
    lesson: 'Reset tokens must be long, random and single-use; a token computed from a user id is an open door.',
    impact: 'Anyone who knows a victim\'s user id can reset their password and take over the account — and every device in their home.',
    report: { title: 'Password Reset Token Is Predictable (Derived from User ID)', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (128+ bits), store hashes, expire them quickly and make them single-use.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Role Cookie Tampering into Admin', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After login, inspect the cookies the app set. One of them describes your role — and the server trusts it.', 'The admin panel checks the cookie, not your account.', 'Set the hx_role cookie to "admin" in your browser and open /admin.'],
    lesson: 'Authorisation decisions must come from server-side session data, never from values the client can edit.',
    impact: 'Any user can promote themselves to administrator by editing a cookie — full platform compromise in seconds.',
    report: { title: 'Admin Authorisation Based on a Client-Controlled Cookie', severity: 'Critical', remediation: 'Derive roles from the server-side session record only; never trust role claims in cookies or form fields.' } },
  /* ---- Registration & Profile ---- */
  { id: 'reg-weak', feature: 'Registration & Profile', name: 'Weak Password Policy (1-Character Passwords)', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a new account and see how short a password you can get away with.', 'Try a single character.', 'Register with the password "x" — the account is created.'],
    lesson: 'A password policy is a security control; accepting 1-character passwords makes every account trivially guessable.',
    impact: 'Customers who pick weak passwords get their home accounts cracked almost instantly.',
    report: { title: 'No Minimum Password Strength Enforced at Registration', severity: 'Medium', remediation: 'Enforce a minimum length (12+) and screen against breached-password lists.' } },
  { id: 'reg-mass', feature: 'Registration & Profile', name: 'Mass Assignment — Admin Role at Registration', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration handler copies the whole submitted body onto the new user record.', 'What extra field would a normal form never send, but an attacker can add?', 'POST /register with an added field role=admin — the new account is an administrator.'],
    lesson: 'Bind only whitelisted fields from user input; blindly assigning request bodies exposes privileged attributes.',
    impact: 'Attackers mint their own admin accounts at will — no exploit chain needed, just one extra form field.',
    report: { title: 'Mass Assignment Allows Privilege Escalation at Registration', severity: 'Critical', remediation: 'Whitelist assignable fields on registration/profile endpoints and set roles only server-side.' } },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is rendered on member lists and admin pages without encoding.', 'Put markup in the name at registration.', 'Register with a name like <script>alert(1)</script> and view a page that lists users.'],
    lesson: 'Any user-controlled string rendered as HTML becomes stored XSS unless it is output-encoded.',
    impact: 'One malicious account can run script in the browsers of household members and admins who view the list — session theft follows.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Contextually output-encode all user data and add a Content-Security-Policy header.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The app sets an hx_origin marker cookie and its own forms include the marker. The profile endpoint never checks it.', 'A state-changing POST with no marker at all is accepted.', 'POST /profile with a new name but no hx_origin cookie/field — it succeeds. That request could come from any website.'],
    lesson: 'State-changing endpoints need an unforgeable CSRF token (or strict SameSite + origin checks).',
    impact: 'A victim browsing any malicious page while signed in can have their profile silently changed by a cross-site form post.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require a per-session CSRF token on all state-changing requests and verify Origin/Referer.' } },
  /* ---- Homes & Rooms ---- */
  { id: 'home-idor', feature: 'Homes & Rooms', name: "IDOR — Another Household's Home Dashboard", owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Home ids are small sequential numbers in the URL.', 'The dashboard checks that you are signed in — not that the home is yours.', 'Sign in as Alice and open /home/2 (Bob\'s home): full device states and address are served.'],
    lesson: 'Every object access must verify the requester owns (or belongs to) that object — authentication is not authorisation.',
    impact: 'Anyone can browse strangers\' homes: addresses, device layouts and whether doors are locked — a burglar\'s shopping list.',
    report: { title: 'Insecure Direct Object Reference on Home Dashboard', severity: 'High', remediation: 'Check household membership on every home-scoped route and return 404/403 for non-members.' } },
  { id: 'home-sqli', feature: 'Homes & Rooms', name: 'SQL Injection in Home Search (Hidden Home Dump)', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Search builds a LIKE query as a string, the same way login does.', 'One home is deliberately unlisted and never appears in normal search.', "Search for ' OR '1'='1' -- and the hidden Lake Villa appears in the results."],
    lesson: 'Injection in search is as dangerous as in login — it turns a filter into a full data dump.',
    impact: 'Unlisted properties — often the privacy-conscious or high-value homes — are exposed to anyone with a browser.',
    report: { title: 'SQL Injection in Home Search Exposes Unlisted Properties', severity: 'High', remediation: 'Parameterise search queries and enforce the listed/visibility filter server-side.' } },
  { id: 'home-xss', feature: 'Homes & Rooms', name: 'Reflected XSS in Search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The search term is echoed in the results heading.', 'It is echoed without encoding.', 'Search for <script>alert(1)</script> and view the page source of the heading.'],
    lesson: 'Reflected input must be encoded in the exact context where it is rendered.',
    impact: 'A crafted search link sent to a homeowner runs script in their session when clicked.',
    report: { title: 'Reflected Cross-Site Scripting in Search Results', severity: 'Medium', remediation: 'Output-encode reflected parameters and deploy a Content-Security-Policy.' } },
  /* ---- Devices & Control ---- */
  { id: 'dev-idor', feature: 'Devices & Control', name: "IDOR — Control Another Home's Devices", owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The control endpoint checks the device exists — not whose home it is in.', 'Find a device id from another home (Bob\'s front door lock is device 5).', 'As Alice, POST /device/5/control with state=unlocked. Bob\'s door unlocks.'],
    lesson: 'Write endpoints need the same ownership checks as read endpoints — control actions are the most sensitive of all.',
    impact: 'A stranger can unlock the front door of someone else\'s house from the internet. This is the nightmare scenario for a smart-home platform.',
    report: { title: 'Missing Authorisation on Device Control Endpoint (Cross-Household)', severity: 'Critical', remediation: 'Authorise every control action against household membership and log cross-household attempts.' } },
  { id: 'dev-guest', feature: 'Devices & Control', name: 'Guest Permission Bypass — Unlocking the Front Door', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Dave is a guest in Maple House: view-only by design.', 'The control endpoint never looks at the membership permission level.', 'Sign in as Dave and POST /device/1/control state=unlocked — the lock obeys a view-only guest.'],
    lesson: 'Permission levels must be enforced server-side on every action, not just hidden in the UI.',
    impact: 'A babysitter or Airbnb guest with view-only access can unlock doors — the exact abuse the permission system exists to prevent.',
    report: { title: 'View-Only Guests Can Control Devices (Missing Permission Check)', severity: 'High', remediation: 'Enforce membership permission (owner/member) on all device control routes.' } },
  { id: 'dev-camera', feature: 'Devices & Control', name: "Camera Feed IDOR — Another Home's Snapshot", owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Camera pages are just device pages with a snapshot description.', 'No membership check stands between you and device 7.', 'As Alice, open /device/7 — Bob\'s hall camera snapshot details are served.'],
    lesson: 'Privacy-sensitive objects (camera views) need the strictest ownership checks, applied per object.',
    impact: 'Strangers can peek into other people\'s homes through their own cameras — a grave privacy breach.',
    report: { title: 'Insecure Direct Object Reference on Camera Device Page', severity: 'High', remediation: 'Verify household membership before serving any device page, especially cameras.' } },
  { id: 'dev-name-xss', feature: 'Devices & Control', name: 'Stored XSS via Device Name', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Device names are rendered raw on the home dashboard and in the activity log.', 'Any member can rename a device; nobody encodes the name.', 'Rename a device to <script>alert(1)</script> via POST /device/2/rename and open the home page.'],
    lesson: 'Stored strings are rendered in many places — encode on output everywhere, not only where the input arrived.',
    impact: 'A malicious household member plants script that fires for the homeowner and admins viewing the dashboard.',
    report: { title: 'Stored Cross-Site Scripting via Device Name', severity: 'High', remediation: 'Output-encode device names in every view (dashboard, logs, admin) and validate name length/characters.' } },
  { id: 'dev-api-token', feature: 'Devices & Control', name: 'Weak API Token — base64(email)', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['The device API accepts an x-api-token header instead of a session.', 'The "token" is a reversible encoding of something public — the account email.', 'Send GET /api/devices with header x-api-token set to base64 of bob@test.local, no cookies: his devices come back.'],
    lesson: 'An API credential must be a high-entropy secret; encoding a public identifier is not a token.',
    impact: 'Anyone who knows a customer\'s email address — public information — gets full API access to their devices.',
    report: { title: 'API Authentication Token Is Simply base64(email)', severity: 'High', remediation: 'Issue random, revocable API tokens, store them hashed, and scope them per household.' } },
  /* ---- Members & Invites ---- */
  { id: 'inv-escalation', feature: 'Members & Invites', name: 'Invite Accept Role Escalation — Guest to Owner', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    hints: ['Carol holds a guest invite to Cedar Flat (the code format is INV-<home>-<n>; hers is INV-2-1).', 'The accept endpoint trusts a role field in the request body more than the invite itself.', 'POST /invite/accept with code INV-2-1 and an added role=owner — Carol becomes OWNER of Bob\'s home.'],
    lesson: 'Privilege must come from the server-side record (the invite), never from fields the invitee supplies.',
    impact: 'A guest invited to view cameras ends up owning the house account — able to remove the real owner and add their own devices.',
    report: { title: 'Role Escalation via Mass Assignment on Invite Acceptance', severity: 'Critical', remediation: 'Assign the role stored on the invite record; ignore any role supplied by the client.' } },
  { id: 'inv-predictable', feature: 'Members & Invites', name: 'Predictable Invite Code — Joining Without an Invite', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    hints: ['Invite codes follow a visible pattern: INV-<homeId>-<sequence>.', 'The accept endpoint has a fallback: a well-formed code is trusted even if it was never issued.', 'As Alice, POST /invite/accept with code INV-2-99 (never issued) — you join Cedar Flat anyway.'],
    lesson: 'Access codes must be unguessable random values verified against issued records — pattern-shaped fallbacks destroy the control.',
    impact: 'Anyone can join any household by guessing a short code, gaining member access to locks and cameras.',
    report: { title: 'Invite Acceptance Trusts Predictable, Unissued Codes', severity: 'High', remediation: 'Generate invite codes with a CSPRNG, verify them against issued invites only, expire and single-use them.' } },
  { id: 'member-remove-owner', feature: 'Members & Invites', name: 'Member Removes the Home Owner', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The member-removal endpoint checks you are signed in — nothing more.', 'It does not compare your permission with the target\'s.', 'As Carol (a plain member), POST /home/1/members/remove with userId=2 — Alice, the owner, is removed from her own home.'],
    lesson: 'Destructive membership actions need role hierarchy checks (only owners manage members; owners cannot be removed by members).',
    impact: 'Any invited member can seize a household by ejecting the owner, then control every device in it.',
    report: { title: 'Missing Authorisation on Member Removal Allows Owner Ejection', severity: 'High', remediation: 'Restrict member management to owners and forbid removing the home owner.' } },
  /* ---- Scenes & Automations ---- */
  { id: 'scene-idor', feature: 'Scenes & Automations', name: "Run Another Home's Scene by ID", owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Scenes execute real device actions for their home. The run endpoint asks only for a scene id.', 'Scene 2 is Bob\'s "Away Mode" for Cedar Flat.', 'As Alice, POST /scene/2/run — Bob\'s scene executes: his doors lock and cameras switch on.'],
    lesson: 'Action endpoints that trigger physical effects need the same membership checks as the device controls they wrap.',
    impact: 'An outsider can trigger scenes in strangers\' homes — locking doors, killing lights — without ever opening the device page.',
    report: { title: 'Missing Authorisation on Scene Execution Endpoint', severity: 'High', remediation: 'Authorise scene execution against the scene\'s household membership.' } },
  { id: 'auto-csrf', feature: 'Scenes & Automations', name: 'CSRF on Automation Delete', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Deleting an automation is a state-changing POST with no CSRF marker check.', 'The app\'s own delete form includes the hx_origin marker; a cross-site form would not.', 'POST /automation/1/delete with no hx_origin cookie/field — the rule is deleted.'],
    lesson: 'Every state-changing route needs CSRF defence — security automations are high-value targets.',
    impact: 'A homeowner visiting a malicious page could silently lose the automation that locks their doors at night.',
    report: { title: 'Missing CSRF Protection on Automation Deletion', severity: 'Medium', remediation: 'Require per-session CSRF tokens on all state-changing endpoints.' } },
  /* ---- Activity & Privacy ---- */
  { id: 'log-idor', feature: 'Activity & Privacy', name: "Read Another Home's Activity Log", owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The activity log shows when doors unlocked and when cameras saw motion.', 'The log page is scoped by home id in the URL — and unchecked.', 'As Alice, open /home/2/log: Bob\'s lock and camera history is fully readable.'],
    lesson: 'Audit/activity data is sensitive personal data and needs the same access control as the objects it describes.',
    impact: 'Strangers learn exactly when a house is empty and when its occupants come and go — intelligence for a physical break-in.',
    report: { title: 'Insecure Direct Object Reference on Household Activity Log', severity: 'High', remediation: 'Restrict activity logs to household members and minimise retained event detail.' } },
  /* ---- Admin Panel ---- */
  { id: 'admin-users', feature: 'Admin Panel', name: 'User List with Passwords Exposed to Any User', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['There is a JSON endpoint the admin UI uses: /admin/users.json.', 'It checks only that *someone* is signed in.', 'As Alice (a normal user), GET /admin/users.json — every account, including passwords, comes back.'],
    lesson: 'API endpoints behind an admin UI need their own authorisation checks; hiding the page is not protecting the data.',
    impact: 'Every customer password is one request away from any signed-in user — total platform account takeover.',
    report: { title: 'Broken Access Control on Admin User List Endpoint (Passwords Exposed)', severity: 'Critical', remediation: 'Require the admin role on the endpoint itself and never return password material in any response.' } },
  /* ---- Platform & API ---- */
  { id: 'plat-debug', feature: 'Platform & API', name: 'Unauthenticated Debug Dump (/api/debug)', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Development leftovers often live under /api/.', 'This one needs no session, no token, nothing.', 'GET /api/debug with no cookies at all: users, homes, devices and memberships are dumped as JSON.'],
    lesson: 'Debug/diagnostic endpoints must never ship to production; if they exist, they need admin auth and auditing.',
    impact: 'A completely unauthenticated attacker downloads the entire platform database in one request.',
    report: { title: 'Unauthenticated Debug Endpoint Exposes Full Platform Data', severity: 'Critical', remediation: 'Remove debug endpoints from production builds and gate diagnostics behind admin authentication.' } },
];
const FEATURES = [...new Set(TESTS.map(t => t.feature))];

/* more key fragments, kept apart from the first group on purpose */
const _seedX = ["MzI4MQ==", "NlA1LQ=="];
const _sceneZ = ["UUZYMw==", "TTkxMw==", "OURLLQ=="];

/* ============================== PROGRESS ENGINE ============================== */
let S = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false, probes: { brute: {}, enum: [] } };
function loadState() {
  try { if (fs.existsSync(PROGRESS_FILE)) { const d = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); if (d && typeof d === 'object') S = Object.assign(S, d); } } catch (e) { /* start fresh */ }
  if (!S.probes) S.probes = { brute: {}, enum: [] };
}
function save() { try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(S, null, 1)); } catch (e) { /* ignore */ } }
loadState();
const totalTests = TESTS.length;
const doneCount = () => TESTS.filter(t => S.tests[t.id]).length;
const isComplete = () => doneCount() === totalTests;
const pct = () => Math.floor(doneCount() * 100 / totalTests);
function attempt(feature) { S.attempts[feature] = (S.attempts[feature] || 0) + 1; save(); }
function pass(id) {
  if (!S.tests[id]) {
    S.tests[id] = true;
    if (isComplete() && !S.completedAt) { S.completedAt = new Date().toISOString(); S.keyRevealed = true; }
    save();
  }
}
function featureStats() {
  const out = {};
  for (const f of FEATURES) {
    const ts = TESTS.filter(t => t.feature === f);
    out[f] = { total: ts.length, done: ts.filter(t => S.tests[t.id]).length, attempts: S.attempts[f] || 0 };
  }
  return out;
}

/* ---- key assembly (remaining fragments live here, near the gate logic) ---- */
const _gateB = ["VERUTQ==", "Tw=="];
const _tailQ = ["TjU3Rg==", "Mw=="];
const _unsh = arr => arr.map(x => [...Buffer.from(x, 'base64').toString('utf8')].reverse().join('')).join('');
const entryKey = () => _unsh([..._cfgA, ..._seedX, ..._gateB]);
const completionKey = () => isComplete() ? _unsh([..._cfgC, ..._sceneZ, ..._tailQ]) : null;

/* ============================== HTTP HELPERS ============================== */
const esc = s => String(s == null ? '' : s); // NOTE: deliberately no output encoding anywhere (the lab's XSS flaws)
function parseCookies(req) {
  const out = {}; const h = req.headers.cookie || '';
  for (const part of h.split(';')) { const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); }
  return out;
}
function readBody(req) {
  return new Promise(resolve => {
    let data = ''; req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) { try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); } }
      else { const out = {}; for (const pair of data.split('&')) { if (!pair) continue; const i = pair.indexOf('='); out[decodeURIComponent(pair.slice(0, i).replace(/\+/g, ' '))] = decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' ')); } resolve(out); }
    });
    req.on('error', () => resolve({}));
  });
}
function sessionUser(req) { const c = parseCookies(req); return c.hx_sid ? userById(sessions.get(c.hx_sid)) : null; }
function hasMarker(req, body) { const c = parseCookies(req); return c.hx_origin === 'present' || (body && body.hx_origin === 'present'); }
function send(res, code, html, extra) {
  res.writeHead(code, Object.assign({ 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': 'hx_origin=present; Path=/' }, extra || {}));
  res.end(html);
}
function json(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); }
function redirect(res, to, extra) { res.writeHead(302, Object.assign({ Location: to, 'Set-Cookie': 'hx_origin=present; Path=/' }, extra || {})); res.end(); }

function layout(req, title, body) {
  const u = sessionUser(req);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title} — HexaSmartHome</title>
<style>body{font-family:system-ui,Arial,sans-serif;margin:0;background:#0f1420;color:#e8ecf4}a{color:#7ab3ff}header{background:#161e30;padding:10px 18px;display:flex;gap:14px;align-items:center;flex-wrap:wrap}header img{height:34px}.bar{flex:1;min-width:180px;background:#2a3550;border-radius:6px;height:16px;position:relative}.bar i{position:absolute;inset:0;width:${pct()}%;background:linear-gradient(90deg,#3a7bfd,#9b5bff);border-radius:6px}main{padding:18px;max-width:980px;margin:0 auto}.card{background:#182136;border:1px solid #2a3550;border-radius:10px;padding:14px;margin:10px 0}input,select,button{padding:7px 10px;border-radius:6px;border:1px solid #3a4562;background:#0f1626;color:#e8ecf4}button{background:#2f5fd0;cursor:pointer}.muted{color:#9aa7c2}table{border-collapse:collapse}td,th{border:1px solid #2a3550;padding:5px 9px;text-align:left}.done{color:#5fd97a}.open{color:#e8c15a}details{margin:4px 0}#chat{position:fixed;right:14px;bottom:14px;width:320px;background:#182136;border:1px solid #3a4562;border-radius:10px;padding:10px;z-index:9}#chatlog{max-height:180px;overflow:auto;font-size:13px;margin-bottom:8px}.cert{border:3px solid #c9a227;border-radius:14px;padding:28px;text-align:center;background:#121a2c}@media print{#chat{display:none}}</style></head>
<body><header><img src="/logo.png" alt="HexaCyberLab"><strong>LAB ${LAB_NUMBER} — ${LAB_NAME}</strong>
<span>LAB ${LAB_NUMBER} · ${doneCount()}/${totalTests} tests · ${pct()}%</span><span class="bar"><i></i></span>
<nav>${u ? `<a href="/">My Homes</a> · <a href="/search">Search</a> · <a href="/tests">Mission Board</a> · <a href="/profile">Profile</a> · <span class="muted">${esc(u.name)} (${esc(u.email)})</span> · <a href="/logout">Logout</a>` : `<a href="/login">Login</a> · <a href="/register">Register</a> · <a href="/tests">Mission Board</a>`}</nav></header>
<main>${body}</main>
<div id="chat"><strong>Lab Coach</strong><div id="chatlog"></div>
<form id="chatform"><input id="chatmsg" style="width:70%" placeholder="Ask the coach…"><button>Send</button></form></div>
<script>const cf=document.getElementById('chatform');cf.addEventListener('submit',async e=>{e.preventDefault();const m=document.getElementById('chatmsg');const log=document.getElementById('chatlog');log.innerHTML+='<div><b>You:</b> '+m.value.replace(/</g,'&lt;')+'</div>';const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m.value})});const j=await r.json();log.innerHTML+='<div><b>Coach:</b> '+j.reply.replace(/</g,'&lt;')+'</div>';m.value='';log.scrollTop=1e6;});</script>
</body></html>`;
}
function gatePage(req, err) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Locked — LAB ${LAB_NUMBER}</title><style>body{font-family:system-ui,Arial;background:#0f1420;color:#e8ecf4;padding:30px}.card{max-width:520px;margin:40px auto;background:#182136;border:1px solid #2a3550;border-radius:10px;padding:22px}input,button{padding:8px;border-radius:6px}</style></head><body><div class="card">
<img src="/logo.png" style="height:44px"><h2>🔒 LAB ${LAB_NUMBER} — ${LAB_NAME} is locked</h2>
<p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
${err ? '<p style="color:#ff8080">' + err + '</p>' : ''}
<form method="POST" action="/unlock"><input name="key" style="width:70%" placeholder="Completion key from Lab ${LAB_NUMBER - 1}"><button>Unlock</button></form>
<p style="color:#9aa7c2;font-size:13px">The Lab Coach (bottom-right on the full site) can still tell you who built these labs.</p></div></body></html>`;
}

/* ============================== PAGES ============================== */
function loginPage(req, msg) {
  return layout(req, 'Login', `<h2>Sign in to HexaSmartHome</h2>${msg ? '<p style="color:#ff9c9c">' + msg + '</p>' : ''}
<form method="POST" action="/login"><p>Email <input name="email" size="32"></p><p>Password <input name="password" type="password" size="32"></p><button>Sign in</button></form>
<p><a href="/forgot">Forgot password?</a> · <a href="/register">Create account</a></p>
<div class="card"><b>Just looking around?</b> Use our public demo home account — email: <b>demo@hexasmart.local</b> · password: <b>demo1234</b></div>`);
}
function registerPage(req, msg) {
  return layout(req, 'Register', `<h2>Create your account</h2>${msg ? '<p style="color:#ff9c9c">' + msg + '</p>' : ''}
<form method="POST" action="/register"><p>Name <input name="name" size="32"></p><p>Email <input name="email" size="32"></p><p>Password <input name="password" type="password" size="32"></p><button>Register</button></form>`);
}
function homeListPage(req) {
  const u = sessionUser(req);
  const mine = memberships.filter(m => m.userId === u.id);
  const cards = mine.map(m => { const h = homeById(m.homeId); return `<div class="card"><b><a href="/home/${h.id}">${esc(h.name)}</a></b> — ${esc(h.city)}, ${esc(h.address)}<br><span class="muted">Your permission: ${m.permission} · ${devices.filter(d => d.homeId === h.id).length} devices</span></div>`; }).join('');
  return layout(req, 'My Homes', `<h2>My Homes</h2>${cards || '<p>No homes yet.</p>'}
<div class="card"><b>Accept an invite</b><form method="POST" action="/invite/accept"><input name="code" placeholder="INV-…"> <button>Accept invite</button></form></div>`);
}
function homePage(req, h) {
  const u = sessionUser(req);
  const m = membership(h.id, u.id);
  const rm = rooms.filter(r => r.homeId === h.id);
  const devs = devices.filter(d => d.homeId === h.id);
  const sc = scenes.filter(s => s.homeId === h.id);
  const au = automations.filter(a => a.homeId === h.id);
  return layout(req, h.name, `<h2>${esc(h.name)}</h2><p class="muted">${esc(h.address)}, ${esc(h.city)} · Owner: ${esc((userById(h.ownerId) || {}).name || '')} · Your permission: ${m ? m.permission : 'none (visitor)'}</p>
<h3>Rooms &amp; Devices</h3>${rm.map(r => `<div class="card"><b>${esc(r.name)}</b>${devs.filter(d => d.roomId === r.id).map(d => `<div>• <a href="/device/${d.id}">${esc(d.name)}</a> <span class="muted">(${d.type}) — state: ${esc(d.state)}</span>
<form method="POST" action="/device/${d.id}/control" style="display:inline"><input name="state" size="10" placeholder="new state"><button>Control</button></form>
<form method="POST" action="/device/${d.id}/rename" style="display:inline"><input name="name" size="14" placeholder="new name"><button>Rename</button></form></div>`).join('')}</div>`).join('')}
<h3>Scenes</h3>${sc.map(s => `<div class="card">${esc(s.name)} <span class="muted">(${esc(s.actions)})</span> <form method="POST" action="/scene/${s.id}/run" style="display:inline"><button>Run scene</button></form></div>`).join('') || '<p class="muted">No scenes.</p>'}
<h3>Automations</h3>${au.map(a => `<div class="card">${esc(a.name)} <span class="muted">${esc(a.rule)}</span> <form method="POST" action="/automation/${a.id}/delete" style="display:inline"><input type="hidden" name="hx_origin" value="present"><button>Delete</button></form></div>`).join('') || '<p class="muted">No automations.</p>'}
<p><a href="/home/${h.id}/members">Household members</a> · <a href="/home/${h.id}/log">Activity log</a></p>`);
}
function devicePage(req, d) {
  const h = homeById(d.homeId);
  let extra = '';
  if (d.type === 'camera') extra = `<div class="card"><b>Latest snapshot</b><br>${esc(d.snapshot || '')}</div>`;
  return layout(req, d.name, `<h2>${esc(d.name)}</h2><p class="muted">${d.type} in ${esc(h.name)} — state: ${esc(d.state)}</p>${extra}
<form method="POST" action="/device/${d.id}/control"><input name="state" placeholder="new state (e.g. unlocked)"><button>Control device</button></form>
<p><a href="/home/${h.id}">Back to ${esc(h.name)}</a></p>`);
}
function membersPage(req, h) {
  const ms = memberships.filter(m => m.homeId === h.id);
  return layout(req, 'Members', `<h2>Members of ${esc(h.name)}</h2><table><tr><th>Name</th><th>Email</th><th>Permission</th><th></th></tr>
${ms.map(m => { const mu = userById(m.userId); return `<tr><td>${esc(mu.name)}</td><td>${esc(mu.email)}</td><td>${m.permission}</td><td><form method="POST" action="/home/${h.id}/members/remove"><input type="hidden" name="userId" value="${mu.id}"><button>Remove</button></form></td></tr>`; }).join('')}</table>
<div class="card"><b>Invite someone</b><form method="POST" action="/home/${h.id}/invite"><input name="email" placeholder="email"> <select name="role"><option>guest</option><option>member</option></select> <button>Create invite</button></form>
<p class="muted">Pending invites: ${invites.filter(i => i.homeId === h.id && !i.used).map(i => esc(i.code) + ' (' + esc(i.email) + ', ' + i.role + ')').join(', ') || 'none'}</p></div>`);
}
function logPage(req, h) {
  const rows = activityLog.filter(l => l.homeId === h.id);
  return layout(req, 'Activity log', `<h2>Activity — ${esc(h.name)}</h2>${rows.map(l => `<div class="card">${esc(l.at)} — ${esc(l.text)}</div>`).join('') || '<p class="muted">No activity yet.</p>'}`);
}
function searchPage(req, q, results) {
  return layout(req, 'Search', `<h2>Search homes</h2><form method="GET" action="/search"><input name="q" size="34" value="${esc(q || '')}"><button>Search</button></form>
${q !== undefined ? `<p>Results for: ${esc(q)}</p>` + (results.map(h => `<div class="card"><b>${esc(h.name)}</b> — ${esc(h.city)} <span class="muted">${h.listed ? '' : '(unlisted)'}</span></div>`).join('') || '<p class="muted">No matches.</p>') : ''}`);
}
function profilePage(req, msg) {
  const u = sessionUser(req);
  return layout(req, 'Profile', `<h2>My profile</h2>${msg ? '<p>' + msg + '</p>' : ''}
<form method="POST" action="/profile"><input type="hidden" name="hx_origin" value="present"><p>Display name <input name="name" size="32" value="${esc(u.name)}"></p><p>Email <input size="32" value="${esc(u.email)}" disabled></p><p>Role: ${esc(u.role)}</p><button>Save</button></form>`);
}
function testsPage(req) {
  const fs2 = featureStats();
  const groups = FEATURES.map(f => `<h3>${f} <span class="muted">(${fs2[f].done}/${fs2[f].total} done · ${fs2[f].attempts} attempt(s) on this feature)</span></h3>` +
    TESTS.filter(t => t.feature === f).map(t => `<div class="card"><span class="${S.tests[t.id] ? 'done' : 'open'}">${S.tests[t.id] ? '✓ done' : '○ open'}</span> <b>${t.name}</b> <span class="muted">${t.owasp} · ${t.difficulty}</span>
    ${[0, 1, 2].map(i => `<details><summary>Hint ${i + 1}</summary>${t.hints[i]}</details>`).join('')}</div>`).join('')).join('');
  return layout(req, 'Mission Board', `<h2>Mission Board — LAB ${LAB_NUMBER} ${LAB_NAME}</h2><p>${doneCount()}/${totalTests} tests · ${pct()}% — tests flip only when the exploit really works.</p>${groups}`);
}

/* ============================== LAB COACH (chatbot) ============================== */
const FEATURE_MATCHERS = [
  ['Members & Invites', /invite|member|household member|remove.*owner|guest.*owner/i],
  ['Devices & Control', /device|lock|camera|light|thermostat|unlock|snapshot/i],
  ['Scenes & Automations', /scene|automation|rule/i],
  ['Activity & Privacy', /activity|\blog\b|privacy|come and go|history/i],
  ['Login & Authentication', /login|sign in|password|reset|brute|enumerat|cookie|demo|auth/i],
  ['Registration & Profile', /register|sign up|profile|registration|mass assignment/i],
  ['Homes & Rooms', /home|room|search|idor|dashboard/i],
  ['Admin Panel', /admin|user list/i],
  ['Platform & API', /api|debug|platform|token/i],
];
function coachReply(raw) {
  const msg = String(raw || '');
  const stats = featureStats();
  if (/who (built|made|created)|founder|md\.? jony|hexacyberlab/i.test(msg)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (/\bkey\b|unlock.*next|next lab/i.test(msg)) {
    if (isComplete() && S.keyRevealed) return 'You finished LAB ' + LAB_NUMBER + '! The completion key for the next lab is: ' + completionKey();
    return "I don't have the completion key yet — I only receive it when this lab reaches 100%. Right now you are at " + pct() + '% (' + doneCount() + '/' + totalTests + '). Finish every test on the Mission Board (/tests) and the key will appear on /complete — and I will be able to share it then.';
  }
  const matched = FEATURE_MATCHERS.find(([, re]) => re.test(msg));
  const wantsHow = /how (do|to|can)|solve|exploit|bypass|attack|guide|step by step/i.test(msg);
  const wantsCount = /how many|count|list|which|what (tests|vulnerabilities|features)/i.test(msg);
  if (matched && wantsCount && !wantsHow) {
    const f = matched[0]; const ts = TESTS.filter(t => t.feature === f);
    return f + ' has ' + ts.length + ' tests: ' + ts.map(t => t.name + (S.tests[t.id] ? ' (done)' : '')).join('; ') + '. Progress on this feature: ' + stats[f].done + '/' + stats[f].total + '.';
  }
  if (matched && (wantsHow || !wantsCount)) {
    const f = matched[0]; const ts = TESTS.filter(t => t.feature === f);
    const open = ts.filter(t => !S.tests[t.id]);
    if (!open.length) return 'You have already completed every test in ' + f + '. Well done — pick another feature on /tests.';
    const att = S.attempts[f] || 0;
    if (att >= 3) {
      return 'Step by step for ' + f + ':\n' + open.map(t => '• ' + t.name + ' — ' + t.hints[2]).join('\n');
    }
    return 'That feature is locked for help. First try the ' + f + " tests yourself at least 3 times — I can see you've tried " + att + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  if (/how many|features|tests|progress|status/i.test(msg)) {
    return 'LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ' has ' + totalTests + ' tests across ' + FEATURES.length + ' features: ' + FEATURES.map(f => f + ' (' + stats[f].total + ')').join(', ') + '. Your progress: ' + doneCount() + '/' + totalTests + ' (' + pct() + '%). Next open test: ' + (TESTS.find(t => !S.tests[t.id]) || {}).name + '. Full map with hints: /tests.';
  }
  if (/^(hi|hello|hey|help|start)/i.test(msg)) {
    return 'Hello! I am the Lab Coach for LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '. You are at ' + pct() + '% (' + doneCount() + '/' + totalTests + ' tests). Open /tests for the mission board — every test has 3 graded hints. Try a feature at least 3 times and I can guide you step by step. Ask me "how many tests in Login & Authentication" or "how do I solve the device tests".';
  }
  return 'I can help with LAB ' + LAB_NUMBER + ': ask me how many tests a feature has, ask how to solve a feature (after 3 real tries I unlock step-by-step guidance), or open /tests for the mission board and hints. Your progress: ' + doneCount() + '/' + totalTests + ' (' + pct() + '%).';
}

/* ============================== COMPLETE & CERTIFICATE ============================== */
function completePage(req) {
  const fs2 = featureStats();
  if (!isComplete()) {
    const left = TESTS.filter(t => !S.tests[t.id]);
    return layout(req, 'Not yet', `<h2>Lab not complete yet — ${doneCount()}/${totalTests} (${pct()}%)</h2>
<p>Still open:</p>${left.map(t => `<div class="card">○ <b>${t.name}</b> <span class="muted">${t.feature}</span></div>`).join('')}`);
  }
  const key = completionKey();
  const byFeature = FEATURES.map(f => `<tr><td>${f}</td><td>${fs2[f].total}</td></tr>`).join('');
  return layout(req, 'Lab Complete', `<h2>🎉 LAB ${LAB_NUMBER} — ${LAB_NAME} complete: ${totalTests}/${totalTests} tests across ${FEATURES.length} features</h2>
<h3>1) Features in this lab</h3><table><tr><th>Feature</th><th>Vulnerability tests</th></tr>${byFeature}</table>
<h3>2) Per-feature vulnerability counts</h3><p>${FEATURES.map(f => f + ': ' + fs2[f].total).join(' · ')}</p>
<h3>3) How testing was done (${totalTests} techniques)</h3><ul>${TESTS.map(t => `<li>${t.name} — ${t.owasp}</li>`).join('')}</ul>
<h3>4) What you learned</h3><ul>${TESTS.map(t => `<li><b>${t.name}:</b> ${t.lesson}</li>`).join('')}</ul>
<h3>5) What this means for a real client</h3><ul>${TESTS.map(t => `<li><b>${t.name}:</b> ${t.impact}</li>`).join('')}</ul>
<h3>6) Writing it in a real report</h3><ul>${TESTS.map(t => `<li><b>${t.report.title}</b> — Severity: ${t.report.severity}. Remediation: ${t.report.remediation}</li>`).join('')}</ul>
<div class="card"><h3>🔑 Completion key — paste it into Lab ${LAB_NUMBER + 1} to unlock it</h3><p style="font-size:20px"><b>${key}</b></p>
<form method="POST" action="/complete"><p>Your name for the certificate: <input name="testerName" value="${esc(S.testerName)}" size="30"><button>Save name</button></p></form>
<p><a href="/certificate">View your certificate</a></p></div>`);
}
function certificatePage(req) {
  if (!isComplete()) return layout(req, 'Certificate', '<h2>Certificate locked</h2><p>Finish 100% of the tests first — see <a href="/complete">/complete</a>.</p>');
  const u = sessionUser(req);
  const name = S.testerName || (u ? u.name : 'HexaCyberLab Tester');
  const date = (S.completedAt || new Date().toISOString()).slice(0, 10);
  return `<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER}</title><style>body{font-family:Georgia,serif;background:#eceff5;padding:30px}.cert{max-width:720px;margin:0 auto;border:3px solid #c9a227;border-radius:14px;padding:36px;text-align:center;background:#fff;color:#1a2338}@media print{body{background:#fff}}</style></head>
<body><div class="cert"><img src="/logo.png" style="height:64px"><h1>Certificate of Completion</h1>
<p>This certifies that</p><h2>${esc(name)}</h2>
<p>has completed 100% of the security tests in <b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b> (${totalTests} tests across ${FEATURES.length} features)</p>
<p>Completed on ${date}</p><p><i>HexaCyberLab — Built by Md. Jony Hassain, Founder</i></p></div></body></html>`;
}

/* ============================== ROUTES ============================== */
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    const p = url.pathname;
    const cookies = parseCookies(req);

    if (p === '/logo.png') { try { const img = fs.readFileSync(LOGO_FILE); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(img); } catch (e) { res.writeHead(404); return res.end('no logo'); } }
    if (p === '/api/progress') return json(res, 200, { lab: LAB_NAME, number: LAB_NUMBER, total: totalTests, done: doneCount(), pct: pct(), features: featureStats(), complete: isComplete() });
    if (p === '/api/chat' && req.method === 'POST') { const b = await readBody(req); return json(res, 200, { reply: coachReply(b.message) }); }
    if (p === '/unlock' && req.method === 'POST') {
      const b = await readBody(req);
      const given = String(b.key || '');
      if (given && given === entryKey()) { S.unlocked = true; save(); return redirect(res, '/'); }
      res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(gatePage(req, 'That key was not accepted.'));
    }
    if (!S.unlocked) { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(gatePage(req)); }

    /* ---- platform endpoints (reachable while unlocked; debug is unauthenticated by design) ---- */
    if (p === '/api/debug') { attempt('Platform & API'); pass('plat-debug'); return json(res, 200, { users, homes, devices, memberships, scenes, invites }); }
    if (p === '/api/devices') {
      attempt('Devices & Control');
      const tok = req.headers['x-api-token'];
      let u = sessionUser(req);
      if (!u && tok) { try { const em = Buffer.from(String(tok), 'base64').toString('utf8'); const tu = userByEmail(em); if (tu) { u = tu; pass('dev-api-token'); } } catch (e) { /* bad token */ } }
      if (!u) return json(res, 401, { error: 'unauthorized' });
      const myHomes = memberships.filter(m => m.userId === u.id).map(m => m.homeId);
      return json(res, 200, { devices: devices.filter(d => myHomes.includes(d.homeId)) });
    }

    /* ---- auth ---- */
    if (p === '/login' && req.method === 'GET') return send(res, 200, loginPage(req));
    if (p === '/login' && req.method === 'POST') {
      const b = await readBody(req); attempt('Login & Authentication');
      const email = String(b.email || ''), password = String(b.password || '');
      const expr = "email = '" + email + "' AND password = '" + password + "'";
      const found = users.find(x => evalWhere(expr, x));
      const real = userByEmail(email);
      // enumeration probes: distinct emails tried across login + forgot
      if (!S.probes.enum.includes(email.toLowerCase())) { S.probes.enum.push(email.toLowerCase()); }
      if (S.probes.enum.length >= 5) pass('auth-enum');
      if (found) {
        if (INJ.test(email) || INJ.test(password) || found.password !== password) pass('auth-sqli');
        if (found.email === 'demo@hexasmart.local') pass('auth-demo');
        const sid = crypto.randomBytes(12).toString('hex'); sessions.set(sid, found.id);
        return redirect(res, '/', { 'Set-Cookie': ['hx_sid=' + sid + '; Path=/', 'hx_role=' + found.role + '; Path=/', 'hx_origin=present; Path=/'] });
      }
      if (real) { S.probes.brute[real.email] = (S.probes.brute[real.email] || 0) + 1; if (S.probes.brute[real.email] >= 10) pass('auth-brute'); save(); return send(res, 200, loginPage(req, 'Incorrect password.')); }
      save();
      return send(res, 200, loginPage(req, 'No account found for that email.'));
    }
    if (p === '/logout') { const c = parseCookies(req); if (c.hx_sid) sessions.delete(c.hx_sid); return redirect(res, '/login', { 'Set-Cookie': ['hx_sid=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0'] }); }
    if (p === '/register' && req.method === 'GET') return send(res, 200, registerPage(req));
    if (p === '/register' && req.method === 'POST') {
      const b = await readBody(req); attempt('Registration & Profile');
      const email = String(b.email || '').toLowerCase();
      if (userByEmail(email)) return send(res, 200, registerPage(req, 'That email is already registered.'));
      const nu = { id: nextUserId++, name: String(b.name || 'User'), email, password: String(b.password || ''), role: 'user' };
      if (b.role) { nu.role = String(b.role); if (nu.role === 'admin') pass('reg-mass'); }
      if (nu.password.length < 4) pass('reg-weak');
      if (XSS.test(nu.name)) pass('reg-xss');
      users.push(nu);
      const sid = crypto.randomBytes(12).toString('hex'); sessions.set(sid, nu.id);
      return redirect(res, '/', { 'Set-Cookie': ['hx_sid=' + sid + '; Path=/', 'hx_role=' + nu.role + '; Path=/', 'hx_origin=present; Path=/'] });
    }
    if (p === '/forgot' && req.method === 'GET') return send(res, 200, layout(req, 'Forgot', '<h2>Forgot password</h2><form method="POST" action="/forgot"><p>Email <input name="email" size="32"></p><button>Send reset link</button></form>'));
    if (p === '/forgot' && req.method === 'POST') {
      const b = await readBody(req); attempt('Login & Authentication');
      const email = String(b.email || '').toLowerCase(); const real = userByEmail(email);
      if (!S.probes.enum.includes(email)) { S.probes.enum.push(email); if (S.probes.enum.length >= 5) pass('auth-enum'); }
      if (real) { const t = resetTokenFor(real.id); issuedResetTokens[real.id] = t; save(); return send(res, 200, layout(req, 'Forgot', '<p>Reset link sent. Your reset token is: <b>' + t + '</b> — open <a href="/reset">/reset</a> and use it.</p>')); }
      save();
      return send(res, 200, layout(req, 'Forgot', '<p>No account found for that email.</p>'));
    }
    if (p === '/reset' && req.method === 'GET') return send(res, 200, layout(req, 'Reset', '<h2>Reset password</h2><form method="POST" action="/reset"><p>Token <input name="token" size="30"></p><p>New password <input name="password" type="password"></p><button>Reset</button></form>'));
    if (p === '/reset' && req.method === 'POST') {
      const b = await readBody(req); attempt('Login & Authentication');
      const token = String(b.token || ''); const m = token.match(/^SH(\d+)-(\d+)$/);
      if (m && resetTokenFor(Number(m[1])) === token && userById(Number(m[1]))) {
        const target = userById(Number(m[1])); target.password = String(b.password || 'x');
        if (issuedResetTokens[target.id] !== token) pass('auth-reset');
        delete issuedResetTokens[target.id];
        return send(res, 200, layout(req, 'Reset', '<p>Password reset for ' + esc(target.email) + '. <a href="/login">Sign in</a>.</p>'));
      }
      return send(res, 200, layout(req, 'Reset', '<p>Invalid token.</p>'));
    }

    const u = sessionUser(req);
    if (p === '/tests') { if (!u) return redirect(res, '/login'); return send(res, 200, testsPage(req)); }
    if (!u) return redirect(res, '/login');

    /* ---- profile ---- */
    if (p === '/profile' && req.method === 'GET') return send(res, 200, profilePage(req));
    if (p === '/profile' && req.method === 'POST') {
      const b = await readBody(req); attempt('Registration & Profile');
      if (!hasMarker(req, b)) pass('reg-csrf');
      if (b.name) { u.name = String(b.name); if (XSS.test(u.name)) pass('reg-xss'); }
      return send(res, 200, profilePage(req, 'Saved.'));
    }

    /* ---- homes & search ---- */
    if (p === '/') return send(res, 200, homeListPage(req));
    if (p === '/search') {
      attempt('Homes & Rooms');
      const q = url.searchParams.get('q');
      if (q === null) return send(res, 200, searchPage(req, undefined, []));
      const expr = "name LIKE '%" + q + "%' OR city LIKE '%" + q + "%'";
      let results = homes.filter(h => evalWhere(expr, h));
      if (!INJ.test(q)) results = results.filter(h => h.listed);
      else if (results.some(h => !h.listed)) pass('home-sqli');
      if (XSS.test(q)) pass('home-xss');
      return send(res, 200, searchPage(req, q, results));
    }
    let mm;
    if ((mm = p.match(/^\/home\/(\d+)$/))) { const h = homeById(mm[1]); if (!h) { res.writeHead(404); return res.end('not found'); } attempt('Homes & Rooms'); if (!membership(h.id, u.id)) pass('home-idor'); return send(res, 200, homePage(req, h)); }
    if ((mm = p.match(/^\/home\/(\d+)\/log$/))) { const h = homeById(mm[1]); if (!h) { res.writeHead(404); return res.end('not found'); } attempt('Activity & Privacy'); if (!membership(h.id, u.id)) pass('log-idor'); return send(res, 200, logPage(req, h)); }
    if ((mm = p.match(/^\/home\/(\d+)\/members$/)) && req.method === 'GET') { const h = homeById(mm[1]); if (!h) { res.writeHead(404); return res.end('not found'); } return send(res, 200, membersPage(req, h)); }
    if ((mm = p.match(/^\/home\/(\d+)\/members\/remove$/)) && req.method === 'POST') {
      const h = homeById(mm[1]); if (!h) { res.writeHead(404); return res.end('not found'); }
      const b = await readBody(req); attempt('Members & Invites');
      const targetId = Number(b.userId); const actorM = membership(h.id, u.id);
      const idx = memberships.findIndex(x => x.homeId === h.id && x.userId === targetId);
      if (idx >= 0) { memberships.splice(idx, 1); if (targetId === h.ownerId && (!actorM || actorM.permission !== 'owner')) pass('member-remove-owner'); logActivity(h.id, (userById(targetId) || {}).name + ' was removed from the household by ' + u.name); }
      return redirect(res, '/home/' + h.id + '/members');
    }
    if ((mm = p.match(/^\/home\/(\d+)\/invite$/)) && req.method === 'POST') {
      const h = homeById(mm[1]); if (!h) { res.writeHead(404); return res.end('not found'); }
      const b = await readBody(req); attempt('Members & Invites');
      inviteCounters[h.id] = (inviteCounters[h.id] || 0) + 1;
      invites.push({ code: 'INV-' + h.id + '-' + inviteCounters[h.id], homeId: h.id, email: String(b.email || ''), role: String(b.role || 'guest'), used: false });
      return redirect(res, '/home/' + h.id + '/members');
    }
    if (p === '/invite/accept' && req.method === 'POST') {
      const b = await readBody(req); attempt('Members & Invites');
      const code = String(b.code || '').trim();
      const inv = invites.find(i => i.code === code && !i.used);
      if (inv) {
        inv.used = true;
        const assigned = b.role ? String(b.role) : inv.role;
        if (b.role && String(b.role) === 'owner' && inv.role !== 'owner') pass('inv-escalation');
        const ex = membership(inv.homeId, u.id); if (ex) ex.permission = assigned; else memberships.push({ homeId: inv.homeId, userId: u.id, permission: assigned });
        logActivity(inv.homeId, u.name + ' joined the household (' + assigned + ')');
        return redirect(res, '/home/' + inv.homeId);
      }
      const pm = code.match(/^INV-(\d+)-(\d+)$/);
      if (pm && homeById(Number(pm[1]))) { // fallback bug: well-formed but never-issued codes are trusted
        pass('inv-predictable');
        const hid = Number(pm[1]); const ex = membership(hid, u.id); if (ex) ex.permission = 'member'; else memberships.push({ homeId: hid, userId: u.id, permission: 'member' });
        logActivity(hid, u.name + ' joined the household (unverified invite code)');
        return redirect(res, '/home/' + hid);
      }
      return send(res, 200, layout(req, 'Invite', '<p>That invite code was not accepted.</p><p><a href="/">Back</a></p>'));
    }

    /* ---- devices ---- */
    if ((mm = p.match(/^\/device\/(\d+)$/)) && req.method === 'GET') {
      const d = deviceById(mm[1]); if (!d) { res.writeHead(404); return res.end('not found'); }
      attempt('Devices & Control');
      if (d.type === 'camera' && !membership(d.homeId, u.id)) pass('dev-camera');
      return send(res, 200, devicePage(req, d));
    }
    if ((mm = p.match(/^\/device\/(\d+)\/control$/)) && req.method === 'POST') {
      const d = deviceById(mm[1]); if (!d) { res.writeHead(404); return res.end('not found'); }
      const b = await readBody(req); attempt('Devices & Control');
      const m = membership(d.homeId, u.id);
      if (!m) pass('dev-idor');
      else if (m.permission === 'guest') pass('dev-guest');
      d.state = String(b.state || d.state);
      logActivity(d.homeId, d.name + ' set to "' + d.state + '" by ' + u.name);
      return redirect(res, '/device/' + d.id);
    }
    if ((mm = p.match(/^\/device\/(\d+)\/rename$/)) && req.method === 'POST') {
      const d = deviceById(mm[1]); if (!d) { res.writeHead(404); return res.end('not found'); }
      const b = await readBody(req); attempt('Devices & Control');
      if (b.name) { d.name = String(b.name); if (XSS.test(d.name)) pass('dev-name-xss'); logActivity(d.homeId, 'Device renamed to ' + d.name + ' by ' + u.name); }
      return redirect(res, '/home/' + d.homeId);
    }

    /* ---- scenes & automations ---- */
    if ((mm = p.match(/^\/scene\/(\d+)\/run$/)) && req.method === 'POST') {
      const s = scenes.find(x => x.id === Number(mm[1])); if (!s) { res.writeHead(404); return res.end('not found'); }
      await readBody(req); attempt('Scenes & Automations');
      if (!membership(s.homeId, u.id)) pass('scene-idor');
      logActivity(s.homeId, 'Scene "' + s.name + '" ran (' + s.actions + ') by ' + u.name);
      return redirect(res, '/home/' + s.homeId);
    }
    if ((mm = p.match(/^\/automation\/(\d+)\/delete$/)) && req.method === 'POST') {
      const idx = automations.findIndex(x => x.id === Number(mm[1])); if (idx < 0) { res.writeHead(404); return res.end('not found'); }
      const b = await readBody(req); attempt('Scenes & Automations');
      if (!hasMarker(req, b)) pass('auto-csrf');
      const gone = automations.splice(idx, 1)[0];
      return redirect(res, '/home/' + gone.homeId);
    }

    /* ---- admin ---- */
    if (p === '/admin/users.json') { attempt('Admin Panel'); if (u.role !== 'admin') pass('admin-users'); return json(res, 200, { users }); }
    if (p === '/admin') {
      if (u.role === 'admin' || cookies.hx_role === 'admin') {
        if (u.role !== 'admin' && cookies.hx_role === 'admin') pass('auth-cookie');
        return send(res, 200, layout(req, 'Admin', '<h2>Admin Panel</h2><table><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th></tr>' + users.map(x => `<tr><td>${x.id}</td><td>${esc(x.name)}</td><td>${esc(x.email)}</td><td>${x.role}</td></tr>`).join('') + '</table>'));
      }
      res.writeHead(403); return res.end('forbidden');
    }

    /* ---- lab completion surfaces ---- */
    if (p === '/complete' && req.method === 'GET') return send(res, 200, completePage(req));
    if (p === '/complete' && req.method === 'POST') { const b = await readBody(req); if (b.testerName !== undefined) { S.testerName = String(b.testerName); save(); } return redirect(res, '/complete'); }
    if (p === '/certificate') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(certificatePage(req)); }

    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(layout(req, '404', '<h2>404 — page not found</h2>'));
  } catch (e) {
    try { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('internal error'); } catch (e2) { /* socket gone */ }
  }
});

/* ============================== DOC GENERATION ============================== */
function genDocs() {
  const byF = f => TESTS.filter(t => t.feature === f);
  let v = '# HexaSmartHome (LAB 102) — Vulnerability Map\n\nAll ' + totalTests + ' scored tests, grouped by feature. Every flaw below is live and detectable server-side when the exploit succeeds.\n';
  for (const f of FEATURES) { v += '\n## ' + f + '\n'; for (const t of byF(f)) v += '\n### ' + t.name + '\n- OWASP: ' + t.owasp + ' · Difficulty: ' + t.difficulty + '\n- Impact: ' + t.impact + '\n- Lesson: ' + t.lesson + '\n'; }
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'), v);
  let g = '# HexaSmartHome (LAB 102) — Practice Guide\n\nChallenges grouped by feature, then difficulty. Each challenge lists its 3 graded hints and a measurable objective: the test flips on the Mission Board (/tests) only when the exploit really works.\n';
  const order = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  for (const f of FEATURES) { g += '\n## ' + f + '\n'; for (const t of byF(f).slice().sort((a, b) => order[a.difficulty] - order[b.difficulty])) g += '\n### ' + t.name + ' (' + t.difficulty + ')\n- Objective: make the "' + t.name + '" test flip to done on /tests.\n- Hint 1: ' + t.hints[0] + '\n- Hint 2: ' + t.hints[1] + '\n- Hint 3: ' + t.hints[2] + '\n'; }
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'), g);
  let fx = '# HexaSmartHome (LAB 102) — Fix & Retest Guide\n\nFor every scored test: the secure implementation and a regression check. After fixing, re-run the exploit — it must fail — then re-run the normal flow — it must still work.\n';
  for (const f of FEATURES) { fx += '\n## ' + f + '\n'; for (const t of byF(f)) fx += '\n### ' + t.report.title + ' (' + t.report.severity + ')\n- Fix: ' + t.report.remediation + '\n- Retest: repeat the original exploit steps from the Practice Guide; the test condition must no longer occur, and legitimate use of the feature must still succeed.\n'; }
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'), fx);
  console.log('docs generated for ' + totalTests + ' tests');
}
if (process.argv.includes('--gen-docs')) { genDocs(); process.exit(0); }

server.listen(PORT, '127.0.0.1', () => console.log(LAB_NAME + ' LAB ' + LAB_NUMBER + ' listening on http://127.0.0.1:' + PORT));
