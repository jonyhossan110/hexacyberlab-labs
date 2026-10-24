# HexaHR — Fix & Retest Guide (24 findings)

For every scored test: the secure implementation, and the retest that proves the fix. Method: apply the fix in a copy of the lab, re-run the exact exploit from PRACTICE-GUIDE.md, confirm it now fails, and confirm the legitimate flow still works.


## Login & Authentication

### SQL Injection Login Bypass — Critical
- **Report title:** SQL Injection in Login Form Allows Authentication Bypass
- **Fix:** Use parameterised queries / prepared statements everywhere; never build SQL by string concatenation.
- **Retest:** repeat the exploit steps for "SQL Injection Login Bypass" in PRACTICE-GUIDE.md — it must no longer succeed (no bypass, no leaked data, no state change), while the normal user flow for this feature keeps working.

### Brute Force — No Rate Limiting — High
- **Report title:** Missing Rate Limiting / Account Lockout on Login
- **Fix:** Throttle attempts per account and IP, add progressive delays or lockout, and enforce MFA for privileged roles.
- **Retest:** repeat the exploit steps for "Brute Force — No Rate Limiting" in PRACTICE-GUIDE.md — it must no longer succeed (no bypass, no leaked data, no state change), while the normal user flow for this feature keeps working.

### User Enumeration via Login & Forgot-Password — Medium
- **Report title:** Account Enumeration via Differential Authentication Responses
- **Fix:** Return one generic message ("if this account exists, we sent instructions") for all login and reset outcomes.
- **Retest:** repeat the exploit steps for "User Enumeration via Login & Forgot-Password" in PRACTICE-GUIDE.md — it must no longer succeed (no bypass, no leaked data, no state change), while the normal user flow for this feature keeps working.

### Weak / Default Credentials — High
- **Report title:** Default Credentials Still Active on an Employee Account
- **Fix:** Force a password change at first login, disable vendor defaults, and audit for unchanged issued passwords.
- **Retest:** repeat the exploit steps for "Weak / Default Credentials" in PRACTICE-GUIDE.md — it must no longer succeed (no bypass, no leaked data, no state change), while the normal user flow for this feature keeps working.

### Predictable Password-Reset Token — Critical
- **Report title:** Password-Reset Tokens Are Predictable (Derived from Email)
- **Fix:** Generate reset tokens with a CSPRNG (≥128 bits), store only a hash, expire quickly, and invalidate after use.
- **Retest:** repeat the exploit steps for "Predictable Password-Reset Token" in PRACTICE-GUIDE.md — it must no longer succeed (no bypass, no leaked data, no state change), while the normal user flow for this feature keeps working.

### Session Cookie Role Tampering — Critical
- **Report title:** Client-Controlled Role in Session Cookie Enables Privilege Escalation
- **Fix:** Keep roles in server-side session storage, or sign session tokens (e.g. HMAC/JWT with a server secret) and verify integrity on every request.
- **Retest:** repeat the exploit steps for "Session Cookie Role Tampering" in PRACTICE-GUIDE.md — it must no longer succeed (no bypass, no leaked data, no state change), while the normal user flow for this feature keeps working.


## Employee Directory & Search

### SQL Injection in Employee Search — High
- **Report title:** SQL Injection in Employee Search Exposes Restricted Records
- **Fix:** Parameterise search queries and enforce record-visibility rules in the query itself, not in the UI layer.
- **Retest:** repeat the exploit steps for "SQL Injection in Employee Search" in PRACTICE-GUIDE.md — it must no longer succeed (no bypass, no leaked data, no state change), while the normal user flow for this feature keeps working.

### Reflected XSS in Employee Search — High
- **Report title:** Reflected Cross-Site Scripting in Employee Search
- **Fix:** Context-encode all reflected user input on output and add a Content-Security-Policy as defence in depth.
- **Retest:** repeat the exploit steps for "Reflected XSS in Employee Search" in PRACTICE-GUIDE.md — it must no longer succeed (no bypass, no leaked data, no state change), while the normal user flow for this feature keeps working.

### IDOR — Full Employee Record Exposure — High
- **Report title:** Insecure Direct Object Reference Exposes Employees' Personal Data
- **Fix:** Enforce per-object authorization (owner, same-department manager, or HR) on every record view; minimise the fields shown.
- **Retest:** repeat the exploit steps for "IDOR — Full Employee Record Exposure" in PRACTICE-GUIDE.md — it must no longer succeed (no bypass, no leaked data, no state change), while the normal user flow for this feature keeps working.


## Payroll

### Payroll IDOR — Colleague's Salary & Bank Details — Critical
- **Report title:** Insecure Direct Object Reference in Payroll Exposes Salary and Bank Data
- **Fix:** Check ownership or privileged role server-side for every payroll record; log access to payroll data.
- **Retest:** repeat the exploit steps for "Payroll IDOR — Colleague's Salary & Bank Details" in PRACTICE-GUIDE.md — it must no longer succeed (no bypass, no leaked data, no state change), while the normal user flow for this feature keeps working.

### Cross-Department Payroll Access — High
- **Report title:** Missing Department Scoping Allows Cross-Department Payroll Access
- **Fix:** Scope manager queries to their own department server-side; only HR admin gets a company-wide view.
- **Retest:** repeat the exploit steps for "Cross-Department Payroll Access" in PRACTICE-GUIDE.md — it must no longer succeed (no bypass, no leaked data, no state change), while the normal user flow for this feature keeps working.


## Leave Management

### Leave Self-Approval — High
- **Report title:** Leave Requests Can Be Approved by the Requester (Missing Separation of Duties)
- **Fix:** Require approver ≠ requester and approver to be the requester's manager or HR, enforced server-side.
- **Retest:** repeat the exploit steps for "Leave Self-Approval" in PRACTICE-GUIDE.md — it must no longer succeed (no bypass, no leaked data, no state change), while the normal user flow for this feature keeps working.

### Leave Approval Across Departments — Medium
- **Report title:** Leave Approvals Are Not Scoped to the Approver's Department or Reporting Line
- **Fix:** Restrict approvals to the requester's direct manager (or HR), verified against the org structure server-side.
- **Retest:** repeat the exploit steps for "Leave Approval Across Departments" in PRACTICE-GUIDE.md — it must no longer succeed (no bypass, no leaked data, no state change), while the normal user flow for this feature keeps working.

### IDOR — Reading Colleagues' Leave Requests — Medium
- **Report title:** Insecure Direct Object Reference Exposes Leave Request Details
- **Fix:** Limit leave detail visibility to the requester, their manager and HR.
- **Retest:** repeat the exploit steps for "IDOR — Reading Colleagues' Leave Requests" in PRACTICE-GUIDE.md — it must no longer succeed (no bypass, no leaked data, no state change), while the normal user flow for this feature keeps working.


## Profile & Account

### Mass Assignment — Self-Promotion & Salary Edit — Critical
- **Report title:** Mass Assignment in Profile Update Allows Salary and Role Tampering
- **Fix:** Use an explicit allowlist of updatable fields per role; reject or ignore privileged fields (role, salary, department) from self-service updates.
- **Retest:** repeat the exploit steps for "Mass Assignment — Self-Promotion & Salary Edit" in PRACTICE-GUIDE.md — it must no longer succeed (no bypass, no leaked data, no state change), while the normal user flow for this feature keeps working.

### Stored XSS via Display Name — High
- **Report title:** Stored Cross-Site Scripting via Employee Display Name
- **Fix:** Output-encode user-controlled fields at render time everywhere; validate names against a safe character policy.
- **Retest:** repeat the exploit steps for "Stored XSS via Display Name" in PRACTICE-GUIDE.md — it must no longer succeed (no bypass, no leaked data, no state change), while the normal user flow for this feature keeps working.

### CSRF on Profile Update — Medium
- **Report title:** Cross-Site Request Forgery on Profile Update
- **Fix:** Require a per-session CSRF token on all state-changing forms and verify Origin/Referer as defence in depth.
- **Retest:** repeat the exploit steps for "CSRF on Profile Update" in PRACTICE-GUIDE.md — it must no longer succeed (no bypass, no leaked data, no state change), while the normal user flow for this feature keeps working.

### Weak Password Policy — Medium
- **Report title:** No Password Complexity or Length Policy Enforced
- **Fix:** Enforce ≥10–12 character passwords, check against breached-password lists, and apply the policy on every set/change path.
- **Retest:** repeat the exploit steps for "Weak Password Policy" in PRACTICE-GUIDE.md — it must no longer succeed (no bypass, no leaked data, no state change), while the normal user flow for this feature keeps working.


## Admin Panel

### CSRF on Admin Action (Deactivate Employee) — High
- **Report title:** Cross-Site Request Forgery on Administrative Employee Deactivation
- **Fix:** Enforce CSRF tokens on all admin actions, require re-authentication for destructive operations, and audit admin activity.
- **Retest:** repeat the exploit steps for "CSRF on Admin Action (Deactivate Employee)" in PRACTICE-GUIDE.md — it must no longer succeed (no bypass, no leaked data, no state change), while the normal user flow for this feature keeps working.


## API & Data Exposure

### Weak Static API Token — High
- **Report title:** Guessable Static API Key Disclosed in Documentation
- **Fix:** Issue per-client random API keys (≥128 bits), store them hashed, support rotation, and scrub secrets from docs and comments.
- **Retest:** repeat the exploit steps for "Weak Static API Token" in PRACTICE-GUIDE.md — it must no longer succeed (no bypass, no leaked data, no state change), while the normal user flow for this feature keeps working.

### Unauthenticated Employee Data Export — Critical
- **Report title:** Unauthenticated Bulk Export of Employee, Salary and Bank Data
- **Fix:** Require authenticated, HR-admin-only access for exports; audit and alert on bulk data access.
- **Retest:** repeat the exploit steps for "Unauthenticated Employee Data Export" in PRACTICE-GUIDE.md — it must no longer succeed (no bypass, no leaked data, no state change), while the normal user flow for this feature keeps working.

### Missing Security Headers — Low
- **Report title:** Missing HTTP Security Headers
- **Fix:** Add X-Frame-Options/Content-Security-Policy frame-ancestors, X-Content-Type-Options: nosniff, and Referrer-Policy at the app or proxy layer.
- **Retest:** repeat the exploit steps for "Missing Security Headers" in PRACTICE-GUIDE.md — it must no longer succeed (no bypass, no leaked data, no state change), while the normal user flow for this feature keeps working.


## Files & Documents

### Unrestricted File Upload (Stored HTML) — High
- **Report title:** Unrestricted File Upload Allows Hosting Arbitrary HTML on the Application Origin
- **Fix:** Allowlist file types, verify content, serve uploads with Content-Disposition: attachment or from a separate domain, and never as text/html.
- **Retest:** repeat the exploit steps for "Unrestricted File Upload (Stored HTML)" in PRACTICE-GUIDE.md — it must no longer succeed (no bypass, no leaked data, no state change), while the normal user flow for this feature keeps working.

### Path Traversal in Document Download — High
- **Report title:** Path Traversal in Document Download Allows Arbitrary File Read
- **Fix:** Resolve the final path and verify it stays inside the documents directory; serve documents by id from an allowlist, not by filename.
- **Retest:** repeat the exploit steps for "Path Traversal in Document Download" in PRACTICE-GUIDE.md — it must no longer succeed (no bypass, no leaked data, no state change), while the normal user flow for this feature keeps working.
