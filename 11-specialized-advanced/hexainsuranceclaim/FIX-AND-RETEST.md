# HexaInsuranceClaim (LAB 107) — Fix & Retest Guide

For every finding: the secure implementation and the regression test. Retest = repeat the original exploit and confirm it now fails while legitimate use still works.

## SQL Injection in Login Form Allows Authentication Bypass
- Severity: Critical
- Fix: Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.
- Regression test: repeat the exploit for "SQL Injection Login Bypass" — it must no longer flip the test on /tests, and the normal user flow must still succeed.

## Missing Brute-Force Protection on Login
- Severity: High
- Fix: Add progressive delays, account lockout and alerting after repeated failed logins; consider MFA for staff.
- Regression test: repeat the exploit for "Brute Force — No Login Throttling" — it must no longer flip the test on /tests, and the normal user flow must still succeed.

## User Enumeration via Differential Authentication Responses
- Severity: Medium
- Fix: Return one generic message ("Invalid email or password") for every failed login and reset request.
- Regression test: repeat the exploit for "Account Enumeration via Login & Reset Responses" — it must no longer flip the test on /tests, and the normal user flow must still succeed.

## Default Administrator Credentials Published on Login Page
- Severity: Critical
- Fix: Remove demo accounts and default passwords from production; force unique strong credentials.
- Regression test: repeat the exploit for "Published Demo / Default Admin Credentials" — it must no longer flip the test on /tests, and the normal user flow must still succeed.

## Password Reset Token Is Predictable (Derived from User ID)
- Severity: High
- Fix: Generate reset tokens from a CSPRNG (≥128 bits), expire them quickly, and only honour tokens that were actually issued.
- Regression test: repeat the exploit for "Predictable Password Reset Token" — it must no longer flip the test on /tests, and the normal user flow must still succeed.

## Privilege Escalation via Client-Controlled Role Cookie
- Severity: Critical
- Fix: Store roles only in the server-side session/record; ignore role claims from cookies or request fields.
- Regression test: repeat the exploit for "Role Cookie Tampering (hx_role)" — it must no longer flip the test on /tests, and the normal user flow must still succeed.

## Password Length Policy Not Enforced Server-Side
- Severity: Medium
- Fix: Enforce minimum length and complexity on the server for every account-creation path.
- Regression test: repeat the exploit for "Weak Password Policy at Registration" — it must no longer flip the test on /tests, and the normal user flow must still succeed.

## Mass Assignment in Registration Allows Privilege Escalation
- Severity: High
- Fix: Whitelist exactly the fields a registrant may set; assign roles only through staff workflows.
- Regression test: repeat the exploit for "Mass Assignment — Role Granted at Registration" — it must no longer flip the test on /tests, and the normal user flow must still succeed.

## Stored Cross-Site Scripting via Display Name
- Severity: High
- Fix: Contextually encode all user-supplied output; validate names against an allowlist of characters.
- Regression test: repeat the exploit for "Stored XSS in Display Name" — it must no longer flip the test on /tests, and the normal user flow must still succeed.

## Missing CSRF Protection on Profile Update
- Severity: Medium
- Fix: Require a per-session anti-CSRF token on every state-changing request and verify Origin/Referer.
- Regression test: repeat the exploit for "CSRF on Profile Update" — it must no longer flip the test on /tests, and the normal user flow must still succeed.

## Insecure Direct Object Reference on Claim Details
- Severity: High
- Fix: Check on the server that the requesting user owns (or is staff for) every claim being served.
- Regression test: repeat the exploit for "Claim IDOR — Read Another Policyholder's Claim" — it must no longer flip the test on /tests, and the normal user flow must still succeed.

## Claim Amount Can Exceed Policy Coverage Limit
- Severity: High
- Fix: Validate claimed amounts against the policy coverage limit on the server for every create/update.
- Regression test: repeat the exploit for "Claim Amount Inflation Beyond Coverage Limit" — it must no longer flip the test on /tests, and the normal user flow must still succeed.

## Broken Access Control Allows Editing Other Customers' Claims
- Severity: High
- Fix: Authorise every mutation against the claim's owner/staff assignment on the server.
- Regression test: repeat the exploit for "Edit Another Policyholder's Claim" — it must no longer flip the test on /tests, and the normal user flow must still succeed.

## Mass Assignment of Claim Status Allows Self-Approval
- Severity: Critical
- Fix: Remove status from user-writable fields; drive status changes only through role-checked workflow endpoints.
- Regression test: repeat the exploit for "Claim Status Forgery via Edit Form" — it must no longer flip the test on /tests, and the normal user flow must still succeed.

## Claim Approval Endpoint Lacks Authorisation Check
- Severity: Critical
- Fix: Require the adjuster role (and assignment) server-side on approval endpoints.
- Regression test: repeat the exploit for "Approval Endpoint Missing Role Check" — it must no longer flip the test on /tests, and the normal user flow must still succeed.

## Approved Payout Not Validated Against Claimed Amount
- Severity: High
- Fix: Enforce payout ≤ min(claimed amount, coverage limit) on the server at approval time.
- Regression test: repeat the exploit for "Payout Set Above the Claimed Amount" — it must no longer flip the test on /tests, and the normal user flow must still succeed.

## Confidential Internal Notes Exposed in Customer Claim View
- Severity: Medium
- Fix: Strip internal-only fields from any response served to non-staff users.
- Regression test: repeat the exploit for "Internal Adjuster Notes Leaked to Policyholder" — it must no longer flip the test on /tests, and the normal user flow must still succeed.

## Unrestricted File Upload Allows Stored HTML/JS
- Severity: High
- Fix: Allowlist evidence types, verify content, serve uploads with Content-Disposition: attachment and a safe type.
- Regression test: repeat the exploit for "Unrestricted Evidence Upload (Stored HTML)" — it must no longer flip the test on /tests, and the normal user flow must still succeed.

## Insecure Direct Object Reference on Evidence Downloads
- Severity: High
- Fix: Authorise evidence downloads against the parent claim's owner/staff on the server.
- Regression test: repeat the exploit for "Evidence Download IDOR" — it must no longer flip the test on /tests, and the normal user flow must still succeed.

## Directory Traversal in Document Download
- Severity: High
- Fix: Resolve the absolute path and require it to stay inside the documents directory; reject .. components.
- Regression test: repeat the exploit for "Path Traversal in Document Download" — it must no longer flip the test on /tests, and the normal user flow must still succeed.

## Payout Release Can Be Repeated (No Idempotency / State Guard)
- Severity: Critical
- Fix: Guard payout release with claim state (approved → paid is one-way) and idempotency keys; reconcile totals.
- Regression test: repeat the exploit for "Double Payout — No Idempotency on Release" — it must no longer flip the test on /tests, and the normal user flow must still succeed.

## Insecure Direct Object Reference on Payout Records
- Severity: Medium
- Fix: Restrict payout record views to the payee and authorised staff.
- Regression test: repeat the exploit for "Payout Record IDOR" — it must no longer flip the test on /tests, and the normal user flow must still succeed.

## SQL Injection in Claim Search Exposes All Claims
- Severity: Critical
- Fix: Parameterise search queries and scope results to records the user may see.
- Regression test: repeat the exploit for "SQL Injection in Claim Search" — it must no longer flip the test on /tests, and the normal user flow must still succeed.

## Reflected Cross-Site Scripting in Search
- Severity: Medium
- Fix: HTML-encode all reflected values in responses.
- Regression test: repeat the exploit for "Reflected XSS in Search Results" — it must no longer flip the test on /tests, and the normal user flow must still succeed.

## Missing CSRF Protection on Administrative Actions
- Severity: Medium
- Fix: Require per-session CSRF tokens on all state-changing admin endpoints.
- Regression test: repeat the exploit for "CSRF on Admin User Deactivation" — it must no longer flip the test on /tests, and the normal user flow must still succeed.

## Unauthenticated Debug Endpoint Exposes Full Database
- Severity: Critical
- Fix: Remove debug endpoints from production builds; gate any diagnostics behind admin auth and IP allowlists.
- Regression test: repeat the exploit for "Unauthenticated Debug Endpoint Data Dump" — it must no longer flip the test on /tests, and the normal user flow must still succeed.
