# HexaShip — Fix & Retest Guide (LAB 76)

For every test: the secure implementation and the regression check that proves the fix.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass
- Severity: Critical
- Fix: Use parameterised queries/prepared statements everywhere; never concatenate user input into SQL.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session, no data, no state change), while the normal user flow still works.

### Missing Rate Limiting on Login Allows Brute-Force Attacks
- Severity: High
- Fix: Add per-account and per-IP rate limiting, progressive delays and lockout/alerting after repeated failures.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session, no data, no state change), while the normal user flow still works.

### User Enumeration via Differential Authentication Responses
- Severity: Medium
- Fix: Return one generic message for all login/reset outcomes, regardless of whether the account exists.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session, no data, no state change), while the normal user flow still works.

### Demo Account with Published Password Left Active
- Severity: High
- Fix: Remove demo/default accounts from production, or force a unique password and disable them after onboarding.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session, no data, no state change), while the normal user flow still works.

### Predictable Password-Reset Tokens Allow Account Takeover
- Severity: Critical
- Fix: Generate reset tokens with a CSPRNG (≥128 bits), store only a hash, expire them quickly and make them single-use.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session, no data, no state change), while the normal user flow still works.

### Client-Controlled Role Cookie Allows Privilege Escalation
- Severity: Critical
- Fix: Store roles only in the server-side session record; ignore any role claims sent by the client.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session, no data, no state change), while the normal user flow still works.

## Registration & Profile

### Registration Accepts Single-Character Passwords
- Severity: Medium
- Fix: Enforce a minimum length (≥10) and check passwords against known-breached lists.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session, no data, no state change), while the normal user flow still works.

### Mass Assignment in Registration Allows Role and Balance Forgery
- Severity: High
- Fix: Whitelist bindable fields per endpoint; set role/credit server-side only.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session, no data, no state change), while the normal user flow still works.

### Stored Cross-Site Scripting via Display Name
- Severity: High
- Fix: Output-encode all user data at render time and validate input; add a Content-Security-Policy as defence in depth.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session, no data, no state change), while the normal user flow still works.

### Missing CSRF Protection on Profile Update
- Severity: Medium
- Fix: Require a per-session CSRF token on every state-changing request and verify Origin/Referer.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session, no data, no state change), while the normal user flow still works.

## Parcels & Pricing

### Client-Supplied Price Trusted in Parcel Creation
- Severity: High
- Fix: Compute all prices server-side from weight and service; ignore client-posted amounts.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session, no data, no state change), while the normal user flow still works.

### Service Level Not Re-Priced Server-Side Allows Free Express Upgrades
- Severity: High
- Fix: Price the parcel server-side from the chosen service level and weight at order time.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session, no data, no state change), while the normal user flow still works.

### Missing Range Validation Allows Negative-Weight Parcels and Negative Totals
- Severity: Medium
- Fix: Validate weight/quantity as positive numbers within sane bounds on the server.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session, no data, no state change), while the normal user flow still works.

## Tracking & Delivery

### Insecure Direct Object Reference on Tracking Page Exposes All Shipments
- Severity: High
- Fix: Use unguessable tracking tokens and verify the requester owns (or is the recipient of) the parcel.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session, no data, no state change), while the normal user flow still works.

### Missing Authorization on Tracking-Event Endpoint Allows Forged Delivery Status
- Severity: High
- Fix: Restrict tracking-event creation to verified staff roles and audit every status change.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session, no data, no state change), while the normal user flow still works.

### Delivery Address Changeable After Dispatch
- Severity: High
- Fix: Lock destination changes once a parcel leaves the depot; route exceptions through staff approval.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session, no data, no state change), while the normal user flow still works.

## Labels & Invoices

### Shipping Labels Accessible Without Ownership Check (IDOR)
- Severity: High
- Fix: Verify parcel ownership before serving labels; use signed, expiring document URLs.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session, no data, no state change), while the normal user flow still works.

### Invoice Pages Lack Ownership Verification (IDOR)
- Severity: High
- Fix: Scope every invoice query to the authenticated owner; use non-sequential public references.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session, no data, no state change), while the normal user flow still works.

### Client-Controlled Payment Amount and Settlement Flag on Invoices
- Severity: Critical
- Fix: Verify paid amount server-side against the invoice total via the payment provider webhook; never accept client settlement claims.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session, no data, no state change), while the normal user flow still works.

## Address Book

### Address Book Entries Editable by Any Customer (IDOR)
- Severity: High
- Fix: Check entry ownership on view and edit; scope all address queries to the session user.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session, no data, no state change), while the normal user flow still works.

## Search

### SQL Injection in Parcel Search Returns All Customers’ Shipments
- Severity: Critical
- Fix: Parameterise search queries and scope results to the authenticated user.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session, no data, no state change), while the normal user flow still works.

### Reflected Cross-Site Scripting in Search Results
- Severity: Medium
- Fix: HTML-encode all reflected values; validate search input and deploy a CSP.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session, no data, no state change), while the normal user flow still works.

## Staff & Admin Panel

### Staff Console Accessible to Regular Customers
- Severity: Critical
- Fix: Enforce staff-role checks server-side on every staff route.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session, no data, no state change), while the normal user flow still works.

### Missing CSRF Protection on Admin User Deactivation
- Severity: High
- Fix: Require per-session CSRF tokens on all admin actions and re-confirm destructive operations.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session, no data, no state change), while the normal user flow still works.

## Platform & API

### API Tokens Are Deterministic (base64 of Email) and Forgeable
- Severity: High
- Fix: Issue random, high-entropy API keys, store hashes, and support rotation/revocation.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session, no data, no state change), while the normal user flow still works.

### Unauthenticated Debug Endpoint Dumps Users and Passwords
- Severity: Critical
- Fix: Remove debug endpoints from production builds; gate diagnostics behind admin auth and network restrictions.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session, no data, no state change), while the normal user flow still works.
