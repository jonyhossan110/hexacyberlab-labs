# HexaSupply (LAB 103) — Fix & Retest

For every finding: apply the secure implementation, then retest the original exploit and the legitimate flow.

### SQL Injection in Login (Authentication Bypass)
- Severity: Critical
- Secure implementation: Use parameterised queries / prepared statements for all database access; never concatenate user input into SQL.
- Regression test: repeat the original exploit after the fix and confirm it no longer succeeds (test stays red / request is rejected), then re-run the normal business flow to confirm it still works.

### Missing Brute-Force Protection on Login
- Severity: High
- Secure implementation: Add rate limiting, progressive delays and account lockout/alerting after repeated failed logins.
- Regression test: repeat the original exploit after the fix and confirm it no longer succeeds (test stays red / request is rejected), then re-run the normal business flow to confirm it still works.

### Account Enumeration via Differential Responses
- Severity: Medium
- Secure implementation: Return identical, generic responses for existing and non-existing accounts on login and password reset.
- Regression test: repeat the original exploit after the fix and confirm it no longer succeeds (test stays red / request is rejected), then re-run the normal business flow to confirm it still works.

### Active Demo Account with Published Credentials
- Severity: High
- Secure implementation: Remove demo/default accounts from production and force unique credentials for every user.
- Regression test: repeat the original exploit after the fix and confirm it no longer succeeds (test stays red / request is rejected), then re-run the normal business flow to confirm it still works.

### Predictable Password Reset Token
- Severity: Critical
- Secure implementation: Generate reset tokens with a CSPRNG (at least 128 bits), expire them quickly and invalidate after use.
- Regression test: repeat the original exploit after the fix and confirm it no longer succeeds (test stays red / request is rejected), then re-run the normal business flow to confirm it still works.

### Client-Side Role Cookie Trusted for Authorisation
- Severity: High
- Secure implementation: Store roles server-side in the session; ignore any role claim sent by the client.
- Regression test: repeat the original exploit after the fix and confirm it no longer succeeds (test stays red / request is rejected), then re-run the normal business flow to confirm it still works.

### Weak Password Policy
- Severity: Medium
- Secure implementation: Enforce a minimum length (12+) and screen new passwords against known breached-password lists.
- Regression test: repeat the original exploit after the fix and confirm it no longer succeeds (test stays red / request is rejected), then re-run the normal business flow to confirm it still works.

### Mass Assignment in Registration
- Severity: Critical
- Secure implementation: Whitelist bindable fields per endpoint; never accept role/privilege fields from the client.
- Regression test: repeat the original exploit after the fix and confirm it no longer succeeds (test stays red / request is rejected), then re-run the normal business flow to confirm it still works.

### Stored Cross-Site Scripting via Display Name
- Severity: High
- Secure implementation: Context-encode all user data on output and validate input; add a Content-Security-Policy.
- Regression test: repeat the original exploit after the fix and confirm it no longer succeeds (test stays red / request is rejected), then re-run the normal business flow to confirm it still works.

### Cross-Site Request Forgery on Profile Update
- Severity: Medium
- Secure implementation: Require per-session anti-CSRF tokens on all state-changing requests and SameSite cookies.
- Regression test: repeat the original exploit after the fix and confirm it no longer succeeds (test stays red / request is rejected), then re-run the normal business flow to confirm it still works.

### SQL Injection in Search
- Severity: High
- Secure implementation: Parameterise search queries and enforce visibility rules server-side, not just in the UI.
- Regression test: repeat the original exploit after the fix and confirm it no longer succeeds (test stays red / request is rejected), then re-run the normal business flow to confirm it still works.

### Reflected Cross-Site Scripting in Search
- Severity: Medium
- Secure implementation: HTML-encode reflected values and deploy a restrictive Content-Security-Policy.
- Regression test: repeat the original exploit after the fix and confirm it no longer succeeds (test stays red / request is rejected), then re-run the normal business flow to confirm it still works.

### Price Tampering in Purchase Order Creation
- Severity: High
- Secure implementation: Ignore client-supplied prices; always price orders from the server-side catalogue.
- Regression test: repeat the original exploit after the fix and confirm it no longer succeeds (test stays red / request is rejected), then re-run the normal business flow to confirm it still works.

### Missing Quantity Validation (Negative Quantities Accepted)
- Severity: High
- Secure implementation: Validate quantities server-side (positive integers within sane bounds) before pricing any order.
- Regression test: repeat the original exploit after the fix and confirm it no longer succeeds (test stays red / request is rejected), then re-run the normal business flow to confirm it still works.

### Missing Segregation of Duties in PO Approval
- Severity: High
- Secure implementation: Enforce approver != creator and the approver role server-side on every approval action.
- Regression test: repeat the original exploit after the fix and confirm it no longer succeeds (test stays red / request is rejected), then re-run the normal business flow to confirm it still works.

### Insecure Direct Object Reference on Purchase Orders
- Severity: High
- Secure implementation: Check ownership/role on every object access; use unguessable references as defence in depth.
- Regression test: repeat the original exploit after the fix and confirm it no longer succeeds (test stays red / request is rejected), then re-run the normal business flow to confirm it still works.

### Client-Supplied Supplier Identity Trusted on PO Creation
- Severity: High
- Secure implementation: Derive the owning supplier from the authenticated session; ignore client-supplied owner ids.
- Regression test: repeat the original exploit after the fix and confirm it no longer succeeds (test stays red / request is rejected), then re-run the normal business flow to confirm it still works.

### Insecure Direct Object Reference on Shipments
- Severity: Medium
- Secure implementation: Authorise every shipment read against the session’s supplier/role.
- Regression test: repeat the original exploit after the fix and confirm it no longer succeeds (test stays red / request is rejected), then re-run the normal business flow to confirm it still works.

### Unauthorised Inventory Adjustment / Negative Stock
- Severity: High
- Secure implementation: Restrict adjustments to warehouse roles and validate stock invariants server-side.
- Regression test: repeat the original exploit after the fix and confirm it no longer succeeds (test stays red / request is rejected), then re-run the normal business flow to confirm it still works.

### Restricted Inventory Item Accessible by Direct URL
- Severity: Medium
- Secure implementation: Enforce item visibility/role checks on the detail endpoint, not only on listing pages.
- Regression test: repeat the original exploit after the fix and confirm it no longer succeeds (test stays red / request is rejected), then re-run the normal business flow to confirm it still works.

### Insecure Direct Object Reference on Supplier Invoices
- Severity: High
- Secure implementation: Authorise invoice reads against the owning supplier or finance/admin roles only.
- Regression test: repeat the original exploit after the fix and confirm it no longer succeeds (test stays red / request is rejected), then re-run the normal business flow to confirm it still works.

### Payment Amount / Status Tampering on Invoices
- Severity: Critical
- Secure implementation: Only finance roles may settle invoices; require the settled amount to equal the invoice total, verified server-side.
- Regression test: repeat the original exploit after the fix and confirm it no longer succeeds (test stays red / request is rejected), then re-run the normal business flow to confirm it still works.

### Broken Access Control on Admin Panel
- Severity: Critical
- Secure implementation: Enforce admin-role checks server-side on all admin routes; never render credentials.
- Regression test: repeat the original exploit after the fix and confirm it no longer succeeds (test stays red / request is rejected), then re-run the normal business flow to confirm it still works.

### Cross-Site Request Forgery on Admin User Deletion
- Severity: High
- Secure implementation: Require anti-CSRF tokens on all admin actions and SameSite session cookies.
- Regression test: repeat the original exploit after the fix and confirm it no longer succeeds (test stays red / request is rejected), then re-run the normal business flow to confirm it still works.

### Unauthenticated Debug Endpoint Exposes All Data
- Severity: Critical
- Secure implementation: Remove debug endpoints from production builds; require admin auth and audit access to diagnostics.
- Regression test: repeat the original exploit after the fix and confirm it no longer succeeds (test stays red / request is rejected), then re-run the normal business flow to confirm it still works.

### Weak API Authentication (Base64 Email Token)
- Severity: High
- Secure implementation: Issue random, revocable API keys, store only their hashes, and scope them per account.
- Regression test: repeat the original exploit after the fix and confirm it no longer succeeds (test stays red / request is rejected), then re-run the normal business flow to confirm it still works.
