# HexaFlight — VULNERABILITIES (LAB 73)

The complete map: all 26 scored tests across 8 features. Every entry is a real, working flaw in this local-only practice app.

## Login & Authentication (6)

### SQL Injection in Login Form Allows Authentication Bypass
- **Test:** SQL Injection — Login Bypass · **OWASP:** A03:2021 Injection · **Difficulty:** Beginner · **Severity (report):** Critical
- **Location:** POST /login
- **Impact:** On a real airline or OTA site this is full account takeover at scale: one payload in the login form can open the admin account and every booking behind it.
- **Remediation:** Use parameterised queries everywhere; never concatenate user input into SQL; add central query-layer linting.

### No Rate Limiting or Lockout on Login Enables Brute Force
- **Test:** Brute Force — No Login Throttling · **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Beginner · **Severity (report):** High
- **Location:** POST /login
- **Impact:** Attackers can credential-stuff or brute-force passenger accounts, harvesting PNRs, personal data and stored payment details.
- **Remediation:** Throttle per account and per IP, add progressive delays/lockout and alerting on failure spikes.

### Account Enumeration via Differential Authentication Responses
- **Test:** User Enumeration via Login & Reset Responses · **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Beginner · **Severity (report):** Medium
- **Location:** POST /login · POST /forgot
- **Impact:** Valid-account lists feed targeted phishing and credential stuffing against real passengers and staff.
- **Remediation:** Return one generic message for all auth failures and reset requests, with identical timing.

### Staff Account Uses Default, Guessable Password
- **Test:** Default Credentials on the Helpdesk Account · **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Beginner · **Severity (report):** High
- **Location:** POST /login
- **Impact:** A guessed staff password opens the agent desk — fares, discounts and passenger bookings — without any exploit at all.
- **Remediation:** Force password change on first login, ban username-derived passwords, audit for default credentials.

### Password Reset Tokens Are Predictable (Derived from User ID)
- **Test:** Predictable Password-Reset Token · **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Intermediate · **Severity (report):** Critical
- **Location:** POST /reset
- **Impact:** Anyone can reset any passenger or staff password knowing only their user id — full account takeover with zero interaction.
- **Remediation:** Generate reset tokens with a CSPRNG (≥128 bits), expire them quickly and bind them to a single use.

### Admin Panel Authorizes via Client-Controlled Role Cookie
- **Test:** Role Cookie Tampering Unlocks the Admin Panel · **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate · **Severity (report):** Critical
- **Location:** GET /admin (hx_role cookie)
- **Impact:** Any passenger becomes "admin" by editing a cookie — user lists, fares and staff tooling all fall at once.
- **Remediation:** Derive roles only from the server-side session; ignore any client-supplied role claims.

## Registration & Profile (4)

### Registration Accepts Single-Character Passwords
- **Test:** Weak Password Policy — 1-Character Passwords · **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Beginner · **Severity (report):** Medium
- **Location:** POST /register
- **Impact:** Weak passenger passwords make credential stuffing against the booking platform cheap and effective.
- **Remediation:** Enforce a minimum length (≥10) and screen against breached-password lists at registration.

### Mass Assignment in Registration Allows Role Escalation
- **Test:** Mass Assignment — Self-Assigned Staff Role · **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate · **Severity (report):** High
- **Location:** POST /register
- **Impact:** Self-made "agents" can mint discounts, read wholesale fares and touch every booking on the platform.
- **Remediation:** Whitelist assignable fields per endpoint; set roles server-side only.

### Stored Cross-Site Scripting via Display Name
- **Test:** Stored XSS in Display Name · **OWASP:** A03:2021 Injection · **Difficulty:** Beginner · **Severity (report):** High
- **Location:** POST /register · POST /profile/update → rendered in /admin and agent views
- **Impact:** A malicious passenger name can hijack the session of the admin who opens the user list — full back-office compromise.
- **Remediation:** Context-encode all user data on output; add a Content-Security-Policy as defence in depth.

### Missing CSRF Protection on Profile Update
- **Test:** CSRF on Profile Update · **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate · **Severity (report):** Medium
- **Location:** POST /profile/update
- **Impact:** Attackers can silently rename accounts or change contact details, setting up booking theft and support-desk social engineering.
- **Remediation:** Require a per-session anti-CSRF token on every state-changing request and verify Origin/Referer.

## Flight Search (2)

### SQL Injection in Flight Search Exposes Hidden Inventory
- **Test:** SQL Injection in Flight Search Reveals Hidden Charter Flight · **OWASP:** A03:2021 Injection · **Difficulty:** Intermediate · **Severity (report):** High
- **Location:** GET /flights?q=
- **Impact:** Internal charter flights, unpublished routes and fare experiments leak to competitors and attackers.
- **Remediation:** Parameterise search queries and enforce visibility flags in the data layer, not the UI.

### Reflected Cross-Site Scripting in Flight Search
- **Test:** Reflected XSS in Search Results · **OWASP:** A03:2021 Injection · **Difficulty:** Beginner · **Severity (report):** Medium
- **Location:** GET /flights?q=
- **Impact:** Crafted search links execute script in the victim’s browser — session theft and fake "payment problem" pages on a trusted domain.
- **Remediation:** HTML-encode all reflected values; validate search input length and character set.

## Bookings & Fares (4)

### Client-Supplied Price Trusted at Booking (Fare Tampering)
- **Test:** Fare Tampering — Business Seat at an Economy Price · **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate · **Severity (report):** High
- **Location:** POST /book (price field)
- **Impact:** Passengers fly business for economy money; at scale this is direct, silent revenue loss on every route.
- **Remediation:** Compute all fares server-side from flight + seat at booking and payment time; ignore client prices.

### Payment Amount Not Verified — Zero-Payment Bookings Confirmed
- **Test:** Payment Bypass — Paying $0 Marks the Booking Paid · **OWASP:** A04:2021 Insecure Design · **Difficulty:** Beginner · **Severity (report):** Critical
- **Location:** POST /book/:id/pay
- **Impact:** Free flights: bookings confirmed without a cent changing hands, indistinguishable from real sales in reports.
- **Remediation:** Verify amount and status against the payment gateway server-side before confirming any booking.

### Insecure Direct Object Reference on Booking Details
- **Test:** Booking IDOR — Read Any Passenger’s Booking · **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner · **Severity (report):** High
- **Location:** GET /booking/:id
- **Impact:** Attackers harvest names, routes, dates and PNRs — the raw material for refund fraud and targeted phishing of travellers.
- **Remediation:** Check booking ownership (or staff role) on every booking read/write; use unguessable references.

### Missing Authorization on Booking Cancellation
- **Test:** Cancel Another Passenger’s Booking · **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner · **Severity (report):** High
- **Location:** POST /booking/:id/cancel
- **Impact:** Attackers can cancel competitors’ or victims’ flights on the day of travel — chaos, refunds and reputational damage.
- **Remediation:** Verify ownership server-side before any booking mutation; log and alert on staff overrides.

## Seats & Check-in (4)

### Seat Change Does Not Re-Price — Free Premium Upgrades
- **Test:** Free Upgrade — Premium Seat Change Without Paying the Difference · **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate · **Severity (report):** High
- **Location:** POST /booking/:id/seat
- **Impact:** Premium cabins fill with economy tickets — direct revenue loss and angry full-fare passengers.
- **Remediation:** Recompute fare on seat change and collect/refund the difference before confirming.

### Seat Assignment Allows Double-Booking the Same Seat
- **Test:** Double-Booked Seat — the Same Seat Sold Twice · **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate · **Severity (report):** High
- **Location:** POST /booking/:id/seat
- **Impact:** Two passengers, one seat: gate chaos, denied boarding, compensation costs and terrible press.
- **Remediation:** Enforce a uniqueness constraint on (flight, seat) for active bookings inside a transaction.

### Missing Authorization on Check-In
- **Test:** Check In Another Passenger · **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner · **Severity (report):** Medium
- **Location:** POST /booking/:id/checkin
- **Impact:** Attackers can check in victims (locking their seats) or check in stolen bookings to fly under another name.
- **Remediation:** Verify booking ownership before check-in; require the PNR + surname pair for guest flows.

### Insecure Direct Object Reference on E-Ticket
- **Test:** E-Ticket IDOR — Download Any Passenger’s Ticket · **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner · **Severity (report):** High
- **Location:** GET /ticket/:id
- **Impact:** Stolen e-tickets can be used to fly, to change bookings, or to social-engineer refunds from support.
- **Remediation:** Restrict ticket rendering to the booking owner or staff; use signed, expiring ticket links.

## Agent Desk (2)

### Fare-Rules API Missing Role Check (Commercial Data Exposure)
- **Test:** Wholesale Fare Rules Exposed to Passengers via API · **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate · **Severity (report):** Medium
- **Location:** GET /api/fare-rules
- **Impact:** Competitors and passengers see wholesale fares and commission structures — commercial damage and a roadmap for fraud.
- **Remediation:** Apply the staff role check in the API handler itself; deny by default.

### Discount-Code Creation Missing Authorization
- **Test:** Passengers Can Mint Their Own Discount Codes · **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate · **Severity (report):** High
- **Location:** POST /agent/discount
- **Impact:** Anyone can mint a 100% discount code and fly free, or sell codes to others.
- **Remediation:** Restrict discount creation to agent/admin roles server-side; cap discount percentages.

## Admin Panel (2)

### Broken Access Control on Admin User List
- **Test:** Admin User List Served to Any Logged-In User · **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner · **Severity (report):** Medium
- **Location:** GET /admin/users
- **Impact:** Every account’s name and email leaks to any registered user — a phishing and enumeration goldmine.
- **Remediation:** Require the admin role for user-directory endpoints; minimise fields returned.

### Missing CSRF Protection on Admin Fare Update
- **Test:** CSRF on Admin Fare Update · **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate · **Severity (report):** Medium
- **Location:** POST /admin/fares
- **Impact:** A malicious page visited by an admin silently reprices routes — revenue chaos that looks like an insider’s mistake.
- **Remediation:** Require anti-CSRF tokens on all admin actions; verify Origin/Referer as defence in depth.

## Platform & API (2)

### API Bearer Token Is a Predictable Encoding of the Email Address
- **Test:** Weak API Token — Base64 of the Account Email · **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Intermediate · **Severity (report):** High
- **Location:** GET /api/my-bookings (Authorization: Bearer)
- **Impact:** Anyone who knows a passenger’s email — public information — owns their API account and booking history.
- **Remediation:** Issue random opaque API tokens at login, store hashes, support revocation and expiry.

### Unauthenticated Debug Endpoint Exposes All Credentials
- **Test:** Debug Endpoint Dumps Every Account and Password · **OWASP:** A05:2021 Security Misconfiguration · **Difficulty:** Beginner · **Severity (report):** Critical
- **Location:** GET /api/debug
- **Impact:** Total credential leak in one request: every passenger and staff password, ready for takeover of the whole platform.
- **Remediation:** Remove debug endpoints from production builds; gate diagnostics behind admin auth and IP allowlists.
