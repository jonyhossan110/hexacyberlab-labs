# HexaCare — Vulnerability Map (LAB 62)

HexaCare is a deliberately vulnerable patient portal. This document is the complete map of the lab: **26 scored tests across 9 features**. Every test below maps to a real, working flaw in the application and is detected server-side when the exploit actually succeeds.

## Login & Authentication (6)

### SQL Injection Login Bypass
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Intermediate
- **Location:** POST /login
- **What it is:** String-built queries let an attacker rewrite the login logic itself; parameterised queries keep data and code separate.
- **Client impact:** On a real clinic portal this hands an attacker an admin session with no password at all — every patient record behind it is exposed.
- **Report severity:** Critical — SQL Injection in Login Form Allows Authentication Bypass

### No Brute-Force Protection on Login
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /login
- **What it is:** Without throttling or lockout, online password guessing is only a matter of time and a wordlist.
- **Client impact:** Patient accounts fall to credential stuffing and dictionary attacks, exposing private health information and messages.
- **Report severity:** High — Missing Brute-Force Protection on Authentication Endpoint

### User Enumeration via Password Reset
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /forgot
- **What it is:** Different responses for existing and non-existing accounts let attackers build a verified target list for phishing and password attacks.
- **Client impact:** Attackers learn exactly which patients use the portal — a ready-made, targeted phishing list against a healthcare provider.
- **Report severity:** Medium — Account Enumeration Through Password-Reset Responses

### Published Demo Credentials Grant Real Access
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /login (demo account)
- **What it is:** Demo and default accounts left active in production are simply open doors with a sign on them.
- **Client impact:** Anyone on the internet can walk into the portal with the published demo login and explore a real patient account.
- **Report severity:** High — Active Demo Account With Publicly Displayed Credentials

### Predictable Password-Reset Token
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Intermediate
- **Location:** POST /reset
- **What it is:** Password-reset tokens must be long, random and single-use; a formula anyone can compute is equivalent to no token at all.
- **Client impact:** Any patient account — or a doctor account — can be taken over in seconds by anyone who knows the formula.
- **Report severity:** Critical — Password-Reset Tokens Are Predictable

### Role Cookie Tampering Opens the Clinician Console
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** GET /clinician (hx_role cookie)
- **What it is:** Authorisation decisions must be made from server-side session data, never from values the client can edit.
- **Client impact:** A patient becomes a "doctor" by editing one cookie and sees every patient on the clinician console.
- **Report severity:** High — Client-Side Role Cookie Trusted for Authorisation

## Registration & Profile (4)

### Weak Password Policy at Registration
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /register
- **What it is:** A password policy that accepts anything invites accounts that can be guessed in a handful of tries.
- **Client impact:** Patients protect sensitive health data with passwords like "x", making account takeover trivial.
- **Report severity:** Medium — No Minimum Password Strength Enforced at Registration

### Mass Assignment — Self-Assigned Doctor Role
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /register
- **What it is:** Binding request fields directly onto an account object lets clients set fields that were never offered to them, like role.
- **Client impact:** Anyone can register themselves as a doctor and immediately access clinical functions and patient data.
- **Report severity:** Critical — Mass Assignment Allows Role Escalation at Registration

### Stored XSS in Display Name
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Beginner
- **Location:** POST /profile + POST /register (display name)
- **What it is:** Any user-controlled text that is rendered unescaped becomes stored XSS — and staff browsers are the high-value target.
- **Client impact:** An attacker plants a script in their name that runs in a doctor’s or admin’s browser, hijacking their session.
- **Report severity:** High — Stored Cross-Site Scripting via Display Name

### CSRF on Profile Update
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /profile
- **What it is:** State-changing requests need an unforgeable proof of intent — a CSRF token or strict same-site checks.
- **Client impact:** A malicious page a patient visits can silently rewrite their profile while they are logged in.
- **Report severity:** Medium — Missing CSRF Protection on Profile Update

## Visits & Clinical Notes (3)

### Visit Record IDOR
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /visits/<id>
- **What it is:** Sequential ids plus a missing ownership check turn every record in the system into public reading.
- **Client impact:** Every patient’s visit history and diagnoses can be read by any other patient — a serious medical-privacy breach.
- **Report severity:** High — Insecure Direct Object Reference on Visit Records

### Patient Can Edit Clinician Visit Notes
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /visits/<id>/note
- **What it is:** Hiding a control in the UI is not authorisation; the server must check the role on every privileged action.
- **Client impact:** A patient can falsify their own medical record — changing what a doctor wrote is a patient-safety issue, not just a data issue.
- **Report severity:** High — Missing Role Check Allows Patients to Modify Clinical Notes

### Patient Can Delete Visit Records
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /visits/<id>/delete
- **What it is:** Destructive endpoints need the strictest authorisation checks; a delete that trusts the caller destroys evidence and history.
- **Client impact:** Patients can erase visits from their record, breaking continuity of care and destroying the audit trail.
- **Report severity:** High — Unauthorised Deletion of Medical Visit Records

## Care Plans & Medications (3)

### Care Plan IDOR
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /careplan/<userId>
- **What it is:** If the URL names the owner, the server must prove the requester is that owner (or their clinician) on every request.
- **Client impact:** Treatment goals and instructions for every patient are readable by every other patient.
- **Report severity:** High — Insecure Direct Object Reference on Care Plans

### Patient Edits Own Care Plan (Clinician-Only Function)
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /careplan/edit
- **What it is:** Read/write role separation matters inside a feature, not just between pages: viewing your plan is fine, authoring it is not.
- **Client impact:** Patients can rewrite their own treatment plan, and later clinicians may act on instructions no clinician ever gave.
- **Report severity:** High — Patients Can Modify Clinician-Authored Care Plans

### Patient Adds Own Medication (Clinician-Only Function)
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /medications/add
- **What it is:** Every privileged write needs a server-side role check; the form’s absence from the patient UI changes nothing.
- **Client impact:** A patient can put unprescribed medication on their official list, misleading every clinician who treats them.
- **Report severity:** High — Patients Can Add Entries to Their Prescribed Medication List

## Lab Results (2)

### Lab Result IDOR
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /results/<id>
- **What it is:** Laboratory results are among the most sensitive records a portal holds; they need the same ownership checks as everything else.
- **Client impact:** Any patient can read any other patient’s test values — diagnoses included.
- **Report severity:** Critical — Insecure Direct Object Reference on Laboratory Results

### Unreleased Result Exposed via API Before Clinician Review
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** GET /api/results/<id>
- **What it is:** Release/review workflow rules must be enforced in the data layer and every API — not just by hiding things in one UI.
- **Client impact:** Patients see alarming raw values with no clinical context or counselling, exactly what the review step exists to prevent.
- **Report severity:** High — Unreviewed Lab Results Accessible Through API

## Messaging (3)

### Message Thread IDOR
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /messages/<id>
- **What it is:** Private conversations need participant checks on every read, not just an unlisted URL.
- **Client impact:** Private patient–doctor conversations — symptoms, fears, family details — are readable by any patient.
- **Report severity:** High — Insecure Direct Object Reference on Message Threads

### Message Sender Impersonation
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Advanced
- **Location:** POST /messages/<id>/send
- **What it is:** The sender of a message must come from the authenticated session, never from a request field.
- **Client impact:** A patient can forge "doctor" messages — fake medical advice inside a trusted clinical channel.
- **Report severity:** Critical — Message Sender Identity Taken From Client Input

### Stored XSS in Message Body
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Intermediate
- **Location:** POST /messages/<id>/send
- **What it is:** Chat and messaging surfaces are classic stored-XSS carriers because the victim is guaranteed to open them.
- **Client impact:** A script planted in a thread runs in the doctor’s browser when they read the message — session theft inside the care channel.
- **Report severity:** High — Stored Cross-Site Scripting in Secure Messaging

## Appointments (2)

### Book an Appointment for Another Patient
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /appointments
- **What it is:** The subject of a created record must be derived from the session or explicitly authorised — never trusted from the request.
- **Client impact:** Attackers fill other patients’ schedules with fake appointments and disrupt a clinic’s day.
- **Report severity:** Medium — Appointment Booking Trusts Client-Supplied Patient Identity

### Cancel Another Patient’s Appointment
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Location:** POST /appointments/<id>/cancel
- **What it is:** Every object action — view, edit, cancel, delete — needs its own ownership check; one missing check is a full break.
- **Client impact:** Patients can sabotage each other’s care by cancelling real appointments with specialists.
- **Report severity:** Medium — Missing Ownership Check on Appointment Cancellation

## Admin Panel (1)

### Admin Panel Broken Access Control
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /admin
- **What it is:** "You must be logged in" is not the same as "you must be an admin" — role checks belong on every privileged route.
- **Client impact:** The entire user base, credentials included, is one URL away for any registered patient.
- **Report severity:** Critical — Admin Panel Accessible to Non-Admin Users

## Platform & API (2)

### Debug Endpoint Exposes the Whole Database
- **OWASP:** A05:2021 – Security Misconfiguration
- **Difficulty:** Beginner
- **Location:** GET /api/debug
- **What it is:** Debug and diagnostic endpoints must never reach production; if they do, they are unauthenticated data breaches waiting for a scanner.
- **Client impact:** The complete patient database — accounts, passwords, visits, results — is downloadable by anyone on the internet.
- **Report severity:** Critical — Unauthenticated Debug Endpoint Discloses Full Database

### Weak API Token (Base64 of Email)
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Intermediate
- **Location:** GET /api/me (X-Api-Token)
- **What it is:** An API token must be a high-entropy secret; encoding a public identifier is not authentication.
- **Client impact:** Anyone who knows a patient’s email address — public information — owns their API identity.
- **Report severity:** High — API Tokens Are a Publicly Derivable Encoding of the Email Address


*The lock gate, progress system and completion-key mechanism are described in README.md. Key values are never written in any document.*
