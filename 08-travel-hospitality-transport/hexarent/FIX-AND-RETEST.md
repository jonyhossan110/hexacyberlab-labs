# HexaRent — Fix & Retest Guide (LAB 78)

For every scored test: the secure implementation and the regression check that proves the fix. After fixing, re-run the exploit — it must fail — then run the legitimate flow — it must still work.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass
- **Severity:** Critical
- **Fix:** Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.
- **Retest:** Repeat the original exploit (POST /login (email field)) and confirm it no longer succeeds; confirm the equivalent legitimate action still works for an authorised user; confirm the Mission Board test can no longer be triggered by the exploit.

### Missing Brute-Force Protection on Login (No Rate Limit / Lockout)
- **Severity:** High
- **Fix:** Add progressive delays, account lockout and alerting on repeated failed logins.
- **Retest:** Repeat the original exploit (POST /login) and confirm it no longer succeeds; confirm the equivalent legitimate action still works for an authorised user; confirm the Mission Board test can no longer be triggered by the exploit.

### Account Enumeration via Password-Reset and Login Error Messages
- **Severity:** Medium
- **Fix:** Return one identical, generic response for every reset/login attempt regardless of account existence.
- **Retest:** Repeat the original exploit (POST /forgot) and confirm it no longer succeeds; confirm the equivalent legitimate action still works for an authorised user; confirm the Mission Board test can no longer be triggered by the exploit.

### Demo Account Credentials Disclosed on the Public Login Page
- **Severity:** High
- **Fix:** Remove demo credentials from production; disable default accounts or force unique passwords.
- **Retest:** Repeat the original exploit (Login page + POST /login) and confirm it no longer succeeds; confirm the equivalent legitimate action still works for an authorised user; confirm the Mission Board test can no longer be triggered by the exploit.

### Password-Reset Tokens Are Predictable (Derived from User ID)
- **Severity:** High
- **Fix:** Generate reset tokens with a CSPRNG (≥128 bits), store hashed, expire quickly and allow single use.
- **Retest:** Repeat the original exploit (POST /reset) and confirm it no longer succeeds; confirm the equivalent legitimate action still works for an authorised user; confirm the Mission Board test can no longer be triggered by the exploit.

### Owner Console Trusts a Client-Supplied Role Cookie
- **Severity:** High
- **Fix:** Derive roles from the server-side session record only; ignore role claims from cookies or request data.
- **Retest:** Repeat the original exploit (GET /owner (hx_role cookie)) and confirm it no longer succeeds; confirm the equivalent legitimate action still works for an authorised user; confirm the Mission Board test can no longer be triggered by the exploit.

## Registration & Profile

### No Minimum Password Strength Enforced at Registration
- **Severity:** Medium
- **Fix:** Enforce a minimum length (≥10–12) and block common/breached passwords at registration and reset.
- **Retest:** Repeat the original exploit (POST /register) and confirm it no longer succeeds; confirm the equivalent legitimate action still works for an authorised user; confirm the Mission Board test can no longer be triggered by the exploit.

### Mass Assignment in Registration Allows Self-Assignment of Privileged Roles
- **Severity:** Critical
- **Fix:** Whitelist assignable fields server-side; set role explicitly in code, never from request data.
- **Retest:** Repeat the original exploit (POST /register (role field)) and confirm it no longer succeeds; confirm the equivalent legitimate action still works for an authorised user; confirm the Mission Board test can no longer be triggered by the exploit.

### Stored Cross-Site Scripting via Display Name
- **Severity:** High
- **Fix:** Context-encode all user-supplied output; add a Content-Security-Policy as defence in depth.
- **Retest:** Repeat the original exploit (Display name (register/profile) rendered in header & admin list) and confirm it no longer succeeds; confirm the equivalent legitimate action still works for an authorised user; confirm the Mission Board test can no longer be triggered by the exploit.

### Missing CSRF Protection on Profile Update
- **Severity:** Medium
- **Fix:** Require a per-session CSRF token on every state-changing request and validate Origin/Referer.
- **Retest:** Repeat the original exploit (POST /profile) and confirm it no longer succeeds; confirm the equivalent legitimate action still works for an authorised user; confirm the Mission Board test can no longer be triggered by the exploit.

## Search & Listings

### SQL Injection in Search Exposes Unpublished Listings
- **Severity:** High
- **Fix:** Parameterise the search query and enforce the published-status filter server-side.
- **Retest:** Repeat the original exploit (GET /search?q=) and confirm it no longer succeeds; confirm the equivalent legitimate action still works for an authorised user; confirm the Mission Board test can no longer be triggered by the exploit.

### Reflected Cross-Site Scripting via Search Term
- **Severity:** Medium
- **Fix:** HTML-encode all reflected input; validate search terms server-side.
- **Retest:** Repeat the original exploit (GET /search?q= (results heading)) and confirm it no longer succeeds; confirm the equivalent legitimate action still works for an authorised user; confirm the Mission Board test can no longer be triggered by the exploit.

## Listings Management

### Broken Function-Level Authorization — Any User Can Edit Any Listing
- **Severity:** High
- **Fix:** Verify listing ownership (or admin role) server-side before applying any listing change.
- **Retest:** Repeat the original exploit (POST /listings/<id>/edit) and confirm it no longer succeeds; confirm the equivalent legitimate action still works for an authorised user; confirm the Mission Board test can no longer be triggered by the exploit.

## Bookings

### Insecure Direct Object Reference on Booking Details
- **Severity:** High
- **Fix:** Enforce per-object party checks (renter, listing owner, staff) on the server for every booking read.
- **Retest:** Repeat the original exploit (GET /bookings/<id>) and confirm it no longer succeeds; confirm the equivalent legitimate action still works for an authorised user; confirm the Mission Board test can no longer be triggered by the exploit.

### Booking Total Trusted from Client Allows Renting at Forged Prices
- **Severity:** Critical
- **Fix:** Recompute totals server-side from listing rates and dates; reject or ignore client-supplied prices.
- **Retest:** Repeat the original exploit (POST /bookings/book (totalPrice)) and confirm it no longer succeeds; confirm the equivalent legitimate action still works for an authorised user; confirm the Mission Board test can no longer be triggered by the exploit.

### Security Deposit Amount Trusted from Client (Deposit Bypass)
- **Severity:** High
- **Fix:** Read the deposit from the listing record server-side at booking time.
- **Retest:** Repeat the original exploit (POST /bookings/book (depositAmount)) and confirm it no longer succeeds; confirm the equivalent legitimate action still works for an authorised user; confirm the Mission Board test can no longer be triggered by the exploit.

### Overlapping Bookings Accepted — No Availability Check at Booking Time
- **Severity:** High
- **Fix:** Check date-range overlaps against confirmed bookings in the same transaction that creates the booking.
- **Retest:** Repeat the original exploit (POST /bookings/book (overlapping dates)) and confirm it no longer succeeds; confirm the equivalent legitimate action still works for an authorised user; confirm the Mission Board test can no longer be triggered by the exploit.

### Booking Extension Does Not Re-Price or Bill Extra Days
- **Severity:** High
- **Fix:** Recompute the rental total on extension and require payment for added days before confirming.
- **Retest:** Repeat the original exploit (POST /bookings/<id>/extend) and confirm it no longer succeeds; confirm the equivalent legitimate action still works for an authorised user; confirm the Mission Board test can no longer be triggered by the exploit.

## Invoices & Payments

### Insecure Direct Object Reference on Invoice Details
- **Severity:** High
- **Fix:** Enforce invoice party checks server-side on every read.
- **Retest:** Repeat the original exploit (GET /invoices/<id>) and confirm it no longer succeeds; confirm the equivalent legitimate action still works for an authorised user; confirm the Mission Board test can no longer be triggered by the exploit.

### Payment Amount Trusted from Client Allows Settling Invoices for $1
- **Severity:** High
- **Fix:** Compute payable amounts server-side from the invoice record; reconcile with the payment provider before marking paid.
- **Retest:** Repeat the original exploit (POST /invoices/<id>/pay (amount)) and confirm it no longer succeeds; confirm the equivalent legitimate action still works for an authorised user; confirm the Mission Board test can no longer be triggered by the exploit.

## Owner Payouts

### Insecure Direct Object Reference Exposes Owner Payout Records
- **Severity:** High
- **Fix:** Check payout ownership server-side; restrict payout endpoints to the owning account and finance staff.
- **Retest:** Repeat the original exploit (GET /payouts/<id>) and confirm it no longer succeeds; confirm the equivalent legitimate action still works for an authorised user; confirm the Mission Board test can no longer be triggered by the exploit.

## Damage Claims

### Insecure Direct Object Reference on Damage Claim Details
- **Severity:** Medium
- **Fix:** Enforce claim party checks server-side on every read.
- **Retest:** Repeat the original exploit (GET /claims/<id>) and confirm it no longer succeeds; confirm the equivalent legitimate action still works for an authorised user; confirm the Mission Board test can no longer be triggered by the exploit.

### Broken Function-Level Authorization — Renters Can Decide Damage Claims Against Themselves
- **Severity:** Critical
- **Fix:** Require the claim's owner (or admin) server-side on the decide endpoint; log all decisions.
- **Retest:** Repeat the original exploit (POST /claims/<id>/decide) and confirm it no longer succeeds; confirm the equivalent legitimate action still works for an authorised user; confirm the Mission Board test can no longer be triggered by the exploit.

## Admin Panel

### Broken Access Control — Admin Console Accessible to Non-Admin Users
- **Severity:** High
- **Fix:** Add a server-side admin-role gate to every /admin route.
- **Retest:** Repeat the original exploit (GET /admin) and confirm it no longer succeeds; confirm the equivalent legitimate action still works for an authorised user; confirm the Mission Board test can no longer be triggered by the exploit.

### Missing CSRF Protection on Administrative User Deactivation
- **Severity:** High
- **Fix:** Require per-session CSRF tokens on all admin state changes; add confirmation for destructive actions.
- **Retest:** Repeat the original exploit (POST /admin/users/<id>/deactivate) and confirm it no longer succeeds; confirm the equivalent legitimate action still works for an authorised user; confirm the Mission Board test can no longer be triggered by the exploit.

## Platform & API

### Debug Endpoint Exposes User Accounts Including Plaintext Passwords Without Authentication
- **Severity:** Critical
- **Fix:** Remove debug endpoints from production builds; never store or return plaintext passwords.
- **Retest:** Repeat the original exploit (GET /api/debug) and confirm it no longer succeeds; confirm the equivalent legitimate action still works for an authorised user; confirm the Mission Board test can no longer be triggered by the exploit.
