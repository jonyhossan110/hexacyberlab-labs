# HexaExam — Fix & Retest (LAB 53)

For every test in the registry: the secure implementation and the regression check that
proves the flaw is gone. Apply the fix in a COPY of the lab, re-run the exploit, and confirm
the test no longer flips while the legitimate flow still works.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass (Critical)
- **Secure implementation:** Use parameterised queries / prepared statements for all database access and never concatenate user input into SQL.
- **Regression test:** repeat the original exploit ("SQL injection login bypass") against the fixed build — it must fail safely (no session/object/score changes hands), the corresponding test on /tests must stay open, and the normal user flow for this feature must still complete successfully.

### Missing Brute-Force Protection on Login (No Rate Limiting or Lockout) (High)
- **Secure implementation:** Add progressive delays, per-account and per-IP rate limits, lockout or CAPTCHA after repeated failures, and alert on attack patterns.
- **Regression test:** repeat the original exploit ("Brute force — no rate limit or lockout") against the fixed build — it must fail safely (no session/object/score changes hands), the corresponding test on /tests must stay open, and the normal user flow for this feature must still complete successfully.

### User Enumeration Through Differential Forgot-Password Responses (Medium)
- **Secure implementation:** Return one identical, generic message for every forgot-password request regardless of whether the account exists.
- **Regression test:** repeat the original exploit ("User enumeration via forgot-password responses") against the fixed build — it must fail safely (no session/object/score changes hands), the corresponding test on /tests must stay open, and the normal user flow for this feature must still complete successfully.

### Active Demo Account With Publicly Known Default Credentials (High)
- **Secure implementation:** Remove or disable demo/default accounts in production and force unique, strong passwords on every seeded account.
- **Regression test:** repeat the original exploit ("Published demo account with default credentials") against the fixed build — it must fail safely (no session/object/score changes hands), the corresponding test on /tests must stay open, and the normal user flow for this feature must still complete successfully.

### Password Reset Tokens Are Predictable (Derived From User ID) (High)
- **Secure implementation:** Generate reset tokens from a CSPRNG (at least 128 bits), store only a hash, expire them quickly and make them single-use.
- **Regression test:** repeat the original exploit ("Predictable password-reset token") against the fixed build — it must fail safely (no session/object/score changes hands), the corresponding test on /tests must stay open, and the normal user flow for this feature must still complete successfully.

### Privilege Escalation via Client-Controlled Role Cookie (Critical)
- **Secure implementation:** Store roles only in the server-side session and ignore any role information supplied by the client.
- **Regression test:** repeat the original exploit ("Session role-cookie tampering") against the fixed build — it must fail safely (no session/object/score changes hands), the corresponding test on /tests must stay open, and the normal user flow for this feature must still complete successfully.

## Registration & Profile

### Password Complexity Policy Not Enforced at Registration (Medium)
- **Secure implementation:** Enforce minimum length and breached-password checks server-side on registration and password change.
- **Regression test:** repeat the original exploit ("Weak password policy on registration") against the fixed build — it must fail safely (no session/object/score changes hands), the corresponding test on /tests must stay open, and the normal user flow for this feature must still complete successfully.

### Mass Assignment in Registration Allows Role Self-Assignment (High)
- **Secure implementation:** Whitelist the exact fields a registration may set (name, email, password) and assign roles only through admin-controlled flows.
- **Regression test:** repeat the original exploit ("Mass assignment — self-assign examiner role at registration") against the fixed build — it must fail safely (no session/object/score changes hands), the corresponding test on /tests must stay open, and the normal user flow for this feature must still complete successfully.

### Stored Cross-Site Scripting via Display Name (High)
- **Secure implementation:** Context-encode all user-controlled output and validate/sanitise stored fields on input.
- **Regression test:** repeat the original exploit ("Stored XSS in display name") against the fixed build — it must fail safely (no session/object/score changes hands), the corresponding test on /tests must stay open, and the normal user flow for this feature must still complete successfully.

### Missing CSRF Protection on Profile Update (Medium)
- **Secure implementation:** Require a per-session anti-CSRF token on every state-changing request and verify Origin/Referer as defence in depth.
- **Regression test:** repeat the original exploit ("CSRF on profile update") against the fixed build — it must fail safely (no session/object/score changes hands), the corresponding test on /tests must stay open, and the normal user flow for this feature must still complete successfully.

## Question Bank & Catalogue

### Broken Access Control: Question Bank Exposed to Candidates (Critical)
- **Secure implementation:** Enforce role checks server-side on every examiner route, not just in the navigation menu.
- **Regression test:** repeat the original exploit ("Question bank readable by candidates (broken access control)") against the fixed build — it must fail safely (no session/object/score changes hands), the corresponding test on /tests must stay open, and the normal user flow for this feature must still complete successfully.

### Correct Answers Disclosed in Client-Facing Question Payload (High)
- **Secure implementation:** Strip answer keys and grading data from every client-facing payload; grade exclusively server-side.
- **Regression test:** repeat the original exploit ("Correct answers leaked in the attempt question API") against the fixed build — it must fail safely (no session/object/score changes hands), the corresponding test on /tests must stay open, and the normal user flow for this feature must still complete successfully.

### SQL Injection in Exam Catalogue Search (High)
- **Secure implementation:** Use parameterised queries for search and apply a strict allowlist for sort/filter parameters.
- **Regression test:** repeat the original exploit ("SQL injection in exam catalogue search") against the fixed build — it must fail safely (no session/object/score changes hands), the corresponding test on /tests must stay open, and the normal user flow for this feature must still complete successfully.

## Exam Attempts & Timer

### Exam Attempt Limit Bypass — In-Progress Attempts Not Counted (High)
- **Secure implementation:** Count all attempts regardless of status when enforcing per-candidate attempt limits, inside a transaction.
- **Regression test:** repeat the original exploit ("Attempt-limit bypass (only submitted attempts are counted)") against the fixed build — it must fail safely (no session/object/score changes hands), the corresponding test on /tests must stay open, and the normal user flow for this feature must still complete successfully.

### Client-Controlled Exam Timer Extension (High)
- **Secure implementation:** Compute deadlines exclusively server-side; any accommodation must require an examiner-approved workflow.
- **Regression test:** repeat the original exploit ("Exam timer tampering via the extend endpoint") against the fixed build — it must fail safely (no session/object/score changes hands), the corresponding test on /tests must stay open, and the normal user flow for this feature must still complete successfully.

### Expired Exam Attempts Still Accept Submissions (High)
- **Secure implementation:** Reject submissions after the server-side deadline and record late attempts distinctly.
- **Regression test:** repeat the original exploit ("Submission accepted after the deadline") against the fixed build — it must fail safely (no session/object/score changes hands), the corresponding test on /tests must stay open, and the normal user flow for this feature must still complete successfully.

### Insecure Direct Object Reference on Exam Attempts (High)
- **Secure implementation:** Verify the requesting user owns (or is staff for) every attempt before serving it; use unguessable IDs as defence in depth.
- **Regression test:** repeat the original exploit ("Attempt IDOR — view another candidate’s attempt and answers") against the fixed build — it must fail safely (no session/object/score changes hands), the corresponding test on /tests must stay open, and the normal user flow for this feature must still complete successfully.

## Grading & Results

### Client-Supplied Score Trusted During Grading (Critical)
- **Secure implementation:** Ignore all client-supplied grading fields; compute scores server-side from the stored answer key.
- **Regression test:** repeat the original exploit ("Grade tampering — client-supplied score is trusted") against the fixed build — it must fail safely (no session/object/score changes hands), the corresponding test on /tests must stay open, and the normal user flow for this feature must still complete successfully.

### Insecure Direct Object Reference on Score Reports (High)
- **Secure implementation:** Authorise every results read against the session user (owner or staff) before returning data.
- **Regression test:** repeat the original exploit ("Results IDOR — read another candidate’s score report") against the fixed build — it must fail safely (no session/object/score changes hands), the corresponding test on /tests must stay open, and the normal user flow for this feature must still complete successfully.

### Broken Access Control: Results Export Exposed to Candidates (High)
- **Secure implementation:** Restrict export endpoints to examiner/admin roles server-side and log every export.
- **Regression test:** repeat the original exploit ("Examiner score export downloadable by candidates") against the fixed build — it must fail safely (no session/object/score changes hands), the corresponding test on /tests must stay open, and the normal user flow for this feature must still complete successfully.

## Proctor Notes

### Proctor Notes Exposed to Candidates via API (Medium)
- **Secure implementation:** Restrict proctor-note reads to examiner/admin roles and audit access.
- **Regression test:** repeat the original exploit ("Private proctor notes readable by the candidate") against the fixed build — it must fail safely (no session/object/score changes hands), the corresponding test on /tests must stay open, and the normal user flow for this feature must still complete successfully.

### Unauthorised Write Access to Proctor Notes (High)
- **Secure implementation:** Require examiner/admin role for note creation and record the authenticated author server-side.
- **Regression test:** repeat the original exploit ("Candidates can write fake proctor notes") against the fixed build — it must fail safely (no session/object/score changes hands), the corresponding test on /tests must stay open, and the normal user flow for this feature must still complete successfully.

## Admin Panel

### Missing CSRF Protection on Administrative Role Changes (High)
- **Secure implementation:** Enforce anti-CSRF tokens on all admin actions and re-authenticate for privilege changes.
- **Regression test:** repeat the original exploit ("CSRF on admin role change") against the fixed build — it must fail safely (no session/object/score changes hands), the corresponding test on /tests must stay open, and the normal user flow for this feature must still complete successfully.

### Stored Cross-Site Scripting in Admin User Management (High)
- **Secure implementation:** Encode user-controlled data in admin views exactly as in public views; add a Content-Security-Policy as defence in depth.
- **Regression test:** repeat the original exploit ("Stored XSS reaching the admin user list") against the fixed build — it must fail safely (no session/object/score changes hands), the corresponding test on /tests must stay open, and the normal user flow for this feature must still complete successfully.

## Platform & API

### Unauthenticated Debug Endpoint Discloses All User Records (Critical)
- **Secure implementation:** Remove debug endpoints from production builds; if diagnostics are required, gate them behind admin auth and network restrictions.
- **Regression test:** repeat the original exploit ("Unauthenticated /api/debug dumps every account (incl. passwords)") against the fixed build — it must fail safely (no session/object/score changes hands), the corresponding test on /tests must stay open, and the normal user flow for this feature must still complete successfully.

### Forgeable API Tokens (Base64 of Email Address) (Critical)
- **Secure implementation:** Issue high-entropy random API tokens server-side, store hashes, and support revocation and expiry.
- **Regression test:** repeat the original exploit ("API accepts base64(email) as a bearer token") against the fixed build — it must fail safely (no session/object/score changes hands), the corresponding test on /tests must stay open, and the normal user flow for this feature must still complete successfully.
