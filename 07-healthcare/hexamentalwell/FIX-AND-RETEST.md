# HexaMentalWell — Fix & Retest Guide (LAB 69)

For every scored test: the secure implementation and the regression check that proves the fix. Use this after completing the lab offensively — fix the flaw in a copy, then re-run the same exploit: it must fail.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass (Critical)
- **Fix:** Replace the string-built login query with a parameterised lookup and compare a salted password hash.
- **Remediation (report):** Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.
- **Retest:** Repeat the original exploit — Submit an always-true SQL condition as the email; the string-built query returns a user row and a session is issued. It must now be blocked (no session issued, no foreign object served, no state changed), while the legitimate flow still works.

### No Brute-Force Protection on Login (No Rate Limiting or Lockout) (High)
- **Fix:** Throttle attempts per account/IP, lock after repeated failures and offer MFA.
- **Remediation (report):** Add progressive delays, account lockout, CAPTCHA and MFA; alert on credential-stuffing patterns.
- **Retest:** Repeat the original exploit — Submit 10+ failed logins for one account; every attempt is processed with no throttle, CAPTCHA or lockout. It must now be blocked (no session issued, no foreign object served, no state changed), while the legitimate flow still works.

### User Enumeration via Differential Authentication Responses (Medium)
- **Fix:** Use identical, generic responses for success/failure and for existing/non-existing accounts.
- **Remediation (report):** Return one generic message for all login/reset outcomes regardless of account existence.
- **Retest:** Repeat the original exploit — Probe 5+ distinct emails; existing and non-existing accounts produce visibly different responses. It must now be blocked (no session issued, no foreign object served, no state changed), while the legitimate flow still works.

### Active Default/Demo Credentials on a Staff Account (High)
- **Fix:** Delete demo accounts, rotate any shared passwords and enforce unique staff credentials.
- **Remediation (report):** Remove all demo accounts before launch; force unique, strong passwords for staff.
- **Retest:** Repeat the original exploit — Use the published demo therapist credentials to sign in; a full staff session is issued. It must now be blocked (no session issued, no foreign object served, no state changed), while the legitimate flow still works.

### Predictable Password Reset Token Allows Account Takeover (High)
- **Fix:** Issue cryptographically random, hashed, expiring, single-use reset tokens.
- **Remediation (report):** Generate reset tokens with a CSPRNG (≥128 bits), store hashed, expire quickly, single use.
- **Retest:** Repeat the original exploit — Derive the token MW-<id>-<id*331+77> for a victim id and reset their password without any email being sent. It must now be blocked (no session issued, no foreign object served, no state changed), while the legitimate flow still works.

### Privilege Escalation via Client-Controlled Role Cookie (Critical)
- **Fix:** Remove role decisions from cookies; resolve the role from the server-side session on every request.
- **Remediation (report):** Store roles server-side in the session record; never trust client-supplied role claims.
- **Retest:** Repeat the original exploit — Change the hx_role cookie to admin as a normal client and load the admin console. It must now be blocked (no session issued, no foreign object served, no state changed), while the legitimate flow still works.

## Registration & Profile

### Weak Password Policy Allows Single-Character Passwords (Medium)
- **Fix:** Enforce a minimum length and breached-password screening at registration and reset.
- **Remediation (report):** Require ≥10 characters and screen against known breached-password lists.
- **Retest:** Repeat the original exploit — Register with a 1-character password; the account is created. It must now be blocked (no session issued, no foreign object served, no state changed), while the legitimate flow still works.

### Mass Assignment in Registration Allows Privilege Escalation (High)
- **Fix:** Explicitly whitelist registration fields and assign roles server-side.
- **Remediation (report):** Whitelist bindable fields per endpoint; set role/plan server-side only.
- **Retest:** Repeat the original exploit — Add role=therapist to the registration POST; the created account carries the staff role. It must now be blocked (no session issued, no foreign object served, no state changed), while the legitimate flow still works.

### Stored Cross-Site Scripting via Display Name (High)
- **Fix:** HTML-encode the display name at every render point and deploy a CSP.
- **Remediation (report):** Context-encode all user data on output; add a Content-Security-Policy.
- **Retest:** Repeat the original exploit — Store a script payload as the display name; it is rendered unescaped to other users. It must now be blocked (no session issued, no foreign object served, no state changed), while the legitimate flow still works.

### Cross-Site Request Forgery on Profile Update (Medium)
- **Fix:** Add synchroniser CSRF tokens to forms and verify them server-side.
- **Remediation (report):** Require per-session CSRF tokens on all state-changing requests; verify Origin/Referer as defence in depth.
- **Retest:** Repeat the original exploit — Submit a profile change with the session cookie but no hx_origin marker; it is applied. It must now be blocked (no session issued, no foreign object served, no state changed), while the legitimate flow still works.

## Journals & Privacy

### Insecure Direct Object Reference Exposes Private Journals (Critical)
- **Fix:** Check journal.clientId against the session user (or their assigned therapist) before serving.
- **Remediation (report):** Enforce per-object ownership/assignment checks on every journal read.
- **Retest:** Repeat the original exploit — Request a journal whose clientId differs from the session user; the full private entry is served. It must now be blocked (no session issued, no foreign object served, no state changed), while the legitimate flow still works.

### Missing Assignment Check Lets Therapists Read Any Client Journal (High)
- **Fix:** Gate therapist journal access on client.therapistId === therapist.id.
- **Remediation (report):** Verify the client is assigned to the requesting therapist before serving journal content.
- **Retest:** Repeat the original exploit — As a therapist, read a journal whose client is assigned to a different therapist; it is served. It must now be blocked (no session issued, no foreign object served, no state changed), while the legitimate flow still works.

### Broken Access Control on Journal Export (Bulk IDOR) (Critical)
- **Fix:** Restrict export to the owner (or assigned therapist) and audit every export.
- **Remediation (report):** Authorise export requests against the session user; log and rate-limit exports.
- **Retest:** Repeat the original exploit — Request the export for another client id; their full journal text is returned. It must now be blocked (no session issued, no foreign object served, no state changed), while the legitimate flow still works.

### Support Tool Exposes Journal Content Without Authorisation (High)
- **Fix:** Require a support/admin role for the context endpoint and return only ticket-relevant metadata.
- **Remediation (report):** Restrict support-context endpoints to verified support roles and minimise the data returned.
- **Retest:** Repeat the original exploit — As a non-admin user, fetch the support context for another client; journal excerpts are returned. It must now be blocked (no session issued, no foreign object served, no state changed), while the legitimate flow still works.

## Mood Tracking

### Insecure Direct Object Reference in Mood History (High)
- **Fix:** Scope mood reads to the owner or their assigned therapist.
- **Remediation (report):** Default all mood queries to the session user; verify assignment for staff views.
- **Retest:** Repeat the original exploit — Request the mood list for another client id; their scores and notes are served. It must now be blocked (no session issued, no foreign object served, no state changed), while the legitimate flow still works.

### Broken Access Control Allows Forging Mood Entries for Other Clients (High)
- **Fix:** Always write moods under the session user’s id.
- **Remediation (report):** Derive record ownership from the session; ignore client-supplied owner ids.
- **Retest:** Repeat the original exploit — Submit a mood entry carrying another client’s id; it is stored in their record. It must now be blocked (no session issued, no foreign object served, no state changed), while the legitimate flow still works.

## Sessions & Booking

### Broken Access Control Exposes Therapy Session Notes (Critical)
- **Fix:** Restrict note reads to the session’s own therapist/admin with an explicit party check.
- **Remediation (report):** Serve notes only to the session’s therapist (and never the raw note text to unrelated users).
- **Retest:** Repeat the original exploit — Fetch notes for a session you are not a party to; the therapist’s private notes are returned. It must now be blocked (no session issued, no foreign object served, no state changed), while the legitimate flow still works.

### Booking Endpoint Trusts Client-Supplied Client ID (Medium)
- **Fix:** Take the booking client from the session; require staff role for on-behalf bookings.
- **Remediation (report):** Create bookings only for the authenticated user; staff booking on behalf needs a role check.
- **Retest:** Repeat the original exploit — Book with a clientId different from the session user; the session is created under the victim. It must now be blocked (no session issued, no foreign object served, no state changed), while the legitimate flow still works.

### Missing Authorisation on Session Cancellation (High)
- **Fix:** Add an ownership/party check to the cancel handler.
- **Remediation (report):** Verify the requester owns the session (or is its therapist/admin) before cancelling.
- **Retest:** Repeat the original exploit — Cancel a session owned by another client; its status becomes cancelled. It must now be blocked (no session issued, no foreign object served, no state changed), while the legitimate flow still works.

## Payments

### Payment Amount Tampering — Client-Supplied Price Trusted (High)
- **Fix:** Ignore posted amounts; charge the session’s stored price via the provider and verify the webhook.
- **Remediation (report):** Compute payable amounts server-side; reconcile with the payment provider before marking paid.
- **Retest:** Repeat the original exploit — Submit a payment far below the session price; the session is recorded as paid in full. It must now be blocked (no session issued, no foreign object served, no state changed), while the legitimate flow still works.

### Unauthenticated Payment Confirmation Allows Billing Bypass (High)
- **Fix:** Remove the endpoint or require a valid provider signature before marking paid.
- **Remediation (report):** Verify signed webhooks from the payment provider; never expose manual mark-paid routes.
- **Retest:** Repeat the original exploit — Call the mark-paid endpoint directly; the session becomes paid with no payment. It must now be blocked (no session issued, no foreign object served, no state changed), while the legitimate flow still works.

## Therapist Directory

### SQL Injection in Search Returns Entire User Table (Critical)
- **Fix:** Parameterise the search query and never select password columns for display.
- **Remediation (report):** Parameterise all queries; apply least-privilege DB accounts and output minimisation.
- **Retest:** Repeat the original exploit — Inject an always-true condition into the search; all user rows are returned. It must now be blocked (no session issued, no foreign object served, no state changed), while the legitimate flow still works.

### Reflected Cross-Site Scripting in Search (Medium)
- **Fix:** HTML-encode the search term on reflection.
- **Remediation (report):** Encode reflected values; add CSP and X-Content-Type-Options headers.
- **Retest:** Repeat the original exploit — Submit a script payload as the search term; it is reflected unescaped in the response. It must now be blocked (no session issued, no foreign object served, no state changed), while the legitimate flow still works.

## Support & Admin

### Cross-Site Request Forgery on Admin Deactivation (State-Changing GET) (High)
- **Fix:** Convert deactivation to a token-protected POST and verify Origin/Referer.
- **Remediation (report):** Make admin actions POST-only with CSRF tokens; require step-up auth for deactivation.
- **Retest:** Repeat the original exploit — Trigger the deactivation GET with a cross-site Referer under an admin session; the target account is deactivated. It must now be blocked (no session issued, no foreign object served, no state changed), while the legitimate flow still works.

## Platform & API

### Debug Endpoint Exposes All User Credentials Without Authentication (Critical)
- **Fix:** Delete the debug endpoint from the production build.
- **Remediation (report):** Remove debug endpoints from production builds; gate diagnostics behind admin auth and network restrictions.
- **Retest:** Repeat the original exploit — Fetch /api/debug without any session; full user records including passwords are returned. It must now be blocked (no session issued, no foreign object served, no state changed), while the legitimate flow still works.

### Predictable API Tokens Derived from Email Addresses (High)
- **Fix:** Replace derived tokens with random, hashed, revocable API keys.
- **Remediation (report):** Issue random API tokens, store only hashes, support revocation and rotation.
- **Retest:** Repeat the original exploit — Present mhw_+base64(victim email) as the Bearer token; the API authenticates as the victim. It must now be blocked (no session issued, no foreign object served, no state changed), while the legitimate flow still works.
