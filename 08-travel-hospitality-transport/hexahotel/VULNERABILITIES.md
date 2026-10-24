# HexaHotel — Vulnerabilities (complete test map)

LAB 72 — HexaHotel (Category 8: Travel, Hospitality & Transport). Every entry below is a scored test in the lab's TESTS registry; a test passes only when the exploit actually succeeds server-side.

## Login & Authentication

### SQL injection login bypass
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Impact: On a real hotel site this hands an attacker instant access to guest accounts — names, stay dates and payment details — with no password at all.
- Report as: "SQL Injection in Login Form Allows Authentication Bypass" (Critical) — Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.

### Brute force — no rate limit or lockout
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Impact: Guest accounts on a real booking platform fall to automated password guessing, exposing trips and stored payment methods.
- Report as: "No Rate Limiting or Account Lockout on Login" (High) — Add progressive delays, lockout and alerting after repeated failed logins; require MFA for staff.

### User enumeration via differing error messages
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Impact: Attackers build a verified list of real guest emails from a hotel site, then target exactly those people with phishing and password attacks.
- Report as: "Account Enumeration Through Authentication Error Messages" (Medium) — Return one generic error ("invalid credentials") for every failed login or reset request.

### Default administrator credentials
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Impact: A real hotel platform left on default admin credentials gives an attacker full control — every booking, every guest, every invoice.
- Report as: "Default Administrative Credentials in Use" (Critical) — Force a unique strong password at first setup; disable or rename default accounts.

### Predictable password-reset token
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Intermediate
- Impact: Anyone can reset the password of any guest or staff account on a real hotel site and take it over completely.
- Report as: "Password Reset Tokens Are Predictable" (High) — Generate reset tokens with a CSPRNG (≥128 bits), expire them quickly and invalidate after use.

### Session role trusted from a client cookie
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: Any guest can promote themselves to administrator on a real hotel platform just by editing a cookie.
- Report as: "Broken Access Control — Role Read From Client Cookie" (High) — Derive roles exclusively from the server-side session; ignore client-supplied role values.

## Registration & Profile

### Weak password policy on registration
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Impact: Guests who pick tiny passwords on a real hotel site have their accounts — and travel plans — taken over trivially.
- Report as: "Weak Password Policy Allows Trivial Passwords" (Medium) — Enforce a minimum length (≥10) and screen against known-breached password lists.

### Mass assignment — role set at registration
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: Attackers mint themselves staff or admin accounts on a real booking platform during normal sign-up.
- Report as: "Mass Assignment Allows Privilege Escalation at Registration" (High) — Whitelist the exact fields each endpoint may set; never bind raw request bodies to models.

### Stored XSS in display name
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Impact: A malicious guest name can run JavaScript in the front-desk or admin browser on a real hotel system, hijacking staff sessions.
- Report as: "Stored Cross-Site Scripting in User Display Name" (High) — Contextually escape all user-supplied output; add a Content-Security-Policy header.

### CSRF on profile update
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: A guest browsing a malicious page could have their hotel account name and contact email silently changed.
- Report as: "Missing CSRF Protection on Profile Update" (Medium) — Require a per-session anti-CSRF token on every state-changing request and validate Origin/Referer.

## Rooms & Search

### SQL injection in room search reveals hidden rooms
- OWASP: A03:2021 Injection
- Difficulty: Intermediate
- Impact: Unlisted rooms, staff rates and internal inventory on a real hotel site leak to anyone who asks the search box correctly.
- Report as: "SQL Injection in Room Search Exposes Unlisted Inventory" (High) — Parameterise search queries and enforce listing/visibility filters server-side.

### Reflected XSS in room search
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Impact: Attackers send guests or staff a poisoned search link for a real hotel site and steal sessions when it is opened.
- Report as: "Reflected Cross-Site Scripting in Search" (Medium) — Escape reflected values in HTML output; validate and encode search input.

## Bookings

### Nightly rate tampering in booking
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Impact: Guests book premium rooms for pennies on a real hotel site — direct revenue loss that scales with automation.
- Report as: "Client-Side Price Tampering in Booking Flow" (High) — Ignore client-supplied prices; recompute totals server-side from the catalogue at booking time.

### Booking a fully-booked room type
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: Overbooking on a real hotel platform means guests arrive to no room — refunds, compensation and reputation damage.
- Report as: "Missing Availability Enforcement Allows Overbooking" (High) — Check inventory atomically at booking time and reject when capacity is exhausted.

### Booking IDOR — view another guest's booking
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Impact: Strangers read other guests' names, dates and room details on a real hotel site — a serious privacy breach.
- Report as: "Insecure Direct Object Reference on Booking Details" (High) — Verify the session user owns (or staff-manages) every booking before serving it.

### Date / nights manipulation — pay for fewer nights
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: Guests stay three nights and pay for one on a real hotel site — silent, repeatable revenue leakage.
- Report as: "Booking Total Uses Client-Supplied Nights Value" (High) — Compute nights from the validated check-in/check-out dates server-side; ignore client totals.

### Cancel another guest's booking
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Impact: Attackers cancel strangers' reservations on a real hotel platform, sabotaging trips and the business alike.
- Report as: "Missing Authorisation on Booking Cancellation" (High) — Check booking ownership (or staff role) before applying any state change.

## Extras & Charges

### Free extras via forged extra price
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Impact: Breakfast, parking and spa charges quietly vanish from bills on a real hotel system — death by a thousand cuts.
- Report as: "Client-Supplied Pricing Accepted for Booking Extras" (Medium) — Look up extra prices server-side by id; never accept a price field from the client.

### Add extras to another guest's booking
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: Attackers inflate strangers' hotel bills with unwanted extras, causing disputes and chargebacks.
- Report as: "IDOR Allows Modifying Other Guests' Bookings" (High) — Authorise every mutation against the booking's owner or a staff role.

## Check-in & Front Desk

### Guest performs front-desk check-in
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: Guests check themselves (or strangers) in and out on a real hotel system, breaking billing and room status.
- Report as: "Missing Role Check on Front-Desk Check-In Endpoint" (High) — Enforce staff role server-side on every front-desk action.

### Guest uses front-desk rate override
- OWASP: A01:2021 Broken Access Control
- Difficulty: Advanced
- Impact: Any guest can rewrite their rate to almost nothing on a real hotel platform using a staff-only tool.
- Report as: "Unauthorised Access to Staff Rate-Override Function" (High) — Require and verify the front-desk/admin role inside the override handler; log all overrides.

## Invoices & Payments

### Invoice IDOR — view another guest's invoice
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Impact: Strangers read other guests' full bills on a real hotel site — amounts, dates, personal details.
- Report as: "Insecure Direct Object Reference on Invoices" (High) — Check invoice ownership before display or download.

### Settle invoice in full with a partial payment
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: Guests close out large hotel bills for a token payment — direct, provable financial loss.
- Report as: "Invoice Marked Paid Without Full Payment" (Critical) — Mark invoices paid only when cumulative verified payments cover the amount due.

## Admin Panel

### CSRF on admin room-rate change
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: A tricked admin visit to a malicious page could slash (or spike) room rates on a real hotel platform.
- Report as: "Missing CSRF Protection on Administrative Rate Change" (High) — Validate anti-CSRF tokens on all admin state changes; use SameSite cookies as defence in depth.

## Platform & API

### Weak API token — base64 of email
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Intermediate
- Impact: Anyone who knows a guest's email address can pull their bookings from a real hotel API.
- Report as: "Predictable API Authentication Tokens" (High) — Issue random, revocable API tokens; store only hashes server-side.

### Unauthenticated debug endpoint dumps accounts
- OWASP: A05:2021 Security Misconfiguration
- Difficulty: Beginner
- Impact: A single URL hands out every account — including passwords — on a real hotel platform. Game over in one request.
- Report as: "Debug Endpoint Exposes All User Accounts and Passwords" (Critical) — Remove debug endpoints from production builds; store passwords hashed with a strong KDF.
