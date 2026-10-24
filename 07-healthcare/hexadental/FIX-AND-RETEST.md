# HexaDental — Fix & Retest

For every scored test: the secure implementation that removes the flaw, and the regression check that proves it stays removed. Retest method: re-run the original exploit from PRACTICE-GUIDE.md against the hardened build — it must fail, and the corresponding Mission Board test must no longer flip.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass (Critical)
- **Fix:** Use parameterised queries / prepared statements everywhere and validate input server-side.
- **Secure implementation:** Apply the fix server-side (never only in the UI), keep the legitimate workflow working for authorised users, and log the blocked attempt.
- **Regression test:** Repeat the exploit for "SQL injection login bypass" exactly as practised. Expected after the fix: the attempt is rejected (403/validation error or safe generic response), no state changes, and the test does not complete.

### Missing Brute-Force Protection on Login (High)
- **Fix:** Add rate limiting, progressive delays, account lockout and MFA for staff accounts.
- **Secure implementation:** Apply the fix server-side (never only in the UI), keep the legitimate workflow working for authorised users, and log the blocked attempt.
- **Regression test:** Repeat the exploit for "Brute force — no rate limit or lockout" exactly as practised. Expected after the fix: the attempt is rejected (403/validation error or safe generic response), no state changes, and the test does not complete.

### Account Enumeration via Authentication Responses (Medium)
- **Fix:** Return one generic message for all login and reset outcomes, regardless of account existence.
- **Secure implementation:** Apply the fix server-side (never only in the UI), keep the legitimate workflow working for authorised users, and log the blocked attempt.
- **Regression test:** Repeat the exploit for "User enumeration via differing responses" exactly as practised. Expected after the fix: the attempt is rejected (403/validation error or safe generic response), no state changes, and the test does not complete.

### Default Credentials on Administrator Account (Critical)
- **Fix:** Force a unique strong password at first setup and disable or rename default accounts.
- **Secure implementation:** Apply the fix server-side (never only in the UI), keep the legitimate workflow working for authorised users, and log the blocked attempt.
- **Regression test:** Repeat the exploit for "Default administrator credentials" exactly as practised. Expected after the fix: the attempt is rejected (403/validation error or safe generic response), no state changes, and the test does not complete.

### Predictable Password Reset Tokens Allow Account Takeover (High)
- **Fix:** Generate reset tokens with a CSPRNG (≥128 bits), expire them quickly and make them single-use.
- **Secure implementation:** Apply the fix server-side (never only in the UI), keep the legitimate workflow working for authorised users, and log the blocked attempt.
- **Regression test:** Repeat the exploit for "Predictable password-reset token" exactly as practised. Expected after the fix: the attempt is rejected (403/validation error or safe generic response), no state changes, and the test does not complete.

### Client-Controlled Role Cookie Used for Authorization (High)
- **Fix:** Store roles only in server-side session state and re-check them on every privileged request.
- **Secure implementation:** Apply the fix server-side (never only in the UI), keep the legitimate workflow working for authorised users, and log the blocked attempt.
- **Regression test:** Repeat the exploit for "Session role cookie tampering" exactly as practised. Expected after the fix: the attempt is rejected (403/validation error or safe generic response), no state changes, and the test does not complete.

## Registration & Profile

### No Minimum Password Requirements on Registration (Medium)
- **Fix:** Enforce a minimum length (12+), block known-breached passwords and encourage passphrases.
- **Secure implementation:** Apply the fix server-side (never only in the UI), keep the legitimate workflow working for authorised users, and log the blocked attempt.
- **Regression test:** Repeat the exploit for "Weak password policy on registration" exactly as practised. Expected after the fix: the attempt is rejected (403/validation error or safe generic response), no state changes, and the test does not complete.

### Mass Assignment Allows Privilege Escalation at Registration (High)
- **Fix:** Whitelist assignable fields per endpoint; set role and account flags server-side only.
- **Secure implementation:** Apply the fix server-side (never only in the UI), keep the legitimate workflow working for authorised users, and log the blocked attempt.
- **Regression test:** Repeat the exploit for "Mass assignment — self-assigned staff role" exactly as practised. Expected after the fix: the attempt is rejected (403/validation error or safe generic response), no state changes, and the test does not complete.

### Stored Cross-Site Scripting via Display Name (High)
- **Fix:** Output-encode all user data in templates and deploy a restrictive Content-Security-Policy.
- **Secure implementation:** Apply the fix server-side (never only in the UI), keep the legitimate workflow working for authorised users, and log the blocked attempt.
- **Regression test:** Repeat the exploit for "Stored XSS in display name" exactly as practised. Expected after the fix: the attempt is rejected (403/validation error or safe generic response), no state changes, and the test does not complete.

### Missing CSRF Validation on Profile Update (Medium)
- **Fix:** Issue per-session CSRF tokens and verify them on every state-changing request.
- **Secure implementation:** Apply the fix server-side (never only in the UI), keep the legitimate workflow working for authorised users, and log the blocked attempt.
- **Regression test:** Repeat the exploit for "CSRF on profile update" exactly as practised. Expected after the fix: the attempt is rejected (403/validation error or safe generic response), no state changes, and the test does not complete.

## Appointments

### Insecure Direct Object Reference on Appointment Records (High)
- **Fix:** Check object ownership server-side on every read and write.
- **Secure implementation:** Apply the fix server-side (never only in the UI), keep the legitimate workflow working for authorised users, and log the blocked attempt.
- **Regression test:** Repeat the exploit for "Appointment IDOR — view another patient's booking" exactly as practised. Expected after the fix: the attempt is rejected (403/validation error or safe generic response), no state changes, and the test does not complete.

### Missing Slot-Conflict Check Allows Double Booking (Medium)
- **Fix:** Enforce slot uniqueness transactionally on the server at booking time.
- **Secure implementation:** Apply the fix server-side (never only in the UI), keep the legitimate workflow working for authorised users, and log the blocked attempt.
- **Regression test:** Repeat the exploit for "Double-booking a taken slot" exactly as practised. Expected after the fix: the attempt is rejected (403/validation error or safe generic response), no state changes, and the test does not complete.

### Insecure Direct Object Reference on Appointment Cancellation (High)
- **Fix:** Verify the session user owns (or staff-manages) the appointment before cancelling.
- **Secure implementation:** Apply the fix server-side (never only in the UI), keep the legitimate workflow working for authorised users, and log the blocked attempt.
- **Regression test:** Repeat the exploit for "Cancel another patient's appointment" exactly as practised. Expected after the fix: the attempt is rejected (403/validation error or safe generic response), no state changes, and the test does not complete.

## Treatment Plans

### Insecure Direct Object Reference on Treatment Plans (High)
- **Fix:** Scope every plan query to the session user (or their treating clinician).
- **Secure implementation:** Apply the fix server-side (never only in the UI), keep the legitimate workflow working for authorised users, and log the blocked attempt.
- **Regression test:** Repeat the exploit for "Treatment plan IDOR — another patient's plan and costs" exactly as practised. Expected after the fix: the attempt is rejected (403/validation error or safe generic response), no state changes, and the test does not complete.

### Client-Supplied Prices Trusted for Treatment Plan Items (High)
- **Fix:** Resolve prices from the server-side catalogue by item id; ignore client-sent amounts.
- **Secure implementation:** Apply the fix server-side (never only in the UI), keep the legitimate workflow working for authorised users, and log the blocked attempt.
- **Regression test:** Repeat the exploit for "Treatment cost tampering via client-supplied item price" exactly as practised. Expected after the fix: the attempt is rejected (403/validation error or safe generic response), no state changes, and the test does not complete.

### Missing Role Check on Treatment Plan Approval (High)
- **Fix:** Require the dentist role server-side for plan approval transitions.
- **Secure implementation:** Apply the fix server-side (never only in the UI), keep the legitimate workflow working for authorised users, and log the blocked attempt.
- **Regression test:** Repeat the exploit for "Patient approves their own treatment plan" exactly as practised. Expected after the fix: the attempt is rejected (403/validation error or safe generic response), no state changes, and the test does not complete.

### Missing Role Check on Treatment Completion (High)
- **Fix:** Restrict completion to treating clinicians and verify plan state before transitioning.
- **Secure implementation:** Apply the fix server-side (never only in the UI), keep the legitimate workflow working for authorised users, and log the blocked attempt.
- **Regression test:** Repeat the exploit for "Patient marks their own treatment complete" exactly as practised. Expected after the fix: the attempt is rejected (403/validation error or safe generic response), no state changes, and the test does not complete.

## Records & X-rays

### Insecure Direct Object Reference on Clinical Records (Critical)
- **Fix:** Enforce patient/clinician ownership checks on every record access.
- **Secure implementation:** Apply the fix server-side (never only in the UI), keep the legitimate workflow working for authorised users, and log the blocked attempt.
- **Regression test:** Repeat the exploit for "Clinical record IDOR — another patient's X-ray record" exactly as practised. Expected after the fix: the attempt is rejected (403/validation error or safe generic response), no state changes, and the test does not complete.

### Path Traversal in File Download (High)
- **Fix:** Resolve and confine paths to the records directory; reject separators and dot segments.
- **Secure implementation:** Apply the fix server-side (never only in the UI), keep the legitimate workflow working for authorised users, and log the blocked attempt.
- **Regression test:** Repeat the exploit for "Path traversal on record download" exactly as practised. Expected after the fix: the attempt is rejected (403/validation error or safe generic response), no state changes, and the test does not complete.

## Invoices & Payment Plans

### Insecure Direct Object Reference on Invoices (High)
- **Fix:** Scope invoice access to the owning patient or billing staff.
- **Secure implementation:** Apply the fix server-side (never only in the UI), keep the legitimate workflow working for authorised users, and log the blocked attempt.
- **Regression test:** Repeat the exploit for "Invoice IDOR — another patient's bill" exactly as practised. Expected after the fix: the attempt is rejected (403/validation error or safe generic response), no state changes, and the test does not complete.

### Payment Amount Tampering Settles Invoices Below Total (Critical)
- **Fix:** Only mark an invoice paid when cumulative verified payments reach the server-side total.
- **Secure implementation:** Apply the fix server-side (never only in the UI), keep the legitimate workflow working for authorised users, and log the blocked attempt.
- **Regression test:** Repeat the exploit for "Invoice settled for $1 via payment amount tampering" exactly as practised. Expected after the fix: the attempt is rejected (403/validation error or safe generic response), no state changes, and the test does not complete.

### Server Fails to Enforce Payment Plan Terms Policy (Medium)
- **Fix:** Validate months/APR against policy server-side on plan creation.
- **Secure implementation:** Apply the fix server-side (never only in the UI), keep the legitimate workflow working for authorised users, and log the blocked attempt.
- **Regression test:** Repeat the exploit for "Payment plan terms forgery — 60 months at 0% APR" exactly as practised. Expected after the fix: the attempt is rejected (403/validation error or safe generic response), no state changes, and the test does not complete.

## Admin Panel

### Missing Authorization on Admin Invoices Report (High)
- **Fix:** Apply a central admin-role middleware to all /admin routes.
- **Secure implementation:** Apply the fix server-side (never only in the UI), keep the legitimate workflow working for authorised users, and log the blocked attempt.
- **Regression test:** Repeat the exploit for "Broken access control — all-invoices admin report open to any user" exactly as practised. Expected after the fix: the attempt is rejected (403/validation error or safe generic response), no state changes, and the test does not complete.

### Missing CSRF Validation on Admin User Deactivation (Medium)
- **Fix:** Verify per-session CSRF tokens on all admin state-changing endpoints.
- **Secure implementation:** Apply the fix server-side (never only in the UI), keep the legitimate workflow working for authorised users, and log the blocked attempt.
- **Regression test:** Repeat the exploit for "CSRF on admin user deactivation" exactly as practised. Expected after the fix: the attempt is rejected (403/validation error or safe generic response), no state changes, and the test does not complete.

## Platform & API

### Unauthenticated Debug Endpoint Exposes All Credentials (Critical)
- **Fix:** Remove debug endpoints from production; require admin auth and never return passwords.
- **Secure implementation:** Apply the fix server-side (never only in the UI), keep the legitimate workflow working for authorised users, and log the blocked attempt.
- **Regression test:** Repeat the exploit for "Unauthenticated debug endpoint dumps all accounts" exactly as practised. Expected after the fix: the attempt is rejected (403/validation error or safe generic response), no state changes, and the test does not complete.

### Predictable API Tokens Derived from Email Address (High)
- **Fix:** Issue random opaque tokens server-side, store hashes, and support revocation.
- **Secure implementation:** Apply the fix server-side (never only in the UI), keep the legitimate workflow working for authorised users, and log the blocked attempt.
- **Regression test:** Repeat the exploit for "Forgeable API token — base64 of email" exactly as practised. Expected after the fix: the attempt is rejected (403/validation error or safe generic response), no state changes, and the test does not complete.
