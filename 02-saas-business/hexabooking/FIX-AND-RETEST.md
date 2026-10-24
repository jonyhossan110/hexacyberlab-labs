# HexaBooking — Fix & Retest Guide

For every scored test: the secure implementation, and the regression check that proves the fix. Method: apply the fix in a copy of the lab, re-run the exact exploit from PRACTICE-GUIDE.md, confirm it now FAILS, and confirm the legitimate flow still works.


## Login & Authentication

### SQL Injection Login Bypass (Critical)
- **Fix:** Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — the attack must no longer succeed and the test must no longer tick off in a fresh copy; then run the normal user flow for this feature to confirm nothing legitimate broke.

### Brute Force — No Rate Limiting or Lockout (High)
- **Fix:** Throttle attempts per account and IP, add progressive delays / lockout, and offer MFA.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — the attack must no longer succeed and the test must no longer tick off in a fresh copy; then run the normal user flow for this feature to confirm nothing legitimate broke.

### User Enumeration via Login & Forgot-Password Responses (Medium)
- **Fix:** Return one generic message ("invalid email or password") for every failure, on login and password reset alike.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — the attack must no longer succeed and the test must no longer tick off in a fresh copy; then run the normal user flow for this feature to confirm nothing legitimate broke.

### Weak / Default Credentials Still Active (High)
- **Fix:** Remove demo/seed accounts before launch, force password changes on first use, and audit for default credentials.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — the attack must no longer succeed and the test must no longer tick off in a fresh copy; then run the normal user flow for this feature to confirm nothing legitimate broke.

### Predictable Password-Reset Token (High)
- **Fix:** Generate reset tokens with a CSPRNG (≥128 bits), store only a hash, expire them quickly and make them single-use.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — the attack must no longer succeed and the test must no longer tick off in a fresh copy; then run the normal user flow for this feature to confirm nothing legitimate broke.

### Session Cookie Tampering — Client-Side Role Trusted (Critical)
- **Fix:** Keep sessions server-side (opaque random id) or sign and verify tokens server-side; always authorise from server-side records.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — the attack must no longer succeed and the test must no longer tick off in a fresh copy; then run the normal user flow for this feature to confirm nothing legitimate broke.


## Registration & Profile

### Mass Assignment — Role Elevation at Registration (High)
- **Fix:** Whitelist bindable fields explicitly on every endpoint; never accept role/privilege fields from clients.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — the attack must no longer succeed and the test must no longer tick off in a fresh copy; then run the normal user flow for this feature to confirm nothing legitimate broke.

### Weak Password Policy — 1-Character Passwords Accepted (Medium)
- **Fix:** Enforce a minimum length (≥10–12) and block common passwords at registration and password change.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — the attack must no longer succeed and the test must no longer tick off in a fresh copy; then run the normal user flow for this feature to confirm nothing legitimate broke.

### Stored XSS via Display Name (High)
- **Fix:** Contextually encode all user-controlled output; treat display names as untrusted data everywhere they render.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — the attack must no longer succeed and the test must no longer tick off in a fresh copy; then run the normal user flow for this feature to confirm nothing legitimate broke.

### CSRF on Profile Update (Medium)
- **Fix:** Verify the anti-CSRF token server-side on every state-changing request and check Origin/Referer as defence in depth.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — the attack must no longer succeed and the test must no longer tick off in a fresh copy; then run the normal user flow for this feature to confirm nothing legitimate broke.


## Businesses & Services

### Reflected XSS in Business Search (Medium)
- **Fix:** Encode all reflected input in the appropriate output context; deploy a Content-Security-Policy as a backstop.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — the attack must no longer succeed and the test must no longer tick off in a fresh copy; then run the normal user flow for this feature to confirm nothing legitimate broke.

### SQL Injection in Business Search Reveals Unlisted Businesses (High)
- **Fix:** Parameterise the search query and enforce the listed/visibility filter server-side regardless of the query.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — the attack must no longer succeed and the test must no longer tick off in a fresh copy; then run the normal user flow for this feature to confirm nothing legitimate broke.

### Service Edit IDOR — Rewriting Another Business's Prices (High)
- **Fix:** Verify ownership of the target object on every read/write; scope all queries to the caller's tenant.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — the attack must no longer succeed and the test must no longer tick off in a fresh copy; then run the normal user flow for this feature to confirm nothing legitimate broke.


## Booking & Reservations

### Double-Booking — No Server-Side Slot Capacity Check (High)
- **Fix:** Enforce slot capacity atomically in the booking transaction (unique constraint / serialised check-and-insert).
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — the attack must no longer succeed and the test must no longer tick off in a fresh copy; then run the normal user flow for this feature to confirm nothing legitimate broke.

### Booking Price Tampering — Premium Service at a Client-Chosen Price (High)
- **Fix:** Ignore client-supplied prices; always recompute price and totals from server-side catalogue data.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — the attack must no longer succeed and the test must no longer tick off in a fresh copy; then run the normal user flow for this feature to confirm nothing legitimate broke.

### Duration Tampering — Longer Appointment Than Paid For (Medium)
- **Fix:** Derive duration from the server-side service record; reject or ignore client-supplied durations.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — the attack must no longer succeed and the test must no longer tick off in a fresh copy; then run the normal user flow for this feature to confirm nothing legitimate broke.

### Reservation IDOR — Viewing Another Customer's Booking (High)
- **Fix:** Check that the requesting user owns (or staffs) the reservation on every access; use unguessable ids as defence in depth.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — the attack must no longer succeed and the test must no longer tick off in a fresh copy; then run the normal user flow for this feature to confirm nothing legitimate broke.

### Reservation Cancel IDOR — Cancelling Strangers' Appointments (High)
- **Fix:** Authorise the actor against the target reservation on every state change; log and alert on cancellations.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — the attack must no longer succeed and the test must no longer tick off in a fresh copy; then run the normal user flow for this feature to confirm nothing legitimate broke.


## Staff & Schedules

### Staff Schedule IDOR — Rewriting a Rival's Availability (High)
- **Fix:** Scope schedule reads/writes to staff of the caller's own business (or the staff member themselves).
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — the attack must no longer succeed and the test must no longer tick off in a fresh copy; then run the normal user flow for this feature to confirm nothing legitimate broke.

### Cross-Tenant Staff Assignment — Booking Dental Staff for a Salon Service (Medium)
- **Fix:** Validate that all objects in a transaction belong to the same tenant before committing.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — the attack must no longer succeed and the test must no longer tick off in a fresh copy; then run the normal user flow for this feature to confirm nothing legitimate broke.


## Payments & Promo Codes

### Promo Code Reuse — "Single-Use" Code Works Forever (Medium)
- **Fix:** Record redemptions per user server-side and reject repeat use atomically at booking time.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — the attack must no longer succeed and the test must no longer tick off in a fresh copy; then run the normal user flow for this feature to confirm nothing legitimate broke.

### Payment Status Tampering — Marking Your Own Booking "Paid" (High)
- **Fix:** Whitelist updatable fields; payment status changes only via verified payment events.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — the attack must no longer succeed and the test must no longer tick off in a fresh copy; then run the normal user flow for this feature to confirm nothing legitimate broke.


## Reviews

### Stored XSS in Business Reviews (High)
- **Fix:** Encode review content on render in all views; consider a strict allowlist sanitiser if any markup is permitted.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — the attack must no longer succeed and the test must no longer tick off in a fresh copy; then run the normal user flow for this feature to confirm nothing legitimate broke.

### Review Delete IDOR — Deleting Competitors' Reviews (Medium)
- **Fix:** Authorise deletions to the review author, the business owner, or platform admins only.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — the attack must no longer succeed and the test must no longer tick off in a fresh copy; then run the normal user flow for this feature to confirm nothing legitimate broke.


## Admin & Platform

### Admin Action Without CSRF Protection — Business Deleted via GET Link (High)
- **Fix:** Require POST + valid CSRF token + confirmation for destructive admin actions; never mutate state on GET.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — the attack must no longer succeed and the test must no longer tick off in a fresh copy; then run the normal user flow for this feature to confirm nothing legitimate broke.

### Predictable API Tokens — Cross-Tenant Data via the API (High)
- **Fix:** Issue API tokens from a CSPRNG (≥128 bits), hash them at rest, and scope each token to its tenant.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — the attack must no longer succeed and the test must no longer tick off in a fresh copy; then run the normal user flow for this feature to confirm nothing legitimate broke.
