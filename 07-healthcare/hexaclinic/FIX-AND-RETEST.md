# HexaClinic — Fix & Retest Guide (LAB 61)

For every test: the secure implementation and a regression check. After fixing, re-run the original exploit — it must fail — then confirm legitimate use still works.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass
- **Severity:** Critical
- **Secure implementation:** Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.
- **Retest:** Repeat the exploit from VULNERABILITIES.md ("SQL Injection Login Bypass"). Expected after the fix: the exploit is blocked (403 / no effect / generic response) and the corresponding Mission Board test can no longer be completed, while the normal user flow for that feature still succeeds.

### Missing Brute-Force Protection on Login (No Rate Limit / Lockout)
- **Severity:** High
- **Secure implementation:** Add progressive delays, account lockout and alerting on repeated failed logins.
- **Retest:** Repeat the exploit from VULNERABILITIES.md ("Brute Force — No Rate Limiting or Lockout"). Expected after the fix: the exploit is blocked (403 / no effect / generic response) and the corresponding Mission Board test can no longer be completed, while the normal user flow for that feature still succeeds.

### Account Enumeration via Password-Reset and Login Error Messages
- **Severity:** Medium
- **Secure implementation:** Return one identical, generic response for every reset/login attempt regardless of account existence.
- **Retest:** Repeat the exploit from VULNERABILITIES.md ("User Enumeration via Divergent Responses"). Expected after the fix: the exploit is blocked (403 / no effect / generic response) and the corresponding Mission Board test can no longer be completed, while the normal user flow for that feature still succeeds.

### Demo Account Credentials Disclosed on the Public Login Page
- **Severity:** High
- **Secure implementation:** Remove demo credentials from production; disable default accounts or force unique passwords.
- **Retest:** Repeat the exploit from VULNERABILITIES.md ("Demo Credentials Published on the Login Page"). Expected after the fix: the exploit is blocked (403 / no effect / generic response) and the corresponding Mission Board test can no longer be completed, while the normal user flow for that feature still succeeds.

### Password-Reset Tokens Are Predictable (Derived from User ID)
- **Severity:** High
- **Secure implementation:** Generate reset tokens with a CSPRNG (≥128 bits), store hashed, expire quickly and allow single use.
- **Retest:** Repeat the exploit from VULNERABILITIES.md ("Predictable Password-Reset Token"). Expected after the fix: the exploit is blocked (403 / no effect / generic response) and the corresponding Mission Board test can no longer be completed, while the normal user flow for that feature still succeeds.

### Staff Console Trusts a Client-Supplied Role Cookie
- **Severity:** High
- **Secure implementation:** Derive roles from the server-side session record only; ignore role claims from cookies or request data.
- **Retest:** Repeat the exploit from VULNERABILITIES.md ("Role Cookie Tampering — Client-Supplied Role Trusted"). Expected after the fix: the exploit is blocked (403 / no effect / generic response) and the corresponding Mission Board test can no longer be completed, while the normal user flow for that feature still succeeds.

## Registration & Profile

### No Minimum Password Strength Enforced at Registration
- **Severity:** Medium
- **Secure implementation:** Enforce a minimum length (≥10–12) and block common/breached passwords at registration and reset.
- **Retest:** Repeat the exploit from VULNERABILITIES.md ("Weak Password Policy — 1-Character Passwords Accepted"). Expected after the fix: the exploit is blocked (403 / no effect / generic response) and the corresponding Mission Board test can no longer be completed, while the normal user flow for that feature still succeeds.

### Mass Assignment in Registration Allows Self-Assignment of Privileged Roles
- **Severity:** Critical
- **Secure implementation:** Whitelist assignable fields server-side; set role explicitly in code, never from request data.
- **Retest:** Repeat the exploit from VULNERABILITIES.md ("Mass Assignment — Role Set at Registration"). Expected after the fix: the exploit is blocked (403 / no effect / generic response) and the corresponding Mission Board test can no longer be completed, while the normal user flow for that feature still succeeds.

### Stored Cross-Site Scripting via Display Name
- **Severity:** High
- **Secure implementation:** Context-encode all user-supplied output; add a Content-Security-Policy as defence in depth.
- **Retest:** Repeat the exploit from VULNERABILITIES.md ("Stored XSS in Display Name"). Expected after the fix: the exploit is blocked (403 / no effect / generic response) and the corresponding Mission Board test can no longer be completed, while the normal user flow for that feature still succeeds.

### Missing CSRF Protection on Profile Update
- **Severity:** Medium
- **Secure implementation:** Require a per-session CSRF token on every state-changing request and validate Origin/Referer.
- **Retest:** Repeat the exploit from VULNERABILITIES.md ("CSRF on Profile Update"). Expected after the fix: the exploit is blocked (403 / no effect / generic response) and the corresponding Mission Board test can no longer be completed, while the normal user flow for that feature still succeeds.

## Appointments

### Insecure Direct Object Reference on Appointment Details
- **Severity:** High
- **Secure implementation:** Enforce per-object ownership checks on the server for every appointment read.
- **Retest:** Repeat the exploit from VULNERABILITIES.md ("Appointment IDOR — View Another Patient's Appointment"). Expected after the fix: the exploit is blocked (403 / no effect / generic response) and the corresponding Mission Board test can no longer be completed, while the normal user flow for that feature still succeeds.

### Missing Ownership Check Allows Cancelling Other Patients' Appointments
- **Severity:** High
- **Secure implementation:** Verify ownership (or staff role) server-side before mutating any appointment.
- **Retest:** Repeat the exploit from VULNERABILITIES.md ("Cancel Another Patient's Appointment"). Expected after the fix: the exploit is blocked (403 / no effect / generic response) and the corresponding Mission Board test can no longer be completed, while the normal user flow for that feature still succeeds.

### Booking Endpoint Trusts Client-Supplied patientId (Identity Forgery)
- **Severity:** High
- **Secure implementation:** Take the patient identity from the authenticated session; ignore patientId in request bodies.
- **Retest:** Repeat the exploit from VULNERABILITIES.md ("Book an Appointment Under Another Patient's Identity"). Expected after the fix: the exploit is blocked (403 / no effect / generic response) and the corresponding Mission Board test can no longer be completed, while the normal user flow for that feature still succeeds.

### Appointment Slot Capacity Is Not Enforced Server-Side
- **Severity:** Medium
- **Secure implementation:** Check slot occupancy in the booking transaction and reject bookings beyond capacity.
- **Retest:** Repeat the exploit from VULNERABILITIES.md ("Slot Overbooking — Capacity Limit Not Enforced"). Expected after the fix: the exploit is blocked (403 / no effect / generic response) and the corresponding Mission Board test can no longer be completed, while the normal user flow for that feature still succeeds.

## Medical Records

### Insecure Direct Object Reference Exposes Patient Medical Records
- **Severity:** Critical
- **Secure implementation:** Check record ownership / care-team membership server-side on every record access.
- **Retest:** Repeat the exploit from VULNERABILITIES.md ("Medical Record IDOR — Read Another Patient's Record"). Expected after the fix: the exploit is blocked (403 / no effect / generic response) and the corresponding Mission Board test can no longer be completed, while the normal user flow for that feature still succeeds.

### Broken Function-Level Authorization — Patients Can Edit Clinical Diagnoses
- **Severity:** High
- **Secure implementation:** Enforce doctor-role checks server-side on all clinical write endpoints.
- **Retest:** Repeat the exploit from VULNERABILITIES.md ("Patient Edits Doctor-Only Diagnosis"). Expected after the fix: the exploit is blocked (403 / no effect / generic response) and the corresponding Mission Board test can no longer be completed, while the normal user flow for that feature still succeeds.

### Sensitive Bulk Export (All Patient Records) Missing Role Authorization
- **Severity:** Critical
- **Secure implementation:** Restrict exports to admin role, log every export, and alert on bulk downloads.
- **Retest:** Repeat the exploit from VULNERABILITIES.md ("Full Records Export Open to Any Logged-In Account"). Expected after the fix: the exploit is blocked (403 / no effect / generic response) and the corresponding Mission Board test can no longer be completed, while the normal user flow for that feature still succeeds.

## Prescriptions

### Insecure Direct Object Reference on Prescription Details
- **Severity:** High
- **Secure implementation:** Enforce ownership/care-team checks on every prescription read.
- **Retest:** Repeat the exploit from VULNERABILITIES.md ("Prescription IDOR — View Another Patient's Prescription"). Expected after the fix: the exploit is blocked (403 / no effect / generic response) and the corresponding Mission Board test can no longer be completed, while the normal user flow for that feature still succeeds.

### Broken Function-Level Authorization — Patients Can Create Prescriptions
- **Severity:** Critical
- **Secure implementation:** Require the doctor role server-side for prescription creation; audit all issuances.
- **Retest:** Repeat the exploit from VULNERABILITIES.md ("Patient Issues Their Own Prescription"). Expected after the fix: the exploit is blocked (403 / no effect / generic response) and the corresponding Mission Board test can no longer be completed, while the normal user flow for that feature still succeeds.

## Schedules & Staff

### Missing Role Check Allows Patients to Alter Doctor Schedules
- **Severity:** High
- **Secure implementation:** Restrict schedule writes to receptionist/admin roles server-side.
- **Retest:** Repeat the exploit from VULNERABILITIES.md ("Patient Modifies a Doctor's Schedule"). Expected after the fix: the exploit is blocked (403 / no effect / generic response) and the corresponding Mission Board test can no longer be completed, while the normal user flow for that feature still succeeds.

### Receptionist Check-In Function Callable by Patients
- **Severity:** Medium
- **Secure implementation:** Verify receptionist/staff role server-side for every workflow transition.
- **Retest:** Repeat the exploit from VULNERABILITIES.md ("Patient Performs Receptionist Check-In"). Expected after the fix: the exploit is blocked (403 / no effect / generic response) and the corresponding Mission Board test can no longer be completed, while the normal user flow for that feature still succeeds.

## Billing

### Insecure Direct Object Reference on Billing Details
- **Severity:** High
- **Secure implementation:** Enforce bill ownership checks server-side on every read.
- **Retest:** Repeat the exploit from VULNERABILITIES.md ("Bill IDOR — View Another Patient's Bill"). Expected after the fix: the exploit is blocked (403 / no effect / generic response) and the corresponding Mission Board test can no longer be completed, while the normal user flow for that feature still succeeds.

### Payment Amount Trusted from Client Allows Settling Bills for $1
- **Severity:** High
- **Secure implementation:** Compute payable amounts server-side from the bill record; reconcile with the payment provider before marking paid.
- **Retest:** Repeat the exploit from VULNERABILITIES.md ("Bill Payment Amount Tampering — Settles in Full for $1"). Expected after the fix: the exploit is blocked (403 / no effect / generic response) and the corresponding Mission Board test can no longer be completed, while the normal user flow for that feature still succeeds.

## Admin Panel

### Broken Access Control — Admin Console Accessible to Non-Admin Users
- **Severity:** High
- **Secure implementation:** Add a server-side admin-role gate to every /admin route.
- **Retest:** Repeat the exploit from VULNERABILITIES.md ("Admin Panel Open to Any Logged-In User"). Expected after the fix: the exploit is blocked (403 / no effect / generic response) and the corresponding Mission Board test can no longer be completed, while the normal user flow for that feature still succeeds.

### Missing CSRF Protection on Administrative User Deactivation
- **Severity:** High
- **Secure implementation:** Require per-session CSRF tokens on all admin state changes; add confirmation for destructive actions.
- **Retest:** Repeat the exploit from VULNERABILITIES.md ("CSRF on Admin User Deactivation"). Expected after the fix: the exploit is blocked (403 / no effect / generic response) and the corresponding Mission Board test can no longer be completed, while the normal user flow for that feature still succeeds.

## Platform & API

### Debug Endpoint Exposes User Accounts Including Plaintext Passwords Without Authentication
- **Severity:** Critical
- **Secure implementation:** Remove debug endpoints from production builds; never store or return plaintext passwords.
- **Retest:** Repeat the exploit from VULNERABILITIES.md ("Unauthenticated Debug Endpoint Exposes All Accounts"). Expected after the fix: the exploit is blocked (403 / no effect / generic response) and the corresponding Mission Board test can no longer be completed, while the normal user flow for that feature still succeeds.
