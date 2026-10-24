# HexaCampus — Fix & Retest Guide (LAB 55)

For every scored test: how the finding appears in a real penetration-test report, the secure implementation, and the regression retest that proves the fix. Apply a fix in a copy of the lab, then re-run the exploit from the Practice Guide — it must now fail, while the legitimate flow still works.

## Login & Authentication

### SQL Injection in Login Form (Authentication Bypass)
- **Severity:** Critical
- **Fix:** Use parameterised queries everywhere; never concatenate user input into SQL.
- **Retest:** Re-run the exploit for "SQL Injection Login Bypass" (POST /login) exactly as in the Practice Guide. Expected after the fix: the exploit fails, the corresponding test no longer flips, and the normal user flow for this feature still completes successfully.

### Missing Brute-Force Protection on Login
- **Severity:** High
- **Fix:** Add progressive delays, lockout after repeated failures, and CAPTCHA or MFA on the login form.
- **Retest:** Re-run the exploit for "Brute Force — No Rate Limit or Lockout" (POST /login) exactly as in the Practice Guide. Expected after the fix: the exploit fails, the corresponding test no longer flips, and the normal user flow for this feature still completes successfully.

### Account Enumeration via Differential Error Messages
- **Severity:** Medium
- **Fix:** Return one generic message ("invalid credentials" / "if the account exists…") for login and reset flows.
- **Retest:** Re-run the exploit for "User Enumeration via Login & Password Reset" (POST /login · POST /forgot) exactly as in the Practice Guide. Expected after the fix: the exploit fails, the corresponding test no longer flips, and the normal user flow for this feature still completes successfully.

### Default Credentials in Production
- **Severity:** Critical
- **Fix:** Force password change on first login, remove demo accounts, and audit for vendor defaults.
- **Retest:** Re-run the exploit for "Default / Demo Credentials Still Active" (POST /login) exactly as in the Practice Guide. Expected after the fix: the exploit fails, the corresponding test no longer flips, and the normal user flow for this feature still completes successfully.

### Predictable Password Reset Token Allows Account Takeover
- **Severity:** High
- **Fix:** Generate reset tokens with a CSPRNG (≥128 bits), store them hashed, expire them quickly, and use them once.
- **Retest:** Re-run the exploit for "Predictable Password-Reset Token" (POST /reset) exactly as in the Practice Guide. Expected after the fix: the exploit fails, the corresponding test no longer flips, and the normal user flow for this feature still completes successfully.

### Client-Side Role Cookie Trusted for Authorization
- **Severity:** High
- **Fix:** Derive roles from the server-side session only; never trust role claims in cookies or form fields.
- **Retest:** Re-run the exploit for "Role Cookie Tampering Opens Faculty Area" (GET /faculty/grades) exactly as in the Practice Guide. Expected after the fix: the exploit fails, the corresponding test no longer flips, and the normal user flow for this feature still completes successfully.

## Registration & Profile

### No Minimum Password Strength at Registration
- **Severity:** Medium
- **Fix:** Enforce a minimum length (≥10) and screen against common/breached password lists.
- **Retest:** Re-run the exploit for "Weak Password Policy at Registration" (POST /register) exactly as in the Practice Guide. Expected after the fix: the exploit fails, the corresponding test no longer flips, and the normal user flow for this feature still completes successfully.

### Mass Assignment in Registration Allows Privilege Escalation
- **Severity:** High
- **Fix:** Whitelist bindable fields per endpoint; set role/GPA server-side only.
- **Retest:** Re-run the exploit for "Mass Assignment — Role & GPA at Registration" (POST /register) exactly as in the Practice Guide. Expected after the fix: the exploit fails, the corresponding test no longer flips, and the normal user flow for this feature still completes successfully.

### Stored Cross-Site Scripting via Display Name
- **Severity:** High
- **Fix:** Context-encode all user data on output and add a strict Content-Security-Policy.
- **Retest:** Re-run the exploit for "Stored XSS in Display Name" (POST /register · POST /profile) exactly as in the Practice Guide. Expected after the fix: the exploit fails, the corresponding test no longer flips, and the normal user flow for this feature still completes successfully.

### Cross-Site Request Forgery on Profile Update
- **Severity:** Medium
- **Fix:** Require per-session anti-CSRF tokens on every state-changing form and verify Origin/Referer.
- **Retest:** Re-run the exploit for "CSRF on Profile Update" (POST /profile) exactly as in the Practice Guide. Expected after the fix: the exploit fails, the corresponding test no longer flips, and the normal user flow for this feature still completes successfully.

## Courses & Registration

### Missing Capacity/Status Check on Course Enrollment
- **Severity:** Medium
- **Fix:** Enforce capacity and registration status server-side inside a transaction.
- **Retest:** Re-run the exploit for "Enroll in a Full or Closed Course" (POST /courses/:id/enroll) exactly as in the Practice Guide. Expected after the fix: the exploit fails, the corresponding test no longer flips, and the normal user flow for this feature still completes successfully.

### Prerequisite Rules Not Enforced on Enrollment
- **Severity:** Medium
- **Fix:** Verify prerequisite completion server-side before creating an enrollment.
- **Retest:** Re-run the exploit for "Prerequisite Bypass on Enrollment" (POST /courses/:id/enroll) exactly as in the Practice Guide. Expected after the fix: the exploit fails, the corresponding test no longer flips, and the normal user flow for this feature still completes successfully.

### Insecure Direct Object Reference on Enrollment Drop
- **Severity:** High
- **Fix:** Check that the enrollment belongs to the session user (or a privileged role) before deleting.
- **Retest:** Re-run the exploit for "Drop Another Student’s Enrollment (IDOR)" (POST /enrollments/:id/drop) exactly as in the Practice Guide. Expected after the fix: the exploit fails, the corresponding test no longer flips, and the normal user flow for this feature still completes successfully.

## Grades & Transcripts

### IDOR Exposes Other Students’ Grade Records
- **Severity:** High
- **Fix:** Authorise every record access against the session user and role.
- **Retest:** Re-run the exploit for "View Another Student’s Grades (IDOR)" (GET /students/:id/grades) exactly as in the Practice Guide. Expected after the fix: the exploit fails, the corresponding test no longer flips, and the normal user flow for this feature still completes successfully.

### Missing Authorization on Grade-Entry Endpoint
- **Severity:** Critical
- **Fix:** Enforce faculty/admin role server-side on the grade-entry endpoint and log all grade changes.
- **Retest:** Re-run the exploit for "Student Changes a Grade via the Faculty Endpoint" (POST /faculty/grades) exactly as in the Practice Guide. Expected after the fix: the exploit fails, the corresponding test no longer flips, and the normal user flow for this feature still completes successfully.

### IDOR on Transcript Download Leaks Identity Data
- **Severity:** High
- **Fix:** Authorise transcript generation against the requester; serve only their own document.
- **Retest:** Re-run the exploit for "Download Another Student’s Transcript (IDOR)" (GET /transcripts/:studentId) exactly as in the Practice Guide. Expected after the fix: the exploit fails, the corresponding test no longer flips, and the normal user flow for this feature still completes successfully.

### Faculty Roster Accessible to Any Authenticated User
- **Severity:** High
- **Fix:** Restrict the roster to faculty/admin roles and minimise the fields shown.
- **Retest:** Re-run the exploit for "Faculty Roster Leaks All Students’ Emails & GPAs" (GET /faculty/roster) exactly as in the Practice Guide. Expected after the fix: the exploit fails, the corresponding test no longer flips, and the normal user flow for this feature still completes successfully.

## Tuition & Payments

### IDOR Exposes Other Students’ Fee Statements
- **Severity:** High
- **Fix:** Scope statement queries to the session user; use non-sequential identifiers as defence in depth.
- **Retest:** Re-run the exploit for "View Another Student’s Fee Statement (IDOR)" (GET /statements/:id) exactly as in the Practice Guide. Expected after the fix: the exploit fails, the corresponding test no longer flips, and the normal user flow for this feature still completes successfully.

### Client-Controlled Settlement Flag Marks Statements Paid
- **Severity:** Critical
- **Fix:** Compute paid status server-side from verified payment amounts only.
- **Retest:** Re-run the exploit for "Statement Settled as Paid for $1" (POST /payments) exactly as in the Practice Guide. Expected after the fix: the exploit fails, the corresponding test no longer flips, and the normal user flow for this feature still completes successfully.

### Waiver Code Reusable Without Redemption Tracking
- **Severity:** High
- **Fix:** Record redemptions per student/statement and reject repeats server-side.
- **Retest:** Re-run the exploit for "Single-Use Merit Waiver Can Be Reused" (POST /waivers/apply) exactly as in the Practice Guide. Expected after the fix: the exploit fails, the corresponding test no longer flips, and the normal user flow for this feature still completes successfully.

## Documents & Uploads

### Unrestricted File Upload Served as Active Content
- **Severity:** High
- **Fix:** Whitelist file types, store uploads outside the web root, serve with Content-Disposition: attachment and a safe Content-Type.
- **Retest:** Re-run the exploit for "Unrestricted Upload — HTML Served from the Portal Origin" (POST /upload · GET /uploads/:name) exactly as in the Practice Guide. Expected after the fix: the exploit fails, the corresponding test no longer flips, and the normal user flow for this feature still completes successfully.

### Path Traversal in Document Download
- **Severity:** High
- **Fix:** Resolve the final path and verify it stays inside the allowed directory; reject .. segments.
- **Retest:** Re-run the exploit for "Path Traversal in Document Download" (GET /documents/download?name=) exactly as in the Practice Guide. Expected after the fix: the exploit fails, the corresponding test no longer flips, and the normal user flow for this feature still completes successfully.

## Search

### SQL Injection in Course Search
- **Severity:** High
- **Fix:** Parameterise the search query and filter hidden records server-side regardless of input.
- **Retest:** Re-run the exploit for "SQL Injection in Course Search Leaks Hidden Courses" (GET /search?q=) exactly as in the Practice Guide. Expected after the fix: the exploit fails, the corresponding test no longer flips, and the normal user flow for this feature still completes successfully.

### Reflected Cross-Site Scripting in Search
- **Severity:** Medium
- **Fix:** HTML-encode all reflected values and deploy a Content-Security-Policy.
- **Retest:** Re-run the exploit for "Reflected XSS in Course Search" (GET /search?q=) exactly as in the Practice Guide. Expected after the fix: the exploit fails, the corresponding test no longer flips, and the normal user flow for this feature still completes successfully.

## Admin Panel

### Broken Access Control on Admin Console
- **Severity:** Critical
- **Fix:** Enforce admin role server-side on all /admin routes; never display stored passwords.
- **Retest:** Re-run the exploit for "Admin Console Reachable by Any Student" (GET /admin) exactly as in the Practice Guide. Expected after the fix: the exploit fails, the corresponding test no longer flips, and the normal user flow for this feature still completes successfully.

### Cross-Site Request Forgery on Admin Role Management
- **Severity:** High
- **Fix:** Require anti-CSRF tokens on admin actions and re-confirm sensitive changes.
- **Retest:** Re-run the exploit for "CSRF on Admin Role Change" (POST /admin/adjust-role) exactly as in the Practice Guide. Expected after the fix: the exploit fails, the corresponding test no longer flips, and the normal user flow for this feature still completes successfully.
