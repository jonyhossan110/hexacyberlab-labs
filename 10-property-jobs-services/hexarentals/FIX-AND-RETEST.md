# HexaRentals — Fix & Retest (LAB 92)

For every test: the professional report entry, the secure implementation, and the regression retest that proves the fix. Work through this after completing the lab offensively.

## Login & Authentication

### SQL Injection in Login Allows Authentication Bypass — Severity: Critical
- Finding: SQL Injection Login Bypass (A03:2021 Injection) at POST /login.
- Secure implementation: Use parameterised queries / prepared statements for all database access and never concatenate user input into SQL.
- Remediation: Use parameterised queries / prepared statements for all database access and never concatenate user input into SQL.
- Regression test: on a FRESH lab state, repeat the original exploit against POST /login; it must fail (no access, no state change, no data leak) and the "SQL Injection Login Bypass" test must stay open. Then confirm the legitimate workflow still works end-to-end.

### Missing Brute-Force Protection on Login — Severity: High
- Finding: Brute Force — No Rate Limiting or Lockout (A07:2021 Identification and Authentication Failures) at POST /login.
- Secure implementation: Add per-account and per-IP rate limiting, exponential backoff and lockout/alerting after repeated failures.
- Remediation: Add per-account and per-IP rate limiting, exponential backoff and lockout/alerting after repeated failures.
- Regression test: on a FRESH lab state, repeat the original exploit against POST /login; it must fail (no access, no state change, no data leak) and the "Brute Force — No Rate Limiting or Lockout" test must stay open. Then confirm the legitimate workflow still works end-to-end.

### Account Enumeration Through Differential Authentication Responses — Severity: Medium
- Finding: User Enumeration via Login & Forgot-Password Responses (A07:2021 Identification and Authentication Failures) at POST /login, POST /forgot.
- Secure implementation: Return one generic message for all authentication failures and forgot-password requests, regardless of account existence.
- Remediation: Return one generic message for all authentication failures and forgot-password requests, regardless of account existence.
- Regression test: on a FRESH lab state, repeat the original exploit against POST /login, POST /forgot; it must fail (no access, no state change, no data leak) and the "User Enumeration via Login & Forgot-Password Responses" test must stay open. Then confirm the legitimate workflow still works end-to-end.

### Default / Demo Credentials Active on Production Login — Severity: Critical
- Finding: Published Demo / Default Credentials (A07:2021 Identification and Authentication Failures) at POST /login.
- Secure implementation: Remove all demo accounts from production, force unique strong passwords, and rotate any credential that was ever published.
- Remediation: Remove all demo accounts from production, force unique strong passwords, and rotate any credential that was ever published.
- Regression test: on a FRESH lab state, repeat the original exploit against POST /login; it must fail (no access, no state change, no data leak) and the "Published Demo / Default Credentials" test must stay open. Then confirm the legitimate workflow still works end-to-end.

### Password Reset Tokens Are Predictable — Severity: High
- Finding: Predictable Password-Reset Token (A07:2021 Identification and Authentication Failures) at POST /reset.
- Secure implementation: Generate reset tokens from a CSPRNG (at least 128 bits), store only a hash, expire them quickly and make them single-use.
- Remediation: Generate reset tokens from a CSPRNG (at least 128 bits), store only a hash, expire them quickly and make them single-use.
- Regression test: on a FRESH lab state, repeat the original exploit against POST /reset; it must fail (no access, no state change, no data leak) and the "Predictable Password-Reset Token" test must stay open. Then confirm the legitimate workflow still works end-to-end.

### Privilege Escalation via Client-Controlled Role Cookie — Severity: High
- Finding: Role Cookie Tampering (hx_role) (A01:2021 Broken Access Control) at GET /admin with forged cookie.
- Secure implementation: Keep roles exclusively in server-side session data and ignore any role information supplied by the client.
- Remediation: Keep roles exclusively in server-side session data and ignore any role information supplied by the client.
- Regression test: on a FRESH lab state, repeat the original exploit against GET /admin with forged cookie; it must fail (no access, no state change, no data leak) and the "Role Cookie Tampering (hx_role)" test must stay open. Then confirm the legitimate workflow still works end-to-end.

## Registration & Profile

### No Minimum Password Strength Enforced at Registration — Severity: Medium
- Finding: Weak Password Policy (1-Character Passwords) (A07:2021 Identification and Authentication Failures) at POST /register.
- Secure implementation: Enforce a minimum length (12+ characters) and screen new passwords against known-breached password lists.
- Remediation: Enforce a minimum length (12+ characters) and screen new passwords against known-breached password lists.
- Regression test: on a FRESH lab state, repeat the original exploit against POST /register; it must fail (no access, no state change, no data leak) and the "Weak Password Policy (1-Character Passwords)" test must stay open. Then confirm the legitimate workflow still works end-to-end.

### Mass Assignment Allows Setting Role and Balance at Registration — Severity: High
- Finding: Mass Assignment — Role & Balance at Registration (A01:2021 Broken Access Control) at POST /register.
- Secure implementation: Allow-list exactly the fields a request may set and assign roles/balances only through privileged server-side logic.
- Remediation: Allow-list exactly the fields a request may set and assign roles/balances only through privileged server-side logic.
- Regression test: on a FRESH lab state, repeat the original exploit against POST /register; it must fail (no access, no state change, no data leak) and the "Mass Assignment — Role & Balance at Registration" test must stay open. Then confirm the legitimate workflow still works end-to-end.

### Stored Cross-Site Scripting via Display Name — Severity: High
- Finding: Stored XSS in Display Name (A03:2021 Injection) at POST /register or POST /profile, viewed on /tenants.
- Secure implementation: Contextually output-encode all user data on render and add a restrictive Content-Security-Policy.
- Remediation: Contextually output-encode all user data on render and add a restrictive Content-Security-Policy.
- Regression test: on a FRESH lab state, repeat the original exploit against POST /register or POST /profile, viewed on /tenants; it must fail (no access, no state change, no data leak) and the "Stored XSS in Display Name" test must stay open. Then confirm the legitimate workflow still works end-to-end.

### Cross-Site Request Forgery on Profile Update — Severity: Medium
- Finding: CSRF on Profile Update (A01:2021 Broken Access Control) at POST /profile.
- Secure implementation: Require a per-session anti-CSRF token on all state-changing requests and set SameSite=Lax/Strict on session cookies.
- Remediation: Require a per-session anti-CSRF token on all state-changing requests and set SameSite=Lax/Strict on session cookies.
- Regression test: on a FRESH lab state, repeat the original exploit against POST /profile; it must fail (no access, no state change, no data leak) and the "CSRF on Profile Update" test must stay open. Then confirm the legitimate workflow still works end-to-end.

## Properties & Search

### SQL Injection in Property Search Exposes Unlisted Listings — Severity: High
- Finding: SQL Injection in Property Search (Unlisted Listing Leak) (A03:2021 Injection) at GET /search?q=.
- Secure implementation: Parameterise search queries and enforce listing visibility in the query itself, not by filtering results afterwards.
- Remediation: Parameterise search queries and enforce listing visibility in the query itself, not by filtering results afterwards.
- Regression test: on a FRESH lab state, repeat the original exploit against GET /search?q=; it must fail (no access, no state change, no data leak) and the "SQL Injection in Property Search (Unlisted Listing Leak)" test must stay open. Then confirm the legitimate workflow still works end-to-end.

### Reflected Cross-Site Scripting in Property Search — Severity: Medium
- Finding: Reflected XSS in Search (A03:2021 Injection) at GET /search?q=.
- Secure implementation: Output-encode all reflected request data and validate search input against an allow-list where possible.
- Remediation: Output-encode all reflected request data and validate search input against an allow-list where possible.
- Regression test: on a FRESH lab state, repeat the original exploit against GET /search?q=; it must fail (no access, no state change, no data leak) and the "Reflected XSS in Search" test must stay open. Then confirm the legitimate workflow still works end-to-end.

## Units & Leases

### Insecure Direct Object Reference on Unit Pages — Severity: High
- Finding: Unit IDOR — Another Tenant’s Unit & Lease Details (A01:2021 Broken Access Control) at GET /unit/:id.
- Secure implementation: Check on the server that the session user is a party to the unit/lease before serving any object by id.
- Remediation: Check on the server that the session user is a party to the unit/lease before serving any object by id.
- Regression test: on a FRESH lab state, repeat the original exploit against GET /unit/:id; it must fail (no access, no state change, no data leak) and the "Unit IDOR — Another Tenant’s Unit & Lease Details" test must stay open. Then confirm the legitimate workflow still works end-to-end.

### Insecure Direct Object Reference on Lease Documents — Severity: High
- Finding: Lease Document IDOR (A01:2021 Broken Access Control) at GET /lease/:id.
- Secure implementation: Authorise every lease read against the lease’s tenant and landlord ids on the server side.
- Remediation: Authorise every lease read against the lease’s tenant and landlord ids on the server side.
- Regression test: on a FRESH lab state, repeat the original exploit against GET /lease/:id; it must fail (no access, no state change, no data leak) and the "Lease Document IDOR" test must stay open. Then confirm the legitimate workflow still works end-to-end.

### Missing Authorisation on Lease Signing — Severity: High
- Finding: Broken Access Control — Anyone Can Sign a Lease (A01:2021 Broken Access Control) at POST /lease/:id/sign.
- Secure implementation: Verify the signer is the lease’s tenant or landlord (as appropriate) before recording a signature.
- Remediation: Verify the signer is the lease’s tenant or landlord (as appropriate) before recording a signature.
- Regression test: on a FRESH lab state, repeat the original exploit against POST /lease/:id/sign; it must fail (no access, no state change, no data leak) and the "Broken Access Control — Anyone Can Sign a Lease" test must stay open. Then confirm the legitimate workflow still works end-to-end.

### Unauthorised Modification of Lease Terms — Severity: High
- Finding: Lease Terms Tampering by Non-Party (Rent Edit IDOR) (A01:2021 Broken Access Control) at POST /lease/:id/edit.
- Secure implementation: Restrict lease edits to the lease’s landlord, validate changes, and keep an audit trail of term changes.
- Remediation: Restrict lease edits to the lease’s landlord, validate changes, and keep an audit trail of term changes.
- Regression test: on a FRESH lab state, repeat the original exploit against POST /lease/:id/edit; it must fail (no access, no state change, no data leak) and the "Lease Terms Tampering by Non-Party (Rent Edit IDOR)" test must stay open. Then confirm the legitimate workflow still works end-to-end.

### Unlisted Property Accessible via Direct Object Reference — Severity: Medium
- Finding: Unlisted Property Readable by Direct URL (A01:2021 Broken Access Control) at GET /property/:id.
- Secure implementation: Enforce listing visibility on the object endpoint itself, not only in search results.
- Remediation: Enforce listing visibility on the object endpoint itself, not only in search results.
- Regression test: on a FRESH lab state, repeat the original exploit against GET /property/:id; it must fail (no access, no state change, no data leak) and the "Unlisted Property Readable by Direct URL" test must stay open. Then confirm the legitimate workflow still works end-to-end.

## Rent Payments

### Insecure Direct Object Reference on Payment Records — Severity: Medium
- Finding: Payment Record IDOR (A01:2021 Broken Access Control) at GET /payment/:id.
- Secure implementation: Authorise payment reads against the payment’s lease parties on the server.
- Remediation: Authorise payment reads against the payment’s lease parties on the server.
- Regression test: on a FRESH lab state, repeat the original exploit against GET /payment/:id; it must fail (no access, no state change, no data leak) and the "Payment Record IDOR" test must stay open. Then confirm the legitimate workflow still works end-to-end.

### Client-Side Rent Amount Trusted by Payment Endpoint — Severity: Critical
- Finding: Rent Amount Tampering — Pay $1, Marked Paid in Full (A01:2021 Broken Access Control) at POST /payments/pay.
- Secure implementation: Derive the payable amount from the lease on the server, reject mismatches, and reconcile with the payment provider.
- Remediation: Derive the payable amount from the lease on the server, reject mismatches, and reconcile with the payment provider.
- Regression test: on a FRESH lab state, repeat the original exploit against POST /payments/pay; it must fail (no access, no state change, no data leak) and the "Rent Amount Tampering — Pay $1, Marked Paid in Full" test must stay open. Then confirm the legitimate workflow still works end-to-end.

### Negative Payment Amount Accepted and Credited — Severity: High
- Finding: Negative Payment Credits the Wallet (A08:2021 Software and Data Integrity Failures) at POST /payments/pay.
- Secure implementation: Validate amounts as positive integers within expected bounds and reject any non-positive payment server-side.
- Remediation: Validate amounts as positive integers within expected bounds and reject any non-positive payment server-side.
- Regression test: on a FRESH lab state, repeat the original exploit against POST /payments/pay; it must fail (no access, no state change, no data leak) and the "Negative Payment Credits the Wallet" test must stay open. Then confirm the legitimate workflow still works end-to-end.

## Deposits

### Insecure Direct Object Reference on Deposit Records — Severity: Medium
- Finding: Deposit Record IDOR (A01:2021 Broken Access Control) at GET /deposit/:id.
- Secure implementation: Authorise deposit reads against the deposit’s tenant and landlord on the server.
- Remediation: Authorise deposit reads against the deposit’s tenant and landlord on the server.
- Regression test: on a FRESH lab state, repeat the original exploit against GET /deposit/:id; it must fail (no access, no state change, no data leak) and the "Deposit Record IDOR" test must stay open. Then confirm the legitimate workflow still works end-to-end.

### Unauthorised and Unbounded Deposit Refunds — Severity: Critical
- Finding: Deposit Refund Abuse — Non-Landlord Refunds Any Amount (A01:2021 Broken Access Control) at POST /deposit/:id/refund.
- Secure implementation: Restrict refunds to the deposit’s landlord, cap the amount at the held balance, and require a second confirmation for payout actions.
- Remediation: Restrict refunds to the deposit’s landlord, cap the amount at the held balance, and require a second confirmation for payout actions.
- Regression test: on a FRESH lab state, repeat the original exploit against POST /deposit/:id/refund; it must fail (no access, no state change, no data leak) and the "Deposit Refund Abuse — Non-Landlord Refunds Any Amount" test must stay open. Then confirm the legitimate workflow still works end-to-end.

## Maintenance Requests

### Insecure Direct Object Reference on Maintenance Requests — Severity: Medium
- Finding: Maintenance Request Privacy IDOR (A01:2021 Broken Access Control) at GET /request/:id.
- Secure implementation: Authorise request reads against the request’s tenant and landlord on the server.
- Remediation: Authorise request reads against the request’s tenant and landlord on the server.
- Regression test: on a FRESH lab state, repeat the original exploit against GET /request/:id; it must fail (no access, no state change, no data leak) and the "Maintenance Request Privacy IDOR" test must stay open. Then confirm the legitimate workflow still works end-to-end.

### Missing Authorisation on Maintenance Status Changes — Severity: Medium
- Finding: Tenant Can Close Own Request via Landlord-Only Status Action (A01:2021 Broken Access Control) at POST /request/:id/status.
- Secure implementation: Enforce per-transition role checks server-side (only the responsible landlord may complete a job) and log all status changes.
- Remediation: Enforce per-transition role checks server-side (only the responsible landlord may complete a job) and log all status changes.
- Regression test: on a FRESH lab state, repeat the original exploit against POST /request/:id/status; it must fail (no access, no state change, no data leak) and the "Tenant Can Close Own Request via Landlord-Only Status Action" test must stay open. Then confirm the legitimate workflow still works end-to-end.

## Admin Panel

### Cross-Site Request Forgery on Administrative User Deletion — Severity: High
- Finding: CSRF on Admin User Deletion (A01:2021 Broken Access Control) at POST /admin/users/:id/delete.
- Secure implementation: Require anti-CSRF tokens on all admin actions, re-confirm destructive operations, and set SameSite cookies.
- Remediation: Require anti-CSRF tokens on all admin actions, re-confirm destructive operations, and set SameSite cookies.
- Regression test: on a FRESH lab state, repeat the original exploit against POST /admin/users/:id/delete; it must fail (no access, no state change, no data leak) and the "CSRF on Admin User Deletion" test must stay open. Then confirm the legitimate workflow still works end-to-end.

## Platform & API

### Unauthenticated Debug Endpoint Exposes Full Dataset — Severity: Critical
- Finding: Unauthenticated Debug Endpoint Dumps All Data (A05:2021 Security Misconfiguration) at GET /api/debug.
- Secure implementation: Remove debug endpoints from production builds and gate any diagnostics behind admin auth, network restrictions and audit logging.
- Remediation: Remove debug endpoints from production builds and gate any diagnostics behind admin auth, network restrictions and audit logging.
- Regression test: on a FRESH lab state, repeat the original exploit against GET /api/debug; it must fail (no access, no state change, no data leak) and the "Unauthenticated Debug Endpoint Dumps All Data" test must stay open. Then confirm the legitimate workflow still works end-to-end.
