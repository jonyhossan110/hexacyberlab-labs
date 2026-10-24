# HexaAPI — Fix & Retest (LAB 21)

For every scored test: the secure implementation that closes the flaw, and the regression check that proves the fix. Retest method for all entries: re-run the original exploit from PRACTICE-GUIDE.md against the fixed build — it must fail (401/403/404 or a safe generic response), and on a fresh lab the corresponding test must stay unpassed.

## Authentication & Tokens

### Missing Rate Limiting on the Authentication Endpoint
- **Severity:** High · **OWASP:** API2 Broken Authentication
- **Fix:** Add per-account and per-IP throttling with exponential backoff, lockout and alerting on all auth endpoints; require MFA for admin accounts.
- **Retest:** repeat the exploit for "Brute Force — No Rate Limit on API Login"; expected after the fix: the cross-tenant/privileged effect is refused, no sensitive data is returned, and the attempt is logged/throttled as applicable.

### Broken JWT Verification (alg=none Accepted, Weak Hard-Coded Secret)
- **Severity:** Critical · **OWASP:** API2 Broken Authentication
- **Fix:** Use a vetted JWT library; pin alg=HS256 (or asymmetric keys), verify signature and expiry on every request, and load a strong random secret from protected configuration.
- **Retest:** repeat the exploit for "JWT Forgery — alg=none & Weak Leaked Secret"; expected after the fix: the cross-tenant/privileged effect is refused, no sensitive data is returned, and the attempt is logged/throttled as applicable.

### Session Tokens Are Never Revoked and Live for 10 Years
- **Severity:** High · **OWASP:** API2 Broken Authentication
- **Fix:** Short-lived access tokens with refresh rotation; server-side revocation (denylist / token version bumped on logout and password change); always verify exp.
- **Retest:** repeat the exploit for "Token Lifecycle — Logout & Password Change Revoke Nothing"; expected after the fix: the cross-tenant/privileged effect is refused, no sensitive data is returned, and the attempt is logged/throttled as applicable.

### OTP Verification Has No Attempt Limit
- **Severity:** High · **OWASP:** API6 Unrestricted Access to Sensitive Business Flows
- **Fix:** Cap verification attempts (e.g. 5), expire codes within minutes, rate-limit requests, and use longer codes for sensitive actions.
- **Retest:** repeat the exploit for "OTP Brute Force — 4-Digit Code, Unlimited Attempts"; expected after the fix: the cross-tenant/privileged effect is refused, no sensitive data is returned, and the attempt is logged/throttled as applicable.

## Registration & Accounts

### Account Enumeration via Registration and Login Responses
- **Severity:** Medium · **OWASP:** API2 Broken Authentication
- **Fix:** Return one generic response for registration and login regardless of whether the account exists; verify email before activation.
- **Retest:** repeat the exploit for "Account Enumeration — Register & Login Oracles"; expected after the fix: the cross-tenant/privileged effect is refused, no sensitive data is returned, and the attempt is logged/throttled as applicable.

### Mass Assignment on Registration and User Update Endpoints
- **Severity:** Critical · **OWASP:** API3 Broken Object Property Level Authorization
- **Fix:** Strict per-endpoint field allowlists; role/company/admin changes only through dedicated authorised admin flows; reject unexpected privilege fields.
- **Retest:** repeat the exploit for "Mass Assignment — Privilege Fields in Register & PATCH"; expected after the fix: the cross-tenant/privileged effect is refused, no sensitive data is returned, and the attempt is logged/throttled as applicable.

### Missing Password Policy at Registration
- **Severity:** Medium · **OWASP:** API2 Broken Authentication
- **Fix:** Enforce a minimum length (>=10) and block known-breached passwords at registration and password change.
- **Retest:** repeat the exploit for "Weak Password Policy — 1-Character Passwords Accepted"; expected after the fix: the cross-tenant/privileged effect is refused, no sensitive data is returned, and the attempt is logged/throttled as applicable.

### Stored Cross-Site Scripting via User Display Name
- **Severity:** High · **OWASP:** A03 Injection (XSS)
- **Fix:** Contextual output encoding on all user content at render; sanitise stored rich text; add a Content-Security-Policy.
- **Retest:** repeat the exploit for "Stored XSS — Script Payload in a User Name Reaches the Admin Console"; expected after the fix: the cross-tenant/privileged effect is refused, no sensitive data is returned, and the attempt is logged/throttled as applicable.

## Object Access (BOLA)

### Broken Object Level Authorization on Orders, Users and Invoices
- **Severity:** Critical · **OWASP:** API1 Broken Object Level Authorization
- **Fix:** On every object access, verify the object’s company_id equals the caller’s company from the authenticated token; return 404 on mismatch; add tenant-isolation tests.
- **Retest:** repeat the exploit for "BOLA — Cross-Company Orders, Users & Invoices by ID"; expected after the fix: the cross-tenant/privileged effect is refused, no sensitive data is returned, and the attempt is logged/throttled as applicable.

### Client-Supplied Tenant Parameter Honoured on List Endpoints
- **Severity:** High · **OWASP:** API1 Broken Object Level Authorization
- **Fix:** Derive tenancy from the token only; ignore or reject client-supplied tenant parameters; authorise any explicit cross-tenant parameter separately.
- **Retest:** repeat the exploit for "Parameter Pollution — ?company_id= Overrides Your Tenant"; expected after the fix: the cross-tenant/privileged effect is refused, no sensitive data is returned, and the attempt is logged/throttled as applicable.

### Missing Object-Level Authorization in GraphQL Resolvers
- **Severity:** High · **OWASP:** API1 Broken Object Level Authorization
- **Fix:** Enforce per-field/per-object authorisation in resolvers identical to REST; centralise ownership checks in one service layer.
- **Retest:** repeat the exploit for "GraphQL BOLA — Cross-Company User Resolution"; expected after the fix: the cross-tenant/privileged effect is refused, no sensitive data is returned, and the attempt is logged/throttled as applicable.

## Admin & Function Access

### Broken Function Level Authorization on Admin Endpoints
- **Severity:** Critical · **OWASP:** API5 Broken Function Level Authorization
- **Fix:** Server-side role check on every admin function; derive role from the authenticated token only; never trust client role headers; audit admin actions.
- **Retest:** repeat the exploit for "BFLA — Admin Functions Without an Admin Check (+ X-Admin Header Trust)"; expected after the fix: the cross-tenant/privileged effect is refused, no sensitive data is returned, and the attempt is logged/throttled as applicable.

### GraphQL Mutation Missing Function-Level Authorization
- **Severity:** High · **OWASP:** API5 Broken Function Level Authorization
- **Fix:** Require the same role checks in mutations as in REST admin functions; scope targets to the caller’s tenant; log all role changes.
- **Retest:** repeat the exploit for "GraphQL BFLA — Role Mutation for Any Caller"; expected after the fix: the cross-tenant/privileged effect is refused, no sensitive data is returned, and the attempt is logged/throttled as applicable.

## API Keys

### API Key Scopes Recorded but Never Enforced
- **Severity:** High · **OWASP:** API2 Broken Authentication
- **Fix:** Enforce key scope per route (read keys: safe methods only); show keys once, store hashed, support expiry and rotation.
- **Retest:** repeat the exploit for "API Key Scope Never Enforced — Read-Only Key Deletes Users"; expected after the fix: the cross-tenant/privileged effect is refused, no sensitive data is returned, and the attempt is logged/throttled as applicable.

### Predictable API Key Format Allows Key Forgery by Pattern
- **Severity:** Critical · **OWASP:** API2 Broken Authentication
- **Fix:** Generate keys from a CSPRNG (>=128-bit entropy), show once, store hashed; never encode tenant or sequence in the secret.
- **Retest:** repeat the exploit for "Predictable API Keys — Pattern Gives Away Every Company’s Keys"; expected after the fix: the cross-tenant/privileged effect is refused, no sensitive data is returned, and the attempt is logged/throttled as applicable.

### API Keys Accepted via URL Query String
- **Severity:** Medium · **OWASP:** API2 Broken Authentication
- **Fix:** Accept keys only via the Authorization header; reject and log query-string credentials; rotate any key observed in a URL.
- **Retest:** repeat the exploit for "API Keys Accepted in the URL Query String"; expected after the fix: the cross-tenant/privileged effect is refused, no sensitive data is returned, and the attempt is logged/throttled as applicable.

## Data Exposure & Exports

### Excessive Data Exposure in User Serialisation
- **Severity:** High · **OWASP:** API3 Broken Object Property Level Authorization
- **Fix:** Serialise per-endpoint allowlists (id, name, email, role); never return password hashes, SSN fragments or internal fields; hash passwords with a slow salted KDF.
- **Retest:** repeat the exploit for "Excessive Data Exposure — Full User Records incl. Password Hashes"; expected after the fix: the cross-tenant/privileged effect is refused, no sensitive data is returned, and the attempt is logged/throttled as applicable.

### Cross-Tenant Data Leak in the Users CSV Export
- **Severity:** High · **OWASP:** API3 Broken Object Property Level Authorization
- **Fix:** Scope exports to the caller’s company; export only necessary fields; require admin role and audit-log every export.
- **Retest:** repeat the exploit for "Export Leak — Users CSV Contains Every Company"; expected after the fix: the cross-tenant/privileged effect is refused, no sensitive data is returned, and the attempt is logged/throttled as applicable.

### Unauthenticated Debug Endpoint Disclosing the JWT Secret
- **Severity:** Critical · **OWASP:** API8 Security Misconfiguration
- **Fix:** Remove debug endpoints from production builds; if retained, require admin auth + IP allowlist; rotate any secret ever exposed.
- **Retest:** repeat the exploit for "Debug Config — JWT Secret & Internals, No Auth"; expected after the fix: the cross-tenant/privileged effect is refused, no sensitive data is returned, and the attempt is logged/throttled as applicable.

## Integrations & Webhooks

### Server-Side Request Forgery in Integration URL Fetchers
- **Severity:** High · **OWASP:** API7 Server Side Request Forgery
- **Fix:** Allowlist permitted hosts and schemes; block loopback/private/link-local ranges post-resolution; disable or re-validate redirects; fetch via an egress proxy.
- **Retest:** repeat the exploit for "SSRF — URL Fetcher & Webhook Tester Reach Internal Endpoints"; expected after the fix: the cross-tenant/privileged effect is refused, no sensitive data is returned, and the attempt is logged/throttled as applicable.

### User Import Trusts Feed Data Verbatim (Privilege Fields Accepted)
- **Severity:** Critical · **OWASP:** API10 Unsafe Consumption of APIs
- **Fix:** Validate feeds against a strict schema; strip role/is_admin/company fields; require admin approval for imported accounts; least-privilege defaults.
- **Retest:** repeat the exploit for "Unsafe Consumption — Import Feed Creates Privileged Accounts"; expected after the fix: the cross-tenant/privileged effect is refused, no sensitive data is returned, and the attempt is logged/throttled as applicable.

### Incoming Payment Webhooks Accepted Without Signature Verification
- **Severity:** Critical · **OWASP:** API8 Security Misconfiguration
- **Fix:** Verify HMAC signature + timestamp/replay window on every incoming webhook; sign outgoing deliveries; log and alert on webhook state changes.
- **Retest:** repeat the exploit for "Forged Webhooks — Payment Events Accepted Without a Signature"; expected after the fix: the cross-tenant/privileged effect is refused, no sensitive data is returned, and the attempt is logged/throttled as applicable.

## Platform & Inventory

### Legacy API Version and Internal Endpoints Exposed Without Controls
- **Severity:** Critical · **OWASP:** API9 Improper Inventory Management
- **Fix:** Version inventory + deprecation plan; retire or secure v1; internal endpoints on a separate interface requiring staff auth — never customer credentials.
- **Retest:** repeat the exploit for "Improper Inventory — Legacy v1 Live Without Auth + Undocumented /internal/*"; expected after the fix: the cross-tenant/privileged effect is refused, no sensitive data is returned, and the attempt is logged/throttled as applicable.

### Missing Resource Limits on List and Reporting Endpoints
- **Severity:** Medium · **OWASP:** API4 Unrestricted Resource Consumption
- **Fix:** Enforce a server-side max page size (e.g. 100); cap report windows, add query timeouts and cost budgets; cache or queue expensive reports.
- **Retest:** repeat the exploit for "Unrestricted Resource Consumption — Uncapped Limits & Expensive Reports"; expected after the fix: the cross-tenant/privileged effect is refused, no sensitive data is returned, and the attempt is logged/throttled as applicable.

### GraphQL Introspection Enabled in Production
- **Severity:** Medium · **OWASP:** API8 Security Misconfiguration
- **Fix:** Disable introspection outside development; add query depth/cost limits; per-field authorisation in resolvers.
- **Retest:** repeat the exploit for "GraphQL Introspection — Full Schema Disclosed to Any Caller"; expected after the fix: the cross-tenant/privileged effect is refused, no sensitive data is returned, and the attempt is logged/throttled as applicable.

