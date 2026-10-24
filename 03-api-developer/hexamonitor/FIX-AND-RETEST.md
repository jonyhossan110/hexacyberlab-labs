# HexaMonitor — Fix & Retest (LAB 27)

For every finding: the secure implementation and the regression check that proves the fix.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass (Critical)
- **Fix:** Use parameterised queries / prepared statements for all database access and add a regression test with injection payloads.
- **Retest:** Repeat the original exploit from the Practice Guide against the patched build — it must fail (no session, no cross-tenant data, no state change), and the corresponding /tests item must stay open.

### No Rate Limiting or Account Lockout on Login Endpoint (High)
- **Fix:** Add progressive rate limiting, temporary lockout after repeated failures, and alerting on authentication anomalies.
- **Retest:** Repeat the original exploit from the Practice Guide against the patched build — it must fail (no session, no cross-tenant data, no state change), and the corresponding /tests item must stay open.

### Account Enumeration Through Divergent Authentication Error Messages (Medium)
- **Fix:** Return one generic "invalid credentials" message (and uniform timing) for every failed authentication.
- **Retest:** Repeat the original exploit from the Practice Guide against the patched build — it must fail (no session, no cross-tenant data, no state change), and the corresponding /tests item must stay open.

### Default Administrative Credentials Left Unchanged (Critical)
- **Fix:** Force a password change on first login, disable vendor defaults in production, and scan for default creds in deployment checks.
- **Retest:** Repeat the original exploit from the Practice Guide against the patched build — it must fail (no session, no cross-tenant data, no state change), and the corresponding /tests item must stay open.

### Password Reset Tokens Are Predictable (High)
- **Fix:** Generate reset tokens with a CSPRNG (≥128 bits), store only a hash, expire them quickly and make them single-use.
- **Retest:** Repeat the original exploit from the Practice Guide against the patched build — it must fail (no session, no cross-tenant data, no state change), and the corresponding /tests item must stay open.

### Privilege Escalation via Client-Controlled Role Cookie (Critical)
- **Fix:** Derive roles exclusively from the server-side session record; never trust client-supplied role values.
- **Retest:** Repeat the original exploit from the Practice Guide against the patched build — it must fail (no session, no cross-tenant data, no state change), and the corresponding /tests item must stay open.

## Registration & Profile

### Registration Accepts Trivially Weak Passwords (Medium)
- **Fix:** Enforce a minimum length (≥10) and check new passwords against known-breached password lists.
- **Retest:** Repeat the original exploit from the Practice Guide against the patched build — it must fail (no session, no cross-tenant data, no state change), and the corresponding /tests item must stay open.

### Mass Assignment Allows Self-Registration as Platform Administrator (Critical)
- **Fix:** Whitelist assignable fields per endpoint and set roles server-side only.
- **Retest:** Repeat the original exploit from the Practice Guide against the patched build — it must fail (no session, no cross-tenant data, no state change), and the corresponding /tests item must stay open.

### Stored Cross-Site Scripting via Display Name (High)
- **Fix:** Contextually HTML-encode all user-controlled output and add a Content-Security-Policy as defence in depth.
- **Retest:** Repeat the original exploit from the Practice Guide against the patched build — it must fail (no session, no cross-tenant data, no state change), and the corresponding /tests item must stay open.

### Missing CSRF Protection on Profile Update (Medium)
- **Fix:** Issue per-session CSRF tokens, verify them on every state change, and set SameSite cookies.
- **Retest:** Repeat the original exploit from the Practice Guide against the patched build — it must fail (no session, no cross-tenant data, no state change), and the corresponding /tests item must stay open.

## Monitors

### Broken Object Level Authorisation on Monitor Details (IDOR) (High)
- **Fix:** Scope every object query by the session’s account ID and return 404 for objects outside the tenant.
- **Retest:** Repeat the original exploit from the Practice Guide against the patched build — it must fail (no session, no cross-tenant data, no state change), and the corresponding /tests item must stay open.

### Cross-Tenant Monitor Modification via IDOR (High)
- **Fix:** Authorise writes with the same tenant scoping as reads and audit-log cross-account attempts.
- **Retest:** Repeat the original exploit from the Practice Guide against the patched build — it must fail (no session, no cross-tenant data, no state change), and the corresponding /tests item must stay open.

### Server-Side Request Forgery in URL Quick-Check (High)
- **Fix:** Validate and allowlist fetch targets, block link-local/metadata ranges, and require IMDSv2-style tokens on metadata services.
- **Retest:** Repeat the original exploit from the Practice Guide against the patched build — it must fail (no session, no cross-tenant data, no state change), and the corresponding /tests item must stay open.

### SSRF Allowlist Bypass via URL Userinfo Parsing Differential (High)
- **Fix:** Parse URLs with one strict parser for both validation and fetching; reject userinfo and non-allowlisted hosts after resolution.
- **Retest:** Repeat the original exploit from the Practice Guide against the patched build — it must fail (no session, no cross-tenant data, no state change), and the corresponding /tests item must stay open.

## Alert Rules

### Cross-Tenant Alert Rule Modification (IDOR) (High)
- **Fix:** Scope alert-rule reads/writes to the owning account and notify owners of rule changes out-of-band.
- **Retest:** Repeat the original exploit from the Practice Guide against the patched build — it must fail (no session, no cross-tenant data, no state change), and the corresponding /tests item must stay open.

### Unauthorised Maintenance Windows Silence Other Tenants’ Alerts (High)
- **Fix:** Verify monitor ownership on maintenance creation and alert owners when windows are scheduled.
- **Retest:** Repeat the original exploit from the Practice Guide against the patched build — it must fail (no session, no cross-tenant data, no state change), and the corresponding /tests item must stay open.

## Incidents

### Stored Cross-Site Scripting in Incident Comments (High)
- **Fix:** HTML-encode comment output, sanitise any allowed markup, and deploy a restrictive CSP.
- **Retest:** Repeat the original exploit from the Practice Guide against the patched build — it must fail (no session, no cross-tenant data, no state change), and the corresponding /tests item must stay open.

### Cross-Tenant Incident Disclosure via IDOR (High)
- **Fix:** Authorise incident access by account ownership on every incident route.
- **Retest:** Repeat the original exploit from the Practice Guide against the patched build — it must fail (no session, no cross-tenant data, no state change), and the corresponding /tests item must stay open.

## Status Pages

### Internal Operational Data Exposed on Public Status Page (Medium)
- **Fix:** Render public status pages from an allowlisted view model that excludes internal notes, emails and debug data.
- **Retest:** Repeat the original exploit from the Practice Guide against the patched build — it must fail (no session, no cross-tenant data, no state change), and the corresponding /tests item must stay open.

### Unauthenticated Status Page Enumeration Without Throttling (Low)
- **Fix:** Use unguessable page tokens for public pages and rate-limit slug probing per IP.
- **Retest:** Repeat the original exploit from the Practice Guide against the patched build — it must fail (no session, no cross-tenant data, no state change), and the corresponding /tests item must stay open.

### Reflected Cross-Site Scripting via Status Page Notice Parameter (Medium)
- **Fix:** HTML-encode the notice parameter and avoid reflecting arbitrary query input.
- **Retest:** Repeat the original exploit from the Practice Guide against the patched build — it must fail (no session, no cross-tenant data, no state change), and the corresponding /tests item must stay open.

## Integrations

### Server-Side Request Forgery in Webhook Test Delivery (High)
- **Fix:** Restrict webhook targets to public HTTPS URLs, block internal ranges at connect time, and log egress attempts.
- **Retest:** Repeat the original exploit from the Practice Guide against the patched build — it must fail (no session, no cross-tenant data, no state change), and the corresponding /tests item must stay open.

### Cross-Tenant Exposure of Webhook URLs and Signing Secrets (High)
- **Fix:** Tenant-scope integration access and mask secrets after creation (show once, never re-display).
- **Retest:** Repeat the original exploit from the Practice Guide against the patched build — it must fail (no session, no cross-tenant data, no state change), and the corresponding /tests item must stay open.

## Admin Panel

### State-Changing Administrative Action Performed via GET (CSRF) (High)
- **Fix:** Require POST with a valid CSRF token and a confirmation step for destructive admin actions.
- **Retest:** Repeat the original exploit from the Practice Guide against the patched build — it must fail (no session, no cross-tenant data, no state change), and the corresponding /tests item must stay open.

## Platform & API

### Broken Object Level Authorisation in API via accountId Parameter (High)
- **Fix:** Ignore client-supplied tenant IDs; scope all API queries by the account bound to the API key.
- **Retest:** Repeat the original exploit from the Practice Guide against the patched build — it must fail (no session, no cross-tenant data, no state change), and the corresponding /tests item must stay open.

### Predictable Legacy API Keys Derived from Account Email (High)
- **Fix:** Retire derived keys, issue CSPRNG-generated keys, store only hashes, and support rotation.
- **Retest:** Repeat the original exploit from the Practice Guide against the patched build — it must fail (no session, no cross-tenant data, no state change), and the corresponding /tests item must stay open.
