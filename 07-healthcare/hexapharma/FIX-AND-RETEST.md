# HexaPharma — Fix & Retest (LAB 63)

For every test in the registry: the secure implementation and the regression check that proves the fix. Work on a COPY of the lab when practising fixes — the shipped lab stays vulnerable on purpose.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass
- **Severity:** Critical
- **Secure implementation:** Use parameterised queries / prepared statements for all database access and never concatenate user input into SQL.
- **Retest:** Repeat the original exploit from the Practice Guide. It must now fail (no test pass is recorded, the protected effect does not occur), while the legitimate user flow for the same feature still works end-to-end.

### No Rate Limiting or Account Lockout on Login
- **Severity:** High
- **Secure implementation:** Add progressive rate limiting, account lockout and breached-password checks to the login endpoint.
- **Retest:** Repeat the original exploit from the Practice Guide. It must now fail (no test pass is recorded, the protected effect does not occur), while the legitimate user flow for the same feature still works end-to-end.

### Account Enumeration via Differential Authentication Responses
- **Severity:** Medium
- **Secure implementation:** Return one generic response for all login and password-reset requests, regardless of whether the account exists.
- **Retest:** Repeat the original exploit from the Practice Guide. It must now fail (no test pass is recorded, the protected effect does not occur), while the legitimate user flow for the same feature still works end-to-end.

### Demo Account Credentials Published on the Login Page
- **Severity:** High
- **Secure implementation:** Remove demo accounts and any credential hints from production; seed test data only in non-production environments.
- **Retest:** Repeat the original exploit from the Practice Guide. It must now fail (no test pass is recorded, the protected effect does not occur), while the legitimate user flow for the same feature still works end-to-end.

### Password Reset Tokens Are Predictable (Derived from User ID)
- **Severity:** High
- **Secure implementation:** Generate reset tokens from a CSPRNG (at least 128 bits), store only a hash, and expire them quickly.
- **Retest:** Repeat the original exploit from the Practice Guide. It must now fail (no test pass is recorded, the protected effect does not occur), while the legitimate user flow for the same feature still works end-to-end.

### Role Stored in a Client Cookie and Trusted for Authorization
- **Severity:** Critical
- **Secure implementation:** Keep roles exclusively in server-side session records and ignore client-supplied role claims.
- **Retest:** Repeat the original exploit from the Practice Guide. It must now fail (no test pass is recorded, the protected effect does not occur), while the legitimate user flow for the same feature still works end-to-end.

## Registration & Profile

### Registration Accepts Single-Character Passwords
- **Severity:** Medium
- **Secure implementation:** Enforce a minimum password length (12+ recommended) and screen against known-breached passwords.
- **Retest:** Repeat the original exploit from the Practice Guide. It must now fail (no test pass is recorded, the protected effect does not occur), while the legitimate user flow for the same feature still works end-to-end.

### Mass Assignment Allows Role and Balance Manipulation
- **Severity:** High
- **Secure implementation:** Whitelist the exact fields each endpoint may update; never bind request bodies directly to user records.
- **Retest:** Repeat the original exploit from the Practice Guide. It must now fail (no test pass is recorded, the protected effect does not occur), while the legitimate user flow for the same feature still works end-to-end.

### Stored Cross-Site Scripting via Display Name
- **Severity:** High
- **Secure implementation:** Contextually encode all user-supplied output and validate names against an allowlist character set.
- **Retest:** Repeat the original exploit from the Practice Guide. It must now fail (no test pass is recorded, the protected effect does not occur), while the legitimate user flow for the same feature still works end-to-end.

### Missing CSRF Protection on Profile Update
- **Severity:** Medium
- **Secure implementation:** Issue per-session anti-CSRF tokens and verify them on every state-changing request.
- **Retest:** Repeat the original exploit from the Practice Guide. It must now fail (no test pass is recorded, the protected effect does not occur), while the legitimate user flow for the same feature still works end-to-end.

## Catalog & Search

### SQL Injection in Product Search Exposes Unlisted Inventory
- **Severity:** High
- **Secure implementation:** Parameterise search queries and enforce visibility rules (listed items only) in the data layer.
- **Retest:** Repeat the original exploit from the Practice Guide. It must now fail (no test pass is recorded, the protected effect does not occur), while the legitimate user flow for the same feature still works end-to-end.

### Reflected Cross-Site Scripting in Search Results
- **Severity:** Medium
- **Secure implementation:** HTML-encode all reflected user input and add a restrictive Content-Security-Policy.
- **Retest:** Repeat the original exploit from the Practice Guide. It must now fail (no test pass is recorded, the protected effect does not occur), while the legitimate user flow for the same feature still works end-to-end.

## Prescriptions & Files

### Missing Authorization on Prescription Approval Endpoint
- **Severity:** Critical
- **Secure implementation:** Enforce pharmacist role checks server-side on every verification action and log all decisions.
- **Retest:** Repeat the original exploit from the Practice Guide. It must now fail (no test pass is recorded, the protected effect does not occur), while the legitimate user flow for the same feature still works end-to-end.

### Broken Access Control: Prescription Queue API Available to All Customers
- **Severity:** High
- **Secure implementation:** Apply role-based authorization to API endpoints equivalent to the UI, and scope results to the caller.
- **Retest:** Repeat the original exploit from the Practice Guide. It must now fail (no test pass is recorded, the protected effect does not occur), while the legitimate user flow for the same feature still works end-to-end.

### Insecure Direct Object Reference on Prescription Files
- **Severity:** High
- **Secure implementation:** Check object ownership on every file request and use unguessable file identifiers.
- **Retest:** Repeat the original exploit from the Practice Guide. It must now fail (no test pass is recorded, the protected effect does not occur), while the legitimate user flow for the same feature still works end-to-end.

### Unrestricted File Upload with HTML Served Inline
- **Severity:** High
- **Secure implementation:** Allowlist file types, verify content, store uploads outside the web root and serve with Content-Disposition: attachment.
- **Retest:** Repeat the original exploit from the Practice Guide. It must now fail (no test pass is recorded, the protected effect does not occur), while the legitimate user flow for the same feature still works end-to-end.

### Path Traversal in Document Download
- **Severity:** High
- **Secure implementation:** Resolve the requested path, verify it stays within the allowed directory, and allowlist downloadable files.
- **Retest:** Repeat the original exploit from the Practice Guide. It must now fail (no test pass is recorded, the protected effect does not occur), while the legitimate user flow for the same feature still works end-to-end.

## Cart & Checkout

### Missing Server-Side Validation of Cart Quantities
- **Severity:** Medium
- **Secure implementation:** Validate quantities server-side against sane per-product limits before any price calculation.
- **Retest:** Repeat the original exploit from the Practice Guide. It must now fail (no test pass is recorded, the protected effect does not occur), while the legitimate user flow for the same feature still works end-to-end.

### Client-Supplied Prices Trusted at Checkout
- **Severity:** High
- **Secure implementation:** Ignore client prices; recompute all totals from server-side catalogue data at checkout.
- **Retest:** Repeat the original exploit from the Practice Guide. It must now fail (no test pass is recorded, the protected effect does not occur), while the legitimate user flow for the same feature still works end-to-end.

### Prescription Verification Bypass via Client-Supplied Flag
- **Severity:** Critical
- **Secure implementation:** Verify prescription status server-side against the prescription record for that patient and product before accepting an order.
- **Retest:** Repeat the original exploit from the Practice Guide. It must now fail (no test pass is recorded, the protected effect does not occur), while the legitimate user flow for the same feature still works end-to-end.

## Orders & Refills

### Insecure Direct Object Reference on Order Details
- **Severity:** High
- **Secure implementation:** Scope order queries to the authenticated owner (or staff roles) on every request.
- **Retest:** Repeat the original exploit from the Practice Guide. It must now fail (no test pass is recorded, the protected effect does not occur), while the legitimate user flow for the same feature still works end-to-end.

### Refill Interval Check Bypass via Client Flag
- **Severity:** High
- **Secure implementation:** Compute refill eligibility server-side from the stored next-refill date; ignore client assertions.
- **Retest:** Repeat the original exploit from the Practice Guide. It must now fail (no test pass is recorded, the protected effect does not occur), while the legitimate user flow for the same feature still works end-to-end.

## Admin Panel

### Broken Access Control on Admin Console
- **Severity:** High
- **Secure implementation:** Enforce admin-role authorization in middleware for all /admin routes.
- **Retest:** Repeat the original exploit from the Practice Guide. It must now fail (no test pass is recorded, the protected effect does not occur), while the legitimate user flow for the same feature still works end-to-end.

### State-Changing Admin Action Performed via GET Without CSRF Token
- **Severity:** Medium
- **Secure implementation:** Use POST with verified anti-CSRF tokens for all state changes, especially administrative actions.
- **Retest:** Repeat the original exploit from the Practice Guide. It must now fail (no test pass is recorded, the protected effect does not occur), while the legitimate user flow for the same feature still works end-to-end.

## Platform & API

### API Tokens Predictable (Derived from Email Address)
- **Severity:** High
- **Secure implementation:** Issue random, high-entropy API tokens, store them hashed, and support revocation.
- **Retest:** Repeat the original exploit from the Practice Guide. It must now fail (no test pass is recorded, the protected effect does not occur), while the legitimate user flow for the same feature still works end-to-end.

### Unauthenticated Debug Endpoint Exposes All User Credentials
- **Severity:** Critical
- **Secure implementation:** Remove debug endpoints from production builds and gate diagnostics behind admin auth and network restrictions.
- **Retest:** Repeat the original exploit from the Practice Guide. It must now fail (no test pass is recorded, the protected effect does not occur), while the legitimate user flow for the same feature still works end-to-end.
