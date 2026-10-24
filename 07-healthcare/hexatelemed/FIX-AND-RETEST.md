# HexaTelemed — Fix & Retest (LAB 66)

For every scored test: the secure implementation pattern and the regression check that proves the fix. A fix passes retest only when the original exploit stops working AND the legitimate flow still works.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass
- **Severity:** Critical
- **Fix:** Use parameterised queries everywhere; never build SQL by string concatenation.
- **Retest:** Re-run the original exploit from the Practice Guide — it must fail (no session granted, no object served, no state changed) — then complete the legitimate user journey for this feature and confirm it still works end to end.

### Missing Brute-Force Protection on Login
- **Severity:** High
- **Fix:** Rate-limit login attempts, add progressive delays and lockout, and alert on repeated failures.
- **Retest:** Re-run the original exploit from the Practice Guide — it must fail (no session granted, no object served, no state changed) — then complete the legitimate user journey for this feature and confirm it still works end to end.

### Account Enumeration Through Differential Auth Responses
- **Severity:** Medium
- **Fix:** Return one generic message for all login and reset responses, regardless of account existence.
- **Retest:** Re-run the original exploit from the Practice Guide — it must fail (no session granted, no object served, no state changed) — then complete the legitimate user journey for this feature and confirm it still works end to end.

### Default Administrator Credentials in Production
- **Severity:** Critical
- **Fix:** Force a password change on first login, disable demo accounts, and scan for default credentials before launch.
- **Retest:** Re-run the original exploit from the Practice Guide — it must fail (no session granted, no object served, no state changed) — then complete the legitimate user journey for this feature and confirm it still works end to end.

### Predictable Password Reset Tokens
- **Severity:** High
- **Fix:** Generate reset tokens with a CSPRNG (≥128 bits), expire them quickly, and invalidate after use.
- **Retest:** Re-run the original exploit from the Practice Guide — it must fail (no session granted, no object served, no state changed) — then complete the legitimate user journey for this feature and confirm it still works end to end.

### Client-Side Role Cookie Trusted for Authorization
- **Severity:** High
- **Fix:** Derive roles from the server-side session record on every request; never trust client-supplied role claims.
- **Retest:** Re-run the original exploit from the Practice Guide — it must fail (no session granted, no object served, no state changed) — then complete the legitimate user journey for this feature and confirm it still works end to end.

## Registration & Profile

### No Minimum Password Strength Enforced
- **Severity:** Medium
- **Fix:** Enforce a minimum length (≥10) and block common passwords at registration and reset.
- **Retest:** Re-run the original exploit from the Practice Guide — it must fail (no session granted, no object served, no state changed) — then complete the legitimate user journey for this feature and confirm it still works end to end.

### Mass Assignment Allows Privilege Escalation at Registration
- **Severity:** High
- **Fix:** Whitelist bindable fields per endpoint; set role server-side only.
- **Retest:** Re-run the original exploit from the Practice Guide — it must fail (no session granted, no object served, no state changed) — then complete the legitimate user journey for this feature and confirm it still works end to end.

### Stored Cross-Site Scripting via Display Name
- **Severity:** High
- **Fix:** Escape all user output by context and add a Content-Security-Policy header.
- **Retest:** Re-run the original exploit from the Practice Guide — it must fail (no session granted, no object served, no state changed) — then complete the legitimate user journey for this feature and confirm it still works end to end.

### Missing CSRF Verification on Profile Update
- **Severity:** Medium
- **Fix:** Issue per-session CSRF tokens and verify them on every state-changing request.
- **Retest:** Re-run the original exploit from the Practice Guide — it must fail (no session granted, no object served, no state changed) — then complete the legitimate user journey for this feature and confirm it still works end to end.

## Doctors & Availability

### SQL Injection in Doctor Search
- **Severity:** High
- **Fix:** Parameterise search queries and validate filter input against an allow-list.
- **Retest:** Re-run the original exploit from the Practice Guide — it must fail (no session granted, no object served, no state changed) — then complete the legitimate user journey for this feature and confirm it still works end to end.

### Reflected Cross-Site Scripting in Search
- **Severity:** Medium
- **Fix:** Contextually escape reflected values and deploy a Content-Security-Policy.
- **Retest:** Re-run the original exploit from the Practice Guide — it must fail (no session granted, no object served, no state changed) — then complete the legitimate user journey for this feature and confirm it still works end to end.

### Missing Authorization on Doctor Availability Management
- **Severity:** High
- **Fix:** Restrict availability changes to the owning doctor or admins, verified server-side.
- **Retest:** Re-run the original exploit from the Practice Guide — it must fail (no session granted, no object served, no state changed) — then complete the legitimate user journey for this feature and confirm it still works end to end.

## Appointments & Sessions

### Client-Side Price Tampering in Consultation Booking
- **Severity:** High
- **Fix:** Ignore client-supplied prices; always price from server-side catalogue data.
- **Retest:** Re-run the original exploit from the Practice Guide — it must fail (no session granted, no object served, no state changed) — then complete the legitimate user journey for this feature and confirm it still works end to end.

### Insecure Direct Object Reference on Appointments
- **Severity:** High
- **Fix:** Check ownership (or treating-doctor relationship) on every object read.
- **Retest:** Re-run the original exploit from the Practice Guide — it must fail (no session granted, no object served, no state changed) — then complete the legitimate user journey for this feature and confirm it still works end to end.

### Guessable Video Session Links Without Participant Checks
- **Severity:** Critical
- **Fix:** Use unguessable room tokens (≥128-bit random) and verify the requester is a session participant.
- **Retest:** Re-run the original exploit from the Practice Guide — it must fail (no session granted, no object served, no state changed) — then complete the legitimate user journey for this feature and confirm it still works end to end.

### Missing Ownership Check on Follow-up Creation
- **Severity:** Medium
- **Fix:** Verify the requester owns (or treats) the parent appointment before creating follow-ups.
- **Retest:** Re-run the original exploit from the Practice Guide — it must fail (no session granted, no object served, no state changed) — then complete the legitimate user journey for this feature and confirm it still works end to end.

### Missing Authorization on Appointment Cancellation
- **Severity:** Medium
- **Fix:** Restrict cancellation to the booking patient, the treating doctor, or admins.
- **Retest:** Re-run the original exploit from the Practice Guide — it must fail (no session granted, no object served, no state changed) — then complete the legitimate user journey for this feature and confirm it still works end to end.

## Consultation Notes

### Insecure Direct Object Reference on Consultation Notes
- **Severity:** Critical
- **Fix:** Authorize notes access to the patient and treating doctor only, verified server-side.
- **Retest:** Re-run the original exploit from the Practice Guide — it must fail (no session granted, no object served, no state changed) — then complete the legitimate user journey for this feature and confirm it still works end to end.

### Missing Role Check on Consultation Note Creation
- **Severity:** High
- **Fix:** Allow note creation only for the treating doctor; log author identity server-side.
- **Retest:** Re-run the original exploit from the Practice Guide — it must fail (no session granted, no object served, no state changed) — then complete the legitimate user journey for this feature and confirm it still works end to end.

## Prescriptions

### Prescription Creation Allowed for Non-Doctors
- **Severity:** Critical
- **Fix:** Restrict prescription creation to verified doctor accounts, tied to a completed consultation.
- **Retest:** Re-run the original exploit from the Practice Guide — it must fail (no session granted, no object served, no state changed) — then complete the legitimate user journey for this feature and confirm it still works end to end.

### Insecure Direct Object Reference on Prescriptions
- **Severity:** High
- **Fix:** Check that the requester is the prescription’s patient or issuing doctor on every read.
- **Retest:** Re-run the original exploit from the Practice Guide — it must fail (no session granted, no object served, no state changed) — then complete the legitimate user journey for this feature and confirm it still works end to end.

### Prescription Refill Limit Not Enforced
- **Severity:** High
- **Fix:** Check and decrement the refill allowance atomically on the server before dispensing.
- **Retest:** Re-run the original exploit from the Practice Guide — it must fail (no session granted, no object served, no state changed) — then complete the legitimate user journey for this feature and confirm it still works end to end.

## Admin Panel

### Broken Access Control on Admin Panel
- **Severity:** Critical
- **Fix:** Enforce admin role checks server-side on every admin route and API.
- **Retest:** Re-run the original exploit from the Practice Guide — it must fail (no session granted, no object served, no state changed) — then complete the legitimate user journey for this feature and confirm it still works end to end.

## Platform & API

### Weak API Authentication Accepts Base64(Email) as Token
- **Severity:** High
- **Fix:** Issue high-entropy random API tokens, store hashes, and reject any derived credential.
- **Retest:** Re-run the original exploit from the Practice Guide — it must fail (no session granted, no object served, no state changed) — then complete the legitimate user journey for this feature and confirm it still works end to end.

### Exposed Debug Endpoint Leaks All User Credentials
- **Severity:** Critical
- **Fix:** Remove debug endpoints from production builds and gate diagnostics behind admin auth and IP allow-lists.
- **Retest:** Re-run the original exploit from the Practice Guide — it must fail (no session granted, no object served, no state changed) — then complete the legitimate user journey for this feature and confirm it still works end to end.
