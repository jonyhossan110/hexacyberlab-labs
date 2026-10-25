'use strict';
/*
 * HexaIoT — LAB 101 (Category 11: Specialized & Advanced Business Systems)
 * A deliberately vulnerable IoT device management platform for hands-on
 * web security practice. LOCAL USE ONLY. Zero-dependency Node.js.
 * All device behaviour is simulated in-app; no real network/device calls.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB_NUMBER = 101;
const LAB_NAME = 'HexaIoT';
const PREV_LAB = 100;
const PORT = 3110;
const HOST = '127.0.0.1';
const DIR = __dirname;
const STATE_FILE = path.join(DIR, 'progress.json');
const LOGO_FILE = path.join(DIR, 'logo.png');

/* ---- key material: stored ONLY as base64-of-reversed shards, scattered ---- */

const _cA = ['TC1YSA==', 'LTIwMQ==', 'RE83UQ==', 'MzI4MQ=='];
function _unshard(parts) {
  return parts.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}

/* ------------------------------- lab state ------------------------------- */
function freshState() {
  return {
    unlocked: false, testerName: '', tests: {}, attempts: {},
    completedAt: null, keyRevealed: false,
    detect: { enum: [], brute: {} }
  };
}
let state = freshState();
try {
  if (fs.existsSync(STATE_FILE)) {
    const loaded = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    state = Object.assign(freshState(), loaded);
    state.detect = Object.assign({ enum: [], brute: {} }, loaded.detect || {});
  }
} catch (e) { state = freshState(); }
function save() { try { fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2)); } catch (e) {} }

/* ------------------------------ seed data -------------------------------- */
const users = [
  { id: 1, name: 'Ada Admin',   email: 'admin@hexaiot.local', password: 'admin123', role: 'admin', plan: 'pro',   resetToken: null },
  { id: 2, name: 'Alice Owner', email: 'alice@test.local',    password: 'alice123', role: 'owner', plan: 'pro',   resetToken: null },
  { id: 3, name: 'Bob Owner',   email: 'bob@test.local',      password: 'bob123',   role: 'owner', plan: 'free',  resetToken: null },
  { id: 4, name: 'Carol Viewer',email: 'carol@test.local',    password: 'carol123', role: 'viewer', plan: 'free', resetToken: null }
];
let nextUserId = 5;
const devices = [
  { id: 1, name: 'Living Room Thermostat', serial: 'IOT-TH-1001',  type: 'thermostat', ownerId: 2, groupId: 1, firmware: '1.4.2',      listed: true,  location: 'Living Room' },
  { id: 2, name: 'Front Door Camera',      serial: 'IOT-CAM-1002', type: 'camera',     ownerId: 2, groupId: 1, firmware: '1.5.0',      listed: true,  location: 'Front Door' },
  { id: 3, name: 'Warehouse Temp Sensor',  serial: 'IOT-TS-2001',  type: 'sensor',     ownerId: 3, groupId: 2, firmware: '1.4.2',      listed: true,  location: 'Warehouse A' },
  { id: 4, name: 'Delivery Drone Dock',    serial: 'IOT-DR-2002',  type: 'dock',       ownerId: 3, groupId: 2, firmware: '1.5.0',      listed: true,  location: 'Warehouse Roof' },
  { id: 5, name: 'HQ HVAC Controller',     serial: 'IOT-HV-3001',  type: 'hvac',       ownerId: 1, groupId: 3, firmware: '1.5.0',      listed: true,  location: 'HQ Plant Room' },
  { id: 6, name: 'Prototype Sensor X1',    serial: 'IOT-PROTO-001',type: 'prototype',  ownerId: 1, groupId: 3, firmware: '2.0.0-beta', listed: false, location: 'Lab Bench' }
];
let nextDeviceId = 7;
const telemetry = {
  1: [ { ts: '2026-10-23 08:00', metric: 'temperature', value: '21.8' }, { ts: '2026-10-23 09:00', metric: 'humidity', value: '44' } ],
  2: [ { ts: '2026-10-23 08:05', metric: 'motion', value: 'none' } ],
  3: [ { ts: '2026-10-23 08:10', metric: 'temperature', value: '31.4' }, { ts: '2026-10-23 09:10', metric: 'temperature', value: '32.1' } ],
  4: [ { ts: '2026-10-23 08:15', metric: 'battery', value: '87' } ],
  5: [ { ts: '2026-10-23 08:20', metric: 'airflow', value: 'normal' } ],
  6: [ { ts: '2026-10-23 08:25', metric: 'debug', value: 'internal-only readings' } ]
};
const commands = [
  { id: 1, deviceId: 3, command: 'reboot', by: 3, status: 'done' },
  { id: 2, deviceId: 1, command: 'set-temp 22', by: 2, status: 'done' }
];
let nextCommandId = 3;
const firmwares = [
  { id: 1, version: '1.4.2', channel: 'stable', listed: true,  notes: 'Current stable release for sensors and thermostats.' },
  { id: 2, version: '1.5.0', channel: 'stable', listed: true,  notes: 'Stable release adding camera and HVAC support.' },
  { id: 3, version: '2.0.0-beta', channel: 'beta', listed: false, notes: 'INTERNAL ONLY: pre-release build with the debug console enabled. Do not distribute outside the lab team.' }
];
const groups = [
  { id: 1, name: 'Alice Smart Home', ownerId: 2, isPrivate: false, members: [2] },
  { id: 2, name: 'Bob Warehouse',    ownerId: 3, isPrivate: true,  members: [3] },
  { id: 3, name: 'HQ Building Ops',  ownerId: 1, isPrivate: true,  members: [1] }
];
const alerts = [
  { id: 1, deviceId: 3, ownerId: 3, message: 'Temperature above threshold in Warehouse A (32.1 C)', acked: false },
  { id: 2, deviceId: 1, ownerId: 2, message: 'Thermostat offline for 10 minutes', acked: false },
  { id: 3, deviceId: 5, ownerId: 1, message: 'HVAC filter replacement due', acked: false }
];
let nextAlertId = 4;
const sessions = new Map(); // sid -> userId

/* --------------------- tiny string-built SQL evaluator -------------------- */
/* The app "builds SQL with string concatenation" (the flaw). This evaluator
 * parses the resulting WHERE clause so injection behaves like a real DB. */
function tokenizeSql(s) {
  const toks = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ' || c === '\t' || c === '\n') { i++; continue; }
    if (c === '-' && s[i + 1] === '-') break; // -- comment truncates
    if (c === "'") {
      let j = i + 1, out = '';
      while (j < s.length && s[j] !== "'") { out += s[j]; j++; }
      toks.push({ t: 'str', v: out }); i = j + 1; continue;
    }
    if (/[0-9]/.test(c)) { let j = i, num = ''; while (j < s.length && /[0-9.]/.test(s[j])) { num += s[j]; j++; } toks.push({ t: 'num', v: parseFloat(num) }); i = j; continue; }
    if (/[A-Za-z_]/.test(c)) { let j = i, w = ''; while (j < s.length && /[A-Za-z0-9_.]/.test(s[j])) { w += s[j]; j++; } toks.push({ t: 'word', v: w }); i = j; continue; }
    if (c === '=' ) { toks.push({ t: 'op', v: '=' }); i++; continue; }
    if (c === '!' && s[i + 1] === '=') { toks.push({ t: 'op', v: '!=' }); i += 2; continue; }
    if (c === '(' || c === ')') { toks.push({ t: c, v: c }); i++; continue; }
    i++; // skip anything else
  }
  return toks;
}
function likeToRegex(p) {
  return new RegExp('^' + String(p).split('').map(ch => ch === '%' ? '.*' : ch === '_' ? '.' : ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('') + '$', 'i');
}
function evalWhere(row, where) {
  const toks = tokenizeSql(where); let pos = 0;
  function operand() {
    const tk = toks[pos++];
    if (!tk) return '';
    if (tk.t === 'str' || tk.t === 'num') return tk.v;
    if (tk.t === 'word') { const v = row[tk.v]; return v === undefined ? '' : v; }
    return '';
  }
  function comparison() {
    if (toks[pos] && toks[pos].t === '(') { pos++; const v = parseOr(); if (toks[pos] && toks[pos].t === ')') pos++; return v; }
    const a = operand();
    const tk = toks[pos];
    if (tk && tk.t === 'op') { pos++; const b = operand(); return tk.v === '=' ? String(a) === String(b) : String(a) !== String(b); }
    if (tk && tk.t === 'word' && /^like$/i.test(tk.v)) { pos++; const b = operand(); return likeToRegex(b).test(String(a)); }
    return !!a;
  }
  function parseAnd() { let v = comparison(); while (toks[pos] && toks[pos].t === 'word' && /^and$/i.test(toks[pos].v)) { pos++; const r = comparison(); v = v && r; } return v; }
  function parseOr() { let v = parseAnd(); while (toks[pos] && toks[pos].t === 'word' && /^or$/i.test(toks[pos].v)) { pos++; const r = parseAnd(); v = v || r; } return v; }
  try { return parseOr(); } catch (e) { return false; }
}
const INJ_RE = /('|")\s*(or|and)\s|--|'\s*or\s*'|"\s*or\s*"/i;
const XSS_RE = /<script|onerror\s*=|onload\s*=|<svg|<img[^>]*onerror|<iframe|<body[^>]*onload/i;

/* ------------------------------ TESTS registry ---------------------------- */
const F = {
  AUTH: 'Login & Authentication', REG: 'Registration & Profile', DEV: 'Devices & Search',
  TEL: 'Telemetry', CMD: 'Remote Commands', FW: 'Firmware & Updates',
  GRP: 'Groups & Sharing', ALT: 'Alerts', ADM: 'Admin & Platform'
};
const TESTS = [
  { id: 'auth-sqli', feature: F.AUTH, name: 'SQL Injection Login Bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    where: 'POST /login', how: "Log in with an email like ' OR '1'='1' -- so the string-built query matches the first user (the admin) without knowing any password.",
    hints: ['The login form builds its database query by gluing your input straight into the query string.', "Try a classic tautology in the email field and comment out the rest of the query.", "Email: ' OR '1'='1' -- with any password lands you in as the first user in the table."],
    lesson: 'String-built queries turn user input into query logic; one quote character is all it takes to rewrite who the database thinks you are.',
    impact: 'On a real client platform, this is a full account takeover of the first account in the table — usually the administrator — with no password at all.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements for all database access and never concatenate user input into SQL.' } },
  { id: 'auth-brute', feature: F.AUTH, name: 'Brute Force — No Rate Limit or Lockout', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    where: 'POST /login', how: 'Submit 10+ wrong passwords for one account (e.g. bob@test.local) and notice nothing slows down, locks, or challenges you.',
    hints: ['Pick one real account and keep guessing wrong passwords.', 'Count the failures — does anything change after 5? After 10?', 'Ten failed logins for the same account are all processed normally: there is no throttle, lockout, or CAPTCHA.'],
    lesson: 'Authentication endpoints without throttling let attackers guess passwords at machine speed; the missing control is the vulnerability.',
    impact: 'Attackers can grind through password lists against any account on a client platform until one works — credential stuffing included.',
    report: { title: 'Login Endpoint Has No Brute-Force Protection', severity: 'High', remediation: 'Add per-account and per-IP rate limiting, progressive delays and lockout/alerting after repeated failures.' } },
  { id: 'auth-enum', feature: F.AUTH, name: 'User Enumeration via Different Error Messages', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    where: 'POST /login and POST /forgot', how: 'Compare the response for an email that exists with one that does not, on both the login and forgot-password forms. Probe at least 5 different emails.',
    hints: ['Try logging in with a made-up email, then with a real one and a wrong password. Read the messages carefully.', 'The forgot-password form leaks the same information in a different way.', 'Existing accounts get "Incorrect password" / a reset is generated; unknown emails get "No account found" — probe 5 distinct emails to map valid users.'],
    lesson: 'Different error text for "no such user" vs "wrong password" hands attackers a free list of valid accounts to target.',
    impact: 'Attackers first enumerate which staff/customer emails are valid on a client platform, then focus phishing and password attacks only on real accounts.',
    report: { title: 'Username Enumeration via Authentication Error Messages', severity: 'Medium', remediation: 'Return one generic "invalid credentials" message for all login and password-reset failures.' } },
  { id: 'auth-default', feature: F.AUTH, name: 'Published Demo / Default Admin Credentials', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    where: 'POST /login', how: 'The login page itself prints a working demo admin email and password. Use them.',
    hints: ['Read the whole login page — including the helpful note at the bottom.', 'Demo credentials are published right on the page.', 'Sign in as admin@hexaiot.local with the password printed on the login page.'],
    lesson: 'Default and demo credentials left active in production are the oldest free pass into a system — especially when printed on the login page.',
    impact: 'Anyone on the internet can become administrator of a client platform using credentials the platform itself advertises.',
    report: { title: 'Default/Demo Administrator Credentials Active and Published', severity: 'Critical', remediation: 'Remove demo accounts from production, force unique strong passwords, and never print credentials on the login page.' } },
  { id: 'auth-reset', feature: F.AUTH, name: 'Predictable Password-Reset Token', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    where: 'POST /reset', how: 'Reset tokens follow a formula from the user id (IOT<id>-<id*149+37>). Compute the token for another user (e.g. id 3) and reset their password without ever requesting a reset email.',
    hints: ['Request a reset for your own account and study the token format you receive.', 'The token is derived from something public and sequential: the user id.', 'Token = IOT<id>-<id*149+37>. For Bob (id 3) that is IOT3-484 — post it to /reset with a new password and log in as him.'],
    lesson: 'Reset tokens must be unguessable random secrets; anything derived from a public identifier is an open door to every account.',
    impact: 'An attacker who can guess sequential user ids can reset the password of any account on a client platform, including admins.',
    report: { title: 'Password Reset Tokens Are Predictable', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (at least 128 bits), store them hashed, and expire them quickly.' } },
  { id: 'auth-cookie', feature: F.AUTH, name: 'Admin Access via Role Cookie Tampering', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'GET /admin', how: 'The admin console trusts a client-set cookie (hx_role) instead of the server-side session. Log in as a normal owner, set your hx_role cookie to admin, and open /admin.',
    hints: ['After logging in, inspect the cookies the app sets. One of them describes your role — and it lives on YOUR side.', 'The server reads your role from that cookie when you visit the admin console.', 'Set hx_role=admin in your browser (or with curl) while logged in as Alice and request /admin.'],
    lesson: 'Authorization data must live server-side. Anything the client can edit — cookies included — will be edited.',
    impact: 'Any registered user of a client platform can promote themselves to administrator by changing one cookie value.',
    report: { title: 'Authorization Role Taken from a Client-Controlled Cookie', severity: 'High', remediation: 'Derive roles from the server-side session record on every request; never trust client-supplied role values.' } },
  { id: 'reg-weakpw', feature: F.REG, name: 'Weak Password Policy — 1-Character Passwords Accepted', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    where: 'POST /register', how: 'Register a new account with a password of a single character. It is accepted.',
    hints: ['Try registering with shorter and shorter passwords.', 'There is no minimum length check at all.', 'A one-character password (like "x") creates a working account.'],
    lesson: 'Password policy is a security control: without a minimum length, users will choose passwords that fall to the first guess.',
    impact: 'Client platform accounts protected by one-character passwords are effectively public.',
    report: { title: 'No Minimum Password Strength on Registration', severity: 'Medium', remediation: 'Enforce a minimum password length (12+ recommended) and screen against known-breached passwords.' } },
  { id: 'reg-massassign', feature: F.REG, name: 'Mass Assignment — Role and Plan Set at Registration', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /register', how: 'The registration handler binds every submitted field to the new account. Add role=admin (and plan=enterprise) to the registration POST and your new account is an admin.',
    hints: ['The visible form only asks for name, email and password — but the server may accept more fields.', 'What fields does a user record have? role, plan… Try submitting them too.', 'POST /register with role=admin in the body: the new account is created as an administrator.'],
    lesson: 'Binding request bodies directly to data models lets attackers set fields the UI never offered — roles, balances, plans.',
    impact: 'Self-service admin creation on a client platform: the attacker skips every approval process the business relies on.',
    report: { title: 'Mass Assignment Allows Privilege Escalation at Registration', severity: 'High', remediation: 'Whitelist the exact fields each endpoint may set; assign roles and plans server-side only.' } },
  { id: 'reg-storedxss', feature: F.REG, name: 'Stored XSS in Display Name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    where: 'POST /register or POST /profile, rendered on /team', how: 'Set your display name to an HTML/JS payload such as <script>alert(1)</script>. It is stored and rendered unescaped on the member directory.',
    hints: ['Display names are shown on the /team directory page. What happens if a name contains HTML?', 'The name is stored exactly as typed and printed without escaping.', 'Register or rename yourself to <script>alert(1)</script> and open /team.'],
    lesson: 'Stored XSS turns a profile field into code that runs in every visitor\u2019s browser — including admins.',
    impact: 'An attacker can hijack sessions and actions of anyone who views the directory on a client platform, including staff.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Contextually escape all user-supplied output and validate/sanitise display names on input.' } },
  { id: 'reg-csrf', feature: F.REG, name: 'CSRF on Profile Update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /profile', how: 'The profile update accepts state-changing POSTs with no anti-CSRF token. Submit the form without the app\u2019s own hx_origin marker (e.g. a raw curl POST with only your session cookie) and the change is applied.',
    hints: ['State-changing forms need a token a foreign site cannot know. Does this one check anything?', 'The app sets an hx_origin cookie for its own pages — but the profile endpoint never verifies it.', 'POST /profile with your session cookie but WITHOUT the hx_origin cookie: the name change still goes through.'],
    lesson: 'Cookies are sent automatically by the browser, so any state-changing endpoint without a CSRF token can be driven by a malicious page.',
    impact: 'A client\u2019s users can be silently renamed (and worse, on other endpoints) just by visiting an attacker\u2019s page while logged in.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require a per-session anti-CSRF token on all state-changing requests and verify Origin/Referer as defence in depth.' } },
  { id: 'dev-search-sqli', feature: F.DEV, name: 'SQL Injection in Device Search Dumps Hidden Devices', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    where: 'GET /devices?q=', how: "The device search builds its filter as a string too. Search with ' OR '1'='1' -- to make the filter match every row — including the unlisted prototype device that normal search hides.",
    hints: ['Normal search only shows listed devices. The prototype is hidden — unless the filter itself can be changed.', 'The search term is glued into a LIKE filter. A quote character breaks out of it, and -- comments out the rest.', "Search for ' OR '1'='1' -- and the full device registry — prototype included — comes back."],
    lesson: 'Every string-built query is an injection point, not just login forms; search is often the easiest one to reach.',
    impact: 'Attackers can dump a client\u2019s entire device registry — including unreleased prototypes and internal hardware — through the public search box.',
    report: { title: 'SQL Injection in Device Search Exposes Unlisted Devices', severity: 'High', remediation: 'Parameterise search queries and enforce the listed/visibility filter server-side, not inside the user-controlled query.' } },
  { id: 'dev-reflected-xss', feature: F.DEV, name: 'Reflected XSS in Device Search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    where: 'GET /devices?q=', how: 'The search term is reflected into the results heading without escaping. Search for <script>alert(1)</script> and it executes.',
    hints: ['The results page prints "Results for: <your term>" — exactly as typed.', 'Try putting HTML in the search box instead of a device name.', 'Search for <script>alert(1)</script> and the payload is reflected raw into the page.'],
    lesson: 'Reflected input must be escaped on output; a search box that echoes your words can echo your code.',
    impact: 'Attackers craft links that run script in a victim\u2019s browser on the client\u2019s own trusted domain — ideal for phishing and session theft.',
    report: { title: 'Reflected Cross-Site Scripting in Device Search', severity: 'Medium', remediation: 'Escape all reflected values in HTML output and deploy a restrictive Content-Security-Policy.' } },
  { id: 'dev-idor', feature: F.DEV, name: 'Device Detail IDOR — Any Device Viewable by ID', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'GET /devices/<id>', how: 'Device pages check only that you are logged in, not that you own the device. Open another owner\u2019s device (e.g. Bob\u2019s device 3 while logged in as Alice).',
    hints: ['Device URLs end in a simple sequential number.', 'Log in as one owner and change the number to a device that is not yours.', 'GET /devices/3 as Alice shows Bob\u2019s warehouse sensor in full.'],
    lesson: 'Authentication is not authorization: every object access must check that the object belongs to the caller.',
    impact: 'Competitors or attackers can inventory a client\u2019s customers\u2019 devices, locations and configurations one ID at a time.',
    report: { title: 'Insecure Direct Object Reference on Device Detail Pages', severity: 'High', remediation: 'Verify object ownership (or a sharing grant) on every device request before returning data.' } }
];
TESTS.push(
  { id: 'tel-idor', feature: F.TEL, name: 'Telemetry Read IDOR — Another Owner\u2019s Sensor Data', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'GET /devices/<id>/telemetry', how: 'Telemetry pages repeat the device IDOR: open the telemetry of a device you do not own (e.g. device 3 as Alice) and read its sensor history.',
    hints: ['Telemetry lives under the device URL — the same sequential ID.', 'Ownership is not checked on the telemetry view either.', 'GET /devices/3/telemetry as Alice returns Bob\u2019s warehouse readings.'],
    lesson: 'Access control must be applied per resource, including sub-resources like telemetry, logs and exports.',
    impact: 'Sensor histories reveal when premises are occupied, cold-chain failures, and other operational secrets of a client\u2019s customers.',
    report: { title: 'Insecure Direct Object Reference on Device Telemetry', severity: 'High', remediation: 'Enforce ownership checks on telemetry endpoints exactly as on the parent device.' } },
  { id: 'tel-spoof', feature: F.TEL, name: 'Telemetry Spoofing — Write Readings to Another Owner\u2019s Device', owasp: 'A08:2021 Software & Data Integrity Failures', difficulty: 'Intermediate',
    where: 'POST /devices/<id>/telemetry', how: 'The telemetry ingest accepts readings from any logged-in user for any device. Post a fake reading to Bob\u2019s sensor (device 3) as Alice and it appears in his history.',
    hints: ['If you can read another device\u2019s telemetry, can you also write to it?', 'The ingest form posts metric and value with no ownership check.', 'POST /devices/3/telemetry as Alice with a made-up temperature — it is stored as if the device sent it.'],
    lesson: 'Data ingestion endpoints must authenticate the device and authorize the writer; otherwise the data itself becomes untrustworthy.',
    impact: 'Forged sensor readings can hide a real cold-chain break, trigger false alarms, or falsify compliance records on a client platform.',
    report: { title: 'Telemetry Ingest Allows Spoofed Readings for Arbitrary Devices', severity: 'High', remediation: 'Require per-device credentials for telemetry ingest and verify the caller owns/controls the target device.' } },
  { id: 'cmd-idor', feature: F.CMD, name: 'Send Remote Commands to Another Owner\u2019s Device', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /devices/<id>/command', how: 'The command endpoint never checks ownership. As Alice, send a command (e.g. reboot or unlock) to Bob\u2019s device 3 — it is queued for execution.',
    hints: ['Commands are the most dangerous feature here. Who is allowed to send them?', 'The form on a device page posts a command — try it on a device that is not yours (reach it via the IDOR first).', 'POST /devices/3/command as Alice: the command is accepted and queued against Bob\u2019s device.'],
    lesson: 'Actuation endpoints (anything that makes a physical device DO something) need the strictest authorization checks in the system.',
    impact: 'On a real IoT platform this means unlocking strangers\u2019 doors, rebooting cameras during a break-in, or stopping industrial equipment.',
    report: { title: 'Missing Authorization on Remote Device Command Endpoint', severity: 'Critical', remediation: 'Verify device ownership server-side before accepting any command, and log all command activity per device.' } },
  { id: 'cmdlog-idor', feature: F.CMD, name: 'Command History IDOR', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'GET /devices/<id>/commands', how: 'The command history of any device is readable by any logged-in user. Open the command log of a device you do not own.',
    hints: ['Every device has a command history page under its URL.', 'It is protected the same way as the rest of the device pages — which is to say, not at all.', 'GET /devices/3/commands as Alice lists every command sent to Bob\u2019s sensor.'],
    lesson: 'Audit logs are sensitive data: they reveal behaviour patterns and must follow the same access rules as the resource itself.',
    impact: 'Attackers learn when devices are controlled and by whom — perfect reconnaissance for timing a physical attack on a client\u2019s customers.',
    report: { title: 'Insecure Direct Object Reference on Device Command History', severity: 'Medium', remediation: 'Apply ownership checks to command-history endpoints.' } },
  { id: 'fw-tamper', feature: F.FW, name: 'Client-Supplied Firmware Version Trusted', owasp: 'A08:2021 Software & Data Integrity Failures', difficulty: 'Intermediate',
    where: 'POST /devices/<id>/update', how: 'The device update form lets the client post a firmware version directly, and the server stores whatever it receives. Update your own device with firmware=9.9.9-custom.',
    hints: ['Firmware should only ever come from the update channel — but the edit form has a firmware field.', 'The server never checks the posted version against the released firmware list.', 'POST /devices/<your id>/update with firmware=9.9.9-custom and the device now "runs" a version that does not exist.'],
    lesson: 'Servers must never trust client-supplied state for security-relevant fields like firmware versions; integrity decisions belong server-side.',
    impact: 'Attackers can make vulnerable devices appear patched (or roll devices back to known-bad firmware) in a client\u2019s fleet records.',
    report: { title: 'Firmware Version Settable by Client Input', severity: 'Medium', remediation: 'Accept firmware changes only from the signed OTA update flow; ignore firmware fields in general update forms.' } },
  { id: 'fw-beta', feature: F.FW, name: 'Unreleased Beta Firmware Disclosure by Direct ID', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'GET /firmware/<id>', how: 'The firmware list hides the unlisted beta build, but its detail page is served to any logged-in user who guesses the ID. Open /firmware/3.',
    hints: ['The firmware index only shows stable releases. Are there more records behind it?', 'Firmware detail pages use sequential IDs too.', 'GET /firmware/3 shows the internal beta build notes — including that its debug console is enabled.'],
    lesson: 'Hiding a record from a list is not access control; direct-object access must be authorized too.',
    impact: 'Pre-release firmware notes leak attack surface (debug consoles, known issues) for a client\u2019s unreleased products.',
    report: { title: 'Unlisted Firmware Records Accessible by Direct ID', severity: 'Medium', remediation: 'Restrict unreleased firmware records to internal roles and check visibility on the detail endpoint.' } },
  { id: 'grp-private', feature: F.GRP, name: 'Private Group Device List Visible to Non-Members', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'GET /groups/<id>', how: 'Private group pages render their full device list to any logged-in user. Open Bob\u2019s private warehouse group (id 2) as Alice.',
    hints: ['Groups marked private should be members-only. The group page does not check.', 'Group URLs are sequential. Try the private ones.', 'GET /groups/2 as Alice lists every device in Bob\u2019s private group.'],
    lesson: '"Private" must be enforced on the server for every read, not just shown as a label in the UI.',
    impact: 'A client\u2019s customers\u2019 site layouts — every camera and sensor at a warehouse — are exposed to any registered user.',
    report: { title: 'Private Group Contents Exposed to Non-Members', severity: 'High', remediation: 'Check group membership before rendering private group pages and device lists.' } },
  { id: 'grp-share', feature: F.GRP, name: 'Predictable Group Share Token', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    where: 'GET /groups/join?token=', how: 'Group invite links use the token share-<groupId>. Guess the token for a private group (share-3) and open the join link — you are added as a member.',
    hints: ['Invite links carry a token. Look at the format of a legitimate one on a group you own.', 'The token is built from something sequential and public.', 'Token = share-<groupId>: /groups/join?token=share-3 joins you to the private HQ group.'],
    lesson: 'Share/invite tokens are credentials; they must be long, random, and revocable — never derived from the object id.',
    impact: 'Anyone can join any "private" group on a client platform by counting up, gaining member-level access to devices and discussions.',
    report: { title: 'Group Invitation Tokens Are Predictable', severity: 'High', remediation: 'Generate invite tokens with a CSPRNG, store them hashed, and support expiry and revocation.' } },
  { id: 'alert-idor', feature: F.ALT, name: 'Alert Detail IDOR', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'GET /alerts/<id>', how: 'Alert pages are served by ID with no ownership check. Open alert 1 (Bob\u2019s warehouse alert) as Alice.',
    hints: ['Alerts have their own sequential URLs.', 'An alert reveals which device fired, where, and why — to anyone who asks.', 'GET /alerts/1 as Alice shows Bob\u2019s warehouse temperature alert.'],
    lesson: 'Notifications and alerts are per-user data and need the same ownership enforcement as the underlying objects.',
    impact: 'Attackers monitoring a client\u2019s customers\u2019 alerts learn exactly when a site is in trouble — or empty.',
    report: { title: 'Insecure Direct Object Reference on Alert Details', severity: 'Medium', remediation: 'Check alert ownership before returning alert details.' } },
  { id: 'alert-ack', feature: F.ALT, name: 'Acknowledge Another Owner\u2019s Alert', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'POST /alerts/<id>/ack', how: 'The acknowledge action also skips the ownership check. As Alice, acknowledge Bob\u2019s alert 1 — it is marked handled and disappears from his queue.',
    hints: ['Reading an alert is bad; clearing it is worse. The ack button posts to /alerts/<id>/ack.', 'No ownership check stands between you and the button.', 'POST /alerts/1/ack as Alice marks Bob\u2019s warehouse alert as acknowledged.'],
    lesson: 'State-changing actions need authorization even more than reads — an acked alert is an incident nobody will ever see.',
    impact: 'An attacker (or a negligent insider) can silence safety alerts on a client platform, hiding real incidents from their owners.',
    report: { title: 'Missing Authorization on Alert Acknowledge Action', severity: 'High', remediation: 'Verify the caller owns the alert before allowing acknowledge/dismiss actions, and audit all such actions.' } },
  { id: 'admin-bac', feature: F.ADM, name: 'Admin User Dump Served to Any Logged-In User', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'GET /admin/users.json', how: 'A JSON endpoint under /admin returns every user — passwords included — to anyone with a session, no admin role needed. Fetch it as Alice.',
    hints: ['Admin areas often have machine-readable side doors. This one ends in .json.', 'It checks that you are logged in. It does not check that you are an admin.', 'GET /admin/users.json as Alice returns all accounts with their passwords.'],
    lesson: 'Every route, including JSON helpers, needs the same authorization as the UI it supports; forgotten endpoints are the classic breach path.',
    impact: 'Full credential dump of every account on a client platform — customers and staff — from one forgotten endpoint.',
    report: { title: 'Broken Access Control on Admin User Export (Passwords Exposed)', severity: 'Critical', remediation: 'Require the admin role on all /admin routes and never return password values in any response.' } },
  { id: 'api-debug', feature: F.ADM, name: 'Unauthenticated Debug Endpoint Dumps the Database', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    where: 'GET /api/debug', how: 'A leftover debug endpoint returns users (with passwords) and devices with no authentication at all. Open it in a fresh browser with no session.',
    hints: ['Developers leave diagnostic endpoints behind. This app has one under /api.', 'No login needed. That is the point.', 'GET /api/debug with no cookies returns the full user and device tables.'],
    lesson: 'Debug and diagnostic endpoints must never ship to production; if they must exist, they need authentication and role checks.',
    impact: 'The entire account database of a client platform is one unauthenticated URL away from the internet.',
    report: { title: 'Unauthenticated Debug Endpoint Exposes All User Data', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; gate any diagnostics behind admin authentication.' } },
  { id: 'api-token', feature: F.ADM, name: 'Weak Device API Token — Base64 of the Account Email', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    where: 'GET /api/devices with header x-api-token', how: 'The device API accepts a token that is just "iot_" + base64(email). Build one for any user and read the whole device registry with no session at all.',
    hints: ['API tokens should be random secrets. This one is an encoding, not a secret.', 'Emails are public. What simple transform of an email might the API accept?', 'Token = iot_ + base64("alice@test.local"). Send it as x-api-token to /api/devices — no cookies needed.'],
    lesson: 'An API token derived from public data is not a credential; tokens must be random, per-client secrets.',
    impact: 'Anyone who knows a customer\u2019s email address — public information — gets full API access to a client\u2019s device fleet.',
    report: { title: 'Device API Token Is a Predictable Encoding of the User Email', severity: 'High', remediation: 'Issue random per-device API keys, store them hashed, and support rotation and revocation.' } }
);

/* --------------------------- progress engine ------------------------------ */
const FEATURES = [...new Set(TESTS.map(t => t.feature))];
function pass(id) {
  if (!TESTS.find(t => t.id === id)) return;
  if (!state.tests[id]) {
    state.tests[id] = true;
    if (TESTS.every(t => state.tests[t.id])) {
      if (!state.completedAt) state.completedAt = new Date().toISOString();
      state.keyRevealed = true;
    }
    save();
  }
}
function attempt(feature) {
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  save();
}
function doneCount() { return TESTS.filter(t => state.tests[t.id]).length; }
function progressObj() {
  const total = TESTS.length, done = doneCount();
  const features = {};
  for (const f of FEATURES) {
    const ft = TESTS.filter(t => t.feature === f);
    features[f] = { total: ft.length, done: ft.filter(t => state.tests[t.id]).length, attempts: state.attempts[f] || 0 };
  }
  return { lab: LAB_NAME, number: LAB_NUMBER, total, done, pct: total ? Math.floor(done * 100 / total) : 0, features, complete: done === total };
}
function recordEnum(email) {
  const e = String(email || '').toLowerCase();
  if (e && !state.detect.enum.includes(e)) { state.detect.enum.push(e); save(); }
  if (state.detect.enum.length >= 5) pass('auth-enum');
}
function resetTokenFor(u) { return 'IOT' + u.id + '-' + (u.id * 149 + 37); }

/* --------- more key material (second region, far from the first) --------- */

const _cB = ['NlA1LQ==', 'VERUTQ==', 'Tw=='];
const ENTRY_KEY_SHA256 = 'a99498e42e79cdf90224824ffed97b793d79e830628c8ee01ef8d7e8333e1c3d';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */
function completionKey() { return _unshard(_cA.concat(_cB)); }

/* ------------------------------ http helpers ------------------------------ */
function parseCookies(req) {
  const out = {}; const h = req.headers.cookie || '';
  for (const part of h.split(';')) { const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); }
  return out;
}
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) { try { return resolve(JSON.parse(data || '{}')); } catch (e) { return resolve({}); } }
      const out = {};
      for (const pair of data.split('&')) { if (!pair) continue; const i = pair.indexOf('='); const k = decodeURIComponent(pair.slice(0, i).replace(/\+/g, ' ')); const v = decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' ')); out[k] = v; }
      resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function redirect(res, to, extra) {
  const headers = Object.assign({ Location: to }, extra || {});
  res.writeHead(302, headers); res.end();
}
function sessionUser(req) {
  const c = parseCookies(req);
  if (!c.hx_session) return null;
  const uid = sessions.get(c.hx_session);
  return users.find(u => u.id === uid) || null;
}
function startSession(res, user) {
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, user.id);
  return [
    'hx_session=' + sid + '; Path=/; HttpOnly',
    'hx_role=' + user.role + '; Path=/',
    'hx_origin=same; Path=/'
  ];
}

/* --------------------------------- layout --------------------------------- */
function chatWidget() {
  return `<div id="hxchat" style="position:fixed;right:16px;bottom:16px;width:320px;max-width:92vw;background:#101418;border:1px solid #2b3542;border-radius:10px;color:#e8eef4;font-family:system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.5);z-index:99">
  <div style="padding:10px 12px;border-bottom:1px solid #2b3542;font-weight:600">🤖 Lab Coach — ${LAB_NAME}</div>
  <div id="hxlog" style="height:180px;overflow:auto;padding:10px 12px;font-size:13px;line-height:1.45"></div>
  <form id="hxform" style="display:flex;border-top:1px solid #2b3542">
    <input id="hxmsg" autocomplete="off" placeholder="Ask the coach…" style="flex:1;background:#0b0f13;color:#e8eef4;border:0;padding:10px 12px;font-size:13px">
    <button style="background:#2563eb;color:#fff;border:0;padding:0 14px;cursor:pointer">Send</button>
  </form></div>
<script>
(function(){
  var log=document.getElementById('hxlog'), form=document.getElementById('hxform'), msg=document.getElementById('hxmsg');
  function add(who,text){ var d=document.createElement('div'); d.style.margin='6px 0'; d.innerHTML='<b>'+who+':</b> '; d.appendChild(document.createTextNode(text)); log.appendChild(d); log.scrollTop=log.scrollHeight; }
  add('Coach','Hi! I am the ${LAB_NAME} Lab Coach. Ask me what this lab covers, how many tests a feature has, or how to approach a feature after you have tried it yourself.');
  form.addEventListener('submit',function(e){ e.preventDefault(); var m=msg.value.trim(); if(!m) return; msg.value=''; add('You',m);
    fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})}).then(function(r){return r.json();}).then(function(j){ add('Coach', j.reply || '…'); }).catch(function(){ add('Coach','The coach is unreachable right now.'); });
  });
})();
</script>`;
}
function layout(user, title, body) {
  const p = progressObj();
  const bar = `<div style="background:#101418;border-bottom:1px solid #2b3542;padding:8px 16px;color:#e8eef4;font-family:system-ui,sans-serif">
    <img src="/logo.png" alt="HexaCyberLab" style="height:26px;vertical-align:middle;margin-right:8px">
    <b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b>
    <span style="float:right">${p.done}/${p.total} tests · ${p.pct}%</span>
    <div style="background:#2b3542;height:8px;border-radius:4px;margin-top:6px"><div style="background:#22c55e;height:8px;border-radius:4px;width:${p.pct}%"></div></div></div>`;
  const nav = user ? `<div style="padding:8px 16px;background:#0b0f13;font-family:system-ui,sans-serif;font-size:14px">
    <a style="color:#7dd3fc;margin-right:12px" href="/">Dashboard</a>
    <a style="color:#7dd3fc;margin-right:12px" href="/devices">Devices</a>
    <a style="color:#7dd3fc;margin-right:12px" href="/groups">Groups</a>
    <a style="color:#7dd3fc;margin-right:12px" href="/alerts">Alerts</a>
    <a style="color:#7dd3fc;margin-right:12px" href="/firmware">Firmware</a>
    <a style="color:#7dd3fc;margin-right:12px" href="/team">Team</a>
    <a style="color:#7dd3fc;margin-right:12px" href="/profile">Profile</a>
    <a style="color:#7dd3fc;margin-right:12px" href="/tests">Mission Board</a>
    <span style="color:#94a3b8">Signed in as ${esc(user.name)} (${esc(user.role)})</span>
    <a style="color:#fca5a5;float:right" href="/logout">Logout</a></div>` : '';
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} — LAB ${LAB_NUMBER} ${LAB_NAME}</title></head>
<body style="margin:0;background:#0b0f13;color:#e8eef4;font-family:system-ui,sans-serif">${bar}${nav}
<main style="padding:20px 16px;max-width:960px;margin:0 auto">${body}</main>${chatWidget()}</body></html>`;
}
function gatePage() {
  const body = `<h1>🔒 LAB ${LAB_NUMBER} — ${LAB_NAME} is locked</h1>
  <p>This lab is locked. Paste the completion key from Lab ${PREV_LAB} to start.</p>
  <form method="post" action="/unlock">
    <input name="key" placeholder="Completion key from Lab ${PREV_LAB}" style="padding:10px;width:320px;max-width:90%;background:#101418;color:#e8eef4;border:1px solid #2b3542;border-radius:6px">
    <button style="padding:10px 16px;background:#2563eb;color:#fff;border:0;border-radius:6px;cursor:pointer">Unlock</button>
  </form>`;
  return layout(null, 'Locked', body);
}

/* -------------------------------- chatbot --------------------------------- */
const FEATURE_KEYWORDS = [
  [F.FW, ['firmware', 'ota', 'update']],
  [F.TEL, ['telemetry', 'sensor reading', 'readings', 'spoof']],
  [F.CMD, ['command', 'remote']],
  [F.GRP, ['group', 'share', 'invite']],
  [F.ALT, ['alert', 'acknowledge', 'ack']],
  [F.REG, ['register', 'registration', 'sign up', 'signup', 'profile']],
  [F.AUTH, ['login', 'log in', 'password', 'reset', 'brute', 'enumerat', 'cookie', 'auth']],
  [F.DEV, ['device', 'search']],
  [F.ADM, ['admin', 'api', 'debug', 'token', 'platform']]
];
function matchFeature(msg) {
  for (const [f, kws] of FEATURE_KEYWORDS) if (kws.some(k => msg.includes(k))) return f;
  return null;
}
function chatReply(raw) {
  const msg = String(raw || '').toLowerCase();
  const p = progressObj();
  if (/who (built|made|created)|founder|who is|your creator|built this/.test(msg)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (msg.includes('key')) {
    if (p.complete && state.keyRevealed) return 'You completed LAB ' + LAB_NUMBER + '! Your completion key is: ' + completionKey() + ' — paste it into the next lab to unlock it.';
    return 'I do not have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at ' + p.pct + '% (' + p.done + '/' + p.total + ' tests). Finish every test and I will be able to share it.';
  }
  const feat = matchFeature(msg);
  const wantsHow = /how|help|guide|solve|do i|approach|steps|hint/.test(msg);
  const wantsCount = /how many|count|list|which|what (tests|vulnerabilities|features)|vulnerabilit/.test(msg);
  if (feat && wantsHow && !wantsCount) {
    const ft = TESTS.filter(t => t.feature === feat);
    const open = ft.filter(t => !state.tests[t.id]);
    const att = state.attempts[feat] || 0;
    if (!open.length) return 'You have already completed every test in ' + feat + '. Nice work — check the Mission Board (/tests) for what remains elsewhere.';
    if (att >= 3) {
      const steps = open.map(t => '• ' + t.name + ' — Step by step: ' + t.hints[2]).join('\n');
      return 'You have tried ' + feat + ' ' + att + ' time(s), so here is step-by-step guidance for its open tests:\n' + steps;
    }
    return 'That feature is locked for help. First try the ' + feat + ' tests yourself at least 3 times — I can see you have tried ' + att + ' time(s) so far. After 3 real tries, ask me again and I will guide you step by step.';
  }
  if (feat && (wantsCount || !wantsHow)) {
    const ft = TESTS.filter(t => t.feature === feat);
    return feat + ' has ' + ft.length + ' tests: ' + ft.map(t => t.name + (state.tests[t.id] ? ' (done)' : '')).join('; ') + '. Attempts so far on this feature: ' + (state.attempts[feat] || 0) + '.';
  }
  if (/progress|status|score|percent/.test(msg)) {
    const next = TESTS.find(t => !state.tests[t.id]);
    return 'Your progress: ' + p.done + '/' + p.total + ' tests (' + p.pct + '%).' + (next ? ' Next open test: "' + next.name + '" in ' + next.feature + '.' : ' The lab is complete!');
  }
  if (/feature|cover|topics|mission|tests/.test(msg)) {
    return 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + TESTS.length + ' tests across ' + FEATURES.length + ' features: ' + FEATURES.map(f => f + ' (' + TESTS.filter(t => t.feature === f).length + ')').join(', ') + '. Open the Mission Board at /tests for hints on every test.';
  }
  if (/^(hi|hello|hey|yo)\b/.test(msg)) {
    return 'Hello! This is LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ', an IoT device management platform with ' + TESTS.length + ' security tests across ' + FEATURES.length + ' features. Your progress is ' + p.pct + '%. Ask me about a feature, or open /tests to see the Mission Board.';
  }
  return 'I can tell you how many tests each feature has and list their names freely — the map is public. Step-by-step help for a feature unlocks after you have genuinely tried that feature at least 3 times. Try asking "how many tests in Telemetry" or "how do I approach Remote Commands". You can also open /tests for graded hints.';
}

/* --------------------------------- pages ---------------------------------- */
function loginPage(err) {
  return layout(null, 'Login', `<h1>${LAB_NAME} — Sign in</h1>
  ${err ? '<p style="color:#fca5a5">' + esc(err) + '</p>' : ''}
  <form method="post" action="/login">
    <p><input name="email" type="email" placeholder="Email" required style="padding:9px;width:280px;background:#101418;color:#e8eef4;border:1px solid #2b3542;border-radius:6px"></p>
    <p><input name="password" type="password" placeholder="Password" required style="padding:9px;width:280px;background:#101418;color:#e8eef4;border:1px solid #2b3542;border-radius:6px"></p>
    <button style="padding:9px 18px;background:#2563eb;color:#fff;border:0;border-radius:6px;cursor:pointer">Sign in</button>
  </form>
  <p><a style="color:#7dd3fc" href="/forgot">Forgot your password?</a> · <a style="color:#7dd3fc" href="/register">Create an account</a></p>
  <p style="color:#94a3b8;font-size:13px">Demo admin account (for local training): admin@hexaiot.local / admin123</p>`);
}
function registerPage(err) {
  return layout(null, 'Register', `<h1>Create your ${LAB_NAME} account</h1>
  ${err ? '<p style="color:#fca5a5">' + esc(err) + '</p>' : ''}
  <form method="post" action="/register">
    <p><input name="name" placeholder="Display name" required style="padding:9px;width:280px;background:#101418;color:#e8eef4;border:1px solid #2b3542;border-radius:6px"></p>
    <p><input name="email" type="email" placeholder="Email" required style="padding:9px;width:280px;background:#101418;color:#e8eef4;border:1px solid #2b3542;border-radius:6px"></p>
    <p><input name="password" type="password" placeholder="Password" required style="padding:9px;width:280px;background:#101418;color:#e8eef4;border:1px solid #2b3542;border-radius:6px"></p>
    <button style="padding:9px 18px;background:#2563eb;color:#fff;border:0;border-radius:6px;cursor:pointer">Register</button>
  </form>`);
}
function userDevices(u) { return devices.filter(d => d.ownerId === u.id); }
function deviceRow(d) {
  const owner = users.find(x => x.id === d.ownerId);
  return `<tr><td style="padding:6px 10px"><a style="color:#7dd3fc" href="/devices/${d.id}">${esc(d.name)}</a></td><td style="padding:6px 10px">${esc(d.serial)}</td><td style="padding:6px 10px">${esc(d.type)}</td><td style="padding:6px 10px">${esc(d.firmware)}</td><td style="padding:6px 10px">${esc(owner ? owner.name : '?')}</td><td style="padding:6px 10px">${esc(d.location)}</td></tr>`;
}
function dashboardPage(u) {
  const mine = userDevices(u);
  const myAlerts = alerts.filter(a => a.ownerId === u.id && !a.acked);
  return layout(u, 'Dashboard', `<h1>Welcome, ${esc(u.name)}</h1>
  <p>Plan: <b>${esc(u.plan)}</b> · Role: <b>${esc(u.role)}</b></p>
  <h2>Your devices (${mine.length})</h2>
  <table style="border-collapse:collapse">${mine.map(deviceRow).join('') || '<tr><td>No devices yet.</td></tr>'}</table>
  <h2>Open alerts (${myAlerts.length})</h2>
  ${myAlerts.map(a => `<p>⚠️ <a style="color:#7dd3fc" href="/alerts/${a.id}">${esc(a.message)}</a></p>`).join('') || '<p>None.</p>'}
  <p style="color:#94a3b8">Training tip: the Mission Board at <a style="color:#7dd3fc" href="/tests">/tests</a> lists every security test in this lab.</p>`);
}

/* --------------------------------- router --------------------------------- */
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://' + HOST + ':' + PORT);
    const pth = url.pathname;
    const method = req.method;

    if (pth === '/logo.png') {
      try { const data = fs.readFileSync(LOGO_FILE); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(data); }
      catch (e) { return send(res, 404, 'no logo'); }
    }
    if (pth === '/api/chat' && method === 'POST') {
      const body = await readBody(req);
      return send(res, 200, JSON.stringify({ reply: chatReply(body.message) }), 'application/json');
    }
    if (pth === '/unlock' && method === 'POST') {
      const body = await readBody(req);
      const given = String(body.key || '');
      if (given && entryKeyMatches(given)) {
        state.unlocked = true; save();
        return redirect(res, '/');
      }
      return send(res, 403, layout(null, 'Locked', '<h1>🔒 Incorrect key</h1><p>That key does not unlock LAB ' + LAB_NUMBER + '. Complete Lab ' + PREV_LAB + ' to earn it.</p><p><a style="color:#7dd3fc" href="/">Back</a></p>'));
    }
    if (!state.unlocked) return send(res, 200, gatePage());
    if (pth === '/api/progress') return send(res, 200, JSON.stringify(progressObj()), 'application/json');

    const user = sessionUser(req);
    const cookies = parseCookies(req);

    /* ------------------------------ platform API ------------------------------ */
    if (pth === '/api/debug') {
      attempt(F.ADM); pass('api-debug');
      return send(res, 200, JSON.stringify({ users, devices, firmwares, groups, alerts }, null, 2), 'application/json');
    }
    if (pth === '/api/devices') {
      attempt(F.ADM);
      const tok = req.headers['x-api-token'] || url.searchParams.get('token') || '';
      const m = /^iot_(.+)$/.exec(tok);
      let ok = false;
      if (m) { try { const email = Buffer.from(m[1], 'base64').toString('utf8'); ok = users.some(u => u.email === email); } catch (e) { ok = false; } }
      if (!ok) return send(res, 401, JSON.stringify({ error: 'invalid api token' }), 'application/json');
      pass('api-token');
      return send(res, 200, JSON.stringify({ devices }, null, 2), 'application/json');
    }
    if (pth === '/admin/users.json') {
      if (!user) return redirect(res, '/login');
      attempt(F.ADM);
      if (user.role !== 'admin') pass('admin-bac');
      return send(res, 200, JSON.stringify(users, null, 2), 'application/json');
    }

    /* --------------------------------- auth --------------------------------- */
    if (pth === '/login' && method === 'GET') {
      if (user) return redirect(res, '/');
      return send(res, 200, loginPage(url.searchParams.get('e') ? 'Please sign in.' : ''));
    }
    if (pth === '/login' && method === 'POST') {
      const body = await readBody(req);
      attempt(F.AUTH);
      const email = String(body.email || ''), password = String(body.password || '');
      recordEnum(email);
      const where = "email = '" + email + "' AND password = '" + password + "'";
      const found = users.find(u => evalWhere({ email: u.email, password: u.password }, where));
      if (found) {
        const inj = INJ_RE.test(email) || INJ_RE.test(password);
        if (inj && password !== found.password) pass('auth-sqli');
        if (!inj && found.role === 'admin' && password === 'admin123') pass('auth-default');
        const ck = startSession(res, found);
        return redirect(res, '/', { 'Set-Cookie': ck });
      }
      const exists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
      if (exists) {
        const key = email.toLowerCase();
        state.detect.brute[key] = (state.detect.brute[key] || 0) + 1; save();
        if (state.detect.brute[key] >= 10) pass('auth-brute');
        return send(res, 200, loginPage('Incorrect password.'));
      }
      return send(res, 200, loginPage('No account found for that email.'));
    }
    if (pth === '/logout') {
      if (cookies.hx_session) sessions.delete(cookies.hx_session);
      return redirect(res, '/login', { 'Set-Cookie': ['hx_session=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0'] });
    }
    if (pth === '/register' && method === 'GET') return send(res, 200, registerPage(''));
    if (pth === '/register' && method === 'POST') {
      const body = await readBody(req);
      attempt(F.REG);
      const email = String(body.email || '');
      if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) return send(res, 200, registerPage('That email is already registered.'));
      const nu = {
        id: nextUserId++, name: String(body.name || 'User'), email,
        password: String(body.password || ''), role: 'owner', plan: 'free', resetToken: null
      };
      // The flaw: every submitted field is bound to the new record.
      if (body.role) nu.role = String(body.role);
      if (body.plan) nu.plan = String(body.plan);
      if (body.credits) nu.credits = String(body.credits);
      users.push(nu);
      if (nu.password.length <= 3) pass('reg-weakpw');
      if (body.role && nu.role !== 'owner') pass('reg-massassign');
      if (XSS_RE.test(nu.name)) pass('reg-storedxss');
      const ck = startSession(res, nu);
      return redirect(res, '/', { 'Set-Cookie': ck });
    }
    if (pth === '/forgot' && method === 'GET') {
      return send(res, 200, layout(null, 'Forgot password', `<h1>Forgot password</h1>
      <form method="post" action="/forgot"><p><input name="email" type="email" placeholder="Email" required style="padding:9px;width:280px;background:#101418;color:#e8eef4;border:1px solid #2b3542;border-radius:6px"></p>
      <button style="padding:9px 18px;background:#2563eb;color:#fff;border:0;border-radius:6px;cursor:pointer">Send reset link</button></form>`));
    }
    if (pth === '/forgot' && method === 'POST') {
      const body = await readBody(req);
      attempt(F.AUTH);
      const email = String(body.email || '');
      recordEnum(email);
      const u = users.find(x => x.email.toLowerCase() === email.toLowerCase());
      if (!u) return send(res, 200, layout(null, 'Forgot password', '<h1>Forgot password</h1><p style="color:#fca5a5">No account found for that email.</p>'));
      u.resetToken = resetTokenFor(u);
      return send(res, 200, layout(null, 'Forgot password', '<h1>Forgot password</h1><p>A password reset was generated for ' + esc(u.email) + '. (Training build: the reset form is at <a style="color:#7dd3fc" href="/reset">/reset</a>.)</p>'));
    }
    if (pth === '/reset' && method === 'GET') {
      return send(res, 200, layout(null, 'Reset password', `<h1>Reset password</h1>
      <form method="post" action="/reset">
      <p><input name="email" type="email" placeholder="Email" required style="padding:9px;width:280px;background:#101418;color:#e8eef4;border:1px solid #2b3542;border-radius:6px"></p>
      <p><input name="token" placeholder="Reset token" required style="padding:9px;width:280px;background:#101418;color:#e8eef4;border:1px solid #2b3542;border-radius:6px"></p>
      <p><input name="password" type="password" placeholder="New password" required style="padding:9px;width:280px;background:#101418;color:#e8eef4;border:1px solid #2b3542;border-radius:6px"></p>
      <button style="padding:9px 18px;background:#2563eb;color:#fff;border:0;border-radius:6px;cursor:pointer">Reset password</button></form>`));
    }
    if (pth === '/reset' && method === 'POST') {
      const body = await readBody(req);
      attempt(F.AUTH);
      const u = users.find(x => x.email.toLowerCase() === String(body.email || '').toLowerCase());
      if (!u) return send(res, 200, layout(null, 'Reset password', '<p style="color:#fca5a5">No account found for that email.</p>'));
      const token = String(body.token || '');
      if (token === resetTokenFor(u)) {
        if (u.resetToken !== token) pass('auth-reset'); // token was never issued: it was computed
        u.password = String(body.password || 'x'); u.resetToken = null;
        return send(res, 200, layout(null, 'Reset password', '<p>Password updated. <a style="color:#7dd3fc" href="/login">Sign in</a></p>'));
      }
      return send(res, 200, layout(null, 'Reset password', '<p style="color:#fca5a5">Invalid reset token.</p>'));
    }

    /* --------------------------- authenticated app --------------------------- */
    if (!user && pth !== '/complete' && pth !== '/complete/name' && pth !== '/certificate') return redirect(res, '/login');

    if (pth === '/' && method === 'GET') return send(res, 200, dashboardPage(user));
    if (pth === '/profile' && method === 'GET') {
      return send(res, 200, layout(user, 'Profile', `<h1>Your profile</h1>
      <p>Name: <b>${esc(user.name)}</b> · Email: ${esc(user.email)} · Role: ${esc(user.role)} · Plan: ${esc(user.plan)}</p>
      <form method="post" action="/profile">
        <p><input name="name" value="${esc(user.name)}" style="padding:9px;width:280px;background:#101418;color:#e8eef4;border:1px solid #2b3542;border-radius:6px"></p>
        <button style="padding:9px 18px;background:#2563eb;color:#fff;border:0;border-radius:6px;cursor:pointer">Update profile</button></form>`));
    }
    if (pth === '/profile' && method === 'POST') {
      const body = await readBody(req);
      attempt(F.REG);
      if (body.name) {
        if (XSS_RE.test(String(body.name))) pass('reg-storedxss');
        user.name = String(body.name);
      }
      if (!cookies.hx_origin) pass('reg-csrf'); // state change without the app's own marker
      return redirect(res, '/profile');
    }
    if (pth === '/team' && method === 'GET') {
      // Display names are rendered RAW here (the stored-XSS flaw).
      const rows = users.map(u => `<tr><td style="padding:6px 10px">${u.name}</td><td style="padding:6px 10px">${esc(u.email)}</td><td style="padding:6px 10px">${esc(u.role)}</td></tr>`).join('');
      return send(res, 200, layout(user, 'Team', `<h1>Member directory</h1><table style="border-collapse:collapse">${rows}</table>`));
    }

    /* ------------------------------- devices -------------------------------- */
    if (pth === '/devices' && method === 'GET') {
      attempt(F.DEV);
      const q = url.searchParams.get('q') || '';
      let results;
      if (!q) results = devices.filter(d => d.listed);
      else if (INJ_RE.test(q) || q.includes("'")) {
        const where = "listed = 1 AND name LIKE '%" + q + "%'";
        results = devices.filter(d => evalWhere({ listed: d.listed ? 1 : 0, name: d.name, serial: d.serial, type: d.type, location: d.location }, where));
        if (results.some(d => !d.listed)) pass('dev-search-sqli');
      } else {
        const ql = q.toLowerCase();
        results = devices.filter(d => d.listed && (d.name.toLowerCase().includes(ql) || d.serial.toLowerCase().includes(ql) || d.type.toLowerCase().includes(ql) || d.location.toLowerCase().includes(ql)));
      }
      let head = '<h1>Device registry</h1>';
      if (q) {
        head += '<p>Results for: ' + q + '</p>'; // reflected raw (the XSS flaw)
        if (XSS_RE.test(q)) pass('dev-reflected-xss');
      }
      head += `<form method="get" action="/devices"><input name="q" value="${esc(q)}" placeholder="Search devices" style="padding:9px;width:280px;background:#101418;color:#e8eef4;border:1px solid #2b3542;border-radius:6px"> <button style="padding:9px 16px;background:#2563eb;color:#fff;border:0;border-radius:6px;cursor:pointer">Search</button></form>`;
      return send(res, 200, layout(user, 'Devices', head + `<table style="border-collapse:collapse;margin-top:14px">${results.map(deviceRow).join('') || '<tr><td>No devices found.</td></tr>'}</table>`));
    }
    const devMatch = /^\/devices\/(\d+)$/.exec(pth);
    if (devMatch && method === 'GET') {
      attempt(F.DEV);
      const d = devices.find(x => x.id === Number(devMatch[1]));
      if (!d) return send(res, 404, layout(user, 'Not found', '<h1>Device not found</h1>'));
      if (d.ownerId !== user.id) pass('dev-idor');
      const owner = users.find(x => x.id === d.ownerId);
      return send(res, 200, layout(user, 'Device', `<h1>${esc(d.name)}</h1>
      <p>Serial: ${esc(d.serial)} · Type: ${esc(d.type)} · Firmware: <b>${esc(d.firmware)}</b> · Location: ${esc(d.location)} · Owner: ${esc(owner ? owner.name : '?')}</p>
      <p><a style="color:#7dd3fc" href="/devices/${d.id}/telemetry">Telemetry</a> · <a style="color:#7dd3fc" href="/devices/${d.id}/commands">Command history</a></p>
      <h3>Send a remote command</h3>
      <form method="post" action="/devices/${d.id}/command"><input name="command" placeholder="e.g. reboot" style="padding:9px;width:220px;background:#101418;color:#e8eef4;border:1px solid #2b3542;border-radius:6px"> <button style="padding:9px 16px;background:#2563eb;color:#fff;border:0;border-radius:6px;cursor:pointer">Send command</button></form>
      <h3>Report a telemetry reading</h3>
      <form method="post" action="/devices/${d.id}/telemetry"><input name="metric" placeholder="metric" style="padding:9px;width:140px;background:#101418;color:#e8eef4;border:1px solid #2b3542;border-radius:6px"> <input name="value" placeholder="value" style="padding:9px;width:140px;background:#101418;color:#e8eef4;border:1px solid #2b3542;border-radius:6px"> <button style="padding:9px 16px;background:#2563eb;color:#fff;border:0;border-radius:6px;cursor:pointer">Submit reading</button></form>
      <h3>Update device</h3>
      <form method="post" action="/devices/${d.id}/update"><input name="name" value="${esc(d.name)}" style="padding:9px;width:220px;background:#101418;color:#e8eef4;border:1px solid #2b3542;border-radius:6px"> <input name="firmware" value="${esc(d.firmware)}" style="padding:9px;width:140px;background:#101418;color:#e8eef4;border:1px solid #2b3542;border-radius:6px"> <button style="padding:9px 16px;background:#2563eb;color:#fff;border:0;border-radius:6px;cursor:pointer">Save</button></form>`));
    }
    const telMatch = /^\/devices\/(\d+)\/telemetry$/.exec(pth);
    if (telMatch && method === 'GET') {
      attempt(F.TEL);
      const d = devices.find(x => x.id === Number(telMatch[1]));
      if (!d) return send(res, 404, layout(user, 'Not found', '<h1>Device not found</h1>'));
      if (d.ownerId !== user.id) pass('tel-idor');
      const rows = (telemetry[d.id] || []).map(t => `<tr><td style="padding:6px 10px">${esc(t.ts)}</td><td style="padding:6px 10px">${esc(t.metric)}</td><td style="padding:6px 10px">${esc(t.value)}</td></tr>`).join('');
      return send(res, 200, layout(user, 'Telemetry', `<h1>Telemetry — ${esc(d.name)}</h1><table style="border-collapse:collapse">${rows || '<tr><td>No readings.</td></tr>'}</table>`));
    }
    if (telMatch && method === 'POST') {
      const body = await readBody(req);
      attempt(F.TEL);
      const d = devices.find(x => x.id === Number(telMatch[1]));
      if (!d) return send(res, 404, layout(user, 'Not found', '<h1>Device not found</h1>'));
      if (d.ownerId !== user.id) pass('tel-spoof');
      (telemetry[d.id] = telemetry[d.id] || []).push({ ts: new Date().toISOString().slice(0, 16).replace('T', ' '), metric: String(body.metric || 'reading'), value: String(body.value || '') });
      return redirect(res, '/devices/' + d.id + '/telemetry');
    }
    const cmdMatch = /^\/devices\/(\d+)\/command$/.exec(pth);
    if (cmdMatch && method === 'POST') {
      const body = await readBody(req);
      attempt(F.CMD);
      const d = devices.find(x => x.id === Number(cmdMatch[1]));
      if (!d) return send(res, 404, layout(user, 'Not found', '<h1>Device not found</h1>'));
      if (d.ownerId !== user.id) pass('cmd-idor');
      commands.push({ id: nextCommandId++, deviceId: d.id, command: String(body.command || ''), by: user.id, status: 'queued' });
      return redirect(res, '/devices/' + d.id + '/commands');
    }
    const cmdLogMatch = /^\/devices\/(\d+)\/commands$/.exec(pth);
    if (cmdLogMatch && method === 'GET') {
      attempt(F.CMD);
      const d = devices.find(x => x.id === Number(cmdLogMatch[1]));
      if (!d) return send(res, 404, layout(user, 'Not found', '<h1>Device not found</h1>'));
      if (d.ownerId !== user.id) pass('cmdlog-idor');
      const rows = commands.filter(c => c.deviceId === d.id).map(c => {
        const by = users.find(x => x.id === c.by);
        return `<tr><td style="padding:6px 10px">${esc(c.command)}</td><td style="padding:6px 10px">${esc(by ? by.name : '?')}</td><td style="padding:6px 10px">${esc(c.status)}</td></tr>`;
      }).join('');
      return send(res, 200, layout(user, 'Commands', `<h1>Command history — ${esc(d.name)}</h1><table style="border-collapse:collapse">${rows || '<tr><td>No commands yet.</td></tr>'}</table>`));
    }
    const updMatch = /^\/devices\/(\d+)\/update$/.exec(pth);
    if (updMatch && method === 'POST') {
      const body = await readBody(req);
      attempt(F.FW);
      const d = devices.find(x => x.id === Number(updMatch[1]));
      if (!d) return send(res, 404, layout(user, 'Not found', '<h1>Device not found</h1>'));
      if (body.name) d.name = String(body.name);
      if (body.firmware) {
        d.firmware = String(body.firmware);
        if (!firmwares.some(f => f.version === d.firmware)) pass('fw-tamper');
      }
      return redirect(res, '/devices/' + d.id);
    }

    /* ------------------------------- firmware -------------------------------- */
    if (pth === '/firmware' && method === 'GET') {
      const rows = firmwares.filter(f => f.listed).map(f => `<tr><td style="padding:6px 10px"><a style="color:#7dd3fc" href="/firmware/${f.id}">${esc(f.version)}</a></td><td style="padding:6px 10px">${esc(f.channel)}</td><td style="padding:6px 10px">${esc(f.notes)}</td></tr>`).join('');
      return send(res, 200, layout(user, 'Firmware', `<h1>Firmware releases</h1><table style="border-collapse:collapse">${rows}</table>`));
    }
    const fwMatch = /^\/firmware\/(\d+)$/.exec(pth);
    if (fwMatch && method === 'GET') {
      attempt(F.FW);
      const f = firmwares.find(x => x.id === Number(fwMatch[1]));
      if (!f) return send(res, 404, layout(user, 'Not found', '<h1>Firmware not found</h1>'));
      if (!f.listed && user.role !== 'admin') pass('fw-beta');
      return send(res, 200, layout(user, 'Firmware', `<h1>Firmware ${esc(f.version)}</h1><p>Channel: ${esc(f.channel)}</p><p>${esc(f.notes)}</p>`));
    }

    /* -------------------------------- groups --------------------------------- */
    if (pth === '/groups' && method === 'GET') {
      const rows = groups.map(g => `<tr><td style="padding:6px 10px"><a style="color:#7dd3fc" href="/groups/${g.id}">${esc(g.name)}</a></td><td style="padding:6px 10px">${g.isPrivate ? 'Private' : 'Public'}</td><td style="padding:6px 10px">${g.members.includes(user.id) ? 'Member' : '—'}</td></tr>`).join('');
      return send(res, 200, layout(user, 'Groups', `<h1>Device groups</h1><table style="border-collapse:collapse">${rows}</table>
      <p style="color:#94a3b8;font-size:13px">Share link for your groups: /groups/join?token=share-&lt;groupId&gt;</p>`));
    }
    if (pth === '/groups/join' && method === 'GET') {
      attempt(F.GRP);
      const token = url.searchParams.get('token') || '';
      const m = /^share-(\d+)$/.exec(token);
      const g = m ? groups.find(x => x.id === Number(m[1])) : null;
      if (!g) return send(res, 200, layout(user, 'Groups', '<h1>Invalid invite link</h1>'));
      if (!g.members.includes(user.id)) {
        g.members.push(user.id);
        if (g.isPrivate) pass('grp-share');
      }
      return redirect(res, '/groups/' + g.id);
    }
    const grpMatch = /^\/groups\/(\d+)$/.exec(pth);
    if (grpMatch && method === 'GET') {
      attempt(F.GRP);
      const g = groups.find(x => x.id === Number(grpMatch[1]));
      if (!g) return send(res, 404, layout(user, 'Not found', '<h1>Group not found</h1>'));
      if (g.isPrivate && !g.members.includes(user.id)) pass('grp-private');
      const ds = devices.filter(d => d.groupId === g.id);
      return send(res, 200, layout(user, 'Group', `<h1>${esc(g.name)} ${g.isPrivate ? '(Private)' : '(Public)'}</h1>
      <h2>Devices in this group</h2><table style="border-collapse:collapse">${ds.map(deviceRow).join('') || '<tr><td>None.</td></tr>'}</table>`));
    }

    /* -------------------------------- alerts --------------------------------- */
    if (pth === '/alerts' && method === 'GET') {
      const rows = alerts.map(a => `<tr><td style="padding:6px 10px"><a style="color:#7dd3fc" href="/alerts/${a.id}">Alert ${a.id}</a></td><td style="padding:6px 10px">${esc(a.message)}</td><td style="padding:6px 10px">${a.acked ? 'Acknowledged' : 'Open'}</td></tr>`).join('');
      return send(res, 200, layout(user, 'Alerts', `<h1>Alerts</h1><table style="border-collapse:collapse">${rows}</table>`));
    }
    const altMatch = /^\/alerts\/(\d+)$/.exec(pth);
    if (altMatch && method === 'GET') {
      attempt(F.ALT);
      const a = alerts.find(x => x.id === Number(altMatch[1]));
      if (!a) return send(res, 404, layout(user, 'Not found', '<h1>Alert not found</h1>'));
      if (a.ownerId !== user.id) pass('alert-idor');
      const d = devices.find(x => x.id === a.deviceId);
      return send(res, 200, layout(user, 'Alert', `<h1>Alert ${a.id}</h1>
      <p>${esc(a.message)}</p><p>Device: ${esc(d ? d.name : '?')} · Status: ${a.acked ? 'Acknowledged' : 'Open'}</p>
      <form method="post" action="/alerts/${a.id}/ack"><button style="padding:9px 16px;background:#2563eb;color:#fff;border:0;border-radius:6px;cursor:pointer">Acknowledge</button></form>`));
    }
    const ackMatch = /^\/alerts\/(\d+)\/ack$/.exec(pth);
    if (ackMatch && method === 'POST') {
      await readBody(req);
      attempt(F.ALT);
      const a = alerts.find(x => x.id === Number(ackMatch[1]));
      if (!a) return send(res, 404, layout(user, 'Not found', '<h1>Alert not found</h1>'));
      if (a.ownerId !== user.id) pass('alert-ack');
      a.acked = true;
      return redirect(res, '/alerts/' + a.id);
    }

    /* --------------------------------- admin --------------------------------- */
    if (pth === '/admin' && method === 'GET') {
      attempt(F.ADM);
      // The flaw: the console trusts the client-set hx_role cookie, not the session.
      if (cookies.hx_role !== 'admin') return send(res, 403, layout(user, 'Admin', '<h1>Admin console</h1><p>Admins only.</p>'));
      if (user.role !== 'admin') pass('auth-cookie');
      const rows = users.map(u => `<tr><td style="padding:6px 10px">${esc(u.name)}</td><td style="padding:6px 10px">${esc(u.email)}</td><td style="padding:6px 10px">${esc(u.role)}</td></tr>`).join('');
      return send(res, 200, layout(user, 'Admin', `<h1>Admin console</h1><p>Users: ${users.length} · Devices: ${devices.length}</p><table style="border-collapse:collapse">${rows}</table>`));
    }

    /* ------------------------------ lab system pages ------------------------------ */
    if (pth === '/tests' && method === 'GET') {
      const p = progressObj();
      let html = `<h1>Mission Board — LAB ${LAB_NUMBER} ${LAB_NAME}</h1><p>${p.done}/${p.total} tests complete (${p.pct}%). Tests complete by DOING the exploit — the server detects the real effect.</p>`;
      for (const f of FEATURES) {
        html += `<h2>${esc(f)} <span style="color:#94a3b8;font-size:13px">(${p.features[f].done}/${p.features[f].total} done · ${p.features[f].attempts} attempts)</span></h2>`;
        for (const t of TESTS.filter(x => x.feature === f)) {
          const done = !!state.tests[t.id];
          html += `<div style="border:1px solid #2b3542;border-radius:8px;padding:10px 12px;margin:8px 0">
            <b>${done ? '✓' : '○'} ${esc(t.name)}</b> <span style="color:#94a3b8;font-size:12px">${esc(t.owasp)} · ${esc(t.difficulty)} · Status: ${done ? 'done' : 'open'}</span>
            <details><summary style="cursor:pointer;color:#7dd3fc">Hints</summary>
            <div class="hints">${t.hints.map((h, i) => `<p style="margin:4px 0">Hint ${i + 1}: ${esc(h)}</p>`).join('')}</div></details></div>`;
        }
      }
      return send(res, 200, layout(user, 'Mission Board', html));
    }
    if (pth === '/complete' && method === 'GET') {
      const p = progressObj();
      if (!p.complete) {
        const left = TESTS.filter(t => !state.tests[t.id]).map(t => `<li>${esc(t.name)} (${esc(t.feature)})</li>`).join('');
        return send(res, 200, layout(user, 'Not yet', `<h1>Not complete yet</h1><p>You are at ${p.pct}% (${p.done}/${p.total}). Remaining tests:</p><ul>${left}</ul>`));
      }
      const featCounts = FEATURES.map(f => `<li>${esc(f)}: ${TESTS.filter(t => t.feature === f).length} vulnerabilities</li>`).join('');
      const techniques = TESTS.map(t => `<li>${esc(t.name)} — ${esc(t.owasp)}</li>`).join('');
      const lessons = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('');
      const impacts = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('');
      const reports = TESTS.map(t => `<li><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)} — Remediation: ${esc(t.report.remediation)}</li>`).join('');
      return send(res, 200, layout(user, 'Complete', `<h1>🎉 LAB ${LAB_NUMBER} — ${LAB_NAME} complete!</h1>
      <h2>1) Features in this lab</h2><p>${FEATURES.length} features, ${TESTS.length} tests in total.</p>
      <h2>2) Vulnerabilities per feature</h2><ul>${featCounts}</ul>
      <h2>3) Ways testing was done (${TESTS.length} techniques)</h2><ul>${techniques}</ul>
      <h2>4) What you learned</h2><ul>${lessons}</ul>
      <h2>5) What this means for a real client</h2><ul>${impacts}</ul>
      <h2>6) Writing it in a real report</h2><ul>${reports}</ul>
      <h2>Your completion key</h2>
      <p style="font-size:20px;background:#101418;border:1px dashed #22c55e;padding:12px;border-radius:8px"><b>${esc(completionKey())}</b></p>
      <p>Paste this key into the next lab to unlock it.</p>
      <form method="post" action="/complete"><p>Tester name for your certificate: <input name="testerName" value="${esc(state.testerName || (user && user.name))}" style="padding:9px;background:#101418;color:#e8eef4;border:1px solid #2b3542;border-radius:6px"> <button style="padding:9px 16px;background:#2563eb;color:#fff;border:0;border-radius:6px;cursor:pointer">Save name</button></p></form>
      <p><a style="color:#7dd3fc" href="/certificate">View your certificate</a></p>`));
    }
    if (pth === '/complete' && method === 'POST') {
      const body = await readBody(req);
      if (body.testerName) { state.testerName = String(body.testerName); save(); }
      return redirect(res, '/complete');
    }
    if (pth === '/certificate' && method === 'GET') {
      const p = progressObj();
      if (!p.complete) return redirect(res, '/complete');
      const name = state.testerName || (user && user.name);
      const date = state.completedAt ? state.completedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
      return send(res, 200, `<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER}</title>
      <style>@media print { body { background:#fff } } .card { max-width:720px; margin:40px auto; background:#ffffff; color:#111827; border:3px solid #2563eb; border-radius:14px; padding:36px; font-family:Georgia,serif; text-align:center } h1 { margin:8px 0 } .name { font-size:28px; font-weight:bold; margin:14px 0 }</style></head>
      <body style="background:#e5e7eb"><div class="card">
      <img src="/logo.png" alt="HexaCyberLab" style="height:64px">
      <h1>Certificate of Completion</h1>
      <p>This certifies that</p><div class="name">${esc(name)}</div>
      <p>has completed 100% of the security tests in LAB ${LAB_NUMBER} — ${LAB_NAME} (${TESTS.length} tests across ${FEATURES.length} features)</p>
      <p>Completed on ${esc(date)}</p>
      <p style="margin-top:24px"><b>HexaCyberLab — Built by Md. Jony Hassain, Founder</b></p>
      </div></body></html>`);
    }

    return send(res, 404, layout(user, 'Not found', '<h1>404 — Page not found</h1>'));
  } catch (e) {
    try { send(res, 200, layout(null, 'Oops', '<h1>Something odd happened, but the lab is still up.</h1><p><a href="/">Home</a></p>')); } catch (e2) {}
  }
});

/* ------------------------------- doc generator ----------------------------- */
function genDocs() {
  const byFeat = f => TESTS.filter(t => t.feature === f);
  let vuln = '# ' + LAB_NAME + ' — Vulnerability Map (LAB ' + LAB_NUMBER + ')\n\nEvery scored test in this lab, grouped by feature. Each one is a real, working flaw in the app, detected server-side when the exploit succeeds.\n';
  for (const f of FEATURES) {
    vuln += '\n## ' + f + '\n';
    for (const t of byFeat(f)) {
      vuln += '\n### ' + t.name + '\n- OWASP: ' + t.owasp + '\n- Difficulty: ' + t.difficulty + '\n- Location: ' + t.where + '\n- Exploitation outline: ' + t.how + '\n- Impact: ' + t.impact + '\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'), vuln);
  const order = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  let guide = '# ' + LAB_NAME + ' — Practice Guide (LAB ' + LAB_NUMBER + ')\n\nChallenges grouped by feature, then difficulty. Each challenge mirrors one test on the in-app Mission Board (/tests) and carries the same 3 graded hints.\n';
  for (const f of FEATURES) {
    guide += '\n## ' + f + '\n';
    for (const t of byFeat(f).slice().sort((a, b) => order[a.difficulty] - order[b.difficulty])) {
      guide += '\n### ' + t.name + ' (' + t.difficulty + ')\n- Objective: ' + t.how + '\n- Measurable success: the "' + t.name + '" test flips to done on /tests and /api/progress.\n- Hint 1: ' + t.hints[0] + '\n- Hint 2: ' + t.hints[1] + '\n- Hint 3: ' + t.hints[2] + '\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'), guide);
  let fix = '# ' + LAB_NAME + ' — Fix & Retest Guide (LAB ' + LAB_NUMBER + ')\n\nFor every scored test: how it is written in a real client report, the secure implementation, and the regression test that proves the fix.\n';
  for (const t of TESTS) {
    fix += '\n## ' + t.report.title + '\n- Feature: ' + t.feature + '\n- Severity: ' + t.report.severity + '\n- Secure implementation: ' + t.report.remediation + '\n- Regression test: Repeat the original exploit (' + t.where + ') after the fix; it must fail, the affected test must stay open on a fresh lab run, and normal use of the feature must still work.\n';
  }
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'), fix);
  console.log('Docs generated for ' + TESTS.length + ' tests across ' + FEATURES.length + ' features.');
}
if (process.argv.includes('--gen-docs')) { genDocs(); process.exit(0); }

server.listen(PORT, HOST, () => console.log('LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ' listening on http://' + HOST + ':' + PORT));
