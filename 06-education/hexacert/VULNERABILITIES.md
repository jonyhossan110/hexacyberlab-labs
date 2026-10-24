# HexaCert — Vulnerability Map (LAB 59)

Every scored test in the lab, grouped by feature. 26 tests across 9 features.
A test completes only when the exploit actually succeeds and the server observes its real effect.

## Login & Authentication

### SQL Injection Login Bypass
- **OWASP:** A03:2021 Injection
- **Difficulty:** Intermediate
- **Location:** POST /login (legacy string-built query path)
- **Exploitation outline:** Use email: ' OR '1'='1 and any password — the glued query matches the first account (the admin).
- **Impact:** On a real certification platform this hands an attacker the admin account with no password at all — every candidate record, exam and issued credential is exposed or forgeable.
- **Report title:** SQL Injection in Login Allows Authentication Bypass (Critical)

### Brute Force — No Rate Limiting or Lockout
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /login
- **Exploitation outline:** Make 10+ failed attempts against alice@test.local — every one is still processed instantly.
- **Impact:** Attackers can grind through candidate and staff passwords overnight; one guessed proctor or admin password compromises the whole certification programme.
- **Report title:** Missing Brute-Force Protection on Login (High)

### User Enumeration via Login & Reset Responses
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /login and POST /forgot
- **Exploitation outline:** Probe at least 5 different emails across login/forgot — real accounts say "Incorrect password" / show a reset preview, unknown ones say "No account found".
- **Impact:** An attacker first harvests which emails hold accounts, then focuses phishing and password guessing only on real candidates and staff.
- **Report title:** Account Enumeration Through Differential Auth Responses (Medium)

### Default / Demo Administrator Credentials
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /login with the seeded admin account
- **Exploitation outline:** Sign in as admin@hexacert.local with the password shown in the demo account list.
- **Impact:** Anyone who reads the manual owns the platform: full control over exams, results and certificate issuing.
- **Report title:** Default Credentials on the Administrator Account (Critical)

### Predictable Password Reset Token
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Difficulty:** Intermediate
- **Location:** POST /forgot then POST /reset
- **Exploitation outline:** The token is simply HX followed by the numeric user id (e.g. the 4th account uses HX4) — compute it for another user and reset their password.
- **Impact:** Any candidate (or staff) account can be taken over by anyone who knows the victim's email and guesses their sequential user id.
- **Report title:** Predictable Password Reset Tokens Allow Account Takeover (High)

### Session Role Cookie Tampering
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** hx_role cookie honoured by /admin and /proctor
- **Exploitation outline:** Sign in as a candidate, set the cookie hx_role=admin, then open /admin.
- **Impact:** Every candidate becomes an administrator by changing one cookie — results, revocations and issuing are all exposed.
- **Report title:** Client-Controlled Role Cookie Grants Privilege Escalation (High)

## Registration & Profile

### Weak Password Policy
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /register
- **Exploitation outline:** Register a new account with the password "x" — it is accepted.
- **Impact:** Candidates protect exam bookings and certificates with passwords that fall to the first guesses an attacker tries.
- **Report title:** No Minimum Password Strength on Registration (Medium)

### Mass Assignment — Role Escalation at Registration
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /register (extra form fields are bound to the account)
- **Exploitation outline:** Register with an extra field role=admin (add it to the form data) — the new account is created as an administrator.
- **Impact:** Self-service admin creation: an attacker registers and immediately controls the certification platform.
- **Report title:** Mass Assignment in Registration Allows Role Escalation (Critical)

### Stored XSS in Display Name
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Location:** POST /register and POST /profile (name rendered unescaped)
- **Exploitation outline:** Register or rename yourself to <script>alert(1)</script> — it is stored and rendered as code.
- **Impact:** An attacker plants a script in their display name and steals the session of any staff member who views the candidate list.
- **Report title:** Stored Cross-Site Scripting via Display Name (High)

### CSRF on Profile Update
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /profile (no anti-CSRF token; origin marker never verified)
- **Exploitation outline:** While signed in, submit the profile form from a raw request that has only your session cookie (no hx_origin marker) — the name still changes.
- **Impact:** A malicious page a candidate visits while signed in can silently rewrite their profile — the same pattern reaches far worse actions elsewhere in the app.
- **Report title:** Missing CSRF Protection on Profile Update (Medium)

## Exam Booking

### Booking IDOR — View Another Candidate's Booking
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /bookings/:id
- **Exploitation outline:** Open /bookings/2 while signed in as Alice — it is Bob's booking, served without any ownership check.
- **Impact:** Candidates can read each other's exam schedules and personal booking data — a privacy breach and a map for further attacks.
- **Report title:** Insecure Direct Object Reference on Booking Details (High)

### Exam Swap After Booking (Price Downgrade Fraud)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /bookings/:id/exam
- **Exploitation outline:** Change a Web Security Fundamentals booking ($199) to Cloud Security Associate ($299) via the exam-swap action — no payment for the difference is ever requested.
- **Impact:** Candidates sit premium exams while paying entry-level fees — direct revenue loss on every swapped booking.
- **Report title:** Booking Exam Can Be Changed Without Re-Pricing (High)

## Exam Taking & Results

### Self-Graded Exam — Client-Supplied Score Trusted
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Advanced
- **Location:** POST /exam/:bookingId/submit
- **Exploitation outline:** Submit your own exam with score=100 in the request — the platform records a perfect pass without grading a single answer.
- **Impact:** Every certificate the body issues becomes worthless: candidates award themselves perfect scores and employers lose trust in the credential.
- **Report title:** Exam Score Accepted From the Client Without Server-Side Grading (Critical)

### Candidate Releases Own Results (Proctor-Only Action)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /results/:bookingId/release
- **Exploitation outline:** As a candidate, call the release action on an unreleased result — it publishes without any proctor involved.
- **Impact:** Candidates publish (and rely on) unverified results, defeating proctor review that exists to catch cheating and errors.
- **Report title:** Missing Role Check on Result Release Action (High)

### Exam Result IDOR — Read Another Candidate's Result
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /results/:bookingId
- **Exploitation outline:** Open /results/5 as Alice — Carol's completed exam result, score included, is served to you.
- **Impact:** Candidates harvest competitors' scores and exam history — a clear personal-data breach for the certification body.
- **Report title:** Insecure Direct Object Reference on Exam Results (High)

## Certificates & Verification

### Self-Issued Credential Without Passing
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Advanced
- **Location:** POST /certificates/issue
- **Exploitation outline:** As a plain candidate, POST an issue request for the Cloud Security Associate exam — a real, verifiable credential is created for you.
- **Impact:** Anyone can mint genuine-looking, publicly verifiable certificates in minutes — the certification brand is destroyed.
- **Report title:** Credential Issuing Endpoint Lacks Authorization and Pass Verification (Critical)

### Sequential Certificate ID Enumeration (Public)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /verify?certId=HC-####
- **Exploitation outline:** Probe HC-1001 through HC-1005 on the public verify page — each real one reveals its holder's name and credential.
- **Impact:** Attackers enumerate every certificate holder — names, credentials and validity — for phishing, forgery templates and privacy abuse.
- **Report title:** Enumerable Certificate IDs on the Public Verification Page (Medium)

### Verification Result Forgery via URL Parameters
- **OWASP:** A03:2021 Injection
- **Difficulty:** Intermediate
- **Location:** GET /verify?certId=...&status=valid&name=...
- **Exploitation outline:** Open /verify?certId=HC-9999&status=valid&name=Forged+Name — a non-existent certificate is presented as VALID.
- **Impact:** Fake "verified" links can be sent to employers as proof of credentials that were never earned — fraud enabled by the official page itself.
- **Report title:** Certificate Verification Verdict Controlled by URL Parameters (High)

## Vouchers & Partners

### Voucher Re-Redemption (Single-Use Not Enforced)
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Intermediate
- **Location:** POST /vouchers/redeem
- **Exploitation outline:** Redeem PARTNER-2026-ALPHA once, then redeem the very same code again (any account) — a second free booking is created.
- **Impact:** One leaked partner voucher becomes unlimited free exams — the partner programme bleeds revenue.
- **Report title:** Single-Use Vouchers Can Be Redeemed Repeatedly (High)

### Voucher Code Enumeration / Guessing
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /vouchers/redeem (error oracle)
- **Exploitation outline:** Probe 5 or more different code guesses — nothing throttles you, and the responses confirm which guesses are wrong.
- **Impact:** Attackers grind through the predictable code space until they hit live partner vouchers and redeem free exams.
- **Report title:** Voucher Codes Are Predictable and Redemption Is Unthrottled (Medium)

## Renewals

### Renew Expired Credential Without Re-Examination
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /renewals/:credId
- **Exploitation outline:** Renew credential HC-1001 (expired 2026-10-15) — it becomes active again instantly, with no re-exam and no checks.
- **Impact:** Lapsed certificate holders stay "certified" forever — employers rely on credentials the body itself had retired.
- **Report title:** Expired Credentials Can Be Renewed Without Re-Examination (High)

### Renew Another Candidate's Credential
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** POST /renewals/:credId
- **Exploitation outline:** Renew credential id 2 (Bob's HC-1002) while signed in as someone else — it renews without any ownership check.
- **Impact:** Strangers can renew, and thereby manipulate the validity of, other people's professional credentials.
- **Report title:** Missing Ownership Check on Credential Renewal (Medium)

## Admin Panel

### Broken Access Control — Admin Panel Open to Any Signed-In User
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /admin
- **Exploitation outline:** Sign in as any candidate and open /admin directly — the full panel, user list included, is served.
- **Impact:** The entire administration surface — users, credentials, revocation — is one URL away for every registered candidate.
- **Report title:** Admin Panel Accessible Without the Admin Role (Critical)

### CSRF on Admin Action (Revoke Certificate)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /admin/revoke (origin marker never verified)
- **Exploitation outline:** Submit the revoke action from a raw request carrying only the admin session cookie (no hx_origin marker) — the certificate is revoked.
- **Impact:** A booby-trapped page visited by an admin silently revokes real certificates — sabotage with the admin's own authority.
- **Report title:** Missing CSRF Protection on Certificate Revocation (High)

## Platform & API

### Weak API Token (Base64 of Email)
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Difficulty:** Intermediate
- **Location:** GET /api/me with Authorization: Bearer <token>
- **Exploitation outline:** Send Authorization: Bearer with the base64 encoding of any user's email (e.g. alice@test.local) — the API returns that user's account data.
- **Impact:** Anyone who knows a victim's email address — public information — has full API access to their account.
- **Report title:** API Authentication Token Is a Base64 Encoding of the User Email (High)

### Sensitive Data Exposure — /api/debug Dumps All Accounts
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /api/debug
- **Exploitation outline:** Open /api/debug — every account, including passwords, plus vouchers and credentials, is returned as JSON with no login at all.
- **Impact:** One unauthenticated request steals every password in the system — total compromise in a single call.
- **Report title:** Unauthenticated Debug Endpoint Exposes All User Credentials (Critical)
