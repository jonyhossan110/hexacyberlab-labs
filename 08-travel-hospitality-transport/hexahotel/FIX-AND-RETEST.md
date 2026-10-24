# HexaHotel — Fix & Retest

For every scored test: the secure implementation and the regression check that proves the fix.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass (Critical)
- Fix: Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.
- Retest: repeat the original exploit from the practice guide; it must now fail (no test flip, no effect), while the legitimate flow still works.

### No Rate Limiting or Account Lockout on Login (High)
- Fix: Add progressive delays, lockout and alerting after repeated failed logins; require MFA for staff.
- Retest: repeat the original exploit from the practice guide; it must now fail (no test flip, no effect), while the legitimate flow still works.

### Account Enumeration Through Authentication Error Messages (Medium)
- Fix: Return one generic error ("invalid credentials") for every failed login or reset request.
- Retest: repeat the original exploit from the practice guide; it must now fail (no test flip, no effect), while the legitimate flow still works.

### Default Administrative Credentials in Use (Critical)
- Fix: Force a unique strong password at first setup; disable or rename default accounts.
- Retest: repeat the original exploit from the practice guide; it must now fail (no test flip, no effect), while the legitimate flow still works.

### Password Reset Tokens Are Predictable (High)
- Fix: Generate reset tokens with a CSPRNG (≥128 bits), expire them quickly and invalidate after use.
- Retest: repeat the original exploit from the practice guide; it must now fail (no test flip, no effect), while the legitimate flow still works.

### Broken Access Control — Role Read From Client Cookie (High)
- Fix: Derive roles exclusively from the server-side session; ignore client-supplied role values.
- Retest: repeat the original exploit from the practice guide; it must now fail (no test flip, no effect), while the legitimate flow still works.

## Registration & Profile

### Weak Password Policy Allows Trivial Passwords (Medium)
- Fix: Enforce a minimum length (≥10) and screen against known-breached password lists.
- Retest: repeat the original exploit from the practice guide; it must now fail (no test flip, no effect), while the legitimate flow still works.

### Mass Assignment Allows Privilege Escalation at Registration (High)
- Fix: Whitelist the exact fields each endpoint may set; never bind raw request bodies to models.
- Retest: repeat the original exploit from the practice guide; it must now fail (no test flip, no effect), while the legitimate flow still works.

### Stored Cross-Site Scripting in User Display Name (High)
- Fix: Contextually escape all user-supplied output; add a Content-Security-Policy header.
- Retest: repeat the original exploit from the practice guide; it must now fail (no test flip, no effect), while the legitimate flow still works.

### Missing CSRF Protection on Profile Update (Medium)
- Fix: Require a per-session anti-CSRF token on every state-changing request and validate Origin/Referer.
- Retest: repeat the original exploit from the practice guide; it must now fail (no test flip, no effect), while the legitimate flow still works.

## Rooms & Search

### SQL Injection in Room Search Exposes Unlisted Inventory (High)
- Fix: Parameterise search queries and enforce listing/visibility filters server-side.
- Retest: repeat the original exploit from the practice guide; it must now fail (no test flip, no effect), while the legitimate flow still works.

### Reflected Cross-Site Scripting in Search (Medium)
- Fix: Escape reflected values in HTML output; validate and encode search input.
- Retest: repeat the original exploit from the practice guide; it must now fail (no test flip, no effect), while the legitimate flow still works.

## Bookings

### Client-Side Price Tampering in Booking Flow (High)
- Fix: Ignore client-supplied prices; recompute totals server-side from the catalogue at booking time.
- Retest: repeat the original exploit from the practice guide; it must now fail (no test flip, no effect), while the legitimate flow still works.

### Missing Availability Enforcement Allows Overbooking (High)
- Fix: Check inventory atomically at booking time and reject when capacity is exhausted.
- Retest: repeat the original exploit from the practice guide; it must now fail (no test flip, no effect), while the legitimate flow still works.

### Insecure Direct Object Reference on Booking Details (High)
- Fix: Verify the session user owns (or staff-manages) every booking before serving it.
- Retest: repeat the original exploit from the practice guide; it must now fail (no test flip, no effect), while the legitimate flow still works.

### Booking Total Uses Client-Supplied Nights Value (High)
- Fix: Compute nights from the validated check-in/check-out dates server-side; ignore client totals.
- Retest: repeat the original exploit from the practice guide; it must now fail (no test flip, no effect), while the legitimate flow still works.

### Missing Authorisation on Booking Cancellation (High)
- Fix: Check booking ownership (or staff role) before applying any state change.
- Retest: repeat the original exploit from the practice guide; it must now fail (no test flip, no effect), while the legitimate flow still works.

## Extras & Charges

### Client-Supplied Pricing Accepted for Booking Extras (Medium)
- Fix: Look up extra prices server-side by id; never accept a price field from the client.
- Retest: repeat the original exploit from the practice guide; it must now fail (no test flip, no effect), while the legitimate flow still works.

### IDOR Allows Modifying Other Guests' Bookings (High)
- Fix: Authorise every mutation against the booking's owner or a staff role.
- Retest: repeat the original exploit from the practice guide; it must now fail (no test flip, no effect), while the legitimate flow still works.

## Check-in & Front Desk

### Missing Role Check on Front-Desk Check-In Endpoint (High)
- Fix: Enforce staff role server-side on every front-desk action.
- Retest: repeat the original exploit from the practice guide; it must now fail (no test flip, no effect), while the legitimate flow still works.

### Unauthorised Access to Staff Rate-Override Function (High)
- Fix: Require and verify the front-desk/admin role inside the override handler; log all overrides.
- Retest: repeat the original exploit from the practice guide; it must now fail (no test flip, no effect), while the legitimate flow still works.

## Invoices & Payments

### Insecure Direct Object Reference on Invoices (High)
- Fix: Check invoice ownership before display or download.
- Retest: repeat the original exploit from the practice guide; it must now fail (no test flip, no effect), while the legitimate flow still works.

### Invoice Marked Paid Without Full Payment (Critical)
- Fix: Mark invoices paid only when cumulative verified payments cover the amount due.
- Retest: repeat the original exploit from the practice guide; it must now fail (no test flip, no effect), while the legitimate flow still works.

## Admin Panel

### Missing CSRF Protection on Administrative Rate Change (High)
- Fix: Validate anti-CSRF tokens on all admin state changes; use SameSite cookies as defence in depth.
- Retest: repeat the original exploit from the practice guide; it must now fail (no test flip, no effect), while the legitimate flow still works.

## Platform & API

### Predictable API Authentication Tokens (High)
- Fix: Issue random, revocable API tokens; store only hashes server-side.
- Retest: repeat the original exploit from the practice guide; it must now fail (no test flip, no effect), while the legitimate flow still works.

### Debug Endpoint Exposes All User Accounts and Passwords (Critical)
- Fix: Remove debug endpoints from production builds; store passwords hashed with a strong KDF.
- Retest: repeat the original exploit from the practice guide; it must now fail (no test flip, no effect), while the legitimate flow still works.
