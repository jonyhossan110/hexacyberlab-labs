# HexaCRM — Fix & Retest Guide (26 findings)

For every scored test: the finding as it would appear in a client report, the secure implementation (the fix), and the retest that proves it. Retest method is always the same shape: apply the fix in a copy of the lab, re-run the exact exploit from PRACTICE-GUIDE.md, confirm it now FAILS, and confirm the legitimate flow still works.


## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass — Severity: Critical
- **Where:** `POST /login` (A03:2021 Injection)
- **Fix (secure implementation):** Use parameterised queries / prepared statements for all database access; never build queries by string concatenation.
- **Retest:** repeat the exploit for "SQL Injection — Login Bypass" from the Practice Guide — it must no longer succeed (no bypass, no foreign record served, no value changed, no payload stored/reflected), while the normal user flow for the same feature keeps working.

### No Rate Limiting or Account Lockout on Login Endpoint — Severity: High
- **Where:** `POST /login` (A07:2021 Auth Failures)
- **Fix (secure implementation):** Rate-limit login attempts per account and per IP; add progressive delays / lockout and alerting on repeated failures.
- **Retest:** repeat the exploit for "Brute Force — No Login Throttling" from the Practice Guide — it must no longer succeed (no bypass, no foreign record served, no value changed, no payload stored/reflected), while the normal user flow for the same feature keeps working.

### Account Enumeration Through Differing Authentication Responses — Severity: Medium
- **Where:** `POST /login, POST /forgot` (A07:2021 Auth Failures)
- **Fix (secure implementation):** Return one generic message ('Invalid credentials' / 'If the account exists, a reset email was sent') for every outcome.
- **Retest:** repeat the exploit for "User Enumeration via Login & Reset Responses" from the Practice Guide — it must no longer succeed (no bypass, no foreign record served, no value changed, no payload stored/reflected), while the normal user flow for the same feature keeps working.

### Default Guest Account With Trivial Password Still Active — Severity: High
- **Where:** `POST /login` (A07:2021 Auth Failures)
- **Fix (secure implementation):** Remove or disable default / trial accounts; force unique strong passwords at first login and audit dormant accounts.
- **Retest:** repeat the exploit for "Weak / Default Credentials (Guest Account)" from the Practice Guide — it must no longer succeed (no bypass, no foreign record served, no value changed, no payload stored/reflected), while the normal user flow for the same feature keeps working.

### Password Reset Tokens Are Sequential and Predictable — Severity: High
- **Where:** `POST /forgot, POST /reset` (A07:2021 Auth Failures)
- **Fix (secure implementation):** Generate reset tokens from a CSPRNG (>=128 bits of entropy), expire them quickly and make them single-use.
- **Retest:** repeat the exploit for "Predictable Password-Reset Token" from the Practice Guide — it must no longer succeed (no bypass, no foreign record served, no value changed, no payload stored/reflected), while the normal user flow for the same feature keeps working.

### Unsigned Session Cookie Allows Role Tampering to Admin — Severity: Critical
- **Where:** `Cookie: crm_session -> GET /admin` (A07:2021 Auth Failures)
- **Fix (secure implementation):** Keep roles server-side only; sign session tokens (e.g. HMAC) or use opaque server-side sessions, and verify on every request.
- **Retest:** repeat the exploit for "Session Cookie Tampering (Unsigned Role Cookie)" from the Practice Guide — it must no longer succeed (no bypass, no foreign record served, no value changed, no payload stored/reflected), while the normal user flow for the same feature keeps working.


## Registration & Profile

### Mass Assignment Allows Privilege Escalation to Admin — Severity: Critical
- **Where:** `POST /register, POST /profile` (A01:2021 Broken Access Control)
- **Fix (secure implementation):** Bind only whitelisted fields on registration and profile updates; set role and other privileged fields server-side.
- **Retest:** repeat the exploit for "Mass Assignment — Self-Registration as Admin" from the Practice Guide — it must no longer succeed (no bypass, no foreign record served, no value changed, no payload stored/reflected), while the normal user flow for the same feature keeps working.

### No Minimum Password Strength Enforced on Registration — Severity: Medium
- **Where:** `POST /register` (A07:2021 Auth Failures)
- **Fix (secure implementation):** Enforce a minimum length (>=10 characters) and block known-common passwords at registration and password change.
- **Retest:** repeat the exploit for "Weak Password Policy (Tiny Passwords Accepted)" from the Practice Guide — it must no longer succeed (no bypass, no foreign record served, no value changed, no payload stored/reflected), while the normal user flow for the same feature keeps working.

### Stored Cross-Site Scripting in User Display Name — Severity: High
- **Where:** `POST /profile -> header, GET /admin/users` (A03:2021 Injection)
- **Fix (secure implementation):** Output-encode all user-controlled data on every render; validate names on input as defence in depth.
- **Retest:** repeat the exploit for "Stored XSS via Display Name (Reaches Admin View)" from the Practice Guide — it must no longer succeed (no bypass, no foreign record served, no value changed, no payload stored/reflected), while the normal user flow for the same feature keeps working.

### Cross-Site Request Forgery on Profile Update — Severity: Medium
- **Where:** `POST /profile` (A01:2021 Broken Access Control)
- **Fix (secure implementation):** Require and verify a per-session CSRF token on every state-changing request; check Origin/Referer as defence in depth.
- **Retest:** repeat the exploit for "CSRF on Profile Update" from the Practice Guide — it must no longer succeed (no bypass, no foreign record served, no value changed, no payload stored/reflected), while the normal user flow for the same feature keeps working.


## Search

### SQL Injection in Search Returns All Users’ CRM Records — Severity: Critical
- **Where:** `GET /search` (A03:2021 Injection)
- **Fix (secure implementation):** Parameterise all queries; scope search results to the requester's authorised records server-side.
- **Retest:** repeat the exploit for "SQL Injection in Global Search (Full CRM Dump)" from the Practice Guide — it must no longer succeed (no bypass, no foreign record served, no value changed, no payload stored/reflected), while the normal user flow for the same feature keeps working.

### Reflected Cross-Site Scripting in Search Results — Severity: Medium
- **Where:** `GET /search` (A03:2021 Injection)
- **Fix (secure implementation):** Output-encode all reflected input; add a Content-Security-Policy as defence in depth.
- **Retest:** repeat the exploit for "Reflected XSS in Search Results" from the Practice Guide — it must no longer succeed (no bypass, no foreign record served, no value changed, no payload stored/reflected), while the normal user flow for the same feature keeps working.


## Leads & Contacts

### Insecure Direct Object Reference on Lead Records — Severity: High
- **Where:** `GET /leads/{id}` (A01:2021 Broken Access Control)
- **Fix (secure implementation):** Enforce object-level authorisation on every record access (owner or admin), for reads and writes alike.
- **Retest:** repeat the exploit for "IDOR — Read Another Rep's Lead" from the Practice Guide — it must no longer succeed (no bypass, no foreign record served, no value changed, no payload stored/reflected), while the normal user flow for the same feature keeps working.

### Lead Reassignment via Mass Assignment (Lead Theft) — Severity: High
- **Where:** `POST /leads/{id}/update` (A01:2021 Broken Access Control)
- **Fix (secure implementation):** Whitelist editable fields per role; ownership changes must require manager/admin rights and be audit-logged.
- **Retest:** repeat the exploit for "Lead Theft via Owner Mass Assignment" from the Practice Guide — it must no longer succeed (no bypass, no foreign record served, no value changed, no payload stored/reflected), while the normal user flow for the same feature keeps working.


## Deals & Pipeline

### Insecure Direct Object Reference on Deal Records — Severity: High
- **Where:** `GET /deals/{id}` (A01:2021 Broken Access Control)
- **Fix (secure implementation):** Enforce object-level authorisation on every deal access (owner or admin).
- **Retest:** repeat the exploit for "IDOR — Read Another Rep's Deal" from the Practice Guide — it must no longer succeed (no bypass, no foreign record served, no value changed, no payload stored/reflected), while the normal user flow for the same feature keeps working.

### Unauthorised Modification of Other Reps' Deal Values — Severity: High
- **Where:** `POST /deals/{id}/update` (A01:2021 Broken Access Control)
- **Fix (secure implementation):** Check ownership (or admin role) on every write; validate values server-side and audit-log all changes.
- **Retest:** repeat the exploit for "Deal Value Tampering by a Non-Owner" from the Practice Guide — it must no longer succeed (no bypass, no foreign record served, no value changed, no payload stored/reflected), while the normal user flow for the same feature keeps working.

### Deal Ownership Reassignment via Mass Assignment — Severity: High
- **Where:** `POST /deals/{id}/update` (A01:2021 Broken Access Control)
- **Fix (secure implementation):** Whitelist editable fields; ownership transfer must be an explicit, authorised and logged action.
- **Retest:** repeat the exploit for "Deal Owner Mass Assignment (Deal Theft)" from the Practice Guide — it must no longer succeed (no bypass, no foreign record served, no value changed, no payload stored/reflected), while the normal user flow for the same feature keeps working.

### Business-Logic Flaw Allows Skipping Pipeline Stages to 'Won' — Severity: Medium
- **Where:** `POST /deals/{id}/update` (A04:2021 Insecure Design)
- **Fix (secure implementation):** Enforce a server-side stage-transition state machine; require manager approval to close deals as Won.
- **Retest:** repeat the exploit for "Pipeline Manipulation — Stage Skipping Straight to 'Won'" from the Practice Guide — it must no longer succeed (no bypass, no foreign record served, no value changed, no payload stored/reflected), while the normal user flow for the same feature keeps working.


## Notes & Activities

### Private Notes Exposed Through Insecure Direct Object Reference — Severity: High
- **Where:** `GET /notes/{id}` (A01:2021 Broken Access Control)
- **Fix (secure implementation):** Authorise every note read against the note's author, the linked record's owner and the privacy flag.
- **Retest:** repeat the exploit for "IDOR — Read Another Rep's Private Note" from the Practice Guide — it must no longer succeed (no bypass, no foreign record served, no value changed, no payload stored/reflected), while the normal user flow for the same feature keeps working.

### Stored Cross-Site Scripting in CRM Notes — Severity: High
- **Where:** `POST /notes -> deal & lead pages` (A03:2021 Injection)
- **Fix (secure implementation):** Render note bodies as plain text (output-encode) or sanitise with a strict allowlist sanitiser.
- **Retest:** repeat the exploit for "Stored XSS in Note Body" from the Practice Guide — it must no longer succeed (no bypass, no foreign record served, no value changed, no payload stored/reflected), while the normal user flow for the same feature keeps working.


## Import & Export

### Unauthorised Export of the Entire Contact Database — Severity: Critical
- **Where:** `GET /export/contacts.csv` (A01:2021 Broken Access Control)
- **Fix (secure implementation):** Restrict exports to admins, scope exported rows to the requester's authorisation, rate-limit and audit every export.
- **Retest:** repeat the exploit for "Full Contact Database Export by Any Rep" from the Practice Guide — it must no longer succeed (no bypass, no foreign record served, no value changed, no payload stored/reflected), while the normal user flow for the same feature keeps working.

### CSV / Formula Injection Through Lead Import — Severity: Medium
- **Where:** `POST /import/leads` (A03:2021 Injection)
- **Fix (secure implementation):** Sanitise imported and exported CSV fields: prefix cells starting with =, +, -, @, tab or CR with a single quote.
- **Retest:** repeat the exploit for "CSV Formula Injection via Lead Import" from the Practice Guide — it must no longer succeed (no bypass, no foreign record served, no value changed, no payload stored/reflected), while the normal user flow for the same feature keeps working.


## Reports

### Insecure Direct Object Reference on Sales Performance Reports — Severity: Medium
- **Where:** `GET /reports/rep/{id}` (A01:2021 Broken Access Control)
- **Fix (secure implementation):** Authorise report access: reps see their own report; managers and admins see their team's.
- **Retest:** repeat the exploit for "IDOR — View Another Rep's Performance Report" from the Practice Guide — it must no longer succeed (no bypass, no foreign record served, no value changed, no payload stored/reflected), while the normal user flow for the same feature keeps working.


## Admin Panel

### Cross-Site Request Forgery on Admin Role Changes — Severity: High
- **Where:** `POST /admin/users/{id}/role` (A01:2021 Broken Access Control)
- **Fix (secure implementation):** Verify CSRF tokens on all admin actions; require re-authentication for role changes.
- **Retest:** repeat the exploit for "CSRF on Admin Role Management" from the Practice Guide — it must no longer succeed (no bypass, no foreign record served, no value changed, no payload stored/reflected), while the normal user flow for the same feature keeps working.


## Platform & API

### Predictable API Tokens Allow Cross-User Data Access — Severity: High
- **Where:** `GET /api/leads` (A07:2021 Auth Failures)
- **Fix (secure implementation):** Issue random, high-entropy API tokens; store them hashed, scope them per user and support revocation.
- **Retest:** repeat the exploit for "Predictable API Token (crm-<userId>)" from the Practice Guide — it must no longer succeed (no bypass, no foreign record served, no value changed, no payload stored/reflected), while the normal user flow for the same feature keeps working.

### Missing HTTP Security Headers — Severity: Low
- **Where:** `GET / (scanner-style probe)` (A05:2021 Security Misconfiguration)
- **Fix (secure implementation):** Add Content-Security-Policy, X-Frame-Options / frame-ancestors, X-Content-Type-Options: nosniff, Referrer-Policy and HSTS (on HTTPS).
- **Retest:** repeat the exploit for "Missing HTTP Security Headers" from the Practice Guide — it must no longer succeed (no bypass, no foreign record served, no value changed, no payload stored/reflected), while the normal user flow for the same feature keeps working.
