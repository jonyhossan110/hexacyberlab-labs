# HexaAcademy — Fix & Retest Guide (LAB 52)

For every scored test: the professional report title, severity, the secure implementation that removes the flaw, and the regression check that proves the fix holds. Work through them after completing the lab — finding a flaw is half the job; verifying the fix is the other half.

## Login & Authentication

### SQL Injection in Academy Login (Authentication Bypass)
- **Severity:** Critical · **Test:** SQL Injection Login Bypass (A03 Injection)
- **Fix:** Use parameterised queries everywhere; never build SQL by string concatenation; add regression tests with injection payloads on all auth endpoints.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("SQL Injection Login Bypass"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Missing Brute-Force Protection on Academy Login
- **Severity:** High · **Test:** Brute Force — No Lockout or Throttle (A07 Authentication Failures)
- **Fix:** Add progressive delays, per-account and per-IP throttling, lockout with safe unlock, and alerting on credential-stuffing patterns.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Brute Force — No Lockout or Throttle"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Account Enumeration via Password-Reset Responses
- **Severity:** Medium · **Test:** Account Enumeration via Password Reset (A07 Authentication Failures)
- **Fix:** Return one identical, generic message for every reset request regardless of whether the account exists.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Account Enumeration via Password Reset"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Default Credentials on Platform Admin Account
- **Severity:** Critical · **Test:** Default Admin Credentials (A07 Authentication Failures)
- **Fix:** Force unique, strong passwords at first setup; scan all privileged accounts for known default passwords and rotate them.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Default Admin Credentials"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Predictable Password-Reset Tokens Allow Account Takeover
- **Severity:** Critical · **Test:** Predictable Password-Reset Token (A07 Authentication Failures)
- **Fix:** Generate reset tokens from a CSPRNG (≥128 bits), store only a hash, expire them quickly and make them single-use.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Predictable Password-Reset Token"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Client-Controlled Role in Session Cookie Enables Privilege Escalation
- **Severity:** Critical · **Test:** Session Cookie Role Tampering (A01 Broken Access Control)
- **Fix:** Keep roles server-side in the session store; if claims travel in a cookie, sign them (HMAC) and verify before trusting any field.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Session Cookie Role Tampering"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

## Registration & Profile

### No Minimum Password Strength for New Academy Accounts
- **Severity:** Medium · **Test:** Weak Password Policy at Registration (A07 Authentication Failures)
- **Fix:** Enforce a modern password policy (length ≥ 12, breached-password screening) at registration and password change.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Weak Password Policy at Registration"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Mass Assignment in Registration Allows Role Escalation
- **Severity:** High · **Test:** Mass Assignment — Self-Appointed Instructor or Admin (A01 Broken Access Control)
- **Fix:** Whitelist assignable fields explicitly on registration; set the account role server-side only.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Mass Assignment — Self-Appointed Instructor or Admin"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Stored Cross-Site Scripting via Display Name
- **Severity:** High · **Test:** Stored XSS in Display Name (A03 Injection)
- **Fix:** Output-encode all user data at render time and validate name fields against a strict character whitelist.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Stored XSS in Display Name"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Missing CSRF Validation on Profile Update
- **Severity:** Medium · **Test:** CSRF on Profile Update (A01 Broken Access Control)
- **Fix:** Verify a per-session anti-CSRF token server-side on every state-changing request; reject requests that lack it.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("CSRF on Profile Update"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

## Course Catalogue & Search

### SQL Injection in Course Search Exposes Unpublished Courses
- **Severity:** High · **Test:** SQL Injection in Course Search Reveals Draft Courses (A03 Injection)
- **Fix:** Use parameterised queries for search filters; enforce the published-only condition server-side regardless of the search term.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("SQL Injection in Course Search Reveals Draft Courses"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Reflected Cross-Site Scripting in Course Search
- **Severity:** High · **Test:** Reflected XSS in Course Search (A03 Injection)
- **Fix:** Output-encode the reflected query and all result fields; add a Content-Security-Policy as defence in depth.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Reflected XSS in Course Search"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

## Enrollments & Payments

### Client-Supplied Price Trusted at Checkout (Price Tampering)
- **Severity:** Critical · **Test:** Checkout Price Tampering (A04 Insecure Design)
- **Fix:** Recompute the price server-side from the catalogue at checkout; ignore any client-supplied amount; reconcile payments against catalogue prices.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Checkout Price Tampering"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Multiple Coupons Stacked in a Single Order
- **Severity:** High · **Test:** Coupon Stacking Beyond the Intended Discount (A04 Insecure Design)
- **Fix:** Allow at most one coupon per order server-side; validate coupon combinations against the promotion's terms before applying any discount.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Coupon Stacking Beyond the Intended Discount"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Single-Use Coupon Accepted Multiple Times
- **Severity:** High · **Test:** Single-Use Coupon Reused (A04 Insecure Design)
- **Fix:** Enforce redemption limits server-side with an atomic check-and-mark at checkout; reject already-redeemed single-use codes.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Single-Use Coupon Reused"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Client-Supplied Bundle Total Trusted at Checkout
- **Severity:** High · **Test:** Bundle Total Tampering (A04 Insecure Design)
- **Fix:** Compute bundle prices server-side from the bundle definition; never accept a client-computed total.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Bundle Total Tampering"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Refunds Processed After Certificate Issuance
- **Severity:** High · **Test:** Refund Kept After Certificate Issued (A04 Insecure Design)
- **Fix:** Block refunds server-side once a certificate is issued (or revoke the certificate atomically with the refund); log refund-after-issue attempts.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Refund Kept After Certificate Issued"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

## Learning & Certificates

### Insecure Direct Object Reference on Enrollment Records
- **Severity:** High · **Test:** Enrollment IDOR — Another Student's Progress (A01 Broken Access Control)
- **Fix:** Authorise every enrolment read against the session user (the owner, or the course's instructor); return 404 for foreign enrolment ids.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Enrollment IDOR — Another Student's Progress"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Client-Supplied Progress Counter Trusted (Completion Forgery)
- **Severity:** High · **Test:** Progress Tampering — Completion Without Watching (A04 Insecure Design)
- **Fix:** Derive progress server-side from per-lesson completion records; ignore client-supplied progress values.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Progress Tampering — Completion Without Watching"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Certificates Issued Without Course Completion
- **Severity:** Critical · **Test:** Certificate Issued Without Completing the Course (A01 Broken Access Control)
- **Fix:** Verify completion server-side at issuance (progress derived from lesson records); bind each certificate to the earner and let verifiers check issuance state.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Certificate Issued Without Completing the Course"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

## Instructor Dashboard

### Insecure Direct Object Reference on Instructor Earnings
- **Severity:** High · **Test:** Instructor Earnings IDOR (A01 Broken Access Control)
- **Fix:** Authorise earnings views to the owning instructor (or finance admins); return 404 for foreign instructor ids.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Instructor Earnings IDOR"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Payouts Accepted Above the Instructor's Earnings Balance
- **Severity:** Critical · **Test:** Payout Request Exceeds Earnings Balance (A04 Insecure Design)
- **Fix:** Validate payout amounts server-side against the available balance; hold payouts for finance review above a threshold.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Payout Request Exceeds Earnings Balance"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Missing Ownership Check on Instructor Profile Editing (Impersonation)
- **Severity:** High · **Test:** Edit Another Instructor's Public Profile (A01 Broken Access Control)
- **Fix:** Require the session user to be the profile owner (or an admin) on every profile mutation; audit profile changes.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Edit Another Instructor's Public Profile"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

## Admin Panel

### Cross-Site Request Forgery on Admin User Deactivation
- **Severity:** High · **Test:** CSRF on Admin User Deactivation (A01 Broken Access Control)
- **Fix:** Verify anti-CSRF tokens on all admin mutations; require step-up re-authentication for account deactivation.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("CSRF on Admin User Deactivation"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

## Platform & API

### Predictable API Tokens and Missing User Scoping in Enrollment API
- **Severity:** Critical · **Test:** Predictable API Token & Unscoped Enrollment API (A07 Authentication Failures)
- **Fix:** Issue random, revocable API keys (hashed at rest); enforce per-user scoping on every API query.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Predictable API Token & Unscoped Enrollment API"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Debug Endpoint Exposes All User Credentials
- **Severity:** Critical · **Test:** Debug Endpoint Dumps User Passwords (A05 Security Misconfiguration)
- **Fix:** Remove debug endpoints from production builds; never store or display plaintext passwords; audit for other diagnostic routes.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Debug Endpoint Dumps User Passwords"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.
