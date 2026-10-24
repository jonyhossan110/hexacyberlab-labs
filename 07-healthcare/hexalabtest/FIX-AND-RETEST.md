# HexaLabTest (LAB 64) — Fix & Retest

For every test: the secure implementation, and the regression check that proves the fix. Work through the app feature by feature.

## Login & Authentication

### SQL Injection in login form allows authentication bypass
- **Severity:** Critical
- **Secure implementation:** Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.
- **Retest:** Repeat the original exploit ("SQL injection login bypass") — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.

### No rate limiting or account lockout on login enables brute-force attacks
- **Severity:** High
- **Secure implementation:** Add progressive delays, lockout and alerting after repeated failures; offer MFA.
- **Retest:** Repeat the original exploit ("Brute force — no rate limit or lockout") — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.

### User enumeration through differential authentication responses
- **Severity:** Medium
- **Secure implementation:** Return one generic message ("invalid credentials" / "if the account exists…") for every case.
- **Retest:** Repeat the original exploit ("User enumeration via login and forgot-password") — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.

### Default/demo administrator credentials active and publicly disclosed
- **Severity:** Critical
- **Secure implementation:** Force credential change on first use; remove demo accounts and credential hints from production.
- **Retest:** Repeat the original exploit ("Default / demo admin credentials still active") — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.

### Password reset tokens are predictable (derived from user ID)
- **Severity:** High
- **Secure implementation:** Generate reset tokens with a CSPRNG (≥128 bits), expire them quickly and make them single-use.
- **Retest:** Repeat the original exploit ("Predictable password-reset token") — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.

### Privilege escalation via client-controlled role cookie
- **Severity:** Critical
- **Secure implementation:** Store roles in the server-side session only; ignore role claims from cookies or request data.
- **Retest:** Repeat the original exploit ("Session role trusted from a client cookie") — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.

## Registration & Profile

### No minimum password strength enforced at registration
- **Severity:** Medium
- **Secure implementation:** Require ≥10 characters, check against breached-password lists, and encourage passphrases.
- **Retest:** Repeat the original exploit ("Weak password policy (1 character accepted)") — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.

### Mass assignment in registration allows role escalation
- **Severity:** High
- **Secure implementation:** Whitelist assignable fields server-side; set role explicitly in code, never from request data.
- **Retest:** Repeat the original exploit ("Mass assignment — self-assign a staff role") — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.

### Stored cross-site scripting via display name
- **Severity:** High
- **Secure implementation:** Context-encode all user output; adopt a strict Content-Security-Policy as defence in depth.
- **Retest:** Repeat the original exploit ("Stored XSS in display name") — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.

### Missing CSRF protection on profile update
- **Severity:** Medium
- **Secure implementation:** Verify a per-session CSRF token on every state-changing request; use SameSite cookies.
- **Retest:** Repeat the original exploit ("CSRF on profile update") — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.

## Test Catalog & Search

### SQL injection in test-catalog search reveals non-public entries
- **Severity:** High
- **Secure implementation:** Parameterise search queries; return only public catalogue rows to unauthenticated roles.
- **Retest:** Repeat the original exploit ("SQL injection in catalog search dumps hidden tests") — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.

### Reflected cross-site scripting in search results
- **Severity:** Medium
- **Secure implementation:** HTML-encode reflected values; validate input; add a Content-Security-Policy.
- **Retest:** Repeat the original exploit ("Reflected XSS in catalog search") — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.

## Test Orders

### Client-side price tampering in order placement
- **Severity:** High
- **Secure implementation:** Recompute all prices from the server-side catalogue at checkout; ignore submitted prices.
- **Retest:** Repeat the original exploit ("Price tampering on test orders") — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.

### Missing quantity validation allows negative order totals
- **Severity:** Medium
- **Secure implementation:** Validate quantity as an integer within an allowed range on the server before pricing.
- **Retest:** Repeat the original exploit ("Quantity tampering — negative quantities accepted") — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.

### Insecure direct object reference on order details
- **Severity:** High
- **Secure implementation:** Enforce per-object authorization: patients see only their own orders; staff only within their duties.
- **Retest:** Repeat the original exploit ("Order IDOR — read another patient’s order") — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.

### Client-controlled order status bypasses the diagnostic workflow
- **Severity:** High
- **Secure implementation:** Set initial status in code; allow only server-defined transitions by authorised roles.
- **Retest:** Repeat the original exploit ("Order status forged at creation (skip the lab workflow)") — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.

## Sample Tracking

### Missing function-level authorization on sample status updates
- **Severity:** High
- **Secure implementation:** Restrict status transitions to technician/admin roles and validate the transition sequence.
- **Retest:** Repeat the original exploit ("Patient advances own sample status (missing role check)") — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.

### Broken access control exposes technician work queue to patients
- **Severity:** High
- **Secure implementation:** Require technician/admin role for queue endpoints; audit staff URLs for role checks.
- **Retest:** Repeat the original exploit ("Technician work queue visible to patients") — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.

## Results & Reports

### Missing authorization on result entry allows patients to alter medical results
- **Severity:** Critical
- **Secure implementation:** Restrict result entry to verified technician accounts; log and dual-review result changes.
- **Retest:** Repeat the original exploit ("Patient edits own results via the technician endpoint") — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.

### Insecure direct object reference on report download
- **Severity:** High
- **Secure implementation:** Check report ownership (or staff duty) on every download; use unguessable report links as defence in depth.
- **Retest:** Repeat the original exploit ("Report IDOR — download another patient’s report") — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.

### Reports released before mandatory doctor review
- **Severity:** High
- **Secure implementation:** Serve reports only when reviewed=true and status=Reported; enforce the workflow server-side.
- **Retest:** Repeat the original exploit ("Report downloadable before doctor review") — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.

### Directory traversal in file download exposes application source
- **Severity:** High
- **Secure implementation:** Resolve and validate paths against the intended directory; serve files by id, not by name.
- **Retest:** Repeat the original exploit ("Path traversal in report file download") — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.

## Home Collection

### Insecure direct object reference exposes patient home addresses
- **Severity:** High
- **Secure implementation:** Enforce ownership on booking records; minimise address exposure to assigned staff only.
- **Retest:** Repeat the original exploit ("Home-collection booking IDOR — home address leak") — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.

### Client-side fee tampering on home-collection booking
- **Severity:** Medium
- **Secure implementation:** Set fees server-side from configuration; ignore fee values in requests.
- **Retest:** Repeat the original exploit ("Home-collection fee tampering") — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.

## Admin Panel

### Missing CSRF protection on administrative user deactivation
- **Severity:** High
- **Secure implementation:** Verify CSRF tokens on all admin actions; require re-authentication for destructive operations.
- **Retest:** Repeat the original exploit ("CSRF on admin user deactivation") — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.

## Platform & API

### Forgeable API token (base64 of email) exposes all orders
- **Severity:** Critical
- **Secure implementation:** Issue random, revocable API keys; store hashes; scope keys per account and role.
- **Retest:** Repeat the original exploit ("Weak API token — base64(email) unlocks all orders") — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.
