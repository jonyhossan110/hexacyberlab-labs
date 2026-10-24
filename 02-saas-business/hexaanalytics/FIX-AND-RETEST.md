# HexaAnalytics — Fix & Retest Guide (25 findings)

For every scored test: the secure implementation, and the regression retest that proves the fix. Method: apply the fix in a copy of the lab, re-run the exact exploit from `PRACTICE-GUIDE.md`, confirm it now fails, and confirm the legitimate flow still works.

## Login & Authentication

### SQL Injection Login Bypass (Critical)
- **Secure implementation:** Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.
- **Regression retest:** repeat the exploitation steps for "SQL Injection Login Bypass" from the practice guide against the fixed build. Expected after the fix: the exploit no longer succeeds (no session/object/data obtained, the action is rejected or safely handled), while the normal user flow for the same feature still completes successfully.

### Brute Force — No Rate Limiting or Lockout (High)
- **Secure implementation:** Throttle login attempts per account and IP, add progressive delays / lockout and alerting on password-spray patterns.
- **Regression retest:** repeat the exploitation steps for "Brute Force — No Rate Limiting or Lockout" from the practice guide against the fixed build. Expected after the fix: the exploit no longer succeeds (no session/object/data obtained, the action is rejected or safely handled), while the normal user flow for the same feature still completes successfully.

### User Enumeration via Login & Forgot-Password Responses (Medium)
- **Secure implementation:** Return one generic message ("invalid credentials") for every failed login and forgot-password request.
- **Regression retest:** repeat the exploitation steps for "User Enumeration via Login & Forgot-Password Responses" from the practice guide against the fixed build. Expected after the fix: the exploit no longer succeeds (no session/object/data obtained, the action is rejected or safely handled), while the normal user flow for the same feature still completes successfully.

### Weak / Default Credentials on a Seeded Account (High)
- **Secure implementation:** Force a password change on first use, disable or remove demo accounts in production, and scan for default passwords.
- **Regression retest:** repeat the exploitation steps for "Weak / Default Credentials on a Seeded Account" from the practice guide against the fixed build. Expected after the fix: the exploit no longer succeeds (no session/object/data obtained, the action is rejected or safely handled), while the normal user flow for the same feature still completes successfully.

### Predictable Password-Reset Token (High)
- **Secure implementation:** Generate reset tokens from a CSPRNG (≥128 bits), store only a hash, expire them quickly and make them single-use.
- **Regression retest:** repeat the exploitation steps for "Predictable Password-Reset Token" from the practice guide against the fixed build. Expected after the fix: the exploit no longer succeeds (no session/object/data obtained, the action is rejected or safely handled), while the normal user flow for the same feature still completes successfully.

### Session Cookie Tampering — Client-Side Role Trusted (Critical)
- **Secure implementation:** Use server-side sessions or signed/encrypted tokens, and always load the user's real role from the database per request.
- **Regression retest:** repeat the exploitation steps for "Session Cookie Tampering — Client-Side Role Trusted" from the practice guide against the fixed build. Expected after the fix: the exploit no longer succeeds (no session/object/data obtained, the action is rejected or safely handled), while the normal user flow for the same feature still completes successfully.

## Registration & Profile

### No Password Policy at Registration (Medium)
- **Secure implementation:** Enforce a minimum length (≥10) and screen against known-breached password lists at registration and reset.
- **Regression retest:** repeat the exploitation steps for "No Password Policy at Registration" from the practice guide against the fixed build. Expected after the fix: the exploit no longer succeeds (no session/object/data obtained, the action is rejected or safely handled), while the normal user flow for the same feature still completes successfully.

### Mass Assignment — Self-Promotion via Registration Fields (Critical)
- **Secure implementation:** Whitelist bindable fields on registration/profile endpoints; set role and tenant server-side only.
- **Regression retest:** repeat the exploitation steps for "Mass Assignment — Self-Promotion via Registration Fields" from the practice guide against the fixed build. Expected after the fix: the exploit no longer succeeds (no session/object/data obtained, the action is rejected or safely handled), while the normal user flow for the same feature still completes successfully.

### Stored XSS in Display Name (High)
- **Secure implementation:** Contextually encode all user-supplied output; sanitise stored fields and deploy a restrictive Content-Security-Policy.
- **Regression retest:** repeat the exploitation steps for "Stored XSS in Display Name" from the practice guide against the fixed build. Expected after the fix: the exploit no longer succeeds (no session/object/data obtained, the action is rejected or safely handled), while the normal user flow for the same feature still completes successfully.

### CSRF on Profile Update (Medium)
- **Secure implementation:** Issue per-session CSRF tokens, verify them on every state change, and check Origin/Referer for sensitive posts.
- **Regression retest:** repeat the exploitation steps for "CSRF on Profile Update" from the practice guide against the fixed build. Expected after the fix: the exploit no longer succeeds (no session/object/data obtained, the action is rejected or safely handled), while the normal user flow for the same feature still completes successfully.

## Dashboards

### Cross-Account Dashboard IDOR (High)
- **Secure implementation:** Authorise every object load against the session tenant; use unguessable ids as defence in depth.
- **Regression retest:** repeat the exploitation steps for "Cross-Account Dashboard IDOR" from the practice guide against the fixed build. Expected after the fix: the exploit no longer succeeds (no session/object/data obtained, the action is rejected or safely handled), while the normal user flow for the same feature still completes successfully.

### Reflected XSS in Dashboard Filter (Medium)
- **Secure implementation:** Output-encode all reflected parameters and add a Content-Security-Policy.
- **Regression retest:** repeat the exploitation steps for "Reflected XSS in Dashboard Filter" from the practice guide against the fixed build. Expected after the fix: the exploit no longer succeeds (no session/object/data obtained, the action is rejected or safely handled), while the normal user flow for the same feature still completes successfully.

## Datasets & Exports

### Cross-Account Dataset IDOR (High)
- **Secure implementation:** Scope every dataset query by the session account id.
- **Regression retest:** repeat the exploitation steps for "Cross-Account Dataset IDOR" from the practice guide against the fixed build. Expected after the fix: the exploit no longer succeeds (no session/object/data obtained, the action is rejected or safely handled), while the normal user flow for the same feature still completes successfully.

### Cross-Account Data Export IDOR (Critical)
- **Secure implementation:** Authorise exports against the session tenant and role; log and alert on bulk exports.
- **Regression retest:** repeat the exploitation steps for "Cross-Account Data Export IDOR" from the practice guide against the fixed build. Expected after the fix: the exploit no longer succeeds (no session/object/data obtained, the action is rejected or safely handled), while the normal user flow for the same feature still completes successfully.

### Viewer Role Can Export Data (Broken Function-Level Authorisation) (High)
- **Secure implementation:** Enforce role checks server-side on export/download endpoints (deny viewer role explicitly).
- **Regression retest:** repeat the exploitation steps for "Viewer Role Can Export Data (Broken Function-Level Authorisation)" from the practice guide against the fixed build. Expected after the fix: the exploit no longer succeeds (no session/object/data obtained, the action is rejected or safely handled), while the normal user flow for the same feature still completes successfully.

## Report Builder

### Report Builder Filter Injection Leaks Cross-Account Data (Critical)
- **Secure implementation:** Parameterise report-builder queries; validate filter fields against an allowlist and bind values as parameters.
- **Regression retest:** repeat the exploitation steps for "Report Builder Filter Injection Leaks Cross-Account Data" from the practice guide against the fixed build. Expected after the fix: the exploit no longer succeeds (no session/object/data obtained, the action is rejected or safely handled), while the normal user flow for the same feature still completes successfully.

### Report Saved into Another Account via accountId Tampering (High)
- **Secure implementation:** Derive the owning account from the authenticated session on every create; ignore client-supplied tenant ids.
- **Regression retest:** repeat the exploitation steps for "Report Saved into Another Account via accountId Tampering" from the practice guide against the fixed build. Expected after the fix: the exploit no longer succeeds (no session/object/data obtained, the action is rejected or safely handled), while the normal user flow for the same feature still completes successfully.

## Reports & Sharing

### Cross-Account Saved Report IDOR (High)
- **Secure implementation:** Scope report loads by session account; return 404 for objects outside the tenant.
- **Regression retest:** repeat the exploitation steps for "Cross-Account Saved Report IDOR" from the practice guide against the fixed build. Expected after the fix: the exploit no longer succeeds (no session/object/data obtained, the action is rejected or safely handled), while the normal user flow for the same feature still completes successfully.

### Guessable Share-Link Token Exposes Private Report (High)
- **Secure implementation:** Generate share tokens with a CSPRNG (≥128 bits); rate-limit token lookups and log access.
- **Regression retest:** repeat the exploitation steps for "Guessable Share-Link Token Exposes Private Report" from the practice guide against the fixed build. Expected after the fix: the exploit no longer succeeds (no session/object/data obtained, the action is rejected or safely handled), while the normal user flow for the same feature still completes successfully.

### Share-Link Enumeration (No Throttling on Token Lookups) (Medium)
- **Secure implementation:** Rate-limit and alert on repeated invalid token lookups; use large random token spaces.
- **Regression retest:** repeat the exploitation steps for "Share-Link Enumeration (No Throttling on Token Lookups)" from the practice guide against the fixed build. Expected after the fix: the exploit no longer succeeds (no session/object/data obtained, the action is rejected or safely handled), while the normal user flow for the same feature still completes successfully.

### Revoked Share Link Still Works via Embed Route (High)
- **Secure implementation:** Check link revocation centrally in one authorisation helper used by every route that serves shared content.
- **Regression retest:** repeat the exploitation steps for "Revoked Share Link Still Works via Embed Route" from the practice guide against the fixed build. Expected after the fix: the exploit no longer succeeds (no session/object/data obtained, the action is rejected or safely handled), while the normal user flow for the same feature still completes successfully.

## Scheduled Reports

### Cross-Account Schedule Deletion IDOR (High)
- **Secure implementation:** Verify schedule ownership against the session account on every mutation; soft-delete with an audit trail.
- **Regression retest:** repeat the exploitation steps for "Cross-Account Schedule Deletion IDOR" from the practice guide against the fixed build. Expected after the fix: the exploit no longer succeeds (no session/object/data obtained, the action is rejected or safely handled), while the normal user flow for the same feature still completes successfully.

## Admin Panel

### Admin User-List API Missing Authorisation (Critical)
- **Secure implementation:** Enforce admin role checks server-side on every admin API route; never return password material.
- **Regression retest:** repeat the exploitation steps for "Admin User-List API Missing Authorisation" from the practice guide against the fixed build. Expected after the fix: the exploit no longer succeeds (no session/object/data obtained, the action is rejected or safely handled), while the normal user flow for the same feature still completes successfully.

## Platform & API

### Unauthenticated Debug Endpoint Leaks Users, Keys & Tokens (Critical)
- **Secure implementation:** Remove debug endpoints from production builds, or gate them behind admin auth and network allowlists.
- **Regression retest:** repeat the exploitation steps for "Unauthenticated Debug Endpoint Leaks Users, Keys & Tokens" from the practice guide against the fixed build. Expected after the fix: the exploit no longer succeeds (no session/object/data obtained, the action is rejected or safely handled), while the normal user flow for the same feature still completes successfully.

### Predictable API Key Derived from Email (High)
- **Secure implementation:** Issue high-entropy random API keys, store only hashes, and remove legacy derived-key acceptance.
- **Regression retest:** repeat the exploitation steps for "Predictable API Key Derived from Email" from the practice guide against the fixed build. Expected after the fix: the exploit no longer succeeds (no session/object/data obtained, the action is rejected or safely handled), while the normal user flow for the same feature still completes successfully.
