# HexaEventTrip — Fix & Retest (LAB 79)

For every scored test: the secure implementation (the fix a developer would ship for a real client) and the regression test that proves the exploit now fails while the legitimate flow still works.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass
- **Severity:** Critical
- **Fix:** Use parameterised queries everywhere; never concatenate user input into SQL.
- **Retest:** repeat the original exploit steps from the Practice Guide — it must now fail (no bypass, no data leak, no state change) — then repeat the equivalent legitimate user flow and confirm it still succeeds.

### Missing Brute-Force Protection on Login
- **Severity:** High
- **Fix:** Add rate limiting, progressive delays and account lockout with alerting on the login endpoint.
- **Retest:** repeat the original exploit steps from the Practice Guide — it must now fail (no bypass, no data leak, no state change) — then repeat the equivalent legitimate user flow and confirm it still succeeds.

### Account Enumeration via Differential Authentication Responses
- **Severity:** Medium
- **Fix:** Return one generic message for login and password-reset regardless of whether the account exists.
- **Retest:** repeat the original exploit steps from the Practice Guide — it must now fail (no bypass, no data leak, no state change) — then repeat the equivalent legitimate user flow and confirm it still succeeds.

### Default Administrative Credentials Exposed and Active
- **Severity:** Critical
- **Fix:** Remove demo accounts and default passwords before production; force unique credentials per admin.
- **Retest:** repeat the original exploit steps from the Practice Guide — it must now fail (no bypass, no data leak, no state change) — then repeat the equivalent legitimate user flow and confirm it still succeeds.

### Predictable Password Reset Tokens Allow Account Takeover
- **Severity:** High
- **Fix:** Generate reset tokens with a CSPRNG (at least 128 bits), store hashed, single-use, short expiry.
- **Retest:** repeat the original exploit steps from the Practice Guide — it must now fail (no bypass, no data leak, no state change) — then repeat the equivalent legitimate user flow and confirm it still succeeds.

### Privilege Escalation via Client-Controlled Role Cookie
- **Severity:** Critical
- **Fix:** Store roles only in server-side session records; ignore role claims from the client.
- **Retest:** repeat the original exploit steps from the Practice Guide — it must now fail (no bypass, no data leak, no state change) — then repeat the equivalent legitimate user flow and confirm it still succeeds.

## Registration & Profile

### No Password Policy on Registration
- **Severity:** Medium
- **Fix:** Enforce a minimum length (12+) and check passwords against known-breached lists.
- **Retest:** repeat the original exploit steps from the Practice Guide — it must now fail (no bypass, no data leak, no state change) — then repeat the equivalent legitimate user flow and confirm it still succeeds.

### Mass Assignment in Registration Allows Role/Credit Injection
- **Severity:** High
- **Fix:** Whitelist bindable fields on every endpoint; assign roles and balances server-side only.
- **Retest:** repeat the original exploit steps from the Practice Guide — it must now fail (no bypass, no data leak, no state change) — then repeat the equivalent legitimate user flow and confirm it still succeeds.

### Stored Cross-Site Scripting via Display Name
- **Severity:** High
- **Fix:** Context-aware output encoding on all user data; add a Content-Security-Policy.
- **Retest:** repeat the original exploit steps from the Practice Guide — it must now fail (no bypass, no data leak, no state change) — then repeat the equivalent legitimate user flow and confirm it still succeeds.

### Missing CSRF Protection on Profile Update
- **Severity:** Medium
- **Fix:** Require and verify a per-session CSRF token on every state-changing request.
- **Retest:** repeat the original exploit steps from the Practice Guide — it must now fail (no bypass, no data leak, no state change) — then repeat the equivalent legitimate user flow and confirm it still succeeds.

## Events & Packages

### SQL Injection in Event Search Exposes Unpublished Data
- **Severity:** High
- **Fix:** Parameterise search queries and enforce publication status in the query itself.
- **Retest:** repeat the original exploit steps from the Practice Guide — it must now fail (no bypass, no data leak, no state change) — then repeat the equivalent legitimate user flow and confirm it still succeeds.

### Reflected Cross-Site Scripting in Event Search
- **Severity:** Medium
- **Fix:** HTML-encode all reflected values; validate search input.
- **Retest:** repeat the original exploit steps from the Practice Guide — it must now fail (no bypass, no data leak, no state change) — then repeat the equivalent legitimate user flow and confirm it still succeeds.

### Package Bundle Components Trusted From Client Allow Free Upgrades
- **Severity:** High
- **Fix:** Derive all bundle components and prices server-side from the tier id alone.
- **Retest:** repeat the original exploit steps from the Practice Guide — it must now fail (no bypass, no data leak, no state change) — then repeat the equivalent legitimate user flow and confirm it still succeeds.

## Group Reservations

### Paid Group Size Not Reconciled With Traveller List
- **Severity:** High
- **Fix:** Server must require travellers.length === paidCount before pricing and allocation.
- **Retest:** repeat the original exploit steps from the Practice Guide — it must now fail (no bypass, no data leak, no state change) — then repeat the equivalent legitimate user flow and confirm it still succeeds.

### Insecure Direct Object Reference on Reservation View
- **Severity:** High
- **Fix:** Check ownership (or group membership) on every reservation access.
- **Retest:** repeat the original exploit steps from the Practice Guide — it must now fail (no bypass, no data leak, no state change) — then repeat the equivalent legitimate user flow and confirm it still succeeds.

### Missing Ownership Check on Reservation Cancellation
- **Severity:** High
- **Fix:** Verify the caller owns the reservation before any state change; log destructive actions.
- **Retest:** repeat the original exploit steps from the Practice Guide — it must now fail (no bypass, no data leak, no state change) — then repeat the equivalent legitimate user flow and confirm it still succeeds.

### Client-Side Price Tampering in Booking Flow
- **Severity:** Critical
- **Fix:** Ignore client-submitted prices; recompute totals from server-side catalogue data.
- **Retest:** repeat the original exploit steps from the Practice Guide — it must now fail (no bypass, no data leak, no state change) — then repeat the equivalent legitimate user flow and confirm it still succeeds.

## Allocations

### Unauthorised Modification of Other Groups’ Allocations
- **Severity:** High
- **Fix:** Scope allocation writes to the reservation owner or staff roles.
- **Retest:** repeat the original exploit steps from the Practice Guide — it must now fail (no bypass, no data leak, no state change) — then repeat the equivalent legitimate user flow and confirm it still succeeds.

### Event Capacity Not Enforced at Booking
- **Severity:** High
- **Fix:** Check remaining capacity inside the booking transaction and reject oversell.
- **Retest:** repeat the original exploit steps from the Practice Guide — it must now fail (no bypass, no data leak, no state change) — then repeat the equivalent legitimate user flow and confirm it still succeeds.

## Payments & Instalments

### Instalments Can Be Marked Paid Without Payment
- **Severity:** Critical
- **Fix:** Only mark paid from verified payment webhooks with matching amounts.
- **Retest:** repeat the original exploit steps from the Practice Guide — it must now fail (no bypass, no data leak, no state change) — then repeat the equivalent legitimate user flow and confirm it still succeeds.

### Instalment Amount Not Verified Against Amount Due
- **Severity:** High
- **Fix:** Compare paid amount to amount due server-side; keep instalments open for the remainder.
- **Retest:** repeat the original exploit steps from the Practice Guide — it must now fail (no bypass, no data leak, no state change) — then repeat the equivalent legitimate user flow and confirm it still succeeds.

## Organizer & Manifest

### Organizer Manifest Exposed to Non-Organizer Users
- **Severity:** High
- **Fix:** Enforce organizer/staff role and group ownership on the manifest endpoint.
- **Retest:** repeat the original exploit steps from the Practice Guide — it must now fail (no bypass, no data leak, no state change) — then repeat the equivalent legitimate user flow and confirm it still succeeds.

## Admin Panel

### Broken Access Control on Admin User List
- **Severity:** High
- **Fix:** Require the admin role server-side on every /admin route.
- **Retest:** repeat the original exploit steps from the Practice Guide — it must now fail (no bypass, no data leak, no state change) — then repeat the equivalent legitimate user flow and confirm it still succeeds.

### Missing CSRF Token on Administrative Action
- **Severity:** Medium
- **Fix:** Verify per-session CSRF tokens on all admin state-changing endpoints.
- **Retest:** repeat the original exploit steps from the Practice Guide — it must now fail (no bypass, no data leak, no state change) — then repeat the equivalent legitimate user flow and confirm it still succeeds.

## Platform & API

### Forgeable API Token (Base64 of Email)
- **Severity:** High
- **Fix:** Issue random, high-entropy API tokens; store hashed and scope them per user.
- **Retest:** repeat the original exploit steps from the Practice Guide — it must now fail (no bypass, no data leak, no state change) — then repeat the equivalent legitimate user flow and confirm it still succeeds.

### Sensitive Data Exposure via Debug Endpoint
- **Severity:** Critical
- **Fix:** Remove debug endpoints from production builds; never store or return plaintext passwords.
- **Retest:** repeat the original exploit steps from the Practice Guide — it must now fail (no bypass, no data leak, no state change) — then repeat the equivalent legitimate user flow and confirm it still succeeds.
