'use strict';
/* ============================================================================
   HexaTelemed — LAB 66 (Category 7: Healthcare & Wellness)
   A deliberately vulnerable telemedicine platform for security training.
   Zero-dependency Node.js. LOCAL USE ONLY. All data is fake seed data.
   ========================================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB_NUMBER = 66;
const LAB_NAME = 'HexaTelemed';
const PORT = 3075;
const HOST = '127.0.0.1';
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const LOGO_FILE = path.join(DIR, 'logo.png');

/* --- scattered configuration fragments (assembled at runtime, see below) --- */
const _cfgA = ['TC1YSA==', 'RS02Ng==', 'TTBVVg=='];
const _metaNote = 'HexaTelemed practice lab — local only, fake data.';

/* ---------------------------------------------------------------------------
   In-memory database (fake seed data — no real patients, no real calls)
--------------------------------------------------------------------------- */
const db = {
  users: [
    { id: 1, name: 'Platform Admin', email: 'admin@hexatelemed.local', password: 'admin123', role: 'admin' },
    { id: 2, name: 'Dr. Priya Patel', email: 'drpatel@hexatelemed.local', password: 'doctor123', role: 'doctor', specialty: 'Cardiology', fee: 80, availability: ['Mon 09:00', 'Mon 10:00', 'Tue 14:00'] },
    { id: 3, name: 'Dr. John Smith', email: 'drsmith@hexatelemed.local', password: 'doctor123', role: 'doctor', specialty: 'Dermatology', fee: 60, availability: ['Wed 11:00', 'Thu 15:00'] },
    { id: 4, name: 'Alice Rahman', email: 'alice@test.local', password: 'alice123', role: 'patient' },
    { id: 5, name: 'Bob Karim', email: 'bob@test.local', password: 'bob123', role: 'patient' },
    { id: 6, name: 'Carol Das', email: 'carol@test.local', password: 'carol123', role: 'patient' }
  ],
  appointments: [
    { id: 1, patientId: 4, doctorId: 2, slot: 'Mon 09:00', fee: 80, status: 'completed', roomCode: 'room-1001', followupOf: null },
    { id: 2, patientId: 5, doctorId: 3, slot: 'Wed 11:00', fee: 60, status: 'booked', roomCode: 'room-1002', followupOf: null },
    { id: 3, patientId: 4, doctorId: 3, slot: 'Thu 15:00', fee: 60, status: 'booked', roomCode: 'room-1003', followupOf: null }
  ],
  notes: [
    { id: 1, apptId: 1, authorId: 2, text: 'Patient reports occasional chest discomfort after exercise. Advised an ECG and rest; review in two weeks.' }
  ],
  prescriptions: [
    { id: 1, apptId: 1, patientId: 4, doctorId: 2, medication: 'Aspirin 75mg', dosage: 'One tablet daily', refillsLeft: 2, refillsUsed: 0 },
    { id: 2, apptId: 2, patientId: 5, doctorId: 3, medication: 'Hydrocortisone Cream 1%', dosage: 'Apply twice daily', refillsLeft: 0, refillsUsed: 1 }
  ],
  nextUserId: 7,
  nextApptId: 4,
  nextNoteId: 2,
  nextRxId: 3
};
for (const u of db.users) u.apiToken = 'tm_' + crypto.randomBytes(8).toString('hex');
for (const u of db.users) u.resetToken = null;

const sessions = new Map(); // sid -> userId
const loginFails = new Map(); // email -> failed count
const probedEmails = new Set(); // enumeration probe tracking

function userById(id) { return db.users.find(u => u.id === id); }
function userByEmail(email) { return db.users.find(u => u.email === String(email || '').toLowerCase()); }

/* Predictable reset token formula (the vulnerability — derived only from the user id) */
function resetFormula(u) { return 'TM' + u.id + '-' + ((u.id * 137 + 42).toString(36)).toUpperCase(); }

const SQLI_RE = /'\s*(or|and)\s+('?\d+'?\s*=\s*'?\d+|'\w+'\s*=\s*'\w+)|'\s*--|'\s*or\s+1\s*=\s*1|\bunion\b\s+\bselect\b/i;
const XSS_RE = /(<script|<svg|<img[^>]*onerror|onerror\s*=|onload\s*=|<iframe|<body[^>]*onload)/i;
function looksSqli(s) { return SQLI_RE.test(String(s || '')); }
function looksXss(s) { return XSS_RE.test(String(s || '')); }

/* ---------------------------------------------------------------------------
   TESTS registry — one entry per scored vulnerability test.
   Tests complete only when the server observes the real exploit effect.
--------------------------------------------------------------------------- */
const F_AUTH = 'Login & Authentication';
const F_REG = 'Registration & Profile';
const F_DOC = 'Doctors & Availability';
const F_APPT = 'Appointments & Sessions';
const F_NOTES = 'Consultation Notes';
const F_RX = 'Prescriptions';
const F_ADMIN = 'Admin Panel';
const F_API = 'Platform & API';

const TESTS = [
  /* ---------------- Login & Authentication ---------------- */
  { id: 'auth-sqli', feature: F_AUTH, name: 'SQL Injection Login Bypass', owasp: 'A03:2021 – Injection', difficulty: 'Beginner',
    hints: ['The login form glues your input straight into its lookup query.', 'A classic tautology in the email field can make the query match the first account.', "Try email: ' OR '1'='1 with any password."],
    lesson: 'String-built queries let an attacker rewrite the login logic itself and walk in as the first account in the table.',
    impact: 'On a real telemedicine site this hands an attacker an admin or doctor account — every patient record behind it is exposed.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries everywhere; never build SQL by string concatenation.' } },
  { id: 'auth-brute', feature: F_AUTH, name: 'Brute Force — No Rate Limiting or Lockout', owasp: 'A07:2021 – Authentication Failures', difficulty: 'Beginner',
    hints: ['Nothing slows you down when a password guess fails.', 'Script 10 or more wrong passwords for one account and watch what does NOT happen.', 'After 10 failures the account still accepts guesses — and the right password still works.'],
    lesson: 'Without throttling or lockout, patient and doctor passwords fall to simple guessing.',
    impact: 'Attackers can grind through weak passwords overnight and take over real patient accounts and their medical history.',
    report: { title: 'Missing Brute-Force Protection on Login', severity: 'High', remediation: 'Rate-limit login attempts, add progressive delays and lockout, and alert on repeated failures.' } },
  { id: 'auth-enum', feature: F_AUTH, name: 'User Enumeration via Login & Forgot-Password', owasp: 'A07:2021 – Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the answers for an email that exists and one that does not.', 'The forgot-password form is especially talkative.', 'Probe at least 5 different emails and note how the responses differ.'],
    lesson: 'Different responses for real and fake accounts let attackers build a target list of patients and doctors before attacking.',
    impact: 'An attacker learns exactly which email addresses belong to patients of the clinic — perfect material for targeted phishing.',
    report: { title: 'Account Enumeration Through Differential Auth Responses', severity: 'Medium', remediation: 'Return one generic message for all login and reset responses, regardless of account existence.' } },
  { id: 'auth-default', feature: F_AUTH, name: 'Default / Demo Credentials Still Active', owasp: 'A07:2021 – Authentication Failures', difficulty: 'Beginner',
    hints: ['The platform shipped with well-known starter passwords that were never changed.', 'The admin account is the most interesting one.', 'Try the classic factory password admin123 on the admin account.'],
    lesson: 'Default credentials are public knowledge — leaving them live is the same as having no password at all.',
    impact: 'Anyone on the internet can sign in as the platform administrator and read or alter every patient record.',
    report: { title: 'Default Administrator Credentials in Production', severity: 'Critical', remediation: 'Force a password change on first login, disable demo accounts, and scan for default credentials before launch.' } },
  { id: 'auth-reset', feature: F_AUTH, name: 'Predictable Password Reset Token', owasp: 'A07:2021 – Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a reset and study the shape of the token — it is not random.', 'The token is derived from something public about the account: its numeric id.', 'Token = TM<id>-<base36(id*137+42)>. Compute it for another user and reset their password.'],
    lesson: 'Reset tokens must be unguessable random values; a formula based on the user id protects nothing.',
    impact: 'Anyone who knows a patient’s user id can reset their password and read their consultations, notes and prescriptions.',
    report: { title: 'Predictable Password Reset Tokens', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), expire them quickly, and invalidate after use.' } },
  { id: 'auth-cookie', feature: F_AUTH, name: 'Role Cookie Tampering — Client-Supplied Role Trusted', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['After login, look at the cookies the app sets — one of them describes your role.', 'The doctor area believes that cookie instead of the server-side account.', 'Set hx_role=doctor in your browser while logged in as a patient, then open /doctor.'],
    lesson: 'Authorization data must live on the server. A role stored in a cookie is a suggestion the user can edit.',
    impact: 'Any patient can promote themselves to doctor — issuing prescriptions and reading other patients’ notes.',
    report: { title: 'Client-Side Role Cookie Trusted for Authorization', severity: 'High', remediation: 'Derive roles from the server-side session record on every request; never trust client-supplied role claims.' } },

  /* ---------------- Registration & Profile ---------------- */
  { id: 'reg-weakpass', feature: F_REG, name: 'Weak Password Policy (1-Character Passwords)', owasp: 'A07:2021 – Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a new account and see how little the password field demands.', 'One character is enough.', 'Create an account with the password "a" — it is accepted.'],
    lesson: 'A password policy that accepts anything guarantees weak accounts across the whole patient base.',
    impact: 'Patient accounts with trivial passwords are harvested by credential guessing, exposing private health data.',
    report: { title: 'No Minimum Password Strength Enforced', severity: 'Medium', remediation: 'Enforce a minimum length (≥10) and block common passwords at registration and reset.' } },
  { id: 'reg-massassign', feature: F_REG, name: 'Mass Assignment — Role Escalation at Registration', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration endpoint binds more form fields than the form shows.', 'What if the request simply includes the field that decides your role?', 'POST /register with an extra field role=doctor (or admin) and check your new account.'],
    lesson: 'Binding request bodies directly to data models lets attackers set fields the UI never offered.',
    impact: 'Attackers self-register as doctors or admins, bypassing every approval step the clinic relies on.',
    report: { title: 'Mass Assignment Allows Privilege Escalation at Registration', severity: 'High', remediation: 'Whitelist bindable fields per endpoint; set role server-side only.' } },
  { id: 'reg-xss', feature: F_REG, name: 'Stored XSS in Display Name', owasp: 'A03:2021 – Injection', difficulty: 'Beginner',
    hints: ['Your display name is shown on many pages — including staff views.', 'It is rendered exactly as typed.', 'Register or update your profile with a name like <svg onload=alert(1)> and view a page that shows it.'],
    lesson: 'Any user-controlled text rendered without escaping becomes code in other users’ browsers.',
    impact: 'A malicious patient name can run script in a doctor’s or admin’s browser and hijack their session.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Escape all user output by context and add a Content-Security-Policy header.' } },
  { id: 'reg-csrf', feature: F_REG, name: 'CSRF on Profile Update', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['Legit profile forms carry a hidden hx_marker field. The server never checks it.', 'A state-changing POST from another origin is accepted just the same.', 'POST /profile with new details but WITHOUT hx_marker — the change still saves.'],
    lesson: 'State-changing forms need an anti-CSRF token that the server actually verifies.',
    impact: 'A booby-trapped page could silently change a doctor’s profile or a patient’s contact details while they browse.',
    report: { title: 'Missing CSRF Verification on Profile Update', severity: 'Medium', remediation: 'Issue per-session CSRF tokens and verify them on every state-changing request.' } },

  /* ---------------- Doctors & Availability ---------------- */
  { id: 'doc-sqli', feature: F_DOC, name: 'SQL Injection in Doctor Search', owasp: 'A03:2021 – Injection', difficulty: 'Beginner',
    hints: ['The specialty search builds its filter the same sloppy way as the login.', 'A tautology makes the filter match every doctor.', "Search for: ' OR '1'='1 and compare the result count with a normal search."],
    lesson: 'Every input that reaches a query needs parameterisation — search boxes are queries too.',
    impact: 'Attackers can dump the full doctor roster and probe for deeper injection into the patient database.',
    report: { title: 'SQL Injection in Doctor Search', severity: 'High', remediation: 'Parameterise search queries and validate filter input against an allow-list.' } },
  { id: 'doc-xss', feature: F_DOC, name: 'Reflected XSS in Doctor Search', owasp: 'A03:2021 – Injection', difficulty: 'Beginner',
    hints: ['The results page echoes your search term back to you.', 'It echoes it raw.', 'Search for <script>alert(1)</script> and view the page source.'],
    lesson: 'Reflected input must be escaped in the response, every time, even in “harmless” echoes.',
    impact: 'A crafted search link sent to staff executes script in their browser under the clinic’s trusted domain.',
    report: { title: 'Reflected Cross-Site Scripting in Search', severity: 'Medium', remediation: 'Contextually escape reflected values and deploy a Content-Security-Policy.' } },
  { id: 'doc-availability', feature: F_DOC, name: "Doctor Availability Manipulation by Patients", owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['Doctors manage their slots at POST /doctors/<id>/availability.', 'The endpoint asks “are you logged in?” but not “is this YOUR schedule?” — or even “are you a doctor?”', 'As a patient, POST new availability for a doctor and watch their booking page change.'],
    lesson: 'Function-level authorization matters: every sensitive action must check the actor’s role AND ownership.',
    impact: 'A vandal can wipe a doctor’s calendar — patients cannot book, the clinic loses revenue and trust.',
    report: { title: 'Missing Authorization on Doctor Availability Management', severity: 'High', remediation: 'Restrict availability changes to the owning doctor or admins, verified server-side.' } },

  /* ---------------- Appointments & Sessions ---------------- */
  { id: 'appt-fee', feature: F_APPT, name: 'Consultation Fee Tampering', owasp: 'A04:2021 – Insecure Design', difficulty: 'Beginner',
    hints: ['The booking form carries the fee as a hidden field.', 'The server trusts whatever fee arrives.', 'Book a consultation but send fee=1 instead of the listed price.'],
    lesson: 'Prices must always be recomputed server-side from the catalogue; hidden fields are visible — and editable.',
    impact: 'Patients book $80 consultations for $1. The clinic’s billing silently bleeds money.',
    report: { title: 'Client-Side Price Tampering in Consultation Booking', severity: 'High', remediation: 'Ignore client-supplied prices; always price from server-side catalogue data.' } },
  { id: 'appt-idor', feature: F_APPT, name: "Appointment IDOR — Other Patients' Bookings Exposed", owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: ['Appointment pages live at /appointments/<id> with small sequential ids.', 'Nothing checks that the booking is yours.', 'Open /appointments/2 while logged in as a different patient.'],
    lesson: 'Object ids are not authorization. Every object access needs an ownership check.',
    impact: 'Anyone can read who is seeing which doctor, when, and for what specialty — sensitive health information in itself.',
    report: { title: 'Insecure Direct Object Reference on Appointments', severity: 'High', remediation: 'Check ownership (or treating-doctor relationship) on every object read.' } },
  { id: 'session-join', feature: F_APPT, name: "Predictable Session Room — Join Another Patient's Consultation", owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['Video sessions live under /session/<room code>. Look at the pattern of the codes.', 'They are sequential: room-1001, room-1002, …', 'Guess the room code of another patient’s booked session and open it while logged in as someone else.'],
    lesson: 'Meeting links are capability tokens — they must be long, random, and checked against the participant list.',
    impact: 'A stranger can drop into a live medical consultation — an extreme privacy breach for the patient.',
    report: { title: 'Guessable Video Session Links Without Participant Checks', severity: 'Critical', remediation: 'Use unguessable room tokens (≥128-bit random) and verify the requester is a session participant.' } },
  { id: 'appt-followup', feature: F_APPT, name: "Follow-up Booking on Another Patient's Record", owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['Follow-ups are created from an existing appointment: POST /appointments/<id>/followup.', 'The new booking inherits the ORIGINAL patient — and nobody checks whose record that is.', 'Create a follow-up on another patient’s appointment id.'],
    lesson: 'Derived actions inherit the parent object’s ownership rules — and must enforce them.',
    impact: 'Attackers inject fake appointments into a victim’s medical record, confusing care and billing.',
    report: { title: 'Missing Ownership Check on Follow-up Creation', severity: 'Medium', remediation: 'Verify the requester owns (or treats) the parent appointment before creating follow-ups.' } },
  { id: 'appt-cancel', feature: F_APPT, name: "Cancel Another Patient's Appointment", owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: ['Cancelling is a simple POST to /appointments/<id>/cancel.', 'The server never asks whose appointment it is.', 'As one patient, cancel a booking that belongs to someone else.'],
    lesson: 'Destructive actions need the same ownership checks as reads — usually stronger ones.',
    impact: 'A griefer can cancel real patients’ doctor visits, delaying care and creating chaos at the clinic.',
    report: { title: 'Missing Authorization on Appointment Cancellation', severity: 'Medium', remediation: 'Restrict cancellation to the booking patient, the treating doctor, or admins.' } },

  /* ---------------- Consultation Notes ---------------- */
  { id: 'notes-idor', feature: F_NOTES, name: "Consultation Notes IDOR — Private Doctor Notes Exposed", owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: ['Notes live under the appointment: /appointments/<id>/notes.', 'The same missing check as the appointment page applies — worse, this is the clinical content.', 'Read the notes of an appointment that is not yours.'],
    lesson: 'Clinical notes are the most sensitive data in the system; they need the strictest object-level checks.',
    impact: 'Full consultation notes — symptoms, advice, history — leak to any logged-in stranger.',
    report: { title: 'Insecure Direct Object Reference on Consultation Notes', severity: 'Critical', remediation: 'Authorize notes access to the patient and treating doctor only, verified server-side.' } },
  { id: 'notes-write', feature: F_NOTES, name: "Patient Writes the Doctor's Consultation Notes", owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['Adding a note is a POST to the same notes URL.', 'The form is only SHOWN to doctors — the endpoint itself never checks the role.', 'As a patient, POST a note to your own appointment and see it stored as a clinical note.'],
    lesson: 'Hiding a form is not authorization. Write endpoints must enforce who may create clinical records.',
    impact: 'Patients can fabricate clinical notes in their own record — a medico-legal nightmare for the clinic.',
    report: { title: 'Missing Role Check on Consultation Note Creation', severity: 'High', remediation: 'Allow note creation only for the treating doctor; log author identity server-side.' } },

  /* ---------------- Prescriptions ---------------- */
  { id: 'rx-self', feature: F_RX, name: 'Self-Prescribing Without Any Consultation', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['Prescriptions are created at POST /prescriptions.', 'The UI shows the form to doctors. The endpoint trusts whoever calls it.', 'As a patient, create a prescription naming yourself as the patient, with any medication.'],
    lesson: 'Clinical actions must verify the actor’s professional role on the server, not just present the right screen.',
    impact: 'Patients prescribe themselves arbitrary medication — dangerous for them and a regulatory disaster for the platform.',
    report: { title: 'Prescription Creation Allowed for Non-Doctors', severity: 'Critical', remediation: 'Restrict prescription creation to verified doctor accounts, tied to a completed consultation.' } },
  { id: 'rx-idor', feature: F_RX, name: "Prescription IDOR — Other Patients' Medication Exposed", owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: ['Prescriptions have their own pages: /prescriptions/<id>.', 'Sequential ids, no ownership check — the usual story.', 'Open a prescription that belongs to another patient.'],
    lesson: 'Medication lists are highly sensitive; per-object authorization is non-negotiable in health systems.',
    impact: 'Anyone can learn exactly what medication any patient takes — deeply private health data.',
    report: { title: 'Insecure Direct Object Reference on Prescriptions', severity: 'High', remediation: 'Check that the requester is the prescription’s patient or issuing doctor on every read.' } },
  { id: 'rx-refill', feature: F_RX, name: 'Refill Beyond the Prescribed Limit', owasp: 'A04:2021 – Insecure Design', difficulty: 'Intermediate',
    hints: ['Each prescription carries a “refills left” counter.', 'The refill endpoint never looks at it.', 'Find a prescription with 0 refills left and POST /prescriptions/<id>/refill anyway.'],
    lesson: 'Business limits (quotas, counters, allowances) must be enforced where the action happens — on the server.',
    impact: 'Patients obtain unlimited refills of medication the doctor deliberately limited — a patient-safety issue.',
    report: { title: 'Prescription Refill Limit Not Enforced', severity: 'High', remediation: 'Check and decrement the refill allowance atomically on the server before dispensing.' } },

  /* ---------------- Admin Panel ---------------- */
  { id: 'admin-bac', feature: F_ADMIN, name: 'Admin Panel Open to Any Logged-in User', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: ['The admin console lives at /admin.', 'It checks that you are logged in. It forgets to check WHAT you are.', 'Open /admin while logged in as a plain patient.'],
    lesson: '“Logged in” is not “authorized”. Every privileged surface needs an explicit role check.',
    impact: 'The full user list — with credentials — is visible to every patient account on the platform.',
    report: { title: 'Broken Access Control on Admin Panel', severity: 'Critical', remediation: 'Enforce admin role checks server-side on every admin route and API.' } },

  /* ---------------- Platform & API ---------------- */
  { id: 'api-token', feature: F_API, name: 'Forgeable API Token (Base64 of the Email Address)', owasp: 'A07:2021 – Authentication Failures', difficulty: 'Intermediate',
    hints: ['The JSON API at /api/appointments takes a Bearer token.', 'Real tokens look random. The API also accepts something much simpler derived from the account email.', 'Try Authorization: Bearer base64(email) for a victim account.'],
    lesson: 'API tokens must be random secrets. Anything derivable from public data is not a credential.',
    impact: 'Anyone who knows a patient’s email address gets full API access to their appointments.',
    report: { title: 'Weak API Authentication Accepts Base64(Email) as Token', severity: 'High', remediation: 'Issue high-entropy random API tokens, store hashes, and reject any derived credential.' } },
  { id: 'api-debug', feature: F_API, name: 'Unauthenticated Debug Endpoint Exposes All Accounts', owasp: 'A05:2021 – Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Development leftovers often survive into production.', 'Try /api/debug — no login needed.', 'The response includes every account… and its password.'],
    lesson: 'Debug and diagnostics endpoints must never ship enabled — they bypass every other control at once.',
    impact: 'One public URL hands attackers every patient and doctor credential on the platform.',
    report: { title: 'Exposed Debug Endpoint Leaks All User Credentials', severity: 'Critical', remediation: 'Remove debug endpoints from production builds and gate diagnostics behind admin auth and IP allow-lists.' } }
];

const FEATURES = [...new Set(TESTS.map(t => t.feature))];

/* --- more scattered configuration fragments --- */
const _cfgB = ['LTVPTw==', 'REFERQ==', 'SUJNRQ=='];

/* --- remaining scattered configuration fragments --- */
const _cfgC = ['TC1YSA==', 'WS03Ng==', 'R1IyWQ=='];
const _cfgD = ['LTdPMg==', 'VEYwTg==', 'OVM5OQ=='];

function _assemble(parts) {
  return parts.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}
/* Entry secret — assembled ONLY inside /unlock verification. */
function _entrySecret() { return _assemble(_cfgA.concat(_cfgB)); }
/* Completion secret — assembled ONLY once the lab is 100% complete. */
function _completionSecret() { return _assemble(_cfgC.concat(_cfgD)); }

/* ---------------------------------------------------------------------------
   Progress engine + persistence (progress.json)
--------------------------------------------------------------------------- */
let state = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadState() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      state = Object.assign(state, raw);
    }
  } catch (e) { /* corrupt state file: start fresh rather than crash */ }
}
function saveState() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 1)); } catch (e) { /* ignore */ }
}
function doneCount() { return TESTS.filter(t => state.tests[t.id]).length; }
function isComplete() { return doneCount() === TESTS.length; }
function bumpAttempts(feature) {
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  saveState();
}
function pass(testId) {
  if (!TESTS.some(t => t.id === testId)) return;
  if (!state.tests[testId]) {
    state.tests[testId] = true;
    if (isComplete() && !state.keyRevealed) {
      state.keyRevealed = true;
      state.completedAt = new Date().toISOString();
    }
    saveState();
  }
}
function progressData() {
  const features = {};
  for (const f of FEATURES) {
    const ft = TESTS.filter(t => t.feature === f);
    features[f] = { total: ft.length, done: ft.filter(t => state.tests[t.id]).length, attempts: state.attempts[f] || 0 };
  }
  const done = doneCount();
  return { lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done,
           pct: Math.floor(done / TESTS.length * 100), features, complete: isComplete() };
}

/* ---------------------------------------------------------------------------
   HTTP helpers
--------------------------------------------------------------------------- */
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = String(req.headers['content-type'] || '');
      if (ct.includes('application/json')) {
        try { return resolve(JSON.parse(data || '{}')); } catch (e) { return resolve({ __malformed: true }); }
      }
      const out = {};
      for (const pair of data.split('&')) {
        if (!pair) continue;
        const i = pair.indexOf('=');
        const k = decodeURIComponent(pair.slice(0, i < 0 ? pair.length : i).replace(/\+/g, ' '));
        const v = i < 0 ? '' : decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' '));
        out[k] = v;
      }
      resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}
function currentUser(req) {
  const sid = parseCookies(req).hx_session;
  if (sid && sessions.has(sid)) return userById(sessions.get(sid));
  return null;
}
function effectiveRole(req, user) {
  const c = parseCookies(req).hx_role;
  return c || (user ? user.role : null);
}
function sendHtml(res, code, html) {
  res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}
function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj, null, 1));
}
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }

/* ---------------------------------------------------------------------------
   Page layout — header (logo + lab id + progress bar) + chatbot widget
--------------------------------------------------------------------------- */
function layout(title, body, user) {
  const p = progressData();
  const pct = p.pct;
  const who = user ? `<span style="color:#555">${user.name}</span> · <a href="/logout">Logout</a>` : '<a href="/login">Login</a> · <a href="/register">Register</a>';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)} · ${LAB_NAME}</title>
<style>body{font-family:Arial,sans-serif;margin:0;background:#f4f6fb;color:#1c2333}
header{background:#14141d;color:#fff;padding:10px 18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
header a{color:#9fd0ff;text-decoration:none} .bar{width:220px;height:10px;background:#333;border-radius:5px;overflow:hidden}
.bar>div{height:100%;background:linear-gradient(90deg,#3a7bd5,#8e44ad)} main{max-width:980px;margin:22px auto;padding:0 16px}
.card{background:#fff;border:1px solid #dde;border-radius:10px;padding:16px;margin-bottom:14px}
input,select,textarea{padding:8px;width:100%;box-sizing:border-box;margin:4px 0 10px;border:1px solid #bbb;border-radius:6px}
button{background:#3a7bd5;color:#fff;border:0;padding:9px 18px;border-radius:6px;cursor:pointer}
table{border-collapse:collapse;width:100%}td,th{border:1px solid #dde;padding:7px;text-align:left}
#chatbox{position:fixed;right:16px;bottom:16px;width:320px;background:#fff;border:1px solid #ccd;border-radius:10px;box-shadow:0 4px 18px rgba(0,0,0,.2);font-size:14px}
#chatlog{height:190px;overflow:auto;padding:10px} #chatlog div{margin-bottom:8px}
#chatbox form{display:flex;border-top:1px solid #eee} #chatbox input{flex:1;border:0;padding:10px} #chatbox button{border-radius:0}
</style></head><body>
<header><img src="/logo.png" style="height:40px" alt="HexaCyberLab">
<strong>LAB ${LAB_NUMBER} — ${LAB_NAME}</strong>
<div class="bar"><div style="width:${pct}%"></div></div>
<span>${p.done}/${p.total} tests · ${pct}%</span>
<nav style="margin-left:auto;display:flex;gap:12px;align-items:center"><a href="/">Home</a><a href="/doctors">Doctors</a><a href="/my">My Consultations</a><a href="/tests">Mission Board</a>${who}</nav></header>
<main>${body}</main>
<div id="chatbox"><div style="background:#14141d;color:#fff;padding:8px 12px;border-radius:10px 10px 0 0"><strong>Lab Coach</strong> — ask me about the tests</div>
<div id="chatlog"></div>
<form id="chatform"><input id="chatmsg" placeholder="Ask the coach…" autocomplete="off"><button>Send</button></form></div>
<script>
var log=document.getElementById('chatlog');
function add(who,text){var d=document.createElement('div');d.innerHTML='<strong>'+who+':</strong> ';d.appendChild(document.createTextNode(text));log.appendChild(d);log.scrollTop=1e6;}
document.getElementById('chatform').addEventListener('submit',function(e){e.preventDefault();var m=document.getElementById('chatmsg').value;if(!m)return;add('You',m);document.getElementById('chatmsg').value='';
fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})}).then(function(r){return r.json()}).then(function(j){add('Coach',j.reply)}).catch(function(){add('Coach','Something went wrong — try again.')});});
</script></body></html>`;
}

function gatePage() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ${LAB_NUMBER} — ${LAB_NAME} · Locked</title></head>
<body style="margin:0;background:#14141d;font-family:Arial,sans-serif">
<div style="max-width:520px;margin:60px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:28px;text-align:center">
<img src="/logo.png" style="height:56px"><h2>LAB ${LAB_NUMBER} — ${LAB_NAME}</h2>
<p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
<form method="POST" action="/unlock"><input name="key" style="padding:9px;width:80%" placeholder="Completion key from Lab ${LAB_NUMBER - 1}"><br><br><button style="padding:10px 22px">Unlock LAB ${LAB_NUMBER}</button></form>
<div style="margin-top:22px;border-top:1px solid #eee;padding-top:14px;text-align:left">
<strong>Lab Coach</strong>
<div id="chatlog" style="min-height:30px;margin:8px 0"></div>
<form id="chatform"><input id="chatmsg" style="padding:8px;width:75%" placeholder="Ask the coach…"><button style="padding:8px 14px">Send</button></form>
</div></div>
<script>var log=document.getElementById('chatlog');
document.getElementById('chatform').addEventListener('submit',function(e){e.preventDefault();var m=document.getElementById('chatmsg').value;if(!m)return;
fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})}).then(function(r){return r.json()}).then(function(j){var d=document.createElement('div');d.textContent='Coach: '+j.reply;log.appendChild(d);});});
</script></body></html>`;
}

/* ---------------------------------------------------------------------------
   Auth pages & actions
--------------------------------------------------------------------------- */
function loginPage(msg) {
  return layout('Login', `<h2>Sign in to ${LAB_NAME}</h2>
${msg ? `<div class="card" style="border-color:#e88">${msg}</div>` : ''}
<div class="card"><form method="POST" action="/login">
<label>Email</label><input name="email" type="email" required>
<label>Password</label><input name="password" type="password" required>
<button>Sign in</button></form>
<p><a href="/forgot">Forgot your password?</a></p></div>
<div class="card"><strong>Demo access (for the training range):</strong><br>
Patient — alice@test.local / alice123<br>Doctor — drpatel@hexatelemed.local / doctor123</div>`, null);
}

async function handleLogin(req, res) {
  const b = await readBody(req);
  bumpAttempts(F_AUTH);
  const email = String(b.email || '').toLowerCase();
  const password = String(b.password || '');
  let user = null;
  if (looksSqli(email) || looksSqli(password)) {
    /* string-built query: the tautology matches the first row in the table */
    user = db.users[0];
    pass('auth-sqli');
  } else {
    const found = userByEmail(email);
    if (found && found.password === password) user = found;
    else {
      const fails = (loginFails.get(email) || 0) + 1;
      loginFails.set(email, fails);
      if (fails >= 10 && found) pass('auth-brute');
      return sendHtml(res, 200, loginPage('Invalid email or password.'));
    }
  }
  if (user.id === 1 && password === 'admin123') pass('auth-default');
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, user.id);
  res.writeHead(302, { Location: '/', 'Set-Cookie': [
    `hx_session=${sid}; Path=/; HttpOnly`,
    `hx_role=${user.role}; Path=/`,
    'hx_origin=1; Path=/'
  ] });
  res.end();
}

function registerPage(msg) {
  return layout('Register', `<h2>Create your ${LAB_NAME} account</h2>
${msg ? `<div class="card" style="border-color:#e88">${msg}</div>` : ''}
<div class="card"><form method="POST" action="/register">
<label>Full name</label><input name="name" required>
<label>Email</label><input name="email" type="email" required>
<label>Password</label><input name="password" type="password" required>
<button>Create account</button></form></div>`, null);
}

async function handleRegister(req, res) {
  const b = await readBody(req);
  bumpAttempts(F_REG);
  const email = String(b.email || '').toLowerCase();
  if (!email || userByEmail(email)) return sendHtml(res, 200, registerPage('That email is already registered, or missing.'));
  const password = String(b.password || '');
  /* vulnerable: the whole body is bound onto the new account (mass assignment) */
  const u = { id: db.nextUserId++, name: String(b.name || 'New User'), email, password, role: 'patient' };
  if (b.role && ['patient', 'doctor', 'admin'].includes(String(b.role))) u.role = String(b.role);
  u.apiToken = 'tm_' + crypto.randomBytes(8).toString('hex');
  u.resetToken = null;
  db.users.push(u);
  if (password.length < 4) pass('reg-weakpass');
  if (u.role !== 'patient') pass('reg-massassign');
  if (looksXss(u.name)) pass('reg-xss');
  return sendHtml(res, 200, loginPage('Account created — please sign in.'));
}

function forgotPage(msg) {
  return layout('Forgot password', `<h2>Reset your password</h2>
${msg ? `<div class="card">${msg}</div>` : ''}
<div class="card"><form method="POST" action="/forgot">
<label>Email</label><input name="email" type="email" required>
<button>Send reset link</button></form></div>`, null);
}

async function handleForgot(req, res) {
  const b = await readBody(req);
  bumpAttempts(F_AUTH);
  const email = String(b.email || '').toLowerCase();
  probedEmails.add(email);
  if (probedEmails.size >= 5) pass('auth-enum');
  const u = userByEmail(email);
  if (!u) return sendHtml(res, 200, forgotPage('No account found for that email address.'));
  u.resetToken = resetFormula(u); /* predictable — derived from the user id */
  return sendHtml(res, 200, forgotPage(`A password reset link has been sent to ${esc(email)}. (Training range: use the token on the reset page.) <br>Token for this range: <code>${esc(u.resetToken)}</code>`));
}

function resetPage(msg) {
  return layout('Reset password', `<h2>Choose a new password</h2>
${msg ? `<div class="card">${msg}</div>` : ''}
<div class="card"><form method="POST" action="/reset">
<label>Email</label><input name="email" type="email" required>
<label>Reset token</label><input name="token" required>
<label>New password</label><input name="password" type="password" required>
<button>Reset password</button></form></div>`, null);
}

async function handleReset(req, res) {
  const b = await readBody(req);
  bumpAttempts(F_AUTH);
  const u = userByEmail(String(b.email || '').toLowerCase());
  if (!u || String(b.token || '') !== resetFormula(u)) {
    return sendHtml(res, 200, resetPage('That reset token is not valid.'));
  }
  u.password = String(b.password || '');
  u.resetToken = null;
  pass('auth-reset'); /* a formula-computed token was accepted — it was never random */
  return sendHtml(res, 200, loginPage('Password updated — please sign in.'));
}

/* ---------------------------------------------------------------------------
   Profile
--------------------------------------------------------------------------- */
function profilePage(user, msg) {
  /* NOTE: the display name is rendered UNESCAPED on purpose (stored XSS test) */
  return layout('My Profile', `<h2>My Profile</h2>
${msg ? `<div class="card">${msg}</div>` : ''}
<div class="card"><p>Signed in as <strong>${user.name}</strong> (${esc(user.email)}) — role: ${esc(user.role)}</p>
<form method="POST" action="/profile">
<input type="hidden" name="hx_marker" value="1">
<label>Display name</label><input name="name" value="${esc(user.name)}">
<label>Email</label><input name="email" type="email" value="${esc(user.email)}">
<button>Save changes</button></form></div>`, user);
}

async function handleProfile(req, res, user) {
  const b = await readBody(req);
  bumpAttempts(F_REG);
  const newName = String(b.name || user.name);
  const newEmail = String(b.email || user.email).toLowerCase();
  /* vulnerable: the CSRF marker the form carries is never verified */
  if (b.hx_marker !== '1') pass('reg-csrf');
  if (looksXss(newName)) pass('reg-xss');
  user.name = newName;
  user.email = newEmail;
  return sendHtml(res, 200, profilePage(user, 'Profile saved.'));
}

/* ---------------------------------------------------------------------------
   Home & doctors
--------------------------------------------------------------------------- */
function homePage(user) {
  const docs = db.users.filter(u => u.role === 'doctor');
  const rows = docs.map(d => `<tr><td>${esc(d.name)}</td><td>${esc(d.specialty)}</td><td>$${d.fee}</td><td>${esc(d.availability.join(', '))}</td></tr>`).join('');
  return layout('Home', `<h2>Telemedicine, from anywhere</h2>
<div class="card"><p>Book a video consultation with a verified doctor, receive your consultation notes and e-prescriptions in one place.</p>
<p><a href="/doctors">Browse doctors &amp; book →</a></p></div>
<div class="card"><h3>Our doctors</h3><table><tr><th>Doctor</th><th>Specialty</th><th>Fee</th><th>Availability</th></tr>${rows}</table></div>`, user);
}

function doctorsPage(user, q) {
  let docs = db.users.filter(u => u.role === 'doctor');
  if (q) {
    if (looksSqli(q)) { pass('doc-sqli'); /* tautology: filter matches everyone */ }
    else docs = docs.filter(d => (d.specialty + ' ' + d.name).toLowerCase().includes(q.toLowerCase()));
  }
  if (q && looksXss(q)) pass('doc-xss');
  const rows = docs.map(d => `<tr><td>${esc(d.name)}</td><td>${esc(d.specialty)}</td><td>$${d.fee}</td>
<td><form method="POST" action="/book"><input type="hidden" name="doctorId" value="${d.id}">
<input type="hidden" name="fee" value="${d.fee}">
<select name="slot">${d.availability.map(s => `<option>${esc(s)}</option>`).join('')}</select>
<button>Book consultation</button></form></td></tr>`).join('');
  /* NOTE: the search term is reflected UNESCAPED on purpose (reflected XSS test) */
  return layout('Doctors', `<h2>Find a doctor</h2>
<div class="card"><form method="GET" action="/doctors"><label>Search by specialty or name</label>
<input name="q" value=""> <button>Search</button></form>
${q ? `<p>Results for: ${q}</p>` : ''}</div>
<div class="card"><table><tr><th>Doctor</th><th>Specialty</th><th>Fee</th><th>Book</th></tr>${rows}</table></div>
<div class="card"><h3>Doctor schedule management</h3>
<form method="POST" action="/doctors/${docs[0] ? docs[0].id : 2}/availability">
<label>Availability slots (comma separated) for the first listed doctor</label>
<input name="slots" placeholder="Mon 09:00, Tue 10:00"><button>Update availability</button></form></div>`, user);
}

async function handleAvailability(req, res, user, doctorId) {
  const b = await readBody(req);
  bumpAttempts(F_DOC);
  const doc = userById(doctorId);
  if (!doc || doc.role !== 'doctor') return sendHtml(res, 404, layout('Not found', '<h2>Doctor not found.</h2>', user));
  doc.availability = String(b.slots || '').split(',').map(s => s.trim()).filter(Boolean);
  /* vulnerable: no check that the caller IS this doctor (or even a doctor) */
  if (user.id !== doc.id) pass('doc-availability');
  return sendHtml(res, 200, layout('Availability', `<div class="card"><h2>Availability updated</h2><p>${esc(doc.name)} is now available: ${esc(doc.availability.join(', '))}</p></div>`, user));
}

/* ---------------------------------------------------------------------------
   Appointments & sessions
--------------------------------------------------------------------------- */
async function handleBook(req, res, user) {
  const b = await readBody(req);
  bumpAttempts(F_APPT);
  const doc = userById(parseInt(b.doctorId, 10));
  if (!doc || doc.role !== 'doctor') return sendHtml(res, 400, layout('Booking', '<div class="card">Unknown doctor.</div>', user));
  const fee = Number(b.fee);
  const appt = { id: db.nextApptId++, patientId: user.id, doctorId: doc.id, slot: String(b.slot || doc.availability[0] || 'Mon 09:00'),
                 fee: isNaN(fee) ? doc.fee : fee, status: 'booked', roomCode: '', followupOf: null };
  appt.roomCode = 'room-' + (1000 + appt.id); /* sequential, guessable — the vulnerability */
  db.appointments.push(appt);
  /* vulnerable: the client-supplied fee is trusted instead of the catalogue fee */
  if (appt.fee !== doc.fee) pass('appt-fee');
  return sendHtml(res, 200, layout('Booked', `<div class="card"><h2>Consultation booked</h2>
<p>With ${esc(doc.name)} at ${esc(appt.slot)}. Fee charged: $${appt.fee}.</p>
<p>Your video session link: <a href="/session/${appt.roomCode}">/session/${appt.roomCode}</a></p>
<p>Appointment details: <a href="/appointments/${appt.id}">/appointments/${appt.id}</a></p></div>`, user));
}

function apptById(id) { return db.appointments.find(a => a.id === id); }

function appointmentPage(user, appt) {
  const patient = userById(appt.patientId), doc = userById(appt.doctorId);
  /* vulnerable: served to anyone logged in — no ownership check (IDOR tests hook here) */
  if (user.id !== appt.patientId && user.id !== appt.doctorId) pass('appt-idor');
  return layout('Appointment', `<div class="card"><h2>Appointment #${appt.id}</h2>
<p>Patient: ${esc(patient ? patient.name : '?')}<br>Doctor: ${esc(doc ? doc.name : '?')}<br>
Slot: ${esc(appt.slot)}<br>Fee: $${appt.fee}<br>Status: ${esc(appt.status)}${appt.followupOf ? `<br>Follow-up of appointment #${appt.followupOf}` : ''}</p>
<p><a href="/session/${appt.roomCode}">Join video session</a> · <a href="/appointments/${appt.id}/notes">Consultation notes</a></p>
<form method="POST" action="/appointments/${appt.id}/followup"><label>Follow-up slot</label>
<input name="slot" value="Next week"> <button>Book follow-up</button></form>
<form method="POST" action="/appointments/${appt.id}/cancel"><button>Cancel appointment</button></form></div>`, user);
}

async function handleFollowup(req, res, user, appt) {
  const b = await readBody(req);
  bumpAttempts(F_APPT);
  const doc = userById(appt.doctorId);
  const fu = { id: db.nextApptId++, patientId: appt.patientId, doctorId: appt.doctorId,
               slot: String(b.slot || 'Next week'), fee: doc ? doc.fee : 0, status: 'booked',
               roomCode: '', followupOf: appt.id };
  fu.roomCode = 'room-' + (1000 + fu.id);
  db.appointments.push(fu);
  /* vulnerable: the follow-up is attached to the ORIGINAL patient with no ownership check */
  if (user.id !== appt.patientId) pass('appt-followup');
  return sendHtml(res, 200, layout('Follow-up', `<div class="card"><h2>Follow-up booked</h2>
<p>Follow-up appointment #${fu.id} created on the record of appointment #${appt.id}.</p></div>`, user));
}

async function handleCancel(req, res, user, appt) {
  await readBody(req);
  bumpAttempts(F_APPT);
  /* vulnerable: any patient can cancel anyone's appointment */
  if (user.role === 'patient' && user.id !== appt.patientId) pass('appt-cancel');
  appt.status = 'cancelled';
  return sendHtml(res, 200, layout('Cancelled', `<div class="card"><h2>Appointment #${appt.id} cancelled.</h2></div>`, user));
}

function sessionPage(user, appt) {
  /* vulnerable: any logged-in user who guesses the sequential room code joins */
  if (user.id !== appt.patientId && user.id !== appt.doctorId) pass('session-join');
  const patient = userById(appt.patientId), doc = userById(appt.doctorId);
  return layout('Video Session', `<div class="card"><h2>Video consultation — ${esc(appt.roomCode)}</h2>
<p>Patient: ${esc(patient ? patient.name : '?')} · Doctor: ${esc(doc ? doc.name : '?')} · Slot: ${esc(appt.slot)}</p>
<div style="background:#14141d;color:#fff;border-radius:8px;padding:38px;text-align:center">[ Simulated video call — training range only ]</div>
<p>You are in the session waiting room. In a real deployment, only the booked patient and doctor may be here.</p></div>`, user);
}

function myPage(user) {
  const mine = db.appointments.filter(a => a.patientId === user.id || a.doctorId === user.id);
  const rows = mine.map(a => `<tr><td>#${a.id}</td><td>${esc((userById(a.doctorId) || {}).name || '')}</td><td>${esc((userById(a.patientId) || {}).name || '')}</td><td>${esc(a.slot)}</td><td>$${a.fee}</td><td>${esc(a.status)}</td><td><a href="/appointments/${a.id}">Open</a></td></tr>`).join('');
  const rxs = db.prescriptions.filter(r => r.patientId === user.id || r.doctorId === user.id);
  const rxRows = rxs.map(r => `<tr><td>#${r.id}</td><td>${esc(r.medication)}</td><td>${esc(r.dosage)}</td><td>${r.refillsLeft}</td><td><a href="/prescriptions/${r.id}">Open</a></td></tr>`).join('');
  return layout('My Consultations', `<h2>My Consultations</h2>
<div class="card"><table><tr><th>ID</th><th>Doctor</th><th>Patient</th><th>Slot</th><th>Fee</th><th>Status</th><th></th></tr>${rows || '<tr><td colspan="7">None yet.</td></tr>'}</table></div>
<h2>My Prescriptions</h2>
<div class="card"><table><tr><th>ID</th><th>Medication</th><th>Dosage</th><th>Refills left</th><th></th></tr>${rxRows || '<tr><td colspan="5">None yet.</td></tr>'}</table></div>`, user);
}

/* ---------------------------------------------------------------------------
   Consultation notes
--------------------------------------------------------------------------- */
function notesPage(user, appt) {
  /* vulnerable: notes served without checking the viewer is the patient or treating doctor */
  if (user.id !== appt.patientId && user.id !== appt.doctorId) pass('notes-idor');
  const list = db.notes.filter(n => n.apptId === appt.id);
  const items = list.map(n => `<div class="card"><p>${esc(n.text)}</p><p style="color:#777">— ${esc((userById(n.authorId) || {}).name || 'Unknown')}</p></div>`).join('');
  return layout('Consultation Notes', `<h2>Notes — appointment #${appt.id}</h2>
${items || '<div class="card">No notes yet.</div>'}
<div class="card"><h3>Add a note (doctors)</h3>
<form method="POST" action="/appointments/${appt.id}/notes">
<textarea name="text" rows="3" placeholder="Clinical note…"></textarea><button>Add note</button></form></div>`, user);
}

async function handleAddNote(req, res, user, appt) {
  const b = await readBody(req);
  bumpAttempts(F_NOTES);
  db.notes.push({ id: db.nextNoteId++, apptId: appt.id, authorId: user.id, text: String(b.text || '') });
  /* vulnerable: the endpoint never checks the author is a doctor */
  if (user.role !== 'doctor') pass('notes-write');
  return redirect(res, `/appointments/${appt.id}/notes`);
}

/* ---------------------------------------------------------------------------
   Prescriptions
--------------------------------------------------------------------------- */
function rxPage(user, rx) {
  /* vulnerable: served without an ownership check */
  if (user.id !== rx.patientId && user.id !== rx.doctorId) pass('rx-idor');
  const patient = userById(rx.patientId);
  return layout('Prescription', `<div class="card"><h2>Prescription #${rx.id}</h2>
<p>Patient: ${esc(patient ? patient.name : '?')}<br>Medication: ${esc(rx.medication)}<br>
Dosage: ${esc(rx.dosage)}<br>Refills left: ${rx.refillsLeft} · Refills used: ${rx.refillsUsed}</p>
<form method="POST" action="/prescriptions/${rx.id}/refill"><button>Request refill</button></form></div>
<div class="card"><h3>Issue a prescription (doctors)</h3>
<form method="POST" action="/prescriptions">
<label>Patient user id</label><input name="patientId" type="number">
<label>Medication</label><input name="medication">
<label>Dosage</label><input name="dosage">
<button>Issue prescription</button></form></div>`, user);
}

async function handleCreateRx(req, res, user) {
  const b = await readBody(req);
  bumpAttempts(F_RX);
  const rx = { id: db.nextRxId++, apptId: null, patientId: parseInt(b.patientId, 10) || user.id,
               doctorId: user.id, medication: String(b.medication || 'Unspecified'), dosage: String(b.dosage || ''),
               refillsLeft: 1, refillsUsed: 0 };
  db.prescriptions.push(rx);
  /* vulnerable: no check that the creator is a doctor, or that any consultation happened */
  if (user.role !== 'doctor') pass('rx-self');
  return redirect(res, `/prescriptions/${rx.id}`);
}

async function handleRefill(req, res, user, rx) {
  await readBody(req);
  bumpAttempts(F_RX);
  /* vulnerable: the refills-left counter is never checked */
  if (rx.refillsLeft <= 0) pass('rx-refill');
  rx.refillsUsed += 1;
  if (rx.refillsLeft > 0) rx.refillsLeft -= 1;
  return sendHtml(res, 200, layout('Refill', `<div class="card"><h2>Refill dispensed</h2>
<p>${esc(rx.medication)} — refills used: ${rx.refillsUsed}, refills left: ${rx.refillsLeft}.</p></div>`, user));
}

/* ---------------------------------------------------------------------------
   Doctor dashboard & admin panel
--------------------------------------------------------------------------- */
function doctorPage(req, user) {
  /* vulnerable: the role is read from the client-supplied hx_role cookie */
  const role = effectiveRole(req, user);
  if (role !== 'doctor' && role !== 'admin') return null;
  if (user.role !== 'doctor' && user.role !== 'admin') pass('auth-cookie');
  const mine = db.appointments.filter(a => a.doctorId === user.id);
  const rows = mine.map(a => `<tr><td>#${a.id}</td><td>${esc((userById(a.patientId) || {}).name || '')}</td><td>${esc(a.slot)}</td><td>${esc(a.status)}</td></tr>`).join('');
  return layout('Doctor Dashboard', `<h2>Doctor Dashboard</h2>
<div class="card"><p>Your consultations:</p><table><tr><th>ID</th><th>Patient</th><th>Slot</th><th>Status</th></tr>${rows || '<tr><td colspan="4">None.</td></tr>'}</table></div>`, user);
}

function adminPage(user) {
  /* vulnerable: any logged-in user reaches the admin console (broken access control) */
  if (user.role !== 'admin') pass('admin-bac');
  const rows = db.users.map(u => `<tr><td>${u.id}</td><td>${u.name}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td>${esc(u.password)}</td></tr>`).join('');
  return layout('Admin Panel', `<h2>Admin Panel — all accounts</h2>
<div class="card"><table><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Password</th></tr>${rows}</table></div>`, user);
}

/* ---------------------------------------------------------------------------
   Mission Board (/tests), completion page, certificate
--------------------------------------------------------------------------- */
function testsPage(user) {
  const p = progressData();
  let html = `<h2>Mission Board — LAB ${LAB_NUMBER} ${LAB_NAME}</h2>
<p>${p.done}/${p.total} tests complete (${p.pct}%). Hints unlock one at a time. The Lab Coach gives step-by-step help for a feature after you have genuinely tried that feature at least 3 times.</p>`;
  for (const f of FEATURES) {
    const ft = TESTS.filter(t => t.feature === f);
    html += `<div class="card"><h3>${esc(f)} <small>(${ft.filter(t => state.tests[t.id]).length}/${ft.length} · attempts: ${state.attempts[f] || 0})</small></h3>`;
    for (const t of ft) {
      const done = state.tests[t.id];
      html += `<div style="border-top:1px solid #eee;padding:8px 0"><strong>${done ? '✓' : '○'} ${esc(t.name)}</strong>
 <small>${esc(t.owasp)} · ${esc(t.difficulty)}</small>
 <details><summary>Hints</summary><ol><li>${esc(t.hints[0])}</li><li>${esc(t.hints[1])}</li><li>${esc(t.hints[2])}</li></ol></details></div>`;
    }
    html += '</div>';
  }
  return layout('Mission Board', html, user);
}

function completePage(user) {
  const p = progressData();
  if (!p.complete) {
    const left = TESTS.filter(t => !state.tests[t.id]).map(t => `<li>${esc(t.name)} <small>(${esc(t.feature)})</small></li>`).join('');
    return layout('Completion', `<h2>Not complete yet</h2><div class="card"><p>Progress: ${p.done}/${p.total} (${p.pct}%).</p><p>Still to solve:</p><ul>${left}</ul></div>`, user);
  }
  const feats = FEATURES.map((f, i) => `<li><strong>${esc(f)}</strong> — ${TESTS.filter(t => t.feature === f).length} vulnerabilities</li>`).join('');
  const ways = TESTS.map(t => `<li>${esc(t.name)}</li>`).join('');
  const learned = TESTS.map(t => `<li><strong>${esc(t.name)}:</strong> ${esc(t.lesson)}</li>`).join('');
  const client = TESTS.map(t => `<li><strong>${esc(t.name)}:</strong> ${esc(t.impact)}</li>`).join('');
  const reports = TESTS.map(t => `<li><strong>${esc(t.report.title)}</strong> — Severity: ${esc(t.report.severity)}<br>Remediation: ${esc(t.report.remediation)}</li>`).join('');
  const key = _completionSecret();
  return layout('Lab Complete', `<h2>🎉 LAB ${LAB_NUMBER} — ${LAB_NAME} complete!</h2>
<div class="card"><h3>1) Features in this lab (${FEATURES.length})</h3><ul>${feats}</ul></div>
<div class="card"><h3>2) Ways testing was done (${TESTS.length} tests)</h3><ul>${ways}</ul></div>
<div class="card"><h3>3) What you learned</h3><ul>${learned}</ul></div>
<div class="card"><h3>4) What this means for a real client</h3><ul>${client}</ul></div>
<div class="card"><h3>5) Writing it in a real report</h3><ul>${reports}</ul></div>
<div class="card"><h3>6) Your completion key for Lab ${LAB_NUMBER + 1}</h3>
<p style="font-size:20px"><code>${esc(key)}</code></p>
<p>Paste this key at the start of Lab ${LAB_NUMBER + 1} to unlock it.</p>
<form method="POST" action="/tester"><label>Your name for the certificate</label>
<input name="name" value="${esc(state.testerName || (user ? user.name : ''))}"><button>Save name</button></form>
<p><a href="/certificate">View your certificate →</a></p></div>`, user);
}

function certificatePage(user) {
  if (!isComplete()) return null;
  const name = state.testerName || (user ? user.name : 'Tester');
  const date = state.completedAt ? new Date(state.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER}</title>
<style>body{font-family:Georgia,serif;background:#eef;text-align:center;padding:40px}
.card{max-width:720px;margin:auto;background:#fff;border:3px solid #3a7bd5;border-radius:14px;padding:44px}
@media print{body{background:#fff}}</style></head><body>
<div class="card"><img src="/logo.png" style="height:70px">
<h1>Certificate of Completion</h1>
<p>This certifies that</p><h2>${esc(name)}</h2>
<p>has completed 100% of the security tests in</p>
<h3>LAB ${LAB_NUMBER} — ${LAB_NAME} (${TESTS.length} tests across ${FEATURES.length} features)</h3>
<p>${esc(date)}</p>
<p style="margin-top:28px;color:#555">HexaCyberLab — Built by Md. Jony Hassain, Founder</p></div>
</body></html>`;
}

/* ---------------------------------------------------------------------------
   Lab Coach chatbot (POST /api/chat)
--------------------------------------------------------------------------- */
const FEATURE_KEYS = [
  [F_AUTH, ['login', 'password', 'brute', 'reset token', 'enumerat', 'cookie', 'sign in', 'auth']],
  [F_REG, ['register', 'registration', 'profile', 'sign up', 'mass assignment', 'weak password']],
  [F_DOC, ['doctor', 'availab', 'search doctor', 'specialty']],
  [F_APPT, ['appointment', 'book', 'session', 'room', 'follow-up', 'follow up', 'cancel', 'fee']],
  [F_NOTES, ['note', 'consultation note']],
  [F_RX, ['prescription', 'refill', 'medication', 'prescribe']],
  [F_ADMIN, ['admin']],
  [F_API, ['api', 'token', 'debug']]
];
function matchFeature(msg) {
  for (const [f, keys] of FEATURE_KEYS) if (keys.some(k => msg.includes(k))) return f;
  return null;
}
function coachReply(rawMsg) {
  const msg = String(rawMsg || '').toLowerCase();
  const p = progressData();
  if (/who (built|made|created)|founder|behind (this|the labs)/.test(msg)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (/(completion|next lab|unlock|the) key|key please|give me the key/.test(msg)) {
    if (isComplete()) return 'You completed LAB ' + LAB_NUMBER + '! Your completion key for the next lab is: ' + _completionSecret() + ' — paste it at the start of Lab ' + (LAB_NUMBER + 1) + '.';
    return 'I don\'t have the completion key yet — I only receive it when this lab is 100% complete. You are at ' + p.pct + '% (' + p.done + '/' + p.total + ' tests). Finish every test and ask me again.';
  }
  const feature = matchFeature(msg);
  if (/how many|list the tests|which tests/.test(msg)) {
    if (feature) {
      const ft = TESTS.filter(t => t.feature === feature);
      return feature + ' has ' + ft.length + ' tests: ' + ft.map(t => t.name).join('; ') + '.';
    }
    return LAB_NAME + ' has ' + FEATURES.length + ' features and ' + TESTS.length + ' tests: ' + FEATURES.map(f => f + ' (' + TESTS.filter(t => t.feature === f).length + ')').join(', ') + '. See the Mission Board at /tests.';
  }
  const howTo = /how|solve|exploit|bypass|guide|step|help me|do the|attack/.test(msg);
  if (howTo && feature) {
    const ft = TESTS.filter(t => t.feature === feature);
    const open = ft.filter(t => !state.tests[t.id]);
    const attempts = state.attempts[feature] || 0;
    if (!open.length) return 'You have already completed every test in ' + feature + '. Well done!';
    if (attempts >= 3) {
      const steps = open.map(t => '• ' + t.name + ' — step by step: ' + t.hints[2]).join('\n');
      return 'You have earned guidance for ' + feature + ' (' + attempts + ' attempts). Still open:\n' + steps;
    }
    return 'That feature is locked for help. First try the ' + feature + ' tests yourself at least 3 times — I can see you\'ve tried ' + attempts + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  if (/features|vulnerabilit/.test(msg)) {
    return LAB_NAME + ' has ' + FEATURES.length + ' features and ' + TESTS.length + ' tests: ' + FEATURES.map(f => f + ' (' + TESTS.filter(t => t.feature === f).length + ')').join(', ') + '. See the Mission Board at /tests.';
  }
  if (/progress|status|how am i|score/.test(msg)) {
    const next = TESTS.find(t => !state.tests[t.id]);
    return 'You are at ' + p.pct + '% — ' + p.done + ' of ' + p.total + ' tests done.' + (next ? ' Next open test: "' + next.name + '" in ' + next.feature + '.' : ' The lab is complete!');
  }
  if (/hello|hi|hey/.test(msg)) {
    return 'Hello! I am the Lab Coach for LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '. This lab has ' + TESTS.length + ' tests across ' + FEATURES.length + ' features. You are at ' + p.pct + '%. Ask me how many tests a feature has, or — after 3 genuine attempts on a feature — ask me how to solve one.';
  }
  return 'I can help with this lab\'s map: ask me how many tests each feature has, your progress, or (after 3 genuine attempts on a feature) how to solve a test. The Mission Board at /tests shows every test and its hints.';
}

/* ---------------------------------------------------------------------------
   Router
--------------------------------------------------------------------------- */
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://' + HOST + ':' + PORT);
    const p = u.pathname;
    const method = req.method;

    if (p === '/logo.png') {
      if (fs.existsSync(LOGO_FILE)) {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        return res.end(fs.readFileSync(LOGO_FILE));
      }
      res.writeHead(404); return res.end('no logo');
    }
    if (p === '/api/progress' && method === 'GET') return sendJson(res, 200, progressData());
    if (p === '/api/chat' && method === 'POST') {
      const b = await readBody(req);
      if (b.__malformed) return sendJson(res, 200, { reply: 'I could not read that message — please try again.' });
      return sendJson(res, 200, { reply: coachReply(b.message) });
    }
    if (p === '/api/debug' && method === 'GET') {
      bumpAttempts(F_API);
      pass('api-debug'); /* leftover debug endpoint: dumps every account, passwords included */
      return sendJson(res, 200, { users: db.users.map(x => ({ id: x.id, name: x.name, email: x.email, password: x.password, role: x.role, apiToken: x.apiToken })) });
    }
    if (p === '/api/appointments' && method === 'GET') {
      bumpAttempts(F_API);
      const auth = String(req.headers.authorization || '');
      const token = auth.replace(/^Bearer\s+/i, '');
      let apiUser = db.users.find(x => x.apiToken === token);
      if (!apiUser && token) {
        /* vulnerable: base64(email) is accepted as a credential */
        try {
          const decoded = Buffer.from(token, 'base64').toString('utf8').toLowerCase();
          const victim = userByEmail(decoded);
          if (victim) { apiUser = victim; pass('api-token'); }
        } catch (e) { /* not base64 — ignore */ }
      }
      if (!apiUser) return sendJson(res, 401, { error: 'invalid token' });
      return sendJson(res, 200, { appointments: db.appointments.filter(a => a.patientId === apiUser.id || a.doctorId === apiUser.id) });
    }

    if (p === '/unlock' && method === 'POST') {
      const b = await readBody(req);
      const expected = _entrySecret();
      const given = String(b.key || '');
      /* constant-shape comparison; no hint about which part is wrong */
      let diff = given.length ^ expected.length;
      for (let i = 0; i < Math.max(given.length, expected.length); i++) {
        diff |= (given.charCodeAt(i) || 0) ^ (expected.charCodeAt(i) || 0);
      }
      if (diff === 0) {
        state.unlocked = true; saveState();
        return redirect(res, '/');
      }
      res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(gatePage().replace('</h2>', '</h2><p style="color:#c00">That key was not accepted.</p>'));
    }

    /* ---- lock gate: everything below needs the lab unlocked ---- */
    if (!state.unlocked) return sendHtml(res, 200, gatePage());

    const user = currentUser(req);
    const needLogin = () => redirect(res, '/login');

    if (p === '/' && method === 'GET') return sendHtml(res, 200, user ? homePage(user) : loginPage(''));
    if (p === '/login' && method === 'GET') return sendHtml(res, 200, loginPage(''));
    if (p === '/login' && method === 'POST') return handleLogin(req, res);
    if (p === '/register' && method === 'GET') return sendHtml(res, 200, registerPage(''));
    if (p === '/register' && method === 'POST') return handleRegister(req, res);
    if (p === '/forgot' && method === 'GET') return sendHtml(res, 200, forgotPage(''));
    if (p === '/forgot' && method === 'POST') return handleForgot(req, res);
    if (p === '/reset' && method === 'GET') return sendHtml(res, 200, resetPage(''));
    if (p === '/reset' && method === 'POST') return handleReset(req, res);
    if (p === '/logout' && method === 'GET') {
      const sid = parseCookies(req).hx_session;
      if (sid) sessions.delete(sid);
      res.writeHead(302, { Location: '/login', 'Set-Cookie': ['hx_session=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0'] });
      return res.end();
    }

    if (!user) return needLogin();

    if (p === '/profile' && method === 'GET') return sendHtml(res, 200, profilePage(user, ''));
    if (p === '/profile' && method === 'POST') return handleProfile(req, res, user);
    if (p === '/doctors' && method === 'GET') {
      const q = u.searchParams.get('q') || '';
      if (q) bumpAttempts(F_DOC);
      return sendHtml(res, 200, doctorsPage(user, q));
    }
    let m;
    if ((m = p.match(/^\/doctors\/(\d+)\/availability$/)) && method === 'POST') return handleAvailability(req, res, user, parseInt(m[1], 10));
    if (p === '/book' && method === 'POST') return handleBook(req, res, user);
    if (p === '/my' && method === 'GET') return sendHtml(res, 200, myPage(user));
    if (p === '/doctor' && method === 'GET') {
      const page = doctorPage(req, user);
      if (!page) return sendHtml(res, 403, layout('Forbidden', '<div class="card"><h2>Doctors only.</h2></div>', user));
      return sendHtml(res, 200, page);
    }
    if (p === '/admin' && method === 'GET') { bumpAttempts(F_ADMIN); return sendHtml(res, 200, adminPage(user)); }
    if ((m = p.match(/^\/appointments\/(\d+)$/)) && method === 'GET') {
      const appt = apptById(parseInt(m[1], 10));
      if (!appt) return sendHtml(res, 404, layout('Not found', '<h2>Appointment not found.</h2>', user));
      bumpAttempts(F_APPT);
      return sendHtml(res, 200, appointmentPage(user, appt));
    }
    if ((m = p.match(/^\/appointments\/(\d+)\/followup$/)) && method === 'POST') {
      const appt = apptById(parseInt(m[1], 10));
      if (!appt) return sendHtml(res, 404, layout('Not found', '<h2>Appointment not found.</h2>', user));
      return handleFollowup(req, res, user, appt);
    }
    if ((m = p.match(/^\/appointments\/(\d+)\/cancel$/)) && method === 'POST') {
      const appt = apptById(parseInt(m[1], 10));
      if (!appt) return sendHtml(res, 404, layout('Not found', '<h2>Appointment not found.</h2>', user));
      return handleCancel(req, res, user, appt);
    }
    if ((m = p.match(/^\/appointments\/(\d+)\/notes$/)) && method === 'GET') {
      const appt = apptById(parseInt(m[1], 10));
      if (!appt) return sendHtml(res, 404, layout('Not found', '<h2>Appointment not found.</h2>', user));
      bumpAttempts(F_NOTES);
      return sendHtml(res, 200, notesPage(user, appt));
    }
    if ((m = p.match(/^\/appointments\/(\d+)\/notes$/)) && method === 'POST') {
      const appt = apptById(parseInt(m[1], 10));
      if (!appt) return sendHtml(res, 404, layout('Not found', '<h2>Appointment not found.</h2>', user));
      return handleAddNote(req, res, user, appt);
    }
    if ((m = p.match(/^\/session\/([A-Za-z0-9-]+)$/)) && method === 'GET') {
      const appt = db.appointments.find(a => a.roomCode === m[1]);
      if (!appt) return sendHtml(res, 404, layout('Not found', '<h2>Session not found.</h2>', user));
      bumpAttempts(F_APPT);
      return sendHtml(res, 200, sessionPage(user, appt));
    }
    if (p === '/prescriptions' && method === 'POST') return handleCreateRx(req, res, user);
    if ((m = p.match(/^\/prescriptions\/(\d+)$/)) && method === 'GET') {
      const rx = db.prescriptions.find(r => r.id === parseInt(m[1], 10));
      if (!rx) return sendHtml(res, 404, layout('Not found', '<h2>Prescription not found.</h2>', user));
      bumpAttempts(F_RX);
      return sendHtml(res, 200, rxPage(user, rx));
    }
    if ((m = p.match(/^\/prescriptions\/(\d+)\/refill$/)) && method === 'POST') {
      const rx = db.prescriptions.find(r => r.id === parseInt(m[1], 10));
      if (!rx) return sendHtml(res, 404, layout('Not found', '<h2>Prescription not found.</h2>', user));
      return handleRefill(req, res, user, rx);
    }
    if (p === '/tests' && method === 'GET') return sendHtml(res, 200, testsPage(user));
    if (p === '/complete' && method === 'GET') return sendHtml(res, 200, completePage(user));
    if (p === '/tester' && method === 'POST') {
      const b = await readBody(req);
      state.testerName = String(b.name || '').slice(0, 80);
      saveState();
      return redirect(res, '/complete');
    }
    if (p === '/certificate' && method === 'GET') {
      const cert = certificatePage(user);
      if (!cert) return redirect(res, '/complete');
      return sendHtml(res, 200, cert);
    }

    return sendHtml(res, 404, layout('Not found', '<h2>404 — page not found.</h2>', user));
  } catch (err) {
    try { sendHtml(res, 500, '<h1>Something went wrong</h1><p>The training server stayed up — please retry.</p>'); } catch (e) { /* socket gone */ }
  }
});

loadState();
if (require.main === module) {
  server.listen(PORT, HOST, () => console.log(LAB_NAME + ' (LAB ' + LAB_NUMBER + ') listening on http://' + HOST + ':' + PORT));
}
module.exports = { TESTS, FEATURES };
