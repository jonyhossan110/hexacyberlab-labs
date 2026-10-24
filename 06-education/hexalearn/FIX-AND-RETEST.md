# HexaLearn — Fix & Retest Guide (LAB 51)

For every scored test: the secure implementation pattern and the regression check that proves the fix.

## Login & Authentication

### SQL Injection in Login Form (Authentication Bypass) (Critical)
- **Fix:** Use parameterised queries/prepared statements everywhere; never concatenate user input into SQL.
- **Retest:** Repeat the original exploit from the Practice Guide — it must now fail (no test pass, no effect), while the legitimate flow still works.

### Missing Brute-Force Protection on Login (High)
- **Fix:** Add progressive rate limiting, lockout/backoff and breached-password checks on authentication endpoints.
- **Retest:** Repeat the original exploit from the Practice Guide — it must now fail (no test pass, no effect), while the legitimate flow still works.

### Account Enumeration via Differential Responses (Medium)
- **Fix:** Return identical, generic messages for existing and non-existing accounts on login and password-reset flows.
- **Retest:** Repeat the original exploit from the Practice Guide — it must now fail (no test pass, no effect), while the legitimate flow still works.

### Default/Demo Credentials Accepted (High)
- **Fix:** Remove demo accounts from production or force unique strong passwords; never publish credentials on the login page.
- **Retest:** Repeat the original exploit from the Practice Guide — it must now fail (no test pass, no effect), while the legitimate flow still works.

### Predictable Password Reset Token (Critical)
- **Fix:** Generate reset tokens from a CSPRNG (≥128 bits), store hashed, expire quickly and invalidate after use.
- **Retest:** Repeat the original exploit from the Practice Guide — it must now fail (no test pass, no effect), while the legitimate flow still works.

### Role Stored in Client-Side Cookie (Privilege Escalation) (Critical)
- **Fix:** Keep roles in the server-side session only; never trust client-supplied role claims.
- **Retest:** Repeat the original exploit from the Practice Guide — it must now fail (no test pass, no effect), while the legitimate flow still works.

## Registration & Profile

### No Minimum Password Strength Enforced (Medium)
- **Fix:** Enforce ≥10–12 character passwords and screen against known-breached password lists.
- **Retest:** Repeat the original exploit from the Practice Guide — it must now fail (no test pass, no effect), while the legitimate flow still works.

### Mass Assignment in Registration (Role/Credit) (Critical)
- **Fix:** Whitelist bindable fields per endpoint; set role and balances server-side only.
- **Retest:** Repeat the original exploit from the Practice Guide — it must now fail (no test pass, no effect), while the legitimate flow still works.

### Stored Cross-Site Scripting via Display Name (High)
- **Fix:** Context-encode all user output and validate input; add a Content-Security-Policy as defence in depth.
- **Retest:** Repeat the original exploit from the Practice Guide — it must now fail (no test pass, no effect), while the legitimate flow still works.

### Cross-Site Request Forgery on Profile Update (Medium)
- **Fix:** Require per-session anti-CSRF tokens on all state-changing requests and validate Origin/Referer.
- **Retest:** Repeat the original exploit from the Practice Guide — it must now fail (no test pass, no effect), while the legitimate flow still works.

## Search & Catalog

### SQL Injection in Course Search (High)
- **Fix:** Parameterise all queries including LIKE searches; escape wildcards in user search terms.
- **Retest:** Repeat the original exploit from the Practice Guide — it must now fail (no test pass, no effect), while the legitimate flow still works.

### Reflected Cross-Site Scripting in Search (Medium)
- **Fix:** Encode all reflected values on output; validate input length/character set.
- **Retest:** Repeat the original exploit from the Practice Guide — it must now fail (no test pass, no effect), while the legitimate flow still works.

## Enrollment & Payments

### Client-Side Price Tampering in Enrollment (Critical)
- **Fix:** Ignore client-supplied prices; always price from the server-side catalogue at checkout.
- **Retest:** Repeat the original exploit from the Practice Guide — it must now fail (no test pass, no effect), while the legitimate flow still works.

### Negative Amount Accepted in Enrollment (Credit Minting) (Critical)
- **Fix:** Validate amounts server-side (> 0, equals catalogue price) before applying balance changes.
- **Retest:** Repeat the original exploit from the Practice Guide — it must now fail (no test pass, no effect), while the legitimate flow still works.

### Coupon Reuse — Single-Use Restriction Not Enforced (High)
- **Fix:** Check and record coupon redemption per user atomically before applying any discount.
- **Retest:** Repeat the original exploit from the Practice Guide — it must now fail (no test pass, no effect), while the legitimate flow still works.

## Lessons & Progress

### Lesson Completion Forgery (No Enrollment Check) (High)
- **Fix:** Verify an active enrollment and lesson sequence server-side before recording progress.
- **Retest:** Repeat the original exploit from the Practice Guide — it must now fail (no test pass, no effect), while the legitimate flow still works.

### Insecure Direct Object Reference on Student Progress (High)
- **Fix:** Authorise every object access against the session user; use unguessable identifiers as defence in depth.
- **Retest:** Repeat the original exploit from the Practice Guide — it must now fail (no test pass, no effect), while the legitimate flow still works.

## Quizzes & Scores

### Quiz Answer Key Exposed in API Response (High)
- **Fix:** Never include correct answers in client payloads; grade submissions server-side.
- **Retest:** Repeat the original exploit from the Practice Guide — it must now fail (no test pass, no effect), while the legitimate flow still works.

### Client-Side Quiz Score Trusted by Server (High)
- **Fix:** Compute scores server-side from submitted answers; ignore client-supplied result fields.
- **Retest:** Repeat the original exploit from the Practice Guide — it must now fail (no test pass, no effect), while the legitimate flow still works.

## Course Certificates

### Certificate Issuance Without Completion Verification (High)
- **Fix:** Verify 100% lesson completion and a passing quiz server-side before issuing any certificate.
- **Retest:** Repeat the original exploit from the Practice Guide — it must now fail (no test pass, no effect), while the legitimate flow still works.

### Insecure Direct Object Reference on Certificates (Medium)
- **Fix:** Check certificate ownership (or a signed share token) before rendering; avoid sequential ids.
- **Retest:** Repeat the original exploit from the Practice Guide — it must now fail (no test pass, no effect), while the legitimate flow still works.

## Reviews

### Stored Cross-Site Scripting in Course Reviews (High)
- **Fix:** Encode review text on output; sanitise/stop HTML in user content; deploy CSP.
- **Retest:** Repeat the original exploit from the Practice Guide — it must now fail (no test pass, no effect), while the legitimate flow still works.

## Instructor Payouts

### Payout Amount Not Validated Against Earnings (Critical)
- **Fix:** Validate payout requests against the server-side earnings balance and hold amounts atomically.
- **Retest:** Repeat the original exploit from the Practice Guide — it must now fail (no test pass, no effect), while the legitimate flow still works.

### Insecure Direct Object Reference on Instructor Payouts (Medium)
- **Fix:** Restrict payout pages to the owning instructor (or admins) with a server-side ownership check.
- **Retest:** Repeat the original exploit from the Practice Guide — it must now fail (no test pass, no effect), while the legitimate flow still works.

## Admin & Platform

### Cross-Site Request Forgery on Admin Course Deletion (High)
- **Fix:** Anti-CSRF tokens on all admin actions; validate Origin/Referer; re-authenticate for destructive actions.
- **Retest:** Repeat the original exploit from the Practice Guide — it must now fail (no test pass, no effect), while the legitimate flow still works.

### Predictable API Token (Base64 of Email) (Critical)
- **Fix:** Issue random, high-entropy API tokens server-side; store hashed; allow revocation.
- **Retest:** Repeat the original exploit from the Practice Guide — it must now fail (no test pass, no effect), while the legitimate flow still works.
