# HexaTelemed — Vulnerability Map (LAB 66)

The complete registry: **26 scored tests across 8 features**. Every flaw below is live in the app and is detected server-side when the exploit actually succeeds. All data is fake seed data; the app is for local training only.

## Login & Authentication (6)

### SQL Injection Login Bypass
- **OWASP:** A03:2021 – Injection
- **Severity (report):** Critical
- **Location:** POST /login (email field)
- **Exploitation outline:** Try email: ' OR '1'='1 with any password.
- **Impact:** On a real telemedicine site this hands an attacker an admin or doctor account — every patient record behind it is exposed.

### Brute Force — No Rate Limiting or Lockout
- **OWASP:** A07:2021 – Authentication Failures
- **Severity (report):** High
- **Location:** POST /login
- **Exploitation outline:** After 10 failures the account still accepts guesses — and the right password still works.
- **Impact:** Attackers can grind through weak passwords overnight and take over real patient accounts and their medical history.

### User Enumeration via Login & Forgot-Password
- **OWASP:** A07:2021 – Authentication Failures
- **Severity (report):** Medium
- **Location:** POST /login, POST /forgot
- **Exploitation outline:** Probe at least 5 different emails and note how the responses differ.
- **Impact:** An attacker learns exactly which email addresses belong to patients of the clinic — perfect material for targeted phishing.

### Default / Demo Credentials Still Active
- **OWASP:** A07:2021 – Authentication Failures
- **Severity (report):** Critical
- **Location:** Seeded admin account
- **Exploitation outline:** Try the classic factory password admin123 on the admin account.
- **Impact:** Anyone on the internet can sign in as the platform administrator and read or alter every patient record.

### Predictable Password Reset Token
- **OWASP:** A07:2021 – Authentication Failures
- **Severity (report):** High
- **Location:** POST /forgot, POST /reset
- **Exploitation outline:** Token = TM<id>-<base36(id*137+42)>. Compute it for another user and reset their password.
- **Impact:** Anyone who knows a patient’s user id can reset their password and read their consultations, notes and prescriptions.

### Role Cookie Tampering — Client-Supplied Role Trusted
- **OWASP:** A01:2021 – Broken Access Control
- **Severity (report):** High
- **Location:** hx_role cookie → GET /doctor
- **Exploitation outline:** Set hx_role=doctor in your browser while logged in as a patient, then open /doctor.
- **Impact:** Any patient can promote themselves to doctor — issuing prescriptions and reading other patients’ notes.

## Registration & Profile (4)

### Weak Password Policy (1-Character Passwords)
- **OWASP:** A07:2021 – Authentication Failures
- **Severity (report):** Medium
- **Location:** POST /register
- **Exploitation outline:** Create an account with the password "a" — it is accepted.
- **Impact:** Patient accounts with trivial passwords are harvested by credential guessing, exposing private health data.

### Mass Assignment — Role Escalation at Registration
- **OWASP:** A01:2021 – Broken Access Control
- **Severity (report):** High
- **Location:** POST /register (role field)
- **Exploitation outline:** POST /register with an extra field role=doctor (or admin) and check your new account.
- **Impact:** Attackers self-register as doctors or admins, bypassing every approval step the clinic relies on.

### Stored XSS in Display Name
- **OWASP:** A03:2021 – Injection
- **Severity (report):** High
- **Location:** Display name → all pages + /admin
- **Exploitation outline:** Register or update your profile with a name like <svg onload=alert(1)> and view a page that shows it.
- **Impact:** A malicious patient name can run script in a doctor’s or admin’s browser and hijack their session.

### CSRF on Profile Update
- **OWASP:** A01:2021 – Broken Access Control
- **Severity (report):** Medium
- **Location:** POST /profile (hx_marker never verified)
- **Exploitation outline:** POST /profile with new details but WITHOUT hx_marker — the change still saves.
- **Impact:** A booby-trapped page could silently change a doctor’s profile or a patient’s contact details while they browse.

## Doctors & Availability (3)

### SQL Injection in Doctor Search
- **OWASP:** A03:2021 – Injection
- **Severity (report):** High
- **Location:** GET /doctors?q=
- **Exploitation outline:** Search for: ' OR '1'='1 and compare the result count with a normal search.
- **Impact:** Attackers can dump the full doctor roster and probe for deeper injection into the patient database.

### Reflected XSS in Doctor Search
- **OWASP:** A03:2021 – Injection
- **Severity (report):** Medium
- **Location:** GET /doctors?q= (term reflected raw)
- **Exploitation outline:** Search for <script>alert(1)</script> and view the page source.
- **Impact:** A crafted search link sent to staff executes script in their browser under the clinic’s trusted domain.

### Doctor Availability Manipulation by Patients
- **OWASP:** A01:2021 – Broken Access Control
- **Severity (report):** High
- **Location:** POST /doctors/:id/availability
- **Exploitation outline:** As a patient, POST new availability for a doctor and watch their booking page change.
- **Impact:** A vandal can wipe a doctor’s calendar — patients cannot book, the clinic loses revenue and trust.

## Appointments & Sessions (5)

### Consultation Fee Tampering
- **OWASP:** A04:2021 – Insecure Design
- **Severity (report):** High
- **Location:** POST /book (fee field)
- **Exploitation outline:** Book a consultation but send fee=1 instead of the listed price.
- **Impact:** Patients book $80 consultations for $1. The clinic’s billing silently bleeds money.

### Appointment IDOR — Other Patients' Bookings Exposed
- **OWASP:** A01:2021 – Broken Access Control
- **Severity (report):** High
- **Location:** GET /appointments/:id
- **Exploitation outline:** Open /appointments/2 while logged in as a different patient.
- **Impact:** Anyone can read who is seeing which doctor, when, and for what specialty — sensitive health information in itself.

### Predictable Session Room — Join Another Patient's Consultation
- **OWASP:** A01:2021 – Broken Access Control
- **Severity (report):** Critical
- **Location:** GET /session/:roomCode (sequential codes)
- **Exploitation outline:** Guess the room code of another patient’s booked session and open it while logged in as someone else.
- **Impact:** A stranger can drop into a live medical consultation — an extreme privacy breach for the patient.

### Follow-up Booking on Another Patient's Record
- **OWASP:** A01:2021 – Broken Access Control
- **Severity (report):** Medium
- **Location:** POST /appointments/:id/followup
- **Exploitation outline:** Create a follow-up on another patient’s appointment id.
- **Impact:** Attackers inject fake appointments into a victim’s medical record, confusing care and billing.

### Cancel Another Patient's Appointment
- **OWASP:** A01:2021 – Broken Access Control
- **Severity (report):** Medium
- **Location:** POST /appointments/:id/cancel
- **Exploitation outline:** As one patient, cancel a booking that belongs to someone else.
- **Impact:** A griefer can cancel real patients’ doctor visits, delaying care and creating chaos at the clinic.

## Consultation Notes (2)

### Consultation Notes IDOR — Private Doctor Notes Exposed
- **OWASP:** A01:2021 – Broken Access Control
- **Severity (report):** Critical
- **Location:** GET /appointments/:id/notes
- **Exploitation outline:** Read the notes of an appointment that is not yours.
- **Impact:** Full consultation notes — symptoms, advice, history — leak to any logged-in stranger.

### Patient Writes the Doctor's Consultation Notes
- **OWASP:** A01:2021 – Broken Access Control
- **Severity (report):** High
- **Location:** POST /appointments/:id/notes
- **Exploitation outline:** As a patient, POST a note to your own appointment and see it stored as a clinical note.
- **Impact:** Patients can fabricate clinical notes in their own record — a medico-legal nightmare for the clinic.

## Prescriptions (3)

### Self-Prescribing Without Any Consultation
- **OWASP:** A01:2021 – Broken Access Control
- **Severity (report):** Critical
- **Location:** POST /prescriptions
- **Exploitation outline:** As a patient, create a prescription naming yourself as the patient, with any medication.
- **Impact:** Patients prescribe themselves arbitrary medication — dangerous for them and a regulatory disaster for the platform.

### Prescription IDOR — Other Patients' Medication Exposed
- **OWASP:** A01:2021 – Broken Access Control
- **Severity (report):** High
- **Location:** GET /prescriptions/:id
- **Exploitation outline:** Open a prescription that belongs to another patient.
- **Impact:** Anyone can learn exactly what medication any patient takes — deeply private health data.

### Refill Beyond the Prescribed Limit
- **OWASP:** A04:2021 – Insecure Design
- **Severity (report):** High
- **Location:** POST /prescriptions/:id/refill
- **Exploitation outline:** Find a prescription with 0 refills left and POST /prescriptions/<id>/refill anyway.
- **Impact:** Patients obtain unlimited refills of medication the doctor deliberately limited — a patient-safety issue.

## Admin Panel (1)

### Admin Panel Open to Any Logged-in User
- **OWASP:** A01:2021 – Broken Access Control
- **Severity (report):** Critical
- **Location:** GET /admin
- **Exploitation outline:** Open /admin while logged in as a plain patient.
- **Impact:** The full user list — with credentials — is visible to every patient account on the platform.

## Platform & API (2)

### Forgeable API Token (Base64 of the Email Address)
- **OWASP:** A07:2021 – Authentication Failures
- **Severity (report):** High
- **Location:** GET /api/appointments (Authorization: Bearer)
- **Exploitation outline:** Try Authorization: Bearer base64(email) for a victim account.
- **Impact:** Anyone who knows a patient’s email address gets full API access to their appointments.

### Unauthenticated Debug Endpoint Exposes All Accounts
- **OWASP:** A05:2021 – Security Misconfiguration
- **Severity (report):** Critical
- **Location:** GET /api/debug
- **Exploitation outline:** The response includes every account… and its password.
- **Impact:** One public URL hands attackers every patient and doctor credential on the platform.
