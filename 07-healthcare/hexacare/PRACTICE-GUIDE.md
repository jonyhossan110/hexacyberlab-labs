# HexaCare — Practice Guide (LAB 62)

Work through the challenges feature by feature. Each challenge lists a measurable objective and three graded hints (the same hints shown on the in-app Mission Board at /tests). A challenge is scored only when the exploit actually succeeds — the server detects the real effect.

## Login & Authentication

### [Intermediate] SQL Injection Login Bypass
- **Objective:** Successfully exploit this flaw in the running app so the Mission Board marks it done.
- **OWASP:** A03:2021 – Injection
- Hint 1: The login check builds its database query by gluing your email straight into the query text.
- Hint 2: A classic tautology in the email field makes the WHERE clause true for every row.
- Hint 3: Use the email admin@hexacare.local' OR '1'='1 with any password — the query matches the first account, the admin.

### [Beginner] No Brute-Force Protection on Login
- **Objective:** Successfully exploit this flaw in the running app so the Mission Board marks it done.
- **OWASP:** A07:2021 – Identification and Authentication Failures
- Hint 1: Nothing slows you down when a password guess fails — no lockout, no delay, no CAPTCHA.
- Hint 2: Pick one real account and keep guessing wrong passwords; count the failures.
- Hint 3: Submit 10 or more wrong passwords for alice@test.local back to back — every attempt is processed at full speed.

### [Beginner] User Enumeration via Password Reset
- **Objective:** Successfully exploit this flaw in the running app so the Mission Board marks it done.
- **OWASP:** A07:2021 – Identification and Authentication Failures
- Hint 1: Compare the forgot-password answer for a real email with the answer for an invented one.
- Hint 2: The two responses are worded differently — one of them confirms the account exists.
- Hint 3: Probe at least 5 different emails on /forgot and note which ones say a reset link was sent.

### [Beginner] Published Demo Credentials Grant Real Access
- **Objective:** Successfully exploit this flaw in the running app so the Mission Board marks it done.
- **OWASP:** A07:2021 – Identification and Authentication Failures
- Hint 1: The login page itself tells you a working username and password.
- Hint 2: Look at the demo box printed under the login form.
- Hint 3: Sign in with demo@hexacare.local / Demo1234 — it is a real account with full patient-portal access.

### [Intermediate] Predictable Password-Reset Token
- **Objective:** Successfully exploit this flaw in the running app so the Mission Board marks it done.
- **OWASP:** A07:2021 – Identification and Authentication Failures
- Hint 1: Reset tokens here are not random — they are computed from something you can see.
- Hint 2: Your numeric user id shows up in portal URLs such as /careplan/<id>.
- Hint 3: The token is HC-<id>-<id×137+42>. Compute it for another account and reset its password from the /forgot page without ever seeing an email.

### [Intermediate] Role Cookie Tampering Opens the Clinician Console
- **Objective:** Successfully exploit this flaw in the running app so the Mission Board marks it done.
- **OWASP:** A01:2021 – Broken Access Control
- Hint 1: After login the app stores your role in a cookie — and one console trusts that cookie.
- Hint 2: Cookies live in your browser, so you can edit them freely.
- Hint 3: Set the hx_role cookie to doctor and open /clinician — the console never compares it with your real account role.

## Registration & Profile

### [Beginner] Weak Password Policy at Registration
- **Objective:** Successfully exploit this flaw in the running app so the Mission Board marks it done.
- **OWASP:** A07:2021 – Identification and Authentication Failures
- Hint 1: How short can a new password be before the form complains?
- Hint 2: Try registering with a one-character password.
- Hint 3: Register a new account with the password 'x' — it is accepted without any warning.

### [Intermediate] Mass Assignment — Self-Assigned Doctor Role
- **Objective:** Successfully exploit this flaw in the running app so the Mission Board marks it done.
- **OWASP:** A01:2021 – Broken Access Control
- Hint 1: The registration form only shows name, email and password — but the handler reads more fields than that.
- Hint 2: Add a field the form never displayed and see if the server uses it.
- Hint 3: POST /register with an extra field role=doctor — the new account is created with the doctor role.

### [Beginner] Stored XSS in Display Name
- **Objective:** Successfully exploit this flaw in the running app so the Mission Board marks it done.
- **OWASP:** A03:2021 – Injection
- Hint 1: Your display name is printed back on pages that staff and other users read — without escaping.
- Hint 2: Put markup, not plain text, into your name.
- Hint 3: Set your display name on /profile to <script>alert(1)</script> — it is stored and rendered raw in staff-facing lists.

### [Intermediate] CSRF on Profile Update
- **Objective:** Successfully exploit this flaw in the running app so the Mission Board marks it done.
- **OWASP:** A01:2021 – Broken Access Control
- Hint 1: Profile updates never verify where the request actually came from.
- Hint 2: The app marks its own pages with an hx_origin cookie — the profile handler never checks for it.
- Hint 3: POST /profile from a context with a foreign Origin and no hx_origin marker — the change is accepted anyway.

## Visits & Clinical Notes

### [Beginner] Visit Record IDOR
- **Objective:** Successfully exploit this flaw in the running app so the Mission Board marks it done.
- **OWASP:** A01:2021 – Broken Access Control
- Hint 1: Visit pages are numbered — /visits/1, /visits/2, and so on.
- Hint 2: Nothing checks that the visit you open belongs to you.
- Hint 3: While signed in as Alice, open /visits/3 — it is Bob’s visit, complete with his diagnosis notes.

### [Intermediate] Patient Can Edit Clinician Visit Notes
- **Objective:** Successfully exploit this flaw in the running app so the Mission Board marks it done.
- **OWASP:** A01:2021 – Broken Access Control
- Hint 1: The clinical note under a visit is meant to be written by clinicians only.
- Hint 2: The form is hidden from patients — but the endpoint behind it answers to anyone.
- Hint 3: As a patient, POST /visits/<id>/note with your own text — the clinical note is overwritten.

### [Intermediate] Patient Can Delete Visit Records
- **Objective:** Successfully exploit this flaw in the running app so the Mission Board marks it done.
- **OWASP:** A01:2021 – Broken Access Control
- Hint 1: Medical records should be effectively immutable — this app ships a delete endpoint.
- Hint 2: It is only linked from the staff view, but it responds to any signed-in user.
- Hint 3: As a patient, POST /visits/<id>/delete — the visit record is deleted.

## Care Plans & Medications

### [Beginner] Care Plan IDOR
- **Objective:** Successfully exploit this flaw in the running app so the Mission Board marks it done.
- **OWASP:** A01:2021 – Broken Access Control
- Hint 1: Care plans live at /careplan/<userId> — the id in the URL is the patient’s.
- Hint 2: Try a neighbouring patient’s id.
- Hint 3: Open /careplan/5 while signed in as Alice (id 4) — Bob’s full care plan is displayed.

### [Intermediate] Patient Edits Own Care Plan (Clinician-Only Function)
- **Objective:** Successfully exploit this flaw in the running app so the Mission Board marks it done.
- **OWASP:** A01:2021 – Broken Access Control
- Hint 1: Goals and instructions in a care plan are supposed to be written by the care team.
- Hint 2: The edit endpoint trusts that you are signed in — it never asks what your role is.
- Hint 3: As a patient, POST /careplan/edit with new goals — your plan is rewritten with no clinician involved.

### [Intermediate] Patient Adds Own Medication (Clinician-Only Function)
- **Objective:** Successfully exploit this flaw in the running app so the Mission Board marks it done.
- **OWASP:** A01:2021 – Broken Access Control
- Hint 1: A medication list is a prescription record — in theory only doctors add to it.
- Hint 2: The add-medication endpoint never checks the caller’s role.
- Hint 3: As a patient, POST /medications/add with any drug and dose — it appears on your official medication list.

## Lab Results

### [Beginner] Lab Result IDOR
- **Objective:** Successfully exploit this flaw in the running app so the Mission Board marks it done.
- **OWASP:** A01:2021 – Broken Access Control
- Hint 1: Result pages are numbered like everything else in this portal.
- Hint 2: Ownership is never checked before a result is shown.
- Hint 3: As Alice, open /results/3 — Bob’s HbA1c result is displayed in full.

### [Intermediate] Unreleased Result Exposed via API Before Clinician Review
- **Objective:** Successfully exploit this flaw in the running app so the Mission Board marks it done.
- **OWASP:** A01:2021 – Broken Access Control
- Hint 1: The results page politely hides results that are still "pending clinician review".
- Hint 2: The JSON API behind the portal does not hide anything at all.
- Hint 3: GET /api/results/2 while signed in as Alice returns her pending-review thyroid result in full, values included.

## Messaging

### [Beginner] Message Thread IDOR
- **Objective:** Successfully exploit this flaw in the running app so the Mission Board marks it done.
- **OWASP:** A01:2021 – Broken Access Control
- Hint 1: Threads are numbered, and the participant check is missing.
- Hint 2: Open a thread id that was never listed for you.
- Hint 3: As Alice, open /messages/2 — the private thread between Bob and his doctor.

### [Advanced] Message Sender Impersonation
- **Objective:** Successfully exploit this flaw in the running app so the Mission Board marks it done.
- **OWASP:** A01:2021 – Broken Access Control
- Hint 1: The send form carries a hidden senderId field — and the server believes whatever it says.
- Hint 2: You can decide who a message claims to be from.
- Hint 3: In your own thread, POST a message with senderId set to the doctor’s id (2) — it appears in the thread as written by the doctor.

### [Intermediate] Stored XSS in Message Body
- **Objective:** Successfully exploit this flaw in the running app so the Mission Board marks it done.
- **OWASP:** A03:2021 – Injection
- Hint 1: Message bodies are printed into the thread page exactly as stored.
- Hint 2: Send markup as a message and view the thread again.
- Hint 3: Send <img src=x onerror=alert(1)> as a message — it is stored and executes for every participant who opens the thread.

## Appointments

### [Intermediate] Book an Appointment for Another Patient
- **Objective:** Successfully exploit this flaw in the running app so the Mission Board marks it done.
- **OWASP:** A01:2021 – Broken Access Control
- Hint 1: The booking form decides whose appointment it is from a patientId field.
- Hint 2: Book while naming somebody else as the patient.
- Hint 3: POST /appointments with patientId=5 — the appointment is created on Bob’s account, not yours.

### [Beginner] Cancel Another Patient’s Appointment
- **Objective:** Successfully exploit this flaw in the running app so the Mission Board marks it done.
- **OWASP:** A01:2021 – Broken Access Control
- Hint 1: Cancelling is just a POST with an appointment id.
- Hint 2: Nobody checks that the appointment belongs to the caller.
- Hint 3: POST /appointments/2/cancel while signed in as Alice — Bob’s appointment is cancelled.

## Admin Panel

### [Beginner] Admin Panel Broken Access Control
- **Objective:** Successfully exploit this flaw in the running app so the Mission Board marks it done.
- **OWASP:** A01:2021 – Broken Access Control
- Hint 1: Try the obvious address directly: /admin.
- Hint 2: The panel checks that you are logged in — and nothing more.
- Hint 3: Open /admin as a patient: the full admin panel, including the user list with passwords, is served.

## Platform & API

### [Beginner] Debug Endpoint Exposes the Whole Database
- **Objective:** Successfully exploit this flaw in the running app so the Mission Board marks it done.
- **OWASP:** A05:2021 – Security Misconfiguration
- Hint 1: Developers leave diagnostic endpoints behind after go-live.
- Hint 2: Try /api/debug — without logging in at all.
- Hint 3: GET /api/debug returns every user (passwords included), visits and results to anyone who asks.

### [Intermediate] Weak API Token (Base64 of Email)
- **Objective:** Successfully exploit this flaw in the running app so the Mission Board marks it done.
- **OWASP:** A07:2021 – Identification and Authentication Failures
- Hint 1: The API accepts an X-Api-Token header instead of a session cookie.
- Hint 2: The token is derived from something completely public about the account.
- Hint 3: Send X-Api-Token with the base64 encoding of bob@test.local to /api/me — you receive Bob’s profile with no password at all.

