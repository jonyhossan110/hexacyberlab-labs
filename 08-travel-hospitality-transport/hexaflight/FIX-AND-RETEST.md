# HexaFlight — FIX & RETEST (LAB 73)

For every test: the secure implementation pattern and the regression check that proves the fix.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass
- **Fix:** Use parameterised queries everywhere; never concatenate user input into SQL; add central query-layer linting.
- **Retest:** Re-run the original exploit for "SQL Injection — Login Bypass" (POST /login) — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.
- **Lesson:** String-built queries let attacker input change the meaning of the query itself — here it logs you in as the first account in the table, the admin.

### No Rate Limiting or Lockout on Login Enables Brute Force
- **Fix:** Throttle per account and per IP, add progressive delays/lockout and alerting on failure spikes.
- **Retest:** Re-run the original exploit for "Brute Force — No Login Throttling" (POST /login) — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.
- **Lesson:** Without rate limiting or lockout, password guessing is only a matter of time and wordlists.

### Account Enumeration via Differential Authentication Responses
- **Fix:** Return one generic message for all auth failures and reset requests, with identical timing.
- **Retest:** Re-run the original exploit for "User Enumeration via Login & Reset Responses" (POST /login · POST /forgot) — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.
- **Lesson:** Different error messages for "no such account" and "wrong password" hand attackers a free list of valid accounts to target.

### Staff Account Uses Default, Guessable Password
- **Fix:** Force password change on first login, ban username-derived passwords, audit for default credentials.
- **Retest:** Re-run the original exploit for "Default Credentials on the Helpdesk Account" (POST /login) — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.
- **Lesson:** Default and username-derived passwords survive into production whenever first-login change is not forced.

### Password Reset Tokens Are Predictable (Derived from User ID)
- **Fix:** Generate reset tokens with a CSPRNG (≥128 bits), expire them quickly and bind them to a single use.
- **Retest:** Re-run the original exploit for "Predictable Password-Reset Token" (POST /reset) — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.
- **Lesson:** Reset tokens must be unguessable random values; a formula based on the user id is an open invitation to account takeover.

### Admin Panel Authorizes via Client-Controlled Role Cookie
- **Fix:** Derive roles only from the server-side session; ignore any client-supplied role claims.
- **Retest:** Re-run the original exploit for "Role Cookie Tampering Unlocks the Admin Panel" (GET /admin (hx_role cookie)) — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.
- **Lesson:** Authorization data stored on the client is attacker-controlled. Roles must be read from the server-side session, every time.

## Registration & Profile

### Registration Accepts Single-Character Passwords
- **Fix:** Enforce a minimum length (≥10) and screen against breached-password lists at registration.
- **Retest:** Re-run the original exploit for "Weak Password Policy — 1-Character Passwords" (POST /register) — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.
- **Lesson:** A password policy that accepts anything guarantees some accounts have trivially guessable passwords.

### Mass Assignment in Registration Allows Role Escalation
- **Fix:** Whitelist assignable fields per endpoint; set roles server-side only.
- **Retest:** Re-run the original exploit for "Mass Assignment — Self-Assigned Staff Role" (POST /register) — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.
- **Lesson:** Binding request bodies directly to data models lets attackers set privileged fields the UI never offered.

### Stored Cross-Site Scripting via Display Name
- **Fix:** Context-encode all user data on output; add a Content-Security-Policy as defence in depth.
- **Retest:** Re-run the original exploit for "Stored XSS in Display Name" (POST /register · POST /profile/update → rendered in /admin and agent views) — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.
- **Lesson:** Any user-controlled string rendered raw into staff pages is a stored XSS waiting for a victim with privileges.

### Missing CSRF Protection on Profile Update
- **Fix:** Require a per-session anti-CSRF token on every state-changing request and verify Origin/Referer.
- **Retest:** Re-run the original exploit for "CSRF on Profile Update" (POST /profile/update) — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.
- **Lesson:** State-changing endpoints that never verify an anti-CSRF token can be triggered by any website the victim visits while logged in.

## Flight Search

### SQL Injection in Flight Search Exposes Hidden Inventory
- **Fix:** Parameterise search queries and enforce visibility flags in the data layer, not the UI.
- **Retest:** Re-run the original exploit for "SQL Injection in Flight Search Reveals Hidden Charter Flight" (GET /flights?q=) — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.
- **Lesson:** Injection in search is not "just search" — it dumps rows the UI was designed to hide, like internal or unreleased inventory.

### Reflected Cross-Site Scripting in Flight Search
- **Fix:** HTML-encode all reflected values; validate search input length and character set.
- **Retest:** Re-run the original exploit for "Reflected XSS in Search Results" (GET /flights?q=) — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.
- **Lesson:** Reflected input must be encoded on output, even "harmless" echoes like a search heading.

## Bookings & Fares

### Client-Supplied Price Trusted at Booking (Fare Tampering)
- **Fix:** Compute all fares server-side from flight + seat at booking and payment time; ignore client prices.
- **Retest:** Re-run the original exploit for "Fare Tampering — Business Seat at an Economy Price" (POST /book (price field)) — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.
- **Lesson:** Prices are server-side facts. Any price arriving from the client is a claim to verify, never a value to charge.

### Payment Amount Not Verified — Zero-Payment Bookings Confirmed
- **Fix:** Verify amount and status against the payment gateway server-side before confirming any booking.
- **Retest:** Re-run the original exploit for "Payment Bypass — Paying $0 Marks the Booking Paid" (POST /book/:id/pay) — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.
- **Lesson:** A payment is confirmed by the payment provider’s server-side callback, never by a number the browser posts.

### Insecure Direct Object Reference on Booking Details
- **Fix:** Check booking ownership (or staff role) on every booking read/write; use unguessable references.
- **Retest:** Re-run the original exploit for "Booking IDOR — Read Any Passenger’s Booking" (GET /booking/:id) — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.
- **Lesson:** Every object access needs an ownership check; sequential ids make missing checks trivially exploitable.

### Missing Authorization on Booking Cancellation
- **Fix:** Verify ownership server-side before any booking mutation; log and alert on staff overrides.
- **Retest:** Re-run the original exploit for "Cancel Another Passenger’s Booking" (POST /booking/:id/cancel) — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.
- **Lesson:** Destructive actions need the strictest authorization checks — a missing check here deletes real journeys.

## Seats & Check-in

### Seat Change Does Not Re-Price — Free Premium Upgrades
- **Fix:** Recompute fare on seat change and collect/refund the difference before confirming.
- **Retest:** Re-run the original exploit for "Free Upgrade — Premium Seat Change Without Paying the Difference" (POST /booking/:id/seat) — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.
- **Lesson:** Post-booking changes must re-price server-side; a free seat map is a free upgrade machine.

### Seat Assignment Allows Double-Booking the Same Seat
- **Fix:** Enforce a uniqueness constraint on (flight, seat) for active bookings inside a transaction.
- **Retest:** Re-run the original exploit for "Double-Booked Seat — the Same Seat Sold Twice" (POST /booking/:id/seat) — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.
- **Lesson:** Uniqueness invariants (one passenger per seat) must be enforced in the data layer at write time, not assumed from the UI.

### Missing Authorization on Check-In
- **Fix:** Verify booking ownership before check-in; require the PNR + surname pair for guest flows.
- **Retest:** Re-run the original exploit for "Check In Another Passenger" (POST /booking/:id/checkin) — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.
- **Lesson:** Workflow actions inherit the same ownership rules as reads — checking in is a state change on someone’s journey.

### Insecure Direct Object Reference on E-Ticket
- **Fix:** Restrict ticket rendering to the booking owner or staff; use signed, expiring ticket links.
- **Retest:** Re-run the original exploit for "E-Ticket IDOR — Download Any Passenger’s Ticket" (GET /ticket/:id) — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.
- **Lesson:** A ticket is a bearer instrument: serving it without an ownership check is handing out other people’s flights.

## Agent Desk

### Fare-Rules API Missing Role Check (Commercial Data Exposure)
- **Fix:** Apply the staff role check in the API handler itself; deny by default.
- **Retest:** Re-run the original exploit for "Wholesale Fare Rules Exposed to Passengers via API" (GET /api/fare-rules) — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.
- **Lesson:** APIs need the same authorization as the pages that use them — securing the page but not the endpoint secures nothing.

### Discount-Code Creation Missing Authorization
- **Fix:** Restrict discount creation to agent/admin roles server-side; cap discount percentages.
- **Retest:** Re-run the original exploit for "Passengers Can Mint Their Own Discount Codes" (POST /agent/discount) — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.
- **Lesson:** Every privileged write endpoint must verify the caller’s role server-side — "hidden in the staff UI" is not a control.

## Admin Panel

### Broken Access Control on Admin User List
- **Fix:** Require the admin role for user-directory endpoints; minimise fields returned.
- **Retest:** Re-run the original exploit for "Admin User List Served to Any Logged-In User" (GET /admin/users) — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.
- **Lesson:** Endpoints that return user directories are sensitive assets; "logged in" is not "authorized".

### Missing CSRF Protection on Admin Fare Update
- **Fix:** Require anti-CSRF tokens on all admin actions; verify Origin/Referer as defence in depth.
- **Retest:** Re-run the original exploit for "CSRF on Admin Fare Update" (POST /admin/fares) — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.
- **Lesson:** Privileged actions are the most valuable CSRF targets; tokens matter most exactly where admins act.

## Platform & API

### API Bearer Token Is a Predictable Encoding of the Email Address
- **Fix:** Issue random opaque API tokens at login, store hashes, support revocation and expiry.
- **Retest:** Re-run the original exploit for "Weak API Token — Base64 of the Account Email" (GET /api/my-bookings (Authorization: Bearer)) — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.
- **Lesson:** An identifier is not a credential. API tokens must be random, secret and revocable.

### Unauthenticated Debug Endpoint Exposes All Credentials
- **Fix:** Remove debug endpoints from production builds; gate diagnostics behind admin auth and IP allowlists.
- **Retest:** Re-run the original exploit for "Debug Endpoint Dumps Every Account and Password" (GET /api/debug) — it must now fail (no bypass, no state change, no data leak), while the legitimate flow still works.
- **Lesson:** Debug surface must never ship to production; if it exists, it will be found.
