# HexaDental — Vulnerabilities (complete test map)

LAB 65 of the HexaCyberLab programme · Category 7: Healthcare & Wellness · Port 3074

This lab contains **26 scored vulnerability tests across 8 features**. Every test below is a real, working flaw in the app; the in-lab Mission Board (`/tests`) tracks them and each one flips to done only when the exploit actually succeeds server-side.

## Login & Authentication (6)

### SQL injection login bypass
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **Where / how:** Use alice' OR '1'='1 as the email and any password — you should land in an account that is not yours.
- **Impact:** On a real clinic site this hands an attacker the first account in the database — usually an admin — and with it every patient record the clinic holds.

### Brute force — no rate limit or lockout
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Beginner
- **Where / how:** Send at least 10 wrong passwords for bob@test.local in a row; every one is processed at full speed.
- **Impact:** Attackers run password lists against patient and staff accounts until one opens; dental records and billing details sit behind a single guessed password.

### User enumeration via differing responses
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Beginner
- **Where / how:** Probe at least 5 different emails on /forgot: real accounts get "reset link sent", unknown ones get a different message.
- **Impact:** An attacker builds a verified list of patient and staff emails, then aims phishing and password attacks only at real accounts.

### Default administrator credentials
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Beginner
- **Where / how:** Sign in as admin@hexadental.local with the password admin123.
- **Impact:** Full clinic takeover in seconds: patient records, invoices and staff accounts — from a password printed in every attacker wordlist.

### Predictable password-reset token
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Intermediate
- **Where / how:** Tokens are HD-<userId x 271 + 13>. Bob is user 5, so compute his token and reset his password without ever requesting a reset for him.
- **Impact:** Anyone can take over any patient or staff account — including the admin — with nothing but the victim's user id.

### Session role cookie tampering
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Where / how:** As a patient, set the hx_role cookie to dentist and open /dentist — the server believes the cookie, not the account.
- **Impact:** Any patient becomes "staff" by editing a cookie, reaching schedules, plans and patient data meant for clinicians only.

## Registration & Profile (4)

### Weak password policy on registration
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Beginner
- **Where / how:** Register with a 1-character password such as "x" — it is accepted.
- **Impact:** Patient accounts protected by one-character passwords are harvested wholesale in any credential attack.

### Mass assignment — self-assigned staff role
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Where / how:** Add role=dentist to the registration POST — the new account is created as a dentist.
- **Impact:** Anyone on the internet can mint themselves a staff account and browse the clinic's patients, plans and billing.

### Stored XSS in display name
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **Where / how:** Register with the display name <script>alert(1)</script> — it is stored and rendered raw to viewers.
- **Impact:** A malicious "patient name" runs script in the receptionist's or dentist's browser — session theft and actions performed as staff.

### CSRF on profile update
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Where / how:** POST to /profile/update as a logged-in user WITHOUT the hx_origin field — the change is accepted anyway.
- **Impact:** A booby-trapped page a patient visits can silently rewrite their profile — or a staff member's — using their own session.

## Appointments (3)

### Appointment IDOR — view another patient's booking
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **Where / how:** As Alice, open /appointments/2 — that is Bob's appointment, served to you in full.
- **Impact:** Patients can browse each other's visits — who is being treated, when, and for what — a direct privacy breach for a clinic.

### Double-booking a taken slot
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate
- **Where / how:** Book Dr. Rahman at 2026-11-02 10:00 for yourself — it is accepted alongside Alice's existing booking.
- **Impact:** Attackers (or a rival) can flood a dentist's diary with clashing bookings, wrecking the clinic's schedule and turning real patients away.

### Cancel another patient's appointment
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **Where / how:** As Alice, POST /appointments/2/cancel — Bob's appointment is cancelled.
- **Impact:** Any patient can sabotage any other patient's care by cancelling their appointments — missed treatment, chaos at reception.

## Treatment Plans (4)

### Treatment plan IDOR — another patient's plan and costs
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **Where / how:** As Bob, open /plans/1 — Alice's root-canal plan, items and total, all visible.
- **Impact:** Competitors or snoops harvest patients' treatments and the prices they were quoted — privacy damage and commercial harm in one.

### Treatment cost tampering via client-supplied item price
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate
- **Where / how:** Add a Crown to a plan with price=1 instead of 450; the plan total drops to your price.
- **Impact:** Treatment sold for pennies: patients (or a bent insider) rewrite quotes, and the clinic's invoicing inherits the fake totals.

### Patient approves their own treatment plan
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Where / how:** As Alice, POST /plans/1/approve on your own proposed plan — it becomes approved without any dentist.
- **Impact:** Patients self-approve treatment (and the quotes and insurance paperwork built on it) that no clinician ever reviewed.

### Patient marks their own treatment complete
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Where / how:** As the plan's patient, POST /plans/<id>/complete — the treatment is recorded as done and ready to bill.
- **Impact:** Fake "completed" treatments feed invoices and insurance claims for work never done — textbook healthcare billing fraud, enabled by one missing check.

## Records & X-rays (2)

### Clinical record IDOR — another patient's X-ray record
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **Where / how:** As Alice, open /records/2 — Bob's bitewing X-ray record and findings.
- **Impact:** A clinic's entire imaging history — every patient's X-rays and clinical notes — readable by anyone with a free account.

### Path traversal on record download
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Where / how:** Request /download?file=../server.js — the application source code comes back.
- **Impact:** Attackers walk out of the records folder into configuration, source code and any file the server can read — the foothold for a full breach.

## Invoices & Payment Plans (3)

### Invoice IDOR — another patient's bill
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **Where / how:** As Alice, open /invoices/2 — Bob's invoice, totals and payment state.
- **Impact:** Patients see each other's bills — treatment costs are health information too, and invoice data feeds convincing invoice-fraud scams.

### Invoice settled for $1 via payment amount tampering
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate
- **Where / how:** POST /invoices/1/pay with amount=1 — a $1,100 invoice becomes PAID with $1 recorded.
- **Impact:** Patients clear four-figure treatment bills for a dollar; the clinic's ledger says paid, so nobody chases the difference.

### Payment plan terms forgery — 60 months at 0% APR
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate
- **Where / how:** Create a payment plan with months=60 and apr=0 — the forbidden terms are stored as agreed.
- **Impact:** Interest-free five-year plans appear from nowhere, quietly rewriting what patients owe and when — finance finds out at audit, if ever.

## Admin Panel (2)

### Broken access control — all-invoices admin report open to any user
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **Where / how:** As any patient, open /admin/invoices — every patient's invoices are listed.
- **Impact:** The clinic's complete billing ledger — every patient, every treatment price — exposed to any account holder.

### CSRF on admin user deactivation
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Advanced
- **Where / how:** POST /admin/users/5/deactivate with no hx_origin field — Bob's account is deactivated by your request.
- **Impact:** Trick an admin into opening a page and their own browser deactivates staff or patient accounts — denial of service with the admin's authority.

## Platform & API (2)

### Unauthenticated debug endpoint dumps all accounts
- **OWASP:** A05:2021 Security Misconfiguration · **Difficulty:** Beginner
- **Where / how:** Open /api/debug in a private window: every account and its plaintext password.
- **Impact:** Total compromise in one request: every patient and staff password, ready for credential stuffing against their email and banking too.

### Forgeable API token — base64 of email
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Intermediate
- **Where / how:** Send Authorization: Bearer hd_<base64 of bob@test.local> to /api/me — you are Bob, no password needed.
- **Impact:** Anyone who knows a victim's email address — printed on every invoice — owns their API identity and everything it can reach.
