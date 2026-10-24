# HexaFleet (LAB 75) — Fix & Retest

For every test: the secure implementation and the regression check that proves the fix.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass
- Severity: Critical
- Secure implementation: Use parameterised queries everywhere; never build SQL by string concatenation.
- Regression test: repeat the original exploit steps after the fix; it must fail and the Mission Board detection must no longer fire.

### No Rate Limiting or Account Lockout on Login
- Severity: High
- Secure implementation: Add progressive delays, lockout after repeated failures, and alerting on credential-stuffing patterns.
- Regression test: repeat the original exploit steps after the fix; it must fail and the Mission Board detection must no longer fire.

### Account Enumeration Through Differential Authentication Responses
- Severity: Medium
- Secure implementation: Return one generic message for all failed logins and password-reset requests.
- Regression test: repeat the original exploit steps after the fix; it must fail and the Mission Board detection must no longer fire.

### Default and Demo Credentials Active on Production Login
- Severity: High
- Secure implementation: Force password changes on first login, remove demo accounts, and never print credentials on the login page.
- Regression test: repeat the original exploit steps after the fix; it must fail and the Mission Board detection must no longer fire.

### Password Reset Token Is Predictable From the User ID
- Severity: High
- Secure implementation: Generate reset tokens from a CSPRNG, store only a hash, expire them quickly and bind them to a single use.
- Regression test: repeat the original exploit steps after the fix; it must fail and the Mission Board detection must no longer fire.

### Privilege Escalation by Tampering With the Client-Side Role Cookie
- Severity: High
- Secure implementation: Keep roles in the server-side session only; never trust client-supplied role claims.
- Regression test: repeat the original exploit steps after the fix; it must fail and the Mission Board detection must no longer fire.

## Registration & Profile

### Registration Accepts Single-Character Passwords
- Severity: Medium
- Secure implementation: Enforce a minimum length (12+) and screen against common-password lists at registration.
- Regression test: repeat the original exploit steps after the fix; it must fail and the Mission Board detection must no longer fire.

### Mass Assignment in Registration Allows Role Self-Assignment
- Severity: High
- Secure implementation: Whitelist the exact fields registration may set; assign roles only through an admin-controlled flow.
- Regression test: repeat the original exploit steps after the fix; it must fail and the Mission Board detection must no longer fire.

### Stored Cross-Site Scripting in User Display Name
- Severity: High
- Secure implementation: Output-encode all user data at render time and validate name fields against an allow-list.
- Regression test: repeat the original exploit steps after the fix; it must fail and the Mission Board detection must no longer fire.

### Missing CSRF Protection on Profile Update
- Severity: Medium
- Secure implementation: Require a per-session CSRF token on every state-changing request and verify Origin/Referer.
- Regression test: repeat the original exploit steps after the fix; it must fail and the Mission Board detection must no longer fire.

## Vehicles & Documents

### Insecure Direct Object Reference on Vehicle Records
- Severity: High
- Secure implementation: Authorize every vehicle/document access against the session user’s assignments and role.
- Regression test: repeat the original exploit steps after the fix; it must fail and the Mission Board detection must no longer fire.

### Directory Traversal in Document Download Exposes Server Files
- Severity: High
- Secure implementation: Resolve the requested path, verify it stays inside the documents directory, and serve files by id, not by name.
- Regression test: repeat the original exploit steps after the fix; it must fail and the Mission Board detection must no longer fire.

### Missing Authorization on Vehicle Assignment Allows Self-Assignment
- Severity: High
- Secure implementation: Restrict assignment changes to fleet-manager and admin roles, enforced server-side.
- Regression test: repeat the original exploit steps after the fix; it must fail and the Mission Board detection must no longer fire.

## Trip Logs & Mileage

### Insecure Direct Object Reference on Trip Logs
- Severity: Medium
- Secure implementation: Check trip ownership (or staff role) before serving any trip record.
- Regression test: repeat the original exploit steps after the fix; it must fail and the Mission Board detection must no longer fire.

### Approved Trip Mileage Can Be Edited Without Re-Approval
- Severity: High
- Secure implementation: Make approved trips immutable; route corrections through a manager-approved adjustment flow.
- Regression test: repeat the original exploit steps after the fix; it must fail and the Mission Board detection must no longer fire.

### Missing Authorization Allows Deleting Other Drivers’ Trip Logs
- Severity: High
- Secure implementation: Restrict deletion to the owner or staff roles and keep a soft-delete audit log.
- Regression test: repeat the original exploit steps after the fix; it must fail and the Mission Board detection must no longer fire.

## Fuel Expenses

### Client-Supplied Fuel Expense Amount Trusted by the Server
- Severity: High
- Secure implementation: Compute expense amounts server-side from litres and the official fuel price; reject mismatched claims.
- Regression test: repeat the original exploit steps after the fix; it must fail and the Mission Board detection must no longer fire.

### Broken Access Control Allows Self-Approval of Fuel Expenses
- Severity: Critical
- Secure implementation: Enforce manager-only approval server-side and forbid approving your own claims.
- Regression test: repeat the original exploit steps after the fix; it must fail and the Mission Board detection must no longer fire.

## Maintenance & Work Orders

### Missing Authorization on Work Order Closure
- Severity: High
- Secure implementation: Allow closing only by the assigned mechanic or fleet staff, with the closer recorded.
- Regression test: repeat the original exploit steps after the fix; it must fail and the Mission Board detection must no longer fire.

### Unauthorized Users Can Rewrite Work Order Costs
- Severity: Medium
- Secure implementation: Restrict cost edits to mechanic/manager roles and keep an immutable change log.
- Regression test: repeat the original exploit steps after the fix; it must fail and the Mission Board detection must no longer fire.

## Search

### SQL Injection in Vehicle Search Returns the Full Register
- Severity: High
- Secure implementation: Parameterise the search query and escape LIKE wildcards in user input.
- Regression test: repeat the original exploit steps after the fix; it must fail and the Mission Board detection must no longer fire.

### Reflected Cross-Site Scripting in Search
- Severity: Medium
- Secure implementation: HTML-encode the reflected query and all user input at render time.
- Regression test: repeat the original exploit steps after the fix; it must fail and the Mission Board detection must no longer fire.

## Admin Panel

### Broken Access Control Exposes Admin Console and Passwords to All Users
- Severity: Critical
- Secure implementation: Enforce admin-role checks on every admin route and never display stored passwords.
- Regression test: repeat the original exploit steps after the fix; it must fail and the Mission Board detection must no longer fire.

### Missing CSRF Verification on Admin User Deactivation
- Severity: High
- Secure implementation: Verify a per-session CSRF token on all admin state changes and enforce SameSite cookies.
- Regression test: repeat the original exploit steps after the fix; it must fail and the Mission Board detection must no longer fire.

## Platform & API

### Unauthenticated Debug Endpoint Exposes the Full User Database
- Severity: Critical
- Secure implementation: Remove debug endpoints from production builds; gate diagnostics behind admin auth and network restrictions.
- Regression test: repeat the original exploit steps after the fix; it must fail and the Mission Board detection must no longer fire.

### API Authentication Token Is Derivable From the User’s Email Address
- Severity: High
- Secure implementation: Issue random, revocable API keys per account and store only their hashes.
- Regression test: repeat the original exploit steps after the fix; it must fail and the Mission Board detection must no longer fire.
