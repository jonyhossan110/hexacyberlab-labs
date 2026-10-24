# HexaEnergy (LAB 106) — Fix & Retest

For every test: the secure implementation, then the regression retest that must FAIL the exploit after the fix.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass (Critical)
- **Secure implementation:** Use parameterised queries / prepared statements for all database access and never concatenate user input into SQL.
- **Regression test:** Replay the original exploit for "SQL injection login bypass" (POST /login). After the fix it must no longer succeed — the test condition (the real effect) must be impossible — while legitimate use of the feature keeps working.

### Missing Rate Limiting on Authentication Endpoint (High)
- **Secure implementation:** Add progressive delays, lockout after repeated failures and CAPTCHA / MFA challenges on the login endpoint.
- **Regression test:** Replay the original exploit for "Brute force — no rate limit or lockout" (POST /login). After the fix it must no longer succeed — the test condition (the real effect) must be impossible — while legitimate use of the feature keeps working.

### Account Enumeration via Differential Authentication Responses (Medium)
- **Secure implementation:** Return one generic message ("invalid credentials" / "if the account exists…") for all authentication outcomes.
- **Regression test:** Replay the original exploit for "User enumeration via login and forgot-password responses" (POST /login, POST /forgot). After the fix it must no longer succeed — the test condition (the real effect) must be impossible — while legitimate use of the feature keeps working.

### Demo Credentials Published and Active on Production Login (High)
- **Secure implementation:** Remove demo accounts from production, rotate any shared credentials and never print credentials on public pages.
- **Regression test:** Replay the original exploit for "Published demo credentials grant a live account" (Login page / POST /login). After the fix it must no longer succeed — the test condition (the real effect) must be impossible — while legitimate use of the feature keeps working.

### Predictable Password Reset Token Allows Account Takeover (Critical)
- **Secure implementation:** Generate reset tokens from a CSPRNG (≥128 bits), store only a hash, expire them quickly and bind them to a single use.
- **Regression test:** Replay the original exploit for "Predictable password-reset token" (POST /reset). After the fix it must no longer succeed — the test condition (the real effect) must be impossible — while legitimate use of the feature keeps working.

### Client-Side Role Cookie Trusted for Authorization (High)
- **Secure implementation:** Store the role in the server-side session only and authorize every request against it; ignore role claims from cookies.
- **Regression test:** Replay the original exploit for "Role cookie tampering reaches the staff console" (GET /staff). After the fix it must no longer succeed — the test condition (the real effect) must be impossible — while legitimate use of the feature keeps working.

## Registration & Profile

### No Minimum Password Strength Enforced at Registration (Medium)
- **Secure implementation:** Enforce a minimum length (≥10) and block common/breached passwords at registration and password change.
- **Regression test:** Replay the original exploit for "Weak password policy accepts 1-character passwords" (POST /register). After the fix it must no longer succeed — the test condition (the real effect) must be impossible — while legitimate use of the feature keeps working.

### Mass Assignment in Registration Allows Privilege Escalation (Critical)
- **Secure implementation:** Whitelist exactly the fields a request may set (name, email, password); assign role and balance server-side only.
- **Regression test:** Replay the original exploit for "Mass assignment — role and balance set at registration" (POST /register). After the fix it must no longer succeed — the test condition (the real effect) must be impossible — while legitimate use of the feature keeps working.

### Stored Cross-Site Scripting via Display Name (High)
- **Secure implementation:** Contextually encode all user-controlled output and add a Content-Security-Policy as defence in depth.
- **Regression test:** Replay the original exploit for "Stored XSS in display name" (POST /register, POST /profile). After the fix it must no longer succeed — the test condition (the real effect) must be impossible — while legitimate use of the feature keeps working.

### Missing CSRF Protection on Profile Update (Medium)
- **Secure implementation:** Require a per-session CSRF token on every state-changing form and verify Origin/Referer as a secondary check.
- **Regression test:** Replay the original exploit for "CSRF on profile update" (POST /profile). After the fix it must no longer succeed — the test condition (the real effect) must be impossible — while legitimate use of the feature keeps working.

## Meters & Readings

### Insecure Direct Object Reference on Meter Records (High)
- **Secure implementation:** Enforce per-object ownership checks on the server for every meter request.
- **Regression test:** Replay the original exploit for "Meter IDOR — another customer's meter and address" (GET /meter/:id). After the fix it must no longer succeed — the test condition (the real effect) must be impossible — while legitimate use of the feature keeps working.

### Meter Readings Accepted Below Previous Reading (Billing Fraud) (High)
- **Secure implementation:** Reject readings below the last recorded value and flag anomalies for manual review.
- **Regression test:** Replay the original exploit for "Backwards meter reading accepted — usage erased" (POST /meter/:id/reading). After the fix it must no longer succeed — the test condition (the real effect) must be impossible — while legitimate use of the feature keeps working.

### Missing Ownership Check on Meter Reading Submission (High)
- **Secure implementation:** Verify the meter belongs to the session user (or an authorized reader) before accepting readings.
- **Regression test:** Replay the original exploit for "Submit a reading for someone else's meter" (POST /meter/:id/reading). After the fix it must no longer succeed — the test condition (the real effect) must be impossible — while legitimate use of the feature keeps working.

### Server Trusts Client-Supplied Usage for Billing (High)
- **Secure implementation:** Compute usage server-side as (new reading − last reading); ignore any client-supplied usage or amount.
- **Regression test:** Replay the original exploit for "Client-supplied usage figure overrides the real consumption" (POST /meter/:id/reading). After the fix it must no longer succeed — the test condition (the real effect) must be impossible — while legitimate use of the feature keeps working.

### Unlisted Internal Tariff Assignable by Customers (High)
- **Secure implementation:** Only allow assignment of published tariffs to customer meters and require staff approval for internal tariffs.
- **Regression test:** Replay the original exploit for "Switch a meter onto the internal unlisted tariff" (POST /meter/:id/tariff). After the fix it must no longer succeed — the test condition (the real effect) must be impossible — while legitimate use of the feature keeps working.

## Search & Catalogue

### SQL Injection in Search Exposes Unlisted Records (High)
- **Secure implementation:** Parameterise search queries and escape LIKE wildcards in user input.
- **Regression test:** Replay the original exploit for "SQL injection in search dumps unlisted tariffs" (GET /search?q=). After the fix it must no longer succeed — the test condition (the real effect) must be impossible — while legitimate use of the feature keeps working.

### Reflected Cross-Site Scripting in Search (Medium)
- **Secure implementation:** HTML-encode the search term wherever it is reflected and validate input length/characters.
- **Regression test:** Replay the original exploit for "Reflected XSS in search results" (GET /search?q=). After the fix it must no longer succeed — the test condition (the real effect) must be impossible — while legitimate use of the feature keeps working.

## Billing & Invoices

### Insecure Direct Object Reference on Invoices (High)
- **Secure implementation:** Check invoice ownership against the session user on every invoice view and payment.
- **Regression test:** Replay the original exploit for "Invoice IDOR — another customer's bill" (GET /invoice/:id). After the fix it must no longer succeed — the test condition (the real effect) must be impossible — while legitimate use of the feature keeps working.

### Invoice Settled for Arbitrary Client-Supplied Amount (Critical)
- **Secure implementation:** Settle invoices only from verified payment-provider callbacks matching the full invoice amount.
- **Regression test:** Replay the original exploit for "Paying $1 settles a full invoice" (POST /invoice/:id/pay). After the fix it must no longer succeed — the test condition (the real effect) must be impossible — while legitimate use of the feature keeps working.

### Negative Payment Amount Accepted and Credited (High)
- **Secure implementation:** Reject non-positive payment amounts and validate all monetary inputs server-side.
- **Regression test:** Replay the original exploit for "Negative payment credits the wallet" (POST /invoice/:id/pay). After the fix it must no longer succeed — the test condition (the real effect) must be impossible — while legitimate use of the feature keeps working.

## Connections & Support

### Insecure Direct Object Reference on Service Connection Requests (Medium)
- **Secure implementation:** Enforce ownership checks on connection request views and updates.
- **Regression test:** Replay the original exploit for "Service connection request IDOR" (GET /connection/:id). After the fix it must no longer succeed — the test condition (the real effect) must be impossible — while legitimate use of the feature keeps working.

### Missing Authorization on Support Ticket Closure (Medium)
- **Secure implementation:** Only the ticket owner or support staff may change ticket state; verify on the server.
- **Regression test:** Replay the original exploit for "Close another customer's support ticket" (POST /ticket/:id/close). After the fix it must no longer succeed — the test condition (the real effect) must be impossible — while legitimate use of the feature keeps working.

## Admin Panel

### Broken Access Control on Admin Panel (Password Disclosure) (Critical)
- **Secure implementation:** Require an admin role check on all admin routes and never render password material.
- **Regression test:** Replay the original exploit for "Admin panel served to any logged-in customer" (GET /admin). After the fix it must no longer succeed — the test condition (the real effect) must be impossible — while legitimate use of the feature keeps working.

### Missing CSRF Protection on Admin Tariff Update (High)
- **Secure implementation:** Add per-session CSRF tokens to all admin forms and verify them server-side.
- **Regression test:** Replay the original exploit for "CSRF on admin tariff update" (POST /admin/tariff/update). After the fix it must no longer succeed — the test condition (the real effect) must be impossible — while legitimate use of the feature keeps working.

## Platform & API

### Weak API Authentication (Base64 Email as API Key) (High)
- **Secure implementation:** Issue random per-user API tokens, store them hashed and support revocation/rotation.
- **Regression test:** Replay the original exploit for "API key is just base64(email)" (GET /api/invoices (X-API-Key)). After the fix it must no longer succeed — the test condition (the real effect) must be impossible — while legitimate use of the feature keeps working.

### Unauthenticated Debug Endpoint Exposes All Credentials (Critical)
- **Secure implementation:** Remove debug endpoints from production builds and gate diagnostics behind admin auth and IP allowlists.
- **Regression test:** Replay the original exploit for "Unauthenticated /api/debug dumps all accounts" (GET /api/debug). After the fix it must no longer succeed — the test condition (the real effect) must be impossible — while legitimate use of the feature keeps working.
