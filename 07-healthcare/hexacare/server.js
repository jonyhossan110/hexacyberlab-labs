'use strict';
/*
 * HexaCare — LAB 62 of the HexaCyberLab 110-lab programme.
 * A deliberately vulnerable patient portal for hands-on security practice.
 * LOCAL USE ONLY. Zero-dependency Node.js. All people and data are fake.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3071;
const HOST = '127.0.0.1';
const LAB_NUMBER = 62;
const LAB_NAME = 'HexaCare';
const PREV_LAB = 61;
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const LOGO_FILE = path.join(DIR, 'logo.png');

/* ------------------------------------------------------------------ */
/* Entry-key shards (region 1 of 2). Pieces are base64-of-reversed     */
/* fragments; the assembler below rebuilds a key only at verify time.  */
/* ------------------------------------------------------------------ */


function assembleKey(shards) {
  return shards
    .map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join(''))
    .join('');
}

/* ------------------------------------------------------------------ */
/* Progress state (persisted to progress.json)                         */
/* ------------------------------------------------------------------ */
let state = {
  unlocked: false,
  testerName: '',
  tests: {},
  attempts: {},
  completedAt: null,
  keyRevealed: false
};
function loadState() {
  try {
    const raw = fs.readFileSync(PROGRESS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      state = Object.assign(state, parsed);
    }
  } catch (e) { /* fresh state */ }
}
function saveState() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2)); } catch (e) {}
}
loadState();

/* ------------------------------------------------------------------ */
/* TESTS registry — the heart of the lab system. One entry per scored  */
/* vulnerability test. Docs are generated from this array.             */
/* ------------------------------------------------------------------ */
const TESTS = [
  /* ---------------- Login & Authentication ---------------- */
  {
    id: 'auth-sqli', feature: 'Login & Authentication',
    name: 'SQL Injection Login Bypass', owasp: 'A03:2021 – Injection', difficulty: 'Intermediate',
    hints: [
      'The login check builds its database query by gluing your email straight into the query text.',
      'A classic tautology in the email field makes the WHERE clause true for every row.',
      "Use the email admin@hexacare.local' OR '1'='1 with any password — the query matches the first account, the admin."
    ],
    lesson: 'String-built queries let an attacker rewrite the login logic itself; parameterised queries keep data and code separate.',
    impact: 'On a real clinic portal this hands an attacker an admin session with no password at all — every patient record behind it is exposed.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements for all database access and reject unexpected input.' }
  },
  {
    id: 'auth-brute', feature: 'Login & Authentication',
    name: 'No Brute-Force Protection on Login', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    hints: [
      'Nothing slows you down when a password guess fails — no lockout, no delay, no CAPTCHA.',
      'Pick one real account and keep guessing wrong passwords; count the failures.',
      'Submit 10 or more wrong passwords for alice@test.local back to back — every attempt is processed at full speed.'
    ],
    lesson: 'Without throttling or lockout, online password guessing is only a matter of time and a wordlist.',
    impact: 'Patient accounts fall to credential stuffing and dictionary attacks, exposing private health information and messages.',
    report: { title: 'Missing Brute-Force Protection on Authentication Endpoint', severity: 'High', remediation: 'Add progressive rate limiting, account lockout and alerting on repeated failed logins.' }
  },
  {
    id: 'auth-enum', feature: 'Login & Authentication',
    name: 'User Enumeration via Password Reset', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    hints: [
      'Compare the forgot-password answer for a real email with the answer for an invented one.',
      'The two responses are worded differently — one of them confirms the account exists.',
      'Probe at least 5 different emails on /forgot and note which ones say a reset link was sent.'
    ],
    lesson: 'Different responses for existing and non-existing accounts let attackers build a verified target list for phishing and password attacks.',
    impact: 'Attackers learn exactly which patients use the portal — a ready-made, targeted phishing list against a healthcare provider.',
    report: { title: 'Account Enumeration Through Password-Reset Responses', severity: 'Medium', remediation: 'Return one identical, generic response whether or not the account exists.' }
  },
  {
    id: 'auth-default', feature: 'Login & Authentication',
    name: 'Published Demo Credentials Grant Real Access', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    hints: [
      'The login page itself tells you a working username and password.',
      'Look at the demo box printed under the login form.',
      'Sign in with demo@hexacare.local / Demo1234 — it is a real account with full patient-portal access.'
    ],
    lesson: 'Demo and default accounts left active in production are simply open doors with a sign on them.',
    impact: 'Anyone on the internet can walk into the portal with the published demo login and explore a real patient account.',
    report: { title: 'Active Demo Account With Publicly Displayed Credentials', severity: 'High', remediation: 'Remove demo/default accounts from production or force a unique password at first use.' }
  },
  {
    id: 'auth-reset', feature: 'Login & Authentication',
    name: 'Predictable Password-Reset Token', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: [
      'Reset tokens here are not random — they are computed from something you can see.',
      'Your numeric user id shows up in portal URLs such as /careplan/<id>.',
      'The token is HC-<id>-<id×137+42>. Compute it for another account and reset its password from the /forgot page without ever seeing an email.'
    ],
    lesson: 'Password-reset tokens must be long, random and single-use; a formula anyone can compute is equivalent to no token at all.',
    impact: 'Any patient account — or a doctor account — can be taken over in seconds by anyone who knows the formula.',
    report: { title: 'Password-Reset Tokens Are Predictable', severity: 'Critical', remediation: 'Generate reset tokens with a CSPRNG, store only a hash, expire them quickly and make them single-use.' }
  },
  {
    id: 'auth-cookie', feature: 'Login & Authentication',
    name: 'Role Cookie Tampering Opens the Clinician Console', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: [
      'After login the app stores your role in a cookie — and one console trusts that cookie.',
      'Cookies live in your browser, so you can edit them freely.',
      'Set the hx_role cookie to doctor and open /clinician — the console never compares it with your real account role.'
    ],
    lesson: 'Authorisation decisions must be made from server-side session data, never from values the client can edit.',
    impact: 'A patient becomes a "doctor" by editing one cookie and sees every patient on the clinician console.',
    report: { title: 'Client-Side Role Cookie Trusted for Authorisation', severity: 'High', remediation: 'Derive roles only from the server-side session; ignore role values supplied by the client.' }
  },

  /* ---------------- Registration & Profile ---------------- */
  {
    id: 'reg-weakpw', feature: 'Registration & Profile',
    name: 'Weak Password Policy at Registration', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    hints: [
      'How short can a new password be before the form complains?',
      'Try registering with a one-character password.',
      "Register a new account with the password 'x' — it is accepted without any warning."
    ],
    lesson: 'A password policy that accepts anything invites accounts that can be guessed in a handful of tries.',
    impact: 'Patients protect sensitive health data with passwords like "x", making account takeover trivial.',
    report: { title: 'No Minimum Password Strength Enforced at Registration', severity: 'Medium', remediation: 'Enforce a minimum length and check new passwords against known-breached password lists.' }
  },
  {
    id: 'reg-massassign', feature: 'Registration & Profile',
    name: 'Mass Assignment — Self-Assigned Doctor Role', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: [
      'The registration form only shows name, email and password — but the handler reads more fields than that.',
      'Add a field the form never displayed and see if the server uses it.',
      'POST /register with an extra field role=doctor — the new account is created with the doctor role.'
    ],
    lesson: 'Binding request fields directly onto an account object lets clients set fields that were never offered to them, like role.',
    impact: 'Anyone can register themselves as a doctor and immediately access clinical functions and patient data.',
    report: { title: 'Mass Assignment Allows Role Escalation at Registration', severity: 'Critical', remediation: 'Whitelist exactly the fields a registration may set; assign roles only through admin workflows.' }
  },
  {
    id: 'reg-xss', feature: 'Registration & Profile',
    name: 'Stored XSS in Display Name', owasp: 'A03:2021 – Injection', difficulty: 'Beginner',
    hints: [
      'Your display name is printed back on pages that staff and other users read — without escaping.',
      'Put markup, not plain text, into your name.',
      'Set your display name on /profile to <script>alert(1)</script> — it is stored and rendered raw in staff-facing lists.'
    ],
    lesson: 'Any user-controlled text that is rendered unescaped becomes stored XSS — and staff browsers are the high-value target.',
    impact: 'An attacker plants a script in their name that runs in a doctor\u2019s or admin\u2019s browser, hijacking their session.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Escape all user-controlled output by default and sanitise any rich text.' }
  },
  {
    id: 'reg-csrf', feature: 'Registration & Profile',
    name: 'CSRF on Profile Update', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: [
      'Profile updates never verify where the request actually came from.',
      'The app marks its own pages with an hx_origin cookie — the profile handler never checks for it.',
      'POST /profile from a context with a foreign Origin and no hx_origin marker — the change is accepted anyway.'
    ],
    lesson: 'State-changing requests need an unforgeable proof of intent — a CSRF token or strict same-site checks.',
    impact: 'A malicious page a patient visits can silently rewrite their profile while they are logged in.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require a per-session CSRF token on all state-changing requests and validate Origin/Referer.' }
  },

  /* ---------------- Visits & Clinical Notes ---------------- */
  {
    id: 'visit-idor', feature: 'Visits & Clinical Notes',
    name: 'Visit Record IDOR', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: [
      'Visit pages are numbered — /visits/1, /visits/2, and so on.',
      'Nothing checks that the visit you open belongs to you.',
      'While signed in as Alice, open /visits/3 — it is Bob\u2019s visit, complete with his diagnosis notes.'
    ],
    lesson: 'Sequential ids plus a missing ownership check turn every record in the system into public reading.',
    impact: 'Every patient\u2019s visit history and diagnoses can be read by any other patient — a serious medical-privacy breach.',
    report: { title: 'Insecure Direct Object Reference on Visit Records', severity: 'High', remediation: 'Check object ownership (or a care relationship) on every record access, server-side.' }
  },
  {
    id: 'visit-note', feature: 'Visits & Clinical Notes',
    name: 'Patient Can Edit Clinician Visit Notes', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: [
      'The clinical note under a visit is meant to be written by clinicians only.',
      'The form is hidden from patients — but the endpoint behind it answers to anyone.',
      'As a patient, POST /visits/<id>/note with your own text — the clinical note is overwritten.'
    ],
    lesson: 'Hiding a control in the UI is not authorisation; the server must check the role on every privileged action.',
    impact: 'A patient can falsify their own medical record — changing what a doctor wrote is a patient-safety issue, not just a data issue.',
    report: { title: 'Missing Role Check Allows Patients to Modify Clinical Notes', severity: 'High', remediation: 'Enforce clinician-only authorisation on note editing and keep an audit trail of changes.' }
  },
  {
    id: 'visit-delete', feature: 'Visits & Clinical Notes',
    name: 'Patient Can Delete Visit Records', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: [
      'Medical records should be effectively immutable — this app ships a delete endpoint.',
      'It is only linked from the staff view, but it responds to any signed-in user.',
      'As a patient, POST /visits/<id>/delete — the visit record is deleted.'
    ],
    lesson: 'Destructive endpoints need the strictest authorisation checks; a delete that trusts the caller destroys evidence and history.',
    impact: 'Patients can erase visits from their record, breaking continuity of care and destroying the audit trail.',
    report: { title: 'Unauthorised Deletion of Medical Visit Records', severity: 'High', remediation: 'Restrict deletion to administrators, prefer soft-delete with retention, and log every deletion.' }
  },

  /* ---------------- Care Plans & Medications ---------------- */
  {
    id: 'careplan-idor', feature: 'Care Plans & Medications',
    name: 'Care Plan IDOR', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: [
      'Care plans live at /careplan/<userId> — the id in the URL is the patient\u2019s.',
      'Try a neighbouring patient\u2019s id.',
      'Open /careplan/5 while signed in as Alice (id 4) — Bob\u2019s full care plan is displayed.'
    ],
    lesson: 'If the URL names the owner, the server must prove the requester is that owner (or their clinician) on every request.',
    impact: 'Treatment goals and instructions for every patient are readable by every other patient.',
    report: { title: 'Insecure Direct Object Reference on Care Plans', severity: 'High', remediation: 'Authorise care-plan access by ownership or an active care relationship.' }
  },
  {
    id: 'careplan-edit', feature: 'Care Plans & Medications',
    name: 'Patient Edits Own Care Plan (Clinician-Only Function)', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: [
      'Goals and instructions in a care plan are supposed to be written by the care team.',
      'The edit endpoint trusts that you are signed in — it never asks what your role is.',
      'As a patient, POST /careplan/edit with new goals — your plan is rewritten with no clinician involved.'
    ],
    lesson: 'Read/write role separation matters inside a feature, not just between pages: viewing your plan is fine, authoring it is not.',
    impact: 'Patients can rewrite their own treatment plan, and later clinicians may act on instructions no clinician ever gave.',
    report: { title: 'Patients Can Modify Clinician-Authored Care Plans', severity: 'High', remediation: 'Restrict care-plan writes to clinician roles and version every change.' }
  },
  {
    id: 'med-selfadd', feature: 'Care Plans & Medications',
    name: 'Patient Adds Own Medication (Clinician-Only Function)', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: [
      'A medication list is a prescription record — in theory only doctors add to it.',
      'The add-medication endpoint never checks the caller\u2019s role.',
      'As a patient, POST /medications/add with any drug and dose — it appears on your official medication list.'
    ],
    lesson: 'Every privileged write needs a server-side role check; the form\u2019s absence from the patient UI changes nothing.',
    impact: 'A patient can put unprescribed medication on their official list, misleading every clinician who treats them.',
    report: { title: 'Patients Can Add Entries to Their Prescribed Medication List', severity: 'High', remediation: 'Allow medication changes only for clinician roles, with prescriber attribution.' }
  },

  /* ---------------- Lab Results ---------------- */
  {
    id: 'lab-idor', feature: 'Lab Results',
    name: 'Lab Result IDOR', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: [
      'Result pages are numbered like everything else in this portal.',
      'Ownership is never checked before a result is shown.',
      'As Alice, open /results/3 — Bob\u2019s HbA1c result is displayed in full.'
    ],
    lesson: 'Laboratory results are among the most sensitive records a portal holds; they need the same ownership checks as everything else.',
    impact: 'Any patient can read any other patient\u2019s test values — diagnoses included.',
    report: { title: 'Insecure Direct Object Reference on Laboratory Results', severity: 'Critical', remediation: 'Enforce per-record ownership checks on all result views and downloads.' }
  },
  {
    id: 'lab-unreleased', feature: 'Lab Results',
    name: 'Unreleased Result Exposed via API Before Clinician Review', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: [
      'The results page politely hides results that are still "pending clinician review".',
      'The JSON API behind the portal does not hide anything at all.',
      'GET /api/results/2 while signed in as Alice returns her pending-review thyroid result in full, values included.'
    ],
    lesson: 'Release/review workflow rules must be enforced in the data layer and every API — not just by hiding things in one UI.',
    impact: 'Patients see alarming raw values with no clinical context or counselling, exactly what the review step exists to prevent.',
    report: { title: 'Unreviewed Lab Results Accessible Through API', severity: 'High', remediation: 'Apply the release flag in the API layer; unreleased results go to clinicians only.' }
  },

  /* ---------------- Messaging ---------------- */
  {
    id: 'msg-idor', feature: 'Messaging',
    name: 'Message Thread IDOR', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: [
      'Threads are numbered, and the participant check is missing.',
      'Open a thread id that was never listed for you.',
      'As Alice, open /messages/2 — the private thread between Bob and his doctor.'
    ],
    lesson: 'Private conversations need participant checks on every read, not just an unlisted URL.',
    impact: 'Private patient–doctor conversations — symptoms, fears, family details — are readable by any patient.',
    report: { title: 'Insecure Direct Object Reference on Message Threads', severity: 'High', remediation: 'Verify the requester is a thread participant before returning any message.' }
  },
  {
    id: 'msg-impersonate', feature: 'Messaging',
    name: 'Message Sender Impersonation', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Advanced',
    hints: [
      'The send form carries a hidden senderId field — and the server believes whatever it says.',
      'You can decide who a message claims to be from.',
      'In your own thread, POST a message with senderId set to the doctor\u2019s id (2) — it appears in the thread as written by the doctor.'
    ],
    lesson: 'The sender of a message must come from the authenticated session, never from a request field.',
    impact: 'A patient can forge "doctor" messages — fake medical advice inside a trusted clinical channel.',
    report: { title: 'Message Sender Identity Taken From Client Input', severity: 'Critical', remediation: 'Set the sender from the server-side session; ignore any client-supplied sender field.' }
  },
  {
    id: 'msg-xss', feature: 'Messaging',
    name: 'Stored XSS in Message Body', owasp: 'A03:2021 – Injection', difficulty: 'Intermediate',
    hints: [
      'Message bodies are printed into the thread page exactly as stored.',
      'Send markup as a message and view the thread again.',
      'Send <img src=x onerror=alert(1)> as a message — it is stored and executes for every participant who opens the thread.'
    ],
    lesson: 'Chat and messaging surfaces are classic stored-XSS carriers because the victim is guaranteed to open them.',
    impact: 'A script planted in a thread runs in the doctor\u2019s browser when they read the message — session theft inside the care channel.',
    report: { title: 'Stored Cross-Site Scripting in Secure Messaging', severity: 'High', remediation: 'Escape message content on render and apply a strict content-security policy.' }
  },

  /* ---------------- Appointments ---------------- */
  {
    id: 'appt-bookother', feature: 'Appointments',
    name: 'Book an Appointment for Another Patient', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: [
      'The booking form decides whose appointment it is from a patientId field.',
      'Book while naming somebody else as the patient.',
      'POST /appointments with patientId=5 — the appointment is created on Bob\u2019s account, not yours.'
    ],
    lesson: 'The subject of a created record must be derived from the session or explicitly authorised — never trusted from the request.',
    impact: 'Attackers fill other patients\u2019 schedules with fake appointments and disrupt a clinic\u2019s day.',
    report: { title: 'Appointment Booking Trusts Client-Supplied Patient Identity', severity: 'Medium', remediation: 'Book appointments for the session user only; staff booking for others requires a staff role.' }
  },
  {
    id: 'appt-cancel', feature: 'Appointments',
    name: 'Cancel Another Patient\u2019s Appointment', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: [
      'Cancelling is just a POST with an appointment id.',
      'Nobody checks that the appointment belongs to the caller.',
      'POST /appointments/2/cancel while signed in as Alice — Bob\u2019s appointment is cancelled.'
    ],
    lesson: 'Every object action — view, edit, cancel, delete — needs its own ownership check; one missing check is a full break.',
    impact: 'Patients can sabotage each other\u2019s care by cancelling real appointments with specialists.',
    report: { title: 'Missing Ownership Check on Appointment Cancellation', severity: 'Medium', remediation: 'Authorise cancellation by appointment ownership or staff role.' }
  },

  /* ---------------- Admin Panel ---------------- */
  {
    id: 'admin-bac', feature: 'Admin Panel',
    name: 'Admin Panel Broken Access Control', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: [
      'Try the obvious address directly: /admin.',
      'The panel checks that you are logged in — and nothing more.',
      'Open /admin as a patient: the full admin panel, including the user list with passwords, is served.'
    ],
    lesson: '"You must be logged in" is not the same as "you must be an admin" — role checks belong on every privileged route.',
    impact: 'The entire user base, credentials included, is one URL away for any registered patient.',
    report: { title: 'Admin Panel Accessible to Non-Admin Users', severity: 'Critical', remediation: 'Enforce admin-role authorisation on all admin routes, server-side.' }
  },

  /* ---------------- Platform & API ---------------- */
  {
    id: 'api-debug', feature: 'Platform & API',
    name: 'Debug Endpoint Exposes the Whole Database', owasp: 'A05:2021 – Security Misconfiguration', difficulty: 'Beginner',
    hints: [
      'Developers leave diagnostic endpoints behind after go-live.',
      'Try /api/debug — without logging in at all.',
      'GET /api/debug returns every user (passwords included), visits and results to anyone who asks.'
    ],
    lesson: 'Debug and diagnostic endpoints must never reach production; if they do, they are unauthenticated data breaches waiting for a scanner.',
    impact: 'The complete patient database — accounts, passwords, visits, results — is downloadable by anyone on the internet.',
    report: { title: 'Unauthenticated Debug Endpoint Discloses Full Database', severity: 'Critical', remediation: 'Remove debug endpoints from production builds and audit deployed routes.' }
  },
  {
    id: 'api-token', feature: 'Platform & API',
    name: 'Weak API Token (Base64 of Email)', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: [
      'The API accepts an X-Api-Token header instead of a session cookie.',
      'The token is derived from something completely public about the account.',
      'Send X-Api-Token with the base64 encoding of bob@test.local to /api/me — you receive Bob\u2019s profile with no password at all.'
    ],
    lesson: 'An API token must be a high-entropy secret; encoding a public identifier is not authentication.',
    impact: 'Anyone who knows a patient\u2019s email address — public information — owns their API identity.',
    report: { title: 'API Tokens Are a Publicly Derivable Encoding of the Email Address', severity: 'High', remediation: 'Issue random, revocable API tokens and store only their hashes.' }
  }
];

/* ------------------------------------------------------------------ */
/* Fake seed data — invented people only. In-memory; resets on boot.   */
/* ------------------------------------------------------------------ */
const users = [
  { id: 1, name: 'System Admin', email: 'admin@hexacare.local', password: 'Admin@123', role: 'admin' },
  { id: 2, name: 'Dr. Sarah Meyer', email: 'dr.meyer@hexacare.local', password: 'doctor123', role: 'doctor' },
  { id: 3, name: 'Nurse Tom Becker', email: 'nurse@hexacare.local', password: 'nurse123', role: 'nurse' },
  { id: 4, name: 'Alice Rahman', email: 'alice@test.local', password: 'alice123', role: 'patient' },
  { id: 5, name: 'Bob Karim', email: 'bob@test.local', password: 'bob123', role: 'patient' },
  { id: 6, name: 'Demo Patient', email: 'demo@hexacare.local', password: 'Demo1234', role: 'patient' }
];
let nextUserId = 7;

const visits = [
  { id: 1, patientId: 4, doctorId: 2, date: '2026-10-05', reason: 'Annual check-up', note: 'Blood pressure normal. Continue current plan.', deleted: false },
  { id: 2, patientId: 4, doctorId: 2, date: '2026-10-12', reason: 'Follow-up — knee pain', note: 'Physiotherapy recommended twice a week.', deleted: false },
  { id: 3, patientId: 5, doctorId: 2, date: '2026-10-07', reason: 'Diabetes review', note: 'HbA1c improved. Adjust the diet plan and recheck in 3 months.', deleted: false },
  { id: 4, patientId: 5, doctorId: 3, date: '2026-10-15', reason: 'Back pain consultation', note: 'Prescribed rest and stretching exercises.', deleted: false }
];

const careplans = {
  4: { goals: 'Walk 30 minutes daily; reduce sugar intake.', instructions: 'Take Metformin after breakfast. Log knee pain weekly.' },
  5: { goals: 'Lose 4 kg in 3 months; stretch every morning.', instructions: 'Monitor blood sugar twice a week and record readings.' }
};

const medications = {
  4: [{ name: 'Metformin', dose: '500 mg, once daily' }],
  5: [{ name: 'Vitamin D', dose: '1000 IU, once daily' }]
};

const results = [
  { id: 1, patientId: 4, name: 'Blood Panel — CBC', value: 'All values within normal range.', released: true },
  { id: 2, patientId: 4, name: 'Thyroid Panel — TSH', value: 'TSH 6.2 mIU/L — above reference range.', released: false },
  { id: 3, patientId: 5, name: 'HbA1c', value: '6.8 % — above target.', released: true },
  { id: 4, patientId: 5, name: 'Lipid Profile', value: 'LDL cholesterol 150 mg/dL — high.', released: true }
];

const threads = [
  {
    id: 1, participants: [4, 2], messages: [
      { sender: 4, body: 'Hello doctor, my knee still hurts after the walks.' },
      { sender: 2, body: 'Please keep the exercises gentle and rest it this week.' }
    ]
  },
  {
    id: 2, participants: [5, 2], messages: [
      { sender: 5, body: 'My sugar readings from this week are in the results section.' },
      { sender: 2, body: 'I saw them — keep following the diet plan, it is working.' }
    ]
  }
];
let nextThreadId = 3;

const appointments = [
  { id: 1, patientId: 4, doctorId: 2, when: '2026-10-28 10:00', status: 'booked' },
  { id: 2, patientId: 5, doctorId: 2, when: '2026-10-29 11:30', status: 'booked' },
  { id: 3, patientId: 4, doctorId: 3, when: '2026-11-02 09:00', status: 'booked' }
];
let nextAppointmentId = 4;

/* ------------------------------------------------------------------ */
/* Sessions + brute-force / enumeration trackers (in-memory)           */
/* ------------------------------------------------------------------ */
const sessions = new Map(); // sid -> userId
const loginFailures = new Map(); // email -> failed count
const forgotProbes = new Set(); // distinct emails probed at /forgot

function newSession(userId) {
  const sid = crypto.randomBytes(18).toString('hex');
  sessions.set(sid, userId);
  return sid;
}
function userById(id) { return users.find(u => u.id === Number(id)); }
function userByEmail(email) { return users.find(u => u.email === String(email || '').toLowerCase()); }

/* ------------------------------------------------------------------ */
/* Progress helpers                                                    */
/* ------------------------------------------------------------------ */
const XSS_RE = /<script|onerror\s*=|onload\s*=|<svg|<img|javascript:/i;
const SQLI_RE = /(('|%27)\s*(or|and)\s+('|\d)|('\s*--)|('\s*#)|(\bor\b\s+1\s*=\s*1))/i;

function pass(testId) {
  if (!state.tests[testId]) {
    state.tests[testId] = true;
    if (Object.keys(state.tests).length >= TESTS.length && !state.completedAt) {
      state.completedAt = new Date().toISOString();
      state.keyRevealed = true;
    }
    saveState();
  }
}
function attempt(feature) {
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  saveState();
}
function featureStats() {
  const out = {};
  for (const t of TESTS) {
    if (!out[t.feature]) out[t.feature] = { total: 0, done: 0, attempts: state.attempts[t.feature] || 0 };
    out[t.feature].total += 1;
    if (state.tests[t.id]) out[t.feature].done += 1;
  }
  return out;
}
function progressSummary() {
  const done = TESTS.filter(t => state.tests[t.id]).length;
  const total = TESTS.length;
  return { done, total, pct: total ? Math.floor(done * 100 / total) : 0, complete: done === total };
}

/* ------------------------------------------------------------------ */
/* HTTP utilities                                                      */
/* ------------------------------------------------------------------ */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
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
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(''));
  });
}
function parseForm(body) {
  const out = {};
  for (const pair of String(body || '').split('&')) {
    if (!pair) continue;
    const i = pair.indexOf('=');
    const k = decodeURIComponent(pair.slice(0, i).replace(/\+/g, ' '));
    const v = decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' '));
    out[k] = v;
  }
  return out;
}
function send(res, status, body, type, extraHeaders) {
  const headers = Object.assign({ 'Content-Type': type || 'text/html; charset=utf-8' }, extraHeaders || {});
  res.writeHead(status, headers);
  res.end(body);
}
function redirect(res, location, extraHeaders) {
  res.writeHead(302, Object.assign({ Location: location }, extraHeaders || {}));
  res.end();
}

/* ------------------------------------------------------------------ */
/* Page layout: header with progress bar + chatbot widget              */
/* ------------------------------------------------------------------ */
function chatWidget() {
  return `
<div id="hxchat" style="position:fixed;right:16px;bottom:16px;width:320px;max-width:92vw;background:#fff;border:1px solid #cbd5e1;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.18);font-family:Arial,sans-serif;z-index:50">
  <div style="background:#0f766e;color:#fff;padding:10px 14px;border-radius:12px 12px 0 0;font-weight:bold">HexaCare Lab Coach</div>
  <div id="hxlog" style="height:180px;overflow-y:auto;padding:10px;font-size:13px;line-height:1.45"></div>
  <form id="hxform" style="display:flex;border-top:1px solid #e2e8f0">
    <input id="hxinput" autocomplete="off" placeholder="Ask the coach…" style="flex:1;border:0;padding:10px;font-size:13px" />
    <button style="background:#0f766e;color:#fff;border:0;padding:0 14px;cursor:pointer">Send</button>
  </form>
</div>
<script>
(function(){
  var log=document.getElementById('hxlog'), form=document.getElementById('hxform'), input=document.getElementById('hxinput');
  function add(who, text){ var d=document.createElement('div'); d.style.margin='6px 0'; d.innerHTML='<b>'+who+':</b> '; d.appendChild(document.createTextNode(text)); log.appendChild(d); log.scrollTop=log.scrollHeight; }
  add('Coach','Hi! I am the Lab Coach for LAB ${LAB_NUMBER} — ${LAB_NAME}. Ask me what to try next, or who built these labs.');
  form.addEventListener('submit', function(e){ e.preventDefault(); var m=input.value.trim(); if(!m) return; input.value=''; add('You', m);
    fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})})
      .then(function(r){return r.json();}).then(function(j){ add('Coach', j.reply||'…'); })
      .catch(function(){ add('Coach','Something went wrong — try again.'); });
  });
})();
</script>`;
}

function layout(title, user, bodyHtml) {
  const p = progressSummary();
  const nav = user ? `
    <nav style="margin:10px 0;font-size:14px">
      <a href="/">Home</a> · <a href="/visits">Visits</a> · <a href="/careplan">Care Plan</a> ·
      <a href="/medications">Medications</a> · <a href="/results">Lab Results</a> · <a href="/messages">Messages</a> ·
      <a href="/appointments">Appointments</a> · <a href="/profile">Profile</a> · <a href="/tests">Mission Board</a> ·
      <a href="/logout">Log out (${esc(user.name)} — ${esc(user.role)})</a>
    </nav>` : `
    <nav style="margin:10px 0;font-size:14px"><a href="/login">Log in</a> · <a href="/register">Register</a> · <a href="/tests">Mission Board</a></nav>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)} · LAB ${LAB_NUMBER} — ${LAB_NAME}</title></head>
<body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a">
<div style="max-width:960px;margin:0 auto;padding:18px">
  <header style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 18px">
    <div style="display:flex;align-items:center;gap:12px">
      <img src="/logo.png" style="height:44px" alt="HexaCyberLab" />
      <div>
        <div style="font-size:20px;font-weight:bold">LAB ${LAB_NUMBER} — ${LAB_NAME}</div>
        <div style="font-size:13px;color:#475569">Patient Portal · HexaCyberLab practice lab — local use only</div>
      </div>
    </div>
    <div style="margin-top:10px;font-size:13px">Progress: <b>${p.done}/${p.total} tests · ${p.pct}%</b></div>
    <div style="background:#e2e8f0;border-radius:6px;height:12px;margin-top:4px"><div style="background:#0f766e;height:12px;border-radius:6px;width:${p.pct}%"></div></div>
    ${nav}
  </header>
  <main style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin-top:14px">
    ${bodyHtml}
  </main>
  <footer style="font-size:12px;color:#64748b;margin-top:12px">HexaCyberLab practice labs — built by Md. Jony Hassain, Founder of HexaCyberLab. All data on this page is fake.</footer>
</div>
${chatWidget()}
</body></html>`;
}

/* ------------------------------------------------------------------ */
/* Completion-key shards (region 2 of 2) — assembled only at 100%.     */
/* ------------------------------------------------------------------ */
const COMPLETION_SHARDS = [
  'TC1YSA==',
  'Ui0zNg==',
  'TllJOQ==',
  'LUZKOQ==',
  'SDlGTA==',
  'TFFUUg=='
];
function completionKey() { return assembleKey(COMPLETION_SHARDS); }
const ENTRY_KEY_SHA256 = '764ace74a461cdb6fe4a71c3012092c68231ac3a1a38663d80c61cf4e2d6241f';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */

/* ------------------------------------------------------------------ */
/* Lab Coach chatbot                                                   */
/* ------------------------------------------------------------------ */
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";

function findFeature(text) {
  const stats = featureStats();
  let best = null;
  for (const f of Object.keys(stats)) {
    const words = f.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(w => w.length > 3);
    if (words.some(w => text.includes(w))) best = f;
  }
  if (/login|auth|password|reset|brute|enumerat/.test(text)) best = 'Login & Authentication';
  if (/register|sign ?up|profile/.test(text)) best = 'Registration & Profile';
  if (/visit|note/.test(text)) best = 'Visits & Clinical Notes';
  if (/care ?plan|medication|drug/.test(text)) best = 'Care Plans & Medications';
  if (/result|lab|blood|thyroid/.test(text)) best = 'Lab Results';
  if (/message|thread|chat|impersonat/.test(text)) best = 'Messaging';
  if (/appointment|book|cancel/.test(text)) best = 'Appointments';
  if (/admin/.test(text)) best = 'Admin Panel';
  if (/api|debug|token/.test(text)) best = 'Platform & API';
  return best;
}

function coachReply(rawMessage) {
  const text = String(rawMessage || '').toLowerCase();
  const p = progressSummary();
  const stats = featureStats();

  if (/who (built|made|created)|founder|who is behind/.test(text)) return ATTRIBUTION;

  if (/key|unlock next|next lab/.test(text)) {
    if (p.complete && state.keyRevealed) {
      return 'You completed LAB ' + LAB_NUMBER + ' — congratulations! The completion key for the next lab is: ' + completionKey() + ' — paste it into the next lab to unlock it.';
    }
    return 'I do not have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at ' + p.pct + '% (' + p.done + '/' + p.total + ' tests). Finish every test on the Mission Board (/tests) and ask me again.';
  }

  if (/progress|how (am i|many.*done)|score/.test(text)) {
    return 'Current progress: ' + p.done + '/' + p.total + ' tests (' + p.pct + '%). ' +
      Object.keys(stats).map(f => f + ': ' + stats[f].done + '/' + stats[f].total).join(' · ') + '.';
  }

  const feature = findFeature(text);
  const wantsHow = /how|solve|guide|step|help|exploit|bypass|do it|attack/.test(text);

  if (feature && wantsHow) {
    const st = stats[feature];
    const open = TESTS.filter(t => t.feature === feature && !state.tests[t.id]);
    if ((st && st.attempts >= 3) || open.length === 0) {
      if (open.length === 0) return 'You have already completed every test in ' + feature + '. Well done!';
      let out = 'Step by step for ' + feature + ' — here is how to approach the remaining test(s):';
      for (const t of open) {
        out += '\n• ' + t.name + ': ' + t.hints[2] + ' (' + t.lesson + ')';
      }
      return out;
    }
    const n = st ? st.attempts : 0;
    return 'That feature is locked for help. First try the ' + feature + ' tests yourself at least 3 times — I can see you\'ve tried ' + n + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }

  if (feature || /feature|vulnerabilit|tests|what.*(in|does) this lab/.test(text)) {
    const list = Object.keys(stats).map(f => f + ' (' + stats[f].total + ' tests)').join(', ');
    if (feature) {
      const names = TESTS.filter(t => t.feature === feature).map(t => t.name).join('; ');
      return feature + ' has ' + stats[feature].total + ' tests: ' + names + '. The Mission Board at /tests shows hints for each one.';
    }
    return 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + TESTS.length + ' tests across ' + Object.keys(stats).length + ' features: ' + list + '. Open /tests for the full Mission Board.';
  }

  if (/next|what should|where.*start|stuck/.test(text)) {
    const next = TESTS.find(t => !state.tests[t.id]);
    if (!next) return 'Everything is complete — open /complete for your summary and certificate.';
    return 'Try this next: "' + next.name + '" in ' + next.feature + ' (' + next.difficulty + '). Its first hint: ' + next.hints[0];
  }

  if (/^(hi|hello|hey|help)\b/.test(text)) {
    return 'Hello! I coach testers through LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '. You are at ' + p.pct + '%. Ask me how many tests a feature has, what to try next, or — after 3 real attempts on a feature — ask me how to solve its tests.';
  }

  return 'I can help with this lab: ask about a feature (for example "how many tests in Messaging"), your progress, what to try next, or who built these labs. Step-by-step solutions unlock after you have tried a feature at least 3 times. Full details live on the Mission Board at /tests.';
}

/* ------------------------------------------------------------------ */
/* Gate + unlock + progress API                                        */
/* ------------------------------------------------------------------ */
function gatePage() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ${LAB_NUMBER} — ${LAB_NAME} · Locked</title></head>
<body style="margin:0;background:#14141d;font-family:Arial,sans-serif">
<div style="max-width:520px;margin:60px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:28px;text-align:center">
  <img src="/logo.png" style="height:56px" alt="HexaCyberLab" />
  <h2>LAB ${LAB_NUMBER} — ${LAB_NAME}</h2>
  <p>This lab is locked. Paste the completion key from Lab ${PREV_LAB} to start.</p>
  <form method="POST" action="/unlock">
    <input name="key" style="padding:9px;width:80%" placeholder="Completion key from Lab ${PREV_LAB}" /><br /><br />
    <button style="padding:10px 22px">Unlock LAB ${LAB_NUMBER}</button>
  </form>
</div>
${chatWidget()}
</body></html>`;
}

/* ------------------------------------------------------------------ */
/* Auth pages                                                          */
/* ------------------------------------------------------------------ */
function loginPage(msg) {
  return layout('Log in', null, `
    <h2>Log in to HexaCare</h2>
    ${msg ? `<p style="color:#b91c1c">${esc(msg)}</p>` : ''}
    <form method="POST" action="/login">
      <p>Email<br /><input name="email" style="padding:8px;width:70%" /></p>
      <p>Password<br /><input name="password" type="password" style="padding:8px;width:70%" /></p>
      <button style="padding:9px 20px">Log in</button>
    </form>
    <p style="font-size:13px"><a href="/forgot">Forgot your password?</a> · <a href="/register">Create an account</a></p>
    <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:10px;font-size:13px">
      <b>Demo account</b> (for evaluation): demo@hexacare.local / Demo1234
    </div>`);
}
function registerPage(msg) {
  return layout('Register', null, `
    <h2>Create your HexaCare account</h2>
    ${msg ? `<p style="color:#b91c1c">${esc(msg)}</p>` : ''}
    <form method="POST" action="/register">
      <p>Full name<br /><input name="name" style="padding:8px;width:70%" /></p>
      <p>Email<br /><input name="email" style="padding:8px;width:70%" /></p>
      <p>Password<br /><input name="password" type="password" style="padding:8px;width:70%" /></p>
      <button style="padding:9px 20px">Register</button>
    </form>`);
}
function forgotPage(msg) {
  return layout('Password reset', null, `
    <h2>Reset your password</h2>
    ${msg ? `<p>${esc(msg)}</p>` : ''}
    <h3>Step 1 — request a reset</h3>
    <form method="POST" action="/forgot">
      <p>Email<br /><input name="email" style="padding:8px;width:70%" /></p>
      <button style="padding:9px 20px">Send reset link</button>
    </form>
    <h3>Step 2 — use your reset token</h3>
    <form method="POST" action="/reset">
      <p>Email<br /><input name="email" style="padding:8px;width:70%" /></p>
      <p>Reset token (from the email)<br /><input name="token" style="padding:8px;width:70%" /></p>
      <p>New password<br /><input name="newpassword" type="password" style="padding:8px;width:70%" /></p>
      <button style="padding:9px 20px">Set new password</button>
    </form>`);
}

function resetTokenFor(user) {
  return 'HC-' + user.id + '-' + (user.id * 137 + 42);
}

function handleLogin(req, res, form) {
  attempt('Login & Authentication');
  const email = String(form.email || '').toLowerCase();
  const password = String(form.password || '');

  // FLAW (by design): the lookup query is string-built; an injection
  // pattern makes it match the first account in the "database".
  if (SQLI_RE.test(email) || SQLI_RE.test(password)) {
    const victim = users[0];
    pass('auth-sqli');
    const sid = newSession(victim.id);
    return redirect(res, '/', { 'Set-Cookie': [`hc_session=${sid}; Path=/; HttpOnly`, `hx_role=${victim.role}; Path=/`] });
  }

  const user = userByEmail(email);
  if (!user || user.password !== password) {
    const n = (loginFailures.get(email) || 0) + 1;
    loginFailures.set(email, n);
    if (user && n >= 10) pass('auth-brute'); // 10th failure still processed — no throttle
    return send(res, 200, loginPage('Invalid email or password.'));
  }

  if (email === 'demo@hexacare.local') pass('auth-default');
  const sid = newSession(user.id);
  return redirect(res, '/', { 'Set-Cookie': [`hc_session=${sid}; Path=/; HttpOnly`, `hx_role=${user.role}; Path=/`] });
}

function handleRegister(req, res, form) {
  attempt('Registration & Profile');
  const name = String(form.name || '').trim();
  const email = String(form.email || '').toLowerCase().trim();
  const password = String(form.password || '');
  if (!name || !email || !password) return send(res, 200, registerPage('All fields are required.'));
  if (userByEmail(email)) return send(res, 200, registerPage('An account with that email already exists.'));

  // FLAW (by design): no password policy at all.
  if (password.length < 4) pass('reg-weakpw');
  // FLAW (by design): the whole form is bound onto the account — role included.
  let role = 'patient';
  if (form.role && ['patient', 'nurse', 'doctor', 'admin'].includes(String(form.role))) {
    role = String(form.role);
    if (role !== 'patient') pass('reg-massassign');
  }
  if (XSS_RE.test(name)) pass('reg-xss');
  const user = { id: nextUserId++, name, email, password, role };
  users.push(user);
  const sid = newSession(user.id);
  return redirect(res, '/', { 'Set-Cookie': [`hc_session=${sid}; Path=/; HttpOnly`, `hx_role=${user.role}; Path=/`] });
}

function handleForgot(req, res, form) {
  attempt('Login & Authentication');
  const email = String(form.email || '').toLowerCase().trim();
  if (email) {
    forgotProbes.add(email);
    if (forgotProbes.size >= 5) pass('auth-enum');
  }
  const user = userByEmail(email);
  // FLAW (by design): the response reveals whether the account exists.
  if (user) return send(res, 200, forgotPage('Reset link sent — please check the inbox for ' + user.email + '.'));
  return send(res, 200, forgotPage('No account found for that email address.'));
}

function handleReset(req, res, form) {
  attempt('Login & Authentication');
  const email = String(form.email || '').toLowerCase().trim();
  const token = String(form.token || '').trim();
  const user = userByEmail(email);
  if (!user) return send(res, 200, forgotPage('No account found for that email address.'));
  // FLAW (by design): the token is a public formula of the user id.
  if (token === resetTokenFor(user)) {
    user.password = String(form.newpassword || 'changed123');
    pass('auth-reset');
    return send(res, 200, loginPage('Password updated. Please log in.'));
  }
  return send(res, 200, forgotPage('That reset token is not valid.'));
}

function handleProfileUpdate(req, res, user, cookies, form) {
  attempt('Registration & Profile');
  const origin = req.headers.origin || req.headers.referer || '';
  const foreign = origin && !origin.includes('127.0.0.1:' + PORT) && !origin.includes('localhost:' + PORT);
  const hasMarker = cookies.hx_origin === 'local';
  // FLAW (by design): the origin marker is never enforced — but we can observe CSRF.
  if (foreign || !hasMarker) pass('reg-csrf');
  const name = String(form.name || '').trim();
  if (name) {
    if (XSS_RE.test(name)) pass('reg-xss');
    user.name = name; // rendered raw in staff lists (by design)
  }
  return redirect(res, '/profile');
}

/* ------------------------------------------------------------------ */
/* App pages                                                           */
/* ------------------------------------------------------------------ */
function dashboard(user) {
  let inner = `<h2>Welcome, ${esc(user.name)}</h2>`;
  if (user.role === 'patient') {
    const myVisits = visits.filter(v => v.patientId === user.id && !v.deleted);
    const myResults = results.filter(r => r.patientId === user.id);
    inner += `<p>Your upcoming care at a glance.</p>
      <h3>Recent visits</h3><ul>${myVisits.map(v => `<li><a href="/visits/${v.id}">${esc(v.date)} — ${esc(v.reason)}</a></li>`).join('') || '<li>None yet</li>'}</ul>
      <h3>Lab results</h3><ul>${myResults.map(r => `<li><a href="/results/${r.id}">${esc(r.name)}</a>${r.released ? '' : ' — <i>pending clinician review</i>'}</li>`).join('')}</ul>`;
  } else {
    inner += `<p>You are signed in as <b>${esc(user.role)}</b>. Use the navigation above to work with patients, or open the <a href="/clinician">Clinician Console</a>.</p>`;
  }
  inner += `<p style="font-size:13px">Your user id is <b>${user.id}</b>.</p>`;
  return layout('Home', user, inner);
}

function profilePage(user, msg) {
  return layout('Profile', user, `
    <h2>Your profile</h2>
    ${msg ? `<p>${esc(msg)}</p>` : ''}
    <p><b>Name:</b> ${esc(user.name)}<br /><b>Email:</b> ${esc(user.email)}<br /><b>Role:</b> ${esc(user.role)}<br /><b>User id:</b> ${user.id}</p>
    <form method="POST" action="/profile">
      <p>Display name<br /><input name="name" value="${esc(user.name)}" style="padding:8px;width:70%" /></p>
      <button style="padding:9px 20px">Save profile</button>
    </form>`);
}

function visitsPage(user) {
  attempt('Visits & Clinical Notes');
  const mine = visits.filter(v => !v.deleted && (user.role !== 'patient' || v.patientId === user.id));
  const list = (user.role === 'patient' ? visits.filter(v => v.patientId === user.id && !v.deleted) : mine);
  return layout('Visits', user, `
    <h2>${user.role === 'patient' ? 'Your visits' : 'Visits'}</h2>
    <ul>${list.map(v => `<li><a href="/visits/${v.id}">${esc(v.date)} — ${esc(v.reason)}</a> (patient: ${esc((userById(v.patientId) || {}).name || v.patientId)})</li>`).join('') || '<li>No visits</li>'}</ul>`);
}

function visitDetail(user, visit) {
  attempt('Visits & Clinical Notes');
  if (visit.patientId !== user.id && user.role === 'patient') pass('visit-idor');
  if (visit.deleted) return layout('Visit', user, '<h2>Visit record deleted</h2><p>This record no longer exists.</p>');
  const patient = userById(visit.patientId) || {};
  const doctor = userById(visit.doctorId) || {};
  return layout('Visit ' + visit.id, user, `
    <h2>Visit — ${esc(visit.date)}</h2>
    <p><b>Patient:</b> ${esc(patient.name || '')}<br /><b>Clinician:</b> ${esc(doctor.name || '')}<br /><b>Reason:</b> ${esc(visit.reason)}</p>
    <h3>Clinical note</h3>
    <p style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px">${esc(visit.note)}</p>
    <form method="POST" action="/visits/${visit.id}/note">
      <p>Edit clinical note (clinicians)<br /><textarea name="note" rows="3" style="width:80%">${esc(visit.note)}</textarea></p>
      <button style="padding:8px 16px">Save note</button>
    </form>
    <form method="POST" action="/visits/${visit.id}/delete" style="margin-top:10px">
      <button style="padding:8px 16px;background:#b91c1c;color:#fff;border:0">Delete this visit record</button>
    </form>`);
}

function careplanPage(user, target) {
  attempt('Care Plans & Medications');
  if (target.id !== user.id && user.role === 'patient') pass('careplan-idor');
  const plan = careplans[target.id] || { goals: '—', instructions: '—' };
  return layout('Care Plan', user, `
    <h2>Care plan — ${esc(target.name)}</h2>
    <p><b>Goals:</b> ${esc(plan.goals)}</p>
    <p><b>Instructions:</b> ${esc(plan.instructions)}</p>
    ${target.id === user.id ? `
    <h3>Edit care plan (clinicians)</h3>
    <form method="POST" action="/careplan/edit">
      <p>Goals<br /><input name="goals" value="${esc(plan.goals)}" style="padding:8px;width:80%" /></p>
      <p>Instructions<br /><input name="instructions" value="${esc(plan.instructions)}" style="padding:8px;width:80%" /></p>
      <button style="padding:8px 16px">Save care plan</button>
    </form>` : ''}`);
}

function medicationsPage(user) {
  attempt('Care Plans & Medications');
  const meds = medications[user.id] || [];
  return layout('Medications', user, `
    <h2>Your medication list</h2>
    <ul>${meds.map(m => `<li><b>${esc(m.name)}</b> — ${esc(m.dose)}</li>`).join('') || '<li>No medications recorded</li>'}</ul>
    <h3>Add medication (clinicians)</h3>
    <form method="POST" action="/medications/add">
      <p>Medication<br /><input name="name" style="padding:8px;width:60%" /></p>
      <p>Dose<br /><input name="dose" style="padding:8px;width:60%" /></p>
      <button style="padding:8px 16px">Add medication</button>
    </form>`);
}

function resultsPage(user) {
  attempt('Lab Results');
  const mine = results.filter(r => r.patientId === user.id);
  const list = user.role === 'patient' ? mine : results;
  return layout('Lab Results', user, `
    <h2>${user.role === 'patient' ? 'Your lab results' : 'Lab results'}</h2>
    <ul>${list.map(r => `<li><a href="/results/${r.id}">${esc(r.name)}</a>${r.released ? '' : ' — <i>pending clinician review</i>'}</li>`).join('')}</ul>`);
}

function resultDetail(user, r) {
  attempt('Lab Results');
  if (r.patientId !== user.id && user.role === 'patient') pass('lab-idor');
  if (!r.released && r.patientId === user.id && user.role === 'patient') {
    return layout('Result', user, `<h2>${esc(r.name)}</h2><p>This result is still <b>pending clinician review</b> and cannot be shown yet.</p>`);
  }
  return layout('Result', user, `<h2>${esc(r.name)}</h2><p><b>Result:</b> ${esc(r.value)}</p><p>Status: ${r.released ? 'Released' : 'Pending review'}</p>`);
}

function messagesPage(user) {
  attempt('Messaging');
  const mine = threads.filter(t => t.participants.includes(user.id) || user.role !== 'patient');
  return layout('Messages', user, `
    <h2>Your message threads</h2>
    <ul>${mine.map(t => {
      const others = t.participants.filter(id => id !== user.id).map(id => (userById(id) || {}).name || id).join(', ');
      return `<li><a href="/messages/${t.id}">Thread ${t.id}</a> — with ${esc(others)}</li>`;
    }).join('') || '<li>No threads</li>'}</ul>`);
}

function threadPage(user, thread) {
  attempt('Messaging');
  if (!thread.participants.includes(user.id) && user.role === 'patient') pass('msg-idor');
  // FLAW (by design): sender names and message bodies render RAW (stored XSS sink).
  const msgs = thread.messages.map(m => {
    const sender = userById(m.sender);
    const senderName = sender ? sender.name : ('User ' + m.sender); // raw on purpose
    return `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:8px;margin:8px 0"><b>${senderName}</b><br />${m.body}</div>`;
  }).join('');
  return layout('Thread ' + thread.id, user, `
    <h2>Message thread ${thread.id}</h2>
    ${msgs}
    <form method="POST" action="/messages/${thread.id}/send">
      <input type="hidden" name="senderId" value="${user.id}" />
      <p>Reply<br /><textarea name="body" rows="3" style="width:85%"></textarea></p>
      <button style="padding:8px 16px">Send message</button>
    </form>`);
}

function appointmentsPage(user) {
  attempt('Appointments');
  const list = user.role === 'patient' ? appointments.filter(a => a.patientId === user.id) : appointments;
  const doctors = users.filter(u => u.role === 'doctor' || u.role === 'nurse');
  return layout('Appointments', user, `
    <h2>${user.role === 'patient' ? 'Your appointments' : 'Appointments'}</h2>
    <ul>${list.map(a => `<li>#${a.id} — ${esc(a.when)} with ${esc((userById(a.doctorId) || {}).name || '')} — <b>${esc(a.status)}</b> (patient: ${esc((userById(a.patientId) || {}).name || a.patientId)})
      ${a.status === 'booked' ? `<form method="POST" action="/appointments/${a.id}/cancel" style="display:inline"><button>Cancel</button></form>` : ''}</li>`).join('') || '<li>None</li>'}</ul>
    <h3>Book an appointment</h3>
    <form method="POST" action="/appointments">
      <input type="hidden" name="patientId" value="${user.id}" />
      <p>Clinician<br /><select name="doctorId">${doctors.map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join('')}</select></p>
      <p>When<br /><input name="when" value="2026-11-05 10:00" style="padding:8px" /></p>
      <button style="padding:8px 16px">Book</button>
    </form>`);
}

function clinicianPage(user, cookies) {
  const cookieRole = cookies.hx_role || '';
  const realClinician = user.role === 'doctor' || user.role === 'admin' || user.role === 'nurse';
  if (!realClinician && (cookieRole === 'doctor' || cookieRole === 'admin')) {
    pass('auth-cookie'); // console trusted the client-supplied role cookie
  } else if (!realClinician) {
    return null; // caller sends 403
  }
  const patients = users.filter(u => u.role === 'patient');
  // NOTE: names render RAW here (staff list) — the stored-XSS sink for display names.
  const rows = patients.map(u2 => `<li>${u2.name} — ${esc(u2.email)} (id ${u2.id})</li>`).join('');
  return layout('Clinician Console', user, `
    <h2>Clinician Console</h2>
    <p>All registered patients:</p>
    <ul>${rows}</ul>`);
}

function adminPage(user) {
  if (user.role !== 'admin') pass('admin-bac'); // FLAW: any signed-in user is served
  const rows = users.map(u2 => `<li>${u2.name} — ${esc(u2.email)} — role ${esc(u2.role)} — password: ${esc(u2.password)}</li>`).join('');
  return layout('Admin Panel', user, `
    <h2>Admin Panel</h2>
    <p>All accounts (including credentials, for support purposes):</p>
    <ul>${rows}</ul>`);
}

/* ------------------------------------------------------------------ */
/* Mission Board, completion page, certificate                       */
/* ------------------------------------------------------------------ */
function testsPage(user) {
  const stats = featureStats();
  let html = '<h2>Mission Board — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h2>';
  html += '<p>Solve tests by actually performing the exploit in the app. The Lab Coach unlocks step-by-step help for a feature after you have tried that feature at least 3 times.</p>';
  for (const f of Object.keys(stats)) {
    const st = stats[f];
    html += `<h3>${esc(f)} — ${st.done}/${st.total} done · ${st.attempts} attempt(s)</h3>`;
    for (const t of TESTS.filter(x => x.feature === f)) {
      const done = !!state.tests[t.id];
      const hintBtns = t.hints.map((h, i) =>
        `<button type="button" onclick="var e=document.getElementById('${t.id}-h${i}');e.style.display='block';this.style.display='none'">Hint ${i + 1}</button>
         <div id="${t.id}-h${i}" style="display:none;background:#fef9c3;border:1px solid #fde68a;border-radius:6px;padding:6px;margin:4px 0;font-size:13px">${esc(h)}</div>`).join(' ');
      html += `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:10px;margin:8px 0">
        <div>${done ? '✓' : '○'} <b>${esc(t.name)}</b> — ${esc(t.owasp)} · ${esc(t.difficulty)} · <i>${done ? 'done' : 'open'}</i></div>
        <div style="margin-top:6px">${hintBtns}</div>
      </div>`;
    }
  }
  return layout('Mission Board', user, html);
}

function completePage(user) { if (!user) user = { name: 'Tester', email: '', id: 0 };
  const p = progressSummary();
  const stats = featureStats();
  if (!p.complete) {
    const left = TESTS.filter(t => !state.tests[t.id]).map(t => `<li>${esc(t.name)} (${esc(t.feature)})</li>`).join('');
    return layout('Completion', user, `
      <h2>Not complete yet — ${p.done}/${p.total} tests (${p.pct}%)</h2>
      <p>Finish every test on the <a href="/tests">Mission Board</a> to unlock your completion summary, certificate and the key for the next lab.</p>
      <h3>Still open</h3><ul>${left}</ul>`);
  }
  const features = Object.keys(stats);
  const counts = features.map(f => `<li><b>${esc(f)}</b>: ${stats[f].total} vulnerabilities</li>`).join('');
  const techniques = TESTS.map(t => `<li>${esc(t.name)} — ${esc(t.owasp)}</li>`).join('');
  const lessons = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('');
  const impacts = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('');
  const reports = TESTS.map(t => `<li><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)}. Remediation: ${esc(t.report.remediation)}</li>`).join('');
  return layout('Lab Complete', user, `
    <h2>LAB ${LAB_NUMBER} — ${LAB_NAME} complete!</h2>
    <h3>1. Total features in this lab</h3><p>${features.length} features</p>
    <h3>2. Vulnerabilities per feature</h3><ul>${counts}</ul>
    <h3>3. How testing was done — ${p.total} tests completed</h3><ul>${techniques}</ul>
    <h3>4. What you learned</h3><ul>${lessons}</ul>
    <h3>5. What this means for a real client</h3><ul>${impacts}</ul>
    <h3>6. Writing it in a real report</h3><ul>${reports}</ul>
    <h3>Your completion key for the next lab</h3>
    <p style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:8px;padding:12px;font-size:17px"><b>${esc(completionKey())}</b></p>
    <form method="POST" action="/complete">
      <p>Your name for the certificate<br /><input name="testerName" value="${esc(state.testerName || user.name)}" style="padding:8px;width:60%" /></p>
      <button style="padding:8px 16px">Save name</button>
    </form>
    <p><a href="/certificate">Open your certificate</a></p>`);
}

function certificatePage(user) { if (!user) user = { name: 'Tester', email: '', id: 0 };
  const p = progressSummary();
  if (!p.complete) return redirectPage(user, '/complete');
  const stats = featureStats();
  const name = state.testerName || user.name;
  const date = state.completedAt ? new Date(state.completedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER} ${LAB_NAME}</title>
<style>@media print{body{background:#fff}}</style></head>
<body style="margin:0;background:#e2e8f0;font-family:Georgia,serif">
<div style="max-width:760px;margin:40px auto;background:#fff;border:3px solid #0f766e;border-radius:10px;padding:36px;text-align:center">
  <img src="/logo.png" style="height:64px" alt="HexaCyberLab" />
  <h1 style="margin:14px 0 4px">Certificate of Completion</h1>
  <p style="color:#475569">This certifies that</p>
  <p style="font-size:26px;font-weight:bold;margin:6px 0">${esc(name)}</p>
  <p>has completed 100% of the security tests in <b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b><br />
  (${p.total} tests across ${Object.keys(stats).length} features)</p>
  <p style="color:#475569">Completed on ${esc(date)}</p>
  <hr style="border:0;border-top:1px solid #cbd5e1;margin:22px 0" />
  <p style="font-size:14px">HexaCyberLab — Built by Md. Jony Hassain, Founder</p>
</div>
</body></html>`;
}
function redirectPage(user, loc) {
  return layout('Redirect', user, `<p>Redirecting… <a href="${loc}">${loc}</a></p><script>location.href='${loc}'</script>`);
}

/* ------------------------------------------------------------------ */
/* Main router                                                         */
/* ------------------------------------------------------------------ */
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://127.0.0.1:' + PORT);
    const pathname = u.pathname;
    const cookies = parseCookies(req);
    const sid = cookies.hc_session;
    const sessionUserId = sid ? sessions.get(sid) : null;
    const user = sessionUserId ? userById(sessionUserId) : null;

    // Always-public endpoints
    if (pathname === '/logo.png') {
      try {
        const img = fs.readFileSync(LOGO_FILE);
        return send(res, 200, img, 'image/png');
      } catch (e) { return send(res, 404, 'logo missing', 'text/plain'); }
    }
    if (pathname === '/api/progress') {
      const p = progressSummary();
      return send(res, 200, JSON.stringify({
        lab: LAB_NAME, number: LAB_NUMBER, total: p.total, done: p.done,
        pct: p.pct, features: featureStats(), complete: p.complete
      }, null, 2), 'application/json');
    }
    if (pathname === '/api/chat' && req.method === 'POST') {
      const raw = await readBody(req);
      let msg = '';
      try { msg = JSON.parse(raw || '{}').message || ''; }
      catch (e) { msg = ''; }
      if (!msg) return send(res, 200, JSON.stringify({ reply: 'Ask me about a feature, your progress, what to try next — or who built these labs.' }), 'application/json');
      return send(res, 200, JSON.stringify({ reply: coachReply(msg) }), 'application/json');
    }
    if (pathname === '/unlock' && req.method === 'POST') {
      const form = parseForm(await readBody(req));
      if (entryKeyMatches(String(form.key || ''))) {
        state.unlocked = true;
        saveState();
        return redirect(res, '/login');
      }
      return send(res, 403, gatePage());
    }

    // Gate: everything else requires unlock.
    if (!state.unlocked) return send(res, 200, gatePage());

    const htmlHeaders = { 'Set-Cookie': 'hx_origin=local; Path=/' };

    /* ----- auth routes ----- */
    if (pathname === '/login' && req.method === 'GET') return send(res, 200, loginPage(), 'text/html', htmlHeaders);
    if (pathname === '/login' && req.method === 'POST') return handleLogin(req, res, parseForm(await readBody(req)));
    if (pathname === '/register' && req.method === 'GET') return send(res, 200, registerPage(), 'text/html', htmlHeaders);
    if (pathname === '/register' && req.method === 'POST') return handleRegister(req, res, parseForm(await readBody(req)));
    if (pathname === '/forgot' && req.method === 'GET') return send(res, 200, forgotPage(), 'text/html', htmlHeaders);
    if (pathname === '/forgot' && req.method === 'POST') return handleForgot(req, res, parseForm(await readBody(req)));
    if (pathname === '/reset' && req.method === 'POST') return handleReset(req, res, parseForm(await readBody(req)));
    if (pathname === '/logout') {
      if (sid) sessions.delete(sid);
      return redirect(res, '/login', { 'Set-Cookie': 'hc_session=; Path=/; Max-Age=0' });
    }

    /* ----- platform/API routes that do not need a page session ----- */
    if (pathname === '/api/debug') {
      pass('api-debug');
      attempt('Platform & API');
      return send(res, 200, JSON.stringify({ users, visits, results, threads, appointments }, null, 2), 'application/json');
    }
    if (pathname === '/api/me') {
      attempt('Platform & API');
      if (user) return send(res, 200, JSON.stringify({ id: user.id, name: user.name, email: user.email, role: user.role }), 'application/json');
      const tok = req.headers['x-api-token'] || '';
      try {
        const email = Buffer.from(String(tok), 'base64').toString('utf8').toLowerCase();
        const tu = userByEmail(email);
        if (tu) {
          pass('api-token'); // FLAW: token = base64(email)
          return send(res, 200, JSON.stringify({ id: tu.id, name: tu.name, email: tu.email, role: tu.role, via: 'api-token' }), 'application/json');
        }
      } catch (e) {}
      return send(res, 401, JSON.stringify({ error: 'authentication required' }), 'application/json');
    }
    const apiResultMatch = pathname.match(/^\/api\/results\/(\d+)$/);
    if (apiResultMatch) {
      if (!user) return send(res, 401, JSON.stringify({ error: 'login required' }), 'application/json');
      const r = results.find(x => x.id === Number(apiResultMatch[1]));
      if (!r) return send(res, 404, JSON.stringify({ error: 'not found' }), 'application/json');
      attempt('Lab Results');
      if (r.patientId !== user.id && user.role === 'patient') pass('lab-idor');
      if (!r.released && r.patientId === user.id && user.role === 'patient') pass('lab-unreleased'); // FLAW: API ignores the release flag
      return send(res, 200, JSON.stringify(r), 'application/json');
    }

    /* ----- everything below requires a session ----- */
    if (!user && pathname !== '/complete' && pathname !== '/complete/name' && pathname !== '/certificate') return redirect(res, '/login');

    if (pathname === '/' && req.method === 'GET') return send(res, 200, dashboard(user), 'text/html', htmlHeaders);
    if (pathname === '/profile' && req.method === 'GET') return send(res, 200, profilePage(user), 'text/html', htmlHeaders);
    if (pathname === '/profile' && req.method === 'POST') return handleProfileUpdate(req, res, user, cookies, parseForm(await readBody(req)));

    if (pathname === '/visits' && req.method === 'GET') return send(res, 200, visitsPage(user), 'text/html', htmlHeaders);
    const visitMatch = pathname.match(/^\/visits\/(\d+)$/);
    if (visitMatch && req.method === 'GET') {
      const v = visits.find(x => x.id === Number(visitMatch[1]));
      if (!v) return send(res, 404, layout('Not found', user, '<h2>Visit not found</h2>'));
      return send(res, 200, visitDetail(user, v), 'text/html', htmlHeaders);
    }
    const visitNoteMatch = pathname.match(/^\/visits\/(\d+)\/note$/);
    if (visitNoteMatch && req.method === 'POST') {
      const form = parseForm(await readBody(req));
      const v = visits.find(x => x.id === Number(visitNoteMatch[1]));
      attempt('Visits & Clinical Notes');
      if (v && !v.deleted) {
        v.note = String(form.note || '');
        if (user.role === 'patient') pass('visit-note'); // FLAW: no clinician role check
      }
      return redirect(res, '/visits/' + visitNoteMatch[1]);
    }
    const visitDeleteMatch = pathname.match(/^\/visits\/(\d+)\/delete$/);
    if (visitDeleteMatch && req.method === 'POST') {
      const v = visits.find(x => x.id === Number(visitDeleteMatch[1]));
      attempt('Visits & Clinical Notes');
      if (v && !v.deleted) {
        v.deleted = true;
        if (user.role === 'patient') pass('visit-delete'); // FLAW: patients can delete records
      }
      return redirect(res, '/visits');
    }

    if (pathname === '/careplan' && req.method === 'GET') return send(res, 200, careplanPage(user, user), 'text/html', htmlHeaders);
    const careplanMatch = pathname.match(/^\/careplan\/(\d+)$/);
    if (careplanMatch && req.method === 'GET') {
      const target = userById(Number(careplanMatch[1]));
      if (!target) return send(res, 404, layout('Not found', user, '<h2>Patient not found</h2>'));
      return send(res, 200, careplanPage(user, target), 'text/html', htmlHeaders);
    }
    if (pathname === '/careplan/edit' && req.method === 'POST') {
      const form = parseForm(await readBody(req));
      attempt('Care Plans & Medications');
      careplans[user.id] = { goals: String(form.goals || ''), instructions: String(form.instructions || '') };
      if (user.role === 'patient') pass('careplan-edit'); // FLAW: clinician-only write, no role check
      return redirect(res, '/careplan');
    }

    if (pathname === '/medications' && req.method === 'GET') return send(res, 200, medicationsPage(user), 'text/html', htmlHeaders);
    if (pathname === '/medications/add' && req.method === 'POST') {
      const form = parseForm(await readBody(req));
      attempt('Care Plans & Medications');
      if (!medications[user.id]) medications[user.id] = [];
      medications[user.id].push({ name: String(form.name || 'Unknown'), dose: String(form.dose || '') });
      if (user.role === 'patient') pass('med-selfadd'); // FLAW: prescribing by patients
      return redirect(res, '/medications');
    }

    if (pathname === '/results' && req.method === 'GET') return send(res, 200, resultsPage(user), 'text/html', htmlHeaders);
    const resultMatch = pathname.match(/^\/results\/(\d+)$/);
    if (resultMatch && req.method === 'GET') {
      const r = results.find(x => x.id === Number(resultMatch[1]));
      if (!r) return send(res, 404, layout('Not found', user, '<h2>Result not found</h2>'));
      return send(res, 200, resultDetail(user, r), 'text/html', htmlHeaders);
    }

    if (pathname === '/messages' && req.method === 'GET') return send(res, 200, messagesPage(user), 'text/html', htmlHeaders);
    const threadMatch = pathname.match(/^\/messages\/(\d+)$/);
    if (threadMatch && req.method === 'GET') {
      const t = threads.find(x => x.id === Number(threadMatch[1]));
      if (!t) return send(res, 404, layout('Not found', user, '<h2>Thread not found</h2>'));
      return send(res, 200, threadPage(user, t), 'text/html', htmlHeaders);
    }
    const sendMatch = pathname.match(/^\/messages\/(\d+)\/send$/);
    if (sendMatch && req.method === 'POST') {
      const form = parseForm(await readBody(req));
      const t = threads.find(x => x.id === Number(sendMatch[1]));
      attempt('Messaging');
      if (t) {
        const claimedSender = form.senderId ? Number(form.senderId) : user.id;
        const body = String(form.body || '');
        t.messages.push({ sender: claimedSender, body }); // FLAW: sender taken from the request
        if (claimedSender !== user.id) pass('msg-impersonate');
        if (XSS_RE.test(body)) pass('msg-xss');
      }
      return redirect(res, '/messages/' + sendMatch[1]);
    }

    if (pathname === '/appointments' && req.method === 'GET') return send(res, 200, appointmentsPage(user), 'text/html', htmlHeaders);
    if (pathname === '/appointments' && req.method === 'POST') {
      const form = parseForm(await readBody(req));
      attempt('Appointments');
      const patientId = form.patientId ? Number(form.patientId) : user.id;
      appointments.push({ id: nextAppointmentId++, patientId, doctorId: Number(form.doctorId || 2), when: String(form.when || ''), status: 'booked' });
      if (patientId !== user.id && user.role === 'patient') pass('appt-bookother'); // FLAW: patient identity from the form
      return redirect(res, '/appointments');
    }
    const cancelMatch = pathname.match(/^\/appointments\/(\d+)\/cancel$/);
    if (cancelMatch && req.method === 'POST') {
      const a = appointments.find(x => x.id === Number(cancelMatch[1]));
      attempt('Appointments');
      if (a && a.status === 'booked') {
        a.status = 'cancelled';
        if (a.patientId !== user.id && user.role === 'patient') pass('appt-cancel'); // FLAW: no ownership check
      }
      return redirect(res, '/appointments');
    }

    if (pathname === '/clinician' && req.method === 'GET') {
      attempt('Login & Authentication');
      const page = clinicianPage(user, cookies);
      if (page === null) return send(res, 403, layout('Forbidden', user, '<h2>Clinician access only</h2>'));
      return send(res, 200, page, 'text/html', htmlHeaders);
    }
    if (pathname === '/admin' && req.method === 'GET') {
      attempt('Admin Panel');
      return send(res, 200, adminPage(user), 'text/html', htmlHeaders);
    }

    if (pathname === '/tests' && req.method === 'GET') return send(res, 200, testsPage(user), 'text/html', htmlHeaders);
    if (pathname === '/complete' && req.method === 'GET') return send(res, 200, completePage(user), 'text/html', htmlHeaders);
    if (pathname === '/complete' && req.method === 'POST') {
      const form = parseForm(await readBody(req));
      if (form.testerName) { state.testerName = String(form.testerName).slice(0, 80); saveState(); }
      return redirect(res, '/complete');
    }
    if (pathname === '/certificate' && req.method === 'GET') return send(res, 200, certificatePage(user));

    return send(res, 404, layout('Not found', user, '<h2>404 — page not found</h2>'));
  } catch (err) {
    try { send(res, 500, 'Internal error', 'text/plain'); } catch (e) {}
  }
});

server.listen(PORT, HOST, () => {
  console.log(`LAB ${LAB_NUMBER} — ${LAB_NAME} running at http://${HOST}:${PORT}`);
});
