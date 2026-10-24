# HexaClinic — Vulnerability Map (LAB 61)

Every scored test in this lab, grouped by feature. Total: **26 tests** across **9 features**. Detection is server-side: a test completes only when the exploit's real effect happens — never by self-declaration.

## Login & Authentication

### SQL Injection Login Bypass
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Beginner
- **How it works:** Go to the login form and put this in the Email field: ' OR '1'='1 (any password). The query is built by string concatenation, so the condition is always true and you are logged in as the first account (the admin).
- **Business impact:** On a real clinic portal this means an attacker walks straight into the admin account — every patient record, prescription and bill is exposed in one request.

### Brute Force — No Rate Limiting or Lockout
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **How it works:** Pick one account (e.g. the demo patient) and submit 10 wrong passwords in a row. Nothing slows down or locks — the test passes when the 10th failure is still accepted for processing.
- **Business impact:** Attackers can grind through passwords for doctor and admin accounts overnight, then access the whole clinic system.

### User Enumeration via Divergent Responses
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **How it works:** Use the Forgot Password page. A registered email gets "reset link sent"; an unknown email gets a different "no account" message. Probe 5 distinct emails to map which accounts exist.
- **Business impact:** An attacker confirms which doctors and patients have accounts, then aims phishing and password attacks only at real targets.

### Demo Credentials Published on the Login Page
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **How it works:** The login page prints a demo patient account under the form. Sign in with exactly those published credentials.
- **Business impact:** Anyone on the internet can sign in as a real patient and start exploring the clinic's data — no skill required.

### Predictable Password-Reset Token
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Intermediate
- **How it works:** Tokens follow a formula: HC + (userId × 137 + 42). User ids are visible in the app (admin is 1, patients are 5 and 6). Compute a token for an account you never requested a reset for and use it on the reset page.
- **Business impact:** An attacker resets the clinic admin's password using only the admin's email and id — full takeover without touching the inbox.

### Role Cookie Tampering — Client-Supplied Role Trusted
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **How it works:** Log in as the demo patient, then set your browser cookie hx_role=doctor (dev tools or curl -b). Open /staff — the staff console trusts the cookie, not your real account.
- **Business impact:** Any patient can promote themselves to "doctor" in their own browser and open staff-only screens full of patient data.

## Registration & Profile

### Weak Password Policy — 1-Character Passwords Accepted
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **How it works:** Register a new account with a password of one character. The account is created and works — the policy accepts anything.
- **Business impact:** Patients who pick tiny passwords get their medical accounts guessed in seconds.

### Mass Assignment — Role Set at Registration
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **How it works:** Intercept the registration POST and add a field role=doctor (or role=admin). The server binds every field it receives, so your new account is created with that role.
- **Business impact:** Anyone can register themselves as a doctor or admin of the clinic — instant insider access to all patient data.

### Stored XSS in Display Name
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Beginner
- **How it works:** Set your display name (registration or profile) to a payload such as <script>alert(1)</script>. It is stored and rendered unescaped in the header and staff views.
- **Business impact:** A malicious "patient name" can run scripts in doctors' browsers — stealing sessions and acting as the doctor.

### CSRF on Profile Update
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **How it works:** While logged in, send the profile-update POST from a different origin (curl with a foreign Origin header, or omit the site origin marker field). The change is applied — no CSRF token exists.
- **Business impact:** A booby-trapped page in a doctor's browser could silently change profile data (or worse) using their logged-in session.

## Appointments

### Appointment IDOR — View Another Patient's Appointment
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **How it works:** Log in as the demo patient and open /appointments/3 — it belongs to another patient, yet it is served to you. Sequential ids make the whole book enumerable.
- **Business impact:** Patients can browse who is seeing which doctor, when, and why — sensitive health information leaks one id at a time.

### Cancel Another Patient's Appointment
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **How it works:** As the demo patient, POST to /appointments/3/cancel. The appointment belongs to another patient but is cancelled anyway.
- **Business impact:** A malicious patient can cancel other people's doctor visits — disrupting care and the clinic's schedule.

### Book an Appointment Under Another Patient's Identity
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **How it works:** Intercept the booking POST and change the patientId field to another patient's id (Karim is patient 2). The appointment is created in his name.
- **Business impact:** Attackers can flood another patient's record with fake bookings, or book visits in someone else's name.

### Slot Overbooking — Capacity Limit Not Enforced
- **OWASP:** A04:2021 – Insecure Design
- **Difficulty:** Intermediate
- **How it works:** Dr. Rahman, 2026-10-24, 09:00 already has 2 appointments (the slot capacity). Book it again — the system accepts a third booking for the same slot.
- **Business impact:** Double- and triple-booked doctors, waiting-room chaos and patients turned away — the schedule stops being trustworthy.

## Medical Records

### Medical Record IDOR — Read Another Patient's Record
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **How it works:** As the demo patient, open /records/2. It is Karim's record — diagnosis, allergies and clinical notes — served without any ownership check.
- **Business impact:** Diagnoses, allergies and doctor notes of every patient readable by any patient — a reportable privacy breach for a real clinic.

### Patient Edits Doctor-Only Diagnosis
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **How it works:** While logged in as a patient, POST to /records/1/edit with a new diagnosis field. The endpoint never checks that you are a doctor, and the record changes.
- **Business impact:** A patient rewriting their own diagnosis or notes corrupts clinical data that doctors rely on to treat them.

### Full Records Export Open to Any Logged-In Account
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **How it works:** As any patient account, open /records/export. You receive a CSV containing every patient's record — an admin/staff function with no role check.
- **Business impact:** One click downloads the entire clinic's patient records — the worst-case breach in a single request.

## Prescriptions

### Prescription IDOR — View Another Patient's Prescription
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **How it works:** Log in as the demo patient and open /prescriptions/2 to read another patient's medication and dosage.
- **Business impact:** Medication lists reveal conditions patients may never have disclosed — a serious privacy violation.

### Patient Issues Their Own Prescription
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **How it works:** As the demo patient, POST to /prescriptions/new with your own patientId, any medicine and dosage. It is saved as an official prescription.
- **Business impact:** Patients self-prescribing medication through the clinic's own system — dangerous and, for the clinic, a severe compliance failure.

## Schedules & Staff

### Patient Modifies a Doctor's Schedule
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **How it works:** Logged in as a patient, POST to /schedules/update for Dr. Rahman with a new status. The schedule changes — no staff role required.
- **Business impact:** An attacker can erase a doctor's whole day — appointments vanish and the clinic grinds to a halt.

### Patient Performs Receptionist Check-In
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **How it works:** As a patient, POST to /appointments/4/checkin. The appointment flips to checked-in although only reception should do that.
- **Business impact:** Fake check-ins corrupt the day's workflow — billing, queues and doctor time all key off this state.

## Billing

### Bill IDOR — View Another Patient's Bill
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **How it works:** As the demo patient, open /bills/2 — Karim's bill, served without an ownership check.
- **Business impact:** Patients can see what others were charged and for which treatments — financial and medical privacy leak together.

### Bill Payment Amount Tampering — Settles in Full for $1
- **OWASP:** A04:2021 – Insecure Design
- **Difficulty:** Beginner
- **How it works:** Open your unpaid bill ($80) and intercept the pay POST: change amount to 1. The bill is marked PAID in full.
- **Business impact:** Every patient can settle every bill for $1 — direct revenue loss for the clinic.

## Admin Panel

### Admin Panel Open to Any Logged-In User
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **How it works:** Log in as the demo patient and open /admin. The admin console renders — it never checks your role.
- **Business impact:** Any patient can open the admin console and browse every account in the clinic system.

### CSRF on Admin User Deactivation
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **How it works:** Send the deactivation POST for a user from a foreign Origin (or without the site's origin marker) using an admin-capable session. The user is deactivated — no CSRF token exists.
- **Business impact:** One booby-trapped page could deactivate the clinic's doctors and staff — a denial of service against the whole practice.

## Platform & API

### Unauthenticated Debug Endpoint Exposes All Accounts
- **OWASP:** A05:2021 – Security Misconfiguration
- **Difficulty:** Beginner
- **How it works:** Open /api/debug in a browser with no session at all. It dumps every user account including passwords as JSON.
- **Business impact:** The entire clinic's credentials — admin included — are one unauthenticated request away. Game over.
