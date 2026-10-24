# HexaExam — Vulnerability Map (LAB 53)

Every scored test in the lab, grouped by feature. This is the complete map of what HexaExam
intentionally gets wrong. All flaws are live in the application and are detected server-side
by their real effect — never by self-declared checkboxes.

**Total: 26 tests across 8 features.**

## Login & Authentication (6)

### SQL injection login bypass
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **Report title:** SQL Injection in Login Form Allows Authentication Bypass (Critical)
- **Exploitation outline:** Try an email like ' OR '1'='1 and any password — the first row in the table is the admin.
- **Impact:** On a real exam platform this hands an attacker the admin account in seconds — every question bank, result and candidate record is exposed.
- **Remediation:** Use parameterised queries / prepared statements for all database access and never concatenate user input into SQL.

### Brute force — no rate limit or lockout
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Beginner
- **Report title:** Missing Brute-Force Protection on Login (No Rate Limiting or Lockout) (High)
- **Exploitation outline:** Fail 10 logins in a row for one account and watch the app happily accept the 10th try.
- **Impact:** Attackers can grind through common-password lists against real candidate and examiner accounts until one opens.
- **Remediation:** Add progressive delays, per-account and per-IP rate limits, lockout or CAPTCHA after repeated failures, and alert on attack patterns.

### User enumeration via forgot-password responses
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Beginner
- **Report title:** User Enumeration Through Differential Forgot-Password Responses (Medium)
- **Exploitation outline:** Request a reset for alice@test.local, then for nobody@nowhere.local — one says "sent", the other admits there is no account.
- **Impact:** Attackers first harvest a list of valid candidate/examiner emails, then aim phishing and password attacks only at accounts that exist.
- **Remediation:** Return one identical, generic message for every forgot-password request regardless of whether the account exists.

### Published demo account with default credentials
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Beginner
- **Report title:** Active Demo Account With Publicly Known Default Credentials (High)
- **Exploitation outline:** Sign in with the demo account shown on the login page: demo@hexaexam.local / demo123.
- **Impact:** Anyone on the internet can walk in with the printed credentials and operate as a real user of the platform.
- **Remediation:** Remove or disable demo/default accounts in production and force unique, strong passwords on every seeded account.

### Predictable password-reset token
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Intermediate
- **Report title:** Password Reset Tokens Are Predictable (Derived From User ID) (High)
- **Exploitation outline:** Token = rst_<userId>_<userId*137+42>. Bob is user 5 — his token can be calculated without ever seeing his email.
- **Impact:** Any candidate account (or the examiner’s) can be taken over by computing its reset token — no inbox access needed.
- **Remediation:** Generate reset tokens from a CSPRNG (at least 128 bits), store only a hash, expire them quickly and make them single-use.

### Session role-cookie tampering
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Report title:** Privilege Escalation via Client-Controlled Role Cookie (Critical)
- **Exploitation outline:** Change the hx_role cookie to admin and visit /admin — the server never checks it against your account.
- **Impact:** Any candidate can promote themselves to administrator by editing a cookie — full control of exams, users and results.
- **Remediation:** Store roles only in the server-side session and ignore any role information supplied by the client.

## Registration & Profile (4)

### Weak password policy on registration
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Beginner
- **Report title:** Password Complexity Policy Not Enforced at Registration (Medium)
- **Exploitation outline:** A one-character password is accepted — the policy is printed, never enforced.
- **Impact:** Users pick trivial passwords that fall to the first guessing attempt, and the business believes it is protected.
- **Remediation:** Enforce minimum length and breached-password checks server-side on registration and password change.

### Mass assignment — self-assign examiner role at registration
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Report title:** Mass Assignment in Registration Allows Role Self-Assignment (High)
- **Exploitation outline:** Add role=examiner to the registration POST — the new account is created with that role.
- **Impact:** Attackers mint their own examiner accounts — creating exams, reading the question bank and exporting results at will.
- **Remediation:** Whitelist the exact fields a registration may set (name, email, password) and assign roles only through admin-controlled flows.

### Stored XSS in display name
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **Report title:** Stored Cross-Site Scripting via Display Name (High)
- **Exploitation outline:** Register or update your profile with a name containing a <script> or <img onerror> payload — it is stored and printed raw.
- **Impact:** An attacker’s name can execute script in the browsers of examiners and admins who view it — session theft and actions in their name.
- **Remediation:** Context-encode all user-controlled output and validate/sanitise stored fields on input.

### CSRF on profile update
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Report title:** Missing CSRF Protection on Profile Update (Medium)
- **Exploitation outline:** POST a profile change with no hx_marker field (or a cross-site Origin) while logged in — it is applied anyway.
- **Impact:** A malicious page can silently rewrite a logged-in examiner’s profile — including the email used for password resets.
- **Remediation:** Require a per-session anti-CSRF token on every state-changing request and verify Origin/Referer as defence in depth.

## Question Bank & Catalogue (3)

### Question bank readable by candidates (broken access control)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **Report title:** Broken Access Control: Question Bank Exposed to Candidates (Critical)
- **Exploitation outline:** While logged in as a candidate, visit /examiner/questions — the page checks that you are logged in, never that you are an examiner.
- **Impact:** Every candidate can read the entire question bank before the exam — the exam’s integrity is destroyed.
- **Remediation:** Enforce role checks server-side on every examiner route, not just in the navigation menu.

### Correct answers leaked in the attempt question API
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **Report title:** Correct Answers Disclosed in Client-Facing Question Payload (High)
- **Exploitation outline:** GET /api/attempts/<id>/questions returns every question WITH its correctIndex — the answers travel with the questions.
- **Impact:** Candidates score 100% by reading the network response — certificates are issued for knowledge nobody demonstrated.
- **Remediation:** Strip answer keys and grading data from every client-facing payload; grade exclusively server-side.

### SQL injection in exam catalogue search
- **OWASP:** A03:2021 Injection · **Difficulty:** Intermediate
- **Report title:** SQL Injection in Exam Catalogue Search (High)
- **Exploitation outline:** Search for ' OR '1'='1 — every exam in the catalogue comes back.
- **Impact:** Injection in search can be escalated to dump the whole database behind the catalogue — users, questions and results.
- **Remediation:** Use parameterised queries for search and apply a strict allowlist for sort/filter parameters.

## Exam Attempts & Timer (4)

### Attempt-limit bypass (only submitted attempts are counted)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Report title:** Exam Attempt Limit Bypass — In-Progress Attempts Not Counted (High)
- **Exploitation outline:** Start Networking Basics (limit 1), leave it unfinished, and start it again — the second attempt is created because only SUBMITTED attempts are counted.
- **Impact:** Candidates retake exams until they memorise the questions, defeating attempt limits that exist for fairness and integrity.
- **Remediation:** Count all attempts regardless of status when enforcing per-candidate attempt limits, inside a transaction.

### Exam timer tampering via the extend endpoint
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate
- **Report title:** Client-Controlled Exam Timer Extension (High)
- **Exploitation outline:** POST /attempts/<id>/extend with {"minutes": 600} — your deadline moves, no examiner involved.
- **Impact:** Candidates give themselves unlimited exam time — an unfair advantage that invalidates results for everyone else.
- **Remediation:** Compute deadlines exclusively server-side; any accommodation must require an examiner-approved workflow.

### Submission accepted after the deadline
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate
- **Report title:** Expired Exam Attempts Still Accept Submissions (High)
- **Exploitation outline:** Let an attempt expire (negative extend makes this instant), then submit anyway — the answers are graded and recorded.
- **Impact:** Late submissions are graded as if on time, breaking the exam rules the honest candidates followed.
- **Remediation:** Reject submissions after the server-side deadline and record late attempts distinctly.

### Attempt IDOR — view another candidate’s attempt and answers
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **Report title:** Insecure Direct Object Reference on Exam Attempts (High)
- **Exploitation outline:** Open /attempts/<id> for an attempt that is not yours — answers and all are served.
- **Impact:** Candidates can read each other’s answers and results — privacy breach and a cheating channel in one.
- **Remediation:** Verify the requesting user owns (or is staff for) every attempt before serving it; use unguessable IDs as defence in depth.

## Grading & Results (3)

### Grade tampering — client-supplied score is trusted
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate
- **Report title:** Client-Supplied Score Trusted During Grading (Critical)
- **Exploitation outline:** Add "score": 100 to your submission JSON — the recorded grade becomes yours, not the computed one.
- **Impact:** Candidates award themselves perfect scores — the business issues certificates and results that were never earned.
- **Remediation:** Ignore all client-supplied grading fields; compute scores server-side from the stored answer key.

### Results IDOR — read another candidate’s score report
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **Report title:** Insecure Direct Object Reference on Score Reports (High)
- **Exploitation outline:** GET /api/results/<attemptId> for another candidate’s attempt — full score report, no ownership check.
- **Impact:** Exam results leak between candidates — a privacy incident and, for a real provider, a regulatory problem.
- **Remediation:** Authorise every results read against the session user (owner or staff) before returning data.

### Examiner score export downloadable by candidates
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **Report title:** Broken Access Control: Results Export Exposed to Candidates (High)
- **Exploitation outline:** As a candidate, GET /examiner/export.csv — the full results file downloads.
- **Impact:** One candidate click downloads every candidate’s results — mass disclosure in a single request.
- **Remediation:** Restrict export endpoints to examiner/admin roles server-side and log every export.

## Proctor Notes (2)

### Private proctor notes readable by the candidate
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Report title:** Proctor Notes Exposed to Candidates via API (Medium)
- **Exploitation outline:** As the candidate, GET /api/attempts/<id>/notes on your own attempt — the proctor’s private remarks come back.
- **Impact:** Candidates learn exactly what proctors suspected and when — letting cheaters adapt and undermining investigations.
- **Remediation:** Restrict proctor-note reads to examiner/admin roles and audit access.

### Candidates can write fake proctor notes
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Report title:** Unauthorised Write Access to Proctor Notes (High)
- **Exploitation outline:** POST a note to /api/attempts/<id>/notes as a candidate — it is stored as an official proctor note.
- **Impact:** Candidates can plant exonerating "proctor notes" on their own flagged attempts, corrupting the integrity record.
- **Remediation:** Require examiner/admin role for note creation and record the authenticated author server-side.

## Admin Panel (2)

### CSRF on admin role change
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Advanced
- **Report title:** Missing CSRF Protection on Administrative Role Changes (High)
- **Exploitation outline:** While logged in as admin, POST /admin/users/<id>/role with a new role and no hx_marker — the change is applied.
- **Impact:** A page an admin merely visits can promote an attacker’s account to examiner or demote real staff — silently.
- **Remediation:** Enforce anti-CSRF tokens on all admin actions and re-authenticate for privilege changes.

### Stored XSS reaching the admin user list
- **OWASP:** A03:2021 Injection · **Difficulty:** Intermediate
- **Report title:** Stored Cross-Site Scripting in Admin User Management (High)
- **Exploitation outline:** Register an account whose name carries a script payload, then view /admin/users as admin — the payload is served in the admin’s page.
- **Impact:** An attacker’s stored name executes in the admin’s browser — the shortest path from signup form to full compromise.
- **Remediation:** Encode user-controlled data in admin views exactly as in public views; add a Content-Security-Policy as defence in depth.

## Platform & API (2)

### Unauthenticated /api/debug dumps every account (incl. passwords)
- **OWASP:** A05:2021 Security Misconfiguration · **Difficulty:** Beginner
- **Report title:** Unauthenticated Debug Endpoint Discloses All User Records (Critical)
- **Exploitation outline:** GET /api/debug with no session at all — every user record, passwords included, comes back as JSON.
- **Impact:** A single unauthenticated request hands attackers every account and password on the platform.
- **Remediation:** Remove debug endpoints from production builds; if diagnostics are required, gate them behind admin auth and network restrictions.

### API accepts base64(email) as a bearer token
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Intermediate
- **Report title:** Forgeable API Tokens (Base64 of Email Address) (Critical)
- **Exploitation outline:** Call GET /api/me with Authorization: Bearer <base64 of any user’s email> — the API accepts it as that user.
- **Impact:** Anyone who knows a victim’s email address fully impersonates them through the API.
- **Remediation:** Issue high-entropy random API tokens server-side, store hashes, and support revocation and expiry.
