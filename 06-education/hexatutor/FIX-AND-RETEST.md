# HexaTutor — Fix & Retest Guide

For every test in the registry: the secure implementation (the fix) and the retest that proves the exploit no longer works.

## Login & Authentication

### SQL Injection in Login Allows Authentication Bypass
- **Severity:** Critical
- **Secure implementation:** Use parameterised queries/prepared statements everywhere; never concatenate user input into SQL.
- **Retest:** Repeat the original exploit exactly as described in VULNERABILITIES.md ("SQL Injection — Login Bypass"). After the fix it must fail — no session, no data, no state change — and the corresponding test in a fixed build must NOT flip to done. Also re-run the legitimate flow to confirm the feature still works for real users.

### Missing Rate Limiting and Account Lockout on Login
- **Severity:** High
- **Secure implementation:** Add progressive delays/lockout per account and IP, CAPTCHA after repeated failures, and consider MFA.
- **Retest:** Repeat the original exploit exactly as described in VULNERABILITIES.md ("Brute Force — No Rate Limiting or Lockout"). After the fix it must fail — no session, no data, no state change — and the corresponding test in a fixed build must NOT flip to done. Also re-run the legitimate flow to confirm the feature still works for real users.

### User Enumeration Through Differential Forgot-Password Responses
- **Severity:** Medium
- **Secure implementation:** Return one identical generic message for every forgot-password submission, regardless of whether the account exists.
- **Retest:** Repeat the original exploit exactly as described in VULNERABILITIES.md ("User Enumeration via Forgot Password"). After the fix it must fail — no session, no data, no state change — and the corresponding test in a fixed build must NOT flip to done. Also re-run the legitimate flow to confirm the feature still works for real users.

### Default Administrator Credentials Were Never Changed
- **Severity:** Critical
- **Secure implementation:** Force a password change on first login, remove demo accounts from production, and audit for shipped defaults.
- **Retest:** Repeat the original exploit exactly as described in VULNERABILITIES.md ("Default Administrator Credentials Still Active"). After the fix it must fail — no session, no data, no state change — and the corresponding test in a fixed build must NOT flip to done. Also re-run the legitimate flow to confirm the feature still works for real users.

### Password-Reset Tokens Are Predictable (Derived From User ID)
- **Severity:** High
- **Secure implementation:** Generate reset tokens with a CSPRNG (≥128 bits), store only a hash, expire them quickly and make them single-use.
- **Retest:** Repeat the original exploit exactly as described in VULNERABILITIES.md ("Predictable Password-Reset Token"). After the fix it must fail — no session, no data, no state change — and the corresponding test in a fixed build must NOT flip to done. Also re-run the legitimate flow to confirm the feature still works for real users.

### Privilege Escalation via Client-Controlled Role Cookie
- **Severity:** Critical
- **Secure implementation:** Keep roles in the server-side session only; never trust role or privilege values supplied by the client.
- **Retest:** Repeat the original exploit exactly as described in VULNERABILITIES.md ("Session Role Cookie Tampering"). After the fix it must fail — no session, no data, no state change — and the corresponding test in a fixed build must NOT flip to done. Also re-run the legitimate flow to confirm the feature still works for real users.

## Registration & Profile

### Mass Assignment in Registration Allows Role Escalation
- **Severity:** High
- **Secure implementation:** Whitelist bindable fields on every endpoint; set role and other privileged fields server-side only.
- **Retest:** Repeat the original exploit exactly as described in VULNERABILITIES.md ("Mass Assignment — Self-Assigned Admin Role"). After the fix it must fail — no session, no data, no state change — and the corresponding test in a fixed build must NOT flip to done. Also re-run the legitimate flow to confirm the feature still works for real users.

### No Minimum Password Strength Enforced at Registration
- **Severity:** Medium
- **Secure implementation:** Enforce a minimum length (≥10–12) and screen against known-breached password lists.
- **Retest:** Repeat the original exploit exactly as described in VULNERABILITIES.md ("Weak Password Policy"). After the fix it must fail — no session, no data, no state change — and the corresponding test in a fixed build must NOT flip to done. Also re-run the legitimate flow to confirm the feature still works for real users.

### Stored Cross-Site Scripting via Display Name Field
- **Severity:** High
- **Secure implementation:** Contextually escape all user-controlled output and add a Content-Security-Policy; validate input on the server.
- **Retest:** Repeat the original exploit exactly as described in VULNERABILITIES.md ("Stored XSS in Display Name"). After the fix it must fail — no session, no data, no state change — and the corresponding test in a fixed build must NOT flip to done. Also re-run the legitimate flow to confirm the feature still works for real users.

### Cross-Site Request Forgery on Profile Update
- **Severity:** Medium
- **Secure implementation:** Require a per-session anti-CSRF token on all state-changing requests and set SameSite cookies.
- **Retest:** Repeat the original exploit exactly as described in VULNERABILITIES.md ("CSRF on Profile Update"). After the fix it must fail — no session, no data, no state change — and the corresponding test in a fixed build must NOT flip to done. Also re-run the legitimate flow to confirm the feature still works for real users.

## Tutor Search & Profiles

### SQL Injection in Tutor Search
- **Severity:** High
- **Secure implementation:** Parameterise all queries, including search and filter parameters; apply least-privilege database accounts.
- **Retest:** Repeat the original exploit exactly as described in VULNERABILITIES.md ("SQL Injection in Tutor Search"). After the fix it must fail — no session, no data, no state change — and the corresponding test in a fixed build must NOT flip to done. Also re-run the legitimate flow to confirm the feature still works for real users.

### Reflected Cross-Site Scripting in Search Results
- **Severity:** Medium
- **Secure implementation:** Escape reflected values in HTML context and deploy a Content-Security-Policy.
- **Retest:** Repeat the original exploit exactly as described in VULNERABILITIES.md ("Reflected XSS in Search"). After the fix it must fail — no session, no data, no state change — and the corresponding test in a fixed build must NOT flip to done. Also re-run the legitimate flow to confirm the feature still works for real users.

### Excessive Data Exposure — Private Contact Fields in Public API
- **Severity:** Medium
- **Secure implementation:** Return explicit DTOs with only public fields; require authentication and authorisation for private data.
- **Retest:** Repeat the original exploit exactly as described in VULNERABILITIES.md ("Tutor Private Data Exposure via Profile API"). After the fix it must fail — no session, no data, no state change — and the corresponding test in a fixed build must NOT flip to done. Also re-run the legitimate flow to confirm the feature still works for real users.

## Session Booking

### Client-Side Price Tampering in Session Booking
- **Severity:** High
- **Secure implementation:** Ignore client-supplied prices; always price from server-side catalogue data at booking time.
- **Retest:** Repeat the original exploit exactly as described in VULNERABILITIES.md ("Hourly Rate Tampering at Booking"). After the fix it must fail — no session, no data, no state change — and the corresponding test in a fixed build must NOT flip to done. Also re-run the legitimate flow to confirm the feature still works for real users.

### Session Booking Does Not Verify Payment
- **Severity:** High
- **Secure implementation:** Create bookings in a pending state and confirm them only after verified payment; check payment server-side.
- **Retest:** Repeat the original exploit exactly as described in VULNERABILITIES.md ("Booking Confirmed Without Payment"). After the fix it must fail — no session, no data, no state change — and the corresponding test in a fixed build must NOT flip to done. Also re-run the legitimate flow to confirm the feature still works for real users.

### Insecure Direct Object Reference — Cancelling Other Users’ Sessions
- **Severity:** High
- **Secure implementation:** Enforce ownership/authorisation checks on every object-level operation, server-side.
- **Retest:** Repeat the original exploit exactly as described in VULNERABILITIES.md ("Cancel Another Student’s Session (IDOR)"). After the fix it must fail — no session, no data, no state change — and the corresponding test in a fixed build must NOT flip to done. Also re-run the legitimate flow to confirm the feature still works for real users.

### Missing Quantity Validation Allows Negative Booking Totals
- **Severity:** Medium
- **Secure implementation:** Validate quantities server-side (integer, ≥1, ≤ a sane maximum) before pricing or persisting.
- **Retest:** Repeat the original exploit exactly as described in VULNERABILITIES.md ("Negative Hours Quantity Tampering"). After the fix it must fail — no session, no data, no state change — and the corresponding test in a fixed build must NOT flip to done. Also re-run the legitimate flow to confirm the feature still works for real users.

## Reviews & Ratings

### Missing Eligibility Check Allows Fake Reviews
- **Severity:** Medium
- **Secure implementation:** Verify a completed session between reviewer and tutor server-side before accepting a review.
- **Retest:** Repeat the original exploit exactly as described in VULNERABILITIES.md ("Review Without Any Completed Session"). After the fix it must fail — no session, no data, no state change — and the corresponding test in a fixed build must NOT flip to done. Also re-run the legitimate flow to confirm the feature still works for real users.

### Unvalidated Rating Range Corrupts Tutor Averages
- **Severity:** Medium
- **Secure implementation:** Validate rating server-side as an integer between 1 and 5; reject anything outside the domain.
- **Retest:** Repeat the original exploit exactly as described in VULNERABILITIES.md ("Rating Value Manipulation (Out of Range)"). After the fix it must fail — no session, no data, no state change — and the corresponding test in a fixed build must NOT flip to done. Also re-run the legitimate flow to confirm the feature still works for real users.

## Messaging

### Insecure Direct Object Reference — Private Message Threads
- **Severity:** High
- **Secure implementation:** Check thread participation on every message read/write; return 404/403 for non-participants.
- **Retest:** Repeat the original exploit exactly as described in VULNERABILITIES.md ("Reading Another Pair’s Messages (IDOR)"). After the fix it must fail — no session, no data, no state change — and the corresponding test in a fixed build must NOT flip to done. Also re-run the legitimate flow to confirm the feature still works for real users.

### Stored Cross-Site Scripting in Private Messages
- **Severity:** High
- **Secure implementation:** Escape all message content on render, sanitise any allowed markup, and add a Content-Security-Policy.
- **Retest:** Repeat the original exploit exactly as described in VULNERABILITIES.md ("Stored XSS in Message Body"). After the fix it must fail — no session, no data, no state change — and the corresponding test in a fixed build must NOT flip to done. Also re-run the legitimate flow to confirm the feature still works for real users.

## Earnings & Payouts

### Insecure Direct Object Reference — Tutor Earnings
- **Severity:** High
- **Secure implementation:** Derive the tutor identity from the session; ignore client-supplied ids for private financial data.
- **Retest:** Repeat the original exploit exactly as described in VULNERABILITIES.md ("Another Tutor’s Earnings Exposed (IDOR)"). After the fix it must fail — no session, no data, no state change — and the corresponding test in a fixed build must NOT flip to done. Also re-run the legitimate flow to confirm the feature still works for real users.

### Missing Balance Verification on Payout Requests
- **Severity:** High
- **Secure implementation:** Check the available balance server-side inside the payout transaction; lock funds atomically.
- **Retest:** Repeat the original exploit exactly as described in VULNERABILITIES.md ("Payout Request Above Balance Accepted"). After the fix it must fail — no session, no data, no state change — and the corresponding test in a fixed build must NOT flip to done. Also re-run the legitimate flow to confirm the feature still works for real users.

## Admin Panel

### Cross-Site Request Forgery on Administrative Role Changes
- **Severity:** High
- **Secure implementation:** Require anti-CSRF tokens on all admin mutations, SameSite=Lax/Strict cookies, and re-authentication for sensitive actions.
- **Retest:** Repeat the original exploit exactly as described in VULNERABILITIES.md ("CSRF on Admin User-Role Change"). After the fix it must fail — no session, no data, no state change — and the corresponding test in a fixed build must NOT flip to done. Also re-run the legitimate flow to confirm the feature still works for real users.

## Platform & API

### API Authentication Tokens Are Predictable (Base64 of Email)
- **Severity:** High
- **Secure implementation:** Issue random opaque tokens (≥128 bits) stored server-side, or signed JWTs with a strong secret and expiry.
- **Retest:** Repeat the original exploit exactly as described in VULNERABILITIES.md ("Predictable API Token (Base64 of Email)"). After the fix it must fail — no session, no data, no state change — and the corresponding test in a fixed build must NOT flip to done. Also re-run the legitimate flow to confirm the feature still works for real users.

### Unauthenticated Debug Endpoint Exposes All Credentials
- **Severity:** Critical
- **Secure implementation:** Remove debug endpoints from production builds; gate any diagnostics behind admin auth and network restrictions.
- **Retest:** Repeat the original exploit exactly as described in VULNERABILITIES.md ("Debug Endpoint Dumps the Whole User Table"). After the fix it must fail — no session, no data, no state change — and the corresponding test in a fixed build must NOT flip to done. Also re-run the legitimate flow to confirm the feature still works for real users.
