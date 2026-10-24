# HexaRent — Vulnerability Map (LAB 78)

All **26 scored tests**, grouped by feature. Every entry is a real, working vulnerability in the app; a test completes only when the exploit's effect is detected server-side.

## Login & Authentication

### SQL Injection Login Bypass
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Beginner
- **Location:** POST /login (email field)
- **How it works:** Go to the login form and put this in the Email field: ' OR '1'='1 (any password). The query is built by string concatenation, so the condition is always true and you are logged in as the first account (the admin).
- **Business impact:** On a real rental platform this means an attacker walks straight into the admin account — every renter's identity details, booking, deposit and payout is exposed in one request.

### Brute Force — No Rate Limiting or Lockout
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /login
- **How it works:** Pick one account (e.g. the demo renter) and submit 10 wrong passwords in a row. Nothing slows down or locks — the test passes when the 10th failure is still accepted for processing.
- **Business impact:** Attackers can grind through passwords for owner accounts overnight, then drain payouts and harvest renter data.

### User Enumeration via Divergent Responses
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /forgot
- **How it works:** Use the Forgot Password page. A registered email gets "reset link sent"; an unknown email gets a different "no account" message. Probe 5 distinct emails to map which accounts exist.
- **Business impact:** An attacker confirms which property owners and renters have accounts, then aims phishing and password attacks only at real targets.

### Demo Credentials Published on the Login Page
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** Login page + POST /login
- **How it works:** The login page prints a demo renter account under the form. Sign in with exactly those published credentials.
- **Business impact:** Anyone on the internet can sign in as a real renter and start exploring bookings, invoices and personal data — no skill required.

### Predictable Password-Reset Token
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Intermediate
- **Location:** POST /reset
- **How it works:** Tokens follow a formula: HR + (userId × 149 + 37). User ids are visible in the app (admin is 1, renters are 5 and 6). Compute a token for an account you never requested a reset for and use it on the reset page.
- **Business impact:** An attacker resets the platform admin's password using only the admin's email and id — full takeover without touching the inbox.

### Role Cookie Tampering — Client-Supplied Role Trusted
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** GET /owner (hx_role cookie)
- **How it works:** Log in as the demo renter, then set your browser cookie hx_role=owner (dev tools or curl -b). Open /owner — the owner console trusts the cookie, not your real account.
- **Business impact:** Any renter can promote themselves to "owner" in their own browser and open owner-only screens — listings, bookings and payout data included.

## Registration & Profile

### Weak Password Policy — 1-Character Passwords Accepted
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /register
- **How it works:** Register a new account with a password of one character. The account is created and works — the policy accepts anything.
- **Business impact:** Renters who pick tiny passwords get their accounts — and their upcoming trip details — guessed in seconds.

### Mass Assignment — Role Set at Registration
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /register (role field)
- **How it works:** Intercept the registration POST and add a field role=owner (or role=admin). The server binds every field it receives, so your new account is created with that role.
- **Business impact:** Anyone can register themselves as a property owner or admin of the platform — instant insider access to listings, bookings and payouts.

### Stored XSS in Display Name
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Beginner
- **Location:** Display name (register/profile) rendered in header & admin list
- **How it works:** Set your display name (registration or profile) to a payload such as <script>alert(1)</script>. It is stored and rendered unescaped in the header and owner/admin views.
- **Business impact:** A malicious "renter name" can run scripts in property owners' browsers — stealing sessions and acting as the owner.

### CSRF on Profile Update
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /profile
- **How it works:** While logged in, send the profile-update POST from a different origin (curl with a foreign Origin header, or omit the site origin marker field). The change is applied — no CSRF token exists.
- **Business impact:** A booby-trapped page in an owner's browser could silently change profile data (or worse) using their logged-in session.

## Search & Listings

### SQL Injection in Listing Search — Hidden Draft Listings Leaked
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Intermediate
- **Location:** GET /search?q=
- **How it works:** Use the search box with the term ' OR '1'='1. The string-built query returns every listing, including the DRAFT Mountain Villa that never appears in normal browsing.
- **Business impact:** Attackers enumerate the platform's entire inventory — including unlaunched listings, internal pricing drafts and delisted properties.

### Reflected XSS in Search Results
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Beginner
- **Location:** GET /search?q= (results heading)
- **How it works:** Search for a payload such as <script>alert(1)</script>. The results heading prints your term back completely unescaped.
- **Business impact:** A crafted search link runs script in a victim's browser — session theft and fake "support" pages under the real brand.

## Listings Management

### Edit Another Owner's Listing Price
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /listings/<id>/edit
- **How it works:** Log in as the demo renter (or the other owner) and POST to /listings/2/edit with dailyRate=1. The listing belongs to Marcus, but the price changes — the endpoint never checks ownership.
- **Business impact:** A rival owner (or any renter) can slash or inflate a competitor's prices overnight — bookings, trust and revenue all take the hit.

## Bookings

### Booking IDOR — View Another Renter's Booking
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /bookings/<id>
- **How it works:** Log in as the demo renter and open /bookings/2 — it is Tom's booking on a listing you do not own, yet it is served to you. Sequential ids make every booking enumerable.
- **Business impact:** Strangers can browse who rented what, where, and when — travel plans and home addresses of renters leak one id at a time.

### Daily-Rate Tampering — Total Price Trusted from the Client
- **OWASP:** A04:2021 – Insecure Design
- **Difficulty:** Beginner
- **Location:** POST /bookings/book (totalPrice)
- **How it works:** Start a booking for the Beach Apartment (3 nights = $360) and intercept the POST: change totalPrice to 1. The booking is created — and invoiced — at $1.
- **Business impact:** Every renter can book any property for $1 — direct, unlimited revenue loss for owners and the platform.

### Security Deposit Waived by Parameter Forgery
- **OWASP:** A04:2021 – Insecure Design
- **Difficulty:** Intermediate
- **Location:** POST /bookings/book (depositAmount)
- **How it works:** Intercept the booking POST and set depositAmount=0. The booking is confirmed and the invoice shows a $0 deposit — the platform holds nothing against damage.
- **Business impact:** Renters skip the security deposit entirely; when damage happens, owners have nothing to claim against.

### Double Booking — Availability Calendar Never Checked
- **OWASP:** A04:2021 – Insecure Design
- **Difficulty:** Intermediate
- **Location:** POST /bookings/book (overlapping dates)
- **How it works:** The Beach Apartment (listing 1) is booked 10–12 Nov 2026. Book it again for 11–13 Nov 2026 — the system happily confirms an overlapping booking.
- **Business impact:** Two renters arrive the same night for one apartment — refunds, chargebacks and reputation damage follow.

### Free Rental Extension — Extra Days Without Payment
- **OWASP:** A04:2021 – Insecure Design
- **Difficulty:** Intermediate
- **Location:** POST /bookings/<id>/extend
- **How it works:** Open your own booking and POST to /bookings/<id>/extend with a newEnd five days later. The booking stretches — total price and invoice do not move.
- **Business impact:** Renters stay extra nights for free while owners lose both the rent and the chance to re-let those dates.

## Invoices & Payments

### Invoice IDOR — View Another Party's Invoice
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /invoices/<id>
- **How it works:** As the demo renter, open /invoices/3 — the invoice for Tom's booking, served without any party check.
- **Business impact:** Renters can read each other's invoices — names, properties, dates and amounts — a privacy and fraud-enabling leak.

### Invoice Payment Amount Tampering — Settles in Full for $1
- **OWASP:** A04:2021 – Insecure Design
- **Difficulty:** Beginner
- **Location:** POST /invoices/<id>/pay (amount)
- **How it works:** Open your unpaid invoice ($660) and intercept the pay POST: change amount to 1. The invoice is marked PAID in full.
- **Business impact:** Every renter can settle every invoice for $1 — rent and deposits alike vanish from the platform's books.

## Owner Payouts

### Payout IDOR — View Another Owner's Payout
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** GET /payouts/<id>
- **How it works:** Log in as any non-admin account that does not own payout 2 (e.g. the demo renter) and open /payouts/2. Marcus's payout amount and status are served without an ownership check.
- **Business impact:** Competitors learn exactly what each owner earns and when — and payout details are prime material for payment-diversion fraud.

## Damage Claims

### Damage Claim IDOR — View Another Party's Claim
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /claims/<id>
- **How it works:** As the demo renter, open /claims/1. It concerns Tom's camera rental — you are not a party — yet the full claim renders.
- **Business impact:** Renters and owners can browse each other's disputes — amounts, accusations and outcomes — fuelling retaliation and fraud.

### Renter Approves Their Own Damage Claim via the Owner Endpoint
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Advanced
- **Location:** POST /claims/<id>/decide
- **How it works:** Claim 2 is Olivia's claim against Rita for a broken vase. Log in as Rita and POST to /claims/2/decide with decision=rejected. The claim dies — decided by the very person it was against.
- **Business impact:** Any renter can reject every damage claim against themselves — the deposit-protection system becomes worthless for owners.

## Admin Panel

### Admin Panel Open to Any Logged-In User
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /admin
- **How it works:** Log in as the demo renter and open /admin. The admin console renders — it never checks your role.
- **Business impact:** Any renter can open the admin console and browse every account on the platform.

### CSRF on Admin User Deactivation
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /admin/users/<id>/deactivate
- **How it works:** Send the deactivation POST for a user from a foreign Origin (or without the site's origin marker) using an admin-capable session. The user is deactivated — no CSRF token exists.
- **Business impact:** One booby-trapped page could deactivate the platform's owners and staff — a denial of service against the whole marketplace.

## Platform & API

### Unauthenticated Debug Endpoint Exposes All Accounts
- **OWASP:** A05:2021 – Security Misconfiguration
- **Difficulty:** Beginner
- **Location:** GET /api/debug
- **How it works:** Open /api/debug in a browser with no session at all. It dumps every user account including passwords as JSON.
- **Business impact:** The entire platform's credentials — admin included — are one unauthenticated request away. Game over.
