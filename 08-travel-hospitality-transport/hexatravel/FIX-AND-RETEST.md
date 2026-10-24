# HexaTravel (LAB 71) — Fix & Retest

For every scored test: the secure implementation and the regression check that proves the fix.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass (Critical)
- Fix: Use parameterised queries / prepared statements for all database access; never concatenate user input into SQL.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("SQL injection login bypass"); it must now fail (no pass recorded, no effect on data), while the legitimate flow still works.

### No Rate Limiting or Account Lockout on Login Endpoint (High)
- Fix: Add progressive delays, lockout after repeated failures, and CAPTCHA / MFA for accounts.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Brute force — no rate limit or lockout"); it must now fail (no pass recorded, no effect on data), while the legitimate flow still works.

### Account Enumeration via Differential Authentication Responses (Medium)
- Fix: Return one generic message ("if the account exists…") for all login and reset outcomes.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("User enumeration via login & forgot-password"); it must now fail (no pass recorded, no effect on data), while the legitimate flow still works.

### Default Administrator Credentials Active and Publicly Disclosed (Critical)
- Fix: Force password change on first use, remove demo accounts from production, never print credentials on the login page.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Default / demo credentials still active"); it must now fail (no pass recorded, no effect on data), while the legitimate flow still works.

### Password Reset Tokens Are Predictable (Derived from User ID) (High)
- Fix: Generate reset tokens from a CSPRNG (≥128-bit), store hashed, expire quickly, single use.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Predictable password-reset token"); it must now fail (no pass recorded, no effect on data), while the legitimate flow still works.

### Authorization Role Trusted from a Client-Controlled Cookie (High)
- Fix: Derive roles from the server-side session record only; ignore any role value supplied by the client.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Session/role cookie tampering"); it must now fail (no pass recorded, no effect on data), while the legitimate flow still works.

## Registration & Profile

### Registration Accepts Extremely Weak Passwords (Medium)
- Fix: Enforce a minimum length (≥10) and screen against known-breached password lists.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Weak password policy (1 character)"); it must now fail (no pass recorded, no effect on data), while the legitimate flow still works.

### Mass Assignment in Registration Allows Privilege Escalation (High)
- Fix: Whitelist bindable fields server-side; set role/credit only through privileged internal code paths.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Mass assignment — role & credit at signup"); it must now fail (no pass recorded, no effect on data), while the legitimate flow still works.

### Stored Cross-Site Scripting via Display Name (High)
- Fix: Context-aware output encoding on all user data; add a Content-Security-Policy as defence in depth.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Stored XSS in display name"); it must now fail (no pass recorded, no effect on data), while the legitimate flow still works.

### Missing CSRF Protection on Profile Update (Medium)
- Fix: Issue and verify per-session CSRF tokens on every state-changing request; validate Origin/Referer.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("CSRF on profile update"); it must now fail (no pass recorded, no effect on data), while the legitimate flow still works.

## Search & Packages

### SQL Injection in Package Search Exposes Unlisted Records (High)
- Fix: Parameterise search queries and enforce listing/visibility filters server-side regardless of input.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("SQL injection in package search"); it must now fail (no pass recorded, no effect on data), while the legitimate flow still works.

### Reflected Cross-Site Scripting in Search Results (Medium)
- Fix: HTML-encode all reflected input; deploy a restrictive Content-Security-Policy.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Reflected XSS in search"); it must now fail (no pass recorded, no effect on data), while the legitimate flow still works.

### Internal Agent Fare Rules Disclosed to Unprivileged Users (Medium)
- Fix: Strip internal fields from responses for non-agent roles; review every DTO for internal-only data.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Agent-only fare rules exposed to travellers"); it must now fail (no pass recorded, no effect on data), while the legitimate flow still works.

## Booking & Payments

### Client-Side Price Trusted at Booking (Price Tampering) (Critical)
- Fix: Recompute price and total server-side from catalogue data; ignore all client-supplied monetary fields.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Price-per-person tampering at checkout"); it must now fail (no pass recorded, no effect on data), while the legitimate flow still works.

### Booked Traveller Count Not Reconciled with Paid Count (High)
- Fix: Derive the booked quantity from the paid line items server-side; reject mismatches.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Traveller-count forgery (pay for 1, book for 4)"); it must now fail (no pass recorded, no effect on data), while the legitimate flow still works.

### Missing Capacity Validation Allows Overselling Departures (High)
- Fix: Check and decrement seat inventory atomically inside the booking transaction.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Booking a sold-out departure"); it must now fail (no pass recorded, no effect on data), while the legitimate flow still works.

### Multiple Discount Vouchers Can Be Stacked on a Single Booking (Medium)
- Fix: Enforce a single active voucher per booking server-side unless an explicit combining rule exists.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Voucher stacking (two codes on one booking)"); it must now fail (no pass recorded, no effect on data), while the legitimate flow still works.

### Single-Use Voucher Can Be Redeemed Repeatedly (Medium)
- Fix: Persist voucher redemptions per user/code and reject repeat use of single-use codes.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Single-use voucher reused"); it must now fail (no pass recorded, no effect on data), while the legitimate flow still works.

## Reservations & Documents

### Insecure Direct Object Reference on Reservation Records (High)
- Fix: Verify the requesting user owns (or is authorised for) the reservation on every read and write.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Reservation IDOR — view another traveller's booking"); it must now fail (no pass recorded, no effect on data), while the legitimate flow still works.

### Insecure Direct Object Reference on Travel Documents (High)
- Fix: Authorize document access through the parent reservation's ownership, every time.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Travel document IDOR — download another traveller's documents"); it must now fail (no pass recorded, no effect on data), while the legitimate flow still works.

### Directory Traversal in File Download Endpoint (High)
- Fix: Resolve the requested path, verify it stays inside the documents directory, and serve files by id, not by name.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Path traversal on document download"); it must now fail (no pass recorded, no effect on data), while the legitimate flow still works.

## Reviews

### Stored Cross-Site Scripting in Package Reviews (High)
- Fix: Output-encode review text at render time and sanitise stored rich text if any is allowed.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Stored XSS in package reviews"); it must now fail (no pass recorded, no effect on data), while the legitimate flow still works.

## Admin Panel

### Broken Access Control — Admin Console Accessible to Non-Admin Users (Critical)
- Fix: Enforce role-based authorization middleware on all admin routes.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Admin panel open to any signed-in user"); it must now fail (no pass recorded, no effect on data), while the legitimate flow still works.

### Missing CSRF Protection on Administrative Actions (High)
- Fix: Verify per-session CSRF tokens on all admin state changes and add SameSite cookies.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("CSRF on admin package deletion"); it must now fail (no pass recorded, no effect on data), while the legitimate flow still works.

## Platform & API

### API Authentication Token Is a Predictable Encoding of the User's Email (High)
- Fix: Issue random, high-entropy API keys, store them hashed, and support revocation/rotation.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Weak API token (base64 of email)"); it must now fail (no pass recorded, no effect on data), while the legitimate flow still works.

### Unauthenticated Debug Endpoint Exposes All User Credentials (Critical)
- Fix: Remove debug endpoints from production builds; gate any diagnostics behind admin auth and logging.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Unauthenticated debug endpoint dumps all users"); it must now fail (no pass recorded, no effect on data), while the legitimate flow still works.
