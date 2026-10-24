# HexaCert — Fix & Retest Guide (LAB 59)

For every finding: the secure implementation, and the regression test that proves the fix.
General regression rule: repeat the original exploit steps from VULNERABILITIES.md after the fix —
the attack must now fail (blocked, rejected, or safely neutralised) while the legitimate flow still works.

## Login & Authentication

### SQL Injection in Login Allows Authentication Bypass — Critical
- **Secure implementation:** Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.
- **Regression test:** Repeat the exploit for "SQL Injection Login Bypass" (POST /login (legacy string-built query path)). Expected after fix: the malicious effect no longer occurs, the action is denied or safely handled, and the corresponding legitimate user flow still succeeds.

### Missing Brute-Force Protection on Login — High
- **Secure implementation:** Add per-account and per-IP rate limiting, progressive delays/lockout and MFA for staff roles.
- **Regression test:** Repeat the exploit for "Brute Force — No Rate Limiting or Lockout" (POST /login). Expected after fix: the malicious effect no longer occurs, the action is denied or safely handled, and the corresponding legitimate user flow still succeeds.

### Account Enumeration Through Differential Auth Responses — Medium
- **Secure implementation:** Return one generic message for all auth failures and reset requests, regardless of account existence.
- **Regression test:** Repeat the exploit for "User Enumeration via Login & Reset Responses" (POST /login and POST /forgot). Expected after fix: the malicious effect no longer occurs, the action is denied or safely handled, and the corresponding legitimate user flow still succeeds.

### Default Credentials on the Administrator Account — Critical
- **Secure implementation:** Force a unique strong password at first setup; remove or disable all demo accounts in production.
- **Regression test:** Repeat the exploit for "Default / Demo Administrator Credentials" (POST /login with the seeded admin account). Expected after fix: the malicious effect no longer occurs, the action is denied or safely handled, and the corresponding legitimate user flow still succeeds.

### Predictable Password Reset Tokens Allow Account Takeover — High
- **Secure implementation:** Generate reset tokens with a CSPRNG (≥128-bit), expire them quickly and make them single-use.
- **Regression test:** Repeat the exploit for "Predictable Password Reset Token" (POST /forgot then POST /reset). Expected after fix: the malicious effect no longer occurs, the action is denied or safely handled, and the corresponding legitimate user flow still succeeds.

### Client-Controlled Role Cookie Grants Privilege Escalation — High
- **Secure implementation:** Derive roles only from the server-side session record; ignore role claims in cookies or form fields.
- **Regression test:** Repeat the exploit for "Session Role Cookie Tampering" (hx_role cookie honoured by /admin and /proctor). Expected after fix: the malicious effect no longer occurs, the action is denied or safely handled, and the corresponding legitimate user flow still succeeds.

## Registration & Profile

### No Minimum Password Strength on Registration — Medium
- **Secure implementation:** Enforce a minimum length (≥10) and block common/breached passwords at registration and reset.
- **Regression test:** Repeat the exploit for "Weak Password Policy" (POST /register). Expected after fix: the malicious effect no longer occurs, the action is denied or safely handled, and the corresponding legitimate user flow still succeeds.

### Mass Assignment in Registration Allows Role Escalation — Critical
- **Secure implementation:** Whitelist assignable fields per endpoint; set role server-side only, never from request data.
- **Regression test:** Repeat the exploit for "Mass Assignment — Role Escalation at Registration" (POST /register (extra form fields are bound to the account)). Expected after fix: the malicious effect no longer occurs, the action is denied or safely handled, and the corresponding legitimate user flow still succeeds.

### Stored Cross-Site Scripting via Display Name — High
- **Secure implementation:** Output-encode all user data in HTML and add a Content-Security-Policy header.
- **Regression test:** Repeat the exploit for "Stored XSS in Display Name" (POST /register and POST /profile (name rendered unescaped)). Expected after fix: the malicious effect no longer occurs, the action is denied or safely handled, and the corresponding legitimate user flow still succeeds.

### Missing CSRF Protection on Profile Update — Medium
- **Secure implementation:** Require a per-session anti-CSRF token on every state-changing form and verify Origin/Referer.
- **Regression test:** Repeat the exploit for "CSRF on Profile Update" (POST /profile (no anti-CSRF token; origin marker never verified)). Expected after fix: the malicious effect no longer occurs, the action is denied or safely handled, and the corresponding legitimate user flow still succeeds.

## Exam Booking

### Insecure Direct Object Reference on Booking Details — High
- **Secure implementation:** Enforce per-object ownership checks on the server for every booking read and write.
- **Regression test:** Repeat the exploit for "Booking IDOR — View Another Candidate's Booking" (GET /bookings/:id). Expected after fix: the malicious effect no longer occurs, the action is denied or safely handled, and the corresponding legitimate user flow still succeeds.

### Booking Exam Can Be Changed Without Re-Pricing — High
- **Secure implementation:** Recompute price server-side on any exam change and require payment of the difference before confirming.
- **Regression test:** Repeat the exploit for "Exam Swap After Booking (Price Downgrade Fraud)" (POST /bookings/:id/exam). Expected after fix: the malicious effect no longer occurs, the action is denied or safely handled, and the corresponding legitimate user flow still succeeds.

## Exam Taking & Results

### Exam Score Accepted From the Client Without Server-Side Grading — Critical
- **Secure implementation:** Grade answers server-side from stored questions; never accept a score or pass/fail flag from the client.
- **Regression test:** Repeat the exploit for "Self-Graded Exam — Client-Supplied Score Trusted" (POST /exam/:bookingId/submit). Expected after fix: the malicious effect no longer occurs, the action is denied or safely handled, and the corresponding legitimate user flow still succeeds.

### Missing Role Check on Result Release Action — High
- **Secure implementation:** Require the proctor role server-side for result release; log who released each result.
- **Regression test:** Repeat the exploit for "Candidate Releases Own Results (Proctor-Only Action)" (POST /results/:bookingId/release). Expected after fix: the malicious effect no longer occurs, the action is denied or safely handled, and the corresponding legitimate user flow still succeeds.

### Insecure Direct Object Reference on Exam Results — High
- **Secure implementation:** Check result ownership (or staff role) server-side before serving any result.
- **Regression test:** Repeat the exploit for "Exam Result IDOR — Read Another Candidate's Result" (GET /results/:bookingId). Expected after fix: the malicious effect no longer occurs, the action is denied or safely handled, and the corresponding legitimate user flow still succeeds.

## Certificates & Verification

### Credential Issuing Endpoint Lacks Authorization and Pass Verification — Critical
- **Secure implementation:** Restrict issuing to admins and require a completed, released, passing result before a credential can be created.
- **Regression test:** Repeat the exploit for "Self-Issued Credential Without Passing" (POST /certificates/issue). Expected after fix: the malicious effect no longer occurs, the action is denied or safely handled, and the corresponding legitimate user flow still succeeds.

### Enumerable Certificate IDs on the Public Verification Page — Medium
- **Secure implementation:** Use long random certificate identifiers and rate-limit the public verification endpoint.
- **Regression test:** Repeat the exploit for "Sequential Certificate ID Enumeration (Public)" (GET /verify?certId=HC-####). Expected after fix: the malicious effect no longer occurs, the action is denied or safely handled, and the corresponding legitimate user flow still succeeds.

### Certificate Verification Verdict Controlled by URL Parameters — High
- **Secure implementation:** Compute the verification result solely from the stored credential record; ignore all display parameters.
- **Regression test:** Repeat the exploit for "Verification Result Forgery via URL Parameters" (GET /verify?certId=...&status=valid&name=...). Expected after fix: the malicious effect no longer occurs, the action is denied or safely handled, and the corresponding legitimate user flow still succeeds.

## Vouchers & Partners

### Single-Use Vouchers Can Be Redeemed Repeatedly — High
- **Secure implementation:** Check and consume the voucher atomically server-side; reject already-used codes.
- **Regression test:** Repeat the exploit for "Voucher Re-Redemption (Single-Use Not Enforced)" (POST /vouchers/redeem). Expected after fix: the malicious effect no longer occurs, the action is denied or safely handled, and the corresponding legitimate user flow still succeeds.

### Voucher Codes Are Predictable and Redemption Is Unthrottled — Medium
- **Secure implementation:** Use high-entropy voucher codes and rate-limit redemption attempts per account and IP.
- **Regression test:** Repeat the exploit for "Voucher Code Enumeration / Guessing" (POST /vouchers/redeem (error oracle)). Expected after fix: the malicious effect no longer occurs, the action is denied or safely handled, and the corresponding legitimate user flow still succeeds.

## Renewals

### Expired Credentials Can Be Renewed Without Re-Examination — High
- **Secure implementation:** Require a passed renewal exam (or block renewal) once a credential has expired; enforce the rule server-side.
- **Regression test:** Repeat the exploit for "Renew Expired Credential Without Re-Examination" (POST /renewals/:credId). Expected after fix: the malicious effect no longer occurs, the action is denied or safely handled, and the corresponding legitimate user flow still succeeds.

### Missing Ownership Check on Credential Renewal — Medium
- **Secure implementation:** Verify the credential belongs to the requester (or staff role) before renewing.
- **Regression test:** Repeat the exploit for "Renew Another Candidate's Credential" (POST /renewals/:credId). Expected after fix: the malicious effect no longer occurs, the action is denied or safely handled, and the corresponding legitimate user flow still succeeds.

## Admin Panel

### Admin Panel Accessible Without the Admin Role — Critical
- **Secure implementation:** Enforce the admin role server-side on every admin route and action.
- **Regression test:** Repeat the exploit for "Broken Access Control — Admin Panel Open to Any Signed-In User" (GET /admin). Expected after fix: the malicious effect no longer occurs, the action is denied or safely handled, and the corresponding legitimate user flow still succeeds.

### Missing CSRF Protection on Certificate Revocation — High
- **Secure implementation:** Require per-session anti-CSRF tokens on all admin actions and verify Origin/Referer.
- **Regression test:** Repeat the exploit for "CSRF on Admin Action (Revoke Certificate)" (POST /admin/revoke (origin marker never verified)). Expected after fix: the malicious effect no longer occurs, the action is denied or safely handled, and the corresponding legitimate user flow still succeeds.

## Platform & API

### API Authentication Token Is a Base64 Encoding of the User Email — High
- **Secure implementation:** Issue long random API tokens, store only their hashes, and support revocation.
- **Regression test:** Repeat the exploit for "Weak API Token (Base64 of Email)" (GET /api/me with Authorization: Bearer <token>). Expected after fix: the malicious effect no longer occurs, the action is denied or safely handled, and the corresponding legitimate user flow still succeeds.

### Unauthenticated Debug Endpoint Exposes All User Credentials — Critical
- **Secure implementation:** Remove debug endpoints from production builds; gate any diagnostics behind admin auth and never include passwords.
- **Regression test:** Repeat the exploit for "Sensitive Data Exposure — /api/debug Dumps All Accounts" (GET /api/debug). Expected after fix: the malicious effect no longer occurs, the action is denied or safely handled, and the corresponding legitimate user flow still succeeds.
