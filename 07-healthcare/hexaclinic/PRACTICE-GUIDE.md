# HexaClinic — Practice Guide (LAB 61)

Challenges grouped by feature, then difficulty. Each challenge has three graded hints (also on the in-app Mission Board at `/tests`) and a measurable objective: the test flips to done only when the exploit actually succeeds server-side.

## Login & Authentication

### SQL Injection Login Bypass (Beginner)
- **Objective:** Make the "SQL Injection Login Bypass" test show as done on the Mission Board by performing the real exploit against the running app.
- **Lesson:** String-built queries let attacker input change the query logic itself; parameterised queries make input data-only.
- Hint 1: The login form builds its query by pasting your email straight into a string.
- Hint 2: Try a classic tautology in the email field: a quote, OR, and a comparison that is always true.
- Hint 3: Email: ' OR '1'='1 — the app logs you in as the first matching account.

### Brute Force — No Rate Limiting or Lockout (Beginner)
- **Objective:** Make the "Brute Force — No Rate Limiting or Lockout" test show as done on the Mission Board by performing the real exploit against the running app.
- **Lesson:** Without throttling or lockout, password guessing is free and unlimited — weak passwords fall quickly.
- Hint 1: Keep guessing the same account's password — watch what does NOT happen.
- Hint 2: There is no CAPTCHA, no delay and no lockout, however many times you fail.
- Hint 3: Fail 10 logins in a row for one account; the 10th is still processed normally.

### User Enumeration via Divergent Responses (Beginner)
- **Objective:** Make the "User Enumeration via Divergent Responses" test show as done on the Mission Board by performing the real exploit against the running app.
- **Lesson:** Different responses for existing vs non-existing accounts hand attackers a valid-account list for targeted attacks.
- Hint 1: Compare the forgot-password answer for an email that exists with one that does not.
- Hint 2: The app is polite — too polite. One says a reset was sent; the other admits there is no account.
- Hint 3: Submit 5 different emails to /forgot and collect the two different answers.

### Demo Credentials Published on the Login Page (Beginner)
- **Objective:** Make the "Demo Credentials Published on the Login Page" test show as done on the Mission Board by performing the real exploit against the running app.
- **Lesson:** Demo/default credentials left visible in production are an open door — attackers try them first.
- Hint 1: Read the login page carefully — it tries to be helpful.
- Hint 2: A demo account with its password is printed right under the form.
- Hint 3: Just log in with the published demo patient credentials.

### Predictable Password-Reset Token (Intermediate)
- **Objective:** Make the "Predictable Password-Reset Token" test show as done on the Mission Board by performing the real exploit against the running app.
- **Lesson:** Reset tokens must be long, random and single-use; a formula based on public values is no secret at all.
- Hint 1: Request a reset for an account you control and look at the token pattern.
- Hint 2: The token is computed from something you can see — the account's numeric id.
- Hint 3: Token = HC followed by (user id × 137 + 42). Compute another user's token without ever requesting a reset for them.

### Role Cookie Tampering — Client-Supplied Role Trusted (Intermediate)
- **Objective:** Make the "Role Cookie Tampering — Client-Supplied Role Trusted" test show as done on the Mission Board by performing the real exploit against the running app.
- **Lesson:** Authorization data must live server-side; anything stored on the client can be edited by the client.
- Hint 1: After logging in, inspect your cookies — one of them states your role.
- Hint 2: The staff console believes that cookie instead of the server-side account.
- Hint 3: Set the hx_role cookie to doctor (or admin) and open /staff.

## Registration & Profile

### Weak Password Policy — 1-Character Passwords Accepted (Beginner)
- **Objective:** Make the "Weak Password Policy — 1-Character Passwords Accepted" test show as done on the Mission Board by performing the real exploit against the running app.
- **Lesson:** Password policy is the first line of defence; accepting 1-character passwords makes brute force trivial.
- Hint 1: Register a new account and be lazy with the password.
- Hint 2: There is no minimum length at all.
- Hint 3: A password of a single character (e.g. "x") is accepted.

### Stored XSS in Display Name (Beginner)
- **Objective:** Make the "Stored XSS in Display Name" test show as done on the Mission Board by performing the real exploit against the running app.
- **Lesson:** User-supplied text must be output-encoded everywhere it is rendered; one unescaped field poisons every viewer.
- Hint 1: Your display name is shown in the page header and in staff lists — exactly as typed.
- Hint 2: Put a script payload where your name goes.
- Hint 3: Register (or rename yourself) with a name like <script>alert(1)</script> and view a page that renders it.

### Mass Assignment — Role Set at Registration (Intermediate)
- **Objective:** Make the "Mass Assignment — Role Set at Registration" test show as done on the Mission Board by performing the real exploit against the running app.
- **Lesson:** Bind only whitelisted fields from requests; blindly assigning every submitted field lets users grant themselves privileges.
- Hint 1: The registration form shows name, email, password — the server accepts more than it shows.
- Hint 2: What if the request also carried a role field?
- Hint 3: Add role=doctor (or admin) to the registration POST and check your new powers.

### CSRF on Profile Update (Intermediate)
- **Objective:** Make the "CSRF on Profile Update" test show as done on the Mission Board by performing the real exploit against the running app.
- **Lesson:** State-changing requests need an unguessable CSRF token tied to the session; cookies alone are ambient authority.
- Hint 1: The profile form changes your name and phone with a plain POST.
- Hint 2: Nothing in the request proves it came from this site's own form.
- Hint 3: POST the profile change from another origin (or without the site's origin marker) while logged in.

## Appointments

### Appointment IDOR — View Another Patient's Appointment (Beginner)
- **Objective:** Make the "Appointment IDOR — View Another Patient's Appointment" test show as done on the Mission Board by performing the real exploit against the running app.
- **Lesson:** Every object access must check that the object belongs to the requester — hiding links is not authorization.
- Hint 1: Your appointment detail page has a number in its URL.
- Hint 2: Numbers are sequential. What is appointment 2?
- Hint 3: Open /appointments/<id> for an appointment that is not yours.

### Cancel Another Patient's Appointment (Intermediate)
- **Objective:** Make the "Cancel Another Patient's Appointment" test show as done on the Mission Board by performing the real exploit against the running app.
- **Lesson:** Authorization checks must cover actions, not just views — a missing check on a destructive action is worse than a read leak.
- Hint 1: Viewing a stranger's appointment was possible. The cancel action trusts the same id.
- Hint 2: POST the cancel action for an appointment that is not yours.
- Hint 3: Cancel appointment 3 (another patient's) while logged in as the demo patient.

### Book an Appointment Under Another Patient's Identity (Intermediate)
- **Objective:** Make the "Book an Appointment Under Another Patient's Identity" test show as done on the Mission Board by performing the real exploit against the running app.
- **Lesson:** Identity for created objects must come from the session, never from client-supplied fields.
- Hint 1: The booking form hides a patientId field. The server trusts it.
- Hint 2: Whose name ends up on the appointment if you change that field?
- Hint 3: Book with patientId set to another patient (e.g. 2 instead of your own 1).

### Slot Overbooking — Capacity Limit Not Enforced (Intermediate)
- **Objective:** Make the "Slot Overbooking — Capacity Limit Not Enforced" test show as done on the Mission Board by performing the real exploit against the running app.
- **Lesson:** Business invariants (capacity) must be enforced server-side at write time, ideally inside a transaction.
- Hint 1: Each doctor time-slot fits 2 patients. Dr. Rahman's 09:00 slot on 2026-10-24 is already full.
- Hint 2: The booking code never counts how many are already in the slot.
- Hint 3: Book that same full slot for yourself — it is accepted as a third booking.

## Medical Records

### Medical Record IDOR — Read Another Patient's Record (Beginner)
- **Objective:** Make the "Medical Record IDOR — Read Another Patient's Record" test show as done on the Mission Board by performing the real exploit against the running app.
- **Lesson:** Medical records are among the most sensitive data a system holds; per-object authorization is non-negotiable.
- Hint 1: Your medical record lives at /records/<id>.
- Hint 2: Record ids are sequential, and no ownership check stands behind them.
- Hint 3: Open /records/2 — another patient's diagnosis, allergies and notes.

### Patient Edits Doctor-Only Diagnosis (Intermediate)
- **Objective:** Make the "Patient Edits Doctor-Only Diagnosis" test show as done on the Mission Board by performing the real exploit against the running app.
- **Lesson:** Hiding a UI control is not access control; the server must verify the role for every privileged function.
- Hint 1: The record-edit endpoint exists for doctors. Who else can POST to it?
- Hint 2: Function-level authorization is missing — only the button is hidden.
- Hint 3: As a patient, POST a new diagnosis to /records/<your id>/edit.

### Full Records Export Open to Any Logged-In Account (Intermediate)
- **Objective:** Make the "Full Records Export Open to Any Logged-In Account" test show as done on the Mission Board by performing the real exploit against the running app.
- **Lesson:** Bulk-export endpoints are the highest-value targets; they need the strictest role checks and audit logging.
- Hint 1: Staff have a CSV export of all records. Its URL is guessable: /records/export.
- Hint 2: The export checks that you are logged in — nothing more.
- Hint 3: Download /records/export as a patient and read everyone's records at once.

## Prescriptions

### Prescription IDOR — View Another Patient's Prescription (Beginner)
- **Objective:** Make the "Prescription IDOR — View Another Patient's Prescription" test show as done on the Mission Board by performing the real exploit against the running app.
- **Lesson:** The same missing ownership check repeats across features; authorization must be systematic, not per-page luck.
- Hint 1: Prescriptions live at /prescriptions/<id>, sequential as usual.
- Hint 2: Medication details are sensitive, too.
- Hint 3: Open /prescriptions/2 as the demo patient — it is Karim's.

### Patient Issues Their Own Prescription (Intermediate)
- **Objective:** Make the "Patient Issues Their Own Prescription" test show as done on the Mission Board by performing the real exploit against the running app.
- **Lesson:** Privileged clinical actions must verify role server-side; a prescription is a legal document, not a form field.
- Hint 1: Doctors create prescriptions at /prescriptions/new. The server never asks if you are one.
- Hint 2: Try it as a patient: prescribe anything to yourself.
- Hint 3: POST a new prescription for yourself while logged in as the demo patient.

## Schedules & Staff

### Patient Modifies a Doctor's Schedule (Intermediate)
- **Objective:** Make the "Patient Modifies a Doctor's Schedule" test show as done on the Mission Board by performing the real exploit against the running app.
- **Lesson:** Staff functions need role checks on the server; shared endpoints invite abuse from every account type.
- Hint 1: Reception manages doctor availability at /schedules/update.
- Hint 2: The endpoint checks login, not job title.
- Hint 3: As a patient, POST a schedule change — mark a doctor off duty or change their hours.

### Patient Performs Receptionist Check-In (Intermediate)
- **Objective:** Make the "Patient Performs Receptionist Check-In" test show as done on the Mission Board by performing the real exploit against the running app.
- **Lesson:** Workflow state transitions are privileged actions; each transition needs its own authorization check.
- Hint 1: Reception checks patients in via /appointments/<id>/checkin.
- Hint 2: Again: login required, role never verified.
- Hint 3: Check in an appointment while logged in as a patient.

## Billing

### Bill IDOR — View Another Patient's Bill (Beginner)
- **Objective:** Make the "Bill IDOR — View Another Patient's Bill" test show as done on the Mission Board by performing the real exploit against the running app.
- **Lesson:** Financial documents need the same per-object authorization as clinical ones.
- Hint 1: Bills live at /bills/<id> with sequential ids.
- Hint 2: You already know this pattern — it applies here too.
- Hint 3: Open /bills/2 as the demo patient.

### Bill Payment Amount Tampering — Settles in Full for $1 (Beginner)
- **Objective:** Make the "Bill Payment Amount Tampering — Settles in Full for $1" test show as done on the Mission Board by performing the real exploit against the running app.
- **Lesson:** Payment state must be derived from server-side amounts and verified transactions, never from client-supplied figures.
- Hint 1: The pay form sends the amount as a field. The server trusts it completely.
- Hint 2: What does the server actually verify before marking a bill PAID?
- Hint 3: Pay bill 1 with amount=1 — the $80 bill is marked fully paid.

## Admin Panel

### Admin Panel Open to Any Logged-In User (Beginner)
- **Objective:** Make the "Admin Panel Open to Any Logged-In User" test show as done on the Mission Board by performing the real exploit against the running app.
- **Lesson:** Every privileged route needs an explicit server-side role check; "nobody will guess the URL" is not a control.
- Hint 1: Try /admin while logged in as a plain patient.
- Hint 2: The handler simply forgot the role check.
- Hint 3: The full user list — emails and roles — renders for anyone with a session.

### CSRF on Admin User Deactivation (Intermediate)
- **Objective:** Make the "CSRF on Admin User Deactivation" test show as done on the Mission Board by performing the real exploit against the running app.
- **Lesson:** Admin actions are the most dangerous CSRF targets; they need tokens and re-confirmation for destructive operations.
- Hint 1: Admins can deactivate users with a POST. No token protects it.
- Hint 2: An admin browsing a malicious page while logged in is enough.
- Hint 3: POST /admin/users/<id>/deactivate from a foreign origin with no site marker.

## Platform & API

### Unauthenticated Debug Endpoint Exposes All Accounts (Beginner)
- **Objective:** Make the "Unauthenticated Debug Endpoint Exposes All Accounts" test show as done on the Mission Board by performing the real exploit against the running app.
- **Lesson:** Debug/diagnostic endpoints must never ship to production; if they must exist, they need auth and must never include secrets.
- Hint 1: Developers leave helpers behind. Try /api/debug.
- Hint 2: No login is needed at all.
- Hint 3: The JSON includes every user — with passwords.
