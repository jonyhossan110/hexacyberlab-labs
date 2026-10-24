'use strict';
/*
 * HexaClinic — LAB 61 of the HexaCyberLab vulnerable-lab programme.
 * A deliberately vulnerable clinic management system for authorised,
 * local-only security training. Zero-dependency Node.js.
 * All patients, doctors and records are invented seed data.
 * Built by Md. Jony Hassain, Founder of HexaCyberLab.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB_NUMBER = 61;
const LAB_NAME = 'HexaClinic';
const PREV_LAB = 60;
const PORT = 3070;
const HOST = '127.0.0.1';
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const LOGO_FILE = path.join(DIR, 'logo.png');

/* ------------------------------------------------------------------ *
 * Entry key — stored ONLY as encoded shards (region 1 of 2).
 * The assembler lives elsewhere; the entry key is reconstructed
 * only inside the /unlock verification path.
 * ------------------------------------------------------------------ */
const ENTRY_SHARDS = ["TC1YSA==","Qy0xNg==","WTRRWQ==","LVFYOQ==","SVczMw==","SUg5MA=="];

/* ------------------------- Progress engine ------------------------ */
let progress = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const p = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      if (p && typeof p === 'object') progress = Object.assign(progress, p);
    }
  } catch (e) { /* corrupt state file -> start fresh, never crash */ }
}
function saveProgress() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2)); } catch (e) {}
}
loadProgress();

/* --------------------------- TESTS registry ------------------------ */
const TESTS = [
  /* ---------------- Login & Authentication ---------------- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03:2021 – Injection', difficulty: 'Beginner',
    hints: ['The login form builds its query by pasting your email straight into a string.', 'Try a classic tautology in the email field: a quote, OR, and a comparison that is always true.', "Email: ' OR '1'='1 — the app logs you in as the first matching account."],
    lesson: 'String-built queries let attacker input change the query logic itself; parameterised queries make input data-only.',
    impact: 'On a real clinic portal this means an attacker walks straight into the admin account — every patient record, prescription and bill is exposed in one request.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.' },
    guide: "Go to the login form and put this in the Email field: ' OR '1'='1 (any password). The query is built by string concatenation, so the condition is always true and you are logged in as the first account (the admin)." },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limiting or Lockout', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Keep guessing the same account\'s password — watch what does NOT happen.', 'There is no CAPTCHA, no delay and no lockout, however many times you fail.', 'Fail 10 logins in a row for one account; the 10th is still processed normally.'],
    lesson: 'Without throttling or lockout, password guessing is free and unlimited — weak passwords fall quickly.',
    impact: 'Attackers can grind through passwords for doctor and admin accounts overnight, then access the whole clinic system.',
    report: { title: 'Missing Brute-Force Protection on Login (No Rate Limit / Lockout)', severity: 'High', remediation: 'Add progressive delays, account lockout and alerting on repeated failed logins.' },
    guide: 'Pick one account (e.g. the demo patient) and submit 10 wrong passwords in a row. Nothing slows down or locks — the test passes when the 10th failure is still accepted for processing.' },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User Enumeration via Divergent Responses', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the forgot-password answer for an email that exists with one that does not.', 'The app is polite — too polite. One says a reset was sent; the other admits there is no account.', 'Submit 5 different emails to /forgot and collect the two different answers.'],
    lesson: 'Different responses for existing vs non-existing accounts hand attackers a valid-account list for targeted attacks.',
    impact: 'An attacker confirms which doctors and patients have accounts, then aims phishing and password attacks only at real targets.',
    report: { title: 'Account Enumeration via Password-Reset and Login Error Messages', severity: 'Medium', remediation: 'Return one identical, generic response for every reset/login attempt regardless of account existence.' },
    guide: 'Use the Forgot Password page. A registered email gets "reset link sent"; an unknown email gets a different "no account" message. Probe 5 distinct emails to map which accounts exist.' },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Demo Credentials Published on the Login Page', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Read the login page carefully — it tries to be helpful.', 'A demo account with its password is printed right under the form.', 'Just log in with the published demo patient credentials.'],
    lesson: 'Demo/default credentials left visible in production are an open door — attackers try them first.',
    impact: 'Anyone on the internet can sign in as a real patient and start exploring the clinic\'s data — no skill required.',
    report: { title: 'Demo Account Credentials Disclosed on the Public Login Page', severity: 'High', remediation: 'Remove demo credentials from production; disable default accounts or force unique passwords.' },
    guide: 'The login page prints a demo patient account under the form. Sign in with exactly those published credentials.' },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a reset for an account you control and look at the token pattern.', 'The token is computed from something you can see — the account\'s numeric id.', 'Token = HC followed by (user id × 137 + 42). Compute another user\'s token without ever requesting a reset for them.'],
    lesson: 'Reset tokens must be long, random and single-use; a formula based on public values is no secret at all.',
    impact: 'An attacker resets the clinic admin\'s password using only the admin\'s email and id — full takeover without touching the inbox.',
    report: { title: 'Password-Reset Tokens Are Predictable (Derived from User ID)', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), store hashed, expire quickly and allow single use.' },
    guide: 'Tokens follow a formula: HC + (userId × 137 + 42). User ids are visible in the app (admin is 1, patients are 5 and 6). Compute a token for an account you never requested a reset for and use it on the reset page.' },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Role Cookie Tampering — Client-Supplied Role Trusted', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['After logging in, inspect your cookies — one of them states your role.', 'The staff console believes that cookie instead of the server-side account.', 'Set the hx_role cookie to doctor (or admin) and open /staff.'],
    lesson: 'Authorization data must live server-side; anything stored on the client can be edited by the client.',
    impact: 'Any patient can promote themselves to "doctor" in their own browser and open staff-only screens full of patient data.',
    report: { title: 'Staff Console Trusts a Client-Supplied Role Cookie', severity: 'High', remediation: 'Derive roles from the server-side session record only; ignore role claims from cookies or request data.' },
    guide: 'Log in as the demo patient, then set your browser cookie hx_role=doctor (dev tools or curl -b). Open /staff — the staff console trusts the cookie, not your real account.' },

  /* ---------------- Registration & Profile ---------------- */
  { id: 'reg-weak', feature: 'Registration & Profile', name: 'Weak Password Policy — 1-Character Passwords Accepted', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a new account and be lazy with the password.', 'There is no minimum length at all.', 'A password of a single character (e.g. "x") is accepted.'],
    lesson: 'Password policy is the first line of defence; accepting 1-character passwords makes brute force trivial.',
    impact: 'Patients who pick tiny passwords get their medical accounts guessed in seconds.',
    report: { title: 'No Minimum Password Strength Enforced at Registration', severity: 'Medium', remediation: 'Enforce a minimum length (≥10–12) and block common/breached passwords at registration and reset.' },
    guide: 'Register a new account with a password of one character. The account is created and works — the policy accepts anything.' },
  { id: 'reg-mass', feature: 'Registration & Profile', name: 'Mass Assignment — Role Set at Registration', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration form shows name, email, password — the server accepts more than it shows.', 'What if the request also carried a role field?', 'Add role=doctor (or admin) to the registration POST and check your new powers.'],
    lesson: 'Bind only whitelisted fields from requests; blindly assigning every submitted field lets users grant themselves privileges.',
    impact: 'Anyone can register themselves as a doctor or admin of the clinic — instant insider access to all patient data.',
    report: { title: 'Mass Assignment in Registration Allows Self-Assignment of Privileged Roles', severity: 'Critical', remediation: 'Whitelist assignable fields server-side; set role explicitly in code, never from request data.' },
    guide: 'Intercept the registration POST and add a field role=doctor (or role=admin). The server binds every field it receives, so your new account is created with that role.' },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03:2021 – Injection', difficulty: 'Beginner',
    hints: ['Your display name is shown in the page header and in staff lists — exactly as typed.', 'Put a script payload where your name goes.', 'Register (or rename yourself) with a name like <script>alert(1)</script> and view a page that renders it.'],
    lesson: 'User-supplied text must be output-encoded everywhere it is rendered; one unescaped field poisons every viewer.',
    impact: 'A malicious "patient name" can run scripts in doctors\' browsers — stealing sessions and acting as the doctor.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-encode all user-supplied output; add a Content-Security-Policy as defence in depth.' },
    guide: 'Set your display name (registration or profile) to a payload such as <script>alert(1)</script>. It is stored and rendered unescaped in the header and staff views.' },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['The profile form changes your name and phone with a plain POST.', 'Nothing in the request proves it came from this site\'s own form.', 'POST the profile change from another origin (or without the site\'s origin marker) while logged in.'],
    lesson: 'State-changing requests need an unguessable CSRF token tied to the session; cookies alone are ambient authority.',
    impact: 'A booby-trapped page in a doctor\'s browser could silently change profile data (or worse) using their logged-in session.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require a per-session CSRF token on every state-changing request and validate Origin/Referer.' },
    guide: 'While logged in, send the profile-update POST from a different origin (curl with a foreign Origin header, or omit the site origin marker field). The change is applied — no CSRF token exists.' },

  /* ---------------- Appointments ---------------- */
  { id: 'appt-idor', feature: 'Appointments', name: 'Appointment IDOR — View Another Patient\'s Appointment', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: ['Your appointment detail page has a number in its URL.', 'Numbers are sequential. What is appointment 2?', 'Open /appointments/<id> for an appointment that is not yours.'],
    lesson: 'Every object access must check that the object belongs to the requester — hiding links is not authorization.',
    impact: 'Patients can browse who is seeing which doctor, when, and why — sensitive health information leaks one id at a time.',
    report: { title: 'Insecure Direct Object Reference on Appointment Details', severity: 'High', remediation: 'Enforce per-object ownership checks on the server for every appointment read.' },
    guide: 'Log in as the demo patient and open /appointments/3 — it belongs to another patient, yet it is served to you. Sequential ids make the whole book enumerable.' },
  { id: 'appt-cancel', feature: 'Appointments', name: 'Cancel Another Patient\'s Appointment', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['Viewing a stranger\'s appointment was possible. The cancel action trusts the same id.', 'POST the cancel action for an appointment that is not yours.', 'Cancel appointment 3 (another patient\'s) while logged in as the demo patient.'],
    lesson: 'Authorization checks must cover actions, not just views — a missing check on a destructive action is worse than a read leak.',
    impact: 'A malicious patient can cancel other people\'s doctor visits — disrupting care and the clinic\'s schedule.',
    report: { title: 'Missing Ownership Check Allows Cancelling Other Patients\' Appointments', severity: 'High', remediation: 'Verify ownership (or staff role) server-side before mutating any appointment.' },
    guide: 'As the demo patient, POST to /appointments/3/cancel. The appointment belongs to another patient but is cancelled anyway.' },
  { id: 'appt-bookfor', feature: 'Appointments', name: 'Book an Appointment Under Another Patient\'s Identity', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['The booking form hides a patientId field. The server trusts it.', 'Whose name ends up on the appointment if you change that field?', 'Book with patientId set to another patient (e.g. 2 instead of your own 1).'],
    lesson: 'Identity for created objects must come from the session, never from client-supplied fields.',
    impact: 'Attackers can flood another patient\'s record with fake bookings, or book visits in someone else\'s name.',
    report: { title: 'Booking Endpoint Trusts Client-Supplied patientId (Identity Forgery)', severity: 'High', remediation: 'Take the patient identity from the authenticated session; ignore patientId in request bodies.' },
    guide: 'Intercept the booking POST and change the patientId field to another patient\'s id (Karim is patient 2). The appointment is created in his name.' },
  { id: 'appt-overbook', feature: 'Appointments', name: 'Slot Overbooking — Capacity Limit Not Enforced', owasp: 'A04:2021 – Insecure Design', difficulty: 'Intermediate',
    hints: ['Each doctor time-slot fits 2 patients. Dr. Rahman\'s 09:00 slot on 2026-10-24 is already full.', 'The booking code never counts how many are already in the slot.', 'Book that same full slot for yourself — it is accepted as a third booking.'],
    lesson: 'Business invariants (capacity) must be enforced server-side at write time, ideally inside a transaction.',
    impact: 'Double- and triple-booked doctors, waiting-room chaos and patients turned away — the schedule stops being trustworthy.',
    report: { title: 'Appointment Slot Capacity Is Not Enforced Server-Side', severity: 'Medium', remediation: 'Check slot occupancy in the booking transaction and reject bookings beyond capacity.' },
    guide: 'Dr. Rahman, 2026-10-24, 09:00 already has 2 appointments (the slot capacity). Book it again — the system accepts a third booking for the same slot.' },

  /* ---------------- Medical Records ---------------- */
  { id: 'rec-idor', feature: 'Medical Records', name: 'Medical Record IDOR — Read Another Patient\'s Record', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: ['Your medical record lives at /records/<id>.', 'Record ids are sequential, and no ownership check stands behind them.', 'Open /records/2 — another patient\'s diagnosis, allergies and notes.'],
    lesson: 'Medical records are among the most sensitive data a system holds; per-object authorization is non-negotiable.',
    impact: 'Diagnoses, allergies and doctor notes of every patient readable by any patient — a reportable privacy breach for a real clinic.',
    report: { title: 'Insecure Direct Object Reference Exposes Patient Medical Records', severity: 'Critical', remediation: 'Check record ownership / care-team membership server-side on every record access.' },
    guide: 'As the demo patient, open /records/2. It is Karim\'s record — diagnosis, allergies and clinical notes — served without any ownership check.' },
  { id: 'rec-edit', feature: 'Medical Records', name: 'Patient Edits Doctor-Only Diagnosis', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['The record-edit endpoint exists for doctors. Who else can POST to it?', 'Function-level authorization is missing — only the button is hidden.', 'As a patient, POST a new diagnosis to /records/<your id>/edit.'],
    lesson: 'Hiding a UI control is not access control; the server must verify the role for every privileged function.',
    impact: 'A patient rewriting their own diagnosis or notes corrupts clinical data that doctors rely on to treat them.',
    report: { title: 'Broken Function-Level Authorization — Patients Can Edit Clinical Diagnoses', severity: 'High', remediation: 'Enforce doctor-role checks server-side on all clinical write endpoints.' },
    guide: 'While logged in as a patient, POST to /records/1/edit with a new diagnosis field. The endpoint never checks that you are a doctor, and the record changes.' },
  { id: 'rec-export', feature: 'Medical Records', name: 'Full Records Export Open to Any Logged-In Account', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['Staff have a CSV export of all records. Its URL is guessable: /records/export.', 'The export checks that you are logged in — nothing more.', 'Download /records/export as a patient and read everyone\'s records at once.'],
    lesson: 'Bulk-export endpoints are the highest-value targets; they need the strictest role checks and audit logging.',
    impact: 'One click downloads the entire clinic\'s patient records — the worst-case breach in a single request.',
    report: { title: 'Sensitive Bulk Export (All Patient Records) Missing Role Authorization', severity: 'Critical', remediation: 'Restrict exports to admin role, log every export, and alert on bulk downloads.' },
    guide: 'As any patient account, open /records/export. You receive a CSV containing every patient\'s record — an admin/staff function with no role check.' },

  /* ---------------- Prescriptions ---------------- */
  { id: 'rx-idor', feature: 'Prescriptions', name: 'Prescription IDOR — View Another Patient\'s Prescription', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: ['Prescriptions live at /prescriptions/<id>, sequential as usual.', 'Medication details are sensitive, too.', 'Open /prescriptions/2 as the demo patient — it is Karim\'s.'],
    lesson: 'The same missing ownership check repeats across features; authorization must be systematic, not per-page luck.',
    impact: 'Medication lists reveal conditions patients may never have disclosed — a serious privacy violation.',
    report: { title: 'Insecure Direct Object Reference on Prescription Details', severity: 'High', remediation: 'Enforce ownership/care-team checks on every prescription read.' },
    guide: 'Log in as the demo patient and open /prescriptions/2 to read another patient\'s medication and dosage.' },
  { id: 'rx-self', feature: 'Prescriptions', name: 'Patient Issues Their Own Prescription', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['Doctors create prescriptions at /prescriptions/new. The server never asks if you are one.', 'Try it as a patient: prescribe anything to yourself.', 'POST a new prescription for yourself while logged in as the demo patient.'],
    lesson: 'Privileged clinical actions must verify role server-side; a prescription is a legal document, not a form field.',
    impact: 'Patients self-prescribing medication through the clinic\'s own system — dangerous and, for the clinic, a severe compliance failure.',
    report: { title: 'Broken Function-Level Authorization — Patients Can Create Prescriptions', severity: 'Critical', remediation: 'Require the doctor role server-side for prescription creation; audit all issuances.' },
    guide: 'As the demo patient, POST to /prescriptions/new with your own patientId, any medicine and dosage. It is saved as an official prescription.' },

  /* ---------------- Schedules & Staff ---------------- */
  { id: 'sched-edit', feature: 'Schedules & Staff', name: 'Patient Modifies a Doctor\'s Schedule', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['Reception manages doctor availability at /schedules/update.', 'The endpoint checks login, not job title.', 'As a patient, POST a schedule change — mark a doctor off duty or change their hours.'],
    lesson: 'Staff functions need role checks on the server; shared endpoints invite abuse from every account type.',
    impact: 'An attacker can erase a doctor\'s whole day — appointments vanish and the clinic grinds to a halt.',
    report: { title: 'Missing Role Check Allows Patients to Alter Doctor Schedules', severity: 'High', remediation: 'Restrict schedule writes to receptionist/admin roles server-side.' },
    guide: 'Logged in as a patient, POST to /schedules/update for Dr. Rahman with a new status. The schedule changes — no staff role required.' },
  { id: 'sched-checkin', feature: 'Schedules & Staff', name: 'Patient Performs Receptionist Check-In', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['Reception checks patients in via /appointments/<id>/checkin.', 'Again: login required, role never verified.', 'Check in an appointment while logged in as a patient.'],
    lesson: 'Workflow state transitions are privileged actions; each transition needs its own authorization check.',
    impact: 'Fake check-ins corrupt the day\'s workflow — billing, queues and doctor time all key off this state.',
    report: { title: 'Receptionist Check-In Function Callable by Patients', severity: 'Medium', remediation: 'Verify receptionist/staff role server-side for every workflow transition.' },
    guide: 'As a patient, POST to /appointments/4/checkin. The appointment flips to checked-in although only reception should do that.' },

  /* ---------------- Billing ---------------- */
  { id: 'bill-idor', feature: 'Billing', name: 'Bill IDOR — View Another Patient\'s Bill', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: ['Bills live at /bills/<id> with sequential ids.', 'You already know this pattern — it applies here too.', 'Open /bills/2 as the demo patient.'],
    lesson: 'Financial documents need the same per-object authorization as clinical ones.',
    impact: 'Patients can see what others were charged and for which treatments — financial and medical privacy leak together.',
    report: { title: 'Insecure Direct Object Reference on Billing Details', severity: 'High', remediation: 'Enforce bill ownership checks server-side on every read.' },
    guide: 'As the demo patient, open /bills/2 — Karim\'s bill, served without an ownership check.' },
  { id: 'bill-tamper', feature: 'Billing', name: 'Bill Payment Amount Tampering — Settles in Full for $1', owasp: 'A04:2021 – Insecure Design', difficulty: 'Beginner',
    hints: ['The pay form sends the amount as a field. The server trusts it completely.', 'What does the server actually verify before marking a bill PAID?', 'Pay bill 1 with amount=1 — the $80 bill is marked fully paid.'],
    lesson: 'Payment state must be derived from server-side amounts and verified transactions, never from client-supplied figures.',
    impact: 'Every patient can settle every bill for $1 — direct revenue loss for the clinic.',
    report: { title: 'Payment Amount Trusted from Client Allows Settling Bills for $1', severity: 'High', remediation: 'Compute payable amounts server-side from the bill record; reconcile with the payment provider before marking paid.' },
    guide: 'Open your unpaid bill ($80) and intercept the pay POST: change amount to 1. The bill is marked PAID in full.' },

  /* ---------------- Admin Panel ---------------- */
  { id: 'admin-bac', feature: 'Admin Panel', name: 'Admin Panel Open to Any Logged-In User', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: ['Try /admin while logged in as a plain patient.', 'The handler simply forgot the role check.', 'The full user list — emails and roles — renders for anyone with a session.'],
    lesson: 'Every privileged route needs an explicit server-side role check; "nobody will guess the URL" is not a control.',
    impact: 'Any patient can open the admin console and browse every account in the clinic system.',
    report: { title: 'Broken Access Control — Admin Console Accessible to Non-Admin Users', severity: 'High', remediation: 'Add a server-side admin-role gate to every /admin route.' },
    guide: 'Log in as the demo patient and open /admin. The admin console renders — it never checks your role.' },
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'CSRF on Admin User Deactivation', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: ['Admins can deactivate users with a POST. No token protects it.', 'An admin browsing a malicious page while logged in is enough.', 'POST /admin/users/<id>/deactivate from a foreign origin with no site marker.'],
    lesson: 'Admin actions are the most dangerous CSRF targets; they need tokens and re-confirmation for destructive operations.',
    impact: 'One booby-trapped page could deactivate the clinic\'s doctors and staff — a denial of service against the whole practice.',
    report: { title: 'Missing CSRF Protection on Administrative User Deactivation', severity: 'High', remediation: 'Require per-session CSRF tokens on all admin state changes; add confirmation for destructive actions.' },
    guide: 'Send the deactivation POST for a user from a foreign Origin (or without the site\'s origin marker) using an admin-capable session. The user is deactivated — no CSRF token exists.' },

  /* ---------------- Platform & API ---------------- */
  { id: 'plat-debug', feature: 'Platform & API', name: 'Unauthenticated Debug Endpoint Exposes All Accounts', owasp: 'A05:2021 – Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Developers leave helpers behind. Try /api/debug.', 'No login is needed at all.', 'The JSON includes every user — with passwords.'],
    lesson: 'Debug/diagnostic endpoints must never ship to production; if they must exist, they need auth and must never include secrets.',
    impact: 'The entire clinic\'s credentials — admin included — are one unauthenticated request away. Game over.',
    report: { title: 'Debug Endpoint Exposes User Accounts Including Plaintext Passwords Without Authentication', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; never store or return plaintext passwords.' },
    guide: 'Open /api/debug in a browser with no session at all. It dumps every user account including passwords as JSON.' }
];

/* ----------------------------- Seed data --------------------------- *
 * Everything below is invented demo data for local training only.   */
const SLOT_CAP = 2; // patients per doctor time-slot
let users = [
  { id: 1, email: 'admin@hexaclinic.local',     password: 'admin123',   name: 'Clinic Admin',   role: 'admin' },
  { id: 2, email: 'dr.rahman@hexaclinic.local', password: 'doctor123',  name: 'Dr. Ayesha Rahman', role: 'doctor' },
  { id: 3, email: 'dr.smith@hexaclinic.local',  password: 'doctor123',  name: 'Dr. John Smith', role: 'doctor' },
  { id: 4, email: 'desk@hexaclinic.local',      password: 'desk123',    name: 'Rita Reception', role: 'receptionist' },
  { id: 5, email: 'patient@hexaclinic.local',   password: 'patient123', name: 'Alice Hossain',  role: 'patient', patientId: 1 },
  { id: 6, email: 'karim@hexaclinic.local',     password: 'karim123',   name: 'Karim Uddin',    role: 'patient', patientId: 2 }
];
let patients = [
  { id: 1, name: 'Alice Hossain',    dob: '1992-04-12', phone: '01710000001' },
  { id: 2, name: 'Karim Uddin',      dob: '1988-09-03', phone: '01710000002' },
  { id: 3, name: 'Nabila Chowdhury', dob: '1995-01-27', phone: '01710000003' }
];
let doctors = [
  { id: 1, userId: 2, name: 'Dr. Ayesha Rahman', specialty: 'Cardiology',  fee: 80 },
  { id: 2, userId: 3, name: 'Dr. John Smith',    specialty: 'Dermatology', fee: 60 }
];
let schedules = [
  { doctorId: 1, days: 'Mon–Fri', hours: '09:00–13:00', status: 'Available' },
  { doctorId: 2, days: 'Mon–Thu', hours: '10:00–14:00', status: 'Available' }
];
let appointments = [
  { id: 1, patientId: 1, doctorId: 1, date: '2026-10-24', time: '09:00', reason: 'Chest discomfort review', status: 'booked' },
  { id: 2, patientId: 2, doctorId: 1, date: '2026-10-24', time: '09:00', reason: 'Blood pressure check',    status: 'booked' },
  { id: 3, patientId: 2, doctorId: 2, date: '2026-10-25', time: '10:00', reason: 'Skin rash consultation',  status: 'booked' },
  { id: 4, patientId: 1, doctorId: 2, date: '2026-10-26', time: '11:00', reason: 'Mole examination',        status: 'booked' }
];
let records = [
  { id: 1, patientId: 1, doctorId: 1, diagnosis: 'Migraine',          allergies: 'Penicillin',  notes: 'Recurring migraines since 2024; responds well to sumatriptan.' },
  { id: 2, patientId: 2, doctorId: 1, diagnosis: 'Type 2 Diabetes',   allergies: 'None known',  notes: 'HbA1c 7.1 at last visit; dietary review in 3 months.' },
  { id: 3, patientId: 3, doctorId: 2, diagnosis: 'Hypertension',      allergies: 'Sulfa drugs', notes: 'On amlodipine 5mg daily; BP stable.' }
];
let prescriptions = [
  { id: 1, patientId: 1, doctorId: 1, medicine: 'Sumatriptan', dosage: '50mg', instructions: 'One tablet at onset of migraine', date: '2026-10-20' },
  { id: 2, patientId: 2, doctorId: 1, medicine: 'Metformin',   dosage: '500mg', instructions: 'Twice daily with meals',        date: '2026-10-18' }
];
let bills = [
  { id: 1, patientId: 1, appointmentId: 1, amount: 80,  status: 'unpaid', paidAmount: 0 },
  { id: 2, patientId: 2, appointmentId: 3, amount: 120, status: 'unpaid', paidAmount: 0 },
  { id: 3, patientId: 1, appointmentId: 4, amount: 60,  status: 'paid',   paidAmount: 60 }
];
let nextIds = { user: 7, appointment: 5, record: 4, prescription: 3, bill: 4 };

const sessions = new Map();           // sid -> userId
const failCount = {};                 // email -> consecutive failed logins
const forgotProbes = new Set();       // distinct emails probed at /forgot
const issuedTokens = {};              // email -> reset token actually issued

/* ------------------------------ Helpers ---------------------------- */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const XSS_RE = /(<script|<svg|<img|<iframe|<body|on\w+\s*=|javascript:)/i;
const SQLI_RE = /'\s*(or|and)\s+('?\w+'?\s*=\s*'?\w+'?)/i;
function hasXss(s) { return typeof s === 'string' && XSS_RE.test(s); }

function assembleKey(shards) {
  return shards.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}
function resetTokenFor(user) { return 'HC' + (user.id * 137 + 42); }

function totalTests() { return TESTS.length; }
function doneCount() { return TESTS.filter(t => progress.tests[t.id]).length; }
function pct() { const t = totalTests(); return t ? Math.floor(doneCount() / t * 100) : 0; }
function isComplete() { return doneCount() === totalTests(); }
function pass(id) {
  if (!progress.tests[id]) {
    progress.tests[id] = true;
    if (isComplete() && !progress.completedAt) {
      progress.completedAt = new Date().toISOString();
      progress.keyRevealed = true;
    }
    saveProgress();
  }
}
function attempt(feature) {
  progress.attempts[feature] = (progress.attempts[feature] || 0) + 1;
  saveProgress();
}
function featuresSummary() {
  const out = {};
  for (const t of TESTS) {
    if (!out[t.feature]) out[t.feature] = { total: 0, done: 0, attempts: progress.attempts[t.feature] || 0 };
    out[t.feature].total++;
    if (progress.tests[t.id]) out[t.feature].done++;
    out[t.feature].attempts = progress.attempts[t.feature] || 0;
  }
  return out;
}
function patientName(id) { const p = patients.find(x => x.id === id); return p ? p.name : 'Patient #' + id; }
function doctorName(id) { const d = doctors.find(x => x.id === id); return d ? d.name : 'Doctor #' + id; }

function parseCookies(req) {
  const out = {};
  const h = req.headers.cookie || '';
  for (const part of h.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function sessionUser(req) {
  const c = parseCookies(req);
  if (c.hx_session && sessions.has(c.hx_session)) {
    return users.find(u => u.id === sessions.get(c.hx_session)) || null;
  }
  return null;
}
function newSession(res, user) {
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, user.id);
  res.setHeader('Set-Cookie', [
    'hx_session=' + sid + '; Path=/; HttpOnly',
    'hx_role=' + user.role + '; Path=/',
    'hx_origin=hx; Path=/'
  ]);
}
function parseBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', ch => { data += ch; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = (req.headers['content-type'] || '');
      if (ct.includes('application/json')) {
        try { return resolve(JSON.parse(data || '{}')); } catch (e) { return resolve({}); }
      }
      const out = {};
      try {
        for (const pair of data.split('&')) {
          if (!pair) continue;
          const i = pair.indexOf('=');
          const k = decodeURIComponent(pair.slice(0, i).replace(/\+/g, ' '));
          const v = decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' '));
          out[k] = v;
        }
      } catch (e) { /* malformed body -> empty object, never crash */ }
      resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}
/* CSRF proof per spec: a state change arrives without the site's own
 * origin marker (every genuine form on this site includes _origin=hx). */
function isCsrf(req, body) {
  const origin = req.headers.origin || req.headers.referer || '';
  const foreign = origin && !/127\.0\.0\.1:3070|localhost:3070/.test(origin);
  return foreign || !body || body._origin !== 'hx';
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }

/* ------------------------------ UI --------------------------------- */
function progressBar() {
  const d = doneCount(), t = totalTests(), p = pct();
  return '<div style="background:#23232f;border-radius:8px;padding:8px 12px;margin:10px 0">' +
    '<div style="font-size:13px;color:#cfcfe0">LAB ' + LAB_NUMBER + ' · ' + d + '/' + t + ' tests · ' + p + '%</div>' +
    '<div style="background:#3a3a4d;border-radius:5px;height:10px;margin-top:5px"><div style="background:#7c5cff;height:10px;border-radius:5px;width:' + p + '%"></div></div></div>';
}
function chatWidget() {
  return '<div id="hxchat" style="position:fixed;right:14px;bottom:14px;width:300px;background:#1d1d29;border:1px solid #444;border-radius:10px;color:#eee;font-family:Arial;z-index:50">' +
    '<div style="padding:8px 12px;background:#7c5cff;border-radius:10px 10px 0 0;font-weight:bold">Lab Coach</div>' +
    '<div id="hxlog" style="height:170px;overflow:auto;padding:8px;font-size:13px"></div>' +
    '<div style="display:flex"><input id="hxin" style="flex:1;padding:7px;background:#11111a;color:#eee;border:1px solid #444" placeholder="Ask the coach…">' +
    '<button onclick="hxsend()" style="padding:7px 12px;background:#7c5cff;color:#fff;border:0">Send</button></div></div>' +
    '<script>async function hxsend(){var i=document.getElementById("hxin"),l=document.getElementById("hxlog");var m=i.value.trim();if(!m)return;i.value="";l.innerHTML+="<div><b>You:</b> "+m.replace(/</g,"&lt;")+"</div>";try{var r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:m})});var j=await r.json();l.innerHTML+="<div style=\\"margin:4px 0\\"><b>Coach:</b> "+(j.reply||"").replace(/</g,"&lt;")+"</div>";}catch(e){l.innerHTML+="<div><b>Coach:</b> I could not answer just now.</div>";}l.scrollTop=l.scrollHeight;}' +
    'document.getElementById("hxin").addEventListener("keydown",function(e){if(e.key==="Enter")hxsend();});</script>';
}
function layout(user, title, bodyHtml) {
  const nav = user
    ? '<nav style="margin:8px 0;font-size:14px"><a href="/">Dashboard</a> · <a href="/appointments">Appointments</a> · <a href="/book">Book</a> · <a href="/records">Medical Records</a> · <a href="/prescriptions">Prescriptions</a> · <a href="/schedules">Schedules</a> · <a href="/bills">Bills</a> · <a href="/tests">Mission Board</a> · <a href="/profile">Profile</a> · <a href="/logout">Logout</a></nav>'
    : '<nav style="margin:8px 0;font-size:14px"><a href="/login">Login</a> · <a href="/register">Register</a> · <a href="/tests">Mission Board</a></nav>';
  // NOTE (intentional flaw): the greeting renders the display name UNESCAPED (stored-XSS vector).
  const greet = user ? '<div style="font-size:14px">Signed in as <b>' + user.name + '</b> (' + esc(user.role) + ')</div>' : '';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + ' · LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</title></head>' +
    '<body style="margin:0;background:#14141d;font-family:Arial,sans-serif;color:#222"><div style="max-width:860px;margin:24px auto;background:#fff;border-radius:12px;padding:24px 28px">' +
    '<div style="display:flex;align-items:center;gap:12px"><img src="/logo.png" style="height:44px"><h2 style="margin:0">LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h2></div>' +
    progressBar() + nav + greet + bodyHtml + '</div>' + chatWidget() + '</body></html>';
}
function gatePage(msg) {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' · Locked</title></head>' +
    '<body style="margin:0;background:#14141d;font-family:Arial,sans-serif"><div style="max-width:520px;margin:60px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:28px;text-align:center">' +
    '<img src="/logo.png" style="height:56px"><h2>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h2>' +
    '<p>This lab is locked. Paste the completion key from Lab ' + PREV_LAB + ' to start.</p>' +
    (msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/unlock"><input name="key" style="padding:9px;width:80%" placeholder="Completion key from Lab ' + PREV_LAB + '"><br><br>' +
    '<button style="padding:10px 22px">Unlock LAB ' + LAB_NUMBER + '</button></form></div>' + chatWidget() + '</body></html>';
}
function loginPage(msg) {
  return layout(null, 'Login',
    '<h3>Login</h3>' + (msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/login"><label>Email<br><input name="email" style="padding:8px;width:60%"></label><br><br>' +
    '<label>Password<br><input name="password" type="password" style="padding:8px;width:60%"></label><br><br>' +
    '<button style="padding:9px 20px">Login</button></form>' +
    '<p><a href="/forgot">Forgot password?</a> · <a href="/register">Create an account</a></p>' +
    '<div style="background:#fff8e1;border:1px solid #e0c97f;border-radius:8px;padding:10px 14px;font-size:14px"><b>Demo patient account</b><br>Email: patient@hexaclinic.local<br>Password: patient123</div>');
}
function registerPage(msg) {
  return layout(null, 'Register',
    '<h3>Create an account</h3>' + (msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/register"><label>Full name<br><input name="name" style="padding:8px;width:60%"></label><br><br>' +
    '<label>Email<br><input name="email" style="padding:8px;width:60%"></label><br><br>' +
    '<label>Password<br><input name="password" type="password" style="padding:8px;width:60%"></label><br><br>' +
    '<input type="hidden" name="_origin" value="hx"><button style="padding:9px 20px">Register</button></form>');
}
function forgotPage(msg) {
  return layout(null, 'Forgot password',
    '<h3>Forgot password</h3>' + (msg ? '<p>' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/forgot"><label>Email<br><input name="email" style="padding:8px;width:60%"></label><br><br>' +
    '<button style="padding:9px 20px">Send reset link</button></form><p><a href="/login">Back to login</a></p>');
}
function resetPage(email, msg) {
  return layout(null, 'Reset password',
    '<h3>Reset password</h3>' + (msg ? '<p style="color:#b00">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/reset"><input type="hidden" name="email" value="' + esc(email) + '">' +
    '<label>Reset token<br><input name="token" style="padding:8px;width:60%"></label><br><br>' +
    '<label>New password<br><input name="newpassword" type="password" style="padding:8px;width:60%"></label><br><br>' +
    '<button style="padding:9px 20px">Set new password</button></form>');
}
function dashboardPage(user) {
  let mine = '';
  if (user.role === 'patient') {
    const list = appointments.filter(a => a.patientId === user.patientId);
    mine = '<h4>Your upcoming appointments</h4>' + (list.length
      ? '<ul>' + list.map(a => '<li><a href="/appointments/' + a.id + '">' + esc(a.date) + ' ' + esc(a.time) + ' — ' + esc(doctorName(a.doctorId)) + '</a> (' + esc(a.status) + ')</li>').join('') + '</ul>'
      : '<p>No appointments yet.</p>');
  } else {
    mine = '<p>Today: ' + appointments.filter(a => a.status === 'booked').length + ' booked appointments across the clinic.</p>';
  }
  return layout(user, 'Dashboard', '<h3>Welcome to HexaClinic</h3><p>Book appointments, view medical records, prescriptions and bills.</p>' + mine +
    '<p>Training: open the <a href="/tests">Mission Board</a> to see the security tests for this lab.</p>');
}
function appointmentsPage(user) {
  const list = user.role === 'patient' ? appointments.filter(a => a.patientId === user.patientId) : appointments;
  return layout(user, 'Appointments', '<h3>Appointments</h3><ul>' +
    list.map(a => '<li><a href="/appointments/' + a.id + '">#' + a.id + ' — ' + esc(patientName(a.patientId)) + ' with ' + esc(doctorName(a.doctorId)) + ', ' + esc(a.date) + ' ' + esc(a.time) + '</a> (' + esc(a.status) + ')</li>').join('') +
    '</ul><p><a href="/book">Book a new appointment</a></p>');
}
function appointmentDetailPage(user, a) {
  const staff = ['receptionist', 'doctor', 'admin'].includes(user.role);
  return layout(user, 'Appointment #' + a.id,
    '<h3>Appointment #' + a.id + '</h3>' +
    '<p><b>Patient:</b> ' + esc(patientName(a.patientId)) + '<br><b>Doctor:</b> ' + esc(doctorName(a.doctorId)) + '<br><b>When:</b> ' + esc(a.date) + ' ' + esc(a.time) + '<br><b>Reason:</b> ' + esc(a.reason) + '<br><b>Status:</b> ' + esc(a.status) + '</p>' +
    '<form method="POST" action="/appointments/' + a.id + '/cancel"><input type="hidden" name="_origin" value="hx"><button>Cancel this appointment</button></form>' +
    (staff ? '<form method="POST" action="/appointments/' + a.id + '/checkin" style="margin-top:8px"><input type="hidden" name="_origin" value="hx"><button>Reception: check patient in</button></form>' : '') +
    '<p><a href="/appointments">Back to appointments</a></p>');
}
function bookPage(user) {
  const pid = user.role === 'patient' ? user.patientId : 1;
  return layout(user, 'Book appointment',
    '<h3>Book an appointment</h3><form method="POST" action="/appointments/book">' +
    '<input type="hidden" name="patientId" value="' + pid + '"><input type="hidden" name="_origin" value="hx">' +
    '<label>Doctor<br><select name="doctorId">' + doctors.map(d => '<option value="' + d.id + '">' + esc(d.name) + ' — ' + esc(d.specialty) + ' ($' + d.fee + ')</option>').join('') + '</select></label><br><br>' +
    '<label>Date<br><input name="date" value="2026-10-24" style="padding:8px"></label><br><br>' +
    '<label>Time<br><input name="time" value="09:00" style="padding:8px"></label><br><br>' +
    '<label>Reason<br><input name="reason" style="padding:8px;width:60%"></label><br><br>' +
    '<button style="padding:9px 20px">Book</button></form>');
}
function recordsPage(user) {
  const list = user.role === 'patient' ? records.filter(r => r.patientId === user.patientId) : records;
  return layout(user, 'Medical Records', '<h3>Medical Records</h3><ul>' +
    list.map(r => '<li><a href="/records/' + r.id + '">Record #' + r.id + ' — ' + esc(patientName(r.patientId)) + ': ' + esc(r.diagnosis) + '</a></li>').join('') +
    '</ul>' + (user.role !== 'patient' ? '<p><a href="/records/export">Export all records (CSV)</a></p>' : ''));
}
function recordDetailPage(user, r) {
  const edit = user.role === 'doctor' || user.role === 'admin'
    ? '<h4>Update record (doctors)</h4><form method="POST" action="/records/' + r.id + '/edit"><input type="hidden" name="_origin" value="hx">' +
      '<label>Diagnosis<br><input name="diagnosis" value="' + esc(r.diagnosis) + '" style="padding:8px;width:60%"></label><br><br>' +
      '<label>Notes<br><input name="notes" value="' + esc(r.notes) + '" style="padding:8px;width:60%"></label><br><br><button>Save record</button></form>' : '';
  return layout(user, 'Record #' + r.id,
    '<h3>Medical Record #' + r.id + '</h3><p><b>Patient:</b> ' + esc(patientName(r.patientId)) + '<br><b>Diagnosis:</b> ' + esc(r.diagnosis) +
    '<br><b>Allergies:</b> ' + esc(r.allergies) + '<br><b>Doctor notes:</b> ' + esc(r.notes) + '</p>' + edit +
    '<p><a href="/records">Back to records</a></p>');
}
function prescriptionsPage(user) {
  const list = user.role === 'patient' ? prescriptions.filter(p => p.patientId === user.patientId) : prescriptions;
  return layout(user, 'Prescriptions', '<h3>Prescriptions</h3><ul>' +
    list.map(p => '<li><a href="/prescriptions/' + p.id + '">#' + p.id + ' — ' + esc(p.medicine) + ' ' + esc(p.dosage) + ' for ' + esc(patientName(p.patientId)) + '</a></li>').join('') +
    '</ul>' + (user.role === 'doctor' || user.role === 'admin' ? '<p><a href="/prescriptions/new">Issue a new prescription</a></p>' : ''));
}
function prescriptionDetailPage(user, p) {
  return layout(user, 'Prescription #' + p.id,
    '<h3>Prescription #' + p.id + '</h3><p><b>Patient:</b> ' + esc(patientName(p.patientId)) + '<br><b>Issued by:</b> ' + esc(doctorName(p.doctorId)) +
    '<br><b>Medicine:</b> ' + esc(p.medicine) + ' ' + esc(p.dosage) + '<br><b>Instructions:</b> ' + esc(p.instructions) + '<br><b>Date:</b> ' + esc(p.date) + '</p>' +
    '<p><a href="/prescriptions">Back to prescriptions</a></p>');
}
function prescriptionNewPage(user) {
  return layout(user, 'New prescription',
    '<h3>Issue a prescription (doctors)</h3><form method="POST" action="/prescriptions/new"><input type="hidden" name="_origin" value="hx">' +
    '<label>Patient<br><select name="patientId">' + patients.map(p => '<option value="' + p.id + '">' + esc(p.name) + '</option>').join('') + '</select></label><br><br>' +
    '<label>Medicine<br><input name="medicine" style="padding:8px;width:50%"></label><br><br>' +
    '<label>Dosage<br><input name="dosage" style="padding:8px"></label><br><br>' +
    '<label>Instructions<br><input name="instructions" style="padding:8px;width:50%"></label><br><br>' +
    '<button style="padding:9px 20px">Issue prescription</button></form>');
}
function schedulesPage(user) {
  const form = (user.role === 'receptionist' || user.role === 'admin')
    ? '<h4>Update schedule (reception)</h4><form method="POST" action="/schedules/update"><input type="hidden" name="_origin" value="hx">' +
      '<label>Doctor<br><select name="doctorId">' + doctors.map(d => '<option value="' + d.id + '">' + esc(d.name) + '</option>').join('') + '</select></label><br><br>' +
      '<label>Days<br><input name="days" style="padding:8px"></label><br><br><label>Hours<br><input name="hours" style="padding:8px"></label><br><br>' +
      '<label>Status<br><input name="status" style="padding:8px"></label><br><br><button>Save schedule</button></form>' : '';
  return layout(user, 'Schedules', '<h3>Doctor Schedules</h3>' +
    schedules.map(s => '<p><b>' + esc(doctorName(s.doctorId)) + '</b> — ' + esc(s.days) + ', ' + esc(s.hours) + ' (' + esc(s.status) + ')</p>').join('') + form);
}
function billsPage(user) {
  const list = user.role === 'patient' ? bills.filter(b => b.patientId === user.patientId) : bills;
  return layout(user, 'Bills', '<h3>Bills</h3><ul>' +
    list.map(b => '<li><a href="/bills/' + b.id + '">Bill #' + b.id + ' — ' + esc(patientName(b.patientId)) + ': $' + b.amount + '</a> (' + esc(b.status) + ')</li>').join('') + '</ul>');
}
function billDetailPage(user, b) {
  const pay = b.status !== 'paid'
    ? '<form method="POST" action="/bills/' + b.id + '/pay"><input type="hidden" name="_origin" value="hx">' +
      '<label>Amount to pay ($)<br><input name="amount" value="' + b.amount + '" style="padding:8px"></label><br><br><button>Pay now</button></form>' : '<p>Paid in full.</p>';
  return layout(user, 'Bill #' + b.id,
    '<h3>Bill #' + b.id + '</h3><p><b>Patient:</b> ' + esc(patientName(b.patientId)) + '<br><b>Amount:</b> $' + b.amount +
    '<br><b>Status:</b> ' + esc(b.status) + '<br><b>Paid so far:</b> $' + b.paidAmount + '</p>' + pay);
}
function profilePage(user, msg) {
  return layout(user, 'Profile', '<h3>Your profile</h3>' + (msg ? '<p>' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/profile"><input type="hidden" name="_origin" value="hx">' +
    '<label>Display name<br><input name="name" value="' + esc(user.name) + '" style="padding:8px;width:60%"></label><br><br>' +
    '<label>Phone<br><input name="phone" style="padding:8px;width:60%"></label><br><br><button>Save profile</button></form>');
}
function staffPage(user) {
  // NOTE (intentional flaw): patient names rendered UNESCAPED here too.
  return layout(user, 'Staff Console', '<h3>Staff Console — Patients</h3><ul>' +
    patients.map(p => '<li>' + p.name + ' — DOB ' + esc(p.dob) + ' — ' + esc(p.phone) + '</li>').join('') + '</ul>' +
    '<p>Total appointments today: ' + appointments.length + '</p>');
}
function adminPage(user) {
  // NOTE (intentional flaw): user names rendered UNESCAPED in the admin list.
  return layout(user, 'Admin Panel', '<h3>Admin Panel — Users</h3><table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Action</th></tr>' +
    users.map(u => '<tr><td>' + u.id + '</td><td>' + u.name + '</td><td>' + esc(u.email) + '</td><td>' + esc(u.role) + '</td>' +
      '<td><form method="POST" action="/admin/users/' + u.id + '/deactivate"><input type="hidden" name="_origin" value="hx"><button>Deactivate</button></form></td></tr>').join('') + '</table>');
}
function testsPage(user) {
  const fs2 = featuresSummary();
  let html = '<h3>Mission Board — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h3><p>' + doneCount() + ' of ' + totalTests() + ' tests complete (' + pct() + '%).</p>';
  for (const fname of Object.keys(fs2)) {
    html += '<h4>' + esc(fname) + ' — ' + fs2[fname].done + '/' + fs2[fname].total + ' done · attempts: ' + fs2[fname].attempts + '</h4>';
    for (const t of TESTS.filter(x => x.feature === fname)) {
      const done = progress.tests[t.id];
      html += '<div style="border:1px solid #ddd;border-radius:8px;padding:10px 14px;margin:8px 0"><b>' + (done ? '✓' : '○') + ' ' + esc(t.name) + '</b> ' +
        '<span style="color:#666">(' + esc(t.owasp) + ' · ' + esc(t.difficulty) + ')</span>' +
        t.hints.map((h, i) => '<details><summary>Hint ' + (i + 1) + '</summary><p>' + esc(h) + '</p></details>').join('') + '</div>';
    }
  }
  if (isComplete()) html += '<p><b>Lab complete!</b> Open your <a href="/complete">completion summary</a> and <a href="/certificate">certificate</a>.</p>';
  return layout(user, 'Mission Board', html);
}
function completePage(user) {
  if (!isComplete()) {
    const left = TESTS.filter(t => !progress.tests[t.id]);
    return layout(user, 'Completion', '<h3>Not complete yet</h3><p>' + doneCount() + '/' + totalTests() + ' tests done (' + pct() + '%). Remaining:</p><ul>' +
      left.map(t => '<li>' + esc(t.name) + ' (' + esc(t.feature) + ')</li>').join('') + '</ul>');
  }
  const fs2 = featuresSummary();
  const key = assembleKey(COMPLETION_SHARDS);
  let html = '<h3>Lab Complete — Summary</h3>';
  html += '<h4>1) Features in this lab</h4><p>' + Object.keys(fs2).length + ' features.</p>';
  html += '<h4>2) Vulnerabilities per feature</h4><ul>' + Object.keys(fs2).map(f => '<li>' + esc(f) + ': ' + fs2[f].total + '</li>').join('') + '</ul>';
  html += '<h4>3) How testing was done (' + totalTests() + ' tests)</h4><ul>' + TESTS.map(t => '<li>' + esc(t.name) + ' — ' + esc(t.owasp) + '</li>').join('') + '</ul>';
  html += '<h4>4) What you learned</h4><ul>' + TESTS.map(t => '<li>' + esc(t.lesson) + '</li>').join('') + '</ul>';
  html += '<h4>5) What this means for a real client</h4><ul>' + TESTS.map(t => '<li>' + esc(t.impact) + '</li>').join('') + '</ul>';
  html += '<h4>6) Writing it in a real report</h4><ul>' + TESTS.map(t => '<li><b>' + esc(t.report.title) + '</b> — Severity: ' + esc(t.report.severity) + ' — Remediation: ' + esc(t.report.remediation) + '</li>').join('') + '</ul>';
  html += '<h4>Your completion key</h4><p style="font-size:18px"><code>' + esc(key) + '</code></p><p>Paste this key into Lab ' + (LAB_NUMBER + 1) + ' to unlock it.</p>';
  html += '<form method="POST" action="/complete/name"><label>Your name for the certificate<br><input name="testerName" value="' + esc(progress.testerName || (user ? user.name : '')) + '" style="padding:8px;width:60%"></label><br><br><button>Save name</button></form>';
  html += '<p><a href="/certificate">View your certificate</a></p>';
  return layout(user, 'Completion Summary', html);
}
function certificatePage(user) {
  if (!isComplete()) return null;
  const name = progress.testerName || (user ? user.name : 'Tester');
  const date = progress.completedAt ? progress.completedAt.slice(0, 10) : '';
  const fcount = Object.keys(featuresSummary()).length;
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ' + LAB_NUMBER + '</title></head>' +
    '<body style="margin:0;background:#eee;font-family:Georgia,serif"><div style="max-width:720px;margin:40px auto;background:#fff;border:3px solid #7c5cff;border-radius:14px;padding:36px;text-align:center">' +
    '<img src="/logo.png" style="height:64px"><h2>Certificate of Completion</h2>' +
    '<p>This certifies that</p><h3>' + esc(name) + '</h3>' +
    '<p>has completed 100% of the security tests in LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' (' + totalTests() + ' tests across ' + fcount + ' features)</p>' +
    '<p>Completed on ' + esc(date) + '</p><p style="margin-top:24px"><b>HexaCyberLab</b> — Built by Md. Jony Hassain, Founder</p></div></body></html>';
}

/* ----------------------------- Chatbot ----------------------------- */
const FEATURE_KEYS = {
  'Login & Authentication': ['login', 'authentication', 'auth', 'password', 'brute', 'reset', 'cookie', 'session'],
  'Registration & Profile': ['register', 'registration', 'profile', 'sign up', 'signup', 'account'],
  'Appointments': ['appointment', 'book', 'booking', 'cancel'],
  'Medical Records': ['record', 'medical', 'diagnosis'],
  'Prescriptions': ['prescription', 'medicine'],
  'Schedules & Staff': ['schedule', 'staff', 'check-in', 'checkin', 'reception'],
  'Billing': ['bill', 'billing', 'payment', 'pay'],
  'Admin Panel': ['admin'],
  'Platform & API': ['debug', 'api', 'platform']
};
function matchFeature(msg) {
  const m = msg.toLowerCase();
  for (const f of Object.keys(FEATURE_KEYS)) {
    if (m.includes(f.toLowerCase())) return f;
    if (FEATURE_KEYS[f].some(k => m.includes(k))) return f;
  }
  return null;
}
function chatReply(raw) {
  const msg = String(raw || '');
  const m = msg.toLowerCase();
  if (/who (built|made|created|developed)|founder|jony|hexacyberlab/.test(m)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (/key|unlock next|next lab/.test(m)) {
    if (isComplete() && progress.keyRevealed) {
      return 'You completed LAB ' + LAB_NUMBER + ' — here is your completion key: ' + assembleKey(COMPLETION_SHARDS) + ' — paste it into Lab ' + (LAB_NUMBER + 1) + ' to unlock it.';
    }
    return 'I do not have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at ' + pct() + '%. Finish all ' + totalTests() + ' tests and ask me again.';
  }
  const feature = matchFeature(msg);
  const howto = /how|guide|step|solve|help me|exploit|bypass|walkthrough|trick/.test(m);
  if (howto && feature) {
    const tries = progress.attempts[feature] || 0;
    const open = TESTS.filter(t => t.feature === feature && !progress.tests[t.id]);
    if (tries >= 3 || open.length === 0) {
      if (open.length === 0) return 'You have already completed every test in ' + feature + '. Great work!';
      return 'Step by step for ' + feature + ':\n' + open.map(t => '• ' + t.name + ' — ' + t.guide).join('\n');
    }
    return 'That feature is locked for help. First try the ' + feature + ' tests yourself at least 3 times — I can see you\'ve tried ' + tries + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  if (/how many|count|list|which tests|features|vulnerabilit/.test(m)) {
    if (feature) {
      const list = TESTS.filter(t => t.feature === feature);
      return feature + ' has ' + list.length + ' tests: ' + list.map(t => t.name).join('; ') + '. (The map is public — the step-by-step help unlocks after 3 tries on the feature.)';
    }
    const fs2 = featuresSummary();
    return 'This lab has ' + Object.keys(fs2).length + ' features and ' + totalTests() + ' tests: ' +
      Object.keys(fs2).map(f => f + ' (' + fs2[f].total + ')').join(', ') + '. Open /tests for the full mission board.';
  }
  if (/progress|next|status|score|left/.test(m)) {
    const next = TESTS.find(t => !progress.tests[t.id]);
    return 'Your progress: ' + doneCount() + '/' + totalTests() + ' tests (' + pct() + '%).' +
      (next ? ' Next open test: ' + next.name + ' (' + next.feature + '). Try it a few times, then ask me how if you get stuck.' : ' The lab is complete — see /complete for your summary and key.');
  }
  if (/hi|hello|hey|start/.test(m)) {
    return 'Hello! I am the Lab Coach for LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '. This lab has ' + totalTests() + ' tests across ' + Object.keys(featuresSummary()).length + ' features. Open /tests to see them, try each one yourself, and ask me for step-by-step help after 3 tries on a feature.';
  }
  return 'I can help with this lab: ask me how many tests a feature has, what your progress is, or — after you have tried a feature at least 3 times — ask "how do I solve the ' + (TESTS[0].feature) + ' tests" and I will guide you step by step. The full map is on /tests.';
}

/* ------------------------------------------------------------------ *
 * Completion key — stored ONLY as encoded shards (region 2 of 2).
 * Assembled only once the lab reaches 100% (/complete, /certificate,
 * and the coach's unlocked knowledge).
 * ------------------------------------------------------------------ */
const COMPLETION_SHARDS = ["TC1YSA==","US0yNg==","V1dEUg==","LVhRRw==","M0RTVA==","UUxZQQ=="];

/* ------------------------------ Router ----------------------------- */
async function route(req, res) {
  const u = new URL(req.url, 'http://127.0.0.1:3070');
  const p = u.pathname;
  const method = req.method;

  if (p === '/logo.png') {
    try { const data = fs.readFileSync(LOGO_FILE); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(data); }
    catch (e) { return send(res, 404, 'logo not found', 'text/plain'); }
  }
  if (p === '/api/progress' && method === 'GET') {
    return send(res, 200, JSON.stringify({ lab: LAB_NAME, number: LAB_NUMBER, total: totalTests(), done: doneCount(), pct: pct(), features: featuresSummary(), complete: isComplete() }, null, 2), 'application/json');
  }
  if (p === '/api/chat' && method === 'POST') {
    const body = await parseBody(req);
    let reply;
    try { reply = chatReply(body.message); } catch (e) { reply = 'I hit a snag answering that — try asking about a feature, your progress, or who built these labs.'; }
    return send(res, 200, JSON.stringify({ reply }), 'application/json');
  }
  if (p === '/unlock' && method === 'POST') {
    const body = await parseBody(req);
    if (String(body.key || '') === assembleKey(ENTRY_SHARDS)) {
      progress.unlocked = true; saveProgress();
      return redirect(res, '/');
    }
    return send(res, 403, gatePage('Incorrect key — the lab stays locked.'));
  }
  /* -------- Lock gate: everything else waits until unlocked -------- */
  if (!progress.unlocked) return send(res, 200, gatePage());

  if (p === '/tests' && method === 'GET') return send(res, 200, testsPage(sessionUser(req)));
  if (p === '/complete' && method === 'GET') return send(res, 200, completePage(sessionUser(req)));
  if (p === '/complete/name' && method === 'POST') {
    const body = await parseBody(req);
    progress.testerName = String(body.testerName || '').slice(0, 60); saveProgress();
    return redirect(res, '/complete');
  }
  if (p === '/certificate' && method === 'GET') {
    const page = certificatePage(sessionUser(req));
    if (!page) return redirect(res, '/complete');
    return send(res, 200, page);
  }
  if (p === '/api/debug' && method === 'GET') {
    attempt('Platform & API'); pass('plat-debug');
    return send(res, 200, JSON.stringify({ debug: true, users: users.map(x => ({ id: x.id, email: x.email, password: x.password, role: x.role })) }, null, 2), 'application/json');
  }

  /* --------------------------- Auth pages --------------------------- */
  if (p === '/login' && method === 'GET') return send(res, 200, loginPage());
  if (p === '/login' && method === 'POST') {
    const body = await parseBody(req);
    attempt('Login & Authentication');
    const email = String(body.email || ''), password = String(body.password || '');
    if (SQLI_RE.test(email) || SQLI_RE.test(password)) {
      newSession(res, users[0]);
      pass('auth-sqli');
      return redirect(res, '/');
    }
    const user = users.find(x => x.email === email);
    if (!user || user.password !== password || user.active === false) {
      if (email) {
        failCount[email] = (failCount[email] || 0) + 1;
        if (failCount[email] >= 10) pass('auth-brute');
      }
      return send(res, 200, loginPage('Invalid email or password.'));
    }
    failCount[email] = 0;
    newSession(res, user);
    if (email === 'patient@hexaclinic.local' && password === 'patient123') pass('auth-default');
    return redirect(res, '/');
  }
  if (p === '/logout') {
    const c = parseCookies(req);
    if (c.hx_session) sessions.delete(c.hx_session);
    res.setHeader('Set-Cookie', ['hx_session=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0']);
    return redirect(res, '/login');
  }
  if (p === '/register' && method === 'GET') return send(res, 200, registerPage());
  if (p === '/register' && method === 'POST') {
    const body = await parseBody(req);
    attempt('Registration & Profile');
    const email = String(body.email || '').trim();
    if (!email || users.some(x => x.email === email)) return send(res, 200, registerPage('Please choose a different email.'));
    const role = body.role ? String(body.role) : 'patient';
    const nu = { id: nextIds.user++, email, password: String(body.password || ''), name: String(body.name || 'New User'), role };
    if (role === 'patient') {
      const np = { id: patients.length + 1, name: nu.name, dob: '2000-01-01', phone: '' };
      patients.push(np); nu.patientId = np.id;
      records.push({ id: nextIds.record++, patientId: np.id, doctorId: 1, diagnosis: '—', allergies: '—', notes: 'New patient record.' });
    }
    users.push(nu);
    if (String(body.password || '').length === 1) pass('reg-weak');
    if (body.role && role !== 'patient') pass('reg-mass');
    if (hasXss(nu.name)) pass('reg-xss');
    newSession(res, nu);
    return redirect(res, '/');
  }
  if (p === '/forgot' && method === 'GET') return send(res, 200, forgotPage());
  if (p === '/forgot' && method === 'POST') {
    const body = await parseBody(req);
    attempt('Login & Authentication');
    const email = String(body.email || '').trim();
    if (email) forgotProbes.add(email);
    if (forgotProbes.size >= 5) pass('auth-enum');
    const user = users.find(x => x.email === email);
    if (user) {
      issuedTokens[email] = resetTokenFor(user);
      return send(res, 200, forgotPage('Reset link sent — check your inbox. (Demo inbox: your token is ' + issuedTokens[email] + ' — use it on the reset page.)'));
    }
    return send(res, 200, forgotPage('No account exists for that email address.'));
  }
  if (p === '/reset' && method === 'GET') return send(res, 200, resetPage(u.searchParams.get('email') || ''));
  if (p === '/reset' && method === 'POST') {
    const body = await parseBody(req);
    attempt('Login & Authentication');
    const user = users.find(x => x.email === String(body.email || ''));
    if (!user) return send(res, 200, resetPage('', 'Unknown account.'));
    if (String(body.token || '') === resetTokenFor(user)) {
      if (issuedTokens[user.email] !== String(body.token || '')) pass('auth-reset');
      user.password = String(body.newpassword || 'changed123');
      delete issuedTokens[user.email];
      return send(res, 200, loginPage('Password updated — please log in.'));
    }
    return send(res, 200, resetPage(user.email, 'That reset token is not valid.'));
  }

  /* --------------------- Everything below needs login --------------- */
  const user = sessionUser(req);
  if (!user) return redirect(res, '/login');

  if (p === '/' && method === 'GET') return send(res, 200, dashboardPage(user));
  if (p === '/profile' && method === 'GET') return send(res, 200, profilePage(user));
  if (p === '/profile' && method === 'POST') {
    const body = await parseBody(req);
    attempt('Registration & Profile');
    if (body.name) { user.name = String(body.name); if (hasXss(user.name)) pass('reg-xss'); }
    if (isCsrf(req, body)) pass('reg-csrf');
    return send(res, 200, profilePage(user, 'Profile saved.'));
  }
  if (p === '/staff' && method === 'GET') {
    attempt('Login & Authentication');
    const cookies = parseCookies(req);
    const effective = cookies.hx_role || user.role;
    if (['doctor', 'receptionist', 'admin'].includes(effective)) {
      if (user.role === 'patient' && cookies.hx_role && cookies.hx_role !== user.role) pass('auth-cookie');
      return send(res, 200, staffPage(user));
    }
    return send(res, 403, layout(user, 'Staff Console', '<h3>403 — Staff only.</h3>'));
  }

  /* --------------------------- Appointments ------------------------- */
  if (p === '/appointments' && method === 'GET') return send(res, 200, appointmentsPage(user));
  if (p === '/book' && method === 'GET') return send(res, 200, bookPage(user));
  if (p === '/appointments/book' && method === 'POST') {
    const body = await parseBody(req);
    attempt('Appointments');
    const patientId = parseInt(body.patientId, 10) || user.patientId || 1;
    const doctorId = parseInt(body.doctorId, 10) || 1;
    const date = String(body.date || '2026-10-24'), time = String(body.time || '09:00');
    const inSlot = appointments.filter(a => a.doctorId === doctorId && a.date === date && a.time === time && a.status !== 'cancelled').length;
    const na = { id: nextIds.appointment++, patientId, doctorId, date, time, reason: String(body.reason || 'General visit'), status: 'booked' };
    appointments.push(na);
    if (user.role === 'patient' && patientId !== user.patientId) pass('appt-bookfor');
    if (inSlot >= SLOT_CAP) pass('appt-overbook');
    return redirect(res, '/appointments/' + na.id);
  }
  const mAppt = p.match(/^\/appointments\/(\d+)$/);
  if (mAppt && method === 'GET') {
    attempt('Appointments');
    const a = appointments.find(x => x.id === Number(mAppt[1]));
    if (!a) return send(res, 404, layout(user, 'Not found', '<h3>Appointment not found.</h3>'));
    if (user.role === 'patient' && a.patientId !== user.patientId) pass('appt-idor');
    return send(res, 200, appointmentDetailPage(user, a));
  }
  const mCancel = p.match(/^\/appointments\/(\d+)\/cancel$/);
  if (mCancel && method === 'POST') {
    await parseBody(req);
    attempt('Appointments');
    const a = appointments.find(x => x.id === Number(mCancel[1]));
    if (a) {
      if (user.role === 'patient' && a.patientId !== user.patientId) pass('appt-cancel');
      a.status = 'cancelled';
    }
    return redirect(res, '/appointments');
  }
  const mCheckin = p.match(/^\/appointments\/(\d+)\/checkin$/);
  if (mCheckin && method === 'POST') {
    await parseBody(req);
    attempt('Schedules & Staff');
    const a = appointments.find(x => x.id === Number(mCheckin[1]));
    if (a) {
      if (!['receptionist', 'admin', 'doctor'].includes(user.role)) pass('sched-checkin');
      a.status = 'checked-in';
    }
    return redirect(res, '/appointments');
  }

  /* --------------------------- Medical records ---------------------- */
  if (p === '/records' && method === 'GET') return send(res, 200, recordsPage(user));
  if (p === '/records/export' && method === 'GET') {
    attempt('Medical Records');
    if (user.role === 'patient') pass('rec-export');
    const csv = 'id,patient,diagnosis,allergies,notes\n' + records.map(r => [r.id, patientName(r.patientId), r.diagnosis, r.allergies, '"' + String(r.notes).replace(/"/g, '""') + '"'].join(',')).join('\n');
    return send(res, 200, csv, 'text/csv');
  }
  const mRec = p.match(/^\/records\/(\d+)$/);
  if (mRec && method === 'GET') {
    attempt('Medical Records');
    const r = records.find(x => x.id === Number(mRec[1]));
    if (!r) return send(res, 404, layout(user, 'Not found', '<h3>Record not found.</h3>'));
    if (user.role === 'patient' && r.patientId !== user.patientId) pass('rec-idor');
    return send(res, 200, recordDetailPage(user, r));
  }
  const mRecEdit = p.match(/^\/records\/(\d+)\/edit$/);
  if (mRecEdit && method === 'POST') {
    const body = await parseBody(req);
    attempt('Medical Records');
    const r = records.find(x => x.id === Number(mRecEdit[1]));
    if (r) {
      if (body.diagnosis) r.diagnosis = String(body.diagnosis);
      if (body.notes) r.notes = String(body.notes);
      if (user.role !== 'doctor' && user.role !== 'admin') pass('rec-edit');
    }
    return redirect(res, '/records/' + mRecEdit[1]);
  }

  /* --------------------------- Prescriptions ------------------------ */
  if (p === '/prescriptions' && method === 'GET') return send(res, 200, prescriptionsPage(user));
  if (p === '/prescriptions/new' && method === 'GET') return send(res, 200, prescriptionNewPage(user));
  if (p === '/prescriptions/new' && method === 'POST') {
    const body = await parseBody(req);
    attempt('Prescriptions');
    const doc = doctors.find(d => d.userId === user.id);
    const np = { id: nextIds.prescription++, patientId: parseInt(body.patientId, 10) || user.patientId || 1, doctorId: doc ? doc.id : 1, medicine: String(body.medicine || 'Unknown'), dosage: String(body.dosage || ''), instructions: String(body.instructions || ''), date: '2026-10-23' };
    prescriptions.push(np);
    if (user.role !== 'doctor') pass('rx-self');
    return redirect(res, '/prescriptions/' + np.id);
  }
  const mRx = p.match(/^\/prescriptions\/(\d+)$/);
  if (mRx && method === 'GET') {
    attempt('Prescriptions');
    const rx = prescriptions.find(x => x.id === Number(mRx[1]));
    if (!rx) return send(res, 404, layout(user, 'Not found', '<h3>Prescription not found.</h3>'));
    if (user.role === 'patient' && rx.patientId !== user.patientId) pass('rx-idor');
    return send(res, 200, prescriptionDetailPage(user, rx));
  }

  /* ----------------------------- Schedules -------------------------- */
  if (p === '/schedules' && method === 'GET') { attempt('Schedules & Staff'); return send(res, 200, schedulesPage(user)); }
  if (p === '/schedules/update' && method === 'POST') {
    const body = await parseBody(req);
    attempt('Schedules & Staff');
    const s = schedules.find(x => x.doctorId === (parseInt(body.doctorId, 10) || 1));
    if (s) {
      if (body.days) s.days = String(body.days);
      if (body.hours) s.hours = String(body.hours);
      if (body.status) s.status = String(body.status);
      if (!['receptionist', 'admin'].includes(user.role)) pass('sched-edit');
    }
    return redirect(res, '/schedules');
  }

  /* ------------------------------ Billing --------------------------- */
  if (p === '/bills' && method === 'GET') return send(res, 200, billsPage(user));
  const mBill = p.match(/^\/bills\/(\d+)$/);
  if (mBill && method === 'GET') {
    attempt('Billing');
    const b = bills.find(x => x.id === Number(mBill[1]));
    if (!b) return send(res, 404, layout(user, 'Not found', '<h3>Bill not found.</h3>'));
    if (user.role === 'patient' && b.patientId !== user.patientId) pass('bill-idor');
    return send(res, 200, billDetailPage(user, b));
  }
  const mPay = p.match(/^\/bills\/(\d+)\/pay$/);
  if (mPay && method === 'POST') {
    const body = await parseBody(req);
    attempt('Billing');
    const b = bills.find(x => x.id === Number(mPay[1]));
    if (b) {
      const amt = parseFloat(body.amount);
      if (!isNaN(amt) && amt > 0) {
        b.paidAmount = amt;
        b.status = 'paid'; // intentional flaw: any positive amount settles the bill in full
        if (amt < b.amount) pass('bill-tamper');
      }
    }
    return redirect(res, '/bills/' + mPay[1]);
  }

  /* ------------------------------- Admin ---------------------------- */
  if (p === '/admin' && method === 'GET') {
    attempt('Admin Panel');
    if (user.role !== 'admin') pass('admin-bac');
    return send(res, 200, adminPage(user));
  }
  const mDeact = p.match(/^\/admin\/users\/(\d+)\/deactivate$/);
  if (mDeact && method === 'POST') {
    const body = await parseBody(req);
    attempt('Admin Panel');
    const t = users.find(x => x.id === Number(mDeact[1]));
    if (t) {
      t.active = false;
      if (isCsrf(req, body)) pass('admin-csrf');
    }
    return redirect(res, '/admin');
  }

  return send(res, 404, layout(user, 'Not found', '<h3>404 — page not found.</h3>'));
}

const server = http.createServer((req, res) => {
  route(req, res).catch(() => { try { send(res, 500, 'Internal error', 'text/plain'); } catch (e) {} });
});
server.listen(PORT, HOST, () => {
  console.log('LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' listening on http://' + HOST + ':' + PORT);
});
