# HexaCloud — Fix & Retest (LAB 23)

For every scored test: the secure implementation and the regression test that proves the fix. Apply fixes in a COPY of the lab, then re-run the exploit — it must fail — and re-run the normal workflow — it must still work.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass (Critical)
- **Fix:** Parameterise the login query (prepared statement with bound email/password parameters).
- **Retest:** Replay the tautology payload: login must fail with the generic error; normal login still works.
- **Report remediation line:** Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.

### Missing Rate Limiting / Account Lockout on Login Endpoint (High)
- **Fix:** Add progressive delay + lockout/step-up after 5 failures per account and per IP, with alerting.
- **Retest:** Script 10 failed logins: the endpoint must throttle or lock before the 10th attempt is processed normally.
- **Report remediation line:** Add progressive delays, lockout or step-up challenges after repeated failures, and alert on credential-stuffing patterns.

### Account Enumeration Through Differential Authentication Responses (Medium)
- **Fix:** Return one generic "invalid credentials" message for unknown user and wrong password on login and reset.
- **Retest:** Compare responses for existing vs non-existing emails: identical status, body and timing class.
- **Report remediation line:** Return one generic "invalid credentials" message for every failed login or reset request, regardless of account existence.

### Default / Demo Account With Weak Password Present in Production (High)
- **Fix:** Delete demo accounts from production seeds; require unique passwords + MFA for all accounts.
- **Retest:** Attempt demo@acme.cloud/demo123 (and vendor defaults): all must fail.
- **Report remediation line:** Remove demo accounts before launch; force unique strong passwords and MFA for every real account.

### Password Reset Tokens Are Predictable From Public Data (High)
- **Fix:** Generate reset tokens with crypto.randomBytes (>=32 bytes), store a hash, 30-minute expiry, single use.
- **Retest:** Request two resets: tokens are unrelated and unpredictable; a computed/guessed token must be rejected.
- **Report remediation line:** Generate reset tokens with a CSPRNG (≥128 bits), store only a hash, expire quickly and invalidate after use.

### Authorization Decisions Trust a Client-Controlled Role Cookie (Critical)
- **Fix:** Resolve the role from the server-side session record on every request; ignore client role claims.
- **Retest:** Set hx_role=owner on a viewer session and open /admin: must return 403.
- **Report remediation line:** Resolve roles from the server-side session record on every request; never trust client-supplied role claims.

## Registration & Profile

### Mass Assignment in Registration Allows Role and Tenant Injection (Critical)
- **Fix:** Whitelist registration fields (name, email, password); assign role=viewer and tenant server-side.
- **Retest:** POST /register with role=owner&tenantId=2: the created account must be a viewer in its own tenant.
- **Report remediation line:** Whitelisting: accept only name/email/password at registration; assign role and tenant server-side.

### No Minimum Password Strength Enforced at Registration (Medium)
- **Fix:** Enforce minimum length 12 and a breached-password blocklist at registration and password change.
- **Retest:** Register with a 3-character password: must be rejected with a policy message.
- **Report remediation line:** Enforce a minimum length (12+ recommended) and block known-breached passwords at sign-up and password change.

### Stored Cross-Site Scripting via Profile Display Name (High)
- **Fix:** HTML-encode display names at render time in header and admin list; validate allowed characters.
- **Retest:** Save a script payload as display name: it renders as inert text everywhere, including /admin.
- **Report remediation line:** Context-encode all user-supplied output; sanitise rich text; add a Content-Security-Policy as defence in depth.

### Cross-Site Request Forgery on Profile Update (Medium)
- **Fix:** Add a per-session anti-CSRF token to the profile form and verify it (plus SameSite=Lax session cookie).
- **Retest:** POST /profile with a foreign Origin and no token: must be rejected with 403.
- **Report remediation line:** Require a per-session anti-CSRF token on every state-changing form and verify Origin/Referer as a second layer.

## Resources

### Insecure Direct Object Reference Exposes Other Tenants’ Resources (High)
- **Fix:** Scope every resource lookup by session tenantId; return 404 for foreign ids.
- **Retest:** As tenant 1, request tenant 2 resource id: must return 404.
- **Report remediation line:** Scope every resource query by the authenticated tenant and return 404 for foreign objects.

### Missing Authorization on Resource Lifecycle Actions (Critical)
- **Fix:** Check tenant ownership AND role permission server-side for start/stop/terminate/resize; confirm destructive actions.
- **Retest:** As a viewer, POST terminate on any resource: must be rejected; cross-tenant action must be rejected.
- **Report remediation line:** Enforce tenant ownership and role permission server-side for every lifecycle action; log and confirm destructive ones.

## Storage Buckets

### Bucket Visibility Can Be Changed Without Authorization, Exposing Private Files Publicly (Critical)
- **Fix:** Require bucket ownership + admin role for visibility changes; default private; alert on public changes.
- **Retest:** As a non-owner, attempt to make a bucket public: rejected; /public/bucket/:id returns 403 while private.
- **Report remediation line:** Require bucket ownership and an admin role for visibility changes; default private; alert on any bucket becoming public.

### Path Traversal in File Download Reads Files Outside the Bucket (High)
- **Fix:** Resolve canonical paths and require the result to stay inside the bucket root; serve files by internal id.
- **Retest:** Request ../ sequences and encoded variants: all must return 404 and never read outside the bucket.
- **Report remediation line:** Resolve the canonical path and verify it stays inside the bucket directory; serve files by id, not by raw name.

## IAM & Policies

### Privilege Escalation: Any User Can Assign Any Role to Any User (Critical)
- **Fix:** Only tenant owners/admins may change roles, only inside their tenant; audit-log changes.
- **Retest:** As a viewer, POST /iam/role for self or others: rejected; cross-tenant changes rejected even for admins.
- **Report remediation line:** Only tenant owners/admins may change roles, only within their tenant; audit-log every role change.

### IAM Policy Documents Accessible Across Tenants (IDOR) (Medium)
- **Fix:** Scope policy reads by tenant; 404 for foreign policies.
- **Retest:** As tenant 1, open tenant 2 policy id: 404.
- **Report remediation line:** Scope policy reads by tenant; return 404 for policies outside the caller’s tenant.

## Billing & Plans

### Client-Supplied Billing Credit Amount Accepted Without Validation (High)
- **Fix:** Validate credits against server-side promo rules; cap amounts; require finance role; audit.
- **Retest:** POST credit of 5000 or -50: rejected or clamped to a legitimate promo value; balance unchanged otherwise.
- **Report remediation line:** Validate credit amounts against server-side promo rules; cap values; require finance role and audit trail.

### Subscription Plan Can Be Changed Without Payment (High)
- **Fix:** Bind plan changes to a verified payment webhook from the billing provider; reconcile nightly.
- **Retest:** POST /billing/plan without a completed payment: plan unchanged and the attempt logged.
- **Report remediation line:** Change plans only from a verified payment-webhook flow; reconcile entitlements with the billing provider.

### Invoices Accessible Across Tenants by Changing the Tenant Id (Medium)
- **Fix:** Derive the invoice tenant from the session; ignore URL tenant ids.
- **Retest:** As tenant 1, open /billing/invoice/2: must show only own invoice or 404.
- **Report remediation line:** Derive the invoice tenant from the session, never from the URL; verify ownership before rendering.

## Search & Discovery

### SQL Injection in Global Search Leaks Cross-Tenant Data (High)
- **Fix:** Parameterise the search query; apply the tenant filter in server code outside the input-built query.
- **Retest:** Search ' OR '1'='1: results must contain only the caller's tenant resources (or none).
- **Report remediation line:** Parameterise search queries and keep the tenant filter in server-side code, not in the query string built from input.

### Reflected Cross-Site Scripting in Search Results (Medium)
- **Fix:** HTML-encode the echoed query on the results page; add CSP header.
- **Retest:** Search with a script payload: it appears encoded in the page source and does not execute.
- **Report remediation line:** HTML-encode all reflected input; validate query length/characters; add CSP.

## API & Integrations

### Broken Object-Level Authorization in Resource API (High)
- **Fix:** Authorise per object: compare resource.tenantId with the API key tenant on every object read.
- **Retest:** With tenant 1 key, GET tenant 2 resource via API: 404.
- **Report remediation line:** Check object ownership against the key’s tenant on every API object read; return 404 cross-tenant.

### API Accepts Predictable Keys Derived From Account Email (Critical)
- **Fix:** Issue only CSPRNG API keys (>=128 bits), store hashes, remove the derived-key fallback entirely.
- **Retest:** Compute 'hx_'+base64(email) for a victim and call the API: must return 401.
- **Report remediation line:** Issue only high-entropy random API keys, store hashes, and remove any deterministic fallback authentication.

## Platform & Admin

### Server-Side Request Forgery Reaches the Instance Metadata Service (Critical)
- **Fix:** Allow-list fetch destinations; block link-local, loopback and internal ranges; require IMDSv2; run the fetcher in an isolated egress sandbox.
- **Retest:** Request the metadata URL and internal URLs through the tool: all blocked with a policy error.
- **Report remediation line:** Allow-list fetch destinations, block 169.254.0.0/16 and internal ranges, require IMDSv2 tokens, and isolate the fetcher.

### Debug Endpoint Exposes All Tenants’ Configuration and API Keys (Critical)
- **Fix:** Remove /debug from production builds; if retained, require platform-admin auth and audit access.
- **Retest:** GET /debug as a normal user (and logged out): 404/403; no keys or config disclosed.
- **Report remediation line:** Remove debug endpoints from production builds; if essential, restrict to platform admins and audit access.

### Cross-Site Request Forgery on Administrative User-Disable Action (High)
- **Fix:** Anti-CSRF tokens on all admin actions, Origin verification, and re-authentication for destructive actions.
- **Retest:** POST the disable action with a foreign Origin and no token: rejected; target user remains active.
- **Report remediation line:** Require anti-CSRF tokens on all admin actions and verify Origin; re-authenticate for destructive operations.
