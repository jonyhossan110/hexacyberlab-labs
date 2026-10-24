# HexaCare — Fix & Retest Guide (LAB 62)

For every scored test: the secure implementation that removes the flaw, and the regression retest that proves it. Apply the fix to a copy of the lab, restart it, and repeat the original exploit — it must now fail.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass
- **Severity:** Critical
- **Secure implementation:** Use parameterised queries / prepared statements for all database access and reject unexpected input.
- **Retest:** Repeat the exploit for "SQL Injection Login Bypass" (POST /login). Expected after the fix: the exploit no longer succeeds, the Mission Board test does not flip, and normal use of the feature still works.

### Missing Brute-Force Protection on Authentication Endpoint
- **Severity:** High
- **Secure implementation:** Add progressive rate limiting, account lockout and alerting on repeated failed logins.
- **Retest:** Repeat the exploit for "No Brute-Force Protection on Login" (POST /login). Expected after the fix: the exploit no longer succeeds, the Mission Board test does not flip, and normal use of the feature still works.

### Account Enumeration Through Password-Reset Responses
- **Severity:** Medium
- **Secure implementation:** Return one identical, generic response whether or not the account exists.
- **Retest:** Repeat the exploit for "User Enumeration via Password Reset" (POST /forgot). Expected after the fix: the exploit no longer succeeds, the Mission Board test does not flip, and normal use of the feature still works.

### Active Demo Account With Publicly Displayed Credentials
- **Severity:** High
- **Secure implementation:** Remove demo/default accounts from production or force a unique password at first use.
- **Retest:** Repeat the exploit for "Published Demo Credentials Grant Real Access" (POST /login (demo account)). Expected after the fix: the exploit no longer succeeds, the Mission Board test does not flip, and normal use of the feature still works.

### Password-Reset Tokens Are Predictable
- **Severity:** Critical
- **Secure implementation:** Generate reset tokens with a CSPRNG, store only a hash, expire them quickly and make them single-use.
- **Retest:** Repeat the exploit for "Predictable Password-Reset Token" (POST /reset). Expected after the fix: the exploit no longer succeeds, the Mission Board test does not flip, and normal use of the feature still works.

### Client-Side Role Cookie Trusted for Authorisation
- **Severity:** High
- **Secure implementation:** Derive roles only from the server-side session; ignore role values supplied by the client.
- **Retest:** Repeat the exploit for "Role Cookie Tampering Opens the Clinician Console" (GET /clinician (hx_role cookie)). Expected after the fix: the exploit no longer succeeds, the Mission Board test does not flip, and normal use of the feature still works.

## Registration & Profile

### No Minimum Password Strength Enforced at Registration
- **Severity:** Medium
- **Secure implementation:** Enforce a minimum length and check new passwords against known-breached password lists.
- **Retest:** Repeat the exploit for "Weak Password Policy at Registration" (POST /register). Expected after the fix: the exploit no longer succeeds, the Mission Board test does not flip, and normal use of the feature still works.

### Mass Assignment Allows Role Escalation at Registration
- **Severity:** Critical
- **Secure implementation:** Whitelist exactly the fields a registration may set; assign roles only through admin workflows.
- **Retest:** Repeat the exploit for "Mass Assignment — Self-Assigned Doctor Role" (POST /register). Expected after the fix: the exploit no longer succeeds, the Mission Board test does not flip, and normal use of the feature still works.

### Stored Cross-Site Scripting via Display Name
- **Severity:** High
- **Secure implementation:** Escape all user-controlled output by default and sanitise any rich text.
- **Retest:** Repeat the exploit for "Stored XSS in Display Name" (POST /profile + POST /register (display name)). Expected after the fix: the exploit no longer succeeds, the Mission Board test does not flip, and normal use of the feature still works.

### Missing CSRF Protection on Profile Update
- **Severity:** Medium
- **Secure implementation:** Require a per-session CSRF token on all state-changing requests and validate Origin/Referer.
- **Retest:** Repeat the exploit for "CSRF on Profile Update" (POST /profile). Expected after the fix: the exploit no longer succeeds, the Mission Board test does not flip, and normal use of the feature still works.

## Visits & Clinical Notes

### Insecure Direct Object Reference on Visit Records
- **Severity:** High
- **Secure implementation:** Check object ownership (or a care relationship) on every record access, server-side.
- **Retest:** Repeat the exploit for "Visit Record IDOR" (GET /visits/<id>). Expected after the fix: the exploit no longer succeeds, the Mission Board test does not flip, and normal use of the feature still works.

### Missing Role Check Allows Patients to Modify Clinical Notes
- **Severity:** High
- **Secure implementation:** Enforce clinician-only authorisation on note editing and keep an audit trail of changes.
- **Retest:** Repeat the exploit for "Patient Can Edit Clinician Visit Notes" (POST /visits/<id>/note). Expected after the fix: the exploit no longer succeeds, the Mission Board test does not flip, and normal use of the feature still works.

### Unauthorised Deletion of Medical Visit Records
- **Severity:** High
- **Secure implementation:** Restrict deletion to administrators, prefer soft-delete with retention, and log every deletion.
- **Retest:** Repeat the exploit for "Patient Can Delete Visit Records" (POST /visits/<id>/delete). Expected after the fix: the exploit no longer succeeds, the Mission Board test does not flip, and normal use of the feature still works.

## Care Plans & Medications

### Insecure Direct Object Reference on Care Plans
- **Severity:** High
- **Secure implementation:** Authorise care-plan access by ownership or an active care relationship.
- **Retest:** Repeat the exploit for "Care Plan IDOR" (GET /careplan/<userId>). Expected after the fix: the exploit no longer succeeds, the Mission Board test does not flip, and normal use of the feature still works.

### Patients Can Modify Clinician-Authored Care Plans
- **Severity:** High
- **Secure implementation:** Restrict care-plan writes to clinician roles and version every change.
- **Retest:** Repeat the exploit for "Patient Edits Own Care Plan (Clinician-Only Function)" (POST /careplan/edit). Expected after the fix: the exploit no longer succeeds, the Mission Board test does not flip, and normal use of the feature still works.

### Patients Can Add Entries to Their Prescribed Medication List
- **Severity:** High
- **Secure implementation:** Allow medication changes only for clinician roles, with prescriber attribution.
- **Retest:** Repeat the exploit for "Patient Adds Own Medication (Clinician-Only Function)" (POST /medications/add). Expected after the fix: the exploit no longer succeeds, the Mission Board test does not flip, and normal use of the feature still works.

## Lab Results

### Insecure Direct Object Reference on Laboratory Results
- **Severity:** Critical
- **Secure implementation:** Enforce per-record ownership checks on all result views and downloads.
- **Retest:** Repeat the exploit for "Lab Result IDOR" (GET /results/<id>). Expected after the fix: the exploit no longer succeeds, the Mission Board test does not flip, and normal use of the feature still works.

### Unreviewed Lab Results Accessible Through API
- **Severity:** High
- **Secure implementation:** Apply the release flag in the API layer; unreleased results go to clinicians only.
- **Retest:** Repeat the exploit for "Unreleased Result Exposed via API Before Clinician Review" (GET /api/results/<id>). Expected after the fix: the exploit no longer succeeds, the Mission Board test does not flip, and normal use of the feature still works.

## Messaging

### Insecure Direct Object Reference on Message Threads
- **Severity:** High
- **Secure implementation:** Verify the requester is a thread participant before returning any message.
- **Retest:** Repeat the exploit for "Message Thread IDOR" (GET /messages/<id>). Expected after the fix: the exploit no longer succeeds, the Mission Board test does not flip, and normal use of the feature still works.

### Message Sender Identity Taken From Client Input
- **Severity:** Critical
- **Secure implementation:** Set the sender from the server-side session; ignore any client-supplied sender field.
- **Retest:** Repeat the exploit for "Message Sender Impersonation" (POST /messages/<id>/send). Expected after the fix: the exploit no longer succeeds, the Mission Board test does not flip, and normal use of the feature still works.

### Stored Cross-Site Scripting in Secure Messaging
- **Severity:** High
- **Secure implementation:** Escape message content on render and apply a strict content-security policy.
- **Retest:** Repeat the exploit for "Stored XSS in Message Body" (POST /messages/<id>/send). Expected after the fix: the exploit no longer succeeds, the Mission Board test does not flip, and normal use of the feature still works.

## Appointments

### Appointment Booking Trusts Client-Supplied Patient Identity
- **Severity:** Medium
- **Secure implementation:** Book appointments for the session user only; staff booking for others requires a staff role.
- **Retest:** Repeat the exploit for "Book an Appointment for Another Patient" (POST /appointments). Expected after the fix: the exploit no longer succeeds, the Mission Board test does not flip, and normal use of the feature still works.

### Missing Ownership Check on Appointment Cancellation
- **Severity:** Medium
- **Secure implementation:** Authorise cancellation by appointment ownership or staff role.
- **Retest:** Repeat the exploit for "Cancel Another Patient’s Appointment" (POST /appointments/<id>/cancel). Expected after the fix: the exploit no longer succeeds, the Mission Board test does not flip, and normal use of the feature still works.

## Admin Panel

### Admin Panel Accessible to Non-Admin Users
- **Severity:** Critical
- **Secure implementation:** Enforce admin-role authorisation on all admin routes, server-side.
- **Retest:** Repeat the exploit for "Admin Panel Broken Access Control" (GET /admin). Expected after the fix: the exploit no longer succeeds, the Mission Board test does not flip, and normal use of the feature still works.

## Platform & API

### Unauthenticated Debug Endpoint Discloses Full Database
- **Severity:** Critical
- **Secure implementation:** Remove debug endpoints from production builds and audit deployed routes.
- **Retest:** Repeat the exploit for "Debug Endpoint Exposes the Whole Database" (GET /api/debug). Expected after the fix: the exploit no longer succeeds, the Mission Board test does not flip, and normal use of the feature still works.

### API Tokens Are a Publicly Derivable Encoding of the Email Address
- **Severity:** High
- **Secure implementation:** Issue random, revocable API tokens and store only their hashes.
- **Retest:** Repeat the exploit for "Weak API Token (Base64 of Email)" (GET /api/me (X-Api-Token)). Expected after the fix: the exploit no longer succeeds, the Mission Board test does not flip, and normal use of the feature still works.

